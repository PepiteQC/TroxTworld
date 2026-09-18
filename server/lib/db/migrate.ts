/**
 * ═══════════════════════════════════════════════════════════════════
 * 🔄 DATABASE MIGRATION RUNNER
 * ═══════════════════════════════════════════════════════════════════
 */

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

async function runMigrations() {
  console.log("🔄 [Drizzle Migration] Application des schémas de base de données...");
  try {
    // Dossier où sont stockées tes migrations SQL Drizzle
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ [Drizzle Migration] Toutes les tables ont été synchronisées avec succès !");
  } catch (error) {
    console.error("❌ [Drizzle Migration] Échec de la migration :", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}
