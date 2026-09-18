/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🌐 CONFIGURATION DU MONDE — SECTEURS, ZONAGE RP & LOGIQUE DE SPAWN (v4.0)
 * Fichier: src/game/worldconfig.ts
 *
 * 📌 DESCRIPTION:
 * Gestionnaire de zonage géolocalisé et dynamique de la MRC de Portneuf.
 * Ce système intègre :
 *  - Profils de zones avec comportements RP réalistes
 *  - Système de sécurité et patrouilles SQ dynamique
 *  - Gestion des activités économiques et culturelles par zone
 *  - Impact des saisons et de la météo sur les zones
 *  - Système de quêtes et événements locaux
 *  - Règles de zonage et construction
 *
 * 📌 VERSION:
 * v4.0.0 - Intégration complète du système RP
 *
 * 📌 DÉPENDANCES:
 * - ./worlddata (pour les données géographiques)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import {
  A40_Z,
  closestOnPolyline,
  LAKES,
  PAPETERIE,
  POIS,
  PRISON,
  RIVER_Z,
  ROADS,
  getTerrainHeight,
  villageCivicSpot,
  VILLAGES,
  WORLD,
  type Industry,
} from "./worlddata";

// ============================================================================
// 🔹 TYPES ET INTERFACES RP
// ============================================================================

/** Type de zone RP. */
export type RpZoneKind =
  | "village"
  | "ville"
  | "highway"
  | "forest"
  | "prison"
  | "industrie"
  | "fleuve"
  | "institution"
  | "campagne"
  | "parc_national"
  | "zone_agricole"
  | "zone_commerciale"
  | "zone_residentielle"
  | "zone_industrielle"
  | "zone_touristique"
  | "zone_historique";

/** Type de surface de route. */
export type SurfaceKey =
  | "asphalt"
  | "village"
  | "gravel"
  | "sand"
  | "grass"
  | "clay"
  | "dirt"
  | "ice"
  | "water"
  | "forest"
  | "parking"
  | "pave"
  | "neige"
  | "glace";

/** Mélange de types de véhicules. */
export type TrafficMix = {
  voiture: number;
  pickup: number;
  tracteur: number;
  camion: number;
  moto?: number;
  velo?: number;
  depanneuse?: number;
  police?: number;
  pompier?: number;
  ambulance?: number;
};

/** Type de biome pour la faune et la flore. */
export type BiomeType =
  | "foret_conifere"
  | "foret_feuille"
  | "foret_mixte"
  | "plaine_agricole"
  | "prairie"
  | "zone_urbaine"
  | "zone_industrielle"
  | "riviere"
  | "lac"
  | "marais"
  | "montagne"
  | "littoral";

/** Type d'activité économique. */
export type EconomicActivity =
  | Industry
  | "chasse"
  | "commerce"
  | "industrie"
  | "artisanat"
  | "services"
  | "education"
  | "sante"
  | "elevage"
  | "transport"
  | "transport_fluvial"
  | "construction"
  | "securite";

/** Type de crime. */
export type CrimeType =
  | "vol"
  | "vandalisme"
  | "aggression"
  | "meurtre"
  | "fraude"
  | "trafic"
  | "incendie_criminel"
  | "conduite_dangereuse"
  | "braconnage"
  | "pollution"
  | "peche_illegale"
  | "evasion"
  | "bagarre"
  | "sabotage";

/** Niveau de sécurité (0-100). */
export type SecurityLevel = number;

/** Niveau de pollution (0-100). */
export type PollutionLevel = number;

/** Niveau de richesse (0-100). */
export type WealthLevel = number;

/** Type de faction dominante. */
export type DominantFaction =
  | "agriculteurs"
  | "bucherons"
  | "pecheurs"
  | "chasseurs"
  | "commercants"
  | "industriels"
  | "police"
  | "pompiers"
  | "medecins"
  | "mairie"
  | "criminels"
  | "touristes"
  | "autochtones"
  | "environnementalistes"
  | "citoyens";

/** Type d'événement local. */
export type LocalEventType =
  | "festival"
  | "marche"
  | "feux_artifice"
  | "concert"
  | "foire_agricole"
  | "course"
  | "tournament"
  | "incendie"
  | "inondation"
  | "tempete"
  | "epidemie"
  | "accident"
  | "manifestation"
  | "election"
  | "chasse_au_tresor"
  | "chasse"
  | "foire";

/** Configuration d'un événement local. */
export interface LocalEvent {
  id: string;
  type: LocalEventType;
  name: string;
  description: string;
  startDay: number; // Jour de début (dans l'année)
  duration: number; // Durée en jours
  startHour?: number; // Heure de début (0-23)
  endHour?: number; // Heure de fin (0-23)
  location: { x: number; z: number };
  organizer?: string; // Organisateur (ID du PNJ ou faction)
  participants?: string[]; // Participants (IDs des PNJ)
  rewards?: {
    money?: number;
    reputation?: Partial<Record<DominantFaction, number>>;
    items?: string[];
    unlocks?: string[];
  };
  recurrence?: "daily" | "weekly" | "monthly" | "yearly" | "none";
  isActive: boolean;
}

/** Configuration d'une zone avec propriétés RP. */
export interface ZoneConfig {
  // 🔹 PROPRIÉTÉS DE BASE (existantes)
  zoneName: string;
  displayName: string;
  village: string | null;
  roadSurface: SurfaceKey;
  speedLimit: number;
  npcDensity: number;
  trafficMix: TrafficMix;
  pedestrianDensity: number;
  wildlifeDensity: number;
  ambientSound: string;
  ambientVolume: number;
  fogDensity: number;
  fogColor: string;
  policeResponseSeconds: number;
  allowVehicleSpawn: boolean;
  isSafeZone: boolean;
  priority: number;
  rpType: RpZoneKind;

  // 🔹 NOUVELLES PROPRIÉTÉS RP

  // 🌍 PROPRIÉTÉS GÉOGRAPHIQUES ET ENVIRONNEMENTALES
  biome?: BiomeType; // Type de biome pour la faune/flore
  altitude?: number; // Altitude moyenne (mètres)
  humidity?: number; // Humidité (0-100)
  temperatureRange?: { min: number; max: number }; // Plage de température (°C)
  precipitation?: number; // Précipitations moyennes (0-100)

  // 🏙️ PROPRIÉTÉS SOCIO-ÉCONOMIQUES
  population?: number; // Population de la zone
  wealthLevel?: WealthLevel; // Niveau de richesse (0-100)
  economicActivity?: EconomicActivity[]; // Activités économiques principales
  mainIndustry?: EconomicActivity; // Industrie principale
  employmentRate?: number; // Taux d'emploi (0-100)
  averageIncome?: number; // Revenu moyen (en $/an)

  // 🛡️ PROPRIÉTÉS DE SÉCURITÉ ET JUSTICE
  securityLevel?: SecurityLevel; // Niveau de sécurité (0-100)
  crimeRate?: number; // Taux de criminalité (0-100)
  crimeTypes?: CrimeType[]; // Types de crimes fréquents
  dominantFaction?: DominantFaction; // Faction dominante
  sqPatrolFrequency?: number; // Fréquence des patrouilles SQ (0-1)
  sqStation?: string; // Poste de police le plus proche (ID)
  fireStation?: string; // Caserne de pompiers la plus proche (ID)
  hospital?: string; // Hôpital le plus proche (ID)
  allowOpenCarrying?: boolean; // Port d'arme apparent autorisé

  // 🏗️ PROPRIÉTÉS DE ZONAGE ET CONSTRUCTION
  zoningRules?: {
    allowedBuildingTypes?: string[]; // Types de bâtiments autorisés
    maxBuildingHeight?: number; // Hauteur maximale des bâtiments (mètres)
    maxBuildingDensity?: number; // Densité maximale de construction (0-1)
    minLotSize?: number; // Taille minimale des lots (m²)
    buildingPermitCost?: number; // Coût du permis de construire ($)
    buildingPermitDays?: number; // Délai pour obtenir un permis (jours)
    demolitionAllowed?: boolean; // Démolition autorisée
    historicalPreservation?: boolean; // Préservation historique
  };

  // 🌱 PROPRIÉTÉS ENVIRONNEMENTALES
  pollutionLevel?: PollutionLevel; // Niveau de pollution (0-100)
  airQuality?: number; // Qualité de l'air (0-100)
  waterQuality?: number; // Qualité de l'eau (0-100)
  greenSpaces?: number; // Espaces verts (%)
  recyclingRate?: number; // Taux de recyclage (0-100)

  // 🎭 PROPRIÉTÉS CULTURELLES
  primaryLanguage?: "francais" | "anglais" | "autochtone"; // Langue principale
  culturalHeritage?: string[]; // Patrimoine culturel (ex: "Québécois", "Autochtone")
  traditions?: string[]; // Traditions locales
  holidays?: string[]; // Jours fériés locaux

  // 💰 PROPRIÉTÉS ÉCONOMIQUES
  propertyTaxRate?: number; // Taux de taxe foncière (0-1)
  salesTaxRate?: number; // Taux de taxe de vente (0-1)
  businessTaxRate?: number; // Taux de taxe commerciale (0-1)
  averagePropertyValue?: number; // Valeur moyenne des propriétés ($)
  costOfLiving?: number; // Coût de la vie (0-100, 100 = très cher)

  // 🎯 PROPRIÉTÉS DE JEU (RP)
  reputation?: number; // Réputation de la zone (0-100)
  playerReputationImpact?: number; // Impact sur la réputation du joueur
  discoveryRequired?: boolean; // Zone à découvrir
  discoveryReward?: {
    experience?: number;
    money?: number;
    reputation?: number;
  };
  restrictedAccess?: boolean; // Accès restreint
  requiredReputation?: number; // Réputation requise pour accéder
  requiredLevel?: number; // Niveau du joueur requis
  requiredItems?: string[]; // Objets requis pour accéder
  requiredFaction?: DominantFaction; // Faction requise pour accéder

  // 🎪 ÉVÉNEMENTS LOCAUX
  localEvents?: LocalEvent[]; // Événements spécifiques à la zone
  eventProbability?: number; // Probabilité d'événements aléatoires (0-1)
  seasonalEvents?: Record<string, LocalEvent[]>; // Événements saisonniers

  // 🚗 PROPRIÉTÉS DE TRANSPORT
  publicTransport?: {
    busRoutes?: string[]; // Lignes de bus
    busFrequency?: number; // Fréquence des bus (minutes)
    taxiAvailable?: boolean; // Taxis disponibles
    bikeLanes?: boolean; // Pistes cyclables
    walkability?: number; // Accessibilité piétonne (0-100)
  };

  // 🏨 PROPRIÉTÉS DE SERVICES
  services?: {
    hasSchool?: boolean; // École présente
    hasHospital?: boolean; // Hôpital présent
    hasPoliceStation?: boolean; // Poste de police présent
    hasFireStation?: boolean; // Caserne de pompiers présente
    hasPostOffice?: boolean; // Bureau de poste présent
    hasLibrary?: boolean; // Bibliothèque présente
    hasPark?: boolean; // Parc présent
    hasMarket?: boolean; // Marché présent
    hasBank?: boolean; // Banque présente
    hasGasStation?: boolean; // Station-service présente
    hasRestaurant?: boolean; // Restaurant présent
    hasHotel?: boolean; // Hôtel présent
  };

  // 🌿 PROPRIÉTÉS DE FAUNE ET FLORE
  wildlife?: {
    species?: string[]; // Espèces animales présentes
    plantSpecies?: string[]; // Espèces végétales présentes
    huntingAllowed?: boolean; // Chasse autorisée
    fishingAllowed?: boolean; // Pêche autorisée
    gatheringAllowed?: boolean; // Cueillette autorisée
    protectedSpecies?: string[]; // Espèces protégées
  };

  // ⛅ PROPRIÉTÉS DE RISQUES NATURELS
  naturalHazards?: {
    floodRisk?: number; // Risque d'inondation (0-100)
    fireRisk?: number; // Risque d'incendie (0-100)
    earthquakeRisk?: number; // Risque de séisme (0-100)
    landslideRisk?: number; // Risque de glissement de terrain (0-100)
    stormRisk?: number; // Risque de tempête (0-100)
  };

  // 🎨 PROPRIÉTÉS VISUELLES ET SONORES
  visualTheme?: {
    dominantColors?: number[]; // Couleurs dominantes (hex)
    lighting?: {
      ambient?: number; // Éclairage ambiant (0-1)
      direction?: number; // Direction de la lumière
      color?: number; // Couleur de la lumière
    };
    particleEffects?: string[]; // Effets de particules (ex: "neige", "poussière")
  };

  // 📜 PROPRIÉTÉS HISTORIQUES
  history?: {
    foundingYear?: number; // Année de fondation
    historicalSignificance?: number; // Importance historique (0-100)
    historicalEvents?: string[]; // Événements historiques
    heritageSites?: string[]; // Sites patrimoniaux
  };

  // 🎯 QUÊTES ASSOCIÉES
  quests?: {
    availableQuests?: string[]; // Quêtes disponibles dans cette zone
    questProbability?: number; // Probabilité de quêtes aléatoires (0-1)
    requiredQuests?: string[]; // Quêtes requises pour débloquer la zone
  };
}

/** Type de forme de limite de zone. */
export type ShapeType = "circle" | "box" | "corridor" | "polygon";

/** Limite d'une zone. */
export interface ZoneBound {
  zoneName: string;
  shapeType: ShapeType;
  centerX?: number;
  centerZ?: number;
  radius?: number;
  minX?: number;
  minZ?: number;
  maxX?: number;
  maxZ?: number;
  pathPoints?: Array<[number, number]>;
  corridorWidth?: number;
  polygonPoints?: Array<[number, number]>; // Pour les polygones
}

/** Type de point de spawn. */
export type SpawnKind = "vehicle" | "pedestrian" | "wildlife" | "event" | "npc" | "animal";

/** Point de spawn avec propriétés RP. */
export interface SpawnPoint {
  id: string;
  zoneName: string;
  spawnType: SpawnKind;
  posX: number;
  posY: number;
  posZ: number;
  heading: number;
  activeFromHour: number;
  activeToHour: number;
  weight: number; // Poids pour le spawn aléatoire
  enabled: boolean;

  // 🔹 NOUVELLES PROPRIÉTÉS RP
  minLevel?: number; // Niveau minimum du joueur pour spawner
  requiredReputation?: number; // Réputation requise
  requiredFaction?: DominantFaction; // Faction requise
  requiredItems?: string[]; // Objets requis
  requiredWeather?: string[]; // Météo requise
  requiredSeason?: string[]; // Saison requise
  requiredTime?: { min: number; max: number }; // Heure requise (0-23)
  cooldown?: number; // Délai entre les spawns (secondes)
  lastSpawn?: number; // Dernier spawn (timestamp)
  maxSpawns?: number; // Nombre maximum de spawns simultanés
  currentSpawns?: number; // Nombre actuel de spawns
  spawnGroup?: string; // Groupe de spawn (pour synchronisation)
  despawnOnLeave?: boolean; // Déspawn si le joueur quitte la zone
  despawnDistance?: number; // Distance de déspawn (mètres)
  persistence?: boolean; // Persistance après le spawn
}

/** Configuration d'un groupe de spawns. */
export interface SpawnGroup {
  id: string;
  name: string;
  spawnPoints: string[]; // IDs des points de spawn
  maxActive?: number; // Nombre maximum de spawns actifs
  cooldown?: number; // Délai entre les spawns (secondes)
  priority?: number; // Priorité du groupe
}

/** Configuration des patrouilles SQ. */
export interface SQPatrolConfig {
  zoneName: string;
  patrolRoute: Array<[number, number]>; // Points de la route de patrouille
  patrolFrequency: number; // Fréquence des patrouilles (0-1)
  vehicleType: "voiture" | "pickup" | "moto"; // Type de véhicule de patrouille
  officerCount: number; // Nombre de policiers par patrouille
  responseTime: number; // Temps de réponse (secondes)
  priorityAreas?: Array<[number, number, number]>; // Zones prioritaires [x, z, radius]
}

/** Configuration des routes commerciales. */
export interface TradeRoute {
  id: string;
  name: string;
  start: { x: number; z: number; village?: string };
  end: { x: number; z: number; village?: string };
  goods: string[]; // Types de marchandises transportées
  frequency: number; // Fréquence des convois (par jour)
  vehicleType: "camion" | "tracteur" | "pickup";
  capacity: number; // Capacité de transport
  activeHours: { from: number; to: number }; // Heures d'activité
}

/** Configuration des points d'intérêt (POI). */
export interface POI {
  id: string;
  name: string;
  description: string;
  x: number;
  z: number;
  type: "historique" | "naturel" | "commercial" | "institutionnel" | "touristique" | "industriel" | "agricole";
  zoneName: string;
  icon?: string; // Icône pour la mini-carte
  discoveryReward?: {
    experience?: number;
    money?: number;
    reputation?: number | Partial<Record<DominantFaction, number>>;
    items?: string[];
  };
  isDiscovered?: boolean; // Découvert par le joueur
  requiredLevel?: number; // Niveau requis pour découvrir
  quests?: string[]; // Quêtes associées
  events?: string[]; // Événements associés
}

/** Système de configuration du monde. */
export interface WorldConfigSystem {
  at(x: number, z: number): ZoneConfig;
  policeCatchMul(x: number, z: number): number;
  hourOpen(sp: SpawnPoint, hour: number): boolean;
  spawnsOf(type: SpawnKind, hour: number): SpawnPoint[];
  describe(x: number, z: number): string;
  getZoneByName(zoneName: string): ZoneConfig | undefined;
  getZoneByPosition(x: number, z: number): ZoneConfig | undefined;
  getAllZones(): ZoneConfig[];
  getSpawnPointsByType(type: SpawnKind): SpawnPoint[];
  getSpawnPointsInZone(zoneName: string): SpawnPoint[];
  getActiveSpawnPoints(type: SpawnKind, hour: number): SpawnPoint[];
  getPOIs(): POI[];
  getPOIById(poiId: string): POI | undefined;
  getPOIsInZone(zoneName: string): POI[];
  getNearestPOI(x: number, z: number, maxDistance?: number): POI | null;
  getLocalEvents(zoneName: string): LocalEvent[];
  getActiveLocalEvents(): LocalEvent[];
  getZoneReputation(zoneName: string): number;
  updateZoneReputation(zoneName: string, change: number): void;
  isZoneAccessible(zoneName: string, playerLevel: number, playerReputation: number, playerItems: string[]): boolean;
  getZoneEconomicActivity(zoneName: string): EconomicActivity[];
  getZoneServices(zoneName: string): ZoneConfig["services"];
  getZoneNaturalHazards(zoneName: string): ZoneConfig["naturalHazards"];
  getZoneWildlife(zoneName: string): ZoneConfig["wildlife"];
  getZoneQuests(zoneName: string): string[];
  getZoneFaction(zoneName: string): DominantFaction | undefined;
  getZoneBiome(zoneName: string): BiomeType | undefined;
  pickTrafficKind(mix: TrafficMix, i: number): "voiture" | "pickup" | "tracteur" | "camion" | "moto" | "velo";
  parseFogColor(...args: any[]): number;
}

// ============================================================================
// 🌍 DONNÉES STATIQUES (Mix de trafic par défaut)
// ============================================================================

// Mix de trafic pour les différentes zones
const MIX_URBAIN: TrafficMix = { voiture: 0.55, pickup: 0.25, tracteur: 0.02, camion: 0.18 };
const MIX_VILLAGE: TrafficMix = { voiture: 0.45, pickup: 0.32, tracteur: 0.15, camion: 0.08 };
const MIX_RANG: TrafficMix = { voiture: 0.18, pickup: 0.38, tracteur: 0.38, camion: 0.06 };
const MIX_A40: TrafficMix = { voiture: 0.48, pickup: 0.22, tracteur: 0.02, camion: 0.28 };
const MIX_138: TrafficMix = { voiture: 0.46, pickup: 0.34, tracteur: 0.05, camion: 0.15 };
const MIX_FOREST: TrafficMix = { voiture: 0.12, pickup: 0.58, tracteur: 0.25, camion: 0.05 };
const MIX_INDUSTRIEL: TrafficMix = { voiture: 0.25, pickup: 0.15, tracteur: 0.05, camion: 0.55 };
const MIX_HISTORIQUE: TrafficMix = { voiture: 0.30, pickup: 0.20, tracteur: 0.05, camion: 0.10, velo: 0.35 };
const MIX_TOURISTIQUE: TrafficMix = { voiture: 0.40, pickup: 0.10, tracteur: 0.05, camion: 0.05, velo: 0.40 };
const MIX_AGRICOLE: TrafficMix = { voiture: 0.10, pickup: 0.40, tracteur: 0.45, camion: 0.05 };
const MIX_PARC: TrafficMix = { voiture: 0.10, pickup: 0.10, tracteur: 0.05, camion: 0.05, velo: 0.70 };

// ============================================================================
// 🏗️ FONCTIONS DE CRÉATION DES CONFIGURATIONS
// ============================================================================

/**
 * Crée une configuration de zone avec des valeurs par défaut.
 * @param partial - Configuration partielle.
 * @returns Configuration complète.
 */
function cfg(partial: Partial<ZoneConfig>): ZoneConfig {
  // Valeurs par défaut pour les propriétés de base
  const defaults: ZoneConfig = {
    zoneName: "",
    displayName: "",
    village: null,
    roadSurface: "asphalt",
    speedLimit: 70,
    npcDensity: 0.2,
    trafficMix: MIX_RANG,
    pedestrianDensity: 0.1,
    wildlifeDensity: 0.2,
    ambientSound: "campagne",
    ambientVolume: 0.4,
    fogDensity: 0.0015,
    fogColor: "#8aa0a8",
    policeResponseSeconds: 300,
    allowVehicleSpawn: true,
    isSafeZone: false,
    priority: 0,
    rpType: "campagne",

    // Valeurs par défaut pour les nouvelles propriétés RP
    biome: "foret_mixte",
    altitude: 100,
    humidity: 50,
    temperatureRange: { min: -10, max: 25 },
    precipitation: 50,

    population: 0,
    wealthLevel: 50,
    economicActivity: [],
    mainIndustry: "agriculture",
    employmentRate: 80,
    averageIncome: 40000,

    securityLevel: 70,
    crimeRate: 10,
    crimeTypes: [],
    dominantFaction: "agriculteurs",
    sqPatrolFrequency: 0.5,
    sqStation: "",
    fireStation: "",
    hospital: "",
    allowOpenCarrying: false,

    zoningRules: {
      allowedBuildingTypes: ["maison", "grange", "scierie"],
      maxBuildingHeight: 10,
      maxBuildingDensity: 0.5,
      minLotSize: 1000,
      buildingPermitCost: 100,
      buildingPermitDays: 5,
      demolitionAllowed: true,
      historicalPreservation: false,
    },

    pollutionLevel: 20,
    airQuality: 80,
    waterQuality: 80,
    greenSpaces: 60,
    recyclingRate: 40,

    primaryLanguage: "francais",
    culturalHeritage: ["quebecois"],
    traditions: ["fetes_locales", "cuisine_traditionnelle"],
    holidays: ["fete_nationale", "action_de_grace"],

    propertyTaxRate: 0.01,
    salesTaxRate: 0.14975,
    businessTaxRate: 0.02,
    averagePropertyValue: 250000,
    costOfLiving: 50,

    visualTheme: {
      dominantColors: [0x4a6a4a, 0x6a8a6a, 0x8a8a8a],
      lighting: {
        ambient: 0.4,
        direction: 0.5,
        color: 0xffffff,
      },
      particleEffects: [],
    },

    history: {
      foundingYear: 1800,
      historicalSignificance: 30,
      historicalEvents: [],
      heritageSites: [],
    },

    publicTransport: {
      busRoutes: [],
      busFrequency: 30,
      taxiAvailable: false,
      bikeLanes: false,
      walkability: 60,
    },

    services: {
      hasSchool: false,
      hasHospital: false,
      hasPoliceStation: false,
      hasFireStation: false,
      hasPostOffice: false,
      hasLibrary: false,
      hasPark: false,
      hasMarket: false,
      hasBank: false,
      hasGasStation: false,
      hasRestaurant: false,
      hasHotel: false,
    },

    wildlife: {
      species: [],
      plantSpecies: [],
      huntingAllowed: false,
      fishingAllowed: false,
      gatheringAllowed: false,
      protectedSpecies: [],
    },

    naturalHazards: {
      floodRisk: 10,
      fireRisk: 20,
      earthquakeRisk: 5,
      landslideRisk: 10,
      stormRisk: 15,
    },

    quests: {
      availableQuests: [],
      questProbability: 0.1,
      requiredQuests: [],
    },
  };

  return { ...defaults, ...partial };
}

/**
 * Crée le catalogue complet des configurations de zones.
 * @returns Catalogue avec configurations, limites et points de spawn.
 */
function buildCatalog(): { configs: ZoneConfig[]; bounds: ZoneBound[]; spawns: SpawnPoint[]; pois: POI[]; patrols: SQPatrolConfig[]; tradeRoutes: TradeRoute[] } {
  const configs: ZoneConfig[] = [];
  const bounds: ZoneBound[] = [];
  const spawns: SpawnPoint[] = [];
  const pois: POI[] = [];
  const patrols: SQPatrolConfig[] = [];
  const tradeRoutes: TradeRoute[] = [];

  // ============================================================================
  // 🌍 ZONES GÉNÉRALES
  // ============================================================================

  // Campagne générale (zone par défaut)
  configs.push(
    cfg({
      zoneName: "campagne",
      displayName: "Grands rangs et terres de Portneuf",
      village: null,
      roadSurface: "grass",
      speedLimit: 70,
      npcDensity: 0.22,
      trafficMix: MIX_RANG,
      pedestrianDensity: 0.06,
      wildlifeDensity: 0.42,
      ambientSound: "vent_champs",
      ambientVolume: 0.4,
      fogDensity: 0.0014,
      fogColor: "#8aa0a8",
      policeResponseSeconds: 360,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 0,
      rpType: "campagne",

      // 🔹 PROPRIÉTÉS RP
      biome: "plaine_agricole",
      altitude: 50,
      humidity: 60,
      temperatureRange: { min: -15, max: 28 },
      precipitation: 45,

      population: 500,
      wealthLevel: 40,
      economicActivity: ["agriculture", "foresterie"],
      mainIndustry: "agriculture",
      employmentRate: 85,
      averageIncome: 35000,

      securityLevel: 80,
      crimeRate: 5,
      crimeTypes: ["vol", "vandalisme"],
      dominantFaction: "agriculteurs",
      sqPatrolFrequency: 0.3,
      allowOpenCarrying: true,

      zoningRules: {
        allowedBuildingTypes: ["maison", "duplex", "grange", "scierie", "silos"],
        maxBuildingHeight: 8,
        maxBuildingDensity: 0.3,
        minLotSize: 2000,
        buildingPermitCost: 50,
        buildingPermitDays: 3,
      },

      pollutionLevel: 10,
      airQuality: 90,
      waterQuality: 85,
      greenSpaces: 90,
      recyclingRate: 30,

      primaryLanguage: "francais",
      culturalHeritage: ["quebecois_rural", "agricole"],
      traditions: ["fetes_des_recoltes", "sucres"],
      holidays: ["fete_nationale", "action_de_grace", "noel"],

      propertyTaxRate: 0.008,
      salesTaxRate: 0.14975,
      businessTaxRate: 0.015,
      averagePropertyValue: 200000,
      costOfLiving: 40,

      publicTransport: {
        busRoutes: [],
        busFrequency: 0, // Pas de bus en campagne
        taxiAvailable: false,
        bikeLanes: false,
        walkability: 40,
      },

      services: {
        hasSchool: false,
        hasHospital: false,
        hasPoliceStation: false,
        hasFireStation: false,
        hasPostOffice: false,
        hasLibrary: false,
        hasPark: false,
        hasMarket: false,
        hasBank: false,
        hasGasStation: false,
        hasRestaurant: false,
        hasHotel: false,
      },

      wildlife: {
        species: ["cerf", "orignal", "coyote", "lièvre", "canard", "outarde"],
        plantSpecies: ["erable", "sapin", "bouleau", "ble", "mais", "foin"],
        huntingAllowed: true,
        fishingAllowed: false,
        gatheringAllowed: true,
        protectedSpecies: ["orignal"],
      },

      naturalHazards: {
        floodRisk: 15,
        fireRisk: 25,
        earthquakeRisk: 5,
        landslideRisk: 10,
        stormRisk: 20,
      },

      quests: {
        availableQuests: ["recolte_ble", "chasse_au_cerf", "construction_grange"],
        questProbability: 0.2,
        requiredQuests: [],
      },

      localEvents: [
        {
          id: "fete_des_recoltes",
          type: "festival",
          name: "Fête des Récoltes",
          description: "Célébration annuelle des récoltes avec musique, nourriture et danses traditionnelles.",
          startDay: 250, // Mi-septembre
          duration: 3,
          startHour: 10,
          endHour: 22,
          location: { x: -300, z: -500 },
          organizer: "maire_portneuf",
          rewards: {
            money: 100,
            reputation: { agriculteurs: 10, citoyens: 5 },
            items: ["panier_de_legumes"],
          },
          recurrence: "yearly",
          isActive: false,
        },
      ],
    }),
  );

  bounds.push({
    zoneName: "campagne",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: WORLD.minZ,
    maxZ: WORLD.maxZ,
  });

  // Laurentides Nord (zones forestières profondes)
  configs.push(
    cfg({
      zoneName: "laurentides",
      displayName: "Contreforts profonds du Bouclier canadien",
      village: null,
      roadSurface: "forest",
      speedLimit: 60,
      npcDensity: 0.05,
      trafficMix: MIX_FOREST,
      pedestrianDensity: 0.01,
      wildlifeDensity: 1.6,
      ambientSound: "foret_pins",
      ambientVolume: 0.65,
      fogDensity: 0.0022,
      fogColor: "#5c6e62",
      policeResponseSeconds: 520,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 1,
      rpType: "forest",

      // 🔹 PROPRIÉTÉS RP
      biome: "foret_conifere",
      altitude: 200,
      humidity: 70,
      temperatureRange: { min: -20, max: 20 },
      precipitation: 60,

      population: 100,
      wealthLevel: 30,
      economicActivity: ["foresterie", "chasse", "tourisme"],
      mainIndustry: "foresterie",
      employmentRate: 60,
      averageIncome: 30000,

      securityLevel: 60,
      crimeRate: 15,
      crimeTypes: ["braconnage", "vandalisme", "vol"],
      dominantFaction: "bucherons",
      sqPatrolFrequency: 0.1,
      allowOpenCarrying: true,

      zoningRules: {
        allowedBuildingTypes: ["cabane", "scierie", "chalet"],
        maxBuildingHeight: 6,
        maxBuildingDensity: 0.1,
        minLotSize: 5000,
        buildingPermitCost: 200,
        buildingPermitDays: 10,
        historicalPreservation: false,
      },

      pollutionLevel: 5,
      airQuality: 95,
      waterQuality: 90,
      greenSpaces: 99,
      recyclingRate: 20,

      primaryLanguage: "francais",
      culturalHeritage: ["quebecois", "autochtone"],
      traditions: ["chasse_traditionnelle", "cueillette"],
      holidays: ["fete_nationale", "solstice"],

      propertyTaxRate: 0.005,
      salesTaxRate: 0.14975,
      businessTaxRate: 0.01,
      averagePropertyValue: 150000,
      costOfLiving: 35,

      publicTransport: {
        busRoutes: [],
        busFrequency: 0,
        taxiAvailable: false,
        bikeLanes: false,
        walkability: 30,
      },

      services: {
        hasSchool: false,
        hasHospital: false,
        hasPoliceStation: false,
        hasFireStation: false,
        hasPostOffice: false,
        hasLibrary: false,
        hasPark: false,
        hasMarket: false,
        hasBank: false,
        hasGasStation: false,
        hasRestaurant: false,
        hasHotel: false,
      },

      wildlife: {
        species: ["orignal", "cerf", "coyote", "loup", "lynx", "ours", "castor"],
        plantSpecies: ["sapin", "epinette", "pin", "bouleau", "erable"],
        huntingAllowed: true,
        fishingAllowed: true,
        gatheringAllowed: true,
        protectedSpecies: ["loup", "lynx", "ours"],
      },

      naturalHazards: {
        floodRisk: 5,
        fireRisk: 80,
        earthquakeRisk: 10,
        landslideRisk: 20,
        stormRisk: 30,
      },

      quests: {
        availableQuests: ["chasse_a_l_orignal", "coupe_de_bois", "exploration_foret"],
        questProbability: 0.3,
        requiredQuests: [],
      },

      localEvents: [
        {
          id: "chasse_automne",
          type: "chasse",
          name: "Chasse à l'orignal",
          description: "Événement annuel de chasse à l'orignal. Ouvert aux chasseurs expérimentés.",
          startDay: 270, // Début octobre
          duration: 14,
          startHour: 6,
          endHour: 18,
          location: { x: -600, z: -600 },
          organizer: "chasseur_chef",
          rewards: {
            money: 200,
            reputation: { chasseurs: 15, bucherons: 10 },
            items: ["viande_orignal", "trophee"],
          },
          recurrence: "yearly",
          isActive: false,
        },
      ],
    }),
  );

  bounds.push({
    zoneName: "laurentides",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: WORLD.minZ,
    maxZ: -450,
  });

  // Plaine maraîchère
  configs.push(
    cfg({
      zoneName: "plaine_138",
      displayName: "Plaine maraîchère du Chemin du Roy",
      village: null,
      roadSurface: "dirt",
      speedLimit: 70,
      npcDensity: 0.2,
      trafficMix: MIX_AGRICOLE,
      pedestrianDensity: 0.05,
      wildlifeDensity: 0.28,
      ambientSound: "vent_champs",
      ambientVolume: 0.35,
      fogDensity: 0.0013,
      fogColor: "#93a493",
      policeResponseSeconds: 300,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 1,
      rpType: "zone_agricole",

      // 🔹 PROPRIÉTÉS RP
      biome: "plaine_agricole",
      altitude: 30,
      humidity: 65,
      temperatureRange: { min: -12, max: 28 },
      precipitation: 50,

      population: 800,
      wealthLevel: 45,
      economicActivity: ["agriculture", "elevage"],
      mainIndustry: "agriculture",
      employmentRate: 90,
      averageIncome: 40000,

      securityLevel: 85,
      crimeRate: 8,
      crimeTypes: ["vol", "vandalisme"],
      dominantFaction: "agriculteurs",
      sqPatrolFrequency: 0.4,
      allowOpenCarrying: false,

      zoningRules: {
        allowedBuildingTypes: ["maison", "ferme", "grange", "silos", "etable"],
        maxBuildingHeight: 12,
        maxBuildingDensity: 0.4,
        minLotSize: 1500,
        buildingPermitCost: 75,
        buildingPermitDays: 5,
      },

      pollutionLevel: 15,
      airQuality: 85,
      waterQuality: 80,
      greenSpaces: 85,
      recyclingRate: 35,

      primaryLanguage: "francais",
      culturalHeritage: ["quebecois_agricole"],
      traditions: ["fetes_des_recoltes", "concours_agricoles"],
      holidays: ["fete_nationale", "action_de_grace"],

      propertyTaxRate: 0.009,
      salesTaxRate: 0.14975,
      businessTaxRate: 0.018,
      averagePropertyValue: 220000,
      costOfLiving: 45,

      publicTransport: {
        busRoutes: ["ligne_agricole"],
        busFrequency: 60,
        taxiAvailable: false,
        bikeLanes: true,
        walkability: 50,
      },

      services: {
        hasSchool: true,
        hasHospital: false,
        hasPoliceStation: false,
        hasFireStation: false,
        hasPostOffice: false,
        hasLibrary: false,
        hasPark: false,
        hasMarket: true,
        hasBank: false,
        hasGasStation: true,
        hasRestaurant: false,
        hasHotel: false,
      },

      wildlife: {
        species: ["vache", "poulet", "canard", "cheval", "raton_laveur"],
        plantSpecies: ["ble", "mais", "soja", "foin", "tournesol"],
        huntingAllowed: false,
        fishingAllowed: false,
        gatheringAllowed: true,
        protectedSpecies: [],
      },

      naturalHazards: {
        floodRisk: 20,
        fireRisk: 30,
        earthquakeRisk: 5,
        landslideRisk: 5,
        stormRisk: 15,
      },

      quests: {
        availableQuests: ["recolte_ble", "soin_animaux", "livraison_produits"],
        questProbability: 0.25,
        requiredQuests: [],
      },

      localEvents: [
        {
          id: "foire_agricole",
          type: "foire",
          name: "Foire Agricole de Portneuf",
          description: "Exposition des meilleurs produits agricoles de la région avec concours et dégustations.",
          startDay: 240, // Fin août
          duration: 5,
          startHour: 9,
          endHour: 19,
          location: { x: -200, z: -400 },
          organizer: "association_agricole",
          rewards: {
            money: 150,
            reputation: { agriculteurs: 20, citoyens: 10 },
            items: ["outils_agricoles"],
          },
          recurrence: "yearly",
          isActive: false,
        },
      ],
    }),
  );

  bounds.push({
    zoneName: "plaine_138",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: A40_Z + 36,
    maxZ: RIVER_Z - 12,
  });

  // Fleuve Saint-Laurent
  configs.push(
    cfg({
      zoneName: "fleuve",
      displayName: "Chenal du Saint-Laurent (Voie maritime)",
      village: null,
      roadSurface: "water",
      speedLimit: 30,
      npcDensity: 0,
      trafficMix: MIX_138,
      pedestrianDensity: 0,
      wildlifeDensity: 0.6,
      ambientSound: "fleuve",
      ambientVolume: 0.7,
      fogDensity: 0.0018,
      fogColor: "#718799",
      policeResponseSeconds: 420,
      allowVehicleSpawn: false,
      isSafeZone: false,
      priority: 8,
      rpType: "fleuve",

      // 🔹 PROPRIÉTÉS RP
      biome: "riviere",
      altitude: 0,
      humidity: 90,
      temperatureRange: { min: -5, max: 25 },
      precipitation: 55,

      population: 0,
      wealthLevel: 0,
      economicActivity: ["peche", "transport_fluvial"],
      mainIndustry: "peche",
      employmentRate: 0,
      averageIncome: 0,

      securityLevel: 70,
      crimeRate: 20,
      crimeTypes: ["trafic", "peche_illegale"],
      dominantFaction: "pecheurs",
      sqPatrolFrequency: 0.2,
      allowOpenCarrying: true,

      zoningRules: {
        allowedBuildingTypes: ["quai", "phare", "entrepot"],
        maxBuildingHeight: 15,
        maxBuildingDensity: 0.2,
        minLotSize: 3000,
        buildingPermitCost: 300,
        buildingPermitDays: 15,
        historicalPreservation: false,
      },

      pollutionLevel: 30,
      airQuality: 70,
      waterQuality: 60,
      greenSpaces: 0,
      recyclingRate: 10,

      primaryLanguage: "francais",
      culturalHeritage: ["maritime"],
      traditions: ["peche_traditionnelle", "regates"],
      holidays: ["fete_nationale", "fete_de_la_peche"],

      propertyTaxRate: 0.01,
      salesTaxRate: 0.14975,
      businessTaxRate: 0.025,
      averagePropertyValue: 500000,
      costOfLiving: 0,

      publicTransport: {
        busRoutes: [],
        busFrequency: 0,
        taxiAvailable: false,
        bikeLanes: false,
        walkability: 0,
      },

      services: {
        hasSchool: false,
        hasHospital: false,
        hasPoliceStation: false,
        hasFireStation: false,
        hasPostOffice: false,
        hasLibrary: false,
        hasPark: false,
        hasMarket: false,
        hasBank: false,
        hasGasStation: false,
        hasRestaurant: false,
        hasHotel: false,
      },

      wildlife: {
        species: ["saumon", "truite", "esturgeon", "phoque", "baleine", "canard"],
        plantSpecies: ["algue", "roseau"],
        huntingAllowed: false,
        fishingAllowed: true,
        gatheringAllowed: false,
        protectedSpecies: ["baleine", "esturgeon"],
      },

      naturalHazards: {
        floodRisk: 90,
        fireRisk: 5,
        earthquakeRisk: 10,
        landslideRisk: 5,
        stormRisk: 40,
      },

      quests: {
        availableQuests: ["peche_au_saumon", "nettoyage_rive", "sauvetage_en_mer"],
        questProbability: 0.15,
        requiredQuests: [],
      },

      localEvents: [
        {
          id: "regate_ete",
          type: "course",
          name: "Régate du Saint-Laurent",
          description: "Course de voiliers sur le fleuve avec des équipes de toute la région.",
          startDay: 200, // Mi-juillet
          duration: 3,
          startHour: 10,
          endHour: 17,
          location: { x: 0, z: RIVER_Z + 50 },
          organizer: "club_nautique",
          rewards: {
            money: 300,
            reputation: { touristes: 15, citoyens: 10 },
            items: ["trophee_regate"],
          },
          recurrence: "yearly",
          isActive: false,
        },
      ],
    }),
  );

  bounds.push({
    zoneName: "fleuve",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: RIVER_Z - 10,
    maxZ: WORLD.maxZ,
  });

  // ============================================================================
  // 🏘️ ZONES DES VILLAGES ET VILLES
  // ============================================================================

  // Génération automatique pour TOUS les villages
  for (const v of VILLAGES) {
    const isCity = v.type === "ville";
    const zoneName = `v_${v.id}`;

    // Déterminer le type de zone
    const rpType: RpZoneKind = isCity ? "ville" :
                                  v.type === "hameau" ? "village" :
                                  v.industry === "agriculture" ? "zone_agricole" :
                                  v.industry === "foresterie" ? "forest" :
                                  v.industry === "tourisme" ? "zone_touristique" :
                                  "campagne";

    // Déterminer le mix de trafic
    const trafficMix = isCity ? MIX_URBAIN :
                         v.type === "hameau" ? MIX_VILLAGE :
                         v.industry === "agriculture" ? MIX_AGRICOLE :
                         v.industry === "foresterie" ? MIX_FOREST :
                         MIX_RANG;

    // Déterminer la surface de la route
    const roadSurface: SurfaceKey = isCity ? "asphalt" :
                                      v.type === "hameau" ? "dirt" :
                                      v.industry === "agriculture" ? "dirt" :
                                      "village";

    // Déterminer les services disponibles
    const services: ZoneConfig["services"] = {
      hasSchool: v.population > 500 || isCity,
      hasHospital: v.population > 2000 || isCity,
      hasPoliceStation: v.population > 1000 || isCity,
      hasFireStation: v.population > 1500 || isCity,
      hasPostOffice: v.population > 300 || isCity,
      hasLibrary: v.population > 800 || isCity,
      hasPark: true,
      hasMarket: v.population > 200 || isCity,
      hasBank: v.population > 1000 || isCity,
      hasGasStation: v.population > 500 || isCity,
      hasRestaurant: v.population > 300 || isCity,
      hasHotel: v.population > 1000 || isCity,
    };

    // Déterminer les activités économiques
    const economicActivity: EconomicActivity[] = [v.industry];
    if (v.population > 500) economicActivity.push("commerce");
    if (v.population > 1000) economicActivity.push("services");
    if (isCity) economicActivity.push("education", "sante");

    // Déterminer la faction dominante
    const dominantFaction: DominantFaction = v.industry === "agriculture" ? "agriculteurs" :
                                               v.industry === "foresterie" ? "bucherons" :
                                               v.industry === "peche" ? "pecheurs" :
                                               v.industry === "tourisme" ? "touristes" :
                                               isCity ? "commercants" : "citoyens";

    // Déterminer le biome
    const biome: BiomeType = v.name === "Saint-Ubalde" || v.name === "Rivière-à-Pierre" ? "foret_conifere" :
                              v.name === "Deschambault" || v.name === "Saint-Alban" ? "plaine_agricole" :
                              v.name === "Portneuf" || v.name === "Donnacona" ? "zone_urbaine" :
                              "foret_mixte";

    // Déterminer les événements locaux
    const localEvents: LocalEvent[] = [];
    if (v.population > 500) {
      localEvents.push({
        id: `festival_${v.id}`,
        type: "festival",
        name: `Fête de ${v.name}`,
        description: `Célébration annuelle de ${v.name} avec musique, nourriture et activités pour toute la famille.`,
        startDay: 180 + Math.floor(Math.random() * 60), // Entre juin et août
        duration: 3,
        startHour: 10,
        endHour: 22,
        location: { x: v.center[0], z: v.center[1] },
        organizer: `maire_${v.id}`,
        rewards: {
          money: 100,
          reputation: { [dominantFaction]: 10, citoyens: 5 },
          items: [`souvenir_${v.id}`],
        },
        recurrence: "yearly",
        isActive: false,
      });
    }
    if (v.industry === "agriculture") {
      localEvents.push({
        id: `foire_${v.id}`,
        type: "foire",
        name: `Foire Agricole de ${v.name}`,
        description: `Exposition des produits agricoles locaux avec concours et dégustations.`,
        startDay: 240 + Math.floor(Math.random() * 30), // Fin août
        duration: 2,
        startHour: 9,
        endHour: 18,
        location: { x: v.center[0], z: v.center[1] },
        organizer: `association_agricole_${v.id}`,
        rewards: {
          money: 150,
          reputation: { agriculteurs: 15, citoyens: 5 },
          items: ["outils_agricoles"],
        },
        recurrence: "yearly",
        isActive: false,
      });
    }

    // Déterminer les quêtes disponibles
    const availableQuests: string[] = [];
    if (v.industry === "agriculture") {
      availableQuests.push(`recolte_${v.id}`, `soin_animaux_${v.id}`);
    }
    if (v.industry === "foresterie") {
      availableQuests.push(`coupe_de_bois_${v.id}`, `construction_cabane_${v.id}`);
    }
    if (v.population > 500) {
      availableQuests.push(`livraison_${v.id}`, `construction_maison_${v.id}`);
    }
    if (isCity) {
      availableQuests.push(`enquete_policiere_${v.id}`, `renovation_batiment_${v.id}`);
    }

    // Déterminer les risques naturels
    const naturalHazards = {
      floodRisk: v.name === "Portneuf" || v.name === "Donnacona" ? 30 : 10,
      fireRisk: v.industry === "foresterie" ? 40 : 20,
      earthquakeRisk: 5,
      landslideRisk: v.name === "Saint-Ubalde" ? 20 : 10,
      stormRisk: 15,
    };

    // Créer la configuration de la zone
    configs.push(
      cfg({
        zoneName,
        displayName: isCity ? `${v.name} (Secteur Urbain)` : `${v.name} (Noyau Villageois)`,
        village: v.name,
        roadSurface,
        speedLimit: isCity ? 50 : 40,
        npcDensity: isCity ? 1.4 : v.type === "hameau" ? 0.4 : 0.9,
        trafficMix,
        pedestrianDensity: isCity ? 1.2 : 0.6,
        wildlifeDensity: isCity ? 0.02 : 0.1,
        ambientSound: isCity ? "ville_rue" : "village_matin",
        ambientVolume: isCity ? 0.5 : 0.45,
        fogDensity: 0.0012,
        fogColor: "#8aa0a8",
        policeResponseSeconds: v.policeResponse,
        allowVehicleSpawn: true,
        isSafeZone: false,
        priority: isCity ? 5 : 4,
        rpType,

        // 🔹 PROPRIÉTÉS RP
        biome,
        altitude: v.altitude || 100,
        humidity: 50 + (v.industry === "foresterie" ? 20 : 0),
        temperatureRange: { min: -20, max: 30 },
        precipitation: 40 + (v.industry === "agriculture" ? 10 : 0),

        population: v.population,
        wealthLevel: isCity ? 80 : v.population > 1000 ? 60 : 40,
        economicActivity,
        mainIndustry: v.industry,
        employmentRate: isCity ? 90 : 80 + v.population / 100,
        averageIncome: isCity ? 50000 : 30000 + v.population * 10,

        securityLevel: isCity ? 85 : 70 + v.population / 50,
        crimeRate: isCity ? 15 : 5 + (10 - v.population / 100),
        crimeTypes: isCity ? ["vol", "vandalisme", "aggression", "trafic"] :
                         ["vol", "vandalisme"],
        dominantFaction,
        sqPatrolFrequency: isCity ? 0.9 : 0.5,
        sqStation: isCity ? `poste_police_${v.id}` : v.population > 1000 ? `poste_police_${v.id}` : undefined,
        fireStation: isCity ? `caserne_${v.id}` : v.population > 1500 ? `caserne_${v.id}` : undefined,
        hospital: isCity ? `hopital_${v.id}` : v.population > 2000 ? `hopital_${v.id}` : undefined,
        allowOpenCarrying: !isCity && v.type !== "hameau",

        zoningRules: {
          allowedBuildingTypes: isCity ?
            ["immeuble", "maison", "commerce", "hotel", "ecole", "hopital", "mairie"] :
            v.type === "hameau" ?
            ["maison", "grange", "cabane"] :
            ["maison", "duplex", "commerce", "ecole", "eglise"],
          maxBuildingHeight: isCity ? 20 : 10,
          maxBuildingDensity: isCity ? 0.8 : 0.5,
          minLotSize: isCity ? 500 : 1000,
          buildingPermitCost: isCity ? 200 : 100,
          buildingPermitDays: isCity ? 10 : 5,
          demolitionAllowed: true,
          historicalPreservation: v.name === "Portneuf" || v.name === "Donnacona",
        },

        pollutionLevel: isCity ? 40 : v.industry === "industrie" ? 60 : 20,
        airQuality: isCity ? 60 : v.industry === "foresterie" ? 90 : 80,
        waterQuality: isCity ? 70 : 85,
        greenSpaces: isCity ? 30 : 70,
        recyclingRate: isCity ? 50 : 30,

        primaryLanguage: "francais",
        culturalHeritage: isCity ? ["quebecois_urbain"] :
                          v.industry === "agriculture" ? ["quebecois_agricole"] :
                          v.industry === "foresterie" ? ["quebecois_forestier"] :
                          ["quebecois_rural"],
        traditions: isCity ? ["fetes_urbaines", "evenements_culturels"] :
                           v.industry === "agriculture" ? ["fetes_des_recoltes", "concours_agricoles"] :
                           v.industry === "foresterie" ? ["chasse_traditionnelle", "coupe_de_bois"] :
                           ["fetes_locales", "assemblees_communautaires"],
        holidays: ["fete_nationale", "action_de_grace", "noel"],

        propertyTaxRate: isCity ? 0.015 : 0.01,
        salesTaxRate: 0.14975,
        businessTaxRate: isCity ? 0.025 : 0.018,
        averagePropertyValue: isCity ? 300000 : 200000,
        costOfLiving: isCity ? 70 : 50,

        publicTransport: {
          busRoutes: isCity ? [`ligne_${v.id}_1`, `ligne_${v.id}_2`] : v.population > 500 ? [`ligne_${v.id}`] : [],
          busFrequency: isCity ? 15 : 30,
          taxiAvailable: isCity || v.population > 1000,
          bikeLanes: isCity,
          walkability: isCity ? 80 : 60,
        },

        services,

        wildlife: {
          species: v.industry === "agriculture" ? ["vache", "poulet", "canard", "cheval"] :
                    v.industry === "foresterie" ? ["cerf", "orignal", "coyote", "lynx"] :
                    isCity ? ["pigeon", "rat", "chat", "chien"] :
                    ["cerf", "lièvre", "canard"],
          plantSpecies: v.industry === "agriculture" ? ["ble", "mais", "soja", "foin"] :
                          v.industry === "foresterie" ? ["sapin", "epinette", "erable"] :
                          isCity ? ["arbre_urbain", "fleur", "gazon"] :
                          ["erable", "bouleau", "sapin"],
          huntingAllowed: !isCity && v.industry !== "agriculture",
          fishingAllowed: !isCity && (v.industry === "peche" || v.name === "Portneuf" || v.name === "Deschambault"),
          gatheringAllowed: !isCity,
          protectedSpecies: v.industry === "foresterie" ? ["orignal", "lynx"] : [],
        },

        naturalHazards,

        quests: {
          availableQuests,
          questProbability: isCity ? 0.3 : 0.2,
          requiredQuests: isCity ? [`decouvrir_${v.id}`] : [],
        },

        localEvents,

        history: {
          foundingYear: v.foundingYear || 1800,
          historicalSignificance: isCity ? 80 : v.population > 500 ? 50 : 30,
          historicalEvents: v.name === "Portneuf" ? ["Fondation en 1679", "Développement industriel au XIXe siècle"] :
                           v.name === "Donnacona" ? ["Fondation en 1737", "Développement de la prison"] :
                           [],
          heritageSites: isCity ? [`mairie_${v.id}`, `eglise_${v.id}`] :
                             v.population > 500 ? [`eglise_${v.id}`] : [],
        },
      }),
    );

    // Ajouter la limite de la zone (cercle autour du village)
    bounds.push({
      zoneName,
      shapeType: "circle",
      centerX: v.center[0],
      centerZ: v.center[1],
      radius: v.coreRadius * 1.6,
    });

    // Ajouter des points d'intérêt pour les villages importants
    if (v.population > 500 || isCity) {
      pois.push(
        {
          id: `mairie_${v.id}`,
          name: `Mairie de ${v.name}`,
          description: `Siège de l'administration municipale de ${v.name}.`,
          x: v.center[0],
          z: v.center[1],
          type: "institutionnel",
          zoneName,
          icon: "mairie",
          discoveryReward: {
            experience: 50,
            money: 100,
            reputation: 10,
          },
          isDiscovered: false,
          requiredLevel: 1,
          quests: [`rencontrer_maire_${v.id}`],
        },
        {
          id: `eglise_${v.id}`,
          name: `Église de ${v.name}`,
          description: `Lieu de culte historique de ${v.name}, souvent au cœur des activités communautaires.`,
          x: v.center[0] + 50,
          z: v.center[1] + 30,
          type: "historique",
          zoneName,
          icon: "eglise",
          discoveryReward: {
            experience: 30,
            money: 50,
            reputation: 5,
          },
          isDiscovered: false,
          requiredLevel: 1,
        },
        {
          id: `marche_${v.id}`,
          name: `Marché de ${v.name}`,
          description: `Lieu où les habitants de ${v.name} viennent acheter et vendre des produits locaux.`,
          x: v.center[0] - 40,
          z: v.center[1] - 20,
          type: "commercial",
          zoneName,
          icon: "marche",
          discoveryReward: {
            experience: 20,
            money: 30,
          },
          isDiscovered: false,
          requiredLevel: 1,
        }
      );

      if (isCity) {
        pois.push(
          {
            id: `hopital_${v.id}`,
            name: `Hôpital de ${v.name}`,
            description: `Centre médical principal de ${v.name}, offrant des soins aux habitants.`,
            x: v.center[0] - 80,
            z: v.center[1] + 60,
            type: "institutionnel",
            zoneName,
            icon: "hopital",
            discoveryReward: {
              experience: 40,
              reputation: 5,
            },
            isDiscovered: false,
            requiredLevel: 5,
          },
          {
            id: `poste_police_${v.id}`,
            name: `Poste de Police de ${v.name}`,
            description: `Poste de la Sûreté du Québec pour ${v.name}.`,
            x: v.center[0] + 80,
            z: v.center[1] - 60,
            type: "institutionnel",
            zoneName,
            icon: "police",
            discoveryReward: {
              experience: 40,
              reputation: { police: 10 },
            },
            isDiscovered: false,
            requiredLevel: 3,
          }
        );
      }

      if (v.industry === "agriculture") {
        pois.push(
          {
            id: `ferme_${v.id}`,
            name: `Ferme Modèle de ${v.name}`,
            description: `Ferme exemplaire montrant les meilleures pratiques agricoles de la région.`,
            x: v.center[0] + 100,
            z: v.center[1] + 100,
            type: "agricole",
            zoneName,
            icon: "ferme",
            discoveryReward: {
              experience: 30,
              items: ["graines"],
            },
            isDiscovered: false,
            requiredLevel: 1,
            quests: [`recolte_${v.id}`],
          }
        );
      }

      if (v.industry === "foresterie") {
        pois.push(
          {
            id: `scierie_${v.id}`,
            name: `Scierie de ${v.name}`,
            description: `Scierie locale où le bois des forêts environnantes est transformé.`,
            x: v.center[0] - 100,
            z: v.center[1] - 100,
            type: "industriel",
            zoneName,
            icon: "scierie",
            discoveryReward: {
              experience: 30,
              items: ["planche"],
            },
            isDiscovered: false,
            requiredLevel: 1,
            quests: [`coupe_de_bois_${v.id}`],
          }
        );
      }

      // Ajouter des points de spawn pour les véhicules et piétons
      const spawnWeight = isCity ? 1.0 : 0.7;
      spawns.push(
        {
          id: `spawn_vehicule_${v.id}_1`,
          zoneName,
          spawnType: "vehicle",
          posX: v.center[0] + v.coreRadius * 0.8,
          posY: 0,
          posZ: v.center[1],
          heading: 0,
          activeFromHour: 6,
          activeToHour: 20,
          weight: spawnWeight,
          enabled: true,
          minLevel: 1,
        },
        {
          id: `spawn_vehicule_${v.id}_2`,
          zoneName,
          spawnType: "vehicle",
          posX: v.center[0] - v.coreRadius * 0.8,
          posY: 0,
          posZ: v.center[1],
          heading: Math.PI,
          activeFromHour: 6,
          activeToHour: 20,
          weight: spawnWeight,
          enabled: true,
          minLevel: 1,
        },
        {
          id: `spawn_pieton_${v.id}_1`,
          zoneName,
          spawnType: "pedestrian",
          posX: v.center[0],
          posY: 0,
          posZ: v.center[1] + v.coreRadius * 0.5,
          heading: Math.PI / 2,
          activeFromHour: 8,
          activeToHour: 18,
          weight: spawnWeight * 1.5,
          enabled: true,
          minLevel: 1,
        },
        {
          id: `spawn_pieton_${v.id}_2`,
          zoneName,
          spawnType: "pedestrian",
          posX: v.center[0],
          posY: 0,
          posZ: v.center[1] - v.coreRadius * 0.5,
          heading: -Math.PI / 2,
          activeFromHour: 8,
          activeToHour: 18,
          weight: spawnWeight * 1.5,
          enabled: true,
          minLevel: 1,
        }
      );

      // Ajouter des patrouilles SQ pour les villages importants
      if (v.population > 1000 || isCity) {
        patrols.push({
          zoneName,
          patrolRoute: [
            [v.center[0] - v.coreRadius, v.center[1] - v.coreRadius],
            [v.center[0] + v.coreRadius, v.center[1] - v.coreRadius],
            [v.center[0] + v.coreRadius, v.center[1] + v.coreRadius],
            [v.center[0] - v.coreRadius, v.center[1] + v.coreRadius],
          ],
          patrolFrequency: 0.8,
          vehicleType: "voiture",
          officerCount: 2,
          responseTime: v.policeResponse,
          priorityAreas: [
            [v.center[0], v.center[1], v.coreRadius * 0.5], // Centre-ville
            [v.center[0] + v.coreRadius * 0.8, v.center[1], 50], // Route principale
          ],
        });
      }

      // Ajouter des routes commerciales pour les villages industriels
      if (v.industry === "foresterie" || v.industry === "agriculture") {
        tradeRoutes.push({
          id: `route_commerciale_${v.id}`,
          name: `Route Commerciale de ${v.name}`,
          start: { x: v.center[0], z: v.center[1], village: v.name },
          end: { x: PRISON.x, z: PRISON.z, village: "Donnacona" },
          goods: v.industry === "foresterie" ? ["bois", "planches"] : ["ble", "mais", "legumes"],
          frequency: 1,
          vehicleType: "camion",
          capacity: 1000,
          activeHours: { from: 6, to: 18 },
        });
      }
    }
  }

  // ============================================================================
  // 🛣️ COULOIRS ROUTIERS
  // ============================================================================

  for (const road of ROADS) {
    if (road.kind === "ramp") continue;

    const isHighway = road.kind === "highway";
    const isGravel = road.surface === "gravel";
    const zoneName = `road_${road.id}`;

    // Déterminer le type RP
    const rpType: RpZoneKind = isHighway ? "highway" :
                                  isGravel ? "campagne" :
                                  road.village ? "village" : "campagne";

    // Déterminer la surface
    const surface: SurfaceKey = isGravel ? "gravel" :
                                 isHighway ? "asphalt" :
                                 road.village ? "village" : "asphalt";

    // Déterminer le mix de trafic
    const trafficMix = isHighway ? MIX_A40 :
                                  road.village ? MIX_VILLAGE :
                                  MIX_RANG;

    // Déterminer la faction dominante
    const dominantFaction: DominantFaction = isHighway ? "police" :
                                               isGravel ? "bucherons" :
                                               "commercants";

    // Créer la configuration de la zone
    configs.push(
      cfg({
        zoneName,
        displayName: road.name,
        village: road.village ?? null,
        roadSurface: surface,
        speedLimit: road.speed,
        npcDensity: isHighway ? 0.05 : 0.2,
        trafficMix,
        pedestrianDensity: isHighway ? 0 : 0.05,
        wildlifeDensity: isGravel ? 0.7 : 0.2,
        ambientSound: isHighway ? "autoroute" : "route",
        ambientVolume: 0.5,
        fogDensity: 0.0014,
        fogColor: "#8aa0a8",
        policeResponseSeconds: isHighway ? 90 : 200,
        allowVehicleSpawn: true,
        isSafeZone: false,
        priority: isHighway ? 6 : 2,
        rpType,

        // 🔹 PROPRIÉTÉS RP
        biome: isGravel ? "foret_mixte" : "zone_urbaine",
        altitude: 50,
        humidity: 40,
        temperatureRange: { min: -15, max: 30 },
        precipitation: 30,

        population: 0,
        wealthLevel: 0,
        economicActivity: ["transport"],
        mainIndustry: "transport",
        employmentRate: 0,
        averageIncome: 0,

        securityLevel: isHighway ? 80 : 60,
        crimeRate: isHighway ? 20 : 10,
        crimeTypes: isHighway ? ["conduite_dangereuse", "trafic"] : ["vol", "accident"],
        dominantFaction,
        sqPatrolFrequency: isHighway ? 0.8 : 0.4,
        allowOpenCarrying: !isHighway,

        zoningRules: {
          allowedBuildingTypes: isHighway ? [] : ["station_service", "relais_routier"],
          maxBuildingHeight: 5,
          maxBuildingDensity: 0.1,
          minLotSize: 2000,
          buildingPermitCost: 500,
          buildingPermitDays: 20,
        },

        pollutionLevel: isHighway ? 50 : 25,
        airQuality: isHighway ? 50 : 70,
        waterQuality: 80,
        greenSpaces: isHighway ? 5 : 30,
        recyclingRate: 20,

        primaryLanguage: "francais",
        culturalHeritage: ["quebecois"],
        traditions: [],
        holidays: [],

        propertyTaxRate: 0.01,
        salesTaxRate: 0.14975,
        businessTaxRate: 0.02,
        averagePropertyValue: 0,
        costOfLiving: 0,

        publicTransport: {
          busRoutes: isHighway ? [] : [`ligne_${road.id}`],
          busFrequency: isHighway ? 0 : 45,
          taxiAvailable: false,
          bikeLanes: false,
          walkability: isHighway ? 0 : 20,
        },

        services: {
          hasSchool: false,
          hasHospital: false,
          hasPoliceStation: false,
          hasFireStation: false,
          hasPostOffice: false,
          hasLibrary: false,
          hasPark: false,
          hasMarket: false,
          hasBank: false,
          hasGasStation: !isHighway,
          hasRestaurant: !isHighway,
          hasHotel: false,
        },

        wildlife: {
          species: isGravel ? ["cerf", "orignal", "coyote"] : ["pigeon", "corbeau"],
          plantSpecies: isGravel ? ["sapin", "erable", "bouleau"] : ["gazon", "fleur"],
          huntingAllowed: isGravel,
          fishingAllowed: false,
          gatheringAllowed: isGravel,
          protectedSpecies: isGravel ? ["orignal"] : [],
        },

        naturalHazards: {
          floodRisk: isHighway ? 5 : 10,
          fireRisk: isGravel ? 30 : 10,
          earthquakeRisk: 5,
          landslideRisk: isGravel ? 15 : 5,
          stormRisk: 10,
        },

        quests: {
          availableQuests: isHighway ? ["patrouille_autoroute", "livraison_urgence"] :
                             isGravel ? ["reparation_route", "nettoyage_chemin"] :
                             ["livraison_colis"],
          questProbability: 0.1,
          requiredQuests: [],
        },

        localEvents: isHighway ? [
          {
            id: `accident_${road.id}`,
            type: "accident",
            name: "Accident sur l'autoroute",
            description: "Un accident s'est produit sur l'autoroute, bloquant la circulation.",
            startDay: Math.floor(Math.random() * 365),
            duration: 4,
            startHour: 8,
            endHour: 18,
            location: { x: road.points[Math.floor(road.points.length / 2)][0], z: road.points[Math.floor(road.points.length / 2)][1] },
            rewards: {
              money: 200,
              reputation: { police: 10 },
            },
            recurrence: "none",
            isActive: false,
          },
        ] : [],
      }),
    );

    // Ajouter la limite de la zone (couloir le long de la route)
    bounds.push({
      zoneName,
      shapeType: "corridor",
      pathPoints: road.points,
      corridorWidth: road.width + (isHighway ? 6 : 3.5),
    });

    // Ajouter des points de spawn pour les véhicules sur les routes
    const spawnCount = Math.max(2, Math.floor(road.points.length / 5));
    for (let i = 0; i < spawnCount; i++) {
      const t = i / (spawnCount - 1);
      const sample = closestOnPolyline(0, 0, road.points, t * road.points.length);
      const offset = (Math.random() - 0.5) * road.width * 0.8;

      spawns.push({
        id: `spawn_${road.id}_${i}`,
        zoneName,
        spawnType: "vehicle",
        posX: sample.x + offset * (road.kind === "highway" ? 1 : Math.random() > 0.5 ? 1 : -1),
        posY: 0,
        posZ: sample.z,
        heading: road.kind === "highway" ? (i % 2 === 0 ? 0 : Math.PI) : Math.random() * Math.PI * 2,
        activeFromHour: 0,
        activeToHour: 24,
        weight: isHighway ? 1.2 : 0.8,
        enabled: true,
        minLevel: 1,
        requiredWeather: isHighway ? ["clear", "rain"] : undefined, // Pas de véhicules par tempêtes sur l'autoroute
      });
    }

    // Ajouter des patrouilles SQ sur les routes principales
    if (isHighway) {
      patrols.push({
        zoneName,
        patrolRoute: road.points,
        patrolFrequency: 0.9,
        vehicleType: "voiture",
        officerCount: 1,
        responseTime: 90,
      });
    }
  }

  // ============================================================================
  // 🏭 ZONES SPÉCIALES (Prison, Papeterie, etc.)
  // ============================================================================

  // Zone de la prison de Donnacona
  configs.push(
    cfg({
      zoneName: "prison",
      displayName: "Établissement de Donnacona",
      village: "Donnacona",
      roadSurface: "asphalt",
      speedLimit: 30,
      npcDensity: 0.8,
      trafficMix: { voiture: 0.1, pickup: 0.05, tracteur: 0, camion: 0.05, police: 0.8 },
      pedestrianDensity: 0.5,
      wildlifeDensity: 0,
      ambientSound: "prison",
      ambientVolume: 0.3,
      fogDensity: 0.001,
      fogColor: "#6a6a6a",
      policeResponseSeconds: 30,
      allowVehicleSpawn: false,
      isSafeZone: true, // Zone sécurisée (mais pas pour les prisonniers !)
      priority: 10,
      rpType: "prison",

      // 🔹 PROPRIÉTÉS RP
      biome: "zone_urbaine",
      altitude: 80,
      humidity: 40,
      temperatureRange: { min: -20, max: 30 },
      precipitation: 40,

      population: 200, // Gardiens et personnel
      wealthLevel: 60,
      economicActivity: ["securite"],
      mainIndustry: "securite",
      employmentRate: 100,
      averageIncome: 45000,

      securityLevel: 95,
      crimeRate: 5, // À l'intérieur de la prison
      crimeTypes: ["evasion", "bagarre"],
      dominantFaction: "police",
      sqPatrolFrequency: 1.0,
      sqStation: "poste_police_donnacona",
      allowOpenCarrying: true, // Les gardes ont des armes

      zoningRules: {
        allowedBuildingTypes: ["prison", "poste_police", "caserne"],
        maxBuildingHeight: 15,
        maxBuildingDensity: 0.8,
        minLotSize: 5000,
        buildingPermitCost: 1000,
        buildingPermitDays: 30,
        demolitionAllowed: false,
        historicalPreservation: true,
      },

      pollutionLevel: 30,
      airQuality: 70,
      waterQuality: 80,
      greenSpaces: 10,
      recyclingRate: 60,

      primaryLanguage: "francais",
      culturalHeritage: ["penitentiaire", "historique"],
      traditions: ["discipline", "reinsertion"],
      holidays: ["fete_nationale"],

      propertyTaxRate: 0.0,
      salesTaxRate: 0.14975,
      businessTaxRate: 0.0,
      averagePropertyValue: 0,
      costOfLiving: 0,

      publicTransport: {
        busRoutes: [],
        busFrequency: 0,
        taxiAvailable: false,
        bikeLanes: false,
        walkability: 30,
      },

      services: {
        hasSchool: false,
        hasHospital: true,
        hasPoliceStation: true,
        hasFireStation: true,
        hasPostOffice: false,
        hasLibrary: true,
        hasPark: false,
        hasMarket: false,
        hasBank: false,
        hasGasStation: false,
        hasRestaurant: true, // Cantine
        hasHotel: false,
      },

      wildlife: {
        species: [], // Pas d'animaux sauvages en prison
        plantSpecies: ["gazon", "arbre_prison"],
        huntingAllowed: false,
        fishingAllowed: false,
        gatheringAllowed: false,
        protectedSpecies: [],
      },

      naturalHazards: {
        floodRisk: 5,
        fireRisk: 40,
        earthquakeRisk: 5,
        landslideRisk: 5,
        stormRisk: 10,
      },

      quests: {
        availableQuests: ["evasion_prison", "interview_prisonnier", "livraison_colis_prison"],
        questProbability: 0.05,
        requiredQuests: ["rencontrer_policier_donnacona"],
      },

      localEvents: [
        {
          id: "evasion_massive",
          type: "accident",
          name: "Tentative d'évasion massive",
          description: "Plusieurs détenus tentent de s'échapper de la prison. La SQ a besoin de renforts !",
          startDay: Math.floor(Math.random() * 365),
          duration: 1,
          startHour: 2,
          endHour: 6,
          location: { x: PRISON.x, z: PRISON.z },
          rewards: {
            money: 500,
            reputation: { police: 20, citoyens: -5 },
          },
          recurrence: "none",
          isActive: false,
        },
      ],

      history: {
        foundingYear: 1950,
        historicalSignificance: 80,
        historicalEvents: ["Construction en 1950", "Émeutes de 1971", "Modernisation en 2000"],
        heritageSites: ["prison_donnacona"],
      },
    }),
  );

  bounds.push({
    zoneName: "prison",
    shapeType: "circle",
    centerX: PRISON.x,
    centerZ: PRISON.z,
    radius: 80,
  });

  // Ajouter des points de spawn pour les véhicules de police autour de la prison
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    spawns.push({
      id: `spawn_police_prison_${i}`,
      zoneName: "prison",
      spawnType: "vehicle",
      posX: PRISON.x + Math.cos(angle) * 60,
      posY: 0,
      posZ: PRISON.z + Math.sin(angle) * 60,
      heading: angle + Math.PI / 2,
      activeFromHour: 0,
      activeToHour: 24,
      weight: 1.0,
      enabled: true,
      minLevel: 1,
      spawnGroup: "patrouille_prison",
    });
  }

  // Ajouter une patrouille SQ dédiée à la prison
  patrols.push({
    zoneName: "prison",
    patrolRoute: [
      [PRISON.x - 80, PRISON.z - 80],
      [PRISON.x + 80, PRISON.z - 80],
      [PRISON.x + 80, PRISON.z + 80],
      [PRISON.x - 80, PRISON.z + 80],
    ],
    patrolFrequency: 1.0,
    vehicleType: "voiture",
    officerCount: 2,
    responseTime: 30,
    priorityAreas: [
      [PRISON.x, PRISON.z, 50],
      [PRISON.x + 40, PRISON.z, 30],
      [PRISON.x - 40, PRISON.z, 30],
    ],
  });

  // Zone de la papeterie
  configs.push(
    cfg({
      zoneName: "papeterie",
      displayName: "Papeterie de Portneuf",
      village: null,
      roadSurface: "pave",
      speedLimit: 20,
      npcDensity: 0.6,
      trafficMix: { voiture: 0.3, pickup: 0.2, tracteur: 0.1, camion: 0.4 },
      pedestrianDensity: 0.4,
      wildlifeDensity: 0.05,
      ambientSound: "usine",
      ambientVolume: 0.6,
      fogDensity: 0.0016,
      fogColor: "#7a7a7a",
      policeResponseSeconds: 180,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 7,
      rpType: "industrie",

      // 🔹 PROPRIÉTÉS RP
      biome: "zone_industrielle",
      altitude: 40,
      humidity: 50,
      temperatureRange: { min: -15, max: 30 },
      precipitation: 45,

      population: 150,
      wealthLevel: 70,
      economicActivity: ["industrie", "foresterie"],
      mainIndustry: "industrie",
      employmentRate: 95,
      averageIncome: 45000,

      securityLevel: 75,
      crimeRate: 20,
      crimeTypes: ["vol", "sabotage", "pollution"],
      dominantFaction: "industriels",
      sqPatrolFrequency: 0.6,
      allowOpenCarrying: false,

      zoningRules: {
        allowedBuildingTypes: ["usine", "entrepot", "bureau", "station_service"],
        maxBuildingHeight: 20,
        maxBuildingDensity: 0.7,
        minLotSize: 3000,
        buildingPermitCost: 200,
        buildingPermitDays: 10,
        historicalPreservation: false,
      },

      pollutionLevel: 70,
      airQuality: 40,
      waterQuality: 50,
      greenSpaces: 10,
      recyclingRate: 50,

      primaryLanguage: "francais",
      culturalHeritage: ["industriel"],
      traditions: ["fetes_du_travail"],
      holidays: ["fete_nationale", "fete_du_travail"],

      propertyTaxRate: 0.02,
      salesTaxRate: 0.14975,
      businessTaxRate: 0.03,
      averagePropertyValue: 500000,
      costOfLiving: 60,

      publicTransport: {
        busRoutes: ["ligne_papeterie"],
        busFrequency: 30,
        taxiAvailable: false,
        bikeLanes: false,
        walkability: 40,
      },

      services: {
        hasSchool: false,
        hasHospital: false,
        hasPoliceStation: false,
        hasFireStation: true,
        hasPostOffice: false,
        hasLibrary: false,
        hasPark: false,
        hasMarket: false,
        hasBank: false,
        hasGasStation: true,
        hasRestaurant: true, // Cafétéria
        hasHotel: false,
      },

      wildlife: {
        species: ["pigeon", "rat"],
        plantSpecies: ["arbre_industriel"],
        huntingAllowed: false,
        fishingAllowed: false,
        gatheringAllowed: false,
        protectedSpecies: [],
      },

      naturalHazards: {
        floodRisk: 10,
        fireRisk: 60,
        earthquakeRisk: 10,
        landslideRisk: 5,
        stormRisk: 10,
      },

      quests: {
        availableQuests: ["livraison_papeterie", "reparation_machine", "nettoyage_pollution"],
        questProbability: 0.2,
        requiredQuests: [],
      },

      localEvents: [
        {
          id: "greve_papeterie",
          type: "manifestation",
          name: "Grève à la Papeterie",
          description: "Les employés de la papeterie sont en grève pour de meilleures conditions de travail.",
          startDay: Math.floor(Math.random() * 365),
          duration: 7,
          startHour: 8,
          endHour: 17,
          location: { x: PAPETERIE.x, z: PAPETERIE.z },
          rewards: {
            money: 0,
            reputation: { industriels: -10, citoyens: 5 },
          },
          recurrence: "none",
          isActive: false,
        },
      ],

      history: {
        foundingYear: 1920,
        historicalSignificance: 60,
        historicalEvents: ["Fondation en 1920", "Modernisation en 1960"],
        heritageSites: ["papeterie_portneuf"],
      },
    }),
  );

  bounds.push({
    zoneName: "papeterie",
    shapeType: "circle",
    centerX: PAPETERIE.x,
    centerZ: PAPETERIE.z,
    radius: 100,
  });

  // Ajouter des points de spawn pour les camions autour de la papeterie
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    spawns.push({
      id: `spawn_camion_papeterie_${i}`,
      zoneName: "papeterie",
      spawnType: "vehicle",
      posX: PAPETERIE.x + Math.cos(angle) * 80,
      posY: 0,
      posZ: PAPETERIE.z + Math.sin(angle) * 80,
      heading: angle + Math.PI,
      activeFromHour: 6,
      activeToHour: 18,
      weight: 0.9,
      enabled: true,
      minLevel: 1,
      spawnGroup: "livraisons_papeterie",
    });
  }

  // Ajouter une route commerciale pour la papeterie
  tradeRoutes.push({
    id: "route_papeterie_port",
    name: "Route Papeterie - Port de Québec",
    start: { x: PAPETERIE.x, z: PAPETERIE.z },
    end: { x: PAPETERIE.x - 500, z: RIVER_Z + 50 },
    goods: ["papier", "bois", "produits_chimiques"],
    frequency: 2,
    vehicleType: "camion",
    capacity: 2000,
    activeHours: { from: 6, to: 20 },
  });

  // ============================================================================
  // 🌲 ZONES DE PARCS ET ESPACES NATURELS
  // ============================================================================

  // Parc régional (exemple : Parc de la Chute-Montmorency)
  configs.push(
    cfg({
      zoneName: "parc_regional",
      displayName: "Parc Régional de Portneuf",
      village: null,
      roadSurface: "grass",
      speedLimit: 30,
      npcDensity: 0.5,
      trafficMix: { voiture: 0.1, pickup: 0.1, tracteur: 0.05, camion: 0.05, velo: 0.7 },
      pedestrianDensity: 1.0,
      wildlifeDensity: 0.8,
      ambientSound: "parc",
      ambientVolume: 0.5,
      fogDensity: 0.001,
      fogColor: "#8aa0a8",
      policeResponseSeconds: 240,
      allowVehicleSpawn: false,
      isSafeZone: true,
      priority: 3,
      rpType: "parc_national",

      // 🔹 PROPRIÉTÉS RP
      biome: "foret_mixte",
      altitude: 100,
      humidity: 70,
      temperatureRange: { min: -15, max: 25 },
      precipitation: 50,

      population: 0,
      wealthLevel: 0,
      economicActivity: ["tourisme"],
      mainIndustry: "tourisme",
      employmentRate: 0,
      averageIncome: 0,

      securityLevel: 90,
      crimeRate: 2,
      crimeTypes: ["vandalisme"],
      dominantFaction: "touristes",
      sqPatrolFrequency: 0.3,
      allowOpenCarrying: false,

      zoningRules: {
        allowedBuildingTypes: ["chalet", "kiosque", "toilettes", "stationnement"],
        maxBuildingHeight: 5,
        maxBuildingDensity: 0.1,
        minLotSize: 5000,
        buildingPermitCost: 300,
        buildingPermitDays: 15,
        historicalPreservation: true,
      },

      pollutionLevel: 5,
      airQuality: 95,
      waterQuality: 90,
      greenSpaces: 99,
      recyclingRate: 80,

      primaryLanguage: "francais",
      culturalHeritage: ["naturel", "touristique"],
      traditions: ["randonnee", "pique_nique"],
      holidays: ["fete_nationale", "jour_de_la_terre"],

      propertyTaxRate: 0.005,
      salesTaxRate: 0.14975,
      businessTaxRate: 0.01,
      averagePropertyValue: 0,
      costOfLiving: 0,

      publicTransport: {
        busRoutes: ["ligne_parc"],
        busFrequency: 60,
        taxiAvailable: false,
        bikeLanes: true,
        walkability: 90,
      },

      services: {
        hasSchool: false,
        hasHospital: false,
        hasPoliceStation: false,
        hasFireStation: false,
        hasPostOffice: false,
        hasLibrary: false,
        hasPark: true,
        hasMarket: false,
        hasBank: false,
        hasGasStation: false,
        hasRestaurant: true, // Buvette
        hasHotel: false,
      },

      wildlife: {
        species: ["cerf", "ecureuil", "oiseau", "canard", "tortue"],
        plantSpecies: ["erable", "bouleau", "sapin", "fleur_sauvage"],
        huntingAllowed: false,
        fishingAllowed: true,
        gatheringAllowed: true,
        protectedSpecies: ["tortue"],
      },

      naturalHazards: {
        floodRisk: 10,
        fireRisk: 30,
        earthquakeRisk: 5,
        landslideRisk: 10,
        stormRisk: 10,
      },

      quests: {
        availableQuests: ["exploration_parc", "observation_faune", "nettoyage_parc"],
        questProbability: 0.3,
        requiredQuests: [],
      },

      localEvents: [
        {
          id: "randonnee_guidee",
          type: "foire",
          name: "Randonnée Guidée dans le Parc",
          description: "Une randonnée guidée pour découvrir la faune et la flore locales.",
          startDay: 150, // Début juin
          duration: 1,
          startHour: 9,
          endHour: 12,
          location: { x: -700, z: -300 },
          organizer: "guide_nature",
          rewards: {
            money: 50,
            reputation: { touristes: 10, citoyens: 5 },
            items: ["guide_nature"],
          },
          recurrence: "weekly",
          isActive: false,
        },
      ],

      history: {
        foundingYear: 1970,
        historicalSignificance: 40,
        historicalEvents: ["Création du parc en 1970"],
        heritageSites: ["parc_regional_portneuf"],
      },
    }),
  );

  bounds.push({
    zoneName: "parc_regional",
    shapeType: "circle",
    centerX: -700,
    centerZ: -300,
    radius: 150,
  });

  pois.push(
    {
      id: "parc_regional_entree",
      name: "Entrée du Parc Régional",
      description: "Point d'entrée principal du parc avec centre d'accueil et stationnement.",
      x: -700,
      z: -300,
      type: "touristique",
      zoneName: "parc_regional",
      icon: "entree_parc",
      discoveryReward: {
        experience: 20,
        money: 10,
      },
      isDiscovered: false,
      requiredLevel: 1,
    },
    {
      id: "chute_parc",
      name: "Chute du Parc",
      description: "Une belle chute d'eau au cœur du parc, lieu de pique-nique populaire.",
      x: -750,
      z: -250,
      type: "naturel",
      zoneName: "parc_regional",
      icon: "chute",
      discoveryReward: {
        experience: 30,
        items: ["bouteille_eau"],
      },
      isDiscovered: false,
      requiredLevel: 1,
    },
    {
      id: "belvedere_parc",
      name: "Belvédère du Parc",
      description: "Point de vue offrant une vue imprenable sur la région.",
      x: -650,
      z: -350,
      type: "naturel",
      zoneName: "parc_regional",
      icon: "belvedere",
      discoveryReward: {
        experience: 40,
        reputation: 5,
      },
      isDiscovered: false,
      requiredLevel: 1,
    }
  );

  // Ajouter des points de spawn pour les piétons et vélos dans le parc
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const distance = 50 + Math.random() * 50;
    spawns.push({
      id: `spawn_pieton_parc_${i}`,
      zoneName: "parc_regional",
      spawnType: "pedestrian",
      posX: -700 + Math.cos(angle) * distance,
      posY: 0,
      posZ: -300 + Math.sin(angle) * distance,
      heading: angle + Math.PI,
      activeFromHour: 8,
      activeToHour: 18,
      weight: 0.8,
      enabled: true,
      minLevel: 1,
    });

    if (i % 2 === 0) {
      spawns.push({
        id: `spawn_velo_parc_${i}`,
        zoneName: "parc_regional",
        spawnType: "vehicle",
        posX: -700 + Math.cos(angle) * distance,
        posY: 0,
        posZ: -300 + Math.sin(angle) * distance,
        heading: angle + Math.PI / 2,
        activeFromHour: 9,
        activeToHour: 17,
        weight: 0.6,
        enabled: true,
        minLevel: 1,
      });
    }
  }

  // ============================================================================
  // 🏭 ZONES INDUSTRIELLES SUPPLÉMENTAIRES
  // ============================================================================

  // Zone industrielle légère (exemple : près de Donnacona)
  configs.push(
    cfg({
      zoneName: "zone_industrielle_donnacona",
      displayName: "Zone Industrielle de Donnacona",
      village: "Donnacona",
      roadSurface: "asphalt",
      speedLimit: 50,
      npcDensity: 0.4,
      trafficMix: MIX_INDUSTRIEL,
      pedestrianDensity: 0.2,
      wildlifeDensity: 0.05,
      ambientSound: "usine_legere",
      ambientVolume: 0.5,
      fogDensity: 0.0018,
      fogColor: "#7a7a7a",
      policeResponseSeconds: 200,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 4,
      rpType: "industrie",

      // 🔹 PROPRIÉTÉS RP
      biome: "zone_industrielle",
      altitude: 60,
      humidity: 40,
      temperatureRange: { min: -20, max: 35 },
      precipitation: 40,

      population: 300,
      wealthLevel: 65,
      economicActivity: ["industrie", "construction"],
      mainIndustry: "industrie",
      employmentRate: 85,
      averageIncome: 42000,

      securityLevel: 70,
      crimeRate: 25,
      crimeTypes: ["vol", "vandalisme", "pollution"],
      dominantFaction: "industriels",
      sqPatrolFrequency: 0.6,
      allowOpenCarrying: false,

      zoningRules: {
        allowedBuildingTypes: ["usine", "entrepot", "bureau", "station_service"],
        maxBuildingHeight: 20,
        maxBuildingDensity: 0.7,
        minLotSize: 3000,
        buildingPermitCost: 200,
        buildingPermitDays: 10,
        historicalPreservation: false,
      },

      pollutionLevel: 60,
      airQuality: 45,
      waterQuality: 55,
      greenSpaces: 15,
      recyclingRate: 45,

      primaryLanguage: "francais",
      culturalHeritage: ["industriel"],
      traditions: ["fetes_du_travail"],
      holidays: ["fete_nationale", "fete_du_travail"],

      propertyTaxRate: 0.02,
      salesTaxRate: 0.14975,
      businessTaxRate: 0.03,
      averagePropertyValue: 400000,
      costOfLiving: 55,

      publicTransport: {
        busRoutes: ["ligne_donnacona"],
        busFrequency: 30,
        taxiAvailable: false,
        bikeLanes: false,
        walkability: 35,
      },

      services: {
        hasSchool: false,
        hasHospital: true,
        hasPoliceStation: true,
        hasFireStation: true,
        hasPostOffice: false,
        hasLibrary: false,
        hasPark: false,
        hasMarket: false,
        hasBank: false,
        hasGasStation: true,
        hasRestaurant: true,
        hasHotel: false,
      },

      wildlife: {
        species: ["pigeon", "rat"],
        plantSpecies: ["arbre_industriel"],
        huntingAllowed: false,
        fishingAllowed: false,
        gatheringAllowed: false,
        protectedSpecies: [],
      },

      naturalHazards: {
        floodRisk: 20,
        fireRisk: 55,
        earthquakeRisk: 10,
        landslideRisk: 5,
        stormRisk: 10,
      },

      quests: {
        availableQuests: ["livraison_donnacona", "securite_usine", "nettoyage_zone"],
        questProbability: 0.2,
        requiredQuests: [],
      },

      localEvents: [],
    })
  );

  // NOTE DE RECONSTRUCTION (audit 2026-09-18) :
  // Ce fichier avait ete tronque en pleine saisie (fin brutale dans la
  // definition de la zone zone_industrielle_donnacona). La fin a ete
  // reconstituée selon le motif exact des autres zones industrielles.

  return { configs, bounds, spawns, pois, patrols, tradeRoutes };
}// ============================================================================
// CATALOGUE INSTANCIE & EXPORTS
// ============================================================================

const BUILT = buildCatalog();

export const ZONE_CONFIGS: ZoneConfig[] = BUILT.configs;
export const ZONE_BOUNDS: ZoneBound[] = BUILT.bounds;
export const SPAWN_POINTS: SpawnPoint[] = BUILT.spawns;
export const ZONE_POIS: POI[] = BUILT.pois;
export const ZONE_PATROLS: SQPatrolConfig[] = BUILT.patrols;
export const ZONE_TRADE_ROUTES: TradeRoute[] = BUILT.tradeRoutes;

const CONFIG_BY = new Map(ZONE_CONFIGS.map((c) => [c.zoneName, c]));

function contains(b: ZoneBound, x: number, z: number): boolean {
  if (b.shapeType === "circle") {
    return Math.hypot(x - (b.centerX ?? 0), z - (b.centerZ ?? 0)) <= (b.radius ?? 0);
  }
  if (b.shapeType === "box") {
    return x >= (b.minX ?? 0) && x <= (b.maxX ?? 0) && z >= (b.minZ ?? 0) && z <= (b.maxZ ?? 0);
  }
  const pts = b.pathPoints;
  if (!pts || pts.length < 2) return false;
  return closestOnPolyline(x, z, pts).dist <= (b.corridorWidth ?? 12) * 0.5;
}

export function parseFogColor(hex: string): number {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h.length === 6 ? h : "8aa0a8", 16);
  return Number.isFinite(n) ? n : 0x8aa0a8;
}

export class WorldConfigSystem {
  at(x: number, z: number): ZoneConfig {
    let best: ZoneConfig | null = null;
    let bestP = -1;
    for (const b of ZONE_BOUNDS) {
      if (!contains(b, x, z)) continue;
      const c = CONFIG_BY.get(b.zoneName);
      if (!c) continue;
      if (c.priority > bestP) {
        best = c;
        bestP = c.priority;
      }
    }
    return best ?? CONFIG_BY.get("campagne")!;
  }

  policeCatchMul(x: number, z: number) {
    const n = this.at(x, z).policeResponseSeconds;
    return Math.max(0.38, Math.min(1.35, 180 / Math.max(20, n)));
  }

  hourOpen(sp: SpawnPoint, hour: number) {
    if (!sp.enabled) return false;
    if (sp.activeFromHour <= sp.activeToHour)
      return hour >= sp.activeFromHour && hour < sp.activeToHour;
    return hour >= sp.activeFromHour || hour < sp.activeToHour;
  }

  spawnsOf(type: SpawnKind, hour: number): SpawnPoint[] {
    return SPAWN_POINTS.filter((s) => s.spawnType === type && this.hourOpen(s, hour));
  }

  getZoneByName(zoneName: string): ZoneConfig | undefined {
    return CONFIG_BY.get(zoneName);
  }

  getZoneByPosition(x: number, z: number): ZoneConfig | undefined {
    return this.at(x, z);
  }

  getAllZones(): ZoneConfig[] {
    return ZONE_CONFIGS;
  }

  getSpawnPointsByType(type: SpawnKind): SpawnPoint[] {
    return SPAWN_POINTS.filter((s) => s.spawnType === type);
  }

  getSpawnPointsInZone(zoneName: string): SpawnPoint[] {
    return SPAWN_POINTS.filter((s) => s.zoneName === zoneName);
  }

  getActiveSpawnPoints(type: SpawnKind, hour: number): SpawnPoint[] {
    return this.spawnsOf(type, hour);
  }

  getPOIs(): POI[] {
    return ZONE_POIS;
  }

  getPOIById(poiId: string): POI | undefined {
    return ZONE_POIS.find((p) => p.id === poiId);
  }

  getPOIsInZone(zoneName: string): POI[] {
    return ZONE_POIS.filter((p) => p.zoneName === zoneName);
  }

  getNearestPOI(x: number, z: number, maxDistance?: number): POI | null {
    let best: POI | null = null;
    let bestD = maxDistance ?? Infinity;
    for (const p of ZONE_POIS) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  getLocalEvents(zoneName: string): LocalEvent[] {
    const c = CONFIG_BY.get(zoneName);
    return c?.localEvents ?? [];
  }

  getActiveLocalEvents(): LocalEvent[] {
    const now = new Date();
    const day = now.getDate() + now.getMonth() * 31;
    const hour = now.getHours();
    return ZONE_CONFIGS.flatMap((c) => c.localEvents ?? []).filter((e) => {
      const inDayWindow = e.startDay <= day && day < e.startDay + e.duration;
      return inDayWindow && hour >= e.startHour && hour < e.endHour;
    });
  }

  getZoneReputation(zoneName: string): number {
    const c = CONFIG_BY.get(zoneName);
    return c?.reputation ?? 0;
  }

  updateZoneReputation(zoneName: string, change: number): void {
    const c = CONFIG_BY.get(zoneName);
    if (c) c.reputation = Math.max(-100, Math.min(100, (c.reputation ?? 0) + change));
  }

  isZoneAccessible(
    zoneName: string,
    playerLevel: number,
    playerReputation: number,
    playerItems: string[],
  ): boolean {
    const c = CONFIG_BY.get(zoneName);
    if (!c) return true;
    if (c.requiredLevel && playerLevel < c.requiredLevel) return false;
    if (c.requiredReputation && playerReputation < c.requiredReputation) return false;
    if (c.requiredItems?.length) {
      for (const item of c.requiredItems) {
        if (!playerItems.includes(item)) return false;
      }
    }
    return true;
  }

  getZoneEconomicActivity(zoneName: string): EconomicActivity[] {
    return CONFIG_BY.get(zoneName)?.economicActivity ?? [];
  }

  getZoneServices(zoneName: string): ZoneConfig["services"] {
    return CONFIG_BY.get(zoneName)?.services ?? ({} as ZoneConfig["services"]);
  }

  getZoneNaturalHazards(zoneName: string): ZoneConfig["naturalHazards"] {
    return CONFIG_BY.get(zoneName)?.naturalHazards ?? ({} as ZoneConfig["naturalHazards"]);
  }

  getZoneWildlife(zoneName: string): ZoneConfig["wildlife"] {
    return CONFIG_BY.get(zoneName)?.wildlife ?? ({} as ZoneConfig["wildlife"]);
  }

  getZoneQuests(zoneName: string): string[] {
    return CONFIG_BY.get(zoneName)?.quests?.availableQuests ?? [];
  }

  getZoneFaction(zoneName: string): DominantFaction | undefined {
    return CONFIG_BY.get(zoneName)?.dominantFaction;
  }

  getZoneBiome(zoneName: string): BiomeType | undefined {
    return CONFIG_BY.get(zoneName)?.biome;
  }

  describe(x: number, z: number): string {
    const c = this.at(x, z);
    const mix = c.trafficMix;
    return [
      c.displayName + "  [" + c.zoneName + "]",
      "limite " + c.speedLimit + " km/h · sol " + c.roadSurface,
      "SQ " + Math.round(c.policeResponseSeconds / 60) + " min · prio " + c.priority + (c.isSafeZone ? " · zone sûre" : ""),
      "piétons " + c.pedestrianDensity.toFixed(2) + " · faune " + c.wildlifeDensity.toFixed(2) + " · PNJ " + c.npcDensity.toFixed(2),
      "trafic  berline " + (mix.voiture * 100).toFixed(0) + "%  pick-up " + (mix.pickup * 100).toFixed(0) + "%  tracteur " + (mix.tracteur * 100).toFixed(0) + "%  camion " + (mix.camion * 100).toFixed(0) + "%",
      "brouillard " + c.fogDensity + " · " + c.ambientSound,
    ].join("\n");
  }
}

export const worldConfig = new WorldConfigSystem();

export function pickTrafficKind(
  mix: TrafficMix,
  i: number,
): "voiture" | "pickup" | "tracteur" | "camion" {
  const r = ((i * 37 + 13) % 1000) / 1000;
  if (r < mix.voiture) return "voiture";
  if (r < mix.voiture + mix.pickup) return "pickup";
  if (r < mix.voiture + mix.pickup + mix.tracteur) return "tracteur";
  return "camion";
}