/**
 * lockSystem.ts
 * Gestion centralisée des verrous
 * - Verrouillage/déverrouillage séquence
 * - Closing procedure (fin de journée)
 * - Opening procedure (début de journée)
 */

import { useSecurityStore } from './securityStore'
import { useEmployeeStore } from '../storage/employeeStore'
import type { LockId, LockState } from './types'

// ─────────────────────────────────────────────
// PROCÉDURE DE FERMETURE
// ─────────────────────────────────────────────

export interface ClosingChecklistItem {
  id:          string
  label:       string
  labelFr:     string
  lockId?:     LockId
  completed:   boolean
  required:    boolean
}

export function getClosingChecklist(): ClosingChecklistItem[] {
  const security = useSecurityStore.getState()

  return [
    {
      id: 'check_registers',
      label: 'Count and balance registers',
      labelFr: 'Compter et balancer les caisses',
      completed: false,
      required: true,
    },
    {
      id: 'lock_registers',
      label: 'Lock both registers',
      labelFr: 'Verrouiller les deux caisses',
      lockId: 'register_1',
      completed: security.getLockState('register_1') === 'locked' &&
                 security.getLockState('register_2') === 'locked',
      required: true,
    },
    {
      id: 'deposit_safe',
      label: 'Deposit cash to safe',
      labelFr: 'Déposer l\'argent au coffre',
      lockId: 'safe',
      completed: false,
      required: true,
    },
    {
      id: 'lock_safe',
      label: 'Lock the safe',
      labelFr: 'Verrouiller le coffre',
      lockId: 'safe',
      completed: security.getLockState('safe') === 'locked',
      required: true,
    },
    {
      id: 'lock_cigarettes',
      label: 'Lock cigarette display',
      labelFr: 'Verrouiller le présentoir tabac',
      lockId: 'cigarette_display',
      completed: security.getLockState('cigarette_display') === 'locked',
      required: true,
    },
    {
      id: 'lock_storage',
      label: 'Lock storage room',
      labelFr: 'Verrouiller l\'entrepôt',
      lockId: 'storage_door',
      completed: security.getLockState('storage_door') === 'locked',
      required: true,
    },
    {
      id: 'lock_back_door',
      label: 'Lock back door',
      labelFr: 'Verrouiller la porte arrière',
      lockId: 'back_door',
      completed: security.getLockState('back_door') === 'locked',
      required: true,
    },
    {
      id: 'check_cameras',
      label: 'Verify all cameras online',
      labelFr: 'Vérifier toutes les caméras en ligne',
      completed: security.state.cameras.every(c => c.status !== 'offline'),
      required: false,
    },
    {
      id: 'arm_alarm',
      label: 'Arm alarm system',
      labelFr: 'Armer le système d\'alarme',
      completed: security.state.alarm === 'armed_away',
      required: true,
    },
    {
      id: 'lock_front_door',
      label: 'Lock front door (last step)',
      labelFr: 'Verrouiller la porte avant (dernière étape)',
      lockId: 'front_door',
      completed: security.getLockState('front_door') === 'locked',
      required: true,
    },
  ]
}

// ─────────────────────────────────────────────
// EXECUTE CLOSING
// ─────────────────────────────────────────────

export function executeClosingSequence(
  employeeId: string,
  masterCode: string
): { success: boolean; errors: string[] } {
  const security = useSecurityStore.getState()
  const errors: string[] = []

  // Étape 1: Verrouiller les caisses
  const locksToSecure: LockId[] = [
    'register_1', 'register_2',
    'cigarette_display', 'storage_door',
    'back_door', 'office_door',
  ]

  locksToSecure.forEach(lockId => {
    security.lock(lockId)
  })

  // Étape 2: Verrouiller le coffre
  security.lock('safe')

  // Étape 3: Armer l'alarme
  const armed = security.armAlarm('away', masterCode)
  if (!armed) {
    errors.push('Failed to arm alarm — check master code')
  }

  // Étape 4: Verrouiller la porte avant (dernière)
  security.lock('front_door')

  // Étape 5: Log
  security.logEvent(
    'alarm_armed',
    `Closing sequence completed by ${employeeId}`,
    `Séquence de fermeture complétée par ${employeeId}`,
    { employeeId, errors, locksSecured: locksToSecure }
  )

  return {
    success: errors.length === 0,
    errors,
  }
}

// ─────────────────────────────────────────────
// EXECUTE OPENING
// ─────────────────────────────────────────────

export function executeOpeningSequence(
  employeeId: string,
  masterCode: string
): { success: boolean; errors: string[] } {
  const security = useSecurityStore.getState()
  const errors: string[] = []

  // Étape 1: Désarmer l'alarme
  const disarmed = security.disarmAlarm(masterCode)
  if (!disarmed) {
    errors.push('Failed to disarm alarm — invalid code')
    return { success: false, errors }
  }

  // Étape 2: Déverrouiller porte avant
  const doorUnlocked = security.unlock('front_door', 'manager', masterCode)
  if (!doorUnlocked) {
    errors.push('Failed to unlock front door')
  }

  // Étape 3: Déverrouiller les caisses
  security.unlock('register_1', 'manager', masterCode)
  security.unlock('register_2', 'manager', masterCode)

  // Étape 4: Déverrouiller cigarettes
  security.unlock('cigarette_display', 'manager', masterCode)

  // Étape 5: Log
  security.logEvent(
    'alarm_disarmed',
    `Opening sequence completed by ${employeeId}`,
    `Séquence d'ouverture complétée par ${employeeId}`,
    { employeeId }
  )

  return {
    success: errors.length === 0,
    errors,
  }
}

// ─────────────────────────────────────────────
// LOCK STATUS UTILITIES
// ─────────────────────────────────────────────

export function getAllLockStates(): Array<{ id: LockId; name: string; state: LockState }> {
  return useSecurityStore.getState().state.locks.map(l => ({
    id:    l.id,
    name:  l.nameFr,
    state: l.state,
  }))
}

export function getUnsecuredLocks(): LockId[] {
  return useSecurityStore.getState().state.locks
    .filter(l => l.state !== 'locked')
    .map(l => l.id)
}

export function isFullySecured(): boolean {
  return getUnsecuredLocks().length === 0
}
