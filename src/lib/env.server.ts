/**
<<<<<<< HEAD
 * ═════════════════════════════════════════════════════════════════════════════
 * VALIDATEUR D'ENVIRONNEMENT SERVEUR TYPÉ & SÉCURISÉ — TROXTWORLD / PORTNEUF
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Gestionnaire de configuration immuable pour le backend et les micro-services :
 *  - Extraction sécurisée des variables d'environnement (Node.js, Bun, Edge).
 *  - Validation stricte des types (nombres, booléens, tableaux, ports).
 *  - Avertissements de sécurité en production (clés par défaut interdites).
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─── 1. ACCÈS SÉCURISÉ ET VALIDATEURS PRIMITIFS ──────────────────────────────

/**
 * Récupère une variable d'environnement de manière sûre.
 */
export function env(key: string, defaultValue?: string): string | undefined {
  if (typeof process === "undefined" || !process.env) {
    return defaultValue;
  }
  const raw = process.env[key];
  if (raw === undefined || raw === null) return defaultValue;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : defaultValue;
=======
 * TroxTWorld / EtherWorld — Validateur d'Environnement Serveur Typé & Sécurisé.
 */

export function env(key: string, defaultValue?: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || defaultValue;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

export function envRequired(key: string): string {
  const v = env(key);
  if (!v) {
    throw new Error(`[ENV ERROR] La variable d'environnement obligatoire "${key}" est manquante.`);
  }
  return v;
}

export function envNumber(key: string, defaultValue: number): number {
  const v = env(key);
  if (!v) return defaultValue;
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultValue;
}

export function envBoolean(key: string, defaultValue: boolean): boolean {
  const v = env(key)?.toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

// ==========================================
// CONFIGURATION SERVEUR TYPÉE GLOBALE
// ==========================================

export const SERVER_CONFIG = {
  isDev: (process.env.NODE_ENV ?? "development") === "development",
  port: envNumber("PORT", 3000),
  host: env("HOST", "0.0.0.0")!,
  adminKey: env("ADMIN_KEY", "troxt-dev-key")!,
  jwtSecret: env("JWT_SECRET", "troxt_super_secret_jwt_key_rp_quebec_2025")!,
  db: {
    databaseUrl: env("DATABASE_URL", "file:./data/etherworld.db")!,
    sqlitePath: env("SQLITE_DB_PATH", "./data/etherworld.db")!,
    lotusPath: env("LOTUS_DB_PATH", "./data/etherprism.db")!,
  },
  colyseusPort: envNumber("COLYSEUS_PORT", 3000),
  corsOrigin: env("CORS_ORIGIN", "*")!,
} as const;

/**
<<<<<<< HEAD
 * Exige la présence d'une variable d'environnement sous peine de stopper le serveur.
 */
export function envRequired(key: string): string {
  const v = env(key);
  if (!v) {
    throw new Error(`\x1b[31m[CRITICAL ENV ERROR]\x1b[0m La variable obligatoire "${key}" est absente du fichier .env ou du système.`);
  }
  return v;
}

/**
 * Convertit une variable en nombre avec validation de limites optionnelle.
 */
export function envNumber(key: string, defaultValue: number, min?: number, max?: number): number {
  const v = env(key);
  if (!v) return defaultValue;
  const n = Number(v);
  if (!Number.isFinite(n)) return defaultValue;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

/**
 * Valide et convertit un numéro de port réseau (1 à 65535).
 */
export function envPort(key: string, defaultPort: number): number {
  return envNumber(key, defaultPort, 1, 65535);
}

/**
 * Interprète intelligemment les valeurs booléennes standard ("true", "1", "yes", "on").
 */
export function envBoolean(key: string, defaultValue: boolean): boolean {
  const v = env(key)?.toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

/**
 * Découpe une liste de valeurs séparées par un délimiteur (ex: CORS, admins).
 */
export function envArray(key: string, defaultValues: string[] = [], delimiter = ","): string[] {
  const v = env(key);
  if (!v) return defaultValues;
  return v
    .split(delimiter)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// ─── 2. DÉTECTION D'ENVIRONNEMENT D'EXÉCUTION ────────────────────────────────

const nodeEnv = env("NODE_ENV", "development")!.toLowerCase();
const isDev = nodeEnv === "development" || nodeEnv === "dev";
const isProd = nodeEnv === "production" || nodeEnv === "prod";
const isTest = nodeEnv === "test";

// Clés de repli de développement
const DEFAULT_JWT_SECRET = "troxt_super_secret_jwt_key_rp_quebec_2025_dev";
const DEFAULT_ADMIN_KEY = "troxt-dev-key";

// ─── 3. AUDIT DE SÉCURITÉ AU DÉMARRAGE ───────────────────────────────────────

if (isProd) {
  const currentJwt = env("JWT_SECRET");
  if (!currentJwt || currentJwt === DEFAULT_JWT_SECRET) {
    console.warn(
      "\x1b[33m⚠️ [SECURITY WARNING]\x1b[0m JWT_SECRET utilise la clé par défaut en PRODUCTION ! Définissez une clé sécurisée dans vos variables d'environnement."
    );
  }
  const currentAdmin = env("ADMIN_KEY");
  if (!currentAdmin || currentAdmin === DEFAULT_ADMIN_KEY) {
    console.warn(
      "\x1b[33m⚠️ [SECURITY WARNING]\x1b[0m ADMIN_KEY utilise la clé par défaut en PRODUCTION !"
    );
  }
}

// ─── 4. CONFIGURATION TYPÉE GLOBALE DU SERVEUR ──────────────────────────────

export const SERVER_CONFIG = {
  // Statut
  env: nodeEnv,
  isDev,
  isProd,
  isTest,

  // Réseau HTTP / WebSocket
  port: envPort("PORT", 3000),
  host: env("HOST", "0.0.0.0")!,
  colyseusPort: envPort("COLYSEUS_PORT", 3000),
  corsOrigin: env("CORS_ORIGIN", "*")!,
  corsOrigins: envArray("CORS_ORIGINS", ["*"]),

  // Authentification & Sécurité
  adminKey: env("ADMIN_KEY", DEFAULT_ADMIN_KEY)!,
  jwtSecret: env("JWT_SECRET", DEFAULT_JWT_SECRET)!,
  jwtExpiresIn: env("JWT_EXPIRES_IN", "7d")!,

  // Bases de données (SQLite / Drizzle / Lotus)
  db: {
    databaseUrl: env("DATABASE_URL", "file:./data/etherworld.db")!,
    sqlitePath: env("SQLITE_DB_PATH", "./data/etherworld.db")!,
    lotusPath: env("LOTUS_DB_PATH", "./data/etherprism.db")!,
  },

  // Taux de rafraîchissement & Gameplay
  game: {
    patchRateFps: envNumber("COLYSEUS_PATCH_RATE", 20, 5, 60),
    aoiRadius: envNumber("VITE_AOI_RADIUS", 350, 50, 1500),
    maxStepMeters: envNumber("VITE_ANTICHEAT_MAX_STEP_M", 200),
  },
} as const;

/**
 * Détermine si l'application tourne dans un aperçu de conteneur ou en production.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID") && isDev;
=======
 * Workspace preview vs deployed app.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}