import { Intellectus } from '../core/Intellectus';

export interface Door {
  id: string;
  isOpen: boolean;
  isLocked: boolean;
  ownerId: string | null;
  allowedKeys: string[];
}

export class DoorSystem {
  intellectus: Intellectus;
  doors = new Map<string, Door>();

  constructor(intellectus: Intellectus) {
    this.intellectus = intellectus;
  }

  async initialize() {
    // Default doors
    ['main', 'bathroom', 'garage', 'office', 'basement'].forEach(id => {
      this.doors.set(id, { id, isOpen: false, isLocked: false, ownerId: null, allowedKeys: [] });
    });
    this.intellectus.arcadius.emit('system:door:ready', {}, 'DoorSystem');
  }

  interact(doorId: string, playerId: string, hasKey: boolean): { ok: boolean; isOpen: boolean; error?: string } {
    const door = this.doors.get(doorId);
    if (!door) return { ok: false, isOpen: false, error: 'Porte introuvable.' };
    if (door.isLocked && !hasKey && door.ownerId !== playerId) {
      this.intellectus.arcadius.emit('door:forced', { doorId, playerId }, 'DoorSystem');
      return { ok: false, isOpen: false, error: 'Porte verrouillée.' };
    }
    door.isOpen = !door.isOpen;
    this.intellectus.arcadius.emit('door:toggle', { doorId, isOpen: door.isOpen }, 'DoorSystem');
    return { ok: true, isOpen: door.isOpen };
  }

  setLocked(doorId: string, locked: boolean) {
    const door = this.doors.get(doorId);
    if (door) door.isLocked = locked;
  }

  getDoor(id: string) { return this.doors.get(id) ?? null; }
  list() { return [...this.doors.values()]; }
}
