import { useSecurityStore } from '../securityStore'
import { isAlarmActive, isAlarmTriggered, getAlarmDisplayText } from '../alarmSystem'

export function useSecurityAlarm() {
  const alarm = useSecurityStore((s) => s.state.alarm)
  const armAlarm = useSecurityStore((s) => s.armAlarm)
  const disarmAlarm = useSecurityStore((s) => s.disarmAlarm)
  const triggerPanic = useSecurityStore((s) => s.triggerPanic)

  return {
    alarm,
    isActive: isAlarmActive(),
    isTriggered: isAlarmTriggered(),
    displayText: getAlarmDisplayText(alarm),
    armAlarm,
    disarmAlarm,
    triggerPanic,
  }
}
