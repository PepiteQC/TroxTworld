// ═══════════════════════════════════════════════════════════════════════════
//  INVENTORY SYSTEM v2.0 — INVENTAIRE, POIDS, EFFETS & STOCKAGE RP
//  src/game/inventory/InventoryManager.ts
//  Gestion du poids (kg) · Consommables de survie · Armes & Munitions · Synchro DB
// ═══════════════════════════════════════════════════════════════════════════

import { intellectus } from '../../intellectus';

export type ItemType =
  | 'weapon'
  | 'ammo'
  | 'food'
  | 'drug'
  | 'tool'
  | 'material'
  | 'document'
  | 'jewelry'
  | 'key';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Item {
  itemId: string;
  name: string;
  type: ItemType;
  description: string;
  quantity: number;
  rarity: Rarity;
  value: number; // Prix de vente
  weight: number; // en kg
  stackable: boolean;
  durability?: number; // 0-100
  effects?: string[];
  properties?: Record<string, any>;
}

export interface InventorySlot {
  slotId: string;
  item: Item;
  quantity: number;
  durability?: number;
}

export interface Inventory {
  inventoryId: string;
  ownerId: string;
  ownerName: string;
  ownerType: 'player' | 'property' | 'vehicle' | 'business';
  slots: Map<string, InventorySlot>;
  maxSlots: number;
  maxWeight: number;
  currentWeight: number;
  lastUpdated: number;
}

export class InventoryManager {
  private inventories: Map<string, Inventory> = new Map();
  private items: Map<string, Item> = new Map();
  private updateListener: ((data: any) => void) | null = null;

  constructor() {
    this.initializeDefaultItems();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CATALOGUE OFFICIEL DES OBJETS DU COMTÉ DE PORTNEUF
  // ─────────────────────────────────────────────────────────────────────────

  private initializeDefaultItems() {
    const itemsData: Item[] = [
      // ─── ARMES À FEU & DÉFENSE ───
      {
        itemId: 'weapon_pistol_01',
        name: 'Pistolet 9mm Semi-Auto',
        type: 'weapon',
        description: 'Arme de poing réglementaire des patrouilleurs de la SQ',
        quantity: 1,
        rarity: 'common',
        value: 1200,
        weight: 0.95,
        stackable: false,
        durability: 100,
        properties: { damage: 28, fireRate: 14, magazine: 15 },
      },
      {
        itemId: 'weapon_rifle_01',
        name: 'Carabine de Chasse Laurentienne',
        type: 'weapon',
        description: 'Carabine longue portée de précision pour le gros gibier',
        quantity: 1,
        rarity: 'uncommon',
        value: 2400,
        weight: 3.6,
        stackable: false,
        durability: 100,
        properties: { damage: 65, fireRate: 6, magazine: 10 },
      },

      // ─── MUNITIONS ───
      {
        itemId: 'ammo_9mm',
        name: 'Munitions 9mm (x30)',
        type: 'ammo',
        description: 'Boîte de 30 cartouches 9mm parabellum',
        quantity: 30,
        rarity: 'common',
        value: 120,
        weight: 0.25,
        stackable: true,
      },
      {
        itemId: 'ammo_rifle',
        name: 'Munitions Calibre .308 (x20)',
        type: 'ammo',
        description: 'Cartouches de précision pour carabine de chasse',
        quantity: 20,
        rarity: 'common',
        value: 180,
        weight: 0.35,
        stackable: true,
      },

      // ─── NOURRITURE & TERROIR QUÉBÉCOIS ───
      {
        itemId: 'food_whopper',
        name: 'Whopper Burger King',
        type: 'food',
        description: 'Burger grillé sur la flamme (+35 Santé)',
        quantity: 1,
        rarity: 'common',
        value: 12,
        weight: 0.35,
        stackable: true,
        effects: ['health_restore_35', 'energy_restore_25'],
      },
      {
        itemId: 'food_bk_fries',
        name: 'Grandes Frites BK',
        type: 'food',
        description: 'Frites dorées et croustillantes (+15 Santé)',
        quantity: 1,
        rarity: 'common',
        value: 5,
        weight: 0.2,
        stackable: true,
        effects: ['health_restore_15', 'energy_restore_10'],
      },
      {
        itemId: 'food_poutine_portneuf',
        name: 'Poutine Traditionnelle de Portneuf',
        type: 'food',
        description: 'Fromage en grain frais du jour et sauce brune chaude (+50 Santé)',
        quantity: 1,
        rarity: 'uncommon',
        value: 15,
        weight: 0.5,
        stackable: true,
        effects: ['health_restore_50', 'energy_restore_40'],
      },
      {
        itemId: 'drink_coffee',
        name: 'Grand Café Tim Chaud',
        type: 'food',
        description: 'Café infusé fraîchement (+20 Énergie)',
        quantity: 1,
        rarity: 'common',
        value: 3,
        weight: 0.25,
        stackable: true,
        effects: ['energy_restore_30'],
      },
      {
        itemId: 'drink_soda',
        name: 'Canette de Soda Frais',
        type: 'food',
        description: 'Boisson rafraîchissante sucrée (+10 Énergie)',
        quantity: 1,
        rarity: 'common',
        value: 3,
        weight: 0.33,
        stackable: true,
        effects: ['energy_restore_15'],
      },

      // ─── SOINS MÉDICAUX & PHARMACIE ───
      {
        itemId: 'item_medkit',
        name: 'Trousse de Soins EMS',
        type: 'tool',
        description: 'Matériel chirurgical d\'urgence (+75 Santé)',
        quantity: 1,
        rarity: 'rare',
        value: 150,
        weight: 1.2,
        stackable: true,
        effects: ['health_restore_75'],
      },
      {
        itemId: 'item_bandage',
        name: 'Bandage Compressif',
        type: 'tool',
        description: 'Stoppe les saignements et referme les plaies (+25 Santé)',
        quantity: 1,
        rarity: 'common',
        value: 35,
        weight: 0.1,
        stackable: true,
        effects: ['health_restore_25'],
      },

      // ─── OUTILS TECHNIQUES & SERRURERIE ───
      {
        itemId: 'tool_lockpick',
        name: 'Kit de Crochetage Professionnel',
        type: 'tool',
        description: 'Outil de précision pour déverrouiller portières et serrures',
        quantity: 1,
        rarity: 'uncommon',
        value: 400,
        weight: 0.15,
        stackable: false,
        durability: 100,
      },
      {
        itemId: 'tool_wrench',
        name: 'Clé à Molette Mécanique',
        type: 'tool',
        description: 'Permet de réparer la carrosserie et les moteurs endommagés',
        quantity: 1,
        rarity: 'common',
        value: 120,
        weight: 0.8,
        stackable: false,
        durability: 100,
      },
      {
        itemId: 'tool_crowbar',
        name: 'Pied-de-biche en Acier Trempé',
        type: 'tool',
        description: 'Outil de force pour braquages et démolition',
        quantity: 1,
        rarity: 'common',
        value: 200,
        weight: 2.2,
        stackable: false,
        durability: 100,
      },
      {
        itemId: 'item_phone',
        name: 'Téléphone TroxtPhone 5G',
        type: 'document',
        description: 'Accès au réseau bancaire, contacts et messagerie MSN',
        quantity: 1,
        rarity: 'rare',
        value: 650,
        weight: 0.18,
        stackable: false,
      },
    ];

    itemsData.forEach((item) => this.items.set(item.itemId, item));
    console.log(`📦 [InventoryManager] ${itemsData.length} items enregistrés au catalogue officiel.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CRÉATION & GESTION DES ESPACES DE STOCKAGE
  // ─────────────────────────────────────────────────────────────────────────

  getOrCreateInventory(
    ownerId: string,
    ownerName: string,
    ownerType: 'player' | 'property' | 'vehicle' | 'business' = 'player',
    maxSlots = 24,
    maxWeight = 45 // 45 kg max par joueur
  ): Inventory {
    for (const inv of this.inventories.values()) {
      if (inv.ownerId === ownerId) return inv;
    }
    return this.createInventory(ownerId, ownerName, ownerType, maxSlots, maxWeight);
  }

  createInventory(
    ownerId: string,
    ownerName: string,
    ownerType: 'player' | 'property' | 'vehicle' | 'business' = 'player',
    maxSlots = 24,
    maxWeight = 45
  ): Inventory {
    const inventoryId = `inv_${ownerId}`;

    const inventory: Inventory = {
      inventoryId,
      ownerId,
      ownerName,
      ownerType,
      slots: new Map(),
      maxSlots,
      maxWeight,
      currentWeight: 0,
      lastUpdated: Date.now(),
    };

    this.inventories.set(inventoryId, inventory);
    return inventory;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. MANIPULATION D'ITEMS (AJOUT / RETRAIT / TRANSFERT)
  // ─────────────────────────────────────────────────────────────────────────

  addItem(inventoryId: string, itemId: string, quantity = 1): boolean {
    const inventory = this.inventories.get(inventoryId);
    const template = this.items.get(itemId);

    if (!inventory || !template) return false;

    const addedWeight = template.weight * quantity;
    if (inventory.currentWeight + addedWeight > inventory.maxWeight) {
      console.warn(`⚠️ [InventoryManager] Capacité de poids dépassée (${inventory.currentWeight + addedWeight}kg / ${inventory.maxWeight}kg)`);
      return false;
    }

    let existingSlot: InventorySlot | undefined;

    if (template.stackable) {
      for (const slot of inventory.slots.values()) {
        if (slot.item.itemId === itemId) {
          existingSlot = slot;
          break;
        }
      }
    } else if (inventory.slots.size >= inventory.maxSlots) {
      console.warn('⚠️ [InventoryManager] Inventaire plein (Slots insuffisants)');
      return false;
    }

    if (existingSlot) {
      existingSlot.quantity += quantity;
    } else {
      const slot: InventorySlot = {
        slotId: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        item: { ...template },
        quantity,
        durability: template.durability,
      };
      inventory.slots.set(slot.slotId, slot);
    }

    inventory.currentWeight = parseFloat((inventory.currentWeight + addedWeight).toFixed(2));
    inventory.lastUpdated = Date.now();

    this.persistToLotus(inventory);
    this.updateListener?.({ type: 'item_added', inventoryId, itemId, quantity });
    return true;
  }

  removeItem(inventoryId: string, slotId: string, quantity = 1): boolean {
    const inventory = this.inventories.get(inventoryId);
    const slot = inventory?.slots.get(slotId);

    if (!inventory || !slot) return false;

    const removedQty = Math.min(quantity, slot.quantity);
    const weightRemoved = slot.item.weight * removedQty;

    if (slot.quantity <= quantity) {
      inventory.slots.delete(slotId);
    } else {
      slot.quantity -= quantity;
    }

    inventory.currentWeight = Math.max(0, parseFloat((inventory.currentWeight - weightRemoved).toFixed(2)));
    inventory.lastUpdated = Date.now();

    this.persistToLotus(inventory);
    this.updateListener?.({ type: 'item_removed', inventoryId, slotId, quantity: removedQty });
    return true;
  }

  removeItemByItemId(inventoryId: string, itemId: string, quantity = 1): boolean {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) return false;

    let slotToUse: InventorySlot | undefined;
    for (const slot of inventory.slots.values()) {
      if (slot.item.itemId === itemId && slot.quantity >= quantity) {
        slotToUse = slot;
        break;
      }
    }

    if (!slotToUse) return false;
    return this.removeItem(inventoryId, slotToUse.slotId, quantity);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. UTILISATION D'OBJET & APPLICATION DES EFFETS EN DIRECT SUR LE JOUEUR
  // ─────────────────────────────────────────────────────────────────────────

  useItem(inventoryId: string, slotId: string): string[] | null {
    const inventory = this.inventories.get(inventoryId);
    const slot = inventory?.slots.get(slotId);

    if (!inventory || !slot) return null;

    const item = slot.item;
    const effects = item.effects || [];

    // ⚡ Application réelle des effets sur les PV / Armure du joueur dans LotusStore
    if (inventory.ownerType === 'player') {
      const player = intellectus.memory.get<any>('players', inventory.ownerId);

      if (player) {
        let changed = false;

        for (const effect of effects) {
          // Soins de vie (+35, +50, +75)
          const healthMatch = effect.match(/health_restore_(\d+)/);
          if (healthMatch) {
            const amount = Number(healthMatch[1]);
            player.health = Math.min(100, (player.health || 100) + amount);
            changed = true;
          }

          // Armure corporelle
          if (effect.includes('armor_bonus')) {
            player.armor = Math.min(100, (player.armor || 0) + 50);
            changed = true;
          }
        }

        if (changed) {
          intellectus.memory.set('players', inventory.ownerId, player, true);
        }
      }
    }

    // Décrémentation de l'objet utilisé
    if (slot.quantity > 1) {
      slot.quantity--;
    } else {
      inventory.slots.delete(slotId);
    }

    inventory.currentWeight = Math.max(0, parseFloat((inventory.currentWeight - item.weight).toFixed(2)));
    inventory.lastUpdated = Date.now();

    this.persistToLotus(inventory);
    this.updateListener?.({ type: 'item_used', inventoryId, slotId, effects });
    return effects;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. PERSISTANCE DANS LA MÉMOIRE UNIFIÉE LOTUS
  // ─────────────────────────────────────────────────────────────────────────

  private persistToLotus(inventory: Inventory) {
    const list = Array.from(inventory.slots.values()).map((s) => ({
      id: s.slotId,
      itemId: s.item.itemId,
      name: s.item.name,
      qty: s.quantity,
      category: s.item.type,
      weight: s.item.weight,
      durability: s.durability,
    }));

    intellectus.memory.set('inventories', inventory.ownerId, list, true);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. ACCESSEURS
  // ─────────────────────────────────────────────────────────────────────────

  getInventory(inventoryId: string): Inventory | undefined {
    return this.inventories.get(inventoryId);
  }

  getInventoryByOwner(ownerId: string): Inventory | undefined {
    for (const inv of this.inventories.values()) {
      if (inv.ownerId === ownerId) return inv;
    }
    return undefined;
  }

  getInventoryItems(inventoryId: string): InventorySlot[] {
    const inventory = this.inventories.get(inventoryId);
    return inventory ? Array.from(inventory.slots.values()) : [];
  }

  getItemTemplate(itemId: string): Item | undefined {
    return this.items.get(itemId);
  }

  getAllItemTemplates(): Item[] {
    return Array.from(this.items.values());
  }

  onUpdate(callback: (data: any) => void) {
    this.updateListener = callback;
  }
}

export const inventoryManager = new InventoryManager();