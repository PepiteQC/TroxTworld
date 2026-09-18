/**
 * 🍁 ECONOMY — Prix marché, contrats, rentabilité
 */
import { SUGAR_CONFIG } from "./config";
import { mapleProductById, type MapleProduct } from "./catalog";
import type { DeliveryContract } from "./types";

export interface MarketConditions {
  /** Multiplicateur de prix global (0.5 - 2.0) */
  priceMultiplier: number;
  /** Demande par catégorie de produit */
  demandByCategory: Record<string, number>;
  /** Dernière mise à jour */
  updatedAt: number;
  /** Saison en cours */
  season: string;
}

export class MapleEconomy {
  private conditions: MarketConditions = {
    priceMultiplier: 1.0,
    demandByCategory: {
      raw: 1.0,
      finished: 1.0,
      derivative: 1.0,
      touristic: 1.0,
    },
    updatedAt: Date.now(),
    season: "printemps",
  };

  private contracts = new Map<string, DeliveryContract>();

  /** 🆕 Recalcule les conditions selon la saison */
  refreshConditions(season: string, weather: string): void {
    const seasonMult =
      season === "printemps" ? SUGAR_CONFIG.ECONOMY.HIGH_SEASON_MULT : 1.0;
    const weatherMult =
      SUGAR_CONFIG.WEATHER_EFFECTS[weather] ?? 1.0;

    this.conditions = {
      priceMultiplier: seasonMult * weatherMult,
      demandByCategory: {
        raw: season === "printemps" ? 1.3 : 0.8,
        finished: season === "printemps" ? 1.5 : 0.9,
        derivative: season === "printemps" ? 1.2 : 1.0,
        touristic: season === "printemps" ? 1.6 : 0.7,
      },
      updatedAt: Date.now(),
      season,
    };
  }

  /** Prix final d'un produit */
  getPrice(productId: string): number {
    const p = mapleProductById(productId);
    if (!p) return 0;
    const catMult = this.conditions.demandByCategory[p.category] ?? 1.0;
    return Math.round(p.basePrice * this.conditions.priceMultiplier * catMult * 100) / 100;
  }

  /** Prix de vente (60% du prix d'achat) */
  getSellPrice(productId: string): number {
    const p = mapleProductById(productId);
    if (!p) return 0;
    return Math.max(1, Math.round(this.getPrice(productId) * 0.6 * 100) / 100);
  }

  /** Crée un contrat de livraison */
  createContract(opts: {
    bushId: string;
    customerId: string;
    customerName: string;
    productId: string;
    quantity: number;
    targetX: number;
    targetZ: number;
    fromX: number;
    fromZ: number;
  }): DeliveryContract | null {
    const p = mapleProductById(opts.productId);
    if (!p) return null;

    const distanceKm = Math.hypot(opts.targetX - opts.fromX, opts.targetZ - opts.fromZ) / 1000;
    const unitPrice = this.getPrice(opts.productId);
    const reward = Math.round(
      (opts.quantity * unitPrice +
        SUGAR_CONFIG.QUESTS.DELIVERY_BASE_REWARD +
        distanceKm * SUGAR_CONFIG.QUESTS.DELIVERY_BONUS_PER_KM) * 100,
    ) / 100;

    const contract: DeliveryContract = {
      id: `ct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bushId: opts.bushId,
      customerId: opts.customerId,
      customerName: opts.customerName,
      productId: opts.productId,
      quantity: opts.quantity,
      targetX: opts.targetX,
      targetZ: opts.targetZ,
      reward,
      bonusPerKm: SUGAR_CONFIG.QUESTS.DELIVERY_BONUS_PER_KM,
      distanceKm: Math.round(distanceKm * 100) / 100,
      createdAt: Date.now(),
      expiresAt: Date.now() + SUGAR_CONFIG.QUESTS.CONTRACT_TIMEOUT_MS,
      status: "pending",
      assignedTo: null,
      deliveredAt: null,
    };
    this.contracts.set(contract.id, contract);
    return contract;
  }

  /** Liste des contrats actifs */
  listActiveContracts(bushId?: string): DeliveryContract[] {
    const now = Date.now();
    return [...this.contracts.values()].filter(
      (c) => c.status !== "delivered" && c.status !== "failed" && c.expiresAt > now &&
        (!bushId || c.bushId === bushId),
    );
  }

  /** Assigner un contrat */
  assignContract(id: string, driverId: string): boolean {
    const c = this.contracts.get(id);
    if (!c || c.status !== "pending") return false;
    c.status = "assigned";
    c.assignedTo = driverId;
    return true;
  }

  /** Compléter */
  completeContract(id: string, driverId: string): { ok: boolean; reward: number } {
    const c = this.contracts.get(id);
    if (!c || c.assignedTo !== driverId) return { ok: false, reward: 0 };
    c.status = "delivered";
    c.deliveredAt = Date.now();
    return { ok: true, reward: c.reward };
  }

  /** Expiration auto */
  tick(): number {
    const now = Date.now();
    let expired = 0;
    for (const c of this.contracts.values()) {
      if (c.status === "pending" || c.status === "assigned") {
        if (now > c.expiresAt) {
          c.status = "failed";
          expired++;
        }
      }
    }
    return expired;
  }

  /** Snapshot */
  serialize() {
    return {
      conditions: this.conditions,
      contracts: [...this.contracts.values()],
    };
  }

  restore(data: { conditions?: MarketConditions; contracts?: DeliveryContract[] }): void {
    if (data?.conditions) this.conditions = data.conditions;
    this.contracts.clear();
    if (Array.isArray(data?.contracts)) {
      for (const c of data.contracts) this.contracts.set(c.id, c);
    }
  }

  getConditions(): MarketConditions {
    return { ...this.conditions };
  }
}