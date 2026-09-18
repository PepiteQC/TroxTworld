/**
 * types.ts — Types partagés pour l'intérieur du dépanneur
 */
import type { Product } from './storage/types'

export type InteractionType =
  | 'examine'
  | 'pickup'
  | 'purchase'
  | 'talk'
  | 'use'
  | 'open'
  | 'read'
  | 'deposit'
  | 'access'

export interface InteractionTarget {
  id: string
  type: InteractionType
  label: string
  labelFr: string
  position: [number, number, number]
  radius: number
  requiresItem?: string
  requiresRole?: string
  cooldown?: number
  oneShot?: boolean
}

export interface InteractionResult {
  success: boolean
  message?: string
  messageFr?: string
  product?: Product
  xpGained?: number
  moneyGained?: number
  moneySpent?: number
}

export interface PlayerInventoryItem {
  product: Product
  quantity: number
  pickedAt: number
}

export interface PlayerInteriorState {
  inventory: PlayerInventoryItem[]
  money: number
  nearInteraction: InteractionTarget | null
  activeInteraction: InteractionTarget | null
  isAtCounter: boolean
  isInRestrictedZone: boolean
  suspicion: number
  lastPurchaseTime: number | null
}

export type NPCRole = 'cashier' | 'customer' | 'manager' | 'guard'
export type NPCMood = 'neutral' | 'happy' | 'suspicious' | 'angry' | 'busy'
export type NPCAction =
  | 'idle'
  | 'walking'
  | 'browsing'
  | 'checkout'
  | 'working'
  | 'watching'
  | 'talking'

export interface NPCState {
  id: string
  name: string
  role: NPCRole
  mood: NPCMood
  action: NPCAction
  position: [number, number, number]
  rotation: number
  targetPos?: [number, number, number]
  dialogueId?: string
  isAvailable: boolean
  suspicionOf: string[]
}

export type ZoneId =
  | 'entrance'
  | 'main_floor'
  | 'counter'
  | 'coffee_area'
  | 'snack_aisle'
  | 'drink_aisle'
  | 'back_fridges'
  | 'storage'
  | 'office'
  | 'restroom'

export interface InteriorZone {
  id: ZoneId
  name: string
  nameFr: string
  bounds: { min: [number, number, number]; max: [number, number, number] }
  restricted: boolean
  npcOnly: boolean
  interactions: InteractionTarget[]
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
export type WeatherOutside =
  | 'sunny'
  | 'cloudy'
  | 'raining'
  | 'snowing'
  | 'foggy'
  | 'storm'

export interface AmbientConfig {
  timeOfDay: TimeOfDay
  weather: WeatherOutside
  musicVolume: number
  sfxVolume: number
  lightIntensity: number
  customerCount: number
}

export interface RadioStation {
  id: string
  name: string
  genre: string
  url?: string
  isOn: boolean
  volume: number
}

export interface InteriorSceneState {
  isLoaded: boolean
  playerState: PlayerInteriorState
  npcs: NPCState[]
  ambientConfig: AmbientConfig
  radio: RadioStation
  zones: InteriorZone[]
  showUI: string[]
}
