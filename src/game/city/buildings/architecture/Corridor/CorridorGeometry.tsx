// ============================================
// ETHERWORLD - Corridor Walls/Floor/Ceiling
// ============================================

import { memo, useMemo } from 'react';
import * as THREE from 'three';
import type { CorridorConfig } from '../../lib/etherworld/types';

interface Props {
  corridor: CorridorConfig;
}

export const CorridorGeometry = memo(({ corridor }: Props) => {
  const { totalLength, width, height } = corridor;

  // ── Materials (memoized) ──────────────────
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     '#2a2a35',
    roughness: 0.8,
    metalness: 0.1,
  }), []);

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     '#1e1e2e',
    roughness: 0.9,
    metalness: 0.0,
  }), []);

  const ceilingMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     '#161625',
    roughness: 1.0,
    metalness: 0.0,
  }), []);

  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     '#8844ff',
    roughness: 0.3,
    metalness: 0.8,
    emissive:  new THREE.Color('#4400aa'),
    emissiveIntensity: 0.3,
  }), []);

  const zCenter = -(totalLength / 2);

  return (
    <group>
      {/* ── Floor ── */}
      <mesh
        receiveShadow
        position={[0, 0, zCenter]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={floorMat}
      >
        <planeGeometry args={[width, totalLength]} />
      </mesh>

      {/* ── Ceiling ── */}
      <mesh
        position={[0, height, zCenter]}
        rotation={[Math.PI / 2, 0, 0]}
        material={ceilingMat}
      >
        <planeGeometry args={[width, totalLength]} />
      </mesh>

      {/* ── Left Wall ── */}
      <mesh
        receiveShadow
        position={[-(width / 2), height / 2, zCenter]}
        rotation={[0, Math.PI / 2, 0]}
        material={wallMat}
      >
        <planeGeometry args={[totalLength, height]} />
      </mesh>

      {/* ── Right Wall ── */}
      <mesh
        receiveShadow
        position={[width / 2, height / 2, zCenter]}
        rotation={[0, -Math.PI / 2, 0]}
        material={wallMat}
      >
        <planeGeometry args={[totalLength, height]} />
      </mesh>

      {/* ── End Wall ── */}
      <mesh
        position={[0, height / 2, -(totalLength)]}
        material={wallMat}
      >
        <planeGeometry args={[width, height]} />
      </mesh>

      {/* ── Neon Floor Trim (left) ── */}
      <mesh
        position={[-(width / 2) + 0.05, 0.05, zCenter]}
        material={trimMat}
      >
        <boxGeometry args={[0.04, 0.04, totalLength]} />
      </mesh>

      {/* ── Neon Floor Trim (right) ── */}
      <mesh
        position={[(width / 2) - 0.05, 0.05, zCenter]}
        material={trimMat}
      >
        <boxGeometry args={[0.04, 0.04, totalLength]} />
      </mesh>
    </group>
  );
});

CorridorGeometry.displayName = 'CorridorGeometry';