import { v4 as uuid } from 'uuid';
import { EtherPrismDB } from '../core/EtherPrismDB';
import { Intellectus } from '../core/Intellectus';

export interface PlacedObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  color: string;
  placedBy: string;
  propertyId: string | null;
}

export const BUILD_CATALOG = [
  { type: 'cube', name: 'Cube', icon: '🧊', cost: 30, color: '#6366f1' },
  { type: 'sphere', name: 'Sphère', icon: '🔮', cost: 35, color: '#8b5cf6' },
  { type: 'cylinder', name: 'Cylindre', icon: '🛢️', cost: 35, color: '#7c3aed' },
  { type: 'wall', name: 'Mur', icon: '🧱', cost: 50, color: '#b45309' },
  { type: 'pillar', name: 'Pilier', icon: '🏛️', cost: 45, color: '#92400e' },
  { type: 'ramp', name: 'Rampe', icon: '📐', cost: 60, color: '#a16207' },
  { type: 'tree', name: 'Arbre', icon: '🌲', cost: 0, color: '#2d6a4f' },
  { type: 'rock', name: 'Rocher', icon: '🪨', cost: 0, color: '#78716c' },
  { type: 'bush', name: 'Buisson', icon: '🌿', cost: 0, color: '#15803d' },
  { type: 'arch', name: 'Arche', icon: '🏗️', cost: 80, color: '#d97706' },
  { type: 'lamp_post', name: 'Lampadaire', icon: '💡', cost: 75, color: '#374151' },
  { type: 'bench', name: 'Banc', icon: '🪑', cost: 40, color: '#1d4ed8' },
  { type: 'crate', name: 'Caisse', icon: '📦', cost: 20, color: '#7c2d12' },
  { type: 'barrel', name: 'Baril', icon: '🛢️', cost: 15, color: '#713f12' },
  { type: 'fence', name: 'Clôture', icon: '🏘️', cost: 25, color: '#a0522d' },
  { type: 'sign', name: 'Panneau', icon: '🪧', cost: 35, color: '#0f766e' },
  { type: 'neon', name: 'Néon', icon: '✨', cost: 60, color: '#06b6d4' },
  { type: 'spot', name: 'Spot Light', icon: '🔆', cost: 50, color: '#fbbf24' },
] as const;

export type BuildType = typeof BUILD_CATALOG[number]['type'];

export class BuildSystem {
  db: EtherPrismDB;
  intellectus: Intellectus;

  constructor(db: EtherPrismDB, intellectus: Intellectus) {
    this.db = db;
    this.intellectus = intellectus;
  }

  async initialize() {
    this.intellectus.arcadius.emit('system:build:ready', {}, 'BuildSystem');
  }

  async placeObject(data: { type: string; position: [number, number, number]; rotation?: number; scale?: number; color?: string; placedBy: string; propertyId?: string }): Promise<PlacedObject> {
    const cat = BUILD_CATALOG.find(c => c.type === data.type);
    const obj: PlacedObject = {
      id: uuid(), type: data.type,
      position: data.position, rotation: data.rotation ?? 0, scale: data.scale ?? 1,
      color: data.color || cat?.color || '#808080',
      placedBy: data.placedBy, propertyId: data.propertyId ?? null,
    };
    await this.db.set('build_objects', obj.id, obj);
    this.intellectus.arcadius.emit('build:object.placed', { objectId: obj.id, type: obj.type, propertyId: obj.propertyId }, 'BuildSystem');
    return obj;
  }

  async removeObject(id: string) {
    await this.db.del('build_objects', id);
    this.intellectus.arcadius.emit('build:object.removed', { objectId: id }, 'BuildSystem');
  }

  async listObjects(): Promise<PlacedObject[]> { return this.db.list('build_objects'); }
  async clearAll() {
    const objs = await this.listObjects();
    for (const o of objs) await this.db.del('build_objects', o.id);
  }

  getCatalog() { return BUILD_CATALOG; }
}
