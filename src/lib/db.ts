/**
 * TroxTWorld / EtherWorld — Pont d'accès Database Intelligent (PostgreSQL / PGLite Fallback).
 * Détection automatique du protocole pour éviter les conflits SQLite/Postgres.
 */

import { pendingMigrations } from "../../scripts/migration-plan.mjs";

export type DbSource = "neon" | "pglite";

const rawDatabaseUrl =
  typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
const databaseUrl =
  rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : undefined;

/**
 * SÉCURITÉ METTRE-À-JOUR : On n'active Neon (Postgres distant) QUE si l'URL 
 * commence par "postgres://" ou "postgresql://". 
 * Si c'est une URL SQLite (comme file:xxx.db), on utilise PGLite pour éviter le crash SASL.
 */
const isRealPostgres = 
  databaseUrl && 
  (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"));

export const dbSource: DbSource = isRealPostgres ? "neon" : "pglite";

export interface Sql {
  /** Tagged template query standard : sql`SELECT * FROM users WHERE id = ${userId}` */
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;

  /** Exécution de requête paramétrée directe : sql.query("SELECT * FROM users WHERE id = $1", [id]) */
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<T[]>;

  /** Retourne le premier résultat ou null : await sql.first`SELECT * FROM users WHERE id = ${id}` */
  first<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T | null>;

  /** Requête directe retournant le premier résultat ou null */
  firstQuery<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<T | null>;

  /** Exécute un bloc de requêtes dans une transaction atomique ACID */
  transaction<T>(callback: (tx: Sql) => Promise<T>): Promise<T>;
}

const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __pgliteInstance__?: Promise<import("@electric-sql/pglite").PGlite>;
  __pgliteMigrateChain__?: Promise<void>;
  __pgPoolInstance__?: any;
};

const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type RunQuery = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) {
      text += `$${i + 1}${strings[i + 1]}`;
    }
    return run<T>(text, values);
  }) as unknown as Sql;

  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);

  sql.first = async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T | null> => {
    const rows = await sql<T>(strings, ...values);
    return rows[0] ?? null;
  };

  sql.firstQuery = async <T = Record<string, unknown>>(
    text: string,
    params: unknown[] = []
  ): Promise<T | null> => {
    const rows = await run<T>(text, params);
    return rows[0] ?? null;
  };

  sql.transaction = transactionHandler;

  return sql;
}

// ─── 4. ADAPTATEUR NEON / POSTGRES DISTANT (pg.Pool) ─────────────────────────

function createNeonSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    const { Pool, types } = await import("pg");

    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);

    const pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: databaseUrl?.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
    });

    globalRef.__pgPoolInstance__ = pool;

    const run: RunQuery = async <T>(text: string, params: unknown[]) => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    };

    const transaction = async <T>(callback: (tx: Sql) => Promise<T>): Promise<T> => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const clientRun: RunQuery = async <R>(text: string, params: unknown[]) => {
          const res = await client.query(text, params);
          return res.rows as R[];
        };
        const txSql = buildSqlInterface(clientRun, async () => {
          throw new Error("Les transactions imbriquées ne sont pas supportées.");
        });
        const result = await callback(txSql);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    };

    console.log("\x1b[32m[DB]\x1b[0m Pool PostgreSQL distant connecté avec succès.");
    return buildSqlInterface(run, transaction);
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    console.error("\x1b[31m[DB ERROR]\x1b[0m Échec de connexion PostgreSQL distant:", err);
    throw err;
  });

  return globalRef.__pgSqlPromise__;
}

// ─── 5. ADAPTATEUR PGLITE LOCAL (Embedded WebAssembly PostgreSQL) ────────────

async function createPgliteSql(): Promise<Sql> {
  globalRef.__pgliteInstance__ ??= (async () => {
    console.log("\x1b[33m[DB]\x1b[0m Initialisation du moteur PGlite WASM local...");
    const { PGlite } = await import("@electric-sql/pglite");

    const pg = new PGlite({
      parsers: {
        [OID_INT8]: Number,
        [OID_DATE]: identity,
        [OID_INTERVAL]: identity,
      },
    });

    await pg.waitReady;
    await pg.exec(
      "CREATE TABLE IF NOT EXISTS _migrations (name text primary key, applied_at timestamptz not null default now());"
    );
    console.log("\x1b[32m[DB]\x1b[0m Moteur PGlite WASM prêt.");
    return pg;
  })().catch((err) => {
    globalRef.__pgliteInstance__ = undefined;
    console.error("\x1b[31m[DB ERROR]\x1b[0m Échec de l'initialisation de PGlite:", err);
    throw err;
  });

  const pg = await globalRef.__pgliteInstance__;

  const migrate = async (): Promise<void> => {
    const migrations = import.meta.glob("/migrations/*.sql", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const doneRows = await pg.query<{ name: string }>(
      "select name from _migrations",
    );
    const done = doneRows.rows.map((r) => r.name);
    for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) {
      await pg.transaction(async (tx) => {
        await tx.exec(migrations[path]);
        await tx.query("insert into _migrations (name) values ($1)", [name]);
      });
    }
  };

  const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve())
    .catch(() => undefined)
    .then(migrate);

  globalRef.__pgliteMigrateChain__ = pass;
  await pass;

  const run: RunQuery = async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  };

  const transaction = async <T>(callback: (tx: Sql) => Promise<T>): Promise<T> => {
    return pg.transaction(async (tx) => {
      const txRun: RunQuery = async <R>(text: string, params: unknown[]) => {
        const result = await tx.query<R>(text, params);
        return result.rows;
      };
      const txSql = buildSqlInterface(txRun, async () => {
        throw new Error("Les transactions imbriquées ne sont pas supportées.");
      });
      return callback(txSql);
    });
  };

  return buildSqlInterface(run, transaction);
}

// ─── 6. EXPORTS & SÉCURITÉ CLIENT / SERVEUR ──────────────────────────────────

let sqlPromise: Promise<Sql> | null = null;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "\x1b[31m[CRITICAL SECURITY]\x1b[0m '@/lib/db' est réservé au serveur. Ne l'importez jamais dans du code React client."
    );
  }
  return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}

export function getSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = null;
    throw err;
  });
  return sqlPromise;
}

export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (dbSource !== "pglite") {
    throw new Error("getPglite() est uniquement accessible en mode local PGlite (pas de DATABASE_URL PostgreSQL).");
  }
  await getSql();
  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("L'instance PGlite n'a pas pu être initialisée.");
  return pg;
}

export function ensureDbReady(): Promise<void> {
  if (dbSource !== "pglite") return Promise.resolve();
  return getSql().then(() => undefined);
}

const globalBoot = globalThis as typeof globalThis & {
  __pgBootstrapPromise__?: Promise<void>;
};

if (typeof window === "undefined" && dbSource === "pglite") {
  globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__pgBootstrapPromise__ = undefined;
    console.error("\x1b[31m[DB ERROR]\x1b[0m Échec du bootstrap PGlite:", err);
  });
}