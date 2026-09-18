/**
 * ═══════════════════════════════════════════════════════════════════
 * 🏡 TROXTWORLD / ETHERWORLD — SYSTÈME IMMOBILIER (REAL ESTATE)
 * ═══════════════════════════════════════════════════════════════════
 */

export interface Property {
  id: string;
  name: string;
  address: string;
  price: number;
  ownerId: string | null;
  isLocked: boolean;
  type: "apartment" | "house" | "loft" | "garage" | "industrial";
  createdAt: number;
}

export type RealEstateUpdateListener = (event: Record<string, unknown>) => void;

export class RealEstateManager {
  private properties: Map<string, Property> = new Map();
  private updateListeners: Set<RealEstateUpdateListener> = new Set();

  constructor() {
    this.seedDefaultProperties();
    console.log(`🏡 [RealEstateSystem] Initialisé : ${this.properties.size} propriétés disponibles.`);
  }

  private seedDefaultProperties(): void {
    const defaults: Property[] = [
      { id: "prop_loft_pontrouge", name: "Loft de la Jacques-Cartier", address: "142 Rue du Collège, Pont-Rouge", price: 180000, ownerId: null, isLocked: true, type: "loft", createdAt: Date.now() },
      { id: "prop_house_straymond", name: "Chalet de la Vallée", address: "845 Rang de la Grande-Ligne, Saint-Raymond", price: 245000, ownerId: null, isLocked: true, type: "house", createdAt: Date.now() },
      { id: "prop_apt_donnacona", name: "Appartement du Fleuve", address: "320 Rue Notre-Dame, Donnacona", price: 95000, ownerId: null, isLocked: true, type: "apartment", createdAt: Date.now() },
      { id: "prop_garage_portneuf", name: "Grand Hangar Industriel", address: "12 Route de l'Aéroport, Neuville", price: 350000, ownerId: null, isLocked: true, type: "industrial", createdAt: Date.now() },
    ];

    for (const p of defaults) {
      this.properties.set(p.id, p);
    }
  }

  public buyProperty(playerId: string, propertyId: string, price: number): boolean {
    const prop = this.properties.get(propertyId);
    if (!prop || prop.ownerId !== null || prop.price !== price) {
      return false;
    }

    prop.ownerId = playerId;
    prop.isLocked = false; // Se déverrouille à l'achat

    this.notifyUpdate("property_purchased", {
      propertyId,
      playerId,
      price,
      name: prop.name,
    });

    return true;
  }

  public toggleLock(propertyId: string, playerId: string): boolean {
    const prop = this.properties.get(propertyId);
    if (!prop || prop.ownerId !== playerId) {
      return false;
    }

    prop.isLocked = !prop.isLocked;
    this.notifyUpdate("property_lock_toggled", {
      propertyId,
      playerId,
      isLocked: prop.isLocked,
    });

    return true;
  }

  public getProperty(propertyId: string): Property | undefined {
    return this.properties.get(propertyId);
  }

  public getPlayerProperties(playerId: string): Property[] {
    return Array.from(this.properties.values()).filter((p) => p.ownerId === playerId);
  }

  public getAllProperties(): Property[] {
    return Array.from(this.properties.values());
  }

  public onUpdate(callback: RealEstateUpdateListener): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("[RealEstateSystem] Erreur listener :", err);
      }
    }
  }

  public dispose(): void {
    this.updateListeners.clear();
    this.properties.clear();
    console.log("🛑 [RealEstateSystem] Système immobilier libéré.");
  }
}

export const realEstateManager = new RealEstateManager();
