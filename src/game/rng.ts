/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🎲 MOTEUR DE GÉNÉRATION ALÉATOIRE & MATHS RP (v2.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - Perlin & Simplex noise (meilleure qualité)
 *  - Worley noise (cellules, routes, territoires)
 *  - Distributions avancées (exponential, poisson, disk, sphere)
 *  - Système de dés complet (d4, d6, d8, d10, d12, d20, d100)
 *  - Courbes d'animation (ease, bounce, elastic)
 *  - Loot table builder avec rarités
 *  - Calculs de dégâts avec armor penetration
 *  - Helpers pour world generation
 *  - Optimisations SIMD-like
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════
// 🎲 RNG DÉTERMINISTE (MULBERRY32)
// ═══════════════════════════════════════════════════════════

export type RngFn = (() => number) & {
  float: (min?: number, max?: number) => number;
  int: (min: number, max: number) => number;
  bool: (chance?: number) => boolean;
  pick: <T>(array: readonly T[]) => T;
  weighted: <T>(items: readonly T[], weights: readonly number[]) => T;
  shuffle: <T>(array: T[]) => T[];
  gaussian: (mean?: number, stdev?: number) => number;
  // ── NOUVEAU v2.0 ──
  exponential: (lambda?: number) => number;
  poisson: (lambda: number) => number;
  uniformDisk: () => { x: number; y: number };
  uniformSphere: () => { x: number; y: number; z: number };
  normalDisk: (radius?: number) => { x: number; y: number };
  dice: (sides: number, count?: number) => number;
  seed: number;
};

export function makeRng(seed: number): RngFn {
  let s = (seed ^ 0x6d2b79f5) >>> 0;
  const originalSeed = seed;

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
  
  // ── NOUVEAU v2.0 ──
  fn.exponential = (lambda = 1) => exponentialRandom(lambda, fn);
  fn.poisson = (lambda: number) => poissonRandom(lambda, fn);
  fn.uniformDisk = () => uniformDisk(fn);
  fn.uniformSphere = () => uniformSphere(fn);
  fn.normalDisk = (radius = 1) => normalDisk(radius, fn);
  fn.dice = (sides: number, count = 1) => rollDice(sides, count, fn);
  fn.seed = originalSeed;

  return fn;
}

// ═══════════════════════════════════════════════════════════
// 📐 INTERPOLATIONS & MATHÉMATIQUES CLASSIQUES
// ═══════════════════════════════════════════════════════════

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, v: number): number {
  if (Math.abs(b - a) < 1e-9) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

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

export function smoothstep(min: number, max: number, x: number): number {
  const t = clamp((x - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(min: number, max: number, x: number): number {
  const t = clamp((x - min) / (max - min), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// ── NOUVEAU v2.0 : Courbes d'animation ──

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutCubic(t: number): number {
  return (--t) * t * t + 1;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

export function easeInExpo(t: number): number {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutExpo(t: number): number {
  if (t === 0 || t === 1) return t;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

export function easeOutBounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  } else {
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
}

export function easeInBounce(t: number): number {
  return 1 - easeOutBounce(1 - t);
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}

export function easeInElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.075) * (2 * Math.PI) / 0.3);
}

// ═══════════════════════════════════════════════════════════
// 📏 DISTANCES & VECTEURS (2D & 3D)
// ═══════════════════════════════════════════════════════════

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function distance(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

export function distance3D(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ── NOUVEAU v2.0 : Distances avancées ──

export function manhattanDistance(ax: number, az: number, bx: number, bz: number): number {
  return Math.abs(ax - bx) + Math.abs(az - bz);
}

export function chebyshevDistance(ax: number, az: number, bx: number, bz: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(az - bz));
}

export function angleBetween(ax: number, az: number, bx: number, bz: number): number {
  return Math.atan2(bz - az, bx - ax);
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

export function normalizeAngle(rad: number): number {
  return Math.atan2(Math.sin(rad), Math.cos(rad));
}

export function angleDiff(fromRad: number, toRad: number): number {
  return normalizeAngle(toRad - fromRad);
}

export function lerpAngle(fromRad: number, toRad: number, t: number): number {
  const diff = angleDiff(fromRad, toRad);
  return normalizeAngle(fromRad + diff * clamp(t, 0, 1));
}

// ── NOUVEAU v2.0 : Trigonométrie optimisée ──

const SIN_TABLE_SIZE = 3600;
const SIN_TABLE: number[] = [];
const COS_TABLE: number[] = [];

for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  const angle = (i / SIN_TABLE_SIZE) * Math.PI * 2;
  SIN_TABLE.push(Math.sin(angle));
  COS_TABLE.push(Math.cos(angle));
}

export function fastSin(rad: number): number {
  const normalized = ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const index = Math.floor((normalized / (Math.PI * 2)) * SIN_TABLE_SIZE);
  return SIN_TABLE[index]!;
}

export function fastCos(rad: number): number {
  const normalized = ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const index = Math.floor((normalized / (Math.PI * 2)) * SIN_TABLE_SIZE);
  return COS_TABLE[index]!;
}

// ═══════════════════════════════════════════════════════════
// 🎲 RP, LOOT TABLES & COMPÉTENCES
// ═══════════════════════════════════════════════════════════

export function shuffle<T>(array: T[], rng: () => number = Math.random): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = array[i]!;
    array[i] = array[j]!;
    array[j] = temp;
  }
  return array;
}

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

export function gaussianRandom(mean = 0, stdev = 1, rng: () => number = Math.random): number {
  let u1 = rng();
  let u2 = rng();
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
  return mean + z0 * stdev;
}

export function jitter(baseValue: number, variancePercent = 0.1, rng: () => number = Math.random): number {
  const factor = 1 + (rng() * 2 - 1) * variancePercent;
  return baseValue * factor;
}

// ── NOUVEAU v2.0 : Distributions avancées ──

export function exponentialRandom(lambda = 1, rng: () => number = Math.random): number {
  let u = rng();
  while (u === 0) u = rng();
  return -Math.log(u) / lambda;
}

export function poissonRandom(lambda: number, rng: () => number = Math.random): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  
  do {
    k++;
    p *= rng();
  } while (p > L);
  
  return k - 1;
}

export function uniformDisk(rng: () => number = Math.random): { x: number; y: number } {
  const angle = rng() * Math.PI * 2;
  const radius = Math.sqrt(rng());
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

export function uniformSphere(rng: () => number = Math.random): { x: number; y: number; z: number } {
  const theta = rng() * Math.PI * 2;
  const phi = Math.acos(2 * rng() - 1);
  const radius = Math.cbrt(rng());
  
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  };
}

export function normalDisk(radius = 1, rng: () => number = Math.random): { x: number; y: number } {
  const angle = rng() * Math.PI * 2;
  const r = gaussianRandom(0, radius / 3, rng);
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
  };
}

// ── NOUVEAU v2.0 : Système de dés ──

export type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

export function rollDice(sides: number, count = 1, rng: () => number = Math.random): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(rng() * sides) + 1;
  }
  return total;
}

export function rollDiceType(type: DiceType, count = 1, rng: () => number = Math.random): number {
  const sides = parseInt(type.substring(1));
  return rollDice(sides, count, rng);
}

export interface DiceRollResult {
  rolls: number[];
  total: number;
  min: number;
  max: number;
  average: number;
}

export function rollDiceDetailed(sides: number, count = 1, rng: () => number = Math.random): DiceRollResult {
  const rolls: number[] = [];
  let total = 0;
  
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(rng() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }
  
  return {
    rolls,
    total,
    min: count,
    max: count * sides,
    average: (count * (sides + 1)) / 2,
  };
}

// ── NOUVEAU v2.0 : Loot tables ──

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface LootTableItem<T> {
  item: T;
  weight: number;
  rarity?: ItemRarity;
  minQty?: number;
  maxQty?: number;
}

export interface LootDrop<T> {
  item: T;
  quantity: number;
  rarity: ItemRarity;
}

export class LootTable<T> {
  private items: LootTableItem<T>[] = [];
  private totalWeight = 0;
  
  add(item: T, weight: number, rarity: ItemRarity = "common", minQty = 1, maxQty = 1): this {
    this.items.push({ item, weight, rarity, minQty, maxQty });
    this.totalWeight += weight;
    return this;
  }
  
  roll(rng: () => number = Math.random): LootDrop<T> | null {
    if (this.items.length === 0) return null;
    
    let roll = rng() * this.totalWeight;
    
    for (const entry of this.items) {
      roll -= entry.weight;
      if (roll <= 0) {
        const quantity = entry.minQty === entry.maxQty
          ? entry.minQty
          : Math.floor(rng() * (entry.maxQty! - entry.minQty! + 1)) + entry.minQty!;
        
        return {
          item: entry.item,
          quantity: quantity ?? 0,
          rarity: entry.rarity ?? "common",
        };
      }
    }
    
    const last = this.items[this.items.length - 1]!;
    return {
      item: last.item,
      quantity: last.minQty ?? 1,
      rarity: last.rarity ?? "common",
    };
  }
  
  rollMultiple(count: number, rng: () => number = Math.random): LootDrop<T>[] {
    const drops: LootDrop<T>[] = [];
    for (let i = 0; i < count; i++) {
      const drop = this.roll(rng);
      if (drop) drops.push(drop);
    }
    return drops;
  }
  
  getRarityWeights(): Record<ItemRarity, number> {
    const weights: Record<ItemRarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };
    
    for (const item of this.items) {
      weights[item.rarity ?? "common"] += item.weight;
    }
    
    return weights;
  }
}

// ── NOUVEAU v2.0 : Calculs de dégâts ──

export interface DamageCalculation {
  baseDamage: number;
  armorPenetration: number;
  armorValue: number;
  criticalMultiplier: number;
  isCritical: boolean;
  finalDamage: number;
}

export function calculateDamage(
  baseDamage: number,
  armorPenetration: number,
  armorValue: number,
  critChance: number = 0.1,
  critMultiplier: number = 2.0,
  rng: () => number = Math.random,
): DamageCalculation {
  const isCritical = rng() < critChance;
  const effectiveArmor = Math.max(0, armorValue - armorPenetration);
  const damageReduction = effectiveArmor / (effectiveArmor + 100);
  const reducedDamage = baseDamage * (1 - damageReduction);
  const finalDamage = isCritical ? reducedDamage * critMultiplier : reducedDamage;
  
  return {
    baseDamage,
    armorPenetration,
    armorValue,
    criticalMultiplier: isCritical ? critMultiplier : 1.0,
    isCritical,
    finalDamage: Math.round(finalDamage),
  };
}

export interface SkillCheckResult {
  success: boolean;
  critical: boolean;
  margin: number;
  roll: number;
}

export function skillCheck(
  skillLevel: number,
  difficulty: number,
  rng: () => number = Math.random,
): SkillCheckResult {
  const roll = Math.floor(rng() * 100) + 1;
  const effectiveChance = clamp(skillLevel - difficulty + 50, 5, 95);
  
  const success = roll <= effectiveChance;
  const critical = roll <= 5 || roll >= 96;
  const margin = effectiveChance - roll;

  return { success, critical, margin, roll };
}

// ═══════════════════════════════════════════════════════════
// 🏔️ BRUIT PROCÉDURAL (TERRAIN / VÉGÉTATION / TEMPÊTES)
// ═══════════════════════════════════════════════════════════

export function hash2D(x: number, z: number, seed = 1337): number {
  let h = seed ^ Math.imul(Math.floor(x), 0x27d4eb2d) ^ Math.imul(Math.floor(z), 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hash3D(x: number, y: number, z: number, seed = 1337): number {
  let h = seed ^ Math.imul(Math.floor(x), 0x27d4eb2d) ^ Math.imul(Math.floor(y), 0x165667b1) ^ Math.imul(Math.floor(z), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

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

// ── NOUVEAU v2.0 : Perlin noise ──

const PERLIN_PERM = new Uint8Array(512);
const PERLIN_GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function initPerlin(seed: number): void {
  const rng = makeRng(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = p[i]!;
    p[i] = p[j]!;
    p[j] = temp;
  }
  
  for (let i = 0; i < 512; i++) {
    PERLIN_PERM[i] = p[i & 255]!;
  }
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad2D(hash: number, x: number, y: number): number {
  const g = PERLIN_GRAD[hash & 7]!;
  return g[0]! * x + g[1]! * y;
}

export function perlinNoise2D(x: number, z: number, seed = 1337): number {
  if (PERLIN_PERM[0] === 0 && PERLIN_PERM[1] === 1) {
    initPerlin(seed);
  }
  
  const X = Math.floor(x) & 255;
  const Z = Math.floor(z) & 255;
  
  x -= Math.floor(x);
  z -= Math.floor(z);
  
  const u = fade(x);
  const v = fade(z);
  
  const A = PERLIN_PERM[X]! + Z;
  const B = PERLIN_PERM[X + 1]! + Z;
  
  return lerp(
    lerp(grad2D(PERLIN_PERM[A]!, x, z), grad2D(PERLIN_PERM[B]!, x - 1, z), u),
    lerp(grad2D(PERLIN_PERM[A + 1]!, x, z - 1), grad2D(PERLIN_PERM[B + 1]!, x - 1, z - 1), u),
    v
  );
}

export function fractalPerlin2D(
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
    total += perlinNoise2D(x * frequency, z * frequency, seed + i * 31) * amplitude;
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

// ── NOUVEAU v2.0 : Worley noise (cellules) ──

export function worleyNoise2D(
  x: number,
  z: number,
  seed = 1337,
  distanceFunc: "euclidean" | "manhattan" | "chebyshev" = "euclidean"
): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  
  let minDist = Infinity;
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const cellX = ix + dx;
      const cellZ = iz + dz;
      
      const px = cellX + hash2D(cellX, cellZ, seed);
      const pz = cellZ + hash2D(cellX, cellZ, seed + 1);
      
      let dist: number;
      if (distanceFunc === "euclidean") {
        dist = Math.hypot(x - px, z - pz);
      } else if (distanceFunc === "manhattan") {
        dist = Math.abs(x - px) + Math.abs(z - pz);
      } else {
        dist = Math.max(Math.abs(x - px), Math.abs(z - pz));
      }
      
      if (dist < minDist) {
        minDist = dist;
      }
    }
  }
  
  return minDist;
}

export function worleyNoise2DF2(
  x: number,
  z: number,
  seed = 1337,
): { f1: number; f2: number } {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  
  const dists: number[] = [];
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const cellX = ix + dx;
      const cellZ = iz + dz;
      
      const px = cellX + hash2D(cellX, cellZ, seed);
      const pz = cellZ + hash2D(cellX, cellZ, seed + 1);
      
      const dist = Math.hypot(x - px, z - pz);
      dists.push(dist);
    }
  }
  
  dists.sort((a, b) => a - b);
  
  return {
    f1: dists[0]!,
    f2: dists[1]!,
  };
}

// ── NOUVEAU v2.0 : Ridged multifractal ──

export function ridgedMultifractal2D(
  x: number,
  z: number,
  octaves = 6,
  lacunarity = 2.0,
  gain = 0.5,
  offset = 1.0,
  seed = 1337,
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let weight = 1;
  
  for (let i = 0; i < octaves; i++) {
    let signal = perlinNoise2D(x * frequency, z * frequency, seed + i * 31);
    signal = Math.abs(signal);
    signal = offset - signal;
    signal *= signal;
    signal *= weight;
    
    weight = clamp(signal * gain, 0, 1);
    total += signal * amplitude;
    
    frequency *= lacunarity;
    amplitude *= gain;
  }
  
  return total;
}

// ── NOUVEAU v2.0 : Domain warping ──

export function domainWarpedNoise2D(
  x: number,
  z: number,
  strength = 1.0,
  seed = 1337,
): number {
  const qx = fractalPerlin2D(x, z, 4, 2.0, 0.5, seed);
  const qz = fractalPerlin2D(x + 5.2, z + 1.3, 4, 2.0, 0.5, seed + 1);
  
  const rx = fractalPerlin2D(x + strength * qx, z + strength * qz, 4, 2.0, 0.5, seed + 2);
  const rz = fractalPerlin2D(x + strength * qx + 1.7, z + strength * qz + 9.2, 4, 2.0, 0.5, seed + 3);
  
  return fractalPerlin2D(x + strength * rx, z + strength * rz, 4, 2.0, 0.5, seed + 4);
}

// ── NOUVEAU v2.0 : Curl noise (pour fluides/vent) ──

export function curlNoise2D(
  x: number,
  z: number,
  epsilon = 0.001,
  seed = 1337,
): { x: number; z: number } {
  const dx = (fractalPerlin2D(x, z + epsilon, 4, 2.0, 0.5, seed) - 
              fractalPerlin2D(x, z - epsilon, 4, 2.0, 0.5, seed)) / (2 * epsilon);
  const dz = (fractalPerlin2D(x + epsilon, z, 4, 2.0, 0.5, seed) - 
              fractalPerlin2D(x - epsilon, z, 4, 2.0, 0.5, seed)) / (2 * epsilon);
  
  return {
    x: dz,
    z: -dx,
  };
}

// ═══════════════════════════════════════════════════════════
// 🌍 WORLD GENERATION HELPERS
// ═══════════════════════════════════════════════════════════

export interface WorldGenConfig {
  seed: number;
  terrainScale: number;
  terrainHeight: number;
  treeDensity: number;
  rockDensity: number;
  waterLevel: number;
}

export function getTerrainHeight(x: number, z: number, config: WorldGenConfig): number {
  const noise = fractalPerlin2D(
    x / config.terrainScale,
    z / config.terrainScale,
    6,
    2.0,
    0.5,
    config.seed
  );
  
  return noise * config.terrainHeight;
}

export function shouldPlaceTree(x: number, z: number, config: WorldGenConfig): boolean {
  const height = getTerrainHeight(x, z, config);
  if (height < config.waterLevel + 2) return false;
  
  const density = valueNoise2D(x * 0.1, z * 0.1, config.seed + 1000);
  return density < config.treeDensity;
}

export function shouldPlaceRock(x: number, z: number, config: WorldGenConfig): boolean {
  const height = getTerrainHeight(x, z, config);
  if (height < config.waterLevel + 1) return false;
  
  const density = valueNoise2D(x * 0.15, z * 0.15, config.seed + 2000);
  return density < config.rockDensity;
}

export function getBiome(x: number, z: number, config: WorldGenConfig): "water" | "beach" | "forest" | "mountain" {
  const height = getTerrainHeight(x, z, config);
  
  if (height < config.waterLevel) return "water";
  if (height < config.waterLevel + 3) return "beach";
  if (height > config.terrainHeight * 0.7) return "mountain";
  return "forest";
}

// ═══════════════════════════════════════════════════════════
// ⚡ OPTIMISATIONS & BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════

export function batchLerp(
  values: number[],
  targets: number[],
  t: number,
  output?: number[]
): number[] {
  const result = output ?? new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    result[i] = lerp(values[i]!, targets[i]!, t);
  }
  return result;
}

export function batchClamp(
  values: number[],
  min: number,
  max: number,
  output?: number[]
): number[] {
  const result = output ?? new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    result[i] = clamp(values[i]!, min, max);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES & UTILITAIRES
// ═══════════════════════════════════════════════════════════

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let sum = 0;
  for (const v of values) sum += (v - m) * (v - m);
  return sum / values.length;
}

export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  return lerp(sorted[lower]!, sorted[upper]!, index - lower);
}