// src/lib/etherworld/hotelStore.ts
import { create } from 'zustand'

// ══════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════

interface HotelRoom {
  roomId: string
  locked: boolean
  occupant: string | null
  keycardId: string | null
  floor: number
  roomNumber: number
}

interface HotelStoreState {
  rooms: Record<string, HotelRoom>
  // Actions
  checkIn: (roomId: string, playerId: string, keycardId: string) => void
  checkOut: (roomId: string) => void
  unlockWithKeycard: (roomId: string, keycardId: string) => boolean
  unlockWithCode: (roomId: string, code: string) => boolean
  lockRoom: (roomId: string) => void
  getRoomInfo: (roomId: string) => HotelRoom | null
  isRoomLocked: (roomId: string) => boolean
  initRoom: (roomId: string, floor: number, roomNumber: number) => void
}

// ══════════════════════════════════════════
// STORE
// ══════════════════════════════════════════

export const useHotelStore = create<HotelStoreState>((set, get) => ({
  rooms: {},

  // Initialiser une chambre (appelé au chargement du couloir)
  initRoom: (roomId, floor, roomNumber) => {
    const existing = get().rooms[roomId]
    if (!existing) {
      set((state) => ({
        rooms: {
          ...state.rooms,
          [roomId]: {
            roomId,
            locked: true,
            occupant: null,
            keycardId: null,
            floor,
            roomNumber,
          },
        },
      }))
    }
  },

  // Check-in: assigner une chambre à un joueur avec une carte
  checkIn: (roomId, playerId, keycardId) => {
    set((state) => ({
      rooms: {
        ...state.rooms,
        [roomId]: {
          roomId,
          locked: false,
          occupant: playerId,
          keycardId,
          floor: state.rooms[roomId]?.floor ?? 0,
          roomNumber: state.rooms[roomId]?.roomNumber ?? 0,
        },
      },
    }))
    console.log(`✅ Check-in: ${playerId} → Chambre ${roomId}`)
  },

  // Check-out: libérer la chambre
  checkOut: (roomId) => {
    set((state) => ({
      rooms: {
        ...state.rooms,
        [roomId]: {
          ...state.rooms[roomId],
          locked: true,
          occupant: null,
          keycardId: null,
        },
      },
    }))
    console.log(`🚪 Check-out: Chambre ${roomId} libérée`)
  },

  // Déverrouiller avec carte magnétique
  unlockWithKeycard: (roomId, keycardId) => {
    const room = get().rooms[roomId]
    if (!room) {
      console.log(`❌ Chambre ${roomId} introuvable`)
      return false
    }
    if (room.keycardId === keycardId) {
      set((state) => ({
        rooms: {
          ...state.rooms,
          [roomId]: { ...state.rooms[roomId], locked: false },
        },
      }))
      console.log(`✅ Carte magnétique acceptée: ${roomId}`)

      // Auto-verrouillage après 5 secondes
      setTimeout(() => {
        get().lockRoom(roomId)
      }, 5000)

      return true
    }
    console.log(`❌ Carte non valide pour ${roomId}`)
    return false
  },

  // Déverrouiller avec code numpad
  unlockWithCode: (roomId, code) => {
    const room = get().rooms[roomId]
    // Le code = numéro de chambre sur 4 chiffres
    const expected = String(room?.roomNumber ?? 0).padStart(4, '0')
    if (code === expected) {
      set((state) => ({
        rooms: {
          ...state.rooms,
          [roomId]: { ...state.rooms[roomId], locked: false },
        },
      }))
      console.log(`✅ Code accepté: ${roomId}`)

      setTimeout(() => {
        get().lockRoom(roomId)
      }, 5000)

      return true
    }
    console.log(`❌ Code incorrect pour ${roomId}: attendu ${expected}, reçu ${code}`)
    return false
  },

  // Verrouiller une chambre
  lockRoom: (roomId) => {
    set((state) => ({
      rooms: {
        ...state.rooms,
        [roomId]: { ...state.rooms[roomId], locked: true },
      },
    }))
  },

  // Obtenir info d'une chambre
  getRoomInfo: (roomId) => {
    return get().rooms[roomId] ?? null
  },

  // Vérifier si verrouillée
  isRoomLocked: (roomId) => {
    return get().rooms[roomId]?.locked ?? true
  },
}))