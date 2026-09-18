/**
 * types.ts
 * Types partagés pour le système de sécurité du dépanneur
 */

// ─────────────────────────────────────────────
// ALARME
// ─────────────────────────────────────────────

export type AlarmState =
  | 'disarmed'
  | 'armed_away'      // magasin fermé, tout activé
  | 'armed_stay'      // magasin ouvert, périmètre seulement
  | 'triggered'       // alarme déclenchée
  | 'countdown'       // délai avant déclenchement
  | 'panic'           // bouton panique

export type AlarmZone =
  | 'front_door'
  | 'back_door'
  | 'storage_room'
  | 'office'
  | 'main_floor'
  | 'parking'

export interface AlarmZoneConfig {
  id:        AlarmZone
  name:      string
  nameFr:    string
  enabled:   boolean
  triggered: boolean
  sensor:    'motion' | 'contact' | 'glass_break' | 'vibration'
  delay:     number  // secondes avant trigger
}

export interface AlarmConfig {
  entryDelay:     number    // secondes (code d'entrée)
  exitDelay:      number    // secondes (sortie après armement)
  sirenDuration:  number    // secondes
  autoCallPolice: boolean
  masterCode:     string
  panicCode:      string    // code qui trigger silencieux
  zones:          AlarmZoneConfig[]
}

// ─────────────────────────────────────────────
// CAMÉRAS
// ─────────────────────────────────────────────

export type CameraId =
  | 'cam_entrance_left'
  | 'cam_entrance_right'
  | 'cam_back_wall'
  | 'cam_counter'
  | 'cam_parking'
  | 'cam_storage'

export type CameraStatus = 'online' | 'offline' | 'recording' | 'motion_detected'

export interface CameraConfig {
  id:          CameraId
  name:        string
  nameFr:      string
  position:    [number, number, number]
  rotation:    [number, number, number]
  fov:         number
  status:      CameraStatus
  nightVision: boolean
  recording:   boolean
  motionZone:  AlarmZone
}

export interface CameraEvent {
  cameraId:    CameraId
  type:        'motion' | 'person' | 'loitering' | 'theft_suspect'
  timestamp:   number
  confidence:  number   // 0-1
  description: string
}

// ─────────────────────────────────────────────
// VOL / THEFT
// ─────────────────────────────────────────────

export type TheftRisk = 'none' | 'low' | 'medium' | 'high' | 'caught'

export type SuspiciousBehavior =
  | 'loitering'           // traîner longtemps sans acheter
  | 'concealment'         // cacher un produit
  | 'bag_stuffing'        // remplir un sac
  | 'tag_removal'         // retirer une étiquette
  | 'distraction'         // distraire le caissier
  | 'rush_exit'           // sortir rapidement
  | 'return_fraud'        // retour frauduleux
  | 'price_swap'          // changer étiquette de prix

export interface TheftEvent {
  id:            string
  timestamp:     number
  behaviors:     SuspiciousBehavior[]
  risk:          TheftRisk
  productIds:    string[]
  estimatedLoss: number
  cameraId?:     CameraId
  resolved:      boolean
  resolution?:   'recovered' | 'loss' | 'police' | 'warning' | 'false_alarm'
  notes?:        string
}

export interface TheftStats {
  totalIncidents:    number
  totalLoss:         number
  recoveredValue:    number
  topStolenProducts: Array<{ productId: string; count: number }>
  monthlyTrend:      Array<{ month: string; incidents: number; loss: number }>
}

// ─────────────────────────────────────────────
// COFFRE-FORT
// ─────────────────────────────────────────────

export type SafeAction = 'open' | 'close' | 'deposit' | 'withdrawal'

export interface SafeAccess {
  id:          string
  timestamp:   number
  employeeId:  string
  action:      SafeAction
  amount?:     number
  reason?:     string
  authorized:  boolean
}

export interface SafeConfig {
  maxCapacity:    number     // $ max
  requireDualKey: boolean    // 2 employés requis
  timelock:       boolean    // ouverture seulement à certaines heures
  timelockStart:  number     // heure début (6 = 6h)
  timelockEnd:    number     // heure fin (22 = 22h)
  allowedRoles:   string[]   // roles autorisés
}

// ─────────────────────────────────────────────
// VERROUS
// ─────────────────────────────────────────────

export type LockId =
  | 'front_door'
  | 'back_door'
  | 'office_door'
  | 'storage_door'
  | 'cigarette_display'
  | 'safe'
  | 'register_1'
  | 'register_2'
  | 'ice_cage'

export type LockState = 'locked' | 'unlocked' | 'jammed'

export interface LockConfig {
  id:             LockId
  name:           string
  nameFr:         string
  state:          LockState
  requiresPin:    boolean
  requiresKey:    boolean
  autoLockAfter:  number | null  // secondes, null = pas d'auto-lock
  allowedRoles:   string[]
  lastChanged:    number
  lastChangedBy?: string
}

// ─────────────────────────────────────────────
// JOURNAL SÉCURITÉ
// ─────────────────────────────────────────────

export type SecurityEventType =
  | 'alarm_armed'
  | 'alarm_disarmed'
  | 'alarm_triggered'
  | 'alarm_panic'
  | 'door_unlocked'
  | 'door_locked'
  | 'door_forced'
  | 'safe_opened'
  | 'safe_closed'
  | 'camera_offline'
  | 'camera_online'
  | 'camera_motion'
  | 'theft_detected'
  | 'theft_resolved'
  | 'lock_changed'
  | 'lock_jammed'
  | 'shift_start'
  | 'shift_end'
  | 'invalid_pin'
  | 'access_denied'
  | 'power_outage'
  | 'system_error'

export type SecuritySeverity = 'info' | 'warning' | 'alert' | 'critical'

export interface SecurityEvent {
  id:          string
  type:        SecurityEventType
  severity:    SecuritySeverity
  timestamp:   number
  source:      string
  description: string
  descriptionFr: string
  employeeId?: string
  metadata?:   Record<string, unknown>
  acknowledged: boolean
}

// ─────────────────────────────────────────────
// ÉTAT GLOBAL SÉCURITÉ
// ─────────────────────────────────────────────

export interface SecuritySystemState {
  alarm:         AlarmState
  alarmConfig:   AlarmConfig
  cameras:       CameraConfig[]
  locks:         LockConfig[]
  safeConfig:    SafeConfig
  theftEvents:   TheftEvent[]
  securityLog:   SecurityEvent[]
  lastPatrol:    number | null
  systemOnline:  boolean
}
