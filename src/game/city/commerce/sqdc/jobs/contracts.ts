/**
 * TROXTWORLD — Contrats SQDC (embauche, licenciement, promotion, salaire)
 */
import { netEmit } from "../../../net";
import { transferMoney } from "../../../banking";
import { sendPrivateMessage, sendChatMessage } from "../../../chat";
import { ROLE_RANK, ROLE_META, type SqdcRole, type RoleMeta } from "./roles";
import { clampRate, MIN_HOURLY_WAGE_QC, MAX_HOURLY_RATE } from "./payroll";
import {
  getEmployee, createEmployeeRecord, removeEmployeeRecord,
  getPlayerRole, setPlayerRole, clearPlayerRole, updateEmployeeRole, updateEmployeeRate,
} from "./jobs";

export interface SalaryReview {
  id: string;
  playerId: string;
  reviewedBy: string;
  oldRate: number;
  newRate: number;
  reason: string;
  timestamp: number;
}

const REVIEWS: SalaryReview[] = [];

export function hireEmployee(
  storeId: string,
  hiringPlayerId: string,
  targetId: string,
  targetName: string,
  role: SqdcRole,
  hourlyRate: number,
): { success: boolean; message: string } {
  if (hourlyRate < MIN_HOURLY_WAGE_QC) {
    return { success: false, message: `Salaire minimum QC : ${MIN_HOURLY_WAGE_QC}$/h` };
  }
  if (hourlyRate > MAX_HOURLY_RATE) {
    return { success: false, message: `Salaire maximum : ${MAX_HOURLY_RATE}$/h` };
  }
  if (getEmployee(storeId, targetId)) {
    return { success: false, message: "Déjà employé dans cette succursale." };
  }
  if (getPlayerRole(targetId)) {
    return { success: false, message: "Ce joueur travaille déjà à la SQDC." };
  }

  const emp = createEmployeeRecord(storeId, targetId, targetName, role, hourlyRate);
  if (!emp) return { success: false, message: "Erreur création employé." };

  setPlayerRole(targetId, storeId, role);

  netEmit("sqdc:hired", {
    storeId, playerId: targetId, role, hourlyRate,
    playerName: targetName, hiredBy: hiringPlayerId,
  });
  sendPrivateMessage(targetId, `🎉 Contrat signé · ${ROLE_META[role].label} · ${hourlyRate}$/h`);
  sendChatMessage(`👤 ${targetName} rejoint la SQDC en tant que ${ROLE_META[role].label}.`);

  return { success: true, message: `${targetName} embauché.` };
}

export function fireEmployee(
  storeId: string,
  firingPlayerId: string,
  targetId: string,
  reason = "",
): { success: boolean; message: string; severance: number } {
  const emp = getEmployee(storeId, targetId);
  if (!emp) return { success: false, message: "Employé introuvable.", severance: 0 };

  let severance = 0;
  if (emp.isClockedIn && emp.clockInTime) {
    const hours = (Date.now() - emp.clockInTime) / 3600000;
    severance = Math.round(hours * emp.hourlyRate * 100) / 100;
    transferMoney(firingPlayerId, targetId, severance);
  }

  removeEmployeeRecord(storeId, targetId);
  clearPlayerRole(targetId);

  netEmit("sqdc:fired", { storeId, playerId: targetId, reason, firedBy: firingPlayerId });
  sendPrivateMessage(targetId, `❌ Contrat révoqué.${reason ? ` Motif : ${reason}` : ""} · Indemnité : ${severance}$`);
  sendChatMessage(`🚪 ${emp.playerName} a quitté la SQDC.`);

  return { success: true, message: `${emp.playerName} licencié.`, severance };
}

export function resign(storeId: string, playerId: string, notice = ""): { success: boolean; message: string } {
  const emp = getEmployee(storeId, playerId);
  if (!emp) return { success: false, message: "Vous n'êtes pas employé ici." };

  removeEmployeeRecord(storeId, playerId);
  clearPlayerRole(playerId);

  netEmit("sqdc:resigned", { storeId, playerId, notice });
  sendChatMessage(`👋 ${emp.playerName} a démissionné.${notice ? ` (« ${notice} »)` : ""}`);

  return { success: true, message: "Démission enregistrée." };
}

export function promoteEmployee(
  storeId: string,
  promoterId: string,
  targetId: string,
  newRole: SqdcRole,
  newRate?: number,
): { success: boolean; message: string } {
  const emp = getEmployee(storeId, targetId);
  if (!emp) return { success: false, message: "Employé introuvable." };

  const promoter = getEmployee(storeId, promoterId);
  if (promoter) {
    const canPromote = ROLE_META[promoter.role].canPromoteTo.includes(newRole);
    if (!canPromote) {
      return { success: false, message: `${ROLE_META[promoter.role].label} ne peut pas promouvoir vers ${ROLE_META[newRole].label}.` };
    }
  }

  const oldRole = emp.role;
  updateEmployeeRole(storeId, targetId, newRole);
  if (newRate !== undefined) updateEmployeeRate(storeId, targetId, clampRate(newRate));

  const roleReg = getPlayerRole(targetId);
  if (roleReg) roleReg.role = newRole;

  netEmit("sqdc:promoted", { storeId, playerId: targetId, oldRole, newRole, newRate, promoterId });
  sendPrivateMessage(targetId, `🎖️ Promotion · ${ROLE_META[oldRole].label} → ${ROLE_META[newRole].label}`);
  sendChatMessage(`🎖️ ${emp.playerName} est promu ${ROLE_META[newRole].label} !`);

  return { success: true, message: "Promotion effectuée." };
}

export function adjustSalary(
  storeId: string,
  managerId: string,
  targetId: string,
  newRate: number,
  reason: string,
): { success: boolean; message: string } {
  const emp = getEmployee(storeId, targetId);
  if (!emp) return { success: false, message: "Employé introuvable." };
  if (newRate < MIN_HOURLY_WAGE_QC || newRate > MAX_HOURLY_RATE) {
    return { success: false, message: `Taux hors limites.` };
  }

  const oldRate = emp.hourlyRate;
  updateEmployeeRate(storeId, targetId, newRate);

  REVIEWS.push({
    id: `rev_${Date.now()}`,
    playerId: targetId,
    reviewedBy: managerId,
    oldRate,
    newRate,
    reason,
    timestamp: Date.now(),
  });

  netEmit("sqdc:salary_adjusted", { storeId, playerId: targetId, oldRate, newRate, reason });
  sendPrivateMessage(targetId, `💵 Nouveau taux : ${newRate}$/h (avant ${oldRate}$/h) · ${reason}`);

  return { success: true, message: `Salaire ajusté : ${oldRate}$ → ${newRate}$.` };
}

export function getSalaryHistory(playerId: string): SalaryReview[] {
  return REVIEWS.filter((r) => r.playerId === playerId);
}

export function clearReviews(): void {
  REVIEWS.length = 0;
}