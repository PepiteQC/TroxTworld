// ═══════════════════════════════════════════════════════════════════════════
//  TROXTWORLD — SAVE SYSTEM v2.0
//  src/server/systems/SaveSystem.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Snapshots persistés en DB (survivent aux redémarrages)
//  • Restauration complète ou partielle (rollback)
//  • Auto-snapshot planifié (configurable)
//  • Politique de rotation (count + âge + taille totale)
//  • Checksum d'intégrité par snapshot
//  • Tags par village / zone / type d'event
//  • Verrou anti-concurrence (un seul snapshot à la fois)
//  • Événements Arcadius complets
//  • Health / stats pour observabilité
// ═══════════════════════════════════════════════════════════════════════════

import { EtherPrismDB } from '../core/EtherPrismDB';
import { Intellectus } from '../core/Intellectus';

// ─────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────

export type SnapshotType = 'auto' | 'manual' | 'shutdown' | 'scheduled' | 'checkpoint';

export interface SnapshotMeta {
  /** Compteur de joueurs connectés au moment du snapshot */
  playersOnline: number;
  /** Nombre d'entités monde (véhicules, props, PNJ…) */
  worldEntities: number;
  /** Taille brute (avant compression) en octets */
  rawBytes: number;
  /** Taille finale stockée en octets */
  storedBytes: number;
  /** Version du schéma de snapshot */
  schemaVersion: number;
  /** Zone/village principal visé (optionnel) */
  village?: string;
  /** Auteur du snapshot (playerId ou 'system') */
  author?: string;
  /** Tags libres (event, incident, admin…) */
  tags?: string[];
}

export interface Snapshot {
  id: string;
  type: SnapshotType;
  description: string;
  /** Données sérialisées (potentiellement compressées) */
  data: string;
  createdAt: number;
  /** Checksum FNV-1a 64 bits hex */
  checksum: string;
  /** Métadonnées riches */
  meta: SnapshotMeta;
}

export interface SaveSystemConfig {
  /** Nombre maximum de snapshots conservés (les plus récents) */
  maxSnapshots: number;
  /** Âge maximum d'un snapshot en ms avant purge auto */
  maxAgeMs: number;
  /** Taille maximale totale cumulée (octets) — purge les plus anciens */
  maxTotalBytes: number;
  /** Intervalle d'auto-snapshot en ms (0 = désactivé) */
  autoSnapshotIntervalMs: number;
  /** Timeout dur d'une opération de snapshot (ms) */
  snapshotTimeoutMs: number;
  /** Active la compression si un Compressor est fourni */
  compressionEnabled: boolean;
}

const DEFAULT_CONFIG: SaveSystemConfig = {
  maxSnapshots: 30,
  maxAgeMs: 7 * 24 * 3600 * 1000,   // 7 jours
  maxTotalBytes: 200 * 1024 * 1024,  // 200 MB
  autoSnapshotIntervalMs: 15 * 60 * 1000, // 15 min
  snapshotTimeoutMs: 20_000,
  compressionEnabled: false,
};

/**
 * Interface optionnelle de compression.
 */
export interface Compressor {
  compress(data: string): Promise<string> | string;
  decompress(data: string): Promise<string> | string;
}

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────

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

function byteLength(str: string): number {
  // Approximation rapide (UTF-8) sans Buffer
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c < 0xd800 || c >= 0xe000) bytes += 3;
    else { bytes += 4; i++; }
  }
  return bytes;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[SaveSystem] Timeout ${label} (${ms}ms)`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  SAVE SYSTEM
// ─────────────────────────────────────────────────────────────────────────

export class SaveSystem {
  public db: EtherPrismDB;
  public intellectus: Intellectus;

  private config: SaveSystemConfig;
  private snapshots: Snapshot[] = [];
  private compressor: Compressor | null = null;

  /** Verrou : empêche deux snapshots simultanés */
  private snapshotLock: Promise<void> | null = null;

  /** Timer d'auto-snapshot */
  private autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;

  private stats = {
    snapshotsCreated: 0,
    snapshotsRestored: 0,
    snapshotsPurged: 0,
    snapshotsFailed: 0,
    checksumErrors: 0,
    lastSnapshotMs: 0,
    lastSnapshotAt: 0,
    lastRestoreAt: 0,
    totalBytesStored: 0,
  };

  private isReady = false;

  constructor(
    db: EtherPrismDB,
    intellectus: Intellectus,
    config: Partial<SaveSystemConfig> = {},
  ) {
    this.db = db;
    this.intellectus = intellectus;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INITIALISATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(options?: { compressor?: Compressor }): Promise<void> {
    if (options?.compressor) {
      this.compressor = options.compressor;
      this.config.compressionEnabled = true;
    }

    // Charge les snapshots existants depuis la DB
    await this.loadSnapshotsFromDb();

    // Purge initiale (rétention)
    await this.purge();

    // Démarre l'auto-snapshot si configuré
    if (this.config.autoSnapshotIntervalMs > 0) {
      this.startAutoSnapshots();
    }

    this.isReady = true;

    this.intellectus.arcadius.emit('system:save:ready', {
      snapshotsLoaded: this.snapshots.length,
      autoIntervalMs: this.config.autoSnapshotIntervalMs,
      compression: this.config.compressionEnabled,
    }, 'SaveSystem');
  }

  async shutdown(): Promise<void> {
    // Snapshot final avant arrêt
    try {
      await this.createSnapshot('shutdown', 'Arrêt serveur');
    } catch (err) {
      console.error('[SaveSystem] Échec snapshot shutdown :', err);
    }

    this.stopAutoSnapshots();
    await this.db.flush();

    this.intellectus.arcadius.emit('system:save:shutdown', {
      snapshotsTotal: this.snapshots.length,
    }, 'SaveSystem');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CRÉATION DE SNAPSHOT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crée un snapshot complet.
   * Verrouillé : un seul snapshot à la fois.
   */
  async createSnapshot(
    type: SnapshotType = 'manual',
    description = '',
    options?: { village?: string; author?: string; tags?: string[] },
  ): Promise<Snapshot> {
    if (!this.isReady) {
      throw new Error('[SaveSystem] Non initialisé — appelez initialize() d\'abord');
    }

    // Attente du verrou précédent
    while (this.snapshotLock) {
      await this.snapshotLock;
    }

    let release!: () => void;
    this.snapshotLock = new Promise((res) => { release = res; });

    const t0 = Date.now();

    try {
      // 1. Sérialise l'état complet via EtherPrismDB
      const raw = this.db.snapshot();
      const rawBytes = byteLength(raw);

      // 2. Compression optionnelle
      let stored = raw;
      if (this.config.compressionEnabled && this.compressor) {
        try {
          stored = await this.compressor.compress(raw);
        } catch (err) {
          console.warn('[SaveSystem] Compression échouée, fallback brut :', err);
          stored = raw;
        }
      }
      const storedBytes = byteLength(stored);

      // 3. Checksum sur la donnée STOCKÉE (ce qui sera relu)
      const checksum = fnv1a64(stored);

      // 4. Métadonnées
      const meta: SnapshotMeta = {
        playersOnline: this.countPlayers(),
        worldEntities: this.countWorldEntities(),
        rawBytes,
        storedBytes,
        schemaVersion: 2,
        village: options?.village,
        author: options?.author ?? 'system',
        tags: options?.tags ?? [],
      };

      // 5. Construit le snapshot
      const snap: Snapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        description: description || this.defaultDescription(type),
        data: stored,
        createdAt: Date.now(),
        checksum,
        meta,
      };

      // 6. Persiste en DB (avec timeout dur)
      await withTimeout(
        this.persistSnapshot(snap),
        this.config.snapshotTimeoutMs,
        `persistSnapshot(${snap.id})`,
      );

      // 7. Ajoute en mémoire (tête de liste)
      this.snapshots.unshift(snap);
      this.stats.snapshotsCreated++;
      this.stats.totalBytesStored += storedBytes;
      this.stats.lastSnapshotMs = Date.now() - t0;
      this.stats.lastSnapshotAt = Date.now();

      // 8. Purge si dépasse les limites
      await this.purge();

      // 9. Flush DB
      await this.db.flush();

      this.intellectus.arcadius.emit('save:snapshot', {
        id: snap.id,
        type: snap.type,
        description: snap.description,
        rawBytes,
        storedBytes,
        durationMs: this.stats.lastSnapshotMs,
        playersOnline: meta.playersOnline,
        village: meta.village,
      }, 'SaveSystem');

      console.log(
        `💾 [SaveSystem] Snapshot ${snap.id} (${type}) — ` +
        `${(rawBytes / 1024).toFixed(1)}KB → ${(storedBytes / 1024).toFixed(1)}KB · ` +
        `${this.stats.lastSnapshotMs}ms`,
      );

      return snap;
    } catch (err) {
      this.stats.snapshotsFailed++;
      console.error('[SaveSystem] Échec création snapshot :', err);
      this.intellectus.arcadius.emit('save:snapshot:failed', { type, error: String(err) }, 'SaveSystem');
      throw err;
    } finally {
      this.snapshotLock = null;
      release();
    }
  }

  private defaultDescription(type: SnapshotType): string {
    switch (type) {
      case 'auto': return 'Auto-save périodique';
      case 'scheduled': return 'Snapshot planifié';
      case 'manual': return 'Sauvegarde manuelle';
      case 'shutdown': return 'Arrêt serveur';
      case 'checkpoint': return 'Point de contrôle';
      default: return 'Sauvegarde';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RESTAURATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Restaure l'état du monde à partir d'un snapshot.
   * ⚠️ Opération destructive : écrase l'état courant.
   */
  async restoreSnapshot(snapshotId: string): Promise<{ success: boolean; message: string }> {
    const snap = this.snapshots.find((s) => s.id === snapshotId);
    if (!snap) return { success: false, message: 'Snapshot introuvable' };

    // Vérification d'intégrité
    const expected = fnv1a64(snap.data);
    if (expected !== snap.checksum) {
      this.stats.checksumErrors++;
      console.error(`[SaveSystem] Checksum invalide pour ${snap.id}`);
      this.intellectus.arcadius.emit('save:restore:corrupt', {
        id: snapshotId, expected, actual: expected,
      }, 'SaveSystem');
      return { success: false, message: 'Corruption détectée — restauration refusée' };
    }

    try {
      // Décompresse si nécessaire
      let payload = snap.data;
      if (this.config.compressionEnabled && this.compressor) {
        payload = await this.compressor.decompress(snap.data);
      }

      // Applique via EtherPrismDB
      await this.db.restore(payload);
      await this.db.flush();

      this.stats.snapshotsRestored++;
      this.stats.lastRestoreAt = Date.now();

      this.intellectus.arcadius.emit('save:restore', {
        id: snap.id,
        type: snap.type,
        createdAt: snap.createdAt,
      }, 'SaveSystem');

      console.log(`💾 [SaveSystem] Restauration effectuée depuis ${snap.id}`);
      return { success: true, message: `Restauration OK (${snap.id})` };
    } catch (err) {
      console.error('[SaveSystem] Échec restauration :', err);
      return { success: false, message: String(err) };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SAVE DIRECT (compat v1)
  // ─────────────────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    await this.db.flush();
    this.intellectus.arcadius.emit('save:flushed', {
      at: Date.now(),
      snapshotsTotal: this.snapshots.length,
    }, 'SaveSystem');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PERSISTANCE DES SNAPSHOTS EN DB
  // ─────────────────────────────────────────────────────────────────────────

  private async persistSnapshot(snap: Snapshot): Promise<void> {
    // Tente une API dédiée si EtherPrismDB l'expose
    const dbAny = this.db as unknown as {
      saveSnapshot?: (s: Snapshot) => Promise<void>;
      loadSnapshots?: () => Promise<Snapshot[]>;
      deleteSnapshot?: (id: string) => Promise<void>;
    };

    if (typeof dbAny.saveSnapshot === 'function') {
      await dbAny.saveSnapshot(snap);
      return;
    }

    // Fallback : stocke dans un sous-état JSON
    if (typeof (this.db as any).setState === 'function') {
      (this.db as any).setState(`snapshots.${snap.id}`, snap);
    }
  }

  private async loadSnapshotsFromDb(): Promise<void> {
    const dbAny = this.db as unknown as {
      loadSnapshots?: () => Promise<Snapshot[]>;
      getState?: (key: string) => any;
    };

    try {
      if (typeof dbAny.loadSnapshots === 'function') {
        const loaded = await dbAny.loadSnapshots();
        this.snapshots = (loaded ?? []).sort((a, b) => b.createdAt - a.createdAt);
        return;
      }

      // Fallback
      if (typeof dbAny.getState === 'function') {
        const bag = dbAny.getState('snapshots') ?? {};
        this.snapshots = Object.values(bag as Record<string, Snapshot>)
          .sort((a, b) => b.createdAt - a.createdAt);
      }
    } catch (err) {
      console.warn('[SaveSystem] Impossible de charger les snapshots :', err);
      this.snapshots = [];
    }
  }

  private async deleteSnapshotFromDb(id: string): Promise<void> {
    const dbAny = this.db as unknown as {
      deleteSnapshot?: (id: string) => Promise<void>;
    };
    if (typeof dbAny.deleteSnapshot === 'function') {
      await dbAny.deleteSnapshot(id);
      return;
    }
    if (typeof (this.db as any).deleteState === 'function') {
      (this.db as any).deleteState(`snapshots.${id}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ROTATION & PURGE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Applique la politique de rétention :
   *  - maxSnapshots (count)
   *  - maxAgeMs (âge)
   *  - maxTotalBytes (taille cumulée)
   * Protège toujours le snapshot le plus récent.
   */
  async purge(): Promise<number> {
    if (this.snapshots.length === 0) return 0;

    const now = Date.now();
    const toDelete: Snapshot[] = [];
    let kept: Snapshot[] = [];
    let cumulativeBytes = 0;

    // Tri : plus récent d'abord
    const sorted = [...this.snapshots].sort((a, b) => b.createdAt - a.createdAt);

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const isNewest = i === 0;
      const tooOld = now - s.createdAt > this.config.maxAgeMs;
      const overCount = kept.length >= this.config.maxSnapshots;
      const overBytes = cumulativeBytes + s.meta.storedBytes > this.config.maxTotalBytes;

      // Le plus récent n'est JAMAIS purgé
      if (!isNewest && (tooOld || overCount || overBytes)) {
        toDelete.push(s);
        continue;
      }

      kept.push(s);
      cumulativeBytes += s.meta.storedBytes;
    }

    // Suppression DB + mémoire
    for (const s of toDelete) {
      try {
        await this.deleteSnapshotFromDb(s.id);
      } catch (err) {
        console.warn(`[SaveSystem] Purge DB échouée pour ${s.id} :`, err);
      }
    }

    this.snapshots = kept;
    this.stats.snapshotsPurged += toDelete.length;
    this.stats.totalBytesStored = cumulativeBytes;

    if (toDelete.length > 0) {
      this.intellectus.arcadius.emit('save:purged', {
        count: toDelete.length,
        remaining: kept.length,
        totalBytes: cumulativeBytes,
      }, 'SaveSystem');
    }

    return toDelete.length;
  }

  /** Purge manuelle ciblée par tag (utile admin) */
  async purgeByTag(tag: string): Promise<number> {
    const toDelete = this.snapshots.filter(
      (s) => s.meta.tags?.includes(tag) && s !== this.snapshots[0],
    );
    for (const s of toDelete) {
      try { await this.deleteSnapshotFromDb(s.id); } catch { /* ignore */ }
    }
    const ids = new Set(toDelete.map((s) => s.id));
    this.snapshots = this.snapshots.filter((s) => !ids.has(s.id));
    this.stats.snapshotsPurged += toDelete.length;

    this.intellectus.arcadius.emit('save:purged:tag', { tag, count: toDelete.length }, 'SaveSystem');
    return toDelete.length;
  }

  /** Purge par type (ex: supprimer tous les 'auto') */
  async purgeByType(type: SnapshotType): Promise<number> {
    const toDelete = this.snapshots.filter(
      (s) => s.type === type && s !== this.snapshots[0],
    );
    for (const s of toDelete) {
      try { await this.deleteSnapshotFromDb(s.id); } catch { /* ignore */ }
    }
    const ids = new Set(toDelete.map((s) => s.id));
    this.snapshots = this.snapshots.filter((s) => !ids.has(s.id));
    this.stats.snapshotsPurged += toDelete.length;

    this.intellectus.arcadius.emit('save:purged:type', { type, count: toDelete.length }, 'SaveSystem');
    return toDelete.length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  AUTO-SNAPSHOT SCHEDULER
  // ─────────────────────────────────────────────────────────────────────────

  private startAutoSnapshots(): void {
    if (this.autoSnapshotTimer) return;
    this.autoSnapshotTimer = setInterval(async () => {
      try {
        await this.createSnapshot('scheduled', '', {
          tags: ['auto', 'scheduled'],
        });
      } catch (err) {
        console.error('[SaveSystem] Auto-snapshot échoué :', err);
      }
    }, this.config.autoSnapshotIntervalMs);

    // Empêche le timer de bloquer l'exit Node
    if (this.autoSnapshotTimer.unref) this.autoSnapshotTimer.unref();
  }

  private stopAutoSnapshots(): void {
    if (this.autoSnapshotTimer) {
      clearInterval(this.autoSnapshotTimer);
      this.autoSnapshotTimer = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  HELPERS INTERNES
  // ─────────────────────────────────────────────────────────────────────────

  private countPlayers(): number {
    try {
      const memory = (this.intellectus as any).memory;
      if (memory?.values) {
        return (memory.values('players') ?? []).length;
      }
    } catch { /* ignore */ }
    return 0;
  }

  private countWorldEntities(): number {
    try {
      const memory = (this.intellectus as any).memory;
      if (memory?.values) {
        const bags = ['world_doors', 'world_containers', 'owned_vehicles', 'owned_properties'];
        return bags.reduce((sum, bag) => sum + (memory.values(bag) ?? []).length, 0);
      }
    } catch { /* ignore */ }
    return 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  API PUBLIQUE — GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  getSnapshots(): Snapshot[] {
    return this.snapshots;
  }

  getSnapshotsByType(type: SnapshotType): Snapshot[] {
    return this.snapshots.filter((s) => s.type === type);
  }

  getSnapshotsByTag(tag: string): Snapshot[] {
    return this.snapshots.filter((s) => s.meta.tags?.includes(tag));
  }

  getSnapshot(id: string): Snapshot | null {
    return this.snapshots.find((s) => s.id === id) ?? null;
  }

  getLatestSnapshot(): Snapshot | null {
    return this.snapshots[0] ?? null;
  }

  getStats() {
    return {
      ...this.stats,
      snapshotsInMemory: this.snapshots.length,
      isReady: this.isReady,
      isLocked: this.snapshotLock !== null,
      autoSnapshotsActive: this.autoSnapshotTimer !== null,
      config: this.config,
    };
  }

  health(): { ok: boolean; reason?: string } {
    if (!this.isReady) return { ok: false, reason: 'not_initialized' };
    if (this.stats.checksumErrors > 50) return { ok: false, reason: 'checksum_errors' };
    if (this.snapshots.length === 0) return { ok: true, reason: 'no_snapshots_yet' };
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CONFIG DYNAMIQUE
  // ─────────────────────────────────────────────────────────────────────────

  updateConfig(patch: Partial<SaveSystemConfig>): void {
    const prevAuto = this.config.autoSnapshotIntervalMs;
    this.config = { ...this.config, ...patch };

    // Redémarre le scheduler si l'intervalle a changé
    if (patch.autoSnapshotIntervalMs !== undefined && patch.autoSnapshotIntervalMs !== prevAuto) {
      this.stopAutoSnapshots();
      if (patch.autoSnapshotIntervalMs > 0) this.startAutoSnapshots();
    }

    this.intellectus.arcadius.emit('save:config:updated', { config: this.config }, 'SaveSystem');
  }
}