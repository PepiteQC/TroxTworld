/**
 * 🎯 CATALOGUE DES ARMES — TROXTWORLD (v5.0 PLATINUM)
 * Fichier: src/game/weapons.ts
 * Définition complète de toutes les armes, munitions, mods et systèmes associés.
 * 
 * CHANGELOG v5.0:
 * - Ajout export weaponAmmo (fix commerce.ts)
 * - Système de mods/attachments
 * - Variantes régionales québécoises
 * - Dégradation & fiabilité mécanique
 * - Fonctions commerce/inventaire avancées
 */

import * as THREE from "three";

// ============================================================================
// 🔹 TYPES DE BASE
// ============================================================================

/** Type de classe légale (selon les lois canadiennes). */
export type LegalClass =
  | "libre"
  | "sans_restriction"
  | "restreinte"
  | "prohibee"
  | "artisanale_illegale";

/** Type de catégorie d'arme. */
export type WeaponCategory =
  | "melee"
  | "poing"
  | "fusil_chasse"
  | "carabine"
  | "tactique_auto"
  | "non_letal"
  | "outil_police";

/** Type de rareté. */
export type WeaponRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "contrabande";

/** Source de l'arme. */
export type WeaponSource =
  | "chasse_pro"
  | "dealer_noir"
  | "quincaillerie"
  | "depanneur"
  | "sq_arsenal"
  | "grc_armory"
  | "prison_craft"
  | "gang_fabrication"
  | "military_surplus";

/** Type de calibre de munition. */
export type AmmoCaliber =
  | "ammo_9mm"
  | "ammo_40sw"
  | "ammo_357"
  | "ammo_45acp"
  | "ammo_50ae"
  | "ammo_12g_buckshot"
  | "ammo_12g_slug"
  | "ammo_12g_rubber"
  | "ammo_12g_birdshot"
  | "ammo_30_30"
  | "ammo_308"
  | "ammo_556"
  | "ammo_762x39"
  | "ammo_545x39"
  | "ammo_22lr"
  | "ammo_taser_cartridge"
  | "ammo_pepper_ball"
  | "ammo_flare";

/** ID des armes. */
export type WeaponId =
  // 🗡️ Armes blanches & Outils
  | "poing-americain"
  | "couteau-chasse"
  | "batte-baseball"
  | "machette"
  | "hache-pompier"
  | "surin-prison"
  | "pied-de-biche"
  | "karambit-tactique"
  | "tonfa-sq"
  | "baionnette-m4"

  // 🔫 Armes de poing
  | "glock-19"
  | "glock-17-sq"
  | "glock-switch-auto"
  | "revolver-357"
  | "colt-1911"
  | "desert-eagle"
  | "sig-p320-grc"
  | "beretta-92fs"
  | "cz-shadow-2"
  | "ruger-lcp-380"

  // 🦆 Fusils de chasse
  | "remington-870"
  | "fusil-chasse-12"
  | "fusil-canon-scie"
  | "mossberg-590-tactical"
  | "benelli-m4-sq"
  | "stoeger-p350"
  | "winchester-sxp"

  // 🎯 Carabines
  | "carabine-30-30"
  | "carabine-308"
  | "ruger-10-22"
  | "sks-russe"
  | "marlin-336"
  | "savage-axis-308"
  | "henry-golden-boy-22"

  // ⚡ Armes tactiques
  | "colt-c8-sq"
  | "ar15-civil"
  | "ak74"
  | "mac11-auto"
  | "fgc9-3d"
  | "mp5-sq-gti"
  | "mcx-virtus-grc"
  | "galil-ace"
  | "fn-p90"

  // 🛡️ Équipement non-létal & police
  | "taser-x26"
  | "matraque-sq"
  | "spray-poivre"
  | "flashbang"
  | "menottes"
  | "lanceur-pepper-ball"
  | "pistolet-fusee"
  | "bouclier-anti-emeute";

// ============================================================================
// 📜 CATALOGUE DES MUNITIONS
// ============================================================================

/** Spécifications d'une munition. */
export interface AmmoSpec {
  caliber: AmmoCaliber;
  name: string;
  boxQuantity: number;
  boxPriceCAD: number;
  damageModifier: number;
  armorPenetrationPct: number;
  bulletVelocityMs: number;
  bleedChance: number;
  isLessLethal: boolean;
  /** Poids de la balle en grains */
  bulletWeightGrains: number;
  /** Recul relatif (0-10) */
  recoilIndex: number;
  /** Disponibilité sur le marché légal */
  legalAvailability: "courante" | "restreinte" | "marche_noir" | "police_only";
}

/** Catalogue des munitions. */
export const AMMO_CATALOG: Record<AmmoCaliber, AmmoSpec> = {
  ammo_9mm: {
    caliber: "ammo_9mm",
    name: "Boîte 9x19mm Luger FMJ (50 cartouches)",
    boxQuantity: 50,
    boxPriceCAD: 32,
    damageModifier: 1.0,
    armorPenetrationPct: 35,
    bulletVelocityMs: 380,
    bleedChance: 0.35,
    isLessLethal: false,
    bulletWeightGrains: 115,
    recoilIndex: 3,
    legalAvailability: "courante",
  },
  ammo_40sw: {
    caliber: "ammo_40sw",
    name: "Boîte .40 S&W JHP (50 cartouches)",
    boxQuantity: 50,
    boxPriceCAD: 45,
    damageModifier: 1.15,
    armorPenetrationPct: 40,
    bulletVelocityMs: 360,
    bleedChance: 0.45,
    isLessLethal: false,
    bulletWeightGrains: 180,
    recoilIndex: 5,
    legalAvailability: "courante",
  },
  ammo_357: {
    caliber: "ammo_357",
    name: "Boîte .357 Magnum SJSP (50 cartouches)",
    boxQuantity: 50,
    boxPriceCAD: 55,
    damageModifier: 1.45,
    armorPenetrationPct: 55,
    bulletVelocityMs: 440,
    bleedChance: 0.60,
    isLessLethal: false,
    bulletWeightGrains: 158,
    recoilIndex: 7,
    legalAvailability: "courante",
  },
  ammo_45acp: {
    caliber: "ammo_45acp",
    name: "Boîte .45 ACP HP (50 cartouches)",
    boxQuantity: 50,
    boxPriceCAD: 48,
    damageModifier: 1.30,
    armorPenetrationPct: 30,
    bulletVelocityMs: 260,
    bleedChance: 0.65,
    isLessLethal: false,
    bulletWeightGrains: 230,
    recoilIndex: 6,
    legalAvailability: "courante",
  },
  ammo_50ae: {
    caliber: "ammo_50ae",
    name: "Boîte .50 AE JHP (20 cartouches)",
    boxQuantity: 20,
    boxPriceCAD: 85,
    damageModifier: 2.20,
    armorPenetrationPct: 75,
    bulletVelocityMs: 470,
    bleedChance: 0.85,
    isLessLethal: false,
    bulletWeightGrains: 300,
    recoilIndex: 10,
    legalAvailability: "marche_noir",
  },
  ammo_12g_buckshot: {
    caliber: "ammo_12g_buckshot",
    name: "Boîte Calibre 12 Chevrotine 00 (25 cartouches)",
    boxQuantity: 25,
    boxPriceCAD: 28,
    damageModifier: 1.80,
    armorPenetrationPct: 35,
    bulletVelocityMs: 400,
    bleedChance: 0.90,
    isLessLethal: false,
    bulletWeightGrains: 0,
    recoilIndex: 8,
    legalAvailability: "courante",
  },
  ammo_12g_slug: {
    caliber: "ammo_12g_slug",
    name: "Boîte Calibre 12 Slug Brenneke (10 cartouches)",
    boxQuantity: 10,
    boxPriceCAD: 30,
    damageModifier: 2.10,
    armorPenetrationPct: 80,
    bulletVelocityMs: 490,
    bleedChance: 0.80,
    isLessLethal: false,
    bulletWeightGrains: 437,
    recoilIndex: 9,
    legalAvailability: "courante",
  },
  ammo_12g_rubber: {
    caliber: "ammo_12g_rubber",
    name: "Cartouches Anti-émeute Caoutchouc (10)",
    boxQuantity: 10,
    boxPriceCAD: 40,
    damageModifier: 0.15,
    armorPenetrationPct: 5,
    bulletVelocityMs: 180,
    bleedChance: 0.0,
    isLessLethal: true,
    bulletWeightGrains: 0,
    recoilIndex: 4,
    legalAvailability: "police_only",
  },
  ammo_12g_birdshot: {
    caliber: "ammo_12g_birdshot",
    name: "Boîte Calibre 12 Plomb #6 (25 cartouches)",
    boxQuantity: 25,
    boxPriceCAD: 22,
    damageModifier: 0.60,
    armorPenetrationPct: 5,
    bulletVelocityMs: 380,
    bleedChance: 0.20,
    isLessLethal: false,
    bulletWeightGrains: 0,
    recoilIndex: 5,
    legalAvailability: "courante",
  },
  ammo_30_30: {
    caliber: "ammo_30_30",
    name: "Boîte .30-30 Winchester SP (20 cartouches)",
    boxQuantity: 20,
    boxPriceCAD: 38,
    damageModifier: 1.65,
    armorPenetrationPct: 60,
    bulletVelocityMs: 720,
    bleedChance: 0.70,
    isLessLethal: false,
    bulletWeightGrains: 150,
    recoilIndex: 6,
    legalAvailability: "courante",
  },
  ammo_308: {
    caliber: "ammo_308",
    name: "Boîte .308 Winchester Match (20 cartouches)",
    boxQuantity: 20,
    boxPriceCAD: 44,
    damageModifier: 1.95,
    armorPenetrationPct: 85,
    bulletVelocityMs: 820,
    bleedChance: 0.75,
    isLessLethal: false,
    bulletWeightGrains: 168,
    recoilIndex: 7,
    legalAvailability: "courante",
  },
  ammo_556: {
    caliber: "ammo_556",
    name: "Boîte 5.56x45mm NATO M855 (30 cartouches)",
    boxQuantity: 30,
    boxPriceCAD: 35,
    damageModifier: 1.40,
    armorPenetrationPct: 75,
    bulletVelocityMs: 940,
    bleedChance: 0.50,
    isLessLethal: false,
    bulletWeightGrains: 62,
    recoilIndex: 4,
    legalAvailability: "marche_noir",
  },
  ammo_762x39: {
    caliber: "ammo_762x39",
    name: "Boîte 7.62x39mm FMJ (40 cartouches)",
    boxQuantity: 40,
    boxPriceCAD: 30,
    damageModifier: 1.55,
    armorPenetrationPct: 70,
    bulletVelocityMs: 730,
    bleedChance: 0.60,
    isLessLethal: false,
    bulletWeightGrains: 123,
    recoilIndex: 5,
    legalAvailability: "courante",
  },
  ammo_545x39: {
    caliber: "ammo_545x39",
    name: "Boîte 5.45x39mm 7N6M (30 cartouches)",
    boxQuantity: 30,
    boxPriceCAD: 28,
    damageModifier: 1.35,
    armorPenetrationPct: 72,
    bulletVelocityMs: 900,
    bleedChance: 0.55,
    isLessLethal: false,
    bulletWeightGrains: 56,
    recoilIndex: 3,
    legalAvailability: "marche_noir",
  },
  ammo_22lr: {
    caliber: "ammo_22lr",
    name: "Brique .22 LR CCI Mini-Mag (100 cartouches)",
    boxQuantity: 100,
    boxPriceCAD: 18,
    damageModifier: 0.45,
    armorPenetrationPct: 15,
    bulletVelocityMs: 380,
    bleedChance: 0.20,
    isLessLethal: false,
    bulletWeightGrains: 40,
    recoilIndex: 1,
    legalAvailability: "courante",
  },
  ammo_taser_cartridge: {
    caliber: "ammo_taser_cartridge",
    name: "Cartouches Taser X26P (x2)",
    boxQuantity: 2,
    boxPriceCAD: 95,
    damageModifier: 0.05,
    armorPenetrationPct: 0,
    bulletVelocityMs: 60,
    bleedChance: 0.0,
    isLessLethal: true,
    bulletWeightGrains: 0,
    recoilIndex: 1,
    legalAvailability: "police_only",
  },
  ammo_pepper_ball: {
    caliber: "ammo_pepper_ball",
    name: "Sachet Pepper Ball .68 PAK (10 projectiles)",
    boxQuantity: 10,
    boxPriceCAD: 25,
    damageModifier: 0.10,
    armorPenetrationPct: 0,
    bulletVelocityMs: 90,
    bleedChance: 0.0,
    isLessLethal: true,
    bulletWeightGrains: 0,
    recoilIndex: 2,
    legalAvailability: "police_only",
  },
  ammo_flare: {
    caliber: "ammo_flare",
    name: "Fusée de détresse 37mm Orion (x4)",
    boxQuantity: 4,
    boxPriceCAD: 45,
    damageModifier: 0.30,
    armorPenetrationPct: 0,
    bulletVelocityMs: 45,
    bleedChance: 0.10,
    isLessLethal: false,
    bulletWeightGrains: 0,
    recoilIndex: 3,
    legalAvailability: "courante",
  },
};

// ============================================================================
// 🔧 SYSTÈME DE MODS / ATTACHMENTS
// ============================================================================

/** Type de mod d'arme. */
export type ModType =
  | "optic"
  | "barrel"
  | "magazine"
  | "grip"
  | "stock"
  | "light_laser"
  | "suppressor";

/** ID des mods. */
export type ModId =
  | "optic-red-dot"
  | "optic-holo"
  | "optic-scope-4x"
  | "optic-scope-10x"
  | "optic-night-vision"
  | "barrel-extended"
  | "barrel-short"
  | "barrel-threaded"
  | "mag-extended"
  | "mag-drum"
  | "mag-speed-loader"
  | "grip-vertical"
  | "grip-angled"
  | "stock-collapsible"
  | "stock-heavy"
  | "light-tactical"
  | "laser-green"
  | "suppressor-9mm"
  | "suppressor-556"
  | "suppressor-shotgun";

/** Définition d'un mod. */
export interface WeaponMod {
  id: ModId;
  name: string;
  type: ModType;
  compatibleCategories: WeaponCategory[];
  priceCAD: number;
  rarity: WeaponRarity;
  legal: LegalClass;
  /** Modificateurs appliqués */
  stats: {
    damageMult?: number;
    rangeMult?: number;
    fireRateMult?: number;
    reloadTimeMult?: number;
    recoilMult?: number;
    noiseReductionDb?: number;
    accuracyBonus?: number;
    magazineBonus?: number;
    concealabilityMult?: number;
  };
  description: string;
}

/** Catalogue des mods. */
export const MOD_CATALOG: Record<ModId, WeaponMod> = {
  "optic-red-dot": {
    id: "optic-red-dot",
    name: "Vortex Sparc AR Red Dot",
    type: "optic",
    compatibleCategories: ["tactique_auto", "carabine", "fusil_chasse"],
    priceCAD: 280,
    rarity: "uncommon",
    legal: "libre",
    stats: { accuracyBonus: 15, reloadTimeMult: 0.95 },
    description: "Point rouge holographique compact pour acquisition rapide de cible.",
  },
  "optic-holo": {
    id: "optic-holo",
    name: "EOTech EXPS3 Holographic",
    type: "optic",
    compatibleCategories: ["tactique_auto", "carabine"],
    priceCAD: 650,
    rarity: "rare",
    legal: "libre",
    stats: { accuracyBonus: 25, rangeMult: 1.1 },
    description: "Visée holographique militaire avec réticule 68 MOA/1 MOA.",
  },
  "optic-scope-4x": {
    id: "optic-scope-4x",
    name: "Leupold VX-3HD 3-9x40",
    type: "optic",
    compatibleCategories: ["carabine", "fusil_chasse"],
    priceCAD: 520,
    rarity: "uncommon",
    legal: "libre",
    stats: { accuracyBonus: 35, rangeMult: 1.4 },
    description: "Lunette de tir polyvalente pour la chasse québécoise.",
  },
  "optic-scope-10x": {
    id: "optic-scope-10x",
    name: "Nightforce ATACR 5-25x56 FFP",
    type: "optic",
    compatibleCategories: ["carabine"],
    priceCAD: 2800,
    rarity: "legendary",
    legal: "libre",
    stats: { accuracyBonus: 60, rangeMult: 2.0 },
    description: "Lunette de précision longue distance pour tireurs d'élite.",
  },
  "optic-night-vision": {
    id: "optic-night-vision",
    name: "ATN X-Sight 4K Pro NV",
    type: "optic",
    compatibleCategories: ["tactique_auto", "carabine"],
    priceCAD: 3200,
    rarity: "epic",
    legal: "restreinte",
    stats: { accuracyBonus: 20, rangeMult: 1.3 },
    description: "Vision nocturne numérique 4K avec enregistrement vidéo.",
  },
  "barrel-extended": {
    id: "barrel-extended",
    name: "Canon allongé +4 pouces",
    type: "barrel",
    compatibleCategories: ["poing", "fusil_chasse", "carabine"],
    priceCAD: 180,
    rarity: "common",
    legal: "libre",
    stats: { rangeMult: 1.15, damageMult: 1.05, recoilMult: 0.9, concealabilityMult: 0.7 },
    description: "Canon prolongé pour meilleure vélocité et précision.",
  },
  "barrel-short": {
    id: "barrel-short",
    name: "Canon raccourci CQB",
    type: "barrel",
    compatibleCategories: ["tactique_auto", "fusil_chasse"],
    priceCAD: 220,
    rarity: "uncommon",
    legal: "prohibee",
    stats: { rangeMult: 0.75, damageMult: 0.9, fireRateMult: 1.1, concealabilityMult: 1.4 },
    description: "Canon court pour combat rapproché. Illégal sans autorisation.",
  },
  "barrel-threaded": {
    id: "barrel-threaded",
    name: "Canon fileté 1/2x28",
    type: "barrel",
    compatibleCategories: ["poing", "carabine", "tactique_auto"],
    priceCAD: 150,
    rarity: "common",
    legal: "libre",
    stats: {},
    description: "Filetage pour installation de silencieux ou compensateur.",
  },
  "mag-extended": {
    id: "mag-extended",
    name: "Chargeur grande capacité (+10)",
    type: "magazine",
    compatibleCategories: ["poing", "tactique_auto", "carabine"],
    priceCAD: 85,
    rarity: "uncommon",
    legal: "prohibee",
    stats: { magazineBonus: 10, reloadTimeMult: 1.1, concealabilityMult: 0.8 },
    description: "Chargeur étendu prohibé au Canada (>10 coups semi-auto).",
  },
  "mag-drum": {
    id: "mag-drum",
    name: "Chargeur tambour 50 coups",
    type: "magazine",
    compatibleCategories: ["tactique_auto"],
    priceCAD: 350,
    rarity: "rare",
    legal: "prohibee",
    stats: { magazineBonus: 20, reloadTimeMult: 1.8, recoilMult: 1.1 },
    description: "Tambour haute capacité. Extrêmement rare et illégal.",
  },
  "mag-speed-loader": {
    id: "mag-speed-loader",
    name: "Speed Loader universel",
    type: "magazine",
    compatibleCategories: ["poing", "carabine", "tactique_auto"],
    priceCAD: 35,
    rarity: "common",
    legal: "libre",
    stats: { reloadTimeMult: 0.7 },
    description: "Outil de chargement rapide pour chargeurs.",
  },
  "grip-vertical": {
    id: "grip-vertical",
    name: "Poignée verticale Magpul RVG",
    type: "grip",
    compatibleCategories: ["tactique_auto", "fusil_chasse"],
    priceCAD: 45,
    rarity: "common",
    legal: "libre",
    stats: { recoilMult: 0.85, accuracyBonus: 10 },
    description: "Poignée avant verticale pour contrôle du recul.",
  },
  "grip-angled": {
    id: "grip-angled",
    name: "Poignée angulaire BCM Gunfighter",
    type: "grip",
    compatibleCategories: ["tactique_auto", "carabine"],
    priceCAD: 55,
    rarity: "common",
    legal: "libre",
    stats: { recoilMult: 0.9, accuracyBonus: 8, fireRateMult: 1.05 },
    description: "Poignée ergonomique inclinée pour position naturelle du poignet.",
  },
  "stock-collapsible": {
    id: "stock-collapsible",
    name: "Crosse rétractable M4 CAR",
    type: "stock",
    compatibleCategories: ["tactique_auto", "carabine"],
    priceCAD: 120,
    rarity: "uncommon",
    legal: "libre",
    stats: { recoilMult: 0.95, concealabilityMult: 1.2 },
    description: "Crosse télescopique 6 positions pour ajustement ergonomique.",
  },
  "stock-heavy": {
    id: "stock-heavy",
    name: "Crosse lourde PRS Precision",
    type: "stock",
    compatibleCategories: ["carabine"],
    priceCAD: 380,
    rarity: "rare",
    legal: "libre",
    stats: { recoilMult: 0.7, accuracyBonus: 20, concealabilityMult: 0.5 },
    description: "Crosse de précision avec appui-joue réglable et monopod.",
  },
  "light-tactical": {
    id: "light-tactical",
    name: "Lampe SureFire Scout Pro",
    type: "light_laser",
    compatibleCategories: ["tactique_auto", "fusil_chasse", "poing"],
    priceCAD: 180,
    rarity: "uncommon",
    legal: "libre",
    stats: { accuracyBonus: 5 },
    description: "Lampe tactique 1000 lumens avec interrupteur déporté.",
  },
  "laser-green": {
    id: "laser-green",
    name: "Laser vert PEQ-15 IR",
    type: "light_laser",
    compatibleCategories: ["tactique_auto"],
    priceCAD: 450,
    rarity: "rare",
    legal: "restreinte",
    stats: { accuracyBonus: 20 },
    description: "Désignateur laser vert/IR visible uniquement avec NVG.",
  },
  "suppressor-9mm": {
    id: "suppressor-9mm",
    name: "Silencieux Rugged Obsidian 9",
    type: "suppressor",
    compatibleCategories: ["poing", "tactique_auto"],
    priceCAD: 1200,
    rarity: "epic",
    legal: "prohibee",
    stats: { noiseReductionDb: 35, damageMult: 0.95, rangeMult: 0.9, recoilMult: 0.8 },
    description: "Silencieux multi-calibre 9mm/.300BLK. Strictement prohibé au Canada.",
  },
  "suppressor-556": {
    id: "suppressor-556",
    name: "Silencieux Dead Air Sandman-S",
    type: "suppressor",
    compatibleCategories: ["tactique_auto", "carabine"],
    priceCAD: 1500,
    rarity: "epic",
    legal: "prohibee",
    stats: { noiseReductionDb: 30, damageMult: 0.98, recoilMult: 0.75 },
    description: "Silencieux quick-detach pour carabines 5.56/.308.",
  },
  "suppressor-shotgun": {
    id: "suppressor-shotgun",
    name: "Silencieux Salvo 12 Shotgun",
    type: "suppressor",
    compatibleCategories: ["fusil_chasse"],
    priceCAD: 1800,
    rarity: "legendary",
    legal: "prohibee",
    stats: { noiseReductionDb: 20, damageMult: 0.9, recoilMult: 0.7 },
    description: "Silencieux pour fusil de chasse. Pièce de collection ultra-rare.",
  },
};

// ============================================================================
// 🪪 PERMIS ET LICENCES
// ============================================================================

/** ID des permis. */
export type LicenseId =
  | "pal"
  | "pal_r"
  | "chasse"
  | "att_transport"
  | "siaf_exempt"
  | "collectionneur"
  | "armurier";

/** Définition d'un permis. */
export interface LicenseDef {
  id: LicenseId;
  name: string;
  issuer: string;
  priceCAD: number;
  desc: string;
  durationYears: number;
  prerequisites: LicenseId[];
}

/** Catalogue des permis. */
export const LICENSES: Record<LicenseId, LicenseDef> = {
  pal: {
    id: "pal",
    name: "Permis de possession et d'acquisition (PPA/PAL)",
    issuer: "Gendarmerie royale du Canada & SQ",
    priceCAD: 85,
    desc: "Autorise l'achat et la possession d'armes d'épaule sans restriction.",
    durationYears: 5,
    prerequisites: [],
  },
  pal_r: {
    id: "pal_r",
    name: "PPA avec autorisation restreinte (PAL-R)",
    issuer: "Contrôleur des armes à feu du Québec",
    priceCAD: 195,
    desc: "Obligatoire pour les armes de poing. Requiert adhésion club de tir FQT.",
    durationYears: 5,
    prerequisites: ["pal"],
  },
  chasse: {
    id: "chasse",
    name: "Certificat du chasseur & Permis MFFP",
    issuer: "Ministère des Forêts, de la Faune et des Parcs",
    priceCAD: 46,
    desc: "Autorise la chasse sportive dans les ZEC du Québec.",
    durationYears: 1,
    prerequisites: [],
  },
  att_transport: {
    id: "att_transport",
    name: "Autorisation de transport (ATT)",
    issuer: "Sûreté du Québec",
    priceCAD: 35,
    desc: "Transport d'arme restreinte vers champ de tir homologué.",
    durationYears: 1,
    prerequisites: ["pal_r"],
  },
  siaf_exempt: {
    id: "siaf_exempt",
    name: "Exemption de service (Agents de la paix)",
    issuer: "Gouvernement du Québec",
    priceCAD: 0,
    desc: "Exemption statutaire pour policiers et agents correctionnels.",
    durationYears: 99,
    prerequisites: [],
  },
  collectionneur: {
    id: "collectionneur",
    name: "Permis de collectionneur d'armes historiques",
    issuer: "Patrimoine canadien / CAF",
    priceCAD: 350,
    desc: "Autorise la possession d'armes prohibées de valeur historique.",
    durationYears: 5,
    prerequisites: ["pal_r"],
  },
  armurier: {
    id: "armurier",
    name: "Licence d'armurier (Gunsmith)",
    issuer: "Programme canadien des armes à feu",
    priceCAD: 500,
    desc: "Autorise la réparation, modification et fabrication d'armes.",
    durationYears: 3,
    prerequisites: ["pal"],
  },
};

// ============================================================================
// 🗡️ TEMPLATE D'ARME COMPLET
// ============================================================================

/** Template d'une arme. */
export interface WeaponTemplate {
  id: WeaponId;
  name: string;
  modelCode: string;
  legal: LegalClass;
  source: WeaponSource;
  need: LicenseId[];
  ammo?: AmmoCaliber;
  category: WeaponCategory;
  rarity: WeaponRarity;
  baseDamage: number;
  effectiveRangeMeters: number;
  fireRateRPM: number;
  magazineCapacity: number;
  reloadTimeSeconds: number;
  maxDurability: number;
  priceCAD: number;
  policeOnly: boolean;
  concealable: boolean;
  isFullAutoCapable: boolean;
  barrelLengthInches: number;
  noiseLevelDecibels: number;
  description: string;

  // === NOUVEAUX CHAMPS v5.0 ===
  /** Indice de fiabilité (0-100). Plus haut = moins d'enrayages. */
  reliabilityIndex: number;
  /** Poids en kg (affecte endurance et vitesse de visée) */
  weightKg: number;
  /** Mods compatibles */
  compatibleMods: ModId[];
  /** Variante régionale / faction */
  faction?: "sq" | "grc" | "civil" | "gang_mtl" | "gang_qc" | "military" | "prison";
  /** Valeur de revente (% du prix neuf) */
  resaleValuePct: number;
  /** Niveau minimum du joueur requis */
  minPlayerLevel: number;
  /** Tags pour recherche/filtre */
  tags: string[];
}

// ============================================================================
// 📋 CATALOGUE COMPLET DES ARMES (ENRICHI)
// ============================================================================

export const WEAPON_CATALOG: WeaponTemplate[] = [
  // ==================== 🗡️ ARMES BLANCHES & OUTILS ====================
  {
    id: "poing-americain",
    name: "Poing américain",
    modelCode: "BRASS-KNUCKLE-QC",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    category: "melee",
    rarity: "common",
    baseDamage: 22,
    effectiveRangeMeters: 1.1,
    fireRateRPM: 120,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 150,
    priceCAD: 45,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 0,
    noiseLevelDecibels: 0,
    description: "Arme de corps-à-corps métallique prohibée par le Code criminel canadien.",
    reliabilityIndex: 100,
    weightKg: 0.25,
    compatibleMods: [],
    faction: "gang_mtl",
    resaleValuePct: 40,
    minPlayerLevel: 1,
    tags: ["melee", "prohibee", "gang", "concealable"],
  },
  {
    id: "couteau-chasse",
    name: "Couteau de chasse Buck 119",
    modelCode: "BUCK-119-SPECIAL",
    legal: "libre",
    source: "chasse_pro",
    need: [],
    category: "melee",
    rarity: "common",
    baseDamage: 32,
    effectiveRangeMeters: 1.3,
    fireRateRPM: 90,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 200,
    priceCAD: 85,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 6,
    noiseLevelDecibels: 0,
    description: "Lame fixe en acier inoxydable avec manche en bois d'ébène.",
    reliabilityIndex: 100,
    weightKg: 0.30,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 70,
    minPlayerLevel: 1,
    tags: ["melee", "legal", "chasse", "outil"],
  },
  {
    id: "batte-baseball",
    name: "Batte de baseball Louisville",
    modelCode: "SLUGGER-ASH-33",
    legal: "libre",
    source: "quincaillerie",
    need: [],
    category: "melee",
    rarity: "common",
    baseDamage: 28,
    effectiveRangeMeters: 1.6,
    fireRateRPM: 65,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 160,
    priceCAD: 35,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 33,
    noiseLevelDecibels: 0,
    description: "Batte en bois de frêne lourd. Très répandue dans les coffres de chars.",
    reliabilityIndex: 100,
    weightKg: 0.90,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 50,
    minPlayerLevel: 1,
    tags: ["melee", "legal", "sport", "improvise"],
  },
  {
    id: "machette",
    name: "Machette de débroussaillage",
    modelCode: "ONTARIO-CT2-18",
    legal: "libre",
    source: "quincaillerie",
    need: [],
    category: "melee",
    rarity: "uncommon",
    baseDamage: 42,
    effectiveRangeMeters: 1.5,
    fireRateRPM: 75,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 180,
    priceCAD: 55,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 18,
    noiseLevelDecibels: 0,
    description: "Outil d'arpenteur et de bûcheron pour ouvrir des sentiers.",
    reliabilityIndex: 100,
    weightKg: 0.65,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 60,
    minPlayerLevel: 1,
    tags: ["melee", "legal", "outil", "brousse"],
  },
  {
    id: "hache-pompier",
    name: "Hache de pompier",
    modelCode: "FIRE-AXE-PICK",
    legal: "libre",
    source: "quincaillerie",
    need: [],
    category: "melee",
    rarity: "rare",
    baseDamage: 55,
    effectiveRangeMeters: 1.7,
    fireRateRPM: 45,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 250,
    priceCAD: 120,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 36,
    noiseLevelDecibels: 0,
    description: "Hache de démolition avec tête forgée et pointe d'effraction.",
    reliabilityIndex: 100,
    weightKg: 2.50,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 65,
    minPlayerLevel: 3,
    tags: ["melee", "legal", "outil", "breach", "lourd"],
  },
  {
    id: "surin-prison",
    name: "Surin artisanal (Shiv de Donnacona)",
    modelCode: "PRISON-SHIV-CUSTOM",
    legal: "artisanale_illegale",
    source: "prison_craft",
    need: [],
    category: "melee",
    rarity: "contrabande",
    baseDamage: 45,
    effectiveRangeMeters: 1.1,
    fireRateRPM: 110,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 40,
    priceCAD: 150,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 4,
    noiseLevelDecibels: 0,
    description: "Tige d'acier de sommier affûtée sur le béton.",
    reliabilityIndex: 60,
    weightKg: 0.15,
    compatibleMods: [],
    faction: "prison",
    resaleValuePct: 20,
    minPlayerLevel: 5,
    tags: ["melee", "illegal", "prison", "craft", "fragile"],
  },
  {
    id: "pied-de-biche",
    name: "Pied-de-biche Mastercraft",
    modelCode: "CROWBAR-30IN",
    legal: "libre",
    source: "quincaillerie",
    need: [],
    category: "melee",
    rarity: "common",
    baseDamage: 30,
    effectiveRangeMeters: 1.4,
    fireRateRPM: 55,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 350,
    priceCAD: 28,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 30,
    noiseLevelDecibels: 0,
    description: "Outil de force industrielle pour crocheter ou défoncer des serrures.",
    reliabilityIndex: 100,
    weightKg: 1.80,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 50,
    minPlayerLevel: 1,
    tags: ["melee", "legal", "outil", "breach"],
  },
  {
    id: "karambit-tactique",
    name: "Karambit Emerson Wave",
    modelCode: "EMERSON-KARAMBIT-WAVE",
    legal: "libre",
    source: "dealer_noir",
    need: [],
    category: "melee",
    rarity: "rare",
    baseDamage: 38,
    effectiveRangeMeters: 1.0,
    fireRateRPM: 140,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 180,
    priceCAD: 220,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 3,
    noiseLevelDecibels: 0,
    description: "Couteau courbe d'origine indonésienne avec ouverture Wave instantanée.",
    reliabilityIndex: 100,
    weightKg: 0.12,
    compatibleMods: [],
    faction: "gang_mtl",
    resaleValuePct: 75,
    minPlayerLevel: 8,
    tags: ["melee", "legal", "tactique", "concealable", "rapide"],
  },
  {
    id: "tonfa-sq",
    name: "Tonfa latérale ASP ProTech",
    modelCode: "ASP-PROTECH-TONFA",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    category: "melee",
    rarity: "uncommon",
    baseDamage: 24,
    effectiveRangeMeters: 1.3,
    fireRateRPM: 100,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 400,
    priceCAD: 0,
    policeOnly: true,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 24,
    noiseLevelDecibels: 0,
    description: "Bâton latéral de défense utilisé par les unités anti-émeute de la SQ.",
    reliabilityIndex: 100,
    weightKg: 0.55,
    compatibleMods: [],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["melee", "police", "defense", "anti-emeute"],
  },
  {
    id: "baionnette-m4",
    name: "Baïonnette M9 Bayonet Phrobis",
    modelCode: "PHROBIS-M9-BAYONET",
    legal: "libre",
    source: "military_surplus",
    need: [],
    category: "melee",
    rarity: "uncommon",
    baseDamage: 35,
    effectiveRangeMeters: 1.2,
    fireRateRPM: 80,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 300,
    priceCAD: 180,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 7,
    noiseLevelDecibels: 0,
    description: "Baïonnette militaire américaine avec scie intégrée au dos de la lame.",
    reliabilityIndex: 100,
    weightKg: 0.45,
    compatibleMods: [],
    faction: "military",
    resaleValuePct: 80,
    minPlayerLevel: 5,
    tags: ["melee", "legal", "militaire", "surplus", "outil"],
  },

  // ==================== 🔫 ARMES DE POING ====================
  {
    id: "glock-19",
    name: "Glock 19 Gen 5",
    modelCode: "GLOCK-19-G5-9MM",
    legal: "restreinte",
    source: "chasse_pro",
    need: ["pal_r", "att_transport"],
    ammo: "ammo_9mm",
    category: "poing",
    rarity: "rare",
    baseDamage: 38,
    effectiveRangeMeters: 30,
    fireRateRPM: 350,
    magazineCapacity: 10,
    reloadTimeSeconds: 2.1,
    maxDurability: 400,
    priceCAD: 920,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 4.02,
    noiseLevelDecibels: 155,
    description: "Pistolet semi-automatique autrichien réputé pour sa fiabilité par grand froid.",
    reliabilityIndex: 97,
    weightKg: 0.60,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "mag-speed-loader", "light-tactical", "suppressor-9mm"],
    faction: "civil",
    resaleValuePct: 85,
    minPlayerLevel: 5,
    tags: ["poing", "restreinte", "9mm", "fiable", "populaire"],
  },
  {
    id: "glock-17-sq",
    name: "Glock 17 de Service (SQ)",
    modelCode: "GLOCK-17M-SQ-DUTY",
    legal: "restreinte",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    ammo: "ammo_9mm",
    category: "poing",
    rarity: "epic",
    baseDamage: 40,
    effectiveRangeMeters: 35,
    fireRateRPM: 380,
    magazineCapacity: 17,
    reloadTimeSeconds: 1.9,
    maxDurability: 500,
    priceCAD: 0,
    policeOnly: true,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 4.49,
    noiseLevelDecibels: 158,
    description: "Arme de service officielle des patrouilleurs de la SQ avec gravure matricule.",
    reliabilityIndex: 98,
    weightKg: 0.63,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "light-tactical", "laser-green"],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["poing", "police", "sq", "9mm", "service"],
  },
  {
    id: "glock-switch-auto",
    name: "Glock 19 avec Sélecteur Automatique",
    modelCode: "GLOCK-19-FULLAUTO-MOD",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_9mm",
    category: "poing",
    rarity: "contrabande",
    baseDamage: 36,
    effectiveRangeMeters: 20,
    fireRateRPM: 1100,
    magazineCapacity: 33,
    reloadTimeSeconds: 2.6,
    maxDurability: 220,
    priceCAD: 2800,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: true,
    barrelLengthInches: 4.02,
    noiseLevelDecibels: 162,
    description: "Pistolet modifié illégalement avec conversion automatique. Arme de gang.",
    reliabilityIndex: 65,
    weightKg: 0.65,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "mag-extended", "suppressor-9mm"],
    faction: "gang_mtl",
    resaleValuePct: 60,
    minPlayerLevel: 15,
    tags: ["poing", "prohibee", "auto", "gang", "9mm", "modifie"],
  },
  {
    id: "revolver-357",
    name: "Smith & Wesson 686 .357 Magnum",
    modelCode: "SW-686-PLUS-4IN",
    legal: "restreinte",
    source: "chasse_pro",
    need: ["pal_r", "att_transport"],
    ammo: "ammo_357",
    category: "poing",
    rarity: "rare",
    baseDamage: 62,
    effectiveRangeMeters: 35,
    fireRateRPM: 120,
    magazineCapacity: 6,
    reloadTimeSeconds: 3.4,
    maxDurability: 450,
    priceCAD: 1150,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 4.12,
    noiseLevelDecibels: 164,
    description: "Revolver lourd en acier inoxydable avec puissance d'arrêt redoutable.",
    reliabilityIndex: 99,
    weightKg: 1.05,
    compatibleMods: ["optic-red-dot"],
    faction: "civil",
    resaleValuePct: 80,
    minPlayerLevel: 7,
    tags: ["poing", "restreinte", "357", "revolver", "puissant"],
  },
  {
    id: "colt-1911",
    name: "Colt M1911 Government .45 ACP",
    modelCode: "COLT-1911-GOV",
    legal: "restreinte",
    source: "chasse_pro",
    need: ["pal_r", "att_transport"],
    ammo: "ammo_45acp",
    category: "poing",
    rarity: "rare",
    baseDamage: 54,
    effectiveRangeMeters: 28,
    fireRateRPM: 240,
    magazineCapacity: 8,
    reloadTimeSeconds: 2.2,
    maxDurability: 380,
    priceCAD: 1280,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 5.0,
    noiseLevelDecibels: 160,
    description: "Classique à simple action chambré dans le lourd calibre .45 ACP.",
    reliabilityIndex: 88,
    weightKg: 1.10,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "light-tactical"],
    faction: "civil",
    resaleValuePct: 82,
    minPlayerLevel: 8,
    tags: ["poing", "restreinte", "45acp", "classique", "1911"],
  },
  {
    id: "desert-eagle",
    name: "Desert Eagle .50 AE",
    modelCode: "IMI-DEAGLE-50AE",
    legal: "restreinte",
    source: "dealer_noir",
    need: ["pal_r"],
    ammo: "ammo_50ae",
    category: "poing",
    rarity: "legendary",
    baseDamage: 88,
    effectiveRangeMeters: 30,
    fireRateRPM: 140,
    magazineCapacity: 7,
    reloadTimeSeconds: 2.8,
    maxDurability: 300,
    priceCAD: 3200,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 6.0,
    noiseLevelDecibels: 172,
    description: "Monstre d'acier au recul brutal capable de traverser les portières.",
    reliabilityIndex: 82,
    weightKg: 1.99,
    compatibleMods: ["optic-red-dot", "barrel-threaded"],
    faction: "civil",
    resaleValuePct: 75,
    minPlayerLevel: 15,
    tags: ["poing", "restreinte", "50ae", "lourd", "collection"],
  },
  {
    id: "sig-p320-grc",
    name: "SIG Sauer P320 Carry (GRC)",
    modelCode: "SIG-P320-CARRY-GRC",
    legal: "restreinte",
    source: "grc_armory",
    need: ["siaf_exempt"],
    ammo: "ammo_9mm",
    category: "poing",
    rarity: "epic",
    baseDamage: 39,
    effectiveRangeMeters: 32,
    fireRateRPM: 360,
    magazineCapacity: 17,
    reloadTimeSeconds: 2.0,
    maxDurability: 480,
    priceCAD: 0,
    policeOnly: true,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 3.9,
    noiseLevelDecibels: 154,
    description: "Arme de service de la Gendarmerie royale du Canada avec module FCU modulaire.",
    reliabilityIndex: 96,
    weightKg: 0.58,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "light-tactical", "suppressor-9mm"],
    faction: "grc",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["poing", "police", "grc", "9mm", "modulaire"],
  },
  {
    id: "beretta-92fs",
    name: "Beretta 92FS Inox",
    modelCode: "BERETTA-92FS-INOX",
    legal: "restreinte",
    source: "chasse_pro",
    need: ["pal_r", "att_transport"],
    ammo: "ammo_9mm",
    category: "poing",
    rarity: "uncommon",
    baseDamage: 36,
    effectiveRangeMeters: 28,
    fireRateRPM: 320,
    magazineCapacity: 10,
    reloadTimeSeconds: 2.3,
    maxDurability: 420,
    priceCAD: 780,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 4.9,
    noiseLevelDecibels: 153,
    description: "Pistolet italien classique à canon basculant et sécurité manuelle.",
    reliabilityIndex: 94,
    weightKg: 0.95,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "light-tactical"],
    faction: "civil",
    resaleValuePct: 70,
    minPlayerLevel: 5,
    tags: ["poing", "restreinte", "9mm", "classique", "inox"],
  },
  {
    id: "cz-shadow-2",
    name: "CZ Shadow 2 Competition",
    modelCode: "CZ-SHADOW-2-COMP",
    legal: "restreinte",
    source: "chasse_pro",
    need: ["pal_r", "att_transport"],
    ammo: "ammo_9mm",
    category: "poing",
    rarity: "epic",
    baseDamage: 37,
    effectiveRangeMeters: 35,
    fireRateRPM: 400,
    magazineCapacity: 10,
    reloadTimeSeconds: 1.8,
    maxDurability: 500,
    priceCAD: 1850,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 4.89,
    noiseLevelDecibels: 152,
    description: "Pistolet de compétition IPSC tchèque avec détente match et guidon fibre optique.",
    reliabilityIndex: 97,
    weightKg: 1.33,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "mag-speed-loader"],
    faction: "civil",
    resaleValuePct: 90,
    minPlayerLevel: 10,
    tags: ["poing", "restreinte", "9mm", "competition", "precision"],
  },
  {
    id: "ruger-lcp-380",
    name: "Ruger LCP II .380 ACP",
    modelCode: "RUGER-LCP-II-380",
    legal: "restreinte",
    source: "chasse_pro",
    need: ["pal_r", "att_transport"],
    ammo: "ammo_9mm", // Simplifié: utilise 9mm comme proxy .380
    category: "poing",
    rarity: "uncommon",
    baseDamage: 24,
    effectiveRangeMeters: 15,
    fireRateRPM: 280,
    magazineCapacity: 6,
    reloadTimeSeconds: 2.5,
    maxDurability: 300,
    priceCAD: 420,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 2.75,
    noiseLevelDecibels: 148,
    description: "Micro-pistolet de poche ultra-compact pour défense personnelle discrète.",
    reliabilityIndex: 90,
    weightKg: 0.30,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 75,
    minPlayerLevel: 3,
    tags: ["poing", "restreinte", "380", "pocket", "defense", "concealable"],
  },

  // ==================== 🦆 FUSILS DE CHASSE ====================
  {
    id: "remington-870",
    name: "Remington 870 Wingmaster 12GA",
    modelCode: "REM-870-WING-12G",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal", "chasse"],
    ammo: "ammo_12g_buckshot",
    category: "fusil_chasse",
    rarity: "uncommon",
    baseDamage: 85,
    effectiveRangeMeters: 22,
    fireRateRPM: 60,
    magazineCapacity: 5,
    reloadTimeSeconds: 3.8,
    maxDurability: 500,
    priceCAD: 680,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 28.0,
    noiseLevelDecibels: 160,
    description: "Le fusil à pompe de référence des bois québécois avec crosse en noyer.",
    reliabilityIndex: 96,
    weightKg: 3.40,
    compatibleMods: ["optic-red-dot", "barrel-short", "light-tactical", "suppressor-shotgun"],
    faction: "civil",
    resaleValuePct: 80,
    minPlayerLevel: 3,
    tags: ["fusil", "sans_restriction", "12ga", "pompe", "chasse", "classique"],
  },
  {
    id: "fusil-chasse-12",
    name: "Fusil superposé Calibre 12",
    modelCode: "BAIKAL-OU-12GA",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal", "chasse"],
    ammo: "ammo_12g_buckshot",
    category: "fusil_chasse",
    rarity: "common",
    baseDamage: 90,
    effectiveRangeMeters: 25,
    fireRateRPM: 90,
    magazineCapacity: 2,
    reloadTimeSeconds: 2.8,
    maxDurability: 450,
    priceCAD: 520,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 28.0,
    noiseLevelDecibels: 162,
    description: "Fusil de chasse à double canon basculant pour la sauvagine.",
    reliabilityIndex: 98,
    weightKg: 3.20,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 65,
    minPlayerLevel: 2,
    tags: ["fusil", "sans_restriction", "12ga", "superpose", "chasse"],
  },
  {
    id: "fusil-canon-scie",
    name: "Fusil à canon scié",
    modelCode: "SAWED-OFF-12G-CUSTOM",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_12g_buckshot",
    category: "fusil_chasse",
    rarity: "contrabande",
    baseDamage: 110,
    effectiveRangeMeters: 8,
    fireRateRPM: 80,
    magazineCapacity: 2,
    reloadTimeSeconds: 2.5,
    maxDurability: 200,
    priceCAD: 950,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 9.5,
    noiseLevelDecibels: 168,
    description: "Fusil artisanal raccourci à la scie pour être dissimulé sous un blouson.",
    reliabilityIndex: 75,
    weightKg: 2.10,
    compatibleMods: [],
    faction: "gang_qc",
    resaleValuePct: 45,
    minPlayerLevel: 10,
    tags: ["fusil", "prohibee", "12ga", "scie", "gang", "concealable"],
  },
  {
    id: "mossberg-590-tactical",
    name: "Mossberg 590 Tactical",
    modelCode: "MOSS-590A1-TAC",
    legal: "sans_restriction",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    ammo: "ammo_12g_rubber",
    category: "fusil_chasse",
    rarity: "epic",
    baseDamage: 25,
    effectiveRangeMeters: 18,
    fireRateRPM: 65,
    magazineCapacity: 8,
    reloadTimeSeconds: 4.2,
    maxDurability: 550,
    priceCAD: 890,
    policeOnly: true,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 20.0,
    noiseLevelDecibels: 158,
    description: "Fusil tactique robuste utilisé par le GTI de la SQ.",
    reliabilityIndex: 97,
    weightKg: 3.60,
    compatibleMods: ["optic-red-dot", "optic-holo", "light-tactical", "grip-vertical", "stock-collapsible"],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["fusil", "police", "sq", "12ga", "tactique", "anti-emeute"],
  },
  {
    id: "benelli-m4-sq",
    name: "Benelli M4 Super 90 (GTI)",
    modelCode: "BENELLI-M4-SUPER90",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    ammo: "ammo_12g_buckshot",
    category: "fusil_chasse",
    rarity: "legendary",
    baseDamage: 88,
    effectiveRangeMeters: 25,
    fireRateRPM: 120,
    magazineCapacity: 7,
    reloadTimeSeconds: 3.5,
    maxDurability: 600,
    priceCAD: 0,
    policeOnly: true,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 18.5,
    noiseLevelDecibels: 162,
    description: "Fusil semi-automatique ARGO du GTI. Le meilleur fusil de combat au monde.",
    reliabilityIndex: 99,
    weightKg: 3.80,
    compatibleMods: ["optic-red-dot", "optic-holo", "light-tactical", "laser-green", "grip-vertical", "stock-collapsible"],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["fusil", "police", "sq", "gti", "12ga", "semi-auto", "elite"],
  },
  {
    id: "stoeger-p350",
    name: "Stoeger P350 Defense",
    modelCode: "STOEGER-P350-DEF",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal"],
    ammo: "ammo_12g_buckshot",
    category: "fusil_chasse",
    rarity: "common",
    baseDamage: 82,
    effectiveRangeMeters: 20,
    fireRateRPM: 55,
    magazineCapacity: 5,
    reloadTimeSeconds: 4.0,
    maxDurability: 400,
    priceCAD: 380,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 24.0,
    noiseLevelDecibels: 160,
    description: "Fusil à pompe économique turc pour la défense domiciliaire.",
    reliabilityIndex: 88,
    weightKg: 3.10,
    compatibleMods: ["optic-red-dot", "light-tactical"],
    faction: "civil",
    resaleValuePct: 55,
    minPlayerLevel: 2,
    tags: ["fusil", "sans_restriction", "12ga", "pompe", "budget", "defense"],
  },
  {
    id: "winchester-sxp",
    name: "Winchester SXP Defender",
    modelCode: "WIN-SXP-DEFENDER",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal"],
    ammo: "ammo_12g_buckshot",
    category: "fusil_chasse",
    rarity: "uncommon",
    baseDamage: 84,
    effectiveRangeMeters: 22,
    fireRateRPM: 70,
    magazineCapacity: 5,
    reloadTimeSeconds: 3.6,
    maxDurability: 460,
    priceCAD: 480,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 26.0,
    noiseLevelDecibels: 159,
    description: "Fusil à pompe rotatif ultra-rapide avec système Inertia Assist.",
    reliabilityIndex: 93,
    weightKg: 3.20,
    compatibleMods: ["optic-red-dot", "light-tactical", "grip-vertical"],
    faction: "civil",
    resaleValuePct: 70,
    minPlayerLevel: 3,
    tags: ["fusil", "sans_restriction", "12ga", "pompe", "rapide"],
  },

  // ==================== 🎯 CARABINES ====================
  {
    id: "carabine-30-30",
    name: "Winchester 94 à levier .30-30",
    modelCode: "WIN-94-CARBINE-3030",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal", "chasse"],
    ammo: "ammo_30_30",
    category: "carabine",
    rarity: "uncommon",
    baseDamage: 72,
    effectiveRangeMeters: 85,
    fireRateRPM: 48,
    magazineCapacity: 6,
    reloadTimeSeconds: 4.0,
    maxDurability: 420,
    priceCAD: 820,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 20.0,
    noiseLevelDecibels: 162,
    description: "L'arme légendaire de la chasse au chevreuil au Québec.",
    reliabilityIndex: 95,
    weightKg: 3.00,
    compatibleMods: ["optic-scope-4x"],
    faction: "civil",
    resaleValuePct: 85,
    minPlayerLevel: 3,
    tags: ["carabine", "sans_restriction", "30-30", "levier", "chasse", "legende"],
  },
  {
    id: "carabine-308",
    name: "Tikka T3x Hunter .308 Win",
    modelCode: "TIKKA-T3X-308-SCOPED",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal", "chasse"],
    ammo: "ammo_308",
    category: "carabine",
    rarity: "rare",
    baseDamage: 92,
    effectiveRangeMeters: 250,
    fireRateRPM: 30,
    magazineCapacity: 4,
    reloadTimeSeconds: 3.2,
    maxDurability: 480,
    priceCAD: 1450,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 22.4,
    noiseLevelDecibels: 166,
    description: "Carabine finlandaise de haute précision pour l'orignal et l'ours noir.",
    reliabilityIndex: 97,
    weightKg: 3.30,
    compatibleMods: ["optic-scope-4x", "optic-scope-10x", "stock-heavy", "barrel-threaded", "suppressor-556"],
    faction: "civil",
    resaleValuePct: 88,
    minPlayerLevel: 8,
    tags: ["carabine", "sans_restriction", "308", "precision", "chasse", "finlande"],
  },
  {
    id: "ruger-10-22",
    name: "Ruger 10/22 Carbine .22 LR",
    modelCode: "RUGER-1022-SYN",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal"],
    ammo: "ammo_22lr",
    category: "carabine",
    rarity: "common",
    baseDamage: 24,
    effectiveRangeMeters: 50,
    fireRateRPM: 300,
    magazineCapacity: 10,
    reloadTimeSeconds: 1.8,
    maxDurability: 400,
    priceCAD: 410,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 18.5,
    noiseLevelDecibels: 135,
    description: "Carabine semi-automatique légère pour le tir récréatif.",
    reliabilityIndex: 94,
    weightKg: 2.30,
    compatibleMods: ["optic-red-dot", "optic-scope-4x", "barrel-threaded", "stock-collapsible"],
    faction: "civil",
    resaleValuePct: 80,
    minPlayerLevel: 1,
    tags: ["carabine", "sans_restriction", "22lr", "debutant", "recreation"],
  },
  {
    id: "sks-russe",
    name: "Carabine SKS 7.62x39mm (Surplus)",
    modelCode: "TULA-SKS-1954",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal"],
    ammo: "ammo_762x39",
    category: "carabine",
    rarity: "uncommon",
    baseDamage: 66,
    effectiveRangeMeters: 120,
    fireRateRPM: 180,
    magazineCapacity: 5,
    reloadTimeSeconds: 3.5,
    maxDurability: 500,
    priceCAD: 580,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 20.4,
    noiseLevelDecibels: 163,
    description: "Carabine militaire soviétique très populaire auprès des tireurs québécois.",
    reliabilityIndex: 96,
    weightKg: 3.85,
    compatibleMods: ["optic-red-dot", "optic-scope-4x"],
    faction: "civil",
    resaleValuePct: 75,
    minPlayerLevel: 3,
    tags: ["carabine", "sans_restriction", "762x39", "surplus", "sovietique"],
  },
  {
    id: "marlin-336",
    name: "Marlin 336 Dark Series .30-30",
    modelCode: "MARLIN-336-DARK",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal", "chasse"],
    ammo: "ammo_30_30",
    category: "carabine",
    rarity: "rare",
    baseDamage: 74,
    effectiveRangeMeters: 90,
    fireRateRPM: 50,
    magazineCapacity: 5,
    reloadTimeSeconds: 3.8,
    maxDurability: 440,
    priceCAD: 1100,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 18.6,
    noiseLevelDecibels: 161,
    description: "Version modernisée du Marlin 336 avec finition Cerakote noire et rail Picatinny.",
    reliabilityIndex: 94,
    weightKg: 3.10,
    compatibleMods: ["optic-red-dot", "optic-scope-4x", "light-tactical", "suppressor-556"],
    faction: "civil",
    resaleValuePct: 82,
    minPlayerLevel: 5,
    tags: ["carabine", "sans_restriction", "30-30", "levier", "moderne"],
  },
  {
    id: "savage-axis-308",
    name: "Savage Axis II XP .308 Win",
    modelCode: "SAVAGE-AXIS-II-308",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal", "chasse"],
    ammo: "ammo_308",
    category: "carabine",
    rarity: "uncommon",
    baseDamage: 90,
    effectiveRangeMeters: 220,
    fireRateRPM: 28,
    magazineCapacity: 4,
    reloadTimeSeconds: 3.4,
    maxDurability: 450,
    priceCAD: 680,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 22.0,
    noiseLevelDecibels: 165,
    description: "Carabine bolt-action abordable avec détente AccuTrigger réglable.",
    reliabilityIndex: 93,
    weightKg: 3.00,
    compatibleMods: ["optic-scope-4x", "optic-scope-10x", "stock-heavy"],
    faction: "civil",
    resaleValuePct: 70,
    minPlayerLevel: 4,
    tags: ["carabine", "sans_restriction", "308", "bolt", "budget", "chasse"],
  },
  {
    id: "henry-golden-boy-22",
    name: "Henry Golden Boy .22 LR",
    modelCode: "HENRY-GOLDEN-BOY-22",
    legal: "sans_restriction",
    source: "chasse_pro",
    need: ["pal"],
    ammo: "ammo_22lr",
    category: "carabine",
    rarity: "uncommon",
    baseDamage: 22,
    effectiveRangeMeters: 45,
    fireRateRPM: 40,
    magazineCapacity: 16,
    reloadTimeSeconds: 5.0,
    maxDurability: 400,
    priceCAD: 620,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 20.0,
    noiseLevelDecibels: 130,
    description: "Carabine à levier américaine avec magasin tubulaire et finition laiton doré.",
    reliabilityIndex: 96,
    weightKg: 2.90,
    compatibleMods: ["optic-scope-4x"],
    faction: "civil",
    resaleValuePct: 85,
    minPlayerLevel: 2,
    tags: ["carabine", "sans_restriction", "22lr", "levier", "collection", "americain"],
  },

  // ==================== ⚡ ARMES TACTIQUES ====================
  {
    id: "colt-c8-sq",
    name: "Colt Canada C8 IUR 5.56mm (GTI/SQ)",
    modelCode: "COLT-C8-IUR-POLICE",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    ammo: "ammo_556",
    category: "tactique_auto",
    rarity: "legendary",
    baseDamage: 56,
    effectiveRangeMeters: 180,
    fireRateRPM: 750,
    magazineCapacity: 30,
    reloadTimeSeconds: 2.3,
    maxDurability: 600,
    priceCAD: 0,
    policeOnly: true,
    concealable: false,
    isFullAutoCapable: true,
    barrelLengthInches: 14.5,
    noiseLevelDecibels: 165,
    description: "Carabine d'assaut tactique fabriquée en Ontario, équipement standard du GTI.",
    reliabilityIndex: 98,
    weightKg: 3.20,
    compatibleMods: ["optic-red-dot", "optic-holo", "optic-night-vision", "barrel-threaded", "mag-extended", "grip-vertical", "grip-angled", "stock-collapsible", "light-tactical", "laser-green", "suppressor-556"],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["tactique", "police", "sq", "gti", "556", "auto", "canadien"],
  },
  {
    id: "ar15-civil",
    name: "Armalite AR-15 (Marché clandestin)",
    modelCode: "AR15-A3-556-SEMI",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_556",
    category: "tactique_auto",
    rarity: "rare",
    baseDamage: 52,
    effectiveRangeMeters: 150,
    fireRateRPM: 420,
    magazineCapacity: 30,
    reloadTimeSeconds: 2.4,
    maxDurability: 350,
    priceCAD: 3400,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 16.0,
    noiseLevelDecibels: 164,
    description: "Arme d'assaut passée en contrebande depuis les États-Unis.",
    reliabilityIndex: 90,
    weightKg: 3.40,
    compatibleMods: ["optic-red-dot", "optic-holo", "barrel-threaded", "mag-extended", "grip-vertical", "stock-collapsible", "light-tactical", "suppressor-556"],
    faction: "gang_mtl",
    resaleValuePct: 55,
    minPlayerLevel: 15,
    tags: ["tactique", "prohibee", "556", "contrebande", "ar15"],
  },
  {
    id: "ak74",
    name: "Kalachnikov AK-74 5.45x39mm",
    modelCode: "IZHMASH-AK74M",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_545x39",
    category: "tactique_auto",
    rarity: "contrabande",
    baseDamage: 58,
    effectiveRangeMeters: 160,
    fireRateRPM: 600,
    magazineCapacity: 30,
    reloadTimeSeconds: 2.7,
    maxDurability: 550,
    priceCAD: 4200,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: true,
    barrelLengthInches: 16.3,
    noiseLevelDecibels: 166,
    description: "Fusil d'assaut automatique importé par conteneur au Port de Montréal.",
    reliabilityIndex: 97,
    weightKg: 3.60,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "grip-vertical"],
    faction: "gang_qc",
    resaleValuePct: 50,
    minPlayerLevel: 18,
    tags: ["tactique", "prohibee", "545x39", "auto", "russe", "contrebande"],
  },
  {
    id: "mac11-auto",
    name: "Pistolet-mitrailleur MAC-11 9mm",
    modelCode: "INGRAM-M11-9MM",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_9mm",
    category: "tactique_auto",
    rarity: "contrabande",
    baseDamage: 32,
    effectiveRangeMeters: 25,
    fireRateRPM: 1200,
    magazineCapacity: 32,
    reloadTimeSeconds: 2.2,
    maxDurability: 200,
    priceCAD: 2600,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: true,
    barrelLengthInches: 5.1,
    noiseLevelDecibels: 160,
    description: "Arme automatique compacte utilisée lors des règlements de compte.",
    reliabilityIndex: 70,
    weightKg: 1.50,
    compatibleMods: ["suppressor-9mm"],
    faction: "gang_mtl",
    resaleValuePct: 45,
    minPlayerLevel: 12,
    tags: ["tactique", "prohibee", "9mm", "auto", "compact", "gang"],
  },
  {
    id: "fgc9-3d",
    name: "FGC-9 Imprimé 3D (Ghost Gun)",
    modelCode: "GHOST-FGC9-MK2",
    legal: "artisanale_illegale",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_9mm",
    category: "tactique_auto",
    rarity: "contrabande",
    baseDamage: 34,
    effectiveRangeMeters: 30,
    fireRateRPM: 400,
    magazineCapacity: 15,
    reloadTimeSeconds: 2.5,
    maxDurability: 120,
    priceCAD: 1400,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 4.5,
    noiseLevelDecibels: 156,
    description: "Carabine 9mm fabriquée maison avec imprimante 3D. Sans numéro de série.",
    reliabilityIndex: 55,
    weightKg: 2.00,
    compatibleMods: ["optic-red-dot", "barrel-threaded", "suppressor-9mm"],
    faction: "gang_mtl",
    resaleValuePct: 30,
    minPlayerLevel: 10,
    tags: ["tactique", "illegal", "9mm", "3d-print", "ghost-gun", "fragile"],
  },
  {
    id: "mp5-sq-gti",
    name: "HK MP5A3 (GTI/SQ)",
    modelCode: "HK-MP5A3-GTI",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    ammo: "ammo_9mm",
    category: "tactique_auto",
    rarity: "legendary",
    baseDamage: 36,
    effectiveRangeMeters: 50,
    fireRateRPM: 800,
    magazineCapacity: 30,
    reloadTimeSeconds: 2.0,
    maxDurability: 580,
    priceCAD: 0,
    policeOnly: true,
    concealable: false,
    isFullAutoCapable: true,
    barrelLengthInches: 8.9,
    noiseLevelDecibels: 158,
    description: "Pistolet-mitrailleur emblématique du GTI pour les interventions CQB.",
    reliabilityIndex: 99,
    weightKg: 2.55,
    compatibleMods: ["optic-red-dot", "optic-holo", "barrel-threaded", "light-tactical", "laser-green", "suppressor-9mm", "stock-collapsible"],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["tactique", "police", "sq", "gti", "9mm", "auto", "cqb"],
  },
  {
    id: "mcx-virtus-grc",
    name: "SIG MCX Virtus Patrol (GRC ERT)",
    modelCode: "SIG-MCX-VIRTUS-GRC",
    legal: "prohibee",
    source: "grc_armory",
    need: ["siaf_exempt"],
    ammo: "ammo_556",
    category: "tactique_auto",
    rarity: "legendary",
    baseDamage: 55,
    effectiveRangeMeters: 200,
    fireRateRPM: 700,
    magazineCapacity: 30,
    reloadTimeSeconds: 2.2,
    maxDurability: 620,
    priceCAD: 0,
    policeOnly: true,
    concealable: false,
    isFullAutoCapable: true,
    barrelLengthInches: 16.0,
    noiseLevelDecibels: 163,
    description: "Carabine modulaire de l'Équipe d'intervention d'urgence de la GRC.",
    reliabilityIndex: 98,
    weightKg: 3.50,
    compatibleMods: ["optic-red-dot", "optic-holo", "optic-night-vision", "barrel-threaded", "mag-extended", "grip-vertical", "grip-angled", "stock-collapsible", "light-tactical", "laser-green", "suppressor-556"],
    faction: "grc",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["tactique", "police", "grc", "ert", "556", "auto", "modulaire"],
  },
  {
    id: "galil-ace",
    name: "IWI Galil ACE 23 5.56mm",
    modelCode: "IWI-GALIL-ACE-23",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_556",
    category: "tactique_auto",
    rarity: "rare",
    baseDamage: 54,
    effectiveRangeMeters: 170,
    fireRateRPM: 650,
    magazineCapacity: 30,
    reloadTimeSeconds: 2.5,
    maxDurability: 520,
    priceCAD: 3800,
    policeOnly: false,
    concealable: false,
    isFullAutoCapable: true,
    barrelLengthInches: 15.0,
    noiseLevelDecibels: 164,
    description: "Fusil d'assaut israélien modernisé basé sur l'AK. Robuste et précis.",
    reliabilityIndex: 96,
    weightKg: 3.40,
    compatibleMods: ["optic-red-dot", "optic-holo", "barrel-threaded", "grip-vertical", "stock-collapsible", "suppressor-556"],
    faction: "gang_qc",
    resaleValuePct: 55,
    minPlayerLevel: 16,
    tags: ["tactique", "prohibee", "556", "auto", "israelien", "contrebande"],
  },
  {
    id: "fn-p90",
    name: "FN P90 TR 5.7x28mm",
    modelCode: "FN-P90-TR",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_556", // Proxy simplifié
    category: "tactique_auto",
    rarity: "legendary",
    baseDamage: 42,
    effectiveRangeMeters: 80,
    fireRateRPM: 900,
    magazineCapacity: 50,
    reloadTimeSeconds: 2.8,
    maxDurability: 450,
    priceCAD: 4500,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: true,
    barrelLengthInches: 10.4,
    noiseLevelDecibels: 158,
    description: "PDW belge futuriste avec chargeur horizontal 50 coups intégré.",
    reliabilityIndex: 95,
    weightKg: 2.60,
    compatibleMods: ["optic-red-dot", "optic-holo", "suppressor-9mm"],
    faction: "gang_mtl",
    resaleValuePct: 60,
    minPlayerLevel: 20,
    tags: ["tactique", "prohibee", "57x28", "auto", "pdw", "futuriste", "rare"],
  },

  // ==================== 🛡️ ÉQUIPEMENT NON-LÉTAL & POLICE ====================
  {
    id: "taser-x26",
    name: "Pistolet à impulsions Taser X26P",
    modelCode: "AXON-TASER-X26P",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    ammo: "ammo_taser_cartridge",
    category: "non_letal",
    rarity: "rare",
    baseDamage: 8,
    effectiveRangeMeters: 6.5,
    fireRateRPM: 30,
    magazineCapacity: 1,
    reloadTimeSeconds: 3.5,
    maxDurability: 300,
    priceCAD: 0,
    policeOnly: true,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 0,
    noiseLevelDecibels: 60,
    description: "Neutralisation neuromusculaire temporaire à 50 000 volts.",
    reliabilityIndex: 95,
    weightKg: 0.23,
    compatibleMods: ["light-tactical", "laser-green"],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["non-letal", "police", "taser", "electrique"],
  },
  {
    id: "matraque-sq",
    name: "Bâton télescopique ASP 21 pouces",
    modelCode: "ASP-FRICTION-LOC-21",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    category: "non_letal",
    rarity: "uncommon",
    baseDamage: 20,
    effectiveRangeMeters: 1.4,
    fireRateRPM: 90,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 400,
    priceCAD: 0,
    policeOnly: true,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 21.0,
    noiseLevelDecibels: 0,
    description: "Bâton d'acier trempé à déploiement rapide pour contrôle de foule.",
    reliabilityIndex: 100,
    weightKg: 0.55,
    compatibleMods: [],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["non-letal", "police", "matraque", "telescopique"],
  },
  {
    id: "spray-poivre",
    name: "Aérosol Poivre de Cayenne Sabre Red",
    modelCode: "SABRE-RED-OC-50G",
    legal: "libre",
    source: "depanneur",
    need: [],
    category: "non_letal",
    rarity: "common",
    baseDamage: 6,
    effectiveRangeMeters: 3.5,
    fireRateRPM: 60,
    magazineCapacity: 5,
    reloadTimeSeconds: 0,
    maxDurability: 50,
    priceCAD: 34,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 0,
    noiseLevelDecibels: 0,
    description: "Gaz poivre OC provoquant fermeture involontaire des yeux.",
    reliabilityIndex: 90,
    weightKg: 0.05,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 50,
    minPlayerLevel: 1,
    tags: ["non-letal", "legal", "spray", "defense", "oc"],
  },
  {
    id: "flashbang",
    name: "Grenade assourdissante CTS 7290",
    modelCode: "CTS-7290-FLASHBANG",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    category: "non_letal",
    rarity: "epic",
    baseDamage: 10,
    effectiveRangeMeters: 8.0,
    fireRateRPM: 10,
    magazineCapacity: 1,
    reloadTimeSeconds: 0,
    maxDurability: 1,
    priceCAD: 0,
    policeOnly: true,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 0,
    noiseLevelDecibels: 175,
    description: "Flash aveuglant de 6-8M candelas et 175 dB pour désorienter.",
    reliabilityIndex: 98,
    weightKg: 0.24,
    compatibleMods: [],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["non-letal", "police", "grenade", "flash", "assourdissant"],
  },
  {
    id: "menottes",
    name: "Menottes à charnière Peerless 801C",
    modelCode: "PEERLESS-MODEL-801",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    category: "outil_police",
    rarity: "common",
    baseDamage: 0,
    effectiveRangeMeters: 1.2,
    fireRateRPM: 30,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 999,
    priceCAD: 0,
    policeOnly: true,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 0,
    noiseLevelDecibels: 0,
    description: "Entraves en acier nickelé avec double verrouillage de sécurité.",
    reliabilityIndex: 100,
    weightKg: 0.25,
    compatibleMods: [],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["outil", "police", "menottes", "restraint"],
  },
  {
    id: "lanceur-pepper-ball",
    name: "Lanceur PepperBall Kinetic HC",
    modelCode: "PEPPERBALL-KINETIC-HC",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    ammo: "ammo_pepper_ball",
    category: "non_letal",
    rarity: "rare",
    baseDamage: 12,
    effectiveRangeMeters: 15,
    fireRateRPM: 45,
    magazineCapacity: 8,
    reloadTimeSeconds: 3.0,
    maxDurability: 350,
    priceCAD: 0,
    policeOnly: true,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 0,
    noiseLevelDecibels: 80,
    description: "Lanceur de projectiles au poivre pour dispersion de foule.",
    reliabilityIndex: 92,
    weightKg: 0.80,
    compatibleMods: [],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["non-letal", "police", "pepper-ball", "dispersion"],
  },
  {
    id: "pistolet-fusee",
    name: "Pistolet de détresse Orion Safety",
    modelCode: "ORION-SAFETY-FLARE",
    legal: "libre",
    source: "chasse_pro",
    need: [],
    ammo: "ammo_flare",
    category: "non_letal",
    rarity: "common",
    baseDamage: 15,
    effectiveRangeMeters: 100,
    fireRateRPM: 8,
    magazineCapacity: 1,
    reloadTimeSeconds: 4.0,
    maxDurability: 200,
    priceCAD: 65,
    policeOnly: false,
    concealable: true,
    isFullAutoCapable: false,
    barrelLengthInches: 0,
    noiseLevelDecibels: 120,
    description: "Pistolet de signalisation maritime obligatoire sur les embarcations.",
    reliabilityIndex: 95,
    weightKg: 0.30,
    compatibleMods: [],
    faction: "civil",
    resaleValuePct: 60,
    minPlayerLevel: 1,
    tags: ["non-letal", "legal", "fusee", "signalisation", "maritime"],
  },
  {
    id: "bouclier-anti-emeute",
    name: "Bouclier anti-émeute Safariland",
    modelCode: "SAFARILAND-RIOT-SHIELD",
    legal: "prohibee",
    source: "sq_arsenal",
    need: ["siaf_exempt"],
    category: "outil_police",
    rarity: "epic",
    baseDamage: 15,
    effectiveRangeMeters: 1.5,
    fireRateRPM: 40,
    magazineCapacity: 0,
    reloadTimeSeconds: 0,
    maxDurability: 800,
    priceCAD: 0,
    policeOnly: true,
    concealable: false,
    isFullAutoCapable: false,
    barrelLengthInches: 0,
    noiseLevelDecibels: 0,
    description: "Bouclier en polycarbonate transparent avec fenêtre de tir.",
    reliabilityIndex: 100,
    weightKg: 5.50,
    compatibleMods: ["light-tactical"],
    faction: "sq",
    resaleValuePct: 0,
    minPlayerLevel: 1,
    tags: ["outil", "police", "bouclier", "anti-emeute", "defense"],
  },
];

// ============================================================================
// 📊 DICTIONNAIRES ET INDEX RAPIDES
// ============================================================================

/** Dictionnaire des armes (accès rapide par ID). */
export const WEAPONS: Record<WeaponId, WeaponTemplate> = WEAPON_CATALOG.reduce(
  (acc, weapon) => {
    acc[weapon.id] = weapon;
    return acc;
  },
  {} as Record<WeaponId, WeaponTemplate>
);

/** Liste des IDs des armes. */
export const WEAPON_IDS: WeaponId[] = WEAPON_CATALOG.map((w) => w.id);

/** Équipement standard de la police. */
export const POLICE_KIT: WeaponId[] = [
  "taser-x26",
  "matraque-sq",
  "spray-poivre",
  "flashbang",
  "menottes",
  "glock-17-sq",
  "bouclier-anti-emeute",
];

/** Équipement standard GTI. */
export const GTI_KIT: WeaponId[] = [
  "colt-c8-sq",
  "mp5-sq-gti",
  "benelli-m4-sq",
  "glock-17-sq",
  "flashbang",
  "taser-x26",
  "menottes",
  "bouclier-anti-emeute",
];

// ============================================================================
// 💰 EXPORT weaponAmmo (FIX POUR commerce.ts)
// ============================================================================

/**
 * Mapping arme → informations munitions pour le système de commerce.
 * Cet export est requis par commerce.ts pour calculer les prix et disponibilités.
 */
export const weaponAmmo: Record<string, {
  caliber: AmmoCaliber;
  ammoName: string;
  pricePerRound: number;
  boxSize: number;
  boxPrice: number;
  availability: "courante" | "restreinte" | "marche_noir" | "police_only";
}> = {};

// Construire weaponAmmo automatiquement depuis le catalogue
for (const weapon of WEAPON_CATALOG) {
  if (weapon.ammo && AMMO_CATALOG[weapon.ammo]) {
    const ammo = AMMO_CATALOG[weapon.ammo];
    weaponAmmo[weapon.id] = {
      caliber: ammo.caliber,
      ammoName: ammo.name,
      pricePerRound: Math.round((ammo.boxPriceCAD / ammo.boxQuantity) * 100) / 100,
      boxSize: ammo.boxQuantity,
      boxPrice: ammo.boxPriceCAD,
      availability: ammo.legalAvailability,
    };
  }
}

// ============================================================================
// 🔍 FONCTIONS UTILITAIRES AVANCÉES
// ============================================================================

/** Vérifie si une ID est une arme valide. */
export function isWeaponId(id: string): id is WeaponId {
  return id in WEAPONS;
}

/** Récupère une arme par son ID. */
export function getWeapon(id: string): WeaponTemplate | undefined {
  return WEAPONS[id as WeaponId];
}

/** Récupère les armes d'une catégorie spécifique. */
export function getWeaponsByCategory(category: WeaponCategory): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.category === category);
}

/** Récupère les armes d'une classe légale spécifique. */
export function getWeaponsByLegalClass(legalClass: LegalClass): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.legal === legalClass);
}

/** Récupère les armes accessibles aux civils. */
export function getCivilianWeapons(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(
    (w) => !w.policeOnly && w.legal !== "prohibee" && w.legal !== "artisanale_illegale"
  );
}

/** Récupère les armes réservées à la police. */
export function getPoliceWeapons(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.policeOnly);
}

/** Récupère les armes illégales. */
export function getIllegalWeapons(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(
    (w) => w.legal === "prohibee" || w.legal === "artisanale_illegale"
  );
}

/** Récupère les armes par faction. */
export function getWeaponsByFaction(faction: NonNullable<WeaponTemplate["faction"]>): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.faction === faction);
}

/** Récupère les armes par tag. */
export function getWeaponsByTag(tag: string): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.tags.includes(tag));
}

/** Récupère les armes dans une fourchette de prix. */
export function getWeaponsByPriceRange(minCAD: number, maxCAD: number): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(
    (w) => w.priceCAD >= minCAD && w.priceCAD <= maxCAD
  );
}

/** Récupère les armes disponibles à partir d'un niveau joueur. */
export function getWeaponsByMinLevel(level: number): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.minPlayerLevel <= level);
}

/** Vérifie si une arme peut être achetée par un joueur. */
export function canBuyWeapon(
  weaponId: WeaponId,
  licenses: LicenseId[],
  isPolice: boolean = false,
  playerLevel: number = 0
): boolean {
  const weapon = getWeapon(weaponId);
  if (!weapon) return false;
  if (playerLevel < weapon.minPlayerLevel) return false;
  if (weapon.policeOnly) return isPolice;
  if (weapon.legal === "prohibee" || weapon.legal === "artisanale_illegale") return isPolice;

  for (const requiredLicense of weapon.need) {
    if (!licenses.includes(requiredLicense)) return false;
  }
  return true;
}

/** Vérifie si une arme peut être portée. */
export function canCarryWeapon(
  weaponId: WeaponId,
  licenses: LicenseId[],
  isPolice: boolean = false
): boolean {
  return canBuyWeapon(weaponId, licenses, isPolice);
}

/** Récupère le calibre de munition d'une arme. */
export function getWeaponAmmoCaliber(weaponId: WeaponId): AmmoCaliber | undefined {
  return getWeapon(weaponId)?.ammo;
}

/** Récupère les statistiques d'une arme. */
export function getWeaponStats(weaponId: WeaponId): {
  damage: number;
  range: number;
  fireRate: number;
  magazine: number;
  reloadTime: number;
  reliability: number;
  weight: number;
} | undefined {
  const weapon = getWeapon(weaponId);
  if (!weapon) return undefined;
  return {
    damage: weapon.baseDamage,
    range: weapon.effectiveRangeMeters,
    fireRate: weapon.fireRateRPM,
    magazine: weapon.magazineCapacity,
    reloadTime: weapon.reloadTimeSeconds,
    reliability: weapon.reliabilityIndex,
    weight: weapon.weightKg,
  };
}

/** Calcule le prix de revente d'une arme selon son état. */
export function calculateResalePrice(
  weaponId: WeaponId,
  currentDurability: number
): number {
  const weapon = getWeapon(weaponId);
  if (!weapon || weapon.priceCAD === 0) return 0;

  const durabilityPct = currentDurability / weapon.maxDurability;
  const baseResale = weapon.priceCAD * (weapon.resaleValuePct / 100);
  return Math.round(baseResale * durabilityPct);
}

/** Vérifie si un mod est compatible avec une arme. */
export function isModCompatible(weaponId: WeaponId, modId: ModId): boolean {
  const weapon = getWeapon(weaponId);
  if (!weapon) return false;
  return weapon.compatibleMods.includes(modId);
}

/** Récupère tous les mods compatibles avec une arme. */
export function getCompatibleMods(weaponId: WeaponId): WeaponMod[] {
  const weapon = getWeapon(weaponId);
  if (!weapon) return [];
  return weapon.compatibleMods
    .map((modId) => MOD_CATALOG[modId])
    .filter(Boolean);
}

/** Applique les modificateurs d'un mod aux stats d'une arme. */
export function applyModToStats(
  weaponId: WeaponId,
  modId: ModId
): {
  damage: number;
  range: number;
  fireRate: number;
  reloadTime: number;
  noiseLevel: number;
} | undefined {
  const weapon = getWeapon(weaponId);
  const mod = MOD_CATALOG[modId];
  if (!weapon || !mod || !isModCompatible(weaponId, modId)) return undefined;

  return {
    damage: Math.round(weapon.baseDamage * (mod.stats.damageMult ?? 1)),
    range: Math.round(weapon.effectiveRangeMeters * (mod.stats.rangeMult ?? 1)),
    fireRate: Math.round(weapon.fireRateRPM * (mod.stats.fireRateMult ?? 1)),
    reloadTime: +(weapon.reloadTimeSeconds * (mod.stats.reloadTimeMult ?? 1)).toFixed(2),
    noiseLevel: Math.max(0, weapon.noiseLevelDecibels - (mod.stats.noiseReductionDb ?? 0)),
  };
}

/** Récupère les statistiques globales du catalogue. */
export function getCatalogStats() {
  return {
    totalWeapons: WEAPON_CATALOG.length,
    totalMods: Object.keys(MOD_CATALOG).length,
    totalAmmoTypes: Object.keys(AMMO_CATALOG).length,
    byCategory: {
      melee: getWeaponsByCategory("melee").length,
      poing: getWeaponsByCategory("poing").length,
      fusil_chasse: getWeaponsByCategory("fusil_chasse").length,
      carabine: getWeaponsByCategory("carabine").length,
      tactique_auto: getWeaponsByCategory("tactique_auto").length,
      non_letal: getWeaponsByCategory("non_letal").length,
      outil_police: getWeaponsByCategory("outil_police").length,
    },
    byLegalClass: {
      libre: getWeaponsByLegalClass("libre").length,
      sans_restriction: getWeaponsByLegalClass("sans_restriction").length,
      restreinte: getWeaponsByLegalClass("restreinte").length,
      prohibee: getWeaponsByLegalClass("prohibee").length,
      artisanale_illegale: getWeaponsByLegalClass("artisanale_illegale").length,
    },
    byFaction: {
      sq: getWeaponsByFaction("sq").length,
      grc: getWeaponsByFaction("grc").length,
      civil: getWeaponsByFaction("civil").length,
      gang_mtl: getWeaponsByFaction("gang_mtl").length,
      gang_qc: getWeaponsByFaction("gang_qc").length,
      military: getWeaponsByFaction("military").length,
      prison: getWeaponsByFaction("prison").length,
    },
    policeOnly: getPoliceWeapons().length,
    civilian: getCivilianWeapons().length,
    illegal: getIllegalWeapons().length,
  };
}

/** Recherche d'armes par texte libre. */
export function searchWeapons(query: string): WeaponTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return WEAPON_CATALOG;

  return WEAPON_CATALOG.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.id.toLowerCase().includes(q) ||
      w.tags.some((t) => t.toLowerCase().includes(q)) ||
      w.modelCode.toLowerCase().includes(q)
  );
}
// ═══════════════════════════════════════════════════════════════════
// 🌿 PORTÉE DE RÉCOLTE / CHASSE
// ═══════════════════════════════════════════════════════════════════

/**
 * Retourne la portée de récolte (en mètres) pour une arme / outil.
 * Utilisé par commerce.harvestRange() → engine pour nearestHarvestable().
 *
 * @param id - ID de l'arme/outil équipé
 * @returns Portée en mètres (0 si arme inconnue)
 */

// ═══════════════════════════════════════════════════════════════════
// 🌿 COMPAT EXPORTS — ajoutes apres refactor
// ═══════════════════════════════════════════════════════════════════
export function weaponHarvestRange(id: string): number {
  const w = getWeapon(id);
  if (!w) return 0;
  switch (w.category) {
    case "fusil_chasse": return 5.0;
    case "poing":        return 1.5;
    default:             return 3.5;
  }
}
export function checkCarryLegality(_id: string, _zone?: string): { ok: boolean; legal: boolean; reason?: string } {
  return { ok: true, legal: true };
}
export function isZoneWeapon(_zone?: string): boolean { return false; }
export function matchCasingToWeapon(_casingId: string, _weaponId?: string): boolean { return false; }
export function buildWeaponMesh(_id: string): any { return null; }
export function holdPose(_id: string): { pos: [number, number, number]; rot: [number, number, number] } {
  return { pos: [0, 0, 0], rot: [0, 0, 0] };
}

// ═══════════════════════════════════════════════════════════════════
// LICENSE_COMPAT_STUBS — licenses (importes par store.ts)
// TODO: implémenter réellement
// ═══════════════════════════════════════════════════════════════════
export function canPurchase(
  _licenses: LicenseId[] | unknown,
  _itemOrId: unknown,
  _rpJob?: unknown
): {
  ok: boolean;
  message?: string;
  price: number;
  weight: number;
  lines: { item: { id: string }; qty: number }[];
} {
  return { ok: true, price: 0, weight: 0, lines: [] };
}

export function grantLicense(
  playerLicenses: LicenseId[] | unknown,
  licenseId: LicenseId | unknown
): LicenseId[] {
  const arr = Array.isArray(playerLicenses) ? (playerLicenses as LicenseId[]) : [];
  const id = licenseId as LicenseId;
  return arr.includes(id) ? arr : [...arr, id];
}

export function licenseFromItem(_itemId: string | unknown): LicenseId | null {
  return null;
}

export function parseLicenses(raw: unknown): LicenseId[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as LicenseId[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p as LicenseId[] : [];
    } catch { return []; }
  }
  return [];
}
// ═══════════════════════════════════════════════════════════════════