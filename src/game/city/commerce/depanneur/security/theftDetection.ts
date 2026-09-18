/**
 * theftDetection.ts
 * Système de détection de vol à l'étalage
 * - Analyse comportement NPC/joueur
 * - Scoring de risque
 * - Alerte automatique
 * - Intégration caméras
 */

import { useSecurityStore } from './securityStore'
import { useInventoryStore } from '../storage/inventoryStore'
import type {
  TheftRisk,
  SuspiciousBehavior,
  TheftEvent,
  TheftStats,
  CameraId,
} from './types'

// ─────────────────────────────────────────────
// RISK SCORING
// ─────────────────────────────────────────────

const BEHAVIOR_SCORES: Record<SuspiciousBehavior, number> = {
  loitering:     15,
  concealment:   40,
  bag_stuffing:  50,
  tag_removal:   35,
  distraction:   25,
  rush_exit:     45,
  return_fraud:  30,
  price_swap:    20,
}

function calculateRisk(behaviors: SuspiciousBehavior[]): TheftRisk {
  const score = behaviors.reduce((total, b) => total + (BEHAVIOR_SCORES[b] ?? 0), 0)

  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  if (score >= 20) return 'low'
  return 'none'
}

// ─────────────────────────────────────────────
// DETECTION ENGINE
// ─────────────────────────────────────────────

interface DetectionContext {
  entityId:    string           // ID du NPC ou joueur
  position:    [number, number, number]
  timeInStore: number           // secondes
  itemsViewed: string[]         // productIds regardés
  itemsTaken:  string[]         // productIds pris (non scannés)
  hasBag:      boolean
  isRunning:   boolean
  nearExit:    boolean
}

export function analyzeEntity(ctx: DetectionContext): {
  behaviors: SuspiciousBehavior[]
  risk:      TheftRisk
  shouldAlert: boolean
} {
  const behaviors: SuspiciousBehavior[] = []

  // Traîner longtemps sans acheter (> 5 min)
  if (ctx.timeInStore > 300 && ctx.itemsTaken.length === 0) {
    behaviors.push('loitering')
  }

  // Prendre des items sans scanner
  if (ctx.itemsTaken.length > 0) {
    if (ctx.hasBag) {
      behaviors.push('bag_stuffing')
    } else {
      behaviors.push('concealment')
    }
  }

  // Courir vers la sortie avec des items non scannés
  if (ctx.isRunning && ctx.nearExit && ctx.itemsTaken.length > 0) {
    behaviors.push('rush_exit')
  }

  // Regarder beaucoup sans prendre (possible repérage)
  if (ctx.itemsViewed.length > 10 && ctx.itemsTaken.length === 0 && ctx.timeInStore > 120) {
    behaviors.push('loitering')
  }

  const risk = calculateRisk(behaviors)
  const shouldAlert = risk === 'high' || risk === 'medium'

  return { behaviors, risk, shouldAlert }
}

// ─────────────────────────────────────────────
// REPORT THEFT — Wrapper haut niveau
// ─────────────────────────────────────────────

export function detectAndReport(
  ctx: DetectionContext,
  cameraId?: CameraId
): TheftEvent | null {
  const { behaviors, risk, shouldAlert } = analyzeEntity(ctx)

  if (!shouldAlert) return null

  // Calculer la perte estimée
  const inventory = useInventoryStore.getState()
  let estimatedLoss = 0

  ctx.itemsTaken.forEach(productId => {
    const product = inventory.getProduct(productId)
    if (product) estimatedLoss += product.price
  })

  const event = useSecurityStore.getState().reportTheft({
    behaviors,
    risk,
    productIds:    ctx.itemsTaken,
    estimatedLoss: Math.round(estimatedLoss * 100) / 100,
    cameraId,
  })

  // Si risque élevé, déclencher caméra motion
  if (risk === 'high' && cameraId) {
    useSecurityStore.getState().reportCameraEvent(
      cameraId,
      'theft_suspect',
      `High-risk theft behavior detected: ${behaviors.join(', ')}`
    )
  }

  return event
}

// ─────────────────────────────────────────────
// CAUGHT — Vol en flagrant délit
// ─────────────────────────────────────────────

export function catchThief(
  entityId: string,
  productIds: string[]
): TheftEvent {
  const inventory = useInventoryStore.getState()
  let totalValue = 0

  productIds.forEach(id => {
    const product = inventory.getProduct(id)
    if (product) {
      totalValue += product.price
      // Remettre le stock
      inventory.incrementStock(id, 1)
    }
  })

  const event = useSecurityStore.getState().reportTheft({
    behaviors:     ['concealment', 'rush_exit'],
    risk:          'caught',
    productIds,
    estimatedLoss: 0, // 0 car récupéré
    cameraId:      undefined,
  })

  // Résoudre immédiatement comme récupéré
  useSecurityStore.getState().resolveTheft(event.id, 'recovered', `Caught in act. Value: $${totalValue}`)

  return event
}

// ─────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────

export function getTheftStats(): TheftStats {
  const { theftEvents } = useSecurityStore.getState().state

  const totalIncidents = theftEvents.length
  const totalLoss = theftEvents
    .filter(t => t.resolution !== 'recovered' && t.resolution !== 'false_alarm')
    .reduce((s, t) => s + t.estimatedLoss, 0)

  const recoveredValue = theftEvents
    .filter(t => t.resolution === 'recovered')
    .reduce((s, t) => s + t.estimatedLoss, 0)

  // Top produits volés
  const productCounts = new Map<string, number>()
  theftEvents.forEach(t => {
    t.productIds.forEach(pid => {
      productCounts.set(pid, (productCounts.get(pid) ?? 0) + 1)
    })
  })

  const topStolenProducts = Array.from(productCounts.entries())
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Tendance mensuelle
  const monthlyMap = new Map<string, { incidents: number; loss: number }>()
  theftEvents.forEach(t => {
    const month = new Date(t.timestamp).toISOString().slice(0, 7)
    const prev = monthlyMap.get(month) ?? { incidents: 0, loss: 0 }
    monthlyMap.set(month, {
      incidents: prev.incidents + 1,
      loss:      prev.loss + t.estimatedLoss,
    })
  })

  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    totalIncidents,
    totalLoss:     Math.round(totalLoss * 100) / 100,
    recoveredValue: Math.round(recoveredValue * 100) / 100,
    topStolenProducts,
    monthlyTrend,
  }
}
