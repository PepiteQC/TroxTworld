// server/intellectus/Lotus.ts
// ETHERWORLD RP — TroxT Platinum Lotus In-Memory & Snapshot Store

export interface SnapshotMeta {
  snapshotId: string;
  namespace: string;
  label: string;
  timestamp: number;
  entryCount: number;
  data: Record<string, any>;
}

export class LotusStore {
  private namespaces = new Map<string, Map<string, any>>();
  private snapshots: SnapshotMeta[] = [];
  private maxSnapshots = 50;

  get<T>(namespace: string, key: string): T | undefined {
    return this.namespaces.get(namespace)?.get(key);
  }

  set(namespace: string, key: string, value: any): void {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Map());
    }
    this.namespaces.get(namespace)!.set(key, value);
  }

  delete(namespace: string, key: string): boolean {
    const ns = this.namespaces.get(namespace);
    if (!ns) return false;
    return ns.delete(key);
  }

  keys(namespace: string): string[] {
    const ns = this.namespaces.get(namespace);
    return ns ? Array.from(ns.keys()) : [];
  }

  values<T>(namespace: string): T[] {
    const ns = this.namespaces.get(namespace);
    return ns ? (Array.from(ns.values()) as T[]) : [];
  }

  snapshot(namespace = 'world', label = 'manual-admin'): SnapshotMeta {
    const ns = this.namespaces.get(namespace);
    const data: Record<string, any> = {};
    if (ns) {
      for (const [k, v] of ns.entries()) {
        try {
          data[k] = JSON.parse(JSON.stringify(v));
        } catch {
          data[k] = v;
        }
      }
    }

    const snap: SnapshotMeta = {
      snapshotId: `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      namespace,
      label,
      timestamp: Date.now(),
      entryCount: Object.keys(data).length,
      data,
    };

    this.snapshots.unshift(snap);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.pop();
    }
    return snap;
  }

  restore(snapshotId: string): boolean {
    const snap = this.snapshots.find(s => s.snapshotId === snapshotId);
    if (!snap) return false;

    const nsMap = new Map<string, any>();
    for (const [k, v] of Object.entries(snap.data)) {
      nsMap.set(k, JSON.parse(JSON.stringify(v)));
    }
    this.namespaces.set(snap.namespace, nsMap);
    return true;
  }

  getSnapshots(): Array<Omit<SnapshotMeta, 'data'>> {
    return this.snapshots.map(({ data, ...rest }) => rest);
  }

  getStats() {
    let totalEntries = 0;
    for (const ns of this.namespaces.values()) {
      totalEntries += ns.size;
    }
    return {
      totalEntries,
      namespaces: Array.from(this.namespaces.keys()),
      maxEntries: 100000,
      snapshots: this.snapshots.length,
      openTransactions: 0,
      hasAdapter: false,
    };
  }
}

export const lotus = new LotusStore();
