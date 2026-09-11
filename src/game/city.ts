import * as THREE from "three";
import { buildPark } from "./landmarks";
import { matLib, QC_PALETTE } from "./materials";
import { makeRng } from "./rng";
import {
  CITY_ARTERY_MUL,
  CITY_SIDEWALK_W,
  cityLotLocal,
  cityToWorld,
  getTerrainHeight,
  lotHitsThroughRoad,
} from "./worlddata";
import { finishMap, tex as texLib } from "./textures";
import {
  buildBoutique,
  buildCasseCroute,
  buildDepanneur,
  buildEcole,
  buildEglise,
  buildHotelVille,
  buildMaisonCanadienne,
  buildQuincaillerie,
  buildSedan,
  buildSqPoste,
} from "./architecture";
import { attachScenicHeat, scenicHeat } from "./utilities";
import { type SwingDoor } from "./door";

export type InteriorKind = "hotel" | "apartment" | "boutique" | "lobby" | "corridor" | "prison" | "home" | "depanneur";

export interface CityDoor {
  id: string;
  name: string;
  kind: InteriorKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  prompt: string;
}

export interface CityConfig {
  center: [number, number];
  gridSize: number;
  blockSize: number;
  streetWidth: number;
  density: number;
  seed: number;
  villageName: string;
  id?: string;
  angle?: number;
}

export interface BuiltCity {
  group: THREE.Group;
  doors: CityDoor[];
  textures: THREE.Texture[];
  swings: SwingDoor[];
}

const BRICK = [0x8f4a38, 0xb8a084, 0x8a8a86, 0xd8d4c8, 0x9a9a96, 0x7a5a48];

type FacadeStyle = "brique" | "pierre" | "clapboard" | "stuc";

function villageStyle(name: string): FacadeStyle {
  if (name === "Donnacona") return "brique";
  if (name === "Portneuf") return "pierre";
  if (name === "Saint-Raymond") return "stuc";
  return "clapboard";
}

function hex(n: number) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function mix(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

const FACADE_CACHE = new Map<string, THREE.CanvasTexture>();

function paintBrick(ctx: CanvasRenderingContext2D, w: number, h: number, base: number, rng: () => number) {
  ctx.fillStyle = "#b8aea0";
  ctx.fillRect(0, 0, w, h);
  const bh = 10;
  const bw = 22;
  for (let y = 0, row = 0; y < h; y += bh, row++) {
    const odd = row % 2;
    for (let x = odd ? -bw / 2 : 0; x < w; x += bw) {
      const t = (rng() - 0.5) * 0.18;
      ctx.fillStyle = hex(mix(base, t > 0 ? 0xffffff : 0x1a1010, Math.abs(t)));
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
}

function paintStone(ctx: CanvasRenderingContext2D, w: number, h: number, base: number, rng: () => number) {
  ctx.fillStyle = "#6a6660";
  ctx.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const rowH = 14 + Math.floor(rng() * 10);
    let x = 0;
    while (x < w) {
      const bw = 18 + Math.floor(rng() * 28);
      ctx.fillStyle = hex(mix(base, rng() > 0.5 ? 0xd8d0c4 : 0x3a3834, 0.08 + rng() * 0.12));
      ctx.fillRect(x + 1, y + 1, bw - 2, rowH - 2);
      x += bw;
    }
    y += rowH;
  }
}

function paintClapboard(ctx: CanvasRenderingContext2D, w: number, h: number, base: number) {
  ctx.fillStyle = hex(base);
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 7) {
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, y + 1, w, 1);
  }
  ctx.fillStyle = hex(mix(base, 0xf4f0e4, 0.25));
  ctx.fillRect(0, 0, 10, h);
  ctx.fillRect(w - 10, 0, 10, h);
}

function paintStuc(ctx: CanvasRenderingContext2D, w: number, h: number, base: number, rng: () => number) {
  ctx.fillStyle = hex(base);
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.02 + rng() * 0.04})`;
    ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 3, 2);
  }
  ctx.fillStyle = hex(mix(base, 0x4a4844, 0.35));
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
}

function facadeTex(
  floors: number,
  cols: number,
  brick: number,
  lit: number,
  seed: number,
  shop = false,
  style: FacadeStyle = "brique",
): THREE.CanvasTexture {
  const key = `${style}_${floors}_${cols}_${brick}_${shop ? 1 : 0}_${seed >> 3}`;
  const hit = FACADE_CACHE.get(key);
  if (hit) return hit;

  const rng = makeRng(seed);
  const w = 512;
  const h = Math.max(512, floors * 96);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  if (style === "pierre") paintStone(ctx, w, h, brick, rng);
  else if (style === "clapboard") paintClapboard(ctx, w, h, brick);
  else if (style === "stuc") paintStuc(ctx, w, h, brick, rng);
  else paintBrick(ctx, w, h, brick, rng);

  const shopH = shop ? 118 : 36;
  if (shop) {
    ctx.fillStyle = rng() > 0.4 ? "#f4e4b0" : "#1c2834";
    ctx.fillRect(18, h - 108, w - 36, 86);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(28, h - 100, w - 56, 70);
    const sign = [0xc03030, 0x2a6ad0, 0x2a8a50, 0xc09020][seed % 4]!;
    ctx.fillStyle = hex(sign);
    ctx.fillRect(40, h - 132, w - 80, 22);
    ctx.fillStyle = "#f4f0e4";
    ctx.fillRect(32, h - 24, w - 64, 10);
  }

  const winW = (w - 48) / cols;
  const usable = h - shopH - 16;
  const winH = (usable / floors) * 0.46;
  for (let f = 0; f < floors; f++) {
    const y = 18 + f * (usable / floors);
    for (let i = 0; i < cols; i++) {
      const x = 24 + i * winW;
      const on = rng() < lit;
      ctx.fillStyle = style === "brique" ? "#c4b4a4" : "#efeae0";
      ctx.fillRect(x - 3, y - 4, winW * 0.58 + 6, winH + 8);
      ctx.fillStyle = on ? "#f6d98a" : "#243444";
      ctx.fillRect(x, y, winW * 0.58, winH);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x, y, 2, winH);
      ctx.fillRect(x, y, winW * 0.58, 2);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x + winW * 0.28, y, 1.5, winH);
      ctx.fillRect(x, y + winH * 0.48, winW * 0.58, 1.5);
      ctx.fillStyle = hex(mix(brick, 0x1a1010, 0.35));
      ctx.fillRect(x - 4, y + winH + 4, winW * 0.58 + 8, 4);
      if (style === "clapboard") {
        ctx.fillStyle = hex([0x3a5a48, 0x5a3a28, 0x3a4a6a][seed % 3]!);
        ctx.fillRect(x - 10, y, 7, winH + 4);
        ctx.fillRect(x + winW * 0.58 + 3, y, 7, winH + 4);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  finishMap(tex, "clamp");
  FACADE_CACHE.set(key, tex);
  return tex;
}

function box(w: number, h: number, d: number, color: number, y: number, extra?: THREE.Material) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    extra ?? matLib.get(color, 0.9),
  );
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function building(
  width: number,
  depth: number,
  floors: number,
  color: number,
  lit: number,
  seed: number,
  shop: boolean,
  textures: THREE.Texture[],
  style: FacadeStyle = "brique",
): THREE.Group {
  const g = new THREE.Group();
  const floorH = 3.05;
  const h = floors * floorH;
  const tex = facadeTex(floors, Math.max(3, Math.floor(width / 3.2)), color, lit, seed, shop, style);
  if (!textures.includes(tex)) textures.push(tex);
  const rough = style === "pierre" ? 0.92 : style === "clapboard" ? 0.86 : 0.84;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: rough,
    metalness: 0.04,
    flatShading: true,
  });
  const nrmId = style === "clapboard" ? null : style === "brique" ? "betonTrousNrm" : "betonMurNrm";
  if (nrmId) {
    mat.normalMap = texLib.map(nrmId, 2.2, floors * 0.7);
    mat.normalScale = new THREE.Vector2(0.55, 0.55);
    mat.flatShading = false;
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, h, depth), mat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  g.add(box(width + 0.35, 0.7, depth + 0.35, QC_PALETTE.beton, 0.32, texLib.pbr("betonTrous", "betonTrousNrm", 2, 0.4, 0.94)));
  g.add(box(width + 0.4, 0.55, depth + 0.4, 0x3a3a3e, h + 0.18, texLib.pbr("betonDalles", "betonDallesNrm", 1.5, 0.4, 0.9)));
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.25, 0.12), matLib.get(QC_PALETTE.porte, 0.8));
  door.position.set(0, 1.2, depth / 2 + 0.07);
  g.add(door);
  const steps = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 0.9), matLib.get(QC_PALETTE.beton, 0.94));
  steps.position.set(0, 0.14, depth / 2 + 0.55);
  g.add(steps);
  if (shop) {
    const awn = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.1, 1.7), matLib.get(0xb03030, 0.7));
    awn.position.set(0, 3.12, depth / 2 + 0.85);
    awn.castShadow = true;
    g.add(awn);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.5, 0.55, 0.12),
      matLib.getEmissive(0xc09020, 0xffd060, 0.45),
    );
    sign.position.set(0, 3.55, depth / 2 + 0.18);
    g.add(sign);
  }
  if (floors <= 2) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.18, depth + 0.8), matLib.get(0x6a3a32, 0.82));
    roof.position.y = h + 0.45;
    roof.rotation.z = 0.08;
    roof.castShadow = true;
    g.add(roof);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.55), texLib.mat("brique", 0.6, 0.6, 0.88));
    chimney.position.set(width * 0.28, h + 1.05, -depth * 0.18);
    chimney.castShadow = true;
    g.add(chimney);
  } else {
    if (floors >= 3) {
      const balc = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.08, 1.15), matLib.get(0x9a9690, 0.7, 0.2));
      balc.position.set(-width * 0.18, floorH * 2 + 0.1, depth / 2 + 0.55);
      g.add(balc);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.7, 0.04), matLib.get(0xc8d0d4, 0.25, 0.45));
      rail.position.set(-width * 0.18, floorH * 2 + 0.5, depth / 2 + 1.08);
      g.add(rail);
    }
    if (floors >= 4) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.1), matLib.get(0x8a9096, 0.45, 0.35));
      ac.position.set(width * 0.22, h + 0.7, -depth * 0.15);
      g.add(ac);
    }
  }
  g.userData.footprint = { width, depth, height: h };
  return g;
}

function hotel(width: number, depth: number, floors: number, lit: number, seed: number, textures: THREE.Texture[], style: FacadeStyle) {
  const g = building(width, depth, floors, 0xb8a084, lit, seed, false, textures, style === "brique" ? "pierre" : style);
  g.name = "hotel";
  const lobbyH = 5.1;
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.78, 3.4),
    matLib.getEmissive(0xd8e4f0, 0xf0e8c8, 0.35),
  );
  glass.position.set(0, lobbyH * 0.42, depth / 2 + 0.06);
  g.add(glass);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, 0.28, 2.2), matLib.get(0x2a3a4a, 0.55, 0.35));
  canopy.position.set(0, 4.05, depth / 2 + 0.85);
  canopy.castShadow = true;
  g.add(canopy);
  for (const x of [-width * 0.16, width * 0.16]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.9, 8), matLib.get(0x2a3a4a, 0.5, 0.4));
    col.position.set(x, 1.95, depth / 2 + 1.4);
    g.add(col);
  }
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, floors * 1.6, 0.22),
    matLib.getEmissive(0xc03038, 0xff4050, 0.7),
  );
  sign.position.set(width / 2 - 0.4, floors * 2.2, depth / 2 + 0.2);
  g.add(sign);
  g.userData.entranceLocal = new THREE.Vector3(0, 0, depth / 2 + 1.8);
  return g;
}

function tower(width: number, depth: number, floors: number, lit: number, seed: number, textures: THREE.Texture[], style: FacadeStyle) {
  const g = building(width, depth, floors, 0x8a8a86, lit, seed, false, textures, style === "clapboard" ? "stuc" : style);
  g.name = "tour";
  const h = floors * 3.05;
  const ph = new THREE.Mesh(new THREE.BoxGeometry(width - 4.2, 3.4, depth - 4.2), matLib.get(0xd8d4c8, 0.88));
  ph.position.y = h + 2.2;
  ph.castShadow = true;
  g.add(ph);
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(width - 0.6, 0.14, depth - 0.6), matLib.get(0x8a8278, 0.94));
  terrace.position.y = h + 0.55;
  g.add(terrace);
  const rail = matLib.get(0x9ab4c4, 0.15, 0.45);
  for (const [w, _d, ox, oz] of [
    [width - 0.8, 0.06, 0, (depth - 0.8) / 2],
    [width - 0.8, 0.06, 0, -(depth - 0.8) / 2],
  ] as Array<[number, number, number, number]>) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.05), rail);
    p.position.set(ox, h + 1.1, oz);
    g.add(p);
  }
  g.userData.entranceLocal = new THREE.Vector3(0, 0, depth / 2 + 2.0);
  return g;
}

function spiralStair(floors: number) {
  const g = new THREE.Group();
  const metal = matLib.get(0x5a5e62, 0.5, 0.65);
  const steps = floors * 12;
  const geo = new THREE.BoxGeometry(1.0, 0.045, 0.26);
  const inst = new THREE.InstancedMesh(geo, metal, steps);
  const dummy = new THREE.Object3D();
  const r = 1.35;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * floors * 0.8;
    dummy.position.set(Math.cos(a) * r, 0.25 + t * (floors * 3.05 - 0.4), Math.sin(a) * r);
    dummy.rotation.y = -a;
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, floors * 3.05, 8), metal);
  pole.position.y = (floors * 3.05) / 2;
  g.add(pole);
  return g;
}

function parkingPad(width: number, depth: number, seed: number): THREE.Group {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, 0.08, depth * 0.92),
    texLib.pbr("asphalteSombre", "betonDallesNrm", 3, 3, 0.96, 0, 0xffffff, 0.4),
  );
  pad.position.y = 0.04;
  pad.receiveShadow = true;
  g.add(pad);
  const n = Math.max(2, Math.floor(width / 5.5));
  for (let i = 0; i < n; i++) {
    if (rng() > 0.55) continue;
    const car = buildSedan([0x2a3a58, 0x6a2a28, 0xc8c4bc, 0x1a1a1e][i % 4]!);
    car.position.set((i - (n - 1) / 2) * 5.2, 0.35, rng() * 2 - 1);
    car.rotation.y = Math.PI / 2;
    g.add(car);
  }
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.6), matLib.get(0x4a4e52, 0.7, 0.2));
  kiosk.position.set(-width * 0.35, 1.1, -depth * 0.32);
  g.add(kiosk);
  return g;
}

function duplex(seed: number): THREE.Group {
  const g = new THREE.Group();
  const a = buildMaisonCanadienne(seed, 0);
  const b = buildMaisonCanadienne(seed + 9, 0);
  a.position.x = -5.4;
  b.position.x = 5.4;
  g.add(a, b);
  g.userData.footprint = { width: 16.8, depth: 10.4 };
  return g;
}

export function buildCity(cfg: CityConfig): BuiltCity {
  const rng = makeRng(cfg.seed);
  const n = cfg.gridSize;
  const group = new THREE.Group();
  group.name = `ville_${cfg.villageName}`;
  const doors: CityDoor[] = [];
  const textures: THREE.Texture[] = [];
  const swings: SwingDoor[] = [];
  const [cx, cz] = cfg.center;
  const angle = cfg.angle ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const pitch = cfg.blockSize + cfg.streetWidth;
  const colOff: number[] = [];
  const rowOff: number[] = [];
  for (let i = 0; i <= n; i++) {
    colOff.push(i * pitch);
    rowOff.push(i * pitch);
  }
  const totalW = colOff[n];
  const totalD = rowOff[n];
  const shiftX = -totalW / 2;
  const shiftZ = -totalD / 2;
  const toWorld = (lx: number, lz: number) => {
    const x = cx + (lx + shiftX) * cos - (lz + shiftZ) * sin;
    const z = cz + (lx + shiftX) * sin + (lz + shiftZ) * cos;
    return { x, z, y: getTerrainHeight(x, z) };
  };

  const sidewalk = texLib.pbr("platreGris", "betonMurNrm", 6, 2, 0.93, 0, 0xc4c0b8, 0.35);

  const addStreet = (a: { x: number; z: number; y: number }, b: { x: number; z: number; y: number }, width: number) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const y = (a.y + b.y) / 2;
    for (const side of [-1, 1]) {
      const sw = CITY_SIDEWALK_W;
      const px = midX + Math.cos(ang) * (width / 2 + sw / 2) * side;
      const pz = midZ - Math.sin(ang) * (width / 2 + sw / 2) * side;
      const walk = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.14, len), sidewalk);
      walk.rotation.y = -ang;
      walk.position.set(px, y + 0.08, pz);
      walk.receiveShadow = true;
      group.add(walk);
    }
  };

  for (let i = 0; i <= n; i++) {
    const artery = i === Math.floor(n / 2);
    const w = artery ? cfg.streetWidth * CITY_ARTERY_MUL : cfg.streetWidth;
    addStreet(toWorld(colOff[i], -cfg.streetWidth), toWorld(colOff[i], totalD + cfg.streetWidth), w);
    addStreet(toWorld(-cfg.streetWidth, rowOff[i]), toWorld(totalW + cfg.streetWidth, rowOff[i]), w);
  }

  const parkCol = Math.floor(n / 2);
  const parkRow = Math.floor(n / 2);
  const hotelCol = Math.min(n - 1, parkCol + 1);
  const hotelRow = parkRow;
  const towerCol = parkCol;
  const towerRow = Math.max(0, parkRow - 1);

  const lampMat = matLib.get(0x3a3e42, 0.55, 0.6);
  const bulbMat = matLib.getEmissive(0xfff0c0, 0xffc870, 0.08);
  const lamps: Array<{ x: number; y: number; z: number }> = [];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const lot = cityLotLocal(cfg, col, row);
      const world = cityToWorld(cfg, lot.cx, lot.cz, angle);
      const dc = Math.hypot(col - n / 2, row - n / 2) / Math.max(1, n / 2);
      const style = villageStyle(cfg.villageName);
      const onArtery = col === Math.floor(n / 2) || row === Math.floor(n / 2);
      const bw = Math.min(lot.w - 2.6, Math.max(7, lot.w * 0.7));
      const bd = Math.min(lot.d - 2.6, Math.max(7, lot.d * 0.64));
      const yaw = row < n / 2 ? Math.PI : 0;
      const cityId = cfg.id ?? cfg.villageName.toLowerCase().replace(/\s+/g, "");
      const through = lotHitsThroughRoad(world.x, world.z, 0, cityId, lot.w * 0.48, lot.d * 0.48);

      let mesh: THREE.Group;
      let doorKind: InteriorKind | null = null;
      let doorName = "";

      if (through || (col === parkCol && row === parkRow)) {
        mesh = buildPark(lot.w * 0.94, lot.d * 0.94);
      } else if (col === hotelCol && row === hotelRow) {
        const fl = Math.max(5, Math.round(6 * cfg.density));
        mesh = hotel(bw, bd, fl, 0.35, cfg.seed + col * 17 + row, textures, style);
        doorKind = "hotel";
        doorName = `Hôtel ${cfg.villageName}`;
      } else if (col === towerCol && row === towerRow) {
        const fl = Math.max(6, Math.round(7 * cfg.density));
        mesh = tower(bw, bd, fl, 0.28, cfg.seed + 90, textures, style);
        doorKind = "apartment";
        doorName = `Tour ${cfg.villageName}`;
      } else if (parkCol > 0 && col === parkCol - 1 && row === parkRow) {
        mesh = buildEglise(cfg.seed + 11, 0);
      } else if (col === hotelCol && row === Math.max(0, parkRow - 1) && !(col === towerCol && row === towerRow)) {
        mesh = buildHotelVille();
      } else if (cfg.villageName === "Donnacona" && col === 0 && row === 0) {
        mesh = buildSqPoste();
      } else if (col === 0 && row === n - 1) {
        mesh = buildEcole(cfg.seed + 3, 0);
      } else if (onArtery && col === Math.min(n - 1, parkCol) && row === 0) {
        mesh = buildDepanneur(cfg.seed + col, 0);
        doorKind = "depanneur";
        doorName = `Dépanneur ${cfg.villageName}`;
      } else if (col === n - 1 && row === Math.min(n - 1, parkRow + 1)) {
        mesh = buildQuincaillerie();
      } else if (onArtery && row === n - 1 && col === Math.max(0, parkCol - 1)) {
        mesh = rng() > 0.45 ? buildBoutique() : buildCasseCroute();
        doorKind = "boutique";
        doorName = `Commerce ${cfg.villageName}`;
      } else if (dc > 0.72 && rng() > 0.35) {
        mesh = duplex(cfg.seed + col * 19 + row * 7);
        attachScenicHeat(mesh, scenicHeat(cfg.seed + col * 19 + row, false), yaw, bw * 0.42, bd * 0.2);
      } else if (dc > 0.55 && rng() > 0.62) {
        mesh = parkingPad(bw, bd, cfg.seed + col * 5 + row);
      } else if (dc > 0.58) {
        mesh = buildMaisonCanadienne(cfg.seed + col * 31 + row * 13, 0);
        attachScenicHeat(mesh, scenicHeat(cfg.seed + col * 31 + row, false), yaw, 5.4, 2.2);
      } else {
        const shop = onArtery && dc < 0.7;
        let floors = dc < 0.35 ? 4 : dc < 0.65 ? 3 : 2;
        floors = Math.max(1, Math.round(floors * cfg.density));
        const color = BRICK[Math.floor(rng() * BRICK.length)]!;
        mesh = building(bw, bd, floors, color, 0.18, cfg.seed + col * 31 + row * 13, shop, textures, style);
        if (shop) {
          doorKind = "boutique";
          doorName = `Commerce ${cfg.villageName}`;
        }
        if (floors >= 3 && rng() > 0.55) {
          const stair = spiralStair(Math.min(4, floors));
          stair.position.set(bw * 0.28, 0, -bd * 0.28);
          mesh.add(stair);
        }
      }

      mesh.position.set(world.x, world.y, world.z);
      mesh.rotation.y = yaw;
      const fp = mesh.userData.footprint as { width?: number; depth?: number } | undefined;
      if (fp?.width && fp?.depth) {
        const s = Math.min(1, (lot.w - 2.4) / fp.width, (lot.d - 2.4) / fp.depth);
        if (s < 0.995) mesh.scale.multiplyScalar(Math.max(0.35, s));
      }
      group.add(mesh);

      if (doorKind) {
        const local = (mesh.userData.entranceLocal as THREE.Vector3) ?? new THREE.Vector3(0, 0, bd / 2 + 2);
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const dx = local.x * cosY + local.z * sinY;
        const dz = -local.x * sinY + local.z * cosY;
        const prompt =
          doorKind === "hotel"
            ? `Entrer · ${doorName}`
            : doorKind === "depanneur"
              ? `Entrer · ${doorName}`
              : `Entrer · ${doorName}, 4½`;
        doors.push({
          id: `${cfg.villageName}_${doorKind}_${col}_${row}`,
          name: doorName,
          kind: doorKind,
          x: world.x + dx,
          y: world.y,
          z: world.z + dz,
          yaw,
          prompt,
        });
        const meshSwings = (mesh.userData.swings as SwingDoor[] | undefined) ?? [];
        swings.push(...meshSwings);
      }

      lamps.push({
        x: world.x + (lot.w / 2 + 1.4) * (col % 2 === 0 ? 1 : -1),
        y: world.y,
        z: world.z + (row < n / 2 ? -(lot.d / 2 + 1.5) : lot.d / 2 + 1.5),
      });
    }
  }

  const poleGeo = new THREE.CylinderGeometry(0.08, 0.11, 6.6, 6);
  const headGeo = new THREE.BoxGeometry(0.38, 0.12, 0.7);
  const count = lamps.length;
  const poles = new THREE.InstancedMesh(poleGeo, lampMat, count);
  const heads = new THREE.InstancedMesh(headGeo, bulbMat, count);
  const dummy = new THREE.Object3D();
  lamps.forEach((p, i) => {
    dummy.position.set(p.x, p.y + 3.3, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, p.y + 6.5, p.z);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
  });
  poles.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  heads.userData.isStreetlight = true;
  poles.castShadow = true;
  group.add(poles, heads);

  return { group, doors, textures, swings };
}
