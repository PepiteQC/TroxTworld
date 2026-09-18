import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

// Room is at [60, 4, -150]
const ROOM_CENTER: [number, number, number] = [60, 5.7, -147]

const LOCATIONS: Record<string, [number, number, number]> = {
  apartment:  ROOM_CENTER,
  spawn:      ROOM_CENTER,
  couchetard: [18, 1.7, -35],
  burgerking: [-25, 1.7, -105],
  hotel:      [55, 1.7, -165],
  church:     [60, 1.7, -60],
  farm1:      [80, 1.7, 140],
  farm2:      [-70, 1.7, -290],
  bridge:     [0, 5, -130],
  aerial:     [0, 100, 50],
  route:      [5, 1.7, -20],
}

export function TeleportHandler({ target, onComplete }: { target: string | null; onComplete: () => void }) {
  const { camera } = useThree()

  useEffect(() => {
    if (target) {
      const pos = LOCATIONS[target] || LOCATIONS.apartment
      camera.position.set(pos[0], pos[1], pos[2])
      onComplete()
    }
  }, [target, camera, onComplete])

  return null
}
