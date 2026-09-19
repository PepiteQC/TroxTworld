/**
 * Bibliothèque de matériaux PBR procéduraux — Comté de Portneuf authentique.
 * Textures générées via Canvas (bois, pierre, brique, tôle, neige, herbe, asphalte).
 * Normal maps procédurales pour le relief de surface.
 * Fichier: src/game/materials.ts
 */
import * as THREE from "three";
import { wireCsm } from "./csm";

// ============================================================================
// PALETTE QUÉBÉCOISE ENRICHE
// ============================================================================
export const QC_PALETTE = {
  // Bois traditionnels
  boisBlanc: 0xe8e4d8,
  boisCreme: 0xd8cfb8,
  boisGris: 0xa8a49a,
  boisBleu: 0x8fa8b8,
  boisVert: 0x7a8f78,
  boisRouge: 0xa04838,
  boisNaturel: 0xa07848,
  boisClair: 0xd4b888,
  
  // Pierre et maçonnerie
  pierreChamps: 0x9a9086,
  pierreGrise: 0x8a8580,
  pierreBeige: 0xb0a898,
  pierreFoncee: 0x5a5852,
  pierreCalcaire: 0xc8c0b0,

  // Brique
  brique: 0x8f4a38,
  beton: 0x8a8a86,
  betonNeutre: 0x9a9894,
  fondation: 0x6a6660,
  
  // Toiture
  toleRouge: 0x8f3628,
  toleVerte: 0x2f5a42,
  toleNoire: 0x2a2a2e,
  toleBleue: 0x3a5570,
  bardeauGris: 0x4a4844,
  toleArgent: 0xb8bcc0,
  
  // Menuiserie
  boiserie: 0xf0ece0,
  boiserieVerte: 0x1f4030,
  porte: 0x5a3a28,
  galerie: 0xc8c0b0,
  cheminee: 0x7a4438,
  
  // Commerce et industriel
  acier: 0x8a9099,
  rouille: 0x8a3a1c,
  noirMat: 0x1a1c1e,
  sqdcVert: 0x1a5632,
  
  // Verre et fenêtres
  fenetre: 0x2a3a48,
  fenetreEclairee: 0xffd88a,
  verre: 0xc8dce8,
  
  // Nature et saisons
  neige: 0xf8f8ff,
  glace: 0xd4e8f0,
  asphalte: 0x2a2a2e,
  asphalteMouille: 0x1a1a1e,
  gravier: 0x8a8580,
  terre: 0x5a4a3a,
  boue: 0x4a3a2a,
  
  // Véhicules
  carPaintRed: 0xc03028,
  carPaintBlue: 0x2a4a8a,
  carPaintBlack: 0x1a1a1e,
  carPaintWhite: 0xf0f0f0,
  chrome: 0xd8dce0,
  aluminium: 0xb8bcc0,
};

export const WALL_COLORS = [
  QC_PALETTE.boisBlanc,
  QC_PALETTE.boisCreme,
  QC_PALETTE.boisGris,
  QC_PALETTE.boisBleu,
  QC_PALETTE.boisVert,
  QC_PALETTE.boisRouge,
];

export const ROOF_COLORS = [
  QC_PALETTE.toleRouge,
  QC_PALETTE.toleVerte,
  QC_PALETTE.toleNoire,
  QC_PALETTE.toleBleue,
  QC_PALETTE.bardeauGris,
];

// ============================================================================
// TYPES DE MATÉRIAUX
// ============================================================================
export type QcMat = THREE.MeshLambertMaterial | THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

export interface MaterialOptions {
  roughness?: number;
  metalness?: number;
  flatShading?: boolean;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  envMap?: THREE.Texture | null;
  envMapIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  sheen?: number;
  sheenColor?: THREE.Color;
  iridescence?: number;
  iridescenceIOR?: number;
}

// ============================================================================
// UTILITAIRES PBR
// ============================================================================
export function usePbr(roughness: number, metalness: number) {
  return metalness > 0.18 || roughness < 0.28;
}

function parseHex(hex: string | number) {
  if (typeof hex === "number") return hex;
  return parseInt(hex.replace("#", ""), 16);
}

// ============================================================================
// SYSTÈME DE CACHE AMÉLIORÉ AVEC WEAK REFERENCES
// ============================================================================
const cheapCache = new WeakMap<THREE.Material, THREE.Material>();
const materialRegistry = new Set<THREE.Material>();

function registerMaterial(mat: THREE.Material) {
  materialRegistry.add(mat);
  return mat;
}

function keepPhysical(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return false;
  if (mat.userData.keepPbr) return true;
  if (mat instanceof THREE.MeshPhysicalMaterial) {
    return (
      (mat.transmission ?? 0) > 0.01 ||
      (mat.clearcoat ?? 0) > 0.15 ||
      (mat.sheen ?? 0) > 0.05 ||
      (mat.iridescence ?? 0) > 0.05 ||
      mat.userData.forcePbr === true
    );
  }
  return usePbr(mat.roughness, mat.metalness);
}

/**
 * Convertit Standard/Physical → Lambert SEULEMENT si le PBR n'apporte rien.
 * Préserve les matériaux importants (verre, métal, émissifs).
 */
export function cheapenMat(mat: THREE.Material): THREE.Material {
  const hit = cheapCache.get(mat);
  if (hit) return hit;
  
  // Ne pas convertir si le PBR est nécessaire
  if (!(mat instanceof THREE.MeshStandardMaterial) || keepPhysical(mat) || usePbr(mat.roughness, mat.metalness)) {
    wireCsm(mat);
    cheapCache.set(mat, mat);
    return mat;
  }
  
  const cheap = new THREE.MeshLambertMaterial();
  cheap.name = mat.name;
  cheap.color.copy(mat.color);
  cheap.map = mat.map;
  cheap.emissive.copy(mat.emissive);
  cheap.emissiveMap = mat.emissiveMap;
  cheap.emissiveIntensity = mat.emissiveIntensity;
  cheap.transparent = mat.transparent;
  cheap.opacity = mat.opacity;
  cheap.side = mat.side;
  cheap.alphaTest = mat.alphaTest;
  cheap.vertexColors = mat.vertexColors;
  cheap.flatShading = mat.flatShading;
  cheap.depthWrite = mat.depthWrite;
  cheap.depthTest = mat.depthTest;
  cheap.alphaMap = mat.alphaMap;
  cheap.aoMap = mat.aoMap;
  cheap.aoMapIntensity = mat.aoMapIntensity;
  cheap.lightMap = mat.lightMap;
  cheap.lightMapIntensity = mat.lightMapIntensity;
  cheap.fog = mat.fog;
  cheap.userData = { ...mat.userData, csmWired: false };
  
  wireCsm(cheap);
  registerMaterial(cheap);
  cheapCache.set(mat, cheap);
  cheapCache.set(cheap, cheap);
  
  // Ne pas disposer l'original pour éviter des problèmes de référence
  return cheap;
}

/**
 * Version SAFE qui ne convertit PAS les matériaux importants.
 * Recommandé pour les props HD.
 */
export function cheapenTreeSafe(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const converted = mats.map((m) => {
      // Ne pas convertir les matériaux émissifs, transparents ou PBR
      if (m instanceof THREE.MeshStandardMaterial) {
        if (m.emissiveIntensity > 0.1 || m.transparent || keepPhysical(m)) {
          return m;
        }
      }
      return cheapenMat(m);
    });
    mesh.material = Array.isArray(mesh.material) ? converted : converted[0];
  });
}

/**
 * Version AGRESSIVE (ancienne) - À ÉVITER pour le HD
 */
export function cheapenTree(root: THREE.Object3D) {
  return cheapenTreeSafe(root);
}

// ============================================================================
// BIBLIOTHÈQUE DE MATÉRIAUX HD
// ============================================================================
class MaterialLibrary {
  private cache = new Map<string, QcMat>();
  private envMap: THREE.Texture | null = null;

  /**
   * Définit l'environment map global pour les réflexions
   */
  setEnvironmentMap(envMap: THREE.Texture | null) {
    this.envMap = envMap;
    // Mettre à jour tous les matériaux PBR existants
    for (const mat of this.cache.values()) {
      if (mat instanceof THREE.MeshStandardMaterial && mat.userData.useEnvMap) {
        mat.envMap = envMap;
        mat.needsUpdate = true;
      }
    }
  }

  /**
   * Crée un matériau basique avec couleur hex
   */
  hex(hex: string, roughness = 0.85, metalness = 0) {
    return this.get(parseHex(hex), roughness, metalness);
  }

  /**
   * Verre simple (Lambert) - pour performances
   */
  glass(hex: string | number, opacity = 0.35, _roughness = 0.08, _metalness = 0.1) {
    const color = parseHex(hex);
    const key = `gl_${color}_${opacity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    mat = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: opacity > 0.6,
      flatShading: true,
    });
    mat.userData.csmWired = true;
    mat.userData.skipCsm = true;
    registerMaterial(mat);
    this.cache.set(key, mat);
    return mat;
  }

  /**
   * Verre PBR HD — transmission physique (vitrines, portes SQDC)
   */
  physicalGlass(hex: string | number = 0xc8dce8, transmission = 1, roughness = 0.045) {
    const color = parseHex(hex);
    const key = `pg_${color}_${transmission}_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness,
      transmission,
      thickness: 0.48,
      ior: 1.5,
      specularIntensity: 1,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.FrontSide,
      attenuationColor: new THREE.Color(color),
      attenuationDistance: 3.2,
      envMapIntensity: 1.15,
      envMap: this.envMap,
    });
    phys.userData.keepPbr = true;
    phys.userData.skipCsm = true;
    phys.userData.csmWired = true;
    phys.userData.useEnvMap = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Eau PBR avec réflexions et animation
   */
  water(color = 0x2a4a68, opacity = 0.88) {
    const key = `w_${color}_${opacity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    mat = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity,
      transmission: 0.6,
      thickness: 1.5,
      ior: 1.33,
      envMap: this.envMap,
      envMapIntensity: 1.5,
    });
    mat.userData.keepPbr = true;
    mat.userData.useEnvMap = true;
    registerMaterial(mat);
    this.cache.set(key, mat);
    return mat;
  }

  /**
   * Matériau éclairé (émissif)
   */
  lit(hex: string, emissiveHex: string, intensity: number, roughness = 0.35) {
    const color = parseHex(hex);
    const emissive = parseHex(emissiveHex);
    const key = `lit_${color}_${emissive}_${intensity}_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    mat = new THREE.MeshLambertMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      flatShading: true,
    });
    registerMaterial(mat);
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Matériau PBR complet avec options avancées
   */
  get(color: number, roughness = 0.85, metalness = 0, flat = true, options: MaterialOptions = {}): QcMat {
    const pbr = usePbr(roughness, metalness) || options.normalMap || options.envMap;
    const key = `${pbr ? "s" : "l"}_${color}_${roughness}_${metalness}_${flat}_${options.normalMap ? "n" : ""}_${options.envMap ? "e" : ""}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    if (pbr) {
      const std = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        flatShading: flat,
        normalMap: options.normalMap,
        roughnessMap: options.roughnessMap,
        metalnessMap: options.metalnessMap,
        aoMap: options.aoMap,
        emissiveMap: options.emissiveMap,
        envMap: options.envMap || this.envMap,
        envMapIntensity: options.envMapIntensity ?? 1,
      });
      std.userData.useEnvMap = !!(options.envMap || this.envMap);
      mat = std;
    } else {
      mat = new THREE.MeshLambertMaterial({
        color,
        flatShading: flat,
      });
    }
    
    registerMaterial(mat);
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Matériau émissif (néons, lumières)
   */
  getEmissive(color: number, emissive: number, intensity: number): QcMat {
    const key = `em_${color}_${emissive}_${intensity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    mat = new THREE.MeshLambertMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      flatShading: true,
      toneMapped: false,
    });
    registerMaterial(mat);
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Alias pour getEmissive
   */
  emissive(color: number, emissive: number, intensity: number) {
    return this.getEmissive(color, emissive, intensity);
  }

  /**
   * Peinture automobile HD avec clearcoat
   */
  carPaint(color: number, roughness = 0.3, metalness = 0.8) {
    const key = `cp_${color}_${roughness}_${metalness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color,
      metalness,
      roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMap: this.envMap,
      envMapIntensity: 1.2,
    });
    phys.userData.keepPbr = true;
    phys.userData.useEnvMap = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Chrome / métal poli HD
   */
  chrome(roughness = 0.05) {
    const key = `chrome_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color: 0xd8dce0,
      metalness: 1,
      roughness,
      envMap: this.envMap,
      envMapIntensity: 2,
    });
    phys.userData.keepPbr = true;
    phys.userData.useEnvMap = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Neige PBR avec sheen
   */
  snow() {
    const key = "snow";
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color: 0xf8f8ff,
      metalness: 0,
      roughness: 0.8,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xd4e8f0),
      envMap: this.envMap,
      envMapIntensity: 0.8,
    });
    phys.userData.keepPbr = true;
    phys.userData.useEnvMap = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Asphalte mouillé avec réflexions
   */
  wetAsphalt() {
    const key = "wet_asphalt";
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const std = new THREE.MeshStandardMaterial({
      color: 0x1a1a1e,
      metalness: 0.3,
      roughness: 0.4,
      envMap: this.envMap,
      envMapIntensity: 1.5,
    });
    std.userData.useEnvMap = true;
    registerMaterial(std);
    this.cache.set(key, std);
    return std;
  }

  /**
   * Asphalte sec
   */
  dryAsphalt() {
    return this.get(0x2a2a2e, 0.95, 0);
  }

  /**
   * Béton avec normal map optionnelle
   */
  concrete(normalMap?: THREE.Texture | null) {
    return this.get(0x8a8a86, 0.9, 0, true, { normalMap });
  }

  /**
   * Bois avec normal map optionnelle
   */
  wood(color = 0xa07848, normalMap?: THREE.Texture | null) {
    return this.get(color, 0.85, 0, true, { normalMap });
  }

  /**
   * Métal brossé
   */
  brushedMetal(color = 0x8a9099, roughness = 0.4) {
    return this.get(color, roughness, 0.9);
  }

  /**
   * Rouille
   */
  rust() {
    return this.get(0x8a3a1c, 0.95, 0.3);
  }

  /**
   * Tissu avec sheen
   */
  fabric(color: number) {
    const key = `fabric_${color}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness: 0.9,
      sheen: 0.3,
      sheenColor: new THREE.Color(color).multiplyScalar(1.2),
    });
    phys.userData.keepPbr = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Matériau animé (émissif pulsant)
   */
  animatedEmissive(color: number, emissive: number, intensity: number, speed: number = 1) {
    const mat = this.getEmissive(color, emissive, intensity) as THREE.MeshLambertMaterial;
    mat.userData.animated = true;
    mat.userData.animSpeed = speed;
    mat.userData.baseIntensity = intensity;
    return mat;
  }

  /**
   * Met à jour les matériaux animés (à appeler dans la boucle de rendu)
   */
  updateAnimatedMaterials(time: number) {
    for (const mat of this.cache.values()) {
      if (mat.userData.animated && mat instanceof THREE.MeshLambertMaterial) {
        const speed = mat.userData.animSpeed ?? 1;
        const base = mat.userData.baseIntensity ?? 1;
        mat.emissiveIntensity = base * (0.5 + 0.5 * Math.sin(time * speed));
      }
    }
  }

  /**
   * Clone un matériau avec modifications
   */
  cloneWith(mat: QcMat, overrides: Partial<MaterialOptions>): QcMat {
    const cloned = mat.clone();
    if (overrides.roughness !== undefined && cloned instanceof THREE.MeshStandardMaterial) {
      cloned.roughness = overrides.roughness;
    }
    if (overrides.metalness !== undefined && cloned instanceof THREE.MeshStandardMaterial) {
      cloned.metalness = overrides.metalness;
    }
    if (overrides.envMap !== undefined && cloned instanceof THREE.MeshStandardMaterial) {
      cloned.envMap = overrides.envMap;
    }
    registerMaterial(cloned);
    return cloned;
  }

  /**
   * Dispose tous les matériaux
   */
  dispose() {
    for (const mat of materialRegistry) {
      mat.dispose();
    }
    materialRegistry.clear();
    this.cache.clear();
    texCache.forEach((t) => t.dispose());
    texCache.clear();
  }

  getStats() {
    return { materials: this.cache.size, textures: texCache.size };
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    let lambert = 0;
    let standard = 0;
    let physical = 0;
    
    for (const mat of this.cache.values()) {
      if (mat instanceof THREE.MeshPhysicalMaterial) physical++;
      else if (mat instanceof THREE.MeshStandardMaterial) standard++;
      else lambert++;
    }
    
    return {
      total: this.cache.size,
      lambert,
      standard,
      physical,
      registered: materialRegistry.size,
    };
  }
}

export const matLib = new MaterialLibrary();

// ============================================================================
// UTILITAIRES GLOBAUX
// ============================================================================

/**
 * Configure l'environment map global pour tous les matériaux
 */
export function setGlobalEnvironment(envMap: THREE.Texture | null) {
  matLib.setEnvironmentMap(envMap);
}

/**
 * Crée un matériau PBR rapide avec toutes les options
 */
export function createPBR(
  color: number,
  options: MaterialOptions = {}
): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return matLib.get(color, options.roughness ?? 0.5, options.metalness ?? 0, true, options) as any;
}

/**
 * Matériau de terrain (neige, boue, asphalte)
 */
export function terrainMaterial(type: "snow" | "mud" | "asphalt" | "gravel" | "grass") {
  switch (type) {
    case "snow":
      return matLib.snow();
    case "mud":
      return matLib.get(QC_PALETTE.boue, 0.95, 0);
    case "asphalt":
      return matLib.dryAsphalt();
    case "gravel":
      return matLib.get(QC_PALETTE.gravier, 0.95, 0);
    case "grass":
      return matLib.get(0x4a6a32, 0.9, 0);
  }
}
