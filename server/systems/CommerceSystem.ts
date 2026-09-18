/**
 * ═══════════════════════════════════════════════════════════════════
 * 🛍️ TROXTWORLD / ETHERWORLD — SYSTÈME DE COMMERCE & BOUTIQUES (COMMERCE)
 * ═══════════════════════════════════════════════════════════════════
 */

export interface Listing {
  id: string;
  itemId: string;
  price: number;
  stock: number;
}

export interface Shop {
  id: string;
  name: string;
  type: "grocery" | "clothing" | "hardware" | "illegal" | "weapons";
  listings: Map<string, Listing>;
}

export type CommerceUpdateListener = (event: Record<string, unknown>) => void;

export class CommerceManager {
  private shops: Map<string, Shop> = new Map();
  private updateListeners: Set<CommerceUpdateListener> = new Set();

  constructor() {
    this.seedDefaultShops();
    console.log(`🛍️ [CommerceSystem] Initialisé : ${this.shops.size} magasins ouverts.`);
  }

  private seedDefaultShops(): void {
    const mainStore: Shop = {
      id: "shop_couchetard_pontrouge",
      name: "Couche-Tard & Irving (Pont-Rouge)",
      type: "grocery",
      listings: new Map([
        ["item_1", { id: "item_1", itemId: "poutine", price: 15, stock: 100 }],
        ["item_2", { id: "item_2", itemId: "water_bottle", price: 3, stock: 200 }],
        ["item_3", { id: "item_3", itemId: "sandwich", price: 8, stock: 50 }],
        ["item_4", { id: "item_4", itemId: "coffee", price: 4, stock: 300 }],
      ]),
    };

    const weaponStore: Shop = {
      id: "shop_gun_straymond",
      name: "Chasse & Pêche Saint-Raymond",
      type: "weapons",
      listings: new Map([
        ["weapon_1", { id: "weapon_1", itemId: "weapon_shotgun_12g", price: 1200, stock: 5 }],
        ["ammo_1", { id: "ammo_1", itemId: "ammo_shotgun_12g", price: 45, stock: 80 }],
      ]),
    };

    this.shops.set(mainStore.id, mainStore);
    this.shops.set(weaponStore.id, weaponStore);
  }

  public buyFromShop(
    shopId: string,
    playerId: string,
    playerName: string,
    listingId: string,
    quantity: number
  ): { itemId: string; totalPrice: number } | null {
    const shop = this.shops.get(shopId);
    if (!shop) return null;

    const listing = shop.listings.get(listingId);
    if (!listing || listing.stock < quantity) return null;

    const totalPrice = listing.price * quantity;
    listing.stock -= quantity;

    this.notifyUpdate("item_bought", {
      shopId,
      shopName: shop.name,
      playerId,
      playerName,
      listingId,
      itemId: listing.itemId,
      quantity,
      totalPrice,
    });

    return {
      itemId: listing.itemId,
      totalPrice,
    };
  }

  public getShop(shopId: string): Shop | undefined {
    return this.shops.get(shopId);
  }

  public getAllShops(): Shop[] {
    return Array.from(this.shops.values());
  }

  public onUpdate(callback: CommerceUpdateListener): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("[CommerceSystem] Erreur listener :", err);
      }
    }
  }

  public dispose(): void {
    this.updateListeners.clear();
    this.shops.clear();
    console.log("🛑 [CommerceSystem] Magasins fermés.");
  }
}

export const commerceManager = new CommerceManager();
