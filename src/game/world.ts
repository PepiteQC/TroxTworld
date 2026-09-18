import * as THREE from "three";
import {
  buildCabaneSucre,
  buildCasseCroute,
  buildBoutique,
  buildChasseShop,
  buildQuincaillerie,
  buildDepanneur,
  buildSqdc,
  buildEcole,
  buildEglise,
  buildHotelVille,
  buildMaisonCanadienne,
  buildPanneauArret,
  buildPanneauVitesse,
  buildPanneauSortie,
  buildPanneauAutoroute,
  buildGantrySortie,
  buildOverpass,
  buildPickup,
  buildPolice,
  buildSedan,
  buildCamion,
  buildSqPoste,
  buildAtm,
  buildCrimeCorner,
} from "./architecture";
import { buildFirmBuilding, countyFirms, nearestCountyFirm, shopKindForFirm, type CountyFirm, type Firm } from "./business";
import { farmClearings, mountFarms, nearestField, tickFields, buildTracteur, type FieldPlot } from "./farms";
import { mountHerd, nearestStock, tickHerd, type Stock } from "./livestock";
import {
  mountSugarbush,
  nearestBush,
  nearestEvap,
  nearestTap,
  sugarClearings,
  tickSugar,
  type SugarBush,
  type SugarEvap,
  type SugarTap,
} from "./sugar";
import { buildBoiteOutils, buildPelle, buildRateau } from "./tools";
import {
  buildCamping,
  buildCaveEntrance,
  buildEboulis1894,
  buildGorge,
  buildMarmitesDeGeants,
  buildMoulin,
  buildPapeterie,
  buildPlageParc,
  buildPontDeFer,
  buildQuarry,
  buildTrouDuDiable,
  buildMarina,
  buildCemetery,
  buildPark,
} from "./landmarks";
import { LANDMARK_SHOPS, shopNameFor, type ShopSpot } from "./commerce";
import { shopDoorOffset, depHoursLabel } from "./depanneur";
import {
  animateCaisse,
  buildCaissePopulaire,
  caisseHoursLabel,
  caisseNameFor,
  setCaisseNight,
  worldOffset,
} from "./caisse";
import { ATM_SPOTS, CRIME_SPOTS, DEEDS, type AtmSpot, type CrimeSpot, type Deed } from "./rp";
import { attachScenicHeat, scenicHeat } from "./utilities";
import {
  houseMapMarks,
  mountHouses,
  nearestHouse,
  paintHouseLot,
  type HouseLot,
  type HouseState,
} from "./house";
import { corpseProp, countyBodies } from "./corpses";
import { injuredProp, tickInjured, countyInjured } from "./injured";
import { mountStreetFurniture, nearestStreet, tickStreet, type StreetSpot } from "./street";
import { matLib, type QcMat } from "./materials";
import { findLightbar, type LightbarHandle, type LightbarOpts } from "./lightbar";
import { QuebecPoliceSirens } from "./police";
import { setCommerceEnvNight } from "./commerceMats";
import { createSunCsm, disposeCsm, setCsmEnabled, applySun, wireCsmTree } from "./csm";
import { skySnap, type SkySnap } from "./sky";
import { WeatherFx } from "./weatherfx";
import { SnowPlowField } from "./plows";
import { quebecSeasons } from "./seasons";
import type { SolidBox } from "./physics";
import { buildCenterLine, buildIntersectionPad, buildRoadRibbon, buildRoadSidewalks, sampleRoad } from "./roads";
import { buildRoadFurniture } from "./furniture";
import { animatePrison, buildPrisonComplex, type BuiltPrison } from "./prison";
import { makeRng } from "./rng";
import { WildlifeSystem } from "./wildlife";
import { PedSystem } from "./peds";
import { WorldItemField } from "./worlditems";
import { useGameStore } from "./store";
import { parseFogColor, pickTrafficKind, worldConfig } from "./worldconfig";
import { buildCity, type CityDoor, type BuiltCity, type CityBuilding, type Citizen, type CityDistrict, setCurrentDay, setCurrentSeason, setCurrentTime, updateCityForNewDay, updateCitizensForNewHour } from "./city";
import { type SwingDoor } from "./door";
import {
  A40_EXITS,
  A40_Z,
  CITY_GRIDS,
  cityLotLocal,
  citySpecialLots,
  cityToWorld,
  deedOffStreet,
  getTerrainHeight,
  isCityVillage,
  isNearVillage,
  LAKES,
  MAPLE_LEAVES,
  PAPETERIE,
  PRISON,
  pushOffRoad,
  RIVER_Z,
  ROAD_138_Z,
  ROAD_JUNCTIONS,
  ROADS,
  SPAWN,
  SQ_JAIL,
  villageCivicSpot,
  villageHouseLots,
  VILLAGES,
  WORLD,
} from "./worlddata";

// ============================================================================
// ­ƒö╣ TYPES ET INTERFACES RP
// ============================================================================

/** Saison de l'ann├®e. */
export type Season = "hiver" | "printemps" | "ete" | "automne";

/** Type de m├®t├®o. */
export type WeatherType =
  | "clear"
  | "rain"
  | "snow"
  | "fog"
  | "storm"
  | "blizzard"
  | "poudrerie"
  | "verglas"
  | "tempete_neige"
  | "froid_polaire"
  | "pluie_fine"
  | "orage_ete"
  | "nuageux";

/** Type de jour (pour les cycles jour/nuit). */
export type DayPhase = "aube" | "matin" | "midi" | "apres_midi" | "soir" | "nuit" | "minuit";

/** Type d'├®v├®nement mondial. */
export type WorldEventType =
  | "festival"
  | "marche"
  | "feux_artifice"
  | "tempete"
  | "incendie"
  | "accident"
  | "manifestation"
  | "election"
  | "epidemie"
  | "chasse_au_tresor"
  | "courses_de_tracteurs"
  | "fete_des_neiges";

/** Gravit├® d'un ├®v├®nement. */
export type EventSeverity = "mineur" | "modere" | "majeur" | "catastrophique";

/** Type de faction. */
export type FactionType =
  | "citoyens"
  | "police"
  | "pompiers"
  | "medecins"
  | "agriculteurs"
  | "bucherons"
  | "chasseurs"
  | "criminels"
  | "mairie"
  | "journalistes"
  | "touristes";

/** Relation entre factions (-100 ├á 100). */
export type FactionRelation = Record<FactionType, number>;

/** D├®finition d'une faction. */
export interface Faction {
  id: FactionType;
  name: string;
  description: string;
  color: number;
  reputation: number; // R├®putation globale (-100 ├á 100)
  power: number; // Puissance/influence (0-100)
  wealth: number; // Richesse (en $)
  members: string[]; // IDs des membres (citoyens)
  leader?: string; // ID du chef
  headquarters?: string; // ID du b├ótiment QG
  relations: FactionRelation; // Relations avec les autres factions
  quests: WorldQuest[]; // Qu├¬tes associ├®es
}

/** D├®finition d'un ├®v├®nement mondial. */
export interface WorldEvent {
  id: string;
  type: WorldEventType;
  title: string;
  description: string;
  severity: EventSeverity;
  startTime: number; // Heure de d├®but (en jours + fraction pour l'heure)
  duration: number; // Dur├®e en heures
  location?: { x: number; z: number; radius: number }; // Zone affect├®e
  affectedFactions?: FactionType[]; // Factions affect├®es
  effects: {
    reputationChange?: Record<FactionType, number>; // Changements de r├®putation
    satisfactionChange?: number; // Changement de satisfaction globale
    crimeRateChange?: number; // Changement du taux de criminalit├®
    pollutionChange?: number; // Changement de la pollution
    wealthChange?: number; // Changement de la richesse globale
    populationChange?: number; // Changement de population
    weatherOverride?: WeatherType; // Surcharge de la m├®t├®o
    trafficMultiplier?: number; // Multiplicateur de trafic
    pedMultiplier?: number; // Multiplicateur de pi├®tons
  };
  rewards?: {
    money?: number;
    reputation?: Record<FactionType, number>;
    items?: string[];
    unlocks?: string[]; // ├ël├®ments d├®bloqu├®s
  };
  isActive: boolean;
  progress?: number; // Progression (pour les ├®v├®nements avec objectifs)
  objectives?: {
    type: "collect" | "destroy" | "protect" | "visit";
    target: string;
    count: number;
    current: number;
  };
}

/** D├®finition d'une qu├¬te mondiale. */
export interface WorldQuest {
  id: string;
  title: string;
  description: string;
  giver?: string; // ID du PNJ ou faction qui donne la qu├¬te
  giverFaction?: FactionType; // Faction du donneur
  objectives: {
    type: "go_to" | "talk_to" | "collect" | "deliver" | "kill" | "protect" | "build" | "repair" | "buy" | "sell";
    target: string; // ID de la cible (lieu, PNJ, objet)
    count?: number; // Nombre requis
    current?: number; // Progression actuelle
  }[];
  rewards: {
    money?: number;
    experience?: number;
    reputation?: Record<FactionType, number>;
    items?: string[];
    unlocks?: string[]; // ├ël├®ments d├®bloqu├®s
  };
  prerequisites?: {
    quests?: string[]; // Qu├¬tes requises
    reputation?: Record<FactionType, number>; // Niveaux de r├®putation requis
    items?: string[]; // Objets requis
    level?: number; // Niveau du joueur requis
  };
  expiry?: number; // Date d'expiration (en jours)
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

/** ├ëtat du joueur dans le monde. */
export interface PlayerWorldState {
  money: number;
  experience: number;
  level: number;
  reputation: Record<FactionType, number>; // R├®putation avec chaque faction
  skills: Record<string, number>; // Comp├®tences (ex: "conduite", "negociation")
  inventory: Record<string, number>; // Inventaire (ID -> quantit├®)
  equipped: {
    tool?: string; // Outil ├®quip├®
    vehicle?: string; // V├®hicule ├®quip├®
    weapon?: string; // Arme ├®quip├®e
  };
  currentVehicle?: string; // ID du v├®hicule actuel
  ownedBuildings: string[]; // IDs des b├ótiments poss├®d├®
  ownedVehicles: string[]; // IDs des v├®hicules poss├®d├®
  activeQuests: string[]; // IDs des qu├¬tes actives
  completedQuests: string[]; // IDs des qu├¬tes compl├®t├®es
  discoveredAreas: Record<string, boolean>; // Zones d├®couvertes
  playTime: number; // Temps de jeu total (en heures)
  lastSave: number; // Derni├¿re sauvegarde (timestamp)
}

/** ├ëtat global du monde. */
export interface WorldState {
  season: Season;
  currentDay: number; // Jour actuel (0 = premier jour)
  currentTime: number; // Heure actuelle (0-23)
  dayPhase: DayPhase;
  weather: WeatherType;
  temperature: number; // Temp├®rature en ┬░C
  windSpeed: number; // Vitesse du vent en km/h
  windDirection: number; // Direction du vent (0-360┬░)
  fogDensity: number; // Densit├® du brouillard
  fogColor: number; // Couleur du brouillard
  globalReputation: number; // R├®putation globale (0-100)
  globalSatisfaction: number; // Satisfaction globale (0-100)
  crimeRate: number; // Taux de criminalit├® (0-100)
  pollution: number; // Niveau de pollution (0-100)
  wealth: number; // Richesse globale (en $)
  population: number; // Population totale
  taxRate: number; // Taux d'imposition (0-1)
  factions: Record<FactionType, Faction>;
  events: WorldEvent[];
  quests: WorldQuest[];
  player: PlayerWorldState;
  statistics: {
    buildingsConstructed: number;
    buildingsDestroyed: number;
    crimesCommitted: number;
    crimesStopped: number;
    resourcesHarvested: Record<string, number>;
    moneyEarned: number;
    moneySpent: number;
  };
}

/** Type de v├®hicule ├®tendu avec propri├®t├®s RP. */
export type ExtendedTrafficVehicle = {
  mesh: THREE.Group;
  road: (typeof ROADS)[number];
  roadId: string;
  roadLen: number;
  t: number;
  dir: 1 | -1;
  speed: number;
  targetSpeed: number;
  offset: number;
  length: number;
  isPolice: boolean;
  chasing: boolean;
  bars: THREE.Mesh[];
  lightbar: LightbarHandle | null;
  // ­ƒö╣ NOUVELLES PROPRI├ëT├ëS RP
  id: string; // ID unique
  type: "voiture" | "camion" | "pickup" | "tracteur" | "police" | "pompier" | "ambulance" | "depanneuse";
  condition: "neuf" | "bon_etat" | "use" | "abandonne"; // ├ëtat du v├®hicule
  owner?: string; // Propri├®taire (ID du citoyen ou joueur)
  driver?: string; // Conducteur actuel (ID du citoyen)
  fuel: number; // Carburant (0-100)
  maxFuel: number; // Capacit├® du r├®servoir
  fuelConsumption: number; // Consommation par km (L/km)
  durability: number; // Durabilit├® (0-100)
  maxDurability: number; // Durabilit├® maximale
  value: number; // Valeur marchande
  isStolen: boolean; // Vol├® ?
  isLocked: boolean; // Verrouill├® ?
  hasSiren: boolean; // A une sir├¿ne ?
  sirenActive: boolean; // Sir├¿ne activ├®e ?
  hasLights: boolean; // A des gyrophares ?
  lightsActive: boolean; // Gyrophares activ├®s ?
  cargo?: Record<string, number>; // Chargement (ID -> quantit├®)
  maxCargo: number; // Capacit├® de chargement
  passengers: string[]; // Passagers (IDs des citoyens)
  maxPassengers: number; // Capacit├® en passagers
  lastMaintenance: number; // Derni├¿re maintenance (en jours)
  maintenanceCost: number; // Co├╗t de maintenance
  insuranceCost: number; // Co├╗t d'assurance
  licensePlate: string; // Plaque d'immatriculation
  color: number; // Couleur
  year: number; // Ann├®e de fabrication
  model: string; // Mod├¿le
  isEmergency: boolean; // V├®hicule d'urgence ?
  emergencyPriority: number; // Priorit├® (0-10)
};

/** Type de PNJ ├®tendu avec propri├®t├®s RP. */
export interface ExtendedNPC {
  id: string;
  name: string;
  type: "citoyen" | "travailleur" | "touriste" | "criminel" | "policier" | "pompier" | "medecin" | "agriculteur";
  faction?: FactionType; // Faction ├á laquelle il appartient
  age: number;
  gender: "male" | "female";
  profession?: string;
  buildingId?: string; // B├ótiment o├╣ il se trouve
  homeBuildingId?: string; // B├ótiment o├╣ il habite
  workBuildingId?: string; // B├ótiment o├╣ il travaille
  position: { x: number; y: number; z: number };
  targetPosition?: { x: number; z: number };
  mood: "heureux" | "content" | "neutre" | "m├®content" | "f├óch├®" | "apeur├®" | "en_colere";
  health: number; // Sant├® (0-100)
  wealth: number; // Richesse (en $)
  needs: Record<string, number>; // Besoins (ex: nourriture, sommeil)
  schedule: Array<{
    type: "sleep" | "work" | "eat" | "leisure" | "commute" | "shop" | "socialize" | "patrol";
    startHour: number;
    endHour: number;
    location?: string; // ID du b├ótiment ou "ext├®rieur"
    with?: string[]; // IDs des autres PNJ
  }>;
  currentActivity?: string;
  speed: number;
  isActive: boolean;
  relationships: Record<string, number>; // Relations avec d'autres PNJ (-100 ├á 100)
  reputation: Record<FactionType, number>; // R├®putation avec les factions
  skills: Record<string, number>; // Comp├®tences
  inventory: Record<string, number>; // Inventaire
  equipped: {
    tool?: string;
    weapon?: string;
  };
  dialogue?: {
    greetings: string[];
    farewells: string[];
    questions: string[];
    responses: Record<string, string[]>;
  };
  quests?: string[]; // IDs des qu├¬tes disponibles
  isArrested: boolean; // En prison ?
  arrestReason?: string;
  arrestDuration?: number; // Dur├®e de l'arrestation (en heures)
  wantedLevel: number; // Niveau de recherche (0-5 ├®toiles)
  isWanted: boolean;
  lastInteraction: number; // Derni├¿re interaction (en jours)
}

/** Type de feu de camp. */
export interface Campfire {
  id: string;
  x: number;
  z: number;
  yaw: number;
  mesh: THREE.Group;
  isLit: boolean;
  fuel: number; // Carburant restant (0-100)
  maxFuel: number;
  warmthRadius: number; // Rayon de chaleur
  lightRadius: number; // Rayon de lumi├¿re
  lightIntensity: number; // Intensit├® de la lumi├¿re
  smokeParticle?: THREE.Object3D; // Particules de fum├®e
  sound?: string; // Son du feu
  owner?: string; // Propri├®taire
  lastUsed: number; // Derni├¿re utilisation (en jours)
}

/** Type de zone de p├¬che. */
export interface FishingSpot {
  id: string;
  x: number;
  z: number;
  type: "lac" | "riviere" | "etang" | "mer";
  fishTypes: string[]; // Types de poissons disponibles
  fishProbability: number; // Probabilit├® de p├¬cher (0-1)
  minFishSize: number; // Taille minimale des poissons
  maxFishSize: number; // Taille maximale des poissons
  requiredTool?: string; // Outil requis (ex: "canne_a_peche")
  requiredLicense?: boolean; // Permis requis ?
  isActive: boolean; // Zone active ?
  lastFished: number; // Derni├¿re p├¬che (en jours)
  fishStock: number; // Stock de poissons (0-100)
}

/** Type de zone de chasse. */
export interface HuntingZone {
  id: string;
  x: number;
  z: number;
  radius: number;
  animalTypes: string[]; // Types d'animaux disponibles
  huntProbability: number; // Probabilit├® de chasse r├®ussie (0-1)
  requiredTool?: string; // Outil requis (ex: "fusil")
  requiredLicense?: boolean; // Permis requis ?
  isActive: boolean; // Zone active ?
  lastHunted: number; // Derni├¿re chasse (en jours)
  animalStock: number; // Stock d'animaux (0-100)
  season?: Season[]; // Saisons o├╣ la chasse est autoris├®e
}

/** Type de ressource naturelle. */
export interface NaturalResource {
  id: string;
  type: "bois" | "pierre" | "minerai" | "plante" | "animal" | "eau";
  name: string;
  x: number;
  z: number;
  quantity: number; // Quantit├® disponible
  maxQuantity: number; // Quantit├® maximale
  regrowthRate: number; // Taux de r├®g├®n├®ration (par jour)
  requiredTool?: string; // Outil requis pour la r├®colte
  requiredSkill?: string; // Comp├®tence requise
  minSkillLevel?: number; // Niveau minimal de comp├®tence
  lastHarvested: number; // Derni├¿re r├®colte (en jours)
  isExhausted: boolean; // ├ëpuis├® ?
  owner?: string; // Propri├®taire (pour les ressources priv├®es)
}

/** Type de zone de r├®colte. */
export interface HarvestZone {
  id: string;
  x: number;
  z: number;
  radius: number;
  resourceType: string;
  resources: NaturalResource[];
  isActive: boolean;
  lastHarvested: number;
}

/** Type de march├®. */
export interface Market {
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  type: "permanent" | "temporaire" | "march├®_nocturne";
  vendors: Array<{
    id: string;
    name: string;
    type: "nourriture" | "vetements" | "outils" | "artisanat" | "divers";
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      restockRate: number; // Taux de r├®approvisionnement (par jour)
    }>;
    reputation: number; // R├®putation du vendeur (0-100)
    mood: ExtendedNPC["mood"];
    dialogue?: string[];
  }>;
  operatingHours: { open: number; close: number };
  isOpen: boolean;
  popularity: number; // Popularit├® (0-100)
  lastRestock: number; // Dernier r├®approvisionnement (en jours)
}

/** Type de festival. */
export interface Festival {
  id: string;
  name: string;
  description: string;
  type: WorldEventType;
  location: { x: number; z: number; radius: number };
  startTime: number;
  duration: number;
  organizers: string[]; // IDs des organisateurs (PNJ ou factions)
  activities: Array<{
    type: "concert" | "danse" | "jeu" | "concours" | "stand" | "parade";
    name: string;
    description: string;
    startHour: number;
    endHour: number;
    participants: string[]; // IDs des participants
    rewards?: Array<{ type: "money" | "item" | "reputation"; value: any }>;
  }>;
  rewards: Array<{ type: "money" | "item" | "reputation"; value: any }>;
  isActive: boolean;
  attendance: number; // Nombre de participants
  maxAttendance: number; // Capacit├® maximale
}

/** Type de crime. */
export interface Crime {
  id: string;
  type: "vol" | "vandalisme" | "aggression" | "meurtre" | "fraude" | "trafic" | "incendie_criminel";
  severity: EventSeverity;
  location: { x: number; z: number };
  time: number; // Heure du crime (en jours + fraction)
  perpetrator?: string; // ID du criminel
  victim?: string; // ID de la victime
  witnesses?: string[]; // IDs des t├®moins
  reported: boolean; // Signal├® ├á la police ?
  investigated: boolean; // Enqu├¬te en cours ?
  solved: boolean; // R├®solu ?
  punishment?: string; // Punition inflig├®e
  fine?: number; // Amende
  jailTime?: number; // Temps de prison (en jours)
  reward?: number; // R├®compense pour l'arrestation
}

/** Type de syst├¿me de justice. */
export interface JusticeSystem {
  crimes: Crime[];
  wantedList: Array<{
    id: string; // ID du criminel
    name: string;
    crimeId: string;
    severity: EventSeverity;
    reward: number;
    lastSeen: { x: number; z: number; time: number };
  }>;
  jails: Array<{
    id: string;
    name: string;
    x: number;
    z: number;
    capacity: number;
    prisoners: string[]; // IDs des prisonniers
    guards: string[]; // IDs des gardes
  }>;
  policeStations: string[]; // IDs des postes de police
  courtHouses: string[]; // IDs des tribunaux
}

/** Type de syst├¿me ├®conomique. */
export interface EconomySystem {
  resources: Record<string, {
    name: string;
    price: number; // Prix actuel
    basePrice: number; // Prix de base
    volatility: number; // Volatilit├® (0-1)
    supply: number; // Offre
    demand: number; // Demande
    lastUpdate: number; // Derni├¿re mise ├á jour (en jours)
  }>;
  businesses: Record<string, {
    id: string;
    name: string;
    type: string;
    owner: string;
    revenue: number; // Revenus (par jour)
    expenses: number; // D├®penses (par jour)
    profit: number; // B├®n├®fices (par jour)
    employees: string[]; // IDs des employ├®s
    customers: number; // Nombre de clients (par jour)
    reputation: number; // R├®putation (0-100)
    lastUpdate: number; // Derni├¿re mise ├á jour (en jours)
  }>;
  taxes: {
    incomeTax: number; // Imp├┤t sur le revenu (0-1)
    salesTax: number; // Taxe de vente (0-1)
    propertyTax: number; // Taxe fonci├¿re (0-1)
    businessTax: number; // Taxe sur les entreprises (0-1)
  };
  inflation: number; // Inflation (0-1)
  gdp: number; // PIB (en $)
  lastUpdate: number; // Derni├¿re mise ├á jour (en jours)
}

// ============================================================================
// ­ƒîì CLASSE PRINCIPALE : PortneufWorld (avec support RP complet)
// ============================================================================

export class PortneufWorld {
  group = new THREE.Group();
  traffic: ExtendedTrafficVehicle[] = [];
  private parkedSq: THREE.Group[] = [];
  private forestChunks: THREE.Group[] = [];
  private lodNodes: Array<{ obj: THREE.Object3D; x: number; z: number; r: number }> = [];
  private animLakes: THREE.Mesh[] = [];
  private animBoats: THREE.Object3D[] = [];
  private animSails: THREE.Object3D[] = [];
  private animMarmite: THREE.Mesh[] = [];
  private liveRoots: THREE.Object3D[] = [];
  private lodAcc = 0;
  private river: THREE.Mesh | null = null;
  private hemi: THREE.HemisphereLight;
  private ambient: THREE.AmbientLight;
  private night = false;
  private weather: WeatherType = "clear";
  private lamps: THREE.Mesh[] = [];
  doors: CityDoor[] = [];
  swingDoors: SwingDoor[] = [];
  shops: ShopSpot[] = [];
  atms: AtmSpot[] = [];
  caisses: Array<{ id: string; name: string; villageId: string; x: number; z: number; yaw: number; mesh: THREE.Group }> = [];
  deeds: Deed[] = [];
  crimes: CrimeSpot[] = [];
  street: StreetSpot[] = [];
  firms: CountyFirm[] = [];
  fields: FieldPlot[] = [];
  herd: Stock[] = [];
  sugar: SugarBush[] = [];
  houses: HouseLot[] = [];
  private streetGroup: THREE.Group | null = null;
  leaves: Array<{ id: string; mesh: THREE.Group; x: number; z: number; collected: boolean }> = [];
  wildlife = new WildlifeSystem();
  peds = new PedSystem();
  worldItems = new WorldItemField();
  solids: SolidBox[] = [];
  private lastSkyHours = -1;
  private sky: SkySnap | null = null;
  private zoneFog = 0.00155;
  private zoneFogColor = 0x8aa0a8;
  weatherFx: WeatherFx | null = null;
  plows: SnowPlowField | null = null;
  private cityTextures: THREE.Texture[] = [];
  private firmStand: THREE.Group | null = null;
  private firmKey = "";
  private prison: BuiltPrison | null = null;
  private hurtGroup = new THREE.Group();
  private raidCar: THREE.Group | null = null;
  private raidGoal = { x: 0, z: 0 };
  private raidLeft = 0;

  // ­ƒö╣ NOUVELLES PROPRI├ëT├ëS RP
  /** ├ëtat global du monde. */
  worldState: WorldState;

  /** Liste des PNJ ├®tendus. */
  npcs: ExtendedNPC[] = [];

  /** Liste des feux de camp. */
  campfires: Campfire[] = [];

  /** Liste des zones de p├¬che. */
  fishingSpots: FishingSpot[] = [];

  /** Liste des zones de chasse. */
  huntingZones: HuntingZone[] = [];

  /** Liste des ressources naturelles. */
  naturalResources: NaturalResource[] = [];

  /** Liste des zones de r├®colte. */
  harvestZones: HarvestZone[] = [];

  /** Liste des march├®s. */
  markets: Market[] = [];

  /** Liste des festivals. */
  festivals: Festival[] = [];

  /** Syst├¿me de justice. */
  justiceSystem: JusticeSystem = {
    crimes: [],
    wantedList: [],
    jails: [],
    policeStations: [],
    courtHouses: [],
  };

  /** Syst├¿me ├®conomique. */
  economySystem: EconomySystem = {
    resources: {},
    businesses: {},
    taxes: {
      incomeTax: 0.15,
      salesTax: 0.14975,
      propertyTax: 0.01,
      businessTax: 0.2,
    },
    inflation: 0.02,
    gdp: 1000000,
    lastUpdate: 0,
  };

  /** Liste des b├ótiments de la ville. */
  cityBuildings: BuiltCity[] = [];

  /** Liste des districts de la ville. */
  cityDistricts: CityDistrict[] = [];

  /** Liste des citoyens de la ville. */
  cityCitizens: Citizen[] = [];

  /** Heure de la derni├¿re mise ├á jour (en ms). */
  private lastUpdateTime = 0;

  /** Timer pour les mises ├á jour p├®riodiques. */
  private updateTimer = 0;

  /** Timer pour les sauvegardes automatiques. */
  private saveTimer = 0;

  constructor(private scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.group.name = "PortneufWorld";

    // Initialiser l'├®tat du monde
    this.worldState = this.initializeWorldState();

    // R├®flexion c├®leste bleu clair (dessus) + rebond du sol vert-for├¬t qu├®b├®cois (dessous)
    this.hemi = new THREE.HemisphereLight(0x9fc3e9, 0x2e381a, 0.95);
    // Lumi├¿re d'ambiance diffuse douce
    this.ambient = new THREE.AmbientLight(0xd4e3e8, 0.18);
    this.scene.add(this.group, this.hemi, this.ambient);
    createSunCsm(camera, this.scene);

    // Brouillard volum├®trique r├®aliste sur les collines des Laurentides (0x879fb5)
    this.scene.fog = new THREE.FogExp2(0x879fb5, 0.00125);
    this.scene.background = new THREE.Color(0x879fb5);

    // Initialiser les syst├¿mes
    this.initializeSystems();
  }

  // ============================================================================
  // ­ƒîì INITIALISATION DU MONDE RP
  // ============================================================================

  /**
   * Initialise l'├®tat global du monde.
   * @returns ├ëtat initial du monde.
   */
  private initializeWorldState(): WorldState {
    // Initialiser les factions
    const factions: Record<FactionType, Faction> = {
      citoyens: {
        id: "citoyens",
        name: "Citoyens",
        description: "La population g├®n├®rale de Portneuf.",
        color: 0x4a8a4a,
        reputation: 70,
        power: 60,
        wealth: 500000,
        members: [],
        relations: {
          citoyens: 100,
          police: 80,
          pompiers: 90,
          medecins: 85,
          agriculteurs: 75,
          bucherons: 70,
          chasseurs: 65,
          criminels: -30,
          mairie: 75,
          journalistes: 60,
          touristes: 50,
        },
        quests: [],
      },
      police: {
        id: "police",
        name: "Police",
        description: "Les forces de l'ordre de la r├®gion.",
        color: 0x2a4a8a,
        reputation: 80,
        power: 80,
        wealth: 200000,
        members: [],
        relations: {
          citoyens: 80,
          police: 100,
          pompiers: 90,
          medecins: 70,
          agriculteurs: 60,
          bucherons: 55,
          chasseurs: 65,
          criminels: -80,
          mairie: 90,
          journalistes: 50,
          touristes: 40,
        },
        quests: [],
      },
      pompiers: {
        id: "pompiers",
        name: "Pompiers",
        description: "Les pompiers de Portneuf, toujours pr├¬ts ├á intervenir.",
        color: 0xc03020,
        reputation: 85,
        power: 70,
        wealth: 150000,
        members: [],
        relations: {
          citoyens: 90,
          police: 90,
          pompiers: 100,
          medecins: 85,
          agriculteurs: 70,
          bucherons: 65,
          chasseurs: 60,
          criminels: -20,
          mairie: 85,
          journalistes: 70,
          touristes: 50,
        },
        quests: [],
      },
      medecins: {
        id: "medecins",
        name: "M├®decins",
        description: "Le personnel m├®dical de la r├®gion.",
        color: 0xffffff,
        reputation: 90,
        power: 50,
        wealth: 100000,
        members: [],
        relations: {
          citoyens: 85,
          police: 70,
          pompiers: 85,
          medecins: 100,
          agriculteurs: 60,
          bucherons: 55,
          chasseurs: 50,
          criminels: -10,
          mairie: 75,
          journalistes: 60,
          touristes: 40,
        },
        quests: [],
      },
      agriculteurs: {
        id: "agriculteurs",
        name: "Agriculteurs",
        description: "Les fermiers et producteurs locaux.",
        color: 0xc8a840,
        reputation: 75,
        power: 40,
        wealth: 300000,
        members: [],
        relations: {
          citoyens: 75,
          police: 60,
          pompiers: 70,
          medecins: 60,
          agriculteurs: 100,
          bucherons: 80,
          chasseurs: 75,
          criminels: -10,
          mairie: 70,
          journalistes: 50,
          touristes: 60,
        },
        quests: [],
      },
      bucherons: {
        id: "bucherons",
        name: "B├╗cherons",
        description: "Les travailleurs de la for├¬t.",
        color: 0x5a4030,
        reputation: 65,
        power: 35,
        wealth: 200000,
        members: [],
        relations: {
          citoyens: 70,
          police: 55,
          pompiers: 65,
          medecins: 55,
          agriculteurs: 80,
          bucherons: 100,
          chasseurs: 85,
          criminels: 0,
          mairie: 60,
          journalistes: 40,
          touristes: 50,
        },
        quests: [],
      },
      chasseurs: {
        id: "chasseurs",
        name: "Chasseurs",
        description: "Les chasseurs et trappeurs de la r├®gion.",
        color: 0x8a6a30,
        reputation: 60,
        power: 30,
        wealth: 150000,
        members: [],
        relations: {
          citoyens: 65,
          police: 65,
          pompiers: 60,
          medecins: 50,
          agriculteurs: 75,
          bucherons: 85,
          chasseurs: 100,
          criminels: 10,
          mairie: 55,
          journalistes: 30,
          touristes: 40,
        },
        quests: [],
      },
      criminels: {
        id: "criminels",
        name: "Criminels",
        description: "Les ├®l├®ments troubles de la soci├®t├®.",
        color: 0x8a2020,
        reputation: -20,
        power: 20,
        wealth: 500000,
        members: [],
        relations: {
          citoyens: -30,
          police: -80,
          pompiers: -20,
          medecins: -10,
          agriculteurs: -10,
          bucherons: 0,
          chasseurs: 10,
          criminels: 100,
          mairie: -50,
          journalistes: -20,
          touristes: -40,
        },
        quests: [],
      },
      mairie: {
        id: "mairie",
        name: "Mairie",
        description: "L'administration municipale de Portneuf.",
        color: 0x2a5a8a,
        reputation: 75,
        power: 90,
        wealth: 1000000,
        members: [],
        relations: {
          citoyens: 75,
          police: 90,
          pompiers: 85,
          medecins: 75,
          agriculteurs: 70,
          bucherons: 60,
          chasseurs: 55,
          criminels: -50,
          mairie: 100,
          journalistes: 60,
          touristes: 50,
        },
        quests: [],
      },
      journalistes: {
        id: "journalistes",
        name: "Journalistes",
        description: "Les m├®dias locaux.",
        color: 0xffffff,
        reputation: 60,
        power: 25,
        wealth: 100000,
        members: [],
        relations: {
          citoyens: 50,
          police: 50,
          pompiers: 70,
          medecins: 60,
          agriculteurs: 50,
          bucherons: 40,
          chasseurs: 30,
          criminels: -20,
          mairie: 60,
          journalistes: 100,
          touristes: 40,
        },
        quests: [],
      },
      touristes: {
        id: "touristes",
        name: "Touristes",
        description: "Les visiteurs de la r├®gion.",
        color: 0xffcc00,
        reputation: 50,
        power: 10,
        wealth: 500000,
        members: [],
        relations: {
          citoyens: 50,
          police: 40,
          pompiers: 50,
          medecins: 40,
          agriculteurs: 60,
          bucherons: 50,
          chasseurs: 40,
          criminels: -40,
          mairie: 50,
          journalistes: 40,
          touristes: 100,
        },
        quests: [],
      },
    };

    // Initialiser les ├®v├®nements
    const events: WorldEvent[] = [];

    // Initialiser les qu├¬tes
    const quests: WorldQuest[] = [
      {
        id: "quest_introduction",
        title: "Bienvenue ├á Portneuf",
        description: "Rencontrez le maire de Portneuf pour faire connaissance avec la r├®gion.",
        giver: "maire_portneuf",
        giverFaction: "mairie",
        objectives: [
          {
            type: "talk_to",
            target: "maire_portneuf",
            current: 0,
            count: 1,
          },
        ],
        rewards: {
          money: 100,
          experience: 50,
          reputation: { mairie: 10, citoyens: 5 },
        },
        prerequisites: {},
        isActive: true,
        isCompleted: false,
        isFailed: false,
      },
      {
        id: "quest_premier_pas",
        title: "Premiers pas",
        description: "Achetez une maison et installez-vous ├á Portneuf.",
        giverFaction: "mairie",
        objectives: [
          {
            type: "buy",
            target: "maison_1",
            current: 0,
            count: 1,
          },
        ],
        rewards: {
          money: 0,
          experience: 100,
          reputation: { mairie: 15, citoyens: 10 },
        },
        prerequisites: {
          quests: ["quest_introduction"],
        },
        isActive: false,
        isCompleted: false,
        isFailed: false,
      },
      {
        id: "quest_aide_agriculteur",
        title: "Aide ├á l'agriculteur",
        description: "Aidez un agriculteur local ├á r├®colter ses champs.",
        giverFaction: "agriculteurs",
        objectives: [
          {
            type: "collect",
            target: "ble",
            current: 0,
            count: 50,
          },
        ],
        rewards: {
          money: 250,
          experience: 75,
          reputation: { agriculteurs: 15, citoyens: 5 },
          items: ["outils_agricoles"],
        },
        prerequisites: {},
        isActive: true,
        isCompleted: false,
        isFailed: false,
      },
    ];

    // Initialiser l'├®tat du joueur
    const playerState: PlayerWorldState = {
      money: 10000,
      experience: 0,
      level: 1,
      reputation: {
        citoyens: 50,
        police: 50,
        pompiers: 50,
        medecins: 50,
        agriculteurs: 50,
        bucherons: 50,
        chasseurs: 50,
        criminels: 0,
        mairie: 50,
        journalistes: 50,
        touristes: 50,
      },
      skills: {
        conduite: 50,
        negociation: 30,
        bricolage: 20,
        agriculture: 10,
        chasse: 10,
        peche: 10,
        cuisine: 20,
        medecine: 10,
        combat: 10,
      },
      inventory: {},
      equipped: {},
      ownedBuildings: [],
      ownedVehicles: [],
      activeQuests: ["quest_introduction"],
      completedQuests: [],
      discoveredAreas: {},
      playTime: 0,
      lastSave: Date.now(),
    };

    return {
      season: "ete",
      currentDay: 0,
      currentTime: 12,
      dayPhase: this.getDayPhase(12),
      weather: "clear",
      temperature: 22,
      windSpeed: 10,
      windDirection: 180,
      fogDensity: 0.00125,
      fogColor: 0x879fb5,
      globalReputation: 70,
      globalSatisfaction: 75,
      crimeRate: 10,
      pollution: 20,
      wealth: 5000000,
      population: 0, // sera calcul├® lors de la construction
      taxRate: 0.15,
      factions,
      events,
      quests,
      player: playerState,
      statistics: {
        buildingsConstructed: 0,
        buildingsDestroyed: 0,
        crimesCommitted: 0,
        crimesStopped: 0,
        resourcesHarvested: {},
        moneyEarned: 0,
        moneySpent: 0,
      },
    };
  }

  /**
   * Initialise les syst├¿mes du monde (PNJ, ressources, march├®s, etc.).
   */
  private initializeSystems(): void {
    // Initialiser les PNJ
    this.initializeNPCs();

    // Initialiser les feux de camp
    this.initializeCampfires();

    // Initialiser les zones de p├¬che
    this.initializeFishingSpots();

    // Initialiser les zones de chasse
    this.initializeHuntingZones();

    // Initialiser les ressources naturelles
    this.initializeNaturalResources();

    // Initialiser les march├®s
    this.initializeMarkets();

    // Initialiser les festivals
    this.initializeFestivals();
  }

  /**
   * Initialise les PNJ du monde.
   */
  private initializeNPCs(): void {
    // Ajouter quelques PNJ de base
    const npcs: ExtendedNPC[] = [
      {
        id: "maire_portneuf",
        name: "G├®rard Tremblay",
        type: "citoyen",
        faction: "mairie",
        age: 55,
        gender: "male",
        profession: "Maire",
        buildingId: "hotel_ville_portneuf",
        homeBuildingId: "maison_maire_portneuf",
        position: { x: -100, y: 0, z: 200 },
        mood: "neutre",
        health: 100,
        wealth: 50000,
        needs: {
          logement: 100,
          nourriture: 80,
          travail: 90,
          loisirs: 60,
          sante: 90,
          securite: 85,
          education: 70,
          transport: 70,
        },
        schedule: [
          { type: "work", startHour: 8, endHour: 12, location: "hotel_ville_portneuf" },
          { type: "eat", startHour: 12, endHour: 13 },
          { type: "work", startHour: 13, endHour: 17, location: "hotel_ville_portneuf" },
          { type: "socialize", startHour: 17, endHour: 19 },
          { type: "sleep", startHour: 22, endHour: 7, location: "maison_maire_portneuf" },
        ],
        currentActivity: "work",
        speed: 0.05,
        isActive: true,
        relationships: {
          police_portneuf: 80,
          pompier_portneuf: 90,
          medecin_portneuf: 70,
        },
        reputation: {
          citoyens: 80,
          police: 90,
          pompiers: 85,
          medecins: 75,
          agriculteurs: 70,
          bucherons: 60,
          chasseurs: 55,
          criminels: -50,
          mairie: 100,
          journalistes: 60,
          touristes: 50,
        },
        skills: {
          negociation: 90,
          leadership: 85,
          politique: 80,
        },
        inventory: {},
        equipped: {},
        dialogue: {
          greetings: [
            "Bonjour, bienvenue ├á Portneuf !",
            "Ah, vous voil├á ! Je vous attendais.",
            "Salut ! Comment puis-je vous aider aujourd'hui ?",
          ],
          farewells: [
            "Au revoir ! Revenez nous voir.",
            "Bonne journ├®e !",
            "├Ç plus tard !",
          ],
          questions: [
            "Comment allez-vous ?",
            "Avez-vous besoin d'aide ?",
            "Que puis-je faire pour vous ?",
          ],
          responses: {
            "bien": ["Je vais tr├¿s bien, merci !", "Tout va pour le mieux."],
            "aide": ["Bien s├╗r, je suis l├á pour ├ºa !", "Dites-moi ce dont vous avez besoin."],
          },
        },
        quests: ["quest_introduction", "quest_premier_pas"],
        isArrested: false,
        wantedLevel: 0,
        isWanted: false,
        lastInteraction: 0,
      },
      {
        id: "police_portneuf",
        name: "Serge Lavoie",
        type: "policier",
        faction: "police",
        age: 40,
        gender: "male",
        profession: "Policier",
        buildingId: "poste_police_portneuf",
        position: { x: -150, y: 0, z: 150 },
        mood: "neutre",
        health: 100,
        wealth: 30000,
        needs: {
          logement: 90,
          nourriture: 70,
          travail: 100,
          loisirs: 50,
          sante: 85,
          securite: 95,
          education: 60,
          transport: 80,
        },
        schedule: [
          { type: "patrol", startHour: 8, endHour: 16 },
          { type: "eat", startHour: 12, endHour: 13 },
          { type: "patrol", startHour: 16, endHour: 24 },
          { type: "sleep", startHour: 0, endHour: 8, location: "poste_police_portneuf" },
        ],
        currentActivity: "patrol",
        speed: 0.07,
        isActive: true,
        relationships: {
          maire_portneuf: 80,
          pompier_portneuf: 90,
          medecin_portneuf: 70,
        },
        reputation: {
          citoyens: 70,
          police: 100,
          pompiers: 90,
          medecins: 70,
          agriculteurs: 60,
          bucherons: 55,
          chasseurs: 65,
          criminels: -80,
          mairie: 90,
          journalistes: 50,
          touristes: 40,
        },
        skills: {
          combat: 80,
          investigation: 75,
          conduite: 85,
        },
        inventory: {
          menottes: 2,
          arme: 1,
        },
        equipped: {
          weapon: "arme",
        },
        isArrested: false,
        wantedLevel: 0,
        isWanted: false,
        lastInteraction: 0,
      },
      {
        id: "pompier_portneuf",
        name: "Pierre Dubois",
        type: "pompier",
        faction: "pompiers",
        age: 35,
        gender: "male",
        profession: "Pompier",
        buildingId: "caserne_pompiers_portneuf",
        position: { x: -200, y: 0, z: 100 },
        mood: "neutre",
        health: 100,
        wealth: 25000,
        needs: {
          logement: 85,
          nourriture: 75,
          travail: 95,
          loisirs: 55,
          sante: 90,
          securite: 80,
          education: 65,
          transport: 70,
        },
        schedule: [
          { type: "work", startHour: 8, endHour: 18, location: "caserne_pompiers_portneuf" },
          { type: "eat", startHour: 12, endHour: 13 },
          { type: "sleep", startHour: 22, endHour: 7, location: "caserne_pompiers_portneuf" },
        ],
        currentActivity: "work",
        speed: 0.06,
        isActive: true,
        relationships: {
          maire_portneuf: 85,
          police_portneuf: 90,
          medecin_portneuf: 80,
        },
        reputation: {
          citoyens: 85,
          police: 90,
          pompiers: 100,
          medecins: 85,
          agriculteurs: 70,
          bucherons: 65,
          chasseurs: 60,
          criminels: -20,
          mairie: 85,
          journalistes: 70,
          touristes: 50,
        },
        skills: {
          secourisme: 90,
          conduite: 80,
          bricolage: 75,
        },
        inventory: {
          extincteur: 1,
          trousse_secours: 1,
        },
        equipped: {
          tool: "extincteur",
        },
        isArrested: false,
        wantedLevel: 0,
        isWanted: false,
        lastInteraction: 0,
      },
      {
        id: "medecin_portneuf",
        name: "Marie-Claire Roy",
        type: "medecin",
        faction: "medecins",
        age: 45,
        gender: "female",
        profession: "M├®decin",
        buildingId: "hopital_portneuf",
        position: { x: -180, y: 0, z: 250 },
        mood: "neutre",
        health: 100,
        wealth: 40000,
        needs: {
          logement: 90,
          nourriture: 75,
          travail: 95,
          loisirs: 60,
          sante: 100,
          securite: 85,
          education: 90,
          transport: 60,
        },
        schedule: [
          { type: "work", startHour: 9, endHour: 17, location: "hopital_portneuf" },
          { type: "eat", startHour: 12, endHour: 13 },
          { type: "sleep", startHour: 22, endHour: 8, location: "maison_medecin_portneuf" },
        ],
        currentActivity: "work",
        speed: 0.05,
        isActive: true,
        relationships: {
          maire_portneuf: 75,
          police_portneuf: 70,
          pompier_portneuf: 85,
        },
        reputation: {
          citoyens: 85,
          police: 70,
          pompiers: 85,
          medecins: 100,
          agriculteurs: 60,
          bucherons: 55,
          chasseurs: 50,
          criminels: -10,
          mairie: 75,
          journalistes: 60,
          touristes: 40,
        },
        skills: {
          medecine: 95,
          secourisme: 90,
          ecoute: 85,
        },
        inventory: {
          trousse_medicale: 5,
          medicaments: 10,
        },
        equipped: {
          tool: "trousse_medicale",
        },
        isArrested: false,
        wantedLevel: 0,
        isWanted: false,
        lastInteraction: 0,
      },
    ];

    this.npcs = npcs;

    // Ajouter les PNJ aux factions correspondantes
    for (const npc of npcs) {
      if (npc.faction && this.worldState.factions[npc.faction]) {
        this.worldState.factions[npc.faction].members.push(npc.id);
      }
    }
  }

  /**
   * Initialise les feux de camp du monde.
   */
  private initializeCampfires(): void {
    // Ajouter des feux de camp autour des zones de camping
    const campingZones = [
      { x: -520, z: -720, name: "Camping du Lac" },
      { x: -600, z: -550, name: "Camping de la Grotte" },
      { x: -840, z: -200, name: "Camping de la Gorge" },
    ];

    for (let i = 0; i < campingZones.length; i++) {
      const zone = campingZones[i];
      const campfire: Campfire = {
        id: `campfire_${i}`,
        x: zone.x + (Math.random() - 0.5) * 20,
        z: zone.z + (Math.random() - 0.5) * 20,
        yaw: Math.random() * Math.PI * 2,
        mesh: new THREE.Group(),
        isLit: false,
        fuel: 100,
        maxFuel: 100,
        warmthRadius: 10,
        lightRadius: 15,
        lightIntensity: 1,
        owner: this.npcs[i % this.npcs.length].id,
        lastUsed: 0,
      };
      this.campfires.push(campfire);
    }
  }

  /**
   * Initialise les zones de p├¬che du monde.
   */
  private initializeFishingSpots(): void {
    // Ajouter des zones de p├¬che autour des lacs et de la rivi├¿re
    const fishingZones = [
      { x: -520, z: -760, type: "lac", name: "Lac Portneuf" },
      { x: -840, z: -200, type: "riviere", name: "Rivi├¿re des Mille ├Äles" },
      { x: -480, z: 72, type: "riviere", name: "Rivi├¿re Jacques-Cartier" },
    ];

    for (let i = 0; i < fishingZones.length; i++) {
      const zone = fishingZones[i];
      const fishingSpot: FishingSpot = {
        id: `fishing_${i}`,
        x: zone.x,
        z: zone.z,
        type: zone.type,
        fishTypes: ["truite", "saumon", "brochet", "perchaude"],
        fishProbability: 0.7,
        minFishSize: 0.5,
        maxFishSize: 3.0,
        requiredTool: "canne_a_peche",
        requiredLicense: true,
        isActive: true,
        lastFished: 0,
        fishStock: 100,
      };
      this.fishingSpots.push(fishingSpot);
    }
  }

  /**
   * Initialise les zones de chasse du monde.
   */
  private initializeHuntingZones(): void {
    // Ajouter des zones de chasse dans les for├¬ts
    const huntingZones = [
      { x: -620, z: -580, radius: 100, name: "For├¬t de la Coul├®e" },
      { x: -820, z: -160, radius: 80, name: "For├¬t des G├®ants" },
      { x: -460, z: 72, radius: 120, name: "For├¬t du Moulin" },
    ];

    for (let i = 0; i < huntingZones.length; i++) {
      const zone = huntingZones[i];
      const huntingZone: HuntingZone = {
        id: `hunting_${i}`,
        x: zone.x,
        z: zone.z,
        radius: zone.radius,
        animalTypes: ["cerf", "orignal", "coyote", "li├¿vre", "canard"],
        huntProbability: 0.6,
        requiredTool: "fusil",
        requiredLicense: true,
        isActive: true,
        lastHunted: 0,
        animalStock: 100,
        season: ["automne", "hiver"],
      };
      this.huntingZones.push(huntingZone);
    }
  }

  /**
   * Initialise les ressources naturelles du monde.
   */
  private initializeNaturalResources(): void {
    // Ajouter des ressources de bois dans les for├¬ts
    for (let i = 0; i < 50; i++) {
      const x = -600 + Math.random() * 200;
      const z = -600 + Math.random() * 200;
      const resource: NaturalResource = {
        id: `bois_${i}`,
        type: "bois",
        name: "├ërable ├á sucre",
        x,
        z,
        quantity: 100 + Math.floor(Math.random() * 50),
        maxQuantity: 150,
        regrowthRate: 0.1,
        requiredTool: "hache",
        requiredSkill: "bucheron",
        minSkillLevel: 10,
        lastHarvested: 0,
        isExhausted: false,
      };
      this.naturalResources.push(resource);
    }

    // Ajouter des ressources de pierre dans les carri├¿res
    for (let i = 0; i < 20; i++) {
      const x = -480 + Math.random() * 40;
      const z = -200 + Math.random() * 40;
      const resource: NaturalResource = {
        id: `pierre_${i}`,
        type: "pierre",
        name: "Granit",
        x,
        z,
        quantity: 200 + Math.floor(Math.random() * 100),
        maxQuantity: 300,
        regrowthRate: 0.01, // La pierre ne repousse pas vite
        requiredTool: "pioche",
        requiredSkill: "mineur",
        minSkillLevel: 20,
        lastHarvested: 0,
        isExhausted: false,
      };
      this.naturalResources.push(resource);
    }

    // Ajouter des ressources de plantes (champs agricoles)
    for (let i = 0; i < 30; i++) {
      const x = -300 + Math.random() * 200;
      const z = -800 + Math.random() * 200;
      const resource: NaturalResource = {
        id: `plante_${i}`,
        type: "plante",
        name: Math.random() > 0.5 ? "Bl├®" : "Ma├»s",
        x,
        z,
        quantity: 50 + Math.floor(Math.random() * 50),
        maxQuantity: 100,
        regrowthRate: 0.5,
        requiredTool: "faux",
        requiredSkill: "agriculteur",
        minSkillLevel: 5,
        lastHarvested: 0,
        isExhausted: false,
        owner: this.npcs[i % this.npcs.length].id,
      };
      this.naturalResources.push(resource);
    }
  }

  /**
   * Initialise les march├®s du monde.
   */
  private initializeMarkets(): void {
    // March├® principal de Portneuf
    const mainMarket: Market = {
      id: "marche_portneuf",
      name: "March├® de Portneuf",
      x: -100,
      z: 200,
      yaw: 0,
      type: "permanent",
      vendors: [
        {
          id: "vendeur_legumes",
          name: "Jean le Mara├«cher",
          type: "nourriture",
          items: [
            { id: "carotte", name: "Carottes", price: 2, quantity: 50, restockRate: 0.2 },
            { id: "pomme_de_terre", name: "Pommes de terre", price: 1.5, quantity: 80, restockRate: 0.3 },
            { id: "oignon", name: "Oignons", price: 1, quantity: 60, restockRate: 0.2 },
          ],
          reputation: 80,
          mood: "neutre",
          dialogue: [
            "Des l├®gumes frais du jardin !",
            "Les meilleures carottes de la r├®gion !",
            "Pommes de terre ├á 1,50$ la livre !",
          ],
        },
        {
          id: "vendeur_viande",
          name: "Pierre le Boucher",
          type: "nourriture",
          items: [
            { id: "poulet", name: "Poulet", price: 8, quantity: 20, restockRate: 0.1 },
            { id: "boeuf", name: "B┼ôuf", price: 12, quantity: 15, restockRate: 0.1 },
            { id: "porc", name: "Porc", price: 10, quantity: 18, restockRate: 0.1 },
          ],
          reputation: 75,
          mood: "neutre",
          dialogue: [
            "Viande fra├«che tous les jours !",
            "Le meilleur b┼ôuf de la r├®gion !",
            "Poulet fermier ├á 8$ !",
          ],
        },
        {
          id: "vendeur_outils",
          name: "Paul la Quincaillerie",
          type: "outils",
          items: [
            { id: "hache", name: "Hache", price: 40, quantity: 5, restockRate: 0.05 },
            { id: "pioche", name: "Pioche", price: 35, quantity: 4, restockRate: 0.05 },
            { id: "faux", name: "Faux", price: 25, quantity: 6, restockRate: 0.05 },
          ],
          reputation: 85,
          mood: "neutre",
          dialogue: [
            "Des outils de qualit├® !",
            "Tout pour le bricolage !",
            "Haches et pioches en stock !",
          ],
        },
      ],
      operatingHours: { open: 8, close: 18 },
      isOpen: true,
      popularity: 80,
      lastRestock: 0,
    };
    this.markets.push(mainMarket);
  }

  /**
   * Initialise les festivals du monde.
   */
  private initializeFestivals(): void {
    // Festival des sucres (printemps)
    const festivalSucres: Festival = {
      id: "festival_sucres",
      name: "Festival des Sucres",
      description: "C├®l├®bration annuelle de la saison des sucres avec d├®gustations, musique et danses.",
      type: "festival",
      location: { x: -100, z: 200, radius: 50 },
      startTime: this.getDayOfYear("printemps", 60), // Jour 60 (environ mars)
      duration: 72, // 3 jours
      organizers: ["maire_portneuf", "agriculteur_1"],
      activities: [
        {
          type: "concert",
          name: "Concert traditionnel",
          description: "Musique folklorique qu├®b├®coise.",
          startHour: 19,
          endHour: 21,
          participants: ["musicien_1", "musicien_2"],
          rewards: [{ type: "reputation", value: { citoyens: 5 } }],
        },
        {
          type: "danse",
          name: "Danse des sucres",
          description: "Apprenez les danses traditionnelles.",
          startHour: 14,
          endHour: 16,
          participants: ["danseur_1", "danseur_2"],
          rewards: [{ type: "reputation", value: { citoyens: 3 } }],
        },
        {
          type: "stand",
          name: "D├®gustation de sirop",
          description: "D├®gustez du sirop d'├®rable frais.",
          startHour: 10,
          endHour: 18,
          participants: ["agriculteur_1", "agriculteur_2"],
          rewards: [{ type: "item", value: "sirop_erable" }],
        },
      ],
      rewards: [
        { type: "money", value: 100 },
        { type: "reputation", value: { citoyens: 10, agriculteurs: 15 } },
        { type: "item", value: "sirop_erable" },
      ],
      isActive: false,
      attendance: 0,
      maxAttendance: 200,
    };
    this.festivals.push(festivalSucres);

    // March├® de No├½l (hiver)
    const marcheNoel: Festival = {
      id: "marche_noel",
      name: "March├® de No├½l",
      description: "March├® de No├½l avec des produits artisanaux, de la nourriture et des d├®corations.",
      type: "marche",
      location: { x: -150, z: 150, radius: 40 },
      startTime: this.getDayOfYear("hiver", 350), // Jour 350 (environ d├®cembre)
      duration: 48, // 2 jours
      organizers: ["maire_portneuf", "artisan_1"],
      activities: [
        {
          type: "stand",
          name: "Vente de d├®corations",
          description: "Achetez des d├®corations de No├½l faites main.",
          startHour: 10,
          endHour: 20,
          participants: ["artisan_1", "artisan_2"],
          rewards: [{ type: "item", value: "decoration_noel" }],
        },
        {
          type: "parade",
          name: "Parade du P├¿re No├½l",
          description: "Parade avec le P├¿re No├½l et ses rennes.",
          startHour: 16,
          endHour: 17,
          participants: ["pere_noel", "renne_1", "renne_2"],
          rewards: [{ type: "reputation", value: { citoyens: 5, touristes: 10 } }],
        },
      ],
      rewards: [
        { type: "money", value: 50 },
        { type: "reputation", value: { citoyens: 5, touristes: 10 } },
        { type: "item", value: "cadeau_noel" },
      ],
      isActive: false,
      attendance: 0,
      maxAttendance: 150,
    };
    this.festivals.push(marqueNoel);
  }

  /**
   * Calcule le jour de l'ann├®e pour une saison et un jour donn├®.
   * @param season - Saison.
   * @param dayInSeason - Jour dans la saison (0-89).
   * @returns Jour de l'ann├®e (0-364).
   */
  private getDayOfYear(season: Season, dayInSeason: number): number {
    const seasonStartDays: Record<Season, number> = {
      hiver: 355, // D├®but de l'hiver (mi-d├®cembre)
      printemps: 85, // D├®but du printemps (mi-mars)
      ete: 172, // D├®but de l'├®t├® (mi-juin)
      automne: 260, // D├®but de l'automne (mi-septembre)
    };
    return seasonStartDays[season] + dayInSeason;
  }

  /**
   * D├®termine la phase du jour selon l'heure.
   * @param hour - Heure (0-23).
   * @returns Phase du jour.
   */
  private getDayPhase(hour: number): DayPhase {
    if (hour >= 5 && hour < 8) return "aube";
    if (hour >= 8 && hour < 12) return "matin";
    if (hour >= 12 && hour < 14) return "midi";
    if (hour >= 14 && hour < 18) return "apres_midi";
    if (hour >= 18 && hour < 21) return "soir";
    if (hour >= 21 && hour < 24) return "nuit";
    return "minuit"; // 0-5h
  }

  /**
   * Met ├á jour la phase du jour selon l'heure actuelle.
   */
  private updateDayPhase(): void {
    this.worldState.dayPhase = this.getDayPhase(this.worldState.currentTime);
  }

  /**
   * Met ├á jour la saison selon le jour actuel.
   */
  private updateSeason(): void {
    const day = this.worldState.currentDay % 365;
    if (day >= 355 || day < 85) this.worldState.season = "hiver";
    else if (day >= 85 && day < 172) this.worldState.season = "printemps";
    else if (day >= 172 && day < 260) this.worldState.season = "ete";
    else this.worldState.season = "automne";
  }

  // ============================================================================
  // ­ƒÅù´©Å CONSTRUCTION DU MONDE (avec int├®gration RP)
  // ============================================================================

  build() {
    // Construire le monde de base
    this.buildTerrain();
    this.buildRiver();
    this.buildLakes();

    // Construire les routes
    for (let i = 0; i < ROADS.length; i++) {
      const road = ROADS[i];
      const div = road.kind === "ramp" ? 14 : road.kind === "highway" ? 48 : road.kind === "village" || road.kind === "rural" ? 36 : 28;
      this.group.add(buildRoadRibbon(road, div));
      const line = buildCenterLine(road, road.kind === "village" ? 36 : 50);
      if (line) this.group.add(line);
      if (road.id === "quai_portneuf" || road.id === "portneuf_quai_ns" || road.id.startsWith("rue_")) {
        this.group.add(buildRoadSidewalks(road, road.id.startsWith("rue_") ? 22 : 18));
      }
    }

    // Construire les intersections
    for (let i = 0; i < ROAD_JUNCTIONS.length; i++) {
      const j = ROAD_JUNCTIONS[i];
      this.group.add(buildIntersectionPad(j.x, j.z, j.size));
    }

    // Construire les for├¬ts
    this.buildForests();

    // Construire les ├®tablissements
    this.buildSettlements();

    // Construire les points de rep├¿re
    this.buildLandmarks();

    // Construire les panneaux routiers
    this.buildRoadSigns();

    // Construire les ├®changeurs
    this.buildInterchanges();

    // Construire le trafic
    this.buildTraffic();

    // Construire les lampadaires
    this.buildStreetlights();

    // Construire les poteaux hydro
    this.buildHydroPoles();

    // Construire les meubles de rue
    buildRoadFurniture(this.group);

    // Construire les ├®rables
    this.buildMaples();

    // Construire les feuilles d'├®rable
    this.buildLeaves();

    // Initialiser les syst├¿mes de faune et de pi├®tons
    this.wildlife.build();
    this.group.add(this.wildlife.group);
    this.peds.build();
    this.group.add(this.peds.group);

    // Initialiser le syst├¿me d'objets du monde
    this.worldItems.build(useGameStore.getState().lootedItems ?? []);
    this.group.add(this.worldItems.group);

    // Collecter les solides pour les collisions
    this.collectSolids();

    // Appliquer le CSM (Cascaded Shadow Maps)
    wireCsmTree(this.group);

    // Collecter les animations
    this.collectAnims();

    // Figurer les objets statiques
    this.freezeStatic();

    // Initialiser les effets m├®t├®o
    this.weatherFx = new WeatherFx();
    this.group.add(this.weatherFx.group);

    // Initialiser le syst├¿me de d├®neigement
    this.plows = new SnowPlowField();
    this.group.add(this.plows.group);

    // Initialiser le LOD (Level of Detail)
    this.tickLod(new THREE.Vector3(SPAWN.x, 0, SPAWN.z));

    // Mettre ├á jour le monde pour le jour 0
    this.updateWorldState(0, 12);
  }

  // ... (Le reste du code existant est conserv├® et sera int├®gr├® dans la partie 2)

  // ============================================================================
  // ­ƒîì FONCTIONS DE GESTION DU MONDE RP
  // ============================================================================

  /**
   * Met ├á jour l'├®tat du monde (heure, jour, saison, m├®t├®o).
   * @param deltaTime - Temps ├®coul├® depuis la derni├¿re mise ├á jour (en secondes).
   * @param currentTime - Heure actuelle (0-23).
   */
  private updateWorldState(deltaTime: number, currentTime: number): void {
    // Convertir deltaTime en heures
    const deltaHours = deltaTime / 3600;

    // Mettre ├á jour l'heure actuelle
    this.worldState.currentTime += deltaHours;

    // G├®rer le d├®passement de 24h
    if (this.worldState.currentTime >= 24) {
      const daysPassed = Math.floor(this.worldState.currentTime / 24);
      this.worldState.currentDay += daysPassed;
      this.worldState.currentTime %= 24;

      // Mettre ├á jour les villes pour chaque nouveau jour
      for (const city of this.cityBuildings) {
        updateCityForNewDay(city, this.worldState.currentDay);
      }

      // Mettre ├á jour les ├®v├®nements mondiaux
      this.updateWorldEvents(daysPassed);

      // Mettre ├á jour les qu├¬tes mondiales
      this.updateWorldQuests(daysPassed);

      // Mettre ├á jour les ressources naturelles
      this.updateNaturalResources(daysPassed);

      // Mettre ├á jour les march├®s
      this.updateMarkets(daysPassed);

      // Mettre ├á jour les festivals
      this.updateFestivals(daysPassed);

      // Mettre ├á jour la m├®t├®o
      this.updateWeather();

      // Mettre ├á jour la saison
      this.updateSeason();
    }

    // Mettre ├á jour la phase du jour
    this.updateDayPhase();

    // Mettre ├á jour les PNJ pour chaque nouvelle heure
    const hoursPassed = Math.floor(deltaHours);
    if (hoursPassed > 0) {
      for (const city of this.cityBuildings) {
        updateCitizensForNewHour(city);
      }
      this.updateNPCs(hoursPassed);
    }

    // Mettre ├á jour le temps de jeu du joueur
    this.worldState.player.playTime += deltaHours;

    // Mettre ├á jour les statistiques
    this.updateStatistics(deltaTime);
  }

  /**
   * Met ├á jour les ├®v├®nements mondiaux.
   * @param daysPassed - Nombre de jours ├®coul├®s.
   */
  private updateWorldEvents(daysPassed: number): void {
    const currentDay = this.worldState.currentDay;
    const currentSeason = this.worldState.season;

    // V├®rifier les ├®v├®nements en cours
    for (let i = 0; i < this.worldState.events.length; i++) {
      const event = this.worldState.events[i];

      // Si l'├®v├®nement est termin├®
      if (currentDay * 24 + this.worldState.currentTime >= event.startTime + event.duration) {
        // Appliquer les effets de fin d'├®v├®nement
        if (!event.isActive) continue;

        // Appliquer les effets sur les factions
        if (event.effects.reputationChange) {
          for (const [faction, change] of Object.entries(event.effects.reputationChange)) {
            this.worldState.factions[faction as FactionType].reputation += change;
          }
        }

        // Appliquer les effets globaux
        if (event.effects.satisfactionChange) {
          this.worldState.globalSatisfaction = Math.max(
            0,
            Math.min(100, this.worldState.globalSatisfaction + event.effects.satisfactionChange)
          );
        }

        if (event.effects.crimeRateChange) {
          this.worldState.crimeRate = Math.max(
            0,
            Math.min(100, this.worldState.crimeRate + event.effects.crimeRateChange)
          );
        }

        if (event.effects.pollutionChange) {
          this.worldState.pollution = Math.max(
            0,
            Math.min(100, this.worldState.pollution + event.effects.pollutionChange)
          );
        }

        if (event.effects.wealthChange) {
          this.worldState.wealth += event.effects.wealthChange;
        }

        if (event.effects.populationChange) {
          this.worldState.population += event.effects.populationChange;
        }

        // Marquer l'├®v├®nement comme inactif
        event.isActive = false;
      }
      // Si l'├®v├®nement commence
      else if (currentDay * 24 + this.worldState.currentTime >= event.startTime &&
               !event.isActive) {
        event.isActive = true;

        // Appliquer les effets de d├®but d'├®v├®nement
        if (event.effects.weatherOverride) {
          this.setWeather(event.effects.weatherOverride);
        }
      }
    }

    // G├®n├®rer de nouveaux ├®v├®nements al├®atoires
    this.generateRandomWorldEvents(daysPassed);
  }

  /**
   * Met ├á jour les qu├¬tes mondiales.
   * @param daysPassed - Nombre de jours ├®coul├®s.
   */
  private updateWorldQuests(daysPassed: number): void {
    for (const quest of this.worldState.quests) {
      if (quest.isCompleted || quest.isFailed) continue;

      // V├®rifier si la qu├¬te a expir├®
      if (quest.expiry && this.worldState.currentDay >= quest.expiry) {
        quest.isFailed = true;
        continue;
      }

      // V├®rifier les objectifs de la qu├¬te
      let allObjectivesCompleted = true;
      for (const objective of quest.objectives) {
        if (objective.current < (objective.count || 1)) {
          allObjectivesCompleted = false;
          break;
        }
      }

      if (allObjectivesCompleted) {
        quest.isCompleted = true;
        // Appliquer les r├®compenses (├á impl├®menter)
        this.applyQuestRewards(quest);
      }
    }
  }

  /**
   * Applique les r├®compenses d'une qu├¬te compl├®t├®e.
   * @param quest - Qu├¬te compl├®t├®e.
   */
  private applyQuestRewards(quest: WorldQuest): void {
    // Ajouter l'argent
    if (quest.rewards.money) {
      this.worldState.player.money += quest.rewards.money;
    }

    // Ajouter l'exp├®rience
    if (quest.rewards.experience) {
      this.worldState.player.experience += quest.rewards.experience;
      // V├®rifier si le joueur monte de niveau
      this.checkLevelUp();
    }

    // Ajouter la r├®putation
    if (quest.rewards.reputation) {
      for (const [faction, change] of Object.entries(quest.rewards.reputation)) {
        this.worldState.player.reputation[faction as FactionType] = Math.max(
          -100,
          Math.min(100, (this.worldState.player.reputation[faction as FactionType] || 0) + change)
        );
      }
    }

    // Ajouter les items
    if (quest.rewards.items) {
      for (const item of quest.rewards.items) {
        this.worldState.player.inventory[item] = (this.worldState.player.inventory[item] || 0) + 1;
      }
    }
  }

  /**
   * V├®rifie si le joueur monte de niveau.
   */
  private checkLevelUp(): void {
    const experienceThresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];
    const currentLevel = this.worldState.player.level;
    const currentExperience = this.worldState.player.experience;

    for (let i = currentLevel; i < experienceThresholds.length; i++) {
      if (currentExperience >= experienceThresholds[i]) {
        this.worldState.player.level = i + 1;
      } else {
        break;
      }
    }
  }

  /**
   * G├®n├¿re des ├®v├®nements al├®atoires pour le monde.
   * @param daysPassed - Nombre de jours ├®coul├®s.
   */
  private generateRandomWorldEvents(daysPassed: number): void {
    const rng = Math.random();
    const currentSeason = this.worldState.season;

    // Probabilit├® de g├®n├®rer un ├®v├®nement (10% par jour)
    if (rng < 0.1 * daysPassed) {
      const eventTypes: WorldEventType[] = [
        "festival",
        "marche",
        "feux_artifice",
        "tempete",
        "incendie",
        "accident",
        "manifestation",
      ];

      // Filtrer les ├®v├®nements selon la saison
      const seasonalEventTypes = eventTypes.filter((type) => {
        if (type === "feux_artifice" && currentSeason !== "ete") return false;
        if (type === "festival" && currentSeason === "hiver") return false;
        if (type === "marche" && currentSeason === "hiver") return false;
        return true;
      });

      const type = seasonalEventTypes[Math.floor(Math.random() * seasonalEventTypes.length)];

      // G├®n├®rer la gravit├®
      const severities: EventSeverity[] = ["mineur", "modere", "majeur"];
      const severity = severities[Math.floor(Math.random() * severities.length)];

      // G├®n├®rer la dur├®e (en heures)
      let duration = 24; // 1 jour par d├®faut
      if (type === "festival" || type === "marche") duration = 48 + Math.floor(Math.random() * 24);
      if (type === "tempete" || type === "incendie") duration = 6 + Math.floor(Math.random() * 12);
      if (type === "accident") duration = 2 + Math.floor(Math.random() * 6);
      if (type === "manifestation") duration = 12 + Math.floor(Math.random() * 24);

      // G├®n├®rer le lieu (al├®atoire ou sp├®cifique)
      let location: { x: number; z: number; radius: number } | undefined;
      if (type === "festival" || type === "marche") {
        // Choix d'un village al├®atoire
        const village = VILLAGES[Math.floor(Math.random() * VILLAGES.length)];
        location = { x: village.center[0], z: village.center[1], radius: 50 };
      } else if (type === "incendie" || type === "accident") {
        // Lieu al├®atoire pr├¿s d'une route
        const road = ROADS[Math.floor(Math.random() * ROADS.length)];
        const t = Math.random();
        const sample = sampleRoad(road, t);
        location = { x: sample.x, z: sample.z, radius: 20 };
      }

      // G├®n├®rer les effets
      const effects: WorldEvent["effects"] = {
        reputationChange: {},
        satisfactionChange: 0,
        crimeRateChange: 0,
        pollutionChange: 0,
        wealthChange: 0,
        populationChange: 0,
      };

      switch (type) {
        case "festival":
          effects.reputationChange = { citoyens: 5, touristes: 10 };
          effects.satisfactionChange = 10;
          effects.wealthChange = 5000;
          break;
        case "marche":
          effects.reputationChange = { citoyens: 3, agriculteurs: 5 };
          effects.satisfactionChange = 5;
          effects.wealthChange = 3000;
          break;
        case "feux_artifice":
          effects.reputationChange = { citoyens: 2, touristes: 5 };
          effects.satisfactionChange = 8;
          effects.pollutionChange = 2;
          break;
        case "tempete":
          effects.reputationChange = { citoyens: -3, mairie: -5 };
          effects.satisfactionChange = -8;
          effects.wealthChange = -10000;
          effects.pollutionChange = 5;
          break;
        case "incendie":
          effects.reputationChange = { citoyens: -5, pompiers: -10 };
          effects.satisfactionChange = -12;
          effects.wealthChange = -20000;
          effects.pollutionChange = 10;
          break;
        case "accident":
          effects.reputationChange = { citoyens: -2, police: -5 };
          effects.satisfactionChange = -5;
          effects.crimeRateChange = 2;
          effects.wealthChange = -5000;
          break;
        case "manifestation":
          effects.reputationChange = {
            citoyens: Math.random() > 0.5 ? 3 : -3,
            mairie: Math.random() > 0.5 ? -5 : 5,
          };
          effects.satisfactionChange = Math.random() > 0.5 ? 5 : -5;
          effects.crimeRateChange = 3;
          break;
      }

      // Cr├®er l'├®v├®nement
      const event: WorldEvent = {
        id: `event_${type}_${this.worldState.currentDay}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: this.getEventTitle(type, severity, location),
        description: this.getEventDescription(type, severity, location),
        severity,
        startTime: this.worldState.currentDay * 24 + this.worldState.currentTime,
        duration,
        location,
        effects,
        isActive: true,
      };

      this.worldState.events.push(event);
    }
  }

  /**
   * R├®cup├¿re le titre d'un ├®v├®nement.
   * @param type - Type de l'├®v├®nement.
   * @param severity - Gravit├®.
   * @param location - Lieu.
   * @returns Titre de l'├®v├®nement.
   */
  private getEventTitle(type: WorldEventType, severity: EventSeverity, location?: { x: number; z: number; radius: number }): string {
    const severityFr = {
      mineur: "mineur",
      modere: "mod├®r├®",
      majeur: "majeur",
      catastrophique: "catastrophique",
    };

    if (location) {
      const village = VILLAGES.find((v) => Math.hypot(v.center[0] - location.x, v.center[1] - location.z) < v.coreRadius);
      const locationName = village ? village.name : "la r├®gion";
      return `${this.getEventTypeName(type)} ${severityFr[severity]} ├á ${locationName}`;
    } else {
      return `${this.getEventTypeName(type)} ${severityFr[severity]}`;
    }
  }

  /**
   * R├®cup├¿re le nom du type d'├®v├®nement.
   * @param type - Type de l'├®v├®nement.
   * @returns Nom du type.
   */
  private getEventTypeName(type: WorldEventType): string {
    const typeNames: Record<WorldEventType, string> = {
      festival: "Festival",
      marche: "March├®",
      feux_artifice: "Feux d'artifice",
      tempete: "Temp├¬te",
      incendie: "Incendie",
      accident: "Accident",
      manifestation: "Manifestation",
      election: "├ëlection",
      epidemie: "├ëpid├®mie",
      chasse_au_tresor: "Chasse au tr├®sor",
      courses_de_tracteurs: "Courses de tracteurs",
      fete_des_neiges: "F├¬te des neiges",
    };
    return typeNames[type] || type;
  }

  /**
   * R├®cup├¿re la description d'un ├®v├®nement.
   * @param type - Type de l'├®v├®nement.
   * @param severity - Gravit├®.
   * @param location - Lieu.
   * @returns Description de l'├®v├®nement.
   */
  private getEventDescription(type: WorldEventType, severity: EventSeverity, location?: { x: number; z: number; radius: number }): string {
    const severityFr = {
      mineur: "mineur",
      modere: "mod├®r├®",
      majeur: "majeur",
      catastrophique: "catastrophique",
    };

    const descriptions: Record<WorldEventType, (severity: string, location?: string) => string> = {
      festival: (severity, location) => `Un ${severity} festival a lieu ${location || "dans la r├®gion"}. Venez c├®l├®brer avec la communaut├® !`,
      marche: (severity, location) => `Un ${severity} march├® est organis├® ${location || "dans la r├®gion"}. Des produits locaux et artisanaux sont disponibles.`,
      feux_artifice: (severity, location) => `Un spectacle de ${severity} feux d'artifice aura lieu ${location || "dans la r├®gion"}.`,
      tempete: (severity, location) => `Une ${severity} temp├¬te frappe ${location || "la r├®gion"}. Soyez prudents !`,
      incendie: (severity, location) => `Un ${severity} incendie s'est d├®clar├® ${location || "dans la r├®gion"}. Les pompiers interviennent.`,
      accident: (severity, location) => `Un ${severity} accident s'est produit ${location || "dans la r├®gion"}.`,
      manifestation: (severity, location) => `Une ${severity} manifestation a lieu ${location || "dans la r├®gion"}.`,
      election: () => "Des ├®lections municipales ont lieu dans la r├®gion.",
      epidemie: (severity) => `Une ${severity} ├®pid├®mie touche la r├®gion. Prenez des pr├®cautions !`,
      chasse_au_tresor: (severity, location) => `Une ${severity} chasse au tr├®sor est organis├®e ${location || "dans la r├®gion"}.`,
      courses_de_tracteurs: (severity, location) => `Des ${severity} courses de tracteurs auront lieu ${location || "dans la r├®gion"}.`,
      fete_des_neiges: (severity, location) => `La ${severity} f├¬te des neiges se d├®roule ${location || "dans la r├®gion"}.`,
    };

    const locationName = location ?
      (VILLAGES.find((v) => Math.hypot(v.center[0] - location.x, v.center[1] - location.z) < v.coreRadius)?.name || "la r├®gion") :
      undefined;

    return descriptions[type]?.(severityFr[severity], locationName);
  }

  /**
   * Met ├á jour les ressources naturelles.
   * @param daysPassed - Nombre de jours ├®coul├®s.
   */
  private updateNaturalResources(daysPassed: number): void {
    for (const resource of this.naturalResources) {
      // Si la ressource est ├®puis├®e, v├®rifier si elle peut repousser
      if (resource.isExhausted) {
        resource.quantity += resource.regrowthRate * daysPassed;
        if (resource.quantity >= resource.maxQuantity * 0.1) {
          resource.isExhausted = false;
        }
      }

      // Si la ressource n'est pas ├®puis├®e, la faire pousser lentement
      if (!resource.isExhausted && resource.quantity < resource.maxQuantity) {
        resource.quantity = Math.min(
          resource.maxQuantity,
          resource.quantity + resource.regrowthRate * daysPassed * 0.1
        );
      }
    }
  }

  /**
   * Met ├á jour les march├®s.
   * @param daysPassed - Nombre de jours ├®coul├®s.
   */
  private updateMarkets(daysPassed: number): void {
    for (const market of this.markets) {
      // R├®approvisionner les stocks
      market.lastRestock += daysPassed;
      if (market.lastRestock >= 1) { // R├®approvisionnement quotidien
        for (const vendor of market.vendors) {
          for (const item of vendor.items) {
            item.quantity = Math.min(
              item.quantity + Math.floor(item.restockRate * 10),
              100 // Stock maximum par item
            );
          }
        }
        market.lastRestock = 0;
      }

      // Mettre ├á jour l'├®tat d'ouverture
      const currentHour = this.worldState.currentTime;
      market.isOpen = currentHour >= market.operatingHours.open &&
                     currentHour < market.operatingHours.close;
    }
  }

  /**
   * Met ├á jour les festivals.
   * @param daysPassed - Nombre de jours ├®coul├®s.
   */
  private updateFestivals(daysPassed: number): void {
    for (const festival of this.festivals) {
      const currentTimeInHours = this.worldState.currentDay * 24 + this.worldState.currentTime;

      // V├®rifier si le festival commence
      if (currentTimeInHours >= festival.startTime &&
          currentTimeInHours < festival.startTime + festival.duration &&
          !festival.isActive) {
        festival.isActive = true;
        festival.attendance = 0;
      }
      // V├®rifier si le festival se termine
      else if (currentTimeInHours >= festival.startTime + festival.duration &&
               festival.isActive) {
        festival.isActive = false;
      }
    }
  }

  /**
   * Met ├á jour la m├®t├®o.
   */
  private updateWeather(): void {
    const season = this.worldState.season;
    const rng = Math.random();

    // Probabilit├®s de m├®t├®o selon la saison
    let weatherType: WeatherType;

    if (season === "hiver") {
      const winterWeather = ["snow", "clear", "fog", "blizzard", "poudrerie", "froid_polaire"];
      const weights = [0.4, 0.3, 0.1, 0.05, 0.1, 0.05];
      weatherType = this.getWeightedRandom(winterWeather, weights);
    } else if (season === "printemps") {
      const springWeather = ["rain", "clear", "fog", "pluie_fine"];
      const weights = [0.3, 0.4, 0.2, 0.1];
      weatherType = this.getWeightedRandom(springWeather, weights);
    } else if (season === "ete") {
      const summerWeather = ["clear", "rain", "storm", "orage_ete", "nuageux"];
      const weights = [0.5, 0.2, 0.1, 0.05, 0.15];
      weatherType = this.getWeightedRandom(summerWeather, weights);
    } else { // automne
      const fallWeather = ["clear", "rain", "fog", "nuageux", "pluie_fine"];
      const weights = [0.3, 0.3, 0.2, 0.15, 0.05];
      weatherType = this.getWeightedRandom(fallWeather, weights);
    }

    // D├®finir la m├®t├®o
    this.setWeather(weatherType);

    // Mettre ├á jour les propri├®t├®s de la m├®t├®o
    this.updateWeatherProperties();
  }

  /**
   * S├®lectionne un ├®l├®ment al├®atoire pond├®r├®.
   * @param items - Liste des ├®l├®ments.
   * @param weights - Poids associ├®s.
   * @returns ├ël├®ment s├®lectionn├®.
   */
  private getWeightedRandom<T>(items: T[], weights: number[]): T {
    let totalWeight = 0;
    for (const weight of weights) {
      totalWeight += weight;
    }

    let random = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random < 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Met ├á jour les propri├®t├®s de la m├®t├®o (temp├®rature, vent, etc.).
   */
  private updateWeatherProperties(): void {
    const season = this.worldState.season;
    const weather = this.worldState.weather;

    // Temp├®ratures selon la saison et la m├®t├®o
    const baseTemperatures: Record<Season, { min: number; max: number }> = {
      hiver: { min: -20, max: -5 },
      printemps: { min: -5, max: 15 },
      ete: { min: 15, max: 30 },
      automne: { min: 0, max: 15 },
    };

    const weatherModifiers: Record<WeatherType, { temp: number; wind: number }> = {
      clear: { temp: 0, wind: 0 },
      rain: { temp: -2, wind: 5 },
      snow: { temp: -5, wind: 10 },
      fog: { temp: -1, wind: 0 },
      storm: { temp: -3, wind: 20 },
      blizzard: { temp: -15, wind: 30 },
      poudrerie: { temp: -10, wind: 25 },
      verglas: { temp: -2, wind: 5 },
      tempete_neige: { temp: -12, wind: 25 },
      froid_polaire: { temp: -25, wind: 35 },
      pluie_fine: { temp: -1, wind: 2 },
      orage_ete: { temp: -3, wind: 15 },
      nuageux: { temp: -1, wind: 5 },
    };

    const baseTemp = baseTemperatures[season];
    const weatherMod = weatherModifiers[weather] || { temp: 0, wind: 0 };

    // G├®n├®rer une temp├®rature al├®atoire dans la plage de base
    const temp = baseTemp.min + Math.random() * (baseTemp.max - baseTemp.min) + weatherMod.temp;
    this.worldState.temperature = Math.round(temp);

    // G├®n├®rer une vitesse de vent al├®atoire
    const baseWind = 5 + Math.random() * 15;
    this.worldState.windSpeed = Math.round(baseWind + weatherMod.wind);
    this.worldState.windDirection = Math.random() * 360;

    // Mettre ├á jour la densit├® et la couleur du brouillard
    const fogSettings: Record<WeatherType, { density: number; color: number }> = {
      clear: { density: 0.00125, color: 0x879fb5 },
      rain: { density: 0.0018, color: 0x6a7a8a },
      snow: { density: 0.002, color: 0xa8b8c8 },
      fog: { density: 0.003, color: 0x8a8a8a },
      storm: { density: 0.0025, color: 0x4a5a6a },
      blizzard: { density: 0.0035, color: 0xc8d8e8 },
      poudrerie: { density: 0.0028, color: 0xd8e8f8 },
      verglas: { density: 0.0015, color: 0x7a8a9a },
      tempete_neige: { density: 0.0032, color: 0xb8c8d8 },
      froid_polaire: { density: 0.0025, color: 0xd8e8f8 },
      pluie_fine: { density: 0.0015, color: 0x7a8a9a },
      orage_ete: { density: 0.002, color: 0x4a5a6a },
      nuageux: { density: 0.0015, color: 0x7a8a9a },
    };

    const fogSetting = fogSettings[weather] || fogSettings.clear;
    this.worldState.fogDensity = fogSetting.density;
    this.worldState.fogColor = fogSetting.color;
  }

  /**
   * Met ├á jour les PNJ.
   * @param hoursPassed - Nombre d'heures ├®coul├®es.
   */
  private updateNPCs(hoursPassed: number): void {
    for (const npc of this.npcs) {
      // Mettre ├á jour l'activit├® actuelle
      const currentHour = this.worldState.currentTime;
      let newActivity: string | undefined;

      for (const activity of npc.schedule) {
        if (currentHour >= activity.startHour && currentHour < activity.endHour) {
          newActivity = activity.type;
          break;
        }
      }

      // Si aucune activit├® n'est trouv├®e, le PNJ dort
      if (!newActivity) {
        newActivity = "sleep";
      }

      npc.currentActivity = newActivity;

      // Mettre ├á jour la position selon l'activit├®
      this.updateNPCPosition(npc, hoursPassed);

      // Mettre ├á jour les besoins
      this.updateNPCNeeds(npc, hoursPassed);

      // Mettre ├á jour le mood
      this.updateNPCMood(npc);
    }
  }

  /**
   * Met ├á jour la position d'un PNJ selon son activit├®.
   * @param npc - PNJ ├á mettre ├á jour.
   * @param hoursPassed - Nombre d'heures ├®coul├®es.
   */
  private updateNPCPosition(npc: ExtendedNPC, hoursPassed: number): void {
    const currentHour = this.worldState.currentTime;

    // Si le PNJ est en prison, ne pas d├®placer
    if (npc.isArrested) return;

    // Trouver le b├ótiment actuel
    let targetBuilding: CityBuilding | undefined;
    if (npc.currentActivity === "work" && npc.workBuildingId) {
      for (const city of this.cityBuildings) {
        const building = city.buildings.find((b) => b.id === npc.workBuildingId);
        if (building) {
          targetBuilding = building;
          break;
        }
      }
    } else if (npc.currentActivity === "sleep" && npc.homeBuildingId) {
      for (const city of this.cityBuildings) {
        const building = city.buildings.find((b) => b.id === npc.homeBuildingId);
        if (building) {
          targetBuilding = building;
          break;
        }
      }
    }

    // Si une cible est trouv├®e, d├®placer le PNJ vers celle-ci
    if (targetBuilding) {
      const dx = targetBuilding.x - npc.position.x;
      const dz = targetBuilding.z - npc.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance > 1) {
        // D├®placer le PNJ vers la cible
        const speed = npc.speed * hoursPassed;
        const moveX = (dx / distance) * speed;
        const moveZ = (dz / distance) * speed;

        npc.position.x += moveX;
        npc.position.z += moveZ;
        npc.position.y = getTerrainHeight(npc.position.x, npc.position.z);
      }
    } else {
      // D├®placement al├®atoire
      const moveX = (Math.random() - 0.5) * npc.speed * hoursPassed * 10;
      const moveZ = (Math.random() - 0.5) * npc.speed * hoursPassed * 10;

      npc.position.x += moveX;
      npc.position.z += moveZ;
      npc.position.y = getTerrainHeight(npc.position.x, npc.position.z);
    }
  }

  /**
   * Met ├á jour les besoins d'un PNJ.
   * @param npc - PNJ ├á mettre ├á jour.
   * @param hoursPassed - Nombre d'heures ├®coul├®es.
   */
  private updateNPCNeeds(npc: ExtendedNPC, hoursPassed: number): void {
    // Les besoins diminuent avec le temps
    for (const [need, value] of Object.entries(npc.needs)) {
      // Certains besoins diminuent plus vite selon l'activit├®
      let decayRate = 0.5 * hoursPassed;

      if (npc.currentActivity === "work" && (need === "nourriture" || need === "loisirs")) {
        decayRate *= 1.5;
      } else if (npc.currentActivity === "sleep") {
        if (need === "logement" || need === "sante") {
          decayRate = -0.8 * hoursPassed; // Ces besoins augmentent pendant le sommeil
        } else {
          decayRate *= 0.5;
        }
      } else if (npc.currentActivity === "eat") {
        if (need === "nourriture") {
          decayRate = -1.5 * hoursPassed; // La nourriture augmente en mangeant
        }
      }

      npc.needs[need] = Math.max(0, Math.min(100, value - decayRate));
    }
  }

  /**
   * Met ├á jour le mood d'un PNJ selon ses besoins.
   * @param npc - PNJ ├á mettre ├á jour.
   */
  private updateNPCMood(npc: ExtendedNPC): void {
    const avgNeed = Object.values(npc.needs).reduce((a, b) => a + b, 0) / Object.keys(npc.needs).length;

    if (avgNeed > 80) {
      npc.mood = "heureux";
    } else if (avgNeed > 60) {
      npc.mood = "content";
    } else if (avgNeed > 40) {
      npc.mood = "neutre";
    } else if (avgNeed > 20) {
      npc.mood = "m├®content";
    } else if (avgNeed > 10) {
      npc.mood = "f├óch├®";
    } else {
      npc.mood = "apeur├®";
    }

    // Modifier le mood selon l'activit├®
    if (npc.currentActivity === "work" && npc.mood === "heureux") {
      npc.mood = "content";
    } else if (npc.currentActivity === "sleep" && npc.mood === "f├óch├®") {
      npc.mood = "m├®content";
    }
  }

  /**
   * Met ├á jour les statistiques du monde.
   * @param deltaTime - Temps ├®coul├® (en secondes).
   */
  private updateStatistics(deltaTime: number): void {
    const deltaHours = deltaTime / 3600;

    // Mettre ├á jour les revenus et d├®penses
    for (const city of this.cityBuildings) {
      this.worldState.statistics.moneyEarned += city.stats.taxRevenue * deltaHours;
      this.worldState.statistics.moneySpent += city.stats.maintenanceCost * deltaHours;
    }

    // Mettre ├á jour la population
    this.worldState.population = 0;
    for (const city of this.cityBuildings) {
      this.worldState.population += city.stats.population;
    }
  }

  // ... (La suite du code sera dans la partie 2, avec les fonctions de tick, d'interaction, etc.)
}
