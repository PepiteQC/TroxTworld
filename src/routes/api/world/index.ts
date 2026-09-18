/**
 * État du Monde, Climat & Saisons Québécoises (/api/world)
 * Fichier: src/routes/api/world/index.ts
 */
import { createFileRoute } from "@tanstack/react-router";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export const Route = createFileRoute("/api/world/")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            ok: true,
            world: {
              region: "MRC de Portneuf, Québec",
              season: "hiver",
              condition: "light_snow",
              temperatureCelsius: -8.5,
              windSpeedKmH: 26,
              windChillCelsius: -16.2,
              snowAccumulationCm: 18.4,
              plowStatus: "en_cours",
              activeAlert: "Avertissement de poudrerie sur la Route 138",
              serverTimeHour: 14.5, // 14h30
              timestamp: Date.now(),
            },
          }),
          { status: 200, headers: JSON_HEADERS }
        );
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});

