/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🔒 ÉTABLISSEMENT DE DÉTENTION DE PORTNEUF — SYSTÈME CARCÉRAL (/api/rp/prison)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Gestionnaire du centre pénitentiaire & des cellules municipales :
 *  - ⏱️ Calcul dynamique et précis du temps de détention (Horodatages UNIX).
 *  - 💵 Caution, libération conditionnelle et remise de peine pour bonne conduite.
 *  - 🔪 Fouilles cellulaires, inventaire de contrebande & mise à l'isolement (Trou).
 *  - 🚨 Tentatives d'évasion avec transmission d'alerte en temps réel à Intellectus.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type CellBlock = "general" | "solitary" | "infirmary";

export interface Inmate {
  playerId: string;
  name: string;
  crimeReason: string;
  arrestingOfficer: string;
  sentenceTotalSeconds: number;
  sentenceRemainingSeconds: number;
  incarceratedAt: number;
  releaseAt: number;
  cellNumber: string;
  block: CellBlock;
  bailAmount: number | null; // Caution en $ CAD (null = sans possibilité de caution)
  contrabandItems: string[];
  goodBehaviorScore: number; // 0 à 100 (facilite la libération anticipée)
  isEscaped: boolean;
}

// ─── REGISTRE EN MÉMOIRE VIVE DU CENTRE PÉNITENTIAIRE ─────────────────────────

const prisonPopulation = new Map<string, Inmate>([
  [
    "cit-suspect-99",
    {
      playerId: "cit-suspect-99",
      name: "Éric 'Le Loup' Tremblay",
      crimeReason: "Excès de vitesse majeur sur la 138 et refus d'obtempérer",
      arrestingOfficer: "Agent Tremblay (Badge SQ-841)",
      sentenceTotalSeconds: 600,
      sentenceRemainingSeconds: 420,
      incarceratedAt: Date.now() - 180000,
      releaseAt: Date.now() + 420000,
      cellNumber: "Cellule 04",
      block: "general",
      bailAmount: 1850,
      contrabandItems: ["paquet_tabac"],
      goodBehaviorScore: 75,
      isEscaped: false,
    },
  ],
]);

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Player-Id",
} as const;

/** Met à jour le temps de sentence restant pour un détenu */
function refreshInmateSentence(inmate: Inmate): Inmate {
  const now = Date.now();
  if (inmate.isEscaped) {
    return inmate;
  }
  const remainingMs = Math.max(0, inmate.releaseAt - now);
  inmate.sentenceRemainingSeconds = Math.ceil(remainingMs / 1000);
  return inmate;
}

// ─── GESTIONNAIRE DE REQUÊTES SERVEUR ────────────────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  try {
    // ── 1. GET : CONSULTATION DU REGISTRE DES DÉTENUS ──
    if (method === "GET") {
      const playerId = url.searchParams.get("playerId");

      if (playerId) {
        const rawInmate = prisonPopulation.get(playerId);
        if (!rawInmate) {
          return new Response(
            JSON.stringify({ ok: true, incarcerated: false, inmate: null }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        const inmate = refreshInmateSentence(rawInmate);

        // Libération automatique si la peine est purgée
        if (inmate.sentenceRemainingSeconds <= 0 && !inmate.isEscaped) {
          prisonPopulation.delete(playerId);
          return new Response(
            JSON.stringify({
              ok: true,
              incarcerated: false,
              inmate: null,
              message: "Peine complétée. Citoyen libéré du centre de détention.",
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        return new Response(
          JSON.stringify({ ok: true, incarcerated: true, inmate }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      // Liste complète des prisonniers
      const activeInmates: Inmate[] = [];
      for (const [id, raw] of prisonPopulation.entries()) {
        const inmate = refreshInmateSentence(raw);
        if (inmate.sentenceRemainingSeconds <= 0 && !inmate.isEscaped) {
          prisonPopulation.delete(id);
        } else {
          activeInmates.push(inmate);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          facilityName: "Centre de détention provincial de Portneuf",
          count: activeInmates.length,
          inmates: activeInmates,
          timestamp: Date.now(),
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    // ── 2. POST : ACTIONS CARCÉRALES (Écrou, Caution, Fouille, Évasion) ──
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

      const {
        action,
        playerId,
        name,
        crimeReason = "Infraction criminelle",
        arrestingOfficer = "Patrouille SQ",
        sentenceDuration = 300,
        cell = "Cellule A-01",
        bailAmount = null,
        item,
      } = body;

      if (!action || !playerId) {
        return new Response(
          JSON.stringify({ ok: false, error: "Paramètres 'action' et 'playerId' requis." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const now = Date.now();
      let targetInmate = prisonPopulation.get(playerId);

      switch (action) {
        // A. MISE SOUS ÉCROU / INCARCÉRATION
        case "incarcerate": {
          const durationSeconds = Math.max(30, Number(sentenceDuration) || 300);
          const newInmate: Inmate = {
            playerId,
            name: name || "Détenu non-identifié",
            crimeReason,
            arrestingOfficer,
            sentenceTotalSeconds: durationSeconds,
            sentenceRemainingSeconds: durationSeconds,
            incarceratedAt: now,
            releaseAt: now + durationSeconds * 1000,
            cellNumber: cell,
            block: "general",
            bailAmount: typeof bailAmount === "number" ? bailAmount : null,
            contrabandItems: [],
            goodBehaviorScore: 100,
            isEscaped: false,
          };

          prisonPopulation.set(playerId, newInmate);

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Écrou validé : ${newInmate.name} incarcéré pour ${durationSeconds} secondes.`,
              inmate: newInmate,
            }),
            { status: 201, headers: JSON_HEADERS }
          );
        }

        // B. LIBÉRATION IMMÉDIATE (Peine purgée, grâce ou acquittement)
        case "release": {
          if (!targetInmate) {
            return new Response(
              JSON.stringify({ ok: false, error: "Le citoyen n'est pas incarcéré." }),
              { status: 404, headers: JSON_HEADERS }
            );
          }
          prisonPopulation.delete(playerId);
          return new Response(
            JSON.stringify({ ok: true, message: "Détenu libéré avec restitution de ses effets personnels." }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // C. PAIEMENT DE LA CAUTION (Bail)
        case "pay_bail": {
          if (!targetInmate) {
            return new Response(
              JSON.stringify({ ok: false, error: "Détenu introuvable." }),
              { status: 404, headers: JSON_HEADERS }
            );
          }
          if (targetInmate.bailAmount === null) {
            return new Response(
              JSON.stringify({ ok: false, error: "Caution refusée pour ce type de crime." }),
              { status: 400, headers: JSON_HEADERS }
            );
          }
          prisonPopulation.delete(playerId);
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Caution de ${targetInmate.bailAmount} $ CAD acquittée. Détenu libéré sous conditions.`,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // D. MISE À L'ISOLEMENT / LE TROU
        case "solitary": {
          if (!targetInmate) {
            return new Response(
              JSON.stringify({ ok: false, error: "Détenu introuvable." }),
              { status: 404, headers: JSON_HEADERS }
            );
          }
          targetInmate.block = "solitary";
          targetInmate.cellNumber = "Isolement (Trou)";
          targetInmate.goodBehaviorScore = Math.max(0, targetInmate.goodBehaviorScore - 25);
          // Ajout de 60 secondes de pénalité
          targetInmate.releaseAt += 60000;
          refreshInmateSentence(targetInmate);

          return new Response(
            JSON.stringify({
              ok: true,
              message: "Détenu transféré au bloc d'isolement disciplinaire (+60s de peine).",
              inmate: targetInmate,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // E. FOUILLE CELLULAIRE ET SAISIE DE CONTREBANDE
        case "search_and_confiscate": {
          if (!targetInmate) {
            return new Response(
              JSON.stringify({ ok: false, error: "Détenu introuvable." }),
              { status: 404, headers: JSON_HEADERS }
            );
          }
          const confiscated = [...targetInmate.contrabandItems];
          targetInmate.contrabandItems = [];

          let penaltyMsg = "Fouille corporelle négative : aucun objet prohibé.";
          if (confiscated.length > 0) {
            targetInmate.goodBehaviorScore = Math.max(0, targetInmate.goodBehaviorScore - 30);
            targetInmate.releaseAt += 120000; // +2 minutes
            penaltyMsg = `Objets saisis : [${confiscated.join(", ")}]. Peine alourdie de 2 minutes.`;
          }

          refreshInmateSentence(targetInmate);

          return new Response(
            JSON.stringify({
              ok: true,
              confiscatedCount: confiscated.length,
              confiscatedItems: confiscated,
              message: penaltyMsg,
              inmate: targetInmate,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // F. INTRODUCTION CLANDESTINE DE CONTREBANDE
        case "add_contraband": {
          if (!targetInmate) {
            return new Response(
              JSON.stringify({ ok: false, error: "Détenu introuvable." }),
              { status: 404, headers: JSON_HEADERS }
            );
          }
          const contraband = item || "surin_artisanal";
          targetInmate.contrabandItems.push(contraband);

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Objet [${contraband}] dissimulé avec succès dans la cellule.`,
              inmate: targetInmate,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // G. TENTATIVE D'ÉVASION
        case "attempt_escape": {
          if (!targetInmate) {
            return new Response(
              JSON.stringify({ ok: false, error: "Détenu introuvable." }),
              { status: 404, headers: JSON_HEADERS }
            );
          }

          targetInmate.isEscaped = true;
          targetInmate.cellNumber = "ÉVADÉ";

          // Relais de télémétrie vers Intellectus pour générer les mandats SQ
          try {
            await handleIntellectus(request);
          } catch {
            // Ignorer si hors-ligne
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: "🚨 ALERTE ROUGE : Évasion confirmée ! Toutes les unités de la SQ sont mobilisées.",
              inmate: targetInmate,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        default:
          return new Response(
            JSON.stringify({ ok: false, error: "Action pénitentiaire non reconnue." }),
            { status: 400, headers: JSON_HEADERS }
          );
      }
    }

    return new Response(
      JSON.stringify({ ok: false, error: "Méthode HTTP non autorisée" }),
      { status: 405, headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "prison_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

// ─── ROUTAGE TANSTACK START ──────────────────────────────────────────────────

export const Route = createFileRoute("/api/rp/prison")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});