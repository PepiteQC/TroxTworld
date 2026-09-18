/**
 * Noyau Intellectus — constantes, AOI, de poses, de synchronisation et de persistance.
 * Fichier: /src/game/intellectus.ts
 * Architecture : Universal Env, O(1) Lookups, Zero-GC Spatial Queries.
 */

import { persist } from "./store";
import { quebecSeasons, seasonFromMonth, type QuebecSeason } from "./seasons";
import { SpatialHash, type SpatialEntry } from "./spatial";

// ==========================================
// CONFIGURATION UNIVERSELLE (NODE / VITE)
// ==========================================

function envNumber(key: string, fallback: number): number {
  try {
    const env = typeof process !== "undefined" && process.env 
      ? process.env 
      : (import.meta as any).env;
      
    const raw = env?.[key];
    if (raw === undefined || raw === null) return fallback;
    
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch (error) {
    console.warn(`[Intellectus] Failed to read env var ${key}:`, error);
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

// Validation des configurations critiques
if (INTELLECTUS.aoiRadius <= 0) {
  console.warn("[Intellectus] Invalid AOI radius, using default (350)");
  (INTELLECTUS as any).aoiRadius = 350;
}

if (INTELLECTUS.aoiCellSize <= 0) {
  console.warn("[Intellectus] Invalid AOI cell size, using default (64)");
  (INTELLECTUS as any).aoiCellSize = 64;
}

// ==========================================
// OPTIMISATION DES ANIMATIONS (O(1) LOOKUP)
// ==========================================

export const ANIMATIONS = [
  "idle", "walk", "run", "sprint", "crouch", "jump", "sit", "aim",
  "shoot", "reload", "dead", "swim", "drive", "wave", "surrender",
  "cross_arms", "point", "dance", "gang_sign", "phone", "salute",
] as const;

export type AnimName = (typeof ANIMATIONS)[number];

const ANIM_INDEX_MAP = new Map<string, number>();
for (let i = 0; i < ANIMATIONS.length; i++) {
  ANIM_INDEX_MAP.set(ANIMATIONS[i]!, i);
}

export function animIndex(name: string): number {
  const idx = ANIM_INDEX_MAP.get(name);
  return idx !== undefined ? idx : 0;
}

export function animName(index: number): AnimName {
  if (index < 0 || index >= ANIMATIONS.length) {
    return "idle";
  }
  return ANIMATIONS[index]!;
}

export function isValidAnim(name: string): name is AnimName {
  return ANIM_INDEX_MAP.has(name);
}

// ==========================================
// ENCODAGE / DÉCODAGE DES POSES
// ==========================================

export type CompactPose = [number, number, number, number, number, number];

export interface DecodedPose {
  x: number;
  y: number;
  z: number;
  rotation: number;
  velocity: number;
  animation: AnimName;
}

export function encodePose(
  x: number, 
  y: number, 
  z: number, 
  rot: number, 
  vel: number, 
  animation: string
): CompactPose {
  return [
    Math.round(x * 100) / 100,
    Math.round(y * 100) / 100,
    Math.round(z * 100) / 100,
    Math.round(rot * 1000) / 1000,
    Math.round(vel * 10) / 10,
    animIndex(animation),
  ];
}

export function decodePose(data: unknown): DecodedPose | null {
  if (!Array.isArray(data) || data.length < 4) {
    return null;
  }
  
  const arr = data as unknown[];
  const x = arr[0];
  const y = arr[1];
  const z = arr[2];
  const rot = arr[3];
  const vel = arr[4] ?? 0;
  const anim = arr[5] ?? 0;
  
  if (
    typeof x !== "number" || 
    typeof y !== "number" || 
    typeof z !== "number" ||
    !Number.isFinite(x) || 
    !Number.isFinite(y) || 
    !Number.isFinite(z)
  ) {
    return null;
  }
  
  return {
    x,
    y,
    z,
    rotation: typeof rot === "number" ? rot : 0,
    velocity: typeof vel === "number" ? vel : 0,
    animation: animName(typeof anim === "number" ? anim : 0),
  };
}

// ==========================================
// MÉTÉO & MONDE
// ==========================================

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

export function worldFromClock(hour: number, weather?: string): IntellectusWorld {
  const wx = quebecSeasons.getState();
  
  const seasonToMonth: Record<QuebecSeason, number> = {
    hiver: 1,      // Janvier
    printemps: 4,  // Avril
    ete: 7,        // Juillet
    automne: 10,   // Octobre
  };
  
  const month = seasonToMonth[wx.season] ?? 7;
  
  return {
    hour: Math.max(0, Math.min(23, Math.floor(hour))),
    day: 12,
    month,
    season: wx.season,
    weather: wx.condition || weather || "clear",
    temperature: wx.temperatureCelsius ?? 20,
    windSpeed: wx.windSpeedKmH ?? 0,
    snowDepth: (wx.snowAccumulationCm ?? 0) / 100,
  };
}

// ==========================================
// PERSISTANCE EN ARRIÈRE-PLAN (ZERO-GC)
// ==========================================

export interface PersistStats {
  queued: number;
  flushed: number;
  merged: number;
  pending: number;
  errors: number;
}

export class PersistBehind {
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly stats: PersistStats = {
    queued: 0,
    flushed: 0,
    merged: 0,
    pending: 0,
    errors: 0,
  };

  mark(): void {
    if (this.dirty) {
      this.stats.merged++;
    } else {
      this.stats.queued++;
      this.dirty = true;
    }
    
    if (this.timer !== null) return;
    
    this.timer = setTimeout(() => {
      try {
        this.flush();
      } catch (error) {
        console.error("[PersistBehind] Flush failed:", error);
        this.stats.errors++;
      }
    }, INTELLECTUS.flushIntervalMs);
  }

  flush(): number {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (!this.dirty) return 0;
    
    this.dirty = false;
    
    try {
      persist();
      this.stats.flushed++;
      return 1;
    } catch (error) {
      console.error("[PersistBehind] Persist failed:", error);
      this.stats.errors++;
      return 0;
    }
  }

  getStats(): Readonly<PersistStats> {
    this.stats.pending = this.dirty ? 1 : 0;
    return this.stats;
  }
  
  resetStats(): void {
    this.stats.queued = 0;
    this.stats.flushed = 0;
    this.stats.merged = 0;
    this.stats.pending = 0;
    this.stats.errors = 0;
  }
}

// ==========================================
// REQUÊTES SPATIALES & AOI (ZERO-GC)
// ==========================================

export const spatial = new SpatialHash(INTELLECTUS.aoiCellSize);
export const persistBehind = new PersistBehind();

// Pool de buffers pour requêtes et compatibilité ascendante/descendante
const queryBuf: SpatialEntry[] = [];

export function nearbyIds(
  x: number, 
  z: number, 
  radius = INTELLECTUS.aoiRadius, 
  kind?: "player" | "entity",
  outBuffer: string[] = []
): string[] {
  outBuffer.length = 0;
  
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return outBuffer;
  }

  let entries: SpatialEntry[] = [];
  const spatialAny = spatial as any;

  // Détection dynamique et sécurisée de la signature de méthode de SpatialHash
  if (typeof spatialAny.queryRadius === "function") {
    entries = spatialAny.queryRadius(x, z, radius);
  } else if (typeof spatialAny.query === "function") {
    queryBuf.length = 0;
    spatialAny.query(x, z, radius, queryBuf);
    entries = queryBuf;
  }
  
  const len = entries.length;
  for (let i = 0; i < len; i++) {
    const e = entries[i];
    if (e && (!kind || e.kind === kind)) {
      outBuffer.push(e.id);
    }
  }
  
  return outBuffer;
}

export function inAoi(
  ax: number, 
  az: number, 
  bx: number, 
  bz: number, 
  radius = INTELLECTUS.aoiRadius
): boolean {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz <= radius * radius;
}

export function distanceSquared(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

// ==========================================
// UTILITAIRES DE CALCULS
// ==========================================

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

// ==========================================
// GESTION DU CYCLE DE VIE DES EVENEMENTS
// ==========================================

const cleanupFunctions: Array<() => void> = [];

if (typeof window !== "undefined") {
  const handleBeforeUnload = () => {
    persistBehind.flush();
  };
  
  const handleVisibilityChange = () => {
    if (document.hidden) {
      persistBehind.flush();
    }
  };
  
  window.addEventListener("beforeunload", handleBeforeUnload);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  cleanupFunctions.push(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });
}

export function cleanup(): void {
  persistBehind.flush();
  cleanupFunctions.forEach(fn => fn());
  cleanupFunctions.length = 0;
}

// ==========================================
// SYSTEM DIAGNOSTICS & DEBUG
// ==========================================

export function getDebugInfo() {
  return {
    config: { ...INTELLECTUS },
    animations: ANIMATIONS.length,
    persistStats: persistBehind.getStats(),
    spatialHash: (spatial as any).getStats?.() ?? null,
  };
}