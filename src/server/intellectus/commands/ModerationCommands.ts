// server/intellectus/commands/ModerationCommands.ts
// ETHERWORLD RP — TroxTetherworld Platinum Server Moderation Commands

import type { IKernel } from '../types';
import type { DecapriusCommands } from '../index';

export function registerModerationCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {

  commands.register('mod:kick', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;
    const reason = params?.reason || 'Expulsé par le modérateur';

    if (!targetId) return { ok: false, error: 'targetId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('mod:kick', { targetId, reason, admin: ctx?.sender?.username }, 'high', 'Moderation');
    }

    return { ok: true, action: 'KICK', targetId, reason };
  }, {
    permission: 'moderator',
    description: 'Expulse un joueur du serveur',
  });

  commands.register('mod:ban', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;
    const duration = params?.duration || 'permanent';
    const reason = params?.reason || 'Banni du serveur';

    if (!targetId) return { ok: false, error: 'targetId requis' };

    if (kernel.contracts?.lockoutUser) {
      const minutes = duration === 'permanent' ? 525600 : parseInt(duration) || 60;
      kernel.contracts.lockoutUser(targetId, minutes, reason);
    }

    if (kernel.bus) {
      await kernel.bus.emit('mod:ban', { targetId, duration, reason, admin: ctx?.sender?.username }, 'critical', 'Moderation');
    }

    return { ok: true, action: 'BAN', targetId, duration, reason };
  }, {
    permission: 'admin',
    description: 'Bannit un joueur pour une durée définie',
  });

  commands.register('mod:warn', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;
    const reason = params?.reason || 'Avertissement HRP / Non-respect des règles';

    if (!targetId) return { ok: false, error: 'targetId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('mod:warn', { targetId, reason, admin: ctx?.sender?.username }, 'normal', 'Moderation');
    }

    return { ok: true, action: 'WARN', targetId, reason };
  }, {
    permission: 'moderator',
    description: 'Envoie un avertissement formel à un joueur',
  });

  commands.register('mod:freeze', async (params: any, _ctx: any) => {
    const targetId = params?.targetId;
    if (!targetId) return { ok: false, error: 'targetId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('mod:freeze', { targetId, frozen: true }, 'high', 'Moderation');
    }

    return { ok: true, action: 'FREEZE', targetId, frozen: true };
  }, {
    permission: 'moderator',
    description: 'Gèle un joueur sur place',
  });

  commands.register('mod:unfreeze', async (params: any, _ctx: any) => {
    const targetId = params?.targetId;
    if (!targetId) return { ok: false, error: 'targetId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('mod:freeze', { targetId, frozen: false }, 'high', 'Moderation');
    }

    return { ok: true, action: 'UNFREEZE', targetId, frozen: false };
  }, {
    permission: 'moderator',
    description: 'Libère un joueur gelé',
  });
}
