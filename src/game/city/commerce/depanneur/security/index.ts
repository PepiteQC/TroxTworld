/**
 * security/index.ts
 * Barrel export — système de sécurité du dépanneur
 */

// ── Types ──
export type {
  AlarmState,
  AlarmZone,
  AlarmZoneConfig,
  AlarmConfig,
  CameraId,
  CameraStatus,
  CameraConfig,
  CameraEvent,
  TheftRisk,
  SuspiciousBehavior,
  TheftEvent,
  TheftStats,
  SafeAction,
  SafeAccess,
  SafeConfig,
  LockId,
  LockState,
  LockConfig,
  SecurityEventType,
  SecuritySeverity,
  SecurityEvent,
  SecuritySystemState,
} from './types'

// ── Store central ──
export { useSecurityStore } from './securityStore'
export type { SecuritySummary } from './securityStore'

// ── Sous-systèmes ──
export {
  armForClosing,
  armForStay,
  disarm,
  triggerZone,
  panicButton,
  isAlarmActive,
  isAlarmTriggered,
  getAlarmDisplayText,
  clearAllTimers,
} from './alarmSystem'

export {
  analyzeEntity,
  detectAndReport,
  catchThief,
  getTheftStats,
} from './theftDetection'

export {
  openSafe,
  closeSafe,
  deposit,
  withdraw,
  getAccessLog,
  getRecentAccess,
  getUnauthorizedAttempts,
} from './safeSystem'

export {
  getClosingChecklist,
  executeClosingSequence,
  executeOpeningSequence,
  getAllLockStates,
  getUnsecuredLocks,
  isFullySecured,
} from './lockSystem'

export {
  filterLog,
  formatEvent,
  formatLogForExport,
  getLogStats,
} from './securityLog'

// ── Hooks React ──
export { useSecurityAlarm } from './hooks/useSecurityAlarm'
export { useTheftDetection } from './hooks/useTheftDetection'
export { useCameraFeed } from './hooks/useCameraFeed'
