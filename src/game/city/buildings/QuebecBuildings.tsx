/* ══════════════════════════════════════════════
   QUÉBEC BUILDINGS — Church, Farm, Houses, Barn
   ══════════════════════════════════════════════ */

/* ── ÉGLISE QUÉBÉCOISE ── */
export function QuebecChurch({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const W = 12, D = 28, H = 8
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Nef */}
      <mesh castShadow receiveShadow position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.95} />
      </mesh>
      {/* Toit */}
      <mesh castShadow position={[0, H + 0.2, 0]}>
        <boxGeometry args={[W + 0.5, 0.4, D + 0.5]} />
        <meshStandardMaterial color="#6a6860" roughness={0.75} />
      </mesh>
      {/* Transept */}
      <mesh castShadow position={[0, H * 0.55, -D * 0.2]}>
        <boxGeometry args={[W * 1.6, H * 0.85, D * 0.25]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.95} />
      </mesh>
      {/* Clocher base */}
      <mesh castShadow position={[0, H + 3, -D / 2 + 4]}>
        <boxGeometry args={[4.5, 6, 4.5]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.95} />
      </mesh>
      {/* Clocher toit */}
      <mesh castShadow position={[0, H + 10, -D / 2 + 4]}>
        <coneGeometry args={[2.8, 6, 4]} />
        <meshStandardMaterial color="#b0b8c0" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Croix */}
      <mesh castShadow position={[0, H + 13.5, -D / 2 + 4]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, H + 14, -D / 2 + 4]}>
        <boxGeometry args={[0.7, 0.1, 0.1]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Porte */}
      <mesh position={[0, H * 0.38, D / 2 + 0.05]}>
        <boxGeometry args={[2.8, H * 0.7, 0.15]} />
        <meshStandardMaterial color="#4a2c1a" roughness={0.7} />
      </mesh>
      {/* Vitraux */}
      {Array.from({ length: 5 }).map((_, i) => {
        const colors = ['#aa4422', '#2244aa', '#22aa44', '#aaaa22', '#aa22aa']
        return (
          <group key={i}>
            <mesh position={[-W / 2 - 0.05, H * 0.55, -D / 2 + 4 + i * 4]} rotation={[0, -Math.PI / 2, 0]}>
              <boxGeometry args={[0.9, H * 0.5, 0.08]} />
              <meshStandardMaterial color={colors[i]} emissive={colors[i]} emissiveIntensity={0.25} transparent opacity={0.7} />
            </mesh>
            <mesh position={[W / 2 + 0.05, H * 0.55, -D / 2 + 4 + i * 4]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[0.9, H * 0.5, 0.08]} />
              <meshStandardMaterial color={colors[(i + 2) % 5]} emissive={colors[(i + 2) % 5]} emissiveIntensity={0.25} transparent opacity={0.7} />
            </mesh>
          </group>
        )
      })}
      {/* Escaliers */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} receiveShadow position={[0, -(i * 0.2), D / 2 + 0.15 + i * 0.35]}>
          <boxGeometry args={[W * 0.6, 0.2, 0.35]} />
          <meshStandardMaterial color="#c8c0b8" roughness={0.95} />
        </mesh>
      ))}
      {/* Cimetière */}
      <Cemetery position={[W + 6, 0, 0]} />
    </group>
  )
}

/* ── CIMETIÈRE ── */
function Cemetery({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh receiveShadow position={[0, 0.01, 0]}>
        <boxGeometry args={[16, 0.04, 16]} />
        <meshStandardMaterial color="#2a4a25" roughness={1} />
      </mesh>
      {/* Clôture */}
      {[[-8, 0], [8, 0], [0, -8], [0, 8]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x || 0, 0.5, z || 0]}>
          <boxGeometry args={[x !== 0 ? 0.08 : 16, 1, z !== 0 ? 0.08 : 16]} />
          <meshStandardMaterial color="#7a7570" roughness={0.95} />
        </mesh>
      ))}
      {/* Pierres tombales */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} castShadow position={[((i % 4) - 1.5) * 3, 0.4, (Math.floor(i / 4) - 0.5) * 4]}>
          <boxGeometry args={[0.6, 0.8, 0.12]} />
          <meshStandardMaterial color="#8a8580" roughness={0.95} />
        </mesh>
      ))}
      {/* Croix centrale */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[0.12, 3, 0.12]} />
        <meshStandardMaterial color="#c8c0b8" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 2.2, 0]}>
        <boxGeometry args={[1, 0.12, 0.12]} />
        <meshStandardMaterial color="#c8c0b8" roughness={0.9} />
      </mesh>
    </group>
  )
}

/* ── MAISON QUÉBÉCOISE ── */
export function QuebecHouse({ position, rotation = 0, color = '#f5f0e8', roofColor = '#6a6860' }: {
  position: [number, number, number]; rotation?: number; color?: string; roofColor?: string
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 1.6, 0]}>
        <boxGeometry args={[8, 3.2, 9]} />
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 3.5, 0]}>
        <boxGeometry args={[8.3, 0.3, 9.3]} />
        <meshStandardMaterial color={roofColor} roughness={0.75} flatShading />
      </mesh>
      {/* Cheminée */}
      <mesh castShadow position={[2, 4.2, 0]}>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
        <meshStandardMaterial color="#8b3a3a" roughness={0.85} />
      </mesh>
      {/* Porte */}
      <mesh position={[0, 1, 4.55]}>
        <boxGeometry args={[1.2, 2, 0.1]} />
        <meshStandardMaterial color="#4a2c1a" roughness={0.8} />
      </mesh>
      {/* Fenêtres */}
      {[-2.5, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 2, 4.55]}>
          <boxGeometry args={[1, 1, 0.08]} />
          <meshStandardMaterial color="#88aaff" transparent opacity={0.55} metalness={0.5} roughness={0.1} />
        </mesh>
      ))}
      {/* Galerie */}
      <mesh receiveShadow position={[0, 0.08, 5.3]}>
        <boxGeometry args={[7, 0.1, 1.5]} />
        <meshStandardMaterial color="#7c5a3a" roughness={0.85} />
      </mesh>
    </group>
  )
}

/* ── GRANGE ── */
export function QuebecBarn({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 3, 0]}>
        <boxGeometry args={[14, 6, 20]} />
        <meshStandardMaterial color="#8b3a3a" roughness={0.85} flatShading />
      </mesh>
      <mesh castShadow position={[0, 6.8, 0]}>
        <boxGeometry args={[14.5, 2, 20.5]} />
        <meshStandardMaterial color="#6b2a2a" roughness={0.8} flatShading />
      </mesh>
      {/* Porte grange */}
      <mesh position={[0, 2, 10.1]}>
        <boxGeometry args={[4, 4, 0.15]} />
        <meshStandardMaterial color="#5a1f1f" roughness={0.85} />
      </mesh>
      {/* X decoratif */}
      <mesh position={[0, 2, 10.15]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[4.5, 0.12, 0.05]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[0, 2, 10.15]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[4.5, 0.12, 0.05]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
    </group>
  )
}

/* ── SILO ── */
export function GrainSilo({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 8, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 16, 12]} />
        <meshStandardMaterial color="#a8a29e" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 16.5, 0]}>
        <sphereGeometry args={[2.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#71717a" metalness={0.7} />
      </mesh>
    </group>
  )
}

/* ── FERME COMPLÈTE ── */
export function FarmComplex({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <QuebecHouse position={[0, 0, 0]} color="#f5deb3" roofColor="#5a1f1f" />
      <QuebecBarn position={[25, 0, -5]} rotation={0.2} />
      <GrainSilo position={[40, 0, -3]} />
      {/* Clôture */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} castShadow position={[-5 + i * 5, 0.5, 15]}>
          <boxGeometry args={[0.08, 1, 0.08]} />
          <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[20, 0.7, 15]}>
        <boxGeometry args={[50, 0.06, 0.06]} />
        <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
      </mesh>
      <mesh position={[20, 0.35, 15]}>
        <boxGeometry args={[50, 0.06, 0.06]} />
        <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
      </mesh>
    </group>
  )
}

/* ── VILLAGE ROW OF HOUSES ── */
export function HouseRow({ baseX, baseZ, count = 5, side = 1 }: {
  baseX: number; baseZ: number; count?: number; side?: number
}) {
  const colors = ['#f5f0e8', '#f5deb3', '#e0d8cc', '#d8e0d0', '#e8e0f0']
  const roofs = ['#6a6860', '#5a1f1f', '#4a4a4a', '#7a7570']
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <QuebecHouse
          key={i}
          position={[baseX + side * 18, 0, baseZ + i * 16 - (count * 8)]}
          rotation={side > 0 ? -Math.PI / 2 : Math.PI / 2}
          color={colors[i % colors.length]}
          roofColor={roofs[i % roofs.length]}
        />
      ))}
    </group>
  )
}
