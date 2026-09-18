/**
 * inventoryStore.ts
 * Gestion des stocks du dépanneur
 */
import { create } from 'zustand'
import type { Product } from './types'

interface InventoryItem {
  product: Product
  stock: number
}

interface InventoryStoreState {
  inventory: Record<string, InventoryItem>
  getProduct: (id: string) => Product | undefined
  getStock: (id: string) => number
  incrementStock: (id: string, qty: number) => void
  decrementStock: (id: string, qty: number) => void
}

export const useInventoryStore = create<InventoryStoreState>((set, get) => ({
  inventory: {},
  getProduct: (id) => get().inventory[id]?.product,
  getStock: (id) => get().inventory[id]?.stock ?? 0,
  incrementStock: (id, qty) => set((s) => {
    const item = s.inventory[id]
    if (!item) return s
    return {
      inventory: {
        ...s.inventory,
        [id]: { ...item, stock: item.stock + qty },
      },
    }
  }),
  decrementStock: (id, qty) => set((s) => {
    const item = s.inventory[id]
    if (!item) return s
    return {
      inventory: {
        ...s.inventory,
        [id]: { ...item, stock: Math.max(0, item.stock - qty) },
      },
    }
  }),
}))
