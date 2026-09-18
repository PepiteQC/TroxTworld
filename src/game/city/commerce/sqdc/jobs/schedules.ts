/**
 * TROXTWORLD — Horaires / quarts SQDC
 */
import { netEmit } from "../../../net";
import type { SqdcRole } from "./roles";
import { getEmployee } from "./jobs";

export interface Shift {
  id: string;
  playerId: string;
  playerName: string;
  storeId: string;
  dayOfWeek: number; // 0 = dimanche
  startHour: number; // 0-23
  endHour: number;
  role: SqdcRole;
  isActive: boolean;
}

const SHIFTS = new Map<string, Shift[]>(); // storeId → shifts

export function setShift(
  storeId: string,
  managerId: string,
  targetId: string,
  dayOfWeek: number,
  startHour: number,
  endHour: number,
): { success: boolean; message: string } {
  const emp = getEmployee(storeId, targetId);
  if (!emp) return { success: false, message: "Employé introuvable." };
  if (startHour >= endHour) return { success: false, message: "Heures invalides." };

  const list = SHIFTS.get(storeId) ?? [];
  const id = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  list.push({
    id,
    playerId: targetId,
    playerName: emp.playerName,
    storeId,
    dayOfWeek,
    startHour,
    endHour,
    role: emp.role,
    isActive: true,
  });
  SHIFTS.set(storeId, list);

  netEmit("sqdc:shift_set", { storeId, shiftId: id, playerId: targetId, dayOfWeek, startHour, endHour });
  return { success: true, message: "Quart ajouté." };
}

export function removeShift(storeId: string, shiftId: string): boolean {
  const list = SHIFTS.get(storeId);
  if (!list) return false;
  const idx = list.findIndex((s) => s.id === shiftId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  netEmit("sqdc:shift_removed", { storeId, shiftId });
  return true;
}

export function getShifts(storeId: string, playerId?: string): Shift[] {
  const list = SHIFTS.get(storeId) ?? [];
  return playerId ? list.filter((s) => s.playerId === playerId) : list;
}

export function getShiftsToday(storeId: string): Shift[] {
  const day = new Date().getDay();
  return (SHIFTS.get(storeId) ?? []).filter((s) => s.dayOfWeek === day && s.isActive);
}

export function getShiftsForDay(storeId: string, dayOfWeek: number): Shift[] {
  return (SHIFTS.get(storeId) ?? []).filter((s) => s.dayOfWeek === dayOfWeek && s.isActive);
}

export function clearShifts(): void {
  SHIFTS.clear();
}