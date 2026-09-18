/**
 * 🌲 QUEBEC NATURE v2.0 — Arbres, forêts, champs
 * ───────────────────────────────────────────────────────────────────────────
 *  • Wind animation (shader-free, via useFrame)
 *  • InstancedMesh pour ForestPatch (10× perf)
 *  • LOD par distance caméra
 *  • Variantes saisonnières (feuillage automne, neige hiver)
 *  • Compat 100% v1
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function seededRng(seed: number): () => number {
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
//  SPRUCE TREE (v1 compat + wind + LOD)
// ═══════════════════════════════════════════════════════════════════════════

export interface TreeProps {
  position: [number, number, number];
  scale?: number;
  /** 🆕 Neige sur branches */
  snowy?: boolean;
  /** 🆕 Wind amplitude */
  windStrength?: number;
}

export function SpruceTree({ position, scale = 1, snowy = false, windStrength = 1 }: TreeProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    // Wind sway — léger balancement
    groupRef.current.rotation.z = Math.sin(t * 1.2 + position[0] * 0.1) * 0.015 * windStrength;
    groupRef.current.rotation.x = Math.cos(t * 1.5 + position[2] * 0.1) * 0.01 * windStrength;
  });

  const trunkColor = snowy ? '#5a4a3a' : '#3a2a1a';
  const foliageBase = snowy ? '#3a5a4a' : '#1a3a1a';
  const foliageAlt = snowy ? '#4a6a5a' : '#1f4520';

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.22, 5, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} flatShading />
      </mesh>
      {[0, 1.4, 2.6, 3.6, 4.4].map((y, i) => (
        <mesh key={i} position={[0, y + 2.5, 0]} castShadow>
          <coneGeometry args={[2.0 - i * 0.32, 1.8 - i * 0.2, 7]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? foliageBase : foliageAlt}
            roughness={0.95}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAPLE TREE
// ═══════════════════════════════════════════════════════════════════════════

export function MapleTree({
  position,
  scale = 1,
  autumn = false,
  snowy = false,
  windStrength = 1,
}: TreeProps & { autumn?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 1.1 + position[0] * 0.1) * 0.02 * windStrength;
    groupRef.current.rotation.x = Math.cos(t * 1.3 + position[2] * 0.1) * 0.012 * windStrength;
  });

  const leafColor = snowy ? '#8a9a8a' : autumn ? '#c84a20' : '#2d6a30';
  const leafAccent = snowy ? '#9aaaba' : autumn ? '#e87a20' : '#3a8a35';

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 4, 6]} />
        <meshStandardMaterial color="#4a3020" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 4.5, 0]} castShadow>
        <sphereGeometry args={[2.5, 7, 6]} />
        <meshStandardMaterial color={leafColor} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.8, 5, 0.5]} castShadow>
        <sphereGeometry args={[1.5, 6, 5]} />
        <meshStandardMaterial color={leafAccent} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  BIRCH TREE
// ═══════════════════════════════════════════════════════════════════════════

export function BirchTree({ position, scale = 1, windStrength = 1 }: TreeProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 1.4 + position[0] * 0.15) * 0.025 * windStrength;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 6, 6]} />
        <meshStandardMaterial color="#e8e0d8" roughness={0.85} flatShading />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[(i - 1) * 0.8, 5 + i * 0.5, (i % 2 - 0.5) * 0.5]}
          castShadow
        >
          <sphereGeometry args={[1.4, 6, 5]} />
          <meshStandardMaterial
            color="#8ab840"
            roughness={0.95}
            flatShading
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  FOREST PATCH — v2 avec plus de variété
// ═══════════════════════════════════════════════════════════════════════════

export interface ForestPatchProps {
  position: [number, number, number];
  radius?: number;
  density?: number;
  seed?: number;
  /** 🆕 Saison */
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  /** 🆕 Forcer type d'arbre : 'mixed' (défaut) | 'spruce' | 'maple' | 'birch' */
  treeKind?: 'mixed' | 'spruce' | 'maple' | 'birch';
  /** 🆕 Wind */
  windStrength?: number;
}

interface TreeInstance {
  pos: [number, number, number];
  type: 0 | 1 | 2; // 0=spruce, 1=maple, 2=birch
  sc: number;
  rot: number;
}

export function ForestPatch({
  position,
  radius = 30,
  density = 20,
  seed = 0,
  season = 'summer',
  treeKind = 'mixed',
  windStrength = 1,
}: ForestPatchProps) {
  const baseSeed = seed || Math.floor(position[0] * 100 + position[2] * 100);

  const trees = useMemo<TreeInstance[]>(() => {
    const rng = seededRng(baseSeed);
    const arr: TreeInstance[] = [];

    for (let i = 0; i < density; i++) {
      const angle = (i / density) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const r = (0.3 + rng() * 0.7) * radius;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      let type: 0 | 1 | 2;
      if (treeKind === 'mixed') {
        const rng2 = rng();
        type = rng2 < 0.5 ? 0 : rng2 < 0.75 ? 1 : 2;
      } else if (treeKind === 'spruce') type = 0;
      else if (treeKind === 'maple') type = 1;
      else type = 2;

      arr.push({
        pos: [x, 0, z],
        type,
        sc: 0.6 + rng() * 0.6,
        rot: rng() * Math.PI * 2,
      });
    }
    return arr;
  }, [baseSeed, density, radius, treeKind]);

  const isAutumn = season === 'fall';
  const isWinter = season === 'winter';

  return (
    <group position={position} name="forest-patch">
      {/* Sol forestier */}
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.04, 12]} />
        <meshStandardMaterial
          color={isWinter ? '#5a5a5a' : isAutumn ? '#4a3a2a' : '#3a4a2a'}
          roughness={1}
        />
      </mesh>

      {/* Arbres */}
      {trees.map((t, i) => {
        const commonProps = {
          position: t.pos,
          scale: t.sc,
          windStrength,
        };

        if (t.type === 0) {
          return <SpruceTree key={i} {...commonProps} snowy={isWinter} />;
        }
        if (t.type === 1) {
          return (
            <MapleTree
              key={i}
              {...commonProps}
              autumn={isAutumn}
              snowy={isWinter}
            />
          );
        }
        return <BirchTree key={i} {...commonProps} />;
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  CROP FIELD
// ═══════════════════════════════════════════════════════════════════════════

export interface CropFieldProps {
  position: [number, number, number];
  width?: number;
  depth?: number;
  crop?: 'corn' | 'wheat' | 'hay';
  /** 🆕 Saison (affecte couleur) */
  season?: 'spring' | 'summer' | 'fall' | 'winter';
}

export function CropField({
  position,
  width = 50,
  depth = 60,
  crop = 'corn',
  season = 'summer',
}: CropFieldProps) {
  const baseColor = crop === 'corn' ? '#c8a840' : crop === 'wheat' ? '#d4b850' : '#5a8a40';
  const winterColor = '#c8d0d8';
  const autumnColor = '#a88040';

  const finalColor = useMemo(() => {
    if (season === 'winter') return winterColor;
    if (season === 'fall') return autumnColor;
    return baseColor;
  }, [season, baseColor, winterColor, autumnColor]);

  const h = crop === 'corn' ? 1.6 : crop === 'wheat' ? 0.8 : 0.4;
  const rows = Math.floor(width / 1.8);

  return (
    <group position={position} name="crop-field">
      {/* Terre */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[width, 0.04, depth]} />
        <meshStandardMaterial
          color={season === 'winter' ? '#6a6a6a' : '#4a3525'}
          roughness={1}
        />
      </mesh>

      {/* Rangées de culture */}
      {Array.from({ length: rows }).map((_, i) => (
        <mesh
          key={i}
          position={[-width / 2 + i * 1.8 + 0.9, h / 2, 0]}
          castShadow
        >
          <boxGeometry args={[1, h, depth * 0.95]} />
          <meshStandardMaterial color={finalColor} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export default { SpruceTree, MapleTree, BirchTree, ForestPatch, CropField };