/**
 * WeaponShopCatalog.ts
 * Catalogue de l'armurerie/coutellerie du comté : items en vente (armes à feu,
 * couteaux) et mobilier de boutique (comptoir vitré, râteliers muraux, vitrines
 * sécurisées, caisse, coffre-fort, détecteur de métal, caméras, enseigne néon).
 * Chaque item expose createModel() pour l'affichage 3D dans la boutique.
 */
import * as THREE from "three";
import { matLib } from "./materials";

export type WeaponShopCategory = "arme_a_feu" | "couteau";

export interface WeaponShopItem {
  id: string;
  name: string;
  category: WeaponShopCategory;
  price: number;
  desc: string;
  createModel(): THREE.Group;
}

/* ------------------------------------------------------------------ */
/* Matériaux réutilisés                                                */
/* ------------------------------------------------------------------ */

const steelMat = (): THREE.MeshStandardMaterial => matLib.get(0x2a2d30, 0.32, 0.85);
const darkMat = (): THREE.MeshStandardMaterial => matLib.get(0x1c1e22, 0.62, 0.12);
const woodMat = (): THREE.MeshStandardMaterial => matLib.get(0x5a4632, 0.78, 0.06);
const glassMat = (opacity: number, transmission: number): THREE.MeshPhysicalMaterial =>
  new THREE.MeshPhysicalMaterial({
    color: 0x9fd6ff,
    transparent: true,
    opacity,
    roughness: 0.06,
    metalness: 0.1,
    transmission,
  });

const _box = new THREE.Box3();
const _center = new THREE.Vector3();

/** Recentre un groupe sur son centre de gravité (origine = point d'accroche). */
function recenter(g: THREE.Group): void {
  _box.setFromObject(g);
  _box.getCenter(_center);
  for (const child of g.children) {
    child.position.sub(_center);
  }
}

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* Modèles d'armes à feu (canon selon +X, origine centrée)             */
/* ------------------------------------------------------------------ */

interface RifleSpec {
  name: string;
  barrel: number;
  wood: boolean;
  mag: boolean;
  sight: boolean;
  pump?: boolean;
}

function buildRifle(spec: RifleSpec): THREE.Group {
  const g = new THREE.Group();
  g.name = spec.name;
  const steel = steelMat();
  const polymer = darkMat();
  const body = spec.wood ? woodMat() : polymer;

  const rec = mesh(new THREE.BoxGeometry(0.16, 0.065, 0.045), body, -0.02, 0.01, 0);
  g.add(rec);

  const barrel = mesh(
    new THREE.CylinderGeometry(0.014, 0.014, spec.barrel, 10),
    steel,
    0.11 + spec.barrel / 2,
    0.015,
    0,
  );
  barrel.rotation.z = Math.PI / 2;
  g.add(barrel);

  const frontSight = mesh(
    new THREE.BoxGeometry(0.02, 0.055, 0.016),
    steel,
    0.11 + spec.barrel + 0.01,
    0.05,
    0,
  );
  g.add(frontSight);

  const stock = mesh(new THREE.BoxGeometry(0.3, 0.058, 0.042), body, -0.28, -0.005, 0);
  stock.rotation.z = 0.06;
  g.add(stock);

  const grip = mesh(new THREE.BoxGeometry(0.042, 0.12, 0.032), body, -0.045, -0.07, 0);
  grip.rotation.z = 0.24;
  g.add(grip);

  if (spec.mag) {
    const mag = mesh(new THREE.BoxGeometry(0.055, 0.14, 0.036), body, 0.07, -0.085, 0);
    mag.rotation.z = 0.1;
    g.add(mag);
  }
  if (spec.sight) {
    const scope = mesh(new THREE.BoxGeometry(0.13, 0.06, 0.032), steel, 0.05, 0.085, 0);
    g.add(scope);
  }
  if (spec.pump) {
    const pump = mesh(new THREE.BoxGeometry(0.15, 0.048, 0.042), woodMat(), 0.2, -0.04, 0);
    g.add(pump);
  }

  recenter(g);
  return g;
}

function buildPistol(): THREE.Group {
  const g = new THREE.Group();
  g.name = "pistol";
  const steel = steelMat();
  const polymer = darkMat();

  const slide = mesh(new THREE.BoxGeometry(0.18, 0.042, 0.03), steel, 0.02, 0.03, 0);
  g.add(slide);

  const barrel = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8), steel, 0.13, 0.03, 0);
  barrel.rotation.z = Math.PI / 2;
  g.add(barrel);

  const frame = mesh(new THREE.BoxGeometry(0.1, 0.032, 0.032), polymer, -0.05, 0.0, 0);
  g.add(frame);

  const grip = mesh(new THREE.BoxGeometry(0.036, 0.1, 0.028), polymer, -0.03, -0.06, 0);
  grip.rotation.z = 0.14;
  g.add(grip);

  recenter(g);
  return g;
}

/* ------------------------------------------------------------------ */
/* Modèles de couteaux (lame selon +Z, origine centrée)                */
/* ------------------------------------------------------------------ */

function buildKnife(name: string, len: number, black = false): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  const bladeM = black ? matLib.get(0x16181a, 0.35, 0.75) : steelMat();
  const handleM = black ? matLib.get(0x151515, 0.6, 0.15) : woodMat();
  const bolsterM = black ? bladeM : steelMat();

  const bladeLen = len * 0.55;
  const handleLen = len - bladeLen - 0.03;

  const blade = mesh(
    new THREE.BoxGeometry(0.036, 0.012, bladeLen - 0.04),
    bladeM,
    0,
    0.008,
    0.02 + (bladeLen - 0.04) / 2,
  );
  g.add(blade);

  const tip = mesh(
    new THREE.BoxGeometry(0.02, 0.012, 0.04),
    bladeM,
    0,
    0.008,
    0.02 + bladeLen - 0.02,
  );
  g.add(tip);

  const bolster = mesh(new THREE.BoxGeometry(0.052, 0.03, 0.024), bolsterM, 0, 0.004, 0.005);
  g.add(bolster);

  const handle = mesh(
    new THREE.BoxGeometry(0.03, 0.022, handleLen),
    handleM,
    0,
    -0.004,
    -handleLen / 2 - 0.012,
  );
  g.add(handle);

  recenter(g);
  return g;
}

/* ------------------------------------------------------------------ */
/* Catalogue de la boutique                                            */
/* ------------------------------------------------------------------ */

export const WEAPON_SHOP_CATALOG: WeaponShopItem[] = [
  {
    id: "carabine",
    name: "Carabine de chasse",
    category: "arme_a_feu",
    price: 680,
    desc: "À verrou .308, canon 55 cm — chasse à l'orignal.",
    createModel: () =>
      buildRifle({ name: "carabine", barrel: 0.52, wood: true, mag: true, sight: true }),
  },
  {
    id: "shotgun",
    name: "Fusil à pompe",
    category: "arme_a_feu",
    price: 950,
    desc: "Calibre 12, tube lisse — classique du rang.",
    createModel: () =>
      buildRifle({
        name: "shotgun",
        barrel: 0.6,
        wood: true,
        mag: false,
        sight: false,
        pump: true,
      }),
  },
  {
    id: "pistol",
    name: "Pistolet tactique",
    category: "arme_a_feu",
    price: 1290,
    desc: "9 mm, carcasse polymère — restreint (PAL-R).",
    createModel: buildPistol,
  },
  {
    id: "ar15",
    name: "Fusil d'assaut AR-15",
    category: "arme_a_feu",
    price: 2100,
    desc: "5.56 mm NBA, viseur optique — prohibé.",
    createModel: () =>
      buildRifle({ name: "ar15", barrel: 0.48, wood: false, mag: true, sight: true }),
  },
  {
    id: "ak74",
    name: "AK-74",
    category: "arme_a_feu",
    price: 1400,
    desc: "5.45 mm, crosse bois — prohibé.",
    createModel: () =>
      buildRifle({ name: "ak74", barrel: 0.5, wood: true, mag: true, sight: false }),
  },
  {
    id: "couteau_chasse",
    name: "Couteau de chasse",
    category: "couteau",
    price: 55,
    desc: "Lame fixe 14 cm, manche bois.",
    createModel: () => buildKnife("couteau_chasse", 0.26),
  },
  {
    id: "couteau_poche",
    name: "Couteau de poche",
    category: "couteau",
    price: 24,
    desc: "Repliable, lame 9 cm — l'outil du rang.",
    createModel: () => buildKnife("couteau_poche", 0.19),
  },
  {
    id: "couteau_tactique",
    name: "Couteau tactique",
    category: "couteau",
    price: 89,
    desc: "Lame noire, manche texturé.",
    createModel: () => buildKnife("couteau_tactique", 0.23, true),
  },
];

/* ------------------------------------------------------------------ */
/* Mobilier de la boutique (origine à la base de chaque meuble)        */
/* ------------------------------------------------------------------ */

/** Comptoir vitré de vente — plateau utile ≈ 0.96 m de haut. */
export function buildComptoirVitre(len: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "comptoir_vitre";
  const wood = woodMat();

  const plinthe = mesh(
    new THREE.BoxGeometry(len, 0.5, 0.92),
    matLib.get(0x3a3228, 0.8, 0.05),
    0,
    0.25,
    0,
  );
  g.add(plinthe);

  const vitrine = mesh(
    new THREE.BoxGeometry(len - 0.1, 0.4, 0.52),
    glassMat(0.28, 0.6),
    0,
    0.7,
    -0.1,
  );
  g.add(vitrine);

  const tablette = mesh(
    new THREE.BoxGeometry(len - 0.26, 0.016, 0.44),
    matLib.get(0x22201c, 0.7, 0.3),
    0,
    0.72,
    -0.1,
  );
  g.add(tablette);

  const comptoir = mesh(new THREE.BoxGeometry(len, 0.06, 1.0), wood, 0, 0.93, 0);
  g.add(comptoir);

  const bande = mesh(
    new THREE.BoxGeometry(len, 0.05, 0.02),
    matLib.getEmissive(0x8f3628, 0x5f1a10, 0.9),
    0,
    0.82,
    0.461,
  );
  g.add(bande);

  return g;
}

/** Râtelier mural — panneau + crochets alignés sur les points d'accroche des armes. */
export function buildRatelierMural(len: number, slots: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "ratelier_mural";
  const wood = woodMat();
  const steel = steelMat();

  const panneau = mesh(new THREE.BoxGeometry(len, 1.6, 0.06), wood, 0, 0, 0);
  panneau.castShadow = false;
  g.add(panneau);

  const liteauHaut = mesh(
    new THREE.BoxGeometry(len + 0.08, 0.09, 0.08),
    matLib.get(0x3a3228, 0.8, 0.05),
    0,
    0.8,
    0.02,
  );
  g.add(liteauHaut);

  const liteauBas = mesh(
    new THREE.BoxGeometry(len + 0.08, 0.07, 0.08),
    matLib.get(0x3a3228, 0.8, 0.05),
    0,
    -0.8,
    0.02,
  );
  g.add(liteauBas);

  for (let s = 0; s < slots; s++) {
    const y = 0.45 - s * 0.28;
    const crochet = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), steel, 0, y, -0.1);
    crochet.rotation.x = Math.PI / 2;
    g.add(crochet);
    const pointe = mesh(new THREE.SphereGeometry(0.016, 8, 8), steel, 0, y, -0.18);
    g.add(pointe);
  }

  return g;
}

/** Vitrine sécurisée haute (1.5 m) pour les couteaux — panneau vitré + fond sombre. */
export function buildVitrineSecurisee(): THREE.Group {
  const g = new THREE.Group();
  g.name = "vitrine_securisee";
  const steel = steelMat();

  const plinthe = mesh(
    new THREE.BoxGeometry(1.1, 0.2, 0.6),
    matLib.get(0x23201c, 0.7, 0.3),
    0,
    0.1,
    0,
  );
  g.add(plinthe);

  const fond = mesh(
    new THREE.BoxGeometry(1.0, 1.28, 0.03),
    matLib.get(0x141414, 0.55, 0.5),
    0,
    0.85,
    -0.26,
  );
  g.add(fond);

  const vitre = mesh(new THREE.BoxGeometry(0.98, 1.26, 0.5), glassMat(0.22, 0.7), 0, 0.85, 0);
  vitre.castShadow = false;
  g.add(vitre);

  const cadre = mesh(new THREE.BoxGeometry(1.06, 0.07, 0.56), steel, 0, 1.52, 0);
  g.add(cadre);

  const montantG = mesh(new THREE.BoxGeometry(0.04, 1.28, 0.56), steel, -0.5, 0.85, 0);
  g.add(montantG);
  const montantD = montantG.clone();
  montantD.position.x = 0.5;
  g.add(montantD);

  const barre = mesh(
    new THREE.BoxGeometry(1.0, 0.02, 0.02),
    matLib.getEmissive(0x1fbf3a, 0x0f7a20, 0.6),
    0,
    1.46,
    -0.245,
  );
  g.add(barre);

  return g;
}

/** Caisse enregistreuse — corps ≈ 0.3 m, posée sur le comptoir. */
export function buildCaisseEnregistreuse(): THREE.Group {
  const g = new THREE.Group();
  g.name = "caisse_enregistreuse";
  const steel = steelMat();

  const corps = mesh(
    new THREE.BoxGeometry(0.42, 0.12, 0.36),
    matLib.get(0xb8bcc0, 0.5, 0.35),
    0,
    0.07,
    0,
  );
  g.add(corps);

  const tiroir = mesh(
    new THREE.BoxGeometry(0.4, 0.05, 0.06),
    matLib.get(0x8a8a86, 0.6, 0.3),
    0,
    0.045,
    0.17,
  );
  g.add(tiroir);

  const clavier = mesh(
    new THREE.BoxGeometry(0.26, 0.03, 0.2),
    matLib.get(0x1c1e22, 0.62, 0.12),
    0,
    0.15,
    -0.02,
  );
  g.add(clavier);

  const ecran = mesh(
    new THREE.BoxGeometry(0.32, 0.11, 0.03),
    matLib.getEmissive(0x9fd6ff, 0x1f4a6a, 0.7),
    0.02,
    0.22,
    -0.08,
  );
  ecran.rotation.x = 0.3;
  g.add(ecran);

  const bras = mesh(new THREE.BoxGeometry(0.015, 0.06, 0.015), steel, 0.02, 0.18, -0.08);
  g.add(bras);

  return g;
}

/** Coffre-fort de réserve — corps 0.75 m, origine à la base. */
export function buildCoffreFort(): THREE.Group {
  const g = new THREE.Group();
  g.name = "coffre_fort";
  const steel = steelMat();

  const corps = mesh(
    new THREE.BoxGeometry(0.7, 0.75, 0.55),
    matLib.get(0x232428, 0.42, 0.85),
    0,
    0.375,
    0,
  );
  g.add(corps);

  const porte = mesh(
    new THREE.BoxGeometry(0.68, 0.73, 0.07),
    matLib.get(0x3a3d42, 0.4, 0.8),
    0,
    0.375,
    0.28,
  );
  g.add(porte);

  const molette = mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.035, 16),
    matLib.get(0x8a8f96, 0.3, 0.9),
    0,
    0.48,
    0.325,
  );
  molette.rotation.x = Math.PI / 2;
  g.add(molette);

  const poignee = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), steel, 0.16, 0.33, 0.33);
  poignee.rotation.x = Math.PI / 2;
  g.add(poignee);

  const charniereG = mesh(new THREE.BoxGeometry(0.05, 0.1, 0.04), steel, -0.34, 0.52, 0.3);
  g.add(charniereG);
  const charniereD = charniereG.clone();
  charniereD.position.y = 0.2;
  g.add(charniereD);

  return g;
}

/** Détecteur de métal — portique d'entrée, LED verte. */
export function buildDetecteurMetal(): THREE.Group {
  const g = new THREE.Group();
  g.name = "detecteur_metal";
  const steel = steelMat();
  const led = matLib.getEmissive(0x1fbf3a, 0x0f7a20, 0.8);

  const plaque = mesh(
    new THREE.BoxGeometry(1.4, 0.05, 0.35),
    matLib.get(0x232428, 0.5, 0.7),
    0,
    0.025,
    0,
  );
  g.add(plaque);

  const pilierG = mesh(new THREE.BoxGeometry(0.12, 1.9, 0.1), steel, -0.5, 0.95, 0);
  g.add(pilierG);
  const pilierD = pilierG.clone();
  pilierD.position.x = 0.5;
  g.add(pilierD);

  const traverse = mesh(new THREE.BoxGeometry(1.12, 0.14, 0.12), steel, 0, 1.9, 0);
  g.add(traverse);

  for (const px of [-0.44, 0.44]) {
    for (const py of [0.6, 1.1, 1.6]) {
      const del = mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), led, px, py, 0.052);
      del.castShadow = false;
      g.add(del);
    }
  }

  const voyant = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), led, 0, 1.86, 0.065);
  voyant.castShadow = false;
  g.add(voyant);

  return g;
}

/** Caméra de sécurité dôme — point de montage à l'origine (plafond). */
export function buildCameraSecurite(): THREE.Group {
  const g = new THREE.Group();
  g.name = "camera_securite";
  const steel = steelMat();

  const base = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.045, 10), steel, 0, 0.02, 0);
  g.add(base);

  const dome = mesh(
    new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    matLib.get(0x14161a, 0.4, 0.7),
    0,
    0,
    0,
  );
  dome.castShadow = false;
  g.add(dome);

  const led = mesh(
    new THREE.BoxGeometry(0.018, 0.018, 0.018),
    matLib.getEmissive(0xbf1f1f, 0x7a0f0f, 0.9),
    0,
    -0.035,
    0.06,
  );
  led.castShadow = false;
  g.add(led);

  return g;
}

/** Enseigne néon « ARMURERIE · COUTELLERIE » — CanvasTexture émissive. */
export function buildEnseigneArmurerie(): THREE.Group {
  const g = new THREE.Group();
  g.name = "enseigne_armurerie";

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#14141c";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = "#d8a15a";
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.fillStyle = "#f4c98a";
  ctx.font = "bold 112px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ARMURERIE", 512, 100);
  ctx.fillStyle = "#c8d2d8";
  ctx.font = "600 44px sans-serif";
  ctx.fillText("COUTELLERIE", 512, 190);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.5,
    metalness: 0.15,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: tex,
    emissiveIntensity: 0.55,
  });

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.7, 0.09), mat);
  plaque.castShadow = false;
  g.add(plaque);

  const laserL = mesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.06),
    matLib.getEmissive(0xd8a15a, 0x8a5a1a, 0.8),
    -1.44,
    -0.36,
    -0.04,
  );
  laserL.castShadow = false;
  g.add(laserL);
  const laserR = laserL.clone();
  laserR.position.x = 1.44;
  g.add(laserR);

  return g;
}
