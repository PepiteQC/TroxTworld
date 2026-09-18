/**
 * ═══════════════════════════════════════════════════════════════════
 * 🧠 INTELLECTUS KERNEL v2.5 — NOYAU SYSTÈME HAUTE PERFORMANCE
 * ═══════════════════════════════════════════════════════════════════
 * Architecture : Zero-GC Event Bus (Arcadius), O(1) Pre-allocated Memory (Lotus),
 *                Realtime RPC Pipeline (Decaprius), Adaptive Threat Defense (ThirdEye).
 * ═══════════════════════════════════════════════════════════════════
 */

// ==========================================
// 1. TYPAGE STRICT & CONTRATS
// ==========================================

export type ThreatLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export interface ThreatEvaluation {
  level: ThreatLevel;
  score: number;
  reason?: string;
  lockedOut: boolean;
}

export interface IntellectusEvent<T = unknown> {
  id: string;
  topic: string;
  timestamp: number;
  data: T;
}

export interface DispatchContext {
  actorId?: string;
  playerId?: string;
  role?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface DispatchResult<R = unknown> {
  ok: boolean;
  result?: R;
  error?: string;
  threatLevel?: ThreatLevel;
}

export type MemoryScope =
  | "players"
  | "properties"
  | "vehicles"
  | "gangs"
  | "world"
  | "jobs"
  | "police";

export type ActionHandler<P = unknown, R = unknown> = (
  payload: P,
  ctx?: DispatchContext
) => Promise<R> | R;

export interface WorldEnvironmentState {
  season: "Printemps" | "Été" | "Automne" | "Hiver";
  weather: "clear" | "rain" | "snow" | "fog" | "storm";
  ambientC: number;
  snowAccumulationCm: number;
  hydroLive: boolean;
  timeOfDay: number;
  lastTick: number;
}

// ==========================================
// 2. NOYAU CENTRAL INTELLECTUS
// ==========================================

class IntellectusCore {
  // ── Lotus : Mémoire Pré-Allouée O(1) ──
  private readonly memoryStore: Record<MemoryScope, Map<string, unknown>> = {
    players: new Map(),
    properties: new Map(),
    vehicles: new Map(),
    gangs: new Map(),
    world: new Map(),
    jobs: new Map(),
    police: new Map(),
  };

  // ── Arcadius : Event Bus Zero-GC ──
  private readonly eventListeners = new Map<string, Array<(data: unknown) => void>>();

  // ── Decaprius : Registre d'Actions Métier ──
  private readonly actionHandlers = new Map<string, ActionHandler<any, any>>();

  // ── ThirdEye : Anti-Cheat & Rate Limiter ──
  private readonly lockedOutUsers = new Set<string>();
  private readonly userThreatScores = new Map<string, { score: number; lastAction: number; count: number }>();

  // ── Horloge Système & Ticker ──
  private readonly bootTime = Date.now();
  private tickInterval: NodeJS.Timeout | null = null;
  public isReady = false;

  public async boot(): Promise<void> {
    const startTime = Date.now();
    console.log("🧠 [Intellectus] Démarrage des sous-systèmes (Lotus, Arcadius, Decaprius, ThirdEye)...");

    // Initialisation de l'état du monde de Portneuf
    const initialWorld: WorldEnvironmentState = {
      season: "Automne",
      weather: "clear",
      ambientC: 8.5,
      snowAccumulationCm: 0.0,
      hydroLive: true,
      timeOfDay: 12.0,
      lastTick: startTime,
    };
    this.memory.set("world", "state", initialWorld, false);

    // Démarrage du cycle de simulation d'environnement (1 tick toutes les secondes)
    this.startSimulationTick();

    this.isReady = true;
    console.log(`✅ [Intellectus v2.5] Opérationnel en ${Date.now() - startTime}ms`);
  }

  // ==========================================
  // DECAPRIUS : PIPELINE D'ACTIONS (RPC ASYNC)
  // ==========================================

  /**
   * Enregistre un gestionnaire d'action métier (Banque, Métier, Garage, etc.)
   */
  public registerHandler<P = unknown, R = unknown>(
    action: string,
    handler: ActionHandler<P, R>
  ): void {
    if (this.actionHandlers.has(action)) {
      console.warn(`⚠️ [Decaprius] Écrasement du handler existant pour l'action '${action}'`);
    }
    this.actionHandlers.set(action, handler);
  }

  /**
   * Exécute une action sécurisée avec contrôle de menace ThirdEye
   */
  public async dispatch<P = unknown, R = unknown>(
    action: string,
    payload?: P,
    ctx?: DispatchContext
  ): Promise<DispatchResult<R>> {
    if (!this.isReady) {
      return { ok: false, error: "intellectus_not_ready" };
    }

    const actor = ctx?.actorId ?? ctx?.playerId;

    // Évaluation Anti-Cheat & Rate Limit
    if (actor) {
      const threat = this.thirdEye.evaluateAndRecordActivity(actor);
      if (threat.lockedOut) {
        return { ok: false, error: "user_locked_out_by_thirdeye", threatLevel: threat.level };
      }
    }

    const now = Date.now();

    try {
      // Émission d'événement de monitoring non-bloquant
      this.bus.emit(`action:${action}`, { payload, ctx, at: now });

      // Exécution du handler dédié s'il est enregistré
      const handler = this.actionHandlers.get(action);
      let resultData: R | undefined = undefined;

      if (handler) {
        resultData = await handler(payload, ctx);
      }

      return {
        ok: true,
        result: resultData,
        threatLevel: actor ? this.thirdEye.evaluateThreat(actor).level : "GREEN",
      };
    } catch (err) {
      console.error(`❌ [Decaprius] Erreur sur l'action '${action}':`, err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ==========================================
  // LOTUS : MODULE MÉMOIRE O(1) PRÉ-ALLOUÉ
  // ==========================================

  public readonly memory = {
    get: <T>(scope: MemoryScope, id: string): T | undefined => {
      return this.memoryStore[scope].get(id) as T | undefined;
    },

    set: <T>(scope: MemoryScope, id: string, val: T, sync = true): void => {
      this.memoryStore[scope].set(id, val);
      if (sync) {
        this.bus.emit(`memory:${scope}:update`, { id, val, at: Date.now() });
      }
    },

    patch: <T extends Record<string, unknown>>(
      scope: MemoryScope,
      id: string,
      patchData: Partial<T>,
      sync = true
    ): T | undefined => {
      const existing = this.memoryStore[scope].get(id) as T | undefined;
      if (!existing) return undefined;

      const updated = { ...existing, ...patchData };
      this.memoryStore[scope].set(id, updated);

      if (sync) {
        this.bus.emit(`memory:${scope}:patch`, { id, patch: patchData, at: Date.now() });
      }
      return updated;
    },

    has: (scope: MemoryScope, id: string): boolean => {
      return this.memoryStore[scope].has(id);
    },

    values: <T>(scope: MemoryScope): T[] => {
      const map = this.memoryStore[scope];
      const result = new Array<T>(map.size);
      let i = 0;
      for (const val of map.values()) {
        result[i++] = val as T;
      }
      return result;
    },

    entries: <T>(scope: MemoryScope): Array<[string, T]> => {
      const map = this.memoryStore[scope];
      const result = new Array<[string, T]>(map.size);
      let i = 0;
      for (const entry of map.entries()) {
        result[i++] = [entry[0], entry[1] as T];
      }
      return result;
    },

    size: (scope: MemoryScope): number => {
      return this.memoryStore[scope].size;
    },

    delete: (scope: MemoryScope, id: string): boolean => {
      const deleted = this.memoryStore[scope].delete(id);
      if (deleted) {
        this.bus.emit(`memory:${scope}:delete`, { id, at: Date.now() });
      }
      return deleted;
    },

    clear: (scope: MemoryScope): void => {
      this.memoryStore[scope].clear();
    },
  };

  // ==========================================
  // ARCADIUS : EVENT BUS ZERO-GC OPTIMISÉ
  // ==========================================

  public readonly bus = {
    on: <T = unknown>(event: string, callback: (data: T) => void): (() => void) => {
      let listeners = this.eventListeners.get(event);
      if (!listeners) {
        listeners = [];
        this.eventListeners.set(event, listeners);
      }
      listeners.push(callback as (data: unknown) => void);

      return () => {
        const arr = this.eventListeners.get(event);
        if (arr) {
          const idx = arr.indexOf(callback as (data: unknown) => void);
          if (idx > -1) arr.splice(idx, 1);
        }
      };
    },

    once: <T = unknown>(event: string, callback: (data: T) => void): void => {
      const unbind = this.bus.on<T>(event, (data) => {
        unbind();
        callback(data);
      });
    },

    emit: (event: string, data: unknown): void => {
      const listeners = this.eventListeners.get(event);
      if (!listeners || listeners.length === 0) return;

      const len = listeners.length;
      for (let i = 0; i < len; i++) {
        try {
          listeners[i](data);
        } catch (e) {
          console.error(`[Arcadius] Erreur non interceptée sur '${event}':`, e);
        }
      }
    },
  };

  // ==========================================
  // THIRDEYE : ANTI-CHEAT & CONTRÔLE DE FLUX
  // ==========================================

  public readonly thirdEye = {
    isUserLockedOut: (id: string): boolean => {
      return this.lockedOutUsers.has(id);
    },

    lockUser: (id: string, reason: string): void => {
      this.lockedOutUsers.add(id);
      console.warn(`🚨 [ThirdEye] Joueur [${id}] bloqué. Motif: ${reason}`);
      this.bus.emit("thirdeye:lockout", { id, reason, at: Date.now() });
    },

    unlockUser: (id: string): void => {
      this.lockedOutUsers.delete(id);
      this.userThreatScores.delete(id);
      console.log(`🔓 [ThirdEye] Déblocage du joueur [${id}]`);
    },

    evaluateAndRecordActivity: (playerId: string): ThreatEvaluation => {
      if (this.lockedOutUsers.has(playerId)) {
        return { level: "RED", score: 100, reason: "Joueur verrouillé", lockedOut: true };
      }

      const now = Date.now();
      let record = this.userThreatScores.get(playerId);

      if (!record) {
        record = { score: 0, lastAction: now, count: 1 };
        this.userThreatScores.set(playerId, record);
        return { level: "GREEN", score: 0, lockedOut: false };
      }

      const delta = now - record.lastAction;
      record.lastAction = now;

      // Dégradation naturelle du score après 1 seconde de calme
      if (delta > 1000) {
        record.score = Math.max(0, record.score - 5);
        record.count = 1;
      } else {
        record.count++;
      }

      // Détection de flood (> 40 actions/seconde)
      if (record.count > 40) {
        record.score += 25;
      }

      // Détermination du niveau de menace
      let level: ThreatLevel = "GREEN";
      if (record.score >= 100) {
        level = "RED";
        this.thirdEye.lockUser(playerId, "Débit d'actions suspect (Spam/Cheat)");
        return { level, score: record.score, reason: "Spam d'actions", lockedOut: true };
      } else if (record.score >= 60) {
        level = "ORANGE";
      } else if (record.score >= 25) {
        level = "YELLOW";
      }

      return { level, score: record.score, lockedOut: false };
    },

    evaluateThreat: (playerId?: string): ThreatEvaluation => {
      if (!playerId) return { level: "GREEN", score: 0, lockedOut: false };
      if (this.lockedOutUsers.has(playerId)) {
        return { level: "RED", score: 100, reason: "Verrouillé", lockedOut: true };
      }
      const record = this.userThreatScores.get(playerId);
      const score = record?.score ?? 0;
      const level: ThreatLevel = score >= 60 ? "ORANGE" : score >= 25 ? "YELLOW" : "GREEN";
      return { level, score, lockedOut: false };
    },
  };

  // ==========================================
  // TICK DE SIMULATION CONTINU
  // ==========================================

  private startSimulationTick(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);

    this.tickInterval = setInterval(() => {
      const world = this.memory.get<WorldEnvironmentState>("world", "state");
      if (world) {
        // Avancement de l'heure in-game (1h réelle = 24h jeu)
        world.timeOfDay = (world.timeOfDay + 0.0066) % 24;
        world.lastTick = Date.now();
        this.bus.emit("world:tick", world);
      }
    }, 1000);
  }

  public getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.bootTime) / 1000);
  }

  public dispose(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.eventListeners.clear();
    this.actionHandlers.clear();
    this.isReady = false;
  }
}

export const intellectus = new IntellectusCore();
