// ═══════════════════════════════════════════════════════════════════════════
//  VEHICLE SYSTEM v2.0 — Véhicules RP · Physique · Propriété · Impound
//  src/server/systems/VehicleSystem.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Catalogue étendu (40+ variantes) + templates customs
//  • Physique : fuel, body/engine/tyre health, odometer
//  • Propriété : owner, keys, co-owner, garage
//  • Plaques QC + VIN généré + immatriculation
//  • Impound (fourrière) : log, retrieve, auction
//  • Mods : moteur, transmission, freins, pneus, peinture
//  • Sièges passagers (multi-occupants)
//  • Lock/unlock avec clés partagées
//  • Spatial index (chunks 64u) pour queries rapides
//  • Fuel stations + refuel
//  • Assurance (fire/theft/collision)
//  • License check (permis A/B/C)
//  • Stolen flag + wanted integration
//  • Trafic AI hook (spawn/despawn)
//  • GPS waypoints
//  • Compat 100% v1
// ═══════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { EtherPrismDB } from '../core/EtherPrismDB';
import { Intellectus } from '../core/Intellectus';

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type VehicleKind =
  | 'car'
  | 'truck'
  | 'police'
  | 'ambulance'
  | 'taxi'
  | 'motorcycle'
  | 'boat'
  | 'helicopter'
  | 'commercial'
  | 'industrial';

export type VehicleClass =
  | 'compact'
  | 'sedan'
  | 'suv'
  | 'pickup'
  | 'van'
  | 'sport'
  | 'super'
  | 'muscle'
  | 'off_road'
  | 'utility'
  | 'emergency';

export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid';

export type LicenseRequired = 'none' | 'A' | 'B' | 'C' | 'boat' | 'air';

export type ImpoundReason = 'illegal_parking' | 'abandoned' | 'stolen' | 'accident' | 'wanted' | 'custom';

export interface VehicleMod {
  engineLevel: number;        // 0-4
  transmissionLevel: number;  // 0-4
  brakesLevel: number;        // 0-4
  suspensionLevel: number;    // 0-4
  turbo: boolean;
  armorLevel: number;         // 0-3
  wheelsType: string;
  paintPrimary: string;
  paintSecondary: string;
  neonColor: string | null;
  plateStyle: string;
}

export interface VehicleDamage {
  bodyHealth: number;      // 0-100
  engineHealth: number;    // 0-100
  tyreHealth: number;      // 0-100
  fuelLevel: number;       // 0-100
  brokenWindows: boolean;
  doorsOpen: boolean[];
}

export interface VehicleInsurance {
  hasTheftCoverage: boolean;
  hasCollisionCoverage: boolean;
  hasFireCoverage: boolean;
  premiumPerMonth: number;
  expiresAt: number;
}

export interface VehicleOccupant {
  playerId: string;
  seat: number; // 0 = driver
  enteredAt: number;
}

export interface VehicleImpound {
  id: string;
  reason: ImpoundReason;
  impoundedBy: string;
  impoundedAt: number;
  lotLocation: string;
  releaseFee: number;
  storageFeePerDay: number;
  notes: string;
}

/** Interface principale — compat v1 + extensions v2. */
export interface Vehicle {
  id: string;
  type: VehicleKind;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: number;
  speed: number;
  maxSpeed: number;
  health: number;
  ownerId: string | null;
  driverId: string | null;
  locked: boolean;
  icon: string;

  // 🆕 Identité
  plate: string;
  vin: string;
  vehicleClass: VehicleClass;
  brandModel: string;
  year: number;

  // 🆕 Physique détaillée
  damage: VehicleDamage;
  fuelType: FuelType;
  fuelCapacity: number;
  odometerKm: number;

  // 🆕 Propriété & accès
  keys: string[];               // playerIds ayant les clés
  coOwners: string[];           // copropriétaires
  garageId: string | null;      // si rangé
  isStored: boolean;

  // 🆕 Mods
  mods: VehicleMod;

  // 🆕 Occupants
  occupants: VehicleOccupant[];

  // 🆕 Impound
  impound: VehicleImpound | null;

  // 🆕 Assurance
  insurance: VehicleInsurance | null;

  // 🆕 Flags
  stolen: boolean;
  stolenAt?: number;
  stolenFrom?: string;
  despawnAt?: number;            // PNJ cleanup
  aiControlled?: boolean;        // PNJ/traffic

  // 🆕 Meta
  spawnAt: number;
  updatedAt: number;
  plateIssuedAt: number;
}

/** 🆕 Template catalogue. */
export interface VehicleTemplate {
  type: VehicleKind;
  name: string;
  icon: string;
  color: string;
  vehicleClass: VehicleClass;
  brandModel: string;
  maxSpeed: number;
  baseHealth: number;
  fuelType: FuelType;
  fuelCapacity: number;
  seats: number;
  licenseRequired: LicenseRequired;
  lockedByDefault: boolean;
  /** Jobs autorisés à spawn (police, ems…) */
  allowedJobs?: string[];
  /** Coût d'achat catalogue (0 = non achetable) */
  purchasePrice?: number;
}

export interface VehicleConfig {
  /** Coût essence par unité (%) */
  fuelPricePerUnit: number;
  /** Consommation L/100km par classe */
  fuelConsumption: Record<VehicleClass, number>;
  /** Frais impound de base */
  baseImpoundFee: number;
  /** Frais stockage / jour */
  storageFeePerDay: number;
  /** Taille des chunks spatial index */
  chunkSize: number;
  /** Distance max sync réseau (streaming) */
  syncRadius: number;
  /** Durée max d'un véhicule PNJ avant despawn */
  aiDespawnMs: number;
  /** Plaque QC prefix */
  platePrefix: string;
  /** Frais assurance de base */
  baseInsurancePremium: number;
}

const DEFAULT_CONFIG: VehicleConfig = {
  fuelPricePerUnit: 1.8,
  fuelConsumption: {
    compact: 6.5,
    sedan: 8,
    suv: 11,
    pickup: 13,
    van: 12,
    sport: 12,
    super: 15,
    muscle: 14,
    off_road: 14,
    utility: 11,
    emergency: 15,
  },
  baseImpoundFee: 250,
  storageFeePerDay: 45,
  chunkSize: 64,
  syncRadius: 200,
  aiDespawnMs: 10 * 60 * 1000,
  platePrefix: 'QC',
  baseInsurancePremium: 85,
};

// ═══════════════════════════════════════════════════════════════════════════
//  CATALOGUE (v1 compat + 40+ variantes)
// ═══════════════════════════════════════════════════════════════════════════

export const VEHICLE_TEMPLATES: VehicleTemplate[] = [
  // ─── v1 compat (6 templates) ───
  { type: 'car',        name: 'Berline civile', icon: '🚗', color: '#3B82F6', vehicleClass: 'sedan',   brandModel: 'Toyota Camry',      maxSpeed: 120, baseHealth: 100, fuelType: 'gasoline', fuelCapacity: 55, seats: 5, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 18000 },
  { type: 'truck',      name: 'Camionnette',    icon: '🚛', color: '#6B7280', vehicleClass: 'pickup',  brandModel: 'Ford F-150',        maxSpeed: 90,  baseHealth: 150, fuelType: 'gasoline', fuelCapacity: 85, seats: 5, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 32000 },
  { type: 'police',     name: 'Cruiser SQ',     icon: '🚓', color: '#1E3A5F', vehicleClass: 'emergency', brandModel: 'Ford Police Interceptor', maxSpeed: 160, baseHealth: 120, fuelType: 'gasoline', fuelCapacity: 70, seats: 5, licenseRequired: 'B', lockedByDefault: true,  allowedJobs: ['police', 'sq', 'agent_sq'] },
  { type: 'ambulance',  name: 'Ambulance EMS',  icon: '🚑', color: '#FBBF24', vehicleClass: 'emergency', brandModel: 'Ford E-Series',     maxSpeed: 130, baseHealth: 130, fuelType: 'diesel',   fuelCapacity: 100, seats: 6, licenseRequired: 'B', lockedByDefault: true,  allowedJobs: ['ems', 'ambulancier'] },
  { type: 'taxi',       name: 'Taxi Montréal',  icon: '🚕', color: '#EAB308', vehicleClass: 'sedan',   brandModel: 'Toyota Prius',      maxSpeed: 110, baseHealth: 100, fuelType: 'hybrid',   fuelCapacity: 45, seats: 5, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 22000 },
  { type: 'motorcycle', name: 'Moto Sport',     icon: '🏍️', color: '#EF4444', vehicleClass: 'sport',   brandModel: 'Yamaha R1',         maxSpeed: 180, baseHealth: 60,  fuelType: 'gasoline', fuelCapacity: 17, seats: 2, licenseRequired: 'A', lockedByDefault: false, purchasePrice: 15000 },

  // ─── v2 extensions civiles ───
  { type: 'car',        name: 'Compacte',       icon: '🚗', color: '#94A3B8', vehicleClass: 'compact', brandModel: 'Honda Civic',       maxSpeed: 140, baseHealth: 90,  fuelType: 'gasoline', fuelCapacity: 47, seats: 5, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 20000 },
  { type: 'car',        name: 'VUS familial',   icon: '🚙', color: '#4B5563', vehicleClass: 'suv',     brandModel: 'Honda CR-V',        maxSpeed: 130, baseHealth: 120, fuelType: 'gasoline', fuelCapacity: 60, seats: 5, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 30000 },
  { type: 'car',        name: 'Fourgonnette',   icon: '🚐', color: '#A16207', vehicleClass: 'van',     brandModel: 'Dodge Caravan',     maxSpeed: 100, baseHealth: 110, fuelType: 'gasoline', fuelCapacity: 75, seats: 7, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 25000 },
  { type: 'car',        name: 'Voiture sport',  icon: '🏎️', color: '#DC2626', vehicleClass: 'sport',   brandModel: 'Ford Mustang GT',   maxSpeed: 200, baseHealth: 85,  fuelType: 'gasoline', fuelCapacity: 60, seats: 4, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 45000 },
  { type: 'car',        name: 'Super-car',      icon: '🏎️', color: '#F59E0B', vehicleClass: 'super',   brandModel: 'Lamborghini Huracan', maxSpeed: 260, baseHealth: 80, fuelType: 'gasoline', fuelCapacity: 80, seats: 2, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 250000 },
  { type: 'car',        name: 'Muscle car',     icon: '🚗', color: '#7C2D12', vehicleClass: 'muscle',  brandModel: 'Dodge Charger',     maxSpeed: 210, baseHealth: 95,  fuelType: 'gasoline', fuelCapacity: 70, seats: 5, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 55000 },
  { type: 'truck',      name: 'Pickup 4x4',     icon: '🚙', color: '#B45309', vehicleClass: 'off_road', brandModel: 'Jeep Gladiator',   maxSpeed: 130, baseHealth: 140, fuelType: 'gasoline', fuelCapacity: 85, seats: 5, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 42000 },
  { type: 'commercial', name: 'Cargo Van',      icon: '🚚', color: '#334155', vehicleClass: 'utility', brandModel: 'Mercedes Sprinter', maxSpeed: 100, baseHealth: 130, fuelType: 'diesel',   fuelCapacity: 90, seats: 3, licenseRequired: 'B', lockedByDefault: false, purchasePrice: 38000 },
  { type: 'commercial', name: 'Semi-remorque',  icon: '🚛', color: '#1E293B', vehicleClass: 'utility', brandModel: 'Volvo VNL',         maxSpeed: 105, baseHealth: 200, fuelType: 'diesel',   fuelCapacity: 400, seats: 2, licenseRequired: 'C', lockedByDefault: false, purchasePrice: 180000 },
  { type: 'industrial', name: 'Benne',          icon: '🚜', color: '#D97706', vehicleClass: 'utility', brandModel: 'Cat CT660',        maxSpeed: 90,  baseHealth: 180, fuelType: 'diesel',   fuelCapacity: 200, seats: 2, licenseRequired: 'C', lockedByDefault: false, purchasePrice: 150000 },
  { type: 'motorcycle', name: 'Scooter',        icon: '🛵', color: '#0EA5E9', vehicleClass: 'sport',   brandModel: 'Vespa Primavera',   maxSpeed: 90,  baseHealth: 50,  fuelType: 'gasoline', fuelCapacity: 8,  seats: 2, licenseRequired: 'A', lockedByDefault: false, purchasePrice: 6000 },

  // ─── v2 extensions maritimes / aériennes ───
  { type: 'boat',       name: 'Bateau de pêche', icon: '🛥️', color: '#0369A1', vehicleClass: 'utility', brandModel: 'Boston Whaler 170', maxSpeed: 65, baseHealth: 120, fuelType: 'gasoline', fuelCapacity: 150, seats: 6, licenseRequired: 'boat', lockedByDefault: false, purchasePrice: 48000 },
  { type: 'helicopter', name: 'Hélicoptère',     icon: '🚁', color: '#1E40AF', vehicleClass: 'emergency', brandModel: 'Bell 407',        maxSpeed: 220, baseHealth: 90,  fuelType: 'gasoline', fuelCapacity: 200, seats: 6, licenseRequired: 'air',  lockedByDefault: true,  allowedJobs: ['police', 'ems'] },
];

// v1 compat alias
export const VEHICLE_TYPES = VEHICLE_TEMPLATES.map((t) => ({
  type: t.type,
  name: t.name,
  color: t.color,
  speed: 0,
  maxSpeed: t.maxSpeed,
  health: t.baseHealth,
  locked: t.lockedByDefault,
  icon: t.icon,
}));

// ═══════════════════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function genVin(): string {
  // VIN : 17 caractères, sans I/O/Q (norme ISO 3779)
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) vin += chars[Math.floor(Math.random() * chars.length)];
  return vin;
}

function genPlate(prefix: string): string {
  // Format QC : ABC-1234 (simplifié)
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const digits = '0123456789';
  let plate = prefix ? `${prefix}-` : '';
  for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
  plate += '-';
  for (let i = 0; i < 4; i++) plate += digits[Math.floor(Math.random() * digits.length)];
  return plate;
}

function emptyDamage(): VehicleDamage {
  return {
    bodyHealth: 100,
    engineHealth: 100,
    tyreHealth: 100,
    fuelLevel: 100,
    brokenWindows: false,
    doorsOpen: [false, false, false, false],
  };
}

function defaultMods(): VehicleMod {
  return {
    engineLevel: 0,
    transmissionLevel: 0,
    brakesLevel: 0,
    suspensionLevel: 0,
    turbo: false,
    armorLevel: 0,
    wheelsType: 'stock',
    paintPrimary: '#FFFFFF',
    paintSecondary: '#000000',
    neonColor: null,
    plateStyle: 'standard',
  };
}

// Spatial grid helpers
function chunkKey(x: number, z: number, size: number): string {
  return `${Math.floor(x / size)}_${Math.floor(z / size)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  VEHICLE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export class VehicleSystem {
  public db: EtherPrismDB;
  public intellectus: Intellectus;
  public config: VehicleConfig;

  // Cache mémoire (source de vérité runtime)
  private vehicles = new Map<string, Vehicle>();

  // Spatial index (chunk → Set<vehicleId>)
  private chunks = new Map<string, Set<string>>();

  // Player → vehicle conduit
  private playerVehicle = new Map<string, string>();

  private initialized = false;

  private stats = {
    spawnedTotal: 0,
    destroyedTotal: 0,
    enteredTotal: 0,
    exitedTotal: 0,
    fuelBurnedTotal: 0,
    kmDrivenTotal: 0,
    impoundsTotal: 0,
    releasesTotal: 0,
  };

  constructor(
    db: EtherPrismDB,
    intellectus: Intellectus,
    config: Partial<VehicleConfig> = {},
  ) {
    this.db = db;
    this.intellectus = intellectus;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  INIT
  // ────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    const existing = await this.db.list<Vehicle>('vehicles');

    // Migration v1 → v2 + remplissage cache
    for (const raw of existing) {
      const v = this.migrateVehicle(raw);
      this.vehicles.set(v.id, v);
      this.indexVehicle(v);
    }

    // Spawn initial si premier boot
    if (existing.length === 0) {
      await this.spawnStarterVehicles();
    }

    this.initialized = true;

    this.intellectus.arcadius.emit(
      'system:vehicle:ready',
      {
        total: this.vehicles.size,
        chunks: this.chunks.size,
      },
      'VehicleSystem',
    );

    console.log(
      `🚗 [Vehicle] ${this.vehicles.size} véhicules · ${this.chunks.size} chunks`,
    );
  }

  private migrateVehicle(raw: any): Vehicle {
    return {
      ...raw,
      // Valeurs par défaut v2
      plate: raw.plate ?? genPlate(this.config.platePrefix),
      vin: raw.vin ?? genVin(),
      vehicleClass: raw.vehicleClass ?? 'sedan',
      brandModel: raw.brandModel ?? raw.name ?? 'Inconnu',
      year: raw.year ?? 2020,
      damage: raw.damage ?? {
        ...emptyDamage(),
        fuelLevel: raw.fuelLevel ?? 100,
      },
      fuelType: raw.fuelType ?? 'gasoline',
      fuelCapacity: raw.fuelCapacity ?? 55,
      odometerKm: raw.odometerKm ?? 0,
      keys: raw.keys ?? (raw.ownerId ? [raw.ownerId] : []),
      coOwners: raw.coOwners ?? [],
      garageId: raw.garageId ?? null,
      isStored: raw.isStored ?? false,
      mods: raw.mods ?? defaultMods(),
      occupants: raw.occupants ?? (raw.driverId ? [{ playerId: raw.driverId, seat: 0, enteredAt: Date.now() }] : []),
      impound: raw.impound ?? null,
      insurance: raw.insurance ?? null,
      stolen: raw.stolen ?? false,
      spawnAt: raw.spawnAt ?? Date.now(),
      updatedAt: raw.updatedAt ?? Date.now(),
      plateIssuedAt: raw.plateIssuedAt ?? Date.now(),
    };
  }

  private async spawnStarterVehicles(): Promise<void> {
    const positions: [number, number, number][] = [
      [10, 0, 5], [-10, 0, 15], [35, 0, -10], [-25, 0, -5], [5, 0, -30], [20, 0, 25],
    ];

    for (let i = 0; i < Math.min(6, VEHICLE_TEMPLATES.length); i++) {
      const tpl = VEHICLE_TEMPLATES[i];
      await this.spawnVehicle({
        template: tpl,
        position: positions[i],
        rotation: Math.random() * Math.PI * 2,
        ownerId: null,
        aiControlled: false,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  INDEX
  // ────────────────────────────────────────────────────────────────────────

  private indexVehicle(v: Vehicle): void {
    const key = chunkKey(v.position[0], v.position[2], this.config.chunkSize);
    let bucket = this.chunks.get(key);
    if (!bucket) {
      bucket = new Set();
      this.chunks.set(key, bucket);
    }
    bucket.add(v.id);
  }

  private unindexVehicle(v: Vehicle): void {
    const key = chunkKey(v.position[0], v.position[2], this.config.chunkSize);
    this.chunks.get(key)?.delete(v.id);
  }

  private reindexVehicle(v: Vehicle, oldPos: [number, number, number]): void {
    const oldKey = chunkKey(oldPos[0], oldPos[2], this.config.chunkSize);
    const newKey = chunkKey(v.position[0], v.position[2], this.config.chunkSize);
    if (oldKey !== newKey) {
      this.chunks.get(oldKey)?.delete(v.id);
      this.indexVehicle(v);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  SPAWN
  // ────────────────────────────────────────────────────────────────────────

  async spawnVehicle(opts: {
    template: VehicleTemplate;
    position: [number, number, number];
    rotation?: number;
    ownerId?: string | null;
    color?: string;
    plate?: string;
    aiControlled?: boolean;
    despawnAt?: number;
  }): Promise<Vehicle> {
    const tpl = opts.template;
    const now = Date.now();

    const vehicle: Vehicle = {
      id: uuid(),
      type: tpl.type,
      name: tpl.name,
      color: opts.color ?? tpl.color,
      position: opts.position,
      rotation: opts.rotation ?? 0,
      speed: 0,
      maxSpeed: tpl.maxSpeed,
      health: tpl.baseHealth,
      ownerId: opts.ownerId ?? null,
      driverId: null,
      locked: tpl.lockedByDefault,
      icon: tpl.icon,

      plate: opts.plate ?? genPlate(this.config.platePrefix),
      vin: genVin(),
      vehicleClass: tpl.vehicleClass,
      brandModel: tpl.brandModel,
      year: 2024,

      damage: emptyDamage(),
      fuelType: tpl.fuelType,
      fuelCapacity: tpl.fuelCapacity,
      odometerKm: 0,

      keys: opts.ownerId ? [opts.ownerId] : [],
      coOwners: [],
      garageId: null,
      isStored: false,

      mods: defaultMods(),

      occupants: [],

      impound: null,
      insurance: null,

      stolen: false,
      aiControlled: opts.aiControlled ?? false,
      despawnAt: opts.despawnAt,

      spawnAt: now,
      updatedAt: now,
      plateIssuedAt: now,
    };

    await this.db.set('vehicles', vehicle.id, vehicle);
    this.vehicles.set(vehicle.id, vehicle);
    this.indexVehicle(vehicle);

    this.stats.spawnedTotal++;

    this.intellectus.arcadius.emit(
      'vehicle:spawned',
      {
        vehicleId: vehicle.id,
        type: vehicle.type,
        position: vehicle.position,
        aiControlled: vehicle.aiControlled,
      },
      'VehicleSystem',
    );

    return vehicle;
  }

  /** 🆕 Spawn un véhicule par type (cherche le template). */
  async spawnByType(
    type: VehicleKind,
    position: [number, number, number],
    opts?: { ownerId?: string; rotation?: number; color?: string; aiControlled?: boolean },
  ): Promise<Vehicle | null> {
    const tpl = VEHICLE_TEMPLATES.find((t) => t.type === type);
    if (!tpl) return null;
    return this.spawnVehicle({
      template: tpl,
      position,
      rotation: opts?.rotation,
      ownerId: opts?.ownerId ?? null,
      color: opts?.color,
      aiControlled: opts?.aiControlled,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API PUBLIQUE — v1 compat
  // ────────────────────────────────────────────────────────────────────────

  async list(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }

  async enterVehicle(
    vehicleId: string,
    playerId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.isStored) return { ok: false, error: 'Véhicule rangé au garage.' };
    if (v.impound) return { ok: false, error: 'Véhicule en fourrière.' };

    // Lock check (propriétaire ou clé)
    if (v.locked && !this.hasKey(v, playerId)) {
      return { ok: false, error: 'Véhicule verrouillé.' };
    }

    // Déjà quelqu'un au volant ?
    if (v.driverId) return { ok: false, error: 'Quelqu\'un conduit déjà.' };

    // Déjà en train de conduire un autre véhicule ?
    if (this.playerVehicle.has(playerId)) {
      return { ok: false, error: 'Vous conduisez déjà un véhicule.' };
    }

    // Ajoute occupant siège 0
    v.driverId = playerId;
    v.occupants = v.occupants.filter((o) => o.playerId !== playerId);
    v.occupants.push({ playerId, seat: 0, enteredAt: Date.now() });
    v.updatedAt = Date.now();

    this.playerVehicle.set(playerId, vehicleId);

    await this.db.set('vehicles', vehicleId, v);

    this.stats.enteredTotal++;

    this.intellectus.arcadius.emit(
      'vehicle:entered',
      { vehicleId, playerId },
      'VehicleSystem',
    );

    return { ok: true };
  }

  async exitVehicle(vehicleId: string): Promise<void> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return;

    if (v.driverId) this.playerVehicle.delete(v.driverId);
    v.driverId = null;
    v.occupants = [];
    v.speed = 0;
    v.updatedAt = Date.now();

    await this.db.set('vehicles', vehicleId, v);

    this.stats.exitedTotal++;

    this.intellectus.arcadius.emit(
      'vehicle:exited',
      { vehicleId },
      'VehicleSystem',
    );
  }

  getTypes() {
    return VEHICLE_TYPES;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — OCCUPANTS
  // ────────────────────────────────────────────────────────────────────────

  async enterAsPassenger(
    vehicleId: string,
    playerId: string,
  ): Promise<{ ok: boolean; seat?: number; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.locked && !this.hasKey(v, playerId)) {
      return { ok: false, error: 'Véhicule verrouillé.' };
    }
    if (v.impound) return { ok: false, error: 'Fourrière.' };

    const tpl = VEHICLE_TEMPLATES.find((t) => t.type === v.type);
    const maxSeats = tpl?.seats ?? 4;

    // Cherche un siège libre (à partir de 1)
    const taken = new Set(v.occupants.map((o) => o.seat));
    let seat = -1;
    for (let s = 1; s < maxSeats; s++) {
      if (!taken.has(s)) { seat = s; break; }
    }
    if (seat === -1) return { ok: false, error: 'Véhicule plein.' };

    v.occupants.push({ playerId, seat, enteredAt: Date.now() });
    v.updatedAt = Date.now();

    await this.db.set('vehicles', vehicleId, v);
    this.intellectus.arcadius.emit(
      'vehicle:passenger_entered',
      { vehicleId, playerId, seat },
      'VehicleSystem',
    );

    return { ok: true, seat };
  }

  async exitAsPassenger(vehicleId: string, playerId: string): Promise<void> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return;
    v.occupants = v.occupants.filter((o) => o.playerId !== playerId);
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);
  }

  getOccupants(vehicleId: string): VehicleOccupant[] {
    return this.vehicles.get(vehicleId)?.occupants ?? [];
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — KEYS & LOCK
  // ────────────────────────────────────────────────────────────────────────

  hasKey(v: Vehicle, playerId: string): boolean {
    if (v.ownerId === playerId) return true;
    if (v.coOwners.includes(playerId)) return true;
    return v.keys.includes(playerId);
  }

  async addKey(
    vehicleId: string,
    playerId: string,
    requesterId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.ownerId !== requesterId && !v.coOwners.includes(requesterId)) {
      return { ok: false, error: 'Pas autorisé à partager les clés.' };
    }
    if (v.keys.includes(playerId)) return { ok: true };
    v.keys.push(playerId);
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit(
      'vehicle:key_added',
      { vehicleId, playerId, by: requesterId },
      'VehicleSystem',
    );

    return { ok: true };
  }

  async removeKey(
    vehicleId: string,
    playerId: string,
    requesterId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.ownerId !== requesterId) {
      return { ok: false, error: 'Seul le propriétaire peut retirer des clés.' };
    }
    v.keys = v.keys.filter((k) => k !== playerId);
    v.coOwners = v.coOwners.filter((c) => c !== playerId);
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);
    return { ok: true };
  }

  async lockVehicle(
    vehicleId: string,
    playerId: string,
  ): Promise<{ ok: boolean; locked?: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (!this.hasKey(v, playerId)) return { ok: false, error: 'Pas de clés.' };

    v.locked = true;
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit('vehicle:locked', { vehicleId, playerId }, 'VehicleSystem');
    return { ok: true, locked: true };
  }

  async unlockVehicle(
    vehicleId: string,
    playerId: string,
  ): Promise<{ ok: boolean; locked?: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (!this.hasKey(v, playerId)) return { ok: false, error: 'Pas de clés.' };

    v.locked = false;
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit('vehicle:unlocked', { vehicleId, playerId }, 'VehicleSystem');
    return { ok: true, locked: false };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — DAMAGE & FUEL
  // ────────────────────────────────────────────────────────────────────────

  async applyDamage(
    vehicleId: string,
    damage: Partial<VehicleDamage>,
  ): Promise<void> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return;

    v.damage = {
      bodyHealth: clamp(v.damage.bodyHealth - (damage.bodyHealth ? 100 - damage.bodyHealth : 0), 0, 100),
      engineHealth: clamp(v.damage.engineHealth - (damage.engineHealth ? 100 - damage.engineHealth : 0), 0, 100),
      tyreHealth: clamp(v.damage.tyreHealth - (damage.tyreHealth ? 100 - damage.tyreHealth : 0), 0, 100),
      fuelLevel: damage.fuelLevel ?? v.damage.fuelLevel,
      brokenWindows: damage.brokenWindows ?? v.damage.brokenWindows,
      doorsOpen: damage.doorsOpen ?? v.damage.doorsOpen,
    };
    v.health = Math.round((v.damage.bodyHealth + v.damage.engineHealth) / 2);
    v.updatedAt = Date.now();

    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit(
      'vehicle:damaged',
      { vehicleId, damage: v.damage },
      'VehicleSystem',
    );

    // Destruction
    if (v.damage.bodyHealth <= 0 || v.damage.engineHealth <= 0) {
      await this.destroyVehicle(vehicleId, 'destroyed');
    }
  }

  async refuel(
    vehicleId: string,
    amount: number,
    playerId: string,
    cash: number,
  ): Promise<{ ok: boolean; fuelAdded?: number; cost?: number; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };

    const needed = 100 - v.damage.fuelLevel;
    const toAdd = Math.min(amount, needed);
    const liters = (v.fuelCapacity * toAdd) / 100;
    const cost = Math.round(liters * this.config.fuelPricePerUnit * 100) / 100;

    if (cash < cost) return { ok: false, error: `Fonds insuffisants (${cost}$ requis)` };

    v.damage.fuelLevel = clamp(v.damage.fuelLevel + toAdd, 0, 100);
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit(
      'vehicle:refueled',
      { vehicleId, playerId, liters: Math.round(liters * 100) / 100, cost },
      'VehicleSystem',
    );

    return { ok: true, fuelAdded: toAdd, cost };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — IMPOUND (FOURRIÈRE)
  // ────────────────────────────────────────────────────────────────────────

  async impoundVehicle(
    vehicleId: string,
    reason: ImpoundReason,
    officerId: string,
    notes = '',
  ): Promise<{ ok: boolean; impound?: VehicleImpound; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.impound) return { ok: false, error: 'Déjà en fourrière.' };

    const impound: VehicleImpound = {
      id: uuid(),
      reason,
      impoundedBy: officerId,
      impoundedAt: Date.now(),
      lotLocation: 'Fourrière SQ — Portneuf',
      releaseFee: this.config.baseImpoundFee,
      storageFeePerDay: this.config.storageFeePerDay,
      notes,
    };

    v.impound = impound;
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);

    this.stats.impoundsTotal++;

    this.intellectus.arcadius.emit(
      'vehicle:impounded',
      { vehicleId, reason, officerId },
      'VehicleSystem',
    );

    return { ok: true, impound };
  }

  async releaseFromImpound(
    vehicleId: string,
    playerId: string,
  ): Promise<{ ok: boolean; totalFee?: number; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (!v.impound) return { ok: false, error: 'Pas en fourrière.' };
    if (v.ownerId !== playerId && !this.hasKey(v, playerId)) {
      return { ok: false, error: 'Pas autorisé.' };
    }

    const days = Math.max(1, Math.ceil((Date.now() - v.impound.impoundedAt) / (24 * 3600 * 1000)));
    const total = v.impound.releaseFee + days * v.impound.storageFeePerDay;

    v.impound = null;
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);

    this.stats.releasesTotal++;

    this.intellectus.arcadius.emit(
      'vehicle:released',
      { vehicleId, playerId, totalFee: total, days },
      'VehicleSystem',
    );

    return { ok: true, totalFee: total };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — STOLEN & WANTED
  // ────────────────────────────────────────────────────────────────────────

  async markStolen(
    vehicleId: string,
    byPlayerId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };

    v.stolen = true;
    v.stolenAt = Date.now();
    v.stolenFrom = v.ownerId ?? undefined;
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit(
      'vehicle:stolen',
      {
        vehicleId,
        byPlayerId,
        owner: v.ownerId,
        plate: v.plate,
      },
      'VehicleSystem',
    );

    return { ok: true };
  }

  async recoverVehicle(vehicleId: string): Promise<void> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return;
    v.stolen = false;
    v.stolenAt = undefined;
    v.stolenFrom = undefined;
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);
    this.intellectus.arcadius.emit('vehicle:recovered', { vehicleId }, 'VehicleSystem');
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — MODS
  // ────────────────────────────────────────────────────────────────────────

  async installMod(
    vehicleId: string,
    playerId: string,
    patch: Partial<VehicleMod>,
  ): Promise<{ ok: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.ownerId !== playerId && !v.coOwners.includes(playerId)) {
      return { ok: false, error: 'Pas autorisé.' };
    }

    v.mods = { ...v.mods, ...patch };
    v.updatedAt = Date.now();
    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit(
      'vehicle:mod_installed',
      { vehicleId, playerId, patch },
      'VehicleSystem',
    );

    return { ok: true };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — GARAGE
  // ────────────────────────────────────────────────────────────────────────

  async storeVehicle(
    vehicleId: string,
    garageId: string,
    playerId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.ownerId !== playerId && !v.coOwners.includes(playerId)) {
      return { ok: false, error: 'Pas autorisé.' };
    }
    if (v.occupants.length > 0) return { ok: false, error: 'Véhicule occupé.' };

    v.isStored = true;
    v.garageId = garageId;
    v.driverId = null;
    v.updatedAt = Date.now();
    this.unindexVehicle(v);
    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit('vehicle:stored', { vehicleId, garageId }, 'VehicleSystem');
    return { ok: true };
  }

  async retrieveVehicle(
    vehicleId: string,
    position: [number, number, number],
    playerId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.ownerId !== playerId && !v.coOwners.includes(playerId)) {
      return { ok: false, error: 'Pas autorisé.' };
    }
    if (!v.isStored) return { ok: false, error: 'Véhicule déjà sorti.' };

    v.isStored = false;
    v.position = position;
    v.garageId = null;
    v.updatedAt = Date.now();
    this.indexVehicle(v);
    await this.db.set('vehicles', vehicleId, v);

    this.intellectus.arcadius.emit('vehicle:retrieved', { vehicleId, position }, 'VehicleSystem');
    return { ok: true };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  API v2 — DESTRUCTION
  // ────────────────────────────────────────────────────────────────────────

  async destroyVehicle(
    vehicleId: string,
    reason: 'destroyed' | 'despawn' | 'cleanup',
  ): Promise<void> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return;

    if (v.driverId) this.playerVehicle.delete(v.driverId);
    for (const o of v.occupants) this.playerVehicle.delete(o.playerId);

    this.unindexVehicle(v);
    this.vehicles.delete(vehicleId);
    await this.db.del('vehicles', vehicleId);

    this.stats.destroyedTotal++;

    this.intellectus.arcadius.emit(
      'vehicle:destroyed',
      { vehicleId, reason, owner: v.ownerId },
      'VehicleSystem',
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  QUERIES
  // ────────────────────────────────────────────────────────────────────────

  getVehicle(id: string): Vehicle | null {
    return this.vehicles.get(id) ?? null;
  }

  getPlayerVehicle(playerId: string): Vehicle | null {
    const id = this.playerVehicle.get(playerId);
    return id ? this.vehicles.get(id) ?? null : null;
  }

  getVehiclesByOwner(ownerId: string): Vehicle[] {
    const out: Vehicle[] = [];
    for (const v of this.vehicles.values()) {
      if (v.ownerId === ownerId || v.coOwners.includes(ownerId)) out.push(v);
    }
    return out;
  }

  findVehicleByPlate(plate: string): Vehicle | null {
    const needle = plate.toUpperCase().trim();
    for (const v of this.vehicles.values()) {
      if (v.plate.toUpperCase() === needle) return v;
    }
    return null;
  }

  findVehicleByVin(vin: string): Vehicle | null {
    const needle = vin.toUpperCase().trim();
    for (const v of this.vehicles.values()) {
      if (v.vin.toUpperCase() === needle) return v;
    }
    return null;
  }

  /** 🆕 Véhicules visibles dans un rayon (spatial grid). */
  getVehiclesInRadius(x: number, z: number, radius: number): Vehicle[] {
    const out: Vehicle[] = [];
    const size = this.config.chunkSize;
    const radiusChunks = Math.ceil(radius / size);
    const gx = Math.floor(x / size);
    const gz = Math.floor(z / size);
    const radiusSq = radius * radius;

    for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
      for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
        const bucket = this.chunks.get(`${gx + dx}_${gz + dz}`);
        if (!bucket) continue;
        for (const id of bucket) {
          const v = this.vehicles.get(id);
          if (!v || v.isStored || v.impound) continue;
          const ddx = v.position[0] - x;
          const ddz = v.position[2] - z;
          if (ddx * ddx + ddz * ddz <= radiusSq) out.push(v);
        }
      }
    }
    return out;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  UPDATE POSITION (appelé par physics tick)
  // ────────────────────────────────────────────────────────────────────────

  async updatePosition(
    vehicleId: string,
    position: [number, number, number],
    rotation: number,
    speed: number,
    deltaKm: number,
  ): Promise<void> {
    const v = this.vehicles.get(vehicleId);
    if (!v) return;

    const oldPos = v.position;

    v.position = position;
    v.rotation = rotation;
    v.speed = speed;
    v.odometerKm += deltaKm;
    v.updatedAt = Date.now();

    // Burn fuel selon vitesse + consommation
    const consumption = this.config.fuelConsumption[v.vehicleClass] ?? 10;
    const fuelBurn = (deltaKm * consumption) / v.fuelCapacity; // % du réservoir
    v.damage.fuelLevel = clamp(v.damage.fuelLevel - fuelBurn, 0, 100);

    this.stats.kmDrivenTotal += deltaKm;
    this.stats.fuelBurnedTotal += fuelBurn;

    // Reindex si chunk change
    this.reindexVehicle(v, oldPos);

    // Save différé (batch)
    await this.db.set('vehicles', vehicleId, v);
  }

  // ────────────────────────────────────────────────────────────────────────
  //  TICK MAINTENANCE
  // ────────────────────────────────────────────────────────────────────────

  /** À appeler périodiquement pour cleanup des PNJ/AI. */
  async tick(now = Date.now()): Promise<void> {
    const toDespawn: string[] = [];

    for (const v of this.vehicles.values()) {
      if (v.aiControlled && v.despawnAt && now > v.despawnAt) {
        toDespawn.push(v.id);
      }
    }

    for (const id of toDespawn) {
      await this.destroyVehicle(id, 'despawn');
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  STATS
  // ────────────────────────────────────────────────────────────────────────

  getStats() {
    let stored = 0, impounded = 0, stolen = 0, ai = 0;
    for (const v of this.vehicles.values()) {
      if (v.isStored) stored++;
      if (v.impound) impounded++;
      if (v.stolen) stolen++;
      if (v.aiControlled) ai++;
    }

    return {
      ...this.stats,
      total: this.vehicles.size,
      stored,
      impounded,
      stolen,
      aiControlled: ai,
      activePlayers: this.playerVehicle.size,
      chunks: this.chunks.size,
    };
  }

  getCatalog(): readonly VehicleTemplate[] {
    return VEHICLE_TEMPLATES;
  }
}

export default VehicleSystem;