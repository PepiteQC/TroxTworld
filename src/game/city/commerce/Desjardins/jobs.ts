/**
 * 🏦 JOBS — Emplois à la Caisse Desjardins
 */
import { BANKING_CONSTANTS as C, uid } from "./config";
import type { BankEmployee, BankRole, BankBranch } from "./types";
import { BRANCHES } from "./banking";

// ═══════════════════════════════════════════════════════════
// PERMISSIONS PAR RÔLE
// ═══════════════════════════════════════════════════════════

export interface CaissePermissions {
  canOperateTeller: boolean;
  canApproveLoans: boolean;
  canApproveMortgages: boolean;
  canAccessVault: boolean;
  canViewCameras: boolean;
  canHireEmployees: boolean;
  canFireEmployees: boolean;
  canSetHours: boolean;
  canOpenAccounts: boolean;
  canCloseAccounts: boolean;
  canFreezeAccounts: boolean;
  canOrderCash: boolean;
  canTriggerAlarm: boolean;
  canDisableAlarm: boolean;
  canAccessManagerOffice: boolean;
}

const FULL_PERMS: CaissePermissions = {
  canOperateTeller: true, canApproveLoans: true, canApproveMortgages: true,
  canAccessVault: true, canViewCameras: true, canHireEmployees: true,
  canFireEmployees: true, canSetHours: true, canOpenAccounts: true,
  canCloseAccounts: true, canFreezeAccounts: true, canOrderCash: true,
  canTriggerAlarm: true, canDisableAlarm: true, canAccessManagerOffice: true,
};

export const CAISSE_ROLE_PERMS: Record<BankRole, CaissePermissions> = {
  directeur: { ...FULL_PERMS },
  directeur_adjoint: {
    ...FULL_PERMS,
    canFireEmployees: false,
    canSetHours: false,
  },
  conseiller_financier: {
    canOperateTeller: false, canApproveLoans: true, canApproveMortgages: false,
    canAccessVault: false, canViewCameras: false, canHireEmployees: false,
    canFireEmployees: false, canSetHours: false, canOpenAccounts: true,
    canCloseAccounts: false, canFreezeAccounts: false, canOrderCash: false,
    canTriggerAlarm: true, canDisableAlarm: false, canAccessManagerOffice: false,
  },
  specialiste_hypotheque: {
    canOperateTeller: false, canApproveLoans: false, canApproveMortgages: true,
    canAccessVault: false, canViewCameras: false, canHireEmployees: false,
    canFireEmployees: false, canSetHours: false, canOpenAccounts: false,
    canCloseAccounts: false, canFreezeAccounts: false, canOrderCash: false,
    canTriggerAlarm: true, canDisableAlarm: false, canAccessManagerOffice: false,
  },
  conseiller: {
    canOperateTeller: false, canApproveLoans: true, canApproveMortgages: false,
    canAccessVault: false, canViewCameras: false, canHireEmployees: false,
    canFireEmployees: false, canSetHours: false, canOpenAccounts: true,
    canCloseAccounts: false, canFreezeAccounts: false, canOrderCash: false,
    canTriggerAlarm: true, canDisableAlarm: false, canAccessManagerOffice: false,
  },
  conseiller_placement: {
    canOperateTeller: false, canApproveLoans: false, canApproveMortgages: false,
    canAccessVault: false, canViewCameras: false, canHireEmployees: false,
    canFireEmployees: false, canSetHours: false, canOpenAccounts: true,
    canCloseAccounts: false, canFreezeAccounts: false, canOrderCash: false,
    canTriggerAlarm: true, canDisableAlarm: false, canAccessManagerOffice: false,
  },
  caissier: {
    canOperateTeller: true, canApproveLoans: false, canApproveMortgages: false,
    canAccessVault: false, canViewCameras: false, canHireEmployees: false,
    canFireEmployees: false, canSetHours: false, canOpenAccounts: false,
    canCloseAccounts: false, canFreezeAccounts: false, canOrderCash: false,
    canTriggerAlarm: true, canDisableAlarm: false, canAccessManagerOffice: false,
  },
  agent_securite: {
    canOperateTeller: false, canApproveLoans: false, canApproveMortgages: false,
    canAccessVault: true, canViewCameras: true, canHireEmployees: false,
    canFireEmployees: false, canSetHours: false, canOpenAccounts: false,
    canCloseAccounts: false, canFreezeAccounts: false, canOrderCash: false,
    canTriggerAlarm: true, canDisableAlarm: true, canAccessManagerOffice: false,
  },
  client: {
    canOperateTeller: false, canApproveLoans: false, canApproveMortgages: false,
    canAccessVault: false, canViewCameras: false, canHireEmployees: false,
    canFireEmployees: false, canSetHours: false, canOpenAccounts: false,
    canCloseAccounts: false, canFreezeAccounts: false, canOrderCash: false,
    canTriggerAlarm: false, canDisableAlarm: false, canAccessManagerOffice: false,
  },
};

// ═══════════════════════════════════════════════════════════
// RÔLES PAR JOUEUR
// ═══════════════════════════════════════════════════════════

const PLAYER_CAISSE_ROLES = new Map<string, { branchId: string; role: BankRole }>();

export function getPlayerCaisseRole(playerId: string) {
  return PLAYER_CAISSE_ROLES.get(playerId) ?? null;
}

export function getCaissePermissions(playerId: string): CaissePermissions {
  const role = getPlayerCaisseRole(playerId);
  if (!role) return CAISSE_ROLE_PERMS.client;
  return CAISSE_ROLE_PERMS[role.role];
}

// ═══════════════════════════════════════════════════════════
// EMBAUCHE / CONGÉDIEMENT
// ═══════════════════════════════════════════════════════════

export function hireCaisseEmployee(
  branchId: string,
  hiringPlayerId: string,
  targetPlayerId: string,
  targetPlayerName: string,
  role: BankRole,
  hourlyRate: number,
): { ok: boolean; message: string } {
  const branch = BRANCHES.get(branchId);
  if (!branch) return { ok: false, message: "Succursale introuvable." };

  const perms = getCaissePermissions(hiringPlayerId);
  if (!perms.canHireEmployees) {
    return { ok: false, message: "Permission d'embauche refusée." };
  }

  if (hourlyRate < C.MIN_BANK_WAGE) {
    return {
      ok: false,
      message: `Salaire minimum bancaire: ${C.MIN_BANK_WAGE}$/h`,
    };
  }

  if (role === "directeur" && branch.employees.some((e) => e.role === "directeur")) {
    return { ok: false, message: "Un seul directeur par succursale." };
  }

  if (branch.employees.some((e) => e.playerId === targetPlayerId)) {
    return { ok: false, message: "Déjà employé ici." };
  }

  const employee: BankEmployee = {
    playerId: targetPlayerId,
    playerName: targetPlayerName,
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
  };

  branch.employees.push(employee);
  PLAYER_CAISSE_ROLES.set(targetPlayerId, { branchId, role });

  return { ok: true, message: `${targetPlayerName} embauché comme ${role}.` };
}

export function fireCaisseEmployee(
  branchId: string,
  firingPlayerId: string,
  targetPlayerId: string,
): { ok: boolean; message: string } {
  const branch = BRANCHES.get(branchId);
  if (!branch) return { ok: false, message: "Succursale introuvable." };

  const perms = getCaissePermissions(firingPlayerId);
  if (!perms.canFireEmployees) return { ok: false, message: "Permission refusée." };

  const idx = branch.employees.findIndex((e) => e.playerId === targetPlayerId);
  if (idx === -1) return { ok: false, message: "Employé introuvable." };

  branch.employees.splice(idx, 1);
  PLAYER_CAISSE_ROLES.delete(targetPlayerId);

  return { ok: true, message: "Employé congédié." };
}

// ═══════════════════════════════════════════════════════════
// PUNCH IN / OUT
// ═══════════════════════════════════════════════════════════

export function clockInCaisse(
  branchId: string,
  playerId: string,
): { ok: boolean; message: string } {
  const branch = BRANCHES.get(branchId);
  if (!branch) return { ok: false, message: "Succursale introuvable." };

  const emp = branch.employees.find((e) => e.playerId === playerId);
  if (!emp) return { ok: false, message: "Vous n'êtes pas employé." };
  if (emp.isClockedIn) return { ok: false, message: "Déjà pointé." };

  emp.isClockedIn = true;
  emp.clockInTime = Date.now();

  return { ok: true, message: `Punché à ${new Date().toLocaleTimeString()}` };
}

export function clockOutCaisse(
  branchId: string,
  playerId: string,
): { ok: boolean; message: string; earnings: number } {
  const branch = BRANCHES.get(branchId);
  if (!branch) return { ok: false, message: "Succursale introuvable.", earnings: 0 };

  const emp = branch.employees.find((e) => e.playerId === playerId);
  if (!emp || !emp.isClockedIn || !emp.clockInTime) {
    return { ok: false, message: "Pas pointé.", earnings: 0 };
  }

  const hours = (Date.now() - emp.clockInTime) / 3600000;
  const earnings = Math.round(hours * emp.hourlyRate * 100) / 100;

  emp.hoursWorked += hours;
  emp.totalEarned += earnings;
  emp.isClockedIn = false;
  emp.clockInTime = null;

  return {
    ok: true,
    message: `Punché out. ${hours.toFixed(2)}h · ${earnings}$ payés.`,
    earnings,
  };
}