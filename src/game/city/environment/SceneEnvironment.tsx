import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Sky, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld, getSkyParams } from '../../store';
import { makeAsphaltTexture, makeGrassTexture } from '../../systems/TextureCache';

export function Road() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => makeAsphaltTexture(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { weather } = useWorld.getState();
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (weather === 'snow') {
      material.color.set('#d4e4f0');
      material.roughness = 1;
      material.metalness = 0;
    } else if (weather === 'rain' || weather === 'storm') {
      material.color.set('#2e3840');
      material.roughness = 0.18;
      material.metalness = 0.28;
    } else {
      material.color.set('#3a3a44');
      material.roughness = 0.88;
      material.metalness = 0;
    }
  });

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[200, 13]} />
      <meshStandardMaterial map={texture} color="#3a3a44" roughness={0.88} />
    </mesh>
  );
}

export function Terrain() {
  const leftRef = useRef<THREE.Mesh>(null);
  const rightRef = useRef<THREE.Mesh>(null);
  const grassTexture = useMemo(() => makeGrassTexture(), []);

  useFrame(() => {
    const snowColor = useWorld.getState().weather === 'snow' ? '#d4e4f0' : '#4a6a30';
    if (leftRef.current) (leftRef.current.material as THREE.MeshStandardMaterial).color.set(snowColor);
    if (rightRef.current) (rightRef.current.material as THREE.MeshStandardMaterial).color.set(snowColor);
  });

  return (
    <>
      <mesh ref={leftRef} rotation-x={-Math.PI / 2} position={[0, -0.05, -16]} receiveShadow>
        <planeGeometry args={[200, 50]} />
        <meshStandardMaterial map={grassTexture} color="#4a6a30" roughness={1} />
      </mesh>
      <mesh ref={rightRef} rotation-x={-Math.PI / 2} position={[0, -0.05, 22]} receiveShadow>
        <planeGeometry args={[200, 50]} />
        <meshStandardMaterial map={grassTexture} color="#4a6a30" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial map={grassTexture} color="#334d1f" roughness={1} />
      </mesh>
    </>
  );
}

export function SceneLighting() {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const playerLightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const { hour, weather, playerPos } = useWorld.getState();
    const params = getSkyParams(hour, weather);
    const sunAngle = ((hour - 6) / 14) * Math.PI;
    const elevation = Math.sin(sunAngle);
    const weatherFactor =
      weather === 'storm' ? 0.2 : weather === 'fog' ? 0.3 : weather === 'rain' ? 0.55 : 1.1;
    const isNight = params.isNight;

    if (ambientRef.current) {
      ambientRef.current.color.set(params.ambientColor);
      ambientRef.current.intensity = params.ambientIntensity;
    }
    if (sunRef.current) {
      sunRef.current.position.set(
        Math.cos((hour / 24) * Math.PI * 2) * 100,
        Math.max(2, elevation * 80),
        -40,
      );
      sunRef.current.intensity = Math.max(0, elevation * weatherFactor);
    }
    if (playerLightRef.current) {
      playerLightRef.current.position.set(playerPos[0] + 3, 4.5, playerPos[2] + 2);
      playerLightRef.current.intensity = isNight || weather === 'fog' || weather === 'storm' ? 1.4 : 0;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} color="#c0d0e8" intensity={0.7} />
      <directionalLight
        ref={sunRef}
        position={[80, 50, -30]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={250}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <pointLight
        ref={playerLightRef}
        color="#ffd090"
        intensity={0}
        distance={22}
        decay={2}
      />
    </>
  );
}

export function DynamicSky() {
  const { hour, weather } = useWorld();
  const params = getSkyParams(hour, weather);

  if (params.isNight) {
    return (
      <>
        <Stars radius={150} depth={80} count={2500} factor={5} saturation={0.1} fade />
        <mesh>
          <sphereGeometry args={[500, 16, 16]} />
          <meshBasicMaterial color="#05060f" side={THREE.BackSide} fog={false} />
        </mesh>
      </>
    );
  }

  if (weather === 'fog' || weather === 'storm') {
    return (
      <mesh>
        <sphereGeometry args={[500, 16, 16]} />
        <meshBasicMaterial
          color={weather === 'storm' ? '#1a2028' : '#b0b8c0'}
          side={THREE.BackSide}
          fog={false}
        />
      </mesh>
    );
  }

  return (
    <Sky
      distance={4500}
      sunPosition={[
        Math.cos((hour / 24) * Math.PI * 2) * 80,
        Math.max(0.01, Math.sin(((hour - 6) / 14) * Math.PI) * 80),
        -30,
      ]}
      inclination={params.inclination}
      azimuth={params.azimuth}
      turbidity={weather === 'rain' ? 15 : 3}
      rayleigh={weather === 'rain' ? 4 : 1}
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
    />
  );
}