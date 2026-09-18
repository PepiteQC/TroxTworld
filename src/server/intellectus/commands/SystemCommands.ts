// server/intellectus/commands/SystemCommands.ts
// ETHERWORLD RP — TroxTetherworld Platinum System Commands

import type { IKernel } from '../types';
import type { DecapriusCommands } from '../index';
import { getKernelHealth, generateKernelDiagnostics } from '../utils/kernel';

/**
 * Registers all core system commands on the Decaprius Command Registry
 */
export function registerSystemCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {

  // ── 📊 STATUS — Global kernel status ──────────────────────
  commands.register('system:status', async (_params, _ctx) => {
    return {
      kernel: getKernelHealth(kernel),
      intellectus: kernel.intellectus?.getStatus() ?? null,
      db: kernel.db?.getStats() ?? null,
      timestamp: Date.now(),
    };
  }, {
    permission: 'user',
    rateLimit: 1_000,
    description: 'Affiche l\'état de santé global du kernel Intellectus',
  });

  // ── 💾 SAVE — Forced persistent save ─────────────────────
  commands.register('system:save', async (_params, _ctx) => {
    const results: Record<string, unknown> = {};

    if (kernel.db) {
      await kernel.db.flush();
      results.db = 'flushed';
    }

    if (kernel.state) {
      await kernel.state.save();
      results.state = 'saved';
    }

    if (kernel.bus) {
      await kernel.bus.emit('system:saved', { timestamp: Date.now() }, 'high', 'SystemCommands');
    }

    return { ok: true, results, timestamp: Date.now() };
  }, {
    permission: 'admin',
    rateLimit: 5_000,
    description: 'Force la sauvegarde immédiate de la base de données et de l\'état',
  });

  // ── 🔬 DIAGNOSTICS — Comprehensive report ────────────────
  commands.register('system:diagnostics', async (_params, _ctx) => {
    return generateKernelDiagnostics(kernel);
  }, {
    permission: 'moderator',
    rateLimit: 2_000,
    description: 'Génère un rapport de diagnostic complet des sous-systèmes',
  });

  // ── 🧹 CLEAR HISTORY — Flush bus history ─────────────────
  commands.register('system:clearBusHistory', (_params, _ctx) => {
    if (!kernel.bus) return { ok: false, error: 'Bus absent' };

    const before = kernel.bus.history.length;
    kernel.bus.history = [];
    return { ok: true, cleared: before };
  }, {
    permission: 'admin',
    description: 'Vide le tampon d\'historique des événements bus',
    rollback: async (_params: unknown, snapshot: any) => {
      console.warn(`[SystemCommands] Rollback clearBusHistory (snapshot: ${snapshot?.id}) — non restaurable`);
    },
  });

  // ── 🔄 MEMORY REVERT — Revert state to previous version ──
  commands.register('system:memoryRevert', async (params: any, _ctx) => {
    if (!kernel.memory) return { ok: false, error: 'Memory absent' };
    if (!params?.versionId) return { ok: false, error: 'versionId requis' };

    const version = kernel.memory.getVersion(params.versionId);
    if (!version) return { ok: false, error: `Version ${params.versionId} introuvable` };

    const reverted = kernel.memory.revertTo(params.versionId);
    return { ok: true, reverted, fromVersion: params.versionId };
  }, {
    permission: 'admin',
    description: 'Restaure l\'état mémoire à une version spécifique',
  });

  // ── 📋 MEMORY HISTORY — List state mutation snapshots ────
  commands.register('system:memoryHistory', (params: any, _ctx) => {
    if (!kernel.memory) return { ok: false, error: 'Memory absent' };

    const query = params?.query as string | undefined;
    const limit = (params?.limit as number) ?? 20;

    const versions = query
      ? kernel.memory.searchHistory(query)
      : kernel.memory.versions.slice(0, limit);

    return { ok: true, versions, total: kernel.memory.versions.length };
  }, {
    permission: 'user',
    rateLimit: 1_000,
    description: 'Consulte l\'historique des snapshots mémoire',
  });

  // ── 🧠 MEMORY DIFF — Compare two version snapshots ──────
  commands.register('system:memoryDiff', (params: any, _ctx) => {
    if (!kernel.memory) return { ok: false, error: 'Memory absent' };
    if (!params?.fromId || !params?.toId) {
      return { ok: false, error: 'fromId et toId requis' };
    }

    try {
      const diff = kernel.memory.diffVersions(params.fromId, params.toId);
      return { ok: true, diff };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, {
    permission: 'admin',
    description: 'Calcule les différences entre deux snapshots de mémoire',
  });

  // ── 📅 SCHEDULER STATUS — List tasks ────────────────────
  commands.register('system:schedulerStatus', (_params, _ctx) => {
    if (!kernel.scheduler) return { ok: false, error: 'Scheduler absent' };
    return { ok: true, status: kernel.scheduler.getStatus() };
  }, {
    permission: 'user',
    description: 'Obtient le statut des tâches cron/scheduler',
  });

  // ── ⏹ SCHEDULER STOP — Stop a background task ───────────
  commands.register('system:schedulerStop', (params: any, _ctx) => {
    if (!kernel.scheduler) return { ok: false, error: 'Scheduler absent' };
    if (!params?.taskName) return { ok: false, error: 'taskName requis' };

    kernel.scheduler.stop(params.taskName);
    return { ok: true, stopped: params.taskName };
  }, {
    permission: 'admin',
    description: 'Arrête une tâche du scheduler',
  });

  // ── 🔍 BUS HISTORY — Query event logs ───────────────────
  commands.register('system:busHistory', (params: any, _ctx) => {
    if (!kernel.bus) return { ok: false, error: 'Bus absent' };

    const filter = {
      type: params?.type as string | undefined,
      priority: params?.priority as any,
      since: params?.since as string | undefined,
    };

    const history = kernel.bus.getHistory(filter);
    return { ok: true, history, total: history.length };
  }, {
    permission: 'user',
    rateLimit: 500,
    description: 'Filtre et affiche l\'historique des événements du bus',
  });

  // ── 🚨 THIRDEYE STATUS — Threat analysis overview ───────
  commands.register('system:thirdEyeStatus', (_params, _ctx) => {
    if (!kernel.thirdEye) {
      return { ok: true, status: 'inactive', message: 'ThirdEye non configuré' };
    }
    return {
      ok: true,
      status: 'active',
      level: kernel.thirdEye.level ?? 'GREEN',
      alerts: kernel.thirdEye.alerts?.slice(0, 20) ?? [],
    };
  }, {
    permission: 'user',
    description: 'Lit les alertes de sécurité du sous-système ThirdEye',
  });

  // ── 📢 BROADCAST — Custom server event emission ────────
  commands.register('system:broadcast', async (params: any, _ctx) => {
    if (!kernel.bus) return { ok: false, error: 'Bus absent' };
    if (!params?.type) return { ok: false, error: 'type d\'événement requis' };

    const event = await kernel.bus.emit(
      params.type,
      params.payload ?? {},
      params.priority ?? 'normal',
      'AdminBroadcast'
    );
    return { ok: true, event };
  }, {
    permission: 'admin',
    rateLimit: 1_000,
    description: 'Émet un événement système personnalisé sur le bus',
  });

  // ── 🔒 LOCKOUT CHECK — Check user status ────────────────
  commands.register('system:lockoutCheck', (params: any, _ctx) => {
    if (!kernel.contracts) return { ok: false, error: 'Contracts absent' };
    if (!params?.userId) return { ok: false, error: 'userId requis' };

    const locked = kernel.contracts.isLockedOut(params.userId);
    return { ok: true, userId: params.userId, locked };
  }, {
    permission: 'moderator',
    description: 'Vérifie si un utilisateur est actuellement bloqué',
  });

  console.log(`[SystemCommands] ✅ ${commands.commands.size} commande(s) système enregistrée(s)`);
}
