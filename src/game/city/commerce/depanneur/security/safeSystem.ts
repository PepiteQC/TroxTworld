/**
 * safeSystem.ts
 * Coffre-fort — accès sécurisé, dépôt/retrait, audit trail
 */

import { useSecurityStore } from './securityStore'
import { useStoreStateStore } from '../storage/storeStateStore'
import { useEmployeeStore } from '../storage/employeeStore'
import type { SafeAccess, SafeAction } from './types'

// ─────────────────────────────────────────────
// ACCESS LOG
// ─────────────────────────────────────────────

const accessLog: SafeAccess[] = []

function generateAccessId(): string {
  return `safe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// ─────────────────────────────────────────────
// TIMELOCK CHECK
// ─────────────────────────────────────────────

function isWithinTimeLock(): boolean {
  const { safeConfig } = useSecurityStore.getState().state
  if (!safeConfig.timelock) return true

  const hour = new Date().getHours()
  return hour >= safeConfig.timelockStart && hour < safeConfig.timelockEnd
}

// ─────────────────────────────────────────────
// AUTHORIZATION
// ─────────────────────────────────────────────

function authorizeAccess(
  employeeId: string,
  pin: string
): { authorized: boolean; reason?: string } {
  const { safeConfig } = useSecurityStore.getState().state
  const employee = useEmployeeStore.getState().getEmployee(employeeId)

  if (!employee) {
    return { authorized: false, reason: 'Employee not found' }
  }

  if (!employee.active) {
    return { authorized: false, reason: 'Employee inactive' }
  }

  if (!safeConfig.allowedRoles.includes(employee.role)) {
    return { authorized: false, reason: `Role "${employee.role}" not authorized` }
  }

  if (!useEmployeeStore.getState().validatePin(employeeId, pin)) {
    return { authorized: false, reason: 'Invalid PIN' }
  }

  if (!isWithinTimeLock()) {
    return { authorized: false, reason: 'Outside timelock hours' }
  }

  return { authorized: true }
}

// ─────────────────────────────────────────────
// OPEN / CLOSE SAFE
// ─────────────────────────────────────────────

export function openSafe(employeeId: string, pin: string): boolean {
  const security = useSecurityStore.getState()
  const { authorized, reason } = authorizeAccess(employeeId, pin)

  const access: SafeAccess = {
    id:         generateAccessId(),
    timestamp:  Date.now(),
    employeeId,
    action:     'open',
    authorized,
  }
  accessLog.push(access)

  if (!authorized) {
    security.logEvent(
      'access_denied',
      `Safe access denied for employee ${employeeId}: ${reason}`,
      `Accès coffre refusé pour employé ${employeeId}: ${reason}`,
      { employeeId, reason }
    )
    return false
  }

  // Déverrouiller le coffre
  security.unlock('safe', 'manager', pin)

  security.logEvent(
    'safe_opened',
    `Safe opened by employee ${employeeId}`,
    `Coffre ouvert par employé ${employeeId}`,
    { employeeId }
  )

  return true
}

export function closeSafe(): void {
  const security = useSecurityStore.getState()
  security.lock('safe')

  security.logEvent(
    'safe_closed',
    'Safe locked',
    'Coffre verrouillé'
  )
}

// ─────────────────────────────────────────────
// DEPOSIT / WITHDRAWAL
// ─────────────────────────────────────────────

export function deposit(
  employeeId: string,
  pin: string,
  amount: number,
  fromRegister?: 1 | 2
): { success: boolean; newBalance?: number; reason?: string } {
  const { authorized, reason } = authorizeAccess(employeeId, pin)
  const security = useSecurityStore.getState()
  const storeState = useStoreStateStore.getState()

  if (!authorized) {
    security.logEvent(
      'access_denied',
      `Safe deposit denied: ${reason}`,
      `Dépôt coffre refusé: ${reason}`,
      { employeeId, amount }
    )
    return { success: false, reason }
  }

  // Vérifier capacité
  const currentBalance = storeState.state.safeBalance
  const { maxCapacity } = security.state.safeConfig

  if (currentBalance + amount > maxCapacity) {
    return { success: false, reason: `Exceeds safe capacity ($${maxCapacity})` }
  }

  // Si de la caisse, vérifier solde
  if (fromRegister) {
    const registerBalance = storeState.getRegisterBalance(fromRegister)
    if (registerBalance < amount) {
      return { success: false, reason: `Register ${fromRegister} insufficient funds` }
    }
    storeState.transferToSafe(fromRegister, amount)
  } else {
    // Dépôt direct
    useStoreStateStore.setState(s => ({
      state: { ...s.state, safeBalance: s.state.safeBalance + amount },
    }))
  }

  const newBalance = useStoreStateStore.getState().state.safeBalance

  accessLog.push({
    id:         generateAccessId(),
    timestamp:  Date.now(),
    employeeId,
    action:     'deposit',
    amount,
    authorized: true,
    reason:     fromRegister ? `From register ${fromRegister}` : 'Direct deposit',
  })

  security.logEvent(
    'safe_opened',
    `Deposit: $${amount.toFixed(2)} by ${employeeId}${fromRegister ? ` from register ${fromRegister}` : ''}`,
    `Dépôt: ${amount.toFixed(2)}$ par ${employeeId}${fromRegister ? ` de la caisse ${fromRegister}` : ''}`,
    { employeeId, amount, fromRegister, newBalance }
  )

  return { success: true, newBalance }
}

export function withdraw(
  employeeId: string,
  pin: string,
  amount: number,
  reason?: string
): { success: boolean; newBalance?: number; reason?: string } {
  const { authorized, reason: authReason } = authorizeAccess(employeeId, pin)
  const security = useSecurityStore.getState()

  if (!authorized) {
    security.logEvent(
      'access_denied',
      `Safe withdrawal denied: ${authReason}`,
      `Retrait coffre refusé: ${authReason}`,
      { employeeId, amount }
    )
    return { success: false, reason: authReason }
  }

  const currentBalance = useStoreStateStore.getState().state.safeBalance

  if (currentBalance < amount) {
    return { success: false, reason: 'Insufficient safe balance' }
  }

  useStoreStateStore.setState(s => ({
    state: { ...s.state, safeBalance: s.state.safeBalance - amount },
  }))

  const newBalance = useStoreStateStore.getState().state.safeBalance

  accessLog.push({
    id:         generateAccessId(),
    timestamp:  Date.now(),
    employeeId,
    action:     'withdrawal',
    amount,
    authorized: true,
    reason,
  })

  security.logEvent(
    'safe_opened',
    `Withdrawal: $${amount.toFixed(2)} by ${employeeId} — ${reason ?? 'No reason given'}`,
    `Retrait: ${amount.toFixed(2)}$ par ${employeeId} — ${reason ?? 'Aucune raison'}`,
    { employeeId, amount, reason, newBalance }
  )

  return { success: true, newBalance }
}

// ─────────────────────────────────────────────
// AUDIT
// ─────────────────────────────────────────────

export function getAccessLog(): SafeAccess[] {
  return [...accessLog]
}

export function getRecentAccess(count = 20): SafeAccess[] {
  return accessLog.slice(-count)
}

export function getUnauthorizedAttempts(): SafeAccess[] {
  return accessLog.filter(a => !a.authorized)
}
