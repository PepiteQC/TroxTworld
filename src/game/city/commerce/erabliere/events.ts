/**
 * 🍁 EVENTS — Cabane à sucre ouverte au public (printemps)
 */
import { SUGAR_CONFIG } from "./config";
import type { PublicEvent } from "./types";

export class SugarEventManager {
  private events = new Map<string, PublicEvent>();

  /** Ouvre un événement public pour une érablière */
  openEvent(bushId: string): PublicEvent {
    const now = Date.now();
    const ev: PublicEvent = {
      id: `ev_${bushId}_${now}`,
      bushId,
      startedAt: now,
      endsAt: now + SUGAR_CONFIG.EVENTS.EVENT_DURATION_MS,
      visitors: [],
      revenue: 0,
      isOpen: true,
      ticketsSold: 0,
    };
    this.events.set(ev.id, ev);
    return ev;
  }

  /** Ferme un événement */
  closeEvent(eventId: string): boolean {
    const ev = this.events.get(eventId);
    if (!ev) return false;
    ev.isOpen = false;
    return true;
  }

  /** Un visiteur entre */
  addVisitor(eventId: string, playerId: string, paid = true): { ok: boolean; reason?: string } {
    const ev = this.events.get(eventId);
    if (!ev || !ev.isOpen) return { ok: false, reason: "Événement fermé" };
    if (ev.visitors.length >= SUGAR_CONFIG.EVENTS.MAX_VISITORS) {
      return { ok: false, reason: "Capacité maximale atteinte" };
    }
    if (ev.visitors.includes(playerId)) return { ok: false, reason: "Déjà présent" };
    ev.visitors.push(playerId);
    if (paid) {
      ev.ticketsSold++;
      ev.revenue += SUGAR_CONFIG.EVENTS.REVENUE_PER_VISITOR;
    }
    return { ok: true };
  }

  /** Un visiteur sort */
  removeVisitor(eventId: string, playerId: string): void {
    const ev = this.events.get(eventId);
    if (!ev) return;
    ev.visitors = ev.visitors.filter((v) => v !== playerId);
  }

  /** Tick : ferme les events expirés */
  tick(): number {
    const now = Date.now();
    let closed = 0;
    for (const ev of this.events.values()) {
      if (ev.isOpen && now > ev.endsAt) {
        ev.isOpen = false;
        closed++;
      }
    }
    return closed;
  }

  listActive(bushId?: string): PublicEvent[] {
    return [...this.events.values()].filter(
      (ev) => ev.isOpen && (!bushId || ev.bushId === bushId),
    );
  }

  serialize(): PublicEvent[] {
    return [...this.events.values()];
  }

  restore(data: PublicEvent[]): void {
    this.events.clear();
    if (Array.isArray(data)) {
      for (const ev of data) this.events.set(ev.id, ev);
    }
  }
}