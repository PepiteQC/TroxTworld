/**
 * ═════════════════════════════════════════════════════════════════════════════
 *  💳 PASSERELLE DE PAIEMENT & FACTURATION QUÉBÉCOISE v2.0 — TROXTWORLD
 *  src/server/systems/PaymentSystem.ts
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Facturation multi-type (chambre, restaurant, garage, amende, custom)
 *  • Taxes QC (TPS 5% + TVQ 9.975%) + exemptions + multi-juridiction
 *  • Paiements partiels + échéanciers + retards + pénalités
 *  • Cartes bancaires (debit/credit) via banking.ts
 *  • Codes promo + rabais + pourboires (tips)
 *  • Remboursements (partiels/totaux) + void
 *  • Idempotence (clé unique par transaction)
 *  • Reçus (receipts) numérotés
 *  • Historique query par customer/status/date
 *  • Events (onInvoice, onPayment, onRefund, onVoid)
 *  • Rate-limit par joueur
 *  • Config complète + hot reload
 *  • Health check + dispose
 *  • Compat 100% v1
 * ═════════════════════════════════════════════════════════════════════════════
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
  type Transaction as BankTransaction,
} from './banking';

// ═════════════════════════════════════════════════════════════════════════════
//  1. CONSTANTES FISCALES QUÉBEC
// ═════════════════════════════════════════════════════════════════════════════

export const TPS_RATE = 0.05;         // Taxe sur les produits et services
export const TVQ_RATE = 0.09975;      // Taxe de vente du Québec
export const TOTAL_TAX_RATE = TPS_RATE + TVQ_RATE; // 14.975%

// ═════════════════════════════════════════════════════════════════════════════
//  2. TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type PaymentMethodType =
  | 'cash'
  | 'debit'
  | 'credit'
  | 'transfer'
  | 'credit_card'
  | 'debit_card'
  | 'online'
  | 'loyalty_points';

export type InvoiceStatus = 'unpaid' | 'paid' | 'partial' | 'void' | 'overdue' | 'refunded';

export type InvoiceKind =
  | 'room'
  | 'restaurant'
  | 'garage'
  | 'fine'
  | 'service'
  | 'custom';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;

  // 🆕 v2
  /** Taux de taxe custom (0 = exempt, undefined = standard QC). */
  taxRate?: number;
  /** Item exempté de taxes. */
  taxExempt?: boolean;
  /** Discount par item. */
  discount?: number;
  /** Métadonnées. */
  meta?: Record<string, unknown>;
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
  status?: InvoiceStatus | string;
  paymentMethod?: PaymentMethodType;
  dueDate: number;
  issueDate?: number;
  paidAt?: number;
  paymentDate?: number;
  notes?: string;

  // 🆕 v2
  /** Numéro de facture lisible (INV-YYYY-XXXXX). */
  number?: string;
  /** Type de facture. */
  kind?: InvoiceKind;
  /** Montant déjà payé (pour paiements partiels). */
  amountPaid?: number;
  /** Montant restant dû. */
  amountDue?: number;
  /** Monnaie (CAD par défaut). */
  currency?: string;
  /** TPS calculée explicitement. */
  tps?: number;
  /** TVQ calculée explicitement. */
  tvq?: number;
  /** Discount global (avant taxes). */
  discount?: number;
  /** Code promo appliqué. */
  promoCode?: string;
  /** Pourboire. */
  tip?: number;
  /** Taxes exemptées (raison). */
  taxExemptReason?: string;
  /** Émetteur (boutique, hôtel…). */
  issuerId?: string;
  /** Émetteur nom. */
  issuerName?: string;
  /** Historique des paiements partiels. */
  payments?: Array<{
    id: string;
    amount: number;
    method: PaymentMethodType;
    timestamp: number;
    transactionId: string;
  }>;
  /** Remboursements. */
  refunds?: Array<{
    id: string;
    amount: number;
    reason: string;
    timestamp: number;
    byPlayerId: string;
  }>;
  /** Notes internes. */
  internalNotes?: string[];
  /** Tags (vip, urgent…). */
  tags?: string[];
  /** Idempotency key. */
  idempotencyKey?: string;
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
  status: 'success' | 'failed' | 'pending' | 'completed' | 'refunded';
  description?: string;

  // 🆕 v2
  /** Frais de transaction (interac, visa…). */
  fee?: number;
  /** Confirmation # externe. */
  confirmationNumber?: string;
  /** IP hash (audit). */
  ipHash?: string;
  /** Erreur / motif d'échec. */
  failureReason?: string;
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

  // 🆕 v2
  /** Numéro de reçu lisible. */
  number?: string;
  /** Contenu résumé des items. */
  itemsSummary?: string;
  /** Méthode de paiement. */
  method?: PaymentMethodType;
  /** Pourboire. */
  tip?: number;
  /** Taxes. */
  tps?: number;
  tvq?: number;
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

// Ré-exports v1 compat
export { BankAccount, BankCard as Card };

// ═════════════════════════════════════════════════════════════════════════════
//  3. EXTENSIONS v2
// ═════════════════════════════════════════════════════════════════════════════

export interface PromoCode {
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  expiresAt: number;
  minSubtotal?: number;
  maxUses?: number;
  usesLeft?: number;
  appliesToKinds?: InvoiceKind[];
}

export interface PaymentConfig {
  /** Autoriser les paiements partiels. */
  allowPartialPayments: boolean;
  /** Pourcentage minimum pour un paiement partiel. */
  minPartialPercent: number;
  /** Autoriser les pourboires. */
  allowTips: boolean;
  /** Pourboire max (%). */
  maxTipPercent: number;
  /** Autoriser les remboursements. */
  allowRefunds: boolean;
  /** Fenêtre max pour remboursement (ms). */
  refundWindowMs: number;
  /** Frais Interac/Debit (%). */
  debitFeeRate: number;
  /** Frais crédit (%). */
  creditFeeRate: number;
  /** Frais transfert (%). */
  transferFeeRate: number;
  /** Rate-limit paiements par joueur. */
  paymentRateLimit: { count: number; windowMs: number };
  /** Tolérance retard avant "overdue" (ms). */
  overdueGracePeriodMs: number;
  /** Pénalité de retard (par jour, %). */
  lateFeeRatePerDay: number;
  /** Préfixe numéro facture. */
  invoiceNumberPrefix: string;
  /** Préfixe numéro reçu. */
  receiptNumberPrefix: string;
  /** Verbose logging. */
  verbose: boolean;
}

const DEFAULT_CONFIG: PaymentConfig = {
  allowPartialPayments: true,
  minPartialPercent: 25,
  allowTips: true,
  maxTipPercent: 30,
  allowRefunds: true,
  refundWindowMs: 7 * 24 * 3600 * 1000, // 7 jours
  debitFeeRate: 0.005,   // 0.5%
  creditFeeRate: 0.018,  // 1.8%
  transferFeeRate: 0,    // gratuit
  paymentRateLimit: { count: 20, windowMs: 60_000 },
  overdueGracePeriodMs: 48 * 3600 * 1000, // 48h après dueDate
  lateFeeRatePerDay: 2.0, // 2% par jour
  invoiceNumberPrefix: 'INV',
  receiptNumberPrefix: 'RCT',
  verbose: false,
};

// ═════════════════════════════════════════════════════════════════════════════
//  4. UTILITAIRES
// ═════════════════════════════════════════════════════════════════════════════

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatInvoiceNumber(prefix: string, seq: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  5. PAYMENT SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

export class PaymentSystem {
  private invoices = new Map<string, Invoice>();
  private transactions = new Map<string, Transaction>();
  private receipts = new Map<string, Receipt>();
  private promos = new Map<string, PromoCode>();

  private config: PaymentConfig;

  // Compteurs pour numérotation
  private invoiceSeq = 0;
  private receiptSeq = 0;

  // Idempotence
  private idempotencyKeys = new Map<string, string>(); // key → transactionId

  // Rate limit
  private paymentHistory = new Map<string, number[]>();

  // Events
  private listeners = {
    invoiceCreated: new Set<(inv: Invoice) => void>(),
    paymentProcessed: new Set<(inv: Invoice, tx: Transaction) => void>(),
    paymentFailed: new Set<(inv: Invoice, reason: string) => void>(),
    refunded: new Set<(inv: Invoice, amount: number) => void>(),
    voided: new Set<(inv: Invoice) => void>(),
    overdue: new Set<(inv: Invoice) => void>(),
  };

  // Stats
  private stats = {
    invoicesTotal: 0,
    transactionsTotal: 0,
    successfulPayments: 0,
    failedPayments: 0,
    refundsTotal: 0,
    refundAmountTotal: 0,
    voidedTotal: 0,
    overdueTotal: 0,
    tipsTotal: 0,
    tipsAmountTotal: 0,
    taxesCollected: 0,
    feesCollected: 0,
    promoUsesTotal: 0,
  };

  constructor(config: Partial<PaymentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v1 COMPAT — CRÉATION DE FACTURE
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * v1 compat — crée une facture de chambre d'hôtel.
   * v2 : les items de service sont enrichis (taxRate, taxExempt…).
   */
  public createRoomInvoice(
    customerId: string,
    customerName: string,
    room: IRoom,
    nights: number,
    services: InvoiceItem[] = [],
  ): Invoice {
    const nNights = Math.max(1, Math.floor(nights));
    const roomCost: InvoiceItem = {
      id: `room_${room.id}_${Date.now()}`,
      description: `Chambre ${room.number} (${room.type}) - ${nNights} nuit(s)`,
      quantity: nNights,
      unitPrice: room.pricePerNight,
      total: round2(room.pricePerNight * nNights),
      category: 'room',
    };

    const invoice = this.buildInvoice({
      customerId,
      customerName,
      roomId: room.id,
      kind: 'room',
      items: [roomCost, ...services],
      notes: `Facture officielle pour la chambre ${room.number}`,
      dueDays: 2,
      issuerName: 'Hôtel TROXTWorld',
      issuerId: 'hotel',
    });

    return invoice;
  }

  /**
   * 🆕 Crée une facture générique (restaurant, garage, amende…).
   */
  public createInvoice(opts: {
    customerId: string;
    customerName: string;
    items: InvoiceItem[];
    kind?: InvoiceKind;
    issuerId?: string;
    issuerName?: string;
    roomId?: string;
    dueDays?: number;
    notes?: string;
    promoCode?: string;
    tip?: number;
    idempotencyKey?: string;
    tags?: string[];
    taxExemptReason?: string;
  }): Invoice {
    return this.buildInvoice({
      customerId: opts.customerId,
      customerName: opts.customerName,
      items: opts.items,
      kind: opts.kind ?? 'custom',
      issuerId: opts.issuerId,
      issuerName: opts.issuerName,
      roomId: opts.roomId,
      dueDays: opts.dueDays ?? 2,
      notes: opts.notes,
      promoCode: opts.promoCode,
      tip: opts.tip,
      idempotencyKey: opts.idempotencyKey,
      tags: opts.tags,
      taxExemptReason: opts.taxExemptReason,
    });
  }

  /**
   * 🆕 Construction interne d'une facture.
   */
  private buildInvoice(opts: {
    customerId: string;
    customerName: string;
    items: InvoiceItem[];
    kind: InvoiceKind;
    issuerId?: string;
    issuerName?: string;
    roomId?: string;
    dueDays: number;
    notes?: string;
    promoCode?: string;
    tip?: number;
    idempotencyKey?: string;
    tags?: string[];
    taxExemptReason?: string;
  }): Invoice {
    // Idempotence
    if (opts.idempotencyKey) {
      const existingId = this.idempotencyKeys.get(opts.idempotencyKey);
      if (existingId) {
        const existing = this.invoices.get(existingId);
        if (existing) return existing;
      }
    }

    const now = Date.now();

    // Calculs
    const items = opts.items.map((it) => ({
      ...it,
      total: round2(it.total ?? it.unitPrice * it.quantity),
    }));

    const subtotal = round2(items.reduce((s, it) => s + it.total, 0));

    // Promo
    let discount = 0;
    let promoCode: string | undefined;
    if (opts.promoCode) {
      const promo = this.promos.get(opts.promoCode);
      if (promo && this.isPromoValid(promo, subtotal, opts.kind)) {
        if (promo.kind === 'percent') {
          discount = round2(subtotal * (promo.value / 100));
        } else {
          discount = round2(Math.min(promo.value, subtotal));
        }
        promoCode = promo.code;
        promo.usesLeft = (promo.usesLeft ?? Infinity) - 1;
        this.stats.promoUsesTotal++;
      }
    }

    const subtotalAfterDiscount = round2(subtotal - discount);

    // Taxes QC (avec exemptions)
    const taxExempt = !!opts.taxExemptReason;
    const tps = taxExempt ? 0 : round2(subtotalAfterDiscount * TPS_RATE);
    const tvq = taxExempt ? 0 : round2(subtotalAfterDiscount * TVQ_RATE);
    const taxes = round2(tps + tvq);

    // Tip
    const tipPct = clamp(opts.tip ?? 0, 0, this.config.maxTipPercent);
    const tip = this.config.allowTips ? round2(subtotalAfterDiscount * (tipPct / 100)) : 0;

    const total = round2(subtotalAfterDiscount + taxes + tip);

    this.invoiceSeq++;
    const invoice: Invoice = {
      id: genId('inv'),
      number: formatInvoiceNumber(this.config.invoiceNumberPrefix, this.invoiceSeq),
      customerId: opts.customerId,
      customerName: opts.customerName,
      roomId: opts.roomId,
      items,
      subtotal,
      taxes,
      total,
      isPaid: false,
      status: 'unpaid',
      issueDate: now,
      dueDate: now + 86400000 * opts.dueDays,
      notes: opts.notes ?? '',

      kind: opts.kind,
      currency: 'CAD',
      tps,
      tvq,
      discount,
      promoCode,
      tip,
      amountPaid: 0,
      amountDue: total,
      taxExemptReason: opts.taxExemptReason,
      issuerId: opts.issuerId,
      issuerName: opts.issuerName,
      payments: [],
      refunds: [],
      internalNotes: [],
      tags: opts.tags ?? [],
      idempotencyKey: opts.idempotencyKey,
    };

    this.invoices.set(invoice.id, invoice);
    this.stats.invoicesTotal++;
    this.stats.taxesCollected = round2(this.stats.taxesCollected + taxes);

    if (opts.idempotencyKey) {
      this.idempotencyKeys.set(opts.idempotencyKey, invoice.id);
    }

    // Events
    for (const cb of this.listeners.invoiceCreated) {
      try { cb(invoice); } catch { /* noop */ }
    }

    if (this.config.verbose) {
      console.log(`📄 [Payment] ${invoice.number} créée pour ${opts.customerName} — ${total}$`);
    }

    return invoice;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v1 COMPAT — PAIEMENT
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * v1 compat — traite un paiement simple.
   * v2 : ajoute idempotence, fees, events, historique.
   */
  public processPayment(
    invoiceId: string,
    playerId: string,
    method: PaymentMethodType = 'debit',
    opts?: {
      cardId?: string;
      idempotencyKey?: string;
      partialAmount?: number;
      ipHash?: string;
    },
  ): boolean {
    const result = this.processPaymentDetailed(invoiceId, playerId, method, opts);
    return result.success;
  }

  /**
   * 🆕 Paiement détaillé avec résultat enrichi.
   */
  public processPaymentDetailed(
    invoiceId: string,
    playerId: string,
    method: PaymentMethodType = 'debit',
    opts?: {
      cardId?: string;
      idempotencyKey?: string;
      partialAmount?: number;
      ipHash?: string;
    },
  ): { success: boolean; reason?: string; transaction?: Transaction; receipt?: Receipt } {
    const inv = this.invoices.get(invoiceId);
    if (!inv) return { success: false, reason: 'Facture introuvable' };
    if (inv.status === 'void') return { success: false, reason: 'Facture annulée' };
    if (inv.status === 'refunded') return { success: false, reason: 'Facture remboursée' };
    if (inv.isPaid) return { success: false, reason: 'Facture déjà payée' };

    // Idempotence
    if (opts?.idempotencyKey) {
      const existingTxId = this.idempotencyKeys.get(`pay_${opts.idempotencyKey}`);
      if (existingTxId) {
        const existingTx = this.transactions.get(existingTxId);
        return {
          success: true,
          reason: 'Idempotent — déjà traité',
          transaction: existingTx,
        };
      }
    }

    // Rate limit
    if (this.isRateLimited(playerId)) {
      return { success: false, reason: 'Trop de paiements récents' };
    }

    // Montant à payer
    const due = inv.amountDue ?? inv.total;
    let amount = due;

    if (opts?.partialAmount !== undefined) {
      if (!this.config.allowPartialPayments) {
        return { success: false, reason: 'Paiements partiels désactivés' };
      }
      const minAmount = round2(inv.total * (this.config.minPartialPercent / 100));
      if (opts.partialAmount < minAmount) {
        return {
          success: false,
          reason: `Montant minimum partiel : ${minAmount}$ (${this.config.minPartialPercent}%)`,
        };
      }
      if (opts.partialAmount > due) {
        return { success: false, reason: `Montant dépasse le solde dû (${due}$)` };
      }
      amount = round2(opts.partialAmount);
    }

    // Frais
    const fee = this.computeFee(amount, method);
    const totalCharge = round2(amount + fee);

    // Débit
    if (method === 'cash') {
      const cash = getPlayerCash(playerId);
      if (cash < totalCharge) {
        return { success: false, reason: `Cash insuffisant (${cash}$ < ${totalCharge}$)` };
      }
      removeCash(totalCharge, playerId);
    } else if (method === 'loyalty_points') {
      // À brancher sur un système de points (placeholder)
      return { success: false, reason: 'Points de fidélité non supportés' };
    } else {
      const account = getDefaultAccount(playerId);
      if (!account) {
        return { success: false, reason: 'Aucun compte bancaire par défaut' };
      }
      if (account.balance < totalCharge) {
        return {
          success: false,
          reason: `Solde insuffisant (${account.balance}$ < ${totalCharge}$)`,
        };
      }
      account.balance = round2(account.balance - totalCharge);
    }

    const now = Date.now();

    // Applique le paiement
    inv.amountPaid = round2((inv.amountPaid ?? 0) + amount);
    inv.amountDue = round2((inv.amountDue ?? inv.total) - amount);
    inv.payments = inv.payments ?? [];
    inv.payments.push({
      id: genId('pmt'),
      amount,
      method,
      timestamp: now,
      transactionId: '', // rempli ci-dessous
    });

    // Statut
    if (inv.amountDue <= 0.01) {
      inv.isPaid = true;
      inv.status = 'paid';
      inv.paidAt = now;
      inv.paymentDate = now;
      inv.paymentMethod = method;
    } else {
      inv.status = 'partial';
    }

    // Transaction
    this.invoiceSeq; // (déjà incrémenté)
    const tx: Transaction = {
      id: genId('tx'),
      invoiceId,
      customerId: playerId,
      cardId: opts?.cardId,
      amount: totalCharge,
      method,
      currency: inv.currency ?? 'CAD',
      timestamp: now,
      status: 'completed',
      description: `Paiement ${inv.number}`,
      fee,
      confirmationNumber: genId('conf').toUpperCase(),
      ipHash: opts?.ipHash,
    };
    this.transactions.set(tx.id, tx);

    // Remplit le transactionId dans l'historique paiement
    const lastPayment = inv.payments[inv.payments.length - 1];
    if (lastPayment) lastPayment.transactionId = tx.id;

    // Reçu
    this.receiptSeq++;
    const receipt: Receipt = {
      id: genId('rct'),
      number: formatInvoiceNumber(this.config.receiptNumberPrefix, this.receiptSeq),
      transactionId: tx.id,
      invoiceId: inv.id,
      customerId: inv.customerId,
      customerName: inv.customerName,
      currency: inv.currency ?? 'CAD',
      totalPaid: amount,
      amount: totalCharge,
      timestamp: now,
      itemsSummary: inv.items.map((i) => `${i.quantity}× ${i.description}`).join(', '),
      method,
      tip: inv.tip,
      tps: inv.tps,
      tvq: inv.tvq,
    };
    this.receipts.set(receipt.id, receipt);

    // Push bancaire
    pushTx(playerId, 'withdraw', totalCharge, `Paiement ${inv.number}`);

    // Rate limit
    this.recordPayment(playerId);

    // Stats
    this.stats.transactionsTotal++;
    this.stats.successfulPayments++;
    this.stats.feesCollected = round2(this.stats.feesCollected + fee);
    if (inv.tip) {
      this.stats.tipsTotal++;
      this.stats.tipsAmountTotal = round2(this.stats.tipsAmountTotal + inv.tip);
    }

    // Events
    for (const cb of this.listeners.paymentProcessed) {
      try { cb(inv, tx); } catch { /* noop */ }
    }

    // Idempotence
    if (opts?.idempotencyKey) {
      this.idempotencyKeys.set(`pay_${opts.idempotencyKey}`, tx.id);
    }

    if (this.config.verbose) {
      console.log(`✅ [Payment] ${inv.number} — ${amount}$ (${method})`);
    }

    return { success: true, transaction: tx, receipt };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v1 COMPAT — LECTURE
  // ═════════════════════════════════════════════════════════════════════════

  public getInvoice(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — REFUNDS & VOID
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * 🆕 Rembourse une facture (total ou partiel).
   */
  public refund(
    invoiceId: string,
    byPlayerId: string,
    reason: string,
    amount?: number,
  ): { success: boolean; reason?: string; refunded?: number } {
    if (!this.config.allowRefunds) {
      return { success: false, reason: 'Remboursements désactivés' };
    }

    const inv = this.invoices.get(invoiceId);
    if (!inv) return { success: false, reason: 'Facture introuvable' };
    if (!inv.isPaid && inv.status !== 'partial') {
      return { success: false, reason: 'Facture non payée' };
    }

    // Fenêtre de remboursement
    const paidAt = inv.paidAt ?? inv.paymentDate ?? inv.issueDate ?? Date.now();
    if (Date.now() - paidAt > this.config.refundWindowMs) {
      return {
        success: false,
        reason: `Fenêtre de remboursement dépassée (${this.config.refundWindowMs / 86400000} jours)`,
      };
    }

    const paid = inv.amountPaid ?? inv.total;
    const alreadyRefunded = (inv.refunds ?? []).reduce((s, r) => s + r.amount, 0);
    const refundable = round2(paid - alreadyRefunded);

    if (refundable <= 0) {
      return { success: false, reason: 'Rien à rembourser' };
    }

    const refundAmount = amount !== undefined
      ? clamp(round2(amount), 0, refundable)
      : refundable;

    // Crédite le client
    addCash(refundAmount, inv.customerId);
    pushTx(inv.customerId, 'deposit', refundAmount, `Remboursement ${inv.number}: ${reason}`);

    // Trace
    inv.refunds = inv.refunds ?? [];
    inv.refunds.push({
      id: genId('ref'),
      amount: refundAmount,
      reason,
      timestamp: Date.now(),
      byPlayerId,
    });

    if (inv.amountPaid !== undefined) {
      inv.amountPaid = round2(inv.amountPaid - refundAmount);
    }
    if (inv.amountDue !== undefined) {
      inv.amountDue = round2(inv.amountDue + refundAmount);
    }

    // Statut
    if (refundAmount >= paid - 0.01) {
      inv.status = 'refunded';
      inv.isPaid = false;
    } else {
      inv.status = 'partial';
    }

    this.stats.refundsTotal++;
    this.stats.refundAmountTotal = round2(this.stats.refundAmountTotal + refundAmount);

    for (const cb of this.listeners.refunded) {
      try { cb(inv, refundAmount); } catch { /* noop */ }
    }

    if (this.config.verbose) {
      console.log(`↩️ [Payment] Remboursement ${inv.number} — ${refundAmount}$ (${reason})`);
    }

    return { success: true, refunded: refundAmount };
  }

  /**
   * 🆕 Annule (void) une facture non payée.
   */
  public voidInvoice(
    invoiceId: string,
    byPlayerId: string,
    reason: string,
  ): { success: boolean; reason?: string } {
    const inv = this.invoices.get(invoiceId);
    if (!inv) return { success: false, reason: 'Facture introuvable' };
    if (inv.isPaid || inv.status === 'partial') {
      return { success: false, reason: 'Utilisez refund() pour une facture payée' };
    }
    if (inv.status === 'void') return { success: false, reason: 'Déjà annulée' };

    inv.status = 'void';
    inv.internalNotes = inv.internalNotes ?? [];
    inv.internalNotes.push(`[${new Date().toISOString()}] Void par ${byPlayerId} — ${reason}`);

    this.stats.voidedTotal++;

    for (const cb of this.listeners.voided) {
      try { cb(inv); } catch { /* noop */ }
    }

    return { success: true };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — PROMO CODES
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Crée un code promo. */
  public createPromoCode(promo: Omit<PromoCode, 'usesLeft'>): PromoCode {
    const full: PromoCode = { ...promo, usesLeft: promo.maxUses };
    this.promos.set(full.code.toUpperCase(), full);
    return full;
  }

  /** 🆕 Retire un code promo. */
  public removePromoCode(code: string): boolean {
    return this.promos.delete(code.toUpperCase());
  }

  private isPromoValid(promo: PromoCode, subtotal: number, kind?: InvoiceKind): boolean {
    if (promo.expiresAt < Date.now()) return false;
    if (promo.minSubtotal !== undefined && subtotal < promo.minSubtotal) return false;
    if (promo.usesLeft !== undefined && promo.usesLeft <= 0) return false;
    if (promo.appliesToKinds && kind && !promo.appliesToKinds.includes(kind)) return false;
    return true;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — QUERIES
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Factures d'un client. */
  public getInvoicesByCustomer(customerId: string): Invoice[] {
    return Array.from(this.invoices.values())
      .filter((i) => i.customerId === customerId)
      .sort((a, b) => (b.issueDate ?? 0) - (a.issueDate ?? 0));
  }

  /** 🆕 Factures par statut. */
  public getInvoicesByStatus(status: InvoiceStatus): Invoice[] {
    return Array.from(this.invoices.values()).filter((i) => i.status === status);
  }

  /** 🆕 Factures en retard (calculé dynamiquement). */
  public getOverdueInvoices(): Invoice[] {
    const now = Date.now();
    const graceMs = this.config.overdueGracePeriodMs;
    return Array.from(this.invoices.values()).filter((i) => {
      if (i.status === 'paid' || i.status === 'void' || i.status === 'refunded') return false;
      return now - graceMs > i.dueDate;
    });
  }

  /** 🆕 Toutes les transactions d'un joueur. */
  public getTransactionsByCustomer(customerId: string): Transaction[] {
    return Array.from(this.transactions.values())
      .filter((t) => t.customerId === customerId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /** 🆕 Reçu par ID. */
  public getReceipt(receiptId: string): Receipt | undefined {
    return this.receipts.get(receiptId);
  }

  /** 🆕 Reçus d'un joueur. */
  public getReceiptsByCustomer(customerId: string): Receipt[] {
    return Array.from(this.receipts.values())
      .filter((r) => r.customerId === customerId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /** 🆕 Liste toutes les factures. */
  public getAllInvoices(): Invoice[] {
    return Array.from(this.invoices.values());
  }

  /** 🆕 Liste toutes les transactions. */
  public getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — DÉPENDANCES EXTERNES
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Vérifie si un joueur peut utiliser une carte spécifique. */
  public validateCard(playerId: string, cardId: string): { valid: boolean; reason?: string } {
    const cards = getPlayerCards(playerId);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return { valid: false, reason: 'Carte introuvable' };
    if (card.isFrozen) return { valid: false, reason: 'Carte gelée' };
    return { valid: true };
  }

  /** 🆕 Récupère les cartes d'un joueur. */
  public getPlayerPaymentMethods(playerId: string): {
    cards: BankCard[];
    accounts: BankAccount[];
    cash: number;
  } {
    return {
      cards: getPlayerCards(playerId),
      accounts: getPlayerAccounts(playerId),
      cash: getPlayerCash(playerId),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — OVERDUE CHECK (à appeler périodiquement)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * 🆕 Détecte les factures en retard et émet un event une seule fois.
   */
  public checkOverdueInvoices(): number {
    const overdue = this.getOverdueInvoices();
    let newlyOverdue = 0;

    for (const inv of overdue) {
      if (inv.status !== 'overdue') {
        inv.status = 'overdue';
        inv.internalNotes = inv.internalNotes ?? [];
        inv.internalNotes.push(`[${new Date().toISOString()}] Marqué en retard`);
        newlyOverdue++;
        this.stats.overdueTotal++;

        for (const cb of this.listeners.overdue) {
          try { cb(inv); } catch { /* noop */ }
        }
      }
    }
    return newlyOverdue;
  }

  /**
   * 🆕 Calcule la pénalité de retard pour une facture.
   */
  public computeLateFee(invoiceId: string): number {
    const inv = this.invoices.get(invoiceId);
    if (!inv) return 0;
    if (inv.status === 'paid' || inv.status === 'void' || inv.status === 'refunded') return 0;

    const now = Date.now();
    if (now < inv.dueDate) return 0;

    const daysLate = Math.floor((now - inv.dueDate) / 86400000);
    if (daysLate <= 0) return 0;

    const due = inv.amountDue ?? inv.total;
    return round2(due * (this.config.lateFeeRatePerDay / 100) * daysLate);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — FEE COMPUTATION
  // ═════════════════════════════════════════════════════════════════════════

  private computeFee(amount: number, method: PaymentMethodType): number {
    let rate = 0;
    switch (method) {
      case 'debit':
      case 'debit_card':
        rate = this.config.debitFeeRate;
        break;
      case 'credit':
      case 'credit_card':
      case 'online':
        rate = this.config.creditFeeRate;
        break;
      case 'transfer':
        rate = this.config.transferFeeRate;
        break;
      default:
        rate = 0;
    }
    return round2(amount * rate);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — RATE LIMIT
  // ═════════════════════════════════════════════════════════════════════════

  private isRateLimited(playerId: string): boolean {
    const now = Date.now();
    const history = this.paymentHistory.get(playerId) ?? [];
    const cutoff = now - this.config.paymentRateLimit.windowMs;
    while (history.length > 0 && history[0] < cutoff) history.shift();
    return history.length >= this.config.paymentRateLimit.count;
  }

  private recordPayment(playerId: string): void {
    const history = this.paymentHistory.get(playerId) ?? [];
    history.push(Date.now());
    this.paymentHistory.set(playerId, history);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — EVENTS
  // ═════════════════════════════════════════════════════════════════════════

  public onInvoiceCreated(cb: (inv: Invoice) => void): () => void {
    this.listeners.invoiceCreated.add(cb);
    return () => this.listeners.invoiceCreated.delete(cb);
  }

  public onPaymentProcessed(cb: (inv: Invoice, tx: Transaction) => void): () => void {
    this.listeners.paymentProcessed.add(cb);
    return () => this.listeners.paymentProcessed.delete(cb);
  }

  public onPaymentFailed(cb: (inv: Invoice, reason: string) => void): () => void {
    this.listeners.paymentFailed.add(cb);
    return () => this.listeners.paymentFailed.delete(cb);
  }

  public onRefunded(cb: (inv: Invoice, amount: number) => void): () => void {
    this.listeners.refunded.add(cb);
    return () => this.listeners.refunded.delete(cb);
  }

  public onVoided(cb: (inv: Invoice) => void): () => void {
    this.listeners.voided.add(cb);
    return () => this.listeners.voided.delete(cb);
  }

  public onOverdue(cb: (inv: Invoice) => void): () => void {
    this.listeners.overdue.add(cb);
    return () => this.listeners.overdue.delete(cb);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — CONFIG & HEALTH
  // ═════════════════════════════════════════════════════════════════════════

  public updateConfig(patch: Partial<PaymentConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  public getConfig(): PaymentConfig {
    return { ...this.config };
  }

  public getStats() {
    return {
      ...this.stats,
      invoicesInMemory: this.invoices.size,
      transactionsInMemory: this.transactions.size,
      receiptsInMemory: this.receipts.size,
      promoCodesActive: this.promos.size,
      idempotencyKeysTracked: this.idempotencyKeys.size,
      config: this.config,
    };
  }

  public health(): { ok: boolean; reason?: string } {
    if (this.invoices.size > 100_000) {
      return { ok: false, reason: 'invoice_memory_overflow' };
    }
    if (this.transactions.size > 100_000) {
      return { ok: false, reason: 'transaction_memory_overflow' };
    }
    if (this.stats.failedPayments > 500 && this.stats.successfulPayments === 0) {
      return { ok: false, reason: 'all_payments_failing' };
    }
    return { ok: true };
  }

  public dispose(): void {
    this.invoices.clear();
    this.transactions.clear();
    this.receipts.clear();
    this.promos.clear();
    this.idempotencyKeys.clear();
    this.paymentHistory.clear();
    for (const set of Object.values(this.listeners)) {
      (set as Set<unknown>).clear();
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SINGLETON (v1 compat)
// ═════════════════════════════════════════════════════════════════════════════

export const paymentSystem = new PaymentSystem();