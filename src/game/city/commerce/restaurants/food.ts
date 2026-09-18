/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🍔 ALIMENTS, PLATS TRADITIONNELS & CASSE-CROÛTE 3D (v3.0)
 * Fichier: src/game/food.ts
 * Architecture : Zero-GC procedural builders, unifiés via geometries.ts.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { getGeo } from "./geometries";
import { matLib } from "./materials";
import { makeRng } from "./rng";

export type FoodCategory =
  | "plat-quebecois"
  | "fruit"
  | "legume"
  | "boulangerie"
  | "boisson"
  | "collation"
  | "fast-food"
  | "dessert";

export type FoodId =
  | "poutine"
  | "tourtiere"
  | "pouding_chomeur"
  | "cretons"
  | "soupe_pois"
  | "pate_chinois"
  | "viande_fumee"
  | "bagel"
  | "fromage_grains"
  | "sirop"
  | "tarte_sucre"
  | "pomme"
  | "banane"
  | "orange"
  | "carotte"
  | "patate"
  | "pain"
  | "croissant"
  | "cafe"
  | "biere"
  | "eau"
  | "jus_orange"
  | "hotdog"
  | "pizza"
  | "chips"
  | "barre_chocolat"
  | "beigne"
  | "burger"
  | "cola";

export interface FoodDef {
  id: FoodId;
  name: string;
  category: FoodCategory;
  hungerRestore: number;
  thirstRestore: number;
  price: number;
  perishable: boolean;
  description: string;
  build: (seed?: number) => THREE.Group;
}

// --- PALETTE DE COULEURS ALIMENTAIRES ---
const C = {
  frite: 0xe8b64a,
  fromage: 0xf5edc8,
  sauce: 0x5a3418,
  pate: 0xc98a3f,
  viande: 0x6b4632,
  pain: 0xd9a85c,
  mie: 0xeddcb0,
  sirop: 0xa5622a,
  vert: 0x5c8a3a,
  pomme: 0xc22e2e,
  banane: 0xecd23a,
  orange: 0xe87a1e,
  carotte: 0xe2661c,
  patate: 0xc9a874,
  tige: 0x3f6b2a,
  ceram: 0xf4f2ec,
  cafe: 0x3a2213,
  biere: 0xe8b830,
  jus: 0xf5960f,
  metal: 0xc7cbd1,
  choco: 0x3a2113,
  sac: 0xd8342a,
  moutarde: 0xc9a316,
  saucisse: 0xa8402a,
  pepperoni: 0x8a2a1a,
  glace: 0xe89ac4,
  mousse: 0xf5f0e0,
  bouchon: 0x2a5fa8,
  ansesirop: 0x9a4a1a,
  sesame: 0x2a1a0a,
  rainure: 0x1a0e08,
} as const;

// Singletons statiques réutilisables (ZÉRO allocation pendant l'instanciation)
const dummy = new THREE.Object3D();

// --- CACHE DE GÉOMÉTRIES SPÉCIFIQUES ---
let cachedBananaGeo: THREE.TubeGeometry | null = null;
let cachedBowlGeo: THREE.SphereGeometry | null = null;
let cachedCroissantGeo: THREE.TorusGeometry | null = null;

function getBananaGeometry(): THREE.BufferGeometry {
  if (cachedBananaGeo) return cachedBananaGeo;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector3(t * 0.13, Math.sin(t * Math.PI) * 0.04, 0));
  }
  cachedBananaGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.017, 8, false);
  return cachedBananaGeo;
}

function getBowlGeometry(): THREE.BufferGeometry {
  if (cachedBowlGeo) return cachedBowlGeo;
  // Bol creux pour la soupe aux pois
  cachedBowlGeo = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2);
  return cachedBowlGeo;
}

function getCroissantGeometry(): THREE.BufferGeometry {
  if (cachedCroissantGeo) return cachedCroissantGeo;
  cachedCroissantGeo = new THREE.TorusGeometry(0.05, 0.022, 8, 14, Math.PI * 1.4);
  return cachedCroissantGeo;
}

// --- HELPERS DE CONSTRUCTION ---

function m(color: number, rough = 0.7, metal = 0): THREE.Material {
  return matLib.get(color, rough, metal);
}

function addMesh(
  g: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

/** Dispersion performante de sous-composants (frites, fromage, pepperoni) sans allocation Object3D */
function instancedScatter(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  count: number,
  radius: number,
  rng: () => number,
  y: number,
  yJit: number,
  rot = true
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng() * radius;
    
    dummy.position.set(Math.cos(a) * r, y + rng() * yJit, Math.sin(a) * r);
    dummy.rotation.set(
      rot ? (rng() - 0.5) * 0.7 : 0,
      rng() * Math.PI * 2,
      rot ? (rng() - 0.5) * 0.7 : 0
    );
    dummy.scale.setScalar(0.85 + rng() * 0.3);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  // Nettoyage de l'état du dummy
  dummy.position.set(0, 0, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(1, 1, 1);

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// --- BUILDERS PHARE DE LA GASTRONOMIE QUEBECOISE ---

function buildPoutine(seed = 1): THREE.Group {
  const rng = makeRng(seed + 11);
  const g = new THREE.Group();
  g.name = "food-poutine";

  // Bol en porcelaine blanche
  addMesh(g, getGeo("cylinder", { r: 0.11, r2: 0.09, h: 0.05, seg: 12 }), m(C.ceram, 0.28), 0, 0.025, 0);
  
  // Frites croustillantes dispersées
  g.add(instancedScatter(getGeo("box", { w: 0.012, h: 0.05, d: 0.012 }), m(C.frite, 0.72), 10, 0.075, rng, 0.05, 0.03));
  
  // Fromage en grains skouik-skouik
  g.add(instancedScatter(getGeo("sphere", { r: 0.014, seg: 6, segH: 5 }), m(C.fromage, 0.55), 8, 0.07, rng, 0.065, 0.02, false));
  
  // Sauce brune brillante versée par-dessus
  const sauce = new THREE.Mesh(getGeo("sphere", { r: 0.09, seg: 10, segH: 6 }), m(C.sauce, 0.32, 0.08));
  sauce.scale.set(1, 0.18, 1);
  sauce.position.y = 0.075;
  sauce.castShadow = true;
  sauce.receiveShadow = true;
  g.add(sauce);

  return g;
}

function buildTourtiere(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-tourtiere";

  // Assiette d'aluminium (métallique brillante)
  addMesh(g, getGeo("cylinder", { r: 0.13, r2: 0.12, h: 0.045, seg: 16 }), m(C.metal, 0.35, 0.82), 0, 0.022, 0);
  // Croûte dorée
  addMesh(g, getGeo("cylinder", { r: 0.12, r2: 0.12, h: 0.06, seg: 16 }), m(C.pate, 0.75), 0, 0.05, 0);
  
  // Motifs de bandelettes croisées sur le dessus
  const stripGeo = getGeo("box", { w: 0.24, h: 0.01, d: 0.014 });
  const stripMat = m(C.pate, 0.75);
  for (let i = 0; i < 6; i++) {
    addMesh(g, stripGeo, stripMat, 0, 0.082, 0, 0, (i / 6) * Math.PI, 0);
  }
  return g;
}

function buildPoudingChomeur(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-pouding-chomeur";

  addMesh(g, getGeo("cylinder", { r: 0.075, r2: 0.065, h: 0.06, seg: 12 }), m(C.ceram, 0.28), 0, 0.03, 0);
  addMesh(g, getGeo("cylinder", { r: 0.065, r2: 0.06, h: 0.045, seg: 12 }), m(C.pain, 0.8), 0, 0.08, 0);
  addMesh(g, getGeo("cylinder", { r: 0.068, r2: 0.068, h: 0.012, seg: 12 }), m(C.sirop, 0.26, 0.12), 0, 0.106, 0);
  return g;
}

function buildCretons(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-cretons";

  addMesh(g, getGeo("cylinder", { r: 0.055, r2: 0.05, h: 0.045, seg: 12 }), m(C.ceram, 0.28), 0, 0.022, 0);
  addMesh(g, getGeo("cylinder", { r: 0.045, r2: 0.045, h: 0.03, seg: 12 }), m(C.viande, 0.62), 0, 0.047, 0);
  return g;
}

function buildSoupePois(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-soupe-pois";

  // Utilisation sécurisée du cache de bol (Bowl)
  const bol = new THREE.Mesh(getBowlGeometry(), m(C.ceram, 0.28));
  bol.castShadow = true;
  bol.receiveShadow = true;
  g.add(bol);

  addMesh(g, getGeo("cylinder", { r: 0.088, r2: 0.06, h: 0.02, seg: 12 }), m(C.vert, 0.6), 0, 0.045, 0);
  return g;
}

function buildPateChinois(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-pate-chinois";

  addMesh(g, getGeo("box", { w: 0.22, h: 0.03, d: 0.15 }), m(C.ceram, 0.28), 0, 0.015, 0);
  addMesh(g, getGeo("box", { w: 0.19, h: 0.02, d: 0.12 }), m(C.viande, 0.62), 0, 0.04, 0);
  addMesh(g, getGeo("box", { w: 0.19, h: 0.015, d: 0.12 }), m(C.banane, 0.55), 0, 0.055, 0);
  addMesh(g, getGeo("box", { w: 0.19, h: 0.025, d: 0.12 }), m(C.patate, 0.85), 0, 0.075, 0);
  return g;
}

function buildSandwichViandeFumee(seed = 3): THREE.Group {
  const rng = makeRng(seed + 21);
  const g = new THREE.Group();
  g.name = "food-viande-fumee";

  addMesh(g, getGeo("box", { w: 0.11, h: 0.018, d: 0.09 }), m(C.pain, 0.8), 0, 0.009, 0);
  const meatGeo = getGeo("box", { w: 0.1, h: 0.01, d: 0.085 });
  const meatMat = m(C.viande, 0.6);
  for (let i = 0; i < 5; i++) {
    addMesh(g, meatGeo, meatMat, 0, 0.02 + i * 0.011, 0, 0, (rng() - 0.5) * 0.15, 0);
  }
  addMesh(g, getGeo("box", { w: 0.1, h: 0.004, d: 0.085 }), m(C.moutarde, 0.42), 0, 0.077, 0);
  addMesh(g, getGeo("box", { w: 0.11, h: 0.018, d: 0.09 }), m(C.pain, 0.8), 0, 0.088, 0);
  return g;
}

function buildBagelMontreal(seed = 4): THREE.Group {
  const rng = makeRng(seed + 31);
  const g = new THREE.Group();
  g.name = "food-bagel";

  addMesh(g, getGeo("torus", { r: 0.05, tube: 0.028, seg: 18 }), m(C.pain, 0.8), 0, 0, 0, Math.PI / 2, 0, 0);
  g.add(instancedScatter(getGeo("sphere", { r: 0.003, seg: 4, segH: 3 }), m(C.sesame, 0.65), 14, 0.075, rng, 0.026, 0, false));
  return g;
}

function buildFromageEnGrains(seed = 5): THREE.Group {
  const rng = makeRng(seed + 41);
  const g = new THREE.Group();
  g.name = "food-fromage-grains";

  addMesh(g, getGeo("box", { w: 0.12, h: 0.16, d: 0.03 }), m(C.sac, 0.32, 0.18), 0, 0, 0);
  g.add(instancedScatter(getGeo("sphere", { r: 0.014, seg: 6, segH: 5 }), m(C.fromage, 0.55), 8, 0.04, rng, 0.03, 0.04, false));
  return g;
}

function buildSiropErable(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-sirop-erable";

  addMesh(g, getGeo("cone", { r: 0.04, h: 0.11, seg: 10 }), m(C.metal, 0.35, 0.82), 0, 0.055, 0);
  addMesh(g, getGeo("cylinder", { r: 0.04, r2: 0.04, h: 0.02, seg: 10 }), m(C.metal, 0.35, 0.82), 0, 0.01, 0);
  addMesh(g, getGeo("torus", { r: 0.018, tube: 0.004, seg: 10 }), m(C.ansesirop, 0.4, 0.55), 0, 0.09, 0.038, 0, 0, Math.PI / 2);
  addMesh(g, getGeo("cylinder", { r: 0.008, r2: 0.01, h: 0.02, seg: 8 }), m(C.ansesirop, 0.42), 0, 0.12, 0);
  return g;
}

function buildTarteSucre(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-tarte-sucre";

  addMesh(g, getGeo("cylinder", { r: 0.11, r2: 0.1, h: 0.025, seg: 16 }), m(C.pate, 0.75), 0, 0.012, 0);
  addMesh(g, getGeo("cylinder", { r: 0.1, r2: 0.1, h: 0.018, seg: 16 }), m(C.sirop, 0.26, 0.12), 0, 0.033, 0);
  return g;
}

function buildFruitSphere(color: number, radius: number, seed = 6): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-fruit-sphere";

  addMesh(g, getGeo("sphere", { r: radius, seg: 12, segH: 10 }), m(color, 0.38), 0, radius, 0);
  addMesh(g, getGeo("cylinder", { r: 0.004, r2: 0.005, h: 0.03, seg: 6 }), m(C.tige, 0.72), 0, radius * 2, 0);
  g.userData.seed = seed;
  return g;
}

function buildBanane(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-banane";

  const bMesh = new THREE.Mesh(getBananaGeometry(), m(C.banane, 0.5));
  bMesh.castShadow = true;
  bMesh.receiveShadow = true;
  g.add(bMesh);
  return g;
}

function buildCarotte(seed = 7): THREE.Group {
  const rng = makeRng(seed + 51);
  const g = new THREE.Group();
  g.name = "food-carotte";

  addMesh(g, getGeo("cone", { r: 0.022, h: 0.14, seg: 8 }), m(C.carotte, 0.55), 0, 0.022, 0, Math.PI / 2, 0, 0);
  const stemGeo = getGeo("cone", { r: 0.006, h: 0.06, seg: 4 });
  const stemMat = m(C.tige, 0.7);

  for (let i = 0; i < 4; i++) {
    addMesh(
      g,
      stemGeo,
      stemMat,
      (rng() - 0.5) * 0.02,
      0.03 + rng() * 0.02,
      (rng() - 0.5) * 0.02,
      0,
      0,
      (rng() - 0.5) * 0.6
    );
  }
  return g;
}

function buildPatate(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-patate";

  const corps = new THREE.Mesh(getGeo("sphere", { r: 0.05, seg: 8, segH: 7 }), m(C.patate, 0.85));
  corps.scale.set(1.3, 0.85, 1.05);
  corps.position.y = 0.042;
  corps.castShadow = true;
  corps.receiveShadow = true;
  g.add(corps);
  return g;
}

function buildPainBaguette(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-baguette";

  addMesh(g, getGeo("capsule", { r: 0.022, h: 0.42, seg: 8 }), m(C.pain, 0.8), 0, 0.022, 0, 0, 0, Math.PI / 2);
  const notchGeo = getGeo("box", { w: 0.06, h: 0.004, d: 0.008 });
  const notchMat = m(0x8a5a26, 0.7);

  for (let i = 0; i < 5; i++) {
    addMesh(g, notchGeo, notchMat, -0.15 + i * 0.08, 0.035, 0, 0, 0.5, 0);
  }
  return g;
}

function buildCroissant(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-croissant";

  const mesh = new THREE.Mesh(getCroissantGeometry(), m(C.pain, 0.8));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = 0.022;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}

function buildCafeFiltre(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-cafe";

  addMesh(g, getGeo("cylinder", { r: 0.038, r2: 0.03, h: 0.075, seg: 12 }), m(C.ceram, 0.28), 0, 0.0375, 0);
  addMesh(g, getGeo("cylinder", { r: 0.034, r2: 0.034, h: 0.008, seg: 12 }), m(C.cafe, 0.22, 0.08), 0, 0.072, 0);
  addMesh(g, getGeo("torus", { r: 0.022, tube: 0.006, seg: 12 }), m(C.ceram, 0.28), 0.036, 0.04, 0, 0, Math.PI / 2, 0);
  return g;
}

function buildBiereBlonde(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-biere";

  addMesh(g, getGeo("cylinder", { r: 0.028, r2: 0.024, h: 0.11, seg: 12 }), matLib.glass("biere-verre", 0xdfeef2, 0.38), 0, 0.055, 0);
  addMesh(g, getGeo("cylinder", { r: 0.026, r2: 0.023, h: 0.08, seg: 12 }), m(C.biere, 0.22), 0, 0.045, 0);
  addMesh(g, getGeo("cylinder", { r: 0.027, r2: 0.027, h: 0.018, seg: 12 }), m(C.mousse, 0.9), 0, 0.095, 0);
  return g;
}

function buildBouteilleEau(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-bouteille-eau";

  const glass = matLib.glass("eau-plastique", 0xdfeef2, 0.42);
  addMesh(g, getGeo("cylinder", { r: 0.022, r2: 0.024, h: 0.16, seg: 10 }), glass, 0, 0.08, 0);
  addMesh(g, getGeo("cylinder", { r: 0.011, r2: 0.016, h: 0.03, seg: 8 }), glass, 0, 0.175, 0);
  addMesh(g, getGeo("cylinder", { r: 0.012, r2: 0.012, h: 0.016, seg: 8 }), m(C.bouchon, 0.42), 0, 0.198, 0);
  return g;
}

function buildJusOrange(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-jus-orange";

  addMesh(g, getGeo("box", { w: 0.055, h: 0.13, d: 0.035 }), m(C.jus, 0.6), 0, 0.065, 0);
  addMesh(g, getGeo("cone", { r: 0.04, h: 0.03, seg: 4 }), m(C.jus, 0.6), 0, 0.145, 0, 0, Math.PI / 4, 0);
  return g;
}

function buildHotDogSteame(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-hotdog";

  addMesh(g, getGeo("capsule", { r: 0.02, h: 0.13, seg: 8 }), m(C.pain, 0.8), 0, 0.018, 0, 0, 0, Math.PI / 2);
  addMesh(g, getGeo("capsule", { r: 0.015, h: 0.14, seg: 8 }), m(C.saucisse, 0.45), 0, 0.03, 0, 0, 0, Math.PI / 2);
  addMesh(g, getGeo("torus", { r: 0.014, tube: 0.003, seg: 16 }), m(C.moutarde, 0.42), 0, 0.04, 0, Math.PI / 2, 0, 0);
  return g;
}

function buildPointePizza(seed = 8): THREE.Group {
  const rng = makeRng(seed + 61);
  const g = new THREE.Group();
  g.name = "food-pizza";

  addMesh(g, getGeo("cone", { r: 0.11, h: 0.02, seg: 3 }), m(C.pain, 0.8), 0, 0.01, 0, Math.PI / 2, 0, 0);
  addMesh(g, getGeo("cone", { r: 0.095, h: 0.012, seg: 3 }), m(0xf0c94a, 0.42), 0, 0.022, 0, Math.PI / 2, 0, 0);
  g.add(instancedScatter(getGeo("cylinder", { r: 0.012, r2: 0.012, h: 0.006, seg: 8 }), m(C.pepperoni, 0.5), 6, 0.055, rng, 0.03, 0, false));
  return g;
}

function buildSacChips(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-chips";

  addMesh(g, getGeo("box", { w: 0.1, h: 0.15, d: 0.045 }), m(C.sac, 0.32, 0.18), 0, 0.075, 0);
  addMesh(g, getGeo("box", { w: 0.1, h: 0.02, d: 0.01 }), m(0x8a1a12, 0.42), 0, 0.155, 0);
  return g;
}

function buildBarreChocolat(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-barre-chocolat";

  addMesh(g, getGeo("box", { w: 0.12, h: 0.02, d: 0.045 }), m(C.choco, 0.38, 0.08), 0, 0.01, 0);
  const grooveGeo = getGeo("box", { w: 0.002, h: 0.021, d: 0.045 });
  const grooveMat = m(C.rainure, 0.9);

  for (let i = 1; i < 4; i++) {
    addMesh(g, grooveGeo, grooveMat, -0.06 + i * 0.03, 0.01, 0);
  }
  return g;
}

function buildBeigne(seed = 9): THREE.Group {
  const rng = makeRng(seed + 71);
  const g = new THREE.Group();
  g.name = "food-beigne";

  addMesh(g, getGeo("torus", { r: 0.045, tube: 0.024, seg: 16 }), m(C.glace, 0.38), 0, 0.024, 0, Math.PI / 2, 0, 0);
  g.add(instancedScatter(getGeo("capsule", { r: 0.002, h: 0.006, seg: 4 }), m(0xf0c94a, 0.45), 8, 0.05, rng, 0.036, 0));
  return g;
}

function buildBurger(seed = 10): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-burger";

  addMesh(g, getGeo("cylinder", { r: 0.055, r2: 0.055, h: 0.018, seg: 12 }), m(C.pain, 0.8), 0, 0.01, 0);
  addMesh(g, getGeo("cylinder", { r: 0.052, r2: 0.052, h: 0.016, seg: 10 }), m(C.viande, 0.55), 0, 0.026, 0);
  addMesh(g, getGeo("cylinder", { r: 0.05, r2: 0.05, h: 0.006, seg: 10 }), m(C.vert, 0.7), 0, 0.036, 0);
  addMesh(g, getGeo("cylinder", { r: 0.055, r2: 0.048, h: 0.022, seg: 12 }), m(C.pain, 0.8), 0, 0.05, 0);
  g.userData.seed = seed;
  return g;
}

function buildCola(): THREE.Group {
  const g = new THREE.Group();
  g.name = "food-cola";

  addMesh(g, getGeo("cylinder", { r: 0.028, r2: 0.028, h: 0.11, seg: 12 }), m(C.metal, 0.32, 0.82), 0, 0.055, 0);
  addMesh(g, getGeo("cylinder", { r: 0.026, r2: 0.022, h: 0.02, seg: 10 }), m(0xc03028, 0.45), 0, 0.118, 0);
  return g;
}

// ─── CATALOGUE GLOBAL DES ALIMENTS ───

export const FOODS: Record<FoodId, FoodDef> = {
  poutine: { id: "poutine", name: "Poutine", category: "plat-quebecois", hungerRestore: 55, thirstRestore: 0, price: 9, perishable: true, description: "Frites, fromage en grains et sauce brune.", build: buildPoutine },
  tourtiere: { id: "tourtiere", name: "Tourtière", category: "plat-quebecois", hungerRestore: 60, thirstRestore: 0, price: 12, perishable: true, description: "Pâté à la viande du temps des fêtes.", build: buildTourtiere },
  pouding_chomeur: { id: "pouding_chomeur", name: "Pouding chômeur", category: "dessert", hungerRestore: 25, thirstRestore: 0, price: 6, perishable: true, description: "Gâteau noyé dans le sirop d'érable.", build: buildPoudingChomeur },
  cretons: { id: "cretons", name: "Crétons", category: "plat-quebecois", hungerRestore: 20, thirstRestore: 0, price: 4, perishable: true, description: "Pâté de porc épicé du déjeuner.", build: buildCretons },
  soupe_pois: { id: "soupe_pois", name: "Soupe aux pois", category: "plat-quebecois", hungerRestore: 30, thirstRestore: 10, price: 7, perishable: true, description: "Pois jaunes et lard salé.", build: buildSoupePois },
  pate_chinois: { id: "pate_chinois", name: "Pâté chinois", category: "plat-quebecois", hungerRestore: 50, thirstRestore: 0, price: 10, perishable: true, description: "Bœuf, blé d'Inde, patates — trois étages.", build: buildPateChinois },
  viande_fumee: { id: "viande_fumee", name: "Sandwich viande fumée", category: "fast-food", hungerRestore: 45, thirstRestore: 0, price: 11, perishable: true, description: "Empilé haut, moutarde forte.", build: buildSandwichViandeFumee },
  bagel: { id: "bagel", name: "Bagel de Montréal", category: "boulangerie", hungerRestore: 25, thirstRestore: 0, price: 2, perishable: true, description: "Four à bois, graines de sésame.", build: buildBagelMontreal },
  fromage_grains: { id: "fromage_grains", name: "Fromage en grains", category: "collation", hungerRestore: 15, thirstRestore: 0, price: 6, perishable: true, description: "Frais du jour, doit couiner.", build: buildFromageEnGrains },
  sirop: { id: "sirop", name: "Sirop d'érable", category: "collation", hungerRestore: 10, thirstRestore: 0, price: 15, perishable: false, description: "Canne ambrée, goût riche.", build: buildSiropErable },
  tarte_sucre: { id: "tarte_sucre", name: "Tarte au sucre", category: "dessert", hungerRestore: 30, thirstRestore: 0, price: 8, perishable: true, description: "Cassonade et crème.", build: buildTarteSucre },
  pomme: { id: "pomme", name: "Pomme", category: "fruit", hungerRestore: 12, thirstRestore: 8, price: 1, perishable: true, description: "Variété locale, croquante.", build: (seed) => buildFruitSphere(C.pomme, 0.045, seed) },
  banane: { id: "banane", name: "Banane", category: "fruit", hungerRestore: 14, thirstRestore: 5, price: 1, perishable: true, description: "Bonne source de potassium.", build: buildBanane },
  orange: { id: "orange", name: "Orange", category: "fruit", hungerRestore: 12, thirstRestore: 12, price: 1, perishable: true, description: "Juteuse, vitamine C.", build: (seed) => buildFruitSphere(C.orange, 0.048, seed) },
  carotte: { id: "carotte", name: "Carotte", category: "legume", hungerRestore: 8, thirstRestore: 3, price: 1, perishable: true, description: "Croquante, avec fanes.", build: buildCarotte },
  patate: { id: "patate", name: "Patate", category: "legume", hungerRestore: 18, thirstRestore: 0, price: 1, perishable: true, description: "Base de bien des plats d'ici.", build: buildPatate },
  pain: { id: "pain", name: "Baguette", category: "boulangerie", hungerRestore: 20, thirstRestore: 0, price: 3, perishable: true, description: "Croûte craquante, mie aérée.", build: buildPainBaguette },
  croissant: { id: "croissant", name: "Croissant", category: "boulangerie", hungerRestore: 18, thirstRestore: 0, price: 3, perishable: true, description: "Pur beurre, feuilleté.", build: buildCroissant },
  cafe: { id: "cafe", name: "Café filtre", category: "boisson", hungerRestore: 0, thirstRestore: 20, price: 2, perishable: true, description: "Simple, chaud, essentiel.", build: buildCafeFiltre },
  biere: { id: "biere", name: "Bière blonde", category: "boisson", hungerRestore: 5, thirstRestore: 25, price: 8, perishable: true, description: "Microbrasserie locale.", build: buildBiereBlonde },
  eau: { id: "eau", name: "Bouteille d'eau", category: "boisson", hungerRestore: 0, thirstRestore: 35, price: 2, perishable: false, description: "Format 500 ml.", build: buildBouteilleEau },
  jus_orange: { id: "jus_orange", name: "Jus d'orange", category: "boisson", hungerRestore: 5, thirstRestore: 22, price: 3, perishable: true, description: "Carton individuel.", build: buildJusOrange },
  hotdog: { id: "hotdog", name: "Hot-dog steamé", category: "fast-food", hungerRestore: 28, thirstRestore: 0, price: 4, perishable: true, description: "Vapeur, moutarde, casse-croûte.", build: buildHotDogSteame },
  pizza: { id: "pizza", name: "Pointe de pizza", category: "fast-food", hungerRestore: 32, thirstRestore: 0, price: 5, perishable: true, description: "Croûte mince, pepperoni.", build: buildPointePizza },
  chips: { id: "chips", name: "Sac de chips", category: "collation", hungerRestore: 18, thirstRestore: 0, price: 3, perishable: false, description: "Ketchup, croustillant.", build: buildSacChips },
  barre_chocolat: { id: "barre_chocolat", name: "Barre de chocolat", category: "collation", hungerRestore: 15, thirstRestore: 0, price: 2, perishable: false, description: "Énergie rapide, dépanneur.", build: buildBarreChocolat },
  beigne: { id: "beigne", name: "Beigne glacé", category: "dessert", hungerRestore: 20, thirstRestore: 0, price: 2, perishable: true, description: "Glaçage rose, café du coin.", build: buildBeigne },
  burger: { id: "burger", name: "Burger au bacon", category: "fast-food", hungerRestore: 42, thirstRestore: 0, price: 14, perishable: true, description: "Chez Ti-Guy, pain brioché.", build: buildBurger },
  cola: { id: "cola", name: "Cola érable", category: "boisson", hungerRestore: 4, thirstRestore: 22, price: 2.5, perishable: true, description: "Canette froide du frigo.", build: buildCola },
};

export const FOOD_IDS = Object.keys(FOODS) as FoodId[];

export function isFoodId(id: string): id is FoodId {
  return id in FOODS;
}

export function getFoodsByCategory(cat: FoodCategory): FoodDef[] {
  return FOOD_IDS.map((id) => FOODS[id]).filter((f) => f.category === cat);
}

export function getConsumptionEffect(id: string): { hunger: number; thirst: number } | null {
  if (!isFoodId(id)) return null;
  const def = FOODS[id];
  return { hunger: def.hungerRestore, thirst: def.thirstRestore };
}

export function spawnFood(id: FoodId, position: THREE.Vector3, scale = 1, seed = 1): THREE.Group {
  const group = FOODS[id].build(seed);
  group.position.copy(position);
  group.scale.setScalar(scale);
  group.name = `food:${id}`;
  group.userData.foodId = id;
  return group;
}

export function spawnShopFood(id: string, position: THREE.Vector3, scale = 1, seed = 1): THREE.Group | null {
  if (!isFoodId(id)) return null;
  return spawnFood(id, position, scale, seed);
}

export function buildFoodDisplay(ids: FoodId[], cols: number, spacing = 0.18): THREE.Group {
  const container = new THREE.Group();
  container.name = "food-display";
  ids.forEach((id, i) => {
    const x = (i % cols) * spacing;
    const z = Math.floor(i / cols) * spacing;
    container.add(spawnFood(id, new THREE.Vector3(x, 0, z), 1, i + 1));
  });
  return container;
}

export const SHELF_FOOD: Array<{ id: FoodId; x: number; y: number; z: number; scale?: number; rot?: number }> = [
  { id: "chips", x: -2.2, y: 1.18, z: 1.72, scale: 1.7 },
  { id: "pain", x: -0.4, y: 1.16, z: 1.72, scale: 1.15, rot: 0.4 },
  { id: "patate", x: 1.4, y: 1.16, z: 1.72, scale: 1.6 },
  { id: "pomme", x: 2.4, y: 1.16, z: 1.72, scale: 1.5 },
  { id: "croissant", x: 0.5, y: 1.16, z: 1.72, scale: 1.5 },
  { id: "sirop", x: 0.8, y: 0.72, z: 1.72, scale: 1.35 },
  { id: "barre_chocolat", x: -1.3, y: 0.72, z: 1.72, scale: 1.6 },
  { id: "biere", x: -1.1, y: 1.22, z: -4.38, scale: 1.35 },
  { id: "cola", x: -4.9, y: 1.18, z: -0.15, scale: 1.4 },
  { id: "eau", x: -4.9, y: 1.18, z: 0.55, scale: 1.15 },
  { id: "jus_orange", x: -4.4, y: 1.18, z: -1.0, scale: 1.2 },
  { id: "cafe", x: 5.15, y: 1.52, z: -1.15, scale: 1.2 },
  { id: "hotdog", x: 3.85, y: 1.28, z: -3.05, scale: 1.35 },
  { id: "beigne", x: 5.15, y: 1.48, z: -0.2, scale: 1.4 },
];