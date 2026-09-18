import * as THREE from "three";
import { matLib } from "./materials";
import type { ShopItemId } from "./commerce";
import { finishMap } from "./textures";

// ============================================================================
// 🔹 TYPES ET INTERFACES RP
// ============================================================================

/** Saison de l'année. */
export type Season = "hiver" | "printemps" | "ete" | "automne";

/** Trait d'un vêtement ou accessoire. */
export type GarmentTrait = "chaud" | "résistant_eau" | "nouveau" | "leger" | "style" | "confortable" | "sportif" | "formel" | "élégant" | "durable" | "rare" | "résistant_vent" | "résistant_eau" | "chaud" | "imperméable";
// __GARMENT_PATCHED__

/** Catégorie d'un vêtement ou accessoire. */
export type GarmentCategory =
  | "haut"
  | "bas"
  | "robe"
  | "manteau"
  | "chaussures"
  | "accessoire"
  | "chapeau"
  | "sac"
  | "bijoux";

/** Niveau de rareté. */
export type Rarity = "commun" | "peu_commun" | "rare" | "épique" | "légendaire";

/** Style visuel d'un vêtement. */
export type GarmentStyle = {
  color: number; // Couleur principale (hex)
  secondaryColor?: number; // Couleur secondaire
  pattern?: string; // Motif (ex: "rayé", "uni", "imprimé")
  material: string; // Matériau (ex: "laine", "coton", "cuir")
};

/** Définition d'un vêtement ou accessoire. */
export interface GarmentDef {
  id: ShopItemId;
  label: string;
  category: GarmentCategory;
  price: number; // Prix en $
  traits: GarmentTrait[];
  rarity: Rarity;
  style: GarmentStyle;
  description: string;
  seasons?: Season[]; // Saisons où l'article est disponible
  stock: number; // Quantité en stock
  maxStock: number; // Stock maximum
  restockRate: number; // Taux de réapprovisionnement (par jour)
  reputationBonus?: number; // Bonus de réputation si porté
  resistance?: {
    cold?: number; // Résistance au froid (0-100)
    heat?: number; // Résistance à la chaleur (0-100)
    rain?: number; // Résistance à la pluie (0-100)
    wind?: number; // Résistance au vent (0-100)
  };
  requiredLevel?: number; // Niveau minimum pour acheter
  isNew?: boolean; // Nouveau dans la boutique
  isOnSale?: boolean; // En solde
  salePrice?: number; // Prix en solde
  quests?: BoutiqueQuest[]; // Quêtes associées
}

/** Position d'un vêtement dans la boutique. */
export interface BoutiqueGarment {
  itemId: ShopItemId;
  x: number;
  z: number;
  rotation?: number; // Rotation du vêtement (pour les mannequins)
  isOnMannequin?: boolean; // Si le vêtement est sur un mannequin
  isOnRack?: boolean; // Si le vêtement est sur un porte-manteau
  isOnDisplay?: boolean; // Si le vêtement est en vitrine
}

/** Quête liée à la boutique. */
export interface BoutiqueQuest {
  id: string;
  title: string;
  description: string;
  objective: {
    type: "buy" | "try" | "collect" | "spend";
    target?: ShopItemId | GarmentCategory; // Cible (article ou catégorie)
    count: number; // Nombre requis
    amount?: number; // Montant requis (pour "spend")
  };
  progress: number;
  reward: {
    money?: number;
    reputation?: number;
    unlocks?: ShopItemId[]; // Articles débloqués
    items?: ShopItemId[]; // Articles reçus en récompense
  };
  expiry?: number; // Date d'expiration (en jours de jeu)
}

/** Définition d'une boutique. */
export interface BoutiqueDef {
  group: THREE.Group;
  spawn: THREE.Vector3;
  spawnYaw: number;
  exit: THREE.Vector3;
  walls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  title: string;
  subtitle: string;
  garments: BoutiqueGarment[];
  caisse: { x: number; z: number };
  currentSeason?: Season; // Saison actuelle
  reputation?: number; // Réputation de la boutique (0-100)
  openTime?: number; // Heure d'ouverture (0-23)
  closeTime?: number; // Heure de fermeture (0-23)
  isOpen?: boolean; // La boutique est-elle ouverte ?
  staff?: BoutiqueStaff[]; // Personnel de la boutique
  customers?: BoutiqueCustomer[]; // Clients dans la boutique
  currentQuests?: BoutiqueQuest[]; // Quêtes actives
  lastRestock?: number; // Dernier réapprovisionnement (en jours de jeu)
}

/** Membre du personnel de la boutique. */
export interface BoutiqueStaff {
  id: string;
  name: string;
  role: "caissier" | "vendeur" | "gérant";
  mood: "heureux" | "neutre" | "fâché" | "occupé";
  position: { x: number; z: number };
  dialogue?: string[]; // Phrases possibles
}

/** Client dans la boutique. */
export interface BoutiqueCustomer {
  id: string;
  name?: string;
  position: { x: number; z: number };
  target?: { x: number; z: number }; // Destination
  mood: "heureux" | "neutre" | "pressé" | "indécis";
  interest?: ShopItemId; // Article qui l'intéresse
  patience: number; // Patience (0-100)
  willBuy?: ShopItemId; // Article qu'il va acheter
}

// ============================================================================
// 🌍 DONNÉES STATIQUES (Catalogue des vêtements et accessoires)
// ============================================================================

/** Saison actuelle du jeu (à définir ailleurs). */
let currentSeason: Season = "ete";
let currentDay: number = 0;

/**
 * Définit la saison actuelle.
 * @param season - Nouvelle saison.
 */
export function setCurrentSeason(season: Season): void {
  currentSeason = season;
}

/**
 * Définit le jour actuel.
 * @param day - Nouveau jour.
 */
export function setCurrentDay(day: number): void {
  currentDay = day;
}

/** Catalogue des vêtements et accessoires. */
export const GARMENT_CATALOG: GarmentDef[] = [
  // --- HAUTS ---
  {
    id: "goose",
    label: "Veste Canada Goose",
    category: "manteau",
    price: 450,
    traits: ["chaud", "résistant_eau", "résistant_vent", "durable"],
    rarity: "légendaire",
    style: { color: 0x8b1a1a, material: "nylon" },
    description: "Veste d'hiver ultra-résistante. Parfaite pour les hivers québécois.",
    seasons: ["hiver", "automne"],
    stock: 2,
    maxStock: 5,
    restockRate: 0.1, // 10% de chance de réappro par jour
    reputationBonus: 5,
    resistance: { cold: 100, rain: 90, wind: 85 },
    isNew: false,
  },
  {
    id: "veste",
    label: "Veste en laine",
    category: "manteau",
    price: 120,
    traits: ["chaud", "confortable", "durable"],
    rarity: "rare",
    style: { color: 0x5c3317, material: "laine" },
    description: "Veste chaude et confortable pour l'automne et l'hiver.",
    seasons: ["hiver", "automne"],
    stock: 8,
    maxStock: 12,
    restockRate: 0.2,
    reputationBonus: 2,
    resistance: { cold: 80, wind: 60 },
  },
  {
    id: "nike",
    label: "Chandail Nike",
    category: "haut",
    price: 80,
    traits: ["sportif", "confortable"],
    rarity: "peu_commun",
    style: { color: 0x111827, secondaryColor: 0xffffff, material: "coton" },
    description: "Chandail sportif pour les activités physiques.",
    seasons: ["printemps", "ete", "automne"],
    stock: 10,
    maxStock: 15,
    restockRate: 0.3,
    reputationBonus: 1,
    resistance: { heat: 50 },
  },
  {
    id: "roots",
    label: "Chandail Roots",
    category: "haut",
    price: 95,
    traits: ["élégant", "confortable"],
    rarity: "rare",
    style: { color: 0x4a5840, material: "coton" },
    description: "Chandail élégant et confortable, parfait pour une sortie en ville.",
    seasons: ["printemps", "automne"],
    stock: 6,
    maxStock: 10,
    restockRate: 0.2,
    reputationBonus: 2,
  },
  {
    id: "kaki",
    label: "Veste kaki",
    category: "manteau",
    price: 75,
    traits: ["durable", "résistant_eau"],
    rarity: "commun",
    style: { color: 0x4a5840, material: "nylon" },
    description: "Veste légère et pratique pour les activités en extérieur.",
    seasons: ["printemps", "ete", "automne"],
    stock: 12,
    maxStock: 20,
    restockRate: 0.4,
    reputationBonus: 1,
    resistance: { rain: 70, wind: 60 },
  },

  // --- CHAPEAUX ---
  {
    id: "tuque",
    label: "Tuque en laine",
    category: "chapeau",
    price: 25,
    traits: ["chaud", "confortable"],
    rarity: "commun",
    style: { color: 0x1a3a6b, material: "laine" },
    description: "Tuque chaude pour les journées froides.",
    seasons: ["hiver", "automne"],
    stock: 15,
    maxStock: 25,
    restockRate: 0.5,
    reputationBonus: 1,
    resistance: { cold: 60 },
  },

  // --- SACS ---
  {
    id: "sac",
    label: "Sac à dos noir",
    category: "sac",
    price: 60,
    traits: ["durable", "confortable"],
    rarity: "commun",
    style: { color: 0x1a1a1e, material: "nylon" },
    description: "Sac à dos pratique pour le quotidien.",
    seasons: ["hiver", "printemps", "ete", "automne"],
    stock: 10,
    maxStock: 15,
    restockRate: 0.4,
    reputationBonus: 0,
  },
  {
    id: "sac_rouge",
    label: "Sac à main rouge",
    category: "sac",
    price: 50,
    traits: ["élégant", "rare"],
    rarity: "peu_commun",
    style: { color: 0x8a2020, material: "cuir" },
    description: "Sac à main élégant pour les sorties.",
    seasons: ["printemps", "ete", "automne"],
    stock: 5,
    maxStock: 8,
    restockRate: 0.2,
    reputationBonus: 1,
  },

  // --- ACCESSOIRES ---
  {
    id: "chaine",
    label: "Chaîne en or",
    category: "bijoux",
    price: 200,
    traits: ["élégant", "rare", "formel"],
    rarity: "rare",
    style: { color: 0xc9a84c, material: "or" },
    description: "Chaîne en or 24 carats. Symbole de luxe.",
    seasons: ["hiver", "printemps", "ete", "automne"],
    stock: 3,
    maxStock: 5,
    restockRate: 0.1,
    reputationBonus: 3,
  },
  {
    id: "bague",
    label: "Bague en argent",
    category: "bijoux",
    price: 150,
    traits: ["élégant", "formel"],
    rarity: "peu_commun",
    style: { color: 0xc9a84c, material: "argent" },
    description: "Bague en argent fin. Parfaite pour les occasions spéciales.",
    seasons: ["hiver", "printemps", "ete", "automne"],
    stock: 4,
    maxStock: 6,
    restockRate: 0.15,
    reputationBonus: 2,
  },
  {
    id: "montre",
    label: "Montre classique",
    category: "bijoux",
    price: 120,
    traits: ["élégant", "formel"],
    rarity: "commun",
    style: { color: 0xc9a84c, material: "métal" },
    description: "Montre classique pour les professionnels.",
    seasons: ["hiver", "printemps", "ete", "automne"],
    stock: 8,
    maxStock: 12,
    restockRate: 0.3,
    reputationBonus: 1,
  },

  // --- PROMOTIONS SAISONNIÈRES ---
  {
    id: "manteau_hiver_2024",
    label: "Manteau d'hiver 2024",
    category: "manteau",
    price: 300,
    salePrice: 225, // -25%
    traits: ["chaud", "résistant_eau", "nouveau"],
    rarity: "épique",
    style: { color: 0x1a1f2e, secondaryColor: 0xffffff, material: "laine" },
    description: "Nouveau manteau d'hiver 2024. Édition limitée.",
    seasons: ["hiver"],
    stock: 1,
    maxStock: 3,
    restockRate: 0.05, // Très rare
    reputationBonus: 5,
    resistance: { cold: 95, rain: 85 },
    isNew: true,
    isOnSale: true,
    quests: [
      {
        id: "collect_winter_2024",
        title: "Collection Hiver 2024",
        description: "Achetez le manteau d'hiver 2024 pour compléter votre collection.",
        objective: { type: "buy", target: "manteau_hiver_2024", count: 1 },
        progress: 0,
        reward: { reputation: 5, items: ["tuque"] },
      },
    ],
  },
];

// ============================================================================
// 🛍️ FONCTIONS DE GESTION DE LA BOUTIQUE
// ============================================================================

/**
 * Récupère un vêtement par son ID.
 * @param id - ID du vêtement.
 * @returns Définition du vêtement ou `undefined`.
 */
export function getGarmentDef(id: ShopItemId): GarmentDef | undefined {
  return GARMENT_CATALOG.find((g) => g.id === id);
}

/**
 * Vérifie si un vêtement est disponible selon la saison actuelle.
 * @param garment - Définition du vêtement.
 * @returns `true` si disponible.
 */
export function isGarmentAvailable(garment: GarmentDef): boolean {
  if (!garment.seasons || garment.seasons.length === 0) return true;
  return garment.seasons.includes(currentSeason);
}

/**
 * Réapprovisionne le stock des vêtements.
 * @param daysPassed - Nombre de jours écoulés.
 */
export function restockGarments(daysPassed: number): void {
  for (const garment of GARMENT_CATALOG) {
    if (garment.stock >= garment.maxStock) continue;

    // Calculer le nombre d'articles à réapprovisionner
    const restockAmount = Math.floor(daysPassed * garment.restockRate);
    garment.stock = Math.min(garment.maxStock, garment.stock + restockAmount);
  }
}

/**
 * Vérifie si un vêtement est en stock.
 * @param id - ID du vêtement.
 * @returns `true` si en stock.
 */
export function isInStock(id: ShopItemId): boolean {
  const garment = getGarmentDef(id);
  return garment ? garment.stock > 0 : false;
}

/**
 * Achete un vêtement.
 * @param id - ID du vêtement.
 * @param money - Argent disponible.
 * @returns `true` si l'achat a réussi.
 */
export function buyGarment(id: ShopItemId, money: number): { success: boolean; message: string; item?: GarmentDef } {
  const garment = getGarmentDef(id);
  if (!garment) {
    return { success: false, message: "Article introuvable." };
  }

  if (!isGarmentAvailable(garment)) {
    return { success: false, message: `Cet article n'est pas disponible cette saison (${currentSeason}).` };
  }

  if (garment.stock <= 0) {
    return { success: false, message: "Cet article est en rupture de stock." };
  }

  const price = garment.isOnSale && garment.salePrice ? garment.salePrice : garment.price;
  if (money < price) {
    return { success: false, message: `Vous n'avez pas assez d'argent. Prix : ${price} $.` };
  }

  // Achat réussi
  garment.stock--;
  return {
    success: true,
    message: `Achat réussi ! Vous avez acheté un ${garment.label} pour ${price} $.`,
    item: garment,
  };
}

/**
 * Essaye un vêtement.
 * @param id - ID du vêtement.
 * @returns Résultat de l'essayage.
 */
export function tryGarment(id: ShopItemId): { success: boolean; message: string; garment?: GarmentDef } {
  const garment = getGarmentDef(id);
  if (!garment) {
    return { success: false, message: "Article introuvable." };
  }

  if (!isGarmentAvailable(garment)) {
    return { success: false, message: `Cet article n'est pas disponible cette saison (${currentSeason}).` };
  }

  return {
    success: true,
    message: `Vous essayez le ${garment.label}. ${garment.description}`,
    garment,
  };
}

/**
 * Récupère les vêtements d'une catégorie spécifique.
 * @param category - Catégorie.
 * @returns Liste des vêtements de la catégorie.
 */
export function getGarmentsByCategory(category: GarmentCategory): GarmentDef[] {
  return GARMENT_CATALOG.filter((g) => g.category === category);
}

/**
 * Récupère les vêtements avec un trait spécifique.
 * @param trait - Trait.
 * @returns Liste des vêtements avec le trait.
 */
export function getGarmentsByTrait(trait: GarmentTrait): GarmentDef[] {
  return GARMENT_CATALOG.filter((g) => g.traits.includes(trait));
}

/**
 * Récupère les vêtements accessibles avec un budget donné.
 * @param budget - Budget disponible.
 * @returns Liste des vêtements accessibles.
 */
export function getAffordableGarments(budget: number): GarmentDef[] {
  return GARMENT_CATALOG.filter((g) => {
    const price = g.isOnSale && g.salePrice ? g.salePrice : g.price;
    return price <= budget && isGarmentAvailable(g) && g.stock > 0;
  });
}

/**
 * Récupère les vêtements en solde.
 * @returns Liste des vêtements en solde.
 */
export function getSaleGarments(): GarmentDef[] {
  return GARMENT_CATALOG.filter((g) => g.isOnSale && g.salePrice && isGarmentAvailable(g));
}

/**
 * Récupère les vêtements nouveaux.
 * @returns Liste des vêtements nouveaux.
 */
export function getNewGarments(): GarmentDef[] {
  return GARMENT_CATALOG.filter((g) => g.isNew && isGarmentAvailable(g));
}

// ============================================================================
// 🎯 FONCTIONS DE GESTION DES QUÊTES
// ============================================================================

/**
 * Vérifie si un achat complète une quête.
 * @param id - ID du vêtement acheté.
 * @returns Liste des quêtes complétées.
 */
export function checkQuestCompletion(id: ShopItemId): BoutiqueQuest[] {
  const completedQuests: BoutiqueQuest[] = [];

  for (const garment of GARMENT_CATALOG) {
    if (garment.id !== id) continue;
    if (!garment.quests) continue;

    for (const quest of garment.quests) {
      if (quest.objective.type === "buy" && quest.objective.target === id) {
        quest.progress++;
        if (quest.progress >= quest.objective.count) {
          completedQuests.push(quest);
          // Réinitialiser la quête (ou la marquer comme complétée)
          quest.progress = 0;
        }
      }
    }
  }

  return completedQuests;
}

/**
 * Met à jour les quêtes après un achat.
 * @param id - ID du vêtement acheté.
 * @param amountSpent - Montant dépensé.
 */
export function updateQuests(id: ShopItemId, amountSpent: number): void {
  for (const garment of GARMENT_CATALOG) {
    if (!garment.quests) continue;

    for (const quest of garment.quests) {
      if (quest.objective.type === "buy" && quest.objective.target === id) {
        quest.progress = Math.min(quest.progress + 1, quest.objective.count);
      } else if (quest.objective.type === "spend") {
        quest.progress = Math.min(quest.progress + amountSpent, quest.objective.amount || 0);
      }
    }
  }
}

/**
 * Récupère les quêtes actives pour un joueur.
 * @returns Liste des quêtes actives.
 */
export function getActiveQuests(): BoutiqueQuest[] {
  const activeQuests: BoutiqueQuest[] = [];

  for (const garment of GARMENT_CATALOG) {
    if (garment.quests) {
      activeQuests.push(...garment.quests.filter((q) => q.progress < q.objective.count));
    }
  }

  return activeQuests;
}

// ============================================================================
// 👥 FONCTIONS DE GESTION DES CLIENTS ET DU PERSONNEL
// ============================================================================

/**
 * Génère un client aléatoire pour la boutique.
 * @returns Client généré.
 */
export function generateRandomCustomer(): BoutiqueCustomer {
  const names = ["Jean", "Marie", "Pierre", "Sophie", "Luc", "Anne", "Paul", "Élodie"];
  const moods: BoutiqueCustomer["mood"][] = ["heureux", "neutre", "pressé", "indécis"];
  const patience = Math.floor(Math.random() * 100) + 1;

  // 20% de chance que le client ait un article spécifique en tête
  const willBuy = Math.random() < 0.2 ? GARMENT_CATALOG[Math.floor(Math.random() * GARMENT_CATALOG.length)].id : undefined;

  return {
    id: `customer_${Date.now()}`,
    name: names[Math.floor(Math.random() * names.length)],
    position: { x: 0, z: 0 },
    mood: moods[Math.floor(Math.random() * moods.length)],
    patience,
    willBuy,
  };
}

/**
 * Génère un membre du personnel aléatoire.
 * @returns Membre du personnel généré.
 */
export function generateRandomStaff(): BoutiqueStaff {
  const names = ["Claudette", "Gérard", "Sylvie", "Michel", "Lise", "Yves"];
  const roles: BoutiqueStaff["role"][] = ["caissier", "vendeur", "gérant"];
  const moods: BoutiqueStaff["mood"][] = ["heureux", "neutre", "fâché", "occupé"];
  const dialogues = {
    caissier: [
      "Bienvenue à la Boutique Éther !",
      "Votre total s'élève à...",
      "Avez-vous un code promo ?",
      "Passez une bonne journée !",
    ],
    vendeur: [
      "Puis-je vous aider à trouver quelque chose ?",
      "Cet article est en promotion aujourd'hui !",
      "Essayez-le, ça vous ira à ravir !",
      "Les cabines d'essayage sont par ici.",
    ],
    gérant: [
      "Bonjour, je suis le gérant. Tout va bien ?",
      "On a reçu de nouveaux articles cette semaine !",
      "N'hésitez pas à demander si vous avez des questions.",
      "Revenez nous voir !",
    ],
  };

  const role = roles[Math.floor(Math.random() * roles.length)];
  return {
    id: `staff_${Date.now()}`,
    name: names[Math.floor(Math.random() * names.length)],
    role,
    mood: moods[Math.floor(Math.random() * moods.length)],
    position: { x: 0, z: 0 },
    dialogue: dialogues[role],
  };
}

/**
 * Met à jour l'humeur des clients et du personnel.
 * @param customers - Liste des clients.
 * @param staff - Liste du personnel.
 */
export function updateMoods(customers: BoutiqueCustomer[], staff: BoutiqueStaff[]): void {
  for (const customer of customers) {
    // Diminuer la patience avec le temps
    customer.patience = Math.max(0, customer.patience - 5);

    // Changer l'humeur selon la patience
    if (customer.patience < 20) {
      customer.mood = "pressé";
    } else if (customer.patience < 50) {
      customer.mood = "indécis";
    } else if (Math.random() < 0.1) {
      customer.mood = Math.random() < 0.5 ? "heureux" : "neutre";
    }
  }

  for (const member of staff) {
    // Changer l'humeur aléatoirement
    if (Math.random() < 0.05) {
      member.mood = ["heureux", "neutre", "fâché", "occupé"][Math.floor(Math.random() * 4)] as BoutiqueStaff["mood"];
    }
  }
}

// ============================================================================
// 🎨 FONCTIONS DE CONSTRUCTION 3D (avec support RP)
// ============================================================================

/**
 * Crée une boîte avec des propriétés étendues.
 * @param w - Largeur.
 * @param h - Hauteur.
 * @param d - Profondeur.
 * @param x - Position X.
 * @param y - Position Y.
 * @param z - Position Z.
 * @param color - Couleur.
 * @param metal - Métallicité.
 * @param roughness - Rugosité.
 * @returns Mesh de la boîte.
 */
function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: number,
  metal = 0,
  roughness = 0.75
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    matLib.get(color, roughness, metal)
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Crée un porte-manteau avec des vêtements.
 * @param x - Position X.
 * @param z - Position Z.
 * @param length - Longueur du porte-manteau.
 * @param garmentIds - IDs des vêtements à afficher.
 * @returns Groupe THREE.js.
 */
function rack(
  x: number,
  z: number,
  length: number,
  garmentIds: ShopItemId[]
): THREE.Group {
  const g = new THREE.Group();
  const metal = matLib.get(0x2a2a35, 0.25, 0.75);

  // Poteaux
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8), metal);
    post.position.set(x + s * (length / 2 - 0.06), 0.85, z);
    g.add(post);
  }

  // Barre horizontale
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, length, 8), metal);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(x, 1.68, z);
  g.add(bar);

  // Vêtements suspendus
  garmentIds.forEach((id, i) => {
    const garment = getGarmentDef(id);
    if (!garment) return;

    const t = garmentIds.length <= 1 ? 0.5 : i / (garmentIds.length - 1);
    const gx = x - length / 2 + 0.22 + t * (length - 0.44);

    // Couleur du vêtement
    const color = garment.style.color;

    // Forme du vêtement selon la catégorie
    let geometry: THREE.BufferGeometry;
    let width = 0.26;
    let height = 0.42;
    let depth = 0.05;

    if (garment.category === "manteau") {
      geometry = new THREE.BoxGeometry(width, height + 0.2, depth + 0.05);
    } else if (garment.category === "haut") {
      geometry = new THREE.BoxGeometry(width, height - 0.1, depth);
    } else if (garment.category === "chapeau") {
      geometry = new THREE.SphereGeometry(0.1, 8, 8);
      height = 0.2;
    } else if (garment.category === "sac") {
      geometry = new THREE.BoxGeometry(width - 0.1, height - 0.2, depth + 0.1);
    } else if (garment.category === "bijoux") {
      geometry = new THREE.SphereGeometry(0.05, 8, 8);
      width = 0.1;
      height = 0.1;
    } else {
      geometry = new THREE.BoxGeometry(width, height, depth);
    }

    const hang = new THREE.Mesh(geometry, matLib.get(color, 0.88));
    hang.position.set(gx, 1.28, z);

    // Ajouter un tag de prix
    const priceTag = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.01),
      matLib.get(0xffffff, 0.9)
    );
    priceTag.position.set(gx, 1.15, z + 0.06);

    // Ajouter un tag de solde si applicable
    if (garment.isOnSale && garment.salePrice) {
      const saleTag = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.01),
        matLib.get(0xff4444, 0.9)
      );
      saleTag.position.set(gx + 0.05, 1.15, z + 0.06);
      g.add(saleTag);
    }

    hang.castShadow = true;
    g.add(hang, priceTag);
  });

  return g;
}

/**
 * Crée un mannequin avec un vêtement.
 * @param x - Position X.
 * @param z - Position Z.
 * @param garmentId - ID du vêtement à afficher.
 * @returns Groupe THREE.js.
 */
function mannequin(x: number, z: number, garmentId: ShopItemId): THREE.Group {
  const g = new THREE.Group();
  const garment = getGarmentDef(garmentId);
  if (!garment) return g;

  const color = garment.style.color;

  // Corps
  g.add(box(0.36, 0.5, 0.2, x, 1.28, z, color, 0, 0.8));

  // Bras
  g.add(box(0.32, 0.28, 0.18, x, 0.92, z, color, 0, 0.8));

  // Tête
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), matLib.get(0xd4c8b0, 0.7));
  head.position.set(x, 1.72, z);
  g.add(head);

  // Poteau
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), matLib.get(0x2a2a35, 0.3, 0.7));
  pole.position.set(x, 0.45, z);
  g.add(pole);

  // Ajouter un accessoire si applicable
  if (garment.category === "chapeau") {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 8), matLib.get(color, 0.8));
    hat.position.set(x, 1.8, z);
    hat.rotation.x = 0.2;
    g.add(hat);
  } else if (garment.category === "sac") {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.08), matLib.get(color, 0.8));
    bag.position.set(x + 0.2, 1.1, z - 0.1);
    g.add(bag);
  }

  return g;
}

/**
 * Crée une carte de produit avec l'image du vêtement.
 * @param id - ID du vêtement.
 * @param x - Position X.
 * @param y - Position Y.
 * @param z - Position Z.
 * @returns Mesh de la carte.
 */
function productCard(id: ShopItemId, x: number, y: number, z: number): THREE.Mesh {
  const garment = getGarmentDef(id);
  if (!garment) {
    // Carte par défaut si le vêtement n'est pas trouvé
    const mat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  const mat = new THREE.MeshLambertMaterial({ color: 0x22242c });
  const loader = new THREE.TextureLoader();
  loader.load(`/products/${id}.jpg`, (tex) => {
    finishMap(tex, "clamp");
    mat.map = tex;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
  });

  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), mat);
  m.position.set(x, y, z);
  m.castShadow = true;

  // Ajouter un cadre
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.44, 0.02),
    matLib.get(0x1a1a1e, 0.5, 0.2)
  );
  frame.position.set(x, y, z - 0.01);

  // Ajouter un tag de prix
  const price = garment.isOnSale && garment.salePrice ? garment.salePrice : garment.price;
  const priceColor = garment.isOnSale ? 0xff4444 : 0xffffff;
  const priceTag = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.01),
    matLib.get(priceColor, 0.9)
  );
  priceTag.position.set(x, y - 0.25, z + 0.01);

  // Ajouter un tag "Nouveau" si applicable
  if (garment.isNew) {
    const newTag = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.06, 0.01),
      matLib.get(0x44ff44, 0.9)
    );
    newTag.position.set(x + 0.15, y + 0.18, z + 0.01);
    m.add(newTag);
  }

  // Ajouter un tag de rareté
  const rarityColors: Record<Rarity, number> = {
    commun: 0x888888,
    peu_commun: 0x448844,
    rare: 0x4444ff,
    épique: 0xaa44ff,
    légendaire: 0xffcc00,
  };
  const rarityTag = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 0.01),
    matLib.get(rarityColors[garment.rarity], 0.9)
  );
  rarityTag.position.set(x - 0.15, y + 0.18, z + 0.01);

  return m;
}

/**
 * Crée un client 3D dans la boutique.
 * @param customer - Définition du client.
 * @returns Groupe THREE.js.
 */
function buildCustomer(customer: BoutiqueCustomer): THREE.Group {
  const g = new THREE.Group();

  // Corps (cylindre pour simplifier)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8),
    matLib.get(0x4a6a8a, 0.8)
  );
  body.position.y = 0.3;
  g.add(body);

  // Tête
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), matLib.get(0xd4c8b0, 0.7));
  head.position.y = 0.7;
  g.add(head);

  // Chapeau si le client est "heureux"
  if (customer.mood === "heureux") {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.08, 8), matLib.get(0x8a2020, 0.8));
    hat.position.y = 0.8;
    g.add(hat);
  }

  // Sac à main si le client est une femme (simplification)
  if (customer.name && ["Marie", "Sophie", "Anne", "Élodie"].includes(customer.name)) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.05), matLib.get(0x1a1a1e, 0.8));
    bag.position.set(0.1, 0.5, -0.1);
    g.add(bag);
  }

  // Position et rotation
  g.position.set(customer.position.x, 0, customer.position.z);
  if (customer.target) {
    const angle = Math.atan2(customer.target.z - customer.position.z, customer.target.x - customer.position.x);
    g.rotation.y = angle;
  }

  // Animation de marche si le client se déplace
  if (customer.target) {
    // Ajouter une animation simple (à gérer ailleurs avec un système d'animation)
    g.userData.isMoving = true;
    g.userData.speed = 0.02;
  }

  return g;
}

/**
 * Crée un membre du personnel 3D dans la boutique.
 * @param staff - Définition du membre du personnel.
 * @returns Groupe THREE.js.
 */
function buildStaff(staff: BoutiqueStaff): THREE.Group {
  const g = new THREE.Group();

  // Corps
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8),
    matLib.get(0x2a4a6a, 0.8)
  );
  body.position.y = 0.35;
  g.add(body);

  // Tête
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), matLib.get(0xd4c8b0, 0.7));
  head.position.y = 0.75;
  g.add(head);

  // Uniforme selon le rôle
  if (staff.role === "gérant") {
    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.15, 0.1),
      matLib.get(0x1a1a1e, 0.8)
    );
    vest.position.y = 0.55;
    g.add(vest);
  } else if (staff.role === "caissier") {
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.2, 0.05),
      matLib.get(0x4a6a8a, 0.8)
    );
    apron.position.set(0, 0.45, -0.05);
    g.add(apron);
  }

  // Badge de nom
  const nameTag = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.05, 0.01),
    matLib.get(0xffffff, 0.9)
  );
  nameTag.position.y = 0.65;
  g.add(nameTag);

  // Position
  g.position.set(staff.position.x, 0, staff.position.z);

  return g;
}

/**
 * Construit l'intérieur de la boutique avec support RP.
 * @returns Définition de la boutique.
 */
export function buildBoutiqueInterior(): BoutiqueDef {
  const g = new THREE.Group();
  g.name = "interieur_boutique";
  const W = 12.4; // Largeur
  const D = 13.2; // Profondeur
  const H = 3.4; // Hauteur
  const walls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];
  const garments: BoutiqueGarment[] = [];

  // ============================================================================
  // 🏗️ CONSTRUCTION DE LA STRUCTURE DE LA BOUTIQUE
  // ============================================================================

  // Sol
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0x12141c, 0.35, 0.12));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // Tapis central
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 7.4), matLib.get(0x14101f, 0.95));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.01;
  g.add(carpet);

  // Plafond
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0x111520, 0.92));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  // Murs
  g.add(box(W, H, 0.2, 0, H / 2, -D / 2, 0x1a1f2e, 0, 0.12));
  g.add(box(W, H, 0.2, 0, H / 2, D / 2, 0x1a1f2e, 0, 0.12));
  g.add(box(0.2, H, D, -W / 2, H / 2, 0, 0x1a1f2e, 0, 0.12));
  g.add(box(0.2, H, D, W / 2, H / 2, 0, 0x1a1f2e, 0, 0.12));

  // Ajouter les murs pour les collisions
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.15, maxZ: -D / 2 + 0.15 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.15, maxZ: D / 2 + 0.15 });
  walls.push({ minX: -W / 2 - 0.15, maxX: -W / 2 + 0.15, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.15, maxX: W / 2 + 0.15, minZ: -D / 2, maxZ: D / 2 });

  // Enseigne lumineuse
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.42, 0.08),
    matLib.getEmissive(0xa78bfa, 0xa78bfa, 0.95)
  );
  neon.position.set(0, H - 0.4, -D / 2 + 0.16);
  g.add(neon);

  // ============================================================================
  // 👕 ÉTAGÈRES ET VÊTEMENTS
  // ============================================================================

  // Porte-manteaux avec vêtements
  g.add(rack(-3.6, -4.6, 4.4, ["goose", "veste", "nike", "roots", "kaki", "tuque"]));
  g.add(rack(3.6, -4.6, 4.4, ["veste", "roots", "kaki", "tuque", "manteau_hiver_2024"]));
  g.add(rack(0, -1.2, 3.8, ["goose", "veste", "nike", "kaki", "tuque"]));

  // Ajouter les vêtements aux garments
  const rack1Garments = ["goose", "veste", "nike", "roots", "kaki", "tuque"];
  const rack2Garments = ["veste", "roots", "kaki", "tuque", "manteau_hiver_2024"];
  const rack3Garments = ["goose", "veste", "nike", "kaki", "tuque"];

  rack1Garments.forEach((id, i) => {
    garments.push({ itemId: id, x: -3.6 - 2.2 + i * 0.44, z: -4.6, isOnRack: true });
  });
  rack2Garments.forEach((id, i) => {
    garments.push({ itemId: id, x: 3.6 - 2.2 + i * 0.44, z: -4.6, isOnRack: true });
  });
  rack3Garments.forEach((id, i) => {
    garments.push({ itemId: id, x: 0 - 1.8 + i * 0.44, z: -1.2, isOnRack: true });
  });

  // Mannequins avec vêtements
  g.add(mannequin(-4.6, 3.8, "goose"));
  g.add(mannequin(-3.2, 3.8, "veste"));
  g.add(mannequin(3.2, 3.8, "kaki"));
  g.add(mannequin(4.6, 3.8, "tuque"));

  garments.push(
    { itemId: "goose", x: -4.6, z: 3.8, isOnMannequin: true },
    { itemId: "veste", x: -3.2, z: 3.8, isOnMannequin: true },
    { itemId: "kaki", x: 3.2, z: 3.8, isOnMannequin: true },
    { itemId: "tuque", x: 4.6, z: 3.8, isOnMannequin: true }
  );

  // ============================================================================
  // 💰 CAISSE ET COMPTOIR
  // ============================================================================

  // Comptoir de caisse
  g.add(box(2.6, 1.05, 0.85, -3.8, 0.52, -5.8, 0x0e1520, 0.4));
  g.add(box(2.65, 0.07, 0.9, -3.8, 1.08, -5.8, 0xc9a84c, 0.2));

  // Caisse enregistreuse
  const till = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.2, 0.22),
    matLib.getEmissive(0x1a3a6b, 0x3a6ab8, 0.6)
  );
  till.position.set(-3.2, 1.28, -5.7);
  g.add(till);

  // Écran de caisse
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.12, 0.02),
    matLib.get(0x88ccee, 0.3, 0.1)
  );
  screen.position.set(-3.2, 1.35, -5.6);
  g.add(screen);

  // ============================================================================
  // 🪵 ÉTAGÈRES MURALES
  // ============================================================================

  for (let i = 0; i < 3; i++) {
    const cz = -3.4 + i * 2.2;
    g.add(box(1.5, 2.6, 0.08, 5.1, 1.3, cz - 0.7, 0x242b3d, 0, 0.12));
    g.add(box(0.08, 2.6, 1.5, 4.4, 1.3, cz, 0x242b3d, 0, 0.12));
    g.add(box(0.08, 2.6, 1.5, 5.8, 1.3, cz, 0x242b3d, 0, 0.12));
    g.add(box(1.3, 1.7, 0.04, 5.1, 1.4, cz + 0.72, 0x1a0a2e, 0, 0.12));
  }
  walls.push({ minX: 4.3, maxX: 5.9, minZ: -4.3, maxZ: 1.6 });

  // ============================================================================
  // 👗 VITRINE (Cartes de produits)
  // ============================================================================

  const spots: Array<{ id: ShopItemId; x: number; z: number; color: number }> = [
    { id: "goose", x: -4.8, z: -4.6, color: 0x8b1a1a },
    { id: "veste", x: -3.4, z: -4.6, color: 0x5c3317 },
    { id: "nike", x: -2.0, z: -4.6, color: 0x111827 },
    { id: "roots", x: 2.2, z: -4.6, color: 0x5c3317 },
    { id: "kaki", x: 3.6, z: -4.6, color: 0x4a5840 },
    { id: "tuque", x: 5.0, z: -4.6, color: 0x1a3a6b },
    { id: "sac", x: -1.2, z: -1.2, color: 0x1a1a1e },
    { id: "sac_rouge", x: 1.2, z: -1.2, color: 0x8a2020 },
    { id: "chaine", x: -4.0, z: 1.0, color: 0xc9a84c },
    { id: "bague", x: -3.2, z: 1.0, color: 0xc9a84c },
    { id: "montre", x: -2.4, z: 1.0, color: 0xc9a84c },
    { id: "manteau_hiver_2024", x: 0, z: 1.0, color: 0x1a1f2e }, // Nouveau produit en vitrine
  ];

  for (const s of spots) {
    g.add(productCard(s.id, s.x, 1.52, s.z + 0.08));
    garments.push({ itemId: s.id, x: s.x, z: s.z, isOnDisplay: true });
  }

  // ============================================================================
  // 💡 ÉCLAIRAGE
  // ============================================================================

  // Lumière principale (plafonnier)
  const lampA = new THREE.PointLight(0xffeedd, 1.4, 14, 2);
  lampA.position.set(0, 2.8, 0);
  g.add(lampA);

  // Lumière bleue (ambiance)
  const lampB = new THREE.PointLight(0xa78bfa, 0.55, 8, 2);
  lampB.position.set(-4, 2.4, 2);
  g.add(lampB);

  // Lumière jaune (vitrine)
  const lampC = new THREE.PointLight(0xffdd88, 0.8, 10, 2);
  lampC.position.set(0, 2.4, -4);
  g.add(lampC);

  // Lumière sur les mannequins
  const lampD = new THREE.PointLight(0xffffff, 0.6, 8, 2);
  lampD.position.set(-4, 2.4, 4);
  g.add(lampD);
  const lampE = new THREE.PointLight(0xffffff, 0.6, 8, 2);
  lampE.position.set(4, 2.4, 4);
  g.add(lampE);

  // ============================================================================
  // 🚪 PORTE DE SORTIE
  // ============================================================================

  const exitPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.2, 0.08),
    matLib.getEmissive(0x8fa8b8, 0xc8dce8, 0.35)
  );
  exitPlate.position.set(0, 1.15, D / 2 - 0.14);
  g.add(exitPlate);

  // ============================================================================
  // 🏷️ PANNEAUX ET SIGNALISATION
  // ============================================================================

  // Panneau "Caisse"
  const caisseSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 0.02),
    matLib.get(0xffffff, 0.9)
  );
  caisseSign.position.set(-3.8, 1.8, -5.8);
  const caisseText = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.1, 0.01),
    matLib.get(0x1a1a1e, 0.9)
  );
  caisseText.position.set(-3.8, 1.8, -5.79);
  g.add(caisseSign, caisseText);

  // Panneau "Soldes" (si des articles sont en solde)
  const saleItems = GARMENT_CATALOG.filter((g) => g.isOnSale);
  if (saleItems.length > 0) {
    const saleSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.4, 0.02),
      matLib.get(0xff4444, 0.9)
    );
    saleSign.position.set(0, 2.2, -D / 2 + 1);
    const saleText = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.2, 0.01),
      matLib.get(0xffffff, 0.9)
    );
    saleText.position.set(0, 2.2, -D / 2 + 0.99);
    g.add(saleSign, saleText);
  }

  // Panneau "Nouveautés" (si des articles sont nouveaux)
  const newItems = GARMENT_CATALOG.filter((g) => g.isNew);
  if (newItems.length > 0) {
    const newSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.4, 0.02),
      matLib.get(0x44ff44, 0.9)
    );
    newSign.position.set(-5, 2.2, 0);
    const newText = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.2, 0.01),
      matLib.get(0x1a1a1e, 0.9)
    );
    newText.position.set(-5, 2.2, -0.01);
    g.add(newSign, newText);
  }

  // ============================================================================
  // 👥 PERSONNEL ET CLIENTS (initiaux)
  // ============================================================================

  // Personnel
  const staff: BoutiqueStaff[] = [
    generateRandomStaff(),
    generateRandomStaff(),
  ];
  staff[0].role = "caissier";
  staff[0].position = { x: -3.8, z: -5.2 };
  staff[1].role = "vendeur";
  staff[1].position = { x: 0, z: -3 };

  // Clients
  const customers: BoutiqueCustomer[] = [
    generateRandomCustomer(),
    generateRandomCustomer(),
    generateRandomCustomer(),
  ];
  customers[0].position = { x: -2, z: -2 };
  customers[0].target = { x: -3.8, z: -5.2 }; // Va à la caisse
  customers[1].position = { x: 3, z: -2 };
  customers[1].target = { x: 3.2, z: 3.8 }; // Regarde un mannequin
  customers[2].position = { x: 0, z: 1 };
  customers[2].target = { x: 0, z: -1.2 }; // Regarde la vitrine

  // Ajouter les modèles 3D du personnel et des clients
  for (const member of staff) {
    const staffMesh = buildStaff(member);
    staffMesh.name = `staff_${member.id}`;
    g.add(staffMesh);
  }
  for (const customer of customers) {
    const customerMesh = buildCustomer(customer);
    customerMesh.name = `customer_${customer.id}`;
    g.add(customerMesh);
  }

  // ============================================================================
  // 📊 PROPRIÉTÉS DE LA BOUTIQUE
  // ============================================================================

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, D / 2 - 1.9),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.55),
    walls,
    title: "Boutique Éther",
    subtitle: "Québec · Vêtements, accessoires et plus",
    garments,
    caisse: { x: -3.8, z: -5.8 },
    currentSeason,
    reputation: 80, // Réputation initiale (0-100)
    openTime: 9, // Ouvre à 9h
    closeTime: 18, // Ferme à 18h
    isOpen: true,
    staff,
    customers,
    currentQuests: getActiveQuests(),
    lastRestock: currentDay,
  };
}

// ============================================================================
// 🎯 FONCTIONS UTILITAIRES POUR LE RP
// ============================================================================

/**
 * Met à jour la boutique pour une nouvelle journée.
 * @param boutique - Définition de la boutique.
 * @param day - Jour actuel.
 */
export function updateBoutiqueForNewDay(boutique: BoutiqueDef, day: number): void {
  // Mettre à jour le jour actuel
  currentDay = day;
  boutique.lastRestock = day;

  // Réapprovisionner les vêtements
  restockGarments(day - boutique.lastRestock);

  // Réinitialiser les clients et le personnel
  boutique.customers = [
    generateRandomCustomer(),
    generateRandomCustomer(),
    generateRandomCustomer(),
  ];
  boutique.staff = [
    generateRandomStaff(),
    generateRandomStaff(),
  ];
  boutique.staff[0].role = "caissier";
  boutique.staff[0].position = { x: -3.8, z: -5.2 };
  boutique.staff[1].role = "vendeur";
  boutique.staff[1].position = { x: 0, z: -3 };

  // Mettre à jour les positions des clients
  boutique.customers[0].position = { x: -2, z: -2 };
  boutique.customers[0].target = { x: -3.8, z: -5.2 };
  boutique.customers[1].position = { x: 3, z: -2 };
  boutique.customers[1].target = { x: 3.2, z: 3.8 };
  boutique.customers[2].position = { x: 0, z: 1 };
  boutique.customers[2].target = { x: 0, z: -1.2 };

  // Mettre à jour l'état d'ouverture
  const currentHour = new Date().getHours();
  boutique.isOpen = currentHour >= (boutique.openTime ?? 0) && currentHour < (boutique.closeTime ?? 24);
}

/**
 * Gère l'interaction avec un vêtement dans la boutique.
 * @param boutique - Définition de la boutique.
 * @param garmentId - ID du vêtement.
 * @param playerMoney - Argent du joueur.
 * @param action - Action à effectuer ("try" ou "buy").
 * @returns Résultat de l'interaction.
 */
export function interactWithGarment(
  boutique: BoutiqueDef,
  garmentId: ShopItemId,
  playerMoney: number,
  action: "try" | "buy"
): {
  success: boolean;
  message: string;
  garment?: GarmentDef;
  newMoney?: number;
  completedQuests?: BoutiqueQuest[];
} {
  const garment = getGarmentDef(garmentId);
  if (!garment) {
    return { success: false, message: "Article introuvable." };
  }

  if (!isGarmentAvailable(garment)) {
    return { success: false, message: `Cet article n'est pas disponible cette saison (${currentSeason}).` };
  }

  if (action === "try") {
    const result = tryGarment(garmentId);
    return {
      success: result.success,
      message: result.message,
      garment: result.garment,
    };
  } else if (action === "buy") {
    const result = buyGarment(garmentId, playerMoney);
    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }

    // Mettre à jour les quêtes
    const completedQuests = checkQuestCompletion(garmentId);
    updateQuests(garmentId, result.item ? result.item.price : 0);

    return {
      success: true,
      message: result.message,
      garment: result.item,
      newMoney: playerMoney - (result.item ? (result.item.isOnSale && result.item.salePrice ? result.item.salePrice : result.item.price) : 0),
      completedQuests,
    };
  } else {
    return { success: false, message: "Action invalide." };
  }
}

/**
 * Récupère les vêtements en vitrine.
 * @param boutique - Définition de la boutique.
 * @returns Liste des vêtements en vitrine.
 */
export function getDisplayGarments(boutique: BoutiqueDef): GarmentDef[] {
  return boutique.garments
    .filter((g) => g.isOnDisplay)
    .map((g) => getGarmentDef(g.itemId))
    .filter((g): g is GarmentDef => g !== undefined);
}

/**
 * Récupère les vêtements sur les mannequins.
 * @param boutique - Définition de la boutique.
 * @returns Liste des vêtements sur les mannequins.
 */
export function getMannequinGarments(boutique: BoutiqueDef): GarmentDef[] {
  return boutique.garments
    .filter((g) => g.isOnMannequin)
    .map((g) => getGarmentDef(g.itemId))
    .filter((g): g is GarmentDef => g !== undefined);
}

/**
 * Récupère les vêtements sur les porte-manteaux.
 * @param boutique - Définition de la boutique.
 * @returns Liste des vêtements sur les porte-manteaux.
 */
export function getRackGarments(boutique: BoutiqueDef): GarmentDef[] {
  return boutique.garments
    .filter((g) => g.isOnRack)
    .map((g) => getGarmentDef(g.itemId))
    .filter((g): g is GarmentDef => g !== undefined);
}

/**
 * Récupère les vêtements accessibles dans la boutique.
 * @param boutique - Définition de la boutique.
 * @returns Liste des vêtements accessibles.
 */
export function getAvailableGarments(boutique: BoutiqueDef): GarmentDef[] {
  return boutique.garments
    .map((g) => getGarmentDef(g.itemId))
    .filter((g): g is GarmentDef => g !== undefined && isGarmentAvailable(g) && g.stock > 0);
}

/**
 * Met à jour les positions des clients et du personnel.
 * @param boutique - Définition de la boutique.
 */
export function updatePositions(boutique: BoutiqueDef): void {
  // Mettre à jour les positions des clients
  for (const customer of (boutique.customers ?? [])) {
    if (customer.target && customer.patience > 0) {
      // Déplacer le client vers sa cible
      const dx = customer.target.x - customer.position.x;
      const dz = customer.target.z - customer.position.z;
      const distance = Math.hypot(dx, dz);

      if (distance > 0.1) {
        customer.position.x += (dx / distance) * 0.02;
        customer.position.z += (dz / distance) * 0.02;
      } else {
        // Le client est arrivé à destination
        if (Math.random() < 0.1) {
          // Changer de cible aléatoirement
          const newTarget = {
            x: -5 + Math.random() * 10,
            z: -5 + Math.random() * 10,
          };
          customer.target = newTarget;
        } else if (customer.willBuy && Math.random() < 0.05) {
          // Le client achète l'article
          const garment = getGarmentDef(customer.willBuy);
          if (garment && garment.stock > 0) {
            garment.stock--;
            customer.willBuy = undefined;
            customer.mood = "heureux";
          }
        }
      }
    }
  }

  // Mettre à jour les positions du personnel
  for (const member of (boutique.staff ?? [])) {
    if (Math.random() < 0.01) {
      // Déplacer légèrement le personnel
      member.position.x += (Math.random() - 0.5) * 0.2;
      member.position.z += (Math.random() - 0.5) * 0.2;
    }
  }
}

/**
 * Génère un dialogue aléatoire pour un membre du personnel.
 * @param staff - Membre du personnel.
 * @returns Phrase aléatoire.
 */
export function getRandomDialogue(staff: BoutiqueStaff): string {
  if (!staff.dialogue || staff.dialogue.length === 0) {
    return "Bonjour !";
  }
  return staff.dialogue[Math.floor(Math.random() * staff.dialogue.length)];
}

/**
 * Génère un avis client aléatoire.
 * @param boutique - Définition de la boutique.
 * @returns Avis généré.
 */
export function generateRandomReview(boutique: BoutiqueDef): { rating: number; comment: string } {
  const ratings = [1, 2, 3, 4, 5];
  // Biais vers la réputation de la boutique
  const bias = Math.floor(((boutique.reputation ?? 50) / 100) * 4);
  const rating = ratings[Math.min(bias + Math.floor(Math.random() * 2), 4)];

  const positiveComments = [
    "Service impeccable ! Je reviendrai.",
    "Large choix de vêtements de qualité.",
    "Les prix sont raisonnables.",
    "L'ambiance est agréable.",
    "Le personnel est très serviable.",
  ];
  const neutralComments = [
    "C'est correct, sans plus.",
    "Passe une bonne fois.",
    "Rien à signaler.",
    "Assez standard.",
  ];
  const negativeComments = [
    "Service lent et désorganisé.",
    "Prix trop élevés pour la qualité.",
    "Le personnel n'est pas très aimable.",
    "Manque de choix pour mon style.",
    "La boutique est trop petite.",
  ];

  let comment: string;
  if (rating >= 4) {
    comment = positiveComments[Math.floor(Math.random() * positiveComments.length)];
  } else if (rating === 3) {
    comment = neutralComments[Math.floor(Math.random() * neutralComments.length)];
  } else {
    comment = negativeComments[Math.floor(Math.random() * negativeComments.length)];
  }

  return { rating, comment };
}

/**
 * Met à jour la réputation de la boutique en fonction des avis.
 * @param boutique - Définition de la boutique.
 * @param rating - Note de l'avis (1-5).
 */
export function updateReputation(boutique: BoutiqueDef, rating: number): void {
  // Calculer le changement de réputation (-10 à +10)
  const change = (rating - 3) * 5;
  boutique.reputation = Math.max(0, Math.min(100, (boutique.reputation ?? 0) + change));
}