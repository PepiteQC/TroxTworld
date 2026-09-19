// @ts-nocheck
/**
 * Matériaux commerce PBR — palette québécoise + SQDC.
 * Acier, rouille, bois, noir mat, vert #1A5632, béton, verre transmission.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { matLib, QC_PALETTE, type QcMat } from "../../../../materials";
import { tex } from "./textures";

export const COMMERCE_PALETTE = {
  acier: QC_PALETTE.acier,
  rouille: QC_PALETTE.rouille,
  boisNaturel: QC_PALETTE.boisNaturel,
  boisClair: QC_PALETTE.boisClair,
  noirMat: QC_PALETTE.noirMat,
  sqdc: QC_PALETTE.sqdcVert,
  beton: QC_PALETTE.betonNeutre,
  verre: QC_PALETTE.verre,
} as const;

export type CommerceMatId = keyof typeof COMMERCE_PALETTE;

const cache = new Map<string, QcMat>();

function keep(mat: QcMat, name: string): QcMat {
  mat.name = name;
  mat.userData.keepPbr = true;
  cache.set(name, mat);
  return mat;
}

/** Acier brossé — gris, métal, rugosité moyenne. */
function acier(): QcMat {
  const hit = cache.get("acier");
  if (hit) return hit;
  return keep(
    tex.pbr("metalPlie", null, 2.4, 1.6, 0.34, 0.86, COMMERCE_PALETTE.acier, 0),
    "acier",
  );
}

/** Rouille — corten, métal oxydé. */
function rouille(): QcMat {
  const hit = cache.get("rouille");
  if (hit) return hit;
  return keep(
    tex.pbr("metalPlie", "betonTrousNrm", 2.2, 1.8, 0.78, 0.28, COMMERCE_PALETTE.rouille, 0.55),
    "rouille",
  );
}

/** Bois naturel — chêne, sheen léger. */
function boisNaturel(): QcMat {
  const hit = cache.get("boisNaturel");
  if (hit) return hit;
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
  return keep(mat, "boisNaturel");
}

/** Bois clair — frêne / érable. */
function boisClair(): QcMat {
  const hit = cache.get("boisClair");
  if (hit) return hit;
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex.map("parquet", 2.6, 1.8),
    color: COMMERCE_PALETTE.boisClair,
    roughness: 0.48,
    metalness: 0,
    sheen: 0.28,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0xe8d4a8),
  });
  return keep(mat, "boisClair");
}

/** Plastique / noir mat moderne. */
function noirMat(): QcMat {
  const hit = cache.get("noirMat");
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({
    color: COMMERCE_PALETTE.noirMat,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: false,
  });
  return keep(mat, "noirMat");
}

/** Vert SQDC institutionnel #1A5632. */
function sqdc(): QcMat {
  const hit = cache.get("sqdc");
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({
    color: COMMERCE_PALETTE.sqdc,
    roughness: 0.52,
    metalness: 0.08,
    flatShading: false,
  });
  return keep(mat, "sqdc");
}

/** Béton gris neutre. */
function beton(): QcMat {
  const hit = cache.get("beton");
  if (hit) return hit;
  return keep(
    tex.pbr("betonDalles", "betonDallesNrm", 2.4, 2.4, 0.9, 0.04, COMMERCE_PALETTE.beton, 0.7),
    "beton",
  );
}

/** Verre transparent — transmission physique. */
function verre(): QcMat {
  return matLib.physicalGlass(COMMERCE_PALETTE.verre, 1, 0.04);
}

const BUILDERS: Record<CommerceMatId, () => QcMat> = {
  acier,
  rouille,
  boisNaturel,
  boisClair,
  noirMat,
  sqdc,
  beton,
  verre,
};

export function commerceMat(id: CommerceMatId): QcMat {
  return BUILDERS[id]();
}

let envTex: THREE.Texture | null = null;
let pmrem: THREE.PMREMGenerator | null = null;

/** Studio PMREM — le verre à transmission a besoin d'un envMap. */
export function installCommerceEnv(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  if (!envTex) {
    pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    envTex = pmrem.fromScene(room, 0.04).texture;
    room.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mats = mesh.material;
      for (const m of Array.isArray(mats) ? mats : [mats]) m.dispose();
    });
  }
  scene.environment = envTex;
  scene.environmentIntensity = 0.68;
}

export function setCommerceEnvNight(scene: THREE.Scene, night: boolean) {
  scene.environmentIntensity = night ? 0.2 : 0.68;
}

export function disposeCommerceEnv() {
  envTex?.dispose();
  envTex = null;
  pmrem?.dispose();
  pmrem = null;
  cache.clear();
}
