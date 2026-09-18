// ═══════════════════════════════════════════════════════════════════════════
//  MOMENTUS — MAÎTRE DU TEMPS (SCHEDULER · RETRY · TIMEOUT · DEBOUNCE · THROTTLE)
//  server/intellectus/Momentus.ts
//  Toute logique temporelle du serveur : tâches récurrentes (autosave, tick
//  monde, paie), retry avec backoff, timeout, debounce/throttle, concurrence.
// ═══════════════════════════════════════════════════════════════════════════

import {
  ScheduledTask,
  RetryOptions,
  ThrottleState,
  DebounceState,
  generateId,
  nowMs,
} from './types';

export class Momentus {
  private static instance: Momentus;
  private tasks = new Map<string, ScheduledTask>();
  private timers = new Map<string, NodeJS.Timeout>();
  private throttleStates = new Map<string, ThrottleState>();
  private debounceStates = new Map<string, DebounceState>();
  private semaphores = new Map<string, { max: number; active: number; queue: (() => void)[] }>();

  static getInstance(): Momentus {
    if (!Momentus.instance) Momentus.instance = new Momentus();
    return Momentus.instance;
  }

  // ─── SCHEDULER RÉCURRENT ──────────────────────────────────────────────

  /**
   * Planifier une tâche récurrente à intervalle fixe.
   * Nommée : re-planifier avec le même nom remplace l'ancienne.
   */
  every(name: string, intervalMs: number, handler: () => void | Promise<void>): string {
    this.stop(name);
    const task: ScheduledTask = {
      taskId: name,
      name,
      intervalMs,
      handler,
      running: false,
      enabled: true,
      nextRun: nowMs() + intervalMs,
    };
    this.tasks.set(name, task);

    const timer = setInterval(async () => {
      const t = this.tasks.get(name);
      if (!t || !t.enabled || t.running) return;
      t.running = true;
      t.lastRun = nowMs();
      try {
        await handler();
      } catch (err) {
        // Une tâche récurrente qui échoue ne doit pas tuer le scheduler
        console.error(`[Momentus] Tâche "${name}" a échoué:`, err);
      } finally {
        t.running = false;
        t.nextRun = nowMs() + intervalMs;
      }
    }, intervalMs);

    this.timers.set(name, timer);
    return name;
  }

  /**
   * Exécuter une seule fois après un délai.
   */
  after(delayMs: number, handler: () => void | Promise<void>): string {
    const id = generateId('once');
    const timer = setTimeout(async () => {
      try {
        await handler();
      } finally {
        this.timers.delete(id);
      }
    }, delayMs);
    this.timers.set(id, timer);
    return id;
  }

  pause(name: string): boolean {
    const task = this.tasks.get(name);
    if (!task) return false;
    task.enabled = false;
    return true;
  }

  resume(name: string): boolean {
    const task = this.tasks.get(name);
    if (!task) return false;
    task.enabled = true;
    return true;
  }

  stop(name: string): boolean {
    const timer = this.timers.get(name);
    if (timer) {
      clearInterval(timer);
      clearTimeout(timer);
      this.timers.delete(name);
    }
    return this.tasks.delete(name);
  }

  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
      clearTimeout(timer);
    }
    this.timers.clear();
    this.tasks.clear();
  }

  // ─── RETRY AVEC BACKOFF ───────────────────────────────────────────────

  /**
   * Réessayer une opération asynchrone avec backoff exponentiel.
   */
  async retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
    const {
      retries,
      baseDelayMs = 200,
      maxDelayMs = 10_000,
      factor = 2,
      onRetry,
    } = options;

    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          const delay = Math.min(baseDelayMs * Math.pow(factor, attempt), maxDelayMs);
          onRetry?.(attempt + 1, err);
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }

  // ─── TIMEOUT ──────────────────────────────────────────────────────────

  /**
   * Envelopper une promesse avec un timeout.
   */
  timeout<T>(promise: Promise<T>, ms: number, label = 'opération'): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
      ),
    ]);
  }

  // ─── DEBOUNCE ─────────────────────────────────────────────────────────

  /**
   * Debounce : n'exécute qu'après un silence de delayMs.
   * Utile pour : autosave après dernière modification, recherche live.
   */
  debounce(key: string, delayMs: number, handler: () => void | Promise<void>): void {
    let state = this.debounceStates.get(key);
    if (!state) {
      state = {};
      this.debounceStates.set(key, state);
    }
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(async () => {
      this.debounceStates.delete(key);
      await handler();
    }, delayMs);
  }

  // ─── THROTTLE ─────────────────────────────────────────────────────────

  /**
   * Throttle : au plus une exécution par intervalMs.
   * Utile pour : broadcast position, rate-limit d'action.
   */
  throttle(key: string, intervalMs: number, handler: () => void | Promise<void>): boolean {
    const now = nowMs();
    const state = this.throttleStates.get(key);
    if (state && now - state.lastCallAt < intervalMs) {
      return false; // rejeté
    }
    this.throttleStates.set(key, { lastCallAt: now });
    void handler();
    return true;
  }

  // ─── CONCURRENCE (SÉMAPHORE) ──────────────────────────────────────────

  /**
   * Limiter la concurrence d'une ressource nommée.
   * Ex: max 4 générations IA simultanées.
   */
  async withConcurrencyLimit<T>(
    resourceName: string,
    maxConcurrent: number,
    operation: () => Promise<T>
  ): Promise<T> {
    let sem = this.semaphores.get(resourceName);
    if (!sem) {
      sem = { max: maxConcurrent, active: 0, queue: [] };
      this.semaphores.set(resourceName, sem);
    }

    // Attendre un slot
    if (sem.active >= sem.max) {
      await new Promise<void>((resolve) => sem!.queue.push(resolve));
    }
    sem.active++;

    try {
      return await operation();
    } finally {
      sem.active--;
      const next = sem.queue.shift();
      if (next) next();
    }
  }

  sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ─── INTROSPECTION ────────────────────────────────────────────────────

  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).map((t) => ({ ...t, handler: t.handler }));
  }

  getStats() {
    return {
      scheduledTasks: this.tasks.size,
      activeTimers: this.timers.size,
      enabledTasks: Array.from(this.tasks.values()).filter((t) => t.enabled).length,
      throttleKeys: this.throttleStates.size,
      debounceKeys: this.debounceStates.size,
      semaphores: Array.from(this.semaphores.entries()).map(([name, s]) => ({
        name,
        max: s.max,
        active: s.active,
        queued: s.queue.length,
      })),
    };
  }
}

export const momentus = Momentus.getInstance();