/**
 * ═══════════════════════════════════════════════════════════════════
 * 👁️ TROXTWORLD / ETHERWORLD — TÉLÉMÉTRIE DE SÉCURITÉ THIRDEYE (/admin/thirdeye/stats)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Capacités du Module de Sécurité & Anti-Cheat :
 *  - 🛡️ Détection Heuristique : SpeedHack, Noclip, GodMode, Weapon/Money Injection.
 *  - 📈 TrustScore & Niveaux de Risque : Surveillance continue des joueurs suspects.
 *  - ⚡ Mitigations Automatiques : Rubberband, Silent-flags, Auto-kicks & Bans.
 *  - 🎛️ Posture de Sécurité : Ajustement dynamique (Relaxed, Balanced, Strict, Lockdown).
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type ThreatLevel = "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
export type SecurityPosture = "relaxed" | "balanced" | "strict" | "lockdown";
export type DetectionCategory = "speed_teleport" | "weapon_spawning" | "godmode_health" | "money_injection" | "noclip_fly" | "vehicle_hack" | "hydro_bypass";

export interface ThreatDetectionEvent {
  id: string;
  timestamp: number;
  category: DetectionCategory;
  severity: "low" | "medium" | "high" | "critical";
  targetId: string;
  targetName: string;
  heuristic: string;
  details: string;
  autoMitigated: boolean;
  mitigationAction?: "rubberband" | "silent_flag" | "kick" | "ban" | "inventory_strip";
}

export interface FlaggedPlayer {
  identifier: string;
  displayName: string;
  trustScore: number; // 0 (Tricheur avéré) à 100 (Parfait)
  riskLevel: ThreatLevel;
  totalFlags: number;
  lastFlagTime: number;
  flagCategories: DetectionCategory[];
  pingMs: number;
}

export interface ThirdEyeStatsReport {
  overallThreatLevel: ThreatLevel;
  securityPosture: SecurityPosture;
  averageTrustScore: number;
  inspectedPacketsPerSec: number;
  activeWatchlistCount: number;
  autoMitigationsToday: number;
  uptimeSeconds: number;
  categoryBreakdown: Record<DetectionCategory, number>;
  flaggedPlayers: FlaggedPlayer[];
  recentIncidents: ThreatDetectionEvent[];
}

const serviceStartTime = Date.now();
let currentSecurityPosture: SecurityPosture = "balanced";

// ═══════════════════════════════════════════════════════════
// TAMPON D'INCIDENTS THIRDEYE
// ═══════════════════════════════════════════════════════════

const inMemoryIncidents: ThreatDetectionEvent[] = [];
const now = Date.now();

inMemoryIncidents.push(
  {
    id: `sec_${now - 140000}`,
    timestamp: now - 140000,
    category: "speed_teleport",
    severity: "low",
    targetId: "player_test_1",
    targetName: "Joueur_42",
    heuristic: "Delta Position > 32 m/s (Hors véhicule)",
    details: "Déplacement anormal détecté près du 2e Rang de Donnacona. Probable latence réseau.",
    autoMitigated: true,
    mitigationAction: "rubberband",
  },
  {
    id: `sec_${now - 45000}`,
    timestamp: now - 45000,
    category: "hydro_bypass",
    severity: "medium",
    targetId: "suspect_h_pnf",
    targetName: "Occupant Villa Portneuf",
    heuristic: "Consommation 0 kW avec 8 lampes horticoles actives",
    details: "Dérivation illégale du compteur Hydro-Québec suspectée.",
    autoMitigated: false,
    mitigationAction: "silent_flag",
  }
);

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
    // ── 1. GET : CONSULTATION DES MÉTRIQUES THIRDEYE, STATS & EXPORTS ──
    if (method === "GET") {
      const exportFormat = url.searchParams.get("export");
      const categoryFilter = url.searchParams.get("category") as DetectionCategory | undefined;
      const targetFilter = url.searchParams.get("target")?.toLowerCase();

      // ── Export CSV des incidents ──
      if (exportFormat === "csv") {
        const csvRows = [
          ["ID", "Date", "Heure", "Catégorie", "Gravité", "Joueur", "ID Joueur", "Heuristique", "Détails", "Atténué"].join(";"),
          ...inMemoryIncidents.map((i) => {
            const d = new Date(i.timestamp);
            return [
              i.id,
              d.toISOString().slice(0, 10),
              d.toTimeString().slice(0, 8),
              i.category,
              i.severity.toUpperCase(),
              `"${i.targetName.replace(/"/g, '""')}"`,
              i.targetId,
              `"${i.heuristic.replace(/"/g, '""')}"`,
              `"${i.details.replace(/"/g, '""')}"`,
              i.autoMitigated ? "OUI" : "NON",
            ].join(";");
          }),
        ];

        return new Response(csvRows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="thirdeye_incidents_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // ── Filtrage et Agrégation ──
      let incidents = [...inMemoryIncidents];
      if (categoryFilter) incidents = incidents.filter((i) => i.category === categoryFilter);
      if (targetFilter) incidents = incidents.filter((i) => i.targetName.toLowerCase().includes(targetFilter) || i.targetId.toLowerCase().includes(targetFilter));

      incidents.sort((a, b) => b.timestamp - a.timestamp);

      const categoryBreakdown: Record<DetectionCategory, number> = {
        speed_teleport: inMemoryIncidents.filter((i) => i.category === "speed_teleport").length,
        weapon_spawning: inMemoryIncidents.filter((i) => i.category === "weapon_spawning").length,
        godmode_health: inMemoryIncidents.filter((i) => i.category === "godmode_health").length,
        money_injection: inMemoryIncidents.filter((i) => i.category === "money_injection").length,
        noclip_fly: inMemoryIncidents.filter((i) => i.category === "noclip_fly").length,
        vehicle_hack: inMemoryIncidents.filter((i) => i.category === "vehicle_hack").length,
        hydro_bypass: inMemoryIncidents.filter((i) => i.category === "hydro_bypass").length,
      };

      const flaggedPlayers: FlaggedPlayer[] = [
        {
          identifier: "suspect_h_pnf",
          displayName: "Occupant Villa Portneuf",
          trustScore: 78,
          riskLevel: "ELEVATED",
          totalFlags: 2,
          lastFlagTime: Date.now() - 45000,
          flagCategories: ["hydro_bypass"],
          pingMs: 24,
        },
      ];

      const report: ThirdEyeStatsReport = {
        overallThreatLevel: inMemoryIncidents.some((i) => i.severity === "critical") ? "CRITICAL" : inMemoryIncidents.length > 5 ? "ELEVATED" : "LOW",
        securityPosture: currentSecurityPosture,
        averageTrustScore: 94.5,
        inspectedPacketsPerSec: 185,
        activeWatchlistCount: flaggedPlayers.length,
        autoMitigationsToday: inMemoryIncidents.filter((i) => i.autoMitigated).length,
        uptimeSeconds: Math.floor((Date.now() - serviceStartTime) / 1000),
        categoryBreakdown,
        flaggedPlayers,
        recentIncidents: incidents.slice(0, 50),
      };

      return new Response(JSON.stringify({ ok: true, data: report, timestamp: Date.now() }), { status: 200, headers });
    }

    // ── 2. POST : ENREGISTRER UN INCIDENT OU AJUSTER LA POSTURE DE SÉCURITÉ ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, posture, incident } = body;

      // Changement de posture de sécurité
      if (action === "set_posture") {
        if (!posture || !["relaxed", "balanced", "strict", "lockdown"].includes(posture)) {
          return new Response(JSON.stringify({ ok: false, error: "invalid_posture" }), { status: 400, headers });
        }

        currentSecurityPosture = posture as SecurityPosture;
        return new Response(
          JSON.stringify({
            ok: true,
            message: `Posture de sécurité ThirdEye basculée en mode [${currentSecurityPosture.toUpperCase()}].`,
            posture: currentSecurityPosture,
          }),
          { status: 200, headers }
        );
      }

      // Signalement / Enregistrement d'un incident de triche
      if (action === "report_incident" || incident) {
        const raw = incident || body;
        const newIncident: ThreatDetectionEvent = {
          id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          category: raw.category || "speed_teleport",
          severity: raw.severity || "medium",
          targetId: raw.targetId || "unknown_player",
          targetName: raw.targetName || "Citoyen Inconnu",
          heuristic: raw.heuristic || "Détection comportementale anormale",
          details: raw.details || "Écart de trajectoire ou manipulation de mémoire client",
          autoMitigated: raw.autoMitigated !== undefined ? Boolean(raw.autoMitigated) : true,
          mitigationAction: raw.mitigationAction || "silent_flag",
        };

        inMemoryIncidents.unshift(newIncident);

        if (inMemoryIncidents.length > 500) {
          inMemoryIncidents.pop();
        }

        // Relais vers Intellectus
        try {
          await handleIntellectus(request);
        } catch {
          // Fallback
        }

        return new Response(
          JSON.stringify({
            ok: true,
            message: `Incident [${newIncident.category}] consigné dans le registre ThirdEye.`,
            incident: newIncident,
          }),
          { status: 201, headers }
        );
      }

      return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
    }

    // ── 3. DELETE : PURGE DES DRAPEAUX ET FAUX POSITIFS ──
    if (method === "DELETE") {
      const targetId = url.searchParams.get("targetId");
      if (targetId) {
        const initial = inMemoryIncidents.length;
        const remaining = inMemoryIncidents.filter((i) => i.targetId !== targetId);
        inMemoryIncidents.length = 0;
        inMemoryIncidents.push(...remaining);

        return new Response(
          JSON.stringify({
            ok: true,
            message: `Drapeaux et historique de détection purgés pour le joueur [${targetId}].`,
            clearedCount: initial - remaining.length,
          }),
          { status: 200, headers }
        );
      }

      // Purge globale de l'historique
      const total = inMemoryIncidents.length;
      inMemoryIncidents.length = 0;

      return new Response(
        JSON.stringify({
          ok: true,
          message: `${total} incidents de sécurité ThirdEye purgés.`,
        }),
        { status: 200, headers }
      );
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

export const Route = createFileRoute("/admin/thirdeye/stats")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});