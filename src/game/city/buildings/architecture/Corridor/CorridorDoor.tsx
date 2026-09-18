// ============================================
// ETHERWORLD - Interactive Corridor Door
// ============================================

import { memo, useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useEtherWorld } from '../../lib/etherworld/store';
import type { DoorConfig } from '../../lib/etherworld/types';

interface Props {
  door: DoorConfig;
  side: 'left' | 'right';
}

// ─────────────────────────────────────────
// LED Indicator
// ─────────────────────────────────────────

const DoorLED = memo(({ isLocked }: { isLocked: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      // Pulse effect
      const pulse = Math.sin(elapsed.current * 3) * 0.3 + 0.7;
      mat.emissiveIntensity = isLocked ? pulse * 0.8 : pulse * 0.4;
    }
  });

  return (
    <mesh ref={meshRef} position={[0.35, 0.1, 0.05]}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshStandardMaterial
        color={isLocked ? '#ff2222' : '#22ff44'}
        emissive={isLocked ? '#ff0000' : '#00ff22'}
        emissiveIntensity={0.8}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
});

DoorLED.displayName = 'DoorLED';

// ─────────────────────────────────────────
// Main Door Component
// ─────────────────────────────────────────

export const CorridorDoor = memo(({ door, side }: Props) => {
  const { toggleDoor, enterRoom, selectDoor, player } = useEtherWorld(
    (s) => ({
      toggleDoor: s.toggleDoor,
      enterRoom:  s.enterRoom,
      selectDoor: s.selectDoor,
      player:     s.player,
    })
  );

  const doorRef   = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // ── Animation target ───────────────────
  const targetAngle = useRef(0);
  const currentAngle = useRef(0);

  // Update target based on state
  const getTargetAngle = useCallback(() => {
    switch (door.state) {
      case 'open':   return side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      case 'ajar':   return side === 'left' ? -Math.PI / 4 : Math.PI / 4;
      default:       return 0;
    }
  }, [door.state, side]);

  // ── Animate door swing ─────────────────
  useFrame((_, delta) => {
    targetAngle.current = getTargetAngle();
    currentAngle.current = THREE.MathUtils.lerp(
      currentAngle.current,
      targetAngle.current,
      delta * 4 // Speed multiplier
    );

    if (doorRef.current) {
      doorRef.current.rotation.y = currentAngle.current;
    }
  });

  // ── Interaction ────────────────────────
  const handleClick = useCallback(() => {
    if (door.state === 'locked') {
      // Try to unlock with player's card
      const success = useEtherWorld.getState()
        .unlockDoor(door.id, player.accessCard);
      if (!success) return;
    }

    if (door.state === 'unlocked' || door.state === 'open') {
      // Find room for this door
      const rooms = useEtherWorld.getState().rooms;
      const room = Object.values(rooms).find(r => r.door.id === door.id);
      if (room) {
        toggleDoor(door.id);
        if (door.state === 'unlocked') {
          enterRoom(room.id);
        }
      }
    }

    selectDoor(door.id);
  }, [door, player.accessCard, toggleDoor, enterRoom, selectDoor]);

  const isLocked = door.state === 'locked';

  // ── Frame/Jamb Position ────────────────
  const [px, py, pz] = door.position;

  return (
    <group position={[px, py, pz]}>
      {/* Door Frame */}
      <mesh
        position={[0, 1.1, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.0, 2.2, 0.12]} />
        <meshStandardMaterial
          color="#2d2d3d"
          roughness={0.6}
          metalness={0.4}
        />
      </mesh>

      {/* Door Panel (animated) */}
      {/* Pivot point at hinge side */}
      <group
        position={[side === 'left' ? -0.4 : 0.4, 0, 0]}
      >
        <group ref={doorRef}>
          <mesh
            position={[side === 'left' ? 0.4 : -0.4, 1.0, 0]}
            castShadow
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onClick={handleClick}
          >
            <boxGeometry args={[0.85, 2.0, 0.06]} />
            <meshStandardMaterial
              color={hovered ? '#3d3d55' : '#252535'}
              roughness={0.5}
              metalness={0.6}
              emissive={hovered ? '#111133' : '#000000'}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>

          {/* Door Handle */}
          <mesh
            position={[
              side === 'left' ? 0.72 : -0.72,
              1.0,
              0.07
            ]}
          >
            <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
            <meshStandardMaterial
              color="#aaaacc"
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>

          {/* LED Status Light */}
          <group position={[
            side === 'left' ? -0.32 : 0.32,
            0, 0
          ]}>
            <DoorLED isLocked={isLocked} />
          </group>
        </group>
      </group>

      {/* Room Number */}
      <Text
        position={[0, 2.4, 0.1]}
        fontSize={0.12}
        color="#8888aa"
        anchorX="center"
        anchorY="middle"
      >
        {door.roomNumber}
      </Text>

      {/* Access Level Badge */}
      {door.accessLevel !== 'resident' && (
        <Text
          position={[0, 2.2, 0.1]}
          fontSize={0.07}
          color={door.accessLevel === 'admin' ? '#ff4444' : '#ffaa00'}
          anchorX="center"
          anchorY="middle"
        >
          {door.accessLevel.toUpperCase()}
        </Text>
      )}
    </group>
  );
});

CorridorDoor.displayName = 'CorridorDoor';