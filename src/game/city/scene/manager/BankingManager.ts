// ═══════════════════════════════════════════════════════════════════════════
//  BANKING SYSTEM v2.0 — SYSTÈME FINANCIER & CAISSE DESJARDINS RP
//  src/game/commerce/BankingManager.ts
//  Sécurisation anti-dupe · Comptes persistants (SQLite) · Prêts & Investissements
// ═══════════════════════════════════════════════════════════════════════════

import { intellectus } from '../../intellectus';

export type TransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'transfer' 
  | 'salary' 
  | 'loan' 
  | 'investment' 
  | 'business_income'
  | 'fine';

export interface BankAccount {
  accountId: string;
  playerId: string;
  playerName: string;
  balance: number;
  createdDate: number;
  accountType: 'personal' | 'business' | 'gang';
  pin?: string;
  locked: boolean;
}

export interface Transaction {
  transactionId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  timestamp: number;
  description: string;
  otherParty?: string; // Nom ou ID de la contrepartie
  balance: number;     // Solde après la transaction
}

export interface Loan {
  loanId: string;
  borrowerId: string;
  borrowerName: string;
  lenderId: string;
  principal: number;
  amountBorrowed: number;
  interestRate: number; // Taux d'intérêt fixe (%)
  monthlyPayment: number;
  remainingMonths: number;
  status: 'active' | 'paid_off' | 'defaulted';
  startDate: number;
  nextPaymentDue: number;
}

export interface Investment {
  investmentId: string;
  playerId: string;
  type: 'stock' | 'business' | 'property' | 'crypto';
  principal: number;
  currentValue: number;
  returnRate: number; // % de rendement
  startDate: number;
  status: 'active' | 'sold' | 'lost';
}

export interface ATM {
  atmId: string;
  name: string;
  location: { x: number; y: number; z: number };
  balance: number;
  maxCapacity: number;
  broken: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
//  BANKING MANAGER (AUTORITAIRE SERVEUR)
// ─────────────────────────────────────────────────────────────────────────

export class BankingManager {
  private atms: Map<string, ATM> = new Map();
  private updateListener: ((data: any) => void) | null = null;
  private backgroundInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeATMs();
    this.startBackgroundSystems();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. INITIALISATION DES ATMs DE LA ROUTE 138 (DESJARDINS STYLE)
  // ─────────────────────────────────────────────────────────────────────────

  private initializeATMs() {
    const atmsData: ATM[] = [
      {
        atmId: 'atm_burger_king_portneuf',
        name: '🏧 Guichet Burger King Portneuf',
        location: { x: 45, y: 1.0, z: -85 },
        balance: 15000,
        maxCapacity: 50000,
        broken: false,
      },
      {
        atmId: 'atm_caisse_st_casimir',
        name: '🏦 Caisse Desjardins de Saint-Casimir',
        location: { x: -500, y: 1.0, z: -400 },
        balance: 120000,
        maxCapacity: 200000,
        broken: false,
      },
      {
        atmId: 'atm_caisse_portneuf',
        name: '🏦 Caisse Desjardins du chef-lieu de Portneuf',
        location: { x: 10200, y: 1.0, z: -20 },
        balance: 350000,
        maxCapacity: 500000,
        broken: false,
      },
    ];

    atmsData.forEach((atm) => this.atms.set(atm.atmId, atm));
    console.log(`🏦 [BankingManager] ${this.atms.size} ATMs Desjardins branchés.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CREATION ET GESTION DES COMPTES PERSISTANTS (SQLITE)
  // ─────────────────────────────────────────────────────────────────────────

  public getOrCreateAccount(
    playerId: string,
    playerName: string,
    accountType: 'personal' | 'business' | 'gang' = 'personal'
  ): BankAccount {
    const existing = this.getPlayerAccounts(playerId).find((a) => a.accountType === accountType);
    if (existing) return existing;

    const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const account: BankAccount = {
      accountId,
      playerId,
      playerName,
      balance: accountType === 'personal' ? 2500 : 0, // Crédit de bienvenue de 2500$ sur compte perso
      createdDate: Date.now(),
      accountType,
      locked: false,
    };

    // Sauvegarde persistante
    intellectus.memory.set('bank_accounts', accountId, account, true);
    return account;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ENTRÉES FINANCIÈRES (DÉPÔT / RETRAIT SÉCURISÉ)
  // ─────────────────────────────────────────────────────────────────────────

  public deposit(accountId: string, rawAmount: number, description = 'Dépôt'): boolean {
    const amount = Math.floor(Number(rawAmount));
    if (isNaN(amount) || amount <= 0) return false;

    const account = intellectus.memory.get<BankAccount>('bank_accounts', accountId);
    if (!account || account.locked) return false;

    account.balance += amount;
    intellectus.memory.set('bank_accounts', accountId, account, true); // Sauvegarde immédiate (Dépôt d'argent = sensible)

    // Sync session joueur si compte personnel
    if (account.accountType === 'personal') {
      const player = intellectus.memory.get<any>('players', account.playerId);
      if (player) {
        player.bank = account.balance;
        intellectus.memory.set('players', account.playerId, player, true);
      }
    }

    this.recordTransaction(accountId, 'deposit', amount, description);
    this.onUpdate?.({ type: 'deposit', accountId, amount });
    return true;
  }

  public withdraw(accountId: string, rawAmount: number, description = 'Retrait'): boolean {
    const amount = Math.floor(Number(rawAmount));
    if (isNaN(amount) || amount <= 0) return false;

    const account = intellectus.memory.get<BankAccount>('bank_accounts', accountId);
    if (!account || account.locked || account.balance < amount) return false;

    account.balance -= amount;
    intellectus.memory.set('bank_accounts', accountId, account, true);

    // Sync session
    if (account.accountType === 'personal') {
      const player = intellectus.memory.get<any>('players', account.playerId);
      if (player) {
        player.bank = account.balance;
        intellectus.memory.set('players', account.playerId, player, true);
      }
    }

    this.recordTransaction(accountId, 'withdrawal', amount, description);
    this.onUpdate?.({ type: 'withdrawal', accountId, amount });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. TRANSFERT D'ARGENT P2P SÉCURISÉ (MUTATION ATOMIQUE)
  // ─────────────────────────────────────────────────────────────────────────

  public transfer(fromAccountId: string, toAccountId: string, rawAmount: number): boolean {
    const amount = Math.floor(Number(rawAmount));
    if (isNaN(amount) || amount <= 0 || fromAccountId === toAccountId) return false;

    const fromAccount = intellectus.memory.get<BankAccount>('bank_accounts', fromAccountId);
    const toAccount = intellectus.memory.get<BankAccount>('bank_accounts', toAccountId);

    if (!fromAccount || !toAccount || fromAccount.locked || toAccount.locked || fromAccount.balance < amount) {
      return false;
    }

    // Retrait / Dépôt atomique
    fromAccount.balance -= amount;
    toAccount.balance += amount;

    // Persistance des deux comptes
    intellectus.memory.set('bank_accounts', fromAccountId, fromAccount, true);
    intellectus.memory.set('bank_accounts', toAccountId, toAccount, true);

    // Sync des deux sessions en ligne (si concernées)
    this.syncPlayerSessionBalance(fromAccount);
    this.syncPlayerSessionBalance(toAccount);

    this.recordTransaction(fromAccountId, 'transfer', amount, `Virement vers ${toAccount.playerName}`, toAccount.playerName);
    this.recordTransaction(toAccountId, 'transfer', amount, `Virement de ${fromAccount.playerName}`, fromAccount.playerName);

    this.onUpdate?.({ type: 'transfer', fromAccountId, toAccountId, amount });
    return true;
  }

  private syncPlayerSessionBalance(account: BankAccount) {
    if (account.accountType === 'personal') {
      const player = intellectus.memory.get<any>('players', account.playerId);
      if (player) {
        player.bank = account.balance;
        intellectus.memory.set('players', account.playerId, player, true);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. REGISTRE ET HISTORIQUE DES TRANSACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  private recordTransaction(
    accountId: string,
    type: TransactionType,
    amount: number,
    description: string,
    otherParty?: string
  ) {
    const account = intellectus.memory.get<BankAccount>('bank_accounts', accountId);
    if (!account) return;

    const transaction: Transaction = {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      accountId,
      type,
      amount,
      timestamp: Date.now(),
      description,
      otherParty,
      balance: account.balance,
    };

    const history = intellectus.memory.get<Transaction[]>('bank_transactions', accountId) || [];
    history.unshift(transaction);
    
    // Limitation de l'historique aux 100 dernières entrées pour soulager la base
    if (history.length > 100) history.pop();

    intellectus.memory.set('bank_transactions', accountId, history, true);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. SYSTÈME DE PRÊTS BANCAIRES
  // ─────────────────────────────────────────────────────────────────────────

  public requestLoan(
    borrowerId: string,
    borrowerName: string,
    rawAmount: number,
    monthsDuration = 12
  ): Loan | null {
    const amount = Math.floor(Number(rawAmount));
    if (isNaN(amount) || amount < 1000 || amount > 100000) return null; // Prêts bridés entre 1 000 et 100 000$

    const loanId = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Taux d'intérêt de crise québécoise : 8% à 15% par an
    const annualRate = 8 + Math.random() * 7;
    const monthlyRate = annualRate / 12 / 100;
    
    // Calcul de la mensualité amortie standard (Formule bancaire officielle)
    const monthlyPayment = Math.round(
      (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -monthsDuration))
    );

    const loan: Loan = {
      loanId,
      borrowerId,
      borrowerName,
      lenderId: 'caisse_desjardins',
      principal: amount,
      amountBorrowed: amount,
      interestRate: Number(annualRate.toFixed(1)),
      monthlyPayment,
      remainingMonths: monthsDuration,
      status: 'active',
      startDate: Date.now(),
      nextPaymentDue: Date.now() + 5 * 60 * 1000, // Première échéance dans 5 minutes (Temps RP compressé)
    };

    // 1. Sauvegarde du prêt
    intellectus.memory.set('bank_loans', loanId, loan, true);

    // 2. Crédit direct sur le compte personnel du joueur
    const account = this.getOrCreateAccount(borrowerId, borrowerName);
    account.balance += amount;
    intellectus.memory.set('bank_accounts', account.accountId, account, true);
    this.syncPlayerSessionBalance(account);

    this.recordTransaction(account.accountId, 'loan', amount, `Prêt Desjardins approuvé (Intérêts: ${loan.interestRate}%)`);
    this.onUpdate?.({ type: 'loan_approved', loanId });

    return loan;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. SYSTÈME D'INVESTISSEMENTS EN BOURSE (STOCKS / CRYPTOS)
  // ─────────────────────────────────────────────────────────────────────────

  public invest(playerId: string, type: 'stock' | 'business' | 'property' | 'crypto', rawAmount: number): Investment | null {
    const amount = Math.floor(Number(rawAmount));
    if (isNaN(amount) || amount <= 0) return null;

    const account = this.getOrCreateAccount(playerId, 'Vendeur');
    if (account.balance < amount) return null;

    // Prélèvement des fonds pour investissement
    account.balance -= amount;
    intellectus.memory.set('bank_accounts', account.accountId, account, true);
    this.syncPlayerSessionBalance(account);

    const investmentId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const investment: Investment = {
      investmentId,
      playerId,
      type,
      principal: amount,
      currentValue: amount,
      returnRate: 0,
      startDate: Date.now(),
      status: 'active',
    };

    intellectus.memory.set('bank_investments', investmentId, investment, true);
    this.recordTransaction(account.accountId, 'investment', amount, `Achat d'actif financier (${type})`);

    return investment;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. PLANIFICATEUR DE FOND (CRON MOMENTUS COMPATIBLE - TOUTES LES 5 MIN)
  // ─────────────────────────────────────────────────────────────────────────

  private startBackgroundSystems() {
    this.backgroundInterval = setInterval(() => {
      const now = Date.now();

      // ── A. Prélèvement automatique des mensualités de prêts ──
      const allLoans = intellectus.memory.values<Loan>('bank_loans') || [];
      allLoans.forEach((loan) => {
        if (loan.status !== 'active') return;

        if (now >= loan.nextPaymentDue) {
          const account = this.getOrCreateAccount(loan.borrowerId, loan.borrowerName);

          if (account.balance >= loan.monthlyPayment) {
            // Paiement honoré
            account.balance -= loan.monthlyPayment;
            intellectus.memory.set('bank_accounts', account.accountId, account, true);
            this.syncPlayerSessionBalance(account);

            loan.remainingMonths--;
            this.recordTransaction(account.accountId, 'withdrawal', loan.monthlyPayment, `Échéance de prêt (${loan.remainingMonths} mois restants)`);

            if (loan.remainingMonths <= 0) {
              loan.status = 'paid_off';
              console.log(`✅ [Banking] Prêt entièrement remboursé par ${loan.borrowerName}.`);
            } else {
              loan.nextPaymentDue = now + 5 * 60 * 1000; // Prochaine mensualité dans 5 minutes
            }
          } else {
            // Défaut de paiement ! Pénalité de 500$ et prélèvement à la gorge
            const fine = 500;
            account.balance = Math.max(0, account.balance - fine);
            intellectus.memory.set('bank_accounts', account.accountId, account, true);
            this.syncPlayerSessionBalance(account);

            loan.nextPaymentDue = now + 2 * 60 * 1000; // Relance agressive de Desjardins dans 2 minutes
            console.warn(`⚠️ [Banking] Défaut de paiement sur le prêt de ${loan.borrowerName} ! Pénalité de retard appliquée.`);
          }

          intellectus.memory.set('bank_loans', loan.loanId, loan, true);
        }
      });

      // ── B. Fluctuation de la Bourse et des Cryptos (Rendement actif) ──
      const allInvestments = intellectus.memory.values<Investment>('bank_investments') || [];
      allInvestments.forEach((inv) => {
        if (inv.status !== 'active') return;

        // Volatilité crypto vs Bourse traditionnelle
        const volatility = inv.type === 'crypto' ? 0.35 : 0.12; // La crypto fluctue énormément
        const yieldFactor = (Math.random() * (volatility * 2.2) - volatility * 0.9); // Espérance positive légère

        inv.currentValue = Math.round(inv.currentValue * (1 + yieldFactor));
        inv.returnRate = Number((((inv.currentValue - inv.principal) / inv.principal) * 100).toFixed(1));

        // Krach boursier / Perte complète
        if (inv.currentValue <= 5) {
          inv.status = 'lost';
          inv.currentValue = 0;
          inv.returnRate = -100;
          console.log(`❌ [Bourse] Krach boursier : L'investissement en '${inv.type}' de ${inv.playerId} est ruiné.`);
        }

        intellectus.memory.set('bank_investments', inv.investmentId, inv, true);
      });

    }, 300000); // Exécution de fond toutes les 5 minutes
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. ACCESSEURS
  // ─────────────────────────────────────────────────────────────────────────

  public getAccount(accountId: string): BankAccount | undefined {
    return intellectus.memory.get<BankAccount>('bank_accounts', accountId);
  }

  public getPlayerAccounts(playerId: string): BankAccount[] {
    const all = intellectus.memory.values<BankAccount>('bank_accounts') || [];
    return all.filter((a) => a.playerId === playerId);
  }

  public getTransactionHistory(accountId: string, limit = 50): Transaction[] {
    const list = intellectus.memory.get<Transaction[]>('bank_transactions', accountId) || [];
    return list.slice(0, limit);
  }

  public getPlayerLoans(playerId: string): Loan[] {
    const all = intellectus.memory.values<Loan>('bank_loans') || [];
    return all.filter((l) => l.borrowerId === playerId);
  }

  public getPlayerInvestments(playerId: string): Investment[] {
    const all = intellectus.memory.values<Investment>('bank_investments') || [];
    return all.filter((i) => i.playerId === playerId);
  }

  public atmWithdrawal(atmId: string, amount: number): boolean {
    const atm = this.atms.get(atmId);
    if (!atm || atm.balance < amount || atm.broken) return false;

    atm.balance -= amount;
    return true;
  }

  public onUpdate(callback: (data: any) => void) {
    this.updateListener = callback;
  }

  public dispose() {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }
  }
}

export const bankingManager = new BankingManager();