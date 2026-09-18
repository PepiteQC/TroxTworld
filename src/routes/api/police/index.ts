/**
 * Quartier Général Sûreté du Québec — District Portneuf (/api/police)
 * Fichier: src/routes/api/police/index.ts
 */
import { createFileRoute } from "@tanstack/react-router";
import { PLAYERS_DB } from "../players/index";

export interface PoliceWarrant {
  id: string;
  citizenId: string;
  citizenName: string;
  reason: string;
  wantedLevel: number;
  fineAmount: number;
  officerBadge: string;
  createdAt: number;
}

const WARRANTS_REGISTRY: PoliceWarrant[] = [
  {
    id: "MANDAT-001",
    citizenId: "cit-suspect-99",
    citizenName: "Éric 'Le Loup' Tremblay",
    reason: "Excès de vitesse majeur sur la 138 et refus d'obtempérer",
    wantedLevel: 3,
    fineAmount: 1850,
    officerBadge: "SQ-841",
    createdAt: Date.now() - 3600000,
  },
];

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

async function handlePoliceGet(): Promise<Response> {
  return new Response(
    JSON.stringify({
      ok: true,
      department: "Sûreté du Québec — Poste MRC de Portneuf",
      activeWarrants: WARRANTS_REGISTRY,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
}

async function handlePolicePost({ request }: { request: Request }): Promise<Response> {
  try {
    const body = (await request.json()) as {
      action: "issue_warrant" | "arrest" | "issue_fine" | "release";
      citizenId: string;
      reason?: string;
      wantedLevel?: number;
      fineAmount?: number;
      officerBadge?: string;
    };

    const citizen = PLAYERS_DB.get(body.citizenId);
    if (!citizen) {
      return new Response(
        JSON.stringify({ ok: false, error: "Citoyen introuvable." }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    switch (body.action) {
      case "issue_warrant":
        citizen.wantedLevel = body.wantedLevel ?? 1;
        const newWarrant: PoliceWarrant = {
          id: `MANDAT-${Date.now().toString().slice(-4)}`,
          citizenId: citizen.id,
          citizenName: citizen.name,
          reason: body.reason ?? "Infraction au Code de la sécurité routière",
          wantedLevel: citizen.wantedLevel,
          fineAmount: body.fineAmount ?? 350,
          officerBadge: body.officerBadge ?? "SQ-000",
          createdAt: Date.now(),
        };
        WARRANTS_REGISTRY.push(newWarrant);
        return new Response(
          JSON.stringify({ ok: true, warrant: newWarrant, message: "Avis de recherche émis sur les ondes de la SQ." }),
          { status: 201, headers: JSON_HEADERS }
        );

      case "arrest":
        citizen.isArrested = true;
        citizen.wantedLevel = 0;
        return new Response(
          JSON.stringify({ ok: true, message: "Individu placé en état d'arrestation (Cellule municipale)." }),
          { status: 200, headers: JSON_HEADERS }
        );

      case "release":
        citizen.isArrested = false;
        return new Response(
          JSON.stringify({ ok: true, message: "Individu libéré sous caution." }),
          { status: 200, headers: JSON_HEADERS }
        );

      default:
        return new Response(
          JSON.stringify({ ok: false, error: "Action de police non reconnue." }),
          { status: 400, headers: JSON_HEADERS }
        );
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Requête invalide" }), { status: 400, headers: JSON_HEADERS });
  }
}

export const Route = createFileRoute("/api/police/")({
  server: {
    handlers: {
      GET: handlePoliceGet,
      POST: handlePolicePost,
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});

