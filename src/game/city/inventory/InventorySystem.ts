/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎒 TROXTWORLD / ETHERWORLD — SYSTÈME D'INVENTAIRE SERVEUR (SERVER)
 * ═══════════════════════════════════════════════════════════════════
 * Gestion sécurisée des inventaires : joueurs, coffres de véhicules,
 * planques immobilières, gestion du poids (kg), anti-duplication
 * et transferts atomiques.
 */

export type ItemCategory =
  | "weapon"
  | "ammo"
  | "medical"
  | "food"
  | "drink"
  | "tool"
  | "resource"
  | "illegal"
  | "document"
  | "misc";

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  weightKg: number;
  maxStack: number;
  isUsable: boolean;
  isIllegal?: boolean;
  description: string;
}

export interface ItemStack {
  slot: number;
  itemId: string;
  quantity: number;
  metadata?: Record<string, unknown>;
}

export type InventoryType = "player" | "trunk" | "glovebox" | "property" | "stash" | "drop";

export interface Inventory {
  id: string;
  ownerId: string;
  ownerName: string;
  type: InventoryType;
  capacity: number;
  maxWeightKg: number;
  items: Map<number, ItemStack>;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryDTO {
  id: string;
  ownerId: string;
  ownerName: string;
  type: InventoryType;
  capacity: number;
  maxWeightKg: number;
  currentWeightKg: number;
  itemCount: number;
  items: ItemStack[];
}

export type InventoryUpdateListener = (event: Record<string, unknown>) => void;

export const ITEM_CATALOG: Record<string, ItemDef> = {
  medkit: { id: "medkit", name: "Trousse de premiers soins", category: "medical", weightKg: 1.0, maxStack: 5, isUsable: true, description: "Soigne les blessures graves (+50 HP)." },
  bandage: { id: "bandage", name: "Bandage stérile", category: "medical", weightKg: 0.1, maxStack: 20, isUsable: true, description: "Arrête les saignements mineurs." },
  painkillers: { id: "painkillers", name: "Analgésiques", category: "medical", weightKg: 0.05, maxStack: 10, isUsable: true, description: "Atténue la douleur et restaure de la vitalité." },
  poutine: { id: "poutine", name: "Poutine Traditionnelle", category: "food", weightKg: 0.6, maxStack: 5, isUsable: true, description: "Poutine chaude avec fromage en grains frais de Portneuf." },
  sandwich: { id: "sandwich", name: "Sandwich jambon-fromage", category: "food", weightKg: 0.3, maxStack: 10, isUsable: true, description: "Casse-croûte rapide sur le pouce." },
  water_bottle: { id: "water_bottle", name: "Bouteille d'eau Eska (500ml)", category: "drink", weightKg: 0.5, maxStack: 10, isUsable: true, description: "Hydrate et restaure l'endurance." },
  coffee: { id: "coffee", name: "Café Tim Hortons grand", category: "drink", weightKg: 0.3, maxStack: 5, isUsable: true, description: "Boost d'énergie instantané." },
  biere_locale: { id: "biere_locale", name: "Microbrasserie Roquemont", category: "drink", weightKg: 0.5, maxStack: 12, isUsable: true, description: "Bière artisanale de Saint-Raymond." },
  repair_kit: { id: "repair_kit", name: "Kit de réparation mécanique", category: "tool", weightKg: 3.5, maxStack: 2, isUsable: true, description: "Permet de réparer un véhicule en panne." },
  lockpick: { id: "lockpick", name: "Outil de crochetage", category: "tool", weightKg: 0.2, maxStack: 10, isUsable: true, isIllegal: true, description: "Pour ouvrir serrures et portières sans clé." },
  jerrycan: { id: "jerrycan", name: "Bidon d'essence (20L)", category: "tool", weightKg: 4.0, maxStack: 2, isUsable: true, description: "Contient du carburant d'urgence." },
  radio: { id: "radio", name: "Émetteur-récepteur radio", category: "tool", weightKg: 0.8, maxStack: 1, isUsable: true, description: "Permet de communiquer sur les fréquences régionales." },
  phone: { id: "phone", name: "Téléphone intelligent TroxPhone", category: "tool", weightKg: 0.2, maxStack: 1, isUsable: true, description: "Accès GPS, banque et messagerie." },
  driver_license: { id: "driver_license", name: "Permis de conduire SAAQ", category: "document", weightKg: 0.01, maxStack: 1, isUsable: false, description: "Autorisation officielle de circuler." },
  hunting_permit: { id: "hunting_permit", name: "Permis de chasse du Québec", category: "document", weightKg: 0.01, maxStack: 1, isUsable: false, description: "Autorise la chasse en zone forestière." },
  weapon_permit: { id: "weapon_permit", name: "Permis de port d'arme (PPA)", category: "document", weightKg: 0.01, maxStack: 1, isUsable: false, description: "Enregistrement légal d'armes à feu." },
  weapon_pistol_9mm: { id: "weapon_pistol_9mm", name: "Pistolet 9mm de service", category: "weapon", weightKg: 1.2, maxStack: 1, isUsable: true, description: "Arme de poing standard." },
  ammo_9mm: { id: "ammo_9mm", name: "Boîte de munitions 9mm (x50)", category: "ammo", weightKg: 0.6, maxStack: 10, isUsable: true, description: "Munitions pour pistolet et pistolet-mitrailleur." },
  weapon_shotgun_12g: { id: "weapon_shotgun_12g", name: "Fusil de chasse Calibre 12", category: "weapon", weightKg: 3.2, maxStack: 1, isUsable: true, description: "Fusil à pompe idéal pour la battue." },
  ammo_shotgun_12g: { id: "ammo_shotgun_12g", name: "Cartouches Calibre 12 (x25)", category: "ammo", weightKg: 0.8, maxStack: 8, isUsable: true, description: "Plombs pour fusil de chasse." },
  dirty_cash_bag: { id: "dirty_cash_bag", name: "Sac d'argent non tracé", category: "illegal", weightKg: 2.0, maxStack: 5, isUsable: false, isIllegal: true, description: "Doit être blanchi avant usage bancaire." },
  cannabis_bag: { id: "cannabis_bag", name: "Sachet de cannabis séché (28g)", category: "illegal", weightKg: 0.05, maxStack: 50, isUsable: true, isIllegal: true, description: "Produit issu des cultures de l'arrière-pays." },
};

export class InventoryManager {
  private inventories = new Map<string, Inventory>();
  private updateListeners: Set<InventoryUpdateListener> = new Set();

  constructor() {
    console.log(`🎒 [InventorySystem] Initialisé avec ${Object.keys(ITEM_CATALOG).length} définitions d'objets au catalogue.`);
  }

  public createInventory(
    ownerId: string,
    ownerName: string,
    type: InventoryType = "player",
    capacity = 30,
    maxWeightKg = 45.0
  ): Inventory {
    for (const inv of this.inventories.values()) {
      if (inv.ownerId === ownerId && inv.type === type) {
        return inv;
      }
    }

    const id = `inv_${type}_${ownerId.slice(0, 8)}_${Math.random().toString(36).slice(2, 6)}`;
    const inventory: Inventory = {
      id,
      ownerId,
      ownerName,
      type,
      capacity: Math.max(5, capacity),
      maxWeightKg: Math.max(5.0, maxWeightKg),
      items: new Map<number, ItemStack>(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.inventories.set(id, inventory);
    this.notifyUpdate("inventory_created", { inventoryId: id, ownerId, type, capacity });
    return inventory;
  }

  public getInventory(invId: string): Inventory | undefined {
    return this.inventories.get(invId);
  }

  public getInventoryByOwner(ownerId: string, type: InventoryType = "player"): Inventory | undefined {
    for (const inv of this.inventories.values()) {
      if (inv.ownerId === ownerId && inv.type === type) {
        return inv;
      }
    }
    return undefined;
  }

  public addItem(
    invId: string,
    itemId: string,
    quantity: number,
    metadata?: Record<string, unknown>
  ): boolean {
    if (quantity <= 0) return false;
    const inv = this.inventories.get(invId);
    if (!inv) return false;

    const itemDef = ITEM_CATALOG[itemId] || {
      id: itemId,
      name: itemId,
      category: "misc",
      weightKg: 0.1,
      maxStack: 100,
      isUsable: false,
      description: "Objet standard",
    };

    const addedWeight = itemDef.weightKg * quantity;
    if (this.calculateTotalWeight(inv) + addedWeight > inv.maxWeightKg) {
      return false;
    }

    let remainingQty = quantity;

    if (itemDef.maxStack > 1 && !metadata) {
      for (const stack of inv.items.values()) {
        if (stack.itemId === itemId && stack.quantity < itemDef.maxStack) {
          const spaceInStack = itemDef.maxStack - stack.quantity;
          const toAdd = Math.min(spaceInStack, remainingQty);
          stack.quantity += toAdd;
          remainingQty -= toAdd;

          if (remainingQty <= 0) break;
        }
      }
    }

    while (remainingQty > 0) {
      const freeSlot = this.findFirstFreeSlot(inv);
      if (freeSlot === -1) {
        return false;
      }

      const stackSize = Math.min(remainingQty, itemDef.maxStack);
      inv.items.set(freeSlot, {
        slot: freeSlot,
        itemId,
        quantity: stackSize,
        metadata: metadata ? { ...metadata } : undefined,
      });

      remainingQty -= stackSize;
    }

    inv.updatedAt = Date.now();
    this.notifyUpdate("item_added", { inventoryId: invId, itemId, quantity, newWeight: this.calculateTotalWeight(inv) });
    return true;
  }

  public removeItem(invId: string, itemId: string, quantity: number): boolean {
    if (quantity <= 0) return false;
    const inv = this.inventories.get(invId);
    if (!inv) return false;

    if (this.getItemCount(invId, itemId) < quantity) {
      return false;
    }

    let toRemove = quantity;
    const slotsToRemove: number[] = [];

    for (const [slot, stack] of inv.items.entries()) {
      if (stack.itemId !== itemId) continue;

      if (stack.quantity <= toRemove) {
        toRemove -= stack.quantity;
        slotsToRemove.push(slot);
      } else {
        stack.quantity -= toRemove;
        toRemove = 0;
        break;
      }

      if (toRemove <= 0) break;
    }

    for (const slot of slotsToRemove) {
      inv.items.delete(slot);
    }

    inv.updatedAt = Date.now();
    this.notifyUpdate("item_removed", { inventoryId: invId, itemId, quantity });
    return true;
  }

  public transferItem(
    fromInvId: string,
    toInvId: string,
    itemId: string,
    quantity: number
  ): boolean {
    const from = this.inventories.get(fromInvId);
    const to = this.inventories.get(toInvId);
    if (!from || !to || quantity <= 0) return false;

    if (this.getItemCount(fromInvId, itemId) < quantity) return false;

    const itemDef = ITEM_CATALOG[itemId];
    const weight = (itemDef?.weightKg ?? 0.1) * quantity;
    if (this.calculateTotalWeight(to) + weight > to.maxWeightKg) return false;

    if (this.removeItem(fromInvId, itemId, quantity)) {
      if (this.addItem(toInvId, itemId, quantity)) {
        this.notifyUpdate("item_transferred", { fromInvId, toInvId, itemId, quantity });
        return true;
      } else {
        this.addItem(fromInvId, itemId, quantity);
        return false;
      }
    }

    return false;
  }

  public getItemCount(invId: string, itemId: string): number {
    const inv = this.inventories.get(invId);
    if (!inv) return 0;

    let count = 0;
    for (const stack of inv.items.values()) {
      if (stack.itemId === itemId) count += stack.quantity;
    }
    return count;
  }

  public hasItem(invId: string, itemId: string, quantity = 1): boolean {
    return this.getItemCount(invId, itemId) >= quantity;
  }

  public calculateTotalWeight(inv: Inventory): number {
    let total = 0;
    for (const stack of inv.items.values()) {
      const def = ITEM_CATALOG[stack.itemId];
      const unitWeight = def?.weightKg ?? 0.1;
      total += unitWeight * stack.quantity;
    }
    return Math.round(total * 100) / 100;
  }

  private findFirstFreeSlot(inv: Inventory): number {
    for (let i = 0; i < inv.capacity; i++) {
      if (!inv.items.has(i)) return i;
    }
    return -1;
  }

  public getDTO(invId: string): InventoryDTO | undefined {
    const inv = this.inventories.get(invId);
    if (!inv) return undefined;

    return {
      id: inv.id,
      ownerId: inv.ownerId,
      ownerName: inv.ownerName,
      type: inv.type,
      capacity: inv.capacity,
      maxWeightKg: inv.maxWeightKg,
      currentWeightKg: this.calculateTotalWeight(inv),
      itemCount: inv.items.size,
      items: Array.from(inv.items.values()),
    };
  }

  public onUpdate(callback: InventoryUpdateListener): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("[InventorySystem] Erreur écouteur update :", err);
      }
    }
  }

  public dispose(): void {
    this.updateListeners.clear();
    this.inventories.clear();
    console.log("🛑 [InventorySystem] Système d'inventaire libéré proprement.");
  }
}

export const inventoryManager = new InventoryManager();
