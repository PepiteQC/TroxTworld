<<<<<<< HEAD
/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ⚡ CONFIGURATION DRIZZLE ORM / DRIZZLE-KIT — TROXTWORLD (PostgreSQL)
 * Fichier: drizzle.config.ts
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Chargement des variables d'environnement
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:pepite127@127.0.0.1:5432/troxt_db";

export default defineConfig({
  schema: ["./src/db/schema.ts", "./src/db/**/*.ts"],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
=======
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'pepite127', // 👈 Ton mot de passe postgres
    database: 'troxt_db',
    ssl: false,
  },
  verbose: true,
  strict: true,
});
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
