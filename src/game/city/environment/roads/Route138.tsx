import { useMemo } from 'react'

export function Route138() {
  return (
    <group>
      <Highway />
      <QuebecSigns />
      <BorealForest />
      <Bridge position={[0, 0, -150]} />
      <Guardrails />
      <KilometerMarkers />
      <MedianStrip />
    </group>
  )
}

function Highway() {
  return (
    <group>
      {/* Main asphalt - 2 lanes each direction */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 800]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>

      {/* White continuous line (left shoulder) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-8.8, 0.01, 0]}>
        <planeGeometry args={[0.2, 800]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>

      {/* White continuous line (right shoulder) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8.8, 0.01, 0]}>
        <planeGeometry args={[0.2, 800]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>

      {/* Dashed lines between lanes */}
      {Array.from({ length: 100 }).map((_, i) => (
        <mesh
          key={`dash-left-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-3, 0.01, -350 + i * 8]}
        >
          <planeGeometry args={[0.15, 4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {Array.from({ length: 100 }).map((_, i) => (
        <mesh
          key={`dash-right-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[3, 0.01, -350 + i * 8]}
        >
          <planeGeometry args={[0.15, 4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Double yellow center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.15, 0.01, 0]}>
        <planeGeometry args={[0.15, 800]} />
        <meshStandardMaterial color="#ffcc00" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.01, 0]}>
        <planeGeometry args={[0.15, 800]} />
        <meshStandardMaterial color="#ffcc00" />
      </mesh>

      {/* Shoulders */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, -0.02, 0]} receiveShadow>
        <planeGeometry args={[6, 800]} />
        <meshStandardMaterial color="#4a4a3a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, -0.02, 0]} receiveShadow>
        <planeGeometry args={[6, 800]} />
        <meshStandardMaterial color="#4a4a3a" roughness={1} />
      </mesh>
    </group>
  )
}

function QuebecSigns() {
  return (
    <group>
      <QuebecHighwaySign
        position={[-12, 0, -80]}
        flipped={false}
      />
      <QuebecHighwaySign
        position={[12, 0, -200]}
        flipped={true}
      />
      <ExitSign
        position={[-12, 0, -300]}
      />
    </group>
  )
}

function QuebecHighwaySign({
  position,
  flipped = false
}: {
  position: [number, number, number]
  flipped?: boolean
}) {
  return (
    <group position={position} rotation={[0, flipped ? Math.PI : 0, 0]}>
      {/* Post */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[0.15, 5, 0.15]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Green Quebec sign */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[3, 1.2, 0.1]} />
        <meshStandardMaterial color="#00563f" roughness={0.6} />
      </mesh>

      {/* White reflective frame */}
      <mesh position={[0, 4.5, 0.06]}>
        <boxGeometry args={[2.9, 1.1, 0.02]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Destination text area */}
      <mesh position={[0, 4.7, 0.08]}>
        <boxGeometry args={[2.5, 0.4, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Distance */}
      <mesh position={[0.8, 4.3, 0.08]}>
        <boxGeometry args={[0.8, 0.35, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Route number shield */}
      <mesh position={[-0.8, 4.3, 0.08]}>
        <boxGeometry args={[0.6, 0.4, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.8, 4.3, 0.09]}>
        <boxGeometry args={[0.5, 0.3, 0.01]} />
        <meshStandardMaterial color="#00563f" />
      </mesh>
    </group>
  )
}

function ExitSign({
  position
}: {
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[0.15, 5, 0.15]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* Blue exit sign */}
      <mesh position={[0, 4.2, 0]} castShadow>
        <boxGeometry args={[2.5, 0.8, 0.1]} />
        <meshStandardMaterial color="#003d7a" />
      </mesh>

      {/* "SORTIE" text */}
      <mesh position={[-0.6, 4.2, 0.06]}>
        <boxGeometry args={[0.8, 0.3, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Exit number */}
      <mesh position={[0.5, 4.2, 0.06]}>
        <boxGeometry args={[0.6, 0.4, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

function BorealForest() {
  const trees = useMemo(() => {
    const positions: [number, number, number][] = []

    for (let i = 0; i < 150; i++) {
      // Left side
      positions.push([
        -18 - Math.random() * 40,
        0,
        -350 + Math.random() * 700
      ])

      // Right side
      positions.push([
        18 + Math.random() * 40,
        0,
        -350 + Math.random() * 700
      ])
    }

    return positions
  }, [])

  return (
    <group>
      {trees.map((pos, i) => (
        <SpruceTree key={i} position={pos} seed={i} />
      ))}
    </group>
  )
}

function SpruceTree({ position, seed }: { position: [number, number, number]; seed: number }) {
  const scale = useMemo(() => 0.7 + (Math.sin(seed * 137.5) * 0.5 + 0.5) * 0.6, [seed])

  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 6, 6]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.95} flatShading />
      </mesh>

      {/* Spruce branches */}
      {[0, 1.5, 3, 4.2, 5.2].map((y, i) => (
        <mesh key={i} position={[0, y + 3, 0]} castShadow>
          <coneGeometry args={[2.2 - i * 0.35, 2 - i * 0.25, 7]} />
          <meshStandardMaterial color="#1a3a1a" roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Bridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bridge structure */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[22, 0.8, 80]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.8} />
      </mesh>

      {/* Side beams */}
      <mesh position={[-11, 0.6, 0]} castShadow>
        <boxGeometry args={[0.5, 1.2, 80]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[11, 0.6, 0]} castShadow>
        <boxGeometry args={[0.5, 1.2, 80]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* Guardrails */}
      <mesh position={[-11, 1.5, 0]}>
        <boxGeometry args={[0.1, 1, 80]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[11, 1.5, 0]}>
        <boxGeometry args={[0.1, 1, 80]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Pillars */}
      {[-25, 0, 25].map((z, i) => (
        <group key={i}>
          <mesh position={[-10, -8, z]} castShadow>
            <boxGeometry args={[2, 16, 2]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[10, -8, z]} castShadow>
            <boxGeometry args={[2, 16, 2]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </group>
      ))}

      {/* River below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -16, 0]}>
        <planeGeometry args={[100, 120]} />
        <meshStandardMaterial
          color="#1a3a5a"
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
    </group>
  )
}

function Guardrails() {
  const segments = useMemo(() => {
    const arr: number[] = []
    for (let i = -350; i < 350; i += 8) {
      arr.push(i)
    }
    return arr
  }, [])

  return (
    <group>
      {/* Left guardrails */}
      {segments.map((z, i) => (
        <group key={`left-${i}`}>
          <mesh position={[-9.5, 0.5, z]} castShadow>
            <boxGeometry args={[0.1, 0.6, 7.5]} />
            <meshStandardMaterial
              color="#c0c0c0"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[-9.5, 0.3, z]}>
            <cylinderGeometry args={[0.06, 0.06, 0.6, 6]} />
            <meshStandardMaterial color="#5a5a5a" />
          </mesh>
        </group>
      ))}

      {/* Right guardrails */}
      {segments.map((z, i) => (
        <group key={`right-${i}`}>
          <mesh position={[9.5, 0.5, z]} castShadow>
            <boxGeometry args={[0.1, 0.6, 7.5]} />
            <meshStandardMaterial
              color="#c0c0c0"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[9.5, 0.3, z]}>
            <cylinderGeometry args={[0.06, 0.06, 0.6, 6]} />
            <meshStandardMaterial color="#5a5a5a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function KilometerMarkers() {
  return (
    <group>
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i} position={[-10, 0, -300 + i * 70]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>

          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.05]} />
            <meshStandardMaterial
              color="#00563f"
              emissive="#00563f"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function MedianStrip() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[2, 800]} />
        <meshStandardMaterial color="#3a4a2a" roughness={1} />
      </mesh>

      {/* Center reflectors */}
      {Array.from({ length: 80 }).map((_, i) => (
        <mesh
          key={i}
          position={[0, 0.05, -350 + i * 10]}
          castShadow
        >
          <boxGeometry args={[0.15, 0.1, 0.3]} />
          <meshStandardMaterial
            color="#ffaa00"
            emissive="#ffaa00"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}
