/**
 * securityStore.ts
 * Store central — coordonne tous les sous-systèmes sécurité
 */

import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import type {
  SecuritySystemState,
  AlarmState,
  AlarmConfig,
  AlarmZoneConfig,
  AlarmZone,
  CameraConfig,
  CameraId,
  CameraStatus,
  LockConfig,
  LockId,
  LockState,
  SafeConfig,
  TheftEvent,
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
} from './types'

// ─────────────────────────────────────────────
// CONFIGS PAR DÉFAUT
// ─────────────────────────────────────────────

const DEFAULT_ALARM_ZONES: AlarmZoneConfig[] = [
  { id: 'front_door',    name: 'Front Door',    nameFr: 'Porte Avant',     enabled: true,  triggered: false, sensor: 'contact',     delay: 30 },
  { id: 'back_door',     name: 'Back Door',     nameFr: 'Porte Arrière',   enabled: true,  triggered: false, sensor: 'contact',     delay: 0 },
  { id: 'storage_room',  name: 'Storage Room',  nameFr: 'Entrepôt',        enabled: true,  triggered: false, sensor: 'motion',      delay: 0 },
  { id: 'office',        name: 'Office',        nameFr: 'Bureau',          enabled: true,  triggered: false, sensor: 'motion',      delay: 15 },
  { id: 'main_floor',    name: 'Main Floor',    nameFr: 'Plancher',        enabled: true,  triggered: false, sensor: 'motion',      delay: 30 },
  { id: 'parking',       name: 'Parking Lot',   nameFr: 'Stationnement',   enabled: false, triggered: false, sensor: 'motion',      delay: 0 },
]

const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  entryDelay:     30,
  exitDelay:      45,
  sirenDuration:  300,
  autoCallPolice: true,
  masterCode:     '1234',
  panicCode:      '9999',
  zones:          DEFAULT_ALARM_ZONES,
}

const DEFAULT_CAMERAS: CameraConfig[] = [
  { id: 'cam_entrance_left',  name: 'Entrance Left',   nameFr: 'Entrée Gauche',   position: [-6, 5.5, 5],  rotation: [0, Math.PI / 4, 0],   fov: 90, status: 'recording', nightVision: true, recording: true, motionZone: 'front_door' },
  { id: 'cam_entrance_right', name: 'Entrance Right',  nameFr: 'Entrée Droite',   position: [6, 5.5, 5],   rotation: [0, -Math.PI / 4, 0],  fov: 90, status: 'recording', nightVision: true, recording: true, motionZone: 'front_door' },
  { id: 'cam_back_wall',      name: 'Back Wall',       nameFr: 'Mur Arrière',     position: [0, 5.5, -6],  rotation: [0, Math.PI, 0],       fov: 110, status: 'recording', nightVision: true, recording: true, motionZone: 'main_floor' },
  { id: 'cam_counter',        name: 'Counter',         nameFr: 'Comptoir',        position: [0, 5.5, 3],   rotation: [0.3, 0, 0],           fov: 70, status: 'recording', nightVision: false, recording: true, motionZone: 'main_floor' },
  { id: 'cam_parking',        name: 'Parking',         nameFr: 'Stationnement',   position: [0, 6, 14],    rotation: [0.2, Math.PI, 0],     fov: 120, status: 'recording', nightVision: true, recording: true, motionZone: 'parking' },
  { id: 'cam_storage',        name: 'Storage Room',    nameFr: 'Entrepôt',        position: [-5, 4, -5],   rotation: [0, Math.PI / 2, 0],   fov: 80, status: 'online', nightVision: true, recording: false, motionZone: 'storage_room' },
]

const DEFAULT_LOCKS: LockConfig[] = [
  { id: 'front_door',         name: 'Front Door',       nameFr: 'Porte Avant',       state: 'unlocked', requiresPin: true,  requiresKey: false, autoLockAfter: null,  allowedRoles: ['manager', 'cashier'],              lastChanged: Date.now() },
  { id: 'back_door',          name: 'Back Door',        nameFr: 'Porte Arrière',     state: 'locked',   requiresPin: false, requiresKey: true,  autoLockAfter: 10,    allowedRoles: ['manager', 'stock_clerk'],           lastChanged: Date.now() },
  { id: 'office_door',        name: 'Office Door',      nameFr: 'Bureau',            state: 'locked',   requiresPin: true,  requiresKey: false, autoLockAfter: 60,    allowedRoles: ['manager'],                         lastChanged: Date.now() },
  { id: 'storage_door',       name: 'Storage Door',     nameFr: 'Entrepôt',          state: 'locked',   requiresPin: false, requiresKey: true,  autoLockAfter: 30,    allowedRoles: ['manager', 'stock_clerk'],           lastChanged: Date.now() },
  { id: 'cigarette_display',  name: 'Cigarette Display',nameFr: 'Présentoir Tabac',  state: 'locked',   requiresPin: false, requiresKey: true,  autoLockAfter: null,  allowedRoles: ['manager', 'cashier'],              lastChanged: Date.now() },
  { id: 'safe',               name: 'Safe',             nameFr: 'Coffre-fort',       state: 'locked',   requiresPin: true,  requiresKey: true,  autoLockAfter: 5,     allowedRoles: ['manager'],                         lastChanged: Date.now() },
  { id: 'register_1',         name: 'Register 1',       nameFr: 'Caisse 1',          state: 'locked',   requiresPin: true,  requiresKey: false, autoLockAfter: 120,   allowedRoles: ['manager', 'cashier'],              lastChanged: Date.now() },
  { id: 'register_2',         name: 'Register 2',       nameFr: 'Caisse 2',          state: 'locked',   requiresPin: true,  requiresKey: false, autoLockAfter: 120,   allowedRoles: ['manager', 'cashier'],              lastChanged: Date.now() },
  { id: 'ice_cage',           name: 'Ice Cage',         nameFr: 'Cage à Glace',      state: 'locked',   requiresPin: false, requiresKey: true,  autoLockAfter: null,  allowedRoles: ['manager', 'stock_clerk'],           lastChanged: Date.now() },
]

const DEFAULT_SAFE_CONFIG: SafeConfig = {
  maxCapacity:    10000,
  requireDualKey: false,
  timelock:       true,
  timelockStart:  6,
  timelockEnd:    22,
  allowedRoles:   ['manager'],
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function generateEventId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function severityFromType(type: SecurityEventType): SecuritySeverity {
  const critical: SecurityEventType[] = ['alarm_triggered', 'alarm_panic', 'door_forced', 'theft_detected', 'power_outage']
  const alert: SecurityEventType[]    = ['camera_offline', 'lock_jammed', 'access_denied', 'invalid_pin', 'system_error']
  const warning: SecurityEventType[]  = ['theft_resolved', 'camera_motion', 'lock_changed']

  if (critical.includes(type)) return 'critical'
  if (alert.includes(type)) return 'alert'
  if (warning.includes(type)) return 'warning'
  return 'info'
}

// ─────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────

interface SecurityStore {
  // ── État ──
  state: SecuritySystemState

  // ── Alarme ──
  armAlarm:              (mode: 'away' | 'stay', code: string) => boolean
  disarmAlarm:           (code: string) => boolean
  triggerAlarm:          (zone: AlarmZone, reason?: string) => void
  triggerPanic:          () => void
  silenceAlarm:          (code: string) => boolean
  setZoneEnabled:        (zone: AlarmZone, enabled: boolean) => void

  // ── Caméras ──
  setCameraStatus:       (id: CameraId, status: CameraStatus) => void
  toggleRecording:       (id: CameraId) => void
  reportCameraEvent:     (cameraId: CameraId, type: string, description: string) => void

  // ── Verrous ──
  unlock:                (lockId: LockId, employeeRole: string, pin?: string) => boolean
  lock:                  (lockId: LockId) => void
  setLockState:          (lockId: LockId, state: LockState) => void
  getLockState:          (lockId: LockId) => LockState

  // ── Theft ──
  reportTheft:           (event: Omit<TheftEvent, 'id' | 'timestamp' | 'resolved'>) => TheftEvent
  resolveTheft:          (eventId: string, resolution: TheftEvent['resolution'], notes?: string) => void

  // ── Journal ──
  logEvent:              (type: SecurityEventType, description: string, descriptionFr: string, metadata?: Record<string, unknown>) => SecurityEvent
  getRecentEvents:       (count?: number) => SecurityEvent[]
  getEventsByType:       (type: SecurityEventType) => SecurityEvent[]
  getCriticalEvents:     () => SecurityEvent[]
  acknowledgeEvent:      (eventId: string) => void
  acknowledgeAll:        () => void
  clearLog:              () => void

  // ── Système ──
  setSystemOnline:       (online: boolean) => void
  getSecuritySummary:    () => SecuritySummary
  reset:                 () => void
}

export interface SecuritySummary {
  alarmState:         AlarmState
  camerasOnline:      number
  camerasTotal:       number
  locksSecured:       number
  locksTotal:         number
  unresolvedThefts:   number
  criticalAlerts:     number
  systemOnline:       boolean
}

// ─────────────────────────────────────────────
// DEFAULT STATE
// ─────────────────────────────────────────────

const DEFAULT_STATE: SecuritySystemState = {
  alarm:         'disarmed',
  alarmConfig:   DEFAULT_ALARM_CONFIG,
  cameras:       DEFAULT_CAMERAS,
  locks:         DEFAULT_LOCKS,
  safeConfig:    DEFAULT_SAFE_CONFIG,
  theftEvents:   [],
  securityLog:   [],
  lastPatrol:    null,
  systemOnline:  true,
}

// ─────────────────────────────────────────────
// IMPLEMENTATION
// ─────────────────────────────────────────────

export const useSecurityStore = create<SecurityStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        state: { ...DEFAULT_STATE },

        // ══════════════════════════════════════
        // ALARME
        // ══════════════════════════════════════

        armAlarm: (mode, code) => {
          const { state } = get()
          if (code !== state.alarmConfig.masterCode) {
            get().logEvent(
              'access_denied',
              `Invalid alarm code attempt (arm ${mode})`,
              `Tentative code alarme invalide (armement ${mode})`
            )
            return false
          }

          const alarmState: AlarmState = mode === 'away' ? 'armed_away' : 'armed_stay'

          set(s => ({
            state: { ...s.state, alarm: alarmState },
          }))

          get().logEvent(
            'alarm_armed',
            `Alarm armed: ${mode}`,
            `Alarme armée: ${mode === 'away' ? 'absente' : 'présence'}`,
            { mode }
          )
          return true
        },

        disarmAlarm: (code) => {
          const { state } = get()

          // Panic code — désarme silencieusement mais log critique
          if (code === state.alarmConfig.panicCode) {
            set(s => ({ state: { ...s.state, alarm: 'disarmed' } }))
            get().logEvent(
              'alarm_panic',
              'PANIC CODE ENTERED — Silent alarm triggered',
              'CODE PANIQUE ENTRÉ — Alarme silencieuse déclenchée',
              { panicActivated: true }
            )
            return true
          }

          if (code !== state.alarmConfig.masterCode) {
            get().logEvent(
              'invalid_pin',
              'Invalid alarm disarm code attempt',
              'Tentative de désarmement avec code invalide'
            )
            return false
          }

          // Réinitialiser toutes les zones
          const zones = state.alarmConfig.zones.map(z => ({ ...z, triggered: false }))

          set(s => ({
            state: {
              ...s.state,
              alarm: 'disarmed',
              alarmConfig: { ...s.state.alarmConfig, zones },
            },
          }))

          get().logEvent(
            'alarm_disarmed',
            'Alarm disarmed',
            'Alarme désarmée'
          )
          return true
        },

        triggerAlarm: (zone, reason) => {
          const { state } = get()
          const zoneConfig = state.alarmConfig.zones.find(z => z.id === zone)
          if (!zoneConfig || !zoneConfig.enabled) return
          if (state.alarm === 'disarmed') return

          // Mettre la zone en triggered
          const zones = state.alarmConfig.zones.map(z =>
            z.id === zone ? { ...z, triggered: true } : z
          )

          // Si la zone a un délai, passer en countdown d'abord
          const newAlarmState: AlarmState =
            zoneConfig.delay > 0 && state.alarm !== 'triggered'
              ? 'countdown'
              : 'triggered'

          set(s => ({
            state: {
              ...s.state,
              alarm: newAlarmState,
              alarmConfig: { ...s.state.alarmConfig, zones },
            },
          }))

          get().logEvent(
            'alarm_triggered',
            `Alarm triggered: zone "${zoneConfig.name}" — ${reason ?? 'sensor activation'}`,
            `Alarme déclenchée: zone "${zoneConfig.nameFr}" — ${reason ?? 'activation capteur'}`,
            { zone, reason, delay: zoneConfig.delay }
          )

          // Si countdown, trigger après le délai
          if (newAlarmState === 'countdown') {
            setTimeout(() => {
              const current = get().state.alarm
              if (current === 'countdown') {
                set(s => ({ state: { ...s.state, alarm: 'triggered' } }))
              }
            }, zoneConfig.delay * 1000)
          }
        },

        triggerPanic: () => {
          set(s => ({ state: { ...s.state, alarm: 'panic' } }))
          get().logEvent(
            'alarm_panic',
            'PANIC BUTTON ACTIVATED',
            'BOUTON PANIQUE ACTIVÉ'
          )
        },

        silenceAlarm: (code) => {
          const { state } = get()
          if (code !== state.alarmConfig.masterCode) return false
          return get().disarmAlarm(code)
        },

        setZoneEnabled: (zone, enabled) => {
          set(s => ({
            state: {
              ...s.state,
              alarmConfig: {
                ...s.state.alarmConfig,
                zones: s.state.alarmConfig.zones.map(z =>
                  z.id === zone ? { ...z, enabled } : z
                ),
              },
            },
          }))
        },

        // ══════════════════════════════════════
        // CAMÉRAS
        // ══════════════════════════════════════

        setCameraStatus: (id, status) => {
          set(s => ({
            state: {
              ...s.state,
              cameras: s.state.cameras.map(c =>
                c.id === id ? { ...c, status } : c
              ),
            },
          }))

          if (status === 'offline') {
            get().logEvent(
              'camera_offline',
              `Camera "${id}" went offline`,
              `Caméra "${id}" hors ligne`,
              { cameraId: id }
            )
          } else if (status === 'online') {
            get().logEvent(
              'camera_online',
              `Camera "${id}" back online`,
              `Caméra "${id}" en ligne`,
              { cameraId: id }
            )
          }
        },

        toggleRecording: (id) => {
          set(s => ({
            state: {
              ...s.state,
              cameras: s.state.cameras.map(c =>
                c.id === id ? { ...c, recording: !c.recording } : c
              ),
            },
          }))
        },

        reportCameraEvent: (cameraId, type, description) => {
          if (type === 'motion') {
            get().logEvent(
              'camera_motion',
              `Motion detected on camera "${cameraId}": ${description}`,
              `Mouvement détecté sur caméra "${cameraId}": ${description}`,
              { cameraId, motionType: type }
            )
          }
        },

        // ══════════════════════════════════════
        // VERROUS
        // ══════════════════════════════════════

        unlock: (lockId, employeeRole, pin) => {
          const { state } = get()
          const lockConfig = state.locks.find(l => l.id === lockId)
          if (!lockConfig) return false

          // Vérifier le rôle
          if (!lockConfig.allowedRoles.includes(employeeRole)) {
            get().logEvent(
              'access_denied',
              `Access denied to "${lockConfig.name}" — role "${employeeRole}" unauthorized`,
              `Accès refusé à "${lockConfig.nameFr}" — rôle "${employeeRole}" non autorisé`,
              { lockId, role: employeeRole }
            )
            return false
          }

          // Vérifier PIN si requis
          if (lockConfig.requiresPin && !pin) {
            get().logEvent(
              'access_denied',
              `Access denied to "${lockConfig.name}" — PIN required`,
              `Accès refusé à "${lockConfig.nameFr}" — NIP requis`,
              { lockId }
            )
            return false
          }

          // Vérifier PIN (simplifié — dans un vrai système, on validerait contre employeeStore)
          if (lockConfig.requiresPin && pin && pin !== state.alarmConfig.masterCode) {
            get().logEvent(
              'invalid_pin',
              `Invalid PIN for "${lockConfig.name}"`,
              `NIP invalide pour "${lockConfig.nameFr}"`,
              { lockId }
            )
            return false
          }

          // Jammed?
          if (lockConfig.state === 'jammed') {
            get().logEvent(
              'lock_jammed',
              `Lock "${lockConfig.name}" is jammed — cannot unlock`,
              `Verrou "${lockConfig.nameFr}" coincé — impossible de déverrouiller`,
              { lockId }
            )
            return false
          }

          // Déverrouiller
          const now = Date.now()
          set(s => ({
            state: {
              ...s.state,
              locks: s.state.locks.map(l =>
                l.id === lockId
                  ? { ...l, state: 'unlocked' as LockState, lastChanged: now }
                  : l
              ),
            },
          }))

          get().logEvent(
            'door_unlocked',
            `"${lockConfig.name}" unlocked`,
            `"${lockConfig.nameFr}" déverrouillé`,
            { lockId, role: employeeRole }
          )

          // Auto-lock
          if (lockConfig.autoLockAfter !== null) {
            setTimeout(() => {
              const current = get().state.locks.find(l => l.id === lockId)
              if (current?.state === 'unlocked' && current.lastChanged === now) {
                get().lock(lockId)
              }
            }, lockConfig.autoLockAfter * 1000)
          }

          return true
        },

        lock: (lockId) => {
          set(s => ({
            state: {
              ...s.state,
              locks: s.state.locks.map(l =>
                l.id === lockId
                  ? { ...l, state: 'locked' as LockState, lastChanged: Date.now() }
                  : l
              ),
            },
          }))

          get().logEvent(
            'door_locked',
            `Lock "${lockId}" secured`,
            `Verrou "${lockId}" sécurisé`,
            { lockId }
          )
        },

        setLockState: (lockId, lockState) => {
          set(s => ({
            state: {
              ...s.state,
              locks: s.state.locks.map(l =>
                l.id === lockId
                  ? { ...l, state: lockState, lastChanged: Date.now() }
                  : l
              ),
            },
          }))
        },

        getLockState: (lockId) => {
          return get().state.locks.find(l => l.id === lockId)?.state ?? 'locked'
        },

        // ══════════════════════════════════════
        // THEFT / VOL
        // ══════════════════════════════════════

        reportTheft: (event) => {
          const theftEvent: TheftEvent = {
            ...event,
            id:        generateEventId(),
            timestamp: Date.now(),
            resolved:  false,
          }

          set(s => ({
            state: {
              ...s.state,
              theftEvents: [...s.state.theftEvents, theftEvent],
            },
          }))

          get().logEvent(
            'theft_detected',
            `Theft detected — risk: ${event.risk}, est. loss: $${event.estimatedLoss}`,
            `Vol détecté — risque: ${event.risk}, perte est.: ${event.estimatedLoss}$`,
            { theftId: theftEvent.id, risk: event.risk, products: event.productIds }
          )

          return theftEvent
        },

        resolveTheft: (eventId, resolution, notes) => {
          set(s => ({
            state: {
              ...s.state,
              theftEvents: s.state.theftEvents.map(t =>
                t.id === eventId
                  ? { ...t, resolved: true, resolution, notes }
                  : t
              ),
            },
          }))

          get().logEvent(
            'theft_resolved',
            `Theft ${eventId} resolved: ${resolution}`,
            `Vol ${eventId} résolu: ${resolution}`,
            { theftId: eventId, resolution }
          )
        },

        // ══════════════════════════════════════
        // JOURNAL
        // ══════════════════════════════════════

        logEvent: (type, description, descriptionFr, metadata) => {
          const event: SecurityEvent = {
            id:           generateEventId(),
            type,
            severity:     severityFromType(type),
            timestamp:    Date.now(),
            source:       'security_system',
            description,
            descriptionFr,
            metadata,
            acknowledged: false,
          }

          set(s => ({
            state: {
              ...s.state,
              securityLog: [event, ...s.state.securityLog].slice(0, 500),
            },
          }))

          if ((import.meta as any).env?.DEV) {
            const emoji = { info: 'ℹ️', warning: '⚠️', alert: '🚨', critical: '🔴' }[event.severity]
            console.log(`${emoji} [SECURITY] ${description}`)
          }

          return event
        },

        getRecentEvents: (count = 50) => get().state.securityLog.slice(0, count),

        getEventsByType: (type) => get().state.securityLog.filter(e => e.type === type),

        getCriticalEvents: () =>
          get().state.securityLog.filter(e =>
            (e.severity === 'critical' || e.severity === 'alert') && !e.acknowledged
          ),

        acknowledgeEvent: (eventId) => {
          set(s => ({
            state: {
              ...s.state,
              securityLog: s.state.securityLog.map(e =>
                e.id === eventId ? { ...e, acknowledged: true } : e
              ),
            },
          }))
        },

        acknowledgeAll: () => {
          set(s => ({
            state: {
              ...s.state,
              securityLog: s.state.securityLog.map(e => ({ ...e, acknowledged: true })),
            },
          }))
        },

        clearLog: () => {
          set(s => ({
            state: { ...s.state, securityLog: [] },
          }))
        },

        // ══════════════════════════════════════
        // SYSTÈME
        // ══════════════════════════════════════

        setSystemOnline: (online) => {
          set(s => ({
            state: { ...s.state, systemOnline: online },
          }))

          if (!online) {
            get().logEvent(
              'power_outage',
              'Security system went offline',
              'Système de sécurité hors ligne'
            )
          }
        },

        getSecuritySummary: () => {
          const { state } = get()
          return {
            alarmState:       state.alarm,
            camerasOnline:    state.cameras.filter(c => c.status !== 'offline').length,
            camerasTotal:     state.cameras.length,
            locksSecured:     state.locks.filter(l => l.state === 'locked').length,
            locksTotal:       state.locks.length,
            unresolvedThefts: state.theftEvents.filter(t => !t.resolved).length,
            criticalAlerts:   state.securityLog.filter(e =>
              (e.severity === 'critical' || e.severity === 'alert') && !e.acknowledged
            ).length,
            systemOnline:     state.systemOnline,
          }
        },

        reset: () => {
          set({ state: { ...DEFAULT_STATE } })
        },
      }),
      {
        name:    'depanneur-security',
        version: 1,
        partialize: (s) => ({
          state: {
            ...s.state,
            alarm:       s.state.alarm === 'triggered' || s.state.alarm === 'countdown' || s.state.alarm === 'panic'
              ? 'armed_away'
              : s.state.alarm,
            securityLog: s.state.securityLog.slice(0, 100),
          },
        }),
      }
    )
  )
)
