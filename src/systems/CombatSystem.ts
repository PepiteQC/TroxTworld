import { Intellectus } from '../core/Intellectus';
import { PlayerSystem } from './PlayerSystem';

export interface CombatEvent {
  attackerId: string;
  targetId: string;
  damage: number;
  weapon: string;
  timestamp: number;
}

const WEAPON_DAMAGE: Record<string, number> = {
  'fist': 3,
  'Bâton en bois': 5,
  'Bat de baseball': 12,
  'Couteau': 18,
  'Matraque police': 15,
};

export class CombatSystem {
  intellectus: Intellectus;
  playerSystem: PlayerSystem;
  combatLog: CombatEvent[] = [];

  constructor(intellectus: Intellectus, playerSystem: PlayerSystem) {
    this.intellectus = intellectus;
    this.playerSystem = playerSystem;
  }

  async initialize() {
    this.intellectus.arcadius.emit('system:combat:ready', {}, 'CombatSystem');
  }

  meleeHit(attackerId: string, targetId: string, weapon: string): CombatEvent | null {
    const attacker = this.playerSystem.get(attackerId);
    const target = this.playerSystem.get(targetId);
    if (!attacker || !target) return null;

    const damage = WEAPON_DAMAGE[weapon] || 3;
    const remainingHealth = this.playerSystem.takeDamage(targetId, damage);

    const event: CombatEvent = {
      attackerId, targetId, damage, weapon, timestamp: Date.now(),
    };
    this.combatLog.unshift(event);
    if (this.combatLog.length > 100) this.combatLog.length = 100;

    this.intellectus.arcadius.emit('combat:hit', {
      attacker: attacker.name, target: target.name, damage, weapon, remainingHealth,
    }, 'CombatSystem');

    return event;
  }

  getLog(limit = 20) { return this.combatLog.slice(0, limit); }
}
