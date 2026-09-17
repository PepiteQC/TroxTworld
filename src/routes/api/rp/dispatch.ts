/**
 * ═══════════════════════════════════════════════════════════════════
 * 🚨 TROXTWORLD / ETHERWORLD — API DISPATCH 911 & CAD/MDT (/api/rp/dispatch)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Système d'Urgence & Dispatching des Services Publics du Comté :
 *  - 🚔 Sûreté du Québec (SQ - Postes Portneuf & Donnacona)
 *  - 🚑 Services Préhospitaliers & Urgences-santé (EMS)
 *  - 🚒 Service de Sécurité Incendie (Pompiers)
 *  - 🚜 Ministère des Transports (MTQ - Déneigement & Voirie)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type DepartmentId = "sq" | "ems" | "fire" | "mtq" | "mffp";
export type PriorityLevel = "code1" | "code2" | "code3" | "panic";
export type CallStatus = "pending" | "dispatched" | "on_scene" | "resolved" | "cancelled";

export type Code10 = 
  | "10-4"   // Bien reçu / Compris
  | "10-6"   // Occupé
  | "10-7"   // Hors service
  | "10-8"   // En service / Disponible
  | "10-17"  // En route vers l'appel
  | "10-20"  // Position / Localisation
  | "10-97"  // Arrivé sur les lieux
  | "10-99"  // URGENCE VITALE / Officier en détresse
  | "code4"; // Situation sous contrôle

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
  currentLocation?: { x: number; z: number };
  assignedCallId?: string;
  vehicleType: string;
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

// ═══════════════════════════════════════════════════════════
// TAMPON EN MÉMOIRE CAD / DISPATCH (PORTNEUF 911)
// ═══════════════════════════════════════════════════════════

const now = Date.now();

const inMemoryCalls: DispatchCall[] = [
  {
    id: `call_${now - 180000}`,
    cadNumber: "CAD-2026-0842",
    timestamp: now - 180000,
    callerName: "Témoin Anonyme",
    callerPhone: "418-555-0199",
    department: "sq",
    priority: "code3",
    title: "Braquage en cours — Caisse Populaire",
    description: "Deux individus armés aperçus près de la voûte. Véhicule de fuite noir stationné dehors.",
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
  {
    id: `call_${now - 90000}`,
    cadNumber: "CAD-2026-0843",
    timestamp: now - 90000,
    callerName: "Centrale Hydro-Québec",
    department: "mtq",
    priority: "code2",
    title: "Poteau électrique brisé / Fil sur la chaussée",
    description: "Vent violent et verglas. Fil sous tension traversant la route 138.",
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
];

const inMemoryUnits: UnitRosterEntry[] = [
  {
    callsign: "PORTNEUF-104",
    officerName: "Agent Bouchard",
    badgeNumber: "SQ-482",
    department: "sq",
    statusCode: "10-17",
    statusLabel: "En route vers appel",
    currentLocation: { x: -380, z: -10 },
    assignedCallId: `call_${now - 180000}`,
    vehicleType: "Ford Police Interceptor Utility",
    lastUpdate: now - 15000,
  },
  {
    callsign: "PORTNEUF-106",
    officerName: "Capitaine Gosselin",
    badgeNumber: "SQ-101",
    department: "sq",
    statusCode: "10-17",
    statusLabel: "En route vers appel",
    currentLocation: { x: -400, z: -15 },
    assignedCallId: `call_${now - 180000}`,
    vehicleType: "Chevrolet Tahoe PPV",
    lastUpdate: now - 10000,
  },
  {
    callsign: "AMBULANCE-201",
    officerName: "Paramédic Tremblay",
    badgeNumber: "EMS-77",
    department: "ems",
    statusCode: "10-8",
    statusLabel: "Disponible en caserne",
    currentLocation: { x: -250, z: 20 },
    vehicleType: "Ambulance Crestline Type III",
    lastUpdate: now - 60000,
  },
  {
    callsign: "MTQ-PATROUILLE-02",
    officerName: "Opérateur Lavoie",
    badgeNumber: "MTQ-19",
    department: "mtq",
    statusCode: "10-97",
    statusLabel: "Sur les lieux",
    currentLocation: { x: 120, z: 4 },
    assignedCallId: `call_${now - 90000}`,
    vehicleType: "Camion Charrue Mack Granite",
    lastUpdate: now - 5000,
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id, X-Officer-Callsign",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ── 1. GET : CONSULTATION DU CAD, APPELS 911, ROSTER & STATS ──
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const deptFilter = url.searchParams.get("department")?.toLowerCase() as DepartmentId | undefined;
      const statusFilter = url.searchParams.get("status")?.toLowerCase() as CallStatus | undefined;
      const priorityFilter = url.searchParams.get("priority")?.toLowerCase() as PriorityLevel | undefined;
      const callsign = url.searchParams.get("callsign")?.toUpperCase();

      // ── Statistiques CAD Globales ──
      if (isStats) {
        const active = inMemoryCalls.filter((c) => c.status !== "resolved" && c.status !== "cancelled");
        const deptCounts: Record<DepartmentId, number> = { sq: 0, ems: 0, fire: 0, mtq: 0, mffp: 0 };
        for (const c of active) deptCounts[c.department] = (deptCounts[c.department] || 0) + 1;

        const stats: DispatchStats = {
          activeCallsCount: active.length,
          pendingCallsCount: inMemoryCalls.filter((c) => c.status === "pending").length,
          resolvedTodayCount: inMemoryCalls.filter((c) => c.status === "resolved").length,
          unitsOnDutyCount: inMemoryUnits.filter((u) => u.statusCode !== "10-7").length,
          unitsAvailableCount: inMemoryUnits.filter((u) => u.statusCode === "10-8").length,
          averageResponseTimeSec: 48,
          panicActive: inMemoryCalls.some((c) => c.priority === "panic" && c.status !== "resolved"),
          departmentBreakdown: deptCounts,
        };

        return new Response(JSON.stringify({ ok: true, data: stats, timestamp: Date.now() }), { status: 200, headers });
      }

      // ── Filtrage des Appels ──
      let calls = [...inMemoryCalls];
      if (deptFilter) calls = calls.filter((c) => c.department === deptFilter);
      if (statusFilter) calls = calls.filter((c) => c.status === statusFilter);
      if (priorityFilter) calls = calls.filter((c) => c.priority === priorityFilter);
      if (callsign) calls = calls.filter((c) => c.assignedUnits.includes(callsign));

      calls.sort((a, b) => b.timestamp - a.timestamp);

      // ── Filtrage des Unités ──
      let units = [...inMemoryUnits];
      if (deptFilter) units = units.filter((u) => u.department === deptFilter);

      return new Response(
        JSON.stringify({
          ok: true,
          totalCalls: calls.length,
          activeUnits: units.length,
          calls,
          units,
          serverTimestamp: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : CRÉATION D'APPELS, BOUTON DE PANIQUE, STATUTS & RÉPONSES ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action } = body;
      if (!action) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action" }), { status: 400, headers });
      }

      const nowTs = Date.now();

      switch (action) {
        // ── A. CRÉATION D'UN APPEL CITOYEN 911 ──
        case "create_call": {
          const { title, description, department = "sq", priority = "code2", location, callerName = "Citoyen", callerPhone } = body;

          if (!title || !location) {
            return new Response(JSON.stringify({ ok: false, error: "missing_title_or_location" }), { status: 400, headers });
          }

          const cadNumber = `CAD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
          const newCall: DispatchCall = {
            id: `call_${nowTs}`,
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

          inMemoryCalls.unshift(newCall);

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Appel d'urgence 911 enregistré [${cadNumber}]`,
              call: newCall,
            }),
            { status: 201, headers }
          );
        }

        // ── B. BOUTON DE PANIQUE (OFFICIER EN DÉTRESSE / 10-99) ──
        case "panic_button": {
          const { callsign, officerName, location } = body;
          const unit = inMemoryUnits.find((u) => u.callsign === callsign);
          if (unit) {
            unit.statusCode = "10-99";
            unit.statusLabel = "🚨 DÉTRESSE VITALE / CODE 30";
            unit.lastUpdate = nowTs;
          }

          const panicCall: DispatchCall = {
            id: `panic_${nowTs}`,
            cadNumber: `PANIC-${Math.floor(100 + Math.random() * 900)}`,
            timestamp: nowTs,
            callerName: `OFFICIER EN DÉTRESSE: ${callsign}`,
            department: unit?.department || "sq",
            priority: "panic",
            title: `🚨 BOUTON PANIQUE ACTIVÉ — ${callsign}`,
            description: `Officier ${officerName || callsign} demande renforts immédiats toutes unités disponibles (Code 3).`,
            location: {
              x: location?.x || unit?.currentLocation?.x || 0,
              y: location?.y || 4.0,
              z: location?.z || unit?.currentLocation?.z || 0,
              street: location?.street || "Position GPS d'urgence",
              village: location?.village || "Comté de Portneuf",
            },
            assignedUnits: [],
            status: "pending",
          };

          inMemoryCalls.unshift(panicCall);

          return new Response(
            JSON.stringify({
              ok: true,
              message: `🚨 ALERTE PANIQUE ACTIVÉE pour l'unité [${callsign}]. Signalement prioritaire diffusé.`,
              call: panicCall,
            }),
            { status: 201, headers }
          );
        }

        // ── C. MISE À JOUR DU STATUT CODE 10 D'UNE UNITÉ ──
        case "update_unit_status": {
          const { callsign, statusCode, statusLabel, location } = body;
          let unit = inMemoryUnits.find((u) => u.callsign === callsign);

          if (!unit) {
            unit = {
              callsign,
              officerName: body.officerName || "Patrouilleur",
              badgeNumber: body.badgeNumber || "SQ-000",
              department: body.department || "sq",
              statusCode: (statusCode as Code10) || "10-8",
              statusLabel: statusLabel || "En service",
              currentLocation: location ? { x: location.x, z: location.z } : undefined,
              vehicleType: body.vehicleType || "Véhicule de patrouille",
              lastUpdate: nowTs,
            };
            inMemoryUnits.push(unit);
          } else {
            unit.statusCode = (statusCode as Code10) || unit.statusCode;
            unit.statusLabel = statusLabel || unit.statusLabel;
            if (location) unit.currentLocation = { x: location.x, z: location.z };
            unit.lastUpdate = nowTs;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Statut de [${callsign}] mis à jour -> ${unit.statusCode} (${unit.statusLabel})`,
              unit,
            }),
            { status: 200, headers }
          );
        }

        // ── D. ASSIGNER / RÉPONDRE À UN APPEL 911 ──
        case "respond_call":
        case "assign_unit": {
          const { callId, callsign } = body;
          const call = inMemoryCalls.find((c) => c.id === callId);
          const unit = inMemoryUnits.find((u) => u.callsign === callsign);

          if (!call) {
            return new Response(JSON.stringify({ ok: false, error: "call_not_found" }), { status: 404, headers });
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
              message: `Unité [${callsign}] assignée à l'appel [${call.cadNumber}]`,
              call,
            }),
            { status: 200, headers }
          );
        }

        // ── E. RÉSOUDRE / CLÔTURER UN APPEL (CODE 4) ──
        case "resolve_call": {
          const { callId, resolutionNotes = "Intervention complétée avec succès (Code 4)", officerCallsign } = body;
          const call = inMemoryCalls.find((c) => c.id === callId);

          if (!call) {
            return new Response(JSON.stringify({ ok: false, error: "call_not_found" }), { status: 404, headers });
          }

          call.status = "resolved";
          call.resolvedAt = nowTs;
          call.resolutionNotes = resolutionNotes;

          // Libérer les unités assignées
          for (const uCallsign of call.assignedUnits) {
            const unit = inMemoryUnits.find((u) => u.callsign === uCallsign);
            if (unit && unit.assignedCallId === call.id) {
              unit.statusCode = "10-8";
              unit.statusLabel = "Disponible / Code 4";
              unit.assignedCallId = undefined;
              unit.lastUpdate = nowTs;
            }
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Appel CAD [${call.cadNumber}] clôturé (Code 4).`,
              call,
            }),
            { status: 200, headers }
          );
        }

        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }
    }

    // ── 3. DELETE : PURGE DES ANCIENS APPELS RÉSOLUS ──
    if (method === "DELETE") {
      const initialCount = inMemoryCalls.length;
      const activeOnly = inMemoryCalls.filter((c) => c.status !== "resolved" && c.status !== "cancelled");
      inMemoryCalls.length = 0;
      inMemoryCalls.push(...activeOnly);

      return new Response(
        JSON.stringify({
          ok: true,
          message: `${initialCount - activeOnly.length} appels archivés purgés du système CAD.`,
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