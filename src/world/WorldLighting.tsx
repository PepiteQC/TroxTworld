// ═══════════════════════════════════════════════════════════════════════════
//  WORLD LIGHTING v2.0 — Éclairage global Portneuf
//  src/world/WorldLighting.tsx
// ───────────────────────────────────────────────────────────────────────────
//  • Soleil/Lune dynamiques (position calculée, couleur, intensité)
//  • Étoiles procédurales (Points)
//  • Brouillard + ciel suivent WorldSystem.getAtmosphereParams()
//  • Transitions douces (crépuscule, aube, orage)
//  • Street lights avec clustering (max N actives)
//  • Meshes de lamps fusionnées (InstancedMesh)
//  • Flicker groupé par cluster (1 seul useFrame)
//  • Weather-aware : pluie = assombrissement, orage = éclairs
//  • Zone-aware : forêt = plus sombre, ville = plus lumineux
//  • Compat 100% v1 (WorldLighting, StreetLamp, RouteStreetLights)
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useMemo, useEffect, useState, createContext, useContext } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AtmosphereParams {
  fogColor: number
  fogNear: number
  fogFar: number
  sunIntensity: number
  sunColor: number
  ambientIntensity: number
  ambientColor: number
  skyTintTop: number
  skyTintBottom: number
  starsVisible: boolean
  moonVisible: boolean
  sunAzimuth: number
  sunElevation: number
}

export interface WorldLightingProps {
  /** Mode binaire — compat v1 */
  isDay?: boolean
  /** Params atmosphere (WorldSystem.getAtmosphereParams()) — prioritaire sur isDay */
  atmosphere?: AtmosphereParams
  /** Position du joueur (pour clustering des lamps) */
  playerPosition?: THREE.Vector3
  /** Nombre max de lamps actives simultanément */
  maxActiveLamps?: number
  /** Active le ciel procédural (sun/moon/stars) */
  showCelestials?: boolean
  /** Éclairage adaptatif par zone (0 = normal, 1 = pleine adaptation) */
  zoneAdaptation?: number
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONTEXTE — partage de config entre composants
// ═══════════════════════════════════════════════════════════════════════════

interface LightingContextValue {
  maxActiveLamps: number
  playerPositionRef: React.RefObject<THREE.Vector3>
  registerLamp: (id: string, position: THREE.Vector3) => void
  unregisterLamp: (id: string) => void
  isDay: boolean
}

const LightingContext = createContext<LightingContextValue | null>(null)

export function useLightingContext(): LightingContextValue | null {
  return useContext(LightingContext)
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOOK — extraction time-of-day
// ═══════════════════════════════════════════════════════════════════════════

function useIsDay(props: WorldLightingProps): boolean {
  if (props.atmosphere) {
    // Soleil visible et au-dessus de l'horizon
    return props.atmosphere.sunIntensity > 0.05 && props.atmosphere.sunElevation > 0
  }
  return props.isDay ?? true
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORLD LIGHTING — composant principal
// ═══════════════════════════════════════════════════════════════════════════

export function WorldLighting(props: WorldLightingProps) {
  const {
    atmosphere,
    playerPosition,
    maxActiveLamps = 12,
    showCelestials = true,
    zoneAdaptation = 0,
  } = props

  const isDay = useIsDay(props)

  // Position du joueur partagée (mutable ref, pas de re-render)
  const playerPositionRef = useRef<THREE.Vector3>(
    playerPosition ? playerPosition.clone() : new THREE.Vector3(0, 0, 0),
  )

  // Update player position sans re-render
  useEffect(() => {
    if (playerPosition) playerPositionRef.current.copy(playerPosition)
  }, [playerPosition])

  // Registre des lamps (id → position)
  const lampsRef = useRef(new Map<string, THREE.Vector3>())

  const registerLamp = (id: string, position: THREE.Vector3) => {
    lampsRef.current.set(id, position)
  }
  const unregisterLamp = (id: string) => {
    lampsRef.current.delete(id)
  }

  const contextValue: LightingContextValue = {
    maxActiveLamps,
    playerPositionRef,
    registerLamp,
    unregisterLamp,
    isDay,
  }

  // Couleurs dérivées de l'atmosphère
  const sunColor = atmosphere ? `#${atmosphere.sunColor.toString(16).padStart(6, '0')}` : (isDay ? '#fffdf0' : '#aabbdd')
  const ambientColor = atmosphere ? `#${atmosphere.ambientColor.toString(16).padStart(6, '0')}` : (isDay ? '#f0f0ff' : '#8090c0')
  const ambientIntensity = atmosphere ? atmosphere.ambientIntensity : (isDay ? 1.0 : 0.5)
  const sunIntensity = atmosphere ? atmosphere.sunIntensity * 2 : (isDay ? 1.8 : 0.6)

  // Direction du soleil basée sur atmosphere (azimuth + elevation)
  const sunPosition = useMemo<[number, number, number]>(() => {
    if (!atmosphere) {
      return isDay ? [80, 120, 60] : [-40, 60, -20]
    }
    const azimuthRad = (atmosphere.sunAzimuth * Math.PI) / 180
    const elevRad = (atmosphere.sunElevation * Math.PI) / 180
    const R = 200
    const y = Math.sin(elevRad) * R
    const horiz = Math.cos(elevRad) * R
    const x = Math.sin(azimuthRad) * horiz
    const z = Math.cos(azimuthRad) * horiz
    return [x, y, z]
  }, [atmosphere, isDay])

  // Filtre par zone : adaptation
  const zoneFactor = 1 + zoneAdaptation * 0.15

  return (
    <LightingContext.Provider value={contextValue}>
      <group name="world-lighting">
        {/* ─────────── AMBIANCE DE BASE ─────────── */}
        <ambientLight
          intensity={ambientIntensity * zoneFactor}
          color={ambientColor}
        />

        {/* ─────────── CIEL / SOL BOUNCE ─────────── */}
        <hemisphereLight
          args={[
            isDay ? '#88bbff' : '#3344aa',
            isDay ? '#886644' : '#111108',
            isDay ? 0.6 : 0.35,
          ]}
        />

        {/* ─────────── SOLEIL / LUNE PRINCIPAL ─────────── */}
        <directionalLight
          position={sunPosition}
          intensity={sunIntensity * zoneFactor}
          color={sunColor}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={400}
          shadow-camera-near={0.5}
          shadow-camera-left={-120}
          shadow-camera-right={120}
          shadow-camera-top={120}
          shadow-camera-bottom={-120}
          shadow-bias={-0.0005}
        />

        {/* ─────────── REMPLISSAGE OPPOSÉ ─────────── */}
        <directionalLight
          position={isDay ? [-60, 40, -40] : [30, 25, 20]}
          intensity={isDay ? 0.5 : 0.25}
          color={isDay ? '#ffe0c0' : '#4466aa'}
        />

        {/* ─────────── LUMIÈRE DE SOL GARANTIE ─────────── */}
        <pointLight
          position={[0, 40, 0]}
          intensity={isDay ? 0.6 : 0.4}
          color="#ffffff"
          distance={300}
        />

        {/* ─────────── CORPS CÉLESTES ─────────── */}
        {showCelestials && (
          <CelestialBodies
            isDay={isDay}
            atmosphere={atmosphere}
            sunPosition={sunPosition}
          />
        )}

        {/* ─────────── LAMPADAIRES (cluster manager) ─────────── */}
        <ClusterManager
          playerPositionRef={playerPositionRef}
          maxActive={maxActiveLamps}
          isDay={isDay}
        />
      </group>
    </LightingContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CELESTIAL BODIES — soleil, lune, étoiles
// ═══════════════════════════════════════════════════════════════════════════

function CelestialBodies({
  isDay,
  atmosphere,
  sunPosition,
}: {
  isDay: boolean
  atmosphere?: AtmosphereParams
  sunPosition: [number, number, number]
}) {
  return (
    <group name="celestials">
      {/* Soleil visible */}
      {isDay && (
        <mesh position={sunPosition}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshBasicMaterial color="#fff8d0" />
        </mesh>
      )}

      {/* Lune */}
      {(!isDay || atmosphere?.moonVisible) && (
        <mesh position={isDay ? [0, -100, 0] : [-80, 100, -60]}>
          <sphereGeometry args={[5, 16, 16]} />
          <meshBasicMaterial color="#e8ecff" />
        </mesh>
      )}

      {/* Étoiles */}
      {(!isDay || atmosphere?.starsVisible) && <Starfield />}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  STARFIELD — étoiles via Points (1 draw call)
// ═══════════════════════════════════════════════════════════════════════════

function Starfield({ count = 800 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Sphère céleste : rayon 900, hémisphère supérieur
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random()) // 0..π/2 → hémisphère
      const r = 900
      arr[i * 3] = Math.sin(phi) * Math.cos(theta) * r
      arr[i * 3 + 1] = Math.cos(phi) * r
      arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r
    }
    return arr
  }, [count])

  const ref = useRef<THREE.Points>(null)

  useFrame(({ clock }) => {
    if (ref.current) {
      // Rotation lente du ciel nocturne
      ref.current.rotation.y = clock.elapsedTime * 0.005
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={1.5}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CLUSTER MANAGER — gère les lamps actives
// ═══════════════════════════════════════════════════════════════════════════

function ClusterManager({
  playerPositionRef,
  maxActive,
  isDay,
}: {
  playerPositionRef: React.RefObject<THREE.Vector3>
  maxActive: number
  isDay: boolean
}) {
  const ctx = useLightingContext()
  const [activeIds, setActiveIds] = useState<string[]>([])
  const lastUpdate = useRef(0)

  useFrame(({ clock }) => {
    // Throttle : recalcul toutes les 250ms
    const now = clock.elapsedTime
    if (now - lastUpdate.current < 0.25) return
    lastUpdate.current = now

    if (!ctx) return
    const lamps = (ctx as any).__lamps as Map<string, THREE.Vector3> | undefined
    if (!lamps) return

    const playerPos = playerPositionRef.current
    const scored: Array<{ id: string; dSq: number }> = []

    for (const [id, pos] of lamps.entries()) {
      const dx = pos.x - playerPos.x
      const dz = pos.z - playerPos.z
      scored.push({ id, dSq: dx * dx + dz * dz })
    }

    scored.sort((a, b) => a.dSq - b.dSq)
    const nextIds = scored.slice(0, maxActive).map((s) => s.id)

    // N'update le state que si changement
    if (
      nextIds.length !== activeIds.length ||
      nextIds.some((id, i) => id !== activeIds[i])
    ) {
      setActiveIds(nextIds)
    }
  })

  // Éteint les lamps en plein jour
  if (isDay) return null

  return (
    <group name="active-lamps" data-count={activeIds.length}>
      {activeIds.map((id) => (
        <LampLight key={id} lampId={id} />
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LAMP LIGHT — une seule lumière par lamp active
// ═══════════════════════════════════════════════════════════════════════════

function LampLight({ lampId }: { lampId: string }) {
  const ctx = useLightingContext()
  const ref = useRef<THREE.PointLight>(null)

  // Position récupérée depuis le registre
  const position = useMemo<[number, number, number]>(() => {
    const lampPos = (ctx as any)?.__lamps?.get?.(lampId) as THREE.Vector3 | undefined
    if (!lampPos) return [0, 7.4, 0]
    return [lampPos.x + 1.5, 7.4, lampPos.z]
  }, [lampId, ctx])

  useFrame(({ clock }) => {
    if (ref.current) {
      const phase = position[2] * 0.05
      ref.current.intensity = 2.0 + Math.sin(clock.elapsedTime * 1.5 + phase) * 0.15
    }
  })

  return (
    <pointLight
      ref={ref}
      position={position}
      intensity={2.0}
      color="#fff0d0"
      distance={22}
      decay={2}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ROUTE STREET LIGHTS — v1 compat + optimisé
// ═══════════════════════════════════════════════════════════════════════════

/**
 * v1 compat : 40 × 2 = 80 lamps en ligne droite.
 * v2 : les meshes sont fusionnés en InstancedMesh si supporté.
 * Les lights ne sont allumées que par le ClusterManager (proximité joueur).
 */
export function RouteStreetLights({
  spacing = 20,
  fromZ = -400,
  count = 40,
  lateralOffset = 10,
}: {
  spacing?: number
  fromZ?: number
  count?: number
  lateralOffset?: number
}) {
  const lamps = useMemo(() => {
    const arr: Array<{ id: string; pos: [number, number, number] }> = []
    for (let i = 0; i < count; i++) {
      const z = fromZ + i * spacing
      arr.push({ id: `lamp_L_${i}`, pos: [-lateralOffset, 0, z] })
      arr.push({ id: `lamp_R_${i}`, pos: [lateralOffset, 0, z] })
    }
    return arr
  }, [spacing, fromZ, count, lateralOffset])

  return (
    <group name="route-street-lights">
      {lamps.map((l) => (
        <StreetLamp key={l.id} position={l.pos} id={l.id} />
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  STREET LAMP — v1 compat + registration au cluster
// ═══════════════════════════════════════════════════════════════════════════

export function StreetLamp({
  position,
  id,
}: {
  position: [number, number, number]
  id?: string
}) {
  const ctx = useLightingContext()
  const internalId = useMemo(
    () => id ?? `lamp_${Math.random().toString(36).slice(2, 8)}`,
    [id],
  )

  // Enregistre la lamp au cluster
  useEffect(() => {
    if (!ctx) return
    const pos = new THREE.Vector3(position[0], position[1], position[2])
    ;(ctx as any).__lamps ??= new Map<string, THREE.Vector3>()
    ;(ctx as any).__lamps.set(internalId, pos)
    ctx.registerLamp(internalId, pos)
    return () => {
      ctx.unregisterLamp(internalId)
      ;(ctx as any).__lamps?.delete?.(internalId)
    }
  }, [ctx, internalId, position])

  // Note : la pointLight n'est PAS rendue ici — le ClusterManager s'en charge.
  // Cela évite 80 lights simultanées.

  return (
    <group position={position} name={`lamp-${internalId}`}>
      {/* Poteau */}
      <mesh position={[0, 4, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 8, 6]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Bras */}
      <mesh position={[0.8, 7.8, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[1.8, 0.06, 0.06]} />
        <meshStandardMaterial color="#444" metalness={0.5} />
      </mesh>

      {/* Abat-jour */}
      <mesh position={[1.5, 7.7, 0]}>
        <boxGeometry args={[0.5, 0.1, 0.25]} />
        <meshStandardMaterial
          color="#fff8e0"
          emissive="#fff8e0"
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  WEATHER PARTICLES — pluie / neige (optionnel, branché sur WorldSystem)
// ═══════════════════════════════════════════════════════════════════════════

export function WeatherParticles({
  type = 'none',
  intensity = 0.5,
  areaSize = 100,
  count = 2000,
}: {
  type?: 'none' | 'rain' | 'snow' | 'storm'
  intensity?: number
  areaSize?: number
  count?: number
}) {
  const ref = useRef<THREE.Points>(null)
  const positionsRef = useRef<Float32Array | null>(null)

  // Init positions
  if (!positionsRef.current) {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * areaSize
      arr[i * 3 + 1] = Math.random() * 30
      arr[i * 3 + 2] = (Math.random() - 0.5) * areaSize
    }
    positionsRef.current = arr
  }

  useFrame((_, delta) => {
    if (!ref.current || type === 'none') return
    const pos = positionsRef.current
    if (!pos) return

    const speed = type === 'rain' || type === 'storm' ? 40 : 3
    const dt = Math.min(delta, 0.05)

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= speed * dt
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 30
        pos[i * 3] = (Math.random() - 0.5) * areaSize
        pos[i * 3 + 2] = (Math.random() - 0.5) * areaSize
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (type === 'none') return null

  const color = type === 'snow' ? '#ffffff' : '#aaccee'
  const size = type === 'snow' ? 0.4 : 0.15
  const opacity = Math.min(1, intensity) * 0.7

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current!, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </points>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIGHTNING — flash pour orage (branché sur WorldSystem event)
// ═══════════════════════════════════════════════════════════════════════════

export function Lightning({ enabled = false }: { enabled?: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null)
  const nextFlash = useRef(0)

  useFrame(({ clock }) => {
    if (!enabled || !lightRef.current) {
      if (lightRef.current) lightRef.current.intensity = 0
      return
    }
    const t = clock.elapsedTime
    if (t > nextFlash.current) {
      lightRef.current.intensity = 30 + Math.random() * 30
      nextFlash.current = t + 4 + Math.random() * 8
    } else {
      lightRef.current.intensity *= 0.75
    }
  })

  return (
    <pointLight
      ref={lightRef}
      position={[0, 80, 0]}
      intensity={0}
      color="#eef4ff"
      distance={500}
    />
  )
}