// server/intellectus/types.ts
// ETHERWORLD RP — TroxTetherworld Platinum Intellectus Server Types

export type ThreatLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface ThreatAssessment {
  level: ThreatLevel;
  reason: string;
  score: number; // 0 - 100
  triggers: string[];
  timestamp: number;
}

export interface BusEvent {
  id: string;
  type: string;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  source?: string;
  timestamp: number;
}

export interface MemoryVersion {
  id: string;
  timestamp: number;
  label: string;
  author: string;
  snapshot: any;
  changesCount: number;
}

export interface SchedulerTask {
  name: string;
  intervalMs: number;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
  status: 'running' | 'paused' | 'failed' | 'stopped';
}

export interface ThirdEyeAlert {
  id: string;
  severity: ThreatLevel;
  source: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface IKernel {
  intellectus?: {
    getStatus: () => {
      status: string;
      uptime: number;
      threatAssessment: ThreatAssessment;
      eventsProcessed: number;
      activeRules: number;
    };
    evaluateThreat?: (contextData: any) => ThreatAssessment;
  };
  db?: {
    getStats: () => {
      connected: boolean;
      tableCount: number;
      totalRows: number;
      lastSyncTime: number;
    };
    flush: () => Promise<void>;
  };
  state?: {
    save: () => Promise<void>;
    getState?: () => any;
  };
  bus?: {
    history: BusEvent[];
    emit: (type: string, payload?: any, priority?: 'low' | 'normal' | 'high' | 'critical', source?: string) => Promise<BusEvent>;
    getHistory: (filter?: { type?: string; priority?: string; since?: number | string }) => BusEvent[];
  };
  memory?: {
    versions: MemoryVersion[];
    getVersion: (id: string) => MemoryVersion | undefined;
    revertTo: (id: string) => boolean;
    searchHistory: (query: string) => MemoryVersion[];
    diffVersions: (fromId: string, toId: string) => { added: string[]; modified: string[]; removed: string[] };
    createSnapshot?: (label: string, author?: string) => MemoryVersion;
  };
  scheduler?: {
    getStatus: () => SchedulerTask[];
    stop: (taskName: string) => void;
    start?: (taskName: string) => void;
  };
  thirdEye?: {
    level?: ThreatLevel;
    alerts?: ThirdEyeAlert[];
    addAlert?: (alert: Omit<ThirdEyeAlert, 'id' | 'timestamp'>) => ThirdEyeAlert;
  };
  contracts?: {
    isLockedOut: (userId: string) => boolean;
    lockoutUser?: (userId: string, durationMinutes: number, reason: string) => void;
  };
}

export interface CommandOptions {
  permission?: 'user' | 'moderator' | 'admin' | 'superadmin' | 'owner' | string;
  rateLimit?: number; // ms minimum delay
  rollback?: ((params: unknown, snapshot: any) => Promise<void>) | null;
  description?: string;
}

export type CommandHandler = (params: any, ctx: any) => Promise<any> | any;

export interface RegisteredCommand {
  handler: CommandHandler;
  options?: CommandOptions;
  executedCount: number;
  lastExecutedAt?: number;
}

export interface DecapriusCommands {
  commands: Map<string, RegisteredCommand>;
  register: (name: string, handler: CommandHandler, options?: CommandOptions) => void;
  execute: (name: string, params: any, ctx: any) => Promise<any>;
}
