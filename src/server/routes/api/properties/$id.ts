/**
 * ═════════════════════════════════════════════════════════════════════════════
 * GESTION D'UN BIEN IMMOBILIER INDIVIDUEL (/api/properties/$id)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Actions disponibles :
 *  - GET : Consultation de la fiche descriptive et de l'état de la serrure.
 *  - POST : Achat de titre, signature de bail ou verrouillage / déverrouillage.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { PROPERTIES_REGISTRY } from "./index";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

async function handleGetProperty({ params }: { params: { id: string } }): Promise<Response> {
  const property = PROPERTIES_REGISTRY.find(
    (p) => p.id.toLowerCase() === params.id.toLowerCase()
  );

  if (!property) {
    return new Response(
      JSON.stringify({ ok: false, error: "not_found", message: "Bien immobilier introuvable au registre foncier." }),
      { status: 404, headers: JSON_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      property,
      timestamp: Date.now(),
    }),
    { status: 200, headers: JSON_HEADERS }
  );
}

async function handlePostPropertyAction({
  params,
  request,
}: {
  params: { id: string };
  request: Request;
}): Promise<Response> {
  const property = PROPERTIES_REGISTRY.find(
    (p) => p.id.toLowerCase() === params.id.toLowerCase()
  );

  if (!property) {
    return new Response(
      JSON.stringify({ ok: false, error: "not_found", message: "Propriété inexistante." }),
      { status: 404, headers: JSON_HEADERS }
    );
  }

  let body: { action?: string; playerId?: string; playerName?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid_json" }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const { action, playerId, playerName } = body;

  switch (action) {
    case "lock_door":
      property.locked = true;
      return new Response(
        JSON.stringify({ ok: true, locked: true, message: "Porte verrouillée à clé." }),
        { status: 200, headers: JSON_HEADERS }
      );

    case "unlock_door":
      property.locked = false;
      return new Response(
        JSON.stringify({ ok: true, locked: false, message: "Porte déverrouillée." }),
        { status: 200, headers: JSON_HEADERS }
      );

    case "buy":
      if (!property.forSale) {
        return new Response(
          JSON.stringify({ ok: false, error: "not_for_sale", message: "Ce bien n'est pas à vendre." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      property.ownerId = playerId ?? "citizen_unknown";
      property.ownerName = playerName ?? "Nouveau Propriétaire";
      property.forSale = false;
      return new Response(
        JSON.stringify({ ok: true, property, message: "Acte de vente notarié complété avec succès !" }),
        { status: 200, headers: JSON_HEADERS }
      );

    case "rent":
      if (!property.forRent) {
        return new Response(
          JSON.stringify({ ok: false, error: "not_for_rent", message: "Ce bien n'est pas à louer." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      property.ownerId = playerId ?? "tenant_unknown";
      property.ownerName = playerName ?? "Locataire";
      return new Response(
        JSON.stringify({ ok: true, property, message: "Bail de location signé avec succès !" }),
        { status: 200, headers: JSON_HEADERS }
      );

    default:
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_action", message: "Action non reconnue." }),
        { status: 400, headers: JSON_HEADERS }
      );
  }
}

export const Route = createFileRoute("/api/properties/$id")({
  server: {
    handlers: {
      GET: handleGetProperty,
      POST: handlePostPropertyAction,
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});