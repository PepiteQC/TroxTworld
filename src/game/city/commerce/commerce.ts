/**
 * ═══════════════════════════════════════════════════════════════════
 *  SYSTÈME DE COMMERCE AVANCÉ v2.0 — TROXWORLD (COMTE DE PORTNEUF)
 * ═══════════════════════════════════════════════════════════════════
 * Gestion des magasins, catalogues, paniers, transactions, et stocks.
 * Optimisé pour les performances et l'extensibilité.
 *
 * ─── v2.0 — NOUVEAUTÉS ───
 *  • WalletProvider : débit/crédit réel branché sur banking.ts
 *  • AgeProvider    : vérification d'âge (alcool, tabac, cannabis)
 *  • LicenseProvider: vérification de permis (PAL, chasse…)
 *  • BagProvider    : vérification de poids d'inventaire
 *  • Checkout atomique avec rollback automatique
 *  • Events : onTransaction, onCheckout, onStockUpdate, onOutOfStock
 *  • Pas de double-déduction (ShopManager débit une fois)
 *  • Items illégaux exclus des shops légitimes
 *  • Health check + dispose
 *
 * @author xblade benz (TroxTWorld)
 */

import { A40_EXITS, villageCivicSpot, type VillageDef } from "../../worlddata";
import { getWeapon, weaponAmmo, weaponHarvestRange } from "../../weapons";

// ==========================================
// 📌 1. TYPES & CONSTANTES
// ==========================================

/** Types de magasins */
export type ShopKind =
  | "depanneur"
  | "food"
  | "clothing"
  | "chasse"
  | "quincaillerie"
  | "sqdc"
  | "armurerie"
  | "pharmacie"
  | "station_service"
  | "garage";

/** Groupes de sacs (pour l'inventaire) */
export type BagGroup = "all" | "hunt" | "loot" | "food" | "gear" | "wear" | "tools";

/** Utilisations des articles */
export type ShopUse =
  | "eat" | "drink" | "wear" | "tool" | "fuel"
  | "drug" | "seed" | "ammunition" | "medical" | "legal";

/** Catégories d'articles (pour le tri) */
export type ItemCategory =
  | "nourriture" | "boisson" | "vetement" | "arme" | "munition"
  | "outillage" | "drogue" | "legume" | "produit_laitier"
  | "viande" | "divers";

/** Statut de disponibilité d'un article */
export type AvailabilityStatus = "available" | "out_of_stock" | "restricted" | "seasonal";

/** Niveau de rareté (pour les items spéciaux) */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "illegal";

/** Interface de base pour un article du commerce */
export interface ShopItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  icon: string;
  kinds: ShopKind[];
  weight: number;
  use?: ShopUse;
  harvest?: boolean;
  hunger?: number;
  thirst?: number;
  restricted?: 18 | 21;
  category?: ItemCategory;
  rarity?: Rarity;
  stock?: number;
  maxStock?: number;
  restockThreshold?: number;
  restockAmount?: number;
  seasonal?: boolean;
  season?: "winter" | "spring" | "summer" | "fall";
  discount?: number;
  tags?: string[];
  brand?: string;
  manufacturer?: string;
  legal?: boolean;
  requiredLicense?: string;
  relatedItems?: string[];
}

/** ID d'un article */
export type ShopItemId = ShopItem["id"];

/** Emplacement d'un magasin dans le monde */
export interface ShopSpot {
  restricted?: number;
  id: string;
  name: string;
  villageId: string;
  kind: ShopKind;
  x: number;
  z: number;
  yaw: number;
  hours: string;
  openFrom?: number;
  openTo?: number;
  isOpen?: boolean;
  ownerId?: string;
  employees?: string[];
  capacity?: number;
  reputation?: number;
}

/** Panier d'achat */
export interface Cart {
  items: Record<ShopItemId, number>;
  shopId?: string;
  customerId?: string;
  createdAt: number;
}

/** Transaction d'achat/vente */
export interface Transaction {
  id: string;
  type: "purchase" | "sale" | "refund";
  shopId: string;
  customerId?: string;
  items: { itemId: ShopItemId; quantity: number; unitPrice: number }[];
  subtotal: number;
  taxes: number;
  total: number;
  paymentMethod: "cash" | "card" | "loyalty_points" | "bank_transfer";
  timestamp: number;
  status: "pending" | "completed" | "failed" | "cancelled" | "refunded";
  receiptId?: string;
}

/** Reçu de transaction */
export interface Receipt {
  id: string;
  transactionId: string;
  shopName: string;
  customerName?: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxes: number;
  total: number;
  date: number;
  paymentMethod: string;
  change?: number;
}

/** Promotion ou réduction */
export interface Promotion {
  id: string;
  name: string;
  description: string;
  shopId?: string;
  itemIds?: ShopItemId[];
  category?: ItemCategory;
  discountPercent: number;
  discountFixed?: number;
  startDate: number;
  endDate: number;
  minQuantity?: number;
  maxUses?: number;
  uses?: number;
  active: boolean;
}

/** État global d'un magasin */
export interface ShopState {
  id: string;
  isOpen: boolean;
  currentCustomers: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  lastRestock: number;
}

/** Type de client (pour les statistiques) */
export type CustomerType = "regular" | "vip" | "wholesale" | "employee";

/** Historique d'achat d'un client */
export interface CustomerPurchaseHistory {
  customerId: string;
  shopId: string;
  itemId: ShopItemId;
  quantity: number;
  price: number;
  timestamp: number;
}

// ==========================================
// 🆕 v2.0 — PROVIDERS EXTERNES
// ==========================================

/**
 * Interface pour débiter/créditer de l'argent.
 * À brancher sur banking.ts :
 *
 *   shopManager.setWalletProvider({
 *     getBalance: (id) => getPlayerCash(id) + (getDefaultAccount(id)?.balance ?? 0),
 *     withdraw:   (id, amt) => { removeCash(amt, id); return true; },
 *     deposit:    (id, amt) => { addCash(amt, id); return true; },
 *   });
 */
export interface WalletProvider {
  getBalance(playerId: string): number;
  withdraw(playerId: string, amount: number, reason?: string): boolean;
  deposit(playerId: string, amount: number, reason?: string): boolean;
}

/** Vérifie l'âge d'un joueur */
export interface AgeProvider {
  getAge(playerId: string): number;
}

/** Vérifie les licences d'un joueur */
export interface LicenseProvider {
  hasLicense(playerId: string, licenseId: string): boolean;
}

/** Vérifie la capacité/poids du sac d'un joueur */
export interface BagProvider {
  getBagCapacity(playerId: string): number; // kg
  getBagWeight(playerId: string): number;   // kg
}

// ==========================================
// 📦 2. CONSTANTES
// ==========================================

/** Poids maximum d'un sac par défaut (en kg) */
export const BAG_MAX_KG = 22;

/** Taux de taxes au Québec (TPS + TVQ) */
export const QUEBEC_TAX_RATE = 0.14975;

/** Capacité des sacs selon leur type */
export const BAG_CAPACITIES: Record<string, number> = {
  sac: 30,
  sac_rouge: 30,
  sac_rando: 38,
  default: BAG_MAX_KG,
};

/** Heures d'ouverture par défaut selon le type de magasin */
export const DEFAULT_SHOP_HOURS: Record<ShopKind, { open: number; close: number }> = {
  depanneur: { open: 6, close: 23 },
  food: { open: 11, close: 23 },
  clothing: { open: 9, close: 21 },
  chasse: { open: 10, close: 18 },
  quincaillerie: { open: 7, close: 18 },
  sqdc: { open: 10, close: 21 },
  armurerie: { open: 9, close: 17 },
  pharmacie: { open: 9, close: 18 },
  station_service: { open: 0, close: 24 },
  garage: { open: 8, close: 18 },
};

// ==========================================
// 📚 3. CATALOGUE DES ARTICLES (Données)
// ==========================================

/** Catalogue complet des articles disponibles */
export const CATALOG: ShopItem[] = [
  // ========== NOURRITURE (Dépanneur) ==========
  { id: "poutine", name: "Poutine extra", price: 9.5, desc: "Frites, sauce brune, fromage en grains.", icon: "utensils", kinds: ["depanneur", "food"], weight: 0.6, use: "eat", hunger: 55, category: "nourriture", tags: ["quebecois", "frites", "fromage"], stock: 10, maxStock: 20, restockThreshold: 5, restockAmount: 10 },
  { id: "hotdog", name: "Steamé all-dressed", price: 3.5, desc: "Pain vapeur, choux, moutarde.", icon: "sandwich", kinds: ["depanneur", "food"], weight: 0.25, use: "eat", hunger: 28, category: "nourriture", tags: ["quebecois", "viande"], stock: 15, maxStock: 30 },
  { id: "cafe", name: "Café double", price: 2.25, desc: "Brun, comme il faut.", icon: "coffee", kinds: ["depanneur", "food"], weight: 0.2, use: "drink", thirst: 20, category: "boisson", tags: ["cafeine", "chaud"], stock: 20, maxStock: 50 },
  { id: "cola", name: "Cola érable", price: 2.5, desc: "Canette froide du frigo.", icon: "cup", kinds: ["depanneur", "food"], weight: 0.35, use: "drink", thirst: 22, hunger: 4, category: "boisson", tags: ["gazeuse", "froid"], stock: 25, maxStock: 100 },
  { id: "lait", name: "Lait 2 L", price: 4.95, desc: "Québon, sac de plastique.", icon: "cup", kinds: ["depanneur"], weight: 2.1, use: "drink", thirst: 28, category: "produit_laitier", tags: ["lait", "quebecois"], stock: 8, maxStock: 20 },
  { id: "chips", name: "Chips ketchup", price: 2.75, desc: "Le vrai goût d'ici.", icon: "cookie", kinds: ["depanneur"], weight: 0.18, use: "eat", hunger: 18, category: "nourriture", tags: ["snack", "ketchup"], stock: 30, maxStock: 100 },
  { id: "biere", name: "Bière en canette", price: 4.5, desc: "Froide, du frigo du fond.", icon: "beer", kinds: ["depanneur", "food"], weight: 0.36, use: "drink", thirst: 25, hunger: 5, category: "boisson", tags: ["alcool", "froid", "quebecois"], restricted: 18, stock: 20, maxStock: 50, brand: "Boréale" },
  { id: "loto", name: "Billet Loto-Québec", price: 3, desc: "La poule, c'est mardi.", icon: "newspaper", kinds: ["depanneur"], weight: 0.01, category: "divers", tags: ["loterie", "jeu"] },
  { id: "tabac", name: "Paquet de cigarettes", price: 16.5, desc: "Derrière le comptoir. 18 ans.", icon: "cookie", kinds: ["depanneur"], weight: 0.02, category: "divers", tags: ["tabac"], restricted: 18, stock: 10, maxStock: 30 },
  { id: "slush", name: "Slush cerise", price: 2.25, desc: "Machine du comptoir, trop sucrée.", icon: "cup", kinds: ["depanneur"], weight: 0.4, use: "drink", thirst: 18, category: "boisson", tags: ["froid", "sucre"], stock: 15, maxStock: 40 },
  { id: "glace", name: "Barre glacée", price: 2, desc: "Congélateur près de la porte.", icon: "cookie", kinds: ["depanneur"], weight: 0.12, use: "eat", hunger: 12, thirst: 6, category: "nourriture", tags: ["froid", "sucre"], stock: 25, maxStock: 80 },
  { id: "pain", name: "Pain blanc", price: 3.5, desc: "Sac de plastique, tranché.", icon: "sandwich", kinds: ["depanneur"], weight: 0.55, use: "eat", hunger: 20, category: "nourriture", tags: ["boulangerie"], stock: 12, maxStock: 30 },
  { id: "beurre", name: "Beurre 454 g", price: 6.5, desc: "Frigo, papier d'alu.", icon: "cookie", kinds: ["depanneur"], weight: 0.46, category: "produit_laitier", tags: ["beurre", "cuisine"], stock: 10, maxStock: 25 },
  { id: "sirop", name: "Sirop d'érable 250 ml", price: 22, desc: "Ambré, cabane de Portneuf. Quatre seaux d'eau.", icon: "droplets", kinds: ["depanneur"], weight: 0.35, use: "drink", hunger: 10, category: "nourriture", tags: ["quebecois", "erable"], harvest: true, stock: 8, maxStock: 20 },
  { id: "essence", name: "Essence 20 L", price: 28.4, desc: "Plein pour la 138.", icon: "fuel", kinds: ["depanneur", "station_service"], weight: 2.4, use: "fuel", category: "divers", tags: ["carburant"], stock: 5, maxStock: 20 },
  { id: "journal", name: "Le Journal de Portneuf", price: 2, desc: "Nouvelles du comté.", icon: "newspaper", kinds: ["depanneur"], weight: 0.12, category: "divers", tags: ["media"], stock: 10, maxStock: 30 },

  // ========== PLATS TRADITIONNELS (Food) ==========
  { id: "tourtiere", name: "Tourtière", price: 12, desc: "Pâté à la viande du temps des fêtes.", icon: "utensils", kinds: ["food"], weight: 0.7, use: "eat", hunger: 60, category: "nourriture", tags: ["traditionnel", "viande", "quebecois"], stock: 5, maxStock: 15, season: "winter" },
  { id: "pouding_chomeur", name: "Pouding chômeur", price: 6, desc: "Gâteau noyé dans le sirop d'érable chaud.", icon: "cookie", kinds: ["food", "depanneur"], weight: 0.28, use: "eat", hunger: 25, category: "nourriture", tags: ["dessert", "quebecois", "sirop"], stock: 8, maxStock: 20 },
  { id: "cretons", name: "Crétons", price: 4, desc: "Pâté de porc épicé, classique du déjeuner.", icon: "sandwich", kinds: ["food", "depanneur"], weight: 0.22, use: "eat", hunger: 20, category: "nourriture", tags: ["viande", "traditionnel"], stock: 6, maxStock: 15 },
  { id: "soupe_pois", name: "Soupe aux pois", price: 7, desc: "Pois jaunes et lard salé.", icon: "utensils", kinds: ["food"], weight: 0.45, use: "eat", hunger: 30, thirst: 10, category: "nourriture", tags: ["soupe", "traditionnel"], stock: 4, maxStock: 10 },
  { id: "pate_chinois", name: "Pâté chinois", price: 10, desc: "Bœuf haché, blé d'Inde, patates pilées.", icon: "utensils", kinds: ["food"], weight: 0.55, use: "eat", hunger: 50, category: "nourriture", tags: ["viande", "traditionnel"], stock: 3, maxStock: 10 },
  { id: "viande_fumee", name: "Sandwich viande fumée", price: 11, desc: "Empilé haut, moutarde forte.", icon: "sandwich", kinds: ["food"], weight: 0.38, use: "eat", hunger: 45, category: "nourriture", tags: ["viande", "sandwich"], stock: 7, maxStock: 20 },
  { id: "bagel", name: "Bagel de Montréal", price: 2, desc: "Four à bois, graines de sésame.", icon: "sandwich", kinds: ["food", "depanneur"], weight: 0.12, use: "eat", hunger: 25, category: "nourriture", tags: ["boulangerie", "montreal"], stock: 12, maxStock: 30 },
  { id: "fromage_grains", name: "Fromage en grains", price: 6, desc: "Frais du jour, doit couiner.", icon: "cookie", kinds: ["food", "depanneur"], weight: 0.2, use: "eat", hunger: 15, category: "produit_laitier", tags: ["fromage", "quebecois"], stock: 8, maxStock: 20 },
  { id: "tarte_sucre", name: "Tarte au sucre", price: 8, desc: "Cassonade et crème, ultra sucrée.", icon: "cookie", kinds: ["food"], weight: 0.32, use: "eat", hunger: 30, category: "nourriture", tags: ["dessert", "sucre"], stock: 5, maxStock: 12 },

  // ========== FRUITS & LÉGUMES ==========
  { id: "pomme", name: "Pomme", price: 1, desc: "Variété locale, croquante.", icon: "leaf", kinds: ["depanneur", "food"], weight: 0.18, use: "eat", hunger: 12, thirst: 8, category: "legume", tags: ["fruit", "sante"], harvest: true, stock: 20, maxStock: 50 },
  { id: "banane", name: "Banane", price: 1, desc: "Bonne source de potassium.", icon: "leaf", kinds: ["depanneur"], weight: 0.16, use: "eat", hunger: 14, thirst: 5, category: "legume", tags: ["fruit"], stock: 15, maxStock: 40 },
  { id: "orange", name: "Orange", price: 1, desc: "Juteuse, riche en vitamine C.", icon: "leaf", kinds: ["depanneur"], weight: 0.18, use: "eat", hunger: 12, thirst: 12, category: "legume", tags: ["fruit", "vitamine"], stock: 15, maxStock: 40 },
  { id: "carotte", name: "Carotte", price: 1, desc: "Croquante, avec fanes.", icon: "leaf", kinds: ["depanneur"], weight: 0.12, use: "eat", hunger: 8, thirst: 3, category: "legume", tags: ["legume", "sante"], harvest: true, stock: 18, maxStock: 50 },
  { id: "croissant", name: "Croissant", price: 3, desc: "Pur beurre, feuilleté.", icon: "sandwich", kinds: ["depanneur", "food"], weight: 0.08, use: "eat", hunger: 18, category: "nourriture", tags: ["boulangerie", "viennoiserie"], stock: 10, maxStock: 30 },
  { id: "eau", name: "Bouteille d'eau", price: 2, desc: "Format 500 ml.", icon: "droplets", kinds: ["depanneur", "food"], weight: 0.52, use: "drink", thirst: 35, category: "boisson", tags: ["eau", "hydratation"], stock: 25, maxStock: 100 },
  { id: "jus_orange", name: "Jus d'orange", price: 3, desc: "Carton individuel, pur jus.", icon: "cup", kinds: ["depanneur", "food"], weight: 0.28, use: "drink", thirst: 22, hunger: 5, category: "boisson", tags: ["jus", "vitamine"], stock: 15, maxStock: 40 },
  { id: "barre_chocolat", name: "Barre de chocolat", price: 2, desc: "Énergie rapide, format dépanneur.", icon: "cookie", kinds: ["depanneur"], weight: 0.06, use: "eat", hunger: 15, category: "nourriture", tags: ["snack", "chocolat"], stock: 20, maxStock: 60 },
  { id: "beigne", name: "Beigne glacé", price: 2, desc: "Glaçage rose, café du coin.", icon: "cookie", kinds: ["depanneur", "food"], weight: 0.09, use: "eat", hunger: 20, category: "nourriture", tags: ["dessert", "sucre"], stock: 12, maxStock: 30 },
  { id: "medkit", name: "Trousse de premiers soins", price: 32, desc: "Pour les rangs et l'A-40.", icon: "plus", kinds: ["depanneur", "chasse"], weight: 0.8, use: "medical", category: "divers", tags: ["sante", "secours"], stock: 5, maxStock: 15 },

  // ========== VÊTEMENTS ==========
  { id: "veste", name: "Veste carreaux de laine", price: 89, desc: "Portneuf, coupe d'hiver.", icon: "shirt", kinds: ["clothing"], weight: 1.1, use: "wear", category: "vetement", tags: ["hiver", "laine"], stock: 8, maxStock: 20 },
  { id: "goose", name: "Parka Canada Goose", price: 189, desc: "Duvet, hiver du comté.", icon: "shirt", kinds: ["clothing"], weight: 1.8, use: "wear", category: "vetement", tags: ["hiver", "premium"], stock: 3, maxStock: 10, rarity: "rare" },
  { id: "roots", name: "Coton ouaté Roots", price: 72, desc: "Castor, molleton canadien.", icon: "shirt", kinds: ["clothing"], weight: 0.7, use: "wear", category: "vetement", tags: ["confort", "canadien"], stock: 6, maxStock: 15 },
  { id: "nike", name: "Survêtement Nike", price: 98, desc: "Sport, rue, vitrine Éther.", icon: "shirt", kinds: ["clothing"], weight: 0.6, use: "wear", category: "vetement", tags: ["sport", "marque"], stock: 10, maxStock: 25 },
  { id: "bottes", name: "Bottes à cap d'acier", price: 124, desc: "Travail et neige.", icon: "shirt", kinds: ["clothing"], weight: 1.6, use: "wear", category: "vetement", tags: ["travail", "hiver"], stock: 5, maxStock: 12 },
  { id: "tuque", name: "Tuque Canadienne", price: 22, desc: "Laine, pompon inclus.", icon: "shirt", kinds: ["clothing"], weight: 0.2, use: "wear", category: "vetement", tags: ["hiver", "accessoire"], stock: 15, maxStock: 40 },

  // ========== CHASSE & PÊCHE ==========
  { id: "permis", name: "Permis faunique MFFP", price: 46, desc: "Saison orignal, secteur Portneuf.", icon: "newspaper", kinds: ["chasse"], weight: 0.02, category: "divers", tags: ["licence", "chasse"], requiredLicense: "permis_chasse", stock: 100 },
  { id: "pal", name: "Permis PAL", price: 85, desc: "GRC — possession d'armes d'épaule.", icon: "newspaper", kinds: ["chasse"], weight: 0.02, category: "divers", tags: ["licence", "arme"], requiredLicense: "PAL", stock: 100 },
  { id: "pal_r", name: "PAL restreint", price: 185, desc: "Autorisation de poing. Contrôle SQ.", icon: "newspaper", kinds: ["chasse"], weight: 0.02, category: "divers", tags: ["licence", "arme"], requiredLicense: "PAL_restreint", stock: 100 },
  { id: "jumelles", name: "Jumelles 10×42", price: 78, desc: "Pour les Laurentides.", icon: "binoculars", kinds: ["chasse"], weight: 0.7, category: "outillage", tags: ["optique", "observation"], stock: 8, maxStock: 20 },
  { id: "kaki", name: "Veste kaki Faune & Parcs", price: 96, desc: "Approcher l'orignal sans le paniquer.", icon: "shirt", kinds: ["chasse", "clothing"], weight: 0.9, use: "wear", category: "vetement", tags: ["camouflage", "chasse"], stock: 5, maxStock: 15 },
  { id: "venaison", name: "Venaison d'orignal", price: 48, desc: "Gibier des Laurentides.", icon: "leaf", kinds: ["chasse"], weight: 1.4, category: "viande", tags: ["viande", "gibier", "orignal"], harvest: true, stock: 3, maxStock: 10, season: "fall" },
  { id: "fourrure", name: "Fourrure tannée", price: 36, desc: "Peau de meute, cabane à sucre.", icon: "shirt", kinds: ["chasse"], weight: 0.8, category: "vetement", tags: ["fourrure", "artisanat"], harvest: true, stock: 4, maxStock: 12 },
  { id: "queue_castor", name: "Queue de castor", price: 22, desc: "Fumée, tradition des rangs.", icon: "leaf", kinds: ["chasse"], weight: 0.3, category: "divers", tags: ["artisanat", "traditionnel"], harvest: true, stock: 5, maxStock: 15 },

  // ========== OUTILLAGE ==========
  { id: "crochet", name: "Crochet de serrure", price: 85, desc: "Les chambres d'hôtel n'aiment pas ça.", icon: "key", kinds: ["depanneur"], weight: 0.08, use: "tool", category: "outillage", tags: ["outil", "illégal"], legal: false, stock: 3, maxStock: 10 },
  { id: "cle", name: "Clé anglaise", price: 38, desc: "Resserrer le pick-up au garage.", icon: "wrench", kinds: ["depanneur", "quincaillerie"], weight: 0.55, use: "tool", category: "outillage", tags: ["outil", "mécanique"], stock: 8, maxStock: 20 },
  { id: "cle_maison", name: "Clé de maison", price: 0, desc: "Propriétaire. Ouvre toutes les portes.", icon: "key", kinds: [], weight: 0.04, category: "divers", tags: ["accès", "maison"], stock: 100 },
  { id: "double_cle", name: "Double de clés", price: 25, desc: "Famille, coloc, employé. Quincaillerie.", icon: "key", kinds: ["quincaillerie"], weight: 0.04, category: "divers", tags: ["accès", "copie"], stock: 20, maxStock: 50 },

  // ========== ARMES ==========
  { id: "carabine", name: "Carabine de chasse", price: 420, desc: "Prélèvement à plus grande distance.", icon: "crosshair", kinds: ["chasse"], weight: 3.4, use: "tool", category: "arme", tags: ["arme", "chasse"], requiredLicense: "PAL", relatedItems: ["ammo_308"], stock: 5, maxStock: 10, rarity: "uncommon" },
  { id: "shotgun", name: "Fusil à pompe", price: 380, desc: "12 jauge, PAL. Gibier et rangs.", icon: "crosshair", kinds: ["chasse"], weight: 3.6, use: "tool", category: "arme", tags: ["arme", "chasse"], requiredLicense: "PAL", relatedItems: ["ammo_12"], stock: 4, maxStock: 8 },
  { id: "pistol", name: "Pistolet tactique", price: 280, desc: "Courte portée, PAL restreint.", icon: "crosshair", kinds: ["chasse"], weight: 0.95, use: "tool", category: "arme", tags: ["arme", "pistolet"], requiredLicense: "PAL_restreint", relatedItems: ["ammo_9mm"], stock: 3, maxStock: 6 },
  { id: "ar15", name: "Fusil d'assaut", price: 3100, desc: "5,56 — prohibé. Marché noir.", icon: "crosshair", kinds: [], weight: 3.2, use: "tool", category: "arme", tags: ["arme", "illégal"], legal: false, relatedItems: ["ammo_556"], stock: 0, maxStock: 5, rarity: "illegal" },
  { id: "ak74", name: "AK-74", price: 2400, desc: "5,45 × 39 — prohibée au Canada. Marché noir.", icon: "crosshair", kinds: [], weight: 3.3, use: "tool", category: "arme", tags: ["arme", "illégal"], legal: false, relatedItems: ["ammo_545"], stock: 0, maxStock: 3, rarity: "illegal" },
  { id: "glock-19", name: "Glock 19", price: 850, desc: "9 mm, PAL restreinte. Semi-auto.", icon: "crosshair", kinds: ["chasse"], weight: 0.85, use: "tool", category: "arme", tags: ["arme", "pistolet"], requiredLicense: "PAL_restreint", relatedItems: ["ammo_9mm"], stock: 2, maxStock: 5 },
  { id: "revolver-357", name: "Revolver .357", price: 780, desc: "Six coups, PAL restreinte.", icon: "crosshair", kinds: ["chasse"], weight: 1.15, use: "tool", category: "arme", tags: ["arme", "revolver"], requiredLicense: "PAL_restreint", relatedItems: ["ammo_357"], stock: 1, maxStock: 3 },
  { id: "couteau-chasse", name: "Couteau de chasse", price: 45, desc: "Lame fixe, camp et dépeçage.", icon: "axe", kinds: ["chasse"], weight: 0.35, use: "tool", category: "arme", tags: ["outil", "chasse"], stock: 10, maxStock: 25 },

  // ========== MUNITIONS ==========
  { id: "ammo_9mm", name: "Munitions 9 mm", price: 18, desc: "Boîte de 12, pistolet.", icon: "crosshair", kinds: ["chasse"], weight: 0.22, category: "munition", tags: ["munition", "pistolet"], relatedItems: ["pistol", "glock-19"], stock: 20, maxStock: 100 },
  { id: "ammo_357", name: "Munitions .357", price: 28, desc: "Boîte de 6, revolver.", icon: "crosshair", kinds: ["chasse"], weight: 0.24, category: "munition", tags: ["munition", "revolver"], relatedItems: ["revolver-357"], stock: 10, maxStock: 50 },
  { id: "ammo_308", name: "Munitions .308", price: 24, desc: "Boîte de 8, carabine.", icon: "crosshair", kinds: ["chasse"], weight: 0.28, category: "munition", tags: ["munition", "carabine"], relatedItems: ["carabine", "fusil-chasse-12"], stock: 15, maxStock: 80 },
  { id: "ammo_545", name: "Munitions 5,45", price: 36, desc: "Chargeur AK-74. Illégal.", icon: "crosshair", kinds: [], weight: 0.35, category: "munition", tags: ["munition", "illégal"], legal: false, relatedItems: ["ak74"], stock: 0, maxStock: 20 },
  { id: "ammo_12", name: "Cartouches 12 ga", price: 22, desc: "Boîte de 8, pompe.", icon: "crosshair", kinds: ["chasse"], weight: 0.4, category: "munition", tags: ["munition", "fusil"], relatedItems: ["shotgun"], stock: 12, maxStock: 60 },
  { id: "ammo_556", name: "Munitions 5,56", price: 42, desc: "Chargeur d'assaut. Illégal.", icon: "crosshair", kinds: [], weight: 0.38, category: "munition", tags: ["munition", "illégal"], legal: false, relatedItems: ["ar15"], stock: 0, maxStock: 15 },

  // ========== SQDC (Cannabis) ==========
  { id: "weed", name: "Poche cannabis 3,5 g", price: 32, desc: "SQDC, séché, Portneuf. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.04, use: "drug", category: "drogue", tags: ["cannabis", "legal"], restricted: 21, legal: true, stock: 20, maxStock: 50, brand: "SQDC" },
  { id: "fleur_indica", name: "Fleur indica 3,5 g", price: 36, desc: "Relaxant, cultivé sous permis. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.04, use: "drug", category: "drogue", tags: ["cannabis", "indica", "legal"], restricted: 21, legal: true, stock: 15, maxStock: 40, brand: "SQDC" },
  { id: "fleur_sativa", name: "Fleur sativa 3,5 g", price: 36, desc: "Énergie, étiquette SQDC. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.04, use: "drug", category: "drogue", tags: ["cannabis", "sativa", "legal"], restricted: 21, legal: true, stock: 15, maxStock: 40, brand: "SQDC" },
  { id: "huile", name: "Huile 30 ml", price: 48, desc: "Comptoir SQDC, compte-gouttes. 21 ans.", icon: "droplets", kinds: ["sqdc"], weight: 0.08, use: "drug", category: "drogue", tags: ["cannabis", "huile", "legal"], restricted: 21, legal: true, stock: 10, maxStock: 30, brand: "SQDC" },
  { id: "vape", name: "Cartouche vape", price: 42, desc: "510, rechargeable. 21 ans.", icon: "pill", kinds: ["sqdc"], weight: 0.05, use: "drug", category: "drogue", tags: ["cannabis", "vape", "legal"], restricted: 21, legal: true, stock: 12, maxStock: 35, brand: "SQDC" },
  { id: "preroll", name: "Péroulé", price: 8.5, desc: "Un joint, format unique. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.02, use: "drug", category: "drogue", tags: ["cannabis", "preroule", "legal"], restricted: 21, legal: true, stock: 25, maxStock: 80, brand: "SQDC" },
  { id: "gelules", name: "Gélules 10 mg", price: 28, desc: "Boîte de 10, dose marquée. 21 ans.", icon: "pill", kinds: ["sqdc"], weight: 0.06, use: "drug", category: "drogue", tags: ["cannabis", "gelule", "legal"], restricted: 21, legal: true, stock: 15, maxStock: 45, brand: "SQDC" },
  { id: "hash", name: "Hash 2 g", price: 22, desc: "Pressé, légal SQDC. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.02, use: "drug", category: "drogue", tags: ["cannabis", "hash", "legal"], restricted: 21, legal: true, stock: 10, maxStock: 25, brand: "SQDC" },

  // 🆕 FIX BUG : cocaine n'apparaît plus dans les shops "chasse"
  { id: "cocaine", name: "Sachet blanc", price: 180, desc: "Illégal. La SQ n'aime pas ça.", icon: "pill", kinds: [], weight: 0.02, use: "drug", category: "drogue", tags: ["drogue", "illégal"], legal: false, stock: 0, maxStock: 5, rarity: "illegal" },

  // ========== DIVERS ==========
  { id: "identite", name: "Carte d'identité", price: 45, desc: "Photo, comté de Portneuf.", icon: "file", kinds: ["depanneur"], weight: 0.02, category: "divers", tags: ["identité", "document"], stock: 100 },
  { id: "contrat", name: "Contrat notarié", price: 120, desc: "Papier, trombone doré.", icon: "file", kinds: ["depanneur"], weight: 0.08, category: "divers", tags: ["document", "legal"], stock: 50, maxStock: 100 },

  // ========== BIJOUX ==========
  { id: "chaine", name: "Chaîne en or", price: 240, desc: "Mailles épaisses, vitrine Éther.", icon: "gem", kinds: ["clothing"], weight: 0.12, use: "wear", category: "divers", tags: ["bijou", "or"], stock: 3, maxStock: 10, rarity: "uncommon" },
  { id: "bague", name: "Bague chevalière", price: 165, desc: "Or, petite pierre.", icon: "gem", kinds: ["clothing"], weight: 0.03, use: "wear", category: "divers", tags: ["bijou", "or"], stock: 5, maxStock: 15 },
  { id: "montre", name: "Montre bracelet", price: 310, desc: "Cuir, boîtier doré.", icon: "gem", kinds: ["clothing"], weight: 0.08, use: "wear", category: "divers", tags: ["bijou", "montre"], stock: 2, maxStock: 8, rarity: "rare" },

  // ========== OUTILLAGE (Quincaillerie) ==========
  { id: "marteau", name: "Marteau", price: 22, desc: "Chantier du village.", icon: "hammer", kinds: ["quincaillerie"], weight: 0.45, use: "tool", category: "outillage", tags: ["outil", "construction"], stock: 10, maxStock: 25 },
  { id: "pelle", name: "Pelle", price: 28, desc: "Foin et rangs.", icon: "shovel", kinds: ["quincaillerie"], weight: 1.8, use: "tool", category: "outillage", tags: ["outil", "jardin"], stock: 8, maxStock: 20 },
  { id: "rateau", name: "Râteau", price: 20, desc: "Ramasser le rang.", icon: "shovel", kinds: ["quincaillerie"], weight: 1.2, use: "tool", category: "outillage", tags: ["outil", "jardin"], stock: 10, maxStock: 25 },
  { id: "perceuse", name: "Perceuse sans fil", price: 180, desc: "20 V, chantier.", icon: "wrench", kinds: ["quincaillerie"], weight: 1.4, use: "tool", category: "outillage", tags: ["outil", "électrique"], stock: 5, maxStock: 12 },
  { id: "tronconneuse", name: "Tronçonneuse", price: 380, desc: "Bois de chauffage, Laurentides.", icon: "axe", kinds: ["quincaillerie", "chasse"], weight: 4.6, use: "tool", category: "outillage", tags: ["outil", "bois"], stock: 3, maxStock: 8 },
  { id: "casque", name: "Casque CSA", price: 25, desc: "Obligatoire sur le chantier.", icon: "hardhat", kinds: ["quincaillerie"], weight: 0.4, use: "wear", category: "vetement", tags: ["sécurité", "chantier"], stock: 12, maxStock: 30 },
  { id: "gilet", name: "Gilet haute visibilité", price: 18, desc: "Bandes réfléchissantes.", icon: "vest", kinds: ["quincaillerie"], weight: 0.3, use: "wear", category: "vetement", tags: ["sécurité", "chantier"], stock: 15, maxStock: 40 },
  { id: "boite", name: "Boîte à outils", price: 65, desc: "Plateau, loquet rouge.", icon: "wrench", kinds: ["quincaillerie"], weight: 2.8, use: "tool", category: "outillage", tags: ["outil", "boîte"], stock: 4, maxStock: 10 },

  // ========== SACS ==========
  { id: "sac", name: "Sac urbain", price: 89, desc: "Nylon noir, 30 kg.", icon: "backpack", kinds: ["clothing"], weight: 1.1, use: "wear", category: "vetement", tags: ["sac", "urbain"], stock: 8, maxStock: 20 },
  { id: "sac_rouge", name: "Sac cordura rouge", price: 96, desc: "Portneuf, 30 kg.", icon: "backpack", kinds: ["clothing"], weight: 1.15, use: "wear", category: "vetement", tags: ["sac", "robuste"], stock: 6, maxStock: 15 },
  { id: "sac_rando", name: "Sac de rando", price: 145, desc: "Laurentides, 38 kg, duvet.", icon: "backpack", kinds: ["clothing", "chasse"], weight: 1.6, use: "wear", category: "vetement", tags: ["sac", "randonnée"], stock: 4, maxStock: 10 },

  // ========== PRODUITS AGRICOLES ==========
  { id: "papier", name: "Rouleau de papier", price: 42, desc: "Sorti de la machine, Donnacona.", icon: "newspaper", kinds: ["depanneur"], weight: 2.2, category: "divers", tags: ["papier", "hygiène"], stock: 10, maxStock: 30 },
  { id: "graines_mais", name: "Semence de maïs", price: 6, desc: "Rangs du Chemin du Roy.", icon: "leaf", kinds: ["quincaillerie", "depanneur"], weight: 0.2, use: "seed", category: "legume", tags: ["agriculture", "maïs"], stock: 15, maxStock: 50 },
  { id: "graines_ble", name: "Semence de blé", price: 5, desc: "Plaine agricole de Portneuf.", icon: "leaf", kinds: ["quincaillerie"], weight: 0.18, use: "seed", category: "legume", tags: ["agriculture", "blé"], stock: 20, maxStock: 60 },
  { id: "graines_foin", name: "Semence de foin", price: 4, desc: "Prairie, première coupe.", icon: "leaf", kinds: ["quincaillerie"], weight: 0.16, use: "seed", category: "legume", tags: ["agriculture", "foin"], stock: 25, maxStock: 80 },
  { id: "graines_patate", name: "Plants de patates", price: 7, desc: "Variété des rangs.", icon: "leaf", kinds: ["quincaillerie", "depanneur"], weight: 0.4, use: "seed", category: "legume", tags: ["agriculture", "patate"], stock: 10, maxStock: 30 },

  // 🆕 FIX BUG : graines de cannabis retirées des shops légitimes
  { id: "graines_cannabis", name: "Graines de cannabis", price: 48, desc: "Culture interdite au Québec. Saisie SQ.", icon: "pill", kinds: [], weight: 0.05, use: "seed", category: "legume", tags: ["illégal", "culture"], legal: false, stock: 0, maxStock: 5, rarity: "illegal" },

  // ========== PRODUITS DE LA FERME ==========
  { id: "mais", name: "Épis de maïs", price: 8, desc: "Récolte du rang.", icon: "leaf", kinds: ["depanneur", "food"], weight: 0.8, use: "eat", hunger: 22, category: "legume", tags: ["agriculture", "maïs"], harvest: true, stock: 10, maxStock: 30 },
  { id: "ble", name: "Sac de blé", price: 11, desc: "Grain, moulin du comté.", icon: "leaf", kinds: ["depanneur"], weight: 1.2, category: "legume", tags: ["agriculture", "blé"], harvest: true, stock: 8, maxStock: 25 },
  { id: "foin", name: "Balle de foin", price: 6, desc: "Première coupe.", icon: "leaf", kinds: ["depanneur"], weight: 1.6, category: "legume", tags: ["agriculture", "foin"], harvest: true, stock: 5, maxStock: 20 },
  { id: "patate", name: "Patates du rang", price: 5, desc: "Sac de 5 kg.", icon: "leaf", kinds: ["depanneur", "food"], weight: 1.1, use: "eat", hunger: 18, category: "legume", tags: ["agriculture", "patate"], harvest: true, stock: 12, maxStock: 40 },
  { id: "lait_rang", name: "Bidon de lait 4 L", price: 7, desc: "Holstein du Chemin du Roy, cru.", icon: "cup", kinds: ["depanneur"], weight: 4.1, use: "drink", thirst: 30, category: "produit_laitier", tags: ["lait", "ferme"], harvest: true, stock: 5, maxStock: 15 },
  { id: "oeufs", name: "Boîte d'œufs", price: 6, desc: "Poulailler du rang, la douzaine.", icon: "cookie", kinds: ["depanneur", "food"], weight: 0.7, use: "eat", hunger: 16, category: "produit_laitier", tags: ["œufs", "ferme"], harvest: true, stock: 8, maxStock: 25 },
  { id: "eau_erable", name: "Seau d'eau d'érable", price: 3, desc: "Coulée, 20 L. Quatre seaux pour un sirop.", icon: "droplets", kinds: [], weight: 2.2, category: "divers", tags: ["erable", "production"], harvest: true, stock: 10, maxStock: 30 },

  // ========== OBJETS RARES (Harvest) ==========
  { id: "lingot", name: "Lingot d'or", price: 420, desc: "Trouvé au bord du Chemin du Roy.", icon: "gem", kinds: [], weight: 0.9, category: "divers", tags: ["rare", "or"], harvest: true, stock: 0, maxStock: 3, rarity: "legendary" },
  { id: "cristal_ether", name: "Cristal d'éther", price: 260, desc: "Pierre bleue, chaud au toucher.", icon: "gem", kinds: [], weight: 0.35, category: "divers", tags: ["rare", "magique"], harvest: true, stock: 0, maxStock: 2, rarity: "epic" },
  { id: "fiole_ether", name: "Fiole magique", price: 180, desc: "Liquide violet, sent le pin.", icon: "pill", kinds: [], weight: 0.22, category: "divers", tags: ["rare", "magique"], harvest: true, stock: 0, maxStock: 5, rarity: "rare" },
  { id: "pepite", name: "Pépite rare", price: 310, desc: "Or des Laurentides.", icon: "gem", kinds: [], weight: 0.4, category: "divers", tags: ["rare", "or"], harvest: true, stock: 0, maxStock: 4, rarity: "legendary" },
  { id: "medaille_sq", name: "Médaille SQ", price: 90, desc: "Insigne oublié près du poste.", icon: "key", kinds: [], weight: 0.08, category: "divers", tags: ["rare", "souvenir"], harvest: true, stock: 0, maxStock: 2, rarity: "uncommon" },
  { id: "cle_rouillee", name: "Clé rouillée", price: 40, desc: "Coffre ou cabanon, qui sait.", icon: "key", kinds: [], weight: 0.06, category: "divers", tags: ["rare", "mystère"], harvest: true, stock: 0, maxStock: 10, rarity: "common" },
];

// ==========================================
// 🏪 4. EMPLACEMENTS DES MAGASINS (Données)
// ==========================================

/** Liste des magasins dans le monde */
export const LANDMARK_SHOPS: ShopSpot[] = [
  { id: "shop_tiguy", name: "Chez Ti-Guy", villageId: "portneuf", kind: "food", x: A40_EXITS[3]!.x + 28, z: 38, yaw: Math.PI, hours: "11 h – 23 h", openFrom: 11, openTo: 23 },
  { id: "shop_ether", name: "Boutique Éther", villageId: "pont_rouge", kind: "clothing", x: 1088, z: -320, yaw: Math.PI, hours: "9 h – 21 h", openFrom: 9, openTo: 21 },
  { id: "shop_chasse", name: "Chasse & Pêche", villageId: "saint_raymond", kind: "chasse", x: 1000, z: -620, yaw: 0.55, hours: "10 h – 18 h", openFrom: 10, openTo: 18 },
  { id: "shop_quincaillerie", name: "Quincaillerie Gosselin", villageId: "portneuf", kind: "quincaillerie", x: A40_EXITS[3]!.x - 72, z: 44, yaw: Math.PI, hours: "7 h – 18 h", openFrom: 7, openTo: 18 },
  { id: "shop_sqdc_portneuf", name: "SQDC Portneuf", villageId: "portneuf", kind: "sqdc", x: A40_EXITS[3]!.x + 108, z: 32, yaw: Math.PI, hours: "10 h – 21 h", openFrom: 10, openTo: 21, restricted: 21 },
  { id: "shop_sqdc_donnacona", name: "SQDC Donnacona", villageId: "donnacona", kind: "sqdc", x: A40_EXITS[5]!.x - 24, z: 42, yaw: Math.PI, hours: "10 h – 21 h", openFrom: 10, openTo: 21, restricted: 21 },
  { id: "shop_sqdc_raymond", name: "SQDC Saint-Raymond", villageId: "saint_raymond", kind: "sqdc", x: 940, z: -548, yaw: 0.55, hours: "10 h – 21 h", openFrom: 10, openTo: 21, restricted: 21 },
];

// ==========================================
// 🔍 5. FONCTIONS UTILITAIRES
// ==========================================

const itemCache = new Map<string, ShopItem>();

export function itemById(id: string): ShopItem | undefined {
  if (itemCache.has(id)) return itemCache.get(id);
  const item = CATALOG.find((t) => t.id === id);
  if (item) itemCache.set(id, item);
  return item;
}

export function catalogFor(kind: ShopKind): ShopItem[] {
  return CATALOG.filter((t) => t.kinds.includes(kind) && !t.harvest && t.legal !== false);
}

export function harvestableItems(): ShopItem[] {
  return CATALOG.filter((t) => t.harvest);
}

export function catalogByCategory(category: ItemCategory): ShopItem[] {
  return CATALOG.filter((t) => t.category === category);
}

export function catalogByTag(tag: string): ShopItem[] {
  return CATALOG.filter((t) => t.tags?.includes(tag));
}

export function discountedItems(): ShopItem[] {
  return CATALOG.filter((t) => t.discount && t.discount > 0);
}

export function seasonalItems(season: "winter" | "spring" | "summer" | "fall"): ShopItem[] {
  return CATALOG.filter((t) => t.seasonal && t.season === season);
}

export function rareItems(minRarity: Rarity = "rare"): ShopItem[] {
  const rarityOrder: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "illegal"];
  const minIndex = rarityOrder.indexOf(minRarity);
  return CATALOG.filter((t) => t.rarity && rarityOrder.indexOf(t.rarity) >= minIndex);
}

export function sellPrice(item: ShopItem): number {
  return Math.max(1, Math.round(item.price * 0.6 * 100) / 100);
}

export function getFinalPrice(item: ShopItem, promotions: Promotion[] = []): number {
  let finalPrice = item.price;
  if (item.discount) finalPrice *= (1 - item.discount);
  for (const promo of promotions) {
    if (!promo.active) continue;
    if (promo.itemIds?.includes(item.id)) {
      finalPrice -= promo.discountFixed || finalPrice * (promo.discountPercent / 100);
    } else if (promo.category === item.category) {
      finalPrice -= promo.discountFixed || finalPrice * (promo.discountPercent / 100);
    }
  }
  return Math.max(0.01, Math.round(finalPrice * 100) / 100);
}

export function bagGroup(item: ShopItem): Exclude<BagGroup, "all"> {
  if (item.harvest || item.id.startsWith("ammo_")) return "hunt";
  const weapon = getWeapon(item.id);
  if (weapon && (weapon.category === "poing" || weapon.category === "fusil_chasse")) return "hunt";
  if (weapon) return "gear";
  if (item.use === "drug" || item.icon === "gem" || item.icon === "file") return "loot";
  if (item.use === "eat" || item.use === "drink") return "food";
  if (item.use === "tool" || item.use === "fuel") return "gear";
  if (item.use === "wear") return "wear";
  if (item.kinds.includes("chasse")) return "hunt";
  return "gear";
}

export function ammoFor(id: string | null | undefined): string | null {
  if (!id) return null;
  return weaponAmmo[id] ?? null;
}

export function harvestRange(id: string | null | undefined): number {
  if (!id) return 0;
  return weaponHarvestRange(id);
}

export function bagCapacity(packId: string | null): number {
  return BAG_CAPACITIES[packId || "default"] || BAG_MAX_KG;
}

export function bagWeight(inv: Record<string, number>): number {
  let w = 0;
  for (const [id, n] of Object.entries(inv)) {
    if (n <= 0) continue;
    w += (itemById(id)?.weight ?? 0.4) * n;
  }
  return Math.round(w * 10) / 10;
}

export function bagValue(inv: Record<string, number>): number {
  let t = 0;
  for (const [id, n] of Object.entries(inv)) {
    if (n <= 0) continue;
    const item = itemById(id);
    if (item) t += sellPrice(item) * n;
  }
  return Math.round(t * 100) / 100;
}

export function cartCount(cart: Record<string, number>): number {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

export function cartLines(cart: Record<string, number>) {
  return Object.entries(cart)
    .filter(([, n]) => n > 0)
    .map(([id, qty]) => ({ item: itemById(id), qty }))
    .filter((row): row is { item: ShopItem; qty: number } => Boolean(row.item));
}

export function cartTotals(
  cart: Record<string, number>,
  promotions: Promotion[] = []
): {
  lines: { item: ShopItem; qty: number }[];
  count: number;
  subtotal: number;
  tax: number;
  total: number;
  weight: number;
} {
  const lines = cartLines(cart);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = Math.round(lines.reduce((a, l) => a + getFinalPrice(l.item, promotions) * l.qty, 0) * 100) / 100;
  const tax = Math.round(subtotal * QUEBEC_TAX_RATE * 100) / 100;
  return {
    lines, count, subtotal, tax,
    total: Math.round((subtotal + tax) * 100) / 100,
    weight: Math.round(lines.reduce((a, l) => a + l.item.weight * l.qty, 0) * 100) / 100,
  };
}

export function formatCad(n: number): string {
  return `${n.toLocaleString("fr-CA", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}\u00a0$`;
}

export function shopNameFor(v: VillageDef): string {
  const shopNames: Record<string, string> = {
    portneuf: "Dépanneur Le Beau-Soir", pont_rouge: "Dépanneur du Pont",
    saint_alban: "Dépanneur de l'Éboulis", saint_casimir: "Chez Gaston — comptoir",
    saint_raymond: "Dépanneur Bras-du-Nord", cap_sante: "Dépanneur du Cap",
    donnacona: "Dépanneur des Érables", neuville: "Dépanneur des Écureuils",
    grondines: "Dépanneur du Roy", saint_basile: "Dépanneur du Rang",
    saint_marc: "Dépanneur de la Carrière",
  };
  return shopNames[v.id] || `Dépanneur ${v.name}`;
}

export function depanneurOffset(v: VillageDef): { x: number; z: number; yaw: number } {
  return villageCivicSpot(v, "shop");
}

// ==========================================
// 🛒 6. CLASSE SHOP (v2.0 — corrigée)
// ==========================================

export class Shop {
  id: string;
  name: string;
  villageId: string;
  kind: ShopKind;
  x: number;
  z: number;
  yaw: number;
  hours: string;
  openFrom: number;
  openTo: number;
  isOpen: boolean;
  ownerId?: string;
  employees: string[] = [];
  capacity: number = 10;
  reputation: number = 100;
  inventory: Map<ShopItemId, number> = new Map();
  maxInventory: Map<ShopItemId, number> = new Map();
  restockThresholds: Map<ShopItemId, number> = new Map();
  restockAmounts: Map<ShopItemId, number> = new Map();
  promotions: Promotion[] = [];
  transactions: Transaction[] = [];
  revenueToday: number = 0;
  revenueThisWeek: number = 0;
  revenueThisMonth: number = 0;
  lastRestock: number = 0;
  lastTransactionId: number = 0;

  // 🆕 v2 — providers injectables
  private walletProvider: WalletProvider | null = null;
  private ageProvider: AgeProvider | null = null;
  private licenseProvider: LicenseProvider | null = null;
  private bagProvider: BagProvider | null = null;

  // 🆕 v2 — events
  private shopListeners = {
    transaction: new Set<(tx: Transaction) => void>(),
    stockUpdate: new Set<(itemId: string, newStock: number) => void>(),
    restock: new Set<() => void>(),
    outOfStock: new Set<(itemId: string) => void>(),
  };

  constructor(spot: ShopSpot) {
    this.id = spot.id;
    this.name = spot.name;
    this.villageId = spot.villageId;
    this.kind = spot.kind;
    this.x = spot.x;
    this.z = spot.z;
    this.yaw = spot.yaw;
    this.hours = spot.hours;
    this.openFrom = spot.openFrom ?? DEFAULT_SHOP_HOURS[spot.kind].open;
    this.openTo = spot.openTo ?? DEFAULT_SHOP_HOURS[spot.kind].close;
    this.isOpen = this.isOpenNow();
    this.capacity = spot.capacity ?? this.capacity;
    this.reputation = spot.reputation ?? this.reputation;
    this.ownerId = spot.ownerId;
    this.initializeInventory();
  }

  /** 🆕 v2 — inject providers */
  setProviders(opts: {
    wallet?: WalletProvider;
    age?: AgeProvider;
    license?: LicenseProvider;
    bag?: BagProvider;
  }): void {
    if (opts.wallet) this.walletProvider = opts.wallet;
    if (opts.age) this.ageProvider = opts.age;
    if (opts.license) this.licenseProvider = opts.license;
    if (opts.bag) this.bagProvider = opts.bag;
  }

  /** 🆕 v2 — events */
  onTransaction(cb: (tx: Transaction) => void): () => void {
    this.shopListeners.transaction.add(cb);
    return () => this.shopListeners.transaction.delete(cb);
  }
  onStockUpdate(cb: (itemId: string, newStock: number) => void): () => void {
    this.shopListeners.stockUpdate.add(cb);
    return () => this.shopListeners.stockUpdate.delete(cb);
  }
  onOutOfStock(cb: (itemId: string) => void): () => void {
    this.shopListeners.outOfStock.add(cb);
    return () => this.shopListeners.outOfStock.delete(cb);
  }
  onRestock(cb: () => void): () => void {
    this.shopListeners.restock.add(cb);
    return () => this.shopListeners.restock.delete(cb);
  }

  /** 🆕 v2 — FIX : items illégaux exclus, stock 0 respecté */
  private initializeInventory(): void {
    const catalog = catalogFor(this.kind);
    for (const item of catalog) {
      // Skip items illégaux dans les shops légitimes
      if (item.legal === false) continue;

      const initialStock = item.stock === 0
        ? 0
        : Math.floor((item.maxStock ?? 10) * 0.5);

      this.inventory.set(item.id, initialStock);
      this.maxInventory.set(item.id, item.maxStock ?? 10);
      this.restockThresholds.set(item.id, item.restockThreshold ?? 3);
      this.restockAmounts.set(item.id, item.restockAmount ?? 5);
    }
  }

  isOpenNow(hour: number = new Date().getHours()): boolean {
    if (this.kind === "station_service") return true;
    return hour >= this.openFrom && hour < this.openTo;
  }

  open(): void { this.isOpen = true; }
  close(): void { this.isOpen = false; }

  tick(): void {
    this.isOpen = this.isOpenNow();
    this.checkRestock();
  }

  /** 🆕 v2 — FIX : pas de restock des items à stock 0 par défaut (illégaux) */
  private checkRestock(): void {
    const now = Date.now();
    if (now - this.lastRestock < 6 * 60 * 60 * 1000) return;

    let anyRestock = false;
    for (const [itemId, quantity] of this.inventory) {
      const item = itemById(itemId);
      // Skip items illégaux ou à stock 0 volontaire
      if (!item || item.legal === false || item.stock === 0) continue;

      const max = this.maxInventory.get(itemId) ?? 10;
      const threshold = this.restockThresholds.get(itemId) ?? 3;
      const restockAmount = this.restockAmounts.get(itemId) ?? 5;

      if (quantity <= threshold && quantity < max) {
        const newQuantity = Math.min(max, quantity + restockAmount);
        this.inventory.set(itemId, newQuantity);
        anyRestock = true;
      }
    }

    this.lastRestock = now;
    if (anyRestock) {
      for (const cb of this.shopListeners.restock) {
        try { cb(); } catch { /* noop */ }
      }
    }
  }

  getStock(itemId: ShopItemId): number {
    return this.inventory.get(itemId) ?? 0;
  }

  hasStock(itemId: ShopItemId, quantity: number = 1): boolean {
    return this.getStock(itemId) >= quantity;
  }

  getItemPrice(itemId: ShopItemId): number | null {
    const item = itemById(itemId);
    if (!item || !this.inventory.has(itemId)) return null;
    return getFinalPrice(item, this.promotions);
  }

  /**
   * 🆕 v2 — Purchase avec débit réel + validations + events
   * @param opts.skipPayment - Si true, ne débite pas (utilisé par ShopManager.checkout)
   * @param opts.skipWeightCheck - Si true, ne vérifie pas le poids (admin)
   */
  purchase(
    itemId: ShopItemId,
    quantity: number = 1,
    customerId: string,
    paymentMethod: "cash" | "card" | "loyalty_points" | "bank_transfer" = "cash",
    opts?: { skipPayment?: boolean; skipWeightCheck?: boolean },
  ): Transaction | null {
    if (!this.isOpen) return null;

    const item = itemById(itemId);
    if (!item) return null;
    if (!this.inventory.has(itemId)) return null;
    if (!this.hasStock(itemId, quantity)) return null;

    // Vérification âge
    if (item.restricted && this.ageProvider) {
      const age = this.ageProvider.getAge(customerId);
      if (age < item.restricted) {
        console.log(`[Shop ${this.id}] Âge insuffisant pour ${itemId} (${age} < ${item.restricted})`);
        return null;
      }
    }

    // Vérification licence
    if (item.requiredLicense && this.licenseProvider) {
      if (!this.licenseProvider.hasLicense(customerId, item.requiredLicense)) {
        console.log(`[Shop ${this.id}] Licence "${item.requiredLicense}" manquante pour ${itemId}`);
        return null;
      }
    }

    // Vérification poids
    if (this.bagProvider && !opts?.skipWeightCheck) {
      const currentWeight = this.bagProvider.getBagWeight(customerId);
      const capacity = this.bagProvider.getBagCapacity(customerId);
      const addedWeight = item.weight * quantity;
      if (currentWeight + addedWeight > capacity) {
        console.log(`[Shop ${this.id}] Poids insuffisant (${currentWeight + addedWeight} > ${capacity})`);
        return null;
      }
    }

    const unitPrice = this.getItemPrice(itemId) ?? item.price;
    const subtotal = Math.round(unitPrice * quantity * 100) / 100;
    const tax = Math.round(subtotal * QUEBEC_TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // Débit (sauf si ShopManager l'a déjà fait)
    if (!opts?.skipPayment && this.walletProvider) {
      const balance = this.walletProvider.getBalance(customerId);
      if (balance < total) {
        console.log(`[Shop ${this.id}] Fonds insuffisants (${balance} < ${total})`);
        return null;
      }
      const ok = this.walletProvider.withdraw(customerId, total, `Achat ${this.id} ${itemId}`);
      if (!ok) return null;
    }

    // Décrémente le stock
    const currentStock = this.inventory.get(itemId) ?? 0;
    const newStock = currentStock - quantity;
    this.inventory.set(itemId, newStock);

    // Revenus
    this.revenueToday += total;
    this.revenueThisWeek += total;
    this.revenueThisMonth += total;

    // Transaction
    const transaction: Transaction = {
      id: `txn_${this.id}_${++this.lastTransactionId}_${Date.now()}`,
      type: "purchase",
      shopId: this.id,
      customerId,
      items: [{ itemId, quantity, unitPrice }],
      subtotal,
      taxes: tax,
      total,
      paymentMethod,
      timestamp: Date.now(),
      status: "completed",
    };
    this.transactions.push(transaction);

    // Events
    for (const cb of this.shopListeners.transaction) {
      try { cb(transaction); } catch { /* noop */ }
    }
    for (const cb of this.shopListeners.stockUpdate) {
      try { cb(itemId, newStock); } catch { /* noop */ }
    }
    if (newStock === 0) {
      for (const cb of this.shopListeners.outOfStock) {
        try { cb(itemId); } catch { /* noop */ }
      }
    }

    return transaction;
  }

  /**
   * 🆕 v2 — Sell avec crédit réel
   */
  sell(
    itemId: ShopItemId,
    quantity: number = 1,
    customerId: string,
    opts?: { skipPayment?: boolean },
  ): Transaction | null {
    if (!this.isOpen) return null;

    const item = itemById(itemId);
    if (!item) return null;

    const unitPrice = sellPrice(item);
    const total = Math.round(unitPrice * quantity * 100) / 100;

    // Crédit (sauf si ShopManager l'a déjà fait)
    if (!opts?.skipPayment && this.walletProvider) {
      const ok = this.walletProvider.deposit(customerId, total, `Revente ${this.id} ${itemId}`);
      if (!ok) return null;
    }

    // Ajoute le stock
    const currentStock = this.inventory.get(itemId) ?? 0;
    const maxStock = this.maxInventory.get(itemId) ?? 10;
    const newStock = Math.min(maxStock, currentStock + quantity);
    this.inventory.set(itemId, newStock);

    // Marge 50%
    const margin = total * 0.5;
    this.revenueToday += margin;
    this.revenueThisWeek += margin;
    this.revenueThisMonth += margin;

    const transaction: Transaction = {
      id: `txn_${this.id}_${++this.lastTransactionId}_${Date.now()}`,
      type: "sale",
      shopId: this.id,
      customerId,
      items: [{ itemId, quantity, unitPrice }],
      subtotal: total,
      taxes: 0,
      total,
      paymentMethod: "cash",
      timestamp: Date.now(),
      status: "completed",
    };
    this.transactions.push(transaction);

    for (const cb of this.shopListeners.transaction) {
      try { cb(transaction); } catch { /* noop */ }
    }

    return transaction;
  }

  addPromotion(promotion: Promotion): void { this.promotions.push(promotion); }
  removePromotion(promotionId: string): void {
    this.promotions = this.promotions.filter((p) => p.id !== promotionId);
  }

  getActivePromotions(): Promotion[] {
    const now = Date.now();
    return this.promotions.filter((p) => p.active && p.startDate <= now && p.endDate >= now);
  }

  getPromotionalItems(): { item: ShopItem; finalPrice: number }[] {
    const activePromos = this.getActivePromotions();
    const out: { item: ShopItem; finalPrice: number }[] = [];
    for (const item of catalogFor(this.kind)) {
      const finalPrice = getFinalPrice(item, activePromos);
      if (finalPrice < item.price) out.push({ item, finalPrice });
    }
    return out;
  }

  getState(): ShopState {
    return {
      id: this.id, isOpen: this.isOpen, currentCustomers: 0,
      revenueToday: this.revenueToday, revenueThisWeek: this.revenueThisWeek,
      revenueThisMonth: this.revenueThisMonth, lastRestock: this.lastRestock,
    };
  }

  restockItem(itemId: ShopItemId, quantity: number): void {
    const currentStock = this.inventory.get(itemId) ?? 0;
    const maxStock = this.maxInventory.get(itemId) ?? 10;
    const newStock = Math.min(maxStock, currentStock + quantity);
    this.inventory.set(itemId, newStock);
    this.lastRestock = Date.now();
    for (const cb of this.shopListeners.stockUpdate) {
      try { cb(itemId, newStock); } catch { /* noop */ }
    }
  }

  restockAll(): void {
    for (const [itemId, quantity] of this.inventory) {
      const item = itemById(itemId);
      if (!item || item.legal === false || item.stock === 0) continue;
      const maxStock = this.maxInventory.get(itemId) ?? 10;
      const restockAmount = this.restockAmounts.get(itemId) ?? 5;
      const newStock = Math.min(maxStock, quantity + restockAmount);
      this.inventory.set(itemId, newStock);
    }
    this.lastRestock = Date.now();
    for (const cb of this.shopListeners.restock) {
      try { cb(); } catch { /* noop */ }
    }
  }
}

// ==========================================
// 🛒 7. CLASSE CART
// ==========================================

export class Cart {
  items: Record<ShopItemId, number> = {};
  shopId?: string;
  customerId?: string;
  createdAt: number;

  constructor(shopId?: string, customerId?: string) {
    this.shopId = shopId;
    this.customerId = customerId;
    this.createdAt = Date.now();
  }

  addItem(itemId: ShopItemId, quantity: number = 1): void {
    if (quantity <= 0) return;
    this.items[itemId] = (this.items[itemId] || 0) + quantity;
  }

  removeItem(itemId: ShopItemId, quantity: number = 1): void {
    if (quantity <= 0) return;
    const currentQty = this.items[itemId] || 0;
    if (currentQty <= quantity) delete this.items[itemId];
    else this.items[itemId] = currentQty - quantity;
  }

  clear(): void { this.items = {}; }
  getCount(): number { return cartCount(this.items); }
  getWeight(): number { return bagWeight(this.items); }
  getValue(): number { return bagValue(this.items); }
  isEmpty(): boolean { return this.getCount() === 0; }

  export(): { items: Record<ShopItemId, number>; shopId?: string; customerId?: string } {
    return { items: { ...this.items }, shopId: this.shopId, customerId: this.customerId };
  }

  import(data: { items: Record<ShopItemId, number>; shopId?: string; customerId?: string }): void {
    this.items = { ...data.items };
    this.shopId = data.shopId;
    this.customerId = data.customerId;
    this.createdAt = Date.now();
  }
}

// ==========================================
// 📊 8. CLASSE PROMOTION MANAGER
// ==========================================

export class PromotionManager {
  private promotions: Promotion[] = [];
  private lastPromotionId: number = 0;

  addPromotion(promotion: Omit<Promotion, "id" | "active">): string {
    const id = `promo_${++this.lastPromotionId}_${Date.now()}`;
    const newPromotion: Promotion = { id, active: true, ...promotion };
    this.promotions.push(newPromotion);
    return id;
  }

  removePromotion(promotionId: string): boolean {
    const index = this.promotions.findIndex((p) => p.id === promotionId);
    if (index !== -1) { this.promotions.splice(index, 1); return true; }
    return false;
  }

  activatePromotion(promotionId: string): void {
    const p = this.promotions.find((x) => x.id === promotionId);
    if (p) p.active = true;
  }

  deactivatePromotion(promotionId: string): void {
    const p = this.promotions.find((x) => x.id === promotionId);
    if (p) p.active = false;
  }

  getActivePromotions(): Promotion[] {
    const now = Date.now();
    return this.promotions.filter((p) => p.active && p.startDate <= now && p.endDate >= now);
  }

  getPromotionsForShop(shopId: string): Promotion[] {
    return this.getActivePromotions().filter((p) => p.shopId === shopId);
  }

  getPromotionsForItem(itemId: ShopItemId): Promotion[] {
    return this.getActivePromotions().filter((p) => p.itemIds?.includes(itemId));
  }

  getPromotionsForCategory(category: ItemCategory): Promotion[] {
    return this.getActivePromotions().filter((p) => p.category === category);
  }

  cleanup(): void {
    const now = Date.now();
    this.promotions = this.promotions.filter((p) => p.endDate >= now);
  }
}

export const promotionManager = new PromotionManager();

// ==========================================
// 🏪 9. CLASSE SHOP MANAGER (v2.0 — atomique)
// ==========================================

export class ShopManager {
  private shops: Map<string, Shop> = new Map();
  private carts: Map<string, Cart> = new Map();
  private transactions: Transaction[] = [];
  private lastTransactionId: number = 0;

  // 🆕 v2 — providers
  private walletProvider: WalletProvider | null = null;
  private ageProvider: AgeProvider | null = null;
  private licenseProvider: LicenseProvider | null = null;
  private bagProvider: BagProvider | null = null;

  // 🆕 v2 — events
  private managerListeners = {
    checkout: new Set<(tx: Transaction) => void>(),
    sale: new Set<(tx: Transaction) => void>(),
  };

  constructor() {
    for (const shopSpot of LANDMARK_SHOPS) {
      const shop = new Shop(shopSpot);
      this.shops.set(shop.id, shop);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  🆕 v2 — PROVIDERS
  // ═════════════════════════════════════════════════════════════════════════

  setWalletProvider(p: WalletProvider): void {
    this.walletProvider = p;
    for (const shop of this.shops.values()) shop.setProviders({ wallet: p });
  }

  setAgeProvider(p: AgeProvider): void {
    this.ageProvider = p;
    for (const shop of this.shops.values()) shop.setProviders({ age: p });
  }

  setLicenseProvider(p: LicenseProvider): void {
    this.licenseProvider = p;
    for (const shop of this.shops.values()) shop.setProviders({ license: p });
  }

  setBagProvider(p: BagProvider): void {
    this.bagProvider = p;
    for (const shop of this.shops.values()) shop.setProviders({ bag: p });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  🆕 v2 — EVENTS
  // ═════════════════════════════════════════════════════════════════════════

  onCheckout(cb: (tx: Transaction) => void): () => void {
    this.managerListeners.checkout.add(cb);
    return () => this.managerListeners.checkout.delete(cb);
  }

  onSale(cb: (tx: Transaction) => void): () => void {
    this.managerListeners.sale.add(cb);
    return () => this.managerListeners.sale.delete(cb);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  ACCESSEURS
  // ═════════════════════════════════════════════════════════════════════════

  getShop(shopId: string): Shop | undefined { return this.shops.get(shopId); }
  getAllShops(): Shop[] { return [...this.shops.values()]; }

  getShopsByKind(kind: ShopKind): Shop[] {
    return [...this.shops.values()].filter((s) => s.kind === kind);
  }

  getShopsInVillage(villageId: string): Shop[] {
    return [...this.shops.values()].filter((s) => s.villageId === villageId);
  }

  getNearestShop(x: number, z: number, kind?: ShopKind): Shop | undefined {
    let nearest: Shop | undefined;
    let minDist = Infinity;
    for (const shop of this.shops.values()) {
      if (kind && shop.kind !== kind) continue;
      const d = Math.sqrt((shop.x - x) ** 2 + (shop.z - z) ** 2);
      if (d < minDist) { minDist = d; nearest = shop; }
    }
    return nearest;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  CART MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════

  getCart(customerId: string): Cart | undefined { return this.carts.get(customerId); }

  createCart(customerId: string, shopId?: string): Cart {
    const cart = new Cart(shopId, customerId);
    this.carts.set(customerId, cart);
    return cart;
  }

  deleteCart(customerId: string): void { this.carts.delete(customerId); }

  /** 🆕 v2 — Ajout panier avec vérif stock robuste */
  addToCart(customerId: string, itemId: ShopItemId, quantity: number = 1): boolean {
    let cart = this.getCart(customerId);
    if (!cart) {
      cart = this.createCart(customerId);
    }

    // Vérifie le stock si le panier est attaché à un shop
    if (cart.shopId) {
      const shop = this.getShop(cart.shopId);
      if (shop) {
        const currentInCart = cart.items[itemId] ?? 0;
        if (!shop.hasStock(itemId, currentInCart + quantity)) {
          console.log(`[ShopManager] Stock insuffisant pour ${itemId} dans ${cart.shopId}.`);
          return false;
        }
      }
    }

    cart.addItem(itemId, quantity);
    return true;
  }

  removeFromCart(customerId: string, itemId: ShopItemId, quantity: number = 1): void {
    const cart = this.getCart(customerId);
    if (cart) cart.removeItem(itemId, quantity);
  }

  clearCart(customerId: string): void {
    const cart = this.getCart(customerId);
    if (cart) cart.clear();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  🆕 v2 — CHECKOUT ATOMIQUE avec rollback
  // ═════════════════════════════════════════════════════════════════════════

  checkout(
    customerId: string,
    paymentMethod: "cash" | "card" | "loyalty_points" | "bank_transfer" = "cash",
  ): Transaction | null {
    const cart = this.getCart(customerId);
    if (!cart || cart.isEmpty()) {
      console.log(`[ShopManager] Panier vide pour ${customerId}.`);
      return null;
    }

    const shopId = cart.shopId;
    if (!shopId) {
      console.log(`[ShopManager] Aucun magasin associé au panier.`);
      return null;
    }

    const shop = this.getShop(shopId);
    if (!shop || !shop.isOpen) {
      console.log(`[ShopManager] Magasin ${shopId} fermé ou introuvable.`);
      return null;
    }

    // 1) Vérif stock pour TOUS les items
    const items = Object.entries(cart.items).filter(([, q]) => q > 0);
    for (const [itemId, qty] of items) {
      if (!shop.hasStock(itemId, qty)) {
        console.log(`[ShopManager] Stock insuffisant pour ${itemId}.`);
        return null;
      }
    }

    // 2) Calcul total
    const activePromos = shop.getActivePromotions();
    const totals = cartTotals(cart.items, activePromos);

    // 3) Vérif wallet
    if (this.walletProvider) {
      const balance = this.walletProvider.getBalance(customerId);
      if (balance < totals.total) {
        console.log(`[ShopManager] Fonds insuffisants (${balance} < ${totals.total}).`);
        return null;
      }
    }

    // 4) Débit AVANT (une seule fois)
    if (this.walletProvider) {
      const ok = this.walletProvider.withdraw(customerId, totals.total, `Checkout ${shopId}`);
      if (!ok) return null;
    }

    // 5) Décrémente stock (skipPayment=true pour éviter double-débit)
    const transactionItems: { itemId: ShopItemId; quantity: number; unitPrice: number }[] = [];
    for (const [itemId, qty] of items) {
      const item = itemById(itemId);
      if (!item) continue;
      const unitPrice = getFinalPrice(item, activePromos);

      const tx = shop.purchase(itemId, qty, customerId, paymentMethod, {
        skipPayment: true,
      });
      if (!tx) {
        // Rollback : recrédite tout
        if (this.walletProvider) {
          this.walletProvider.deposit(customerId, totals.total, `ROLLBACK ${shopId}`);
        }
        console.error(`[ShopManager] Échec ${itemId} — rollback effectué.`);
        return null;
      }

      transactionItems.push({ itemId, quantity: qty, unitPrice });
    }

    // 6) Transaction globale (une seule)
    const globalTx: Transaction = {
      id: `txn_global_${++this.lastTransactionId}_${Date.now()}`,
      type: "purchase",
      shopId,
      customerId,
      items: transactionItems,
      subtotal: totals.subtotal,
      taxes: totals.tax,
      total: totals.total,
      paymentMethod,
      timestamp: Date.now(),
      status: "completed",
    };
    this.transactions.push(globalTx);
    this.clearCart(customerId);

    // 7) Events
    for (const cb of this.managerListeners.checkout) {
      try { cb(globalTx); } catch { /* noop */ }
    }

    console.log(`[ShopManager] ✓ Achat ${customerId} @ ${shopId} : ${formatCad(totals.total)}`);
    return globalTx;
  }

  /** 🆕 v2 — Sell items avec crédit réel */
  sellItems(
    customerId: string,
    shopId: string,
    items: Record<ShopItemId, number>,
  ): Transaction | null {
    const shop = this.getShop(shopId);
    if (!shop || !shop.isOpen) {
      console.log(`[ShopManager] Magasin ${shopId} fermé ou introuvable.`);
      return null;
    }

    for (const itemId of Object.keys(items)) {
      if (!itemById(itemId)) {
        console.log(`[ShopManager] Item ${itemId} introuvable.`);
        return null;
      }
    }

    let subtotal = 0;
    const transactionItems: { itemId: ShopItemId; quantity: number; unitPrice: number }[] = [];

    for (const [itemId, quantity] of Object.entries(items)) {
      const item = itemById(itemId)!;
      const unitPrice = sellPrice(item);
      subtotal += unitPrice * quantity;
      transactionItems.push({ itemId, quantity, unitPrice });
    }

    const total = subtotal;

    // Crédit global
    if (this.walletProvider) {
      const ok = this.walletProvider.deposit(customerId, total, `Vente ${shopId}`);
      if (!ok) return null;
    }

    // Décrémente stock via shop.sell (skipPayment=true)
    for (const [itemId, quantity] of Object.entries(items)) {
      shop.sell(itemId, quantity, customerId, { skipPayment: true });
    }

    const transaction: Transaction = {
      id: `txn_${++this.lastTransactionId}_${Date.now()}`,
      type: "sale",
      shopId,
      customerId,
      items: transactionItems,
      subtotal,
      taxes: 0,
      total,
      paymentMethod: "cash",
      timestamp: Date.now(),
      status: "completed",
    };
    this.transactions.push(transaction);

    for (const cb of this.managerListeners.sale) {
      try { cb(transaction); } catch { /* noop */ }
    }

    return transaction;
  }

  /** Tick global */
  tick(): void {
    for (const shop of this.shops.values()) shop.tick();
    promotionManager.cleanup();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  QUERIES
  // ═════════════════════════════════════════════════════════════════════════

  getTransactionsByCustomer(customerId: string): Transaction[] {
    return this.transactions.filter((t) => t.customerId === customerId);
  }

  getTransactionsByShop(shopId: string): Transaction[] {
    return this.transactions.filter((t) => t.shopId === shopId);
  }

  getStats() {
    const totalRevenue = this.transactions.reduce((sum, t) => sum + t.total, 0);
    return {
      totalShops: this.shops.size,
      totalTransactions: this.transactions.length,
      totalRevenue,
      activeCarts: this.carts.size,
      activePromotions: promotionManager.getActivePromotions().length,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════

  exportData() {
    return {
      shops: [...this.shops.values()].map((shop) => ({
        id: shop.id,
        inventory: Object.fromEntries(shop.inventory),
        revenueToday: shop.revenueToday,
        revenueThisWeek: shop.revenueThisWeek,
        revenueThisMonth: shop.revenueThisMonth,
        lastRestock: shop.lastRestock,
      })),
      carts: Object.fromEntries(
        [...this.carts.entries()].map(([id, cart]) => [id, cart.export()]),
      ),
      transactions: this.transactions,
      promotions: promotionManager.getActivePromotions(),
    };
  }

  importData(data: {
    shops?: Array<{
      id: string;
      inventory: Record<ShopItemId, number>;
      revenueToday: number;
      revenueThisWeek: number;
      revenueThisMonth: number;
      lastRestock: number;
    }>;
    carts?: Record<string, { items: Record<ShopItemId, number>; shopId?: string }>;
    transactions?: Transaction[];
    promotions?: Promotion[];
  }): void {
    if (data.shops) {
      for (const s of data.shops) {
        const shop = this.getShop(s.id);
        if (shop) {
          shop.inventory = new Map(Object.entries(s.inventory));
          shop.revenueToday = s.revenueToday;
          shop.revenueThisWeek = s.revenueThisWeek;
          shop.revenueThisMonth = s.revenueThisMonth;
          shop.lastRestock = s.lastRestock;
        }
      }
    }
    if (data.carts) {
      for (const [customerId, cartData] of Object.entries(data.carts)) {
        const cart = new Cart(cartData.shopId, customerId);
        cart.import(cartData);
        this.carts.set(customerId, cart);
      }
    }
    if (data.transactions) {
      this.transactions = data.transactions;
      this.lastTransactionId = data.transactions.length;
    }
    if (data.promotions) {
      for (const promo of data.promotions) {
        promotionManager.addPromotion({
          name: promo.name, description: promo.description, shopId: promo.shopId,
          itemIds: promo.itemIds, category: promo.category,
          discountPercent: promo.discountPercent, discountFixed: promo.discountFixed,
          startDate: promo.startDate, endDate: promo.endDate,
          minQuantity: promo.minQuantity, maxUses: promo.maxUses, uses: promo.uses,
        });
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  🆕 v2 — HEALTH & DISPOSE
  // ═════════════════════════════════════════════════════════════════════════

  health(): { ok: boolean; reason?: string } {
    if (this.shops.size === 0) return { ok: false, reason: "no_shops" };
    if (this.transactions.length > 100_000) return { ok: false, reason: "transaction_log_full" };
    return { ok: true };
  }

  dispose(): void {
    for (const shop of this.shops.values()) {
      shop.shopListeners.transaction.clear();
      shop.shopListeners.stockUpdate.clear();
      shop.shopListeners.restock.clear();
      shop.shopListeners.outOfStock.clear();
    }
    this.shops.clear();
    this.carts.clear();
    this.transactions = [];
    this.managerListeners.checkout.clear();
    this.managerListeners.sale.clear();
  }
}

// Instance globale
export const shopManager = new ShopManager();

// ==========================================
// 🔌 10. BRANCHEMENT BANKING (à appeler au boot)
// ==========================================

/**
 * 🆕 v2 — Branche automatiquement le wallet provider sur banking.ts.
 * À appeler dans ton serveur au démarrage :
 *
 *   import { attachCommerceToBanking } from "./commerce";
 *   import { getPlayerCash, removeCash, addCash, getDefaultAccount } from "./banking";
 *   attachCommerceToBanking({ getPlayerCash, removeCash, addCash, getDefaultAccount });
 */
export function attachCommerceToBanking(banking: {
  getPlayerCash: (playerId: string) => number;
  removeCash: (amount: number, playerId: string) => void;
  addCash: (amount: number, playerId: string) => void;
  getDefaultAccount: (playerId: string) => { balance: number } | null | undefined;
}): void {
  shopManager.setWalletProvider({
    getBalance(playerId) {
      const cash = banking.getPlayerCash(playerId) ?? 0;
      const account = banking.getDefaultAccount(playerId);
      return cash + (account?.balance ?? 0);
    },
    withdraw(playerId, amount, _reason) {
      const cash = banking.getPlayerCash(playerId) ?? 0;
      if (cash >= amount) {
        banking.removeCash(amount, playerId);
        return true;
      }
      const account = banking.getDefaultAccount(playerId);
      if (account && account.balance >= amount) {
        account.balance = Math.round((account.balance - amount) * 100) / 100;
        return true;
      }
      return false;
    },
    deposit(playerId, amount, _reason) {
      banking.addCash(amount, playerId);
      return true;
    },
  });
  console.log("🛒 [CommerceSystem] Wallet branché sur banking.ts");
}

/**
 * 🆕 v2 — Branche le provider d'âge.
 */
export function attachAgeProvider(provider: AgeProvider): void {
  shopManager.setAgeProvider(provider);
}

/**
 * 🆕 v2 — Branche le provider de licences.
 */
export function attachLicenseProvider(provider: LicenseProvider): void {
  shopManager.setLicenseProvider(provider);
}

/**
 * 🆕 v2 — Branche le provider d'inventaire (poids).
 */
export function attachBagProvider(provider: BagProvider): void {
  shopManager.setBagProvider(provider);
}

// ==========================================
// 🔧 11. FONCTIONS UTILITAIRES (Compatibilité)
// ==========================================

export function shopNameForVillage(v: VillageDef): string { return shopNameFor(v); }
export function getDepanneurOffset(v: VillageDef) { return depanneurOffset(v); }
export function getCatalogFor(kind: ShopKind): ShopItem[] { return catalogFor(kind); }
export function getItemById(id: string): ShopItem | undefined { return itemById(id); }
export function getSellPrice(item: ShopItem): number { return sellPrice(item); }
export function getBagCapacity(packId: string | null): number { return bagCapacity(packId); }
export function getBagWeight(inv: Record<string, number>): number { return bagWeight(inv); }
export function getBagValue(inv: Record<string, number>): number { return bagValue(inv); }
export function getCartCount(cart: Record<string, number>): number { return cartCount(cart); }
export function getCartLines(cart: Record<string, number>) { return cartLines(cart); }
export function getCartTotals(cart: Record<string, number>) { return cartTotals(cart); }
export function formatCurrency(n: number): string { return formatCad(n); }