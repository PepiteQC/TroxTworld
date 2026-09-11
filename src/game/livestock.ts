import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { legalFarmsteads } from "./farms";
import { getTerrainHeight } from "./worlddata";

export type StockKind = "vache" | "poulailler";

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
  readyAt: number;
  mesh: THREE.Group;
  padW: number;
  padD: number;
  padYaw: number;
}

function farmToWorld(x: number, z: number, yaw: number, ox: number, oz: number) {
  return {
    x: x + Math.cos(yaw) * ox - Math.sin(yaw) * oz,
    z: z + Math.sin(yaw) * ox + Math.cos(yaw) * oz,
  };
}

export function buildHolstein(seed = 1): THREE.Group {
  const g = new THREE.Group();
  g.name = "holstein";
  const white = matLib.get(0xf2efe8, 0.92, 0);
  const black = matLib.get(0x1a1816, 0.95, 0);
  const pink = matLib.get(0xd4a090, 0.7, 0);
  const body = new THREE.Mesh(getGeo("box", { w: 0.72, h: 0.7, d: 1.45 }), white);
  body.position.y = 0.95;
  body.castShadow = true;
  g.add(body);
  const patchA = new THREE.Mesh(getGeo("box", { w: 0.38, h: 0.42, d: 0.55 }), black);
  patchA.position.set(seed % 2 === 0 ? 0.22 : -0.2, 1.02, 0.22);
  g.add(patchA);
  const patchB = new THREE.Mesh(getGeo("box", { w: 0.32, h: 0.3, d: 0.4 }), black);
  patchB.position.set(seed % 2 === 0 ? -0.2 : 0.18, 1.08, -0.38);
  g.add(patchB);
  const head = new THREE.Mesh(getGeo("box", { w: 0.38, h: 0.32, d: 0.42 }), white);
  head.position.set(0, 1.22, -0.88);
  head.castShadow = true;
  g.add(head);
  const snout = new THREE.Mesh(getGeo("box", { w: 0.28, h: 0.18, d: 0.22 }), pink);
  snout.position.set(0, 1.08, -1.12);
  g.add(snout);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(getGeo("box", { w: 0.12, h: 0.16, d: 0.06 }), white);
    ear.position.set(sx * 0.26, 1.38, -0.82);
    ear.rotation.z = sx * 0.4;
    g.add(ear);
  }
  const udder = new THREE.Mesh(getGeo("sphere", { r: 0.16, seg: 6, segH: 4 }), pink);
  udder.position.set(0, 0.62, 0.18);
  g.add(udder);
  const tail = new THREE.Mesh(getGeo("cylinder", { r: 0.03, r2: 0.02, h: 0.7, seg: 4 }), black);
  tail.position.set(0, 1.05, 0.82);
  tail.rotation.x = 0.45;
  g.add(tail);
  for (const [lx, lz] of [
    [-0.22, 0.48],
    [0.22, 0.48],
    [-0.22, -0.48],
    [0.22, -0.48],
  ] as const) {
    const leg = new THREE.Mesh(getGeo("cylinder", { r: 0.07, r2: 0.08, h: 0.62, seg: 5 }), black);
    leg.position.set(lx, 0.32, lz);
    leg.castShadow = true;
    g.add(leg);
  }
  return g;
}

function buildHen(i: number): THREE.Group {
  const g = new THREE.Group();
  const bodyC = i % 3 === 0 ? 0xc8b090 : i % 3 === 1 ? 0xe8d8b0 : 0x9a7a48;
  const body = new THREE.Mesh(getGeo("sphere", { r: 0.13, seg: 6, segH: 4 }), matLib.get(bodyC, 0.9, 0));
  body.position.y = 0.2;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(getGeo("sphere", { r: 0.07, seg: 5, segH: 4 }), matLib.get(bodyC, 0.9, 0));
  head.position.set(0, 0.32, -0.1);
  g.add(head);
  const comb = new THREE.Mesh(getGeo("box", { w: 0.04, h: 0.06, d: 0.08 }), matLib.get(0xa02828, 0.8, 0));
  comb.position.set(0, 0.4, -0.1);
  g.add(comb);
  const beak = new THREE.Mesh(getGeo("cone", { r: 0.025, h: 0.06, seg: 4 }), matLib.get(0xe8a020, 0.7, 0));
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 0.3, -0.17);
  g.add(beak);
  return g;
}

function buildCoop(): THREE.Group {
  const g = new THREE.Group();
  g.name = "poulailler";
  const wood = matLib.get(0x7a5a38, 0.92, 0);
  const house = new THREE.Mesh(getGeo("box", { w: 2.2, h: 1.4, d: 1.6 }), wood);
  house.position.y = 0.7;
  house.castShadow = true;
  g.add(house);
  const roof = new THREE.Mesh(getGeo("box", { w: 2.5, h: 0.1, d: 1.9 }), matLib.get(0x8a3a28, 0.75, 0.1));
  roof.position.y = 1.5;
  roof.rotation.x = 0.12;
  g.add(roof);
  const ramp = new THREE.Mesh(getGeo("box", { w: 0.5, h: 0.06, d: 0.9 }), wood);
  ramp.position.set(0, 0.22, 1.1);
  ramp.rotation.x = -0.4;
  g.add(ramp);
  const run = new THREE.Mesh(getGeo("box", { w: 3.4, h: 0.04, d: 2.8 }), matLib.get(0x5a6a38, 1, 0));
  run.position.set(0, 0.02, 2.2);
  run.receiveShadow = true;
  g.add(run);
  const wire = matLib.get(0x8a8a82, 0.4, 0.55);
  for (const z of [0.85, 3.55]) {
    const rail = new THREE.Mesh(getGeo("box", { w: 3.4, h: 0.7, d: 0.04 }), wire);
    rail.position.set(0, 0.4, z);
    g.add(rail);
  }
  for (const x of [-1.7, 1.7]) {
    const rail = new THREE.Mesh(getGeo("box", { w: 0.04, h: 0.7, d: 2.7 }), wire);
    rail.position.set(x, 0.4, 2.2);
    g.add(rail);
  }
  for (let i = 0; i < 4; i++) {
    const hen = buildHen(i);
    hen.position.set(-0.9 + i * 0.6, 0, 2.1 + (i % 2) * 0.45);
    hen.rotation.y = i * 0.7;
    hen.userData.hen = true;
    hen.userData.phase = i * 1.3;
    g.add(hen);
  }
  return g;
}

function buildPaddock(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(getGeo("box", { w, h: 0.06, d }), matLib.get(0x4a6a38, 1, 0));
  grass.position.y = 0.03;
  grass.receiveShadow = true;
  g.add(grass);
  const postGeo = getGeo("cylinder", { r: 0.07, r2: 0.09, h: 1.15, seg: 5 });
  const postMat = matLib.get(0x6a5a48, 0.92, 0);
  const posts: Array<[number, number]> = [];
  const step = 4.6;
  for (let x = -w / 2; x <= w / 2 + 0.01; x += step) posts.push([x, -d / 2], [x, d / 2]);
  for (let z = -d / 2 + step; z < d / 2; z += step) posts.push([-w / 2, z], [w / 2, z]);
  const mesh = new THREE.InstancedMesh(postGeo, postMat, posts.length);
  mesh.castShadow = true;
  const dummy = new THREE.Object3D();
  posts.forEach(([x, z], i) => {
    dummy.position.set(x, 0.55, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  g.add(mesh);
  const railMat = matLib.get(0x5a4a3a, 0.9, 0);
  for (const z of [-d / 2, d / 2]) {
    const rail = new THREE.Mesh(getGeo("box", { w, h: 0.06, d: 0.05 }), railMat);
    rail.position.set(0, 0.78, z);
    g.add(rail);
  }
  for (const x of [-w / 2, w / 2]) {
    const rail = new THREE.Mesh(getGeo("box", { w: 0.05, h: 0.06, d }), railMat);
    rail.position.set(x, 0.78, 0);
    g.add(rail);
  }
  const trough = new THREE.Mesh(getGeo("box", { w: 1.8, h: 0.35, d: 0.55 }), matLib.get(0x6a6a70, 0.55, 0.35));
  trough.position.set(0, 0.22, d / 2 - 1.2);
  g.add(trough);
  const water = new THREE.Mesh(getGeo("box", { w: 1.55, h: 0.04, d: 0.38 }), matLib.get(0x3a6a88, 0.15, 0.4));
  water.position.set(0, 0.4, d / 2 - 1.2);
  g.add(water);
  return g;
}

export function mountHerd(parent: THREE.Group): Stock[] {
  const stock: Stock[] = [];
  for (const farm of legalFarmsteads()) {
    const pad = farmToWorld(farm.x, farm.z, farm.yaw, -22, 2);
    const padW = 16;
    const padD = 14;
    const paddock = buildPaddock(padW, padD);
    paddock.position.set(pad.x, getTerrainHeight(pad.x, pad.z), pad.z);
    paddock.rotation.y = farm.yaw;
    parent.add(paddock);

    const nCows = 3;
    for (let i = 0; i < nCows; i++) {
      const ox = (i - 1) * 3.4;
      const oz = (i % 2 === 0 ? -2.2 : 2.4);
      const p = farmToWorld(pad.x, pad.z, farm.yaw, ox, oz);
      const cow = buildHolstein(farm.id.length + i);
      cow.position.set(p.x, getTerrainHeight(p.x, p.z), p.z);
      cow.rotation.y = farm.yaw + i * 0.4;
      parent.add(cow);
      stock.push({
        id: `${farm.id}_cow_${i}`,
        kind: "vache",
        farmId: farm.id,
        name: `Holstein · ${farm.name}`,
        x: p.x,
        z: p.z,
        homeX: pad.x,
        homeZ: pad.z,
        yaw: farm.yaw + i * 0.4,
        hunger: 0.7 + (i % 3) * 0.1,
        readyAt: 4 + i * 3,
        mesh: cow,
        padW,
        padD,
        padYaw: farm.yaw,
      });
    }

    const coopPos = farmToWorld(farm.x, farm.z, farm.yaw, 8, 9);
    const coop = buildCoop();
    coop.position.set(coopPos.x, getTerrainHeight(coopPos.x, coopPos.z), coopPos.z);
    coop.rotation.y = farm.yaw;
    parent.add(coop);
    stock.push({
      id: `${farm.id}_coop`,
      kind: "poulailler",
      farmId: farm.id,
      name: `Poulailler · ${farm.village}`,
      x: coopPos.x,
      z: coopPos.z + Math.cos(farm.yaw) * 2.2,
      homeX: coopPos.x,
      homeZ: coopPos.z,
      yaw: farm.yaw,
      hunger: 0.65,
      readyAt: 8,
      mesh: coop,
      padW: 4,
      padD: 5,
      padYaw: farm.yaw,
    });
  }
  return stock;
}

export function nearestStock(list: Stock[], x: number, z: number, max = 3.4): Stock | null {
  let best: Stock | null = null;
  let bestD = max;
  for (const s of list) {
    const reach = s.kind === "poulailler" ? 3.6 : 2.8;
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
  if (s.kind === "vache") {
    if (ready) return `E — Traire · ${s.name}`;
    if (s.hunger < 0.38) return hasFeed ? `E — Nourrir · foin` : `Holstein affamée · foin du rang`;
    const wait = Math.max(1, Math.ceil(s.readyAt - elapsed));
    return `Holstein · lait dans ${wait} s`;
  }
  if (ready) return `E — Ramasser les œufs · ${s.name}`;
  if (s.hunger < 0.38) return hasFeed ? `E — Grainer · blé` : `Poules affamées · blé du rang`;
  const wait = Math.max(1, Math.ceil(s.readyAt - elapsed));
  return `Poulailler · œufs dans ${wait} s`;
}

export interface StockWorkResult {
  ok: boolean;
  notice: string;
  loot?: { id: string; n: number };
  consume?: string;
}

export function workStock(s: Stock, elapsed: number, hasHay: boolean, hasWheat: boolean): StockWorkResult {
  if (s.kind === "vache") {
    if (elapsed >= s.readyAt) {
      s.readyAt = elapsed + (s.hunger > 0.5 ? 14 : 22);
      s.hunger = Math.max(0.1, s.hunger - 0.28);
      return { ok: true, notice: `Trait · bidon de lait · ${s.name}`, loot: { id: "lait_rang", n: 1 } };
    }
    if (s.hunger < 0.38) {
      if (!hasHay) return { ok: false, notice: "Pas de foin · récoltez un rang." };
      s.hunger = 1;
      s.readyAt = Math.min(s.readyAt, elapsed + 8);
      return { ok: true, notice: `Nourrie · Holstein`, consume: "foin" };
    }
    return { ok: false, notice: "Pas encore de lait." };
  }
  if (elapsed >= s.readyAt) {
    s.readyAt = elapsed + (s.hunger > 0.5 ? 12 : 20);
    s.hunger = Math.max(0.1, s.hunger - 0.22);
    return { ok: true, notice: `Œufs · ${s.name}`, loot: { id: "oeufs", n: 2 } };
  }
  if (s.hunger < 0.38) {
    if (!hasWheat) return { ok: false, notice: "Pas de blé · sac." };
    s.hunger = 1;
    s.readyAt = Math.min(s.readyAt, elapsed + 6);
    return { ok: true, notice: `Poules grainées`, consume: "ble" };
  }
  return { ok: false, notice: "Pas encore d'œufs." };
}

export function tickHerd(list: Stock[], dt: number, elapsed: number) {
  for (const s of list) {
    s.hunger = Math.max(0, s.hunger - dt * 0.01);
    if (s.kind === "vache") {
      const phase = elapsed * (0.22 + (s.id.length % 5) * 0.03) + s.id.length;
      const ox = Math.cos(phase) * (s.padW * 0.28);
      const oz = Math.sin(phase * 0.85) * (s.padD * 0.28);
      const c = Math.cos(s.padYaw);
      const sn = Math.sin(s.padYaw);
      s.x = s.homeX + c * ox - sn * oz;
      s.z = s.homeZ + sn * ox + c * oz;
      const tx = s.x - s.mesh.position.x;
      const tz = s.z - s.mesh.position.z;
      if (Math.hypot(tx, tz) > 0.04) s.yaw = Math.atan2(-tx, -tz);
      s.mesh.position.set(s.x, getTerrainHeight(s.x, s.z), s.z);
      s.mesh.rotation.y = s.yaw;
    } else {
      s.mesh.traverse((obj) => {
        if (!obj.userData.hen) return;
        const t = elapsed * 2.4 + (obj.userData.phase as number);
        obj.rotation.x = Math.sin(t) * 0.18;
      });
    }
  }
}
