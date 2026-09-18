// server/intellectus/Arcadius.ts
// ETHERWORLD RP — TroxT Arcadius High-Speed Event Bus

export interface ArcadiusEvent {
  eventId: string;
  channel: string;
  type: string;
  payload: any;
  priority: 'urgent' | 'high' | 'normal' | 'low' | 'background' | 'critical';
  sourceAgent: string;
  targetAgent?: string;
  timestamp: number;
}

export interface ArcadiusHistoryRecord {
  event: ArcadiusEvent;
  handledBy: string[];
  durationMs: number;
  errors: Array<{ agentName: string; error: string }>;
}

export class ArcadiusBus {
  private listeners = new Map<string, Array<{ id: string; fn: (event: ArcadiusEvent) => void }>>();
  private history: ArcadiusHistoryRecord[] = [];
  private maxHistory = 300;
  private totalErrors = 0;
  private queuedEvents = 0;
  private paused = false;

  constructor() {}

  on(channel: string, fn: (event: ArcadiusEvent) => void): () => void {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel)!.push({ id, fn });

    return () => {
      const list = this.listeners.get(channel);
      if (list) {
        this.listeners.set(channel, list.filter(item => item.id !== id));
      }
    };
  }

  async publish(
    channel: string,
    type: string,
    payload: any,
    options: {
      sourceAgent?: string;
      priority?: string;
      targetAgent?: string;
    } = {}
  ): Promise<ArcadiusEvent> {
    const event: ArcadiusEvent = {
      eventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      channel,
      type,
      payload,
      priority: (options.priority as any) || 'normal',
      sourceAgent: options.sourceAgent || 'system',
      targetAgent: options.targetAgent,
      timestamp: Date.now(),
    };

    if (this.paused) {
      this.queuedEvents++;
      return event;
    }

    const t0 = Date.now();
    const handledBy: string[] = [];
    const errors: Array<{ agentName: string; error: string }> = [];

    const specific = this.listeners.get(channel) || [];
    const wildcards = this.listeners.get('*') || [];
    const all = [...specific, ...wildcards];

    for (const sub of all) {
      handledBy.push(sub.id);
      try {
        sub.fn(event);
      } catch (err: any) {
        this.totalErrors++;
        errors.push({ agentName: sub.id, error: err.message || String(err) });
      }
    }

    const record: ArcadiusHistoryRecord = {
      event,
      handledBy,
      durationMs: Date.now() - t0,
      errors,
    };

    this.history.unshift(record);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    return event;
  }

  emit(channel: string, payload: any, priority = 'normal', source = 'system') {
    return this.publish(channel, 'event', payload, { priority, sourceAgent: source });
  }

  getHistory(limit = 50): ArcadiusHistoryRecord[] {
    return this.history.slice(0, limit);
  }

  getStats() {
    let totalSubs = 0;
    for (const list of this.listeners.values()) {
      totalSubs += list.length;
    }

    return {
      channels: this.listeners.size,
      channelNames: Array.from(this.listeners.keys()),
      totalSubscriptions: totalSubs,
      middlewares: 2,
      historySize: this.history.length,
      queuedEvents: this.queuedEvents,
      totalErrors: this.totalErrors,
      paused: this.paused,
    };
  }
}

export const arcadius = new ArcadiusBus();
