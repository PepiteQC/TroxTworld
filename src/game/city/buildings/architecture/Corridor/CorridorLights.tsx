// ============================================
// ETHERWORLD - Corridor Lighting System
// ============================================

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CorridorSegment } from '../../lib/etherworld/types';

interface Props {
  segments: CorridorSegment[];
}

// ─────────────────────────────────────────
// Single Ceiling Light Fixture
// ─────────────────────────────────────────

const CeilingLight = memo(({ 
  position, 
  intensity,
  index,
}: { 
  position: [number, number, number];
  intensity: number;
  index: number;
}) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const elapsed  = useRef(Math.random() * Math.PI * 2); // Random phase

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (lightRef.current) {
      // Subtle flicker
      const flicker = 1 + Math.sin(elapsed.current * 8 + index) * 0.02;
      lightRef.current.intensity = intensity * flicker;
    }
  });

  return (
    <group position={position}>
      {/* Light fixture housing */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.06, 0.4]} />
        <meshStandardMaterial
          color="#333344"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Emissive panel */}
      <mesh position={[0, -0.031, 0]}>
        <boxGeometry args={[0.35, 0.01, 0.35]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#e8e8ff"
          emissiveIntensity={intensity}
          roughness={0.1}
        />
      </mesh>

      {/* Actual light */}
      <pointLight
        ref={lightRef}
        color="#e8e8ff"
        intensity={intensity * 3}
        distance={6}
        decay={2}
        castShadow
        shadow-mapSize={[256, 256]}
        shadow-camera-near={0.1}
        shadow-camera-far={8}
      />
    </group>
  );
});

CeilingLight.displayName = 'CeilingLight';

// ─────────────────────────────────────────
// Main Lights Component
// ─────────────────────────────────────────

export const CorridorLights = memo(({ segments }: Props) => {
  return (
    <>
      {/* Ambient base light */}
      <ambientLight color="#0a0a1a" intensity={0.4} />

      {/* Directional for shadows */}
      <directionalLight
        position={[0, 5, 0]}
        intensity={0.1}
        color="#4444aa"
      />

      {/* Ceiling lights per segment */}
      {segments.map((seg, i) => (
        <CeilingLight
          key={seg.id}
          position={[0, 3.1, seg.position[2]]}
          intensity={seg.lightIntensity}
          index={i}
        />
      ))}
    </>
  );
});

CorridorLights.displayName = 'CorridorLights';