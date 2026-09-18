/**
 * 🍁 CATALOGUE — Produits d'érable (finalisés + bruts)
 */
import type { SyrupQuality } from "./types";

export interface MapleProduct {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: "raw" | "finished" | "derivative" | "touristic";
  basePrice: number;         // $ de base
  weight: number;            // kg
  quality?: SyrupQuality;    // pour les sirops
  isIllegal?: boolean;
  restricted?: 18 | 21;
  tags?: string[];
}

export const MAPLE_PRODUCTS: MapleProduct[] = [
  // ─── RAW (brut) ───
  {
    id: "eau_erable",
    name: "Seau d'eau d'érable",
    desc: "Coulée fraîche, 20 L. Quatre seaux pour un sirop.",
    icon: "droplets",
    category: "raw",
    basePrice: 3,
    weight: 2.2,
    tags: ["erable", "production"],
  },

  // ─── FINISHED (sirops) ───
  {
    id: "sirop_dore",
    name: "Sirop d'érable doré",
    desc: "Goût délicat. Qualité supérieure précoce.",
    icon: "droplets",
    category: "finished",
    basePrice: 22,
    weight: 0.35,
    quality: "GOLDEN",
    tags: ["erable", "premium"],
  },
  {
    id: "sirop_ambre",
    name: "Sirop d'érable ambré",
    desc: "Saveur riche et corsée, classique du Québec.",
    icon: "droplets",
    category: "finished",
    basePrice: 26,
    weight: 0.35,
    quality: "AMBER",
    tags: ["erable", "classique"],
  },
  {
    id: "sirop_fonce",
    name: "Sirop d'érable foncé",
    desc: "Goût prononcé, pour pâtisserie et marinades.",
    icon: "droplets",
    category: "finished",
    basePrice: 32,
    weight: 0.35,
    quality: "DARK",
    tags: ["erable", "culinaire"],
  },

  // ─── DERIVATIVE (transformés) ───
  {
    id: "tire_erable",
    name: "Tire sur la neige",
    desc: "Roulée sur la neige, texture fondante.",
    icon: "cookie",
    category: "derivative",
    basePrice: 8,
    weight: 0.05,
    tags: ["erable", "bonbon"],
  },
  {
    id: "beurre_erable",
    name: "Beurre d'érable",
    desc: "Tartinable crémeux, sans additif.",
    icon: "cookie",
    category: "derivative",
    basePrice: 12,
    weight: 0.25,
    tags: ["erable", "tartinable"],
  },
  {
    id: "sucre_erable",
    name: "Sucre d'érable",
    desc: "Bloc de sucre moulé, garde longue durée.",
    icon: "cookie",
    category: "derivative",
    basePrice: 9,
    weight: 0.2,
    tags: ["erable", "sucre"],
  },
  {
    id: "bonbon_erable",
    name: "Bonbons d'érable",
    desc: "Coffret cadeau, 12 morceaux.",
    icon: "cookie",
    category: "derivative",
    basePrice: 15,
    weight: 0.15,
    tags: ["erable", "cadeau"],
  },
  {
    id: "gelato_erable",
    name: "Crème glacée à l'érable",
    desc: "Pot 500 ml, artisanale.",
    icon: "ice-cream",
    category: "derivative",
    basePrice: 11,
    weight: 0.55,
    tags: ["erable", "froid"],
  },
  {
    id: "whisky_erable",
    name: "Whisky à l'érable",
    desc: "Vieilli en fût d'érable. 18 ans.",
    icon: "beer",
    category: "derivative",
    basePrice: 68,
    weight: 0.9,
    restricted: 18,
    tags: ["erable", "alcool", "premium"],
  },

  // ─── TOURISTIC (souvenirs) ───
  {
    id: "tasse_erable",
    name: "Tasse souvenir cabane",
    desc: "Céramique, logo de l'érablière.",
    icon: "cup",
    category: "touristic",
    basePrice: 18,
    weight: 0.4,
    tags: ["souvenir", "touristique"],
  },
  {
    id: "t_shirt_erable",
    name: "T-shirt cabane à sucre",
    desc: "Coton, logo érable. Tailles S-XXL.",
    icon: "shirt",
    category: "touristic",
    basePrice: 25,
    weight: 0.2,
    tags: ["souvenir", "vetement"],
  },
  {
    id: "carte_postale",
    name: "Carte postale locale",
    desc: "Photo de l'érablière à l'automne.",
    icon: "file",
    category: "touristic",
    basePrice: 2,
    weight: 0.01,
    tags: ["souvenir"],
  },
];

const PRODUCT_INDEX = new Map<string, MapleProduct>();
for (const p of MAPLE_PRODUCTS) PRODUCT_INDEX.set(p.id, p);

export function mapleProductById(id: string): MapleProduct | undefined {
  return PRODUCT_INDEX.get(id);
}

export function productsByCategory(cat: MapleProduct["category"]): MapleProduct[] {
  return MAPLE_PRODUCTS.filter((p) => p.category === cat);
}

export function allMapleProducts(): MapleProduct[] {
  return [...MAPLE_PRODUCTS];
}