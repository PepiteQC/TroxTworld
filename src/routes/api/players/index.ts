/**
 * Registre des Citoyens du Comté (/api/players)
 * Fichier: src/routes/api/players/index.ts
 */
import { createFileRoute } from "@tanstack/react-router";

export interface RPPlayerRecord {
  id: string;
  name: string;
  sin: string; // Numéro d'assurance sociale québécois (NAS/SIN)
  job: string;
  cash: number;
  bank: number;
  wantedLevel: number;
  isArrested: boolean;
  isInjured: boolean;
  hunger: number;
  thirst: number;
  town: string;
  createdAt: number;
}

// Mémoire vive / Mock partagé (remplaçable par getSql() / PostgreSQL)
export const PLAYERS_DB = new Map<string, RPPlayerRecord>([
  [
    "cit-001",
    {
      id: "cit-001",
      name: "Jean-François Gagnon",
      sin: "948-201-382",
      job: "Mécanicien",
      cash: 420.50,
      bank: 3850.00,
      wantedLevel: 0,
      isArrested: false,
      isInjured: false,
      hunger: 85,
      thirst: 90,
      town: "Portneuf",
      createdAt: Date.now() - 86400000 * 10,
    },
  ],
  [
    "cit-002",
    {
      id: "cit-002",
      name: "Marc-André Lavoie",
      sin: "812-409-121",
      job: "Agent Sûreté du Québec",
      cash: 180.00,
      bank: 6200.00,
      wantedLevel: 0,
      isArrested: false,
      isInjured: false,
      hunger: 95,
      thirst: 100,
      town: "Donnacona",
      createdAt: Date.now() - 86400000 * 30,
    },
  ],
]);

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

async function handleGet({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const town = url.searchParams.get("town")?.toLowerCase();
  const wantedOnly = url.searchParams.get("wanted") === "true";

  let list = Array.from(PLAYERS_DB.values());
  if (town) list = list.filter((p) => p.town.toLowerCase() === town);
  if (wantedOnly) list = list.filter((p) => p.wantedLevel > 0);

  return new Response(
    JSON.stringify({ ok: true, count: list.length, players: list }),
    { status: 200, headers: JSON_HEADERS }
  );
}

async function handlePost({ request }: { request: Request }): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<RPPlayerRecord>;
    if (!body.name || !body.id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Nom et identifiant requis" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const newCitizen: RPPlayerRecord = {
      id: body.id,
      name: body.name,
      sin: body.sin ?? `${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}`,
      job: body.job ?? "Sans-emploi",
      cash: body.cash ?? 250.00,
      bank: body.bank ?? 1500.00,
      wantedLevel: 0,
      isArrested: false,
      isInjured: false,
      hunger: 100,
      thirst: 100,
      town: body.town ?? "Portneuf",
      createdAt: Date.now(),
    };

    PLAYERS_DB.set(newCitizen.id, newCitizen);

    return new Response(
      JSON.stringify({ ok: true, player: newCitizen, message: "Citoyen enregistré au registre civil !" }),
      { status: 201, headers: JSON_HEADERS }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: "JSON invalide" }),
      { status: 400, headers: JSON_HEADERS }
    );
  }
}

export const Route = createFileRoute("/api/players/")({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});

