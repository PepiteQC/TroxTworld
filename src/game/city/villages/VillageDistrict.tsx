// ═══════════════════════════════════════════════════════════════════════════
//  VILLAGE DISTRICT — QUARTIER RÉSIDENTIEL & COMMERCES DE PROXIMITÉ
//  src/components/world/VillageDistrict.tsx
//  Maisons québécoises · Dépanneur · Garage · Café Tim · Trottoirs & Éclairage
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameState } from '../../store';
import type { Village } from '../../data/WorldConfig';

const HOUSE_COLORS = ['#d8c7a9', '#c5d3c0', '#d3b3a5', '#c6c8cf', '#d7c29a'];

// ─── GÉOMÉTRIES PARTAGÉES (0 Allocation VRAM) ──────────────────────────────
const HOUSE_WALL_GEO = new THREE.BoxGeometry(7, 3.2, 5.5);
const HOUSE_ROOF_GEO = new THREE.ConeGeometry(4.7, 2.2, 4); // Cône 4 faces orienté
const HOUSE_DOOR_GEO = new THREE.BoxGeometry(0.85, 1.8, 0.06);
const HOUSE_WINDOW_GEO = new THREE.BoxGeometry(1.15, 0.9, 0.06);

const SERVICE_BODY_GEO = new THREE.BoxGeometry(9.5, 4.0, 7.5);
const SERVICE_ROOF_GEO = new THREE.BoxGeometry(9.8, 0.25, 7.8);
const SERVICE_SIGN_FRAME_GEO = new THREE.BoxGeometry(7.8, 0.85, 0.08);
const SERVICE_SIGN_FACE_GEO = new THREE.PlaneGeometry(7.4, 0.65);
const SERVICE_BASE_GEO = new THREE.BoxGeometry(12, 0.12, 9.5);
const SERVICE_DOOR_GEO = new THREE.BoxGeometry(1.4, 2.2, 0.08);

// ─────────────────────────────────────────────────────────────────────────────
// 1. MAISON RÉSIDENTIELLE DE RANG
// ─────────────────────────────────────────────────────────────────────────────
interface HouseProps {
  position: [number, number, number];
  color: string;
  rotation: number;
}

function House({ position, color, rotation }: HouseProps) {
  const timeOfDay = useGameState((s) => s.timeOfDay ?? 12);
  const isNight = timeOfDay >= 19.5 || timeOfDay <= 5.5;

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }), [color]);
  
  const glassMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isNight ? '#fef08a' : '#38bdf8',
      emissive: isNight ? '#eab308' : '#000000',
      emissiveIntensity: isNight ? 1.0 : 0.0,
      roughness: 0.2,
      metalness: 0.2,
    });
  }, [isNight]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Murs de la maison */}
      <mesh geometry={HOUSE_WALL_GEO} material={wallMat} position={[0, 1.6, 0]} castShadow receiveShadow />

      {/* Toit à 4 versants (Tourné à 45° pour épouser les coins) */}
      <mesh
        geometry={HOUSE_ROOF_GEO}
        position={[0, 4.25, 0]}
        rotation={[0, Math.PI / 4, 0]}
        castShadow
      >
        <meshStandardMaterial color="#451a03" roughness={0.8} flatShading />
      </mesh>

      {/* Porte en bois d'entrée */}
      <mesh geometry={HOUSE_DOOR_GEO} position={[0, 0.9, 2.78]}>
        <meshStandardMaterial color="#3e1a06" roughness={0.8} />
      </mesh>

      {/* Fenêtres de façade */}
      {[-2.15, 2.15].map((x) => (
        <mesh key={`win_${x}`} geometry={HOUSE_WINDOW_GEO} material={glassMat} position={[x, 1.9, 2.78]} />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BÂTIMENT DE COMMERCE & SERVICES (DÉPANNEUR / GARAGE / CAFÉ)
// ─────────────────────────────────────────────────────────────────────────────
interface ServiceBuildingProps {
  position: [number, number, number];
  label: string;
  color: string;
}

function ServiceBuilding({ position, label, color }: ServiceBuildingProps) {
  const timeOfDay = useGameState((s) => s.timeOfDay ?? 12);
  const isNight = timeOfDay >= 19.5 || timeOfDay <= 5.5;

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.8 }), []);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 }), []);
  
  const signBackMat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5 }), [color]);
  const signGlowMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: isNight ? '#ffffff' : '#f8fafc',
      toneMapped: false,
    });
  }, [isNight]);

  return (
    <group position={position} userData={{ label }}>
      {/* Plancher / Fondation béton */}
      <mesh geometry={SERVICE_BASE_GEO} position={[0, 0.06, 0]} receiveShadow>
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </mesh>

      {/* Corps du bâtiment commercial */}
      <mesh geometry={SERVICE_BODY_GEO} material={bodyMat} position={[0, 2.06, 0]} castShadow receiveShadow />

      {/* Toiture terrasse */}
      <mesh geometry={SERVICE_ROOF_GEO} material={roofMat} position={[0, 4.15, 0]} castShadow />

      {/* Support d'enseigne coloré */}
      <mesh geometry={SERVICE_SIGN_FRAME_GEO} material={signBackMat} position={[0, 4.75, 3.75]} />

      {/* Enseigne lumineuse blanche */}
      <mesh geometry={SERVICE_SIGN_FACE_GEO} material={signGlowMat} position={[0, 4.75, 3.8]} />

      {/* Baie vitrée / Porte d'entrée commerciale */}
      <mesh geometry={SERVICE_DOOR_GEO} position={[0, 1.15, 3.76]}>
        <meshStandardMaterial
          color={isNight ? '#fef08a' : '#38bdf8'}
          emissive={isNight ? '#facc15' : '#000000'}
          emissiveIntensity={isNight ? 0.8 : 0.0}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENSEMBLE DU QUARTIER DU VILLAGE
// ─────────────────────────────────────────────────────────────────────────────
interface VillageDistrictProps {
  village: Village;
  position?: [number, number, number];
}

export function VillageDistrict({ village, position = [0, 0, 0] }: VillageDistrictProps) {
  // Placement géométrique des 6 maisons autour de la rue de village
  const houses = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        position: [
          -28 + (index % 3) * 28,
          0,
          index < 3 ? -19 : 19,
        ] as [number, number, number],
        rotation: index < 3 ? 0 : Math.PI,
        color: HOUSE_COLORS[index % HOUSE_COLORS.length],
      })),
    []
  );

  return (
    <group position={position} name={`VillageDistrict_${village.name}`}>
      {/* Allées résidentielles asphaltées */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -19]} receiveShadow>
        <planeGeometry args={[72, 7]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 19]} receiveShadow>
        <planeGeometry args={[72, 7]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Trottoirs et bordures en béton gris */}
      {[-23.2, -14.8, 14.8, 23.2].map((z) => (
        <mesh key={`sidewalk_${z}`} rotation-x={-Math.PI / 2} position={[0, 0.02, z]} receiveShadow>
          <planeGeometry args={[72, 1.4]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
      ))}

      {/* 6 Maisons canadiennes */}
      {houses.map((house, idx) => (
        <House key={`house_cluster_${idx}`} {...house} />
      ))}

      {/* Commerces de proximité selon les services du village */}
      {village.hasDepanneur && (
        <ServiceBuilding position={[-7, 0, -32]} label="DÉPANNEUR" color="#eab308" />
      )}

      {village.hasGarage && (
        <ServiceBuilding position={[15, 0, 32]} label="GARAGE" color="#2563eb" />
      )}

      {village.hasTim && (
        <ServiceBuilding position={[25, 0, -29]} label="CAFÉ TIM" color="#dc2626" />
      )}
    </group>
  );
}

export default VillageDistrict;