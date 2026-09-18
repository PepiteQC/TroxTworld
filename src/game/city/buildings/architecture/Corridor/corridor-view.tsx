// src/components/etherworld/corridor-view.tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { HotelBuilding } from '@/components/buildings/HotelBuilding'
import { HotelLobby } from '@/components/buildings/HotelLobby'

export function CorridorView() {
  // Dimensions de l'hôtel pour bien positionner le lobby
  const ROOMS_PER_FLOOR = 8
  const ROOM_WIDTH = 4.0
  const ROOM_DEPTH = 5.0
  const CORRIDOR_WIDTH = 3.0
  const totalLength = ROOMS_PER_FLOOR * ROOM_WIDTH         // 32m
  const buildingWidth = CORRIDOR_WIDTH + 2 * ROOM_DEPTH    // 13m

  // L'hôtel est centré en X=0, Z=0
  // Le lobby est placé devant la façade sud de l'hôtel
  const lobbyZ = totalLength / 2 + 6  // 6m devant l'hôtel

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f' }}>
      <Canvas
        shadows
        camera={{
          position: [0, 4, lobbyZ + 5],
          fov: 60,
          near: 0.1,
          far: 300,
        }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>

          {/* ── ENVIRONNEMENT ── */}
          <Environment preset="night" />
          <fog attach="fog" args={['#0a0a0f', 20, 80]} />

          {/* ── LUMIÈRES ── */}
          <ambientLight intensity={0.15} color="#1a1a2e" />
          <directionalLight
            position={[10, 20, 10]}
            intensity={0.4}
            color="#6080b0"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={0.5}
            shadow-camera-far={100}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />

          {/* ── SOL ── */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#0d0d14" roughness={1.0} />
          </mesh>

          {/* Trottoir devant l'hôtel */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, totalLength / 2 + 3]} receiveShadow>
            <planeGeometry args={[buildingWidth + 6, 10]} />
            <meshStandardMaterial color="#4a5568" roughness={0.8} />
          </mesh>

          {/* Route devant l'hôtel */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, totalLength / 2 + 10]} receiveShadow>
            <planeGeometry args={[buildingWidth + 20, 8]} />
            <meshStandardMaterial color="#1e2024" roughness={0.9} />
          </mesh>

          {/* ── L'HÔTEL ── */}
          <HotelBuilding
            position={[0, 0, 0]}
            floors={2}
            roomsPerFloor={ROOMS_PER_FLOOR}
          />

          {/* ── LOBBY (réception) ── */}
          <HotelLobby
            position={[0, 0, lobbyZ]}
            availableRooms={[101, 102, 103, 104, 105, 106, 107, 108, 201, 202, 203, 204, 205, 206, 207, 208]}
          />

          {/* ── LAMPADAIRES DEVANT L'HÔTEL ── */}
          {[-5, 0, 5].map((x, i) => (
            <group key={i} position={[x, 0, totalLength / 2 + 2]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.08, 0.1, 5, 8]} />
                <meshStandardMaterial color="#222" roughness={0.8} />
              </mesh>
              <mesh position={[0, 2.6, 0]}>
                <boxGeometry args={[0.2, 0.08, 1.2]} />
                <meshStandardMaterial color="#111" roughness={0.8} />
              </mesh>
              <pointLight
                position={[0, 2.4, 0.6]}
                intensity={1.5}
                color="#ffeedd"
                distance={12}
                decay={2}
              />
            </group>
          ))}

          {/* ── CONTRÔLES CAMÉRA ── */}
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={3}
            maxDistance={80}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 2, totalLength / 4]}
          />

        </Suspense>
      </Canvas>

      {/* ── UI OVERLAY ── */}
      <div style={{
        position: 'fixed',
        top: 20,
        left: 20,
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '13px',
        background: 'rgba(0,0,0,0.75)',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(251,191,36,0.4)',
        pointerEvents: 'none',
      }}>
        <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: 6 }}>
          🏨 HÔTEL ETHERWORLD
        </div>
        <div style={{ color: '#9ca3af', fontSize: 11 }}>
          2 étages • 8 chambres/étage • 16 chambres total
        </div>
        <div style={{ color: '#6b7280', fontSize: 10, marginTop: 4 }}>
          Clique sur le comptoir pour check-in
        </div>
        <div style={{ color: '#6b7280', fontSize: 10 }}>
          Clique sur une porte pour entrer (carte requise)
        </div>
      </div>
    </div>
  )
}