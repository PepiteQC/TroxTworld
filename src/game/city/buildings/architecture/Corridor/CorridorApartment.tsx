import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════
// CORRIDOR APARTMENT — Porte d'appartement avec numéro
// ═══════════════════════════════════════════════════════════

export function ApartmentDoor({ 
  position, 
  rotation = [0, Math.PI / 2, 0] as [number, number, number],
  doorColor = '#1e3a5f',
  isOpen = false,
}: { 
  position: [number, number, number];
  rotation?: [number, number, number];
  doorNumber?: string;
  doorColor?: string;
  isOpen?: boolean;
}) {
  const doorRef = useRef<THREE.Group>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (doorRef.current) {
      const target = isOpen ? Math.PI / 2 : 0;
      doorRef.current.rotation.y = THREE.MathUtils.lerp(
        doorRef.current.rotation.y,
        target,
        delta * 3
      );
    }
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(isOpen ? '#22c55e' : '#ef4444');
      mat.emissive.set(isOpen ? '#22c55e' : '#ef4444');
      mat.emissiveIntensity = hovered ? 1.5 : 0.8;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Cadre de porte */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 2.6, 0.15]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Porte coulissante */}
      <group ref={doorRef} position={[-0.55, 0, 0.02]}>
        <mesh 
          castShadow 
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[1.1, 2.5, 0.08]} />
          <meshStandardMaterial color={doorColor} metalness={0.5} roughness={0.3} />
        </mesh>
        
        {/* Détails porte */}
        <mesh position={[0, 0.5, 0.05]}>
          <boxGeometry args={[0.9, 0.03, 0.02]} />
          <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, -0.5, 0.05]}>
          <boxGeometry args={[0.9, 0.03, 0.02]} />
          <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.3} />
        </mesh>

        {/* Poignée */}
        <mesh position={[0.85, 0, 0.1]}>
          <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* LED indicateur */}
      <mesh ref={ledRef} position={[0.65, 0.8, 0.08]}>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>

      {/* Numéro de chambre */}
      <mesh position={[0, -1, 0.08]}>
        <planeGeometry args={[0.4, 0.12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// CORRIDOR LIGHT — Luminaire de couloir
// ═══════════════════════════════════════════════════════════

export function CorridorLight({ 
  position, 
  isOn = true,
  side = 'left' as 'left' | 'right',
}: { 
  position: [number, number, number];
  isOn?: boolean;
  side?: 'left' | 'right';
}) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (lightRef.current && isOn) {
      lightRef.current.intensity = 0.8 + Math.sin(clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Support mural */}
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.2, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Luminaire */}
      <mesh position={[side === 'left' ? 0.1 : -0.1, 0.15, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.12, 0.15, 8]} />
        <meshStandardMaterial 
          color={isOn ? '#fef3c7' : '#374151'} 
          emissive={isOn ? '#fef3c7' : '#000000'}
          emissiveIntensity={isOn ? 1.2 : 0}
          transparent
          opacity={isOn ? 0.9 : 1}
        />
      </mesh>

      {/* Point light */}
      {isOn && (
        <pointLight 
          ref={lightRef}
          position={[side === 'left' ? 0.3 : -0.3, 0.15, 0]}
          intensity={0.8}
          color="#fef3c7"
          distance={6}
        />
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// CORRIDOR PLANT — Plante décorative de couloir
// ═══════════════════════════════════════════════════════════

export function CorridorPlant({ 
  position,
  size = 1,
}: { 
  position: [number, number, number];
  size?: number;
}) {
  return (
    <group position={position} scale={[size, size, size]}>
      {/* Pot */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.4, 12]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>

      {/* Plante */}
      {[0, 72, 144, 216, 288].map((angle, i) => (
        <mesh 
          key={i}
          position={[
            Math.sin((angle * Math.PI) / 180) * 0.05,
            0.5 + i * 0.08,
            Math.cos((angle * Math.PI) / 180) * 0.05,
          ]}
          rotation={[0.3, (angle * Math.PI) / 180, 0.2]}
        >
          <boxGeometry args={[0.08, 0.3, 0.02]} />
          <meshStandardMaterial color="#228B22" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// CORRIDOR BENCH — Banc de couloir
// ═══════════════════════════════════════════════════════════

export function CorridorBench({ 
  position,
  rotation = [0, 0, 0] as [number, number, number],
}: { 
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Assise */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.4]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Pieds */}
      {[[-0.7, 0.22], [0.7, 0.22], [-0.7, -0.22], [0.7, -0.22]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.44, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Dossier */}
      <mesh castShadow position={[0, 0.7, -0.15]}>
        <boxGeometry args={[1.6, 0.5, 0.05]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// APARTMENT BUILDING — Immeuble d'appartements complet
// ═══════════════════════════════════════════════════════════

export function ApartmentBuilding({
  position = [0, 0, 0] as [number, number, number],
  floors = 4,
  apartmentsPerFloor = 6,
}: {
  position?: [number, number, number];
  floors?: number;
  apartmentsPerFloor?: number;
}) {
  const FLOOR_HEIGHT = 3.2;
  const BUILDING_WIDTH = 20;
  const BUILDING_DEPTH = 12;

  return (
    <group position={position}>
      {/* Structure principale */}
      <mesh castShadow position={[0, (floors * FLOOR_HEIGHT) / 2, 0]}>
        <boxGeometry args={[BUILDING_WIDTH, floors * FLOOR_HEIGHT, BUILDING_DEPTH]} />
        <meshStandardMaterial color="#2d313a" roughness={0.9} />
      </mesh>

      {/* Balcons par étage */}
      {Array.from({ length: floors }).map((_, floor) => (
        <group key={floor} position={[0, floor * FLOOR_HEIGHT + FLOOR_HEIGHT / 2, 0]}>
          {/* Balcon gauche */}
          <mesh position={[-BUILDING_WIDTH / 2 + 3, 0, BUILDING_DEPTH / 2 + 1]} castShadow>
            <boxGeometry args={[4, 0.15, 2]} />
            <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Garde-corps */}
          <mesh position={[-BUILDING_WIDTH / 2 + 3, 0.5, BUILDING_DEPTH / 2 + 1.8]}>
            <boxGeometry args={[4, 1, 0.05]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Balcon droit */}
          <mesh position={[BUILDING_WIDTH / 2 - 3, 0, BUILDING_DEPTH / 2 + 1]} castShadow>
            <boxGeometry args={[4, 0.15, 2]} />
            <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Garde-corps */}
          <mesh position={[BUILDING_WIDTH / 2 - 3, 0.5, BUILDING_DEPTH / 2 + 1.8]}>
            <boxGeometry args={[4, 1, 0.05]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Fenêtres par étage */}
      {Array.from({ length: floors }).map((_, floor) => (
        <group key={`windows-${floor}`} position={[0, floor * FLOOR_HEIGHT + FLOOR_HEIGHT / 2, BUILDING_DEPTH / 2 + 0.05]}>
          {Array.from({ length: apartmentsPerFloor }).map((_, apt) => {
            const x = -BUILDING_WIDTH / 2 + 2 + (apt * (BUILDING_WIDTH - 4) / apartmentsPerFloor);
            return (
              <mesh key={apt} position={[x, 0, 0]} castShadow>
                <boxGeometry args={[1.5, 2, 0.1]} />
                <meshStandardMaterial 
                  color="#7dd3fc" 
                  transparent 
                  opacity={0.3} 
                  roughness={0}
                  metalness={0.1}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Enseigne sur le toit */}
      <group position={[0, floors * FLOOR_HEIGHT + 1, 0]}>
        <mesh>
          <boxGeometry args={[8, 1.5, 0.2]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[7.6, 1.1, 0.05]} />
          <meshStandardMaterial 
            color="#ff8c00" 
            emissive="#ff6600" 
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>
    </group>
  );
}