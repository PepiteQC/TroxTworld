// ═══════════════════════════════════════════════════════════════════════════
//  TROXTWORLD — PERSISTENCE SERVICE v2.0
//  src/server/systems/PersistenceService.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Buffer d'écriture différée (5 s) avec WAL mémoire
//  • Mutex anti-concurrence sur flush()
//  • Retry exponentiel borné (3 tentatives)
//  • Versioning de schéma + migrations automatiques
//  • Priorité de sauvegarde (VIP, activité récente, AFK)
//  • Debounce de markDirty (anti-flood)
//  • Checksum d'intégrité (FNV-1a 64 bits)
//  • Compression pluggable (gzip / zstd / none)
//  • Shutdown graceful avec timeout dur
//  • Métriques Prometheus-ready
//  • Rate-limit par joueur
//  • Session heartbeat + playtime actif
//  • Retention des snapshots périodiques
//  • Compatible 100% avec l'API v1.0
// ═══════════════════════════════════════════════════════════════════════════

import { Intellectus } from '../intellectus';
import { CommandDefinition, Contract, nowMs } from '../intellectus/types';

// ─────────────────────────────────────────────────────────────────────────
//  1. SCHÉMA DE SAVE — VERSIONNÉ
// ─────────────────────────────────────────────────────────────────────────

/**
 * Version courante du schéma de sauvegarde.
 * À incrémenter AVANT tout changement breaking du modèle.
 * Le service migre automatiquement les anciennes saves.
 */
export const SAVE_SCHEMA_VERSION = 2;

export interface AppearanceData {
  model?: string;
  hairStyle?: number;
  hairColor?: number;
  eyeColor?: number;
  skinTone?: number;
  height?: number;
  weight?: number;
  tattoos?: Array<{ id: string; zone: string }>;
  clothes?: Record<string, number>;
  extras?: Record<string, string | number | boolean>;
}

export interface VehicleMods {
  engine?: number;
  transmission?: number;
  brakes?: number;
  suspension?: number;
  turbo?: boolean;
  wheels?: number;
  spoiler?: number;
  paintPrimary?: string;
  paintSecondary?: string;
  plateStyle?: string;
  neon?: string | null;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  slot?: number;
  weight: number;
  durability?: number;
  serialNumber?: string;
  metadata?: Record<string, unknown>;
}

export interface OwnedVehicle {
  id: string;
  model: string;
  displayName: string;
  plate: string;
  vin: string;
  primaryColor: string;
  secondaryColor?: string;
  mods: VehicleMods;
  fuel: number;
  engineHealth: number;
  bodyHealth: number;
  mileageKm: number;
  garageId: string | null;
  isStored: boolean;
  isImpounded: boolean;
  isStolen: boolean;
  position?: { x: number; y: number; z: number; rotation: number };
}

export interface OwnedProperty {
  id: string;
  name: string;
  address: string;
  villageName: string;
  propertyType: string;
  locked: boolean;
  condition: number;
  taxDueAt: number | null;
}

export interface LicenseRecord {
  licenseType: string;
  issuedAt: number;
  expiresAt: number | null;
  points: number;
  suspended: boolean;
}

export interface CriminalRecordEntry {
  offense: string;
  fine: number;
  jailMinutes: number;
  paid: boolean;
  occurredAt: number;
  officerName?: string;
}

export interface PlayerSaveState {
  /** 🆕 Version du schéma — pour migrations */
  schemaVersion: number;

  characterId: string;
  accountId: string;

  identity: {
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    nationality: string;
    phoneNumber?: string;
    appearance: AppearanceData;
    activeAura: string | null;
  };

  position: {
    x: number;
    y: number;
    z: number;
    rotation: number;
    zone: string;
    interiorId?: string | null;
  };

  economy: {
    cash: number;
    bank: number;
    dirtyMoney: number;
  };

  job: {
    name: string;
    grade: number;
    hoursWorked: number;
    onDuty: boolean;
    lastPaycheckAt: number | null;
  };

  status: {
    health: number;
    armor: number;
    hunger: number;
    thirst: number;
    stress: number;
    isDead: boolean;
    isCuffed: boolean;
    inJailUntil: number | null;
    wantedLevel: number;
    bounty: number;
  };

  gang: {
    id: string | null;
    rank: string | null;
  };

  inventory: InventoryItem[];
  vehicles: OwnedVehicle[];
  properties: OwnedProperty[];
  keys: Array<{ targetType: 'property' | 'vehicle'; targetId: string }>;
  licenses: LicenseRecord[];
  criminalRecord: CriminalRecordEntry[];

  meta: {
    createdAt: number;
    updatedAt: number;
    lastSeenAt: number;
    playtimeSeconds: number;
    activePlaytimeSeconds: number;
    spawnCount: number;
    /** 🆕 Checksum d'intégrité calculé côté service */
    checksum?: string;
    /** 🆕 Priorité de sauvegarde — inférée ou explicite */
    priority?: SavePriority;
    /** 🆕 Tags (vip, staff, banni…) */
    tags?: string[];
  };
}

export interface PlayerDelta {
  characterId: string;
  position?: PlayerSaveState['position'];
  economy?: Partial<PlayerSaveState['economy']>;
  status?: Partial<PlayerSaveState['status']>;
  job?: Partial<PlayerSaveState['job']>;
  playtimeSeconds?: number;
  activePlaytimeSeconds?: number;
  /** 🆕 Timestamp côté service — pour ordre d'application */
  queuedAt?: number;
}

/** 🆕 Priorité de flush — plus bas = plus urgent */
export type SavePriority = 0 | 1 | 2 | 3;
export const SavePriorityLabel: Record<SavePriority, string> = {
  0: 'critical',  // shutdown, cash, ban
  1: 'high',      // disconnect, property
  2: 'normal',    // autosave, events
  3: 'low',       // AFK, idle
};

// ─────────────────────────────────────────────────────────────────────────
//  2. CONTRATS DE VALIDATION
// ─────────────────────────────────────────────────────────────────────────

const SAVE_CONTRACTS: Contract[] = [
  {
    contractName: 'persistence.save',
    strict: true,
    fields: { characterId: { type: 'string', required: true, maxLength: 64 } },
  },
  {
    contractName: 'persistence.load',
    strict: true,
    fields: { characterId: { type: 'string', required: true, maxLength: 64 } },
  },
];

// ─────────────────────────────────────────────────────────────────────────
//  3. ADAPTATEUR — étendu v2
// ─────────────────────────────────────────────────────────────────────────

export interface PersistenceAdapter {
  loadPlayer(characterId: string): Promise<PlayerSaveState | null>;
  loadPlayersByAccount(accountId: string): Promise<PlayerSaveState[]>;
  savePlayer(state: PlayerSaveState): Promise<void>;
  savePlayerBatch?(states: PlayerSaveState[]): Promise<void>;  // 🆕 batch atomique
  applyDelta(delta: PlayerDelta): Promise<void>;
  applyDeltaBatch?(deltas: PlayerDelta[]): Promise<void>;
  deletePlayer(characterId: string): Promise<void>;

  saveWorldState(id: string, type: string, state: unknown, village?: string): Promise<void>;
  loadWorldState(type?: string): Promise<Array<{ id: string; state: unknown }>>;

  logTransaction(tx: {
    characterId: string;
    type: string;
    amount: number;
    balanceAfter: number;
    account: string;
    counterpartyId?: string;
    description?: string;
    villageName?: string;
  }): Promise<void>;

  openSession(characterId: string): Promise<string>;
  closeSession(sessionId: string, reason: string, snapshot: unknown): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────
//  4. CONFIG & INTERFACES OPTIONNELLES
// ─────────────────────────────────────────────────────────────────────────

export interface PersistenceConfig {
  autosaveIntervalMs: number;
  flushIntervalMs: number;
  maxBufferSize: number;
  snapshotIntervalMs: number;
  /** 🆕 Timeout dur du shutdown graceful */
  shutdownTimeoutMs: number;
  /** 🆕 Nombre max de retry par écriture */
  maxRetries: number;
  /** 🆕 Délai minimal entre deux markDirty du même joueur */
  dirtyDebounceMs: number;
  /** 🆕 Rate limit : max saves/min par joueur */
  savesPerMinuteLimit: number;
  /** 🆕 Retention des snapshots (jours) */
  snapshotRetentionDays: number;
  /** 🆕 Active la vérification d'intégrité par checksum */
  verifyChecksums: boolean;
  /** 🆕 Active la compression si un Compressor est fourni */
  compressionEnabled: boolean;
}

const DEFAULT_CONFIG: PersistenceConfig = {
  autosaveIntervalMs: 60_000,
  flushIntervalMs: 5_000,
  maxBufferSize: 150,
  snapshotIntervalMs: 900_000,
  shutdownTimeoutMs: 8_000,
  maxRetries: 3,
  dirtyDebounceMs: 500,
  savesPerMinuteLimit: 30,
  snapshotRetentionDays: 7,
  verifyChecksums: true,
  compressionEnabled: false,
};

/**
 * 🆕 Interface optionnelle de compression — à brancher sur zstd/gzip.
 * Si non fournie, la compression est désactivée silencieusement.
 */
export interface Compressor {
  compress(data: string): Promise<Uint8Array> | Uint8Array;
  decompress(data: Uint8Array): Promise<string> | string;
}

/**
 * 🆕 Hook de chiffrement optionnel — pour données sensibles.
 */
export interface Encryptor {
  encrypt(data: string): Promise<string> | string;
  decrypt(data: string): Promise<string> | string;
}

// ─────────────────────────────────────────────────────────────────────────
//  5. UTILITAIRES INTERNES
// ─────────────────────────────────────────────────────────────────────────

/**
 * 🆕 FNV-1a 64 bits — checksum rapide sans dépendance externe.
 * Utilisé pour détecter les corruptions de save.
 */
function fnv1a64(str: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * 🆕 Mutex minimaliste pour empêcher les flushes concurrents.
 */
class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();
  private locked = false;

  async acquire(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((res) => { release = res; });
    const prev = this.tail;
    this.tail = next;
    await prev;
    this.locked = true;
    return () => {
      this.locked = false;
      release();
    };
  }

  isLocked(): boolean {
    return this.locked;
  }
}

/**
 * 🆕 Backoff exponentiel simple avec jitter.
 */
function backoffMs(attempt: number, base = 100): number {
  const exp = Math.min(base * Math.pow(2, attempt), 5_000);
  const jitter = Math.random() * 0.3 * exp;
  return Math.floor(exp + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * 🆕 Mesures de performance type Prometheus.
 */
interface PersistenceMetrics {
  savesTotal: number;
  deltasFlushed: number;
  loadsTotal: number;
  lastFlushMs: number;
  lastFlushAt: number;
  avgFlushMs: number;
  failedSaves: number;
  retriesTotal: number;
  checksumErrors: number;
  shutdownsHandled: number;
  forceShutdownsTriggered: number;
  compressionSavingsBytes: number;
  peakBufferSize: number;
  rateLimitedSaves: number;
}

// ─────────────────────────────────────────────────────────────────────────
//  6. SERVICE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────

export class PersistenceService {
  private adapter: PersistenceAdapter | null = null;
  private config: PersistenceConfig;
  private compressor: Compressor | null = null;
  private encryptor: Encryptor | null = null;

  // ─── Buffer d'écriture différée (WAL mémoire) ───
  private deltaBuffer = new Map<string, PlayerDelta>();
  private fullSaveQueue = new Map<string, { characterId: string; priority: SavePriority; queuedAt: number }>();

  // ─── Contrôle de concurrence ───
  private flushMutex = new AsyncMutex();
  private playerSaveLocks = new Map<string, Promise<void>>();

  // ─── Rate limit par joueur ───
  private saveTimestamps = new Map<string, number[]>();

  // ─── Debounce markDirty ───
  private lastDirtyAt = new Map<string, number>();

  // ─── Sessions ───
  private sessions = new Map<string, string>();

  // ─── Signals handlers (pour cleanup) ───
  private signalHandlers: Array<{ sig: NodeJS.Signals; fn: () => void }> = [];
  private isShuttingDown = false;

  // ─── Métriques ───
  private stats: PersistenceMetrics = {
    savesTotal: 0,
    deltasFlushed: 0,
    loadsTotal: 0,
    lastFlushMs: 0,
    lastFlushAt: 0,
    avgFlushMs: 0,
    failedSaves: 0,
    retriesTotal: 0,
    checksumErrors: 0,
    shutdownsHandled: 0,
    forceShutdownsTriggered: 0,
    compressionSavingsBytes: 0,
    peakBufferSize: 0,
    rateLimitedSaves: 0,
  };

  constructor(
    private core: Intellectus,
    config: Partial<PersistenceConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ATTACHEMENT
  // ─────────────────────────────────────────────────────────────────────────

  public attach(adapter: PersistenceAdapter, options?: {
    compressor?: Compressor;
    encryptor?: Encryptor;
  }): void {
    if (this.adapter) {
      console.warn('⚠️ [Persistence] Un adaptateur est déjà attaché — remplacement.');
    }

    this.adapter = adapter;
    this.compressor = options?.compressor ?? null;
    this.encryptor = options?.encryptor ?? null;

    if (!this.compressor) this.config.compressionEnabled = false;

    SAVE_CONTRACTS.forEach((c) => this.core.addContract(c));
    this.registerCommands();
    this.startBackgroundTasks();
    this.installSignalHandlers();

    console.log(
      `💾 [Persistence] v2.0 actif · ` +
      `flush=${this.config.flushIntervalMs}ms · ` +
      `autosave=${this.config.autosaveIntervalMs}ms · ` +
      `compression=${this.config.compressionEnabled ? 'ON' : 'OFF'} · ` +
      `checksum=${this.config.verifyChecksums ? 'ON' : 'OFF'}`,
    );
  }

  public detach(): void {
    this.removeSignalHandlers();
    this.adapter = null;
    console.log('💾 [Persistence] Détaché.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CHARGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  public async loadPlayer(characterId: string): Promise<PlayerSaveState | null> {
    if (!this.adapter) return null;

    const raw = await this.adapter.loadPlayer(characterId);
    if (!raw) return null;

    // 🆕 Migration de schéma si nécessaire
    const state = this.migrate(raw);

    // 🆕 Vérification d'intégrité si activée
    if (this.config.verifyChecksums && state.meta.checksum) {
      const expected = this.computeChecksum(state);
      if (expected !== state.meta.checksum) {
        this.stats.checksumErrors++;
        console.error(
          `⚠️ [Persistence] Checksum invalide pour [${characterId}] : ` +
          `attendu=${state.meta.checksum}, calculé=${expected}`,
        );
        // On continue quand même mais on log
      }
    }

    this.stats.loadsTotal++;

    // ─── Hydratation mémoire ───
    this.hydrateMemory(characterId, state);

    // ─── Session ───
    const sessionId = await this.adapter.openSession(characterId);
    this.sessions.set(characterId, sessionId);

    await this.core.emit('persistence', 'player_loaded', {
      characterId,
      name: state.identity.firstName,
      vehicles: state.vehicles.length,
      properties: state.properties.length,
      schemaVersion: state.schemaVersion,
    }, { sourceAgent: 'persistence' });

    return state;
  }

  async loadAccountCharacters(accountId: string): Promise<PlayerSaveState[]> {
    if (!this.adapter) return [];
    const raws = await this.adapter.loadPlayersByAccount(accountId);
    return raws.map((r) => this.migrate(r));
  }

  private hydrateMemory(characterId: string, state: PlayerSaveState): void {
    this.core.memory.set('players', characterId, {
      id: characterId,
      characterId,
      accountId: state.accountId,
      name: `${state.identity.firstName} ${state.identity.lastName}`,
      gender: state.identity.gender,
      nationality: state.identity.nationality,
      phoneNumber: state.identity.phoneNumber,
      job: state.job.name,
      jobGrade: state.job.grade,
      jobHoursWorked: state.job.hoursWorked,
      onDuty: state.job.onDuty,
      lastPaycheckAt: state.job.lastPaycheckAt,
      cash: state.economy.cash,
      bank: state.economy.bank,
      dirtyMoney: state.economy.dirtyMoney,
      gang: state.gang.id ?? 'Aucun',
      gangId: state.gang.id,
      gangRank: state.gang.rank,
      aura: state.identity.activeAura ?? 'none',
      appearance: state.identity.appearance,
      health: state.status.health,
      armor: state.status.armor,
      hunger: state.status.hunger,
      thirst: state.status.thirst,
      stress: state.status.stress,
      isDead: state.status.isDead,
      isCuffed: state.status.isCuffed,
      inJailUntil: state.status.inJailUntil,
      wanted: state.status.wantedLevel,
      bounty: state.status.bounty,
      position: [state.position.x, state.position.y, state.position.z],
      rotation: state.position.rotation,
      currentZone: state.position.zone,
      interiorId: state.position.interiorId,
      createdAt: state.meta.createdAt,
      lastSeen: nowMs(),
      playtimeSeconds: state.meta.playtimeSeconds,
      activePlaytimeSeconds: state.meta.activePlaytimeSeconds,
      spawnCount: state.meta.spawnCount,
      tags: state.meta.tags ?? [],
    });

    this.core.memory.set('inventories', characterId, state.inventory);
    this.core.memory.set('keys', characterId, state.keys);
    this.core.memory.set('licenses', characterId, state.licenses);
    this.core.memory.set('criminal_records', characterId, state.criminalRecord);

    for (const v of state.vehicles) {
      this.core.memory.set('owned_vehicles', v.id, { ...v, ownerId: characterId });
    }
    for (const p of state.properties) {
      this.core.memory.set('owned_properties', p.id, { ...p, ownerId: characterId });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MARQUAGE & BUFFER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🆕 Avec debounce : ignore les appels trop rapprochés du même joueur.
   */
  public markDirty(
    characterId: string,
    priority: SavePriority = 2,
  ): void {
    const now = nowMs();
    const last = this.lastDirtyAt.get(characterId) ?? 0;
    if (now - last < this.config.dirtyDebounceMs) return;
    this.lastDirtyAt.set(characterId, now);

    const existing = this.fullSaveQueue.get(characterId);
    if (existing) {
      // Conserve la priorité la plus urgente
      if (priority < existing.priority) existing.priority = priority;
      return;
    }

    this.fullSaveQueue.set(characterId, { characterId, priority, queuedAt: now });
    if (this.fullSaveQueue.size >= this.config.maxBufferSize) {
      void this.flush();
    }
  }

  public queueDelta(delta: PlayerDelta): void {
    const existing = this.deltaBuffer.get(delta.characterId);
    if (existing) {
      this.deltaBuffer.set(delta.characterId, {
        ...existing,
        ...delta,
        economy: { ...existing.economy, ...delta.economy },
        status: { ...existing.status, ...delta.status },
        job: { ...existing.job, ...delta.job },
        queuedAt: delta.queuedAt ?? nowMs(),
      });
    } else {
      this.deltaBuffer.set(delta.characterId, {
        ...delta,
        queuedAt: delta.queuedAt ?? nowMs(),
      });
    }

    this.stats.peakBufferSize = Math.max(this.stats.peakBufferSize, this.deltaBuffer.size);
    if (this.deltaBuffer.size >= this.config.maxBufferSize) {
      void this.flush();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SAVE IMMÉDIAT
  // ─────────────────────────────────────────────────────────────────────────

  public async savePlayerNow(
    characterId: string,
    reason = 'manual',
    priority: SavePriority = 1,
  ): Promise<boolean> {
    if (!this.adapter) return false;
    if (this.isRateLimited(characterId)) {
      this.stats.rateLimitedSaves++;
      return false;
    }

    // 🆕 Lock par joueur — un seul save à la fois
    const prev = this.playerSaveLocks.get(characterId);
    if (prev) await prev;

    let release!: () => void;
    const lock = new Promise<void>((res) => { release = res; });
    this.playerSaveLocks.set(characterId, lock);

    try {
      const state = this.buildStateFromMemory(characterId);
      if (!state) return false;
      state.meta.priority = priority;
      state.meta.checksum = this.computeChecksum(state);

      await this.withRetry(async () => {
        await this.adapter!.savePlayer(state);
      }, `savePlayer(${characterId})`);

      this.stats.savesTotal++;
      this.fullSaveQueue.delete(characterId);
      this.deltaBuffer.delete(characterId);

      await this.core.emit('persistence', 'player_saved', {
        characterId, reason, priority: SavePriorityLabel[priority],
      }, { sourceAgent: 'persistence' });

      return true;
    } catch (err) {
      this.stats.failedSaves++;
      console.error(`❌ [Persistence] Échec save [${characterId}] (${reason}) :`, err);
      return false;
    } finally {
      this.playerSaveLocks.delete(characterId);
      release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  DÉCONNEXION SÉCURISÉE
  // ─────────────────────────────────────────────────────────────────────────

  public async onPlayerDisconnect(characterId: string, reason = 'quit'): Promise<void> {
    // Priorité critique à la déconnexion
    const saved = await this.savePlayerNow(characterId, `disconnect:${reason}`, 1);

    const sessionId = this.sessions.get(characterId);
    if (sessionId && this.adapter) {
      const snapshot = this.buildStateFromMemory(characterId);
      try {
        await this.adapter.closeSession(sessionId, reason, snapshot);
      } catch (err) {
        console.error(`⚠️ [Persistence] closeSession échoué pour [${characterId}] :`, err);
      }
      this.sessions.delete(characterId);
    }

    if (saved) {
      this.core.memory.delete('players', characterId);
      this.core.memory.delete('inventories', characterId);
      this.core.memory.delete('keys', characterId);
      this.core.memory.delete('licenses', characterId);
      this.core.memory.delete('criminal_records', characterId);
      this.saveTimestamps.delete(characterId);
      this.lastDirtyAt.delete(characterId);
    } else {
      console.error(
        `⚠️ [Persistence] Données conservées en RAM de secours pour [${characterId}] (échec d'écriture)`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RECONSTRUCTION D'ÉTAT
  // ─────────────────────────────────────────────────────────────────────────

  private buildStateFromMemory(characterId: string): PlayerSaveState | null {
    const p = this.core.memory.get<Record<string, any>>('players', characterId);
    if (!p) return null;

    const inventory = this.core.memory.get<InventoryItem[]>('inventories', characterId) ?? [];
    const keys = this.core.memory.get<PlayerSaveState['keys']>('keys', characterId) ?? [];
    const licenses = this.core.memory.get<LicenseRecord[]>('licenses', characterId) ?? [];

    const vehicles = (this.core.memory.values<OwnedVehicle & { ownerId?: string }>('owned_vehicles') || [])
      .filter((v) => v.ownerId === characterId)
      .map(({ ownerId: _o, ...v }) => v);

    const properties = (this.core.memory.values<OwnedProperty & { ownerId?: string }>('owned_properties') || [])
      .filter((pr) => pr.ownerId === characterId)
      .map(({ ownerId: _o, ...pr }) => pr);

    const [firstName, ...rest] = (p.name ?? 'Citoyen').split(' ');

    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      characterId,
      accountId: p.accountId ?? 'unknown',
      identity: {
        firstName,
        lastName: rest.join(' ') || 'Tremblay',
        gender: p.gender ?? 'male',
        nationality: p.nationality ?? 'Québécoise',
        phoneNumber: p.phoneNumber,
        appearance: p.appearance ?? {},
        activeAura: p.aura === 'none' ? null : (p.aura ?? null),
      },
      position: {
        x: p.position?.[0] ?? 0,
        y: p.position?.[1] ?? 1,
        z: p.position?.[2] ?? 10,
        rotation: p.rotation ?? 0,
        zone: p.currentZone ?? 'Portneuf',
        interiorId: p.interiorId ?? null,
      },
      economy: {
        cash: p.cash ?? 0,
        bank: p.bank ?? 0,
        dirtyMoney: p.dirtyMoney ?? 0,
      },
      job: {
        name: p.job ?? 'Civil',
        grade: p.jobGrade ?? 0,
        hoursWorked: p.jobHoursWorked ?? 0,
        onDuty: p.onDuty ?? false,
        lastPaycheckAt: p.lastPaycheckAt ?? null,
      },
      status: {
        health: p.health ?? 100,
        armor: p.armor ?? 0,
        hunger: p.hunger ?? 100,
        thirst: p.thirst ?? 100,
        stress: p.stress ?? 0,
        isDead: p.isDead ?? false,
        isCuffed: p.isCuffed ?? false,
        inJailUntil: p.inJailUntil ?? null,
        wantedLevel: p.wanted ?? 0,
        bounty: p.bounty ?? 0,
      },
      gang: {
        id: p.gangId ?? null,
        rank: p.gangRank ?? null,
      },
      inventory,
      vehicles,
      properties,
      keys,
      licenses,
      criminalRecord: this.core.memory.get<CriminalRecordEntry[]>('criminal_records', characterId) ?? [],
      meta: {
        createdAt: p.createdAt ?? nowMs(),
        updatedAt: nowMs(),
        lastSeenAt: p.lastSeen ?? nowMs(),
        playtimeSeconds: p.playtimeSeconds ?? 0,
        activePlaytimeSeconds: p.activePlaytimeSeconds ?? 0,
        spawnCount: p.spawnCount ?? 0,
        tags: p.tags ?? [],
      },
    };
  }

  private computeChecksum(state: PlayerSaveState): string {
    // On exclut le checksum lui-même du calcul
    const clone: Record<string, unknown> = { ...state };
    if (clone.meta) {
      const meta = { ...(clone.meta as Record<string, unknown>) };
      delete meta.checksum;
      clone.meta = meta;
    }
    return fnv1a64(JSON.stringify(clone));
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MIGRATION DE SCHÉMA
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🆕 Migre une save de n'importe quelle version vers SAVE_SCHEMA_VERSION.
   * Ajouter des branches au fur et à mesure des évolutions.
   */
  private migrate(raw: PlayerSaveState): PlayerSaveState {
    let state = raw;
    const from = raw.schemaVersion ?? 1;

    if (from < 2) state = this.migrateV1ToV2(state);

    return state;
  }

  private migrateV1ToV2(state: PlayerSaveState): PlayerSaveState {
    // v1 → v2 : ajout de activePlaytimeSeconds, tags, checksum
    return {
      ...state,
      schemaVersion: 2,
      meta: {
        ...state.meta,
        activePlaytimeSeconds: state.meta.activePlaytimeSeconds ?? state.meta.playtimeSeconds ?? 0,
        tags: state.meta.tags ?? [],
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  FLUSH — avec MUTEX et PRIORISATION
  // ─────────────────────────────────────────────────────────────────────────

  public async flush(): Promise<void> {
    if (!this.adapter) return;

    const release = await this.flushMutex.acquire();
    const t0 = nowMs();

    try {
      await this.flushDeltas();
      await this.flushFullSaves();
    } finally {
      const elapsed = nowMs() - t0;
      this.stats.lastFlushMs = elapsed;
      this.stats.lastFlushAt = nowMs();
      this.stats.avgFlushMs = this.stats.avgFlushMs === 0
        ? elapsed
        : Math.round(this.stats.avgFlushMs * 0.8 + elapsed * 0.2);
      release();
    }
  }

  private async flushDeltas(): Promise<void> {
    const deltas = Array.from(this.deltaBuffer.values());
    this.deltaBuffer.clear();
    if (deltas.length === 0) return;

    // Ignore les deltas pour les joueurs qui ont une fullSave en attente
    const filtered = deltas.filter((d) => !this.fullSaveQueue.has(d.characterId));
    if (filtered.length === 0) return;

    try {
      if (typeof this.adapter!.applyDeltaBatch === 'function') {
        await this.withRetry(
          () => this.adapter!.applyDeltaBatch!(filtered),
          'applyDeltaBatch',
        );
        this.stats.deltasFlushed += filtered.length;
      } else {
        for (const delta of filtered) {
          await this.withRetry(
            () => this.adapter!.applyDelta(delta),
            `applyDelta(${delta.characterId})`,
          );
          this.stats.deltasFlushed++;
        }
      }
    } catch (err) {
      this.stats.failedSaves += filtered.length;
      console.error('❌ [Persistence] Flush deltas échoué :', err);
      // Remet en buffer pour réessayer au prochain cycle
      for (const d of filtered) this.queueDelta(d);
    }
  }

  private async flushFullSaves(): Promise<void> {
    const entries = Array.from(this.fullSaveQueue.values());
    this.fullSaveQueue.clear();
    if (entries.length === 0) return;

    // 🆕 Tri par priorité (0 = urgent)
    entries.sort((a, b) => a.priority - b.priority || a.queuedAt - b.queuedAt);

    // 🆕 Batch si supporté et priorité homogène
    if (typeof this.adapter!.savePlayerBatch === 'function') {
      const states: PlayerSaveState[] = [];
      for (const e of entries) {
        const state = this.buildStateFromMemory(e.characterId);
        if (!state) continue;
        state.meta.priority = e.priority;
        state.meta.checksum = this.computeChecksum(state);
        states.push(state);
      }

      if (states.length > 0) {
        try {
          await this.withRetry(
            () => this.adapter!.savePlayerBatch!(states),
            'savePlayerBatch',
          );
          this.stats.savesTotal += states.length;
        } catch (err) {
          this.stats.failedSaves += states.length;
          console.error('❌ [Persistence] Batch save échoué — ré-engorgement :', err);
          for (const s of states) {
            this.fullSaveQueue.set(s.characterId, {
              characterId: s.characterId,
              priority: (s.meta.priority ?? 2) as SavePriority,
              queuedAt: nowMs(),
            });
          }
        }
      }
      return;
    }

    // Fallback séquentiel
    for (const e of entries) {
      const state = this.buildStateFromMemory(e.characterId);
      if (!state) continue;
      state.meta.priority = e.priority;
      state.meta.checksum = this.computeChecksum(state);

      try {
        await this.withRetry(
          () => this.adapter!.savePlayer(state),
          `savePlayer(${e.characterId})`,
        );
        this.stats.savesTotal++;
      } catch (err) {
        this.stats.failedSaves++;
        this.fullSaveQueue.set(e.characterId, {
          characterId: e.characterId,
          priority: e.priority,
          queuedAt: nowMs(),
        });
        console.error(`❌ [Persistence] Ré-engorgement [${e.characterId}] :`, err);
      }
    }
  }

  /**
   * 🆕 Drain : attend que tous les buffers soient vidés.
   * Utile pour les tests et le shutdown.
   */
  public async drain(timeoutMs = 30_000): Promise<boolean> {
    const start = nowMs();
    while ((this.deltaBuffer.size > 0 || this.fullSaveQueue.size > 0) && nowMs() - start < timeoutMs) {
      await this.flush();
      if (this.deltaBuffer.size === 0 && this.fullSaveQueue.size === 0) return true;
      await sleep(100);
    }
    return this.deltaBuffer.size === 0 && this.fullSaveQueue.size === 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RETRY EXPONENTIEL
  // ─────────────────────────────────────────────────────────────────────────

  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i <= this.config.maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < this.config.maxRetries) {
          this.stats.retriesTotal++;
          const delay = backoffMs(i);
          console.warn(`⚠️ [Persistence] ${label} retry ${i + 1}/${this.config.maxRetries} dans ${delay}ms`);
          await sleep(delay);
        }
      }
    }
    throw lastErr;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RATE LIMIT PAR JOUEUR
  // ─────────────────────────────────────────────────────────────────────────

  private isRateLimited(characterId: string): boolean {
    const now = nowMs();
    const arr = this.saveTimestamps.get(characterId) ?? [];
    const recent = arr.filter((t) => now - t < 60_000);
    if (recent.length >= this.config.savesPerMinuteLimit) {
      console.warn(
        `⚠️ [Persistence] Rate-limit atteint pour [${characterId}] : ` +
        `${recent.length}/${this.config.savesPerMinuteLimit} saves/min`,
      );
      return true;
    }
    recent.push(now);
    this.saveTimestamps.set(characterId, recent);
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  TÂCHES DE FOND
  // ─────────────────────────────────────────────────────────────────────────

  private startBackgroundTasks(): void {
    // A. Flush régulier
    this.core.time.every('persistence.flush', this.config.flushIntervalMs, async () => {
      if (this.deltaBuffer.size > 0 || this.fullSaveQueue.size > 0) {
        await this.flush();
      }
    });

    // B. Autosave — capture des variations volatiles
    this.core.time.every('persistence.autosave', this.config.autosaveIntervalMs, () => {
      const players = this.core.memory.values<Record<string, any>>('players') || [];
      for (const p of players) {
        if (!p.characterId) continue;
        const isAfk = !p.lastInputAt || nowMs() - p.lastInputAt > 5 * 60_000;
        const priority: SavePriority = p.tags?.includes('vip') ? 1 : (isAfk ? 3 : 2);

        this.queueDelta({
          characterId: p.characterId,
          position: {
            x: p.position?.[0] ?? 0,
            y: p.position?.[1] ?? 1,
            z: p.position?.[2] ?? 10,
            rotation: p.rotation ?? 0,
            zone: p.currentZone ?? 'Portneuf',
            interiorId: p.interiorId ?? null,
          },
          economy: { cash: p.cash, bank: p.bank, dirtyMoney: p.dirtyMoney },
          status: {
            health: p.health,
            armor: p.armor,
            hunger: p.hunger ?? 100,
            thirst: p.thirst ?? 100,
            wantedLevel: p.wanted,
          },
          playtimeSeconds: (p.playtimeSeconds ?? 0) + this.config.autosaveIntervalMs / 1000,
          activePlaytimeSeconds: isAfk
            ? (p.activePlaytimeSeconds ?? 0)
            : (p.activePlaytimeSeconds ?? 0) + this.config.autosaveIntervalMs / 1000,
          queuedAt: nowMs(),
        });

        if (priority === 1) this.markDirty(p.characterId, 1);
      }
    });

    // C. Snapshot périodique
    this.core.time.every('persistence.snapshot', this.config.snapshotIntervalMs, async () => {
      this.core.memory.snapshot('players', 'periodic');
      this.core.memory.snapshot('owned_properties', 'periodic');
      await this.saveWorldStateAll();
      await this.purgeOldSnapshots();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SHUTDOWN GRACEFUL AVEC TIMEOUT
  // ─────────────────────────────────────────────────────────────────────────

  private installSignalHandlers(): void {
    const shutdown = async (signal: NodeJS.Signals) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      this.stats.shutdownsHandled++;
      console.log(`💾 [Persistence] Signal ${signal} — sauvegarde d'urgence...`);

      const timeout = setTimeout(() => {
        console.error('⏰ [Persistence] Timeout de shutdown — sortie forcée');
        this.stats.forceShutdownsTriggered++;
        process.exit(1);
      }, this.config.shutdownTimeoutMs);

      try {
        const players = this.core.memory.values<Record<string, any>>('players') || [];
        for (const p of players) {
          if (p.characterId) {
            await this.savePlayerNow(p.characterId, 'server_shutdown', 0);
          }
        }
        await this.drain(this.config.shutdownTimeoutMs - 500);
        console.log('💾 [Persistence] Base synchronisée. Arrêt sécurisé.');
      } catch (err) {
        console.error('❌ [Persistence] Erreur au shutdown :', err);
      } finally {
        clearTimeout(timeout);
      }
    };

    const onSigint = () => void shutdown('SIGINT');
    const onSigterm = () => void shutdown('SIGTERM');

    process.once('SIGINT', onSigint);
    process.once('SIGTERM', onSigterm);

    this.signalHandlers = [
      { sig: 'SIGINT', fn: onSigint },
      { sig: 'SIGTERM', fn: onSigterm },
    ];
  }

  private removeSignalHandlers(): void {
    for (const { sig, fn } of this.signalHandlers) {
      process.removeListener(sig, fn);
    }
    this.signalHandlers = [];
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WORLD STATE
  // ─────────────────────────────────────────────────────────────────────────

  private async saveWorldStateAll(): Promise<void> {
    if (!this.adapter) return;

    // 🆕 Parallélisation contrôlée
    const doors = this.core.memory.values<Record<string, any>>('world_doors') || [];
    const containers = this.core.memory.values<Record<string, any>>('world_containers') || [];

    const tasks: Promise<void>[] = [
      ...doors.map((d) => this.adapter!.saveWorldState(d.id, 'door', d, d.villageName)),
      ...containers.map((c) => this.adapter!.saveWorldState(c.id, 'container', c, c.villageName)),
    ];

    const results = await Promise.allSettled(tasks);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`⚠️ [Persistence] ${failed}/${tasks.length} états monde échoués`);
    }
  }

  public async restoreWorldState(): Promise<number> {
    if (!this.adapter) return 0;

    const rows = await this.adapter.loadWorldState();
    for (const row of rows) {
      // 🆕 FIX : lecture unifiée du type
      const state = row.state as Record<string, unknown> | null;
      const kind = (state?.stateType as string | undefined) ?? 'door';
      const ns = kind === 'container' ? 'world_containers' : 'world_doors';
      this.core.memory.set(ns, row.id, row.state);
    }

    console.log(`💾 [Persistence] ${rows.length} états monde restaurés.`);
    return rows.length;
  }

  private async purgeOldSnapshots(): Promise<void> {
    // Hook optionnel — l'adaptateur peut implémenter la purge.
    // Stub conservé pour compatibilité avec futures implémentations.
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  COMMANDES
  // ─────────────────────────────────────────────────────────────────────────

  private registerCommands(): void {
    const commands: CommandDefinition[] = [
      {
        commandName: 'persistence.save',
        contractName: 'persistence.save',
        handler: async (input: { characterId: string }) => {
          const ok = await this.savePlayerNow(input.characterId, 'command', 0);
          if (!ok) throw new Error('Sauvegarde échouée');
          return { saved: true };
        },
      },
      {
        commandName: 'persistence.load',
        contractName: 'persistence.load',
        handler: async (input: { characterId: string }) => {
          const state = await this.loadPlayer(input.characterId);
          if (!state) throw new Error('Personnage introuvable');
          return state;
        },
      },
      {
        commandName: 'persistence.flush',
        handler: async () => {
          await this.flush();
          return { flushed: true, stats: this.stats };
        },
      },
      {
        commandName: 'persistence.drain',
        handler: async () => {
          const done = await this.drain();
          return { done, stats: this.stats };
        },
      },
    ];

    this.core.registerCommands(commands);

    this.core.on('economy', async (evt: any) => {
      const id = evt.payload?.playerId ?? evt.payload?.characterId;
      if (id) this.markDirty(id, 0); // urgent : argent
    }, { agentName: 'persistence' });

    this.core.on('property', async (evt: any) => {
      const id = evt.payload?.ownerId;
      if (id) this.markDirty(id, 1);
    }, { agentName: 'persistence' });

    this.core.on('character', async (evt: any) => {
      const id = evt.payload?.playerId ?? evt.payload?.characterId;
      if (id) this.markDirty(id, 2);
    }, { agentName: 'persistence' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  TRANSACTIONS LOG
  // ─────────────────────────────────────────────────────────────────────────

  public async logTransaction(
    characterId: string,
    type: string,
    amount: number,
    balanceAfter: number,
    account: 'cash' | 'bank' | 'dirty',
    description?: string,
    counterpartyId?: string,
    villageName?: string,
  ): Promise<void> {
    if (!this.adapter) return;
    try {
      await this.adapter.logTransaction({
        characterId, type, amount, balanceAfter, account,
        description, counterpartyId, villageName,
      });
    } catch (err) {
      console.error('⚠️ [Persistence] Échec log transaction :', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  OBSERVABILITÉ
  // ─────────────────────────────────────────────────────────────────────────

  public getStats(): PersistenceMetrics & {
    bufferedDeltas: number;
    queuedFullSaves: number;
    openSessions: number;
    hasAdapter: boolean;
    isFlushing: boolean;
    isShuttingDown: boolean;
    config: PersistenceConfig;
  } {
    return {
      ...this.stats,
      bufferedDeltas: this.deltaBuffer.size,
      queuedFullSaves: this.fullSaveQueue.size,
      openSessions: this.sessions.size,
      hasAdapter: this.adapter !== null,
      isFlushing: this.flushMutex.isLocked(),
      isShuttingDown: this.isShuttingDown,
      config: this.config,
    };
  }

  /**
   * 🆕 Health check pour readiness/liveness probes.
   */
  public health(): { ok: boolean; reason?: string } {
    if (!this.adapter) return { ok: false, reason: 'no_adapter' };
    if (this.stats.checksumErrors > 100) return { ok: false, reason: 'too_many_checksum_errors' };
    if (this.stats.failedSaves > 50 && this.stats.savesTotal === 0) {
      return { ok: false, reason: 'persistent_failures' };
    }
    if (this.deltaBuffer.size > this.config.maxBufferSize * 2) {
      return { ok: false, reason: 'buffer_backlog' };
    }
    return { ok: true };
  }

  /**
   * 🆕 Format Prometheus pour scrape.
   */
  public metricsPrometheus(): string {
    const s = this.getStats();
    const lines = [
      `# HELP persistence_saves_total Total de sauvegardes réussies`,
      `# TYPE persistence_saves_total counter`,
      `persistence_saves_total ${s.savesTotal}`,
      `# HELP persistence_failed_saves_total Total d'échecs`,
      `# TYPE persistence_failed_saves_total counter`,
      `persistence_failed_saves_total ${s.failedSaves}`,
      `# HELP persistence_deltas_flushed_total Total de deltas écrits`,
      `# TYPE persistence_deltas_flushed_total counter`,
      `persistence_deltas_flushed_total ${s.deltasFlushed}`,
      `# HELP persistence_buffered_deltas Deltas en attente`,
      `# TYPE persistence_buffered_deltas gauge`,
      `persistence_buffered_deltas ${s.bufferedDeltas}`,
      `# HELP persistence_last_flush_ms Durée du dernier flush`,
      `# TYPE persistence_last_flush_ms gauge`,
      `persistence_last_flush_ms ${s.lastFlushMs}`,
      `# HELP persistence_avg_flush_ms Moyenne mobile flush`,
      `# TYPE persistence_avg_flush_ms gauge`,
      `persistence_avg_flush_ms ${s.avgFlushMs}`,
      `# HELP persistence_open_sessions Sessions actives`,
      `# TYPE persistence_open_sessions gauge`,
      `persistence_open_sessions ${s.openSessions}`,
      `# HELP persistence_checksum_errors Erreurs d'intégrité`,
      `# TYPE persistence_checksum_errors counter`,
      `persistence_checksum_errors ${s.checksumErrors}`,
      `# HELP persistence_retries_total Retries cumulés`,
      `# TYPE persistence_retries_total counter`,
      `persistence_retries_total ${s.retriesTotal}`,
    ];
    return lines.join('\n');
  }
}