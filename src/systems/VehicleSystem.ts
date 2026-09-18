import { v4 as uuid } from 'uuid';
import { EtherPrismDB } from '../core/EtherPrismDB';
import { Intellectus } from '../core/Intellectus';

export interface Vehicle {
  id: string;
  type: 'car' | 'truck' | 'police' | 'ambulance' | 'taxi' | 'motorcycle';
  name: string;
  color: string;
  position: [number, number, number];
  rotation: number;
  speed: number;
  maxSpeed: number;
  health: number;
  ownerId: string | null;
  driverId: string | null;
  locked: boolean;
  icon: string;
}

const VEHICLE_TYPES: Omit<Vehicle, 'id' | 'position' | 'rotation' | 'ownerId' | 'driverId'>[] = [
  { type: 'car', name: 'Berline civile', color: '#3B82F6', speed: 0, maxSpeed: 120, health: 100, locked: false, icon: '🚗' },
  { type: 'truck', name: 'Camionnette', color: '#6B7280', speed: 0, maxSpeed: 90, health: 150, locked: false, icon: '🚛' },
  { type: 'police', name: 'Cruiser SPVM', color: '#1E3A5F', speed: 0, maxSpeed: 160, health: 120, locked: true, icon: '🚓' },
  { type: 'ambulance', name: 'Ambulance EMS', color: '#FBBF24', speed: 0, maxSpeed: 130, health: 130, locked: true, icon: '🚑' },
  { type: 'taxi', name: 'Taxi Montréal', color: '#EAB308', speed: 0, maxSpeed: 110, health: 100, locked: false, icon: '🚕' },
  { type: 'motorcycle', name: 'Moto Sport', color: '#EF4444', speed: 0, maxSpeed: 180, health: 60, locked: false, icon: '🏍️' },
];

export class VehicleSystem {
  db: EtherPrismDB;
  intellectus: Intellectus;

  constructor(db: EtherPrismDB, intellectus: Intellectus) {
    this.db = db;
    this.intellectus = intellectus;
  }

  async initialize() {
    const existing = await this.db.list('vehicles');
    if (existing.length === 0) {
      const positions: [number, number, number][] = [
        [10, 0, 5], [-10, 0, 15], [35, 0, -10], [-25, 0, -5], [5, 0, -30], [20, 0, 25],
      ];
      for (let i = 0; i < VEHICLE_TYPES.length; i++) {
        await this.db.set('vehicles', uuid(), {
          ...VEHICLE_TYPES[i],
          position: positions[i],
          rotation: Math.random() * Math.PI * 2,
          ownerId: null, driverId: null,
        });
      }
    }
    this.intellectus.arcadius.emit('system:vehicle:ready', {}, 'VehicleSystem');
  }

  async list(): Promise<Vehicle[]> { return this.db.list('vehicles'); }

  async enterVehicle(vehicleId: string, playerId: string): Promise<{ ok: boolean; error?: string }> {
    const v = await this.db.get('vehicles', vehicleId) as Vehicle | null;
    if (!v) return { ok: false, error: 'Véhicule introuvable.' };
    if (v.locked && v.ownerId !== playerId) return { ok: false, error: 'Véhicule verrouillé.' };
    if (v.driverId) return { ok: false, error: 'Quelqu\'un conduit déjà.' };
    v.driverId = playerId;
    await this.db.set('vehicles', vehicleId, v);
    this.intellectus.arcadius.emit('vehicle:entered', { vehicleId, playerId }, 'VehicleSystem');
    return { ok: true };
  }

  async exitVehicle(vehicleId: string): Promise<void> {
    const v = await this.db.get('vehicles', vehicleId) as Vehicle | null;
    if (v) { v.driverId = null; await this.db.set('vehicles', vehicleId, v); }
  }

  getTypes() { return VEHICLE_TYPES; }
}
