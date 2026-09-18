/**
 * TROXTWORLD — Sanctions disciplinaires SQDC
 */
import { netEmit } from "../../../net";
import { sendPrivateMessage, sendChatMessage } from "../../../chat";
import { getEmployee } from "./jobs";
import { fireEmployee } from "./contracts";

export type StrikeSeverity = "warning" | "verbal" | "written" | "final" | "suspension";

export interface Strike {
  id: string;
  playerId: string;
  playerName: string;
  storeId: string;
  issuedBy: string;
  reason: string;
  severity: StrikeSeverity;
  suspensionHours: number;
  timestamp: number;
}

const STRIKES: Strike[] = [];
const SUSPENSIONS = new Map<string, number>(); // playerId → untilTimestamp

export function issueStrike(
  storeId: string,
  issuerId: string,
  targetId: string,
  severity: StrikeSeverity,
  reason: string,
): { success: boolean; message: string } {
  const emp = getEmployee(storeId, targetId);
  if (!emp) return { success: false, message: "Employé introuvable." };

  const strike: Strike = {
    id: `strike_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    playerId: targetId,
    playerName: emp.playerName,
    storeId,
    issuedBy: issuerId,
    reason,
    severity,
    suspensionHours: severity === "suspension" ? 24 : 0,
    timestamp: Date.now(),
  };
  STRIKES.push(strike);
  emp.strikes++;

  if (severity === "suspension") {
    SUSPENSIONS.set(targetId, Date.now() + 24 * 3600 * 1000);
  }

  netEmit("sqdc:strike_issued", { storeId, strike });

  if (emp.strikes >= 3) {
    fireEmployee(storeId, issuerId, targetId, `Licenciement automatique (3 avertissements) — dernier : ${reason}`);
    sendChatMessage(`❌ ${emp.playerName} licencié (3 avertissements).`);
  } else {
    sendPrivateMessage(targetId, `⚠️ Avertissement (${severity}) : ${reason} · ${emp.strikes}/3`);
  }

  return { success: true, message: `Avertissement ${emp.strikes}/3 délivré.` };
}

export function getStrikes(playerId: string): Strike[] {
  return STRIKES.filter((s) => s.playerId === playerId);
}

export function isSuspended(playerId: string): boolean {
  const until = SUSPENSIONS.get(playerId);
  if (!until) return false;
  if (Date.now() >= until) {
    SUSPENSIONS.delete(playerId);
    return false;
  }
  return true;
}

export function liftSuspension(playerId: string): void {
  SUSPENSIONS.delete(playerId);
}

export function clearStrikes(): void {
  STRIKES.length = 0;
  SUSPENSIONS.clear();
}