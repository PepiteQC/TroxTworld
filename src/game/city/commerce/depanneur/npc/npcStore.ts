import { create } from 'zustand'
import type { NPCState } from '../types'

interface NPCStoreState {
  npcs: NPCState[]
  spawnCashier: () => void
  spawnCustomer: () => void
  tick: (dt: number) => void
  getAllNPCs: () => NPCState[]
  getCashier: () => NPCState | undefined
  suspectPlayer: (npcId: string, playerId: string) => void
}

const makeNPC = (role: NPCState['role'], index = 0): NPCState => ({
  id: `${role}-${Date.now()}-${index}`,
  name: role === 'cashier' ? 'Caissier Couche-Tard' : `Client ${index + 1}`,
  role,
  mood: 'neutral',
  action: role === 'cashier' ? 'working' : 'browsing',
  position: role === 'cashier' ? [0, 0, -4] : [index % 2 ? 2 : -2, 0, index * 2],
  rotation: 0,
  isAvailable: true,
  suspicionOf: [],
})

export const useNPCStore = create<NPCStoreState>((set, get) => ({
  npcs: [],
  spawnCashier: () => set((s) => s.npcs.some((n) => n.role === 'cashier') ? s : { npcs: [...s.npcs, makeNPC('cashier')] }),
  spawnCustomer: () => set((s) => ({ npcs: [...s.npcs, makeNPC('customer', s.npcs.length)] })),
  tick: (_dt) => undefined,
  getAllNPCs: () => get().npcs,
  getCashier: () => get().npcs.find((n) => n.role === 'cashier'),
  suspectPlayer: (npcId, playerId) => set((s) => ({
    npcs: s.npcs.map((npc) => npc.id === npcId
      ? { ...npc, mood: 'suspicious', action: 'watching', suspicionOf: [...new Set([...npc.suspicionOf, playerId])] }
      : npc),
  })),
}))

export default useNPCStore
