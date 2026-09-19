/**
 * TroxTWorld / EtherWorld — Validateur d'Environnement Serveur Typé & Sécurisé.
 */

export function env(key: string, defaultValue?: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || defaultValue;
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
 * Workspace preview vs deployed app.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}