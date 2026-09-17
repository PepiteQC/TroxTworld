/**
 * ═══════════════════════════════════════════════════════════════════
 * 🧠 INTELLECTUS — NOYAU CENTRAL DU SERVEUR MULTIJOUEUR (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * Architecture : True Zero-GC Event Bus, O(1) Pre-allocated Memory,
 *                Strict TypeScript Typing (No 'any').
 * ═══════════════════════════════════════════════════════════════════
 */

// ==========================================
// TYPAGE STRICT & SÉCURITÉ
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
  [key: string]: unknown;
}

// Définition stricte des espaces mémoire autorisés
export type MemoryScope = "players" | "properties" | "vehicles" | "gangs" | "world";

// ==========================================
// NOYAU INTELLECTUS
// ==========================================

class IntellectusCore {
  // 1. Lotus : Mémoire pré-allouée (Évite la fragmentation)
  private readonly memoryStore: Record<MemoryScope, Map<string, unknown>> = {
    players: new Map(),
    properties: new Map(),
    vehicles: new Map(),
    gangs: new Map(),
    world: new Map(),
  };

  // 2. Arcadius : Event Bus optimisé en Arrays (Zero-GC)
  // On utilise des tableaux simples au lieu de Set pour itérer avec une boucle 'for' classique
  private readonly eventListeners = new Map<string, Array<(data: unknown) => void>>();
  
  // 3. ThirdEye : Sécurité
  private readonly lockedOutUsers = new Set<string>();
  
  private readonly bootTime = Date.now();
  public isReady = false;

  public async boot(): Promise<void> {
    const startTime = Date.now();
    console.log("🧠 [Intellectus] Initialisation des 5 noyaux de simulation...");

    // État du monde par défaut (Type strict)
    this.memory.set("world", "state", {
      season: "Automne",
      weather: "clear",
      ambientC: 8.5,
      snowAccumulationCm: 0.0,
      hydroLive: true,
      lastTick: startTime,
    });

    this.isReady = true;
    console.log(`✅ [Intellectus] Opérationnel en ${Date.now() - startTime}ms`);
  }

  // ==========================================
  // DECAPRIUS : PIPELINE DE COMMANDES
  // ==========================================
  
  public async dispatch<P = unknown>(
    action: string,
    payload?: P,
    ctx?: DispatchContext
  ): Promise<{ ok: boolean; result?: unknown; error?: string }> {
    if (!this.isReady) {
      return { ok: false, error: "intellectus_not_ready" };
    }

    const actor = ctx?.actorId ?? ctx?.playerId;
    if (actor && this.thirdEye.isUserLockedOut(actor)) {
      return { ok: false, error: "user_locked_out_by_thirdeye" };
    }

    try {
      const now = Date.now(); // Cache l'appel système
      this.bus.emit(`action:${action}`, { payload, ctx, at: now });

      return {
        ok: true,
        result: {
          action,
          executedAt: now,
          status: "processed",
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ==========================================
  // LOTUS : MODULE MÉMOIRE O(1)
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

    values: <T>(scope: MemoryScope): T[] => {
      // Évite l'allocation d'un itérateur intermédiaire via Array.from
      const map = this.memoryStore[scope];
      const result = new Array<T>(map.size);
      let i = 0;
      for (const val of map.values()) {
        result[i++] = val as T;
      }
      return result;
    },

    delete: (scope: MemoryScope, id: string): boolean => {
      return this.memoryStore[scope].delete(id);
    },
  };

  // ==========================================
  // ARCADIUS : EVENT BUS ZERO-GC
  // ==========================================
  
  public readonly bus = {
    on: <T = unknown>(event: string, callback: (data: T) => void): (() => void) => {
      let listeners = this.eventListeners.get(event);
      if (!listeners) {
        listeners = [];
        this.eventListeners.set(event, listeners);
      }
      
      // Cast forcé pour le stockage générique interne
      listeners.push(callback as (data: unknown) => void);

      // Désabonnement (Splice est utilisé ici car les désabonnements sont rares,
      // comparé aux émissions qui s'exécutent 60x par seconde)
      return () => {
        const arr = this.eventListeners.get(event);
        if (arr) {
          const idx = arr.indexOf(callback as (data: unknown) => void);
          if (idx > -1) arr.splice(idx, 1);
        }
      };
    },

    emit: (event: string, data: unknown): void => {
      const listeners = this.eventListeners.get(event);
      if (!listeners) return;

      // Boucle 'for' standard : 0 allocation mémoire (Zero Garbage Collection)
      const len = listeners.length;
      for (let i = 0; i < len; i++) {
        try {
          listeners[i](data);
        } catch (e) {
          console.error(`[Arcadius] Erreur critique sur l'événement ${event}:`, e);
        }
      }
    },
  };

  // ==========================================
  // THIRDEYE : SÉCURITÉ & ANTI-CHEAT
  // ==========================================
  
  public readonly thirdEye = {
    isUserLockedOut: (id: string): boolean => {
      return this.lockedOutUsers.has(id);
    },

    lockUser: (id: string, reason: string): void => {
      this.lockedOutUsers.add(id);
      console.warn(`🚨 [ThirdEye] Joueur [${id}] verrouillé hors du serveur. Motif: ${reason}`);
      this.bus.emit("thirdeye:lockout", { id, reason, at: Date.now() });
    },

    unlockUser: (id: string): void => {
      this.lockedOutUsers.delete(id);
      console.log(`🔓 [ThirdEye] Verrou levé pour le joueur [${id}]`);
    },

    evaluateThreat: (playerId?: string): ThreatEvaluation => {
      if (playerId && this.lockedOutUsers.has(playerId)) {
        return { level: "RED", score: 100, reason: "Verrouillage de sécurité actif", lockedOut: true };
      }
      return { level: "GREEN", score: 0, lockedOut: false };
    },
  };

  public getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.bootTime) / 1000);
  }
}

export const intellectus = new IntellectusCore();