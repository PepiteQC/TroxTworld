// src/world/BuildingMaterials.ts
// ETHERWORLD RP — BUILDING MATERIALS v1.0 — CLIENT
// PBR materials catalog and procedural construction utilities for Quebecois Architecture

import * as THREE from 'three';

export interface MaterialDef {
  color: number;
  roughness: number;
  metalness: number;
  bumpScale?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

export const QC_MATERIALS: Record<string, MaterialDef> = {
  // ─── PIERRES ET FONDATIONS ───────────────────────────────────────────────
  calcaireDeschambault: {
    color: 0xd6cfc4,
    roughness: 0.92,
    metalness: 0.04,
  },
  pierreDesChamps: {
    color: 0x8c8275,
    roughness: 0.95,
    metalness: 0.05,
  },
  fondationBeton: {
    color: 0x7d7b7a,
    roughness: 0.88,
    metalness: 0.1,
  },

  // ─── BOIS ET REVÊTEMENTS ────────────────────────────────────────────────
  bardeauCedreGris: {
    color: 0x9e9587,
    roughness: 0.85,
    metalness: 0.02,
  },
  clinBoisBlanc: {
    color: 0xf5f3ee,
    roughness: 0.65,
    metalness: 0.01,
  },
  boisRougeGrange: {
    color: 0x8a2b2b,
    roughness: 0.78,
    metalness: 0.02,
  },
  boisRondinBrut: {
    color: 0x5c4033,
    roughness: 0.9,
    metalness: 0.02,
  },
  moulureBlanche: {
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.05,
  },

  // ─── TOITURES EN TÔLE CANADIENNE ─────────────────────────────────────────
  toleRougeHeritage: {
    color: 0x992222,
    roughness: 0.35,
    metalness: 0.72,
    clearcoat: 0.3,
  },
  toleVerteForet: {
    color: 0x1f442b,
    roughness: 0.38,
    metalness: 0.68,
    clearcoat: 0.3,
  },
  toleGalvaniseeGris: {
    color: 0xa8b0b8,
    roughness: 0.42,
    metalness: 0.82,
    clearcoat: 0.2,
  },
  toleNoireModerne: {
    color: 0x222426,
    roughness: 0.4,
    metalness: 0.75,
  },

  // ─── FENÊTRES, VERRE ET DÉTAILS ──────────────────────────────────────────
  vitrageReflet: {
    color: 0x88bbdd,
    roughness: 0.1,
    metalness: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  },
  ferForgeNoir: {
    color: 0x1a1a1a,
    roughness: 0.6,
    metalness: 0.85,
  },
  asphalteRoute: {
    color: 0x2f3336,
    roughness: 0.92,
    metalness: 0.08,
  },
  gravierRang: {
    color: 0x877c72,
    roughness: 0.96,
    metalness: 0.02,
  },
  neigeNordique: {
    color: 0xf0f5ff,
    roughness: 0.75,
    metalness: 0.05,
  },
};

export class BuildingMaterialLibrary {
  private cache = new Map<string, THREE.MeshStandardMaterial>();

  get(name: keyof typeof QC_MATERIALS | string): THREE.MeshStandardMaterial {
    const key = String(name);
    if (this.cache.has(key)) return this.cache.get(key)!;

    const def = QC_MATERIALS[key] || {
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.1,
    };

    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: def.roughness,
      metalness: def.metalness,
    });

    this.cache.set(key, mat);
    return mat;
  }
}

export const buildingMatLib = new BuildingMaterialLibrary();

// ─── PROCEDURAL HELPERS ───────────────────────────────────────────────────

export function buildWall(
  width: number,
  height: number,
  depth: number,
  matName: string,
  castShadow = true
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, buildingMatLib.get(matName));
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildMansardRoof(
  width: number,
  depth: number,
  height: number,
  toleMat = 'toleRougeHeritage'
): THREE.Group {
  const group = new THREE.Group();
  const mat = buildingMatLib.get(toleMat);

  // Gable / Canadian pitched roof
  const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, height, 4);
  const roofMesh = new THREE.Mesh(roofGeo, mat);
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.position.y = height / 2;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  group.add(roofMesh);

  // Dormer windows (lucarnes québécoises)
  const dormerMat = buildingMatLib.get('clinBoisBlanc');
  const glassMat = buildingMatLib.get('vitrageReflet');

  for (let side = -1; side <= 1; side += 2) {
    const dormer = new THREE.Group();
    const dBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.4), dormerMat);
    const dWindow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), glassMat);
    dWindow.position.z = 0.72;
    dormer.add(dBox, dWindow);
    dormer.position.set(0, height * 0.35, side * (depth * 0.35));
    if (side < 0) dormer.rotation.y = Math.PI;
    group.add(dormer);
  }

  return group;
}

export function buildChimney(height: number, width = 1.0): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, width);
  const mesh = new THREE.Mesh(geo, buildingMatLib.get('pierreDesChamps'));
  mesh.castShadow = true;
  return mesh;
}

export function buildMaisonCanadienne(options: {
  width?: number;
  length?: number;
  floors?: number;
  wallMat?: string;
  roofMat?: string;
  hasChimney?: boolean;
  hasGalery?: boolean;
} = {}): THREE.Group {
  const width = options.width ?? 10;
  const length = options.length ?? 14;
  const floors = options.floors ?? 2;
  const wallMat = options.wallMat ?? 'calcaireDeschambault';
  const roofMat = options.roofMat ?? 'toleRougeHeritage';
  const hasChimney = options.hasChimney ?? true;
  const hasGalery = options.hasGalery ?? true;

  const house = new THREE.Group();
  const floorHeight = 3.2;
  const bodyHeight = floors * floorHeight;

  // Foundation
  const foundation = buildWall(width + 0.4, 0.8, length + 0.4, 'fondationBeton');
  foundation.position.y = 0.4;
  house.add(foundation);

  // Main walls
  const body = buildWall(width, bodyHeight, length, wallMat);
  body.position.y = 0.8 + bodyHeight / 2;
  house.add(body);

  // Roof
  const roof = buildMansardRoof(width + 1.2, length + 1.2, 4.5, roofMat);
  roof.position.y = 0.8 + bodyHeight;
  house.add(roof);

  // Front porch / Galeries avec galerie surbaissée
  if (hasGalery) {
    const porchMat = buildingMatLib.get('bardeauCedreGris');
    const porch = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.4, 2.5), porchMat);
    porch.position.set(0, 0.6, length / 2 + 1.25);
    house.add(porch);

    // Pillars
    const pillMat = buildingMatLib.get('moulureBlanche');
    for (const x of [-width * 0.4, 0, width * 0.4]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), pillMat);
      col.position.set(x, 1.9, length / 2 + 2.2);
      house.add(col);
    }
  }

  // Traditional stone chimney on gable
  if (hasChimney) {
    const chimney = buildChimney(bodyHeight + 5.5, 1.2);
    chimney.position.set(width / 2 - 0.6, (bodyHeight + 5.5) / 2, 0);
    house.add(chimney);
  }

  return house;
}
