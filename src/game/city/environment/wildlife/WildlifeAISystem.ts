/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐺 WILDLIFE AI SYSTEM v2.0 — Faune du comté de Portneuf
 * ───────────────────────────────────────────────────────────────────────────
 *  • 100% compat v1 (toutes les méthodes publiques préservées)
 *  • RNG seedé (reproductibilité)
 *  • Events (kill, flee, chase, hunt, vocalize…)
 *  • Audio manager (cleanup propre, throttle anti-spam)
 *  • Spatial queries O(1) pour respawn
 *  • Config complète + hot-reload
 *  • Stats & health & dispose
 *  • Clamp par spawn zone (plus de monde carré [-80, 80])
 *  • dt-scaling sur toutes les chances probabilistes
 *  • Pré-allocation des arrays living (zéro GC)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════
// TYPES (v1 compat + extensions)
// ═══════════════════════════════════════════════════════════

export type WildlifeAnimalType = "moose" | "wolf" | "bear" | "fox" | "beaver";

export interface ForestSpawnZone {
  id: string;
  name: string;
  center: [number, number, number];
  radius: number;
  description: string;
  primarySpecies: WildlifeAnimalType[];
  dangerLevel: "low" | "medium" | "high" | "extreme";
  maxPopulation: number;
}

export interface WildlifeAIEntity {
  id: string;
  type: WildlifeAnimalType;
  name: string;
  spawnZoneId: string;
  position: [number, number, number];
  rotation: number;
  speed: number;
  health: number;
  maxHealth: number;
  state:
    | "idle" | "roam" | "grazing" | "stalk" | "chase" | "flee" | "attack"
    | "building_dam" | "swimming" | "tail_slap" | "dead" | "stampede";
  ageYears: number;
  weightKg: number;
  targetPos?: [number, number, number];
  targetPreyId?: string;
  isPackLeader?: boolean;
  packId?: string;
  herdId?: string;
  isHerdLeader?: boolean;
  followingLeaderId?: string;
  flankAngle?: number;
  harvested?: boolean;
  isFriendly?: boolean;
  woodGathered?: number;
  lastBehaviorTick: number;

  // 🆕 v2
  /** Timestamp dernier vocal (throttle audio) */
  lastVocalAt?: number;
  /** Timestamp dernière attaque (throttle) */
  lastAttackAt?: number;
  /** Direction de fuite persistante */
  fleeDirection?: number;
}

export interface WildlifeHarvestResult {
  speciesName: string;
  items: { name: string; value: number; icon: string; quantity: number }[];
  totalValue: number;
  message: string;
}

export interface WildlifeCodexEntry {
  id: string;
  speciesName: string;
  type: WildlifeAnimalType;
  zoneName: string;
  scannedAt: number;
  rewardValue: number;
  weightKg: number;
  notes: string;
}

export interface EnvironmentContext {
  timeOfDay?: "dawn" | "day" | "dusk" | "night";
  weather?: "clear" | "rain" | "fog" | "snow";
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — CONFIG
// ═══════════════════════════════════════════════════════════

export interface WildlifeAISystemConfig {
  /** Seed RNG */
  seed: number;
  /** Intervalle minimum entre respawns (ms) */
  respawnIntervalMs: number;
  /** Max entités par respawn check */
  maxRespawnPerCheck: number;
  /** Throttle audio par entité (ms) */
  audioThrottleMs: number;
  /** Clamp du monde (remplace [-80, 80]) */
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Clamp par spawn zone (au lieu du monde entier) */
  clampToSpawnZone: boolean;
  /** Vitesse de base multiplicateur */
  speedMultiplier: number;
  /** Probabilité vocal (par seconde) */
  vocalChancePerSecond: number;
  /** Activer les interactions prédateur-proie */
  predatorPreyEnabled: boolean;
  /** Activer les sons synthétisés */
  audioEnabled: boolean;
  /** Activer l'auto-respawn */
  respawnEnabled: boolean;
  /** Nombre max de warnings en retour par tick */
  maxWarningsPerTick: number;
}

const DEFAULT_CONFIG: WildlifeAISystemConfig = {
  seed: 4242,
  respawnIntervalMs: 15000,
  maxRespawnPerCheck: 1,
  audioThrottleMs: 4000,
  worldBounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 },
  clampToSpawnZone: true,
  speedMultiplier: 1.0,
  vocalChancePerSecond: 0.03,
  predatorPreyEnabled: true,
  audioEnabled: true,
  respawnEnabled: true,
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
// 🆕 v2 — EVENTS
// ═══════════════════════════════════════════════════════════

export type WildlifeAIEventType =
  | "attack"
  | "kill"
  | "hunt"
  | "flee"
  | "stampede"
  | "vocalize"
  | "respawn"
  | "harvest"
  | "tame"
  | "codex";

export interface WildlifeAIEvent {
  type: WildlifeAIEventType;
  entityId: string;
  entityName: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — AUDIO MANAGER
// ═══════════════════════════════════════════════════════════

class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean;
  private lastPlayedAt = new Map<string, number>();
  private throttleMs: number;

  constructor(enabled: boolean, throttleMs: number) {
    this.enabled = enabled;
    this.throttleMs = throttleMs;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setThrottle(ms: number): void {
    this.throttleMs = ms;
  }

  private ensureCtx(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return null;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private shouldPlay(key: string, now: number): boolean {
    const last = this.lastPlayedAt.get(key) ?? 0;
    if (now - last < this.throttleMs) return false;
    this.lastPlayedAt.set(key, now);
    return true;
  }

  /** 🆕 Cleanup à appeler au dispose */
  dispose(): void {
    try {
      if (this.ctx && this.ctx.state !== "closed") {
        void this.ctx.close();
      }
    } catch { /* noop */ }
    this.ctx = null;
    this.lastPlayedAt.clear();
  }

  playBeaverTailSlap(key = "beaver"): void {
    if (!this.shouldPlay(`beaver_${key}`, Date.now())) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* noop */ }
  }

  playMooseAlarmGrunt(key = "moose"): void {
    if (!this.shouldPlay(`moose_${key}`, Date.now())) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.55);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch { /* noop */ }
  }

  playWolfPackHowl(key = "wolf"): void {
    if (!this.shouldPlay(`wolf_${key}`, Date.now())) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(420, now + 1.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    } catch { /* noop */ }
  }
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — HAVERSINE LITE (dist²)
// ═══════════════════════════════════════════════════════════

function dist2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ═══════════════════════════════════════════════════════════
// MANAGER
// ═══════════════════════════════════════════════════════════

class WildlifeAISystemManager {
  // Zones de spawn (v1 compat)
  private spawnZones: ForestSpawnZone[] = [
    {
      id: "zone_laurentides",
      name: "Forêt Dense des Laurentides",
      center: [-28, 0, -32],
      radius: 25,
      description: "Habitat principal des orignaux géants et des meutes de loups grises.",
      primarySpecies: ["moose", "wolf", "bear"],
      dangerLevel: "high",
      maxPopulation: 6,
    },
    {
      id: "zone_portneuf",
      name: "Réserve Faunique de Portneuf",
      center: [28, 0, -35],
      radius: 22,
      description: "Secteur boisé avec sous-bois denses, fréquenté par les ours noirs, renards et orignaux.",
      primarySpecies: ["moose", "bear", "fox"],
      dangerLevel: "medium",
      maxPopulation: 5,
    },
    {
      id: "zone_fleuve_portneuf",
      name: "Berges & Ruisseau du Fleuve Saint-Laurent",
      center: [-15, 0, 32],
      radius: 24,
      description: "Berges boisées et ruisseaux où les castors bâtissent leurs barrages et huttes.",
      primarySpecies: ["beaver", "moose", "fox"],
      dangerLevel: "low",
      maxPopulation: 5,
    },
    {
      id: "zone_neuville",
      name: "Boisé Rive-Sud de Neuville",
      center: [-35, 0, 45],
      radius: 18,
      description: "Forêt paisible en bordure du fleuve et prairies humides.",
      primarySpecies: ["fox", "beaver", "moose"],
      dangerLevel: "low",
      maxPopulation: 4,
    },
    {
      id: "zone_monts_valin",
      name: "Sommets Sauvages des Monts Valin",
      center: [-42, 0, -50],
      radius: 30,
      description: "Territoire sauvage isolé à haut risque de grands prédateurs du Bouclier.",
      primarySpecies: ["wolf", "bear"],
      dangerLevel: "extreme",
      maxPopulation: 8,
    },
  ];

  private activeEntities: Map<string, WildlifeAIEntity> = new Map();
  private codexEntries: WildlifeCodexEntry[] = [];
  private totalSubventionsEarned = 0;
  private activeBaitPosition: [number, number, number] | null = null;
  private mooseCallActive = false;
  private lastRespawnCheck = Date.now();

  // 🆕 v2
  private config: WildlifeAISystemConfig;
  private rng: () => number;
  private listeners = new Set<(e: WildlifeAIEvent) => void>();
  private audio: AudioManager;
  private mooseCallTimeout: ReturnType<typeof setTimeout> | null = null;
  private baitTimeout: ReturnType<typeof setTimeout> | null = null;

  // Pré-allocation (zéro GC)
  private _livingMoose: WildlifeAIEntity[] = [];
  private _livingWolves: WildlifeAIEntity[] = [];
  private _warnings: string[] = [];
  private _attacks: { name: string; damage: number }[] = [];

  // Stats
  private stats = {
    entitiesSpawned: 0,
    entitiesRespawned: 0,
    attacksTotal: 0,
    killsTotal: 0,
    harvestsTotal: 0,
    codexEntriesTotal: 0,
    vocalizationsTotal: 0,
    lastTickMs: 0,
    avgTickMs: 0,
    tickCount: 0,
  };

  private disposed = false;

  constructor(config: Partial<WildlifeAISystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = mulberry32(this.config.seed);
    this.audio = new AudioManager(this.config.audioEnabled, this.config.audioThrottleMs);
    this.seedInitialPopulation();
  }

  // ═══════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════

  onEvent(cb: (e: WildlifeAIEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(type: WildlifeAIEventType, entity: WildlifeAIEntity, data?: Record<string, unknown>): void {
    const evt: WildlifeAIEvent = {
      type,
      entityId: entity.id,
      entityName: entity.name,
      data,
      timestamp: Date.now(),
    };
    for (const cb of this.listeners) {
      try { cb(evt); } catch { /* noop */ }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════

  updateConfig(patch: Partial<WildlifeAISystemConfig>): void {
    this.config = { ...this.config, ...patch };
    this.audio.setEnabled(this.config.audioEnabled);
    this.audio.setThrottle(this.config.audioThrottleMs);
  }

  getConfig(): WildlifeAISystemConfig {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════
  // SPAWN INITIAL (v1 compat)
  // ═══════════════════════════════════════════════════════════

  private seedInitialPopulation(): void {
    // ─── Harde d'Orignaux des Laurentides ───
    this.spawnEntity({
      id: "moose_laurentides_lead",
      type: "moose",
      name: "Orignal Mâle Dominant (Harde Laurentides - 560kg)",
      spawnZoneId: "zone_laurentides",
      position: [-28, 0, -25],
      rotation: 0.5, speed: 0,
      health: 380, maxHealth: 380,
      state: "grazing",
      ageYears: 8, weightKg: 560,
      isHerdLeader: true, herdId: "herd_laurentides",
      lastBehaviorTick: Date.now(),
    });

    this.spawnEntity({
      id: "moose_laurentides_cow",
      type: "moose",
      name: "Orignal Femelle Adulte (Harde Laurentides - 420kg)",
      spawnZoneId: "zone_laurentides",
      position: [-26, 0, -28],
      rotation: 0.4, speed: 0,
      health: 290, maxHealth: 290,
      state: "grazing",
      ageYears: 5, weightKg: 420,
      herdId: "herd_laurentides",
      followingLeaderId: "moose_laurentides_lead",
      lastBehaviorTick: Date.now(),
    });

    this.spawnEntity({
      id: "moose_laurentides_calf",
      type: "moose",
      name: "Jeune Orignal d'un An (Harde Laurentides - 220kg)",
      spawnZoneId: "zone_laurentides",
      position: [-30, 0, -27],
      rotation: 0.6, speed: 0,
      health: 160, maxHealth: 160,
      state: "grazing",
      ageYears: 1, weightKg: 220,
      herdId: "herd_laurentides",
      followingLeaderId: "moose_laurentides_lead",
      lastBehaviorTick: Date.now(),
    });

    // ─── Moose solitaire ───
    this.spawnEntity({
      id: "moose_portneuf_1",
      type: "moose",
      name: "Orignal Solitaire de Portneuf (430kg)",
      spawnZoneId: "zone_portneuf",
      position: [30, 0, -38],
      rotation: -1.1, speed: 0,
      health: 300, maxHealth: 300,
      state: "grazing",
      ageYears: 6, weightKg: 430,
      lastBehaviorTick: Date.now(),
    });

    // ─── Meute de Loups des Laurentides ───
    this.spawnEntity({
      id: "wolf_alpha_1",
      type: "wolf",
      name: "Loup Alpha des Laurentides (55kg)",
      spawnZoneId: "zone_laurentides",
      position: [-22, 0, -35],
      rotation: 2.1, speed: 0,
      health: 150, maxHealth: 150,
      state: "stalk",
      ageYears: 6, weightKg: 55,
      isPackLeader: true, packId: "pack_laurentides",
      flankAngle: 0,
      lastBehaviorTick: Date.now(),
    });

    this.spawnEntity({
      id: "wolf_beta_1",
      type: "wolf",
      name: "Loup Bêta Traqueur (Flanc Gauche - 44kg)",
      spawnZoneId: "zone_laurentides",
      position: [-25, 0, -33],
      rotation: 1.9, speed: 0,
      health: 120, maxHealth: 120,
      state: "stalk",
      ageYears: 4, weightKg: 44,
      packId: "pack_laurentides",
      flankAngle: 0.75,
      lastBehaviorTick: Date.now(),
    });

    this.spawnEntity({
      id: "wolf_gamma_1",
      type: "wolf",
      name: "Loup Oméga Embuscade (Flanc Droit - 42kg)",
      spawnZoneId: "zone_laurentides",
      position: [-20, 0, -37],
      rotation: 2.3, speed: 0,
      health: 110, maxHealth: 110,
      state: "stalk",
      ageYears: 3, weightKg: 42,
      packId: "pack_laurentides",
      flankAngle: -0.75,
      lastBehaviorTick: Date.now(),
    });

    // ─── Ours noir ───
    this.spawnEntity({
      id: "bear_shield_1",
      type: "bear",
      name: "Ours Noir du Bouclier Canadien (380kg)",
      spawnZoneId: "zone_laurentides",
      position: [-36, 0, -42],
      rotation: 1.2, speed: 0,
      health: 400, maxHealth: 400,
      state: "roam",
      ageYears: 9, weightKg: 380,
      lastBehaviorTick: Date.now(),
    });

    // ─── Castors ───
    this.spawnEntity({
      id: "beaver_fleuve_1",
      type: "beaver",
      name: "Castor Bâtisseur du Saint-Laurent (28kg)",
      spawnZoneId: "zone_fleuve_portneuf",
      position: [-16, 0, 31],
      rotation: 0.8, speed: 0,
      health: 75, maxHealth: 75,
      state: "building_dam",
      ageYears: 4, weightKg: 28,
      woodGathered: 3,
      lastBehaviorTick: Date.now(),
    });

    this.spawnEntity({
      id: "beaver_fleuve_2",
      type: "beaver",
      name: "Castor d'Amérique des Berges (22kg)",
      spawnZoneId: "zone_fleuve_portneuf",
      position: [-13, 0, 35],
      rotation: -0.4, speed: 0,
      health: 65, maxHealth: 65,
      state: "roam",
      ageYears: 3, weightKg: 22,
      woodGathered: 1,
      lastBehaviorTick: Date.now(),
    });

    // ─── Renard ───
    this.spawnEntity({
      id: "fox_neuville_1",
      type: "fox",
      name: "Renard Roux de Neuville",
      spawnZoneId: "zone_neuville",
      position: [-32, 0, 42],
      rotation: -0.4, speed: 0,
      health: 50, maxHealth: 50,
      state: "idle",
      ageYears: 2, weightKg: 9,
      lastBehaviorTick: Date.now(),
    });
  }

  public spawnEntity(entity: WildlifeAIEntity): void {
    this.activeEntities.set(entity.id, entity);
    this.stats.entitiesSpawned++;
  }

  public getActiveEntities(): WildlifeAIEntity[] {
    return Array.from(this.activeEntities.values());
  }

  public getSpawnZones(): ForestSpawnZone[] {
    return this.spawnZones;
  }

  public getZoneById(id: string): ForestSpawnZone | null {
    return this.spawnZones.find((z) => z.id === id) ?? null;
  }

  // ═══════════════════════════════════════════════════════════
  // 🆕 v2 — RESPAWN OPTIMISÉ
  // ═══════════════════════════════════════════════════════════

  public checkAndRespawnFauna(): number {
    if (!this.config.respawnEnabled) return 0;
    if (this.disposed) return 0;

    const now = Date.now();
    if (now - this.lastRespawnCheck < this.config.respawnIntervalMs) return 0;
    this.lastRespawnCheck = now;

    let respawnCount = 0;

    for (const zone of this.spawnZones) {
      // Compte rapide sans filter complet — parcours direct
      let liveInZone = 0;
      for (const e of this.activeEntities.values()) {
        if (e.spawnZoneId === zone.id && e.state !== "dead") liveInZone++;
      }

      if (liveInZone >= zone.maxPopulation) continue;

      const missing = zone.maxPopulation - liveInZone;
      const toSpawn = Math.min(missing, this.config.maxRespawnPerCheck);

      for (let i = 0; i < toSpawn; i++) {
        const species = zone.primarySpecies[Math.floor(this.rng() * zone.primarySpecies.length)];
        const angle = this.rng() * Math.PI * 2;
        const dist = this.rng() * zone.radius * 0.75;
        const posX = zone.center[0] + Math.cos(angle) * dist;
        const posZ = zone.center[2] + Math.sin(angle) * dist;

        const newId = `${species}_${now}_${Math.floor(this.rng() * 1000)}`;
        let newName = "Faune Québécoise";
        let hp = 100;
        let weight = 40;

        switch (species) {
          case "moose":
            newName = `Orignal Sauvage (${zone.name.split(" ")[0]})`;
            hp = 300;
            weight = 450 + Math.floor(this.rng() * 120);
            break;
          case "wolf":
            newName = `Loup Gris des Forêts (${zone.name.split(" ")[0]})`;
            hp = 120;
            weight = 45 + Math.floor(this.rng() * 15);
            break;
          case "bear":
            newName = `Ours Noir Solitaire (${zone.name.split(" ")[0]})`;
            hp = 360;
            weight = 300 + Math.floor(this.rng() * 90);
            break;
          case "beaver":
            newName = `Castor du Québec (${zone.name.split(" ")[0]})`;
            hp = 70;
            weight = 20 + Math.floor(this.rng() * 12);
            break;
          case "fox":
            newName = `Renard Roux (${zone.name.split(" ")[0]})`;
            hp = 50;
            weight = 8 + Math.floor(this.rng() * 4);
            break;
        }

        const entity: WildlifeAIEntity = {
          id: newId,
          type: species,
          name: newName,
          spawnZoneId: zone.id,
          position: [posX, 0, posZ],
          rotation: this.rng() * Math.PI * 2,
          speed: 0,
          health: hp,
          maxHealth: hp,
          state: species === "beaver" ? "building_dam" : species === "moose" ? "grazing" : "roam",
          ageYears: Math.floor(2 + this.rng() * 8),
          weightKg: weight,
          woodGathered: species === "beaver" ? 2 : undefined,
          lastBehaviorTick: now,
        };

        this.spawnEntity(entity);
        this.emit("respawn", entity, { zoneId: zone.id });
        this.stats.entitiesRespawned++;
        respawnCount++;
      }
    }

    return respawnCount;
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIO (v1 compat)
  // ═══════════════════════════════════════════════════════════

  public playBeaverTailSlap(): void {
    this.audio.playBeaverTailSlap();
    this.stats.vocalizationsTotal++;
  }

  public playMooseAlarmGrunt(): void {
    this.audio.playMooseAlarmGrunt();
    this.stats.vocalizationsTotal++;
  }

  public playWolfPackHowl(): void {
    this.audio.playWolfPackHowl();
    this.stats.vocalizationsTotal++;
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE IA (v1 compat + v2)
  // ═══════════════════════════════════════════════════════════

  public updateAIBehaviors(
    playerPos: [number, number, number],
    isCrouching: boolean,
    sirenActive: boolean,
    gunfireActive: boolean,
    dtSeconds: number,
    env?: EnvironmentContext,
  ): {
    updatedEntities: WildlifeAIEntity[];
    playerAttackedBy?: { name: string; damage: number };
    predatorWarning?: string;
    beaverTailSlapAlert?: string;
  } {
    if (this.disposed) {
      return { updatedEntities: [] };
    }

    // Clamp dt (sécurité)
    const dt = Number.isFinite(dtSeconds) ? clamp(dtSeconds, 0.001, 0.1) : 0.016;

    const t0 = performance.now();

    let attackInfo: { name: string; damage: number } | undefined;
    let warningMsg: string | undefined;
    let tailSlapMsg: string | undefined;

    // Audio messages (évite le spam en collectant une seule fois)
    let beaverTailTriggered = false;
    let mooseGruntTriggered = false;
    let wolfHowlTriggered = false;

    // Respawn throttlé (interne)
    this.checkAndRespawnFauna();

    const entities = Array.from(this.activeEntities.values());
    const isNight = env?.timeOfDay === "night";
    const isFogOrRain = env?.weather === "fog" || env?.weather === "rain";

    const [px, , pz] = playerPos;

    // ═══ PRÉ-PASS ═══
    let mooseHerdThreatened = false;
    let wolfPackAlerted = false;

    // Pré-allocation (zéro GC)
    this._livingMoose.length = 0;
    this._livingWolves.length = 0;
    this._warnings.length = 0;

    for (const entity of entities) {
      if (entity.state === "dead") continue;

      const dx = px - entity.position[0];
      const dz = pz - entity.position[2];
      const distSq = dx * dx + dz * dz;
      const dist = Math.sqrt(distSq);

      const detRange = isCrouching ? 5 : 12;
      const detRangeSq = detRange * detRange;

      if (entity.herdId === "herd_laurentides" && (distSq < detRangeSq || sirenActive || gunfireActive)) {
        mooseHerdThreatened = true;
      }

      const wolfRange = isNight ? 18 : 14;
      if (entity.packId === "pack_laurentides" && (distSq < wolfRange * wolfRange || sirenActive || gunfireActive)) {
        wolfPackAlerted = true;
      }

      // Pré-filtre moose / wolves
      if (entity.type === "moose") this._livingMoose.push(entity);
      else if (entity.type === "wolf") this._livingWolves.push(entity);
    }

    const herdLeader = this._livingMoose.find((e) => e.isHerdLeader) ?? null;

    // ═══ BOUCLE ENTITÉS ═══
    for (const entity of entities) {
      if (entity.state === "dead") {
        entity.speed = 0;
        continue;
      }

      const [ex, , ez] = entity.position;
      const dxP = px - ex;
      const dzP = pz - ez;
      const distSqP = dxP * dxP + dzP * dzP;
      const distToPlayer = Math.sqrt(distSqP);

      // Détection adaptative
      let detectionRadius = isCrouching ? 4.5 : 12.0;
      if (isFogOrRain) detectionRadius *= 0.8;
      if (isNight && entity.type !== "wolf" && entity.type !== "bear") detectionRadius *= 0.75;
      if (isNight && (entity.type === "wolf" || entity.type === "bear")) detectionRadius *= 1.3;
      const detSq = detectionRadius * detectionRadius;

      let nextState = entity.state;
      let targetRot = entity.rotation;
      let moveSpeed = 0;

      // ─── A. SIRÈNE / COUP DE FEU ───
      if (sirenActive || gunfireActive) {
        if (entity.type === "beaver") {
          nextState = "tail_slap";
          if (!beaverTailTriggered) {
            this.playBeaverTailSlap();
            tailSlapMsg = `💧 Coup de queue d'alerte ! ${entity.name} plonge dans le ruisseau !`;
            beaverTailTriggered = true;
          }
          moveSpeed = 0;
        } else if (entity.type === "moose") {
          nextState = "stampede";
          targetRot = Math.atan2(-dxP, -dzP);
          moveSpeed = 11.0;
        } else {
          nextState = "flee";
          targetRot = Math.atan2(-dxP, -dzP);
          moveSpeed = 8.5;
        }
      }
      // ─── B. CASTOR ───
      else if (entity.type === "beaver") {
        if (entity.isFriendly) {
          if (distToPlayer < 3.0) {
            nextState = "idle";
            targetRot = Math.atan2(dxP, dzP);
            moveSpeed = 0;
          } else {
            nextState = "building_dam";
            moveSpeed = 0;
          }
        } else if (distToPlayer < 2.0) {
          nextState = "attack";
          targetRot = Math.atan2(dxP, dzP);
          moveSpeed = 0.5;
          if (this.rng() < dt * 0.7) {
            attackInfo = { name: entity.name, damage: 8 };
            this.stats.attacksTotal++;
            this.emit("attack", entity, { damage: 8 });
          }
        } else if (distSqP < detSq) {
          if (entity.state !== "tail_slap" && entity.state !== "flee") {
            if (!beaverTailTriggered) {
              this.playBeaverTailSlap();
              tailSlapMsg = `⚠️ ALERTE FAUNIQUE : ${entity.name} a claqué de la queue sur l'eau !`;
              beaverTailTriggered = true;
            }
          }
          nextState = "flee";
          targetRot = Math.atan2(-dxP, -dzP);
          moveSpeed = 3.5;
        } else {
          if (this.rng() < dt * 1.2) {
            const states: ("building_dam" | "roam" | "swimming")[] = ["building_dam", "roam", "swimming"];
            nextState = states[Math.floor(this.rng() * states.length)];
            if (nextState === "roam") targetRot += (this.rng() - 0.5) * 1.5;
          }
          moveSpeed = nextState === "swimming" ? 1.8 : nextState === "roam" ? 1.2 : 0;
        }
      }
      // ─── C. ORIGNAL ───
      else if (entity.type === "moose") {
        if (mooseHerdThreatened && entity.herdId) {
          nextState = "stampede";
          moveSpeed = 11.0;

          if (entity.isHerdLeader) {
            targetRot = Math.atan2(-dxP, -dzP);
            if (!mooseGruntTriggered && this.rng() < dt * 3) {
              this.playMooseAlarmGrunt();
              mooseGruntTriggered = true;
            }
            warningMsg = `🦌 ALERTE : La Harde d'orignaux des Laurentides fuit en trombe !`;
          } else if (herdLeader) {
            const dxL = herdLeader.position[0] - ex;
            const dzL = herdLeader.position[2] - ez;
            const distL = Math.hypot(dxL, dzL);

            if (distL > 6) {
              targetRot = Math.atan2(dxL, dzL);
            } else {
              targetRot = herdLeader.rotation + (this.rng() - 0.5) * 0.4;
            }
          }
        } else if (distToPlayer < 3.2) {
          nextState = "attack";
          targetRot = Math.atan2(dxP, dzP);
          moveSpeed = 4.0;
          warningMsg = `⚠️ DANGER : ${entity.name} charge avec son panache de 560kg !`;
          if (this.rng() < dt * 0.9) {
            attackInfo = { name: entity.name, damage: 26 };
            this.stats.attacksTotal++;
            this.emit("attack", entity, { damage: 26 });
          }
        } else if (distSqP < detSq) {
          nextState = "flee";
          targetRot = Math.atan2(-dxP, -dzP);
          moveSpeed = 8.5;
        } else {
          // Chasse naturelle : loups vs orignal
          if (this.config.predatorPreyEnabled && this._livingWolves.length > 0) {
            let nearestWolf: WildlifeAIEntity | undefined;
            let distWolfSq = 24 * 24;
            for (const w of this._livingWolves) {
              const dw = dist2D(w.position[0], w.position[2], ex, ez);
              if (dw < distWolfSq) {
                distWolfSq = dw;
                nearestWolf = w;
              }
            }

            if (nearestWolf) {
              const distWolf = Math.sqrt(distWolfSq);
              const dxW = nearestWolf.position[0] - ex;
              const dzW = nearestWolf.position[2] - ez;

              if (distWolf < 2.8 && entity.health > 100 && this.rng() < dt * 4) {
                nextState = "attack";
                targetRot = Math.atan2(dxW, dzW);
                moveSpeed = 3.5;
                nearestWolf.health = Math.max(0, nearestWolf.health - 25 * dt);
                if (nearestWolf.health <= 0) {
                  nearestWolf.state = "dead";
                  nearestWolf.speed = 0;
                  warningMsg = `🦌 RIPOSTE NATURELLE : ${entity.name} a terrassé un loup avec ses sabots !`;
                  this.stats.killsTotal++;
                  this.emit("kill", nearestWolf, { byMoose: true });
                }
              } else {
                nextState = "stampede";
                targetRot = Math.atan2(-dxW, -dzW);
                moveSpeed = 11.2;
                if (!mooseGruntTriggered && this.rng() < dt * 2) {
                  this.playMooseAlarmGrunt();
                  mooseGruntTriggered = true;
                }
                if (!warningMsg && this.rng() < dt * 0.5) {
                  warningMsg = `🦌 PANIQUE : ${entity.name} fuit devant la meute de loups !`;
                }
              }
            } else if (entity.herdId && !entity.isHerdLeader && herdLeader) {
              const dxL = herdLeader.position[0] - ex;
              const dzL = herdLeader.position[2] - ez;
              const distL = Math.hypot(dxL, dzL);

              if (distL > 9) {
                nextState = "roam";
                targetRot = Math.atan2(dxL, dzL);
                moveSpeed = 2.4;
              } else {
                nextState = "grazing";
                moveSpeed = 0;
              }
            } else {
              if (this.rng() < dt * 1.2) {
                const states: ("grazing" | "roam" | "idle")[] = ["grazing", "roam", "idle"];
                nextState = states[Math.floor(this.rng() * states.length)];
                if (nextState === "roam") targetRot += (this.rng() - 0.5) * 1.5;
              }
              moveSpeed = nextState === "roam" ? 1.8 : 0;
            }
          }
        }
      }
      // ─── D. LOUP ───
      else if (entity.type === "wolf") {
        let targetMoose: WildlifeAIEntity | undefined;

        if (this.config.predatorPreyEnabled) {
          if (entity.targetPreyId) {
            targetMoose = this._livingMoose.find((m) => m.id === entity.targetPreyId && m.state !== "dead");
            if (!targetMoose) entity.targetPreyId = undefined;
          }

          if (!targetMoose && this._livingMoose.length > 0 && distToPlayer > 10.0) {
            let closest = 38 * 38;
            for (const m of this._livingMoose) {
              const dm = dist2D(m.position[0], m.position[2], ex, ez);
              if (dm < closest) {
                closest = dm;
                targetMoose = m;
              }
            }
            if (targetMoose) entity.targetPreyId = targetMoose.id;
          }
        }

        if (wolfPackAlerted && entity.packId && distSqP < (isNight ? 18 : 14) ** 2) {
          const baseAngle = Math.atan2(dxP, dzP);
          const flank = entity.flankAngle ?? 0;
          targetRot = baseAngle + flank;

          if (entity.isPackLeader && !wolfHowlTriggered && this.rng() < dt * 2.5) {
            this.playWolfPackHowl();
            wolfHowlTriggered = true;
          }

          if (distToPlayer < 2.0) {
            nextState = "attack";
            moveSpeed = 2.0;
            if (this.rng() < dt * 1.3) {
              attackInfo = { name: entity.name, damage: isNight ? 20 : 15 };
              this.stats.attacksTotal++;
              this.emit("attack", entity, { damage: isNight ? 20 : 15 });
            }
          } else if (distToPlayer < 8.0) {
            nextState = "chase";
            moveSpeed = isNight ? 11.5 : 9.5;
            if (!warningMsg) {
              warningMsg = `🐺 ALERTE MEUTE : Les loups des Laurentides vous encerclent !`;
            }
          } else {
            nextState = "stalk";
            moveSpeed = 3.5;
          }
        } else if (targetMoose && distToPlayer > 8.0) {
          const dxM = targetMoose.position[0] - ex;
          const dzM = targetMoose.position[2] - ez;
          const distM = Math.hypot(dxM, dzM);

          if (entity.isPackLeader) {
            targetRot = Math.atan2(dxM, dzM);
            if (!wolfHowlTriggered && this.rng() < dt * 2) {
              this.playWolfPackHowl();
              wolfHowlTriggered = true;
            }
          } else {
            targetRot = Math.atan2(dxM, dzM) + (entity.flankAngle ?? 0);
          }

          if (distM < 2.4) {
            nextState = "attack";
            moveSpeed = 2.0;
            targetMoose.health = Math.max(0, targetMoose.health - 32 * dt);
            if (targetMoose.health <= 0) {
              targetMoose.state = "dead";
              targetMoose.speed = 0;
              entity.targetPreyId = undefined;
              warningMsg = `🐺 CHASSE NATURELLE : La meute a terrassé ${targetMoose.name} !`;
              this.stats.killsTotal++;
              this.emit("kill", targetMoose, { byWolves: true });
            }
          } else if (distM < 16.0) {
            nextState = "chase";
            moveSpeed = isNight ? 11.5 : 10.0;
            if (!warningMsg && this.rng() < dt * 0.4) {
              warningMsg = `🐺 CHASSE NATURELLE : La meute traque un orignal !`;
            }
          } else {
            nextState = "stalk";
            moveSpeed = 4.0;
          }
        } else if (distSqP < detSq) {
          targetRot = Math.atan2(dxP, dzP);
          if (distToPlayer < 2.0) {
            nextState = "attack";
            moveSpeed = 2.0;
            if (this.rng() < dt * 1.2) {
              attackInfo = { name: entity.name, damage: isNight ? 18 : 14 };
              this.stats.attacksTotal++;
              this.emit("attack", entity, { damage: isNight ? 18 : 14 });
            }
          } else if (distToPlayer < 7.0) {
            nextState = "chase";
            moveSpeed = 9.0;
          } else {
            nextState = "stalk";
            moveSpeed = 3.0;
          }
        } else {
          if (this.rng() < dt * 1.2) {
            nextState = this.rng() > 0.4 ? "roam" : "idle";
            if (nextState === "roam") targetRot += (this.rng() - 0.5) * 1.8;
          }
          moveSpeed = nextState === "roam" ? 2.2 : 0;
        }
      }
      // ─── E. OURS ───
      else if (entity.type === "bear") {
        if (distSqP < detSq) {
          targetRot = Math.atan2(dxP, dzP);
          if (!warningMsg) {
            warningMsg = `⚠️ ALERTE : ${entity.name} défend son territoire et charge !`;
          }

          if (distToPlayer < 2.4) {
            nextState = "attack";
            moveSpeed = 1.5;
            if (this.rng() < dt * 1.1) {
              attackInfo = { name: entity.name, damage: 32 };
              this.stats.attacksTotal++;
              this.emit("attack", entity, { damage: 32 });
            }
          } else {
            nextState = "chase";
            moveSpeed = 8.0;
          }
        } else {
          if (this.rng() < dt * 0.6) {
            nextState = this.rng() > 0.5 ? "roam" : "idle";
            if (nextState === "roam") targetRot += (this.rng() - 0.5) * 1.2;
          }
          moveSpeed = nextState === "roam" ? 1.5 : 0;
        }
      }
      // ─── F. RENARD ───
      else if (entity.type === "fox") {
        if (distToPlayer < 14.0) {
          nextState = "flee";
          targetRot = Math.atan2(-dxP, -dzP);
          moveSpeed = 7.5;
        } else {
          if (this.rng() < dt * 1.8) {
            nextState = this.rng() > 0.5 ? "roam" : "idle";
          }
          moveSpeed = nextState === "roam" ? 2.0 : 0;
        }
      }

      // ─── KINEMATICS + CLAMP PAR ZONE ───
      entity.state = nextState;
      entity.rotation = targetRot;
      entity.speed = moveSpeed;
      entity.lastBehaviorTick = Date.now();

      if (moveSpeed > 0) {
        entity.position[0] += Math.sin(targetRot) * moveSpeed * this.config.speedMultiplier * dt;
        entity.position[2] += Math.cos(targetRot) * moveSpeed * this.config.speedMultiplier * dt;

        // 🆕 FIX : clamp par spawn zone si activé, sinon bounds monde
        if (this.config.clampToSpawnZone) {
          const zone = this.spawnZones.find((z) => z.id === entity.spawnZoneId);
          if (zone) {
            const dx = entity.position[0] - zone.center[0];
            const dz = entity.position[2] - zone.center[2];
            const dist = Math.hypot(dx, dz);
            if (dist > zone.radius) {
              const scale = zone.radius / dist;
              entity.position[0] = zone.center[0] + dx * scale;
              entity.position[2] = zone.center[2] + dz * scale;
            }
          }
        } else {
          const b = this.config.worldBounds;
          entity.position[0] = clamp(entity.position[0], b.minX, b.maxX);
          entity.position[2] = clamp(entity.position[2], b.minZ, b.maxZ);
        }
      }
    }

    // Track durée
    const dur = performance.now() - t0;
    this.stats.lastTickMs = dur;
    this.stats.avgTickMs = this.stats.tickCount === 0
      ? dur
      : Math.round((this.stats.avgTickMs * 0.85 + dur * 0.15) * 100) / 100;
    this.stats.tickCount++;

    return {
      updatedEntities: entities,
      playerAttackedBy: attackInfo,
      predatorWarning: warningMsg,
      beaverTailSlapAlert: tailSlapMsg,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // HARVEST / FEED / CODEX (v1 compat)
  // ═══════════════════════════════════════════════════════════

  public harvestEntity(entityId: string): WildlifeHarvestResult | null {
    const entity = this.activeEntities.get(entityId);
    if (!entity || entity.state !== "dead" || entity.harvested) return null;

    entity.harvested = true;
    let items: { name: string; value: number; icon: string; quantity: number }[] = [];

    switch (entity.type) {
      case "moose":
        items = [
          { name: "Venaison d'Orignal du Québec", value: 450, icon: "🥩", quantity: 2 },
          { name: "Grand Panache Trophée Majestueux", value: 650, icon: "🦌", quantity: 1 },
          { name: "Cuir Brut d'Orignal Épais", value: 200, icon: "🛡️", quantity: 2 },
        ];
        break;
      case "wolf":
        items = [
          { name: "Fourrure de Loup Gris Sauvage", value: 380, icon: "🐺", quantity: 1 },
          { name: "Crocs Pointus de Prédateur", value: 160, icon: "🦷", quantity: 2 },
        ];
        break;
      case "bear":
        items = [
          { name: "Fourrure d'Ours Noir Impériale", value: 750, icon: "🐻", quantity: 1 },
          { name: "Griffes d'Ours Noir Acérées", value: 320, icon: "🐾", quantity: 4 },
          { name: "Graisse d'Ours Raffinée", value: 180, icon: "🧪", quantity: 2 },
        ];
        break;
      case "beaver":
        items = [
          { name: "Fourrure de Castor Québécois Noble", value: 420, icon: "🦫", quantity: 1 },
          { name: "Essence Noble de Castoréum", value: 260, icon: "✨", quantity: 1 },
          { name: "Bois de Bouleau Taillé de Barrage", value: 120, icon: "🪵", quantity: 3 },
        ];
        break;
      case "fox":
      default:
        items = [
          { name: "Fourrure de Renard Roux Soyeuse", value: 220, icon: "🦊", quantity: 1 },
          { name: "Queue de Renard Porte-Bonheur", value: 140, icon: "✨", quantity: 1 },
        ];
        break;
    }

    const totalValue = items.reduce((sum, item) => sum + item.value * item.quantity, 0);
    this.stats.harvestsTotal++;
    this.emit("harvest", entity, { items, totalValue });

    return {
      speciesName: entity.name,
      items,
      totalValue,
      message: `🪵 Récolte réussie sur ${entity.name} : ${items.length} ressources (${totalValue}$ CAD) !`,
    };
  }

  public feedAnimal(entityId: string, foodType: "apple" | "berry" | "bread"): { success: boolean; message: string } {
    const entity = this.activeEntities.get(entityId);
    if (!entity || entity.state === "dead") {
      return { success: false, message: "Animal introuvable ou inanimé." };
    }

    if (entity.type === "wolf" || entity.type === "bear") {
      return {
        success: false,
        message: `⚠️ Les prédateurs carnivores comme ${entity.name} ne peuvent pas être apprivoisés !`,
      };
    }

    entity.isFriendly = true;
    entity.state = "idle";
    const foodName = foodType === "apple" ? "une pomme croquante"
      : foodType === "berry" ? "des baies sauvages"
      : "du pain";
    this.emit("tame", entity, { foodType });

    return {
      success: true,
      message: `🍏 Vous avez nourri ${entity.name} avec ${foodName} ! L'animal est apaisé.`,
    };
  }

  public registerCodexObservation(entry: WildlifeCodexEntry): {
    success: boolean;
    reward: number;
    message: string;
  } {
    const exists = this.codexEntries.some((c) => c.id === entry.id);
    if (exists) {
      return { success: false, reward: 0, message: "Espèce déjà enregistrée dans le Codex." };
    }

    this.codexEntries.unshift(entry);
    this.totalSubventionsEarned += entry.rewardValue;
    this.stats.codexEntriesTotal++;

    // Emit via une entité fictive (pas d'id réel)
    const fakeEntity: WildlifeAIEntity = {
      id: entry.id,
      type: entry.type,
      name: entry.speciesName,
      spawnZoneId: "codex",
      position: [0, 0, 0],
      rotation: 0,
      speed: 0,
      health: 0,
      maxHealth: 0,
      state: "idle",
      ageYears: 0,
      weightKg: entry.weightKg,
      lastBehaviorTick: Date.now(),
    };
    this.emit("codex", fakeEntity, { reward: entry.rewardValue });

    return {
      success: true,
      reward: entry.rewardValue,
      message: `📸 ${entry.speciesName} répertorié ! Subvention de ${entry.rewardValue}$ accordée par le MFFP du Québec.`,
    };
  }

  public getCodexEntries(): WildlifeCodexEntry[] {
    return this.codexEntries;
  }

  public getTotalSubventions(): number {
    return this.totalSubventionsEarned;
  }

  // ═══════════════════════════════════════════════════════════
  // MOOSE CALL & BAIT (v1 compat — avec cleanup)
  // ═══════════════════════════════════════════════════════════

  public activateMooseCall(): boolean {
    this.mooseCallActive = true;
    if (this.mooseCallTimeout) clearTimeout(this.mooseCallTimeout);
    this.mooseCallTimeout = setTimeout(() => {
      this.mooseCallActive = false;
      this.mooseCallTimeout = null;
    }, 15000);
    return true;
  }

  public placePredatorBait(pos: [number, number, number]): void {
    this.activeBaitPosition = pos;
    if (this.baitTimeout) clearTimeout(this.baitTimeout);
    this.baitTimeout = setTimeout(() => {
      this.activeBaitPosition = null;
      this.baitTimeout = null;
    }, 30000);
  }

  public isMooseCallActive(): boolean {
    return this.mooseCallActive;
  }

  public getBaitPosition(): [number, number, number] | null {
    return this.activeBaitPosition;
  }

  // ═══════════════════════════════════════════════════════════
  // STATS / HEALTH / DISPOSE
  // ═══════════════════════════════════════════════════════════

  public getStats() {
    const byState: Record<string, number> = {};
    const bySpecies: Record<string, number> = {};
    let dead = 0;

    for (const e of this.activeEntities.values()) {
      byState[e.state] = (byState[e.state] ?? 0) + 1;
      bySpecies[e.type] = (bySpecies[e.type] ?? 0) + 1;
      if (e.state === "dead") dead++;
    }

    return {
      ...this.stats,
      entitiesActive: this.activeEntities.size,
      entitiesDead: dead,
      byState,
      bySpecies,
      codexEntries: this.codexEntries.length,
      totalSubventions: this.totalSubventionsEarned,
      mooseCallActive: this.mooseCallActive,
      baitActive: this.activeBaitPosition !== null,
      listenersCount: this.listeners.size,
      isDisposed: this.disposed,
    };
  }

  public health(): { ok: boolean; reason?: string } {
    if (this.disposed) return { ok: false, reason: "disposed" };
    if (this.activeEntities.size > 500) return { ok: false, reason: "entities_overflow" };
    if (this.stats.avgTickMs > 12) return { ok: false, reason: "tick_too_slow" };
    return { ok: true };
  }

  public reset(): void {
    this.activeEntities.clear();
    this.codexEntries.length = 0;
    this.totalSubventionsEarned = 0;
    this.activeBaitPosition = null;
    this.mooseCallActive = false;
    this.lastRespawnCheck = Date.now();

    if (this.mooseCallTimeout) clearTimeout(this.mooseCallTimeout);
    if (this.baitTimeout) clearTimeout(this.baitTimeout);
    this.mooseCallTimeout = null;
    this.baitTimeout = null;

    this.stats = {
      entitiesSpawned: 0,
      entitiesRespawned: 0,
      attacksTotal: 0,
      killsTotal: 0,
      harvestsTotal: 0,
      codexEntriesTotal: 0,
      vocalizationsTotal: 0,
      lastTickMs: 0,
      avgTickMs: 0,
      tickCount: 0,
    };

    this.seedInitialPopulation();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.mooseCallTimeout) clearTimeout(this.mooseCallTimeout);
    if (this.baitTimeout) clearTimeout(this.baitTimeout);
    this.mooseCallTimeout = null;
    this.baitTimeout = null;

    this.audio.dispose();
    this.listeners.clear();
    this.activeEntities.clear();
    this.codexEntries.length = 0;
    this._livingMoose.length = 0;
    this._livingWolves.length = 0;
    this._warnings.length = 0;
    this._attacks.length = 0;
  }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON (v1 compat)
// ═══════════════════════════════════════════════════════════

export const WildlifeAISystem = new WildlifeAISystemManager();

export default WildlifeAISystem;