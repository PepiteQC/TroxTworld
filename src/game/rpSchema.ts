/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🎮 RP ROOM STATE & SCHÉMAS MULTIJOUEUR — QUÉBEC RP (v4.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v4.0 :
 *  - Intégration SQDC (magasins, employés, livraisons)
 *  - Intégration Street Furniture (mobilier urbain avec state)
 *  - Intégration World Items (collectibles avec rareté)
 *  - Système de casier judiciaire complet
 *  - Système de gangs avec réputation et rangs
 *  - Système de businesses/firms
 *  - Optimisations réseau (delta compression, priorités)
 *  - Schémas de validation avancés
 *  - Support pour inspections gouvernementales
 *  - Système de fidélité client
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { GANGS } from "./rp";

// ═══════════════════════════════════════════════════════════
// TYPES UTILITAIRES PARTAGÉS (DB + RÉSEAU)
// ═══════════════════════════════════════════════════════════

export type DbOnly<T> = T & { __dbOnly?: true };
export type NetworkOnly<T> = T & { __networkOnly?: true };
export type HighPriority<T> = T & { __priority?: "high" };
export type LowPriority<T> = T & { __priority?: "low" };

export type SharedState<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K];
};

export type Syncable<T> = {
  [K in keyof T as T[K] extends { __dbOnly?: true } ? never : K]: T[K];
};

export type Persistable<T> = {
  [K in keyof T as T[K] extends { __networkOnly?: true } ? never : K]: T[K];
};

export type DeltaUpdate<T> = {
  [K in keyof T]?: T[K];
} & {
  __timestamp: number;
  __version: number;
};

// ═══════════════════════════════════════════════════════════
// TYPES DE BASE GÉOMÉTRIQUES & TEMPORIELS
// ═══════════════════════════════════════════════════════════

export interface Vec3State { [key: string]: unknown;
  x: number;
  y: number;
  z: number;
}

export interface Vec2State {
  x: number;
  z: number;
}

export interface RotationState {
  pitch: number;
  yaw: number;
  roll: number;
}

export type Timestamp = number;

// ═══════════════════════════════════════════════════════════
// ÉNUMÉRATIONS MÉTIER (Québec RP) - ENRICHIES
// ═══════════════════════════════════════════════════════════

export type PlayerGesture =
  | "none" | "salute" | "hands_up" | "cross_arms" | "sit"
  | "inspect_ticket" | "drink_can" | "smoke" | "shovel_snow"
  | "cpr_give" | "check_radar" | "warm_hands"
  // ── NOUVEAU v4.0 ──
  | "wave" | "point" | "shrug" | "dance" | "pray"
  | "vomit" | "cough" | "sneeze" | "scratch_head"
  | "check_watch" | "use_phone" | "read_book";

export type InHandProp =
  | "none" | "cellphone" | "flashlight" | "radar_gun" | "taser"
  | "baton" | "glock" | "coffee_cup" | "beer_can" | "joint"
  | "snow_shovel" | "tool_box" | "briefcase" | "jerrycan"
  | "first_aid_kit" | "chainsaw"
  // ── NOUVEAU v4.0 ──
  | "ak74" | "shotgun" | "pistol" | "ar15"
  | "fishing_rod" | "hunting_rifle" | "camera"
  | "clipboard" | "megaphone" | "bouquet";

export type QuebecJobId =
  | "citoyen" | "sq_officer" | "paramedic" | "pompier"
  | "monteur_hydro" | "mecanicien" | "bucheron" | "agriculteur"
  | "camionneur" | "taxi_rural" | "pecheur_artisan"
  | "avocat_notaire" | "commis_depanneur" | "journalier_ccq"
  | "independant_clandestin"
  // ── NOUVEAU v4.0 ──
  | "sqdc_directeur" | "sqdc_gerant" | "sqdc_caissier"
  | "sqdc_conseiller" | "sqdc_securite" | "sqdc_commis"
  | "sqdc_livreur" | "inspecteur_gouvernemental";

export type SaaqLicenseClass =
  | "classe_5" | "classe_1" | "classe_3" | "classe_4b"
  | "classe_6a" | "apprenti_conducteur" | "suspendu";

export type FirearmLicenseStatus =
  | "none" | "ppa_simple" | "ppa_restreint" | "ordonnance_sq";

export type MedicalCondition =
  | "healthy" | "hypothermia_mild" | "hypothermia_severe"
  | "frostbite" | "bone_fracture" | "hemorrhage_minor"
  | "hemorrhage_critical" | "cardiac_arrest"
  | "intoxicated_alcohol" | "overdose"
  // ── NOUVEAU v4.0 ──
  | "concussion" | "burn_minor" | "burn_severe"
  | "poisoning" | "infection" | "dehydration"
  | "exhaustion" | "panic_attack";

export type ThreatRiskLevel = 
  | "VERT" | "JAUNE" | "ORANGE" | "ROUGE"
  | "GREEN" | "YELLOW" | "RED";

export type QuebecSeason = 
  | "printemps" | "ete" | "automne" | "hiver"
  | "spring" | "summer" | "autumn" | "winter"
  | "early_summer" | "late_autumn";

export type WeatherCondition =
  | "clear" | "overcast" | "light_rain" | "heavy_rain" | "thunderstorm"
  | "light_snow" | "blizzard" | "poudrerie" | "verglas" | "dense_fog"
  | "cloudy" | "rain" | "snow" | "snowstorm" | "fog" | "ensoleille"
  // ── NOUVEAU v4.0 ──
  | "hail" | "tornado" | "heatwave" | "ice_storm";

export type ChatKind =
  | "local" | "whisper" | "shout" | "me" | "do" | "ooc"
  | "ad" | "ad_local" | "radio_sq" | "radio_paramedic"
  | "cb_truckers" | "darknet_quebec" | "tal_official" | "system"
  // ── NOUVEAU v4.0 ──
  | "radio_fire" | "radio_tow" | "gang_chat"
  | "business_chat" | "emergency_broadcast";

export type VehicleCategory =
  | "sedan" | "pickup" | "suv_police" | "ambulance" | "firetruck"
  | "heavy_truck_53" | "snowplow" | "taxi" | "van" | "van_commercial"
  | "snowmobile" | "atv_quad"
  // ── NOUVEAU v4.0 ──
  | "sqdc_delivery_van" | "armored_truck" | "motorcycle"
  | "bicycle" | "boat_small" | "boat_fishing";

export type SirenMode =
  | "off" | "code_2" | "code_2_silent" | "code_3_wail" | "code_3_yelp"
  | "code_3_piercer" | "sq_hi_lo" | "air_horn" | "warning_amber";

export type LockType = 
  | "standard_key" | "heavy_deadbolt" | "electronic_keypad"
  | "smart_access" | "standard" | "reinforced" | "electronic_pin" | "smart_keycard"
  // ── NOUVEAU v4.0 ──
  | "biometric" | "voice_activated" | "remote_control";

// ═══════════════════════════════════════════════════════════
// NOUVEAU v4.0 : TYPES SQDC
// ═══════════════════════════════════════════════════════════

export type SqdcRole =
  | "directeur" | "gerant" | "caissier" | "conseiller"
  | "securite" | "commis" | "livreur" | "client" | "trespasser";

export interface SqdcEmployeeState {
  playerId: string;
  playerName: string;
  role: SqdcRole;
  hourlyRate: number;
  hoursWorked: number;
  totalEarned: number;
  isClockedIn: boolean;
  clockInTime: Timestamp | null;
  hireDate: Timestamp;
  performanceRating: number;
  salesCount: number;
  storeId: string;
}

export interface SqdcStockState {
  itemId: string;
  quantity: number;
  maxCapacity: number;
  reorderThreshold: number;
  wholesalePrice: number;
  retailPrice: number;
  aisle: string;
  lastRestock: Timestamp;
}

export interface SqdcStoreState {
  id: string;
  name: string;
  address: string;
  city: string;
  position: Vec2State;
  ownerId: string;
  isOpen: boolean;
  openedBy: string | null;
  openedAt: Timestamp | null;
  employees: SqdcEmployeeState[];
  stock: SqdcStockState[];
  registers: SqdcCashRegisterState[];
  safe: { cash: number; combination: string };
  todayRevenue: number;
  todayCustomers: number;
  weeklyRevenue: number;
  bannedCustomers: string[];
  license: SqdcLicenseState;
  loyaltyProgram: SqdcLoyaltyProgramState;
}

export interface SqdcCashRegisterState {
  id: string;
  storeId: string;
  cashInside: number;
  isOpen: boolean;
  operatedBy: string | null;
  todayRevenue: number;
  todayTransactions: number;
  position: Vec3State;
}

export interface SqdcLicenseState {
  number: string;
  issuedTo: string;
  expiryDate: Timestamp;
  isValid: boolean;
  suspensions: number;
  violationsCount: number;
}

export interface SqdcLoyaltyProgramState {
  enabled: boolean;
  pointsPerDollar: number;
  rewardThreshold: number;
  rewardValue: number;
}

export interface SqdcDeliveryState {
  id: string;
  customerId: string;
  customerName: string;
  address: Vec2State;
  items: Array<{ itemId: string; qty: number }>;
  total: number;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "failed";
  driverId: string | null;
  orderedAt: Timestamp;
  deliveredAt: Timestamp | null;
  tipAmount: number;
}

export interface SqdcInspectionState {
  id: string;
  storeId: string;
  inspectorId: string;
  inspectorName: string;
  startTime: Timestamp;
  endTime: Timestamp | null;
  violations: string[];
  passed: boolean | null;
  fine: number;
  licenseSuspended: boolean;
}

// ═══════════════════════════════════════════════════════════
// NOUVEAU v4.0 : TYPES STREET FURNITURE
// ═══════════════════════════════════════════════════════════

export type StreetKind =
  | "vending" | "bus" | "hydrant" | "mail" | "campfire"
  | "tlight" | "bench" | "dump" | "pump" | "trash"
  | "stop" | "flag" | "lamppost" | "sign" | "bollard"
  | "planter" | "phonebooth" | "newspaper";

export type StreetState =
  | "operational" | "inactive" | "damaged" | "disabled"
  | "maintenance" | "empty" | "full" | "reserved"
  | "frozen" | "snowed" | "flooded";

export interface StreetFurnitureState {
  id: string;
  kind: StreetKind;
  name: string;
  x: number;
  z: number;
  yaw: number;
  state: StreetState;
  condition: number;
  interactable: boolean;
  persistent: boolean;
  interactionRadius: number;
  usage: {
    totalInteractions: number;
    todayInteractions: number;
    lastUsedAt: Timestamp;
    popularity: number;
    vandalismCount: number;
    lastVandalizedAt: Timestamp;
  };
  maintenance: {
    required: boolean;
    condition: number;
    lastInspection: Timestamp;
    nextInspection: Timestamp;
    incidentCount: number;
    weatherDamage: number;
    snowCovered: boolean;
    iceCovered: boolean;
  };
  inventory?: {
    items: Array<{ itemId: string; qty: number }>;
    maxItems: number;
    isOpen: boolean;
    lockedBy?: string;
  };
  lighting?: {
    isOn: boolean;
    brightness: number;
    color: number;
    autoMode: boolean;
    energyCost: number;
  };
  villageId?: string;
  sectorId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════
// NOUVEAU v4.0 : TYPES WORLD ITEMS
// ═══════════════════════════════════════════════════════════

export type ItemRarity = "common" | "rare" | "epic" | "legendary";
export type ItemCategory = "treasure" | "resource" | "artifact" | "collectible";

export interface WorldItemState {
  id: string;
  itemId: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  color: number;
  emissiveColor: number;
  cash: number;
  xp: number;
  x: number;
  z: number;
  respawnMinutes?: number;
  description?: string;
  collected: boolean;
  collectedAt: Timestamp | null;
  collectedBy?: string;
}

// ═══════════════════════════════════════════════════════════
// NOUVEAU v4.0 : TYPES CRIMINAL RECORDS
// ═══════════════════════════════════════════════════════════

export type CrimeId =
  | "theft_shop" | "robbery_depanneur" | "theft_machinery"
  | "drug_trafficking" | "bank_heist_caisse" | "poaching_forest"
  | "car_theft" | "carjacking" | "armed_robbery"
  | "burglary_home" | "burglary_business" | "assault"
  | "aggravated_assault" | "fraud" | "identity_theft"
  | "arson" | "kidnapping" | "murder" | "dui"
  | "hit_and_run" | "possession_weapon" | "possession_drugs";

export type CrimeSeverity = "infraction" | "misdemeanor" | "felony" | "indictable";

export interface CriminalConvictionState {
  id: string;
  crimeId: CrimeId;
  date: Timestamp;
  sentence: {
    fine?: number;
    jailMonths?: number;
    probationMonths?: number;
    communityService?: number;
  };
  points: number;
  served: boolean;
}

export interface WarrantState {
  id: string;
  playerId: string;
  crimeId: CrimeId;
  issuedAt: Timestamp;
  issuingOfficer?: string;
  bail?: number;
}

export interface CriminalRecordState {
  playerId: string;
  convictions: CriminalConvictionState[];
  totalPoints: number;
  licenseSuspended: boolean;
  suspendedUntil?: Timestamp;
  onParole: boolean;
  paroleUntil?: Timestamp;
  outstandingWarrants: WarrantState[];
}

// ═══════════════════════════════════════════════════════════
// NOUVEAU v4.0 : TYPES GANGS
// ═══════════════════════════════════════════════════════════

export type GangRank = "recrue" | "associé" | "soldat" | "capo" | "sous_boss" | "boss";

export interface GangMembershipState {
  gangId: string;
  rank: GangRank;
  joinDate: Timestamp;
  reputation: number;
  contributionPoints: number;
  isActive: boolean;
  lastActivity: Timestamp;
}

// ═══════════════════════════════════════════════════════════
// NOUVEAU v4.0 : TYPES BUSINESSES
// ═══════════════════════════════════════════════════════════

export type FirmType = 
  | "depanneur" | "restaurant" | "garage" | "construction"
  | "transport" | "agriculture" | "foresterie" | "commerce"
  | "service" | "manufacturing";

export interface FirmState {
  id: string;
  neq: string;
  tradeName: string;
  type: FirmType;
  village: string;
  x: number;
  z: number;
  status: "en_demarrage" | "active" | "suspendue" | "fermee";
  balance: number;
  taxOwed: number;
  permits: Array<{ type: string; number: string }>;
  stock: Record<string, number>;
  isOpen: boolean;
  lifetimeRevenue: number;
  staff: number;
  grants: Record<string, number>;
  ownerId: string;
  employees: string[];
  createdAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════
// NOUVEAU v4.0 : TYPES LICENSES & PERMITS
// ═══════════════════════════════════════════════════════════

export type LicenseType = 
  | "permis_conduire_5" | "permis_conduire_4b" | "permis_classe_1"
  | "permis_classe_2" | "permis_chasse" | "permis_peche"
  | "permis_port_arme" | "permis_port_arme_restreint"
  | "permis_arme_force_ordre" | "permis_mecanicien"
  | "permis_electricien" | "permis_plombier" | "permis_coiffure"
  | "permis_barreau" | "permis_oaciq" | "permis_huissier"
  | "permis_soudure_cwb" | "permis_grue" | "permis_travail_hauteur"
  | "carte_ccq" | "permis_oiiq" | "permis_opq"
  | "brevet_enseignement" | "permis_pratique_medecine"
  | "permis_mma_cannabis" | "permis_peche_commerciale"
  | "permis_taxi" | "certificat_salubrite";

export interface LicenseState {
  id: LicenseType;
  issuedAt: Timestamp;
  expiresAt: Timestamp;
  isActive: boolean;
  suspendedUntil?: Timestamp;
  restrictions?: string[];
}

// ═══════════════════════════════════════════════════════════
// SCHÉMAS D'ÉTAT JOUEUR (ENRICHI v4.0)
// ═══════════════════════════════════════════════════════════

export interface PlayerAppearanceState {
  gender: "m" | "f";
  skinTone: number;
  hairStyle: string;
  hairColor: number;
  facialHair?: string;
  outfit: string;
  tuqueOrHat?: string;
  vestArmor?: string;
  coatColor?: number;
  model: string;
  // ── NOUVEAU v4.0 ──
  scars?: string[];
  tattoos?: string[];
  glasses?: string;
  accessories?: string[];
}

export interface PlayerSkillsState {
  driving: number;
  shooting: number;
  melee: number;
  stealth: number;
  persuasion: number;
  lockpicking: number;
  mechanic: number;
  medical: number;
  cooking: number;
  fishing: number;
  hunting: number;
  farming: number;
  // ── NOUVEAU v4.0 ──
  hacking: number;
  engineering: number;
  leadership: number;
  survival: number;
}

export interface PlayerReputationState {
  police: number; // -100 à +100
  medical: number;
  civilian: number;
  criminal: number;
  business: number;
  // ── NOUVEAU v4.0 ──
  gangReputations: Record<string, number>;
  overallReputation: number;
}

export interface PlayerState { [key: string]: unknown;
  // ─── IDENTIFIANTS ─────────────────────────────────────────
  id: string;
  username: string;
  characterName: string;
  
  // ─── PROFIL ───────────────────────────────────────────────
  dateOfBirth?: string;
  badgeNumber?: string;
  
  // ─── EMPLOI & STATUT ──────────────────────────────────────
  job: QuebecJobId | string;
  jobRank: string;
  
  // ─── POSITION & MOUVEMENT ─────────────────────────────────
  x: number & NetworkOnly<number> & HighPriority<number>;
  y: number & NetworkOnly<number> & HighPriority<number>;
  z: number & NetworkOnly<number> & HighPriority<number>;
  rotation: number & NetworkOnly<number> & HighPriority<number>;
  pitch?: number & NetworkOnly<number>;
  velocity: Vec3State & NetworkOnly<Vec3State> & HighPriority<Vec3State>;
  
  // ─── ANIMATION & GESTES ───────────────────────────────────
  animation: string & NetworkOnly<string>;
  gesture: PlayerGesture & NetworkOnly<PlayerGesture>;
  heldProp: InHandProp & NetworkOnly<InHandProp>;
  
  // ─── SANTÉ & SURVIE ───────────────────────────────────────
  health: number;
  armor: number;
  hunger: number;
  thirst: number;
  bodyTempCelsius: number;
  medicalConditions: MedicalCondition[];
  stamina: number;
  energy: number;
  
  // ─── ALTÉRATIONS ──────────────────────────────────────────
  bloodAlcoholMgPct: number;
  cannabisThcNgMl: number;
  isCuffed: boolean;
  cuffType?: "front" | "back";
  cuffedBy?: string;
  hasBeenReadRights: boolean;
  isDowned: boolean;
  bleedoutTimer: number;
  isInHoldingCell: boolean;
  isInHospital: boolean;
  hospitalAdmittedAt?: Timestamp;
  
  // ─── ÉCONOMIE & LÉGAL ─────────────────────────────────────
  saaqLicense: SaaqLicenseClass;
  saaqDemeritPoints: number;
  firearmPermit: FirearmLicenseStatus;
  cash: number;
  bank: number;
  unpaidFinesTotal: number;
  wantedLevelStars: number;
  wantedReason?: string;
  criminalRecordCount: number;
  
  // ─── NOUVEAU v4.0 : CASIER JUDICIAIRE ─────────────────────
  criminalRecord?: CriminalRecordState;
  
  // ─── NOUVEAU v4.0 : PERMIS & LICENCES ─────────────────────
  licenses: LicenseState[];
  
  // ─── NOUVEAU v4.0 : SKILLS ────────────────────────────────
  skills: PlayerSkillsState;
  totalXp: number;
  level: number;
  
  // ─── NOUVEAU v4.0 : RÉPUTATION ────────────────────────────
  reputation: PlayerReputationState;
  
  // ─── FACTIONS ─────────────────────────────────────────────
  gangAffiliation: string;
  
  // ─── NOUVEAU v4.0 : GANG MEMBERSHIP ───────────────────────
  gangMembership?: GangMembershipState;
  
  // ─── NOUVEAU v4.0 : BUSINESS OWNERSHIP ────────────────────
  ownedFirms: string[];
  
  // ─── NOUVEAU v4.0 : SQDC LOYALTY ──────────────────────────
  sqdcLoyaltyPoints: Record<string, number>;
  
  // ─── VÉHICULE ACTUEL ──────────────────────────────────────
  vehicleId: string & NetworkOnly<string>;
  vehicleSeat: "driver" | "passenger" | "rear_left" | "rear_right" | "bed_cargo" | "none" | "trunk" & NetworkOnly<string>;
  
  // ─── RADIO & COMM ─────────────────────────────────────────
  radioFrequencyMhz?: number & NetworkOnly<number>;
  cbChannel?: number & NetworkOnly<number>;
  isTransmittingVoice: boolean & NetworkOnly<boolean>;
  voiceProximityMode: "whisper" | "normal" | "shout" & NetworkOnly<string>;
  
  // ─── APPARENCE ────────────────────────────────────────────
  appearance: PlayerAppearanceState;
  
  // ─── MÉTADONNÉES RÉSEAU ───────────────────────────────────
  zoneX?: number & NetworkOnly<number>;
  zoneZ?: number & NetworkOnly<number>;
  pingMs?: number & NetworkOnly<number>;
  lastSeen: Timestamp;
  isOnline: boolean;
  
  // ─── CHAMPS HÉRITÉS ───────────────────────────────────────
  bodyTemp?: number;
  bloodAlcohol?: number;
  isInSolitary?: boolean;
  wanted?: number;
  gang?: string;
  radioFrequency?: number;
  isTalkingRadio?: boolean;
  ping?: number;
}

// ═══════════════════════════════════════════════════════════
// SCHÉMAS D'ÉTAT VÉHICULE (ENRICHI v4.0)
// ═══════════════════════════════════════════════════════════

export interface VehicleState { [key: string]: unknown;
  // ─── IDENTIFIANTS ─────────────────────────────────────────
  id: string;
  type: VehicleCategory;
  name: string;
  plateNumber: string;
  registeredOwnerId: string;
  
  // ─── POSITION ─────────────────────────────────────────────
  x: number & NetworkOnly<number> & HighPriority<number>;
  y: number & NetworkOnly<number> & HighPriority<number>;
  z: number & NetworkOnly<number> & HighPriority<number>;
  rotation: RotationState & NetworkOnly<RotationState> & HighPriority<RotationState>;
  speedKmh: number & NetworkOnly<number> & HighPriority<number>;
  
  // ─── SANTÉ MÉCANIQUE ──────────────────────────────────────
  engineHealthPct: number;
  bodyHealthPct: number;
  fuelLevelPct: number;
  washerFluidPct: number;
  engineRunning: boolean;
  
  // ─── NOUVEAU v4.0 : DÉTAILS MÉCANIQUES ────────────────────
  oilLevelPct: number;
  batteryChargePct: number;
  transmissionHealth: number;
  brakesHealth: number;
  
  // ─── SÉCURITÉ ─────────────────────────────────────────────
  locked: boolean;
  handbrakeEngaged: boolean;
  hasWinterTires: boolean;
  tireHealth: [number, number, number, number];
  
  // ─── ENVIRONNEMENT ────────────────────────────────────────
  windshieldIcedPct: number & NetworkOnly<number>;
  snowAccumulationPct?: number & NetworkOnly<number>;
  engineBlockTempC: number & NetworkOnly<number>;
  
  // ─── HABITACLE ────────────────────────────────────────────
  driverId: string & NetworkOnly<string>;
  passengers: Record<string, string> & NetworkOnly<Record<string, string>>;
  
  // ─── SIGNALISATION ────────────────────────────────────────
  headlights: boolean & NetworkOnly<boolean>;
  highBeams: boolean & NetworkOnly<boolean>;
  hazardLights: boolean & NetworkOnly<boolean>;
  emergencyLights: boolean & NetworkOnly<boolean>;
  siren: boolean & NetworkOnly<boolean>;
  sirenMode: SirenMode & NetworkOnly<SirenMode>;
  arrowBoardState?: "left" | "right" | "diverge" | "hazard" | "off" & NetworkOnly<string>;
  
  // ─── ATTACHEMENT ──────────────────────────────────────────
  hitchedTrailerId?: string & NetworkOnly<string>;
  cargoWeightKg: number & NetworkOnly<number>;
  
  // ─── NOUVEAU v4.0 : CARGO DÉTAILLÉ ────────────────────────
  cargo: Array<{ itemId: string; qty: number; weight: number }>;
  maxCargoWeight: number;
  
  // ─── NOUVEAU v4.0 : CUSTOMISATION ─────────────────────────
  color: number;
  modifications: string[];
  damageZones: {
    front: number;
    rear: number;
    left: number;
    right: number;
    roof: number;
  };
  
  // ─── CHAMPS HÉRITÉS ───────────────────────────────────────
  engineHealth?: number;
  bodyHealth?: number;
  winterTiresInstalled?: boolean;
  engineTempCelsius?: number;
  arrowBoardDirection?: "left" | "right" | "diverge" | "none";
  cargoWeightKgLegacy?: number;
}

// ═══════════════════════════════════════════════════════════
// SCHÉMAS D'ÉTAT PROPRIÉTÉ / BÂTIMENT (ENRICHI v4.0)
// ═══════════════════════════════════════════════════════════

export interface PropertyState { [key: string]: unknown;
  // ─── IDENTIFIANTS ─────────────────────────────────────────
  id: string;
  name: string;
  cadastreNumber: string;
  town: string;
  ownerId: string;
  
  // ─── ÉCONOMIE ─────────────────────────────────────────────
  priceCad: number;
  locked: boolean;
  lockType: LockType;
  keypadPinCode?: string;
  
  // ─── BAIL TAL ─────────────────────────────────────────────
  hasActiveLease: boolean;
  tenantId?: string;
  monthlyRentCad: number;
  unpaidMonthsCount: number;
  hasTalEvictionNotice: boolean;
  
  // ─── HYDRO-QUÉBEC ─────────────────────────────────────────
  isHydroConnected: boolean;
  hydroAccountInGoodStanding: boolean;
  hasIllegalPowerBypass: boolean;
  powerUsageKw: number & NetworkOnly<number>;
  
  // ─── INTÉGRITÉ STRUCTURELLE ───────────────────────────────
  structuralIntegrityPct: number;
  hasMoistureOrMold: boolean;
  
  // ─── NOUVEAU v4.0 : DÉTAILS PROPRIÉTÉ ─────────────────────
  propertyType: "residential" | "commercial" | "industrial" | "land";
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  lotSize: number;
  
  // ─── NOUVEAU v4.0 : AMÉLIORATIONS ─────────────────────────
  renovations: string[];
  furniture: string[];
  appliances: string[];
  
  // ─── NOUVEAU v4.0 : ASSURANCE ─────────────────────────────
  insured: boolean;
  insuranceValue: number;
  insuranceProvider?: string;
  
  // ─── NOUVEAU v4.0 : TAXES ─────────────────────────────────
  municipalTaxYear: number;
  municipalTaxPaid: boolean;
  schoolTaxYear: number;
  schoolTaxPaid: boolean;
  
  // ─── NOUVEAU v4.0 : ACCÈS ─────────────────────────────────
  allowedPlayers: string[];
  accessLogs: Array<{ playerId: string; timestamp: Timestamp; action: "enter" | "exit" }>;
  
  // ─── CHAMPS HÉRITÉS ───────────────────────────────────────
  price?: number;
  pinCode?: string;
  isHydroPowerConnected?: boolean;
  hasMoldOrMoisture?: boolean;
}

// ═══════════════════════════════════════════════════════════
// ÉTAT GLOBAL DE LA ROOM (ENRICHI v4.0)
// ═══════════════════════════════════════════════════════════

export interface RPRoomState {
  // ─── ENTITÉS ──────────────────────────────────────────────
  players: Record<string, Syncable<PlayerState>>;
  vehicles: Record<string, Syncable<VehicleState>>;
  properties: Record<string, Syncable<PropertyState>>;
  
  // ─── NOUVEAU v4.0 : SQDC STORES ───────────────────────────
  sqdcStores: Record<string, SqdcStoreState>;
  sqdcDeliveries: Record<string, SqdcDeliveryState>;
  sqdcInspections: Record<string, SqdcInspectionState>;
  
  // ─── NOUVEAU v4.0 : STREET FURNITURE ──────────────────────
  streetFurniture: Record<string, StreetFurnitureState>;
  
  // ─── NOUVEAU v4.0 : WORLD ITEMS ───────────────────────────
  worldItems: Record<string, WorldItemState>;
  
  // ─── NOUVEAU v4.0 : BUSINESSES ────────────────────────────
  firms: Record<string, FirmState>;
  
  // ─── COMMUNICATION ────────────────────────────────────────
  chatMessages: ChatMessageState[];
  emergencyAlert?: EmergencyBroadcastState;
  
  // ─── MONDE & ENVIRONNEMENT ────────────────────────────────
  timeOfDay: number;
  hour: number;
  minute: number;
  day: number;
  month: number;
  season: QuebecSeason;
  weather: WeatherCondition;
  
  // ─── MÉTÉO DÉTAILLÉE ──────────────────────────────────────
  ambientTempCelsius: number;
  windChillCelsius: number;
  windSpeedKmh: number;
  snowDepthMeters: number;
  roadFrictionCoeff: number;
  visibilityMeters: number;
  
  // ─── NOUVEAU v4.0 : CONDITIONS ROUTIÈRES ──────────────────
  roadConditions: {
    ice: number;
    snow: number;
    water: number;
    debris: number;
  };
  
  // ─── ÉVÉNEMENTS GLOBAUX ───────────────────────────────────
  isBlackoutActive: boolean;
  blackoutSectors: string[];
  globalRiskLevel: ThreatRiskLevel;
  
  // ─── NOUVEAU v4.0 : ÉVÉNEMENTS DYNAMIQUES ─────────────────
  activeEvents: Array<{
    id: string;
    type: "robbery" | "accident" | "fire" | "protest" | "parade";
    location: Vec2State;
    startedAt: Timestamp;
    participants: string[];
    severity: number;
  }>;
  
  // ─── MÉTRIQUES ────────────────────────────────────────────
  totalCitizensOnline: number;
  totalVehiclesActive: number;
  totalBusinessesOpen: number;
  
  // ─── NOUVEAU v4.0 : STATISTIQUES ──────────────────────────
  stats: {
    crimesToday: number;
    arrestsToday: number;
    medicalCallsToday: number;
    firesToday: number;
    trafficViolationsToday: number;
  };
  
  // ─── CHAMPS HÉRITÉS ───────────────────────────────────────
  temperatureCelsius?: number;
  roadIceFrictionFactor?: number;
  riskLevel?: ThreatRiskLevel;
  playerCount?: number;
}

// ═══════════════════════════════════════════════════════════
// SCHÉMAS DE COMMUNICATION & ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════

export interface ChatMessageState { [key: string]: unknown;
  id: string;
  senderId: string;
  senderName: string;
  messageType: ChatKind;
  text: string;
  x: number;
  y: number;
  z: number;
  timestamp: Timestamp;
  targetId?: string;
  badge?: string;
  radioFrequency?: number;
  channel?: number;
  // ── NOUVEAU v4.0 ──
  isEncrypted?: boolean;
  language?: string;
  attachments?: string[];
}

export interface EmergencyBroadcastState {
  active: boolean;
  alertId: string;
  headline: string;
  issuingAuthority: "Sécurité publique Québec" | "Sûreté du Québec" | "Environnement Canada" | string;
  messageText: string;
  startedAt: Timestamp;
  durationSeconds: number;
  soundAlarm: boolean;
  // ── NOUVEAU v4.0 ──
  affectedAreas: string[];
  severity: "info" | "warning" | "danger" | "extreme";
  instructions?: string[];
  
  // Champs hérités
  id?: string;
  message?: string;
  type?: "meteo_extreme" | "evasion_prison" | "alerte_argent";
}

// ═══════════════════════════════════════════════════════════
// ALIAS DE COMPATIBILITÉ & EXPORTS
// ═══════════════════════════════════════════════════════════

export type PlayerSchema = SharedState<PlayerState>;
export type VehicleSchema = SharedState<VehicleState>;
export type ChatMessageSchema = SharedState<ChatMessageState>;
export type PropertySchema = SharedState<PropertyState>;
export type Vec3Schema = SharedState<Vec3State>;
export type RiskLevel = ThreatRiskLevel;

export const CHAT_RANGE: Record<ChatKind, number> = {
  whisper: 3.5,
  local: 22.0,
  me: 22.0,
  do: 22.0,
  shout: 65.0,
  radio_sq: Infinity,
  radio_paramedic: Infinity,
  cb_truckers: 5000.0,
  darknet_quebec: Infinity,
  tal_official: Infinity,
  ooc: Infinity,
  ad_local: Infinity,
  ad: Infinity,
  system: Infinity,
  radio_fire: Infinity,
  radio_tow: Infinity,
  gang_chat: Infinity,
  business_chat: Infinity,
  emergency_broadcast: Infinity,
};

// ═══════════════════════════════════════════════════════════
// FACTORIES (Création d'états vides) - ENRICHIES
// ═══════════════════════════════════════════════════════════

export function emptyPlayer(id: string, username = "Citoyen"): PlayerState {
  return {
    id,
    username,
    characterName: username,
    job: "citoyen",
    jobRank: "Résident",
    x: 0, y: 1, z: 10,
    rotation: 0,
    velocity: { x: 0, y: 0, z: 0 },
    animation: "idle",
    gesture: "none",
    heldProp: "none",
    health: 100,
    armor: 0,
    hunger: 100,
    thirst: 100,
    stamina: 100,
    energy: 100,
    bodyTempCelsius: 37.0,
    bodyTemp: 37.0,
    medicalConditions: ["healthy"],
    bloodAlcoholMgPct: 0,
    bloodAlcohol: 0,
    cannabisThcNgMl: 0,
    isCuffed: false,
    hasBeenReadRights: false,
    isDowned: false,
    bleedoutTimer: 300,
    isInHoldingCell: false,
    isInHospital: false,
    saaqLicense: "classe_5",
    saaqDemeritPoints: 0,
    firearmPermit: "none",
    cash: 500,
    bank: 2500,
    unpaidFinesTotal: 0,
    wantedLevelStars: 0,
    wanted: 0,
    criminalRecordCount: 0,
    licenses: [],
    skills: {
      driving: 1, shooting: 1, melee: 1, stealth: 1,
      persuasion: 1, lockpicking: 1, mechanic: 1,
      medical: 1, cooking: 1, fishing: 1, hunting: 1,
      farming: 1, hacking: 1, engineering: 1,
      leadership: 1, survival: 1,
    },
    totalXp: 0,
    level: 1,
    reputation: {
      police: 0, medical: 0, civilian: 0,
      criminal: 0, business: 0,
      gangReputations: {},
      overallReputation: 0,
    },
    gangAffiliation: "Aucun",
    gang: "Aucun",
    ownedFirms: [],
    sqdcLoyaltyPoints: {},
    vehicleId: "",
    vehicleSeat: "none",
    isTransmittingVoice: false,
    voiceProximityMode: "normal",
    appearance: {
      gender: "m",
      skinTone: 0,
      hairStyle: "court",
      hairColor: 0,
      outfit: "canadienne_cuir",
      model: "voyageur",
    },
    lastSeen: Date.now(),
    isOnline: true,
  };
}

export function emptyVehicle(id: string, type: VehicleCategory = "sedan", name = "Véhicule"): VehicleState {
  return {
    id,
    type,
    name,
    plateNumber: `QC-${Math.floor(100 + Math.random() * 900)}`,
    registeredOwnerId: "ville_portneuf",
    x: 0, y: 0, z: 0,
    rotation: { pitch: 0, yaw: 0, roll: 0 },
    speedKmh: 0,
    engineHealthPct: 100,
    engineHealth: 100,
    bodyHealthPct: 100,
    bodyHealth: 100,
    fuelLevelPct: 100,
    washerFluidPct: 100,
    oilLevelPct: 100,
    batteryChargePct: 100,
    transmissionHealth: 100,
    brakesHealth: 100,
    engineRunning: false,
    locked: true,
    handbrakeEngaged: true,
    hasWinterTires: true,
    tireHealth: [100, 100, 100, 100],
    windshieldIcedPct: 0,
    engineBlockTempC: 85,
    driverId: "",
    passengers: {},
    siren: false,
    sirenMode: "off",
    headlights: false,
    highBeams: false,
    hazardLights: false,
    emergencyLights: false,
    cargoWeightKg: 0,
    cargo: [],
    maxCargoWeight: 500,
    color: 0x333333,
    modifications: [],
    damageZones: {
      front: 0, rear: 0, left: 0, right: 0, roof: 0,
    },
  };
}

export function emptySqdcStore(id: string, name: string, ownerId: string): SqdcStoreState {
  return {
    id,
    name,
    address: "",
    city: "",
    position: { x: 0, z: 0 },
    ownerId,
    isOpen: false,
    openedBy: null,
    openedAt: null,
    employees: [],
    stock: [],
    registers: [],
    safe: { cash: 0, combination: "0000" },
    todayRevenue: 0,
    todayCustomers: 0,
    weeklyRevenue: 0,
    bannedCustomers: [],
    license: {
      number: `SQDC-${Date.now()}`,
      issuedTo: ownerId,
      expiryDate: Date.now() + 365 * 24 * 3600 * 1000,
      isValid: true,
      suspensions: 0,
      violationsCount: 0,
    },
    loyaltyProgram: {
      enabled: true,
      pointsPerDollar: 1,
      rewardThreshold: 500,
      rewardValue: 5,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// UTILITAIRES DE CONVERSION & VALIDATION
// ═══════════════════════════════════════════════════════════

export function riskFromWanted(stars: number): ThreatRiskLevel {
  if (stars >= 4) return "ROUGE";
  if (stars >= 3) return "ORANGE";
  if (stars >= 1) return "JAUNE";
  return "VERT";
}

export function toSyncablePlayer(player: PlayerState): Syncable<PlayerState> {
  const { username, ...syncable } = player;
  return syncable as unknown as Syncable<PlayerState>;
}

export function toPersistablePlayer(player: PlayerState): Persistable<PlayerState> {
  const { 
    x, y, z, rotation, pitch, velocity, animation, gesture, heldProp,
    vehicleId, vehicleSeat, radioFrequencyMhz, cbChannel, isTransmittingVoice,
    voiceProximityMode, zoneX, zoneZ, pingMs,
    bodyTemp, bloodAlcohol, isInSolitary, wanted, gang, radioFrequency,
    isTalkingRadio, ping, windshieldIcedPct, snowAccumulationPct,
    engineBlockTempC, arrowBoardDirection, cargoWeightKgLegacy
  } = player;
  
  return player as Persistable<PlayerState>;
}

export function validatePlayerState(player: Partial<PlayerState>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!player.id) errors.push("id requis");
  if (!player.characterName) errors.push("characterName requis");
  if (player.health !== undefined && (player.health < 0 || player.health > 100)) {
    errors.push("health doit être entre 0 et 100");
  }
  if (player.cash !== undefined && player.cash < 0) {
    errors.push("cash ne peut être négatif");
  }
  if (player.bank !== undefined && player.bank < 0) {
    errors.push("bank ne peut être négatif");
  }
  if (player.wantedLevelStars !== undefined && (player.wantedLevelStars < 0 || player.wantedLevelStars > 5)) {
    errors.push("wantedLevelStars doit être entre 0 et 5");
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateVehicleState(vehicle: Partial<VehicleState>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!vehicle.id) errors.push("id requis");
  if (!vehicle.plateNumber) errors.push("plateNumber requis");
  if (vehicle.engineHealthPct !== undefined && (vehicle.engineHealthPct < 0 || vehicle.engineHealthPct > 100)) {
    errors.push("engineHealthPct doit être entre 0 et 100");
  }
  if (vehicle.fuelLevelPct !== undefined && (vehicle.fuelLevelPct < 0 || vehicle.fuelLevelPct > 100)) {
    errors.push("fuelLevelPct doit être entre 0 et 100");
  }
  
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════
// DELTA COMPRESSION (Optimisation réseau)
// ═══════════════════════════════════════════════════════════

export function createDelta<T extends Record<string, any>>(
  oldState: T,
  newState: T,
  version: number
): DeltaUpdate<T> {
  const delta: any = {
    __timestamp: Date.now(),
    __version: version,
  };
  
  for (const key in newState) {
    if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
      delta[key] = newState[key];
    }
  }
  
  return delta;
}

export function applyDelta<T extends Record<string, any>>(
  state: T,
  delta: DeltaUpdate<T>
): T {
  const { __timestamp, __version, ...changes } = delta;
  return { ...state, ...changes };
}

// ═══════════════════════════════════════════════════════════
// PAQUETS RÉSEAU (ENRICHIS v4.0)
// ═══════════════════════════════════════════════════════════

export type NetPacket =
  // Snapshots & Sync
  | { k: "snap"; p: Syncable<PlayerState> }
  | { k: "snapshot"; player: Syncable<PlayerState> }
  | { k: "hello"; state: Partial<RPRoomState> }
  | { k: "initial_sync"; fullState: RPRoomState }
  | { k: "delta_update"; entity: string; delta: DeltaUpdate<any> }
  
  // Mouvement (optimisé)
  | { k: "m"; d: number[] }
  | { k: "movement_batch"; d: number[] }
  | { k: "position_update"; playerId: string; pos: Vec3State; rot: number }
  
  // Véhicules
  | { k: "veh"; v: Syncable<VehicleState> }
  | { k: "vehicle_update"; vehicle: Syncable<VehicleState> }
  | { k: "veh_action"; action: string; vehId: string; value: any }
  | { k: "vehicle_damage"; vehId: string; zone: string; amount: number }
  
  // Chat
  | { k: "chat"; m: ChatMessageState }
  | { k: "chat_send"; m: ChatMessageState }
  
  // Propriétés
  | { k: "prop"; pr: Syncable<PropertyState> }
  | { k: "property_update"; property: Syncable<PropertyState> }
  
  // Actions policières / RP
  | { k: "cuff"; targetId: string; officerId: string; cuffType?: "front" | "back" }
  | { k: "police_ticket"; ticket: any }
  | { k: "police_read_rights"; officerId: string; targetId: string }
  | { k: "arrest"; officerId: string; suspectId: string; crimeId: CrimeId }
  
  // Médical
  | { k: "injury"; targetId: string; damage: number; condition?: MedicalCondition }
  | { k: "medical_cpr"; medicId: string; targetId: string }
  | { k: "hospital_admit"; patientId: string; condition: MedicalCondition }
  
  // Radio / CB
  | { k: "radio_tx"; freq?: number; senderId: string; active: boolean }
  | { k: "cb_tx"; channel: number; senderId: string; text?: string }
  
  // Monde
  | { k: "world"; timeOfDay: number; weather: WeatherCondition; riskLevel?: ThreatRiskLevel }
  | { k: "weather_update"; weather: WeatherCondition; temp: number; wind: number }
  
  // Alertes
  | { k: "alert_ready"; alert: EmergencyBroadcastState }
  | { k: "emergency_call"; type: string; location: Vec2State; callerId: string }
  
  // SQDC (NOUVEAU v4.0)
  | { k: "sqdc_store_update"; store: SqdcStoreState }
  | { k: "sqdc_transaction"; storeId: string; transaction: any }
  | { k: "sqdc_delivery"; delivery: SqdcDeliveryState }
  | { k: "sqdc_inspection"; inspection: SqdcInspectionState }
  | { k: "sqdc_robbery"; storeId: string; robberId: string }
  
  // Street Furniture (NOUVEAU v4.0)
  | { k: "street_update"; furniture: StreetFurnitureState }
  | { k: "street_interact"; furnitureId: string; interaction: string; playerId: string }
  | { k: "street_vandalize"; furnitureId: string; playerId: string }
  
  // World Items (NOUVEAU v4.0)
  | { k: "world_item_collect"; itemId: string; playerId: string }
  | { k: "world_item_respawn"; itemId: string }
  
  // Gangs (NOUVEAU v4.0)
  | { k: "gang_join"; playerId: string; gangId: string }
  | { k: "gang_leave"; playerId: string; gangId: string }
  | { k: "gang_promote"; playerId: string; newRank: GangRank }
  
  // Businesses (NOUVEAU v4.0)
  | { k: "firm_update"; firm: FirmState }
  | { k: "firm_hire"; firmId: string; employeeId: string }
  | { k: "firm_fire"; firmId: string; employeeId: string }
  
  // Crimes (NOUVEAU v4.0)
  | { k: "crime_commit"; playerId: string; crimeId: CrimeId; location: Vec2State }
  | { k: "crime_report"; reporterId: string; crimeId: CrimeId; suspectId?: string }
  | { k: "warrant_issue"; playerId: string; crimeId: CrimeId }
  
  // Connexion / Déconnexion
  | { k: "bye"; id: string }
  | { k: "player_disconnect"; playerId: string }
  | { k: "position_rejected"; x?: number; y?: number; z?: number; expectedPos?: Vec3State };

export function isNetPacket(data: unknown): data is NetPacket {
  return Boolean(data && typeof data === "object" && "k" in (data as object));
}

// ═══════════════════════════════════════════════════════════
// STATISTIQUES & MONITORING
// ═══════════════════════════════════════════════════════════

export interface RoomStats {
  playersOnline: number;
  vehiclesActive: number;
  businessesOpen: number;
  sqdcStoresOpen: number;
  crimesToday: number;
  arrestsToday: number;
  medicalCallsToday: number;
  networkPacketsPerSecond: number;
  averageLatencyMs: number;
}

export function calculateRoomStats(state: RPRoomState): RoomStats {
  return {
    playersOnline: Object.keys(state.players).length,
    vehiclesActive: Object.values(state.vehicles).filter(v => v.engineRunning).length,
    businessesOpen: Object.values(state.firms).filter(f => f.isOpen).length,
    sqdcStoresOpen: Object.values(state.sqdcStores).filter(s => s.isOpen).length,
    crimesToday: state.stats.crimesToday,
    arrestsToday: state.stats.arrestsToday,
    medicalCallsToday: state.stats.medicalCallsToday,
    networkPacketsPerSecond: 0,
    averageLatencyMs: 0,
  };
}
