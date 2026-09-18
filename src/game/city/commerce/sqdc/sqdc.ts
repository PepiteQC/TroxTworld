/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TROXTWORLD — SQDC Logique RP v5.0
 * ───────────────────────────────────────────────────────────────────────────
 * Ce fichier gère :
 *   • Les boutiques SQDC (stores, licence, ouverture/fermeture)
 *   • Le panier et le checkout (TPS + TVQ, limite 30 g)
 *   • Les braquages (lockdown SAS + alarme + dispatch police)
 *   • Les inspections gouvernementales
 *   • Le bannissement des clients
 *   • Les prompts contextuels
 *
 * Les rôles, permissions, employés, pointage, paie et sanctions vivent
 * désormais dans ./jobs (source unique de vérité).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { netEmit } from "../../net";
import { addCash, removeCash, transferMoney } from "../../banking";
import { addToInventory } from "../../backpack";
import { sendChatMessage, sendPrivateMessage } from "../../chat";
import { useGameStore } from "../../store";
import { addWantedPoints, dispatchPolice } from "../../police";

/* ═══════════════════════════════════════════════════════════════════════════
   IMPORTS JOBS (source de vérité)
   ═══════════════════════════════════════════════════════════════════════════ */
import {
  type SqdcRole,
  type SqdcEmployee,
  type SqdcPermissions,
  ROLE_PERMISSIONS,
  ROLE_RANK,
  ROLE_META,
  MIN_HOURLY_WAGE_QC,
  // Accesseurs
  getEmployee,
  getPlayerRole,
  getPlayerPermissions,
  getAllEmployees,
  getEmployeesOnDuty,
  // Contrats
  hireEmployee,
  fireEmployee,
  resign,
  promoteEmployee,
  adjustSalary,
  // Pointage
  clockIn,
  clockOut,
  getTimeSinceClockIn,
  // Candidatures
  submitApplication,
  reviewApplication,
  listApplications,
  // Discipline
  issueStrike,
  getStrikes,
  isSuspended,
  // Certifications
  enrollCertification,
  hasCertification,
  listEmployeeCertifications,
  // Horaires
  setShift,
  getShifts,
  getShiftsToday,
  // Rapports
  generateStaffReport,
  // Performance
  recordSale,
  setPerformance,
  // Prompts
  jobsPrompt,
  type JobsPromptContext,
} from "./jobs";

import { productById, type SqdcProduct } from "./catalog";
import type { SqdcInteriorResult } from "./interieur";
import type { SqdcSecurity } from "./security";
import type { SqdcStorage } from "./storage";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTES LÉGALES
   ═══════════════════════════════════════════════════════════════════════════ */

export const SQDC_OPEN_FROM = 10;
export const SQDC_OPEN_TO = 21;
export const MAX_WEIGHT_GRAMS = 30;
export const AGE_MINIMUM = 21;
export const TPS_RATE = 0.05;
export const TVQ_RATE = 0.09975;

export function isSqdcOpen(hours: number): boolean {
  const h = ((hours % 24) + 24) % 24;
  return h >= SQDC_OPEN_FROM && h < SQDC_OPEN_TO;
}

export function sqdcHoursLabel(): string {
  return "10 h – 21 h";
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORE — Type principal
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SqdcTransaction {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  items: Array<{ itemId: string; qty: number; unitPrice: number }>;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  paymentMethod: "cash" | "debit" | "credit";
  timestamp: number;
  idVerified: boolean;
  cashierId?: string;
}

export interface SqdcLicense {
  number: string;
  issuedTo: string;
  valid: boolean;
  expiryDate: number;
  violations: number;
  suspensions: number;
}

export interface SqdcStore {
  id: string;
  name: string;
  city: string;
  address: string;
  position: { x: number; z: number };
  ownerId: string;
  isOpen: boolean;
  openedBy: string | null;
  openedAt: number | null;
  bannedCustomers: Set<string>;
  todayRevenue: number;
  todayCustomers: number;
  weeklyRevenue: number;
  interior: SqdcInteriorResult;
  security: SqdcSecurity;
  storage: SqdcStorage;
  license: SqdcLicense;
}

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRES LOCAUX
   ═══════════════════════════════════════════════════════════════════════════ */

const STORES = new Map<string, SqdcStore>();

interface Cart {
  customerId: string;
  storeId: string;
  items: Array<{ itemId: string; qty: number }>;
  createdAt: number;
}

const ACTIVE_CARTS = new Map<string, Cart>();

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRE DES BOUTIQUES
   ═══════════════════════════════════════════════════════════════════════════ */

export function registerStore(store: SqdcStore): void {
  STORES.set(store.id, store);
  netEmit("sqdc:store_registered", {
    storeId: store.id,
    name: store.name,
    city: store.city,
  });
}

export function getStore(id: string): SqdcStore | null {
  return STORES.get(id) ?? null;
}

export function getAllStores(): SqdcStore[] {
  return Array.from(STORES.values());
}

export function unregisterStore(id: string): void {
  STORES.delete(id);
}

/* ═══════════════════════════════════════════════════════════════════════════
   OUVERTURE / FERMETURE DU MAGASIN
   ═══════════════════════════════════════════════════════════════════════════ */

export function openStore(
  storeId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canOpenStore) {
    return { success: false, message: "Droits d'ouverture manquants." };
  }

  if (!store.license.valid) {
    return { success: false, message: "Licence SQDC invalide ou suspendue." };
  }

  const hour = useGameStore.getState().timeHours;
  if (!isSqdcOpen(hour)) {
    return {
      success: false,
      message: `Hors heures légales d'ouverture (${sqdcHoursLabel()}).`,
    };
  }

  store.isOpen = true;
  store.openedBy = playerId;
  store.openedAt = Date.now();

  netEmit("sqdc:store_opened", { storeId, openedBy: playerId });
  sendChatMessage(`🟢 SQDC ${store.name} — OUVERT`);

  return { success: true, message: "Boutique ouverte." };
}

export interface DailyReport {
  storeId: string;
  date: string;
  revenue: number;
  customers: number;
  transactions: number;
  employeesPaid: number;
  stockValue: number;
}

export function closeStore(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; report: DailyReport | null } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", report: null };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canCloseStore) {
    return { success: false, message: "Permission insuffisante.", report: null };
  }

  /* Fermeture automatique des employés encore en service */
  const onDuty = getEmployeesOnDuty(storeId);
  for (const emp of onDuty) {
    clockOut(storeId, emp.playerId);
  }

  const report: DailyReport = {
    storeId,
    date: new Date().toISOString(),
    revenue: store.todayRevenue,
    customers: store.todayCustomers,
    transactions: store.todayCustomers,
    employeesPaid: getAllEmployees(storeId).filter((e) => e.hoursWorked > 0).length,
    stockValue: store.storage.inventory
      .allLines()
      .reduce((s, l) => s + l.quantity * l.wholesalePrice, 0),
  };

  store.isOpen = false;
  store.openedBy = null;
  store.openedAt = null;

  netEmit("sqdc:store_closed", { storeId, report });
  sendChatMessage(`🔴 SQDC ${store.name} — FERMÉ`);

  store.todayRevenue = 0;
  store.todayCustomers = 0;

  return { success: true, message: "Rapport généré.", report };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PANIER
   ═══════════════════════════════════════════════════════════════════════════ */

export function addToCart(
  customerId: string,
  storeId: string,
  itemId: string,
  qty = 1,
): { success: boolean; message: string; cart: Cart | null } {
  const store = getStore(storeId);
  if (!store || !store.isOpen) {
    return { success: false, message: "Magasin fermé.", cart: null };
  }

  const stock = store.storage.inventory.getStock(itemId);
  if (!stock || stock.quantity < qty) {
    return { success: false, message: "Stock insuffisant.", cart: null };
  }

  let cart = ACTIVE_CARTS.get(customerId);
  if (!cart) {
    cart = { customerId, storeId, items: [], createdAt: Date.now() };
    ACTIVE_CARTS.set(customerId, cart);
  }
  if (cart.storeId !== storeId) {
    return {
      success: false,
      message: "Panier actif dans une autre succursale.",
      cart: null,
    };
  }

  const existing = cart.items.find((i) => i.itemId === itemId);
  if (existing) existing.qty += qty;
  else cart.items.push({ itemId, qty });

  /* Vérification limite légale 30 g */
  const totalG = cart.items.reduce((s, it) => {
    const p = productById(it.itemId);
    return s + (p?.weightGrams ?? 0) * it.qty;
  }, 0);

  if (totalG > MAX_WEIGHT_GRAMS) {
    if (existing) existing.qty -= qty;
    else cart.items = cart.items.filter((i) => i.itemId !== itemId);
    return {
      success: false,
      message: `Limite légale 30 g dépassée (${totalG.toFixed(1)} g).`,
      cart,
    };
  }

  netEmit("sqdc:cart_updated", { customerId, cart });
  return { success: true, message: "Ajouté au panier.", cart };
}

export function removeFromCart(
  customerId: string,
  itemId: string,
): { success: boolean; cart: Cart | null } {
  const cart = ACTIVE_CARTS.get(customerId);
  if (!cart) return { success: false, cart: null };

  cart.items = cart.items.filter((i) => i.itemId !== itemId);
  if (cart.items.length === 0) ACTIVE_CARTS.delete(customerId);

  netEmit("sqdc:cart_updated", { customerId, cart });
  return { success: true, cart };
}

export function getCart(customerId: string): Cart | null {
  return ACTIVE_CARTS.get(customerId) ?? null;
}

export function clearCart(customerId: string): void {
  ACTIVE_CARTS.delete(customerId);
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKOUT — Transaction
   ═══════════════════════════════════════════════════════════════════════════ */

export interface CheckoutRequest {
  customerId: string;
  customerName: string;
  storeId: string;
  registerId: string;
  cashierId: string;
  paymentMethod: "cash" | "debit" | "credit";
  customerAge: number;
  hasId: boolean;
}

export function executeTransaction(req: CheckoutRequest): {
  success: boolean;
  message: string;
  transaction: SqdcTransaction | null;
} {
  const store = getStore(req.storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", transaction: null };

  if (!store.isOpen) {
    return { success: false, message: "Magasin fermé.", transaction: null };
  }

  /* Vérification employé caissier */
  const cashier = getEmployee(req.storeId, req.cashierId);
  if (!cashier) {
    return { success: false, message: "Caissier introuvable.", transaction: null };
  }
  if (!getPlayerPermissions(req.cashierId).canSell) {
    return { success: false, message: "Ce joueur n'est pas autorisé à vendre.", transaction: null };
  }
  if (!cashier.isClockedIn) {
    return { success: false, message: "Caissier non en service.", transaction: null };
  }
  if (isSuspended(req.cashierId)) {
    return { success: false, message: "Caissier suspendu.", transaction: null };
  }

  /* Contrôle d'âge et d'identité */
  if (!req.hasId || req.customerAge < AGE_MINIMUM) {
    return {
      success: false,
      message: `❌ ${AGE_MINIMUM} ans + pièce d'identité obligatoires.`,
      transaction: null,
    };
  }

  /* Contrôle client banni */
  if (store.bannedCustomers.has(req.customerId)) {
    return { success: false, message: "🚫 Client banni de cette succursale.", transaction: null };
  }

  const cart = ACTIVE_CARTS.get(req.customerId);
  if (!cart || cart.items.length === 0) {
    return { success: false, message: "Panier vide.", transaction: null };
  }

  /* Vérification stocks en une passe */
  for (const item of cart.items) {
    const s = store.storage.inventory.getStock(item.itemId);
    if (!s || s.quantity < item.qty) {
      return { success: false, message: `Rupture : ${item.itemId}`, transaction: null };
    }
  }

  /* Calcul du total avec taxes QC */
  let subtotal = 0;
  const lines: SqdcTransaction["items"] = [];
  for (const it of cart.items) {
    const s = store.storage.inventory.getStock(it.itemId)!;
    subtotal += s.retailPrice * it.qty;
    lines.push({ itemId: it.itemId, qty: it.qty, unitPrice: s.retailPrice });
  }

  const tps = Math.round(subtotal * TPS_RATE * 100) / 100;
  const tvq = Math.round(subtotal * TVQ_RATE * 100) / 100;
  const total = Math.round((subtotal + tps + tvq) * 100) / 100;

  /* Paiement */
  removeCash(total, req.customerId);

  /* Dépôt en caisse (comptabilisé au coffre en fin de quart) */
  store.storage.safe.deposit(0); // placeholder : à brancher sur un vrai système de caisse

  /* Décrémente le stock + transfert au client */
  for (const it of cart.items) {
    store.storage.inventory.removeStock(it.itemId, it.qty);
    addToInventory(it.itemId, it.qty, req.customerId);
  }

  /* Met à jour les stats du magasin */
  store.todayRevenue += total;
  store.todayCustomers++;

  /* Crédite le caissier (commission + perf) */
  recordSale(req.storeId, req.cashierId, total);

  /* Construit et émet la transaction */
  const transaction: SqdcTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    storeId: req.storeId,
    customerId: req.customerId,
    customerName: req.customerName,
    items: lines,
    subtotal: Math.round(subtotal * 100) / 100,
    tps,
    tvq,
    total,
    paymentMethod: req.paymentMethod,
    timestamp: Date.now(),
    idVerified: req.hasId,
    cashierId: req.cashierId,
  };

  ACTIVE_CARTS.delete(req.customerId);

  netEmit("sqdc:transaction_complete", { transaction });
  sendPrivateMessage(
    req.customerId,
    `✅ Achat : ${total.toFixed(2)}$ · ${lines.length} article${lines.length > 1 ? "s" : ""}`,
  );

  return {
    success: true,
    message: `Achat : ${total.toFixed(2)}$`,
    transaction,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BRAQUAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export interface RobberyState {
  storeId: string;
  robbers: string[];
  startTime: number;
  lootCollected: number;
  policeAlerted: boolean;
  hostages: string[];
}

const ACTIVE_ROBBERIES = new Map<string, RobberyState>();

export function startRobbery(
  storeId: string,
  robberId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };
  if (!store.isOpen) return { success: false, message: "Le magasin est fermé." };
  if (ACTIVE_ROBBERIES.has(storeId)) {
    return { success: false, message: "Braquage déjà en cours." };
  }

  /* Confinement immédiat */
  store.interior.sas.setLockdown(true);
  store.security.alarm.setLockdown(true);
  store.security.alarm.trigger("robbery", robberId);

  const state: RobberyState = {
    storeId,
    robbers: [robberId],
    startTime: Date.now(),
    lootCollected: 0,
    policeAlerted: true,
    hostages: [],
  };
  ACTIVE_ROBBERIES.set(storeId, state);

  addWantedPoints(robberId, 150, "Braquage SQDC (vol qualifié)");

  /* Notifier tous les employés en service */
  for (const emp of getEmployeesOnDuty(storeId)) {
    sendPrivateMessage(
      emp.playerId,
      `⚠️ BRAQUAGE ! Confinement d'urgence. Mettez-vous à l'abri.`,
    );
  }

  dispatchPolice({
    location: store.position,
    priority: "critical",
    type: "Braquage SQDC",
    description: `Code 99 — Vol qualifié en cours à ${store.name}. SAS verrouillé.`,
  });

  sendChatMessage(`🚨 BRAQUAGE — SQDC ${store.name} · mode confinement`);

  netEmit("sqdc:robbery_started", { storeId, robberId });

  return {
    success: true,
    message: "Braquage lancé. La police arrive — faites vite.",
  };
}

export function demandMoney(
  storeId: string,
  robberId: string,
  amount: number,
): { success: boolean; message: string } {
  const r = ACTIVE_ROBBERIES.get(storeId);
  if (!r || !r.robbers.includes(robberId)) {
    return { success: false, message: "Braquage introuvable." };
  }

  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const available = store.storage.safe.getCash();
  const take = Math.min(amount, available);
  if (take <= 0) return { success: false, message: "Coffre vide." };

  const res = store.storage.safe.withdraw(take, "*", robberId);
  if (!res.ok) return { success: false, message: res.reason ?? "Retrait échoué." };

  addCash(take, robberId);
  r.lootCollected += take;

  netEmit("sqdc:money_stolen", { storeId, amount: take, robberId });

  return { success: true, message: `Butin : ${take}$` };
}

export function endRobbery(storeId: string, success: boolean): void {
  const r = ACTIVE_ROBBERIES.get(storeId);
  if (!r) return;

  const store = getStore(storeId);
  if (store) {
    store.interior.sas.setLockdown(false);
    store.security.alarm.setLockdown(false);
    store.security.alarm.clear();
  }

  if (success) {
    sendChatMessage(
      `💰 Braquage réussi — ${r.lootCollected}$ volés à la SQDC ${store?.name ?? storeId}.`,
    );
  } else {
    sendChatMessage(`👮 Braquage déjoué — suspects arrêtés par la SQ.`);
  }

  ACTIVE_ROBBERIES.delete(storeId);
  netEmit("sqdc:robbery_ended", { storeId, success });
}

export function isRobberyInProgress(storeId: string): boolean {
  return ACTIVE_ROBBERIES.has(storeId);
}

/* ═══════════════════════════════════════════════════════════════════════════
   INSPECTION GOUVERNEMENTALE
   ═══════════════════════════════════════════════════════════════════════════ */

export interface InspectionResult {
  storeId: string;
  inspectorId: string;
  inspectorName: string;
  startedAt: number;
  completedAt: number | null;
  violations: string[];
  passed: boolean | null;
  fine: number;
  licenseSuspended: boolean;
}

export function startInspection(
  storeId: string,
  inspectorId: string,
  inspectorName: string,
): { success: boolean; message: string; violations: string[] } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", violations: [] };

  const violations: string[] = [];

  if (!store.license.valid) violations.push("Licence expirée ou suspendue");
  if (Date.now() > store.license.expiryDate) violations.push("Licence expirée depuis " + new Date(store.license.expiryDate).toLocaleDateString("fr-CA"));

  const lowStock = store.storage.inventory.getLowStock();
  if (lowStock.length > 3) violations.push("Gestion de stock inadéquate");

  const employees = getAllEmployees(storeId);
  const uncertified = employees.filter((e) => {
    if (e.role === "caissier") return !hasCertification(storeId, e.playerId, "pos_system");
    if (e.role === "conseiller") return !hasCertification(storeId, e.playerId, "cannabis_101");
    if (e.role === "securite") return !hasCertification(storeId, e.playerId, "security_guard");
    return false;
  });
  if (uncertified.length > 0) {
    violations.push(`${uncertified.length} employé(s) sans certification requise`);
  }

  const suspended = employees.filter((e) => isSuspended(e.playerId));
  if (suspended.length > 0) violations.push("Employés suspendus en service");

  sendPrivateMessage(store.ownerId, `🔍 INSPECTION SQDC par ${inspectorName}`);
  netEmit("sqdc:inspection_started", { storeId, violations });

  return {
    success: true,
    message: violations.length > 0
      ? `${violations.length} non-conformité(s) détectée(s)`
      : "Inspection lancée — tout semble conforme.",
    violations,
  };
}

export function completeInspection(
  storeId: string,
  inspectorId: string,
  passed: boolean,
  violations: string[] = [],
): { success: boolean; message: string; fine: number; licenseSuspended: boolean } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", fine: 0, licenseSuspended: false };

  const fine = passed ? 0 : violations.length * 500;
  let licenseSuspended = false;

  store.license.violations += violations.length;

  if (!passed && violations.length >= 3) {
    licenseSuspended = true;
    store.license.suspensions++;
    store.license.valid = false;
    store.isOpen = false;
  }

  if (fine > 0) removeCash(fine, store.ownerId);

  const result = passed
    ? "✅ Rapport conforme — Aucune sanction"
    : `❌ Amende : ${fine}$${licenseSuspended ? " · Licence suspendue" : ""}`;

  sendPrivateMessage(store.ownerId, `📋 Rapport d'inspection : ${result}`);
  netEmit("sqdc:inspection_completed", { storeId, passed, fine, violations, licenseSuspended });

  return { success: true, message: result, fine, licenseSuspended };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BANNISSEMENT CLIENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function banCustomer(
  storeId: string,
  guardId: string,
  customerId: string,
  reason: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  if (!getPlayerPermissions(guardId).canBanCustomers) {
    return { success: false, message: "Permission d'expulsion manquante." };
  }

  store.bannedCustomers.add(customerId);

  sendPrivateMessage(customerId, `🚫 Banni de ${store.name} — Motif : ${reason}`);
  netEmit("sqdc:customer_banned", { storeId, customerId, reason });

  return { success: true, message: "Client banni." };
}

export function unbanCustomer(
  storeId: string,
  managerId: string,
  customerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  if (!getPlayerPermissions(managerId).canBanCustomers) {
    return { success: false, message: "Permission insuffisante." };
  }

  store.bannedCustomers.delete(customerId);
  netEmit("sqdc:customer_unbanned", { storeId, customerId });
  return { success: true, message: "Client débanni." };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROMPTS D'INTERACTION
   ═══════════════════════════════════════════════════════════════════════════ */

export function sqdcPrompt(
  aisle: { id: string; label: string; hint: string } | null,
  garment: { itemId: string } | null,
  atCaisse: boolean,
  cartN: number,
  hasId: boolean,
  playerId: string,
  storeId: string,
): string | null {
  const store = getStore(storeId);
  if (!store) return null;

  const role = getPlayerRole(playerId);
  const isEmployee = role?.storeId === storeId && role.role !== "client" && role.role !== "trespasser";

  if (store.bannedCustomers.has(playerId)) return "🚫 Interdit d'accès.";

  /* ─── Vue employé ─── */
  if (isEmployee) {
    const emp = getEmployee(storeId, playerId);
    if (emp && isSuspended(playerId)) return "⛔ Vous êtes suspendu(e).";

    if (atCaisse) {
      if (!emp?.isClockedIn) return "E — Prise de service obligatoire";
      return "E — Servir le client / F — Quitter la caisse";
    }

    if (aisle?.id === "reserve") return jobsPrompt(storeId, playerId, "reserve_door");
    if (aisle?.id === "caisse") return "E — Gérer les caisses";

    if (aisle) {
      const low = store.storage.inventory
        .getLowStock()
        .some((s) => s.aisle === aisle.id);
      return low
        ? `⚠️ Stock bas · E — Réapprovisionner`
        : `${aisle.label} · E — Gérer`;
    }
    return null;
  }

  /* ─── Vue client ─── */
  if (!store.isOpen) return "🔴 Fermé — Revenez entre 10 h et 21 h";

  if (garment) {
    const p = productById(garment.itemId);
    if (p) return `E — Ajouter ${p.name} · ${p.retail}$`;
  }

  if (atCaisse) {
    if (!hasId) return "Caisse · Pièce d'identité 21+ requise";
    return cartN > 0
      ? `E — Payer (${cartN} article${cartN > 1 ? "s" : ""})`
      : "Panier vide — Ajoutez des articles";
  }

  if (aisle) {
    if (aisle.id === "accueil") {
      return hasId ? "✅ Identité vérifiée" : "21 ans · Contrôle d'identité requis";
    }
    if (aisle.id === "conseil") return "E — Parler à un conseiller";
    if (aisle.id === "reserve") return "🚫 Employés seulement";
    return `E — Rayon ${aisle.label} · ${aisle.hint}`;
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RÉEXPORTS JOBS (compat & API publique)
   ═══════════════════════════════════════════════════════════════════════════ */

/* Types */
export type {
  SqdcRole,
  SqdcEmployee,
  SqdcPermissions,
  JobsPromptContext,
};

/* Constantes rôles & paie */
export {
  ROLE_PERMISSIONS,
  ROLE_RANK,
  ROLE_META,
  MIN_HOURLY_WAGE_QC,
};

/* Accesseurs */
export {
  getEmployee,
  getPlayerRole,
  getPlayerPermissions,
  getAllEmployees,
  getEmployeesOnDuty,
};

/* Contrats & RH */
export {
  hireEmployee,
  fireEmployee,
  resign,
  promoteEmployee,
  adjustSalary,
  submitApplication,
  reviewApplication,
  listApplications,
  issueStrike,
  getStrikes,
  isSuspended,
  enrollCertification,
  hasCertification,
  listEmployeeCertifications,
  setShift,
  getShifts,
  getShiftsToday,
  generateStaffReport,
  setPerformance,
};

/* Pointage */
export {
  clockIn,
  clockOut,
  getTimeSinceClockIn,
};

/* Prompts RH */
export {
  jobsPrompt,
};

/* ─── Catalogue produits ─── */
export {
  productById,
  legalProducts,
  illegalProducts,
  SQDC_CATALOG,
  type SqdcProduct,
} from "./catalog";