/**
 * ═══════════════════════════════════════════════════════════
 * STORE SERVEUR — État global & Clés d'authentification
 * ═══════════════════════════════════════════════════════════
 * Architecture : Zero-GC State Access, Memory-safe, Env-Aware.
 */

// ==========================================
// CONFIGURATION & SÉCURITÉ
// ==========================================

export const ADMIN_KEY = process.env.ADMIN_KEY || "troxt-dev-key";
export const JWT_SECRET = process.env.JWT_SECRET || "troxt-dev-jwt-secret-change-in-prod";

// Audit de sécurité au démarrage
if (process.env.NODE_ENV === "production") {
  if (ADMIN_KEY === "troxt-dev-key" || JWT_SECRET.includes("change-in-prod")) {
    console.warn("⚠️ [SECURITY ALARM] Le serveur tourne en PRODUCTION avec des clés de développement vulnérables !");
  }
}

// ==========================================
// ÉTAT GLOBAL (SINGLETON MEMORY)
// ==========================================

export interface ServerState {
  readonly startedAt: number; // Immuable après l'initialisation
  totalConnections: number;
  activeRooms: number;
}

// Allocation mémoire unique au démarrage
const serverState: ServerState = {
  startedAt: Date.now(),
  totalConnections: 0,
  activeRooms: 0,
};

// ==========================================
// API D'ACCÈS ET MUTATION
// ==========================================

/**
 * Retourne l'état global du serveur.
 * ZERO-GC : Retourne une référence directe (pas de spread opérateur `{...}`).
 * TypeScript empêche la mutation grâce au type Readonly<T>.
 */
export function getServerState(): Readonly<ServerState> {
  return serverState;
}

/**
 * Incrémente le compteur de connexions actives.
 */
export function incrementConnections(): void {
  serverState.totalConnections++;
}

/**
 * Décrémente le compteur (avec garde contre les valeurs négatives sans utiliser Math.max).
 */
export function decrementConnections(): void {
  if (serverState.totalConnections > 0) {
    serverState.totalConnections--;
  }
}

/**
 * Met à jour le nombre de rooms actives de manière stricte.
 */
export function setActiveRooms(count: number): void {
  // Empêche l'injection de valeurs négatives ou NaN
  serverState.activeRooms = count >= 0 ? count : 0;
}