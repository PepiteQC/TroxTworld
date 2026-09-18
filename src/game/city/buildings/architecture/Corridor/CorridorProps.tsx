// ============================================
// ETHERWORLD - Corridor Decorative Props
// ============================================

import { memo, useMemo } from 'react';
import * as THREE from 'three';
import type { CorridorSegment } from '../../lib/etherworld/types';

interface Props {
  segment: CorridorSegment;
}

// ─────────────────────────────────────────
// Plant
// ─────────────────────────────────────────

const Plant = memo(({ position }: { position: [number, number, number] }) => {
  const potMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#5c3d2e', roughness: 0.9, metalness: 0,
  }), []);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a4a1a', roughness: 0.8, metalness: 0,
  }), []);

  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, 0.2, 0]} material={potMat} castShadow>
        <cylinderGeometry args={[0.12, 0.09, 0.25, 8]} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, 8]} />
        <meshStandardMaterial color="#3d2b1f" roughness={1} />
      </mesh>
      {/* Main stem/leaves */}
      <mesh position={[0, 0.65, 0]} material={leafMat} castShadow>
        <sphereGeometry args={[0.22, 8, 6]} />
      </mesh>
      {/* Extra leaves */}
      <mesh position={[0.15, 0.5, 0]} material={leafMat} castShadow>
        <sphereGeometry args={[0.12, 6, 5]} />
      </mesh>
      <mesh position={[-0.12, 0.55, 0.1]} material={leafMat} castShadow>
        <sphereGeometry args={[0.1, 6, 5]} />
      </mesh>
    </group>
  );
});

Plant.displayName = 'Plant';

// ─────────────────────────────────────────
// Bench
// ─────────────────────────────────────────

const Bench = memo(({ position }: { position: [number, number, number] }) => {
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4a3728', roughness: 0.85, metalness: 0.05,
  }), []);
  const legMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a2a3a', roughness: 0.3, metalness: 0.9,
  }), []);

  return (
    <group position={position}>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.06, 0.35]} />
      </mesh>
      {/* Back rest */}
      <mesh position={[0, 0.72, -0.145]} material={woodMat} castShadow>
        <boxGeometry args={[0.9, 0.45, 0.04]} />
      </mesh>
      {/* Legs */}
      {([-0.38, 0.38] as number[]).map((x) => (
        <mesh
          key={x}
          position={[x, 0.22, 0]}
          material={legMat}
          castShadow
        >
          <boxGeometry args={[0.04, 0.44, 0.3]} />
        </mesh>
      ))}
    </group>
  );
});

Bench.displayName = 'Bench';

// ─────────────────────────────────────────
// Wall Panel Decoration
// ─────────────────────────────────────────

const WallPanel = memo(({ 
  position, 
  side,
}: { 
  position: [number, number, number];
  side: 'left' | 'right';
}) => {
  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a2a',
    roughness: 0.4,
    metalness: 0.6,
    emissive: new THREE.Color('#0a0a2a'),
    emissiveIntensity: 0.1,
  }), []);

  const xSign = side === 'left' ? -1 : 1;

  return (
    <mesh
      position={position}
      rotation={[0, xSign * Math.PI / 2, 0]}
      material={panelMat}
      receiveShadow
    >
      <boxGeometry args={[0.8, 1.2, 0.02]} />
    </mesh>
  );
});

WallPanel.displayName = 'WallPanel';

// ─────────────────────────────────────────
// Main Props Component
// ─────────────────────────────────────────

export const CorridorProps = memo(({ segment }: Props) => {
  const [, , z] = segment.position;
  const W = 3; // Half corridor width

  return (
    <group>
      {segment.hasPlant && (
        <>
          <Plant position={[-(W - 0.3), 0, z - 0.5]} />
          <Plant position={[ (W - 0.3), 0, z - 0.5]} />
        </>
      )}

      {segment.hasBench && (
        <Bench position={[0, 0, z - 1]} />
      )}

      {/* Decorative wall panels between doors */}
      {!segment.hasLeftDoor && (
        <WallPanel
          position={[-(W - 0.01), 1.5, z - 2]}
          side="left"
        />
      )}
      {!segment.hasRightDoor && (
        <WallPanel
          position={[(W - 0.01), 1.5, z - 2]}
          side="right"
        />
      )}
    </group>
  );
});

CorridorProps.displayName = 'CorridorProps';