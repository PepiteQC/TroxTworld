import { v4 as uuid } from 'uuid';
import { EtherPrismDB } from '../core/EtherPrismDB';
import { Intellectus } from '../core/Intellectus';

export interface InventoryItem {
  id: string;
  playerId: string;
  type: string;
  name: string;
  description: string;
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: string;
  weight: number;
  value: number;
  equippable: boolean;
  equipped: boolean;
}

const STARTER_KIT: Omit<InventoryItem, 'id' | 'playerId'>[] = [
  { type: 'weapon', name: 'Bâton en bois', description: 'Un bâton simple. Dégâts: 5.', quantity: 1, rarity: 'common', icon: '🏏', weight: 2, value: 25, equippable: true, equipped: false },
  { type: 'tool', name: 'Marteau de base', description: 'Pour construire.', quantity: 1, rarity: 'common', icon: '🔨', weight: 2, value: 50, equippable: true, equipped: false },
  { type: 'food', name: 'Poutine maison', description: 'Restaure 30 HP.', quantity: 3, rarity: 'common', icon: '🍟', weight: 1, value: 15, equippable: false, equipped: false },
  { type: 'material', name: 'Planches d\'érable', description: 'Matériau de construction.', quantity: 20, rarity: 'common', icon: '🪵', weight: 5, value: 10, equippable: false, equipped: false },
  { type: 'key', name: 'Clé de départ', description: 'Accès premier logement.', quantity: 1, rarity: 'uncommon', icon: '🔑', weight: 0.1, value: 100, equippable: false, equipped: false },
  { type: 'phone', name: 'Téléphone cellulaire', description: 'Communication.', quantity: 1, rarity: 'uncommon', icon: '📱', weight: 0.2, value: 200, equippable: true, equipped: false },
  { type: 'flashlight', name: 'Lampe de poche', description: 'Éclaire dans le noir.', quantity: 1, rarity: 'common', icon: '🔦', weight: 0.3, value: 35, equippable: true, equipped: false },
];

export class InventorySystem {
  db: EtherPrismDB;
  intellectus: Intellectus;

  constructor(db: EtherPrismDB, intellectus: Intellectus) {
    this.db = db;
    this.intellectus = intellectus;
  }

  async initialize() {
    this.intellectus.arcadius.emit('system:inventory:ready', {}, 'InventorySystem');
  }

  async giveStarterKit(playerId: string): Promise<InventoryItem[]> {
    const items: InventoryItem[] = [];
    for (const tpl of STARTER_KIT) {
      const item: InventoryItem = { ...tpl, id: uuid(), playerId };
      await this.db.set('inventory', item.id, item);
      items.push(item);
    }
    this.intellectus.arcadius.emit('inventory:starter_kit', { playerId, count: items.length }, 'InventorySystem');
    return items;
  }

  async getPlayerInventory(playerId: string): Promise<InventoryItem[]> {
    return this.db.query('inventory', { playerId });
  }

  async addItem(playerId: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const item: InventoryItem = {
      id: uuid(), playerId,
      type: data.type || 'misc', name: data.name || 'Item', description: data.description || '',
      quantity: data.quantity || 1, rarity: data.rarity || 'common',
      icon: data.icon || '📦', weight: data.weight || 1, value: data.value || 0,
      equippable: data.equippable || false, equipped: false,
    };
    await this.db.set('inventory', item.id, item);
    this.intellectus.arcadius.emit('inventory:item_added', { playerId, item }, 'InventorySystem');
    return item;
  }

  async removeItem(itemId: string) {
    await this.db.del('inventory', itemId);
  }

  async equipItem(itemId: string): Promise<boolean> {
    const item = await this.db.get('inventory', itemId) as InventoryItem | null;
    if (!item || !item.equippable) return false;
    item.equipped = !item.equipped;
    await this.db.set('inventory', itemId, item);
    this.intellectus.arcadius.emit('inventory:equip_toggle', { itemId, equipped: item.equipped }, 'InventorySystem');
    return true;
  }
}
