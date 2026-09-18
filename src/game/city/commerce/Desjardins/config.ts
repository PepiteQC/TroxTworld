/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏦 CONFIG — Caisse Desjardins du Comté de Portneuf
 * ═══════════════════════════════════════════════════════════════════════════
 * Design basé sur les normes graphiques officielles Desjardins :
 *   • Vert Desjardins : #00874E (RGB 0, 140, 83)
 *   • Logo hexagonal (alvéole) + nom Desjardins
 *   • Architecture : brique beige, grandes vitrines, bandeau vert
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════
// PALETTE COULEURS (basée normes graphiques Desjardins)
// ═══════════════════════════════════════════════════════════

export const DESJARDINS_PALETTE = {
  // ─── Couleurs officielles ───
  vertDesjardins: 0x00874e,       // Vert officiel Desjardins
  vertFonce: 0x00623a,
  vertClair: 0x2a9d63,

  // ─── Architecture extérieure ───
  briqueBeige: 0xc4b49a,
  briqueBeigeFonce: 0xa89880,
  pierreGrise: 0x9a9a94,
  betonClair: 0xbab8b0,
  vitreBleutee: 0x4a6a7a,
  cadreAlu: 0x9aa0a6,
  toitureNoire: 0x3a3e42,

  // ─── Intérieur ───
  marbre: 0xd8d4cc,
  comptoirBois: 0x6a4a32,
  comptoirDessus: 0x3a3a3e,
  murInterieur: 0xf0ede6,
  tapisVert: 0x2a6a48,
  tapisBeige: 0xbfb8a8,

  // ─── Équipements ───
  atmCorps: 0x3a4248,
  atmFacade: 0x2a3238,
  acier: 0x6a7078,
  laiton: 0xa88a40,
  cuivre: 0xb87333,

  // ─── Sécurité ───
  alarmeRouge: 0xff2030,
  ledVerte: 0x2aff7a,
  ledRouge: 0xff2a2a,

  // ─── Enseigne ───
  enseigneBlanc: 0xffffff,
  enseigneNoir: 0x1a1a1a,
} as const;

export const P = DESJARDINS_PALETTE;

// ═══════════════════════════════════════════════════════════
// CONSTANTES BANCAIRES QUÉBÉCOISES (2025)
// ═══════════════════════════════════════════════════════════

export const BANKING_CONSTANTS = {
  // ─── Horaires ───
  OPEN_HOUR: 9,
  CLOSE_HOUR: 17,
  OPEN_HOUR_FRIDAY: 9,
  CLOSE_HOUR_FRIDAY: 15, // Vendredi ferme plus tôt

  // ─── Taux officiels Desjardins 2025 ───
  PRIME_RATE: 4.45,               // Taux préférentiel
  PERSONAL_BASE_RATE: 5.95,       // Taux de base personnel
  US_PRIME_RATE: 7.50,

  // ─── Frais de compte ───
  CHEQUING_MONTHLY_FEE: 4.95,
  CHEQUING_FREE_BALANCE: 1000,
  CHEQUING_ILLIMITE_FEE: 12.95,
  CHEQUING_AVANTAGE_FEE: 25.00,
  BUSINESS_MONTHLY_FEE: 15.00,
  BUSINESS_FREE_BALANCE: 5000,

  // ─── Cartes de crédit ───
  CREDIT_CARD_RATE_PURCHASES: 20.90,
  CREDIT_CARD_RATE_CASH: 21.90,
  CREDIT_CARD_RATE_FINANCING: 19.90,
  MIN_CREDIT_PAYMENT_PERCENT: 3.0,
  MIN_CREDIT_PAYMENT_FLOOR: 10.00,

  // ─── Overdraft ───
  OVERDRAFT_LIMIT_CHEQUE: 500,
  OVERDRAFT_LIMIT_EPARGNE: 0,
  OVERDRAFT_FEE: 5.00,

  // ─── Interac ───
  INTERAC_FEE: 1.50,
  INTERAC_EXPIRY_DAYS: 30,

  // ─── GAB ───
  ATM_MAX_WITHDRAWAL: 500,        // par transaction
  ATM_DAILY_LIMIT: 1500,
  ATM_MAX_CASH: 150000,
  ATM_MIN_CASH: 5000,
  ATM_INTERAC_FEE_OTHER: 2.50,

  // ─── Voûte ───
  VAULT_CAPACITY: 2000000,
  VAULT_TIME_LOCK_MINUTES: 30,
  VAULT_MAX_ATTEMPTS: 3,

  // ─── Prêts ───
  LOAN_DEBT_RATIO_MAX: 0.39,      // 39% DET max
  LOAN_CREDIT_SCORE_MIN: 680,     // pour meilleurs taux
  LOAN_CREDIT_SCORE_STANDARD: 620,
  MORTGAGE_DOWN_PAYMENT_MIN: 0.05, // 5% minimum au QC
  MORTGAGE_MAX_TERM_YEARS: 25,
  MORTGAGE_AMORTIZATION_MAX: 30,

  // ─── CELI ───
  CELI_ANNUAL_ROOM: 7000,         // 2024, indexé
  REER_ANNUAL_RATE: 0.18,         // 18% du revenu gagné
  REER_MAX_ANNUAL: 31560,         // 2024

  // ─── Impôts ───
  FEDERAL_TAX_RATE: 0.15,
  QUEBEC_TAX_RATE: 0.14,
  RRQ_RATE: 0.0640,               // Régie des rentes du Québec
  AE_RATE: 0.0163,                // Assurance-emploi
  CAPITAL_GAINS_INCLUSION: 0.50,  // 50% gains imposables
  CAPITAL_GAINS_TAX_RATE: 0.30,   // taux marginal approx

  // ─── Employés ───
  MIN_BANK_WAGE: 22.00,
  PAYROLL_INTERVAL_MS: 15 * 60 * 1000, // 15 min
} as const;

// ═══════════════════════════════════════════════════════════
// TYPES DE COMPTES
// ═══════════════════════════════════════════════════════════

export type AccountType =
  | "cheque"          // Compte chèque (opérations)
  | "epargne"         // Épargne
  | "reer"            // REER
  | "celi"            // CELI
  | "reee"            // REEE
  | "business"        // Entreprise
  | "gang"            // Occulte
  | "trust"           // Fiduciaire
  | "joint";          // Conjoint

export const ACCOUNT_LABELS: Record<AccountType, string> = {
  cheque: "Compte chèque",
  epargne: "Compte épargne",
  reer: "REER",
  celi: "CELI",
  reee: "REEE",
  business: "Compte entreprise",
  gang: "Compte occulte",
  trust: "Compte fiduciaire",
  joint: "Compte conjoint",
};

// ═══════════════════════════════════════════════════════════
// BRANCHES (5 villages de Portneuf)
// ═══════════════════════════════════════════════════════════

export interface BranchDef {
  id: string;
  name: string;
  village: string;
  transitNumber: string;
  address: string;
  worldX: number;
  worldZ: number;
  yaw: number;
  size: { w: number; d: number; h: number };
  hasVault: boolean;
  hasAtms: number;        // nombre de GAB extérieurs
  hasAdvisors: number;    // nombre de bureaux conseillers
  hasTellers: number;     // nombre de guichets
}

export const DESJARDINS_BRANCHES: BranchDef[] = [
  {
    id: "caisse_portneuf",
    name: "Caisse Desjardins de Portneuf",
    village: "Portneuf",
    transitNumber: "30075",
    address: "150 Rue Notre-Dame, Portneuf, QC",
    worldX: 0, worldZ: 0, yaw: 0,
    size: { w: 16.4, d: 11.2, h: 5.1 },
    hasVault: true, hasAtms: 2, hasAdvisors: 2, hasTellers: 3,
  },
  {
    id: "caisse_donnacona",
    name: "Caisse Desjardins de Donnacona",
    village: "Donnacona",
    transitNumber: "30142",
    address: "250 Rue Principale, Donnacona, QC",
    worldX: 200, worldZ: 50, yaw: Math.PI,
    size: { w: 14.8, d: 10.6, h: 4.8 },
    hasVault: true, hasAtms: 2, hasAdvisors: 2, hasTellers: 3,
  },
  {
    id: "caisse_raymond",
    name: "Caisse Desjardins de Saint-Raymond",
    village: "Saint-Raymond",
    transitNumber: "30218",
    address: "500 Rue Saint-Joseph, Saint-Raymond, QC",
    worldX: -500, worldZ: -300, yaw: Math.PI / 2,
    size: { w: 15.6, d: 10.8, h: 4.9 },
    hasVault: true, hasAtms: 2, hasAdvisors: 2, hasTellers: 2,
  },
  {
    id: "caisse_cap_sante",
    name: "Caisse Desjardins de Cap-Santé",
    village: "Cap-Santé",
    transitNumber: "30356",
    address: "100 Rue du Roy, Cap-Santé, QC",
    worldX: 400, worldZ: 100, yaw: -Math.PI / 2,
    size: { w: 13.2, d: 9.8, h: 4.6 },
    hasVault: true, hasAtms: 1, hasAdvisors: 1, hasTellers: 2,
  },
  {
    id: "caisse_deschambault",
    name: "Caisse Desjardins de Deschambault",
    village: "Deschambault",
    transitNumber: "30498",
    address: "80 Rue Principale, Deschambault, QC",
    worldX: -300, worldZ: 200, yaw: Math.PI / 2,
    size: { w: 12.8, d: 9.6, h: 4.5 },
    hasVault: true, hasAtms: 1, hasAdvisors: 1, hasTellers: 2,
  },
];

export function getBranchDef(branchId: string): BranchDef | undefined {
  return DESJARDINS_BRANCHES.find((b) => b.id === branchId);
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function isCaisseOpen(hours: number, dayOfWeek = 1): boolean {
  const isFriday = dayOfWeek === 5;
  const openH = BANKING_CONSTANTS.OPEN_HOUR;
  const closeH = isFriday ? BANKING_CONSTANTS.CLOSE_HOUR_FRIDAY : BANKING_CONSTANTS.CLOSE_HOUR;
  return hours >= openH && hours < closeH;
}

export function caisseHoursLabel(dayOfWeek = 1): string {
  const isFriday = dayOfWeek === 5;
  return isFriday ? "9 h – 15 h (vendredi)" : "9 h – 17 h";
}

export function caisseNameFor(village: string): string {
  return `Caisse Desjardins de ${village}`;
}

// ═══════════════════════════════════════════════════════════
// UTILITAIRES GÉNÉRAUX
// ═══════════════════════════════════════════════════════════

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}