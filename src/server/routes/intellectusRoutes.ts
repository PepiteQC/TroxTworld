// ═══════════════════════════════════════════════════════════════════════════
//  INTELLECTUS ADMIN ROUTES — introspection & contrôle serveur
//  src/server/routes/intellectusRoutes.ts
//  Monte les routes /admin/* et /api/rp/* dans l'app Express existante.
//  À appeler depuis server.ts : mountIntellectusRoutes(app).
// ═══════════════════════════════════════════════════════════════════════════

import type { Express, Request, Response } from 'express';
import { intellectus } from '../intellectus';
import { thirdEye } from '../security/ThirdEye';
import { RPPlayer, RPProperty, RPGang, initRPSystemsData } from '../systems/RPSystems';

/**
 * Vérifie une clé admin simple (à durcir en prod avec JWT).
 */
function requireAdmin(req: Request, res: Response): boolean {
  const key = req.headers['x-admin-key'] ?? req.query.adminKey;
  const expected = process.env.ADMIN_KEY ?? 'troxt-dev-key';
  if (key !== expected) {
    res.status(403).json({ ok: false, error: 'Clé admin invalide' });
    return false;
  }
  return true;
}

export function mountIntellectusRoutes(app: Express): void {
  // Ensure default RP seed data is loaded in Lotus memory
  initRPSystemsData();

  // ─── SANTÉ GLOBALE INTELLECTUS ─────────────────────────────────────────
  app.get('/admin/intellectus', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ ok: true, health: intellectus.getHealth() });
  });

  // ─── THIRD EYE : stats + menaces ───────────────────────────────────────
  app.get('/admin/thirdeye/stats', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ ok: true, stats: thirdEye.getStats(), threats: thirdEye.getRecentThreats(30) });
  });

  app.post('/admin/thirdeye/unban', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { playerId } = req.body ?? {};
    if (!playerId) return res.status(400).json({ ok: false, error: 'playerId requis' });
    thirdEye.unban(playerId);
    res.json({ ok: true });
  });

  // ─── BUS ARCADIUS : historique d'événements ────────────────────────────
  app.get('/admin/bus', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ ok: true, history: intellectus.bus.getHistory(50), stats: intellectus.bus.getStats() });
  });

  // ─── DECAPRIUS : historique de commandes ───────────────────────────────
  app.get('/admin/commands', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({
      ok: true,
      records: intellectus.commands.getRecords(50),
      stats: intellectus.commands.getStats(),
      registered: intellectus.commands.listCommands(),
    });
  });

  // ─── LOTUS : snapshots + stats mémoire ─────────────────────────────────
  app.get('/admin/memory', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ ok: true, stats: intellectus.memory.getStats(), snapshots: intellectus.memory.getSnapshots() });
  });

  app.post('/admin/memory/snapshot', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const namespace = req.body?.namespace ?? 'world';
    const snap = intellectus.memory.snapshot(namespace, 'manual-admin');
    res.json({ ok: true, snapshotId: snap.snapshotId });
  });

  app.post('/admin/memory/restore', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { snapshotId } = req.body ?? {};
    const ok = intellectus.memory.restore(snapshotId);
    res.json({ ok });
  });

  // ─── MOMENTUS : tâches planifiées ──────────────────────────────────────
  app.get('/admin/scheduler', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ ok: true, stats: intellectus.time.getStats() });
  });

  // ─── ÉTAT DU MONDE RP (lecture publique light) ─────────────────────────
  app.get('/api/rp/players', (_req, res) => {
    const players = intellectus.memory.values<RPPlayer>('players').map((p) => ({
      id: p.id, name: p.name, job: p.job, gang: p.gang, wanted: p.wanted,
      position: p.position, aura: p.aura,
    }));
    res.json({ ok: true, players });
  });

  app.get('/api/rp/properties', (_req, res) => {
    const properties = intellectus.memory.values<RPProperty>('properties');
    res.json({ ok: true, properties });
  });

  app.get('/api/rp/gangs', (_req, res) => {
    const gangs = intellectus.memory.values<RPGang>('gangs').map((g) => ({
      id: g.id, name: g.name, color: g.color, memberCount: g.members.length,
      territoryStrength: g.territoryStrength, reputation: g.reputation,
    }));
    res.json({ ok: true, gangs });
  });

  app.get('/api/rp/vehicles', (_req, res) => {
    const vehicles = intellectus.memory.values('vehicles');
    res.json({ ok: true, vehicles });
  });

  // ─── DISPATCH GÉNÉRIQUE (test admin d'une commande RP) ──────────────────
  app.post('/api/rp/dispatch', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { command, payload, playerId } = req.body ?? {};
    if (!command) return res.status(400).json({ ok: false, error: 'command requis' });
    const result = await intellectus.dispatch(command, payload ?? {}, { playerId });
    res.json({ ok: result.ok, result: result.result, error: result.error });
  });

  console.log('📡 [Routes] Routes Intellectus/ThirdEye/RP montées (/admin/*, /api/rp/*)');
}
