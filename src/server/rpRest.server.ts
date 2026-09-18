/**
<<<<<<< HEAD
 * ═══════════════════════════════════════════════════════════════════════════
 *  REST RP v3.0 — TROXTWORLD / COMTÉ DE PORTNEUF (Québec)
 *  src/server/rpRest.server.ts
 *  Système de vie complet : Fiscalité TPS/TVQ, SAAQ, CSR, Desjardins, REQ,
 *  MAPAQ, RACJ, TAL, SPVQ/SQ, Hydro-Québec, Salaires réels du Québec.
 *  Sécurité : Constant-Time Auth, Rate-Limit, Anti-Duplication, Payload Cap.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ADMIN_KEY } from "@/intellectus/store.server";

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONSTANTES FISCALES ET LÉGALES DU QUÉBEC
// ═══════════════════════════════════════════════════════════════════════════

export const QC_TAX = {
  TPS: 0.05,             // Taxe de vente fédérale (5 %)
  TVQ: 0.09975,          // Taxe de vente du Québec (9,975 %)
  TOTAL: 0.14975,        // Taxes combinées applicables
  INCOME_QC_LOW: 0.14,   // Impôt provincial ≤ 51 780 $
  INCOME_QC_MID: 0.19,   // Impôt provincial ≤ 103 545 $
  INCOME_FED_LOW: 0.15,  // Impôt fédéral ≤ 55 867 $
  RRQ: 0.064,            // Régime rentes Québec
  RQAP: 0.00494,         // Régime québécois d'assurance parentale
  AE: 0.0132,            // Assurance-emploi fédérale
};

export const SAAQ_LIMITS = {
  MAX_DEMERIT_POINTS: 15,       // Suspension automatique à 15 points
  SUSPENSION_DURATION_MS: 3 * 30 * 24 * 60 * 60 * 1000, // 3 mois de suspension
  RESET_PERIOD_MS: 2 * 365 * 24 * 60 * 60 * 1000,       // Réinitialisation aux 2 ans
  DEFAULT_LICENSE_FEE: 91,      // Renouvellement classe 5
  PROBATION_MAX_POINTS: 8,      // Permis probatoire = 8 pts max
};

export const CSR_INFRACTIONS = new Map<string, { article: string; fine: number; points: number; description: string }>([
  ["exces_10", { article: "CSR 328", fine: 78, points: 1, description: "Excès de 1-20 km/h" }],
  ["exces_30", { article: "CSR 328", fine: 165, points: 2, description: "Excès de 21-30 km/h" }],
  ["exces_45", { article: "CSR 328", fine: 260, points: 3, description: "Excès de 31-45 km/h" }],
  ["exces_60", { article: "CSR 328", fine: 470, points: 5, description: "Excès de 46-60 km/h (Grand excès)" }],
  ["stop_ignore", { article: "CSR 368", fine: 200, points: 3, description: "A brûlé un panneau d'arrêt" }],
  ["feu_rouge", { article: "CSR 359", fine: 200, points: 3, description: "Passage sur feu rouge" }],
  ["cellulaire", { article: "CSR 439.1", fine: 500, points: 5, description: "Cellulaire au volant" }],
  ["ceinture", { article: "CSR 396", fine: 115, points: 3, description: "Sans ceinture de sécurité" }],
  ["alcool_08", { article: "C.cr 320.14", fine: 1500, points: 12, description: "Alcool au volant (>0,08)" }],
  ["conduite_dangereuse", { article: "C.cr 320.13", fine: 2500, points: 12, description: "Conduite dangereuse" }],
  ["delit_de_fuite", { article: "C.cr 320.16", fine: 3000, points: 12, description: "Délit de fuite" }],
  ["stationnement", { article: "Muni 4-2", fine: 42, points: 0, description: "Stationnement interdit" }],
]);

// ═══════════════════════════════════════════════════════════════════════════
// 2. INTERFACES DES DONNÉES RP
// ═══════════════════════════════════════════════════════════════════════════
=======
 * REST RP — personnages, inventaire, métiers, armes, véhicules, journaux.
 * Processus Node, sécurisé (Anti-Duplication, Constant-Time Auth) et optimisé pour le multijoueur.
 */
import { ADMIN_KEY } from "@/intellectus/store.server";

// ==========================================
// INTERFACES ET DTOs TYPÉS
// ==========================================
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

export interface CharacterDTO {
  id: string;
  userId: string;
  name: string;
  gender: "male" | "female";
  build: string;
  skinTone: number;
  hairStyle: string;
  hairColor: number;
  outfitTop: string;
  outfitBottom: string;
  shoes: string;
  job: string;
  cash: number;
  bank: number;
  wanted: number;
<<<<<<< HEAD
  demeritPoints: number;
  licenseValid: boolean;
  licenseSuspendedUntil: number | null;
  creditScore: number;
  createdAt: number;
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  updatedAt: number;
}

export interface InventoryItemDTO {
  id: string;
  characterId: string;
  itemId: string;
  itemType: string;
  quantity: number;
  durability: number;
<<<<<<< HEAD
  serialNumber?: string;
  acquiredAt: number;
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

export interface VehicleDTO {
  id: string;
  characterId: string;
  vehicleType: string;
  licensePlate: string;
  color: string;
<<<<<<< HEAD
  vin: string;
  registrationExpiry: number;
  insured: boolean;
  odometerKm: number;
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

export interface WeaponDTO {
  id: string;
  name: string;
<<<<<<< HEAD
  category: "melee" | "poing" | "fusil" | "non-letal" | "outil";
  damage: number;
  range: number;
  price: number;
  legal: "libre" | "sans_restriction" | "restreinte" | "prohibee";
  permitRequired: string | null;
=======
  category: string;
  damage: number;
  range: number;
  price: number;
  legal: string;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

export interface JobDTO {
  id: string;
  name: string;
<<<<<<< HEAD
  hourlyWage: number;
  hint: string;
  requiresPermit: string | null;
  category: "public" | "prive" | "criminel";
=======
  salary: number;
  hint: string;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

export interface EmploymentDTO {
  id: string;
  characterId: string;
  jobId: string;
<<<<<<< HEAD
  hourlyWage: number;
  totalHoursWorked: number;
  hiredAt: number;
  firedAt: number | null;
  lastPaycheckAt: number;
}

export interface TicketDTO {
  id: string;
  characterId: string;
  infractionId: string;
  article: string;
  fine: number;
  demeritPoints: number;
  paid: boolean;
  issuedAt: number;
  paidAt: number | null;
  issuingOfficerId: string;
=======
  salary: number;
  hiredAt: number;
  firedAt: number | null;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

export interface GameLogDTO {
  id: string;
  characterId: string;
  type: string;
  message: string;
  timestamp: number;
}

<<<<<<< HEAD
// ═══════════════════════════════════════════════════════════════════════════
// 3. CATALOGUES OFFICIELS DU QUÉBEC
// ═══════════════════════════════════════════════════════════════════════════

export const JOB_CATALOG: readonly JobDTO[] = [
  { id: "civil", name: "Civil sans emploi", hourlyWage: 0, hint: "Prestations d'aide sociale disponibles.", requiresPermit: null, category: "prive" },
  { id: "policier_spvq", name: "Policier SPVQ", hourlyWage: 42.75, hint: "Service de police de la Ville de Québec.", requiresPermit: "ecole_nationale_police", category: "public" },
  { id: "policier_sq", name: "Agent SQ", hourlyWage: 44.20, hint: "Sûreté du Québec - Postes MRC.", requiresPermit: "ecole_nationale_police", category: "public" },
  { id: "ambulancier_uu", name: "Paramédic Urgences-santé", hourlyWage: 34.50, hint: "Coopérative des Techniciens Ambulanciers du Québec.", requiresPermit: "diplome_sante", category: "public" },
  { id: "pompier_scq", name: "Pompier SIM/SPCIQ", hourlyWage: 38.90, hint: "Service de protection contre les incendies.", requiresPermit: "diplome_pompier", category: "public" },
  { id: "infirmier_cisss", name: "Infirmier CIUSSS", hourlyWage: 32.15, hint: "CHU de Québec - Hôtel-Dieu.", requiresPermit: "oiiq", category: "public" },
  { id: "mecanicien", name: "Mécanicien CAA", hourlyWage: 28.50, hint: "Garage certifié CAA-Québec.", requiresPermit: "dep_mecanique", category: "prive" },
  { id: "camionneur_c", name: "Camionneur (Classe 1)", hourlyWage: 26.75, hint: "Transports Bourassa - Portneuf.", requiresPermit: "permis_classe_1", category: "prive" },
  { id: "livreur_amazon", name: "Livreur Amazon Flex", hourlyWage: 22.00, hint: "Colis Est-du-Québec.", requiresPermit: "permis_c", category: "prive" },
  { id: "taxi", name: "Chauffeur Taxi Québec", hourlyWage: 19.85, hint: "Route 138 et villages MRC Portneuf.", requiresPermit: "permis_c", category: "prive" },
  { id: "pecheur_pro", name: "Pêcheur commercial", hourlyWage: 24.00, hint: "Fleuve Saint-Laurent, permis MAPAQ.", requiresPermit: "permis_peche_com", category: "prive" },
  { id: "avocat", name: "Avocat (Barreau)", hourlyWage: 85.00, hint: "Palais de justice de Portneuf.", requiresPermit: "barreau_qc", category: "prive" },
  { id: "commercant", name: "Commerçant REQ", hourlyWage: 25.00, hint: "Détaillant enregistré NEQ.", requiresPermit: "neq_actif", category: "prive" },
  { id: "agriculteur", name: "Agriculteur UPA", hourlyWage: 20.00, hint: "Union des producteurs agricoles.", requiresPermit: "upa_membre", category: "prive" },
  { id: "bucheron", name: "Bûcheron forestier", hourlyWage: 26.00, hint: "Zecs de Portneuf.", requiresPermit: "permis_forestier", category: "prive" },
  { id: "sqdc_employe", name: "Conseiller SQDC", hourlyWage: 21.50, hint: "Société québécoise du cannabis.", requiresPermit: "casier_vierge", category: "public" },
  { id: "saq_conseiller", name: "Conseiller SAQ", hourlyWage: 23.75, hint: "Société des alcools du Québec.", requiresPermit: "casier_vierge", category: "public" },
  { id: "criminel", name: "Criminel", hourlyWage: 0, hint: "Aucune paie légale. Attention à la SQ.", requiresPermit: null, category: "criminel" },
];

export const WEAPON_CATALOG: readonly WeaponDTO[] = [
  { id: "poing-americain", name: "Poing américain", category: "melee", damage: 8, range: 1, price: 35, legal: "prohibee", permitRequired: null },
  { id: "couteau-chasse", name: "Couteau de chasse", category: "melee", damage: 15, range: 1.2, price: 45, legal: "libre", permitRequired: null },
  { id: "batte-baseball", name: "Batte de baseball", category: "melee", damage: 18, range: 1.6, price: 25, legal: "libre", permitRequired: null },
  { id: "machette", name: "Machette", category: "melee", damage: 26, range: 1.5, price: 60, legal: "libre", permitRequired: null },
  { id: "hache-pompier", name: "Hache de pompier", category: "melee", damage: 34, range: 1.7, price: 90, legal: "libre", permitRequired: null },
  { id: "glock-19", name: "Glock 19 9mm", category: "poing", damage: 28, range: 40, price: 620, legal: "restreinte", permitRequired: "PAAF_restreinte" },
  { id: "revolver-357", name: "Revolver Smith .357", category: "poing", damage: 42, range: 35, price: 740, legal: "restreinte", permitRequired: "PAAF_restreinte" },
  { id: "desert-eagle", name: "Desert Eagle .50AE", category: "poing", damage: 55, range: 45, price: 980, legal: "restreinte", permitRequired: "PAAF_restreinte" },
  { id: "fusil-chasse-12", name: "Fusil de chasse calibre 12", category: "fusil", damage: 48, range: 28, price: 420, legal: "sans_restriction", permitRequired: "PAAF" },
  { id: "carabine-30-30", name: "Carabine Winchester .30-30", category: "fusil", damage: 52, range: 80, price: 580, legal: "sans_restriction", permitRequired: "PAAF" },
  { id: "ar-semi-auto", name: "Fusil semi-automatique", category: "fusil", damage: 36, range: 90, price: 1100, legal: "restreinte", permitRequired: "PAAF_restreinte" },
  { id: "taser", name: "Taser X26 (SPVQ/SQ)", category: "non-letal", damage: 4, range: 6, price: 0, legal: "prohibee", permitRequired: "badge_police" },
  { id: "matraque-sq", name: "Matraque télescopique SQ", category: "non-letal", damage: 10, range: 1.4, price: 0, legal: "prohibee", permitRequired: "badge_police" },
  { id: "spray-poivre", name: "Vaporisateur poivré civil", category: "non-letal", damage: 2, range: 3, price: 18, legal: "prohibee", permitRequired: null },
  { id: "flashbang", name: "Grenade flashbang", category: "non-letal", damage: 1, range: 8, price: 0, legal: "prohibee", permitRequired: "badge_police" },
  { id: "menottes", name: "Menottes SPVQ/SQ", category: "outil", damage: 0, range: 1, price: 0, legal: "prohibee", permitRequired: "badge_police" },
];

// Index Map O(1) pour les requêtes REST
const JOB_MAP = new Map<string, JobDTO>(JOB_CATALOG.map((j) => [j.id, j]));
const WEAPON_MAP = new Map<string, WeaponDTO>(WEAPON_CATALOG.map((w) => [w.id, w]));

// ═══════════════════════════════════════════════════════════════════════════
// 4. REGISTRES DE MÉMOIRE VIVE (Persistance à venir via Drizzle)
// ═══════════════════════════════════════════════════════════════════════════
=======
// ==========================================
// CATALOGUES STATIQUES INDEXÉS O(1)
// ==========================================

export const JOB_CATALOG: readonly JobDTO[] = [
  { id: "civil", name: "Civil", salary: 300, hint: "Pas de patrouille." },
  { id: "policier", name: "Policier", salary: 1200, hint: "Sûreté du Québec." },
  { id: "ambulancier", name: "Ambulancier", salary: 1100, hint: "Urgence 911." },
  { id: "mecanicien", name: "Mécanicien", salary: 900, hint: "Garage Gosselin." },
  { id: "taxi", name: "Chauffeur taxi", salary: 700, hint: "138 et villages." },
  { id: "livreur", name: "Livreur", salary: 600, hint: "Colis du comté." },
  { id: "pecheur", name: "Pêcheur", salary: 650, hint: "Fleuve et rivières." },
  { id: "avocat", name: "Avocat", salary: 1500, hint: "Palais, Portneuf." },
  { id: "commercant", name: "Commerçant", salary: 800, hint: "Comptoir et REQ." },
  { id: "criminel", name: "Criminel", salary: 0, hint: "Pas de paie." },
];

export const WEAPON_CATALOG: readonly WeaponDTO[] = [
  { id: "poing-americain", name: "Poing américain", category: "melee", damage: 8, range: 1, price: 35, legal: "prohibee" },
  { id: "couteau-chasse", name: "Couteau de chasse", category: "melee", damage: 15, range: 1.2, price: 45, legal: "libre" },
  { id: "batte-baseball", name: "Batte de baseball", category: "melee", damage: 18, range: 1.6, price: 25, legal: "libre" },
  { id: "machette", name: "Machette", category: "melee", damage: 26, range: 1.5, price: 60, legal: "libre" },
  { id: "hache-pompier", name: "Hache de pompier", category: "melee", damage: 34, range: 1.7, price: 90, legal: "libre" },
  { id: "glock-19", name: "Glock 19", category: "poing", damage: 28, range: 40, price: 620, legal: "restreinte" },
  { id: "revolver-357", name: "Revolver .357", category: "poing", damage: 42, range: 35, price: 740, legal: "restreinte" },
  { id: "desert-eagle", name: "Desert Eagle", category: "poing", damage: 55, range: 45, price: 980, legal: "restreinte" },
  { id: "fusil-chasse-12", name: "Fusil 12", category: "fusil", damage: 48, range: 28, price: 420, legal: "sans_restriction" },
  { id: "carabine-30-30", name: "Carabine .30-30", category: "fusil", damage: 52, range: 80, price: 580, legal: "sans_restriction" },
  { id: "ar-semi-auto", name: "Semi-auto", category: "fusil", damage: 36, range: 90, price: 1100, legal: "restreinte" },
  { id: "taser", name: "Taser", category: "non-letal", damage: 4, range: 6, price: 0, legal: "libre" },
  { id: "matraque-sq", name: "Matraque SQ", category: "non-letal", damage: 10, range: 1.4, price: 0, legal: "libre" },
  { id: "spray-poivre", name: "Spray poivre", category: "non-letal", damage: 2, range: 3, price: 18, legal: "libre" },
  { id: "flashbang", name: "Flashbang", category: "non-letal", damage: 1, range: 8, price: 0, legal: "libre" },
  { id: "menottes", name: "Menottes", category: "outil", damage: 0, range: 1, price: 0, legal: "libre" },
];

// Indexation Map O(1) au démarrage pour éviter de scanner les tableaux à chaque requête REST
const JOB_MAP = new Map<string, JobDTO>(JOB_CATALOG.map((j) => [j.id, j]));
const WEAPON_MAP = new Map<string, WeaponDTO>(WEAPON_CATALOG.map((w) => [w.id, w]));

// ==========================================
// REGISTRE DES BASES DE DONNÉES EN RAM
// ==========================================
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

const characters = new Map<string, CharacterDTO>();
const inventory = new Map<string, InventoryItemDTO[]>();
const vehicles = new Map<string, VehicleDTO[]>();
const employments = new Map<string, EmploymentDTO[]>();
<<<<<<< HEAD
const tickets = new Map<string, TicketDTO[]>();
const logs = new Map<string, GameLogDTO[]>();

// ═══════════════════════════════════════════════════════════════════════════
// 5. UTILITAIRES & SÉCURITÉ (Anti-Cheat, Rate-Limit, Constant-Time)
// ═══════════════════════════════════════════════════════════════════════════

const MAX_REST_PAYLOAD_SIZE = 128 * 1024; // 128 Ko max
const RATE_LIMIT_WINDOW_MS = 60_000;      // Fenêtre glissante d'1 minute
const RATE_LIMIT_MAX_REQ = 90;            // Max 90 requêtes/minute par IP

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
=======
const logs = new Map<string, GameLogDTO[]>();

// ==========================================
// UTILITAIRES ET VALIDEURS SÉCURISÉS (ANTI-CHEAT)
// ==========================================

const MAX_REST_PAYLOAD_SIZE = 128 * 1024; // 128 Ko max (Garde anti-crash)

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

const CORS_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
<<<<<<< HEAD
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateNEQ(): string {
  return `${Math.floor(1000000000 + Math.random() * 8999999999)}`;
}

function generateVIN(): string {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ1234567890";
  let vin = "";
  for (let i = 0; i < 17; i++) vin += chars[Math.floor(Math.random() * chars.length)];
  return vin;
}

function generatePlate(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "0123456789";
  let plate = "";
  for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 3; i++) plate += digits[Math.floor(Math.random() * digits.length)];
  return plate;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

=======
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

/**
 * Valide qu'un nombre est bien un entier positif ou nul (Empêche la duplication d'objets/argent)
 */
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
function validatePositiveInt(val: unknown, fallback: number, max = 100_000_000): number {
  if (typeof val !== "number" || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(Math.floor(val), max));
}

<<<<<<< HEAD
=======
/**
 * Comparaison temporelle constante (Constant-Time comparison) anti-timing attacks
 */
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

<<<<<<< HEAD
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQ) return false;
  bucket.count++;
  return true;
}

function pushLog(characterId: string, type: string, message: string): void {
  const row: GameLogDTO = { id: uid("log"), characterId, type, message, timestamp: Date.now() };
  const list = logs.get(characterId) ?? [];
  logs.set(characterId, [row, ...list].slice(0, 50));
}

/**
 * Calcule le prix total avec les taxes fédérales et provinciales (TPS + TVQ).
 */
export function withTaxes(price: number): { subtotal: number; tps: number; tvq: number; total: number } {
  const subtotal = Math.round(price * 100) / 100;
  const tps = Math.round(subtotal * QC_TAX.TPS * 100) / 100;
  const tvq = Math.round(subtotal * QC_TAX.TVQ * 100) / 100;
  const total = Math.round((subtotal + tps + tvq) * 100) / 100;
  return { subtotal, tps, tvq, total };
}

/**
 * Salaire net après impôts québécois et fédéraux + RRQ + AE + RQAP
 */
export function netPay(grossAmount: number): number {
  const rrq = grossAmount * QC_TAX.RRQ;
  const ae = grossAmount * QC_TAX.AE;
  const rqap = grossAmount * QC_TAX.RQAP;
  const impotQc = grossAmount * QC_TAX.INCOME_QC_LOW;
  const impotFed = grossAmount * QC_TAX.INCOME_FED_LOW;
  const net = grossAmount - rrq - ae - rqap - impotQc - impotFed;
  return Math.max(0, Math.round(net * 100) / 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. LOGIQUE MÉTIER
// ═══════════════════════════════════════════════════════════════════════════
=======
function pushLog(characterId: string, type: string, message: string): void {
  const row: GameLogDTO = { id: uid("log"), characterId, type, message, timestamp: Date.now() };
  const list = logs.get(characterId) ?? [];
  logs.set(characterId, [row, ...list].slice(0, 50)); // Limitation historique logs
}

// ==========================================
// LOGIQUE COEUR
// ==========================================
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

export function upsertCharacter(c: CharacterDTO): void {
  characters.set(c.id, { ...c, updatedAt: Date.now() });
}

export function applyCharacterSnapshot(body: Record<string, unknown>): void {
  const ch = body.character;
  if (!ch || typeof ch !== "object") return;
  const c = ch as CharacterDTO;
  if (!c.id || !c.name) return;

<<<<<<< HEAD
  const existing = characters.get(c.id);
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  upsertCharacter({
    id: c.id,
    userId: c.userId || c.id,
    name: String(c.name).slice(0, 64),
    gender: c.gender === "female" ? "female" : "male",
    build: c.build || "normal",
    skinTone: Number(c.skinTone) || 0,
    hairStyle: String(c.hairStyle ?? "court"),
    hairColor: Number(c.hairColor) || 0,
    outfitTop: String(c.outfitTop ?? "canadienne"),
    outfitBottom: String(c.outfitBottom ?? "canadienne"),
    shoes: String(c.shoes ?? "bottes"),
    job: String(c.job ?? "civil"),
    cash: validatePositiveInt(c.cash, 0),
    bank: validatePositiveInt(c.bank, 0),
    wanted: validatePositiveInt(c.wanted, 0, 5),
<<<<<<< HEAD
    demeritPoints: validatePositiveInt(c.demeritPoints ?? existing?.demeritPoints ?? 0, 0, 30),
    licenseValid: c.licenseValid ?? existing?.licenseValid ?? true,
    licenseSuspendedUntil: c.licenseSuspendedUntil ?? existing?.licenseSuspendedUntil ?? null,
    creditScore: validatePositiveInt(c.creditScore ?? existing?.creditScore ?? 680, 300, 900),
    createdAt: existing?.createdAt ?? Date.now(),
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    updatedAt: Date.now(),
  });

  if (Array.isArray(body.inventory)) inventory.set(c.id, body.inventory as InventoryItemDTO[]);
  if (Array.isArray(body.vehicles)) vehicles.set(c.id, body.vehicles as VehicleDTO[]);
  if (Array.isArray(body.logs)) logs.set(c.id, body.logs as GameLogDTO[]);
<<<<<<< HEAD
  if (Array.isArray(body.tickets)) tickets.set(c.id, body.tickets as TicketDTO[]);
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

  if (body.employment && typeof body.employment === "object") {
    const e = body.employment as EmploymentDTO;
    employments.set(c.id, [{ ...e, characterId: c.id, firedAt: e.firedAt ?? null }]);
  }
}

<<<<<<< HEAD
/**
 * Applique une contravention CSR à un citoyen.
 * Suspend automatiquement le permis à 15 points d'inaptitude.
 */
export function issueTicket(characterId: string, infractionId: string, officerId: string): TicketDTO | null {
  const character = characters.get(characterId);
  const infraction = CSR_INFRACTIONS.get(infractionId);
  if (!character || !infraction) return null;

  const ticket: TicketDTO = {
    id: uid("cit"),
    characterId,
    infractionId,
    article: infraction.article,
    fine: infraction.fine,
    demeritPoints: infraction.points,
    paid: false,
    issuedAt: Date.now(),
    paidAt: null,
    issuingOfficerId: officerId,
  };

  const newPoints = character.demeritPoints + infraction.points;
  const isSuspended = newPoints >= SAAQ_LIMITS.MAX_DEMERIT_POINTS;

  upsertCharacter({
    ...character,
    demeritPoints: newPoints,
    licenseValid: !isSuspended,
    licenseSuspendedUntil: isSuspended ? Date.now() + SAAQ_LIMITS.SUSPENSION_DURATION_MS : character.licenseSuspendedUntil,
  });

  const list = tickets.get(characterId) ?? [];
  tickets.set(characterId, [ticket, ...list].slice(0, 100));
  pushLog(characterId, "csr_ticket", `${infraction.article} · ${infraction.description} · ${infraction.fine}$ · ${infraction.points}pts`);

  if (isSuspended) {
    pushLog(characterId, "saaq_suspension", `SAAQ · Permis suspendu (${newPoints} pts) - 3 mois`);
  }

  return ticket;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. CONTRÔLEUR HTTP REST
// ═══════════════════════════════════════════════════════════════════════════
=======
// ==========================================
// CONTROLEUR HTTP REST RP
// ==========================================
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

export async function handleRpRest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

<<<<<<< HEAD
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
             request.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(ip)) {
    return json({ error: "rate_limit_exceeded", retryAfterMs: RATE_LIMIT_WINDOW_MS }, 429);
  }

=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const segs = path.split("/").filter(Boolean);

  const key = request.headers.get("x-admin-key") ?? "";
  const isAuthed = ADMIN_KEY === "troxt-dev-key" || constantTimeCompare(key, ADMIN_KEY);

<<<<<<< HEAD
  // ═══════════════════════ ENDPOINTS GET STATIQUES ═══════════════════════
=======
  // 1. Endpoints Catalogues (O(1))
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  if (method === "GET" && path === "/api/weapons") return json(WEAPON_CATALOG);
  if (method === "GET" && segs[0] === "api" && segs[1] === "weapons" && segs[2]) {
    const w = WEAPON_MAP.get(segs[2]);
    return w ? json(w) : json({ error: "Arme introuvable" }, 404);
  }
  if (method === "GET" && path === "/api/jobs") return json(JOB_CATALOG);
  if (method === "GET" && segs[0] === "api" && segs[1] === "jobs" && segs[2]) {
    const j = JOB_MAP.get(segs[2]);
    return j ? json(j) : json({ error: "Métier introuvable" }, 404);
  }

<<<<<<< HEAD
  if (method === "GET" && path === "/api/csr") {
    return json(Array.from(CSR_INFRACTIONS.entries()).map(([id, data]) => ({ id, ...data })));
  }

  if (method === "GET" && path === "/api/fiscal/taxes") {
    return json(QC_TAX);
  }

=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  if (method === "GET" && path === "/api/characters") {
    return json(Array.from(characters.values()));
  }

<<<<<<< HEAD
  // ═══════════════════════ ENDPOINTS PERSONNAGE ═══════════════════════
=======
  // 2. Traitement Personnage & Dépendances
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  if (segs[0] === "api" && segs[1] === "characters" && segs[2]) {
    const id = segs[2];
    const sub = segs[3];
    const character = characters.get(id);

    if (method === "GET" && !sub) {
      if (!character) return json({ error: "Personnage introuvable" }, 404);
      return json({
        ...character,
        inventory: inventory.get(id) ?? [],
        vehicles: vehicles.get(id) ?? [],
<<<<<<< HEAD
        tickets: tickets.get(id) ?? [],
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        employment: (employments.get(id) ?? []).find((e) => !e.firedAt) ?? null,
      });
    }

    if (method === "GET" && sub === "inventory") return json(inventory.get(id) ?? []);
    if (method === "GET" && sub === "vehicles") return json(vehicles.get(id) ?? []);
    if (method === "GET" && sub === "logs") return json((logs.get(id) ?? []).slice(0, 100));
    if (method === "GET" && sub === "employment") return json(employments.get(id) ?? []);
<<<<<<< HEAD
    if (method === "GET" && sub === "tickets") return json(tickets.get(id) ?? []);

    if (!isAuthed && (method === "POST" || method === "PATCH" || method === "DELETE")) {
      return json({ error: "unauthorized" }, 401);
    }

    let body: Record<string, unknown> = {};
    if (method === "POST" || method === "PATCH") {
      try {
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > MAX_REST_PAYLOAD_SIZE) return json({ error: "payload_too_large" }, 413);
=======

    // Sécurisation des mutations d'écriture
    if (!isAuthed && method === "POST") return json({ error: "unauthorized" }, 401);

    let body: Record<string, unknown> = {};
    if (method === "POST") {
      try {
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > MAX_REST_PAYLOAD_SIZE) {
          return json({ error: "payload_too_large" }, 413);
        }
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }

<<<<<<< HEAD
    // A. Inventaire (Anti-duplication stricte)
=======
    // A. Ajout d'objet en inventaire (Anti-Duplication)
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (method === "POST" && sub === "inventory") {
      const itemId = String(body.itemId ?? "").trim();
      if (!itemId) return json({ error: "itemId requis" }, 400);

<<<<<<< HEAD
      const quantity = validatePositiveInt(body.quantity, 1, 10_000);
=======
      const quantity = validatePositiveInt(body.quantity, 1, 10_000); // Plage de sécurité stricte
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      const durability = validatePositiveInt(body.durability, 100, 100);

      const row: InventoryItemDTO = {
        id: uid("inv"),
        characterId: id,
        itemId,
        itemType: String(body.itemType ?? "item").slice(0, 32),
        quantity,
        durability,
<<<<<<< HEAD
        serialNumber: WEAPON_MAP.has(itemId) ? uid("SN") : undefined,
        acquiredAt: Date.now(),
      };

      const list = inventory.get(id) ?? [];
      inventory.set(id, [row, ...list].slice(0, 120));
=======
      };

      const list = inventory.get(id) ?? [];
      inventory.set(id, [row, ...list].slice(0, 80));
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      pushLog(id, "inventory", `+ ${quantity}x ${itemId}`);
      return json(row, 201);
    }

<<<<<<< HEAD
    // B. Véhicule avec SAAQ (VIN + plaque + assurance)
=======
    // B. Obtention de véhicule
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (method === "POST" && sub === "vehicles") {
      const vehicleType = String(body.vehicleType ?? "").trim();
      if (!vehicleType) return json({ error: "vehicleType requis" }, 400);

      const row: VehicleDTO = {
        id: uid("veh"),
        characterId: id,
        vehicleType,
<<<<<<< HEAD
        licensePlate: String(body.licensePlate ?? generatePlate()).slice(0, 12).toUpperCase(),
        color: String(body.color ?? "gris").slice(0, 32),
        vin: generateVIN(),
        registrationExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000, // Immat. 1 an
        insured: Boolean(body.insured ?? true),
        odometerKm: validatePositiveInt(body.odometerKm, 0, 999_999),
      };

      vehicles.set(id, [row, ...(vehicles.get(id) ?? [])]);
      pushLog(id, "saaq_vehicle", `Immatriculé SAAQ · ${row.vehicleType} · ${row.licensePlate}`);
      return json(row, 201);
    }

    // C. Emploi RP (calcul salaire net avec impôts)
=======
        licensePlate: String(body.licensePlate ?? `PNF ${Math.floor(Math.random() * 900) + 100}`).slice(0, 12),
        color: String(body.color ?? "vert-rang").slice(0, 32),
      };

      vehicles.set(id, [row, ...(vehicles.get(id) ?? [])]);
      pushLog(id, "vehicle", `Véhicule généré : ${row.vehicleType}`);
      return json(row, 201);
    }

    // C. Prise d'emploi RP
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (method === "POST" && sub === "employment") {
      const jobId = String(body.jobId ?? "").trim();
      const job = JOB_MAP.get(jobId);
      if (!job) return json({ error: "Métier introuvable" }, 404);

      const current = employments.get(id) ?? [];
      if (current.some((e) => e.jobId === jobId && !e.firedAt)) {
        return json({ error: "Déjà en poste" }, 409);
      }

      const closed = current.map((e) => (e.firedAt ? e : { ...e, firedAt: Date.now() }));
      const row: EmploymentDTO = {
        id: uid("emp"),
        characterId: id,
        jobId,
<<<<<<< HEAD
        hourlyWage: job.hourlyWage,
        totalHoursWorked: 0,
        hiredAt: Date.now(),
        firedAt: null,
        lastPaycheckAt: Date.now(),
=======
        salary: job.salary,
        hiredAt: Date.now(),
        firedAt: null,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      };

      employments.set(id, [row, ...closed]);
      if (character) upsertCharacter({ ...character, job: jobId });
<<<<<<< HEAD
      pushLog(id, "job_hired", `Embauché · ${job.name} · ${job.hourlyWage}$/h`);
      return json(row, 201);
    }

    // D. Émission de contravention SPVQ/SQ
    if (method === "POST" && sub === "ticket") {
      const infractionId = String(body.infractionId ?? "").trim();
      const officerId = String(body.officerId ?? "SQ-0001").trim();

      const ticket = issueTicket(id, infractionId, officerId);
      if (!ticket) return json({ error: "Infraction ou personnage invalide" }, 400);
      return json(ticket, 201);
    }

    // E. Paiement de contravention
    if (method === "POST" && sub === "pay-ticket") {
      const ticketId = String(body.ticketId ?? "").trim();
      const list = tickets.get(id) ?? [];
      const ticketIndex = list.findIndex((t) => t.id === ticketId);
      if (ticketIndex === -1) return json({ error: "Constat introuvable" }, 404);
      if (!character) return json({ error: "Personnage introuvable" }, 404);

      const ticketToPay = list[ticketIndex];
      if (ticketToPay.paid) return json({ error: "Déjà payé" }, 409);
      if (character.cash + character.bank < ticketToPay.fine) {
        return json({ error: "Fonds insuffisants" }, 402);
      }

      // Prélèvement (espèces d'abord, ensuite compte)
      let newCash = character.cash;
      let newBank = character.bank;
      if (character.cash >= ticketToPay.fine) {
        newCash -= ticketToPay.fine;
      } else {
        newBank -= (ticketToPay.fine - character.cash);
        newCash = 0;
      }

      list[ticketIndex] = { ...ticketToPay, paid: true, paidAt: Date.now() };
      tickets.set(id, list);
      upsertCharacter({ ...character, cash: newCash, bank: newBank });
      pushLog(id, "ticket_paid", `Constat payé · ${ticketToPay.article} · ${ticketToPay.fine}$`);

      return json({ success: true, cash: newCash, bank: newBank });
    }
  }

  // ═══════════════════════ CRÉATION DE CITOYEN ═══════════════════════
=======
      pushLog(id, "job", `Emploi · ${job.name}`);
      return json(row, 201);
    }
  }

  // 3. Création de Personnage (Nouveau citoyen)
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  if (method === "POST" && path === "/api/characters") {
    if (!isAuthed) return json({ error: "unauthorized" }, 401);

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const name = String(body.name ?? "").trim();
    if (name.length < 3 || name.length > 64) {
      return json({ error: "Le nom doit contenir entre 3 et 64 caractères." }, 400);
    }

    const id = uid("cit");
    const row: CharacterDTO = {
      id,
      userId: String(body.userId ?? id).slice(0, 64),
      name,
      gender: body.gender === "female" ? "female" : "male",
      build: String(body.build ?? "normal").slice(0, 16),
      skinTone: validatePositiveInt(body.skinTone, 0, 7),
      hairStyle: String(body.hairStyle ?? "court").slice(0, 32),
      hairColor: validatePositiveInt(body.hairColor, 0, 7),
      outfitTop: String(body.outfitTop ?? body.outfit ?? "canadienne").slice(0, 32),
      outfitBottom: String(body.outfitBottom ?? "canadienne").slice(0, 32),
      shoes: String(body.shoes ?? "bottes").slice(0, 32),
      job: "civil",
      cash: 250,
      bank: 2500,
      wanted: 0,
<<<<<<< HEAD
      demeritPoints: 0,
      licenseValid: true,
      licenseSuspendedUntil: null,
      creditScore: 680,
      createdAt: Date.now(),
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      updatedAt: Date.now(),
    };

    upsertCharacter(row);
    inventory.set(id, []);
    vehicles.set(id, []);
<<<<<<< HEAD
    tickets.set(id, []);
    pushLog(id, "req_registration", `Enregistrement REQ Citoyen · ${name}`);
=======
    pushLog(id, "create", `Enregistrement REQ Citoyen · ${name}`);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    return json(row, 201);
  }

  return json({ error: "not_found", path }, 404);
}