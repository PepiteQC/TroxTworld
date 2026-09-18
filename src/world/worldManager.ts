// ═══════════════════════════════════════════════════════════════════════════
//  WORLD MANAGER v2.0 — Orchestrateur monde multi-instance
//  src/world/WorldManager.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Façade haut niveau sur World + WorldNavigator + validation
//  • Multi-world registry (boot + runtime)
//  • Listeners : onWorldChange, onWorldRegistered, onReload
//  • Intégration WorldNavigator (spatial index pré-calculé)
//  • Bounds cachés + stats complètes
//  • History / undo (N derniers mondes)
//  • Persistance sérialisée
//  • Hooks runtime (hot reload, patch partiel)
//  • 100% compat v1 (activeWorldManager, methods identiques)
// ═══════════════════════════════════════════════════════════════════════════

import { World, WorldPos } from './schema/WorldTypes';
import { validateWorld, ValidationReport } from './validateWorld';
import { defaultQuebecWorld } from './worldData';
import {
  findNearestVillage,
  findPOIsNear,
  findSpawnPoint,
} from './worldQuery';
import {
  WorldNavigator,
  type NearbyResult,
  type WorldBounds,
  type WorldStats,
  type NearestRoadResult,
} from './WorldNavigation';

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WorldMeta {
  id: string;
  name: string;
  author: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  description: string;
}

export interface WorldChangeEvent {
  previous: World | null;
  current: World;
  at: number;
  reason: 'boot' | 'switch' | 'reload' | 'patch' | 'manual';
  validation: ValidationReport;
}

export interface WorldManagerConfig {
  /** Taille de la cellule spatial grid du Navigator */
  navCellSize: number;
  /** Taille du cache LRU du Navigator */
  navCacheSize: number;
  /** Nombre max d'entrées d'historique */
  historySize: number;
  /** Auto-validation à chaque changement */
  autoValidate: boolean;
  /** Émet les events arcadius si dispo */
  emitEvents: boolean;
}

const DEFAULT_CONFIG: WorldManagerConfig = {
  navCellSize: 100,
  navCacheSize: 256,
  historySize: 10,
  autoValidate: true,
  emitEvents: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════

function generateWorldId(w: World): string {
  // Utilise un hash basique du nom + nb villages pour ID stable
  const name = (w as any).name ?? 'world';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.abs(hash).toString(36)}`;
}

function nowMs(): number {
  return Date.now();
}

function deepCloneWorld(w: World): World {
  // Clone superficiel structuré — le World contient typiquement des tableaux plats
  return JSON.parse(JSON.stringify(w));
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORLD MANAGER
// ═══════════════════════════════════════════════════════════════════════════

export class WorldManager {
  // ─── État principal ───
  private currentWorld: World;
  private currentMeta: WorldMeta;
  private lastReport: ValidationReport;
  private navigator: WorldNavigator;

  // ─── Registry multi-mondes ───
  private registry = new Map<string, { world: World; meta: WorldMeta }>();

  // ─── History (undo) ───
  private history: Array<{ world: World; meta: WorldMeta; at: number }> = [];

  // ─── Config ───
  private config: WorldManagerConfig;

  // ─── Listeners ───
  private listeners = {
    worldChange: new Set<(e: WorldChangeEvent) => void>(),
    worldRegistered: new Set<(meta: WorldMeta) => void>(),
    reload: new Set<(world: World) => void>(),
  };

  // ─── Stats ───
  private stats = {
    switchesTotal: 0,
    reloadsTotal: 0,
    patchesTotal: 0,
    validationsTotal: 0,
    validationsFailed: 0,
    historySize: 0,
  };

  // ─── Intellectus (optionnel pour events) ───
  private intellectus: any = null;

  constructor(initialWorld?: World, config: Partial<WorldManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.currentWorld = initialWorld ?? defaultQuebecWorld;
    this.currentMeta = this.inferMeta(this.currentWorld);
    this.lastReport = this.runValidation(this.currentWorld);

    this.navigator = new WorldNavigator(this.currentWorld, {
      cellSize: this.config.navCellSize,
      cacheSize: this.config.navCacheSize,
    });

    // Enregistre le monde initial dans le registry
    const id = this.currentMeta.id;
    this.registry.set(id, { world: this.currentWorld, meta: this.currentMeta });
  }

  /**
   * Optionnel : attache Intellectus pour émettre les events système.
   */
  public attachIntellectus(intellectus: any): void {
    this.intellectus = intellectus;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  MÉTA
  // ────────────────────────────────────────────────────────────────────────

  private inferMeta(w: World): WorldMeta {
    return {
      id: generateWorldId(w),
      name: (w as any).name ?? 'Portneuf',
      author: 'TroxTWorld',
      version: '1.0.0',
      createdAt: nowMs(),
      updatedAt: nowMs(),
      tags: ['quebec', 'portneuf', 'rp'],
      description: 'Monde RP Portneuf, Comté de Portneuf, Québec.',
    };
  }

  public getMeta(): WorldMeta {
    return { ...this.currentMeta };
  }

  public setMeta(patch: Partial<WorldMeta>): void {
    this.currentMeta = { ...this.currentMeta, ...patch, updatedAt: nowMs() };
    this.registry.set(this.currentMeta.id, {
      world: this.currentWorld,
      meta: this.currentMeta,
    });
    this.emit('meta:updated', { meta: this.currentMeta });
  }

  // ────────────────────────────────────────────────────────────────────────
  //  VALIDATION
  // ────────────────────────────────────────────────────────────────────────

  private runValidation(w: World): ValidationReport {
    this.stats.validationsTotal++;
    try {
      const report = validateWorld(w);
      if (!report.ok) this.stats.validationsFailed++;
      return report;
    } catch (err) {
      console.error('[WorldManager] Erreur validation :', err);
      this.stats.validationsFailed++;
      return {
        ok: false,
        errors: [String(err)],
        warnings: [],
      } as unknown as ValidationReport;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API PUBLIQUE — v1 compat
  // ────────────────────────────────────────────────────────────────────────

  public getWorld(): World {
    return this.currentWorld;
  }

  public setWorld(world: World, reason: WorldChangeEvent['reason'] = 'manual'): ValidationReport {
    const previous = this.currentWorld;

    // Historique (rollback)
    this.pushHistory(previous);

    // Swap
    this.currentWorld = world;
    this.currentMeta = this.inferMeta(world);
    this.lastReport = this.config.autoValidate ? this.runValidation(world) : { ok: true } as any;

    // Rebuild Navigator
    this.navigator = new WorldNavigator(world, {
      cellSize: this.config.navCellSize,
      cacheSize: this.config.navCacheSize,
    });

    // Registry
    this.registry.set(this.currentMeta.id, {
      world,
      meta: this.currentMeta,
    });

    this.stats.switchesTotal++;

    // Notifie
    const evt: WorldChangeEvent = {
      previous,
      current: world,
      at: nowMs(),
      reason,
      validation: this.lastReport,
    };
    this.listeners.worldChange.forEach((l) => {
      try { l(evt); } catch (err) { console.error('[WorldManager] listener err:', err); }
    });

    this.emit('world:changed', {
      reason,
      worldId: this.currentMeta.id,
      name: this.currentMeta.name,
      valid: this.lastReport.ok,
    });

    return this.lastReport;
  }

  public getValidationReport(): ValidationReport {
    return this.lastReport;
  }

  public isValid(): boolean {
    return this.lastReport.ok;
  }

  public getSpawnPosition(): WorldPos {
    return findSpawnPoint(this.currentWorld);
  }

  public getNearestVillage(pos: WorldPos) {
    return findNearestVillage(this.currentWorld, pos);
  }

  public getNearbyPOIs(pos: WorldPos, radius = 300) {
    return findPOIsNear(this.currentWorld, pos, radius);
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — extensions
  // ────────────────────────────────────────────────────────────────────────

  /** Accès au Navigator (recherches optimisées). */
  public getNavigator(): WorldNavigator {
    return this.navigator;
  }

  /** Bounds du monde courant. */
  public getBounds(): WorldBounds {
    return this.navigator.getBounds();
  }

  /** Stats complètes du monde. */
  public getWorldStats(): WorldStats {
    return this.navigator.getStats();
  }

  /** Top-N villages les plus proches (indexé). */
  public getNearestVillages(pos: WorldPos, n = 3): NearbyResult<any>[] {
    return this.navigator.findNNearestVillages(pos, n);
  }

  /** Route la plus proche (indexé). */
  public getNearestRoad(pos: WorldPos): NearestRoadResult | null {
    return this.navigator.findNearestRoad(pos);
  }

  /** POI d'un type donné. */
  public getNearestPOIByType(pos: WorldPos, type: string, maxRadius = 2000) {
    return this.navigator.findNearestPOIByType(pos, type, maxRadius);
  }

  /** ETA entre deux points. */
  public estimateTravelSeconds(from: WorldPos, to: WorldPos, weather = 'clear'): number {
    return this.navigator.estimateTravelSeconds(from, to, weather);
  }

  /** Clamp une position dans le monde. */
  public clampPos(pos: WorldPos): WorldPos {
    return this.navigator.clampToWorld(pos);
  }

  /** Vérifie si une position est dans le monde. */
  public isInside(pos: WorldPos): boolean {
    return this.navigator.isInsideWorld(pos);
  }

  // ────────────────────────────────────────────────────────────────────────
  //  REGISTRY MULTI-MONDES
  // ────────────────────────────────────────────────────────────────────────

  /** Enregistre un monde dans le registry (sans le charger). */
  public registerWorld(world: World, meta?: Partial<WorldMeta>): WorldMeta {
    const inferred = this.inferMeta(world);
    const full: WorldMeta = { ...inferred, ...meta };
    this.registry.set(full.id, { world, meta: full });

    this.listeners.worldRegistered.forEach((l) => {
      try { l(full); } catch { /* ignore */ }
    });

    this.emit('world:registered', { worldId: full.id, name: full.name });
    return full;
  }

  /** Charge un monde depuis le registry (par id). */
  public loadWorld(id: string): ValidationReport | null {
    const entry = this.registry.get(id);
    if (!entry) {
      console.warn(`[WorldManager] Monde introuvable : ${id}`);
      return null;
    }
    return this.setWorld(entry.world, 'switch');
  }

  /** Liste les mondes enregistrés. */
  public listWorlds(): WorldMeta[] {
    return Array.from(this.registry.values()).map((e) => ({ ...e.meta }));
  }

  /** Supprime un monde du registry (sauf le courant). */
  public unregisterWorld(id: string): boolean {
    if (id === this.currentMeta.id) {
      console.warn('[WorldManager] Impossible de supprimer le monde courant');
      return false;
    }
    return this.registry.delete(id);
  }

  // ────────────────────────────────────────────────────────────────────────
  //  HISTORY / UNDO
  // ────────────────────────────────────────────────────────────────────────

  private pushHistory(world: World): void {
    this.history.push({
      world: deepCloneWorld(world),
      meta: { ...this.currentMeta },
      at: nowMs(),
    });
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
    this.stats.historySize = this.history.length;
  }

  /** Annule le dernier changement de monde. */
  public undo(): boolean {
    const last = this.history.pop();
    if (!last) return false;

    this.currentWorld = last.world;
    this.currentMeta = last.meta;
    this.lastReport = this.runValidation(last.world);

    this.navigator = new WorldNavigator(last.world, {
      cellSize: this.config.navCellSize,
      cacheSize: this.config.navCacheSize,
    });

    this.stats.historySize = this.history.length;
    this.emit('world:undo', { worldId: this.currentMeta.id });
    return true;
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public getHistoryLength(): number {
    return this.history.length;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  PATCH RUNTIME (édition partielle)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Patch le monde courant (ajout/suppression de villages, POIs, routes).
   * Le Navigator est rebuild automatiquement.
   */
  public patchWorld(patch: {
    addVillages?: any[];
    removeVillages?: (id: string) => boolean;
    addPOIs?: any[];
    removePOIs?: (id: string) => boolean;
    addRoads?: any[];
    removeRoads?: (id: string) => boolean;
  }): ValidationReport {
    this.pushHistory(this.currentWorld);

    // Ajout villages
    if (patch.addVillages?.length) {
      this.currentWorld.villages.push(...patch.addVillages);
    }
    // Ajout POIs
    if (patch.addPOIs?.length) {
      this.currentWorld.pois.push(...patch.addPOIs);
    }
    // Ajout routes
    if (patch.addRoads?.length) {
      this.currentWorld.roads.push(...patch.addRoads);
    }
    // Suppression villages
    if (patch.removeVillages) {
      this.currentWorld.villages = this.currentWorld.villages.filter(
        (v) => !patch.removeVillages!((v as any).id ?? ''),
      );
    }
    // Suppression POIs
    if (patch.removePOIs) {
      this.currentWorld.pois = this.currentWorld.pois.filter(
        (p) => !patch.removePOIs!((p as any).id ?? ''),
      );
    }
    // Suppression routes
    if (patch.removeRoads) {
      this.currentWorld.roads = this.currentWorld.roads.filter(
        (r) => !patch.removeRoads!((r as any).id ?? ''),
      );
    }

    // Rebuild Navigator
    this.navigator = new WorldNavigator(this.currentWorld, {
      cellSize: this.config.navCellSize,
      cacheSize: this.config.navCacheSize,
    });

    // Revalidation
    this.lastReport = this.runValidation(this.currentWorld);
    this.stats.patchesTotal++;

    this.emit('world:patched', {
      worldId: this.currentMeta.id,
      valid: this.lastReport.ok,
    });

    return this.lastReport;
  }

  /** Force un rebuild du Navigator sans changer de monde. */
  public reload(): ValidationReport {
    this.navigator = new WorldNavigator(this.currentWorld, {
      cellSize: this.config.navCellSize,
      cacheSize: this.config.navCacheSize,
    });
    this.lastReport = this.runValidation(this.currentWorld);
    this.stats.reloadsTotal++;

    this.listeners.reload.forEach((l) => {
      try { l(this.currentWorld); } catch { /* ignore */ }
    });

    this.emit('world:reloaded', {
      worldId: this.currentMeta.id,
      valid: this.lastReport.ok,
    });

    return this.lastReport;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  LISTENERS
  // ────────────────────────────────────────────────────────────────────────

  public onWorldChange(cb: (e: WorldChangeEvent) => void): () => void {
    this.listeners.worldChange.add(cb);
    return () => this.listeners.worldChange.delete(cb);
  }

  public onWorldRegistered(cb: (meta: WorldMeta) => void): () => void {
    this.listeners.worldRegistered.add(cb);
    return () => this.listeners.worldRegistered.delete(cb);
  }

  public onReload(cb: (w: World) => void): () => void {
    this.listeners.reload.add(cb);
    return () => this.listeners.reload.delete(cb);
  }

  // ────────────────────────────────────────────────────────────────────────
  //  PERSISTANCE
  // ────────────────────────────────────────────────────────────────────────

  /** Sérialise le monde courant + meta. */
  public serialize(): string {
    return JSON.stringify({
      world: this.currentWorld,
      meta: this.currentMeta,
    });
  }

  /** Restaure un monde depuis un payload sérialisé. */
  public restore(payload: string): ValidationReport | null {
    try {
      const data = JSON.parse(payload);
      if (!data.world) throw new Error('payload.world manquant');
      this.currentMeta = { ...this.inferMeta(data.world), ...(data.meta ?? {}) };
      return this.setWorld(data.world, 'reload');
    } catch (err) {
      console.error('[WorldManager] Restauration échouée :', err);
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  STATS & DEBUG
  // ────────────────────────────────────────────────────────────────────────

  public getStats() {
    return {
      ...this.stats,
      currentWorldId: this.currentMeta.id,
      currentWorldName: this.currentMeta.name,
      worldsRegistered: this.registry.size,
      villages: this.currentWorld.villages.length,
      pois: this.currentWorld.pois.length,
      roads: this.currentWorld.roads.length,
      valid: this.lastReport.ok,
      navigatorCacheSize: this.navigator.getCacheSize(),
      canUndo: this.canUndo(),
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  ÉVÉNEMENTS ARCADIUS (optionnels)
  // ────────────────────────────────────────────────────────────────────────

  private emit(event: string, payload: Record<string, unknown>): void {
    if (!this.config.emitEvents) return;
    if (!this.intellectus) return;
    try {
      this.intellectus.arcadius?.emit?.(`world:${event}`, payload, 'WorldManager');
    } catch {
      // ignore — le manager ne doit pas crasher si arcadius est absent
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SINGLETON GLOBAL (compat v1)
// ═══════════════════════════════════════════════════════════════════════════

export const activeWorldManager = new WorldManager();

/**
 * Helper : attache Intellectus au singleton global.
 * À appeler dans le boot du serveur si tu veux émettre les events.
 */
export function attachWorldManagerToIntellectus(intellectus: any): void {
  activeWorldManager.attachIntellectus(intellectus);
}