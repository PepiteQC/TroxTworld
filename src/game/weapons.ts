/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME D'ARMEMENT, BALISTIQUE ET LOIS SUR LES ARMES DU QUÉBEC
 * ═══════════════════════════════════════════════════════════════════
 *
 * LÉGISLATION ET ENREGISTREMENT :
 *  - Permis d'armes à feu (PPA / PAL) : Sans restriction, Restreint (PAL-R), Chasse MFFP.
 *  - Loi 64 sur l'immatriculation des armes à feu du Québec (SIAF) :
 *    Toute arme d'épaule légale possède un numéro d'immatriculation québécois unique.
 *  - Marché noir : Armes à numéro de série meulé (Untraceable), Ghost Guns 3D,
 *    armes prohibées importées (Glock Switch automatique, fusils sciés).
 *
 * BALISTIQUE & MÉCANIQUE RÉALISTE :
 *  - Dégradation, encrassement de poudre et risque d'enrayage (Jam / Misfire).
 *  - Éjection de douilles physiques au sol (indices prélevables par les enquêteurs de la SQ).
 *  - Types de munitions : Balles blindées (FMJ), Pointe creuse (Hollow Point),
 *    Cartouches de chasse (Buckshot 00, Balle Slug, Plomb #4), Balles de caoutchouc moins-létales.
 *  - Système balistique IBIS : Chaque canon laisse une signature unique sur les douilles.
 */

import * as THREE from "three";
import { matLib } from "./materials";
import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { sendPrivateMessage, sendChatMessage } from "./chat";
import { triggerNotification } from "./phone";
import { addWantedPoints, dispatchPolice } from "./police";
import { modifyHealth, getPlayerHealth } from "./survival";
import { useGameStore } from "./store";

// ═══════════════════════════════════════════════════════════
// TYPES & ENUMS DU SYSTÈME LÉGAL CANADIEN / QUÉBÉCOIS
// ═══════════════════════════════════════════════════════════

export type LicenseId =
  | "pal"                   // Permis de possession et d'acquisition standard (Armes d'épaule)
  | "pal_r"                 // PAL à autorisation restreinte (Armes de poing / Clubs de tir)
  | "chasse"                // Permis de chasse MFFP (Gros & petit gibier)
  | "att_transport"         // Autorisation de transport vers stand de tir
  | "siaf_exempt";          // Statut policier / militaire

export type LegalClass =
  | "libre"                 // Couteaux, outils, sprays anti-agression autorisés
  | "sans_restriction"      // Carabines de chasse, fusils de calibre 12 (Immatriculation SIAF requise)
  | "restreinte"            // Armes de poing, revolvers (Enregistrement fédéral GRC + club)
  | "prohibee"              // Fusils d'assaut full-auto, armes à canon court, Glock Switch
  | "artisanale_illegale";  // Surins de prison, armes 3D non déclarées

export type WeaponCategory =
  | "melee"
  | "poing"
  | "fusil_chasse"
  | "carabine"
  | "tactique_auto"
  | "non_letal"
  | "outil_police";

export type WeaponRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "contrabande";
export type WeaponSource = "chasse_pro" | "dealer_noir" | "quincaillerie" | "depanneur" | "sq_arsenal" | "prison_craft";

export type AmmoCaliber =
  | "ammo_9mm"              // 9x19mm Luger
  | "ammo_40sw"             // .40 S&W (Police)
  | "ammo_357"              // .357 Magnum
  | "ammo_45acp"            // .45 ACP
  | "ammo_50ae"             // .50 Action Express
  | "ammo_12g_buckshot"     // 12 Gauge Chevrotine 00
  | "ammo_12g_slug"         // 12 Gauge Balle pleine (Orignal/Ours)
  | "ammo_12g_rubber"       // 12 Gauge Moins-létal caoutchouc
  | "ammo_30_30"            // .30-30 Winchester
  | "ammo_308"              // .308 Winchester (7.62x51mm)
  | "ammo_556"              // 5.56x45mm NATO (.223 Rem)
  | "ammo_762x39"           // 7.62x39mm (SKS / AK)
  | "ammo_22lr"             // .22 Long Rifle (Plinking)
  | "ammo_taser_cartridge"; // Cartouche d'électrodes

export type WeaponId =
  // Armes blanches & Outils
  | "poing-americain"
  | "couteau-chasse"
  | "batte-baseball"
  | "machette"
  | "hache-pompier"
  | "surin-prison"
  | "pied-de-biche"
  // Armes de poing
  | "glock-19"
  | "glock-17-sq"
  | "glock-switch-auto"     // Glock 19 avec sélecteur automatique illégal
  | "revolver-357"
  | "colt-1911"
  | "desert-eagle"
  // Fusils de chasse & Calibre 12
  | "remington-870"
  | "fusil-chasse-12"
  | "fusil-canon-scie"      // Arme prohibée de motard
  | "mossberg-590-tactical"
  // Carabines de précision & chasse
  | "carabine-30-30"
  | "carabine-308"
  | "ruger-10-22"
  // Armes semi-automatiques & assaut (Marché noir & Forces de l'ordre)
  | "colt-c8-sq"            // Carabine de patrouille SQ officielle
  | "ar15-civil"
  | "ak74"
  | "sks-russe"
  | "mac11-auto"
  | "fgc9-3d"               // Arme imprimée 3D artisanale
  // Moins-létal & Police
  | "taser-x26"
  | "matraque-sq"
  | "spray-poivre"
  | "flashbang"
  | "menottes";

// ═══════════════════════════════════════════════════════════
// DÉFINITION DES PERMIS (LOIS CANADIENNES ET QUÉBÉCOISES)
// ═══════════════════════════════════════════════════════════

export interface LicenseDef {
  id: LicenseId;
  name: string;
  issuer: string;
  priceCAD: number;
  desc: string;
  durationYears: number;
}

export const LICENSES: Record<LicenseId, LicenseDef> = {
  pal: {
    id: "pal",
    name: "Permis de possession et d'acquisition (PPA / PAL)",
    issuer: "Gendarmerie royale du Canada & SQ",
    priceCAD: 85,
    desc: "Autorise l'achat et la possession d'armes d'épaule sans restriction (Carabines de chasse, calibre 12).",
    durationYears: 5,
  },
  pal_r: {
    id: "pal_r",
    name: "PPA avec autorisation restreinte (PAL-R)",
    issuer: "Contrôleur des armes à feu du Québec",
    priceCAD: 195,
    desc: "Obligatoire pour les armes de poing et revolvers. Requiert l'adhésion active à un club de tir de la FQT.",
    durationYears: 5,
  },
  chasse: {
    id: "chasse",
    name: "Certificat du chasseur & Permis MFFP",
    issuer: "Ministère des Forêts, de la Faune et des Parcs",
    priceCAD: 46,
    desc: "Autorise la chasse sportive dans les zones de gestion contrôlée (ZEC) et pourvoiries du comté.",
    durationYears: 1,
  },
  att_transport: {
    id: "att_transport",
    name: "Autorisation de transport (ATT)",
    issuer: "Sûreté du Québec",
    priceCAD: 35,
    desc: "Permet de transporter une arme restreinte verrouillée dans son coffre vers un champ de tir homologué.",
    durationYears: 1,
  },
  siaf_exempt: {
    id: "siaf_exempt",
    name: "Exemption de service (Agents de la paix)",
    issuer: "Gouvernement du Québec",
    priceCAD: 0,
    desc: "Exemption statutaire pour policiers en devoir et agents correctionnels.",
    durationYears: 99,
  },
};

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES MUNITIONS
// ═══════════════════════════════════════════════════════════

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
}

export const AMMO_CATALOG: Record<AmmoCaliber, AmmoSpec> = {
  ammo_9mm: {
    caliber: "ammo_9mm",
    name: "Boîte 9x19mm Luger (50 cartouches)",
    boxQuantity: 50,
    boxPriceCAD: 32,
    damageModifier: 1.0,
    armorPenetrationPct: 35,
    bulletVelocityMs: 380,
    bleedChance: 0.35,
    isLessLethal: false,
  },
  ammo_40sw: {
    caliber: "ammo_40sw",
    name: "Boîte .40 S&W Speer Gold Dot (50 cartouches)",
    boxQuantity: 50,
    boxPriceCAD: 45,
    damageModifier: 1.15,
    armorPenetrationPct: 40,
    bulletVelocityMs: 360,
    bleedChance: 0.45,
    isLessLethal: false,
  },
  ammo_357: {
    caliber: "ammo_357",
    name: "Boîte .357 Magnum JSP (50 cartouches)",
    boxQuantity: 50,
    boxPriceCAD: 55,
    damageModifier: 1.45,
    armorPenetrationPct: 55,
    bulletVelocityMs: 440,
    bleedChance: 0.60,
    isLessLethal: false,
  },
  ammo_45acp: {
    caliber: "ammo_45acp",
    name: "Boîte .45 ACP Federal Hydra-Shok (50 cartouches)",
    boxQuantity: 50,
    boxPriceCAD: 48,
    damageModifier: 1.30,
    armorPenetrationPct: 30,
    bulletVelocityMs: 260,
    bleedChance: 0.65,
    isLessLethal: false,
  },
  ammo_50ae: {
    caliber: "ammo_50ae",
    name: "Boîte .50 Action Express (20 cartouches)",
    boxQuantity: 20,
    boxPriceCAD: 85,
    damageModifier: 2.20,
    armorPenetrationPct: 75,
    bulletVelocityMs: 470,
    bleedChance: 0.85,
    isLessLethal: false,
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
  },
  ammo_12g_slug: {
    caliber: "ammo_12g_slug",
    name: "Boîte Calibre 12 Sabot Slug (10 cartouches)",
    boxQuantity: 10,
    boxPriceCAD: 30,
    damageModifier: 2.10,
    armorPenetrationPct: 80,
    bulletVelocityMs: 490,
    bleedChance: 0.80,
    isLessLethal: false,
  },
  ammo_12g_rubber: {
    caliber: "ammo_12g_rubber",
    name: "Cartouches anti-émeute caoutchouc (10 cartouches)",
    boxQuantity: 10,
    boxPriceCAD: 40,
    damageModifier: 0.15,
    armorPenetrationPct: 5,
    bulletVelocityMs: 180,
    bleedChance: 0.0,
    isLessLethal: true,
  },
  ammo_30_30: {
    caliber: "ammo_30_30",
    name: "Boîte .30-30 Winchester Chasse (20 cartouches)",
    boxQuantity: 20,
    boxPriceCAD: 38,
    damageModifier: 1.65,
    armorPenetrationPct: 60,
    bulletVelocityMs: 720,
    bleedChance: 0.70,
    isLessLethal: false,
  },
  ammo_308: {
    caliber: "ammo_308",
    name: "Boîte .308 Win / 7.62x51mm (20 cartouches)",
    boxQuantity: 20,
    boxPriceCAD: 44,
    damageModifier: 1.95,
    armorPenetrationPct: 85,
    bulletVelocityMs: 820,
    bleedChance: 0.75,
    isLessLethal: false,
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
  },
  ammo_762x39: {
    caliber: "ammo_762x39",
    name: "Boîte Surplus Militaire 7.62x39mm (40 cartouches)",
    boxQuantity: 40,
    boxPriceCAD: 30,
    damageModifier: 1.55,
    armorPenetrationPct: 70,
    bulletVelocityMs: 730,
    bleedChance: 0.60,
    isLessLethal: false,
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
  },
  ammo_taser_cartridge: {
    caliber: "ammo_taser_cartridge",
    name: "Cartouches Taser Axon X26P (x2)",
    boxQuantity: 2,
    boxPriceCAD: 95,
    damageModifier: 0.05,
    armorPenetrationPct: 0,
    bulletVelocityMs: 60,
    bleedChance: 0.0,
    isLessLethal: true,
  },
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE D'ARME & STATISTIQUES BALISTIQUES
// ═══════════════════════════════════════════════════════════

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
  fireRateRPM: number;         // Coups par minute
  magazineCapacity: number;
  reloadTimeSeconds: number;
  maxDurability: number;
  priceCAD: number;
  policeOnly: boolean;
  concealable: boolean;        // Peut être cachée sous un manteau d'hiver
  isFullAutoCapable: boolean;
  barrelLengthInches: number;
  noiseLevelDecibels: number;
  description: string;
}

export const WEAPON_CATALOG: WeaponTemplate[] = [
  // ── 1. ARMES BLANCHES & OUTILS ──
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
    description: "Lame fixe en acier inoxydable avec manche en bois d'ébène. Idéal pour éviscérer le gibier.",
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
    description: "Outil d'arpenteur et de bûcheron pour ouvrir des sentiers dans le bois dense.",
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
    description: "Hache de démolition avec tête forgée et pointe d'effraction arrière.",
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
    description: "Tige d'acier de sommier affûtée sur le béton et recouverte de ruban adhésif.",
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
    description: "Outil de force industrielle permettant également de crocheter ou défoncer des serrures.",
  },

  // ── 2. ARMES DE POING RÉGLEMENTÉES ET ILLÉGALES ──
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
  },
  {
    id: "glock-17-sq",
    name: "Glock 17 de Service (Sûreté du Québec)",
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
    description: "Arme de service officielle des patrouilleurs de la SQ et du SPVM avec gravure matricule.",
  },
  {
    id: "glock-switch-auto",
    name: "Glock 19 avec Sélecteur Automatique (Switch)",
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
    description: "Pistolet modifié illégalement avec une pièce arrière de conversion automatique. Arme de gang.",
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
    description: "Revolver lourd en acier inoxydable avec une puissance d'arrêt redoutable.",
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
    description: "Monstre d'acier au recul brutal capable de traverser les portières de véhicule.",
  },

  // ── 3. FUSILS DE CHASSE & CALIBRE 12 ──
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
    description: "Le fusil à pompe de référence des bois québécois avec crosse en noyer américain.",
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
    description: "Fusil de chasse à double canon basculant très répandu pour la sauvagine et le canard.",
  },
  {
    id: "fusil-canon-scie",
    name: "Fusil de calibre 12 à canon scié",
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
    description: "Fusil artisanal raccourci à la scie à métaux pour être dissimulé sous un blouson de cuir.",
  },
  {
    id: "mossberg-590-tactical",
    name: "Mossberg 590 Tactical (Anti-émeute)",
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
    description: "Fusil tactique robuste utilisé par le GTI de la SQ et les gardiens de prison.",
  },

  // ── 4. CARABINES DE CHASSE ET DE PRÉCISION ──
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
    description: "L'arme légendaire de la chasse au chevreuil au Québec. Réarmement par levier de sous-garde.",
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
    description: "Carabine finlandaise de haute précision avec lunette 3-9x40 pour l'orignal et l'ours noir.",
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
    description: "Carabine semi-automatique légère pour le tir récréatif et les petits animaux nuisibles.",
  },

  // ── 5. CARABINES TACTIQUES & ASSAUT ──
  {
    id: "colt-c8-sq",
    name: "Colt Canada C8 IUR 5.56mm (GTI / SQ)",
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
    description: "Carabine d'assaut tactique fabriquée en Ontario, équipement standard du GTI et patrouilles spécialisées.",
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
    description: "Arme d'assaut passée en contrebande depuis les États-Unis sans numéro d'enregistrement.",
  },
  {
    id: "ak74",
    name: "Kalachnikov AK-74 5.45x39mm",
    modelCode: "IZHMASH-AK74M",
    legal: "prohibee",
    source: "dealer_noir",
    need: [],
    ammo: "ammo_556",
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
    description: "Fusil d'assaut automatique de contrebande importé par conteneur maritime au Port de Montréal.",
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
    description: "Carabine militaire soviétique très populaire auprès des tireurs québécois pour son faible coût.",
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
    description: "Arme automatique compacte utilisée lors des règlements de compte entre gangs de rue.",
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
    description: "Carabine 9mm fabriquée maison avec imprimante 3D et pièces de quincaillerie. Sans numéro de série.",
  },

  // ── 6. MATÉRIEL POLICIER & MOINS-LÉTAL ──
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
    description: "Neutralisation neuromusculaire temporaire à 50 000 volts pour immobiliser un suspect armé.",
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
    description: "Bâton d'acier trempé à déploiement rapide utilisé pour le contrôle de foule et les frappes défensives.",
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
    description: "Gaz poivre OC irritant provoquant la fermeture involontaire des yeux et des difficultés respiratoires.",
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
    description: "Flash aveuglant de 6 à 8 millions de candelas et détonation de 175 dB pour désorienter les retranchés.",
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
    description: "Entraves en acier nickelé avec double verrouillage de sécurité réglementaire.",
  },
];

export const WEAPONS: Record<WeaponId, WeaponTemplate> = Object.fromEntries(
  WEAPON_CATALOG.map((w) => [w.id, w]),
) as Record<WeaponId, WeaponTemplate>;

export const WEAPON_IDS = WEAPON_CATALOG.map((w) => w.id);
export const POLICE_KIT: WeaponId[] = ["taser-x26", "matraque-sq", "spray-poivre", "flashbang", "menottes", "glock-17-sq"];

// ═══════════════════════════════════════════════════════════
// INSTANCES PHYSIQUES D'ARMES & BALISTIQUE
// ═══════════════════════════════════════════════════════════

export interface WeaponInstance {
  serialNumber: string;
  siafRegistrationNumber?: string;
  isDefacedSerial: boolean;
  templateId: WeaponId;
  ownerPlayerId: string;
  durabilityCurrent: number;
  cleanlinessScore: number;
  isJammed: boolean;
  loadedRounds: number;
  hasRoundInChamber: boolean;
  selectedFireMode: "safe" | "semi" | "auto" | "burst";
  ballisticFingerprintId: string;
  attachments: {
    silencer: boolean;
    flashlight: boolean;
    opticSight?: "red_dot" | "scope_4x" | "thermal";
    extendedMag: boolean;
    autoSwitchInstalled: boolean;
  };
}

export interface WeaponState {
  weaponId: WeaponId | null;
  equipped: boolean;
  ammo: number;
  reserveAmmo: number;
  isReloading: boolean;
  isAiming: boolean;
  adsProgress: number;
  lastFireTime: number;
  canFire: boolean;
  currentSpread: number;
  currentRecoil: { x: number; y: number };
  heat: number;
  burstCount: number;
  totalShots: number;
  totalHits: number;
  totalDamage: number;
}

const WEAPON_INSTANCES = new Map<string, WeaponInstance>();
const BALISTIC_EVIDENCE_CASINGS = new Map<string, {
  casingId: string;
  caliber: AmmoCaliber;
  ballisticFingerprintId: string;
  firedAt: number;
  location: { x: number; y: number; z: number };
}>();

// ═══════════════════════════════════════════════════════════
// SYSTÈMES ET FONCTIONS LÉGALES (SIAF / MEULAGE / BALISTIQUE)
// ═══════════════════════════════════════════════════════════

export function registerWeaponToSIAF(
  weaponSerial: string,
  ownerPlayerId: string,
  officerBadge: string = "SIAF-SYSTEM",
): { ok: boolean; siafNumber: string; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) return { ok: false, siafNumber: "", message: "Arme introuvable dans le registre." };

  if (instance.isDefacedSerial) {
    return { ok: false, siafNumber: "", message: "Impossible d'immatriculer une arme au numéro de série altéré." };
  }

  const siafNumber = `QC-${Math.floor(1000000 + Math.random() * 9000000)}`;
  instance.siafRegistrationNumber = siafNumber;
  instance.ownerPlayerId = ownerPlayerId;

  triggerNotification(ownerPlayerId, {
    title: "📑 Certificat d'immatriculation SIAF",
    body: `Arme : ${instance.templateId}\nNuméro SIAF : ${siafNumber}\nConforme à la Loi 64 du Québec.`,
    icon: "📜",
  });

  netEmit("weapons:siaf_registered", { weaponSerial, siafNumber, ownerPlayerId });

  return {
    ok: true,
    siafNumber,
    message: `Arme immatriculée avec succès au fichier central du Québec (SIAF #${siafNumber}).`,
  };
}

export function defaceWeaponSerialNumber(
  weaponSerial: string,
  mechanicPlayerId: string,
): { ok: boolean; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) return { ok: false, message: "Arme introuvable." };
  if (instance.isDefacedSerial) return { ok: false, message: "Le numéro de série est déjà complètement effacé." };

  instance.isDefacedSerial = true;
  instance.siafRegistrationNumber = undefined;
  instance.serialNumber = `DEFACED-${Math.floor(1000 + Math.random() * 9000)}`;
  instance.durabilityCurrent = Math.max(10, instance.durabilityCurrent - 15);

  sendChatMessage(`⚠️ [MARCHÉ NOIR] Un numéro de série d'arme à feu a été meulé au dremel.`);
  netEmit("weapons:serial_defaced", { weaponSerial });

  return {
    ok: true,
    message: "Numéro de série meulé avec succès ! L'arme est désormais intraçable par la SQ.",
  };
}

export interface ShootResult {
  fired: boolean;
  isJammed: boolean;
  damageDealt: number;
  bulletImpactPos?: { x: number; y: number; z: number };
  roundsRemaining: number;
  soundDecibels: number;
  message: string;
}

export function fireWeapon(
  weaponSerial: string,
  shooterPlayerId: string,
  shooterPos: { x: number; y: number; z: number },
  aimDirection: { x: number; y: number; z: number },
  targetPlayerId?: string,
): ShootResult {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  const template = instance ? getWeapon(instance.templateId) : undefined;

  if (!instance || !template) {
    return { fired: false, isJammed: false, damageDealt: 0, roundsRemaining: 0, soundDecibels: 0, message: "Arme invalide." };
  }

  if (instance.isJammed) {
    return {
      fired: false,
      isJammed: true,
      damageDealt: 0,
      roundsRemaining: instance.loadedRounds,
      soundDecibels: 0,
      message: "⚠️ CLIC ! L'arme est enrayée ! Effectuez un désenrayage d'urgence.",
    };
  }

  if (template.category !== "melee") {
    if (instance.loadedRounds <= 0) {
      return {
        fired: false,
        isJammed: false,
        damageDealt: 0,
        roundsRemaining: 0,
        soundDecibels: 10,
        message: "CLIC ! Chargeur vide.",
      };
    }
    instance.loadedRounds--;
  }

  instance.durabilityCurrent = Math.max(0, instance.durabilityCurrent - 1);
  instance.cleanlinessScore = Math.max(0, instance.cleanlinessScore - 0.5);

  const jamChance = (100 - instance.cleanlinessScore) * 0.001 + (instance.durabilityCurrent < 50 ? 0.05 : 0.005);
  if (Math.random() < jamChance && template.category !== "melee") {
    instance.isJammed = true;
    return {
      fired: false,
      isJammed: true,
      damageDealt: 0,
      roundsRemaining: instance.loadedRounds,
      soundDecibels: 20,
      message: "💥 ENRAYAGE ! Une douille est coincée dans la culasse !",
    };
  }

  if (template.ammo) {
    const casingId = `CASING-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`;
    BALISTIC_EVIDENCE_CASINGS.set(casingId, {
      casingId,
      caliber: template.ammo,
      ballisticFingerprintId: instance.ballisticFingerprintId,
      firedAt: Date.now(),
      location: { ...shooterPos },
    });
  }

  let finalDamage = template.baseDamage;
  const ammoSpec = template.ammo ? AMMO_CATALOG[template.ammo] : undefined;

  if (ammoSpec) {
    finalDamage *= ammoSpec.damageModifier;
  }

  if (targetPlayerId) {
    modifyHealth(-finalDamage, targetPlayerId);

    if (ammoSpec && ammoSpec.isLessLethal) {
      triggerNotification(targetPlayerId, {
        title: "⚡ NEUTRALISÉ",
        body: "Impulsion électrique subie ! Muscles tétanisés.",
        icon: "⚡",
        urgent: true,
      });
    }
  }

  let soundLevel = template.noiseLevelDecibels;
  if (instance.attachments.silencer) {
    soundLevel = Math.max(110, soundLevel - 35);
  }

  if (soundLevel >= 140) {
    addWantedPoints(shooterPlayerId, 25, "Coup de feu tiré en public");
    dispatchPolice({
      location: { x: shooterPos.x, z: shooterPos.z },
      priority: "critical",
      type: "shots_fired",
      description: `Détonations d'arme à feu signalées (${template.name}) !`,
    });
  }

  netEmit("weapons:shot_fired", {
    shooterId: shooterPlayerId,
    weaponId: template.id,
    pos: shooterPos,
    dir: aimDirection,
    damage: finalDamage,
    targetId: targetPlayerId,
  });

  return {
    fired: true,
    isJammed: false,
    damageDealt: finalDamage,
    roundsRemaining: instance.loadedRounds,
    soundDecibels: soundLevel,
    message: `BANG ! Tir effectué avec ${template.name}.`,
  };
}

export function clearWeaponJam(weaponSerial: string): { ok: boolean; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) return { ok: false, message: "Arme introuvable." };
  if (!instance.isJammed) return { ok: false, message: "L'arme n'est pas enrayée." };

  instance.isJammed = false;
  return { ok: true, message: "Tap-Rack-Bang ! Douille expulsée, arme prête à faire feu." };
}

export function cleanAndServiceWeapon(
  weaponSerial: string,
  playerId: string,
): { ok: boolean; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) return { ok: false, message: "Arme introuvable." };

  instance.cleanlinessScore = 100;
  instance.durabilityCurrent = Math.min(
    getWeapon(instance.templateId)?.maxDurability ?? 300,
    instance.durabilityCurrent + 50,
  );
  instance.isJammed = false;

  triggerNotification(playerId, {
    title: "🔧 Arme nettoyée et huilée",
    body: `${instance.templateId}\nCulasse graissée, canon écouvillonné. Risque d'enrayage nul.`,
    icon: "🧽",
  });

  return { ok: true, message: "Arme entièrement démontée, dégraissée et révisée." };
}

export function matchCasingToWeapon(
  casingId: string,
  weaponSerial: string,
): { match: boolean; confidencePct: number; report: string } {
  const casing = BALISTIC_EVIDENCE_CASINGS.get(casingId);
  const weapon = WEAPON_INSTANCES.get(weaponSerial);

  if (!casing || !weapon) {
    return { match: false, confidencePct: 0, report: "Indice ou arme non disponible pour analyse." };
  }

  const isMatching = casing.ballisticFingerprintId === weapon.ballisticFingerprintId;
  const confidence = isMatching ? 99.8 : 0.0;
  const report = isMatching
    ? `✅ MATCH POSITIF (IBIS) : Les rayures de culasse et la marque du percuteur correspondent à l'arme ${weapon.templateId} (Matricule: ${weapon.serialNumber}).`
    : "❌ RÉSULTAT NÉGATIF : Aucune correspondance balistique trouvée.";

  return { match: isMatching, confidencePct: confidence, report };
}

// ═══════════════════════════════════════════════════════════
// HELPERS LÉGAUX ET PERMIS
// ═══════════════════════════════════════════════════════════

export function isWeaponId(id: string): id is WeaponId {
  return id in WEAPONS;
}

export function getWeapon(id: string): WeaponTemplate | undefined {
  return WEAPONS[id as WeaponId];
}

export function isLegalToCarry(
  id: string,
  ctx: { hasLicence: boolean; isPolice: boolean; licenses?: LicenseId[] },
): boolean {
  const def = getWeapon(id);
  if (!def) return true;
  if (def.policeOnly) return ctx.isPolice;
  if (def.legal === "prohibee" || def.legal === "artisanale_illegale") return ctx.isPolice;
  if (def.need.length && ctx.licenses) {
    return def.need.every((n) => ctx.licenses!.includes(n)) || ctx.isPolice;
  }
  return true;
}

export function canPurchase(
  licenses: LicenseId[],
  itemId: string,
  job = "civil",
): { ok: boolean; missing?: LicenseId; message?: string } {
  const w = getWeapon(itemId);
  if (!w) return { ok: true };
  const cop = job === "policier" || job === "agent_sq" || job === "agent_spvm";
  const crime = job === "criminel";

  if (w.policeOnly && !cop) return { ok: false, message: `Réservé aux forces de l'ordre · ${w.name}` };
  if ((w.legal === "prohibee" || w.legal === "artisanale_illegale") && !cop && !crime) {
    return { ok: false, message: `Arme prohibée au Canada · ${w.name}` };
  }
  if (cop) return { ok: true };

  const miss = w.need.find((n) => !licenses.includes(n));
  if (!miss) return { ok: true };
  const L = LICENSES[miss];
  return { ok: false, missing: miss, message: `Permis obligatoire · ${L.name}` };
}

export function checkCarryLegality(
  licenses: LicenseId[],
  equipped: string | null,
  job = "civil",
): { legal: boolean; message?: string } {
  if (!equipped) return { legal: true };
  const w = getWeapon(equipped);
  if (!w) return { legal: true };

  const cop = job === "policier" || job === "agent_sq" || job === "agent_spvm";
  if (w.policeOnly) return cop ? { legal: true } : { legal: false, message: `Port prohibé · ${w.name}` };
  if (w.legal === "prohibee" || w.legal === "artisanale_illegale") {
    return cop ? { legal: true } : { legal: false, message: `Port d'arme prohibée (Art. 91 CC) · ${w.name}` };
  }
  if (cop) return { legal: true };

  const miss = w.need.find((n) => !licenses.includes(n));
  if (!miss) return { legal: true };
  return { legal: false, message: `Infraction : Permis ${LICENSES[miss].name} non présenté` };
}

// ═══════════════════════════════════════════════════════════
// BUILDERS 3D PROCEDURAUX THREE.JS & GESTIONNAIRE INTÉGRÉ
// ═══════════════════════════════════════════════════════════

const steel = () => matLib.get(0x4a4d52, 0.35, 0.9);
const steelDark = () => matLib.get(0x1a1b1d, 0.4, 0.75);
const walnut = () => matLib.get(0x5a3a22, 0.62);
const maple = () => matLib.get(0xc9a06a, 0.58);
const poly = () => matLib.get(0x2c2c2e, 0.62);
const safety = () => matLib.getEmissive(0xf0c020, 0xf0c020, 0.28);
const ghostOrange = () => matLib.get(0xd97706, 0.5, 0.1);

function shadows(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return g;
}

const BUILDERS: Partial<Record<WeaponId, () => THREE.Group>> = {
  "poing-americain": () => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 16), steel());
      ring.position.set(-0.09 + i * 0.06, 0, 0);
      ring.rotation.y = Math.PI / 2;
      g.add(ring);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.03), steel());
    bar.position.y = 0.045;
    g.add(bar);
    return shadows(g);
  },
  "couteau-chasse": () => {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.24, 3), steel());
    blade.rotation.z = Math.PI / 2;
    blade.position.x = 0.16;
    g.add(blade);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.14, 8), walnut());
    handle.rotation.z = Math.PI / 2;
    handle.position.x = -0.03;
    g.add(handle);
    return shadows(g);
  },
  "surin-prison": () => {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.008), steelDark());
    blade.position.x = 0.1;
    g.add(blade);
    const tapeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.1, 8), poly());
    tapeHandle.rotation.z = Math.PI / 2;
    tapeHandle.position.x = -0.04;
    g.add(tapeHandle);
    return shadows(g);
  },
  "batte-baseball": () => {
    const g = new THREE.Group();
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.045, 0.85, 12), maple());
    bat.rotation.z = Math.PI / 2;
    g.add(bat);
    return shadows(g);
  },
  machette: () => {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.012), steel());
    blade.position.x = 0.25;
    g.add(blade);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), poly());
    handle.rotation.z = Math.PI / 2;
    handle.position.x = -0.08;
    g.add(handle);
    return shadows(g);
  },
  "glock-19": () => {
    const g = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, 0.03), steelDark());
    slide.position.set(0.02, 0.06, 0);
    g.add(slide);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 10), steel());
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.14, 0.06, 0);
    g.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.11, 0.028), poly());
    grip.position.set(-0.05, -0.01, 0);
    grip.rotation.z = -0.18;
    g.add(grip);
    return shadows(g);
  },
  "glock-switch-auto": () => {
    const g = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, 0.03), steelDark());
    slide.position.set(0.02, 0.06, 0);
    g.add(slide);
    const switchCap = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.025), matLib.get(0xef4444, 0.3, 0.5));
    switchCap.position.set(-0.08, 0.06, 0);
    g.add(switchCap);
    const drum = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.025), steelDark());
    drum.position.set(-0.07, -0.12, 0);
    drum.rotation.z = -0.18;
    g.add(drum);
    return shadows(g);
  },
  "remington-870": () => {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.78, 10), steel());
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.26, 0.06, 0);
    g.add(barrel);
    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), steelDark());
    magTube.rotation.z = Math.PI / 2;
    magTube.position.set(0.18, 0.035, 0);
    g.add(magTube);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.035), walnut());
    stock.position.set(-0.46, 0.02, 0);
    g.add(stock);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), walnut());
    pump.rotation.z = Math.PI / 2;
    pump.position.set(0.12, 0.035, 0);
    g.add(pump);
    return shadows(g);
  },
  "fusil-canon-scie": () => {
    const g = new THREE.Group();
    const shortBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 8), steelDark());
    shortBarrel.rotation.z = Math.PI / 2;
    shortBarrel.position.set(0.12, 0.06, 0);
    g.add(shortBarrel);
    const pistolStock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), walnut());
    pistolStock.position.set(-0.1, 0.01, 0);
    pistolStock.rotation.z = -0.4;
    g.add(pistolStock);
    return shadows(g);
  },
  "carabine-30-30": () => {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.68, 10), steel());
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.22, 0.06, 0);
    g.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.032), maple());
    stock.position.set(-0.42, 0.01, 0);
    g.add(stock);
    const lever = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), steelDark());
    lever.rotation.z = Math.PI;
    lever.position.set(-0.1, -0.03, 0);
    g.add(lever);
    return shadows(g);
  },
  "carabine-308": () => {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.74, 10), steelDark());
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.25, 0.06, 0);
    g.add(barrel);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8), poly());
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0.02, 0.11, 0);
    g.add(scope);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.035), walnut());
    stock.position.set(-0.44, 0.01, 0);
    g.add(stock);
    return shadows(g);
  },
  "colt-c8-sq": () => {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 10), steelDark());
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.32, 0.075, 0);
    g.add(barrel);
    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.035), poly());
    optic.position.set(0.05, 0.12, 0);
    g.add(optic);
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.04), poly());
    rec.position.set(-0.02, 0.06, 0);
    g.add(rec);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), steelDark());
    mag.position.set(-0.02, -0.08, 0);
    mag.rotation.z = 0.15;
    g.add(mag);
    return shadows(g);
  },
  "fgc9-3d": () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.045), ghostOrange());
    body.position.set(0.02, 0.06, 0);
    g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8), steel());
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.24, 0.06, 0);
    g.add(barrel);
    return shadows(g);
  },
  "taser-x26": () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.035), safety());
    body.position.y = 0.05;
    g.add(body);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.09, 0.028), steelDark());
    grip.position.set(-0.04, -0.02, 0);
    grip.rotation.z = -0.2;
    g.add(grip);
    return shadows(g);
  },
  "matraque-sq": () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.58, 8), steelDark());
    body.position.y = 0.28;
    g.add(body);
    return shadows(g);
  },
  "spray-poivre": () => {
    const g = new THREE.Group();
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 10), matLib.get(0xef4444, 0.4, 0.2));
    canister.position.y = 0.06;
    g.add(canister);
    return shadows(g);
  },
  flashbang: () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10), steel());
    body.position.y = 0.06;
    g.add(body);
    return shadows(g);
  },
  menottes: () => {
    const g = new THREE.Group();
    for (const x of [-0.05, 0.05]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 16), steel());
      ring.position.set(x, 0, 0);
      g.add(ring);
    }
    return shadows(g);
  },
};

export function buildWeaponMesh(id: WeaponId): THREE.Group {
  const make = BUILDERS[id];
  const group = make ? make() : new THREE.Group();
  group.name = `weapon:${id}`;
  return group;
}

export function attachWeaponTo(
  id: WeaponId,
  anchor: THREE.Object3D,
  offset = new THREE.Vector3(),
  rotation = new THREE.Euler(),
): THREE.Group {
  const mesh = buildWeaponMesh(id);
  mesh.position.copy(offset);
  mesh.rotation.copy(rotation);
  anchor.add(mesh);
  return mesh;
}

export function holdPose(id: string): { pos: [number, number, number]; rot: [number, number, number]; scale: number } {
  const w = getWeapon(id);
  const cat = w?.category;
  if (cat === "fusil_chasse" || cat === "carabine" || cat === "tactique_auto") {
    return { pos: [0.18, 0.95, 0.26], rot: [0.18, 0.06, 0.14], scale: 0.92 };
  }
  if (cat === "poing" || id === "taser-x26" || id === "spray-poivre") {
    return { pos: [0.28, 0.9, 0.18], rot: [0.18, 0.2, 0.28], scale: 1.05 };
  }
  if (id === "hache-pompier" || id === "matraque-sq" || id === "batte-baseball") {
    return { pos: [0.22, 0.62, 0.16], rot: [0.12, 0.1, 0.35], scale: 0.62 };
  }
  return { pos: [0.26, 0.78, 0.14], rot: [0.1, 0.35, 0.15], scale: 0.85 };
}

// ═══════════════════════════════════════════════════════════
// CONTRÔLEUR ACTIF IN-GAME (WEAPON SYSTEM CONTROLLER)
// ═══════════════════════════════════════════════════════════

class WeaponSystemController {
  private activeId: WeaponId | null = null;
  private activeInstance: WeaponInstance | null = null;
  private weaponMesh: THREE.Group | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private scene: THREE.Scene | null = null;
  private muzzleFlash: THREE.PointLight | null = null;
  private muzzleFlashTime = 0;
  private lastFire = 0;
  private isAiming = false;
  private adsProgress = 0;
  private baseFOV = 75;
  private targetFOV = 75;

  init(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
    this.baseFOV = camera.fov;
    this.targetFOV = camera.fov;

    this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 8);
    this.muzzleFlash.visible = false;
  }

  equip(weaponId: WeaponId, instance: WeaponInstance): boolean {
    if (this.weaponMesh && this.camera) {
      this.camera.remove(this.weaponMesh);
      this.weaponMesh = null;
    }

    const template = getWeapon(weaponId);
    if (!template || !this.camera) return false;

    this.activeId = weaponId;
    this.activeInstance = instance;

    this.weaponMesh = buildWeaponMesh(weaponId);
    const pose = holdPose(weaponId);
    this.weaponMesh.position.set(...pose.pos);
    this.weaponMesh.rotation.set(...pose.rot);
    this.weaponMesh.scale.setScalar(pose.scale);

    if (this.muzzleFlash) {
      this.weaponMesh.add(this.muzzleFlash);
      this.muzzleFlash.position.set(0, 0, -0.6);
    }

    this.camera.add(this.weaponMesh);

    useGameStore.getState().setHud({
      notice: `🔫 ${template.name} équipé · ${instance.loadedRounds}/${template.magazineCapacity}`,
    });

    netEmit("weapon:equipped", { weaponId, serial: instance.serialNumber });
    return true;
  }

  unequip(): boolean {
    if (!this.activeId || !this.weaponMesh || !this.camera) return false;

    this.camera.remove(this.weaponMesh);
    this.weaponMesh = null;
    const prev = this.activeId;
    this.activeId = null;
    this.activeInstance = null;

    useGameStore.getState().setHud({ notice: "Arme rangée (Mains libres)" });
    netEmit("weapon:unequipped", { weaponId: prev });
    return true;
  }

  fire(playerId: string, playerPos: { x: number; y: number; z: number }): boolean {
    if (!this.activeId || !this.activeInstance || !this.camera) return false;

    const template = getWeapon(this.activeId);
    if (!template) return false;

    const now = performance.now();
    const interval = 60000 / template.fireRateRPM;
    if (now - this.lastFireTime < interval) return false;
    this.lastFireTime = now;

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    const result = fireWeapon(
      this.activeInstance.serialNumber,
      playerId,
      playerPos,
      { x: dir.x, y: dir.y, z: dir.z }
    );

    useGameStore.getState().setHud({ notice: result.message });

    if (result.fired) {
      this.triggerMuzzleFlash();
      if (this.weaponMesh) {
        this.weaponMesh.position.z += 0.03; // Effet recul visuel
      }
    }

    return result.fired;
  }

  private triggerMuzzleFlash() {
    if (!this.muzzleFlash) return;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.intensity = 3.5;
    this.muzzleFlashTime = 0.04;
  }

  startAiming() {
    if (!this.activeId) return;
    const template = getWeapon(this.activeId);
    if (!template) return;
    this.isAiming = true;
    this.targetFOV = this.baseFOV / 1.5; // Zoom ADS
  }

  stopAiming() {
    this.isAiming = false;
    this.targetFOV = this.baseFOV;
  }

  update(dt: number) {
    if (!this.camera) return;

    // Retour du mesh à la position initiale
    if (this.weaponMesh && this.activeId) {
      const pose = holdPose(this.activeId);
      this.weaponMesh.position.z += (pose.pos[2] - this.weaponMesh.position.z) * dt * 12.0;
    }

    // Gestion muzzle flash
    if (this.muzzleFlash && this.muzzleFlash.visible) {
      this.muzzleFlashTime -= dt;
      if (this.muzzleFlashTime <= 0) {
        this.muzzleFlash.visible = false;
      } else {
        this.muzzleFlash.intensity = this.muzzleFlashTime * 30;
      }
    }

    // Interpolation FOV ADS
    this.camera.fov += (this.targetFOV - this.camera.fov) * dt * 10;
    this.camera.updateProjectionMatrix();
  }

  getActiveState() {
    return {
      weaponId: this.activeId,
      instance: this.activeInstance,
      equipped: !!this.activeId,
    };
  }
}

export const weaponSystemController = new WeaponSystemController();

// ═══════════════════════════════════════════════════════════
// COMPATIBILITÉ RP & EXPORTS
// ═══════════════════════════════════════════════════════════

export function weaponAmmo(id: string): AmmoCaliber | undefined {
  return getWeapon(id)?.ammo;
}

export function weaponHarvestRange(id: string): number {
  const w = getWeapon(id);
  return w?.effectiveRangeMeters || 1.5;
}

export function isZoneWeapon(id: string): boolean {
  const w = getWeapon(id);
  return w?.category === "non_letal" && w.id === "flashbang";
}

export function getEffectiveDPS(id: string): number {
  const w = getWeapon(id);
  if (!w) return 0;
  return Math.round((w.baseDamage * (w.fireRateRPM || 60)) / 60);
}

export function getWeaponsByLegalClass(legalClass: LegalClass): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(w => w.legal === legalClass);
}

export function getWeaponsByCategory(category: WeaponCategory): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(w => w.category === category);
}

export function getLegalShopInventory(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(w => !w.policeOnly && w.legal !== "prohibee" && w.legal !== "artisanale_illegale");
}

export function getDealerInventory(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(w => w.legal === "prohibee" || w.legal === "artisanale_illegale" || w.source === "dealer_noir");
}

export function getCivilianWeapons(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(w => !w.policeOnly);
}

export function getPoliceWeapons(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter(w => w.policeOnly);
}

export function getCatalogStats() {
  return {
    totalWeapons: WEAPON_CATALOG.length,
    policeOnlyCount: WEAPON_CATALOG.filter(w => w.policeOnly).length,
    civilianCount: WEAPON_CATALOG.filter(w => !w.policeOnly).length,
    prohibitedCount: WEAPON_CATALOG.filter(w => w.legal === "prohibee").length,
  };
}

// ═══════════════════════════════════════════════════════════
// REMOTES RPC MULTIJOUEUR & HELPERS DE LICENCES
// ═══════════════════════════════════════════════════════════

registerRemote("weapons:fire", fireWeapon);
registerRemote("weapons:clear_jam", clearWeaponJam);
registerRemote("weapons:clean", cleanAndServiceWeapon);
registerRemote("weapons:register_siaf", registerWeaponToSIAF);
registerRemote("weapons:deface_serial", defaceWeaponSerialNumber);
registerRemote("weapons:match_ballistics", matchCasingToWeapon);

export function parseLicenses(raw: unknown): LicenseId[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<LicenseId>(Object.keys(LICENSES) as LicenseId[]);
  return raw.map((value) => String(value)).filter((value): value is LicenseId => allowed.has(value as LicenseId));
}

export function grantLicense(licenses: LicenseId[], license: LicenseId): LicenseId[] {
  if (licenses.includes(license)) return licenses;
  return [...licenses, license];
}

export function licenseFromItem(itemId: string): LicenseId | null {
  const normalized = String(itemId).trim().toLowerCase();
  const ids = Object.keys(LICENSES) as LicenseId[];
  for (const id of ids) {
    const key = String(id).toLowerCase();
    if (normalized === key || normalized.includes(key)) {
      return id;
    }
  }
  return null;
}