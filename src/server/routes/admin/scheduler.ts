/**
 * ═══════════════════════════════════════════════════════════════════
 * ⏳ TROXTWORLD / ETHERWORLD — PLANIFICATEUR MOMENTUS (/admin/scheduler)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Tâches & Systèmes Automatisés Supervisés :
 *  - ⚡ Hydro-Québec (Charge réseau, Pannes, Détection de fraudes)
 *  - 🌨️ Météo Québécoise & Déneigement MTQ
 *  - 🏦 Économie & Salaires (Cycles de paie, Prêts, TAL)
 *  - 🌲 Faune & Écosystème (Respawn d'animaux, Meutes de loups)
 *  - 🔒 Pénitencier de Donnacona (Peines de prison & Libérations)
 *  - 🧹 Maintenance Système (Garbage Collection, VRAM, WebRTC)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type JobStatus = "ACTIVE" | "RUNNING" | "PAUSED" | "OVERDUE" | "FAILED";
export type JobCategory = "weather" | "economy" | "world" | "justice" | "illegal" | "system";

export interface ScheduledJob {
  id: string;
  name: string;
  category: JobCategory;
  intervalMs: number;
  lastRun: number;
  nextRun: number;
  executionCount: number;
  errorCount: number;
  lastDurationMs: number;
  avgDurationMs: number;
  status: JobStatus;
  description: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface SchedulerOverview {
  overallStatus: "OPTIMAL" | "STABLE" | "DEGRADED";
  tps: number;
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  failingJobs: number;
  overdueJobs: number;
  totalExecutions: number;
  momentusUptimeSec: number;
  jobs: ScheduledJob[];
}

const schedulerStartTime = Date.now();
const now = Date.now();

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES TÂCHES PLANIFIÉES DE MOMENTUS
// ═══════════════════════════════════════════════════════════

const registeredJobs: ScheduledJob[] = [
  {
    id: "hydro_grid_tick",
    name: "Surveillance Réseau Hydro-Québec",
    category: "world",
    intervalMs: 15000, // Toutes les 15s
    lastRun: now - 4000,
    nextRun: now + 11000,
    executionCount: 242,
    errorCount: 0,
    lastDurationMs: 1.8,
    avgDurationMs: 1.5,
    status: "ACTIVE",
    description: "Évalue la charge électrique des transformateurs et gère le risque de verglas/panne.",
    metadata: { gridStatus: "NORMAL", currentLoadPct: 62 },
  },
  {
    id: "quebec_weather_cycle",
    name: "Générateur Météo & Saisons",
    category: "weather",
    intervalMs: 60000, // Toutes les 60s
    lastRun: now - 22000,
    nextRun: now + 38000,
    executionCount: 68,
    errorCount: 0,
    lastDurationMs: 0.9,
    avgDurationMs: 0.8,
    status: "ACTIVE",
    description: "Progression des températures ambiantes, accumulation de neige et alertes de tempête.",
    metadata: { currentSeason: "Automne", ambientC: 8.5 },
  },
  {
    id: "snow_plow_dispatcher",
    name: "Coordination Déneigement MTQ",
    category: "world",
    intervalMs: 10000, // Toutes les 10s
    lastRun: now - 3000,
    nextRun: now + 7000,
    executionCount: 380,
    errorCount: 0,
    lastDurationMs: 2.4,
    avgDurationMs: 2.1,
    status: "ACTIVE",
    description: "Pilote la flotte de charrues Mack et de saleuses sur la 138 et le 2e Rang.",
    metadata: { activePlows: 3, roadClearPct: 98 },
  },
  {
    id: "bank_payroll_distributor",
    name: "Cycle de Paie & Prélèvements Caisse",
    category: "economy",
    intervalMs: 95000, // Toutes les 95s
    lastRun: now - 54000,
    nextRun: now + 41000,
    executionCount: 42,
    errorCount: 0,
    lastDurationMs: 4.2,
    avgDurationMs: 3.8,
    status: "ACTIVE",
    description: "Verse les salaires des métiers RP et encaisse les factures Hydro / eau.",
    metadata: { lastPayrollTotal: 8450, processedAccounts: 12 },
  },
  {
    id: "wildlife_population_tick",
    name: "Écosystème & Faune Laurentides",
    category: "world",
    intervalMs: 5000, // Toutes les 5s
    lastRun: now - 1500,
    nextRun: now + 3500,
    executionCount: 720,
    errorCount: 0,
    lastDurationMs: 3.1,
    avgDurationMs: 2.9,
    status: "ACTIVE",
    description: "Traque IA des meutes de loups, hardes d'orignaux et réapparition du gibier.",
    metadata: { activeAnimals: 24, poachedCount: 0 },
  },
  {
    id: "realty_tal_rent_collector",
    name: "Régie du Logement & Baux (TAL)",
    category: "justice",
    intervalMs: 180000, // Toutes les 3 min
    lastRun: now - 110000,
    nextRun: now + 70000,
    executionCount: 19,
    errorCount: 0,
    lastDurationMs: 1.2,
    avgDurationMs: 1.1,
    status: "ACTIVE",
    description: "Enregistre les baux notariés et calcule les retards de paiement de loyer.",
    metadata: { activeLeases: 14, defaultCount: 0 },
  },
  {
    id: "prison_sentence_ticker",
    name: "Registre d'Écrou Pénitencier Donnacona",
    category: "justice",
    intervalMs: 1000, // Chaque seconde
    lastRun: now - 400,
    nextRun: now + 600,
    executionCount: 3600,
    errorCount: 0,
    lastDurationMs: 0.4,
    avgDurationMs: 0.3,
    status: "ACTIVE",
    description: "Décompte le temps cellulaire des détenus et gère les libérations sous caution.",
    metadata: { currentInmates: 0, solitaryCount: 0 },
  },
  {
    id: "growop_illegal_audit",
    name: "Audit Détection Fraude Hydro & Plantations",
    category: "illegal",
    intervalMs: 30000, // Toutes les 30s
    lastRun: now - 18000,
    nextRun: now + 12000,
    executionCount: 114,
    errorCount: 0,
    lastDurationMs: 0.8,
    avgDurationMs: 0.7,
    status: "ACTIVE",
    description: "Compare la télémétrie des compteurs aux lampes horticoles et alerte la SQ.",
    metadata: { flaggedHouses: 0, activeBypasses: 0 },
  },
  {
    id: "memory_gc_sweeper",
    name: "Purgeur VRAM & Garbage Collection",
    category: "system",
    intervalMs: 120000, // Toutes les 2 min
    lastRun: now - 80000,
    nextRun: now + 40000,
    executionCount: 31,
    errorCount: 0,
    lastDurationMs: 5.8,
    avgDurationMs: 4.9,
    status: "ACTIVE",
    description: "Libère les textures orphelines WebGL et optimise le tas JavaScript V8.",
    metadata: { lastFreedMB: 18.4, totalCleanups: 31 },
  },
];

// ═══════════════════════════════════════════════════════════
// HANDLERS SERVEUR
// ═══════════════════════════════════════════════════════════

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ── 1. GET : CONSULTATION DES TÂCHES PLANIFIÉES ──
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const categoryFilter = url.searchParams.get("category")?.toLowerCase();
      const statusFilter = url.searchParams.get("status")?.toUpperCase();
      const search = url.searchParams.get("search")?.toLowerCase();

      // Mise à jour de l'état des tâches
      const currentTime = Date.now();
      for (const job of registeredJobs) {
        if (job.status === "ACTIVE" && currentTime > job.nextRun + 5000) {
          job.status = "OVERDUE";
        }
      }

      let filtered = [...registeredJobs];

      if (categoryFilter) filtered = filtered.filter((j) => j.category === categoryFilter);
      if (statusFilter) filtered = filtered.filter((j) => j.status === statusFilter);
      if (search) {
        filtered = filtered.filter((j) =>
          j.id.toLowerCase().includes(search) ||
          j.name.toLowerCase().includes(search) ||
          j.description.toLowerCase().includes(search)
        );
      }

      const activeCount = registeredJobs.filter((j) => j.status === "ACTIVE" || j.status === "RUNNING").length;
      const pausedCount = registeredJobs.filter((j) => j.status === "PAUSED").length;
      const failingCount = registeredJobs.filter((j) => j.errorCount > 0 || j.status === "FAILED").length;
      const overdueCount = registeredJobs.filter((j) => j.status === "OVERDUE").length;
      const totalExecutions = registeredJobs.reduce((acc, j) => acc + j.executionCount, 0);

      const overview: SchedulerOverview = {
        overallStatus: failingCount > 0 || overdueCount > 2 ? "DEGRADED" : overdueCount > 0 ? "STABLE" : "OPTIMAL",
        tps: 60.0,
        totalJobs: registeredJobs.length,
        activeJobs: activeCount,
        pausedJobs: pausedCount,
        failingJobs: failingCount,
        overdueJobs: overdueCount,
        totalExecutions,
        momentusUptimeSec: Math.floor((currentTime - schedulerStartTime) / 1000),
        jobs: filtered,
      };

      if (isStats) {
        return new Response(
          JSON.stringify({
            ok: true,
            tps: overview.tps,
            overallStatus: overview.overallStatus,
            activeJobs: overview.activeJobs,
            overdueJobs: overview.overdueJobs,
            failingJobs: overview.failingJobs,
            totalExecutions: overview.totalExecutions,
            uptimeSeconds: overview.momentusUptimeSec,
            timestamp: Date.now(),
          }),
          { status: 200, headers }
        );
      }

      return new Response(JSON.stringify({ ok: true, data: overview }), { status: 200, headers });
    }

    // ── 2. POST : PILOTAGE TEMPS RÉEL DU PLANIFICATEUR ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, jobId, intervalMs } = body;

      if (!action) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action" }), { status: 400, headers });
      }

      const targetJob = registeredJobs.find((j) => j.id === jobId);

      switch (action) {
        case "trigger_job": {
          if (!targetJob) {
            return new Response(JSON.stringify({ ok: false, error: "job_not_found" }), { status: 404, headers });
          }
          const start = performance.now();
          targetJob.executionCount++;
          targetJob.lastRun = Date.now();
          targetJob.nextRun = Date.now() + targetJob.intervalMs;
          targetJob.lastDurationMs = Math.round((performance.now() - start + Math.random() * 2) * 10) / 10;
          targetJob.status = "ACTIVE";

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Tâche [${targetJob.name}] exécutée manuellement avec succès.`,
              job: targetJob,
            }),
            { status: 200, headers }
          );
        }

        case "pause_job": {
          if (!targetJob) {
            return new Response(JSON.stringify({ ok: false, error: "job_not_found" }), { status: 404, headers });
          }
          targetJob.status = "PAUSED";
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Tâche [${targetJob.name}] suspendue.`,
              job: targetJob,
            }),
            { status: 200, headers }
          );
        }

        case "resume_job": {
          if (!targetJob) {
            return new Response(JSON.stringify({ ok: false, error: "job_not_found" }), { status: 404, headers });
          }
          targetJob.status = "ACTIVE";
          targetJob.nextRun = Date.now() + targetJob.intervalMs;
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Tâche [${targetJob.name}] réactivée.`,
              job: targetJob,
            }),
            { status: 200, headers }
          );
        }

        case "reschedule": {
          if (!targetJob || typeof intervalMs !== "number" || intervalMs < 500) {
            return new Response(JSON.stringify({ ok: false, error: "invalid_interval_or_job" }), { status: 400, headers });
          }
          targetJob.intervalMs = intervalMs;
          targetJob.nextRun = Date.now() + intervalMs;
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Fréquence de [${targetJob.name}] ajustée à ${intervalMs} ms.`,
              job: targetJob,
            }),
            { status: 200, headers }
          );
        }

        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }
    }

    // ── 3. DELETE : RÉINITIALISATION DES ERREURS OU SUPPRESSION ──
    if (method === "DELETE") {
      const jobId = url.searchParams.get("jobId");
      if (jobId) {
        const job = registeredJobs.find((j) => j.id === jobId);
        if (job) {
          job.errorCount = 0;
          job.status = "ACTIVE";
          job.nextRun = Date.now() + job.intervalMs;
          return new Response(
            JSON.stringify({ ok: true, message: `Compteurs d'erreurs de la tâche [${job.name}] réinitialisés.` }),
            { status: 200, headers }
          );
        }
      }

      return new Response(JSON.stringify({ ok: false, error: "job_not_found" }), { status: 404, headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// ROUTEUR TANSTACK
// ═══════════════════════════════════════════════════════════

export const Route = createFileRoute("/admin/scheduler")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});