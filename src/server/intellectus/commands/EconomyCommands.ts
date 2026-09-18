// server/intellectus/commands/EconomyCommands.ts
// ETHERWORLD RP — TroxTetherworld Platinum Server Economy Commands

import type { IKernel } from '../types';
import type { DecapriusCommands } from '../index';

export function registerEconomyCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {

  commands.register('economy:giveCash', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;
    const amount = Number(params?.amount) || 0;

    if (!targetId) return { ok: false, error: 'targetId requis' };
    if (amount <= 0) return { ok: false, error: 'Montant doit être supérieur à 0' };

    if (kernel.bus) {
      await kernel.bus.emit('economy:cash_given', { targetId, amount, admin: ctx?.sender?.username }, 'high', 'Economy');
    }

    return { ok: true, action: 'GIVE_CASH', targetId, amount };
  }, {
    permission: 'admin',
    description: 'Accorde de l\'argent liquide à un joueur',
  });

  commands.register('economy:giveBank', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;
    const amount = Number(params?.amount) || 0;

    if (!targetId) return { ok: false, error: 'targetId requis' };
    if (amount <= 0) return { ok: false, error: 'Montant doit être supérieur à 0' };

    if (kernel.bus) {
      await kernel.bus.emit('economy:bank_given', { targetId, amount, admin: ctx?.sender?.username }, 'high', 'Economy');
    }

    return { ok: true, action: 'GIVE_BANK', targetId, amount };
  }, {
    permission: 'admin',
    description: 'Dépose un virement bancaire sur le compte d\'un joueur',
  });

  commands.register('economy:spawnItem', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;
    const itemId = params?.itemId;
    const quantity = parseInt(params?.quantity) || 1;

    if (!targetId || !itemId) return { ok: false, error: 'targetId et itemId requis' };

    if (kernel.bus) {
      await kernel.bus.emit('economy:item_spawned', { targetId, itemId, quantity, admin: ctx?.sender?.username }, 'normal', 'Economy');
    }

    return { ok: true, action: 'SPAWN_ITEM', targetId, itemId, quantity };
  }, {
    permission: 'admin',
    description: 'Fait apparaître un objet dans l\'inventaire du joueur',
  });

  commands.register('economy:setJob', async (params: any, ctx: any) => {
    const targetId = params?.targetId || params?.userId;
    const job = params?.job;
    const grade = parseInt(params?.grade) || 0;

    if (!targetId || !job) return { ok: false, error: 'targetId et job requis' };

    if (kernel.bus) {
      await kernel.bus.emit('economy:job_changed', { targetId, job, grade, admin: ctx?.sender?.username }, 'normal', 'Economy');
    }

    return { ok: true, action: 'SET_JOB', targetId, job, grade };
  }, {
    permission: 'admin',
    description: 'Attribue un métier RP et un grade à un joueur',
  });
}
