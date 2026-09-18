/**
 * 🍁 QUESTS — Missions livraison + collecte
 */
import type { DeliveryContract } from "./types";

export type QuestKind = "collect" | "produce" | "deliver" | "event";

export interface SugarQuest {
  id: string;
  bushId: string;
  kind: QuestKind;
  title: string;
  desc: string;
  targetId?: string;       // productId ou contractId
  quantity?: number;
  reward: number;
  xpReward: number;
  progress: number;
  completed: boolean;
  startedAt: number;
  expiresAt: number | null;
}

export class SugarQuestManager {
  private quests = new Map<string, SugarQuest>();

  createCollectQuest(bushId: string, quantity: number): SugarQuest {
    const q: SugarQuest = {
      id: `q_collect_${Date.now()}`,
      bushId,
      kind: "collect",
      title: `Collecte de ${quantity} seaux`,
      desc: `Récolter ${quantity} seaux d'eau d'érable.`,
      quantity,
      reward: quantity * 3,
      xpReward: quantity * 2,
      progress: 0,
      completed: false,
      startedAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    this.quests.set(q.id, q);
    return q;
  }

  createProduceQuest(bushId: string, quality: string, quantity: number): SugarQuest {
    const q: SugarQuest = {
      id: `q_produce_${Date.now()}`,
      bushId,
      kind: "produce",
      title: `Produire ${quantity} ${quality}`,
      desc: `Produire ${quantity} unités de sirop ${quality}.`,
      quantity,
      reward: quantity * 30,
      xpReward: quantity * 8,
      progress: 0,
      completed: false,
      startedAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    };
    this.quests.set(q.id, q);
    return q;
  }

  createDeliverQuest(bushId: string, contract: DeliveryContract): SugarQuest {
    const q: SugarQuest = {
      id: `q_deliver_${contract.id}`,
      bushId,
      kind: "deliver",
      title: `Livrer ${contract.quantity}× à ${contract.customerName}`,
      desc: `Livrer la commande (${contract.distanceKm} km).`,
      targetId: contract.id,
      quantity: contract.quantity,
      reward: contract.reward,
      xpReward: 15,
      progress: 0,
      completed: false,
      startedAt: Date.now(),
      expiresAt: contract.expiresAt,
    };
    this.quests.set(q.id, q);
    return q;
  }

  advance(questId: string, delta = 1): boolean {
    const q = this.quests.get(questId);
    if (!q || q.completed) return false;
    q.progress += delta;
    if (q.progress >= (q.quantity ?? 1)) {
      q.completed = true;
      return true;
    }
    return false;
  }

  listActive(bushId?: string): SugarQuest[] {
    const now = Date.now();
    return [...this.quests.values()].filter(
      (q) => !q.completed && (!q.expiresAt || q.expiresAt > now) &&
        (!bushId || q.bushId === bushId),
    );
  }

  tick(): number {
    const now = Date.now();
    let expired = 0;
    for (const q of this.quests.values()) {
      if (!q.completed && q.expiresAt && now > q.expiresAt) {
        this.quests.delete(q.id);
        expired++;
      }
    }
    return expired;
  }

  serialize(): SugarQuest[] {
    return [...this.quests.values()];
  }

  restore(data: SugarQuest[]): void {
    this.quests.clear();
    if (Array.isArray(data)) {
      for (const q of data) this.quests.set(q.id, q);
    }
  }
}