/**
 * 🏦 BANKING — Système bancaire Desjardins complet
 * Comptes · Transactions · Prêts · Placements · Interac · Cartes
 */
import {
  BANKING_CONSTANTS as C,
  uid, round2, clamp,
  type AccountType,
} from "./config";
import type {
  BankAccount, BankCard, Transaction, TransactionType,
  Loan, LoanProduct, Investment, InvestmentType,
  CreditProfile, InteracTransfer, Atm,
  BankBranch, BankEmployee, BankRole,
} from "./types";

// ═══════════════════════════════════════════════════════════
// REGISTRES GLOBAUX
// ═══════════════════════════════════════════════════════════

export const ACCOUNTS = new Map<string, BankAccount>();
export const CARDS = new Map<string, BankCard>();
export const TRANSACTIONS = new Map<string, Transaction[]>();
export const LOANS = new Map<string, Loan>();
export const INVESTMENTS = new Map<string, Investment>();
export const ATMS = new Map<string, Atm>();
export const BRANCHES = new Map<string, BankBranch>();
export const CREDIT_PROFILES = new Map<string, CreditProfile>();
export const INTERAC_PENDING = new Map<string, InteracTransfer>();

// ═══════════════════════════════════════════════════════════
// PRODUITS DE PRÊT (taux réels Desjardins 2025)
// ═══════════════════════════════════════════════════════════

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
  initialDeposit = 0,
  openedBy?: string,
): OpenAccountResult {
  const branch = BRANCHES.get(branchId);
  if (!branch) {
    return { success: false, message: "Succursale introuvable.", account: null, card: null };
  }

  // Vérifier CELI (limite annuelle)
  if (accountType === "celi") {
    const existing = getPlayerAccounts(playerId).find((a) => a.accountType === "celi");
    if (existing) {
      return {
        success: false,
        message: "Vous avez déjà un CELI. Utilisez celui-ci.",
        account: null, card: null,
      };
    }
  }

  // Numéro de compte format québécois
  const accountNum = Math.floor(Math.random() * 9000000 + 1000000);
  const accountNumber = `815-${branch.transitNumber}-${accountNum}`;

  const account: BankAccount = {
    accountId: uid("acc"),
    accountNumber,
    transitNumber: branch.transitNumber,
    institutionNumber: "815",
    playerId,
    playerName,
    accountType,
    balance: round2(initialDeposit),
    overdraft: 0,
    overdraftLimit: accountType === "cheque" ? C.OVERDRAFT_LIMIT_CHEQUE : 0,
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
    celiRoom: accountType === "celi" ? C.CELI_ANNUAL_ROOM : 0,
    isDefault: getPlayerAccounts(playerId).length === 0,
    branchId,
  };

  ACCOUNTS.set(account.accountId, account);
  TRANSACTIONS.set(account.accountId, []);

  // Profil de crédit
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
      history: [{ date: Date.now(), event: "Ouverture premier compte", scoreChange: 0 }],
    });
  }

  // Carte de débit
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

  branch.totalDeposits += initialDeposit;
  branch.todayTransactions++;

  return {
    success: true,
    message: `Compte ${accountType} ouvert. Numéro: ${accountNumber}`,
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
    case "cheque": return C.CHEQUING_MONTHLY_FEE;
    case "business": return C.BUSINESS_MONTHLY_FEE;
    case "epargne": return 0;
    default: return 0;
  }
}

function generateCardNumber(type: CardType): string {
  const prefix = type === "credit" ? "4530" : "4520";
  const parts = [prefix];
  for (let i = 0; i < 3; i++) parts.push(Math.floor(Math.random() * 9000 + 1000).toString());
  return parts.join("-");
}

function generateCVV(): string {
  return Math.floor(Math.random() * 900 + 100).toString();
}

function generatePIN(): string {
  return Math.floor(Math.random() * 9000 + 1000).toString();
}

// ═══════════════════════════════════════════════════════════
// CONSULTATION
// ═══════════════════════════════════════════════════════════

export function getPlayerAccounts(playerId: string): BankAccount[] {
  return Array.from(ACCOUNTS.values()).filter((a) => a.playerId === playerId);
}

export function getAccount(accountId: string): BankAccount | null {
  return ACCOUNTS.get(accountId) ?? null;
}

export function getDefaultAccount(playerId: string): BankAccount | null {
  return getPlayerAccounts(playerId).find((a) => a.isDefault) ?? null;
}

export function getPlayerCards(playerId: string): BankCard[] {
  return Array.from(CARDS.values()).filter((c) => c.playerId === playerId);
}

export function getAccountTransactions(accountId: string, limit = 50): Transaction[] {
  const txs = TRANSACTIONS.get(accountId) ?? [];
  return txs.slice(0, limit);
}

export function getPlayerLoans(playerId: string): Loan[] {
  return Array.from(LOANS.values()).filter((l) => l.borrowerId === playerId);
}

export function getPlayerInvestments(playerId: string): Investment[] {
  return Array.from(INVESTMENTS.values()).filter((i) => i.playerId === playerId);
}

export function getCreditProfile(playerId: string): CreditProfile | null {
  return CREDIT_PROFILES.get(playerId) ?? null;
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

  // Détection blanchiment (dépôts > 10 000$)
  if (amount >= 10000 && (type === "deposit" || type === "wire_transfer")) {
    tx.isSuspicious = true;
  }

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

  const n = round2(amount);
  if (n <= 0) return { ok: false, message: "Montant invalide." };

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

  const tx = pushTransaction(account, txType, n, `Dépôt ${source}`);

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

  const n = round2(amount);
  if (n <= 0) return { ok: false, message: "Montant invalide." };

  // Limite GAB
  if (atmId && n > C.ATM_MAX_WITHDRAWAL) {
    return { ok: false, message: `Maximum ${C.ATM_MAX_WITHDRAWAL}$ par retrait.` };
  }

  const available = account.balance + account.overdraftLimit;
  if (available < n) {
    return { ok: false, message: `Solde insuffisant (disponible: ${available}$)` };
  }

  let interacFee = 0;
  if (atmId) {
    const atm = ATMS.get(atmId);
    if (!atm) return { ok: false, message: "GAB introuvable." };
    if (atm.broken) return { ok: false, message: "GAB hors service." };
    if (atm.cash < n) return { ok: false, message: "GAB à sec — allez au comptoir." };

    if (atm.ownerBank !== "desjardins") {
      interacFee = atm.interacFee || C.ATM_INTERAC_FEE_OTHER;
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
    card.lastUsed = Date.now();
  }

  account.balance = round2(account.balance - n - interacFee);

  const tx = pushTransaction(account, "withdrawal", n, "Retrait GAB", {
    cardUsed: usingCard ?? undefined,
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
// VIREMENTS INTERAC
// ═══════════════════════════════════════════════════════════

export function sendInterac(
  senderAccountId: string,
  recipientId: string,
  amount: number,
  securityQuestion: string,
  securityAnswer: string,
  memo?: string,
): { ok: boolean; message: string; transfer: InteracTransfer | null } {
  const sender = ACCOUNTS.get(senderAccountId);
  if (!sender) return { ok: false, message: "Compte introuvable.", transfer: null };

  const n = round2(amount);
  const fee = C.INTERAC_FEE;

  if (sender.balance < n + fee) {
    return { ok: false, message: `Solde insuffisant (${n + fee}$ requis)`, transfer: null };
  }

  const transfer: InteracTransfer = {
    transferId: uid("interac"),
    senderId: sender.playerId,
    senderName: sender.playerName,
    senderAccountId,
    recipientPlayerId: recipientId,
    amount: n,
    currency: "CAD",
    securityQuestion,
    securityAnswer: securityAnswer.toLowerCase().trim(),
    memo,
    status: "pending",
    sentDate: Date.now(),
    expiryDate: Date.now() + C.INTERAC_EXPIRY_DAYS * 24 * 3600 * 1000,
    autoDepositEnabled: false,
    fee,
  };

  sender.balance = round2(sender.balance - n - fee);
  pushTransaction(sender, "interac", n, `Virement Interac à ${recipientId}`, {
    otherPartyId: recipientId,
    reference: transfer.transferId,
    isPending: true,
  });
  pushTransaction(sender, "fee", fee, "Frais virement Interac");

  INTERAC_PENDING.set(transfer.transferId, transfer);

  return { ok: true, message: `Virement de ${n}$ envoyé.`, transfer };
}

export function acceptInterac(
  transferId: string,
  recipientAccountId: string,
  answer: string,
): { ok: boolean; message: string; balance?: number } {
  const transfer = INTERAC_PENDING.get(transferId);
  if (!transfer) return { ok: false, message: "Virement introuvable." };
  if (transfer.status !== "pending") return { ok: false, message: "Déjà traité." };
  if (Date.now() > transfer.expiryDate) {
    transfer.status = "expired";
    return { ok: false, message: "Virement expiré." };
  }

  const recipient = ACCOUNTS.get(recipientAccountId);
  if (!recipient) return { ok: false, message: "Compte introuvable." };
  if (recipient.playerId !== transfer.recipientPlayerId) {
    return { ok: false, message: "Compte incorrect." };
  }

  if (answer.toLowerCase().trim() !== transfer.securityAnswer) {
    return { ok: false, message: "❌ Réponse incorrecte." };
  }

  transfer.status = "accepted";
  transfer.acceptedDate = Date.now();

  recipient.balance = round2(recipient.balance + transfer.amount);
  pushTransaction(recipient, "interac", transfer.amount, `Interac de ${transfer.senderName}`, {
    otherPartyId: transfer.senderId,
    otherPartyName: transfer.senderName,
    reference: transferId,
  });

  return {
    ok: true,
    message: `${transfer.amount}$ déposés dans votre compte.`,
    balance: recipient.balance,
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
  const product = LOAN_PRODUCTS.find((p) => p.id === productId);
  if (!product) return { ok: false, message: "Produit introuvable.", loan: null };

  const profile = CREDIT_PROFILES.get(playerId);
  if (!profile) return { ok: false, message: "Profil de crédit introuvable.", loan: null };

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
      message: `Montant hors limites (${product.minPrincipal}$ – ${product.maxPrincipal}$)`,
      loan: null,
    };
  }

  if (product.requiresCollateral && !collateral) {
    return { ok: false, message: "Garantie requise.", loan: null };
  }

  // Amortissement
  const monthlyRate = product.rate / 100 / 12;
  const months = requestedMonths;
  const payment = round2(
    (requestedAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)),
  );

  // Ratio endettement max 39%
  const debtRatio = (profile.totalDebt + payment) / profile.monthlyIncome;
  if (debtRatio > C.LOAN_DEBT_RATIO_MAX) {
    return {
      ok: false,
      message: `❌ Ratio d'endettement trop élevé (${(debtRatio * 100).toFixed(1)}% > 39%)`,
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

  account.balance = round2(account.balance + requestedAmount);
  pushTransaction(account, "loan", requestedAmount, `Prêt ${product.label}`, {
    reference: loan.loanId,
  });

  profile.totalDebt += requestedAmount;
  profile.activeAccounts++;
  profile.creditScore = Math.max(300, profile.creditScore - 5);
  profile.history.push({
    date: Date.now(),
    event: `Nouveau prêt ${product.label} (${requestedAmount}$)`,
    scoreChange: -5,
  });

  return { ok: true, message: `Prêt ${product.label} approuvé: ${requestedAmount}$`, loan };
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
  }

  return {
    ok: true,
    message: loan.status === "paid_off" ? "Prêt soldé!" : `Paiement de ${amount}$ effectué.`,
    loan,
  };
}

// ═══════════════════════════════════════════════════════════
// INTÉRÊTS QUOTIDIENS
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
}

// ═══════════════════════════════════════════════════════════
// HELPERS — COMPAT
// ═══════════════════════════════════════════════════════════

export function getPlayerCash(_playerId: string): number {
  return 0;
}

export function addCash(_amount: number, _playerId?: string): void {
  // Délégué au wallet externe
}

export function removeCash(_amount: number, _playerId?: string): void {
  // Délégué au wallet externe
}

export function transferMoney(fromId: string, toId: string, amount: number): void {
  const from = getDefaultAccount(fromId);
  const to = getDefaultAccount(toId);
  if (from && to) {
    from.balance = round2(from.balance - amount);
    to.balance = round2(to.balance + amount);
    pushTransaction(from, "transfer", amount, `Virement à ${to.playerName}`);
    pushTransaction(to, "transfer", amount, `Virement de ${from.playerName}`);
  }
}

export function getBranch(branchId: string): BankBranch | null {
  return BRANCHES.get(branchId) ?? null;
}

export function getAllBranches(): BankBranch[] {
  return Array.from(BRANCHES.values());
}

export function getLoan(loanId: string): Loan | null {
  return LOANS.get(loanId) ?? null;
}