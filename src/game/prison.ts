import { useGameStore } from './store';
/**
 * ═══════════════════════════════════════════════════════════════════
 * ÉTABLISSEMENT DE DONNACONA — SERVICE CORRECTIONNEL DU CANADA (SCC)
 * SYSTÈME CARCÉRAL & PÉNITENTIAIRE MULTIJOUEUR (v3.0)
 * ═══════════════════════════════════════════════════════════════════
 *
 * AMÉLIORATIONS v3.0 :
 *  - Implémentation réelle de l'évasion par camion de buanderie (Timing-based).
 *  - Sabotage interactif des caméras CCTV (Angles morts pour les meurtres/deal).
 *  - Consommation de stupéfiants avec gestion avancée du stress et overdoses.
 *  - Verrouillage automatique des blocs selon le couvre-feu (Lockdown horaire).
 *  - Correction des failles de duplication d'inventaire et typages stricts.
 *  - Économie carcérale de contrebande renforcée.
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib } from "./materials";
import { finishMap } from "./textures";

// Réseau & Multi-joueurs
import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { sendPrivateMessage, sendChatMessage } from "./chat";
import { triggerNotification } from "./phone";
import { getPlayerData } from "./character";

// Systèmes interconnectés
import { addWantedPoints, type CrimeKind } from "./police";
import { addCash, removeCash, getDefaultAccount } from "./banking";
import { addToInventory, removeFromInventory, getInventoryItem } from "./backpack";
import { modifyHealth, getPlayerHealth } from "./survival";

// ═══════════════════════════════════════════════════════════
// CONSTANTES VISUELLES & COULEURS
// ═══════════════════════════════════════════════════════════

const P = {
  beton: 0x9a9691,
  betonSombre: 0x54514d,
  sol: 0x6e6b66,
  acier: 0x3e4247,
  grillage: 0x6a6e72,
  neon: 0xffd88a,
  asphalte: 0x44474a,
  ligne: 0xd8d4c0,
  bleu: 0x2f4f6f,
  orangeUniforme: 0xdf5418,
  vertMitard: 0x3b5249,
};

const YARD = 36;
const PERIM = 72;

// ═══════════════════════════════════════════════════════════
// TYPES — RÔLES & HIÉRARCHIE CARCÉRALE
// ═══════════════════════════════════════════════════════════

export type PrisonRole =
  | "directeur"            // Warden
  | "sergent_cx2"          // Shift supervisor
  | "gardien_cx1"          // Correction officer
  | "infirmier_prison"     // Medical staff
  | "superviseur_travail"  // Work program staff
  | "detenu"               // Prisoner
  | "avocat"               // Lawyer
  | "visiteur";            // Civilian

export type SecurityLevel = "minimum" | "medium" | "maximum" | "supermax";
export type PrisonBlockId = "bloc_A" | "bloc_B" | "bloc_C" | "bloc_D" | "isolement_trou" | "infirmerie";

export type PrisonGang =
  | "sans_affiliation"
  | "motards_hells"        // Motards criminalisés
  | "gang_rue_mtl"         // Street gangs MTL (Bleus/Rouges)
  | "mafia_italienne"      // Crime organisé traditionnel
  | "fraternite_nordique"  // Détenus du Nord / autochtones
  | "syndicat_asiatique";

export type MentalState = "stable" | "anxious" | "depressed" | "paranoid" | "aggressive" | "suicidal";

export interface PrisonGuard {
  playerId: string;
  playerName: string;
  badgeNumber: string;
  role: PrisonRole;
  rankTitle: string;
  hourlyRate: number;
  isOnDuty: boolean;
  clockInTime: number | null;
  assignedPost: "tours" | "cour" | "blocs" | "fouiller" | "portail" | "parloir" | "regie" | "infirmerie";
  equipment: string[];
  keysAuthorized: PrisonBlockId[];
  takedownsCount: number;
  searchesCount: number;
  corruptionLevel: number; // 0-100 (susceptibilité aux pots-de-vin)
  isCorrupt: boolean;
  bribeHistory: Array<{ date: number; amount: number; fromInmate: string }>;
}

export interface InmateProfile {
  playerId: string;
  playerName: string;
  bookingNumber: string;
  securityLevel: SecurityLevel;
  block: PrisonBlockId;
  cellNumber: number;
  charges: string[];
  sentenceDurationMinutes: number;
  timeServedMinutes: number;
  entryTimestamp: number;
  expectedReleaseTimestamp: number;
  paroleEligibilityTimestamp: number;
  gang: PrisonGang;
  gangRank: "prospect" | "membre" | "lieutenant" | "boss";
  respect: number;
  trustLevelGuard: number;
  trustLevelInmates: number;
  isLockdown: boolean;
  isInSolitary: boolean;
  solitaryRemainingMinutes: number;
  job: PrisonJobId | null;
  cantineBalance: number;
  contrabandInventory: ContrabandItem[];
  confiscatedItems: Array<{ id: string; qty: number }>;
  healthState: { 
    isInjured: boolean; 
    isAddicted: boolean; 
    hunger: number;
    mentalState: MentalState;
    stressLevel: number; // 0-100
    depressionLevel: number; // 0-100
  };
  escapeAttemptsCount: number;
  goodBehaviorScore: number;
  debts: Array<{ toInmateId: string; amount: number; item?: string }>;
  isInformant: boolean;
  informantReports: Array<{ date: number; targetId: string; info: string }>;
  rehabilitationPrograms: string[];
  workHoursLogged: number;
  fightsInitiated: number;
  fightsWon: number;
  visitsReceived: number;
  lastParoleHearing: number | null;
  disciplinaryRecord: Array<{ date: number; infraction: string; punishment: string }>;
}

export type PrisonJobId =
  | "cuisine"
  | "blanchisserie"
  | "menuiserie_atelier"
  | "nettoyage_blocs"
  | "bibliotheque"
  | "maintenance_cour"
  | "buanderie"
  | "jardin"
  | "gym_instructeur"
  | "tutorat";

export interface PrisonJobDef {
  id: PrisonJobId;
  name: string;
  hourlyPay: number;
  riskOfContraband: number;
  obtainableContraband: string[];
  requiredRespect: number;
  scheduleHours: number[]; // Heures de travail (ex: [8, 9, 10, 14, 15])
  producesItems?: Array<{ itemId: string; chance: number }>;
  rehabilitationValue?: number; // Points de réhabilitation par heure
}

export const PRISON_JOBS: Record<PrisonJobId, PrisonJobDef> = {
  cuisine: {
    id: "cuisine",
    name: "Cuisine centrale",
    hourlyPay: 5.50,
    riskOfContraband: 0.7,
    obtainableContraband: ["couteau_cuisine", "sucre_pour_hooch", "levure", "fourchette_metal"],
    requiredRespect: 10,
    scheduleHours: [6, 7, 8, 11, 12, 16, 17],
    producesItems: [{ itemId: "repas_cantine", chance: 1.0 }],
    rehabilitationValue: 2,
  },
  blanchisserie: {
    id: "blanchisserie",
    name: "Blanchisserie industrielle",
    hourlyPay: 4.50,
    riskOfContraband: 0.5,
    obtainableContraband: ["drap_corde", "eau_de_javel", "sac_transport_evasion"],
    requiredRespect: 0,
    scheduleHours: [8, 9, 10, 13, 14, 15],
    rehabilitationValue: 3,
  },
  menuiserie_atelier: {
    id: "menuiserie_atelier",
    name: "Atelier d'usinage & bois",
    hourlyPay: 7.00,
    riskOfContraband: 0.85,
    obtainableContraband: ["tournevis", "lame_scie", "tige_fer", "clou_long", "papier_sable"],
    requiredRespect: 25,
    scheduleHours: [9, 10, 11, 14, 15, 16],
    producesItems: [
      { itemId: "meuble_bois", chance: 0.3 },
      { itemId: "outil_artisanal", chance: 0.1 },
    ],
    rehabilitationValue: 5,
  },
  nettoyage_blocs: {
    id: "nettoyage_blocs",
    name: "Conciergerie des cellules",
    hourlyPay: 3.50,
    riskOfContraband: 0.4,
    obtainableContraband: ["manche_balai", "produit_chimique_aveuglant"],
    requiredRespect: 0,
    scheduleHours: [7, 8, 9, 13, 14],
    rehabilitationValue: 2,
  },
  bibliotheque: {
    id: "bibliotheque",
    name: "Bibliothèque & archives",
    hourlyPay: 6.00,
    riskOfContraband: 0.3,
    obtainableContraband: ["livre_creuse", "ciseaux", "colle_forte"],
    requiredRespect: 15,
    scheduleHours: [9, 10, 11, 14, 15, 16],
    rehabilitationValue: 8,
  },
  maintenance_cour: {
    id: "maintenance_cour",
    name: "Entretien de la cour",
    hourlyPay: 5.00,
    riskOfContraband: 0.6,
    obtainableContraband: ["roche_lourde", "tuyau_metal", "fil_de_fer"],
    requiredRespect: 20,
    scheduleHours: [8, 9, 10, 11, 14, 15],
    rehabilitationValue: 3,
  },
  buanderie: {
    id: "buanderie",
    name: "Buanderie & couture",
    hourlyPay: 4.00,
    riskOfContraband: 0.4,
    obtainableContraband: ["aiguille", "fil_solide", "tissu"],
    requiredRespect: 5,
    scheduleHours: [8, 9, 10, 13, 14],
    rehabilitationValue: 4,
  },
  jardin: {
    id: "jardin",
    name: "Jardin & serre",
    hourlyPay: 4.50,
    riskOfContraband: 0.2,
    obtainableContraband: ["graines_cannabis", "engrais", "pelle"],
    requiredRespect: 10,
    scheduleHours: [7, 8, 9, 10, 14, 15],
    producesItems: [
      { itemId: "legumes_frais", chance: 0.8 },
      { itemId: "herbes_medicinales", chance: 0.2 },
    ],
    rehabilitationValue: 6,
  },
  gym_instructeur: {
    id: "gym_instructeur",
    name: "Instructeur de gym",
    hourlyPay: 6.50,
    riskOfContraband: 0.3,
    obtainableContraband: ["poids_metal", "corde_exercice"],
    requiredRespect: 30,
    scheduleHours: [6, 7, 8, 16, 17, 18],
    rehabilitationValue: 4,
  },
  tutorat: {
    id: "tutorat",
    name: "Tutorat & éducation",
    hourlyPay: 7.50,
    riskOfContraband: 0.1,
    obtainableContraband: ["stylo", "papier", "livre"],
    requiredRespect: 20,
    scheduleHours: [9, 10, 11, 14, 15],
    rehabilitationValue: 10,
  },
};

// ═══════════════════════════════════════════════════════════
// CATALOGUE DE CANTINE & CONTREBANDE
// ═══════════════════════════════════════════════════════════

export interface ContrabandItem {
  id: string;
  name: string;
  category: "arme" | "drogue" | "outil" | "communication" | "divers";
  lethality: number;
  concealability: number; // 0-100 (plus haut = plus facile à cacher)
  durability: number;
  cantineValue: number;
  description: string;
  craftable: boolean;
  recipe?: Array<{ itemId: string; qty: number }>;
}

export const CONTRABAND_CATALOG: Record<string, ContrabandItem> = {
  pic_brosse_a_dents: {
    id: "pic_brosse_a_dents",
    name: "Pic artisanal (Brosse à dents)",
    category: "arme",
    lethality: 45,
    concealability: 90,
    durability: 3,
    cantineValue: 35,
    description: "Brosse à dents taillée en pointe aiguisée avec du ciment.",
    craftable: true,
    recipe: [{ itemId: "brosse_a_dents", qty: 1 }, { itemId: "briquet", qty: 1 }],
  },
  surin_metal: {
    id: "surin_metal",
    name: "Surin en acier (Shiv)",
    category: "arme",
    lethality: 80,
    concealability: 60,
    durability: 8,
    cantineValue: 120,
    description: "Morceau de métal affûté avec poignée enveloppée de ruban.",
    craftable: true,
    recipe: [{ itemId: "tige_fer", qty: 1 }, { itemId: "papier_sable", qty: 1 }, { itemId: "ruban_adhesif", qty: 1 }],
  },
  savon_chaussette: {
    id: "savon_chaussette",
    name: "Savon dans une chaussette (Slungshot)",
    category: "arme",
    lethality: 50,
    concealability: 80,
    durability: 5,
    cantineValue: 20,
    description: "Deux barres de savon compactes au fond d'une chaussette de laine.",
    craftable: true,
    recipe: [{ itemId: "savon_cantine", qty: 2 }, { itemId: "chaussette_laine", qty: 1 }],
  },
  hooch_prison: {
    id: "hooch_prison",
    name: "Hooch de cellule (Alcool de prison)",
    category: "drogue",
    lethality: 5,
    concealability: 40,
    durability: 4,
    cantineValue: 60,
    description: "Jus de fruits, sucre et pain fermentés dans un sac plastique sous le matelas.",
    craftable: true,
    recipe: [{ itemId: "sucre_pour_hooch", qty: 2 }, { itemId: "fruits_cantine", qty: 3 }, { itemId: "sac_plastique", qty: 1 }],
  },
  joint_contrebande: {
    id: "joint_contrebande",
    name: "Joint de pot artisanal",
    category: "drogue",
    lethality: 0,
    concealability: 95,
    durability: 1,
    cantineValue: 40,
    description: "Weed passée au parloir, roulée dans du papier bible.",
    craftable: true,
    recipe: [{ itemId: "weed_parloir", qty: 1 }, { itemId: "page_bible", qty: 1 }],
  },
  paquet_cigarettes: {
    id: "paquet_cigarettes",
    name: "Paquet de smokes (Monnaie d'échange)",
    category: "divers",
    lethality: 0,
    concealability: 70,
    durability: 20,
    cantineValue: 80,
    description: "La monnaie de référence derrière les barreaux.",
    craftable: false,
  },
  cellulaire_clandestin: {
    id: "cellulaire_clandestin",
    name: "Micro-cellulaire de contrebande",
    category: "communication",
    lethality: 0,
    concealability: 95,
    durability: 10,
    cantineValue: 350,
    description: "Miniature, détectable uniquement au détecteur corporel BOSS.",
    craftable: false,
  },
  corde_draps: {
    id: "corde_draps",
    name: "Corde de draps tressés",
    category: "outil",
    lethality: 10,
    concealability: 30,
    durability: 2,
    cantineValue: 75,
    description: "Draps de prison déchirés et tressés avec des nœuds solides.",
    craftable: true,
    recipe: [{ itemId: "drap_lit", qty: 4 }],
  },
  coupe_grillage: {
    id: "coupe_grillage",
    name: "Pince coupe-grillage volée",
    category: "outil",
    lethality: 25,
    concealability: 40,
    durability: 3,
    cantineValue: 250,
    description: "Permet de couper les deux rangées de clôtures de la cour.",
    craftable: false,
  },
  tournevis_ventilation: {
    id: "tournevis_ventilation",
    name: "Tournevis plat d'atelier",
    category: "outil",
    lethality: 30,
    concealability: 70,
    durability: 6,
    cantineValue: 90,
    description: "Permet de dévisser les grilles d'aération des cellules.",
    craftable: false,
  },
  fentanyl_patch: {
    id: "fentanyl_patch",
    name: "Timbre de Fentanyl",
    category: "drogue",
    lethality: 95, // Risque mortel d'overdose
    concealability: 98,
    durability: 1,
    cantineValue: 400,
    description: "Substance extrêmement puissante et mortelle. Annule la douleur et le stress temporairement.",
    craftable: false,
  }
};

export interface CantineProduct {
  id: string;
  name: string;
  price: number;
  category: "nourriture" | "hygiene" | "papeterie" | "vetement";
}

export const CANTINE_STORE: CantineProduct[] = [
  { id: "ramen_nouilles", name: "Paquet de Ramen au poulet", price: 2.50, category: "nourriture" },
  { id: "chocolat_barre", name: "Barre de chocolat", price: 3.00, category: "nourriture" },
  { id: "chips_sac", name: "Sac de chips BBQ", price: 2.75, category: "nourriture" },
  { id: "cafe_instant", name: "Pot de café instantané", price: 8.50, category: "nourriture" },
  { id: "savon_cantine", name: "Barre de savon", price: 2.00, category: "hygiene" },
  { id: "brosse_a_dents", name: "Brosse à dents sécuritaire", price: 1.50, category: "hygiene" },
  { id: "dentifrice", name: "Tube de dentifrice", price: 3.50, category: "hygiene" },
  { id: "shampooing", name: "Bouteille de shampooing", price: 4.00, category: "hygiene" },
  { id: "papier_lettre", name: "Bloc de papier & enveloppes", price: 4.00, category: "papeterie" },
  { id: "timbres_poste", name: "Livret de 10 timbres", price: 12.00, category: "papeterie" },
  { id: "stylo_flexible", name: "Stylo mou sans métal", price: 1.00, category: "papeterie" },
  { id: "radio_fm_cantine", name: "Petite radio FM transparente", price: 45.00, category: "papeterie" },
  { id: "chaussette_laine", name: "Paire de chaussettes grises", price: 5.00, category: "vetement" },
  { id: "tshirt_gris", name: "T-Shirt d'intérieur gris", price: 10.00, category: "vetement" },
];

// ═══════════════════════════════════════════════════════════
// TYPES — ÉMEUTES, CELLULES & ÉVASIONS
// ═══════════════════════════════════════════════════════════

export interface CellRecord {
  cellId: string;
  block: PrisonBlockId;
  cellNumber: number;
  inmateIds: string[];
  maxCapacity: number;
  isDoorLocked: boolean;
  hiddenStash: ContrabandItem[];
  ventilationUnscrewed: boolean;
  tunnelProgress: number;
  lastInspectedAt: number;
  hasCamera: boolean;
  cameraActive: boolean;
  lastCleanedAt: number;
  maintenanceIssues: string[];
}

export interface RiotState {
  isRiotActive: boolean;
  startedAt: number | null;
  instigatorGang: PrisonGang;
  participatingInmates: string[];
  controlledBlocks: PrisonBlockId[];
  hostageGuards: string[];
  demands: string[];
  riotIntensity: number;
  tearGasDeployed: boolean;
  tacticalTeamBreached: boolean;
}

export interface EscapeAttempt {
  escapeId: string;
  inmateId: string;
  method: "helicopter" | "fence_cut" | "ventilation" | "tunnel" | "laundry_truck";
  startedAt: number;
  progress: number;
  isDetected: boolean;
  accompliceOutsideId?: string;
  helicopterCoords?: { x: number; y: number; z: number };
  status: "planning" | "in_progress" | "succeeded" | "failed" | "shot_down";
  tunnelDigProgress?: number;
  laundryTruckTime?: number;
  accomplices: string[];
  requiredItems: string[];
}

export interface ParoleHearing {
  hearingId: string;
  inmateId: string;
  scheduledTime: number;
  status: "pending" | "approved" | "denied";
  rehabilitationScore: number;
  victimStatement: string;
  decisionNotes: string;
  boardMembers: string[];
  inmateStatement: string;
  riskAssessment: number; // 0-100
  conditions?: string[];
}

export interface DailySchedule {
  hour: number;
  activity: "lockdown" | "repas" | "cour" | "travail" | "douche" | "parloir" | "programme" | "temps_libre";
  location: string;
  mandatory: boolean;
}

export const DAILY_SCHEDULE: DailySchedule[] = [
  { hour: 6, activity: "lockdown", location: "cellule", mandatory: true },
  { hour: 7, activity: "repas", location: "cantine", mandatory: true },
  { hour: 8, activity: "travail", location: "atelier", mandatory: true },
  { hour: 12, activity: "repas", location: "cantine", mandatory: true },
  { hour: 13, activity: "cour", location: "cour_promenade", mandatory: false },
  { hour: 14, activity: "travail", location: "atelier", mandatory: true },
  { hour: 16, activity: "douche", location: "douches", mandatory: true },
  { hour: 17, activity: "repas", location: "cantine", mandatory: true },
  { hour: 18, activity: "temps_libre", location: "bloc", mandatory: false },
  { hour: 21, activity: "lockdown", location: "cellule", mandatory: true },
];

export interface ParlorVisit {
  visitId: string;
  inmateId: string;
  visitorId: string;
  visitorName: string;
  scheduledTime: number;
  duration: number; // minutes
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  contrabandTransferred: ContrabandItem[];
  isMonitored: boolean;
  guardAssigned: string | null;
}

export interface SecurityCamera {
  cameraId: string;
  location: string;
  block?: PrisonBlockId;
  isActive: boolean;
  isRecording: boolean;
  lastMotionDetected: number | null;
  blindSpots: number; // Pourcentage de zone non couverte
}

// ═══════════════════════════════════════════════════════════
// ÉTAT GLOBAL (Multijoueur synchronisé)
// ═══════════════════════════════════════════════════════════

const GUARDS = new Map<string, PrisonGuard>();
const INMATES = new Map<string, InmateProfile>();
const CELLS = new Map<string, CellRecord>();
const ESCAPES = new Map<string, EscapeAttempt>();
const PAROLE_HEARINGS = new Map<string, ParoleHearing>();
const PARLOR_VISITS = new Map<string, ParlorVisit>();
const SECURITY_CAMERAS = new Map<string, SecurityCamera>();

let activeRiot: RiotState = {
  isRiotActive: false,
  startedAt: null,
  instigatorGang: "sans_affiliation",
  participatingInmates: [],
  controlledBlocks: [],
  hostageGuards: [],
  demands: [],
  riotIntensity: 0,
  tearGasDeployed: false,
  tacticalTeamBreached: false,
};

let globalLockdown = false;
let bookingCounter = 5000;

function initPrisonCells() {
  const blocks: PrisonBlockId[] = ["bloc_A", "bloc_B", "bloc_C", "bloc_D", "isolement_trou"];
  for (const block of blocks) {
    const count = block === "isolement_trou" ? 6 : 12;
    for (let i = 1; i <= count; i++) {
      const cellId = `${block}_cell_${i}`;
      CELLS.set(cellId, {
        cellId,
        block,
        cellNumber: i,
        inmateIds: [],
        maxCapacity: block === "isolement_trou" ? 1 : 2,
        isDoorLocked: true,
        hiddenStash: [],
        ventilationUnscrewed: false,
        tunnelProgress: 0,
        lastInspectedAt: Date.now(),
        hasCamera: block !== "isolement_trou",
        cameraActive: true,
        lastCleanedAt: Date.now(),
        maintenanceIssues: [],
      });
    }
  }
  
  const cameraLocations = ["entree_principale", "cantine", "cour_promenade", "atelier", "parloir", "infirmerie"];
  for (const loc of cameraLocations) {
    SECURITY_CAMERAS.set(`cam_${loc}`, {
      cameraId: `cam_${loc}`,
      location: loc,
      isActive: true,
      isRecording: true,
      lastMotionDetected: null,
      blindSpots: 5,
    });
  }
}
initPrisonCells();

// ═══════════════════════════════════════════════════════════
// INCARCÉRATION & ADMISSION (INTAKE)
// ═══════════════════════════════════════════════════════════

export interface IncarcerationResult {
  ok: boolean;
  message: string;
  inmate: InmateProfile | null;
  cell: CellRecord | null;
}

export function incarceratePlayer(
  playerId: string,
  playerName: string,
  charges: string[],
  sentenceMinutes: number,
  securityLevel: SecurityLevel = "medium",
  gangAffiliation: PrisonGang = "sans_affiliation",
): IncarcerationResult {
  bookingCounter++;
  const bookingNumber = `DONN-${new Date().getFullYear()}-${bookingCounter}`;

  const preferredBlock: PrisonBlockId =
    securityLevel === "supermax" ? "isolement_trou"
    : securityLevel === "maximum" ? "bloc_D"
    : securityLevel === "medium" ? "bloc_B"
    : "bloc_A";

  let assignedCell: CellRecord | null = null;
  for (const cell of CELLS.values()) {
    if (cell.block === preferredBlock && cell.inmateIds.length < cell.maxCapacity) {
      assignedCell = cell;
      break;
    }
  }

  if (!assignedCell) {
    for (const cell of CELLS.values()) {
      if (cell.block !== "isolement_trou" && cell.inmateIds.length < cell.maxCapacity) {
        assignedCell = cell;
        break;
      }
    }
  }

  if (!assignedCell) {
    return { ok: false, message: "Le pénitencier de Donnacona est à pleine capacité!", inmate: null, cell: null };
  }

  assignedCell.inmateIds.push(playerId);

  const inmate: InmateProfile = {
    playerId,
    playerName,
    bookingNumber,
    securityLevel,
    block: assignedCell.block,
    cellNumber: assignedCell.cellNumber,
    charges,
    sentenceDurationMinutes: sentenceMinutes,
    timeServedMinutes: 0,
    entryTimestamp: Date.now(),
    expectedReleaseTimestamp: Date.now() + sentenceMinutes * 60_000,
    paroleEligibilityTimestamp: Date.now() + (sentenceMinutes * 0.4) * 60_000,
    gang: gangAffiliation,
    gangRank: "membre",
    respect: 10,
    trustLevelGuard: 20,
    trustLevelInmates: 50,
    isLockdown: false,
    isInSolitary: assignedCell.block === "isolement_trou",
    solitaryRemainingMinutes: assignedCell.block === "isolement_trou" ? sentenceMinutes : 0,
    job: null,
    cantineBalance: 50.00,
    contrabandInventory: [],
    confiscatedItems: [],
    healthState: { 
      isInjured: false, 
      isAddicted: false, 
      hunger: 100,
      mentalState: "stable",
      stressLevel: 30,
      depressionLevel: 20,
    },
    escapeAttemptsCount: 0,
    goodBehaviorScore: 50,
    debts: [],
    isInformant: false,
    informantReports: [],
    rehabilitationPrograms: [],
    workHoursLogged: 0,
    fightsInitiated: 0,
    fightsWon: 0,
    visitsReceived: 0,
    lastParoleHearing: null,
    disciplinaryRecord: [],
  };

  INMATES.set(playerId, inmate);

  triggerNotification(playerId, {
    title: "🔒 INCARCÉRATION SCC",
    body: `Établissement Donnacona\nMatricule: ${bookingNumber}\nCellule: ${assignedCell.block} #${assignedCell.cellNumber}\nPeine: ${sentenceMinutes} min`,
    icon: "⛓️",
    urgent: true,
  });

  sendChatMessage(`📢 [SCC] Le détenu ${playerName} (#${bookingNumber}) a été admis à Donnacona.`);
  netEmit("prison:inmate_booked", { inmate, cellId: assignedCell.cellId });

  return { ok: true, message: `Incarcéré avec succès. Cellule ${assignedCell.block} #${assignedCell.cellNumber}`, inmate, cell: assignedCell };
}

export function releasePlayer(playerId: string, reason: string = "Fin de peine"): { ok: boolean; message: string } {
  const inmate = INMATES.get(playerId);
  if (!inmate) return { ok: false, message: "Détenu introuvable." };

  for (const cell of CELLS.values()) {
    cell.inmateIds = cell.inmateIds.filter(id => id !== playerId);
  }

  INMATES.delete(playerId);

  triggerNotification(playerId, {
    title: "🔓 LIBÉRATION DU SCC",
    body: `Vous avez purgé votre peine.\nMotif: ${reason}`,
    icon: "🕊️",
  });

  sendChatMessage(`📢 [SCC] Le détenu ${inmate.playerName} est libéré de Donnacona (${reason}).`);
  netEmit("prison:inmate_released", { playerId, reason });

  return { ok: true, message: `Détenu ${inmate.playerName} libéré.` };
}

// ═══════════════════════════════════════════════════════════
// GARDIENS & OFFICIERS DE CORRECTION (CX)
// ═══════════════════════════════════════════════════════════

export function clockInGuard(
  playerId: string,
  playerName: string,
  role: PrisonRole,
  assignedPost: PrisonGuard["assignedPost"] = "blocs",
): { ok: boolean; message: string; guard: PrisonGuard | null } {
  if (role === "detenu") return { ok: false, message: "Un détenu ne peut pas être gardien.", guard: null };

  const hourlyWage =
    role === "directeur" ? 65.00
    : role === "sergent_cx2" ? 44.00
    : role === "gardien_cx1" ? 36.50
    : role === "infirmier_prison" ? 42.00
    : 32.00;

  const guard: PrisonGuard = {
    playerId,
    playerName,
    badgeNumber: `CX-${Math.floor(1000 + Math.random() * 9000)}`,
    role,
    rankTitle: role === "directeur" ? "Directeur d'établissement" : role === "sergent_cx2" ? "Sergent CX-02" : "Agent correctionnel CX-01",
    hourlyRate: hourlyWage,
    isOnDuty: true,
    clockInTime: Date.now(),
    assignedPost,
    equipment: ["taser", "matraque", "gazeuse", "cles_passe_partout", "menottes", "radio"],
    keysAuthorized: ["bloc_A", "bloc_B", "bloc_C", "bloc_D", "isolement_trou", "infirmerie"],
    takedownsCount: 0,
    searchesCount: 0,
    corruptionLevel: Math.random() * 20,
    isCorrupt: false,
    bribeHistory: [],
  };

  GUARDS.set(playerId, guard);

  triggerNotification(playerId, {
    title: "🛡️ PRISE DE SERVICE CX",
    body: `Poste: ${assignedPost.toUpperCase()}\nBadge: ${guard.badgeNumber}\nSalaire: ${hourlyWage}$/h`,
    icon: "👮",
  });

  netEmit("prison:guard_duty_started", { guard });
  return { ok: true, message: `En service au poste: ${assignedPost}`, guard };
}

export function clockOutGuard(playerId: string): { ok: boolean; earnings: number } {
  const guard = GUARDS.get(playerId);
  if (!guard || !guard.isOnDuty || !guard.clockInTime) {
    return { ok: false, earnings: 0 };
  }

  const hoursWorked = (Date.now() - guard.clockInTime) / 3600000;
  const earnings = Math.round(hoursWorked * guard.hourlyRate * 100) / 100;

  guard.isOnDuty = false;
  guard.clockInTime = null;

  addCash(earnings, playerId);

  netEmit("prison:guard_duty_ended", { playerId, earnings, hoursWorked });
  return { ok: true, earnings };
}

// ═══════════════════════════════════════════════════════════
// GESTION DES CELLULES & FOUILLES
// ═══════════════════════════════════════════════════════════

export function conductCellSearch(
  guardPlayerId: string,
  cellId: string,
): { ok: boolean; confiscatedItems: ContrabandItem[]; message: string } {
  const guard = GUARDS.get(guardPlayerId);
  if (!guard || !guard.isOnDuty) return { ok: false, confiscatedItems: [], message: "Seul un CX en service peut fouiller." };

  const cell = CELLS.get(cellId);
  if (!cell) return { ok: false, confiscatedItems: [], message: "Cellule introuvable." };

  const found: ContrabandItem[] = [];

  for (const item of cell.hiddenStash) {
    const detectionChance = 1 - (item.concealability / 120);
    if (Math.random() < detectionChance) {
      found.push(item);
    }
  }

  cell.hiddenStash = cell.hiddenStash.filter(item => !found.includes(item));
  cell.lastInspectedAt = Date.now();
  guard.searchesCount++;

  for (const inmateId of cell.inmateIds) {
    const inmate = INMATES.get(inmateId);
    if (inmate && found.length > 0) {
      inmate.goodBehaviorScore = Math.max(0, inmate.goodBehaviorScore - 20);
      inmate.disciplinaryRecord.push({
        date: Date.now(),
        infraction: "Possession de contrebande",
        punishment: "Fouille de cellule",
      });
      triggerNotification(inmateId, {
        title: "⚠️ FOUILLE DE CELLULE",
        body: `Un agent a trouvé de la contrebande dans votre cellule!`,
        icon: "🚨",
        urgent: true,
      });
    }
  }

  netEmit("prison:cell_searched", { cellId, guardId: guardPlayerId, foundCount: found.length });

  return {
    ok: true,
    confiscatedItems: found,
    message: found.length > 0 ? `Fouille complétée : ${found.length} objet(s) illicite(s) saisi(s)!` : "Cellule fouillée : Rien à signaler.",
  };
}

export function sendToSolitary(
  guardPlayerId: string | "system",
  inmateId: string,
  durationMinutes: number,
  reason: string,
): { ok: boolean; message: string } {
  if (guardPlayerId !== "system") {
    const guard = GUARDS.get(guardPlayerId);
    if (!guard || !guard.isOnDuty) return { ok: false, message: "Permission refusée." };
  }

  const inmate = INMATES.get(inmateId);
  if (!inmate) return { ok: false, message: "Détenu introuvable." };

  for (const cell of CELLS.values()) {
    cell.inmateIds = cell.inmateIds.filter(id => id !== inmateId);
  }

  let solitaryCell: CellRecord | null = null;
  for (const cell of CELLS.values()) {
    if (cell.block === "isolement_trou" && cell.inmateIds.length === 0) {
      solitaryCell = cell;
      break;
    }
  }

  if (!solitaryCell) {
    return { ok: false, message: "Toutes les cellules d'isolement sont occupées!" };
  }

  solitaryCell.inmateIds.push(inmateId);
  inmate.block = "isolement_trou";
  inmate.cellNumber = solitaryCell.cellNumber;
  inmate.isInSolitary = true;
  inmate.solitaryRemainingMinutes = durationMinutes;
  inmate.goodBehaviorScore = Math.max(0, inmate.goodBehaviorScore - 30);
  
  inmate.healthState.stressLevel = Math.min(100, inmate.healthState.stressLevel + 30);
  inmate.healthState.depressionLevel = Math.min(100, inmate.healthState.depressionLevel + 20);
  
  inmate.disciplinaryRecord.push({
    date: Date.now(),
    infraction: reason,
    punishment: `Isolement ${durationMinutes} min`,
  });

  triggerNotification(inmateId, {
    title: "🚨 ENVOYÉ AU MITARD (LE TROU)",
    body: `Durée: ${durationMinutes} min\nMotif: ${reason}\n23h/24h en isolement total.`,
    icon: "🕳️",
    urgent: true,
  });

  sendChatMessage(`📢 [SCC] Le détenu ${inmate.playerName} est envoyé au mitard pour ${durationMinutes} min (${reason}).`);
  netEmit("prison:inmate_solitary", { inmateId, durationMinutes, reason });

  return { ok: true, message: `Détenu envoyé au trou pour ${durationMinutes} min.` };
}

// ═══════════════════════════════════════════════════════════
// ARTISANAT, GANGS & CANTINE
// ═══════════════════════════════════════════════════════════

export function craftContraband(
  inmatePlayerId: string,
  recipeItemId: string,
): { ok: boolean; message: string; item: ContrabandItem | null } {
  const inmate = INMATES.get(inmatePlayerId);
  if (!inmate) return { ok: false, message: "Vous n'êtes pas détenu.", item: null };

  const proto = CONTRABAND_CATALOG[recipeItemId];
  if (!proto || !proto.craftable || !proto.recipe) {
    return { ok: false, message: "Recette inconnue ou impossible à fabriquer.", item: null };
  }

  // Vérification de l'inventaire du sac à dos (backpack)
  for (const ing of proto.recipe) {
    const count = getInventoryItem(inmatePlayerId, ing.itemId) ?? 0;
    if (count < ing.qty) {
      return { ok: false, message: `Matériaux manquants : ${ing.itemId} (${count}/${ing.qty})`, item: null };
    }
  }

  for (const ing of proto.recipe) {
    removeFromInventory(ing.itemId, ing.qty, inmatePlayerId);
  }

  const craftedItem: ContrabandItem = { ...proto, durability: proto.durability };
  inmate.contrabandInventory.push(craftedItem);
  inmate.respect = Math.min(100, inmate.respect + 5);

  netEmit("prison:item_crafted", { playerId: inmatePlayerId, itemId: recipeItemId });
  return { ok: true, message: `Fabrication réussie : ${proto.name}!`, item: craftedItem };
}

export function buyCantineItem(
  inmatePlayerId: string,
  productId: string,
  qty: number = 1,
): { ok: boolean; message: string } {
  const inmate = INMATES.get(inmatePlayerId);
  if (!inmate) return { ok: false, message: "Vous n'êtes pas incarcéré." };

  const prod = CANTINE_STORE.find(p => p.id === productId);
  if (!prod) return { ok: false, message: "Produit non disponible à la cantine." };

  const total = prod.price * qty;
  if (inmate.cantineBalance < total) {
    return { ok: false, message: `Fonds insuffisants sur votre compte cantine (${inmate.cantineBalance.toFixed(2)}$ dispo).` };
  }

  inmate.cantineBalance -= total;
  addToInventory(productId, qty, inmatePlayerId);

  netEmit("prison:cantine_purchase", { playerId: inmatePlayerId, productId, qty, total });
  return { ok: true, message: `Achat effectué : ${qty}x ${prod.name} (-${total.toFixed(2)}$)` };
}

// ── NOUVEAU v3.0 : CONSOMMATION DE DROGUE & SANTÉ MENTALE ──
export function consumeContrabandDrug(inmateId: string, itemId: string): { ok: boolean; message: string } {
  const inmate = INMATES.get(inmateId);
  if (!inmate) return { ok: false, message: "Détenu introuvable." };

  const idx = inmate.contrabandInventory.findIndex(i => i.id === itemId && i.category === "drogue");
  if (idx === -1) return { ok: false, message: "Vous ne possédez pas ce stupéfiant." };

  const drug = inmate.contrabandInventory[idx];
  inmate.contrabandInventory.splice(idx, 1);

  // Effet Positif : Baisse du stress et de la dépression
  inmate.healthState.stressLevel = Math.max(0, inmate.healthState.stressLevel - 40);
  inmate.healthState.depressionLevel = Math.max(0, inmate.healthState.depressionLevel - 30);
  inmate.healthState.mentalState = "stable";

  // Effet Négatif : Overdose ou dommages collatéraux
  const overdoseChance = drug.lethality / 100;
  if (Math.random() < overdoseChance) {
    modifyHealth(-95, inmateId); // Dommage critique presque fatal
    sendChatMessage(`🚑 [URGENCE MÉDICALE] Détenu en détresse respiratoire (Overdose) au ${inmate.block.toUpperCase()}! Appel à l'infirmier!`);
    return { ok: true, message: "Vous faites une overdose! Appelez un garde." };
  }

  triggerNotification(inmateId, {
    title: "🚬 CONSOMMATION",
    body: `Vous avez consommé: ${drug.name}. Votre stress diminue.`,
    icon: "💨"
  });

  return { ok: true, message: "Consommation réussie. Stress diminué." };
}

// ═══════════════════════════════════════════════════════════
// COMMISSION DE LIBÉRATION CONDITIONNELLE (CLCC)
// ═══════════════════════════════════════════════════════════

export function scheduleParoleHearing(
  inmateId: string,
  scheduledTime: number,
): { ok: boolean; message: string; hearing: ParoleHearing | null } {
  const inmate = INMATES.get(inmateId);
  if (!inmate) return { ok: false, message: "Détenu introuvable.", hearing: null };

  if (Date.now() < inmate.paroleEligibilityTimestamp) {
    return { ok: false, message: "Détenu non éligible à la libération conditionnelle.", hearing: null };
  }

  if (inmate.lastParoleHearing && Date.now() - inmate.lastParoleHearing < 180 * 24 * 3600 * 1000) {
    return { ok: false, message: "Une audience a eu lieu il y a moins de 6 mois.", hearing: null };
  }

  const hearingId = `PAR-${Date.now().toString(36).toUpperCase()}`;
  const rehabScore = calculateRehabilitationScore(inmate);
  
  const hearing: ParoleHearing = {
    hearingId,
    inmateId,
    scheduledTime,
    status: "pending",
    rehabilitationScore: rehabScore,
    victimStatement: "",
    decisionNotes: "",
    boardMembers: ["Commissionnaire 1", "Commissionnaire 2", "Commissionnaire 3"],
    inmateStatement: "",
    riskAssessment: Math.max(0, 100 - rehabScore),
  };

  PAROLE_HEARINGS.set(hearingId, hearing);
  inmate.lastParoleHearing = Date.now();

  netEmit("prison:parole_scheduled", { hearing });
  return { ok: true, message: `Audience programmée pour ${new Date(scheduledTime).toLocaleString()}`, hearing };
}

function calculateRehabilitationScore(inmate: InmateProfile): number {
  let score = 0;
  score += Math.min(30, inmate.goodBehaviorScore * 0.3);
  score += Math.min(25, inmate.rehabilitationPrograms.length * 5);
  score += Math.min(20, inmate.workHoursLogged * 0.2);
  score += Math.min(15, inmate.respect * 0.15);
  if (inmate.escapeAttemptsCount === 0) score += 10;
  return Math.round(score);
}

export function conductParoleHearing(
  hearingId: string,
  approved: boolean,
  conditions?: string[],
): { ok: boolean; message: string } {
  const hearing = PAROLE_HEARINGS.get(hearingId);
  if (!hearing) return { ok: false, message: "Audience introuvable." };
  if (hearing.status !== "pending") return { ok: false, message: "Audience déjà traitée." };

  hearing.status = approved ? "approved" : "denied";
  hearing.conditions = conditions;

  const inmate = INMATES.get(hearing.inmateId);
  if (inmate && approved) {
    releasePlayer(inmate.playerId, "Libération conditionnelle approuvée");
    sendChatMessage(`📢 [CLCC] Libération conditionnelle approuvée pour ${inmate.playerName}!`);
  }

  netEmit("prison:parole_decision", { hearingId, approved });
  return { ok: true, message: approved ? "Libération conditionnelle approuvée!" : "Libération conditionnelle refusée." };
}

// ═══════════════════════════════════════════════════════════
// PARLOIR & VISITES
// ═══════════════════════════════════════════════════════════

export function scheduleParlorVisit(
  inmateId: string,
  visitorId: string,
  visitorName: string,
  scheduledTime: number,
  duration: number = 60,
): { ok: boolean; message: string; visit: ParlorVisit | null } {
  const inmate = INMATES.get(inmateId);
  if (!inmate) return { ok: false, message: "Détenu introuvable.", visit: null };

  const visitId = `VIS-${Date.now().toString(36).toUpperCase()}`;
  
  const visit: ParlorVisit = {
    visitId,
    inmateId,
    visitorId,
    visitorName,
    scheduledTime,
    duration,
    status: "scheduled",
    contrabandTransferred: [],
    isMonitored: true,
    guardAssigned: null,
  };

  PARLOR_VISITS.set(visitId, visit);

  triggerNotification(inmateId, {
    title: "👥 VISITE PROGRAMMÉE",
    body: `${visitorName} viendra vous voir\n${new Date(scheduledTime).toLocaleString()}\nDurée: ${duration} min`,
    icon: "👥",
  });

  netEmit("prison:visit_scheduled", { visit });
  return { ok: true, message: `Visite programmée avec ${visitorName}`, visit };
}

export function transferContrabandAtParlor(
  visitId: string,
  contrabandItem: ContrabandItem,
): { ok: boolean; message: string } {
  const visit = PARLOR_VISITS.get(visitId);
  if (!visit || visit.status !== "in_progress") {
    return { ok: false, message: "Visite non active." };
  }

  const detectionChance = 1 - (contrabandItem.concealability / 100);
  if (Math.random() < detectionChance && visit.isMonitored) {
    const inmate = INMATES.get(visit.inmateId);
    if (inmate) {
      inmate.goodBehaviorScore = Math.max(0, inmate.goodBehaviorScore - 40);
      inmate.disciplinaryRecord.push({
        date: Date.now(),
        infraction: "Tentative de transfert de contrebande au parloir",
        punishment: "Visites suspendues 30 jours",
      });
      sendToSolitary("system", visit.inmateId, 1440, "Transfert de contrebande au parloir");
    }
    
    sendChatMessage(`🚨 [SCC] Contrebande interceptée au parloir! Détenu envoyé au mitard.`);
    return { ok: false, message: "Contrebande détectée par les gardes!" };
  }

  visit.contrabandTransferred.push(contrabandItem);
  const inmate = INMATES.get(visit.inmateId);
  if (inmate) {
    inmate.contrabandInventory.push(contrabandItem);
  }

  return { ok: true, message: "Transfert réussi!" };
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE GANGS COMPLET
// ═══════════════════════════════════════════════════════════

export function recruitGangMember(
  recruiterId: string,
  targetId: string,
): { ok: boolean; message: string } {
  const recruiter = INMATES.get(recruiterId);
  const target = INMATES.get(targetId);
  
  if (!recruiter || !target) return { ok: false, message: "Joueur introuvable." };
  if (recruiter.gang === "sans_affiliation") return { ok: false, message: "Vous n'êtes pas dans un gang." };
  if (target.gang !== "sans_affiliation") return { ok: false, message: "Cible déjà affiliée." };
  if (recruiter.gangRank !== "lieutenant" && recruiter.gangRank !== "boss") {
    return { ok: false, message: "Seuls les lieutenants et boss peuvent recruter." };
  }

  target.gang = recruiter.gang;
  target.gangRank = "prospect";
  target.respect = Math.min(100, target.respect + 10);

  triggerNotification(targetId, {
    title: "🔥 RECRUTÉ",
    body: `Vous avez été recruté par ${recruiter.gang}!\nRang: Prospect`,
    icon: "⚔️",
    urgent: true,
  });

  netEmit("prison:gang_recruited", { recruiterId, targetId, gang: recruiter.gang });
  return { ok: true, message: `${target.playerName} recruté dans ${recruiter.gang}!` };
}

export function declareGangWar(
  aggressorGang: PrisonGang,
  targetGang: PrisonGang,
): { ok: boolean; message: string } {
  if (aggressorGang === "sans_affiliation" || targetGang === "sans_affiliation") return { ok: false, message: "Gang invalide." };
  if (aggressorGang === targetGang) return { ok: false, message: "Un gang ne peut pas se déclarer la guerre." };

  sendChatMessage(`⚔️ [GUERRE DE GANGS] ${aggressorGang} déclare la guerre à ${targetGang}!`);
  netEmit("prison:gang_war_declared", { aggressorGang, targetGang });
  return { ok: true, message: `Guerre déclarée contre ${targetGang}!` };
}

// ═══════════════════════════════════════════════════════════
// CORRUPTION DE GARDES & INFORMANTS
// ═══════════════════════════════════════════════════════════

export function bribeGuard(
  inmateId: string,
  guardId: string,
  amount: number,
  favor: string,
): { ok: boolean; message: string } {
  const inmate = INMATES.get(inmateId);
  const guard = GUARDS.get(guardId);
  
  if (!inmate || !guard) return { ok: false, message: "Joueur introuvable." };
  if (!guard.isOnDuty) return { ok: false, message: "Garde hors service." };
  if (inmate.cantineBalance < amount) return { ok: false, message: "Fonds insuffisants." };

  const successChance = guard.corruptionLevel / 100;
  if (Math.random() < successChance) {
    inmate.cantineBalance -= amount;
    guard.bribeHistory.push({ date: Date.now(), amount, fromInmate: inmateId });
    guard.isCorrupt = true;
    guard.corruptionLevel = Math.min(100, guard.corruptionLevel + 10);

    if (favor === "extra_food") inmate.cantineBalance += 50;

    triggerNotification(inmateId, { title: "💰 POT-DE-VIN ACCEPTÉ", body: `Le garde ${guard.playerName} a accepté ${amount}$`, icon: "💵" });
    return { ok: true, message: `Pot-de-vin accepté! ${favor}` };
  } else {
    inmate.goodBehaviorScore = Math.max(0, inmate.goodBehaviorScore - 50);
    inmate.disciplinaryRecord.push({ date: Date.now(), infraction: "Tentative de corruption d'agent", punishment: "Isolement 7 jours" });
    sendToSolitary("system", inmateId, 10080, "Tentative de corruption");
    sendChatMessage(`🚨 [SCC] Tentative de corruption déjouée! Détenu envoyé au mitard.`);
    return { ok: false, message: "Le garde a refusé et vous a dénoncé!" };
  }
}

export function becomeInformant(inmateId: string): { ok: boolean; message: string } {
  const inmate = INMATES.get(inmateId);
  if (!inmate) return { ok: false, message: "Détenu introuvable." };

  inmate.isInformant = true;
  inmate.trustLevelGuard = Math.min(100, inmate.trustLevelGuard + 30);
  inmate.trustLevelInmates = Math.max(0, inmate.trustLevelInmates - 50);

  triggerNotification(inmateId, { title: "🕵️ INFORMATEUR", body: "Rapportez les activités illicites pour des réductions de peine.", icon: "👁️", urgent: true });
  return { ok: true, message: "Vous êtes devenu informateur. Restez discret!" };
}

export function submitInformantReport(informantId: string, targetId: string, info: string): { ok: boolean; message: string } {
  const informant = INMATES.get(informantId);
  const target = INMATES.get(targetId);
  if (!informant || !informant.isInformant) return { ok: false, message: "Vous n'êtes pas informateur." };
  if (!target) return { ok: false, message: "Cible introuvable." };

  informant.informantReports.push({ date: Date.now(), targetId, info });
  informant.sentenceDurationMinutes = Math.max(1, informant.sentenceDurationMinutes - 60);

  triggerNotification(informantId, { title: "📝 RAPPORT SOUMIS", body: "Votre rapport a été transmis. -1h sur votre peine.", icon: "✅" });
  return { ok: true, message: "Rapport soumis. -1h sur votre peine." };
}

// ═══════════════════════════════════════════════════════════
// COMBATS DE PRISON & ÉMEUTES (RIOT)
// ═══════════════════════════════════════════════════════════

export function attackInmateOrGuard(
  attackerPlayerId: string,
  targetPlayerId: string,
  weaponId?: string,
): { ok: boolean; damageDealt: number; weaponBroken: boolean; message: string } {
  const attacker = INMATES.get(attackerPlayerId);
  if (!attacker) return { ok: false, damageDealt: 0, weaponBroken: false, message: "Non détenu." };

  let damage = 15;
  let weaponBroken = false;

  if (weaponId) {
    const weapon = attacker.contrabandInventory.find(w => w.id === weaponId && w.category === "arme");
    if (weapon) {
      damage = weapon.lethality;
      weapon.durability--;
      if (weapon.durability <= 0) {
        weaponBroken = true;
        attacker.contrabandInventory = attacker.contrabandInventory.filter(w => w !== weapon);
      }
    }
  }

  // Application des dégâts sur la victime via le système de survie (si montant négatif = dégâts)
  modifyHealth(-damage, targetPlayerId);

  const isTargetGuard = GUARDS.has(targetPlayerId);
  if (isTargetGuard) {
    damage += 10;
    sendChatMessage(`🚨 [ALERTE SCC] AGRESSION SUR UN AGENT CORRECTIONNEL EN COURS!`);
    attacker.goodBehaviorScore = 0;
    addWantedPoints(attackerPlayerId, 50, "Agression armée sur agent correctionnel");
  }

  attacker.fightsInitiated++;
  attacker.fightsWon++;

  netEmit("prison:fight_occurred", { attackerId: attackerPlayerId, targetId: targetPlayerId, damage, isTargetGuard });
  return { ok: true, damageDealt: damage, weaponBroken, message: isTargetGuard ? "Vous avez poignardé un agent! ALARME DÉCLENCHÉE!" : `Attaque portée : ${damage} dégâts.` };
}

export function startPrisonRiot(instigatorPlayerId: string, demands: string[]): { ok: boolean; message: string } {
  const inmate = INMATES.get(instigatorPlayerId);
  if (!inmate) return { ok: false, message: "Seul un détenu peut déclencher une émeute." };
  if (inmate.isInSolitary) return { ok: false, message: "Impossible depuis le mitard." };
  if (activeRiot.isRiotActive) return { ok: false, message: "Une émeute est déjà en cours dans le pénitencier!" };
  if (inmate.respect < 40) return { ok: false, message: "Vous n'avez pas assez de respect parmi les détenus pour lancer une mutinerie." };

  activeRiot = {
    isRiotActive: true,
    startedAt: Date.now(),
    instigatorGang: inmate.gang,
    participatingInmates: [instigatorPlayerId],
    controlledBlocks: [inmate.block],
    hostageGuards: [],
    demands,
    riotIntensity: 60,
    tearGasDeployed: false,
    tacticalTeamBreached: false,
  };

  for (const cell of CELLS.values()) {
    if (cell.block === inmate.block) cell.isDoorLocked = false;
  }

  sendChatMessage(`🚨🚨 [ÉMEUTE À DONNACONA] MUTINERIE GÉNÉRALE DÉCLENCHÉE AU ${inmate.block.toUpperCase()}! LES DÉTENUS PRENNENT LE CONTRÔLE!`);
  netEmit("prison:riot_started", { riot: activeRiot });
  return { ok: true, message: "Émeute déclenchée! Prenez les clés et capturez les gardes!" };
}

export function quellRiot(guardPlayerId: string, useTearGas: boolean = true): { ok: boolean; message: string } {
  if (guardPlayerId !== "system") {
    const guard = GUARDS.get(guardPlayerId);
    if (!guard || (guard.role !== "directeur" && guard.role !== "sergent_cx2")) {
      return { ok: false, message: "Seul le Directeur ou le Sergent peut ordonner la reprise de contrôle." };
    }
  }

  if (!activeRiot.isRiotActive) return { ok: false, message: "Aucune émeute active." };

  if (useTearGas) {
    activeRiot.tearGasDeployed = true;
    activeRiot.riotIntensity = Math.max(0, activeRiot.riotIntensity - 50);

    for (const inmateId of activeRiot.participatingInmates) {
      modifyHealth(-20, inmateId);
      triggerNotification(inmateId, { title: "💨 GAZ LACRYMOGÈNE DÉPLOYÉ", body: "Le GTI du SCC disperse le gaz! Vous suffoquez.", icon: "☣️", urgent: true });
    }
  }

  activeRiot.isRiotActive = false;
  activeRiot.hostageGuards = [];
  globalLockdown = true;

  for (const cell of CELLS.values()) {
    cell.isDoorLocked = true;
  }

  sendChatMessage(`🛡️ [SCC] L'émeute à Donnacona a été matée par les forces tactiques. Pénitencier en LOCKDOWN TOTAL.`);
  netEmit("prison:riot_ended", { quelledBy: guardPlayerId });
  return { ok: true, message: "Émeute neutralisée. Ordre rétabli." };
}

// ═══════════════════════════════════════════════════════════
// NOUVEAU v3.0 : SYSTÈMES D'ÉVASION & SABOTAGE CCTV
// ═══════════════════════════════════════════════════════════

export function sabotageCamera(inmateId: string, cameraId: string): { ok: boolean; message: string } {
  const inmate = INMATES.get(inmateId);
  const camera = SECURITY_CAMERAS.get(cameraId);

  if (!inmate || !camera) return { ok: false, message: "Entité invalide." };
  
  const hasScrewdriver = inmate.contrabandInventory.some(i => i.id === "tournevis_ventilation");
  if (!hasScrewdriver) return { ok: false, message: "Il vous faut un tournevis pour ouvrir le boîtier de la caméra." };

  camera.isActive = false;
  camera.isRecording = false;

  netEmit("prison:camera_sabotaged", { cameraId, inmateId });
  return { ok: true, message: `Caméra ${camera.location} désactivée temporairement.` };
}

export function planEscapeAttempt(
  inmatePlayerId: string,
  method: EscapeAttempt["method"],
  accompliceOutsideId?: string,
): { ok: boolean; message: string; escape: EscapeAttempt | null } {
  const inmate = INMATES.get(inmatePlayerId);
  if (!inmate) return { ok: false, message: "Vous n'êtes pas détenu.", escape: null };

  const escapeId = `ESC-${Date.now().toString(36).toUpperCase()}`;
  const escape: EscapeAttempt = {
    escapeId,
    inmateId: inmatePlayerId,
    method,
    startedAt: Date.now(),
    progress: 0,
    isDetected: false,
    accompliceOutsideId,
    status: "in_progress",
    accomplices: accompliceOutsideId ? [accompliceOutsideId] : [],
    requiredItems: [],
  };

  if (method === "tunnel") {
    escape.tunnelDigProgress = 0;
  } else if (method === "laundry_truck") {
    escape.laundryTruckTime = Date.now() + 24 * 3600 * 1000;
  }

  ESCAPES.set(escapeId, escape);
  inmate.escapeAttemptsCount++;

  netEmit("prison:escape_planned", { escape });
  return { ok: true, message: `Plan d'évasion (${method}) amorcé. Restez discret!`, escape };
}

export function attemptLaundryTruckEscape(escapeId: string): { ok: boolean; message: string; success: boolean } {
  const escape = ESCAPES.get(escapeId);
  if (!escape || escape.method !== "laundry_truck") return { ok: false, message: "Évasion introuvable.", success: false };

  const currentHour = useGameStore.getState().timeHours;
  const isLaundryHour = currentHour >= 10 && currentHour < 11 || currentHour >= 14 && currentHour < 15;

  if (!isLaundryHour) {
    return { ok: false, message: "Le camion de buanderie n'est pas dans le sas d'expédition en ce moment.", success: false };
  }

  // 50% de chance de passer inaperçu dans le chariot à linge
  if (Math.random() < 0.5) {
    escape.status = "succeeded";
    INMATES.delete(escape.inmateId);
    addWantedPoints(escape.inmateId, 150, "Évasion du pénitencier (Camion de Buanderie)");
    sendChatMessage(`🚨 [ALERTE ÉVASION 10-99] Un détenu manque à l'appel. Vérifiez les portes d'expédition !`);
    netEmit("prison:escape_succeeded", { escape, method: "laundry_truck" });
    return { ok: true, message: "Vous êtes dans le camion ! Ne bougez plus... Vous avez réussi !", success: true };
  } else {
    escape.status = "failed";
    sendToSolitary("system", escape.inmateId, 1440, "Tentative d'évasion découverte dans la buanderie");
    return { ok: false, message: "Un garde vous a repéré en train d'entrer dans le chariot !", success: false };
  }
}

export function digTunnel(escapeId: string, minutesWorked: number): { ok: boolean; message: string; progress: number } {
  const escape = ESCAPES.get(escapeId);
  if (!escape || escape.method !== "tunnel") return { ok: false, message: "Évasion par tunnel introuvable.", progress: 0 };

  const digRate = 2.5; // % par minute
  escape.tunnelDigProgress = Math.min(100, (escape.tunnelDigProgress ?? 0) + minutesWorked * digRate);
  escape.progress = escape.tunnelDigProgress;

  if (escape.tunnelDigProgress >= 100) {
    escape.status = "succeeded";
    INMATES.delete(escape.inmateId);
    addWantedPoints(escape.inmateId, 200, "Évasion par tunnel du pénitencier Donnacona");
    sendChatMessage(`🕳️🚨 [ALERTE ÉVASION 10-99] ÉVASION PAR TUNNEL À DONNACONA!`);
    netEmit("prison:escape_succeeded", { escape, method: "tunnel" });
    return { ok: true, message: "TUNNEL TERMINÉ! Évasion réussie!", progress: 100 };
  }

  return { ok: true, message: `Tunnel creusé: ${escape.tunnelDigProgress.toFixed(1)}%`, progress: escape.tunnelDigProgress };
}

export function attemptHelicopterExtraction(
  escapeId: string,
  pilotPlayerId: string,
  coords: { x: number; y: number; z: number },
): { ok: boolean; message: string; success: boolean } {
  const escape = ESCAPES.get(escapeId);
  if (!escape) return { ok: false, message: "Évasion introuvable.", success: false };

  const distToYard = Math.hypot(coords.x - 0, coords.z - 0);
  if (distToYard > YARD) return { ok: false, message: "L'hélicoptère n'est pas au-dessus de la cour!", success: false };

  const onDutyTowerGuards = Array.from(GUARDS.values()).filter(g => g.isOnDuty && g.assignedPost === "tours");
  const guardCount = onDutyTowerGuards.length;

  const shotDownChance = guardCount * 0.25;
  if (Math.random() < shotDownChance) {
    escape.status = "shot_down";
    sendChatMessage(`💥 [TIRS DU SCC] Les gardes des miradors ouvrent le feu et abattent l'hélicoptère au-dessus de Donnacona!`);
    modifyHealth(-80, escape.inmateId);
    modifyHealth(-100, pilotPlayerId);
    return { ok: true, message: "L'hélicoptère a été abattu par les gardes!", success: false };
  }

  escape.status = "succeeded";
  escape.progress = 100;
  INMATES.delete(escape.inmateId);
  addWantedPoints(escape.inmateId, 300, "Évasion spectaculaire par hélicoptère");
  addWantedPoints(pilotPlayerId, 300, "Complicité d'évasion par aéronef");
  sendChatMessage(`🚁🚨 [ALERTE ÉVASION 10-99] ÉVASION RÉUSSIE PAR HÉLICOPTÈRE À DONNACONA!`);
  netEmit("prison:escape_succeeded", { escape, method: "helicopter" });

  return { ok: true, message: "ÉVASION RÉUSSIE! Vous êtes libre, mais traqué par la SQ!", success: true };
}

// ═══════════════════════════════════════════════════════════
// 3D RENDERING DU COMPLEXE PÉNITENTIAIRE DE DONNACONA
// ═══════════════════════════════════════════════════════════

function signTex() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1a2430";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#c9a227";
  ctx.fillRect(0, 0, 512, 8);
  ctx.fillRect(0, 120, 512, 8);
  ctx.fillStyle = "#e8e4d8";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ÉTABLISSEMENT DE DONNACONA", 256, 56);
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#9aa4b0";
  ctx.fillText("SERVICE CORRECTIONNEL DU CANADA · MAX-SÉCURITÉ", 256, 90);
  const tex = new THREE.CanvasTexture(c);
  return finishMap(tex, "ui");
}

function buildFence(size: number, height: number) {
  const g = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.09, 0.11, height, 6);
  const postMat = matLib.get(P.acier, 0.55, 0.7);
  const n = Math.floor(size / 3.2) * 4;
  const posts = new THREE.InstancedMesh(postGeo, postMat, n + 8);
  const dummy = new THREE.Object3D();
  let i = 0;
  const half = size / 2;
  const step = 3.2;
  const sides: Array<[number, number, number, number]> = [
    [-half, half, 1, 0],
    [-half, -half, 0, 1],
    [half, -half, -1, 0],
    [half, half, 0, -1],
  ];

  for (const [sx, sz, dx, dz] of sides) {
    for (let t = 0; t < size; t += step) {
      dummy.position.set(sx + dx * t, height / 2, sz + dz * t);
      dummy.updateMatrix();
      posts.setMatrixAt(i++, dummy.matrix);
    }
  }
  posts.count = i;
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = true;
  g.add(posts);

  const meshMat = matLib.get(P.grillage, 0.7, 0.4);
  for (const [sx, sz, dx, dz] of sides) {
    const len = size;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(dx === 0 ? 0.06 : len, height - 0.4, dz === 0 ? 0.06 : len), meshMat);
    panel.position.set((dx === 0 ? sx : 0), height / 2, (dz === 0 ? sz : 0));
    panel.castShadow = true;
    g.add(panel);
  }

  const coilGeo = new THREE.TorusGeometry(0.24, 0.04, 5, 10);
  const coilMat = matLib.get(0xb0b4b8, 0.45, 0.75);
  const coils = new THREE.InstancedMesh(coilGeo, coilMat, i);
  let k = 0;
  for (const [sx, sz, dx, dz] of sides) {
    for (let t = 0; t < size; t += step) {
      dummy.position.set(sx + dx * t, height + 0.18, sz + dz * t);
      dummy.rotation.set(Math.PI / 2, 0, dx === 0 ? 0 : Math.PI / 2);
      dummy.updateMatrix();
      coils.setMatrixAt(k++, dummy.matrix);
    }
  }
  coils.count = k;
  coils.instanceMatrix.needsUpdate = true;
  g.add(coils);

  return g;
}

function buildTower(towerId: string) {
  const g = new THREE.Group();
  g.name = `mirador_${towerId}`;

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 8.4, 8), matLib.get(P.betonSombre, 0.95));
  shaft.position.y = 4.2;
  shaft.castShadow = true;
  g.add(shaft);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 3.2), matLib.get(P.beton, 0.94));
  cabin.position.y = 9.4;
  cabin.castShadow = true;
  g.add(cabin);

  const glass = matLib.glass(0x7a94ac, 0.42);
  for (const [x, z] of [[0, 1.64], [0, -1.64], [1.64, 0], [-1.64, 0]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), glass);
    w.position.set(x, 9.5, z);
    if (Math.abs(x) > 0) w.rotation.y = Math.PI / 2;
    g.add(w);
  }

  const proj = new THREE.Group();
  proj.position.set(0, 10.7, 0);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.7), matLib.get(0x3a3e42, 0.5, 0.6));
  proj.add(housing);

  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 12, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.rotation.x = Math.PI / 2;
  beam.position.z = 6.0;
  beam.userData.prisonBeam = true;
  proj.add(beam);

  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), matLib.getEmissive(0xfff4d0, 0xfff4d0, 0.8));
  lens.position.z = 0.38;
  lens.userData.isPrisonLight = true;
  proj.add(lens);

  g.add(proj);
  g.userData.projector = proj;
  return g;
}

function buildBlock(letter: string) {
  const g = new THREE.Group();
  const w = 22;
  const d = 11;
  const h = 8.2;

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(P.beton, 0.95));
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5), matLib.get(P.betonSombre, 0.95));
  roof.position.y = h + 0.15;
  roof.castShadow = true;
  g.add(roof);

  const barMat = matLib.get(P.acier, 0.55, 0.7);
  const glass = matLib.get(0x8aa4c0, 0.2, 0.5);

  for (let floor = 0; floor < 2; floor++) {
    for (let i = 0; i < 6; i++) {
      const x = -w / 2 + 2.4 + i * 3.4;
      const y = 2.2 + floor * 3.4;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.15), glass);
      win.position.set(x, y, d / 2 + 0.04);
      g.add(win);

      for (let b = 0; b < 4; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.18, 5), barMat);
        bar.position.set(x - 0.4 + b * 0.26, y, d / 2 + 0.08);
        g.add(bar);
      }
    }
  }

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.08), matLib.get(P.bleu, 0.7));
  plaque.position.set(0, 5.6, d / 2 + 0.08);
  g.add(plaque);

  g.name = `bloc_${letter}`;
  return g;
}

function buildYard() {
  const g = new THREE.Group();
  g.name = "cour_promenade";

  const court = new THREE.Mesh(new THREE.BoxGeometry(16, 0.06, 26), matLib.get(P.asphalte, 0.98));
  court.position.y = 0.04;
  court.receiveShadow = true;
  g.add(court);

  const line = matLib.get(P.ligne, 0.85);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 26), line);
  mid.position.y = 0.08;
  g.add(mid);

  for (const side of [-1, 1]) {
    const hoop = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), matLib.get(0x5a5e62, 0.55, 0.6));
    pole.position.y = 1.7;
    pole.castShadow = true;
    hoop.add(pole);

    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.06), matLib.get(0xd8d4cc, 0.7));
    board.position.set(0, 3.2, -side * 0.55);
    hoop.add(board);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 14), matLib.get(0xd04020, 0.5, 0.6));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 2.85, -side * 0.72);
    hoop.add(rim);

    hoop.position.set(0, 0, side * 12.4);
    g.add(hoop);
  }

  const benchMat = matLib.get(P.betonSombre, 0.96);
  for (const z of [-8, 0, 8]) {
    for (const x of [-14, 14]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 2.2), benchMat);
      seat.position.set(x, 0.225, z);
      seat.castShadow = true;
      g.add(seat);
    }
  }

  return g;
}

export interface BuiltPrison {
  group: THREE.Group;
  projectors: THREE.Object3D[];
  door: { x: number; z: number; yaw: number };
  yardCenter: { x: number; z: number };
}

export function buildPrisonComplex(): BuiltPrison {
  const g = new THREE.Group();
  g.name = "penitencier_donnacona";

  const slab = new THREE.Mesh(new THREE.PlaneGeometry(PERIM + 32, PERIM + 32), matLib.get(0x585a5c, 0.98));
  slab.rotation.x = -Math.PI / 2;
  slab.receiveShadow = true;
  g.add(slab);

  g.add(buildFence(PERIM, 5.4));
  g.add(buildFence(PERIM + 8, 6.2));

  const admin = new THREE.Mesh(new THREE.BoxGeometry(22, 6.4, 12), matLib.get(P.beton, 0.95));
  admin.position.set(0, 3.2, PERIM / 2 - 16);
  admin.castShadow = true;
  admin.receiveShadow = true;
  g.add(admin);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4), new THREE.MeshBasicMaterial({ map: signTex() }));
  sign.position.set(0, 5.4, PERIM / 2 - 9.9);
  g.add(sign);

  const off = YARD / 2 + 10;
  const a = buildBlock("A"); a.position.set(-off, 0, -6); g.add(a);
  const b = buildBlock("B"); b.position.set(off, 0, -6); g.add(b);
  const c = buildBlock("C"); c.position.set(-off, 0, 14); g.add(c);
  const d = buildBlock("D"); d.position.set(off, 0, 14); g.add(d);

  g.add(buildYard());

  const common = new THREE.Mesh(new THREE.BoxGeometry(28, 5.6, 12), matLib.get(P.beton, 0.95));
  common.position.set(0, 2.8, -PERIM / 2 + 16);
  common.castShadow = true;
  g.add(common);

  const ctrl = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 4.6, 8), matLib.get(P.betonSombre, 0.95));
  ctrl.position.set(0, 2.3, -YARD / 2 - 4);
  ctrl.castShadow = true;
  g.add(ctrl);

  const projectors: THREE.Object3D[] = [];
  const towerOff = PERIM / 2 + 6;
  const spots: Array<[number, number]> = [
    [-towerOff, -towerOff],
    [towerOff, -towerOff],
    [-towerOff, towerOff],
    [towerOff, towerOff],
  ];

  spots.forEach(([x, z], i) => {
    const t = buildTower(`T${i + 1}`);
    t.position.set(x, 0, z);
    const proj = t.userData.projector as THREE.Object3D;
    proj.rotation.y = (i / 4) * Math.PI * 2;
    projectors.push(proj);
    g.add(t);
  });

  const gate = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 0.18), matLib.get(P.acier, 0.5, 0.7));
  gate.position.set(0, 1.7, PERIM / 2 + 3.8);
  g.add(gate);

  const sirenLamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), matLib.getEmissive(0xff2010, 0xff2010, 1.5));
  sirenLamp.position.set(0, 3.8, PERIM / 2 + 4.0);
  sirenLamp.userData.isPrisonLight = true;
  g.add(sirenLamp);

  return {
    group: g,
    projectors,
    door: { x: 0, z: PERIM / 2 + 5.0, yaw: Math.PI },
    yardCenter: { x: 0, z: 0 },
  };
}

export function animatePrison(prison: BuiltPrison, elapsed: number, dt: number, night: boolean) {
  prison.projectors.forEach((p, i) => {
    p.rotation.y += dt * (0.16 + i * 0.04);
  });

  prison.group.traverse((obj) => {
    if (obj.userData.prisonBeam && obj instanceof THREE.Mesh) {
      const m = obj.material as THREE.MeshBasicMaterial;
      m.opacity = night ? 0.14 : (activeRiot.isRiotActive ? 0.2 : 0);
    }
    if (obj.userData.isPrisonLight && obj instanceof THREE.Mesh) {
      const m = obj.material as THREE.MeshStandardMaterial;
      if (m.emissive) {
        if (activeRiot.isRiotActive) {
          m.emissiveIntensity = 2.0 + Math.sin(elapsed * 8) * 1.5;
        } else {
          m.emissiveIntensity = night ? 1.6 : 0.2;
        }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// CLASSE SYSTÈME & TICK MULTIJOUEUR
// ═══════════════════════════════════════════════════════════

export class PrisonManager {
  tick(dtMinutes: number) {
    const currentHour = useGameStore.getState().timeHours;

    // 1. Appliquer le Lockdown automatique selon l'horaire SCC
    const currentSchedule = DAILY_SCHEDULE.find(s => Math.floor(currentHour) === s.hour);
    if (currentSchedule && currentSchedule.activity === "lockdown" && !globalLockdown) {
      globalLockdown = true;
      for (const cell of CELLS.values()) {
        cell.isDoorLocked = true;
      }
      sendChatMessage(`📢 [SCC] Annonce système : Début du couvre-feu. Toutes les portes de cellules sont verrouillées.`);
    } else if (currentSchedule && currentSchedule.activity !== "lockdown" && globalLockdown && !activeRiot.isRiotActive) {
      globalLockdown = false;
      for (const cell of CELLS.values()) {
        cell.isDoorLocked = false;
      }
      sendChatMessage(`📢 [SCC] Annonce système : Fin du couvre-feu. Les cellules sont ouvertes.`);
    }

    // 2. Décrémenter les peines et gérer la santé mentale des détenus
    for (const inmate of INMATES.values()) {
      inmate.timeServedMinutes += dtMinutes;

      if (inmate.isInSolitary) {
        inmate.solitaryRemainingMinutes -= dtMinutes;
        
        inmate.healthState.stressLevel = Math.min(100, inmate.healthState.stressLevel + dtMinutes * 0.5);
        inmate.healthState.depressionLevel = Math.min(100, inmate.healthState.depressionLevel + dtMinutes * 0.3);
        
        if (inmate.healthState.depressionLevel > 80) {
          inmate.healthState.mentalState = "suicidal";
        } else if (inmate.healthState.depressionLevel > 60) {
          inmate.healthState.mentalState = "depressed";
        } else if (inmate.healthState.stressLevel > 70) {
          inmate.healthState.mentalState = "paranoid";
        }
        
        if (inmate.solitaryRemainingMinutes <= 0) {
          inmate.isInSolitary = false;
          inmate.block = "bloc_A";
        }
      }

      if (inmate.job) {
        const jobDef = PRISON_JOBS[inmate.job];
        if (jobDef.scheduleHours.includes(Math.floor(currentHour))) {
          inmate.workHoursLogged += dtMinutes / 60;
          inmate.cantineBalance += jobDef.hourlyPay * (dtMinutes / 60);
          
          if (jobDef.rehabilitationValue) {
            inmate.goodBehaviorScore = Math.min(100, inmate.goodBehaviorScore + jobDef.rehabilitationValue * (dtMinutes / 60) * 0.1);
          }
        }
      }

      if (inmate.timeServedMinutes >= inmate.sentenceDurationMinutes) {
        releasePlayer(inmate.playerId, "Peine purgée");
      }
    }

    // 3. Gestion des émeutes actives
    if (activeRiot.isRiotActive && activeRiot.startedAt) {
      const riotDuration = (Date.now() - activeRiot.startedAt) / 60000;
      if (riotDuration > 20) {
        quellRiot("system", true);
      }
    }

    // 4. Événements aléatoires (0.1% chance par minute)
    if (Math.random() < 0.001 * dtMinutes) { 
      this.triggerRandomEvent();
    }
  }

  private triggerRandomEvent() {
    const events = ["fight", "inspection", "contraband_found", "medical_emergency"];
    const event = events[Math.floor(Math.random() * events.length)];

    switch (event) {
      case "fight":
        const inmates = Array.from(INMATES.values());
        if (inmates.length >= 2) {
          const fighter1 = inmates[Math.floor(Math.random() * inmates.length)];
          const fighter2 = inmates[Math.floor(Math.random() * inmates.length)];
          if (fighter1.playerId !== fighter2.playerId) {
            sendChatMessage(`⚔️ [BAGARRE] Altercation entre ${fighter1.playerName} et ${fighter2.playerName} dans le ${fighter1.block}!`);
          }
        }
        break;
      case "inspection":
        sendChatMessage(`🔍 [INSPECTION] Inspection surprise des cellules en cours par le GTI !`);
        break;
      case "contraband_found":
        sendChatMessage(`🚨 [FOUILLE] De la contrebande a été découverte lors d'une fouille de routine.`);
        break;
      case "medical_emergency":
        sendChatMessage(`🚑 [URGENCE] Équipe médicale appelée à l'infirmerie pour un malaise !`);
        break;
    }
  }

  getInmate(playerId: string): InmateProfile | null {
    return INMATES.get(playerId) ?? null;
  }

  getGuard(playerId: string): PrisonGuard | null {
    return GUARDS.get(playerId) ?? null;
  }

  getAllInmates(): InmateProfile[] {
    return Array.from(INMATES.values());
  }

  getAllGuards(): PrisonGuard[] {
    return Array.from(GUARDS.values());
  }

  getStats() {
    const inmates = Array.from(INMATES.values());
    const guards = Array.from(GUARDS.values());

    return {
      totalInmates: inmates.length,
      totalGuards: guards.length,
      guardsOnDuty: guards.filter(g => g.isOnDuty).length,
      inmatesBySecurityLevel: {
        minimum: inmates.filter(i => i.securityLevel === "minimum").length,
        medium: inmates.filter(i => i.securityLevel === "medium").length,
        maximum: inmates.filter(i => i.securityLevel === "maximum").length,
        supermax: inmates.filter(i => i.securityLevel === "supermax").length,
      },
      inmatesByGang: {
        sans_affiliation: inmates.filter(i => i.gang === "sans_affiliation").length,
        motards_hells: inmates.filter(i => i.gang === "motards_hells").length,
        gang_rue_mtl: inmates.filter(i => i.gang === "gang_rue_mtl").length,
        mafia_italienne: inmates.filter(i => i.gang === "mafia_italienne").length,
        fraternite_nordique: inmates.filter(i => i.gang === "fraternite_nordique").length,
        syndicat_asiatique: inmates.filter(i => i.gang === "syndicat_asiatique").length,
      },
      activeEscapes: Array.from(ESCAPES.values()).filter(e => e.status === "in_progress").length,
      activeRiot: activeRiot.isRiotActive,
      scheduledParoleHearings: Array.from(PAROLE_HEARINGS.values()).filter(h => h.status === "pending").length,
      scheduledVisits: Array.from(PARLOR_VISITS.values()).filter(v => v.status === "scheduled").length,
    };
  }
}

export const prisonSystem = new PrisonManager();

// ═══════════════════════════════════════════════════════════
// ENREGISTREMENT DES REMOTES RPC MULTIJOUEUR
// ═══════════════════════════════════════════════════════════

registerRemote("prison:incarcerate", incarceratePlayer);
registerRemote("prison:release", releasePlayer);
registerRemote("prison:clock_in_guard", clockInGuard);
registerRemote("prison:clock_out_guard", clockOutGuard);
registerRemote("prison:search_cell", conductCellSearch);
registerRemote("prison:send_solitary", sendToSolitary);
registerRemote("prison:craft", craftContraband);
registerRemote("prison:buy_cantine", buyCantineItem);
registerRemote("prison:consume_drug", consumeContrabandDrug);
registerRemote("prison:attack", attackInmateOrGuard);
registerRemote("prison:start_riot", startPrisonRiot);
registerRemote("prison:quell_riot", quellRiot);
registerRemote("prison:plan_escape", planEscapeAttempt);
registerRemote("prison:helicopter_escape", attemptHelicopterExtraction);
registerRemote("prison:dig_tunnel", digTunnel);
registerRemote("prison:laundry_escape", attemptLaundryTruckEscape);
registerRemote("prison:sabotage_camera", sabotageCamera);
registerRemote("prison:schedule_parole", scheduleParoleHearing);
registerRemote("prison:parole_decision", conductParoleHearing);
registerRemote("prison:schedule_visit", scheduleParlorVisit);
registerRemote("prison:transfer_contraband", transferContrabandAtParlor);
registerRemote("prison:recruit_gang", recruitGangMember);
registerRemote("prison:declare_gang_war", declareGangWar);
registerRemote("prison:bribe_guard", bribeGuard);
registerRemote("prison:become_informant", becomeInformant);
registerRemote("prison:submit_report", submitInformantReport);
