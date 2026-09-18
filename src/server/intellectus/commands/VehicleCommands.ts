// server/intellectus/commands/VehicleCommands.ts
// ETHERWORLD RP — TroxTetherworld Platinum Vehicle Management Commands

import type { IKernel } from '../types';
import type { DecapriusCommands } from '../index';

export function registerVehicleCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {

  // ── 🏎️ SPAWN VEHICLE — Spawn a vehicle near target/admin ──────────
  commands.register('vehicle:spawn', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId || ctx?.sender?.sessionId;
    const vehicleType = params?.vehicleType || params?.type || 'supercar';
    const plate = params?.plate || `TROXT-${Math.floor(Math.random() * 900 + 100)}`;

    if (!targetId) return { ok: false, error: 'targetId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('vehicle:spawned', { targetId, vehicleType, plate, admin: ctx?.sender?.username }, 'normal', 'VehicleCommands');
    }

    return { ok: true, action: 'SPAWN_VEHICLE', targetId, vehicleType, plate };
  }, {
    permission: 'moderator',
    description: 'Fait apparaître un véhicule (supercar, snowmobile, pickup, police) près d\'un joueur',
  });

  // ── 🔧 REPAIR VEHICLE — Fix vehicle engine and body ──────────────
  commands.register('vehicle:repair', async (params: any, ctx: any) => {
    const vehicleId = params?.vehicleId || params?.id;

    if (!vehicleId) return { ok: false, error: 'vehicleId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('vehicle:repaired', { vehicleId, admin: ctx?.sender?.username }, 'normal', 'VehicleCommands');
    }

    return { ok: true, action: 'REPAIR_VEHICLE', vehicleId, health: 100 };
  }, {
    permission: 'moderator',
    description: 'Répare instantanément l\'état mécanique et la carrosserie d\'un véhicule',
  });

  // ── 🔒 LOCK / UNLOCK VEHICLE — Toggle vehicle door lock ─────────
  commands.register('vehicle:lock', async (params: any, ctx: any) => {
    const vehicleId = params?.vehicleId || params?.id;
    const locked = params?.locked !== undefined ? Boolean(params.locked) : true;

    if (!vehicleId) return { ok: false, error: 'vehicleId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('vehicle:lock_toggled', { vehicleId, locked, admin: ctx?.sender?.username }, 'normal', 'VehicleCommands');
    }

    return { ok: true, action: 'LOCK_VEHICLE', vehicleId, locked };
  }, {
    permission: 'moderator',
    description: 'Verrouille ou déverrouille les portières d\'un véhicule',
  });

  // ── 🧹 CLEAR VEHICLES — Clear abandoned vehicles ─────────────────
  commands.register('vehicle:clear', async (params: any, ctx: any) => {
    if (kernel.bus) {
      await kernel.bus.emit('vehicle:cleared', { admin: ctx?.sender?.username }, 'high', 'VehicleCommands');
    }

    return { ok: true, action: 'CLEAR_VEHICLES' };
  }, {
    permission: 'admin',
    description: 'Supprime tous les véhicules abandonnés de la carte',
  });
}
