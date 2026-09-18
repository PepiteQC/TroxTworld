/**
 * 🍁 PERSISTENCE — Save/load érablières
 */
export interface ErabliereSave {
  version: number;
  timestamp: number;
  tapStates: Record<string, unknown>;
  evapStates: Record<string, unknown>;
  bushStats: Record<string, unknown>;
  jobs?: unknown[];
  npcWorkers?: unknown[];
  economy?: unknown;
  quests?: unknown[];
  events?: unknown[];
}

const SAVE_VERSION = 2;

export function buildSavePayload(data: {
  tapStates: Record<string, unknown>;
  evapStates: Record<string, unknown>;
  bushStats: Record<string, unknown>;
  jobs?: unknown[];
  npcWorkers?: unknown[];
  economy?: unknown;
  quests?: unknown[];
  events?: unknown[];
}): ErabliereSave {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    tapStates: data.tapStates,
    evapStates: data.evapStates,
    bushStats: data.bushStats,
    jobs: data.jobs,
    npcWorkers: data.npcWorkers,
    economy: data.economy,
    quests: data.quests,
    events: data.events,
  };
}

export function validateSave(raw: unknown): ErabliereSave | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<ErabliereSave>;
  if (typeof s.version !== "number") return null;
  if (!s.tapStates || typeof s.tapStates !== "object") return null;
  if (!s.evapStates || typeof s.evapStates !== "object") return null;
  if (!s.bushStats || typeof s.bushStats !== "object") return null;
  return {
    version: s.version,
    timestamp: s.timestamp ?? Date.now(),
    tapStates: s.tapStates,
    evapStates: s.evapStates,
    bushStats: s.bushStats,
    jobs: s.jobs,
    npcWorkers: s.npcWorkers,
    economy: s.economy,
    quests: s.quests,
    events: s.events,
  };
}