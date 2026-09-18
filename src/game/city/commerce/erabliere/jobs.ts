/**
 * 🍁 JOBS — Emplois dans les érablières
 */
import { SUGAR_CONFIG } from "./config";
import type { ErabliereJob, ErabliereJobRole } from "./types";

const ROLE_META: Record<ErabliereJobRole, { label: string; baseWage: number; minLevel: number }> = {
  proprietaire:      { label: "Propriétaire",            baseWage: 0,    minLevel: 1 },
  gerant:            { label: "Gérant",                  baseWage: 25,   minLevel: 3 },
  aide_evaporateur:  { label: "Aide-évaporateur",        baseWage: 16.5, minLevel: 1 },
  bucheron:          { label: "Bûcheron",                baseWage: 19,   minLevel: 1 },
  chauffeur:         { label: "Chauffeur-livreur",       baseWage: 18,   minLevel: 2 },
  guide_touristique: { label: "Guide touristique",       baseWage: 17.25,minLevel: 2 },
  vendeur_boutique:  { label: "Vendeur boutique",        baseWage: 16.75,minLevel: 1 },
  stagiaire:         { label: "Stagiaire",               baseWage: 15.75,minLevel: 1 },
};

export function erabliereRoleLabel(role: ErabliereJobRole): string {
  return ROLE_META[role]?.label ?? role;
}

export function erabliereRoleWage(role: ErabliereJobRole): number {
  return ROLE_META[role]?.baseWage ?? 16.0;
}

export class ErabliereJobBoard {
  private jobs = new Map<string, ErabliereJob>(); // clé = jobId

  /** Génère un ID unique */
  private genJobId(bushId: string, role: ErabliereJobRole, seq: number): string {
    return `job_${bushId}_${role}_${seq}`;
  }

  /** Crée un poste vacant */
  createJob(bushId: string, role: ErabliereJobRole): ErabliereJob {
    const seq = Array.from(this.jobs.values()).filter((j) => j.bushId === bushId).length + 1;
    const job: ErabliereJob = {
      id: this.genJobId(bushId, role, seq),
      bushId,
      role,
      playerId: null,
      playerName: null,
      hourlyWage: erabliereRoleWage(role),
      hiredAt: 0,
      hoursWorked: 0,
      totalEarned: 0,
      isClockedIn: false,
      clockInAt: null,
      performance: 50,
      shiftsCompleted: 0,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  /** Postes disponibles (vacants) */
  listVacant(bushId?: string): ErabliereJob[] {
    return [...this.jobs.values()].filter(
      (j) => !j.playerId && (!bushId || j.bushId === bushId),
    );
  }

  /** Postes occupés par un joueur */
  listByPlayer(playerId: string): ErabliereJob[] {
    return [...this.jobs.values()].filter((j) => j.playerId === playerId);
  }

  /** Postes d'une érablière */
  listByBush(bushId: string): ErabliereJob[] {
    return [...this.jobs.values()].filter((j) => j.bushId === bushId);
  }

  /** Embaucher un joueur */
  hire(jobId: string, playerId: string, playerName: string): { ok: boolean; message: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { ok: false, message: "Poste introuvable" };
    if (job.playerId) return { ok: false, message: "Poste déjà occupé" };

    const existing = this.listByPlayer(playerId);
    if (existing.some((j) => j.bushId === job.bushId)) {
      return { ok: false, message: "Vous travaillez déjà ici" };
    }

    job.playerId = playerId;
    job.playerName = playerName;
    job.hiredAt = Date.now();
    return { ok: true, message: `${playerName} embauché comme ${erabliereRoleLabel(job.role)}` };
  }

  /** Licencier */
  fire(jobId: string, reason = ""): { ok: boolean; message: string } {
    const job = this.jobs.get(jobId);
    if (!job || !job.playerId) return { ok: false, message: "Poste vacant" };

    const name = job.playerName ?? "Employé";
    job.playerId = null;
    job.playerName = null;
    job.isClockedIn = false;
    job.clockInAt = null;
    return { ok: true, message: `${name} licencié${reason ? ` (${reason})` : ""}` };
  }

  /** Clock-in */
  clockIn(jobId: string): { ok: boolean; message: string } {
    const job = this.jobs.get(jobId);
    if (!job || !job.playerId) return { ok: false, message: "Poste vacant" };
    if (job.isClockedIn) return { ok: false, message: "Déjà en service" };
    job.isClockedIn = true;
    job.clockInAt = Date.now();
    return { ok: true, message: `${job.playerName} en service` };
  }

  /** Clock-out + paie */
  clockOut(jobId: string): { ok: boolean; message: string; earned: number; hours: number } {
    const job = this.jobs.get(jobId);
    if (!job || !job.isClockedIn || !job.clockInAt) {
      return { ok: false, message: "Pas en service", earned: 0, hours: 0 };
    }
    const now = Date.now();
    const hours = (now - job.clockInAt) / 3600000;
    const earned = Math.round(hours * job.hourlyWage * 100) / 100;

    job.hoursWorked += hours;
    job.totalEarned += earned;
    job.isClockedIn = false;
    job.clockInAt = null;
    job.shiftsCompleted++;

    return {
      ok: true,
      message: `Quart terminé · ${hours.toFixed(2)}h · ${earned}$`,
      earned,
      hours,
    };
  }

  /** Ajuster performance */
  updatePerformance(jobId: string, delta: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.performance = Math.max(0, Math.min(100, job.performance + delta));
  }

  /** Stats */
  getStats() {
    const all = [...this.jobs.values()];
    return {
      totalJobs: all.length,
      vacant: all.filter((j) => !j.playerId).length,
      occupied: all.filter((j) => j.playerId).length,
      onDuty: all.filter((j) => j.isClockedIn).length,
      totalPaidOut: all.reduce((s, j) => s + j.totalEarned, 0),
    };
  }

  /** Snapshot persistant */
  serialize(): unknown {
    return Array.from(this.jobs.entries()).map(([id, j]) => ({
      id,
      ...j,
    }));
  }

  /** Restaure */
  restore(data: unknown[]): void {
    this.jobs.clear();
    if (!Array.isArray(data)) return;
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const j = row as ErabliereJob;
      if (typeof j.id === "string") this.jobs.set(j.id, j);
    }
  }

  /** Initialise les postes de base pour chaque érablière */
  seedForBush(bushId: string): void {
    const roles: ErabliereJobRole[] = [
      "aide_evaporateur",
      "aide_evaporateur",  // 2 postes
      "bucheron",
      "chauffeur",
      "guide_touristique",
      "vendeur_boutique",
    ];
    for (const role of roles) {
      this.createJob(bushId, role);
    }
  }
}

export const MAX_EMPLOYEES_PER_BUSH = SUGAR_CONFIG.JOBS.MAX_EMPLOYEES;
export const SHIFT_COOLDOWN_MS = SUGAR_CONFIG.JOBS.SHIFT_COOLDOWN_MS;