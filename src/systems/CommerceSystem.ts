// ═══════════════════════════════════════════════════════════════════════════
//  COMMERCE SYSTEM v2.0 — BOUTIQUES & COMMERCE
//  Magasins, vendeurs, prix dynamiques, achats/ventes
// ═══════════════════════════════════════════════════════════════════════════

export type ShopType = 'general' | 'weapons' | 'food' | 'drugs' | 'clothing' | 'electronics' | 'black_market';

export interface ShopListing {
  listingId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  price: number; // Par unité
  owner?: string; // playerId si vendeur privé
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
  security: number; // 0-100
  employees?: string[]; // playerIds
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

// ─────────────────────────────────────────────────────────────────────────
//  COMMERCE MANAGER
// ─────────────────────────────────────────────────────────────────────────

export class CommerceManager {
  private shops: Map<string, Shop> = new Map();
  private playerMarkets: Map<string, PlayerMarket> = new Map();
  private transactions: Transaction[] = [];
  private priceHistory: Map<string, number[]> = new Map();
  private onUpdateCallback: ((data: any) => void) | null = null;
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultShops();
    this.startPriceSystem();
  }

  /**
   * Initialiser magasins par défaut
   */
  private initializeDefaultShops() {
    const shops: Shop[] = [
      {
        shopId: 'shop_supermarket_01',
        name: '🏬 SuperMart Portneuf',
        type: 'general',
        description: 'Grand magasin général québécois',
        owner: 'npc_owner_01',
        location: { x: 0, y: 2, z: 25 },
        listings: new Map(),
        reputation: 85,
        hoursOpen: { start: 8, end: 22 },
        cashRegister: 50000,
        maxCapacity: 1000,
        security: 60,
        profitMargin: 30,
      },
      {
        shopId: 'shop_weapons_01',
        name: '🔫 Armurerie Chasse & Tir',
        type: 'weapons',
        description: 'Magasin d\'armes légales et munitions',
        owner: 'npc_owner_02',
        location: { x: 20, y: 2, z: 30 },
        listings: new Map(),
        reputation: 75,
        hoursOpen: { start: 10, end: 18 },
        cashRegister: 100000,
        maxCapacity: 500,
        security: 95,
        profitMargin: 50,
      },
      {
        shopId: 'shop_food_01',
        name: '🍕 Chez Ti-Guy Casse-Croûte & Pizza',
        type: 'food',
        description: 'Casse-croûte et pizzeria populaire de la 138',
        owner: 'npc_owner_03',
        location: { x: -10, y: 2, z: -15 },
        listings: new Map(),
        reputation: 90,
        hoursOpen: { start: 11, end: 23 },
        cashRegister: 20000,
        maxCapacity: 200,
        security: 40,
        profitMargin: 60,
      },
      {
        shopId: 'shop_clothing_01',
        name: '👕 Boutique Éther Mode & Vêtements',
        type: 'clothing',
        description: 'Vêtements québécois, bottes et manteaux d\'hiver',
        owner: 'npc_owner_04',
        location: { x: -22, y: 2, z: 10 },
        listings: new Map(),
        reputation: 70,
        hoursOpen: { start: 9, end: 21 },
        cashRegister: 30000,
        maxCapacity: 300,
        security: 50,
        profitMargin: 40,
      },
      {
        shopId: 'shop_black_market_01',
        name: '🕷️ Le Sous-Sol Clandestin',
        type: 'black_market',
        description: 'Marché noir clandestin et matériel illégal',
        owner: 'npc_dealer_01',
        location: { x: 148, y: 1, z: 125 },
        listings: new Map(),
        reputation: 50,
        hoursOpen: { start: 20, end: 6 },
        cashRegister: 150000,
        maxCapacity: 200,
        security: 80,
        profitMargin: 100,
      },
    ];

    // Ajouter listings par défaut
    shops.forEach(shop => {
      if (shop.type === 'general' || shop.type === 'food') {
        shop.listings.set('list_food_burger', {
          listingId: 'list_food_burger',
          itemId: 'food_burger',
          itemName: 'Burger Québécois au Bacon',
          quantity: 50,
          price: 15,
          addedAt: Date.now(),
        });
        shop.listings.set('list_food_poutine', {
          listingId: 'list_food_poutine',
          itemId: 'food_poutine',
          itemName: 'Grande Poutine Traditionnelle',
          quantity: 40,
          price: 18,
          addedAt: Date.now(),
        });
        shop.listings.set('list_drink_cola', {
          listingId: 'list_drink_cola',
          itemId: 'drink_cola',
          itemName: 'Canette de Cola Érable',
          quantity: 100,
          price: 4,
          addedAt: Date.now(),
        });
        shop.listings.set('list_medkit_01', {
          listingId: 'list_medkit_01',
          itemId: 'medkit_basic',
          itemName: 'Trousse de Premiers Soins',
          quantity: 25,
          price: 65,
          addedAt: Date.now(),
        });
      }
      if (shop.type === 'weapons') {
        shop.listings.set('list_weapon_pistol', {
          listingId: 'list_weapon_pistol',
          itemId: 'weapon_pistol_01',
          itemName: 'Pistolet 9mm Semi-Auto',
          quantity: 10,
          price: 500,
          addedAt: Date.now(),
        });
        shop.listings.set('list_ammo_9mm', {
          listingId: 'list_ammo_9mm',
          itemId: 'ammo_9mm_box',
          itemName: 'Boîte Munitions 9mm (50x)',
          quantity: 50,
          price: 75,
          addedAt: Date.now(),
        });
        shop.listings.set('list_hunting_rifle', {
          listingId: 'list_hunting_rifle',
          itemId: 'weapon_rifle_308',
          itemName: 'Carabine de Chasse .308 Win',
          quantity: 6,
          price: 1200,
          addedAt: Date.now(),
        });
      }
      if (shop.type === 'clothing') {
        shop.listings.set('list_cloth_jacket', {
          listingId: 'list_cloth_jacket',
          itemId: 'cloth_jacket_plaid',
          itemName: 'Veste Carrelée en Laine de Portneuf',
          quantity: 20,
          price: 120,
          addedAt: Date.now(),
        });
        shop.listings.set('list_cloth_boots', {
          listingId: 'list_cloth_boots',
          itemId: 'cloth_work_boots',
          itemName: 'Bottes de Travail d\'Hiver à Cap d\'Acier',
          quantity: 15,
          price: 180,
          addedAt: Date.now(),
        });
      }
      if (shop.type === 'black_market') {
        shop.listings.set('list_lockpick', {
          listingId: 'list_lockpick',
          itemId: 'tool_lockpick',
          itemName: 'Jeu de Crochets Professionnel',
          quantity: 12,
          price: 350,
          addedAt: Date.now(),
        });
        shop.listings.set('list_scrambler', {
          listingId: 'list_scrambler',
          itemId: 'tool_radio_scrambler',
          itemName: 'Brouilleur d\'Ondes Radio Portatif',
          quantity: 4,
          price: 2500,
          addedAt: Date.now(),
        });
      }

      this.shops.set(shop.shopId, shop);
    });

    console.log(`✅ ${shops.length} magasins initialisés`);
  }

  /**
   * Acheter dans magasin
   */
  buyFromShop(
    shopId: string,
    playerId: string,
    playerName: string,
    listingId: string,
    quantity: number
  ): Transaction | null {
    const shop = this.shops.get(shopId);
    const listing = shop?.listings.get(listingId);

    if (!shop || !listing || listing.quantity < quantity) return null;

    const totalPrice = listing.price * quantity;

    listing.quantity -= quantity;
    shop.cashRegister += totalPrice;

    const transaction: Transaction = {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    console.log(`✅ ${playerName} achat: ${quantity}x ${listing.itemName} ($${totalPrice})`);
    this.onUpdateCallback?.({ type: 'purchase', shopId, transaction });
    return transaction;
  }

  /**
   * Vendre au magasin
   */
  sellToShop(
    shopId: string,
    playerId: string,
    playerName: string,
    itemId: string,
    itemName: string,
    quantity: number,
    basePrice: number
  ): Transaction | null {
    const shop = this.shops.get(shopId);
    if (!shop) return null;

    // Prix de revente (réduit)
    const sellPrice = Math.round(basePrice * 0.6); // 60% de la valeur
    const totalPrice = sellPrice * quantity;

    shop.cashRegister -= totalPrice;

    // Ajouter ou mettre à jour listing
    const existingListing = Array.from(shop.listings.values()).find(l => l.itemId === itemId);
    if (existingListing) {
      existingListing.quantity += quantity;
    } else {
      shop.listings.set(`list_${itemId}_${Date.now()}`, {
        listingId: `list_${itemId}_${Date.now()}`,
        itemId,
        itemName,
        quantity,
        price: sellPrice,
        owner: playerId,
        addedAt: Date.now(),
      });
    }

    const transaction: Transaction = {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    console.log(`💳 ${playerName} vente: ${quantity}x ${itemName} ($${totalPrice})`);
    this.onUpdateCallback?.({ type: 'sale', shopId, transaction });
    return transaction;
  }

  /**
   * Créer marché joueur
   */
  createPlayerMarket(playerId: string, playerName: string): PlayerMarket {
    const marketId = `market_${playerId}_${Date.now()}`;

    const market: PlayerMarket = {
      marketId,
      playerId,
      playerName,
      listings: new Map(),
      sales: 0,
      reputation: 50,
      joinedDate: Date.now(),
    };

    this.playerMarkets.set(playerId, market);
    console.log(`✅ Marché joueur créé: ${playerName}`);
    return market;
  }

  /**
   * Ajouter listing marché joueur
   */
  addPlayerListing(
    playerId: string,
    itemId: string,
    itemName: string,
    quantity: number,
    price: number
  ): ShopListing | null {
    let market = this.playerMarkets.get(playerId);
    if (!market) {
      market = this.createPlayerMarket(playerId, 'Joueur');
    }

    const listingId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const listing: ShopListing = {
      listingId,
      itemId,
      itemName,
      quantity,
      price,
      owner: playerId,
      addedAt: Date.now(),
    };

    market.listings.set(listingId, listing);
    console.log(`📌 Listing ajouté: ${itemName} x${quantity} ($${price} chacun)`);
    return listing;
  }

  /**
   * Acheter listing joueur
   */
  buyPlayerListing(
    buyerId: string,
    buyerName: string,
    sellerId: string,
    listingId: string,
    quantity: number
  ): Transaction | null {
    const sellerMarket = this.playerMarkets.get(sellerId);
    const listing = sellerMarket?.listings.get(listingId);

    if (!sellerMarket || !listing || listing.quantity < quantity) return null;

    const totalPrice = listing.price * quantity;

    listing.quantity -= quantity;
    if (listing.quantity <= 0) {
      sellerMarket.listings.delete(listingId);
    }

    sellerMarket.sales++;

    const transaction: Transaction = {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      shopId: '',
      buyerId,
      buyerName,
      sellerId,
      sellerName: sellerMarket.playerName,
      itemId: listing.itemId,
      itemName: listing.itemName,
      quantity,
      unitPrice: listing.price,
      totalPrice,
      date: Date.now(),
      type: 'purchase',
    };

    this.transactions.push(transaction);
    console.log(`🤝 Transaction joueur: ${buyerName} ← ${sellerMarket.playerName} (${quantity}x ${listing.itemName})`);
    return transaction;
  }

  /**
   * Système de prix dynamique
   */
  private startPriceSystem() {
    this.priceUpdateInterval = setInterval(() => {
      this.shops.forEach(shop => {
        shop.listings.forEach(listing => {
          // Simuler variation de prix (±5%)
          const variation = (Math.random() - 0.5) * 0.1;
          listing.price = Math.max(1, Math.round(listing.price * (1 + variation)));

          if (!this.priceHistory.has(listing.itemId)) {
            this.priceHistory.set(listing.itemId, []);
          }
          this.priceHistory.get(listing.itemId)!.push(listing.price);
        });
      });
    }, 1000 * 60 * 60);
  }

  /**
   * Obtenir magasin
   */
  getShop(shopId: string): Shop | undefined {
    return this.shops.get(shopId);
  }

  /**
   * Tous les magasins
   */
  getAllShops(): Shop[] {
    return Array.from(this.shops.values());
  }

  /**
   * Lister magasins par type
   */
  getShopsByType(type: ShopType): Shop[] {
    return Array.from(this.shops.values()).filter(s => s.type === type);
  }

  /**
   * Obtenir marché joueur
   */
  getPlayerMarket(playerId: string): PlayerMarket | undefined {
    return this.playerMarkets.get(playerId);
  }

  /**
   * Tous les marchés joueurs
   */
  getAllPlayerMarkets(): PlayerMarket[] {
    return Array.from(this.playerMarkets.values());
  }

  /**
   * Historique transactions
   */
  getTransactionHistory(limit: number = 50): Transaction[] {
    return this.transactions.slice(-limit);
  }

  /**
   * Callback
   */
  onUpdate(callback: (data: any) => void) {
    this.onUpdateCallback = callback;
  }

  /**
   * Dispose
   */
  dispose() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
  }
}

/**
 * Export singleton
 */
export const commerceManager = new CommerceManager();
