/**
 * storeStateStore.ts
 * État financier et physique du magasin (caisses, coffre)
 */
import { create } from 'zustand'

export interface StoreState {
  register1Balance: number
  register2Balance: number
  safeBalance: number
  isOpen: boolean
}

interface StoreStateStore {
  state: StoreState
  getRegisterBalance: (regNum: 1 | 2) => number
  transferToSafe: (fromRegister: 1 | 2, amount: number) => boolean
}

export const useStoreStateStore = create<StoreStateStore>((set, get) => ({
  state: {
    register1Balance: 300,
    register2Balance: 300,
    safeBalance: 1500,
    isOpen: true,
  },
  getRegisterBalance: (regNum) => {
    return regNum === 1 ? get().state.register1Balance : get().state.register2Balance
  },
  transferToSafe: (fromRegister, amount) => {
    const { state } = get()
    const regBal = fromRegister === 1 ? state.register1Balance : state.register2Balance
    if (regBal < amount) return false

    set({
      state: {
        ...state,
        register1Balance: fromRegister === 1 ? state.register1Balance - amount : state.register1Balance,
        register2Balance: fromRegister === 2 ? state.register2Balance - amount : state.register2Balance,
        safeBalance: state.safeBalance + amount,
      },
    })
    return true
  },
}))
