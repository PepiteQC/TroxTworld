import type { CorridorApartment } from './types'

const CORRIDOR_WIDTH = 4
const CORRIDOR_LENGTH = 40
const DOOR_SPACING = 4

class CorridorGenerator {
  private apartments: CorridorApartment[] = []

  generateApartments(floor: number, count: number): CorridorApartment[] {
    this.apartments = []

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 'left' : 'right'
      const index = Math.floor(i / 2)
      const zPos = -CORRIDOR_LENGTH / 2 + index * DOOR_SPACING + DOOR_SPACING

      this.apartments.push({
        id: `apt-${floor}-${i + 1}`,
        number: `${floor}${String(i + 1).padStart(2, '0')}`,
        floor,
        side,
        position: [
          side === 'left' ? -CORRIDOR_WIDTH / 2 : CORRIDOR_WIDTH / 2,
          0,
          zPos,
        ],
        isLocked: Math.random() > 0.3,
        occupant: Math.random() > 0.4 ? `Resident ${i + 1}` : null,
        forRent: Math.random() > 0.7,
        rentPrice: 500 + Math.floor(Math.random() * 1500),
      })
    }

    return this.apartments
  }

  getCorridorGeometry() {
    return {
      floor: {
        size: [CORRIDOR_WIDTH, CORRIDOR_LENGTH] as [number, number],
        position: [0, 0, CORRIDOR_LENGTH / 2] as [number, number, number],
      },
      walls: {
        height: 3.5,
      },
    }
  }

  getApartmentDoorPosition(apartment: CorridorApartment): [number, number, number] {
    return [
      apartment.position[0] + (apartment.side === 'left' ? 0.1 : -0.1),
      1.2,
      apartment.position[2],
    ]
  }
}

export const corridorGenerator = new CorridorGenerator()
export type { CorridorApartment }
