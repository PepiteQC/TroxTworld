/**
 * ═══════════════════════════════════════════════════════════════════
 * ⚡ TROXTWORLD / ETHERWORLD — BUS D'ÉVÉNEMENTS ARCADIUS (/admin/bus)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Canaux d'Événements Supervisés :
 *  - 🌍 world    : Climat québécois, Saisons, Déneigement MTQ, Hydro-Québec.
 *  - 💬 chat     : Proximité RP, Radios de police (10-codes), CB Canal 14, Staff.
 *  - 📡 aoi      : Grille spatiale (Area of Interest), Streaming d'entités P2P.
 *  - 🚶 pose     : Télémétrie des joueurs/véhicules, Synchronisation d'animations.
 *  - 🏠 property : Baux notariés, Verrous, Fraude Hydro, Sécurité des portes.
 *  - 🛡️ admin    : Sanctions, Commandes, Téléportations, Superviseur Intellectus.
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type BusChannel = "world" | "chat" | "aoi" | "pose" | "property" | "admin" | "system";

export interface BusEvent {
  id: string;
  timestamp: number;
  channel: BusChannel;
  topic: string;
  senderId: string;
  senderName: string;
  payload: Record<string, unknown> | string | number | boolean;
  priority: "low" | "normal" | "high" | "critical";
  sizeBytes: number;
}

export interface ChannelStats {
  channel: BusChannel;
  totalEvents: number;
  eventsPerSec: number;
  bandwidthKbps: number;
  activeListeners: number;
  lastEventTime: number | null;
}

// ═══════════════════════════════════════════════════════════
// TAMPON DE MÉMOIRE SERVEUR (HISTORIQUE ARCADIUS)
// ═══════════════════════════════════════════════════════════

const MAX_BUFFER_SIZE = 1500;
const inMemoryBusEvents: BusEvent[] = [];

// Initialisation de quelques événements de référence
const now = Date.now();
inMemoryBusEvents.push(
  {
    id: `ev_${now - 45000}`,
    timestamp: now - 45000,
    channel: "world",
    topic: "weather:season_tick",
    senderId: "momentus_core",
    senderName: "Momentus Scheduler",
    payload: { season: "automne", ambientC: 8.5, precipitation: "none", windKmh: 14 },
    priority: "normal",
    sizeBytes: 128,
  },
  {
    id: `ev_${now - 30000}`,
    timestamp: now - 30000,
    channel: "chat",
    topic: "radio:sq_10code",
    senderId: "agent_bouchard",
    senderName: "Agent Bouchard (SQ)",
    payload: { code: "10-4", message: "Patrouille 104 en route sur la 138", channel: "sq_dispatch" },
    priority: "normal",
    sizeBytes: 144,
  },
  {
    id: `ev_${now - 12000}`,
    timestamp: now - 12000,
    channel: "property",
    topic: "hydro:meter_ping",
    senderId: "benedictus_core",
    senderName: "Benedictus Cadastre",
    payload: { propertyId: "H-PNF", loadKw: 3.2, bypassActive: false, gridNormal: true },
    priority: "low",
    sizeBytes: 112,
  },
  {
    id: `ev_${now - 2000}`,
    timestamp: now - 2000,
    channel: "admin",
    topic: "staff:cmd_executed",
    senderId: "admin_1",
    senderName: "Capitaine Gosselin",
    payload: { cmd: "/tp hotel", success: true, targetZone: "Pont-Rouge" },
    priority: "high",
    sizeBytes: 98,
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
    // ── 1. GET : CONSULTATION DU BUS & STATISTIQUES ──
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const channelFilter = url.searchParams.get("channel")?.toLowerCase() as BusChannel | undefined;
      const topicFilter = url.searchParams.get("topic")?.toLowerCase();
      const senderFilter = url.searchParams.get("sender")?.toLowerCase();
      const priorityFilter = url.searchParams.get("priority")?.toLowerCase();
      const search = url.searchParams.get("search")?.toLowerCase();
      
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, Math.min(250, parseInt(url.searchParams.get("limit") || "50", 10)));
      const since = parseInt(url.searchParams.get("since") || "0", 10);
      const until = parseInt(url.searchParams.get("until") || String(Date.now() + 86400000), 10);

      // ── Statistiques des canaux ──
      if (isStats) {
        const channels: BusChannel[] = ["world", "chat", "aoi", "pose", "property", "admin", "system"];
        const stats: ChannelStats[] = channels.map((ch) => {
          const events = inMemoryBusEvents.filter((e) => e.channel === ch);
          const recent10s = events.filter((e) => Date.now() - e.timestamp <= 10000);
          const bytes = events.reduce((acc, e) => acc + e.sizeBytes, 0);

          return {
            channel: ch,
            totalEvents: events.length,
            eventsPerSec: Math.round((recent10s.length / 10) * 10) / 10,
            bandwidthKbps: Math.round(((bytes * 8) / (Math.max(1, (Date.now() - now) / 1000) * 1024)) * 10) / 10,
            activeListeners: ch === "pose" || ch === "aoi" ? 4 : ch === "chat" ? 8 : 2,
            lastEventTime: events.length > 0 ? events[events.length - 1]!.timestamp : null,
          };
        });

        return new Response(
          JSON.stringify({
            ok: true,
            totalBufferedEvents: inMemoryBusEvents.length,
            maxBufferSize: MAX_BUFFER_SIZE,
            channels: stats,
            arcadiusStatus: "ONLINE",
            timestamp: Date.now(),
          }),
          { status: 200, headers }
        );
      }

      // ── Filtrage des événements ──
      let filtered = [...inMemoryBusEvents];

      if (since > 0) filtered = filtered.filter((e) => e.timestamp >= since);
      if (until > 0) filtered = filtered.filter((e) => e.timestamp <= until);
      if (channelFilter) filtered = filtered.filter((e) => e.channel === channelFilter);
      if (topicFilter) filtered = filtered.filter((e) => e.topic.toLowerCase().includes(topicFilter));
      if (senderFilter) filtered = filtered.filter((e) => e.senderName.toLowerCase().includes(senderFilter) || e.senderId.toLowerCase().includes(senderFilter));
      if (priorityFilter) filtered = filtered.filter((e) => e.priority === priorityFilter);
      
      if (search) {
        filtered = filtered.filter((e) =>
          e.topic.toLowerCase().includes(search) ||
          e.senderName.toLowerCase().includes(search) ||
          JSON.stringify(e.payload).toLowerCase().includes(search)
        );
      }

      // Tri antéchronologique (plus récent au plus ancien)
      filtered.sort((a, b) => b.timestamp - a.timestamp);

      const totalCount = filtered.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      return new Response(
        JSON.stringify({
          ok: true,
          page,
          limit,
          totalPages,
          totalCount,
          data: paginated,
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : INJECTION D'UN ÉVÉNEMENT DANS LE BUS ARCADIUS ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { channel = "admin", topic, payload = {}, priority = "normal", senderName = "Superviseur Staff", senderId = "staff_console" } = body;

      if (!topic) {
        return new Response(JSON.stringify({ ok: false, error: "missing_topic" }), { status: 400, headers });
      }

      const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
      const newEvent: BusEvent = {
        id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        channel: channel as BusChannel,
        topic: String(topic),
        senderId: String(senderId),
        senderName: String(senderName),
        payload: payload,
        priority: priority as BusEvent["priority"],
        sizeBytes: Math.max(32, payloadString.length * 2),
      };

      inMemoryBusEvents.push(newEvent);

      if (inMemoryBusEvents.length > MAX_BUFFER_SIZE) {
        inMemoryBusEvents.splice(0, inMemoryBusEvents.length - MAX_BUFFER_SIZE);
      }

      // Transmission optionnelle vers le bus Intellectus interne
      try {
        await handleIntellectus(request);
      } catch {
        // Fallback silencieux
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Événement diffusé avec succès sur le canal [${newEvent.channel}] -> ${newEvent.topic}`,
          event: newEvent,
        }),
        { status: 201, headers }
      );
    }

    // ── 3. DELETE : PURGE DU TAMPON ARCADIUS ──
    if (method === "DELETE") {
      const channelToClear = url.searchParams.get("channel") as BusChannel | null;
      let removedCount = 0;

      if (channelToClear) {
        const initialCount = inMemoryBusEvents.length;
        const remaining = inMemoryBusEvents.filter((e) => e.channel !== channelToClear);
        inMemoryBusEvents.length = 0;
        inMemoryBusEvents.push(...remaining);
        removedCount = initialCount - remaining.length;
      } else {
        removedCount = inMemoryBusEvents.length;
        inMemoryBusEvents.length = 0;
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: `${removedCount} événements purgés du bus Arcadius.`,
          channelCleared: channelToClear || "all",
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

export const Route = createFileRoute("/admin/bus")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});