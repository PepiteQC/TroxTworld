/**
 * ═══════════════════════════════════════════════════════════════════
 *  MATÉRIAUX COMMERCE PBR — PALLETTE QUÉBÉCOISE ÉTENDUE
 * ═══════════════════════════════════════════════════════════════════
 * Matériaux optimisés pour :
 * - Dépanneurs (bois, métal, verre)
 * - SQDC (vert institutionnel, acier brossé)
 * - Quincaillerie (métal rouillé, béton)
 * - Chasse & Pêche (bois naturel, cuir)
 * - Produits (bouteilles, emballages, étiquettes)
 * - Effets spéciaux (néons, verre brisé)
 *
 * @author xblade benz (TroxTWorld)
 * @requires three, materials.ts, textures.ts
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { matLib, QC_PALETTE, type QcMat } from "./materials";
import { tex } from "./textures";
import { ShopKind, ShopItemId, itemById } from "./commerce";

// ==========================================
// 🎨 1. PALETTES DE COULEURS ÉTENDUES
// ==========================================

/** Palette de couleurs pour les commerces */
export const COMMERCE_PALETTE = {
  // Métaux
  acier: QC_PALETTE.acier,
  acierBrosse: 0x5a6a78,
  acierInox: 0xc8d0d8,
  aluminium: 0x9ca8b4,
  cuivre: 0xc88a64,
  laiton: 0xc8a864,
  or: 0xc8a848,
  argent: 0xa8b8c8,

  // Bois
  boisNaturel: QC_PALETTE.boisNaturel,
  boisClair: QC_PALETTE.boisClair,
  boisFonce: 0x3a2818,
  boisChene: 0x6a4828,
  boisErable: 0x8a6438,
  boisPin: 0x5a4828,
  contreplaque: 0x8a7858,

  // Plastiques & Caoutchouc
  noirMat: QC_PALETTE.noirMat,
  plastiqueNoir: 0x181818,
  plastiqueGris: 0x282828,
  caoutchouc: 0x181818,

  // SQDC
  sqdcVert: QC_PALETTE.sqdcVert,
  sqdcVertClair: 0x2a7a48,
  sqdcVertFonce: 0x0a3a28,
  sqdcBeige: 0xd8c8a8,
  sqdcGris: 0x4a5a68,

  // Dépanneur
  depRouge: 0xc03028,
  depBlanc: 0xf8f8f8,
  depJaune: 0xc8a858,
  depBleu: 0x2a4a78,

  // Quincaillerie
  quincRouille: 0x8a5838,
  quincBeton: QC_PALETTE.betonNeutre,
  quincMetal: 0x5a6a78,

  // Chasse & Pêche
  chasseVert: 0x2a4a28,
  chasseBrun: 0x4a3828,
  chasseCuir: 0x6a4828,

  // Verre
  verre: QC_PALETTE.verre,
  verreTeinte: 0x88c8e8,
  verreFume: 0x4a5a68,

  // Béton
  beton: QC_PALETTE.betonNeutre,
  betonClair: 0xa8a098,
  betonFonce: 0x4a4840,

  // Autre
  blanc: 0xf8f8f8,
  gris: 0x8a8a8a,
  grisClair: 0xc8c8c8,
  grisFonce: 0x4a4a4a,
} as const;

/** IDs des matériaux commerce */
export type CommerceMatId =
  | "acier"
  | "acierBrosse"
  | "acierInox"
  | "aluminium"
  | "cuivre"
  | "laiton"
  | "or"
  | "argent"
  | "boisNaturel"
  | "boisClair"
  | "boisFonce"
  | "boisChene"
  | "boisErable"
  | "boisPin"
  | "contreplaque"
  | "noirMat"
  | "plastiqueNoir"
  | "plastiqueGris"
  | "caoutchouc"
  | "sqdcVert"
  | "sqdcVertClair"
  | "sqdcVertFonce"
  | "sqdcBeige"
  | "sqdcGris"
  | "depRouge"
  | "depBlanc"
  | "depJaune"
  | "depBleu"
  | "quincRouille"
  | "quincBeton"
  | "quincMetal"
  | "chasseVert"
  | "chasseBrun"
  | "chasseCuir"
  | "verre"
  | "verreTeinte"
  | "verreFume"
  | "beton"
  | "betonClair"
  | "betonFonce"
  | "blanc"
  | "gris"
  | "grisClair"
  | "grisFonce"
  | "etiquette"
  | "etiquetteSQDC"
  | "etiquetteDepanneur"
  | "neonRouge"
  | "neonVert"
  | "neonBleu"
  | "neonBlanc"
  | "verreBrise"
  | "rouilleDynamique"
  | "peintureEcaillee"
  | "productBottle"
  | "productCan"
  | "productBox"
  | "productPlastic"
  | "productGlass"
  | "productMetal";

/** Palette de couleurs pour les produits (par catégorie) */
export const PRODUCT_PALETTE: Record<string, number> = {
  // Nourriture
  nourriture: 0xc8a060,
  boisson: 0x88c8e8,
  viande: 0x8a4828,
  dessert: 0xc8a864,
  produit_laitier: 0xf8f8f8,

  // Vêtements
  vetement: 0x6a4828,
  accessoire: 0x4a3828,

  // Outillage
  outillage: 0x5a6a78,
  arme: 0x3a3830,

  // Divers
  divers: 0x8a8a8a,
  drogue: 0x2a5a28,
  legal: 0xf8f8f8,
  illégal: 0x5a1810,

  // Matériaux
  bois: 0x6a4828,
  metal: 0x5a6a78,
  plastique: 0x282828,
  verre: 0x88c8e8,
};

// ==========================================
// 🗜 2. CACHE ET UTILITAIRES
// ==========================================

// Cache pour les matériaux (évite la recréation)
const matCache = new Map<string, QcMat>();

/** Conserve un matériau dans le cache */
function cacheMat(mat: QcMat, name: string): QcMat {
  mat.name = name;
  mat.userData.keepPbr = true;
  matCache.set(name, mat);
  return mat;
}

/** Récupère un matériau depuis le cache ou le crée */
function getCachedMat(name: string, builder: () => QcMat): QcMat {
  const hit = matCache.get(name);
  if (hit) return hit;
  return cacheMat(builder(), name);
}

// ==========================================
// 🏗 3. BUILDERS DE MATÉRIAUX (Par catégorie)
// ==========================================

// ========== MÉTAUX ==========
function buildAcier(): QcMat {
  return getCachedMat("acier", () =>
    tex.pbr("metalPlie", null, 2.4, 1.6, 0.34, 0.86, COMMERCE_PALETTE.acier, 0)
  );
}

function buildAcierBrosse(): QcMat {
  return getCachedMat("acierBrosse", () =>
    tex.pbr("metalBrosse", "metalBrosseNrm", 2.2, 1.8, 0.4, 0.7, COMMERCE_PALETTE.acierBrosse, 0)
  );
}

function buildAcierInox(): QcMat {
  return getCachedMat("acierInox", () =>
    tex.pbr("metalLisse", null, 2.6, 2.0, 0.1, 0.9, COMMERCE_PALETTE.acierInox, 0)
  );
}

function buildAluminium(): QcMat {
  return getCachedMat("aluminium", () =>
    tex.pbr("metalPlie", null, 2.0, 1.4, 0.5, 0.6, COMMERCE_PALETTE.aluminium, 0)
  );
}

function buildCuivre(): QcMat {
  return getCachedMat("cuivre", () =>
    tex.pbr("metalPlie", null, 2.2, 1.6, 0.2, 0.95, COMMERCE_PALETTE.cuivre, 0)
  );
}

function buildLaiton(): QcMat {
  return getCachedMat("laiton", () =>
    tex.pbr("metalPlie", null, 2.0, 1.4, 0.3, 0.85, COMMERCE_PALETTE.laiton, 0)
  );
}

function buildOr(): QcMat {
  return getCachedMat("or", () =>
    tex.pbr("metalLisse", null, 2.8, 2.4, 0.1, 1.0, COMMERCE_PALETTE.or, 0)
  );
}

function buildArgent(): QcMat {
  return getCachedMat("argent", () =>
    tex.pbr("metalLisse", null, 2.6, 2.2, 0.1, 0.98, COMMERCE_PALETTE.argent, 0)
  );
}

// ========== BOIS ==========
function buildBoisNaturel(): QcMat {
  return getCachedMat("boisNaturel", () => {
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex.map("chene", 2.2, 1.4),
      color: COMMERCE_PALETTE.boisNaturel,
      roughness: 0.58,
      metalness: 0,
      sheen: 0.42,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0xc8a060),
    });
    mat.userData.skipCsm = false;
    return mat;
  });
}

function buildBoisClair(): QcMat {
  return getCachedMat("boisClair", () => {
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex.map("parquet", 2.6, 1.8),
      color: COMMERCE_PALETTE.boisClair,
      roughness: 0.48,
      metalness: 0,
      sheen: 0.28,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color(0xe8d4a8),
    });
    return mat;
  });
}

function buildBoisFonce(): QcMat {
  return getCachedMat("boisFonce", () =>
    tex.pbr("boisFonce", "boisFonceNrm", 2.0, 1.6, 0.6, 0.05, COMMERCE_PALETTE.boisFonce, 0)
  );
}

function buildBoisChene(): QcMat {
  return getCachedMat("boisChene", () =>
    tex.pbr("chene", "cheneNrm", 2.2, 1.8, 0.55, 0.05, COMMERCE_PALETTE.boisChene, 0)
  );
}

function buildBoisErable(): QcMat {
  return getCachedMat("boisErable", () =>
    tex.pbr("erable", "erableNrm", 2.0, 1.6, 0.5, 0.05, COMMERCE_PALETTE.boisErable, 0)
  );
}

function buildBoisPin(): QcMat {
  return getCachedMat("boisPin", () =>
    tex.pbr("pin", "pinNrm", 2.4, 2.0, 0.6, 0.05, COMMERCE_PALETTE.boisPin, 0)
  );
}

function buildContreplaque(): QcMat {
  return getCachedMat("contreplaque", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.contreplaque,
      roughness: 0.8,
      metalness: 0.05,
    });
    return mat;
  });
}

// ========== PLASTIQUES & CAOUTCHOUC ==========
function buildNoirMat(): QcMat {
  return getCachedMat("noirMat", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.noirMat,
      roughness: 0.92,
      metalness: 0.04,
    });
    return mat;
  });
}

function buildPlastiqueNoir(): QcMat {
  return getCachedMat("plastiqueNoir", () => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: COMMERCE_PALETTE.plastiqueNoir,
      roughness: 0.8,
      metalness: 0.05,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3,
    });
    return mat;
  });
}

function buildPlastiqueGris(): QcMat {
  return getCachedMat("plastiqueGris", () => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: COMMERCE_PALETTE.plastiqueGris,
      roughness: 0.7,
      metalness: 0.05,
      clearcoat: 0.1,
      clearcoatRoughness: 0.4,
    });
    return mat;
  });
}

function buildCaoutchouc(): QcMat {
  return getCachedMat("caoutchouc", () => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: COMMERCE_PALETTE.caoutchouc,
      roughness: 0.9,
      metalness: 0.02,
    });
    return mat;
  });
}

// ========== SQDC ==========
function buildSqdcVert(): QcMat {
  return getCachedMat("sqdcVert", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.sqdcVert,
      roughness: 0.52,
      metalness: 0.08,
    });
    return mat;
  });
}

function buildSqdcVertClair(): QcMat {
  return getCachedMat("sqdcVertClair", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.sqdcVertClair,
      roughness: 0.45,
      metalness: 0.1,
    });
    return mat;
  });
}

function buildSqdcVertFonce(): QcMat {
  return getCachedMat("sqdcVertFonce", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.sqdcVertFonce,
      roughness: 0.6,
      metalness: 0.05,
    });
    return mat;
  });
}

function buildSqdcBeige(): QcMat {
  return getCachedMat("sqdcBeige", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.sqdcBeige,
      roughness: 0.7,
      metalness: 0.02,
    });
    return mat;
  });
}

function buildSqdcGris(): QcMat {
  return getCachedMat("sqdcGris", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.sqdcGris,
      roughness: 0.5,
      metalness: 0.08,
    });
    return mat;
  });
}

// ========== DÉPANNEUR ==========
function buildDepRouge(): QcMat {
  return getCachedMat("depRouge", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.depRouge,
      roughness: 0.4,
      metalness: 0.1,
    });
    return mat;
  });
}

function buildDepBlanc(): QcMat {
  return getCachedMat("depBlanc", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.depBlanc,
      roughness: 0.8,
      metalness: 0.02,
    });
    return mat;
  });
}

function buildDepJaune(): QcMat {
  return getCachedMat("depJaune", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.depJaune,
      roughness: 0.5,
      metalness: 0.05,
    });
    return mat;
  });
}

function buildDepBleu(): QcMat {
  return getCachedMat("depBleu", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.depBleu,
      roughness: 0.45,
      metalness: 0.08,
    });
    return mat;
  });
}

// ========== QUINCAILLERIE ==========
function buildQuincRouille(): QcMat {
  return getCachedMat("quincRouille", () =>
    tex.pbr("metalPlie", "betonTrousNrm", 2.2, 1.8, 0.78, 0.28, COMMERCE_PALETTE.quincRouille, 0.55)
  );
}

function buildQuincBeton(): QcMat {
  return getCachedMat("quincBeton", () =>
    tex.pbr("betonDalles", "betonDallesNrm", 2.4, 2.4, 0.9, 0.04, COMMERCE_PALETTE.quincBeton, 0.7)
  );
}

function buildQuincMetal(): QcMat {
  return getCachedMat("quincMetal", () =>
    tex.pbr("metalPlie", null, 2.4, 1.6, 0.4, 0.7, COMMERCE_PALETTE.quincMetal, 0)
  );
}

// ========== CHASSE & PÊCHE ==========
function buildChasseVert(): QcMat {
  return getCachedMat("chasseVert", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.chasseVert,
      roughness: 0.6,
      metalness: 0.05,
    });
    return mat;
  });
}

function buildChasseBrun(): QcMat {
  return getCachedMat("chasseBrun", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.chasseBrun,
      roughness: 0.7,
      metalness: 0.02,
    });
    return mat;
  });
}

function buildChasseCuir(): QcMat {
  return getCachedMat("chasseCuir", () =>
    tex.pbr("cuir", "cuirNrm", 1.8, 1.4, 0.5, 0.05, COMMERCE_PALETTE.chasseCuir, 0)
  );
}

// ========== VERRE ==========
function buildVerre(): QcMat {
  return getCachedMat("verre", () =>
    matLib.physicalGlass(COMMERCE_PALETTE.verre, 1, 0.04)
  );
}

function buildVerreTeinte(): QcMat {
  return getCachedMat("verreTeinte", () =>
    matLib.physicalGlass(COMMERCE_PALETTE.verreTeinte, 0.8, 0.1)
  );
}

function buildVerreFume(): QcMat {
  return getCachedMat("verreFume", () =>
    matLib.physicalGlass(COMMERCE_PALETTE.verreFume, 0.6, 0.2)
  );
}

function buildVerreBrise(): QcMat {
  return getCachedMat("verreBrise", () => {
    const mat = matLib.physicalGlass(COMMERCE_PALETTE.verre, 0.5, 0.5);
    mat.transmission = 0.3; // Moins transparent
    mat.roughness = 0.8; // Plus rugueux
    mat.metalness = 0.1; // Un peu métallique
    return mat;
  });
}

// ========== BÉTON ==========
function buildBeton(): QcMat {
  return getCachedMat("beton", () =>
    tex.pbr("betonDalles", "betonDallesNrm", 2.4, 2.4, 0.9, 0.04, COMMERCE_PALETTE.beton, 0.7)
  );
}

function buildBetonClair(): QcMat {
  return getCachedMat("betonClair", () =>
    tex.pbr("betonLisse", "betonLisseNrm", 2.6, 2.6, 0.85, 0.02, COMMERCE_PALETTE.betonClair, 0.8)
  );
}

function buildBetonFonce(): QcMat {
  return getCachedMat("betonFonce", () =>
    tex.pbr("betonDalles", "betonDallesNrm", 2.2, 2.2, 0.95, 0.01, COMMERCE_PALETTE.betonFonce, 0.6)
  );
}

// ========== AUTRES ==========
function buildBlanc(): QcMat {
  return getCachedMat("blanc", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.blanc,
      roughness: 0.95,
      metalness: 0.01,
    });
    return mat;
  });
}

function buildGris(): QcMat {
  return getCachedMat("gris", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.gris,
      roughness: 0.8,
      metalness: 0.05,
    });
    return mat;
  });
}

function buildGrisClair(): QcMat {
  return getCachedMat("grisClair", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.grisClair,
      roughness: 0.7,
      metalness: 0.03,
    });
    return mat;
  });
}

function buildGrisFonce(): QcMat {
  return getCachedMat("grisFonce", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.grisFonce,
      roughness: 0.6,
      metalness: 0.05,
    });
    return mat;
  });
}

// ========== ÉTIQUETTES ==========
function buildEtiquette(): QcMat {
  return getCachedMat("etiquette", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf8f8f8,
      roughness: 0.7,
      metalness: 0.02,
    });
    return mat;
  });
}

function buildEtiquetteSQDC(): QcMat {
  return getCachedMat("etiquetteSQDC", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.sqdcVert,
      roughness: 0.4,
      metalness: 0.1,
    });
    return mat;
  });
}

function buildEtiquetteDepanneur(): QcMat {
  return getCachedMat("etiquetteDepanneur", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.depRouge,
      roughness: 0.45,
      metalness: 0.08,
    });
    return mat;
  });
}

// ========== NÉONS ==========
function buildNeonRouge(): QcMat {
  return getCachedMat("neonRouge", () => {
    const mat = matLib.getEmissive(0xff4444, 0xff4444, 1.5);
    mat.transparent = true;
    mat.opacity = 0.8;
    return mat;
  });
}

function buildNeonVert(): QcMat {
  return getCachedMat("neonVert", () => {
    const mat = matLib.getEmissive(0x44ff44, 0x44ff44, 1.5);
    mat.transparent = true;
    mat.opacity = 0.8;
    return mat;
  });
}

function buildNeonBleu(): QcMat {
  return getCachedMat("neonBleu", () => {
    const mat = matLib.getEmissive(0x4444ff, 0x4444ff, 1.5);
    mat.transparent = true;
    mat.opacity = 0.8;
    return mat;
  });
}

function buildNeonBlanc(): QcMat {
  return getCachedMat("neonBlanc", () => {
    const mat = matLib.getEmissive(0xffffff, 0xffffff, 1.5);
    mat.transparent = true;
    mat.opacity = 0.8;
    return mat;
  });
}

// ========== EFFETS SPÉCIAUX ==========
function buildRouilleDynamique(): QcMat {
  return getCachedMat("rouilleDynamique", () => {
    // Matériau avec variation de couleur pour simuler la rouille dynamique
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.quincRouille,
      roughness: 0.85,
      metalness: 0.3,
    });
    mat.userData.isRusty = true;
    return mat;
  });
}

function buildPeintureEcaillee(): QcMat {
  return getCachedMat("peintureEcaillee", () => {
    const mat = new THREE.MeshStandardMaterial({
      color: COMMERCE_PALETTE.gris,
      roughness: 0.9,
      metalness: 0.05,
    });
    mat.userData.isChipped = true;
    return mat;
  });
}

// ========== MATÉRIAUX POUR LES PRODUITS ==========
/**
 * Crée un matériau pour un produit spécifique (bouteille, canette, boîte, etc.)
 * @param itemId - ID de l'item
 * @returns Matériau adapté au produit
 */
function buildProductMaterial(itemId: ShopItemId): QcMat {
  const item = itemById(itemId);
  if (!item) {
    return buildPlastiqueGris(); // Matériau par défaut
  }

  // Déterminer le matériau en fonction de la catégorie
  switch (item.category) {
    case "boisson":
      if (item.id.includes("bouteille") || item.id.includes("bidon")) {
        return buildProductGlass();
      } else if (item.id.includes("canette") || item.id.includes("biere")) {
        return buildProductMetal();
      } else {
        return buildProductPlastic();
      }
    case "nourriture":
      if (item.id.includes("poutine") || item.id.includes("tourtiere")) {
        return buildProductBox();
      } else {
        return buildProductPlastic();
      }
    case "vetement":
      return buildChasseCuir(); // ou autre matériau textile
    case "arme":
    case "outillage":
      return buildQuincMetal();
    case "drogue":
      return buildProductPlastic(); // ou un matériau spécifique pour les drogues
    default:
      return buildProductPlastic();
  }
}

function buildProductBottle(): QcMat {
  return getCachedMat("productBottle", () =>
    matLib.physicalGlass(0x88c8e8, 0.9, 0.05)
  );
}

function buildProductCan(): QcMat {
  return getCachedMat("productCan", () =>
    tex.pbr("metalLisse", null, 2.0, 1.6, 0.3, 0.8, 0xc8d0d8, 0)
  );
}

function buildProductBox(): QcMat {
  return getCachedMat("productBox", () =>
    tex.pbr("carton", "cartonNrm", 1.8, 1.4, 0.8, 0.02, 0x8a7858, 0)
  );
}

function buildProductPlastic(): QcMat {
  return getCachedMat("productPlastic", () => buildPlastiqueGris());
}

function buildProductGlass(): QcMat {
  return getCachedMat("productGlass", () => buildVerre());
}

function buildProductMetal(): QcMat {
  return getCachedMat("productMetal", () => buildAluminium());
}

// ==========================================
// 🏗 4. REGISTRE DES BUILDERS
// ==========================================

const BUILDERS: Record<CommerceMatId, () => QcMat> = {
  // Métaux
  acier: buildAcier,
  acierBrosse: buildAcierBrosse,
  acierInox: buildAcierInox,
  aluminium: buildAluminium,
  cuivre: buildCuivre,
  laiton: buildLaiton,
  or: buildOr,
  argent: buildArgent,

  // Bois
  boisNaturel: buildBoisNaturel,
  boisClair: buildBoisClair,
  boisFonce: buildBoisFonce,
  boisChene: buildBoisChene,
  boisErable: buildBoisErable,
  boisPin: buildBoisPin,
  contreplaque: buildContreplaque,

  // Plastiques & Caoutchouc
  noirMat: buildNoirMat,
  plastiqueNoir: buildPlastiqueNoir,
  plastiqueGris: buildPlastiqueGris,
  caoutchouc: buildCaoutchouc,

  // SQDC
  sqdcVert: buildSqdcVert,
  sqdcVertClair: buildSqdcVertClair,
  sqdcVertFonce: buildSqdcVertFonce,
  sqdcBeige: buildSqdcBeige,
  sqdcGris: buildSqdcGris,

  // Dépanneur
  depRouge: buildDepRouge,
  depBlanc: buildDepBlanc,
  depJaune: buildDepJaune,
  depBleu: buildDepBleu,

  // Quincaillerie
  quincRouille: buildQuincRouille,
  quincBeton: buildQuincBeton,
  quincMetal: buildQuincMetal,

  // Chasse & Pêche
  chasseVert: buildChasseVert,
  chasseBrun: buildChasseBrun,
  chasseCuir: buildChasseCuir,

  // Verre
  verre: buildVerre,
  verreTeinte: buildVerreTeinte,
  verreFume: buildVerreFume,
  verreBrise: buildVerreBrise,

  // Béton
  beton: buildBeton,
  betonClair: buildBetonClair,
  betonFonce: buildBetonFonce,

  // Autres
  blanc: buildBlanc,
  gris: buildGris,
  grisClair: buildGrisClair,
  grisFonce: buildGrisFonce,

  // Étiquettes
  etiquette: buildEtiquette,
  etiquetteSQDC: buildEtiquetteSQDC,
  etiquetteDepanneur: buildEtiquetteDepanneur,

  // Néons
  neonRouge: buildNeonRouge,
  neonVert: buildNeonVert,
  neonBleu: buildNeonBleu,
  neonBlanc: buildNeonBlanc,

  // Effets spéciaux
  rouilleDynamique: buildRouilleDynamique,
  peintureEcaillee: buildPeintureEcaillee,

  // Produits
  productBottle: buildProductBottle,
  productCan: buildProductCan,
  productBox: buildProductBox,
  productPlastic: buildProductPlastic,
  productGlass: buildProductGlass,
  productMetal: buildProductMetal,
};

/**
 * Récupère un matériau commerce par son ID
 * @param id - ID du matériau
 * @returns Matériau
 */
export function commerceMat(id: CommerceMatId): QcMat {
  const builder = BUILDERS[id];
  if (!builder) {
    console.warn(`[CommerceMats] Matériau ${id} introuvable. Utilisation de 'plastiqueGris' par défaut.`);
    return buildPlastiqueGris();
  }
  return builder();
}

/**
 * Récupère un matériau pour un produit spécifique
 * @param itemId - ID de l'item
 * @returns Matériau adapté
 */
export function productMat(itemId: ShopItemId): QcMat {
  return buildProductMaterial(itemId);
}

// ==========================================
// 🌍 5. ENVIRONNEMENT POUR LES MATÉRIAUX TRANSPARENTS
// ==========================================

let envTex: THREE.Texture | null = null;
let pmrem: THREE.PMREMGenerator | null = null;

/**
 * Installe l'environnement PMREM pour les matériaux transparents (verre)
 * @param renderer - Renderer Three.js
 * @param scene - Scène Three.js
 */
export function installCommerceEnv(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
  if (!envTex) {
    pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    envTex = pmrem.fromScene(room, 0.04).texture;

    // Nettoyer la scène temporaire
    room.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mats = mesh.material;
      for (const m of Array.isArray(mats) ? mats : [mats]) {
        if (m instanceof THREE.Material) {
          m.dispose();
        }
      }
    });
  }

  scene.environment = envTex;
  scene.environmentIntensity = 0.68;
}

/**
 * Ajuste l'intensité de l'environnement selon le moment de la journée
 * @param scene - Scène Three.js
 * @param night - true si c'est la nuit
 */
export function setCommerceEnvIntensity(scene: THREE.Scene, intensity: number = 0.68): void {
  scene.environmentIntensity = intensity;
}

/**
 * Passe en mode nuit
 * @param scene - Scène Three.js
 */
export function setCommerceEnvNight(scene: THREE.Scene): void {
  setCommerceEnvIntensity(scene, 0.2);
}

/**
 * Passe en mode jour
 * @param scene - Scène Three.js
 */
export function setCommerceEnvDay(scene: THREE.Scene): void {
  setCommerceEnvIntensity(scene, 0.68);
}

/**
 * Nettoie les ressources de l'environnement
 */
export function disposeCommerceEnv(): void {
  envTex?.dispose();
  envTex = null;
  pmrem?.dispose();
  pmrem = null;
  matCache.clear();
}

// ==========================================
// 🎨 6. MATÉRIAUX SPÉCIFIQUES POUR LES MAGASINS
// ==========================================

/**
 * Crée un matériau pour un comptoir de dépanneur
 */
export function counterMat(): QcMat {
  return getCachedMat("counterMat", () =>
    tex.pbr("boisFonce", "boisFonceNrm", 2.0, 1.6, 0.5, 0.05, COMMERCE_PALETTE.boisFonce, 0)
  );
}

/**
 * Crée un matériau pour une étagère de dépanneur
 */
export function shelfMat(): QcMat {
  return getCachedMat("shelfMat", () =>
    tex.pbr("metalPlie", null, 2.2, 1.8, 0.5, 0.6, COMMERCE_PALETTE.quincMetal, 0)
  );
}

/**
 * Crée un matériau pour un frigo de dépanneur
 */
export function fridgeMat(): QcMat {
  return getCachedMat("fridgeMat", () => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.1,
      envMapIntensity: 0.5,
    });
    return mat;
  });
}

/**
 * Crée un matériau pour une porte de frigo
 */
export function fridgeDoorMat(): QcMat {
  return getCachedMat("fridgeDoorMat", () =>
    matLib.glass(COMMERCE_PALETTE.verreTeinte, 0.2, 0.1)
  );
}

/**
 * Crée un matériau pour un congélateur
 */
export function freezerMat(): QcMat {
  return getCachedMat("freezerMat", () =>
    matLib.glass(0xd8e8f8, 0.1, 0.05)
  );
}

/**
 * Crée un matériau pour une caisse enregistreuse
 */
export function cashierMat(): QcMat {
  return getCachedMat("cashierMat", () =>
    tex.pbr("metalBrosse", "metalBrosseNrm", 2.0, 1.6, 0.4, 0.7, COMMERCE_PALETTE.acierBrosse, 0)
  );
}

/**
 * Crée un matériau pour un écran de caisse
 */
export function screenMat(): QcMat {
  return getCachedMat("screenMat", () => {
    const mat = matLib.getEmissive(0x000000, 0x00ff00, 0.8);
    mat.transparent = true;
    mat.opacity = 0.9;
    return mat;
  });
}

/**
 * Crée un matériau pour un sol de dépanneur (carrelage)
 */
export function floorMat(): QcMat {
  return getCachedMat("floorMat", () =>
    tex.pbr("carrelage", "carrelageNrm", 2.0, 2.0, 0.8, 0.05, COMMERCE_PALETTE.grisClair, 0.5)
  );
}

/**
 * Crée un matériau pour un mur de dépanneur
 */
export function wallMat(): QcMat {
  return getCachedMat("wallMat", () =>
    tex.pbr("boisClair", "boisClairNrm", 1.8, 1.4, 0.6, 0.05, COMMERCE_PALETTE.boisClair, 0)
  );
}

// ==========================================
// 🏪 7. CONSTRUCTEURS DE COMPOSANTS DE MAGASINS
// ==========================================

/**
 * Crée un comptoir de dépanneur complet
 * @param width - Largeur
 * @param height - Hauteur
 * @param depth - Profondeur
 * @returns Groupe Three.js
 */
export function buildCounter(width: number = 1.2, height: number = 1.0, depth: number = 0.6): THREE.Group {
  const group = new THREE.Group();
  group.name = "comptoir_depanneur";

  // Structure en bois
  const woodMat = counterMat();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, height * 0.8, depth),
    woodMat
  );
  base.position.y = height * 0.4;
  group.add(base);

  // Plan de travail
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.1, 0.05, depth + 0.1),
    woodMat
  );
  top.position.y = height * 0.8 + 0.025;
  group.add(top);

  // Caisse enregistreuse
  const cashier = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.2, 0.3),
    cashierMat()
  );
  cashier.position.set(0, height * 0.85, -depth * 0.3);
  group.add(cashier);

  // Écran de la caisse
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.12, 0.02),
    screenMat()
  );
  screen.position.set(0, height * 0.9, -depth * 0.25);
  group.add(screen);

  return group;
}

/**
 * Crée une étagère de dépanneur
 * @param width - Largeur
 * @param height - Hauteur
 * @param depth - Profondeur
 * @returns Groupe Three.js
 */
export function buildShelf(width: number = 1.0, height: number = 1.8, depth: number = 0.4): THREE.Group {
  const group = new THREE.Group();
  group.name = "etagere_depanneur";

  const mat = shelfMat();

  // Structure principale
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    mat
  );
  group.add(base);

  // Étagères (5 niveaux)
  const shelfHeight = height / 6;
  for (let i = 1; i <= 5; i++) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.05, 0.03, depth - 0.05),
      mat
    );
    shelf.position.y = i * shelfHeight - height * 0.45;
    group.add(shelf);
  }

  return group;
}

/**
 * Crée un frigo de dépanneur
 * @param width - Largeur
 * @param height - Hauteur
 * @param depth - Profondeur
 * @returns Groupe Three.js
 */
export function buildFridge(width: number = 0.9, height: number = 2.0, depth: number = 0.7): THREE.Group {
  const group = new THREE.Group();
  group.name = "frigo_depanneur";

  // Structure principale
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    fridgeMat()
  );
  group.add(body);

  // Porte en verre
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.05, height - 0.1, 0.05),
    fridgeDoorMat()
  );
  door.position.z = depth / 2 + 0.025;
  group.add(door);

  // Poignée
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8),
    matLib.get(COMMERCE_PALETTE.acier, 0.3, 0.8)
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(width * 0.4, height * 0.5, depth + 0.06);
  group.add(handle);

  // Néon intérieur
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.2, 0.05, 0.05),
    buildNeonBlanc()
  );
  neon.position.set(0, height * 0.8, depth * 0.4);
  group.add(neon);

  return group;
}

/**
 * Crée un congélateur de dépanneur
 * @param width - Largeur
 * @param height - Hauteur
 * @param depth - Profondeur
 * @returns Groupe Three.js
 */
export function buildFreezer(width: number = 1.0, height: number = 0.8, depth: number = 0.7): THREE.Group {
  const group = new THREE.Group();
  group.name = "congelateur_depanneur";

  // Structure principale
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    freezerMat()
  );
  group.add(body);

  // Couvercle
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.05, 0.05, depth - 0.05),
    freezerMat()
  );
  lid.position.y = height / 2 + 0.025;
  group.add(lid);

  // Poignée
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8),
    matLib.get(COMMERCE_PALETTE.acier, 0.3, 0.8)
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(width * 0.4, height * 0.55, 0);
  group.add(handle);

  return group;
}

/**
 * Crée une gondole de dépanneur
 * @param width - Largeur
 * @param height - Hauteur
 * @returns Groupe Three.js
 */
export function buildGondola(width: number = 1.5, height: number = 1.6): THREE.Group {
  const group = new THREE.Group();
  group.name = "gondole_depanneur";

  const mat = shelfMat();

  // Structure principale
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.4),
    mat
  );
  group.add(base);

  // Étagères (4 niveaux)
  const shelfHeight = height / 5;
  for (let i = 1; i <= 4; i++) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.05, 0.03, 0.35),
      mat
    );
    shelf.position.y = i * shelfHeight - height * 0.4;
    group.add(shelf);
  }

  return group;
}

/**
 * Crée une porte de magasin
 * @param width - Largeur
 * @param height - Hauteur
 * @param type - Type de porte ("standard", "vitree", "metallique")
 * @returns Groupe Three.js
 */
export function buildShopDoor(
  width: number = 1.0,
  height: number = 2.2,
  type: "standard" | "vitree" | "metallique" = "standard"
): THREE.Group {
  const group = new THREE.Group();
  group.name = `porte_${type}`;

  if (type === "vitree") {
    // Porte vitrée avec cadre en aluminium
    const frameMat = buildAluminium();
    const glassMat = buildVerre();

    // Cadre
    const frameTop = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, 0.1),
      frameMat
    );
    frameTop.position.y = height / 2 + 0.05;
    group.add(frameTop);

    const frameBottom = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, 0.1),
      frameMat
    );
    frameBottom.position.y = height / 2 - height + 0.05;
    group.add(frameBottom);

    const frameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, height - 0.2, 0.1),
      frameMat
    );
    frameLeft.position.x = -width / 2 + 0.05;
    frameLeft.position.y = height / 2 - 0.1;
    group.add(frameLeft);

    const frameRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, height - 0.2, 0.1),
      frameMat
    );
    frameRight.position.x = width / 2 - 0.05;
    frameRight.position.y = height / 2 - 0.1;
    group.add(frameRight);

    // Vitres
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.2, height - 0.3, 0.05),
      glassMat
    );
    glass.position.z = 0.025;
    group.add(glass);
  } else if (type === "metallique") {
    // Porte métallique (pour les arrière-boutiques)
    const mat = buildQuincMetal();
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.1),
      mat
    );
    group.add(door);

    // Renforts
    const reinf1 = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, 0.15),
      mat
    );
    reinf1.position.y = height * 0.3;
    group.add(reinf1);

    const reinf2 = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, 0.15),
      mat
    );
    reinf2.position.y = height * 0.7;
    group.add(reinf2);
  } else {
    // Porte standard en bois
    const mat = buildBoisNaturel();
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.1),
      mat
    );
    group.add(door);

    // Poignée
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8),
      buildLaiton()
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(width * 0.4, height * 0.5, 0.06);
    group.add(handle);
  }

  return group;
}

/**
 * Crée une enseigne de magasin
 * @param text - Texte de l'enseigne
 * @param type - Type de magasin (pour la couleur)
 * @param width - Largeur
 * @param height - Hauteur
 * @returns Groupe Three.js
 */
export function buildShopSign(
  text: string,
  type: ShopKind = "depanneur",
  width: number = 1.5,
  height: number = 0.5
): THREE.Group {
  const group = new THREE.Group();
  group.name = `enseigne_${type}`;

  // Arrière-plan
  let bgMat: QcMat;
  switch (type) {
    case "sqdc":
      bgMat = buildSqdcVert();
      break;
    case "chasse":
      bgMat = buildChasseVert();
      break;
    case "quincaillerie":
      bgMat = buildQuincMetal();
      break;
    default:
      bgMat = buildDepRouge();
  }

  const bg = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.1),
    bgMat
  );
  group.add(bg);

  // Texte (simplifié - à remplacer par une texture de texte)
  const textMat = buildDepBlanc();
  const textMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.8, height * 0.6, 0.05),
    textMat
  );
  group.add(textMesh);

  // Néons pour les enseignes lumineuses
  if (type === "sqdc") {
    const neon1 = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.9, 0.05, 0.05),
      buildNeonVert()
    );
    neon1.position.y = height * 0.4;
    neon1.position.z = 0.1;
    group.add(neon1);
  } else if (type === "depanneur") {
    const neon1 = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.9, 0.05, 0.05),
      buildNeonRouge()
    );
    neon1.position.y = height * 0.4;
    neon1.position.z = 0.1;
    group.add(neon1);
  }

  return group;
}

// ==========================================
// 📤 EXPORTS
// ==========================================

export {
  // Palettes
  COMMERCE_PALETTE,
  PRODUCT_PALETTE,
  // Types
  CommerceMatId,
  // Fonctions principales
  commerceMat,
  productMat,
  // Matériaux spécifiques
  counterMat,
  shelfMat,
  fridgeMat,
  freezerMat,
  cashierMat,
  screenMat,
  floorMat,
  wallMat,
  // Constructeurs
  buildCounter,
  buildShelf,
  buildFridge,
  buildFreezer,
  buildGondola,
  buildShopDoor,
  buildShopSign,
  // Environnement
  installCommerceEnv,
  setCommerceEnvIntensity,
  setCommerceEnvNight,
  setCommerceEnvDay,
  disposeCommerceEnv,
};