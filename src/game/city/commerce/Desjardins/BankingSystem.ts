/**
 * ═══════════════════════════════════════════════════════════════════
 * 🏦 TROXTWORLD / ETHERWORLD — SYSTEME BANCAIRE (DESJARDINS)
 * ═══════════════════════════════════════════════════════════════════
 */

export interface Transaction {
  id: string;
  amount: number;
  type: "deposit" | "withdraw" | "transfer";
  memo: string;
  timestamp: number;
}

export interface BankAccount {
  accountId: string;
  ownerId: string;
  ownerName: string;
  type: "personal" | "business";
  balance: number;
  transactions: Transaction[];
  createdAt: number;
}

export type BankingUpdateListener = (event: Record<string, unknown>) => void;

export class BankingManager {
  private accounts: Map<string, BankAccount> = new Map();
  private updateListeners: Set<BankingUpdateListener> = new Set();

  constructor() {
    console.log("🏦 [BankingSystem] Caisse Desjardins de Portneuf opérationnelle.");
  }

  public createAccount(playerId: string, ownerName: string, type: "personal" | "business" = "personal"): BankAccount | null {
    // Évite les doublons de comptes personnels
    if (type === "personal") {
      const existing = this.getAccountByOwner(playerId);
      if (existing) return existing;
    }

    const accountId = `DESJ_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const account: BankAccount = {
      accountId,
      ownerId: playerId,
      ownerName,
      type,
      balance: 0,
      transactions: [],
      createdAt: Date.now(),
    };

    this.accounts.set(accountId, account);
    this.notifyUpdate("account_created", { accountId, playerId, ownerName, type });
    return account;
  }

  public deposit(accountId: string, amount: number, memo: string): boolean {
    if (amount <= 0) return false;
    const account = this.accounts.get(accountId);
    if (!account) return false;

    account.balance += amount;
    account.transactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amount,
      type: "deposit",
      memo,
      timestamp: Date.now(),
    });

    this.notifyUpdate("deposit_completed", { accountId, ownerId: account.ownerId, amount, balance: account.balance });
    return true;
  }

  public withdraw(accountId: string, amount: number, memo: string): boolean {
    if (amount <= 0) return false;
    const account = this.accounts.get(accountId);
    if (!account || account.balance < amount) return false;

    account.balance -= amount;
    account.transactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amount,
      type: "withdraw",
      memo,
      timestamp: Date.now(),
    });

    this.notifyUpdate("withdrawal_completed", { accountId, ownerId: account.ownerId, amount, balance: account.balance });
    return true;
  }

  public getBalance(accountId: string): number {
    return this.accounts.get(accountId)?.balance ?? 0;
  }

  public getAccount(accountId: string): BankAccount | undefined {
    return this.accounts.get(accountId);
  }

  public getAccountByOwner(playerId: string): BankAccount | undefined {
    return Array.from(this.accounts.values()).find((acc) => acc.ownerId === playerId && acc.type === "personal");
  }

  public onUpdate(callback: BankingUpdateListener): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("[BankingSystem] Erreur dans un écouteur :", err);
      }
    }
  }

  public dispose(): void {
    this.updateListeners.clear();
    this.accounts.clear();
    console.log("🛑 [BankingSystem] Système bancaire déchargé.");
  }
}

export const bankingManager = new BankingManager();
