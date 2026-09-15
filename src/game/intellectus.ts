/**
 * Noyau Intellectus — constantes, AOI, poses, synchronisation.
 * Fichier: /src/game/Intellectus.ts
 */
import { persist } from "./store";
import { quebecSeasons, seasonFromMonth, type QuebecSeason } from "./seasons";
import { SpatialHash } from "./spatial";

function envNumber(key: string, fallback: number): number {
  try {
    const raw = (import.meta as { env?: Record<string, string> }).env?.[key];
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export const INTELLECTUS = {
  aoiRadius: envNumber("VITE_AOI_RADIUS", 350),
  aoiCellSize: envNumber("VITE_AOI_CELL_SIZE", 64),
  patchRate: envNumber("VITE_COLYSEUS_PATCH_RATE", 20),
  flushIntervalMs: envNumber("VITE_PERSISTENCE_FLUSH_INTERVAL_MS", 5000),
  maxBufferSize: envNumber("VITE_PERSISTENCE_MAX_BUFFER", 200),
  maxStepMeters: envNumber("VITE_ANTICHEAT_MAX_STEP_M", 200),
  identityIntervalMs: envNumber("VITE_IDENTITY_INTERVAL_MS", 2500),
};

export const ANIMATIONS = [
  "idle", "walk", "run", "sprint", "crouch", "jump", "sit", "aim",
  "shoot", "reload", "dead", "swim", "drive", "wave", "surrender",
  "cross_arms", "point", "dance", "gang_sign", "phone", "salute",
] as const;

export type AnimName = (typeof ANIMATIONS)[number];

export function animIndex(name: string): number {
  const i = ANIMATIONS.indexOf(name as AnimName);
  return i < 0 ? 0 : i;
}

export function animName(index: number): AnimName {
  return ANIMATIONS[index] ?? "idle";
}

/** Pose compacte : [x, y, z, rotation, velocity, animationIndex] */
export type CompactPose = [number, number, number, number, number, number];

export function encodePose(x: number, y: number, z: number, rot: number, vel: number, animation: string): CompactPose {
  return [
    Math.round(x * 100) / 100,
    Math.round(y * 100) / 100,
    Math.round(z * 100) / 100,
    Math.round(rot * 1000) / 1000,
    Math.round(vel * 10) / 10,
    animIndex(animation),
  ];
}

export function decodePose(data: number[]): {
  x: number; y: number; z: number; rotation: number; velocity: number; animation: AnimName;
} | null {
  if (!Array.isArray(data) || data.length < 4) return null;
  const [x, y, z, rot, vel = 0, anim = 0] = data;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  return { x, y, z, rotation: rot, velocity: vel, animation: animName(anim) };
}

export function coarseZone(n: number): number {
  return Math.round(n / 100) * 100;
}

export type SeasonId = QuebecSeason;

export { seasonFromMonth };

export interface IntellectusWorld {
  hour: number;
  day: number;
  month: number;
  season: SeasonId;
  weather: string;
  temperature: number;
  windSpeed: number;
  snowDepth: number;
}

export function worldFromClock(hour: number, weather: string): IntellectusWorld {
  const wx = quebecSeasons.getState();
  const month = wx.season === "hiver" ? 1 : wx.season === "printemps" ? 4 : wx.season === "ete" ? 7 : 10;
  return {
    hour,
    day: 12,
    month,
    season: wx.season,
    weather: wx.condition || weather,
    temperature: wx.temperatureCelsius,
    windSpeed: wx.windSpeedKmH,
    snowDepth: wx.snowAccumulationCm / 100,
  };
}

export class PersistBehind {
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stats = { queued: 0, flushed: 0, merged: 0 };

  mark(): void {
    if (this.dirty) {
      this.stats.merged++;
    } else {
      this.stats.queued++;
      this.dirty = true;
    }
    if (this.timer != null) return;
    this.timer = setTimeout(() => this.flush(), INTELLECTUS.flushIntervalMs);
  }

  flush(): number {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty) return 0;
    this.dirty = false;
    persist();
    this.stats.flushed++;
    return 1;
  }

  getStats() {
    return { ...this.stats, pending: this.dirty ? 1 : 0 };
  }
}

export const spatial = new SpatialHash(INTELLECTUS.aoiCellSize);
export const persistBehind = new PersistBehind();

const queryBuf: import("./spatial").SpatialEntry[] = [];

export function nearbyIds(x: number, z: number, radius = INTELLECTUS.aoiRadius, kind?: "player" | "entity"): string[] {
  spatial.query(x, z, radius, queryBuf);
  const ids: string[] = [];
  for (const e of queryBuf) {
    if (kind && e.kind !== kind) continue;
    ids.push(e.id);
  }
  return ids;
}

export function inAoi(ax: number, az: number, bx: number, bz: number, radius = INTELLECTUS.aoiRadius): boolean {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz <= radius * radius;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => persistBehind.flush());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) persistBehind.flush();
  });
}