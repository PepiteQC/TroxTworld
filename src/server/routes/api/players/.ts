/**
 * Fiche Citoyenne Individuelle (/api/players/$id)
 * Fichier: src/routes/api/players/$id.ts
 */
import { createFileRoute } from "@tanstack/react-router";
import { PLAYERS_DB } from "./index";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

async function handleGet({ params }: { params: { id: string } }): Promise<Response> {
  const citizen = PLAYERS_DB.get(params.id);
  if (!citizen) {
    return new Response(
      JSON.stringify({ ok: false, error: "Citoyen introuvable" }),
      { status: 404, headers: JSON_HEADERS }
    );
  }
  return new Response(JSON.stringify({ ok: true, player: citizen }), { status: 200, headers: JSON_HEADERS });
}

async function handlePatch({ params, request }: { params: { id: string }; request: Request }): Promise<Response> {
  const citizen = PLAYERS_DB.get(params.id);
  if (!citizen) {
    return new Response(
      JSON.stringify({ ok: false, error: "Citoyen introuvable" }),
      { status: 404, headers: JSON_HEADERS }
    );
  }

  try {
    const updates = (await request.json()) as Partial<typeof citizen>;
    Object.assign(citizen, updates);
    PLAYERS_DB.set(params.id, citizen);

    return new Response(JSON.stringify({ ok: true, player: citizen }), { status: 200, headers: JSON_HEADERS });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Corps JSON invalide" }), { status: 400, headers: JSON_HEADERS });
  }
}

export const Route = createFileRoute("/api/players/$id")({
  server: {
    handlers: {
      GET: handleGet,
      PATCH: handlePatch,
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});