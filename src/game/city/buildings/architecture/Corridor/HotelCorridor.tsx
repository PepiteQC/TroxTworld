// ============================================
// ETHERWORLD - Hotel Corridor (Main 3D Scene)
// ============================================

import { memo, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  PerspectiveCamera, 
  Environment,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
} from '@react-three/drei';
import { useEtherWorld, selectCorridor } from '../../lib/etherworld/store';
import { CorridorGeometry } from './CorridorGeometry';
import { CorridorLights } from './CorridorLights';
import { CorridorDoor } from './CorridorDoor';
import { CorridorProps } from './CorridorProps';

// ─────────────────────────────────────────
// Scene Inner (inside Canvas)
// ─────────────────────────────────────────

const CorridorScene = memo(() => {
  const corridor = useEtherWorld(selectCorridor);

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[0, 1.7, 2]}
        fov={75}
        near={0.1}
        far={100}
      />

      {/* Lighting */}
      <CorridorLights segments={corridor.segments} />

      {/* Geometry: Walls, Floor, Ceiling */}
      <CorridorGeometry corridor={corridor} />

      {/* Doors */}
      {corridor.segments.map((seg) => (
        <group key={seg.id}>
          {seg.hasLeftDoor && seg.leftRoom && (
            <CorridorDoor
              door={seg.leftRoom.door}
              side="left"
            />
          )}
          {seg.hasRightDoor && seg.rightRoom && (
            <CorridorDoor
              door={seg.rightRoom.door}
              side="right"
            />
          )}
        </group>
      ))}

      {/* Props: Plants, Benches */}
      {corridor.segments.map((seg) => (
        <CorridorProps key={`props-${seg.id}`} segment={seg} />
      ))}

      {/* Environment */}
      <Environment preset="city" />
      <fog attach="fog" args={['#1a1a2e', 15, 50]} />
    </>
  );
});

CorridorScene.displayName = 'CorridorScene';

// ─────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────

export const HotelCorridor = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="w-full h-full relative">
      <Canvas
        ref={canvasRef}
        shadows="soft"
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, 2]}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        <Suspense fallback={null}>
          <CorridorScene />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
});

HotelCorridor.displayName = 'HotelCorridor';