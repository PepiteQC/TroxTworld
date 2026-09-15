// ═══════════════════════════════════════════════════════════
// 🎲 MOTEUR DE GÉNÉRATION ALÉATOIRE & MATHS RP (GTA / THREE.JS)
// ═══════════════════════════════════════════════════════════

export type RngFn = (() => number) & {
  float: (min?: number, max?: number) => number;
  int: (min: number, max: number) => number;
  bool: (chance?: number) => boolean;
  pick: <T>(array: readonly T[]) => T;
  weighted: <T>(items: readonly T[], weights: readonly number[]) => T;
  shuffle: <T>(array: T[]) => T[];
  gaussian: (mean?: number, stdev?: number) => number;
};

/**
 * Crée un générateur pseudo-aléatoire déterministe (Mulberry32)
 * Rétrocompatible : s'appelle directement comme fonction `rng()` ou avec ses méthodes `rng.int(1, 6)`.
 */
export function makeRng(seed: number): RngFn {
  let s = (seed ^ 0x6d2b79f5) >>> 0;

  const fn = function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  } as RngFn;

  fn.float = (min = 0, max = 1) => min + fn() * (max - min);
  fn.int = (min: number, max: number) => Math.floor(min + fn() * (max - min + 1));
  fn.bool = (chance = 0.5) => fn() < chance;
  fn.pick = <T>(array: readonly T[]) => array[Math.floor(fn() * array.length)]!;
  fn.weighted = <T>(items: readonly T[], weights: readonly number[]) => pickWeighted(items, weights, fn);
  fn.shuffle = <T>(array: T[]) => shuffle(array, fn);
  fn.gaussian = (mean = 0, stdev = 1) => gaussianRandom(mean, stdev, fn);

  return fn;
}

// ═══════════════════════════════════════════════════════════
// 📐 INTERPOLATIONS & MATHÉMATIQUES CLASSIQUES
// ═══════════════════════════════════════════════════════════

/** Borne une valeur entre un minimum et un maximum */
export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

/** Interpolation linéaire entre a et b */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inverse du lerp : retourne le facteur t (0 à 1) à partir de la valeur v */
export function inverseLerp(a: number, b: number, v: number): number {
  if (Math.abs(b - a) < 1e-9) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

/** Recalibre une valeur d'une échelle [inMin, inMax] vers [outMin, outMax] */
export function remap(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clampResult = true,
): number {
  const t = (v - inMin) / (inMax - inMin);
  const res = outMin + t * (outMax - outMin);
  return clampResult ? clamp(res, Math.min(outMin, outMax), Math.max(outMin, outMax)) : res;
}

/** Transition douce d'Hermite (0 à 1) */
export function smoothstep(min: number, max: number, x: number): number {
  const t = clamp((x - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Transition encore plus douce (Ken Perlin) */
export function smootherstep(min: number, max: number, x: number): number {
  const t = clamp((x - min) / (max - min), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// ═══════════════════════════════════════════════════════════
// 📏 DISTANCES & VECTEURS (2D & 3D)
// ═══════════════════════════════════════════════════════════

/** Distance 2D au carré (optimisé sans Math.sqrt pour les tests de proximité) */
export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

/** Distance euclidienne 2D exacte */
export function distance(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

/** Distance 3D exacte */
export function distance3D(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ═══════════════════════════════════════════════════════════
// 🔄 ANGLES & TRIGONOMÉTRIE (VÉHICULES / CAMÉRA / IA)
// ═══════════════════════════════════════════════════════════

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function degToRad(deg: number): number {
  return deg * DEG2RAD;
}

export function radToDeg(rad: number): number {
  return rad * RAD2DEG;
}

/** Normalise un angle en radians entre -PI et +PI */
export function normalizeAngle(rad: number): number {
  return Math.atan2(Math.sin(rad), Math.cos(rad));
}

/** Différence la plus courte entre deux angles en radians */
export function angleDiff(fromRad: number, toRad: number): number {
  return normalizeAngle(toRad - fromRad);
}

/** Interpolation angulaire prenant le chemin le plus court */
export function lerpAngle(fromRad: number, toRad: number, t: number): number {
  const diff = angleDiff(fromRad, toRad);
  return normalizeAngle(fromRad + diff * clamp(t, 0, 1));
}

// ═══════════════════════════════════════════════════════════
// 🎲 RP, LOOT TABLES & COMPÉTENCES (GTA RP / FIVE M)
// ═══════════════════════════════════════════════════════════

/** Mélange un tableau sur place avec l'algorithme Fisher-Yates */
export function shuffle<T>(array: T[], rng: () => number = Math.random): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = array[i]!;
    array[i] = array[j]!;
    array[j] = temp;
  }
  return array;
}

/**
 * Sélectionne un élément aléatoire selon une table de probabilités pondérées
 * Ex: `pickWeighted(['fer', 'or', 'diamant'], [70, 25, 5])`
 */
export function pickWeighted<T>(
  items: readonly T[],
  weights: readonly number[],
  rng: () => number = Math.random,
): T {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i]!;

  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/**
 * Génère un nombre selon une distribution normale gaussienne (Box-Muller)
 * Idéal pour la précision des tirs, les temps de réaction ou les écarts de prix.
 */
export function gaussianRandom(mean = 0, stdev = 1, rng: () => number = Math.random): number {
  let u1 = rng();
  let u2 = rng();
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
  return mean + z0 * stdev;
}

/** Ajoute une variation aléatoire en pourcentage (ex: ±15%) */
export function jitter(baseValue: number, variancePercent = 0.1, rng: () => number = Math.random): number {
  const factor = 1 + (rng() * 2 - 1) * variancePercent;
  return baseValue * factor;
}

export interface SkillCheckResult {
  success: boolean;
  critical: boolean;
  margin: number;
  roll: number;
}

/**
 * Test de compétence de style GTA RP / JDR
 * @param skillLevel Compétence du joueur (0 à 100)
 * @param difficulty Difficulté de l'action (0 à 100)
 */
export function skillCheck(
  skillLevel: number,
  difficulty: number,
  rng: () => number = Math.random,
): SkillCheckResult {
  const roll = Math.floor(rng() * 100) + 1; // 1 à 100
  const effectiveChance = clamp(skillLevel - difficulty + 50, 5, 95);
  
  const success = roll <= effectiveChance;
  const critical = roll <= 5 || roll >= 96;
  const margin = effectiveChance - roll;

  return { success, critical, margin, roll };
}

// ═══════════════════════════════════════════════════════════
// 🏔️ BRUIT PROCÉDURAL (TERRAIN / VÉGÉTATION / TEMPÊTES)
// ═══════════════════════════════════════════════════════════

/** Hachage 2D déterministe ultra-rapide */
export function hash2D(x: number, z: number, seed = 1337): number {
  let h = seed ^ Math.imul(Math.floor(x), 0x27d4eb2d) ^ Math.imul(Math.floor(z), 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Bruit de valeur 2D lissé pour le relief et le placement d'arbres */
export function valueNoise2D(x: number, z: number, seed = 1337): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  const wx = fx * fx * (3 - 2 * fx);
  const wz = fz * fz * (3 - 2 * fz);

  const v00 = hash2D(ix, iz, seed);
  const v10 = hash2D(ix + 1, iz, seed);
  const v01 = hash2D(ix, iz + 1, seed);
  const v11 = hash2D(ix + 1, iz + 1, seed);

  const x0 = lerp(v00, v10, wx);
  const x1 = lerp(v01, v11, wx);
  return lerp(x0, x1, wz);
}

/** Bruit fractal multicouche (FBM) pour la hauteur des montagnes et le vent */
export function fractalNoise2D(
  x: number,
  z: number,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5,
  seed = 1337,
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += valueNoise2D(x * frequency, z * frequency, seed + i * 31) * amplitude;
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return total / maxValue;
}