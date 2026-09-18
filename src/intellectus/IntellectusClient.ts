/**
 * EtherWorld / TroxTWorld — Client Intellectus & Heartbeat.
 * Utilise des requêtes relatives directes pour cibler le serveur actif (8080).
 */

export interface IntellectusHealth {
  booted: boolean;
  arcadius: {
    channels: number;
    channelNames: string[];
    totalSubscriptions: number;
    middlewares: number;
    historySize: number;
    queuedEvents: number;
    totalErrors: number;
    paused: boolean;
  };
  benedictus: { contracts: string[] };
  decaprius: {
    definitions: number;
    totalRecords: number;
    byStatus: Record<string, number>;
    avgExecutionMs: number;
    idempotencyCacheSize: number;
  };
  lotus: {
    totalEntries: number;
    namespaces: string[];
    maxEntries: number;
    snapshots: number;
    openTransactions: number;
    hasAdapter: boolean;
  };
  momentus: {
    scheduledTasks: number;
    activeTimers: number;
    enabledTasks: number;
    throttleKeys: number;
    debounceKeys: number;
    semaphores: Array<{ name: string; max: number; active: number; queued: number }>;
  };
}

export interface ThirdEyeStats {
  stats: {
    riskLevel: "GREEN" | "YELLOW" | "ORANGE" | "RED";
    totalThreats: number;
    recentThreats: number;
    bannedPlayers: number;
    avgTrustScore: number;
  };
  threats: Array<{
    type: string;
    source: string;
    details: string;
    severity: number;
    timestamp: number;
  }>;
}

export interface CommandRecordDTO {
  commandId: string;
  commandName: string;
  status: string;
  error?: string;
  playerId?: string;
  durationMs?: number;
  retriesUsed: number;
  startedAt: number;
}

export interface BusHistoryEntry {
  event: {
    eventId: string;
    channel: string;
    type: string;
    priority: string;
    sourceAgent: string;
    targetAgent?: string;
    timestamp: number;
  };
  handledBy: string[];
  durationMs: number;
  errors: Array<{ agentName: string; error: string }>;
}

export interface RPPlayerDTO {
  id: string;
  name: string;
  job: string;
  gang: string;
  wanted: number;
  position: [number, number, number];
  aura: string;
}

export interface RPPropertyDTO {
  id: string;
  name: string;
  ownerId: string | null;
  price: number;
  position: [number, number, number];
  locked: boolean;
}

export interface RPGangDTO {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  territoryStrength: number;
  reputation: number;
}

export interface IntellectusConfig {
  adminKey?: string;
  cacheTtl?: number;
  timeoutMs?: number;
}

export class IntellectusClient {
  private readonly adminKey: string;
  private readonly cacheTtl: number;
  private readonly timeoutMs: number;
  private cache = new Map<string, { at: number; data: unknown }>();

  constructor(config?: IntellectusConfig) {
    this.adminKey = config?.adminKey ?? "troxt-dev-key";
    this.cacheTtl = config?.cacheTtl ?? 2000;
    this.timeoutMs = config?.timeoutMs ?? 5000;
  }

  private get headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "x-admin-key": this.adminKey,
    };
  }

  /**
   * Méthode centralisée pour exécuter les requêtes HTTP avec gestion de timeout.
   */
  private async request<T>(path: string, options: RequestInit): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(path, { 
        ...options, 
        headers: this.headers,
        signal: controller.signal // L'AbortController permet d'annuler le fetch
      });
      
      clearTimeout(timeoutId); // On nettoie le timer si la requête réussit à temps

      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (error: any) {
      clearTimeout(timeoutId); // On nettoie le timer en cas d'erreur
      
      // On vérifie si l'erreur vient spécifiquement du dépassement de notre timeout
      if (error.name === "AbortError") {
        console.warn(`[IntellectusClient] Timeout de ${this.timeoutMs}ms dépassé pour la requête vers ${path}`);
      } else {
        console.warn(`[IntellectusClient] Échec de la requête vers ${path}`);
      }
      return null;
    }
  }

  private async get<T>(path: string, useCache = true): Promise<T | null> {
    if (useCache) {
      const cached = this.cache.get(path);
      if (cached) {
        if (Date.now() - cached.at < this.cacheTtl) {
          return cached.data as T;
        }
        // Nettoyage automatique de l'entrée expirée
        this.cache.delete(path);
      }
    }

    const data = await this.request<T>(path, { method: "GET" });
    
    if (data && useCache) {
      this.cache.set(path, { at: Date.now(), data });
    }
    
    return data;
  }

  private async post<T>(path: string, body: unknown): Promise<T | null> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // ==========================================
  // API Endpoints
  // ==========================================

  async getHealth(): Promise<IntellectusHealth | null> {
    const r = await this.get<{ ok: boolean; health: IntellectusHealth }>("/admin/intellectus");
    return r?.health ?? null;
  }

  async getThirdEye(): Promise<ThirdEyeStats | null> {
    return this.get<ThirdEyeStats>("/admin/thirdeye/stats");
  }

  async getCommands(): Promise<{ records: CommandRecordDTO[]; registered: string[]; stats: Record<string, unknown> } | null> {
    return this.get("/admin/commands");
  }

  async getBus(): Promise<{ history: BusHistoryEntry[]; stats: Record<string, unknown> } | null> {
    return this.get("/admin/bus");
  }

  async getMemory(): Promise<{ stats: Record<string, unknown>; snapshots: unknown[] } | null> {
    return this.get("/admin/memory");
  }

  async getScheduler(): Promise<{ stats: IntellectusHealth["momentus"] } | null> {
    return this.get("/admin/scheduler");
  }

  async getPlayers(): Promise<RPPlayerDTO[]> {
    const r = await this.get<{ ok: boolean; players: RPPlayerDTO[] }>("/api/rp/players");
    return r?.players ?? [];
  }

  async getProperties(): Promise<RPPropertyDTO[]> {
    const r = await this.get<{ ok: boolean; properties: RPPropertyDTO[] }>("/api/rp/properties");
    return r?.properties ?? [];
  }

  async getGangs(): Promise<RPGangDTO[]> {
    const r = await this.get<{ ok: boolean; gangs: RPGangDTO[] }>("/api/rp/gangs");
    return r?.gangs ?? [];
  }

  async takeSnapshot(namespace = "world"): Promise<boolean> {
    const r = await this.post<{ ok: boolean }>("/admin/memory/snapshot", { namespace });
    return r?.ok ?? false;
  }

  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    const r = await this.post<{ ok: boolean }>("/admin/memory/restore", { snapshotId });
    return r?.ok ?? false;
  }

  async unban(playerId: string): Promise<boolean> {
    const r = await this.post<{ ok: boolean }>("/admin/thirdeye/unban", { playerId });
    return r?.ok ?? false;
  }

  async dispatch(
    command: string,
    payload: Record<string, unknown> = {},
    playerId?: string
  ): Promise<{ ok: boolean; result?: unknown; error?: string } | null> {
    return this.post("/api/rp/dispatch", { command, payload, playerId });
  }

  async pushHeartbeat(body: Record<string, unknown>): Promise<boolean> {
    const r = await this.post<{ ok: boolean }>("/api/rp/heartbeat", body);
    return r?.ok ?? false;
  }

  async isOnline(): Promise<boolean> {
    const health = await this.getHealth();
    return health !== null; // Petit ajustement ici : valide la présence du serveur via un vrai ping sur /health
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const intellectusClient = new IntellectusClient();
