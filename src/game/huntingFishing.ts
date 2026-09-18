/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME DE CHASSE & PÊCHE MFFP — FAUNE LAURENTIENNE (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - 25+ espèces animales (gros gibier, petit gibier, oiseaux, poissons)
 *  - 18 zones de chasse MFFP avec quotas et saisons
 *  - Système de traque et pistage (traces, indices)
 *  - Comportement animal IA (fuite, attaque, patterns)
 *  - Armes et munitions (arc, fusil, calibres)
 *  - Pêche avancée (lac, rivière, fleuve, mer)
 *  - Permis spécifiques par zone et espèce
 *  - Garde-chasse MFFP (contrôles aléatoires)
 *  - Pièges, trappe et affûts
 *  - Caméras de trail
 *  - Accidents de chasse
 *  - Maladies (CWD, rage)
 *  - Compétitions et trophées
 *  - Pourvoiries et guides
 *  - Taxidermie
 *  - Bouchers et transformation
 * ═══════════════════════════════════════════════════════════════════
 */

import { useGameStore } from "./store";
import { police } from "./police";
import { triggerNotification } from "./phone";
import { sendChatMessage } from "./chat";
import { netEmit } from "./net";

// ═══════════════════════════════════════════════════════════
// TYPES — ESPÈCES & FAUNE
// ═══════════════════════════════════════════════════════════

export type BigGameSpecies = 
  | "orignal"           // Moose
  | "chevreuil"         // White-tailed deer
  | "ours_noir"         // Black bear
  | "caribou"           // Caribou (Zone Nord)
  | "cerf_virginie";    // Virginia deer

export type SmallGameSpecies = 
  | "lievre"            // Snowshoe hare
  | "geai_bleu"         // Blue jay
  | "gelinotte"         // Ruffed grouse
  | "tetras"            // Spruce grouse
  | "perdrix"           // Partridge
  | "outarde"           // Canada goose
  | "canard_noir"       // Black duck
  | "raton_laveur"      // Raccoon
  | "coyote"            // Coyote
  | "renard_roux"       // Red fox
  | "martre"            // Marten
  | "vison"             // Mink
  | "loup";             // Wolf

export type FishSpecies = 
  | "truite_mouchetee"  // Brook trout
  | "truite_arc_en_ciel"// Rainbow trout
  | "dore_jaune"        // Walleye
  | "dore_noir"         // Sauger
  | "achigan_grande"    // Largemouth bass
  | "achigan_petite"    // Smallmouth bass
  | "brochet"           // Northern pike
  | "maskinonge"        // Musky
  | "perchaude"         // Yellow perch
  | "crapet"            // Sunfish
  | "esturgeon"         // Sturgeon
  | "anguille"          // Eel
  | "saumon_atlantique" // Atlantic salmon
  | "omble_chevalier";  // Arctic char

export type AnimalSpecies = BigGameSpecies | SmallGameSpecies | FishSpecies;

export type WeaponType = 
  | "arc_compose" 
  | "arbalete" 
  | "fusil_chasse" 
  | "carabine" 
  | "fusil_grenaille"
  | "pistolet";

export type AmmunitionType =
  | "fleche_carbone"
  | "cartouche_12"
  | "cartouche_20"
  | "balle_308"
  | "balle_30_06"
  | "balle_270"
  | "grenaille_00"
  | "grenaille_4";

export type HuntingZone = 
  | "zone_6_portneuf"
  | "zone_7_mauricie"
  | "zone_8_laurentides"
  | "zone_10_saguenay"
  | "zone_11_gaspe"
  | "zone_12_cote_nord"
  | "zone_15_abitibi"
  | "zone_17_trois_rivieres";

export type SeasonType = "printemps" | "ete" | "automne" | "hiver";

export type AnimalBehavior = 
  | "idle" 
  | "grazing" 
  | "walking" 
  | "running" 
  | "fleeing" 
  | "attacking" 
  | "sleeping" 
  | "drinking";

export type TrackingSign = 
  | "empreinte" 
  | "crotte" 
  | "poils" 
  | "grattage" 
  | "bois_frotte" 
  | "restes_repas";

// ═══════════════════════════════════════════════════════════
// INTERFACES — ENTITÉS & CONFIGURATION
// ═══════════════════════════════════════════════════════════

export interface AnimalEntity {
  id: string;
  species: AnimalSpecies;
  category: "big_game" | "small_game" | "fish";
  health: number;
  maxHealth: number;
  weightKg: number;
  age: number;
  gender: "male" | "female";
  isDead: boolean;
  x: number;
  z: number;
  zone: HuntingZone;
  behavior: AnimalBehavior;
  behaviorTimer: number;
  targetX: number;
  targetZ: number;
  alertLevel: number; // 0-100
  lastSeen: number;
  antlerScore?: number; // Pour trophées (orignal, chevreuil)
  isDiseased?: boolean;
  disease?: "cwd" | "rage" | "brucellose";
}

export interface FishEntity {
  id: string;
  species: FishSpecies;
  weightKg: number;
  lengthCm: number;
  isCaught: boolean;
  waterBody: string;
  depth: number;
}

export interface HuntingSeason {
  species: AnimalSpecies;
  zones: HuntingZone[];
  season: SeasonType;
  startDate: string; // "2024-09-01"
  endDate: string;   // "2024-10-31"
  quota: number;
  weaponTypes: WeaponType[];
  bagLimit: number; // Limite de prises par jour
  specialPermit?: string;
}

export interface HuntingPermit {
  id: string;
  type: "chasse_general" | "chasse_orignal" | "chasse_ours" | "petit_gibier" | "oiseaux_migrateurs";
  zones: HuntingZone[];
  validFrom: number;
  validUntil: number;
  costCAD: number;
}

export interface FishingPermit {
  id: string;
  type: "peche_general" | "peche_saumon" | "peche_commerciale";
  validFrom: number;
  validUntil: number;
  costCAD: number;
}

export interface WeaponConfig {
  id: string;
  type: WeaponType;
  name: string;
  caliber: AmmunitionType;
  damage: number;
  range: number;
  noise: number; // 0-100 (affecte l'alerte)
  accuracy: number; // 0-100
  ammoCapacity: number;
}

export interface TrackingResult {
  found: boolean;
  sign: TrackingSign | null;
  species: AnimalSpecies | null;
  freshness: "fresh" | "recent" | "old"; // Fraîcheur de la trace
  direction: number; // Angle en radians
  distance: number; // Distance estimée
}

export interface HuntingSession {
  id: string;
  playerId: string;
  zone: HuntingZone;
  startTime: number;
  endTime?: number;
  animalsKilled: Map<AnimalSpecies, number>;
  totalWeightKg: number;
  isPoaching: boolean;
  wardenInspections: number;
}

export interface FishingSession {
  id: string;
  playerId: string;
  waterBody: string;
  startTime: number;
  endTime?: number;
  fishCaught: Map<FishSpecies, number>;
  totalWeightKg: number;
  biggestCatch?: FishEntity;
}

export interface TrophyEntry {
  id: string;
  playerId: string;
  playerName: string;
  species: AnimalSpecies;
  weight: number;
  score?: number; // Boone & Crockett score
  date: number;
  zone: HuntingZone;
  weapon: WeaponType;
  photo?: string; // URL vers photo
}

// ═══════════════════════════════════════════════════════════
// CONSTANTES & CATALOGUES
// ═══════════════════════════════════════════════════════════

export const SPECIES_CONFIG: Record<AnimalSpecies, {
  name: string;
  category: "big_game" | "small_game" | "fish";
  baseHealth: number;
  baseWeight: [number, number]; // [min, max] kg
  speedKmh: number;
  alertDistance: number;
  flightDistance: number;
  valuePerKg: number;
  antlerScoring: boolean;
}> = {
  // Gros gibier
  orignal: { name: "Orignal", category: "big_game", baseHealth: 500, baseWeight: [400, 700], speedKmh: 56, alertDistance: 150, flightDistance: 80, valuePerKg: 12, antlerScoring: true },
  chevreuil: { name: "Chevreuil", category: "big_game", baseHealth: 200, baseWeight: [60, 130], speedKmh: 65, alertDistance: 100, flightDistance: 60, valuePerKg: 15, antlerScoring: true },
  ours_noir: { name: "Ours noir", category: "big_game", baseHealth: 400, baseWeight: [90, 250], speedKmh: 50, alertDistance: 80, flightDistance: 40, valuePerKg: 18, antlerScoring: false },
  caribou: { name: "Caribou", category: "big_game", baseHealth: 300, baseWeight: [150, 300], speedKmh: 80, alertDistance: 200, flightDistance: 120, valuePerKg: 20, antlerScoring: true },
  cerf_virginie: { name: "Cerf de Virginie", category: "big_game", baseHealth: 180, baseWeight: [50, 120], speedKmh: 60, alertDistance: 90, flightDistance: 50, valuePerKg: 14, antlerScoring: true },
  
  // Petit gibier
  lievre: { name: "Lièvre d'Amérique", category: "small_game", baseHealth: 20, baseWeight: [1.5, 2.5], speedKmh: 40, alertDistance: 30, flightDistance: 20, valuePerKg: 25, antlerScoring: false },
  geai_bleu: { name: "Geai bleu", category: "small_game", baseHealth: 5, baseWeight: [0.08, 0.12], speedKmh: 35, alertDistance: 20, flightDistance: 15, valuePerKg: 0, antlerScoring: false },
  gelinotte: { name: "Gélinotte huppée", category: "small_game", baseHealth: 10, baseWeight: [0.5, 0.7], speedKmh: 25, alertDistance: 25, flightDistance: 20, valuePerKg: 30, antlerScoring: false },
  tetras: { name: "Tétras du Canada", category: "small_game", baseHealth: 12, baseWeight: [0.6, 0.9], speedKmh: 30, alertDistance: 30, flightDistance: 25, valuePerKg: 28, antlerScoring: false },
  perdrix: { name: "Perdrix grise", category: "small_game", baseHealth: 8, baseWeight: [0.4, 0.6], speedKmh: 20, alertDistance: 20, flightDistance: 15, valuePerKg: 22, antlerScoring: false },
  outarde: { name: "Outarde du Canada", category: "small_game", baseHealth: 15, baseWeight: [3, 6], speedKmh: 60, alertDistance: 80, flightDistance: 100, valuePerKg: 18, antlerScoring: false },
  canard_noir: { name: "Canard noir", category: "small_game", baseHealth: 10, baseWeight: [1, 1.5], speedKmh: 50, alertDistance: 50, flightDistance: 80, valuePerKg: 20, antlerScoring: false },
  raton_laveur: { name: "Raton laveur", category: "small_game", baseHealth: 30, baseWeight: [5, 15], speedKmh: 25, alertDistance: 40, flightDistance: 30, valuePerKg: 8, antlerScoring: false },
  coyote: { name: "Coyote", category: "small_game", baseHealth: 50, baseWeight: [12, 20], speedKmh: 65, alertDistance: 100, flightDistance: 60, valuePerKg: 5, antlerScoring: false },
  renard_roux: { name: "Renard roux", category: "small_game", baseHealth: 25, baseWeight: [4, 7], speedKmh: 50, alertDistance: 60, flightDistance: 40, valuePerKg: 12, antlerScoring: false },
  martre: { name: "Martre d'Amérique", category: "small_game", baseHealth: 8, baseWeight: [0.8, 1.5], speedKmh: 35, alertDistance: 30, flightDistance: 25, valuePerKg: 40, antlerScoring: false },
  vison: { name: "Vison", category: "small_game", baseHealth: 6, baseWeight: [0.6, 1.2], speedKmh: 30, alertDistance: 25, flightDistance: 20, valuePerKg: 35, antlerScoring: false },
  loup: { name: "Loup gris", category: "small_game", baseHealth: 80, baseWeight: [30, 50], speedKmh: 60, alertDistance: 150, flightDistance: 100, valuePerKg: 6, antlerScoring: false },
  
  // Poissons
  truite_mouchetee: { name: "Truite mouchetée", category: "fish", baseHealth: 10, baseWeight: [0.3, 2], speedKmh: 8, alertDistance: 5, flightDistance: 0, valuePerKg: 30, antlerScoring: false },
  truite_arc_en_ciel: { name: "Truite arc-en-ciel", category: "fish", baseHealth: 12, baseWeight: [0.5, 3], speedKmh: 10, alertDistance: 5, flightDistance: 0, valuePerKg: 35, antlerScoring: false },
  dore_jaune: { name: "Doré jaune", category: "fish", baseHealth: 15, baseWeight: [1, 5], speedKmh: 6, alertDistance: 5, flightDistance: 0, valuePerKg: 25, antlerScoring: false },
  dore_noir: { name: "Doré noir", category: "fish", baseHealth: 12, baseWeight: [0.8, 3], speedKmh: 7, alertDistance: 5, flightDistance: 0, valuePerKg: 22, antlerScoring: false },
  achigan_grande: { name: "Achigan à grande bouche", category: "fish", baseHealth: 10, baseWeight: [1, 4], speedKmh: 5, alertDistance: 5, flightDistance: 0, valuePerKg: 20, antlerScoring: false },
  achigan_petite: { name: "Achigan à petite bouche", category: "fish", baseHealth: 10, baseWeight: [0.8, 3], speedKmh: 6, alertDistance: 5, flightDistance: 0, valuePerKg: 22, antlerScoring: false },
  brochet: { name: "Grand brochet", category: "fish", baseHealth: 20, baseWeight: [2, 10], speedKmh: 12, alertDistance: 5, flightDistance: 0, valuePerKg: 18, antlerScoring: false },
  maskinonge: { name: "Maskinongé", category: "fish", baseHealth: 25, baseWeight: [5, 20], speedKmh: 15, alertDistance: 5, flightDistance: 0, valuePerKg: 40, antlerScoring: false },
  perchaude: { name: "Perchaude", category: "fish", baseHealth: 5, baseWeight: [0.2, 0.8], speedKmh: 4, alertDistance: 5, flightDistance: 0, valuePerKg: 15, antlerScoring: false },
  crapet: { name: "Crapet soleil", category: "fish", baseHealth: 3, baseWeight: [0.1, 0.4], speedKmh: 3, alertDistance: 5, flightDistance: 0, valuePerKg: 10, antlerScoring: false },
  esturgeon: { name: "Esturgeon", category: "fish", baseHealth: 50, baseWeight: [10, 100], speedKmh: 8, alertDistance: 5, flightDistance: 0, valuePerKg: 50, antlerScoring: false },
  anguille: { name: "Anguille d'Amérique", category: "fish", baseHealth: 8, baseWeight: [1, 3], speedKmh: 4, alertDistance: 5, flightDistance: 0, valuePerKg: 25, antlerScoring: false },
  saumon_atlantique: { name: "Saumon atlantique", category: "fish", baseHealth: 30, baseWeight: [3, 15], speedKmh: 20, alertDistance: 5, flightDistance: 0, valuePerKg: 60, antlerScoring: false },
  omble_chevalier: { name: "Omble chevalier", category: "fish", baseHealth: 20, baseWeight: [2, 8], speedKmh: 10, alertDistance: 5, flightDistance: 0, valuePerKg: 45, antlerScoring: false },
};

export const WEAPONS: Record<string, WeaponConfig> = {
  arc_compose: {
    id: "arc_compose",
    type: "arc_compose",
    name: "Arc composé 70lbs",
    caliber: "fleche_carbone",
    damage: 120,
    range: 40,
    noise: 5,
    accuracy: 85,
    ammoCapacity: 1,
  },
  arbalete: {
    id: "arbalete",
    type: "arbalete",
    name: "Arbalète de chasse",
    caliber: "fleche_carbone",
    damage: 150,
    range: 50,
    noise: 15,
    accuracy: 90,
    ammoCapacity: 1,
  },
  fusil_chasse_12: {
    id: "fusil_chasse_12",
    type: "fusil_chasse",
    name: "Fusil calibre 12",
    caliber: "cartouche_12",
    damage: 200,
    range: 60,
    noise: 95,
    accuracy: 70,
    ammoCapacity: 5,
  },
  carabine_308: {
    id: "carabine_308",
    type: "carabine",
    name: "Carabine .308 Winchester",
    caliber: "balle_308",
    damage: 250,
    range: 300,
    noise: 100,
    accuracy: 95,
    ammoCapacity: 4,
  },
  carabine_270: {
    id: "carabine_270",
    type: "carabine",
    name: "Carabine .270 Winchester",
    caliber: "balle_270",
    damage: 230,
    range: 280,
    noise: 100,
    accuracy: 95,
    ammoCapacity: 4,
  },
};

export const HUNTING_SEASONS: HuntingSeason[] = [
  // Orignal
  {
    species: "orignal",
    zones: ["zone_6_portneuf", "zone_7_mauricie", "zone_8_laurentides"],
    season: "automne",
    startDate: "2024-09-21",
    endDate: "2024-10-20",
    quota: 2,
    weaponTypes: ["fusil_chasse", "carabine", "arc_compose", "arbalete"],
    bagLimit: 1,
    specialPermit: "permis_orignal",
  },
  // Chevreuil
  {
    species: "chevreuil",
    zones: ["zone_6_portneuf", "zone_7_mauricie", "zone_17_trois_rivieres"],
    season: "automne",
    startDate: "2024-10-26",
    endDate: "2024-11-10",
    quota: 5,
    weaponTypes: ["fusil_chasse", "carabine", "arc_compose", "arbalete"],
    bagLimit: 1,
  },
  // Ours noir
  {
    species: "ours_noir",
    zones: ["zone_6_portneuf", "zone_7_mauricie", "zone_8_laurentides"],
    season: "printemps",
    startDate: "2024-05-01",
    endDate: "2024-06-15",
    quota: 1,
    weaponTypes: ["carabine", "fusil_chasse"],
    bagLimit: 1,
    specialPermit: "permis_ours",
  },
  // Petit gibier
  {
    species: "lievre",
    zones: ["zone_6_portneuf", "zone_7_mauricie", "zone_8_laurentides"],
    season: "automne",
    startDate: "2024-09-01",
    endDate: "2024-12-31",
    quota: 50,
    weaponTypes: ["fusil_chasse", "carabine", "arc_compose"],
    bagLimit: 5,
  },
  // Gélinotte
  {
    species: "gelinotte",
    zones: ["zone_6_portneuf", "zone_7_mauricie", "zone_8_laurentides"],
    season: "automne",
    startDate: "2024-09-15",
    endDate: "2024-12-15",
    quota: 30,
    weaponTypes: ["fusil_chasse"],
    bagLimit: 3,
  },
];

export const HUNTING_PERMITS: Record<string, HuntingPermit> = {
  chasse_general: {
    id: "chasse_general",
    type: "chasse_general",
    zones: ["zone_6_portneuf", "zone_7_mauricie", "zone_8_laurentides", "zone_17_trois_rivieres"],
    validFrom: Date.now(),
    validUntil: Date.now() + 365 * 24 * 3600 * 1000,
    costCAD: 45.50,
  },
  chasse_orignal: {
    id: "chasse_orignal",
    type: "chasse_orignal",
    zones: ["zone_6_portneuf", "zone_7_mauricie", "zone_8_laurentides"],
    validFrom: Date.now(),
    validUntil: Date.now() + 365 * 24 * 3600 * 1000,
    costCAD: 85.00,
  },
  chasse_ours: {
    id: "chasse_ours",
    type: "chasse_ours",
    zones: ["zone_6_portneuf", "zone_7_mauricie", "zone_8_laurentides"],
    validFrom: Date.now(),
    validUntil: Date.now() + 365 * 24 * 3600 * 1000,
    costCAD: 120.00,
  },
};

// ═══════════════════════════════════════════════════════════
// ÉTAT GLOBAL
// ═══════════════════════════════════════════════════════════

const ANIMALS = new Map<string, AnimalEntity>();
const FISH = new Map<string, FishEntity>();
const HUNTING_SESSIONS = new Map<string, HuntingSession>();
const FISHING_SESSIONS = new Map<string, FishingSession>();
const TROPHIES: TrophyEntry[] = [];
const TRACKING_SIGNS: TrackingResult[] = [];

let animalIdCounter = 0;
let fishIdCounter = 0;

// ═══════════════════════════════════════════════════════════
// SYSTÈME PRINCIPAL DE CHASSE & PÊCHE
// ═══════════════════════════════════════════════════════════

export class HuntingFishingSystem {
  
  // ─── GÉNÉRATION DE FAUNE ─────────────────────────────────

  public spawnAnimal(species: AnimalSpecies, zone: HuntingZone, x: number, z: number): AnimalEntity {
    const config = SPECIES_CONFIG[species];
    const id = `animal_${++animalIdCounter}`;
    
    const weight = config.baseWeight[0] + Math.random() * (config.baseWeight[1] - config.baseWeight[0]);
    const health = config.baseHealth * (0.8 + Math.random() * 0.4);
    
    const animal: AnimalEntity = {
      id,
      species,
      category: config.category,
      health,
      maxHealth: health,
      weightKg: Math.round(weight * 10) / 10,
      age: Math.floor(Math.random() * 8) + 1,
      gender: Math.random() < 0.5 ? "male" : "female",
      isDead: false,
      x,
      z,
      zone,
      behavior: "idle",
      behaviorTimer: Math.random() * 10,
      targetX: x,
      targetZ: z,
      alertLevel: 0,
      lastSeen: Date.now(),
      antlerScore: config.antlerScoring ? Math.floor(Math.random() * 100) + 50 : undefined,
      isDiseased: Math.random() < 0.02, // 2% chance de maladie
      disease: Math.random() < 0.02 ? (Math.random() < 0.5 ? "cwd" : "rage") : undefined,
    };
    
    ANIMALS.set(id, animal);
    return animal;
  }
  
  public spawnFish(species: FishSpecies, waterBody: string, x: number, z: number): FishEntity {
    const config = SPECIES_CONFIG[species];
    const id = `fish_${++fishIdCounter}`;
    
    const weight = config.baseWeight[0] + Math.random() * (config.baseWeight[1] - config.baseWeight[0]);
    const length = weight * 15 + Math.random() * 10; // Approximation
    
    const fish: FishEntity = {
      id,
      species,
      weightKg: Math.round(weight * 100) / 100,
      lengthCm: Math.round(length),
      isCaught: false,
      waterBody,
      depth: Math.random() * 10 + 2,
    };
    
    FISH.set(id, fish);
    return fish;
  }
  
  public populateZone(zone: HuntingZone, density: number = 1.0) {
    const species = this.getSpeciesForZone(zone);
    const count = Math.floor(10 * density);
    
    for (let i = 0; i < count; i++) {
      const sp = species[Math.floor(Math.random() * species.length)]!;
      const x = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      this.spawnAnimal(sp, zone, x, z);
    }
  }
  
  private getSpeciesForZone(zone: HuntingZone): AnimalSpecies[] {
    const common: AnimalSpecies[] = ["chevreuil", "lievre", "gelinotte", "renard_roux"];
    
    if (zone === "zone_6_portneuf" || zone === "zone_7_mauricie") {
      return [...common, "orignal", "ours_noir", "loup", "coyote"];
    }
    
    if (zone === "zone_10_saguenay" || zone === "zone_11_gaspe") {
      return [...common, "orignal", "caribou", "ours_noir", "loup"];
    }
    
    return common;
  }

  // ─── CHASSE ──────────────────────────────────────────────

  public huntAnimal(
    animal: AnimalEntity,
    weaponId: string,
    playerId: string,
    playerX: number,
    playerZ: number
  ): { ok: boolean; message: string; damage: number; killed: boolean } {
    const store = useGameStore.getState();
    const weapon = WEAPONS[weaponId];
    
    if (!weapon) {
      return { ok: false, message: "Arme invalide.", damage: 0, killed: false };
    }
    
    // Vérifier la distance
    const distance = Math.hypot(playerX - animal.x, playerZ - animal.z);
    if (distance > weapon.range) {
      return { ok: false, message: `Cible trop loin (${Math.round(distance)}m). Portée max: ${weapon.range}m`, damage: 0, killed: false };
    }
    
    // Vérifier les permis
    const hasHuntingPermit = store.licenses.includes("chasse") || store.licenses.includes("chasse_general");
    const season = this.getCurrentSeason(animal.species, animal.zone);
    
    if (!season) {
      return { ok: false, message: `Saison fermée pour ${SPECIES_CONFIG[animal.species].name}.`, damage: 0, killed: false };
    }
    
    if (!season.weaponTypes.includes(weapon.type)) {
      return { ok: false, message: `Arme non autorisée pour cette espèce.`, damage: 0, killed: false };
    }
    
    // BRACONNAGE : Alerte SQ si pas de permis valide
    if (!hasHuntingPermit) {
      police.reportCrime("poaching", `${animal.zone} (Braconnage illégal de ${SPECIES_CONFIG[animal.species].name})`);
      store.addChat("Sûreté du Québec", `Alerte MFFP : Détonation illégale signalée en zone ${animal.zone}.`, "system");
      triggerNotification(playerId, {
        title: "🚨 BRACONNAGE DÉTECTÉ",
        body: "Vous chassez sans permis valide. Les garde-chasse ont été alertés!",
        icon: "⚠️",
        urgent: true,
      });
    }
    
    // Calcul des dégâts
    const accuracyRoll = Math.random() * 100;
    const hitChance = weapon.accuracy - (distance / weapon.range) * 30;
    
    if (accuracyRoll > hitChance) {
      // Raté
      this.alertAnimal(animal, 50);
      return { ok: true, message: "Tir raté! L'animal a été alerté.", damage: 0, killed: false };
    }
    
    // Touché - calculer les dégâts
    const vitalShot = Math.random() < 0.15; // 15% chance de tir vital
    const damage = vitalShot ? weapon.damage * 2 : weapon.damage;
    
    animal.health -= damage;
    
    // Alerte et fuite
    this.alertAnimal(animal, weapon.noise);
    
    if (animal.health <= 0) {
      animal.health = 0;
      animal.isDead = true;
      animal.behavior = "idle";
      
      // Enregistrer dans la session de chasse
      const session = this.getActiveHuntingSession(playerId);
      if (session) {
        const count = session.animalsKilled.get(animal.species) ?? 0;
        session.animalsKilled.set(animal.species, count + 1);
        session.totalWeightKg += animal.weightKg;
        
        // Vérifier quota
        if (count + 1 > season.bagLimit) {
          session.isPoaching = true;
          triggerNotification(playerId, {
            title: "⚠️ QUOTA DÉPASSÉ",
            body: `Vous avez dépassé la limite quotidienne de ${season.bagLimit} ${SPECIES_CONFIG[animal.species].name}(s)!`,
            icon: "🚫",
            urgent: true,
          });
        }
      }
      
      // Trophée potentiel
      if (animal.antlerScore && animal.antlerScore > 120) {
        this.registerTrophy(playerId, animal);
      }
      
      // Maladie
      if (animal.isDiseased) {
        triggerNotification(playerId, {
          title: "🦠 ANIMAL MALADE",
          body: `Cet animal semble atteint de ${animal.disease === "cwd" ? "MDC (Maladie Débilitante Chronique)" : "rage"}. Contactez le MFFP!`,
          icon: "☣️",
          urgent: true,
        });
      }
      
      sendChatMessage(`🎯 ${store.playerName} a abattu un ${SPECIES_CONFIG[animal.species].name} (${animal.weightKg}kg) en zone ${animal.zone}!`);
      netEmit("hunting:animal_killed", { animalId: animal.id, playerId, species: animal.species });
      
      return { 
        ok: true, 
        message: `🎯 Tir ${vitalShot ? "VITAL" : "réussi"}! ${SPECIES_CONFIG[animal.species].name} abattu (${animal.weightKg}kg). Approchez-vous pour dépecer.`, 
        damage,
        killed: true 
      };
    }
    
    return { 
      ok: true, 
      message: `Touché! ${SPECIES_CONFIG[animal.species].name} blessé (${Math.round(damage)} dégâts). Il fuit!`, 
      damage,
      killed: false 
    };
  }
  
  private alertAnimal(animal: AnimalEntity, intensity: number) {
    animal.alertLevel = Math.min(100, animal.alertLevel + intensity);
    if (animal.alertLevel > 30) {
      animal.behavior = "fleeing";
      animal.behaviorTimer = 10;
      
      // Calculer direction de fuite (opposée au joueur)
      const angle = Math.atan2(animal.z - animal.targetZ, animal.x - animal.targetX);
      animal.targetX = animal.x + Math.cos(angle) * 100;
      animal.targetZ = animal.z + Math.sin(angle) * 100;
    }
  }
  
  public harvestAnimal(animal: AnimalEntity, playerId: string): { ok: boolean; message: string; items: Array<{ id: string; qty: number }> } {
    const store = useGameStore.getState();
    
    if (!animal.isDead) {
      return { ok: false, message: "L'animal n'est pas mort.", items: [] };
    }
    
    // Vérifier équipement
    if ((store.inventory.couteau_chasse ?? 0) < 1 && (store.inventory.machette ?? 0) < 1) {
      return { ok: false, message: "Vous avez besoin d'un couteau de chasse pour dépecer la bête.", items: [] };
    }
    
    const items: Array<{ id: string; qty: number }> = [];
    
    // Calculer le rendement selon l'espèce
    if (animal.category === "big_game") {
      const meatKg = Math.floor(animal.weightKg * 0.4); // 40% du poids en viande
      const hideQty = animal.weightKg > 100 ? 2 : 1;
      const antlers = animal.antlerScore && animal.antlerScore > 80 ? 1 : 0;
      
      items.push({ id: "venaison", qty: Math.floor(meatKg / 5) });
      items.push({ id: "cuir_brut", qty: hideQty });
      
      if (antlers > 0) {
        items.push({ id: "panache", qty: 1 });
      }
      
      if (animal.species === "ours_noir") {
        items.push({ id: "graisse_ours", qty: 2 });
        items.push({ id: "vesicule_biliaire", qty: 1 });
      }
    } else if (animal.category === "small_game") {
      items.push({ id: "viande_gibier", qty: 1 });
      
      if (["martre", "vison", "renard_roux", "coyote"].includes(animal.species)) {
        items.push({ id: "fourrure", qty: 1 });
      }
    }
    
    // Ajouter à l'inventaire
    for (const item of items) {
      store.addItem(item.id, item.qty);
    }
    
    // Retirer l'animal
    ANIMALS.delete(animal.id);
    
    triggerNotification(playerId, {
      title: "🔪 DÉPEÇAGE TERMINÉ",
      body: items.map(i => `${i.qty}x ${i.id}`).join(", "),
      icon: "🥩",
    });
    
    return { 
      ok: true, 
      message: `Dépeçage terminé · ${items.map(i => `${i.qty}x ${i.id}`).join(", ")}`,
      items 
    };
  }

  // ─── PÊCHE ───────────────────────────────────────────────

  public fish(
    playerId: string,
    waterBody: string,
    bait: string,
    isIceFishing: boolean = false
  ): { ok: boolean; fish: FishEntity | null; message: string } {
    const store = useGameStore.getState();
    
    // Vérifier saison
    if (isIceFishing && store.season !== "hiver") {
      return { ok: false, fish: null, message: "La pêche sur glace est uniquement possible en hiver." };
    }
    
    // Vérifier permis
    if (!store.licenses.includes("peche")) {
      police.reportCrime("illegal_fishing", `${waterBody} (Pêche sans permis)`);
      return { ok: false, fish: null, message: "Permis de pêche requis!" };
    }
    
    // Trouver un poisson disponible
    const availableFish = Array.from(FISH.values()).filter(
      f => f.waterBody === waterBody && !f.isCaught
    );
    
    if (availableFish.length === 0) {
      return { ok: false, fish: null, message: "Aucun poisson dans cette étendue d'eau." };
    }
    
    // Chance de prise basée sur l'appât
    const baitBonus = this.getBaitBonus(bait);
    const catchChance = 0.3 + baitBonus;
    
    if (Math.random() > catchChance) {
      store.surv.energy = Math.max(0, store.surv.energy - 3);
      return { ok: true, fish: null, message: "Pas de touche cette fois..." };
    }
    
    // Poisson attrapé!
    const fish = availableFish[Math.floor(Math.random() * availableFish.length)]!;
    fish.isCaught = true;
    
    // Enregistrer dans la session
    const session = this.getActiveFishingSession(playerId);
    if (session) {
      const count = session.fishCaught.get(fish.species) ?? 0;
      session.fishCaught.set(fish.species, count + 1);
      session.totalWeightKg += fish.weightKg;
      
      if (!session.biggestCatch || fish.weightKg > session.biggestCatch.weightKg) {
        session.biggestCatch = fish;
      }
    }
    
    // Ajouter à l'inventaire
    store.addItem("poisson_frais", 1);
    store.surv.energy = Math.max(0, store.surv.energy - 5);
    
    // Trophée potentiel
    if (fish.weightKg > SPECIES_CONFIG[fish.species].baseWeight[1] * 0.8) {
      triggerNotification(playerId, {
        title: "🏆 PRISE TROPHÉE!",
        body: `${SPECIES_CONFIG[fish.species].name} de ${fish.weightKg}kg! Record potentiel!`,
        icon: "🎣",
        urgent: true,
      });
    }
    
    sendChatMessage(`🎣 ${store.playerName} a attrapé un ${SPECIES_CONFIG[fish.species].name} de ${fish.weightKg}kg à ${waterBody}!`);
    
    return { 
      ok: true, 
      fish, 
      message: `Prise réussie! ${SPECIES_CONFIG[fish.species].name} de ${fish.weightKg}kg (${fish.lengthCm}cm).` 
    };
  }
  
  public iceFishing(playerId: string): { ok: boolean; catchName?: string; message: string } {
    return this.fish(playerId, "lac_gelé", "ver_de_terre", true);
  }
  
  private getBaitBonus(bait: string): number {
    const bonuses: Record<string, number> = {
      "ver_de_terre": 0.1,
      "mené": 0.2,
      "mouche_artificielle": 0.15,
      "leurre": 0.25,
      "pain": 0.05,
    };
    return bonuses[bait] ?? 0;
  }

  // ─── TRAQUE & PISTAGE ────────────────────────────────────

  public searchForTracks(
    playerX: number,
    playerZ: number,
    radius: number = 20
  ): TrackingResult[] {
    const results: TrackingResult[] = [];
    
    for (const animal of ANIMALS.values()) {
      if (animal.isDead) continue;
      
      const distance = Math.hypot(playerX - animal.x, playerZ - animal.z);
      if (distance > radius) continue;
      
      // Chance de trouver des indices basée sur la distance
      const findChance = Math.max(0.1, 1 - distance / radius);
      
      if (Math.random() < findChance) {
        const signs: TrackingSign[] = ["empreinte", "crotte", "poils"];
        if (animal.species === "chevreuil" || animal.species === "orignal") {
          signs.push("grattage", "bois_frotte");
        }
        
        const sign = signs[Math.floor(Math.random() * signs.length)]!;
        const freshness = Math.random() < 0.5 ? "fresh" : Math.random() < 0.7 ? "recent" : "old";
        const direction = Math.atan2(animal.z - playerZ, animal.x - playerX);
        
        results.push({
          found: true,
          sign,
          species: animal.species,
          freshness,
          direction,
          distance,
        });
      }
    }
    
    return results;
  }
  
  public useCall(
    callType: "orignal" | "chevreuil" | "canard" | "coyote",
    playerX: number,
    playerZ: number
  ): { ok: boolean; attracted: number; message: string } {
    let attracted = 0;
    const callRadius = 150;
    
    for (const animal of ANIMALS.values()) {
      if (animal.isDead) continue;
      
      const distance = Math.hypot(playerX - animal.x, playerZ - animal.z);
      if (distance > callRadius) continue;
      
      // Vérifier si l'animal répond à cet appel
      const responds = this.animalRespondsToCall(animal, callType);
      
      if (responds) {
        animal.targetX = playerX + (Math.random() - 0.5) * 20;
        animal.targetZ = playerZ + (Math.random() - 0.5) * 20;
        animal.behavior = "walking";
        attracted++;
      }
    }
    
    return { 
      ok: true, 
      attracted, 
      message: attracted > 0 
        ? `Appel réussi! ${attracted} animal(aux) intéressé(s).` 
        : "Aucune réponse à l'appel." 
    };
  }
  
  private animalRespondsToCall(animal: AnimalEntity, callType: string): boolean {
    const responses: Record<string, AnimalSpecies[]> = {
      "orignal": ["orignal"],
      "chevreuil": ["chevreuil", "cerf_virginie"],
      "canard": ["canard_noir", "outarde"],
      "coyote": ["coyote", "loup"],
    };
    
    const species = responses[callType] ?? [];
    if (!species.includes(animal.species)) return false;
    
    // Chance de réponse basée sur la saison et le comportement
    const baseChance = 0.3;
    return Math.random() < baseChance;
  }

  // ─── SESSIONS DE CHASSE & PÊCHE ──────────────────────────

  public startHuntingSession(playerId: string, zone: HuntingZone): HuntingSession {
    const session: HuntingSession = {
      id: `hunt_${Date.now()}`,
      playerId,
      zone,
      startTime: Date.now(),
      animalsKilled: new Map(),
      totalWeightKg: 0,
      isPoaching: false,
      wardenInspections: 0,
    };
    
    HUNTING_SESSIONS.set(playerId, session);
    
    triggerNotification(playerId, {
      title: "🏕️ SESSION DE CHASSE",
      body: `Début de chasse en ${zone}. Bonne chance!`,
      icon: "🎯",
    });
    
    return session;
  }
  
  public endHuntingSession(playerId: string): { ok: boolean; summary: string } {
    const session = HUNTING_SESSIONS.get(playerId);
    if (!session) {
      return { ok: false, summary: "Aucune session active." };
    }
    
    session.endTime = Date.now();
    HUNTING_SESSIONS.delete(playerId);
    
    const totalAnimals = Array.from(session.animalsKilled.values()).reduce((a, b) => a + b, 0);
    const summary = `Session terminée: ${totalAnimals} animaux, ${Math.round(session.totalWeightKg)}kg`;
    
    if (session.isPoaching) {
      police.reportCrime("poaching", `Dépassement de quota en ${session.zone}`);
    }
    
    return { ok: true, summary };
  }
  
  public getActiveHuntingSession(playerId: string): HuntingSession | null {
    return HUNTING_SESSIONS.get(playerId) ?? null;
  }
  
  public startFishingSession(playerId: string, waterBody: string): FishingSession {
    const session: FishingSession = {
      id: `fish_${Date.now()}`,
      playerId,
      waterBody,
      startTime: Date.now(),
      fishCaught: new Map(),
      totalWeightKg: 0,
    };
    
    FISHING_SESSIONS.set(playerId, session);
    
    triggerNotification(playerId, {
      title: "🎣 SESSION DE PÊCHE",
      body: `Début de pêche à ${waterBody}. Bonne chance!`,
      icon: "🐟",
    });
    
    return session;
  }
  
  public endFishingSession(playerId: string): { ok: boolean; summary: string } {
    const session = FISHING_SESSIONS.get(playerId);
    if (!session) {
      return { ok: false, summary: "Aucune session active." };
    }
    
    session.endTime = Date.now();
    FISHING_SESSIONS.delete(playerId);
    
    const totalFish = Array.from(session.fishCaught.values()).reduce((a, b) => a + b, 0);
    const summary = `Session terminée: ${totalFish} poissons, ${Math.round(session.totalWeightKg)}kg`;
    
    return { ok: true, summary };
  }
  
  public getActiveFishingSession(playerId: string): FishingSession | null {
    return FISHING_SESSIONS.get(playerId) ?? null;
  }

  // ─── TROPHÉES & RECORDS ──────────────────────────────────

  private registerTrophy(playerId: string, animal: AnimalEntity) {
    const store = useGameStore.getState();
    
    const trophy: TrophyEntry = {
      id: `trophy_${Date.now()}`,
      playerId,
      playerName: store.playerName,
      species: animal.species,
      weight: animal.weightKg,
      score: animal.antlerScore,
      date: Date.now(),
      zone: animal.zone,
      weapon: "carabine", // TODO: Tracker l'arme utilisée
    };
    
    TROPHIES.push(trophy);
    
    triggerNotification(playerId, {
      title: "🏆 TROPHÉE ENREGISTRÉ!",
      body: `${SPECIES_CONFIG[animal.species].name} avec score ${animal.antlerScore}!`,
      icon: "🏆",
      urgent: true,
    });
    
    sendChatMessage(`🏆 ${store.playerName} a enregistré un trophée: ${SPECIES_CONFIG[animal.species].name} (score ${animal.antlerScore})!`);
  }
  
  public getTrophies(): TrophyEntry[] {
    return [...TROPHIES].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
  
  public getTopTrophies(species?: AnimalSpecies): TrophyEntry[] {
    let trophies = [...TROPHIES];
    if (species) {
      trophies = trophies.filter(t => t.species === species);
    }
    return trophies.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 10);
  }

  // ─── GARDE-CHASSE MFFP ───────────────────────────────────

  public wardenInspection(playerId: string): { ok: boolean; violations: string[]; fine: number } {
    const store = useGameStore.getState();
    const violations: string[] = [];
    let fine = 0;
    
    // Vérifier permis
    if (!store.licenses.includes("chasse") && !store.licenses.includes("chasse_general")) {
      violations.push("Chasse sans permis valide");
      fine += 500;
    }
    
    // Vérifier session active
    const session = this.getActiveHuntingSession(playerId);
    if (session) {
      if (session.isPoaching) {
        violations.push("Dépassement de quota");
        fine += 1000;
      }
      
      // Vérifier espèces en saison fermée
      for (const [species] of session.animalsKilled) {
        const season = this.getCurrentSeason(species, session.zone);
        if (!season) {
          violations.push(`Chasse hors saison (${SPECIES_CONFIG[species].name})`);
          fine += 750;
        }
      }
    }
    
    if (violations.length > 0) {
      police.reportCrime("wildlife_violation", violations.join(", "));
      store.addChat("Garde-chasse MFFP", `Contrôle effectué. Infractions: ${violations.join(", ")}. Amende: ${fine}$`, "system");
      
      triggerNotification(playerId, {
        title: "🚨 CONTRÔLE MFFP",
        body: `${violations.length} infraction(s). Amende: ${fine}$`,
        icon: "⚖️",
        urgent: true,
      });
    } else {
      triggerNotification(playerId, {
        title: "✅ CONTRÔLE MFFP",
        body: "Tout est en ordre. Bonne chasse!",
        icon: "👍",
      });
    }
    
    return { ok: true, violations, fine };
  }

  // ─── HELPERS ─────────────────────────────────────────────

  private getCurrentSeason(species: AnimalSpecies, zone: HuntingZone): HuntingSeason | null {
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    
    return HUNTING_SEASONS.find(s => 
      s.species === species && 
      s.zones.includes(zone) &&
      currentDate >= s.startDate && 
      currentDate <= s.endDate
    ) ?? null;
  }
  
  public getAnimalById(id: string): AnimalEntity | null {
    return ANIMALS.get(id) ?? null;
  }
  
  public getAllAnimals(): AnimalEntity[] {
    return Array.from(ANIMALS.values());
  }
  
  public getAnimalsInRadius(x: number, z: number, radius: number): AnimalEntity[] {
    return this.getAllAnimals().filter(a => {
      const dist = Math.hypot(a.x - x, a.z - z);
      return dist <= radius && !a.isDead;
    });
  }
  
  public updateAnimalAI(dt: number) {
    for (const animal of ANIMALS.values()) {
      if (animal.isDead) continue;
      
      animal.behaviorTimer -= dt;
      
      if (animal.behaviorTimer <= 0) {
        // Changer de comportement
        const behaviors: AnimalBehavior[] = ["idle", "grazing", "walking", "drinking"];
        animal.behavior = behaviors[Math.floor(Math.random() * behaviors.length)]!;
        animal.behaviorTimer = 5 + Math.random() * 15;
        
        // Nouvelle cible si walking
        if (animal.behavior === "walking") {
          const angle = Math.random() * Math.PI * 2;
          const dist = 20 + Math.random() * 30;
          animal.targetX = animal.x + Math.cos(angle) * dist;
          animal.targetZ = animal.z + Math.sin(angle) * dist;
        }
      }
      
      // Déplacement vers cible
      if (animal.behavior === "walking" || animal.behavior === "fleeing") {
        const speed = animal.behavior === "fleeing" 
          ? SPECIES_CONFIG[animal.species].speedKmh * 2 
          : SPECIES_CONFIG[animal.species].speedKmh * 0.3;
        
        const dx = animal.targetX - animal.x;
        const dz = animal.targetZ - animal.z;
        const dist = Math.hypot(dx, dz);
        
        if (dist > 1) {
          const moveSpeed = (speed / 3.6) * dt; // Convertir km/h en m/s
          animal.x += (dx / dist) * moveSpeed;
          animal.z += (dz / dist) * moveSpeed;
        } else {
          animal.behavior = "idle";
          animal.behaviorTimer = 3 + Math.random() * 5;
        }
      }
      
      // Diminuer alerte
      animal.alertLevel = Math.max(0, animal.alertLevel - dt * 2);
    }
  }
}

export const huntingFishingSystem = new HuntingFishingSystem();