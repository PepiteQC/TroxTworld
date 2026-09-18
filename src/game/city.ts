export type FacadeStyle = ArchitecturalStyle;
import * as THREE from "three";
import { buildCemetery, buildPark } from "./park";
import { matLib, QC_PALETTE } from "./materials";
import { wireCsm } from "./csm";
import { makeRng } from "./rng";
import {
  CITY_ARTERY_MUL,
  CITY_SIDEWALK_W,
  cityLotLocal,
  citySpecialLots,
  cityToWorld,
  getTerrainHeight,
  lotHitsThroughRoad,
  overlayRoadAt,
  type VillageDef,
} from "./worlddata";
import { finishMap, tex as texLib } from "./textures";
import {
  buildBoutique,
  buildCasseCroute,
  buildDepanneur,
  buildEcole,
  buildEglise,
  buildHotelVille,
  buildMaisonCanadienne,
  buildQuincaillerie,
  buildSedan,
  buildSqPoste,
} from "./architecture";
import { attachScenicHeat, scenicHeat } from "./utilities";
import { type SwingDoor } from "./door";
import { buildCaissePopulaire } from "./caisse";
import { buildIntersectionPad } from "./roads";

// ============================================================================
// 🔹 TYPES ET INTERFACES RP
// ============================================================================

/** Saison de l'année. */
export type Season = "hiver" | "printemps" | "ete" | "automne";

/** Type de bâtiment. */
export type BuildingType =
  | "maison"
  | "duplex"
  | "triplex"
  | "immeuble"
  | "hotel"
  | "commerce"
  | "depanneur"
  | "casse_croute"
  | "boutique"
  | "quincaillerie"
  | "eglise"
  | "ecole"
  | "hotel_ville"
  | "caisse_populaire"
  | "sq_poste"
  | "parking"
  | "parc"
  | "cimetiere"
  | "usine"
  | "entrepot"
  | "mairie"
  | "hopital"
  | "caserne_pompiers"
  | "poste_police"
  | "tour"
  | "grange"
  | "scierie";

/** Catégorie de bâtiment. */
export type BuildingCategory =
  | "residentiel"
  | "commercial"
  | "industriel"
  | "public"
  | "institutionnel"
  | "loisirs";

/** État d'un bâtiment. */
export type BuildingCondition =
  | "neuf"
  | "bon_etat"
  | "use"
  | "abandonne"
  | "en_renovation"
  | "en_construction";

/** Niveau de qualité (1-5 étoiles). */
export type QualityLevel = 1 | 2 | 3 | 4 | 5;

/** Style architectural. */
export type ArchitecturalStyle =
  | "quebecois"
  | "victorien"
  | "moderne"
  | "rustique"
  | "industriel"
  | "colonial";

/** Type de quartier. */
export type DistrictType =
  | "residentiel"
  | "commercial"
  | "industriel"
  | "centre_ville"
  | "banlieue"
  | "rural"
  | "historique"
  | "institutionnel"
  | "loisirs"
  | "public";

/** Type de terrain. */
export type TerrainType =
  | "route"
  | "trottoir"
  | "parc"
  | "bati"
  | "agricole"
  | "forestiere"
  | "eau";

/** Niveau de satisfaction (0-100). */
export type SatisfactionLevel = number;

/** Type de citoyen. */
export type CitizenType =
  | "enfant"
  | "adolescent"
  | "adulte"
  | "senior"
  | "travailleur"
  | "retraite"
  | "etudiant"
  | "chomeur";

/** Profession d'un citoyen. */
export type Profession =
  | "ouvrier"
  | "employe_bureau"
  | "commercant"
  | "enseignant"
  | "medecin"
  | "policier"
  | "pompier"
  | "agriculteur"
  | "etudiant"
  | "retraite"
  | "chomeur";

/** Besoin d'un citoyen. */
export type CitizenNeed =
  | "logement"
  | "travail"
  | "nourriture"
  | "loisirs"
  | "sante"
  | "securite"
  | "education"
  | "transport";

/** Type de crime. */
export type CrimeType =
  | "vol"
  | "vandalisme"
  | "aggression"
  | "fraude"
  | "trafic"
  | "incendie_criminel";

/** Type de service public. */
export type PublicServiceType =
  | "police"
  | "pompiers"
  | "hopital"
  | "ecole"
  | "transport"
  | "propreté"
  | "eau"
  | "electricite"
  | "education";

/** Type d'événement urbain. */
export type CityEventType =
  | "festival"
  | "marche"
  | "feux_artifice"
  | "tempete"
  | "incendie"
  | "accident"
  | "manifestation"
  | "election"
  | "epidemie";

/** Niveau de gravité d'un événement. */
export type EventSeverity = "mineur" | "modere" | "majeur" | "catastrophique";

// ============================================================================
// 🏗️ STRUCTURES DE DONNÉES RP
// ============================================================================

/** Définition d'une porte de bâtiment avec accès à un intérieur. */
export interface CityDoor {
  id: string;
  name: string;
  kind: InteriorKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  prompt: string;
  buildingId?: string; // ID du bâtiment associé
  buildingType?: BuildingType; // Type du bâtiment
  isOpen?: boolean; // Porte ouverte/fermée
  locked?: boolean; // Porte verrouillée
  requiredKey?: string; // Clé nécessaire pour ouvrir
  condition?: BuildingCondition; // État du bâtiment
  quality?: QualityLevel; // Niveau de qualité
  owner?: string; // Propriétaire (ID du citoyen ou joueur)
  rentCost?: number; // Coût de location (si applicable)
  buyCost?: number; // Coût d'achat
  maintenanceCost?: number; // Coût de maintenance par jour
  reputationImpact?: number; // Impact sur la réputation de la ville
  employees?: number; // Nombre d'employés
  capacity?: number; // Capacité (clients, résidents, etc.)
  production?: {
    type: string; // Type de production
    amount: number; // Quantité produite par jour
    value: number; // Valeur de la production
  };
  services?: PublicServiceType[]; // Services offerts
  crimeRate?: number; // Taux de criminalité (0-100)
  satisfaction?: SatisfactionLevel; // Satisfaction des occupants
}

/** Configuration d'une ville. */
export interface CityConfig {
  center: [number, number];
  gridSize: number;
  blockSize: number;
  streetWidth: number;
  density: number; // Densité de construction (0-1)
  seed: number;
  villageName: string;
  id?: string;
  angle?: number;
  season?: Season; // Saison actuelle
  currentDay?: number; // Jour actuel
  currentTime?: number; // Heure actuelle (0-23)
  population?: number; // Population totale
  reputation?: number; // Réputation de la ville (0-100)
  wealth?: number; // Richesse de la ville (0-100)
  crimeRate?: number; // Taux de criminalité (0-100)
  pollution?: number; // Niveau de pollution (0-100)
  satisfaction?: number; // Satisfaction moyenne des citoyens (0-100)
  taxRate?: number; // Taux d'imposition (0-1)
  unemploymentRate?: number; // Taux de chômage (0-100)
  housingDemand?: number; // Demande de logement (-100 à 100)
  commercialDemand?: number; // Demande commerciale (-100 à 100)
  industrialDemand?: number; // Demande industrielle (-100 à 100)
  currentWeather?: string; // Météo actuelle
  temperature?: number; // Température actuelle
  events?: CityEvent[]; // Événements en cours
  mayor?: string; // Nom du maire
  budget?: number; // Budget de la ville
  debt?: number; // Dette de la ville
}

/** Bâtiment de la ville avec propriétés RP. */
export interface CityBuilding {
  id: string;
  type: BuildingType;
  category: BuildingCategory;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  floors: number;
  yaw: number;
  style: ArchitecturalStyle;
  condition: BuildingCondition;
  quality: QualityLevel;
  owner?: string; // Propriétaire (ID du citoyen ou joueur)
  residents?: string[]; // Résidents (IDs des citoyens)
  employees?: string[]; // Employés (IDs des citoyens)
  customers?: string[]; // Clients (IDs des citoyens)
  name?: string; // Nom personnalisé
  address?: string; // Adresse
  value: number; // Valeur marchande
  buyCost: number; // Coût d'achat
  rentCost: number; // Coût de location (par mois)
  maintenanceCost: number; // Coût de maintenance (par jour)
  taxValue: number; // Valeur imposable
  reputationImpact: number; // Impact sur la réputation de la ville (-5 à +5)
  capacity: number; // Capacité (résidents, employés, clients)
  currentOccupancy: number; // Occupation actuelle
  production?: {
    type: string; // Type de production
    amount: number; // Quantité produite par jour
    value: number; // Valeur de la production
    inputResources?: Record<string, number>; // Ressources nécessaires
  };
  services?: PublicServiceType[]; // Services offerts
  operatingHours?: { open: number; close: number }; // Heures d'ouverture
  isOpen?: boolean; // Actuellement ouvert
  lastRenovation?: number; // Dernière rénovation (jour)
  lastMaintenance?: number; // Dernière maintenance (jour)
  age: number; // Âge du bâtiment (en jours)
  durability: number; // Durabilité (0-100)
  fireRisk: number; // Risque d'incendie (0-100)
  crimeRate: number; // Taux de criminalité (0-100)
  satisfaction: SatisfactionLevel; // Satisfaction des occupants (0-100)
  energyConsumption?: number; // Consommation d'énergie par jour
  waterConsumption?: number; // Consommation d'eau par jour
  wasteProduction?: number; // Production de déchets par jour
  parkingSpaces?: number; // Nombre de places de stationnement
  hasElevator?: boolean; // A un ascenseur
  hasFireExit?: boolean; // A des sorties de secours
  hasSecurity?: boolean; // A un système de sécurité
  hasSprinklers?: boolean; // A des gicleurs
  accessibility?: number; // Accessibilité (0-100)
  historicalValue?: number; // Valeur historique (0-100)
  quests?: BuildingQuest[]; // Quêtes associées
  events?: BuildingEvent[]; // Événements en cours
  connectedBuildings?: string[]; // Bâtiments connectés (ID)
}

/** Quête liée à un bâtiment ou à la ville. */
export interface BuildingQuest {
  id: string;
  title: string;
  description: string;
  objective: {
    type: "build" | "upgrade" | "repair" | "buy" | "sell" | "rent" | "visit" | "hire";
    target?: BuildingType | string; // Cible (type de bâtiment ou ID)
    count?: number; // Nombre requis
    amount?: number; // Montant requis
    quality?: QualityLevel; // Niveau de qualité requis
  };
  progress: number;
  reward: {
    money?: number;
    reputation?: number;
    unlocks?: BuildingType[]; // Types de bâtiments débloqués
    items?: string[]; // Items reçus
    citizens?: number; // Nouveaux citoyens
  };
  expiry?: number; // Date d'expiration (jour)
  completed?: boolean;
}

/** Événement lié à un bâtiment. */
export interface BuildingEvent {
  id: string;
  type: "fire" | "flood" | "collapse" | "renovation" | "celebration" | "protest" | "inspection";
  severity: EventSeverity;
  startDay: number; // Jour de début
  duration: number; // Durée en jours
  description: string;
  effects: {
    durabilityChange?: number; // Changement de durabilité
    reputationChange?: number; // Changement de réputation
    valueChange?: number; // Changement de valeur
    cost?: number; // Coût pour résoudre
    requiredResources?: Record<string, number>; // Ressources nécessaires
  };
  resolved: boolean;
}

/** Événement urbain. */
export interface CityEvent {
  id: string;
  type: CityEventType;
  severity: EventSeverity;
  startDay: number;
  duration: number;
  description: string;
  effects: {
    reputationChange?: number;
    satisfactionChange?: number;
    crimeRateChange?: number;
    pollutionChange?: number;
    wealthChange?: number;
    populationChange?: number;
  };
  affectedBuildings?: string[]; // Bâtiments affectés
  affectedDistricts?: DistrictType[]; // Quartiers affectés
  resolved: boolean;
}

/** Citoyen de la ville. */
export interface Citizen {
  id: string;
  name: string;
  age: number;
  type: CitizenType;
  profession?: Profession;
  buildingId?: string; // Bâtiment où il habite/travaille
  homeBuildingId?: string; // Bâtiment où il habite
  workBuildingId?: string; // Bâtiment où il travaille
  needs: Record<CitizenNeed, SatisfactionLevel>; // Besoins et leur satisfaction (0-100)
  mood: "heureux" | "content" | "neutre" | "mécontent" | "fâché";
  health: number; // Santé (0-100)
  wealth: number; // Richesse (en $)
  salary?: number; // Salaire (par jour)
  education?: number; // Niveau d'éducation (0-100)
  skills?: string[]; // Compétences
  relationships?: Record<string, number>; // Relations avec d'autres citoyens (-100 à 100)
  reputation?: number; // Réputation (-100 à 100)
  crimeRecord?: CrimeType[]; // Historique criminel
  dailyRoutine?: DailyActivity[]; // Routine quotidienne
  currentActivity?: string; // Activité actuelle
  position?: { x: number; y: number; z: number }; // Position actuelle
  targetPosition?: { x: number; y: number; z: number }; // Destination
  speed?: number; // Vitesse de déplacement
  isActive?: boolean; // Actif (ne pas supprimer)
}

/** Activité quotidienne d'un citoyen. */
export interface DailyActivity {
  type: "sleep" | "work" | "eat" | "leisure" | "commute" | "shop" | "socialize";
  startHour: number; // Heure de début (0-23)
  endHour: number; // Heure de fin (0-23)
  location?: string; // Lieu (ID du bâtiment ou "extérieur")
  with?: string[]; // Avec qui (IDs des citoyens)
}

/** Quartier de la ville. */
export interface CityDistrict {
  id: string;
  name: string;
  type: DistrictType;
  x: number;
  z: number;
  width: number;
  depth: number;
  population: number; // Population du quartier
  density: number; // Densité (0-1)
  wealth: number; // Richesse (0-100)
  crimeRate: number; // Taux de criminalité (0-100)
  pollution: number; // Niveau de pollution (0-100)
  satisfaction: number; // Satisfaction moyenne (0-100)
  reputation: number; // Réputation (0-100)
  buildings: string[]; // IDs des bâtiments dans le quartier
  services: PublicServiceType[]; // Services disponibles
  amenities: string[]; // Équipements (parcs, écoles, etc.)
  traffic: number; // Niveau de trafic (0-100)
  noise: number; // Niveau de bruit (0-100)
  greenSpaces: number; // Espaces verts (%)
  zoningRules: {
    allowedBuildingTypes: BuildingType[];
    maxHeight?: number;
    maxDensity?: number;
    minQuality?: QualityLevel;
  };
}

/** Type d'intérieur. */
export type InteriorKind =
  | "hotel"
  | "apartment"
  | "boutique"
  | "lobby"
  | "corridor"
  | "prison"
  | "home"
  | "depanneur"
  | "caisse"
  | "casse"
  | "sqdc"
  | "ecole"
  | "eglise"
  | "mairie"
  | "hopital"
  | "caserne"
  | "poste_police";

/** Résultat de la construction d'une ville. */
export interface BuiltCity {
  group: THREE.Group;
  doors: CityDoor[];
  textures: THREE.Texture[];
  swings: SwingDoor[];
  buildings: CityBuilding[]; // Liste des bâtiments
  districts: CityDistrict[]; // Liste des quartiers
  citizens: Citizen[]; // Liste des citoyens
  events: CityEvent[]; // Événements en cours
  stats: {
    population: number;
    reputation: number;
    wealth: number;
    crimeRate: number;
    pollution: number;
    satisfaction: number;
    taxRevenue: number; // Revenus fiscaux par jour
    maintenanceCost: number; // Coûts de maintenance par jour
    housingSupply: number; // Offre de logement
    housingDemand: number; // Demande de logement
    jobSupply: number; // Offre d'emploi
    jobDemand: number; // Demande d'emploi
  };
}

// ============================================================================
// 🌍 DONNÉES STATIQUES RP
// ============================================================================

/** Saison actuelle du jeu. */
let currentSeason: Season = "ete";
let currentDay: number = 0;
let currentTime: number = 12; // Midi par défaut

/** Palette de couleurs pour les styles architecturaux. */
export const STYLE_PALETTES: Record<ArchitecturalStyle, number[]> = {
  quebecois: [0x8f4a38, 0xb8a084, 0x8a8a86, 0xd8d4c8, 0x9a9a96, 0x7a5a48],
  victorien: [0x6a5a48, 0x8a6a50, 0xa88a6a, 0xc8a078, 0x5a4a38, 0x3a3428],
  moderne: [0xc0c0c0, 0x8a8a8a, 0xa0a0a0, 0xd0d0d0, 0x4a4a4a, 0x2a2a2a],
  rustique: [0x5a4030, 0x6a5040, 0x8a6a50, 0x4a3a28, 0x3a2a1a, 0x2a1a0a],
  industriel: [0x5a5a5a, 0x4a4a4a, 0x3a3a3a, 0x2a2a2a, 0x1a1a1a, 0x8a8a8a],
  colonial: [0xc8b070, 0xb8a078, 0xa89060, 0x8a7a50, 0x6a5a40, 0x4a3a28],
};

/** Coûts de base pour les bâtiments (par m²). */
export const BASE_BUILDING_COSTS: Record<BuildingType, number> = {
  maison: 120,
  duplex: 100,
  triplex: 90,
  immeuble: 80,
  hotel: 150,
  commerce: 130,
  depanneur: 110,
  casse_croute: 90,
  boutique: 140,
  quincaillerie: 100,
  eglise: 200,
  ecole: 180,
  hotel_ville: 160,
  caisse_populaire: 170,
  sq_poste: 150,
  parking: 30,
  parc: 10,
  cimetiere: 5,
  usine: 70,
  entrepot: 60,
  mairie: 250,
  hopital: 220,
  caserne_pompiers: 200,
  poste_police: 190,
  tour: 140,
  grange: 40,
  scierie: 80,
};

/** Valeurs de base pour les bâtiments (par m²). */
export const BASE_BUILDING_VALUES: Record<BuildingType, number> = {
  maison: 150,
  duplex: 130,
  triplex: 120,
  immeuble: 110,
  hotel: 180,
  commerce: 160,
  depanneur: 140,
  casse_croute: 120,
  boutique: 170,
  quincaillerie: 130,
  eglise: 50, // Peu de valeur marchande
  ecole: 60,
  hotel_ville: 170,
  caisse_populaire: 180,
  sq_poste: 70,
  parking: 20,
  parc: 0, // Pas de valeur marchande
  cimetiere: 0,
  usine: 90,
  entrepot: 80,
  mairie: 80,
  hopital: 70,
  caserne_pompiers: 70,
  poste_police: 70,
  tour: 160,
  grange: 50,
  scierie: 90,
};

/** Coûts de maintenance par jour (par m²). */
export const BASE_MAINTENANCE_COSTS: Record<BuildingType, number> = {
  maison: 0.2,
  duplex: 0.18,
  triplex: 0.16,
  immeuble: 0.15,
  hotel: 0.3,
  commerce: 0.25,
  depanneur: 0.2,
  casse_croute: 0.15,
  boutique: 0.28,
  quincaillerie: 0.18,
  eglise: 0.1,
  ecole: 0.12,
  hotel_ville: 0.25,
  caisse_populaire: 0.22,
  sq_poste: 0.15,
  parking: 0.05,
  parc: 0.02,
  cimetiere: 0.01,
  usine: 0.2,
  entrepot: 0.15,
  mairie: 0.18,
  hopital: 0.25,
  caserne_pompiers: 0.2,
  poste_police: 0.22,
  tour: 0.22,
  grange: 0.1,
  scierie: 0.18,
};

/** Impacts de base sur la réputation. */
export const BASE_REPUTATION_IMPACTS: Record<BuildingType, number> = {
  maison: 1,
  duplex: 1,
  triplex: 0.8,
  immeuble: 0.5,
  hotel: 2,
  commerce: 1.5,
  depanneur: 1,
  casse_croute: 0.8,
  boutique: 1.5,
  quincaillerie: 1,
  eglise: 2,
  ecole: 2.5,
  hotel_ville: 1.8,
  caisse_populaire: 1.5,
  sq_poste: 1,
  parking: -0.5,
  parc: 3,
  cimetiere: -0.5,
  usine: -1,
  entrepot: -0.8,
  mairie: 3,
  hopital: 3,
  caserne_pompiers: 2,
  poste_police: 2.5,
  tour: 1.2,
  grange: 0.5,
  scierie: 0.3,
};

/** Capacités de base pour les bâtiments. */
export const BASE_BUILDING_CAPACITIES: Record<BuildingType, number> = {
  maison: 4,
  duplex: 8,
  triplex: 12,
  immeuble: 20,
  hotel: 50,
  commerce: 10,
  depanneur: 5,
  casse_croute: 8,
  boutique: 6,
  quincaillerie: 4,
  eglise: 100,
  ecole: 50,
  hotel_ville: 30,
  caisse_populaire: 20,
  sq_poste: 10,
  parking: 0,
  parc: 0,
  cimetiere: 0,
  usine: 20,
  entrepot: 10,
  mairie: 30,
  hopital: 40,
  caserne_pompiers: 15,
  poste_police: 20,
  tour: 40,
  grange: 2,
  scierie: 10,
};

/** Catégories de bâtiments. */
export const BUILDING_CATEGORIES: Record<BuildingType, BuildingCategory> = {
  maison: "residentiel",
  duplex: "residentiel",
  triplex: "residentiel",
  immeuble: "residentiel",
  hotel: "commercial",
  commerce: "commercial",
  depanneur: "commercial",
  casse_croute: "commercial",
  boutique: "commercial",
  quincaillerie: "commercial",
  eglise: "institutionnel",
  ecole: "institutionnel",
  hotel_ville: "commercial",
  caisse_populaire: "institutionnel",
  sq_poste: "public",
  parking: "public",
  parc: "loisirs",
  cimetiere: "public",
  usine: "industriel",
  entrepot: "industriel",
  mairie: "institutionnel",
  hopital: "institutionnel",
  caserne_pompiers: "public",
  poste_police: "public",
  tour: "residentiel",
  grange: "industriel",
  scierie: "industriel",
};

/** Styles architecturaux par village. */
export const VILLAGE_STYLES: Record<string, ArchitecturalStyle> = {
  Donnacona: "brique",
  Portneuf: "pierre",
  "Saint-Raymond": "stuc",
  Quebec: "quebecois",
  Montreal: "moderne",
  Sherbrooke: "victorien",
  TroisRivieres: "colonial",
  // Villages ruraux par défaut
  default: "rustique",
};

/** Noms de rues québécois. */
export const QUEBEC_STREET_NAMES: string[] = [
  "Rue Principale",
  "Boulevard Saint-Joseph",
  "Avenue du Parc",
  "Rue Saint-Jean",
  "Chemin de la Rivière",
  "Rue des Érables",
  "Boulevard des Pionniers",
  "Rue de l'Église",
  "Avenue des Chutes",
  "Rue du Lac",
  "Chemin des Cèdres",
  "Rue de la Montagne",
  "Boulevard de la Gare",
  "Rue des Sapins",
  "Avenue des Fleurs",
  "Rue du Moulin",
  "Chemin des Vignes",
  "Rue Saint-Paul",
  "Boulevard Laurentien",
];

/** Prénoms québécois masculins. */
export const MALE_FIRST_NAMES: string[] = [
  "Jean",
  "Pierre",
  "Jacques",
  "Michel",
  "François",
  "Paul",
  "Luc",
  "Daniel",
  "Marc",
  "Yves",
  "Gérard",
  "Claude",
  "René",
  "Serge",
  "Alain",
  "Mario",
  "Denis",
  "Normand",
  "Roger",
  "Raymond",
];

/** Prénoms québécois féminins. */
export const FEMALE_FIRST_NAMES: string[] = [
  "Marie",
  "Jeanne",
  "Claudette",
  "Suzanne",
  "Lise",
  "Denise",
  "Monique",
  "Yvonne",
  "Thérèse",
  "Hélène",
  "Josée",
  "Nicole",
  "Sylvie",
  "Anne",
  "Diane",
  "Linda",
  "Chantal",
  "Nathalie",
  "Élodie",
  "Sophie",
];

/** Noms de famille québécois. */
export const LAST_NAMES: string[] = [
  "Tremblay",
  "Gagnon",
  "Roy",
  "Côté",
  "Bouchard",
  "Lemieux",
  "Pelletier",
  "Lavoie",
  "Bergeron",
  "Gauthier",
  "Dubois",
  "Morin",
  "Beaulieu",
  "Rousseau",
  "Lefebvre",
  "Caron",
  "Giroux",
  "Bélanger",
  "Nadeau",
  "Lapierre",
];

// ============================================================================
// 🎨 FONCTIONS DE GÉNÉRATION DE TEXTURES (améliorées pour le RP)
// ============================================================================

/** Style de façade selon le village. */
function villageStyle(name: string): FacadeStyle {
  return VILLAGE_STYLES[name] || VILLAGE_STYLES.default;
}

/** Convertit un nombre en code hexadécimal. */
function hex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

/** Mélange deux couleurs. */
function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

/** Cache pour les textures de façade. */
const FACADE_CACHE = new Map<string, THREE.CanvasTexture>();

/**
 * Peint une texture de brique.
 * @param ctx - Contexte Canvas.
 * @param w - Largeur.
 * @param h - Hauteur.
 * @param base - Couleur de base.
 * @param rng - Générateur aléatoire.
 */
function paintBrick(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: number,
  rng: () => number
): void {
  // Fond
  ctx.fillStyle = "#b8aea0";
  ctx.fillRect(0, 0, w, h);

  // Paramètres des briques
  const bh = 10; // Hauteur d'une brique
  const bw = 22; // Largeur d'une brique

  // Dessiner les briques
  for (let y = 0, row = 0; y < h; y += bh, row++) {
    const odd = row % 2; // Décalage pour les rangées impaires
    for (let x = odd ? -bw / 2 : 0; x < w; x += bw) {
      // Variation de couleur pour chaque brique
      const t = (rng() - 0.5) * 0.18;
      ctx.fillStyle = hex(mix(base, t > 0 ? 0xffffff : 0x1a1010, Math.abs(t)));
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }

  // Ajouter des effets de vieillissement selon la condition
  // (À implémenter plus tard avec un paramètre 'condition')
}

/**
 * Peint une texture de pierre.
 * @param ctx - Contexte Canvas.
 * @param w - Largeur.
 * @param h - Hauteur.
 * @param base - Couleur de base.
 * @param rng - Générateur aléatoire.
 */
function paintStone(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: number,
  rng: () => number
): void {
  // Fond gris
  ctx.fillStyle = "#6a6660";
  ctx.fillRect(0, 0, w, h);

  // Dessiner les pierres de manière aléatoire
  let y = 0;
  while (y < h) {
    const rowH = 14 + Math.floor(rng() * 10); // Hauteur de la rangée
    let x = 0;
    while (x < w) {
      const bw = 18 + Math.floor(rng() * 28); // Largeur de la pierre
      // Variation de couleur pour chaque pierre
      ctx.fillStyle = hex(mix(base, rng() > 0.5 ? 0xd8d0c4 : 0x3a3834, 0.08 + rng() * 0.12));
      ctx.fillRect(x + 1, y + 1, bw - 2, rowH - 2);
      x += bw;
    }
    y += rowH;
  }
}

/**
 * Peint une texture de revêtement en bois (clapboard).
 * @param ctx - Contexte Canvas.
 * @param w - Largeur.
 * @param h - Hauteur.
 * @param base - Couleur de base.
 */
function paintClapboard(ctx: CanvasRenderingContext2D, w: number, h: number, base: number): void {
  // Fond avec la couleur de base
  ctx.fillStyle = hex(base);
  ctx.fillRect(0, 0, w, h);

  // Dessiner les lignes horizontales pour simuler le bois
  for (let y = 0; y < h; y += 7) {
    // Ligne sombre
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, y, w, 1);
    // Ligne claire
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, y + 1, w, 1);
  }

  // Bords plus clairs
  ctx.fillStyle = hex(mix(base, 0xf4f0e4, 0.25));
  ctx.fillRect(0, 0, 10, h);
  ctx.fillRect(w - 10, 0, 10, h);
}

/**
 * Peint une texture de stuc.
 * @param ctx - Contexte Canvas.
 * @param w - Largeur.
 * @param h - Hauteur.
 * @param base - Couleur de base.
 * @param rng - Générateur aléatoire.
 */
function paintStuc(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: number,
  rng: () => number
): void {
  // Fond avec la couleur de base
  ctx.fillStyle = hex(base);
  ctx.fillRect(0, 0, w, h);

  // Ajouter des taches aléatoires pour simuler le stuc
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.02 + rng() * 0.04})`;
    ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 3, 2);
  }

  // Base plus foncée en bas
  ctx.fillStyle = hex(mix(base, 0x4a4844, 0.35));
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
}

/**
 * Génère une texture de façade pour un bâtiment.
 * @param floors - Nombre d'étages.
 * @param cols - Nombre de colonnes de fenêtres.
 * @param brick - Couleur de base.
 * @param lit - Pourcentage de fenêtres allumées (0-1).
 * @param seed - Graine aléatoire.
 * @param shop - Si c'est un commerce.
 * @param style - Style architectural.
 * @returns Texture de façade.
 */
function facadeTex(
  floors: number,
  cols: number,
  brick: number,
  lit: number,
  seed: number,
  shop: boolean,
  style: FacadeStyle = "brique"
): THREE.CanvasTexture {
  // Clé unique pour le cache
  const key = `${style}_${floors}_${cols}_${brick}_${shop ? 1 : 0}_${lit}_${seed >> 3}`;
  const hit = FACADE_CACHE.get(key);
  if (hit) return hit;

  // Créer un générateur aléatoire basé sur la graine
  const rng = makeRng(seed);

  // Dimensions de la texture
  const w = 512;
  const h = Math.max(512, floors * 96);

  // Créer le canvas
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  // Peindre le fond selon le style
  if (style === "pierre") paintStone(ctx, w, h, brick, rng);
  else if (style === "clapboard") paintClapboard(ctx, w, h, brick);
  else if (style === "stuc") paintStuc(ctx, w, h, brick, rng);
  else paintBrick(ctx, w, h, brick, rng);

  // Ajouter la vitrine pour les commerces
  const shopH = shop ? 118 : 36;
  if (shop) {
    // Fond de la vitrine
    ctx.fillStyle = rng() > 0.4 ? "#f4e4b0" : "#1c2834";
    ctx.fillRect(18, h - 108, w - 36, 86);

    // Vitrine
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(28, h - 100, w - 56, 70);

    // Enseigne du commerce
    const sign = [0xc03030, 0x2a6ad0, 0x2a8a50, 0xc09020][seed % 4]!;
    ctx.fillStyle = hex(sign);
    ctx.fillRect(40, h - 132, w - 80, 22);

    // Marque du commerce
    ctx.fillStyle = "#f4f0e4";
    ctx.fillRect(32, h - 24, w - 64, 10);
  }

  // Calculer les dimensions des fenêtres
  const winW = (w - 48) / cols;
  const usable = h - shopH - 16;
  const winH = (usable / floors) * 0.46;

  // Dessiner les fenêtres
  for (let f = 0; f < floors; f++) {
    const y = 18 + f * (usable / floors);
    for (let i = 0; i < cols; i++) {
      const x = 24 + i * winW;

      // Cadre de la fenêtre
      ctx.fillStyle = style === "brique" ? "#c4b4a4" : "#efeae0";
      ctx.fillRect(x - 3, y - 4, winW * 0.58 + 6, winH + 8);

      // Fenêtre (allumée ou éteinte)
      const on = rng() < lit;
      ctx.fillStyle = on ? "#f6d98a" : "#243444";
      ctx.fillRect(x, y, winW * 0.58, winH);

      // Reflets
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x, y, 2, winH);
      ctx.fillRect(x, y, winW * 0.58, 2);

      // Ombre
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x + winW * 0.28, y, 1.5, winH);
      ctx.fillRect(x, y + winH * 0.48, winW * 0.58, 1.5);

      // Appui de fenêtre
      ctx.fillStyle = hex(mix(brick, 0x1a1010, 0.35));
      ctx.fillRect(x - 4, y + winH + 4, winW * 0.58 + 8, 4);

      // Pour le style "clapboard", ajouter des montants verticaux
      if (style === "clapboard") {
        ctx.fillStyle = hex([0x3a5a48, 0x5a3a28, 0x3a4a6a][seed % 3]!);
        ctx.fillRect(x - 10, y, 7, winH + 4);
        ctx.fillRect(x + winW * 0.58 + 3, y, 7, winH + 4);
      }
    }
  }

  // Créer la texture THREE.js
  const tex = new THREE.CanvasTexture(c);
  finishMap(tex, "clamp");

  // Mettre en cache
  FACADE_CACHE.set(key, tex);
  return tex;
}

// ============================================================================
// 🏗️ FONCTIONS DE CONSTRUCTION DE BÂTIMENTS (améliorées pour le RP)
// ============================================================================

/**
 * Crée une boîte avec des propriétés étendues.
 * @param w - Largeur.
 * @param h - Hauteur.
 * @param d - Profondeur.
 * @param color - Couleur.
 * @param y - Position Y.
 * @param extra - Matériau personnalisé.
 * @returns Mesh de la boîte.
 */
function box(
  w: number,
  h: number,
  d: number,
  color: number,
  y: number,
  extra?: THREE.Material
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    extra ?? matLib.get(color, 0.9)
  );
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Construit un bâtiment générique avec des propriétés RP.
 * @param width - Largeur.
 * @param depth - Profondeur.
 * @param floors - Nombre d'étages.
 * @param color - Couleur de base.
 * @param lit - Pourcentage de fenêtres allumées.
 * @param seed - Graine aléatoire.
 * @param shop - Si c'est un commerce.
 * @param textures - Liste des textures à mettre à jour.
 * @param style - Style architectural.
 * @param condition - État du bâtiment.
 * @param type - Type du bâtiment.
 * @returns Groupe THREE.js du bâtiment.
 */
function building(
  width: number,
  depth: number,
  floors: number,
  color: number,
  lit: number,
  seed: number,
  shop: boolean,
  textures: THREE.Texture[],
  style: FacadeStyle = "brique",
  condition: BuildingCondition = "bon_etat",
  type: BuildingType = "maison"
): THREE.Group {
  const g = new THREE.Group();
  const floorH = 3.05; // Hauteur d'un étage
  const h = floors * floorH; // Hauteur totale

  // Générer la texture de façade
  const tex = facadeTex(floors, Math.max(3, Math.floor(width / 3.2)), color, lit, seed, shop, style);
  if (!textures.includes(tex)) textures.push(tex);

  // Matériau pour le bâtiment
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    color: 0xffffff,
    flatShading: true,
  });
  wireCsm(mat);

  // Corps du bâtiment
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, h, depth), mat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Fondations
  g.add(
    box(
      width + 0.35,
      0.7,
      depth + 0.35,
      QC_PALETTE.beton,
      0.32,
      texLib.pbr("betonTrous", "betonTrousNrm", 2, 0.4, 0.94)
    )
  );

  // Trottoir autour du bâtiment
  g.add(
    box(
      width + 0.4,
      0.55,
      depth + 0.4,
      0x3a3a3e,
      h + 0.18,
      texLib.pbr("betonDalles", "betonDallesNrm", 1.5, 0.4, 0.9)
    )
  );

  // Porte principale
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.25, 0.12), matLib.get(QC_PALETTE.porte, 0.8));
  door.position.set(0, 1.2, depth / 2 + 0.07);
  door.name = "door";
  g.add(door);

  // Escalier devant la porte
  const steps = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 0.9), matLib.get(QC_PALETTE.beton, 0.94));
  steps.position.set(0, 0.14, depth / 2 + 0.55);
  g.add(steps);

  // Ajouter des détails selon le type de bâtiment
  if (shop) {
    // Auvent pour les commerces
    const awn = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.72, 0.1, 1.7),
      matLib.get(0xb03030, 0.7)
    );
    awn.position.set(0, 3.12, depth / 2 + 0.85);
    awn.castShadow = true;
    g.add(awn);

    // Enseigne lumineuse
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.5, 0.55, 0.12),
      matLib.getEmissive(0xc09020, 0xffd060, 0.45)
    );
    sign.position.set(0, 3.55, depth / 2 + 0.18);
    g.add(sign);
  }

  // Toit selon le nombre d'étages
  if (floors <= 2) {
    // Toit en pente pour les petites maisons
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.8, 0.18, depth + 0.8),
      matLib.get(0x6a3a32, 0.82)
    );
    roof.position.y = h + 0.45;
    roof.rotation.z = 0.08;
    roof.castShadow = true;
    g.add(roof);

    // Cheminée
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 1.35, 0.55),
      texLib.mat("brique", 0.6, 0.6, 0.88)
    );
    chimney.position.set(width * 0.28, h + 1.05, -depth * 0.18);
    chimney.castShadow = true;
    g.add(chimney);
  } else {
    // Pour les bâtiments plus hauts
    if (floors >= 3) {
      // Balcon au 2ème étage
      const balc = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.42, 0.08, 1.15),
        matLib.get(0x9a9690, 0.7, 0.2)
      );
      balc.position.set(-width * 0.18, floorH * 2 + 0.1, depth / 2 + 0.55);
      g.add(balc);

      // Rampe de balcon
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.42, 0.7, 0.04),
        matLib.get(0xc8d0d4, 0.25, 0.45)
      );
      rail.position.set(-width * 0.18, floorH * 2 + 0.5, depth / 2 + 1.08);
      g.add(rail);
    }

    if (floors >= 4) {
      // Unité de climatisation pour les grands bâtiments
      const ac = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.7, 1.1),
        matLib.get(0x8a9096, 0.45, 0.35)
      );
      ac.position.set(width * 0.22, h + 0.7, -depth * 0.15);
      g.add(ac);
    }
  }

  // Ajouter des détails selon l'état du bâtiment
  if (condition === "abandonne") {
    // Ajouter des graffitis
    const graffiti = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1),
      matLib.get(0xff0000, 0.8)
    );
    graffiti.position.set(0, h * 0.3, depth / 2 + 0.06);
    graffiti.rotation.y = Math.PI;
    g.add(graffiti);

    // Ajouter des fenêtres cassées
    for (let f = 0; f < Math.min(3, floors); f++) {
      const y = 1.5 + f * floorH;
      const brokenWindow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.4),
        matLib.get(0x000000, 0.3)
      );
      brokenWindow.position.set(width * 0.3, y, depth / 2 + 0.06);
      brokenWindow.rotation.y = Math.PI;
      g.add(brokenWindow);
    }
  } else if (condition === "en_renovation") {
    // Ajouter des échafaudages
    const scaffolding = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.9, h * 0.8, 0.5),
      matLib.get(0x6a6a6a, 0.5, 0.3)
    );
    scaffolding.position.set(0, h * 0.4, depth / 2 + 0.3);
    g.add(scaffolding);
  }

  // Stocker les informations du bâtiment
  g.userData.footprint = { width, depth, height: h };
  g.userData.buildingType = type;
  g.userData.style = style;
  g.userData.condition = condition;
  g.userData.floors = floors;

  return g;
}

/**
 * Construit un hôtel.
 * @param width - Largeur.
 * @param depth - Profondeur.
 * @param floors - Nombre d'étages.
 * @param lit - Pourcentage de fenêtres allumées.
 * @param seed - Graine aléatoire.
 * @param textures - Liste des textures.
 * @param style - Style architectural.
 * @returns Groupe THREE.js.
 */
function hotel(
  width: number,
  depth: number,
  floors: number,
  lit: number,
  seed: number,
  textures: THREE.Texture[],
  style: FacadeStyle
): THREE.Group {
  // Utiliser le style "pierre" pour les hôtels si le style est "brique"
  const effectiveStyle = style === "brique" ? "pierre" : style;
  const g = building(
    width,
    depth,
    floors,
    0xb8a084,
    lit,
    seed,
    false,
    textures,
    effectiveStyle,
    "bon_etat",
    "hotel"
  );
  g.name = "hotel";

  // Hauteur du lobby
  const lobbyH = 5.1;

  // Grande vitrine pour le lobby
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.78, 3.4),
    matLib.getEmissive(0xd8e4f0, 0xf0e8c8, 0.35)
  );
  glass.position.set(0, lobbyH * 0.42, depth / 2 + 0.06);
  g.add(glass);

  // Auvent au-dessus de l'entrée
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.5, 0.28, 2.2),
    matLib.get(0x2a3a4a, 0.55, 0.35)
  );
  canopy.position.set(0, 4.05, depth / 2 + 0.85);
  canopy.castShadow = true;
  g.add(canopy);

  // Colonnes de soutien pour l'auvent
  for (const x of [-width * 0.16, width * 0.16]) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 3.9, 8),
      matLib.get(0x2a3a4a, 0.5, 0.4)
    );
    col.position.set(x, 1.95, depth / 2 + 1.4);
    g.add(col);
  }

  // Enseigne de l'hôtel
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, floors * 1.6, 0.22),
    matLib.getEmissive(0xc03038, 0xff4050, 0.7)
  );
  sign.position.set(width / 2 - 0.4, floors * 2.2, depth / 2 + 0.2);
  g.add(sign);

  // Position de l'entrée locale (pour les intérieurs)
  g.userData.entranceLocal = new THREE.Vector3(0, 0, depth / 2 + 1.8);

  return g;
}

/**
 * Construit une tour.
 * @param width - Largeur.
 * @param depth - Profondeur.
 * @param floors - Nombre d'étages.
 * @param lit - Pourcentage de fenêtres allumées.
 * @param seed - Graine aléatoire.
 * @param textures - Liste des textures.
 * @param style - Style architectural.
 * @returns Groupe THREE.js.
 */
function tower(
  width: number,
  depth: number,
  floors: number,
  lit: number,
  seed: number,
  textures: THREE.Texture[],
  style: FacadeStyle
): THREE.Group {
  // Utiliser le style "stuc" si le style est "clapboard"
  const effectiveStyle = style === "clapboard" ? "stuc" : style;
  const g = building(
    width,
    depth,
    floors,
    0x8a8a86,
    lit,
    seed,
    false,
    textures,
    effectiveStyle,
    "bon_etat",
    "tour"
  );
  g.name = "tour";

  // Hauteur totale
  const h = floors * 3.05;

  // Plateforme au sommet
  const ph = new THREE.Mesh(
    new THREE.BoxGeometry(width - 4.2, 3.4, depth - 4.2),
    matLib.get(0xd8d4c8, 0.88)
  );
  ph.position.y = h + 2.2;
  ph.castShadow = true;
  g.add(ph);

  // Terrasse
  const terrace = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.6, 0.14, depth - 0.6),
    matLib.get(0x8a8278, 0.94)
  );
  terrace.position.y = h + 0.55;
  g.add(terrace);

  // Rampe de sécurité
  const rail = matLib.get(0x9ab4c4, 0.15, 0.45);
  for (const [w, d, ox, oz] of [
    [width - 0.8, 0.06, 0, (depth - 0.8) / 2],
    [width - 0.8, 0.06, 0, -(depth - 0.8) / 2],
  ] as Array<[number, number, number, number]>) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.05), rail);
    p.position.set(ox, h + 1.1, oz);
    g.add(p);
  }

  // Position de l'entrée locale
  g.userData.entranceLocal = new THREE.Vector3(0, 0, depth / 2 + 2.0);

  return g;
}

/**
 * Construit un escalier en colimaçon.
 * @param floors - Nombre d'étages.
 * @returns Groupe THREE.js.
 */
function spiralStair(floors: number): THREE.Group {
  const g = new THREE.Group();
  const metal = matLib.get(0x5a5e62, 0.5, 0.65);

  // Nombre de marches
  const steps = floors * 12;

  // Géométrie d'une marche
  const geo = new THREE.BoxGeometry(1.0, 0.045, 0.26);

  // Mesh instancié pour les marches
  const inst = new THREE.InstancedMesh(geo, metal, steps);

  // Objet dummy pour positionner les marches
  const dummy = new THREE.Object3D();
  const r = 1.35; // Rayon

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * floors * 0.8; // Angle
    dummy.position.set(Math.cos(a) * r, 0.25 + t * (floors * 3.05 - 0.4), Math.sin(a) * r);
    dummy.rotation.y = -a;
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }

  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);

  // Poteau central
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, floors * 3.05, 8),
    metal
  );
  pole.position.y = (floors * 3.05) / 2;
  g.add(pole);

  return g;
}

/**
 * Construit un stationnement.
 * @param width - Largeur.
 * @param depth - Profondeur.
 * @param seed - Graine aléatoire.
 * @returns Groupe THREE.js.
 */
function parkingPad(width: number, depth: number, seed: number): THREE.Group {
  const rng = makeRng(seed);
  const g = new THREE.Group();

  // Surface du stationnement
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, 0.08, depth * 0.92),
    texLib.pbr("asphalteSombre", "betonDallesNrm", 3, 3, 0.96, 0, 0xffffff, 0.4)
  );
  pad.position.y = 0.04;
  pad.receiveShadow = true;
  g.add(pad);

  // Nombre de voitures
  const n = Math.max(2, Math.floor(width / 5.5));

  // Placer des voitures aléatoirement
  for (let i = 0; i < n; i++) {
    if (rng() > 0.55) continue; // 45% de chance de placer une voiture

    const car = buildSedan([0x2a3a58, 0x6a2a28, 0xc8c4bc, 0x1a1a1e][i % 4]!);
    car.position.set((i - (n - 1) / 2) * 5.2, 0.35, rng() * 2 - 1);
    car.rotation.y = Math.PI / 2;
    g.add(car);
  }

  // Kiosque de stationnement
  const kiosk = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.2, 1.6),
    matLib.get(0x4a4e52, 0.7, 0.2)
  );
  kiosk.position.set(-width * 0.35, 1.1, -depth * 0.32);
  g.add(kiosk);

  return g;
}

/**
 * Construit un duplex.
 * @param seed - Graine aléatoire.
 * @returns Groupe THREE.js.
 */
function duplex(seed: number): THREE.Group {
  const g = new THREE.Group();

  // Construire deux maisons canadiennes côte à côte
  const a = buildMaisonCanadienne(seed, 0);
  const b = buildMaisonCanadienne(seed + 9, 0);

  a.position.x = -5.4;
  b.position.x = 5.4;

  g.add(a, b);

  // Définir l'empreinte au sol
  g.userData.footprint = { width: 16.8, depth: 10.4 };

  return g;
}

// ============================================================================
// 🏙️ FONCTION PRINCIPALE : CONSTRUCTION DE LA VILLE
// ============================================================================

/**
 * Construit une ville complète avec des propriétés RP.
 * @param cfg - Configuration de la ville.
 * @returns Ville construite.
 */
export function buildCity(cfg: CityConfig): BuiltCity {
  // Initialiser le générateur aléatoire
  const rng = makeRng(cfg.seed);

  // Créer le groupe principal
  const group = new THREE.Group();
  group.name = `ville_${cfg.villageName}`;

  // Initialiser les listes
  const doors: CityDoor[] = [];
  const textures: THREE.Texture[] = [];
  const swings: SwingDoor[] = [];
  const buildings: CityBuilding[] = [];
  const districts: CityDistrict[] = [];
  const citizens: Citizen[] = [];
  const events: CityEvent[] = [];

  // Récupérer les coordonnées du centre
  const [cx, cz] = cfg.center;

  // Angle de rotation de la ville
  const angle = cfg.angle ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Calculer le pas entre les rues
  const pitch = cfg.blockSize + cfg.streetWidth;
  const colOff: number[] = [];
  const rowOff: number[] = [];

  // Calculer les offsets des colonnes et rangées
  for (let i = 0; i <= cfg.gridSize; i++) {
    colOff.push(i * pitch);
    rowOff.push(i * pitch);
  }

  // Dimensions totales de la ville
  const totalW = colOff[cfg.gridSize];
  const totalD = rowOff[cfg.gridSize];

  // Décalages pour centrer la ville
  const shiftX = -totalW / 2;
  const shiftZ = -totalD / 2;

  // Fonction pour convertir les coordonnées locales en coordonnées mondiales
  const toWorld = (lx: number, lz: number) => {
    const x = cx + (lx + shiftX) * cos - (lz + shiftZ) * sin;
    const z = cz + (lx + shiftX) * sin + (lz + shiftZ) * cos;
    return { x, z, y: getTerrainHeight(x, z) };
  };

  // Matériau pour les trottoirs
  const sidewalk = texLib.pbr(
    "platreGris",
    "betonMurNrm",
    6,
    2,
    0.93,
    0,
    0xc4c0b8,
    0.35
  );

  /**
   * Ajoute une rue entre deux points.
   * @param a - Point de départ.
   * @param b - Point d'arrivée.
   * @param width - Largeur de la rue.
   */
  const addStreet = (
    a: { x: number; z: number; y: number },
    b: { x: number; z: number; y: number },
    width: number
  ) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz); // Longueur de la rue
    const ang = Math.atan2(dx, dz); // Angle de la rue
    const midX = (a.x + b.x) / 2; // Point milieu X
    const midZ = (a.z + b.z) / 2; // Point milieu Z
    const y = (a.y + b.y) / 2; // Hauteur moyenne

    // Vérifier si une route existe déjà à cet endroit
    const over = overlayRoadAt(midX, midZ);
    const w = over ? over.width : width;

    // Ajouter les trottoirs de chaque côté
    for (const side of [-1, 1]) {
      const sw = CITY_SIDEWALK_W; // Largeur du trottoir
      const px = midX + Math.cos(ang) * (w / 2 + sw / 2) * side;
      const pz = midZ - Math.sin(ang) * (w / 2 + sw / 2) * side;

      // Créer le trottoir
      const walk = new THREE.Mesh(
        new THREE.BoxGeometry(sw, 0.14, len),
        sidewalk
      );
      walk.rotation.y = -ang;
      walk.position.set(px, y + 0.08, pz);
      walk.receiveShadow = true;
      group.add(walk);
    }
  };

  // Ajouter les rues principales (grille)
  for (let i = 0; i <= cfg.gridSize; i++) {
    const artery = i === Math.floor(cfg.gridSize / 2); // Rue principale
    const w = artery ? cfg.streetWidth * CITY_ARTERY_MUL : cfg.streetWidth;

    // Rues horizontales
    addStreet(
      toWorld(colOff[i], -cfg.streetWidth),
      toWorld(colOff[i], totalD + cfg.streetWidth),
      w
    );

    // Rues verticales
    addStreet(
      toWorld(-cfg.streetWidth, rowOff[i]),
      toWorld(totalW + cfg.streetWidth, rowOff[i]),
      w
    );
  }

  // Ajouter les intersections
  for (let i = 0; i <= cfg.gridSize; i++) {
    for (let j = 0; j <= cfg.gridSize; j++) {
      const p = toWorld(colOff[i], rowOff[j]);
      const wNs = i === Math.floor(cfg.gridSize / 2)
        ? cfg.streetWidth * CITY_ARTERY_MUL
        : cfg.streetWidth;
      const wEw = j === Math.floor(cfg.gridSize / 2)
        ? cfg.streetWidth * CITY_ARTERY_MUL
        : cfg.streetWidth;

      const over = overlayRoadAt(p.x, p.z);
      const size = Math.max(wNs, wEw, over?.width ?? 0) + 1.6;

      group.add(buildIntersectionPad(p.x, p.z, size));
    }
  }

  // Déterminer les positions des éléments spéciaux
  const parkCol = Math.floor(cfg.gridSize / 2);
  const parkRow = Math.floor(cfg.gridSize / 2);
  const hotelCol = Math.min(cfg.gridSize - 1, parkCol + 1);
  const hotelRow = parkRow;
  const towerCol = parkCol;
  const towerRow = Math.max(0, parkRow - 1);

  // Récupérer les lots spéciaux
  const spec = citySpecialLots({
    id: cfg.id ?? "",
    name: cfg.villageName,
    center: cfg.center,
    gridSize: cfg.gridSize,
    blockSize: cfg.blockSize,
    streetWidth: cfg.streetWidth,
    density: cfg.density,
    seed: cfg.seed,
  });

  const caisseCol = spec.caisse.col;
  const caisseRow = spec.caisse.row;
  const cemCol = spec.cemetery.col;
  const cemRow = spec.cemetery.row;

  // Matériau pour les lampadaires
  const lampMat = matLib.get(0x3a3e42, 0.55, 0.6);
  const bulbMat = matLib.getEmissive(0xfff0c0, 0xffc870, 0.08);

  // Liste des positions des lampadaires
  const lamps: Array<{ x: number; y: number; z: number }> = [];

  // Style architectural du village
  const style = villageStyle(cfg.villageName);

  // Initialiser les statistiques de la ville
  let totalPopulation = 0;
  let totalReputation = 0;
  let totalWealth = 0;
  let totalCrimeRate = 0;
  let totalPollution = 0;
  let totalSatisfaction = 0;
  let totalTaxRevenue = 0;
  let totalMaintenanceCost = 0;
  let totalHousingSupply = 0;
  let totalHousingDemand = 0;
  let totalJobSupply = 0;
  let totalJobDemand = 0;

  // Générer les bâtiments pour chaque lot
  for (let row = 0; row < cfg.gridSize; row++) {
    for (let col = 0; col < cfg.gridSize; col++) {
      // Récupérer les informations du lot
      const lot = cityLotLocal(cfg, col, row);
      const world = cityToWorld(cfg, lot.cx, lot.cz, angle);

      // Calculer la distance au centre
      const dc = Math.hypot(col - cfg.gridSize / 2, row - cfg.gridSize / 2) /
                Math.max(1, cfg.gridSize / 2);

      // Déterminer si on est sur une artère principale
      const onArtery = col === Math.floor(cfg.gridSize / 2) ||
                      row === Math.floor(cfg.gridSize / 2);

      // Dimensions du bâtiment
      const bw = Math.min(lot.w - 2.6, Math.max(7, lot.w * 0.7));
      const bd = Math.min(lot.d - 2.6, Math.max(7, lot.d * 0.64));

      // Orientation du bâtiment
      const yaw = row < cfg.gridSize / 2 ? Math.PI : 0;

      // ID de la ville
      const cityId = cfg.id ?? cfg.villageName.toLowerCase().replace(/\s+/g, "");

      // Vérifier si le lot traverse une route
      const through = lotHitsThroughRoad(
        world.x,
        world.z,
        0,
        cityId,
        lot.w * 0.48,
        lot.d * 0.48
      );

      // Variables pour le bâtiment
      let mesh: THREE.Group;
      let doorKind: InteriorKind | null = null;
      let doorName = "";
      let buildingType: BuildingType = "maison";
      let buildingCategory: BuildingCategory = "residentiel";
      let condition: BuildingCondition = "bon_etat";
      let quality: QualityLevel = Math.min(
        5,
        Math.max(1, Math.floor(1 + dc * 3 + rng() * 2))
      ) as QualityLevel;
      let value = 0;
      let buyCost = 0;
      let rentCost = 0;
      let maintenanceCost = 0;
      let reputationImpact = 0;
      let capacity = 0;
      let production = undefined;
      let services: PublicServiceType[] = [];
      let operatingHours = undefined;
      let hasElevator = false;
      let hasFireExit = false;
      let hasSecurity = false;
      let hasSprinklers = false;

      // Générer un ID unique pour le bâtiment
      const buildingId = `${cfg.villageName}_${col}_${row}_${Date.now()}`;

      // Déterminer le type de bâtiment
      if (through) {
        // Si le lot traverse une route, créer un parc
        mesh = buildPark(lot.w * 0.94, lot.d * 0.94, cfg.seed + col * 11 + row, true);
        buildingType = "parc";
        buildingCategory = "loisirs";
        condition = "bon_etat";
        reputationImpact = 3;
      } else if (col === parkCol && row === parkRow) {
        // Parc principal
        mesh = buildPark(lot.w * 0.94, lot.d * 0.94, cfg.seed + col * 11 + row);
        buildingType = "parc";
        buildingCategory = "loisirs";
        condition = "bon_etat";
        reputationImpact = 5;
      } else if (col === hotelCol && row === hotelRow) {
        // Hôtel
        const fl = Math.max(5, Math.round(6 * cfg.density));
        mesh = hotel(bw, bd, fl, 0.35, cfg.seed + col * 17 + row, textures, style);
        doorKind = "hotel";
        doorName = `Hôtel ${cfg.villageName}`;
        buildingType = "hotel";
        buildingCategory = "commercial";
        condition = "bon_etat";
        quality = Math.min(5, Math.floor(3 + cfg.density * 2)) as QualityLevel;
        value = bw * bd * BASE_BUILDING_VALUES.hotel * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.hotel * quality * 1.5;
        rentCost = Math.floor(value * 0.002);
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.hotel * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.hotel * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.hotel * fl * quality);
        services = ["electricite", "eau"];
        operatingHours = { open: 0, close: 24 };
        hasElevator = fl >= 3;
        hasFireExit = true;
        hasSecurity = true;
      } else if (col === towerCol && row === towerRow) {
        // Tour
        const fl = Math.max(6, Math.round(7 * cfg.density));
        mesh = tower(bw, bd, fl, 0.28, cfg.seed + 90, textures, style);
        doorKind = "apartment";
        doorName = `Tour ${cfg.villageName}`;
        buildingType = "tour";
        buildingCategory = "residentiel";
        condition = "bon_etat";
        quality = Math.min(5, Math.floor(3 + cfg.density * 2)) as QualityLevel;
        value = bw * bd * BASE_BUILDING_VALUES.tour * quality * fl;
        buyCost = bw * bd * BASE_BUILDING_COSTS.tour * quality * fl * 1.3;
        rentCost = Math.floor(value * 0.0015);
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.tour * fl * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.tour * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.tour * fl * quality);
        services = ["electricite", "eau", "ascenseur"];
        operatingHours = { open: 0, close: 24 };
        hasElevator = fl >= 3;
        hasFireExit = true;
        hasSecurity = true;
      } else if (
        parkCol > 0 &&
        col === parkCol - 1 &&
        row === parkRow
      ) {
        // Église
        mesh = buildEglise(cfg.seed + 11, 0);
        buildingType = "eglise";
        buildingCategory = "institutionnel";
        condition = "bon_etat";
        quality = 4;
        value = bw * bd * BASE_BUILDING_VALUES.eglise * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.eglise * quality;
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.eglise * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.eglise * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.eglise * quality);
        services = ["electricite"];
        operatingHours = { open: 8, close: 18 };
      } else if (
        col === cemCol &&
        row === cemRow &&
        !(col === 0 && row === cfg.gridSize - 1) &&
        !(col === caisseCol && row === caisseRow) &&
        !(parkCol > 0 && col === parkCol - 1 && row === parkRow)
      ) {
        // Cimetière
        mesh = buildCemetery(lot.w * 0.9, lot.d * 0.9, cfg.seed + 44);
        buildingType = "cimetiere";
        buildingCategory = "public";
        condition = "bon_etat";
        quality = 3;
        value = 0; // Pas de valeur marchande
        buyCost = bw * bd * BASE_BUILDING_COSTS.cimetiere;
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.cimetiere * 0.5;
        reputationImpact = BASE_REPUTATION_IMPACTS.cimetiere;
        capacity = 0;
        services = [];
      } else if (col === hotelCol && row === Math.max(0, parkRow - 1) &&
                !(col === towerCol && row === towerRow)) {
        // Hôtel de ville
        mesh = buildHotelVille();
        buildingType = "hotel_ville";
        buildingCategory = "institutionnel";
        condition = "bon_etat";
        quality = 5;
        value = bw * bd * BASE_BUILDING_VALUES.hotel_ville * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.hotel_ville * quality;
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.hotel_ville * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.hotel_ville * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.hotel_ville * quality);
        services = ["electricite", "eau", "administration"];
        operatingHours = { open: 8, close: 17 };
      } else if (col === caisseCol && row === caisseRow) {
        // Caisse populaire
        const built = buildCaissePopulaire(cfg.villageName);
        mesh = built.root;
        doorKind = "caisse";
        doorName = `Caisse de ${cfg.villageName}`;
        buildingType = "caisse_populaire";
        buildingCategory = "institutionnel";
        condition = "bon_etat";
        quality = 4;
        value = bw * bd * BASE_BUILDING_VALUES.caisse_populaire * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.caisse_populaire * quality;
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.caisse_populaire * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.caisse_populaire * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.caisse_populaire * quality);
        services = ["electricite", "banque"];
        operatingHours = { open: 9, close: 17 };
        hasSecurity = true;
      } else if (cfg.villageName === "Donnacona" && col === 0 && row === 0) {
        // Bureau de poste
        mesh = buildSqPoste();
        buildingType = "sq_poste";
        buildingCategory = "public";
        condition = "bon_etat";
        quality = 3;
        value = bw * bd * BASE_BUILDING_VALUES.sq_poste * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.sq_poste * quality;
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.sq_poste * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.sq_poste * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.sq_poste * quality);
        services = ["electricite", "poste"];
        operatingHours = { open: 8, close: 18 };
      } else if (col === 0 && row === cfg.gridSize - 1) {
        // École
        mesh = buildEcole(cfg.seed + 3, 0);
        buildingType = "ecole";
        buildingCategory = "institutionnel";
        condition = "bon_etat";
        quality = Math.min(5, Math.floor(3 + cfg.density)) as QualityLevel;
        value = bw * bd * BASE_BUILDING_VALUES.ecole * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.ecole * quality;
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.ecole * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.ecole * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.ecole * quality);
        services = ["electricite", "education"];
        operatingHours = { open: 8, close: 16 };
      } else if (onArtery && col === Math.min(cfg.gridSize - 1, parkCol) && row === 0) {
        // Dépanneur
        mesh = buildDepanneur(cfg.seed + col, 0);
        doorKind = "depanneur";
        doorName = `Dépanneur ${cfg.villageName}`;
        buildingType = "depanneur";
        buildingCategory = "commercial";
        condition = Math.random() > 0.7 ? "bon_etat" : "use";
        quality = Math.min(5, Math.floor(2 + cfg.density * 2)) as QualityLevel;
        value = bw * bd * BASE_BUILDING_VALUES.depanneur * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.depanneur * quality;
        rentCost = Math.floor(value * 0.003);
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.depanneur * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.depanneur * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.depanneur * quality);
        production = {
          type: "nourriture",
          amount: Math.floor(10 * quality),
          value: 50 * quality,
        };
        services = ["electricite"];
        operatingHours = { open: 6, close: 23 };
        hasSecurity = rng() > 0.7;
      } else if (col === cfg.gridSize - 1 && row === Math.min(cfg.gridSize - 1, parkRow + 1)) {
        // Quincaillerie
        mesh = buildQuincaillerie();
        buildingType = "quincaillerie";
        buildingCategory = "commercial";
        condition = "bon_etat";
        quality = Math.min(5, Math.floor(3 + cfg.density)) as QualityLevel;
        value = bw * bd * BASE_BUILDING_VALUES.quincaillerie * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.quincaillerie * quality;
        rentCost = Math.floor(value * 0.0025);
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.quincaillerie * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.quincaillerie * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.quincaillerie * quality);
        production = {
          type: "materials",
          amount: Math.floor(15 * quality),
          value: 80 * quality,
        };
        services = ["electricite"];
        operatingHours = { open: 8, close: 18 };
        hasSecurity = rng() > 0.6;
      } else if (onArtery && row === cfg.gridSize - 1 && col === Math.max(0, parkCol - 1)) {
        // Casse-croûte ou boutique
        const casse = rng() <= 0.45;
        mesh = casse ? buildCasseCroute() : buildBoutique();
        doorKind = casse ? "casse" : "boutique";
        doorName = casse ? `Casse-croûte ${cfg.villageName}` : `Boutique ${cfg.villageName}`;
        buildingType = casse ? "casse_croute" : "boutique";
        buildingCategory = "commercial";
        condition = Math.random() > 0.8 ? "bon_etat" : "use";
        quality = Math.min(5, Math.floor(2 + cfg.density * 2)) as QualityLevel;
        value = bw * bd * (casse ? BASE_BUILDING_VALUES.casse_croute : BASE_BUILDING_VALUES.boutique) * quality;
        buyCost = bw * bd * (casse ? BASE_BUILDING_COSTS.casse_croute : BASE_BUILDING_COSTS.boutique) * quality;
        rentCost = Math.floor(value * (casse ? 0.0028 : 0.003));
        maintenanceCost = bw * bd * (casse ? BASE_MAINTENANCE_COSTS.casse_croute : BASE_MAINTENANCE_COSTS.boutique) * (5 - quality) * 0.2;
        reputationImpact = (casse ? BASE_REPUTATION_IMPACTS.casse_croute : BASE_REPUTATION_IMPACTS.boutique) * quality;
        capacity = Math.floor((casse ? BASE_BUILDING_CAPACITIES.casse_croute : BASE_BUILDING_CAPACITIES.boutique) * quality);
        production = {
          type: "nourriture",
          amount: Math.floor((casse ? 20 : 10) * quality),
          value: (casse ? 30 : 60) * quality,
        };
        services = ["electricite"];
        operatingHours = casse ? { open: 5, close: 2 } : { open: 9, close: 18 };
        hasSecurity = rng() > 0.5;
      } else if (dc > 0.72 && rng() > 0.35) {
        // Duplex
        mesh = duplex(cfg.seed + col * 19 + row * 7);
        buildingType = "duplex";
        buildingCategory = "residentiel";
        condition = Math.random() > 0.85 ? "neuf" : Math.random() > 0.5 ? "bon_etat" : "use";
        quality = Math.min(5, Math.floor(2 + dc * 2 + rng() * 2)) as QualityLevel;
        value = bw * bd * BASE_BUILDING_VALUES.duplex * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.duplex * quality;
        rentCost = Math.floor(value * 0.001);
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.duplex * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.duplex * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.duplex * quality);
        services = ["electricite", "eau"];
        hasFireExit = true;
      } else if (dc > 0.55 && rng() > 0.62) {
        // Stationnement
        mesh = parkingPad(bw, bd, cfg.seed + col * 5 + row);
        buildingType = "parking";
        buildingCategory = "public";
        condition = Math.random() > 0.9 ? "neuf" : "bon_etat";
        quality = Math.min(5, Math.floor(1 + dc * 2 + rng() * 2)) as QualityLevel;
        value = bw * bd * BASE_BUILDING_VALUES.parking * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.parking * quality;
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.parking * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.parking * quality;
        capacity = Math.floor(bw * bd * 0.1); // Nombre de places de stationnement
        services = [];
      } else if (dc > 0.58) {
        // Maison canadienne
        mesh = buildMaisonCanadienne(cfg.seed + col * 31 + row * 13, 0);
        buildingType = "maison";
        buildingCategory = "residentiel";
        condition = Math.random() > 0.9 ? "neuf" :
                   Math.random() > 0.7 ? "bon_etat" :
                   Math.random() > 0.3 ? "use" : "abandonne";
        quality = Math.min(5, Math.floor(1 + dc * 3 + rng() * 2)) as QualityLevel;
        value = bw * bd * BASE_BUILDING_VALUES.maison * quality;
        buyCost = bw * bd * BASE_BUILDING_COSTS.maison * quality;
        rentCost = Math.floor(value * 0.0008);
        maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.maison * (5 - quality) * 0.2;
        reputationImpact = BASE_REPUTATION_IMPACTS.maison * quality;
        capacity = Math.floor(BASE_BUILDING_CAPACITIES.maison * quality);
        services = ["electricite", "eau"];
        hasFireExit = rng() > 0.5;
        hasSprinklers = rng() > 0.7;
      } else {
        // Bâtiment générique
        const shop = onArtery && dc < 0.7;
        let floors = dc < 0.35 ? 4 : dc < 0.65 ? 3 : 2;
        floors = Math.max(1, Math.round(floors * cfg.density));
        const color = STYLE_PALETTES[style][Math.floor(rng() * STYLE_PALETTES[style].length)]!;

        mesh = building(
          bw,
          bd,
          floors,
          color,
          0.18,
          cfg.seed + col * 31 + row * 13,
          shop,
          textures,
          style,
          condition,
          buildingType
        );

        if (shop) {
          doorKind = "boutique";
          doorName = `Commerce ${cfg.villageName}`;
          buildingType = "commerce";
          buildingCategory = "commercial";
          quality = Math.min(5, Math.floor(2 + dc * 2 + rng() * 2)) as QualityLevel;
          value = bw * bd * BASE_BUILDING_VALUES.commerce * quality * floors;
          buyCost = bw * bd * BASE_BUILDING_COSTS.commerce * quality * floors;
          rentCost = Math.floor(value * 0.002);
          maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS.commerce * floors * (5 - quality) * 0.2;
          reputationImpact = BASE_REPUTATION_IMPACTS.commerce * quality;
          capacity = Math.floor(BASE_BUILDING_CAPACITIES.commerce * quality * floors);
          production = {
            type: "divers",
            amount: Math.floor(5 * quality * floors),
            value: 40 * quality * floors,
          };
          services = ["electricite"];
          operatingHours = { open: 9, close: 18 };
          hasSecurity = rng() > 0.6;
        } else {
          // Bâtiment résidentiel générique
          buildingType = floors >= 4 ? "immeuble" : floors === 3 ? "triplex" : "maison";
          buildingCategory = "residentiel";
          condition = Math.random() > 0.9 ? "neuf" :
                     Math.random() > 0.7 ? "bon_etat" :
                     Math.random() > 0.3 ? "use" : "abandonne";
          quality = Math.min(5, Math.floor(1 + dc * 3 + rng() * 2)) as QualityLevel;
          value = bw * bd * BASE_BUILDING_VALUES[buildingType] * quality * floors;
          buyCost = bw * bd * BASE_BUILDING_COSTS[buildingType] * quality * floors;
          rentCost = Math.floor(value * 0.0005 * floors);
          maintenanceCost = bw * bd * BASE_MAINTENANCE_COSTS[buildingType] * floors * (5 - quality) * 0.2;
          reputationImpact = BASE_REPUTATION_IMPACTS[buildingType] * quality;
          capacity = Math.floor(BASE_BUILDING_CAPACITIES[buildingType] * quality * floors);
          services = ["electricite", "eau"];
          hasFireExit = floors >= 3 || rng() > 0.5;
          hasSprinklers = floors >= 3 || rng() > 0.7;
        }

        // Ajouter un escalier en colimaçon si le bâtiment a plusieurs étages
        if (floors >= 3 && rng() > 0.55) {
          const stair = spiralStair(Math.min(4, floors));
          stair.position.set(bw * 0.28, 0, -bd * 0.28);
          mesh.add(stair);
        }
      }

      // Positionner et orienter le bâtiment
      mesh.position.set(world.x, world.y, world.z);
      mesh.rotation.y = yaw;

      // Ajuster l'échelle si nécessaire
      const fp = mesh.userData.footprint as { width?: number; depth?: number } | undefined;
      if (fp?.width && fp?.depth) {
        const s = Math.min(
          1,
          (lot.w - 2.4) / fp.width,
          (lot.d - 2.4) / fp.depth
        );
        if (s < 0.995) mesh.scale.multiplyScalar(Math.max(0.35, s));
      }

      // Ajouter le bâtiment au groupe
      group.add(mesh);

      // Créer l'objet CityBuilding
      const building: CityBuilding = {
        id: buildingId,
        type: buildingType,
        category: buildingCategory,
        x: world.x,
        y: world.y,
        z: world.z,
        width: bw * mesh.scale.x,
        depth: bd * mesh.scale.z,
        height: (mesh.userData.footprint?.height || 3.05 * floors) * mesh.scale.y,
        floors,
        yaw,
        style,
        condition,
        quality,
        value,
        buyCost,
        rentCost,
        maintenanceCost,
        taxValue: Math.floor(value * 0.8), // Valeur imposable (80% de la valeur marchande)
        reputationImpact,
        capacity,
        currentOccupancy: Math.floor(capacity * (0.5 + rng() * 0.5)), // Occupation initiale
        production,
        services,
        operatingHours,
        age: Math.floor(rng() * 365 * 10), // Âge aléatoire (0-10 ans)
        durability: Math.min(100, 100 - buildingType === "abandonne" ? 50 : rng() * 20),
        fireRisk: Math.min(100, 20 + rng() * 60),
        crimeRate: Math.min(100, 10 + (100 - reputationImpact * 10)),
        satisfaction: Math.min(100, 50 + reputationImpact * 5 + quality * 5),
        hasElevator,
        hasFireExit,
        hasSecurity,
        hasSprinklers,
        accessibility: Math.min(100, 70 + quality * 6),
        historicalValue: buildingType === "eglise" || buildingType === "mairie" ? 80 : Math.floor(rng() * 50),
        quests: [],
        events: [],
        connectedBuildings: [],
      };

      // Ajouter le bâtiment à la liste
      buildings.push(building);

      // Mettre à jour les statistiques selon le type de bâtiment
      if (buildingCategory === "residentiel") {
        totalHousingSupply += building.capacity;
        totalHousingDemand += building.currentOccupancy;
        totalPopulation += building.currentOccupancy;
      } else if (buildingCategory === "commercial" || buildingCategory === "industriel") {
        totalJobSupply += building.capacity;
        totalJobDemand += building.currentOccupancy;
      }

      totalReputation += building.reputationImpact * building.capacity;
      totalWealth += building.value;
      totalCrimeRate += building.crimeRate * building.capacity;
      totalPollution += (buildingType === "usine" || buildingType === "scierie" ? 20 :
                       buildingType === "entrepot" || buildingType === "parking" ? 10 : 5) * building.capacity;
      totalSatisfaction += building.satisfaction * building.currentOccupancy;
      totalTaxRevenue += Math.floor(building.taxValue * 0.001); // 0.1% de la valeur imposable par jour
      totalMaintenanceCost += building.maintenanceCost;

      // Ajouter une porte si le bâtiment en a une
      if (doorKind) {
        // Position locale de l'entrée (par défaut au centre avant)
        const local = (mesh.userData.entranceLocal as THREE.Vector3) ??
                     new THREE.Vector3(0, 0, bd / 2 + 2);

        // Calculer la position mondiale de l'entrée
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const dx = local.x * cosY + local.z * sinY;
        const dz = -local.x * sinY + local.z * cosY;

        // Créer le message d'invite
        const prompt =
          doorKind === "hotel" ? `Entrer · ${doorName}` :
          doorKind === "depanneur" || doorKind === "caisse" || doorKind === "casse" ?
            `Entrer · ${doorName}` :
            `Entrer · ${doorName}, 4½`;

        // Ajouter la porte à la liste
        doors.push({
          id: `${buildingId}_door`,
          name: doorName,
          kind: doorKind,
          x: world.x + dx,
          y: world.y,
          z: world.z + dz,
          yaw,
          prompt,
          buildingId,
          buildingType,
          isOpen: true,
          locked: false,
          condition: building.condition,
          quality: building.quality,
        });

        // Ajouter les portes balançantes si elles existent
        const meshSwings = (mesh.userData.swings as SwingDoor[] | undefined) ?? [];
        swings.push(...meshSwings);
      }

      // Ajouter des lampadaires autour des bâtiments importants
      lamps.push({
        x: world.x + (lot.w / 2 + 1.4) * (col % 2 === 0 ? 1 : -1),
        y: world.y,
        z: world.z + (row < cfg.gridSize / 2 ? -(lot.d / 2 + 1.5) : lot.d / 2 + 1.5),
      });
    }
  }

  // Créer les lampadaires (InstancedMesh pour les performances)
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.11, 6.6, 6);
  const headGeo = new THREE.BoxGeometry(0.38, 0.12, 0.7);
  const count = lamps.length;

  // Si des lampadaires existent, les créer
  if (count > 0) {
    const poles = new THREE.InstancedMesh(poleGeo, lampMat, count);
    const heads = new THREE.InstancedMesh(headGeo, bulbMat, count);
    const dummy = new THREE.Object3D();

    // Positionner chaque lampadaire
    lamps.forEach((p, i) => {
      dummy.position.set(p.x, p.y + 3.3, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, p.y + 6.5, p.z);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    });

    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    heads.userData.isStreetlight = true;
    poles.castShadow = true;
    group.add(poles, heads);
  }

  // Créer les quartiers de la ville
  const districtWidth = totalW / Math.ceil(cfg.gridSize / 2);
  const districtDepth = totalD / Math.ceil(cfg.gridSize / 2);

  for (let row = 0; row < cfg.gridSize; row += Math.ceil(cfg.gridSize / 2)) {
    for (let col = 0; col < cfg.gridSize; col += Math.ceil(cfg.gridSize / 2)) {
      // Calculer les limites du quartier
      const minCol = col;
      const maxCol = Math.min(col + Math.ceil(cfg.gridSize / 2), cfg.gridSize);
      const minRow = row;
      const maxRow = Math.min(row + Math.ceil(cfg.gridSize / 2), cfg.gridSize);

      // Trouver les bâtiments dans ce quartier
      const districtBuildings: string[] = [];
      let districtPopulation = 0;
      let districtWealth = 0;
      let districtCrimeRate = 0;
      let districtPollution = 0;
      let districtSatisfaction = 0;
      let districtReputation = 0;

      for (let r = minRow; r < maxRow; r++) {
        for (let c = minCol; c < maxCol; c++) {
          const buildingIndex = r * cfg.gridSize + c;
          if (buildingIndex < buildings.length) {
            const building = buildings[buildingIndex];
            districtBuildings.push(building.id);

            // Mettre à jour les statistiques du quartier
            districtPopulation += building.currentOccupancy;
            districtWealth += building.value;
            districtCrimeRate += building.crimeRate * building.currentOccupancy;
            districtPollution += (buildingType === "usine" || buildingType === "scierie" ? 20 :
                                  buildingType === "entrepot" || buildingType === "parking" ? 10 : 5) *
                                  building.currentOccupancy;
            districtSatisfaction += building.satisfaction * building.currentOccupancy;
            districtReputation += building.reputationImpact * building.capacity;
          }
        }
      }

      // Déterminer le type de quartier
      let districtType: DistrictType = "residentiel";
      const buildingTypesInDistrict = buildings
        .filter((b) => districtBuildings.includes(b.id))
        .map((b) => b.category);

      const typeCounts: Record<BuildingCategory, number> = {
        residentiel: 0,
        commercial: 0,
        industriel: 0,
        public: 0,
        institutionnel: 0,
        loisirs: 0,
      };

      for (const type of buildingTypesInDistrict) {
        typeCounts[type]++;
      }

      // Déterminer le type dominant
      let maxCount = 0;
      for (const [type, count] of Object.entries(typeCounts)) {
        if (count > maxCount) {
          maxCount = count;
          districtType = type as DistrictType;
        }
      }

      // Ajuster le type selon la position
      if (col === 0 && row === 0) districtType = "centre_ville";
      if (col === cfg.gridSize - Math.ceil(cfg.gridSize / 2) &&
          row === cfg.gridSize - Math.ceil(cfg.gridSize / 2)) {
        districtType = "banlieue";
      }
      if (col >= cfg.gridSize / 2 && row >= cfg.gridSize / 2) {
        districtType = "rural";
      }

      // Calculer les statistiques moyennes
      const buildingCount = districtBuildings.length;
      districtCrimeRate = buildingCount > 0 ? districtCrimeRate / (buildingCount * 10) : 0;
      districtPollution = buildingCount > 0 ? districtPollution / (buildingCount * 10) : 0;
      districtSatisfaction = districtPopulation > 0 ? districtSatisfaction / districtPopulation : 50;
      districtReputation = buildingCount > 0 ? districtReputation / buildingCount : 50;

      // Créer le quartier
      const district: CityDistrict = {
        id: `${cfg.villageName}_district_${col}_${row}`,
        name: getDistrictName(cfg.villageName, col, row),
        type: districtType,
        x: (colOff[minCol] + colOff[maxCol]) / 2 + shiftX,
        z: (rowOff[minRow] + rowOff[maxRow]) / 2 + shiftZ,
        width: colOff[maxCol] - colOff[minCol],
        depth: rowOff[maxRow] - rowOff[minRow],
        population: districtPopulation,
        density: buildingCount / ((districtWidth * districtDepth) / (cfg.blockSize * cfg.blockSize)),
        wealth: districtWealth,
        crimeRate: Math.min(100, districtCrimeRate),
        pollution: Math.min(100, districtPollution),
        satisfaction: Math.min(100, districtSatisfaction),
        reputation: Math.min(100, districtReputation),
        buildings: districtBuildings,
        services: getDistrictServices(districtType),
        amenities: getDistrictAmenities(districtType, cfg.seed + col + row),
        traffic: Math.min(100, 30 + districtPopulation * 0.5),
        noise: Math.min(100, 20 + districtPopulation * 0.3 + districtCrimeRate * 0.2),
        greenSpaces: Math.min(100, 50 - district.density * 30),
        zoningRules: getZoningRules(districtType),
      };

      districts.push(district);
    }
  }

  // Générer les citoyens
  const targetPopulation = Math.floor(
    cfg.gridSize * cfg.gridSize * cfg.density * 10
  );

  for (let i = 0; i < targetPopulation; i++) {
    // Sélectionner un bâtiment résidentiel aléatoire
    const residentialBuildings = buildings.filter(
      (b) => b.category === "residentiel" && b.currentOccupancy < b.capacity
    );

    if (residentialBuildings.length === 0) continue;

    const building = residentialBuildings[Math.floor(rng() * residentialBuildings.length)];

    // Générer un citoyen
    const citizen: Citizen = generateRandomCitizen(cfg.villageName, rng(), building);

    // Ajouter le citoyen au bâtiment
    building.currentOccupancy++;
    building.residents = building.residents || [];
    building.residents.push(citizen.id);

    // Ajouter à la liste des citoyens
    citizens.push(citizen);

    // Mettre à jour les statistiques
    totalPopulation++;
    totalSatisfaction += citizen.needs.logement || 50;
  }

  // Calculer les statistiques finales
  totalReputation = Math.min(100, Math.max(0, totalReputation / Math.max(1, buildings.length)));
  totalWealth = totalWealth / Math.max(1, buildings.length);
  totalCrimeRate = Math.min(100, Math.max(0, totalCrimeRate / Math.max(1, totalPopulation)));
  totalPollution = Math.min(100, Math.max(0, totalPollution / Math.max(1, buildings.length)));
  totalSatisfaction = Math.min(100, Math.max(0, totalSatisfaction / Math.max(1, totalPopulation)));

  // Générer des événements aléatoires pour la ville
  const eventCount = Math.floor(rng() * 3);
  for (let i = 0; i < eventCount; i++) {
    events.push(generateRandomCityEvent(cfg.villageName, rng(), buildings));
  }

  // Générer des événements pour certains bâtiments
  for (const building of buildings) {
    if (rng() < 0.1) { // 10% de chance d'avoir un événement
      building.events.push(generateRandomBuildingEvent(building, rng()));
    }
  }

  // Générer des quêtes pour la ville
  const cityQuests: BuildingQuest[] = [];
  if (cfg.gridSize >= 3) {
    cityQuests.push(generateCityQuest("build_houses", cfg.villageName, 5, "maison"));
    cityQuests.push(generateCityQuest("upgrade_buildings", cfg.villageName, 3));
    cityQuests.push(generateCityQuest("reduce_crime", cfg.villageName, 10));
  }

  // Retourner la ville construite
  return {
    group,
    doors,
    textures,
    swings,
    buildings,
    districts,
    citizens,
    events,
    stats: {
      population: totalPopulation,
      reputation: Math.round(totalReputation),
      wealth: Math.round(totalWealth),
      crimeRate: Math.round(totalCrimeRate),
      pollution: Math.round(totalPollution),
      satisfaction: Math.round(totalSatisfaction),
      taxRevenue: Math.round(totalTaxRevenue),
      maintenanceCost: Math.round(totalMaintenanceCost),
      housingSupply: totalHousingSupply,
      housingDemand: totalHousingDemand,
      jobSupply: totalJobSupply,
      jobDemand: totalJobDemand,
    },
  };
}

// ============================================================================
// 🎭 FONCTIONS DE GÉNÉRATION RP
// ============================================================================

/**
 * Génère un nom de quartier.
 * @param villageName - Nom du village.
 * @param col - Colonne du quartier.
 * @param row - Rangée du quartier.
 * @returns Nom du quartier.
 */
function getDistrictName(villageName: string, col: number, row: number): string {
  const directions = ["Nord", "Sud", "Est", "Ouest", "Centre"];
  const types = ["Vieux", "Nouveau", "Grand", "Petit", "Haut", "Bas"];

  const dirIndex = Math.min(4, Math.floor((col + row) / 2));
  const typeIndex = Math.floor((col * 3 + row * 2) % types.length);

  return `${types[typeIndex]} ${villageName} ${directions[dirIndex]}`;
}

/**
 * Récupère les services disponibles dans un quartier selon son type.
 * @param type - Type du quartier.
 * @returns Liste des services.
 */
function getDistrictServices(type: DistrictType): PublicServiceType[] {
  const services: PublicServiceType[] = [];

  // Tous les quartiers ont au moins l'électricité et l'eau
  services.push("electricite", "eau");

  switch (type) {
    case "centre_ville":
      services.push("police", "pompiers", "hopital", "transport", "propreté");
      break;
    case "residentiel":
      services.push("police", "pompiers", "transport", "propreté");
      break;
    case "commercial":
      services.push("police", "pompiers", "transport", "propreté");
      break;
    case "industriel":
      services.push("pompiers", "transport", "propreté");
      break;
    case "public":
      services.push("police", "pompiers", "transport");
      break;
    case "institutionnel":
      services.push("police", "pompiers", "transport", "education");
      break;
    case "loisirs":
      services.push("propreté", "transport");
      break;
    case "banlieue":
      services.push("police", "transport");
      break;
    case "rural":
      services.push("transport");
      break;
  }

  return services;
}

/**
 * Récupère les équipements disponibles dans un quartier.
 * @param type - Type du quartier.
 * @param seed - Graine aléatoire.
 * @returns Liste des équipements.
 */
function getDistrictAmenities(type: DistrictType, seed: number): string[] {
  const rng = makeRng(seed);
  const amenities: string[] = [];

  switch (type) {
    case "centre_ville":
      amenities.push("parc", "bibliothèque", "théâtre", "restaurant", "magasin");
      if (rng() > 0.5) amenities.push("hôpital");
      if (rng() > 0.5) amenities.push("école");
      if (rng() > 0.7) amenities.push("cinéma");
      break;
    case "residentiel":
      amenities.push("parc", "école", "terrain_de_jeu");
      if (rng() > 0.6) amenities.push("piscine");
      if (rng() > 0.7) amenities.push("bibliothèque");
      break;
    case "commercial":
      amenities.push("restaurant", "magasin", "banque");
      if (rng() > 0.5) amenities.push("hôtel");
      if (rng() > 0.6) amenities.push("parking");
      break;
    case "industriel":
      amenities.push("entrepôt", "usine");
      if (rng() > 0.7) amenities.push("station_service");
      break;
    case "public":
      amenities.push("parc", "bibliothèque");
      if (rng() > 0.5) amenities.push("musée");
      break;
    case "institutionnel":
      amenities.push("école", "hôpital");
      if (rng() > 0.6) amenities.push("bibliothèque");
      break;
    case "loisirs":
      amenities.push("parc", "terrain_de_sport", "piscine");
      if (rng() > 0.5) amenities.push("centre_communautaire");
      break;
    case "banlieue":
      amenities.push("parc", "école");
      if (rng() > 0.6) amenities.push("centre_commercial");
      break;
    case "rural":
      amenities.push("ferme", "marché");
      if (rng() > 0.5) amenities.push("église");
      break;
  }

  return amenities;
}

/**
 * Récupère les règles de zonage pour un quartier.
 * @param type - Type du quartier.
 * @returns Règles de zonage.
 */
function getZoningRules(type: DistrictType): {
  allowedBuildingTypes: BuildingType[];
  maxHeight?: number;
  maxDensity?: number;
  minQuality?: QualityLevel;
} {
  switch (type) {
    case "centre_ville":
      return {
        allowedBuildingTypes: [
          "immeuble", "hotel", "commerce", "boutique", "depanneur",
          "casse_croute", "quincaillerie", "tour", "mairie", "hopital",
          "caserne_pompiers", "poste_police", "parking", "parc"
        ],
        maxHeight: 12,
        maxDensity: 1.0,
        minQuality: 3,
      };
    case "residentiel":
      return {
        allowedBuildingTypes: [
          "maison", "duplex", "triplex", "immeuble", "tour", "parc"
        ],
        maxHeight: 6,
        maxDensity: 0.8,
        minQuality: 2,
      };
    case "commercial":
      return {
        allowedBuildingTypes: [
          "commerce", "boutique", "depanneur", "casse_croute",
          "quincaillerie", "hotel", "parking"
        ],
        maxHeight: 4,
        maxDensity: 0.9,
        minQuality: 2,
      };
    case "industriel":
      return {
        allowedBuildingTypes: [
          "usine", "entrepot", "scierie", "grange", "parking"
        ],
        maxHeight: 8,
        maxDensity: 0.7,
        minQuality: 1,
      };
    case "public":
      return {
        allowedBuildingTypes: [
          "ecole", "eglise", "sq_poste", "caisse_populaire",
          "mairie", "hopital", "caserne_pompiers", "poste_police",
          "parc", "cimetiere", "parking"
        ],
        maxHeight: 6,
        maxDensity: 0.6,
        minQuality: 3,
      };
    case "institutionnel":
      return {
        allowedBuildingTypes: [
          "ecole", "eglise", "hopital", "mairie",
          "caserne_pompiers", "poste_police", "parc"
        ],
        maxHeight: 6,
        maxDensity: 0.5,
        minQuality: 3,
      };
    case "loisirs":
      return {
        allowedBuildingTypes: ["parc", "cimetiere"],
        maxHeight: 2,
        maxDensity: 0.3,
        minQuality: 2,
      };
    case "banlieue":
      return {
        allowedBuildingTypes: [
          "maison", "duplex", "triplex", "parc", "ecole"
        ],
        maxHeight: 4,
        maxDensity: 0.6,
        minQuality: 2,
      };
    case "rural":
      return {
        allowedBuildingTypes: [
          "maison", "duplex", "grange", "scierie", "parc"
        ],
        maxHeight: 3,
        maxDensity: 0.4,
        minQuality: 1,
      };
    default:
      return {
        allowedBuildingTypes: [],
        maxHeight: 2,
        maxDensity: 0.5,
        minQuality: 1,
      };
  }
}

/**
 * Génère un citoyen aléatoire.
 * @param villageName - Nom du village.
 * @param seed - Valeur aléatoire pour la graine.
 * @param homeBuilding - Bâtiment où habite le citoyen.
 * @returns Citoyen généré.
 */
function generateRandomCitizen(
  villageName: string,
  seed: number,
  homeBuilding: CityBuilding
): Citizen {
  const rng = makeRng(seed * 1000 + homeBuilding.id.length);
  const isMale = rng() > 0.5;
  const firstNames = isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
  const lastName = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];

  // Générer un âge réaliste
  const age = Math.floor(rng() * rng() * 90 + 5);

  // Déterminer le type selon l'âge
  let type: CitizenType = "adulte";
  if (age < 12) type = "enfant";
  else if (age < 18) type = "adolescent";
  else if (age >= 65) type = "senior";
  else if (rng() > 0.7) type = "travailleur";
  else if (rng() > 0.5) type = "etudiant";

  // Déterminer la profession selon le type
  let profession: Profession | undefined;
  if (type === "travailleur" || type === "adulte") {
    const professions: Profession[] = [
      "ouvrier", "employe_bureau", "commercant", "enseignant",
      "medecin", "policier", "pompier", "agriculteur"
    ];
    profession = professions[Math.floor(rng() * professions.length)];
  }

  // Générer les besoins
  const needs: Record<CitizenNeed, SatisfactionLevel> = {
    logement: Math.min(100, 50 + homeBuilding.quality * 10 + (homeBuilding.condition === "neuf" ? 20 :
                      homeBuilding.condition === "bon_etat" ? 10 :
                      homeBuilding.condition === "use" ? -10 : -30)),
    travail: profession ? Math.min(100, 60 + rng() * 30) : 0,
    nourriture: Math.min(100, 50 + rng() * 30),
    loisirs: Math.min(100, 40 + rng() * 40),
    sante: Math.min(100, 70 + rng() * 20),
    securite: Math.min(100, 60 + (100 - homeBuilding.crimeRate) * 0.3),
    education: type === "enfant" || type === "adolescent" || type === "etudiant" ?
               Math.min(100, 50 + rng() * 40) : Math.min(100, 30 + rng() * 30),
    transport: Math.min(100, 40 + rng() * 40),
  };

  // Déterminer le mood selon les besoins
  let mood: Citizen["mood"] = "neutre";
  const avgNeed = Object.values(needs).reduce((a, b) => a + b, 0) / Object.keys(needs).length;
  if (avgNeed > 80) mood = "heureux";
  else if (avgNeed > 60) mood = "content";
  else if (avgNeed < 30) mood = "mécontent";
  else if (avgNeed < 10) mood = "fâché";

  // Générer la richesse selon la profession
  let wealth = 0;
  let salary = 0;
  if (profession) {
    switch (profession) {
      case "medecin":
        wealth = Math.floor(rng() * 50000 + 100000);
        salary = 500;
        break;
      case "enseignant":
        wealth = Math.floor(rng() * 30000 + 50000);
        salary = 300;
        break;
      case "policier":
      case "pompier":
        wealth = Math.floor(rng() * 25000 + 40000);
        salary = 250;
        break;
      case "commercant":
        wealth = Math.floor(rng() * 40000 + 30000);
        salary = 200 + Math.floor(rng() * 200);
        break;
      case "employe_bureau":
        wealth = Math.floor(rng() * 20000 + 20000);
        salary = 150 + Math.floor(rng() * 100);
        break;
      case "ouvrier":
        wealth = Math.floor(rng() * 15000 + 10000);
        salary = 100 + Math.floor(rng() * 100);
        break;
      case "agriculteur":
        wealth = Math.floor(rng() * 20000 + 20000);
        salary = 120 + Math.floor(rng() * 80);
        break;
      default:
        wealth = Math.floor(rng() * 10000);
        salary = 50 + Math.floor(rng() * 50);
    }
  } else {
    // Sans profession (enfant, retraité, chômeur)
    wealth = Math.floor(rng() * 15000);
    salary = type === "senior" ? 100 + Math.floor(rng() * 100) : 0;
  }

  // Générer un niveau d'éducation
  const education = type === "enfant" ? Math.floor(rng() * 30) :
                   type === "adolescent" ? Math.floor(30 + rng() * 40) :
                   type === "etudiant" ? Math.floor(60 + rng() * 30) :
                   Math.floor(40 + rng() * 40);

  // Générer des compétences
  const skills: string[] = [];
  if (profession) {
    skills.push(profession);
    if (rng() > 0.7) skills.push("bricolage");
    if (rng() > 0.7) skills.push("cuisine");
    if (rng() > 0.8) skills.push("jardinage");
  }

  // Générer un historique criminel
  const crimeRecord: CrimeType[] = [];
  if (rng() < 0.05) { // 5% de chance d'avoir un casier judiciaire
    const crimes: CrimeType[] = ["vol", "vandalisme", "aggression"];
    crimeRecord.push(crimes[Math.floor(rng() * crimes.length)]);
  }

  // Générer une routine quotidienne
  const dailyRoutine: DailyActivity[] = [];
  if (profession) {
    // Heures de travail
    const workStart = 8 + Math.floor(rng() * 2);
    const workEnd = workStart + 8 + Math.floor(rng() * 2);
    dailyRoutine.push({
      type: "work",
      startHour: workStart,
      endHour: workEnd,
      location: homeBuilding.id,
    });

    // Heures de sommeil
    dailyRoutine.push({
      type: "sleep",
      startHour: workEnd + 2,
      endHour: workStart - 1,
      location: homeBuilding.id,
    });

    // Repas
    dailyRoutine.push({
      type: "eat",
      startHour: workStart + 4,
      endHour: workStart + 5,
    });

    dailyRoutine.push({
      type: "eat",
      startHour: workEnd,
      endHour: workEnd + 1,
    });
  } else if (type === "etudiant") {
    // Heures de cours
    dailyRoutine.push({
      type: "work", // Études
      startHour: 8,
      endHour: 15,
      location: "ecole",
    });

    // Devoirs
    dailyRoutine.push({
      type: "work",
      startHour: 16,
      endHour: 18,
      location: homeBuilding.id,
    });

    // Sommeil
    dailyRoutine.push({
      type: "sleep",
      startHour: 22,
      endHour: 7,
      location: homeBuilding.id,
    });
  } else if (type === "senior") {
    // Activités légères
    dailyRoutine.push({
      type: "leisure",
      startHour: 9,
      endHour: 12,
    });

    dailyRoutine.push({
      type: "leisure",
      startHour: 14,
      endHour: 17,
    });

    // Sommeil
    dailyRoutine.push({
      type: "sleep",
      startHour: 21,
      endHour: 6,
      location: homeBuilding.id,
    });
  } else {
    // Enfant ou chômeur
    dailyRoutine.push({
      type: "leisure",
      startHour: 9,
      endHour: 17,
    });

    dailyRoutine.push({
      type: "sleep",
      startHour: 20,
      endHour: 8,
      location: homeBuilding.id,
    });
  }

  // Ajouter des activités aléatoires
  if (rng() > 0.5) {
    dailyRoutine.push({
      type: "shop",
      startHour: Math.floor(rng() * 16) + 8,
      endHour: Math.floor(rng() * 2) + 1,
    });
  }

  if (rng() > 0.7) {
    dailyRoutine.push({
      type: "socialize",
      startHour: Math.floor(rng() * 8) + 16,
      endHour: Math.floor(rng() * 3) + 1,
    });
  }

  // Générer une position initiale
  const position = {
    x: homeBuilding.x + (rng() - 0.5) * homeBuilding.width,
    y: homeBuilding.y,
    z: homeBuilding.z + (rng() - 0.5) * homeBuilding.depth,
  };

  // Créer le citoyen
  const citizen: Citizen = {
    id: `${villageName}_citizen_${seed}_${Date.now()}`,
    name: `${firstNames[Math.floor(rng() * firstNames.length)]} ${lastName}`,
    age,
    type,
    profession,
    buildingId: homeBuilding.id,
    homeBuildingId: homeBuilding.id,
    needs,
    mood,
    health: Math.min(100, 70 + rng() * 20 - age * 0.2),
    wealth,
    salary,
    education,
    skills,
    relationships: {},
    reputation: Math.min(100, 50 + rng() * 30 - crimeRecord.length * 20),
    crimeRecord,
    dailyRoutine,
    currentActivity: "sleep",
    position,
    speed: 0.05 + rng() * 0.05,
    isActive: true,
  };

  return citizen;
}

/**
 * Génère un événement aléatoire pour un bâtiment.
 * @param building - Bâtiment concerné.
 * @param seed - Graine aléatoire.
 * @returns Événement généré.
 */
function generateRandomBuildingEvent(
  building: CityBuilding,
  seed: number
): BuildingEvent {
  const rng = makeRng(seed * 10000 + building.id.length);
  const types: BuildingEvent["type"][] = ["fire", "flood", "collapse", "renovation", "celebration"];

  // Filtrer les types d'événements selon le type de bâtiment
  const possibleTypes = types.filter((type) => {
    if (type === "fire" && building.hasSprinklers) return rng() > 0.7;
    if (type === "flood" && building.type === "usine") return true;
    if (type === "collapse" && building.condition === "neuf") return false;
    if (type === "renovation" && building.condition === "neuf") return false;
    if (type === "celebration" && building.category !== "residentiel") return true;
    return true;
  });

  const type = possibleTypes[Math.floor(rng() * possibleTypes.length)];

  // Générer la gravité
  let severity: EventSeverity = "mineur";
  if (rng() > 0.7) severity = "modere";
  if (rng() > 0.9) severity = "majeur";
  if (rng() > 0.98) severity = "catastrophique";

  // Générer la durée
  let duration = 1;
  if (type === "renovation") duration = 7 + Math.floor(rng() * 14); // 1-3 semaines
  if (type === "fire" || type === "flood") duration = 1 + Math.floor(rng() * 3); // 1-4 jours
  if (type === "celebration") duration = 1 + Math.floor(rng() * 2); // 1-3 jours
  if (type === "collapse") duration = 14 + Math.floor(rng() * 30); // 2-6 semaines

  // Générer les effets
  const effects: BuildingEvent["effects"] = {
    durabilityChange: 0,
    reputationChange: 0,
    valueChange: 0,
    cost: 0,
    requiredResources: {},
  };

  switch (type) {
    case "fire":
      effects.durabilityChange = - (20 + severity === "mineur" ? 10 :
                                    severity === "modere" ? 25 :
                                    severity === "majeur" ? 50 : 80);
      effects.reputationChange = - (5 + severity === "mineur" ? 2 :
                                     severity === "modere" ? 5 :
                                     severity === "majeur" ? 10 : 20);
      effects.valueChange = - (10 + severity === "mineur" ? 5 :
                               severity === "modere" ? 15 :
                               severity === "majeur" ? 30 : 50);
      effects.cost = Math.floor(building.value * (severity === "mineur" ? 0.05 :
                                   severity === "modere" ? 0.15 :
                                   severity === "majeur" ? 0.3 : 0.5));
      effects.requiredResources = { eau: 100, electricite: 50 };
      break;

    case "flood":
      effects.durabilityChange = - (10 + severity === "mineur" ? 5 :
                                    severity === "modere" ? 15 :
                                    severity === "majeur" ? 30 : 50);
      effects.reputationChange = - (3 + severity === "mineur" ? 1 :
                                     severity === "modere" ? 3 :
                                     severity === "majeur" ? 6 : 10);
      effects.valueChange = - (5 + severity === "mineur" ? 2 :
                               severity === "modere" ? 8 :
                               severity === "majeur" ? 15 : 25);
      effects.cost = Math.floor(building.value * (severity === "mineur" ? 0.03 :
                                   severity === "modere" ? 0.1 :
                                   severity === "majeur" ? 0.2 : 0.4));
      effects.requiredResources = { eau: 200, main_d_oeuvre: 10 };
      break;

    case "collapse":
      effects.durabilityChange = -100; // Bâtiment détruit
      effects.reputationChange = - (15 + severity === "mineur" ? 5 :
                                     severity === "modere" ? 10 :
                                     severity === "majeur" ? 20 : 30);
      effects.valueChange = -100; // Perte totale de valeur
      effects.cost = Math.floor(building.value * (severity === "mineur" ? 0.5 :
                                   severity === "modere" ? 0.7 :
                                   severity === "majeur" ? 0.9 : 1.2));
      effects.requiredResources = { materials: 500, main_d_oeuvre: 50 };
      break;

    case "renovation":
      effects.durabilityChange = 30 + severity === "mineur" ? 10 :
                                  severity === "modere" ? 20 :
                                  severity === "majeur" ? 30 : 50;
      effects.reputationChange = 5 + severity === "mineur" ? 2 :
                                  severity === "modere" ? 5 :
                                  severity === "majeur" ? 10 : 15;
      effects.valueChange = 15 + severity === "mineur" ? 5 :
                             severity === "modere" ? 10 :
                             severity === "majeur" ? 20 : 30;
      effects.cost = Math.floor(building.value * (severity === "mineur" ? 0.1 :
                                   severity === "modere" ? 0.2 :
                                   severity === "majeur" ? 0.35 : 0.5));
      effects.requiredResources = { materials: 100, main_d_oeuvre: 5 };
      break;

    case "celebration":
      effects.reputationChange = 5 + severity === "mineur" ? 2 :
                                  severity === "modere" ? 5 :
                                  severity === "majeur" ? 10 : 15;
      effects.valueChange = 0; // Pas d'effet sur la valeur
      effects.cost = Math.floor(building.value * (severity === "mineur" ? 0.01 :
                                   severity === "modere" ? 0.02 :
                                   severity === "majeur" ? 0.05 : 0.1));
      break;
  }

  // Créer l'événement
  const event: BuildingEvent = {
    id: `${building.id}_event_${type}_${Date.now()}`,
    type,
    severity,
    startDay: currentDay,
    duration,
    description: getBuildingEventDescription(type, severity, building),
    effects,
    resolved: false,
  };

  return event;
}

/**
 * Récupère la description d'un événement de bâtiment.
 * @param type - Type de l'événement.
 * @param severity - Gravité.
 * @param building - Bâtiment concerné.
 * @returns Description de l'événement.
 */
function getBuildingEventDescription(
  type: BuildingEvent["type"],
  severity: EventSeverity,
  building: CityBuilding
): string {
  const severityFr = {
    mineur: "mineur",
    modere: "modéré",
    majeur: "majeur",
    catastrophique: "catastrophique",
  };

  switch (type) {
    case "fire":
      return `Incendie ${severityFr[severity]} dans le ${building.type} ${building.name || building.id}.`;
    case "flood":
      return `Inondation ${severityFr[severity]} dans le ${building.type} ${building.name || building.id}.`;
    case "collapse":
      return `Effondrement ${severityFr[severity]} du ${building.type} ${building.name || building.id}.`;
    case "renovation":
      return `Rénovation ${severityFr[severity]} du ${building.type} ${building.name || building.id}.`;
    case "celebration":
      return `Célébration ${severityFr[severity]} dans le ${building.type} ${building.name || building.id}.`;
    default:
      return `Événement ${severityFr[severity]} dans le ${building.type} ${building.name || building.id}.`;
  }
}

/**
 * Génère un événement aléatoire pour la ville.
 * @param villageName - Nom du village.
 * @param seed - Graine aléatoire.
 * @param buildings - Liste des bâtiments.
 * @returns Événement généré.
 */
function generateRandomCityEvent(
  villageName: string,
  seed: number,
  buildings: CityBuilding[]
): CityEvent {
  const rng = makeRng(seed * 100000 + villageName.length);
  const types: CityEventType[] = [
    "festival", "marche", "feux_artifice", "tempete",
    "incendie", "accident", "manifestation", "election"
  ];

  const type = types[Math.floor(rng() * types.length)];

  // Générer la gravité
  let severity: EventSeverity = "mineur";
  if (rng() > 0.6) severity = "modere";
  if (rng() > 0.85) severity = "majeur";
  if (rng() > 0.98) severity = "catastrophique";

  // Générer la durée
  let duration = 1;
  if (type === "festival" || type === "marche" || type === "feux_artifice") {
    duration = 1 + Math.floor(rng() * 3); // 1-4 jours
  } else if (type === "tempete") {
    duration = 1 + Math.floor(rng() * 2); // 1-3 jours
  } else if (type === "incendie" || type === "accident") {
    duration = 1 + Math.floor(rng() * 1); // 1-2 jours
  } else if (type === "manifestation" || type === "election") {
    duration = 3 + Math.floor(rng() * 4); // 3-7 jours
  }

  // Sélectionner des bâtiments affectés
  const affectedBuildings: string[] = [];
  if (type === "tempete" || type === "incendie" || type === "accident") {
    // Sélectionner 1 à 5 bâtiments aléatoires
    const count = 1 + Math.floor(rng() * 4);
    for (let i = 0; i < count && i < buildings.length; i++) {
      affectedBuildings.push(buildings[Math.floor(rng() * buildings.length)].id);
    }
  }

  // Générer les effets
  const effects: CityEvent["effects"] = {
    reputationChange: 0,
    satisfactionChange: 0,
    crimeRateChange: 0,
    pollutionChange: 0,
    wealthChange: 0,
    populationChange: 0,
  };

  switch (type) {
    case "festival":
      effects.reputationChange = 5 + severity === "mineur" ? 2 :
                                  severity === "modere" ? 5 :
                                  severity === "majeur" ? 10 : 15;
      effects.satisfactionChange = 10 + severity === "mineur" ? 3 :
                                     severity === "modere" ? 7 :
                                     severity === "majeur" ? 12 : 18;
      effects.wealthChange = Math.floor(buildings.length * 1000 * (severity === "mineur" ? 0.5 :
                                        severity === "modere" ? 1 :
                                        severity === "majeur" ? 1.5 : 2));
      break;

    case "marche":
      effects.reputationChange = 3 + severity === "mineur" ? 1 :
                                  severity === "modere" ? 3 :
                                  severity === "majeur" ? 6 : 9;
      effects.satisfactionChange = 5 + severity === "mineur" ? 2 :
                                     severity === "modere" ? 4 :
                                     severity === "majeur" ? 7 : 10;
      effects.wealthChange = Math.floor(buildings.length * 500 * (severity === "mineur" ? 0.5 :
                                        severity === "modere" ? 1 :
                                        severity === "majeur" ? 1.5 : 2));
      break;

    case "feux_artifice":
      effects.reputationChange = 2 + severity === "mineur" ? 1 :
                                  severity === "modere" ? 2 :
                                  severity === "majeur" ? 4 : 6;
      effects.satisfactionChange = 8 + severity === "mineur" ? 2 :
                                     severity === "modere" ? 4 :
                                     severity === "majeur" ? 7 : 10;
      effects.pollutionChange = 2 + severity === "mineur" ? 0 :
                                  severity === "modere" ? 1 :
                                  severity === "majeur" ? 2 : 3;
      break;

    case "tempete":
      effects.reputationChange = - (3 + severity === "mineur" ? 1 :
                                      severity === "modere" ? 3 :
                                      severity === "majeur" ? 6 : 10);
      effects.satisfactionChange = - (5 + severity === "mineur" ? 2 :
                                         severity === "modere" ? 5 :
                                         severity === "majeur" ? 8 : 12);
      effects.pollutionChange = 5 + severity === "mineur" ? 1 :
                                severity === "modere" ? 3 :
                                severity === "majeur" ? 6 : 10;
      effects.wealthChange = -Math.floor(buildings.length * 500 * (severity === "mineur" ? 0.3 :
                                         severity === "modere" ? 0.7 :
                                         severity === "majeur" ? 1.2 : 2));
      break;

    case "incendie":
      effects.reputationChange = - (8 + severity === "mineur" ? 3 :
                                      severity === "modere" ? 8 :
                                      severity === "majeur" ? 15 : 25);
      effects.satisfactionChange = - (10 + severity === "mineur" ? 4 :
                                         severity === "modere" ? 10 :
                                         severity === "majeur" ? 18 : 28);
      effects.pollutionChange = 10 + severity === "mineur" ? 2 :
                                 severity === "modere" ? 5 :
                                 severity === "majeur" ? 10 : 15;
      effects.wealthChange = -Math.floor(affectedBuildings.length * 5000 * (severity === "mineur" ? 0.3 :
                                         severity === "modere" ? 0.7 :
                                         severity === "majeur" ? 1.2 : 2));
      break;

    case "accident":
      effects.reputationChange = - (5 + severity === "mineur" ? 2 :
                                      severity === "modere" ? 5 :
                                      severity === "majeur" ? 10 : 15);
      effects.satisfactionChange = - (8 + severity === "mineur" ? 3 :
                                         severity === "modere" ? 8 :
                                         severity === "majeur" ? 15 : 22);
      effects.crimeRateChange = 2 + severity === "mineur" ? 0 :
                                 severity === "modere" ? 2 :
                                 severity === "majeur" ? 5 : 8;
      effects.wealthChange = -Math.floor(affectedBuildings.length * 2000 * (severity === "mineur" ? 0.2 :
                                         severity === "modere" ? 0.5 :
                                         severity === "majeur" ? 1 : 1.8));
      break;

    case "manifestation":
      effects.reputationChange = (rng() > 0.5 ? 1 : -1) * (3 + severity === "mineur" ? 1 :
                                       severity === "modere" ? 3 :
                                       severity === "majeur" ? 6 : 10);
      effects.satisfactionChange = (rng() > 0.5 ? 1 : -1) * (5 + severity === "mineur" ? 2 :
                                          severity === "modere" ? 5 :
                                          severity === "majeur" ? 10 : 15);
      effects.crimeRateChange = 3 + severity === "mineur" ? 1 :
                                 severity === "modere" ? 3 :
                                 severity === "majeur" ? 6 : 10;
      break;

    case "election":
      effects.reputationChange = 0; // Pas d'effet direct
      effects.satisfactionChange = 2 + severity === "mineur" ? 0 :
                                     severity === "modere" ? 2 :
                                     severity === "majeur" ? 4 : 6;
      effects.crimeRateChange = - (1 + severity === "mineur" ? 0 :
                                      severity === "modere" ? 1 :
                                      severity === "majeur" ? 2 : 3);
      break;
  }

  // Créer l'événement
  const event: CityEvent = {
    id: `${villageName}_event_${type}_${Date.now()}`,
    type,
    severity,
    startDay: currentDay,
    duration,
    description: getCityEventDescription(type, severity, villageName),
    effects,
    affectedBuildings,
    affectedDistricts: [],
    resolved: false,
  };

  return event;
}

/**
 * Récupère la description d'un événement de ville.
 * @param type - Type de l'événement.
 * @param severity - Gravité.
 * @param villageName - Nom du village.
 * @returns Description de l'événement.
 */
function getCityEventDescription(
  type: CityEventType,
  severity: EventSeverity,
  villageName: string
): string {
  const severityFr = {
    mineur: "mineur",
    modere: "modéré",
    majeur: "majeur",
    catastrophique: "catastrophique",
  };

  switch (type) {
    case "festival":
      return `Festival ${severityFr[severity]} à ${villageName}.`;
    case "marche":
      return `Marché ${severityFr[severity]} à ${villageName}.`;
    case "feux_artifice":
      return `Feux d'artifice ${severityFr[severity]} à ${villageName}.`;
    case "tempete":
      return `Tempête ${severityFr[severity]} à ${villageName}.`;
    case "incendie":
      return `Incendie ${severityFr[severity]} à ${villageName}.`;
    case "accident":
      return `Accident ${severityFr[severity]} à ${villageName}.`;
    case "manifestation":
      return `Manifestation ${severityFr[severity]} à ${villageName}.`;
    case "election":
      return `Élections ${severityFr[severity]} à ${villageName}.`;
    default:
      return `Événement ${severityFr[severity]} à ${villageName}.`;
  }
}

/**
 * Génère une quête pour la ville.
 * @param type - Type de la quête.
 * @param villageName - Nom du village.
 * @param count - Nombre requis.
 * @param target - Cible de la quête.
 * @returns Quête générée.
 */
function generateCityQuest(
  type: string,
  villageName: string,
  count: number,
  target?: BuildingType | string
): BuildingQuest {
  const quests = {
    build_houses: {
      title: `Construire ${count} maisons`,
      description: `Construisez ${count} maisons pour répondre à la demande de logement à ${villageName}.`,
      objectiveType: "build" as const,
      reward: {
        money: count * 5000,
        reputation: count * 2,
        unlocks: ["duplex"],
      },
    },
    upgrade_buildings: {
      title: `Améliorer ${count} bâtiments`,
      description: `Améliorez ${count} bâtiments pour augmenter la réputation de ${villageName}.`,
      objectiveType: "upgrade" as const,
      reward: {
        money: count * 3000,
        reputation: count * 3,
      },
    },
    reduce_crime: {
      title: `Réduire le crime de ${count}%`,
      description: `Réduisez le taux de criminalité de ${count}% à ${villageName}.`,
      objectiveType: "reduce_crime" as const,
      reward: {
        money: count * 10000,
        reputation: count * 5,
      },
    },
    repair_buildings: {
      title: `Réparer ${count} bâtiments`,
      description: `Réparez ${count} bâtiments endommagés à ${villageName}.`,
      objectiveType: "repair" as const,
      reward: {
        money: count * 2000,
        reputation: count * 2,
      },
    },
  };

  const questData = quests[type as keyof typeof quests];
  if (!questData) {
    return {
      id: `${villageName}_quest_${type}_${Date.now()}`,
      title: "Quête inconnue",
      description: "Description inconnue.",
      objective: { type: "build", count },
      progress: 0,
      reward: { money: 1000 },
    };
  }

  return {
    id: `${villageName}_quest_${type}_${Date.now()}`,
    title: questData.title,
    description: questData.description,
    objective: {
      type: questData.objectiveType,
      target: target || "",
      count,
    },
    progress: 0,
    reward: questData.reward,
  };
}

// ============================================================================
// 🎯 FONCTIONS UTILITAIRES POUR LE RP
// ============================================================================

/**
 * Définit la saison actuelle.
 * @param season - Nouvelle saison.
 */
export function setCurrentSeason(season: Season): void {
  currentSeason = season;
}

/**
 * Définit le jour actuel.
 * @param day - Nouveau jour.
 */
export function setCurrentDay(day: number): void {
  currentDay = day;
}

/**
 * Définit l'heure actuelle.
 * @param time - Nouvelle heure (0-23).
 */
export function setCurrentTime(time: number): void {
  currentTime = time;
}

/**
 * Met à jour la ville pour une nouvelle journée.
 * @param builtCity - Ville construite.
 */
export function updateCityForNewDay(builtCity: BuiltCity): void {
  currentDay++;

  // Réinitialiser les activités des citoyens
  for (const citizen of builtCity.citizens) {
    citizen.currentActivity = undefined;
  }

  // Mettre à jour les événements des bâtiments
  for (const building of builtCity.buildings) {
    // Vérifier les événements en cours
    for (const event of building.events) {
      if (event.startDay + event.duration <= currentDay) {
        // Événement terminé
        if (!event.resolved) {
          // Appliquer les effets de l'événement
          building.durability = Math.max(
            0,
            Math.min(100, building.durability + event.effects.durabilityChange)
          );
          builtCity.stats.reputation += event.effects.reputationChange;
          building.value = Math.max(
            0,
            building.value + event.effects.valueChange
          );

          // Si le bâtiment est détruit, réduire la population
          if (building.durability <= 0 && building.category === "residentiel") {
            const residentsToRemove = Math.floor(building.currentOccupancy * 0.5);
            building.currentOccupancy = Math.max(0, building.currentOccupancy - residentsToRemove);
            builtCity.stats.population -= residentsToRemove;
            builtCity.stats.housingDemand -= residentsToRemove;
          }
        }

        // Supprimer l'événement
        building.events = building.events.filter((e) => e.id !== event.id);
      }
    }

    // Ajouter un nouvel événement aléatoirement
    if (Math.random() < 0.05) { // 5% de chance par bâtiment
      building.events.push(generateRandomBuildingEvent(building, Math.random()));
    }

    // Réduire la durabilité avec le temps
    if (building.condition !== "neuf" && Math.random() < 0.1) {
      building.durability = Math.max(0, building.durability - 0.1);
      if (building.durability < 30) {
        building.condition = "abandonne";
      } else if (building.durability < 60) {
        building.condition = "use";
      }
    }

    // Augmenter l'âge du bâtiment
    building.age++;
  }

  // Mettre à jour les événements de la ville
  for (const event of builtCity.events) {
    if (event.startDay + event.duration <= currentDay) {
      // Événement terminé
      if (!event.resolved) {
        // Appliquer les effets de l'événement
        builtCity.stats.reputation += event.effects.reputationChange;
        builtCity.stats.satisfaction += event.effects.satisfactionChange;
        builtCity.stats.crimeRate += event.effects.crimeRateChange;
        builtCity.stats.pollution += event.effects.pollutionChange;
        builtCity.stats.wealth += event.effects.wealthChange;
        builtCity.stats.population += event.effects.populationChange;
      }

      // Supprimer l'événement
      builtCity.events = builtCity.events.filter((e) => e.id !== event.id);
    }
  }

  // Ajouter un nouvel événement de ville aléatoirement
  if (Math.random() < 0.3) { // 30% de chance par jour
    builtCity.events.push(generateRandomCityEvent(
      builtCity.group.name.replace("ville_", ""),
      Math.random(),
      builtCity.buildings
    ));
  }

  // Mettre à jour les statistiques
  builtCity.stats.reputation = Math.max(0, Math.min(100, builtCity.stats.reputation));
  builtCity.stats.satisfaction = Math.max(0, Math.min(100, builtCity.stats.satisfaction));
  builtCity.stats.crimeRate = Math.max(0, Math.min(100, builtCity.stats.crimeRate));
  builtCity.stats.pollution = Math.max(0, Math.min(100, builtCity.stats.pollution));
  builtCity.stats.wealth = Math.max(0, builtCity.stats.wealth);

  // Calculer les revenus fiscaux
  let taxRevenue = 0;
  for (const building of builtCity.buildings) {
    taxRevenue += Math.floor(building.taxValue * 0.001); // 0.1% de la valeur imposable
  }
  builtCity.stats.taxRevenue = taxRevenue;

  // Calculer les coûts de maintenance
  let maintenanceCost = 0;
  for (const building of builtCity.buildings) {
    maintenanceCost += building.maintenanceCost;
  }
  builtCity.stats.maintenanceCost = maintenanceCost;

  // Mettre à jour l'offre et la demande de logement
  let housingSupply = 0;
  let housingDemand = 0;
  for (const building of builtCity.buildings) {
    if (building.category === "residentiel") {
      housingSupply += building.capacity;
      housingDemand += building.currentOccupancy;
    }
  }
  builtCity.stats.housingSupply = housingSupply;
  builtCity.stats.housingDemand = housingDemand;

  // Mettre à jour l'offre et la demande d'emploi
  let jobSupply = 0;
  let jobDemand = 0;
  for (const building of builtCity.buildings) {
    if (building.category === "commercial" || building.category === "industriel") {
      jobSupply += building.capacity;
      jobDemand += building.currentOccupancy;
    }
  }
  builtCity.stats.jobSupply = jobSupply;
  builtCity.stats.jobDemand = jobDemand;
}

/**
 * Met à jour les citoyens pour une nouvelle heure.
 * @param builtCity - Ville construite.
 */
export function updateCitizensForNewHour(builtCity: BuiltCity): void {
  const hour = currentTime;

  for (const citizen of builtCity.citizens) {
    // Trouver le bâtiment où habite le citoyen
    const homeBuilding = builtCity.buildings.find(
      (b) => b.id === citizen.homeBuildingId
    );

    if (!homeBuilding) continue;

    // Trouver le bâtiment où travaille le citoyen
    const workBuilding = builtCity.buildings.find(
      (b) => b.id === citizen.workBuildingId
    );

    // Mettre à jour l'activité actuelle
    let newActivity: string | undefined;

    for (const activity of citizen.dailyRoutine) {
      if (hour >= activity.startHour && hour < activity.endHour) {
        newActivity = activity.type;
        break;
      }
    }

    // Si aucune activité n'est trouvée, le citoyen est chez lui
    if (!newActivity) {
      newActivity = "sleep";
    }

    // Mettre à jour l'activité
    citizen.currentActivity = newActivity;

    // Mettre à jour la position selon l'activité
    if (newActivity === "sleep" || newActivity === "work" && !workBuilding) {
      // À la maison
      citizen.position = {
        x: homeBuilding.x + (Math.random() - 0.5) * homeBuilding.width * 0.8,
        y: homeBuilding.y,
        z: homeBuilding.z + (Math.random() - 0.5) * homeBuilding.depth * 0.8,
      };
    } else if (newActivity === "work" && workBuilding) {
      // Au travail
      citizen.position = {
        x: workBuilding.x + (Math.random() - 0.5) * workBuilding.width * 0.8,
        y: workBuilding.y,
        z: workBuilding.z + (Math.random() - 0.5) * workBuilding.depth * 0.8,
      };
    } else {
      // Activité extérieure (loisirs, courses, etc.)
      // Trouver un bâtiment aléatoire dans la ville
      const randomBuilding = builtCity.buildings[Math.floor(Math.random() * builtCity.buildings.length)];
      citizen.position = {
        x: randomBuilding.x + (Math.random() - 0.5) * randomBuilding.width * 1.5,
        y: randomBuilding.y,
        z: randomBuilding.z + (Math.random() - 0.5) * randomBuilding.depth * 1.5,
      };
    }

    // Mettre à jour les besoins selon l'activité
    if (newActivity === "sleep") {
      citizen.needs.logement = Math.min(100, citizen.needs.logement + 5);
      citizen.needs.sante = Math.min(100, citizen.needs.sante + 3);
    } else if (newActivity === "work") {
      citizen.needs.travail = Math.min(100, citizen.needs.travail + 10);
      citizen.needs.nourriture = Math.max(0, citizen.needs.nourriture - 5);
      citizen.needs.loisirs = Math.max(0, citizen.needs.loisirs - 3);
      // Gagner de l'argent
      if (citizen.salary) {
        citizen.wealth += citizen.salary / 24; // Salaire horaire (24h/jour)
      }
    } else if (newActivity === "eat") {
      citizen.needs.nourriture = Math.min(100, citizen.needs.nourriture + 15);
      // Dépenser de l'argent
      citizen.wealth = Math.max(0, citizen.wealth - 5);
    } else if (newActivity === "leisure") {
      citizen.needs.loisirs = Math.min(100, citizen.needs.loisirs + 10);
      citizen.needs.sante = Math.min(100, citizen.needs.sante + 2);
      // Dépenser de l'argent
      citizen.wealth = Math.max(0, citizen.wealth - 3);
    } else if (newActivity === "shop") {
      citizen.needs.nourriture = Math.min(100, citizen.needs.nourriture + 5);
      citizen.needs.loisirs = Math.min(100, citizen.needs.loisirs + 3);
      // Dépenser de l'argent
      citizen.wealth = Math.max(0, citizen.wealth - 10);
    }

    // Mettre à jour le mood selon les besoins
    const avgNeed = Object.values(citizen.needs).reduce((a, b) => a + b, 0) /
                  Object.keys(citizen.needs).length;
    if (avgNeed > 80) citizen.mood = "heureux";
    else if (avgNeed > 60) citizen.mood = "content";
    else if (avgNeed < 30) citizen.mood = "mécontent";
    else if (avgNeed < 10) citizen.mood = "fâché";
    else citizen.mood = "neutre";
  }

  // Mettre à jour la satisfaction moyenne
  let totalSatisfaction = 0;
  for (const citizen of builtCity.citizens) {
    totalSatisfaction += Object.values(citizen.needs).reduce((a, b) => a + b, 0) /
                       Object.keys(citizen.needs).length;
  }
  builtCity.stats.satisfaction = Math.min(
    100,
    Math.max(0, totalSatisfaction / Math.max(1, builtCity.citizens.length))
  );
}

/**
 * Répare un bâtiment.
 * @param building - Bâtiment à réparer.
 * @param resources - Ressources disponibles.
 * @returns `true` si la réparation a réussi.
 */
export function repairBuilding(building: CityBuilding, resources: Record<string, number>): boolean {
  // Vérifier si le bâtiment a besoin de réparation
  if (building.condition === "neuf" || building.durability >= 80) {
    return false;
  }

  // Calculer le coût de réparation
  const repairCost = Math.floor(
    building.value * 0.1 * (1 - building.durability / 100)
  );

  // Vérifier si les ressources sont suffisantes
  if (resources.money < repairCost) {
    return false;
  }

  // Effectuer la réparation
  building.durability = Math.min(100, building.durability + 30);
  building.condition = building.durability >= 80 ? "bon_etat" :
                      building.durability >= 50 ? "use" : "abandonne";

  // Débiter les ressources
  resources.money -= repairCost;

  // Résoudre les événements de type "fire" ou "flood" si présents
  building.events = building.events.filter((event) => {
    if (event.type === "fire" || event.type === "flood") {
      return false; // Supprimer l'événement
    }
    return true;
  });

  return true;
}

/**
 * Améliore un bâtiment.
 * @param building - Bâtiment à améliorer.
 * @param resources - Ressources disponibles.
 * @returns `true` si l'amélioration a réussi.
 */
export function upgradeBuilding(building: CityBuilding, resources: Record<string, number>): boolean {
  // Vérifier si le bâtiment peut être amélioré
  if (building.quality >= 5) {
    return false;
  }

  // Calculer le coût d'amélioration
  const upgradeCost = Math.floor(building.value * 0.3);

  // Vérifier si les ressources sont suffisantes
  if (resources.money < upgradeCost) {
    return false;
  }

  // Effectuer l'amélioration
  building.quality = Math.min(5, building.quality + 1) as QualityLevel;
  building.value = Math.floor(building.value * 1.2);
  building.buyCost = Math.floor(building.buyCost * 1.2);
  building.rentCost = Math.floor(building.rentCost * 1.2);
  building.maintenanceCost = Math.floor(building.maintenanceCost * 1.1);
  building.reputationImpact = Math.floor(building.reputationImpact * 1.1);
  building.capacity = Math.floor(building.capacity * 1.05);
  building.durability = Math.min(100, building.durability + 10);

  // Débiter les ressources
  resources.money -= upgradeCost;

  return true;
}

/**
 * Achète un bâtiment.
 * @param building - Bâtiment à acheter.
 * @param buyer - Acheteur (ID du citoyen ou joueur).
 * @param resources - Ressources disponibles.
 * @returns `true` si l'achat a réussi.
 */
export function buyBuilding(
  building: CityBuilding,
  buyer: string,
  resources: Record<string, number>
): boolean {
  // Vérifier si le bâtiment est déjà acheté
  if (building.owner) {
    return false;
  }

  // Vérifier si les ressources sont suffisantes
  if (resources.money < building.buyCost) {
    return false;
  }

  // Effectuer l'achat
  building.owner = buyer;
  resources.money -= building.buyCost;

  return true;
}

/**
 * Loue un bâtiment.
 * @param building - Bâtiment à louer.
 * @param tenant - Locataire (ID du citoyen ou joueur).
 * @param resources - Ressources disponibles.
 * @returns `true` si la location a réussi.
 */
export function rentBuilding(
  building: CityBuilding,
  tenant: string,
  resources: Record<string, number>
): boolean {
  // Vérifier si le bâtiment est déjà loué
  if (building.currentOccupancy >= building.capacity) {
    return false;
  }

  // Vérifier si les ressources sont suffisantes
  if (resources.money < building.rentCost) {
    return false;
  }

  // Effectuer la location
  building.currentOccupancy++;
  if (!building.residents) building.residents = [];
  building.residents.push(tenant);

  // Débiter les ressources
  resources.money -= building.rentCost;

  return true;
}

/**
 * Vend un bâtiment.
 * @param building - Bâtiment à vendre.
 * @param seller - Vendeur (ID du citoyen ou joueur).
 * @param resources - Ressources à créditer.
 * @returns `true` si la vente a réussi.
 */
export function sellBuilding(
  building: CityBuilding,
  seller: string,
  resources: Record<string, number>
): boolean {
  // Vérifier si le bâtiment appartient au vendeur
  if (building.owner !== seller) {
    return false;
  }

  // Effectuer la vente
  building.owner = undefined;
  resources.money += Math.floor(building.value * 0.9); // 90% de la valeur

  return true;
}

/**
 * Récupère les bâtiments d'un type spécifique.
 * @param builtCity - Ville construite.
 * @param type - Type de bâtiment.
 * @returns Liste des bâtiments du type spécifié.
 */
export function getBuildingsByType(builtCity: BuiltCity, type: BuildingType): CityBuilding[] {
  return builtCity.buildings.filter((b) => b.type === type);
}

/**
 * Récupère les bâtiments d'une catégorie spécifique.
 * @param builtCity - Ville construite.
 * @param category - Catégorie de bâtiment.
 * @returns Liste des bâtiments de la catégorie spécifiée.
 */
export function getBuildingsByCategory(builtCity: BuiltCity, category: BuildingCategory): CityBuilding[] {
  return builtCity.buildings.filter((b) => b.category === category);
}

/**
 * Récupère les bâtiments selon leur condition.
 * @param builtCity - Ville construite.
 * @param condition - Condition du bâtiment.
 * @returns Liste des bâtiments avec la condition spécifiée.
 */
export function getBuildingsByCondition(builtCity: BuiltCity, condition: BuildingCondition): CityBuilding[] {
  return builtCity.buildings.filter((b) => b.condition === condition);
}

/**
 * Récupère les bâtiments selon leur niveau de qualité.
 * @param builtCity - Ville construite.
 * @param minQuality - Qualité minimale.
 * @param maxQuality - Qualité maximale.
 * @returns Liste des bâtiments avec la qualité spécifiée.
 */
export function getBuildingsByQuality(
  builtCity: BuiltCity,
  minQuality: QualityLevel = 1,
  maxQuality: QualityLevel = 5
): CityBuilding[] {
  return builtCity.buildings.filter(
    (b) => b.quality >= minQuality && b.quality <= maxQuality
  );
}

/**
 * Récupère les citoyens selon leur type.
 * @param builtCity - Ville construite.
 * @param type - Type de citoyen.
 * @returns Liste des citoyens du type spécifié.
 */
export function getCitizensByType(builtCity: BuiltCity, type: CitizenType): Citizen[] {
  return builtCity.citizens.filter((c) => c.type === type);
}

/**
 * Récupère les citoyens selon leur profession.
 * @param builtCity - Ville construite.
 * @param profession - Profession.
 * @returns Liste des citoyens avec la profession spécifiée.
 */
export function getCitizensByProfession(builtCity: BuiltCity, profession: Profession): Citizen[] {
  return builtCity.citizens.filter((c) => c.profession === profession);
}

/**
 * Récupère les citoyens selon leur mood.
 * @param builtCity - Ville construite.
 * @param mood - Mood du citoyen.
 * @returns Liste des citoyens avec le mood spécifié.
 */
export function getCitizensByMood(builtCity: BuiltCity, mood: Citizen["mood"]): Citizen[] {
  return builtCity.citizens.filter((c) => c.mood === mood);
}

/**
 * Récupère les quartiers selon leur type.
 * @param builtCity - Ville construite.
 * @param type - Type de quartier.
 * @returns Liste des quartiers du type spécifié.
 */
export function getDistrictsByType(builtCity: BuiltCity, type: DistrictType): CityDistrict[] {
  return builtCity.districts.filter((d) => d.type === type);
}

/**
 * Récupère les statistiques d'un quartier.
 * @param builtCity - Ville construite.
 * @param districtId - ID du quartier.
 * @returns Quartier trouvé ou `undefined`.
 */
export function getDistrictById(builtCity: BuiltCity, districtId: string): CityDistrict | undefined {
  return builtCity.districts.find((d) => d.id === districtId);
}

/**
 * Récupère un bâtiment par son ID.
 * @param builtCity - Ville construite.
 * @param buildingId - ID du bâtiment.
 * @returns Bâtiment trouvé ou `undefined`.
 */
export function getBuildingById(builtCity: BuiltCity, buildingId: string): CityBuilding | undefined {
  return builtCity.buildings.find((b) => b.id === buildingId);
}

/**
 * Récupère un citoyen par son ID.
 * @param builtCity - Ville construite.
 * @param citizenId - ID du citoyen.
 * @returns Citoyen trouvé ou `undefined`.
 */
export function getCitizenById(builtCity: BuiltCity, citizenId: string): Citizen | undefined {
  return builtCity.citizens.find((c) => c.id === citizenId);
}

/**
 * Récupère les événements d'un bâtiment.
 * @param builtCity - Ville construite.
 * @param buildingId - ID du bâtiment.
 * @returns Liste des événements du bâtiment.
 */
export function getBuildingEvents(builtCity: BuiltCity, buildingId: string): BuildingEvent[] {
  const building = getBuildingById(builtCity, buildingId);
  return building ? building.events : [];
}

/**
 * Récupère les quêtes d'un bâtiment.
 * @param builtCity - Ville construite.
 * @param buildingId - ID du bâtiment.
 * @returns Liste des quêtes du bâtiment.
 */
export function getBuildingQuests(builtCity: BuiltCity, buildingId: string): BuildingQuest[] {
  const building = getBuildingById(builtCity, buildingId);
  return building ? building.quests : [];
}

/**
 * Ajoute une quête à un bâtiment.
 * @param builtCity - Ville construite.
 * @param buildingId - ID du bâtiment.
 * @param quest - Quête à ajouter.
 */
export function addQuestToBuilding(
  builtCity: BuiltCity,
  buildingId: string,
  quest: BuildingQuest
): void {
  const building = getBuildingById(builtCity, buildingId);
  if (building) {
    building.quests.push(quest);
  }
}

/**
 * Met à jour une quête.
 * @param builtCity - Ville construite.
 * @param buildingId - ID du bâtiment.
 * @param questId - ID de la quête.
 * @param progress - Progression à ajouter.
 */
export function updateQuestProgress(
  builtCity: BuiltCity,
  buildingId: string,
  questId: string,
  progress: number
): void {
  const building = getBuildingById(builtCity, buildingId);
  if (building) {
    const quest = building.quests.find((q) => q.id === questId);
    if (quest) {
      quest.progress += progress;
      if (quest.progress >= (quest.objective.count || 0)) {
        // Quête complétée
        quest.completed = true;
        // Appliquer les récompenses (à implémenter)
      }
    }
  }
}