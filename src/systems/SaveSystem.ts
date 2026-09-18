import { EtherPrismDB } from '../core/EtherPrismDB';
import { Intellectus } from '../core/Intellectus';

export interface Snapshot {
  id: string;
  type: 'auto' | 'manual' | 'shutdown';
  description: string;
  data: string;
  createdAt: number;
}

export class SaveSystem {
  db: EtherPrismDB;
  intellectus: Intellectus;
  snapshots: Snapshot[] = [];

  constructor(db: EtherPrismDB, intellectus: Intellectus) {
    this.db = db;
    this.intellectus = intellectus;
  }

  async initialize() {
    this.intellectus.arcadius.emit('system:save:ready', {}, 'SaveSystem');
  }

  async createSnapshot(type: Snapshot['type'] = 'manual', description = ''): Promise<Snapshot> {
    const snap: Snapshot = {
      id: `snap_${Date.now()}`,
      type, description: description || `${type} save`,
      data: this.db.snapshot(),
      createdAt: Date.now(),
    };
    this.snapshots.unshift(snap);
    if (this.snapshots.length > 20) this.snapshots.length = 20;
    await this.db.flush();
    this.intellectus.arcadius.emit('save:snapshot', { id: snap.id, type }, 'SaveSystem');
    return snap;
  }

  async save() {
    await this.db.flush();
    this.intellectus.arcadius.emit('save:flushed', {}, 'SaveSystem');
  }

  getSnapshots() { return this.snapshots; }
}
