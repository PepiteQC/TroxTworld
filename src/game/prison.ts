import * as THREE from "three";
import { matLib } from "./materials";
import { finishMap } from "./textures";

const P = {
  beton: 0x9a9691,
  betonSombre: 0x54514d,
  sol: 0x6e6b66,
  acier: 0x3e4247,
  grillage: 0x6a6e72,
  neon: 0xffd88a,
  asphalte: 0x44474a,
  ligne: 0xd8d4c0,
  bleu: 0x2f4f6f,
};

const YARD = 36;
const PERIM = 72;

function signTex() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1a2430";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#c9a227";
  ctx.fillRect(0, 0, 512, 8);
  ctx.fillRect(0, 120, 512, 8);
  ctx.fillStyle = "#e8e4d8";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ÉTABLISSEMENT DE DONNACONA", 256, 58);
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#9aa4b0";
  ctx.fillText("SERVICE CORRECTIONNEL DU CANADA", 256, 92);
  const tex = new THREE.CanvasTexture(c);
  return finishMap(tex, "ui");
}

function buildFence(size: number, height: number) {
  const g = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.09, 0.11, height, 6);
  const postMat = matLib.get(P.acier, 0.55, 0.7);
  const n = Math.floor(size / 3.2) * 4;
  const posts = new THREE.InstancedMesh(postGeo, postMat, n + 8);
  const dummy = new THREE.Object3D();
  let i = 0;
  const half = size / 2;
  const step = 3.2;
  const sides: Array<[number, number, number, number]> = [
    [-half, half, 1, 0],
    [-half, -half, 0, 1],
    [half, -half, -1, 0],
    [half, half, 0, -1],
  ];
  for (const [sx, sz, dx, dz] of sides) {
    for (let t = 0; t < size; t += step) {
      dummy.position.set(sx + dx * t, height / 2, sz + dz * t);
      dummy.updateMatrix();
      posts.setMatrixAt(i++, dummy.matrix);
    }
  }
  posts.count = i;
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = true;
  g.add(posts);
  const meshMat = matLib.get(P.grillage, 0.7, 0.4);
  for (const [sx, sz, dx, dz] of sides) {
    const len = size;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(dx === 0 ? 0.06 : len, height - 0.4, dz === 0 ? 0.06 : len), meshMat);
    panel.position.set((dx === 0 ? sx : 0), height / 2, (dz === 0 ? sz : 0));
    panel.castShadow = true;
    g.add(panel);
  }
  const coilGeo = new THREE.TorusGeometry(0.22, 0.035, 5, 10);
  const coilMat = matLib.get(0xb0b4b8, 0.45, 0.75);
  const coils = new THREE.InstancedMesh(coilGeo, coilMat, i);
  let k = 0;
  for (const [sx, sz, dx, dz] of sides) {
    for (let t = 0; t < size; t += step) {
      dummy.position.set(sx + dx * t, height + 0.18, sz + dz * t);
      dummy.rotation.set(Math.PI / 2, 0, dx === 0 ? 0 : Math.PI / 2);
      dummy.updateMatrix();
      coils.setMatrixAt(k++, dummy.matrix);
    }
  }
  coils.count = k;
  coils.instanceMatrix.needsUpdate = true;
  g.add(coils);
  return g;
}

function buildTower() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 8.4, 8), matLib.get(P.betonSombre, 0.95));
  shaft.position.y = 4.2;
  shaft.castShadow = true;
  g.add(shaft);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 3.2), matLib.get(P.beton, 0.94));
  cabin.position.y = 9.4;
  cabin.castShadow = true;
  g.add(cabin);
  const glass = matLib.get(0x7a94ac, 0.15, 0.55);
  for (const [x, z] of [[0, 1.64], [0, -1.64], [1.64, 0], [-1.64, 0]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), glass);
    w.position.set(x, 9.5, z);
    if (Math.abs(x) > 0) w.rotation.y = Math.PI / 2;
    g.add(w);
  }
  const proj = new THREE.Group();
  proj.position.set(0, 10.7, 0);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.7), matLib.get(0x3a3e42, 0.5, 0.6));
  proj.add(housing);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 9, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.rotation.x = Math.PI / 2;
  beam.position.z = 4.6;
  beam.userData.prisonBeam = true;
  proj.add(beam);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), matLib.getEmissive(0xfff4d0, 0xfff4d0, 0.4));
  lens.position.z = 0.38;
  lens.userData.isPrisonLight = true;
  proj.add(lens);
  g.add(proj);
  g.userData.projector = proj;
  return g;
}

function buildBlock(letter: string) {
  const g = new THREE.Group();
  const w = 22;
  const d = 11;
  const h = 8.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(P.beton, 0.95));
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5), matLib.get(P.betonSombre, 0.95));
  roof.position.y = h + 0.15;
  roof.castShadow = true;
  g.add(roof);
  const barMat = matLib.get(P.acier, 0.55, 0.7);
  const glass = matLib.get(0x8aa4c0, 0.2, 0.5);
  let n = 0;
  for (let floor = 0; floor < 2; floor++) {
    for (let i = 0; i < 6; i++) {
      const x = -w / 2 + 2.4 + i * 3.4;
      const y = 2.2 + floor * 3.4;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.15), glass);
      win.position.set(x, y, d / 2 + 0.04);
      g.add(win);
      for (let b = 0; b < 4; b++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.18, 5), barMat);
        bar.position.set(x - 0.4 + b * 0.26, y, d / 2 + 0.08);
        g.add(bar);
        n++;
      }
    }
  }
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.08), matLib.get(P.bleu, 0.7));
  plaque.position.set(0, 5.6, d / 2 + 0.08);
  g.add(plaque);
  void n;
  g.name = `bloc_${letter}`;
  return g;
}

function buildYard() {
  const g = new THREE.Group();
  const court = new THREE.Mesh(new THREE.BoxGeometry(14, 0.06, 24), matLib.get(P.asphalte, 0.98));
  court.position.y = 0.04;
  court.receiveShadow = true;
  g.add(court);
  const line = matLib.get(P.ligne, 0.85);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 24), line);
  mid.position.y = 0.08;
  g.add(mid);
  for (const side of [-1, 1]) {
    const hoop = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), matLib.get(0x5a5e62, 0.55, 0.6));
    pole.position.y = 1.7;
    pole.castShadow = true;
    hoop.add(pole);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.06), matLib.get(0xd8d4cc, 0.7));
    board.position.set(0, 3.2, -side * 0.55);
    hoop.add(board);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 14), matLib.get(0xd04020, 0.5, 0.6));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 2.85, -side * 0.72);
    hoop.add(rim);
    hoop.position.set(0, 0, side * 12.4);
    g.add(hoop);
  }
  const benchMat = matLib.get(P.betonSombre, 0.96);
  for (const z of [-8, 0, 8]) {
    for (const x of [-16, 16]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 2.2), benchMat);
      seat.position.set(x, 0.45, z);
      seat.castShadow = true;
      g.add(seat);
    }
  }
  return g;
}

export interface BuiltPrison {
  group: THREE.Group;
  projectors: THREE.Object3D[];
  door: { x: number; z: number; yaw: number };
}

export function buildPrisonComplex(): BuiltPrison {
  const g = new THREE.Group();
  g.name = "penitencier_donnacona";
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(PERIM + 28, PERIM + 28), matLib.get(0x585a5c, 0.98));
  slab.rotation.x = -Math.PI / 2;
  slab.receiveShadow = true;
  g.add(slab);

  g.add(buildFence(PERIM, 5.4));

  const admin = new THREE.Mesh(new THREE.BoxGeometry(22, 6.4, 12), matLib.get(P.beton, 0.95));
  admin.position.set(0, 3.2, PERIM / 2 - 16);
  admin.castShadow = true;
  admin.receiveShadow = true;
  g.add(admin);
  const adminRoof = new THREE.Mesh(new THREE.BoxGeometry(23, 0.4, 13), matLib.get(P.betonSombre, 0.95));
  adminRoof.position.set(0, 6.6, PERIM / 2 - 16);
  adminRoof.castShadow = true;
  g.add(adminRoof);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4), new THREE.MeshBasicMaterial({ map: signTex() }));
  sign.position.set(0, 5.4, PERIM / 2 - 9.9);
  g.add(sign);

  const off = YARD / 2 + 10;
  const a = buildBlock("A");
  a.position.set(-off, 0, -6);
  g.add(a);
  const b = buildBlock("B");
  b.position.set(off, 0, -6);
  g.add(b);
  const c = buildBlock("C");
  c.position.set(-off, 0, 14);
  g.add(c);
  const d = buildBlock("D");
  d.position.set(off, 0, 14);
  g.add(d);

  g.add(buildYard());

  const common = new THREE.Mesh(new THREE.BoxGeometry(28, 5.6, 12), matLib.get(P.beton, 0.95));
  common.position.set(0, 2.8, -PERIM / 2 + 16);
  common.castShadow = true;
  g.add(common);

  const ctrl = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 4.6, 8), matLib.get(P.betonSombre, 0.95));
  ctrl.position.set(0, 2.3, -YARD / 2 - 4);
  ctrl.castShadow = true;
  g.add(ctrl);

  const projectors: THREE.Object3D[] = [];
  const towerOff = PERIM / 2 + 4;
  const spots: Array<[number, number]> = [
    [-towerOff, -towerOff],
    [towerOff, -towerOff],
    [-towerOff, towerOff],
    [towerOff, towerOff],
  ];
  spots.forEach(([x, z], i) => {
    const t = buildTower();
    t.position.set(x, 0, z);
    const proj = t.userData.projector as THREE.Object3D;
    proj.rotation.y = (i / 4) * Math.PI * 2;
    projectors.push(proj);
    g.add(t);
  });

  const gate = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 0.18), matLib.get(P.acier, 0.5, 0.7));
  gate.position.set(0, 1.7, PERIM / 2 - 0.2);
  g.add(gate);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), matLib.getEmissive(0xff3020, 0xff2010, 1.2));
  lamp.position.set(0, 3.55, PERIM / 2);
  lamp.userData.isPrisonLight = true;
  g.add(lamp);

  return {
    group: g,
    projectors,
    door: { x: 0, z: PERIM / 2 + 1.6, yaw: Math.PI },
  };
}

export function animatePrison(prison: BuiltPrison, elapsed: number, dt: number, night: boolean) {
  prison.projectors.forEach((p, i) => {
    p.rotation.y += dt * (0.16 + i * 0.03);
  });
  prison.group.traverse((obj) => {
    if (obj.userData.prisonBeam && obj instanceof THREE.Mesh) {
      const m = obj.material as THREE.MeshBasicMaterial;
      m.opacity = night ? 0.11 : 0;
    }
    if (obj.userData.isPrisonLight && obj instanceof THREE.Mesh) {
      const m = obj.material as THREE.MeshStandardMaterial;
      if (m.emissive) m.emissiveIntensity = night ? 1.6 : 0.2;
    }
  });
  void elapsed;
}

export type ChargeId =
  | "vol_simple"
  | "voies_de_fait"
  | "conduite_dangereuse"
  | "delit_de_fuite"
  | "arme_prohibee"
  | "trafic_stup"
  | "evasion";

export const CHARGE_CATALOG: Record<ChargeId, { label: string; minutes: number; fine: number }> = {
  vol_simple: { label: "Vol simple", minutes: 8, fine: 800 },
  voies_de_fait: { label: "Voies de fait", minutes: 12, fine: 1500 },
  conduite_dangereuse: { label: "Conduite dangereuse", minutes: 9, fine: 1400 },
  delit_de_fuite: { label: "Délit de fuite", minutes: 16, fine: 2600 },
  arme_prohibee: { label: "Arme prohibée", minutes: 25, fine: 5000 },
  trafic_stup: { label: "Trafic de stupéfiants", minutes: 26, fine: 6500 },
  evasion: { label: "Évasion", minutes: 40, fine: 8000 },
};

export interface Inmate {
  name: string;
  booking: string;
  charges: ChargeId[];
  minutes: number;
  served: number;
  bookedAt: number;
  lockdown: boolean;
}

let counter = 1000;

export class PrisonSystem {
  inmate: Inmate | null = null;
  lockdown = false;
  private until = 0;

  book(name: string, charges: ChargeId[]): Inmate {
    const list = charges.filter((c) => CHARGE_CATALOG[c]);
    const minutes = list.reduce((s, c) => s + CHARGE_CATALOG[c]!.minutes, 0) || 8;
    this.inmate = {
      name,
      booking: `PQ-${counter++}`,
      charges: list,
      minutes,
      served: 0,
      bookedAt: Date.now(),
      lockdown: this.lockdown,
    };
    return this.inmate;
  }

  tick(dtMinutes: number) {
    if (!this.inmate) return;
    this.inmate.served += dtMinutes;
    if (this.lockdown && Date.now() > this.until) this.endLockdown();
    if (this.inmate.served >= this.inmate.minutes) this.release();
  }

  startLockdown(minutes = 8) {
    this.lockdown = true;
    this.until = Date.now() + minutes * 60_000;
    if (this.inmate) this.inmate.lockdown = true;
  }

  endLockdown() {
    this.lockdown = false;
    if (this.inmate) this.inmate.lockdown = false;
  }

  release() {
    this.inmate = null;
  }

  remain(): number {
    if (!this.inmate) return 0;
    return Math.max(0, this.inmate.minutes - this.inmate.served);
  }
}

export const prisonSystem = new PrisonSystem();
