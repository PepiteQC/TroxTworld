/**
 * ═══════════════════════════════════════════════════════════════════
 * ÉTABLISSEMENT DE DONNACONA — SERVICE CORRECTIONNEL DU CANADA (SCC)
 * SYSTÈME CARCÉRAL & PÉNITENTIAIRE MULTIJOUEUR
 * ═══════════════════════════════════════════════════════════════════
 *
 * RÔLES JOUEURS :
 *  - Directeur de l'établissement (Warden)
 *  - Superviseur de quart / Sergent (CX-02)
 *  - Agent correctionnel / Gardien (CX-01)
 *  - Infirmier(ère) du pénitencier
 *  - Cuisinier / Superviseur des ateliers
 *  - Détenu (Inmate) : Minimum, Médium, Maximum, Supermax (SHU / Mitard)
 *  - Avocat criminaliste / Visiteur
 *
 * SYSTÈMES COMPLETS :
 *  - Incarcération, fouille d'admission, saisie des biens, remise d'uniforme
 *  - Affectation des cellules (Blocs A, B, C, D + Isolement "Le Trou")
 *  - Routine quotidienne (Appel/Roll call, Repas, Cour/Yard, Travail, Lockup)
 *  - Économie carcérale & Cantine (Cigarettes, timbres, nouilles, café)
 *  - Artisanat & Contrabande (Shanks/pics, hooch/alcool de cellule, drogues, téléphones)
 *  - Gangs de prison (Hells Angels, Gangs de rue MTL, Mafia, Indépendants)
 *  - Émeutes coordonnées & Prises d'otages (Gardiens kidnappés, barricades)
 *  - Systèmes d'évasion réalistes :
 *      1. Évasion par hélicoptère sur la cour (Style Donnacona / Orsainville)
 *      2. Coupe-grillage de périmètre sous les projecteurs
 *      3. Conduits d'aération & trappes de maintenance
 *      4. Tunnel clandestin creusé sous les blocs
 *      5. Camion de blanchisserie / ordures
 *  - Commission des libérations conditionnelles (CLCC) & remises de peine
 *  - Parloir & Visites supervisées (transfert discret de contrebande)
 *
 * INTÉGRATIONS :
 *  - police.ts (transferts de prisonniers, avis d'évasion 10-99)
 *  - banking.ts (comptes fiduciaires des détenus, salaires des gardiens)
 *  - survival.ts (santé, faim, blessures de couteau)
 *  - net.ts / remotes.ts (RPC multijoueur synchronisé)
 *  - chat.tsx / phone.tsx (communications carcérales / téléphones clandestins)
 * ═══════════════════════════════════════════════════════════
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

export interface PrisonGuard {
  playerId: string;
  playerName: string;
  badgeNumber: string;
  role: PrisonRole;
  rankTitle: string;
  hourlyRate: number;
  isOnDuty: boolean;
  clockInTime: number | null;
  assignedPost: "tours" | "cour" | "blocs" | "fouiller" | "portail" | "parloir" | "regie";
  equipment: string[];     // ["taser", "matraque", "gazeuse", "cles_passe_partout", "menottes", "radio"]
  keysAuthorized: PrisonBlockId[];
  takedownsCount: number;
  searchesCount: number;
}

export interface InmateProfile {
  playerId: string;
  playerName: string;
  bookingNumber: string;    // "DONN-2024-XXXX"
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
  respect: number;          // 0 à 100
  trustLevelGuard: number;  // 0 à 100 (indicateur/snitch vs dur à cuire)
  trustLevelInmates: number;// 0 à 100
  isLockdown: boolean;
  isInSolitary: boolean;
  solitaryRemainingMinutes: number;
  job: PrisonJobId | null;
  cantineBalance: number;   // $ sur le compte cantine
  contrabandInventory: ContrabandItem[];
  confiscatedItems: Array<{ id: string; qty: number }>;
  healthState: { isInjured: boolean; isAddicted: boolean; hunger: number };
  escapeAttemptsCount: number;
  goodBehaviorScore: number;
}

export type PrisonJobId =
  | "cuisine"              // Cantine & nourriture
  | "blanchisserie"        // Linge & uniformes
  | "menuiserie_atelier"   // Travail du bois & métal
  | "nettoyage_blocs"      // Concierge
  | "bibliotheque"         // Aide aux détenus
  | "maintenance_cour";    // Entretien extérieur

export interface PrisonJobDef {
  id: PrisonJobId;
  name: string;
  hourlyPay: number;       // en argent de cantine ($3 à $8/h)
  riskOfContraband: number;// opportunités de voler des items (0.0 - 1.0)
  obtainableContraband: string[];
  requiredRespect: number;
}

export const PRISON_JOBS: Record<PrisonJobId, PrisonJobDef> = {
  cuisine: {
    id: "cuisine",
    name: "Cuisine centrale",
    hourlyPay: 5.50,
    riskOfContraband: 0.7,
    obtainableContraband: ["couteau_cuisine", "sucre_pour_hooch", "levure", "fourchette_metal"],
    requiredRespect: 10,
  },
  blanchisserie: {
    id: "blanchisserie",
    name: "Blanchisserie industrielle",
    hourlyPay: 4.50,
    riskOfContraband: 0.5,
    obtainableContraband: ["drap_corde", "eau_de_javel", "sac_transport_evasion"],
    requiredRespect: 0,
  },
  menuiserie_atelier: {
    id: "menuiserie_atelier",
    name: "Atelier d'usinage & bois",
    hourlyPay: 7.00,
    riskOfContraband: 0.85,
    obtainableContraband: ["tournevis", "lame_scie", "tige_fer", "clou_long", "papier_sable"],
    requiredRespect: 25,
  },
  nettoyage_blocs: {
    id: "nettoyage_blocs",
    name: "Conciergerie des cellules",
    hourlyPay: 3.50,
    riskOfContraband: 0.4,
    obtainableContraband: ["manche_balai", "produit_chimique_aveuglant"],
    requiredRespect: 0,
  },
  bibliotheque: {
    id: "bibliotheque",
    name: "Bibliothèque & archives",
    hourlyPay: 6.00,
    riskOfContraband: 0.3,
    obtainableContraband: ["livre_creuse", "ciseaux", "colle_forte"],
    requiredRespect: 15,
  },
  maintenance_cour: {
    id: "maintenance_cour",
    name: "Entretien de la cour",
    hourlyPay: 5.00,
    riskOfContraband: 0.6,
    obtainableContraband: ["roche_lourde", "tuyau_metal", "fil_de_fer"],
    requiredRespect: 20,
  },
};

// ═══════════════════════════════════════════════════════════
// CATALOGUE DE CANTINE & CONTREBANDE
// ═══════════════════════════════════════════════════════════

export interface ContrabandItem {
  id: string;
  name: string;
  category: "arme" | "drogue" | "outil" | "communication" | "divers";
  lethality: number;        // 0 à 100
  concealability: number;   // 0 (difficile à cacher) à 100 (facile à planquer dans l'anus/chaussette)
  durability: number;       // utilisations restantes
  cantineValue: number;     // valeur de troc en prison
  description: string;
  craftable: boolean;
  recipe?: Array<{ itemId: string; qty: number }>;
}

export const CONTRABAND_CATALOG: Record<string, ContrabandItem> = {
  // Armes artisanales
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

  // Drogues & Fabrication
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

  // Outils d'évasion
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
};

// Items licites achetables à la cantine (commissary)
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
  tunnelProgress: number;     // 0 à 100%
  lastInspectedAt: number;
}

export interface RiotState {
  isRiotActive: boolean;
  startedAt: number | null;
  instigatorGang: PrisonGang;
  participatingInmates: string[];
  controlledBlocks: PrisonBlockId[];
  hostageGuards: string[];
  demands: string[];
  riotIntensity: number;       // 0 à 100
  tearGasDeployed: boolean;
  tacticalTeamBreached: boolean;
}

export interface EscapeAttempt {
  escapeId: string;
  inmateId: string;
  method: "helicopter" | "fence_cut" | "ventilation" | "tunnel" | "laundry_truck";
  startedAt: number;
  progress: number;            // 0 à 100
  isDetected: boolean;
  accompliceOutsideId?: string;
  helicopterCoords?: { x: number; y: number; z: number };
  status: "planning" | "in_progress" | "succeeded" | "failed" | "shot_down";
}

export interface ParoleHearing {
  hearingId: string;
  inmateId: string;
  scheduledTime: number;
  status: "pending" | "approved" | "denied";
  rehabilitationScore: number;
  victimStatement: string;
  decisionNotes: string;
}

// ═══════════════════════════════════════════════════════════
// ÉTAT GLOBAL (multijoueur synchronisé)
// ═══════════════════════════════════════════════════════════

const GUARDS = new Map<string, PrisonGuard>();
const INMATES = new Map<string, InmateProfile>();
const CELLS = new Map<string, CellRecord>();
const ESCAPES = new Map<string, EscapeAttempt>();
const PAROLE_HEARINGS = new Map<string, ParoleHearing>();

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

// Initialiser les cellules des 4 blocs
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
      });
    }
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

  // Trouver une cellule libre dans les blocs
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

  // Si le bloc préféré est plein, prendre n'importe quelle cellule
  if (!assignedCell) {
    for (const cell of CELLS.values()) {
      if (cell.block !== "isolement_trou" && cell.inmateIds.length < cell.maxCapacity) {
        assignedCell = cell;
        break;
      }
    }
  }

  if (!assignedCell) {
    return {
      ok: false,
      message: "Le pénitencier de Donnacona est à pleine capacité!",
      inmate: null,
      cell: null,
    };
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
    paroleEligibilityTimestamp: Date.now() + (sentenceMinutes * 0.4) * 60_000, // 40% de la peine
    gang: gangAffiliation,
    gangRank: "membre",
    respect: 10,
    trustLevelGuard: 20,
    trustLevelInmates: 50,
    isLockdown: false,
    isInSolitary: assignedCell.block === "isolement_trou",
    solitaryRemainingMinutes: assignedCell.block === "isolement_trou" ? sentenceMinutes : 0,
    job: null,
    cantineBalance: 50.00, // pécule d'arrivée de base
    contrabandInventory: [],
    confiscatedItems: [],
    healthState: { isInjured: false, isAddicted: false, hunger: 100 },
    escapeAttemptsCount: 0,
    goodBehaviorScore: 50,
  };

  INMATES.set(playerId, inmate);

  // Notifications
  triggerNotification(playerId, {
    title: "🔒 INCARCÉRATION SCC",
    body: `Établissement Donnacona\nMatricule: ${bookingNumber}\nCellule: ${assignedCell.block} #${assignedCell.cellNumber}\nPeine: ${sentenceMinutes} min`,
    icon: "⛓️",
    urgent: true,
  });

  sendChatMessage(`📢 [SCC] Le détenu ${playerName} (#${bookingNumber}) a été admis à Donnacona.`);
  netEmit("prison:inmate_booked", { inmate, cellId: assignedCell.cellId });

  return {
    ok: true,
    message: `Incarcéré avec succès. Cellule ${assignedCell.block} #${assignedCell.cellNumber}`,
    inmate,
    cell: assignedCell,
  };
}

export function releasePlayer(playerId: string, reason: string = "Fin de peine"): { ok: boolean; message: string } {
  const inmate = INMATES.get(playerId);
  if (!inmate) return { ok: false, message: "Détenu introuvable." };

  // Retirer de la cellule
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

  // Déposer le salaire sur le compte bancaire
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

  // Découverte d'items selon le niveau de dissimulation
  for (const item of cell.hiddenStash) {
    const detectionChance = 1 - (item.concealability / 120);
    if (Math.random() < detectionChance) {
      found.push(item);
    }
  }

  // Retirer les items trouvés
  cell.hiddenStash = cell.hiddenStash.filter(item => !found.includes(item));
  cell.lastInspectedAt = Date.now();
  guard.searchesCount++;

  // Pénaliser les détenus occupant la cellule
  for (const inmateId of cell.inmateIds) {
    const inmate = INMATES.get(inmateId);
    if (inmate && found.length > 0) {
      inmate.goodBehaviorScore = Math.max(0, inmate.goodBehaviorScore - 20);
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
    message: found.length > 0
      ? `Fouille complétée : ${found.length} objet(s) illicite(s) saisi(s)!`
      : "Cellule fouillée : Rien à signaler.",
  };
}

export function sendToSolitary(
  guardPlayerId: string,
  inmateId: string,
  durationMinutes: number,
  reason: string,
): { ok: boolean; message: string } {
  const guard = GUARDS.get(guardPlayerId);
  if (!guard || !guard.isOnDuty) return { ok: false, message: "Permission refusée." };

  const inmate = INMATES.get(inmateId);
  if (!inmate) return { ok: false, message: "Détenu introuvable." };

  // Retirer de l'ancienne cellule
  for (const cell of CELLS.values()) {
    cell.inmateIds = cell.inmateIds.filter(id => id !== inmateId);
  }

  // Trouver une cellule d'isolement (Le trou)
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

  // Vérifier les ingrédients dans l'inventaire du joueur
  for (const ing of proto.recipe) {
    const count = getInventoryItem(inmatePlayerId, ing.itemId as any) ?? 0;
    if (count < ing.qty) {
      return { ok: false, message: `Matériaux manquants : ${ing.itemId} (${count}/${ing.qty})`, item: null };
    }
  }

  // Consommer les ingrédients
  for (const ing of proto.recipe) {
    removeFromInventory(ing.itemId as any, ing.qty, inmatePlayerId);
  }

  const craftedItem: ContrabandItem = { ...proto, durability: proto.durability };
  inmate.contrabandInventory.push(craftedItem);

  // Augmenter le respect en prison
  inmate.respect = Math.min(100, inmate.respect + 5);

  netEmit("prison:item_crafted", { playerId: inmatePlayerId, itemId: recipeItemId });
  return {
    ok: true,
    message: `Fabrication réussie : ${proto.name}!`,
    item: craftedItem,
  };
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
  addToInventory(productId as any, qty, inmatePlayerId);

  netEmit("prison:cantine_purchase", { playerId: inmatePlayerId, productId, qty, total });
  return { ok: true, message: `Achat effectué : ${qty}x ${prod.name} (-${total.toFixed(2)}$)` };
}

// ═══════════════════════════════════════════════════════════
// COMBATS DE PRISON & PRISES D'OTAGES
// ═══════════════════════════════════════════════════════════

export function attackInmateOrGuard(
  attackerPlayerId: string,
  targetPlayerId: string,
  weaponId?: string,
): { ok: boolean; damageDealt: number; weaponBroken: boolean; message: string } {
  const attacker = INMATES.get(attackerPlayerId);
  if (!attacker) return { ok: false, damageDealt: 0, weaponBroken: false, message: "Non détenu." };

  let damage = 15; // coup de poing
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

  // Appliquer les dégâts
  modifyHealth(-damage, targetPlayerId);

  // Alerte automatique des gardes
  const isTargetGuard = GUARDS.has(targetPlayerId);
  if (isTargetGuard) {
    damage += 10;
    sendChatMessage(`🚨 [ALERTE SCC] AGRESSION SUR UN AGENT CORRECTIONNEL EN COURS!`);
    attacker.goodBehaviorScore = 0;
    addWantedPoints(attackerPlayerId, 50, "Agression armée sur agent correctionnel");
  }

  netEmit("prison:fight_occurred", {
    attackerId: attackerPlayerId,
    targetId: targetPlayerId,
    damage,
    isTargetGuard,
  });

  return {
    ok: true,
    damageDealt: damage,
    weaponBroken,
    message: isTargetGuard ? "Vous avez poignardé un agent! ALARME DÉCLENCHÉE!" : `Attaque portée : ${damage} dégâts.`,
  };
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME D'ÉMEUTE (PRISON RIOT)
// ═══════════════════════════════════════════════════════════

export function startPrisonRiot(
  instigatorPlayerId: string,
  demands: string[],
): { ok: boolean; message: string } {
  const inmate = INMATES.get(instigatorPlayerId);
  if (!inmate) return { ok: false, message: "Seul un détenu peut déclencher une émeute." };

  if (activeRiot.isRiotActive) {
    return { ok: false, message: "Une émeute est déjà en cours dans le pénitencier!" };
  }

  if (inmate.respect < 40) {
    return { ok: false, message: "Vous n'avez pas assez de respect parmi les détenus pour lancer une mutinerie." };
  }

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

  // Déverrouiller toutes les cellules du bloc d'origine
  for (const cell of CELLS.values()) {
    if (cell.block === inmate.block) {
      cell.isDoorLocked = false;
    }
  }

  sendChatMessage(`🚨🚨 [ÉMEUTE À DONNACONA] MUTINERIE GÉNÉRALE DÉCLENCHÉE AU ${inmate.block.toUpperCase()}! LES DÉTENUS PRENNENT LE CONTRÔLE!`);
  netEmit("prison:riot_started", { riot: activeRiot });

  return { ok: true, message: "Émeute déclenchée! Prenez les clés et capturez les gardes!" };
}

export function quellRiot(
  guardPlayerId: string,
  useTearGas: boolean = true,
): { ok: boolean; message: string } {
  const guard = GUARDS.get(guardPlayerId);
  if (!guard || guard.role !== "directeur" && guard.role !== "sergent_cx2") {
    return { ok: false, message: "Seul le Directeur ou le Sergent peut ordonner la reprise de contrôle." };
  }

  if (!activeRiot.isRiotActive) return { ok: false, message: "Aucune émeute active." };

  if (useTearGas) {
    activeRiot.tearGasDeployed = true;
    activeRiot.riotIntensity = Math.max(0, activeRiot.riotIntensity - 50);

    // Infliger des effets de gaz lacrymogène à tous les détenus
    for (const inmateId of activeRiot.participatingInmates) {
      modifyHealth(-20, inmateId);
      triggerNotification(inmateId, {
        title: "💨 GAZ LACRYMOGÈNE DÉPLOYÉ",
        body: "Le GTI du SCC disperse le gaz dans les corridors! Vous suffoquez.",
        icon: "☣️",
        urgent: true,
      });
    }
  }

  // Fin de l'émeute et verrouillage total
  activeRiot.isRiotActive = false;
  activeRiot.hostageGuards = [];
  globalLockdown = true;

  // Verrouiller toutes les portes
  for (const cell of CELLS.values()) {
    cell.isDoorLocked = true;
  }

  sendChatMessage(`🛡️ [SCC] L'émeute à Donnacona a été matée par les forces tactiques. Pénitencier en LOCKDOWN TOTAL.`);
  netEmit("prison:riot_ended", { quelledBy: guardPlayerId });

  return { ok: true, message: "Émeute neutralisée. Ordre rétabli." };
}

// ═══════════════════════════════════════════════════════════
// SYSTÈMES D'ÉVASION (ESCAPE SYSTEM)
// ═══════════════════════════════════════════════════════════

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
  };

  ESCAPES.set(escapeId, escape);
  inmate.escapeAttemptsCount++;

  netEmit("prison:escape_planned", { escape });
  return { ok: true, message: `Plan d'évasion (${method}) amorcé. Restez discret!`, escape };
}

// Évasion par hélicoptère (classique québécois sur la cour)
export function attemptHelicopterExtraction(
  escapeId: string,
  pilotPlayerId: string,
  coords: { x: number; y: number; z: number },
): { ok: boolean; message: string; success: boolean } {
  const escape = ESCAPES.get(escapeId);
  if (!escape) return { ok: false, message: "Évasion introuvable.", success: false };

  // Vérifier si l'hélico est au-dessus de la cour de Donnacona
  const distToYard = Math.hypot(coords.x - 0, coords.z - 0);
  if (distToYard > YARD) {
    return { ok: false, message: "L'hélicoptère n'est pas au-dessus de la cour!", success: false };
  }

  // Vérifier si les gardes des miradors tirent
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

  // Succès de l'évasion !
  escape.status = "succeeded";
  escape.progress = 100;

  // Retirer le joueur de la prison
  INMATES.delete(escape.inmateId);

  // Mettre un avis de recherche maximal 5 étoiles
  addWantedPoints(escape.inmateId, 300, "Évasion spectaculaire par hélicoptère du pénitencier Donnacona");
  addWantedPoints(pilotPlayerId, 300, "Complicité d'évasion par aéronef");

  sendChatMessage(`🚁🚨 [ALERTE ÉVASION 10-99] ÉVASION RÉUSSIE PAR HÉLICOPTÈRE À DONNACONA! TOUTES LES UNITÉS DE LA SQ EN CHASSE!`);
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

  // Barbelés concertina au sommet
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

  // Projecteur de surveillance rotatif
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

  // Fenêtres à barreaux des cellules
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

  // Plaque du bloc (ex: BLOC A)
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

  // Terrain de basket
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

  // Bancs de musculation / poids de cour
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

  // Dalle de base
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(PERIM + 32, PERIM + 32), matLib.get(0x585a5c, 0.98));
  slab.rotation.x = -Math.PI / 2;
  slab.receiveShadow = true;
  g.add(slab);

  // Double clôture de sécurité (Périmètre intérieur et extérieur)
  g.add(buildFence(PERIM, 5.4));
  g.add(buildFence(PERIM + 8, 6.2));

  // Bâtiment administratif et poste d'accueil
  const admin = new THREE.Mesh(new THREE.BoxGeometry(22, 6.4, 12), matLib.get(P.beton, 0.95));
  admin.position.set(0, 3.2, PERIM / 2 - 16);
  admin.castShadow = true;
  admin.receiveShadow = true;
  g.add(admin);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4), new THREE.MeshBasicMaterial({ map: signTex() }));
  sign.position.set(0, 5.4, PERIM / 2 - 9.9);
  g.add(sign);

  // Les 4 Blocs Cellulaires
  const off = YARD / 2 + 10;
  const a = buildBlock("A"); a.position.set(-off, 0, -6); g.add(a);
  const b = buildBlock("B"); b.position.set(off, 0, -6); g.add(b);
  const c = buildBlock("C"); c.position.set(-off, 0, 14); g.add(c);
  const d = buildBlock("D"); d.position.set(off, 0, 14); g.add(d);

  // La Cour de promenade centrale
  g.add(buildYard());

  // Réfectoire et Ateliers
  const common = new THREE.Mesh(new THREE.BoxGeometry(28, 5.6, 12), matLib.get(P.beton, 0.95));
  common.position.set(0, 2.8, -PERIM / 2 + 16);
  common.castShadow = true;
  g.add(common);

  // Tour de contrôle centrale (Le Bubble)
  const ctrl = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 4.6, 8), matLib.get(P.betonSombre, 0.95));
  ctrl.position.set(0, 2.3, -YARD / 2 - 4);
  ctrl.castShadow = true;
  g.add(ctrl);

  // 4 Miradors armés aux coins
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

  // Portail d'entrée motorisé (SAS pour fourgons)
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
  // Rotation des projecteurs de surveillance
  prison.projectors.forEach((p, i) => {
    p.rotation.y += dt * (0.16 + i * 0.04);
  });

  // Gestion des faisceaux lumineux et de l'alarme d'émeute
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
    // 1. Décrémenter les peines de tous les détenus
    for (const inmate of INMATES.values()) {
      inmate.timeServedMinutes += dtMinutes;

      if (inmate.isInSolitary) {
        inmate.solitaryRemainingMinutes -= dtMinutes;
        if (inmate.solitaryRemainingMinutes <= 0) {
          inmate.isInSolitary = false;
          inmate.block = "bloc_A";
        }
      }

      // Si la peine est terminée
      if (inmate.timeServedMinutes >= inmate.sentenceDurationMinutes) {
        releasePlayer(inmate.playerId, "Peine purgée");
      }
    }

    // 2. Gestion des émeutes actives
    if (activeRiot.isRiotActive && activeRiot.startedAt) {
      const riotDuration = (Date.now() - activeRiot.startedAt) / 60000;
      if (riotDuration > 20) { // Fin automatique après 20 minutes si non résolu
        quellRiot("system", true);
      }
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
registerRemote("prison:attack", attackInmateOrGuard);
registerRemote("prison:start_riot", startPrisonRiot);
registerRemote("prison:quell_riot", quellRiot);
registerRemote("prison:plan_escape", planEscapeAttempt);
registerRemote("prison:helicopter_escape", attemptHelicopterExtraction);