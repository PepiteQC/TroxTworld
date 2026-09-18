/**
 * alarmSystem.ts
 * Logique de l'alarme — countdown, sirène, auto-reset
 * Utilisé par le store mais peut aussi fonctionner standalone
 */

import { useSecurityStore } from './securityStore'
import type { AlarmState, AlarmZone } from './types'

// ─────────────────────────────────────────────
// SIREN CONTROLLER
// ─────────────────────────────────────────────

let sirenTimer: ReturnType<typeof setTimeout> | null = null
let countdownTimer: ReturnType<typeof setTimeout> | null = null

export function startSiren(): void {
  const { state } = useSecurityStore.getState()

  clearSiren()

  sirenTimer = setTimeout(() => {
    // Auto-silence après durée max
    const current = useSecurityStore.getState().state.alarm
    if (current === 'triggered' || current === 'panic') {
      useSecurityStore.getState().logEvent(
        'alarm_triggered',
        'Siren auto-silenced after timeout',
        'Sirène auto-silencée après délai',
        { autoSilence: true }
      )
    }
  }, state.alarmConfig.sirenDuration * 1000)
}

export function clearSiren(): void {
  if (sirenTimer) {
    clearTimeout(sirenTimer)
    sirenTimer = null
  }
}

export function clearCountdown(): void {
  if (countdownTimer) {
    clearTimeout(countdownTimer)
    countdownTimer = null
  }
}

export function clearAllTimers(): void {
  clearSiren()
  clearCountdown()
}

// ─────────────────────────────────────────────
// ALARM CONTROLLER — fonctions haut niveau
// ─────────────────────────────────────────────

export function armForClosing(code: string): boolean {
  clearAllTimers()
  const store = useSecurityStore.getState()

  // Vérifier que toutes les portes sont verrouillées
  const unlockedLocks = store.state.locks.filter(l =>
    l.state === 'unlocked' && l.id !== 'front_door'
  )

  if (unlockedLocks.length > 0) {
    store.logEvent(
      'system_error',
      `Cannot arm — ${unlockedLocks.length} lock(s) unsecured: ${unlockedLocks.map(l => l.name).join(', ')}`,
      `Impossible d'armer — ${unlockedLocks.length} verrou(s) non sécurisé(s): ${unlockedLocks.map(l => l.nameFr).join(', ')}`,
      { unsecuredLocks: unlockedLocks.map(l => l.id) }
    )
    return false
  }

  const result = store.armAlarm('away', code)

  if (result) {
    // Verrouiller la porte avant aussi
    store.lock('front_door')
  }

  return result
}

export function armForStay(code: string): boolean {
  clearAllTimers()
  return useSecurityStore.getState().armAlarm('stay', code)
}

export function disarm(code: string): boolean {
  clearAllTimers()
  return useSecurityStore.getState().disarmAlarm(code)
}

export function triggerZone(zone: AlarmZone, reason?: string): void {
  const store = useSecurityStore.getState()
  store.triggerAlarm(zone, reason)

  // Démarrer sirène si triggered
  if (store.state.alarm === 'triggered') {
    startSiren()
  }
}

export function panicButton(): void {
  clearAllTimers()
  useSecurityStore.getState().triggerPanic()
  startSiren()
}

// ─────────────────────────────────────────────
// ALARM STATE HELPERS
// ─────────────────────────────────────────────

export function isAlarmActive(): boolean {
  const alarm = useSecurityStore.getState().state.alarm
  return alarm !== 'disarmed'
}

export function isAlarmTriggered(): boolean {
  const alarm = useSecurityStore.getState().state.alarm
  return alarm === 'triggered' || alarm === 'panic'
}

export function getAlarmDisplayText(alarm: AlarmState): { en: string; fr: string; color: string } {
  switch (alarm) {
    case 'disarmed':    return { en: 'DISARMED',    fr: 'DÉSARMÉE',       color: '#00cc00' }
    case 'armed_away':  return { en: 'ARMED AWAY',  fr: 'ARMÉE ABSENTE',  color: '#ff8800' }
    case 'armed_stay':  return { en: 'ARMED STAY',  fr: 'ARMÉE PRÉSENCE', color: '#ffcc00' }
    case 'triggered':   return { en: '⚠ TRIGGERED', fr: '⚠ DÉCLENCHÉE',  color: '#ff0000' }
    case 'countdown':   return { en: 'COUNTDOWN',   fr: 'COMPTE À REBOURS', color: '#ff4400' }
    case 'panic':       return { en: '🚨 PANIC',    fr: '🚨 PANIQUE',    color: '#ff0000' }
  }
}
