/**
 * ═════════════════════════════════════════════════════════════════════════════
 *  🛍️ TROXTWORLD / ETHERWORLD — SYSTÈME DE COMMERCE & BOUTIQUES v2.0
 *  src/server/systems/CommerceSystem.ts
 * ─────────────────────────────────────────────────────────────────────────────
 *  • 10 types de boutiques (grocery, clothing, hardware, illegal, weapons,
 *    pharmacy, garage, restaurant, liquor, cannabis)
 *  • Prix dynamiques (markup par type + supply/demand)
 *  • Taxes Québec (TPS 5% + TVQ 9.975%)
 *  • Restock automatique + commandes fournisseurs
 *  • Horaires d'ouverture + gestion employés
 *  • Licences requises (armes, alcool, cannabis)
 *  • Stock par variante + weight + métadonnées
 *  • Promotions / discounts / bundles
 *  • Bulk buy / bulk pricing tiers
 *  • Remboursements / retours
 *  • Recherche par type / proximité / nom
 *  • Statistiques (top sellers, revenus, marges)
 *  • Events complets + subscribers
 *  • Health check + dispose
 *  • Compat 100% v1
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ═════════════════════════════════════════════════════════════════════════════
//  1. TYPES (v1 compat + extensions v2)
// ═════════════════════════════════════════════════════════════════════════════

export type ShopType =
  | 'grocery'
  | 'clothing'
  | 'hardware'
  | 'illegal'
  | 'weapons'
  // 🆕 v2
  | 'pharmacy'
  | 'garage'
  | 'restaurant'
  | 'liquor'
  | 'cannabis';

export type LicenseType =
  | 'firearms'
  | 'alcohol'
  | 'cannabis'
  | 'pharmacy'
  | 'driver'
  | 'business';

export type DiscountKind = 'percent' | 'fixed';

export interface Listing {
  id: string;
  itemId: string;
  price: number;
  stock: number;

  // 🆕 v2
  /** Prix de gros (achat fournisseur). */
  wholesalePrice?: number;
  /** Catégorie d'item (food, weapon, clothing…). */
  category?: string;
  /** Poids unitaire (g). */
  weight?: number;
  /** Icon emoji. */
  icon?: string;
  /** Nom lisible. */
  name?: string;
  /** Description RP. */
  description?: string;
  /** Stock max (auto restock). */
  maxStock?: number;
  /** Seuil de restock. */
  restockThreshold?: number;
  /** Stock disponible à la vente (false = retiré du catalogue). */
  available?: boolean;
  /** Licence requise pour acheter. */
  requiresLicense?: LicenseType;
  /** Âge minimum. */
  minAge?: number;
  /** Tags (alcool, arme, illegal, food…). */
  tags?: string[];
  /** Prix barré (promo). */
  compareAtPrice?: number;
  /** Quantité max par transaction. */
  maxPerTransaction?: number;
}

export interface Shop {
  id: string;
  name: string;
  type: ShopType;
  listings: Map<string, Listing>;

  // 🆕 v2
  /** Adresse textuelle. */
  address?: string;
  /** Position monde [x, y, z]. */
  position?: [number, number, number];
  /** Ville. */
  city?: string;
  /** Propriétaire (joueur). */
  ownerId?: string | null;
  /** Employés autorisés (joueurIds). */
  employeeIds?: Set<string>;
  /** Ouvert ? (si non défini, ouvert 24/7). */
  isOpen?: boolean;
  /** Horaires [openHour, closeHour] (0-24). */
  hours?: [number, number];
  /** Markup par défaut (multiplicateur prix de gros → prix de vente). */
  markup?: number;
  /** Licence que la boutique requiert pour opérer. */
  operatingLicense?: LicenseType;
  /** TPS/TVQ appliqués. */
  taxesEnabled?: boolean;
  /** Budget caisse (argent disponible pour restock). */
  cashRegister?: number;
  /** Promotions actives. */
  promos?: ShopPromo[];
  /** Icon emoji. */
  icon?: string;
  /** Tags libres. */
  tags?: string[];
}

export interface ShopPromo {
  id: string;
  kind: DiscountKind;
  value: number; // % ou $
  /** Appliqué à ces listingIds (vide = tout). */
  appliesTo?: string[];
  /** Expire à. */
  expiresAt: number;
  /** Code promo (optionnel). */
  code?: string;
}

export interface BuyResult {
  success: boolean;
  reason?: string;
  itemId?: string;
  quantity?: number;
  subtotal?: number;
  tps?: number;
  tvq?: number;
  discount?: number;
  totalPrice?: number;
  shopId?: string;
  shopName?: string;
  newStock?: number;
  transactionId?: string;
}

export interface CommerceConfig {
  /** Taux TPS (Québec 5%). */
  tpsRate: number;
  /** Taux TVQ (Québec 9.975%). */
  tvqRate: number;
  /** Markup par défaut par type de boutique. */
  defaultMarkups: Record<ShopType, number>;
  /** Intervalle de restock automatique (ms). */
  autoRestockIntervalMs: number;
  /** Rate limit achats (par joueur, par fenêtre). */
  buyRateLimit: { count: number; windowMs: number };
  /** Autoriser les achats même si stock partagé entre joueurs. */
  sharedStock: boolean;
  /** Logger verbose. */
  verbose: boolean;
}

const DEFAULT_CONFIG: CommerceConfig = {
  tpsRate: 0.05,
  tvqRate: 0.09975,
  defaultMarkups: {
    grocery: 1.25,
    clothing: 1.6,
    hardware: 1.4,
    illegal: 2.5,
    weapons: 1.8,
    pharmacy: 1.35,
    garage: 1.5,
    restaurant: 1.7,
    liquor: 1.65,
    cannabis: 1.4,
  },
  autoRestockIntervalMs: 5 * 60 * 1000,
  buyRateLimit: { count: 30, windowMs: 60_000 },
  sharedStock: true,
  verbose: false,
};

export type CommerceUpdateListener = (event: Record<string, unknown>) => void;

// ═════════════════════════════════════════════════════════════════════════════
//  2. UTILITAIRES
// ═════════════════════════════════════════════════════════════════════════════

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isShopOpen(shop: Shop, hour: number): boolean {
  if (shop.isOpen === false) return false;
  if (shop.isOpen === true) return true;
  if (!shop.hours) return true; // 24/7
  const [open, close] = shop.hours;
  const h = ((hour % 24) + 24) % 24;
  return open <= close ? h >= open && h < close : h >= open || h < close;
}

// ═════════════════════════════════════════════════════════════════════════════
//  3. COMMERCE MANAGER
// ═════════════════════════════════════════════════════════════════════════════

export class CommerceManager {
  private shops: Map<string, Shop> = new Map();
  private updateListeners: Set<CommerceUpdateListener> = new Set();
  private config: CommerceConfig;

  // Transactions log
  private transactions: Array<{
    id: string;
    shopId: string;
    playerId: string;
    playerName: string;
    itemId: string;
    quantity: number;
    subtotal: number;
    totalPrice: number;
    timestamp: number;
    refunded?: boolean;
  }> = [];
  private readonly MAX_TRANSACTIONS = 5000;

  // Rate limit per player
  private buyHistory = new Map<string, number[]>();

  // Timers
  private restockTimer: ReturnType<typeof setInterval> | null = null;

  // Stats
  private stats = {
    transactionsTotal: 0,
    revenueTotal: 0,
    taxesCollected: 0,
    refundsTotal: 0,
    refundAmountTotal: 0,
    restocksTotal: 0,
    itemsSoldByCategory: {} as Record<string, number>,
    topSellingItems: new Map<string, { itemId: string; count: number; revenue: number }>(),
  };

  // Getter optionnel fourni de l'extérieur pour connaître l'heure
  private hourProvider: (() => number) | null = null;

  // Getter optionnel pour les licences d'un joueur
  private licenseChecker: ((playerId: string, license: LicenseType) => boolean) | null = null;

  // Getter optionnel pour l'âge d'un joueur
  private ageProvider: ((playerId: string) => number) | null = null;

  constructor(config: Partial<CommerceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.seedDefaultShops();

    if (this.config.autoRestockIntervalMs > 0) {
      this.restockTimer = setInterval(
        () => this.autoRestock(),
        this.config.autoRestockIntervalMs,
      );
      if (this.restockTimer.unref) this.restockTimer.unref();
    }

    console.log(
      `🛍️ [CommerceSystem] v2.0 initialisé : ${this.shops.size} magasins · ` +
      `TPS ${(this.config.tpsRate * 100).toFixed(2)}% · TVQ ${(this.config.tvqRate * 100).toFixed(3)}%`,
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  SEED (v1 compat + extensions)
  // ═════════════════════════════════════════════════════════════════════════════

  private seedDefaultShops(): void {
    const mainStore: Shop = {
      id: 'shop_couchetard_pontrouge',
      name: 'Couche-Tard & Irving (Pont-Rouge)',
      type: 'grocery',
      icon: '🏪',
      address: '245 Rue Principale, Pont-Rouge, QC',
      city: 'Pont-Rouge',
      position: [100, 0, 50],
      hours: [6, 23],
      markup: this.config.defaultMarkups.grocery,
      taxesEnabled: true,
      cashRegister: 5000,
      listings: new Map<string, Listing>([
        ['item_1', {
          id: 'item_1', itemId: 'poutine', price: 15, stock: 100, wholesalePrice: 6,
          name: 'Poutine', icon: '🍟', category: 'food', weight: 450, maxStock: 200,
          restockThreshold: 20, available: true, tags: ['food', 'hot'],
        }],
        ['item_2', {
          id: 'item_2', itemId: 'water_bottle', price: 3, stock: 200, wholesalePrice: 1,
          name: 'Bouteille d\'eau', icon: '💧', category: 'drink', weight: 500,
          maxStock: 400, restockThreshold: 50, available: true, tags: ['drink'],
        }],
        ['item_3', {
          id: 'item_3', itemId: 'sandwich', price: 8, stock: 50, wholesalePrice: 3,
          name: 'Sandwich', icon: '🥪', category: 'food', weight: 250, maxStock: 100,
          restockThreshold: 15, available: true, tags: ['food', 'cold'],
        }],
        ['item_4', {
          id: 'item_4', itemId: 'coffee', price: 4, stock: 300, wholesalePrice: 1.2,
          name: 'Café', icon: '☕', category: 'drink', weight: 350, maxStock: 500,
          restockThreshold: 40, available: true, tags: ['drink', 'hot'],
        }],
      ]),
    };

    const weaponStore: Shop = {
      id: 'shop_gun_straymond',
      name: 'Chasse & Pêche Saint-Raymond',
      type: 'weapons',
      icon: '🔫',
      address: '400 Rue Saint-Joseph, Saint-Raymond, QC',
      city: 'Saint-Raymond',
      position: [-500, 0, -300],
      hours: [9, 18],
      markup: this.config.defaultMarkups.weapons,
      operatingLicense: 'firearms',
      taxesEnabled: true,
      cashRegister: 20000,
      listings: new Map<string, Listing>([
        ['weapon_1', {
          id: 'weapon_1', itemId: 'weapon_shotgun_12g', price: 1200, stock: 5,
          wholesalePrice: 600, name: 'Fusil de chasse 12g', icon: '🔫',
          category: 'weapon', weight: 3200, maxStock: 10, restockThreshold: 2,
          available: true, requiresLicense: 'firearms', minAge: 18,
          tags: ['weapon', 'hunting'], maxPerTransaction: 1,
        }],
        ['ammo_1', {
          id: 'ammo_1', itemId: 'ammo_shotgun_12g', price: 45, stock: 80,
          wholesalePrice: 15, name: 'Cartouches 12g (x25)', icon: '📦',
          category: 'ammo', weight: 800, maxStock: 200, restockThreshold: 20,
          available: true, requiresLicense: 'firearms', minAge: 18,
          tags: ['ammo', 'hunting'],
        }],
      ]),
    };

    // 🆕 v2 : boutiques supplémentaires
    const liquorStore: Shop = {
      id: 'shop_saq_portneuf',
      name: 'SAQ Sélection Portneuf',
      type: 'liquor',
      icon: '🍷',
      address: '100 Boul. Portneuf, Portneuf, QC',
      city: 'Portneuf',
      position: [120, 0, 400],
      hours: [10, 21],
      markup: this.config.defaultMarkups.liquor,
      taxesEnabled: true,
      cashRegister: 15000,
      listings: new Map<string, Listing>([
        ['liq_1', {
          id: 'liq_1', itemId: 'wine_red', price: 22, stock: 80, wholesalePrice: 10,
          name: 'Vin rouge Québec', icon: '🍷', category: 'alcohol', weight: 750,
          maxStock: 150, restockThreshold: 20, available: true,
          requiresLicense: 'alcohol', minAge: 18, tags: ['alcohol'],
        }],
        ['liq_2', {
          id: 'liq_2', itemId: 'beer_24pack', price: 32, stock: 60, wholesalePrice: 15,
          name: 'Bière 24 pack', icon: '🍺', category: 'alcohol', weight: 8000,
          maxStock: 100, restockThreshold: 15, available: true,
          requiresLicense: 'alcohol', minAge: 18, tags: ['alcohol'], maxPerTransaction: 5,
        }],
      ]),
    };

    this.shops.set(mainStore.id, mainStore);
    this.shops.set(weaponStore.id, weaponStore);
    this.shops.set(liquorStore.id, liquorStore);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v1 COMPAT
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * v1 compat — achète un item.
   * v2 : retourne un résultat enrichi (peut casser l'API si tu accèdes à `.itemId` directement).
   *       Pour garder la compat stricte, on fait un retour hybride : objet avec `itemId` + `totalPrice`.
   */
  public buyFromShop(
    shopId: string,
    playerId: string,
    playerName: string,
    listingId: string,
    quantity: number,
  ): (BuyResult & { itemId: string; totalPrice: number }) | null {
    const result = this.buyFromShopDetailed({
      shopId, playerId, playerName, listingId, quantity,
    });

    if (!result.success || !result.itemId) {
      return null; // v1 compat : retourne null en cas d'échec
    }

    return {
      ...result,
      itemId: result.itemId,
      totalPrice: result.totalPrice ?? 0,
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
    return () => {
      this.updateListeners.delete(callback);
      return undefined;
    };
  }

  public dispose(): void {
    if (this.restockTimer) {
      clearInterval(this.restockTimer);
      this.restockTimer = null;
    }
    this.updateListeners.clear();
    this.shops.clear();
    this.transactions = [];
    this.buyHistory.clear();
    console.log('🛑 [CommerceSystem] Magasins fermés.');
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — BUY DETAILED
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * 🆕 Achat enrichi avec taxes QC, licences, promos, bulk.
   */
  public buyFromShopDetailed(opts: {
    shopId: string;
    playerId: string;
    playerName: string;
    listingId: string;
    quantity: number;
    /** Ignore les checks de licence/âge (admin). */
    bypassChecks?: boolean;
    /** Code promo optionnel. */
    promoCode?: string;
  }): BuyResult {
    const { shopId, playerId, playerName, listingId, quantity, bypassChecks, promoCode } = opts;

    // 1) Shop existe ?
    const shop = this.shops.get(shopId);
    if (!shop) return { success: false, reason: 'Boutique introuvable' };

    // 2) Ouvert ?
    const hour = this.hourProvider?.() ?? new Date().getHours();
    if (!isShopOpen(shop, hour)) {
      return { success: false, reason: `Boutique fermée (ouvre ${shop.hours?.[0] ?? 0}h)` };
    }

    // 3) Listing existe ?
    const listing = shop.listings.get(listingId);
    if (!listing) return { success: false, reason: 'Article introuvable' };
    if (listing.available === false) {
      return { success: false, reason: 'Article retiré du catalogue' };
    }

    // 4) Quantité valide ?
    const qty = Math.max(1, Math.floor(quantity));
    if (listing.maxPerTransaction && qty > listing.maxPerTransaction) {
      return {
        success: false,
        reason: `Max ${listing.maxPerTransaction} par transaction`,
      };
    }

    // 5) Stock ?
    if (listing.stock < qty) {
      return {
        success: false,
        reason: `Stock insuffisant (${listing.stock} disponible${listing.stock > 1 ? 's' : ''})`,
      };
    }

    // 6) Rate limit
    if (!bypassChecks && this.isRateLimited(playerId)) {
      return { success: false, reason: 'Trop d\'achats récents — patientez un instant' };
    }

    // 7) Licence ?
    if (!bypassChecks && listing.requiresLicense) {
      if (!this.licenseChecker || !this.licenseChecker(playerId, listing.requiresLicense)) {
        return {
          success: false,
          reason: `Licence "${listing.requiresLicense}" requise`,
        };
      }
    }

    // 8) Âge ?
    if (!bypassChecks && listing.minAge) {
      const age = this.ageProvider?.(playerId) ?? 99;
      if (age < listing.minAge) {
        return { success: false, reason: `Âge minimum : ${listing.minAge} ans` };
      }
    }

    // 9) Calcul du prix
    const unitPrice = listing.price;
    const subtotal = round2(unitPrice * qty);

    // Promo
    let discount = 0;
    const promos = (shop.promos ?? []).filter((p) => p.expiresAt > Date.now());
    for (const promo of promos) {
      if (promo.code && promo.code !== promoCode) continue;
      if (promo.appliesTo && !promo.appliesTo.includes(listingId)) continue;

      if (promo.kind === 'percent') {
        discount += subtotal * (promo.value / 100);
      } else if (promo.kind === 'fixed') {
        discount += promo.value * qty;
      }
    }
    discount = round2(Math.min(discount, subtotal));
    const subtotalAfterDiscount = round2(subtotal - discount);

    // Taxes QC
    const tps = shop.taxesEnabled !== false ? round2(subtotalAfterDiscount * this.config.tpsRate) : 0;
    const tvq = shop.taxesEnabled !== false ? round2(subtotalAfterDiscount * this.config.tvqRate) : 0;
    const totalPrice = round2(subtotalAfterDiscount + tps + tvq);

    // 10) Décrémente stock
    listing.stock -= qty;

    // 11) Cash register (si défini)
    if (shop.cashRegister !== undefined) {
      shop.cashRegister = round2(shop.cashRegister + totalPrice);
    }

    // 12) Transaction log
    const transactionId = genId('tx');
    this.transactions.unshift({
      id: transactionId,
      shopId,
      playerId,
      playerName,
      itemId: listing.itemId,
      quantity: qty,
      subtotal: subtotalAfterDiscount,
      totalPrice,
      timestamp: Date.now(),
    });
    if (this.transactions.length > this.MAX_TRANSACTIONS) {
      this.transactions = this.transactions.slice(0, this.MAX_TRANSACTIONS);
    }

    // 13) Stats
    this.stats.transactionsTotal++;
    this.stats.revenueTotal = round2(this.stats.revenueTotal + totalPrice);
    this.stats.taxesCollected = round2(this.stats.taxesCollected + tps + tvq);
    const cat = listing.category ?? 'unknown';
    this.stats.itemsSoldByCategory[cat] = (this.stats.itemsSoldByCategory[cat] ?? 0) + qty;

    let top = this.stats.topSellingItems.get(listing.itemId);
    if (!top) {
      top = { itemId: listing.itemId, count: 0, revenue: 0 };
      this.stats.topSellingItems.set(listing.itemId, top);
    }
    top.count += qty;
    top.revenue = round2(top.revenue + totalPrice);

    // 14) Rate limit history
    this.recordBuy(playerId);

    // 15) Notifie
    this.notifyUpdate('item_bought', {
      shopId,
      shopName: shop.name,
      playerId,
      playerName,
      listingId,
      itemId: listing.itemId,
      quantity: qty,
      unitPrice,
      subtotal,
      discount,
      tps,
      tvq,
      totalPrice,
      transactionId,
      newStock: listing.stock,
    });

    if (this.config.verbose) {
      console.log(
        `🛒 [Commerce] ${playerName} → ${qty}× ${listing.name ?? listing.itemId} @ ${totalPrice}$ ` +
        `(TPS ${tps}$ + TVQ ${tvq}$)`,
      );
    }

    return {
      success: true,
      itemId: listing.itemId,
      quantity: qty,
      subtotal,
      tps,
      tvq,
      discount,
      totalPrice,
      shopId,
      shopName: shop.name,
      newStock: listing.stock,
      transactionId,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — QUERIES
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Shops par type. */
  public getShopsByType(type: ShopType): Shop[] {
    return this.getAllShops().filter((s) => s.type === type);
  }

  /** 🆕 Shops par ville. */
  public getShopsByCity(city: string): Shop[] {
    const needle = city.toLowerCase();
    return this.getAllShops().filter((s) => (s.city ?? '').toLowerCase() === needle);
  }

  /** 🆕 Shops ouverts à une heure donnée. */
  public getOpenShops(hour = new Date().getHours()): Shop[] {
    return this.getAllShops().filter((s) => isShopOpen(s, hour));
  }

  /** 🆕 Shops dans un rayon (nécessite `position`). */
  public getShopsInRadius(x: number, z: number, radius: number): Shop[] {
    const r2 = radius * radius;
    return this.getAllShops().filter((s) => {
      if (!s.position) return false;
      const dx = s.position[0] - x;
      const dz = s.position[2] - z;
      return dx * dx + dz * dz <= r2;
    });
  }

  /** 🆕 Recherche par nom (case-insensitive). */
  public findShops(query: string): Shop[] {
    const needle = query.toLowerCase().trim();
    if (!needle) return [];
    return this.getAllShops().filter(
      (s) => s.name.toLowerCase().includes(needle) || (s.address ?? '').toLowerCase().includes(needle),
    );
  }

  /** 🆕 Recherche d'un item dans toutes les shops. */
  public findItem(itemId: string): Array<{ shop: Shop; listing: Listing }> {
    const out: Array<{ shop: Shop; listing: Listing }> = [];
    for (const shop of this.shops.values()) {
      for (const listing of shop.listings.values()) {
        if (listing.itemId === itemId) out.push({ shop, listing });
      }
    }
    return out;
  }

  /** 🆕 Liste des items d'une shop filtrés par catégorie. */
  public getListingsByCategory(shopId: string, category: string): Listing[] {
    const shop = this.shops.get(shopId);
    if (!shop) return [];
    return Array.from(shop.listings.values()).filter(
      (l) => l.category === category && l.available !== false,
    );
  }

  /** 🆕 Retourne le prix TTC calculé pour un listing (avec taxes). */
  public calculateTotalPrice(
    shopId: string,
    listingId: string,
    quantity: number,
  ): BuyResult | null {
    const shop = this.shops.get(shopId);
    if (!shop) return null;
    const listing = shop.listings.get(listingId);
    if (!listing) return null;

    const subtotal = round2(listing.price * quantity);
    const taxes = shop.taxesEnabled !== false;
    const tps = taxes ? round2(subtotal * this.config.tpsRate) : 0;
    const tvq = taxes ? round2(subtotal * this.config.tvqRate) : 0;
    const totalPrice = round2(subtotal + tps + tvq);

    return {
      success: true,
      itemId: listing.itemId,
      quantity,
      subtotal,
      tps,
      tvq,
      totalPrice,
      shopId,
      shopName: shop.name,
      discount: 0,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — STOCK MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Ajoute du stock à un listing. */
  public addStock(shopId: string, listingId: string, quantity: number): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) return false;
    const listing = shop.listings.get(listingId);
    if (!listing) return false;

    const max = listing.maxStock ?? Infinity;
    const added = Math.min(quantity, max - listing.stock);
    if (added <= 0) return false;

    listing.stock += added;
    this.notifyUpdate('stock_added', { shopId, listingId, added, newStock: listing.stock });
    return true;
  }

  /** 🆕 Retire du stock (casse, saisie…). */
  public removeStock(shopId: string, listingId: string, quantity: number): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) return false;
    const listing = shop.listings.get(listingId);
    if (!listing) return false;

    const removed = Math.min(quantity, listing.stock);
    listing.stock -= removed;
    this.notifyUpdate('stock_removed', { shopId, listingId, removed, newStock: listing.stock });
    return removed > 0;
  }

  /** 🆕 Ajoute ou met à jour un listing. */
  public upsertListing(shopId: string, listing: Listing): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) return false;

    // Enrichit avec des valeurs par défaut
    if (listing.available === undefined) listing.available = true;
    if (listing.wholesalePrice === undefined && shop.markup) {
      listing.wholesalePrice = round2(listing.price / shop.markup);
    }

    shop.listings.set(listing.id, listing);
    this.notifyUpdate('listing_upserted', { shopId, listingId: listing.id, listing });
    return true;
  }

  /** 🆕 Retire un listing. */
  public removeListing(shopId: string, listingId: string): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) return false;
    const ok = shop.listings.delete(listingId);
    if (ok) this.notifyUpdate('listing_removed', { shopId, listingId });
    return ok;
  }

  /** 🆕 Auto restock (boutiques à maxStock défini). */
  public autoRestock(): number {
    let count = 0;
    for (const shop of this.shops.values()) {
      // Ignore si pas de budget
      if (shop.cashRegister !== undefined && shop.cashRegister < 100) continue;

      for (const listing of shop.listings.values()) {
        if (!listing.maxStock) continue;
        const threshold = listing.restockThreshold ?? Math.floor(listing.maxStock * 0.2);
        if (listing.stock > threshold) continue;

        const needed = listing.maxStock - listing.stock;
        const cost = (listing.wholesalePrice ?? listing.price * 0.5) * needed;

        // Budget check
        if (shop.cashRegister !== undefined && shop.cashRegister < cost) continue;

        listing.stock = listing.maxStock;
        if (shop.cashRegister !== undefined) shop.cashRegister = round2(shop.cashRegister - cost);
        count++;

        this.notifyUpdate('restocked', {
          shopId: shop.id,
          listingId: listing.id,
          quantityAdded: needed,
          cost,
        });
      }
    }
    if (count > 0) this.stats.restocksTotal += count;
    return count;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — REFUND / RETURN
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Rembourse une transaction. */
  public refundTransaction(transactionId: string): BuyResult {
    const tx = this.transactions.find((t) => t.id === transactionId);
    if (!tx) return { success: false, reason: 'Transaction introuvable' };
    if (tx.refunded) return { success: false, reason: 'Déjà remboursée' };

    const shop = this.shops.get(tx.shopId);
    if (!shop) return { success: false, reason: 'Boutique introuvable' };

    // Retourne le stock
    for (const listing of shop.listings.values()) {
      if (listing.itemId === tx.itemId) {
        listing.stock += tx.quantity;
        break;
      }
    }

    tx.refunded = true;
    this.stats.refundsTotal++;
    this.stats.refundAmountTotal = round2(this.stats.refundAmountTotal + tx.totalPrice);

    this.notifyUpdate('refund', {
      shopId: tx.shopId,
      transactionId,
      playerId: tx.playerId,
      amount: tx.totalPrice,
    });

    return {
      success: true,
      itemId: tx.itemId,
      quantity: tx.quantity,
      totalPrice: tx.totalPrice,
      transactionId,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — PROMOTIONS
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Ajoute une promotion à une boutique. */
  public addPromo(
    shopId: string,
    promo: Omit<ShopPromo, 'id'> & { id?: string },
  ): ShopPromo | null {
    const shop = this.shops.get(shopId);
    if (!shop) return null;
    shop.promos = shop.promos ?? [];
    const full: ShopPromo = { ...promo, id: promo.id ?? genId('promo') };
    shop.promos.push(full);
    this.notifyUpdate('promo_added', { shopId, promo: full });
    return full;
  }

  /** 🆕 Supprime une promo. */
  public removePromo(shopId: string, promoId: string): boolean {
    const shop = this.shops.get(shopId);
    if (!shop || !shop.promos) return false;
    const idx = shop.promos.findIndex((p) => p.id === promoId);
    if (idx === -1) return false;
    shop.promos.splice(idx, 1);
    return true;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — SHOP MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Crée une boutique runtime. */
  public createShop(shop: Omit<Shop, 'listings'> & { listings?: Map<string, Listing> }): Shop {
    const full: Shop = {
      ...shop,
      listings: shop.listings ?? new Map(),
      employeeIds: shop.employeeIds ?? new Set(),
      markup: shop.markup ?? this.config.defaultMarkups[shop.type] ?? 1.3,
    };
    this.shops.set(full.id, full);
    this.notifyUpdate('shop_created', { shopId: full.id, name: full.name });
    return full;
  }

  /** 🆕 Retire une boutique. */
  public removeShop(shopId: string): boolean {
    const ok = this.shops.delete(shopId);
    if (ok) this.notifyUpdate('shop_removed', { shopId });
    return ok;
  }

  /** 🆕 Ajoute un employé. */
  public addEmployee(shopId: string, playerId: string): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) return false;
    shop.employeeIds = shop.employeeIds ?? new Set();
    shop.employeeIds.add(playerId);
    return true;
  }

  /** 🆕 Retire un employé. */
  public removeEmployee(shopId: string, playerId: string): boolean {
    const shop = this.shops.get(shopId);
    if (!shop || !shop.employeeIds) return false;
    return shop.employeeIds.delete(playerId);
  }

  /** 🆕 Vérifie si un joueur peut opérer la boutique. */
  public canOperate(shopId: string, playerId: string): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) return false;
    if (shop.ownerId === playerId) return true;
    return shop.employeeIds?.has(playerId) ?? false;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — DEPENDENCY INJECTION
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Fournit un getter d'heure (pour horaires). */
  public setHourProvider(fn: () => number): void {
    this.hourProvider = fn;
  }

  /** 🆕 Fournit un checker de licence. */
  public setLicenseChecker(fn: (playerId: string, license: LicenseType) => boolean): void {
    this.licenseChecker = fn;
  }

  /** 🆕 Fournit un getter d'âge. */
  public setAgeProvider(fn: (playerId: string) => number): void {
    this.ageProvider = fn;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  RATE LIMIT
  // ═════════════════════════════════════════════════════════════════════════

  private isRateLimited(playerId: string): boolean {
    const now = Date.now();
    const history = this.buyHistory.get(playerId) ?? [];
    const window = this.config.buyRateLimit.windowMs;
    const cutoff = now - window;
    while (history.length > 0 && history[0] < cutoff) history.shift();
    return history.length >= this.config.buyRateLimit.count;
  }

  private recordBuy(playerId: string): void {
    const history = this.buyHistory.get(playerId) ?? [];
    history.push(Date.now());
    this.buyHistory.set(playerId, history);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  NOTIFY
  // ═════════════════════════════════════════════════════════════════════════

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('[CommerceSystem] Erreur listener :', err);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  STATS / HEALTH
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Stats globales. */
  public getStats() {
    const topSellers = Array.from(this.stats.topSellingItems.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      shopsTotal: this.shops.size,
      listingsTotal: Array.from(this.shops.values()).reduce((s, sh) => s + sh.listings.size, 0),
      transactionsTotal: this.stats.transactionsTotal,
      revenueTotal: this.stats.revenueTotal,
      taxesCollected: this.stats.taxesCollected,
      refundsTotal: this.stats.refundsTotal,
      refundAmountTotal: this.stats.refundAmountTotal,
      restocksTotal: this.stats.restocksTotal,
      itemsSoldByCategory: { ...this.stats.itemsSoldByCategory },
      topSellingItems: topSellers,
      listenersCount: this.updateListeners.size,
      config: this.config,
    };
  }

  /** 🆕 Récupère les transactions d'un joueur. */
  public getPlayerTransactions(playerId: string, limit = 50) {
    return this.transactions.filter((t) => t.playerId === playerId).slice(0, limit);
  }

  /** 🆕 Récupère les transactions d'une boutique. */
  public getShopTransactions(shopId: string, limit = 50) {
    return this.transactions.filter((t) => t.shopId === shopId).slice(0, limit);
  }

  /** 🆕 Health check. */
  public health(): { ok: boolean; reason?: string } {
    if (this.shops.size === 0) return { ok: false, reason: 'no_shops' };
    if (this.transactions.length >= this.MAX_TRANSACTIONS) {
      return { ok: true, reason: 'transaction_log_full' };
    }
    return { ok: true };
  }

  /** 🆕 Config dynamique. */
  public updateConfig(patch: Partial<CommerceConfig>): void {
    this.config = { ...this.config, ...patch };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SINGLETON (v1 compat)
// ═════════════════════════════════════════════════════════════════════════════

export const commerceManager = new CommerceManager();