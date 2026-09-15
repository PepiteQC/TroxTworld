import * as THREE from "three";
import { wireCsm } from "./csm";

export const QC_PALETTE = {
  boisBlanc: 0xe8e4d8,
  boisCreme: 0xd8cfb8,
  boisGris: 0xa8a49a,
  boisBleu: 0x8fa8b8,
  boisVert: 0x7a8f78,
  boisRouge: 0xa04838,
  pierreChamps: 0x9a9086,
  pierreGrise: 0x8a8580,
  brique: 0x8f4a38,
  toleRouge: 0x8f3628,
  toleVerte: 0x2f5a42,
  toleNoire: 0x2a2a2e,
  toleBleue: 0x3a5570,
  bardeauGris: 0x4a4844,
  toleArgent: 0xb8bcc0,
  boiserie: 0xf0ece0,
  boiserieVerte: 0x1f4030,
  fenetre: 0x2a3a48,
  fenetreEclairee: 0xffd88a,
  porte: 0x5a3a28,
  galerie: 0xc8c0b0,
  cheminee: 0x7a4438,
  fondation: 0x6a6660,
  beton: 0x8a8a86,
  /** Commerce PBR — palette québécoise + SQDC. */
  acier: 0x8a9099,
  rouille: 0x8a3a1c,
  boisNaturel: 0xa07848,
  boisClair: 0xd4b888,
  noirMat: 0x1a1c1e,
  sqdcVert: 0x1a5632,
  betonNeutre: 0x9a9894,
  verre: 0xc8dce8,
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

/** Lambert pour le mat, Standard / Physical pour le métal, le brillant, le verre. */
export type QcMat = THREE.MeshLambertMaterial | THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

export function usePbr(roughness: number, metalness: number) {
  return metalness > 0.18 || roughness < 0.28;
}

function parseHex(hex: string | number) {
  if (typeof hex === "number") return hex;
  return parseInt(hex.replace("#", ""), 16);
}

const cheapCache = new WeakMap<THREE.Material, THREE.Material>();

function keepPhysical(mat: THREE.MeshStandardMaterial) {
  if (mat.userData.keepPbr) return true;
  if (!(mat instanceof THREE.MeshPhysicalMaterial)) return false;
  return mat.transmission > 0.01 || mat.clearcoat > 0.15 || mat.sheen > 0.05 || mat.iridescence > 0.05;
}

/** Standard/Physical mat → Lambert si le PBR n'apporte rien (tissu, bois, peau). */
export function cheapenMat(mat: THREE.Material): THREE.Material {
  const hit = cheapCache.get(mat);
  if (hit) return hit;
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
  cheapCache.set(mat, cheap);
  cheapCache.set(cheap, cheap);
  mat.dispose();
  return cheap;
}

export function cheapenTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cheapenMat) : cheapenMat(mesh.material);
  });
}

class MaterialLibrary {
  private cache = new Map<string, QcMat>();

  hex(hex: string, roughness = 0.85, metalness = 0) {
    return this.get(parseHex(hex), roughness, metalness);
  }

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
    this.cache.set(key, mat);
    return mat;
  }

  /** Verre PBR — transmission physique (vitrines, portes SQDC). */
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
    });
    phys.userData.keepPbr = true;
    phys.userData.skipCsm = true;
    phys.userData.csmWired = true;
    this.cache.set(key, phys);
    return phys;
  }

  water(color = 0x2a4a68, opacity = 0.88) {
    const key = `w_${color}_${opacity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity,
      emissive: color,
      emissiveIntensity: 0.14,
      flatShading: true,
    });
    mat.userData.csmWired = true;
    this.cache.set(key, mat);
    return mat;
  }

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
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  get(color: number, roughness = 0.85, metalness = 0, flat = true): QcMat {
    const pbr = usePbr(roughness, metalness);
    const key = `${pbr ? "s" : "l"}_${color}_${roughness}_${metalness}_${flat}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = pbr
      ? new THREE.MeshStandardMaterial({
          color,
          roughness,
          metalness,
          flatShading: flat,
        })
      : new THREE.MeshLambertMaterial({
          color,
          flatShading: flat,
        });
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  getEmissive(color: number, emissive: number, intensity: number): QcMat {
    const key = `em_${color}_${emissive}_${intensity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshLambertMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      flatShading: true,
    });
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  emissive(color: number, emissive: number, intensity: number) {
    return this.getEmissive(color, emissive, intensity);
  }

  dispose() {
    this.cache.forEach((m) => m.dispose());
    this.cache.clear();
  }
}

export const matLib = new MaterialLibrary();
