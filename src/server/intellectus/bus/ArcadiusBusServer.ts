// server/intellectus/bus/ArcadiusBusServer.ts
// ETHERWORLD RP — TroxTetherworld Platinum Server-side Arcadius Event Bus

import type { BusEvent } from '../types';

type EventListener = (event: BusEvent) => void | Promise<void>;

export class ArcadiusBusServer {
  public history: BusEvent[] = [];
  private maxHistory = 500;
  private listeners: Map<string, EventListener[]> = new Map();

  /**
   * Subscribe to a specific event or wildcard event pattern (e.g. 'system:*')
   */
  public on(eventPattern: string, listener: EventListener): () => void {
    if (!this.listeners.has(eventPattern)) {
      this.listeners.set(eventPattern, []);
    }
    this.listeners.get(eventPattern)!.push(listener);

    return () => {
      const list = this.listeners.get(eventPattern);
      if (list) {
        this.listeners.set(eventPattern, list.filter(l => l !== listener));
      }
    };
  }

  /**
   * Emit an event through the server bus
   */
  public async emit(
    type: string,
    payload: any = {},
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    source = 'Server'
  ): Promise<BusEvent> {
    const event: BusEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      payload,
      priority,
      source,
      timestamp: Date.now(),
    };

    // Store in history
    this.history.unshift(event);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    // Match listeners (exact + wildcard 'system:*')
    const matchedListeners: EventListener[] = [];
    for (const [pattern, list] of this.listeners.entries()) {
      if (pattern === type || pattern === '*' || (pattern.endsWith(':*') && type.startsWith(pattern.slice(0, -1)))) {
        matchedListeners.push(...list);
      }
    }

    // Trigger listeners
    for (const listener of matchedListeners) {
      try {
        await listener(event);
      } catch (err) {
        console.error(`[ArcadiusBusServer] Listener error for event '${type}':`, err);
      }
    }

    return event;
  }

  /**
   * Retrieve event history filtered by criteria
   */
  public getHistory(filter?: { type?: string; priority?: string; since?: number | string }): BusEvent[] {
    if (!filter) return [...this.history];

    return this.history.filter(evt => {
      if (filter.type && !evt.type.toLowerCase().includes(filter.type.toLowerCase())) return false;
      if (filter.priority && evt.priority !== filter.priority) return false;
      if (filter.since) {
        const sinceTs = typeof filter.since === 'number' ? filter.since : new Date(filter.since).getTime();
        if (!isNaN(sinceTs) && evt.timestamp < sinceTs) return false;
      }
      return true;
    });
  }

  /**
   * Clear event history buffer
   */
  public clearHistory(): number {
    const count = this.history.length;
    this.history = [];
    return count;
  }
}
