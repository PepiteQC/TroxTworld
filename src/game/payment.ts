/**
 * ═══════════════════════════════════════════════════════════════════
 *  PASSERELLE DE PAIEMENT & FACTURATION QUÉBÉCOISE — TROXTWORLD
 * ═══════════════════════════════════════════════════════════════════
 * Relié directement au système bancaire Desjardins de banking.ts
 */

import {
  getPlayerCash,
  addCash,
  removeCash,
  transferMoney,
  pushTx,
  getPlayerAccounts,
  getDefaultAccount,
  getPlayerCards,
  type BankAccount,
  type BankCard,
  type Transaction as BankTransaction
} from "./banking";

export const TPS_RATE = 0.05;      // Taxe sur les produits et services (5%)
export const TVQ_RATE = 0.09975;   // Taxe de vente du Québec (9.975%)
export const TOTAL_TAX_RATE = TPS_RATE + TVQ_RATE; // 14.975%

export type PaymentMethodType = "cash" | "debit" | "credit" | "transfer" | "credit_card" | "debit_card" | "online" | "loyalty_points";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  roomId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxes: number;
  total: number;
  isPaid?: boolean;
  status?: "unpaid" | "paid" | "partial" | "void" | string;
  paymentMethod?: PaymentMethodType;
  dueDate: number;
  issueDate?: number;
  paidAt?: number;
  paymentDate?: number;
  notes?: string;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  customerId?: string;
  cardId?: string;
  amount: number;
  method: PaymentMethodType;
  currency?: string;
  timestamp: number;
  status: "success" | "failed" | "pending" | "completed";
  description?: string;
}

export interface Receipt {
  id: string;
  transactionId: string;
  invoiceId: string;
  customerId?: string;
  customerName?: string;
  currency?: string;
  totalPaid?: number;
  amount?: number;
  timestamp: number;
}

export interface IRoom {
  id: string;
  number: string;
  type: string;
  pricePerNight: number;
  isOccupied: boolean;
  getState(): any;
  hydrate(state: any): void;
}

export { BankAccount, BankCard as Card };

export class PaymentSystem {
  private invoices: Map<string, Invoice> = new Map();
  private transactions: Map<string, Transaction> = new Map();

  /**
   * Crée une facture de chambre d'hôtel avec calcul strict des taxes QC
   */
  public createRoomInvoice(
    customerId: string,
    customerName: string,
    room: IRoom,
    nights: number,
    services: InvoiceItem[] = []
  ): Invoice {
    const roomCost: InvoiceItem = {
      id: `room_${room.id}_${Date.now()}`,
      description: `Chambre ${room.number} (${room.type}) - ${nights} nuit(s)`,
      quantity: nights,
      unitPrice: room.pricePerNight,
      total: room.pricePerNight * nights,
      category: "room"
    };

    const subtotal = roomCost.total + services.reduce((sum, s) => sum + s.total, 0);
    const taxes = subtotal * TOTAL_TAX_RATE;
    const total = subtotal + taxes;

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      customerId,
      customerName,
      roomId: room.id,
      items: [roomCost, ...services],
      subtotal,
      taxes,
      total,
      isPaid: false,
      status: "unpaid",
      issueDate: Date.now(),
      dueDate: Date.now() + 86400000 * 2,
      notes: `Facture officielle pour la chambre ${room.number}`
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  /**
   * Traite un paiement en direct avec le compte ou le cash du joueur
   */
  public processPayment(invoiceId: string, playerId: string, method: PaymentMethodType = "debit"): boolean {
    const inv = this.invoices.get(invoiceId);
    if (!inv || inv.isPaid) return false;

    if (method === "cash") {
      const cash = getPlayerCash(playerId);
      if (cash < inv.total) return false;
      removeCash(inv.total, playerId);
    } else {
      const account = getDefaultAccount(playerId);
      if (!account || account.balance < inv.total) return false;
      account.balance -= inv.total;
    }

    inv.isPaid = true;
    inv.status = "paid";
    inv.paymentDate = Date.now();
    inv.paymentMethod = method;

    pushTx(playerId, "withdraw", inv.total, `Paiement facture: ${inv.id}`);
    return true;
  }

  public getInvoice(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }
}

export const paymentSystem = new PaymentSystem();
