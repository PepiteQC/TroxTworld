import { useSecurityStore } from '../securityStore'
import { detectAndReport, catchThief, getTheftStats } from '../theftDetection'

export function useTheftDetection() {
  const theftEvents = useSecurityStore((s) => s.state.theftEvents)
  const reportTheft = useSecurityStore((s) => s.reportTheft)
  const resolveTheft = useSecurityStore((s) => s.resolveTheft)

  return {
    theftEvents,
    reportTheft,
    resolveTheft,
    detectAndReport,
    catchThief,
    stats: getTheftStats(),
  }
}
