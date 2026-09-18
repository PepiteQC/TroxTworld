export function CoucheTard({ position = [18, 0, -48] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main building */}
      <BuildingStructure />
      {/* Canopy over gas pumps */}
      <GasCanopy />
      {/* Gas pumps */}
      <GasPumps />
      {/* Signage */}
      <CoucheTardSignage />
      {/* Parking lot */}
      <ParkingLot />
      {/* Exterior lighting */}
      <ExteriorLighting />
    </group>
  )
}

function BuildingStructure() {
  return (
    <group position={[0, 0, 0]}>
      {/* Main brick building */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 6, 12]} />
        <meshStandardMaterial color="#8B3A3A" roughness={0.9} flatShading />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[12.5, 0.4, 12.5]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>

      {/* Front glass windows */}
      {[-3, 0, 3].map((x, i) => (
        <mesh key={i} position={[x, 3, 6.05]} castShadow>
          <boxGeometry args={[2.5, 4, 0.1]} />
          <meshStandardMaterial
            color="#1e3a5f"
            transparent
            opacity={0.5}
            metalness={0.8}
            roughness={0.1}
            emissive="#ffd580"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Glass door frame */}
      <mesh position={[0, 2, 6.1]} castShadow>
        <boxGeometry args={[2, 4, 0.05]} />
        <meshStandardMaterial
          color="#87CEEB"
          transparent
          opacity={0.4}
          metalness={0.9}
          roughness={0.05}
          emissive="#ffd580"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Door frame */}
      <mesh position={[0, 2, 6.12]}>
        <boxGeometry args={[2.2, 4.2, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.5} />
      </mesh>

      {/* Interior glow */}
      <pointLight position={[0, 4, 0]} intensity={3} color="#fef3c7" distance={15} />

      {/* Promotion posters on windows */}
      {[-3, 3].map((x, i) => (
        <mesh key={i} position={[x, 2.5, 6.08]}>
          <boxGeometry args={[1.2, 0.8, 0.01]} />
          <meshStandardMaterial
            color={i === 0 ? "#ED1C24" : "#FFD700"}
            emissive={i === 0 ? "#ED1C24" : "#FFD700"}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Side detail - brick pattern accent */}
      <mesh position={[6.05, 5, 0]}>
        <boxGeometry args={[0.1, 1, 12]} />
        <meshStandardMaterial color="#6B2A2A" roughness={0.95} />
      </mesh>
      <mesh position={[-6.05, 5, 0]}>
        <boxGeometry args={[0.1, 1, 12]} />
        <meshStandardMaterial color="#6B2A2A" roughness={0.95} />
      </mesh>
    </group>
  )
}

function GasCanopy() {
  return (
    <group position={[0, 0, 14]}>
      {/* Canopy roof */}
      <mesh position={[0, 5.5, 0]} castShadow>
        <boxGeometry args={[16, 0.4, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>

      {/* Red accent bands on canopy */}
      <mesh position={[0, 5.28, 5]}>
        <boxGeometry args={[16, 0.08, 0.3]} />
        <meshStandardMaterial color="#ED1C24" emissive="#ED1C24" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 5.28, -5]}>
        <boxGeometry args={[16, 0.08, 0.3]} />
        <meshStandardMaterial color="#ED1C24" emissive="#ED1C24" emissiveIntensity={0.5} />
      </mesh>

      {/* Canopy support pillars */}
      {[[-6, 0, -4], [-6, 0, 4], [6, 0, -4], [6, 0, 4]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 2.75, pos[1]]} castShadow>
          <boxGeometry args={[0.4, 5.5, 0.4]} />
          <meshStandardMaterial color="#d0d0d0" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}

      {/* Underside canopy lights */}
      <mesh position={[0, 5.25, 0]}>
        <boxGeometry args={[14, 0.05, 8]} />
        <meshStandardMaterial
          color="#fff8e0"
          emissive="#fff8e0"
          emissiveIntensity={2.5}
        />
      </mesh>

      {/* Canopy downlights */}
      <pointLight position={[0, 5, 0]} intensity={4} color="#fff8e0" distance={12} castShadow />
      <pointLight position={[-5, 5, 0]} intensity={2} color="#fff8e0" distance={10} />
      <pointLight position={[5, 5, 0]} intensity={2} color="#fff8e0" distance={10} />
    </group>
  )
}

function GasPumps() {
  return (
    <group position={[0, 0, 14]}>
      {/* 4 gas pumps */}
      {[-3.75, -1.25, 1.25, 3.75].map((x, i) => (
        <GasPump key={i} position={[x, 0, 0]} />
      ))}

      {/* Island/base for pumps */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[12, 0.2, 3]} />
        <meshStandardMaterial color="#d0d0d0" roughness={0.7} />
      </mesh>
    </group>
  )
}

function GasPump({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pump body */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.8, 2.2, 0.6]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Screen area */}
      <mesh position={[0, 1.6, 0.31]}>
        <boxGeometry args={[0.5, 0.4, 0.02]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Screen glow */}
      <mesh position={[0, 1.6, 0.32]}>
        <boxGeometry args={[0.45, 0.35, 0.01]} />
        <meshStandardMaterial
          color="#00ff00"
          emissive="#00ff00"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Nozzle holder */}
      <mesh position={[0.3, 1.0, 0.31]}>
        <boxGeometry args={[0.15, 0.4, 0.08]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Nozzle */}
      <mesh position={[0.35, 0.8, 0.35]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.03, 0.02, 0.3, 6]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Red/green price markers */}
      <mesh position={[0, 2.0, 0.31]}>
        <boxGeometry args={[0.6, 0.15, 0.02]} />
        <meshStandardMaterial
          color="#ED1C24"
          emissive="#ED1C24"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, 2.35, 0]} castShadow>
        <boxGeometry args={[0.85, 0.1, 0.65]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.3} />
      </mesh>
    </group>
  )
}

function CoucheTardSignage() {
  return (
    <group>
      {/* Main rooftop sign */}
      <group position={[0, 7, 6]}>
        {/* Sign background - red */}
        <mesh castShadow>
          <boxGeometry args={[8, 1.5, 0.3]} />
          <meshStandardMaterial
            color="#ED1C24"
            emissive="#ED1C24"
            emissiveIntensity={2}
            roughness={0.5}
          />
        </mesh>

        {/* "COUCHE-TARD" text block - white */}
        <mesh position={[0, 0, 0.16]}>
          <boxGeometry args={[7, 0.8, 0.05]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1.5}
          />
        </mesh>

        {/* Logo owl eyes */}
        <mesh position={[-3.5, 0, 0.16]}>
          <boxGeometry args={[0.6, 0.6, 0.05]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={2}
          />
        </mesh>

        {/* Sign lighting */}
        <pointLight position={[0, 0, 1]} intensity={4} color="#ED1C24" distance={20} />
      </group>

      {/* "OUVERT 24 HEURES" banner - green */}
      <mesh position={[0, 0.5, 6.1]}>
        <boxGeometry args={[4, 0.6, 0.1]} />
        <meshStandardMaterial
          color="#00AA00"
          emissive="#00AA00"
          emissiveIntensity={1}
        />
      </mesh>

      {/* 24h text */}
      <mesh position={[0, 0.5, 6.16]}>
        <boxGeometry args={[3.5, 0.35, 0.02]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Pole sign (tall) */}
      <group position={[14, 0, 14]}>
        {/* Pole */}
        <mesh position={[0, 5, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 10, 8]} />
          <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Sign panel */}
        <mesh position={[0, 10, 0]} castShadow>
          <boxGeometry args={[4, 3, 0.3]} />
          <meshStandardMaterial
            color="#ED1C24"
            emissive="#ED1C24"
            emissiveIntensity={1.5}
          />
        </mesh>

        {/* Logo on pole sign */}
        <mesh position={[0, 10, 0.16]}>
          <boxGeometry args={[3.2, 2, 0.05]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1}
          />
        </mesh>

        {/* Price display */}
        <mesh position={[0, 8, 0.16]}>
          <boxGeometry args={[3.5, 1.2, 0.05]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Price numbers */}
        <mesh position={[0, 8, 0.2]}>
          <boxGeometry args={[3, 0.8, 0.02]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={1}
          />
        </mesh>

        <pointLight position={[0, 10, 2]} intensity={3} color="#ED1C24" distance={25} />
      </group>
    </group>
  )
}

function ParkingLot() {
  return (
    <group position={[0, -0.05, -8]}>
      {/* Parking surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>

      {/* Parking lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-8 + i * 2.5, 0.01, 0]}
        >
          <planeGeometry args={[0.1, 5]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Curb stops */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-6.75 + i * 2.5, 0.1, 2]}>
          <boxGeometry args={[1.5, 0.15, 0.3]} />
          <meshStandardMaterial color="#ffcc00" />
        </mesh>
      ))}
    </group>
  )
}

function ExteriorLighting() {
  return (
    <group>
      {/* Lampposts around the property */}
      {[
        [-8, 0, -14],
        [8, 0, -14],
        [-8, 0, 22],
        [8, 0, 22],
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          {/* Pole */}
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 7, 6]} />
            <meshStandardMaterial color="#4a4a4a" metalness={0.5} />
          </mesh>

          {/* Lamp head */}
          <mesh position={[0, 7, 0]}>
            <boxGeometry args={[0.5, 0.2, 0.5]} />
            <meshStandardMaterial
              color="#fff8e0"
              emissive="#fff8e0"
              emissiveIntensity={1.5}
            />
          </mesh>

          <pointLight position={[0, 6.8, 0]} intensity={3.5} color="#fff8e0" distance={20} castShadow />
        </group>
      ))}
    </group>
  )
}
