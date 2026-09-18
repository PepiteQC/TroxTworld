import React, { useRef, useMemo, useEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/game-store-unified'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminEffectData {
  id: string
  type: 'jail' | 'freeze' | 'tp' | 'spotlight' | 'storm' | 'explosion' | string
  position: [number, number, number]
  duration?: number
}

interface AdminEffectProps {
  effect: AdminEffectData
}

// ─── JAIL EFFECT ─────────────────────────────────────────────────────────────

const JailEffect = memo(function JailEffect({ effect }: AdminEffectProps) {
  const cageRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (cageRef.current) {
      cageRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <group position={effect.position}>
      {/* Cage externe en fil de fer */}
      <mesh ref={cageRef}>
        <boxGeometry args={[3, 4, 3]} />
        <meshBasicMaterial color="#ff0044" wireframe transparent opacity={0.4} />
      </mesh>

      {/* Barreaux de coin émissifs */}
      <group>
        {[
          [-1.4, -1.4],
          [-1.4, 1.4],
          [1.4, -1.4],
          [1.4, 1.4],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0, z]}>
            <boxGeometry args={[0.1, 4, 0.1]} />
            <meshStandardMaterial
              color="#ff3366"
              emissive="#ff3366"
              emissiveIntensity={3}
            />
          </mesh>
        ))}
      </group>

      {/* Lumière d'avertissement */}
      <pointLight
        color="#ff3366"
        intensity={5}
        distance={12}
        castShadow
      />
    </group>
  )
})

// ─── FREEZE EFFECT ───────────────────────────────────────────────────────────

const FreezeEffect = memo(function FreezeEffect({ effect }: AdminEffectProps) {
  const iceRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (iceRef.current) {
      iceRef.current.rotation.y += delta * 1.5
      iceRef.current.rotation.x += delta * 0.4
      // Effet d'oscillation flottante
      iceRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.15
    }
  })

  return (
    <group position={effect.position}>
      <mesh ref={iceRef}>
        <icosahedronGeometry args={[2, 3]} />
        <meshStandardMaterial
          color="#00ffff"
          transparent
          opacity={0.65}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      <pointLight
        color="#00ffff"
        intensity={8}
        distance={15}
        castShadow
      />
    </group>
  )
})

// ─── TP EFFECT (Téléportation) ───────────────────────────────────────────────

const TpEffect = memo(function TpEffect({ effect }: AdminEffectProps) {
  const count = 800
  const pointsRef = useRef<THREE.Points>(null)
  const posAttrRef = useRef<THREE.BufferAttribute>(null)

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 2.2
      p[i * 3 + 1] = Math.random() * 6
      p[i * 3 + 2] = (Math.random() - 0.5) * 2.2
    }
    return p
  }, [count])

  useFrame((_, delta) => {
    if (posAttrRef.current) {
      const array = posAttrRef.current.array as Float32Array
      for (let i = 0; i < count; i++) {
        array[i * 3 + 1] += delta * 4 // Monte le long de Y
        if (array[i * 3 + 1] > 6) {
          array[i * 3 + 1] = 0 // Réinitialise au bas du vortex
        }
      }
      posAttrRef.current.needsUpdate = true
    }
  })

  return (
    <group position={effect.position}>
      {/* Cylindre du vortex */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[1.1, 1.3, 6, 32, 1, true]} />
        <meshBasicMaterial
          color="#3399ff"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Particules ascendantes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            ref={posAttrRef}
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          transparent
          color="#00ffff"
          size={0.1}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <pointLight
        color="#3399ff"
        intensity={15}
        distance={18}
        castShadow
      />
    </group>
  )
})

// ─── SPOTLIGHT EFFECT ────────────────────────────────────────────────────────

const SpotlightEffect = memo(function SpotlightEffect({ effect }: AdminEffectProps) {
  const lightRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  }, [])

  useFrame(({ clock }) => {
    if (targetRef.current) {
      const angle = clock.elapsedTime * 1.5
      targetRef.current.position.x = effect.position[0] + Math.cos(angle) * 4
      targetRef.current.position.z = effect.position[2] + Math.sin(angle) * 4
    }
  })

  return (
    <>
      <group ref={targetRef} position={effect.position} />
      <group position={[effect.position[0], 18, effect.position[2]]}>
        <spotLight
          ref={lightRef}
          distance={35}
          angle={0.35}
          penumbra={0.6}
          color="#ffffaa"
          intensity={35}
          castShadow
        />
      </group>
    </>
  )
})

// ─── STORM EFFECT ────────────────────────────────────────────────────────────

const StormEffect = memo(function StormEffect() {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const posAttrRef = useRef<THREE.BufferAttribute>(null)
  const count = 2500

  const rainPositions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 120
      p[i * 3 + 1] = Math.random() * 40
      p[i * 3 + 2] = (Math.random() - 0.5) * 120
    }
    return p
  }, [count])

  useFrame(({ clock }, delta) => {
    // Animation des éclairs
    if (lightRef.current) {
      const t = clock.elapsedTime
      const isFlash = Math.sin(t * 10) > 0.96 && Math.random() > 0.65
      lightRef.current.intensity = isFlash ? 18 : 0.3
    }

    // Animation de la pluie tombante
    if (posAttrRef.current) {
      const array = posAttrRef.current.array as Float32Array
      for (let i = 0; i < count; i++) {
        array[i * 3 + 1] -= delta * 35 // Vitesse de chute
        if (array[i * 3 + 1] < 0) {
          array[i * 3 + 1] = 40 // Réinitialisation en hauteur
        }
      }
      posAttrRef.current.needsUpdate = true
    }
  })

  return (
    <group>
      <directionalLight
        ref={lightRef}
        position={[10, 40, 10]}
        color="#e0e8ff"
      />
      <points>
        <bufferGeometry>
          <bufferAttribute
            ref={posAttrRef}
            attach="attributes-position"
            args={[rainPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#99bbff"
          size={0.09}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  )
})

// ─── EXPLOSION EFFECT ────────────────────────────────────────────────────────

const ExplosionEffect = memo(function ExplosionEffect({ effect }: AdminEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    const progress = (clock.elapsedTime * 1.8) % 1 // Cycle d'explosion
    const scale = 0.2 + progress * 4.5
    const opacity = Math.max(0, 1 - progress)

    if (meshRef.current) {
      meshRef.current.scale.set(scale, scale, scale)
    }
    if (matRef.current) {
      matRef.current.opacity = opacity * 0.8
    }
    if (lightRef.current) {
      lightRef.current.intensity = opacity * 40
    }
  })

  return (
    <group position={effect.position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          ref={matRef}
          color="#ff5500"
          transparent
          opacity={0.8}
        />
      </mesh>
      <pointLight ref={lightRef} color="#ff6600" intensity={40} distance={25} castShadow />
    </group>
  )
})

// ─── MANAGER PRINCIPAL ───────────────────────────────────────────────────────

export function AdminEffects() {
  const effects = useGameStore((s) => s.adminEffects ?? [])
  const weather = useGameStore((s) => s.weather)

  const isStormActive = weather === 'rain' || effects.some((e) => e.type === 'storm')

  return (
    <group>
      {effects.map((effect) => {
        switch (effect.type) {
          case 'jail':
            return <JailEffect key={effect.id} effect={effect} />
          case 'freeze':
            return <FreezeEffect key={effect.id} effect={effect} />
          case 'tp':
            return <TpEffect key={effect.id} effect={effect} />
          case 'spotlight':
            return <SpotlightEffect key={effect.id} effect={effect} />
          case 'explosion':
            return <ExplosionEffect key={effect.id} effect={effect} />
          default:
            return null
        }
      })}

      {isStormActive && <StormEffect />}
    </group>
  )
}
export default AdminEffects
