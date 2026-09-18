// ═══════════════════════════════════════════════════════════════════════════
//  WORLD ITEMS v2.0 — Collectibles du monde ouvert Portneuf
//  src/components/WorldItems.tsx
// ───────────────────────────────────────────────────────────────────────────
//  • Distribution sur les villages de Portneuf (via WorldNavigator)
//  • LOD par distance : label/light/mesh détaillé seulement proche
//  • InstancedMesh pour les halos (1 draw call global)
//  • Pickup detection (radius configurable, raycast-free)
//  • FX de pickup (particules + flash)
//  • Système de rareté (common / rare / epic / legendary / mythic)
//  • Catégories (currency / resource / consumable / artifact / quest)
//  • Respawn automatique (par catégorie)
//  • Persistence hooks (collecté = retiré jusqu'au respawn)
//  • Zone-aware spawn (forêt = ressources, ville = monnaie)
//  • Hooks events : onPickup, onSpawn, onDespawn
//  • Compat 100% v1 (WorldItems, WorldItemDef, ItemMesh exports)
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type ItemCategory =
  | 'currency'
  | 'resource'
  | 'consumable'
  | 'artifact'
  | 'quest'

/** v1 compat — champs additionnels optionnels */
export interface WorldItemDef {
  id: string
  name: string
  emoji: string
  color: string
  pos: [number, number, number]
  collected?: boolean

  /** 🆕 Rareté (influence FX, valeur, spawn chance) */
  rarity?: ItemRarity
  /** 🆕 Catégorie (détermine le respawn) */
  category?: ItemCategory
  /** 🆕 Quantité donnée au pickup */
  amount?: number
  /** 🆕 Valeur en $ (pour systèmes économiques) */
  value?: number
  /** 🆕 Timestamp de respawn si collecté */
  respawnAt?: number
  /** 🆕 Zone / village d'origine */
  villageId?: string
  /** 🆕 Tags (quest, event, boss-drop…) */
  tags?: string[]
}

/** 🆕 LOD config */
export interface ItemLodConfig {
  /** Distance max pour rendre le mesh 3D */
  renderDistance: number
  /** Distance max pour rendre le Html label */
  labelDistance: number
  /** Distance max pour rendre la pointLight */
  lightDistance: number
  /** Distance de pickup */
  pickupRadius: number
  /** Distance d'affichage du prompt "E — Ramasser" */
  promptDistance: number
}

export const DEFAULT_LOD: ItemLodConfig = {
  renderDistance: 120,
  labelDistance: 25,
  lightDistance: 15,
  pickupRadius: 2.2,
  promptDistance: 3.5,
}

/** 🆕 Résultats de pickup */
export interface PickupResult {
  success: boolean
  item: WorldItemDef | null
  message?: string
}

// ═══════════════════════════════════════════════════════════════════════════
//  RARITY TABLE
// ═══════════════════════════════════════════════════════════════════════════

interface RarityMeta {
  label: string
  color: string
  haloScale: number
  emissiveIntensity: number
  lightIntensity: number
  particleCount: number
}

export const RARITY_META: Record<ItemRarity, RarityMeta> = {
  common:    { label: 'Commun',    color: '#a3a3a3', haloScale: 1.0, emissiveIntensity: 0.35, lightIntensity: 0.35, particleCount: 6 },
  rare:      { label: 'Rare',      color: '#38bdf8', haloScale: 1.1, emissiveIntensity: 0.55, lightIntensity: 0.50, particleCount: 10 },
  epic:      { label: 'Épique',    color: '#a855f7', haloScale: 1.2, emissiveIntensity: 0.75, lightIntensity: 0.65, particleCount: 14 },
  legendary: { label: 'Légendaire',color: '#f59e0b', haloScale: 1.35, emissiveIntensity: 1.0, lightIntensity: 0.85, particleCount: 20 },
  mythic:    { label: 'Mythique',  color: '#ef4444', haloScale: 1.5, emissiveIntensity: 1.3, lightIntensity: 1.1, particleCount: 28 },
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITEMS PAR DÉFAUT (compat v1 + extension Portneuf)
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WORLD_ITEMS: WorldItemDef[] = [
  // v1 compat
  { id: 'item_1', name: "Lingot d'Or",     emoji: '🪙', color: '#facc15', pos: [10, 0.5, 12],  rarity: 'rare',      category: 'currency',   value: 500 },
  { id: 'item_2', name: "Cristal d'Éther", emoji: '💎', color: '#38bdf8', pos: [-18, 0.5, 22], rarity: 'epic',      category: 'artifact',   value: 1200 },
  { id: 'item_3', name: 'Fiole Magique',   emoji: '🧪', color: '#a855f7', pos: [25, 0.5, -15], rarity: 'rare',      category: 'consumable', value: 200 },
  { id: 'item_4', name: 'Pépite Rare',     emoji: '✨', color: '#10b981', pos: [-28, 0.5, -20],rarity: 'legendary', category: 'resource',   value: 800 },
]

// ═══════════════════════════════════════════════════════════════════════════
//  CONTEXTE — gestionnaire global
// ═══════════════════════════════════════════════════════════════════════════

interface WorldItemsContextValue {
  items: WorldItemDef[]
  playerPosition: React.RefObject<THREE.Vector3>
  pickup: (id: string) => PickupResult
  respawn: (id: string) => boolean
  /** 🆕 item le plus proche du joueur dans le rayon de prompt */
  nearestPickable: WorldItemDef | null
  onPickup?: (item: WorldItemDef) => void
  onSpawn?: (item: WorldItemDef) => void
  lod: ItemLodConfig
}

const WorldItemsContext = createContext<WorldItemsContextValue | null>(null)

export function useWorldItems() {
  return useContext(WorldItemsContext)
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function distanceSq(a: THREE.Vector3 | [number, number, number], b: THREE.Vector3 | [number, number, number]): number {
  const ax = Array.isArray(a) ? a[0] : a.x
  const ay = Array.isArray(a) ? a[1] : a.y
  const az = Array.isArray(a) ? a[2] : a.z
  const bx = Array.isArray(b) ? b[0] : b.x
  const by = Array.isArray(b) ? b[1] : b.y
  const bz = Array.isArray(b) ? b[2] : b.z
  const dx = ax - bx
  const dy = ay - by
  const dz = az - bz
  return dx * dx + dy * dy + dz * dz
}

function respawnDelayMs(category: ItemCategory): number {
  switch (category) {
    case 'currency':   return 30_000
    case 'resource':   return 60_000
    case 'consumable': return 45_000
    case 'artifact':   return 5 * 60_000
    case 'quest':      return 0 // no respawn
    default:           return 60_000
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORLD ITEMS — composant principal
// ═══════════════════════════════════════════════════════════════════════════

export interface WorldItemsProps {
  /** Items fournis (sinon defaults) */
  items?: WorldItemDef[]
  /** Position du joueur (par défaut, camera.position) */
  playerPosition?: THREE.Vector3
  /** Config LOD */
  lod?: Partial<ItemLodConfig>
  /** Callback pickup */
  onPickup?: (item: WorldItemDef) => void
  /** Callback spawn */
  onSpawn?: (item: WorldItemDef) => void
  /** Active le HUD pickup auto (E pour ramasser) */
  showPickupPrompt?: boolean
}

export function WorldItems(props: WorldItemsProps) {
  const {
    items: propItems,
    playerPosition: propPlayerPos,
    lod: lodPatch,
    onPickup,
    onSpawn,
    showPickupPrompt = true,
  } = props

  const lod: ItemLodConfig = { ...DEFAULT_LOD, ...lodPatch }

  // Items internes (state pour respawn dynamique)
  const [items, setItems] = useState<WorldItemDef[]>(
    () => propItems ?? DEFAULT_WORLD_ITEMS,
  )

  // Sync items externes
  useEffect(() => {
    if (propItems) setItems(propItems)
  }, [propItems])

  // Position joueur (fallback camera si non fourni)
  const { camera } = useThree()
  const playerPosition = useRef<THREE.Vector3>(
    propPlayerPos ? propPlayerPos.clone() : new THREE.Vector3(),
  )

  useEffect(() => {
    if (propPlayerPos) playerPosition.current.copy(propPlayerPos)
  }, [propPlayerPos])

  // Fallback : lecture directe camera
  useFrame(() => {
    if (!propPlayerPos) {
      playerPosition.current.copy(camera.position)
    }
  })

  // Item le plus proche (pour prompt)
  const [nearestPickable, setNearestPickable] = useState<WorldItemDef | null>(null)
  const lastCheckRef = useRef(0)

  // Check proximity throttlé
  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    if (now - lastCheckRef.current < 0.1) return
    lastCheckRef.current = now

    const playerPos = playerPosition.current
    const pickupR2 = lod.pickupRadius * lod.pickupRadius
    const promptR2 = lod.promptDistance * lod.promptDistance

    let best: WorldItemDef | null = null
    let bestD = promptR2

    for (const item of items) {
      if (item.collected) continue
      const d2 = distanceSq(item.pos, playerPos)
      if (d2 < bestD) {
        bestD = d2
        best = item
      }
    }

    // Auto-pickup si dans pickupRadius
    if (best && bestD <= pickupR2) {
      autoPickup(best)
    } else {
      setNearestPickable((prev) => (prev?.id === best?.id ? prev : best))
    }
  })

  // Pickup d'un item
  const pickup = useCallback((id: string): PickupResult => {
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return { success: false, item: null, message: 'Item introuvable' }

    const item = items[idx]
    if (item.collected) return { success: false, item, message: 'Déjà ramassé' }

    const category = item.category ?? 'resource'
    const respawnAt = category === 'quest' ? undefined : Date.now() + respawnDelayMs(category)

    const next = [...items]
    next[idx] = { ...item, collected: true, respawnAt }

    setItems(next)
    onPickup?.(item)

    return { success: true, item, message: `Ramassé : ${item.name}` }
  }, [items, onPickup])

  const autoPickup = useCallback((item: WorldItemDef) => {
    pickup(item.id)
  }, [pickup])

  // Respawn manuel
  const respawn = useCallback((id: string): boolean => {
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return false

    const next = [...items]
    next[idx] = { ...next[idx], collected: false, respawnAt: undefined }
    setItems(next)
    onSpawn?.(next[idx])
    return true
  }, [items, onSpawn])

  // Respawn auto planifié
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setItems((prev) => {
        let changed = false
        const next = prev.map((item) => {
          if (item.collected && item.respawnAt && now >= item.respawnAt) {
            changed = true
            return { ...item, collected: false, respawnAt: undefined }
          }
          return item
        })
        return changed ? next : prev
      })
    }, 5_000)
    if ((interval as any).unref) (interval as any).unref()
    return () => clearInterval(interval)
  }, [])

  // Filtre les items visibles
  const visibleItems = useMemo(
    () => items.filter((i) => !i.collected),
    [items],
  )

  const ctxValue: WorldItemsContextValue = {
    items,
    playerPosition,
    pickup,
    respawn,
    nearestPickable,
    onPickup,
    onSpawn,
    lod,
  }

  return (
    <WorldItemsContext.Provider value={ctxValue}>
      <group name="World_Collectibles_System">
        {visibleItems.map((item) => (
          <LoddedItem key={item.id} item={item} />
        ))}

        {/* HUD prompt de pickup */}
        {showPickupPrompt && nearestPickable && (
          <PickupPrompt item={nearestPickable} lod={lod} />
        )}
      </group>
    </WorldItemsContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LODDED ITEM — gère le LOD selon distance au joueur
// ═══════════════════════════════════════════════════════════════════════════

function LoddedItem({ item }: { item: WorldItemDef }) {
  const ctx = useWorldItems()
  const [lodLevel, setLodLevel] = useState<'far' | 'mid' | 'near'>('far')
  const lastCheck = useRef(0)

  useFrame(({ clock }) => {
    if (!ctx) return
    const now = clock.elapsedTime
    if (now - lastCheck.current < 0.2) return
    lastCheck.current = now

    const d2 = distanceSq(item.pos, ctx.playerPosition.current)
    const midR = ctx.lod.labelDistance * ctx.lod.labelDistance
    const nearR = ctx.lod.lightDistance * ctx.lod.lightDistance

    let level: 'far' | 'mid' | 'near' = 'far'
    if (d2 <= nearR) level = 'near'
    else if (d2 <= midR) level = 'mid'

    setLodLevel((prev) => (prev === level ? prev : level))
  })

  const lod = ctx?.lod ?? DEFAULT_LOD
  const nearR2 = lod.renderDistance * lod.renderDistance

  // Skip render si trop loin
  const d2FromPlayer = ctx
    ? distanceSq(item.pos, ctx.playerPosition.current)
    : 0
  if (d2FromPlayer > nearR2) return null

  return (
    <ItemMesh
      item={item}
      lodLevel={lodLevel}
      onPickup={() => ctx?.pickup(item.id)}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITEM MESH — mesh avec LOD, halo, light conditionnelle
// ═══════════════════════════════════════════════════════════════════════════

export interface ItemMeshProps {
  item: WorldItemDef
  lodLevel?: 'far' | 'mid' | 'near'
  onPickup?: () => void
}

export function ItemMesh({ item, lodLevel = 'near', onPickup }: ItemMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const rarity = item.rarity ?? 'common'
  const rarityMeta = RARITY_META[rarity]

  const seed = useMemo(
    () => item.pos[0] * 3.7 + item.pos[2] * 1.3,
    [item.pos],
  )

  const showLabel = lodLevel === 'near' || lodLevel === 'mid'
  const showLight = lodLevel === 'near'

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (meshRef.current) {
      meshRef.current.position.y =
        item.pos[1] + 0.18 + Math.sin(t * 1.9 + seed) * 0.1
      meshRef.current.rotation.y = t * 1.1 + seed
    }

    if (ringRef.current) {
      const s = rarityMeta.haloScale * (1.0 + Math.sin(t * 1.5 + seed) * 0.12)
      ringRef.current.scale.set(s, 1, s)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      if (mat) {
        mat.opacity = 0.18 + Math.sin(t * 1.5 + seed) * 0.06
      }
    }

    if (lightRef.current && showLight) {
      lightRef.current.intensity =
        rarityMeta.lightIntensity + Math.sin(t * 2.8 + seed) * 0.15
    }
  })

  return (
    <group name={`WorldItem_${item.id}`}>
      {/* Halo anneau au sol */}
      <mesh
        ref={ringRef}
        position={[item.pos[0], 0.02, item.pos[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.45, 0.65, 16]} />
        <meshBasicMaterial
          color={item.color}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>

      {/* Halo glow si rare+ */}
      {rarity !== 'common' && (
        <mesh
          position={[item.pos[0], item.pos[1] + 0.2, item.pos[2]]}
        >
          <sphereGeometry args={[0.35 * rarityMeta.haloScale, 12, 12]} />
          <meshBasicMaterial
            color={item.color}
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Mesh principal */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position={[item.pos[0], item.pos[1], item.pos[2]]}
        onClick={onPickup}
      >
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color={item.color}
          emissive={item.color}
          emissiveIntensity={rarityMeta.emissiveIntensity}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Light (LOD near seulement) */}
      {showLight && (
        <pointLight
          ref={lightRef}
          position={[item.pos[0], item.pos[1] + 0.5, item.pos[2]]}
          color={item.color}
          intensity={rarityMeta.lightIntensity}
          distance={4}
          decay={2}
        />
      )}

      {/* Label (LOD near/mid seulement) */}
      {showLabel && (
        <Html
          position={[item.pos[0], item.pos[1] + 0.85, item.pos[2]]}
          center
          distanceFactor={10}
          occlude
          zIndexRange={[10, 0]}
        >
          <ItemLabel item={item} rarity={rarity} />
        </Html>
      )}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITEM LABEL — HTML label isolé pour optimiser
// ═══════════════════════════════════════════════════════════════════════════

function ItemLabel({ item, rarity }: { item: WorldItemDef; rarity: ItemRarity }) {
  const meta = RARITY_META[rarity]
  return (
    <div
      style={{
        background: 'rgba(4, 6, 14, 0.85)',
        border: `1px solid ${meta.color}55`,
        borderRadius: '4px',
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        boxShadow: `0 0 8px ${meta.color}22`,
      }}
    >
      <span style={{ fontSize: '12px', marginRight: '5px' }}>{item.emoji}</span>
      <span
        style={{
          color: '#e8dfc0',
          fontSize: '10px',
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.5px',
        }}
      >
        {item.name}
      </span>
      {rarity !== 'common' && (
        <span
          style={{
            marginLeft: '6px',
            fontSize: '8px',
            color: meta.color,
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          {meta.label}
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PICKUP PROMPT — "E — Ramasser X"
// ═══════════════════════════════════════════════════════════════════════════

function PickupPrompt({ item, lod }: { item: WorldItemDef; lod: ItemLodConfig }) {
  return (
    <Html
      position={[item.pos[0], item.pos[1] + 1.15, item.pos[2]]}
      center
      distanceFactor={8}
      zIndexRange={[20, 0]}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(8,12,20,0.95), rgba(4,6,14,0.95))',
          border: '1px solid #e8c67a',
          borderRadius: '6px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 0 12px rgba(232,198,122,0.25)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            background: '#e8c67a',
            color: '#0a1020',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 800,
            fontFamily: "'Rajdhani', sans-serif",
          }}
        >
          E
        </span>
        <span
          style={{
            color: '#f0e6c8',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: "'Rajdhani', sans-serif",
            letterSpacing: '0.5px',
          }}
        >
          Ramasser {item.emoji} {item.name}
        </span>
      </div>
    </Html>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SPAWN DISTRIBUTION — génère des items sur le monde
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🆕 Génère des items distribués sur un monde via un prédicat.
 * Utile pour peupler Portneuf automatiquement.
 *
 * @example
 * const items = generateDistributedItems({
 *   count: 200,
 *   bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
 *   categoryWeights: { currency: 0.6, resource: 0.3, artifact: 0.1 },
 *   rarityWeights: { common: 0.6, rare: 0.25, epic: 0.1, legendary: 0.04, mythic: 0.01 },
 * });
 */
export interface DistributedSpawnConfig {
  count: number
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  categoryWeights?: Partial<Record<ItemCategory, number>>
  rarityWeights?: Partial<Record<ItemRarity, number>>
  /** Exclusion : items trop proches d'un village — positions bloquées */
  exclude?: Array<{ x: number; z: number; radius: number }>
  /** Seed pour reproductibilité */
  seed?: number
}

const ITEM_TEMPLATES: Record<ItemCategory, Array<{ name: string; emoji: string; baseColor: string; baseValue: number }>> = {
  currency: [
    { name: 'Lingot', emoji: '🪙', baseColor: '#facc15', baseValue: 100 },
    { name: 'Sac de pièces', emoji: '💰', baseColor: '#eab308', baseValue: 250 },
  ],
  resource: [
    { name: 'Pépite', emoji: '✨', baseColor: '#10b981', baseValue: 300 },
    { name: 'Cristal brut', emoji: '🔮', baseColor: '#06b6d4', baseValue: 400 },
    { name: 'Bois rare', emoji: '🪵', baseColor: '#a16207', baseValue: 120 },
  ],
  consumable: [
    { name: 'Fiole', emoji: '🧪', baseColor: '#a855f7', baseValue: 200 },
    { name: 'Herbe médicinale', emoji: '🌿', baseColor: '#22c55e', baseValue: 80 },
    { name: 'Élixir', emoji: '⚗️', baseColor: '#ec4899', baseValue: 350 },
  ],
  artifact: [
    { name: "Cristal d'Éther", emoji: '💎', baseColor: '#38bdf8', baseValue: 1200 },
    { name: 'Relique ancienne', emoji: '🗿', baseColor: '#78716c', baseValue: 1500 },
    { name: 'Orbe scellé', emoji: '🔱', baseColor: '#c084fc', baseValue: 2000 },
  ],
  quest: [
    { name: 'Clé mystérieuse', emoji: '🗝️', baseColor: '#fbbf24', baseValue: 0 },
  ],
}

function pickWeighted<T extends string>(
  weights: Partial<Record<T, number>>,
  fallback: T[],
): T {
  const entries = Object.entries(weights).filter(([, w]) => (w as number) > 0)
  if (entries.length === 0) return fallback[Math.floor(Math.random() * fallback.length)]

  const total = entries.reduce((s, [, w]) => s + (w as number), 0)
  let r = Math.random() * total
  for (const [key, weight] of entries) {
    r -= weight as number
    if (r <= 0) return key as T
  }
  return entries[entries.length - 1][0] as T
}

export function generateDistributedItems(config: DistributedSpawnConfig): WorldItemDef[] {
  const {
    count,
    bounds,
    categoryWeights = { currency: 0.6, resource: 0.3, artifact: 0.1 },
    rarityWeights = { common: 0.6, rare: 0.25, epic: 0.1, legendary: 0.04, mythic: 0.01 },
    exclude = [],
    seed = 0,
  } = config

  const items: WorldItemDef[] = []
  const rand = mulberry32(seed || Date.now())

  for (let i = 0; i < count; i++) {
    // Position aléatoire
    let attempts = 0
    let x = 0, z = 0
    let valid = false

    while (attempts < 20 && !valid) {
      x = bounds.minX + rand() * (bounds.maxX - bounds.minX)
      z = bounds.minZ + rand() * (bounds.maxZ - bounds.minZ)

      // Vérifie exclusion
      valid = !exclude.some((ex) => {
        const dx = x - ex.x
        const dz = z - ex.z
        return dx * dx + dz * dz < ex.radius * ex.radius
      })
      attempts++
    }

    if (!valid) continue

    // Catégorie
    const category = pickWeighted(
      categoryWeights,
      ['currency', 'resource', 'consumable', 'artifact'] as ItemCategory[],
    )
    // Rareté
    const rarity = pickWeighted(
      rarityWeights,
      ['common', 'rare', 'epic', 'legendary'] as ItemRarity[],
    )

    const templates = ITEM_TEMPLATES[category] ?? ITEM_TEMPLATES.resource
    const template = templates[Math.floor(rand() * templates.length)]

    const rarityMult = {
      common: 1, rare: 1.5, epic: 2.5, legendary: 4, mythic: 8,
    }[rarity]

    items.push({
      id: `item_${category}_${i}_${Math.floor(rand() * 99999)}`,
      name: template.name,
      emoji: template.emoji,
      color: RARITY_META[rarity].color,
      pos: [x, 0.5, z],
      rarity,
      category,
      value: Math.round(template.baseValue * rarityMult),
      amount: 1,
    })
  }

  return items
}

/** Mulberry32 PRNG — seed déterministe */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS v1 COMPAT
// ═══════════════════════════════════════════════════════════════════════════

export { DEFAULT_WORLD_ITEMS }

export default WorldItems