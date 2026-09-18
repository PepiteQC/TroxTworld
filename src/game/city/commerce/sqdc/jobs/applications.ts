/**
 * TROXTWORLD — Candidatures SQDC
 */
import { netEmit } from "../../../net";
import { sendPrivateMessage } from "../../../chat";
import { ROLE_META, type SqdcRole } from "./roles";
import { getPlayerRole, hireEmployee } from "./jobs";
import { MIN_HOURLY_WAGE_QC, MAX_HOURLY_RATE } from "./payroll";

export interface JobApplication {
  id: string;
  playerId: string;
  playerName: string;
  storeId: string;
  desiredRole: SqdcRole;
  desiredRate: number;
  message: string;
  submittedAt: number;
  status: "pending" | "interview" | "accepted" | "rejected";
  reviewedBy: string | null;
  reviewedAt: number | null;
}

const APPLICATIONS = new Map<string, JobApplication>();

function genId() {
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function submitApplication(
  playerId: string,
  playerName: string,
  storeId: string,
  desiredRole: SqdcRole,
  desiredRate: number,
  message: string,
): { success: boolean; message: string; applicationId: string | null } {
  if (getPlayerRole(playerId)) {
    return { success: false, message: "Vous avez déjà un emploi SQDC.", applicationId: null };
  }
  if (desiredRate < MIN_HOURLY_WAGE_QC || desiredRate > MAX_HOURLY_RATE) {
    return {
      success: false,
      message: `Taux hors limites (${MIN_HOURLY_WAGE_QC}-${MAX_HOURLY_RATE}$/h)`,
      applicationId: null,
    };
  }

  const id = genId();
  const app: JobApplication = {
    id, playerId, playerName, storeId, desiredRole,
    desiredRate, message,
    submittedAt: Date.now(),
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
  };
  APPLICATIONS.set(id, app);

  netEmit("sqdc:application_submitted", { application: app });
  sendPrivateMessage(playerId, `📝 Candidature soumise · ${ROLE_META[desiredRole].label} à ${desiredRate}$/h`);

  return { success: true, message: "Candidature envoyée.", applicationId: id };
}

export function reviewApplication(
  applicationId: string,
  reviewerId: string,
  decision: "accepted" | "rejected" | "interview",
  reason = "",
): { success: boolean; message: string } {
  const app = APPLICATIONS.get(applicationId);
  if (!app) return { success: false, message: "Candidature introuvable." };

  app.status = decision;
  app.reviewedBy = reviewerId;
  app.reviewedAt = Date.now();

  if (decision === "accepted") {
    const res = hireEmployee(
      app.storeId, reviewerId,
      app.playerId, app.playerName,
      app.desiredRole, app.desiredRate,
    );
    if (!res.success) return { success: false, message: res.message };
    sendPrivateMessage(app.playerId, `🎉 Candidature ACCEPTÉE · ${app.desiredRole} @ ${app.desiredRate}$/h`);
  } else if (decision === "rejected") {
    sendPrivateMessage(app.playerId, `❌ Candidature refusée${reason ? ` · ${reason}` : ""}`);
  } else {
    sendPrivateMessage(app.playerId, `📞 Entretien programmé — contactez la direction.`);
  }

  netEmit("sqdc:application_reviewed", { applicationId, decision, reviewerId });
  return { success: true, message: `Candidature ${decision}.` };
}

export function listApplications(storeId: string, status?: JobApplication["status"]): JobApplication[] {
  const list: JobApplication[] = [];
  APPLICATIONS.forEach((app) => {
    if (app.storeId === storeId && (!status || app.status === status)) list.push(app);
  });
  return list.sort((a, b) => b.submittedAt - a.submittedAt);
}

export function getApplication(id: string): JobApplication | null {
  return APPLICATIONS.get(id) ?? null;
}

export function clearApplications(): void {
  APPLICATIONS.clear();
}