/**
 * ═══════════════════════════════════════════════════════════════════
 * SQDC — Société Québécoise du Cannabis
 * SYSTÈME MULTIJOUEUR : opérée par de VRAIS JOUEURS
 * ═══════════════════════════════════════════════════════════════════
 *
 * RÔLES DISPONIBLES (joueurs) :
 *  - Directeur/Directrice (owner)     : gère budget, embauches, prix
 *  - Caissier/Caissière                : vend, vérifie ID, gère la caisse
 *  - Conseiller/Conseillère            : oriente les clients
 *  - Agent de sécurité                 : surveille, expulse voleurs
 *  - Commis à l'inventaire             : reçoit stock, remplit tablettes
 *  - Livreur SQDC                      : livraisons à domicile
 *  - Client                            : achète (21+)
 *
 * INTÉGRATIONS RÉSEAU :
 *  - net.ts (WebSocket sync)
 *  - remotes.ts (RPC entre clients)
 *  - jobs.ts (contrats de travail)
 *  - banking.ts (paie, revenus)
 *  - police.ts (raids, licences)
 *  - inventory.tsx (transferts d'items)
 *  - chat.tsx (communication interne)
 *  - phone.tsx (appels employés/clients)
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { commerceMat } from "./commerceMats";
import { finishMap } from "./textures";
import type { ShopItemId, ShopSpot } from "./commerce";
import { itemById } from "./commerce";
import type { BoutiqueGarment } from "./boutique";
import type { DepAisleHot } from "./depanneur";
import { shopDoorOffset } from "./depanneur";

// Réseau & multijoueur
import { netEmit, netOn, netRequest, type NetPacket } from "./net";
import { registerRemote, callRemote } from "./remotes";

// Systèmes joueur
import { getPlayerId, getPlayerData, type PlayerData } from "./character";
import { addCash, removeCash, transferMoney } from "./banking";
import { addToInventory, removeFromInventory, getInventoryItem } from "./backpack";
import { sendChatMessage, sendPrivateMessage } from "./chat";
import { triggerNotification } from "./phone";

// Monde
import { getGameHour } from "./seasons";
import { addWantedPoints } from "./police";

// ═══════════════════════════════════════════════════════════
// TYPES — RÔLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════

export type SqdcRole =
  | "directeur"       // owner, tous droits
  | "gerant"          // manager, embauche + caisse
  | "caissier"        // vend, gère cash
  | "conseiller"      // oriente clients, pas de $
  | "securite"        // expulse, ban clients
  | "commis"          // stock, réapprovisionne
  | "livreur"         // livraisons à domicile
  | "client"          // achète (aucun droit)
  | "trespasser";     // banni

export interface SqdcPermissions {
  canSell: boolean;
  canRefund: boolean;
  canManageStock: boolean;
  canHire: boolean;
  canFire: boolean;
  canSetPrices: boolean;
  canAccessSafe: boolean;
  canViewCameras: boolean;
  canBanCustomers: boolean;
  canDeliver: boolean;
  canOpenStore: boolean;
  canCloseStore: boolean;
  canOrderStock: boolean;
}

export const ROLE_PERMISSIONS: Record<SqdcRole, SqdcPermissions> = {
  directeur: {
    canSell: true, canRefund: true, canManageStock: true,
    canHire: true, canFire: true, canSetPrices: true,
    canAccessSafe: true, canViewCameras: true, canBanCustomers: true,
    canDeliver: true, canOpenStore: true, canCloseStore: true,
    canOrderStock: true,
  },
  gerant: {
    canSell: true, canRefund: true, canManageStock: true,
    canHire: true, canFire: false, canSetPrices: false,
    canAccessSafe: true, canViewCameras: true, canBanCustomers: true,
    canDeliver: false, canOpenStore: true, canCloseStore: true,
    canOrderStock: true,
  },
  caissier: {
    canSell: true, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  conseiller: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  securite: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: true, canBanCustomers: true,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  commis: {
    canSell: false, canRefund: false, canManageStock: true,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: true,
  },
  livreur: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: true, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  client: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  trespasser: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
};

// ═══════════════════════════════════════════════════════════
// TYPES — EMPLOYÉ & CONTRAT
// ═══════════════════════════════════════════════════════════

export interface SqdcEmployee {
  playerId: string;
  playerName: string;
  role: SqdcRole;
  hourlyRate: number;         // $/h — min 15.75$ QC 2024
  hoursWorked: number;
  totalEarned: number;
  isClockedIn: boolean;
  clockInTime: number | null;
  hireDate: number;
  performanceRating: number;  // 0-100
  salesCount: number;
  storeId: string;
}

export interface SqdcSchedule {
  playerId: string;
  dayOfWeek: number;          // 0-6
  startHour: number;
  endHour: number;
  role: SqdcRole;
}

// ═══════════════════════════════════════════════════════════
// TYPES — INVENTAIRE & STOCK
// ═══════════════════════════════════════════════════════════

export interface SqdcStock {
  itemId: ShopItemId;
  quantity: number;
  maxCapacity: number;
  reorderThreshold: number;
  wholesalePrice: number;     // prix d'achat de la SQDC
  retailPrice: number;        // prix de vente (peut être modifié par le directeur)
  aisle: SqdcAisleId;
  lastRestock: number;
  displayShelf: string;       // ID du présentoir 3D
}

export interface StockOrder {
  id: string;
  storeId: string;
  items: Array<{ itemId: ShopItemId; qty: number; unitPrice: number }>;
  totalCost: number;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  orderedBy: string;
  orderedAt: number;
  eta: number;                // timestamp de livraison prévue
}

// ═══════════════════════════════════════════════════════════
// TYPES — CAISSE & TRANSACTIONS
// ═══════════════════════════════════════════════════════════

export interface CashRegister {
  id: string;
  storeId: string;
  cashInside: number;         // billets/monnaie
  isOpen: boolean;
  operatedBy: string | null;  // playerId du caissier actuel
  todayRevenue: number;
  todayTransactions: number;
  position: { x: number; y: number; z: number };
}

export interface SqdcTransaction {
  id: string;
  storeId: string;
  registerId: string;
  cashierId: string;
  cashierName: string;
  customerId: string;
  customerName: string;
  items: Array<{ itemId: ShopItemId; qty: number; unitPrice: number }>;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  paymentMethod: "cash" | "debit" | "credit";
  timestamp: number;
  idVerified: boolean;
  customerAge: number;
  cancelled: boolean;
  refunded: boolean;
}

// ═══════════════════════════════════════════════════════════
// TYPES — STORE (MAGASIN)
// ═══════════════════════════════════════════════════════════

export interface SqdcStore {
  id: string;
  name: string;              // "SQDC St-Denis", "SQDC Ste-Foy"
  address: string;
  city: string;
  position: { x: number; z: number };
  ownerId: string;           // player-directeur
  isOpen: boolean;
  openedBy: string | null;
  openedAt: number | null;
  employees: SqdcEmployee[];
  schedules: SqdcSchedule[];
  stock: SqdcStock[];
  registers: CashRegister[];
  safe: { cash: number; combination: string };
  cameras: CameraFeed[];
  todayRevenue: number;
  todayCustomers: number;
  weeklyRevenue: number;
  bannedCustomers: string[]; // playerIds
  license: SqdcLicense;
  bills: OperatingBill[];
  deliveries: Delivery[];
  incidents: Incident[];
}

export interface SqdcLicense {
  number: string;
  issuedTo: string;
  expiryDate: number;
  isValid: boolean;
  suspensions: number;
  violationsCount: number;
}

export interface OperatingBill {
  id: string;
  type: "rent" | "electricity" | "insurance" | "supplier" | "tax";
  amount: number;
  dueDate: number;
  paid: boolean;
  paidBy: string | null;
}

export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  address: { x: number; z: number };
  items: Array<{ itemId: ShopItemId; qty: number }>;
  total: number;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "failed";
  driverId: string | null;
  orderedAt: number;
  deliveredAt: number | null;
  tipAmount: number;
}

export interface Incident {
  id: string;
  type: "theft" | "underage" | "harassment" | "vandalism" | "robbery" | "fake_id";
  timestamp: number;
  suspectId: string;
  suspectName: string;
  reportedBy: string;
  description: string;
  resolved: boolean;
  policeAlerted: boolean;
}

export interface CameraFeed {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  isRecording: boolean;
  viewingPlayers: string[];
}

// ═══════════════════════════════════════════════════════════
// TYPES — ALLÉES & PRODUITS
// ═══════════════════════════════════════════════════════════

export type SqdcAisleId =
  | "accueil"
  | "fleur"
  | "huile"
  | "vape"
  | "preroll"
  | "caisse"
  | "conseil"
  | "reserve";      // arrière-boutique

export interface SqdcAisleDef {
  id: SqdcAisleId;
  label: string;
  hint: string;
  items: ShopItemId[];
  requiresRole?: SqdcRole[];    // pour la réserve = employés seulement
}

export const SQDC_AISLES: SqdcAisleDef[] = [
  { id: "accueil", label: "Accueil", hint: "21 ans · pièce d'identité.", items: [] },
  { id: "fleur", label: "Fleur séchée", hint: "Indica, sativa, 3,5 g.", items: ["weed", "fleur_indica", "fleur_sativa"] },
  { id: "huile", label: "Huiles", hint: "Flacons 30 ml.", items: ["huile"] },
  { id: "vape", label: "Vapes", hint: "Cartouches, batteries.", items: ["vape"] },
  { id: "preroll", label: "Péroulés", hint: "Joints, gélules, hash.", items: ["preroll", "gelules", "hash"] },
  { id: "caisse", label: "Caisse", hint: "TPS + TVQ. 21 ans.", items: [] },
  { id: "conseil", label: "Conseiller", hint: "Dosage, produits.", items: [] },
  {
    id: "reserve",
    label: "Réserve",
    hint: "Employés seulement.",
    items: [],
    requiresRole: ["directeur", "gerant", "commis"],
  },
];

// ═══════════════════════════════════════════════════════════
// HORAIRES
// ═══════════════════════════════════════════════════════════

export const SQDC_OPEN_FROM = 10;
export const SQDC_OPEN_TO = 21;
export const MIN_HOURLY_WAGE_QC = 15.75;

export function isSqdcOpen(hours: number): boolean {
  return hours >= SQDC_OPEN_FROM && hours < SQDC_OPEN_TO;
}

export function sqdcHoursLabel(): string {
  return "10 h – 21 h";
}

// ═══════════════════════════════════════════════════════════
// REGISTRE GLOBAL DES MAGASINS (synchronisé multijoueur)
// ═══════════════════════════════════════════════════════════

const STORES: Map<string, SqdcStore> = new Map();
const PLAYER_ROLES: Map<string, { storeId: string; role: SqdcRole }> = new Map();
const ACTIVE_CARTS: Map<string, Cart> = new Map();

export interface Cart {
  customerId: string;
  storeId: string;
  items: Array<{ itemId: ShopItemId; qty: number }>;
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════
// FONCTIONS DE GESTION DES MAGASINS
// ═══════════════════════════════════════════════════════════

export function registerStore(store: SqdcStore): void {
  STORES.set(store.id, store);
  netEmit("sqdc:store_registered", { store });
}

export function getStore(storeId: string): SqdcStore | null {
  return STORES.get(storeId) ?? null;
}

export function getAllStores(): SqdcStore[] {
  return Array.from(STORES.values());
}

export function getPlayerRole(playerId: string): { storeId: string; role: SqdcRole } | null {
  return PLAYER_ROLES.get(playerId) ?? null;
}

export function getPlayerPermissions(playerId: string): SqdcPermissions {
  const role = getPlayerRole(playerId);
  if (!role) return ROLE_PERMISSIONS.client;
  return ROLE_PERMISSIONS[role.role];
}

// ═══════════════════════════════════════════════════════════
// EMBAUCHE / CONGÉDIEMENT (multijoueur)
// ═══════════════════════════════════════════════════════════

export function hireEmployee(
  storeId: string,
  hiringPlayerId: string,
  targetPlayerId: string,
  targetPlayerName: string,
  role: SqdcRole,
  hourlyRate: number,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(hiringPlayerId);
  if (!perms.canHire) {
    return { success: false, message: "Vous n'avez pas la permission d'embaucher." };
  }

  if (hourlyRate < MIN_HOURLY_WAGE_QC) {
    return {
      success: false,
      message: `Salaire minimum au Québec: ${MIN_HOURLY_WAGE_QC}$/h`,
    };
  }

  if (role === "directeur") {
    return { success: false, message: "Un seul directeur par magasin." };
  }

  const already = store.employees.find((e) => e.playerId === targetPlayerId);
  if (already) return { success: false, message: "Ce joueur est déjà employé." };

  const employee: SqdcEmployee = {
    playerId: targetPlayerId,
    playerName: targetPlayerName,
    role,
    hourlyRate,
    hoursWorked: 0,
    totalEarned: 0,
    isClockedIn: false,
    clockInTime: null,
    hireDate: Date.now(),
    performanceRating: 50,
    salesCount: 0,
    storeId,
  };

  store.employees.push(employee);
  PLAYER_ROLES.set(targetPlayerId, { storeId, role });

  // Notifier le joueur embauché
  netEmit("sqdc:hired", {
    playerId: targetPlayerId,
    storeId,
    role,
    hourlyRate,
    storeName: store.name,
  });

  sendPrivateMessage(
    targetPlayerId,
    `🎉 Vous avez été embauché à ${store.name} comme ${role}! Salaire: ${hourlyRate}$/h`,
  );

  return { success: true, message: `${targetPlayerName} embauché comme ${role}.` };
}

export function fireEmployee(
  storeId: string,
  firingPlayerId: string,
  targetPlayerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(firingPlayerId);
  if (!perms.canFire) {
    return { success: false, message: "Permission refusée." };
  }

  const idx = store.employees.findIndex((e) => e.playerId === targetPlayerId);
  if (idx === -1) return { success: false, message: "Employé introuvable." };

  const emp = store.employees[idx];

  // Payer les heures restantes
  if (emp.isClockedIn && emp.clockInTime) {
    const hoursWorked = (Date.now() - emp.clockInTime) / 3600000;
    const owed = hoursWorked * emp.hourlyRate;
    transferMoney(store.ownerId, targetPlayerId, owed);
  }

  store.employees.splice(idx, 1);
  PLAYER_ROLES.delete(targetPlayerId);

  netEmit("sqdc:fired", { playerId: targetPlayerId, storeId });
  sendPrivateMessage(
    targetPlayerId,
    `❌ Vous avez été congédié de ${store.name}.`,
  );

  return { success: true, message: "Employé congédié." };
}

// ═══════════════════════════════════════════════════════════
// PUNCH IN / PUNCH OUT
// ═══════════════════════════════════════════════════════════

export function clockIn(
  storeId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const emp = store.employees.find((e) => e.playerId === playerId);
  if (!emp) return { success: false, message: "Vous n'êtes pas employé ici." };

  if (emp.isClockedIn) {
    return { success: false, message: "Déjà pointé." };
  }

  emp.isClockedIn = true;
  emp.clockInTime = Date.now();

  netEmit("sqdc:clock_in", { playerId, storeId, timestamp: Date.now() });
  return { success: true, message: `Punché à ${new Date().toLocaleTimeString()}` };
}

export function clockOut(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; earned: number } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", earned: 0 };

  const emp = store.employees.find((e) => e.playerId === playerId);
  if (!emp || !emp.isClockedIn || !emp.clockInTime) {
    return { success: false, message: "Pas pointé.", earned: 0 };
  }

  const hours = (Date.now() - emp.clockInTime) / 3600000;
  const earned = Math.round(hours * emp.hourlyRate * 100) / 100;

  emp.hoursWorked += hours;
  emp.totalEarned += earned;
  emp.isClockedIn = false;
  emp.clockInTime = null;

  // Transfert automatique de paie
  transferMoney(store.ownerId, playerId, earned);

  netEmit("sqdc:clock_out", { playerId, storeId, hours, earned });
  return {
    success: true,
    message: `Punché out. ${hours.toFixed(2)}h travaillées, ${earned}$ payés.`,
    earned,
  };
}

// ═══════════════════════════════════════════════════════════
// OUVERTURE / FERMETURE DU MAGASIN
// ═══════════════════════════════════════════════════════════

export function openStore(
  storeId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canOpenStore) {
    return { success: false, message: "Permission refusée." };
  }

  const hour = getGameHour();
  if (!isSqdcOpen(hour)) {
    return {
      success: false,
      message: `Impossible d'ouvrir hors des heures légales (${sqdcHoursLabel()}).`,
    };
  }

  if (!store.license.isValid) {
    return { success: false, message: "❌ Licence SQDC invalide ou suspendue." };
  }

  store.isOpen = true;
  store.openedBy = playerId;
  store.openedAt = Date.now();

  netEmit("sqdc:store_opened", { storeId, openedBy: playerId });
  sendChatMessage(`🟢 ${store.name} est maintenant OUVERT.`);

  return { success: true, message: "Magasin ouvert. Bonne journée!" };
}

export function closeStore(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; dailyReport: DailyReport } {
  const store = getStore(storeId);
  if (!store) {
    return {
      success: false,
      message: "Magasin introuvable.",
      dailyReport: emptyReport(),
    };
  }

  const perms = getPlayerPermissions(playerId);
  if (!perms.canCloseStore) {
    return {
      success: false,
      message: "Permission refusée.",
      dailyReport: emptyReport(),
    };
  }

  store.isOpen = false;

  const report: DailyReport = {
    storeId,
    date: new Date().toISOString(),
    revenue: store.todayRevenue,
    customers: store.todayCustomers,
    transactions: store.registers.reduce((s, r) => s + r.todayTransactions, 0),
    employeesPaid: store.employees.filter((e) => e.hoursWorked > 0).length,
    incidents: store.incidents.filter((i) => !i.resolved).length,
    stockValue: store.stock.reduce((s, i) => s + i.quantity * i.wholesalePrice, 0),
  };

  // Reset daily
  store.todayRevenue = 0;
  store.todayCustomers = 0;
  store.registers.forEach((r) => {
    r.todayRevenue = 0;
    r.todayTransactions = 0;
  });

  netEmit("sqdc:store_closed", { storeId, report });
  sendChatMessage(`🔴 ${store.name} est FERMÉ. Revenus du jour: ${report.revenue}$`);

  return { success: true, message: "Magasin fermé.", dailyReport: report };
}

export interface DailyReport {
  storeId: string;
  date: string;
  revenue: number;
  customers: number;
  transactions: number;
  employeesPaid: number;
  incidents: number;
  stockValue: number;
}

function emptyReport(): DailyReport {
  return {
    storeId: "",
    date: "",
    revenue: 0,
    customers: 0,
    transactions: 0,
    employeesPaid: 0,
    incidents: 0,
    stockValue: 0,
  };
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE CAISSE (joueur-caissier avec joueur-client)
// ═══════════════════════════════════════════════════════════

export function occupyRegister(
  storeId: string,
  registerId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const reg = store.registers.find((r) => r.id === registerId);
  if (!reg) return { success: false, message: "Caisse introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canSell) {
    return { success: false, message: "Vous n'êtes pas caissier." };
  }

  if (reg.operatedBy && reg.operatedBy !== playerId) {
    return { success: false, message: "Caisse déjà occupée." };
  }

  reg.operatedBy = playerId;
  reg.isOpen = true;

  netEmit("sqdc:register_occupied", { storeId, registerId, playerId });
  return { success: true, message: "Caisse ouverte. Prêt à servir." };
}

export function leaveRegister(
  storeId: string,
  registerId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const reg = store.registers.find((r) => r.id === registerId);
  if (!reg) return { success: false, message: "Caisse introuvable." };

  if (reg.operatedBy !== playerId) {
    return { success: false, message: "Vous n'occupez pas cette caisse." };
  }

  reg.operatedBy = null;
  reg.isOpen = false;

  netEmit("sqdc:register_left", { storeId, registerId, playerId });
  return { success: true, message: "Caisse fermée." };
}

// ═══════════════════════════════════════════════════════════
// PROCESSUS D'ACHAT — CLIENT VA À LA CAISSE
// ═══════════════════════════════════════════════════════════

export interface CheckoutRequest {
  customerId: string;
  storeId: string;
  registerId: string;
  cart: Cart;
  paymentMethod: "cash" | "debit" | "credit";
  customerAge: number;
  hasId: boolean;
}

export async function requestCheckout(
  req: CheckoutRequest,
): Promise<{ success: boolean; message: string; transaction: SqdcTransaction | null }> {
  const store = getStore(req.storeId);
  if (!store) {
    return { success: false, message: "Magasin introuvable.", transaction: null };
  }

  if (!store.isOpen) {
    return { success: false, message: "Le magasin est fermé.", transaction: null };
  }

  const reg = store.registers.find((r) => r.id === req.registerId);
  if (!reg || !reg.operatedBy) {
    return { success: false, message: "Aucun caissier disponible à cette caisse.", transaction: null };
  }

  // Notifier le caissier qu'un client attend
  const customerData = getPlayerData();
  netEmit("sqdc:customer_at_register", {
    cashierId: reg.operatedBy,
    customerId: req.customerId,
    customerName: customerData?.name ?? "Client",
    storeId: req.storeId,
    registerId: req.registerId,
    cart: req.cart,
  });

  // Le caissier doit approuver via l'interface (attente d'action multijoueur)
  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        message: "⏱️ Le caissier n'a pas répondu à temps.",
        transaction: null,
      });
    }, 60000); // 60s d'attente max

    const unsubscribe = netOn("sqdc:cashier_response", (data: any) => {
      if (data.customerId !== req.customerId) return;

      clearTimeout(timeout);
      unsubscribe();

      if (!data.approved) {
        resolve({
          success: false,
          message: data.reason || "❌ Vente refusée par le caissier.",
          transaction: null,
        });
        return;
      }

      // Exécuter la transaction
      const result = executeTransaction(req, reg);
      resolve(result);
    });
  });
}

function executeTransaction(
  req: CheckoutRequest,
  reg: CashRegister,
): { success: boolean; message: string; transaction: SqdcTransaction | null } {
  const store = getStore(req.storeId)!;

  // Vérifier stock
  for (const cartItem of req.cart.items) {
    const stock = store.stock.find((s) => s.itemId === cartItem.itemId);
    if (!stock || stock.quantity < cartItem.qty) {
      return {
        success: false,
        message: `Stock insuffisant: ${cartItem.itemId}`,
        transaction: null,
      };
    }
  }

  // Calculer les prix
  let subtotal = 0;
  const items: SqdcTransaction["items"] = [];
  for (const cartItem of req.cart.items) {
    const stock = store.stock.find((s) => s.itemId === cartItem.itemId)!;
    const lineTotal = stock.retailPrice * cartItem.qty;
    subtotal += lineTotal;
    items.push({
      itemId: cartItem.itemId,
      qty: cartItem.qty,
      unitPrice: stock.retailPrice,
    });
  }

  const tps = Math.round(subtotal * 0.05 * 100) / 100;
  const tvq = Math.round(subtotal * 0.09975 * 100) / 100;
  const total = Math.round((subtotal + tps + tvq) * 100) / 100;

  // Retirer l'argent du client
  const customerData = getPlayerData();
  if (!customerData) {
    return { success: false, message: "Client introuvable.", transaction: null };
  }

  if (customerData.cash < total) {
    return {
      success: false,
      message: `Fonds insuffisants (${total}$ requis).`,
      transaction: null,
    };
  }

  removeCash(total, req.customerId);

  // Ajouter à la caisse
  reg.cashInside += total;
  reg.todayRevenue += total;
  reg.todayTransactions++;

  // Revenus du magasin
  store.todayRevenue += total;
  store.todayCustomers++;

  // Retirer stock
  for (const cartItem of req.cart.items) {
    const stock = store.stock.find((s) => s.itemId === cartItem.itemId)!;
    stock.quantity -= cartItem.qty;

    // Alerte si stock bas
    if (stock.quantity <= stock.reorderThreshold) {
      netEmit("sqdc:low_stock", {
        storeId: req.storeId,
        itemId: cartItem.itemId,
        quantity: stock.quantity,
      });
    }
  }

  // Livrer à l'inventaire du client
  for (const cartItem of req.cart.items) {
    addToInventory(cartItem.itemId, cartItem.qty, req.customerId);
  }

  // Commission caissier (2% des ventes)
  const cashier = store.employees.find((e) => e.playerId === reg.operatedBy);
  if (cashier) {
    cashier.salesCount++;
    cashier.performanceRating = Math.min(100, cashier.performanceRating + 0.5);
  }

  // Créer la transaction
  const transaction: SqdcTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    storeId: req.storeId,
    registerId: reg.id,
    cashierId: reg.operatedBy!,
    cashierName: cashier?.playerName ?? "Inconnu",
    customerId: req.customerId,
    customerName: customerData.name,
    items,
    subtotal,
    tps,
    tvq,
    total,
    paymentMethod: req.paymentMethod,
    timestamp: Date.now(),
    idVerified: req.hasId,
    customerAge: req.customerAge,
    cancelled: false,
    refunded: false,
  };

  // Nettoyer le panier
  ACTIVE_CARTS.delete(req.customerId);

  // Notifier tout le monde
  netEmit("sqdc:transaction_complete", { transaction });

  return {
    success: true,
    message: `✅ Achat complété: ${total}$`,
    transaction,
  };
}

// Le caissier approuve/refuse une vente
export function cashierRespond(
  cashierId: string,
  customerId: string,
  approved: boolean,
  reason?: string,
): void {
  netEmit("sqdc:cashier_response", { cashierId, customerId, approved, reason });
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PANIER (client)
// ═══════════════════════════════════════════════════════════

export function addToCart(
  customerId: string,
  storeId: string,
  itemId: ShopItemId,
  qty: number = 1,
): { success: boolean; message: string; cart: Cart | null } {
  const store = getStore(storeId);
  if (!store || !store.isOpen) {
    return { success: false, message: "Magasin fermé.", cart: null };
  }

  const stock = store.stock.find((s) => s.itemId === itemId);
  if (!stock) {
    return { success: false, message: "Produit indisponible.", cart: null };
  }

  if (stock.quantity < qty) {
    return {
      success: false,
      message: `Stock insuffisant (${stock.quantity} restant).`,
      cart: null,
    };
  }

  let cart = ACTIVE_CARTS.get(customerId);
  if (!cart) {
    cart = { customerId, storeId, items: [], createdAt: Date.now() };
    ACTIVE_CARTS.set(customerId, cart);
  }

  if (cart.storeId !== storeId) {
    return {
      success: false,
      message: "Vous avez déjà un panier dans un autre magasin.",
      cart: null,
    };
  }

  const existing = cart.items.find((i) => i.itemId === itemId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.items.push({ itemId, qty });
  }

  // Limite légale 30g
  const totalGrams = cart.items.reduce((s, i) => {
    const item = itemById(i.itemId);
    return s + (item?.weight ?? 0) * i.qty;
  }, 0);

  if (totalGrams > 30) {
    if (existing) existing.qty -= qty;
    else cart.items = cart.items.filter((i) => i.itemId !== itemId);
    return {
      success: false,
      message: "❌ Limite légale de 30g par visite dépassée.",
      cart,
    };
  }

  netEmit("sqdc:cart_updated", { customerId, cart });
  return { success: true, message: "Ajouté au panier.", cart };
}

export function removeFromCart(
  customerId: string,
  itemId: ShopItemId,
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

// ═══════════════════════════════════════════════════════════
// GESTION DU STOCK (commis, gérant)
// ═══════════════════════════════════════════════════════════

export function restockShelf(
  storeId: string,
  playerId: string,
  itemId: ShopItemId,
  qty: number,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canManageStock) {
    return { success: false, message: "Permission refusée." };
  }

  const stock = store.stock.find((s) => s.itemId === itemId);
  if (!stock) return { success: false, message: "Produit inconnu." };

  const backpackQty = getInventoryItem(playerId, itemId);
  if (!backpackQty || backpackQty < qty) {
    return { success: false, message: "Pas assez dans votre sac." };
  }

  const space = stock.maxCapacity - stock.quantity;
  const toAdd = Math.min(qty, space);
  if (toAdd <= 0) return { success: false, message: "Tablette pleine." };

  removeFromInventory(itemId, toAdd, playerId);
  stock.quantity += toAdd;
  stock.lastRestock = Date.now();

  netEmit("sqdc:shelf_restocked", { storeId, itemId, qty: toAdd, byPlayer: playerId });
  return { success: true, message: `${toAdd} unités mises en tablette.` };
}

export function orderStock(
  storeId: string,
  playerId: string,
  order: Array<{ itemId: ShopItemId; qty: number }>,
): { success: boolean; message: string; totalCost: number } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", totalCost: 0 };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canOrderStock) {
    return { success: false, message: "Permission refusée.", totalCost: 0 };
  }

  let totalCost = 0;
  const orderItems: StockOrder["items"] = [];

  for (const line of order) {
    const stock = store.stock.find((s) => s.itemId === line.itemId);
    if (!stock) continue;
    const lineCost = stock.wholesalePrice * line.qty;
    totalCost += lineCost;
    orderItems.push({
      itemId: line.itemId,
      qty: line.qty,
      unitPrice: stock.wholesalePrice,
    });
  }

  const ownerData = getPlayerData();
  if (!ownerData || ownerData.cash < totalCost) {
    return {
      success: false,
      message: "Fonds du magasin insuffisants.",
      totalCost,
    };
  }

  removeCash(totalCost, store.ownerId);

  const stockOrder: StockOrder = {
    id: `order_${Date.now()}`,
    storeId,
    items: orderItems,
    totalCost,
    status: "pending",
    orderedBy: playerId,
    orderedAt: Date.now(),
    eta: Date.now() + 3600000, // 1h in-game
  };

  // Simuler livraison
  setTimeout(() => {
    stockOrder.status = "delivered";
    for (const item of orderItems) {
      const stock = store.stock.find((s) => s.itemId === item.itemId)!;
      const space = stock.maxCapacity - stock.quantity;
      stock.quantity += Math.min(item.qty, space);
    }
    netEmit("sqdc:stock_delivered", { storeId, order: stockOrder });
  }, 30000);

  netEmit("sqdc:stock_ordered", { storeId, order: stockOrder });
  return { success: true, message: `Commande passée: ${totalCost}$`, totalCost };
}

// ═══════════════════════════════════════════════════════════
// LIVRAISON À DOMICILE
// ═══════════════════════════════════════════════════════════

export function createDelivery(
  storeId: string,
  customerId: string,
  items: Array<{ itemId: ShopItemId; qty: number }>,
  address: { x: number; z: number },
): { success: boolean; message: string; deliveryId: string | null } {
  const store = getStore(storeId);
  if (!store) {
    return { success: false, message: "Magasin introuvable.", deliveryId: null };
  }

  const customerData = getPlayerData();
  if (!customerData) {
    return { success: false, message: "Client introuvable.", deliveryId: null };
  }

  let total = 0;
  for (const line of items) {
    const stock = store.stock.find((s) => s.itemId === line.itemId);
    if (!stock || stock.quantity < line.qty) {
      return {
        success: false,
        message: `${line.itemId} indisponible.`,
        deliveryId: null,
      };
    }
    total += stock.retailPrice * line.qty;
  }

  const deliveryFee = 8;
  const grandTotal = total * 1.14975 + deliveryFee;

  if (customerData.cash < grandTotal) {
    return {
      success: false,
      message: `Fonds insuffisants (${grandTotal.toFixed(2)}$ requis).`,
      deliveryId: null,
    };
  }

  removeCash(grandTotal, customerId);

  const delivery: Delivery = {
    id: `del_${Date.now()}`,
    customerId,
    customerName: customerData.name,
    address,
    items,
    total: grandTotal,
    status: "pending",
    driverId: null,
    orderedAt: Date.now(),
    deliveredAt: null,
    tipAmount: 0,
  };

  store.deliveries.push(delivery);
  netEmit("sqdc:delivery_created", { storeId, delivery });

  // Alerte livreurs disponibles
  const livreurs = store.employees.filter(
    (e) => e.role === "livreur" && e.isClockedIn,
  );
  for (const l of livreurs) {
    sendPrivateMessage(
      l.playerId,
      `📦 Nouvelle livraison disponible: ${delivery.customerName}`,
    );
  }

  return {
    success: true,
    message: "Livraison créée. Un livreur sera assigné.",
    deliveryId: delivery.id,
  };
}

export function acceptDelivery(
  storeId: string,
  driverId: string,
  deliveryId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(driverId);
  if (!perms.canDeliver) {
    return { success: false, message: "Vous n'êtes pas livreur." };
  }

  const delivery = store.deliveries.find((d) => d.id === deliveryId);
  if (!delivery) return { success: false, message: "Livraison introuvable." };
  if (delivery.status !== "pending") {
    return { success: false, message: "Déjà assignée." };
  }

  delivery.driverId = driverId;
  delivery.status = "assigned";

  // Ajouter les produits au sac du livreur
  for (const item of delivery.items) {
    addToInventory(item.itemId, item.qty, driverId);
    const stock = store.stock.find((s) => s.itemId === item.itemId)!;
    stock.quantity -= item.qty;
  }

  netEmit("sqdc:delivery_accepted", { storeId, delivery });
  return {
    success: true,
    message: `Livraison acceptée. Rendez-vous à ${delivery.address.x}, ${delivery.address.z}`,
  };
}

export function completeDelivery(
  storeId: string,
  driverId: string,
  deliveryId: string,
  driverCoords: { x: number; z: number },
): { success: boolean; message: string; earnings: number } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", earnings: 0 };

  const delivery = store.deliveries.find((d) => d.id === deliveryId);
  if (!delivery || delivery.driverId !== driverId) {
    return { success: false, message: "Livraison invalide.", earnings: 0 };
  }

  const dist = Math.hypot(
    driverCoords.x - delivery.address.x,
    driverCoords.z - delivery.address.z,
  );
  if (dist > 15) {
    return {
      success: false,
      message: `Trop loin de l'adresse (${dist.toFixed(0)}m).`,
      earnings: 0,
    };
  }

  // Transférer les items au client
  for (const item of delivery.items) {
    removeFromInventory(item.itemId, item.qty, driverId);
    addToInventory(item.itemId, item.qty, delivery.customerId);
  }

  delivery.status = "delivered";
  delivery.deliveredAt = Date.now();

  // Commission livreur (10% + tip)
  const commission = Math.round(delivery.total * 0.10 * 100) / 100;
  const earnings = commission + delivery.tipAmount;
  addCash(earnings, driverId);

  netEmit("sqdc:delivery_completed", { storeId, delivery, earnings });
  sendPrivateMessage(
    delivery.customerId,
    `📦 Votre commande SQDC est livrée! Merci de votre achat.`,
  );

  return {
    success: true,
    message: `Livraison complétée! Vous gagnez ${earnings}$`,
    earnings,
  };
}

// ═══════════════════════════════════════════════════════════
// SÉCURITÉ (agent de sécurité joueur)
// ═══════════════════════════════════════════════════════════

export function banCustomer(
  storeId: string,
  guardId: string,
  customerId: string,
  reason: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(guardId);
  if (!perms.canBanCustomers) {
    return { success: false, message: "Permission refusée." };
  }

  if (!store.bannedCustomers.includes(customerId)) {
    store.bannedCustomers.push(customerId);
  }

  const customerData = getPlayerData();
  const incident: Incident = {
    id: `inc_${Date.now()}`,
    type: "harassment",
    timestamp: Date.now(),
    suspectId: customerId,
    suspectName: customerData?.name ?? "Inconnu",
    reportedBy: guardId,
    description: reason,
    resolved: true,
    policeAlerted: false,
  };
  store.incidents.push(incident);

  sendPrivateMessage(
    customerId,
    `🚫 Vous avez été banni de ${store.name}: ${reason}`,
  );
  netEmit("sqdc:customer_banned", { storeId, customerId, reason });

  return { success: true, message: `${customerData?.name} banni.` };
}

export function reportIncident(
  storeId: string,
  reporterId: string,
  suspectId: string,
  type: Incident["type"],
  description: string,
  alertPolice: boolean,
): void {
  const store = getStore(storeId);
  if (!store) return;

  const suspectData = getPlayerData();
  const incident: Incident = {
    id: `inc_${Date.now()}`,
    type,
    timestamp: Date.now(),
    suspectId,
    suspectName: suspectData?.name ?? "Inconnu",
    reportedBy: reporterId,
    description,
    resolved: false,
    policeAlerted: alertPolice,
  };

  store.incidents.push(incident);

  if (alertPolice) {
    netEmit("police:911_call", {
      caller: reporterId,
      location: store.position,
      type: `SQDC — ${type}`,
      description,
    });
    if (type === "theft" || type === "robbery") {
      addWantedPoints(suspectId, type === "robbery" ? 100 : 40);
    }
  }

  netEmit("sqdc:incident_reported", { storeId, incident });
}

// ═══════════════════════════════════════════════════════════
// CAMÉRAS DE SURVEILLANCE
// ═══════════════════════════════════════════════════════════

export function viewCameras(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; feeds: CameraFeed[] } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", feeds: [] };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canViewCameras) {
    return { success: false, message: "Permission refusée.", feeds: [] };
  }

  for (const cam of store.cameras) {
    if (!cam.viewingPlayers.includes(playerId)) {
      cam.viewingPlayers.push(playerId);
    }
  }

  netEmit("sqdc:cameras_accessed", { storeId, playerId });
  return { success: true, message: "Accès aux caméras.", feeds: store.cameras };
}

// ═══════════════════════════════════════════════════════════
// COFFRE-FORT
// ═══════════════════════════════════════════════════════════

export function depositToSafe(
  storeId: string,
  playerId: string,
  registerId: string,
  amount: number,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canAccessSafe) {
    return { success: false, message: "Permission refusée." };
  }

  const reg = store.registers.find((r) => r.id === registerId);
  if (!reg || reg.cashInside < amount) {
    return { success: false, message: "Montant invalide." };
  }

  reg.cashInside -= amount;
  store.safe.cash += amount;

  netEmit("sqdc:safe_deposit", { storeId, playerId, amount });
  return { success: true, message: `${amount}$ déposés au coffre.` };
}

export function withdrawFromSafe(
  storeId: string,
  playerId: string,
  amount: number,
  combination: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canAccessSafe) {
    return { success: false, message: "Permission refusée." };
  }

  if (combination !== store.safe.combination) {
    reportIncident(
      storeId,
      "system",
      playerId,
      "theft",
      "Tentative d'ouverture du coffre avec mauvaise combinaison.",
      true,
    );
    return { success: false, message: "❌ Mauvaise combinaison. Alarme déclenchée!" };
  }

  if (store.safe.cash < amount) {
    return { success: false, message: "Fonds insuffisants dans le coffre." };
  }

  store.safe.cash -= amount;
  addCash(amount, playerId);

  netEmit("sqdc:safe_withdraw", { storeId, playerId, amount });
  return { success: true, message: `${amount}$ retirés du coffre.` };
}

// ═══════════════════════════════════════════════════════════
// PROMPTS & INTERACTIONS
// ═══════════════════════════════════════════════════════════

export function sqdcPrompt(
  aisle: DepAisleHot | null,
  garment: BoutiqueGarment | null,
  atCaisse: boolean,
  cartN: number,
  hasId: boolean,
  playerId: string,
  storeId: string,
): string | null {
  const store = getStore(storeId);
  if (!store) return null;

  const role = getPlayerRole(playerId);
  const isEmployee = role?.storeId === storeId && role.role !== "client";

  // ── VUE EMPLOYÉ ──
  if (isEmployee) {
    if (atCaisse) {
      const reg = store.registers[0];
      if (!reg.operatedBy) return "E — Ouvrir la caisse";
      if (reg.operatedBy === playerId) return "E — Servir client / F — Quitter caisse";
      return `Caisse tenue par un collègue`;
    }
    if (aisle?.id === "reserve") {
      return "E — Accéder à la réserve";
    }
    if (aisle) {
      const stock = store.stock.filter((s) =>
        aisle.items.includes(s.itemId),
      );
      const lowStock = stock.some((s) => s.quantity <= s.reorderThreshold);
      if (lowStock) return `⚠️ Stock bas · E — Remplir tablette`;
      return `${aisle.label} · E — Gérer stock`;
    }
    return null;
  }

  // ── VUE CLIENT ──
  if (store.bannedCustomers.includes(playerId)) {
    return "🚫 Vous êtes banni de ce magasin.";
  }

  if (!store.isOpen) return "🔴 Magasin FERMÉ";

  if (garment) {
    const item = itemById(garment.itemId);
    if (item) return `E — Au panier · ${item.name} · ${item.price}\u00a0$`;
  }

  if (atCaisse) {
    const reg = store.registers[0];
    if (!reg.operatedBy) return "❌ Aucun caissier disponible";
    if (!hasId) return "Caisse · 21 ans · pièce d'identité requise";
    return cartN > 0
      ? `E — Passer à la caisse · ${cartN} article${cartN > 1 ? "s" : ""}`
      : "Panier vide";
  }

  if (aisle) {
    if (aisle.id === "accueil") {
      return hasId ? "Accueil · identité vérifiée" : "21 ans · présentez une pièce d'identité";
    }
    if (aisle.id === "conseil") return "E — Demander conseil au conseiller";
    if (aisle.id === "reserve") return "🚫 Employés seulement";
    return `E — ${aisle.label} · ${aisle.hint}`;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// CONSTRUCTION 3D DE L'INTÉRIEUR (avec caméras multijoueur)
// ═══════════════════════════════════════════════════════════

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function productCard(id: ShopItemId, x: number, y: number, z: number, rotY = 0) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x1a1c1e });
  const loader = new THREE.TextureLoader();
  loader.load(`/products/${id}.jpg`, (tex) => {
    finishMap(tex, "clamp");
    mat.map = tex;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.46), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  return m;
}

function jar(x: number, y: number, z: number, tint: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.12, 0.22, 10),
    matLib.physicalGlass(tint, 0.92, 0.08),
  );
  body.position.set(x, y, z);
  body.castShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10),
    commerceMat("noirMat"),
  );
  lid.position.set(x, y + 0.13, z);
  g.add(lid);
  return g;
}

function poster(text: string, x: number, y: number, z: number, w = 0.9, h = 0.55, rotY = 0) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1A5632";
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, 256, 160 + (i - (lines.length - 1) / 2) * 52);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

// Caméra de surveillance (visible + fonctionnelle)
function securityCamera(x: number, y: number, z: number, id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `camera_${id}`;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12),
    matLib.get(0x1a1a1a, 0.6),
  );
  base.position.set(x, y, z);
  g.add(base);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.15, 0.04),
    matLib.get(0x2a2a2a, 0.5),
  );
  arm.position.set(x, y - 0.1, z);
  g.add(arm);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    matLib.physicalGlass(0x1a1a2a, 0.7, 0.2),
  );
  dome.position.set(x, y - 0.18, z);
  dome.rotation.x = Math.PI;
  g.add(dome);

  // LED rouge
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.008, 6, 6),
    matLib.getEmissive(0xff0000, 0xff0000, 1.0),
  );
  led.position.set(x + 0.05, y - 0.15, z);
  g.add(led);

  return g;
}

// Écran arrière-boutique (montre les caméras aux employés)
function backOfficeMonitor(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const monitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.55, 0.05),
    matLib.get(0x0a0a0a, 0.6),
  );
  monitor.position.set(x, y, z);
  g.add(monitor);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.48),
    matLib.getEmissive(0x1a1a2a, 0x2a4a6a, 0.4),
  );
  screen.position.set(x, y, z + 0.026);
  g.add(screen);

  return g;
}

export function buildSqdcInterior(storeId?: string) {
  const g = new THREE.Group();
  g.name = "interieur_sqdc";
  const W = 13.4;
  const D = 11.8;
  const H = 3.25;
  const walls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];
  const garments: BoutiqueGarment[] = [];
  const aisles: DepAisleHot[] = [];

  // Sol / plafond / murs
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), commerceMat("beton"));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0xf2efe8, 0.92));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  const wallMat = matLib.get(0xf0ece4, 0.9);
  g.add(box(W, H, 0.22, 0, H / 2, -D / 2, wallMat));
  g.add(box(W, H, 0.22, 0, H / 2, D / 2, wallMat));
  g.add(box(0.22, H, D, -W / 2, H / 2, 0, wallMat));
  g.add(box(0.22, H, D, W / 2, H / 2, 0, wallMat));

  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.14, maxZ: -D / 2 + 0.14 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.14, maxZ: D / 2 + 0.14 });
  walls.push({ minX: -W / 2 - 0.14, maxX: -W / 2 + 0.14, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.14, maxX: W / 2 + 0.14, minZ: -D / 2, maxZ: D / 2 });

  // Bande verte SQDC
  g.add(box(W - 0.3, 0.16, 0.04, 0, 2.42, D / 2 - 0.14, commerceMat("sqdc")));
  g.add(box(W - 0.3, 0.16, 0.04, 0, 2.42, -D / 2 + 0.14, commerceMat("sqdc")));

  // Éclairage
  for (const x of [-4.2, 0, 4.2]) {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.05, 0.22),
      matLib.getEmissive(0xf4f0e0, 0xfff6d8, 0.9),
    );
    tube.position.set(x, H - 0.1, 0);
    g.add(tube);
  }
  g.add(new THREE.PointLight(0xf4f0e4, 2.1, 18, 1.8).clone().translateX(0).translateY(2.75).translateZ(0.2));

  // ── ALLÉE FLEUR ──
  g.add(box(4.8, 1.18, 0.62, -3.55, 0.62, -4.55, commerceMat("boisClair")));
  g.add(box(4.8, 0.04, 0.66, -3.55, 1.24, -4.55, commerceMat("acier")));
  walls.push({ minX: -6.1, maxX: -1.0, minZ: -5.0, maxZ: -4.1 });
  for (let i = 0; i < 6; i++) {
    g.add(jar(-5.4 + i * 0.72, 1.42, -4.42, i % 2 ? 0xa8c8a0 : 0xc8dcc0));
  }
  aisles.push({
    id: "fleur",
    label: "Fleur séchée",
    hint: "Indica, sativa, 3,5 g.",
    x: -3.55,
    z: -3.7,
    items: ["weed", "fleur_indica", "fleur_sativa"],
  });

  // ── HUILES ──
  g.add(box(3.6, 1.22, 0.58, 3.7, 0.64, -4.55, commerceMat("noirMat")));
  const vitrine = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.95), commerceMat("verre"));
  vitrine.position.set(3.7, 1.05, -4.22);
  g.add(vitrine);
  walls.push({ minX: 1.8, maxX: 5.6, minZ: -5.0, maxZ: -4.15 });
  aisles.push({
    id: "huile",
    label: "Huiles",
    hint: "Flacons 30 ml.",
    x: 3.7,
    z: -3.7,
    items: ["huile"],
  });

  // ── PRÉROULÉS ──
  g.add(box(3.8, 1.28, 0.68, -1.4, 0.68, 0.35, commerceMat("noirMat")));
  g.add(box(3.8, 0.03, 0.72, -1.4, 0.48, 0.35, commerceMat("acier")));
  g.add(box(3.8, 0.03, 0.72, -1.4, 0.92, 0.35, commerceMat("acier")));
  g.add(box(3.8, 0.03, 0.72, -1.4, 1.28, 0.35, commerceMat("acier")));
  walls.push({ minX: -3.4, maxX: 0.6, minZ: -0.1, maxZ: 0.8 });
  aisles.push({
    id: "preroll",
    label: "Péroulés",
    hint: "Joints, gélules, hash.",
    x: -1.4,
    z: 1.15,
    items: ["preroll", "gelules", "hash"],
  });

  // ── VAPES ──
  g.add(box(2.6, 1.28, 0.62, 2.55, 0.68, 0.35, commerceMat("noirMat")));
  const vapeGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), commerceMat("verre"));
  vapeGlass.position.set(2.55, 1.05, 0.68);
  g.add(vapeGlass);
  walls.push({ minX: 1.15, maxX: 3.95, minZ: -0.05, maxZ: 0.75 });
  aisles.push({
    id: "vape",
    label: "Vapes",
    hint: "Cartouches, batteries.",
    x: 2.55,
    z: 1.15,
    items: ["vape"],
  });

  // ── CAISSE (interactive multijoueur) ──
  g.add(box(3.4, 1.08, 0.88, 4.15, 0.56, -1.85, commerceMat("boisClair")));
  g.add(box(3.45, 0.05, 0.92, 4.15, 1.12, -1.85, commerceMat("acier")));
  const till = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.2, 0.26),
    matLib.getEmissive(0x1a3a28, 0x3a8a58, 0.75),
  );
  till.position.set(3.55, 1.32, -1.65);
  till.name = "cash_register_1";
  till.userData = { storeId, registerId: "reg_1", interactive: true };
  g.add(till);

  walls.push({ minX: 2.35, maxX: 5.95, minZ: -2.4, maxZ: -1.3 });
  aisles.push({
    id: "caisse",
    label: "Caisse",
    hint: "TPS + TVQ. 21 ans.",
    x: 3.6,
    z: -0.95,
    items: [],
  });

  // ── ACCUEIL ──
  g.add(box(1.15, 1.05, 0.55, -5.35, 0.54, 2.15, commerceMat("boisNaturel")));
  aisles.push({
    id: "accueil",
    label: "Accueil",
    hint: "21 ans · pièce d'identité.",
    x: -4.5,
    z: 2.15,
    items: [],
  });

  // ── CONSEIL ──
  g.add(box(1.6, 0.78, 0.72, 5.35, 0.42, 3.15, commerceMat("boisNaturel")));
  aisles.push({
    id: "conseil",
    label: "Conseiller",
    hint: "Dosage, produits.",
    x: 4.5,
    z: 3.15,
    items: [],
  });

  // ── ARRIÈRE-BOUTIQUE (employés seulement) ──
  const backDoor = box(1.2, 2.4, 0.05, -6.5, 1.2, 4.5, matLib.get(0x3a2a1a, 0.5));
  backDoor.name = "back_door";
  backDoor.userData = { storeId, requiresRole: ["directeur", "gerant", "commis"] };
  g.add(backDoor);

  // Moniteur caméras dans l'arrière-boutique
  g.add(backOfficeMonitor(-6.4, 1.8, 4.3));

  // ── CAMÉRAS DE SURVEILLANCE ──
  const cameras: CameraFeed[] = [
    { id: "cam_entrance", position: { x: 0, y: 3, z: D / 2 - 0.3 }, rotation: { x: -Math.PI / 4, y: Math.PI }, isRecording: true, viewingPlayers: [] },
    { id: "cam_caisse", position: { x: 4.15, y: 3, z: -1.5 }, rotation: { x: -Math.PI / 4, y: 0 }, isRecording: true, viewingPlayers: [] },
    { id: "cam_fleur", position: { x: -3.55, y: 3, z: -3 }, rotation: { x: -Math.PI / 4, y: Math.PI }, isRecording: true, viewingPlayers: [] },
    { id: "cam_vape", position: { x: 2.55, y: 3, z: 1 }, rotation: { x: -Math.PI / 4, y: 0 }, isRecording: true, viewingPlayers: [] },
  ];

  for (const cam of cameras) {
    g.add(securityCamera(cam.position.x, cam.position.y, cam.position.z, cam.id));
  }

  // Posters
  g.add(poster("21 ANS\nET PLUS", -4.6, 2.05, -D / 2 + 0.14, 1.15, 0.7));
  g.add(poster("SQDC", 0, 2.55, D / 2 - 0.14, 1.6, 0.42));
  g.add(poster("CANNABIS\nLÉGAL", 4.4, 2.05, -D / 2 + 0.14, 1.05, 0.7));

  // Products
  const spots: Array<{ id: ShopItemId; x: number; z: number; y?: number; rot?: number }> = [
    { id: "weed", x: -5.4, z: -4.2, y: 1.55 },
    { id: "fleur_indica", x: -3.9, z: -4.2, y: 1.55 },
    { id: "fleur_sativa", x: -2.4, z: -4.2, y: 1.55 },
    { id: "huile", x: 3.2, z: -4.2, y: 1.42 },
    { id: "vape", x: 2.55, z: 0.72, y: 1.22 },
    { id: "preroll", x: -2.4, z: 0.72, y: 1.22 },
    { id: "gelules", x: -1.4, z: 0.72, y: 1.22 },
    { id: "hash", x: -0.4, z: 0.72, y: 1.22 },
  ];
  for (const s of spots) {
    g.add(productCard(s.id, s.x, s.y ?? 1.28, s.z + 0.04, s.rot ?? 0));
    garments.push({ itemId: s.id, x: s.x, z: s.z });
  }

  // Sortie
  const exitPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 2.2, 0.08),
    matLib.getEmissive(QC_PALETTE.sqdcVert, 0x2a6a42, 0.28),
  );
  exitPlate.position.set(0, 1.15, D / 2 - 0.14);
  g.add(exitPlate);

  // Ajouter reserve
  aisles.push({
    id: "reserve",
    label: "Réserve",
    hint: "Employés seulement.",
    x: -6.4,
    z: 4.3,
    items: [],
  });

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, D / 2 - 1.85),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.5),
    walls,
    title: "SQDC",
    subtitle: "21 ans · 10 h – 21 h · cannabis légal",
    garments,
    caisse: { x: 4.15, z: -1.85 },
    aisles,
    cameras,
    interactives: {
      register: { x: 3.55, y: 1.32, z: -1.65, id: "reg_1" },
      backDoor: { x: -6.5, y: 1.2, z: 4.5 },
      safe: { x: -6.4, y: 1.0, z: 4.7 },
    },
  };
}

// ═══════════════════════════════════════════════════════════
// FACTORY : Créer un nouveau magasin
// ═══════════════════════════════════════════════════════════

export function createNewStore(
  ownerId: string,
  ownerName: string,
  name: string,
  address: string,
  city: string,
  position: { x: number; z: number },
): SqdcStore {
  const store: SqdcStore = {
    id: `sqdc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    address,
    city,
    position,
    ownerId,
    isOpen: false,
    openedBy: null,
    openedAt: null,
    employees: [{
      playerId: ownerId,
      playerName: ownerName,
      role: "directeur",
      hourlyRate: 0,
      hoursWorked: 0,
      totalEarned: 0,
      isClockedIn: false,
      clockInTime: null,
      hireDate: Date.now(),
      performanceRating: 100,
      salesCount: 0,
      storeId: "",
    }],
    schedules: [],
    stock: SQDC_AISLES.flatMap((aisle) =>
      aisle.items.map((itemId): SqdcStock => ({
        itemId,
        quantity: 50,
        maxCapacity: 100,
        reorderThreshold: 15,
        wholesalePrice: (itemById(itemId)?.price ?? 20) * 0.6,
        retailPrice: itemById(itemId)?.price ?? 20,
        aisle: aisle.id,
        lastRestock: Date.now(),
        displayShelf: `shelf_${aisle.id}`,
      })),
    ),
    registers: [
      {
        id: "reg_1",
        storeId: "",
        cashInside: 200,
        isOpen: false,
        operatedBy: null,
        todayRevenue: 0,
        todayTransactions: 0,
        position: { x: 3.55, y: 1.32, z: -1.65 },
      },
    ],
    safe: {
      cash: 5000,
      combination: Math.floor(Math.random() * 9000 + 1000).toString(),
    },
    cameras: [],
    todayRevenue: 0,
    todayCustomers: 0,
    weeklyRevenue: 0,
    bannedCustomers: [],
    license: {
      number: `SQDC-${Date.now().toString().slice(-8)}`,
      issuedTo: ownerName,
      expiryDate: Date.now() + 365 * 24 * 3600 * 1000,
      isValid: true,
      suspensions: 0,
      violationsCount: 0,
    },
    bills: [],
    deliveries: [],
    incidents: [],
  };

  // Lier les IDs
  store.employees[0].storeId = store.id;
  store.registers[0].storeId = store.id;

  PLAYER_ROLES.set(ownerId, { storeId: store.id, role: "directeur" });
  registerStore(store);

  return store;
}

// ═══════════════════════════════════════════════════════════
// HELPERS EXPORTÉS
// ═══════════════════════════════════════════════════════════

export function aisleBySqdcId(id: string) {
  return SQDC_AISLES.find((a) => a.id === id) ?? null;
}

export function catalogForSqdcAisle(aisle: string) {
  const spec = aisleBySqdcId(aisle);
  if (!spec || spec.items.length === 0) return [];
  return spec.items.map((id) => itemById(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
}

export function sqdcMapMarks(shops: ShopSpot[]) {
  return shops
    .filter((s) => s.kind === "sqdc")
    .map((s) => ({ id: s.id, name: s.name, x: s.x, z: s.z }));
}

// ═══════════════════════════════════════════════════════════
// ENREGISTREMENT DES REMOTES (RPC multijoueur)
// ═══════════════════════════════════════════════════════════

registerRemote("sqdc:hire", hireEmployee);
registerRemote("sqdc:fire", fireEmployee);
registerRemote("sqdc:clock_in", clockIn);
registerRemote("sqdc:clock_out", clockOut);
registerRemote("sqdc:open_store", openStore);
registerRemote("sqdc:close_store", closeStore);
registerRemote("sqdc:occupy_register", occupyRegister);
registerRemote("sqdc:leave_register", leaveRegister);
registerRemote("sqdc:cashier_respond", cashierRespond);
registerRemote("sqdc:add_to_cart", addToCart);
registerRemote("sqdc:remove_from_cart", removeFromCart);
registerRemote("sqdc:request_checkout", requestCheckout);
registerRemote("sqdc:restock_shelf", restockShelf);
registerRemote("sqdc:order_stock", orderStock);
registerRemote("sqdc:create_delivery", createDelivery);
registerRemote("sqdc:accept_delivery", acceptDelivery);
registerRemote("sqdc:complete_delivery", completeDelivery);
registerRemote("sqdc:ban_customer", banCustomer);
registerRemote("sqdc:report_incident", reportIncident);
registerRemote("sqdc:view_cameras", viewCameras);
registerRemote("sqdc:deposit_safe", depositToSafe);
registerRemote("sqdc:withdraw_safe", withdrawFromSafe);
registerRemote("sqdc:create_store", createNewStore);

export { shopDoorOffset };