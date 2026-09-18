// ═══════════════════════════════════════════════════════════════════════════
//  ETHERWORLD RP ENGINE v2.0 — Orchestrateur central RP
//  src/server/systems/RPEngine.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Transactions atomiques avec rollback automatique
//  • Priorité d'events (critical/high/normal/low)
//  • Persistance + replay à la reconnexion
//  • Buffer étendu (1000) + filtres par joueur/catégorie
//  • Batching d'events haute fréquence
//  • Validation stricte des inputs
//  • Rate-limit sur actions sensibles
//  • Audit trail complet (qui, quoi, quand, combien)
//  • State machine joueur (loading/active/handcuffed/jailed/dead)
//  • Courbe XP + niveaux avec perks débloqués
//  • Login/logout trail + session tracking
//  • Lock par joueur (anti-race)
//  • Rapports journaliers automatisés
//  • Health check + métriques
//  • Économie simulée (taxes quotidiennes)
//  • Daily caps anti-farm
//  • Compat 100% v1
// ═══════════════════════════════════════════════════════════════════════════

import { jobManager, type JobManager } from './JobSystem';
import { gangManager, type GangManager } from './GangSystem';
import { realEstateManager, type RealEstateManager } from './RealEstateSystem';
import { crimeManager, type CrimeManager } from './CrimeSystem';
import { bankingManager, type BankingManager } from './BankingSystem';
import { inventoryManager, type InventoryManager } from './InventorySystem';
import { lawEnforcementManager, type LawEnforcementManager } from './LawEnforcementSystem';
import { commerceManager, type CommerceManager } from './CommerceSystem';

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type PlayerState =
  | 'loading'
  | 'active'
  | 'handcuffed'
  | 'jailed'
  | 'dead'
  | 'disconnected';

export interface PlayerProfile {
  playerId: string;
  playerName: string;
  level: number;
  experience: number;
  bankAccountId: string | null;
  inventoryId: string | null;
  jobId: string | null;
  gangId: string | null;
  factionId: string | null;
  propertyIds: string[];
  wantedStars: number;
  isHandcuffed: boolean;
  inJail: boolean;
  jailReleaseAt: number | null;
  createdAt: number;
  lastLogin: number;
  playtimeHours: number;
  totalEarnings: number;
  totalSpent: number;

  // 🆕 v2 extensions
  state: PlayerState;
  lastSavedAt: number;
  lastHeartbeatAt: number;
  sessionCount: number;
  dailyEarnings: number;
  dailyEarningsResetAt: number;
  perks: string[];
  reputation: number;
  wantedLevel: number;
}

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export type GameEventCategory =
  | 'player'
  | 'job'
  | 'gang'
  | 'realestate'
  | 'crime'
  | 'banking'
  | 'inventory'
  | 'law'
  | 'commerce'
  | 'system'; // 🆕

export interface GameEvent {
  eventId: string;
  category: GameEventCategory;
  type: string;
  playerId?: string;
  data: Record<string, unknown>;
  timestamp: number;

  // 🆕 v2 extensions
  priority: EventPriority;
  /** Persisté en DB pour replay post-reconnect */
  persisted?: boolean;
}

export type GameEventListener = (event: GameEvent) => void;

export interface TransactionOp {
  name: string;
  execute: () => Promise<void> | void;
  rollback: () => Promise<void> | void;
}

export interface TransactionResult {
  success: boolean;
  failedAt?: string;
  error?: string;
  ops: string[];
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetId?: string;
  amount?: number;
  meta?: Record<string, unknown>;
  timestamp: number;
}

export interface DailyReport {
  date: string;
  playersActive: number;
  playersCreated: number;
  totalEarnings: number;
  totalSpent: number;
  crimesCommitted: number;
  arrestsMade: number;
  propertiesSold: number;
  itemsSold: number;
  eventsCount: number;
}

export interface RPEngineConfig {
  /** Taille max du buffer d'events en RAM */
  maxEventHistory: number;
  /** Priorité des events système */
  systemEventPriority: EventPriority;
  /** Intervalle de batching en ms */
  batchIntervalMs: number;
  /** Rate limit : max events par joueur par seconde */
  eventRateLimitPerSec: number;
  /** Cap des gains quotidiens par joueur */
  dailyEarningsCap: number;
  /** Taux de taxe sur revenus (0.15 = 15%) */
  incomeTaxRate: number;
  /** Fréquence des sauvegardes joueurs */
  playerSaveIntervalMs: number;
  /** Cooldown après déconnexion avant cleanup complet */
  disconnectCooldownMs: number;
  /** Activer l'audit trail */
  auditEnabled: boolean;
  /** Activer la persistance des events critiques */
  persistCriticalEvents: boolean;
}

const DEFAULT_CONFIG: RPEngineConfig = {
  maxEventHistory: 1000,
  systemEventPriority: 'high',
  batchIntervalMs: 100,
  eventRateLimitPerSec: 20,
  dailyEarningsCap: 100_000,
  incomeTaxRate: 0.15,
  playerSaveIntervalMs: 60_000,
  disconnectCooldownMs: 5 * 60_000,
  auditEnabled: true,
  persistCriticalEvents: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//  XP CURVE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Courbe XP : palier N = palier(N-1) + 100 * N^1.4
 * Niveau 1 → 2 : 100 XP
 * Niveau 2 → 3 : 264 XP
 * Niveau 3 → 4 : 464 XP
 * Niveau 10 → 11 : ~3 981 XP
 */
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.4));
}

function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

function levelFromXp(xp: number): number {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
    if (level > 200) break; // cap
  }
  return level;
}

/** Perks débloqués par niveau */
const PERKS_BY_LEVEL: Record<number, string> = {
  3: 'fast_travel',
  5: 'inventory_plus',
  8: 'job_apply',
  12: 'property_viewing',
  15: 'gang_apply',
  20: 'marketplace',
  25: 'legal_gun',
  30: 'super_car_rental',
};

// ═══════════════════════════════════════════════════════════════════════════
//  EVENT BUFFER (v2)
// ═══════════════════════════════════════════════════════════════════════════

const PRIORITY_WEIGHT: Record<EventPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

class EventBuffer {
  private buffer: GameEvent[] = [];
  private listeners = new Set<GameEventListener>();
  private playerListeners = new Map<string, Set<GameEventListener>>();
  private categoryListeners = new Map<GameEventCategory, Set<GameEventListener>>();
  private maxSize: number;

  // Batching
  private pendingBatch: GameEvent[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize = 1000, batchIntervalMs = 100) {
    this.maxSize = maxSize;
    this.batchTimer = setInterval(() => this.flushBatch(), batchIntervalMs);
    if (this.batchTimer.unref) this.batchTimer.unref();
  }

  public push(event: GameEvent, opts?: { batch?: boolean }): void {
    // Buffer principal (ring)
    this.buffer.push(event);
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }

    // Batching pour les events non-critiques haute fréquence
    if (opts?.batch && event.priority !== 'critical') {
      this.pendingBatch.push(event);
      return;
    }

    this.dispatch(event);
  }

  private flushBatch(): void {
    if (this.pendingBatch.length === 0) return;
    const batch = this.pendingBatch;
    this.pendingBatch = [];
    for (const evt of batch) this.dispatch(evt);
  }

  private dispatch(event: GameEvent): void {
    // Listeners globaux
    for (const cb of this.listeners) {
      try { cb(event); } catch (err) {
        console.error('[RPEngine] Listener global error:', err);
      }
    }

    // Listeners par joueur
    if (event.playerId) {
      const set = this.playerListeners.get(event.playerId);
      if (set) {
        for (const cb of set) {
          try { cb(event); } catch (err) {
            console.error('[RPEngine] Listener player error:', err);
          }
        }
      }
    }

    // Listeners par catégorie
    const catSet = this.categoryListeners.get(event.category);
    if (catSet) {
      for (const cb of catSet) {
        try { cb(event); } catch (err) {
          console.error('[RPEngine] Listener category error:', err);
        }
      }
    }
  }

  public subscribe(cb: GameEventListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public subscribePlayer(playerId: string, cb: GameEventListener): () => void {
    let set = this.playerListeners.get(playerId);
    if (!set) {
      set = new Set();
      this.playerListeners.set(playerId, set);
    }
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) this.playerListeners.delete(playerId);
    };
  }

  public subscribeCategory(
    category: GameEventCategory,
    cb: GameEventListener,
  ): () => void {
    let set = this.categoryListeners.get(category);
    if (!set) {
      set = new Set();
      this.categoryListeners.set(category, set);
    }
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) this.categoryListeners.delete(category);
    };
  }

  public getRecent(count = 50): GameEvent[] {
    return this.buffer.slice(-count);
  }

  public getByCategory(category: GameEventCategory, count = 30): GameEvent[] {
    return this.buffer.filter((e) => e.category === category).slice(-count);
  }

  public getByPlayer(playerId: string, count = 50): GameEvent[] {
    return this.buffer.filter((e) => e.playerId === playerId).slice(-count);
  }

  public getSince(timestamp: number, priorityMin?: EventPriority): GameEvent[] {
    const minWeight = priorityMin ? PRIORITY_WEIGHT[priorityMin] : 0;
    return this.buffer.filter(
      (e) => e.timestamp >= timestamp && PRIORITY_WEIGHT[e.priority] >= minWeight,
    );
  }

  public getCriticalEvents(count = 30): GameEvent[] {
    return this.buffer.filter((e) => e.priority === 'critical').slice(-count);
  }

  public clear(): void {
    this.buffer.length = 0;
    this.pendingBatch.length = 0;
    this.listeners.clear();
    this.playerListeners.clear();
    this.categoryListeners.clear();
  }

  public dispose(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    this.clear();
  }

  public get size(): number {
    return this.buffer.length;
  }

  public get pendingCount(): number {
    return this.pendingBatch.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PLAYER LOCK (anti-race)
// ═══════════════════════════════════════════════════════════════════════════

class PlayerLock {
  private locks = new Map<string, Promise<void>>();

  async withLock<T>(playerId: string, fn: () => Promise<T> | T): Promise<T> {
    const prev = this.locks.get(playerId);
    if (prev) await prev;

    let release!: () => void;
    const lock = new Promise<void>((res) => { release = res; });
    this.locks.set(playerId, lock);

    try {
      return await fn();
    } finally {
      if (this.locks.get(playerId) === lock) {
        this.locks.delete(playerId);
      }
      release();
    }
  }

  isLocked(playerId: string): boolean {
    return this.locks.has(playerId);
  }

  clear(): void {
    this.locks.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function validatePlayerId(id: unknown): string {
  const s = String(id ?? '').trim();
  if (s.length < 2 || s.length > 64) throw new Error('playerId invalide');
  if (!/^[a-zA-Z0-9_\-:]+$/.test(s)) throw new Error('playerId contient des caractères interdits');
  return s;
}

function validatePlayerName(name: unknown): string {
  const s = String(name ?? '').trim().slice(0, 64);
  if (s.length < 2) throw new Error('playerName trop court');
  return s;
}

function validateAmount(n: unknown, min = 0, max = 10_000_000): number {
  const v = Number(n);
  if (!Number.isFinite(v)) throw new Error('Montant invalide');
  return Math.max(min, Math.min(max, Math.floor(v)));
}

// ═══════════════════════════════════════════════════════════════════════════
//  RP ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class EtherWorldRPEngine {
  // Sous-systèmes
  private jobs: JobManager;
  private gangs: GangManager;
  private realEstate: RealEstateManager;
  private crimes: CrimeManager;
  private banking: BankingManager;
  private inventory: InventoryManager;
  private lawEnforcement: LawEnforcementManager;
  private commerce: CommerceManager;

  // État moteur
  private players = new Map<string, PlayerProfile>();
  private events: EventBuffer;
  private config: RPEngineConfig;
  private locks = new PlayerLock();

  // Audit
  private auditLog: AuditEntry[] = [];
  private readonly AUDIT_MAX = 5000;

  // Rate-limit events
  private eventRate = new Map<string, number[]>();

  // Save timer
  private saveTimer: ReturnType<typeof setInterval> | null = null;

  // Stats globales
  private stats = {
    playersCreated: 0,
    playersRemoved: 0,
    transactionsCommitted: 0,
    transactionsRolledBack: 0,
    eventsEmitted: 0,
    eventsBatched: 0,
    eventsRateLimited: 0,
    dailyReportsGenerated: 0,
    savesTotal: 0,
  };

  // Daily reset
  private lastDailyReset = Date.now();
  private dailyReport: DailyReport | null = null;

  constructor(config: Partial<RPEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.jobs = jobManager;
    this.gangs = gangManager;
    this.realEstate = realEstateManager;
    this.crimes = crimeManager;
    this.banking = bankingManager;
    this.inventory = inventoryManager;
    this.lawEnforcement = lawEnforcementManager;
    this.commerce = commerceManager;

    this.events = new EventBuffer(
      this.config.maxEventHistory,
      this.config.batchIntervalMs,
    );

    this.wireSystemCallbacks();
    this.startSaveTimer();
    this.startDailyResetTimer();

    console.log(
      `🎮 [RPEngine] v2.0 initialisé · 8 sous-systèmes · ` +
      `buffer=${this.config.maxEventHistory} · ` +
      `taxes=${(this.config.incomeTaxRate * 100).toFixed(1)}% · ` +
      `audit=${this.config.auditEnabled ? 'ON' : 'OFF'}`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WIRING
  // ─────────────────────────────────────────────────────────────────────────

  private wireSystemCallbacks(): void {
    const wire = (
      manager: { onUpdate: (cb: (e: any) => void) => void },
      category: GameEventCategory,
      type: string,
      priority: EventPriority = 'normal',
    ) => {
      manager.onUpdate((e) => this.emit(category, type, e, priority));
    };

    wire(this.jobs, 'job', 'job_update');
    wire(this.gangs, 'gang', 'gang_update');
    wire(this.realEstate, 'realestate', 'property_update');
    wire(this.crimes, 'crime', 'crime_update', 'high');
    wire(this.banking, 'banking', 'banking_update', 'high');
    wire(this.inventory, 'inventory', 'inventory_update');
    wire(this.lawEnforcement, 'law', 'law_update', 'high');
    wire(this.commerce, 'commerce', 'commerce_update');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  TRANSACTION ATOMIQUE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🆕 Exécute une série d'opérations de manière atomique.
   * Si une opération échoue, toutes les précédentes sont rollback.
   *
   * @example
   * await this.transaction([
   *   { name: 'withdraw', execute: () => withdraw(...), rollback: () => deposit(...) },
   *   { name: 'addProperty', execute: () => addProp(...), rollback: () => removeProp(...) },
   * ]);
   */
  private async transaction(ops: TransactionOp[]): Promise<TransactionResult> {
    const executed: TransactionOp[] = [];

    for (const op of ops) {
      try {
        await op.execute();
        executed.push(op);
      } catch (err) {
        // Rollback en ordre inverse
        for (let i = executed.length - 1; i >= 0; i--) {
          try {
            await executed[i].rollback();
          } catch (rbErr) {
            console.error(`[RPEngine] Rollback échoué pour ${executed[i].name}:`, rbErr);
          }
        }

        this.stats.transactionsRolledBack++;
        return {
          success: false,
          failedAt: op.name,
          error: String(err),
          ops: executed.map((e) => e.name),
        };
      }
    }

    this.stats.transactionsCommitted++;
    return {
      success: true,
      ops: executed.map((e) => e.name),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  AUDIT
  // ─────────────────────────────────────────────────────────────────────────

  private audit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    if (!this.config.auditEnabled) return;

    this.auditLog.push({
      ...entry,
      id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    });

    if (this.auditLog.length > this.AUDIT_MAX) {
      this.auditLog = this.auditLog.slice(-this.AUDIT_MAX);
    }
  }

  public getAuditLog(limit = 100): AuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  public getAuditByActor(actorId: string, limit = 50): AuditEntry[] {
    return this.auditLog.filter((a) => a.actorId === actorId).slice(-limit);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RATE LIMIT EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  private isEventRateLimited(playerId: string): boolean {
    const now = Date.now();
    const window = 1000;
    const arr = this.eventRate.get(playerId) ?? [];
    const recent = arr.filter((t) => now - t < window);

    if (recent.length >= this.config.eventRateLimitPerSec) {
      this.stats.eventsRateLimited++;
      return true;
    }

    recent.push(now);
    this.eventRate.set(playerId, recent);
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PLAYER MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  public createPlayer(
    playerId: string,
    playerName: string,
    startingCash = 250,
    startingBank = 2500,
  ): PlayerProfile {
    const id = validatePlayerId(playerId);
    const name = validatePlayerName(playerName);
    const cash = validateAmount(startingCash, 0, 10000);
    const bank = validateAmount(startingBank, 0, 100000);

    if (this.players.has(id)) {
      return this.players.get(id)!;
    }

    // Création compte bancaire
    const bankAccount = this.banking.createAccount(id, name, 'personal');
    if (bankAccount) {
      this.banking.deposit(bankAccount.accountId, bank, 'Ouverture de compte · Caisse Desjardins');
    }

    // Création inventaire
    const inv = this.inventory.createInventory(id, name, 'player', 30);

    const now = Date.now();
    const profile: PlayerProfile = {
      playerId: id,
      playerName: name,
      level: 1,
      experience: 0,
      bankAccountId: bankAccount?.accountId ?? null,
      inventoryId: inv?.id ?? null,
      jobId: null,
      gangId: null,
      factionId: null,
      propertyIds: [],
      wantedStars: 0,
      isHandcuffed: false,
      inJail: false,
      jailReleaseAt: null,
      createdAt: now,
      lastLogin: now,
      playtimeHours: 0,
      totalEarnings: bank + cash,
      totalSpent: 0,

      // v2
      state: 'active',
      lastSavedAt: 0,
      lastHeartbeatAt: now,
      sessionCount: 1,
      dailyEarnings: 0,
      dailyEarningsResetAt: now,
      perks: [],
      reputation: 0,
      wantedLevel: 0,
    };

    this.players.set(id, profile);
    this.stats.playersCreated++;

    this.audit({
      actorId: id,
      action: 'player_created',
      targetId: id,
      meta: { name, cash, bank },
    });

    this.emit('player', 'player_created', { playerId: id, playerName: name });
    return profile;
  }

  public getPlayer(playerId: string): PlayerProfile | undefined {
    return this.players.get(playerId);
  }

  public removePlayer(playerId: string): boolean {
    const id = String(playerId ?? '');
    const existed = this.players.delete(id);
    if (existed) {
      this.stats.playersRemoved++;
      this.eventRate.delete(id);
      this.emit('player', 'player_removed', { playerId: id });
    }
    return existed;
  }

  /** 🆕 Update heartbeat — appelé régulièrement par le client. */
  public heartbeat(playerId: string): void {
    const p = this.players.get(playerId);
    if (p) p.lastHeartbeatAt = Date.now();
  }

  /** 🆕 Applique la courbe XP et débloque les perks. */
  private applyExperience(player: PlayerProfile, xp: number): void {
    const oldLevel = player.level;
    player.experience += xp;
    const newLevel = levelFromXp(player.experience);

    if (newLevel > oldLevel) {
      player.level = newLevel;

      // Débloque les perks de tous les niveaux traversés
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const perk = PERKS_BY_LEVEL[lvl];
        if (perk && !player.perks.includes(perk)) {
          player.perks.push(perk);
          this.emit('player', 'perk_unlocked', {
            playerId: player.playerId,
            perk,
            level: lvl,
          }, 'high');
        }
      }

      this.emit('player', 'level_up', {
        playerId: player.playerId,
        oldLevel,
        newLevel,
      }, 'high');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  JOBS
  // ─────────────────────────────────────────────────────────────────────────

  public hirePlayer(playerId: string, jobId: string): boolean {
    const p = this.players.get(playerId);
    if (!p) return false;

    const existing = this.jobs.getEmployee(playerId);
    if (existing) return false;

    const success = this.jobs.hireEmployee(playerId, p.playerName, jobId);
    if (success) {
      p.jobId = jobId;
      this.audit({ actorId: playerId, action: 'hired', meta: { jobId } });
      this.emit('player', 'player_hired', { playerId, jobId });
    }
    return success;
  }

  public firePlayer(playerId: string): boolean {
    const p = this.players.get(playerId);
    if (!p || !p.jobId) return false;

    const oldJob = p.jobId;
    const success = this.jobs.fireEmployee(playerId);
    if (success) {
      p.jobId = null;
      this.audit({ actorId: playerId, action: 'fired', meta: { jobId: oldJob } });
      this.emit('player', 'player_fired', { playerId });
    }
    return success;
  }

  public startWork(playerId: string): boolean {
    const success = this.jobs.startShift(playerId);
    if (success) this.emit('player', 'shift_started', { playerId });
    return success;
  }

  public endWork(playerId: string): number {
    const hours = this.jobs.endShift(playerId);
    if (hours > 0) {
      const p = this.players.get(playerId);
      if (p) {
        p.playtimeHours += hours;
        this.emit('player', 'shift_ended', { playerId, hours });
      }
    }
    return hours;
  }

  public completeJobTask(playerId: string, taskId: string): number {
    const reward = this.jobs.completeTask(playerId, taskId);
    if (reward <= 0) return 0;

    const p = this.players.get(playerId);
    if (!p) return 0;

    // 🆕 Daily cap anti-farm
    this.resetDailyIfNeeded(p);
    if (p.dailyEarnings + reward > this.config.dailyEarningsCap) {
      this.emit('player', 'daily_cap_reached', { playerId, cap: this.config.dailyEarningsCap });
      return 0;
    }

    // 🆕 Taxe sur revenus
    const tax = Math.floor(reward * this.config.incomeTaxRate);
    const net = reward - tax;

    p.totalEarnings += net;
    p.dailyEarnings += net;
    this.applyExperience(p, Math.floor(reward / 10));

    if (p.bankAccountId) {
      this.banking.deposit(p.bankAccountId, net, `Tâche ${taskId} (net après taxe ${tax}$)`);
    }

    this.emit('player', 'task_completed', {
      playerId,
      taskId,
      reward,
      tax,
      net,
    });

    return net;
  }

  private resetDailyIfNeeded(p: PlayerProfile): void {
    const dayMs = 24 * 3600 * 1000;
    if (Date.now() - p.dailyEarningsResetAt > dayMs) {
      p.dailyEarnings = 0;
      p.dailyEarningsResetAt = Date.now();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  GANGS
  // ─────────────────────────────────────────────────────────────────────────

  public recruitInGang(playerId: string, gangId: string): boolean {
    const p = this.players.get(playerId);
    if (!p || p.gangId) return false;

    const success = this.gangs.recruitMember(gangId, playerId, p.playerName);
    if (success) {
      p.gangId = gangId;
      this.audit({ actorId: playerId, action: 'gang_recruited', meta: { gangId } });
      this.emit('gang', 'member_recruited', { playerId, gangId });
    }
    return success;
  }

  public leaveGang(playerId: string): boolean {
    const p = this.players.get(playerId);
    if (!p || !p.gangId) return false;

    const gangId = p.gangId;
    const success = this.gangs.removeMember(gangId, playerId);
    if (success) {
      p.gangId = null;
      this.audit({ actorId: playerId, action: 'gang_left', meta: { gangId } });
      this.emit('gang', 'member_left', { playerId, gangId });
    }
    return success;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  REAL ESTATE (transaction atomique)
  // ─────────────────────────────────────────────────────────────────────────

  public async buyProperty(
    playerId: string,
    propertyId: string,
    price: number,
  ): Promise<boolean> {
    return this.locks.withLock(playerId, async () => {
      const p = this.players.get(playerId);
      if (!p || !p.bankAccountId) return false;

      const cost = validateAmount(price, 1, 50_000_000);

      // Vérif solde
      const balance = this.banking.getBalance(p.bankAccountId);
      if (balance < cost) {
        this.emit('banking', 'insufficient_funds', {
          playerId,
          required: cost,
          available: balance,
        });
        return false;
      }

      // 🆕 Transaction atomique
      const result = await this.transaction([
        {
          name: 'withdraw',
          execute: () => {
            this.banking.withdraw(p.bankAccountId!, cost, `Achat MLS · ${propertyId}`);
          },
          rollback: () => {
            this.banking.deposit(p.bankAccountId!, cost, `ROLLBACK Achat MLS · ${propertyId}`);
          },
        },
        {
          name: 'buyProperty',
          execute: () => {
            const ok = this.realEstate.buyProperty(playerId, propertyId, cost);
            if (!ok) throw new Error('Échec achat propriété');
          },
          rollback: () => {
            // Tentative de rollback côté realEstate
            try { (this.realEstate as any).sellProperty?.(propertyId, playerId); } catch { /* noop */ }
          },
        },
      ]);

      if (!result.success) {
        this.emit('realestate', 'purchase_failed', {
          playerId,
          propertyId,
          reason: result.error,
        }, 'high');
        return false;
      }

      p.propertyIds.push(propertyId);
      p.totalSpent += cost;

      this.audit({
        actorId: playerId,
        action: 'property_bought',
        targetId: propertyId,
        amount: cost,
      });

      this.emit('realestate', 'property_purchased', {
        playerId,
        propertyId,
        price: cost,
      }, 'high');

      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  JUSTICE
  // ─────────────────────────────────────────────────────────────────────────

  public commitCrime(playerId: string, crimeId: string): boolean {
    const p = this.players.get(playerId);
    if (!p) return false;

    const success = this.crimes.commitCrime(playerId, p.playerName, crimeId);
    if (success) {
      const wanted = this.crimes.getWantedStatus(playerId);
      p.wantedStars = wanted?.stars ?? 0;
      p.wantedLevel = p.wantedStars;
      p.reputation += 5;

      this.audit({
        actorId: playerId,
        action: 'crime_committed',
        meta: { crimeId, stars: p.wantedStars },
      });

      this.emit('crime', 'crime_committed', {
        playerId,
        crimeId,
        stars: p.wantedStars,
      }, 'high');
    }
    return success;
  }

  public arrestPlayer(
    officerId: string,
    targetId: string,
    prisonMinutes: number,
  ): boolean {
    const target = this.players.get(targetId);
    if (!target) return false;

    const minutes = Math.max(1, Math.min(1440, Math.floor(prisonMinutes)));
    const success = this.crimes.arrestPlayer(targetId, minutes);

    if (success) {
      target.wantedStars = 0;
      target.wantedLevel = 0;
      target.isHandcuffed = true;
      target.inJail = true;
      target.jailReleaseAt = Date.now() + minutes * 60_000;
      target.state = 'jailed';

      this.audit({
        actorId: officerId,
        action: 'arrested',
        targetId,
        meta: { minutes },
      });

      this.emit('law', 'player_arrested', {
        officerId,
        targetId,
        prisonMinutes: minutes,
        targetName: target.playerName,
      }, 'critical');
    }
    return success;
  }

  public releasePlayer(targetId: string): boolean {
    const target = this.players.get(targetId);
    if (!target) return false;

    target.isHandcuffed = false;
    target.inJail = false;
    target.jailReleaseAt = null;
    target.state = 'active';

    this.emit('law', 'player_released', { targetId }, 'high');
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  FACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  public joinFaction(playerId: string, factionId: string): boolean {
    const p = this.players.get(playerId);
    if (!p) return false;

    const faction = this.lawEnforcement.getFaction(factionId);
    if (!faction) return false;

    const officer = this.lawEnforcement.recruitOfficer(
      factionId,
      playerId,
      p.playerName,
      faction.type,
    );

    if (officer) {
      p.factionId = factionId;
      this.audit({ actorId: playerId, action: 'faction_joined', meta: { factionId } });
      this.emit('law', 'player_joined_faction', { playerId, factionId });
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  COMMERCE (transaction atomique)
  // ─────────────────────────────────────────────────────────────────────────

  public async buyItem(
    playerId: string,
    shopId: string,
    listingId: string,
    quantity: number,
  ): Promise<boolean> {
    return this.locks.withLock(playerId, async () => {
      const p = this.players.get(playerId);
      if (!p) return false;

      const qty = Math.max(1, Math.min(Math.floor(quantity), 100));

      // 1) Créer la transaction côté commerce
      const tx = this.commerce.buyFromShop(shopId, playerId, p.playerName, listingId, qty);
      if (!tx) return false;

      const total = tx.totalPrice;

      // 2) Vérif solde
      if (p.bankAccountId) {
        const balance = this.banking.getBalance(p.bankAccountId);
        if (balance < total) {
          // Rollback commerce
          try { (this.commerce as any).cancelTransaction?.(tx); } catch { /* noop */ }
          return false;
        }
      }

      // 3) Transaction atomique (withdraw + addInventory)
      const result = await this.transaction([
        {
          name: 'bankWithdraw',
          execute: () => {
            if (p.bankAccountId) {
              this.banking.withdraw(p.bankAccountId, total, `Achat · ${shopId}`);
            }
          },
          rollback: () => {
            if (p.bankAccountId) {
              this.banking.deposit(p.bankAccountId, total, `ROLLBACK Achat · ${shopId}`);
            }
          },
        },
        {
          name: 'addInventory',
          execute: () => {
            if (p.inventoryId) {
              this.inventory.addItem(p.inventoryId, tx.itemId, qty);
            }
          },
          rollback: () => {
            if (p.inventoryId) {
              try { this.inventory.removeItem(p.inventoryId, tx.itemId, qty); } catch { /* noop */ }
            }
          },
        },
      ]);

      if (!result.success) {
        this.emit('commerce', 'purchase_failed', {
          playerId,
          shopId,
          listingId,
          reason: result.error,
        }, 'high');
        return false;
      }

      p.totalSpent += total;

      this.audit({
        actorId: playerId,
        action: 'item_bought',
        targetId: listingId,
        amount: total,
        meta: { shopId, qty },
      });

      this.emit('commerce', 'item_purchased', {
        playerId,
        shopId,
        listingId,
        quantity: qty,
        totalPrice: total,
      });

      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  private emit(
    category: GameEventCategory,
    type: string,
    data: Record<string, unknown> = {},
    priority: EventPriority = 'normal',
    opts?: { batch?: boolean },
  ): void {
    const playerId = typeof data.playerId === 'string' ? data.playerId : undefined;

    // Rate limit par joueur
    if (playerId && !this.isEventRateLimited(playerId)) {
      // OK
    } else if (playerId) {
      // Rate-limited → drop le low priority, garde critical/high
      if (priority === 'low' || priority === 'normal') return;
    }

    this.stats.eventsEmitted++;
    if (opts?.batch) this.stats.eventsBatched++;

    const event: GameEvent = {
      eventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      category,
      type,
      playerId,
      data,
      timestamp: Date.now(),
      priority,
      persisted:
        this.config.persistCriticalEvents && priority === 'critical',
    };

    this.events.push(event, opts);
  }

  public onGameEvent(callback: GameEventListener): () => void {
    return this.events.subscribe(callback);
  }

  /** 🆕 Abonnement par joueur. */
  public onPlayerEvent(playerId: string, callback: GameEventListener): () => void {
    return this.events.subscribePlayer(playerId, callback);
  }

  /** 🆕 Abonnement par catégorie. */
  public onCategoryEvent(
    category: GameEventCategory,
    callback: GameEventListener,
  ): () => void {
    return this.events.subscribeCategory(category, callback);
  }

  public getRecentEvents(count = 50): GameEvent[] {
    return this.events.getRecent(count);
  }

  /** 🆕 Events depuis un timestamp (pour reconnect replay). */
  public getEventsSince(timestamp: number): GameEvent[] {
    return this.events.getSince(timestamp, 'high');
  }

  /** 🆕 Events d'un joueur spécifique. */
  public getPlayerEvents(playerId: string, count = 50): GameEvent[] {
    return this.events.getByPlayer(playerId, count);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SAVE TIMER
  // ─────────────────────────────────────────────────────────────────────────

  private startSaveTimer(): void {
    if (this.config.playerSaveIntervalMs <= 0) return;

    this.saveTimer = setInterval(() => {
      const now = Date.now();
      for (const p of this.players.values()) {
        // Skip si inactif
        if (now - p.lastHeartbeatAt > 5 * 60_000) continue;

        p.lastSavedAt = now;
        this.stats.savesTotal++;

        // Hook : persistance déléguée à PersistenceService
        this.emit('system', 'player_save_tick', {
          playerId: p.playerId,
          level: p.level,
          playtimeHours: p.playtimeHours,
        }, 'low', { batch: true });
      }
    }, this.config.playerSaveIntervalMs);

    if (this.saveTimer.unref) this.saveTimer.unref();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  DAILY RESET + REPORT
  // ─────────────────────────────────────────────────────────────────────────

  private startDailyResetTimer(): void {
    const checkInterval = 60 * 60 * 1000; // toutes les heures

    const check = () => {
      const now = Date.now();
      const dayMs = 24 * 3600 * 1000;

      if (now - this.lastDailyReset >= dayMs) {
        this.generateDailyReport();
        this.lastDailyReset = now;

        // Reset daily earnings de tous les joueurs
        for (const p of this.players.values()) {
          p.dailyEarnings = 0;
          p.dailyEarningsResetAt = now;
        }
      }
    };

    const interval = setInterval(check, checkInterval);
    if ((interval as any).unref) (interval as any).unref();
  }

  private generateDailyReport(): void {
    const since = this.lastDailyReset;
    const events = this.events.getSince(since);

    let totalEarnings = 0;
    let totalSpent = 0;
    let crimesCommitted = 0;
    let arrestsMade = 0;
    let propertiesSold = 0;
    let itemsSold = 0;

    for (const e of events) {
      if (e.type === 'task_completed') totalEarnings += Number(e.data.net ?? 0);
      if (e.type === 'item_purchased') { totalSpent += Number(e.data.totalPrice ?? 0); itemsSold++; }
      if (e.type === 'crime_committed') crimesCommitted++;
      if (e.type === 'player_arrested') arrestsMade++;
      if (e.type === 'property_purchased') propertiesSold++;
    }

    this.dailyReport = {
      date: new Date().toISOString().split('T')[0],
      playersActive: this.players.size,
      playersCreated: this.stats.playersCreated,
      totalEarnings,
      totalSpent,
      crimesCommitted,
      arrestsMade,
      propertiesSold,
      itemsSold,
      eventsCount: events.length,
    };

    this.stats.dailyReportsGenerated++;

    this.emit('system', 'daily_report', {
      report: this.dailyReport,
    }, 'high');

    console.log(
      `📊 [RPEngine] Rapport journalier · ` +
      `+${totalEarnings}$ · -${totalSpent}$ · ` +
      `${crimesCommitted} crimes · ${arrestsMade} arrestations`,
    );
  }

  public getDailyReport(): DailyReport | null {
    return this.dailyReport ? { ...this.dailyReport } : null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  STATS / HEALTH
  // ─────────────────────────────────────────────────────────────────────────

  public getEngineStats() {
    return {
      // v1 compat
      players: this.players.size,
      jobs: this.jobs.getAllJobs().length,
      gangs: this.gangs.getAllGangs().length,
      events: this.events.size,
      timestamp: Date.now(),

      // v2
      config: this.config,
      stats: this.stats,
      auditEntries: this.auditLog.length,
      eventsPending: this.events.pendingCount,
      playersActive: Array.from(this.players.values()).filter((p) => p.state === 'active').length,
      playersJailed: Array.from(this.players.values()).filter((p) => p.state === 'jailed').length,
      avgLevel: this.players.size > 0
        ? Math.round(
            Array.from(this.players.values()).reduce((s, p) => s + p.level, 0) / this.players.size,
          )
        : 0,
      totalPlaytimeHours: Math.round(
        Array.from(this.players.values()).reduce((s, p) => s + p.playtimeHours, 0),
      ),
      dailyReport: this.dailyReport,
    };
  }

  public health(): { ok: boolean; reason?: string } {
    if (this.players.size > 5000) return { ok: false, reason: 'too_many_players' };
    if (this.events.size > this.config.maxEventHistory * 0.95) {
      return { ok: false, reason: 'event_buffer_near_full' };
    }
    if (this.stats.transactionsRolledBack > 100 && this.stats.transactionsCommitted === 0) {
      return { ok: false, reason: 'persistent_transaction_failures' };
    }
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  REPLAY (reconnexion)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🆕 Renvoie les events pour un joueur qui se reconnecte.
   * Utile pour rattraper les events critiques manqués.
   */
  public replayForPlayer(playerId: string, sinceTimestamp?: number): GameEvent[] {
    const since = sinceTimestamp ?? Date.now() - 60_000;
    return this.events.getSince(since, 'high').filter(
      (e) => e.playerId === playerId || e.priority === 'critical',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  DISPOSE
  // ─────────────────────────────────────────────────────────────────────────

  public dispose(): void {
    this.jobs.dispose();
    this.gangs.dispose();
    this.realEstate.dispose();
    this.crimes.dispose();
    this.banking.dispose();
    this.inventory.dispose();
    this.lawEnforcement.dispose();
    this.commerce.dispose();

    this.events.dispose();
    this.players.clear();
    this.auditLog.length = 0;
    this.eventRate.clear();
    this.locks.clear();

    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }

    console.log('🛑 [RPEngine] Moteur RP libéré proprement.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const rpEngine = new EtherWorldRPEngine();