/**
 * TROXTWORLD — Catalogue produits SQDC + marché noir
 */
export interface SqdcProduct {
  id: string;
  name: string;
  legal: boolean;
  category: "fleur" | "huile" | "vape" | "preroll" | "edible" | "accessoire" | "illegal";
  wholesale: number;
  retail: number;
  weightGrams: number;
  thcMg: number;
  cbdMg: number;
  image: string; // chemin vers /products/{id}.jpg
}

export const SQDC_CATALOG: SqdcProduct[] = [
  // Fleur
  { id: "weed",             name: "Fleur hybride 3.5g",    legal: true,  category: "fleur",     wholesale: 14,   retail: 24,   weightGrams: 3.5, thcMg: 800,  cbdMg: 20,  image: "weed" },
  { id: "fleur_indica",     name: "Fleur indica 3.5g",     legal: true,  category: "fleur",     wholesale: 15,   retail: 26,   weightGrams: 3.5, thcMg: 950,  cbdMg: 10,  image: "fleur_indica" },
  { id: "fleur_sativa",     name: "Fleur sativa 3.5g",     legal: true,  category: "fleur",     wholesale: 15,   retail: 26,   weightGrams: 3.5, thcMg: 850,  cbdMg: 10,  image: "fleur_sativa" },
  { id: "fleur_hybride",    name: "Fleur hybride premium", legal: true,  category: "fleur",     wholesale: 22,   retail: 38,   weightGrams: 3.5, thcMg: 1100, cbdMg: 30,  image: "fleur_hybride" },

  // Huiles
  { id: "huile",            name: "Huile THC 30ml",        legal: true,  category: "huile",     wholesale: 18,   retail: 32,   weightGrams: 0,   thcMg: 1500, cbdMg: 100, image: "huile" },
  { id: "huile_cbd_30ml",   name: "Huile CBD 30ml",        legal: true,  category: "huile",     wholesale: 16,   retail: 28,   weightGrams: 0,   thcMg: 50,   cbdMg: 1500, image: "huile_cbd_30ml" },
  { id: "huile_thc_30ml",   name: "Huile THC forte",       legal: true,  category: "huile",     wholesale: 24,   retail: 42,   weightGrams: 0,   thcMg: 2500, cbdMg: 100, image: "huile_thc_30ml" },
  { id: "shatter",          name: "Shatter 1g",            legal: true,  category: "huile",     wholesale: 28,   retail: 48,   weightGrams: 1,   thcMg: 900,  cbdMg: 5,   image: "shatter" },
  { id: "live_resin",       name: "Live Resin 1g",         legal: true,  category: "huile",     wholesale: 32,   retail: 55,   weightGrams: 1,   thcMg: 850,  cbdMg: 5,   image: "live_resin" },

  // Vapes
  { id: "vape",             name: "Cartouche vape 0.5g",   legal: true,  category: "vape",      wholesale: 22,   retail: 38,   weightGrams: 0.5, thcMg: 450,  cbdMg: 0,   image: "vape" },
  { id: "vape_cart_indica", name: "Cartouche Indica",      legal: true,  category: "vape",      wholesale: 24,   retail: 42,   weightGrams: 0.5, thcMg: 500,  cbdMg: 0,   image: "vape_cart_indica" },
  { id: "vape_battery",     name: "Batterie 510",          legal: true,  category: "vape",      wholesale: 12,   retail: 22,   weightGrams: 0,   thcMg: 0,    cbdMg: 0,   image: "vape_battery" },

  // Préroulés
  { id: "preroll",          name: "Préroulé simple 0.5g",  legal: true,  category: "preroll",   wholesale: 4,    retail: 8,    weightGrams: 0.5, thcMg: 100,  cbdMg: 2,   image: "preroll" },
  { id: "preroll_pack_3",   name: "Préroulés x3",          legal: true,  category: "preroll",   wholesale: 11,   retail: 20,   weightGrams: 1.5, thcMg: 300,  cbdMg: 5,   image: "preroll_pack_3" },
  { id: "gelules",          name: "Gélules THC 10mg",      legal: true,  category: "preroll",   wholesale: 15,   retail: 26,   weightGrams: 0,   thcMg: 10,   cbdMg: 0,   image: "gelules" },
  { id: "hash",             name: "Hash 2g",               legal: true,  category: "preroll",   wholesale: 18,   retail: 32,   weightGrams: 2,   thcMg: 500,  cbdMg: 10,  image: "hash" },

  // Comestibles
  { id: "gummies_10mg",     name: "Bonbons 10mg",          legal: true,  category: "edible",    wholesale: 8,    retail: 16,   weightGrams: 0,   thcMg: 10,   cbdMg: 0,   image: "gummies_10mg" },
  { id: "chocolate_5mg",    name: "Chocolat 5mg",          legal: true,  category: "edible",    wholesale: 6,    retail: 12,   weightGrams: 0,   thcMg: 5,    cbdMg: 0,   image: "chocolate_5mg" },
  { id: "beverage_thc",     name: "Boisson 5mg",           legal: true,  category: "edible",    wholesale: 5,    retail: 10,   weightGrams: 0,   thcMg: 5,    cbdMg: 0,   image: "beverage_thc" },

  // Accessoires
  { id: "rolling_papers",   name: "Papier à rouler",       legal: true,  category: "accessoire", wholesale: 2,   retail: 5,    weightGrams: 0,   thcMg: 0,    cbdMg: 0,   image: "rolling_papers" },
  { id: "grinder",          name: "Grinder métal",         legal: true,  category: "accessoire", wholesale: 8,   retail: 18,   weightGrams: 0,   thcMg: 0,    cbdMg: 0,   image: "grinder" },
  { id: "pipe_glass",       name: "Pipe en verre",         legal: true,  category: "accessoire", wholesale: 14,  retail: 28,   weightGrams: 0,   thcMg: 0,    cbdMg: 0,   image: "pipe_glass" },
  { id: "lighter",          name: "Briquet",               legal: true,  category: "accessoire", wholesale: 1,   retail: 3,    weightGrams: 0,   thcMg: 0,    cbdMg: 0,   image: "lighter" },

  // ⚠ MARCHÉ NOIR (non vendu en SQDC, pour systèmes illégaux)
  { id: "black_weed",       name: "Weed de rue 5g",        legal: false, category: "illegal",   wholesale: 20,   retail: 45,   weightGrams: 5,   thcMg: 600,  cbdMg: 5,   image: "black_weed" },
  { id: "black_hash",       name: "Hash noir 3g",          legal: false, category: "illegal",   wholesale: 30,   retail: 70,   weightGrams: 3,   thcMg: 700,  cbdMg: 8,   image: "black_hash" },
  { id: "black_pills",      name: "Pilules synthétiques",  legal: false, category: "illegal",   wholesale: 50,   retail: 120,  weightGrams: 0,   thcMg: 0,    cbdMg: 0,   image: "black_pills" },
];

export function productById(id: string): SqdcProduct | null {
  return SQDC_CATALOG.find((p) => p.id === id) ?? null;
}

export function legalProducts(): SqdcProduct[] {
  return SQDC_CATALOG.filter((p) => p.legal);
}

export function illegalProducts(): SqdcProduct[] {
  return SQDC_CATALOG.filter((p) => !p.legal);
}