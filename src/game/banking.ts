/**
 * ═══════════════════════════════════════════════════════════════════
 * CAISSE POPULAIRE DESJARDINS — Système Bancaire Multijoueur
 * ═══════════════════════════════════════════════════════════════════
 *
 * Système bancaire québécois réaliste :
 *  - Comptes multiples (chèque, épargne, REER, CELI, entreprise)
 *  - Cartes de débit AccèsD + cartes de crédit Visa Desjardins
 *  - Virements Interac entre joueurs
 *  - Hypothèques (immobilier), prêts auto, marges de crédit
 *  - Placements REER/CELI avec fiscalité
 *  - GAB (guichets automatiques) avec cash physique
 *  - Fourgons blindés Garda (braquables)
 *  - Blanchiment d'argent (business front)
 *  - Saisies, faillites, ARC (impôts)
 *  - Employés joueurs (caissier, conseiller, directeur)
 *  - Chèques papier avec signatures
 *  - Historique complet, relevés mensuels
 */

import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { sendPrivateMessage } from "./chat";
import { triggerNotification } from "./phone";

// ═══════════════════════════════════════════════════════════
// TYPES FONDAMENTAUX
// ═══════════════════════════════════════════════════════════

export type TransactionType =
  | "deposit"           // dépôt
  | "withdrawal"        // retrait
  | "transfer"          // virement interne
  | "interac"           // virement Interac
  | "salary"            // paie
  | "loan"              // prêt reçu
  | "loan_payment"      // paiement prêt
  | "investment"        // achat placement
  | "investment_sale"   // vente placement
  | "business_income"   // revenu entreprise
  | "business_expense"  // dépense entreprise
  | "cheque_deposit"    // dépôt de chèque
  | "cheque_issued"     // chèque émis
  | "credit_card"       // achat carte crédit
  | "credit_payment"    // paiement carte crédit
  | "mortgage_payment"  // paiement hypothèque
  | "tax_payment"       // impôts ARC/Revenu QC
  | "fee"               // frais bancaires
  | "interest"          // intérêts crédités
  | "atm_fee"           // frais GAB étranger
  | "wire_transfer"     // virement bancaire international
  | "laundering"        // blanchiment (caché)
  | "seizure"           // saisie (police/ARC)
  | "refund";           // remboursement

export type AccountType =
  | "cheque"            // Compte chèque (opérations)
  | "epargne"           // Épargne classique
  | "reer"              // REER (retraite, déductible)
  | "celi"              // CELI (libre d'impôt)
  | "reee"              // REEE (études enfants)
  | "business"          // Entreprise
  | "gang"              // Compte occulte (illégal)
  | "trust"             // Compte fiduciaire
  | "joint";            // Compte conjoint

export type LoanStatus = "active" | "paid_off" | "defaulted" | "restructured";
export type LoanType = "personal" | "auto" | "reno" | "mortgage" | "business" | "student" | "payday";
export type InvestmentType = "stock" | "bond" | "gic" | "mutual_fund" | "etf" | "crypto" | "business" | "property";
export type InvestmentStatus = "active" | "sold" | "lost" | "matured";
export type CardType = "debit" | "credit" | "prepaid" | "business_debit";
export type CardStatus = "active" | "blocked" | "expired" | "stolen" | "lost";

// ═══════════════════════════════════════════════════════════
// COMPTES BANCAIRES
// ═══════════════════════════════════════════════════════════

export interface BankAccount {
  accountId: string;
  accountNumber: string;        // ex: "815-30075-1234567"
  transitNumber: string;        // ex: "30075" (succursale)
  institutionNumber: string;    // "815" pour Desjardins
  playerId: string;
  playerName: string;
  accountType: AccountType;
  balance: number;
  overdraft: number;            // découvert autorisé (en négatif)
  overdraftLimit: number;
  currency: "CAD" | "USD";
  createdDate: number;
  pin?: string;
  locked: boolean;
  frozen: boolean;              // gel par police/ARC
  frozenReason?: string;
  interestRate: number;         // rate annuel
  monthlyFees: number;          // frais mensuels
  linkedAccounts: string[];     // autres comptes du même joueur
  jointHolders: string[];       // pour comptes conjoints
  authorizedUsers: string[];    // ex: enfants sur compte parent
  taxDeductions: number;        // total contributions REER année en cours
  celiRoom: number;             // droits CELI disponibles
  isDefault: boolean;           // compte principal du joueur
}

// ═══════════════════════════════════════════════════════════
// CARTES BANCAIRES
// ═══════════════════════════════════════════════════════════

export interface BankCard {
  cardId: string;
  cardNumber: string;           // format Visa: 4530-XXXX-XXXX-XXXX
  cardType: CardType;
  linkedAccountId: string;
  playerId: string;
  playerName: string;           // nom sur la carte
  pin: string;                  // 4 chiffres
  cvv: string;                  // 3 chiffres
  expiryDate: number;
  status: CardStatus;
  creditLimit?: number;         // pour cartes crédit
  currentBalance?: number;      // solde à payer (crédit)
  minimumPayment?: number;
  paymentDueDate?: number;
  interestRate: number;         // 19.99% pour crédit typique
  contactlessEnabled: boolean;
  internationalEnabled: boolean;
  onlinePurchasesEnabled: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  lastUsed: number;
}

// ═══════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════

export interface Transaction {
  transactionId: string;
  accountId: string;
  playerId: string;
  type: TransactionType;
  amount: number;
  timestamp: number;
  description: string;
  category?: string;            // "épicerie", "essence", "salaire"
  merchantName?: string;
  merchantLocation?: { x: number; z: number };
  otherPartyId?: string;
  otherPartyName?: string;
  balanceAfter: number;
  cardUsed?: string;
  chequeNumber?: string;
  reference?: string;
  isPending: boolean;
  isReversed: boolean;
  isSuspicious: boolean;        // flag pour blanchiment
  taxReceiptRequired: boolean;
}

// ═══════════════════════════════════════════════════════════
// PRÊTS & HYPOTHÈQUES
// ═══════════════════════════════════════════════════════════

export interface Loan {
  loanId: string;
  loanType: LoanType;
  borrowerId: string;
  borrowerName: string;
  lenderId: string;             // "desjardins" ou playerId (prêt personnel)
  lenderName: string;
  cosignerId?: string;          // cosignataire
  principal: number;
  amountBorrowed: number;
  amountRepaid: number;
  interestRate: number;         // % annuel
  termMonths: number;
  monthlyPayment: number;
  remainingMonths: number;
  missedPayments: number;
  productId?: string;
  status: LoanStatus;
  startDate: number;
  nextPaymentDue: number;
  collateral?: {                // garantie (voiture, maison)
    type: "vehicle" | "property" | "business" | "none";
    itemId: string;
    estimatedValue: number;
  };
  penaltyRate: number;          // taux de pénalité si défaut
  earlyPayoffPenalty: number;
  autoDebitEnabled: boolean;
  debitAccountId: string;
}

export interface LoanProduct {
  id: string;
  label: string;
  loanType: LoanType;
  minPrincipal: number;
  maxPrincipal: number;
  months: number;
  minMonths: number;
  maxMonths: number;
  rate: number;                 // annuel
  requiresCollateral: boolean;
  minCreditScore: number;
  minIncome: number;
  hint: string;
}

export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: "payday",
    label: "Prêt sur salaire",
    loanType: "payday",
    minPrincipal: 100, maxPrincipal: 1500,
    months: 1, minMonths: 1, maxMonths: 2,
    rate: 391,
    requiresCollateral: false,
    minCreditScore: 0,
    minIncome: 500,
    hint: "⚠️ Taux abusif. Dernière option.",
  },
  {
    id: "mini",
    label: "Prêt express",
    loanType: "personal",
    minPrincipal: 500, maxPrincipal: 5000,
    months: 6, minMonths: 3, maxMonths: 12,
    rate: 12.99,
    requiresCollateral: false,
    minCreditScore: 550,
    minIncome: 1000,
    hint: "Approbation rapide, 4-12 versements.",
  },
  {
    id: "personnel",
    label: "Prêt personnel",
    loanType: "personal",
    minPrincipal: 2000, maxPrincipal: 25000,
    months: 24, minMonths: 12, maxMonths: 60,
    rate: 8.99,
    requiresCollateral: false,
    minCreditScore: 650,
    minIncome: 2000,
    hint: "Projet personnel, consolidation dettes.",
  },
  {
    id: "auto",
    label: "Prêt auto",
    loanType: "auto",
    minPrincipal: 5000, maxPrincipal: 80000,
    months: 60, minMonths: 24, maxMonths: 84,
    rate: 6.99,
    requiresCollateral: true,
    minCreditScore: 600,
    minIncome: 1500,
    hint: "Véhicule en garantie.",
  },
  {
    id: "reno",
    label: "Prêt rénovation",
    loanType: "reno",
    minPrincipal: 5000, maxPrincipal: 50000,
    months: 60, minMonths: 12, maxMonths: 120,
    rate: 7.49,
    requiresCollateral: false,
    minCreditScore: 620,
    minIncome: 2500,
    hint: "Cuisine, salle de bain, sous-sol.",
  },
  {
    id: "hypotheque",
    label: "Hypothèque",
    loanType: "mortgage",
    minPrincipal: 50000, maxPrincipal: 1500000,
    months: 300, minMonths: 60, maxMonths: 360,
    rate: 5.24,
    requiresCollateral: true,
    minCreditScore: 680,
    minIncome: 4000,
    hint: "Achat immobilier, 25 ans typique.",
  },
  {
    id: "entreprise",
    label: "Prêt entreprise",
    loanType: "business",
    minPrincipal: 10000, maxPrincipal: 500000,
    months: 120, minMonths: 24, maxMonths: 240,
    rate: 8.49,
    requiresCollateral: true,
    minCreditScore: 700,
    minIncome: 5000,
    hint: "Démarrage ou expansion.",
  },
  {
    id: "etudiant",
    label: "Prêt étudiant",
    loanType: "student",
    minPrincipal: 1000, maxPrincipal: 20000,
    months: 120, minMonths: 12, maxMonths: 180,
    rate: 4.5,
    requiresCollateral: false,
    minCreditScore: 500,
    minIncome: 0,
    hint: "Différé pendant les études.",
  },
];

// ═══════════════════════════════════════════════════════════
// MARGE DE CRÉDIT
// ═══════════════════════════════════════════════════════════

export interface LineOfCredit {
  locId: string;
  playerId: string;
  limit: number;
  balance: number;              // montant utilisé
  interestRate: number;         // taux variable
  minimumPayment: number;       // 3% du solde généralement
  paymentDueDate: number;
  status: "active" | "frozen" | "closed";
  linkedAccountId: string;
}

// ═══════════════════════════════════════════════════════════
// PLACEMENTS & INVESTISSEMENTS
// ═══════════════════════════════════════════════════════════

export interface Investment {
  investmentId: string;
  playerId: string;
  accountId: string;            // dans quel compte (REER, CELI, etc.)
  type: InvestmentType;
  name: string;                 // "Actions Bombardier", "GIC 5 ans"
  symbol?: string;              // "BBD.B" pour bourse
  principal: number;
  units: number;                // nombre d'actions/unités
  unitPrice: number;
  currentValue: number;
  return: number;               // %
  dividendYield?: number;
  startDate: number;
  maturityDate?: number;        // GIC
  status: InvestmentStatus;
  taxSheltered: boolean;        // REER/CELI = true
  riskLevel: "low" | "medium" | "high" | "extreme";
  autoReinvest: boolean;
}

export const INVEST_LABEL: Record<InvestmentType, string> = {
  stock: "Actions boursières",
  bond: "Obligations",
  gic: "CPG (Certificat de placement garanti)",
  mutual_fund: "Fonds mutuels",
  etf: "FNB (Fonds négocié en bourse)",
  crypto: "Cryptomonnaie",
  business: "Parts d'entreprise",
  property: "Immobilier",
};

export interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
  marketCap: number;
  dividendYield: number;
  sector: string;
  volatility: number;
}

// Actions québécoises typiques
export const QUEBEC_STOCKS: StockData[] = [
  { symbol: "BBD.B", name: "Bombardier", currentPrice: 82.50, previousClose: 80.20, dayChange: 2.30, dayChangePercent: 2.87, volume: 1200000, marketCap: 8500000000, dividendYield: 0, sector: "Aéronautique", volatility: 0.08 },
  { symbol: "CNQ", name: "Canadian Natural Resources", currentPrice: 95.30, previousClose: 94.10, dayChange: 1.20, dayChangePercent: 1.27, volume: 800000, marketCap: 100000000000, dividendYield: 4.2, sector: "Énergie", volatility: 0.05 },
  { symbol: "CP", name: "Canadien Pacifique", currentPrice: 108.75, previousClose: 107.90, dayChange: 0.85, dayChangePercent: 0.79, volume: 500000, marketCap: 95000000000, dividendYield: 0.8, sector: "Transport", volatility: 0.04 },
  { symbol: "L", name: "Loblaws (Provigo)", currentPrice: 152.00, previousClose: 150.50, dayChange: 1.50, dayChangePercent: 1.00, volume: 300000, marketCap: 48000000000, dividendYield: 1.5, sector: "Alimentation", volatility: 0.03 },
  { symbol: "BCE", name: "Bell Canada", currentPrice: 44.20, previousClose: 44.80, dayChange: -0.60, dayChangePercent: -1.34, volume: 2500000, marketCap: 40000000000, dividendYield: 8.9, sector: "Télécom", volatility: 0.04 },
  { symbol: "RY", name: "Banque Royale", currentPrice: 138.90, previousClose: 137.60, dayChange: 1.30, dayChangePercent: 0.94, volume: 3000000, marketCap: 195000000000, dividendYield: 4.1, sector: "Finance", volatility: 0.03 },
  { symbol: "DOL", name: "Dollarama", currentPrice: 118.40, previousClose: 116.20, dayChange: 2.20, dayChangePercent: 1.89, volume: 400000, marketCap: 34000000000, dividendYield: 0.3, sector: "Détail", volatility: 0.05 },
  { symbol: "ATD", name: "Alimentation Couche-Tard", currentPrice: 78.60, previousClose: 77.90, dayChange: 0.70, dayChangePercent: 0.90, volume: 1500000, marketCap: 75000000000, dividendYield: 0.9, sector: "Détail", volatility: 0.04 },
];

// Cryptos supportées
export const CRYPTO_ASSETS: StockData[] = [
  { symbol: "BTC", name: "Bitcoin", currentPrice: 87500, previousClose: 85200, dayChange: 2300, dayChangePercent: 2.7, volume: 25000000000, marketCap: 1700000000000, dividendYield: 0, sector: "Crypto", volatility: 0.15 },
  { symbol: "ETH", name: "Ethereum", currentPrice: 4200, previousClose: 4150, dayChange: 50, dayChangePercent: 1.2, volume: 15000000000, marketCap: 500000000000, dividendYield: 0, sector: "Crypto", volatility: 0.18 },
  { symbol: "DOGE", name: "Dogecoin", currentPrice: 0.28, previousClose: 0.31, dayChange: -0.03, dayChangePercent: -9.68, volume: 3000000000, marketCap: 40000000000, dividendYield: 0, sector: "Crypto", volatility: 0.35 },
];

// ═══════════════════════════════════════════════════════════
// GAB (GUICHETS AUTOMATIQUES)
// ═══════════════════════════════════════════════════════════

export interface Atm {
  atmId: string;
  location: { x: number; y: number; z: number };
  address: string;
  ownerBank: "desjardins" | "national" | "bmo" | "rbc" | "td" | "cibc" | "scotia" | "independent";
  cash: number;
  maxCapacity: number;
  minCapacity: number;          // seuil de réapprovisionnement
  broken: boolean;
  brokenReason?: "empty" | "vandalized" | "robbery" | "maintenance" | "network";
  lastRestock: number;
  lastServiced: number;
  cameraId?: string;
  alarmActive: boolean;
  transactionsCount: number;
  totalDispensed: number;
  isIndoor: boolean;            // dans une succursale
  hasSecurityGuard: boolean;
  robberyResistance: number;    // 0-100
  interacFee: number;           // frais pour non-clients
  currentUser: string | null;   // playerId
  outOfOrderUntil?: number;
}

export const ATM_START_CASH = 25_000;
export const ATM_MAX = 150_000;
export const ATM_MIN_REORDER = 5_000;

// ═══════════════════════════════════════════════════════════
// FOURGONS BLINDÉS (GARDA)
// ═══════════════════════════════════════════════════════════

export interface ArmoredTruck {
  truckId: string;
  driverId: string;
  guardIds: string[];
  route: Array<{ x: number; z: number; type: "pickup" | "dropoff"; targetId: string }>;
  currentStop: number;
  cashInTruck: number;
  maxCapacity: number;
  status: "loading" | "in_transit" | "delivering" | "returning" | "hijacked";
  armorLevel: number;           // 0-100
  hasBlackBox: boolean;
  alarmSystem: boolean;
  gpsTracked: boolean;
  scheduledDeparture: number;
  scheduledArrival: number;
}

// ═══════════════════════════════════════════════════════════
// CHÈQUES
// ═══════════════════════════════════════════════════════════

export interface Cheque {
  chequeId: string;
  chequeNumber: string;
  issuerAccountId: string;
  issuerName: string;
  payeeName: string;
  payeeAccountId?: string;
  amount: number;
  memo: string;
  issueDate: number;
  cashDate?: number;
  status: "issued" | "cashed" | "cancelled" | "bounced" | "expired";
  isSigned: boolean;
  isCertified: boolean;
}

// ═══════════════════════════════════════════════════════════
// CRÉDIT ET COTE
// ═══════════════════════════════════════════════════════════

export interface CreditProfile {
  playerId: string;
  creditScore: number;          // 300-900 (Canada)
  totalDebt: number;
  monthlyIncome: number;
  employmentStatus: "employed" | "self_employed" | "unemployed" | "retired" | "student";
  employer?: string;
  employmentDuration: number;   // mois
  latePayments: number;
  bankruptcies: number;
  collections: number;
  activeAccounts: number;
  creditUtilization: number;    // %
  oldestAccountAge: number;     // mois
  inquiries: number;            // demandes récentes
  lastUpdated: number;
  history: Array<{
    date: number;
    event: string;
    scoreChange: number;
  }>;
}

export function creditRating(score: number): string {
  if (score >= 800) return "Excellent";
  if (score >= 720) return "Très bon";
  if (score >= 660) return "Bon";
  if (score >= 620) return "Moyen";
  if (score >= 580) return "Faible";
  return "Très faible";
}

// ═══════════════════════════════════════════════════════════
// VIREMENTS INTERAC
// ═══════════════════════════════════════════════════════════

export interface InteracTransfer {
  transferId: string;
  senderId: string;
  senderName: string;
  senderAccountId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientPlayerId?: string;
  amount: number;
  currency: "CAD";
  securityQuestion: string;
  securityAnswer: string;
  memo?: string;
  status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
  sentDate: number;
  acceptedDate?: number;
  expiryDate: number;           // 30 jours typique
  autoDepositEnabled: boolean;
  fee: number;                  // 1$ typique
}

// ═══════════════════════════════════════════════════════════
// SUCCURSALES (opérées par joueurs)
// ═══════════════════════════════════════════════════════════

export type BankRole =
  | "directeur"
  | "directeur_adjoint"
  | "conseiller"                // ouvre comptes, offre prêts
  | "conseiller_financier"      // Ajouté pour compatibilité caisse.ts
  | "caissier"                  // opérations comptoir
  | "agent_securite"
  | "specialiste_hypotheque"
  | "conseiller_placement"
  | "client";

export interface BankBranch {
  branchId: string;
  name: string;                 // "Caisse Desjardins St-Denis"
  transitNumber: string;
  address: string;
  position: { x: number; z: number };
  ownerBank: "desjardins" | "national" | "bmo" | "rbc";
  employees: BankEmployee[];
  vaultCash: number;
  vaultCapacity: number;
  isOpen: boolean;
  openHours: { open: number; close: number };
  atms: string[];               // atmIds
  totalDeposits: number;
  totalLoans: number;
  todayTransactions: number;
  securityLevel: number;        // 0-100
  cameras: string[];
  alarmSystem: boolean;
  lastRobbery: number | null;
  guards: string[];             // playerIds
}

export interface BankEmployee {
  playerId: string;
  playerName: string;
  role: BankRole;
  hourlyRate: number;
  isClockedIn: boolean;
  clockInTime: number | null;
  hoursWorked: number;
  totalEarned: number;
  performanceRating: number;
  loansApproved: number;
  accountsOpened: number;
  branchId: string;
}

// ═══════════════════════════════════════════════════════════
// ÉTAT GLOBAL (multijoueur, synchronisé)
// ═══════════════════════════════════════════════════════════

const ACCOUNTS = new Map<string, BankAccount>();
const CARDS = new Map<string, BankCard>();
const TRANSACTIONS = new Map<string, Transaction[]>(); // par accountId
const LOANS = new Map<string, Loan>();
const INVESTMENTS = new Map<string, Investment>();
const ATMS = new Map<string, Atm>();
const BRANCHES = new Map<string, BankBranch>();
const CHEQUES = new Map<string, Cheque>();
const CREDIT_PROFILES = new Map<string, CreditProfile>();
const INTERAC_PENDING = new Map<string, InteracTransfer>();
const LINES_OF_CREDIT = new Map<string, LineOfCredit>();
const ARMORED_TRUCKS = new Map<string, ArmoredTruck>();

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateAccountNumber(branchTransit: string): string {
  const account = Math.floor(Math.random() * 9000000 + 1000000);
  return `815-${branchTransit}-${account}`;
}

function generateCardNumber(type: CardType): string {
  const prefix = type === "credit" ? "4530" : "4520";
  const parts = [prefix];
  for (let i = 0; i < 3; i++) {
    parts.push(Math.floor(Math.random() * 9000 + 1000).toString());
  }
  return parts.join("-");
}

function generateCVV(): string {
  return Math.floor(Math.random() * 900 + 100).toString();
}

function generatePIN(): string {
  return Math.floor(Math.random() * 9000 + 1000).toString();
}

// ═══════════════════════════════════════════════════════════
// OUVERTURE DE COMPTE
// ═══════════════════════════════════════════════════════════

export interface OpenAccountResult {
  success: boolean;
  message: string;
  account: BankAccount | null;
  card: BankCard | null;
}

export function openAccount(
  playerId: string,
  playerName: string,
  accountType: AccountType,
  branchId: string,
  initialDeposit: number = 0,
  openedBy?: string,            // conseiller (si succursale)
): OpenAccountResult {
  const branch = BRANCHES.get(branchId);
  if (!branch) {
    return { success: false, message: "Succursale introuvable.", account: null, card: null };
  }

  // Vérifier CELI room (limite annuelle 2024: 7000$)
  if (accountType === "celi") {
    const existing = getPlayerAccounts(playerId).find(a => a.accountType === "celi");
    if (existing) {
      return {
        success: false,
        message: "Vous avez déjà un CELI. Utilisez celui-ci.",
        account: null, card: null,
      };
    }
  }

  const accountNumber = generateAccountNumber(branch.transitNumber);
  const account: BankAccount = {
    accountId: uid("acc"),
    accountNumber,
    transitNumber: branch.transitNumber,
    institutionNumber: "815",
    playerId,
    playerName,
    accountType,
    balance: initialDeposit,
    overdraft: 0,
    overdraftLimit: accountType === "cheque" ? 500 : 0,
    currency: "CAD",
    createdDate: Date.now(),
    locked: false,
    frozen: false,
    interestRate: getAccountInterestRate(accountType),
    monthlyFees: getAccountFees(accountType),
    linkedAccounts: [],
    jointHolders: [],
    authorizedUsers: [],
    taxDeductions: 0,
    celiRoom: accountType === "celi" ? 7000 : 0,
    isDefault: getPlayerAccounts(playerId).length === 0,
  };

  ACCOUNTS.set(account.accountId, account);
  TRANSACTIONS.set(account.accountId, []);

  // Créer profil de crédit si premier compte
  if (!CREDIT_PROFILES.has(playerId)) {
    CREDIT_PROFILES.set(playerId, {
      playerId,
      creditScore: 650,
      totalDebt: 0,
      monthlyIncome: 0,
      employmentStatus: "employed",
      employmentDuration: 0,
      latePayments: 0,
      bankruptcies: 0,
      collections: 0,
      activeAccounts: 1,
      creditUtilization: 0,
      oldestAccountAge: 0,
      inquiries: 1,
      lastUpdated: Date.now(),
      history: [{
        date: Date.now(),
        event: "Ouverture premier compte",
        scoreChange: 0,
      }],
    });
  }

  // Créer carte de débit
  let card: BankCard | null = null;
  if (accountType === "cheque" || accountType === "epargne" || accountType === "business") {
    card = {
      cardId: uid("card"),
      cardNumber: generateCardNumber("debit"),
      cardType: accountType === "business" ? "business_debit" : "debit",
      linkedAccountId: account.accountId,
      playerId,
      playerName,
      pin: generatePIN(),
      cvv: generateCVV(),
      expiryDate: Date.now() + 4 * 365 * 24 * 3600 * 1000,
      status: "active",
      interestRate: 0,
      contactlessEnabled: true,
      internationalEnabled: false,
      onlinePurchasesEnabled: true,
      dailyLimit: 3000,
      monthlyLimit: 30000,
      lastUsed: 0,
    };
    CARDS.set(card.cardId, card);
  }

  // Statistiques succursale
  branch.totalDeposits += initialDeposit;
  branch.todayTransactions++;

  // Créditer le conseiller
  if (openedBy) {
    const emp = branch.employees.find(e => e.playerId === openedBy);
    if (emp) {
      emp.accountsOpened++;
      emp.performanceRating = Math.min(100, emp.performanceRating + 1);
    }
  }

  // Notifier le client
  triggerNotification(playerId, {
    title: "🎉 Compte ouvert !",
    body: `Compte ${accountType} #${accountNumber}\nSolde initial: ${initialDeposit}$`,
    icon: "🏦",
  });

  netEmit("bank:account_opened", { account, card });

  return {
    success: true,
    message: `Compte ${accountType} ouvert avec succès. Numéro: ${accountNumber}`,
    account,
    card,
  };
}

function getAccountInterestRate(type: AccountType): number {
  switch (type) {
    case "cheque": return 0.05;
    case "epargne": return 2.5;
    case "reer": return 4.0;
    case "celi": return 3.5;
    case "reee": return 4.5;
    case "business": return 1.0;
    default: return 0;
  }
}

function getAccountFees(type: AccountType): number {
  switch (type) {
    case "cheque": return 4.95;
    case "business": return 25.00;
    case "epargne": return 0;
    default: return 0;
  }
}

// ═══════════════════════════════════════════════════════════
// CONSULTATION DE COMPTE
// ═══════════════════════════════════════════════════════════

export function getPlayerAccounts(playerId: string): BankAccount[] {
  return Array.from(ACCOUNTS.values()).filter(a => a.playerId === playerId);
}

export function getAccount(accountId: string): BankAccount | null {
  return ACCOUNTS.get(accountId) ?? null;
}

export function getDefaultAccount(playerId: string): BankAccount | null {
  return getPlayerAccounts(playerId).find(a => a.isDefault) ?? null;
}

export function getPlayerCards(playerId: string): BankCard[] {
  return Array.from(CARDS.values()).filter(c => c.playerId === playerId);
}

export function getAccountTransactions(accountId: string, limit: number = 50): Transaction[] {
  const txs = TRANSACTIONS.get(accountId) ?? [];
  return txs.slice(0, limit);
}

// ═══════════════════════════════════════════════════════════
// TRANSACTIONS (dépôts / retraits)
// ═══════════════════════════════════════════════════════════

function pushTransaction(
  account: BankAccount,
  type: TransactionType,
  amount: number,
  description: string,
  extra: Partial<Transaction> = {},
): Transaction {
  const tx: Transaction = {
    transactionId: uid("tx"),
    accountId: account.accountId,
    playerId: account.playerId,
    type,
    amount,
    timestamp: Date.now(),
    description,
    balanceAfter: account.balance,
    isPending: false,
    isReversed: false,
    isSuspicious: false,
    taxReceiptRequired: type === "loan_payment" || type === "investment" || type === "mortgage_payment",
    ...extra,
  };

  const list = TRANSACTIONS.get(account.accountId) ?? [];
  list.unshift(tx);
  if (list.length > 500) list.pop();
  TRANSACTIONS.set(account.accountId, list);

  // Détection de blanchiment (dépôts > 10 000$ à déclarer)
  if (amount >= 10000 && (type === "deposit" || type === "wire_transfer")) {
    tx.isSuspicious = true;
    netEmit("bank:suspicious_transaction", { tx, account });
  }

  netEmit("bank:transaction", { tx, accountId: account.accountId });
  return tx;
}

export interface BankOpResult {
  ok: boolean;
  message: string;
  balance?: number;
  cashChange?: number;
  transaction?: Transaction;
}

export function deposit(
  accountId: string,
  amount: number,
  atmId: string | null = null,
  source: "cash" | "cheque" | "salary" | "transfer" = "cash",
): BankOpResult {
  const account = ACCOUNTS.get(accountId);
  if (!account) return { ok: false, message: "Compte introuvable." };
  if (account.locked) return { ok: false, message: "Compte verrouillé." };
  if (account.frozen) return { ok: false, message: `Compte gelé: ${account.frozenReason}` };

  const n = Math.max(1, Math.round(amount * 100) / 100);

  // GAB
  if (atmId) {
    const atm = ATMS.get(atmId);
    if (!atm) return { ok: false, message: "GAB introuvable." };
    if (atm.broken) return { ok: false, message: `GAB hors service (${atm.brokenReason}).` };

    atm.cash = Math.min(atm.cash + n, atm.maxCapacity);
    atm.transactionsCount++;
  }

  account.balance = round2(account.balance + n);

  const txType: TransactionType = source === "cheque" ? "cheque_deposit"
    : source === "salary" ? "salary"
    : source === "transfer" ? "transfer"
    : "deposit";

  const tx = pushTransaction(account, txType, n, `Dépôt ${source}`, {
    merchantLocation: atmId ? ATMS.get(atmId)?.location : undefined,
  });

  return {
    ok: true,
    message: `Dépôt de ${n}$ effectué. Solde: ${account.balance}$`,
    balance: account.balance,
    cashChange: -n,
    transaction: tx,
  };
}

export function withdraw(
  accountId: string,
  amount: number,
  atmId: string | null = null,
  usingCard: string | null = null,
): BankOpResult {
  const account = ACCOUNTS.get(accountId);
  if (!account) return { ok: false, message: "Compte introuvable." };
  if (account.locked) return { ok: false, message: "Compte verrouillé." };
  if (account.frozen) return { ok: false, message: `Compte gelé: ${account.frozenReason}` };

  const n = Math.max(1, Math.round(amount * 100) / 100);
  const available = account.balance + account.overdraftLimit;

  if (available < n) {
    return { ok: false, message: `Solde insuffisant (disponible: ${available}$)` };
  }

  // Vérifier la carte
  let interacFee = 0;
  if (atmId) {
    const atm = ATMS.get(atmId);
    if (!atm) return { ok: false, message: "GAB introuvable." };
    if (atm.broken) return { ok: false, message: `GAB hors service.` };
    if (atm.cash < n) return { ok: false, message: "GAB à sec — allez au comptoir." };

    // Frais si GAB pas Desjardins
    if (atm.ownerBank !== "desjardins") {
      interacFee = atm.interacFee || 2.50;
    }

    atm.cash -= n;
    atm.transactionsCount++;
    atm.totalDispensed += n;
  }

  if (usingCard) {
    const card = CARDS.get(usingCard);
    if (!card || card.status !== "active") {
      return { ok: false, message: "Carte invalide ou bloquée." };
    }
    if (card.status !== "active") return { ok: false, message: "Carte bloquée." };
    card.lastUsed = Date.now();
  }

  account.balance = round2(account.balance - n - interacFee);

  const tx = pushTransaction(account, "withdrawal", n, `Retrait GAB`, {
    cardUsed: usingCard ?? undefined,
    merchantLocation: atmId ? ATMS.get(atmId)?.location : undefined,
  });

  if (interacFee > 0) {
    pushTransaction(account, "atm_fee", interacFee, "Frais GAB étranger");
  }

  return {
    ok: true,
    message: `Retrait de ${n}$ effectué${interacFee > 0 ? ` (+${interacFee}$ frais)` : ""}. Solde: ${account.balance}$`,
    balance: account.balance,
    cashChange: n,
    transaction: tx,
  };
}

// ═══════════════════════════════════════════════════════════
// VIREMENTS INTERAC (entre joueurs)
// ═══════════════════════════════════════════════════════════

export function sendInterac(
  senderAccountId: string,
  recipientId: string,
  amount: number,
  securityQuestion: string,
  securityAnswer: string,
  memo?: string,
): { ok: boolean; message: string; transfer: InteracTransfer | null } {
  const senderAccount = ACCOUNTS.get(senderAccountId);
  if (!senderAccount) return { ok: false, message: "Compte introuvable.", transfer: null };

  const n = Math.max(1, Math.round(amount * 100) / 100);
  const fee = 1.50;

  if (senderAccount.balance < n + fee) {
    return { ok: false, message: `Solde insuffisant (${n + fee}$ requis)`, transfer: null };
  }

  const transfer: InteracTransfer = {
    transferId: uid("interac"),
    senderId: senderAccount.playerId,
    senderName: senderAccount.playerName,
    senderAccountId,
    recipientPlayerId: recipientId,
    amount: n,
    currency: "CAD",
    securityQuestion,
    securityAnswer: securityAnswer.toLowerCase().trim(),
    memo,
    status: "pending",
    sentDate: Date.now(),
    expiryDate: Date.now() + 30 * 24 * 3600 * 1000,
    autoDepositEnabled: false,
    fee,
  };

  // Bloquer les fonds
  senderAccount.balance = round2(senderAccount.balance - n - fee);
  pushTransaction(senderAccount, "interac", n, `Virement Interac à ${recipientId}`, {
    otherPartyId: recipientId,
    reference: transfer.transferId,
    isPending: true,
  });
  pushTransaction(senderAccount, "fee", fee, "Frais virement Interac");

  INTERAC_PENDING.set(transfer.transferId, transfer);

  // Notifier le destinataire
  triggerNotification(recipientId, {
    title: "💸 Virement Interac reçu",
    body: `${senderAccount.playerName} vous envoie ${n}$\nMémo: ${memo || "(aucun)"}`,
    icon: "💰",
    action: { type: "accept_interac", transferId: transfer.transferId },
  });

  netEmit("bank:interac_sent", { transfer });

  return {
    ok: true,
    message: `Virement de ${n}$ envoyé. Question: "${securityQuestion}"`,
    transfer,
  };
}

export function acceptInterac(
  transferId: string,
  recipientAccountId: string,
  answer: string,
): { ok: boolean; message: string; balance?: number } {
  const transfer = INTERAC_PENDING.get(transferId);
  if (!transfer) return { ok: false, message: "Virement introuvable." };
  if (transfer.status !== "pending") return { ok: false, message: "Virement déjà traité." };
  if (Date.now() > transfer.expiryDate) {
    transfer.status = "expired";
    return { ok: false, message: "Virement expiré." };
  }

  const recipientAccount = ACCOUNTS.get(recipientAccountId);
  if (!recipientAccount) return { ok: false, message: "Compte introuvable." };
  if (recipientAccount.playerId !== transfer.recipientPlayerId) {
    return { ok: false, message: "Compte incorrect." };
  }

  if (answer.toLowerCase().trim() !== transfer.securityAnswer) {
    return { ok: false, message: "❌ Réponse incorrecte." };
  }

  transfer.status = "accepted";
  transfer.acceptedDate = Date.now();

  recipientAccount.balance = round2(recipientAccount.balance + transfer.amount);
  pushTransaction(recipientAccount, "interac", transfer.amount, `Interac de ${transfer.senderName}`, {
    otherPartyId: transfer.senderId,
    otherPartyName: transfer.senderName,
    reference: transferId,
  });

  triggerNotification(transfer.senderId, {
    title: "✅ Interac accepté",
    body: `${transfer.recipientPlayerId} a accepté ${transfer.amount}$`,
    icon: "✓",
  });

  netEmit("bank:interac_accepted", { transfer });

  return {
    ok: true,
    message: `${transfer.amount}$ déposés dans votre compte.`,
    balance: recipientAccount.balance,
  };
}

export function declineInterac(transferId: string): { ok: boolean; message: string } {
  const transfer = INTERAC_PENDING.get(transferId);
  if (!transfer) return { ok: false, message: "Virement introuvable." };
  if (transfer.status !== "pending") return { ok: false, message: "Déjà traité." };

  transfer.status = "declined";

  // Rembourser l'expéditeur
  const senderAccount = ACCOUNTS.get(transfer.senderAccountId);
  if (senderAccount) {
    senderAccount.balance = round2(senderAccount.balance + transfer.amount);
    pushTransaction(senderAccount, "refund", transfer.amount, "Interac refusé - remboursement");
  }

  triggerNotification(transfer.senderId, {
    title: "❌ Interac refusé",
    body: `${transfer.recipientPlayerId} a refusé ${transfer.amount}$`,
    icon: "✗",
  });

  return { ok: true, message: "Virement refusé et remboursé." };
}

// ═══════════════════════════════════════════════════════════
// TRANSFERT ENTRE COMPTES
// ═══════════════════════════════════════════════════════════

export function transferBetweenAccounts(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
): BankOpResult {
  const from = ACCOUNTS.get(fromAccountId);
  const to = ACCOUNTS.get(toAccountId);
  if (!from || !to) return { ok: false, message: "Compte introuvable." };
  if (from.locked || to.locked) return { ok: false, message: "Compte verrouillé." };

  const n = Math.max(1, Math.round(amount * 100) / 100);
  if (from.balance < n) return { ok: false, message: "Solde insuffisant." };

  // Vérifier limites CELI/REER
  if (to.accountType === "celi" && to.celiRoom < n) {
    return { ok: false, message: `Dépasse les droits CELI (${to.celiRoom}$ dispo).` };
  }

  from.balance = round2(from.balance - n);
  to.balance = round2(to.balance + n);

  if (to.accountType === "celi") to.celiRoom -= n;
  if (to.accountType === "reer") to.taxDeductions += n;

  pushTransaction(from, "transfer", n, `Virement vers ${to.accountType}`, {
    otherPartyId: to.playerId,
    otherPartyName: to.playerName,
  });
  pushTransaction(to, "transfer", n, `Virement depuis ${from.accountType}`, {
    otherPartyId: from.playerId,
    otherPartyName: from.playerName,
  });

  return {
    ok: true,
    message: `${n}$ transférés.`,
    balance: from.balance,
  };
}

// ═══════════════════════════════════════════════════════════
// PRÊTS & HYPOTHÈQUES
// ═══════════════════════════════════════════════════════════

export function requestLoan(
  playerId: string,
  playerName: string,
  productId: string,
  requestedAmount: number,
  requestedMonths: number,
  debitAccountId: string,
  collateral?: Loan["collateral"],
): { ok: boolean; message: string; loan: Loan | null } {
  const product = LOAN_PRODUCTS.find(p => p.id === productId);
  if (!product) return { ok: false, message: "Produit introuvable.", loan: null };

  const profile = CREDIT_PROFILES.get(playerId);
  if (!profile) return { ok: false, message: "Profil de crédit introuvable.", loan: null };

  // Vérifications
  if (profile.creditScore < product.minCreditScore) {
    return {
      ok: false,
      message: `❌ Cote de crédit insuffisante (${profile.creditScore} vs ${product.minCreditScore} requis)`,
      loan: null,
    };
  }

  if (profile.monthlyIncome < product.minIncome) {
    return {
      ok: false,
      message: `❌ Revenu insuffisant (${profile.monthlyIncome}$/mois vs ${product.minIncome}$ requis)`,
      loan: null,
    };
  }

  if (requestedAmount < product.minPrincipal || requestedAmount > product.maxPrincipal) {
    return {
      ok: false,
      message: `Montant hors des limites (${product.minPrincipal}$ – ${product.maxPrincipal}$)`,
      loan: null,
    };
  }

  if (product.requiresCollateral && !collateral) {
    return { ok: false, message: "Garantie requise.", loan: null };
  }

  // Calculer le paiement mensuel (formule d'amortissement)
  const monthlyRate = product.rate / 100 / 12;
  const months = requestedMonths;
  const payment = round2(
    (requestedAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)),
  );

  // Ratio d'endettement (max 40%)
  const totalDebtRatio = (profile.totalDebt + payment) / profile.monthlyIncome;
  if (totalDebtRatio > 0.40) {
    return {
      ok: false,
      message: `❌ Ratio d'endettement trop élevé (${(totalDebtRatio * 100).toFixed(1)}% > 40%)`,
      loan: null,
    };
  }

  const account = ACCOUNTS.get(debitAccountId);
  if (!account) return { ok: false, message: "Compte de débit introuvable.", loan: null };

  const loan: Loan = {
    loanId: uid("loan"),
    loanType: product.loanType,
    borrowerId: playerId,
    borrowerName: playerName,
    lenderId: "desjardins",
    lenderName: "Caisse Desjardins",
    principal: requestedAmount,
    amountBorrowed: requestedAmount,
    amountRepaid: 0,
    interestRate: product.rate,
    termMonths: months,
    monthlyPayment: payment,
    remainingMonths: months,
    missedPayments: 0,
    productId: product.id,
    status: "active",
    startDate: Date.now(),
    nextPaymentDue: Date.now() + 30 * 24 * 3600 * 1000,
    collateral,
    penaltyRate: 24.99,
    earlyPayoffPenalty: requestedAmount * 0.03,
    autoDebitEnabled: true,
    debitAccountId,
  };

  LOANS.set(loan.loanId, loan);

  // Verser le prêt
  account.balance = round2(account.balance + requestedAmount);
  pushTransaction(account, "loan", requestedAmount, `Prêt ${product.label}`, {
    reference: loan.loanId,
  });

  // Mise à jour profil de crédit
  profile.totalDebt += requestedAmount;
  profile.activeAccounts++;
  profile.creditScore = Math.max(300, profile.creditScore - 5); // baisse temporaire
  profile.history.push({
    date: Date.now(),
    event: `Nouveau prêt ${product.label} (${requestedAmount}$)`,
    scoreChange: -5,
  });

  triggerNotification(playerId, {
    title: "✅ Prêt approuvé",
    body: `${requestedAmount}$ versés. Paiement mensuel: ${payment}$`,
    icon: "💰",
  });

  netEmit("bank:loan_approved", { loan });

  return {
    ok: true,
    message: `Prêt ${product.label} approuvé: ${requestedAmount}$`,
    loan,
  };
}

export function payLoan(
  loanId: string,
  amount: number,
  accountId: string,
): { ok: boolean; message: string; loan: Loan | null } {
  const loan = LOANS.get(loanId);
  if (!loan) return { ok: false, message: "Prêt introuvable.", loan: null };
  if (loan.status !== "active") return { ok: false, message: "Prêt non actif.", loan: null };

  const account = ACCOUNTS.get(accountId);
  if (!account) return { ok: false, message: "Compte introuvable.", loan: null };
  if (account.balance < amount) return { ok: false, message: "Solde insuffisant.", loan: null };

  account.balance = round2(account.balance - amount);
  loan.amountRepaid += amount;
  loan.remainingMonths = Math.max(0, loan.remainingMonths - 1);
  loan.nextPaymentDue = Date.now() + 30 * 24 * 3600 * 1000;

  pushTransaction(account, "loan_payment", amount, `Paiement prêt ${loan.productId}`, {
    reference: loanId,
  });

  const profile = CREDIT_PROFILES.get(loan.borrowerId);
  if (profile) {
    profile.totalDebt = Math.max(0, profile.totalDebt - amount);
    profile.creditScore = Math.min(900, profile.creditScore + 2);
  }

  if (loan.amountRepaid >= loan.amountBorrowed || loan.remainingMonths === 0) {
    loan.status = "paid_off";
    if (profile) {
      profile.creditScore = Math.min(900, profile.creditScore + 15);
      profile.history.push({
        date: Date.now(),
        event: `Prêt ${loan.productId} soldé`,
        scoreChange: 15,
      });
    }
    triggerNotification(loan.borrowerId, {
      title: "🎉 Prêt remboursé !",
      body: `Le prêt ${loan.productId} est soldé. Merci!`,
      icon: "✓",
    });
  }

  return {
    ok: true,
    message: loan.status === "paid_off" ? "Prêt soldé!" : `Paiement de ${amount}$ effectué.`,
    loan,
  };
}

// ═══════════════════════════════════════════════════════════
// PLACEMENTS
// ═══════════════════════════════════════════════════════════

export function buyInvestment(
  playerId: string,
  accountId: string,
  type: InvestmentType,
  symbol: string,
  amount: number,
): { ok: boolean; message: string; investment: Investment | null } {
  const account = ACCOUNTS.get(accountId);
  if (!account) return { ok: false, message: "Compte introuvable.", investment: null };
  if (account.balance < amount) return { ok: false, message: "Solde insuffisant.", investment: null };

  const stockList = type === "crypto" ? CRYPTO_ASSETS : QUEBEC_STOCKS;
  const stock = stockList.find(s => s.symbol === symbol);
  if (!stock && (type === "stock" || type === "crypto")) {
    return { ok: false, message: "Titre introuvable.", investment: null };
  }

  const unitPrice = stock?.currentPrice ?? 100;
  const units = amount / unitPrice;

  account.balance = round2(account.balance - amount);

  const inv: Investment = {
    investmentId: uid("inv"),
    playerId,
    accountId,
    type,
    name: stock?.name ?? INVEST_LABEL[type],
    symbol: stock?.symbol,
    principal: amount,
    units,
    unitPrice,
    currentValue: amount,
    return: 0,
    dividendYield: stock?.dividendYield,
    startDate: Date.now(),
    status: "active",
    taxSheltered: account.accountType === "reer" || account.accountType === "celi",
    riskLevel: type === "crypto" ? "extreme" : type === "stock" ? "high" : type === "gic" ? "low" : "medium",
    autoReinvest: false,
  };

  if (type === "gic") {
    inv.maturityDate = Date.now() + 5 * 365 * 24 * 3600 * 1000;
  }

  INVESTMENTS.set(inv.investmentId, inv);

  pushTransaction(account, "investment", amount, `Achat ${inv.name}`, {
    reference: inv.investmentId,
  });

  return {
    ok: true,
    message: `${units.toFixed(4)} unités de ${inv.name} achetées.`,
    investment: inv,
  };
}

export function sellInvestment(
  investmentId: string,
  accountId: string,
): { ok: boolean; message: string; proceeds: number } {
  const inv = INVESTMENTS.get(investmentId);
  if (!inv) return { ok: false, message: "Placement introuvable.", proceeds: 0 };
  if (inv.status !== "active") return { ok: false, message: "Placement inactif.", proceeds: 0 };

  const account = ACCOUNTS.get(accountId);
  if (!account) return { ok: false, message: "Compte introuvable.", proceeds: 0 };

  const proceeds = inv.currentValue;
  const gain = proceeds - inv.principal;

  // Impôt sur gain en capital (si pas REER/CELI)
  let tax = 0;
  if (!inv.taxSheltered && gain > 0) {
    tax = round2(gain * 0.5 * 0.30); // 50% imposable × taux marginal ~30%
  }

  account.balance = round2(account.balance + proceeds - tax);
  inv.status = "sold";

  pushTransaction(account, "investment_sale", proceeds - tax, `Vente ${inv.name}`, {
    reference: investmentId,
  });

  if (tax > 0) {
    pushTransaction(account, "tax_payment", tax, "Impôt gain en capital");
  }

  return {
    ok: true,
    message: `${inv.name} vendu pour ${proceeds}$${tax > 0 ? ` (impôt: ${tax}$)` : ""}`,
    proceeds: proceeds - tax,
  };
}

// ═══════════════════════════════════════════════════════════
// CHÈQUES
// ═══════════════════════════════════════════════════════════

export function issueCheque(
  issuerAccountId: string,
  payeeName: string,
  amount: number,
  memo: string = "",
): { ok: boolean; message: string; cheque: Cheque | null } {
  const account = ACCOUNTS.get(issuerAccountId);
  if (!account) return { ok: false, message: "Compte introuvable.", cheque: null };

  const chequeNumber = `${Date.now().toString().slice(-6)}`;
  const cheque: Cheque = {
    chequeId: uid("chq"),
    chequeNumber,
    issuerAccountId,
    issuerName: account.playerName,
    payeeName,
    amount: round2(amount),
    memo,
    issueDate: Date.now(),
    status: "issued",
    isSigned: true,
    isCertified: false,
  };

  CHEQUES.set(cheque.chequeId, cheque);
  return { ok: true, message: `Chèque #${chequeNumber} émis.`, cheque };
}

export function cashCheque(
  chequeId: string,
  payeeAccountId: string,
): { ok: boolean; message: string; amount: number } {
  const cheque = CHEQUES.get(chequeId);
  if (!cheque) return { ok: false, message: "Chèque introuvable.", amount: 0 };
  if (cheque.status !== "issued") return { ok: false, message: "Chèque déjà encaissé/annulé.", amount: 0 };

  const issuerAccount = ACCOUNTS.get(cheque.issuerAccountId);
  const payeeAccount = ACCOUNTS.get(payeeAccountId);
  if (!issuerAccount || !payeeAccount) return { ok: false, message: "Compte introuvable.", amount: 0 };

  if (issuerAccount.balance < cheque.amount) {
    cheque.status = "bounced";
    return { ok: false, message: "❌ Chèque sans provision (NSF).", amount: 0 };
  }

  issuerAccount.balance = round2(issuerAccount.balance - cheque.amount);
  payeeAccount.balance = round2(payeeAccount.balance + cheque.amount);
  cheque.status = "cashed";
  cheque.cashDate = Date.now();
  cheque.payeeAccountId = payeeAccountId;

  pushTransaction(issuerAccount, "cheque_issued", cheque.amount, `Chèque #${cheque.chequeNumber} à ${cheque.payeeName}`, {
    chequeNumber: cheque.chequeNumber,
  });
  pushTransaction(payeeAccount, "cheque_deposit", cheque.amount, `Chèque #${cheque.chequeNumber} de ${cheque.issuerName}`, {
    chequeNumber: cheque.chequeNumber,
  });

  return { ok: true, message: `Chèque de ${cheque.amount}$ encaissé.`, amount: cheque.amount };
}

// ═══════════════════════════════════════════════════════════
// BLANCHIMENT D'ARGENT (illégal, détectable)
// ═══════════════════════════════════════════════════════════

export function launderMoney(
  playerId: string,
  dirtyAmount: number,
  businessAccountId: string,   // compte business front
  method: "restaurant" | "car_wash" | "construction" | "crypto",
): { ok: boolean; message: string; cleanAmount: number; risk: number } {
  const account = ACCOUNTS.get(businessAccountId);
  if (!account) return { ok: false, message: "Compte introuvable.", cleanAmount: 0, risk: 0 };
  if (account.accountType !== "business" && account.accountType !== "gang") {
    return { ok: false, message: "Requiert un compte entreprise.", cleanAmount: 0, risk: 0 };
  }

  // Efficacité selon méthode
  const efficiency = {
    restaurant: 0.75,
    car_wash: 0.80,
    construction: 0.85,
    crypto: 0.65,
  }[method];

  const cleanAmount = round2(dirtyAmount * efficiency);
  account.balance = round2(account.balance + cleanAmount);

  // Risque de détection (proportionnel au montant)
  const risk = Math.min(100, (dirtyAmount / 5000) * 20);

  pushTransaction(account, "laundering", cleanAmount, `Revenu ${method}`, {
    isSuspicious: risk > 50,
  });

  // Alerte au CANAFE si > 10 000$
  if (dirtyAmount >= 10000) {
    netEmit("bank:canafe_alert", {
      accountId: businessAccountId,
      playerId,
      amount: dirtyAmount,
      method,
    });
  }

  return {
    ok: true,
    message: `${cleanAmount}$ nettoyés (${(efficiency * 100)}% efficience)`,
    cleanAmount,
    risk,
  };
}

// ═══════════════════════════════════════════════════════════
// SAISIES (police / ARC)
// ═══════════════════════════════════════════════════════════

export function seizeAccount(
  accountId: string,
  reason: string,
  authorityId: string,
): { ok: boolean; message: string; amountSeized: number } {
  const account = ACCOUNTS.get(accountId);
  if (!account) return { ok: false, message: "Compte introuvable.", amountSeized: 0 };

  const amount = account.balance;
  account.balance = 0;
  account.frozen = true;
  account.frozenReason = reason;

  pushTransaction(account, "seizure", amount, `Saisie: ${reason}`, {
    otherPartyId: authorityId,
  });

  triggerNotification(account.playerId, {
    title: "⚠️ Compte saisi",
    body: `${amount}$ saisis par ${authorityId}. Raison: ${reason}`,
    icon: "🚨",
  });

  return { ok: true, message: `${amount}$ saisis.`, amountSeized: amount };
}

// ═══════════════════════════════════════════════════════════
// PAIEMENT SALAIRE (jobs.ts déclenche ceci)
// ═══════════════════════════════════════════════════════════

export function paySalary(
  employerId: string,
  employeeId: string,
  grossAmount: number,
  description: string = "Salaire",
): { ok: boolean; message: string; netAmount: number } {
  const employer = ACCOUNTS.get(employerId) || getDefaultAccount(employerId);
  const employee = getDefaultAccount(employeeId);
  if (!employer || !employee) return { ok: false, message: "Compte introuvable.", netAmount: 0 };

  // Retenues à la source (impôts fédéral + provincial + RRQ + AE)
  const fedTax = grossAmount * 0.15;
  const qcTax = grossAmount * 0.14;
  const rrq = grossAmount * 0.0640;
  const ae = grossAmount * 0.0163;
  const totalDeductions = round2(fedTax + qcTax + rrq + ae);
  const netAmount = round2(grossAmount - totalDeductions);

  if (employer.balance < grossAmount) return { ok: false, message: "Fonds insuffisants.", netAmount: 0 };

  employer.balance = round2(employer.balance - grossAmount);
  employee.balance = round2(employee.balance + netAmount);

  pushTransaction(employer, "business_expense", grossAmount, `Paie: ${employee.playerName}`, {
    otherPartyId: employeeId,
  });
  pushTransaction(employee, "salary", netAmount, description, {
    otherPartyId: employerId,
    category: "salaire",
  });

  // Mettre à jour le profil de crédit
  const profile = CREDIT_PROFILES.get(employeeId);
  if (profile) {
    profile.monthlyIncome = Math.max(profile.monthlyIncome, netAmount * 4.33);
    profile.employmentDuration++;
  }

  return { ok: true, message: `Salaire net: ${netAmount}$`, netAmount };
}

// ═══════════════════════════════════════════════════════════
// INTÉRÊTS QUOTIDIENS & TICK
// ═══════════════════════════════════════════════════════════

export function processDailyInterest(): void {
  for (const account of ACCOUNTS.values()) {
    if (account.balance <= 0 || account.locked || account.frozen) continue;
    const dailyRate = account.interestRate / 365 / 100;
    const interest = round2(account.balance * dailyRate);
    if (interest > 0) {
      account.balance += interest;
      pushTransaction(account, "interest", interest, "Intérêts quotidiens");
    }
  }

  // Mise à jour des placements
  for (const inv of INVESTMENTS.values()) {
    if (inv.status !== "active") continue;
    const stockList = inv.type === "crypto" ? CRYPTO_ASSETS : QUEBEC_STOCKS;
    const stock = stockList.find(s => s.symbol === inv.symbol);
    if (stock) {
      inv.unitPrice = stock.currentPrice;
      inv.currentValue = round2(inv.units * stock.currentPrice);
      inv.return = round2(((inv.currentValue - inv.principal) / inv.principal) * 100);
    }
  }

  netEmit("bank:daily_processed", { timestamp: Date.now() });
}

// ═══════════════════════════════════════════════════════════
// SUCCURSALES (employés joueurs)
// ═══════════════════════════════════════════════════════════

export function createBranch(
  name: string,
  address: string,
  position: { x: number; z: number },
  ownerBank: BankBranch["ownerBank"] = "desjardins",
): BankBranch {
  const transitNumber = String(Math.floor(Math.random() * 89999 + 10000));
  const branch: BankBranch = {
    branchId: uid("branch"),
    name,
    transitNumber,
    address,
    position,
    ownerBank,
    employees: [],
    vaultCash: 500000,
    vaultCapacity: 5000000,
    isOpen: false,
    openHours: { open: 8, close: 20 },
    atms: [],
    totalDeposits: 0,
    totalLoans: 0,
    todayTransactions: 0,
    securityLevel: 70,
    cameras: [],
    alarmSystem: true,
    lastRobbery: null,
    guards: [],
  };
  BRANCHES.set(branch.branchId, branch);
  return branch;
}

export function hireBankEmployee(
  branchId: string,
  hiringPlayerId: string,
  targetId: string,
  targetName: string,
  role: BankRole,
  hourlyRate: number,
): { ok: boolean; message: string } {
  const branch = BRANCHES.get(branchId);
  if (!branch) return { ok: false, message: "Succursale introuvable." };

  const hiring = branch.employees.find(e => e.playerId === hiringPlayerId);
  if (!hiring || (hiring.role !== "directeur" && hiring.role !== "directeur_adjoint")) {
    return { ok: false, message: "Permission refusée." };
  }

  if (hourlyRate < 22) return { ok: false, message: "Min. 22$/h pour la banque." };

  branch.employees.push({
    playerId: targetId,
    playerName: targetName,
    role,
    hourlyRate,
    isClockedIn: false,
    clockInTime: null,
    hoursWorked: 0,
    totalEarned: 0,
    performanceRating: 50,
    loansApproved: 0,
    accountsOpened: 0,
    branchId,
  });

  triggerNotification(targetId, {
    title: "🏦 Embauché à la banque !",
    body: `${branch.name} — ${role} @ ${hourlyRate}$/h`,
    icon: "🎉",
  });

  return { ok: true, message: "Employé embauché." };
}

// ═══════════════════════════════════════════════════════════
// BRAQUAGE DE BANQUE (illégal, gros risque)
// ═══════════════════════════════════════════════════════════

export function robBank(
  branchId: string,
  robberIds: string[],
  weaponPower: number,
): { ok: boolean; message: string; loot: number; wanted: number } {
  const branch = BRANCHES.get(branchId);
  if (!branch) return { ok: false, message: "Succursale introuvable.", loot: 0, wanted: 0 };
  if (!branch.isOpen) return { ok: false, message: "Banque fermée.", loot: 0, wanted: 0 };

  const now = Date.now();
  if (branch.lastRobbery && now - branch.lastRobbery < 3600000) {
    return { ok: false, message: "Trop tôt depuis le dernier braquage.", loot: 0, wanted: 0 };
  }

  // Chance de succès selon armes vs sécurité
  const attack = weaponPower * robberIds.length;
  const defense = branch.securityLevel + (branch.guards.length * 30);
  const success = Math.random() * (attack + defense) < attack;

  branch.lastRobbery = now;
  netEmit("police:911_call", {
    location: branch.position,
    type: "Braquage de banque",
    description: `${robberIds.length} suspects armés à ${branch.name}`,
  });

  if (!success) {
    return {
      ok: false,
      message: "❌ Braquage échoué. Police en route.",
      loot: 0,
      wanted: 300,
    };
  }

  // Loot
  const loot = Math.min(branch.vaultCash * 0.3, 250000);
  branch.vaultCash -= loot;
  const perPerson = round2(loot / robberIds.length);

  for (const robberId of robberIds) {
    const account = getDefaultAccount(robberId);
    if (account) {
      triggerNotification(robberId, {
        title: "💰 Braquage réussi",
        body: `${perPerson}$ en cash. FUYEZ MAINTENANT!`,
        icon: "🎭",
      });
    }
  }

  return {
    ok: true,
    message: `Braquage réussi: ${loot}$`,
    loot,
    wanted: 500,
  };
}

// ═══════════════════════════════════════════════════════════
// REMOTES (RPC multijoueur)
// ═══════════════════════════════════════════════════════════

registerRemote("bank:open_account", openAccount);
registerRemote("bank:deposit", deposit);
registerRemote("bank:withdraw", withdraw);
registerRemote("bank:send_interac", sendInterac);
registerRemote("bank:accept_interac", acceptInterac);
registerRemote("bank:decline_interac", declineInterac);
registerRemote("bank:transfer", transferBetweenAccounts);
registerRemote("bank:request_loan", requestLoan);
registerRemote("bank:pay_loan", payLoan);
registerRemote("bank:buy_investment", buyInvestment);
registerRemote("bank:sell_investment", sellInvestment);
registerRemote("bank:issue_cheque", issueCheque);
registerRemote("bank:cash_cheque", cashCheque);
registerRemote("bank:launder", launderMoney);
registerRemote("bank:seize", seizeAccount);
registerRemote("bank:pay_salary", paySalary);
registerRemote("bank:hire_employee", hireBankEmployee);
registerRemote("bank:rob", robBank);

// ═══════════════════════════════════════════════════════════
// HELPERS D'ACCÈS RAPIDE (compatibilité ancien code)
// ═══════════════════════════════════════════════════════════

export function getPlayerCash(playerId: string): number {
  return 0; // placeholder
}

export function addCash(amount: number, playerId?: string): void {
  netEmit("player:cash_add", { playerId, amount });
}

export function removeCash(amount: number, playerId?: string): void {
  netEmit("player:cash_remove", { playerId, amount });
}

export function transferMoney(fromId: string, toId: string, amount: number): void {
  const from = getDefaultAccount(fromId);
  const to = getDefaultAccount(toId);
  if (from && to) transferBetweenAccounts(from.accountId, to.accountId, amount);
}

// ─── EXPORTS REQUIS POUR COMPATIBILITÉ AVANT-SCÈNE / EXTRANET ───

export const EMPTY_ECONOMY = {
  cash: 0,
  bank: 0,
  debt: 0,
  transactions: [] as Transaction[],
};

export type EconomyState = typeof EMPTY_ECONOMY;

export function parseEconomy(raw: any): EconomyState {
  if (!raw) return EMPTY_ECONOMY;
  return {
    cash: typeof raw.cash === "number" ? raw.cash : 0,
    bank: typeof raw.bank === "number" ? raw.bank : 0,
    debt: typeof raw.debt === "number" ? raw.debt : 0,
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
  };
}

export function pushTx(
  accountOrTx: any,
  type?: any,
  amount?: any,
  description?: any,
  balanceAfter?: any,
  otherPartyId?: any
): void {
  // Cas 1 : appelé avec (account, type, amount, description, balance, other)
  if (accountOrTx && typeof type === "string" && typeof amount === "number") {
    const account = accountOrTx as BankAccount;
    if (account && account.accountId) {
      pushTransaction(account, type as TransactionType, amount, description ?? "Opération", {
        otherPartyId: typeof otherPartyId === "string" ? otherPartyId : undefined,
        balanceAfter: typeof balanceAfter === "number" ? balanceAfter : account.balance,
      });
      return;
    }
  }
  // Cas 2 : appelé avec un objet {from, to, amount, label}
  if (accountOrTx && typeof accountOrTx === "object" && 'amount' in accountOrTx) {
    const tx = accountOrTx as { from?: string; to?: string; amount: number; label: string };
    console.log(`[Banque] Transaction enregistrée: ${tx.label} — ${tx.amount}$`);
    if (tx.from) {
      const acc = getDefaultAccount(tx.from);
      if (acc) {
        pushTransaction(acc, "transfer", tx.amount, tx.label);
      }
    }
  }
}

export function breakAtm(atmId: string): { ok: boolean; cashLooted: number } {
  const atm = ATMS.get(atmId);
  if (!atm) return { ok: false, cashLooted: 0 };
  atm.broken = true;
  atm.brokenReason = "vandalized";
  const loot = Math.min(atm.cash, 1000 + Math.floor(Math.random() * 3000));
  atm.cash = Math.max(0, atm.cash - loot);
  return { ok: true, cashLooted: loot };
}

export function atmStatus(param1?: any, param2?: any): { online: boolean; cashAvailable: number; broken?: boolean; cash?: number } {
  const atmId = typeof param1 === "string" ? param1 : typeof param2 === "string" ? param2 : null;
  const atm = atmId ? ATMS.get(atmId) : null;
  const isBroken = atm ? atm.broken : false;
  const cash = atm ? atm.cash : 25000;
  return {
    online: !isBroken,
    broken: isBroken,
    cashAvailable: cash,
    cash: cash,
  };
}

// ═══════════════════════════════════════════════════════════
// EXPORTS ADDITIONNELS
// ═══════════════════════════════════════════════════════════

export {
  ACCOUNTS,
  CARDS,
  LOANS,
  INVESTMENTS,
  BRANCHES,
  ATMS,
};

export function getBranch(id: string): BankBranch | null {
  return BRANCHES.get(id) ?? null;
}

export function getAllBranches(): BankBranch[] {
  return Array.from(BRANCHES.values());
}

export function getCreditProfile(playerId: string): CreditProfile | null {
  return CREDIT_PROFILES.get(playerId) ?? null;
}

export function getLoan(loanId: string): Loan | null {
  return LOANS.get(loanId) ?? null;
}

export function getPlayerLoans(playerId: string): Loan[] {
  return Array.from(LOANS.values()).filter(l => l.borrowerId === playerId);
}

export function getPlayerInvestments(playerId: string): Investment[] {
  return Array.from(INVESTMENTS.values()).filter(i => i.playerId === playerId);
}
/* ================================================================
 * TROX T WORLD — COMPATIBILITÉ STORE / BANKING
 *
 * Le moteur bancaire moderne fonctionne par comptes.
 * Le store historique conserve un EconomyState simplifié.
 *
 * Ces fonctions adaptent le contrat du store sans supprimer
 * les API bancaires modernes.
 * ================================================================ */

function legacyEconomySync(
  economy: EconomyState,
  cash: number,
  bank: number,
): EconomyState {
  return {
    ...(economy as any),
    cash: Math.round(cash * 100) / 100,
    bank: Math.round(bank * 100) / 100,
  } as EconomyState;
}

function legacyEconomyTx(
  economy: EconomyState,
  description: string,
  amount: number,
): EconomyState {
  const transactions = Array.isArray((economy as any).transactions)
    ? [...(economy as any).transactions]
    : [];

  transactions.push({
    id: `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "legacy",
    amount,
    description,
    timestamp: Date.now(),
  });

  return {
    ...(economy as any),
    transactions,
  } as EconomyState;
}

export function opDeposit(
  economy: EconomyState,
  cash: number,
  bank: number,
  amount: number,
  _atmId: string | null = null,
) {
  const n = Math.round(amount * 100) / 100;

  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      reason: "Montant invalide.",
    };
  }

  if (cash < n) {
    return {
      ok: false,
      reason: "Espèces insuffisantes.",
    };
  }

  const nextCash = Math.round((cash - n) * 100) / 100;
  const nextBank = Math.round((bank + n) * 100) / 100;

  let nextEconomy = legacyEconomySync(
    economy,
    nextCash,
    nextBank,
  );

  nextEconomy = legacyEconomyTx(
    nextEconomy,
    "Dépôt GAB",
    n,
  );

  return {
    ok: true,
    cash: nextCash,
    bank: nextBank,
    economy: nextEconomy,
  };
}

export function opWithdraw(
  economy: EconomyState,
  cash: number,
  bank: number,
  amount: number,
  _atmId: string | null = null,
) {
  const n = Math.round(amount * 100) / 100;

  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      reason: "Montant invalide.",
    };
  }

  if (bank < n) {
    return {
      ok: false,
      reason: "Solde Caisse insuffisant.",
    };
  }

  const nextCash = Math.round((cash + n) * 100) / 100;
  const nextBank = Math.round((bank - n) * 100) / 100;

  let nextEconomy = legacyEconomySync(
    economy,
    nextCash,
    nextBank,
  );

  nextEconomy = legacyEconomyTx(
    nextEconomy,
    "Retrait GAB",
    -n,
  );

  return {
    ok: true,
    cash: nextCash,
    bank: nextBank,
    economy: nextEconomy,
  };
}

export function opTransferPersonalToFirm(
  economy: EconomyState,
  bank: number,
  firmBalance: number,
  amount: number,
) {
  const n = Math.round(amount * 100) / 100;

  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      reason: "Montant invalide.",
    };
  }

  if (bank < n) {
    return {
      ok: false,
      reason: "Solde personnel insuffisant.",
    };
  }

  const nextBank = Math.round((bank - n) * 100) / 100;
  const nextFirmBalance =
    Math.round((firmBalance + n) * 100) / 100;

  let nextEconomy = legacyEconomySync(
    economy,
    Number((economy as any).cash ?? 0),
    nextBank,
  );

  nextEconomy = legacyEconomyTx(
    nextEconomy,
    "Virement personnel vers entreprise",
    -n,
  );

  return {
    ok: true,
    bank: nextBank,
    firmBalance: nextFirmBalance,
    economy: nextEconomy,
  };
}

export function opTransferFirmToPersonal(
  economy: EconomyState,
  bank: number,
  firmBalance: number,
  amount: number,
) {
  const n = Math.round(amount * 100) / 100;

  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      reason: "Montant invalide.",
    };
  }

  if (firmBalance < n) {
    return {
      ok: false,
      reason: "Solde entreprise insuffisant.",
    };
  }

  const nextBank = Math.round((bank + n) * 100) / 100;
  const nextFirmBalance =
    Math.round((firmBalance - n) * 100) / 100;

  let nextEconomy = legacyEconomySync(
    economy,
    Number((economy as any).cash ?? 0),
    nextBank,
  );

  nextEconomy = legacyEconomyTx(
    nextEconomy,
    "Virement entreprise vers personnel",
    n,
  );

  return {
    ok: true,
    bank: nextBank,
    firmBalance: nextFirmBalance,
    economy: nextEconomy,
  };
}

export function opRequestLoan(
  economy: EconomyState,
  bank: number,
  _playerId: string,
  _playerName: string,
  amount: number,
) {
  const n = Math.round(amount * 100) / 100;

  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      reason: "Montant invalide.",
    };
  }

  if (n > 250000) {
    return {
      ok: false,
      reason: "Montant de prêt trop élevé.",
    };
  }

  const nextBank = Math.round((bank + n) * 100) / 100;

  let nextEconomy = legacyEconomySync(
    economy,
    Number((economy as any).cash ?? 0),
    nextBank,
  );

  nextEconomy = legacyEconomyTx(
    nextEconomy,
    "Prêt Caisse populaire",
    n,
  );

  nextEconomy = {
    ...(nextEconomy as any),
    debt:
      Math.round(
        (
          Number((nextEconomy as any).debt ?? 0) + n
        ) * 100,
      ) / 100,
  } as EconomyState;

  return {
    ok: true,
    bank: nextBank,
    economy: nextEconomy,
  };
}

export function opInvest(
  economy: EconomyState,
  bank: number,
  _playerId: string,
  type: InvestmentType,
  amount: number,
) {
  const n = Math.round(amount * 100) / 100;

  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      reason: "Montant invalide.",
    };
  }

  if (bank < n) {
    return {
      ok: false,
      reason: "Solde insuffisant.",
    };
  }

  const nextBank = Math.round((bank - n) * 100) / 100;

  let nextEconomy = legacyEconomySync(
    economy,
    Number((economy as any).cash ?? 0),
    nextBank,
  );

  nextEconomy = legacyEconomyTx(
    nextEconomy,
    `Placement ${String(type)}`,
    -n,
  );

  return {
    ok: true,
    bank: nextBank,
    economy: nextEconomy,
  };
}

export function opSellInvestment(
  economy: EconomyState,
  bank: number,
  investmentRef: unknown,
) {
  let proceeds = 0;

  if (
    typeof investmentRef === "number" &&
    Number.isFinite(investmentRef)
  ) {
    proceeds = Math.round(investmentRef * 100) / 100;
  }

  /*
   * Compatibilité avec l'ancien store :
   * lorsqu'un identifiant est fourni, retrouver le dernier
   * mouvement de placement connu dans EconomyState.
   */
  if (
    proceeds <= 0 &&
    Array.isArray((economy as any).transactions)
  ) {
    const txs = (economy as any).transactions as any[];

    for (let i = txs.length - 1; i >= 0; i--) {
      const tx = txs[i];

      if (
        tx &&
        typeof tx.amount === "number" &&
        tx.amount < 0 &&
        typeof tx.description === "string" &&
        tx.description.toLowerCase().includes("placement")
      ) {
        proceeds = Math.round(
          Math.abs(tx.amount) * 100,
        ) / 100;

        break;
      }
    }
  }

  if (proceeds <= 0) {
    return {
      ok: false,
      reason: "Placement introuvable.",
    };
  }

  const nextBank =
    Math.round((bank + proceeds) * 100) / 100;

  let nextEconomy = legacyEconomySync(
    economy,
    Number((economy as any).cash ?? 0),
    nextBank,
  );

  nextEconomy = legacyEconomyTx(
    nextEconomy,
    "Rachat placement",
    proceeds,
  );

  return {
    ok: true,
    bank: nextBank,
    economy: nextEconomy,
  };
}

export function tickEconomy(
  economy: EconomyState,
  bank: number,
  gameHours: number,
) {
  const previousHours = Number(
    (economy as any).lastHours ?? gameHours,
  );

  const deltaHours =
    Number.isFinite(gameHours)
      ? gameHours - previousHours
      : 0;

  let nextBank = bank;

  let nextEconomy = {
    ...(economy as any),
    bank,
    lastHours: gameHours,
  } as EconomyState;

  /*
   * Le store fonctionne en temps de jeu.
   * On applique ici un petit rendement de compatibilité
   * lorsqu'une journée complète s'est écoulée.
   */
  if (deltaHours >= 24) {
    const days = Math.floor(deltaHours / 24);

    const interest =
      Math.round(
        Math.max(0, nextBank) *
        0.0001 *
        days *
        100,
      ) / 100;

    nextBank =
      Math.round((nextBank + interest) * 100) / 100;

    nextEconomy = legacyEconomySync(
      nextEconomy,
      Number((economy as any).cash ?? 0),
      nextBank,
    );

    if (interest > 0) {
      nextEconomy = legacyEconomyTx(
        nextEconomy,
        "Intérêts bancaires",
        interest,
      );
    }

    return {
      economy: nextEconomy,
      bank: nextBank,
      notice:
        interest > 0
          ? `Intérêts +${interest}$`
          : null,
    };
  }

  return {
    economy: nextEconomy,
    bank: nextBank,
    notice: null,
  };
}