/**
 * 🏦 TYPES — Système Desjardins
 */
import type { AccountType } from "./config";

// ─── Transactions ───
export type TransactionType =
  | "deposit" | "withdrawal" | "transfer" | "interac"
  | "salary" | "loan" | "loan_payment" | "investment"
  | "investment_sale" | "business_income" | "business_expense"
  | "cheque_deposit" | "cheque_issued" | "credit_card"
  | "credit_payment" | "mortgage_payment" | "tax_payment"
  | "fee" | "interest" | "atm_fee" | "wire_transfer"
  | "laundering" | "seizure" | "refund";

// ─── Comptes ───
export interface BankAccount {
  accountId: string;
  accountNumber: string;
  transitNumber: string;
  institutionNumber: string; // "815"
  playerId: string;
  playerName: string;
  accountType: AccountType;
  balance: number;
  overdraft: number;
  overdraftLimit: number;
  currency: "CAD" | "USD";
  createdDate: number;
  pin?: string;
  locked: boolean;
  frozen: boolean;
  frozenReason?: string;
  interestRate: number;
  monthlyFees: number;
  linkedAccounts: string[];
  jointHolders: string[];
  authorizedUsers: string[];
  taxDeductions: number;
  celiRoom: number;
  isDefault: boolean;
  branchId: string;
}

// ─── Cartes ───
export type CardType = "debit" | "credit" | "prepaid" | "business_debit";
export type CardStatus = "active" | "blocked" | "expired" | "stolen" | "lost";

export interface BankCard {
  cardId: string;
  cardNumber: string; // 4530-XXXX-XXXX-XXXX
  cardType: CardType;
  linkedAccountId: string;
  playerId: string;
  playerName: string;
  pin: string;
  cvv: string;
  expiryDate: number;
  status: CardStatus;
  creditLimit?: number;
  currentBalance?: number;
  minimumPayment?: number;
  paymentDueDate?: number;
  interestRate: number;
  contactlessEnabled: boolean;
  internationalEnabled: boolean;
  onlinePurchasesEnabled: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  lastUsed: number;
}

// ─── Transactions ───
export interface Transaction {
  transactionId: string;
  accountId: string;
  playerId: string;
  type: TransactionType;
  amount: number;
  timestamp: number;
  description: string;
  category?: string;
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
  isSuspicious: boolean;
  taxReceiptRequired: boolean;
}

// ─── Prêts ───
export type LoanType = "personal" | "auto" | "reno" | "mortgage" | "business" | "student" | "payday";
export type LoanStatus = "active" | "paid_off" | "defaulted" | "restructured";

export interface Loan {
  loanId: string;
  loanType: LoanType;
  borrowerId: string;
  borrowerName: string;
  lenderId: string;
  lenderName: string;
  cosignerId?: string;
  principal: number;
  amountBorrowed: number;
  amountRepaid: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  remainingMonths: number;
  missedPayments: number;
  productId?: string;
  status: LoanStatus;
  startDate: number;
  nextPaymentDue: number;
  collateral?: {
    type: "vehicle" | "property" | "business" | "none";
    itemId: string;
    estimatedValue: number;
  };
  penaltyRate: number;
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
  rate: number;
  requiresCollateral: boolean;
  minCreditScore: number;
  minIncome: number;
  hint: string;
}

// ─── Placements ───
export type InvestmentType = "stock" | "bond" | "gic" | "mutual_fund" | "etf" | "crypto" | "business" | "property";
export type InvestmentStatus = "active" | "sold" | "lost" | "matured";

export interface Investment {
  investmentId: string;
  playerId: string;
  accountId: string;
  type: InvestmentType;
  name: string;
  symbol?: string;
  principal: number;
  units: number;
  unitPrice: number;
  currentValue: number;
  return: number;
  dividendYield?: number;
  startDate: number;
  maturityDate?: number;
  status: InvestmentStatus;
  taxSheltered: boolean;
  riskLevel: "low" | "medium" | "high" | "extreme";
  autoReinvest: boolean;
}

// ─── Crédit ───
export interface CreditProfile {
  playerId: string;
  creditScore: number; // 300-900
  totalDebt: number;
  monthlyIncome: number;
  employmentStatus: "employed" | "self_employed" | "unemployed" | "retired" | "student";
  employer?: string;
  employmentDuration: number;
  latePayments: number;
  bankruptcies: number;
  collections: number;
  activeAccounts: number;
  creditUtilization: number;
  oldestAccountAge: number;
  inquiries: number;
  lastUpdated: number;
  history: Array<{
    date: number;
    event: string;
    scoreChange: number;
  }>;
}

// ─── Interac ───
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
  expiryDate: number;
  autoDepositEnabled: boolean;
  fee: number;
}

// ─── GAB ───
export interface Atm {
  atmId: string;
  location: { x: number; y: number; z: number };
  address: string;
  ownerBank: "desjardins" | "national" | "bmo" | "rbc" | "td" | "cibc" | "scotia" | "independent";
  cash: number;
  maxCapacity: number;
  minCapacity: number;
  broken: boolean;
  brokenReason?: "empty" | "vandalized" | "robbery" | "maintenance" | "network";
  lastRestock: number;
  lastServiced: number;
  alarmActive: boolean;
  transactionsCount: number;
  totalDispensed: number;
  isIndoor: boolean;
  hasSecurityGuard: boolean;
  robberyResistance: number;
  interacFee: number;
  currentUser: string | null;
  outOfOrderUntil?: number;
}

// ─── Succursales ───
export type BankRole =
  | "directeur" | "directeur_adjoint" | "conseiller"
  | "conseiller_financier" | "caissier" | "agent_securite"
  | "specialiste_hypotheque" | "conseiller_placement" | "client";

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

export interface BankBranch {
  branchId: string;
  name: string;
  transitNumber: string;
  address: string;
  position: { x: number; z: number };
  ownerBank: "desjardins" | "national" | "bmo" | "rbc";
  employees: BankEmployee[];
  vaultCash: number;
  vaultCapacity: number;
  isOpen: boolean;
  openHours: { open: number; close: number };
  atms: string[];
  totalDeposits: number;
  totalLoans: number;
  todayTransactions: number;
  securityLevel: number;
  cameras: string[];
  alarmSystem: boolean;
  lastRobbery: number | null;
  guards: string[];
}

// ─── Guichets ───
export interface Teller {
  id: string;
  branchId: string;
  position: { x: number; y: number; z: number };
  operatedBy: string | null;
  cashDrawer: number;
  isOpen: boolean;
  currentCustomerId: string | null;
  waitingClients: string[];
  totalTransactionsToday: number;
  totalRevenueToday: number;
}

// ─── Files d'attente ───
export interface QueueTicket {
  ticketId: string;
  ticketNumber: number;
  playerId: string;
  playerName: string;
  branchId: string;
  service: "caissier" | "conseiller" | "hypotheque" | "ouverture_compte";
  requestedAt: number;
  calledAt: number | null;
  servedBy: string | null;
  status: "waiting" | "called" | "in_service" | "completed" | "abandoned";
}

// ─── Rendez-vous ───
export interface Appointment {
  appointmentId: string;
  branchId: string;
  clientId: string;
  clientName: string;
  advisorId: string | null;
  service: "pret" | "hypotheque" | "placement" | "ouverture_compte" | "conseil";
  scheduledFor: number;
  duration: number;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  notes: string;
}

// ─── Voûte ───
export interface CaisseVault {
  id: string;
  branchId: string;
  combination: string;
  cash: number;
  gold: number;
  safetyDeposits: SafetyDeposit[];
  isOpen: boolean;
  openedBy: string | null;
  openedAt: number | null;
  lastAuditDate: number;
  requiredRoles: BankRole[];
  timeLockUntil: number | null;
  attempts: Array<{
    playerId: string;
    timestamp: number;
    combinationTried: string;
    success: boolean;
  }>;
}

export interface SafetyDeposit {
  boxId: string;
  ownerId: string;
  ownerName: string;
  contents: Array<{ itemId: string; quantity: number; description: string }>;
  cash: number;
  rentalFee: number;
  paidUntil: number;
}

// ─── Alarmes ───
export interface AlarmSystem {
  branchId: string;
  isActive: boolean;
  isSilent: boolean;
  triggeredBy: string | null;
  triggeredAt: number | null;
  policeNotified: boolean;
  responseTime: number;
  camerasRecording: boolean;
  panicButtons: Array<{ x: number; y: number; z: number }>;
}

// ─── Braquages ───
export interface Robbery {
  robberyId: string;
  branchId: string;
  robberIds: string[];
  startTime: number;
  endTime: number | null;
  hostages: string[];
  demandsCash: number;
  actualLoot: number;
  weaponsUsed: string[];
  status: "in_progress" | "successful" | "failed" | "escaped";
  policeArrivalTime: number | null;
  vaultCracked: boolean;
  camerasDisabled: boolean;
  witnesses: string[];
}

// ─── Garda ───
export interface GardaTruck {
  truckId: string;
  driverId: string | null;
  guardIds: string[];
  cargo: number;
  maxCargo: number;
  currentBranchId: string | null;
  targetBranchId: string;
  route: Array<{ x: number; z: number }>;
  status: "loading" | "en_route" | "delivering" | "returning" | "hijacked";
  armorLevel: number;
  gpsBeacon: boolean;
  eta: number;
}