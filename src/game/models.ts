import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib } from "./materials";

// ============================================================================
// TYPES ET INTERFACES AVANCÉS
// ============================================================================
export interface ModelDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ModelMetadata {
  id: string;
  label: string;
  category: string;
  description?: string;
  tags?: string[];
  dimensions?: ModelDimensions;
  weight?: number; // kg
  material?: string;
  era?: string; // ex: "moderne", "vintage", "historique"
  region?: string; // ex: "québec", "france", "universel"
  difficulty?: "facile" | "moyen" | "avancé";
  isInteractive?: boolean;
  isAnimated?: boolean;
  requiresPower?: boolean;
  price?: number; // prix virtuel en $
  rarity?: "commun" | "rare" | "épique" | "légendaire";
}

export interface ModelCategory {
  id: string;
  label: string;
  icon?: string;
  order: number;
  description?: string;
  color?: string;
}

export interface ModelSearchOptions {
  query?: string;
  categories?: string[];
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  rarity?: string[];
  interactive?: boolean;
  animated?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: "label" | "price" | "rarity" | "category";
  sortOrder?: "asc" | "desc";
}

export interface ModelStats {
  total: number;
  byCategory: Record<string, number>;
  byRarity: Record<string, number>;
  byTag: Record<string, number>;
  averagePrice: number;
  interactiveCount: number;
  animatedCount: number;
}

// ============================================================================
// CATÉGORIES DE MODÈLES (enrichies)
// ============================================================================
export const MODEL_CATEGORIES: ModelCategory[] = [
  { id: "urban", label: "Mobilier urbain", order: 1, description: "Éléments typiques des villes et villages québécois", color: "#64748b" },
  { id: "rural", label: "Vie rurale", order: 2, description: "Ferme, rangs, érablières et traditions", color: "#84cc16" },
  { id: "construction", label: "Construction", order: 3, description: "Matériaux et équipements de chantier", color: "#f59e0b" },
  { id: "commercial", label: "Commerce", order: 4, description: "Équipements de magasins et services", color: "#3b82f6" },
  { id: "industrial", label: "Industriel", order: 5, description: "Machines et équipements lourds", color: "#ef4444" },
  { id: "nature", label: "Nature", order: 6, description: "Flore et éléments naturels du Québec", color: "#22c55e" },
  { id: "lighting", label: "Éclairage", order: 7, description: "Lampes, néons et sources lumineuses", color: "#eab308" },
  { id: "decor", label: "Décoration", order: 8, description: "Objets décoratifs et saisonniers", color: "#a855f7" },
  { id: "vehicles", label: "Véhicules & épaves", order: 9, description: "Véhicules abandonnés ou endommagés", color: "#6366f1" },
  { id: "events", label: "Événements", order: 10, description: "Objets pour scénarios RP", color: "#ec4899" },
];

// ============================================================================
// ALIAS (système de raccourcis intelligent)
// ============================================================================
export const MODEL_ALIAS: Record<string, string> = {
  "pickup": "wreck_pickup", "truck": "wreck_truck", "car": "wreck_car",
  "wood": "log_stack", "hay": "hay_bale", "grain": "grain_silo", "tree": "spruce_tree", "rock": "granite_rock",
  "mailbox": "rural_mailbox", "bus_stop": "bus_stop_quebec", "fence": "wooden_fence", "bench": "park_bench", "lamp": "street_lamp",
  "atm": "atm", "gas": "gas_pump", "shelf": "shop_shelf", "cart": "shopping_cart", "saq": "lcbo_shelf",
  "barrel": "oil_barrel", "tank": "storage_tank", "pallet": "pallet",
  "cone": "traffic_cone", "barrier": "jersey_barrier", "crate": "wooden_crate", "cement": "cement_bag",
  "neon": "neon_sign", "sign": "road_sign", "table": "picnic_table", "bbq": "bbq_grill", "fire": "campfire",
  "snow": "snowman", "xmas": "christmas_tree", "pumpkin": "pumpkin",
  "police": "police_barrier", "medkit": "first_aid_kit", "tent": "tent",
};

// ============================================================================
// CATALOGUE COMPLET DES MODÈLES (avec métadonnées riches)
// ============================================================================
const MODELS: ModelMetadata[] = [
  // --- MOBILIER URBAIN ---
  { id: "bus_stop_quebec", label: "Arrêt d'autobus", category: "urban", description: "Abribus typique du Québec avec banc et paroi vitrée", tags: ["transport", "abribus", "attente"], dimensions: { width: 1.8, height: 2.4, depth: 1.2 }, weight: 180, material: "acier", era: "moderne", region: "québec", difficulty: "moyen", isInteractive: true, price: 2500, rarity: "commun" },
  { id: "street_lamp", label: "Lampadaire urbain", category: "urban", tags: ["éclairage", "rue", "nuit"], dimensions: { width: 0.3, height: 3.2, depth: 0.3 }, weight: 45, material: "acier", requiresPower: true, isInteractive: true, price: 800, rarity: "commun" },
  { id: "park_bench", label: "Banc de parc", category: "urban", tags: ["repos", "parc", "bois"], dimensions: { width: 1.6, height: 0.8, depth: 0.5 }, weight: 35, material: "bois", isInteractive: true, price: 450, rarity: "commun" },
  { id: "trash_bin", label: "Poubelle publique", category: "urban", tags: ["déchet", "recyclage", "ville"], dimensions: { width: 0.6, height: 0.95, depth: 0.6 }, weight: 25, material: "plastique", isInteractive: true, price: 180, rarity: "commun" },
  { id: "recycling_bin", label: "Bac de recyclage", category: "urban", tags: ["recyclage", "écologie", "bleu"], dimensions: { width: 0.65, height: 1.05, depth: 0.65 }, weight: 28, material: "plastique", isInteractive: true, price: 200, rarity: "commun" },
  { id: "fire_hydrant", label: "Bouche d'incendie", category: "urban", tags: ["urgence", "eau", "pompier", "rouge"], dimensions: { width: 0.4, height: 0.75, depth: 0.4 }, weight: 60, material: "fonte", isInteractive: false, price: 1200, rarity: "rare" },
  { id: "parking_meter", label: "Parcomètre", category: "urban", tags: ["stationnement", "monnaie", "ville"], dimensions: { width: 0.25, height: 1.3, depth: 0.25 }, weight: 18, material: "acier", isInteractive: true, price: 650, rarity: "commun" },
  { id: "traffic_cone", label: "Cône de chantier", category: "urban", tags: ["chantier", "signalisation", "orange"], dimensions: { width: 0.4, height: 0.7, depth: 0.4 }, weight: 3, material: "plastique", isInteractive: false, price: 25, rarity: "commun" },
  { id: "jersey_barrier", label: "Mur Jersey", category: "urban", tags: ["sécurité", "béton", "autoroute"], dimensions: { width: 2.4, height: 0.9, depth: 0.5 }, weight: 1200, material: "béton", isInteractive: false, price: 350, rarity: "commun" },

  // --- VIE RURALE ---
  { id: "rural_mailbox", label: "Boîte aux lettres rurale", category: "rural", description: "Boîte aux lettres sur pied en acier, typique des rangs", tags: ["courrier", "rang", "acier"], dimensions: { width: 0.4, height: 1.2, depth: 0.25 }, weight: 8, material: "acier", isInteractive: true, price: 120, rarity: "commun" },
  { id: "wooden_fence", label: "Clôture de rang", category: "rural", description: "Section de clôture en bois pour délimiter les propriétés", tags: ["clôture", "bois", "propriété"], dimensions: { width: 2.6, height: 1.2, depth: 0.1 }, weight: 45, material: "bois", isInteractive: false, price: 180, rarity: "commun" },
  { id: "hay_bale", label: "Botte de foin", category: "rural", tags: ["agriculture", "foin", "bétail"], dimensions: { width: 0.9, height: 0.9, depth: 0.9 }, weight: 280, material: "foin", isInteractive: false, price: 45, rarity: "commun" },
  { id: "grain_silo", label: "Silo à grain", category: "rural", description: "Grand silo cylindrique pour stockage de grains", tags: ["agriculture", "stockage", "grain"], dimensions: { width: 2.4, height: 4.3, depth: 2.4 }, weight: 3500, material: "métal", isInteractive: false, price: 8500, rarity: "épique" },
  { id: "log_stack", label: "Pile de bois", category: "rural", tags: ["bois", "chauffage", "hiver"], dimensions: { width: 1.4, height: 1.0, depth: 0.8 }, weight: 450, material: "bois", isInteractive: false, price: 220, rarity: "commun" },
  { id: "sugar_shack", label: "Cabane à sucre", category: "rural", description: "Petite cabane en bois rond pour la production de sirop d'érable", tags: ["érable", "sirop", "tradition", "cabane"], dimensions: { width: 2.4, height: 2.0, depth: 2.0 }, weight: 850, material: "bois", isInteractive: true, price: 4500, rarity: "rare" },
  { id: "maple_tree", label: "Érable à sucre", category: "rural", tags: ["érable", "sirop", "automne", "feuille"], dimensions: { width: 2.8, height: 3.5, depth: 2.8 }, weight: 1200, material: "bois", isInteractive: false, price: 650, rarity: "commun" },
  { id: "spruce_tree", label: "Épinette", category: "rural", tags: ["conifère", "forêt", "hiver", "sapin"], dimensions: { width: 2.2, height: 3.8, depth: 2.2 }, weight: 800, material: "bois", isInteractive: false, price: 420, rarity: "commun" },
  { id: "birch_tree", label: "Bouleau", category: "rural", tags: ["arbre", "écorce", "blanc", "forêt"], dimensions: { width: 2.0, height: 3.6, depth: 2.0 }, weight: 650, material: "bois", isInteractive: false, price: 380, rarity: "commun" },
  { id: "tractor", label: "Tracteur", category: "rural", description: "Tracteur agricole fonctionnel avec cabine", tags: ["agriculture", "véhicule", "champ"], dimensions: { width: 1.8, height: 1.8, depth: 1.2 }, weight: 3200, material: "métal", isInteractive: true, isAnimated: true, requiresPower: true, price: 35000, rarity: "légendaire" },
  { id: "cow", label: "Vache laitière", category: "rural", tags: ["bétail", "ferme", "lait", "animal"], dimensions: { width: 1.8, height: 1.3, depth: 0.7 }, weight: 650, material: "organique", isInteractive: true, isAnimated: true, price: 2800, rarity: "rare" },

  // --- CONSTRUCTION ---
  { id: "wooden_crate", label: "Caisse en bois", category: "construction", tags: ["stockage", "bois", "transport"], dimensions: { width: 0.9, height: 0.9, depth: 0.9 }, weight: 25, material: "bois", isInteractive: true, price: 65, rarity: "commun" },
  { id: "cement_bag", label: "Sac de ciment", category: "construction", tags: ["béton", "chantier", "poudre"], dimensions: { width: 0.5, height: 0.3, depth: 0.35 }, weight: 40, material: "papier", isInteractive: false, price: 12, rarity: "commun" },
  { id: "scaffolding", label: "Échafaudage", category: "construction", description: "Structure métallique modulaire pour travaux en hauteur", tags: ["chantier", "hauteur", "métal"], dimensions: { width: 2.0, height: 3.0, depth: 1.2 }, weight: 180, material: "acier", isInteractive: false, price: 850, rarity: "rare" },
  { id: "portable_toilet", label: "Toilette chimique", category: "construction", tags: ["chantier", "sanitaire", "bleu"], dimensions: { width: 1.1, height: 2.3, depth: 1.1 }, weight: 95, material: "plastique", isInteractive: true, price: 450, rarity: "commun" },
  { id: "generator", label: "Génératrice", category: "construction", description: "Génératrice électrique portable", tags: ["électricité", "urgence", "bruit"], dimensions: { width: 0.8, height: 0.7, depth: 0.5 }, weight: 65, material: "métal", isInteractive: true, isAnimated: true, requiresPower: false, price: 1800, rarity: "rare" },

  // --- COMMERCE ---
  { id: "atm", label: "GAB (bancomat)", category: "commercial", description: "Guichet automatique bancaire", tags: ["banque", "argent", "carte"], dimensions: { width: 0.6, height: 1.5, depth: 0.4 }, weight: 280, material: "métal", isInteractive: true, requiresPower: true, price: 5500, rarity: "rare" },
  { id: "gas_pump", label: "Pompe à essence", category: "commercial", tags: ["essence", "station", "carburant"], dimensions: { width: 0.5, height: 1.6, depth: 0.4 }, weight: 180, material: "métal", isInteractive: true, requiresPower: true, price: 3200, rarity: "rare" },
  { id: "shop_shelf", label: "Étagère de magasin", category: "commercial", tags: ["magasin", "stockage", "produits"], dimensions: { width: 1.4, height: 1.8, depth: 0.4 }, weight: 65, material: "métal", isInteractive: true, price: 380, rarity: "commun" },
  { id: "shopping_cart", label: "Panier d'épicerie", category: "commercial", tags: ["épicerie", "courses", "roues"], dimensions: { width: 0.6, height: 0.9, depth: 0.45 }, weight: 12, material: "métal", isInteractive: true, price: 85, rarity: "commun" },
  { id: "lcbo_shelf", label: "Étalage SAQ", category: "commercial", description: "Étagère pour bouteilles d'alcool", tags: ["alcool", "bouteilles", "SAQ"], dimensions: { width: 1.2, height: 1.4, depth: 0.35 }, weight: 55, material: "bois", isInteractive: true, price: 420, rarity: "commun" },

  // --- INDUSTRIEL ---
  { id: "oil_barrel", label: "Baril de pétrole", category: "industrial", tags: ["pétrole", "chimique", "danger"], dimensions: { width: 0.8, height: 0.95, depth: 0.8 }, weight: 180, material: "acier", isInteractive: false, price: 95, rarity: "commun" },
  { id: "storage_tank", label: "Réservoir industriel", category: "industrial", tags: ["stockage", "liquide", "usine"], dimensions: { width: 2.0, height: 2.2, depth: 2.0 }, weight: 1800, material: "acier", isInteractive: false, price: 4200, rarity: "rare" },
  { id: "forklift", label: "Chariot élévateur", category: "industrial", description: "Chariot élévateur fonctionnel", tags: ["entrepôt", "levage", "véhicule"], dimensions: { width: 1.2, height: 2.0, depth: 1.8 }, weight: 2800, material: "métal", isInteractive: true, isAnimated: true, requiresPower: true, price: 28000, rarity: "légendaire" },
  { id: "pallet", label: "Palette", category: "industrial", tags: ["transport", "bois", "entrepôt"], dimensions: { width: 1.0, height: 0.12, depth: 1.0 }, weight: 22, material: "bois", isInteractive: false, price: 35, rarity: "commun" },

  // --- NATURE ---
  { id: "granite_rock", label: "Rocher de granit", category: "nature", tags: ["pierre", "granit", "paysage"], dimensions: { width: 1.1, height: 0.8, depth: 1.1 }, weight: 850, material: "pierre", isInteractive: false, price: 180, rarity: "commun" },
  { id: "bush", label: "Buisson", category: "nature", tags: ["arbuste", "vert", "jardin"], dimensions: { width: 1.3, height: 0.9, depth: 1.1 }, weight: 45, material: "végétal", isInteractive: false, price: 65, rarity: "commun" },
  { id: "wildflower", label: "Fleurs sauvages", category: "nature", tags: ["fleurs", "printemps", "couleur"], dimensions: { width: 0.5, height: 0.35, depth: 0.5 }, weight: 2, material: "végétal", isInteractive: false, price: 15, rarity: "commun" },
  { id: "dead_tree", label: "Arbre mort", category: "nature", tags: ["mort", "sec", "forêt"], dimensions: { width: 1.2, height: 2.2, depth: 1.2 }, weight: 380, material: "bois", isInteractive: false, price: 95, rarity: "commun" },

  // --- ÉCLAIRAGE ---
  { id: "neon_sign", label: "Néon commercial", category: "lighting", description: "Panneau néon lumineux pour commerce", tags: ["néon", "publicité", "lumière"], dimensions: { width: 1.6, height: 0.2, depth: 0.1 }, weight: 8, material: "verre", isInteractive: true, isAnimated: true, requiresPower: true, price: 680, rarity: "rare" },
  { id: "spotlight", label: "Projecteur", category: "lighting", tags: ["lumière", "puissant", "extérieur"], dimensions: { width: 0.3, height: 0.25, depth: 0.35 }, weight: 5, material: "métal", isInteractive: true, requiresPower: true, price: 320, rarity: "commun" },
  { id: "fire_pit", label: "Foyer extérieur", category: "lighting", tags: ["feu", "chaleur", "camping"], dimensions: { width: 1.0, height: 0.6, depth: 1.0 }, weight: 120, material: "pierre", isInteractive: true, isAnimated: true, price: 450, rarity: "rare" },

  // --- DÉCORATION ---
  { id: "picnic_table", label: "Table à pique-nique", category: "decor", tags: ["repas", "extérieur", "bois"], dimensions: { width: 1.6, height: 0.8, depth: 1.2 }, weight: 65, material: "bois", isInteractive: true, price: 280, rarity: "commun" },
  { id: "bbq_grill", label: "Barbecue", category: "decor", tags: ["cuisson", "été", "viande"], dimensions: { width: 0.7, height: 1.1, depth: 0.7 }, weight: 35, material: "métal", isInteractive: true, isAnimated: true, price: 520, rarity: "commun" },
  { id: "canoe", label: "Canot", category: "decor", description: "Canot traditionnel en bois", tags: ["eau", "lac", "tradition"], dimensions: { width: 2.4, height: 0.5, depth: 0.6 }, weight: 38, material: "bois", isInteractive: true, price: 1800, rarity: "rare" },
  { id: "snowmobile", label: "Motoneige", category: "decor", description: "Motoneige fonctionnelle pour l'hiver", tags: ["hiver", "neige", "véhicule"], dimensions: { width: 1.6, height: 0.8, depth: 0.6 }, weight: 240, material: "métal", isInteractive: true, isAnimated: true, requiresPower: true, price: 12000, rarity: "épique" },
  { id: "snowman", label: "Bonhomme de neige", category: "decor", tags: ["hiver", "neige", "enfant"], dimensions: { width: 1.0, height: 1.8, depth: 1.0 }, weight: 180, material: "neige", isInteractive: false, price: 0, rarity: "commun" },
  { id: "christmas_tree", label: "Sapin de Noël", category: "decor", tags: ["noël", "fête", "décoration"], dimensions: { width: 1.6, height: 2.5, depth: 1.6 }, weight: 45, material: "bois", isInteractive: true, isAnimated: true, price: 180, rarity: "commun" },
  { id: "flag_quebec", label: "Drapeau du Québec", category: "decor", tags: ["québec", "fleurdelisé", "patrie"], dimensions: { width: 0.9, height: 2.5, depth: 0.1 }, weight: 5, material: "tissu", isInteractive: false, price: 45, rarity: "commun" },

  // --- VÉHICULES & ÉPAVES ---
  { id: "wreck_pickup", label: "Épave de pick-up", category: "vehicles", description: "Pick-up abandonné et rouillé", tags: ["épave", "rouille", "abandon"], dimensions: { width: 2.2, height: 1.4, depth: 1.2 }, weight: 1800, material: "métal", isInteractive: false, price: 350, rarity: "commun" },
  { id: "wreck_truck", label: "Épave de camion", category: "vehicles", tags: ["épave", "camion", "lourd"], dimensions: { width: 3.2, height: 2.0, depth: 1.5 }, weight: 4500, material: "métal", isInteractive: false, price: 850, rarity: "rare" },
  { id: "wreck_car", label: "Épave de voiture", category: "vehicles", tags: ["épave", "voiture", "abandon"], dimensions: { width: 1.8, height: 1.2, depth: 1.1 }, weight: 1200, material: "métal", isInteractive: false, price: 280, rarity: "commun" },

  // --- ÉVÉNEMENTS ---
  { id: "barricade", label: "Barricade", category: "events", tags: ["sécurité", "blocage", "orange"], dimensions: { width: 1.6, height: 0.8, depth: 0.5 }, weight: 35, material: "métal", isInteractive: false, price: 180, rarity: "commun" },
  { id: "police_barrier", label: "Ruban de police", category: "events", tags: ["police", "scène de crime", "jaune"], dimensions: { width: 2.0, height: 1.0, depth: 0.1 }, weight: 2, material: "plastique", isInteractive: false, price: 25, rarity: "commun" },
  { id: "first_aid_kit", label: "Trousse de premiers soins", category: "events", tags: ["médical", "urgence", "rouge"], dimensions: { width: 0.35, height: 0.25, depth: 0.2 }, weight: 3, material: "plastique", isInteractive: true, price: 120, rarity: "commun" },
  { id: "campfire", label: "Feu de camp", category: "events", tags: ["feu", "camping", "chaleur"], dimensions: { width: 0.8, height: 0.6, depth: 0.8 }, weight: 85, material: "pierre", isInteractive: true, isAnimated: true, price: 0, rarity: "commun" },
  { id: "tent", label: "Tente de camping", category: "events", tags: ["camping", "hébergement", "toile"], dimensions: { width: 1.8, height: 1.3, depth: 1.8 }, weight: 12, material: "toile", isInteractive: true, price: 280, rarity: "commun" },
];

// ============================================================================
// CACHE ET INDEXATION (pour performances O(1))
// ============================================================================
class ModelCache {
  private byId = new Map<string, ModelMetadata>();
  private byCategory = new Map<string, ModelMetadata[]>();
  private byTag = new Map<string, ModelMetadata[]>();
  private allTags = new Set<string>();
  
  constructor(models: ModelMetadata[]) {
    this.rebuild(models);
  }
  
  rebuild(models: ModelMetadata[]) {
    this.byId.clear();
    this.byCategory.clear();
    this.byTag.clear();
    this.allTags.clear();
    
    for (const model of models) {
      this.byId.set(model.id, model);
      
      if (!this.byCategory.has(model.category)) {
        this.byCategory.set(model.category, []);
      }
      this.byCategory.get(model.category)!.push(model);
      
      if (model.tags) {
        for (const tag of model.tags) {
          this.allTags.add(tag);
          if (!this.byTag.has(tag)) {
            this.byTag.set(tag, []);
          }
          this.byTag.get(tag)!.push(model);
        }
      }
    }
  }
  
  getById(id: string): ModelMetadata | undefined { return this.byId.get(id); }
  getByCategory(category: string): ModelMetadata[] { return this.byCategory.get(category) ?? []; }
  getByTag(tag: string): ModelMetadata[] { return this.byTag.get(tag) ?? []; }
  getAllTags(): string[] { return Array.from(this.allTags).sort(); }
}

let cache: ModelCache | null = null;
function getCache(): ModelCache {
  if (!cache) cache = new ModelCache(MODELS);
  return cache;
}

// ============================================================================
// FONCTIONS EXPORTÉES AVANCÉES
// ============================================================================
export const MODEL_CATALOG = MODELS;
export const TOTAL_MODELS = MODELS.length;

export function placeableModels(): ModelMetadata[] { return MODELS; }
export function getModelDef(id: string): ModelMetadata | null { return getCache().getById(id) ?? null; }
export function getModelsByCategory(category: string): ModelMetadata[] { return getCache().getByCategory(category); }
export function getModelsByTag(tag: string): ModelMetadata[] { return getCache().getByTag(tag); }
export function getAllTags(): string[] { return getCache().getAllTags(); }

// ============================================================================
// ⚠️ CORRECTION CRUCIALE : RECHERCHE RÉTROCOMPATIBLE (String OU Objet)
// ============================================================================
export function searchModels(optionsOrQuery: string | ModelSearchOptions = {}): ModelMetadata[] {
  // Normalisation : si c'est une string, on la convertit en objet
  const options: ModelSearchOptions = typeof optionsOrQuery === "string" 
    ? { query: optionsOrQuery } 
    : optionsOrQuery;
  
  let results = [...MODELS];
  
  if (options.query) {
    const q = options.query.toLowerCase().trim();
    if (q) {
      results = results.filter((m) => {
        if (m.label.toLowerCase().includes(q)) return true;
        if (m.id.toLowerCase().includes(q)) return true;
        if (m.description && m.description.toLowerCase().includes(q)) return true;
        if (m.tags && m.tags.some((t) => t.toLowerCase().includes(q))) return true;
        return false;
      });
    }
  }
  
  if (options.categories && options.categories.length > 0) {
    results = results.filter((m) => options.categories!.includes(m.category));
  }
  if (options.tags && options.tags.length > 0) {
    results = results.filter((m) => m.tags && options.tags!.some((t) => m.tags!.includes(t)));
  }
  if (options.minPrice !== undefined) results = results.filter((m) => (m.price ?? 0) >= options.minPrice!);
  if (options.maxPrice !== undefined) results = results.filter((m) => (m.price ?? 0) <= options.maxPrice!);
  if (options.rarity && options.rarity.length > 0) {
    results = results.filter((m) => m.rarity && options.rarity!.includes(m.rarity));
  }
  if (options.interactive !== undefined) results = results.filter((m) => m.isInteractive === options.interactive);
  if (options.animated !== undefined) results = results.filter((m) => m.isAnimated === options.animated);
  
  if (options.sortBy) {
    const order = options.sortOrder === "desc" ? -1 : 1;
    results.sort((a, b) => {
      switch (options.sortBy) {
        case "label": return a.label.localeCompare(b.label) * order;
        case "price": return ((a.price ?? 0) - (b.price ?? 0)) * order;
        case "rarity": {
          const rarityOrder = { "commun": 1, "rare": 2, "épique": 3, "légendaire": 4 };
          return ((rarityOrder[a.rarity ?? "commun"] ?? 0) - (rarityOrder[b.rarity ?? "commun"] ?? 0)) * order;
        }
        case "category": return a.category.localeCompare(b.category) * order;
        default: return 0;
      }
    });
  }
  
  if (options.offset) results = results.slice(options.offset);
  if (options.limit) results = results.slice(0, options.limit);
  
  return results;
}

// ============================================================================
// STATISTIQUES
// ============================================================================
export function getModelStats(): ModelStats {
  const byCategory: Record<string, number> = {};
  const byRarity: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  let totalPrice = 0;
  let interactiveCount = 0;
  let animatedCount = 0;
  
  for (const model of MODELS) {
    byCategory[model.category] = (byCategory[model.category] ?? 0) + 1;
    if (model.rarity) byRarity[model.rarity] = (byRarity[model.rarity] ?? 0) + 1;
    if (model.tags) {
      for (const tag of model.tags) byTag[tag] = (byTag[tag] ?? 0) + 1;
    }
    totalPrice += model.price ?? 0;
    if (model.isInteractive) interactiveCount++;
    if (model.isAnimated) animatedCount++;
  }
  
  return {
    total: MODELS.length,
    byCategory,
    byRarity,
    byTag,
    averagePrice: totalPrice / MODELS.length,
    interactiveCount,
    animatedCount,
  };
}

// ============================================================================
// UTILITAIRES & RÉSOLUTION
// ============================================================================
export function resolveAlias(id: string): string { return MODEL_ALIAS[id] ?? id; }
export function hasAlias(id: string): boolean { return id in MODEL_ALIAS; }

export function buildFromMeta(id: string): THREE.Group | null {
  const resolvedId = resolveAlias(id);
  const def = getModelDef(resolvedId);
  if (!def) return null;
  
  const group = new THREE.Group();
  group.name = resolvedId;
  group.userData.modelDef = def;
  
  if (def.dimensions) {
    const { width, height, depth } = def.dimensions;
    const color = getCategoryColor(def.category);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      matLib.get(color, 0.85)
    );
    mesh.position.y = height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function getCategoryColor(category: string): number {
  const colors: Record<string, number> = {
    urban: 0x64748b, rural: 0x84cc16, construction: 0xf59e0b, commercial: 0x3b82f6,
    industrial: 0xef4444, nature: 0x22c55e, lighting: 0xeab308, decor: 0xa855f7,
    vehicles: 0x6366f1, events: 0xec4899,
  };
  return colors[category] ?? 0x808080;
}

export function getRandomModel(): ModelMetadata { return MODELS[Math.floor(Math.random() * MODELS.length)]; }
export function getRandomModelByCategory(category: string): ModelMetadata | null {
  const models = getModelsByCategory(category);
  return models.length === 0 ? null : models[Math.floor(Math.random() * models.length)];
}
export function getMostExpensiveModel(): ModelMetadata {
  return MODELS.reduce((max, m) => (m.price ?? 0) > (max.price ?? 0) ? m : max, MODELS[0]);
}
export function getCheapestModel(): ModelMetadata {
  return MODELS.reduce((min, m) => (m.price ?? 0) < (min.price ?? 0) ? m : min, MODELS[0]);
}
export function getInteractiveModels(): ModelMetadata[] { return MODELS.filter((m) => m.isInteractive); }
export function getAnimatedModels(): ModelMetadata[] { return MODELS.filter((m) => m.isAnimated); }
export function getLegendaryModels(): ModelMetadata[] { return MODELS.filter((m) => m.rarity === "légendaire"); }

export function serializeModel(model: ModelMetadata): string { return JSON.stringify(model, null, 2); }
export function deserializeModel(json: string): ModelMetadata | null {
  try { return JSON.parse(json) as ModelMetadata; } catch { return null; }
}
export function exportCatalog(): string { return JSON.stringify(MODELS, null, 2); }

export function isValidModelId(id: string): boolean { return getModelDef(id) !== null || hasAlias(id); }
export function validateModel(model: unknown): model is ModelMetadata {
  if (!model || typeof model !== "object") return false;
  const m = model as Partial<ModelMetadata>;
  return typeof m.id === "string" && typeof m.label === "string" && typeof m.category === "string";
}