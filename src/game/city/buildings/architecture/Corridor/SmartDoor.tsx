import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSmartHouse } from '../systems/SmartHouseSystem';

export interface SmartDoorProps {
  doorId: string;
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  isOpen?: boolean;
}

export function SmartDoor({
  doorId,
  position,
  width = 1.1,
  height = 2.3,
  depth = 0.15,
  isOpen = false,
}: SmartDoorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const doorMeshRef = useRef<THREE.Group>(null);
  const lockIndicatorRef = useRef<THREE.Mesh>(null);
  const [currentIsOpen, setCurrentIsOpen] = useState(isOpen);

  const door = useSmartHouse((s) => s.doors[doorId]);
  const state = door?.state || 'locked';

  const materials = useMemo(
    () => ({
      frame: new THREE.MeshStandardMaterial({
        color: '#374151',
        metalness: 0.5,
        roughness: 0.5,
      }),
      door: new THREE.MeshStandardMaterial({
        color: '#111827',
        metalness: 0.4,
        roughness: 0.5,
      }),
      handle: new THREE.MeshStandardMaterial({
        color: '#9ca3af',
        metalness: 0.9,
        roughness: 0.1,
      }),
      // ✅ MeshStandardMaterial au lieu de MeshBasicMaterial pour emissive
      lockGreen: new THREE.MeshStandardMaterial({
        color: '#22c55e',
        emissive: new THREE.Color('#22c55e'),
        emissiveIntensity: 1,
        roughness: 0.3,
        metalness: 0.1,
      }),
      lockRed: new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: new THREE.Color('#ef4444'),
        emissiveIntensity: 1,
        roughness: 0.3,
        metalness: 0.1,
      }),
      lockYellow: new THREE.MeshStandardMaterial({
        color: '#eab308',
        emissive: new THREE.Color('#eab308'),
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.1,
      }),
    }),
    []
  );

  const getLockMaterial = (): THREE.MeshStandardMaterial => {
    if (state === 'alarm_triggered') return materials.lockRed;
    if (state === 'unlocked') return materials.lockGreen;
    if (state === 'blocked') return materials.lockYellow;
    return materials.lockRed;
  };

  useFrame(() => {
    if (!doorMeshRef.current) return;

    const shouldBeOpen = state === 'unlocked' || isOpen;

    if (shouldBeOpen !== currentIsOpen) {
      setCurrentIsOpen(shouldBeOpen);
    }

    // Animation fluide rotation porte
    const targetAngle = shouldBeOpen ? (Math.PI / 2) * 0.9 : 0;
    const currentAngle = doorMeshRef.current.rotation.y;
    doorMeshRef.current.rotation.y =
      currentAngle + (targetAngle - currentAngle) * 0.05;

    // Animation verrou
    if (lockIndicatorRef.current) {
      if (state === 'alarm_triggered') {
        // Pulse alarme
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
        lockIndicatorRef.current.scale.setScalar(pulse);
      } else {
        lockIndicatorRef.current.scale.setScalar(1);
      }

      // ✅ Mise à jour du matériau sans re-render React
      const newMat = getLockMaterial();
      if (lockIndicatorRef.current.material !== newMat) {
        lockIndicatorRef.current.material = newMat;
      }
    }
  });

  // ✅ Cleanup mémoire
  const disposeMaterials = () => {
    Object.values(materials).forEach((mat) => mat.dispose());
  };

  return (
    <group ref={groupRef} position={position} onPointerLeave={disposeMaterials}>
      {/* Cadre gauche */}
      <mesh
        position={[-(width / 2 + 0.06), height / 2, 0]}
        material={materials.frame}
      >
        <boxGeometry args={[0.12, height, depth + 0.04]} />
      </mesh>

      {/* Cadre droit */}
      <mesh
        position={[width / 2 + 0.06, height / 2, 0]}
        material={materials.frame}
      >
        <boxGeometry args={[0.12, height, depth + 0.04]} />
      </mesh>

      {/* Cadre haut */}
      <mesh
        position={[0, height + 0.06, 0]}
        material={materials.frame}
      >
        <boxGeometry args={[width + 0.24, 0.12, depth + 0.04]} />
      </mesh>

      {/* Porte pivotante */}
      <group ref={doorMeshRef} position={[-width / 2, 0, 0]}>
        {/* Panneau porte */}
        <mesh
          position={[width / 2, height / 2, 0]}
          material={materials.door}
        >
          <boxGeometry args={[width, height, depth]} />
        </mesh>

        {/* Poignée */}
        <mesh
          position={[width - 0.15, height / 2, depth / 2 + 0.05]}
          material={materials.handle}
        >
          <boxGeometry args={[0.05, 0.2, 0.05]} />
        </mesh>

        {/* Indicateur LED verrou */}
        <mesh
          ref={lockIndicatorRef}
          position={[width - 0.3, height / 2 - 0.4, depth / 2 + 0.08]}
          material={getLockMaterial()}
        >
          <boxGeometry args={[0.08, 0.15, 0.03]} />
        </mesh>
      </group>

      {/* Lumière point */}
      <pointLight
        position={[width / 4, height / 2, depth / 2 + 0.5]}
        intensity={state === 'unlocked' ? 0.5 : 0.2}
        color={state === 'unlocked' ? '#22c55e' : '#ef4444'}
        distance={5}
        decay={2}
      />
    </group>
  );
}