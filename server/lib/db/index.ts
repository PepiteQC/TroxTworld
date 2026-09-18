/**
 * ═══════════════════════════════════════════════════════════════════
 * ⚡ DATABASE CLIENT & POOL ACCESS — SERVER COUPLING
 * ═══════════════════════════════════════════════════════════════════
 * Initialise le pool de connexions Drizzle avec PostgreSQL (node-postgres).
 * Optimisé pour supporter les requêtes simultanées de 128 joueurs.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/troxtworld";

// Pool de connexions ultra-robuste avec gestion des timeouts pour éviter les fuites (Zero leaks)
export const pool = new pg.Pool({
  connectionString,
  max: parseInt(process.env.DB_POOL_MAX || "20", 10), // Max connexions simultanées
  idleTimeoutMillis: 30000,                          // Temps avant de fermer une connexion inactive
  connectionTimeoutMillis: 5000,                     // Timeout de tentative de connexion
});

// Événements de surveillance du pool pour le monitoring d'administration
pool.on("error", (err) => {
  console.error("🚨 [Postgres Pool Error] Erreur inattendue sur un client inactif :", err);
});

export const db = drizzle(pool, { schema });

console.log("💾 [Drizzle DB Client] Pool de connexions PostgreSQL initialisé.");
