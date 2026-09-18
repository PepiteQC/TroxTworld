export interface PoliceTicket {
  id: string;
  targetId: string;
  targetName: string;
  officerId: string;
  officerName: string;
  department: "SPVM" | "SQ";
  amount: number;
  reason: string;
  timestamp: number;
  paid: boolean;
}

export interface JailRecord {
  playerId: string;
  playerName: string;
  reason: string;
  officerName: string;
  timeRemaining: number; // in seconds
  totalTime: number;
  bailAmount: number;
}

export interface DispatchCallout {
  id: string;
  code: "10-80" | "10-31" | "10-99" | "10-98" | "10-71" | "10-50";
  title: string;
  description: string;
  locationName: string;
  position: [number, number, number];
  timestamp: number;
  active: boolean;
  priority: "low" | "medium" | "high" | "critical";
}

export interface RadarScanData {
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  speedKmH: number;
  speedLimitKmH: number;
  isViolation: boolean;
  excessKmH: number;
}

export interface SpeedRadarAlert {
  id: string;
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  plate: string;
  speedKmH: number;
  speedLimitKmH: number;
  excessKmH: number;
  location: string;
  timestamp: number;
  isCritical: boolean;
}

export type PoliceRole = "patrol_officer" | "detective" | "wildlife_ranger";

export type PoliceRankLevel = "cadet" | "agent" | "sergent" | "capitaine" | "directeur";

export interface PoliceRankInfo {
  level: PoliceRankLevel;
  title: string;
  minPoints: number;
  salaryMultiplier: number;
  badgePrefix: string;
  perks: string[];
  unlockedVehicles: string[];
  canIssueMajorFines: boolean;
  canCallSWAT: boolean;
  canDeploySpikeStrips: boolean;
  canCommandAIPatrols: boolean;
}

export interface AIPatrolVehicle {
  id: string;
  callsign: string;
  department: "SQ" | "SPVM";
  model: "sq_suv" | "sq_cruiser" | "sq_unmarked";
  position: [number, number, number];
  rotation: number;
  speed: number;
  status: "patrolling" | "responding_code3" | "traffic_stop" | "stationed";
  targetWaypointIndex: number;
  sirenActive: boolean;
  lightbarActive: boolean;
  assignedCalloutId?: string;
}

export interface RadioMessage {
  id: string;
  channelId: "canal_1" | "canal_2" | "canal_3";
  senderBadge: string;
  senderName: string;
  tenCode: string;
  messageText: string;
  timestamp: number;
  priority?: "routine" | "priority" | "urgent_10_33";
}

export interface CSRCitation {
  code: string;
  article: string;
  description: string;
  fineAmount: number;
  demeritPoints: number;
  category: "vitesse" | "securite" | "facultes" | "faune";
  requiresArrest?: boolean;
}

export interface RestraintMiniGame {
  suspectId: string;
  suspectName: string;
  stage: "hands_up" | "cuffing" | "miranda" | "completed" | "failed";
  complianceProgress: number; // 0 to 100
  timeRemaining: number;
  struggleActive: boolean;
  taserRequired: boolean;
}

export type PatrolMode = "code1_routine" | "code2_traffic_stop" | "code3_emergency" | "wildlife_ranger";

export interface NPCTrafficStop {
  id: string;
  vehicleId: string;
  vehicleModel: string;
  plate: string;
  driverName: string;
  reason: string;
  stage: "pulling_over" | "approached" | "documents_checked" | "breathalyzer_tested" | "vehicle_searched" | "concluded";
  driverLicense: {
    valid: boolean;
    number: string;
    points: number;
    expiry: string;
  };
  breathalyzerBAC: number; // e.g. 0.00 to 0.14 g/L
  contrabandFound: string[];
  driverDemeanor: "compliant" | "nervous" | "belligerent";
  outcome?: "warning" | "ticket" | "arrest";
}

export interface CriminalRecord {
  id: string;
  citizenName: string;
  licenseNumber: string;
  status: "clean" | "wanted" | "probation" | "convicted";
  priors: string[];
  vehiclePlate?: string;
  notes: string;
}

export interface VehiclePlateData {
  plate: string;
  ownerName: string;
  model: string;
  stolen: boolean;
  registrationValid: boolean;
  wantedReason?: string;
}

export interface CrimeSceneEvidence {
  id: string;
  caseNumber: string;
  type: "bullet_casing" | "skid_mark" | "poached_pelt" | "fingerprint" | "blood_trail" | "tool_mark" | "dna_sample";
  title: string;
  locationName: string;
  position: [number, number, number];
  description: string;
  collected: boolean;
  collectedBy?: string;
  analyzed: boolean;
  suspectLinked?: string;
  dnaMatch?: string;
  fingerprints?: string;
  ballisticCaliber?: string;
  pointsAwarded: number;
}

export interface PlayerWantedState {
  stars: number; // 0 to 5
  heatScore: number; // 0 to 100
  heat?: number;
  wantedReason: string;
  bounty: number;
  inPursuit: boolean;
  evading: boolean;
  isWanted?: boolean;
  evasionCountdown: number; // seconds remaining to lose stars
  evasionTimer?: number;
  lastCrimeTimestamp: number;
  lastKnownPosition: [number, number, number];
}

export type PolicePermission =
  | "use_speed_radar"
  | "issue_csr_ticket"
  | "traffic_stop"
  | "breathalyzer"
  | "search_vehicle"
  | "handcuff_arrest"
  | "collect_evidence"
  | "analyze_evidence"
  | "deploy_spikes"
  | "authorize_code3"
  | "dispatch_ai_backup"
  | "set_wanted_level"
  | "clear_wanted_level"
  | "call_swat_gti"
  | "manage_officer_ranks"
  | "investigate_poaching";

export interface WantedSuspectEntry {
  id: string;
  name: string;
  stars: number;
  reason: string;
  bounty: number;
  inPursuit: boolean;
  lastSeenLocation: string;
  lastSeenPosition: [number, number, number];
  vehicleDescription?: string;
  activeWarrant: boolean;
}

export interface PatrolCheckpoint {
  id: string;
  name: string;
  position: [number, number, number];
  visited: boolean;
}

export interface BookingRecord {
  id: string;
  suspectName: string;
  officerName: string;
  role: PoliceRole;
  offense: string;
  bailAmount: number;
  timestamp: number;
  mugshotUrl?: string;
}

export interface PoliceUniform {
  id: string;
  name: string;
  department: "SQ" | "SPVM";
  role: PoliceRole;
  description: string;
  badgeLabel: string;
  colorScheme: {
    primary: string;
    secondary: string;
    vest?: string;
    hat?: string;
  };
  bonusDescription: string;
}

export const POLICE_UNIFORMS: PoliceUniform[] = [
  {
    id: "sq_patrol_regular",
    name: "Tenue Patrouille Régulière SQ",
    department: "SQ",
    role: "patrol_officer",
    description: "Uniforme officiel de la Sûreté du Québec : chemise vert olive, pantalon avec galon doré, ceinturon complet avec étui d'arme de service et radio VHF.",
    badgeLabel: "Patrouille SQ",
    colorScheme: {
      primary: "#3f4a3c",
      secondary: "#caa24d",
      vest: "#232b21",
      hat: "#2d382b",
    },
    bonusDescription: "+15% Respect des citoyens lors des sommations routières.",
  },
  {
    id: "sq_high_vis",
    name: "Veste Haute Visibilité CSR (Contrôle Routier)",
    department: "SQ",
    role: "patrol_officer",
    description: "Gilet de sécurité jaune fluorescent avec bandes rétro-réfléchissantes 3M, idéal pour les barrages routiers et interventions sur l'Autoroute 40.",
    badgeLabel: "Sécurité Routière SQ",
    colorScheme: {
      primary: "#d4e11e",
      secondary: "#222222",
      vest: "#b8c715",
      hat: "#222222",
    },
    bonusDescription: "Détection radar accrue (+20m portée) et sécurité contre les collisions de véhicules.",
  },
  {
    id: "sq_tactical_gti",
    name: "Combinaison Tactique GTI (SWAT Québécois)",
    department: "SQ",
    role: "patrol_officer",
    description: "Combinaison d'intervention noire mate en fibres Nomex, porte-plaques balistique lourd classe IV, casque tactique Ops-Core et passe-montagne.",
    badgeLabel: "GTI / SWAT SQ",
    colorScheme: {
      primary: "#141619",
      secondary: "#2c3138",
      vest: "#0d0e10",
      hat: "#1a1d21",
    },
    bonusDescription: "Protection balistique +35% et temps de maîtrise des suspects réduit de moitié.",
  },
  {
    id: "sq_wildlife_ranger",
    name: "Uniforme Protection Faunique & Réserves",
    department: "SQ",
    role: "wildlife_ranger",
    description: "Tenue d'agent de protection de la faune du Québec : chemise kaki beige, écusson du ministère de l'Environnement, chapeau à large bord et jumelles.",
    badgeLabel: "Faune & Parcs QC",
    colorScheme: {
      primary: "#6b624a",
      secondary: "#3d4b35",
      vest: "#4b563e",
      hat: "#7c7258",
    },
    bonusDescription: "Permet d'approcher la faune sauvage (orignaux, loups, ours) sans déclencher la panique.",
  },
  {
    id: "spvm_patrol_regular",
    name: "Tenue Patrouille Police Municipale / SPVM",
    department: "SPVM",
    role: "patrol_officer",
    description: "Uniforme municipal urbain : chemise bleu marine nuit, insigne de police argenté, pantalon d'intervention cargo avec renforts genoux.",
    badgeLabel: "Police Municipale",
    colorScheme: {
      primary: "#1b253b",
      secondary: "#cbd5e1",
      vest: "#111827",
      hat: "#0f172a",
    },
    bonusDescription: "Vitesse d'intervention urbaine et traitement accéléré des constats municipaux.",
  },
  {
    id: "spvm_rapid_bike",
    name: "Unité Rapide & Patrouille VTT",
    department: "SPVM",
    role: "patrol_officer",
    description: "Polo technique bicolore bleu azur et noir avec lettrage haute visibilité POLICE, pantalon souple et casque léger de patrouilleur.",
    badgeLabel: "Unité Rapide SPVM",
    colorScheme: {
      primary: "#1d4ed8",
      secondary: "#0f172a",
      vest: "#1e3a8a",
      hat: "#1e293b",
    },
    bonusDescription: "Endurance de sprint +25% et maniabilité optimale lors des poursuites à pied.",
  },
  {
    id: "sq_ceremonial",
    name: "Grande Tenue d'Honneur & Apparat",
    department: "SQ",
    role: "detective",
    description: "Veston de cérémonie avec aiguillette d'or, insignes d'ancienneté, gants blancs et képi rigide aux armoiries de la Sûreté du Québec.",
    badgeLabel: "Apparat SQ",
    colorScheme: {
      primary: "#262e24",
      secondary: "#d97706",
      vest: "#1b221a",
      hat: "#1f261d",
    },
    bonusDescription: "+50% de points de prestige lors des cérémonies officielles et arrestations majeures.",
  },
];

export const POLICE_RANKS: Record<PoliceRankLevel, PoliceRankInfo> = {
  cadet: {
    level: "cadet",
    title: "Cadet en Probation",
    minPoints: 0,
    salaryMultiplier: 1.0,
    badgePrefix: "CAD",
    perks: ["Matraque ASP télescopique", "Taser X26", "Avertissements oraux", "SUV SQ Standard"],
    unlockedVehicles: ["sq_suv"],
    canIssueMajorFines: false,
    canCallSWAT: false,
    canDeploySpikeStrips: false,
    canCommandAIPatrols: false,
  },
  agent: {
    level: "agent",
    title: "Agent Patrouilleur Assermenté",
    minPoints: 150,
    salaryMultiplier: 1.3,
    badgePrefix: "SQ",
    perks: ["Radar Doppler mobile Stalker", "Carnet d'infractions CSR", "Arme 9mm Glock 17", "Cruiser Berline SPVM"],
    unlockedVehicles: ["sq_suv", "sq_cruiser"],
    canIssueMajorFines: true,
    canCallSWAT: false,
    canDeploySpikeStrips: false,
    canCommandAIPatrols: false,
  },
  sergent: {
    level: "sergent",
    title: "Sergent Superviseur de Relève",
    minPoints: 400,
    salaryMultiplier: 1.6,
    badgePrefix: "SGT",
    perks: ["Herse d'interception (Spike strips)", "Alcootest Dräger 7510", "Barrages routiers autorisés", "Commande radio IA"],
    unlockedVehicles: ["sq_suv", "sq_cruiser"],
    canIssueMajorFines: true,
    canCallSWAT: false,
    canDeploySpikeStrips: true,
    canCommandAIPatrols: true,
  },
  capitaine: {
    level: "capitaine",
    title: "Capitaine Commandant de Poste",
    minPoints: 850,
    salaryMultiplier: 2.0,
    badgePrefix: "CPT",
    perks: ["Berline fantôme banalisée (Ghost)", "Déploiement SWAT / GTI Québec", "Autorisation prioritaire Code 3", "Appel d'urgence radio 10-33"],
    unlockedVehicles: ["sq_suv", "sq_cruiser", "sq_unmarked"],
    canIssueMajorFines: true,
    canCallSWAT: true,
    canDeploySpikeStrips: true,
    canCommandAIPatrols: true,
  },
  directeur: {
    level: "directeur",
    title: "Directeur Général de la Sûreté",
    minPoints: 1600,
    salaryMultiplier: 2.5,
    badgePrefix: "DIR",
    perks: ["Tous les véhicules déverrouillés", "Contrôle global des patrouilles IA", "Mandats spéciaux d'enquête", "Immunité de commandement"],
    unlockedVehicles: ["sq_suv", "sq_cruiser", "sq_unmarked"],
    canIssueMajorFines: true,
    canCallSWAT: true,
    canDeploySpikeStrips: true,
    canCommandAIPatrols: true,
  },
};

export const QUEBEC_CSR_CITATIONS: CSRCitation[] = [
  {
    code: "CSR-328-1",
    article: "Art. 328 CSR",
    description: "Excès de vitesse en zone urbaine (+15 à +25 km/h)",
    fineAmount: 175,
    demeritPoints: 2,
    category: "vitesse",
  },
  {
    code: "CSR-328-2",
    article: "Art. 328 CSR",
    description: "Excès de vitesse modéré (+26 à +40 km/h)",
    fineAmount: 260,
    demeritPoints: 3,
    category: "vitesse",
  },
  {
    code: "CSR-329-GEV",
    article: "Art. 329 CSR",
    description: "Grand excès de vitesse (GEV) (+50 km/h et plus) - Remorquage immédiat",
    fineAmount: 650,
    demeritPoints: 6,
    category: "vitesse",
  },
  {
    code: "CSR-327",
    article: "Art. 327 CSR",
    description: "Action imprudente compromettant la sécurité (Course / Dérapage)",
    fineAmount: 320,
    demeritPoints: 4,
    category: "securite",
  },
  {
    code: "CSR-38-DUI",
    article: "Art. C-38 C.Cr.",
    description: "Conduite avec facultés affaiblies (Alcoolémie > 0.08 g/L ou drogue)",
    fineAmount: 1000,
    demeritPoints: 0,
    category: "facultes",
    requiresArrest: true,
  },
  {
    code: "CSR-422",
    article: "Art. 422 CSR",
    description: "Refus d'obtempérer aux gyrophares ou signaux de police",
    fineAmount: 500,
    demeritPoints: 4,
    category: "securite",
  },
  {
    code: "LFA-30-BRAC",
    article: "Loi Faune Art. 30",
    description: "Braconnage d'orignal / castor sans permis ou en période fermée",
    fineAmount: 850,
    demeritPoints: 0,
    category: "faune",
  },
];

class PoliceSystemManager {
  private tickets: PoliceTicket[] = [];
  private jailRecords: Map<string, JailRecord> = new Map();
  private handcuffedPlayers: Set<string> = new Set();
  private dispatchCallouts: DispatchCallout[] = [];

  // Police Rank Hierarchy
  private currentRank: PoliceRankLevel = "agent";

  // Extended SQ / Police Role State
  private currentRole: PoliceRole = "patrol_officer";
  private currentPatrolMode: PatrolMode = "code1_routine";
  private isOnDuty = false;
  private dutyDepartment: "SPVM" | "SQ" = "SQ";
  private selectedUniformId: string = "sq_patrol_regular";
  private officerBadge: string = "SQ-8042";
  private patrolPoints: number = 240;
  private isRadarActive = false;

  // Radio Communication Log
  private radioMessages: RadioMessage[] = [];
  private currentRadioChannel: "canal_1" | "canal_2" | "canal_3" = "canal_1";

  // AI Patrol Vehicles
  private aiPatrolVehicles: AIPatrolVehicle[] = [];
  private aiWaypoints: [number, number, number][] = [
    [-18, 0, -25], // Poste SQ Route 138
    [0, 0, -10],
    [10, 0, 15],  // Intersection Portneuf Centre
    [30, 0, 30],
    [-40, 0, 65], // Phare de Neuville
    [-20, 0, 40],
    [-25, 0, -35], // Forêt Laurentides
  ];

  // Restraint Mini-Game State
  private restraintGame: RestraintMiniGame | null = null;

  // AAAA Synchronized Lightbar & Emergency FX
  private lightbarPattern: "code1_cruise" | "code2_wigwag" | "code3_quad_burst" | "code3_hyper_strobe" = "code3_quad_burst";
  private alleyLights: "off" | "left" | "right" | "both" = "off";
  private takedownLights: boolean = false;
  private trafficAdvisor: "off" | "left" | "right" | "split" = "off";

  // NPC Traffic Stop Engine
  private activeTrafficStop: NPCTrafficStop | null = null;
  private defaultNPCSuspects: { name: string; plate: string; model: string; priors: string[]; defaultContraband: string[] }[] = [
    { name: "Sylvain Tremblay", plate: "482-KLA", model: "Chevrolet Silverado 4x4", priors: ["Excès de vitesse 2024"], defaultContraband: ["Bière entamée dans console"] },
    { name: "Éric Bouchard", plate: "891-WXC", model: "Honda Civic VTEC Modifiée", priors: ["Silencieux non conforme", "Course de rue"], defaultContraband: ["Détecteur de radar illégal"] },
    { name: "Maxime Gagnon", plate: "312-PLM", model: "Dodge RAM 2500 Cummins", priors: ["Braconnage de truite mouchetée"], defaultContraband: ["Fusil de chasse non verrouillé", "Viande d'orignal sans permis"] },
    { name: "Valérie Côté", plate: "765-TYU", model: "Subaru Outback AWD", priors: [], defaultContraband: [] },
  ];
  private radarAlerts: SpeedRadarAlert[] = [
    {
      id: "radar_alert_1",
      vehicleId: "veh_charger_01",
      vehicleName: "Dodge Charger SRT Hellcat",
      driverName: "Inconnu (Plaque 982-XYZ)",
      plate: "982-XYZ",
      speedKmH: 142,
      speedLimitKmH: 70,
      excessKmH: 72,
      location: "Autoroute 40 Est - KM 281 (Portneuf)",
      timestamp: Date.now() - 120000,
      isCritical: true,
    },
    {
      id: "radar_alert_2",
      vehicleId: "veh_mustang_02",
      vehicleName: "Ford Mustang GT 5.0",
      driverName: "Marco 'Veloce' Rossi",
      plate: "712-MTR",
      speedKmH: 118,
      speedLimitKmH: 50,
      excessKmH: 68,
      location: "Boulevard Charest / Centre-Ville SPVM",
      timestamp: Date.now() - 340000,
      isCritical: true,
    },
    {
      id: "radar_alert_3",
      vehicleId: "veh_civic_03",
      vehicleName: "Honda Civic Type R",
      driverName: "Antoine Tremblay",
      plate: "331-KJL",
      speedKmH: 74,
      speedLimitKmH: 50,
      excessKmH: 24,
      location: "Grande Allée / Vieux-Québec",
      timestamp: Date.now() - 600000,
      isCritical: false,
    },
    {
      id: "radar_alert_4",
      vehicleId: "veh_sierra_04",
      vehicleName: "GMC Sierra HD Heavy Duty",
      driverName: "Jean-Luc Gagnon",
      plate: "884-TRK",
      speedKmH: 104,
      speedLimitKmH: 90,
      excessKmH: 14,
      location: "Autoroute 15 Sud (Pont Pierre-Laporte)",
      timestamp: Date.now() - 950000,
      isCritical: false,
    },
  ];

  // Detective & Evidence State
  private criminalRecords: CriminalRecord[] = [];
  private vehiclePlates: VehiclePlateData[] = [];
  private crimeEvidences: CrimeSceneEvidence[] = [];
  private bookingRecords: BookingRecord[] = [];

  // Dynamic Wanted Level State (Étoiles de recherche SQ)
  private playerWanted: PlayerWantedState = {
    stars: 0,
    heatScore: 0,
    wantedReason: "",
    bounty: 0,
    inPursuit: false,
    evading: false,
    evasionCountdown: 20,
    lastCrimeTimestamp: 0,
    lastKnownPosition: [0, 0, 0],
  };
  private wantedSuspects: WantedSuspectEntry[] = [];

  // Patrol Checkpoint Routes
  private patrolCheckpoints: PatrolCheckpoint[] = [
    { id: "cp_1", name: "Poste SQ Route 138", position: [-18, 0, -25], visited: false },
    { id: "cp_2", name: "Intersection Portneuf Centre", position: [10, 0, 15], visited: false },
    { id: "cp_3", name: "Phare de Neuville", position: [-40, 0, 65], visited: false },
    { id: "cp_4", name: "Forêt des Laurentides (Braconnage)", position: [-25, 0, -35], visited: false },
  ];

  // Audio Siren Synthesizer using Web Audio API
  private audioCtx: AudioContext | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: any = null;
  private isSirenActive = false;
  private sirenMode: "wail" | "yelp" | "hyper" = "wail";

  constructor() {
    // Initialize default demo tickets
    this.tickets.push({
      id: "ticket_101",
      targetId: "local_player",
      targetName: "Citoyen",
      officerId: "officer_sq_1",
      officerName: "Agent Bouchard (SQ)",
      department: "SQ",
      amount: 250,
      reason: "Excès de vitesse en zone urbaine (85km/h dans zone de 50km/h)",
      timestamp: Date.now() - 3600000,
      paid: false,
    });

    // Initialize criminal records for Detective lookups
    this.criminalRecords = [
      {
        id: "cr_1",
        citizenName: "Gaston Roy",
        licenseNumber: "QC-88491-G",
        status: "clean",
        priors: ["Amende stationnement (2024)"],
        vehiclePlate: "GASTON-1",
        notes: "Gérant du Dépanneur Gaston. Citoyen exemplaire.",
      },
      {
        id: "cr_2",
        citizenName: "Jean-Pierre Vachon",
        licenseNumber: "QC-19340-J",
        status: "wanted",
        priors: ["Poursuite à haute vitesse", "Braconnage d'élan (2025)"],
        vehiclePlate: "SQ-EVADE",
        notes: "Recherché par la Sûreté du Québec pour braconnage répété.",
      },
      {
        id: "cr_3",
        citizenName: "Sylvie Tremblay",
        licenseNumber: "QC-55412-S",
        status: "probation",
        priors: ["Excès de vitesse 120km/h"],
        vehiclePlate: "TAXI-QC",
        notes: "Sous observation du SPVM.",
      },
    ];

    // Initialize vehicle plates
    this.vehiclePlates = [
      { plate: "GASTON-1", ownerName: "Gaston Roy", model: "Camion Bâtisseur", stolen: false, registrationValid: true },
      { plate: "SQ-EVADE", ownerName: "Jean-Pierre Vachon", model: "Supercar TroxT GT", stolen: true, registrationValid: false, wantedReason: "Véhicule Volé & Recherche SQ" },
      { plate: "TAXI-QC", ownerName: "Sylvie Tremblay", model: "Taxi Montréal", stolen: false, registrationValid: true },
      { plate: "SQ-8042", ownerName: "Sûreté du Québec", model: "SUV Patrouille SQ", stolen: false, registrationValid: true },
    ];

    // Initialize initial dispatch callouts
    this.dispatchCallouts.push({
      id: "callout_101",
      code: "10-80",
      title: "Excès de Vitesse Majeur",
      description: "Supercar rouge repéré à 140km/h sur la Route 138 près du Phare",
      locationName: "Route 138 (Phare)",
      position: [-40, 0, 65],
      timestamp: Date.now() - 120000,
      active: true,
      priority: "high",
    });

    this.dispatchCallouts.push({
      id: "callout_102",
      code: "10-98",
      title: "Braconnage Suspecté",
      description: "Coup de feu et transport de panache d'élan non déclaré dans la forêt nord",
      locationName: "Forêt des Laurentides",
      position: [-25, 0, -35],
      timestamp: Date.now() - 60000,
      active: true,
      priority: "medium",
    });

    // Sample crime scene evidence for Detectives & SQ Forensics
    this.crimeEvidences = [
      {
        id: "ev_1",
        caseNumber: "SQ-2026-0811",
        type: "bullet_casing",
        title: "Douille de Carabine .308 Winchester",
        locationName: "Forêt des Laurentides (Secteur Nord)",
        position: [-24, 0.1, -34],
        description: "Douille percutée retrouvée près d'un point d'affût illégal. Traces de poudre fraîche.",
        collected: false,
        analyzed: false,
        suspectLinked: "Jean-Pierre Vachon",
        ballisticCaliber: ".308 Win",
        pointsAwarded: 60,
      },
      {
        id: "ev_2",
        caseNumber: "SQ-2026-0812",
        type: "poached_pelt",
        title: "Dépouille & Panache d'Orignal Braconné",
        locationName: "Campement Clandestin Laurentides",
        position: [-30, 0.1, -40],
        description: "Restes de dépeçage d'un orignal mâle sans étiquette faunique officielle.",
        collected: false,
        analyzed: false,
        dnaMatch: "ADN-FAUNE-QC-441",
        pointsAwarded: 80,
      },
      {
        id: "ev_3",
        caseNumber: "SQ-2026-0814",
        type: "skid_mark",
        title: "Traces de Dérapage & Éclats de Phare",
        locationName: "Route 138 (Intersection Portneuf)",
        position: [15, 0.1, 8],
        description: "Marques de pneumatiques sportifs et débris de polycarbonate teinté rouge lors d'un délit de fuite.",
        collected: false,
        analyzed: false,
        fingerprints: "Plaque identifiée: GASTON-1",
        pointsAwarded: 70,
      },
      {
        id: "ev_4",
        caseNumber: "SQ-2026-0820",
        type: "tool_mark",
        title: "Pied-de-biche avec traces de peinture de coffre",
        locationName: "Ruelle arrière de la Banque de Portneuf",
        position: [-10, 0.1, 14],
        description: "Outil d'effraction abandonné avec empreintes digitales partielles sur le manche.",
        collected: false,
        analyzed: false,
        fingerprints: "Empreintes partielles indexées",
        suspectLinked: "Alexandre Simard",
        pointsAwarded: 90,
      },
    ];

    // Seed Initial Active Wanted Suspects List
    this.wantedSuspects = [
      {
        id: "suspect_vachon",
        name: "Jean-Pierre Vachon",
        stars: 4,
        reason: "Braconnage d'orignaux répété & Fuite à haute vitesse",
        bounty: 4500,
        inPursuit: true,
        lastSeenLocation: "Forêt des Laurentides / Sentier Nord",
        lastSeenPosition: [-28, 0, -35],
        vehicleDescription: "Pickup noir sans plaque",
        activeWarrant: true,
      },
      {
        id: "suspect_cote",
        name: "Benoit Côté",
        stars: 2,
        reason: "Grand excès de vitesse (+55 km/h) & Refus d'obtempérer",
        bounty: 1800,
        inPursuit: false,
        lastSeenLocation: "Route 138 près du Phare",
        lastSeenPosition: [-38, 0, 60],
        vehicleDescription: "Supercar TroxT GT rouge",
        activeWarrant: true,
      },
      {
        id: "suspect_simard",
        name: "Alexandre Simard",
        stars: 3,
        reason: "Tentative d'effraction commerciale & Port d'arme prohibée",
        bounty: 3000,
        inPursuit: false,
        lastSeenLocation: "Portneuf Centre / Banque",
        lastSeenPosition: [-10, 0, 14],
        vehicleDescription: "À pied / Vêtements sombres",
        activeWarrant: true,
      },
    ];

    // Initialize initial AI patrol fleet
    this.aiPatrolVehicles = [
      {
        id: "ai_sq_101",
        callsign: "Patrouille SQ-101",
        department: "SQ",
        model: "sq_suv",
        position: [-18, 0, -25],
        rotation: 0,
        speed: 8,
        status: "patrolling",
        targetWaypointIndex: 1,
        sirenActive: false,
        lightbarActive: false,
      },
      {
        id: "ai_spvm_204",
        callsign: "Unité SPVM-204",
        department: "SPVM",
        model: "sq_cruiser",
        position: [10, 0, 15],
        rotation: 1.57,
        speed: 7,
        status: "patrolling",
        targetWaypointIndex: 3,
        sirenActive: false,
        lightbarActive: false,
      },
      {
        id: "ai_sq_stealth_09",
        callsign: "Interception Fantôme SQ-09",
        department: "SQ",
        model: "sq_unmarked",
        position: [-40, 0, 65],
        rotation: 3.14,
        speed: 9,
        status: "patrolling",
        targetWaypointIndex: 5,
        sirenActive: false,
        lightbarActive: false,
      },
    ];

    // Initialize radio messages log
    this.radioMessages = [
      {
        id: "rad_1",
        channelId: "canal_1",
        senderBadge: "DISPATCH-01",
        senderName: "Centrale d'Urgences 911",
        tenCode: "10-4",
        messageText: "Toutes les unités SQ Portneuf, prise de service confirmée pour la relève de quart.",
        timestamp: Date.now() - 300000,
        priority: "routine",
      },
      {
        id: "rad_2",
        channelId: "canal_1",
        senderBadge: "SQ-101",
        senderName: "Agent Lavoie",
        tenCode: "10-20",
        messageText: "10-20 sur Route 138 près du poste. Circulation fluide, surveillance radar active.",
        timestamp: Date.now() - 180000,
        priority: "routine",
      },
      {
        id: "rad_3",
        channelId: "canal_2",
        senderBadge: "SPVM-204",
        senderName: "Sergent Tremblay",
        tenCode: "10-80",
        messageText: "10-80 ! Véhicule suspect refusant d'obtempérer en direction du fleuve. Restez vigilants.",
        timestamp: Date.now() - 60000,
        priority: "priority",
      },
    ];
  }

  // ─── POLICE RANKS & PERKS HIERARCHY ──────────────────────────────────────
  public getRank(): PoliceRankLevel {
    return this.currentRank;
  }

  public setRank(rank: PoliceRankLevel) {
    this.currentRank = rank;
    const rankData = POLICE_RANKS[rank];
    this.officerBadge = `${rankData.badgePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  public getRankInfo(rank?: PoliceRankLevel): PoliceRankInfo {
    return POLICE_RANKS[rank || this.currentRank];
  }

  public getCurrentRankInfo(): PoliceRankInfo {
    return POLICE_RANKS[this.currentRank];
  }

  public getAllRanks(): PoliceRankInfo[] {
    return Object.values(POLICE_RANKS);
  }

  public checkPromotionEligibility(): { eligible: boolean; nextRank?: PoliceRankInfo; neededPoints: number } {
    const ranksOrder: PoliceRankLevel[] = ["cadet", "agent", "sergent", "capitaine", "directeur"];
    const currentIdx = ranksOrder.indexOf(this.currentRank);
    if (currentIdx >= ranksOrder.length - 1) {
      return { eligible: false, neededPoints: 0 };
    }
    const nextRankKey = ranksOrder[currentIdx + 1];
    const nextRank = POLICE_RANKS[nextRankKey];
    const needed = Math.max(0, nextRank.minPoints - this.patrolPoints);
    return {
      eligible: needed === 0,
      nextRank,
      neededPoints: needed,
    };
  }

  public promoteOfficerRank(): { success: boolean; newRank?: PoliceRankInfo; message: string } {
    const check = this.checkPromotionEligibility();
    if (!check.eligible || !check.nextRank) {
      return {
        success: false,
        message: `Points insuffisants (${this.patrolPoints}/${check.nextRank?.minPoints || 0} XP requis). Continuez les patrouilles !`,
      };
    }
    this.currentRank = check.nextRank.level;
    this.officerBadge = `${check.nextRank.badgePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.playDispatchChime();
    this.sendRadioMessage(
      "10-4",
      `FÉLICITATIONS : Promotion au grade de ${check.nextRank.title} officialisée par l'État-Major !`,
      "priority"
    );
    return {
      success: true,
      newRank: check.nextRank,
      message: `🎉 Promu au grade de ${check.nextRank.title} ! Nouveaux avantages et véhicules déverrouillés.`,
    };
  }

  // ─── AUDIO SQUELCH & AIRHORN SYNTHESIZER ──────────────────────────────────
  public playRadioSquelch(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === "suspended") this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      // White noise buffer for squelch burst
      const bufferSize = this.audioCtx.sampleRate * 0.12;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      // Bandpass filter to simulate police VHF radio
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      whiteNoise.start(now);
      whiteNoise.stop(now + 0.12);

      // Short Roger Beep
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1209, now + 0.12);
      oscGain.gain.setValueAtTime(0.12, now + 0.12);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);
      osc.start(now + 0.12);
      osc.stop(now + 0.22);
    } catch {
      // Ignore audio policy errors
    }
  }

  public playAirhorn(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === "suspended") this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "square";
      osc1.frequency.setValueAtTime(130, now);
      osc2.frequency.setValueAtTime(155, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch {
      // Audio fallback
    }
  }

  // ─── RADIO COMMUNICATION CHANNELS & 10-CODES ─────────────────────────────
  public getRadioChannel(): "canal_1" | "canal_2" | "canal_3" {
    return this.currentRadioChannel;
  }

  public setRadioChannel(channel: "canal_1" | "canal_2" | "canal_3"): void {
    this.currentRadioChannel = channel;
    this.playRadioSquelch();
  }

  public getRadioMessages(channelId?: "canal_1" | "canal_2" | "canal_3"): RadioMessage[] {
    if (!channelId) return this.radioMessages;
    return this.radioMessages.filter((m) => m.channelId === channelId);
  }

  public sendRadioMessage(
    tenCode: string,
    messageText: string,
    priority: "routine" | "priority" | "urgent_10_33" = "routine"
  ): RadioMessage {
    this.playRadioSquelch();

    const msg: RadioMessage = {
      id: `rad_${Date.now()}`,
      channelId: this.currentRadioChannel,
      senderBadge: this.officerBadge,
      senderName: `Agent ${this.dutyDepartment}`,
      tenCode,
      messageText,
      timestamp: Date.now(),
      priority,
    };

    this.radioMessages.unshift(msg);
    if (this.radioMessages.length > 50) this.radioMessages.pop();

    return msg;
  }

  public trigger10_33PanicButton(officerPos: [number, number, number]): { dispatchedCars: number; message: string } {
    this.playRadioSquelch();
    this.playAirhorn();

    const msg = this.sendRadioMessage(
      "10-33",
      `🚨 10-33 ! OFFICIER EN DÉTRESSE à la position [${officerPos[0].toFixed(0)}, ${officerPos[2].toFixed(0)}] ! TOUTES LES UNITÉS CODE 3 IMMÉDIAT !`,
      "urgent_10_33"
    );

    // Command all AI patrol cars to converge immediately
    let count = 0;
    this.aiPatrolVehicles.forEach((car) => {
      car.status = "responding_code3";
      car.sirenActive = true;
      car.lightbarActive = true;
      car.speed = 18; // Rush speed
      count++;
    });

    return {
      dispatchedCars: count,
      message: `🚨 CODE 10-33 ÉMIS ! ${count} véhicules de patrouille IA convergent vers vous gyrophares allumés !`,
    };
  }

  // ─── AI PATROL VEHICLES FLEET ENGINE ─────────────────────────────────────
  public getAIPatrolVehicles(): AIPatrolVehicle[] {
    return this.aiPatrolVehicles;
  }

  public updateAIPatrolVehicles(dt: number, playerPos?: [number, number, number]): number {
    const clampedDt = Math.min(dt, 0.1);
    let nearestDist = Infinity;

    this.aiPatrolVehicles.forEach((car, index) => {
      let targetX = 0;
      let targetZ = 0;
      let isChasingPlayer = false;

      // Check if this AI car should pursue the wanted player
      if (this.playerWanted.stars > 0 && playerPos) {
        const distToPlayer = Math.hypot(car.position[0] - playerPos[0], car.position[2] - playerPos[2]);
        if (distToPlayer < nearestDist) {
          nearestDist = distToPlayer;
        }

        // Star 1: Only closest car investigates; Star 2+: Multiple cars converge
        const shouldPursue = this.playerWanted.stars >= 2 || (this.playerWanted.stars === 1 && index === 0);

        if (shouldPursue) {
          isChasingPlayer = true;
          // Offset position slightly per car so they flank instead of colliding
          const flankOffsetX = index === 1 ? -4 : index === 2 ? 4 : 0;
          const flankOffsetZ = index === 1 ? -3 : index === 2 ? -3 : 0;
          targetX = playerPos[0] + flankOffsetX;
          targetZ = playerPos[2] + flankOffsetZ;

          car.status = "responding_code3";
          car.lightbarActive = true;
          car.sirenActive = this.playerWanted.stars >= 2;
        }
      }

      if (!isChasingPlayer) {
        const targetWp = this.aiWaypoints[car.targetWaypointIndex];
        if (targetWp) {
          targetX = targetWp[0];
          targetZ = targetWp[2];
        }
      }

      const dx = targetX - car.position[0];
      const dz = targetZ - car.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (!isChasingPlayer && dist < 3.0) {
        // Switch to next waypoint in circuit
        car.targetWaypointIndex = (car.targetWaypointIndex + 1) % this.aiWaypoints.length;
      } else {
        // Move towards target
        const targetAngle = Math.atan2(dx, dz);
        car.rotation = targetAngle;

        let moveSpeed = 7;
        if (isChasingPlayer) {
          moveSpeed = this.playerWanted.stars >= 4 ? 22 : this.playerWanted.stars === 3 ? 18 : 14;
        } else if (car.status === "responding_code3") {
          moveSpeed = 16;
        }

        car.speed = moveSpeed;
        car.position[0] += Math.sin(targetAngle) * moveSpeed * clampedDt;
        car.position[2] += Math.cos(targetAngle) * moveSpeed * clampedDt;
      }
    });

    return nearestDist;
  }

  public requestAIBackup(officerPos: [number, number, number]): { dispatchedCount: number; etaSeconds: number; message: string } {
    this.playRadioSquelch();

    // Find nearest AI car
    let nearestCar: AIPatrolVehicle | null = null;
    let minDist = Infinity;

    this.aiPatrolVehicles.forEach((car) => {
      const d = Math.hypot(car.position[0] - officerPos[0], car.position[2] - officerPos[2]);
      if (d < minDist) {
        minDist = d;
        nearestCar = car;
      }
    });

    if (nearestCar) {
      (nearestCar as AIPatrolVehicle).status = "responding_code3";
      (nearestCar as AIPatrolVehicle).sirenActive = true;
      (nearestCar as AIPatrolVehicle).lightbarActive = true;
      (nearestCar as AIPatrolVehicle).speed = 18;

      const eta = Math.max(5, Math.round(minDist / 18));
      this.sendRadioMessage(
        "10-4",
        `Centrale : Unité ${(nearestCar as AIPatrolVehicle).callsign} dépêchée en Code 3 à votre position. ETA estimé : ${eta} secondes.`,
        "priority"
      );

      return {
        dispatchedCount: 1,
        etaSeconds: eta,
        message: `🚓 ${(nearestCar as AIPatrolVehicle).callsign} en route en Code 3 ! Arrivée dans ~${eta}s.`,
      };
    }

    return { dispatchedCount: 0, etaSeconds: 0, message: "Aucune unité disponible sur le secteur." };
  }

  // ─── RESTRAINT & ARREST MINI-GAME ─────────────────────────────────────────
  public startRestraintMiniGame(suspectId: string, suspectName: string): RestraintMiniGame {
    this.restraintGame = {
      suspectId,
      suspectName,
      stage: "hands_up",
      complianceProgress: 20,
      timeRemaining: 30,
      struggleActive: false,
      taserRequired: false,
    };
    return this.restraintGame;
  }

  public getRestraintGame(): RestraintMiniGame | null {
    return this.restraintGame;
  }

  public advanceRestraintMiniGame(action: "verbal_command" | "apply_cuffs" | "taser_deploy" | "read_miranda"): {
    stage: string;
    progress: number;
    message: string;
    completed?: boolean;
  } {
    if (!this.restraintGame) {
      return { stage: "failed", progress: 0, message: "Aucune arrestation en cours." };
    }

    const g = this.restraintGame;

    if (action === "verbal_command") {
      g.complianceProgress = Math.min(100, g.complianceProgress + 30);
      if (g.complianceProgress >= 50) {
        g.stage = "cuffing";
        return {
          stage: g.stage,
          progress: g.complianceProgress,
          message: "🗣️ 'Police ! Ne bougez plus et mettez vos mains derrière le dos !' -> Le suspect s'exécute.",
        };
      }
      return {
        stage: g.stage,
        progress: g.complianceProgress,
        message: "🗣️ Sommation répétée : Le suspect hésite...",
      };
    } else if (action === "apply_cuffs") {
      if (g.stage !== "cuffing") {
        return { stage: g.stage, progress: g.complianceProgress, message: "⚠️ Vous devez d'abord obtenir la conformité du suspect !" };
      }
      g.complianceProgress = 85;
      g.stage = "miranda";
      this.playDispatchChime();
      return {
        stage: g.stage,
        progress: g.complianceProgress,
        message: "🔒 *CLIC-CLAC* Menottes verrouillées aux poignets. Suspect sécurisé.",
      };
    } else if (action === "taser_deploy") {
      g.complianceProgress = 80;
      g.stage = "cuffing";
      g.struggleActive = false;
      this.playAirhorn();
      return {
        stage: g.stage,
        progress: g.complianceProgress,
        message: "⚡ Taser déployé ! Suspect immobilisé et mis au sol en toute sécurité.",
      };
    } else if (action === "read_miranda") {
      g.complianceProgress = 100;
      g.stage = "completed";
      this.arrestPlayer(
        g.suspectId,
        g.suspectName,
        this.officerBadge,
        180,
        "Arrestation officielle sous mandat ou flagrant délit"
      );
      this.patrolPoints += 75;
      this.sendRadioMessage("10-97", `Suspect ${g.suspectName} maîtrisé et menotté. Prêt pour transfert en cellule.`);
      this.restraintGame = null;
      return {
        stage: "completed",
        progress: 100,
        message: "📜 Droits de la Charte québécoise énoncés. Arrestation confirmée (+75 XP) !",
        completed: true,
      };
    }

    return { stage: g.stage, progress: g.complianceProgress, message: "Action inconnue." };
  }

  public cancelRestraintMiniGame(): void {
    this.restraintGame = null;
  }

  // ─── QUEBEC CSR CITATIONS ────────────────────────────────────────────────
  public getCSRCitations(): CSRCitation[] {
    return QUEBEC_CSR_CITATIONS;
  }

  public issueCSRTicket(
    citationCode: string,
    targetName: string,
    notes?: string
  ): { success: boolean; ticket?: PoliceTicket; message: string } {
    const citation = QUEBEC_CSR_CITATIONS.find((c) => c.code === citationCode);
    if (!citation) {
      return { success: false, message: "Infraction CSR non trouvée." };
    }

    const ticket = this.issueTicket(
      "local_player",
      targetName,
      this.officerBadge,
      `Agent ${this.dutyDepartment} Portneuf`,
      this.dutyDepartment,
      citation.fineAmount,
      `${citation.article} : ${citation.description}${notes ? ` (${notes})` : ""}`
    );

    this.patrolPoints += 35;
    this.sendRadioMessage(
      "10-4",
      `Constat d'infraction émis à ${targetName} : ${citation.article} (${citation.fineAmount}$) - ${citation.demeritPoints} pts d'inaptitude.`
    );

    return {
      success: true,
      ticket,
      message: `📋 Constat d'infraction remis : ${citation.article} - ${citation.fineAmount}$ (${citation.demeritPoints} points d'inaptitude).`,
    };
  }

  // ─── ROLES & DUTY MANAGERS ────────────────────────────────────────────────
  public setRole(role: PoliceRole) {
    this.currentRole = role;
  }

  public getRole(): PoliceRole {
    return this.currentRole;
  }

  public toggleDuty(department: "SPVM" | "SQ" = "SQ"): boolean {
    this.isOnDuty = !this.isOnDuty;
    this.dutyDepartment = department;
    if (this.isOnDuty) {
      this.playDispatchChime();
    }
    return this.isOnDuty;
  }

  public getDutyStatus(): {
    isOnDuty: boolean;
    department: "SPVM" | "SQ";
    badge: string;
    points: number;
    role: PoliceRole;
  } {
    return {
      isOnDuty: this.isOnDuty,
      department: this.dutyDepartment,
      badge: this.officerBadge,
      points: this.patrolPoints,
      role: this.currentRole,
    };
  }

  public addPatrolPoints(pts: number) {
    this.patrolPoints += pts;
  }

  // ─── RECRUITMENT & UNIFORM SELECTION ──────────────────────────────────────
  public joinDepartment(
    dept: "SQ" | "SPVM",
    role: PoliceRole = "patrol_officer"
  ): { success: boolean; message: string; badge: string } {
    this.dutyDepartment = dept;
    this.currentRole = role;
    this.isOnDuty = true;
    const prefix = dept === "SQ" ? "SQ" : "SPVM";
    const num = Math.floor(1000 + Math.random() * 9000);
    this.officerBadge = `${prefix}-${num}`;
    this.selectedUniformId = dept === "SQ" ? "sq_patrol_regular" : "spvm_patrol_regular";
    this.playDispatchChime();
    return {
      success: true,
      message: `Enrôlement confirmé : Bienvenue à la ${dept === "SQ" ? "Sûreté du Québec" : "Police Municipale"} ! Matricule : ${this.officerBadge}`,
      badge: this.officerBadge,
    };
  }

  public leaveDepartment(): { success: boolean; message: string } {
    this.isOnDuty = false;
    this.togglePoliceSiren(false);
    return {
      success: true,
      message: "Vous avez rendu votre insigne et quitté vos fonctions de police. Retour au statut civil.",
    };
  }

  public setDepartment(dept: "SQ" | "SPVM") {
    this.dutyDepartment = dept;
  }

  public getDepartment(): "SQ" | "SPVM" {
    return this.dutyDepartment;
  }

  public selectUniform(uniformId: string): PoliceUniform | undefined {
    const uniform = POLICE_UNIFORMS.find((u) => u.id === uniformId);
    if (uniform) {
      this.selectedUniformId = uniform.id;
      this.dutyDepartment = uniform.department;
      this.currentRole = uniform.role;
      this.playDispatchChime();
      return uniform;
    }
    return undefined;
  }

  public getSelectedUniform(): PoliceUniform {
    const u = POLICE_UNIFORMS.find((item) => item.id === this.selectedUniformId);
    return u || POLICE_UNIFORMS[0];
  }

  public getAvailableUniforms(): PoliceUniform[] {
    return POLICE_UNIFORMS;
  }

  // ─── FRISK & ARREST ENHANCEMENTS ──────────────────────────────────────────
  public friskSuspect(targetPlayerId: string): {
    contrabandFound: string[];
    cashFound: number;
    weaponsFound: string[];
    message: string;
  } {
    const possibleContraband = [
      "Alcool ouvert dans sac à dos",
      "Substance illicite (Sachets)",
      "Détecteur de radar non homologué",
      "Fourrure de castor sans permis de trappe",
      "Passe-partout de cambriolage",
    ];
    const possibleWeapons = [
      "Couteau à cran d'arrêt interdit",
      "Pistolet 9mm sans permis de transport",
      "Batte de baseball plombée",
    ];

    const hasContraband = Math.random() < 0.65;
    const hasWeapon = Math.random() < 0.4;
    const cash = Math.floor(40 + Math.random() * 450);

    const contrabandFound = hasContraband
      ? [possibleContraband[Math.floor(Math.random() * possibleContraband.length)]]
      : [];
    const weaponsFound = hasWeapon
      ? [possibleWeapons[Math.floor(Math.random() * possibleWeapons.length)]]
      : [];

    let msg = `Fouille corporelle effectuée sur le suspect.`;
    if (contrabandFound.length > 0 || weaponsFound.length > 0) {
      msg = `⚠️ Objets illégaux saisis : ${[...weaponsFound, ...contrabandFound].join(", ")} | ${cash}$ confisqués.`;
    } else {
      msg = `Fouille négative. Aucun objet dangereux ou illégal trouvé (${cash}$ en liquide légal).`;
    }

    return { contrabandFound, cashFound: cash, weaponsFound, message: msg };
  }

  // ─── PATROL CHECKPOINT ROUTE SYSTEM ──────────────────────────────────────
  public getPatrolCheckpoints(): PatrolCheckpoint[] {
    return this.patrolCheckpoints;
  }

  public visitCheckpoint(cpId: string): { completedLap: boolean; bonusPoints: number } {
    const cp = this.patrolCheckpoints.find((c) => c.id === cpId);
    if (!cp || cp.visited) return { completedLap: false, bonusPoints: 0 };

    cp.visited = true;
    this.patrolPoints += 30;

    const allVisited = this.patrolCheckpoints.every((c) => c.visited);
    if (allVisited) {
      // Reset lap and award bonus
      this.patrolCheckpoints.forEach((c) => (c.visited = false));
      this.patrolPoints += 100;
      return { completedLap: true, bonusPoints: 100 };
    }

    return { completedLap: false, bonusPoints: 30 };
  }

  // ─── DETECTIVE & CRIMINAL DATABASE ─────────────────────────────────────────
  public searchCriminalRecords(query: string): CriminalRecord[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.criminalRecords;
    return this.criminalRecords.filter(
      (r) =>
        r.citizenName.toLowerCase().includes(q) ||
        r.licenseNumber.toLowerCase().includes(q) ||
        (r.vehiclePlate && r.vehiclePlate.toLowerCase().includes(q))
    );
  }

  public lookupPlate(plateInput: string): VehiclePlateData | undefined {
    const p = plateInput.toUpperCase().trim();
    return this.vehiclePlates.find((vp) => vp.plate.toUpperCase() === p);
  }

  public getCrimeEvidences(): CrimeSceneEvidence[] {
    return this.crimeEvidences;
  }

  public analyzeEvidence(evidenceId: string): CrimeSceneEvidence | undefined {
    const ev = this.crimeEvidences.find((e) => e.id === evidenceId);
    if (ev) {
      ev.analyzed = true;
      this.patrolPoints += 45; // Award detective points
    }
    return ev;
  }

  // ─── SPEED RADAR SYSTEM ──────────────────────────────────────────────────
  public toggleRadar(): boolean {
    this.isRadarActive = !this.isRadarActive;
    return this.isRadarActive;
  }

  public isRadarOn(): boolean {
    return this.isRadarActive;
  }

  public getRadarAlerts(): SpeedRadarAlert[] {
    return [...this.radarAlerts];
  }

  public clearRadarAlerts(): void {
    this.radarAlerts = [];
  }

  public addRadarAlert(alert: Omit<SpeedRadarAlert, "id" | "timestamp"> & { id?: string; timestamp?: number }): SpeedRadarAlert {
    const excessKmH = alert.excessKmH !== undefined ? alert.excessKmH : Math.max(0, alert.speedKmH - alert.speedLimitKmH);
    const isCritical = alert.isCritical !== undefined ? alert.isCritical : (excessKmH >= 30 || alert.speedKmH >= 110);
    const newAlert: SpeedRadarAlert = {
      id: alert.id || `radar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      vehicleId: alert.vehicleId,
      vehicleName: alert.vehicleName,
      driverName: alert.driverName,
      plate: alert.plate || "XXX-999",
      speedKmH: alert.speedKmH,
      speedLimitKmH: alert.speedLimitKmH,
      excessKmH,
      location: alert.location || "Réseau Routier Québec",
      timestamp: alert.timestamp || Date.now(),
      isCritical,
    };
    this.radarAlerts.unshift(newAlert);
    if (this.radarAlerts.length > 50) {
      this.radarAlerts.pop();
    }
    return newAlert;
  }

  public triggerSimulatedRadarScan(): SpeedRadarAlert {
    const models = [
      { name: "Audi RS6 Avant", limit: 70, loc: "Autoroute 40 Est - KM 288" },
      { name: "BMW M4 Competition", limit: 50, loc: "Rue Saint-Jean / Vieux-Québec" },
      { name: "Chevrolet Corvette Z06", limit: 90, loc: "Pont Rive-Sud Neuville" },
      { name: "Subaru WRX STI", limit: 50, loc: "Avenue Maguire / Sillery" },
      { name: "Porsche 911 GT3", limit: 70, loc: "Boulevard Laurier" },
      { name: "Dodge Charger Pursuit", limit: 90, loc: "Autoroute 15 Nord (Km 42)" },
    ];
    const choice = models[Math.floor(Math.random() * models.length)];
    const isGrandExcess = Math.random() > 0.35;
    const excess = isGrandExcess
      ? Math.floor(Math.random() * 45) + 32
      : Math.floor(Math.random() * 20) + 10;
    const speedKmH = choice.limit + excess;

    const names = ["Éric Lapointe", "Benoit Côté", "Félix Fortin", "David Mercier", "Alexandre Simard", "Chantal Tremblay"];
    const driver = names[Math.floor(Math.random() * names.length)];
    const plate = `${Math.floor(Math.random() * 899 + 100)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;

    return this.addRadarAlert({
      vehicleId: `sim_veh_${Date.now()}`,
      vehicleName: choice.name,
      driverName: driver,
      plate,
      speedKmH,
      speedLimitKmH: choice.limit,
      excessKmH: excess,
      location: choice.loc,
      isCritical: excess >= 30 || speedKmH >= 110,
    });
  }

  public scanVehicleSpeed(
    vehicleId: string,
    vehicleName: string,
    driverName: string,
    rawSpeed: number,
    isHighwayZone: boolean = false
  ): RadarScanData {
    const speedKmH = Math.round(Math.abs(rawSpeed) * 18);
    const speedLimitKmH = isHighwayZone ? 90 : 50;
    const isViolation = speedKmH > speedLimitKmH + 5;
    const excessKmH = Math.max(0, speedKmH - speedLimitKmH);

    if (isViolation) {
      this.addRadarAlert({
        vehicleId,
        vehicleName,
        driverName,
        plate: `QUE-${Math.floor(Math.random() * 899 + 100)}`,
        speedKmH,
        speedLimitKmH,
        excessKmH,
        location: isHighwayZone ? "Autoroute 40 (Secteur SQ)" : "Boulevard Centre-Ville (SPVM)",
        isCritical: excessKmH >= 30 || speedKmH >= 110,
      });
    }

    return {
      vehicleId,
      vehicleName,
      driverName,
      speedKmH,
      speedLimitKmH,
      isViolation,
      excessKmH,
    };
  }

  // ─── TICKETING MECHANICS ───────────────────────────────────────────────────
  public issueTicket(
    targetId: string,
    targetName: string,
    officerId: string,
    officerName: string,
    department: "SPVM" | "SQ",
    amount: number,
    reason: string
  ): PoliceTicket {
    const ticket: PoliceTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      targetId,
      targetName,
      officerId,
      officerName,
      department,
      amount,
      reason,
      timestamp: Date.now(),
      paid: false,
    };
    this.tickets.unshift(ticket);
    this.patrolPoints += 25;
    return ticket;
  }

  public getUnpaidTickets(targetId: string): PoliceTicket[] {
    return this.tickets.filter((t) => t.targetId === targetId && !t.paid);
  }

  public getAllTickets(): PoliceTicket[] {
    return [...this.tickets];
  }

  public payTicket(ticketId: string): boolean {
    const t = this.tickets.find((item) => item.id === ticketId);
    if (t) {
      t.paid = true;
      return true;
    }
    return false;
  }

  // ─── HANDCUFF & BOOKING MECHANICS ──────────────────────────────────────────
  public toggleCuff(playerId: string): boolean {
    if (this.handcuffedPlayers.has(playerId)) {
      this.handcuffedPlayers.delete(playerId);
      return false;
    } else {
      this.handcuffedPlayers.add(playerId);
      return true;
    }
  }

  public cuffPlayer(playerId: string): boolean {
    this.handcuffedPlayers.add(playerId);
    return true;
  }

  public unCuffPlayer(playerId: string): boolean {
    this.handcuffedPlayers.delete(playerId);
    return true;
  }

  public isHandcuffed(playerId: string): boolean {
    return this.handcuffedPlayers.has(playerId);
  }

  public jailPlayer(
    playerId: string,
    playerName: string,
    reason: string,
    officerName: string,
    durationSeconds: number,
    bailAmount?: number
  ): JailRecord {
    const record = this.arrestPlayer(playerId, playerName, officerName, durationSeconds, reason);
    if (bailAmount !== undefined) {
      record.bailAmount = bailAmount;
    }
    return record;
  }

  public arrestPlayer(
    playerId: string,
    playerName: string,
    officerName: string,
    durationSeconds: number,
    reason: string
  ): JailRecord {
    const bail = durationSeconds * 25;
    const record: JailRecord = {
      playerId,
      playerName,
      reason,
      officerName,
      timeRemaining: durationSeconds,
      totalTime: durationSeconds,
      bailAmount: bail,
    };

    this.jailRecords.set(playerId, record);
    this.handcuffedPlayers.delete(playerId);
    this.patrolPoints += 50;

    // Log official booking record
    this.bookingRecords.unshift({
      id: `book_${Date.now()}`,
      suspectName: playerName,
      officerName,
      role: this.currentRole,
      offense: reason,
      bailAmount: bail,
      timestamp: Date.now(),
    });

    return record;
  }

  public getBookingRecords(): BookingRecord[] {
    return this.bookingRecords;
  }

  public getJailStatus(playerId: string): JailRecord | undefined {
    return this.jailRecords.get(playerId);
  }

  public updateJailTime(playerId: string, deltaSeconds: number): number {
    const record = this.jailRecords.get(playerId);
    if (!record) return 0;

    record.timeRemaining = Math.max(0, record.timeRemaining - deltaSeconds);
    if (record.timeRemaining === 0) {
      this.jailRecords.delete(playerId);
      return 0;
    }
    return record.timeRemaining;
  }

  public payBail(playerId: string): boolean {
    if (this.jailRecords.has(playerId)) {
      this.jailRecords.delete(playerId);
      return true;
    }
    return false;
  }

  // ─── DISPATCH CALLOUT SYSTEM ───────────────────────────────────────────────
  public triggerDispatchCallout(
    code: DispatchCallout["code"],
    title: string,
    description: string,
    locationName: string,
    position: [number, number, number],
    priority: DispatchCallout["priority"] = "medium"
  ): DispatchCallout {
    const callout: DispatchCallout = {
      id: `callout_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      code,
      title,
      description,
      locationName,
      position,
      timestamp: Date.now(),
      active: true,
      priority,
    };
    this.dispatchCallouts.unshift(callout);
    this.playDispatchChime();
    return callout;
  }

  public getActiveCallouts(): DispatchCallout[] {
    return this.dispatchCallouts.filter((c) => c.active);
  }

  public resolveCallout(calloutId: string) {
    const c = this.dispatchCallouts.find((item) => item.id === calloutId);
    if (c) {
      c.active = false;
      this.patrolPoints += 40;
    }
  }

  // ─── SYNTHESIZED SOUND & POLICE AUDIO EFFECTS ─────────────────────────────
  public playDispatchChime() {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === "suspended") this.audioCtx.resume();

      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
      osc2.frequency.setValueAtTime(1174.66, this.audioCtx.currentTime + 0.12); // D6

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(this.audioCtx.currentTime);
      osc1.stop(this.audioCtx.currentTime + 0.12);

      osc2.start(this.audioCtx.currentTime + 0.12);
      osc2.stop(this.audioCtx.currentTime + 0.35);
    } catch (e) {}
  }

  public togglePoliceSiren(active?: boolean, mode?: "wail" | "yelp" | "hyper"): boolean {
    if (mode) this.sirenMode = mode;
    const nextState = active !== undefined ? active : !this.isSirenActive;
    this.isSirenActive = nextState;

    if (!this.isSirenActive) {
      this.stopSirenSound();
      return false;
    }

    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      this.stopSirenSound();

      this.sirenOsc = this.audioCtx.createOscillator();
      this.sirenGain = this.audioCtx.createGain();

      this.sirenOsc.type = "sawtooth";
      this.sirenOsc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      this.sirenGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.audioCtx.destination);

      this.sirenOsc.start();

      let highPitch = false;
      const intervalMs = this.sirenMode === "hyper" ? 100 : this.sirenMode === "yelp" ? 200 : 400;
      const lowFreq = this.sirenMode === "hyper" ? 900 : this.sirenMode === "yelp" ? 800 : 600;
      const highFreq = this.sirenMode === "hyper" ? 1600 : this.sirenMode === "yelp" ? 1450 : 950;

      this.sirenInterval = setInterval(() => {
        if (!this.sirenOsc || !this.audioCtx) return;
        highPitch = !highPitch;
        const targetFreq = highPitch ? highFreq : lowFreq;
        this.sirenOsc.frequency.exponentialRampToValueAtTime(
          targetFreq,
          this.audioCtx.currentTime + (intervalMs / 1000) * 0.85
        );
      }, intervalMs);

    } catch (e) {
      console.warn("AudioContext error starting police siren:", e);
    }

    return true;
  }

  public setSirenMode(mode: "wail" | "yelp" | "hyper") {
    this.sirenMode = mode;
    if (this.isSirenActive) {
      this.togglePoliceSiren(true, mode);
    }
  }

  public triggerAirhorn() {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === "suspended") this.audioCtx.resume();

      const hornOsc = this.audioCtx.createOscillator();
      const hornGain = this.audioCtx.createGain();

      hornOsc.type = "sawtooth";
      hornOsc.frequency.setValueAtTime(180, this.audioCtx.currentTime);
      hornGain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      hornGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      hornOsc.connect(hornGain);
      hornGain.connect(this.audioCtx.destination);

      hornOsc.start();
      hornOsc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {}
  }

  public playMegaphoneAnnouncement(type: "pull_over" | "step_out" | "sq_warning") {
    this.triggerAirhorn();
    this.playDispatchChime();
  }

  private stopSirenSound() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
      } catch (e) {}
      this.sirenOsc = null;
    }
  }

  public getSirenState(): { active: boolean; mode: "wail" | "yelp" | "hyper" } {
    return {
      active: this.isSirenActive,
      mode: this.sirenMode,
    };
  }

  // ─── PATROL MODES MANAGEMENT ──────────────────────────────────────────────
  public setPatrolMode(mode: PatrolMode): { mode: PatrolMode; description: string } {
    this.currentPatrolMode = mode;
    this.playDispatchChime();
    let desc = "Patrouille de routine active.";

    if (mode === "code1_routine") {
      desc = "Code 1 : Patrouille de routine. Feux de croisière discrets, surveillance générale.";
      this.lightbarPattern = "code1_cruise";
      this.togglePoliceSiren(false);
    } else if (mode === "code2_traffic_stop") {
      desc = "Code 2 : Contrôle Routier / Radar actif. Feux d'urgence sans sirène continue.";
      this.lightbarPattern = "code2_wigwag";
      this.togglePoliceSiren(false);
    } else if (mode === "code3_emergency") {
      desc = "Code 3 : INTERVENTION D'URGENCE / POUTE. Gyrophares complets et sirène activée !";
      this.lightbarPattern = "code3_hyper_strobe";
      this.togglePoliceSiren(true, "yelp");
    } else if (mode === "wildlife_ranger") {
      desc = "Patrouille Faunique : Surveillance MFFP contre le braconnage et protection de la faune.";
      this.lightbarPattern = "code1_cruise";
    }

    return { mode, description: desc };
  }

  public getPatrolMode(): PatrolMode {
    return this.currentPatrolMode;
  }

  // ─── AAAA LIGHTBAR & EMERGENCY LIGHTING CONTROLS ──────────────────────────
  public setLightbarPattern(pattern: "code1_cruise" | "code2_wigwag" | "code3_quad_burst" | "code3_hyper_strobe") {
    this.lightbarPattern = pattern;
  }

  public getLightbarPattern() {
    return this.lightbarPattern;
  }

  public toggleAlleyLights(mode?: "off" | "left" | "right" | "both"): "off" | "left" | "right" | "both" {
    if (mode) {
      this.alleyLights = mode;
    } else {
      const modes: ("off" | "left" | "right" | "both")[] = ["off", "left", "right", "both"];
      const nextIdx = (modes.indexOf(this.alleyLights) + 1) % modes.length;
      this.alleyLights = modes[nextIdx];
    }
    return this.alleyLights;
  }

  public getAlleyLights(): "off" | "left" | "right" | "both" {
    return this.alleyLights;
  }

  public toggleTakedownLights(): boolean {
    this.takedownLights = !this.takedownLights;
    return this.takedownLights;
  }

  public getTakedownLights(): boolean {
    return this.takedownLights;
  }

  public setTrafficAdvisor(direction: "off" | "left" | "right" | "split") {
    this.trafficAdvisor = direction;
  }

  public getTrafficAdvisor(): "off" | "left" | "right" | "split" {
    return this.trafficAdvisor;
  }

  public getVehicleLightbarState() {
    return {
      patrolMode: this.currentPatrolMode,
      pattern: this.lightbarPattern,
      sirenSound: this.currentPatrolMode === "code3_emergency",
      alleyLights: this.alleyLights,
      takedownLights: this.takedownLights,
      trafficAdvisor: this.trafficAdvisor,
    };
  }

  // ─── NPC TRAFFIC STOP SIMULATION ENGINE ────────────────────────────────────
  public startTrafficStop(target?: { name?: string; plate?: string; model?: string; reason?: string }): NPCTrafficStop {
    const suspectTemplate = this.defaultNPCSuspects[Math.floor(Math.random() * this.defaultNPCSuspects.length)];
    const driverName = target?.name || suspectTemplate.name;
    const plate = target?.plate || suspectTemplate.plate;
    const vehicleModel = target?.model || suspectTemplate.model;
    const reason = target?.reason || (Math.random() > 0.5 ? "Grand excès de vitesse (+45 km/h)" : "Conduite louvoyante / Véhicule suspect");

    const hasAlcohol = Math.random() > 0.65;
    const bac = hasAlcohol ? +(0.06 + Math.random() * 0.08).toFixed(2) : 0.0;
    const hasContraband = Math.random() > 0.5;

    const stop: NPCTrafficStop = {
      id: `stop_${Date.now()}`,
      vehicleId: `veh_npc_${Date.now()}`,
      vehicleModel,
      plate,
      driverName,
      reason,
      stage: "pulling_over",
      driverLicense: {
        valid: Math.random() > 0.2,
        number: `SAAQ-${driverName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        points: Math.floor(4 + Math.random() * 11),
        expiry: "2027-08-15",
      },
      breathalyzerBAC: bac,
      contrabandFound: hasContraband ? suspectTemplate.defaultContraband : [],
      driverDemeanor: bac > 0.08 ? "belligerent" : hasContraband ? "nervous" : "compliant",
    };

    this.activeTrafficStop = stop;
    this.playMegaphoneAnnouncement("pull_over");
    this.patrolPoints += 15;
    return stop;
  }

  public getActiveTrafficStop(): NPCTrafficStop | null {
    return this.activeTrafficStop;
  }

  public advanceTrafficStopStage(
    stage: NPCTrafficStop["stage"]
  ): NPCTrafficStop | null {
    if (!this.activeTrafficStop) return null;
    this.activeTrafficStop.stage = stage;
    return this.activeTrafficStop;
  }

  public conductBreathalyzer(): { bac: number; isOverLimit: boolean; message: string } {
    if (!this.activeTrafficStop) {
      return { bac: 0, isOverLimit: false, message: "Aucun conducteur intercepté." };
    }

    const bac = this.activeTrafficStop.breathalyzerBAC;
    const isOverLimit = bac >= 0.08;
    this.activeTrafficStop.stage = "breathalyzer_tested";

    return {
      bac,
      isOverLimit,
      message: isOverLimit
        ? `⚠️ POSITIF : ${bac} g/L (Limite légale QC : 0.08). Faculté affaiblie confirmée !`
        : `✅ NÉGATIF : ${bac} g/L. Taux d'alcool dans les limites autorisées.`,
    };
  }

  public searchTrafficVehicle(): { itemsFound: string[]; message: string } {
    if (!this.activeTrafficStop) {
      return { itemsFound: [], message: "Aucun véhicule en cours d'interception." };
    }

    this.activeTrafficStop.stage = "vehicle_searched";
    const items = this.activeTrafficStop.contrabandFound;
    return {
      itemsFound: items,
      message: items.length > 0
        ? `🚨 Saisie : ${items.join(", ")} trouvé(s) dans le coffre/habitacle !`
        : "✅ Véhicule fouillé : Aucun objet illicite découvert.",
    };
  }

  public concludeTrafficStop(
    outcome: "warning" | "ticket" | "arrest",
    details?: { amount?: number; citation?: string }
  ): { success: boolean; pointsGained: number; summary: string } {
    if (!this.activeTrafficStop) {
      return { success: false, pointsGained: 0, summary: "Aucune interception active." };
    }

    this.activeTrafficStop.outcome = outcome;
    this.activeTrafficStop.stage = "concluded";
    let pts = 20;

    if (outcome === "ticket") {
      pts = 50;
      this.issueTicket(
        this.activeTrafficStop.id,
        this.activeTrafficStop.driverName,
        this.officerBadge,
        this.dutyDepartment === "SQ" ? "Agent SQ Portneuf" : "Agent SPVM",
        this.dutyDepartment,
        details?.amount || 320,
        details?.citation || this.activeTrafficStop.reason
      );
    } else if (outcome === "arrest") {
      pts = 100;
      this.arrestPlayer(
        this.activeTrafficStop.id,
        this.activeTrafficStop.driverName,
        this.officerBadge,
        300,
        `${this.activeTrafficStop.reason} (BAC: ${this.activeTrafficStop.breathalyzerBAC} g/L)`
      );
    }

    this.patrolPoints += pts;
    const summary = `Interception de ${this.activeTrafficStop.driverName} terminée : Résultat -> ${outcome.toUpperCase()} (+${pts} XP patrouille).`;
    this.activeTrafficStop = null;

    return { success: true, pointsGained: pts, summary };
  }

  // ─── DYNAMIC WANTED LEVEL & PURSUIT SYSTEM (SQ ÉTOILES DE RECHERCHE) ─────
  public getPlayerWantedState(): PlayerWantedState {
    return {
      ...this.playerWanted,
      isWanted: this.playerWanted.stars > 0,
      heat: this.playerWanted.heatScore,
      evasionTimer: this.playerWanted.evasionCountdown,
    };
  }

  public reportCrime(
    crime:
      | "speeding_minor"
      | "speeding_excessive"
      | "traffic_evasion"
      | "hit_and_run"
      | "firearm_discharge"
      | "poaching_protected"
      | "officer_assault"
      | "grand_theft_auto",
    pos?: [number, number, number]
  ): PlayerWantedState {
    let addedStars = 1;
    let reason = "Infraction mineure au Code de la sécurité routière";
    let bounty = 600;

    switch (crime) {
      case "speeding_minor":
        addedStars = 1;
        reason = "Excès de vitesse modéré (+30 km/h)";
        bounty = 450;
        break;
      case "speeding_excessive":
        addedStars = 2;
        reason = "Grand excès de vitesse (+50 km/h) en zone habitée";
        bounty = 1200;
        break;
      case "traffic_evasion":
        addedStars = 2;
        reason = "Refus d'obtempérer et fuite lors d'un contrôle de police";
        bounty = 1800;
        break;
      case "hit_and_run":
        addedStars = 3;
        reason = "Délit de fuite et collision avec véhicule / piéton";
        bounty = 2800;
        break;
      case "firearm_discharge":
        addedStars = 3;
        reason = "Décharge d'arme à feu prohibée sur la voie publique";
        bounty = 3500;
        break;
      case "poaching_protected":
        addedStars = 3;
        reason = "Braconnage d'orignal québécois sans permis faunique";
        bounty = 3200;
        break;
      case "officer_assault":
        addedStars = 4;
        reason = "Agression armée contre un agent de la Sûreté du Québec";
        bounty = 6000;
        break;
      case "grand_theft_auto":
        addedStars = 4;
        reason = "Vol d'un véhicule d'urgence de la Sûreté du Québec";
        bounty = 7500;
        break;
    }

    const newStars = Math.min(5, Math.max(1, this.playerWanted.stars + addedStars));
    return this.setWantedStars(newStars, reason, bounty, pos);
  }

  public setWantedStars(
    stars: number,
    reason?: string,
    bounty?: number,
    pos?: [number, number, number]
  ): PlayerWantedState {
    const clampedStars = Math.min(5, Math.max(0, stars));
    this.playerWanted.stars = clampedStars;
    this.playerWanted.heatScore = clampedStars * 20;

    if (clampedStars > 0) {
      if (reason) this.playerWanted.wantedReason = reason;
      this.playerWanted.bounty = bounty || clampedStars * 1500;
      this.playerWanted.inPursuit = true;
      this.playerWanted.evading = false;
      this.playerWanted.evasionCountdown = 20;
      this.playerWanted.lastCrimeTimestamp = Date.now();
      if (pos) this.playerWanted.lastKnownPosition = pos;

      // Broadcast radio APB
      this.sendRadioMessage(
        "10-80",
        `[CENTRAL APB] Suspect activement recherché (${clampedStars}★). Motif: ${this.playerWanted.wantedReason}. Prime: ${this.playerWanted.bounty}$. Priorité ${clampedStars >= 4 ? "GTI / SWAT" : "Patrouille"}.`,
        clampedStars >= 3 ? "urgent_10_33" : "priority"
      );

      // Play alert chime
      this.playAirhorn();
    } else {
      this.clearWantedLevel("Avis levé par les autorités");
    }

    // Sync with server in background
    fetch("/api/police/wanted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: "local_player",
        playerName: "Citoyen Local",
        stars: this.playerWanted.stars,
        wantedReason: this.playerWanted.wantedReason,
        bounty: this.playerWanted.bounty,
        inPursuit: this.playerWanted.inPursuit,
        position: this.playerWanted.lastKnownPosition,
      }),
    }).catch(() => {});

    return this.playerWanted;
  }

  public updateWantedState(
    dt: number,
    playerPos: [number, number, number],
    nearestPoliceDist: number
  ): PlayerWantedState {
    if (this.playerWanted.stars === 0) return this.playerWanted;

    // Update last known position if police is close enough to have line of sight (< 38m)
    if (nearestPoliceDist < 38) {
      this.playerWanted.lastKnownPosition = playerPos;
      this.playerWanted.evading = false;
      this.playerWanted.inPursuit = true;
      this.playerWanted.evasionCountdown = 20;
    } else {
      // Police lost line of sight -> enter evasion mode
      this.playerWanted.evading = true;
      this.playerWanted.evasionCountdown -= dt;

      if (this.playerWanted.evasionCountdown <= 0) {
        // Drop one star!
        this.playerWanted.stars = Math.max(0, this.playerWanted.stars - 1);
        this.playerWanted.heatScore = this.playerWanted.stars * 20;
        this.playerWanted.evasionCountdown = 15; // Faster for subsequent stars

        if (this.playerWanted.stars === 0) {
          this.clearWantedLevel("Évasion réussie - Poursuite abandonnée");
        } else {
          this.sendRadioMessage(
            "10-7",
            `Périmètre élargi : Le suspect a semé les unités directes. Étoiles réduites à ${this.playerWanted.stars}★.`,
            "routine"
          );
        }
      }
    }

    return {
      ...this.playerWanted,
      isWanted: this.playerWanted.stars > 0,
      heat: this.playerWanted.heatScore,
      evasionTimer: this.playerWanted.evasionCountdown,
    };
  }

  public clearWantedLevel(reason = "Recherche levée"): void {
    this.playerWanted = {
      stars: 0,
      heatScore: 0,
      wantedReason: "",
      bounty: 0,
      inPursuit: false,
      evading: false,
      evasionCountdown: 20,
      lastCrimeTimestamp: 0,
      lastKnownPosition: [0, 0, 0],
    };

    // Reset AI cars to normal patrol
    this.aiPatrolVehicles.forEach((car) => {
      car.status = "patrolling";
      car.sirenActive = false;
      car.lightbarActive = false;
      car.speed = 7;
    });

    this.sendRadioMessage(
      "10-4",
      `Centrale : Code 4 général. Fin de la poursuite (${reason}). Reprise des patrouilles régulières.`,
      "routine"
    );

    // Sync clearing with server
    fetch("/api/police/wanted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: "local_player",
        stars: 0,
      }),
    }).catch(() => {});
  }

  public getWantedSuspects(): WantedSuspectEntry[] {
    return this.wantedSuspects;
  }

  public addWantedSuspect(
    suspect: Partial<WantedSuspectEntry> & { name: string; reason: string; stars: number; bounty: number }
  ): WantedSuspectEntry {
    const fullEntry: WantedSuspectEntry = {
      id: suspect.id || `suspect_${Date.now()}`,
      name: suspect.name,
      stars: suspect.stars,
      reason: suspect.reason,
      bounty: suspect.bounty,
      inPursuit: suspect.inPursuit ?? false,
      lastSeenLocation: suspect.lastSeenLocation || "Portneuf",
      lastSeenPosition: suspect.lastSeenPosition || [0, 0, 0],
      activeWarrant: suspect.activeWarrant ?? true,
      vehicleDescription: suspect.vehicleDescription,
    };
    this.wantedSuspects.unshift(fullEntry);
    return fullEntry;
  }

  public removeWantedSuspect(id: string): void {
    this.wantedSuspects = this.wantedSuspects.filter((s) => s.id !== id);
  }

  // ─── PLAYER ROLES AND PERMISSIONS FOR SQ OFFICERS ─────────────────────────
  public hasPermission(
    permission: PolicePermission,
    rankOverride?: PoliceRankLevel,
    roleOverride?: PoliceRole
  ): boolean {
    const rank = rankOverride || this.currentRank;
    const role = roleOverride || this.currentRole;

    // Wildlife Ranger has specialized permissions
    if (role === "wildlife_ranger") {
      const allowed: PolicePermission[] = [
        "use_speed_radar",
        "issue_csr_ticket",
        "traffic_stop",
        "search_vehicle",
        "collect_evidence",
        "analyze_evidence",
        "investigate_poaching",
      ];
      return allowed.includes(permission);
    }

    // Rank-based permissions for SQ and Police
    switch (rank) {
      case "cadet":
        return ["use_speed_radar", "traffic_stop"].includes(permission);
      case "agent":
        return [
          "use_speed_radar",
          "issue_csr_ticket",
          "traffic_stop",
          "breathalyzer",
          "search_vehicle",
          "handcuff_arrest",
          "investigate_poaching",
        ].includes(permission);
      case "sergent":
        return [
          "use_speed_radar",
          "issue_csr_ticket",
          "traffic_stop",
          "breathalyzer",
          "search_vehicle",
          "handcuff_arrest",
          "collect_evidence",
          "analyze_evidence",
          "deploy_spikes",
          "authorize_code3",
          "dispatch_ai_backup",
          "set_wanted_level",
          "investigate_poaching",
        ].includes(permission);
      case "capitaine":
        return [
          "use_speed_radar",
          "issue_csr_ticket",
          "traffic_stop",
          "breathalyzer",
          "search_vehicle",
          "handcuff_arrest",
          "collect_evidence",
          "analyze_evidence",
          "deploy_spikes",
          "authorize_code3",
          "dispatch_ai_backup",
          "set_wanted_level",
          "clear_wanted_level",
          "call_swat_gti",
          "investigate_poaching",
        ].includes(permission);
      case "directeur":
        return true; // All permissions granted
      default:
        return false;
    }
  }

  public getAllRolePermissions(
    role: PoliceRole,
    rank: PoliceRankLevel
  ): { permission: PolicePermission; label: string; description: string; granted: boolean }[] {
    const allDefs: { permission: PolicePermission; label: string; description: string }[] = [
      {
        permission: "use_speed_radar",
        label: "Radar Doppler & Vitesse",
        description: "Mesurer la vitesse des véhicules et détecter les excès CSR",
      },
      {
        permission: "traffic_stop",
        label: "Interception & Contrôle Routier",
        description: "Ordonner à un véhicule de s'arrêter pour vérification",
      },
      {
        permission: "breathalyzer",
        label: "Alcootest Dräger 7510",
        description: "Contrôle de l'alcoolémie (limite légale 0.08 g/L)",
      },
      {
        permission: "search_vehicle",
        label: "Fouille de Véhicule",
        description: "Inspection du coffre et habitacle pour contrebande",
      },
      {
        permission: "issue_csr_ticket",
        label: "Contraventions CSR",
        description: "Émettre des amendes et points d'inaptitude officiels du Québec",
      },
      {
        permission: "handcuff_arrest",
        label: "Menottage & Mandat d'Arrêt",
        description: "Procéder à l'arrestation et à la lecture de la Charte",
      },
      {
        permission: "collect_evidence",
        label: "Prélèvement d'Indices SQ",
        description: "Mettre sous scellé douilles, empreintes et pièces à conviction",
      },
      {
        permission: "analyze_evidence",
        label: "Analyse Forensique en Laboratoire",
        description: "Balistique, ADN et identification dactyloscopique",
      },
      {
        permission: "deploy_spikes",
        label: "Herse d'Interception (Spike Strips)",
        description: "Neutralisation forcée des pneus d'un fuyard",
      },
      {
        permission: "authorize_code3",
        label: "Autorisation Prioritaire Code 3",
        description: "Usage des gyrophares et sirènes d'urgence sans restriction",
      },
      {
        permission: "dispatch_ai_backup",
        label: "Commande Radio Renforts IA",
        description: "Dépêcher des patrouilles autonomes SQ en renfort",
      },
      {
        permission: "set_wanted_level",
        label: "Émission d'Avis de Recherche",
        description: "Attribuer des étoiles de recherche et une prime sur un suspect",
      },
      {
        permission: "clear_wanted_level",
        label: "Révocation d'Avis de Recherche",
        description: "Lever l'alerte sur un suspect ayant coopéré ou purgé sa peine",
      },
      {
        permission: "call_swat_gti",
        label: "Déploiement GTI / SWAT",
        description: "Appel du Groupe Tactique d'Intervention pour menaces critiques",
      },
      {
        permission: "investigate_poaching",
        label: "Enquête Faunique & Braconnage",
        description: "Inspecter les permis de chasse et les peaux d'animaux",
      },
      {
        permission: "manage_officer_ranks",
        label: "Gestion & Promotions du Personnel",
        description: "Promouvoir les officiers et réassigner les départements",
      },
    ];

    return allDefs.map((d) => ({
      ...d,
      granted: this.hasPermission(d.permission, rank, role),
    }));
  }

  // ─── CRIME SCENE EVIDENCE & FORENSIC INVESTIGATION ───────────────────────
  public getCrimeSceneEvidences(): CrimeSceneEvidence[] {
    return this.crimeEvidences;
  }

  public collectCrimeEvidence(
    id: string,
    officerName: string = "Agent SQ"
  ): { success: boolean; evidence?: CrimeSceneEvidence; message: string } {
    const ev = this.crimeEvidences.find((e) => e.id === id);
    if (!ev) {
      return { success: false, message: "Indice introuvable sur les lieux." };
    }
    if (ev.collected) {
      return { success: false, evidence: ev, message: "Cet indice a déjà été mis sous scellé." };
    }

    ev.collected = true;
    ev.collectedBy = officerName || "Agent SQ";
    this.patrolPoints += 30;

    // Send to backend
    fetch("/api/police/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId: id, action: "collect", officerName }),
    }).catch(() => {});

    return {
      success: true,
      evidence: ev,
      message: `📦 Indice [${ev.caseNumber}] mis sous scellé par ${officerName} (+30 XP Enquêteur) !`,
    };
  }

  public analyzeCrimeEvidence(
    id: string
  ): { success: boolean; evidence?: CrimeSceneEvidence; matchReport?: string; xpAwarded: number; message: string } {
    const ev = this.crimeEvidences.find((e) => e.id === id);
    if (!ev) {
      return { success: false, xpAwarded: 0, message: "Pièce à conviction introuvable." };
    }
    if (!ev.collected) {
      return { success: false, xpAwarded: 0, message: "Vous devez d'abord prélever l'indice sur le terrain." };
    }
    if (ev.analyzed) {
      return {
        success: true,
        evidence: ev,
        matchReport: ev.suspectLinked ? `Correspondance confirmée : ${ev.suspectLinked}` : "Analyse déjà complétée",
        xpAwarded: 0,
        message: "Cet indice a déjà fait l'objet d'un rapport de laboratoire.",
      };
    }

    ev.analyzed = true;
    const xp = ev.pointsAwarded || 60;
    this.patrolPoints += xp;

    let report = "Analyse forensique : Données isolées et classées au dossier SQ.";
    if (ev.suspectLinked) {
      report = `🚨 CORRESPONDANCE FORENSIQUE : Suspect relié -> ${ev.suspectLinked} ! Mandat d'arrêt recommandé.`;
    } else if (ev.ballisticCaliber) {
      report = `Calibre balistique identifié : ${ev.ballisticCaliber}. Traces de rayures caractéristiques.`;
    } else if (ev.dnaMatch) {
      report = `ADN indexé dans la banque faunique : ${ev.dnaMatch}.`;
    }

    // Send to backend
    fetch("/api/police/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId: id, action: "analyze" }),
    }).catch(() => {});

    return {
      success: true,
      evidence: ev,
      matchReport: report,
      xpAwarded: xp,
      message: `🔬 Rapport de laboratoire SQ généré avec succès (+${xp} XP).`,
    };
  }

  public linkEvidenceSuspect(
    id: string,
    suspectName: string
  ): { success: boolean; wantedIssued: boolean; message: string } {
    const ev = this.crimeEvidences.find((e) => e.id === id);
    if (!ev) {
      return { success: false, wantedIssued: false, message: "Pièce à conviction introuvable." };
    }

    ev.suspectLinked = suspectName;
    this.patrolPoints += 40;

    // Check if suspect is in wanted list, otherwise add them
    const existing = this.wantedSuspects.find((s) => s.name.toLowerCase().includes(suspectName.toLowerCase()));
    if (!existing) {
      this.wantedSuspects.push({
        id: `suspect_${Date.now()}`,
        name: suspectName,
        stars: 3,
        reason: `Mandat d'arrêt suite à indice balistique/ADN [${ev.caseNumber}]`,
        bounty: 3000,
        inPursuit: false,
        lastSeenLocation: ev.locationName,
        lastSeenPosition: ev.position,
        activeWarrant: true,
      });
    }

    return {
      success: true,
      wantedIssued: true,
      message: `🎯 Suspect ${suspectName} formellement inculpé pour l'affaire ${ev.caseNumber} ! Avis de recherche émis.`,
    };
  }

  // ─── SYNC WITH BACKEND REST API ──────────────────────────────────────────
  public async syncWithServer(): Promise<void> {
    try {
      const res = await fetch("/api/police/state");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.wantedList)) {
        // Merge wanted list
        data.wantedList.forEach((w: any) => {
          if (!this.wantedSuspects.some((s) => s.id === w.playerId)) {
            this.wantedSuspects.push({
              id: w.playerId,
              name: w.playerName,
              stars: w.stars,
              reason: w.wantedReason,
              bounty: w.bounty,
              inPursuit: w.inPursuit,
              lastSeenLocation: "Localisé par radar SQ",
              lastSeenPosition: w.lastKnownPosition || [0, 0, 0],
              activeWarrant: true,
            });
          }
        });
      }
    } catch {
      // Offline fallback
    }
  }
}

export const PoliceSystem = new PoliceSystemManager();


