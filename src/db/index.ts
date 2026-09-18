import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';

let dbInstance: any = null;

export function initDatabase() {
  if (dbInstance) return dbInstance;

  const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:pepite127@127.0.0.1:5432/troxt_db';

  try {
    const pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 3000,
    });
    dbInstance = drizzlePg(pool, { schema });
    console.log('⚡ [Drizzle] Connecté à PostgreSQL (troxt_db)');
  } catch (err) {
    console.warn('⚠️ [Drizzle] PostgreSQL inaccessible, utilisation de PGlite en mémoire...', err);
    const pglite = new PGlite();
    dbInstance = drizzlePglite(pglite, { schema });
  }

  return dbInstance;
}

export const db = initDatabase();
export * from './schema';
