// ============================================================
//   src/types/index.ts
//   EtherWorld RP — Global Type Definitions
// ============================================================

// ── Player ───────────────────────────────────────────────────

export type PlayerRole = 'owner' | 'admin' | 'moderator' | 'vip' | 'player' | 'guest'

export type PlayerStatus = 'online' | 'away' | 'busy' | 'offline'

export interface Player {
  id:          string
  name:        string
  role:        PlayerRole
  status:      PlayerStatus
  position:    Vector3D
  rotation:    number
  health:      number
  armor:       number
  cash:        number
  bank:        number
  joinedAt:    number
  playTime:    number
  character?:  CharacterConfig
  metadata:    Record<string, unknown>
}

// ── Vector Types ─────────────────────────────────────────────

export interface Vector3D {
  x: number
  y: number
  z: number
}

export type TupleVector3 = [number, number, number]

// ── Character ────────────────────────────────────────────────

export interface CharacterConfig {
  id:          string
  name:        string
  gender:      'male' | 'female'
  nationality: string
  skin:        number
  hairStyle:   number
  hairColor:   number
  eyeColor:    number
  faceShape:   number
  bodyType:    number
  height:      number
  muscular:    number
  fatness:     number
  facialHair:  number
  topStyle:    number
  topColor:    number
  pantsStyle:  number
  pantsColor:  number
  shoesStyle:  number
  shoesColor:  number
  glassesStyle: number
  hatStyle:    number
  jewelryStyle: number
  faceWidth:   number
  cheekH:      number
  jawWidth:    number
  noseSize:    number
  noseBridge:  number
  eyeSize:     number
  eyeSpacing:  number
  lipSize:     number
  createdAt:   number
  updatedAt:   number
}

// ── World / Game ─────────────────────────────────────────────

export type WeatherType = 'clear' | 'rain' | 'storm' | 'fog' | 'snow'

export type GameMode = 'explore' | 'build' | 'combat' | 'rp' | 'admin'

export interface WorldState {
  timeOfDay:   number
  weather:     WeatherType
  dayCount:    number
  tickRate:    number
  paused:      boolean
}

// ── Building / Objects ────────────────────────────────────────

export interface PlacedObject {
  id:        string
  type:      string
  position:  TupleVector3
  rotation:  TupleVector3
  scale:     TupleVector3
  color?:    string
  placedBy:  string
  placedAt:  number
  metadata:  Record<string, unknown>
}

// ── Admin Effects ─────────────────────────────────────────────

export type EffectType =
  | 'jail' | 'freeze' | 'tp' | 'spotlight' | 'storm'
  | 'explosion' | 'portal' | 'aura' | 'blackhole'
  | 'divine' | 'chaos' | 'matrix' | 'shockwave' | 'lightning'
  | 'angel' | 'demon' | 'frostnova' | 'quantum' | 'venom'
  | 'timestop' | 'meteor' | 'nuke' | 'void' | 'phoenix'

export interface AdminEffect {
  id:        string
  type:      EffectType
  position:  TupleVector3
  target?:   TupleVector3
  duration?: number
  color?:    string
  intensity?: number
  radius?:   number
  scale?:    number
  createdBy: string
  createdAt: number
}

// ── API ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success:   boolean
  data?:     T
  error?:    string
  message?:  string
  timestamp: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total:    number
  page:     number
  pageSize: number
  hasMore:  boolean
}

// ── Socket Events ─────────────────────────────────────────────

export interface SocketEvents {
  // Client → Server
  'player:join':    (data: { name: string; character?: CharacterConfig }) => void
  'player:move':    (data: { position: TupleVector3; rotation: number }) => void
  'world:build':    (data: PlacedObject) => void
  'world:remove':   (data: { id: string }) => void
  'admin:effect':   (data: AdminEffect) => void
  'chat:message':   (data: { text: string }) => void

  // Server → Client
  'players:update': (players: Player[]) => void
  'world:sync':     (objects: PlacedObject[]) => void
  'chat:receive':   (data: { sender: string; text: string; timestamp: number }) => void
  'server:kick':    (data: { reason: string }) => void
  'server:announce':(data: { text: string; type: 'info' | 'warning' | 'danger' }) => void
}

// ── UI ────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id:        string
  type:      NotificationType
  title?:    string
  message:   string
  duration?: number
  createdAt: number
}

export interface Modal {
  id:        string
  component: React.ComponentType<Record<string, unknown>>
  props?:    Record<string, unknown>
}

// ── Utility Types ─────────────────────────────────────────────

export type Nullable<T>  = T | null
export type Optional<T>  = T | undefined
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }
export type ValueOf<T>   = T[keyof T]
export type ArrayElement<T extends readonly unknown[]> = T[number]