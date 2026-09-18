// ═══════════════════════════════════════════════════════════════════════════
//  DECAPRIUS — COMMANDES, ROLLBACK, IDEMPOTENCE, TÉLÉMÉTRIE
//  server/intellectus/Decaprius.ts
//  Exécute TOUTE mutation d'état avec garantie : validation Benedictus →
//  exécution → compensation en cas d'échec. Une clé d'idempotence évite les
//  doubles exécutions (retry réseau, double-clic, replay attack).
// ═══════════════════════════════════════════════════════════════════════════

import {
  CommandDefinition,
  CommandContext,
  CommandRecord,
  CommandStatus,
  generateId,
  nowMs,
} from './types';
import { Benedictus } from './Benedictus';
import { Arcadius } from './Arcadius';

export class Decaprius {
  private static instance: Decaprius;
  private definitions = new Map<string, CommandDefinition>();
  private records: CommandRecord[] = [];
  private idempotencyCache = new Map<string, CommandRecord>(); // key -> record
  private maxRecords = 1000;
  private benedictus = Benedictus.getInstance();
  private arcadius = Arcadius.getInstance();

  static getInstance(): Decaprius {
    if (!Decaprius.instance) Decaprius.instance = new Decaprius();
    return Decaprius.instance;
  }

  /**
   * Enregistrer une commande exécutable.
   */
  define<TInput = any, TResult = any>(def: CommandDefinition<TInput, TResult>): void {
    this.definitions.set(def.commandName, def as CommandDefinition);
  }

  /**
   * Exécuter une commande avec garanties complètes.
   */
  async execute<TResult = any>(
    commandName: string,
    input: any,
    opts: {
      playerId?: string;
      idempotencyKey?: string;
      correlationId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{ ok: boolean; result?: TResult; error?: string; record: CommandRecord }> {
    const def = this.definitions.get(commandName);
    const correlationId = opts.correlationId ?? generateId('corr');

    // Commande inconnue
    if (!def) {
      const record = this.makeRecord(commandName, input, 'rejected', opts, correlationId);
      record.error = `Commande inconnue: ${commandName}`;
      record.finishedAt = nowMs();
      this.push(record);
      return { ok: false, error: record.error, record };
    }

    // Idempotence : déjà exécutée avec succès ?
    if (def.idempotent && opts.idempotencyKey) {
      const cached = this.idempotencyCache.get(opts.idempotencyKey);
      if (cached && cached.status === 'completed') {
        return { ok: true, result: cached.result, record: cached };
      }
    }

    const record = this.makeRecord(commandName, input, 'validating', opts, correlationId);
    this.push(record);

    // Validation Benedictus (si contrat déclaré)
    if (def.contractName) {
      const validation = this.benedictus.validate(def.contractName, input);
      if (!validation.valid) {
        record.status = 'rejected';
        record.error = validation.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
        record.finishedAt = nowMs();
        record.durationMs = record.finishedAt - record.startedAt;
        await this.emit('command.rejected', record);
        return { ok: false, error: record.error, record };
      }
      // Utiliser le payload nettoyé
      input = validation.sanitized ?? input;
      record.input = input;
    }

    const ctx: CommandContext = {
      commandId: record.commandId,
      playerId: opts.playerId,
      correlationId,
      metadata: opts.metadata ?? {},
    };

    // Exécution avec retry + timeout
    record.status = 'executing';
    let result: TResult | undefined;
    const maxRetries = def.retries ?? 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      record.retriesUsed = attempt;
      try {
        result = await this.withTimeout(def.handler(input, ctx), def.timeoutMs ?? 8000);
        record.status = 'completed';
        record.result = result;
        record.finishedAt = nowMs();
        record.durationMs = record.finishedAt - record.startedAt;

        if (def.idempotent && opts.idempotencyKey) {
          this.idempotencyCache.set(opts.idempotencyKey, record);
        }

        await this.emit('command.completed', record);
        return { ok: true, result, record };
      } catch (err) {
        record.error = err instanceof Error ? err.message : String(err);
        if (attempt < maxRetries) {
          await this.delay(200 * Math.pow(2, attempt)); // backoff exponentiel
          continue;
        }
      }
    }

    // Échec définitif → compensation (rollback)
    record.status = 'failed';
    await this.emit('command.failed', record);

    if (def.compensate) {
      record.status = 'compensating';
      try {
        await def.compensate(input, result, ctx);
        record.status = 'compensated';
        await this.emit('command.compensated', record);
      } catch (compErr) {
        record.error =
          (record.error ?? '') +
          ` | Échec compensation: ${compErr instanceof Error ? compErr.message : String(compErr)}`;
      }
    }

    record.finishedAt = nowMs();
    record.durationMs = record.finishedAt - record.startedAt;
    return { ok: false, error: record.error, record };
  }

  private makeRecord(
    commandName: string,
    input: any,
    status: CommandStatus,
    opts: { playerId?: string; idempotencyKey?: string },
    correlationId: string
  ): CommandRecord {
    return {
      commandId: generateId('cmd'),
      commandName,
      input,
      status,
      playerId: opts.playerId,
      idempotencyKey: opts.idempotencyKey,
      startedAt: nowMs(),
      correlationId,
      retriesUsed: 0,
    };
  }

  private push(record: CommandRecord): void {
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) this.records.length = this.maxRecords;
  }

  private async emit(type: string, record: CommandRecord): Promise<void> {
    await this.arcadius.publish('command', type, record, {
      priority: record.status === 'failed' ? 'high' : 'normal',
      sourceAgent: 'decaprius',
      correlationId: record.correlationId,
    });
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout commande (${ms}ms)`)), ms)
      ),
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  getRecords(limit = 50): CommandRecord[] {
    return this.records.slice(0, limit);
  }

  getRecord(commandId: string): CommandRecord | undefined {
    return this.records.find((r) => r.commandId === commandId);
  }

  getStats() {
    const byStatus: Record<string, number> = {};
    for (const r of this.records) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const completed = this.records.filter((r) => r.status === 'completed');
    const avgMs = completed.length
      ? completed.reduce((s, r) => s + (r.durationMs ?? 0), 0) / completed.length
      : 0;
    return {
      definitions: this.definitions.size,
      totalRecords: this.records.length,
      byStatus,
      avgExecutionMs: Math.round(avgMs),
      idempotencyCacheSize: this.idempotencyCache.size,
    };
  }

  listCommands(): string[] {
    return Array.from(this.definitions.keys());
  }
}

export const decaprius = Decaprius.getInstance();