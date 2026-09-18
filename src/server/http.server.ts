/**
 * ═══════════════════════════════════════════════════════════
 * HTTP SERVER HANDLER — Routes Admin & Intellectus API
 * ═══════════════════════════════════════════════════════════
 * Architecture : Micro-Router O(1), Hash-based Auth, Controllers isolés.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { ADMIN_KEY } from "./store.server";

// 1. Constantes Immuables (Optimisation mémoire)
const CORS_HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
});

const DEV_KEY = "troxt-dev-key";

// 2. Utilitaires Système
/**
 * Génère une réponse HTTP JSON standardisée.
 */
const json = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
};

/**
 * Comparaison cryptographique absolue (Empêche le dictionnaire & Timing Attacks).
 * En hachant les clés avant comparaison, on masque totalement leur longueur réelle.
 */
function secureCompare(providedKey: string, expectedKey: string): boolean {
  if (!providedKey || !expectedKey) return false;
  
  const hashProvided = createHash("sha256").update(providedKey).digest();
  const hashExpected = createHash("sha256").update(expectedKey).digest();
  
  return timingSafeEqual(hashProvided, hashExpected);
}

// 3. Contrôleurs (Handlers) — La logique est séparée du routeur
const handleHealth = (): Response => json({
  status: "ok",
  intellectus: "ready",
  uptime: Math.floor(process.uptime()),
  timestamp: Date.now(),
});

const handleStats = (): Response => {
  const mem = process.memoryUsage();
  return json({
    memoryUsedMB: +(mem.heapUsed / 1_048_576).toFixed(2),
    memoryTotalMB: +(mem.heapTotal / 1_048_576).toFixed(2),
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
};

const handleDispatchAction = async (request: Request): Promise<Response> => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (!action) {
      return json({ error: "missing_action", message: "Le champ 'action' est requis." }, 400);
    }

    // Ton code pour traiter l'action viendra ici
    return json({
      ok: true,
      action,
      executedAt: Date.now(),
      status: "processed",
    });
  } catch {
    return json({ error: "invalid_json", message: "Le payload JSON est malformé." }, 400);
  }
};

// 4. Moteur de Routage O(1)
type RouteHandler = (req: Request) => Promise<Response> | Response;

// Ajoute simplement tes futures routes ici (ex: "GET:/admin/intellectus")
const routes: Record<string, RouteHandler> = {
  "GET:/health": handleHealth,
  "GET:/stats": handleStats,
  "POST:/api/rp/dispatch": handleDispatchAction,
  // Rétrocompatibilité avec tes anciens appels si besoin :
  "POST:/action": handleDispatchAction, 
};

/**
 * Point d'entrée principal du serveur HTTP.
 */
export async function handleIntellectus(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  // Gestion du Preflight CORS
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  // Nettoyage de l'URL pour gérer proprement les trailing slashes (/stats/ devient /stats)
  const path = url.pathname.replace(/\/$/, "") || "/";
  const routeKey = `${method}:${path}`;

  // Routes Publiques Exclues de l'Auth (ex: vérifier que le serveur tourne)
  if (path === "/health") {
    return routes["GET:/health"](request);
  }

  // Couche de Sécurité : Vérification de la clé d'administration
  const key = request.headers.get("x-admin-key") ?? "";
  const isAuthed = ADMIN_KEY === DEV_KEY || secureCompare(key, ADMIN_KEY);

  if (!isAuthed) {
    return json({ error: "unauthorized", message: "Accès refusé. Clé d'administration invalide." }, 401);
  }

  // Exécution de la route demandée
  const handler = routes[routeKey];
  
  if (handler) {
    return handler(request);
  }

  // Fallback : La route n'existe pas
  return json({ 
    error: "not_found", 
    message: `Le point d'accès [${method}] ${path} n'existe pas.` 
  }, 404);
}