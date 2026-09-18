
/**
 * Logique d'affichage et de prompt contextuel pour le Dépanneur
 */
export function depPrompt(
  aisle: DepAisleHot | null,
  garment: { itemId: string; x: number; z: number } | null,
  nearCaisse: boolean,
  atAtm: boolean,
  atBack: boolean,
  cartItemCount: number,
  isOwnerOrEmployee: boolean
): string | null {
  if (atAtm) {
    return "💳 [E] Utiliser le Guichet Automatique Desjardins";
  }
  if (nearCaisse) {
    return cartItemCount > 0
      ? `🛒 [E] Passer à la caisse (${cartItemCount} article${cartItemCount > 1 ? "s" : ""})`
      : "💬 [E] Parler au commis du dépanneur";
  }
  if (atBack) {
    return isOwnerOrEmployee
      ? "📦 [E] Gérer l'inventaire & stocks de l'arrière-boutique"
      : "⛔ Réservé aux employés";
  }
  if (aisle) {
    return `🔍 [E] Parcourir le rayon : ${aisle.id}`;
  }
  if (garment) {
    return `👕 [E] Examiner l'article : ${garment.itemId}`;
  }
  return null;
}
export const depPromptUI = {
  show(message: string): void { console.log('[Dépanneur UI]', message); },
  hide(): void {},
};




﻿/**
 * Dépanneur du comté de Portneuf — Version Évoluée
 * Architecture optimisée, rendu ultra-réaliste, interactions dynamiques, sons ambiants, et gameplay approfondi.
 * Compatible avec Three.js et TypeScript.
 * 
 * @author xblade benz (TroxTWorld)
 * @version 3.0
 */

import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { finishMap } from "./textures";
import type { ShopItemId, ShopSpot, ShopItem } from "./commerce";
import { itemById, shopNameFor } from "./commerce";
import type { BoutiqueGarment } from "./boutique";
import { villageCivicSpot, VILLAGES } from "./worlddata";
import { SHELF_FOOD, spawnShopFood } from "./food";

// ============================================
// 📦 TYPES & CONFIGURATION ÉTENDUS
// ============================================

type WallBox = { minX: number; maxX: number; minZ: number; maxZ: number };

export type DepAisle =
  | "caisse" | "frigo" | "rayon" | "loterie" | "tabac"
  | "biere" | "cafe" | "atm" | "arriere" | "menu" | "tables" | "dessert" | "boisson";

export interface DepAisleHot {
  id: string;
  label: string;
  hint: string;
  x: number;
  z: number;
  items: ShopItemId[];
  sound?: string; // ID du son ambiant pour cette allée
}

// 🎵 Sons ambiants (à charger avec Howler.js ou l'API Audio)
export interface AmbientSound {
  id: string;
  path: string;
  loop: boolean;
  volume: number;
}

// 💬 Dialogues dynamiques
export interface NPCDialogue {
  context: "caisse" | "frigo" | "rayon" | "biere" | "cafe" | "default";
  texts: string[];
}

// 🌍 Produits saisonniers
export const SEASONAL_ITEMS: Record<string, ShopItemId[]> = {
  winter: ["chocolat_chaud", "sel_deglacant", "cafe"],
  spring: ["fleurs", "plantes", "jus_orange"],
  summer: ["glace", "limonade", "biere", "slush"],
  fall: ["citrouille", "cidre", "beurre", "tarte_sucre"]
};

// 🕒 Horaires et météo
export interface WeatherState {
  isRaining: boolean;
  isSnowing: boolean;
  temperature: number; // en Celsius
}

export const DEP_OPEN_FROM = 6;
export const DEP_OPEN_TO = 23;

// 🛒 Système de panier
export interface CartItem {
  id: ShopItemId;
  quantity: number;
}

// ============================================
// 🎯 DONNÉES & CONFIGURATIONS
// ============================================

// 📌 Allées du dépanneur (avec sons et dialogues)
export const DEP_AISLES: Array<{ 
  id: DepAisle; 
  label: string; 
  hint: string; 
  items: ShopItemId[];
  sound?: string;
  dialogue?: string[];
}> = [
  {
    id: "caisse", 
    label: "Comptoir", 
    hint: "Caisse, steamé, croissant, journal.",
    items: ["hotdog", "journal", "croissant", "cafe"],
    sound: "cash_register",
    dialogue: [
      "Ça va être tout pour aujourd’hui?",
      "Vous voulez un sac?",
      "Bonne journée! Revenez nous voir!"
    ]
  },
  {
    id: "frigo", 
    label: "Frigos", 
    hint: "Lait, cola, eau, jus, œufs.",
    items: ["lait", "cola", "oeufs", "lait_rang", "eau", "jus_orange"],
    sound: "fridge_hum",
    dialogue: ["On a du lait frais!", "Les colas sont à -10% aujourd’hui!"]
  },
  {
    id: "rayon", 
    label: "Rayons", 
    hint: "Chips, pain, fruits, beurre, sirop d’érable.",
    items: ["chips", "pain", "beurre", "patate", "pomme", "croissant", "barre_chocolat", "sirop"],
    sound: "shelf_rustle",
    dialogue: ["Les chips sont en promotion!", "On a du pain frais de la boulangerie du coin."]
  },
  {
    id: "loterie", 
    label: "Loterie", 
    hint: "Loto-Québec, Lotto Max, 6/49.",
    items: ["loto", "lotto_max"],
    sound: "lotto_machine",
    dialogue: ["Essayez votre chance! Le prochain tirage est à 20h!"]
  },
  {
    id: "tabac", 
    label: "Tabac", 
    hint: "Derrière le comptoir. Interdit aux mineurs.",
    items: ["tabac", "cigarettes_du_maurier"],
    dialogue: ["Vous avez 18 ans ou plus?", "Un paquet de Du Maurier?"]
  },
  {
    id: "biere", 
    label: "Frigo à bière", 
    hint: "Bière froide : Boréale, Molson, Labatt 50.",
    items: ["biere", "boreale", "molson", "labatt_50"],
    sound: "beer_fizz",
    dialogue: ["Une bière bien froide?", "On a de la Boréale en promotion!"]
  },
  {
    id: "cafe", 
    label: "Café & Snacks", 
    hint: "Urne à café, slush, beigne, glace.",
    items: ["cafe", "slush", "glace", "beigne", "chocolat_chaud"],
    sound: "coffee_machine",
    dialogue: ["Un café? Il est frais!", "Les beignes sont sortis du four!"]
  },
  {
    id: "atm", 
    label: "Guichet", 
    hint: "Guichet automatique Desjardins.",
    items: [],
    sound: "atm_beep",
    dialogue: ["Retirez votre carte.", "Votre solde est de 1200$."]
  },
  {
    id: "arriere", 
    label: "Arrière-boutique", 
    hint: "Stock, personnel. Accès réservé.",
    items: [],
    dialogue: ["Désolé, c’est réservé au personnel."]
  }
];

// 🌦 État météo par défaut
export const DEFAULT_WEATHER: WeatherState = {
  isRaining: false,
  isSnowing: false,
  temperature: 15
};

// ============================================
// 🔧 FONCTIONS UTILITAIRES (OPTIMISÉES)
// ============================================

// 🕒 Vérifie si le dépanneur est ouvert
export function isDepOpen(hours: number): boolean {
  return hours >= DEP_OPEN_FROM && hours < DEP_OPEN_TO;
}

// ⏰ Formate les horaires d'ouverture
export function depHoursLabel(): string {
  return `Ouvert de ${DEP_OPEN_FROM} h à ${DEP_OPEN_TO} h`;
}

// 🗺 Génère les marqueurs de carte pour les dépanneurs
export function depMapMarks() {
  return VILLAGES.map((v) => {
    const p = villageCivicSpot(v, "shop");
    return { id: `shop_${v.id}`, name: shopNameFor(v), x: p.x, z: p.z };
  });
}

// 🔍 Trouve une allée par son ID
export function aisleById(id: string) {
  return DEP_AISLES.find((a) => a.id === id) ?? null;
}

// 🛒 Récupère le catalogue d'items pour une allée
export function catalogForAisle(aisle: string, season?: string): ShopItem[] {
  const spec = aisleById(aisle);
  if (!spec || spec.items.length === 0) return [];
  
  let items = spec.items.map((id) => itemById(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  
  // Ajouter les items saisonniers si applicable
  if (season && SEASONAL_ITEMS[season]) {
    const seasonalItems = SEASONAL_ITEMS[season]
      .map((id) => itemById(id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    items = [...items, ...seasonalItems];
  }
  
  return items;
}

// 🚪 Calcule l'offset de la porte du magasin
export function shopDoorOffset(s: Pick<ShopSpot, "x" | "z" | "yaw">, front = 4.35) {
  return { x: s.x + Math.sin(s.yaw) * front, z: s.z + Math.cos(s.yaw) * front, yaw: s.yaw };
}

// ⛽ Calcule l'offset de la pompe à essence
export function shopPumpOffset(s: Pick<ShopSpot, "x" | "z" | "yaw">, front = 10.4) {
  return { x: s.x + Math.sin(s.yaw) * front, z: s.z + Math.cos(s.yaw) * front };
}

// ============================================
// 🎨 CONSTRUCTEURS D'OBJETS 3D (REALISTES)
// ============================================

/**
 * Crée un box géométrique avec matériau partagé (Zero allocation matériau).
 */
function createBox(
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: number, metal = 0, rough = 0.7, 
  emissive = 0x000000, 
  emissiveIntensity = 0,
  castShadow = true,
  receiveShadow = true
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = matLib.get(color, rough, metal);
  if (emissive !== 0) {
    const emissiveMat = mat as THREE.Material & { emissive?: THREE.Color; emissiveIntensity?: number };
    if (emissiveMat.emissive instanceof THREE.Color) {
      emissiveMat.emissive.setHex(emissive);
      emissiveMat.emissiveIntensity = emissiveIntensity;
    }
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/**
 * Génère un panneau texturé procéduralement (avec cache).
 */

export interface DepPromptInterface {
  (message?: any, opts?: any): any;
  show(message: string): void;
  hide(): void;
}


const posterCache = new Map<string, THREE.Texture>();

function createPoster(
  text: string, 
  bgColor: string, 
  textColor = "#f4f0e6", 
  x: number, 
  y: number, 
  z: number, 
  w = 0.7, 
  h = 0.95, 
  rotY = 0,
  fontSize = 36
): THREE.Mesh {
  const cacheKey = `${text}:${bgColor}:${textColor}:${fontSize}`;
  
  // Utiliser le cache si disponible
  if (posterCache.has(cacheKey)) {
    const tex = posterCache.get(cacheKey)!;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    return mesh;
  }

  // Créer un nouveau canvas
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext("2d")!;
  
  // Fond
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 320);
  
  // Texte
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, 128, 160 + (i - (lines.length - 1) / 2) * fontSize * 1.2);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  posterCache.set(cacheKey, tex);
  
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  return mesh;
}

/**
 * Banque de frigos industriels réalistes avec néons.
 */
function createCoolerBank(
  x: number, 
  z: number, 
  count: number, 
  yaw: number, 
  glassColor = 0x7ec8e8,
  brand?: string
): THREE.Group {
  const group = new THREE.Group();
  const unitWidth = 0.92;
  const totalWidth = count * unitWidth;
  const height = 2.05;
  const depth = 0.78;

  // Structure principale (métal brossé)
  group.add(createBox(totalWidth + 0.12, height, depth, x, height / 2, z, 0xd8dde2, 0.45, 0.35));

  for (let i = 0; i < count; i++) {
    const offsetX = x - totalWidth / 2 + unitWidth / 2 + i * unitWidth;
    
    // Porte vitrée
    const doorGeo = new THREE.PlaneGeometry(unitWidth - 0.04, height - 0.25);
    const doorMat = matLib.glass(glassColor, 0.1, 0.05);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(offsetX, height / 2, z + depth / 2 - 0.01);
    door.castShadow = true;
    group.add(door);

    // Poignée chromée
    const handle = createBox(
      0.04, 0.45, 0.06, 
      offsetX + unitWidth / 2 - 0.15, 
      height / 2, 
      z + depth / 2 + 0.02, 
      0xc8ccd0, 0.9, 0.1
    );
    group.add(handle);

    // Néon intérieur (émissif)
    const lightStrip = createBox(
      unitWidth - 0.1, 0.04, 0.04, 
      offsetX, height - 0.1, z, 
      0xffffff, 0, 0, 0xaaddff, 1.5
    );
    group.add(lightStrip);

    // Logo de la marque (si spécifié)
    if (brand) {
      const logo = createPoster(
        brand, 
        "#ffffff", 
        "#000000", 
        offsetX, 
        height / 2 + 0.3, 
        z + depth / 2 + 0.01, 
        0.3, 
        0.2
      );
      group.add(logo);
    }
  }

  group.rotation.y = yaw;
  return group;
}

/**
 * Gondole d'épicerie standard avec étagères et produits.
 */
function createGondola(
  x: number, 
  z: number, 
  length: number,
  hasProducts = true
): THREE.Group {
  const group = new THREE.Group();
  const height = 1.42;
  const depth = 0.72;
  const woodColor = 0xc8b090;
  const metalColor = 0x8a8070;

  // Corps principal
  group.add(createBox(length, height, depth, x, height / 2, z, woodColor, 0.05, 0.85));

  // Étagères métalliques
  const shelfThickness = 0.03;
  const shelfPositions = [0.5, 0.95, 1.35];
  shelfPositions.forEach(y => {
    group.add(createBox(length, shelfThickness, depth + 0.04, x, y, z, 0xb0a080, 0.2, 0.6));
  });

  // Montants latéraux
  group.add(createBox(0.06, height, depth + 0.04, x - length / 2, height / 2, z, metalColor, 0.3, 0.5));
  group.add(createBox(0.06, height, depth + 0.04, x + length / 2, height / 2, z, metalColor, 0.3, 0.5));

  // Ajouter des produits sur les étagères (si activé)
  if (hasProducts) {
    const productPositions = [
      { x: x - 1.5, z: z, y: 0.6 },
      { x: x - 0.5, z: z, y: 0.6 },
      { x: x + 0.5, z: z, y: 0.6 },
      { x: x + 1.5, z: z, y: 0.6 },
      { x: x - 1.5, z: z, y: 1.0 },
      { x: x - 0.5, z: z, y: 1.0 },
      { x: x + 0.5, z: z, y: 1.0 },
      { x: x + 1.5, z: z, y: 1.0 },
    ];
    
    productPositions.forEach(pos => {
      // Placeholder pour les produits (à remplacer par des modèles 3D)
      const product = createBox(0.1, 0.15, 0.1, pos.x, pos.y, pos.z + 0.05, 0xffffff, 0, 0.8);
      group.add(product);
    });
  }

  return group;
}

/**
 * Crée une urne à café réaliste.
 */
function createCoffeeUrn(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  
  // Corps de l'urne (cylindre)
  const urnGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.5, 20);
  const urnMaterial = matLib.get(0x2a2a2e, 0.3, 0.6);
  const urn = new THREE.Mesh(urnGeometry, urnMaterial);
  urn.position.set(x, y + 0.25, z);
  group.add(urn);

  // Poignée
  const handle = createBox(0.05, 0.1, 0.05, x + 0.1, y + 0.25, z, 0xc8ccd0, 0.9, 0.1);
  group.add(handle);

  // Bec verseur
  const spout = createBox(0.08, 0.05, 0.15, x - 0.05, y + 0.4, z, 0x2a2a2e, 0.3, 0.6);
  group.add(spout);

  // Bouton
  const button = createBox(0.03, 0.03, 0.03, x, y + 0.3, z + 0.1, 0xff0000, 0.5, 0.1);
  group.add(button);

  return group;
}

/**
 * Crée une machine à slush réaliste.
 */
function createSlushMachine(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  
  // Corps principal
  const base = createBox(0.4, 0.6, 0.4, x, y + 0.3, z, 0xc03050, 0.2, 0.4);
  group.add(base);

  // Réservoir transparent (slush bleu)
  const reservoirGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16);
  const reservoirMaterial = matLib.glass(0x88c9ff, 0.1, 0.05);
  const reservoir = new THREE.Mesh(reservoirGeometry, reservoirMaterial);
  reservoir.position.set(x, y + 0.5, z);
  group.add(reservoir);

  // Bec verseur
  const spout = createBox(0.05, 0.05, 0.1, x + 0.1, y + 0.4, z, 0x2a2a2e, 0.3, 0.6);
  group.add(spout);

  // Lumière émise par la machine
  const light = createBox(0.02, 0.02, 0.02, x, y + 0.55, z, 0xffffff, 0, 0, 0xe04060, 0.8);
  group.add(light);

  return group;
}

/**
 * Crée un guichet ATM réaliste.
 */
function createATM(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  
  // Corps principal
  const atmBox = createBox(0.6, 1.4, 0.3, x, y + 0.7, z, 0x1a3a32, 0.25, 0.4);
  group.add(atmBox);

  // Écran
  const screen = createBox(0.35, 0.25, 0.02, x - 0.1, y + 1.15, z + 0.16, 0x8ad0a0, 0, 0, 0x8ad0a0, 1.5);
  screen.rotation.y = -Math.PI / 2;
  group.add(screen);

  // Clavier numérique
  const keypad = createBox(0.1, 0.05, 0.2, x, y + 0.8, z + 0.16, 0x2a2a2e, 0.5, 0.3);
  group.add(keypad);

  // Fente pour la carte
  const cardSlot = createBox(0.05, 0.02, 0.05, x + 0.15, y + 1.0, z + 0.16, 0x000000, 0.8, 0.2);
  group.add(cardSlot);

  return group;
}

/**
 * Crée un congélateur coffre réaliste.
 */
function createChestFreezer(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  
  // Corps principal
  const chest = createBox(1.3, 0.8, 0.7, x, y + 0.4, z, 0xe8eef2, 0.1, 0.2);
  group.add(chest);

  // Couvercle
  const lid = createBox(1.25, 0.05, 0.65, x, y + 0.85, z, 0xa8d0e8, 0.2, 0.4);
  group.add(lid);

  // Poignée
  const handle = createBox(0.1, 0.05, 0.1, x, y + 0.85, z + 0.3, 0xc8ccd0, 0.9, 0.1);
  group.add(handle);

  return group;
}

/**
 * Crée une porte réaliste avec animation.
 */
function createDoor(
  x: number, 
  y: number, 
  z: number, 
  width: number = 1.0, 
  height: number = 2.1, 
  color: number = QC_PALETTE.porte
): THREE.Group {
  const group = new THREE.Group();
  
  // Porte
  const door = createBox(width, height, 0.1, x, y + height / 2, z, color, 0.8, 0.2);
  group.add(door);

  // Poignée
  const handle = createBox(0.05, 0.1, 0.05, x + width / 2 - 0.1, y + 1.0, z + 0.06, 0xc8ccd0, 0.9, 0.1);
  group.add(handle);

  // Ajouter des données pour l'animation
  group.userData = {
    isOpen: false,
    door: door,
    initialRotation: door.rotation.y,
    targetRotation: Math.PI / 2
  };

  return group;
}

// ============================================
// 🌍 CONSTRUCTEUR PRINCIPAL (DEPANNEUR)
// ============================================

export interface DepanneurResult {
  group: THREE.Group;
  spawn: THREE.Vector3;
  spawnYaw: number;
  exit: THREE.Vector3;
  walls: WallBox[];
  title: string;
  subtitle: string;
  garments: BoutiqueGarment[];
  caisse: { x: number; z: number };
  aisles: DepAisleHot[];
  atmSpot: { x: number; z: number };
  backRoom: { x: number; z: number };
  sounds: AmbientSound[];
  npcs: { position: THREE.Vector3; dialogue: string[] }[];
}

export function buildDepanneurInterior(season?: string, weather?: WeatherState): DepanneurResult {
  const group = new THREE.Group();
  group.name = "interieur_depanneur";

  // Dimensions
  const W = 12.6;
  const D = 11.4;
  const H = 3.15;
  
  const walls: WallBox[] = [];
  const garments: BoutiqueGarment[] = [];
  const aisles: DepAisleHot[] = [];
  const sounds: AmbientSound[] = [];
  const npcs: { position: THREE.Vector3; dialogue: string[] }[] = [];

  // ============================================
  // 🏗 STRUCTURE DE BASE (SOL, MURS, PLAFOND)
  // ============================================

  // --- SOL ---
  // Sol carrelage industriel
  const floorMat = matLib.get(0xc4b49a, 0.9, 0.05);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Tapis d'entrée
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 1, D - 1), 
    matLib.get(0xd8c8a8, 0.95, 0)
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.01;
  group.add(rug);

  // Effets météo sur le sol
  if (weather?.isRaining) {
    const rainPuddles = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2), 
      matLib.get(0x3a6b8a, 0.9, 0.1)
    );
    rainPuddles.rotation.x = -Math.PI / 2;
    rainPuddles.position.set(-3, 0.02, -4);
    group.add(rainPuddles);
  }
  if (weather?.isSnowing) {
    const snowLayer = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D), 
      matLib.get(0xffffff, 0.95, 0.1)
    );
    snowLayer.rotation.x = -Math.PI / 2;
    snowLayer.position.y = 0.01;
    group.add(snowLayer);
  }

  // --- PLAFOND ---
  const ceilMat = matLib.get(0xe8e4d8, 0.9, 0);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);

  // --- MURS ---
  const wallMat = matLib.get(QC_PALETTE.boisCreme, 0.8, 0.1);
  const wallThickness = 0.22;
  
  // Murs extérieurs
  group.add(createBox(W, H, wallThickness, 0, H/2, -D/2, QC_PALETTE.boisCreme));
  group.add(createBox(W, H, wallThickness, 0, H/2, D/2, QC_PALETTE.boisCreme));
  group.add(createBox(wallThickness, H, D, -W/2, H/2, 0, QC_PALETTE.boisCreme));
  group.add(createBox(wallThickness, H, D, W/2, H/2, 0, QC_PALETTE.boisCreme));

  // Définition des colliders murs
  walls.push(
    { minX: -W/2, maxX: W/2, minZ: -D/2 - 0.1, maxZ: -D/2 + 0.1 },
    { minX: -W/2, maxX: W/2, minZ: D/2 - 0.1, maxZ: D/2 + 0.1 },
    { minX: -W/2 - 0.1, maxX: -W/2 + 0.1, minZ: -D/2, maxZ: D/2 },
    { minX: W/2 - 0.1, maxX: W/2 + 0.1, minZ: -D/2, maxZ: D/2 }
  );

  // Bandeau rouge typique des dépanneurs
  const stripe = createBox(W - 0.4, 0.2, 0.05, 0, 2.4, D/2 - 0.15, 0xc03028, 0.1, 0.4);
  group.add(stripe);

  // ============================================
  // 💡 ÉCLAIRAGE DYNAMIQUE
  // ============================================

  // Lumière ambiante de base
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  group.add(ambientLight);

  // Néons longs au plafond
  const tubeMat = matLib.getEmissive(0xffffff, 0xfff8e0, 1.2);
  [-3.6, 0, 3.6].forEach(x => {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.2), tubeMat);
    tube.position.set(x, H - 0.15, 0);
    tube.castShadow = true;
    group.add(tube);
    
    // Ajouter une lumière ponctuelle pour chaque néon
    const tubeLight = new THREE.PointLight(0xfff8e0, 1.5, 10);
    tubeLight.position.set(x, H - 0.2, 0);
    group.add(tubeLight);
  });

  // Lumière principale
  const mainLight = new THREE.PointLight(0xffeebb, 1.2, 20, 1.5);
  mainLight.position.set(0, 2.8, 0);
  mainLight.castShadow = true;
  mainLight.shadow.bias = -0.0001;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  group.add(mainLight);

  // Lumière d'accentuation (bleutée)
  const accentLight = new THREE.PointLight(0xe0f0ff, 0.4, 12, 2);
  accentLight.position.set(-4, 2.5, -3);
  group.add(accentLight);

  // ============================================
  // 🛒 ZONES FONCTIONNELLES
  // ============================================

  // 1. FRIGOS MURAUX (Gauche)
  const coolerLeft = createCoolerBank(-4.85, -0.4, 4, 0, 0x7ec8e8, "LAIT\nCOLA\nEAU");
  group.add(coolerLeft);
  walls.push({ minX: -5.9, maxX: -3.8, minZ: -2.3, maxZ: 1.5 });
  aisles.push({
    id: "frigo", 
    label: "Frigos", 
    hint: "Lait, cola, eau, jus, œufs.", 
    x: -3.6, 
    z: -0.4, 
    items: ["lait", "cola", "oeufs", "lait_rang", "eau", "jus_orange"]
  });
  sounds.push({ id: "fridge_hum", path: "/sounds/fridge_hum.mp3", loop: true, volume: 0.1 });

  // 2. FRIGOS À BIÈRE (Fond)
  const coolerBack = createCoolerBank(-1.1, -4.85, 5, 0, 0x4a6a48, "BIÈRE\nFROIDE");
  group.add(coolerBack);
  walls.push({ minX: -3.5, maxX: 1.3, minZ: -5.5, maxZ: -4.2 });
  aisles.push({
    id: "biere", 
    label: "Frigo à bière", 
    hint: "Bière froide : Boréale, Molson, Labatt 50.", 
    x: -1.1, 
    z: -3.9, 
    items: ["biere", "boreale", "molson", "labatt_50"]
  });
  sounds.push({ id: "beer_fizz", path: "/sounds/beer_fizz.mp3", loop: false, volume: 0.3 });

  // 3. GONDOLES CENTRALES
  const gondola1 = createGondola(-1.15, 1.35, 4.4);
  const gondola2 = createGondola(1.85, 1.35, 3.6);
  group.add(gondola1);
  group.add(gondola2);
  
  walls.push(
    { minX: -3.4, maxX: 1.1, minZ: 0.95, maxZ: 1.75 },
    { minX: 0.05, maxX: 3.7, minZ: 0.95, maxZ: 1.75 }
  );
  aisles.push({
    id: "rayon", 
    label: "Rayons", 
    hint: "Chips, pain, fruits, beurre, sirop d’érable.", 
    x: 0.2, 
    z: 1.35, 
    items: ["chips", "pain", "beurre", "patate", "pomme", "croissant", "barre_chocolat", "sirop"]
  });
  sounds.push({ id: "shelf_rustle", path: "/sounds/shelf_rustle.mp3", loop: false, volume: 0.2 });

  // 4. COMPTOIR & CAISSE (Droite)
  const counterBase = createBox(3.6, 1.1, 0.9, 3.85, 0.55, -3.55, 0x3a3a3e, 0.15, 0.45);
  const counterTop = createBox(3.65, 0.05, 0.96, 3.85, 1.12, -3.55, 0x2a2a2e, 0.3, 0.35);
  group.add(counterBase);
  group.add(counterTop);

  // Caisse enregistreuse (avec écran)
  const tillBase = createBox(0.35, 0.2, 0.25, 3.2, 1.35, -3.35, 0x1a1a1a, 0.8, 0.2);
  group.add(tillBase);
  
  // Écran de la caisse (texture dynamique)
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 128;
  screenCanvas.height = 64;
  const screenCtx = screenCanvas.getContext("2d")!;
  screenCtx.fillStyle = "#000";
  screenCtx.fillRect(0, 0, 128, 64);
  screenCtx.fillStyle = "#0f0";
  screenCtx.font = "12px Arial";
  screenCtx.fillText("TOTAL: 0.00 $", 10, 20);
  screenCtx.fillText("ITEMS: 0", 10, 40);

  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.08),
    new THREE.MeshBasicMaterial({ map: screenTexture })
  );
  screen.position.set(3.2, 1.4, -3.3);
  screen.rotation.x = -Math.PI / 4;
  group.add(screen);

  // Machine à loterie
  const loto = createBox(0.5, 0.4, 0.2, 4.45, 1.42, -3.4, 0x1a1a3a, 0.6, 0.3);
  const lotoScreen = createPoster("LOTO\nQUÉBEC", "#1a3a7a", "#ffffff", 4.45, 1.5, -3.35, 0.3, 0.2);
  group.add(loto);
  group.add(lotoScreen);

  walls.push({ minX: 2.0, maxX: 5.7, minZ: -4.15, maxZ: -3.0 });
  aisles.push(
    {
      id: "caisse", 
      label: "Comptoir", 
      hint: "Caisse, steamé, journal, café.", 
      x: 3.4, 
      z: -2.7, 
      items: ["hotdog", "journal", "croissant", "cafe"]
    },
    {
      id: "loterie", 
      label: "Loterie", 
      hint: "Loto-Québec, Lotto Max, 6/49.", 
      x: 4.45, 
      z: -2.7, 
      items: ["loto", "lotto_max"]
    },
    {
      id: "tabac", 
      label: "Tabac", 
      hint: "Derrière le comptoir. Interdit aux mineurs.", 
      x: 5.15, 
      z: -3.9, 
      items: ["tabac", "cigarettes_du_maurier"]
    }
  );
  sounds.push({ id: "cash_register", path: "/sounds/cash_register.mp3", loop: false, volume: 0.4 });

  // Ajouter un NPC caissier
  npcs.push({
    position: new THREE.Vector3(3.85, 0, -3.2),
    dialogue: [
      "Bonjour! Je peux vous aider?",
      "Ça va être tout pour aujourd’hui?",
      "Vous voulez un sac?",
      "Bonne journée! Revenez nous voir!"
    ]
  });

  // 5. COIN CAFÉ & SLUSH
  const coffeeStation = createBox(0.7, 1.0, 0.7, 5.15, 0.5, -1.15, 0x8a9094, 0.4, 0.35);
  group.add(coffeeStation);
  
  // Urne à café
  const urn = createCoffeeUrn(5.15, 1.0, -1.15);
  group.add(urn);

  // Machine à slush
  const slush = createSlushMachine(5.15, 1.0, -0.55);
  group.add(slush);

  aisles.push({
    id: "cafe", 
    label: "Café & Snacks", 
    hint: "Urne à café, slush, beigne, glace.", 
    x: 4.4, 
    z: -0.85, 
    items: ["cafe", "slush", "glace", "beigne", "chocolat_chaud"]
  });
  sounds.push({ id: "coffee_machine", path: "/sounds/coffee_machine.mp3", loop: true, volume: 0.15 });

  // 6. GUICHET ATM
  const atm = createATM(5.85, 0, 2.4);
  group.add(atm);
  aisles.push({
    id: "atm", 
    label: "Guichet", 
    hint: "Guichet automatique Desjardins.", 
    x: 4.9, 
    z: 2.4, 
    items: []
  });
  sounds.push({ id: "atm_beep", path: "/sounds/atm_beep.mp3", loop: false, volume: 0.3 });

  // 7. CONGÉLATEUR COFFRE (Glaces)
  const chestFreezer = createChestFreezer(-4.7, 0, 3.55);
  group.add(chestFreezer);

  // 8. PORTE ARRIÈRE
  const backDoor = createDoor(5.4, 0, -5.55, 1.0, 2.1, QC_PALETTE.porte);
  group.add(backDoor);
  aisles.push({
    id: "arriere", 
    label: "Arrière-boutique", 
    hint: "Stock, personnel. Accès réservé.", 
    x: 4.6, 
    z: -4.85, 
    items: []
  });

  // ============================================
  // 📢 DÉCORATIONS & POSTERS
  // ============================================

  // Posters publicitaires
  group.add(createPoster("LOTO\nQUÉBEC", "#1a3a7a", "#ffffff", 2.4, 1.85, -D/2 + 0.14));
  group.add(createPoster("BIÈRE\nFROIDE", "#2a4a28", "#ffffff", -4.9, 2.05, -D/2 + 0.14));
  group.add(createPoster("OUVERT\n24/7", "#c03028", "#ffffff", -2.2, 2.55, D/2 - 0.14, 1.0, 0.35));
  group.add(createPoster("PROMO\nCHIPS 2$", "#ffcc00", "#000000", 1.5, 2.0, -D/2 + 0.14, 0.8, 0.4));
  group.add(createPoster("DESJARDINS", "#006e4f", "#ffffff", 5.85, 1.8, 2.4, 0.6, 0.3));

  // ============================================
  // 🍎 PRODUITS (Items)
  // ============================================

  // Liste des positions des produits
  const productSpots = [
    // Frigo gauche
    { id: "lait", x: -4.9, z: 0.6, y: 1.35 },
    { id: "cola", x: -4.9, z: -0.2, y: 1.35 },
    { id: "oeufs", x: -4.9, z: -1.1, y: 1.35 },
    { id: "jus_orange", x: -4.9, z: -1.8, y: 1.35 },
    { id: "eau", x: -4.0, z: -1.8, y: 1.35 },
    
    // Gondoles
    { id: "chips", x: -2.2, z: 1.75, y: 1.2 },
    { id: "pain", x: -0.4, z: 1.75, y: 1.2 },
    { id: "patate", x: 1.4, z: 1.75, y: 1.2 },
    { id: "beurre", x: 2.6, z: 1.75, y: 1.2 },
    { id: "sirop", x: 0.8, z: 1.75, y: 1.2 },
    { id: "barre_chocolat", x: -1.5, z: 1.75, y: 0.8 },
    
    // Frigo à bière
    { id: "biere", x: -1.1, z: -4.4, y: 1.35 },
    { id: "boreale", x: -0.2, z: -4.4, y: 1.35 },
    { id: "molson", x: 0.7, z: -4.4, y: 1.35 },
    { id: "labatt_50", x: 1.6, z: -4.4, y: 1.35 },
    
    // Comptoir
    { id: "hotdog", x: 3.85, z: -3.05, y: 1.35 },
    { id: "journal", x: 2.85, z: -3.05, y: 1.28 },
    { id: "croissant", x: 3.4, z: -3.05, y: 1.3 },
    
    // Café
    { id: "cafe", x: 5.15, z: -1.15, y: 1.55 },
    { id: "chocolat_chaud", x: 5.15, z: -1.15, y: 1.55 },
    { id: "slush", x: 5.15, z: -0.55, y: 1.6 },
    { id: "beigne", x: 5.15, z: -0.8, y: 1.4 },
    
    // Loterie
    { id: "loto", x: 4.45, z: -3.05, y: 1.55 },
    { id: "lotto_max", x: 4.45, z: -2.8, y: 1.55 },
    
    // Tabac
    { id: "tabac", x: 5.2, z: -3.9, y: 1.55 },
    { id: "cigarettes_du_maurier", x: 5.2, z: -3.7, y: 1.55 },
    
    // Congélateur
    { id: "glace", x: -4.7, z: 3.55, y: 0.9 },
    
    // Produits saisonniers (si applicable)
    ...(season ? SEASONAL_ITEMS[season].map((id, i) => ({
      id,
      x: -3.5 + i * 0.5,
      z: 2.5,
      y: 1.2
    })) : [])
  ];

  // Ajout des produits visuels
  productSpots.forEach(s => {
    const itemDef = itemById(s.id);
    if (!itemDef) return;
    
    // Créer un mesh pour le produit (placeholder)
    const color = (itemDef as any).color || 0xffffff;
    const prodMesh = createBox(0.15, 0.2, 0.15, s.x, s.y, s.z + 0.05, color, 0, 0.8);
    group.add(prodMesh);
    garments.push({ itemId: s.id, x: s.x, z: s.z });
  });

  // Ajout des aliments générés procéduralement
  SHELF_FOOD.forEach(s => {
    const food = spawnShopFood(s.id, new THREE.Vector3(s.x, s.y, s.z), s.scale ?? 1.2, Math.round(s.x * 17 + s.z * 9));
    if (food) {
      if (s.rot) food.rotation.y = s.rot;
      group.add(food);
      if (!garments.some(g => g.itemId === s.id && Math.hypot(g.x - s.x, g.z - s.z) < 0.3)) {
        garments.push({ itemId: s.id, x: s.x, z: s.z });
      }
    }
  });

  // ============================================
  // 🚪 PANNEAU DE SORTIE LUMINEUX
  // ============================================
  const exitSign = createBox(1.5, 0.3, 0.05, 0, 2.6, D/2 - 0.15, 0x8fa8b8, 0, 0, 0xc8dce8, 0.8);
  group.add(exitSign);

  // ============================================
  // 🎵 SONS AMBIANTS (à initialiser dans le jeu)
  // ============================================
  sounds.push(
    { id: "radio", path: "/sounds/radio_quebec.mp3", loop: true, volume: 0.2 },
    { id: "footsteps", path: "/sounds/footsteps.mp3", loop: false, volume: 0.3 }
  );

  // ============================================
  // 🎭 NPC ADDITIONNELS
  // ============================================
  // Client 1 (devant le frigo)
  npcs.push({
    position: new THREE.Vector3(-4.5, 0, -0.5),
    dialogue: ["Hmm, quelle bière choisir?", "Je prends une Molson."]
  });

  // Client 2 (devant les gondoles)
  npcs.push({
    position: new THREE.Vector3(0, 0, 1.5),
    dialogue: ["Les chips sont en promo?", "Je prends un sac."]
  });

  // ============================================
  // 📤 RETOUR DU CONSTRUCTEUR
  // ============================================
  return {
    group,
    spawn: new THREE.Vector3(0, 0, D/2 - 1.8),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, D/2 - 0.5),
    walls,
    title: "Dépanneur du Comté",
    subtitle: `Comptoir · Frigos · Loterie · ${depHoursLabel()} · ${season ? `Saison: ${season}` : ''}`,
    garments,
    caisse: { x: 3.85, z: -3.55 },
    aisles,
    atmSpot: { x: 5.2, z: 2.4 },
    backRoom: { x: 5.2, z: -5.1 },
    sounds,
    npcs
  };
}

// ============================================
// 💬 SYSTÈME DE DIALOGUE DYNAMIQUE
// ============================================

export function getNPCDialogue(
  aisle: DepAisleHot | null,
  garment: BoutiqueGarment | null,
  atCaisse: boolean,
  atAtm: boolean,
  atBack: boolean,
  cart: CartItem[],
  owner: boolean,
  npcs: { position: THREE.Vector3; dialogue: string[] }[],
  playerPosition: THREE.Vector3
): string | null {
  // Vérifier si le joueur est proche d'un NPC
  for (const npc of npcs) {
    const distance = npc.position.distanceTo(playerPosition);
    if (distance < 2.0) {
      const randomIndex = Math.floor(Math.random() * npc.dialogue.length);
      return npc.dialogue[randomIndex];
    }
  }

  // Dialogues basés sur l'allée
  if (atCaisse) {
    return cart.length > 0
      ? `E — Caisse · ${cart.length} article${cart.length > 1 ? "s" : ""} · Total: ${calculateCartTotal(cart)}$`
      : "E — Caisse · panier vide";
  }
  if (atAtm) return "E — Guichet Desjardins · Retirez votre carte";
  if (atBack) return owner ? "E — Stock · arrière-boutique" : "Personnel seulement";
  
  if (aisle) {
    if (aisle.id === "atm") return "E — Guichet Desjardins · Retirez votre carte";
    if (aisle.id === "arriere") return owner ? "E — Stock · arrière-boutique" : "Personnel seulement";
    if (aisle.id === "caisse") {
      return cart.length > 0
        ? `E — Caisse · ${cart.length} article${cart.length > 1 ? "s" : ""}`
        : "E — Comptoir · Bonjour!";
    }
    if (aisle.id === "loterie") {
      return "E — Loterie · Essayez votre chance! Prochain tirage à 20h";
    }
    if (aisle.id === "tabac") {
      return "E — Tabac · Vous avez 18 ans ou plus?";
    }
    return `E — ${aisle.label} · ${aisle.hint}`;
  }

  // Dialogue par défaut
  return null;
}

// ============================================
// 🛒 SYSTÈME DE PANIER & PAIEMENT
// ============================================

// Calcule le total du panier
export function calculateCartTotal(cart: CartItem[]): string {
  const total = cart.reduce((sum, item) => {
    const itemDef = itemById(item.id);
    return sum + (itemDef ? itemDef.price * item.quantity : 0);
  }, 0);
  return total.toFixed(2);
}

// Ajoute un item au panier
export function addToCart(cart: CartItem[], itemId: ShopItemId): CartItem[] {
  const existingItem = cart.find(item => item.id === itemId);
  if (existingItem) {
    return cart.map(item =>
      item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
  }
  return [...cart, { id: itemId, quantity: 1 }];
}

// Retire un item du panier
export function removeFromCart(cart: CartItem[], itemId: ShopItemId): CartItem[] {
  return cart.map(item =>
    item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
  ).filter(item => item.quantity > 0);
}

// Vider le panier
export function clearCart(): CartItem[] {
  return [];
}

// ============================================
// 🎮 SYSTÈME DE MISSIONS
// ============================================

export interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  requirements: {
    itemId?: ShopItemId;
    quantity?: number;
    location?: { x: number; z: number };
  };
}

// Missions disponibles
export const DEP_MISSIONS: Mission[] = [
  {
    id: "lait_voisine",
    title: "Aide à la voisine",
    description: "Allez chercher une bouteille de lait pour la voisine. Elle vous attend devant le dépanneur.",
    reward: 5,
    completed: false,
    requirements: { itemId: "lait", quantity: 1 }
  },
  {
    id: "loto_gagnant",
    title: "Le billet gagnant",
    description: "Achetez un billet de loterie. Peut-être que vous aurez de la chance!",
    reward: 100,
    completed: false,
    requirements: { itemId: "loto", quantity: 1 }
  },
  {
    id: "biere_amies",
    title: "Bière pour les amis",
    description: "Achetez 6 bières pour vos amis. Ils vous attendent à l'extérieur.",
    reward: 20,
    completed: false,
    requirements: { itemId: "biere", quantity: 6 }
  }
];

// Vérifie si une mission est complète
export function checkMissionCompletion(mission: Mission, cart: CartItem[]): boolean {
  if (mission.completed) return true;
  
  if (mission.requirements.itemId) {
    const cartItem = cart.find(item => item.id === mission.requirements.itemId);
    if (!cartItem) return false;
    if (mission.requirements.quantity && cartItem.quantity < mission.requirements.quantity) {
      return false;
    }
  }
  
  return true;
}

// ============================================
// 🌦 SYSTÈME DE MÉTÉO & TEMPS
// ============================================

// Met à jour l'éclairage en fonction de l'heure
export function updateDepanneurLighting(
  scene: THREE.Scene,
  hour: number,
  weather: WeatherState = DEFAULT_WEATHER
) {
  const isDay = hour >= 6 && hour < 18;
  const intensityMultiplier = isDay ? 1.0 : 0.4;
  
  // Mettre à jour l'arrière-plan
  if (isDay) {
    scene.background = new THREE.Color(0x87CEEB); // Ciel bleu
  } else {
    scene.background = new THREE.Color(0x000033); // Nuit
  }
  
  // Mettre à jour les lumières
  scene.traverse((obj) => {
    if (obj instanceof THREE.PointLight) {
      obj.intensity = obj.userData.baseIntensity || obj.intensity;
      if (!isDay) {
        obj.intensity *= 1.5; // Plus brillant la nuit
      }
    }
    if (obj instanceof THREE.DirectionalLight) {
      obj.intensity = isDay ? 1.0 : 0.1;
    }
  });
  
  // Ajouter des effets de pluie/neige si nécessaire
  if (weather.isRaining) {
    // Ici, tu pourrais ajouter des particules de pluie
    console.log("Il pleut! Ajoutez des effets de pluie.");
  }
  if (weather.isSnowing) {
    console.log("Il neige! Ajoutez des effets de neige.");
  }
}

// ============================================
// 🎵 GESTION DES SONS (à utiliser avec Howler.js)
// ============================================

// Initialise les sons ambiants
export function initAmbientSounds(sounds: AmbientSound[]) {
  // Exemple avec Howler.js (à installer: npm install howler)
  // import { Howl } from 'howler';
  
  const soundInstances: Record<string, any> = {};
  
  sounds.forEach(sound => {
    try {
      // soundInstances[sound.id] = new Howl({
      //   src: [sound.path],
      //   loop: sound.loop,
      //   volume: sound.volume
      // });
      // if (sound.loop) {
      //   soundInstances[sound.id].play();
      // }
      console.log(`Son chargé: ${sound.id} (${sound.path})`);
    } catch (e) {
      console.error(`Erreur lors du chargement du son ${sound.id}:`, e);
    }
  });
  
  return soundInstances;
}

// Joue un son spécifique
export function playSound(soundId: string, soundInstances: Record<string, any>) {
  if (soundInstances[soundId]) {
    soundInstances[soundId].play();
  }
}

// ============================================
// 🚀 FONCTION PRINCIPALE POUR DEMARRER
// ============================================

// Exemple d'initialisation du dépanneur
export function initDepanneur(
  scene: THREE.Scene,
  season?: string,
  weather?: WeatherState
): DepanneurResult {
  const result = buildDepanneurInterior(season, weather);
  scene.add(result.group);
  
  // Initialiser les sons
  const soundInstances = initAmbientSounds(result.sounds);
  
  // Mettre à jour l'éclairage
  const currentHour = 12; // À remplacer par l'heure actuelle dans ton jeu
  updateDepanneurLighting(scene, currentHour, weather || DEFAULT_WEATHER);
  
  return result;
}