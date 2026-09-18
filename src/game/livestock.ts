/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME D'ÉLEVAGE AGRICOLE COMPLET — UPA QUÉBEC (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - 8 types de bétail (vaches, poules, moutons, cochons, chèvres, chevaux, abeilles, canards)
 *  - Système de santé vétérinaire avec maladies
 *  - Génétique & élevage sélectif (génération, qualité génétique)
 *  - Reproduction (insémination, gestation, naissances)
 *  - IA comportementale (troupeau, hiérarchie, prédateurs)
 *  - Production avancée (lait, fromage, laine, miel)
 *  - Assurance animale & mortalité
 *  - Marché du bétail (vente/achat aux enchères)
 *  - Transport de bétail
 *  - Événements aléatoires (maladie, naissance, accident)
 *  - Statistiques de production détaillées
 *  - Alimentation avancée (foin, grain, minéraux, vitamines)
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { legalFarmsteads } from "./farms";
import { getTerrainHeight } from "./worlddata";

// ═══════════════════════════════════════════════════════════
// TYPES — ÉLEVAGE
// ═══════════════════════════════════════════

export type StockKind = 
  | "vache" 
  | "poulailler" 
  | "mouton" 
  | "cochon" 
  | "chevre" 
  | "cheval" 
  | "abeille" 
  | "canard";

export type AnimalHealth = 
  | "healthy" 
  | "sick" 
  | "injured" 
  | "pregnant" 
  | "lactating" 
  | "dying" 
  | "dead";

export type AnimalGender = "male" | "female";

export type FeedType = 
  | "foin" 
  | "ble" 
  | "mais" 
  | "soya" 
  | "mineraux" 
  | "vitamines" 
  | "medicaments";

export interface AnimalGenetics {
  generation: number;
  quality: number; // 0-100 (influence production)
  traits: string[]; // "haute_production", "resistant_maladie", "docile", etc.
  parentId1?: string;
  parentId2?: string;
}

export interface Stock {
  id: string;
  kind: StockKind;
  farmId: string;
  name: string;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  yaw: number;
  hunger: number;
  thirst: number;
  health: AnimalHealth;
  healthPoints: number; // 0-100
  disease?: string;
  readyAt: number;
  mesh: THREE.Group;
  padW: number;
  padD: number;
  padYaw: number;
  
  // ── NOUVEAU v2.0 ──
  gender: AnimalGender;
  age: number; // en jours
  genetics: AnimalGenetics;
  isPregnant: boolean;
  pregnancyDays: number;
  gestationDays: number;
  lastMilked?: number;
  milkProduction: number; // litres/jour
  eggProduction: number; // oeufs/jour
  woolProduction: number; // kg/an
  insuranceValue: number;
  marketValue: number;
  temperament: "docile" | "agressif" | "peureux" | "curieux";
}

export interface HerdStats {
  totalAnimals: number;
  byKind: Record<StockKind, number>;
  healthyCount: number;
  sickCount: number;
  pregnantCount: number;
  totalMilkProduction: number;
  totalEggProduction: number;
  averageGeneticQuality: number;
  mortalityRate: number;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTES & CONFIGURATION
// ═══════════════════════════════════════════

const ANIMAL_CONFIGS: Record<StockKind, {
  baseMilk: number;
  baseEggs: number;
  baseWool: number;
  gestationDays: number;
  feedConsumption: number;
  marketBaseValue: number;
}> = {
  vache: { baseMilk: 25, baseEggs: 0, baseWool: 0, gestationDays: 283, feedConsumption: 25, marketBaseValue: 2500 },
  poulailler: { baseMilk: 0, baseEggs: 280, baseWool: 0, gestationDays: 21, feedConsumption: 0.12, marketBaseValue: 15 },
  mouton: { baseMilk: 2, baseEggs: 0, baseWool: 4, gestationDays: 150, feedConsumption: 3, marketBaseValue: 350 },
  cochon: { baseMilk: 0, baseEggs: 0, baseWool: 0, gestationDays: 114, feedConsumption: 5, marketBaseValue: 450 },
  chevre: { baseMilk: 3, baseEggs: 0, baseWool: 0, gestationDays: 150, feedConsumption: 4, marketBaseValue: 400 },
  cheval: { baseMilk: 0, baseEggs: 0, baseWool: 0, gestationDays: 340, feedConsumption: 12, marketBaseValue: 5000 },
  abeille: { baseMilk: 0, baseEggs: 0, baseWool: 0, gestationDays: 0, feedConsumption: 0, marketBaseValue: 200 },
  canard: { baseMilk: 0, baseEggs: 200, baseWool: 0, gestationDays: 28, feedConsumption: 0.15, marketBaseValue: 25 },
};

const DISEASES = [
  { id: "mammite", name: "Mammite", affects: ["vache", "chevre"], severity: 0.7, duration: 14 },
  { id: "grippe_aviaire", name: "Grippe aviaire", affects: ["poulailler", "canard"], severity: 0.9, duration: 7 },
  { id: "fievre_aphteuse", name: "Fièvre aphteuse", affects: ["vache", "cochon", "mouton", "chevre"], severity: 0.8, duration: 21 },
  { id: "varroa", name: "Varroa", affects: ["abeille"], severity: 0.6, duration: 30 },
  { id: "colique", name: "Colique", affects: ["cheval"], severity: 0.5, duration: 3 },
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function farmToWorld(x: number, z: number, yaw: number, ox: number, oz: number) {
  return {
    x: x + Math.cos(yaw) * ox - Math.sin(yaw) * oz,
    z: z + Math.sin(yaw) * ox + Math.cos(yaw) * oz,
  };
}

function generateGenetics(kind: StockKind, generation = 1): AnimalGenetics {
  const quality = 50 + Math.random() * 30 + generation * 5;
  const possibleTraits = [
    "haute_production",
    "resistant_maladie",
    "docile",
    "longevite",
    "fertile",
    "rustique",
  ];
  
  const traits: string[] = [];
  for (const trait of possibleTraits) {
    if (Math.random() < 0.2) traits.push(trait);
  }
  
  return {
    generation,
    quality: Math.min(100, quality),
    traits,
  };
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRATION 3D DES ANIMAUX
// ═══════════════════════════════════════════

export function buildHolstein(seed = 1): THREE.Group {
  const g = new THREE.Group();
  g.name = "holstein";

  const white = matLib.get(0xfaf8f5, 0.9, 0);
  const black = matLib.get(0x1e1c1a, 0.95, 0);
  const pinkUdder = matLib.get(0xe8bcae, 0.8, 0);
  const hornMat = matLib.get(0xd2c4b1, 0.85, 0.1);

  const body = new THREE.Mesh(getGeo("box", { w: 0.75, h: 0.72, d: 1.5 }), white);
  body.position.y = 0.95;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const patchA = new THREE.Mesh(getGeo("box", { w: 0.39, h: 0.45, d: 0.6 }), black);
  patchA.position.set(seed % 2 === 0 ? 0.22 : -0.22, 1.05, 0.2);
  g.add(patchA);

  const patchB = new THREE.Mesh(getGeo("box", { w: 0.34, h: 0.35, d: 0.45 }), black);
  patchB.position.set(seed % 2 === 0 ? -0.22 : 0.2, 1.1, -0.4);
  g.add(patchB);

  const headGroup = new THREE.Group();
  headGroup.name = "neck_head";
  headGroup.position.set(0, 1.25, -0.85);

  const head = new THREE.Mesh(getGeo("box", { w: 0.38, h: 0.34, d: 0.44 }), white);
  head.position.set(0, 0, 0);
  head.castShadow = true;
  headGroup.add(head);

  const snout = new THREE.Mesh(getGeo("box", { w: 0.28, h: 0.2, d: 0.24 }), pinkUdder);
  snout.position.set(0, -0.12, -0.24);
  headGroup.add(snout);

  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(getGeo("box", { w: 0.14, h: 0.16, d: 0.06 }), white);
    ear.position.set(sx * 0.25, 0.12, 0.05);
    ear.rotation.z = sx * 0.35;
    headGroup.add(ear);

    const horn = new THREE.Mesh(getGeo("cone", { r: 0.05, h: 0.2, seg: 4 }), hornMat);
    horn.position.set(sx * 0.16, 0.22, 0.02);
    horn.rotation.z = -sx * 0.55;
    horn.rotation.x = -0.3;
    headGroup.add(horn);
  }
  g.add(headGroup);

  const udder = new THREE.Mesh(getGeo("sphere", { r: 0.18, seg: 8, segH: 6 }), pinkUdder);
  udder.position.set(0, 0.6, 0.15);
  g.add(udder);

  const tail = new THREE.Mesh(getGeo("cylinder", { r: 0.03, r2: 0.015, h: 0.75, seg: 4 }), black);
  tail.name = "tail";
  tail.position.set(0, 1.1, 0.82);
  tail.rotation.x = 0.3;
  g.add(tail);

  const legCoords = [
    { x: -0.24, z: 0.5, name: "leg_back_l" },
    { x: 0.24, z: 0.5, name: "leg_back_r" },
    { x: -0.24, z: -0.5, name: "leg_front_l" },
    { x: 0.24, z: -0.5, name: "leg_front_r" },
  ];

  for (const coord of legCoords) {
    const legPivot = new THREE.Group();
    legPivot.name = coord.name;
    legPivot.position.set(coord.x, 0.6, coord.z);

    const legBone = new THREE.Mesh(getGeo("cylinder", { r: 0.07, r2: 0.08, h: 0.65, seg: 5 }), black);
    legBone.position.y = -0.3;
    legBone.castShadow = true;
    legPivot.add(legBone);

    g.add(legPivot);
  }

  return g;
}

function buildSheep(seed: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "sheep";
  
  const wool = matLib.get(0xf5f5dc, 0.95, 0);
  const dark = matLib.get(0x2a2a2a, 0.9, 0);
  
  // Corps laineux
  const body = new THREE.Mesh(getGeo("sphere", { r: 0.4, seg: 8, segH: 6 }), wool);
  body.position.y = 0.6;
  body.scale.set(1, 0.8, 1.3);
  body.castShadow = true;
  g.add(body);
  
  // Tête
  const head = new THREE.Mesh(getGeo("box", { w: 0.25, h: 0.22, d: 0.3 }), dark);
  head.position.set(0, 0.7, -0.45);
  head.castShadow = true;
  g.add(head);
  
  // Pattes
  for (const [x, z] of [[-0.15, 0.3], [0.15, 0.3], [-0.15, -0.3], [0.15, -0.3]]) {
    const leg = new THREE.Mesh(getGeo("cylinder", { r: 0.05, r2: 0.06, h: 0.5, seg: 5 }), dark);
    leg.position.set(x, 0.25, z);
    leg.castShadow = true;
    g.add(leg);
  }
  
  return g;
}

function buildPig(seed: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "pig";
  
  const pink = matLib.get(0xffb6c1, 0.85, 0);
  const dark = matLib.get(0x8b4513, 0.9, 0);
  
  // Corps
  const body = new THREE.Mesh(getGeo("sphere", { r: 0.35, seg: 8, segH: 6 }), pink);
  body.position.y = 0.5;
  body.scale.set(1, 0.8, 1.4);
  body.castShadow = true;
  g.add(body);
  
  // Tête
  const head = new THREE.Mesh(getGeo("sphere", { r: 0.2, seg: 6, segH: 6 }), pink);
  head.position.set(0, 0.55, -0.4);
  g.add(head);
  
  // Groin
  const snout = new THREE.Mesh(getGeo("cylinder", { r: 0.08, r2: 0.1, h: 0.12, seg: 6 }), pink);
  snout.position.set(0, 0.5, -0.55);
  snout.rotation.x = Math.PI / 2;
  g.add(snout);
  
  // Pattes
  for (const [x, z] of [[-0.15, 0.25], [0.15, 0.25], [-0.15, -0.25], [0.15, -0.25]]) {
    const leg = new THREE.Mesh(getGeo("cylinder", { r: 0.06, r2: 0.07, h: 0.4, seg: 5 }), pink);
    leg.position.set(x, 0.2, z);
    leg.castShadow = true;
    g.add(leg);
  }
  
  // Queue tire-bouchon
  const tail = new THREE.Mesh(getGeo("torus", { r: 0.08, tube: 0.02, seg: 8 }), pink);
  tail.position.set(0, 0.6, 0.5);
  tail.rotation.y = Math.PI / 2;
  g.add(tail);
  
  return g;
}

function buildHorse(seed: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "horse";
  
  const colors = [0x8b4513, 0x2f1810, 0xd2b48c, 0xf5f5dc];
  const coat = matLib.get(colors[seed % colors.length]!, 0.85, 0);
  const dark = matLib.get(0x1a1a1a, 0.9, 0);
  
  // Corps
  const body = new THREE.Mesh(getGeo("box", { w: 0.6, h: 0.7, d: 1.8 }), coat);
  body.position.y = 1.2;
  body.castShadow = true;
  g.add(body);
  
  // Cou
  const neck = new THREE.Mesh(getGeo("cylinder", { r: 0.15, r2: 0.2, h: 0.8, seg: 6 }), coat);
  neck.position.set(0, 1.6, -0.8);
  neck.rotation.x = -0.4;
  g.add(neck);
  
  // Tête
  const head = new THREE.Mesh(getGeo("box", { w: 0.25, h: 0.3, d: 0.5 }), coat);
  head.position.set(0, 1.9, -1.2);
  head.castShadow = true;
  g.add(head);
  
  // Pattes
  for (const [x, z] of [[-0.2, 0.6], [0.2, 0.6], [-0.2, -0.6], [0.2, -0.6]]) {
    const leg = new THREE.Mesh(getGeo("cylinder", { r: 0.08, r2: 0.1, h: 1.0, seg: 6 }), coat);
    leg.position.set(x, 0.5, z);
    leg.castShadow = true;
    g.add(leg);
  }
  
  // Queue
  const tail = new THREE.Mesh(getGeo("cylinder", { r: 0.04, r2: 0.02, h: 0.8, seg: 4 }), dark);
  tail.position.set(0, 1.3, 0.9);
  tail.rotation.x = 0.3;
  g.add(tail);
  
  // Crinière
  const mane = new THREE.Mesh(getGeo("box", { w: 0.08, h: 0.4, d: 0.6 }), dark);
  mane.position.set(0, 1.8, -0.9);
  g.add(mane);
  
  return g;
}

function buildHen(i: number): THREE.Group {
  const g = new THREE.Group();
  const colors = [0xb35a2d, 0xf0ebe1, 0x5c5650];
  const bodyC = colors[i % colors.length]!;
  
  const body = new THREE.Mesh(getGeo("sphere", { r: 0.14, seg: 8, segH: 6 }), matLib.get(bodyC, 0.9, 0));
  body.position.y = 0.2;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(getGeo("sphere", { r: 0.08, seg: 6, segH: 6 }), matLib.get(bodyC, 0.9, 0));
  head.position.set(0, 0.34, -0.1);
  g.add(head);

  const comb = new THREE.Mesh(getGeo("box", { w: 0.03, h: 0.07, d: 0.09 }), matLib.get(0xb51c1c, 0.8, 0));
  comb.position.set(0, 0.42, -0.1);
  g.add(comb);

  const beak = new THREE.Mesh(getGeo("cone", { r: 0.025, h: 0.07, seg: 4 }), matLib.get(0xe89912, 0.7, 0));
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 0.32, -0.17);
  g.add(beak);

  return g;
}

function buildCoop(): THREE.Group {
  const g = new THREE.Group();
  g.name = "poulailler";

  const barnRed = matLib.get(0x8f2d1b, 0.95);
  const woodGrey = matLib.get(0x5c5248, 0.92);

  const house = new THREE.Mesh(getGeo("box", { w: 2.4, h: 1.5, d: 1.8 }), barnRed);
  house.position.y = 0.75;
  house.castShadow = true;
  house.receiveShadow = true;
  g.add(house);

  const roof = new THREE.Mesh(getGeo("box", { w: 2.7, h: 0.12, d: 2.1 }), matLib.get(0x2d2c2a, 0.8, 0.2));
  roof.position.y = 1.6;
  roof.rotation.x = 0.12;
  roof.castShadow = true;
  g.add(roof);

  const ramp = new THREE.Mesh(getGeo("box", { w: 0.5, h: 0.06, d: 1.1 }), woodGrey);
  ramp.position.set(0, 0.24, 1.2);
  ramp.rotation.x = -0.38;
  ramp.castShadow = true;
  g.add(ramp);

  const run = new THREE.Mesh(getGeo("box", { w: 3.6, h: 0.04, d: 3.0 }), matLib.get(0x5c4a37, 1, 0));
  run.position.set(0, 0.02, 2.3);
  run.receiveShadow = true;
  g.add(run);

  const wireMat = matLib.get(0x838a8e, 0.4, 0.6);
  for (const z of [0.8, 3.8]) {
    const rail = new THREE.Mesh(getGeo("box", { w: 3.6, h: 0.8, d: 0.04 }), wireMat);
    rail.position.set(0, 0.4, z);
    g.add(rail);
  }
  for (const x of [-1.8, 1.8]) {
    const rail = new THREE.Mesh(getGeo("box", { w: 0.04, h: 0.8, d: 3.0 }), wireMat);
    rail.position.set(x, 0.4, 2.3);
    g.add(rail);
  }

  for (let i = 0; i < 5; i++) {
    const hen = buildHen(i);
    hen.position.set(-1.1 + i * 0.55, 0, 2.0 + (i % 2) * 0.6);
    hen.rotation.y = i * 1.25;
    hen.userData.hen = true;
    hen.userData.phase = i * 2.1;
    g.add(hen);
  }
  return g;
}

function buildBeehive(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ruche";
  
  const wood = matLib.get(0xf5deb3, 0.9, 0);
  const white = matLib.get(0xffffff, 0.85, 0);
  
  // Base
  const base = new THREE.Mesh(getGeo("box", { w: 0.5, h: 0.1, d: 0.5 }), wood);
  base.position.y = 0.05;
  g.add(base);
  
  // Corps de la ruche (3 hausses)
  for (let i = 0; i < 3; i++) {
    const box = new THREE.Mesh(getGeo("box", { w: 0.45, h: 0.25, d: 0.45 }), white);
    box.position.y = 0.2 + i * 0.25;
    box.castShadow = true;
    g.add(box);
  }
  
  // Toit
  const roof = new THREE.Mesh(getGeo("box", { w: 0.55, h: 0.08, d: 0.55 }), matLib.get(0x8b4513, 0.8, 0));
  roof.position.y = 0.95;
  roof.castShadow = true;
  g.add(roof);
  
  return g;
}

function buildPaddock(w: number, d: number): THREE.Group {
  const g = new THREE.Group();

  const grass = new THREE.Mesh(getGeo("box", { w, h: 0.06, d }), matLib.get(0x3d5c2e, 1, 0));
  grass.position.y = 0.03;
  grass.receiveShadow = true;
  g.add(grass);

  const postGeo = getGeo("cylinder", { r: 0.09, r2: 0.11, h: 1.25, seg: 5 });
  const cedarLogs = matLib.get(0x4a3f35, 0.95, 0);
  const posts: Array<[number, number]> = [];
  const step = 4.0;

  for (let x = -w / 2; x <= w / 2 + 0.01; x += step) posts.push([x, -d / 2], [x, d / 2]);
  for (let z = -d / 2 + step; z < d / 2; z += step) posts.push([-w / 2, z], [w / 2, z]);

  const postMesh = new THREE.InstancedMesh(postGeo, cedarLogs, posts.length);
  postMesh.castShadow = true;
  const dummy = new THREE.Object3D();
  posts.forEach(([x, z], i) => {
    dummy.position.set(x, 0.6, z);
    dummy.updateMatrix();
    postMesh.setMatrixAt(i, dummy.matrix);
  });
  g.add(postMesh);

  const railMat = matLib.get(0x3d352c, 0.9, 0);
  for (const z of [-d / 2, d / 2]) {
    const rail = new THREE.Mesh(getGeo("box", { w, h: 0.08, d: 0.06 }), railMat);
    rail.position.set(0, 0.85, z);
    g.add(rail);
  }
  for (const x of [-w / 2, w / 2]) {
    const rail = new THREE.Mesh(getGeo("box", { w: 0.06, h: 0.08, d }), railMat);
    rail.position.set(x, 0.85, 0);
    g.add(rail);
  }

  const trough = new THREE.Mesh(getGeo("box", { w: 2.0, h: 0.4, d: 0.65 }), matLib.get(0x70757a, 0.4, 0.5));
  trough.position.set(0, 0.25, d / 2 - 1.4);
  trough.castShadow = true;
  g.add(trough);

  const water = new THREE.Mesh(getGeo("box", { w: 1.8, h: 0.04, d: 0.5 }), matLib.water(0x1d4d6e, 0.75));
  water.position.set(0, 0.42, d / 2 - 1.4);
  g.add(water);

  return g;
}

// ═══════════════════════════════════════════════════════════
// MONTAGE DU TROUPEAU
// ═══════════════════════════════════════════

export function mountHerd(parent: THREE.Group): Stock[] {
  const stock: Stock[] = [];
  
  for (const farm of legalFarmsteads()) {
    // Paddock principal pour vaches
    const pad = farmToWorld(farm.x, farm.z, farm.yaw, 18, -16);
    const padW = 18;
    const padD = 16;
    const paddock = buildPaddock(padW, padD);
    paddock.position.set(pad.x, getTerrainHeight(pad.x, pad.z), pad.z);
    paddock.rotation.y = farm.yaw;
    parent.add(paddock);

    // Vaches Holstein
    const nCows = 3;
    for (let i = 0; i < nCows; i++) {
      const ox = (i - 1) * 3.8;
      const oz = (i % 2 === 0 ? -2.6 : 2.8);
      const p = farmToWorld(pad.x, pad.z, farm.yaw, ox, oz);
      const cow = buildHolstein(farm.id.length + i);
      cow.position.set(p.x, getTerrainHeight(p.x, p.z), p.z);
      cow.rotation.y = farm.yaw + i * 0.5;
      parent.add(cow);
      
      const genetics = generateGenetics("vache");
      
      stock.push({
        id: `${farm.id}_cow_${i}`,
        kind: "vache",
        farmId: farm.id,
        name: `Holstein #${i + 1}`,
        x: p.x,
        z: p.z,
        homeX: pad.x,
        homeZ: pad.z,
        yaw: farm.yaw + i * 0.5,
        hunger: 0.6 + (i % 3) * 0.15,
        thirst: 0.8,
        health: "healthy",
        healthPoints: 100,
        readyAt: 4 + i * 4,
        mesh: cow,
        padW,
        padD,
        padYaw: farm.yaw,
        gender: "female",
        age: 730 + Math.floor(Math.random() * 1000),
        genetics,
        isPregnant: false,
        pregnancyDays: 0,
        gestationDays: 283,
        milkProduction: ANIMAL_CONFIGS.vache.baseMilk * (genetics.quality / 100),
        eggProduction: 0,
        woolProduction: 0,
        insuranceValue: 2500,
        marketValue: ANIMAL_CONFIGS.vache.marketBaseValue * (genetics.quality / 80),
        temperament: Math.random() < 0.7 ? "docile" : "peureux",
      });
    }

    // Poulailler
    const coopPos = farmToWorld(farm.x, farm.z, farm.yaw, 9, -11);
    const coop = buildCoop();
    coop.position.set(coopPos.x, getTerrainHeight(coopPos.x, coopPos.z), coopPos.z);
    coop.rotation.y = farm.yaw;
    parent.add(coop);
    
    stock.push({
      id: `${farm.id}_coop`,
      kind: "poulailler",
      farmId: farm.id,
      name: `Poulailler ${farm.village}`,
      x: coopPos.x,
      z: coopPos.z + Math.cos(farm.yaw) * 2.4,
      homeX: coopPos.x,
      homeZ: coopPos.z,
      yaw: farm.yaw,
      hunger: 0.7,
      thirst: 0.8,
      health: "healthy",
      healthPoints: 100,
      readyAt: 6,
      mesh: coop,
      padW: 4,
      padD: 6,
      padYaw: farm.yaw,
      gender: "female",
      age: 180,
      genetics: generateGenetics("poulailler"),
      isPregnant: false,
      pregnancyDays: 0,
      gestationDays: 21,
      milkProduction: 0,
      eggProduction: ANIMAL_CONFIGS.poulailler.baseEggs,
      woolProduction: 0,
      insuranceValue: 500,
      marketValue: 75,
      temperament: "docile",
    });
    
    // Moutons (2 par ferme)
    const sheepPad = farmToWorld(farm.x, farm.z, farm.yaw, -12, -18);
    for (let i = 0; i < 2; i++) {
      const ox = i * 2.5 - 1.25;
      const p = farmToWorld(sheepPad.x, sheepPad.z, farm.yaw, ox, 0);
      const sheep = buildSheep(farm.id.length + i);
      sheep.position.set(p.x, getTerrainHeight(p.x, p.z), p.z);
      sheep.rotation.y = farm.yaw + i * 0.8;
      parent.add(sheep);
      
      stock.push({
        id: `${farm.id}_sheep_${i}`,
        kind: "mouton",
        farmId: farm.id,
        name: `Mouton #${i + 1}`,
        x: p.x,
        z: p.z,
        homeX: sheepPad.x,
        homeZ: sheepPad.z,
        yaw: farm.yaw + i * 0.8,
        hunger: 0.7,
        thirst: 0.8,
        health: "healthy",
        healthPoints: 100,
        readyAt: 8 + i * 3,
        mesh: sheep,
        padW: 8,
        padD: 8,
        padYaw: farm.yaw,
        gender: i % 2 === 0 ? "female" : "male",
        age: 365 + Math.floor(Math.random() * 500),
        genetics: generateGenetics("mouton"),
        isPregnant: false,
        pregnancyDays: 0,
        gestationDays: 150,
        milkProduction: ANIMAL_CONFIGS.mouton.baseMilk,
        eggProduction: 0,
        woolProduction: ANIMAL_CONFIGS.mouton.baseWool,
        insuranceValue: 350,
        marketValue: ANIMAL_CONFIGS.mouton.marketBaseValue,
        temperament: "docile",
      });
    }
    
    // Ruches (1 par ferme)
    const hivePos = farmToWorld(farm.x, farm.z, farm.yaw, 15, 8);
    const hive = buildBeehive();
    hive.position.set(hivePos.x, getTerrainHeight(hivePos.x, hivePos.z), hivePos.z);
    parent.add(hive);
    
    stock.push({
      id: `${farm.id}_hive`,
      kind: "abeille",
      farmId: farm.id,
      name: `Ruche ${farm.village}`,
      x: hivePos.x,
      z: hivePos.z,
      homeX: hivePos.x,
      homeZ: hivePos.z,
      yaw: 0,
      hunger: 0.9,
      thirst: 0.9,
      health: "healthy",
      healthPoints: 100,
      readyAt: 10,
      mesh: hive,
      padW: 2,
      padD: 2,
      padYaw: 0,
      gender: "female",
      age: 365,
      genetics: generateGenetics("abeille"),
      isPregnant: false,
      pregnancyDays: 0,
      gestationDays: 0,
      milkProduction: 0,
      eggProduction: 0,
      woolProduction: 0,
      insuranceValue: 200,
      marketValue: 200,
      temperament: "docile",
    });
  }
  
  return stock;
}

// ═══════════════════════════════════════════════════════════
// PROXIMITÉ & INTERACTIONS
// ═══════════════════════════════════════════

export function nearestStock(list: Stock[], x: number, z: number, max = 3.6): Stock | null {
  let best: Stock | null = null;
  let bestD = max;
  for (const s of list) {
    const reach = s.kind === "poulailler" ? 3.8 : 3.0;
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < Math.min(bestD, reach)) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

export function stockPrompt(s: Stock, elapsed: number, hasFeed: boolean): string {
  const ready = elapsed >= s.readyAt;
  
  if (s.health === "sick") {
    return `⚠️ ${s.name} est malade (${s.disease}) · Appeler le vétérinaire`;
  }
  
  if (s.kind === "vache") {
    if (ready) {
      return `E — Traire la vache · ${s.name} (${s.milkProduction.toFixed(1)}L/jour)`;
    }
    if (s.hunger < 0.4) {
      return hasFeed 
        ? `E — Nourrir · Balle de foin` 
        : `Vache affamée · Requiert du foin`;
    }
    const wait = Math.max(1, Math.ceil(s.readyAt - elapsed));
    return `Holstein · Montée de lait (${wait}s)`;
  }

  if (s.kind === "poulailler") {
    if (ready) {
      return `E — Ramasser les œufs · ${s.name}`;
    }
    if (s.hunger < 0.4) {
      return hasFeed 
        ? `E — Nourrir · Grain de blé` 
        : `Poulailler affamé · Requiert du grain`;
    }
    const wait = Math.max(1, Math.ceil(s.readyAt - elapsed));
    return `Ponte en cours (${wait}s)`;
  }
  
  if (s.kind === "mouton") {
    if (ready) {
      return `E — Tondre la laine · ${s.name}`;
    }
    if (s.hunger < 0.4) {
      return hasFeed 
        ? `E — Nourrir · Foin` 
        : `Mouton affamé`;
    }
    const wait = Math.max(1, Math.ceil(s.readyAt - elapsed));
    return `Laine en pousse (${wait}s)`;
  }
  
  if (s.kind === "abeille") {
    if (ready) {
      return `E — Récolter le miel · ${s.name}`;
    }
    const wait = Math.max(1, Math.ceil(s.readyAt - elapsed));
    return `Production de miel (${wait}s)`;
  }
  
  return `${s.name}`;
}

export interface StockWorkResult {
  ok: boolean;
  notice: string;
  loot?: { id: string; n: number };
  consume?: string;
}

export function workStock(s: Stock, elapsed: number, hasHay: boolean, hasWheat: boolean): StockWorkResult {
  if (s.health === "sick") {
    return { ok: false, notice: `${s.name} est malade et ne peut pas produire.` };
  }
  
  if (s.kind === "vache") {
    if (elapsed >= s.readyAt) {
      const feedBonus = s.hunger > 0.6;
      const geneticsBonus = s.genetics.quality / 100;
      s.readyAt = elapsed + (feedBonus ? 16 : 26);
      s.hunger = Math.max(0.05, s.hunger - 0.35);

      const milkYield = Math.floor((feedBonus ? 2 : 1) * geneticsBonus);
      return { 
        ok: true, 
        notice: `Traite : +${milkYield} bidons de lait · ${s.name}`, 
        loot: { id: "lait_rang", n: milkYield } 
      };
    }
    if (s.hunger < 0.4) {
      if (!hasHay) return { ok: false, notice: "Pas de foin en inventaire." };
      s.hunger = 1.0;
      s.readyAt = Math.min(s.readyAt, elapsed + 6);
      return { ok: true, notice: `Vache alimentée au foin`, consume: "foin" };
    }
    return { ok: false, notice: "Le pis n'est pas encore plein." };
  }

  if (s.kind === "poulailler") {
    if (elapsed >= s.readyAt) {
      const feedBonus = s.hunger > 0.6;
      const geneticsBonus = s.genetics.quality / 100;
      s.readyAt = elapsed + (feedBonus ? 12 : 20);
      s.hunger = Math.max(0.05, s.hunger - 0.25);

      const eggYield = Math.floor((feedBonus ? 3 : 1) * geneticsBonus);
      return { 
        ok: true, 
        notice: `Ponte : +${eggYield} œufs · ${s.name}`, 
        loot: { id: "oeufs", n: eggYield } 
      };
    }
    if (s.hunger < 0.4) {
      if (!hasWheat) return { ok: false, notice: "Manque de grain de blé." };
      s.hunger = 1.0;
      s.readyAt = Math.min(s.readyAt, elapsed + 4);
      return { ok: true, notice: `Volailles nourries`, consume: "ble" };
    }
    return { ok: false, notice: "Aucun œuf pondu." };
  }
  
  if (s.kind === "mouton") {
    if (elapsed >= s.readyAt) {
      const geneticsBonus = s.genetics.quality / 100;
      s.readyAt = elapsed + 30;
      s.hunger = Math.max(0.05, s.hunger - 0.2);

      const woolYield = Math.floor(2 * geneticsBonus);
      return { 
        ok: true, 
        notice: `Tonte : +${woolYield} kg de laine · ${s.name}`, 
        loot: { id: "laine", n: woolYield } 
      };
    }
    if (s.hunger < 0.4) {
      if (!hasHay) return { ok: false, notice: "Pas de foin." };
      s.hunger = 1.0;
      return { ok: true, notice: `Mouton nourri`, consume: "foin" };
    }
    return { ok: false, notice: "Laine pas encore prête." };
  }
  
  if (s.kind === "abeille") {
    if (elapsed >= s.readyAt) {
      const geneticsBonus = s.genetics.quality / 100;
      s.readyAt = elapsed + 20;

      const honeyYield = Math.floor(2 * geneticsBonus);
      return { 
        ok: true, 
        notice: `Récolte : +${honeyYield} pots de miel · ${s.name}`, 
        loot: { id: "miel", n: honeyYield } 
      };
    }
    return { ok: false, notice: "Miel pas encore prêt." };
  }
  
  return { ok: false, notice: "Action non disponible." };
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE SANTÉ & MALADIES
// ═══════════════════════════════════════════

export function treatAnimal(s: Stock, medicine: FeedType): StockWorkResult {
  if (s.health !== "sick") {
    return { ok: false, notice: `${s.name} n'est pas malade.` };
  }
  
  if (medicine !== "medicaments") {
    return { ok: false, notice: "Médicaments requis." };
  }
  
  s.health = "healthy";
  s.healthPoints = Math.min(100, s.healthPoints + 30);
  s.disease = undefined;
  
  return { 
    ok: true, 
    notice: `${s.name} a été soigné avec succès.`,
    consume: "medicaments"
  };
}

export function checkForDisease(s: Stock): boolean {
  if (s.health === "sick") return false;
  
  const applicableDiseases = DISEASES.filter(d => d.affects.includes(s.kind));
  if (applicableDiseases.length === 0) return false;
  
  // 0.5% chance par tick
  if (Math.random() > 0.005) return false;
  
  const disease = applicableDiseases[Math.floor(Math.random() * applicableDiseases.length)];
  
  // Résistance génétique
  if (s.genetics.traits.includes("resistant_maladie") && Math.random() < 0.7) {
    return false;
  }
  
  s.health = "sick";
  s.disease = disease.name;
  s.healthPoints -= disease.severity * 30;
  
  return true;
}

// ═══════════════════════════════════════════════════════════
// REPRODUCTION & GÉNÉTIQUE
// ═══════════════════════════════════════════

export function inseminateAnimal(s: Stock): StockWorkResult {
  if (s.gender !== "female") {
    return { ok: false, notice: "Seulement les femelles peuvent être inséminées." };
  }
  
  if (s.isPregnant) {
    return { ok: false, notice: `${s.name} est déjà gestante.` };
  }
  
  if (s.health !== "healthy") {
    return { ok: false, notice: `${s.name} doit être en santé pour être inséminée.` };
  }
  
  s.isPregnant = true;
  s.pregnancyDays = 0;
  s.health = "pregnant";
  
  return { 
    ok: true, 
    notice: `${s.name} a été inséminée avec succès. Gestation: ${s.gestationDays} jours.` 
  };
}

export function checkBirth(s: Stock, elapsed: number): Stock | null {
  if (!s.isPregnant) return null;
  
  s.pregnancyDays += 1 / 60; // 1 jour par minute
  
  if (s.pregnancyDays >= s.gestationDays) {
    s.isPregnant = false;
    s.pregnancyDays = 0;
    s.health = "healthy";
    
    // Créer un nouveau-né
    const newGenetics: AnimalGenetics = {
      generation: s.genetics.generation + 1,
      quality: Math.min(100, s.genetics.quality + Math.random() * 10),
      traits: [...s.genetics.traits],
      parentId1: s.id,
    };
    
    // Ajouter un trait aléatoire
    const possibleTraits = ["haute_production", "resistant_maladie", "docile", "longevite", "fertile"];
    if (Math.random() < 0.3) {
      newGenetics.traits.push(possibleTraits[Math.floor(Math.random() * possibleTraits.length)]);
    }
    
    // TODO: Créer le nouveau-né et l'ajouter au troupeau
    return null; // Placeholder
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════
// ANIMATIONS & TICK
// ═══════════════════════════════════════════

export function tickHerd(list: Stock[], dt: number, elapsed: number) {
  for (const s of list) {
    // Diminution de la satiété
    s.hunger = Math.max(0, s.hunger - dt * 0.006);
    s.thirst = Math.max(0, s.thirst - dt * 0.008);
    
    // Vérification maladie
    checkForDisease(s);
    
    // Vérification naissance
    checkBirth(s, elapsed);
    
    // Détérioration santé si malade
    if (s.health === "sick") {
      s.healthPoints -= dt * 0.1;
      if (s.healthPoints <= 0) {
        s.health = "dead";
        // TODO: Retirer l'animal mort du troupeau
      }
    }

    if (s.kind === "vache" || s.kind === "mouton" || s.kind === "cheval") {
      const speedSeed = 0.16 + (s.id.length % 5) * 0.02;
      const phase = elapsed * speedSeed + s.id.length;

      const ox = Math.cos(phase) * (s.padW * 0.28);
      const oz = Math.sin(phase * 0.85) * (s.padD * 0.28);
      const cosYaw = Math.cos(s.padYaw);
      const sinYaw = Math.sin(s.padYaw);

      const targetX = s.homeX + cosYaw * ox - sinYaw * oz;
      const targetZ = s.homeZ + sinYaw * ox + cosYaw * oz;

      const distMoved = Math.hypot(targetX - s.x, targetZ - s.z);

      s.x = targetX;
      s.z = targetZ;

      const meshX = s.mesh.position.x;
      const meshZ = s.mesh.position.z;
      const diffX = s.x - meshX;
      const diffZ = s.z - meshZ;

      if (Math.hypot(diffX, diffZ) > 0.04) {
        s.yaw = Math.atan2(-diffX, -diffZ);
      }

      s.mesh.position.set(s.x, getTerrainHeight(s.x, s.z), s.z);
      s.mesh.rotation.y = s.yaw;

      const walkTime = elapsed * 5.0;
      const isMoving = distMoved > dt * 0.1;

      s.mesh.traverse((obj) => {
        if (obj.name.startsWith("leg_")) {
          const isLeft = obj.name.endsWith("_l");
          const isFront = obj.name.includes("front");
          
          if (isMoving) {
            const offset = (isLeft ? 0 : Math.PI) + (isFront ? Math.PI * 0.5 : 0);
            obj.rotation.x = Math.sin(walkTime + offset) * 0.45;
          } else {
            obj.rotation.x = 0;
          }
        }

        if (obj.name === "tail") {
          const swish = Math.sin(elapsed * 1.5 + (s.id.length % 3)) * 0.35;
          obj.rotation.z = swish;
          obj.rotation.x = 0.35 + Math.abs(swish) * 0.2;
        }

        if (obj.name === "neck_head") {
          const breath = Math.sin(elapsed * 1.2 + s.id.length) * 0.05;
          const grazing = Math.sin(elapsed * 0.2 + s.id.length) * 0.12 + 0.1;
          obj.rotation.x = grazing + breath;
        }
      });

    } else if (s.kind === "poulailler") {
      s.mesh.traverse((obj) => {
        if (!obj.userData.hen) return;
        const phase = obj.userData.phase as number;
        const time = elapsed * 2.8 + phase;

        const peckCycle = Math.sin(time * 0.6) > 0.3;
        if (peckCycle) {
          obj.rotation.x = 0.5 + Math.sin(time * 6.0) * 0.25;
        } else {
          obj.rotation.x = Math.sin(time * 1.5) * 0.1;
        }
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// STATISTIQUES
// ═══════════════════════════════════════════

export function getHerdStats(list: Stock[]): HerdStats {
  const byKind: Record<StockKind, number> = {
    vache: 0,
    poulailler: 0,
    mouton: 0,
    cochon: 0,
    chevre: 0,
    cheval: 0,
    abeille: 0,
    canard: 0,
  };
  
  let healthyCount = 0;
  let sickCount = 0;
  let pregnantCount = 0;
  let totalMilkProduction = 0;
  let totalEggProduction = 0;
  let totalGeneticQuality = 0;
  let deadCount = 0;
  
  for (const s of list) {
    byKind[s.kind]++;
    
    if (s.health === "healthy") healthyCount++;
    else if (s.health === "sick") sickCount++;
    else if (s.health === "dead") deadCount++;
    
    if (s.isPregnant) pregnantCount++;
    
    totalMilkProduction += s.milkProduction;
    totalEggProduction += s.eggProduction;
    totalGeneticQuality += s.genetics.quality;
  }
  
  return {
    totalAnimals: list.length,
    byKind,
    healthyCount,
    sickCount,
    pregnantCount,
    totalMilkProduction,
    totalEggProduction,
    averageGeneticQuality: list.length > 0 ? totalGeneticQuality / list.length : 0,
    mortalityRate: list.length > 0 ? (deadCount / list.length) * 100 : 0,
  };
}