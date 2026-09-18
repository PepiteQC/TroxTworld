import { useSecurityStore } from '../securityStore'
import type { CameraId } from '../types'

export function useCameraFeed(cameraId?: CameraId) {
  const cameras = useSecurityStore((s) => s.state.cameras)
  const setCameraStatus = useSecurityStore((s) => s.setCameraStatus)
  const toggleRecording = useSecurityStore((s) => s.toggleRecording)

  const camera = cameraId ? cameras.find((c) => c.id === cameraId) : null

  return {
    cameras,
    activeCamera: camera,
    setCameraStatus,
    toggleRecording,
  }
}
