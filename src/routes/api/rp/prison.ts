import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export interface Inmate {
  playerId: string;
  name: string;
  sentenceRemainingSeconds: number;
  cellNumber: string;
  contrabandItems: string[];
  inSolitary: boolean;
}

const prisonPopulation = new Map<string, Inmate>();

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const method = request.method.toUpperCase();
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    if (method === "GET") {
      const url = new URL(request.url);
      const playerId = url.searchParams.get("playerId");
      
      if (playerId) {
        const inmate = prisonPopulation.get(playerId);
        return new Response(JSON.stringify({ ok: true, incarcerated: !!inmate, inmate }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ ok: true, count: prisonPopulation.size, inmates: Array.from(prisonPopulation.values()) }), { status: 200, headers });
    }

    if (method === "POST") {
      const body = await request.json();
      const { action, playerId, name, sentenceDuration = 300, cell = "A-1" } = body;

      switch (action) {
        case "incarcerate": {
          const inmate: Inmate = {
            playerId,
            name: name || "Détenu",
            sentenceRemainingSeconds: sentenceDuration,
            cellNumber: cell,
            contrabandItems: [],
            inSolitary: false,
          };
          prisonPopulation.set(playerId, inmate);
          break;
        }
        case "release":
          prisonPopulation.delete(playerId);
          break;
        case "solitary": {
          const inmate = prisonPopulation.get(playerId);
          if (inmate) inmate.inSolitary = true;
          break;
        }
        case "add_contraband": {
          const inmate = prisonPopulation.get(playerId);
          if (inmate) inmate.contrabandItems.push(body.item || "surin");
          break;
        }
        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }

      try { await handleIntellectus(request); } catch {}
      return new Response(JSON.stringify({ ok: true, count: prisonPopulation.size }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500, headers });
  }
}

export const Route = createFileRoute("/api/rp/prison")({
  server: {
    handlers: { GET: handleServerRequest, POST: handleServerRequest, OPTIONS: handleServerRequest },
  },
});
