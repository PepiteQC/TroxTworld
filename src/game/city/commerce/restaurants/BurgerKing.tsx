export function BurgerKing({ position = [50, 0, -100] as [number, number, number] }) {
  return (
    <group position={position}>
      <Restaurant />
      <BKSignage />
      <DriveThru />
      <Playground />
      <BKParkingLot />
      <BKLighting />
    </group>
  )
}

function Restaurant() {
  return (
    <group>
      {/* Main building */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 6, 14]} />
        <meshStandardMaterial color="#f7e8b5" roughness={0.8} flatShading />
      </mesh>

      {/* Roof - angled */}
      <mesh position={[0, 6.3, 0]} castShadow>
        <boxGeometry args={[17, 0.6, 15]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>

      {/* Red accent band around building */}
      <mesh position={[0, 5.5, 0]}>
        <boxGeometry args={[16.1, 0.5, 14.1]} />
        <meshStandardMaterial color="#d62300" roughness={0.7} />
      </mesh>

      {/* Front panoramic windows */}
      {[-5, -2, 1, 4].map((x, i) => (
        <mesh key={i} position={[x, 3, 7.05]} castShadow>
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

      {/* Main entrance - glass */}
      <mesh position={[-1, 2.2, 7.1]}>
        <boxGeometry args={[2.5, 4.2, 0.05]} />
        <meshStandardMaterial
          color="#87CEEB"
          transparent
          opacity={0.35}
          metalness={0.9}
          roughness={0.05}
          emissive="#ffd580"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Door frame */}
      <mesh position={[-1, 2.2, 7.12]}>
        <boxGeometry args={[2.7, 4.4, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.5} />
      </mesh>

      {/* Side windows */}
      {[-4, -1, 2, 5].map((z, i) => (
        <mesh key={i} position={[8.05, 3, z]}>
          <boxGeometry args={[0.1, 3, 2]} />
          <meshStandardMaterial
            color="#1e3a5f"
            transparent
            opacity={0.5}
            emissive="#ffd580"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Interior lighting */}
      <pointLight position={[0, 4, 0]} intensity={3} color="#fef3c7" distance={18} />
      <pointLight position={[-4, 4, 3]} intensity={1.5} color="#fef3c7" distance={10} />
      <pointLight position={[4, 4, 3]} intensity={1.5} color="#fef3c7" distance={10} />

      {/* Counter visible inside */}
      <mesh position={[0, 1.5, -2]} castShadow>
        <boxGeometry args={[10, 1.2, 1]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
      </mesh>

      {/* Menu boards behind counter */}
      {[-3, 0, 3].map((x, i) => (
        <mesh key={i} position={[x, 4, -5]} castShadow>
          <boxGeometry args={[2.5, 2, 0.1]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

function BKSignage() {
  return (
    <group>
      {/* Main BK sign on pole */}
      <group position={[12, 0, 12]}>
        {/* Pole */}
        <mesh position={[0, 3.5, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.3, 7, 8]} />
          <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Sign base */}
        <mesh position={[0, 8, 0]} castShadow>
          <boxGeometry args={[4, 3.5, 0.4]} />
          <meshStandardMaterial color="#d62300" roughness={0.6} />
        </mesh>

        {/* BK Logo - circular */}
        <mesh position={[0, 8.5, 0.21]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.3, 1.3, 0.1, 16]} />
          <meshStandardMaterial
            color="#f7e8b5"
            emissive="#f7e8b5"
            emissiveIntensity={1.5}
          />
        </mesh>

        {/* Center bun pieces */}
        <mesh position={[0, 8.9, 0.27]}>
          <boxGeometry args={[1.8, 0.3, 0.05]} />
          <meshStandardMaterial
            color="#d62300"
            emissive="#d62300"
            emissiveIntensity={1}
          />
        </mesh>
        <mesh position={[0, 8.1, 0.27]}>
          <boxGeometry args={[1.8, 0.3, 0.05]} />
          <meshStandardMaterial
            color="#d62300"
            emissive="#d62300"
            emissiveIntensity={1}
          />
        </mesh>

        {/* "BURGER KING" text block */}
        <mesh position={[0, 7, 0.21]}>
          <boxGeometry args={[3.5, 0.6, 0.05]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1.2}
          />
        </mesh>

        <pointLight position={[0, 8, 2]} intensity={5} color="#d62300" distance={30} />
        <pointLight position={[0, 8, -2]} intensity={3} color="#f7e8b5" distance={20} />
      </group>

      {/* Building facade sign */}
      <mesh position={[0, 5.8, 7.2]} castShadow>
        <boxGeometry args={[6, 1, 0.2]} />
        <meshStandardMaterial color="#d62300" roughness={0.5} />
      </mesh>
      <mesh position={[0, 5.8, 7.31]}>
        <boxGeometry args={[5.5, 0.6, 0.02]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={1}
        />
      </mesh>

      {/* Facade spotlights */}
      <pointLight position={[0, 5.8, 8]} intensity={2} color="#ffffff" distance={10} />
    </group>
  )
}

function DriveThru() {
  return (
    <group position={[-10, 0, -3]}>
      {/* Drive-thru lane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[4, 20]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>

      {/* Lane arrows */}
      {[-5, 0, 5].map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
          <planeGeometry args={[0.8, 1.5]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Curb */}
      <mesh position={[2, 0.15, 0]}>
        <boxGeometry args={[0.3, 0.3, 20]} />
        <meshStandardMaterial color="#888888" />
      </mesh>

      {/* Menu board */}
      <group position={[2.5, 0, -4]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[0.2, 3, 0.2]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[2.5, 2.5, 0.2]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Menu screen */}
        <mesh position={[0, 2.5, 0.11]}>
          <boxGeometry args={[2.2, 2.2, 0.02]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.8}
          />
        </mesh>
        {/* Menu items representation */}
        {[0.6, 0, -0.6].map((y, i) => (
          <mesh key={i} position={[0, 2.5 + y, 0.13]}>
            <boxGeometry args={[1.8, 0.4, 0.01]} />
            <meshStandardMaterial
              color={i === 0 ? "#d62300" : i === 1 ? "#f7e8b5" : "#00AA00"}
              emissive={i === 0 ? "#d62300" : i === 1 ? "#f7e8b5" : "#00AA00"}
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}
        <pointLight position={[0, 2.5, 1]} intensity={1} color="#ffffff" distance={5} />
      </group>

      {/* Speaker post */}
      <group position={[2.5, 0, -2]}>
        <mesh position={[0, 1, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2, 6]} />
          <meshStandardMaterial color="#333333" metalness={0.5} />
        </mesh>
        {/* Speaker head */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[0.3, 0.4, 0.15]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Speaker grill */}
        <mesh position={[0, 1.5, 0.08]}>
          <boxGeometry args={[0.25, 0.3, 0.01]} />
          <meshStandardMaterial color="#555555" metalness={0.7} />
        </mesh>
      </group>

      {/* Service window canopy */}
      <group position={[-8, 4, 3]}>
        <mesh castShadow>
          <boxGeometry args={[3, 0.2, 2]} />
          <meshStandardMaterial color="#d62300" />
        </mesh>
        <pointLight position={[0, -0.3, 0]} intensity={1.5} color="#fff8e0" distance={5} />
      </group>

      {/* Drive-thru directional signs */}
      {[-7, -3, 1].map((z, i) => (
        <group key={i} position={[-2.5, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.6, 0.4, 0.05]} />
            <meshStandardMaterial
              color="#d62300"
              emissive="#d62300"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Playground() {
  return (
    <group position={[12, 0, -4]}>
      {/* Safety surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[4, 16]} />
        <meshStandardMaterial color="#d4a574" roughness={1} />
      </mesh>

      {/* Safety fence */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2
        const x = Math.cos(angle) * 4
        const z = Math.sin(angle) * 4
        return (
          <mesh key={i} position={[x, 0.5, z]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1, 4]} />
            <meshStandardMaterial color="#888888" metalness={0.5} />
          </mesh>
        )
      })}

      {/* Fence rail */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle1 = (i / 16) * Math.PI * 2
        const angle2 = ((i + 1) / 16) * Math.PI * 2
        const x = (Math.cos(angle1) * 4 + Math.cos(angle2) * 4) / 2
        const z = (Math.sin(angle1) * 4 + Math.sin(angle2) * 4) / 2
        return (
          <mesh key={i} position={[x, 0.8, z]} rotation={[0, -angle1 - Math.PI / 16, 0]}>
            <boxGeometry args={[1.6, 0.06, 0.06]} />
            <meshStandardMaterial color="#888888" metalness={0.5} />
          </mesh>
        )
      })}

      {/* Slide structure */}
      <group position={[-1, 0, 0]}>
        {/* Slide platform */}
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[2, 0.2, 2]} />
          <meshStandardMaterial color="#d62300" flatShading />
        </mesh>

        {/* Slide ladder */}
        <mesh position={[0, 1, -1]} castShadow>
          <boxGeometry args={[0.8, 2, 0.1]} />
          <meshStandardMaterial color="#FFD700" metalness={0.3} />
        </mesh>
        {/* Ladder rungs */}
        {[0.5, 1, 1.5].map((y, i) => (
          <mesh key={i} position={[0, y, -1]}>
            <boxGeometry args={[0.8, 0.08, 0.15]} />
            <meshStandardMaterial color="#FFD700" metalness={0.3} />
          </mesh>
        ))}

        {/* Slide chute */}
        <mesh position={[0, 1, 1.5]} rotation={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.8, 0.08, 3]} />
          <meshStandardMaterial color="#FF6600" metalness={0.4} roughness={0.3} />
        </mesh>

        {/* Slide sides */}
        {[-0.45, 0.45].map((x, i) => (
          <mesh key={i} position={[x, 1.15, 1.5]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.05, 0.3, 3]} />
            <meshStandardMaterial color="#d62300" />
          </mesh>
        ))}
      </group>

      {/* Swings */}
      <group position={[2, 0, 0]}>
        {/* Swing frame */}
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[3, 0.1, 0.1]} />
          <meshStandardMaterial color="#333333" metalness={0.6} />
        </mesh>

        {/* A-frame supports */}
        {[-1.4, 1.4].map((x, i) => (
          <group key={i}>
            <mesh position={[x, 1.25, 0.3]} rotation={[0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.1, 2.5, 0.1]} />
              <meshStandardMaterial color="#333333" metalness={0.6} />
            </mesh>
            <mesh position={[x, 1.25, -0.3]} rotation={[-0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.1, 2.5, 0.1]} />
              <meshStandardMaterial color="#333333" metalness={0.6} />
            </mesh>
          </group>
        ))}

        {/* Swing seats */}
        {[-0.5, 0.5].map((x, i) => (
          <group key={i}>
            {/* Chains */}
            {[-0.15, 0.15].map((dx, j) => (
              <mesh key={j} position={[x + dx, 1.5, 0]}>
                <boxGeometry args={[0.02, 2, 0.02]} />
                <meshStandardMaterial color="#aaaaaa" metalness={0.8} />
              </mesh>
            ))}
            {/* Seat */}
            <mesh position={[x, 0.5, 0]}>
              <boxGeometry args={[0.4, 0.05, 0.2]} />
              <meshStandardMaterial color="#d62300" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function BKParkingLot() {
  return (
    <group position={[0, -0.05, 16]}>
      {/* Parking surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>

      {/* Parking lines */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-17.5 + i * 2.5, 0.01, -3]}
        >
          <planeGeometry args={[0.1, 5]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Second row */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-17.5 + i * 2.5, 0.01, 5]}
        >
          <planeGeometry args={[0.1, 5]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Handicap spots (blue) */}
      {[0, 2.5].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-17.5 + x, 0.02, -3]}>
          <planeGeometry args={[2.4, 4.9]} />
          <meshStandardMaterial color="#003399" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Handicap symbols */}
      {[0, 2.5].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-16.25 + x, 0.03, -3]}>
          <circleGeometry args={[0.4, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Landscaped islands */}
      {[-10, 0, 10].map((x, i) => (
        <group key={i} position={[x, 0, 1]}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[2, 0.2, 4]} />
            <meshStandardMaterial color="#3a5a2a" roughness={1} />
          </mesh>
          {/* Small tree in island */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 2, 6]} />
            <meshStandardMaterial color="#3a2a1a" flatShading />
          </mesh>
          <mesh position={[0, 3, 0]} castShadow>
            <sphereGeometry args={[1, 6, 5]} />
            <meshStandardMaterial color="#2a5a1a" flatShading />
          </mesh>
        </group>
      ))}

      {/* Drive lanes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1]}>
        <planeGeometry args={[40, 3]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
    </group>
  )
}

function BKLighting() {
  return (
    <group>
      {/* Parking lot lampposts */}
      {[
        [-15, 0, 16],
        [15, 0, 16],
        [-15, 0, 30],
        [15, 0, 30],
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh position={[0, 4, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 8, 6]} />
            <meshStandardMaterial color="#555555" metalness={0.5} />
          </mesh>

          {/* Modern lamp head */}
          <mesh position={[0, 8, 0]}>
            <boxGeometry args={[0.8, 0.15, 0.8]} />
            <meshStandardMaterial
              color="#fff8e0"
              emissive="#fff8e0"
              emissiveIntensity={1.5}
            />
          </mesh>

          <pointLight position={[0, 7.5, 0]} intensity={3.5} color="#fff8e0" distance={25} castShadow />
        </group>
      ))}

      {/* Building facade spots */}
      {[-4, 4].map((x, i) => (
        <pointLight key={i} position={[x, 6, 8]} intensity={2} color="#d62300" distance={10} />
      ))}
    </group>
  )
}
