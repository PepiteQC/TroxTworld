/**
 * TROXTWORLD — Prompts contextuels SQDC
 */
import { getEmployee, getPlayerPermissions } from "./jobs";

export type JobsPromptContext =
  | "bulletin_board"
  | "timeclock"
  | "hr_office"
  | "safe"
  | "camera_terminal"
  | "reserve_door";

export function jobsPrompt(
  storeId: string,
  playerId: string,
  context: JobsPromptContext,
): string | null {
  const emp = getEmployee(storeId, playerId);
  const perms = getPlayerPermissions(playerId);

  switch (context) {
    case "bulletin_board":
      if (!emp) return "E — Postuler pour un emploi SQDC";
      return `E — Consulter les annonces internes (${emp.role})`;

    case "timeclock": {
      if (!emp) return "🚫 Employés seulement";
      if (emp.isClockedIn) {
        const t = emp.clockInTime ?? Date.now();
        const mins = Math.floor((Date.now() - t) / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `E — Fin de service (en poste depuis ${h}h${m.toString().padStart(2, "0")})`;
      }
      return "E — Prise de service";
    }

    case "hr_office":
      if (!emp) return null;
      if (perms.canHire) return "E — Registre RH (candidatures, embauches, sanctions)";
      return "E — Consulter mon dossier";

    case "safe":
      return perms.canAccessSafe ? "E — Ouvrir le coffre-fort" : "🔒 Accès restreint";

    case "camera_terminal":
      return perms.canViewCameras ? "E — Consulter les caméras" : "🔒 Accès restreint";

    case "reserve_door":
      return perms.canAccessReserve ? "E — Entrer dans la réserve" : "🚫 Employés seulement";

    default:
      return null;
  }
}