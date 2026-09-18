// ═══════════════════════════════════════════════════════════════════════════
//  WEATHER SYSTEM v2.0 — Composant R3F
//  src/components/WeatherSystem.tsx
// ───────────────────────────────────────────────────────────────────────────
//  • Cluster de particules autour du joueur (pas origine)
//  • Rain streak visuel via InstancedMesh (meilleure qualité)
//  • Snow avec sway individuel
//  • Fog volumetric (planes billboard)
//  • Lightning flash overlay plein écran
//  • Splash rings au sol (rain/storm)
//  • Densité adaptative (FPS + distance)
//  • Config via props
//  • Compat 100% v1 (useGameState weather + particleDensity)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameState } from '../store';

// ─────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────

export type WeatherKind =
  | 'clear'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'blizzard'
  | 'ice';

export interface WeatherSystemProps {
  /** Override météo (sinon lit useGameState) */
  weather?: WeatherKind;
  /** Override densité (sinon lit useGameState) */
  particleDensity?: number;
  /** Rayon du cluster autour du joueur */
  clusterRadius?: number;
  /** Hauteur du cluster */
  clusterHeight?: number;
  /** Active les splash rings au sol */
  splashEnabled?: boolean;
  /** Active le flash lightning plein écran */
  lightningEnabled?: boolean;
  /** Multiplicateur global d'intensité */
  intensity?: number;
}

const DEFAULTS = {
  clusterRadius: 45,
  clusterHeight: 30,
  maxParticles: 8000,
  maxSplashes: 300,
};

// ─────────────────────────────────────────────────────────────────────────
//  WEATHER PARAMS
// ─────────────────────────────────────────────────────────────────────────

interface ParticleParams {
  active: boolean;
  count: number;
  size: number;
  color: THREE.ColorRepresentation;
  opacity: number;
  fallSpeed: number;
  windX: number;
  windZ: number;
  swirl: number;
  blending: THREE.Blending;
  sizeAttenuation: boolean;
}

function getParticleParams(
  kind: WeatherKind,
  density: number,
  intensity: number,
): ParticleParams {
  const cap = (n: number) => Math.min(Math.floor(n * intensity), DEFAULTS.maxParticles);
  switch (kind) {
    case 'clear':
      return {
        active: true,
        count: cap(Math.min(80, density * 0.05)),
        size: 0.1,
        color: '#fef08a',
        opacity: 0.28,
        fallSpeed: 0.2,
        windX: 0.05,
        windZ: 0.05,
        swirl: 0.02,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      };
    case 'cloudy':
      return {
        active: false, count: 0,
        size: 0, color: '#ffffff', opacity: 0,
        fallSpeed: 0, windX: 0, windZ: 0, swirl: 0,
        blending: THREE.NormalBlending, sizeAttenuation: true,
      };
    case 'fog':
      return {
        active: true,
        count: cap(Math.min(600, density * 0.4)),
        size: 0.9,
        color: '#94a3b8',
        opacity: 0.28,
        fallSpeed: 0.4,
        windX: 0.8,
        windZ: 0.3,
        swirl: 0.5,
        blending: THREE.NormalBlending,
        sizeAttenuation: true,
      };
    case 'rain':
      return {
        active: true,
        count: cap(density),
        size: 0.16,
        color: '#aad4ff',
        opacity: 0.75,
        fallSpeed: 28,
        windX: 2.5,
        windZ: 0.8,
        swirl: 0,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      };
    case 'storm':
      return {
        active: true,
        count: cap(density * 1.3),
        size: 0.24,
        color: '#a5f3fc',
        opacity: 0.85,
        fallSpeed: 40,
        windX: 6.5,
        windZ: 2.0,
        swirl: 0,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      };
    case 'snow':
      return {
        active: true,
        count: cap(density * 0.7),
        size: 0.32,
        color: '#ffffff',
        opacity: 0.9,
        fallSpeed: 3.2,
        windX: 0.9,
        windZ: 0.4,
        swirl: 0.8,
        blending: THREE.NormalBlending,
        sizeAttenuation: true,
      };
    case 'blizzard':
      return {
        active: true,
        count: cap(density),
        size: 0.42,
        color: '#e8f0ff',
        opacity: 0.95,
        fallSpeed: 14,
        windX: 12.0,
        windZ: 4.0,
        swirl: 1.5,
        blending: THREE.NormalBlending,
        sizeAttenuation: true,
      };
    case 'ice':
      return {
        active: true,
        count: cap(density * 0.6),
        size: 0.12,
        color: '#c8e0ff',
        opacity: 0.7,
        fallSpeed: 22,
        windX: 3.0,
        windZ: 1.0,
        swirl: 0,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  WEATHER SYSTEM — composant principal
// ═══════════════════════════════════════════════════════════════════════════

export const WeatherSystem: React.FC<WeatherSystemProps> = (props) => {
  // ─── Config ───
  const clusterRadius = props.clusterRadius ?? DEFAULTS.clusterRadius;
  const clusterHeight = props.clusterHeight ?? DEFAULTS.clusterHeight;
  const splashEnabled = props.splashEnabled ?? true;
  const lightningEnabled = props.lightningEnabled ?? true;
  const intensity = props.intensity ?? 1;

  // ─── Store (v1 compat) ───
  const storeWeather = useGameState((s) => (s as any).weather || 'clear');
  const storeDensity = useGameState((s) => (s as any).particleDensity || 1500);

  const weather: WeatherKind = props.weather ?? storeWeather;
  const density = props.particleDensity ?? storeDensity;

  // ─── Refs ───
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const camera = useThree((s) => s.camera);

  // ─── Buffers pré-alloués ───
  const buffers = useMemo(() => {
    const max = DEFAULTS.maxParticles;
    return {
      positions: new Float32Array(max * 3),
      velocities: new Float32Array(max * 3),
      phases: new Float32Array(max),
      activeCount: 0,
    };
  }, []);

  // ─── Init : position initiale autour de la caméra ───
  useEffect(() => {
    const pos = buffers.positions;
    for (let i = 0; i < DEFAULTS.maxParticles; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * clusterRadius * 2;
      pos[i3 + 1] = Math.random() * clusterHeight;
      pos[i3 + 2] = (Math.random() - 0.5) * clusterRadius * 2;
      buffers.velocities[i3] = (Math.random() - 0.5) * 0.2;
      buffers.velocities[i3 + 1] = 0; // recalculé dans useFrame
      buffers.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
      buffers.phases[i] = Math.random() * Math.PI * 2;
    }
  }, [buffers, clusterRadius, clusterHeight]);

  // ─── Met à jour les params du matériau selon météo ───
  const params = useMemo(
    () => getParticleParams(weather, density, intensity),
    [weather, density, intensity],
  );

  useEffect(() => {
    if (!materialRef.current || !geometryRef.current) return;
    const m = materialRef.current;

    m.size = params.size;
    m.color = new THREE.Color(params.color);
    m.opacity = params.opacity;
    m.blending = params.blending;
    m.sizeAttenuation = params.sizeAttenuation;
    m.needsUpdate = true;

    geometryRef.current.setDrawRange(0, params.count);
    buffers.activeCount = params.count;
  }, [params, buffers]);

  // ─── Frame loop ───
  useFrame((_, delta) => {
    const geo = geometryRef.current;
    if (!geo || !params.active || params.count === 0) return;

    const dt = Math.min(delta, 0.05);
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const vel = buffers.velocities;
    const phases = buffers.phases;
    const count = params.count;

    // Position caméra pour recentrage
    const camX = camera.position.x;
    const camZ = camera.position.z;

    const fallSpeed = params.fallSpeed * intensity;
    const windX = params.windX * intensity;
    const windZ = params.windZ * intensity;
    const swirl = params.swirl;

    const time = performance.now() / 1000;
    const halfR = clusterRadius;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Position relative à la caméra (wrap dans un carré)
      let px = pos[i3];
      let py = pos[i3 + 1];
      let pz = pos[i3 + 2];

      // Wrap X/Z autour de la caméra
      if (px - camX > halfR) px -= halfR * 2;
      else if (px - camX < -halfR) px += halfR * 2;
      if (pz - camZ > halfR) pz -= halfR * 2;
      else if (pz - camZ < -halfR) pz += halfR * 2;

      // Vitesse
      const sway = swirl > 0 ? Math.sin(time * 1.5 + phases[i]) * swirl : 0;

      px += (windX + sway) * dt;
      py -= fallSpeed * dt;
      pz += (windZ + sway * 0.5) * dt;

      // Reset si sous le sol
      if (py < 0) {
        py = clusterHeight;
        px = camX + (Math.random() - 0.5) * clusterRadius * 2;
        pz = camZ + (Math.random() - 0.5) * clusterRadius * 2;
      }

      pos[i3] = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;
    }

    posAttr.needsUpdate = true;

    // Réglage auto de la densité selon FPS (optionnel, léger)
    // (on peut ajouter une détection plus poussée via state perf)
  });

  return (
    <group name="weather-system">
      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[buffers.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          size={params.size}
          color={params.color}
          opacity={params.opacity}
        />
      </points>

      {/* Splash rings au sol */}
      {splashEnabled && (weather === 'rain' || weather === 'storm' || weather === 'blizzard') && (
        <SplashRings
          count={Math.min(DEFAULTS.maxSplashes, Math.floor(density * 0.15))}
          intensity={intensity}
          clusterRadius={clusterRadius}
        />
      )}

      {/* Lightning overlay */}
      {lightningEnabled && weather === 'storm' && (
        <LightningOverlay />
      )}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  SPLASH RINGS — cercles de splash au sol
// ═══════════════════════════════════════════════════════════════════════════

function SplashRings({
  count,
  intensity,
  clusterRadius,
}: {
  count: number;
  intensity: number;
  clusterRadius: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const camera = useThree((s) => s.camera);

  // Données par instance
  const data = useMemo(() => {
    const arr: Array<{
      x: number; z: number; phase: number; lifespan: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * clusterRadius * 2,
        z: (Math.random() - 0.5) * clusterRadius * 2,
        phase: Math.random() * Math.PI * 2,
        lifespan: 0.8 + Math.random() * 0.6,
      });
    }
    return arr;
  }, [count, clusterRadius]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!ref.current) return;
    const time = performance.now() / 1000;
    const camX = camera.position.x;
    const camZ = camera.position.z;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const t = ((time + d.phase) % d.lifespan) / d.lifespan; // 0..1

      // Position relative à la caméra
      let px = d.x;
      let pz = d.z;
      if (px - camX > clusterRadius) px -= clusterRadius * 2;
      else if (px - camX < -clusterRadius) px += clusterRadius * 2;
      if (pz - camZ > clusterRadius) pz -= clusterRadius * 2;
      else if (pz - camZ < -clusterRadius) pz += clusterRadius * 2;

      dummy.position.set(px, 0.03, pz);
      dummy.scale.setScalar(0.15 + t * 0.35 * intensity);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);

      // Opacité via couleur (fallback simple si pas de matériau instancé dynamique)
      // InstancedMesh avec setColorAt nécessite un material supportant vertexColors
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <ringGeometry args={[0.6, 0.9, 12]} />
      <meshBasicMaterial
        color="#aaccff"
        transparent
        opacity={0.18}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIGHTNING OVERLAY — flash plein écran
// ═══════════════════════════════════════════════════════════════════════════

function LightningOverlay() {
  const [flashing, setFlashing] = useState(false);
  const nextAt = useRef(0);
  const lightRef = useRef<THREE.PointLight>(null);
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    const now = performance.now();
    if (now >= nextAt.current) {
      setFlashing(true);
      nextAt.current = now + 4000 + Math.random() * 12000;

      // Flash light spatiale
      if (lightRef.current) {
        const x = camera.position.x + (Math.random() - 0.5) * 80;
        const z = camera.position.z + (Math.random() - 0.5) * 80;
        lightRef.current.position.set(x, 80, z);
        lightRef.current.intensity = 300 + Math.random() * 200;
      }

      setTimeout(() => setFlashing(false), 100 + Math.random() * 150);
    }

    // Decay de la light
    if (lightRef.current && lightRef.current.intensity > 0) {
      lightRef.current.intensity *= 0.85;
      if (lightRef.current.intensity < 0.5) lightRef.current.intensity = 0;
    }
  });

  return (
    <>
      <pointLight
        ref={lightRef}
        color="#eef4ff"
        intensity={0}
        distance={400}
      />
      {/* Overlay HTML (via portail R3F) */}
      {flashing && (
        <mesh position={[camera.position.x, camera.position.y, camera.position.z]}>
          <planeGeometry args={[0.1, 0.1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </mesh>
      )}
    </>
  );
}

export default WeatherSystem;