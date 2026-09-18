/**
 * TROXTWORLD — Pointage SQDC (clock in / out + feuilles de temps)
 */
import { netEmit } from "../../../net";
import { transferMoney } from "../../../banking";
import { sendPrivateMessage } from "../../../chat";
import { getEmployee, registerTimesheet, closeTimesheet, setEmployeeClocked } from "./jobs";
import { calculatePay, formatPay } from "./payroll";

export interface Timesheet {
  id: string;
  playerId: string;
  storeId: string;
  clockIn: number;
  clockOut: number | null;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
  netPay: number;
  status: "open" | "closed" | "paid" | "disputed";
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clockIn(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; timesheetId: string | null } {
  const emp = getEmployee(storeId, playerId);
  if (!emp) return { success: false, message: "Pas de contrat actif.", timesheetId: null };
  if (emp.isClockedIn) return { success: false, message: "Déjà en service.", timesheetId: null };

  const id = genId("ts");
  const ts: Timesheet = {
    id,
    playerId,
    storeId,
    clockIn: Date.now(),
    clockOut: null,
    hoursWorked: 0,
    hourlyRate: emp.hourlyRate,
    grossPay: 0,
    netPay: 0,
    status: "open",
  };

  setEmployeeClocked(storeId, playerId, true, ts.clockIn);
  registerTimesheet(ts);

  netEmit("sqdc:clock_in", { storeId, playerId, timesheetId: id, timestamp: ts.clockIn });
  sendPrivateMessage(playerId, `⏱️ Prise de service — ${new Date().toLocaleTimeString("fr-CA")}`);

  return { success: true, message: "Bon quart de travail !", timesheetId: id };
}

export function clockOut(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; earned: number; hours: number } {
  const emp = getEmployee(storeId, playerId);
  if (!emp || !emp.isClockedIn || !emp.clockInTime) {
    return { success: false, message: "Pas en service.", earned: 0, hours: 0 };
  }

  const now = Date.now();
  const hours = (now - emp.clockInTime) / 3600000;
  const clockOutHour = new Date().getHours();

  const pay = calculatePay(hours, emp.hourlyRate, emp.salesRevenue, clockOutHour);

  setEmployeeClocked(storeId, playerId, false, null);
  closeTimesheet(playerId, now, hours, pay.grossPay, pay.netPay);
  resetEmployeeSales(storeId, playerId);

  /* Transfert du salaire net depuis le compte propriétaire */
  transferMoney(storeId, playerId, pay.netPay);

  netEmit("sqdc:clock_out", {
    storeId, playerId, hours, netPay: pay.netPay,
    commission: pay.commission, breakdown: pay,
  });

  sendPrivateMessage(playerId, `💰 Quart terminé — ${formatPay(pay)}`);

  return {
    success: true,
    message: `Fin de quart. ${pay.netPay.toFixed(2)}$ virés.`,
    earned: pay.netPay,
    hours,
  };
}

export function getTimeSinceClockIn(storeId: string, playerId: string): number {
  const emp = getEmployee(storeId, playerId);
  if (!emp?.isClockedIn || !emp.clockInTime) return 0;
  return Math.floor((Date.now() - emp.clockInTime) / 60000);
}

/* ─── Hooks vers jobs.ts (évite les imports circulaires) ─── */
function resetEmployeeSales(storeId: string, playerId: string): void {
  const emp = getEmployee(storeId, playerId);
  if (emp) emp.salesRevenue = 0;
}