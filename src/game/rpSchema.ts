/**
 * ═══════════════════════════════════════════════════════════════════
 * RP ROOM STATE & SCHÉMAS MULTIJOUEUR QUÉBEC RP (P2P / COLYSEUS)
 * ═══════════════════════════════════════════════════════════════════
 *
 * ÉTATS SYNCHRONISÉS :
 *  - PlayerState : Identité, emploi, santé, menottage, état d'inconscience,
 *    alcoolémie (BAC), équipement tenu en main, vêtements d'hiver/tuque, canal radio.
 *  - VehicleState : Conduite hivernale (pneus d'hiver SAAQ, état moteur, verglas),
 *    gyrophares (SQ, SPVM, MTQ, Déneigement), passagers, remorque attachée.
 *  - ChatMessageState : Portée spatiale réaliste, canaux radio CB / SQ / 911 / TAL / Me / Do.
 *  - PropertyState : Baux du TAL, raccordement Hydro-Québec, serrures, grow-ops.
 *  - WorldState : Saisons québécoises (Poudrerie, verglas, blizzard, canicule),
 *    alerte En Alerte Québec (Alert Ready), pannes de courant de secteur.
 * ═══════════════════════════════════════════════════════════════════
 */

export interface Vec3State {
  x: number;
  y: number;
  z: number;
}

export interface RotationState {
  pitch: number;
  yaw: number;
  roll: number;
}

// ═══════════════════════════════════════════════════════════
// ÉTAT DU JOUEUR (PLAYER STATE)
// ═══════════════════════════════════════════════════════════

export type PlayerGesture = 
  | "none" 
  | "salute" 
  | "hands_up" 
  | "cross_arms" 
  | "sit" 
  | "inspect_ticket" 
  | "drink_can" 
  | "smoke" 
  | "shovel_snow" 
  | "cpr_give";

export type InHandProp = 
  | "none" 
  | "cellphone" 
  | "flashlight" 
  | "radar_gun" 
  | "taser" 
  | "baton" 
  | "glock" 
  | "coffee_cup" 
  | "beer_can" 
  | "joint" 
  | "snow_shovel" 
  | "tool_box" 
  | "briefcase" 
  | "jerrycan";

export interface PlayerAppearanceState {
  gender: "m" | "f";
  skinTone: number;
  hairStyle: string;
  hairColor: number;
  facialHair?: string;
  outfit: string;            // Uniforme SQ, habit de neige, veste de motard, complet notaire
  tuqueOrHat?: string;
  vestArmor?: string;        // Gilet pare-balles apparent
  coatColor?: number;
  model: string;
}

export interface PlayerState {
  id: string;
  username: string;
  badgeNumber?: string;      // Badge policier (ex: SQ-1048)
  job: string;               // Emploi actuel
  jobRank: string;           // Grade (ex: Sergent, Compagnon CCQ, etc.)
  aura: string;
  x: number;
  y: number;
  z: number;
  rotation: number;          // Yaw
  pitch?: number;
  velocity: Vec3State;
  animation: string;
  gesture: PlayerGesture;
  heldProp: InHandProp;

  // Santé, survie et conditions physiques
  health: number;            // 0 à 100
  armor: number;             // 0 à 100
  hunger: number;            // 0 à 100
  thirst: number;            // 0 à 100
  bodyTemp: number;          // Celsius (hypothermie si < 35°C)
  bloodAlcohol: number;      // mg / 100 ml (limite légale 80 mg)

  // États d'altération et RP policier/médical
  isCuffed: boolean;         // Menotté par un policier
  cuffedBy?: string;         // ID de l'officier
  isDowned: boolean;         // Coma / Inconscient (appel aux paramédics)
  bleedoutTimer?: number;    // Secondes restantes avant mort définitive
  isInSolitary: boolean;     // En cellule d'isolement au pénitencier

  // Économie & statut
  cash: number;
  bank: number;
  wanted: number;            // 0 à 5 étoiles de recherche
  wantedReason?: string;
  gang: string;

  // Véhicule actuel
  vehicleId: string;
  vehicleSeat: "driver" | "passenger" | "rear_left" | "rear_right" | "trunk" | "none";

  // Communication & Radio
  radioFrequency?: number;   // Canal d'ondes courtes
  cbChannel?: number;        // Canal CB camionneur (ex: 19)
  isTalkingRadio: boolean;
  voiceProximityMode: "whisper" | "normal" | "shout";

  // Apparence
  appearance: PlayerAppearanceState;

  // Secteur de grille
  zoneX?: number;
  zoneZ?: number;
  ping?: number;
}

// ═══════════════════════════════════════════════════════════
// ÉTAT DU VÉHICULE (VEHICLE STATE)
// ═══════════════════════════════════════════════════════════

export type VehicleCategory = 
  | "sedan" 
  | "pickup" 
  | "suv_police" 
  | "ambulance" 
  | "firetruck" 
  | "heavy_truck_53" 
  | "snowplow" 
  | "taxi" 
  | "van" 
  | "motorcycle";

export type SirenMode = "off" | "code_2" | "code_3_wail" | "code_3_yelp" | "sq_hi_lo" | "warning_amber";

export interface VehicleState {
  id: string;
  type: VehicleCategory;
  name: string;
  plateNumber: string;       // Plaque d'immatriculation SAAQ (ex: FGT 482)
  x: number;
  y: number;
  z: number;
  rotation: RotationState;
  speedKmh: number;
  engineHealth: number;      // 0 à 100
  bodyHealth: number;        // 0 à 100
  fuelLevelPct: number;      // 0 à 100%
  engineRunning: boolean;
  locked: boolean;

  // Conduite hivernale & mécanique
  winterTiresInstalled: boolean; // Obligatoire du 1er décembre au 15 mars au QC
  tireHealth: [number, number, number, number]; // État des 4 pneus
  snowAccumulationPct: number;   // Neige accumulée sur le pare-brise/toit
  engineTempCelsius: number;

  // Occupants
  driverId: string;
  passengers: Record<string, string>; // { seatId: playerId }

  // Signalisation & Gyrophares
  siren: boolean;
  sirenMode: SirenMode;
  headlights: boolean;
  highBeams: boolean;
  emergencyLights: boolean;  // Gyrophares bleu/rouge/jaune
  arrowBoardDirection?: "left" | "right" | "diverge" | "none"; // Flèche de signalisation MTQ

  // Remorques & Cargaison
  hitchedTrailerId?: string;
  cargoWeightKg?: number;
}

// ═══════════════════════════════════════════════════════════
// CHAT & COMMUNICATIONS SPATIALES
// ═══════════════════════════════════════════════════════════

export type ChatKind =
  | "local"           // Proximité (voix normale)
  | "whisper"         // Chuchoter (très proche)
  | "shout"           // Crier
  | "me"              // Action RP narrative (/me s'allume une Export A)
  | "do"              // Description de scène (/do La porte semble défoncée au pied-de-biche)
  | "ooc"             // Hors-RP global
  | "ad"              // Annonce publique / Petites annonces du comté
  | "radio_sq"        // Canal sécurisé de la Sûreté du Québec
  | "radio_paramedic" // Canal médical Urgences-santé
  | "cb_truckers"     // Canal 19 CB des camionneurs
  | "darknet"         // Marché noir crypté
  | "tal_official"    // Notifications juridiques du Tribunal administratif du logement
  | "system";         // Message serveur

export interface ChatMessageState {
  id: string;
  senderId: string;
  senderName: string;
  messageType: ChatKind;
  text: string;
  x: number;
  y: number;
  z: number;
  timestamp: number;
  targetId?: string;
  badge?: string;
  radioFrequency?: number;
  channel?: number;          // Pour CB
}

// ═══════════════════════════════════════════════════════════
// IMMOBILIER & BÂTIMENTS (PROPERTY STATE)
// ═══════════════════════════════════════════════════════════

export interface PropertyState {
  id: string;
  name: string;
  town: string;
  ownerId: string;
  price: number;
  locked: boolean;
  lockType: "standard" | "reinforced" | "electronic_pin" | "smart_keycard";
  pinCode?: string;

  // Statuts réels québécois
  hasActiveLease: boolean;
  tenantId?: string;
  isHydroPowerConnected: boolean; // Alimenté par Hydro-Québec
  hasTalEvictionNotice: boolean;  // Banderole de litige TAL
  structuralIntegrityPct: number; // 0 à 100%
  hasMoldOrMoisture: boolean;     // Moisissure de grow-op
}

// ═══════════════════════════════════════════════════════════
// MONDE, ENVIRONNEMENT & ALERTES D'URGENCE
// ═══════════════════════════════════════════════════════════

export type RiskLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export type QuebecSeason = "spring" | "summer" | "autumn" | "winter" | "early_summer" | "late_autumn";

export type WeatherState =
  | "clear"               // Dégagé
  | "cloudy"              // Nuageux
  | "rain"                // Pluie
  | "thunderstorm"        // Orage violent
  | "snow"                // Neige modérée
  | "snowstorm"           // Blizzard / Tempête majeure
  | "poudrerie"           // Rafales de neige au sol
  | "verglas"             // Pluie verglaçante (glace noire sur l'A-40)
  | "fog";                // Brouillard épais sur le fleuve

export interface EmergencyBroadcastState {
  active: boolean;
  id: string;
  headline: string;
  message: string;
  type: "meteo_extreme" | "evasion_prison" | "alerte_argent";
  startedAt: number;
  durationSeconds: number;
}

export interface RPRoomState {
  players: Record<string, PlayerState>;
  vehicles: Record<string, VehicleState>;
  chatMessages: ChatMessageState[];
  properties: Record<string, PropertyState>;
  
  // Événements d'urgence et alerte
  emergencyAlert?: EmergencyBroadcastState;
  
  // Temps & Météo québécoise
  timeOfDay: number;
  hour: number;
  minute: number;
  day: number;
  month: number;
  season: QuebecSeason;
  weather: WeatherState;
  temperatureCelsius: number;
  windSpeedKmh: number;
  snowDepthMeters: number;
  roadIceFrictionFactor: number; // 1.0 (asphalte sec) à 0.15 (glace noire)

  // État du réseau électrique Hydro-Québec
  isBlackoutActive: boolean;
  blackoutSectors: string[];

  // Risque global & surveillance
  riskLevel: RiskLevel;
  playerCount: number;
}

// ═══════════════════════════════════════════════════════════
// ALIAS DE SCHÉMAS COLYSEUS / TYPESCRIPT
// ═══════════════════════════════════════════════════════════

export type PlayerSchema = PlayerState;
export type VehicleSchema = VehicleState;
export type ChatMessageSchema = ChatMessageState;
export type PropertySchema = PropertyState;
export type Vec3Schema = Vec3State;

// ═══════════════════════════════════════════════════════════
// PROTOCOLE DES PAQUETS RÉSEAU (NETPACKETS)
// ═══════════════════════════════════════════════════════════

export type NetPacket =
  | { k: "snap"; p: PlayerState }
  | { k: "m"; d: number[] }
  | { k: "veh"; v: VehicleState }
  | { k: "veh_action"; action: "siren" | "lights" | "lock" | "engine" | "hitch"; vehId: string; value: any }
  | { k: "chat"; m: ChatMessageState }
  | { k: "prop"; pr: PropertyState }
  | { k: "cuff"; targetId: string; officerId: string; cuffed: boolean }
  | { k: "injury"; targetId: string; damage: number; isDowned: boolean }
  | { k: "item_use"; playerId: string; itemId: string; targetPosition?: Vec3State }
  | { k: "radio_tx"; freq: number; senderId: string; active: boolean }
  | { k: "cb_tx"; channel: number; senderId: string; message: string }
  | {
      k: "world";
      timeOfDay: number;
      hour: number;
      minute: number;
      day: number;
      month: number;
      season: QuebecSeason;
      weather: WeatherState;
      temperatureCelsius: number;
      windSpeedKmh: number;
      snowDepthMeters: number;
      roadIceFrictionFactor: number;
      riskLevel: RiskLevel;
      isBlackoutActive: boolean;
    }
  | { k: "alert_ready"; alert: EmergencyBroadcastState }
  | { k: "hello"; state: RPRoomState }
  | { k: "bye"; id: string }
  | { k: "position_rejected"; x: number; y: number; z: number };

// ═══════════════════════════════════════════════════════════
// DISTANCES DE PROXIMITÉ DU CHAT (EN MÈTRES)
// ═══════════════════════════════════════════════════════════

export const CHAT_RANGE: Record<ChatKind, number> = {
  whisper: 3.5,
  local: 22,
  me: 22,
  do: 22,
  shout: 65,
  radio_sq: Infinity,
  radio_paramedic: Infinity,
  cb_truckers: 4500, // Portée radio CB le long de l'autoroute (~4.5 km)
  darknet: Infinity,
  tal_official: Infinity,
  ooc: Infinity,
  ad: Infinity,
  system: Infinity,
};

// ═══════════════════════════════════════════════════════════
// FACTORY FUNCTIONS / INITIALISATEURS
// ═══════════════════════════════════════════════════════════

export function emptyPlayer(id: string, username = "Citoyen"): PlayerState {
  return {
    id,
    username,
    job: "Citoyen",
    jobRank: "Résident",
    aura: "none",
    x: 0,
    y: 1,
    z: 10,
    rotation: 0,
    velocity: { x: 0, y: 0, z: 0 },
    animation: "idle",
    gesture: "none",
    heldProp: "none",
    health: 100,
    armor: 0,
    hunger: 100,
    thirst: 100,
    bodyTemp: 37.0,
    bloodAlcohol: 0,
    isCuffed: false,
    isDowned: false,
    isInSolitary: false,
    wanted: 0,
    vehicleId: "",
    vehicleSeat: "none",
    cash: 500,
    bank: 2500,
    gang: "Aucun",
    isTalkingRadio: false,
    voiceProximityMode: "normal",
    appearance: {
      gender: "m",
      skinTone: 0,
      hairStyle: "court",
      hairColor: 0x332211,
      outfit: "canadienne",
      model: "voyageur",
    },
  };
}

export function emptyVehicle(id: string, type: VehicleCategory = "sedan", name = "Véhicule"): VehicleState {
  return {
    id,
    type,
    name,
    plateNumber: `QC-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString(36).slice(-2).toUpperCase()}`,
    x: 0,
    y: 0,
    z: 0,
    rotation: { pitch: 0, yaw: 0, roll: 0 },
    speedKmh: 0,
    engineHealth: 100,
    bodyHealth: 100,
    fuelLevelPct: 100,
    engineRunning: false,
    locked: true,
    winterTiresInstalled: true,
    tireHealth: [100, 100, 100, 100],
    snowAccumulationPct: 0,
    engineTempCelsius: 85,
    driverId: "",
    passengers: {},
    siren: false,
    sirenMode: "off",
    headlights: false,
    highBeams: false,
    emergencyLights: false,
  };
}

export function riskFromWanted(stars: number): RiskLevel {
  if (stars >= 4) return "RED";
  if (stars >= 3) return "ORANGE";
  if (stars >= 1) return "YELLOW";
  return "GREEN";
}

export function isNetPacket(data: unknown): data is NetPacket {
  return Boolean(data && typeof data === "object" && "k" in (data as object));
}