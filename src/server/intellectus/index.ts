// server/intellectus/index.ts
// ETHERWORLD RP — TroxTetherworld Platinum Intellectus Server Core & Decaprius Command Registry

import type { CommandOptions, CommandHandler, RegisteredCommand, DecapriusCommands } from './types';
import { lotus } from './Lotus';
import { arcadius } from './Arcadius';

export type { CommandOptions, CommandHandler, RegisteredCommand, DecapriusCommands };
export { lotus, arcadius };

export interface CommandRecord {
  commandId: string;
  commandName: string;
  status: 'success' | 'failed' | 'running';
  error?: string;
  playerId?: string;
  durationMs?: number;
  retriesUsed: number;
  startedAt: number;
}

export class DecapriusCommandRegistry implements DecapriusCommands {
  commands = new Map<string, RegisteredCommand>();
  private userLastExecution = new Map<string, number>();
  private records: CommandRecord[] = [];
  private maxRecords = 200;
  private avgExecutionMs = 4;

  constructor() {
    this.registerBuiltins();
  }

  private registerBuiltins() {
    this.register('ping', async () => ({ pong: true, time: Date.now() }), {
      permission: 'user',
      description: 'Vérifie la réactivité du serveur Intellectus',
    });

    this.register('heal', async (params, ctx) => {
      return { healed: true, playerId: ctx?.playerId || 'self', hp: 100 };
    }, {
      permission: 'admin',
      description: 'Soigne complètement un joueur',
    });

    this.register('spawn_vehicle', async (params, ctx) => {
      const model = params?.model || 'Cruiser SPVM';
      return { spawned: true, model, owner: ctx?.playerId || 'admin' };
    }, {
      permission: 'admin',
      description: 'Fait apparaître un véhicule de service',
    });

    this.register('broadcast', async (params) => {
      const text = params?.text || 'Message des autorités de Portneuf';
      void arcadius.publish('announcements', 'broadcast', { text }, { priority: 'high', sourceAgent: 'admin' });
      return { broadcasted: true, text };
    }, {
      permission: 'admin',
      description: 'Diffuse une annonce générale sur tout le comté',
    });
  }

  register(name: string, handler: CommandHandler, options?: CommandOptions): void {
    const key = name.toLowerCase();
    this.commands.set(key, {
      handler,
      options,
      executedCount: 0,
    });
  }

  async execute(name: string, params: any, ctx: any): Promise<any> {
    const key = name.toLowerCase();
    const cmd = this.commands.get(key);
    const t0 = Date.now();

    const record: CommandRecord = {
      commandId: `cmd_${t0.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      commandName: name,
      status: 'running',
      playerId: ctx?.playerId || ctx?.sender?.sessionId,
      retriesUsed: 0,
      startedAt: t0,
    };
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) this.records.pop();

    if (!cmd) {
      record.status = 'failed';
      record.error = `Commande '${name}' non reconnue.`;
      record.durationMs = Date.now() - t0;
      return { ok: false, error: record.error };
    }

    const userId = ctx?.sender?.sessionId || ctx?.playerId || 'anonymous';
    const now = Date.now();

    if (cmd.options?.rateLimit) {
      const userKey = `${userId}:${key}`;
      const lastRun = this.userLastExecution.get(userKey) || 0;
      const elapsed = now - lastRun;
      if (elapsed < cmd.options.rateLimit) {
        const remainingSec = ((cmd.options.rateLimit - elapsed) / 1000).toFixed(1);
        record.status = 'failed';
        record.error = `Veuillez patienter ${remainingSec}s avant de réexécuter '${name}'.`;
        record.durationMs = Date.now() - t0;
        return {
          ok: false,
          error: record.error,
          rateLimited: true,
        };
      }
      this.userLastExecution.set(userKey, now);
    }

    try {
      cmd.executedCount++;
      cmd.lastExecutedAt = now;

      const result = await cmd.handler(params, ctx);
      record.status = 'success';
      record.durationMs = Date.now() - t0;
      this.avgExecutionMs = this.avgExecutionMs * 0.9 + record.durationMs * 0.1;

      return {
        ok: true,
        result,
        command: name,
        timestamp: now,
      };
    } catch (err: any) {
      record.status = 'failed';
      record.error = err.message || 'Erreur interne lors de l\'exécution';
      record.durationMs = Date.now() - t0;
      return {
        ok: false,
        error: record.error,
        command: name,
        timestamp: now,
      };
    }
  }

  getRecords(limit = 50): CommandRecord[] {
    return this.records.slice(0, limit);
  }

  listCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  getRegisteredList(): Array<{ name: string; permission: string; description: string }> {
    const list: Array<{ name: string; permission: string; description: string }> = [];
    for (const [name, cmd] of this.commands.entries()) {
      list.push({
        name,
        permission: cmd.options?.permission || 'user',
        description: cmd.options?.description || 'Commande système Decaprius',
      });
    }
    return list;
  }

  getStats() {
    const byStatus = { success: 0, failed: 0, running: 0 };
    for (const r of this.records) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }
    return {
      definitions: this.commands.size,
      totalRecords: this.records.length,
      byStatus,
      avgExecutionMs: Math.round(this.avgExecutionMs),
      idempotencyCacheSize: this.userLastExecution.size,
    };
  }
}

export class IntellectusServerManager {
  public bus = arcadius;
  public memory = lotus;
  public commands = new DecapriusCommandRegistry();
  public time = {
    getStats: () => ({
      scheduledTasks: 4,
      activeTimers: 2,
      enabledTasks: 4,
      throttleKeys: 1,
      debounceKeys: 0,
      semaphores: [
        { name: 'db_flush', max: 1, active: 0, queued: 0 },
        { name: 'traffic_ai', max: 4, active: 1, queued: 0 },
      ],
    }),
  };

  getHealth() {
    const busStats = this.bus.getStats();
    const cmdStats = this.commands.getStats();
    const memStats = this.memory.getStats();
    const schedStats = this.time.getStats();

    return {
      booted: true,
      arcadius: busStats,
      benedictus: { contracts: ['ContractPolice', 'ContractDesjardins', 'ContractSQ', 'ContractTransit'] },
      decaprius: cmdStats,
      lotus: memStats,
      momentus: schedStats,
    };
  }

  async dispatch(command: string, payload: any = {}, ctx: any = {}) {
    return this.commands.execute(command, payload, ctx);
  }
}

export const intellectus = new IntellectusServerManager();
