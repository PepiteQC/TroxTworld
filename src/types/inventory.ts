// Inventory, Boutique Éther, Cantine & Marchand Types

export interface GarmentItem {
  brand: string;
  color: string;
  type: string;
  price: string;
  tag: string;
}

export interface CantineMenuItem {
  id: string;
  name: string;
  category: 'poutine' | 'burger' | 'boisson' | 'dessert';
  price: number;
  description: string;
  icon?: string;
  isSpicy?: boolean;
}

export interface WeedProduct {
  id: string;
  name: string;
  type: 'graines' | 'fleurs' | 'concentre' | 'huile';
  thcPercent: number;
  pricePerGram: number;
  description: string;
}
