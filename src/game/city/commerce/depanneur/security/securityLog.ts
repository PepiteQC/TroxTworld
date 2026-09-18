/**
 * securityLog.ts
 * Filtrage avancé, export, et formatting du journal sécurité
 */

import { useSecurityStore } from './securityStore'
import type {
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
} from './types'

// ─────────────────────────────────────────────
// FILTRAGE
// ─────────────────────────────────────────────

export interface LogFilter {
  types?:       SecurityEventType[]
  severities?:  SecuritySeverity[]
  dateFrom?:    number
  dateTo?:      number
  searchText?:  string
  onlyUnacknowledged?: boolean
  limit?:       number
}

export function filterLog(filter: LogFilter = {}): SecurityEvent[] {
  let events = useSecurityStore.getState().state.securityLog

  if (filter.types && filter.types.length > 0) {
    events = events.filter(e => filter.types!.includes(e.type))
  }

  if (filter.severities && filter.severities.length > 0) {
    events = events.filter(e => filter.severities!.includes(e.severity))
  }

  if (filter.dateFrom) {
    events = events.filter(e => e.timestamp >= filter.dateFrom!)
  }

  if (filter.dateTo) {
    events = events.filter(e => e.timestamp <= filter.dateTo!)
  }

  if (filter.searchText) {
    const term = filter.searchText.toLowerCase()
    events = events.filter(e =>
      e.description.toLowerCase().includes(term) ||
      e.descriptionFr.toLowerCase().includes(term)
    )
  }

  if (filter.onlyUnacknowledged) {
    events = events.filter(e => !e.acknowledged)
  }

  if (filter.limit) {
    events = events.slice(0, filter.limit)
  }

  return events
}

// ─────────────────────────────────────────────
// FORMATAGE
// ─────────────────────────────────────────────

export function formatEvent(event: SecurityEvent, locale: 'en' | 'fr' = 'fr'): string {
  const date = new Date(event.timestamp)
  const time = date.toLocaleTimeString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const dateStr = date.toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA')
  const desc = locale === 'fr' ? event.descriptionFr : event.description

  const sevIcon = {
    info:     'ℹ️',
    warning:  '⚠️',
    alert:    '🚨',
    critical: '🔴',
  }[event.severity]

  return `[${dateStr} ${time}] ${sevIcon} ${desc}`
}

export function formatLogForExport(
  events: SecurityEvent[],
  locale: 'en' | 'fr' = 'fr'
): string {
  const header = locale === 'fr'
    ? '═══ JOURNAL DE SÉCURITÉ — DÉPANNEUR COUCHE-TARD ═══'
    : '═══ SECURITY LOG — DÉPANNEUR COUCHE-TARD ═══'

  const lines = events.map(e => formatEvent(e, locale))

  return [
    header,
    `Généré: ${new Date().toLocaleString(locale === 'fr' ? 'fr-CA' : 'en-CA')}`,
    `Total: ${events.length} événements`,
    '─'.repeat(55),
    ...lines,
    '─'.repeat(55),
  ].join('\n')
}

// ─────────────────────────────────────────────
// STATISTIQUES
// ─────────────────────────────────────────────

export interface LogStats {
  total:             number
  bySeverity:        Record<SecuritySeverity, number>
  byType:            Partial<Record<SecurityEventType, number>>
  last24h:           number
  unacknowledged:    number
  mostFrequentType:  SecurityEventType | null
}

export function getLogStats(): LogStats {
  const events = useSecurityStore.getState().state.securityLog
  const now = Date.now()
  const oneDayAgo = now - 86_400_000

  const bySeverity: Record<SecuritySeverity, number> = {
    info: 0, warning: 0, alert: 0, critical: 0,
  }

  const byType: Partial<Record<SecurityEventType, number>> = {}
  let unacknowledged = 0
  let last24h = 0

  events.forEach(e => {
    bySeverity[e.severity]++
    byType[e.type] = (byType[e.type] ?? 0) + 1
    if (!e.acknowledged) unacknowledged++
    if (e.timestamp >= oneDayAgo) last24h++
  })

  let mostFrequentType: SecurityEventType | null = null
  let maxCount = 0
  for (const [type, count] of Object.entries(byType)) {
    if (count > maxCount) {
      maxCount = count
      mostFrequentType = type as SecurityEventType
    }
  }

  return {
    total: events.length,
    bySeverity,
    byType,
    last24h,
    unacknowledged,
    mostFrequentType,
  }
}
