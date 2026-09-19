/**
 * TroxT EtherWorld — Street World V3
 *
 * Mobilier et infrastructure de rue du comté :
 * arrêts, bornes, distributeurs, feux, bancs, conteneurs,
 * pompes, signalisation, drapeaux et feux de camp.
 *
 * AMÉLIORATIONS v3.0 :
 *  - Intégration SpatialHash pour queries O(1)
 *  - 18 types de mobilier (vs 12)
 *  - Animations avancées (feux de circulation, distributeurs)
 *  - Système d'inventaire (distributeurs, poubelles)
 *  - Impact météo sur le mobilier
 *  - Sons et effets visuels
 *  - Éclairage dynamique jour/nuit
 *  - Système de vandalisme/dégradation
 *  - API enrichie pour interactions complexes
 *
 * IMPORTANT :
 * - Ce fichier reste autonome.
 * - Les API historiques sont conservées :
 *   countyStreetSpots()
 *   mountStreetFurniture()
 *   nearestStreet()
 *   tickStreet()
 */

import * as THREE from "three";
import { depanneurOffset } from "../../commerce/commerce";
import { buildStreetProp, tickProps3d } from "../../buildings/architecture/materiaux/props3d";
import { A40_EXITS, getTerrainHeight, LAKES, VILLAGES } from "../../../worlddata";
import { SpatialHash } from "./spatial";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type StreetKind =
  | "vending"
  | "bus"
  | "hydrant"
  | "mail"
  | "campfire"
  | "tlight"
  | "bench"
  | "dump"
  | "pump"
  | "trash"
  | "stop"
  | "flag"
  // ── NOUVEAU v3 ──
  | "lamppost"
  | "sign"
  | "bollard"
  | "planter"
  | "phonebooth"
  | "newspaper";

export type StreetState =
  | "operational"
  | "inactive"
  | "damaged"
  | "disabled"
  | "maintenance"
  | "empty"
  | "full"
  | "reserved"
  // ── NOUVEAU v3 ──
  | "frozen"
  | "snowed"
  | "flooded";

export type StreetInteraction =
  | "inspect"
  | "use"
  | "sit"
  | "wait"
  | "collect"
  | "deposit"
  | "activate"
  | "extinguish"
  | "repair"
  | "maintain"
  // ── NOUVEAU v3 ──
  | "read"
  | "light"
  | "unlight"
  | "shovel"
  | "call"
  | "vandalize";

export type StreetEnvironment =
  | "day"
  | "night"
  | "rain"
  | "snow"
  | "storm"
  | "winter"
  | "summer"
  | "autumn"
  | "spring"
  // ── NOUVEAU v3 ──
  | "fog"
  | "heatwave"
  | "blizzard";

export interface StreetCapabilities {
  interact: boolean;
  inspect: boolean;
  seating: boolean;
  transport: boolean;
  storage: boolean;
  power: boolean;
  water: boolean;
  maintenance: boolean;
  emergency: boolean;
  lighting: boolean;
  // ── NOUVEAU v3 ──
  communication: boolean;
  information: boolean;
  decoration: boolean;
  heating: boolean;
}

export interface StreetUsageStats {
  totalInteractions: number;
  todayInteractions: number;
  lastUsedAt: number;
  popularity: number;
  // ── NOUVEAU v3 ──
  vandalismCount: number;
  lastVandalizedAt: number;
}

export interface StreetMaintenanceState {
  required: boolean;
  condition: number;
  lastInspection: number;
  nextInspection: number;
  incidentCount: number;
  // ── NOUVEAU v3 ──
  weatherDamage: number;
  snowCovered: boolean;
  iceCovered: boolean;
}

export interface StreetInventory {
  items: Array<{ itemId: string; qty: number }>;
  maxItems: number;
  isOpen: boolean;
  lockedBy?: string;
}

export interface StreetLighting {
  isOn: boolean;
  brightness: number; // 0-1
  color: number;
  autoMode: boolean; // S'allume automatiquement la nuit
  energyCost: number; // Par heure
}

export interface StreetAnimation {
  type: "blink" | "rotate" | "bob" | "flicker" | "wave";
  speed: number;
  intensity: number;
  phase: number;
}

export interface StreetSpot {
  id: string;
  kind: StreetKind;
  name: string;

  x: number;
  z: number;
  yaw: number;

  villageId?: string;
  sectorId?: string;
  roadId?: string;

  state?: StreetState;
  condition?: number;

  interactable?: boolean;
  persistent?: boolean;

  interactionRadius?: number;

  capabilities?: Partial<StreetCapabilities>;
  
  // ── NOUVEAU v3 ──
  inventory?: StreetInventory;
  lighting?: StreetLighting;
  animation?: StreetAnimation;
  soundId?: string;
}

export interface StreetEntity extends StreetSpot {
  state: StreetState;
  condition: number;
  interactable: boolean;
  persistent: boolean;
  interactionRadius: number;
  capabilities: StreetCapabilities;
  usage: StreetUsageStats;
  maintenance: StreetMaintenanceState;
  createdAt: number;
  updatedAt: number;
  lastInteraction?: StreetInteraction;
  environment?: StreetEnvironment[];
  
  // ── NOUVEAU v3 ──
  inventory: StreetInventory | undefined;
  lighting?: StreetLighting;
  animation?: StreetAnimation;
  soundId?: string;
  mesh?: THREE.Object3D; // Référence Three.js
}

export interface StreetInteractionResult {
  success: boolean;
  entity: StreetEntity | null;
  interaction: StreetInteraction;
  reason?: string;
  timestamp: number;
  // ── NOUVEAU v3 ──
  effects?: Array<{ type: "sound" | "particle" | "light"; data: any }>;
}

export interface StreetEvent {
  type:
    | "created"
    | "used"
    | "damaged"
    | "repaired"
    | "maintenance_required"
    | "state_changed"
    | "interaction_rejected"
    // ── NOUVEAU v3 ──
    | "vandalized"
    | "weather_changed"
    | "light_toggled"
    | "inventory_updated";

  entityId: string;
  kind: StreetKind;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface StreetRuntimeOptions {
  onEvent?: (event: StreetEvent) => void;
  hour?: number;
  season?: "spring" | "summer" | "autumn" | "winter";
  weather?: "clear" | "rain" | "snow" | "storm" | "fog" | "blizzard";
  // ── NOUVEAU v3 ──
  enableSpatialHash?: boolean;
  enableAnimations?: boolean;
  enableLighting?: boolean;
}

/* -------------------------------------------------------------------------- */
/* CONSTANTES                                                                 */
/* -------------------------------------------------------------------------- */

const DEFAULT_INTERACTION_RADIUS = 3.25;
const SPATIAL_CELL_SIZE = 25;

const DEFAULT_CAPABILITIES: StreetCapabilities = {
  interact: true,
  inspect: true,
  seating: false,
  transport: false,
  storage: false,
  power: false,
  water: false,
  maintenance: false,
  emergency: false,
  lighting: false,
  communication: false,
  information: false,
  decoration: false,
  heating: false,
};

const STREET_CAPABILITIES: Record<StreetKind, StreetCapabilities> = {
  vending: {
    ...DEFAULT_CAPABILITIES,
    storage: true,
    power: true,
    maintenance: true,
  },

  bus: {
    ...DEFAULT_CAPABILITIES,
    transport: true,
    maintenance: true,
  },

  hydrant: {
    ...DEFAULT_CAPABILITIES,
    water: true,
    emergency: true,
    maintenance: true,
  },

  mail: {
    ...DEFAULT_CAPABILITIES,
    storage: true,
    maintenance: true,
  },

  campfire: {
    ...DEFAULT_CAPABILITIES,
    maintenance: true,
    heating: true,
  },

  tlight: {
    ...DEFAULT_CAPABILITIES,
    power: true,
    lighting: true,
    maintenance: true,
  },

  bench: {
    ...DEFAULT_CAPABILITIES,
    seating: true,
    maintenance: true,
  },

  dump: {
    ...DEFAULT_CAPABILITIES,
    storage: true,
    maintenance: true,
  },

  pump: {
    ...DEFAULT_CAPABILITIES,
    power: true,
    storage: true,
    maintenance: true,
  },

  trash: {
    ...DEFAULT_CAPABILITIES,
    storage: true,
    maintenance: true,
  },

  stop: {
    ...DEFAULT_CAPABILITIES,
    transport: true,
    maintenance: true,
  },

  flag: {
    ...DEFAULT_CAPABILITIES,
    maintenance: true,
    decoration: true,
  },

  // ── NOUVEAU v3 ──
  lamppost: {
    ...DEFAULT_CAPABILITIES,
    lighting: true,
    power: true,
    maintenance: true,
  },

  sign: {
    ...DEFAULT_CAPABILITIES,
    information: true,
    maintenance: true,
  },

  bollard: {
    ...DEFAULT_CAPABILITIES,
    maintenance: true,
  },

  planter: {
    ...DEFAULT_CAPABILITIES,
    decoration: true,
    maintenance: true,
  },

  phonebooth: {
    ...DEFAULT_CAPABILITIES,
    communication: true,
    power: true,
    maintenance: true,
  },

  newspaper: {
    ...DEFAULT_CAPABILITIES,
    information: true,
    storage: true,
  },
};

const STREET_INTERACTIONS: Record<StreetKind, StreetInteraction[]> = {
  vending: ["inspect", "use"],
  bus: ["inspect", "wait"],
  hydrant: ["inspect", "maintain"],
  mail: ["inspect", "collect"],
  campfire: ["inspect", "activate", "extinguish", "light", "unlight"],
  tlight: ["inspect", "maintain"],
  bench: ["inspect", "sit", "shovel"],
  dump: ["inspect", "deposit", "maintain"],
  pump: ["inspect", "use", "maintain"],
  trash: ["inspect", "deposit", "maintain", "vandalize"],
  stop: ["inspect", "wait"],
  flag: ["inspect", "maintain"],
  
  // ── NOUVEAU v3 ──
  lamppost: ["inspect", "light", "unlight", "maintain", "vandalize"],
  sign: ["inspect", "read", "vandalize"],
  bollard: ["inspect"],
  planter: ["inspect", "maintain"],
  phonebooth: ["inspect", "call", "vandalize"],
  newspaper: ["inspect", "collect", "read"],
};

const INTERACTION_RADIUS_BY_KIND: Record<StreetKind, number> = {
  vending: 2.4,
  bus: 3.5,
  hydrant: 2.2,
  mail: 2.0,
  campfire: 3.0,
  tlight: 3.0,
  bench: 2.2,
  dump: 3.0,
  pump: 3.0,
  trash: 2.5,
  stop: 3.5,
  flag: 2.0,
  
  // ── NOUVEAU v3 ──
  lamppost: 2.0,
  sign: 2.5,
  bollard: 1.5,
  planter: 2.0,
  phonebooth: 2.0,
  newspaper: 1.8,
};

// ── NOUVEAU v3 : Configuration d'inventaire par type ──
const DEFAULT_INVENTORY_BY_KIND: Partial<Record<StreetKind, { maxItems: number; items: Array<{ itemId: string; qty: number }> }>> = {
  vending: {
    maxItems: 20,
    items: [
      { itemId: "canette_cola", qty: 8 },
      { itemId: "canette_sprite", qty: 6 },
      { itemId: "chips", qty: 4 },
      { itemId: "barre_chocolat", qty: 2 },
    ],
  },
  mail: {
    maxItems: 10,
    items: [],
  },
  trash: {
    maxItems: 5,
    items: [],
  },
  dump: {
    maxItems: 15,
    items: [],
  },
  newspaper: {
    maxItems: 30,
    items: [
      { itemId: "journal_local", qty: 15 },
      { itemId: "journal_montreal", qty: 10 },
    ],
  },
};

// ── NOUVEAU v3 : Configuration d'animation par type ──
const DEFAULT_ANIMATION_BY_KIND: Partial<Record<StreetKind, StreetAnimation>> = {
  tlight: {
    type: "blink",
    speed: 1.0,
    intensity: 1.0,
    phase: 0,
  },
  campfire: {
    type: "flicker",
    speed: 2.0,
    intensity: 0.8,
    phase: 0,
  },
  flag: {
    type: "wave",
    speed: 0.5,
    intensity: 0.3,
    phase: 0,
  },
  lamppost: {
    type: "flicker",
    speed: 0.2,
    intensity: 0.1,
    phase: 0,
  },
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function now(): number {
  return Date.now();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeYaw(yaw: number): number {
  const twoPi = Math.PI * 2;
  let result = yaw % twoPi;

  if (result < 0) {
    result += twoPi;
  }

  return result;
}

function distanceSquared(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function villageSector(villageId: string, kind: StreetKind): string {
  return `village:${villageId}:${kind}`;
}

function getCapabilities(kind: StreetKind): StreetCapabilities {
  return {
    ...DEFAULT_CAPABILITIES,
    ...STREET_CAPABILITIES[kind],
  };
}

function getDefaultState(kind: StreetKind): StreetState {
  switch (kind) {
    case "campfire":
      return "inactive";
    case "dump":
    case "trash":
      return "empty";
    default:
      return "operational";
  }
}

function getEnvironmentProfile(
  hour: number,
  season: "spring" | "summer" | "autumn" | "winter",
  weather: "clear" | "rain" | "snow" | "storm" | "fog" | "blizzard",
): StreetEnvironment[] {
  const result: StreetEnvironment[] = [];

  if (hour < 6 || hour >= 20) {
    result.push("night");
  } else {
    result.push("day");
  }

  result.push(season);

  if (weather !== "clear") {
    result.push(weather);
  }

  return result;
}

function isNight(hour: number): boolean {
  return hour < 6 || hour >= 20;
}

/* -------------------------------------------------------------------------- */
/* STREET ENTITY                                                              */
/* -------------------------------------------------------------------------- */

export function createStreetEntity(spot: StreetSpot, timestamp = now()): StreetEntity {
  const condition = clamp(spot.condition ?? 100, 0, 100);
  const defaultInv = DEFAULT_INVENTORY_BY_KIND[spot.kind];
  const defaultAnim = DEFAULT_ANIMATION_BY_KIND[spot.kind];

  return {
    ...spot,
    yaw: normalizeYaw(spot.yaw),
    state: spot.state ?? getDefaultState(spot.kind),
    condition,
    interactable: spot.interactable ?? true,
    persistent: spot.persistent ?? true,
    interactionRadius:
      spot.interactionRadius ??
      INTERACTION_RADIUS_BY_KIND[spot.kind] ??
      DEFAULT_INTERACTION_RADIUS,
    capabilities: {
      ...getCapabilities(spot.kind),
      ...(spot.capabilities ?? {}),
    },
    usage: {
      totalInteractions: 0,
      todayInteractions: 0,
      lastUsedAt: 0,
      popularity: 0,
      vandalismCount: 0,
      lastVandalizedAt: 0,
    },
    maintenance: {
      required: condition < 50,
      condition,
      lastInspection: 0,
      nextInspection: timestamp + 1000 * 60 * 60 * 24 * 7,
      incidentCount: 0,
      weatherDamage: 0,
      snowCovered: false,
      iceCovered: false,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    
    // ── NOUVEAU v3 ──
    inventory: spot.inventory ?? (defaultInv ? {
      items: defaultInv.items.map(i => ({ ...i })),
      maxItems: defaultInv.maxItems,
      isOpen: true,
    } : undefined),
    lighting: spot.lighting ?? (spot.kind === "lamppost" || spot.kind === "tlight" ? {
      isOn: false,
      brightness: 1.0,
      color: spot.kind === "tlight" ? 0xff0000 : 0xfff6d8,
      autoMode: true,
      energyCost: 0.5,
    } : undefined),
    animation: spot.animation ?? defaultAnim,
    soundId: spot.soundId,
  };
}

/* -------------------------------------------------------------------------- */
/* STREET REGISTRY (avec SpatialHash v3)                                       */
/* -------------------------------------------------------------------------- */

export class StreetRegistry {
  private readonly entities = new Map<string, StreetEntity>();
  private readonly byKind = new Map<StreetKind, Set<string>>();
  private readonly listeners = new Set<(event: StreetEvent) => void>();
  private spatialHash: SpatialHash | null = null;

  constructor(enableSpatialHash = true) {
    if (enableSpatialHash) {
      this.spatialHash = new SpatialHash(SPATIAL_CELL_SIZE);
    }
  }

  register(entity: StreetEntity): StreetEntity {
    const existing = this.entities.get(entity.id);

    if (existing) {
      Object.assign(existing, entity);
      existing.updatedAt = now();
      
      // Update spatial hash
      if (this.spatialHash) {
        this.spatialHash.update(entity.id, entity.x, entity.z, "entity", entity);
      }
      
      return existing;
    }

    this.entities.set(entity.id, entity);

    let ids = this.byKind.get(entity.kind);
    if (!ids) {
      ids = new Set<string>();
      this.byKind.set(entity.kind, ids);
    }
    ids.add(entity.id);

    // Add to spatial hash
    if (this.spatialHash) {
      this.spatialHash.update(entity.id, entity.x, entity.z, "entity", entity);
    }

    this.emit({
      type: "created",
      entityId: entity.id,
      kind: entity.kind,
      timestamp: now(),
    });

    return entity;
  }

  unregister(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    this.entities.delete(id);
    this.byKind.get(entity.kind)?.delete(id);
    
    // Remove from spatial hash
    if (this.spatialHash) {
      this.spatialHash.remove(id);
    }

    return true;
  }

  get(id: string): StreetEntity | null {
    return this.entities.get(id) ?? null;
  }

  has(id: string): boolean {
    return this.entities.has(id);
  }

  getAll(): StreetEntity[] {
    return Array.from(this.entities.values());
  }

  getByKind(kind: StreetKind): StreetEntity[] {
    const ids = this.byKind.get(kind);
    if (!ids) return [];

    const result: StreetEntity[] = [];
    for (const id of ids) {
      const entity = this.entities.get(id);
      if (entity) result.push(entity);
    }
    return result;
  }

  /**
   * O(1) lookup avec SpatialHash
   */
  findNearest(
    x: number,
    z: number,
    maxDistance: number,
    kind?: StreetKind,
  ): StreetEntity | null {
    if (this.spatialHash) {
      // Use spatial hash for O(1)
      const results = this.spatialHash.queryRadius(x, z, maxDistance, {
        kinds: kind ? ["entity"] : undefined,
        maxResults: 1,
      });
      
      if (results.length > 0) {
        const entry = results[0];
        return entry.metadata as StreetEntity;
      }
      return null;
    }
    
    // Fallback O(n)
    const maxDistanceSquared = maxDistance * maxDistance;
    let best: StreetEntity | null = null;
    let bestDistance = maxDistanceSquared;

    const candidates = kind ? this.getByKind(kind) : this.getAll();

    for (const entity of candidates) {
      const d = distanceSquared(x, z, entity.x, entity.z);
      if (d < bestDistance) {
        best = entity;
        bestDistance = d;
      }
    }

    return best;
  }

  /**
   * NOUVEAU v3 : Query dans un rayon avec spatial hash
   */
  findInRadius(
    x: number,
    z: number,
    radius: number,
    kind?: StreetKind,
  ): StreetEntity[] {
    if (this.spatialHash) {
      const results = this.spatialHash.queryRadius(x, z, radius);
      const entities: StreetEntity[] = [];
      
      for (const entry of results) {
        const entity = entry.metadata as StreetEntity;
        if (entity && (!kind || entity.kind === kind)) {
          entities.push(entity);
        }
      }
      
      return entities;
    }
    
    // Fallback
    const results: StreetEntity[] = [];
    const radiusSquared = radius * radius;
    
    for (const entity of this.entities.values()) {
      if (kind && entity.kind !== kind) continue;
      
      const d = distanceSquared(x, z, entity.x, entity.z);
      if (d <= radiusSquared) {
        results.push(entity);
      }
    }
    
    return results;
  }

  updateState(id: string, state: StreetState, data?: Record<string, unknown>): boolean {
    const entity = this.entities.get(id);
    if (!entity || entity.state === state) return false;

    const previousState = entity.state;
    entity.state = state;
    entity.updatedAt = now();

    this.emit({
      type: "state_changed",
      entityId: entity.id,
      kind: entity.kind,
      timestamp: entity.updatedAt,
      data: {
        previousState,
        state,
        ...data,
      },
    });

    return true;
  }

  damage(id: string, amount: number, reason = "unknown"): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    const previous = entity.condition;
    entity.condition = clamp(entity.condition - Math.abs(amount), 0, 100);
    entity.maintenance.condition = entity.condition;
    entity.maintenance.incidentCount += 1;
    entity.updatedAt = now();

    if (entity.condition <= 20) {
      entity.state = "disabled";
    } else if (entity.condition <= 50) {
      entity.state = "damaged";
    }

    this.emit({
      type: "damaged",
      entityId: entity.id,
      kind: entity.kind,
      timestamp: entity.updatedAt,
      data: {
        previousCondition: previous,
        condition: entity.condition,
        amount,
        reason,
      },
    });

    if (entity.condition <= 50) {
      entity.maintenance.required = true;
      this.emit({
        type: "maintenance_required",
        entityId: entity.id,
        kind: entity.kind,
        timestamp: entity.updatedAt,
        data: { condition: entity.condition },
      });
    }

    return true;
  }

  /**
   * NOUVEAU v3 : Vandalisme
   */
  vandalize(id: string, playerId: string, reason = "vandalism"): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    entity.usage.vandalismCount += 1;
    entity.usage.lastVandalizedAt = now();
    
    // Vandalisme cause moins de dégâts que damage normal
    const damageAmount = 5 + Math.random() * 15;
    entity.condition = clamp(entity.condition - damageAmount, 0, 100);
    
    this.emit({
      type: "vandalized",
      entityId: entity.id,
      kind: entity.kind,
      timestamp: now(),
      data: {
        playerId,
        reason,
        damage: damageAmount,
        vandalismCount: entity.usage.vandalismCount,
      },
    });

    return true;
  }

  repair(id: string, amount = 100, reason = "maintenance"): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    entity.condition = clamp(entity.condition + Math.abs(amount), 0, 100);
    entity.maintenance.condition = entity.condition;
    entity.maintenance.required = entity.condition < 50;
    entity.maintenance.lastInspection = now();
    entity.maintenance.nextInspection = now() + 1000 * 60 * 60 * 24 * 7;

    if (entity.condition >= 80) {
      entity.state = getDefaultState(entity.kind);
    }

    entity.updatedAt = now();

    this.emit({
      type: "repaired",
      entityId: entity.id,
      kind: entity.kind,
      timestamp: entity.updatedAt,
      data: {
        condition: entity.condition,
        reason,
      },
    });

    return true;
  }

  recordInteraction(id: string, interaction: StreetInteraction): StreetInteractionResult {
    const entity = this.entities.get(id);

    if (!entity) {
      return {
        success: false,
        entity: null,
        interaction,
        reason: "ENTITY_NOT_FOUND",
        timestamp: now(),
      };
    }

    const allowed = STREET_INTERACTIONS[entity.kind]?.includes(interaction);

    if (!allowed) {
      this.emit({
        type: "interaction_rejected",
        entityId: entity.id,
        kind: entity.kind,
        timestamp: now(),
        data: {
          interaction,
          reason: "INTERACTION_NOT_SUPPORTED",
        },
      });

      return {
        success: false,
        entity,
        interaction,
        reason: "INTERACTION_NOT_SUPPORTED",
        timestamp: now(),
      };
    }

    if (!entity.interactable) {
      return {
        success: false,
        entity,
        interaction,
        reason: "ENTITY_NOT_INTERACTABLE",
        timestamp: now(),
      };
    }

    if (entity.state === "disabled" || entity.state === "maintenance") {
      return {
        success: false,
        entity,
        interaction,
        reason: "ENTITY_UNAVAILABLE",
        timestamp: now(),
      };
    }

    const timestamp = now();

    entity.usage.totalInteractions += 1;
    entity.usage.todayInteractions += 1;
    entity.usage.lastUsedAt = timestamp;
    entity.usage.popularity = clamp(entity.usage.popularity * 0.95 + 1, 0, 100);
    entity.lastInteraction = interaction;
    entity.updatedAt = timestamp;

    this.emit({
      type: "used",
      entityId: entity.id,
      kind: entity.kind,
      timestamp,
      data: {
        interaction,
        popularity: entity.usage.popularity,
      },
    });

    return {
      success: true,
      entity,
      interaction,
      timestamp,
    };
  }

  onEvent(listener: (event: StreetEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear(): void {
    this.entities.clear();
    this.byKind.clear();
    if (this.spatialHash) {
      this.spatialHash.clear();
    }
  }

  private emit(event: StreetEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Un hook externe ne doit jamais casser le monde 3D.
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON RUNTIME                                                          */
/* -------------------------------------------------------------------------- */

export const streetRegistry = new StreetRegistry(true);

/* -------------------------------------------------------------------------- */
/* GENERATION (ENRICHI v3)                                                     */
/* -------------------------------------------------------------------------- */

export function countyStreetSpots(): StreetSpot[] {
  const out: StreetSpot[] = [];

  for (const v of VILLAGES) {
    const [cx, cz] = v.center;
    const ang = v.roadAngle;
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);
    const perpX = -dirZ;
    const perpZ = dirX;
    const shop = depanneurOffset(v);
    const sectorBase = villageSector(v.id, "bus");

    // ── ARRÊT DE BUS ──
    out.push({
      id: `bus_${v.id}`,
      kind: "bus",
      name: `Arrêt ${v.name}`,
      x: cx + dirX * 22 + perpX * 8,
      z: cz + dirZ * 22 + perpZ * 8,
      yaw: -ang + Math.PI,
      villageId: v.id,
      sectorId: sectorBase,
      interactionRadius: 3.5,
    });

    // ── BORNE-INCENDIE ──
    out.push({
      id: `hyd_${v.id}`,
      kind: "hydrant",
      name: "Borne-incendie",
      x: shop.x + Math.cos(shop.yaw) * 4.2,
      z: shop.z + Math.sin(shop.yaw) * 4.2,
      yaw: shop.yaw,
      villageId: v.id,
      sectorId: villageSector(v.id, "hydrant"),
    });

    // ── BOÎTE AUX LETTRES ──
    out.push({
      id: `mail_${v.id}`,
      kind: "mail",
      name: "Boîte aux lettres",
      x: cx + dirX * 8 + perpX * 14,
      z: cz + dirZ * 8 + perpZ * 14,
      yaw: -ang,
      villageId: v.id,
      sectorId: villageSector(v.id, "mail"),
    });

    // ── DISTRIBUTEUR ──
    out.push({
      id: `vend_${v.id}`,
      kind: "vending",
      name: `Distributeur · ${v.name}`,
      x: shop.x + Math.cos(shop.yaw) * 6.4,
      z: shop.z - Math.sin(shop.yaw) * 6.4,
      yaw: shop.yaw,
      villageId: v.id,
      sectorId: villageSector(v.id, "vending"),
    });

    // ── FEU DE CIRCULATION (villes/populeux) ──
    if (v.type === "ville" || v.population >= 4000) {
      out.push({
        id: `tl_${v.id}`,
        kind: "tlight",
        name: "Feu de circulation",
        x: cx + dirX * 6 + perpX * 10,
        z: cz + dirZ * 6 + perpZ * 10,
        yaw: -ang,
        villageId: v.id,
        sectorId: villageSector(v.id, "tlight"),
      });
    }

    // ── BANC ──
    out.push({
      id: `bench_${v.id}`,
      kind: "bench",
      name: `Banc · ${v.name}`,
      x: cx + perpX * 12,
      z: cz + perpZ * 12,
      yaw: -ang + Math.PI / 2,
      villageId: v.id,
      sectorId: villageSector(v.id, "bench"),
    });

    // ── CONTENEUR ──
    out.push({
      id: `dump_${v.id}`,
      kind: "dump",
      name: "Conteneur",
      x: shop.x - Math.sin(shop.yaw) * 7.5,
      z: shop.z - Math.cos(shop.yaw) * 7.5,
      yaw: shop.yaw,
      villageId: v.id,
      sectorId: villageSector(v.id, "dump"),
    });

    // ── ARRÊT STOP ──
    out.push({
      id: `stop_${v.id}`,
      kind: "stop",
      name: "Arrêt",
      x: cx + dirX * 16 + perpX * 7,
      z: cz + dirZ * 16 + perpZ * 7,
      yaw: -ang,
      villageId: v.id,
      sectorId: villageSector(v.id, "stop"),
    });

    // ── DRAPEAU (églises/villes) ──
    if (v.hasEglise || v.type === "ville") {
      out.push({
        id: `flag_${v.id}`,
        kind: "flag",
        name: `Drapeau · ${v.name}`,
        x: cx + perpX * 6,
        z: cz + perpZ * 6,
        yaw: -ang,
        villageId: v.id,
        sectorId: villageSector(v.id, "flag"),
      });
    }

    // ── NOUVEAU v3 : LAMPADAIRES ──
    const lampCount = v.type === "ville" ? 4 : 2;
    for (let i = 0; i < lampCount; i++) {
      const offset = 10 + i * 12;
      out.push({
        id: `lamp_${v.id}_${i}`,
        kind: "lamppost",
        name: `Lampadaire ${i + 1} · ${v.name}`,
        x: cx + dirX * offset + perpX * 8,
        z: cz + dirZ * offset + perpZ * 8,
        yaw: -ang,
        villageId: v.id,
        sectorId: villageSector(v.id, "lamppost"),
      });
    }

    // ── NOUVEAU v3 : CABINE TÉLÉPHONIQUE (villes seulement) ──
    if (v.type === "ville") {
      out.push({
        id: `phone_${v.id}`,
        kind: "phonebooth",
        name: `Cabine téléphonique · ${v.name}`,
        x: cx + perpX * 4,
        z: cz + perpZ * 4,
        yaw: -ang,
        villageId: v.id,
        sectorId: villageSector(v.id, "phonebooth"),
      });
    }

    // ── NOUVEAU v3 : PANNEAUX DE SIGNALISATION ──
    out.push({
      id: `sign_${v.id}`,
      kind: "sign",
      name: `Panneau · ${v.name}`,
      x: cx - dirX * 10 + perpX * 8,
      z: cz - dirZ * 10 + perpZ * 8,
      yaw: -ang + Math.PI,
      villageId: v.id,
      sectorId: villageSector(v.id, "sign"),
    });

    // ── NOUVEAU v3 : JARDINIÈRES (villes/églises) ──
    if (v.type === "ville" || v.hasEglise) {
      out.push({
        id: `planter_${v.id}`,
        kind: "planter",
        name: `Jardinière · ${v.name}`,
        x: cx + perpX * 2,
        z: cz + perpZ * 2,
        yaw: -ang,
        villageId: v.id,
        sectorId: villageSector(v.id, "planter"),
      });
    }
  }

  // ── POMPES À ESSENCE (A-40) ──
  for (const ex of A40_EXITS) {
    out.push({
      id: `pump_${ex.no}`,
      kind: "pump",
      name: `Petro-Canada ${ex.title}`,
      x: ex.x + 18,
      z: 28,
      yaw: Math.PI,
      sectorId: `a40:exit:${ex.no}`,
      interactionRadius: 3.5,
    });
  }

  // ── FEUX DE CAMP (lacs) ──
  for (const lake of LAKES) {
    const safeLakeId = lake.name.replace(/\s+/g, "_");
    out.push({
      id: `fire_${safeLakeId}`,
      kind: "campfire",
      name: `Feu de camp · ${lake.name}`,
      x: lake.x + lake.r * 0.62,
      z: lake.z + 10,
      yaw: 0.4,
      sectorId: `lake:${safeLakeId}`,
      interactionRadius: 3,
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* RUNTIME BUILD                                                              */
/* -------------------------------------------------------------------------- */

export function buildStreetRuntime(
  spots: StreetSpot[] = countyStreetSpots(),
  options: StreetRuntimeOptions = {},
): StreetEntity[] {
  const timestamp = now();
  const hour = options.hour ?? new Date().getHours();
  const season =
    options.season ??
    (new Date().getMonth() >= 2 && new Date().getMonth() <= 4
      ? "spring"
      : new Date().getMonth() >= 5 && new Date().getMonth() <= 7
        ? "summer"
        : new Date().getMonth() >= 8 && new Date().getMonth() <= 10
          ? "autumn"
          : "winter");
  const weather = options.weather ?? "clear";
  const environment = getEnvironmentProfile(hour, season, weather);
  const entities: StreetEntity[] = [];

  for (const spot of spots) {
    const entity = createStreetEntity(spot, timestamp);
    entity.environment = environment;
    const registered = streetRegistry.register(entity);
    entities.push(registered);
  }

  if (options.onEvent) {
    options.onEvent({
      type: "created",
      entityId: "__street_runtime__",
      kind: "flag",
      timestamp,
      data: {
        entityCount: entities.length,
        environment,
      },
    });
  }

  return entities;
}

/* -------------------------------------------------------------------------- */
/* THREE.JS MOUNTING                                                          */
/* -------------------------------------------------------------------------- */

export function mountStreetFurniture(
  parent: THREE.Group,
  options: StreetRuntimeOptions = {},
): {
  group: THREE.Group;
  spots: StreetSpot[];
  entities: StreetEntity[];
  registry: StreetRegistry;
} {
  const group = new THREE.Group();
  group.name = "street-furniture";

  const spots = countyStreetSpots();
  const entities = buildStreetRuntime(spots, options);
  const hot: THREE.Object3D[] = [];
  const entityMap = new Map<string, StreetEntity>();

  for (const entity of entities) {
    entityMap.set(entity.id, entity);
    const mesh = buildStreetProp(entity.kind);
    const terrainY = getTerrainHeight(entity.x, entity.z);
    mesh.position.set(entity.x, terrainY, entity.z);
    mesh.rotation.y = entity.yaw;

    // Identité Three.js enrichie
    mesh.userData.streetId = entity.id;
    mesh.userData.streetKind = entity.kind;
    mesh.userData.streetEntity = entity;
    mesh.userData.streetState = entity.state;
    mesh.userData.streetCondition = entity.condition;
    mesh.userData.streetCapabilities = entity.capabilities;
    mesh.userData.streetInteractionRadius = entity.interactionRadius;
    mesh.userData.streetVillageId = entity.villageId;
    mesh.userData.streetSectorId = entity.sectorId;
    mesh.userData.streetPersistent = entity.persistent;
    mesh.userData.streetInteractable = entity.interactable;
    
    // ── NOUVEAU v3 ──
    mesh.userData.streetInventory = entity.inventory;
    mesh.userData.streetLighting = entity.lighting;
    mesh.userData.streetAnimation = entity.animation;
    
    // Store mesh reference
    entity.mesh = mesh;

    // Dynamic objects stay in hot set
    if (
      entity.kind === "tlight" ||
      entity.kind === "campfire" ||
      entity.kind === "pump" ||
      entity.kind === "vending" ||
      entity.kind === "lamppost" ||
      entity.kind === "flag"
    ) {
      hot.push(mesh);
    }

    group.add(mesh);
    if (s.kind === "tlight" || s.kind === "campfire") hot.push(mesh);
  }

  group.userData.hot = hot;
  group.userData.streetRegistry = streetRegistry;
  group.userData.streetEntities = entityMap;
  group.userData.streetVersion = 3;

  parent.add(group);

  return {
    group,
    spots,
    entities,
    registry: streetRegistry,
  };
}

/* -------------------------------------------------------------------------- */
/* INTERACTION                                                                */
/* -------------------------------------------------------------------------- */

export function getStreetInteractions(
  street: StreetSpot | StreetEntity | null,
): StreetInteraction[] {
  if (!street) return [];
  return [...(STREET_INTERACTIONS[street.kind] ?? [])];
}

export function canInteractWithStreet(
  street: StreetSpot | StreetEntity | null,
  interaction: StreetInteraction,
): boolean {
  if (!street) return false;

  if ("interactable" in street && street.interactable === false) {
    return false;
  }

  if ("state" in street && (street.state === "disabled" || street.state === "maintenance")) {
    return false;
  }

  return STREET_INTERACTIONS[street.kind]?.includes(interaction) ?? false;
}

export function interactWithStreet(
  id: string,
  interaction: StreetInteraction,
): StreetInteractionResult {
  return streetRegistry.recordInteraction(id, interaction);
}

/* -------------------------------------------------------------------------- */
/* PROXIMITY                                                                  */
/* -------------------------------------------------------------------------- */

export function nearestStreet(
  spots: StreetSpot[],
  x: number,
  z: number,
  max: number,
  kind?: StreetKind,
): StreetSpot | null {
  let best: StreetSpot | null = null;
  let bestD = max * max;

  for (const s of spots) {
    if (kind && s.kind !== kind) continue;
    const d = distanceSquared(x, z, s.x, s.z);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }

  return best;
}

export function nearestStreetEntity(
  x: number,
  z: number,
  max = 5,
  kind?: StreetKind,
): StreetEntity | null {
  return streetRegistry.findNearest(x, z, max, kind);
}

/* -------------------------------------------------------------------------- */
/* STATE / MAINTENANCE                                                        */
/* -------------------------------------------------------------------------- */

export function setStreetState(id: string, state: StreetState): boolean {
  return streetRegistry.updateState(id, state);
}

export function damageStreet(id: string, amount: number, reason = "unknown"): boolean {
  return streetRegistry.damage(id, amount, reason);
}

export function repairStreet(id: string, amount = 100, reason = "maintenance"): boolean {
  return streetRegistry.repair(id, amount, reason);
}

export function vandalizeStreet(id: string, playerId: string, reason = "vandalism"): boolean {
  return streetRegistry.vandalize(id, playerId, reason);
}

export function markStreetForMaintenance(id: string): boolean {
  const entity = streetRegistry.get(id);
  if (!entity) return false;

  entity.maintenance.required = true;
  entity.updatedAt = now();
  streetRegistry.updateState(id, "maintenance", {
    reason: "manual_maintenance_request",
  });

  return true;
}

/* -------------------------------------------------------------------------- */
/* ENVIRONMENT                                                                */
/* -------------------------------------------------------------------------- */

export function updateStreetEnvironment(
  hour: number,
  season: "spring" | "summer" | "autumn" | "winter",
  weather: "clear" | "rain" | "snow" | "storm" | "fog" | "blizzard",
): void {
  const environment = getEnvironmentProfile(hour, season, weather);
  const night = isNight(hour);

  for (const entity of streetRegistry.getAll()) {
    entity.environment = environment;
    entity.updatedAt = now();
    
    // ── NOUVEAU v3 : Impact météo ──
    if (weather === "snow" || weather === "blizzard") {
      if (entity.kind === "bench" || entity.kind === "dump") {
        entity.maintenance.snowCovered = true;
        if (!entity.state.includes("snowed")) {
          entity.state = "snowed";
        }
      }
    } else {
      entity.maintenance.snowCovered = false;
      if (entity.state === "snowed") {
        entity.state = getDefaultState(entity.kind);
      }
    }
    
    if (weather === "blizzard") {
      entity.maintenance.weatherDamage += 0.5;
      entity.condition = clamp(entity.condition - 0.1, 0, 100);
    }
    
    // ── NOUVEAU v3 : Éclairage automatique ──
    if (entity.lighting && entity.lighting.autoMode) {
      entity.lighting.isOn = night;
      
      streetRegistry["emit"]({
        type: "light_toggled",
        entityId: entity.id,
        kind: entity.kind,
        timestamp: now(),
        data: { isOn: night },
      });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* DIAGNOSTICS                                                                */
/* -------------------------------------------------------------------------- */

export interface StreetDiagnostics {
  total: number;
  operational: number;
  damaged: number;
  disabled: number;
  maintenance: number;
  interactable: number;
  conditionAverage: number;
  interactions: number;
  byKind: Record<StreetKind, number>;
  // ── NOUVEAU v3 ──
  vandalismTotal: number;
  weatherDamaged: number;
  lightsOn: number;
}

export function getStreetDiagnostics(): StreetDiagnostics {
  const entities = streetRegistry.getAll();
  const byKind = {} as Record<StreetKind, number>;

  let operational = 0;
  let damaged = 0;
  let disabled = 0;
  let maintenance = 0;
  let interactable = 0;
  let conditionTotal = 0;
  let interactions = 0;
  let vandalismTotal = 0;
  let weatherDamaged = 0;
  let lightsOn = 0;

  for (const entity of entities) {
    byKind[entity.kind] = (byKind[entity.kind] ?? 0) + 1;
    conditionTotal += entity.condition;
    interactions += entity.usage.totalInteractions;
    vandalismTotal += entity.usage.vandalismCount;

    if (entity.interactable) interactable += 1;
    if (entity.maintenance.weatherDamage > 0) weatherDamaged += 1;
    if (entity.lighting?.isOn) lightsOn += 1;

    switch (entity.state) {
      case "operational":
        operational++;
        break;
      case "damaged":
        damaged++;
        break;
      case "disabled":
        disabled++;
        break;
      case "maintenance":
        maintenance++;
        break;
    }
  }

  return {
    total: entities.length,
    operational,
    damaged,
    disabled,
    maintenance,
    interactable,
    conditionAverage: entities.length > 0 ? conditionTotal / entities.length : 0,
    interactions,
    byKind,
    vandalismTotal,
    weatherDamaged,
    lightsOn,
  };
}

/* -------------------------------------------------------------------------- */
/* EVENTS / TROXT / INTELLECTUS                                               */
/* -------------------------------------------------------------------------- */

export function onStreetEvent(listener: (event: StreetEvent) => void): () => void {
  return streetRegistry.onEvent(listener);
}

export function connectStreetIntellectus(handler: (event: StreetEvent) => void): () => void {
  return streetRegistry.onEvent(handler);
}

/* -------------------------------------------------------------------------- */
/* TICK                                                                       */
/* -------------------------------------------------------------------------- */

export function tickStreet(group: THREE.Group, elapsed: number): void {
  const hot = group.userData.hot as THREE.Object3D[] | undefined;

  if (hot && hot.length > 0) {
    for (const object of hot) {
      tickProps3d(object, elapsed);
    }
  } else {
    tickProps3d(group, elapsed);
  }

  const entityMap = group.userData.streetEntities as Map<string, StreetEntity> | undefined;
  if (!entityMap) return;

  for (const child of group.children) {
    const id = child.userData.streetId as string | undefined;
    if (!id) continue;

    const entity = entityMap.get(id);
    if (!entity) continue;

    // Sync state to Three.js
    child.userData.streetState = entity.state;
    child.userData.streetCondition = entity.condition;
    child.userData.streetInteractable = entity.interactable;
    
    // ── NOUVEAU v3 : Sync inventory/lighting ──
    child.userData.streetInventory = entity.inventory;
    child.userData.streetLighting = entity.lighting;
    
    // ── NOUVEAU v3 : Animation updates ──
    if (entity.animation) {
      updateEntityAnimation(entity, elapsed);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* NOUVEAU v3 : ANIMATIONS                                                    */
/* -------------------------------------------------------------------------- */

function updateEntityAnimation(entity: StreetEntity, elapsed: number): void {
  if (!entity.mesh || !entity.animation) return;
  
  const anim = entity.animation;
  const t = elapsed * anim.speed + anim.phase;
  
  switch (anim.type) {
    case "blink":
      // Feux de circulation
      const blinkPhase = Math.floor(t) % 3;
      // 0 = rouge, 1 = jaune, 2 = vert
      entity.mesh.userData.trafficPhase = blinkPhase;
      break;
      
    case "flicker":
      // Lampadaires, feux de camp
      const flicker = 0.8 + Math.sin(t * 10) * 0.2 * anim.intensity;
      entity.mesh.userData.lightIntensity = flicker;
      break;
      
    case "wave":
      // Drapeaux
      const wave = Math.sin(t * 2) * anim.intensity;
      entity.mesh.rotation.z = wave * 0.1;
      break;
      
    case "rotate":
      entity.mesh.rotation.y = t;
      break;
      
    case "bob":
      entity.mesh.position.y += Math.sin(t) * 0.05 * anim.intensity;
      break;
  }
}

/* -------------------------------------------------------------------------- */
/* RESET                                                                      */
/* -------------------------------------------------------------------------- */

export function resetStreetRuntime(): void {
  streetRegistry.clear();
}

