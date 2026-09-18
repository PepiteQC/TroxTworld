/**
 * 🌍 GROUND v2.0 — Terrain de base + biome patches + horizon
 * ───────────────────────────────────────────────────────────────────────────
 *  • Seed déterministe (pas de flicker au re-render)
 *  • Biome patches procéduraux avec variation couleur
 *  • Horizon hills avec blending fog automatique
 *  • Intégration saison (WorldSystem) — optionnel
 *  • Compat 100% v1
 */
import { useMemo } from 'react';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════
//  SEEDED RNG (pas de flicker)
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

export interface GroundProps {
  isDay?: boolean;
  /** Seed pour reproductibilité */
  seed?: number;
  /** Saison (optionnel) : 'spring' | 'summer' | 'fall' | 'winter' */
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  /** Taille du terrain */
  size?: [number, number];
  /** Nombre de patches de biome */
  patchCount?: number;
  /** Nombre de collines d'horizon */
  hillCount?: number;
  /** Rayon de l'horizon */
  horizonRadius?: number;
}

interface GrassPatch {
  x: number;
  z: number;
  size: number;
  rotation: number;
  color: THREE.Color;
}

interface HorizonHill {
  x: number;
  z: number;
  radius: number;
  height: number;
  color: THREE.Color;
}

// ═══════════════════════════════════════════════════════════════════════════
//  PALETTE SAISONNIÈRE
// ═══════════════════════════════════════════════════════════════════════════

interface SeasonPalette {
  groundDay: number;
  groundNight: number;
  patchBase: number;
  patchVariants: number[];
  hillDay: number;
  hillNight: number;
}

const SEASON_PALETTES: Record<'spring' | 'summer' | 'fall' | 'winter', SeasonPalette> = {
  spring: {
    groundDay: 0x4a6a3a,
    groundNight: 0x1a2a1a,
    patchBase: 0x5a7a4a,
    patchVariants: [0x6a8a5a, 0x4a6a3a, 0x5a7a4a, 0x7a9a6a],
    hillDay: 0x3a5a3a,
    hillNight: 0x0a1a0a,
  },
  summer: {
    groundDay: 0x3a5a2a,
    groundNight: 0x1a2a1a,
    patchBase: 0x4a6a3a,
    patchVariants: [0x4a6a3a, 0x3a5a2a, 0x5a7a3a, 0x6a8a4a],
    hillDay: 0x2a4a2a,
    hillNight: 0x0a1a0a,
  },
  fall: {
    groundDay: 0x6a5a2a,
    groundNight: 0x2a201a,
    patchBase: 0x7a5a2a,
    patchVariants: [0x8a6a3a, 0x6a4a1a, 0x9a7a4a, 0x5a4a2a],
    hillDay: 0x5a4a2a,
    hillNight: 0x1a120a,
  },
  winter: {
    groundDay: 0xdde5ee,
    groundNight: 0x2a3040,
    patchBase: 0xe8eef5,
    patchVariants: [0xf0f5fa, 0xdde5ee, 0xe8eef5, 0xc8d4e0],
    hillDay: 0xb8c5d0,
    hillNight: 0x1a2030,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  GROUND COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Ground({
  isDay = false,
  seed = 42,
  season,
  size = [500, 1000],
  patchCount = 20,
  hillCount = 8,
  horizonRadius = 200,
}: GroundProps) {
  const effectiveSeason = season ?? (isDay ? 'summer' : 'summer');
  const palette = SEASON_PALETTES[effectiveSeason];

  // ─── Patches stables (seed déterministe) ───
  const patches = useMemo<GrassPatch[]>(() => {
    const rng = mulberry32(seed);
    const [W, D] = size;
    const out: GrassPatch[] = [];
    for (let i = 0; i < patchCount; i++) {
      const variant = palette.patchVariants[i % palette.patchVariants.length];
      out.push({
        x: (rng() - 0.5) * W * 0.8,
        z: (rng() - 0.5) * D * 0.8,
        size: 10 + rng() * 30,
        rotation: rng() * Math.PI * 2,
        color: new THREE.Color(variant),
      });
    }
    return out;
  }, [seed, size, patchCount, palette]);

  // ─── Horizon hills stables ───
  const hills = useMemo<HorizonHill[]>(() => {
    const rng = mulberry32(seed + 1000);
    const out: HorizonHill[] = [];
    for (let i = 0; i < hillCount; i++) {
      const angle = (i / hillCount) * Math.PI * 2 + rng() * 0.3;
      out.push({
        x: Math.cos(angle) * horizonRadius,
        z: Math.sin(angle) * horizonRadius,
        radius: 60,
        height: 15 + rng() * 25,
        color: new THREE.Color(isDay ? palette.hillDay : palette.hillNight),
      });
    }
    return out;
  }, [seed, hillCount, horizonRadius, isDay, palette]);

  // ─── Couleur ground principale ───
  const groundColor = useMemo(
    () => new THREE.Color(isDay ? palette.groundDay : palette.groundNight),
    [isDay, palette],
  );

  return (
    <group name="ground-system">
      {/* ─── Terrain principal ─── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={size} />
        <meshStandardMaterial
          color={groundColor}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* ─── Patches de biome (circles) ─── */}
      {patches.map((p, i) => (
        <mesh
          key={`patch-${i}`}
          rotation={[-Math.PI / 2, 0, p.rotation]}
          position={[p.x, -0.08, p.z]}
          receiveShadow
        >
          <circleGeometry args={[p.size, 6]} />
          <meshStandardMaterial
            color={p.color}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}

      {/* ─── Horizon hills ─── */}
      {hills.map((h, i) => (
        <mesh
          key={`hill-${i}`}
          position={[h.x, h.height / 2 - 5, h.z]}
          castShadow={false}
        >
          <coneGeometry args={[h.radius, h.height, 6]} />
          <meshStandardMaterial
            color={h.color}
            roughness={1}
            flatShading
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

export default Ground;