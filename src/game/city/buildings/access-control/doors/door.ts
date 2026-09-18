import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib, QC_PALETTE } from "./materials";
import { finishMap, tex } from "./textures";

export class SwingDoor {
  hinge: THREE.Group;
  leaf: THREE.Group;
  handle: THREE.Object3D;
  sign: 1 | -1;
  geom: 1 | -1;
  angle = 0;
  vel = 0;
  latch = 0;
  width: number;
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();

  constructor(
    hinge: THREE.Group,
    leaf: THREE.Group,
    handle: THREE.Object3D,
    sign: 1 | -1,
    geom: 1 | -1,
    width: number,
  ) {
    this.hinge = hinge;
    this.leaf = leaf;
    this.handle = handle;
    this.sign = sign;
    this.geom = geom;
    this.width = width;
  }

  get open() {
    return Math.abs(this.angle) > 0.9;
  }

  hit(impulse: number) {
    this.vel += this.sign * Math.abs(impulse);
    this.latch = Math.max(this.latch, 3.4);
  }

  push(dt: number, force: number) {
    this.vel += this.sign * Math.abs(force) * dt;
    this.latch = Math.max(this.latch, 2.6);
  }

  tick(dt: number) {
    if (this.latch > 0) this.latch -= dt;
    const spring = this.latch > 0 ? 0 : -this.angle * 5.5;
    this.vel += (spring - this.vel * 6) * dt;
    this.angle += this.vel * dt;
    const min = this.sign < 0 ? -2.4 : -0.06;
    const max = this.sign < 0 ? 0.06 : 2.4;
    if (this.angle < min) {
      this.angle = min;
      this.vel *= -0.12;
    }
    if (this.angle > max) {
      this.angle = max;
      this.vel *= -0.12;
    }
    this.leaf.rotation.y = this.angle;
  }

  leafCenter(out: THREE.Vector3) {
    return this.leaf.localToWorld(out.set(this.geom * this.width * 0.5, 1.15, 0));
  }

  handleWorld(out: THREE.Vector3) {
    this.handle.getWorldPosition(out);
    return out;
  }

  slabDist(px: number, pz: number) {
    this.hinge.getWorldPosition(this.a);
    this.hinge.localToWorld(this.b.set(this.geom * this.width, 1, 0));
    const abx = this.b.x - this.a.x;
    const abz = this.b.z - this.a.z;
    const denom = abx * abx + abz * abz || 1;
    const t = Math.min(1, Math.max(0, ((px - this.a.x) * abx + (pz - this.a.z) * abz) / denom));
    return Math.hypot(px - (this.a.x + abx * t), pz - (this.a.z + abz * t));
  }

  worldHit(out: THREE.Vector3) {
    return this.leafCenter(out);
  }
}

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(getGeo("box", { w, h, d }), mat);
  m.position.set(x, y, z);
  return m;
}

function cyl(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(getGeo("cylinder", { r, r2: r, h, seg }), mat);
  m.position.set(x, y, z);
  return m;
}

/** Porte vitrée commerciale : cadre alu, barre antipanique, paumelles, ferme-porte. */
export function buildGlassLeaf(
  width: number,
  height: number,
  geomSign: 1 | -1,
  swingSign: 1 | -1,
  opts?: {
    glass?: THREE.Material;
    frame?: THREE.Material;
    neon?: number | null;
    handle?: THREE.Material;
  },
): { hinge: THREE.Group; door: SwingDoor } {
  const hinge = new THREE.Group();
  const leaf = new THREE.Group();
  const s = geomSign;
  const cx = s * (width / 2);
  const alu = opts?.frame ?? matLib.get(0x2a3038, 0.32, 0.72);
  const aluDark = matLib.get(0x161a20, 0.38, 0.62);
  const steel = opts?.handle ?? matLib.get(0xc9ced4, 0.22, 0.88);
  const kick = matLib.get(0x8a9098, 0.35, 0.7);

  const glass = new THREE.Mesh(
    getGeo("box", { w: width - 0.1, h: height - 0.28, d: 0.028 }),
    opts?.glass ?? matLib.glass(0x9ec8e0, 0.28),
  );
  glass.position.set(cx, height / 2 + 0.04, 0);
  glass.castShadow = true;
  leaf.add(glass);

  const railH = 0.07;
  leaf.add(box(width + 0.02, railH, 0.09, alu, cx, height - railH / 2, 0));
  leaf.add(box(width + 0.02, railH, 0.09, alu, cx, railH / 2, 0));
  leaf.add(box(width + 0.02, 0.055, 0.085, alu, cx, height * 0.46, 0));
  leaf.add(box(0.055, height, 0.09, alu, s * 0.028, height / 2, 0));
  leaf.add(box(0.055, height, 0.09, alu, s * (width - 0.028), height / 2, 0));
  leaf.add(box(width - 0.08, 0.26, 0.04, kick, cx, 0.16, 0.04));

  const frost = box(width - 0.16, 0.11, 0.01, matLib.glass(0xd8e8f2, 0.55), cx, height * 0.72, 0.02);
  leaf.add(frost);

  if (opts?.neon !== null) {
    const neonCol = opts?.neon ?? 0xa78bfa;
    leaf.add(
      box(width * 0.86, 0.016, 0.028, matLib.getEmissive(neonCol, neonCol, 1.15), cx, height - 0.12, 0.055),
    );
  }

  const barX = s * (width - 0.2);
  const standoffA = cyl(0.018, 0.09, steel, barX, height * 0.42, 0.07);
  standoffA.rotation.x = Math.PI / 2;
  leaf.add(standoffA);
  const standoffB = standoffA.clone();
  standoffB.position.y = height * 0.62;
  leaf.add(standoffB);
  const handle = cyl(0.022, 0.58, steel, barX, height * 0.52, 0.115);
  handle.name = "ether-door-handle";
  handle.castShadow = true;
  leaf.add(handle);
  leaf.add(box(0.08, 0.04, 0.04, steel, barX, height * 0.24, 0.06));

  const hingeMat = matLib.get(0x3a4048, 0.4, 0.65);
  for (const hy of [0.28, height * 0.5, height - 0.32]) {
    leaf.add(box(0.045, 0.13, 0.055, hingeMat, s * 0.02, hy, -0.01));
  }

  const closer = box(0.22, 0.05, 0.07, aluDark, s * 0.14, height - 0.07, 0.08);
  hinge.add(closer);
  leaf.add(box(0.32, 0.018, 0.018, aluDark, s * 0.28, height - 0.1, 0.07));

  hinge.add(leaf);
  return { hinge, door: new SwingDoor(hinge, leaf, handle, swingSign, geomSign, width) };
}

/** Encadrement (chambranle + linteau + seuil) — ouverture centrée, face +Z. */
export function buildDoorCasing(
  width = 0.96,
  height = 2.22,
  depth = 0.16,
  mat?: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  g.name = "door-casing";
  const wood = mat ?? matLib.get(0x1c1a24, 0.55, 0.18);
  const casing = matLib.get(0x2a2430, 0.62, 0.12);
  const half = width / 2;
  g.add(box(0.07, height, depth, wood, -half, height / 2, 0));
  g.add(box(0.07, height, depth, wood, half, height / 2, 0));
  g.add(box(width + 0.1, 0.08, depth, wood, 0, height + 0.02, 0));
  g.add(box(0.05, height + 0.1, 0.045, casing, -(half + 0.055), height / 2 + 0.02, depth * 0.38));
  g.add(box(0.05, height + 0.1, 0.045, casing, half + 0.055, height / 2 + 0.02, depth * 0.38));
  g.add(box(width + 0.18, 0.06, 0.05, casing, 0, height + 0.08, depth * 0.4));
  const sill = box(width + 0.08, 0.035, depth + 0.06, matLib.get(0x3a342c, 0.7), 0, 0.018, 0.02);
  sill.receiveShadow = true;
  g.add(sill);
  return g;
}

export function brassLever(x: number, y: number, z: number, flip = 1): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const brass = matLib.get(0xc9a24a, 0.22, 0.86);
  g.add(box(0.07, 0.07, 0.02, brass, 0, 0, 0));
  const neck = cyl(0.012, 0.05, brass, 0, 0, 0.03);
  neck.rotation.x = Math.PI / 2;
  g.add(neck);
  const lever = box(0.14, 0.028, 0.028, brass, flip * 0.06, 0, 0.055);
  lever.castShadow = true;
  g.add(lever);
  return g;
}

/** Vantail bois 6 panneaux, poignée laiton, judas, plaque de pied. Origine au sol, face +Z. */
export function buildPanelLeaf(
  width = 0.88,
  height = 2.12,
  opts?: { wood?: THREE.Material; locked?: boolean },
): THREE.Group {
  const g = new THREE.Group();
  g.name = "panel-leaf";
  const wood = opts?.wood ?? tex.mat("noyer", 1.1, 2.2, 0.52, 0.08);
  const inset = tex.mat("chene", 0.55, 0.7, 0.58, 0.06);
  const brass = matLib.get(0xc9a24a, 0.22, 0.86);
  const steel = matLib.get(0x2a2e34, 0.4, 0.55);

  const slab = box(width, height, 0.05, wood, 0, height / 2, 0);
  slab.castShadow = true;
  g.add(slab);
  g.add(box(width + 0.02, 0.04, 0.06, wood, 0, height - 0.02, 0));
  g.add(box(width + 0.02, 0.05, 0.06, wood, 0, 0.03, 0));

  const pw = width * 0.34;
  const phTop = height * 0.22;
  const phBot = height * 0.26;
  const gapX = width * 0.2;
  for (const sx of [-gapX, gapX]) {
    g.add(box(pw, phTop, 0.035, inset, sx, height * 0.78, 0.012));
    g.add(box(pw, phTop * 0.72, 0.035, inset, sx, height * 0.52, 0.012));
    g.add(box(pw, phBot, 0.035, inset, sx, height * 0.26, 0.012));
  }
  g.add(box(width - 0.06, 0.16, 0.02, steel, 0, 0.12, 0.028));
  g.add(brassLever(width * 0.32, height * 0.48, 0.04, 1));
  const peephole = cyl(0.016, 0.04, brass, width * 0.02, height * 0.72, 0.03);
  peephole.rotation.x = Math.PI / 2;
  g.add(peephole);
  const lens = cyl(0.01, 0.012, matLib.get(0x111111, 0.15, 0.4), width * 0.02, height * 0.72, 0.048);
  lens.rotation.x = Math.PI / 2;
  g.add(lens);
  return g;
}

/** Porte d'entrée québécoise : vantail, chambranle, imposte vitrée. */
export function buildHouseFrontDoor(width = 0.95, height = 2.08): THREE.Group {
  const g = new THREE.Group();
  g.name = "porte_maison";
  const wood = matLib.get(QC_PALETTE.porte, 0.62, 0.08);
  g.add(buildDoorCasing(width + 0.08, height + 0.08, 0.14, matLib.get(QC_PALETTE.boiserie, 0.78)));
  const leaf = buildPanelLeaf(width, height, { wood });
  leaf.position.z = 0.02;
  g.add(leaf);
  const frame = matLib.get(QC_PALETTE.boiserie, 0.78);
  g.add(box(width * 0.72, 0.28, 0.05, frame, 0, height + 0.22, 0));
  g.add(box(width * 0.64, 0.2, 0.02, matLib.get(QC_PALETTE.fenetre, 0.22, 0.35), 0, height + 0.22, 0.03));
  g.add(box(0.03, 0.2, 0.03, frame, 0, height + 0.22, 0.03));
  return g;
}

const labelCache = new Map<string, THREE.MeshLambertMaterial>();

export function doorLabelMat(text: string, bg = "#c9a24a", fg = "#1a1208"): THREE.MeshLambertMaterial {
  const key = `${text}|${bg}|${fg}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 236, 108);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${text.length > 4 ? 48 : 72}px Georgia, "Times New Roman", serif`;
  ctx.fillText(text, 128, 66);
  const map = finishMap(new THREE.CanvasTexture(c), "clamp");
  const mat = new THREE.MeshLambertMaterial({ map, color: 0xffffff });
  mat.userData.csmWired = true;
  labelCache.set(key, mat);
  return mat;
}
