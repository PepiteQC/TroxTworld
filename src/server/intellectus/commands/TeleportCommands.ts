// server/intellectus/commands/TeleportCommands.ts
// ETHERWORLD RP — TroxTetherworld Platinum Teleportation Commands

import type { IKernel } from '../types';
import type { DecapriusCommands } from '../index';

export function registerTeleportCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {

  // ── 📍 TELEPORT TO COORDS — Teleport to specific coordinates ─────
  commands.register('teleport:toCoords', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId || ctx?.sender?.sessionId;
    const x = Number(params?.x) || 0;
    const y = Number(params?.y) || 1.2;
    const z = Number(params?.z) || 0;

    if (!targetId) return { ok: false, error: 'targetId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('teleport:player', { targetId, x, y, z, admin: ctx?.sender?.username }, 'high', 'TeleportCommands');
    }

    return { ok: true, action: 'TELEPORT_COORDS', targetId, position: { x, y, z } };
  }, {
    permission: 'moderator',
    description: 'Téléporte un joueur vers des coordonnées spécifiques (x, y, z)',
  });

  // ── 🏛️ TELEPORT TO PRESET — Teleport to preset landmark ──────────
  commands.register('teleport:preset', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId || ctx?.sender?.sessionId;
    const locationKey = (params?.location || params?.preset || 'spawn').toLowerCase();

    if (!targetId) return { ok: false, error: 'targetId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('teleport:preset', { targetId, locationKey, admin: ctx?.sender?.username }, 'normal', 'TeleportCommands');
    }

    return { ok: true, action: 'TELEPORT_PRESET', targetId, locationKey };
  }, {
    permission: 'moderator',
    description: 'Téléporte un joueur vers un lieu prédéfini (spawn, police, jail, bank, hospital, dojo)',
  });

  // ── 🧲 BRING PLAYER — Bring a player to admin position ──────────
  commands.register('teleport:bringPlayer', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;

    if (!targetId) return { ok: false, error: 'targetId du joueur requis' };

    if (kernel.bus) {
      await kernel.bus.emit('teleport:bring', { targetId, admin: ctx?.sender?.username }, 'high', 'TeleportCommands');
    }

    return { ok: true, action: 'BRING_PLAYER', targetId };
  }, {
    permission: 'moderator',
    description: 'Téléporte un joueur spécifique à la position de l\'administrateur',
  });

  // ── 🚀 GOTO PLAYER — Teleport admin to player position ───────────
  commands.register('teleport:gotoPlayer', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;

    if (!targetId) return { ok: false, error: 'targetId du joueur cible requis' };

    if (kernel.bus) {
      await kernel.bus.emit('teleport:goto', { targetId, admin: ctx?.sender?.username }, 'normal', 'TeleportCommands');
    }

    return { ok: true, action: 'GOTO_PLAYER', targetId };
  }, {
    permission: 'moderator',
    description: 'Téléporte l\'administrateur directement auprès d\'un joueur',
  });
}
