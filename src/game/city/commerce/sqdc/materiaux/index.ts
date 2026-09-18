/**
 * TROXTWORLD — SQDC Matériaux PBR partagés
 * Un seul point de vérité pour tous les matériaux du bâtiment.
 */
import * as THREE from "three";
import { texConcrete, texOak, texSteel } from "./textures";

export interface SqdcMaterialLib {
  concrete: THREE.MeshStandardMaterial;
  oak: THREE.MeshStandardMaterial;
  oakTop: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  accentGreen: THREE.MeshStandardMaterial;
  accentGold: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  emissiveGreen: THREE.MeshStandardMaterial;
  emissiveGold: THREE.MeshStandardMaterial;
  emissiveRed: THREE.MeshStandardMaterial;
  neonGreen: THREE.MeshBasicMaterial;
  blackMat: THREE.MeshStandardMaterial;
  woodNatural: THREE.MeshStandardMaterial;
}

let _lib: SqdcMaterialLib | null = null;

export function sqdcMaterials(): SqdcMaterialLib {
  if (_lib) return _lib;

  const concrete = new THREE.MeshStandardMaterial({
    map: texConcrete([6, 6]),
    roughness: 0.86,
    metalness: 0.02,
    color: 0x8a9098,
  });

  const oak = new THREE.MeshStandardMaterial({
    map: texOak([1, 2]),
    roughness: 0.62,
    metalness: 0.05,
  });

  const oakTop = new THREE.MeshStandardMaterial({
    map: texOak([2, 1]),
    roughness: 0.42,
    metalness: 0.08,
    color: 0xd8b88a,
  });

  const steel = new THREE.MeshStandardMaterial({
    map: texSteel([2, 1]),
    roughness: 0.28,
    metalness: 0.85,
    color: 0xb8bcc2,
  });

  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.72, metalness: 0.15 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.95 });
  const accentGreen = new THREE.MeshStandardMaterial({ color: 0x1a5632, roughness: 0.6, metalness: 0.1 });
  const accentGold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.35, metalness: 0.65 });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xa8c8d8,
    roughness: 0.06,
    metalness: 0.05,
    transmission: 0.9,
    thickness: 0.4,
    ior: 1.45,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const emissiveGreen = new THREE.MeshStandardMaterial({
    color: 0x0a2818,
    emissive: 0x2a7a48,
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });

  const emissiveGold = new THREE.MeshStandardMaterial({
    color: 0x2a1e0a,
    emissive: 0xc9a24a,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });

  const emissiveRed = new THREE.MeshStandardMaterial({
    color: 0x1a0505,
    emissive: 0xd03030,
    emissiveIntensity: 1.4,
  });

  const neonGreen = new THREE.MeshBasicMaterial({ color: 0x2aff7a });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.55, metalness: 0.3 });
  const woodNatural = new THREE.MeshStandardMaterial({ color: 0xa87850, roughness: 0.7 });

  _lib = {
    concrete, oak, oakTop, steel, dark, wall,
    accentGreen, accentGold, glass,
    emissiveGreen, emissiveGold, emissiveRed,
    neonGreen, blackMat, woodNatural,
  };
  return _lib;
}

export function disposeMaterials() {
  if (!_lib) return;
  Object.values(_lib).forEach((m) => {
    if (m instanceof THREE.Material) m.dispose();
  });
  _lib = null;
}