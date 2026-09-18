/**
<<<<<<< HEAD
 * ═════════════════════════════════════════════════════════════════════════════
 * 💼 CARRIÈRES, QUARTS DE TRAVAIL & COMPÉTENCES v2.0 — CATALOGUE PORTNEUF
 * Fichier : /src/game/gigs.ts
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Safe array access (aucun non-null assertion au boot)
 *  • Validation stricte de TOUS les champs persistés
 *  • Daily cap anti-farm
 *  • Events : onGigStart, onGigStep, onGigComplete, onGigFail, onGigCancel
 *  • Cancellation de gig
 *  • Stats agrégées (earned total, par catégorie, avg duration, streak)
 *  • Réputation par catégorie
 *  • Skill synergy (bonus passif léger)
 *  • Witness system pour gigs illégaux
 *  • Serialization d'ActiveGig (reconnect recovery)
 *  • Health check
 *  • Compat 100% v1
 * ═════════════════════════════════════════════════════════════════════════════
 */
import { A40_EXITS, A40_Z, PAPETERIE, SQ_JAIL, VILLAGES } from "./worlddata";

// ─── 1. TYPES ET INTERFACES ──────────────────────────────────────────────────

export type JobCategory =
  | "transport" | "commerce" | "securite" | "sante"
  | "construction" | "restauration" | "illegal"
  | "gouvernement" | "media";
=======
 * Quarts & compétences — catalogue Portneuf.
 * Tick via la boucle moteur (dt), persisté dans le store. Pas de Firebase.
 */
import { A40_EXITS, A40_Z, PAPETERIE, SQ_JAIL, VILLAGES } from "./worlddata";

export type JobCategory =
  | "transport"
  | "commerce"
  | "securite"
  | "sante"
  | "construction"
  | "restauration"
  | "illegal"
  | "gouvernement"
  | "media";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

export type JobLevel = 1 | 2 | 3 | 4 | 5;

export type SkillType =
<<<<<<< HEAD
  | "conduite" | "force" | "endurance" | "charisme"
  | "technique" | "discretion" | "medecine" | "cuisine";
=======
  | "conduite"
  | "force"
  | "endurance"
  | "charisme"
  | "technique"
  | "discretion"
  | "medecine"
  | "cuisine";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

export type GigLicenseId = "permis_c" | "diplome_sante" | "badge_police";

export interface JobStep {
  id: string;
  description: string;
  duration: number;
  skillCheck?: { skill: SkillType; difficulty: number };
  canFail?: boolean;
  failPenalty?: number;
}

export interface JobDef {
  id: string;
  title: string;
  category: JobCategory;
  description: string;
  reward: number;
  bonusPerLevel: number;
  xpReward: number;
  durationMs: number;
  cooldownMs: number;
  levelRequired: JobLevel;
  skillRequired?: { skill: SkillType; level: number };
  licenseRequired?: GigLicenseId;
  steps: JobStep[];
  location: string;
  locationCoords: [number, number, number];
  isIllegal: boolean;
  wantedOnCatch?: number;
  factionId?: string;
  factionBonus?: number;
}

export interface ActiveGig {
  id: string;
  title: string;
  category: JobCategory;
  reward: number;
  progress: number;
  stepProgress: number;
  currentStep: number;
  steps: JobStep[];
  startedAt: number;
  durationMs: number;
  location: string;
  isIllegal: boolean;
  bonusMultiplier: number;
  failed: boolean;
  stepElapsed: number;
<<<<<<< HEAD

  // 🆕 v2
  playerId?: string;
  cancelled?: boolean;
  witnesses?: string[];
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

export interface PlayerSkills {
  conduite: number;
  force: number;
  endurance: number;
  charisme: number;
  technique: number;
  discretion: number;
  medecine: number;
  cuisine: number;
}

export interface GigHistory {
  jobId: string;
  title: string;
  reward: number;
  completedAt: number;
  success: boolean;
  duration: number;
}

export interface FactionMembership {
  factionId: string;
  name: string;
  rank: number;
  joinedAt: number;
  contribution: number;
}

<<<<<<< HEAD
/** 🆕 v2 — Statistiques agrégées du joueur */
export interface CareerStats {
  totalEarned: number;
  totalXpEarned: number;
  totalGigsAttempted: number;
  totalGigsSucceeded: number;
  totalGigsFailed: number;
  totalGigsCancelled: number;
  totalPlaytimeMs: number;
  avgGigDurationMs: number;
  currentStreak: number;
  bestStreak: number;
  earningsByCategory: Record<JobCategory, number>;
  favoriteCategory: JobCategory | null;
}

/** 🆕 v2 — Réputation par catégorie (bonus/malus de reward) */
export type ReputationByCategory = Record<JobCategory, number>;

=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
export interface CareerState {
  level: number;
  xp: number;
  xpToNextLevel: number;
  skills: PlayerSkills;
  licenses: GigLicenseId[];
  faction: FactionMembership | null;
  jobsCompleted: number;
  jobsFailed: number;
  gigCooldowns: Record<string, number>;
  jobHistory: GigHistory[];
<<<<<<< HEAD

  // 🆕 v2
  stats: CareerStats;
  reputation: ReputationByCategory;
  dailyEarnings: number;
  dailyResetAt: number;
  activeGig: ActiveGig | null;
}

// ─── 2. LABELS & MÉTADONNÉES D'INTERFACE ────────────────────────────────────

export const SKILL_LABEL: Record<SkillType, string> = {
  conduite: "Conduite", force: "Force", endurance: "Endurance",
  charisme: "Charisme", technique: "Technique", discretion: "Discrétion",
  medecine: "Médecine", cuisine: "Cuisine",
};

export const CATEGORY_LABEL: Record<JobCategory, string> = {
  transport: "Transport", commerce: "Commerce",
  securite: "Sécurité publique", sante: "Santé",
  construction: "Construction", restauration: "Restauration",
  illegal: "Activité illégale", gouvernement: "Gouvernement",
=======
}

export const SKILL_LABEL: Record<SkillType, string> = {
  conduite: "Conduite",
  force: "Force",
  endurance: "Endurance",
  charisme: "Charisme",
  technique: "Technique",
  discretion: "Discrétion",
  medecine: "Médecine",
  cuisine: "Cuisine",
};

export const CATEGORY_LABEL: Record<JobCategory, string> = {
  transport: "Transport",
  commerce: "Commerce",
  securite: "Sécurité",
  sante: "Santé",
  construction: "Construction",
  restauration: "Restauration",
  illegal: "Illégal",
  gouvernement: "Gouvernement",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  media: "Média",
};

export const GIG_LICENSE_LABEL: Record<GigLicenseId, string> = {
  permis_c: "Permis classe C",
<<<<<<< HEAD
  diplome_sante: "Diplôme santé (OIIQ)",
  badge_police: "Badge Sûreté du Québec",
=======
  diplome_sante: "Diplôme santé",
  badge_police: "Badge SQ",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
};

const GIG_LICENSE_IDS: GigLicenseId[] = ["permis_c", "diplome_sante", "badge_police"];

<<<<<<< HEAD
const ALL_CATEGORIES: JobCategory[] = [
  "transport", "commerce", "securite", "sante",
  "construction", "restauration", "illegal",
  "gouvernement", "media",
];

// 🆕 v2 — Config
export interface GigsConfig {
  dailyEarningsCap: number;       // $ max par jour
  dailyXpCap: number;             // XP max par jour
  maxJobHistory: number;          // max entries gardées
  maxActiveGigDurationMs: number; // timeout gig (sécurité)
  enableSkillSynergy: boolean;    // bonus passifs
  witnessRadius: number;          // mètres
  reputationDecayPerDay: number;  // réputation -x/jour
}

const DEFAULT_CONFIG: GigsConfig = {
  dailyEarningsCap: 5000,
  dailyXpCap: 800,
  maxJobHistory: 40,
  maxActiveGigDurationMs: 10 * 60 * 1000,
  enableSkillSynergy: true,
  witnessRadius: 25,
  reputationDecayPerDay: 5,
};

// ─── 3. RÉFÉRENTIEL DE LOCALISATIONS (SAFE) ─────────────────────────────────

function village(id: string): [number, number, number] {
  const v = (VILLAGES as any[]).find((t) => t.id === id);
  if (!v) return [0, 0, 0];
  // Support : { center: [x, z] } ou { x, z } ou { pos: [x, y, z] }
  if (Array.isArray(v.center)) return [v.center[0] ?? 0, 0, v.center[1] ?? 0];
  if (typeof v.x === "number") return [v.x, 0, v.z ?? 0];
  return [0, 0, 0];
}

/** 🆕 v2 — Safe array access (pas de crash si index absent) */
function safeExit(index: number, fallbackX = 0): { x: number } {
  const exit = (A40_EXITS as any[])[index];
  return { x: exit?.x ?? fallbackX };
=======
function village(id: string): [number, number, number] {
  const v = VILLAGES.find((t) => t.id === id);
  return v ? [v.center[0], 0, v.center[1]] : [0, 0, 0];
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

const LOC = {
  portneuf: village("portneuf"),
  donnacona: village("donnacona"),
  pont: village("pont_rouge"),
  raymond: village("saint_raymond"),
  alban: village("saint_alban"),
  casimir: village("saint_casimir"),
  cap: village("cap_sante"),
  desch: village("deschambault"),
  marc: village("saint_marc"),
<<<<<<< HEAD
  mill: [(PAPETERIE as any)?.x ?? 0, 0, (PAPETERIE as any)?.z ?? 0] as [number, number, number],
  sq: [(SQ_JAIL as any)?.x ?? 0, 0, (SQ_JAIL as any)?.z ?? 0] as [number, number, number],
  a40: [safeExit(3, -200).x, 0, A40_Z] as [number, number, number],
  quai: [safeExit(3, -200).x, 0, 74] as [number, number, number],
};

// ─── 4. CATALOGUE COMPLET DES QUARTS DE TRAVAIL ─────────────────────────────
// (INCHANGÉ — tous les jobs v1 conservés à l'identique)
export const JOB_CATALOG: Record<string, JobDef> = {
  taxi: {
    id: "taxi", title: "Chauffeur de taxi", category: "transport",
=======
  mill: [PAPETERIE.x, 0, PAPETERIE.z] as [number, number, number],
  sq: [SQ_JAIL.x, 0, SQ_JAIL.z] as [number, number, number],
  a40: [A40_EXITS[3]!.x, 0, A40_Z] as [number, number, number],
  quai: [A40_EXITS[3]!.x, 0, 74] as [number, number, number],
};

export const JOB_CATALOG: Record<string, JobDef> = {
  taxi: {
    id: "taxi", title: "Chauffeur taxi", category: "transport",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    description: "Courses villageoises sur la 138 et les rangs.",
    reward: 180, bonusPerLevel: 30, xpReward: 15,
    durationMs: 12000, cooldownMs: 20000, levelRequired: 1,
    location: "Portneuf", locationCoords: LOC.portneuf, isIllegal: false,
    steps: [
      { id: "pickup", description: "Récupérer le client", duration: 3000 },
      { id: "drive", description: "Conduire à destination", duration: 6000, skillCheck: { skill: "conduite", difficulty: 20 } },
      { id: "payment", description: "Encaisser le paiement", duration: 3000 },
    ],
  },
  livreur: {
    id: "livreur", title: "Livreur express", category: "transport",
    description: "Colis urgents à travers le comté.",
    reward: 220, bonusPerLevel: 35, xpReward: 20,
    durationMs: 15000, cooldownMs: 25000, levelRequired: 1,
    location: "Papeterie Donnacona", locationCoords: LOC.mill, isIllegal: false,
    steps: [
      { id: "collect", description: "Récupérer les colis", duration: 2000 },
      { id: "route1", description: "Livraison secteur A", duration: 5000, skillCheck: { skill: "conduite", difficulty: 15 } },
      { id: "route2", description: "Livraison secteur B", duration: 5000 },
      { id: "confirm", description: "Confirmation livraisons", duration: 3000 },
    ],
  },
  camionneur: {
<<<<<<< HEAD
    id: "camionneur", title: "Camionneur poids lourd", category: "transport",
    description: "Fret lourd sur la Route 138 et l'Autoroute 40.",
=======
    id: "camionneur", title: "Camionneur", category: "transport",
    description: "Fret lourd sur la Route 138 et l'A-40.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 450, bonusPerLevel: 60, xpReward: 40,
    durationMs: 30000, cooldownMs: 60000, levelRequired: 2,
    skillRequired: { skill: "conduite", level: 25 },
    licenseRequired: "permis_c",
    location: "Sortie 261", locationCoords: LOC.a40, isIllegal: false,
    steps: [
      { id: "chargement", description: "Charger la marchandise", duration: 5000 },
      { id: "route", description: "Conduire Route 138", duration: 18000, skillCheck: { skill: "conduite", difficulty: 35 } },
      { id: "livraison", description: "Décharger à destination", duration: 5000 },
      { id: "rapport", description: "Rapport de livraison", duration: 2000 },
    ],
  },
  ambulancier: {
<<<<<<< HEAD
    id: "ambulancier", title: "Ambulancier paramédic", category: "sante",
    description: "Urgences médicales du comté de Portneuf.",
=======
    id: "ambulancier", title: "Ambulancier", category: "sante",
    description: "Urgences médicales du comté.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 520, bonusPerLevel: 80, xpReward: 55,
    durationMs: 20000, cooldownMs: 30000, levelRequired: 2,
    skillRequired: { skill: "medecine", level: 30 },
    licenseRequired: "diplome_sante",
    location: "Portneuf", locationCoords: LOC.portneuf, isIllegal: false,
    factionId: "sante_publique", factionBonus: 20,
    steps: [
<<<<<<< HEAD
      { id: "alerte", description: "Répondre à l'appel 911", duration: 2000 },
      { id: "transport", description: "Se rendre sur les lieux", duration: 5000, skillCheck: { skill: "conduite", difficulty: 40 } },
      { id: "soin", description: "Prodiguer les premiers soins", duration: 8000, skillCheck: { skill: "medecine", difficulty: 45 } },
      { id: "hopital", description: "Transport à l'hôpital de Donnacona", duration: 5000 },
    ],
  },
  caissier_dep: {
    id: "caissier_dep", title: "Caissier de dépanneur", category: "commerce",
=======
      { id: "alerte", description: "Répondre à l'appel", duration: 2000 },
      { id: "transport", description: "Se rendre sur les lieux", duration: 5000, skillCheck: { skill: "conduite", difficulty: 40 } },
      { id: "soin", description: "Premiers soins", duration: 8000, skillCheck: { skill: "medecine", difficulty: 45 } },
      { id: "hopital", description: "Transport à l'hôpital", duration: 5000 },
    ],
  },
  caissier_dep: {
    id: "caissier_dep", title: "Caissier dépanneur", category: "commerce",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    description: "Service au comptoir, TPS et TVQ.",
    reward: 120, bonusPerLevel: 15, xpReward: 10,
    durationMs: 8000, cooldownMs: 15000, levelRequired: 1,
    location: "Saint-Alban", locationCoords: LOC.alban, isIllegal: false,
    steps: [
<<<<<<< HEAD
      { id: "ouverture", description: "Ouvrir la caisse enregistreuse", duration: 1000 },
      { id: "service", description: "Servir les clients", duration: 5000, skillCheck: { skill: "charisme", difficulty: 10 } },
      { id: "fermeture", description: "Balancer et fermer la caisse", duration: 2000 },
    ],
  },
  cuisinier: {
    id: "cuisinier", title: "Cuisinier de casse-croûte", category: "restauration",
    description: "Plats du casse-croûte de la Route 138.",
=======
      { id: "ouverture", description: "Ouvrir la caisse", duration: 1000 },
      { id: "service", description: "Servir les clients", duration: 5000, skillCheck: { skill: "charisme", difficulty: 10 } },
      { id: "fermeture", description: "Fermer la caisse", duration: 2000 },
    ],
  },
  cuisinier: {
    id: "cuisinier", title: "Cuisinier", category: "restauration",
    description: "Plats du casse-croûte Route 138.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 280, bonusPerLevel: 40, xpReward: 25,
    durationMs: 14000, cooldownMs: 20000, levelRequired: 1,
    skillRequired: { skill: "cuisine", level: 10 },
    location: "Cap-Santé", locationCoords: LOC.cap, isIllegal: false,
    steps: [
      { id: "prep", description: "Préparer les ingrédients", duration: 3000 },
      { id: "cuisson", description: "Cuisson des plats", duration: 6000, skillCheck: { skill: "cuisine", difficulty: 30 } },
      { id: "dressage", description: "Dresser les assiettes", duration: 3000, skillCheck: { skill: "cuisine", difficulty: 20 } },
      { id: "service", description: "Envoyer en salle", duration: 2000 },
    ],
  },
  hotelier: {
<<<<<<< HEAD
    id: "hotelier", title: "Réceptionniste d'hôtel", category: "commerce",
=======
    id: "hotelier", title: "Réceptionniste hôtel", category: "commerce",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    description: "Accueil à l'Hôtel Pont-Rouge.",
    reward: 200, bonusPerLevel: 25, xpReward: 18,
    durationMs: 10000, cooldownMs: 18000, levelRequired: 1,
    skillRequired: { skill: "charisme", level: 15 },
    location: "Pont-Rouge", locationCoords: LOC.pont, isIllegal: false,
    steps: [
      { id: "accueil", description: "Accueillir le client", duration: 2000, skillCheck: { skill: "charisme", difficulty: 15 } },
      { id: "checkin", description: "Procéder au check-in", duration: 4000 },
<<<<<<< HEAD
      { id: "cle", description: "Remettre la clé de chambre", duration: 2000 },
      { id: "info", description: "Informer des services de l'hôtel", duration: 2000 },
=======
      { id: "cle", description: "Remettre la clé", duration: 2000 },
      { id: "info", description: "Informer des services", duration: 2000 },
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    ],
  },
  femme_chambre: {
    id: "femme_chambre", title: "Préposé aux chambres", category: "commerce",
<<<<<<< HEAD
    description: "Étages de l'hôtel, linge et chariots de nettoyage.",
=======
    description: "Étages de l'hôtel, linge et chariots.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 160, bonusPerLevel: 20, xpReward: 12,
    durationMs: 12000, cooldownMs: 20000, levelRequired: 1,
    location: "Pont-Rouge", locationCoords: LOC.pont, isIllegal: false,
    steps: [
<<<<<<< HEAD
      { id: "chariot", description: "Préparer le chariot de nettoyage", duration: 2000 },
      { id: "nettoyage", description: "Nettoyer les chambres", duration: 6000 },
      { id: "linge", description: "Changer le linge de lit", duration: 3000 },
      { id: "rapport", description: "Signaler les anomalies au front desk", duration: 1000 },
    ],
  },
  agent_securite: {
    id: "agent_securite", title: "Agent de sécurité privé", category: "securite",
=======
      { id: "chariot", description: "Préparer le chariot", duration: 2000 },
      { id: "nettoyage", description: "Nettoyer les chambres", duration: 6000 },
      { id: "linge", description: "Changer le linge", duration: 3000 },
      { id: "rapport", description: "Signaler les anomalies", duration: 1000 },
    ],
  },
  agent_securite: {
    id: "agent_securite", title: "Agent de sécurité", category: "securite",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    description: "Rondes sur les lots commerciaux.",
    reward: 310, bonusPerLevel: 45, xpReward: 28,
    durationMs: 16000, cooldownMs: 30000, levelRequired: 2,
    skillRequired: { skill: "force", level: 20 },
    location: "Donnacona", locationCoords: LOC.donnacona, isIllegal: false,
    steps: [
      { id: "briefing", description: "Briefing de début de quart", duration: 2000 },
<<<<<<< HEAD
      { id: "ronde_1", description: "Première ronde de surveillance", duration: 5000 },
=======
      { id: "ronde_1", description: "Première ronde", duration: 5000 },
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      { id: "incident", description: "Gérer un incident", duration: 5000, skillCheck: { skill: "force", difficulty: 30 }, canFail: true, failPenalty: 50 },
      { id: "rapport", description: "Rapport de fin de quart", duration: 4000 },
    ],
  },
  policier: {
<<<<<<< HEAD
    id: "policier", title: "Policier patrouilleur SQ", category: "securite",
    description: "Patrouille de la Sûreté du Québec, District Portneuf.",
=======
    id: "policier", title: "Policier SPVQ", category: "securite",
    description: "Patrouille Sûreté du Québec, Route 138.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 480, bonusPerLevel: 70, xpReward: 50,
    durationMs: 25000, cooldownMs: 45000, levelRequired: 3,
    skillRequired: { skill: "force", level: 40 },
    licenseRequired: "badge_police",
    location: "Poste SQ", locationCoords: LOC.sq, isIllegal: false,
    factionId: "spvq", factionBonus: 25,
    steps: [
      { id: "briefing", description: "Briefing au poste", duration: 3000 },
      { id: "patrouille", description: "Patrouille Route 138", duration: 10000, skillCheck: { skill: "conduite", difficulty: 25 } },
      { id: "arrestation", description: "Interpeller un suspect", duration: 7000, skillCheck: { skill: "force", difficulty: 45 }, canFail: true },
<<<<<<< HEAD
      { id: "rapport", description: "Rédiger le rapport de patrouille", duration: 5000, skillCheck: { skill: "technique", difficulty: 20 } },
    ],
  },
  ouvrier: {
    id: "ouvrier", title: "Ouvrier de construction", category: "construction",
    description: "Chantiers résidentiels le long de la 138.",
=======
      { id: "rapport", description: "Rédiger le rapport", duration: 5000, skillCheck: { skill: "technique", difficulty: 20 } },
    ],
  },
  ouvrier: {
    id: "ouvrier", title: "Ouvrier construction", category: "construction",
    description: "Chantiers le long de la 138.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 260, bonusPerLevel: 35, xpReward: 22,
    durationMs: 18000, cooldownMs: 35000, levelRequired: 1,
    skillRequired: { skill: "force", level: 15 },
    location: "Deschambault", locationCoords: LOC.desch, isIllegal: false,
    steps: [
<<<<<<< HEAD
      { id: "equip", description: "Enfiler l'équipement de sécurité", duration: 2000 },
=======
      { id: "equip", description: "Enfiler l'équipement", duration: 2000 },
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      { id: "material", description: "Décharger les matériaux", duration: 5000, skillCheck: { skill: "force", difficulty: 25 } },
      { id: "travail", description: "Travailler sur le chantier", duration: 8000, skillCheck: { skill: "endurance", difficulty: 30 } },
      { id: "nettoyage", description: "Nettoyer le chantier", duration: 3000 },
    ],
  },
  electricien: {
<<<<<<< HEAD
    id: "electricien", title: "Électricien Hydro", category: "construction",
    description: "Réparations Hydro-Québec et bâtiments résidentiels.",
=======
    id: "electricien", title: "Électricien", category: "construction",
    description: "Réparations Hydro et bâtiments.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 380, bonusPerLevel: 55, xpReward: 35,
    durationMs: 20000, cooldownMs: 40000, levelRequired: 2,
    skillRequired: { skill: "technique", level: 35 },
    location: "Saint-Marc", locationCoords: LOC.marc, isIllegal: false,
    steps: [
      { id: "diagnostic", description: "Diagnostic du problème", duration: 4000, skillCheck: { skill: "technique", difficulty: 30 } },
<<<<<<< HEAD
      { id: "materiel", description: "Récupérer le matériel dans la camionnette", duration: 3000 },
      { id: "reparation", description: "Effectuer la réparation électrique", duration: 10000, skillCheck: { skill: "technique", difficulty: 45 }, canFail: true, failPenalty: 100 },
=======
      { id: "materiel", description: "Récupérer le matériel", duration: 3000 },
      { id: "reparation", description: "Effectuer la réparation", duration: 10000, skillCheck: { skill: "technique", difficulty: 45 }, canFail: true, failPenalty: 100 },
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      { id: "test", description: "Tester l'installation", duration: 3000 },
    ],
  },
  fonctionnaire: {
    id: "fonctionnaire", title: "Fonctionnaire municipal", category: "gouvernement",
<<<<<<< HEAD
    description: "Traitement de dossiers à l'hôtel de ville.",
=======
    description: "Dossiers à l'hôtel de ville.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 290, bonusPerLevel: 40, xpReward: 24,
    durationMs: 12000, cooldownMs: 25000, levelRequired: 2,
    skillRequired: { skill: "technique", level: 20 },
    location: "Hôtel de ville", locationCoords: LOC.portneuf, isIllegal: false,
    factionId: "municipalite", factionBonus: 15,
    steps: [
      { id: "tri", description: "Trier les dossiers", duration: 3000 },
<<<<<<< HEAD
      { id: "traitement", description: "Traiter les demandes citoyennes", duration: 6000, skillCheck: { skill: "technique", difficulty: 25 } },
=======
      { id: "traitement", description: "Traiter les demandes", duration: 6000, skillCheck: { skill: "technique", difficulty: 25 } },
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      { id: "signature", description: "Signer et archiver", duration: 3000 },
    ],
  },
  journaliste: {
<<<<<<< HEAD
    id: "journaliste", title: "Journaliste local", category: "media",
=======
    id: "journaliste", title: "Journaliste", category: "media",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    description: "Couverture locale, rangs et villages.",
    reward: 340, bonusPerLevel: 50, xpReward: 30,
    durationMs: 18000, cooldownMs: 35000, levelRequired: 2,
    skillRequired: { skill: "charisme", level: 30 },
    location: "Pont-Rouge", locationCoords: LOC.pont, isIllegal: false,
    steps: [
<<<<<<< HEAD
      { id: "sujet", description: "Trouver un sujet d'article", duration: 3000, skillCheck: { skill: "charisme", difficulty: 20 } },
      { id: "terrain", description: "Reportage sur le terrain", duration: 8000, skillCheck: { skill: "discretion", difficulty: 25 } },
      { id: "redaction", description: "Rédiger l'article", duration: 5000, skillCheck: { skill: "technique", difficulty: 30 } },
      { id: "publication", description: "Publier l'article en ligne", duration: 2000 },
    ],
  },
  contrebandier: {
    id: "contrebandier", title: "Contrebandier maritime", category: "illegal",
    description: "Marchandises interdites au quai de la marina.",
=======
      { id: "sujet", description: "Trouver un sujet", duration: 3000, skillCheck: { skill: "charisme", difficulty: 20 } },
      { id: "terrain", description: "Reportage sur le terrain", duration: 8000, skillCheck: { skill: "discretion", difficulty: 25 } },
      { id: "redaction", description: "Rédiger l'article", duration: 5000, skillCheck: { skill: "technique", difficulty: 30 } },
      { id: "publication", description: "Publier l'article", duration: 2000 },
    ],
  },
  contrebandier: {
    id: "contrebandier", title: "Contrebandier", category: "illegal",
    description: "Marchandises interdites au quai.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 800, bonusPerLevel: 120, xpReward: 60,
    durationMs: 25000, cooldownMs: 90000, levelRequired: 3,
    skillRequired: { skill: "discretion", level: 40 },
    location: "Marina Portneuf", locationCoords: LOC.quai, isIllegal: true, wantedOnCatch: 3,
    steps: [
      { id: "contact", description: "Contacter le fournisseur", duration: 3000, skillCheck: { skill: "charisme", difficulty: 35 } },
      { id: "chargement", description: "Charger la marchandise", duration: 5000, skillCheck: { skill: "discretion", difficulty: 40 } },
      { id: "transport", description: "Transport risqué", duration: 12000, skillCheck: { skill: "conduite", difficulty: 50 }, canFail: true, failPenalty: 300 },
      { id: "livraison", description: "Livrer discrètement", duration: 5000, skillCheck: { skill: "discretion", difficulty: 45 } },
    ],
  },
  pickpocket: {
    id: "pickpocket", title: "Pickpocket", category: "illegal",
<<<<<<< HEAD
    description: "Fouilles de poches au marché du terroir.",
=======
    description: "Fouilles de poches au marché.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 150, bonusPerLevel: 30, xpReward: 20,
    durationMs: 8000, cooldownMs: 30000, levelRequired: 2,
    skillRequired: { skill: "discretion", level: 25 },
    location: "Saint-Raymond", locationCoords: LOC.raymond, isIllegal: true, wantedOnCatch: 1,
    steps: [
      { id: "cible", description: "Identifier une cible", duration: 2000, skillCheck: { skill: "discretion", difficulty: 30 } },
      { id: "approche", description: "S'approcher naturellement", duration: 3000, skillCheck: { skill: "charisme", difficulty: 25 } },
      { id: "vol", description: "Effectuer le vol", duration: 3000, skillCheck: { skill: "discretion", difficulty: 50 }, canFail: true, failPenalty: 200 },
    ],
  },
  hacker: {
<<<<<<< HEAD
    id: "hacker", title: "Hacker éthique", category: "illegal",
=======
    id: "hacker", title: "Hacker", category: "illegal",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    description: "Intrusion dans les systèmes du comté.",
    reward: 1200, bonusPerLevel: 180, xpReward: 80,
    durationMs: 35000, cooldownMs: 120000, levelRequired: 4,
    skillRequired: { skill: "technique", level: 60 },
    location: "Saint-Casimir", locationCoords: LOC.casimir, isIllegal: true, wantedOnCatch: 4,
    steps: [
      { id: "setup", description: "Configurer le matériel", duration: 5000, skillCheck: { skill: "technique", difficulty: 40 } },
      { id: "intrusion", description: "Pénétrer le système", duration: 10000, skillCheck: { skill: "technique", difficulty: 65 }, canFail: true },
<<<<<<< HEAD
      { id: "extraction", description: "Extraire les données sensibles", duration: 12000, skillCheck: { skill: "technique", difficulty: 70 }, canFail: true },
      { id: "effacement", description: "Effacer les traces numériques", duration: 8000, skillCheck: { skill: "discretion", difficulty: 55 } },
    ],
  },
  braqueur: {
    id: "braqueur", title: "Braqueur de dépanneur", category: "illegal",
=======
      { id: "extraction", description: "Extraire les données", duration: 12000, skillCheck: { skill: "technique", difficulty: 70 }, canFail: true },
      { id: "effacement", description: "Effacer les traces", duration: 8000, skillCheck: { skill: "discretion", difficulty: 55 } },
    ],
  },
  braqueur: {
    id: "braqueur", title: "Braqueur dépanneur", category: "illegal",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    description: "Caisse du village, après minuit.",
    reward: 600, bonusPerLevel: 100, xpReward: 50,
    durationMs: 20000, cooldownMs: 180000, levelRequired: 3,
    skillRequired: { skill: "force", level: 45 },
    location: "Saint-Alban", locationCoords: LOC.alban, isIllegal: true, wantedOnCatch: 5,
    steps: [
      { id: "reconnaissance", description: "Reconnaître les lieux", duration: 4000, skillCheck: { skill: "discretion", difficulty: 35 } },
<<<<<<< HEAD
      { id: "entree", description: "Forcer l'entrée arrière", duration: 3000, skillCheck: { skill: "force", difficulty: 40 } },
      { id: "caisse", description: "Vider la caisse enregistreuse", duration: 8000, skillCheck: { skill: "force", difficulty: 30 } },
=======
      { id: "entree", description: "Forcer l'entrée", duration: 3000, skillCheck: { skill: "force", difficulty: 40 } },
      { id: "caisse", description: "Vider la caisse", duration: 8000, skillCheck: { skill: "force", difficulty: 30 } },
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      { id: "fuite", description: "Prendre la fuite", duration: 5000, skillCheck: { skill: "conduite", difficulty: 55 }, canFail: true },
    ],
  },
  dealer: {
<<<<<<< HEAD
    id: "dealer", title: "Dealer de rue", category: "illegal",
    description: "Transactions dans les ruelles sombres.",
=======
    id: "dealer", title: "Dealer", category: "illegal",
    description: "Transactions dans les ruelles.",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    reward: 400, bonusPerLevel: 70, xpReward: 35,
    durationMs: 15000, cooldownMs: 60000, levelRequired: 2,
    skillRequired: { skill: "charisme", level: 30 },
    location: "Saint-Alban", locationCoords: LOC.alban, isIllegal: true, wantedOnCatch: 3,
    steps: [
      { id: "stock", description: "Préparer le stock", duration: 2000 },
      { id: "client", description: "Trouver un acheteur", duration: 5000, skillCheck: { skill: "charisme", difficulty: 40 } },
      { id: "transaction", description: "Effectuer la transaction", duration: 5000, skillCheck: { skill: "discretion", difficulty: 45 }, canFail: true, failPenalty: 150 },
      { id: "disparaitre", description: "Disparaître rapidement", duration: 3000, skillCheck: { skill: "discretion", difficulty: 30 } },
    ],
  },
};

<<<<<<< HEAD
// ─── 5. VALEURS DE BASE ET UTILITAIRES D'INITIALISATION ─────────────────────

=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
export const DEFAULT_SKILLS: PlayerSkills = {
  conduite: 10, force: 10, endurance: 10, charisme: 10,
  technique: 10, discretion: 10, medecine: 10, cuisine: 10,
};

export function calcXpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, Math.max(1, level) - 1));
}

<<<<<<< HEAD
/** 🆕 v2 — Stats vides */
function emptyStats(): CareerStats {
  const byCat = {} as Record<JobCategory, number>;
  for (const c of ALL_CATEGORIES) byCat[c] = 0;
  return {
    totalEarned: 0, totalXpEarned: 0, totalGigsAttempted: 0,
    totalGigsSucceeded: 0, totalGigsFailed: 0, totalGigsCancelled: 0,
    totalPlaytimeMs: 0, avgGigDurationMs: 0,
    currentStreak: 0, bestStreak: 0,
    earningsByCategory: byCat, favoriteCategory: null,
  };
}

/** 🆕 v2 — Réputation zéro */
function emptyReputation(): ReputationByCategory {
  const rep = {} as ReputationByCategory;
  for (const c of ALL_CATEGORIES) rep[c] = 0;
  return rep;
}

export function emptyCareer(): CareerState {
  return {
    level: 1, xp: 0, xpToNextLevel: calcXpToNextLevel(1),
    skills: { ...DEFAULT_SKILLS }, licenses: [], faction: null,
    jobsCompleted: 0, jobsFailed: 0,
    gigCooldowns: {}, jobHistory: [],
    stats: emptyStats(), reputation: emptyReputation(),
    dailyEarnings: 0, dailyResetAt: Date.now(),
    activeGig: null,
  };
}

/** 🆕 v2 — Reset daily si minuit passé */
function refreshDailyIfNeeded(career: CareerState, now = Date.now()): CareerState {
  const oneDayMs = 24 * 3600 * 1000;
  if (now - career.dailyResetAt < oneDayMs) return career;

  return {
    ...career,
    dailyEarnings: 0,
    dailyResetAt: now,
    reputation: applyReputationDecay(career.reputation, DEFAULT_CONFIG.reputationDecayPerDay),
  };
}

/** 🆕 v2 — Décroissance réputation */
function applyReputationDecay(rep: ReputationByCategory, amount: number): ReputationByCategory {
  const out = { ...rep };
  for (const c of ALL_CATEGORIES) {
    out[c] = Math.max(0, out[c] - amount);
  }
  return out;
}

// ─── 6. PARSING / VALIDATION STRICTE ────────────────────────────────────────

function parseFaction(raw: unknown): FactionMembership | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Partial<FactionMembership>;
  if (typeof f.factionId !== "string" || typeof f.name !== "string") return null;
  return {
    factionId: f.factionId,
    name: f.name,
    rank: typeof f.rank === "number" ? Math.max(0, Math.min(5, Math.floor(f.rank))) : 0,
    joinedAt: typeof f.joinedAt === "number" ? f.joinedAt : Date.now(),
    contribution: typeof f.contribution === "number" ? Math.max(0, f.contribution) : 0,
  };
}

/** 🆕 v2 — Validation stricte d'une entrée history */
function parseHistoryEntry(raw: unknown): GigHistory | null {
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Partial<GigHistory>;
  if (typeof h.jobId !== "string") return null;
  if (typeof h.title !== "string") return null;
  return {
    jobId: h.jobId,
    title: h.title,
    reward: typeof h.reward === "number" && Number.isFinite(h.reward) ? Math.max(0, h.reward) : 0,
    completedAt: typeof h.completedAt === "number" ? h.completedAt : Date.now(),
    success: h.success === true,
    duration: typeof h.duration === "number" && Number.isFinite(h.duration) ? Math.max(0, h.duration) : 0,
  };
}

/** 🆕 v2 — Validation des cooldowns */
function parseCooldowns(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  const now = Date.now();
  const oneYear = 365 * 24 * 3600 * 1000;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (v < 0 || v > now + oneYear) continue;
    out[k] = Math.floor(v);
  }
  return out;
}

/** 🆕 v2 — Validation des stats */
function parseStats(raw: unknown): CareerStats {
  const base = emptyStats();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<CareerStats>;
  const num = (n: unknown, fallback = 0) =>
    typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : fallback;

  const byCat = { ...base.earningsByCategory };
  if (s.earningsByCategory && typeof s.earningsByCategory === "object") {
    for (const c of ALL_CATEGORIES) {
      byCat[c] = num((s.earningsByCategory as any)[c], 0);
    }
  }

  return {
    totalEarned: num(s.totalEarned),
    totalXpEarned: num(s.totalXpEarned),
    totalGigsAttempted: Math.floor(num(s.totalGigsAttempted)),
    totalGigsSucceeded: Math.floor(num(s.totalGigsSucceeded)),
    totalGigsFailed: Math.floor(num(s.totalGigsFailed)),
    totalGigsCancelled: Math.floor(num(s.totalGigsCancelled)),
    totalPlaytimeMs: num(s.totalPlaytimeMs),
    avgGigDurationMs: num(s.avgGigDurationMs),
    currentStreak: Math.floor(num(s.currentStreak)),
    bestStreak: Math.floor(num(s.bestStreak)),
    earningsByCategory: byCat,
    favoriteCategory:
      s.favoriteCategory && ALL_CATEGORIES.includes(s.favoriteCategory)
        ? s.favoriteCategory
        : null,
  };
}

/** 🆕 v2 — Validation réputation */
function parseReputation(raw: unknown): ReputationByCategory {
  const base = emptyReputation();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ReputationByCategory>;
  for (const c of ALL_CATEGORIES) {
    const v = r[c];
    if (typeof v === "number" && Number.isFinite(v)) {
      base[c] = Math.max(0, Math.min(100, v));
    }
  }
  return base;
}

=======
export function emptyCareer(): CareerState {
  return {
    level: 1,
    xp: 0,
    xpToNextLevel: calcXpToNextLevel(1),
    skills: { ...DEFAULT_SKILLS },
    licenses: [],
    faction: null,
    jobsCompleted: 0,
    jobsFailed: 0,
    gigCooldowns: {},
    jobHistory: [],
  };
}

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
export function parseCareer(raw: unknown): CareerState {
  const base = emptyCareer();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<CareerState>;
<<<<<<< HEAD

  // Skills
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  const skills = { ...DEFAULT_SKILLS };
  if (d.skills && typeof d.skills === "object") {
    for (const k of Object.keys(DEFAULT_SKILLS) as SkillType[]) {
      const n = (d.skills as PlayerSkills)[k];
<<<<<<< HEAD
      if (typeof n === "number" && Number.isFinite(n)) {
        skills[k] = Math.max(0, Math.min(100, Math.floor(n)));
      }
    }
  }

  // Licenses
  const licenses = Array.isArray(d.licenses)
    ? d.licenses.filter((id): id is GigLicenseId =>
        GIG_LICENSE_IDS.includes(id as GigLicenseId))
    : [];

  // Level (1-20)
  const level = typeof d.level === "number" && Number.isFinite(d.level)
    ? Math.max(1, Math.min(20, Math.floor(d.level)))
    : 1;

  // Job history (validation stricte)
  const jobHistory = Array.isArray(d.jobHistory)
    ? d.jobHistory
        .map(parseHistoryEntry)
        .filter((h): h is GigHistory => h !== null)
        .slice(0, DEFAULT_CONFIG.maxJobHistory)
    : [];

  return {
    level,
    xp: typeof d.xp === "number" && Number.isFinite(d.xp) ? Math.max(0, Math.floor(d.xp)) : 0,
    xpToNextLevel: calcXpToNextLevel(level),
    skills,
    licenses,
    faction: parseFaction(d.faction),
    jobsCompleted: typeof d.jobsCompleted === "number" ? Math.max(0, Math.floor(d.jobsCompleted)) : 0,
    jobsFailed: typeof d.jobsFailed === "number" ? Math.max(0, Math.floor(d.jobsFailed)) : 0,
    gigCooldowns: parseCooldowns(d.gigCooldowns),
    jobHistory,
    stats: parseStats(d.stats),
    reputation: parseReputation(d.reputation),
    dailyEarnings: typeof d.dailyEarnings === "number" && Number.isFinite(d.dailyEarnings)
      ? Math.max(0, d.dailyEarnings) : 0,
    dailyResetAt: typeof d.dailyResetAt === "number" ? d.dailyResetAt : Date.now(),
    activeGig: null, // Jamais persisté en clair (reconstruit séparément)
  };
}

// ─── 7. RECHERCHE DE QUARTS DE TRAVAIL ─────────────────────────────────────

=======
      if (typeof n === "number") skills[k] = Math.max(0, Math.min(100, n));
    }
  }
  const licenses = Array.isArray(d.licenses)
    ? d.licenses.filter((id): id is GigLicenseId => GIG_LICENSE_IDS.includes(id as GigLicenseId))
    : [];
  const level = typeof d.level === "number" ? Math.max(1, Math.min(20, Math.floor(d.level))) : 1;
  return {
    level,
    xp: typeof d.xp === "number" ? Math.max(0, d.xp) : 0,
    xpToNextLevel: calcXpToNextLevel(level),
    skills,
    licenses,
    faction: d.faction && typeof d.faction === "object" ? d.faction : null,
    jobsCompleted: typeof d.jobsCompleted === "number" ? d.jobsCompleted : 0,
    jobsFailed: typeof d.jobsFailed === "number" ? d.jobsFailed : 0,
    gigCooldowns: d.gigCooldowns && typeof d.gigCooldowns === "object" ? d.gigCooldowns : {},
    jobHistory: Array.isArray(d.jobHistory) ? d.jobHistory.slice(0, 40) : [],
  };
}

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
export function gigById(id: string): JobDef | undefined {
  return JOB_CATALOG[id];
}

export function allGigs(): JobDef[] {
  return Object.values(JOB_CATALOG);
}

export function gigsByCategory(cat: JobCategory): JobDef[] {
  return allGigs().filter((j) => j.category === cat);
}

<<<<<<< HEAD
export function nearGig(def: JobDef, x: number, z: number, radius = 48): boolean {
  const [lx, , lz] = def.locationCoords;
  const dx = x - lx;
  const dz = z - lz;
  return dx * dx + dz * dz < radius * radius;
=======
export function nearGig(def: JobDef, x: number, z: number, radius = 48) {
  const [lx, , lz] = def.locationCoords;
  return Math.hypot(x - lx, z - lz) < radius;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

export function nearestGig(x: number, z: number, max = 48): JobDef | null {
  let best: JobDef | null = null;
<<<<<<< HEAD
  let bestDSq = max * max;
  for (const job of allGigs()) {
    const [lx, , lz] = job.locationCoords;
    const dx = x - lx;
    const dz = z - lz;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDSq) {
      best = job;
      bestDSq = dSq;
=======
  let bestD = max;
  for (const job of allGigs()) {
    const [lx, , lz] = job.locationCoords;
    const d = Math.hypot(x - lx, z - lz);
    if (d < bestD) {
      best = job;
      bestD = d;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    }
  }
  return best;
}

<<<<<<< HEAD
/** 🆕 v2 — Top-N gigs accessibles depuis une position */
export function nearestGigs(x: number, z: number, n = 3, max = 200): JobDef[] {
  const scored: Array<{ def: JobDef; dSq: number }> = [];
  const maxSq = max * max;
  for (const job of allGigs()) {
    const [lx, , lz] = job.locationCoords;
    const dx = x - lx;
    const dz = z - lz;
    const dSq = dx * dx + dz * dz;
    if (dSq <= maxSq) scored.push({ def: job, dSq });
  }
  scored.sort((a, b) => a.dSq - b.dSq);
  return scored.slice(0, n).map((s) => s.def);
}

// ─── 8. VALIDATION D'ACCÈS ET COOLDOWNS ────────────────────────────────────

export function canStartGig(
  career: CareerState,
  jobId: string,
  active: ActiveGig | null,
): boolean {
  return getCannotStartReason(career, jobId, active) === null;
}

export function getJobCooldownSec(
  career: CareerState,
  jobId: string,
  now = Date.now(),
): number {
=======
export function canStartGig(career: CareerState, jobId: string, active: ActiveGig | null): boolean {
  return getCannotStartReason(career, jobId, active) === null;
}

export function getJobCooldownSec(career: CareerState, jobId: string, now = Date.now()): number {
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  const cd = career.gigCooldowns[jobId];
  if (!cd) return 0;
  return Math.max(0, Math.ceil((cd - now) / 1000));
}

<<<<<<< HEAD
export function getCannotStartReason(
  career: CareerState,
  jobId: string,
  active: ActiveGig | null,
  now = Date.now(),
): string | null {
  if (active && !active.cancelled) return "Un quart de travail est déjà en cours";

  // 🆕 v2 — Daily cap
  const refreshed = refreshDailyIfNeeded(career, now);
  if (refreshed.dailyEarnings >= DEFAULT_CONFIG.dailyEarningsCap) {
    return "Plafond quotidien atteint — revenez demain";
  }

  const cd = career.gigCooldowns[jobId];
  if (cd && now < cd) return `Disponible dans ${getJobCooldownSec(career, jobId, now)} s`;

  const def = JOB_CATALOG[jobId];
  if (!def) return "Quart introuvable";
  if (career.level < def.levelRequired) return `Niveau ${def.levelRequired} requis`;

  if (def.skillRequired && career.skills[def.skillRequired.skill] < def.skillRequired.level) {
    return `Compétence ${SKILL_LABEL[def.skillRequired.skill]} ${def.skillRequired.level} requise`;
=======
export function getCannotStartReason(career: CareerState, jobId: string, active: ActiveGig | null, now = Date.now()): string | null {
  if (active) return "Un quart est déjà en cours";
  const cd = career.gigCooldowns[jobId];
  if (cd && now < cd) return `Disponible dans ${getJobCooldownSec(career, jobId, now)} s`;
  const def = JOB_CATALOG[jobId];
  if (!def) return "Quart introuvable";
  if (career.level < def.levelRequired) return `Niveau ${def.levelRequired} requis`;
  if (def.skillRequired && career.skills[def.skillRequired.skill] < def.skillRequired.level) {
    return `${SKILL_LABEL[def.skillRequired.skill]} ${def.skillRequired.level} requis`;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  }
  if (def.licenseRequired && !career.licenses.includes(def.licenseRequired)) {
    return `${GIG_LICENSE_LABEL[def.licenseRequired]} requis`;
  }
  return null;
}

<<<<<<< HEAD
// ─── 9. CYCLE DE VIE D'UN QUART ACTIF ──────────────────────────────────────

/**
 * 🆕 v2 — Bonus de synergie léger entre skills.
 * Ex : conduite ≥ 50 booste force de +10% pour les skill checks de force.
 */
function synergyBonus(
  skills: PlayerSkills,
  targetSkill: SkillType,
): number {
  if (!DEFAULT_CONFIG.enableSkillSynergy) return 1;
  const SYNERGY: Partial<Record<SkillType, SkillType>> = {
    force: "endurance",
    endurance: "force",
    conduite: "technique",
    technique: "conduite",
    charisme: "discretion",
    discretion: "charisme",
    medecine: "technique",
    cuisine: "endurance",
  };
  const partner = SYNERGY[targetSkill];
  if (!partner) return 1;
  const partnerVal = skills[partner];
  if (partnerVal >= 50) return 1.1;
  if (partnerVal >= 75) return 1.2;
  return 1;
}

export function makeActiveGig(career: CareerState, def: JobDef): ActiveGig {
  let bonus = 1;
  if (career.faction?.factionId === def.factionId && def.factionBonus) {
    bonus += def.factionBonus / 100;
  }
  bonus += (career.level - 1) * 0.05;

  // 🆕 v2 — Réputation bonus
  const repBonus = (career.reputation?.[def.category] ?? 0) / 100;
  bonus += repBonus * 0.2;

  // 🆕 v2 — Streak bonus
  const streakBonus = Math.min(0.25, (career.stats?.currentStreak ?? 0) * 0.02);
  bonus += streakBonus;

  const skill = def.skillRequired?.skill ?? "endurance";
  const skillFactor = career.skills[skill] / 10;
  const finalReward = Math.round((def.reward + def.bonusPerLevel * skillFactor) * bonus);

=======
export function makeActiveGig(career: CareerState, def: JobDef): ActiveGig {
  let bonus = 1;
  if (career.faction?.factionId === def.factionId && def.factionBonus) bonus += def.factionBonus / 100;
  bonus += (career.level - 1) * 0.05;
  const skill = def.skillRequired?.skill ?? "endurance";
  const finalReward = Math.round((def.reward + def.bonusPerLevel * (career.skills[skill] / 10)) * bonus);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  return {
    id: def.id,
    title: def.title,
    category: def.category,
    reward: finalReward,
    progress: 0,
    stepProgress: 0,
    currentStep: 0,
    steps: def.steps,
    startedAt: Date.now(),
    durationMs: def.durationMs,
    location: def.location,
    isIllegal: def.isIllegal,
    bonusMultiplier: bonus,
    failed: false,
    stepElapsed: 0,
<<<<<<< HEAD
    cancelled: false,
    witnesses: [],
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  };
}

export type GigTickEvent =
  | { kind: "none"; gig: ActiveGig }
  | { kind: "step"; gig: ActiveGig; skill?: SkillType }
  | { kind: "done"; gig: ActiveGig }
  | { kind: "fail"; gig: ActiveGig; wanted?: number; penalty?: number };

<<<<<<< HEAD
/**
 * 🆕 v2 — Fait avancer un quart d'un tick. Support multi-step par tick.
 */
export function tickActiveGig(
  gig: ActiveGig,
  dt: number,
  skills: PlayerSkills,
): GigTickEvent {
  if (gig.cancelled || gig.failed) return { kind: "none", gig };

  const def = JOB_CATALOG[gig.id];
  if (!def) return { kind: "done", gig };

  const ms = Math.max(0, dt * 1000);
  let remainingMs = ms;
  let stepAdvanced = false;
  let lastSkill: SkillType | undefined;

  // 🆕 Boucle pour gérer plusieurs steps par tick (steps courts)
  while (remainingMs > 0 && gig.currentStep < def.steps.length) {
    const step = def.steps[gig.currentStep];
    if (!step) break;

    const stepRemaining = step.duration - gig.stepElapsed;
    const consumed = Math.min(remainingMs, stepRemaining);

    gig.stepElapsed += consumed;
    remainingMs -= consumed;
    gig.stepProgress = Math.min(1, gig.stepElapsed / Math.max(1, step.duration));

    // Step pas fini
    if (gig.stepElapsed < step.duration) break;

    // Step fini → skill check
    if (step.skillCheck) {
      const playerSkill = skills[step.skillCheck.skill];
      const synergy = synergyBonus(skills, step.skillCheck.skill);
      // 🆕 Formule plus prévisible
      const ratio = (playerSkill * synergy) / Math.max(1, step.skillCheck.difficulty);
      const chance = Math.min(95, Math.max(5, ratio * 80));
      const success = Math.random() * 100 <= chance;

      if (!success && step.canFail) {
        gig.failed = true;
        // 🆕 Ajoute un témoin si illégal
        if (def.isIllegal) {
          gig.witnesses = gig.witnesses ?? [];
          gig.witnesses.push(`witness_${Date.now()}`);
        }
        return {
          kind: "fail",
          gig,
          wanted: def.isIllegal ? def.wantedOnCatch : undefined,
          penalty: step.failPenalty,
        };
      }
      lastSkill = step.skillCheck.skill;
    }

    // Advance
    gig.currentStep += 1;
    gig.stepElapsed = 0;
    gig.stepProgress = 0;
    stepAdvanced = true;

    if (gig.currentStep >= def.steps.length) {
      gig.progress = 1;
      return { kind: "done", gig };
    }
  }

  // Recompute global progress
  const doneMs = gig.steps.slice(0, gig.currentStep).reduce((a, s) => a + s.duration, 0) + gig.stepElapsed;
  gig.progress = Math.min(1, doneMs / Math.max(1, def.durationMs));

  if (stepAdvanced) {
    return { kind: "step", gig, skill: lastSkill };
  }
  return { kind: "none", gig };
}

export function currentStep(gig: ActiveGig): JobStep | undefined {
  return gig.steps[gig.currentStep];
}

export function getGigProgress(gig: ActiveGig): {
  overallPct: number;
  stepPct: number;
  stepIndex: number;
  totalSteps: number;
  stepLabel: string;
} {
  const step = gig.steps[gig.currentStep];
  return {
    overallPct: Math.round(gig.progress * 100),
    stepPct: Math.round(gig.stepProgress * 100),
    stepIndex: gig.currentStep + 1,
    totalSteps: gig.steps.length,
    stepLabel: step?.description ?? "Terminé",
  };
}

/** 🆕 v2 — Annule un gig en cours */
export function cancelGig(gig: ActiveGig): ActiveGig {
  return { ...gig, cancelled: true, failed: false };
}

// ─── 10. FINALISATION & CONSÉQUENCES DU QUART ──────────────────────────────

export function finalizeGig(
  career: CareerState,
  gig: ActiveGig,
  success: boolean,
  now = Date.now(),
): CareerState {
  const def = JOB_CATALOG[gig.id];
  const cooldownEnd = now + (def?.cooldownMs ?? 30000);
  const skill = def?.skillRequired?.skill ?? "endurance";
  const xpGained = success ? (def?.xpReward ?? 10) : Math.floor((def?.xpReward ?? 10) * 0.2);

  // Skills
  const newSkills = success
    ? bumpSkill(career.skills, skill, 1)
    : career.skills;

  // History
  const historyEntry: GigHistory = {
    jobId: gig.id,
    title: gig.title,
    reward: success ? gig.reward : 0,
    completedAt: now,
    success,
    duration: now - gig.startedAt,
  };

  // Faction
  const updatedFaction =
    success && career.faction && def?.factionId === career.faction.factionId
      ? addContribution(career.faction, def.factionBonus ?? 10)
      : career.faction;

  // 🆕 v2 — Stats
  const stats = { ...career.stats };
  stats.totalGigsAttempted += 1;
  if (success) {
    stats.totalGigsSucceeded += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.totalEarned += gig.reward;
    stats.totalXpEarned += xpGained;
    stats.earningsByCategory[gig.category] =
      (stats.earningsByCategory[gig.category] ?? 0) + gig.reward;
    // Recalcul catégorie favorite
    let bestCat: JobCategory | null = null;
    let bestVal = 0;
    for (const c of ALL_CATEGORIES) {
      const v = stats.earningsByCategory[c];
      if (v > bestVal) { bestVal = v; bestCat = c; }
    }
    stats.favoriteCategory = bestCat;
  } else if (gig.cancelled) {
    stats.totalGigsCancelled += 1;
    stats.currentStreak = 0;
  } else {
    stats.totalGigsFailed += 1;
    stats.currentStreak = 0;
  }
  const totalDurationMs = stats.avgGigDurationMs * (stats.totalGigsAttempted - 1);
  const newDuration = now - gig.startedAt;
  stats.avgGigDurationMs = Math.round(
    (totalDurationMs + newDuration) / stats.totalGigsAttempted,
  );

  // 🆕 v2 — Réputation
  const rep = { ...career.reputation };
  if (success) {
    rep[gig.category] = Math.min(100, (rep[gig.category] ?? 0) + 3);
  } else if (!gig.cancelled) {
    rep[gig.category] = Math.max(0, (rep[gig.category] ?? 0) - 2);
  }

  // 🆕 v2 — Daily earnings
  const dailyEarnings = success ? career.dailyEarnings + gig.reward : career.dailyEarnings;

  const withXp = applyXp(
    {
      ...career,
      skills: newSkills,
      faction: updatedFaction,
      jobsCompleted: success ? career.jobsCompleted + 1 : career.jobsCompleted,
      jobsFailed: success ? career.jobsFailed : career.jobsFailed + 1,
      gigCooldowns: { ...career.gigCooldowns, [gig.id]: cooldownEnd },
      jobHistory: [historyEntry, ...career.jobHistory].slice(0, DEFAULT_CONFIG.maxJobHistory),
      stats,
      reputation: rep,
      dailyEarnings,
      activeGig: null,
    },
    xpGained,
  );

  return withXp.career;
}

// ─── 11. FONCTIONS UTILITAIRES DE MUTATION ────────────────────────────────

export function applyXp(
  career: CareerState,
  amount: number,
): { career: CareerState; leveled: boolean } {
  let xp = career.xp + Math.max(0, Math.floor(amount));
  let level = career.level;
  let next = career.xpToNextLevel;
  let leveled = false;
  let guard = 0;
  while (xp >= next && level < 20 && guard < 100) {
=======
export function tickActiveGig(gig: ActiveGig, dt: number, skills: PlayerSkills): GigTickEvent {
  const def = JOB_CATALOG[gig.id];
  if (!def) return { kind: "done", gig };
  const step = def.steps[gig.currentStep];
  if (!step) return { kind: "done", gig };
  const ms = dt * 1000;
  gig.stepElapsed += ms;
  gig.stepProgress = Math.min(1, gig.stepElapsed / step.duration);
  const done = gig.steps.slice(0, gig.currentStep).reduce((a, s) => a + s.duration, 0) + gig.stepElapsed;
  gig.progress = Math.min(1, done / Math.max(1, def.durationMs));
  if (gig.stepElapsed < step.duration) return { kind: "none", gig };

  if (step.skillCheck) {
    const playerSkill = skills[step.skillCheck.skill];
    const chance = Math.min(95, (playerSkill / step.skillCheck.difficulty) * 80);
    const success = Math.random() * 100 <= chance;
    if (!success && step.canFail) {
      gig.failed = true;
      return {
        kind: "fail",
        gig,
        wanted: def.isIllegal ? def.wantedOnCatch : undefined,
        penalty: step.failPenalty,
      };
    }
    gig.currentStep += 1;
    gig.stepElapsed = 0;
    gig.stepProgress = 0;
    if (gig.currentStep >= def.steps.length) return { kind: "done", gig };
    return { kind: "step", gig, skill: step.skillCheck.skill };
  }

  gig.currentStep += 1;
  gig.stepElapsed = 0;
  gig.stepProgress = 0;
  if (gig.currentStep >= def.steps.length) return { kind: "done", gig };
  return { kind: "step", gig };
}

export function applyXp(career: CareerState, amount: number): { career: CareerState; leveled: boolean } {
  let xp = career.xp + amount;
  let level = career.level;
  let next = career.xpToNextLevel;
  let leveled = false;
  while (xp >= next && level < 20) {
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    xp -= next;
    level += 1;
    next = calcXpToNextLevel(level);
    leveled = true;
<<<<<<< HEAD
    guard++;
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  }
  return { career: { ...career, xp, level, xpToNextLevel: next }, leveled };
}

<<<<<<< HEAD
/** 🆕 v2 — Garde contre NaN */
export function bumpSkill(
  skills: PlayerSkills,
  skill: SkillType,
  amount: number,
): PlayerSkills {
  if (!Number.isFinite(amount)) return skills;
  const current = skills[skill];
  if (!Number.isFinite(current)) return { ...skills, [skill]: Math.max(0, amount) };
  return { ...skills, [skill]: Math.max(0, Math.min(100, current + amount)) };
}

export function grantGigLicense(
  list: GigLicenseId[],
  id: GigLicenseId,
): GigLicenseId[] {
=======
export function bumpSkill(skills: PlayerSkills, skill: SkillType, amount: number): PlayerSkills {
  return { ...skills, [skill]: Math.min(100, skills[skill] + amount) };
}

export function grantGigLicense(list: GigLicenseId[], id: GigLicenseId): GigLicenseId[] {
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  return list.includes(id) ? list : [...list, id];
}

export function joinCareerFaction(id: string, name: string): FactionMembership {
  return { factionId: id, name, rank: 0, joinedAt: Date.now(), contribution: 0 };
}

<<<<<<< HEAD
export function addContribution(
  faction: FactionMembership,
  amount: number,
): FactionMembership {
  if (!Number.isFinite(amount)) return faction;
  const contribution = Math.max(0, faction.contribution + amount);
  const thresholds = [0, 100, 300, 600, 1000, 2000];
  const rank = Math.min(5, Math.max(0, thresholds.filter((t) => contribution >= t).length - 1));
  return { ...faction, contribution, rank };
}

// ─── 12. 🆕 v2 — API EXTENSIONS ────────────────────────────────────────────

/** 🆕 v2 — Enregistre une réussite dans la carrière (sans finalize complet) */
export function recordGigSuccess(
  career: CareerState,
  jobId: string,
  reward: number,
  now = Date.now(),
): CareerState {
  const def = JOB_CATALOG[jobId];
  if (!def) return career;

  const fakeGig: ActiveGig = {
    id: jobId, title: def.title, category: def.category,
    reward, progress: 1, stepProgress: 1, currentStep: def.steps.length,
    steps: def.steps, startedAt: now - def.durationMs,
    durationMs: def.durationMs, location: def.location,
    isIllegal: def.isIllegal, bonusMultiplier: 1, failed: false, stepElapsed: 0,
  };
  return finalizeGig(career, fakeGig, true, now);
}

/** 🆕 v2 — Health check */
export function healthCareer(career: CareerState): { ok: boolean; reason?: string } {
  if (career.level < 1 || career.level > 20) return { ok: false, reason: "invalid_level" };
  if (career.xp < 0) return { ok: false, reason: "negative_xp" };
  for (const k of Object.keys(career.skills) as SkillType[]) {
    const v = career.skills[k];
    if (v < 0 || v > 100) return { ok: false, reason: `skill_${k}_out_of_range` };
  }
  if (career.jobHistory.length > DEFAULT_CONFIG.maxJobHistory) {
    return { ok: false, reason: "history_overflow" };
  }
  return { ok: true };
}

/** 🆕 v2 — Config accessor */
export function getGigsConfig(): GigsConfig {
  return { ...DEFAULT_CONFIG };
}

export function updateGigsConfig(patch: Partial<GigsConfig>): void {
  Object.assign(DEFAULT_CONFIG, patch);
}

/** 🆕 v2 — Export stats pour dashboard */
export function summarizeCareer(career: CareerState) {
  const s = career.stats;
  return {
    level: career.level,
    xp: career.xp,
    xpToNextLevel: career.xpToNextLevel,
    totalEarned: s.totalEarned,
    gigsAttempted: s.totalGigsAttempted,
    successRate: s.totalGigsAttempted > 0
      ? Math.round((s.totalGigsSucceeded / s.totalGigsAttempted) * 100)
      : 0,
    currentStreak: s.currentStreak,
    bestStreak: s.bestStreak,
    favoriteCategory: s.favoriteCategory,
    reputation: career.reputation,
    topSkills: (Object.entries(career.skills) as [SkillType, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => ({ skill: k, value: v })),
  };
}
=======
export function addContribution(faction: FactionMembership, amount: number): FactionMembership {
  const contribution = faction.contribution + amount;
  const thresholds = [0, 100, 300, 600, 1000, 2000];
  const rank = Math.min(5, thresholds.filter((t) => contribution >= t).length - 1);
  return { ...faction, contribution, rank };
}

export function currentStep(gig: ActiveGig): JobStep | undefined {
  return gig.steps[gig.currentStep];
}
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
