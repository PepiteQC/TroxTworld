/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🚨 CENTRALE 911 & DISPATCH CAD/MDT — COMTÉ DE PORTNEUF (/api/rp/dispatch)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Système de Répartition des Urgences & Terminaux Mobiles (MDT) :
 *  - 🚔 Sûreté du Québec (SQ — Postes de Portneuf & Donnacona)
 *  - 🚑 Services Préhospitaliers d'Urgence & Paramédics (CTAQ/EMS)
 *  - 🚒 Sécurité Incendie & Sauvetage Nautique/Hors-route
 *  - 🚜 Voirie & Déneigement du Ministère des Transports (MTQ)
 *  - 🌲 Protection de la Faune du Québec (MFFP)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

// ─── 1. TYPES & CODES D'URGENCE QUÉBÉCOIS ───────────────────────────────────

export type DepartmentId = "sq" | "ems" | "fire" | "mtq" | "mffp";
export type PriorityLevel = "code1" | "code2" | "code3" | "panic";
export type CallStatus = "pending" | "dispatched" | "on_scene" | "resolved" | "cancelled";

export type Code10 =
  | "10-4"   // Bien reçu / Compris
  | "10-6"   // Occupé / En pause
  | "10-7"   // Hors service / Fin de quart
  | "10-8"   // En service / Disponible pour appel
  | "10-10"  // Contrôle routier en cours
  | "10-17"  // En route vers l'appel d'urgence
  | "10-20"  // Demande de localisation / Position
  | "10-97"  // Arrivé sur les lieux de l'intervention
  | "10-99"  // 🚨 URGENCE VITALE / Officier ou paramédic en détresse
  | "code4"; // Situation maîtrisée / Sous contrôle

export interface DispatchCall {
  id: string;
  cadNumber: string;
  timestamp: number;
  callerName: string;
  callerPhone?: string;
  department: DepartmentId;
  priority: PriorityLevel;
  title: string;
  description: string;
  location: {
    x: number;
    y: number;
    z: number;
    street?: string;
    village: string;
  };
  assignedUnits: string[];
  status: CallStatus;
  resolvedAt?: number;
  resolutionNotes?: string;
}

export interface UnitRosterEntry {
  callsign: string;
  officerName: string;
  badgeNumber: string;
  department: DepartmentId;
  statusCode: Code10;
  statusLabel: string;
  currentLocation?: { x: number; y: number; z: number; heading?: number };
  assignedCallId?: string;
  vehicleType: string;
  radioFrequencyMhz?: number;
  lastUpdate: number;
}

export interface DispatchStats {
  activeCallsCount: number;
  pendingCallsCount: number;
  resolvedTodayCount: number;
  unitsOnDutyCount: number;
  unitsAvailableCount: number;
  averageResponseTimeSec: number;
  panicActive: boolean;
  departmentBreakdown: Record<DepartmentId, number>;
}

// ─── 2. TAMPON EN MÉMOIRE VIVE DU CAD / DISPATCH 911 ─────────────────────────

const bootTime = Date.now();

const callsMap = new Map<string, DispatchCall>([
  [
    `call_${bootTime - 180000}`,
    {
      id: `call_${bootTime - 180000}`,
      cadNumber: "CAD-2026-0842",
      timestamp: bootTime - 180000,
      callerName: "Témoin Anonyme",
      callerPhone: "418-555-0199",
      department: "sq",
      priority: "code3",
      title: "Braquage à main armée — Caisse Populaire",
      description: "Deux individus armés aperçus près du comptoir. Véhicule de fuite noir de type berline stationné à l'extérieur.",
      location: {
        x: -420,
        y: 4.2,
        z: -20,
        street: "Rue Saint-Charles",
        village: "Portneuf",
      },
      assignedUnits: ["PORTNEUF-104", "PORTNEUF-106"],
      status: "dispatched",
    },
  ],
  [
    `call_${bootTime - 90000}`,
    {
      id: `call_${bootTime - 90000}`,
      cadNumber: "CAD-2026-0843",
      timestamp: bootTime - 90000,
      callerName: "Centrale Hydro-Québec",
      department: "mtq",
      priority: "code2",
      title: "Poteau électrique brisé / Fil sous tension",
      description: "Vent violent et poudrerie. Fil sous tension traversant la route 138 au km 268.",
      location: {
        x: 120,
        y: 5.0,
        z: 4,
        street: "Route 138 (km 268)",
        village: "Cap-Santé",
      },
      assignedUnits: ["MTQ-PATROUILLE-02"],
      status: "on_scene",
    },
  ],
]);

const unitsMap = new Map<string, UnitRosterEntry>([
  [
    "PORTNEUF-104",
    {
      callsign: "PORTNEUF-104",
      officerName: "Agent Bouchard",
      badgeNumber: "SQ-482",
      department: "sq",
      statusCode: "10-17",
      statusLabel: "En route vers appel (CAD-2026-0842)",
      currentLocation: { x: -380, y: 4.0, z: -10, heading: 90 },
      assignedCallId: `call_${bootTime - 180000}`,
      vehicleType: "Ford Police Interceptor Utility",
      radioFrequencyMhz: 104.2,
      lastUpdate: bootTime - 15000,
    },
  ],
  [
    "PORTNEUF-106",
    {
      callsign: "PORTNEUF-106",
      officerName: "Capitaine Gosselin",
      badgeNumber: "SQ-101",
      department: "sq",
      statusCode: "10-17",
      statusLabel: "En route vers appel (CAD-2026-0842)",
      currentLocation: { x: -400, y: 4.0, z: -15, heading: 45 },
      assignedCallId: `call_${bootTime - 180000}`,
      vehicleType: "Chevrolet Tahoe PPV 4x4",
      radioFrequencyMhz: 104.2,
      lastUpdate: bootTime - 10000,
    },
  ],
  [
    "AMBULANCE-201",
    {
      callsign: "AMBULANCE-201",
      officerName: "Paramédic Tremblay",
      badgeNumber: "EMS-77",
      department: "ems",
      statusCode: "10-8",
      statusLabel: "En service / Disponible en caserne",
      currentLocation: { x: -250, y: 4.0, z: 20, heading: 180 },
      vehicleType: "Ambulance Crestline Type III",
      radioFrequencyMhz: 108.5,
      lastUpdate: bootTime - 60000,
    },
  ],
  [
    "MTQ-PATROUILLE-02",
    {
      callsign: "MTQ-PATROUILLE-02",
      officerName: "Opérateur Lavoie",
      badgeNumber: "MTQ-19",
      department: "mtq",
      statusCode: "10-97",
      statusLabel: "Sur les lieux (Sécurisation 138)",
      currentLocation: { x: 120, y: 5.0, z: 4, heading: 270 },
      assignedCallId: `call_${bootTime - 90000}`,
      vehicleType: "Camion Chasse-Neige Mack Granite",
      radioFrequencyMhz: 154.1,
      lastUpdate: bootTime - 5000,
    },
  ],
]);

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Admin-Role, X-Actor-Id, X-Officer-Callsign",
} as const;

// ─── 3. GESTIONNAIRE DE REQUÊTES SERVEUR TANSTACK ────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  try {
    const nowTs = Date.now();

    // ── 1. GET : CONSULTATION DES APPELS 911, UNITÉS & STATS CAD ──
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const deptFilter = url.searchParams.get("department")?.toLowerCase() as DepartmentId | undefined;
      const statusFilter = url.searchParams.get("status")?.toLowerCase() as CallStatus | undefined;
      const priorityFilter = url.searchParams.get("priority")?.toLowerCase() as PriorityLevel | undefined;
      const callsign = url.searchParams.get("callsign")?.toUpperCase();
      const callId = url.searchParams.get("callId");

      // A. Appel spécifique
      if (callId) {
        const call = callsMap.get(callId);
        if (!call) {
          return new Response(
            JSON.stringify({ ok: false, error: "call_not_found", message: "Fiche CAD introuvable." }),
            { status: 404, headers: JSON_HEADERS }
          );
        }
        return new Response(JSON.stringify({ ok: true, call }), { status: 200, headers: JSON_HEADERS });
      }

      const allCalls = Array.from(callsMap.values());
      const allUnits = Array.from(unitsMap.values());

      // B. Statistiques CAD Globales
      if (isStats) {
        const activeCalls = allCalls.filter((c) => c.status !== "resolved" && c.status !== "cancelled");
        const deptCounts: Record<DepartmentId, number> = { sq: 0, ems: 0, fire: 0, mtq: 0, mffp: 0 };
        for (const c of activeCalls) {
          deptCounts[c.department] = (deptCounts[c.department] || 0) + 1;
        }

        const stats: DispatchStats = {
          activeCallsCount: activeCalls.length,
          pendingCallsCount: allCalls.filter((c) => c.status === "pending").length,
          resolvedTodayCount: allCalls.filter((c) => c.status === "resolved").length,
          unitsOnDutyCount: allUnits.filter((u) => u.statusCode !== "10-7").length,
          unitsAvailableCount: allUnits.filter((u) => u.statusCode === "10-8").length,
          averageResponseTimeSec: 48,
          panicActive: allCalls.some((c) => c.priority === "panic" && c.status !== "resolved"),
          departmentBreakdown: deptCounts,
        };

        return new Response(
          JSON.stringify({ ok: true, data: stats, timestamp: nowTs }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      // C. Filtrage des Appels
      let calls = allCalls;
      if (deptFilter) calls = calls.filter((c) => c.department === deptFilter);
      if (statusFilter) calls = calls.filter((c) => c.status === statusFilter);
      if (priorityFilter) calls = calls.filter((c) => c.priority === priorityFilter);
      if (callsign) calls = calls.filter((c) => c.assignedUnits.includes(callsign));

      calls.sort((a, b) => b.timestamp - a.timestamp);

      // D. Filtrage des Unités
      let units = allUnits;
      if (deptFilter) units = units.filter((u) => u.department === deptFilter);

      return new Response(
        JSON.stringify({
          ok: true,
          totalCalls: calls.length,
          activeUnitsCount: units.length,
          calls,
          units,
          serverTimestamp: nowTs,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    // ── 2. POST : CRÉATION D'APPELS, BOUTON PANIQUE, STATUTS & RÉPONSES ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: "invalid_json" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const { action } = body;
      if (!action) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_action", message: "Action CAD requise." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      switch (action) {
        // A. CRÉATION D'UN APPEL 911 (CITOYEN OU SYSTÈME)
        case "create_call": {
          const {
            title,
            description,
            department = "sq",
            priority = "code2",
            location,
            callerName = "Citoyen",
            callerPhone,
          } = body;

          if (!title || !location) {
            return new Response(
              JSON.stringify({ ok: false, error: "missing_title_or_location", message: "Titre et coordonnées GPS requis." }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          const callId = `call_${nowTs}_${Math.random().toString(36).slice(2, 6)}`;
          const cadNumber = `CAD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

          const newCall: DispatchCall = {
            id: callId,
            cadNumber,
            timestamp: nowTs,
            callerName,
            callerPhone,
            department: department as DepartmentId,
            priority: priority as PriorityLevel,
            title: String(title),
            description: String(description || ""),
            location: {
              x: location.x || 0,
              y: location.y || 4.0,
              z: location.z || 0,
              street: location.street || "Route principale",
              village: location.village || "Portneuf",
            },
            assignedUnits: [],
            status: "pending",
          };

          callsMap.set(callId, newCall);

          // Télémétrie vers Intellectus
          try {
            await handleIntellectus(request);
          } catch {}

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Appel d'urgence 911 enregistré [${cadNumber}]. Dispatch en attente.`,
              call: newCall,
            }),
            { status: 201, headers: JSON_HEADERS }
          );
        }

        // B. BOUTON DE PANIQUE (OFFICIER EN DÉTRESSE / 10-99 / CODE 30)
        case "panic_button": {
          const { callsign, officerName, location } = body;
          const unit = unitsMap.get(callsign);

          if (unit) {
            unit.statusCode = "10-99";
            unit.statusLabel = "🚨 DÉTRESSE VITALE / CODE 30";
            unit.lastUpdate = nowTs;
          }

          const panicId = `panic_${nowTs}`;
          const panicCall: DispatchCall = {
            id: panicId,
            cadNumber: `PANIC-${Math.floor(100 + Math.random() * 900)}`,
            timestamp: nowTs,
            callerName: `OFFICIER EN DÉTRESSE : ${callsign}`,
            department: unit?.department || "sq",
            priority: "panic",
            title: `🚨 BOUTON PANIQUE ACTIVÉ — ${callsign}`,
            description: `Officier ${officerName || callsign} demande renforts d'urgence immédiats toutes unités disponibles (Code 3).`,
            location: {
              x: location?.x ?? unit?.currentLocation?.x ?? 0,
              y: location?.y ?? unit?.currentLocation?.y ?? 4.0,
              z: location?.z ?? unit?.currentLocation?.z ?? 0,
              street: location?.street || "Position GPS de détresse",
              village: location?.village || "Comté de Portneuf",
            },
            assignedUnits: [],
            status: "pending",
          };

          callsMap.set(panicId, panicCall);

          try {
            await handleIntellectus(request);
          } catch {}

          return new Response(
            JSON.stringify({
              ok: true,
              message: `🚨 ALERTE PANIQUE 10-99 ACTIVÉE pour [${callsign}]. Signalement prioritaire diffusé.`,
              call: panicCall,
            }),
            { status: 201, headers: JSON_HEADERS }
          );
        }

        // C. MISE À JOUR DU STATUT CODE 10 D'UNE UNITÉ
        case "update_unit_status": {
          const { callsign, statusCode, statusLabel, location, vehicleType, radioFrequencyMhz } = body;

          if (!callsign) {
            return new Response(
              JSON.stringify({ ok: false, error: "missing_callsign" }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          let unit = unitsMap.get(callsign);

          if (!unit) {
            unit = {
              callsign,
              officerName: body.officerName || "Patrouilleur",
              badgeNumber: body.badgeNumber || "SQ-000",
              department: body.department || "sq",
              statusCode: (statusCode as Code10) || "10-8",
              statusLabel: statusLabel || "En service / Disponible",
              currentLocation: location ? { x: location.x, y: location.y ?? 4.0, z: location.z, heading: location.heading } : undefined,
              vehicleType: vehicleType || "Véhicule de patrouille",
              radioFrequencyMhz: radioFrequencyMhz || 104.2,
              lastUpdate: nowTs,
            };
            unitsMap.set(callsign, unit);
          } else {
            unit.statusCode = (statusCode as Code10) || unit.statusCode;
            unit.statusLabel = statusLabel || unit.statusLabel;
            if (location) {
              unit.currentLocation = {
                x: location.x,
                y: location.y ?? unit.currentLocation?.y ?? 4.0,
                z: location.z,
                heading: location.heading ?? unit.currentLocation?.heading,
              };
            }
            if (radioFrequencyMhz) unit.radioFrequencyMhz = radioFrequencyMhz;
            unit.lastUpdate = nowTs;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Statut de [${callsign}] mis à jour -> ${unit.statusCode} (${unit.statusLabel})`,
              unit,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // D. TÉLÉMÉTRIE GPS RAPIDE DU VÉHICULE
        case "update_unit_location": {
          const { callsign, x, y, z, heading } = body;
          const unit = unitsMap.get(callsign);

          if (!unit) {
            return new Response(
              JSON.stringify({ ok: false, error: "unit_not_found" }),
              { status: 404, headers: JSON_HEADERS }
            );
          }

          unit.currentLocation = {
            x: Number(x) || 0,
            y: Number(y) || 4.0,
            z: Number(z) || 0,
            heading: Number(heading) || 0,
          };
          unit.lastUpdate = nowTs;

          return new Response(
            JSON.stringify({ ok: true, callsign, location: unit.currentLocation }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // E. RÉPONDRE / ÊTRE ASSIGNÉ À UN APPEL (10-17 EN ROUTE)
        case "respond_call":
        case "assign_unit": {
          const { callId, callsign } = body;
          const call = callsMap.get(callId);
          const unit = unitsMap.get(callsign);

          if (!call) {
            return new Response(
              JSON.stringify({ ok: false, error: "call_not_found", message: "Fiche d'appel introuvable." }),
              { status: 404, headers: JSON_HEADERS }
            );
          }

          if (!call.assignedUnits.includes(callsign)) {
            call.assignedUnits.push(callsign);
          }
          call.status = "dispatched";

          if (unit) {
            unit.statusCode = "10-17";
            unit.statusLabel = `10-17 en route (${call.cadNumber})`;
            unit.assignedCallId = call.id;
            unit.lastUpdate = nowTs;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Unité [${callsign}] assignée à l'appel [${call.cadNumber}]. Coordonnées GPS transmises au MDT.`,
              call,
              unit,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // F. ARRIVÉE SUR LES LIEUX DE L'INTERVENTION (10-97)
        case "arrive_on_scene": {
          const { callId, callsign } = body;
          const call = callsMap.get(callId);
          const unit = unitsMap.get(callsign);

          if (call) call.status = "on_scene";
          if (unit) {
            unit.statusCode = "10-97";
            unit.statusLabel = `10-97 sur les lieux (${call?.cadNumber ?? ""})`;
            unit.lastUpdate = nowTs;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Unité [${callsign}] déclarée 10-97 sur les lieux.`,
              call,
              unit,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // G. CLÔTURER L'APPEL / SITUATION SOUS CONTRÔLE (CODE 4)
        case "resolve_call": {
          const { callId, resolutionNotes = "Intervention terminée avec succès (Code 4)." } = body;
          const call = callsMap.get(callId);

          if (!call) {
            return new Response(
              JSON.stringify({ ok: false, error: "call_not_found" }),
              { status: 404, headers: JSON_HEADERS }
            );
          }

          call.status = "resolved";
          call.resolvedAt = nowTs;
          call.resolutionNotes = resolutionNotes;

          // Libération de toutes les unités assignées
          for (const uCallsign of call.assignedUnits) {
            const unit = unitsMap.get(uCallsign);
            if (unit && unit.assignedCallId === call.id) {
              unit.statusCode = "10-8";
              unit.statusLabel = "10-8 disponible / Code 4";
              unit.assignedCallId = undefined;
              unit.lastUpdate = nowTs;
            }
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Appel CAD [${call.cadNumber}] clôturé (Code 4). Unités libérées et de retour en service.`,
              call,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        default:
          return new Response(
            JSON.stringify({ ok: false, error: "unknown_action", message: "Action CAD non reconnue." }),
            { status: 400, headers: JSON_HEADERS }
          );
      }
    }

    // ── 3. DELETE : PURGE DES ANCIENS APPELS RÉSOLUS ──
    if (method === "DELETE") {
      const initialCount = callsMap.size;
      for (const [id, call] of callsMap.entries()) {
        if (call.status === "resolved" || call.status === "cancelled") {
          callsMap.delete(id);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: `${initialCount - callsMap.size} appels archivés purgés du registre CAD.`,
          remainingCount: callsMap.size,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: "method_not_allowed" }),
      { status: 405, headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

// ─── ROUTEUR TANSTACK START ──────────────────────────────────────────────────

export const Route = createFileRoute("/api/rp/dispatch")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});