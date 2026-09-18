// server/intellectus/commands/index.ts
// ETHERWORLD RP — TroxTetherworld Platinum Decaprius Server Commands Entry Point

import type { IKernel } from '../types';
import type { DecapriusCommands } from '../index';

import { registerEconomyCommands } from './EconomyCommands';
import { registerModerationCommands } from './ModerationCommands';
import { registerSystemCommands } from './SystemCommands';
import { registerWorldCommands } from './WorldCommands';
import { registerTeleportCommands } from './TeleportCommands';
import { registerVehicleCommands } from './VehicleCommands';
import { registerGModCommands } from './GModCommands';

export {
  registerEconomyCommands,
  registerModerationCommands,
  registerSystemCommands,
  registerWorldCommands,
  registerTeleportCommands,
  registerVehicleCommands,
  registerGModCommands,
};

/**
 * Registers all Intellectus Decaprius command suites into the server command registry.
 */
export function registerAllIntellectusCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {
  registerEconomyCommands(commands, kernel);
  registerModerationCommands(commands, kernel);
  registerSystemCommands(commands, kernel);
  registerWorldCommands(commands, kernel);
  registerTeleportCommands(commands, kernel);
  registerVehicleCommands(commands, kernel);
  registerGModCommands(commands, kernel);

  console.log(`[IntellectusCommands] 🚀 ${commands.commands.size} commandes serveur Decaprius enregistrées avec succès.`);
}
