/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 💼 CARRIÈRES, QUARTS DE TRAVAIL & COMPÉTENCES — CATALOGUE PORTNEUF
 * Fichier : /src/game/gigs.ts
 * Architecture : Zero-GC nearestGig, validation stricte de sauvegarde, tick fluide.
 * ═════════════════════════════════════════════════════════════════════════════
 */
import { A40_EXITS, A40_Z, PAPETERIE, SQ_JAIL, VILLAGES } from "./worlddata";

// ─── 1. TYPES ET INTERFACES ──────────────────────────────────────────────────

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

export type JobLevel = 1 | 2 | 3 | 4 | 5;

export type SkillType =
  | "conduite"
  | "force"
  | "endurance"
  | "charisme"
  | "technique"
  | "discretion"
  | "medecine"
  | "cuisine";

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
}

// ─── 2. LABELS & MÉTADONNÉES D'INTERFACE ────────────────────────────────────

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
  securite: "Sécurité publique",
  sante: "Santé",
  construction: "Construction",
  restauration: "Restauration",
  illegal: "Activité illégale",
  gouvernement: "Gouvernement",
  media: "Média",
};

export const GIG_LICENSE_LABEL: Record<GigLicenseId, string> = {
  permis_c: "Permis classe C",
  diplome_sante: "Diplôme santé (OIIQ)",
  badge_police: "Badge Sûreté du Québec",
};

const GIG_LICENSE_IDS: GigLicenseId[] = ["permis_c", "diplome_sante", "badge_police"];

// ─── 3. RÉFÉRENTIEL DE LOCALISATIONS ────────────────────────────────────────

function village(id: string): [number, number, number] {
  const v = VILLAGES.find((t) => t.id === id);
  return v ? [v.center[0], 0, v.center[1]] : [0, 0, 0];
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
  mill: [PAPETERIE.x, 0, PAPETERIE.z] as [number, number, number],
  sq: [SQ_JAIL.x, 0, SQ_JAIL.z] as [number, number, number],
  a40: [A40_EXITS[3]!.x, 0, A40_Z] as [number, number, number],
  quai: [A40_EXITS[3]!.x, 0, 74] as [number, number, number],
};

// ─── 4. CATALOGUE COMPLET DES QUARTS DE TRAVAIL ─────────────────────────────

export const JOB_CATALOG: Record<string, JobDef> = {
  taxi: {
    id: "taxi", title: "Chauffeur de taxi", category: "transport",
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
    id: "camionneur", title: "Camionneur poids lourd", category: "transport",
    description: "Fret lourd sur la Route 138 et l'Autoroute 40.",
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
    id: "ambulancier", title: "Ambulancier paramédic", category: "sante",
    description: "Urgences médicales du comté de Portneuf.",
    reward: 520, bonusPerLevel: 80, xpReward: 55,
    durationMs: 20000, cooldownMs: 30000, levelRequired: 2,
    skillRequired: { skill: "medecine", level: 30 },
    licenseRequired: "diplome_sante",
    location: "Portneuf", locationCoords: LOC.portneuf, isIllegal: false,
    factionId: "sante_publique", factionBonus: 20,
    steps: [
      { id: "alerte", description: "Répondre à l'appel 911", duration: 2000 },
      { id: "transport", description: "Se rendre sur les lieux", duration: 5000, skillCheck: { skill: "conduite", difficulty: 40 } },
      { id: "soin", description: "Prodiguer les premiers soins", duration: 8000, skillCheck: { skill: "medecine", difficulty: 45 } },
      { id: "hopital", description: "Transport à l'hôpital de Donnacona", duration: 5000 },
    ],
  },
  caissier_dep: {
    id: "caissier_dep", title: "Caissier de dépanneur", category: "commerce",
    description: "Service au comptoir, TPS et TVQ.",
    reward: 120, bonusPerLevel: 15, xpReward: 10,
    durationMs: 8000, cooldownMs: 15000, levelRequired: 1,
    location: "Saint-Alban", locationCoords: LOC.alban, isIllegal: false,
    steps: [
      { id: "ouverture", description: "Ouvrir la caisse enregistreuse", duration: 1000 },
      { id: "service", description: "Servir les clients", duration: 5000, skillCheck: { skill: "charisme", difficulty: 10 } },
      { id: "fermeture", description: "Balancer et fermer la caisse", duration: 2000 },
    ],
  },
  cuisinier: {
    id: "cuisinier", title: "Cuisinier de casse-croûte", category: "restauration",
    description: "Plats du casse-croûte de la Route 138.",
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
    id: "hotelier", title: "Réceptionniste d'hôtel", category: "commerce",
    description: "Accueil à l'Hôtel Pont-Rouge.",
    reward: 200, bonusPerLevel: 25, xpReward: 18,
    durationMs: 10000, cooldownMs: 18000, levelRequired: 1,
    skillRequired: { skill: "charisme", level: 15 },
    location: "Pont-Rouge", locationCoords: LOC.pont, isIllegal: false,
    steps: [
      { id: "accueil", description: "Accueillir le client", duration: 2000, skillCheck: { skill: "charisme", difficulty: 15 } },
      { id: "checkin", description: "Procéder au check-in", duration: 4000 },
      { id: "cle", description: "Remettre la clé de chambre", duration: 2000 },
      { id: "info", description: "Informer des services de l'hôtel", duration: 2000 },
    ],
  },
  femme_chambre: {
    id: "femme_chambre", title: "Préposé aux chambres", category: "commerce",
    description: "Étages de l'hôtel, linge et chariots de nettoyage.",
    reward: 160, bonusPerLevel: 20, xpReward: 12,
    durationMs: 12000, cooldownMs: 20000, levelRequired: 1,
    location: "Pont-Rouge", locationCoords: LOC.pont, isIllegal: false,
    steps: [
      { id: "chariot", description: "Préparer le chariot de nettoyage", duration: 2000 },
      { id: "nettoyage", description: "Nettoyer les chambres", duration: 6000 },
      { id: "linge", description: "Changer le linge de lit", duration: 3000 },
      { id: "rapport", description: "Signaler les anomalies au front desk", duration: 1000 },
    ],
  },
  agent_securite: {
    id: "agent_securite", title: "Agent de sécurité privé", category: "securite",
    description: "Rondes sur les lots commerciaux.",
    reward: 310, bonusPerLevel: 45, xpReward: 28,
    durationMs: 16000, cooldownMs: 30000, levelRequired: 2,
    skillRequired: { skill: "force", level: 20 },
    location: "Donnacona", locationCoords: LOC.donnacona, isIllegal: false,
    steps: [
      { id: "briefing", description: "Briefing de début de quart", duration: 2000 },
      { id: "ronde_1", description: "Première ronde de surveillance", duration: 5000 },
      { id: "incident", description: "Gérer un incident", duration: 5000, skillCheck: { skill: "force", difficulty: 30 }, canFail: true, failPenalty: 50 },
      { id: "rapport", description: "Rapport de fin de quart", duration: 4000 },
    ],
  },
  policier: {
    id: "policier", title: "Policier patrouilleur SQ", category: "securite",
    description: "Patrouille de la Sûreté du Québec, District Portneuf.",
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
      { id: "rapport", description: "Rédiger le rapport de patrouille", duration: 5000, skillCheck: { skill: "technique", difficulty: 20 } },
    ],
  },
  ouvrier: {
    id: "ouvrier", title: "Ouvrier de construction", category: "construction",
    description: "Chantiers résidentiels le long de la 138.",
    reward: 260, bonusPerLevel: 35, xpReward: 22,
    durationMs: 18000, cooldownMs: 35000, levelRequired: 1,
    skillRequired: { skill: "force", level: 15 },
    location: "Deschambault", locationCoords: LOC.desch, isIllegal: false,
    steps: [
      { id: "equip", description: "Enfiler l'équipement de sécurité", duration: 2000 },
      { id: "material", description: "Décharger les matériaux", duration: 5000, skillCheck: { skill: "force", difficulty: 25 } },
      { id: "travail", description: "Travailler sur le chantier", duration: 8000, skillCheck: { skill: "endurance", difficulty: 30 } },
      { id: "nettoyage", description: "Nettoyer le chantier", duration: 3000 },
    ],
  },
  electricien: {
    id: "electricien", title: "Électricien Hydro", category: "construction",
    description: "Réparations Hydro-Québec et bâtiments résidentiels.",
    reward: 380, bonusPerLevel: 55, xpReward: 35,
    durationMs: 20000, cooldownMs: 40000, levelRequired: 2,
    skillRequired: { skill: "technique", level: 35 },
    location: "Saint-Marc", locationCoords: LOC.marc, isIllegal: false,
    steps: [
      { id: "diagnostic", description: "Diagnostic du problème", duration: 4000, skillCheck: { skill: "technique", difficulty: 30 } },
      { id: "materiel", description: "Récupérer le matériel dans la camionnette", duration: 3000 },
      { id: "reparation", description: "Effectuer la réparation électrique", duration: 10000, skillCheck: { skill: "technique", difficulty: 45 }, canFail: true, failPenalty: 100 },
      { id: "test", description: "Tester l'installation", duration: 3000 },
    ],
  },
  fonctionnaire: {
    id: "fonctionnaire", title: "Fonctionnaire municipal", category: "gouvernement",
    description: "Traitement de dossiers à l'hôtel de ville.",
    reward: 290, bonusPerLevel: 40, xpReward: 24,
    durationMs: 12000, cooldownMs: 25000, levelRequired: 2,
    skillRequired: { skill: "technique", level: 20 },
    location: "Hôtel de ville", locationCoords: LOC.portneuf, isIllegal: false,
    factionId: "municipalite", factionBonus: 15,
    steps: [
      { id: "tri", description: "Trier les dossiers", duration: 3000 },
      { id: "traitement", description: "Traiter les demandes citoyennes", duration: 6000, skillCheck: { skill: "technique", difficulty: 25 } },
      { id: "signature", description: "Signer et archiver", duration: 3000 },
    ],
  },
  journaliste: {
    id: "journaliste", title: "Journaliste local", category: "media",
    description: "Couverture locale, rangs et villages.",
    reward: 340, bonusPerLevel: 50, xpReward: 30,
    durationMs: 18000, cooldownMs: 35000, levelRequired: 2,
    skillRequired: { skill: "charisme", level: 30 },
    location: "Pont-Rouge", locationCoords: LOC.pont, isIllegal: false,
    steps: [
      { id: "sujet", description: "Trouver un sujet d'article", duration: 3000, skillCheck: { skill: "charisme", difficulty: 20 } },
      { id: "terrain", description: "Reportage sur le terrain", duration: 8000, skillCheck: { skill: "discretion", difficulty: 25 } },
      { id: "redaction", description: "Rédiger l'article", duration: 5000, skillCheck: { skill: "technique", difficulty: 30 } },
      { id: "publication", description: "Publier l'article en ligne", duration: 2000 },
    ],
  },
  contrebandier: {
    id: "contrebandier", title: "Contrebandier maritime", category: "illegal",
    description: "Marchandises interdites au quai de la marina.",
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
    description: "Fouilles de poches au marché du terroir.",
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
    id: "hacker", title: "Hacker éthique", category: "illegal",
    description: "Intrusion dans les systèmes du comté.",
    reward: 1200, bonusPerLevel: 180, xpReward: 80,
    durationMs: 35000, cooldownMs: 120000, levelRequired: 4,
    skillRequired: { skill: "technique", level: 60 },
    location: "Saint-Casimir", locationCoords: LOC.casimir, isIllegal: true, wantedOnCatch: 4,
    steps: [
      { id: "setup", description: "Configurer le matériel", duration: 5000, skillCheck: { skill: "technique", difficulty: 40 } },
      { id: "intrusion", description: "Pénétrer le système", duration: 10000, skillCheck: { skill: "technique", difficulty: 65 }, canFail: true },
      { id: "extraction", description: "Extraire les données sensibles", duration: 12000, skillCheck: { skill: "technique", difficulty: 70 }, canFail: true },
      { id: "effacement", description: "Effacer les traces numériques", duration: 8000, skillCheck: { skill: "discretion", difficulty: 55 } },
    ],
  },
  braqueur: {
    id: "braqueur", title: "Braqueur de dépanneur", category: "illegal",
    description: "Caisse du village, après minuit.",
    reward: 600, bonusPerLevel: 100, xpReward: 50,
    durationMs: 20000, cooldownMs: 180000, levelRequired: 3,
    skillRequired: { skill: "force", level: 45 },
    location: "Saint-Alban", locationCoords: LOC.alban, isIllegal: true, wantedOnCatch: 5,
    steps: [
      { id: "reconnaissance", description: "Reconnaître les lieux", duration: 4000, skillCheck: { skill: "discretion", difficulty: 35 } },
      { id: "entree", description: "Forcer l'entrée arrière", duration: 3000, skillCheck: { skill: "force", difficulty: 40 } },
      { id: "caisse", description: "Vider la caisse enregistreuse", duration: 8000, skillCheck: { skill: "force", difficulty: 30 } },
      { id: "fuite", description: "Prendre la fuite", duration: 5000, skillCheck: { skill: "conduite", difficulty: 55 }, canFail: true },
    ],
  },
  dealer: {
    id: "dealer", title: "Dealer de rue", category: "illegal",
    description: "Transactions dans les ruelles sombres.",
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

// ─── 5. VALEURS DE BASE ET UTILITAIRES D'INITIALISATION ─────────────────────

export const DEFAULT_SKILLS: PlayerSkills = {
  conduite: 10, force: 10, endurance: 10, charisme: 10,
  technique: 10, discretion: 10, medecine: 10, cuisine: 10,
};

export function calcXpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, Math.max(1, level) - 1));
}

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

/** Validation stricte d'une adhésion syndicale/policière/mafia */
function parseFaction(raw: unknown): FactionMembership | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Partial<FactionMembership>;
  if (typeof f.factionId !== "string" || typeof f.name !== "string") return null;
  return {
    factionId: f.factionId,
    name: f.name,
    rank: typeof f.rank === "number" ? Math.max(0, Math.min(5, f.rank)) : 0,
    joinedAt: typeof f.joinedAt === "number" ? f.joinedAt : Date.now(),
    contribution: typeof f.contribution === "number" ? Math.max(0, f.contribution) : 0,
  };
}

export function parseCareer(raw: unknown): CareerState {
  const base = emptyCareer();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<CareerState>;

  const skills = { ...DEFAULT_SKILLS };
  if (d.skills && typeof d.skills === "object") {
    for (const k of Object.keys(DEFAULT_SKILLS) as SkillType[]) {
      const n = (d.skills as PlayerSkills)[k];
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
    faction: parseFaction(d.faction),
    jobsCompleted: typeof d.jobsCompleted === "number" ? d.jobsCompleted : 0,
    jobsFailed: typeof d.jobsFailed === "number" ? d.jobsFailed : 0,
    gigCooldowns: d.gigCooldowns && typeof d.gigCooldowns === "object" ? { ...d.gigCooldowns } : {},
    jobHistory: Array.isArray(d.jobHistory) ? d.jobHistory.slice(0, 40) : [],
  };
}

// ─── 6. RECHERCHE DE QUARTS DE TRAVAIL ─────────────────────────────────────

export function gigById(id: string): JobDef | undefined {
  return JOB_CATALOG[id];
}

export function allGigs(): JobDef[] {
  return Object.values(JOB_CATALOG);
}

export function gigsByCategory(cat: JobCategory): JobDef[] {
  return allGigs().filter((j) => j.category === cat);
}

export function nearGig(def: JobDef, x: number, z: number, radius = 48): boolean {
  const [lx, , lz] = def.locationCoords;
  const dx = x - lx;
  const dz = z - lz;
  return dx * dx + dz * dz < radius * radius;
}

/**
 * Recherche du quart de travail le plus proche du joueur.
 * Optimisation : comparaison par distance au carré (évite les Math.hypot coûteux)
 */
export function nearestGig(x: number, z: number, max = 48): JobDef | null {
  let best: JobDef | null = null;
  let bestDSq = max * max;

  for (const job of allGigs()) {
    const [lx, , lz] = job.locationCoords;
    const dx = x - lx;
    const dz = z - lz;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDSq) {
      best = job;
      bestDSq = dSq;
    }
  }
  return best;
}

// ─── 7. VALIDATION D'ACCÈS ET COOLDOWNS ────────────────────────────────────

export function canStartGig(career: CareerState, jobId: string, active: ActiveGig | null): boolean {
  return getCannotStartReason(career, jobId, active) === null;
}

export function getJobCooldownSec(career: CareerState, jobId: string, now = Date.now()): number {
  const cd = career.gigCooldowns[jobId];
  if (!cd) return 0;
  return Math.max(0, Math.ceil((cd - now) / 1000));
}

export function getCannotStartReason(
  career: CareerState,
  jobId: string,
  active: ActiveGig | null,
  now = Date.now()
): string | null {
  if (active) return "Un quart de travail est déjà en cours";
  const cd = career.gigCooldowns[jobId];
  if (cd && now < cd) return `Disponible dans ${getJobCooldownSec(career, jobId, now)} s`;
  const def = JOB_CATALOG[jobId];
  if (!def) return "Quart introuvable";
  if (career.level < def.levelRequired) return `Niveau ${def.levelRequired} requis`;
  if (def.skillRequired && career.skills[def.skillRequired.skill] < def.skillRequired.level) {
    return `Compétence ${SKILL_LABEL[def.skillRequired.skill]} ${def.skillRequired.level} requise`;
  }
  if (def.licenseRequired && !career.licenses.includes(def.licenseRequired)) {
    return `${GIG_LICENSE_LABEL[def.licenseRequired]} requis`;
  }
  return null;
}

// ─── 8. CYCLE DE VIE D'UN QUART ACTIF ──────────────────────────────────────

export function makeActiveGig(career: CareerState, def: JobDef): ActiveGig {
  let bonus = 1;
  if (career.faction?.factionId === def.factionId && def.factionBonus) {
    bonus += def.factionBonus / 100;
  }
  bonus += (career.level - 1) * 0.05;

  const skill = def.skillRequired?.skill ?? "endurance";
  const finalReward = Math.round((def.reward + def.bonusPerLevel * (career.skills[skill] / 10)) * bonus);

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
  };
}

export type GigTickEvent =
  | { kind: "none"; gig: ActiveGig }
  | { kind: "step"; gig: ActiveGig; skill?: SkillType }
  | { kind: "done"; gig: ActiveGig }
  | { kind: "fail"; gig: ActiveGig; wanted?: number; penalty?: number };

/**
 * Fait avancer un quart de travail actif d'un tick de simulation.
 */
export function tickActiveGig(gig: ActiveGig, dt: number, skills: PlayerSkills): GigTickEvent {
  const def = JOB_CATALOG[gig.id];
  if (!def) return { kind: "done", gig };

  const step = def.steps[gig.currentStep];
  if (!step) return { kind: "done", gig };

  const ms = dt * 1000;
  gig.stepElapsed += ms;
  gig.stepProgress = Math.min(1, gig.stepElapsed / step.duration);

  // Calcul du pourcentage global (recalculé à chaque tick pour fluidité)
  const doneMs = gig.steps.slice(0, gig.currentStep).reduce((a, s) => a + s.duration, 0) + gig.stepElapsed;
  gig.progress = Math.min(1, doneMs / Math.max(1, def.durationMs));

  if (gig.stepElapsed < step.duration) {
    return { kind: "none", gig };
  }

  // Étape terminée : vérification du test de compétence
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

  // Étape sans test de compétence : passage direct à la suivante
  gig.currentStep += 1;
  gig.stepElapsed = 0;
  gig.stepProgress = 0;
  if (gig.currentStep >= def.steps.length) return { kind: "done", gig };
  return { kind: "step", gig };
}

/** Récupère l'étape actuellement en cours d'un quart de travail */
export function currentStep(gig: ActiveGig): JobStep | undefined {
  return gig.steps[gig.currentStep];
}

/** Retourne la progression textuelle et numérique pour le HUD */
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

// ─── 9. FINALISATION & CONSÉQUENCES DU QUART ───────────────────────────────

export function finalizeGig(
  career: CareerState,
  gig: ActiveGig,
  success: boolean,
  now = Date.now()
): CareerState {
  const def = JOB_CATALOG[gig.id];
  const cooldownEnd = now + (def?.cooldownMs ?? 30000);
  const skill = def?.skillRequired?.skill ?? "endurance";
  const xpGained = success ? (def?.xpReward ?? 10) : Math.floor((def?.xpReward ?? 10) * 0.2);

  // Mise à jour de la compétence principale (via bumpSkill)
  const newSkills = success
    ? bumpSkill(career.skills, skill, 1)
    : career.skills;

  const historyEntry: GigHistory = {
    jobId: gig.id,
    title: gig.title,
    reward: success ? gig.reward : 0,
    completedAt: now,
    success,
    duration: now - gig.startedAt,
  };

  const updatedFaction = success && career.faction && def?.factionId === career.faction.factionId
    ? addContribution(career.faction, def.factionBonus ?? 10)
    : career.faction;

  const withXp = applyXp(
    {
      ...career,
      skills: newSkills,
      faction: updatedFaction,
      jobsCompleted: success ? career.jobsCompleted + 1 : career.jobsCompleted,
      jobsFailed: success ? career.jobsFailed : career.jobsFailed + 1,
      gigCooldowns: { ...career.gigCooldowns, [gig.id]: cooldownEnd },
      jobHistory: [historyEntry, ...career.jobHistory].slice(0, 40),
    },
    xpGained
  );

  return withXp.career;
}

// ─── 10. FONCTIONS UTILITAIRES DE MUTATION ────────────────────────────────

export function applyXp(career: CareerState, amount: number): { career: CareerState; leveled: boolean } {
  let xp = career.xp + amount;
  let level = career.level;
  let next = career.xpToNextLevel;
  let leveled = false;
  while (xp >= next && level < 20) {
    xp -= next;
    level += 1;
    next = calcXpToNextLevel(level);
    leveled = true;
  }
  return { career: { ...career, xp, level, xpToNextLevel: next }, leveled };
}

export function bumpSkill(skills: PlayerSkills, skill: SkillType, amount: number): PlayerSkills {
  return { ...skills, [skill]: Math.min(100, skills[skill] + amount) };
}

export function grantGigLicense(list: GigLicenseId[], id: GigLicenseId): GigLicenseId[] {
  return list.includes(id) ? list : [...list, id];
}

export function joinCareerFaction(id: string, name: string): FactionMembership {
  return { factionId: id, name, rank: 0, joinedAt: Date.now(), contribution: 0 };
}

export function addContribution(faction: FactionMembership, amount: number): FactionMembership {
  const contribution = faction.contribution + amount;
  const thresholds = [0, 100, 300, 600, 1000, 2000];
  const rank = Math.min(5, thresholds.filter((t) => contribution >= t).length - 1);
  return { ...faction, contribution, rank };
}