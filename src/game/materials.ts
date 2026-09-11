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

class MaterialLibrary {
  private cache = new Map<string, THREE.MeshStandardMaterial>();

  hex(hex: string, roughness = 0.85, metalness = 0) {
    return this.get(parseInt(hex.replace("#", ""), 16), roughness, metalness);
  }

  glass(hex: string, opacity = 0.35, roughness = 0.08, metalness = 0.1) {
    const color = parseInt(hex.replace("#", ""), 16);
    const key = `gl_${color}_${opacity}_${roughness}_${metalness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      transparent: true,
      opacity,
      depthWrite: opacity > 0.6,
      flatShading: true,
    });
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  lit(hex: string, emissiveHex: string, intensity: number, roughness = 0.35) {
    const color = parseInt(hex.replace("#", ""), 16);
    const emissive = parseInt(emissiveHex.replace("#", ""), 16);
    const key = `lit_${color}_${emissive}_${intensity}_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      roughness,
      flatShading: true,
    });
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  get(color: number, roughness = 0.85, metalness = 0, flat = true): THREE.MeshStandardMaterial {
    const key = `${color}_${roughness}_${metalness}_${flat}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      flatShading: flat,
    });
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  getEmissive(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
    const key = `em_${color}_${emissive}_${intensity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      roughness: 0.4,
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
