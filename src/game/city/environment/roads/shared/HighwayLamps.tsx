/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  HIGHWAY LAMPS v2.0 — Éclairage routier & urbain Québec
 *  src/roads/shared/HighwayLamps.tsx
 * ───────────────────────────────────────────────────────────────────────────
 *  • FIX : 1 seul useFrame pour les 2 réseaux
 *  • FIX : dispose des géométries
 *  • FIX : ajout optionnel de PointLight actif
 *  • Config : spacing, night detection, weather
 *  • Compat 100% v1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameState } from '../../store';

// ─── MATÉRIAUX PARTAGÉS ──────────────────────────────────────────────────
const HIGHWAY_POLE_MAT = new THREE.MeshStandardMaterial({ color: '#525b68', roughness: 0.6, metalness: 0.5 });
const VILLAGE_POLE_MAT = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8, metalness: 0.2 });

// 🆕 v2 — Matériaux glow partagés avec référence exposée
export const HIGHWAY_GLOW_MAT = new THREE.MeshBasicMaterial({
  color: '#ffa94d', transparent: true, opacity: 0, toneMapped: false,
});
export const VILLAGE_GLOW_MAT = new THREE.MeshBasicMaterial({
  color: '#fed7aa', transparent: true, opacity: 0, toneMapped: false,
});

// ─── GÉOMÉTRIES PARTAGÉES ────────────────────────────────────────────────
const HW_POLE_GEO = new THREE.CylinderGeometry(0.08, 0.14, 9.5, 8);
const HW_ARM_GEO = new THREE.CylinderGeometry(0.04, 0.05, 2.8, 6);
const HW_COBRA_HEAD_GEO = new THREE.BoxGeometry(0.35, 0.15, 0.85);
const HW_BULB_GEO = new THREE.SphereGeometry(0.2, 8, 8);

const VILLAGE_POLE_GEO = new THREE.CylinderGeometry(0.06, 0.1, 4.5, 6);
const VILLAGE_LANTERN_GEO = new THREE.BoxGeometry(0.35, 0.5, 0.35);
const VILLAGE_BULB_GEO = new THREE.SphereGeometry(0.14, 8, 8);

// ─────────────────────────────────────────────────────────────────────────
// HOOK : État "allumé" (night detection centralisée)
// ─────────────────────────────────────────────────────────────────────────

function useLampActivation(): number {
  const timeOfDay = useGameState((s) => s.timeOfDay ?? 12);
  const weather = useGameState((s) => s.weather ?? 'clear');

  return useMemo(() => {
    const isNight = timeOfDay >= 18.5 || timeOfDay <= 6.2;
    const isDarkWeather = weather === 'storm' || weather === 'fog';
    return (isNight || isDarkWeather) ? 1 : 0;
  }, [timeOfDay, weather]);
}

// ═══════════════════════════════════════════════════════════
// HIGHWAY LAMP (réutilisable)
// ═══════════════════════════════════════════════════════════

interface LampProps {
  position: [number, number, number];
  facing: 1 | -1;
  /** 🆕 v2 — Ajouter un PointLight réel */
  withLight?: boolean;
  lightIntensity?: number;
  lightDistance?: number;
}

function HighwayLamp({ position, facing, withLight = false, lightIntensity = 2.5, lightDistance = 22 }: LampProps) {
  const armAngle = facing > 0 ? 0 : Math.PI;

  return (
    <group position={position}>
      <mesh geometry={HW_POLE_GEO} material={HIGHWAY_POLE_MAT} position={[0, 4.75, 0]} castShadow />
      <group position={[0, 9.2, 0]} rotation={[0, armAngle, 0]}>
        <mesh geometry={HW_ARM_GEO} material={HIGHWAY_POLE_MAT} position={[0, 0.6, 1.2]} rotation={[0.4, 0, 0]} castShadow />
        <mesh geometry={HW_COBRA_HEAD_GEO} material={HIGHWAY_POLE_MAT} position={[0, 1.1, 2.4]} castShadow />
        <mesh geometry={HW_BULB_GEO} material={HIGHWAY_GLOW_MAT} position={[0, 1.0, 2.4]} />

        {/* 🆕 v2 — PointLight optionnel (attention perf : max 8-12 par scène) */}
        {withLight && (
          <pointLight
            position={[0, 0.9, 2.4]}
            intensity={lightIntensity}
            color="#ffc47a"
            distance={lightDistance}
            decay={2}
          />
        )}
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// HIGHWAY LAMPS NETWORK
// ═══════════════════════════════════════════════════════════

interface HighwayLampsProps {
  startX?: number;
  length?: number;
  spacing?: number;
  zOffset?: number;
  alternating?: boolean;
  /** 🆕 v2 — Activer les PointLights réels (par défaut : off pour perf) */
  realLights?: boolean;
  /** 🆕 v2 — Nombre max de PointLights (limite GPU) */
  maxRealLights?: number;
}

export function HighwayLamps({
  startX = -100,
  length = 250,
  spacing = 40,
  zOffset = 7.5,
  alternating = true,
  realLights = false,
  maxRealLights = 8,
}: HighwayLampsProps) {
  const count = Math.max(2, Math.floor(length / spacing));

  const lampData = useMemo(() => {
    const list: { pos: [number, number, number]; facing: 1 | -1 }[] = [];

    for (let i = 0; i <= count; i++) {
      const x = startX + i * spacing;

      if (alternating) {
        const isNorth = i % 2 === 0;
        list.push({
          pos: [x, 0, isNorth ? -zOffset : zOffset],
          facing: isNorth ? 1 : -1,
        });
      } else {
        list.push({ pos: [x, 0, -zOffset], facing: 1 });
        list.push({ pos: [x, 0, zOffset], facing: -1 });
      }
    }
    return list;
  }, [startX, spacing, zOffset, alternating, count]);

  return (
    <group name="Highway_Lamps_Network_v2">
      {lampData.map((lamp, i) => (
        <HighwayLamp
          key={`hw_lamp_${i}`}
          position={lamp.pos}
          facing={lamp.facing}
          withLight={realLights && i < maxRealLights}
        />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// VILLAGE LAMP
// ═══════════════════════════════════════════════════════════

function SmallVillageLamp({ position, facing, withLight = false, lightIntensity = 1.8, lightDistance = 12 }: LampProps) {
  const armAngle = facing > 0 ? 0 : Math.PI;

  return (
    <group position={position}>
      <mesh geometry={VILLAGE_POLE_GEO} material={VILLAGE_POLE_MAT} position={[0, 2.25, 0]} castShadow />
      <group position={[0, 4.3, 0]} rotation={[0, armAngle, 0]}>
        <mesh position={[0, 0, 0.6]} material={VILLAGE_POLE_MAT} castShadow>
          <boxGeometry args={[0.08, 0.08, 1.2]} />
        </mesh>
        <mesh geometry={VILLAGE_LANTERN_GEO} material={VILLAGE_POLE_MAT} position={[0, -0.2, 1.1]} castShadow />
        <mesh geometry={VILLAGE_BULB_GEO} material={VILLAGE_GLOW_MAT} position={[0, -0.2, 1.1]} />

        {withLight && (
          <pointLight
            position={[0, -0.3, 1.1]}
            intensity={lightIntensity}
            color="#fed7aa"
            distance={lightDistance}
            decay={2}
          />
        )}
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// VILLAGE LAMPS NETWORK
// ═══════════════════════════════════════════════════════════

interface VillageLampsProps {
  startX?: number;
  length?: number;
  spacing?: number;
  zOffset?: number;
  realLights?: boolean;
  maxRealLights?: number;
}

export function VillageLamps({
  startX = -100,
  length = 200,
  spacing = 25,
  zOffset = 4.8,
  realLights = false,
  maxRealLights = 6,
}: VillageLampsProps) {
  const count = Math.max(2, Math.floor(length / spacing));

  const lampData = useMemo(() => {
    const list: { pos: [number, number, number]; facing: 1 | -1 }[] = [];

    for (let i = 0; i <= count; i++) {
      const x = startX + i * spacing;
      list.push({ pos: [x, 0, -zOffset], facing: 1 });
      list.push({ pos: [x, 0, zOffset], facing: -1 });
    }
    return list;
  }, [startX, spacing, zOffset, count]);

  return (
    <group name="Village_Lamps_Network_v2">
      {lampData.map((lamp, i) => (
        <SmallVillageLamp
          key={`vil_lamp_${i}`}
          position={lamp.pos}
          facing={lamp.facing}
          withLight={realLights && i < maxRealLights}
        />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — CONTROLLER GLOBAL (1 seul useFrame pour TOUS les lampadaires)
// ═══════════════════════════════════════════════════════════

export function LampsActivationController() {
  const activation = useLampActivation();

  useFrame(() => {
    const targetOpacity = activation * 0.95;
    HIGHWAY_GLOW_MAT.opacity = THREE.MathUtils.lerp(HIGHWAY_GLOW_MAT.opacity, targetOpacity, 0.1);
    VILLAGE_GLOW_MAT.opacity = THREE.MathUtils.lerp(VILLAGE_GLOW_MAT.opacity, targetOpacity * 0.95, 0.1);
  });

  return null;
}

/** 🆕 v2 — Cleanup (à appeler si tu démontes tous les réseaux) */
export function disposeLampMaterials(): void {
  HIGHWAY_GLOW_MAT.dispose();
  VILLAGE_GLOW_MAT.dispose();
}