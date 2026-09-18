/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐺 WILDLIFE AI ENGINE v2.0 — IA Faune du comté de Portneuf
 * ───────────────────────────────────────────────────────────────────────────
 *  • 19 espèces supportées (aligne avec wildlife.ts)
 *  • Compat 100% v1 (registerEntity, getEntities, tick)
 *  • Compat 3D manager (getActiveEntities, updateAIBehaviors)
 *  • Multi-joueur (threat context par joueur)
 *  • RNG seedé (reproductibilité)
 *  • Events (kill, flee, chase, vocalize…)
 *  • Attack cooldown (anti-spam damage)
 *  • Retour au home après fuite
 *  • Pack coordination EFFECTIVE
 *  • Stats + Health
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type WildlifeSpecies =
  | "moose" | "wolf" | "bear" | "fox" | "beaver" | "deer"
  | "caribou" | "hare" | "squirrel" | "raccoon" | "goose"
  | "loon" | "heron" | "eagle" | "lynx" | "coyote"
  | "skunk" | "walleye" | "bass";

/** Alias pour compat 3D manager */
export type WildlifeAnimalType = WildlifeSpecies;

export type AIBehaviorState =
  | "idle"
  | "roam"
  | "grazing"
  | "flee"
  | "stalk"
  | "pack_chase"
  | "attack"
  | "dead"
  | "hibernate"
  | "swim"
  | "fly";

export interface WildlifeEntityState {
  id: string;
  species: WildlifeSpecies;
  name: string;
  position: Vector3D;
  velocity: Vector3D;
  rotation: number;
  speed: number;
  health: number;
  maxHealth: number;
  state: AIBehaviorState;
  detectionRadius: number;
  packId?: string;
  isPackAlpha?: boolean;
  targetPosition?: Vector3D;

  // 🆕 v2
  /** Position d'origine (pour retour après fuite) */
  homePosition: Vector3D;
  /** Rayon de territoire autour du home */
  homeRadius: number;
  /** Timestamp dernière attaque (cooldown) */
  lastAttackAt: number;
  /** Timestamp dernière vocalisation */
  lastVocalAt: number;
  /** Timestamp dernière fuite (pour reset après inactivité) */
  fleeingSince: number | null;
  /** Espèce protégée (MFFP) */
  protected: boolean;
  /** Niveau de menace dynamique (0-100) */
  threatLevel: number;
  /** ID du dernier joueur qui a menacé */
  lastThreatenerId: string | null;
}

export interface PlayerThreatContext {
  position: Vector3D;
  isCrouching: boolean;
  isArmed: boolean;
  sirenActive: boolean;
  gunfireActive: boolean;
  playerId?: string;
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — CONFIG
// ═══════════════════════════════════════════════════════════

export interface WildlifeAIConfig {
  seed: number;
  /** Distance max avant culling complet */
  activeRadius: number;
  /** Intervalle minimum entre deux warnings pour le même joueur (ms) */
  warningCooldownMs: number;
  /** Intervalle minimum entre deux attaques (ms) */
  attackCooldownMs: number;
  /** Vitesse multiplicateur global */
  speedMultiplier: number;
  /** Distance pour retour au home après fuite */
  returnHomeThreshold: number;
  /** Pas de home (désactive le retour) */
  disableHomeReturn: boolean;
  /** Multiplicateur crouch detection */
  crouchRadiusMultiplier: number;
  /** Nombre max de warnings retenus par tick */
  maxWarningsPerTick: number;
}

const DEFAULT_CONFIG: WildlifeAIConfig = {
  seed: 4242,
  activeRadius: 400,
  warningCooldownMs: 2500,
  attackCooldownMs: 1200,
  speedMultiplier: 1.0,
  returnHomeThreshold: 5,
  disableHomeReturn: false,
  crouchRadiusMultiplier: 0.5,
  maxWarningsPerTick: 3,
};

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — RNG SEEDÉ
// ═══════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — TABLES PAR ESPÈCE
// ═══════════════════════════════════════════════════════════

interface SpeciesProfile {
  detectionRadius: number;
  fleeSpeed: number;
  chaseSpeed: number;
  stalkSpeed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldownMs: number;
  isPredator: boolean;
  isProtected: boolean;
  homeRadius: number;
  vocalChance: number;
}

const SPECIES_PROFILE: Record<WildlifeSpecies, SpeciesProfile> = {
  moose:    { detectionRadius: 22, fleeSpeed: 9,  chaseSpeed: 11, stalkSpeed: 0,   attackDamage: 22, attackRange: 2.5, attackCooldownMs: 1500, isPredator: false, isProtected: false, homeRadius: 90, vocalChance: 0.02 },
  wolf:     { detectionRadius: 18, fleeSpeed: 8.5, chaseSpeed: 8.2, stalkSpeed: 3.6, attackDamage: 15, attackRange: 1.6, attackCooldownMs: 900,  isPredator: true,  isProtected: false, homeRadius: 120, vocalChance: 0.05 },
  bear:     { detectionRadius: 16, fleeSpeed: 7.5, chaseSpeed: 7.5, stalkSpeed: 3.4, attackDamage: 28, attackRange: 2.0, attackCooldownMs: 1400, isPredator: true,  isProtected: false, homeRadius: 100, vocalChance: 0.03 },
  fox:      { detectionRadius: 14, fleeSpeed: 7.2, chaseSpeed: 7.2, stalkSpeed: 0,   attackDamage: 5,  attackRange: 1.0, attackCooldownMs: 2000, isPredator: false, isProtected: false, homeRadius: 60,  vocalChance: 0.02 },
  beaver:   { detectionRadius: 12, fleeSpeed: 3,  chaseSpeed: 3,   stalkSpeed: 0,   attackDamage: 3,  attackRange: 1.0, attackCooldownMs: 2000, isPredator: false, isProtected: false, homeRadius: 40,  vocalChance: 0.01 },
  deer:     { detectionRadius: 20, fleeSpeed: 10, chaseSpeed: 10,  stalkSpeed: 0,   attackDamage: 4,  attackRange: 1.2, attackCooldownMs: 2000, isPredator: false, isProtected: false, homeRadius: 80,  vocalChance: 0.02 },
  caribou:  { detectionRadius: 22, fleeSpeed: 8,  chaseSpeed: 8,   stalkSpeed: 0,   attackDamage: 6,  attackRange: 1.4, attackCooldownMs: 2000, isPredator: false, isProtected: true,  homeRadius: 100, vocalChance: 0.02 },
  hare:     { detectionRadius: 16, fleeSpeed: 8,  chaseSpeed: 8,   stalkSpeed: 0,   attackDamage: 1,  attackRange: 0.8, attackCooldownMs: 3000, isPredator: false, isProtected: false, homeRadius: 50,  vocalChance: 0.005 },
  squirrel: { detectionRadius: 8,  fleeSpeed: 4,  chaseSpeed: 4,   stalkSpeed: 0,   attackDamage: 1,  attackRange: 0.5, attackCooldownMs: 3000, isPredator: false, isProtected: false, homeRadius: 30,  vocalChance: 0.01 },
  raccoon:  { detectionRadius: 12, fleeSpeed: 3.4,chaseSpeed: 3.4, stalkSpeed: 0,   attackDamage: 2,  attackRange: 0.9, attackCooldownMs: 3000, isPredator: false, isProtected: false, homeRadius: 60,  vocalChance: 0.01 },
  goose:    { detectionRadius: 18, fleeSpeed: 4,  chaseSpeed: 4,   stalkSpeed: 0,   attackDamage: 3,  attackRange: 1.2, attackCooldownMs: 2500, isPredator: false, isProtected: false, homeRadius: 80,  vocalChance: 0.06 },
  loon:     { detectionRadius: 20, fleeSpeed: 4,  chaseSpeed: 4,   stalkSpeed: 0,   attackDamage: 2,  attackRange: 1.0, attackCooldownMs: 3000, isPredator: false, isProtected: true,  homeRadius: 60,  vocalChance: 0.04 },
  heron:    { detectionRadius: 22, fleeSpeed: 5,  chaseSpeed: 5,   stalkSpeed: 0,   attackDamage: 4,  attackRange: 1.5, attackCooldownMs: 2000, isPredator: false, isProtected: false, homeRadius: 80,  vocalChance: 0.02 },
  eagle:    { detectionRadius: 30, fleeSpeed: 4,  chaseSpeed: 4,   stalkSpeed: 0,   attackDamage: 6,  attackRange: 1.5, attackCooldownMs: 3000, isPredator: true,  isProtected: true,  homeRadius: 200, vocalChance: 0.01 },
  lynx:     { detectionRadius: 24, fleeSpeed: 8,  chaseSpeed: 8,   stalkSpeed: 3.8, attackDamage: 20, attackRange: 1.5, attackCooldownMs: 1200, isPredator: true,  isProtected: false, homeRadius: 80,  vocalChance: 0.02 },
  coyote:   { detectionRadius: 20, fleeSpeed: 6,  chaseSpeed: 6,   stalkSpeed: 3.5, attackDamage: 10, attackRange: 1.5, attackCooldownMs: 1000, isPredator: true,  isProtected: false, homeRadius: 90,  vocalChance: 0.03 },
  skunk:    { detectionRadius: 10, fleeSpeed: 2,  chaseSpeed: 2,   stalkSpeed: 0,   attackDamage: 0,  attackRange: 3.5, attackCooldownMs: 8000, isPredator: false, isProtected: false, homeRadius: 40,  vocalChance: 0.005 },
  walleye:  { detectionRadius: 8,  fleeSpeed: 2,  chaseSpeed: 2,   stalkSpeed: 0,   attackDamage: 1,  attackRange: 0.8, attackCooldownMs: 3000, isPredator: false, isProtected: false, homeRadius: 60,  vocalChance: 0 },
  bass:     { detectionRadius: 8,  fleeSpeed: 2,  chaseSpeed: 2,   stalkSpeed: 0,   attackDamage: 1,  attackRange: 0.8, attackCooldownMs: 3000, isPredator: false, isProtected: false, homeRadius: 60,  vocalChance: 0 },
};

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — EVENTS
// ═══════════════════════════════════════════════════════════

export type WildlifeAIEventType =
  | "flee"
  | "chase"
  | "attack"
  | "vocalize"
  | "state_change"
  | "kill"
  | "wound"
  | "spawn";

export interface WildlifeAIEvent {
  type: WildlifeAIEventType;
  entityId: string;
  entityName: string;
  playerId?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — SPATIAL HASH (query rapide)
// ═══════════════════════════════════════════════════════════

const CELL_SIZE = 50;

class SpatialHash {
  private buckets = new Map<string, Set<string>>();

  keyFor(x: number, z: number): string {
    return `${Math.floor(x / CELL_SIZE)}_${Math.floor(z / CELL_SIZE)}`;
  }

  insert(id: string, x: number, z: number): void {
    const k = this.keyFor(x, z);
    let b = this.buckets.get(k);
    if (!b) { b = new Set(); this.buckets.set(k, b); }
    b.add(id);
  }

  remove(id: string, x: number, z: number): void {
    const k = this.keyFor(x, z);
    this.buckets.get(k)?.delete(id);
  }

  query(x: number, z: number, radius: number): string[] {
    const out: string[] = [];
    const r = Math.ceil(radius / CELL_SIZE);
    const gx = Math.floor(x / CELL_SIZE);
    const gz = Math.floor(z / CELL_SIZE);
    const seen = new Set<string>();

    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const b = this.buckets.get(`${gx + dx}_${gz + dz}`);
        if (!b) continue;
        for (const id of b) {
          if (seen.has(id)) continue;
          seen.add(id);
          out.push(id);
        }
      }
    }
    return out;
  }

  clear(): void {
    this.buckets.clear();
  }

  get size(): number {
    return this.buckets.size;
  }
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — ENGINE
// ═══════════════════════════════════════════════════════════

export class WildlifeAIEngine {
  private entities: Map<string, WildlifeEntityState> = new Map();
  private spatial: SpatialHash = new SpatialHash();

  // 🆕 v2
  private config: WildlifeAIConfig;
  private rng: () => number;
  private listeners = new Set<(e: WildlifeAIEvent) => void>();

  // Warning tracking par joueur
  private lastWarningAt: Map<string, number> = new Map();

  // Stats
  private stats = {
    entitiesTotal: 0,
    killsTotal: 0,
    woundsTotal: 0,
    attacksTotal: 0,
    vocalizationsTotal: 0,
    stateChangesTotal: 0,
    lastTickDurationMs: 0,
    avgTickDurationMs: 0,
    tickCount: 0,
  };

  constructor(config: Partial<WildlifeAIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = mulberry32(this.config.seed);
    this.initDefaultQuebecFauna();
  }

  // ─────────────────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────────────────

  onEvent(cb: (e: WildlifeAIEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(
    type: WildlifeAIEventType,
    entity: WildlifeEntityState,
    playerId?: string,
    data?: Record<string, unknown>,
  ): void {
    const evt: WildlifeAIEvent = {
      type,
      entityId: entity.id,
      entityName: entity.name,
      playerId,
      data,
      timestamp: Date.now(),
    };
    for (const cb of this.listeners) {
      try { cb(evt); } catch { /* noop */ }
    }
  }

  // ─────────────────────────────────────────────────────────
  // FAUNE INITIALE (v1 compat + enrichi)
  // ═══════════════════════════════════════════════════════════

  private initDefaultQuebecFauna() {
    // ─── v1 compat ───
    this.registerEntity({
      id: "moose_laurentides_01",
      species: "moose",
      name: "Grand Orignal des Laurentides",
      position: { x: -28, y: 0, z: -25 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0.5,
      speed: 0,
      health: 300,
      maxHealth: 300,
      state: "grazing",
      detectionRadius: 12.0,
      // v2
      homePosition: { x: -28, y: 0, z: -25 },
      homeRadius: 90,
      lastAttackAt: 0,
      lastVocalAt: 0,
      fleeingSince: null,
      protected: false,
      threatLevel: 0,
      lastThreatenerId: null,
    });

    this.registerEntity({
      id: "wolf_alpha_01",
      species: "wolf",
      name: "Loup Alpha de Portneuf",
      position: { x: -20, y: 0, z: -35 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 2.1,
      speed: 0,
      health: 120,
      maxHealth: 120,
      state: "stalk",
      detectionRadius: 15.0,
      packId: "pack_portneuf",
      isPackAlpha: true,
      homePosition: { x: -20, y: 0, z: -35 },
      homeRadius: 120,
      lastAttackAt: 0,
      lastVocalAt: 0,
      fleeingSince: null,
      protected: false,
      threatLevel: 0,
      lastThreatenerId: null,
    });

    this.registerEntity({
      id: "wolf_beta_01",
      species: "wolf",
      name: "Loup Bêta de Portneuf",
      position: { x: -23, y: 0, z: -33 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 1.9,
      speed: 0,
      health: 95,
      maxHealth: 95,
      state: "stalk",
      detectionRadius: 14.0,
      packId: "pack_portneuf",
      isPackAlpha: false,
      homePosition: { x: -23, y: 0, z: -33 },
      homeRadius: 120,
      lastAttackAt: 0,
      lastVocalAt: 0,
      fleeingSince: null,
      protected: false,
      threatLevel: 0,
      lastThreatenerId: null,
    });
  }

  // ─────────────────────────────────────────────────────────
  // API v1 compat
  // ─────────────────────────────────────────────────────────

  public registerEntity(entity: Partial<WildlifeEntityState> & Pick<WildlifeEntityState, "id" | "species" | "name" | "position">): WildlifeEntityState {
    const profile = SPECIES_PROFILE[entity.species];

    const full: WildlifeEntityState = {
      // v1 requis
      id: entity.id,
      species: entity.species,
      name: entity.name,
      position: { ...entity.position },
      velocity: entity.velocity ?? { x: 0, y: 0, z: 0 },
      rotation: entity.rotation ?? 0,
      speed: entity.speed ?? 0,
      health: entity.health ?? 100,
      maxHealth: entity.maxHealth ?? entity.health ?? 100,
      state: entity.state ?? "idle",
      detectionRadius: entity.detectionRadius ?? profile?.detectionRadius ?? 15,
      packId: entity.packId,
      isPackAlpha: entity.isPackAlpha,
      targetPosition: entity.targetPosition,

      // v2
      homePosition: entity.homePosition ?? { ...entity.position },
      homeRadius: entity.homeRadius ?? profile?.homeRadius ?? 80,
      lastAttackAt: entity.lastAttackAt ?? 0,
      lastVocalAt: entity.lastVocalAt ?? 0,
      fleeingSince: entity.fleeingSince ?? null,
      protected: entity.protected ?? profile?.isProtected ?? false,
      threatLevel: entity.threatLevel ?? 0,
      lastThreatenerId: entity.lastThreatenerId ?? null,
    };

    this.entities.set(full.id, full);
    this.spatial.insert(full.id, full.position.x, full.position.z);
    this.stats.entitiesTotal = this.entities.size;
    this.emit("spawn", full);
    return full;
  }

  public getEntities(): WildlifeEntityState[] {
    return Array.from(this.entities.values());
  }

  /** 🆕 v2 — utilisé par Wildlife3DManager */
  public getActiveEntities(): WildlifeEntityState[] {
    return this.getEntities();
  }

  public getEntity(id: string): WildlifeEntityState | null {
    return this.entities.get(id) ?? null;
  }

  // ─────────────────────────────────────────────────────────
  // TICK (v1 compat + v2)
  // ─────────────────────────────────────────────────────────

  /**
   * v1 API : tick(playerContext, deltaSeconds)
   */
  public tick(
    playerContext: PlayerThreatContext,
    deltaSeconds: number,
  ): {
    updatedEntities: WildlifeEntityState[];
    attacksTriggered: { entityName: string; damage: number }[];
    warnings: string[];
  } {
    const t0 = performance.now();
    const attacksTriggered: { entityName: string; damage: number }[] = [];
    const warnings: string[] = [];
    const now = Date.now();
    const playerId = playerContext.playerId ?? "__local__";

    // Snapshot pour éviter mutation pendant itération
    const entities = Array.from(this.entities.values());

    for (const entity of entities) {
      if (entity.state === "dead") continue;

      this.tickEntity(entity, playerContext, deltaSeconds, now, playerId, attacksTriggered, warnings);
    }

    // Track duration
    const dur = performance.now() - t0;
    this.stats.lastTickDurationMs = dur;
    this.stats.avgTickDurationMs = this.stats.tickCount === 0
      ? dur
      : Math.round((this.stats.avgTickDurationMs * 0.8 + dur * 0.2) * 100) / 100;
    this.stats.tickCount++;

    return {
      updatedEntities: entities,
      attacksTriggered,
      warnings: warnings.slice(0, this.config.maxWarningsPerTick),
    };
  }

  /**
   * 🆕 v2 API : updateAIBehaviors — compatible Wildlife3DManager
   * Signature : (playerPos, isCrouching, sirenActive, gunfireActive, delta)
   */
  public updateAIBehaviors(
    playerPos: [number, number, number],
    isCrouching: boolean,
    sirenActive: boolean,
    gunfireActive: boolean,
    delta: number,
  ): {
    updatedEntities: WildlifeEntityState[];
    attacksTriggered: { entityName: string; damage: number }[];
    warnings: string[];
    predatorWarning: string | null;
  } {
    const ctx: PlayerThreatContext = {
      position: { x: playerPos[0], y: playerPos[1], z: playerPos[2] },
      isCrouching,
      isArmed: false,
      sirenActive,
      gunfireActive,
      playerId: "__3d_manager__",
    };

    const result = this.tick(ctx, delta);

    return {
      updatedEntities: result.updatedEntities,
      attacksTriggered: result.attacksTriggered,
      warnings: result.warnings,
      predatorWarning: result.warnings[0] ?? null,
    };
  }

  // ─────────────────────────────────────────────────────────
  // TICK ENTITY (interne)
  // ─────────────────────────────────────────────────────────

  private tickEntity(
    entity: WildlifeEntityState,
    ctx: PlayerThreatContext,
    dt: number,
    now: number,
    playerId: string,
    attacksOut: { entityName: string; damage: number }[],
    warningsOut: string[],
  ): void {
    const profile = SPECIES_PROFILE[entity.species];
    if (!profile) return;

    const dx = ctx.position.x - entity.position.x;
    const dz = ctx.position.z - entity.position.z;
    const d2 = dx * dx + dz * dz;
    const dist = Math.sqrt(d2);

    // Culling
    if (d2 > this.config.activeRadius * this.config.activeRadius) {
      if (entity.state === "flee" || entity.state === "chase" || entity.state === "pack_chase") {
        entity.speed = 0;
        entity.state = "idle";
      }
      return;
    }

    // Radius crouch
    const effectiveRadius = ctx.isCrouching
      ? entity.detectionRadius * this.config.crouchRadiusMultiplier
      : entity.detectionRadius;

    // ─── 1. RÉACTION AU BRUIT/VISION ───
    const isTerrified = ctx.sirenActive || ctx.gunfireActive || dist < effectiveRadius;
    const previousState = entity.state;

    // ─── 2. MOOSE ───
    if (entity.species === "moose") {
      if (isTerrified) {
        this.setState(entity, "flee", `player_${playerId}`);
        entity.speed = profile.fleeSpeed * this.config.speedMultiplier;
        entity.rotation = Math.atan2(-dx, -dz);
        entity.fleeingSince = entity.fleeingSince ?? now;
      } else if (dist < profile.attackRange && profile.attackDamage > 0) {
        // Orignal acculé = charge
        if (entity.state !== "attack") this.setState(entity, "attack");
        entity.speed = profile.chaseSpeed * 0.3;
        entity.rotation = Math.atan2(dx, dz);
        if (now - entity.lastAttackAt > profile.attackCooldownMs) {
          entity.lastAttackAt = now;
          attacksOut.push({ entityName: entity.name, damage: profile.attackDamage });
          this.stats.attacksTotal++;
          this.emit("attack", entity, playerId, { damage: profile.attackDamage });
        }
      } else if (entity.fleeingSince !== null && this.shouldReturnHome(entity, dist)) {
        this.returnHome(entity, dt);
      } else {
        // Idle / graze / roam
        if (this.rng() < 0.015) {
          const states: AIBehaviorState[] = ["grazing", "roam", "idle"];
          const s = states[Math.floor(this.rng() * states.length)];
          this.setState(entity, s);
          if (s === "roam") {
            entity.rotation += (this.rng() - 0.5) * 1.4;
            entity.speed = 1.8;
          } else {
            entity.speed = 0;
          }
        }
      }
    }

    // ─── 3. WOLF ───
    else if (entity.species === "wolf") {
      if (ctx.sirenActive || ctx.gunfireActive) {
        this.setState(entity, "flee", `player_${playerId}`);
        entity.speed = profile.fleeSpeed * this.config.speedMultiplier;
        entity.rotation = Math.atan2(-dx, -dz);
        entity.fleeingSince = entity.fleeingSince ?? now;
      } else if (dist < effectiveRadius) {
        entity.rotation = Math.atan2(dx, dz);

        // Pack coordination EFFECTIVE
        if (entity.isPackAlpha) {
          this.coordinatePackTarget(entity.packId, ctx.position);
        }

        if (dist < profile.attackRange && profile.attackDamage > 0) {
          if (entity.state !== "attack") this.setState(entity, "attack", `player_${playerId}`);
          entity.speed = profile.chaseSpeed * 0.1;
          if (now - entity.lastAttackAt > profile.attackCooldownMs) {
            entity.lastAttackAt = now;
            attacksOut.push({ entityName: entity.name, damage: profile.attackDamage });
            this.stats.attacksTotal++;
            this.emit("attack", entity, playerId, { damage: profile.attackDamage });
          }
        } else if (dist < 5.5) {
          this.setState(entity, "pack_chase", `player_${playerId}`);
          entity.speed = profile.chaseSpeed * this.config.speedMultiplier;
        } else {
          this.setState(entity, "stalk", `player_${playerId}`);
          entity.speed = profile.stalkSpeed * this.config.speedMultiplier;
        }

        // Warning throttled
        if (dist < 7) {
          this.maybeWarn(playerId, now, `⚠️ MEUTE DE LOUPS : ${entity.name} vous traque !`, warningsOut);
        }
      } else if (entity.fleeingSince !== null && this.shouldReturnHome(entity, dist)) {
        this.returnHome(entity, dt);
      } else {
        if (this.rng() < 0.02) {
          const s: AIBehaviorState = this.rng() > 0.4 ? "roam" : "idle";
          this.setState(entity, s);
          entity.speed = s === "roam" ? 2.4 : 0;
          if (s === "roam") entity.rotation += (this.rng() - 0.5) * 1.6;
        }
      }
    }

    // ─── 4. BEAR ───
    else if (entity.species === "bear") {
      if (ctx.sirenActive || ctx.gunfireActive) {
        this.setState(entity, "flee", `player_${playerId}`);
        entity.speed = profile.fleeSpeed * this.config.speedMultiplier;
        entity.rotation = Math.atan2(-dx, -dz);
        entity.fleeingSince = entity.fleeingSince ?? now;
      } else if (dist < profile.attackRange) {
        if (entity.state !== "attack") this.setState(entity, "attack", `player_${playerId}`);
        entity.speed = 0;
        entity.rotation = Math.atan2(dx, dz);
        if (now - entity.lastAttackAt > profile.attackCooldownMs) {
          entity.lastAttackAt = now;
          attacksOut.push({ entityName: entity.name, damage: profile.attackDamage });
          this.stats.attacksTotal++;
          this.emit("attack", entity, playerId, { damage: profile.attackDamage });
        }
      } else if (dist < effectiveRadius) {
        this.setState(entity, "stalk", `player_${playerId}`);
        entity.speed = profile.stalkSpeed * this.config.speedMultiplier;
        entity.rotation = Math.atan2(dx, dz);
      } else {
        if (this.rng() < 0.012) {
          entity.rotation += (this.rng() - 0.5) * 1.2;
          entity.speed = 1.3;
          this.setState(entity, "roam");
        }
      }
    }

    // ─── 5. AUTRES ESPÈCES (générique) ───
    else {
      if (dist < effectiveRadius) {
        this.setState(entity, "flee", `player_${playerId}`);
        entity.speed = profile.fleeSpeed * this.config.speedMultiplier;
        entity.rotation = Math.atan2(-dx, -dz);
        entity.fleeingSince = entity.fleeingSince ?? now;
      } else if (entity.fleeingSince !== null && this.shouldReturnHome(entity, dist)) {
        this.returnHome(entity, dt);
      } else {
        if (this.rng() < 0.02) {
          const s: AIBehaviorState = this.rng() > 0.4 ? "roam" : "idle";
          this.setState(entity, s);
          entity.speed = s === "roam" ? 1.4 : 0;
          if (s === "roam") entity.rotation += (this.rng() - 0.5) * 1.6;
        }
      }
    }

    // ─── 6. VOCALISATION ───
    if (this.rng() < profile.vocalChance * dt * 10 && now - entity.lastVocalAt > 10000) {
      entity.lastVocalAt = now;
      this.stats.vocalizationsTotal++;
      this.emit("vocalize", entity, playerId);
    }

    // ─── 7. MOUVEMENT ───
    if (entity.speed > 0 && entity.state !== "idle" && entity.state !== "grazing" && entity.state !== "attack") {
      const nx = entity.position.x + Math.sin(entity.rotation) * entity.speed * dt;
      const nz = entity.position.z + Math.cos(entity.rotation) * entity.speed * dt;
      this.spatial.remove(entity.id, entity.position.x, entity.position.z);
      entity.position.x = nx;
      entity.position.z = nz;
      this.spatial.insert(entity.id, nx, nz);

      // Anti-fuite hors-territoire
      const hx = entity.position.x - entity.homePosition.x;
      const hz = entity.position.z - entity.homePosition.z;
      const homeDist2 = hx * hx + hz * hz;
      const maxHomeRadius = entity.homeRadius * 1.5;
      if (homeDist2 > maxHomeRadius * maxHomeRadius) {
        entity.rotation = Math.atan2(-hx, -hz);
      }
    }

    // Emit state change event
    if (previousState !== entity.state) {
      this.stats.stateChangesTotal++;
      this.emit("state_change", entity, playerId, { from: previousState, to: entity.state });
    }
  }

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────

  private setState(entity: WildlifeEntityState, state: AIBehaviorState, playerId?: string): void {
    if (entity.state === state) return;
    entity.state = state;

    if (state === "flee") this.emit("flee", entity, playerId);
    else if (state === "chase" || state === "pack_chase" || state === "stalk") {
      this.emit("chase", entity, playerId, { state });
    }
  }

  private shouldReturnHome(entity: WildlifeEntityState, distToPlayer: number): boolean {
    if (this.config.disableHomeReturn) return false;
    if (distToPlayer < this.config.returnHomeThreshold) return false;
    const hx = entity.position.x - entity.homePosition.x;
    const hz = entity.position.z - entity.homePosition.z;
    const homeDist = Math.hypot(hx, hz);
    return homeDist > 3;
  }

  private returnHome(entity: WildlifeEntityState, _dt: number): void {
    const hx = entity.homePosition.x - entity.position.x;
    const hz = entity.homePosition.z - entity.position.z;
    const dist = Math.hypot(hx, hz);

    if (dist < 2) {
      entity.speed = 0;
      entity.fleeingSince = null;
      entity.state = "idle";
      return;
    }

    entity.rotation = Math.atan2(hx, hz);
    entity.speed = 2.5 * this.config.speedMultiplier;
    // Marque fin de fuite
    entity.fleeingSince = null;
  }

  private maybeWarn(
    playerId: string,
    now: number,
    message: string,
    warningsOut: string[],
  ): void {
    if (warningsOut.length >= this.config.maxWarningsPerTick) return;
    const last = this.lastWarningAt.get(playerId) ?? 0;
    if (now - last < this.config.warningCooldownMs) return;
    this.lastWarningAt.set(playerId, now);
    warningsOut.push(message);
  }

  private coordinatePackTarget(packId: string | undefined, targetPos: Vector3D): void {
    if (!packId) return;
    for (const member of this.entities.values()) {
      if (member.packId !== packId || member.state === "dead") continue;
      member.targetPosition = { ...targetPos };
      member.threatLevel = 100;
      // Rotation coordonnée vers la cible
      const dx = targetPos.x - member.position.x;
      const dz = targetPos.z - member.position.z;
      if (dx * dx + dz * dz > 1) {
        member.rotation = Math.atan2(dx, dz);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // DAMAGE / KILL / WOUND
  // ─────────────────────────────────────────────────────────

  public woundEntity(id: string, damage: number, playerId?: string): boolean {
    const e = this.entities.get(id);
    if (!e || e.state === "dead") return false;

    e.health -= damage;
    this.stats.woundsTotal++;
    this.emit("wound", e, playerId, { damage, healthLeft: e.health });

    if (e.health <= 0) {
      e.state = "dead";
      e.speed = 0;
      this.stats.killsTotal++;
      this.emit("kill", e, playerId);
      return true;
    }

    // Fuite immédiate
    const profile = SPECIES_PROFILE[e.species];
    if (profile) {
      this.setState(e, "flee", playerId);
      e.speed = profile.fleeSpeed * 1.3;
      e.fleeingSince = Date.now();
    }
    return false;
  }

  public killEntity(id: string, playerId?: string): boolean {
    return this.woundEntity(id, 99999, playerId);
  }

  public respawnEntity(id: string): boolean {
    const e = this.entities.get(id);
    if (!e) return false;
    e.position = { ...e.homePosition };
    e.health = e.maxHealth;
    e.state = "idle";
    e.speed = 0;
    e.fleeingSince = null;
    e.threatLevel = 0;
    this.spatial.remove(id, e.position.x, e.position.z);
    this.spatial.insert(id, e.position.x, e.position.z);
    this.emit("spawn", e);
    return true;
  }

  // ─────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────

  public getEntitiesInRadius(x: number, z: number, radius: number): WildlifeEntityState[] {
    const ids = this.spatial.query(x, z, radius);
    const out: WildlifeEntityState[] = [];
    const r2 = radius * radius;
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e) continue;
      const dx = e.position.x - x;
      const dz = e.position.z - z;
      if (dx * dx + dz * dz <= r2) out.push(e);
    }
    return out;
  }

  public getNearestEntity(x: number, z: number, species?: WildlifeSpecies): WildlifeEntityState | null {
    let best: WildlifeEntityState | null = null;
    let bestD2 = Infinity;
    for (const e of this.entities.values()) {
      if (species && e.species !== species) continue;
      if (e.state === "dead") continue;
      const dx = e.position.x - x;
      const dz = e.position.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; best = e; }
    }
    return best;
  }

  // ─────────────────────────────────────────────────────────
  // STATS / HEALTH / DISPOSE
  // ─────────────────────────────────────────────────────────

  public getStats() {
    const byState: Record<string, number> = {};
    const bySpecies: Record<string, number> = {};
    let dead = 0;

    for (const e of this.entities.values()) {
      byState[e.state] = (byState[e.state] ?? 0) + 1;
      bySpecies[e.species] = (bySpecies[e.species] ?? 0) + 1;
      if (e.state === "dead") dead++;
    }

    return {
      ...this.stats,
      entitiesLive: this.entities.size,
      dead,
      byState,
      bySpecies,
      spatialBuckets: this.spatial.size,
      warningTrackers: this.lastWarningAt.size,
    };
  }

  public health(): { ok: boolean; reason?: string } {
    if (this.entities.size > 1000) return { ok: false, reason: "entities_overflow" };
    if (this.spatial.size > 2000) return { ok: false, reason: "spatial_overflow" };
    if (this.stats.avgTickDurationMs > 16) return { ok: false, reason: "tick_too_slow" };
    return { ok: true };
  }

  public reset(): void {
    this.entities.clear();
    this.spatial.clear();
    this.lastWarningAt.clear();
    this.stats = {
      entitiesTotal: 0,
      killsTotal: 0,
      woundsTotal: 0,
      attacksTotal: 0,
      vocalizationsTotal: 0,
      stateChangesTotal: 0,
      lastTickDurationMs: 0,
      avgTickDurationMs: 0,
      tickCount: 0,
    };
    this.initDefaultQuebecFauna();
  }

  public dispose(): void {
    this.entities.clear();
    this.spatial.clear();
    this.lastWarningAt.clear();
    this.listeners.clear();
  }

  /** 🆕 v2 — Config update à chaud */
  public updateConfig(patch: Partial<WildlifeAIConfig>): void {
    this.config = { ...this.config, ...patch };
  }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON (v1 compat)
// ═══════════════════════════════════════════════════════════

export const WildlifeAI = new WildlifeAIEngine();

/** 🆕 v2 — Alias attendu par Wildlife3DManager */
export const WildlifeAISystem = WildlifeAI;

export default WildlifeAI;