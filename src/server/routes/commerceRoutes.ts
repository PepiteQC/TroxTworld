// ═══════════════════════════════════════════════════════════════════════════
//  COMMERCE & REAL ESTATE ROUTES — server/routes/commerceRoutes.ts
// ═══════════════════════════════════════════════════════════════════════════

import type { Express, Request, Response } from 'express';
import { commerceManager, Shop, ShopListing } from '../../src/systems/CommerceSystem';
import { realEstateManager, Property } from '../../src/systems/RealEstateSystem';

function serializeShop(shop: Shop) {
  return {
    ...shop,
    listings: Array.from(shop.listings.values()),
  };
}

function serializeProperty(prop: Property) {
  return {
    ...prop,
    interiorObjects: Array.from(prop.interiorObjects.entries()),
    business: prop.business ? {
      ...prop.business,
      inventory: Array.from(prop.business.inventory.entries()),
    } : undefined,
  };
}

export function mountCommerceRoutes(app: Express): void {
  // ─── SHOPS ───────────────────────────────────────────────────────────────
  app.get('/api/shops', (req: Request, res: Response) => {
    try {
      const type = req.query.type as any;
      const shops = type ? commerceManager.getShopsByType(type) : commerceManager.getAllShops();
      res.json({
        ok: true,
        shops: shops.map(serializeShop),
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/shops/:shopId', (req: Request, res: Response) => {
    const shop = commerceManager.getShop(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ ok: false, error: 'Magasin introuvable' });
    }
    res.json({ ok: true, shop: serializeShop(shop) });
  });

  app.post('/api/shops/:shopId/buy', (req: Request, res: Response) => {
    const { shopId } = req.params;
    const { playerId = 'player_local', playerName = 'Citoyen', listingId, quantity = 1 } = req.body ?? {};

    if (!listingId || quantity <= 0) {
      return res.status(400).json({ ok: false, error: 'listingId et quantity valides requis' });
    }

    const txn = commerceManager.buyFromShop(shopId, playerId, playerName, listingId, Number(quantity));
    if (!txn) {
      return res.status(400).json({ ok: false, error: 'Achat impossible (stock insuffisant ou boutique inexistante)' });
    }

    res.json({ ok: true, transaction: txn });
  });

  app.post('/api/shops/:shopId/sell', (req: Request, res: Response) => {
    const { shopId } = req.params;
    const { playerId = 'player_local', playerName = 'Citoyen', itemId, itemName, quantity = 1, basePrice = 20 } = req.body ?? {};

    if (!itemId || !itemName || quantity <= 0) {
      return res.status(400).json({ ok: false, error: 'Détails de l\'objet requis' });
    }

    const txn = commerceManager.sellToShop(shopId, playerId, playerName, itemId, itemName, Number(quantity), Number(basePrice));
    if (!txn) {
      return res.status(400).json({ ok: false, error: 'Vente refusée par le commerçant' });
    }

    res.json({ ok: true, transaction: txn });
  });

  // ─── PLAYER MARKET ───────────────────────────────────────────────────────
  app.get('/api/player-market/:playerId', (req: Request, res: Response) => {
    const market = commerceManager.getPlayerMarket(req.params.playerId);
    if (!market) {
      return res.json({ ok: true, market: null });
    }
    res.json({
      ok: true,
      market: {
        ...market,
        listings: Array.from(market.listings.values()),
      },
    });
  });

  app.post('/api/player-market/:playerId/listing', (req: Request, res: Response) => {
    const { playerId } = req.params;
    const { itemId, itemName, quantity = 1, price = 10 } = req.body ?? {};

    if (!itemId || !itemName || quantity <= 0 || price <= 0) {
      return res.status(400).json({ ok: false, error: 'Champs invalides' });
    }

    const listing = commerceManager.addPlayerListing(playerId, itemId, itemName, Number(quantity), Number(price));
    res.json({ ok: true, listing });
  });

  app.post('/api/player-market/buy', (req: Request, res: Response) => {
    const { buyerId = 'player_local', buyerName = 'Citoyen', sellerId, listingId, quantity = 1 } = req.body ?? {};

    if (!sellerId || !listingId) {
      return res.status(400).json({ ok: false, error: 'sellerId et listingId requis' });
    }

    const txn = commerceManager.buyPlayerListing(buyerId, buyerName, sellerId, listingId, Number(quantity));
    if (!txn) {
      return res.status(400).json({ ok: false, error: 'Transaction marché joueur échouée' });
    }

    res.json({ ok: true, transaction: txn });
  });

  app.get('/api/transactions', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string || '50', 10);
    res.json({ ok: true, transactions: commerceManager.getTransactionHistory(limit) });
  });

  // ─── REAL ESTATE ─────────────────────────────────────────────────────────
  app.get('/api/properties', (req: Request, res: Response) => {
    const zone = req.query.zone as any;
    const type = req.query.type as any;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

    const properties = commerceManager ? realEstateManager.searchProperties(zone, type, maxPrice) : [];
    res.json({
      ok: true,
      properties: properties.map(serializeProperty),
    });
  });

  app.get('/api/properties/listings', (req: Request, res: Response) => {
    const listings = realEstateManager.getActiveListings();
    res.json({
      ok: true,
      listings: listings.map(l => ({
        ...l,
        property: serializeProperty(l.property),
      })),
    });
  });

  app.post('/api/properties/:propertyId/buy', (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const { playerId = 'player_local', price } = req.body ?? {};

    const prop = realEstateManager.getProperty(propertyId);
    if (!prop) {
      return res.status(404).json({ ok: false, error: 'Propriété introuvable' });
    }

    const success = realEstateManager.buyProperty(playerId, propertyId, price || prop.price);
    if (!success) {
      return res.status(400).json({ ok: false, error: 'Achat de la propriété échoué' });
    }

    res.json({ ok: true, property: serializeProperty(prop) });
  });

  app.post('/api/properties/:propertyId/rent', (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const { tenantId = 'player_local', tenantName = 'Citoyen', durationDays = 7, rentAmount = 50 } = req.body ?? {};

    const success = realEstateManager.rentProperty(propertyId, tenantId, tenantName, Number(durationDays), Number(rentAmount));
    if (!success) {
      return res.status(400).json({ ok: false, error: 'Location de propriété échouée' });
    }

    res.json({ ok: true, message: 'Bail de location activé avec succès' });
  });

  app.post('/api/properties/:propertyId/maintenance', (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const { cost = 150 } = req.body ?? {};

    const success = realEstateManager.performMaintenance(propertyId, Number(cost));
    if (!success) {
      return res.status(400).json({ ok: false, error: 'Échec de maintenance' });
    }

    res.json({ ok: true, property: serializeProperty(realEstateManager.getProperty(propertyId)!) });
  });

  console.log('✅ Routes Commerce & Immobilier v2.0 montées avec succès');
}
