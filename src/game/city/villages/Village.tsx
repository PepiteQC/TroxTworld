// ═══════════════════════════════════════════════════════════════════════════
//  VILLAGE ASSETS — MAISONS CANADIENNES, DÉPANNEUR & PANNEAUX DE PROXIMITÉ
//  src/components/world/Village.tsx
//  Saint-Casimir & Rang 138 · Géométries alignées · Éclairage nocturne automatique
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGameState } from '../../store';

// ─── MATÉRIAUX ET GÉOMÉTRIES PARTAGÉS (0 Allocation) ──────────────────────
const POLE_GEO = new THREE.CylinderGeometry(0.045, 0.045, 2.5, 8);
const SIGN_BOX_GEO = new THREE.BoxGeometry(2.1, 1.0, 0.08);
const SIGN_PLANE_GEO = new THREE.PlaneGeometry(1.95, 0.85);

const POLE_MAT = new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 0.5, metalness: 0.4 });
const SIGN_BACK_MAT = new THREE.MeshStandardMaterial({ color: '#164e28', roughness: 0.8 });

// Géométries partagées des maisons
const FOUNDATION_GEO = new THREE.BoxGeometry(8.2, 0.5, 6.2);
const WALL_GEO = new THREE.BoxGeometry(8.0, 3.5, 6.0);
const ROOF_GEO = new THREE.ConeGeometry(5.8, 2.8, 4); // Cône 4 faces
const DOOR_GEO = new THREE.BoxGeometry(1.0, 2.1, 0.08);
const WINDOW_GEO = new THREE.BoxGeometry(1.2, 1.1, 0.06);
const CHIMNEY_GEO = new THREE.BoxGeometry(0.6, 1.8, 0.6);

const FOUNDATION_MAT = new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 0.95 });
const ROOF_MAT = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.75, flatShading: true });
const DOOR_MAT = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.8 });
const CHIMNEY_MAT = new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.9 });

// ─── CACHE DE TEXTURES DE SIGNALISATION STATIQUE (ANTI-DUPLICATION) ────────
const signCache = new Map<string, THREE.CanvasTexture>();

function getSignTexture(text: string): THREE.CanvasTexture {
  if (signCache.has(text)) return signCache.get(text)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Fond vert autoroutier MTQ
    ctx.fillStyle = '#155724';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bordure blanche
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Typographie
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > 450 && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);

    const lineHeight = 44;
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, idx) => ctx.fillText(l, canvas.width / 2, startY + idx * lineHeight));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  signCache.set(text, texture);
  return texture;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PANNEAU ROUTIER DE PROXIMITÉ
// ─────────────────────────────────────────────────────────────────────────────
export function RoadSign({
  position,
  text,
  rotation = 0,
}: {
  position: [number, number, number];
  text: string;
  rotation?: number;
}) {
  const texture = useMemo(() => getSignTexture(text), [text]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Poteau en acier */}
      <mesh geometry={POLE_GEO} material={POLE_MAT} position={[0, 1.25, 0]} castShadow />
      
      {/* Panneau vert */}
      <mesh geometry={SIGN_BOX_GEO} material={SIGN_BACK_MAT} position={[0, 2.7, 0]} castShadow />

      {/* Face imprimée */}
      <mesh geometry={SIGN_PLANE_GEO} position={[0, 2.7, 0.045]}>
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MAISON CANADIENNE PATRIMONIALE (RANG DE SAINT-CASIMIR)
// ─────────────────────────────────────────────────────────────────────────────
interface QuebecHouseProps {
  position: [number, number, number];
  rotation?: number;
  color?: string;
}

function QuebecHouse({ position, rotation = 0, color = '#e2d9c8' }: QuebecHouseProps) {
  const timeOfDay = useGameState((s) => s.timeOfDay ?? 12);
  const isNight = timeOfDay >= 19.5 || timeOfDay <= 5.5;

  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
    [color]
  );

  const glassMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isNight ? '#fed7aa' : '#38bdf8',
      emissive: isNight ? '#fbbf24' : '#000000',
      emissiveIntensity: isNight ? 1.0 : 0.0,
      roughness: 0.2,
      metalness: 0.3,
    });
  }, [isNight]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Fondation surélevée en pierre de taille */}
      <mesh geometry={FOUNDATION_GEO} material={FOUNDATION_MAT} position={[0, 0.25, 0]} castShadow receiveShadow />

      {/* Murs en bois ou crépi canadien */}
      <mesh geometry={WALL_GEO} material={wallMat} position={[0, 2.25, 0]} castShadow receiveShadow />

      {/* Toit à forte pente (Correctement orienté à 45 deg) */}
      <mesh
        geometry={ROOF_GEO}
        material={ROOF_MAT}
        position={[0, 5.3, 0]}
        rotation={[0, Math.PI / 4, 0]}
        castShadow
      />

      {/* Cheminée de brique */}
      <mesh geometry={CHIMNEY_GEO} material={CHIMNEY_MAT} position={[2.4, 5.2, -1.2]} castShadow />

      {/* Porte d'entrée en bois franc */}
      <mesh geometry={DOOR_GEO} material={DOOR_MAT} position={[0, 1.55, 3.04]} />

      {/* Fenêtres à carreaux de façade */}
      {[-2.5, 2.5].map((x) => (
        <mesh key={`win_f_${x}`} geometry={WINDOW_GEO} material={glassMat} position={[x, 2.4, 3.04]} />
      ))}

      {/* Fenêtres arrière */}
      {[-2.5, 2.5].map((x) => (
        <mesh key={`win_b_${x}`} geometry={WINDOW_GEO} material={glassMat} position={[x, 2.4, -3.04]} />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ALIGNEMENT DES MAISONS DU VILLAGE
// ─────────────────────────────────────────────────────────────────────────────
export function VillageBuildings() {
  const buildings = useMemo(
    () => [
      { pos: [-45, 0, -22] as [number, number, number], rot: 0, color: '#e8e0d5' },
      { pos: [-65, 0, -24] as [number, number, number], rot: 0.04, color: '#d8c8b8' },
      { pos: [30, 0, -22] as [number, number, number], rot: -0.04, color: '#c5d3c1' },
      { pos: [55, 0, -25] as [number, number, number], rot: 0.02, color: '#ded4c5' },
      { pos: [78, 0, -22] as [number, number, number], rot: 0, color: '#cfd8d2' },
      { pos: [-40, 0, 24] as [number, number, number], rot: Math.PI, color: '#e2d5c3' },
      { pos: [-70, 0, 26] as [number, number, number], rot: Math.PI + 0.03, color: '#b9ccb8' },
      { pos: [40, 0, 22] as [number, number, number], rot: Math.PI, color: '#d6c8b4' },
      { pos: [68, 0, 25] as [number, number, number], rot: Math.PI - 0.02, color: '#e0ded8' },
    ],
    []
  );

  return (
    <group name="Village_Buildings_Cluster">
      {buildings.map((b, i) => (
        <QuebecHouse key={`house_${i}`} position={b.pos} rotation={b.rot} color={b.color} />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LE DÉPANNEUR TRADITIONNEL AVEC STATION-SERVICE
// ─────────────────────────────────────────────────────────────────────────────
export function Depanneur({ position }: { position: [number, number, number] }) {
  const timeOfDay = useGameState((s) => s.timeOfDay ?? 12);
  const isNight = timeOfDay >= 19.5 || timeOfDay <= 5.5;

  const windowMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isNight ? '#fef08a' : '#38bdf8',
      emissive: isNight ? '#eab308' : '#000000',
      emissiveIntensity: isNight ? 1.2 : 0.0,
      roughness: 0.2,
    });
  }, [isNight]);

  return (
    <group position={position} name="Depanneur_Store">
      {/* Bâtiment principal */}
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[13, 5, 9.5]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>

      {/* Toiture terrasse avec bordure noire */}
      <mesh position={[0, 5.15, 0]} castShadow>
        <boxGeometry args={[13.4, 0.35, 9.9]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Enseigne rouge vive éclairée (Style Couche-Tard) */}
      <mesh position={[0, 4.3, 4.8]}>
        <boxGeometry args={[11, 1.1, 0.12]} />
        <meshStandardMaterial
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={isNight ? 1.2 : 0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Grandes baies vitrées de façade */}
      <mesh position={[-2.2, 2.0, 4.8]} material={windowMat}>
        <boxGeometry args={[6.5, 2.4, 0.08]} />
      </mesh>

      {/* Porte vitrée d'entrée */}
      <mesh position={[3.2, 1.6, 4.8]}>
        <boxGeometry args={[1.6, 2.8, 0.1]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>

      {/* Marquise extérieure de station-service (Canopy) */}
      <mesh position={[0, 4.8, 11]} castShadow>
        <boxGeometry args={[10, 0.35, 6.5]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
      </mesh>

      {/* Colonnes de soutien de la marquise */}
      {[-4.2, 4.2].map((x) => (
        <mesh key={`col_${x}`} position={[x, 2.4, 11]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 4.8, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}

      {/* Îlot de pompes à essence */}
      <mesh position={[0, 0.15, 11]} receiveShadow>
        <boxGeometry args={[6, 0.3, 2.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </mesh>
    </group>
  );
}

export default VillageBuildings;