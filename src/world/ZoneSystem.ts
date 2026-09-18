// ═══════════════════════════════════════════════════════════════════════════
//  ZONE SYSTEM v2.0 — ZONES RP MULTI-JOUEURS (façon FiveM)
//  src/world/ZoneSystem.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Gestion multi-joueurs (une zone courante par playerId)
//  • Multi-zone overlap : autoroute + village = stack priorisé
//  • Spatial index accéléré (grid 200u) avec fallback borné
//  • Bounds global du monde (garde-fou positions aberrantes)
//  • Throttle update (configurable, par joueur)
//  • Spawn budget par heure / zone / type
//  • Radar de vitesse avec historique + tolérance
//  • API admin CRUD (add / update / remove runtime)
//  • Hooks événements : enter / exit / update
//  • Statistiques par zone (occupation, heat)
//  • Debug overlay minimap
//  • Sérialisation zones custom (persistance)
//  • Presets Portneuf & fabrique multi-villages
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────

export type ZoneType =
  | 'residentiel'
  | 'commercial'
  | 'industriel'
  | 'rural'
  | 'village'
  | 'foret'
  | 'fleuve'
  | 'autoroute'
  | 'route_principale'
  | 'urbain';

export type ZoneShape =
  | { kind: 'circle'; center: [number, number]; radius: number }
  | { kind: 'box'; min: [number, number]; max: [number, number] }
  | { kind: 'corridor'; points: Array<[number, number]>; width: number };

export interface SpawnRule {
  kind: 'npc' | 'vehicle' | 'animal';
  variant: string;
  density: number;
  maxActive: number;
  activeHours?: [number, number];
  weight?: number;
}

export interface ZoneRules {
  speedLimit: number;
  policeResponseSeconds: number;
  ambulanceResponseSeconds: number;
  allowCombat: boolean;
  allowBuild: boolean;
  allowVehicleSpawn: boolean;
  crimeMultiplier: number;
  wantedDecayMultiplier: number;
  safeZone: boolean;
}

export interface ZoneAmbience {
  fogDensity: number;
  fogColor: number;
  ambientSoundKey: string;
  windStrength: number;
  weatherBias: {
    clear: number;
    rain: number;
    snow: number;
    fog: number;
  };
}

export interface RPZone {
  id: string;
  name: string;
  type: ZoneType;
  shape: ZoneShape;
  priority: number;
  villageName?: string;
  rules: ZoneRules;
  ambience: ZoneAmbience;
  spawns: SpawnRule[];
  description: string;
  /** 🆕 Marque les zones ajoutées à chaud (non présentes au boot) */
  runtime?: boolean;
  /** 🆕 Timeout pour zones temporaires (event) */
  expiresAt?: number;
  /** 🆕 Tags (event, admin, quest...) */
  tags?: string[];
}

export interface ZoneTransition {
  playerId: string;
  from: RPZone | null;
  to: RPZone | null;
  at: number;
}

export interface ZoneStack {
  /** Toutes les zones actives à un point, triées par priorité DESC */
  zones: RPZone[];
  /** Zone gagnante (priorité max) */
  dominant: RPZone | null;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// ─────────────────────────────────────────────────────────────────────────
//  PRESETS (règles & ambiance)
// ─────────────────────────────────────────────────────────────────────────

const RULE_PRESETS: Record<ZoneType, ZoneRules> = {
  residentiel: {
    speedLimit: 50, policeResponseSeconds: 180, ambulanceResponseSeconds: 240,
    allowCombat: true, allowBuild: true, allowVehicleSpawn: true,
    crimeMultiplier: 1.0, wantedDecayMultiplier: 1.0, safeZone: false,
  },
  commercial: {
    speedLimit: 40, policeResponseSeconds: 120, ambulanceResponseSeconds: 180,
    allowCombat: true, allowBuild: false, allowVehicleSpawn: true,
    crimeMultiplier: 1.4, wantedDecayMultiplier: 0.8, safeZone: false,
  },
  industriel: {
    speedLimit: 50, policeResponseSeconds: 210, ambulanceResponseSeconds: 270,
    allowCombat: true, allowBuild: false, allowVehicleSpawn: true,
    crimeMultiplier: 1.6, wantedDecayMultiplier: 1.1, safeZone: false,
  },
  rural: {
    speedLimit: 70, policeResponseSeconds: 420, ambulanceResponseSeconds: 480,
    allowCombat: true, allowBuild: true, allowVehicleSpawn: true,
    crimeMultiplier: 0.8, wantedDecayMultiplier: 1.4, safeZone: false,
  },
  village: {
    speedLimit: 50, policeResponseSeconds: 300, ambulanceResponseSeconds: 360,
    allowCombat: true, allowBuild: true, allowVehicleSpawn: true,
    crimeMultiplier: 1.1, wantedDecayMultiplier: 1.0, safeZone: false,
  },
  foret: {
    speedLimit: 60, policeResponseSeconds: 600, ambulanceResponseSeconds: 720,
    allowCombat: true, allowBuild: true, allowVehicleSpawn: false,
    crimeMultiplier: 0.6, wantedDecayMultiplier: 2.0, safeZone: false,
  },
  fleuve: {
    speedLimit: 40, policeResponseSeconds: 480, ambulanceResponseSeconds: 540,
    allowCombat: false, allowBuild: false, allowVehicleSpawn: false,
    crimeMultiplier: 0.5, wantedDecayMultiplier: 1.6, safeZone: false,
  },
  autoroute: {
    speedLimit: 100, policeResponseSeconds: 150, ambulanceResponseSeconds: 200,
    allowCombat: false, allowBuild: false, allowVehicleSpawn: true,
    crimeMultiplier: 1.3, wantedDecayMultiplier: 0.7, safeZone: false,
  },
  route_principale: {
    speedLimit: 90, policeResponseSeconds: 240, ambulanceResponseSeconds: 300,
    allowCombat: true, allowBuild: false, allowVehicleSpawn: true,
    crimeMultiplier: 1.0, wantedDecayMultiplier: 0.9, safeZone: false,
  },
  urbain: {
    speedLimit: 50, policeResponseSeconds: 60, ambulanceResponseSeconds: 90,
    allowCombat: true, allowBuild: false, allowVehicleSpawn: true,
    crimeMultiplier: 1.8, wantedDecayMultiplier: 0.6, safeZone: false,
  },
};

const AMBIENCE_PRESETS: Record<ZoneType, ZoneAmbience> = {
  residentiel: {
    fogDensity: 0.0016, fogColor: 0x0a1020, ambientSoundKey: 'village',
    windStrength: 0.3, weatherBias: { clear: 0.6, rain: 0.2, snow: 0.15, fog: 0.05 },
  },
  commercial: {
    fogDensity: 0.0016, fogColor: 0x0c1222, ambientSoundKey: 'ville',
    windStrength: 0.25, weatherBias: { clear: 0.6, rain: 0.2, snow: 0.15, fog: 0.05 },
  },
  industriel: {
    fogDensity: 0.0024, fogColor: 0x141822, ambientSoundKey: 'industrie',
    windStrength: 0.35, weatherBias: { clear: 0.5, rain: 0.25, snow: 0.15, fog: 0.1 },
  },
  rural: {
    fogDensity: 0.0012, fogColor: 0x0a1220, ambientSoundKey: 'campagne',
    windStrength: 0.6, weatherBias: { clear: 0.62, rain: 0.18, snow: 0.15, fog: 0.05 },
  },
  village: {
    fogDensity: 0.0015, fogColor: 0x0a1020, ambientSoundKey: 'village',
    windStrength: 0.4, weatherBias: { clear: 0.6, rain: 0.2, snow: 0.15, fog: 0.05 },
  },
  foret: {
    fogDensity: 0.0032, fogColor: 0x0a1614, ambientSoundKey: 'foret',
    windStrength: 0.7, weatherBias: { clear: 0.45, rain: 0.25, snow: 0.18, fog: 0.12 },
  },
  fleuve: {
    fogDensity: 0.0026, fogColor: 0x0c1826, ambientSoundKey: 'fleuve',
    windStrength: 0.9, weatherBias: { clear: 0.5, rain: 0.22, snow: 0.13, fog: 0.15 },
  },
  autoroute: {
    fogDensity: 0.0011, fogColor: 0x0a1020, ambientSoundKey: 'autoroute',
    windStrength: 0.5, weatherBias: { clear: 0.65, rain: 0.18, snow: 0.14, fog: 0.03 },
  },
  route_principale: {
    fogDensity: 0.0013, fogColor: 0x0a1020, ambientSoundKey: 'route',
    windStrength: 0.45, weatherBias: { clear: 0.62, rain: 0.19, snow: 0.15, fog: 0.04 },
  },
  urbain: {
    fogDensity: 0.0020, fogColor: 0x101624, ambientSoundKey: 'ville',
    windStrength: 0.2, weatherBias: { clear: 0.6, rain: 0.22, snow: 0.14, fog: 0.04 },
  },
};

// ─────────────────────────────────────────────────────────────────────────
//  FABRIQUE DE ZONES
// ─────────────────────────────────────────────────────────────────────────

export function makeZone(
  id: string,
  name: string,
  type: ZoneType,
  shape: ZoneShape,
  opts: {
    priority?: number;
    villageName?: string;
    description?: string;
    rules?: Partial<ZoneRules>;
    ambience?: Partial<ZoneAmbience>;
    spawns?: SpawnRule[];
    tags?: string[];
  } = {},
): RPZone {
  return {
    id, name, type, shape,
    priority: opts.priority ?? 1,
    villageName: opts.villageName,
    description: opts.description ?? '',
    rules: { ...RULE_PRESETS[type], ...opts.rules },
    ambience: { ...AMBIENCE_PRESETS[type], ...opts.ambience },
    spawns: opts.spawns ?? defaultSpawns(type),
    tags: opts.tags,
  };
}

function defaultSpawns(type: ZoneType): SpawnRule[] {
  switch (type) {
    case 'village':
    case 'residentiel':
      return [
        { kind: 'npc', variant: 'civil', density: 8, maxActive: 12, activeHours: [7, 22] },
        { kind: 'vehicle', variant: 'sedan', density: 4, maxActive: 8 },
        { kind: 'vehicle', variant: 'pickup', density: 3, maxActive: 6 },
      ];
    case 'commercial':
      return [
        { kind: 'npc', variant: 'civil', density: 16, maxActive: 20, activeHours: [8, 21] },
        { kind: 'npc', variant: 'commercant', density: 3, maxActive: 4, activeHours: [8, 20] },
        { kind: 'vehicle', variant: 'sedan', density: 7, maxActive: 12 },
      ];
    case 'industriel':
      return [
        { kind: 'npc', variant: 'ouvrier', density: 10, maxActive: 14, activeHours: [6, 18] },
        { kind: 'vehicle', variant: 'camion', density: 5, maxActive: 8 },
        { kind: 'vehicle', variant: 'pickup', density: 3, maxActive: 5 },
      ];
    case 'rural':
      return [
        { kind: 'npc', variant: 'fermier', density: 2, maxActive: 4, activeHours: [5, 19] },
        { kind: 'vehicle', variant: 'tracteur', density: 1.5, maxActive: 3, activeHours: [6, 20] },
        { kind: 'vehicle', variant: 'pickup', density: 2, maxActive: 4 },
        { kind: 'animal', variant: 'chevreuil', density: 1.5, maxActive: 4, activeHours: [4, 9] },
      ];
    case 'foret':
      return [
        { kind: 'animal', variant: 'orignal', density: 0.8, maxActive: 3 },
        { kind: 'animal', variant: 'chevreuil', density: 2.5, maxActive: 6 },
        { kind: 'animal', variant: 'loup', density: 0.5, maxActive: 4, activeHours: [19, 6] },
        { kind: 'npc', variant: 'chasseur', density: 0.5, maxActive: 2, activeHours: [5, 18] },
      ];
    case 'autoroute':
      return [
        { kind: 'vehicle', variant: 'sedan', density: 12, maxActive: 18 },
        { kind: 'vehicle', variant: 'camion_lourd', density: 6, maxActive: 10 },
        { kind: 'vehicle', variant: 'policier', density: 0.8, maxActive: 2 },
      ];
    case 'route_principale':
      return [
        { kind: 'vehicle', variant: 'sedan', density: 8, maxActive: 14 },
        { kind: 'vehicle', variant: 'pickup', density: 4, maxActive: 8 },
        { kind: 'vehicle', variant: 'camion', density: 2, maxActive: 4 },
        { kind: 'vehicle', variant: 'policier', density: 0.5, maxActive: 1 },
      ];
    case 'urbain':
      return [
        { kind: 'npc', variant: 'civil', density: 30, maxActive: 40, activeHours: [6, 23] },
        { kind: 'vehicle', variant: 'sedan', density: 20, maxActive: 30 },
        { kind: 'vehicle', variant: 'taxi', density: 5, maxActive: 8 },
        { kind: 'vehicle', variant: 'policier', density: 2, maxActive: 4 },
      ];
    case 'fleuve':
      return [{ kind: 'vehicle', variant: 'bateau', density: 2, maxActive: 5, activeHours: [7, 20] }];
    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  GÉOMÉTRIE
// ─────────────────────────────────────────────────────────────────────────

export function pointInShape(x: number, z: number, shape: ZoneShape): boolean {
  switch (shape.kind) {
    case 'circle': {
      const dx = x - shape.center[0], dz = z - shape.center[1];
      return dx * dx + dz * dz <= shape.radius * shape.radius;
    }
    case 'box':
      return x >= shape.min[0] && x <= shape.max[0]
          && z >= shape.min[1] && z <= shape.max[1];
    case 'corridor': {
      const half = shape.width / 2;
      for (let i = 1; i < shape.points.length; i++) {
        const [x1, z1] = shape.points[i - 1];
        const [x2, z2] = shape.points[i];
        const A = x - x1, B = z - z1, C = x2 - x1, D = z2 - z1;
        const lenSq = C * C + D * D;
        let t = lenSq !== 0 ? (A * C + B * D) / lenSq : -1;
        t = Math.max(0, Math.min(1, t));
        const px = x1 + t * C, pz = z1 + t * D;
        if ((x - px) * (x - px) + (z - pz) * (z - pz) <= half * half) return true;
      }
      return false;
    }
  }
}

export function shapeArea(shape: ZoneShape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'box': return (shape.max[0] - shape.min[0]) * (shape.max[1] - shape.min[1]);
    case 'corridor': {
      let len = 0;
      for (let i = 1; i < shape.points.length; i++) {
        len += Math.hypot(
          shape.points[i][0] - shape.points[i - 1][0],
          shape.points[i][1] - shape.points[i - 1][1],
        );
      }
      return len * shape.width + Math.PI * (shape.width / 2) ** 2;
    }
  }
}

export function getZoneBounds(zone: RPZone): {
  minX: number; maxX: number; minZ: number; maxZ: number;
} {
  const s = zone.shape;
  switch (s.kind) {
    case 'circle':
      return {
        minX: s.center[0] - s.radius, maxX: s.center[0] + s.radius,
        minZ: s.center[1] - s.radius, maxZ: s.center[1] + s.radius,
      };
    case 'box':
      return { minX: s.min[0], maxX: s.max[0], minZ: s.min[1], maxZ: s.max[1] };
    case 'corridor': {
      const half = s.width / 2;
      const xs = s.points.map((p) => p[0]), zs = s.points.map((p) => p[1]);
      return {
        minX: Math.min(...xs) - half, maxX: Math.max(...xs) + half,
        minZ: Math.min(...zs) - half, maxZ: Math.max(...zs) + half,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  RADAR DE VITESSE (avec historique)
// ─────────────────────────────────────────────────────────────────────────

export interface SpeedViolation {
  speeding: boolean;
  limit: number;
  excess: number;
  fine: number;
  /** 🆕 Points de démérite au permis */
  demeritPoints: number;
  /** 🆕 Sévérité : 'minor' | 'major' | 'excessive' | 'criminal' */
  severity: 'minor' | 'major' | 'excessive' | 'criminal' | 'none';
}

export class SpeedRadar {
  private history = new Map<string, number[]>();
  private lastCheck = new Map<string, number>();
  private readonly tolerance = 5; // km/h
  private readonly checkCooldownMs = 250;

  /**
   * Vérifie la vitesse d'un joueur avec tolérance + historique.
   * Évite les faux positifs sur freinages brutaux.
   */
  check(
    playerId: string,
    speedKmh: number,
    pos: THREE.Vector3,
    system: ZoneSystem,
  ): SpeedViolation {
    const now = Date.now();
    const last = this.lastCheck.get(playerId) ?? 0;
    if (now - last < this.checkCooldownMs) {
      return this.emptyViolation();
    }
    this.lastCheck.set(playerId, now);

    // Historique glissant (5 dernières mesures)
    const hist = this.history.get(playerId) ?? [];
    hist.push(speedKmh);
    if (hist.length > 5) hist.shift();
    this.history.set(playerId, hist);

    // Moyenne mobile — évite le spam sur accélération
    const avg = hist.reduce((a, b) => a + b, 0) / hist.length;

    const zone = system.getDominantZoneAt(pos.x, pos.z);
    const limit = zone?.rules.speedLimit ?? 90;
    const excess = Math.max(0, avg - limit - this.tolerance);

    if (excess <= 0) return { ...this.emptyViolation(), limit };

    const { fine, demeritPoints, severity } = this.calculatePenalty(excess, limit);
    return { speeding: true, limit, excess: Math.round(excess), fine, demeritPoints, severity };
  }

  private emptyViolation(): SpeedViolation {
    return { speeding: false, limit: 0, excess: 0, fine: 0, demeritPoints: 0, severity: 'none' };
  }

  private calculatePenalty(excess: number, limit: number): {
    fine: number; demeritPoints: number; severity: SpeedViolation['severity'];
  } {
    // Barème québécois (simplifié)
    if (excess < 20) return { fine: 105, demeritPoints: 1, severity: 'minor' };
    if (excess < 40) return { fine: 225, demeritPoints: 2, severity: 'major' };
    if (excess < 60) return { fine: 495, demeritPoints: 4, severity: 'excessive' };
    if (limit <= 60 && excess >= 60) return { fine: 1500, demeritPoints: 6, severity: 'criminal' };
    return { fine: 1050, demeritPoints: 5, severity: 'excessive' };
  }

  reset(playerId: string): void {
    this.history.delete(playerId);
    this.lastCheck.delete(playerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ZONE SYSTEM — cœur
// ═══════════════════════════════════════════════════════════════════════════

export interface ZoneSystemConfig {
  /** Taille de la grid spatiale (unités) */
  gridSize: number;
  /** Bounds global du monde */
  bounds: WorldBounds;
  /** Intervalle min entre deux updates d'un joueur (ms) */
  playerUpdateIntervalMs: number;
  /** Active le debug overlay */
  debug: boolean;
}

const DEFAULT_CONFIG: ZoneSystemConfig = {
  gridSize: 200,
  bounds: { minX: -2000, maxX: 2000, minZ: -1500, maxZ: 500 },
  playerUpdateIntervalMs: 250,
  debug: false,
};

export class ZoneSystem {
  private zones: RPZone[] = [];
  private zonesById = new Map<string, RPZone>();

  /** 🆕 Zone courante par joueur */
  private playerZones = new Map<string, RPZone | null>();
  /** 🆕 Dernier timestamp d'update par joueur */
  private playerLastUpdate = new Map<string, number>();
  /** 🆕 Stack par joueur (multi-zone) */
  private playerStacks = new Map<string, RPZone[]>();

  private spatialIndex = new Map<string, RPZone[]>();
  private listeners: Array<(t: ZoneTransition) => void> = [];

  private config: ZoneSystemConfig;
  public radar = new SpeedRadar();

  private stats = {
    transitionsTotal: 0,
    updatesTotal: 0,
    spatialHits: 0,
    spatialMisses: 0,
  };

  constructor(config: Partial<ZoneSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ENREGISTREMENT
  // ─────────────────────────────────────────────────────────────────────────

  register(zone: RPZone): void {
    if (this.zonesById.has(zone.id)) {
      this.updateZone(zone.id, zone);
      return;
    }
    this.zones.push(zone);
    this.zonesById.set(zone.id, zone);
    this.indexZone(zone);
  }

  registerMany(zones: RPZone[]): void {
    zones.forEach((z) => this.register(z));
    this.zones.sort((a, b) => b.priority - a.priority);
    console.log(`🗺️ [Zones] ${this.zones.length} zones RP enregistrées (multi-joueur)`);
  }

  /** 🆕 Ajout dynamique (event, admin, quest) */
  registerRuntime(zone: RPZone, ttlMs?: number): void {
    zone.runtime = true;
    if (ttlMs) zone.expiresAt = Date.now() + ttlMs;
    this.register(zone);
    console.log(`🗺️ [Zones] Zone runtime ajoutée : ${zone.id}${ttlMs ? ` (TTL ${ttlMs}ms)` : ''}`);
  }

  /** 🆕 Mise à jour en place (règles, ambience, spawns) */
  updateZone(id: string, patch: Partial<RPZone>): boolean {
    const zone = this.zonesById.get(id);
    if (!zone) return false;

    Object.assign(zone, patch);
    // Réindexation si la forme a changé
    if (patch.shape) {
      this.deindexZone(zone);
      this.indexZone(zone);
    }
    return true;
  }

  /** 🆕 Suppression runtime */
  unregister(id: string): boolean {
    const zone = this.zonesById.get(id);
    if (!zone) return false;
    this.deindexZone(zone);
    this.zonesById.delete(id);
    this.zones = this.zones.filter((z) => z.id !== id);
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INDEX SPATIAL
  // ─────────────────────────────────────────────────────────────────────────

  private indexZone(zone: RPZone): void {
    const b = getZoneBounds(zone);
    const gx0 = Math.floor(b.minX / this.config.gridSize);
    const gx1 = Math.floor(b.maxX / this.config.gridSize);
    const gz0 = Math.floor(b.minZ / this.config.gridSize);
    const gz1 = Math.floor(b.maxZ / this.config.gridSize);

    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const key = `${gx}_${gz}`;
        let bucket = this.spatialIndex.get(key);
        if (!bucket) {
          bucket = [];
          this.spatialIndex.set(key, bucket);
        }
        if (!bucket.includes(zone)) bucket.push(zone);
      }
    }
  }

  private deindexZone(zone: RPZone): void {
    for (const bucket of this.spatialIndex.values()) {
      const i = bucket.indexOf(zone);
      if (i !== -1) bucket.splice(i, 1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  REQUÊTES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Stack complet des zones à un point (trié par priorité DESC).
   * Utile pour gameplay cumulé : autoroute + village + radar.
   */
  getZoneStackAt(x: number, z: number): ZoneStack {
    // 🆕 Vérif bounds global
    if (
      x < this.config.bounds.minX || x > this.config.bounds.maxX ||
      z < this.config.bounds.minZ || z > this.config.bounds.maxZ
    ) {
      this.stats.spatialMisses++;
      return { zones: [], dominant: null };
    }

    const key = `${Math.floor(x / this.config.gridSize)}_${Math.floor(z / this.config.gridSize)}`;
    const bucket = this.spatialIndex.get(key);

    // 🆕 Fallback borné : on ne scan plus TOUT, on retourne vide
    if (!bucket) {
      this.stats.spatialMisses++;
      return { zones: [], dominant: null };
    }

    this.stats.spatialHits++;
    const hits: RPZone[] = [];
    for (const zone of bucket) {
      if (zone.expiresAt && Date.now() > zone.expiresAt) continue;
      if (pointInShape(x, z, zone.shape)) hits.push(zone);
    }
    hits.sort((a, b) => b.priority - a.priority);

    return { zones: hits, dominant: hits[0] ?? null };
  }

  /** Zone gagnante (priorité max). Compat v1. */
  getZoneAt(x: number, z: number): RPZone | null {
    return this.getZoneStackAt(x, z).dominant;
  }

  /** 🆕 Alias explicite */
  getDominantZoneAt(x: number, z: number): RPZone | null {
    return this.getZoneAt(x, z);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  UPDATE PAR JOUEUR (avec throttle)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Update pour un joueur donné. Throttlé automatiquement.
   * @returns true si la zone dominante a changé
   */
  updatePlayer(playerId: string, pos: THREE.Vector3, force = false): boolean {
    const now = Date.now();
    const last = this.playerLastUpdate.get(playerId) ?? 0;
    if (!force && now - last < this.config.playerUpdateIntervalMs) {
      return false;
    }
    this.playerLastUpdate.set(playerId, now);
    this.stats.updatesTotal++;

    const stack = this.getZoneStackAt(pos.x, pos.z);
    const dominant = stack.dominant;
    const prev = this.playerZones.get(playerId) ?? null;

    this.playerStacks.set(playerId, stack.zones);

    if (dominant?.id !== prev?.id) {
      this.playerZones.set(playerId, dominant);
      this.stats.transitionsTotal++;

      const transition: ZoneTransition = {
        playerId,
        from: prev,
        to: dominant,
        at: now,
      };

      // 🆕 Émet même si `to` est null (sortie du monde)
      this.listeners.forEach((l) => {
        try { l(transition); } catch (err) {
          console.error('[Zones] listener error:', err);
        }
      });

      return true;
    }

    return false;
  }

  /** Compat v1 : update sur "le" joueur courant (legacy) */
  update(playerPos: THREE.Vector3): RPZone | null {
    this.updatePlayer('__legacy__', playerPos);
    return this.getCurrentZone('__legacy__');
  }

  getCurrentZone(playerId = '__legacy__'): RPZone | null {
    return this.playerZones.get(playerId) ?? null;
  }

  /** 🆕 Stack complet du joueur (multi-zone) */
  getPlayerStack(playerId: string): RPZone[] {
    return this.playerStacks.get(playerId) ?? [];
  }

  /** 🆕 Nettoyage à la déconnexion */
  removePlayer(playerId: string): void {
    this.playerZones.delete(playerId);
    this.playerStacks.delete(playerId);
    this.playerLastUpdate.delete(playerId);
    this.radar.reset(playerId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  LISTENERS
  // ─────────────────────────────────────────────────────────────────────────

  onZoneChange(listener: (t: ZoneTransition) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i !== -1) this.listeners.splice(i, 1);
    };
  }

  /** 🆕 Helper : filtrer par playerId */
  onPlayerZoneChange(playerId: string, listener: (t: ZoneTransition) => void): () => void {
    return this.onZoneChange((t) => {
      if (t.playerId === playerId) listener(t);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SPAWN BUDGET
  // ─────────────────────────────────────────────────────────────────────────

  getSpawnBudget(zone: RPZone, hour: number): Array<{ rule: SpawnRule; target: number }> {
    const area = shapeArea(zone.shape);
    return zone.spawns
      .filter((rule) => {
        if (!rule.activeHours) return true;
        const [start, end] = rule.activeHours;
        return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
      })
      .map((rule) => ({
        rule,
        target: Math.min(rule.maxActive, Math.round((area / 100_000) * rule.density)),
      }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RADAR VITESSE (wrapper)
  // ─────────────────────────────────────────────────────────────────────────

  checkSpeeding(speedKmh: number, pos: THREE.Vector3, playerId = '__legacy__') {
    return this.radar.check(playerId, speedKmh, pos, this);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  GARDE-FOUS DE RÈGLES
  // ─────────────────────────────────────────────────────────────────────────

  /** 🆕 Peut-on tirer ici ? */
  canFightAt(x: number, z: number): boolean {
    const z1 = this.getDominantZoneAt(x, z);
    return z1?.rules.allowCombat ?? true;
  }

  /** 🆕 Peut-on construire ici ? */
  canBuildAt(x: number, z: number): boolean {
    const z1 = this.getDominantZoneAt(x, z);
    return z1?.rules.allowBuild ?? true;
  }

  /** 🆕 Zone safe ? */
  isSafeAt(x: number, z: number): boolean {
    return this.getDominantZoneAt(x, z)?.rules.safeZone ?? false;
  }

  /** 🆕 Délai de réponse police effectif (min multi-zone) */
  getPoliceResponseAt(x: number, z: number): number {
    const stack = this.getZoneStackAt(x, z);
    if (stack.zones.length === 0) return 300;
    return Math.min(...stack.zones.map((zn) => zn.rules.policeResponseSeconds));
  }

  /** 🆕 Multiplicateur de crime cumulé (max multi-zone) */
  getCrimeMultiplierAt(x: number, z: number): number {
    const stack = this.getZoneStackAt(x, z);
    if (stack.zones.length === 0) return 1;
    return Math.max(...stack.zones.map((zn) => zn.rules.crimeMultiplier));
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  STATISTIQUES & DEBUG
  // ─────────────────────────────────────────────────────────────────────────

  getAllZones(): RPZone[] {
    return this.zones;
  }

  getZoneById(id: string): RPZone | null {
    return this.zonesById.get(id) ?? null;
  }

  getZones(): RPZone[] {
    return [...this.zones];
  }

  getStats() {
    return {
      ...this.stats,
      zonesTotal: this.zones.length,
      zonesRuntime: this.zones.filter((z) => z.runtime).length,
      playersTracked: this.playerZones.size,
      spatialBuckets: this.spatialIndex.size,
      gridSize: this.config.gridSize,
      bounds: this.config.bounds,
    };
  }

  /**
   * 🆕 Rendu minimap : renvoie les zones dans un viewport.
   * Utilisé par un composant React pour dessiner la minimap.
   */
  getZonesInViewport(
    minX: number, minZ: number, maxX: number, maxZ: number,
  ): Array<{ zone: RPZone; bounds: ReturnType<typeof getZoneBounds> }> {
    const out: Array<{ zone: RPZone; bounds: ReturnType<typeof getZoneBounds> }> = [];
    for (const zone of this.zones) {
      if (zone.expiresAt && Date.now() > zone.expiresAt) continue;
      const b = getZoneBounds(zone);
      if (b.maxX < minX || b.minX > maxX) continue;
      if (b.maxZ < minZ || b.minZ > maxZ) continue;
      out.push({ zone, bounds: b });
    }
    return out;
  }

  /** 🆕 Purge des zones expirées (à appeler périodiquement) */
  purgeExpired(): number {
    const now = Date.now();
    const expired = this.zones.filter((z) => z.expiresAt && now > z.expiresAt);
    for (const z of expired) this.unregister(z.id);
    return expired.length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SÉRIALISATION (persistance zones runtime)
  // ─────────────────────────────────────────────────────────────────────────

  serializeRuntimeZones(): string {
    const runtime = this.zones.filter((z) => z.runtime);
    return JSON.stringify(runtime);
  }

  restoreRuntimeZones(payload: string): number {
    try {
      const zones: RPZone[] = JSON.parse(payload);
      let count = 0;
      for (const z of zones) {
        if (!this.zonesById.has(z.id)) {
          this.registerRuntime(z);
          count++;
        }
      }
      return count;
    } catch (err) {
      console.error('[Zones] Erreur restauration zones runtime :', err);
      return 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  GÉNÉRATION DES ZONES DE PORTNEUF
// ═══════════════════════════════════════════════════════════════════════════

import { VILLAGE_PROFILES } from './VillageProfiles';

export function buildPortneufZones(): RPZone[] {
  const zones: RPZone[] = [];

  // ── Priorité 0 : fond large ──
  zones.push(makeZone('foret_nord', 'Forêt laurentienne', 'foret', {
    kind: 'box', min: [-1600, -1100], max: [1600, -350],
  }, {
    priority: 0,
    description: 'Forêt dense des contreforts laurentiens. Loups, orignaux, peu de secours.',
  }));

  zones.push(makeZone('campagne', 'Campagne de Portneuf', 'rural', {
    kind: 'box', min: [-1600, -350], max: [1600, 60],
  }, {
    priority: 0,
    description: 'Terres agricoles entre le fleuve et les collines.',
  }));

  zones.push(makeZone('fleuve_st_laurent', 'Fleuve Saint-Laurent', 'fleuve', {
    kind: 'box', min: [-1600, 60], max: [1600, 260],
  }, {
    priority: 0,
    description: 'Le fleuve. Navigation seulement.',
  }));

  // ── Priorité 2 : corridors routiers ──
  zones.push(makeZone('autoroute_40', 'Autoroute 40', 'autoroute', {
    kind: 'corridor',
    points: [
      [1500, -150], [1100, -158], [800, -145], [500, -152],
      [200, -140], [-100, -155], [-400, -148], [-700, -160],
      [-1000, -150], [-1300, -158], [-1500, -150],
    ],
    width: 60,
  }, {
    priority: 2,
    description: 'Autoroute Félix-Leclerc. 100 km/h, patrouilles fréquentes.',
    tags: ['highway', 'federal'],
  }));

  zones.push(makeZone('route_138', 'Route 138 — Chemin du Roy', 'route_principale', {
    kind: 'corridor',
    points: [
      [1500, 5], [1300, 0], [1100, 8], [900, 2], [700, 10],
      [600, 4], [400, 0], [200, 6], [0, 0], [-200, 8],
      [-300, 2], [-500, 0], [-700, 6], [-800, 0], [-1000, 4],
      [-1200, -2], [-1300, 0], [-1500, 5],
    ],
    width: 40,
  }, {
    priority: 2,
    description: 'Le Chemin du Roy longe le fleuve et traverse tous les villages.',
    tags: ['heritage', 'scenic'],
  }));

  // ── Priorité 4-6 : villages ──
  for (const profile of VILLAGE_PROFILES) {
    const [cx, cz] = profile.center;
    const isMetropole = profile.type === 'metropole';
    const coreRadius = isMetropole ? 320 : 60 + Math.sqrt(profile.population) * 1.6;
    const outerRadius = coreRadius * 2.4;

    zones.push(makeZone(
      `village_${slug(profile.name)}`,
      profile.name,
      isMetropole ? 'urbain' : 'village',
      { kind: 'circle', center: [cx, cz], radius: outerRadius },
      {
        priority: 4,
        villageName: profile.name,
        description: profile.description,
        tags: ['village', `terrain:${profile.terrain ?? 'plaine'}`],
        ambience: profile.terrain === 'montagne'
          ? { weatherBias: { clear: 0.42, rain: 0.22, snow: 0.24, fog: 0.12 } }
          : profile.terrain === 'plaine_fleuve'
          ? { weatherBias: { clear: 0.58, rain: 0.2, snow: 0.12, fog: 0.1 } }
          : {},
      },
    ));

    // Noyau commercial (priorité 6)
    if (profile.hasDepanneur || profile.hasCaisse) {
      zones.push(makeZone(
        `commerce_${slug(profile.name)}`,
        `Centre de ${profile.name}`,
        'commercial',
        { kind: 'circle', center: [cx, cz], radius: coreRadius * 0.75 },
        {
          priority: 6,
          villageName: profile.name,
          description: `Noyau commercial de ${profile.name}.`,
          tags: ['commerce', 'center'],
          rules: {
            policeResponseSeconds: isMetropole ? 45 : Math.round(90 + 8000 / profile.population),
          },
        },
      ));
    }

    // Zone industrielle
    if (profile.industry === 'papeterie' || profile.industry === 'carriere'
        || profile.industry === 'foresterie') {
      const offsets: Record<string, [number, number]> = {
        papeterie: [190, -85], carriere: [-230, -160], foresterie: [205, -95],
      };
      const [ox, oz] = offsets[profile.industry] ?? [150, -100];
      zones.push(makeZone(
        `industrie_${slug(profile.name)}`,
        industryLabel(profile.industry, profile.name),
        'industriel',
        { kind: 'circle', center: [cx + ox, cz + oz], radius: 130 },
        {
          priority: 6,
          villageName: profile.name,
          description: `Site industriel de ${profile.name}.`,
          tags: ['industry', profile.industry],
          spawns: [
            { kind: 'npc', variant: 'ouvrier', density: 14, maxActive: 16, activeHours: [6, 18] },
            { kind: 'vehicle', variant: 'camion_lourd', density: 6, maxActive: 8, activeHours: [6, 20] },
          ],
        },
      ));
    }
  }

  return zones;
}

function slug(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_');
}

function industryLabel(industry: string, village: string): string {
  const labels: Record<string, string> = {
    papeterie: `Usine de papier de ${village}`,
    carriere: `Carrière de ${village}`,
    foresterie: `Scierie de ${village}`,
  };
  return labels[industry] ?? `Zone industrielle de ${village}`;
}