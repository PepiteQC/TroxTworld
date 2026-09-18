import * as THREE from "three";
import { itemById } from "./commerce";
import { matLib } from "./materials";
import { inlandSide, pushOffRoad, villageAxis, villageSetback, VILLAGES, type VillageDef } from "./worlddata";

// ======================
// TYPES ET INTERFACES RP
// ======================

/** Types d'entreprises disponibles. */
export type FirmType =
  | "cafe"
  | "depanneur"
  | "garage"
  | "paysagiste"
  | "deneigement"
  | "transport"
  | "restaurant"
  | "bar"
  | "construction"
  | "securite"
  | "forestiere"
  | "immobilier";

/** Identifiants des permis. */
export type PermitId = "MAPAQ" | "MUNICIPAL" | "SAAQ_T" | "CNESST" | "RACJ" | "RBQ" | "BSP" | "OACIQ" | "MFFP";

/** Statuts possibles d'une entreprise. */
export type FirmStatus = "en_demarrage" | "active" | "suspendue" | "en_faillite";

/** Statuts de réputation (1-5 étoiles). */
export type ReputationLevel = 1 | 2 | 3 | 4 | 5;

/** Traits uniques pour personnaliser une entreprise. */
export type FirmTrait =
  | "familial"
  | "ecologique"
  | "luxueux"
  | "artisanal"
  | "rapide"
  | "local";

/** Compétences du personnel. */
export type StaffSkill =
  | "vendeur_charismatique"
  | "mecanicien_expert"
  | "chef_etoile"
  | "organise"
  | "bricoleur"
  | "polyvalent";

/** Types d'événements aléatoires. */
export type RandomEventType =
  | "festival"
  | "greve"
  | "penurie"
  | "promotion"
  | "inspection"
  | "concurrence_agressive";

/** Styles architecturaux pour les bâtiments. */
export type BuildingStyle = "moderne" | "rustique" | "industriel" | "victorien" | "minimaliste";

/** Niveaux de satisfaction client (1-100). */
export type CustomerSatisfaction = number;

// ======================
// INTERFACES
// ======================

/** Permis d'une entreprise. */
export interface FirmPermit {
  type: PermitId;
  number: string;
  expiryDate: number; // Timestamp (en jours de jeu)
}

/** Avis client. */
export interface CustomerReview {
  rating: ReputationLevel;
  comment: string;
  author: string;
  timestamp: number; // Timestamp (en jours de jeu)
}

/** Événement aléatoire affectant une entreprise. */
export interface RandomEvent {
  type: RandomEventType;
  duration: number; // Durée en jours de jeu
  effect: {
    revenueMultiplier?: number;
    costMultiplier?: number;
    reputationChange?: number;
    description: string;
  };
}

/** Spécifications d'une entreprise. */
export interface FirmSpec {
  type: FirmType;
  label: string;
  startup: number;
  permits: PermitId[];
  model: "comptoir" | "contrat";
  peak: number[]; // Mois de pointe (1-12)
  hint: string;
  baseReputation: ReputationLevel;
  possibleTraits: FirmTrait[];
  baseStyle: BuildingStyle;
}

/** Entreprise du comté. */
export interface CountyFirm {
  id: string;
  type: FirmType;
  name: string;
  village: string;
  villageId: string;
  x: number;
  z: number;
  yaw: number;
}

/** Entreprise (version étendue pour le RP). */
export interface Firm {
  id: string;
  neq: string;
  tradeName: string;
  type: FirmType;
  village: string;
  x: number;
  z: number;
  status: FirmStatus;
  balance: number;
  taxOwed: number;
  permits: FirmPermit[];
  stock: Record<string, number>;
  isOpen: boolean;
  lifetimeRevenue: number;
  staff: number;
  staffSkills: StaffSkill[]; // Compétences du personnel
  grants: Record<string, number>;
  reputation: ReputationLevel; // Niveau de réputation
  traits: FirmTrait[]; // Traits uniques
  buildingStyle: BuildingStyle; // Style du bâtiment
  customerSatisfaction: CustomerSatisfaction; // Satisfaction client (0-100)
  reviews: CustomerReview[]; // Avis clients
  activeEvents: RandomEvent[]; // Événements en cours
  quests: FirmQuest[]; // Quêtes en cours
  lifetimeCustomers: number; // Nombre total de clients servis
  lastSaleTimestamp: number; // Dernière vente (en jours de jeu)
}

/** Quête liée à une entreprise. */
export interface FirmQuest {
  id: string;
  title: string;
  description: string;
  objective: string; // Ex: "Livrer 10 commandes"
  progress: number;
  reward: {
    money?: number;
    reputation?: number;
    item?: string;
  };
  expiryDate: number; // Timestamp (en jours de jeu)
}

// ======================
// DONNÉES STATIQUES
// ======================

/** Spécifications des types d'entreprises. */
export const FIRM_TYPES: FirmSpec[] = [
  {
    type: "cafe",
    label: "Café",
    startup: 420,
    permits: ["MAPAQ", "MUNICIPAL"],
    model: "comptoir",
    peak: [1, 2, 10, 11, 12],
    hint: "Café double, pâtisserie. Haute saison l'hiver.",
    baseReputation: 3,
    possibleTraits: ["familial", "ecologique", "artisanal", "local"],
    baseStyle: "rustique",
  },
  {
    type: "depanneur",
    label: "Dépanneur",
    startup: 580,
    permits: ["MAPAQ", "MUNICIPAL"],
    model: "comptoir",
    peak: [6, 7, 8],
    hint: "Ouvert tard, volume. Stock depuis le sac.",
    baseReputation: 2,
    possibleTraits: ["rapide", "local", "familial"],
    baseStyle: "minimaliste",
  },
  {
    type: "restaurant",
    label: "Restaurant",
    startup: 860,
    permits: ["MAPAQ", "MUNICIPAL"],
    model: "comptoir",
    peak: [6, 7, 8, 12],
    hint: "Salle, pourboires, permis aliments.",
    baseReputation: 4,
    possibleTraits: ["luxueux", "artisanal", "ecologique", "familial"],
    baseStyle: "victorien",
  },
  {
    type: "bar",
    label: "Bar",
    startup: 920,
    permits: ["RACJ", "MUNICIPAL"],
    model: "comptoir",
    peak: [5, 6, 7, 11, 12],
    hint: "Permis d'alcool RACJ. Soirées.",
    baseReputation: 3,
    possibleTraits: ["luxueux", "local", "artisanal"],
    baseStyle: "moderne",
  },
  {
    type: "garage",
    label: "Garage",
    startup: 980,
    permits: ["MUNICIPAL"],
    model: "contrat",
    peak: [4, 5, 10, 11],
    hint: "Clé anglaise, pics aux pneus.",
    baseReputation: 3,
    possibleTraits: ["rapide", "artisanal", "ecologique"],
    baseStyle: "industriel",
  },
  {
    type: "paysagiste",
    label: "Paysagiste",
    startup: 360,
    permits: ["MUNICIPAL"],
    model: "contrat",
    peak: [5, 6, 7, 8, 9],
    hint: "Pelle et râteau dans les rangs.",
    baseReputation: 2,
    possibleTraits: ["ecologique", "artisanal", "local"],
    baseStyle: "rustique",
  },
  {
    type: "deneigement",
    label: "Déneigement",
    startup: 520,
    permits: ["MUNICIPAL"],
    model: "contrat",
    peak: [11, 12, 1, 2, 3],
    hint: "Contrats d'hiver, forfait tempête.",
    baseReputation: 3,
    possibleTraits: ["rapide", "local", "familial"],
    baseStyle: "industriel",
  },
  {
    type: "transport",
    label: "Transport",
    startup: 740,
    permits: ["SAAQ_T"],
    model: "contrat",
    peak: [1, 2, 10, 11, 12],
    hint: "Contrats 138 / A-40, +25 %.",
    baseReputation: 3,
    possibleTraits: ["rapide", "ecologique", "organise"],
    baseStyle: "moderne",
  },
  {
    type: "construction",
    label: "Construction",
    startup: 1100,
    permits: ["RBQ", "CNESST"],
    model: "contrat",
    peak: [5, 6, 7, 8, 9],
    hint: "Licence RBQ, chantiers municipaux.",
    baseReputation: 4,
    possibleTraits: ["artisanal", "organise", "bricoleur"],
    baseStyle: "industriel",
  },
  {
    type: "securite",
    label: "Sécurité",
    startup: 640,
    permits: ["BSP"],
    model: "contrat",
    peak: [1, 2, 10, 11, 12],
    hint: "Permis BSP, rondes de nuit.",
    baseReputation: 3,
    possibleTraits: ["polyvalent", "organise", "rapide"],
    baseStyle: "moderne",
  },
  {
    type: "forestiere",
    label: "Forestière",
    startup: 880,
    permits: ["MFFP", "CNESST"],
    model: "contrat",
    peak: [9, 10, 11, 1, 2],
    hint: "Permis d'intervention, bois de chauffage.",
    baseReputation: 2,
    possibleTraits: ["ecologique", "artisanal", "local"],
    baseStyle: "rustique",
  },
  {
    type: "immobilier",
    label: "Immobilier",
    startup: 720,
    permits: ["OACIQ"],
    model: "contrat",
    peak: [4, 5, 6, 9, 10],
    hint: "Certificat OACIQ, commissions sur ventes.",
    baseReputation: 4,
    possibleTraits: ["luxueux", "organise", "polyvalent"],
    baseStyle: "victorien",
  },
];

/** Frais des permis. */
export const PERMIT_FEES: Record<PermitId, { label: string; fee: number; authority: string }> = {
  MAPAQ: { label: "Permis MAPAQ", fee: 72, authority: "Aliments" },
  MUNICIPAL: { label: "Occupation municipale", fee: 42, authority: "Mairie" },
  SAAQ_T: { label: "Transport SAAQ", fee: 98, authority: "Marchandises" },
  CNESST: { label: "CNESST", fee: 34, authority: "SST" },
  RACJ: { label: "Permis d'alcool RACJ", fee: 160, authority: "Alcool" },
  RBQ: { label: "Licence RBQ", fee: 210, authority: "Bâtiment" },
  BSP: { label: "Permis BSP", fee: 145, authority: "Sécurité" },
  OACIQ: { label: "Certificat OACIQ", fee: 185, authority: "Courtage" },
  MFFP: { label: "Intervention forestière", fee: 120, authority: "Forêt" },
};

/** Identifiants des subventions MAPAQ. */
export type MapaqGrantId = "proximite" | "pta" | "padaar" | "releve" | "alimentsqc";

/** Subvention MAPAQ. */
export interface MapaqGrant {
  id: MapaqGrantId;
  name: string;
  short: string;
  hint: string;
  types: FirmType[];
  permit?: PermitId;
  minRevenue: number;
  maxRevenue?: number;
  base: number;
  ruralBonus: number;
}

/** Programmes MAPAQ réels, montants à l'échelle du comté. */
export const MAPAQ_GRANTS: MapaqGrant[] = [
  {
    id: "proximite",
    name: "Initiative Proximité",
    short: "Proximité",
    hint: "Mise en marché locale, kiosque, produits d'ici. Jusqu'à 70 % des dépenses, +15 % en région.",
    types: ["cafe", "depanneur", "restaurant"],
    permit: "MAPAQ",
    minRevenue: 30,
    base: 180,
    ruralBonus: 0.15,
  },
  {
    id: "pta",
    name: "Programme transformation alimentaire",
    short: "PTA",
    hint: "Moderniser cuisine et productivité. Aide ~50 % des dépenses admissibles.",
    types: ["cafe", "depanneur", "restaurant"],
    permit: "MAPAQ",
    minRevenue: 80,
    base: 260,
    ruralBonus: 0.1,
  },
  {
    id: "padaar",
    name: "PADAAR — produits régionaux",
    short: "PADAAR",
    hint: "Promotion agroalimentaire en région. Événements, étals, produits du comté.",
    types: ["cafe", "restaurant", "paysagiste"],
    minRevenue: 0,
    base: 140,
    ruralBonus: 0.2,
  },
  {
    id: "releve",
    name: "Relève agricole",
    short: "Relève",
    hint: "Bonification jeunes entreprises. CA encore bas, petit effectif.",
    types: ["cafe", "depanneur", "restaurant", "paysagiste"],
    permit: "MAPAQ",
    minRevenue: 0,
    maxRevenue: 280,
    base: 120,
    ruralBonus: 0.15,
  },
  {
    id: "alimentsqc",
    name: "Aliments du Québec",
    short: "Aliments QC",
    hint: "Identification et mise en marché des produits québécois.",
    types: ["cafe", "depanneur", "restaurant"],
    permit: "MAPAQ",
    minRevenue: 20,
    base: 90,
    ruralBonus: 0.1,
  },
];

/** Villages urbains (non ruraux). */
const URBAN_VILLAGES = new Set(["Portneuf", "Pont-Rouge", "Donnacona", "Saint-Raymond"]);

// ======================
// FONCTIONS UTILITAIRES
// ======================

/**
 * Vérifie si un village est rural.
 * @param name - Nom du village.
 * @returns `true` si rural, `false` sinon.
 */
export function isRuralVillage(name: string): boolean {
  return !URBAN_VILLAGES.has(name);
}

/**
 * Récupère une subvention MAPAQ par son ID.
 * @param id - ID de la subvention.
 * @returns La subvention ou `undefined`.
 */
export function mapaqGrant(id: string): MapaqGrant | undefined {
  return MAPAQ_GRANTS.find((g) => g.id === id);
}

/**
 * Calcule le montant d'une subvention pour une entreprise.
 * @param firm - Entreprise concernée.
 * @param spec - Spécifications de la subvention.
 * @returns Montant de la subvention.
 */
export function grantAmount(firm: Firm, spec: MapaqGrant): number {
  let amount = spec.base;
  if (isRuralVillage(firm.village)) {
    amount *= 1 + spec.ruralBonus;
  }
  if ((firm.staff ?? 0) <= 1 && spec.id !== "pta") {
    amount *= 1.08;
  }
  // Bonus de réputation
  amount *= 1 + (firm.reputation - 3) * 0.05; // +5% par étoile au-dessus de 3
  return Math.round(amount);
}

/**
 * Vérifie si une entreprise peut demander une subvention.
 * @param firm - Entreprise concernée.
 * @param id - ID de la subvention.
 * @returns Objet avec `ok`, `amount`, et `reason`.
 */
export function canApplyGrant(firm: Firm, id: MapaqGrantId): { ok: boolean; amount: number; reason: string } {
  const spec = mapaqGrant(id);
  if (!spec) return { ok: false, amount: 0, reason: "Programme inconnu." };
  if (!spec.types.includes(firm.type)) {
    return { ok: false, amount: 0, reason: `${spec.short} · pas pour un ${firmSpec(firm.type).label.toLowerCase()}.` };
  }
  if (firm.status === "suspendue" || firm.status === "en_faillite") {
    return { ok: false, amount: 0, reason: "Entreprise suspendue ou en faillite." };
  }
  if (spec.permit && !firm.permits.some((p) => p.type === spec.permit)) {
    return { ok: false, amount: 0, reason: `Permis ${spec.permit} requis.` };
  }
  if (firm.lifetimeRevenue < spec.minRevenue) {
    return { ok: false, amount: 0, reason: `CA trop bas · ${spec.minRevenue} $ minimum.` };
  }
  if (spec.maxRevenue !== undefined && firm.lifetimeRevenue > spec.maxRevenue) {
    return { ok: false, amount: 0, reason: "Relève : CA trop élevé." };
  }
  if ((firm.grants ?? {})[id]) {
    return { ok: false, amount: 0, reason: "Déjà versée." };
  }
  const amount = grantAmount(firm, spec);
  return { ok: true, amount, reason: `${spec.name} · ${amount} $` };
}

/**
 * Récupère les spécifications d'une entreprise par son type.
 * @param type - Type de l'entreprise.
 * @returns Spécifications de l'entreprise.
 */
export function firmSpec(type: FirmType): FirmSpec {
  return FIRM_TYPES.find((s) => s.type === type) ?? FIRM_TYPES[0]!;
}

/**
 * Génère un NEQ aléatoire.
 * @returns NEQ généré.
 */
export function generateNEQ(): string {
  const year = String(new Date().getFullYear() % 10);
  const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  return year + rest;
}

/**
 * Génère un numéro de permis aléatoire.
 * @param type - Type de permis.
 * @returns Numéro de permis généré.
 */
export function generatePermitNumber(type: PermitId): string {
  return `${type}-${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Calcule le coût total de démarrage d'une entreprise.
 * @param type - Type de l'entreprise.
 * @returns Coût total.
 */
export function startupTotal(type: FirmType): number {
  const spec = firmSpec(type);
  return spec.startup + spec.permits.reduce((sum, p) => sum + PERMIT_FEES[p].fee, 0);
}

/**
 * Vérifie si une entreprise peut opérer (a tous les permis nécessaires).
 * @param firm - Entreprise à vérifier.
 * @returns Objet avec `ok` et `missing` (permis manquants).
 */
export function canOperate(firm: Firm): { ok: boolean; missing: PermitId[] } {
  const needed = firmSpec(firm.type).permits;
  const held = new Set(firm.permits.map((p) => p.type));
  const missing = needed.filter((p) => !held.has(p));
  if (firm.status === "suspendue" || firm.status === "en_faillite") {
    return { ok: false, missing };
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Calcule le facteur saisonnier pour une entreprise.
 * @param type - Type de l'entreprise.
 * @param month - Mois (1-12).
 * @returns Facteur multiplicatif.
 */
export function seasonalFactor(type: FirmType, month: number): number {
  const spec = firmSpec(type);
  if (spec.peak.includes(month)) return 1.55;
  const isAdjacent = spec.peak.some((m) => Math.abs(m - month) === 1 || Math.abs(m - month) === 11);
  if (isAdjacent) return 0.85;
  const isHardSeasonal = type === "deneigement" || type === "paysagiste" || type === "forestiere";
  return isHardSeasonal ? 0.15 : 0.6;
}

/**
 * Calcule la taxe de vente.
 * @param subtotal - Sous-total.
 * @returns Montant de la taxe.
 */
export function saleTax(subtotal: number): number {
  return Math.round(subtotal * 0.14975 * 100) / 100;
}

/**
 * Convertit le temps écoulé en mois de jeu (1-12).
 * @param elapsed - Temps écoulé (en secondes ou unités de jeu).
 * @returns Mois de jeu (1-12).
 */
export function gameMonth(elapsed: number): number {
  return ((Math.floor(elapsed / 180) + 8) % 12) + 1;
}

/**
 * Parse une entreprise depuis des données brutes.
 * @param raw - Données brutes.
 * @returns Entreprise parsée ou `null`.
 */
export function parseFirm(raw: unknown): Firm | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Firm>;
  if (typeof d.neq !== "string" || typeof d.type !== "string") return null;

  const type = FIRM_TYPES.some((t) => t.type === d.type) ? (d.type as FirmType) : "cafe";
  const spec = firmSpec(type);

  return {
    id: typeof d.id === "string" ? d.id : "firm-1",
    neq: d.neq,
    tradeName: typeof d.tradeName === "string" ? d.tradeName : spec.label,
    type,
    village: typeof d.village === "string" ? d.village : "Portneuf",
    x: typeof d.x === "number" ? d.x : 0,
    z: typeof d.z === "number" ? d.z : 0,
    status: d.status === "active" || d.status === "suspendue" || d.status === "en_faillite" ? d.status : "en_demarrage",
    balance: typeof d.balance === "number" ? d.balance : 0,
    taxOwed: typeof d.taxOwed === "number" ? d.taxOwed : 0,
    permits: Array.isArray(d.permits)
      ? d.permits.filter((p) => p && typeof p.type === "string" && typeof p.number === "string")
      : [],
    stock: d.stock && typeof d.stock === "object" ? d.stock : {},
    isOpen: Boolean(d.isOpen),
    lifetimeRevenue: typeof d.lifetimeRevenue === "number" ? d.lifetimeRevenue : 0,
    staff: typeof d.staff === "number" ? Math.max(0, Math.min(8, Math.floor(d.staff))) : 0,
    staffSkills: Array.isArray(d.staffSkills) ? d.staffSkills.filter((s) => s in Object.values(StaffSkill)) : [],
    grants: d.grants && typeof d.grants === "object" ? (d.grants as Record<string, number>) : {},
    reputation: typeof d.reputation === "number" ? (d.reputation as ReputationLevel) : spec.baseReputation,
    traits: Array.isArray(d.traits) ? d.traits.filter((t) => t in Object.values(FirmTrait)) : [spec.possibleTraits[0]],
    buildingStyle: typeof d.buildingStyle === "string" ? d.buildingStyle : spec.baseStyle,
    customerSatisfaction: typeof d.customerSatisfaction === "number" ? d.customerSatisfaction : 70,
    reviews: Array.isArray(d.reviews) ? d.reviews : [],
    activeEvents: Array.isArray(d.activeEvents) ? d.activeEvents : [],
    quests: Array.isArray(d.quests) ? d.quests : [],
    lifetimeCustomers: typeof d.lifetimeCustomers === "number" ? d.lifetimeCustomers : 0,
    lastSaleTimestamp: typeof d.lastSaleTimestamp === "number" ? d.lastSaleTimestamp : 0,
  };
}

/**
 * Trouve le village le plus proche des coordonnées données.
 * @param x - Coordonnée X.
 * @param z - Coordonnée Z.
 * @returns Nom du village le plus proche.
 */
export function nearestVillageName(x: number, z: number): string {
  let best = VILLAGES[0]!;
  let minDistance = Infinity;
  for (const v of VILLAGES) {
    const distance = Math.hypot(v.center[0] - x, v.center[1] - z);
    if (distance < minDistance) {
      minDistance = distance;
      best = v;
    }
  }
  return best.name;
}

/**
 * Calcule la valeur totale du stock.
 * @param stock - Stock de l'entreprise.
 * @returns Valeur totale.
 */
export function stockValue(stock: Record<string, number>): number {
  let total = 0;
  for (const [id, quantity] of Object.entries(stock)) {
    total += (itemById(id)?.price ?? 0) * quantity;
  }
  return Math.round(total * 100) / 100;
}

// ======================
// FONCTIONS DE RENDU 3D
// ======================

/**
 * Construit un stand pour une entreprise.
 * @param type - Type de l'entreprise.
 * @returns Groupe THREE.js.
 */
export function buildFirmStand(type: FirmType): THREE.Group {
  return buildFirmBuilding(type);
}

/**
 * Construit un bâtiment pour une entreprise.
 * @param type - Type de l'entreprise.
 * @returns Groupe THREE.js.
 */
export function buildFirmBuilding(type: FirmType): THREE.Group {
  const group = new THREE.Group();
  group.name = `firm-${type}`;

  // Palette de couleurs et dimensions par type
  const palette: Record<FirmType, { wall: number; accent: number; roof: number; w: number; d: number; h: number }> = {
    cafe: { wall: 0xc8b49a, accent: 0x6a3a28, roof: 0x3a2a22, w: 8.4, d: 7.2, h: 3.4 },
    depanneur: { wall: 0xe8e0d4, accent: 0xc03028, roof: 0x3a3a3e, w: 10, d: 7.6, h: 3.5 },
    restaurant: { wall: 0xd8c8b0, accent: 0x8a3020, roof: 0x4a3028, w: 11, d: 8.4, h: 3.8 },
    bar: { wall: 0x2a2430, accent: 0x7c3aed, roof: 0x1a1420, w: 9.2, d: 7.4, h: 3.6 },
    garage: { wall: 0x8a9096, accent: 0xc4a030, roof: 0x4a5056, w: 12, d: 9.2, h: 4.2 },
    paysagiste: { wall: 0x6a7a50, accent: 0x3a6a38, roof: 0x4a3a28, w: 7.4, d: 6.2, h: 3.1 },
    deneigement: { wall: 0xd8e0e8, accent: 0x2a5a9a, roof: 0x6a7080, w: 8.6, d: 7.0, h: 3.4 },
    transport: { wall: 0xc4a030, accent: 0x2a2a28, roof: 0x3a3a36, w: 14, d: 10, h: 4.6 },
    construction: { wall: 0xb8a078, accent: 0xc05018, roof: 0x5a5048, w: 10.5, d: 8.2, h: 4.0 },
    securite: { wall: 0x3a4450, accent: 0x1a3a7a, roof: 0x2a3038, w: 8.0, d: 6.8, h: 3.6 },
    forestiere: { wall: 0x6a5038, accent: 0x3a5a30, roof: 0x4a3a28, w: 11, d: 8.6, h: 4.2 },
    immobilier: { wall: 0xf0ebe4, accent: 0x1a5a7a, roof: 0x4a5560, w: 8.8, d: 7.0, h: 3.7 },
  };

  const p = palette[type];

  // Corps du bâtiment
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(p.w, p.h, p.d),
    matLib.get(p.wall, 0.82)
  );
  body.position.y = p.h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Toit
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(p.w + 0.5, 0.28, p.d + 0.5),
    matLib.get(p.roof, 0.7, 0.12)
  );
  roof.position.y = p.h + 0.16;
  roof.castShadow = true;
  group.add(roof);

  // Vitrine
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(p.w * 0.62, p.h * 0.48),
    type === "bar"
      ? matLib.getEmissive(0x7c3aed, 0x7c3aed, 0.45)
      : matLib.glass("#87ceeb", 0.35, 0.1, 0.18)
  );
  glass.position.set(0, p.h * 0.52, p.d / 2 + 0.04);
  group.add(glass);

  // Enseigne
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(p.w * 0.55, 0.7, 0.12),
    matLib.getEmissive(p.accent, p.accent, 0.85)
  );
  sign.position.set(0, p.h + 0.72, p.d / 2 + 0.08);
  group.add(sign);

  // Auvent
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(p.w * 0.72, 0.08, 1.5),
    matLib.get(p.accent, 0.7)
  );
  awning.position.set(0, p.h * 0.78, p.d / 2 + 0.75);
  awning.rotation.x = -0.12;
  group.add(awning);

  // Porte
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.15, 0.08),
    matLib.get(0x4a3a2a, 0.6, 0.08)
  );
  door.position.set(-p.w * 0.22, 1.08, p.d / 2 + 0.05);
  group.add(door);

  // Éléments spécifiques par type
  if (type === "garage") {
    const bay = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.6, 0.08),
      matLib.get(0x3a4048, 0.45, 0.25)
    );
    bay.position.set(2.2, 1.35, p.d / 2 + 0.06);
    group.add(bay);
  }

  if (type === "cafe" || type === "restaurant") {
    for (const ox of [-1.6, 0.2, 1.8]) {
      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.72, 10),
        matLib.get(0x6a4a30, 0.7)
      );
      table.position.set(ox, 0.36, p.d / 2 + 2.1);
      group.add(table);
    }
  }

  if (type === "paysagiste") {
    for (const ox of [-2.4, 2.4]) {
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 8),
        matLib.get(0x2a6a28, 0.9)
      );
      bush.position.set(ox, 0.5, p.d / 2 + 1.8);
      group.add(bush);
    }
  }

  if (type === "forestiere") {
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8),
        matLib.get(0x6a4a28, 0.85)
      );
      log.rotation.z = Math.PI / 2;
      log.position.set(-2 + i * 0.42, 0.2, p.d / 2 + 2.4);
      group.add(log);
    }
  }

  if (type === "construction") {
    const pile = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.1, 1.4),
      matLib.get(0xb8a078, 0.85)
    );
    pile.position.set(p.w / 2 + 1.6, 0.55, 0);
    group.add(pile);
  }

  if (type === "deneigement") {
    const snowPile = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 8, 8),
      matLib.get(0xe8eef4, 0.55)
    );
    snowPile.position.set(p.w / 2 + 1.8, 0.7, 1.2);
    group.add(snowPile);
  }

  if (type === "transport") {
    const dock = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.2, 2.2),
      matLib.get(0x5a5048, 0.8)
    );
    dock.position.set(0, 0.6, -p.d / 2 - 1.1);
    group.add(dock);
  }

  if (type === "bar") {
    const neonLight = new THREE.PointLight(0x7c3aed, 1.2, 10);
    neonLight.position.set(0, 2.4, p.d / 2 + 0.4);
    group.add(neonLight);
  }

  // Effets visuels selon le style du bâtiment
  if (p.accent === 0x7c3aed) {
    // Exemple : Ajouter une lumière néon pour les bars
    const neonSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.2, 0.1),
      matLib.getEmissive(0x7c3aed, 0x7c3aed, 0.9)
    );
    neonSign.position.set(0, p.h + 0.8, p.d / 2 + 0.1);
    group.add(neonSign);
  }

  return group;
}

// ======================
// FONCTIONS RP (NOUVEAUTÉS)
// ======================

/**
 * Génère un trait aléatoire pour une entreprise.
 * @param type - Type de l'entreprise.
 * @returns Trait aléatoire.
 */
export function generateRandomTrait(type: FirmType): FirmTrait {
  const spec = firmSpec(type);
  const traits = spec.possibleTraits;
  return traits[Math.floor(Math.random() * traits.length)];
}

/**
 * Génère une compétence aléatoire pour un employé.
 * @returns Compétence aléatoire.
 */
export function generateRandomStaffSkill(): StaffSkill {
  const skills: StaffSkill[] = [
    "vendeur_charismatique",
    "mecanicien_expert",
    "chef_etoile",
    "organise",
    "bricoleur",
    "polyvalent",
  ];
  return skills[Math.floor(Math.random() * skills.length)];
}

/**
 * Génère un événement aléatoire pour une entreprise.
 * @returns Événement aléatoire.
 */
export function generateRandomEvent(): RandomEvent {
  const types: RandomEventType[] = [
    "festival",
    "greve",
    "penurie",
    "promotion",
    "inspection",
    "concurrence_agressive",
  ];
  const type = types[Math.floor(Math.random() * types.length)];

  const effects: Record<RandomEventType, RandomEvent["effect"]> = {
    festival: {
      revenueMultiplier: 1.8,
      description: "Festival local : affluence record ! +80% de revenus.",
    },
    greve: {
      revenueMultiplier: 0.3,
      description: "Grève des employés : -70% de revenus.",
    },
    penurie: {
      costMultiplier: 1.5,
      description: "Pénurie de matières premières : +50% de coûts.",
    },
    promotion: {
      revenueMultiplier: 1.3,
      description: "Promotion réussie : +30% de revenus.",
    },
    inspection: {
      reputationChange: -1,
      description: "Inspection ratée : -1 étoile de réputation.",
    },
    concurrence_agressive: {
      revenueMultiplier: 0.7,
      description: "Concurrence agressive : -30% de revenus.",
    },
  };

  return {
    type,
    duration: Math.floor(Math.random() * 7) + 3, // 3-10 jours
    effect: effects[type],
  };
}

/**
 * Génère un avis client aléatoire.
 * @param firm - Entreprise concernée.
 * @returns Avis client généré.
 */
export function generateRandomReview(firm: Firm): CustomerReview {
  const ratings: ReputationLevel[] = [1, 2, 3, 4, 5];
  // Biais vers la réputation actuelle
  const bias = firm.reputation - 1;
  const rating = ratings[Math.min(bias + Math.floor(Math.random() * 3), 4)];

  const positiveComments = [
    "Service impeccable !",
    "Produits de qualité.",
    "Ambiance chaleureuse.",
    "Je recommande à 100% !",
    "Le meilleur en ville.",
  ];
  const neutralComments = [
    "Correct, sans plus.",
    "Passe une bonne fois.",
    "Rien à signaler.",
  ];
  const negativeComments = [
    "Décu par la qualité.",
    "Service lent et désorganisé.",
    "À éviter.",
    "Prix trop élevés.",
  ];

  let comment: string;
  if (rating >= 4) {
    comment = positiveComments[Math.floor(Math.random() * positiveComments.length)];
  } else if (rating === 3) {
    comment = neutralComments[Math.floor(Math.random() * neutralComments.length)];
  } else {
    comment = negativeComments[Math.floor(Math.random() * negativeComments.length)];
  }

  return {
    rating,
    comment,
    author: `Client_${Math.floor(Math.random() * 1000)}`,
    timestamp: firm.lastSaleTimestamp,
  };
}

/**
 * Met à jour la satisfaction client et la réputation.
 * @param firm - Entreprise à mettre à jour.
 */
export function updateCustomerSatisfaction(firm: Firm): void {
  if (firm.reviews.length === 0) return;

  // Calcule la moyenne des notes récentes (5 derniers avis)
  const recentReviews = firm.reviews.slice(-5);
  const avgRating = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;

  // Met à jour la satisfaction (0-100)
  firm.customerSatisfaction = Math.min(100, Math.max(0, avgRating * 20));

  // Met à jour la réputation (1-5)
  const oldReputation = firm.reputation;
  firm.reputation = Math.min(5, Math.max(1, Math.round(avgRating))) as ReputationLevel;

  // Log si la réputation change
  if (oldReputation !== firm.reputation) {
    console.log(
      `[${firm.tradeName}] Réputation mise à jour : ${oldReputation} → ${firm.reputation} étoiles.`
    );
  }
}

/**
 * Applique les effets des événements actifs à une entreprise.
 * @param firm - Entreprise concernée.
 */
export function applyActiveEvents(firm: Firm): void {
  let revenueMultiplier = 1;
  let costMultiplier = 1;
  let reputationChange = 0;

  for (const event of firm.activeEvents) {
    if (event.effect.revenueMultiplier) {
      revenueMultiplier *= event.effect.revenueMultiplier;
    }
    if (event.effect.costMultiplier) {
      costMultiplier *= event.effect.costMultiplier;
    }
    if (event.effect.reputationChange) {
      reputationChange += event.effect.reputationChange;
    }
  }

  // Applique les changements de réputation
  if (reputationChange !== 0) {
    firm.reputation = Math.min(5, Math.max(1, firm.reputation + reputationChange)) as ReputationLevel;
  }

  // Note : Les multiplicateurs de revenus/coûts seront appliqués dans `nextFirmSale`.
}

/**
 * Génère une quête aléatoire pour une entreprise.
 * @param firm - Entreprise concernée.
 * @returns Quête générée.
 */
export function generateRandomQuest(firm: Firm): FirmQuest {
  const objectives = [
    { text: "Livrer 10 commandes à temps", type: "deliveries" },
    { text: "Atteindre 5 étoiles de réputation", type: "reputation" },
    { text: "Vendre 50 articles", type: "sales" },
    { text: "Embaucher 3 employés", type: "staff" },
    { text: "Gagner 1000 $ en une journée", type: "revenue" },
  ];

  const objective = objectives[Math.floor(Math.random() * objectives.length)];

  const rewards = [
    { money: 500, reputation: 1 },
    { money: 300, item: "outils_améliorés" },
    { money: 200, reputation: 0.5 },
  ];

  const reward = rewards[Math.floor(Math.random() * rewards.length)];

  return {
    id: `quest_${firm.id}_${Date.now()}`,
    title: `Quête : ${objective.text}`,
    description: `Objectif : ${objective.text}. Récompense : ${reward.money ? reward.money + " $" : ""}${
      reward.reputation ? ` +${reward.reputation} étoile(s)` : ""
    }${reward.item ? ` + ${reward.item}` : ""}.`,
    objective: objective.type,
    progress: 0,
    reward,
    expiryDate: firm.lastSaleTimestamp + 30, // 30 jours pour compléter
  };
}

/**
 * Met à jour les quêtes d'une entreprise.
 * @param firm - Entreprise concernée.
 * @param action - Action effectuée (ex: "sale", "delivery").
 */
export function updateQuests(firm: Firm, action: string): void {
  for (const quest of firm.quests) {
    if (quest.objective === action) {
      quest.progress += 1;
      if (quest.progress >= getObjectiveTarget(quest.objective)) {
        // Quête complétée
        firm.balance += quest.reward.money ?? 0;
        if (quest.reward.reputation) {
          firm.reputation = Math.min(5, firm.reputation + quest.reward.reputation) as ReputationLevel;
        }
        // Retirer la quête complétée
        firm.quests = firm.quests.filter((q) => q.id !== quest.id);
        console.log(`[${firm.tradeName}] Quête "${quest.title}" complétée !`);
      }
    }
  }
}

/**
 * Récupère la cible pour un objectif de quête.
 * @param objective - Type d'objectif.
 * @returns Cible à atteindre.
 */
function getObjectiveTarget(objective: string): number {
  const targets: Record<string, number> = {
    deliveries: 10,
    reputation: 5,
    sales: 50,
    staff: 3,
    revenue: 1000,
  };
  return targets[objective] ?? 1;
}

/**
 * Génère une entreprise complète avec des données RP aléatoires.
 * @param type - Type de l'entreprise.
 * @param village - Village de l'entreprise.
 * @returns Entreprise générée.
 */
export function generateRandomFirm(type: FirmType, village: string): Firm {
  const spec = firmSpec(type);
  const now = Date.now();

  return {
    id: `firm_${Math.floor(Math.random() * 10000)}`,
    neq: generateNEQ(),
    tradeName: `${spec.label} ${village}`,
    type,
    village,
    x: 0,
    z: 0,
    status: "en_demarrage",
    balance: 0,
    taxOwed: 0,
    permits: spec.permits.map((p) => ({ type: p, number: generatePermitNumber(p), expiryDate: now + 365 })),
    stock: {},
    isOpen: true,
    lifetimeRevenue: 0,
    staff: Math.floor(Math.random() * 5) + 1,
    staffSkills: Array.from({ length: Math.floor(Math.random() * 3) }, () => generateRandomStaffSkill()),
    grants: {},
    reputation: spec.baseReputation,
    traits: [generateRandomTrait(type)],
    buildingStyle: spec.baseStyle,
    customerSatisfaction: 70,
    reviews: [],
    activeEvents: [],
    quests: [generateRandomQuest({ id: "", type, village, lastSaleTimestamp: now } as Firm)],
    lifetimeCustomers: 0,
    lastSaleTimestamp: now,
  };
}

/**
 * Trouve le nom du commerce associé à un type d'entreprise.
 * @param type - Type de l'entreprise.
 * @returns Nom du commerce.
 */
export function jobBonusType(toolId: string | null): FirmType | null {
  if (toolId === "pelle" || toolId === "rateau") return "paysagiste";
  if (toolId === "cle") return "garage";
  if (toolId === "marteau" || toolId === "perceuse") return "construction";
  if (toolId === "tronconneuse") return "forestiere";
  if (toolId === "casque" || toolId === "gilet") return "securite";
  return null;
}

/**
 * Noms des commerces par type.
 */
const TRADE_NAMES: Record<FirmType, string> = {
  cafe: "Café",
  depanneur: "Dépanneur",
  garage: "Garage",
  paysagiste: "Paysage",
  deneigement: "Déneigement",
  transport: "Transport",
  restaurant: "Resto",
  bar: "Bar",
  construction: "Construction",
  securite: "Sécurité",
  forestiere: "Scierie",
  immobilier: "Immo",
};

/**
 * Détermine le type d'entreprise lié à une industrie de village.
 * @param industry - Industrie du village.
 * @returns Type d'entreprise associé.
 */
function industryFirm(industry: VillageDef["industry"]): FirmType {
  if (industry === "papeterie" || industry === "carriere") return "construction";
  if (industry === "foresterie") return "forestiere";
  if (industry === "agriculture") return "paysagiste";
  if (industry === "peche" || industry === "tourisme") return "restaurant";
  if (industry === "acericole") return "cafe";
  if (industry === "maritime") return "transport";
  if (industry === "residentiel") return "immobilier";
  return "cafe";
}

/**
 * Génère la liste des entreprises du comté.
 * @returns Liste des entreprises du comté.
 */
export function countyFirms(): CountyFirm[] {
  const firms: CountyFirm[] = [];
  for (const v of VILLAGES) {
    const { cx, cz, ang, dirX, dirZ, perpX, perpZ } = villageAxis(v);
    const side = inlandSide(v);
    const setback = villageSetback(v) + 8;
    const type = industryFirm(v.industry);
    const distMultiplier = type === "transport" ? 96 : 58;

    const a = pushOffRoad(
      cx + dirX * distMultiplier + perpX * side * (setback + (type === "transport" ? 12 : 0)),
      cz + dirZ * distMultiplier + perpZ * side * (setback + (type === "transport" ? 12 : 0)),
      16
    );

    firms.push({
      id: `biz_${v.id}`,
      type,
      name: `${TRADE_NAMES[type]} ${v.name}`,
      village: v.name,
      villageId: v.id,
      x: a.x,
      z: a.z,
      yaw: -ang + (side > 0 ? Math.PI : 0),
    });

    if (v.type === "ville") {
      const extra: FirmType = v.population > 8000 ? "bar" : "garage";
      const b = pushOffRoad(
        cx - dirX * 42 + perpX * -side * (setback + 8),
        cz - dirZ * 42 + perpZ * -side * (setback + 8),
        14
      );
      firms.push({
        id: `biz2_${v.id}`,
        type: extra,
        name: `${TRADE_NAMES[extra]} ${v.name}`,
        village: v.name,
        villageId: v.id,
        x: b.x,
        z: b.z,
        yaw: -ang + (side < 0 ? Math.PI : 0),
      });
    }
  }
  return firms;
}

/**
 * Détermine le type de magasin associé à une entreprise.
 * @param type - Type de l'entreprise.
 * @returns Type de magasin ou `null`.
 */
export function shopKindForFirm(type: FirmType): "depanneur" | "food" | "quincaillerie" | null {
  if (type === "depanneur") return "depanneur";
  if (type === "cafe" || type === "restaurant" || type === "bar") return "food";
  if (type === "garage" || type === "construction") return "quincaillerie";
  return null;
}

/**
 * Calcule la prochaine vente pour une entreprise.
 * @param firm - Entreprise concernée.
 * @param elapsed - Temps écoulé (en unités de jeu).
 * @returns Objet avec `take` (revenu), `tax` (taxe), et `sold` (article vendu).
 */
export function nextFirmSale(firm: Firm, elapsed: number): { take: number; tax: number; sold?: string } {
  const month = gameMonth(elapsed);
  const factor = seasonalFactor(firm.type, month);
  const staff = firm.staff ?? 0;

  // Applique les multiplicateurs des événements
  let eventRevenueMultiplier = 1;
  for (const event of firm.activeEvents) {
    if (event.effect.revenueMultiplier) {
      eventRevenueMultiplier *= event.effect.revenueMultiplier;
    }
  }

  const spec = firmSpec(firm.type);
  let take = (spec.model === "comptoir" ? 11 : 18) + staff * 7;
  take *= factor * eventRevenueMultiplier;

  // Bonus de réputation
  take *= 1 + (firm.reputation - 3) * 0.1; // +10% par étoile au-dessus de 3

  // Bonus de traits
  if (firm.traits.includes("luxueux")) take *= 1.15;
  if (firm.traits.includes("rapide")) take *= 1.1;
  if (firm.traits.includes("ecologique")) take *= 1.05;

  // Bonus de compétences du personnel
  if (firm.staffSkills.includes("vendeur_charismatique")) take *= 1.2;
  if (firm.staffSkills.includes("chef_etoile") && spec.model === "comptoir") take *= 1.25;

  let sold: string | undefined;
  const stockKeys = Object.keys(firm.stock).filter((k) => (firm.stock[k] ?? 0) > 0);
  if (stockKeys.length > 0) {
    sold = stockKeys[Math.floor(Math.random() * stockKeys.length)];
    take += (itemById(sold)?.price ?? 8) * 0.85;
  }

  // Variabilité aléatoire
  take = Math.max(0, Math.round(take + Math.random() * 9 - staff * 2));

  // Met à jour les statistiques
  firm.lifetimeRevenue += take;
  firm.lifetimeCustomers += 1;
  firm.lastSaleTimestamp = elapsed;

  // Ajoute un avis client aléatoirement (1 chance sur 5)
  if (Math.random() < 0.2) {
    firm.reviews.push(generateRandomReview(firm));
    updateCustomerSatisfaction(firm);
  }

  // Met à jour les quêtes
  updateQuests(firm, "sale");

  return { take, tax: saleTax(take), sold };
}

/**
 * Trouve l'entreprise du comté la plus proche des coordonnées données.
 * @param list - Liste des entreprises du comté.
 * @param x - Coordonnée X.
 * @param z - Coordonnée Z.
 * @param max - Distance maximale (par défaut 8).
 * @returns Entreprise la plus proche ou `null`.
 */
export function nearestCountyFirm(list: CountyFirm[], x: number, z: number, maxDistance = 8): CountyFirm | null {
  let nearestFirm: CountyFirm | null = null;
  let minDistance = maxDistance;

  for (const firm of list) {
    const distance = Math.hypot(x - firm.x, z - firm.z);
    if (distance < minDistance) {
      minDistance = distance;
      nearestFirm = firm;
    }
  }

  return nearestFirm;
}