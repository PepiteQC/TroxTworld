'use client'

import { useRef, useMemo, memo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEtherWorldStore } from '@/lib/etherworld/store'

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const DOOR_WIDTH = 0.92
const DOOR_HEIGHT = 2.25
const DOOR_THICKNESS = 0.08
const FRAME_WIDTH = 0.1
const FRAME_DEPTH = 0.18

const CARD_ACCESS_COLORS: Record<string, string> = {
  guest: '#9ca3af',
  resident: '#22c55e',
  staff: '#3b82f6',
  vip: '#a855f7',
  admin: '#ef4444',
}

const CARD_ACCESS_LABELS: Record<string, string> = {
  guest: 'INVITÉ',
  resident: 'RÉSIDENT',
  staff: 'PERSONNEL',
  vip: 'VIP',
  admin: 'ADMIN',
}

// ════════════════════════════════════════════════════════════════════════════
// TEXTURE PROCÉDURAL — Porte bois/métal
// ════════════════════════════════════════════════════════════════════════════

function createCanvasTexture(
  w: number, h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function useDoorTexture() {
  return useMemo(() => createCanvasTexture(128, 256, (ctx, w, h) => {
    // Base sombre
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#1a1828')
    grad.addColorStop(0.3, '#1e1c2a')
    grad.addColorStop(0.7, '#181620')
    grad.addColorStop(1, '#14121c')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Grain brossé
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.012})`
      ctx.fillRect(0, y, w, 1)
    }

    // Panneaux encastrés
    ctx.strokeStyle = 'rgba(80,60,140,0.08)'
    ctx.lineWidth = 1
    ctx.strokeRect(12, 18, w - 24, h * 0.35)
    ctx.strokeRect(12, h * 0.45, w - 24, h * 0.35)

    // Vis de charnière (simulées)
    ctx.fillStyle = 'rgba(180,180,200,0.06)'
    ctx.beginPath(); ctx.arc(8, 40, 2, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(8, h / 2, 2, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(8, h - 40, 2, 0, Math.PI * 2); ctx.fill()
  }), [])
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL — SecurityDoor
// ════════════════════════════════════════════════════════════════════════════

export function SecurityDoor({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  doorId = 'main',
  accessLevel = 'resident',
  label = '',
}: {
  position?: [number, number, number]
  rotation?: [number, number, number]
  doorId?: string
  accessLevel?: string
  label?: string
}) {
  const { doors, requestDoorAccess } = useEtherWorldStore()
  const doorRef = useRef<THREE.Group>(null)
  const door = doors[doorId] || doors.main || { isOpen: false }

  // Animation de la porte
  useFrame(() => {
    if (doorRef.current) {
      const target = door.isOpen ? -Math.PI / 2 : 0
      const current = doorRef.current.rotation.y
      const diff = target - current
      if (Math.abs(diff) > 0.005) {
        doorRef.current.rotation.y += diff * 0.08
      } else {
        doorRef.current.rotation.y = target
      }
    }
  })

  const handleDoorClick = useCallback(() => {
    requestDoorAccess(doorId)
  }, [doorId, requestDoorAccess])

  const accessColor = CARD_ACCESS_COLORS[accessLevel] || CARD_ACCESS_COLORS.resident

  return (
    <group position={position} rotation={rotation}>
      {/* Cadre de porte */}
      <DoorFrame accessColor={accessColor} />

      {/* Panneau de porte (pivote sur charnière gauche) */}
      <group ref={doorRef} position={[-DOOR_WIDTH / 2, 0, 0]}>
        <DoorPanel
          isOpen={door.isOpen}
          onClick={handleDoorClick}
          accessColor={accessColor}
        />
      </group>

      {/* Lecteur de carte */}
      <CardReader
        position={[DOOR_WIDTH / 2 + 0.12, 1.15, 0.06]}
        isOpen={door.isOpen}
        accessLevel={accessLevel}
        accessColor={accessColor}
      />

      {/* Numéro / label au-dessus */}
      {label && (
        <DoorLabel
          position={[0, DOOR_HEIGHT + 0.15, 0.08]}
          text={label}
          accessColor={accessColor}
        />
      )}

      {/* Seuil de porte */}
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
        <boxGeometry args={[DOOR_WIDTH + FRAME_WIDTH * 2 + 0.04, 0.02, FRAME_DEPTH + 0.02]} />
        <meshStandardMaterial color="#888078" roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Lumière d'accueil au sol */}
      {door.isOpen && (
        <pointLight
          position={[0, 0.3, 0.5]}
          intensity={0.3}
          color="#fef3c7"
          distance={2}
          decay={2}
        />
      )}
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// CADRE DE PORTE — ENRICHI
// ════════════════════════════════════════════════════════════════════════════

const DoorFrame = memo(function DoorFrame({ accessColor }: { accessColor: string }) {
  return (
    <group>
      {/* ══ MONTANT GAUCHE ══ */}
      <mesh position={[-DOOR_WIDTH / 2 - FRAME_WIDTH / 2, DOOR_HEIGHT / 2, 0]} castShadow>
        <boxGeometry args={[FRAME_WIDTH, DOOR_HEIGHT + 0.1, FRAME_DEPTH]} />
        <meshStandardMaterial color="#111827" metalness={0.35} roughness={0.65} />
      </mesh>
      {/* Moulure intérieure gauche */}
      <mesh position={[-DOOR_WIDTH / 2 - 0.01, DOOR_HEIGHT / 2, 0.04]}>
        <boxGeometry args={[0.015, DOOR_HEIGHT, 0.02]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* ══ MONTANT DROIT ══ */}
      <mesh position={[DOOR_WIDTH / 2 + FRAME_WIDTH / 2, DOOR_HEIGHT / 2, 0]} castShadow>
        <boxGeometry args={[FRAME_WIDTH, DOOR_HEIGHT + 0.1, FRAME_DEPTH]} />
        <meshStandardMaterial color="#111827" metalness={0.35} roughness={0.65} />
      </mesh>
      <mesh position={[DOOR_WIDTH / 2 + 0.01, DOOR_HEIGHT / 2, 0.04]}>
        <boxGeometry args={[0.015, DOOR_HEIGHT, 0.02]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* ══ LINTEAU ══ */}
      <mesh position={[0, DOOR_HEIGHT + FRAME_WIDTH / 2, 0]} castShadow>
        <boxGeometry args={[DOOR_WIDTH + FRAME_WIDTH * 2 + 0.04, FRAME_WIDTH, FRAME_DEPTH]} />
        <meshStandardMaterial color="#111827" metalness={0.35} roughness={0.65} />
      </mesh>
      {/* Moulure sous linteau */}
      <mesh position={[0, DOOR_HEIGHT - 0.01, 0.04]}>
        <boxGeometry args={[DOOR_WIDTH + 0.02, 0.015, 0.02]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* ══ LISERÉ LUMINEUX INTÉRIEUR ══ */}
      {/* Gauche */}
      <mesh position={[-DOOR_WIDTH / 2 - 0.02, DOOR_HEIGHT / 2, FRAME_DEPTH / 2 - 0.01]}>
        <boxGeometry args={[0.005, DOOR_HEIGHT - 0.1, 0.005]} />
        <meshStandardMaterial color={accessColor} emissive={accessColor} emissiveIntensity={0.2} />
      </mesh>
      {/* Droit */}
      <mesh position={[DOOR_WIDTH / 2 + 0.02, DOOR_HEIGHT / 2, FRAME_DEPTH / 2 - 0.01]}>
        <boxGeometry args={[0.005, DOOR_HEIGHT - 0.1, 0.005]} />
        <meshStandardMaterial color={accessColor} emissive={accessColor} emissiveIntensity={0.2} />
      </mesh>
      {/* Haut */}
      <mesh position={[0, DOOR_HEIGHT + 0.01, FRAME_DEPTH / 2 - 0.01]}>
        <boxGeometry args={[DOOR_WIDTH + 0.05, 0.005, 0.005]} />
        <meshStandardMaterial color={accessColor} emissive={accessColor} emissiveIntensity={0.2} />
      </mesh>

      {/* ══ BUTÉE DE PORTE ══ */}
      <mesh position={[DOOR_WIDTH / 2 - 0.02, 0.02, 0.5]}>
        <cylinderGeometry args={[0.015, 0.02, 0.04, 8]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* ══ CHARNIÈRES ══ */}
      {[0.3, DOOR_HEIGHT / 2, DOOR_HEIGHT - 0.3].map((y, i) => (
        <group key={`hinge-${i}`} position={[-DOOR_WIDTH / 2 - FRAME_WIDTH / 2, y, DOOR_THICKNESS / 2]}>
          {/* Plaque charnière */}
          <mesh>
            <boxGeometry args={[0.04, 0.08, 0.015]} />
            <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.15} />
          </mesh>
          {/* Axe */}
          <mesh position={[0.025, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.09, 6]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  )
})

// ════════════════════════════════════════════════════════════════════════════
// PANNEAU DE PORTE — ENRICHI
// ════════════════════════════════════════════════════════════════════════════

const DoorPanel = memo(function DoorPanel({
  isOpen, onClick, accessColor,
}: {
  isOpen: boolean
  onClick: () => void
  accessColor: string
}) {
  const doorTex = useDoorTexture()
  const [hovered, setHovered] = useState(false)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      const target = hovered ? 0.3 : 0.05
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.1)
    }
  })

  return (
    <group>
      {/* ══ PANNEAU PRINCIPAL ══ */}
      <mesh
        position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0]}
        castShadow
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS]} />
        <meshStandardMaterial
          map={doorTex}
          color="#1a1a2e"
          metalness={0.4}
          roughness={0.55}
        />
      </mesh>

      {/* ══ PANNEAUX ENCASTRÉS ══ */}
      {/* Panneau haut */}
      <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT * 0.72, DOOR_THICKNESS / 2 + 0.003]}>
        <boxGeometry args={[DOOR_WIDTH * 0.7, DOOR_HEIGHT * 0.3, 0.008]} />
        <meshStandardMaterial color="#151320" roughness={0.65} metalness={0.15} />
      </mesh>
      {/* Panneau bas */}
      <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT * 0.28, DOOR_THICKNESS / 2 + 0.003]}>
        <boxGeometry args={[DOOR_WIDTH * 0.7, DOOR_HEIGHT * 0.3, 0.008]} />
        <meshStandardMaterial color="#151320" roughness={0.65} metalness={0.15} />
      </mesh>

      {/* ══ CADRE LUMINEUX SUBTIL ══ */}
      <mesh ref={glowRef} position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, DOOR_THICKNESS / 2 + 0.002]}>
        <boxGeometry args={[DOOR_WIDTH - 0.04, DOOR_HEIGHT - 0.04, 0.002]} />
        <meshStandardMaterial
          color="#0a0a14"
          emissive={accessColor}
          emissiveIntensity={0.05}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* ══ NÉON VERTICAL DÉCORATIF ══ */}
      <mesh position={[DOOR_WIDTH * 0.85, DOOR_HEIGHT / 2, DOOR_THICKNESS / 2 + 0.005]}>
        <boxGeometry args={[0.004, DOOR_HEIGHT * 0.8, 0.003]} />
        <meshStandardMaterial
          color={accessColor}
          emissive={accessColor}
          emissiveIntensity={hovered ? 0.6 : 0.25}
        />
      </mesh>

      {/* ══ POIGNÉE DE PORTE — LEVIER ══ */}
      <group position={[DOOR_WIDTH * 0.8, DOOR_HEIGHT * 0.47, DOOR_THICKNESS / 2 + 0.01]}>
        {/* Rosace */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.02, 8]} />
          <meshStandardMaterial color="#6b7280" metalness={0.88} roughness={0.12} />
        </mesh>
        {/* Tige */}
        <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.06, 6]} />
          <meshStandardMaterial color="#6b7280" metalness={0.88} roughness={0.12} />
        </mesh>
        {/* Bec du levier */}
        <mesh position={[0, -0.02, 0.065]}>
          <boxGeometry args={[0.015, 0.04, 0.02]} />
          <meshStandardMaterial color="#6b7280" metalness={0.88} roughness={0.12} />
        </mesh>
      </group>

      {/* Poignée côté intérieur */}
      <group position={[DOOR_WIDTH * 0.8, DOOR_HEIGHT * 0.47, -DOOR_THICKNESS / 2 - 0.01]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.02, 8]} />
          <meshStandardMaterial color="#6b7280" metalness={0.88} roughness={0.12} />
        </mesh>
        <mesh position={[0, 0, -0.035]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.06, 6]} />
          <meshStandardMaterial color="#6b7280" metalness={0.88} roughness={0.12} />
        </mesh>
        <mesh position={[0, -0.02, -0.065]}>
          <boxGeometry args={[0.015, 0.04, 0.02]} />
          <meshStandardMaterial color="#6b7280" metalness={0.88} roughness={0.12} />
        </mesh>
      </group>

      {/* ══ SERRURE ══ */}
      <group position={[DOOR_WIDTH * 0.8, DOOR_HEIGHT * 0.4, DOOR_THICKNESS / 2 + 0.005]}>
        {/* Plaque de serrure */}
        <mesh>
          <boxGeometry args={[0.03, 0.06, 0.008]} />
          <meshStandardMaterial color="#555" metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Trou de serrure */}
        <mesh position={[0, 0, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.005, 6]} />
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* ══ JUDAS ══ */}
      <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT * 0.75, DOOR_THICKNESS / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.015, 8]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT * 0.75, DOOR_THICKNESS / 2 + 0.013]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.013, 0.003, 6, 12]} />
        <meshStandardMaterial color="#8b6914" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ══ JOINT D'ÉTANCHÉITÉ ══ */}
      {/* Bas */}
      <mesh position={[DOOR_WIDTH / 2, 0.005, 0]}>
        <boxGeometry args={[DOOR_WIDTH + 0.01, 0.01, DOOR_THICKNESS + 0.02]} />
        <meshStandardMaterial color="#333" roughness={0.8} />
      </mesh>
    </group>
  )
})

// ════════════════════════════════════════════════════════════════════════════
// LECTEUR DE CARTE — ENRICHI
// ════════════════════════════════════════════════════════════════════════════

const CardReader = memo(function CardReader({
  position, isOpen, accessLevel, accessColor,
}: {
  position: [number, number, number]
  isOpen: boolean
  accessLevel: string
  accessColor: string
}) {
  const ledRef = useRef<THREE.Mesh>(null)
  const screenRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // LED pulsation
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial
      if (isOpen) {
        mat.color.set('#22c55e')
        mat.emissive.set('#22c55e')
        mat.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.2
      } else {
        mat.color.set('#ef4444')
        mat.emissive.set('#ef4444')
        mat.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15
      }
    }

    // Screen animation
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.15 + Math.sin(t * 1.5) * 0.05
    }
  })

  return (
    <group position={position}>
      {/* ══ BOÎTIER PRINCIPAL ══ */}
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.18, 0.035]} />
        <meshStandardMaterial color="#1a1a22" metalness={0.5} roughness={0.45} />
      </mesh>

      {/* Bord arrondi (simulé) */}
      <mesh position={[0, 0, 0.019]}>
        <boxGeometry args={[0.076, 0.176, 0.003]} />
        <meshStandardMaterial color="#222230" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* ══ ÉCRAN / ZONE D'INFO ══ */}
      <mesh ref={screenRef} position={[0, 0.04, 0.02]}>
        <boxGeometry args={[0.06, 0.04, 0.004]} />
        <meshStandardMaterial
          color="#0a1420"
          emissive={isOpen ? '#22c55e' : '#3b82f6'}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* ══ ZONE DE SCAN (NFC) ══ */}
      <mesh position={[0, -0.015, 0.02]}>
        <boxGeometry args={[0.06, 0.06, 0.005]} />
        <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.2} />
      </mesh>

      {/* Icône NFC (cercles concentriques simulés) */}
      {[0.012, 0.02, 0.028].map((r, i) => (
        <mesh key={i} position={[0, -0.015, 0.024]} rotation={[0, 0, Math.PI / 4]}>
          <ringGeometry args={[r - 0.002, r, 8]} />
          <meshStandardMaterial
            color={accessColor}
            emissive={accessColor}
            emissiveIntensity={0.15}
            transparent
            opacity={0.4 - i * 0.1}
          />
        </mesh>
      ))}

      {/* ══ FENTE POUR CARTE ══ */}
      <mesh position={[0, -0.055, 0.02]}>
        <boxGeometry args={[0.045, 0.004, 0.006]} />
        <meshStandardMaterial color="#050508" />
      </mesh>

      {/* ══ LED INDICATEUR ══ */}
      <mesh ref={ledRef} position={[0, 0.072, 0.02]}>
        <sphereGeometry args={[0.006, 8, 8]} />
        <meshStandardMaterial
          color={isOpen ? '#22c55e' : '#ef4444'}
          emissive={isOpen ? '#22c55e' : '#ef4444'}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Halo LED */}
      <pointLight
        position={[0, 0.072, 0.04]}
        intensity={isOpen ? 0.15 : 0.08}
        color={isOpen ? '#22c55e' : '#ef4444'}
        distance={0.5}
        decay={2}
      />

      {/* ══ INDICATEUR NIVEAU D'ACCÈS ══ */}
      <mesh position={[0, -0.078, 0.02]}>
        <boxGeometry args={[0.055, 0.012, 0.003]} />
        <meshStandardMaterial
          color={accessColor}
          emissive={accessColor}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* ══ BARRE DE NIVEAU (petite jauge) ══ */}
      <group position={[-0.025, -0.078, 0.023]}>
        {['guest', 'resident', 'staff', 'vip', 'admin'].map((level, i) => {
          const isActive = ['guest', 'resident', 'staff', 'vip', 'admin'].indexOf(accessLevel) >= i
          return (
            <mesh key={i} position={[i * 0.012, 0, 0]}>
              <boxGeometry args={[0.008, 0.006, 0.001]} />
              <meshStandardMaterial
                color={isActive ? accessColor : '#333'}
                emissive={isActive ? accessColor : '#000'}
                emissiveIntensity={isActive ? 0.3 : 0}
              />
            </mesh>
          )
        })}
      </group>

      {/* ══ VIS DE FIXATION ══ */}
      {[[-0.032, 0.08], [0.032, 0.08], [-0.032, -0.08], [0.032, -0.08]].map(([x, y], i) => (
        <mesh key={`screw-${i}`} position={[x, y, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.003, 6]} />
          <meshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* ══ MARQUE / LOGO ══ */}
      <mesh position={[0, 0.082, 0.02]}>
        <boxGeometry args={[0.03, 0.005, 0.002]} />
        <meshStandardMaterial color="#444" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  )
})

// ════════════════════════════════════════════════════════════════════════════
// LABEL / NUMÉRO AU-DESSUS DE LA PORTE
// ════════════════════════════════════════════════════════════════════════════

const DoorLabel = memo(function DoorLabel({
  position, text, accessColor,
}: {
  position: [number, number, number]
  text: string
  accessColor: string
}) {
  return (
    <group position={position}>
      {/* Fond plaque */}
      <mesh>
        <boxGeometry args={[0.35, 0.12, 0.012]} />
        <meshStandardMaterial color="#0f0e18" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Bordure lumineuse */}
      <mesh position={[0, 0, -0.002]}>
        <boxGeometry args={[0.37, 0.14, 0.006]} />
        <meshStandardMaterial
          color={accessColor}
          emissive={accessColor}
          emissiveIntensity={0.2}
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* Texte lumineux */}
      <mesh position={[0, 0, 0.008]}>
        <boxGeometry args={[0.3, 0.06, 0.002]} />
        <meshStandardMaterial
          color="#0a0818"
          emissive="#e8e0d0"
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  )
})

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS ADDITIONNELS — Composants réutilisables
// ════════════════════════════════════════════════════════════════════════════

// Porte simple sans lecteur de carte (pour intérieur)
export function SimpleDoor({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = '#1a1a2e',
  isOpen = false,
  onClick,
}: {
  position?: [number, number, number]
  rotation?: [number, number, number]
  color?: string
  isOpen?: boolean
  onClick?: () => void
}) {
  const doorRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (doorRef.current) {
      const target = isOpen ? -Math.PI / 2 : 0
      const diff = target - doorRef.current.rotation.y
      if (Math.abs(diff) > 0.005) doorRef.current.rotation.y += diff * 0.08
      else doorRef.current.rotation.y = target
    }
  })

  return (
    <group position={position} rotation={rotation}>
      {/* Cadre simple */}
      {[-DOOR_WIDTH / 2 - 0.04, DOOR_WIDTH / 2 + 0.04].map((x, i) => (
        <mesh key={i} position={[x, DOOR_HEIGHT / 2, 0]} castShadow>
          <boxGeometry args={[0.06, DOOR_HEIGHT + 0.08, 0.1]} />
          <meshStandardMaterial color="#222" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, DOOR_HEIGHT + 0.04, 0]} castShadow>
        <boxGeometry args={[DOOR_WIDTH + 0.14, 0.06, 0.1]} />
        <meshStandardMaterial color="#222" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Panneau */}
      <group ref={doorRef} position={[-DOOR_WIDTH / 2, 0, 0]}>
        <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0]} castShadow onClick={onClick}>
          <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.05]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
        </mesh>
        {/* Poignée */}
        <group position={[DOOR_WIDTH * 0.8, DOOR_HEIGHT * 0.47, 0.04]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.015, 8]} />
            <meshStandardMaterial color="#888" metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.04, 6]} />
            <meshStandardMaterial color="#888" metalness={0.85} roughness={0.15} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// Porte coulissante (pour ascenseur, garage, etc.)
export function SlidingSecurityDoor({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isOpen = false,
  width = 2,
  height = 2.5,
}: {
  position?: [number, number, number]
  rotation?: [number, number, number]
  isOpen?: boolean
  width?: number
  height?: number
}) {
  const leftRef = useRef<THREE.Mesh>(null)
  const rightRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    const target = isOpen ? width * 0.52 : 0
    if (leftRef.current) {
      const diff = -target - leftRef.current.position.x + (-width / 4)
      leftRef.current.position.x += diff * 0.06
    }
    if (rightRef.current) {
      const diff = target - rightRef.current.position.x + (width / 4)
      rightRef.current.position.x += diff * 0.06
    }
  })

  return (
    <group position={position} rotation={rotation}>
      {/* Cadre */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width + 0.2, height + 0.15, 0.08]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Rail supérieur */}
      <mesh position={[0, height + 0.02, 0.02]}>
        <boxGeometry args={[width + 0.3, 0.03, 0.04]} />
        <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Rail inférieur */}
      <mesh position={[0, 0.01, 0.02]}>
        <boxGeometry args={[width + 0.3, 0.02, 0.03]} />
        <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Panneau gauche */}
      <mesh ref={leftRef} position={[-width / 4, height / 2, 0.04]} castShadow>
        <boxGeometry args={[width / 2, height - 0.05, 0.04]} />
        <meshStandardMaterial color="#4b5563" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Panneau droit */}
      <mesh ref={rightRef} position={[width / 4, height / 2, 0.04]} castShadow>
        <boxGeometry args={[width / 2, height - 0.05, 0.04]} />
        <meshStandardMaterial color="#4b5563" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Ligne de jonction */}
      <mesh position={[0, height / 2, 0.065]}>
        <boxGeometry args={[0.015, height - 0.1, 0.005]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  )
}
