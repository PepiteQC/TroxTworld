import { A40_EXITS, villageCivicSpot, type VillageDef } from "./worlddata";

export type ShopKind = "depanneur" | "food" | "clothing" | "chasse" | "quincaillerie";
export type BagGroup = "all" | "hunt" | "loot" | "food" | "gear" | "wear";
export type ShopUse = "eat" | "drink" | "wear" | "tool" | "fuel" | "drug" | "seed";

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  icon:
    | "utensils"
    | "coffee"
    | "beer"
    | "cookie"
    | "droplets"
    | "fuel"
    | "cup"
    | "sandwich"
    | "newspaper"
    | "shirt"
    | "binoculars"
    | "plus"
    | "leaf"
    | "wrench"
    | "key"
    | "crosshair"
    | "hammer"
    | "shovel"
    | "axe"
    | "hardhat"
    | "vest"
    | "backpack"
    | "gem"
    | "pill"
    | "file";
  kinds: ShopKind[];
  weight: number;
  use?: ShopUse;
  harvest?: boolean;
}

export type ShopItemId = ShopItem["id"];

export interface ShopSpot {
  id: string;
  name: string;
  villageId: string;
  kind: ShopKind;
  x: number;
  z: number;
  yaw: number;
  hours: string;
}

export const CATALOG: ShopItem[] = [
  { id: "poutine", name: "Poutine extra", price: 9.5, desc: "Frites, sauce brune, fromage en grains.", icon: "utensils", kinds: ["depanneur", "food"], weight: 0.6, use: "eat" },
  { id: "hotdog", name: "Steamé all-dressed", price: 3.5, desc: "Pain vapeur, choux, moutarde.", icon: "sandwich", kinds: ["depanneur", "food"], weight: 0.25, use: "eat" },
  { id: "burger", name: "Burger au bacon", price: 14.5, desc: "Chez Ti-Guy, pain brioché.", icon: "sandwich", kinds: ["food"], weight: 0.4, use: "eat" },
  { id: "pizza", name: "Pointe all-dressed", price: 5.75, desc: "Fromage en grains, pepperoni.", icon: "utensils", kinds: ["food"], weight: 0.28, use: "eat" },
  { id: "cafe", name: "Café double", price: 2.25, desc: "Brun, comme il faut.", icon: "coffee", kinds: ["depanneur", "food"], weight: 0.2, use: "drink" },
  { id: "cola", name: "Cola érable", price: 2.5, desc: "Canette froide du frigo.", icon: "cup", kinds: ["depanneur", "food"], weight: 0.35, use: "drink" },
  { id: "lait", name: "Lait 2 L", price: 4.95, desc: "Québon, sac de plastique.", icon: "cup", kinds: ["depanneur"], weight: 2.1, use: "drink" },
  { id: "chips", name: "Chips ketchup", price: 2.75, desc: "Le vrai goût d'ici.", icon: "cookie", kinds: ["depanneur"], weight: 0.18, use: "eat" },
  { id: "biere", name: "Bière en canette", price: 4.5, desc: "Froide, du frigo du fond.", icon: "beer", kinds: ["depanneur"], weight: 0.36, use: "drink" },
  { id: "loto", name: "Billet Loto-Québec", price: 3, desc: "La poule, c'est mardi.", icon: "newspaper", kinds: ["depanneur"], weight: 0.01 },
  { id: "tabac", name: "Paquet de cigarettes", price: 16.5, desc: "Derrière le comptoir. 18 ans.", icon: "cookie", kinds: ["depanneur"], weight: 0.02 },
  { id: "slush", name: "Slush cerise", price: 2.25, desc: "Machine du comptoir, trop sucrée.", icon: "cup", kinds: ["depanneur"], weight: 0.4, use: "drink" },
  { id: "glace", name: "Barre glacée", price: 2, desc: "Congélateur près de la porte.", icon: "cookie", kinds: ["depanneur"], weight: 0.12, use: "eat" },
  { id: "pain", name: "Pain blanc", price: 3.5, desc: "Sac de plastique, tranché.", icon: "sandwich", kinds: ["depanneur"], weight: 0.55, use: "eat" },
  { id: "beurre", name: "Beurre 454 g", price: 6.5, desc: "Frigo, papier d'alu.", icon: "cookie", kinds: ["depanneur"], weight: 0.46 },
  { id: "sirop", name: "Sirop d'érable 250 ml", price: 22, desc: "Ambré, cabane de Portneuf. Quatre seaux d'eau.", icon: "droplets", kinds: ["depanneur"], harvest: true, weight: 0.35, use: "drink" },
  { id: "essence", name: "Essence 20 L", price: 28.4, desc: "Plein pour la 138.", icon: "fuel", kinds: ["depanneur"], weight: 2.4, use: "fuel" },
  { id: "journal", name: "Le Journal de Portneuf", price: 2, desc: "Nouvelles du comté.", icon: "newspaper", kinds: ["depanneur"], weight: 0.12 },
  { id: "medkit", name: "Trousse de premiers soins", price: 32, desc: "Pour les rangs et l'A-40.", icon: "plus", kinds: ["depanneur", "chasse"], weight: 0.8, use: "eat" },
  { id: "veste", name: "Veste carreaux de laine", price: 89, desc: "Portneuf, coupe d'hiver.", icon: "shirt", kinds: ["clothing"], weight: 1.1, use: "wear" },
  { id: "goose", name: "Parka Canada Goose", price: 189, desc: "Duvet, hiver du comté.", icon: "shirt", kinds: ["clothing"], weight: 1.8, use: "wear" },
  { id: "roots", name: "Coton ouaté Roots", price: 72, desc: "Castor, molleton canadien.", icon: "shirt", kinds: ["clothing"], weight: 0.7, use: "wear" },
  { id: "nike", name: "Survêtement Nike", price: 98, desc: "Sport, rue, vitrine Éther.", icon: "shirt", kinds: ["clothing"], weight: 0.6, use: "wear" },
  { id: "bottes", name: "Bottes à cap d'acier", price: 124, desc: "Travail et neige.", icon: "shirt", kinds: ["clothing"], weight: 1.6, use: "wear" },
  { id: "tuque", name: "Tuque Canadienne", price: 22, desc: "Laine, pompon inclus.", icon: "shirt", kinds: ["clothing"], weight: 0.2, use: "wear" },
  { id: "permis", name: "Permis faunique MFFP", price: 46, desc: "Saison orignal, secteur Portneuf.", icon: "newspaper", kinds: ["chasse"], weight: 0.02 },
  { id: "pal", name: "Permis PAL", price: 85, desc: "GRC — possession d'armes d'épaule.", icon: "newspaper", kinds: ["chasse"], weight: 0.02 },
  { id: "pal_r", name: "PAL restreint", price: 185, desc: "Autorisation de poing. Contrôle SQ.", icon: "newspaper", kinds: ["chasse"], weight: 0.02 },
  { id: "jumelles", name: "Jumelles 10×42", price: 78, desc: "Pour les Laurentides.", icon: "binoculars", kinds: ["chasse"], weight: 0.7 },
  { id: "kaki", name: "Veste kaki Faune & Parcs", price: 96, desc: "Approcher l'orignal sans le paniquer.", icon: "shirt", kinds: ["chasse", "clothing"], weight: 0.9, use: "wear" },
  { id: "venaison", name: "Venaison d'orignal", price: 48, desc: "Gibier des Laurentides.", icon: "leaf", kinds: ["chasse"], harvest: true, weight: 1.4 },
  { id: "fourrure", name: "Fourrure tannée", price: 36, desc: "Peau de meute, cabane à sucre.", icon: "shirt", kinds: ["chasse"], harvest: true, weight: 0.8 },
  { id: "queue_castor", name: "Queue de castor", price: 22, desc: "Fumée, tradition des rangs.", icon: "leaf", kinds: ["chasse"], harvest: true, weight: 0.3 },
  { id: "crochet", name: "Crochet de serrure", price: 85, desc: "Les chambres d'hôtel n'aiment pas ça.", icon: "key", kinds: ["depanneur"], weight: 0.08, use: "tool" },
  { id: "cle", name: "Clé anglaise", price: 38, desc: "Resserrer le pick-up au garage.", icon: "wrench", kinds: ["depanneur", "quincaillerie"], weight: 0.55, use: "tool" },
  { id: "cle_maison", name: "Clé de maison", price: 0, desc: "Propriétaire. Ouvre toutes les portes.", icon: "key", kinds: [], weight: 0.04 },
  { id: "double_cle", name: "Double de clés", price: 25, desc: "Famille, coloc, employé. Quincaillerie.", icon: "key", kinds: ["quincaillerie"], weight: 0.04 },
  { id: "carabine", name: "Carabine de chasse", price: 420, desc: "Prélèvement à plus grande distance.", icon: "crosshair", kinds: ["chasse"], weight: 3.4, use: "tool" },
  { id: "shotgun", name: "Fusil à pompe", price: 380, desc: "12 jauge, PAL. Gibier et rangs.", icon: "crosshair", kinds: ["chasse"], weight: 3.6, use: "tool" },
  { id: "pistol", name: "Pistolet tactique", price: 280, desc: "Courte portée, PAL restreint.", icon: "crosshair", kinds: ["chasse"], weight: 0.95, use: "tool" },
  { id: "ar15", name: "Fusil d'assaut", price: 3100, desc: "5,56 — prohibé. Marché noir.", icon: "crosshair", kinds: [], weight: 3.2, use: "tool" },
  { id: "ak74", name: "AK-74", price: 2400, desc: "5,45 × 39 — prohibée au Canada. Marché noir.", icon: "crosshair", kinds: [], weight: 3.3, use: "tool" },
  { id: "bobomb", name: "Bob-omb", price: 75, desc: "Bombe à mèche. Ne pas allumer au salon.", icon: "gem", kinds: [], weight: 0.8, use: "tool" },
  { id: "ammo_9mm", name: "Munitions 9 mm", price: 18, desc: "Boîte de 12, pistolet.", icon: "crosshair", kinds: ["chasse"], weight: 0.22 },
  { id: "ammo_308", name: "Munitions .308", price: 24, desc: "Boîte de 8, carabine.", icon: "crosshair", kinds: ["chasse"], weight: 0.28 },
  { id: "ammo_545", name: "Munitions 5,45", price: 36, desc: "Chargeur AK-74. Illégal.", icon: "crosshair", kinds: [], weight: 0.35 },
  { id: "ammo_12", name: "Cartouches 12 ga", price: 22, desc: "Boîte de 8, pompe.", icon: "crosshair", kinds: ["chasse"], weight: 0.4 },
  { id: "ammo_556", name: "Munitions 5,56", price: 42, desc: "Chargeur d'assaut. Illégal.", icon: "crosshair", kinds: [], weight: 0.38 },
  { id: "weed", name: "Poche cannabis 3,5 g", price: 32, desc: "SQDC, séché, Portneuf.", icon: "pill", kinds: ["depanneur"], weight: 0.04, use: "drug" },
  { id: "cocaine", name: "Sachet blanc", price: 180, desc: "Illégal. La SQ n'aime pas ça.", icon: "pill", kinds: ["chasse"], weight: 0.02, use: "drug" },
  { id: "identite", name: "Carte d'identité", price: 45, desc: "Photo, comté de Portneuf.", icon: "file", kinds: ["depanneur"], weight: 0.02 },
  { id: "contrat", name: "Contrat notarié", price: 120, desc: "Papier, trombone doré.", icon: "file", kinds: ["depanneur"], weight: 0.08 },
  { id: "chaine", name: "Chaîne en or", price: 240, desc: "Mailles épaisses, vitrine Éther.", icon: "gem", kinds: ["clothing"], weight: 0.12, use: "wear" },
  { id: "bague", name: "Bague chevalière", price: 165, desc: "Or, petite pierre.", icon: "gem", kinds: ["clothing"], weight: 0.03, use: "wear" },
  { id: "montre", name: "Montre bracelet", price: 310, desc: "Cuir, boîtier doré.", icon: "gem", kinds: ["clothing"], weight: 0.08, use: "wear" },
  { id: "marteau", name: "Marteau", price: 22, desc: "Chantier du village.", icon: "hammer", kinds: ["quincaillerie"], weight: 0.45, use: "tool" },
  { id: "pelle", name: "Pelle", price: 28, desc: "Foin et rangs.", icon: "shovel", kinds: ["quincaillerie"], weight: 1.8, use: "tool" },
  { id: "rateau", name: "Râteau", price: 20, desc: "Ramasser le rang.", icon: "shovel", kinds: ["quincaillerie"], weight: 1.2, use: "tool" },
  { id: "perceuse", name: "Perceuse sans fil", price: 180, desc: "20 V, chantier.", icon: "wrench", kinds: ["quincaillerie"], weight: 1.4, use: "tool" },
  { id: "tronconneuse", name: "Tronçonneuse", price: 380, desc: "Bois de chauffage, Laurentides.", icon: "axe", kinds: ["quincaillerie", "chasse"], weight: 4.6, use: "tool" },
  { id: "casque", name: "Casque CSA", price: 25, desc: "Obligatoire sur le chantier.", icon: "hardhat", kinds: ["quincaillerie"], weight: 0.4, use: "wear" },
  { id: "gilet", name: "Gilet haute visibilité", price: 18, desc: "Bandes réfléchissantes.", icon: "vest", kinds: ["quincaillerie"], weight: 0.3, use: "wear" },
  { id: "boite", name: "Boîte à outils", price: 65, desc: "Plateau, loquet rouge.", icon: "wrench", kinds: ["quincaillerie"], weight: 2.8, use: "tool" },
  { id: "sac", name: "Sac urbain", price: 89, desc: "Nylon noir, 30 kg.", icon: "backpack", kinds: ["clothing"], weight: 1.1, use: "wear" },
  { id: "sac_rouge", name: "Sac cordura rouge", price: 96, desc: "Portneuf, 30 kg.", icon: "backpack", kinds: ["clothing"], weight: 1.15, use: "wear" },
  { id: "sac_rando", name: "Sac de rando", price: 145, desc: "Laurentides, 38 kg, duvet.", icon: "backpack", kinds: ["clothing", "chasse"], weight: 1.6, use: "wear" },
  { id: "papier", name: "Rouleau de papier", price: 42, desc: "Sorti de la machine, Donnacona.", icon: "newspaper", kinds: ["depanneur"], weight: 2.2 },
  { id: "graines_mais", name: "Semence de maïs", price: 6, desc: "Rangs du Chemin du Roy.", icon: "leaf", kinds: ["quincaillerie", "depanneur"], weight: 0.2, use: "seed" },
  { id: "graines_ble", name: "Semence de blé", price: 5, desc: "Plaine agricole de Portneuf.", icon: "leaf", kinds: ["quincaillerie"], weight: 0.18, use: "seed" },
  { id: "graines_foin", name: "Semence de foin", price: 4, desc: "Prairie, première coupe.", icon: "leaf", kinds: ["quincaillerie"], weight: 0.16, use: "seed" },
  { id: "graines_patate", name: "Plants de patates", price: 7, desc: "Variété des rangs.", icon: "leaf", kinds: ["quincaillerie", "depanneur"], weight: 0.4, use: "seed" },
  { id: "graines_cannabis", name: "Graines de cannabis", price: 48, desc: "Culture interdite au Québec. Saisie SQ.", icon: "pill", kinds: ["chasse"], weight: 0.05, use: "seed" },
  { id: "mais", name: "Épis de maïs", price: 8, desc: "Récolte du rang.", icon: "leaf", kinds: ["depanneur", "food"], harvest: true, weight: 0.8, use: "eat" },
  { id: "ble", name: "Sac de blé", price: 11, desc: "Grain, moulin du comté.", icon: "leaf", kinds: ["depanneur"], harvest: true, weight: 1.2 },
  { id: "foin", name: "Balle de foin", price: 6, desc: "Première coupe.", icon: "leaf", kinds: ["depanneur"], harvest: true, weight: 1.6 },
  { id: "patate", name: "Patates du rang", price: 5, desc: "Sac de 5 kg.", icon: "leaf", kinds: ["depanneur", "food"], harvest: true, weight: 1.1, use: "eat" },
  { id: "lait_rang", name: "Bidon de lait 4 L", price: 7, desc: "Holstein du Chemin du Roy, cru.", icon: "cup", kinds: ["depanneur"], harvest: true, weight: 4.1, use: "drink" },
  { id: "oeufs", name: "Boîte d'œufs", price: 6, desc: "Poulailler du rang, la douzaine.", icon: "cookie", kinds: ["depanneur", "food"], harvest: true, weight: 0.7, use: "eat" },
  { id: "corde_bois", name: "Corde de bois", price: 45, desc: "Érable et tremble, séchée. Poêle et foyer.", icon: "leaf", kinds: ["quincaillerie", "chasse"], weight: 8.4, use: "fuel" },
  { id: "eau_erable", name: "Seau d'eau d'érable", price: 3, desc: "Coulée, 20 L. Quatre seaux pour un sirop.", icon: "droplets", kinds: [], harvest: true, weight: 2.2 },
];

export const BAG_MAX_KG = 22;

export function bagCapacity(packId: string | null): number {
  if (packId === "sac_rando") return 38;
  if (packId === "sac" || packId === "sac_rouge") return 30;
  return BAG_MAX_KG;
}

export function bagWeight(inv: Record<string, number>): number {
  let w = 0;
  for (const [id, n] of Object.entries(inv)) {
    if (n <= 0) continue;
    w += (itemById(id)?.weight ?? 0.4) * n;
  }
  return Math.round(w * 10) / 10;
}

export const LANDMARK_SHOPS: ShopSpot[] = [
  {
    id: "shop_tiguy",
    name: "Chez Ti-Guy",
    villageId: "portneuf",
    kind: "food",
    x: A40_EXITS[3]!.x + 28,
    z: 38,
    yaw: Math.PI,
    hours: "11 h – 23 h",
  },
  {
    id: "shop_ether",
    name: "Boutique Éther",
    villageId: "pont_rouge",
    kind: "clothing",
    x: 1088,
    z: -320,
    yaw: Math.PI,
    hours: "9 h – 21 h",
  },
  {
    id: "shop_chasse",
    name: "Chasse & Pêche",
    villageId: "saint_raymond",
    kind: "chasse",
    x: 1000,
    z: -620,
    yaw: 0.55,
    hours: "10 h – 18 h",
  },
  {
    id: "shop_quincaillerie",
    name: "Quincaillerie Gosselin",
    villageId: "portneuf",
    kind: "quincaillerie",
    x: A40_EXITS[3]!.x - 72,
    z: 44,
    yaw: Math.PI,
    hours: "7 h – 18 h",
  },
];

export function catalogFor(kind: ShopKind): ShopItem[] {
  return CATALOG.filter((t) => t.kinds.includes(kind) && !t.harvest);
}

export function sellPrice(item: ShopItem): number {
  return Math.max(1, Math.round(item.price * 0.6 * 100) / 100);
}

export function bagGroup(item: ShopItem): Exclude<BagGroup, "all"> {
  if (
    item.harvest ||
    item.id === "pistol" ||
    item.id === "carabine" ||
    item.id === "ak74" ||
    item.id === "ar15" ||
    item.id === "shotgun" ||
    item.id.startsWith("ammo_")
  ) {
    return "hunt";
  }
  if (item.use === "drug" || item.icon === "gem" || item.icon === "file") return "loot";
  if (item.use === "eat" || item.use === "drink") return "food";
  if (item.use === "tool" || item.use === "fuel") return "gear";
  if (item.use === "wear") return "wear";
  if (item.kinds.includes("chasse")) return "hunt";
  return "gear";
}

export function ammoFor(id: string | null | undefined): string | null {
  if (id === "pistol") return "ammo_9mm";
  if (id === "carabine") return "ammo_308";
  if (id === "ak74") return "ammo_545";
  if (id === "shotgun") return "ammo_12";
  if (id === "ar15") return "ammo_556";
  return null;
}

export function harvestRange(id: string | null | undefined): number {
  if (id === "ak74" || id === "ar15") return 12;
  if (id === "carabine") return 8.5;
  if (id === "shotgun") return 7.2;
  if (id === "pistol") return 6.2;
  return 4.2;
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

export function shopNameFor(v: VillageDef): string {
  if (v.id === "portneuf") return "Dépanneur Le Beau-Soir";
  if (v.id === "pont_rouge") return "Dépanneur du Pont";
  if (v.id === "saint_alban") return "Dépanneur de l'Éboulis";
  if (v.id === "saint_casimir") return "Chez Gaston — comptoir";
  if (v.id === "saint_raymond") return "Dépanneur Bras-du-Nord";
  if (v.id === "cap_sante") return "Dépanneur du Cap";
  if (v.id === "donnacona") return "Dépanneur des Érables";
  if (v.id === "neuville") return "Dépanneur des Écureuils";
  if (v.id === "grondines") return "Dépanneur du Roy";
  if (v.id === "saint_basile") return "Dépanneur du Rang";
  if (v.id === "saint_marc") return "Dépanneur de la Carrière";
  return `Dépanneur ${v.name}`;
}

export function depanneurOffset(v: VillageDef): { x: number; z: number; yaw: number } {
  return villageCivicSpot(v, "shop");
}

export function formatCad(n: number): string {
  return `${n.toLocaleString("fr-CA", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}\u00a0$`;
}

export function itemById(id: string): ShopItem | undefined {
  return CATALOG.find((t) => t.id === id);
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

export function cartTotals(cart: Record<string, number>) {
  const lines = cartLines(cart);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = Math.round(lines.reduce((a, l) => a + l.item.price * l.qty, 0) * 100) / 100;
  const tax = Math.round(subtotal * 0.14975 * 100) / 100;
  return {
    lines,
    count,
    subtotal,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
    weight: Math.round(lines.reduce((a, l) => a + l.item.weight * l.qty, 0) * 100) / 100,
  };
}
