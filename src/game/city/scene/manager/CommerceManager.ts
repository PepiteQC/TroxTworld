// ═══════════════════════════════════════════════════════════════════════════
//  COMMERCE SYSTEM v2.0 — BOUTIQUES, MARCHÉ ENTRE JOUEURS & ÉCONOMIE RP
//  src/game/commerce/CommerceManager.ts
//  Transactions atomiques · Sécurisation des caisses · Synchro Inventaire & Cash
// ═══════════════════════════════════════════════════════════════════════════

import { intellectus } from '../../intellectus';
import { inventoryManager } from '../inventory/InventoryManager';

export type ShopType =
  | 'general'
  | 'weapons'
  | 'food'
  | 'drugs'
  | 'clothing'
  | 'electronics'
  | 'black_market'
  | 'pharmacy';

export interface ShopListing {
  listingId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  price: number; // Prix unitaire
  owner?: string; // ID du joueur si vendeur privé
  addedAt: number;
}

export interface Shop {
  shopId: string;
  name: string;
  type: ShopType;
  description: string;
  owner: string; // NPC ou playerId
  location: { x: number; y: number; z: number };
  listings: Map<string, ShopListing>;
  reputation: number;
  hoursOpen: { start: number; end: number };
  cashRegister: number;
  maxCapacity: number;
  security: number; // 0 à 100
  profitMargin: number; // %
}

export interface Transaction {
  transactionId: string;
  shopId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: number;
  type: 'purchase' | 'sale' | 'trade';
}

export interface PlayerMarket {
  marketId: string;
  playerId: string;
  playerName: string;
  listings: Map<string, ShopListing>;
  sales: number;
  reputation: number;
  joinedDate: number;
}

export class CommerceManager {
  private shops: Map<string, Shop> = new Map();
  private playerMarkets: Map<string, PlayerMarket> = new Map();
  private transactions: Transaction[] = [];
  private priceHistory: Map<string, number[]> = new Map();
  private updateListener: ((data: any) => void) | null = null;
  private priceUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeDefaultShops();
    this.startPriceSystem();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. INITIALISATION DES COMMERCES DE LA ROUTE 138 & PORTNEUF
  // ─────────────────────────────────────────────────────────────────────────

  private initializeDefaultShops() {
    const shopsData: Shop[] = [
      // 🍔 Burger King Portneuf (Halte routière Route 138)
      {
        shopId: 'shop_burger_king_portneuf',
        name: '🍔 Burger King Portneuf',
        type: 'food',
        description: 'Halte routière Route 138 — Whoppers, frites chaudes et boissons fraîches',
        owner: 'npc_manager_bk',
        location: { x: 45, y: 1.0, z: -85 },
        listings: new Map(),
        reputation: 95,
        hoursOpen: { start: 0, end: 24 }, // Ouvert 24/7
        cashRegister: 85000,
        maxCapacity: 500,
        security: 75,
        profitMargin: 25,
      },
      // 🏪 Dépanneur Couche-Tard (Saint-Casimir)
      {
        shopId: 'shop_depanneur_st_casimir',
        name: '🏪 Dépanneur Couche-Tard',
        type: 'general',
        description: 'Épicerie, café de route, téléphones et outils essentiels',
        owner: 'npc_owner_depanneur',
        location: { x: -500, y: 1.0, z: -400 },
        listings: new Map(),
        reputation: 90,
        hoursOpen: { start: 6, end: 23 },
        cashRegister: 45000,
        maxCapacity: 600,
        security: 60,
        profitMargin: 30,
      },
      // ⚔️ Marché Noir / L'Armurier Clandestin (Fond de rang)
      {
        shopId: 'shop_weapons_blackmarket',
        name: '⚔️ L\'Armurier Clandestin',
        type: 'black_market',
        description: 'Équipements réservés aux organisations — Armes de poing et outils de crochetage',
        owner: 'npc_dealer_blackmarket',
        location: { x: 2800, y: 1.0, z: 125 },
        listings: new Map(),
        reputation: 50,
        hoursOpen: { start: 20, end: 5 }, // Ouvert uniquement la nuit
        cashRegister: 250000,
        maxCapacity: 200,
        security: 95,
        profitMargin: 100,
      },
      // 💊 Pharmacie Régionale (Centre Médical Portneuf)
      {
        shopId: 'shop_pharmacy_portneuf',
        name: '💊 Pharmacie & Soins EMS',
        type: 'pharmacy',
        description: 'Bandages stériles, trousses de premiers soins et kits médicaux',
        owner: 'npc_pharmacist',
        location: { x: 10200, y: 1.0, z: -20 },
        listings: new Map(),
        reputation: 100,
        hoursOpen: { start: 7, end: 21 },
        cashRegister: 60000,
        maxCapacity: 400,
        security: 80,
        profitMargin: 20,
      },
    ];

    // Peuplement des catalogues
    shopsData.forEach((shop) => {
      if (shop.shopId === 'shop_burger_king_portneuf') {
        this.addListingToShop(shop, 'food_whopper', 'Whopper Burger King', 100, 12);
        this.addListingToShop(shop, 'food_bk_fries', 'Grandes Frites Croustillantes', 150, 5);
        this.addListingToShop(shop, 'drink_soda', 'Grand Soda Frais', 200, 3);
      } else if (shop.shopId === 'shop_depanneur_st_casimir') {
        this.addListingToShop(shop, 'item_phone', 'Téléphone Intelligent TroxT', 50, 450);
        this.addListingToShop(shop, 'drink_coffee', 'Café Tim Chaud', 200, 2);
        this.addListingToShop(shop, 'tool_wrench', 'Clé Mécanique de Secours', 40, 75);
        this.addListingToShop(shop, 'food_chips', 'Sac de Croustilles BBQ', 100, 4);
      } else if (shop.shopId === 'shop_weapons_blackmarket') {
        this.addListingToShop(shop, 'weapon_pistol_01', 'Pistolet 9mm Semi-Auto', 20, 2500);
        this.addListingToShop(shop, 'ammo_9mm', 'Boîte de 50 Munitions 9mm', 100, 350);
        this.addListingToShop(shop, 'tool_lockpick', 'Kit de Crochetage Serrure', 40, 600);
        this.addListingToShop(shop, 'tool_crowbar', 'Pied-de-biche Renforcé', 25, 450);
      } else if (shop.shopId === 'shop_pharmacy_portneuf') {
        this.addListingToShop(shop, 'item_medkit', 'Trousse de Premiers Soins Complète', 80, 150);
        this.addListingToShop(shop, 'item_bandage', 'Bandage de Compression', 200, 35);
      }

      this.shops.set(shop.shopId, shop);
    });

    console.log(`🛒 [CommerceManager] ${this.shops.size} boutiques enregistrées avec inventaire actif.`);
  }

  private addListingToShop(shop: Shop, itemId: string, itemName: string, quantity: number, price: number) {
    const listingId = `list_${itemId}`;
    shop.listings.set(listingId, {
      listingId,
      itemId,
      itemName,
      quantity,
      price,
      addedAt: Date.now(),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. ACHAT DANS UNE BOUTIQUE (TRANSACTION ATOMIQUE & SÉCURISÉE)
  // ─────────────────────────────────────────────────────────────────────────

  public buyFromShop(
    shopId: string,
    playerId: string,
    playerName: string,
    listingId: string,
    quantity = 1
  ): { ok: boolean; transaction?: Transaction; error?: string } {
    const shop = this.shops.get(shopId);
    if (!shop) return { ok: false, error: 'Boutique introuvable.' };

    const listing = shop.listings.get(listingId);
    if (!listing) return { ok: false, error: 'Article indisponible au catalogue.' };

    if (listing.quantity < quantity) {
      return { ok: false, error: `Stock insuffisant (${listing.quantity} restant(s)).` };
    }

    const totalPrice = Math.round(listing.price * quantity);

    // 🛡️ SÉCURITÉ FINANCIÈRE : Vérification et débit du cash joueur
    const player = intellectus.memory.get<any>('players', playerId);
    if (!player) return { ok: false, error: 'Profil citoyen introuvable.' };

    if ((player.cash || 0) < totalPrice) {
      return {
        ok: false,
        error: `Fonds insuffisants. Prix total : ${totalPrice.toLocaleString()} $ (Vous avez ${(player.cash || 0).toLocaleString()} $ sur vous).`,
      };
    }

    // 🛡️ INVENTAIRE : Ajout de l'objet dans le sac du joueur
    let inventoryId = player.characterId || playerId;
    let added = false;
    
    if (typeof inventoryManager?.addItem === 'function') {
      const inv = inventoryManager.getOrCreateInventory(playerId, playerName);
      added = inventoryManager.addItem(inv.inventoryId, listing.itemId, quantity);
    } else {
      // Fallback direct sur la session
      player.inventory = player.inventory || [];
      const existing = player.inventory.find((i: any) => i.itemId === listing.itemId || i.id === listing.itemId);
      if (existing) {
        existing.qty = (existing.qty || existing.quantity || 0) + quantity;
      } else {
        player.inventory.push({
          id: listing.itemId,
          itemId: listing.itemId,
          name: listing.itemName,
          qty: quantity,
          quantity,
        });
      }
      added = true;
    }

    if (!added) {
      return { ok: false, error: 'Votre inventaire est plein ou trop lourd pour recevoir ces articles.' };
    }

    // Débit du joueur et crédit de la caisse enregistreuse
    player.cash -= totalPrice;
    intellectus.memory.set('players', playerId, player, true); // Persistance immédiate

    listing.quantity -= quantity;
    shop.cashRegister += totalPrice;

    const transaction: Transaction = {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      shopId,
      buyerId: playerId,
      buyerName: playerName,
      sellerId: shop.owner,
      sellerName: shop.name,
      itemId: listing.itemId,
      itemName: listing.itemName,
      quantity,
      unitPrice: listing.price,
      totalPrice,
      date: Date.now(),
      type: 'purchase',
    };

    this.transactions.push(transaction);
    if (this.transactions.length > 300) this.transactions.shift();

    this.updateListener?.({ type: 'purchase', shopId, transaction });

    // Notification sur le bus d'événements
    void intellectus.emit('economy', 'shop_purchase', {
      transactionId: transaction.transactionId,
      shopId,
      playerId,
      totalPrice,
      itemId: listing.itemId,
    }, { sourceAgent: 'commerce' });

    return { ok: true, transaction };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. VENTE D'OBJETS À LA BOUTIQUE (RACHAT OCCASION)
  // ─────────────────────────────────────────────────────────────────────────

  public sellToShop(
    shopId: string,
    playerId: string,
    playerName: string,
    itemId: string,
    itemName: string,
    quantity = 1,
    basePrice = 10
  ): { ok: boolean; transaction?: Transaction; error?: string } {
    const shop = this.shops.get(shopId);
    if (!shop) return { ok: false, error: 'Boutique introuvable.' };

    const sellPrice = Math.max(1, Math.round(basePrice * 0.6)); // Rachat à 60% du prix neuf
    const totalPrice = sellPrice * quantity;

    // 🛡️ SÉCURITÉ CAISSE : Le magasin doit avoir les liquidités pour racheter
    if (shop.cashRegister < totalPrice) {
      return { ok: false, error: 'Le commerçant n\'a pas assez de liquidités en caisse pour racheter vos articles.' };
    }

    const player = intellectus.memory.get<any>('players', playerId);
    if (!player) return { ok: false, error: 'Profil citoyen introuvable.' };

    // Vérification et retrait de l'item de l'inventaire
    let removed = false;
    if (typeof inventoryManager?.removeItem === 'function') {
      const inv = inventoryManager.getOrCreateInventory(playerId, playerName);
      removed = inventoryManager.removeItem(inv.inventoryId, itemId, quantity);
    } else {
      player.inventory = player.inventory || [];
      const itemIndex = player.inventory.findIndex((i: any) => i.itemId === itemId || i.id === itemId);
      if (itemIndex !== -1 && (player.inventory[itemIndex].qty || player.inventory[itemIndex].quantity || 0) >= quantity) {
        player.inventory[itemIndex].qty -= quantity;
        if (player.inventory[itemIndex].qty <= 0) {
          player.inventory.splice(itemIndex, 1);
        }
        removed = true;
      }
    }

    if (!removed) {
      return { ok: false, error: 'Vous ne possédez pas ces objets en quantité suffisante.' };
    }

    // Versement de l'argent et déduction de la caisse
    player.cash = (player.cash || 0) + totalPrice;
    intellectus.memory.set('players', playerId, player, true);

    shop.cashRegister -= totalPrice;

    // Réapprovisionnement des stocks de la boutique
    const existingListing = Array.from(shop.listings.values()).find((l) => l.itemId === itemId);
    if (existingListing) {
      existingListing.quantity += quantity;
    } else {
      shop.listings.set(`list_${itemId}_${Date.now()}`, {
        listingId: `list_${itemId}_${Date.now()}`,
        itemId,
        itemName,
        quantity,
        price: Math.round(basePrice),
        owner: playerId,
        addedAt: Date.now(),
      });
    }

    const transaction: Transaction = {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      shopId,
      buyerId: shop.owner,
      buyerName: shop.name,
      sellerId: playerId,
      sellerName: playerName,
      itemId,
      itemName,
      quantity,
      unitPrice: sellPrice,
      totalPrice,
      date: Date.now(),
      type: 'sale',
    };

    this.transactions.push(transaction);
    if (this.transactions.length > 300) this.transactions.shift();

    this.updateListener?.({ type: 'sale', shopId, transaction });
    return { ok: true, transaction };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MARCHÉ LIBRE ENTRE JOUEURS (PLAYER MARKETPLACE)
  // ─────────────────────────────────────────────────────────────────────────

  createPlayerMarket(playerId: string, playerName: string): PlayerMarket {
    let market = this.playerMarkets.get(playerId);
    if (market) return market;

    const marketId = `market_${playerId}_${Date.now()}`;
    market = {
      marketId,
      playerId,
      playerName,
      listings: new Map(),
      sales: 0,
      reputation: 50,
      joinedDate: Date.now(),
    };
    this.playerMarkets.set(playerId, market);
    return market;
  }

  addPlayerListing(
    playerId: string,
    itemId: string,
    itemName: string,
    quantity: number,
    price: number
  ): ShopListing | null {
    let market = this.playerMarkets.get(playerId);
    if (!market) {
      market = this.createPlayerMarket(playerId, 'Vendeur');
    }

    const listingId = `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const listing: ShopListing = {
      listingId,
      itemId,
      itemName,
      quantity,
      price: Math.max(1, Math.round(price)),
      owner: playerId,
      addedAt: Date.now(),
    };

    market.listings.set(listingId, listing);
    return listing;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. FLUCTUATION DES PRIX ÉCONOMIQUES (OFFRE ET DEMANDE)
  // ─────────────────────────────────────────────────────────────────────────

  private startPriceSystem() {
    // Calcul horaire des variations de prix légères
    this.priceUpdateInterval = setInterval(() => {
      this.shops.forEach((shop) => {
        shop.listings.forEach((listing) => {
          const variation = (Math.random() - 0.5) * 0.08; // +/- 4% max
          listing.price = Math.max(1, Math.round(listing.price * (1 + variation)));

          if (!this.priceHistory.has(listing.itemId)) {
            this.priceHistory.set(listing.itemId, []);
          }
          const history = this.priceHistory.get(listing.itemId)!;
          history.push(listing.price);
          if (history.length > 24) history.shift(); // 24 heures max
        });
      });
    }, 1000 * 60 * 60);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. ACCESSEURS
  // ─────────────────────────────────────────────────────────────────────────

  getShop(shopId: string): Shop | undefined {
    return this.shops.get(shopId);
  }

  getAllShops(): Shop[] {
    return Array.from(this.shops.values());
  }

  getShopsByType(type: ShopType): Shop[] {
    return Array.from(this.shops.values()).filter((s) => s.type === type);
  }

  getPlayerMarket(playerId: string): PlayerMarket | undefined {
    return this.playerMarkets.get(playerId);
  }

  getTransactionHistory(limit = 50): Transaction[] {
    return this.transactions.slice(-limit);
  }

  onUpdate(callback: (data: any) => void) {
    this.updateListener = callback;
  }

  dispose() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
  }
}

export const commerceManager = new CommerceManager();