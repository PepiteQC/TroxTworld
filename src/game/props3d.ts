/**
 * Meubles et mobilier de rue — meshes PBR, pas des boîtes nues.
 * Branché au catalogue (buildFromMeta) et au comté (street.ts).
 */
import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { tex } from "./textures";
import { chandelier as lobbyChandelier, kingBed, loungeChair } from "./luxury";

const GOLD = 0xd4a853;
const STEEL = 0x8a9098;
const CHROME = 0xc8ccd0;
const SQ_GREEN = 0x1a4a32;

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  shadow = true,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}

export function buildArmchair(): THREE.Group {
  return loungeChair(0, 0, 0);
}

export function buildBed(kind: "bed" | "beds" | "hotelbed" = "bed"): THREE.Group {
  const g = kingBed(0, 0);
  if (kind === "beds") g.scale.set(0.62, 0.92, 0.95);
  if (kind === "hotelbed") g.scale.set(1.05, 1, 1.08);
  g.userData.sit = true;
  return g;
}

export function buildDiningTable(): THREE.Group {
  const g = new THREE.Group();
  g.name = "dintbl";
  const wood = tex.mat("noyer", 1.8, 1, 0.38, 0.12);
  g.add(mesh(getGeo("box", { w: 1.85, h: 0.06, d: 0.92 }), wood, 0, 0.76, 0));
  for (const [sx, sz] of [
    [-0.78, -0.34],
    [0.78, -0.34],
    [-0.78, 0.34],
    [0.78, 0.34],
  ] as Array<[number, number]>) {
    g.add(mesh(getGeo("cylinder", { r: 0.028, r2: 0.032, h: 0.74, seg: 8 }), matLib.get(GOLD, 0.22, 0.78), sx, 0.37, sz));
  }
  return g;
}

export function buildCoffeeTable(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ctbl";
  g.add(mesh(getGeo("box", { w: 1.18, h: 0.05, d: 0.68 }), tex.mat("noyer", 1.2, 0.7, 0.32, 0.14), 0, 0.38, 0));
  g.add(mesh(getGeo("box", { w: 1.02, h: 0.03, d: 0.52 }), matLib.get(0x2a2430, 0.5), 0, 0.22, 0));
  for (const [sx, sz] of [
    [-0.48, -0.24],
    [0.48, -0.24],
    [-0.48, 0.24],
    [0.48, 0.24],
  ] as Array<[number, number]>) {
    g.add(mesh(getGeo("cylinder", { r: 0.022, r2: 0.026, h: 0.36, seg: 8 }), matLib.get(GOLD, 0.2, 0.8), sx, 0.18, sz));
  }
  return g;
}

export function buildDesk(): THREE.Group {
  const g = new THREE.Group();
  g.name = "desk";
  const wood = tex.mat("noyer", 1.5, 0.8, 0.4, 0.1);
  g.add(mesh(getGeo("box", { w: 1.52, h: 0.05, d: 0.72 }), wood, 0, 0.76, 0));
  g.add(mesh(getGeo("box", { w: 0.42, h: 0.52, d: 0.66 }), wood, -0.52, 0.28, 0));
  g.add(mesh(getGeo("box", { w: 0.42, h: 0.52, d: 0.66 }), wood, 0.52, 0.28, 0));
  const lamp = mesh(getGeo("cylinder", { r: 0.03, h: 0.28, seg: 8 }), matLib.get(GOLD, 0.2, 0.75), 0.52, 0.92, -0.18);
  g.add(lamp);
  g.add(mesh(getGeo("sphere", { r: 0.07, seg: 8 }), matLib.getEmissive(0xfff5e6, 0xfff0d0, 0.55), 0.52, 1.08, -0.18));
  return g;
}

export function buildWardrobe(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ward";
  const wood = tex.mat("noyer", 1.2, 2, 0.48, 0.08);
  g.add(mesh(getGeo("box", { w: 1.48, h: 2.15, d: 0.58 }), wood, 0, 1.08, 0));
  g.add(mesh(getGeo("box", { w: 0.02, h: 1.9, d: 0.02 }), matLib.get(GOLD, 0.2, 0.8), 0, 1.05, 0.3));
  g.add(mesh(getGeo("sphere", { r: 0.03, seg: 8 }), matLib.get(GOLD, 0.2, 0.85), -0.32, 1.1, 0.31));
  g.add(mesh(getGeo("sphere", { r: 0.03, seg: 8 }), matLib.get(GOLD, 0.2, 0.85), 0.32, 1.1, 0.31));
  return g;
}

export function buildBookshelf(): THREE.Group {
  const g = new THREE.Group();
  g.name = "book";
  const wood = tex.mat("noyer", 1.2, 2, 0.55, 0.08);
  g.add(mesh(getGeo("box", { w: 1.42, h: 0.06, d: 0.38 }), wood, 0, 0.04, 0));
  g.add(mesh(getGeo("box", { w: 1.42, h: 0.06, d: 0.38 }), wood, 0, 1.98, 0));
  g.add(mesh(getGeo("box", { w: 0.06, h: 2.0, d: 0.38 }), wood, -0.68, 1.0, 0));
  g.add(mesh(getGeo("box", { w: 0.06, h: 2.0, d: 0.38 }), wood, 0.68, 1.0, 0));
  const hues = [0x6a2a28, 0x2a4a6a, 0x3a5a38, 0x8a6a28, 0x4a3a5a, 0x7a3030];
  for (let row = 0; row < 4; row++) {
    const y = 0.42 + row * 0.48;
    g.add(mesh(getGeo("box", { w: 1.3, h: 0.04, d: 0.36 }), wood, 0, y, 0));
    for (let i = 0; i < 8; i++) {
      const h = 0.22 + ((i * 3 + row) % 5) * 0.03;
      g.add(mesh(getGeo("box", { w: 0.12, h, d: 0.28 }), matLib.get(hues[(i + row) % hues.length]!, 0.75), -0.52 + i * 0.15, y + 0.04 + h / 2, 0.02));
    }
  }
  return g;
}

export function buildFridge(): THREE.Group {
  const g = new THREE.Group();
  g.name = "fridge";
  const body = matLib.get(0xe8ecef, 0.35, 0.45);
  g.add(mesh(getGeo("box", { w: 0.72, h: 1.82, d: 0.68 }), body, 0, 0.91, 0));
  g.add(mesh(getGeo("box", { w: 0.66, h: 0.02, d: 0.02 }), matLib.get(CHROME, 0.25, 0.85), 0.28, 1.35, 0.35));
  g.add(mesh(getGeo("box", { w: 0.66, h: 0.02, d: 0.02 }), matLib.get(CHROME, 0.25, 0.85), 0.28, 0.55, 0.35));
  g.add(mesh(getGeo("box", { w: 0.62, h: 0.01, d: 0.01 }), matLib.get(0x1a1a1e, 0.4), 0, 1.12, 0.345));
  return g;
}

export function buildStove(): THREE.Group {
  const g = new THREE.Group();
  g.name = "stove";
  g.add(mesh(getGeo("box", { w: 0.62, h: 0.82, d: 0.6 }), matLib.get(0x2a2c30, 0.4, 0.5), 0, 0.41, 0));
  g.add(mesh(getGeo("box", { w: 0.64, h: 0.04, d: 0.62 }), matLib.get(0x1a1a1e, 0.35, 0.6), 0, 0.84, 0));
  for (const [sx, sz] of [
    [-0.16, -0.12],
    [0.16, -0.12],
    [-0.16, 0.14],
    [0.16, 0.14],
  ] as Array<[number, number]>) {
    g.add(mesh(getGeo("cylinder", { r: 0.09, h: 0.02, seg: 10 }), matLib.get(0x111111, 0.5, 0.4), sx, 0.87, sz));
  }
  g.add(mesh(getGeo("box", { w: 0.5, h: 0.22, d: 0.08 }), matLib.get(0x1a1a1e, 0.4), 0, 1.02, -0.22));
  return g;
}

export function buildKitchenSink(): THREE.Group {
  const g = new THREE.Group();
  g.name = "sink";
  g.add(mesh(getGeo("box", { w: 0.82, h: 0.82, d: 0.58 }), tex.mat("marbre", 0.8, 0.6, 0.35, 0.05), 0, 0.41, 0));
  g.add(mesh(getGeo("box", { w: 0.52, h: 0.08, d: 0.36 }), matLib.get(CHROME, 0.22, 0.7), 0, 0.86, 0.02));
  g.add(mesh(getGeo("cylinder", { r: 0.018, h: 0.22, seg: 8 }), matLib.get(CHROME, 0.2, 0.85), 0, 0.98, -0.12));
  return g;
}

export function buildPiano(): THREE.Group {
  const g = new THREE.Group();
  g.name = "piano";
  const lacquer = matLib.get(0x121214, 0.22, 0.35);
  g.add(mesh(getGeo("box", { w: 1.48, h: 0.78, d: 0.48 }), lacquer, 0, 0.4, 0));
  g.add(mesh(getGeo("box", { w: 1.48, h: 0.42, d: 0.12 }), lacquer, 0, 0.98, -0.18));
  g.add(mesh(getGeo("box", { w: 1.32, h: 0.04, d: 0.22 }), matLib.get(0xf4f1ea, 0.45), 0, 0.82, 0.08));
  for (let i = 0; i < 12; i++) {
    if ([1, 3, 6, 8, 10].includes(i)) {
      g.add(mesh(getGeo("box", { w: 0.05, h: 0.03, d: 0.12 }), matLib.get(0x111111, 0.4), -0.55 + i * 0.1, 0.86, 0.02));
    }
  }
  g.add(mesh(getGeo("box", { w: 0.42, h: 0.08, d: 0.28 }), lacquer, 0, 0.48, 0.55));
  g.userData.sit = true;
  return g;
}

export function buildAtmDesjardins(): THREE.Group {
  const g = new THREE.Group();
  g.name = "atm";
  g.add(mesh(getGeo("box", { w: 0.78, h: 1.52, d: 0.48 }), matLib.get(SQ_GREEN, 0.4, 0.35), 0, 0.76, 0));
  g.add(mesh(getGeo("box", { w: 0.82, h: 0.08, d: 0.52 }), matLib.get(0xc9a84c, 0.3, 0.55), 0, 1.54, 0));
  g.add(mesh(getGeo("box", { w: 0.5, h: 0.34, d: 0.04 }), matLib.getEmissive(0x3dff9a, 0x14532d, 0.75), 0, 1.18, 0.25));
  g.add(mesh(getGeo("box", { w: 0.38, h: 0.04, d: 0.05 }), matLib.get(0x111111, 0.4), 0, 0.82, 0.25));
  g.add(mesh(getGeo("box", { w: 0.26, h: 0.16, d: 0.04 }), matLib.get(0x0f172a, 0.55), 0, 0.56, 0.25));
  return g;
}

export function buildVending(): THREE.Group {
  const g = new THREE.Group();
  g.name = "vending";
  g.userData.vending = true;
  g.add(mesh(getGeo("box", { w: 0.78, h: 1.82, d: 0.52 }), matLib.get(0xb42318, 0.45, 0.2), 0, 0.91, 0));
  g.add(mesh(getGeo("box", { w: 0.58, h: 1.15, d: 0.04 }), matLib.glass("#7dd3fc", 0.28, 0.08, 0.12), 0, 1.05, 0.27));
  const cans = [0xc8102e, 0x1a5a32, 0xd4a017, 0x1a3a7a];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      g.add(mesh(getGeo("cylinder", { r: 0.045, h: 0.12, seg: 8 }), matLib.get(cans[(r + c) % cans.length]!, 0.4, 0.3), -0.18 + c * 0.18, 1.42 - r * 0.24, 0.18));
    }
  }
  g.add(mesh(getGeo("box", { w: 0.32, h: 0.12, d: 0.16 }), matLib.get(0x111111, 0.5), 0, 0.22, 0.28));
  g.add(mesh(getGeo("box", { w: 0.18, h: 0.08, d: 0.04 }), matLib.getEmissive(0x22c55e, 0x14532d, 0.6), 0.22, 0.48, 0.27));
  return g;
}

export function buildGasPump(): THREE.Group {
  const g = new THREE.Group();
  g.name = "gaspump";
  g.add(mesh(getGeo("box", { w: 0.48, h: 1.55, d: 0.42 }), matLib.get(0xc45a12, 0.5, 0.2), 0, 0.78, 0));
  g.add(mesh(getGeo("box", { w: 0.52, h: 0.28, d: 0.18 }), matLib.getEmissive(0x1a1a1e, 0x22c55e, 0.35), 0, 1.28, 0.14));
  g.add(mesh(getGeo("cylinder", { r: 0.03, h: 0.7, seg: 8 }), matLib.get(0x1a1a1e, 0.5), 0.28, 0.85, 0.08));
  g.add(mesh(getGeo("box", { w: 0.08, h: 0.22, d: 0.12 }), matLib.get(0x2a2a2e, 0.45), 0.32, 0.52, 0.08));
  return g;
}

export function buildBusStop(): THREE.Group {
  const g = new THREE.Group();
  g.name = "busstop";
  g.userData.sit = true;
  g.add(mesh(getGeo("cylinder", { r: 0.05, h: 2.55, seg: 8 }), matLib.get(STEEL, 0.4, 0.55), -1.0, 1.28, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.05, h: 2.55, seg: 8 }), matLib.get(STEEL, 0.4, 0.55), 1.0, 1.28, 0));
  g.add(mesh(getGeo("box", { w: 2.2, h: 0.06, d: 0.85 }), matLib.get(0x1a4a7a, 0.5, 0.3), 0, 2.52, 0));
  g.add(mesh(getGeo("box", { w: 2.05, h: 1.15, d: 0.04 }), matLib.glass("#88cce8", 0.4, 0.1, 0.12), 0, 1.55, -0.38));
  g.add(mesh(getGeo("box", { w: 1.7, h: 0.08, d: 0.42 }), matLib.get(0x1a1a22, 0.55), 0, 0.52, 0.05));
  const plate = mesh(getGeo("box", { w: 0.55, h: 0.7, d: 0.04 }), matLib.get(0x1c5f32, 0.55), 1.12, 1.85, 0.12);
  g.add(plate);
  return g;
}

export function buildHydrant(): THREE.Group {
  const g = new THREE.Group();
  g.name = "hydr";
  const red = matLib.get(0xc03028, 0.45, 0.25);
  g.add(mesh(getGeo("cylinder", { r: 0.11, r2: 0.14, h: 0.72, seg: 10 }), red, 0, 0.36, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.16, h: 0.08, seg: 10 }), red, 0, 0.74, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.05, h: 0.22, seg: 8 }), matLib.get(GOLD, 0.25, 0.7), 0.16, 0.48, 0));
  g.children[2]!.rotation.z = Math.PI / 2;
  return g;
}

export function buildMailbox(): THREE.Group {
  const g = new THREE.Group();
  g.name = "mailb";
  g.add(mesh(getGeo("cylinder", { r: 0.04, h: 1.05, seg: 8 }), matLib.get(STEEL, 0.45, 0.4), 0, 0.52, 0));
  g.add(mesh(getGeo("box", { w: 0.28, h: 0.22, d: 0.18 }), matLib.get(0x1a3a7a, 0.5, 0.2), 0, 1.12, 0));
  g.add(mesh(getGeo("box", { w: 0.2, h: 0.02, d: 0.04 }), matLib.get(GOLD, 0.25, 0.7), 0, 1.12, 0.1));
  return g;
}

export function buildLampPost(): THREE.Group {
  const g = new THREE.Group();
  g.name = "lpost";
  g.add(mesh(getGeo("cylinder", { r: 0.06, r2: 0.09, h: 3.6, seg: 8 }), matLib.get(0x3a3e42, 0.5, 0.4), 0, 1.8, 0));
  g.add(mesh(getGeo("box", { w: 0.08, h: 0.08, d: 0.7 }), matLib.get(0x3a3e42, 0.5, 0.4), 0, 3.62, 0.28));
  const glass = mesh(getGeo("sphere", { r: 0.12, seg: 10 }), matLib.getEmissive(0xfff3c4, 0xffd88a, 0.85), 0, 3.5, 0.58);
  glass.userData.lamp = true;
  g.add(glass);
  const light = new THREE.PointLight(0xffe8b0, 1.1, 12, 2);
  light.position.set(0, 3.45, 0.58);
  g.add(light);
  return g;
}

export function buildToilet(): THREE.Group {
  const g = new THREE.Group();
  g.name = "toilet";
  const porcelain = matLib.get(0xf4f4f4, 0.28, 0.05);
  g.add(mesh(getGeo("cylinder", { r: 0.22, h: 0.38, seg: 12 }), porcelain, 0, 0.22, 0.04));
  g.add(mesh(getGeo("box", { w: 0.42, h: 0.42, d: 0.18 }), porcelain, 0, 0.62, -0.18));
  g.add(mesh(getGeo("cylinder", { r: 0.18, h: 0.04, seg: 12 }), porcelain, 0, 0.42, 0.04));
  return g;
}

export function buildBath(): THREE.Group {
  const g = new THREE.Group();
  g.name = "batht";
  g.add(mesh(getGeo("box", { w: 1.72, h: 0.48, d: 0.78 }), matLib.get(0xeceff1, 0.3, 0.08), 0, 0.26, 0));
  g.add(mesh(getGeo("box", { w: 1.48, h: 0.08, d: 0.54 }), matLib.get(0x9ec9e8, 0.2, 0.05), 0, 0.42, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.02, h: 0.18, seg: 8 }), matLib.get(CHROME, 0.2, 0.85), 0.62, 0.58, -0.22));
  return g;
}

export function buildShower(): THREE.Group {
  const g = new THREE.Group();
  g.name = "showr";
  g.add(mesh(getGeo("box", { w: 1.02, h: 0.06, d: 1.02 }), tex.mat("marbre", 1, 1, 0.4, 0.05), 0, 0.03, 0));
  g.add(mesh(getGeo("box", { w: 0.04, h: 2.1, d: 1.0 }), matLib.glass("#cce8f4", 0.35, 0.08, 0.1), -0.48, 1.08, 0));
  g.add(mesh(getGeo("box", { w: 1.0, h: 2.1, d: 0.04 }), matLib.glass("#cce8f4", 0.35, 0.08, 0.1), 0, 1.08, -0.48));
  g.add(mesh(getGeo("cylinder", { r: 0.08, h: 0.04, seg: 10 }), matLib.get(CHROME, 0.2, 0.8), 0, 2.05, 0));
  return g;
}

export function buildTv(): THREE.Group {
  const g = new THREE.Group();
  g.name = "tv65";
  g.add(mesh(getGeo("box", { w: 1.58, h: 0.92, d: 0.06 }), matLib.get(0x111111, 0.4, 0.5), 0, 0.52, 0));
  g.add(mesh(getGeo("box", { w: 1.46, h: 0.8, d: 0.02 }), matLib.getEmissive(0x1a2a44, 0x2244aa, 0.35), 0, 0.52, 0.035));
  g.add(mesh(getGeo("box", { w: 0.42, h: 0.08, d: 0.18 }), matLib.get(0x1a1a1e, 0.5), 0, 0.04, 0));
  return g;
}

export function buildCampfire(): THREE.Group {
  const g = new THREE.Group();
  g.name = "campfire";
  g.userData.campfire = true;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const log = mesh(getGeo("cylinder", { r: 0.06, h: 0.42, seg: 6 }), matLib.get(0x4a3020, 0.95), Math.cos(a) * 0.22, 0.08, Math.sin(a) * 0.22);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = a;
    g.add(log);
  }
  const flame = mesh(getGeo("cone", { r: 0.16, h: 0.48, seg: 6 }), matLib.getEmissive(0xff6a1a, 0xff4010, 1.9), 0, 0.38, 0);
  flame.userData.flame = true;
  g.add(flame);
  const light = new THREE.PointLight(0xff7a2a, 1.8, 7, 2);
  light.position.y = 0.4;
  light.userData.flameLight = true;
  g.add(light);
  return g;
}

export function buildTrafficLight(): THREE.Group {
  const g = new THREE.Group();
  g.name = "tlight";
  g.userData.tlight = true;
  g.add(mesh(getGeo("cylinder", { r: 0.07, h: 3.6, seg: 8 }), matLib.get(0x2a2c30, 0.45, 0.4), 0, 1.8, 0));
  g.add(mesh(getGeo("box", { w: 0.28, h: 0.78, d: 0.22 }), matLib.get(0x1a1a1e, 0.4), 0, 3.55, 0.12));
  const red = mesh(getGeo("sphere", { r: 0.08, seg: 8 }), matLib.getEmissive(0xff2020, 0xff2020, 1.4), 0, 3.78, 0.22);
  const yel = mesh(getGeo("sphere", { r: 0.08, seg: 8 }), matLib.getEmissive(0xffcc22, 0xffcc22, 0.05), 0, 3.55, 0.22);
  const grn = mesh(getGeo("sphere", { r: 0.08, seg: 8 }), matLib.getEmissive(0x22cc44, 0x22cc44, 0.05), 0, 3.32, 0.22);
  red.userData.tl = "r";
  yel.userData.tl = "y";
  grn.userData.tl = "g";
  g.add(red, yel, grn);
  return g;
}

export function buildPlant(): THREE.Group {
  const g = new THREE.Group();
  g.name = "plant";
  g.add(mesh(getGeo("cylinder", { r: 0.16, r2: 0.12, h: 0.28, seg: 10 }), matLib.get(0x7a4438, 0.7), 0, 0.14, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = mesh(getGeo("sphere", { r: 0.14, seg: 8 }), matLib.get(0x2a6a38, 0.95), Math.cos(a) * 0.08, 0.48 + (i % 2) * 0.1, Math.sin(a) * 0.08);
    leaf.scale.set(1, 1.45, 0.5);
    g.add(leaf);
  }
  return g;
}

export function buildCashRegister(): THREE.Group {
  const g = new THREE.Group();
  g.name = "cashregister";
  g.add(mesh(getGeo("box", { w: 0.42, h: 0.22, d: 0.38 }), matLib.get(0x2a2c30, 0.45, 0.4), 0, 0.12, 0));
  g.add(mesh(getGeo("box", { w: 0.28, h: 0.16, d: 0.04 }), matLib.getEmissive(0x22c55e, 0x14532d, 0.5), 0, 0.32, 0.12));
  return g;
}

export function buildTent(): THREE.Group {
  const g = new THREE.Group();
  g.name = "tent";
  const cloth = matLib.get(0x3a5a38, 0.92);
  const left = mesh(getGeo("box", { w: 2.1, h: 1.35, d: 0.04 }), cloth, 0, 0.68, 0);
  left.rotation.z = 0.55;
  left.position.set(-0.42, 0.68, 0);
  const right = left.clone();
  right.rotation.z = -0.55;
  right.position.set(0.42, 0.68, 0);
  g.add(left, right);
  g.add(mesh(getGeo("box", { w: 0.04, h: 1.15, d: 1.55 }), cloth, 0, 0.58, -0.78));
  return g;
}

export function buildToolbox(): THREE.Group {
  const g = new THREE.Group();
  g.name = "toolbox";
  g.add(mesh(getGeo("box", { w: 0.5, h: 0.22, d: 0.26 }), matLib.get(0xc05018, 0.45, 0.3), 0, 0.12, 0));
  g.add(mesh(getGeo("torus", { r: 0.12, tube: 0.018, seg: 10 }), matLib.get(STEEL, 0.35, 0.7), 0, 0.28, 0));
  return g;
}

export function buildMedkitBox(): THREE.Group {
  const g = new THREE.Group();
  g.name = "medkit";
  g.add(mesh(getGeo("box", { w: 0.38, h: 0.22, d: 0.26 }), matLib.get(0xcc2020, 0.5, 0.15), 0, 0.12, 0));
  g.add(mesh(getGeo("box", { w: 0.16, h: 0.04, d: 0.04 }), matLib.get(0xf5f5f5, 0.4), 0, 0.16, 0.14));
  g.add(mesh(getGeo("box", { w: 0.04, h: 0.16, d: 0.04 }), matLib.get(0xf5f5f5, 0.4), 0, 0.16, 0.14));
  return g;
}

export function buildSofaL(): THREE.Group {
  const g = new THREE.Group();
  g.name = "sofaL";
  g.userData.sit = true;
  const cloth = tex.cloth("laineTricot", "laineKnitNrm", 2.2, 1.6, 0.9, 0x5a5a7a, 0.92);
  g.add(mesh(getGeo("box", { w: 2.35, h: 0.28, d: 0.88 }), cloth, 0, 0.38, 0.2));
  g.add(mesh(getGeo("box", { w: 0.88, h: 0.28, d: 1.55 }), cloth, 0.74, 0.38, -0.55));
  g.add(mesh(getGeo("box", { w: 2.35, h: 0.55, d: 0.16 }), cloth, 0, 0.72, -0.22));
  g.add(mesh(getGeo("box", { w: 0.16, h: 0.55, d: 1.55 }), cloth, 1.14, 0.72, -0.55));
  return g;
}

export function buildWasher(): THREE.Group {
  const g = new THREE.Group();
  g.name = "washmach";
  g.add(mesh(getGeo("box", { w: 0.64, h: 0.88, d: 0.62 }), matLib.get(0xd0d4d8, 0.35, 0.45), 0, 0.44, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.18, h: 0.04, seg: 16 }), matLib.get(0x1a1a1e, 0.3, 0.4), 0, 0.48, 0.3));
  g.add(mesh(getGeo("cylinder", { r: 0.12, h: 0.02, seg: 12 }), matLib.glass("#88cce8", 0.4, 0.1, 0.1), 0, 0.48, 0.32));
  g.add(mesh(getGeo("box", { w: 0.2, h: 0.06, d: 0.04 }), matLib.get(0x2a2c30, 0.4), 0.18, 0.78, 0.3));
  return g;
}

export function buildMicrowave(): THREE.Group {
  const g = new THREE.Group();
  g.name = "micro";
  g.add(mesh(getGeo("box", { w: 0.5, h: 0.3, d: 0.38 }), matLib.get(0x2a2c30, 0.4, 0.45), 0, 0.16, 0));
  g.add(mesh(getGeo("box", { w: 0.32, h: 0.18, d: 0.02 }), matLib.glass("#334455", 0.45, 0.15, 0.2), -0.04, 0.16, 0.2));
  g.add(mesh(getGeo("box", { w: 0.08, h: 0.18, d: 0.02 }), matLib.get(0x1a1a1e, 0.4), 0.18, 0.16, 0.2));
  return g;
}

export function buildCounter(): THREE.Group {
  const g = new THREE.Group();
  g.name = "kcnt";
  g.add(mesh(getGeo("box", { w: 2.0, h: 0.82, d: 0.58 }), tex.mat("noyer", 2, 0.6, 0.5, 0.08), 0, 0.41, 0));
  g.add(mesh(getGeo("box", { w: 2.08, h: 0.05, d: 0.64 }), tex.mat("marbre", 2, 0.6, 0.32, 0.08), 0, 0.84, 0));
  return g;
}

export function buildIsland(): THREE.Group {
  const g = new THREE.Group();
  g.name = "kisland";
  g.add(mesh(getGeo("box", { w: 1.62, h: 0.82, d: 0.78 }), tex.mat("noyer", 1.6, 0.8, 0.5, 0.08), 0, 0.41, 0));
  g.add(mesh(getGeo("box", { w: 1.7, h: 0.05, d: 0.86 }), tex.mat("marbre", 1.6, 0.8, 0.3, 0.1), 0, 0.84, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.018, h: 0.2, seg: 8 }), matLib.get(CHROME, 0.2, 0.85), 0.4, 0.96, -0.2));
  return g;
}

export function buildDumpster(): THREE.Group {
  const g = new THREE.Group();
  g.name = "dump";
  g.userData.dump = true;
  g.add(mesh(getGeo("box", { w: 2.15, h: 1.15, d: 1.08 }), matLib.get(0x2a5a38, 0.55, 0.25), 0, 0.58, 0));
  g.add(mesh(getGeo("box", { w: 1.05, h: 0.06, d: 1.12 }), matLib.get(0x1a3a28, 0.5), -0.52, 1.18, 0));
  g.add(mesh(getGeo("box", { w: 1.05, h: 0.06, d: 1.12 }), matLib.get(0x1a3a28, 0.5), 0.52, 1.18, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.12, h: 0.08, seg: 10 }), matLib.get(0x1a1a1e, 0.6), -0.85, 0.12, 0.48));
  g.add(mesh(getGeo("cylinder", { r: 0.12, h: 0.08, seg: 10 }), matLib.get(0x1a1a1e, 0.6), 0.85, 0.12, 0.48));
  return g;
}

export function buildTrashCan(): THREE.Group {
  const g = new THREE.Group();
  g.name = "trash";
  g.add(mesh(getGeo("cylinder", { r: 0.18, r2: 0.16, h: 0.82, seg: 10 }), matLib.get(0x2a2e32, 0.5, 0.3), 0, 0.41, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.2, h: 0.05, seg: 10 }), matLib.get(0x1a1a1e, 0.45), 0, 0.84, 0));
  return g;
}

export function buildFence(): THREE.Group {
  const g = new THREE.Group();
  g.name = "fence";
  const wood = tex.mat("noyer", 0.4, 1.2, 0.75, 0.05);
  g.add(mesh(getGeo("box", { w: 0.08, h: 1.15, d: 0.08 }), wood, -0.92, 0.58, 0));
  g.add(mesh(getGeo("box", { w: 0.08, h: 1.15, d: 0.08 }), wood, 0.92, 0.58, 0));
  g.add(mesh(getGeo("box", { w: 1.95, h: 0.08, d: 0.06 }), wood, 0, 0.42, 0));
  g.add(mesh(getGeo("box", { w: 1.95, h: 0.08, d: 0.06 }), wood, 0, 0.88, 0));
  for (let i = 0; i < 7; i++) {
    g.add(mesh(getGeo("box", { w: 0.07, h: 1.05, d: 0.04 }), wood, -0.84 + i * 0.28, 0.55, 0));
  }
  return g;
}

export function buildStopSign(): THREE.Group {
  const g = new THREE.Group();
  g.name = "stop";
  g.add(mesh(getGeo("cylinder", { r: 0.03, h: 2.2, seg: 8 }), matLib.get(STEEL, 0.4, 0.5), 0, 1.1, 0));
  const plate = mesh(getGeo("cylinder", { r: 0.32, h: 0.04, seg: 8 }), matLib.get(0xc02020, 0.45), 0, 2.25, 0);
  plate.rotation.x = Math.PI / 2;
  g.add(plate);
  return g;
}

export function buildStreetSign(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ssign";
  g.add(mesh(getGeo("cylinder", { r: 0.03, h: 2.1, seg: 8 }), matLib.get(STEEL, 0.4, 0.5), 0, 1.05, 0));
  g.add(mesh(getGeo("box", { w: 1.05, h: 0.28, d: 0.04 }), matLib.get(0x1c5f32, 0.5), 0.2, 2.15, 0));
  return g;
}

export function buildParkBench(): THREE.Group {
  const g = new THREE.Group();
  g.name = "bench";
  g.userData.sit = true;
  const wood = tex.mat("noyer", 1.4, 0.4, 0.7, 0.05);
  g.add(mesh(getGeo("box", { w: 1.55, h: 0.07, d: 0.42 }), wood, 0, 0.46, 0));
  g.add(mesh(getGeo("box", { w: 1.55, h: 0.42, d: 0.07 }), wood, 0, 0.72, -0.2));
  g.add(mesh(getGeo("box", { w: 0.07, h: 0.46, d: 0.42 }), matLib.get(STEEL, 0.4, 0.55), -0.7, 0.23, 0));
  g.add(mesh(getGeo("box", { w: 0.07, h: 0.46, d: 0.42 }), matLib.get(STEEL, 0.4, 0.55), 0.7, 0.23, 0));
  return g;
}

export function buildFloorLamp(): THREE.Group {
  const g = new THREE.Group();
  g.name = "lamp";
  g.add(mesh(getGeo("cylinder", { r: 0.14, h: 0.04, seg: 10 }), matLib.get(GOLD, 0.25, 0.7), 0, 0.02, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.018, h: 1.35, seg: 8 }), matLib.get(GOLD, 0.2, 0.75), 0, 0.7, 0));
  g.add(mesh(getGeo("cone", { r: 0.18, h: 0.28, seg: 10 }), matLib.getEmissive(0xfff5e6, 0xffe8b0, 0.55), 0, 1.48, 0));
  const light = new THREE.PointLight(0xfff0d8, 0.9, 5, 2);
  light.position.y = 1.4;
  g.add(light);
  return g;
}

export function buildRug(): THREE.Group {
  const g = new THREE.Group();
  g.name = "rug";
  const m = mesh(getGeo("box", { w: 2.0, h: 0.03, d: 1.35 }), tex.mat("velours", 1.6, 1.1, 0.92), 0, 0.015, 0, false);
  g.add(m);
  return g;
}

export function buildClock(): THREE.Group {
  const g = new THREE.Group();
  g.name = "clock";
  g.add(mesh(getGeo("cylinder", { r: 0.2, h: 0.05, seg: 16 }), matLib.get(0xe8e0d0, 0.4), 0, 0, 0));
  g.children[0]!.rotation.x = Math.PI / 2;
  g.add(mesh(getGeo("box", { w: 0.02, h: 0.12, d: 0.01 }), matLib.get(0x1a1a1e, 0.4), 0, 0.04, 0.03));
  return g;
}

export function buildCeilingLamp(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ceillamp";
  g.add(mesh(getGeo("cylinder", { r: 0.22, r2: 0.28, h: 0.08, seg: 12 }), matLib.get(0xf5f0eb, 0.35), 0, 0.04, 0));
  g.add(mesh(getGeo("sphere", { r: 0.06, seg: 8 }), matLib.getEmissive(0xfff5e6, 0xfff5e6, 0.8), 0, -0.02, 0));
  return g;
}

export function buildWallLamp(): THREE.Group {
  const g = new THREE.Group();
  g.name = "walllamp";
  g.add(mesh(getGeo("box", { w: 0.12, h: 0.08, d: 0.06 }), matLib.get(GOLD, 0.2, 0.75), 0, 0, -0.04));
  g.add(mesh(getGeo("sphere", { r: 0.07, seg: 8 }), matLib.getEmissive(0xffe8b0, 0xffd88a, 0.7), 0, 0, 0.06));
  return g;
}

export function buildMinibar(): THREE.Group {
  const g = new THREE.Group();
  g.name = "minibar";
  g.add(mesh(getGeo("box", { w: 0.78, h: 0.88, d: 0.48 }), matLib.get(0x1a1a22, 0.4, 0.3), 0, 0.44, 0));
  g.add(mesh(getGeo("box", { w: 0.62, h: 0.42, d: 0.04 }), matLib.glass("#88cce8", 0.35, 0.1, 0.12), 0, 0.55, 0.25));
  const bottles = [0xc8102e, 0xd4a017, 0x1a5a32];
  for (let i = 0; i < 3; i++) {
    g.add(mesh(getGeo("cylinder", { r: 0.035, h: 0.22, seg: 8 }), matLib.get(bottles[i]!, 0.3, 0.2), -0.16 + i * 0.16, 0.55, 0.08));
  }
  return g;
}

export function buildReception(): THREE.Group {
  const g = new THREE.Group();
  g.name = "reception";
  const wood = tex.mat("noyer", 2.4, 0.8, 0.4, 0.2);
  g.add(mesh(getGeo("box", { w: 3.0, h: 1.05, d: 0.78 }), wood, 0, 0.52, 0));
  g.add(mesh(getGeo("box", { w: 3.15, h: 0.06, d: 0.88 }), matLib.get(0xf5f0eb, 0.25, 0.12), 0, 1.08, 0));
  g.add(mesh(getGeo("box", { w: 3.0, h: 0.02, d: 0.02 }), matLib.get(GOLD, 0.15, 0.9), 0, 1.04, 0.42));
  return g;
}

export function buildSafe(): THREE.Group {
  const g = new THREE.Group();
  g.name = "safebox";
  g.add(mesh(getGeo("box", { w: 0.42, h: 0.38, d: 0.32 }), matLib.get(0x2a2a2e, 0.35, 0.55), 0, 0.19, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.05, h: 0.03, seg: 10 }), matLib.get(STEEL, 0.3, 0.7), 0.08, 0.2, 0.17));
  return g;
}

export function buildBellhop(): THREE.Group {
  const g = new THREE.Group();
  g.name = "bellhop";
  g.add(mesh(getGeo("box", { w: 0.72, h: 0.08, d: 0.48 }), matLib.get(STEEL, 0.4, 0.55), 0, 0.22, 0));
  g.add(mesh(getGeo("box", { w: 0.72, h: 0.08, d: 0.48 }), matLib.get(STEEL, 0.4, 0.55), 0, 0.72, 0));
  g.add(mesh(getGeo("box", { w: 0.72, h: 0.08, d: 0.48 }), matLib.get(STEEL, 0.4, 0.55), 0, 1.12, 0));
  for (const sx of [-0.32, 0.32]) {
    g.add(mesh(getGeo("cylinder", { r: 0.02, h: 1.15, seg: 8 }), matLib.get(STEEL, 0.35, 0.6), sx, 0.58, -0.2));
    g.add(mesh(getGeo("cylinder", { r: 0.02, h: 1.15, seg: 8 }), matLib.get(STEEL, 0.35, 0.6), sx, 0.58, 0.2));
  }
  return g;
}

export function buildShopShelf(): THREE.Group {
  const g = new THREE.Group();
  g.name = "shopshelf";
  const metal = matLib.get(0x6a6e72, 0.45, 0.4);
  g.add(mesh(getGeo("box", { w: 1.2, h: 0.04, d: 0.38 }), metal, 0, 0.4, 0));
  g.add(mesh(getGeo("box", { w: 1.2, h: 0.04, d: 0.38 }), metal, 0, 0.95, 0));
  g.add(mesh(getGeo("box", { w: 1.2, h: 0.04, d: 0.38 }), metal, 0, 1.5, 0));
  g.add(mesh(getGeo("box", { w: 1.2, h: 0.04, d: 0.38 }), metal, 0, 1.95, 0));
  g.add(mesh(getGeo("box", { w: 0.04, h: 2.0, d: 0.38 }), metal, -0.58, 1.0, 0));
  g.add(mesh(getGeo("box", { w: 0.04, h: 2.0, d: 0.38 }), metal, 0.58, 1.0, 0));
  const hues = [0xc8102e, 0xd4a017, 0x1a5a32, 0x1a3a7a];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      g.add(mesh(getGeo("box", { w: 0.12, h: 0.18, d: 0.1 }), matLib.get(hues[(r + c) % 4]!, 0.5), -0.4 + c * 0.2, 0.52 + r * 0.55, 0.05));
    }
  }
  return g;
}

export function buildLaptop(): THREE.Group {
  const g = new THREE.Group();
  g.name = "laptop";
  g.add(mesh(getGeo("box", { w: 0.34, h: 0.02, d: 0.22 }), matLib.get(0x2a2a2e, 0.35, 0.5), 0, 0.01, 0));
  const lid = mesh(getGeo("box", { w: 0.34, h: 0.22, d: 0.012 }), matLib.get(0x1a1a1e, 0.35, 0.5), 0, 0.12, -0.1);
  lid.rotation.x = -0.15;
  g.add(lid);
  g.add(mesh(getGeo("box", { w: 0.3, h: 0.18, d: 0.005 }), matLib.getEmissive(0x3a6a88, 0x2244aa, 0.4), 0, 0.13, -0.094));
  return g;
}

export function buildGamingPc(): THREE.Group {
  const g = new THREE.Group();
  g.name = "gamingpc";
  g.add(mesh(getGeo("box", { w: 0.22, h: 0.48, d: 0.42 }), matLib.get(0x1a1a22, 0.4, 0.4), 0, 0.24, 0));
  g.add(mesh(getGeo("box", { w: 0.02, h: 0.4, d: 0.36 }), matLib.glass("#334466", 0.4, 0.1, 0.15), 0.12, 0.24, 0));
  g.add(mesh(getGeo("box", { w: 0.04, h: 0.12, d: 0.04 }), matLib.getEmissive(0x7c3aed, 0x7c3aed, 0.8), 0, 0.08, 0.22));
  return g;
}

export function buildSpeaker(): THREE.Group {
  const g = new THREE.Group();
  g.name = "speaker";
  g.add(mesh(getGeo("box", { w: 0.2, h: 0.48, d: 0.22 }), matLib.get(0x1a1a1e, 0.55), 0, 0.24, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.07, h: 0.02, seg: 12 }), matLib.get(0x3a3a40, 0.5), 0, 0.32, 0.11));
  g.add(mesh(getGeo("cylinder", { r: 0.045, h: 0.02, seg: 10 }), matLib.get(0x3a3a40, 0.5), 0, 0.14, 0.11));
  return g;
}

export function buildFlagCanada(): THREE.Group {
  const g = new THREE.Group();
  g.name = "flagcanada";
  g.add(mesh(getGeo("cylinder", { r: 0.03, h: 2.55, seg: 8 }), matLib.get(STEEL, 0.4, 0.5), 0, 1.28, 0));
  g.add(mesh(getGeo("box", { w: 1.15, h: 0.62, d: 0.03 }), matLib.get(0xc8102e, 0.55), 0.6, 2.2, 0));
  g.add(mesh(getGeo("box", { w: 0.22, h: 0.62, d: 0.032 }), matLib.get(0xf5f5f5, 0.5), 0.6, 2.2, 0.002));
  return g;
}

export function buildBunk(): THREE.Group {
  const g = new THREE.Group();
  g.name = "bunkprison";
  const steel = matLib.get(0x4a4e52, 0.45, 0.5);
  g.add(mesh(getGeo("box", { w: 1.95, h: 0.08, d: 0.85 }), steel, 0, 0.42, 0));
  g.add(mesh(getGeo("box", { w: 1.95, h: 0.08, d: 0.85 }), steel, 0, 1.22, 0));
  g.add(mesh(getGeo("box", { w: 1.85, h: 0.1, d: 0.75 }), matLib.get(0x3a4a6a, 0.85), 0, 0.5, 0));
  g.add(mesh(getGeo("box", { w: 1.85, h: 0.1, d: 0.75 }), matLib.get(0x3a4a6a, 0.85), 0, 1.3, 0));
  for (const [sx, sy] of [[-0.9, 0.85], [0.9, 0.85]] as const) {
    g.add(mesh(getGeo("cylinder", { r: 0.03, h: 1.7, seg: 8 }), steel, sx, sy, -0.38));
    g.add(mesh(getGeo("cylinder", { r: 0.03, h: 1.7, seg: 8 }), steel, sx, sy, 0.38));
  }
  return g;
}

export function buildCellDoor(): THREE.Group {
  const g = new THREE.Group();
  g.name = "celldoor";
  const bar = matLib.get(STEEL, 0.4, 0.55);
  for (let i = 0; i < 6; i++) {
    g.add(mesh(getGeo("cylinder", { r: 0.025, h: 2.35, seg: 6 }), bar, -0.4 + i * 0.16, 1.18, 0));
  }
  g.add(mesh(getGeo("box", { w: 1.0, h: 0.06, d: 0.06 }), bar, 0, 0.12, 0));
  g.add(mesh(getGeo("box", { w: 1.0, h: 0.06, d: 0.06 }), bar, 0, 2.25, 0));
  return g;
}

export function buildWatchtower(): THREE.Group {
  const g = new THREE.Group();
  g.name = "watchtower";
  const wood = matLib.get(0x6a6660, 0.7);
  for (const [sx, sz] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]] as const) {
    g.add(mesh(getGeo("cylinder", { r: 0.08, h: 6.4, seg: 6 }), wood, sx, 3.2, sz));
  }
  g.add(mesh(getGeo("box", { w: 2.1, h: 0.12, d: 2.1 }), wood, 0, 6.45, 0));
  g.add(mesh(getGeo("box", { w: 2.2, h: 1.15, d: 2.2 }), matLib.get(0x4a4844, 0.65), 0, 7.1, 0));
  return g;
}

export function buildBathSink(): THREE.Group {
  const g = new THREE.Group();
  g.name = "bsink";
  g.add(mesh(getGeo("cylinder", { r: 0.08, h: 0.72, seg: 8 }), matLib.get(CHROME, 0.25, 0.7), 0, 0.36, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.22, r2: 0.16, h: 0.12, seg: 12 }), matLib.get(0xf5f5f5, 0.28), 0, 0.78, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.015, h: 0.14, seg: 8 }), matLib.get(CHROME, 0.2, 0.85), 0, 0.9, -0.08));
  return g;
}

export function buildHydroPole(): THREE.Group {
  const g = new THREE.Group();
  g.name = "utpole";
  const wood = matLib.get(0x8a7060, 0.85);
  g.add(mesh(getGeo("cylinder", { r: 0.08, r2: 0.14, h: 10, seg: 8 }), wood, 0, 5, 0));
  g.add(mesh(getGeo("box", { w: 5.0, h: 0.14, d: 0.14 }), matLib.get(0x7a6050, 0.9), 0, 9.2, 0));
  g.add(mesh(getGeo("box", { w: 3.5, h: 0.12, d: 0.12 }), matLib.get(0x7a6050, 0.9), 0, 7.8, 0));
  for (const x of [-2.4, 0, 2.4]) {
    g.add(mesh(getGeo("cylinder", { r: 0.05, h: 0.22, seg: 6 }), matLib.get(0xc0d0e0, 0.4, 0.15), x, 9.42, 0));
  }
  return g;
}

export function buildSpiralStairs(): THREE.Group {
  const g = new THREE.Group();
  g.name = "stsp";
  const wood = tex.mat("noyer", 0.8, 0.4, 0.55, 0.08);
  g.add(mesh(getGeo("cylinder", { r: 0.08, h: 2.4, seg: 8 }), matLib.get(STEEL, 0.4, 0.5), 0, 1.2, 0));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const step = mesh(getGeo("box", { w: 0.7, h: 0.06, d: 0.28 }), wood, Math.cos(a) * 0.45, 0.12 + i * 0.18, Math.sin(a) * 0.45);
    step.rotation.y = -a;
    g.add(step);
  }
  return g;
}

export function buildPitchedRoof(): THREE.Group {
  const g = new THREE.Group();
  g.name = "rpitch";
  const tin = matLib.get(0x8f3628, 0.55, 0.15);
  const left = mesh(getGeo("box", { w: 4.1, h: 0.1, d: 2.2 }), tin, 0, 0.55, -0.55);
  left.rotation.x = 0.48;
  const right = mesh(getGeo("box", { w: 4.1, h: 0.1, d: 2.2 }), tin, 0, 0.55, 0.55);
  right.rotation.x = -0.48;
  g.add(left, right);
  return g;
}

export function buildWoodDoor(): THREE.Group {
  const g = new THREE.Group();
  g.name = "dwood";
  g.add(mesh(getGeo("box", { w: 1.0, h: 2.15, d: 0.08 }), tex.mat("noyer", 0.6, 1.6, 0.55, 0.08), 0, 1.08, 0));
  g.add(mesh(getGeo("sphere", { r: 0.035, seg: 8 }), matLib.get(GOLD, 0.2, 0.8), 0.38, 1.05, 0.05));
  return g;
}

export function buildDoubleDoor(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ddouble";
  const wood = tex.mat("noyer", 0.8, 1.8, 0.5, 0.08);
  g.add(mesh(getGeo("box", { w: 0.96, h: 2.15, d: 0.08 }), wood, -0.5, 1.08, 0));
  g.add(mesh(getGeo("box", { w: 0.96, h: 2.15, d: 0.08 }), wood, 0.5, 1.08, 0));
  g.add(mesh(getGeo("sphere", { r: 0.03, seg: 8 }), matLib.get(GOLD, 0.2, 0.8), -0.12, 1.05, 0.05));
  g.add(mesh(getGeo("sphere", { r: 0.03, seg: 8 }), matLib.get(GOLD, 0.2, 0.8), 0.12, 1.05, 0.05));
  return g;
}

export function buildWindow(): THREE.Group {
  const g = new THREE.Group();
  g.name = "wins";
  g.add(mesh(getGeo("box", { w: 1.22, h: 1.22, d: 0.06 }), tex.mat("noyer", 0.8, 0.8, 0.5, 0.08), 0, 0.61, 0));
  g.add(mesh(getGeo("box", { w: 1.02, h: 1.02, d: 0.03 }), matLib.glass("#87ceeb", 0.32, 0.08, 0.12), 0, 0.61, 0.02));
  g.add(mesh(getGeo("box", { w: 0.04, h: 1.02, d: 0.04 }), tex.mat("noyer", 0.3, 0.8, 0.5), 0, 0.61, 0.03));
  return g;
}

export function buildPillar(): THREE.Group {
  const g = new THREE.Group();
  g.name = "pil";
  g.add(mesh(getGeo("box", { w: 0.48, h: 0.16, d: 0.48 }), matLib.get(0x9a9086, 0.7), 0, 0.08, 0));
  g.add(mesh(getGeo("cylinder", { r: 0.16, h: 2.85, seg: 10 }), matLib.get(0xb8b0a4, 0.55), 0, 1.55, 0));
  g.add(mesh(getGeo("box", { w: 0.52, h: 0.14, d: 0.52 }), matLib.get(0x9a9086, 0.7), 0, 3.05, 0));
  return g;
}

export function buildBarbed(): THREE.Group {
  const g = new THREE.Group();
  g.name = "barbed";
  const steel = matLib.get(0x7a8088, 0.4, 0.55);
  g.add(mesh(getGeo("cylinder", { r: 0.015, h: 3.0, seg: 6 }), steel, 0, 0.12, 0));
  g.children[0]!.rotation.z = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const barb = mesh(getGeo("octa", { r: 0.04 }), steel, -1.3 + i * 0.38, 0.12, 0);
    g.add(barb);
  }
  return g;
}

export function buildTeleporter(): THREE.Group {
  const g = new THREE.Group();
  g.name = "teleporter";
  g.userData.teleport = true;
  g.add(mesh(getGeo("cylinder", { r: 0.85, h: 0.08, seg: 16 }), matLib.get(0x1a1028, 0.4, 0.4), 0, 0.04, 0));
  const ring = mesh(getGeo("torus", { r: 0.72, tube: 0.05, seg: 18 }), matLib.getEmissive(0x8800ff, 0x8800ff, 1.4), 0, 1.15, 0);
  ring.userData.portalRing = true;
  g.add(ring);
  const disc = mesh(getGeo("cylinder", { r: 0.62, h: 0.02, seg: 16 }), matLib.getEmissive(0x4a00aa, 0x8800ff, 0.7), 0, 1.15, 0);
  disc.userData.portalDisc = true;
  g.add(disc);
  return g;
}

export function buildLedStrip(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ledstrip";
  g.add(mesh(getGeo("box", { w: 2.0, h: 0.03, d: 0.04 }), matLib.getEmissive(0x00e8ff, 0x00e8ff, 1.5), 0, 0.02, 0));
  return g;
}

export function buildSpawnPad(): THREE.Group {
  const g = new THREE.Group();
  g.name = "spawnpoint";
  g.add(mesh(getGeo("cylinder", { r: 0.55, h: 0.06, seg: 16 }), matLib.getEmissive(0x1a8a3a, 0x22c55e, 0.55), 0, 0.03, 0));
  g.add(mesh(getGeo("ring", { r: 0.5, r2: 0.38, seg: 16 }), matLib.getEmissive(0x86efac, 0x22c55e, 0.8), 0, 0.07, 0));
  g.children[1]!.rotation.x = -Math.PI / 2;
  return g;
}

export function buildSidewalk(): THREE.Group {
  const g = new THREE.Group();
  g.name = "swalk";
  g.add(mesh(getGeo("box", { w: 2.0, h: 0.1, d: 4.0 }), tex.mat("betonDalles", 1.2, 2.4, 0.85, 0.05), 0, 0.05, 0, false));
  return g;
}

export function buildChandelierProp(): THREE.Group {
  return lobbyChandelier(0, 0.35, 0);
}

export function buildStreetProp(kind: string): THREE.Group {
  switch (kind) {
    case "vending":
      return buildVending();
    case "bus":
      return buildBusStop();
    case "hydrant":
      return buildHydrant();
    case "mail":
      return buildMailbox();
    case "campfire":
      return buildCampfire();
    case "tlight":
      return buildTrafficLight();
    case "bench":
      return buildParkBench();
    case "dump":
      return buildDumpster();
    case "pump":
      return buildGasPump();
    case "trash":
      return buildTrashCan();
    case "stop":
      return buildStopSign();
    case "flag":
      return buildFlagCanada();
    default:
      return buildHydrant();
  }
}

/** Feux + flamme — appelé chaque frame depuis le monde. */
export function tickProps3d(root: THREE.Object3D, elapsed: number): void {
  root.traverse((o) => {
    if (o.userData.tlight && o instanceof THREE.Group) {
      const phase = Math.floor(elapsed / 3.2) % 3;
      o.traverse((c) => {
        if (!(c instanceof THREE.Mesh) || !c.userData.tl) return;
        const mat = c.material as THREE.MeshStandardMaterial;
        if (!mat.emissive) return;
        const on =
          (c.userData.tl === "r" && phase === 0) ||
          (c.userData.tl === "g" && phase === 1) ||
          (c.userData.tl === "y" && phase === 2);
        mat.emissiveIntensity = on ? 1.5 : 0.05;
      });
    }
    if (o.userData.flame && o instanceof THREE.Mesh) {
      const s = 0.92 + Math.sin(elapsed * 9) * 0.08 + Math.sin(elapsed * 17) * 0.04;
      o.scale.set(s, 0.85 + Math.sin(elapsed * 11) * 0.18, s);
    }
    if (o.userData.flameLight && o instanceof THREE.PointLight) {
      o.intensity = 1.5 + Math.sin(elapsed * 8) * 0.35;
    }
    if (o.userData.portalRing && o instanceof THREE.Mesh) {
      o.rotation.y = elapsed * 0.8;
      o.rotation.x = Math.sin(elapsed * 0.6) * 0.15;
    }
    if (o.userData.portalDisc && o instanceof THREE.Mesh) {
      const mat = o.material as THREE.MeshStandardMaterial;
      if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.55 + Math.sin(elapsed * 4) * 0.25;
    }
  });
}

export function catalogBuilder(id: string): THREE.Group | null {
  switch (id) {
    case "armch":
      return buildArmchair();
    case "bed":
    case "beds":
    case "hotelbed":
      return buildBed(id);
    case "dintbl":
      return buildDiningTable();
    case "ctbl":
      return buildCoffeeTable();
    case "desk":
      return buildDesk();
    case "ward":
      return buildWardrobe();
    case "book":
      return buildBookshelf();
    case "fridge":
      return buildFridge();
    case "stove":
      return buildStove();
    case "sink":
      return buildKitchenSink();
    case "piano":
      return buildPiano();
    case "atm":
      return buildAtmDesjardins();
    case "vending":
      return buildVending();
    case "gaspump":
      return buildGasPump();
    case "busstop":
      return buildBusStop();
    case "hydr":
      return buildHydrant();
    case "mailb":
      return buildMailbox();
    case "lpost":
      return buildLampPost();
    case "toilet":
      return buildToilet();
    case "batht":
      return buildBath();
    case "showr":
      return buildShower();
    case "tv65":
    case "tvwall":
      return buildTv();
    case "campfire":
      return buildCampfire();
    case "tlight":
      return buildTrafficLight();
    case "plant":
    case "flower":
      return buildPlant();
    case "cashregister":
      return buildCashRegister();
    case "tent":
      return buildTent();
    case "toolbox":
      return buildToolbox();
    case "medkit":
      return buildMedkitBox();
    case "chandelier":
      return buildChandelierProp();
    case "sofaL":
      return buildSofaL();
    case "washmach":
      return buildWasher();
    case "micro":
      return buildMicrowave();
    case "kcnt":
      return buildCounter();
    case "kisland":
      return buildIsland();
    case "dump":
      return buildDumpster();
    case "trash":
      return buildTrashCan();
    case "fence":
      return buildFence();
    case "stop":
      return buildStopSign();
    case "ssign":
      return buildStreetSign();
    case "lamp":
      return buildFloorLamp();
    case "rug":
      return buildRug();
    case "clock":
      return buildClock();
    case "ceillamp":
      return buildCeilingLamp();
    case "walllamp":
      return buildWallLamp();
    case "minibar":
      return buildMinibar();
    case "reception":
      return buildReception();
    case "safebox":
      return buildSafe();
    case "bellhop":
      return buildBellhop();
    case "shopshelf":
      return buildShopShelf();
    case "laptop":
      return buildLaptop();
    case "gamingpc":
      return buildGamingPc();
    case "speaker":
      return buildSpeaker();
    case "flagcanada":
      return buildFlagCanada();
    case "bunkprison":
      return buildBunk();
    case "celldoor":
      return buildCellDoor();
    case "watchtower":
      return buildWatchtower();
    case "bsink":
      return buildBathSink();
    case "utpole":
      return buildHydroPole();
    case "stsp":
      return buildSpiralStairs();
    case "rpitch":
      return buildPitchedRoof();
    case "dwood":
      return buildWoodDoor();
    case "ddouble":
      return buildDoubleDoor();
    case "wins":
      return buildWindow();
    case "pil":
      return buildPillar();
    case "barbed":
      return buildBarbed();
    case "teleporter":
      return buildTeleporter();
    case "ledstrip":
      return buildLedStrip();
    case "spawnpoint":
      return buildSpawnPad();
    case "swalk":
      return buildSidewalk();
    default:
      return null;
  }
}
