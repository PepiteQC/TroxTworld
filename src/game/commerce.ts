import { A40_EXITS, villageCivicSpot, type VillageDef } from "./worlddata";
import { getWeapon, weaponAmmo, weaponHarvestRange } from "./weapons";

export type ShopKind = "depanneur" | "food" | "clothing" | "chasse" | "quincaillerie" | "sqdc";
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
  hunger?: number;
  thirst?: number;
  /** Âge minimum (SQDC 21, tabac 18). */
  restricted?: 18 | 21;
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
  { id: "poutine", name: "Poutine extra", price: 9.5, desc: "Frites, sauce brune, fromage en grains.", icon: "utensils", kinds: ["depanneur", "food"], weight: 0.6, use: "eat", hunger: 55 },
  { id: "hotdog", name: "Steamé all-dressed", price: 3.5, desc: "Pain vapeur, choux, moutarde.", icon: "sandwich", kinds: ["depanneur", "food"], weight: 0.25, use: "eat", hunger: 28 },
  { id: "burger", name: "Burger au bacon", price: 14.5, desc: "Chez Ti-Guy, pain brioché.", icon: "sandwich", kinds: ["food"], weight: 0.4, use: "eat", hunger: 42 },
  { id: "pizza", name: "Pointe all-dressed", price: 5.75, desc: "Fromage en grains, pepperoni.", icon: "utensils", kinds: ["food"], weight: 0.28, use: "eat", hunger: 32 },
  { id: "cafe", name: "Café double", price: 2.25, desc: "Brun, comme il faut.", icon: "coffee", kinds: ["depanneur", "food"], weight: 0.2, use: "drink", thirst: 20 },
  { id: "cola", name: "Cola érable", price: 2.5, desc: "Canette froide du frigo.", icon: "cup", kinds: ["depanneur", "food"], weight: 0.35, use: "drink", thirst: 22, hunger: 4 },
  { id: "lait", name: "Lait 2 L", price: 4.95, desc: "Québon, sac de plastique.", icon: "cup", kinds: ["depanneur"], weight: 2.1, use: "drink", thirst: 28 },
  { id: "chips", name: "Chips ketchup", price: 2.75, desc: "Le vrai goût d'ici.", icon: "cookie", kinds: ["depanneur"], weight: 0.18, use: "eat", hunger: 18 },
  { id: "biere", name: "Bière en canette", price: 4.5, desc: "Froide, du frigo du fond.", icon: "beer", kinds: ["depanneur", "food"], weight: 0.36, use: "drink", thirst: 25, hunger: 5 },
  { id: "loto", name: "Billet Loto-Québec", price: 3, desc: "La poule, c'est mardi.", icon: "newspaper", kinds: ["depanneur"], weight: 0.01 },
  { id: "tabac", name: "Paquet de cigarettes", price: 16.5, desc: "Derrière le comptoir. 18 ans.", icon: "cookie", kinds: ["depanneur"], weight: 0.02, restricted: 18 },
  { id: "slush", name: "Slush cerise", price: 2.25, desc: "Machine du comptoir, trop sucrée.", icon: "cup", kinds: ["depanneur"], weight: 0.4, use: "drink", thirst: 18 },
  { id: "glace", name: "Barre glacée", price: 2, desc: "Congélateur près de la porte.", icon: "cookie", kinds: ["depanneur"], weight: 0.12, use: "eat", hunger: 12, thirst: 6 },
  { id: "pain", name: "Pain blanc", price: 3.5, desc: "Sac de plastique, tranché.", icon: "sandwich", kinds: ["depanneur"], weight: 0.55, use: "eat", hunger: 20 },
  { id: "beurre", name: "Beurre 454 g", price: 6.5, desc: "Frigo, papier d'alu.", icon: "cookie", kinds: ["depanneur"], weight: 0.46 },
  { id: "sirop", name: "Sirop d'érable 250 ml", price: 22, desc: "Ambré, cabane de Portneuf. Quatre seaux d'eau.", icon: "droplets", kinds: ["depanneur"], harvest: true, weight: 0.35, use: "drink", hunger: 10 },
  { id: "essence", name: "Essence 20 L", price: 28.4, desc: "Plein pour la 138.", icon: "fuel", kinds: ["depanneur"], weight: 2.4, use: "fuel" },
  { id: "journal", name: "Le Journal de Portneuf", price: 2, desc: "Nouvelles du comté.", icon: "newspaper", kinds: ["depanneur"], weight: 0.12 },
  { id: "tourtiere", name: "Tourtière", price: 12, desc: "Pâté à la viande du temps des fêtes.", icon: "utensils", kinds: ["food"], weight: 0.7, use: "eat", hunger: 60 },
  { id: "pouding_chomeur", name: "Pouding chômeur", price: 6, desc: "Gâteau noyé dans le sirop d'érable chaud.", icon: "cookie", kinds: ["food", "depanneur"], weight: 0.28, use: "eat", hunger: 25 },
  { id: "cretons", name: "Crétons", price: 4, desc: "Pâté de porc épicé, classique du déjeuner.", icon: "sandwich", kinds: ["depanneur", "food"], weight: 0.22, use: "eat", hunger: 20 },
  { id: "soupe_pois", name: "Soupe aux pois", price: 7, desc: "Pois jaunes et lard salé.", icon: "utensils", kinds: ["food"], weight: 0.45, use: "eat", hunger: 30, thirst: 10 },
  { id: "pate_chinois", name: "Pâté chinois", price: 10, desc: "Bœuf haché, blé d'Inde, patates pilées.", icon: "utensils", kinds: ["food"], weight: 0.55, use: "eat", hunger: 50 },
  { id: "viande_fumee", name: "Sandwich viande fumée", price: 11, desc: "Empilé haut, moutarde forte.", icon: "sandwich", kinds: ["food"], weight: 0.38, use: "eat", hunger: 45 },
  { id: "bagel", name: "Bagel de Montréal", price: 2, desc: "Four à bois, graines de sésame.", icon: "sandwich", kinds: ["depanneur", "food"], weight: 0.12, use: "eat", hunger: 25 },
  { id: "fromage_grains", name: "Fromage en grains", price: 6, desc: "Frais du jour, doit couiner.", icon: "cookie", kinds: ["depanneur", "food"], weight: 0.2, use: "eat", hunger: 15 },
  { id: "tarte_sucre", name: "Tarte au sucre", price: 8, desc: "Cassonade et crème, ultra sucrée.", icon: "cookie", kinds: ["food"], weight: 0.32, use: "eat", hunger: 30 },
  { id: "pomme", name: "Pomme", price: 1, desc: "Variété locale, croquante.", icon: "leaf", kinds: ["depanneur", "food"], weight: 0.18, use: "eat", hunger: 12, thirst: 8 },
  { id: "banane", name: "Banane", price: 1, desc: "Bonne source de potassium.", icon: "leaf", kinds: ["depanneur"], weight: 0.16, use: "eat", hunger: 14, thirst: 5 },
  { id: "orange", name: "Orange", price: 1, desc: "Juteuse, riche en vitamine C.", icon: "leaf", kinds: ["depanneur"], weight: 0.18, use: "eat", hunger: 12, thirst: 12 },
  { id: "carotte", name: "Carotte", price: 1, desc: "Croquante, avec fanes.", icon: "leaf", kinds: ["depanneur"], weight: 0.12, use: "eat", hunger: 8, thirst: 3 },
  { id: "croissant", name: "Croissant", price: 3, desc: "Pur beurre, feuilleté.", icon: "sandwich", kinds: ["depanneur", "food"], weight: 0.08, use: "eat", hunger: 18 },
  { id: "eau", name: "Bouteille d'eau", price: 2, desc: "Format 500 ml.", icon: "droplets", kinds: ["depanneur", "food"], weight: 0.52, use: "drink", thirst: 35 },
  { id: "jus_orange", name: "Jus d'orange", price: 3, desc: "Carton individuel, pur jus.", icon: "cup", kinds: ["depanneur", "food"], weight: 0.28, use: "drink", thirst: 22, hunger: 5 },
  { id: "barre_chocolat", name: "Barre de chocolat", price: 2, desc: "Énergie rapide, format dépanneur.", icon: "cookie", kinds: ["depanneur"], weight: 0.06, use: "eat", hunger: 15 },
  { id: "beigne", name: "Beigne glacé", price: 2, desc: "Glaçage rose, café du coin.", icon: "cookie", kinds: ["depanneur", "food"], weight: 0.09, use: "eat", hunger: 20 },
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
  { id: "glock-19", name: "Glock 19", price: 850, desc: "9 mm, PAL restreinte. Semi-auto.", icon: "crosshair", kinds: ["chasse"], weight: 0.85, use: "tool" },
  { id: "revolver-357", name: "Revolver .357", price: 780, desc: "Six coups, PAL restreinte.", icon: "crosshair", kinds: ["chasse"], weight: 1.15, use: "tool" },
  { id: "desert-eagle", name: "Desert Eagle", price: 1600, desc: "Calibre massif. Prohibé au civil.", icon: "crosshair", kinds: [], weight: 1.8, use: "tool" },
  { id: "fusil-chasse-12", name: "Fusil calibre 12", price: 620, desc: "Double canon, PAL et permis faune.", icon: "crosshair", kinds: ["chasse"], weight: 3.3, use: "tool" },
  { id: "carabine-30-30", name: "Carabine .30-30", price: 700, desc: "Levier sous garde, cerf du comté.", icon: "crosshair", kinds: ["chasse"], weight: 3.2, use: "tool" },
  { id: "ar-semi-auto", name: "Carabine AR SQ", price: 3200, desc: "Semi-auto, réservée à la SQ.", icon: "crosshair", kinds: [], weight: 3.1, use: "tool" },
  { id: "couteau-chasse", name: "Couteau de chasse", price: 45, desc: "Lame fixe, camp et dépeçage.", icon: "axe", kinds: ["chasse"], weight: 0.35, use: "tool" },
  { id: "batte-baseball", name: "Batte de baseball", price: 25, desc: "Frêne, ligue de village.", icon: "hammer", kinds: ["quincaillerie"], weight: 0.95, use: "tool" },
  { id: "machette", name: "Machette", price: 60, desc: "Broussailles et érablière.", icon: "axe", kinds: ["quincaillerie", "chasse"], weight: 0.7, use: "tool" },
  { id: "hache-pompier", name: "Hache de pompier", price: 90, desc: "Tête acier, manche long.", icon: "axe", kinds: ["quincaillerie"], weight: 1.8, use: "tool" },
  { id: "poing-americain", name: "Poing américain", price: 35, desc: "Arme prohibée. Pas de vitrine.", icon: "gem", kinds: [], weight: 0.28, use: "tool" },
  { id: "taser", name: "Taser", price: 400, desc: "Cartouche unique. SQ seulement.", icon: "plus", kinds: [], weight: 0.4, use: "tool" },
  { id: "matraque-sq", name: "Matraque SQ", price: 0, desc: "Dotation Sûreté du Québec.", icon: "hammer", kinds: [], weight: 0.55, use: "tool" },
  { id: "spray-poivre", name: "Spray au poivre", price: 30, desc: "Autodéfense, derrière le comptoir.", icon: "plus", kinds: ["depanneur"], weight: 0.12, use: "tool" },
  { id: "flashbang", name: "Grenade assourdissante", price: 0, desc: "Intervention tactique SQ.", icon: "gem", kinds: [], weight: 0.35, use: "tool" },
  { id: "menottes", name: "Menottes", price: 0, desc: "Acier, double verrou. SQ.", icon: "key", kinds: [], weight: 0.38, use: "tool" },
  { id: "bobomb", name: "Bob-omb", price: 75, desc: "Bombe à mèche. Ne pas allumer au salon.", icon: "gem", kinds: [], weight: 0.8, use: "tool" },
  { id: "ammo_9mm", name: "Munitions 9 mm", price: 18, desc: "Boîte de 12, pistolet.", icon: "crosshair", kinds: ["chasse"], weight: 0.22 },
  { id: "ammo_357", name: "Munitions .357", price: 28, desc: "Boîte de 6, revolver.", icon: "crosshair", kinds: ["chasse"], weight: 0.24 },
  { id: "ammo_308", name: "Munitions .308", price: 24, desc: "Boîte de 8, carabine.", icon: "crosshair", kinds: ["chasse"], weight: 0.28 },
  { id: "ammo_545", name: "Munitions 5,45", price: 36, desc: "Chargeur AK-74. Illégal.", icon: "crosshair", kinds: [], weight: 0.35 },
  { id: "ammo_12", name: "Cartouches 12 ga", price: 22, desc: "Boîte de 8, pompe.", icon: "crosshair", kinds: ["chasse"], weight: 0.4 },
  { id: "ammo_556", name: "Munitions 5,56", price: 42, desc: "Chargeur d'assaut. Illégal.", icon: "crosshair", kinds: [], weight: 0.38 },
  { id: "weed", name: "Poche cannabis 3,5 g", price: 32, desc: "SQDC, séché, Portneuf. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.04, use: "drug", restricted: 21 },
  { id: "fleur_indica", name: "Fleur indica 3,5 g", price: 36, desc: "Relaxant, cultivé sous permis. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.04, use: "drug", restricted: 21 },
  { id: "fleur_sativa", name: "Fleur sativa 3,5 g", price: 36, desc: "Énergie, étiquette SQDC. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.04, use: "drug", restricted: 21 },
  { id: "huile", name: "Huile 30 ml", price: 48, desc: "Comptoir SQDC, compte-gouttes. 21 ans.", icon: "droplets", kinds: ["sqdc"], weight: 0.08, use: "drug", restricted: 21 },
  { id: "vape", name: "Cartouche vape", price: 42, desc: "510, rechargeable. 21 ans.", icon: "pill", kinds: ["sqdc"], weight: 0.05, use: "drug", restricted: 21 },
  { id: "preroll", name: "Péroulé", price: 8.5, desc: "Un joint, format unique. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.02, use: "drug", restricted: 21 },
  { id: "gelules", name: "Gélules 10 mg", price: 28, desc: "Boîte de 10, dose marquée. 21 ans.", icon: "pill", kinds: ["sqdc"], weight: 0.06, use: "drug", restricted: 21 },
  { id: "hash", name: "Hash 2 g", price: 22, desc: "Pressé, légal SQDC. 21 ans.", icon: "leaf", kinds: ["sqdc"], weight: 0.02, use: "drug", restricted: 21 },
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
  { id: "mais", name: "Épis de maïs", price: 8, desc: "Récolte du rang.", icon: "leaf", kinds: ["depanneur", "food"], harvest: true, weight: 0.8, use: "eat", hunger: 22 },
  { id: "ble", name: "Sac de blé", price: 11, desc: "Grain, moulin du comté.", icon: "leaf", kinds: ["depanneur"], harvest: true, weight: 1.2 },
  { id: "foin", name: "Balle de foin", price: 6, desc: "Première coupe.", icon: "leaf", kinds: ["depanneur"], harvest: true, weight: 1.6 },
  { id: "patate", name: "Patates du rang", price: 5, desc: "Sac de 5 kg.", icon: "leaf", kinds: ["depanneur", "food"], harvest: true, weight: 1.1, use: "eat", hunger: 18 },
  { id: "lait_rang", name: "Bidon de lait 4 L", price: 7, desc: "Holstein du Chemin du Roy, cru.", icon: "cup", kinds: ["depanneur"], harvest: true, weight: 4.1, use: "drink", thirst: 30 },
  { id: "oeufs", name: "Boîte d'œufs", price: 6, desc: "Poulailler du rang, la douzaine.", icon: "cookie", kinds: ["depanneur", "food"], harvest: true, weight: 0.7, use: "eat", hunger: 16 },
  { id: "corde_bois", name: "Corde de bois", price: 45, desc: "Érable et tremble, séchée. Poêle et foyer.", icon: "leaf", kinds: ["quincaillerie", "chasse"], weight: 8.4, use: "fuel" },
  { id: "eau_erable", name: "Seau d'eau d'érable", price: 3, desc: "Coulée, 20 L. Quatre seaux pour un sirop.", icon: "droplets", kinds: [], harvest: true, weight: 2.2 },
  { id: "lingot", name: "Lingot d'or", price: 420, desc: "Trouvé au bord du Chemin du Roy.", icon: "gem", kinds: [], harvest: true, weight: 0.9 },
  { id: "cristal_ether", name: "Cristal d'éther", price: 260, desc: "Pierre bleue, chaud au toucher.", icon: "gem", kinds: [], harvest: true, weight: 0.35 },
  { id: "fiole_ether", name: "Fiole magique", price: 180, desc: "Liquide violet, sent le pin.", icon: "pill", kinds: [], harvest: true, weight: 0.22 },
  { id: "pepite", name: "Pépite rare", price: 310, desc: "Or des Laurentides.", icon: "gem", kinds: [], harvest: true, weight: 0.4 },
  { id: "medaille_sq", name: "Médaille SQ", price: 90, desc: "Insigne oublié près du poste.", icon: "key", kinds: [], harvest: true, weight: 0.08 },
  { id: "cle_rouillee", name: "Clé rouillée", price: 40, desc: "Coffre ou cabanon, qui sait.", icon: "key", kinds: [], harvest: true, weight: 0.06 },
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
  {
    id: "shop_sqdc_portneuf",
    name: "SQDC Portneuf",
    villageId: "portneuf",
    kind: "sqdc",
    x: A40_EXITS[3]!.x + 108,
    z: 32,
    yaw: Math.PI,
    hours: "10 h – 21 h",
  },
  {
    id: "shop_sqdc_donnacona",
    name: "SQDC Donnacona",
    villageId: "donnacona",
    kind: "sqdc",
    x: A40_EXITS[5]!.x - 24,
    z: 42,
    yaw: Math.PI,
    hours: "10 h – 21 h",
  },
  {
    id: "shop_sqdc_raymond",
    name: "SQDC Saint-Raymond",
    villageId: "saint_raymond",
    kind: "sqdc",
    x: 940,
    z: -548,
    yaw: 0.55,
    hours: "10 h – 21 h",
  },
];

export function catalogFor(kind: ShopKind): ShopItem[] {
  return CATALOG.filter((t) => t.kinds.includes(kind) && !t.harvest);
}

export function sellPrice(item: ShopItem): number {
  return Math.max(1, Math.round(item.price * 0.6 * 100) / 100);
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
  const ammo = weaponAmmo(id);
  return ammo ?? null;
}

export function harvestRange(id: string | null | undefined): number {
  if (!id) return 0;
  return weaponHarvestRange(id);
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