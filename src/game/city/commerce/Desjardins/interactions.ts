/**
 * 🏦 INTERACTIONS — Guichets, voûte, GAB, coffrets de sûreté
 */
import {
  BANKING_CONSTANTS as C,
  uid, round2, clamp,
} from "./config";
import type {
  Teller, QueueTicket, Appointment, CaisseVault,
  SafetyDeposit, BankRole, Atm,
} from "./types";
import {
  deposit, withdraw, ATMS, BRANCHES, VAULTS,
} from "./banking";
import { getPlayerCaisseRole, getCaissePermissions } from "./jobs";

// ═══════════════════════════════════════════════════════════
// REGISTRES
// ═══════════════════════════════════════════════════════════

export const TELLERS = new Map<string, Teller>();
export const QUEUE_TICKETS = new Map<string, QueueTicket>();
export const APPOINTMENTS = new Map<string, Appointment>();
export const VAULTS_MAP = new Map<string, CaisseVault>();
export const ALARMS = new Map<string, import("./types").AlarmSystem>();

let queueCounter = 100;

// ═══════════════════════════════════════════════════════════
// GUICHETS
// ═══════════════════════════════════════════════════════════

export function occupyTeller(
  branchId: string,
  tellerId: string,
  playerId: string,
): { ok: boolean; message: string } {
  const teller = TELLERS.get(tellerId);
  if (!teller) return { ok: false, message: "Guichet introuvable." };
  if (teller.operatedBy && teller.operatedBy !== playerId) {
    return { ok: false, message: "Guichet occupé par un collègue." };
  }

  const perms = getCaissePermissions(playerId);
  if (!perms.canOperateTeller) return { ok: false, message: "Vous n'êtes pas caissier." };

  teller.operatedBy = playerId;
  teller.isOpen = true;
  return { ok: true, message: "Guichet ouvert. Prêt à servir." };
}

export function leaveTeller(
  tellerId: string,
  playerId: string,
): { ok: boolean; message: string } {
  const teller = TELLERS.get(tellerId);
  if (!teller) return { ok: false, message: "Guichet introuvable." };
  if (teller.operatedBy !== playerId) return { ok: false, message: "Pas votre guichet." };

  teller.operatedBy = null;
  teller.isOpen = false;
  teller.currentCustomerId = null;
  return { ok: true, message: "Guichet fermé." };
}

export function processTellerTransaction(
  tellerId: string,
  transaction: {
    type: "deposit" | "withdrawal";
    amount: number;
    accountId: string;
    cashierId: string;
    customerId: string;
  },
): { ok: boolean; message: string } {
  const teller = TELLERS.get(tellerId);
  if (!teller) return { ok: false, message: "Guichet introuvable." };
  if (teller.operatedBy !== transaction.cashierId) {
    return { ok: false, message: "Pas votre guichet." };
  }

  let result;
  switch (transaction.type) {
    case "deposit":
      result = deposit(transaction.accountId, transaction.amount, null, "cash");
      if (result.ok) teller.cashDrawer += transaction.amount;
      break;
    case "withdrawal":
      if (teller.cashDrawer < transaction.amount) {
        return { ok: false, message: "Pas assez de cash au guichet — voûte requise." };
      }
      result = withdraw(transaction.accountId, transaction.amount, null);
      if (result.ok) teller.cashDrawer -= transaction.amount;
      break;
    default:
      return { ok: false, message: "Type non supporté." };
  }

  if (!result.ok) return result;

  teller.totalTransactionsToday++;
  teller.totalRevenueToday += transaction.amount;

  return { ok: true, message: result.message };
}

// ═══════════════════════════════════════════════════════════
// FILES D'ATTENTE
// ═══════════════════════════════════════════════════════════

export function takeTicket(
  branchId: string,
  playerId: string,
  playerName: string,
  service: QueueTicket["service"],
): { ok: boolean; message: string; ticket: QueueTicket | null } {
  const branch = BRANCHES.get(branchId);
  if (!branch) return { ok: false, message: "Succursale introuvable.", ticket: null };
  if (!branch.isOpen) return { ok: false, message: "Succursale fermée.", ticket: null };

  const existing = Array.from(QUEUE_TICKETS.values()).find(
    (t) => t.playerId === playerId && t.status === "waiting",
  );
  if (existing) {
    return {
      ok: false,
      message: `Vous êtes déjà en file: ${existing.ticketNumber}`,
      ticket: existing,
    };
  }

  const ticket: QueueTicket = {
    ticketId: uid("tkt"),
    ticketNumber: queueCounter++,
    playerId,
    playerName,
    branchId,
    service,
    requestedAt: Date.now(),
    calledAt: null,
    servedBy: null,
    status: "waiting",
  };

  QUEUE_TICKETS.set(ticket.ticketId, ticket);
  return { ok: true, message: `Ticket #${ticket.ticketNumber} pris.`, ticket };
}

export function callNextTicket(
  branchId: string,
  employeePlayerId: string,
  tellerId: string,
): { ok: boolean; message: string; ticket: QueueTicket | null } {
  const perms = getCaissePermissions(employeePlayerId);
  if (!perms.canOperateTeller) return { ok: false, message: "Permission refusée.", ticket: null };

  const role = getPlayerCaisseRole(employeePlayerId);
  if (!role) return { ok: false, message: "Non employé.", ticket: null };

  const eligibleServices: QueueTicket["service"][] =
    role.role === "caissier" ? ["caissier"]
    : role.role === "conseiller_financier" ? ["conseiller", "ouverture_compte"]
    : role.role === "specialiste_hypotheque" ? ["hypotheque"]
    : ["caissier", "conseiller", "hypotheque", "ouverture_compte"];

  const nextTicket = Array.from(QUEUE_TICKETS.values())
    .filter((t) => t.branchId === branchId && t.status === "waiting" && eligibleServices.includes(t.service))
    .sort((a, b) => a.ticketNumber - b.ticketNumber)[0];

  if (!nextTicket) return { ok: false, message: "Aucun client en attente.", ticket: null };

  nextTicket.status = "called";
  nextTicket.calledAt = Date.now();
  nextTicket.servedBy = employeePlayerId;

  const teller = TELLERS.get(tellerId);
  if (teller) teller.currentCustomerId = nextTicket.playerId;

  return { ok: true, message: `Client #${nextTicket.ticketNumber} appelé.`, ticket: nextTicket };
}

export function completeTicketService(
  ticketId: string,
  employeeId: string,
): { ok: boolean; message: string } {
  const ticket = QUEUE_TICKETS.get(ticketId);
  if (!ticket) return { ok: false, message: "Ticket introuvable." };
  if (ticket.servedBy !== employeeId) return { ok: false, message: "Pas votre client." };

  ticket.status = "completed";

  const branch = BRANCHES.get(ticket.branchId);
  if (branch) {
    const emp = branch.employees.find((e) => e.playerId === employeeId);
    if (emp) emp.performanceRating = Math.min(100, emp.performanceRating + 0.5);
  }

  return { ok: true, message: "Service complété." };
}

export function getQueueForBranch(branchId: string): QueueTicket[] {
  return Array.from(QUEUE_TICKETS.values())
    .filter((t) => t.branchId === branchId && (t.status === "waiting" || t.status === "called"))
    .sort((a, b) => a.ticketNumber - b.ticketNumber);
}

// ═══════════════════════════════════════════════════════════
// VOÛTE
// ═══════════════════════════════════════════════════════════

export function createVault(branchId: string): CaisseVault {
  const vault: CaisseVault = {
    id: uid("vault"),
    branchId,
    combination: Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join(""),
    cash: 500_000,
    gold: 0,
    safetyDeposits: [],
    isOpen: false,
    openedBy: null,
    openedAt: null,
    lastAuditDate: Date.now(),
    requiredRoles: ["directeur", "directeur_adjoint", "agent_securite"],
    timeLockUntil: null,
    attempts: [],
  };
  VAULTS_MAP.set(vault.id, vault);
  return vault;
}

export function openVault(
  vaultId: string,
  playerId: string,
  combination: string,
): { ok: boolean; message: string; contents?: { cash: number; gold: number } } {
  const vault = VAULTS_MAP.get(vaultId);
  if (!vault) return { ok: false, message: "Voûte introuvable." };

  if (vault.timeLockUntil && Date.now() < vault.timeLockUntil) {
    const min = Math.ceil((vault.timeLockUntil - Date.now()) / 60000);
    return { ok: false, message: `🔒 Time-lock actif encore ${min} min.` };
  }

  const role = getPlayerCaisseRole(playerId);
  if (!role || !vault.requiredRoles.includes(role.role)) {
    return { ok: false, message: "🚫 Rôle non autorisé." };
  }

  vault.attempts.push({
    playerId,
    timestamp: Date.now(),
    combinationTried: combination,
    success: false,
  });

  if (combination !== vault.combination) {
    const recentFails = vault.attempts
      .filter((a) => !a.success && Date.now() - a.timestamp < 300000)
      .length;

    if (recentFails >= C.VAULT_MAX_ATTEMPTS) {
      vault.timeLockUntil = Date.now() + C.VAULT_TIME_LOCK_MINUTES * 60000;
      return {
        ok: false,
        message: `🚨 Trop de tentatives! Time-lock ${C.VAULT_TIME_LOCK_MINUTES} min.`,
      };
    }

    return { ok: false, message: `❌ Combinaison incorrecte (${C.VAULT_MAX_ATTEMPTS - recentFails} essais restants)` };
  }

  vault.attempts[vault.attempts.length - 1].success = true;
  vault.isOpen = true;
  vault.openedBy = playerId;
  vault.openedAt = Date.now();

  return {
    ok: true,
    message: "🔓 Voûte ouverte.",
    contents: { cash: vault.cash, gold: vault.gold },
  };
}

export function closeVault(vaultId: string, playerId: string): { ok: boolean; message: string } {
  const vault = VAULTS_MAP.get(vaultId);
  if (!vault) return { ok: false, message: "Voûte introuvable." };
  if (vault.openedBy !== playerId) return { ok: false, message: "Vous ne l'avez pas ouverte." };

  vault.isOpen = false;
  vault.openedBy = null;
  vault.openedAt = null;
  return { ok: true, message: "Voûte fermée." };
}

export function transferCashVaultToTeller(
  vaultId: string,
  tellerId: string,
  playerId: string,
  amount: number,
): { ok: boolean; message: string } {
  const vault = VAULTS_MAP.get(vaultId);
  const teller = TELLERS.get(tellerId);
  if (!vault || !teller) return { ok: false, message: "Vault ou teller introuvable." };
  if (!vault.isOpen) return { ok: false, message: "Voûte fermée." };
  if (vault.openedBy !== playerId) return { ok: false, message: "Vous n'êtes pas autorisé." };
  if (vault.cash < amount) return { ok: false, message: "Voûte vide." };

  vault.cash -= amount;
  teller.cashDrawer += amount;
  return { ok: true, message: `${amount}$ transférés au guichet.` };
}

// ═══════════════════════════════════════════════════════════
// COFFRETS DE SÛRETÉ
// ═══════════════════════════════════════════════════════════

export function rentSafetyDeposit(
  vaultId: string,
  clientId: string,
  clientName: string,
  monthsPaid: number,
): { ok: boolean; message: string; box: SafetyDeposit | null } {
  const vault = VAULTS_MAP.get(vaultId);
  if (!vault) return { ok: false, message: "Voûte introuvable.", box: null };

  const rentalFee = 50;
  const totalCost = rentalFee * monthsPaid;

  const box: SafetyDeposit = {
    boxId: uid("box"),
    ownerId: clientId,
    ownerName: clientName,
    contents: [],
    cash: 0,
    rentalFee,
    paidUntil: Date.now() + monthsPaid * 30 * 24 * 3600 * 1000,
  };

  vault.safetyDeposits.push(box);
  return { ok: true, message: `Coffret loué ${monthsPaid} mois (${totalCost}$).`, box };
}

export function accessSafetyDeposit(
  vaultId: string,
  boxId: string,
  playerId: string,
): { ok: boolean; message: string; contents: SafetyDeposit | null } {
  const vault = VAULTS_MAP.get(vaultId);
  if (!vault || !vault.isOpen) {
    return { ok: false, message: "Voûte fermée.", contents: null };
  }

  const box = vault.safetyDeposits.find((b) => b.boxId === boxId);
  if (!box) return { ok: false, message: "Coffret introuvable.", contents: null };
  if (box.ownerId !== playerId) return { ok: false, message: "Pas votre coffret.", contents: null };

  return { ok: true, message: "Coffret ouvert.", contents: box };
}