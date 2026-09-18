/**
 * ═══════════════════════════════════════════════════════════════════
 * 🗺️ PORTNEUF GEO — GÉOGRAPHIE SERVEUR MRC DE PORTNEUF (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * Autorité serveur des zones RP · Anti-triche géographique · Audit ·
 * Telemetry · Dispatch EMS/SQ par zone · Périmètre carcéral actif.
 *
 * ─── Sources de vérité ───
 * • src/game/zones.ts     → ZoneSystem, buildPortneufZones, RPZone, …
 * • src/game/worlddata.ts → WORLD, PRISON, SQ_JAIL, VILLAGES, POIS, …
 *
 * ─── Compat ───
 * 100% v1 : PortneufGeoServer, registerPortneufGeo, toutes les méthodes.
 * ═══════════════════════════════════════════════════════════════════
 */

import {
  ZoneSystem,
  buildPortneufZones,
  RPZone,
  ZoneRules,
  ZoneViolation,
  getZoneRules,
  ZoneType,
} from "../../src/game/zones";

import {
  WORLD,
  RIVER_Z,
  A40_Z,
  PRISON,
  SQ_JAIL,
  VILLAGES,
  POIS,
  A40_EXITS,
} from "../../src/game/worlddata";

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES & CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface PortneufGeoState {
  zoneSystem: ZoneSystem;
  worldBounds: typeof WORLD;
  prisonPerimeter: typeof PRISON;
  a40Z: number;
  riverZ: number;
}

export interface PortneufGeoConfig {
  /** Intervalle min entre deux updates de position (ms). */
  positionThrottleMs: number;
  /** Distance max en une frame avant flag téléportation (mètres). */
  teleportThreshold: number;
  /** Multiplicateur max de la vitesse limite avant flag speed hack. */
  speedHackMultiplier: number;
  /** Distance max hors du monde avant flag out-of-bounds (mètres). */
  outOfBoundsTolerance: number;
  /** Nombre de violations avant flag "suspicious player". */
  violationsForFlag: number;
  /** Nombre de violations avant auto-report admin. */
  violationsForEscalation: number;
  /** Rayon du périmètre carcéral (mètres). */
  prisonRadius: number;
  /** Active l'anti-triche. */
  antiCheatEnabled: boolean;
  /** Active l'audit trail. */
  auditEnabled: boolean;
  /** Active la telemetry heat map. */
  telemetryEnabled: boolean;
  /** Taille de l'historique par joueur. */
  historySize: number;
}

const DEFAULT_CONFIG: PortneufGeoConfig = {
  positionThrottleMs: 250,
  teleportThreshold: 50,             // 50m en 1 tick = sus
  speedHackMultiplier: 2.5,          // 2.5× la limite zone = flag
  outOfBoundsTolerance: 100,
  violationsForFlag: 5,
  violationsForEscalation: 15,
  prisonRadius: 65,
  antiCheatEnabled: true,
  auditEnabled: true,
  telemetryEnabled: true,
  historySize: 20,
};

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES INTERNES
// ═══════════════════════════════════════════════════════════════════════════

interface PlayerPositionSample {
  x: number;
  z: number;
  y: number;
  timestamp: number;
  zoneId: string | null;
}

export type SuspiciousFlag =
  | "teleport"
  | "speed_hack"
  | "out_of_bounds"
  | "prison_breach"
  | "safe_zone_violation"
  | "curfew_violation"
  | "weapon_violation";

export interface PlayerGeoRecord {
  playerId: string;
  lastPosition: [number, number, number];
  lastUpdateAt: number;
  lastZoneId: string | null;
  history: PlayerPositionSample[];
  violations: number;
  suspiciousFlags: Map<SuspiciousFlag, number>;
  flagged: boolean;
  escalated: boolean;
  firstSeenAt: number;
}

export interface AuditEntry {
  id: string;
  playerId: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface ZoneHeatCell {
  zoneId: string;
  playersCount: number;
  violationsCount: number;
  lastUpdatedAt: number;
}

export interface EmergencyDispatch {
  target: "police" | "ems" | "fire" | "sq";
  village: string;
  distance: number;
  etaSeconds: number;
}

export interface GeoHealth {
  ok: boolean;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function dist2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * 🆕 Extrait le world bounds en coordonnées exploitables.
 * Tolère les structures `{ min, max }` ou `{ minX, maxX, minZ, maxZ }`.
 */
function extractWorldBounds(bounds: any): {
  minX: number; maxX: number; minZ: number; maxZ: number;
} {
  if (!bounds) return { minX: -2000, maxX: 2000, minZ: -1500, maxZ: 500 };
  if (typeof bounds.minX === "number") {
    return {
      minX: bounds.minX, maxX: bounds.maxX,
      minZ: bounds.minZ, maxZ: bounds.maxZ,
    };
  }
  if (bounds.min && bounds.max) {
    return {
      minX: bounds.min[0] ?? -2000, maxX: bounds.max[0] ?? 2000,
      minZ: bounds.min[2] ?? -1500, maxZ: bounds.max[2] ?? 500,
    };
  }
  return { minX: -2000, maxX: 2000, minZ: -1500, maxZ: 500 };
}

/**
 * 🆕 Liste des villages triés par distance — pour dispatch EMS/SQ.
 */
function villagesByDistance(x: number, z: number): Array<{ name: string; x: number; z: number; dist: number }> {
  const villages = (VILLAGES as any[]) ?? [];
  const out = villages.map((v: any) => {
    const vx = v.pos?.[0] ?? v.x ?? v.center?.[0] ?? 0;
    const vz = v.pos?.[2] ?? v.z ?? v.center?.[1] ?? 0;
    return {
      name: v.name ?? "Inconnu",
      x: vx,
      z: vz,
      dist: dist2D(x, z, vx, vz),
    };
  });
  out.sort((a, b) => a.dist - b.dist);
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
//  PORTNEUF GEO SERVER — v2
// ═══════════════════════════════════════════════════════════════════════════

export class PortneufGeoServer {
  public zoneSystem: ZoneSystem;
  public config: PortneufGeoConfig;

  private core: any;
  private worldBoundsCoords: { minX: number; maxX: number; minZ: number; maxZ: number };

  // État par joueur
  private players = new Map<string, PlayerGeoRecord>();

  // Audit
  private auditLog: AuditEntry[] = [];
  private readonly AUDIT_MAX = 5000;

  // Heat map
  private heatMap = new Map<string, ZoneHeatCell>();

  // Hooks installés
  private installedHooks: Array<() => void> = [];
  private initialized = false;
  private disposed = false;

  private stats = {
    positionUpdates: 0,
    throttledUpdates: 0,
    zoneTransitions: 0,
    teleportsDetected: 0,
    speedHacksDetected: 0,
    outOfBoundsDetected: 0,
    prisonBreaches: 0,
    safeZoneViolations: 0,
    curfewViolations: 0,
    weaponViolations: 0,
    autoArrests: 0,
    dispatches: 0,
    escalations: 0,
  };

  constructor(core?: any, config: Partial<PortneufGeoConfig> = {}) {
    this.core = core;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Source d'autorité unique : le même constructeur de zones que le client
    this.zoneSystem = new ZoneSystem(buildPortneufZones());

    this.worldBoundsCoords = extractWorldBounds(WORLD);
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════════════════════════

  public initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Init heat map avec toutes les zones connues
    this.initHeatMap();

    console.log(
      `🗺️ [PortneufGeo] v2.0 · antiCheat=${this.config.antiCheatEnabled ? "ON" : "OFF"} · ` +
      `audit=${this.config.auditEnabled ? "ON" : "OFF"} · ` +
      `telemetry=${this.config.telemetryEnabled ? "ON" : "OFF"}`,
    );
  }

  private initHeatMap(): void {
    const zones = (this.zoneSystem as any).getAllZones?.() ?? [];
    for (const zone of zones) {
      this.heatMap.set(zone.id, {
        zoneId: zone.id,
        playersCount: 0,
        violationsCount: 0,
        lastUpdatedAt: Date.now(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HOOKS SERVEUR (Colyseus core)
  // ═══════════════════════════════════════════════════════════

  registerHooks(): void {
    if (!this.core || !this.core.on) return;

    // Position updates (throttlé)
    const offPosition = this.core.on(
      "player:position",
      (playerId: string, pos: [number, number, number]) => {
        this.onPlayerPosition(playerId, pos);
      },
    );
    if (typeof offPosition === "function") this.installedHooks.push(offPosition);

    // Déconnexion
    const offLeave = this.core.on("player:leave", (playerId: string) => {
      this.onPlayerLeave(playerId);
    });
    if (typeof offLeave === "function") this.installedHooks.push(offLeave);

    // Reconnexion (restauration de zone)
    const offJoin = this.core.on("player:join", (playerId: string) => {
      this.onPlayerJoin(playerId);
    });
    if (typeof offJoin === "function") this.installedHooks.push(offJoin);
  }

  private onPlayerPosition(playerId: string, pos: [number, number, number]): void {
    if (this.disposed) return;

    const now = Date.now();
    let record = this.players.get(playerId);

    if (!record) {
      record = this.createPlayerRecord(playerId, pos);
    }

    // Throttle
    if (now - record.lastUpdateAt < this.config.positionThrottleMs) {
      this.stats.throttledUpdates++;
      return;
    }

    this.stats.positionUpdates++;

    // Anti-triche
    if (this.config.antiCheatEnabled) {
      this.runAntiCheat(record, pos, now);
    }

    // Historique
    this.pushHistory(record, pos, now);

    // Update zone
    const prevZoneId = record.lastZoneId;
    const zone = this.getZoneAtSafe(pos[0], pos[2], pos[1]);
    const nextZoneId = zone?.id ?? null;

    if (prevZoneId !== nextZoneId) {
      this.stats.zoneTransitions++;
      this.audit("zone_transition", playerId, {
        from: prevZoneId,
        to: nextZoneId,
        position: pos,
      });
    }

    record.lastZoneId = nextZoneId;
    record.lastPosition = pos;
    record.lastUpdateAt = now;

    // Update ZoneSystem
    this.zoneSystem.updatePlayerPosition?.(playerId, pos[0], pos[2], pos[1]);

    // Telemetry
    if (this.config.telemetryEnabled) {
      this.updateHeatMap(prevZoneId, nextZoneId);
    }

    // Vérif prison perimeter
    if (this.config.antiCheatEnabled) {
      this.checkPrisonPerimeter(record, pos);
      this.checkSafeZone(record, pos);
    }
  }

  private onPlayerLeave(playerId: string): void {
    const record = this.players.get(playerId);
    if (!record) return;

    this.audit("player_leave", playerId, {
      lastPosition: record.lastPosition,
      lastZoneId: record.lastZoneId,
      violations: record.violations,
    });

    // Décrémente la heat map
    if (this.config.telemetryEnabled && record.lastZoneId) {
      const cell = this.heatMap.get(record.lastZoneId);
      if (cell) {
        cell.playersCount = Math.max(0, cell.playersCount - 1);
        cell.lastUpdatedAt = Date.now();
      }
    }

    this.players.delete(playerId);
  }

  private onPlayerJoin(playerId: string): void {
    // Rien à faire pour l'instant — record créé au premier position update
    // Mais on peut log la reconnexion pour l'audit
    this.audit("player_join", playerId, {});
  }

  private createPlayerRecord(playerId: string, pos: [number, number, number]): PlayerGeoRecord {
    const record: PlayerGeoRecord = {
      playerId,
      lastPosition: pos,
      lastUpdateAt: Date.now(),
      lastZoneId: null,
      history: [],
      violations: 0,
      suspiciousFlags: new Map(),
      flagged: false,
      escalated: false,
      firstSeenAt: Date.now(),
    };
    this.players.set(playerId, record);
    return record;
  }

  private pushHistory(
    record: PlayerGeoRecord,
    pos: [number, number, number],
    ts: number,
  ): void {
    record.history.push({
      x: pos[0],
      y: pos[1],
      z: pos[2],
      timestamp: ts,
      zoneId: record.lastZoneId,
    });
    if (record.history.length > this.config.historySize) {
      record.history.shift();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ANTI-TRICHE
  // ═══════════════════════════════════════════════════════════

  private runAntiCheat(
    record: PlayerGeoRecord,
    pos: [number, number, number],
    now: number,
  ): void {
    const dt = (now - record.lastUpdateAt) / 1000;
    if (dt <= 0) return;

    const dist = dist2D(record.lastPosition[0], record.lastPosition[2], pos[0], pos[2]);
    const speed = dist / dt; // m/s

    // 1) Téléportation : mouvement > threshold en une frame
    if (dist > this.config.teleportThreshold) {
      this.flagSuspicious(record, "teleport", {
        distance: dist,
        from: record.lastPosition,
        to: pos,
      });
    }

    // 2) Speed hack : au-delà de la limite × multiplicateur
    if (speed > 0) {
      const limit = this.getSpeedLimitSafe(pos[0], pos[2]);
      const limitMs = (limit * 1000) / 3600; // km/h → m/s
      const allowedMs = limitMs * this.config.speedHackMultiplier;
      if (speed > allowedMs) {
        this.flagSuspicious(record, "speed_hack", {
          speedMs: Math.round(speed * 100) / 100,
          allowedMs: Math.round(allowedMs * 100) / 100,
          limit,
        });
      }
    }

    // 3) Out of bounds
    const b = this.worldBoundsCoords;
    const tol = this.config.outOfBoundsTolerance;
    if (
      pos[0] < b.minX - tol || pos[0] > b.maxX + tol ||
      pos[2] < b.minZ - tol || pos[2] > b.maxZ + tol
    ) {
      this.flagSuspicious(record, "out_of_bounds", { position: pos });
      this.stats.outOfBoundsDetected++;
    }
  }

  private flagSuspicious(
    record: PlayerGeoRecord,
    flag: SuspiciousFlag,
    details: Record<string, unknown>,
  ): void {
    const count = (record.suspiciousFlags.get(flag) ?? 0) + 1;
    record.suspiciousFlags.set(flag, count);

    // Stats
    if (flag === "teleport") this.stats.teleportsDetected++;
    else if (flag === "speed_hack") this.stats.speedHacksDetected++;

    // Audit
    this.audit(`suspicious:${flag}`, record.playerId, {
      count,
      ...details,
    });

    // Flag ?
    if (!record.flagged && count >= this.config.violationsForFlag) {
      record.flagged = true;
      this.audit("player_flagged", record.playerId, {
        flag,
        totalOccurrences: count,
      });
      this.emitCore("player:geo:flagged", {
        playerId: record.playerId,
        flag,
        count,
        details,
      });
    }

    // Escalation ?
    if (!record.escalated && count >= this.config.violationsForEscalation) {
      record.escalated = true;
      this.stats.escalations++;
      this.audit("player_escalated", record.playerId, {
        flag,
        totalOccurrences: count,
      });
      this.emitCore("player:geo:escalated", {
        playerId: record.playerId,
        flag,
        count,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PRISON PERIMETER
  // ═══════════════════════════════════════════════════════════

  private checkPrisonPerimeter(
    record: PlayerGeoRecord,
    pos: [number, number, number],
  ): void {
    // Si le joueur est DANS la prison, pas de check
    if (this.isInsidePrisonPerimeter(pos[0], pos[2])) return;

    // Si le joueur vient de sortir du périmètre alors qu'il était marqué comme détenu
    // → hypothétiquement un escape. L'intégration avec le JusticeSystem décidera.
    // Ici on log juste les franchissements répétés.
    const prev = record.history[record.history.length - 2];
    if (!prev) return;

    const wasInside = this.isInsidePrisonPerimeter(prev.x, prev.z);
    const isInside = this.isInsidePrisonPerimeter(pos[0], pos[2]);

    if (wasInside && !isInside) {
      this.stats.prisonBreaches++;
      this.audit("prison_exit", record.playerId, { position: pos });
      this.emitCore("player:geo:prison_exit", {
        playerId: record.playerId,
        position: pos,
      });
    }
  }

  /**
   * 🆕 Force le confinement carcéral d'un joueur (auto-arrest hook).
   * Appelé par le JusticeSystem ou manuellement.
   */
  public enforcePrisonArrest(playerId: string, reason = "escape"): void {
    this.stats.autoArrests++;
    this.audit("auto_arrest", playerId, { reason });
    this.emitCore("player:geo:arrested", {
      playerId,
      reason,
      prison: { ...PRISON },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SAFE ZONE ENFORCEMENT
  // ═══════════════════════════════════════════════════════════

  private checkSafeZone(
    record: PlayerGeoRecord,
    pos: [number, number, number],
  ): void {
    const zone = this.getZoneAtSafe(pos[0], pos[2], pos[1]);
    if (!zone) return;

    const rules = (zone as any).rules as ZoneRules | undefined;
    const isSafe = rules?.isSafeZone ?? (rules as any)?.safeZone ?? false;

    if (isSafe) {
      // On est dans une safe zone → arme interdite, combat interdit
      this.emitCore("player:geo:safe_zone_enter", {
        playerId: record.playerId,
        zoneId: zone.id,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // EMERGENCY DISPATCH ROUTING
  // ═══════════════════════════════════════════════════════════

  /**
   * 🆕 Calcule le dispatch d'urgence le plus proche d'une position.
   * Utilise VILLAGES pour trouver la caserne / poste le plus proche.
   */
  public findNearestEmergencyDispatch(
    x: number,
    z: number,
    target: EmergencyDispatch["target"] = "police",
  ): EmergencyDispatch | null {
    const sorted = villagesByDistance(x, z);
    if (sorted.length === 0) return null;

    const nearest = sorted[0];
    const speedKmh = target === "ems" ? 80 : target === "fire" ? 70 : 90;
    const speedMs = (speedKmh * 1000) / 3600;
    const etaSeconds = Math.round(nearest.dist / speedMs);

    this.stats.dispatches++;
    this.audit("dispatch", "system", {
      target,
      village: nearest.name,
      distance: Math.round(nearest.dist),
      etaSeconds,
      from: [x, z],
    });

    return {
      target,
      village: nearest.name,
      distance: Math.round(nearest.dist),
      etaSeconds,
    };
  }

  /**
   * 🆕 Retourne la zone EMS/SQ compétente pour une position.
   */
  public getResponsibleJurisdiction(x: number, z: number): string | null {
    const sorted = villagesByDistance(x, z);
    return sorted[0]?.name ?? null;
  }

  // ═══════════════════════════════════════════════════════════
  // TELEMETRY / HEAT MAP
  // ═══════════════════════════════════════════════════════════

  private updateHeatMap(prevZoneId: string | null, nextZoneId: string | null): void {
    if (prevZoneId && prevZoneId !== nextZoneId) {
      const prevCell = this.heatMap.get(prevZoneId);
      if (prevCell) {
        prevCell.playersCount = Math.max(0, prevCell.playersCount - 1);
        prevCell.lastUpdatedAt = Date.now();
      }
    }
    if (nextZoneId && prevZoneId !== nextZoneId) {
      let cell = this.heatMap.get(nextZoneId);
      if (!cell) {
        cell = {
          zoneId: nextZoneId,
          playersCount: 0,
          violationsCount: 0,
          lastUpdatedAt: Date.now(),
        };
        this.heatMap.set(nextZoneId, cell);
      }
      cell.playersCount++;
      cell.lastUpdatedAt = Date.now();
    }
  }

  /** 🆕 Snapshot de la heat map (dashboard admin). */
  public getHeatMap(): ZoneHeatCell[] {
    return Array.from(this.heatMap.values()).sort(
      (a, b) => b.playersCount - a.playersCount,
    );
  }

  /** 🆕 Zone la plus chaude (peak concurrency). */
  public getHottestZone(): ZoneHeatCell | null {
    let best: ZoneHeatCell | null = null;
    for (const cell of this.heatMap.values()) {
      if (!best || cell.playersCount > best.playersCount) best = cell;
    }
    return best;
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIT
  // ═══════════════════════════════════════════════════════════

  private audit(
    action: string,
    playerId: string,
    details: Record<string, unknown>,
  ): void {
    if (!this.config.auditEnabled) return;

    this.auditLog.push({
      id: `geo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      playerId,
      action,
      details,
      timestamp: Date.now(),
    });

    if (this.auditLog.length > this.AUDIT_MAX) {
      this.auditLog = this.auditLog.slice(-this.AUDIT_MAX);
    }
  }

  public getAuditLog(limit = 100): AuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  public getAuditForPlayer(playerId: string, limit = 50): AuditEntry[] {
    return this.auditLog.filter((a) => a.playerId === playerId).slice(-limit);
  }

  // ═══════════════════════════════════════════════════════════
  // CORE EMIT (safe)
  // ═══════════════════════════════════════════════════════════

  private emitCore(event: string, payload: any): void {
    try {
      this.core?.emit?.(event, payload);
      this.core?.broadcast?.(event, payload);
    } catch (err) {
      console.error(`[PortneufGeo] Emit ${event} failed:`, err);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // AUTORITÉ GÉOGRAPHIQUE (v1 + safe versions)
  // ═══════════════════════════════════════════════════════════

  getZoneAt(x: number, z: number, y?: number): RPZone {
    return this.getZoneAtSafe(x, z, y) as RPZone;
  }

  private getZoneAtSafe(x: number, z: number, y?: number): RPZone | null {
    try {
      const zone = (this.zoneSystem as any).getAt?.(x, z, y);
      if (zone) return zone;
      // Fallback : méthodes alternatives
      const alt = (this.zoneSystem as any).getDominantZoneAt?.(x, z);
      if (alt) return alt;
      const alt2 = (this.zoneSystem as any).getZoneAt?.(x, z);
      return alt2 ?? null;
    } catch {
      return null;
    }
  }

  getCircleAt(x: number, z: number): RPZone {
    return (this.zoneSystem as any).getCircleAt?.(x, z) ?? this.getZoneAt(x, z);
  }

  isSafeZone(x: number, z: number): boolean {
    const zone = this.getZoneAtSafe(x, z);
    if (!zone) return false;
    const rules = (zone as any).rules as ZoneRules | undefined;
    return rules?.isSafeZone ?? (rules as any)?.safeZone ?? false;
  }

  getSpeedLimit(x: number, z: number): number {
    return this.getSpeedLimitSafe(x, z);
  }

  private getSpeedLimitSafe(x: number, z: number): number {
    const zone = this.getZoneAtSafe(x, z);
    if (!zone) return 90;
    const rules = (zone as any).rules as ZoneRules | undefined;
    return rules?.speedLimit ?? 90;
  }

  isWeaponAllowed(x: number, z: number, permits: any[] = []): boolean {
    try {
      const result = (this.zoneSystem as any).isWeaponAllowed?.(x, z, permits);
      if (typeof result === "boolean") return result;
    } catch { /* noop */ }
    const zone = this.getZoneAtSafe(x, z);
    const rules = (zone as any)?.rules;
    return rules?.allowWeapons ?? !rules?.isSafeZone;
  }

  isHarvestAllowed(x: number, z: number, permits: any[] = []): boolean {
    try {
      const result = (this.zoneSystem as any).isHarvestAllowed?.(x, z, permits);
      if (typeof result === "boolean") return result;
    } catch { /* noop */ }
    const zone = this.getZoneAtSafe(x, z);
    return !!(zone as any)?.rules?.allowHarvest;
  }

  isFishingAllowed(x: number, z: number, permits: any[] = []): boolean {
    try {
      const result = (this.zoneSystem as any).isFishingAllowed?.(x, z, permits);
      if (typeof result === "boolean") return result;
    } catch { /* noop */ }
    const zone = this.getZoneAtSafe(x, z);
    return !!(zone as any)?.rules?.allowFishing;
  }

  isCurfewRespected(x: number, z: number, hour: number): boolean {
    try {
      const result = (this.zoneSystem as any).isCurfewRespected?.(x, z, hour);
      if (typeof result === "boolean") return result;
    } catch { /* noop */ }
    const zone = this.getZoneAtSafe(x, z);
    const rules: any = (zone as any)?.rules;
    if (!rules?.curfewStart) return true;
    const start = rules.curfewStart as number;
    const end = rules.curfewEnd as number;
    const h = ((hour % 24) + 24) % 24;
    const isNight = start <= end ? h >= start && h < end : h >= start || h < end;
    return !isNight;
  }

  isInsidePrisonPerimeter(x: number, z: number): boolean {
    const d = dist2D(x, z, PRISON.x, PRISON.z);
    return d <= this.config.prisonRadius;
  }

  getPlayerZone(playerId: string): RPZone | undefined {
    try {
      const result = (this.zoneSystem as any).getPlayerZone?.(playerId);
      if (result) return result;
    } catch { /* noop */ }
    const record = this.players.get(playerId);
    if (!record || !record.lastZoneId) return undefined;
    // Reconstruit la zone depuis l'ID
    const zones = (this.zoneSystem as any).getAllZones?.() ?? [];
    return zones.find((z: RPZone) => z.id === record.lastZoneId);
  }

  recordZoneViolation(
    playerId: string,
    x: number,
    z: number,
    type: ZoneViolation["type"],
    severity: ZoneViolation["severity"],
    fine?: number,
  ): ZoneViolation {
    // Update stats internes
    if (type === "safe_zone") this.stats.safeZoneViolations++;
    else if (type === "curfew") this.stats.curfewViolations++;
    else if (type === "weapon") this.stats.weaponViolations++;

    // Update heat map
    const zone = this.getZoneAtSafe(x, z);
    if (zone && this.config.telemetryEnabled) {
      const cell = this.heatMap.get(zone.id);
      if (cell) {
        cell.violationsCount++;
        cell.lastUpdatedAt = Date.now();
      }
    }

    // Délègue au ZoneSystem
    try {
      const result = (this.zoneSystem as any).recordViolation?.(
        playerId, x, z, type, severity, fine,
      );
      if (result) {
        this.audit("violation_recorded", playerId, {
          type, severity, fine, x, z,
        });
        return result;
      }
    } catch (err) {
      console.error("[PortneufGeo] recordViolation failed:", err);
    }

    // Fallback : objet minimal
    const fallback: any = {
      playerId, x, z, type, severity, fine: fine ?? 0,
      timestamp: Date.now(),
    };
    this.audit("violation_recorded", playerId, fallback);
    return fallback;
  }

  getPlayerViolations(playerId: string): ZoneViolation[] {
    try {
      const result = (this.zoneSystem as any).getPlayerViolations?.(playerId);
      if (Array.isArray(result)) return result;
    } catch { /* noop */ }
    return [];
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN COMMANDS
  // ═══════════════════════════════════════════════════════════

  /** 🆕 Force un joueur à un endroit (téléport admin). */
  public adminForceTeleport(playerId: string, x: number, z: number, y = 0): void {
    const record = this.players.get(playerId);
    if (!record) return;

    record.lastPosition = [x, y, z];
    record.lastUpdateAt = Date.now();

    this.audit("admin_teleport", playerId, { x, y, z });
    this.emitCore("player:geo:admin_teleport", { playerId, position: [x, y, z] });
  }

  /** 🆕 Réinitialise les flags d'un joueur (faux positif). */
  public adminClearFlags(playerId: string): void {
    const record = this.players.get(playerId);
    if (!record) return;

    record.suspiciousFlags.clear();
    record.violations = 0;
    record.flagged = false;
    record.escalated = false;

    this.audit("admin_clear_flags", playerId, {});
  }

  /** 🆕 Applique un config patch à chaud. */
  public updateConfig(patch: Partial<PortneufGeoConfig>): void {
    this.config = { ...this.config, ...patch };
    this.audit("config_updated", "system", { patch });
  }

  // ═══════════════════════════════════════════════════════════
  // DONNÉES DU MONDE (v1 compat)
  // ═══════════════════════════════════════════════════════════

  getWorldBounds() {
    return WORLD;
  }

  getA40Zone() {
    return { z: A40_Z, exits: A40_EXITS };
  }

  getRiverLevel() {
    return RIVER_Z;
  }

  getPrisonLocation() {
    return { ...PRISON, sqJail: SQ_JAIL };
  }

  getZoneStats() {
    try {
      const stats = (this.zoneSystem as any).getStats?.();
      if (stats && typeof stats === "object") return stats;
    } catch { /* noop */ }

    // Fallback : construit un stats minimal depuis notre état
    const zones = (this.zoneSystem as any).getAllZones?.() ?? [];
    return {
      total: zones.length,
      static: zones.length,
      dynamic: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // STATS / HEALTH
  // ═══════════════════════════════════════════════════════════

  public getStats() {
    return {
      ...this.stats,
      playersTracked: this.players.size,
      zonesLoaded: (this.zoneSystem as any).getAllZones?.()?.length ?? 0,
      auditEntries: this.auditLog.length,
      heatCells: this.heatMap.size,
      config: this.config,
    };
  }

  public health(): GeoHealth {
    if (this.disposed) return { ok: false, reason: "disposed" };
    if (!this.initialized) return { ok: false, reason: "not_initialized" };
    if (this.players.size > 5000) return { ok: false, reason: "too_many_players" };
    if (this.auditLog.length >= this.AUDIT_MAX) {
      // Pas bloquant mais on signale
      return { ok: true, reason: "audit_log_full" };
    }
    return { ok: true };
  }

  public getPlayerRecord(playerId: string): PlayerGeoRecord | undefined {
    return this.players.get(playerId);
  }

  public listFlaggedPlayers(): string[] {
    const out: string[] = [];
    for (const [id, rec] of this.players) {
      if (rec.flagged) out.push(id);
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Retire les hooks
    for (const off of this.installedHooks) {
      try { off(); } catch { /* noop */ }
    }
    this.installedHooks = [];

    this.players.clear();
    this.auditLog = [];
    this.heatMap.clear();

    console.log("[PortneufGeo] Serveur géographique libéré.");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  REGISTER (v1 compat + auto-init v2)
// ═══════════════════════════════════════════════════════════════════════════

export function registerPortneufGeo(
  core: any,
  config?: Partial<PortneufGeoConfig>,
): PortneufGeoServer {
  const geo = new PortneufGeoServer(core, config);
  geo.initialize();
  geo.registerHooks();

  const stats = geo.getZoneStats();

  console.log("🗺️ [PortneufGeo] MRC Portneuf enregistrée (serveur autoritaire)", {
    zones: stats.total,
    staticZones: stats.static,
    dynamicZones: stats.dynamic,
    worldBounds: WORLD,
    a40Z: A40_Z,
    riverZ: RIVER_Z,
    prison: PRISON,
    antiCheat: geo.config.antiCheatEnabled,
    throttleMs: geo.config.positionThrottleMs,
  });

  return geo;
}

export default PortneufGeoServer;