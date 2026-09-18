/**
 * InteriorController.tsx
 * Logique principale de la scène intérieure
 */
import { useRef, useState, useCallback, useEffect, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNPCStore } from './npc/npcStore'
import { useSecurityStore } from './security/securityStore'
import { useTransactionStore } from './storage/transactionStore'
import { detectAndReport } from './security/theftDetection'
import type {
  PlayerInteriorState,
  PlayerInventoryItem,
  InteractionResult,
  AmbientConfig,
  TimeOfDay,
  WeatherOutside,
} from './types'
import type { PaymentMethod } from './storage/types'

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  if (h >= 18 && h < 22) return 'evening'
  return 'night'
}

interface InteriorControllerProps {
  playerWorldRef: MutableRefObject<THREE.Vector3>
  initialMoney?: number
  weather?: WeatherOutside
  onExit?: () => void
  onPrompt?: (label: string | null) => void
  onPlayerState?: (state: PlayerInteriorState) => void
}

export function useInteriorController({
  playerWorldRef,
  initialMoney = 50,
  weather = 'cloudy',
  onExit,
  onPrompt,
  onPlayerState,
}: InteriorControllerProps) {
  const spawnCashier = useNPCStore((s) => s.spawnCashier)
  const spawnCustomer = useNPCStore((s) => s.spawnCustomer)
  const tickNPCs = useNPCStore((s) => s.tick)
  const npcs = useNPCStore((s) => s.getAllNPCs())
  const suspectPlayer = useNPCStore((s) => s.suspectPlayer)
  const logEvent = useSecurityStore((s) => s.logEvent)
  const addToCart = useTransactionStore((s) => s.addToCart)
  const checkout = useTransactionStore((s) => s.checkout)
  const clearCart = useTransactionStore((s) => s.clearCart)

  const [playerState, setPlayerState] = useState<PlayerInteriorState>({
    inventory: [],
    money: initialMoney,
    nearInteraction: null,
    activeInteraction: null,
    isAtCounter: false,
    isInRestrictedZone: false,
    suspicion: 0,
    lastPurchaseTime: null,
  })
  const playerStateRef = useRef(playerState)
  playerStateRef.current = playerState

  const [ambientConfig] = useState<AmbientConfig>({
    timeOfDay: getTimeOfDay(),
    weather,
    musicVolume: 0.35,
    sfxVolume: 0.5,
    lightIntensity: 1.0,
    customerCount: 2,
  })

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [nearLabel, setNearLabel] = useState<string | null>(null)

  useEffect(() => {
    spawnCashier()
    const timers = [
      setTimeout(() => spawnCustomer(), 2000),
      setTimeout(() => spawnCustomer(), 5000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [spawnCashier, spawnCustomer])

  useFrame((_, dt) => {
    tickNPCs(dt)
    void playerWorldRef
  })

  const updatePrompt = useCallback(
    (label: string | null) => {
      setNearLabel(label)
      onPrompt?.(label)
    },
    [onPrompt]
  )

  const handlePickup = useCallback((result: InteractionResult) => {
    if (!result.success || !result.product) return
    setPlayerState((prev) => {
      const existing = prev.inventory.find((i) => i.product.id === result.product!.id)
      const newInventory: PlayerInventoryItem[] = existing
        ? prev.inventory.map((i) =>
            i.product.id === result.product!.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...prev.inventory, { product: result.product!, quantity: 1, pickedAt: Date.now() }]
      return {
        ...prev,
        inventory: newInventory,
        suspicion: Math.min(100, prev.suspicion + 2),
      }
    })
  }, [])

  const handleOpenCheckout = useCallback(() => {
    if (playerStateRef.current.inventory.length === 0) {
      updatePrompt('Aucun article à payer')
      return
    }
    clearCart()
    playerStateRef.current.inventory.forEach((item) => {
      addToCart(item.product, item.quantity)
    })
    setCheckoutOpen(true)
    updatePrompt(null)
  }, [clearCart, addToCart, updatePrompt])

  const handlePay = useCallback(
    (method: PaymentMethod) => {
      const { money, inventory } = playerStateRef.current
      const cartTotal = useTransactionStore.getState().cartTotal
      if (money < cartTotal) {
        setCheckoutOpen(false)
        return
      }
      const tx = checkout(method, money)
      if (!tx) {
        setCheckoutOpen(false)
        return
      }
      logEvent(
        'shift_end',
        `Purchase: $${tx.total.toFixed(2)} via ${method}`,
        `Achat: ${tx.total.toFixed(2)}$ via ${method}`,
        { receiptNo: tx.receiptNo, items: inventory.length }
      )
      setPlayerState((prev) => ({
        ...prev,
        inventory: [],
        money: Math.max(0, prev.money - tx.total + (tx.changeDue ?? 0)),
        suspicion: Math.max(0, prev.suspicion - 30),
        lastPurchaseTime: Date.now(),
      }))
      setCheckoutOpen(false)
    },
    [checkout, logEvent]
  )

  const handleCancelCheckout = useCallback(() => {
    clearCart()
    setCheckoutOpen(false)
  }, [clearCart])

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerState((prev) => {
        const { inventory, suspicion } = prev
        if (inventory.length === 0) return prev
        const timeSincePickup = Math.min(...inventory.map((i) => Date.now() - i.pickedAt))
        const increase = timeSincePickup > 30000 ? 3 : 0
        if (suspicion + increase >= 70) {
          const cashier = useNPCStore.getState().getCashier()
          if (cashier) suspectPlayer(cashier.id, 'player')
          detectAndReport(
            {
              entityId: 'player',
              position: [0, 0, 0],
              timeInStore: timeSincePickup / 1000,
              itemsViewed: [],
              itemsTaken: inventory.map((i) => i.product.id),
              hasBag: false,
              isRunning: false,
              nearExit: false,
            },
            'cam_entrance_left'
          )
        }
        return { ...prev, suspicion: Math.min(100, suspicion + increase) }
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [suspectPlayer])

  useEffect(() => {
    onPlayerState?.(playerState)
  }, [playerState, onPlayerState])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === 'KeyF') onExit?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onExit])

  return {
    playerState,
    ambientConfig,
    npcs,
    nearLabel,
    checkoutOpen,
    handlePickup,
    handleOpenCheckout,
    handlePay,
    handleCancelCheckout,
    updatePrompt,
  }
}
