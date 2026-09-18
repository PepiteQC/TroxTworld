// ═══════════════════════════════════════════════════════════════════════════
//  REAL ESTATE SYSTEM v2.0 — IMMOBILIER
//  Propriétés, maisons, appartements, commerces avec loyer
// ═══════════════════════════════════════════════════════════════════════════

export type PropertyType = 'house' | 'apartment' | 'business' | 'warehouse' | 'garage' | 'penthouse';
export type PropertyZone = 'downtown' | 'suburbs' | 'industrial' | 'beachfront' | 'mountain' | 'luxury';

export interface Property {
  propertyId: string;
  owner: string; // playerId
  ownerName: string;
  type: PropertyType;
  zone: PropertyZone;
  address: string;
  position: { x: number; y: number; z: number };
  price: number;
  purchaseDate: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  furnished: boolean;
  features: string[]; // ['garage', 'pool', 'garden', 'security_system']
  interiorObjects: Map<string, any>;
  garage?: {
    capacity: number;
    vehicles: string[]; // vehicleIds
  };
  business?: {
    type: string;
    employees: string[];
    inventory: Map<string, number>;
    safe: number; // money in safe
    sales: number; // daily sales
  };
  tenants?: Array<{
    playerId: string;
    playerName: string;
    rentStart: number;
    rentEnd: number;
    rentAmount: number;
  }>;
  visitRequests: Array<{
    playerId: string;
    playerName: string;
    requestTime: number;
  }>;
  locked: boolean;
  accessList: string[]; // playerIds with access
  lastMaintenance?: number;
  condition: number; // 0-100
  mortgage?: {
    lender: string;
    amount: number;
    monthlyPayment: number;
    remainingMonths: number;
  };
}

export interface RealEstateMarketListing {
  listingId: string;
  property: Property;
  listingPrice: number;
  listingDate: number;
  realtor?: string; // playerId
  description: string;
  views: number;
  status: 'active' | 'pending' | 'sold';
}

// ─────────────────────────────────────────────────────────────────────────
//  REAL ESTATE MANAGER
// ─────────────────────────────────────────────────────────────────────────

export class RealEstateManager {
  private properties: Map<string, Property> = new Map();
  private listings: Map<string, RealEstateMarketListing> = new Map();
  private playerProperties: Map<string, string[]> = new Map(); // playerId -> propertyIds
  private onUpdateCallback: ((data: any) => void) | null = null;
  private rentInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultProperties();
    this.startRentSystem();
  }

  /**
   * Initialiser propriétés par défaut
   */
  private initializeDefaultProperties() {
    const defaultProperties: Property[] = [
      {
        propertyId: 'prop_downtown_01',
        owner: 'npc_realtor_01',
        ownerName: 'Immobilier Portneuf & Capitale Inc',
        type: 'apartment',
        zone: 'downtown',
        address: '123 Rue Principale, Portneuf Centre',
        position: { x: 12, y: 2, z: 18 },
        price: 150000,
        purchaseDate: Date.now(),
        bedrooms: 2,
        bathrooms: 1,
        squareFeet: 1200,
        furnished: true,
        features: ['gym', 'pool', 'security', 'parking'],
        interiorObjects: new Map(),
        garage: { capacity: 1, vehicles: [] },
        visitRequests: [],
        locked: true,
        accessList: [],
        condition: 100,
      },
      {
        propertyId: 'prop_suburbs_01',
        owner: 'npc_realtor_01',
        ownerName: 'Immobilier Portneuf & Capitale Inc',
        type: 'house',
        zone: 'suburbs',
        address: '456 Chemin du Roy, Deschambault',
        position: { x: -2020, y: 2, z: 240 },
        price: 250000,
        purchaseDate: Date.now(),
        bedrooms: 4,
        bathrooms: 2,
        squareFeet: 3500,
        furnished: false,
        features: ['garden', 'pool', 'garage', '2-car garage', 'patrimoine'],
        interiorObjects: new Map(),
        garage: { capacity: 2, vehicles: [] },
        visitRequests: [],
        locked: true,
        accessList: [],
        condition: 100,
      },
      {
        propertyId: 'prop_business_01',
        owner: 'npc_realtor_01',
        ownerName: 'Immobilier Portneuf & Capitale Inc',
        type: 'business',
        zone: 'downtown',
        address: '789 Place du Commerce, Portneuf',
        position: { x: 10, y: 2, z: 10 },
        price: 500000,
        purchaseDate: Date.now(),
        bedrooms: 0,
        bathrooms: 2,
        squareFeet: 5000,
        furnished: true,
        features: ['security_system', 'storage', 'office', 'comptoir_vente'],
        interiorObjects: new Map(),
        business: {
          type: 'restaurant',
          employees: [],
          inventory: new Map([['food_supplies', 100]]),
          safe: 50000,
          sales: 0,
        },
        visitRequests: [],
        locked: true,
        accessList: [],
        condition: 100,
      },
      {
        propertyId: 'prop_chalet_st_raymond',
        owner: 'npc_realtor_01',
        ownerName: 'Immobilier Portneuf & Capitale Inc',
        type: 'house',
        zone: 'mountain',
        address: '88 Rang des Érables, Saint-Raymond',
        position: { x: 1650, y: 3, z: -3580 },
        price: 320000,
        purchaseDate: Date.now(),
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 2400,
        furnished: true,
        features: ['foyer_bois', 'garage', 'acces_sentier_motoneige', 'erabliere'],
        interiorObjects: new Map(),
        garage: { capacity: 3, vehicles: [] },
        visitRequests: [],
        locked: true,
        accessList: [],
        condition: 95,
      },
      {
        propertyId: 'prop_entrepot_st_marc',
        owner: 'npc_realtor_01',
        ownerName: 'Immobilier Portneuf & Capitale Inc',
        type: 'warehouse',
        zone: 'industrial',
        address: '14 Montée des Carrières, Saint-Marc-des-Carrières',
        position: { x: -2580, y: 2, z: -780 },
        price: 420000,
        purchaseDate: Date.now(),
        bedrooms: 0,
        bathrooms: 1,
        squareFeet: 8000,
        furnished: false,
        features: ['quai_chargement', 'grue_atelier', 'cloture_securisee'],
        interiorObjects: new Map(),
        garage: { capacity: 6, vehicles: [] },
        visitRequests: [],
        locked: true,
        accessList: [],
        condition: 90,
      },
      {
        propertyId: 'prop_penthouse_quebec',
        owner: 'npc_realtor_01',
        ownerName: 'Immobilier Portneuf & Capitale Inc',
        type: 'penthouse',
        zone: 'luxury',
        address: '1000 Grande Allée Ouest, Québec',
        position: { x: 5380, y: 15, z: 320 },
        price: 1250000,
        purchaseDate: Date.now(),
        bedrooms: 3,
        bathrooms: 3,
        squareFeet: 4200,
        furnished: true,
        features: ['vue_fleuve', 'terrasse_panoramique', 'spa_prive', 'ascenseur_securise', 'garage_double'],
        interiorObjects: new Map(),
        garage: { capacity: 3, vehicles: [] },
        visitRequests: [],
        locked: true,
        accessList: [],
        condition: 100,
      }
    ];

    defaultProperties.forEach(prop => {
      this.properties.set(prop.propertyId, prop);

      // Créer une annonce active sur le marché
      this.listings.set(`list_${prop.propertyId}`, {
        listingId: `list_${prop.propertyId}`,
        property: prop,
        listingPrice: prop.price,
        listingDate: Date.now(),
        realtor: 'Courtier Agréé Portneuf',
        description: `${prop.address} — ${prop.squareFeet} pi² • ${prop.type.toUpperCase()} • ${prop.features.join(', ')}`,
        views: Math.floor(Math.random() * 40) + 5,
        status: 'active',
      });
    });

    console.log(`✅ ${defaultProperties.length} propriétés initialisées`);
  }

  /**
   * Système de loyer automatique
   */
  private startRentSystem() {
    this.rentInterval = setInterval(() => {
      this.properties.forEach(property => {
        // Payer loyers des tenants
        if (property.tenants && property.tenants.length > 0) {
          property.tenants.forEach(tenant => {
            const daysRemaining = (tenant.rentEnd - Date.now()) / (1000 * 60 * 60 * 24);
            
            if (daysRemaining <= 0) {
              const index = property.tenants!.indexOf(tenant);
              if (index > -1) {
                property.tenants!.splice(index, 1);
              }
              console.log(`❌ Loyer expiré pour ${tenant.playerName}`);
            }
          });
        }

        // Maintenance et usure
        if (property.condition > 0) {
          property.condition = Math.max(0, property.condition - 0.01);
        }
      });
    }, 1000 * 60 * 60 * 24);
  }

  /**
   * Acheter propriété
   */
  buyProperty(playerId: string, propertyId: string, price: number): boolean {
    const property = this.properties.get(propertyId);
    if (!property) return false;
    if (property.owner !== 'npc_realtor_01') return false;

    property.owner = playerId;
    property.ownerName = 'Propriétaire Joueur';
    property.purchaseDate = Date.now();
    property.locked = true;

    if (!this.playerProperties.has(playerId)) {
      this.playerProperties.set(playerId, []);
    }
    this.playerProperties.get(playerId)!.push(propertyId);

    // Mettre à jour le statut du listing
    const listing = Array.from(this.listings.values()).find(l => l.property.propertyId === propertyId);
    if (listing) {
      listing.status = 'sold';
    }

    console.log(`🏠 ${playerId} a acheté ${property.address} pour $${price}`);
    this.onUpdateCallback?.({ type: 'property_purchased', propertyId, playerId });
    return true;
  }

  /**
   * Mettre en vente
   */
  listForSale(propertyId: string, listingPrice: number, description: string): RealEstateMarketListing | null {
    const property = this.properties.get(propertyId);
    if (!property) return null;

    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const listing: RealEstateMarketListing = {
      listingId,
      property,
      listingPrice,
      listingDate: Date.now(),
      description,
      views: 0,
      status: 'active',
    };

    this.listings.set(listingId, listing);
    console.log(`📊 ${property.address} mise en vente pour $${listingPrice}`);
    this.onUpdateCallback?.({ type: 'property_listed', propertyId, listingId });
    return listing;
  }

  /**
   * Retirer de la vente
   */
  unlisted(listingId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;

    listing.status = 'sold';
    console.log(`🚫 ${listing.property.address} retiré de la vente`);
    return true;
  }

  /**
   * Louer une propriété
   */
  rentProperty(
    propertyId: string,
    tenantId: string,
    tenantName: string,
    durationDays: number,
    rentAmount: number
  ): boolean {
    const property = this.properties.get(propertyId);
    if (!property) return false;

    const tenant = {
      playerId: tenantId,
      playerName: tenantName,
      rentStart: Date.now(),
      rentEnd: Date.now() + (durationDays * 24 * 60 * 60 * 1000),
      rentAmount,
    };

    if (!property.tenants) {
      property.tenants = [];
    }

    property.tenants.push(tenant);
    console.log(`🔑 ${tenantName} a loué ${property.address} pour ${durationDays} jours ($${rentAmount}/jour)`);
    this.onUpdateCallback?.({ type: 'property_rented', propertyId, tenantId });
    return true;
  }

  /**
   * Évincer un locataire
   */
  evictTenant(propertyId: string, tenantId: string): boolean {
    const property = this.properties.get(propertyId);
    if (!property || !property.tenants) return false;

    const index = property.tenants.findIndex(t => t.playerId === tenantId);
    if (index === -1) return false;

    property.tenants.splice(index, 1);
    console.log(`🚪 Tenant ${tenantId} évincé de ${property.address}`);
    return true;
  }

  /**
   * Ajouter accès à la propriété
   */
  grantAccess(propertyId: string, playerId: string): boolean {
    const property = this.properties.get(propertyId);
    if (!property) return false;

    if (!property.accessList.includes(playerId)) {
      property.accessList.push(playerId);
    }

    console.log(`🔓 Accès accordé à ${playerId} pour ${property.address}`);
    return true;
  }

  /**
   * Retirer accès
   */
  revokeAccess(propertyId: string, playerId: string): boolean {
    const property = this.properties.get(propertyId);
    if (!property) return false;

    const index = property.accessList.indexOf(playerId);
    if (index === -1) return false;

    property.accessList.splice(index, 1);
    return true;
  }

  /**
   * Maintenir propriété
   */
  performMaintenance(propertyId: string, cost: number): boolean {
    const property = this.properties.get(propertyId);
    if (!property) return false;

    property.condition = Math.min(100, property.condition + 50);
    property.lastMaintenance = Date.now();

    console.log(`🔧 Maintenance faite sur ${property.address} (Condition: ${property.condition})`);
    return true;
  }

  /**
   * Obtenir propriétés d'un joueur
   */
  getPlayerProperties(playerId: string): Property[] {
    const propertyIds = this.playerProperties.get(playerId) || [];
    return propertyIds.map(id => this.properties.get(id)!).filter(Boolean);
  }

  /**
   * Obtenir toutes les propriétés
   */
  getAllProperties(): Property[] {
    return Array.from(this.properties.values());
  }

  /**
   * Obtenir liste active
   */
  getActiveListings(): RealEstateMarketListing[] {
    return Array.from(this.listings.values()).filter(l => l.status === 'active');
  }

  /**
   * Chercher propriétés
   */
  searchProperties(zone?: PropertyZone, type?: PropertyType, maxPrice?: number): Property[] {
    return Array.from(this.properties.values()).filter(p =>
      (!zone || p.zone === zone) &&
      (!type || p.type === type) &&
      (!maxPrice || p.price <= maxPrice)
    );
  }

  /**
   * Obtenir propriété
   */
  getProperty(propertyId: string): Property | undefined {
    return this.properties.get(propertyId);
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
    if (this.rentInterval) {
      clearInterval(this.rentInterval);
    }
  }
}

/**
 * Export singleton
 */
export const realEstateManager = new RealEstateManager();
