/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ROAD TEXTURES v2.0 — Procédural QC déterministe
 *  src/roads/shared/RoadTextures.ts
 * ───────────────────────────────────────────────────────────────────────────
 *  • RNG seedé (reproductibilité totale)
 *  • Cache avec limite LRU (anti-fuite GPU)
 *  • dispose() complet
 *  • Config (seed, repeat, anisotropic)
 *  • Compat 100% v1 (5 fonctions)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { makeProceduralTexture } from '../../systems/TextureCache';

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════

export interface RoadTexturesConfig {
  /** Seed pour la génération procédurale */
  seed: number;
  /** Résolution des textures */
  resolution: number;
  /** Anisotropie */
  anisotropy: number;
  /** Taille max du cache matériaux */
  maxCacheSize: number;
  /** Repeat par défaut (u, v) */
  defaultRepeat: [number, number];
}

const DEFAULT_CONFIG: RoadTexturesConfig = {
  seed: 138,
  resolution: 1024,
  anisotropy: 8,
  maxCacheSize: 32,
  defaultRepeat: [4, 40],
};

let _config: RoadTexturesConfig = { ...DEFAULT_CONFIG };

export function configureRoadTextures(patch: Partial<RoadTexturesConfig>): void {
  _config = { ..._config, ...patch };
  // Invalide le cache si la seed change
  if (patch.seed !== undefined) {
    disposeRoadMaterials();
  }
}

// ═══════════════════════════════════════════════════════════
// SEEDED RNG
// ═══════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════
// CACHE LRU
// ═══════════════════════════════════════════════════════════

const matCache = new Map<string, THREE.MeshStandardMaterial>();
const matCacheOrder: string[] = [];

function cacheGet(key: string): THREE.MeshStandardMaterial | undefined {
  const m = matCache.get(key);
  if (m) {
    // Refresh ordre LRU
    const idx = matCacheOrder.indexOf(key);
    if (idx !== -1) matCacheOrder.splice(idx, 1);
    matCacheOrder.push(key);
  }
  return m;
}

function cacheSet(key: string, mat: THREE.MeshStandardMaterial): void {
  if (matCache.size >= _config.maxCacheSize) {
    const oldest = matCacheOrder.shift();
    if (oldest) {
      const oldMat = matCache.get(oldest);
      oldMat?.map?.dispose();
      oldMat?.dispose();
      matCache.delete(oldest);
    }
  }
  matCache.set(key, mat);
  matCacheOrder.push(key);
}

/** 🆕 v2 — Cleanup complet (à appeler au dispose global) */
export function disposeRoadMaterials(): void {
  for (const mat of matCache.values()) {
    mat.map?.dispose();
    mat.dispose();
  }
  matCache.clear();
  matCacheOrder.length = 0;
}

// ═══════════════════════════════════════════════════════════
// TEXTURE GENERATORS (v1 compat + seed)
// ═══════════════════════════════════════════════════════════

export function getAsphaltMaterial(wet = false): THREE.MeshStandardMaterial {
  const key = `asphalt_${wet ? 'wet' : 'dry'}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const rng = mulberry32(_config.seed + (wet ? 1 : 0));
  const tex = makeProceduralTexture('asphalt_road_v2', _config.resolution, (ctx, s) => {
    ctx.fillStyle = wet ? '#1e2028' : '#2a2c34';
    ctx.fillRect(0, 0, s, s);
    const grainCount = wet ? 10000 : 14000;
    for (let i = 0; i < grainCount; i++) {
      const x = rng() * s;
      const y = rng() * s;
      const r = rng() * 2 + 0.5;
      const v = rng() * 38 - 19;
      const base = wet ? 32 : 42;
      ctx.fillStyle = `rgb(${base + v},${base + 2 + v},${base + 10 + v})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crack lines (moins en wet)
    const crackCount = wet ? 30 : 60;
    for (let i = 0; i < crackCount; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${rng() * 0.04})`;
      ctx.lineWidth = rng() * 1.5;
      ctx.beginPath();
      ctx.moveTo(rng() * s, rng() * s);
      ctx.lineTo(rng() * s, rng() * s);
      ctx.stroke();
    }
  }, { repeat: _config.defaultRepeat });

  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = _config.anisotropy;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    color: wet ? '#2e3840' : '#3a3a44',
    roughness: wet ? 0.18 : 0.88,
    metalness: wet ? 0.28 : 0.0,
  });

  cacheSet(key, mat);
  return mat;
}

export function getHighwayMaterial(wet = false): THREE.MeshStandardMaterial {
  const key = `hwy_${wet ? 'wet' : 'dry'}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const rng = mulberry32(_config.seed + 100 + (wet ? 1 : 0));
  const tex = makeProceduralTexture('hwy_asphalt_v2', _config.resolution, (ctx, s) => {
    ctx.fillStyle = wet ? '#1a1c24' : '#252830';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 16000; i++) {
      const x = rng() * s;
      const y = rng() * s;
      const r = rng() * 2.2 + 0.3;
      const v = rng() * 30 - 15;
      const base = wet ? 28 : 37;
      ctx.fillStyle = `rgb(${base + v},${base + 3 + v},${base + 11 + v})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [6, 60] });

  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = _config.anisotropy;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    color: wet ? '#1e2830' : '#28282e',
    roughness: wet ? 0.14 : 0.82,
    metalness: wet ? 0.35 : 0.0,
  });

  cacheSet(key, mat);
  return mat;
}

export function getGrassMaterial(): THREE.MeshStandardMaterial {
  const key = 'grass_mat';
  const hit = cacheGet(key);
  if (hit) return hit;

  const rng = mulberry32(_config.seed + 200);
  const tex = makeProceduralTexture('grass_shoulder_v2', 512, (ctx, s) => {
    const base = ctx.createLinearGradient(0, 0, s, s);
    base.addColorStop(0, '#496d2b');
    base.addColorStop(0.5, '#355923');
    base.addColorStop(1, '#587b32');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);

    for (let i = 0; i < 2400; i++) {
      const x = rng() * s;
      const y = rng() * s;
      const radius = rng() * 24 + 4;
      const colors = ['rgba(20,42,14,0.18)', 'rgba(170,150,75,0.12)', 'rgba(93,118,45,0.2)'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * (0.35 + rng() * 0.5), rng(), 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 18000; i++) {
      const x = rng() * s;
      const y = rng() * s;
      const height = rng() * 7 + 2;
      const green = Math.floor(72 + rng() * 54);
      ctx.strokeStyle = `rgba(${30 + Math.floor(rng() * 35)},${green},${22 + Math.floor(rng() * 24)},${0.28 + rng() * 0.48})`;
      ctx.lineWidth = rng() * 1.15 + 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 2.5, y - height);
      ctx.stroke();
    }

    for (let i = 0; i < 340; i++) {
      const x = rng() * s;
      const y = rng() * s;
      ctx.fillStyle = i % 3 === 0 ? '#6f7134' : '#4b6427';
      ctx.beginPath();
      ctx.arc(x, y, rng() * 1.7 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [16, 16] });

  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, _config.anisotropy);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    color: '#a4ad6b',
    roughness: 1.0,
    metalness: 0,
  });

  cacheSet(key, mat);
  return mat;
}

export function getDitchMaterial(): THREE.MeshStandardMaterial {
  const key = 'ditch_mat';
  const hit = cacheGet(key);
  if (hit) return hit;

  const rng = mulberry32(_config.seed + 300);
  const tex = makeProceduralTexture('ditch_ground_v2', 256, (ctx, s) => {
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 3000; i++) {
      const x = rng() * s;
      const y = rng() * s;
      const v = rng() * 30 - 15;
      ctx.fillStyle = `rgb(${60 + v},${48 + v},${32 + v})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }, { repeat: [4, 20] });

  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 1.0,
    metalness: 0,
  });

  cacheSet(key, mat);
  return mat;
}

/** 🆕 v2 — Matériau prairie (distant, différent de grass) */
export function getPrairieMaterial(): THREE.MeshStandardMaterial {
  const key = 'prairie_mat';
  const hit = cacheGet(key);
  if (hit) return hit;

  const rng = mulberry32(_config.seed + 400);
  const tex = makeProceduralTexture('prairie_v2', 256, (ctx, s) => {
    ctx.fillStyle = '#6a7a3a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1500; i++) {
      const x = rng() * s;
      const y = rng() * s;
      const v = rng() * 40 - 20;
      ctx.fillStyle = `rgb(${106 + v},${122 + v},${58 + v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }, { repeat: [8, 8] });

  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 1.0,
    metalness: 0,
  });

  cacheSet(key, mat);
  return mat;
}

/** 🆕 v2 — Stats */
export function getRoadTexturesStats() {
  return {
    materialsCached: matCache.size,
    maxCacheSize: _config.maxCacheSize,
    seed: _config.seed,
    resolution: _config.resolution,
  };
}