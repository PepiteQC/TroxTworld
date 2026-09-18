// server/intellectus/commands/WorldCommands.ts
// ETHERWORLD RP — TroxTetherworld Platinum World & Environment Commands

import type { IKernel } from '../types';
import type { DecapriusCommands } from '../index';

export function registerWorldCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {

  // ── 🌤️ SET WEATHER — Change global weather state ─────────────────
  commands.register('world:setWeather', async (params: any, ctx: any) => {
    const weather = (params?.weather || params?.type || 'SUNNY').toUpperCase();
    const validWeathers = ['SUNNY', 'RAINY', 'SNOWY', 'FOGGY'];

    if (!validWeathers.includes(weather)) {
      return { ok: false, error: `Météo invalide '${weather}'. Valeurs permises: ${validWeathers.join(', ')}` };
    }

    if (kernel.bus) {
      await kernel.bus.emit('world:weather_changed', { weather, admin: ctx?.sender?.username }, 'high', 'WorldCommands');
    }

    return { ok: true, action: 'SET_WEATHER', weather };
  }, {
    permission: 'moderator',
    description: 'Modifie la météo globale du serveur (SUNNY, RAINY, SNOWY, FOGGY)',
  });

  // ── ⏰ SET TIME — Change server time of day ──────────────────────
  commands.register('world:setTime', async (params: any, ctx: any) => {
    const timeOfDay = Number(params?.time) ?? Number(params?.timeOfDay) ?? 1200;

    if (isNaN(timeOfDay) || timeOfDay < 0 || timeOfDay > 2400) {
      return { ok: false, error: 'Heure invalide. Doit être entre 0 et 2400 (ex: 1200 pour midi, 2400 pour minuit)' };
    }

    if (kernel.bus) {
      await kernel.bus.emit('world:time_changed', { timeOfDay, admin: ctx?.sender?.username }, 'normal', 'WorldCommands');
    }

    return { ok: true, action: 'SET_TIME', timeOfDay };
  }, {
    permission: 'moderator',
    description: 'Ajuste l\'heure du jour du serveur (0 à 2400)',
  });

  // ── ⚡ TRIGGER POWER OUTAGE — Hydro-Portneuf outage ──────────────
  commands.register('world:triggerOutage', async (params: any, ctx: any) => {
    const active = params?.active !== undefined ? Boolean(params.active) : true;

    if (kernel.bus) {
      await kernel.bus.emit('world:power_outage', { active, admin: ctx?.sender?.username }, 'critical', 'WorldCommands');
    }

    return { ok: true, action: 'POWER_OUTAGE', active };
  }, {
    permission: 'admin',
    description: 'Déclenche ou résout une panne de courant générale Hydro-Portneuf',
  });

  // ── 🎯 SPAWN EVENT — Trigger dynamic county event ────────────────
  commands.register('world:spawnEvent', async (params: any, ctx: any) => {
    const eventType = (params?.type || 'ACCIDENT').toUpperCase();
    const x = Number(params?.x) || 0;
    const z = Number(params?.z) || 0;

    if (kernel.bus) {
      await kernel.bus.emit('world:event_spawned', { eventType, x, z, admin: ctx?.sender?.username }, 'high', 'WorldCommands');
    }

    return { ok: true, action: 'SPAWN_EVENT', eventType, x, z };
  }, {
    permission: 'admin',
    description: 'Génère un événement dynamique sur le comté (ACCIDENT, RARE_RESOURCE, POWER_OUTAGE)',
  });
}
