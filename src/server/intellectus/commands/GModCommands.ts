// server/intellectus/commands/GModCommands.ts
// ETHERWORLD RP — TroxTetherworld Platinum GMod Construction Commands

import type { IKernel } from '../types';
import type { DecapriusCommands } from '../index';

export function registerGModCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {

  // ── 🛠️ SPAWN PROP — Spawn a GMod catalog prop ────────────────────
  commands.register('gmod:spawnProp', async (params: any, ctx: any) => {
    const itemId = params?.itemId || params?.propId || 'wood';
    const x = Number(params?.x) || 0;
    const y = Number(params?.y) || 1.0;
    const z = Number(params?.z) || 0;

    if (kernel.bus) {
      await kernel.bus.emit('gmod:prop_spawned', { itemId, position: { x, y, z }, admin: ctx?.sender?.username }, 'normal', 'GModCommands');
    }

    return { ok: true, action: 'SPAWN_PROP', itemId, position: { x, y, z } };
  }, {
    permission: 'moderator',
    description: 'Fait apparaître un bloc ou un objet 3D de la bibliothèque GMod',
  });

  // ── 🧹 CLEAR PROPS — Clear all placed props on server ─────────────
  commands.register('gmod:clearProps', async (params: any, ctx: any) => {
    const ownerId = params?.ownerId;

    if (kernel.bus) {
      await kernel.bus.emit('gmod:props_cleared', { ownerId, admin: ctx?.sender?.username }, 'high', 'GModCommands');
    }

    return { ok: true, action: 'CLEAR_PROPS', ownerId: ownerId || 'all' };
  }, {
    permission: 'admin',
    description: 'Supprime les éléments de construction 3D (tous ou par joueur)',
  });

  // ── 🛡️ REPAIR STRUCTURE — Repair structural integrity ────────────
  commands.register('gmod:repairStructure', async (params: any, ctx: any) => {
    const propId = params?.propId;

    if (kernel.bus) {
      await kernel.bus.emit('gmod:structure_repaired', { propId, admin: ctx?.sender?.username }, 'normal', 'GModCommands');
    }

    return { ok: true, action: 'REPAIR_STRUCTURE', propId: propId || 'all' };
  }, {
    permission: 'moderator',
    description: 'Restaure l\'intégrité physique et dissipe le stress sur les constructions GMod',
  });
}
