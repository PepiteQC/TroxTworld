/**
 * TroxT EtherWorld — Street World V2
 *
 * Mobilier et infrastructure de rue du comté :
 * arrêts, bornes, distributeurs, feux, bancs, conteneurs,
 * pompes, signalisation, drapeaux et feux de camp.
 *
 * IMPORTANT :
 * - Ce fichier reste autonome.
 * - Aucune nouvelle dépendance externe.
 * - Les API historiques sont conservées :
 *   countyStreetSpots()
 *   mountStreetFurniture()
 *   nearestStreet()
 *   tickStreet()
 *
 * Architecture interne :
 *   Generation
 *      ↓
 *   StreetEntity
 *      ↓
 *   Runtime Registry
 *      ↓
 *   Interaction / State / Maintenance
 *      ↓
 *   TroxT / Intellectus hooks
 *      ↓
 *   Three.js presentation
 */

import * as THREE from "three";
import { depanneurOffset } from "./commerce";
import { buildStreetProp, tickProps3d } from "./props3d";
import { A40_EXITS, getTerrainHeight, LAKES, VILLAGES } from "./worlddata";

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
  | "flag";

export type StreetState =
  | "operational"
  | "inactive"
  | "damaged"
  | "disabled"
  | "maintenance"
  | "empty"
  | "full"
  | "reserved";

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
  | "maintain";

export type StreetEnvironment =
  | "day"
  | "night"
  | "rain"
  | "snow"
  | "storm"
  | "winter"
  | "summer"
  | "autumn"
  | "spring";

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
}

export interface StreetUsageStats {
  totalInteractions: number;
  todayInteractions: number;
  lastUsedAt: number;
  popularity: number;
}

export interface StreetMaintenanceState {
  required: boolean;
  condition: number;
  lastInspection: number;
  nextInspection: number;
  incidentCount: number;
}

export interface StreetSpot {
  id: string;
  kind: StreetKind;
  name: string;

  x: number;
  z: number;
  yaw: number;

  /**
   * Optional world metadata.
   * Existing callers do not need to provide these fields.
   */
  villageId?: string;
  sectorId?: string;
  roadId?: string;

  state?: StreetState;
  condition?: number;

  interactable?: boolean;
  persistent?: boolean;

  interactionRadius?: number;

  capabilities?: Partial<StreetCapabilities>;
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
}

export interface StreetInteractionResult {
  success: boolean;
  entity: StreetEntity | null;
  interaction: StreetInteraction;
  reason?: string;
  timestamp: number;
}

export interface StreetEvent {
  type:
    | "created"
    | "used"
    | "damaged"
    | "repaired"
    | "maintenance_required"
    | "state_changed"
    | "interaction_rejected";

  entityId: string;
  kind: StreetKind;

  timestamp: number;

  data?: Record<string, unknown>;
}

export interface StreetRuntimeOptions {
  /**
   * Hook générique vers TroxT Brain / Intellectus.
   *
   * Aucun import direct n'est nécessaire :
   * le système extérieur peut brancher sa propre fonction.
   */
  onEvent?: (event: StreetEvent) => void;

  /**
   * Heure de simulation 0–24.
   */
  hour?: number;

  /**
   * Saison actuelle.
   */
  season?: "spring" | "summer" | "autumn" | "winter";

  /**
   * Conditions météo.
   */
  weather?: "clear" | "rain" | "snow" | "storm";
}

/* -------------------------------------------------------------------------- */
/* CONSTANTES                                                                 */
/* -------------------------------------------------------------------------- */

const DEFAULT_INTERACTION_RADIUS = 3.25;

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
  },
};

const STREET_INTERACTIONS: Record<StreetKind, StreetInteraction[]> = {
  vending: ["inspect", "use"],
  bus: ["inspect", "wait"],
  hydrant: ["inspect", "maintain"],
  mail: ["inspect", "collect"],
  campfire: ["inspect", "activate", "extinguish"],
  tlight: ["inspect", "maintain"],
  bench: ["inspect", "sit"],
  dump: ["inspect", "deposit", "maintain"],
  pump: ["inspect", "use", "maintain"],
  trash: ["inspect", "deposit", "maintain"],
  stop: ["inspect", "wait"],
  flag: ["inspect", "maintain"],
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

function distanceSquared(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
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
  weather: "clear" | "rain" | "snow" | "storm",
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

/* -------------------------------------------------------------------------- */
/* STREET ENTITY                                                              */
/* -------------------------------------------------------------------------- */

export function createStreetEntity(
  spot: StreetSpot,
  timestamp = now(),
): StreetEntity {
  const condition = clamp(spot.condition ?? 100, 0, 100);

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
    },

    maintenance: {
      required: condition < 50,
      condition,
      lastInspection: 0,
      nextInspection: timestamp + 1000 * 60 * 60 * 24 * 7,
      incidentCount: 0,
    },

    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/* -------------------------------------------------------------------------- */
/* STREET REGISTRY                                                            */
/* -------------------------------------------------------------------------- */

export class StreetRegistry {
  private readonly entities = new Map<string, StreetEntity>();
  private readonly byKind = new Map<StreetKind, Set<string>>();
  private readonly listeners = new Set<(event: StreetEvent) => void>();

  register(entity: StreetEntity): StreetEntity {
    const existing = this.entities.get(entity.id);

    if (existing) {
      Object.assign(existing, entity);
      existing.updatedAt = now();
      return existing;
    }

    this.entities.set(entity.id, entity);

    let ids = this.byKind.get(entity.kind);

    if (!ids) {
      ids = new Set<string>();
      this.byKind.set(entity.kind, ids);
    }

    ids.add(entity.id);

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

    if (!entity) {
      return false;
    }

    this.entities.delete(id);
    this.byKind.get(entity.kind)?.delete(id);

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

    if (!ids) {
      return [];
    }

    const result: StreetEntity[] = [];

    for (const id of ids) {
      const entity = this.entities.get(id);

      if (entity) {
        result.push(entity);
      }
    }

    return result;
  }

  findNearest(
    x: number,
    z: number,
    maxDistance: number,
    kind?: StreetKind,
  ): StreetEntity | null {
    const maxDistanceSquared = maxDistance * maxDistance;

    let best: StreetEntity | null = null;
    let bestDistance = maxDistanceSquared;

    const candidates = kind
      ? this.getByKind(kind)
      : this.getAll();

    for (const entity of candidates) {
      const d = distanceSquared(x, z, entity.x, entity.z);

      if (d < bestDistance) {
        best = entity;
        bestDistance = d;
      }
    }

    return best;
  }

  updateState(
    id: string,
    state: StreetState,
    data?: Record<string, unknown>,
  ): boolean {
    const entity = this.entities.get(id);

    if (!entity || entity.state === state) {
      return false;
    }

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

  damage(
    id: string,
    amount: number,
    reason = "unknown",
  ): boolean {
    const entity = this.entities.get(id);

    if (!entity) {
      return false;
    }

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
        data: {
          condition: entity.condition,
        },
      });
    }

    return true;
  }

  repair(
    id: string,
    amount = 100,
    reason = "maintenance",
  ): boolean {
    const entity = this.entities.get(id);

    if (!entity) {
      return false;
    }

    entity.condition = clamp(entity.condition + Math.abs(amount), 0, 100);

    entity.maintenance.condition = entity.condition;
    entity.maintenance.required = entity.condition < 50;
    entity.maintenance.lastInspection = now();
    entity.maintenance.nextInspection =
      now() + 1000 * 60 * 60 * 24 * 7;

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

  recordInteraction(
    id: string,
    interaction: StreetInteraction,
  ): StreetInteractionResult {
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

    if (
      entity.state === "disabled" ||
      entity.state === "maintenance"
    ) {
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

    entity.usage.popularity = clamp(
      entity.usage.popularity * 0.95 + 1,
      0,
      100,
    );

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
  }

  private emit(event: StreetEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /**
         * Un hook externe ne doit jamais casser le monde 3D.
         */
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON RUNTIME                                                          */
/* -------------------------------------------------------------------------- */

export const streetRegistry = new StreetRegistry();

/* -------------------------------------------------------------------------- */
/* GENERATION                                                                 */
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
  }

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
    (
      new Date().getMonth() >= 2 &&
      new Date().getMonth() <= 4
        ? "spring"
        : new Date().getMonth() >= 5 &&
            new Date().getMonth() <= 7
          ? "summer"
          : new Date().getMonth() >= 8 &&
              new Date().getMonth() <= 10
            ? "autumn"
            : "winter"
    );

  const weather = options.weather ?? "clear";

  const environment = getEnvironmentProfile(
    hour,
    season,
    weather,
  );

  const entities: StreetEntity[] = [];

  for (const spot of spots) {
    const entity = createStreetEntity(
      spot,
      timestamp,
    );

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
/* THREE.JS MOUNTING                                                         */
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

  const entities = buildStreetRuntime(
    spots,
    options,
  );

  const hot: THREE.Object3D[] = [];

  const entityMap = new Map<string, StreetEntity>();

  for (const entity of entities) {
    entityMap.set(entity.id, entity);

    const mesh = buildStreetProp(entity.kind);

    const terrainY = getTerrainHeight(
      entity.x,
      entity.z,
    );

    mesh.position.set(
      entity.x,
      terrainY,
      entity.z,
    );

    mesh.rotation.y = entity.yaw;

    /*
     * Identité Three.js enrichie.
     *
     * Les anciens champs restent disponibles :
     * streetId
     * streetKind
     */
    mesh.userData.streetId = entity.id;
    mesh.userData.streetKind = entity.kind;

    mesh.userData.streetEntity = entity;
    mesh.userData.streetState = entity.state;
    mesh.userData.streetCondition = entity.condition;

    mesh.userData.streetCapabilities =
      entity.capabilities;

    mesh.userData.streetInteractionRadius =
      entity.interactionRadius;

    mesh.userData.streetVillageId =
      entity.villageId;

    mesh.userData.streetSectorId =
      entity.sectorId;

    mesh.userData.streetPersistent =
      entity.persistent;

    mesh.userData.streetInteractable =
      entity.interactable;

    /*
     * Les objets dynamiques restent dans le hot set.
     */
    if (
      entity.kind === "tlight" ||
      entity.kind === "campfire" ||
      entity.kind === "pump" ||
      entity.kind === "vending"
    ) {
      hot.push(mesh);
    }

    group.add(mesh);
  }

  group.userData.hot = hot;
  group.userData.streetRegistry = streetRegistry;
  group.userData.streetEntities = entityMap;
  group.userData.streetVersion = 2;

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
  street:
    | StreetSpot
    | StreetEntity
    | null,
): StreetInteraction[] {
  if (!street) {
    return [];
  }

  return [
    ...(STREET_INTERACTIONS[street.kind] ?? []),
  ];
}

export function canInteractWithStreet(
  street:
    | StreetSpot
    | StreetEntity
    | null,
  interaction: StreetInteraction,
): boolean {
  if (!street) {
    return false;
  }

  if (
    "interactable" in street &&
    street.interactable === false
  ) {
    return false;
  }

  if (
    "state" in street &&
    (
      street.state === "disabled" ||
      street.state === "maintenance"
    )
  ) {
    return false;
  }

  return (
    STREET_INTERACTIONS[street.kind]?.includes(
      interaction,
    ) ?? false
  );
}

export function interactWithStreet(
  id: string,
  interaction: StreetInteraction,
): StreetInteractionResult {
  return streetRegistry.recordInteraction(
    id,
    interaction,
  );
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
    if (kind && s.kind !== kind) {
      continue;
    }

    const d = distanceSquared(
      x,
      z,
      s.x,
      s.z,
    );

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
  return streetRegistry.findNearest(
    x,
    z,
    max,
    kind,
  );
}

/* -------------------------------------------------------------------------- */
/* STATE / MAINTENANCE                                                        */
/* -------------------------------------------------------------------------- */

export function setStreetState(
  id: string,
  state: StreetState,
): boolean {
  return streetRegistry.updateState(
    id,
    state,
  );
}

export function damageStreet(
  id: string,
  amount: number,
  reason = "unknown",
): boolean {
  return streetRegistry.damage(
    id,
    amount,
    reason,
  );
}

export function repairStreet(
  id: string,
  amount = 100,
  reason = "maintenance",
): boolean {
  return streetRegistry.repair(
    id,
    amount,
    reason,
  );
}

export function markStreetForMaintenance(
  id: string,
): boolean {
  const entity = streetRegistry.get(id);

  if (!entity) {
    return false;
  }

  entity.maintenance.required = true;
  entity.updatedAt = now();

  streetRegistry.updateState(
    id,
    "maintenance",
    {
      reason: "manual_maintenance_request",
    },
  );

  return true;
}

/* -------------------------------------------------------------------------- */
/* ENVIRONMENT                                                                */
/* -------------------------------------------------------------------------- */

export function updateStreetEnvironment(
  hour: number,
  season:
    | "spring"
    | "summer"
    | "autumn"
    | "winter",
  weather:
    | "clear"
    | "rain"
    | "snow"
    | "storm",
): void {
  const environment = getEnvironmentProfile(
    hour,
    season,
    weather,
  );

  for (const entity of streetRegistry.getAll()) {
    entity.environment = environment;
    entity.updatedAt = now();
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
}

export function getStreetDiagnostics(): StreetDiagnostics {
  const entities = streetRegistry.getAll();

  const byKind = {} as Record<
    StreetKind,
    number
  >;

  let operational = 0;
  let damaged = 0;
  let disabled = 0;
  let maintenance = 0;
  let interactable = 0;

  let conditionTotal = 0;
  let interactions = 0;

  for (const entity of entities) {
    byKind[entity.kind] =
      (byKind[entity.kind] ?? 0) + 1;

    conditionTotal += entity.condition;

    interactions +=
      entity.usage.totalInteractions;

    if (entity.interactable) {
      interactable += 1;
    }

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

    conditionAverage:
      entities.length > 0
        ? conditionTotal / entities.length
        : 0,

    interactions,

    byKind,
  };
}

/* -------------------------------------------------------------------------- */
/* EVENTS / TROXT / INTELLECTUS                                               */
/* -------------------------------------------------------------------------- */

export function onStreetEvent(
  listener: (event: StreetEvent) => void,
): () => void {
  return streetRegistry.onEvent(listener);
}

/**
 * Hook pratique pour TroxT Brain / Intellectus.
 *
 * Exemple :
 *
 * onStreetEvent((event) => {
 *   intellectus.record("street", event);
 * });
 *
 * Le système Street ne dépend donc d'aucun module AI.
 */
export function connectStreetIntellectus(
  handler: (
    event: StreetEvent,
  ) => void,
): () => void {
  return streetRegistry.onEvent(handler);
}

/* -------------------------------------------------------------------------- */
/* TICK                                                                       */
/* -------------------------------------------------------------------------- */

export function tickStreet(
  group: THREE.Group,
  elapsed: number,
): void {
  const hot =
    group.userData.hot as
      | THREE.Object3D[]
      | undefined;

  if (hot && hot.length > 0) {
    for (const object of hot) {
      tickProps3d(
        object,
        elapsed,
      );
    }
  } else {
    tickProps3d(
      group,
      elapsed,
    );
  }

  /*
   * Synchronisation légère entre le runtime
   * et les objets Three.js.
   *
   * Pas de logique lourde dans la boucle graphique.
   */
  const entityMap =
    group.userData.streetEntities as
      | Map<string, StreetEntity>
      | undefined;

  if (!entityMap) {
    return;
  }

  for (const child of group.children) {
    const id = child.userData.streetId as
      | string
      | undefined;

    if (!id) {
      continue;
    }

    const entity = entityMap.get(id);

    if (!entity) {
      continue;
    }

    /*
     * Ces valeurs permettent aux systèmes
     * UI / interaction / debug de lire l'état
     * directement depuis l'objet Three.js.
     */
    child.userData.streetState =
      entity.state;

    child.userData.streetCondition =
      entity.condition;

    child.userData.streetInteractable =
      entity.interactable;
  }
}

/* -------------------------------------------------------------------------- */
/* RESET                                                                      */
/* -------------------------------------------------------------------------- */

export function resetStreetRuntime(): void {
  streetRegistry.clear();
}