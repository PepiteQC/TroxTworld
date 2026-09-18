/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SERVEUR DE SIGNALEMENT WEBRTC HAUTE PERFORMANCE — TROXTWORLD / PORTNEUF RP
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Relais de signalement SDP / ICE pour les connexions P2P :
 *  - Mode Hybride : En mémoire (ultra-rapide, 0ms) ou PostgreSQL Cloud (Neon).
 *  - Pruning automatique temporisé pour éliminer les pairs inactifs (TTL 30s).
 *  - Protection anti-débordement de mémoire (Ring Buffer) et validation stricte (Zod).
 *  - Support CORS complet pour le développement local et la production.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { PeerRow, RtcPollResponse, SignalKind, SignalRow } from "./p2p";

// ─── 1. SCHÉMAS DE VALIDATION ZOD ───────────────────────────────────────────

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/, {
  message: "Identifiant invalide (1 à 64 caractères alphanumériques, '-' ou '_')",
});

const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z.unknown().refine(
    (v) => v !== undefined && JSON.stringify(v).length <= 32_768,
    { message: "Le paquet de signalement dépasse la limite de 32 Ko" }
  ),
});

const leaveSchema = z.object({
  op: z.literal("leave"),
  room: ID,
  peer: ID,
});

const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema]);

// Délais d'expiration (TTL)
const PEER_TTL_SECONDS = 30;
const SIGNAL_TTL_SECONDS = 60;
const PRUNE_INTERVAL_MS = 30_000;
const MAX_IN_MEMORY_SIGNALS = 5_000;

interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

// ─── 2. DÉTECTION DU BACKEND DE STOCKAGE ─────────────────────────────────────

function useSqlBackend(): boolean {
  const url = typeof process !== "undefined" ? process.env?.DATABASE_URL : undefined;
  if (!url || !url.trim()) return false;
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

async function trySql(): Promise<Sql | null> {
  if (!useSqlBackend()) return null;
  try {
    const { getSql } = await import("@/lib/db");
    return await getSql();
  } catch {
    return null;
  }
}

// ─── 3. GESTIONNAIRE EN MÉMOIRE VIVE (Fallback / Standalone) ─────────────────

interface InMemoryPeer {
  room: string;
  id: string;
  name: string;
  lastSeen: number;
}

interface InMemorySignal {
  id: number;
  room: string;
  to: string;
  from: string;
  kind: SignalKind;
  payload: unknown;
  at: number;
}

const globalRef = globalThis as typeof globalThis & {
  __rtcSchemaPromise__?: Promise<void>;
  __rtcLastPruneTime__?: number;
  __rtcMem__?: {
    peers: Map<string, InMemoryPeer>;
    signals: InMemorySignal[];
    nextId: number;
  };
};

function getMemStore() {
  globalRef.__rtcMem__ ??= {
    peers: new Map(),
    signals: [],
    nextId: 1,
  };
  return globalRef.__rtcMem__;
}

function peerKey(room: string, id: string): string {
  return `${room}|${id}`;
}

function memPrune(now: number): void {
  const store = getMemStore();
  const peerCut = now - PEER_TTL_SECONDS * 1000;
  const sigCut = now - SIGNAL_TTL_SECONDS * 1000;

  for (const [k, p] of store.peers) {
    if (p.lastSeen < peerCut) {
      store.peers.delete(k);
    }
  }

  store.signals = store.signals.filter((s) => s.at > sigCut);

  // Sécurité anti-débordement (Buffer circulaire)
  if (store.signals.length > MAX_IN_MEMORY_SIGNALS) {
    store.signals = store.signals.slice(-MAX_IN_MEMORY_SIGNALS);
  }
}

// ─── 4. RÉPONSES HTTP & EN-TÊTES CORS UNIFIÉS ────────────────────────────────

const CORS_HEADERS = {
  "content-type": "application/json",
  "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "pragma": "no-cache",
  "expires": "0",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

// ─── 5. GESTION DU SCHÉMA POSTGRESQL ────────────────────────────────────────

function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__rtcSchemaPromise__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_peers (
         room TEXT NOT NULL,
         peer_id TEXT NOT NULL,
         name TEXT NOT NULL DEFAULT '',
         last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (room, peer_id)
       )`
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_signals (
         id BIGSERIAL PRIMARY KEY,
         room TEXT NOT NULL,
         to_peer TEXT NOT NULL,
         from_peer TEXT NOT NULL,
         kind TEXT NOT NULL,
         payload JSONB NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`
    );
    await sql.query(
      `CREATE INDEX IF NOT EXISTS webrtc_signals_inbox
         ON webrtc_signals (room, to_peer, id)`
    );
    await sql.query(
      `CREATE INDEX IF NOT EXISTS webrtc_peers_lookup
         ON webrtc_peers (room, last_seen)`
    );
  })().catch((err) => {
    globalRef.__rtcSchemaPromise__ = undefined;
    throw err;
  });
  return globalRef.__rtcSchemaPromise__;
}

async function roster(sql: Sql, room: string): Promise<PeerRow[]> {
  const rows = await sql.query<{ peer_id: string; name: string }>(
    `SELECT peer_id, name FROM webrtc_peers
     WHERE room = $1 AND last_seen > now() - make_interval(secs => $2)
     ORDER BY peer_id LIMIT 32`,
    [room, PEER_TTL_SECONDS]
  );
  return rows.map((r) => ({ id: r.peer_id, name: r.name }));
}

async function touchPeer(sql: Sql, room: string, peer: string, name: string): Promise<void> {
  await sql.query(
    `INSERT INTO webrtc_peers (room, peer_id, name, last_seen)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (room, peer_id)
     DO UPDATE SET last_seen = now(), name = EXCLUDED.name`,
    [room, peer, name]
  );
}

async function tryThrottledSqlPrune(sql: Sql): Promise<void> {
  const now = Date.now();
  const lastPrune = globalRef.__rtcLastPruneTime__ ?? 0;

  if (now - lastPrune < PRUNE_INTERVAL_MS) {
    return;
  }

  globalRef.__rtcLastPruneTime__ = now;

  try {
    await Promise.all([
      sql.query(
        `DELETE FROM webrtc_signals WHERE created_at < now() - make_interval(secs => $1)`,
        [SIGNAL_TTL_SECONDS]
      ),
      sql.query(
        `DELETE FROM webrtc_peers WHERE last_seen < now() - make_interval(secs => $1)`,
        [PEER_TTL_SECONDS]
      ),
    ]);
  } catch (err) {
    console.warn("[RTC Prune Warning] Nettoyage périodique ignoré :", err);
  }
}

// ─── 6. CONTRÔLEURS DE REQUÊTES (GET / POST) ────────────────────────────────

function handleGetMem(room: string, peer: string, name: string, since: number): Response {
  const now = Date.now();
  memPrune(now);
  const store = getMemStore();

  store.peers.set(peerKey(room, peer), { room, id: peer, name, lastSeen: now });

  const peers: PeerRow[] = [...store.peers.values()]
    .filter((p) => p.room === room)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 32)
    .map((p) => ({ id: p.id, name: p.name }));

  const signals: SignalRow[] = store.signals
    .filter((s) => s.room === room && s.to === peer && s.id > since)
    .slice(0, 200)
    .map((s) => ({ id: s.id, from: s.from, kind: s.kind, payload: s.payload }));

  const body: RtcPollResponse = { peers, signals };
  return jsonResponse(body);
}

function handlePostMem(msg: z.infer<typeof postSchema>): Response {
  const now = Date.now();
  memPrune(now);
  const store = getMemStore();

  if (msg.op === "signal") {
    store.signals.push({
      id: store.nextId++,
      room: msg.room,
      to: msg.to,
      from: msg.from,
      kind: msg.kind,
      payload: msg.payload,
      at: now,
    });
  } else {
    store.peers.delete(peerKey(msg.room, msg.peer));
  }

  return jsonResponse({ ok: true });
}

async function handleGet(url: URL): Promise<Response> {
  const parsed = z
    .object({
      room: ID,
      peer: ID,
      name: z.string().max(64).default(""),
      since: z.coerce.number().int().min(0).default(0),
    })
    .safeParse({
      room: url.searchParams.get("room"),
      peer: url.searchParams.get("peer"),
      name: url.searchParams.get("name") ?? "",
      since: url.searchParams.get("since") ?? 0,
    });

  if (!parsed.success) {
    return jsonResponse({ error: "Paramètres de requête invalides" }, 400);
  }

  const { room, peer, name, since } = parsed.data;

  const sql = await trySql();
  if (!sql) {
    return handleGetMem(room, peer, name, since);
  }

  await ensureSchema(sql);
  void tryThrottledSqlPrune(sql);
  await touchPeer(sql, room, peer, name);

  const rows = await sql.query<{
    id: number;
    from_peer: string;
    kind: SignalRow["kind"];
    payload: unknown;
  }>(
    `SELECT id, from_peer, kind, payload FROM webrtc_signals
     WHERE room = $1 AND to_peer = $2 AND id > $3
     ORDER BY id LIMIT 200`,
    [room, peer, since]
  );

  const body: RtcPollResponse = {
    peers: await roster(sql, room),
    signals: rows.map((r) => ({
      id: r.id,
      from: r.from_peer,
      kind: r.kind,
      payload: r.payload,
    })),
  };

  return jsonResponse(body);
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Charge utile de signalement invalide", details: parsed.error.format() }, 400);
  }

  const msg = parsed.data;
  const sql = await trySql();

  if (!sql) {
    return handlePostMem(msg);
  }

  await ensureSchema(sql);

  if (msg.op === "signal") {
    await sql.query(
      `INSERT INTO webrtc_signals (room, to_peer, from_peer, kind, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [msg.room, msg.to, msg.from, msg.kind, JSON.stringify(msg.payload)]
    );
  } else {
    await sql.query(`DELETE FROM webrtc_peers WHERE room = $1 AND peer_id = $2`, [
      msg.room,
      msg.peer,
    ]);
  }

  return jsonResponse({ ok: true });
}

// ─── 7. GESTIONNAIRE D'ENTRÉE PRINCIPAL (ENTRYPOINT) ─────────────────────────

export async function handleSignaling(request: Request): Promise<Response> {
  // Prise en charge des requêtes pré-vol (CORS Preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  } catch (error) {
    console.error("[WebRTC Signaling Error] Incident serveur :", error);
    return jsonResponse({ error: "Échec du relais de signalement" }, 500);
  }
}