import { v4 as uuid } from 'uuid';
import { EtherPrismDB } from '../core/EtherPrismDB';
import { Intellectus } from '../core/Intellectus';

export interface Player {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  health: number;
  maxHealth: number;
  money: number;
  level: number;
  xp: number;
  isAdmin: boolean;
  isGodMode: boolean;
  color: string;
  connectedAt: number;
}

const COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];

export class PlayerSystem {
  db: EtherPrismDB;
  intellectus: Intellectus;
  online = new Map<string, Player>();

  constructor(db: EtherPrismDB, intellectus: Intellectus) {
    this.db = db;
    this.intellectus = intellectus;
  }

  async initialize() {
    this.intellectus.arcadius.emit('system:player:ready', {}, 'PlayerSystem');
  }

  async connect(name: string): Promise<Player> {
    const player: Player = {
      id: uuid(), name: name || `Joueur_${Math.floor(Math.random() * 9999)}`,
      position: [0, 0, 2], rotation: 0,
      health: 100, maxHealth: 100, money: 5000, level: 1, xp: 0,
      isAdmin: false, isGodMode: false,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      connectedAt: Date.now(),
    };
    this.online.set(player.id, player);
    await this.db.set('players', player.id, player);
    this.intellectus.arcadius.emit('player:connected', { player }, 'PlayerSystem');
    return player;
  }

  updatePosition(id: string, pos: [number, number, number], rot: number) {
    const p = this.online.get(id);
    if (p) { p.position = pos; p.rotation = rot; }
  }

  takeDamage(id: string, amount: number): number {
    const p = this.online.get(id);
    if (!p || p.isGodMode) return p?.health ?? 0;
    p.health = Math.max(0, p.health - amount);
    if (p.health <= 0) {
      this.intellectus.arcadius.emit('player:death', { playerId: id }, 'PlayerSystem');
    }
    return p.health;
  }

  heal(id: string, amount: number) {
    const p = this.online.get(id);
    if (p) p.health = Math.min(p.maxHealth, p.health + amount);
  }

  addMoney(id: string, amount: number) {
    const p = this.online.get(id);
    if (p) p.money += amount;
  }

  addXP(id: string, amount: number) {
    const p = this.online.get(id);
    if (p) {
      p.xp += amount;
      while (p.xp >= p.level * 100) { p.xp -= p.level * 100; p.level++; }
    }
  }

  list(): Player[] { return [...this.online.values()]; }
  get(id: string) { return this.online.get(id) ?? null; }
  count() { return this.online.size; }
}
