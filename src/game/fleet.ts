/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  FLEET & VEHICLE PHYSICS SYSTEM — GTA ROLEPLAY EDITION (v4.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Architecture: Single-file, True Zero-GC, SoA Hot-Path, Pure Arcade.
 *  Philosophy:   Every line serves gameplay. No dead code. No fluff.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { buildSedan } from "./architecture";

// ─────────────────────────────────────────────────────────────────────────────
// §1 — TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type VehicleCategory =
  | "compact" | "sedan" | "suv" | "muscle" | "sport" | "supercar"
  | "emergency" | "commercial" | "bike" | "offroad" | "van";

export type DamageZone =
  | "front" | "rear" | "left" | "right"
  | "roof" | "engine" | "fuel_tank"
  | "tire_fl" | "tire_fr" | "tire_rl" | "tire_rr"
  | "door_fl" | "door_fr" | "door_rl" | "door_rr"
  | "windshield" | "window_fl" | "window_fr" | "window_rl" | "window_rr";

export type EngineState = "OFF" | "STARTING" | "IDLE" | "RUNNING" | "STALLED" | "BROKEN";
export type LockState = "UNLOCKED" | "LOCKED" | "JAMMED" | "HOTWIRED";
export type AlarmState = "DISARMED" | "ARMED" | "TRIGGERED";
export type LightMode = "OFF" | "LOW" | "HIGH";
export type IndicatorMode = "OFF" | "LEFT" | "RIGHT" | "HAZARD";
export type SeatIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0=driver

export interface VehicleDefinition {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly category: VehicleCategory;

  // ── Physique (valeurs normalisées 0–100 sauf mention) ──
  readonly massKg: number;          // Masse réelle en kg
  readonly maxSpeedKmh: number;     // Vitesse max théorique
  readonly power: number;           // Puissance moteur (0–100)
  readonly torque: number;          // Couple (0–100)
  readonly grip: number;            // Adhérence pneus (0–100)
  readonly braking: number;         // Force de freinage (0–100)
  readonly handling: number;        // Maniabilité direction (0–100)
  readonly suspension: number;      // Rigidité suspension (0–100)
  readonly driftBias: number;       // Tendance au drift (0–100, muscle=high)

  // ── Capacités ──
  readonly seats: number;           // Nombre de places (1–8)
  readonly fuelCapacityL: number;   // Capacité réservoir en litres
  readonly trunkSlots: number;      // Slots inventaire coffre

  // ── Durabilité ──
  readonly maxBodyHealth: number;
  readonly maxEngineHealth: number;

  // ── Audio / FX ──
  readonly engineSound: string;
  readonly hornSound: string;
  readonly exhaustTone: "low" | "mid" | "high";

  // ── Legacy (pour compatibilité avec anciens modules) ──
  readonly mass: number;            // Alias massKg
  readonly maxSpeed: number;        // Alias maxSpeedKmh
  readonly accel: number;           // Accélération calculée 0-100
  readonly caisse: boolean;         // true si coffre fermé
  readonly forFirm: readonly string[]; // Types de firm compatibles
  readonly price: number;           // Prix d'achat
  readonly hint: string;            // Description courte
  readonly build: () => THREE.Group; // Builder 3D pour spawn
}

/**
 * État vivant d'un véhicule — conçu pour mutation en place (Zero-GC).
 * Les TypedArrays évitent les allocations pour les données numériques.
 */
export interface LiveVehicle {
  readonly id: string;
  readonly defId: string;
  plate: string;

  x: number; y: number; z: number;
  pitch: number; yaw: number; roll: number;

  vx: number; vy: number; vz: number;
  angularVel: number;
  speedKmh: number;

  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;

  engineState: EngineState;
  rpm: number;
  gear: number;
  engineTemp: number;

  fuelLevel: number;
  batteryLevel: number;

  bodyHealth: number;
  engineHealth: number;

  tires: Float32Array;
  doors: Uint8Array;
  windows: Uint8Array;

  lockState: LockState;
  alarmState: AlarmState;
  hotwireProgress: number;

  headlights: LightMode;
  indicators: IndicatorMode;
  brakeLights: boolean;
  reverseLights: boolean;
  sirenActive: boolean;

  driverId: string | null;
  passengers: (string | null)[];

  trunkItems: string[];

  ownerId: string | null;
  factionId: string | null;
  impounded: boolean;
  odometer: number;
  wantedLevel: number;
  driftScore: number;
  lastDamageTick: number;

  tuneEngine: number;
  tuneBrakes: number;
  tuneSuspension: number;
  tuneTurbo: number;
  tuneArmor: number;

  isEngineRunning: boolean;
  isLocked: boolean;
  isAlarmTriggered: boolean;
  isDrifting: boolean;
  isInAir: boolean;
  isOnFire: boolean;
  isSirenOn: boolean;
  isImpounded: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 — CONSTANTES & CONFIGURATION TUNABLE
// ─────────────────────────────────────────────────────────────────────────────

const CFG = {
  GRAVITY: 9.81,
  AIR_DRAG: 0.985,
  ROLLING_RESISTANCE: 0.012,
  MAX_STEER_RAD: 0.72,
  STEER_SPEED_DECAY: 0.65,
  DRIFT_SPEED_THRESHOLD: 35,
  DRIFT_GRIP_PENALTY: 0.45,
  DRIFT_YAW_MULTIPLIER: 2.8,
  DRIFT_SCORE_RATE: 12.0,
  DRIFT_SCORE_DECAY: 0.92,

  IDLE_RPM: 800,
  MAX_RPM: 8000,
  REDLINE_RPM: 7200,
  RPM_LERP_SPEED: 3.5,
  GEAR_UP_RPM: 6500,
  GEAR_DOWN_RPM: 2000,
  GEAR_UP_DROP: 0.62,
  GEAR_DOWN_BOOST: 1.38,
  STARTER_RPM_RATE: 2000,
  STALL_RPM: 200,

  FUEL_IDLE_RATE: 0.00008,
  FUEL_DRIVE_RATE: 0.00035,
  FUEL_THROTTLE_MULT: 2.5,

  TEMP_HEAT_RATE: 0.0008,
  TEMP_COOL_RATE: 0.0003,
  TEMP_OVERHEAT_THRESHOLD: 0.88,
  TEMP_CRITICAL_THRESHOLD: 0.96,

  DAMAGE_COLLISION_MULT: 1.4,
  DAMAGE_BULLET_MULT: 0.25,
  DAMAGE_EXPLOSION_MULT: 3.5,
  TIRE_BURST_THRESHOLD: 0,
  ENGINE_DAMAGE_THRESHOLD: 30,
  BODY_WRECK_THRESHOLD: 15,
  FIRE_HEALTH_THRESHOLD: 10,

  HOTWIRE_BASE_TIME_MS: 4500,
  HOTWIRE_SKILL_REDUCTION: 0.4,
  HOTWIRE_ALARM_CHANCE: 0.25,
  LOCK_JAM_DAMAGE: 45,

  IMPOUND_FINE_PER_STAR: 500,
  DRIFT_REWARD_THRESHOLD: 500,
  MAX_WANTED: 5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// §3 — REGISTRE DE FLOTTE (DÉFINITIONS STATIQUES)
// ─────────────────────────────────────────────────────────────────────────────

// Table de données brutes (sans legacy props)
interface RawVehicleDef {
  id: string; name: string; brand: string; category: VehicleCategory;
  massKg: number; maxSpeedKmh: number; power: number; torque: number;
  grip: number; braking: number; handling: number; suspension: number;
  driftBias: number; seats: number; fuelCapacityL: number; trunkSlots: number;
  maxBodyHealth: number; maxEngineHealth: number;
  engineSound: string; hornSound: string; exhaustTone: "low" | "mid" | "high";
}

const RAW_FLEET: readonly RawVehicleDef[] = [
  {
    id: "panto", name: "Panto", brand: "Benefactor", category: "compact",
    massKg: 900, maxSpeedKmh: 140, power: 35, torque: 30, grip: 72,
    braking: 55, handling: 80, suspension: 65, driftBias: 20,
    seats: 2, fuelCapacityL: 40, trunkSlots: 4,
    maxBodyHealth: 800, maxEngineHealth: 600,
    engineSound: "panto_idle", hornSound: "horn_standard", exhaustTone: "mid"
  },
  {
    id: "premier", name: "Premier", brand: "Declasse", category: "sedan",
    massKg: 1400, maxSpeedKmh: 180, power: 50, torque: 48, grip: 70,
    braking: 62, handling: 68, suspension: 60, driftBias: 25,
    seats: 4, fuelCapacityL: 55, trunkSlots: 8,
    maxBodyHealth: 1000, maxEngineHealth: 800,
    engineSound: "premier_idle", hornSound: "horn_standard", exhaustTone: "mid"
  },
  {
<<<<<<< HEAD
    id: "sq",
    name: "Intercepteur SQ",
    hint: "Gyrophare SQ · H pour les codes",
    price: 14200,
    maxSpeed: 46,
    accel: 20.5,
    grip: 1.12,
    mass: 1,
    caisse: false,
    pro: false,
    build: () => buildPolice(true),
=======
    id: "granger", name: "Granger", brand: "Declasse", category: "suv",
    massKg: 2400, maxSpeedKmh: 165, power: 55, torque: 70, grip: 62,
    braking: 58, handling: 52, suspension: 75, driftBias: 30,
    seats: 6, fuelCapacityL: 80, trunkSlots: 16,
    maxBodyHealth: 1500, maxEngineHealth: 1100,
    engineSound: "granger_idle", hornSound: "horn_truck", exhaustTone: "low"
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  },
  {
    id: "buffalo", name: "Buffalo S", brand: "Bravado", category: "muscle",
    massKg: 1650, maxSpeedKmh: 210, power: 78, torque: 85, grip: 68,
    braking: 60, handling: 58, suspension: 55, driftBias: 75,
    seats: 4, fuelCapacityL: 65, trunkSlots: 6,
    maxBodyHealth: 1100, maxEngineHealth: 900,
    engineSound: "buffalo_v8", hornSound: "horn_standard", exhaustTone: "low"
  },
  {
    id: "elegy", name: "Elegy RH8", brand: "Annis", category: "sport",
    massKg: 1350, maxSpeedKmh: 260, power: 82, torque: 72, grip: 85,
    braking: 80, handling: 82, suspension: 70, driftBias: 55,
    seats: 2, fuelCapacityL: 50, trunkSlots: 4,
    maxBodyHealth: 950, maxEngineHealth: 850,
    engineSound: "elegy_i6", hornSound: "horn_sport", exhaustTone: "high"
  },
  {
    id: "zentorno", name: "Zentorno", brand: "Pegassi", category: "supercar",
    massKg: 1200, maxSpeedKmh: 340, power: 95, torque: 80, grip: 92,
    braking: 90, handling: 88, suspension: 80, driftBias: 40,
    seats: 2, fuelCapacityL: 45, trunkSlots: 2,
    maxBodyHealth: 850, maxEngineHealth: 900,
    engineSound: "zentorno_v12", hornSound: "horn_sport", exhaustTone: "high"
  },
  {
    id: "sq_cruiser", name: "Auto-Patrouille", brand: "SQ", category: "emergency",
    massKg: 1800, maxSpeedKmh: 220, power: 75, torque: 68, grip: 78,
    braking: 82, handling: 72, suspension: 68, driftBias: 30,
    seats: 4, fuelCapacityL: 70, trunkSlots: 12,
    maxBodyHealth: 1200, maxEngineHealth: 1000,
    engineSound: "cruiser_v6", hornSound: "horn_siren", exhaustTone: "mid"
  },
  {
    id: "rumpo", name: "Rumpo Custom", brand: "Bravado", category: "van",
    massKg: 2800, maxSpeedKmh: 150, power: 45, torque: 65, grip: 58,
    braking: 50, handling: 45, suspension: 70, driftBias: 15,
    seats: 4, fuelCapacityL: 90, trunkSlots: 32,
    maxBodyHealth: 1600, maxEngineHealth: 1000,
    engineSound: "rumpo_diesel", hornSound: "horn_truck", exhaustTone: "low"
  },
  {
    id: "bifta", name: "Bifta", brand: "BF", category: "offroad",
    massKg: 1100, maxSpeedKmh: 160, power: 55, torque: 60, grip: 80,
    braking: 55, handling: 70, suspension: 90, driftBias: 45,
    seats: 2, fuelCapacityL: 50, trunkSlots: 6,
    maxBodyHealth: 900, maxEngineHealth: 750,
    engineSound: "bifta_flat4", hornSound: "horn_standard", exhaustTone: "mid"
  },
  {
    id: "sanctus", name: "Sanctus", brand: "LCC", category: "bike",
    massKg: 280, maxSpeedKmh: 195, power: 70, torque: 75, grip: 65,
    braking: 60, handling: 90, suspension: 50, driftBias: 85,
    seats: 2, fuelCapacityL: 15, trunkSlots: 2,
    maxBodyHealth: 500, maxEngineHealth: 450,
    engineSound: "sanctus_vtwin", hornSound: "horn_bike", exhaustTone: "low"
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// §3b — ENRICHISSEMENT DES DÉFINITIONS AVEC LEGACY PROPS
// ─────────────────────────────────────────────────────────────────────────────

const PRICES: Record<VehicleCategory, number> = {
  compact: 18000, sedan: 28000, suv: 45000, muscle: 65000,
  sport: 95000, supercar: 350000, emergency: 85000,
  commercial: 55000, bike: 12000, offroad: 38000, van: 42000,
};

const HINTS: Record<string, string> = {
  panto: "Compact urbain économique, parfait pour la ville.",
  premier: "Berline familiale fiable et confortable.",
  granger: "SUV robuste pour les routes de campagne.",
  buffalo: "Muscle car V8, reine du drift.",
  elegy: "Sportive japonaise, équilibrée et agile.",
  zentorno: "Supercar italienne, vitesse extrême.",
  sq_cruiser: "Auto-patrouille SQ, gyrophare intégré.",
  rumpo: "Van utilitaire, grande capacité cargo.",
  bifta: "Buggy tout-terrain, aventures hors-route.",
  sanctus: "Chopper custom, style outlaw.",
};

const COLORS: Record<VehicleCategory, number> = {
  compact: 0x4a90d9, sedan: 0x607080, suv: 0x2f4f4f, muscle: 0xc02020,
  sport: 0xe8c020, supercar: 0xd01010, emergency: 0x1e3a5f,
  commercial: 0xf0f0f0, bike: 0x2a2a2a, offroad: 0x8b7355, van: 0xe8e8e8,
};

function computeLegacy(raw: RawVehicleDef) {
  const powerToWeight = (raw.power * 10) / (raw.massKg / 1000);
  const accel = Math.min(100, Math.round(powerToWeight * 1.2));
  const caisse = raw.category === "van" || raw.category === "commercial" || raw.trunkSlots >= 12;

  let forFirm: string[];
  switch (raw.category) {
    case "van": case "commercial":
      forFirm = ["transport", "delivery", "construction", "moving"]; break;
    case "emergency":
      forFirm = ["police", "fire", "medical"]; break;
    case "suv": case "offroad":
      forFirm = ["security", "construction", "forestry"]; break;
    case "sedan": case "compact":
      forFirm = ["taxi", "delivery", "chauffeur"]; break;
    case "muscle": case "sport": case "supercar":
      forFirm = ["racing", "security", "chauffeur"]; break;
    case "bike":
      forFirm = ["delivery", "courier"]; break;
    default:
      forFirm = ["general"];
  }

  const color = COLORS[raw.category] ?? 0x808080;
  const build = (): THREE.Group => {
    const group = buildSedan(color);
    group.name = `vehicle_${raw.id}`;
    group.userData.vehicleId = raw.id;
    return group;
  };

  return {
    mass: raw.massKg,
    maxSpeed: raw.maxSpeedKmh,
    accel,
    caisse,
    forFirm: Object.freeze(forFirm) as readonly string[],
    price: PRICES[raw.category] ?? 30000,
    hint: HINTS[raw.id] ?? `${raw.brand} ${raw.name} — ${raw.category}`,
    build,
  };
}

// Construction du registre final avec toutes les propriétés
const _fleetMap = new Map<string, VehicleDefinition>();
const _builtFleet: VehicleDefinition[] = [];

for (const raw of RAW_FLEET) {
  const legacy = computeLegacy(raw);
  const def: VehicleDefinition = Object.freeze({ ...raw, ...legacy });
  _fleetMap.set(def.id, def);
  _builtFleet.push(def);
}

export const FLEET_REGISTRY: readonly VehicleDefinition[] = Object.freeze(_builtFleet);
export const FLEET = FLEET_REGISTRY;

export type VehicleId = typeof RAW_FLEET[number]["id"];

export function isVehicleId(id: string): id is VehicleId {
  return _fleetMap.has(id);
}

export function fleetById(id: string): VehicleDefinition {
  return _fleetMap.get(id) ?? _builtFleet[1]!;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3c — SOUS-LISTES CALLABLES (persoFleet / proFleet)
// ─────────────────────────────────────────────────────────────────────────────
// Ces arrays doivent être utilisables à la fois comme tableaux (filter, map)
// ET comme fonctions sans arguments (legacy: persoFleet()).

type CallableArray<T> = readonly T[] & (() => readonly T[]);

function makeCallable<T>(arr: readonly T[]): CallableArray<T> {
  const fn = (() => arr) as unknown as CallableArray<T>;
  const proto = Array.prototype;
  // Délégation via Proxy pour compatibilité totale avec les méthodes Array
  return new Proxy(fn, {
    get(target, prop, receiver) {
      // Accès fonction
      if (prop === "apply" || prop === "call" || prop === "bind" || prop === "length" && typeof (target as any)[prop] === "function") {
        return Reflect.get(target, prop, receiver);
      }
      if (prop === "length") return arr.length;
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        return (arr as any)[prop];
      }
      if (prop === Symbol.iterator) return arr[Symbol.iterator].bind(arr);
      if (prop in arr) {
        const val = (arr as any)[prop];
        if (typeof val === "function") return val.bind(arr);
        return val;
      }
      return Reflect.get(target, prop, receiver);
    },
    has(target, prop) {
      return prop in arr || prop in target;
    },
  });
}

export const persoFleet: CallableArray<VehicleDefinition> = makeCallable(
  FLEET_REGISTRY.filter((v) =>
    ["compact","sedan","suv","muscle","sport","supercar","bike","offroad"].includes(v.category)
  )
);

export const proFleet: CallableArray<VehicleDefinition> = makeCallable(
  FLEET_REGISTRY.filter((v) =>
    ["commercial","van","emergency"].includes(v.category)
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// §4 — GESTIONNAIRE DE FLOTTE (ZERO-GC STATE MACHINE)
// ─────────────────────────────────────────────────────────────────────────────

class FleetManager {
  private readonly _vehicles = new Map<string, LiveVehicle>();
  private readonly _vecA = { x: 0, y: 0, z: 0 };
  private readonly _vecB = { x: 0, y: 0, z: 0 };
  private readonly _radiusBuffer: string[] = [];
  private readonly _damageResult: { zone: DamageZone; severity: "light" | "medium" | "heavy" | "critical" } = {
    zone: "front", severity: "light"
  };
  private _tickCount = 0;

  public spawn(
    defId: string,
    x: number, y: number, z: number,
    yaw = 0,
    overrides?: Partial<LiveVehicle>
  ): LiveVehicle {
    const def = fleetById(defId);
    const id = overrides?.id ?? `v_${Date.now().toString(36)}_${(Math.random() * 0xFFFFFF >>> 0).toString(36)}`;

    const v: LiveVehicle = {
      id,
      defId: def.id,
      plate: overrides?.plate ?? FleetManager._genPlate(),
      x, y, z,
      pitch: 0, yaw, roll: 0,
      vx: 0, vy: 0, vz: 0,
      angularVel: 0,
      speedKmh: 0,
      throttle: 0, brake: 0, steer: 0, handbrake: false,
      engineState: "OFF",
      rpm: 0,
      gear: 0,
      engineTemp: 0.2,
      fuelLevel: overrides?.fuelLevel ?? 0.85,
      batteryLevel: 1.0,
      bodyHealth: def.maxBodyHealth,
      engineHealth: def.maxEngineHealth,
      tires: new Float32Array([100, 100, 100, 100]),
      doors: new Uint8Array([1, 1, 1, 1]),
      windows: new Uint8Array([1, 1, 1, 1, 1, 1]),
      lockState: overrides?.lockState ?? "LOCKED",
      alarmState: "DISARMED",
      hotwireProgress: 0,
      headlights: "OFF",
      indicators: "OFF",
      brakeLights: false,
      reverseLights: false,
      sirenActive: false,
      driverId: null,
      passengers: new Array(def.seats - 1).fill(null),
      trunkItems: [],
      ownerId: overrides?.ownerId ?? null,
      factionId: overrides?.factionId ?? null,
      impounded: false,
      odometer: overrides?.odometer ?? 0,
      wantedLevel: 0,
      driftScore: 0,
      lastDamageTick: 0,
      tuneEngine: 0, tuneBrakes: 0, tuneSuspension: 0, tuneTurbo: 0, tuneArmor: 0,
      isEngineRunning: false,
      isLocked: true,
      isAlarmTriggered: false,
      isDrifting: false,
      isInAir: false,
      isOnFire: false,
      isSirenOn: false,
      isImpounded: false,
    };

    this._vehicles.set(id, v);
    return v;
  }

  public despawn(id: string): boolean { return this._vehicles.delete(id); }
  public get(id: string): LiveVehicle | undefined { return this._vehicles.get(id); }
  public getAll(): IterableIterator<LiveVehicle> { return this._vehicles.values(); }
  public get count(): number { return this._vehicles.size; }

  public tick(dt: number): void {
    this._tickCount++;
    for (const v of this._vehicles.values()) {
      const def = fleetById(v.defId);
      this._tickEngine(v, def, dt);
      this._tickPhysics(v, def, dt);
      this._tickFuel(v, def, dt);
      this._tickTemperature(v, dt);

      if (v.speedKmh > 1) v.odometer += (v.speedKmh / 3600) * dt;

      if (!v.isDrifting && v.driftScore > 0) {
        v.driftScore *= CFG.DRIFT_SCORE_DECAY;
        if (v.driftScore < 1) v.driftScore = 0;
      }

      if (v.bodyHealth <= CFG.FIRE_HEALTH_THRESHOLD && !v.isOnFire) v.isOnFire = true;
      if (v.isOnFire) {
        v.bodyHealth -= 2 * dt;
        v.engineHealth -= 3 * dt;
        if (v.bodyHealth <= 0) {
          v.engineState = "BROKEN";
          v.isEngineRunning = false;
        }
      }
    }
  }

  private _tickPhysics(v: LiveVehicle, def: VehicleDefinition, dt: number): void {
    v.speedKmh = Math.sqrt(v.vx * v.vx + v.vy * v.vy) * 3.6;

    const tunePowerBonus = 1 + v.tuneEngine * 0.12 + v.tuneTurbo * 0.2;
    const effectivePower = def.power * tunePowerBonus;
    const engineForce = v.isEngineRunning ? effectivePower * v.throttle * 0.55 : 0;

    const tuneBrakeBonus = 1 + v.tuneBrakes * 0.15;
    const brakeForce = v.brake * def.braking * tuneBrakeBonus * 0.01 + (v.handbrake ? 0.35 : 0);

    const tuneHandlingBonus = 1 + v.tuneSuspension * 0.1;
    const speedFactor = 1 - Math.min(v.speedKmh / (def.maxSpeedKmh * 1.2), CFG.STEER_SPEED_DECAY);
    const steerAngle = CFG.MAX_STEER_RAD * v.steer * speedFactor * (def.handling / 100) * tuneHandlingBonus;

    const cosY = Math.cos(v.yaw);
    const sinY = Math.sin(v.yaw);

    const massFactor = 1000 / def.massKg;
    const accel = (engineForce - brakeForce * v.speedKmh * 0.04) * massFactor;
    v.vx += cosY * accel * dt;
    v.vy += sinY * accel * dt;

    const canSteer = v.speedKmh > 3 ? 1 : 0.25;
    v.yaw += steerAngle * canSteer * dt;
    v.angularVel = steerAngle * canSteer;

    const lateralVel = Math.abs(-sinY * v.vx + cosY * v.vy);
    const driftActive = v.handbrake
      && v.speedKmh > CFG.DRIFT_SPEED_THRESHOLD
      && lateralVel > 4
      && def.category !== "bike";

    v.isDrifting = driftActive;

    if (driftActive) {
      const driftGrip = (def.grip / 100) * CFG.DRIFT_GRIP_PENALTY;
      const frictionLoss = (1 - driftGrip) * dt * 2.5;
      v.vx *= 1 - frictionLoss;
      v.vy *= 1 - frictionLoss;
      const driftYaw = v.steer * CFG.DRIFT_YAW_MULTIPLIER * (def.driftBias / 100) * dt;
      v.yaw += driftYaw;
      v.driftScore += lateralVel * dt * CFG.DRIFT_SCORE_RATE;
    }

    const gripNorm = def.grip / 100;
    const drag = CFG.AIR_DRAG - (1 - gripNorm) * 0.015;
    v.vx *= drag;
    v.vy *= drag;

    let burstCount = 0;
    for (let i = 0; i < 4; i++) {
      if (v.tires[i]! <= CFG.TIRE_BURST_THRESHOLD) burstCount++;
    }
    if (burstCount > 0) {
      const penalty = 1 - burstCount * 0.08;
      v.vx *= penalty;
      v.vy *= penalty;
      v.roll = Math.sin(this._tickCount * 0.5) * 0.02 * burstCount;
    }

    v.x += v.vx * dt;
    v.y += v.vy * dt;

    const tuneTopSpeed = def.maxSpeedKmh * (1 + v.tuneEngine * 0.08 + v.tuneTurbo * 0.15);
    if (v.speedKmh > tuneTopSpeed) {
      const ratio = tuneTopSpeed / v.speedKmh;
      v.vx *= ratio;
      v.vy *= ratio;
    }

    v.brakeLights = v.brake > 0.1 || v.handbrake;
    v.reverseLights = v.gear === -1 && v.throttle < 0;
  }

  private _tickEngine(v: LiveVehicle, def: VehicleDefinition, dt: number): void {
    switch (v.engineState) {
      case "STARTING": {
        v.rpm += CFG.STARTER_RPM_RATE * dt;
        if (v.rpm > CFG.IDLE_RPM * 1.2) {
          if (v.fuelLevel > 0.01 && v.engineHealth > 0) {
            v.engineState = "RUNNING";
            v.isEngineRunning = true;
          } else {
            v.engineState = "STALLED";
            v.rpm = 0;
          }
        }
        break;
      }
      case "RUNNING": {
        const speedRPM = v.speedKmh * (30 + v.gear * 5);
        const throttleRPM = Math.abs(v.throttle) * 5500;
        const targetRPM = CFG.IDLE_RPM + throttleRPM + speedRPM * 0.3;
        v.rpm += (Math.min(targetRPM, CFG.MAX_RPM) - v.rpm) * CFG.RPM_LERP_SPEED * dt;
        v.rpm = Math.max(CFG.IDLE_RPM, Math.min(CFG.MAX_RPM, v.rpm));
        if (v.gear >= 0) {
          if (v.rpm > CFG.GEAR_UP_RPM && v.gear < 6) { v.gear++; v.rpm *= CFG.GEAR_UP_DROP; }
          else if (v.rpm < CFG.GEAR_DOWN_RPM && v.gear > 1) { v.gear--; v.rpm *= CFG.GEAR_DOWN_BOOST; }
        }
        if (v.gear > 0 && v.rpm < CFG.STALL_RPM && v.speedKmh < 5) {
          v.engineState = "STALLED";
          v.isEngineRunning = false;
          v.rpm = 0;
        }
        break;
      }
      case "IDLE": { v.rpm += (CFG.IDLE_RPM - v.rpm) * 2 * dt; break; }
      case "STALLED": { v.rpm *= 0.9; if (v.rpm < 10) v.rpm = 0; break; }
      case "BROKEN": case "OFF": { v.rpm = 0; v.isEngineRunning = false; break; }
    }
  }

  private _tickFuel(v: LiveVehicle, _def: VehicleDefinition, dt: number): void {
    if (!v.isEngineRunning) return;
    const throttleFactor = 1 + Math.abs(v.throttle) * CFG.FUEL_THROTTLE_MULT;
    const consumption = (CFG.FUEL_IDLE_RATE + CFG.FUEL_DRIVE_RATE * throttleFactor) * dt;
    v.fuelLevel = Math.max(0, v.fuelLevel - consumption);
    if (v.fuelLevel <= 0) {
      v.engineState = "STALLED";
      v.isEngineRunning = false;
    }
  }

  private _tickTemperature(v: LiveVehicle, dt: number): void {
    if (v.isEngineRunning) {
      const heatInput = Math.abs(v.throttle) * CFG.TEMP_HEAT_RATE * dt;
      const coolPassive = CFG.TEMP_COOL_RATE * dt;
      v.engineTemp = Math.min(1, Math.max(0, v.engineTemp + heatInput - coolPassive));
    } else {
      v.engineTemp = Math.max(0, v.engineTemp - CFG.TEMP_COOL_RATE * 0.5 * dt);
    }
    if (v.engineTemp > CFG.TEMP_OVERHEAT_THRESHOLD) v.engineHealth -= 0.5 * dt;
    if (v.engineTemp > CFG.TEMP_CRITICAL_THRESHOLD) {
      v.engineHealth -= 3 * dt;
      if (v.engineHealth <= 0) {
        v.engineHealth = 0;
        v.engineState = "BROKEN";
        v.isEngineRunning = false;
      }
    }
  }

  public startEngine(vehicleId: string, playerId: string, hasKey: boolean): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v) return false;
    if (v.driverId !== playerId) return false;
    if (v.engineState === "BROKEN") return false;
    if (v.engineState === "RUNNING") return true;
    if (v.fuelLevel <= 0.01) return false;
    if (v.lockState === "LOCKED" && !hasKey) return false;
    if (v.lockState === "JAMMED") return false;
    v.engineState = "STARTING";
    return true;
  }

  public stopEngine(vehicleId: string): void {
    const v = this._vehicles.get(vehicleId);
    if (!v) return;
    v.engineState = "OFF";
    v.isEngineRunning = false;
    v.rpm = 0;
  }

  public applyDamage(
    vehicleId: string,
    impactForce: number,
    impactX: number,
    impactY: number,
    impactZ: number,
    type: "collision" | "bullet" | "explosion" = "collision"
  ): { zone: DamageZone; severity: "light" | "medium" | "heavy" | "critical" } | null {
    const v = this._vehicles.get(vehicleId);
    if (!v) return null;

    const mult = type === "explosion" ? CFG.DAMAGE_EXPLOSION_MULT
      : type === "bullet" ? CFG.DAMAGE_BULLET_MULT : CFG.DAMAGE_COLLISION_MULT;
    const rawDamage = impactForce * mult;

    const cosY = Math.cos(v.yaw);
    const sinY = Math.sin(v.yaw);
    const dx = impactX - v.x;
    const dy = impactY - v.y;
    const localX = cosY * dx + sinY * dy;
    const localY = -sinY * dx + cosY * dy;

    let zone: DamageZone;
    let tireIdx = -1;

    if (Math.abs(localX) > 1.2 && Math.abs(localY) > 0.5) {
      tireIdx = localX > 0 ? (localY > 0 ? 0 : 1) : (localY > 0 ? 2 : 3);
      zone = (["tire_fl", "tire_fr", "tire_rl", "tire_rr"] as DamageZone[])[tireIdx]!;
    } else if (localX > 1.0) zone = "front";
    else if (localX < -1.0) zone = "rear";
    else if (localY > 0.4) zone = "right";
    else if (localY < -0.4) zone = "left";
    else zone = "front";

    const severity = rawDamage < 8 ? "light" : rawDamage < 22 ? "medium" : rawDamage < 45 ? "heavy" : "critical";

    const armorReduction = 1 - v.tuneArmor * 0.1;
    const finalDamage = rawDamage * armorReduction;

    v.bodyHealth = Math.max(0, v.bodyHealth - finalDamage * 0.35);
    v.lastDamageTick = this._tickCount;

    if (tireIdx >= 0) v.tires[tireIdx] = Math.max(0, v.tires[tireIdx]! - finalDamage * 1.2);
    else if (zone === "front") {
      v.engineHealth = Math.max(0, v.engineHealth - finalDamage * 0.25);
      if (finalDamage > 15) v.windows[4] = 0;
    } else if (zone === "rear") {
      v.engineHealth = Math.max(0, v.engineHealth - finalDamage * 0.1);
    } else if (zone === "left" || zone === "right") {
      const doorIdx = zone === "left" ? 0 : 1;
      if (finalDamage > 20) { v.doors[doorIdx] = 0; v.windows[doorIdx] = 0; }
    }

    if (v.engineHealth <= CFG.ENGINE_DAMAGE_THRESHOLD && v.isEngineRunning) {
      v.vx *= 0.8; v.vy *= 0.8;
    }
    if (v.engineHealth <= 0) {
      v.engineState = "BROKEN";
      v.isEngineRunning = false;
    }
    if (v.bodyHealth <= CFG.BODY_WRECK_THRESHOLD) v.isOnFire = true;

    if (zone === "rear" && finalDamage > 35 && v.fuelLevel > 0.25) {
      if (Math.random() < 0.08) {
        v.bodyHealth = 0;
        v.engineHealth = 0;
        v.isOnFire = true;
        v.engineState = "BROKEN";
        v.isEngineRunning = false;
      }
    }

    this._damageResult.zone = zone;
    this._damageResult.severity = severity;
    return this._damageResult;
  }

  public repair(vehicleId: string, zone: DamageZone | "all", amount: number): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v) return false;
    const def = fleetById(v.defId);
    if (zone === "all") {
      v.bodyHealth = Math.min(def.maxBodyHealth, v.bodyHealth + amount * (def.maxBodyHealth / 100));
      v.engineHealth = Math.min(def.maxEngineHealth, v.engineHealth + amount * (def.maxEngineHealth / 100));
      for (let i = 0; i < 4; i++) v.tires[i] = Math.min(100, v.tires[i]! + amount);
      for (let i = 0; i < 4; i++) v.doors[i] = 1;
      for (let i = 0; i < 6; i++) v.windows[i] = 1;
      v.engineTemp = 0.2;
      v.isOnFire = false;
      if (v.engineState === "BROKEN" && v.engineHealth > 0) v.engineState = "OFF";
      return true;
    }
    switch (zone) {
      case "engine":
        v.engineHealth = Math.min(def.maxEngineHealth, v.engineHealth + amount * (def.maxEngineHealth / 100));
        if (v.engineState === "BROKEN" && v.engineHealth > 0) v.engineState = "OFF"; break;
      case "tire_fl": v.tires[0] = Math.min(100, v.tires[0]! + amount); break;
      case "tire_fr": v.tires[1] = Math.min(100, v.tires[1]! + amount); break;
      case "tire_rl": v.tires[2] = Math.min(100, v.tires[2]! + amount); break;
      case "tire_rr": v.tires[3] = Math.min(100, v.tires[3]! + amount); break;
      case "door_fl": v.doors[0] = 1; break;
      case "door_fr": v.doors[1] = 1; break;
      case "door_rl": v.doors[2] = 1; break;
      case "door_rr": v.doors[3] = 1; break;
      case "windshield": v.windows[4] = 1; break;
      case "window_fl": v.windows[0] = 1; break;
      case "window_fr": v.windows[1] = 1; break;
      case "window_rl": v.windows[2] = 1; break;
      case "window_rr": v.windows[3] = 1; break;
      default:
        v.bodyHealth = Math.min(def.maxBodyHealth, v.bodyHealth + amount * (def.maxBodyHealth / 100));
    }
    return true;
  }

  public tryUnlock(
    vehicleId: string,
    playerId: string,
    hasKey: boolean,
    skillLevel = 0,
    deltaMs = 100
  ): { success: boolean; message: string; progress?: number } {
    const v = this._vehicles.get(vehicleId);
    if (!v) return { success: false, message: "Véhicule introuvable" };
    if (hasKey) {
      if (v.lockState === "JAMMED") return { success: false, message: "Serrure bloquée, faut un mécano" };
      v.lockState = "UNLOCKED";
      v.isLocked = false;
      return { success: true, message: "Déverrouillé" };
    }
    if (v.lockState === "UNLOCKED" || v.lockState === "HOTWIRED") {
      return { success: true, message: "Déjà ouvert" };
    }
    if (v.lockState === "JAMMED") return { success: false, message: "Serrure bloquée" };

    const timeNeeded = CFG.HOTWIRE_BASE_TIME_MS * (1 - skillLevel * CFG.HOTWIRE_SKILL_REDUCTION);
    const progressPerTick = (100 / timeNeeded) * deltaMs;
    v.hotwireProgress = Math.min(100, v.hotwireProgress + progressPerTick);
    if (v.hotwireProgress >= 100) {
      v.hotwireProgress = 0;
      v.lockState = "HOTWIRED";
      v.isLocked = false;
      if (v.alarmState === "ARMED" && Math.random() < CFG.HOTWIRE_ALARM_CHANCE) {
        v.alarmState = "TRIGGERED";
        v.isAlarmTriggered = true;
        return { success: true, message: "Hotwire réussi — Alarme déclenchée !", progress: 100 };
      }
      return { success: true, message: "Hotwire réussi", progress: 100 };
    }
    return { success: false, message: "Crochetage en cours...", progress: v.hotwireProgress };
  }

  public lock(vehicleId: string): void {
    const v = this._vehicles.get(vehicleId);
    if (!v) return;
    if (v.lockState === "JAMMED") return;
    v.lockState = "LOCKED";
    v.isLocked = true;
  }

  public setAlarm(vehicleId: string, armed: boolean): void {
    const v = this._vehicles.get(vehicleId);
    if (!v) return;
    v.alarmState = armed ? "ARMED" : "DISARMED";
    if (!armed) v.isAlarmTriggered = false;
  }

  public enterVehicle(vehicleId: string, playerId: string, seat: SeatIndex = 0): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v) return false;
    if (v.isLocked && v.lockState !== "UNLOCKED" && v.lockState !== "HOTWIRED") return false;
    if (seat === 0) {
      if (v.driverId !== null) return false;
      v.driverId = playerId;
      return true;
    }
    const passIdx = seat - 1;
    if (passIdx >= v.passengers.length) return false;
    if (v.passengers[passIdx] !== null) return false;
    v.passengers[passIdx] = playerId;
    return true;
  }

  public exitVehicle(vehicleId: string, playerId: string): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v) return false;
    if (v.driverId === playerId) {
      v.driverId = null;
      v.throttle = 0; v.brake = 0; v.steer = 0;
      v.handbrake = true;
      if (v.ownerId === playerId && v.lockState !== "HOTWIRED") {
        v.lockState = "LOCKED";
        v.isLocked = true;
      }
      return true;
    }
    for (let i = 0; i < v.passengers.length; i++) {
      if (v.passengers[i] === playerId) {
        v.passengers[i] = null;
        return true;
      }
    }
    return false;
  }

  public ejectAll(vehicleId: string): string[] {
    const v = this._vehicles.get(vehicleId);
    if (!v) return [];
    const ejected: string[] = [];
    if (v.driverId) { ejected.push(v.driverId); v.driverId = null; }
    for (let i = 0; i < v.passengers.length; i++) {
      if (v.passengers[i]) { ejected.push(v.passengers[i]!); v.passengers[i] = null; }
    }
    v.throttle = 0; v.brake = 0; v.steer = 0; v.handbrake = true;
    return ejected;
  }

  public addToTrunk(vehicleId: string, itemId: string): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v) return false;
    const def = fleetById(v.defId);
    if (v.trunkItems.length >= def.trunkSlots) return false;
    v.trunkItems.push(itemId);
    return true;
  }

  public removeFromTrunk(vehicleId: string, itemId: string): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v) return false;
    const idx = v.trunkItems.indexOf(itemId);
    if (idx === -1) return false;
    v.trunkItems.splice(idx, 1);
    return true;
  }

  public getTrunkItems(vehicleId: string): readonly string[] | null {
    return this._vehicles.get(vehicleId)?.trunkItems ?? null;
  }

  public refuel(vehicleId: string, liters: number): number {
    const v = this._vehicles.get(vehicleId);
    if (!v) return 0;
    const def = fleetById(v.defId);
    const currentLiters = v.fuelLevel * def.fuelCapacityL;
    const maxAdd = def.fuelCapacityL - currentLiters;
    const actual = Math.min(liters, maxAdd);
    v.fuelLevel = (currentLiters + actual) / def.fuelCapacityL;
    return actual;
  }

  public getFuelLiters(vehicleId: string): number {
    const v = this._vehicles.get(vehicleId);
    if (!v) return 0;
    return v.fuelLevel * fleetById(v.defId).fuelCapacityL;
  }

  public applyTuning(vehicleId: string, type: "engine" | "brakes" | "suspension" | "turbo" | "armor", level: number): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v) return false;
    const clamped = Math.max(0, Math.min(3, level));
    switch (type) {
      case "engine": v.tuneEngine = clamped; break;
      case "brakes": v.tuneBrakes = clamped; break;
      case "suspension": v.tuneSuspension = clamped; break;
      case "turbo": v.tuneTurbo = clamped; break;
      case "armor": v.tuneArmor = clamped; break;
    }
    return true;
  }

  public impound(vehicleId: string): { fine: number } | null {
    const v = this._vehicles.get(vehicleId);
    if (!v) return null;
    v.isImpounded = true;
    v.impounded = true;
    v.isLocked = true;
    v.lockState = "LOCKED";
    v.isEngineRunning = false;
    v.engineState = "OFF";
    this.ejectAll(vehicleId);
    return { fine: v.wantedLevel * CFG.IMPOUND_FINE_PER_STAR };
  }

  public releaseFromImpound(vehicleId: string, playerId: string): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v || !v.isImpounded) return false;
    if (v.ownerId !== playerId && v.factionId !== "police") return false;
    v.isImpounded = false;
    v.impounded = false;
    v.wantedLevel = 0;
    return true;
  }

  public setWantedLevel(vehicleId: string, level: number): void {
    const v = this._vehicles.get(vehicleId);
    if (!v) return;
    v.wantedLevel = Math.max(0, Math.min(CFG.MAX_WANTED, level));
  }

  public addWantedLevel(vehicleId: string, stars = 1): void {
    const v = this._vehicles.get(vehicleId);
    if (!v) return;
    v.wantedLevel = Math.min(CFG.MAX_WANTED, v.wantedLevel + stars);
  }

  public setHeadlights(vehicleId: string, mode: LightMode): void {
    const v = this._vehicles.get(vehicleId);
    if (v) v.headlights = mode;
  }

  public setIndicators(vehicleId: string, mode: IndicatorMode): void {
    const v = this._vehicles.get(vehicleId);
    if (v) v.indicators = mode;
  }

  public toggleSiren(vehicleId: string): boolean {
    const v = this._vehicles.get(vehicleId);
    if (!v) return false;
    const def = fleetById(v.defId);
    if (def.category !== "emergency") return false;
    v.isSirenOn = !v.isSirenOn;
    v.sirenActive = v.isSirenOn;
    return v.isSirenOn;
  }

  public getDistanceTo(vehicleId: string, px: number, py: number, pz: number): number {
    const v = this._vehicles.get(vehicleId);
    if (!v) return Infinity;
    const dx = v.x - px, dy = v.y - py, dz = v.z - pz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public getInRadius(px: number, py: number, pz: number, radius: number): string[] {
    const buf = this._radiusBuffer;
    buf.length = 0;
    const rSq = radius * radius;
    for (const [id, v] of this._vehicles) {
      const dx = v.x - px, dy = v.y - py, dz = v.z - pz;
      if (dx * dx + dy * dy + dz * dz <= rSq) buf.push(id);
    }
    return buf;
  }

  public getNearest(px: number, py: number, pz: number, maxRadius = Infinity): string | null {
    let bestId: string | null = null;
    let bestDistSq = maxRadius * maxRadius;
    for (const [id, v] of this._vehicles) {
      const dx = v.x - px, dy = v.y - py, dz = v.z - pz;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestId = id;
      }
    }
    return bestId;
  }

  public setOwner(vehicleId: string, ownerId: string | null): void {
    const v = this._vehicles.get(vehicleId);
    if (v) v.ownerId = ownerId;
  }

  public setFaction(vehicleId: string, factionId: string | null): void {
    const v = this._vehicles.get(vehicleId);
    if (v) v.factionId = factionId;
  }

  public serialize(vehicleId: string): Record<string, unknown> | null {
    const v = this._vehicles.get(vehicleId);
    if (!v) return null;
    return {
      id: v.id, defId: v.defId, plate: v.plate,
      pos: { x: v.x, y: v.y, z: v.z },
      rot: { pitch: v.pitch, yaw: v.yaw, roll: v.roll },
      bodyHealth: v.bodyHealth, engineHealth: v.engineHealth,
      fuelLevel: v.fuelLevel, engineTemp: v.engineTemp, odometer: v.odometer,
      tires: Array.from(v.tires), doors: Array.from(v.doors), windows: Array.from(v.windows),
      lockState: v.lockState, ownerId: v.ownerId, factionId: v.factionId,
      trunkItems: [...v.trunkItems],
      tuneEngine: v.tuneEngine, tuneBrakes: v.tuneBrakes,
      tuneSuspension: v.tuneSuspension, tuneTurbo: v.tuneTurbo, tuneArmor: v.tuneArmor,
    };
  }

  private static _genPlate(): string {
    const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
    const N = "0123456789";
    let p = "";
    for (let i = 0; i < 3; i++) p += L[(Math.random() * L.length) | 0];
    p += "-";
    for (let i = 0; i < 3; i++) p += N[(Math.random() * N.length) | 0];
    return p;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §5 — EXPORT SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

export const fleetManager = new FleetManager();
// ═══════════════════════════════════════════════════════════
// Export legacy — hasCaisse (pour compatibilité store.ts)
// ═══════════════════════════════════════════════════════════
export function hasCaisse(defId: string): boolean {
  const def = fleetById(defId);
  return def.caisse;
}
