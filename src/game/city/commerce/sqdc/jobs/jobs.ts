/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TROXTWORLD — SQDC Jobs Engine (v5.0)
 * ───────────────────────────────────────────────────────────────────────────
 * Ce fichier centralise :
 *   • Le registre des employés (Map storeId:playerId → SqdcEmployee)
 *   • Le registre des rôles par joueur (playerId → { storeId, role })
 *   • Les feuilles de temps (timesheets)
 *   • La synchronisation réseau (netOn / netEmit)
 *   • Les hooks bas niveau utilisés par les modules satellites
 *
 * Les modules satellites (applications, contracts, timeclock, ...) 
 * importent d'ici et exposent leur logique métier.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { netOn, netEmit } from "../../../net";
import { ROLE_PERMISSIONS, type SqdcPermissions } from "./permissions";
import type { SqdcRole } from "./roles";
import type { Timesheet } from "./timeclock";
import type { Certification } from "./certifications";

/* ═══════════════ TYPES ═══════════════ */

export interface SqdcEmployee {
  playerId: string;
  playerName: string;
  role: SqdcRole;
  hourlyRate: number;
  hoursWorked: number;
  totalEarned: number;
  isClockedIn: boolean;
  clockInTime: number | null;
  hireDate: number;
  performanceRating: number; // 0-100
  salesCount: number;
  salesRevenue: number;
  strikes: number;
  storeId: string;
  certifications: Set<Certification>;
  notes: string[];
}

interface PlayerRoleEntry {
  storeId: string;
  role: SqdcRole;
}

/* ═══════════════ REGISTRE ═══════════════ */

const EMPLOYEES = new Map<string, SqdcEmployee>();
const PLAYER_ROLES = new Map<string, PlayerRoleEntry>();
const TIMESHEETS = new Map<string, Timesheet>();        // timesheetId → Timesheet
const OPEN_TIMESHEETS = new Map<string, string>();      // playerId → timesheetId

function empKey(storeId: string, playerId: string) {
  return `${storeId}:${playerId}`;
}

/* ═══════════════ ACCESSEURS ═══════════════ */

export function getEmployee(storeId: string, playerId: string): SqdcEmployee | null {
  return EMPLOYEES.get(empKey(storeId, playerId)) ?? null;
}

export function getPlayerRole(playerId: string): PlayerRoleEntry | null {
  return PLAYER_ROLES.get(playerId) ?? null;
}

export function getPlayerPermissions(playerId: string): SqdcPermissions {
  const r = getPlayerRole(playerId);
  if (!r) return ROLE_PERMISSIONS.client;
  return ROLE_PERMISSIONS[r.role];
}

export function getAllEmployees(storeId: string): SqdcEmployee[] {
  const out: SqdcEmployee[] = [];
  EMPLOYEES.forEach((e) => { if (e.storeId === storeId) out.push(e); });
  return out;
}

export function getEmployeesOnDuty(storeId: string): SqdcEmployee[] {
  return getAllEmployees(storeId).filter((e) => e.isClockedIn);
}

/* ═══════════════ MUTATIONS BAS NIVEAU ═══════════════ */

export function createEmployeeRecord(
  storeId: string,
  playerId: string,
  playerName: string,
  role: SqdcRole,
  hourlyRate: number,
): SqdcEmployee | null {
  if (EMPLOYEES.has(empKey(storeId, playerId))) return null;

  const emp: SqdcEmployee = {
    playerId,
    playerName,
    role,
    hourlyRate,
    hoursWorked: 0,
    totalEarned: 0,
    isClockedIn: false,
    clockInTime: null,
    hireDate: Date.now(),
    performanceRating: 50,
    salesCount: 0,
    salesRevenue: 0,
    strikes: 0,
    storeId,
    certifications: new Set(),
    notes: [],
  };
  EMPLOYEES.set(empKey(storeId, playerId), emp);
  return emp;
}

export function removeEmployeeRecord(storeId: string, playerId: string): void {
  EMPLOYEES.delete(empKey(storeId, playerId));
  OPEN_TIMESHEETS.delete(playerId);
}

export function setPlayerRole(playerId: string, storeId: string, role: SqdcRole): void {
  PLAYER_ROLES.set(playerId, { storeId, role });
}

export function clearPlayerRole(playerId: string): void {
  PLAYER_ROLES.delete(playerId);
}

export function updateEmployeeRole(storeId: string, playerId: string, role: SqdcRole): void {
  const emp = getEmployee(storeId, playerId);
  if (emp) emp.role = role;
}

export function updateEmployeeRate(storeId: string, playerId: string, rate: number): void {
  const emp = getEmployee(storeId, playerId);
  if (emp) emp.hourlyRate = rate;
}

export function setEmployeeClocked(
  storeId: string,
  playerId: string,
  isClocked: boolean,
  clockTime: number | null,
): void {
  const emp = getEmployee(storeId, playerId);
  if (!emp) return;
  emp.isClockedIn = isClocked;
  emp.clockInTime = clockTime;
}

export function addEmployeeCertification(
  storeId: string,
  playerId: string,
  cert: Certification,
): void {
  const emp = getEmployee(storeId, playerId);
  if (emp) emp.certifications.add(cert);
}

/* ═══════════════ FEUILLES DE TEMPS ═══════════════ */

export function registerTimesheet(ts: Timesheet): void {
  TIMESHEETS.set(ts.id, ts);
  OPEN_TIMESHEETS.set(ts.playerId, ts.id);
}

export function closeTimesheet(
  playerId: string,
  clockOut: number,
  hoursWorked: number,
  grossPay: number,
  netPay: number,
): void {
  const id = OPEN_TIMESHEETS.get(playerId);
  if (!id) return;
  const ts = TIMESHEETS.get(id);
  if (!ts) return;
  ts.clockOut = clockOut;
  ts.hoursWorked = hoursWorked;
  ts.grossPay = grossPay;
  ts.netPay = netPay;
  ts.status = "closed";
  OPEN_TIMESHEETS.delete(playerId);
}

export function getTimesheetsForStore(storeId: string): Timesheet[] {
  const out: Timesheet[] = [];
  TIMESHEETS.forEach((ts) => { if (ts.storeId === storeId) out.push(ts); });
  return out.sort((a, b) => b.clockIn - a.clockIn);
}

export function getTimesheetsForPlayer(playerId: string): Timesheet[] {
  const out: Timesheet[] = [];
  TIMESHEETS.forEach((ts) => { if (ts.playerId === playerId) out.push(ts); });
  return out.sort((a, b) => b.clockIn - a.clockIn);
}

/* ═══════════════ PERFORMANCE & VENTES ═══════════════ */

export function recordSale(storeId: string, employeeId: string, amount: number): void {
  const emp = getEmployee(storeId, employeeId);
  if (!emp) return;
  emp.salesCount++;
  emp.salesRevenue += amount;
  emp.performanceRating = Math.min(100, emp.performanceRating + 0.5);
  netEmit("sqdc:sale_recorded", {
    storeId, employeeId, amount,
    totalSales: emp.salesRevenue,
  });
}

export function setPerformance(
  storeId: string,
  managerId: string,
  targetId: string,
  rating: number,
  comment = "",
): { success: boolean; message: string } {
  const emp = getEmployee(storeId, targetId);
  if (!emp) return { success: false, message: "Employé introuvable." };
  emp.performanceRating = Math.max(0, Math.min(100, rating));
  if (comment) emp.notes.push(`[${new Date().toISOString()}] ${comment}`);
  netEmit("sqdc:performance_set", { storeId, playerId: targetId, rating, managerId });
  return { success: true, message: "Évaluation enregistrée." };
}

/* ═══════════════ RÉSEAU ═══════════════ */

let _syncDispose: (() => void) | null = null;

export function setupJobsNetworkSync(): () => void {
  _syncDispose?.();

  const unsubs = [
    netOn("sqdc:hired", (d: any) => {
      if (!d?.playerId || !d?.storeId) return;
      if (getEmployee(d.storeId, d.playerId)) return;
      createEmployeeRecord(
        d.storeId, d.playerId, d.playerName ?? "Inconnu",
        d.role, d.hourlyRate,
      );
      setPlayerRole(d.playerId, d.storeId, d.role);
    }),

    netOn("sqdc:fired", (d: any) => {
      if (!d?.playerId || !d?.storeId) return;
      removeEmployeeRecord(d.storeId, d.playerId);
      clearPlayerRole(d.playerId);
    }),

    netOn("sqdc:promoted", (d: any) => {
      if (!d?.playerId || !d?.storeId) return;
      updateEmployeeRole(d.storeId, d.playerId, d.newRole);
      const reg = PLAYER_ROLES.get(d.playerId);
      if (reg) reg.role = d.newRole;
    }),

    netOn("sqdc:salary_adjusted", (d: any) => {
      if (!d?.playerId || !d?.storeId) return;
      updateEmployeeRate(d.storeId, d.playerId, d.newRate);
    }),

    netOn("sqdc:clock_in", (d: any) => {
      if (!d?.playerId || !d?.storeId) return;
      setEmployeeClocked(d.storeId, d.playerId, true, d.timestamp ?? Date.now());
    }),

    netOn("sqdc:clock_out", (d: any) => {
      if (!d?.playerId || !d?.storeId) return;
      setEmployeeClocked(d.storeId, d.playerId, false, null);
    }),

    netOn("sqdc:sale_recorded", (d: any) => {
      if (!d?.employeeId || !d?.storeId) return;
      const emp = getEmployee(d.storeId, d.employeeId);
      if (emp) {
        emp.salesCount++;
        emp.salesRevenue += d.amount;
      }
    }),

    netOn("sqdc:certification_earned", (d: any) => {
      if (!d?.playerId || !d?.storeId) return;
      addEmployeeCertification(d.storeId, d.playerId, d.cert);
    }),
  ];

  _syncDispose = () => {
    unsubs.forEach((u) => u?.());
    _syncDispose = null;
  };
  return _syncDispose;
}

export function disposeJobsRegistry(): void {
  _syncDispose?.();
  EMPLOYEES.clear();
  PLAYER_ROLES.clear();
  TIMESHEETS.clear();
  OPEN_TIMESHEETS.clear();
}

/* ═══════════════ RÉEXPORTS (compat) ═══════════════ */

export type { SqdcRole } from "./roles";
export type { SqdcPermissions } from "./permissions";
export type { Timesheet } from "./timeclock";
export type { Certification } from "./certifications";
export type { JobApplication } from "./applications";
export type { SalaryReview } from "./contracts";
export type { Strike, StrikeSeverity } from "./discipline";
export type { Shift } from "./schedules";
export type { StoreStaffReport } from "./reports";
export type { JobsPromptContext } from "./prompts";