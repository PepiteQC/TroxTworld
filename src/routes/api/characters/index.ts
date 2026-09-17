/**
 * ═══════════════════════════════════════════════════════════════════
 * 👥 TROXTWORLD / ETHERWORLD — API ENREGISTREMENT CITOYENS (/api/characters/)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleRpRest } from "@/server/rpRest.server";

export interface CharacterSummary {
  id: string;
  neq: string; // Numéro d'État civil québécois
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "M" | "F";
  cash: number;
  bank: number;
  job: string;
  currentZone: string;
  isDead: boolean;
  registeredAt: number;
}

const inMemoryCharacters = new Map<string, CharacterSummary>();

// Enregistrement d'un citoyen par défaut
inMemoryCharacters.set("local_player", {
  id: "local_player",
  neq: "1994-BC-8842",
  firstName: "Benoit",
  lastName: "Gagnon",
  birthDate: "1994-06-14",
  gender: "M",
  cash: 450,
  bank: 148500,
  job: "camionneur_teamsters",
  currentZone: "Portneuf",
  isDead: false,
  registeredAt: Date.now() - 86400000 * 30,
});

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
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
      const search = url.searchParams.get("search")?.toLowerCase();
      let list = Array.from(inMemoryCharacters.values());

      if (search) {
        list = list.filter(
          (c) =>
            c.firstName.toLowerCase().includes(search) ||
            c.lastName.toLowerCase().includes(search) ||
            c.neq.toLowerCase().includes(search)
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          count: list.length,
          characters: list,
          timestamp: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    if (method === "POST") {
      const body = await request.json();
      const { firstName, lastName, birthDate, gender = "M" } = body;

      if (!firstName || !lastName || !birthDate) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_fields", message: "Prénom, nom et date de naissance requis." }),
          { status: 400, headers }
        );
      }

      const id = `char_${Date.now()}`;
      const neq = `${birthDate.slice(0, 4)}-${gender}C-${Math.floor(1000 + Math.random() * 9000)}`;

      const newChar: CharacterSummary = {
        id,
        neq,
        firstName,
        lastName,
        birthDate,
        gender,
        cash: 500, // Capital de départ
        bank: 2500,
        job: "unemployed",
        currentZone: "Portneuf",
        isDead: false,
        registeredAt: Date.now(),
      };

      inMemoryCharacters.set(id, newChar);

      try { await handleRpRest(request); } catch {}

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Nouveau citoyen enregistré au registre d'état civil : ${firstName} ${lastName} (NEQ: ${neq}).`,
          character: newChar,
        }),
        { status: 201, headers }
      );
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal_server_error", message: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers }
    );
  }
}

export const Route = createFileRoute("/api/characters/")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});