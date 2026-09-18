/**
 * 🏔️ TERRAIN v2.0 — Terrain procédural Québec
 * ───────────────────────────────────────────────────────────────────────────
 *  BUG FIX : Math.random() dans colorArray → flicker
 *  → Utilise maintenant un RNG seedé pour couleurs stables
 *
 *  • Seed déterministe (plus de flicker)
 *  • Biomes réalistes (route, plaine, forêt, Laurentides)
 *  • Intégration saison via prop
 *  • Compat 100% v1
 */
import { useMemo } from 'react';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════
//  SEEDED RNG
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TerrainProps {
  width?: number;
  depth?: number;
  widthSegments?: number;
  depthSegments?: number;
  /** 🆕 Seed pour couleurs stables */
  seed?: number;
  /** 🆕 Saison pour palette de couleurs */
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  /** 🆕 Largeur de la route centrale (corridor plat) */
  roadWidth?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//  PALETTES SAISONNIÈRES
// ═══════════════════════════════════════════════════════════════════════════

interface BiomeColors {
  grass: [number, number, number];
  mixed: [number, number, number];
  forest: [number, number, number];
  rock: [number, number, number];
}

const SEASON_COLORS: Record<'spring' | 'summer' | 'fall' | 'winter', BiomeColors> = {
  spring: {
    grass: [0.32, 0.55, 0.22],
    mixed: [0.28, 0.48, 0.20],
    forest: [0.20, 0.35, 0.15],
    rock: [0.55, 0.55, 0.52],
  },
  summer: {
    grass: [0.25, 0.42, 0.18],
    mixed: [0.22, 0.36, 0.15],
    forest: [0.18, 0.28, 0.12],
    rock: [0.50, 0.48, 0.45],
  },
  fall: {
    grass: [0.42, 0.38, 0.20],
    mixed: [0.48, 0.36, 0.18],
    forest: [0.35, 0.28, 0.15],
    rock: [0.55, 0.50, 0.42],
  },
  winter: {
    grass: [0.85, 0.88, 0.92],
    mixed: [0.78, 0.82, 0.88],
    forest: [0.55, 0.62, 0.68],
    rock: [0.70, 0.72, 0.75],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  TERRAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Terrain({
  width = 400,
  depth = 2000,
  widthSegments = 40,
  depthSegments = 200,
  seed = 42,
  season = 'summer',
  roadWidth = 22,
}: TerrainProps) {
  // ─── Géométrie (v1 compat) ───
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, depth, widthSegments, depthSegments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const absX = Math.abs(x);

      // Corridor plat (route)
      if (absX < roadWidth) {
        positions.setY(i, 0);
        continue;
      }

      // Terrain qui monte en s'éloignant de la route
      const distFromRoad = absX - roadWidth;
      const baseHeight =
        Math.sin(x * 0.04) * 4 +
        Math.cos(z * 0.008 + x * 0.02) * 6 +
        Math.sin(z * 0.015) * 3 +
        distFromRoad * 0.04;

      // Laurentides côté nord
      const laurentianHeight =
        x > 0
          ? Math.max(0, Math.sin(z * 0.005 + 1.2) * 20 + Math.cos(x * 0.01) * 15)
          : 0;

      positions.setY(i, baseHeight + laurentianHeight * (Math.max(0, x - 50) / 150));
    }

    positions.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [width, depth, widthSegments, depthSegments, roadWidth]);

  // ─── Couleurs (BUG FIX : seed déterministe) ───
  const colorArray = useMemo(() => {
    const rng = mulberry32(seed);
    const positions = geometry.attributes.position;
    const count = positions.count;
    const colors = new Float32Array(count * 3);

    const palette = SEASON_COLORS[season];

    for (let i = 0; i < count; i++) {
      const y = positions.getY(i);

      let base: [number, number, number];
      let variance = 0.05;

      if (y < 0.5) base = palette.grass;
      else if (y < 8) base = palette.mixed;
      else if (y < 18) base = palette.forest;
      else {
        base = palette.rock;
        variance = 0.08;
      }

      // RNG seedé — PAS Math.random() direct
      colors[i * 3] = Math.max(0, Math.min(1, base[0] + (rng() - 0.5) * variance));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, base[1] + (rng() - 0.5) * variance));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, base[2] + (rng() - 0.5) * variance));
    }

    return colors;
  }, [geometry, seed, season]);

  // Applique les couleurs
  useMemo(() => {
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
  }, [geometry, colorArray]);

  return (
    <mesh geometry={geometry} receiveShadow name="terrain">
      <meshLambertMaterial
        vertexColors
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}