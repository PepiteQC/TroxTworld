/**
 * 🍁 NPC WORKERS — Ouvriers PNJ qui travaillent automatiquement
 */
import { SUGAR_CONFIG } from "./config";
import type { ErabliereJob } from "./types";

export interface NpcWorker {
  id: string;
  name: string;
  bushId: string;
  role: ErabliereJob["role"];
  active: boolean;
  /** Timestamp prochain tick */
  nextTickAt: number;
  /** Production par tick (multiplicateur) */
  productionRate: number;
  /** Efficacité 0-100 */
  efficiency: number;
  hiredAt: number;
  wagesOwed: number;
}

const NPC_NAMES = [
  "Jean Tremblay", "Marc Bouchard", "Sophie Lavoie", "Pierre Gagnon",
  "Marie Côté", "Luc Bergeron", "Josée Roy", "Michel Gauthier",
  "Sylvie Pelletier", "Gaétan Lemieux", "Chantal Fortin", "Rémi Caron",
];

export class NpcWorkerManager {
  private workers = new Map<string, NpcWorker>();
  private lastNameIndex = 0;

  /** Crée un ouvrier PNJ */
  hireNpc(bushId: string, role: NpcWorker["role"], hourlyWage: number): NpcWorker {
    const name = NPC_NAMES[this.lastNameIndex++ % NPC_NAMES.length];
    const id = `npc_${bushId}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

    const worker: NpcWorker = {
      id,
      name,
      bushId,
      role,
      active: true,
      nextTickAt: Date.now() + SUGAR_CONFIG.TICK_RATE_MS,
      productionRate: role === "aide_evaporateur" ? 1.0 : 0.7,
      efficiency: 60 + Math.floor(Math.random() * 30),
      hiredAt: Date.now(),
      wagesOwed: 0,
    };
    this.workers.set(id, worker);
    return worker;
  }

  /** Tick global : accumule les salaires dus */
  tick(now: number): void {
    for (const w of this.workers.values()) {
      if (!w.active) continue;
      if (now < w.nextTickAt) continue;

      w.nextTickAt = now + SUGAR_CONFIG.TICK_RATE_MS;

      // Salaire dû pour ce tick (1 second)
      const wagePerMs = (w.productionRate * 20) / (3600 * 1000);
      const earned = wagePerMs * SUGAR_CONFIG.TICK_RATE_MS;
      w.wagesOwed = Math.round((w.wagesOwed + earned) * 100) / 100;
    }
  }

  /** Liste par érablière */
  listByBush(bushId: string): NpcWorker[] {
    return [...this.workers.values()].filter((w) => w.bushId === bushId);
  }

  /** Renvoie tous les ouvriers */
  listAll(): NpcWorker[] {
    return [...this.workers.values()];
  }

  /** Paye les salaires dus (appelé par le système) */
  collectWages(bushId: string): number {
    let total = 0;
    for (const w of this.workers.values()) {
      if (w.bushId !== bushId) continue;
      total += w.wagesOwed;
      w.wagesOwed = 0;
    }
    return Math.round(total * 100) / 100;
  }

  /** Licencie */
  fire(npcId: string): boolean {
    return this.workers.delete(npcId);
  }

  /** Pause / reprise */
  setActive(npcId: string, active: boolean): void {
    const w = this.workers.get(npcId);
    if (w) w.active = active;
  }

  serialize(): unknown[] {
    return [...this.workers.values()];
  }

  restore(data: unknown[]): void {
    this.workers.clear();
    if (!Array.isArray(data)) return;
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const w = row as NpcWorker;
      if (typeof w.id === "string") this.workers.set(w.id, w);
    }
  }
}