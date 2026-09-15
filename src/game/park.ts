/**
 * Parc municipal + cimetière paroissial — low draw-call.
 * InstancedMesh, géométries partagées, Lambert. Pensé pour N villages.
 */
import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib, QC_PALETTE } from "./materials";
import { makeRng } from "./rng";

type Pose = {
  x: number;
  y: number;
  z: number;
  yaw?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: number;
};

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, poses: Pose[], cast = true): THREE.InstancedMesh {
  const n = Math.max(1, poses.length);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.count = poses.length;
  let colored = false;
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.yaw ?? 0, 0);
    dummy.scale.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (p.color !== undefined) {
      mesh.setColorAt(i, tint.setHex(p.color));
      colored = true;
    }
  }
  dummy.scale.set(1, 1, 1);
  dummy.rotation.set(0, 0, 0);
  mesh.instanceMatrix.needsUpdate = true;
  if (colored && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function lawn(width: number, depth: number, hex: number, y = 0.02): THREE.Mesh {
  const mesh = new THREE.Mesh(getGeo("plane", { w: width, h: depth }), matLib.get(hex, 1, 0));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

function pathStrip(w: number, d: number, x: number, z: number, hex = 0x9a9086): THREE.Mesh {
  const mesh = new THREE.Mesh(getGeo("plane", { w, h: d }), matLib.get(hex, 0.96, 0));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.04, z);
  mesh.receiveShadow = true;
  return mesh;
}

/** Parc québécois : kiosque, allées, érables, bancs, lampadaires. */
export function buildPark(width: number, depth: number, seed = 1867, simple = false): THREE.Group {
  const g = new THREE.Group();
  g.name = "parc";
  const rng = makeRng(seed + 41);
  const w = Math.max(14, width);
  const d = Math.max(14, depth);
  g.add(lawn(w, d, 0x3e6a34));

  const gravel = 0x9a9086;
  g.add(pathStrip(w * 0.92, 2.2, 0, 0, gravel));
  g.add(pathStrip(2.2, d * 0.92, 0, 0, gravel));
  if (simple) {
    g.userData.landmark = "parc";
    g.userData.footprint = { width: w, depth: d };
    return g;
  }
  const ring = new THREE.Mesh(
    getGeo("ring", { r: Math.min(w, d) * 0.22, r2: Math.min(w, d) * 0.16, seg: 20 }),
    matLib.get(gravel, 0.96, 0),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.045;
  g.add(ring);

  const wood = matLib.get(QC_PALETTE.boisBlanc, 0.9, 0);
  const tole = matLib.get(QC_PALETTE.toleVerte, 0.75, 0.15);
  const floor = new THREE.Mesh(getGeo("cylinder", { r: 3.1, h: 0.14, seg: 8 }), wood);
  floor.position.y = 0.12;
  g.add(floor);
  const roof = new THREE.Mesh(getGeo("cone", { r: 3.7, h: 1.9, seg: 8 }), tole);
  roof.position.y = 4.15;
  roof.castShadow = true;
  g.add(roof);
  const cols: Pose[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cols.push({ x: Math.cos(a) * 2.65, y: 1.45, z: Math.sin(a) * 2.65 });
  }
  g.add(instanced(getGeo("cylinder", { r: 0.1, r2: 0.12, h: 2.7, seg: 6 }), wood, cols));

  const hw = w * 0.42;
  const hd = d * 0.42;
  const treePos: Pose[] = [];
  const leafPos: Pose[] = [];
  const autumnPos: Pose[] = [];
  const nTrees = Math.min(18, 6 + Math.floor((w * d) / 90));
  for (let i = 0; i < nTrees; i++) {
    const a = rng() * Math.PI * 2;
    const r = 5.2 + rng() * Math.min(hw, hd) * 0.72;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) < 2.4 && Math.abs(z) < 2.4) continue;
    if (Math.abs(x) < 1.2 || Math.abs(z) < 1.2) continue;
    const s = 0.72 + rng() * 0.55;
    treePos.push({ x, y: 1.9 * s, z, sx: s, sy: s, sz: s, yaw: rng() * 6 });
    leafPos.push({ x, y: 3.6 * s, z, sx: s, sy: s * 0.85, sz: s });
    if (rng() > 0.62) autumnPos.push({ x: x + 0.4, y: 3.2 * s, z: z - 0.3, sx: s * 0.7, sy: s * 0.6, sz: s * 0.7 });
  }
  g.add(instanced(getGeo("cylinder", { r: 0.16, r2: 0.26, h: 4.0, seg: 6 }), matLib.get(0x4a3020, 0.95, 0), treePos));
  g.add(instanced(getGeo("sphere", { r: 2.15, seg: 7, segH: 5 }), matLib.get(0x2d6a30, 0.95, 0), leafPos));
  if (autumnPos.length) {
    g.add(instanced(getGeo("sphere", { r: 1.7, seg: 6, segH: 5 }), matLib.get(0xc84a20, 0.95, 0), autumnPos, false));
  }

  const benches: Pose[] = [];
  for (const [x, z, yaw] of [
    [-6.2, 3.4, 0.4],
    [6.2, 3.4, -0.4],
    [-6.2, -3.4, Math.PI - 0.4],
    [6.2, -3.4, Math.PI + 0.4],
    [3.6, 7.2, Math.PI / 2],
    [-3.6, -7.2, -Math.PI / 2],
  ] as Array<[number, number, number]>) {
    if (Math.abs(x) > hw || Math.abs(z) > hd) continue;
    benches.push({ x, y: 0.46, z, yaw });
  }
  if (benches.length) {
    g.add(instanced(getGeo("box", { w: 1.5, h: 0.08, d: 0.4 }), matLib.get(0x6a4a28, 0.92, 0), benches));
    g.add(
      instanced(
        getGeo("box", { w: 1.5, h: 0.4, d: 0.07 }),
        matLib.get(0x6a4a28, 0.92, 0),
        benches.map((p) => ({ ...p, y: 0.7, z: p.z + Math.cos(p.yaw ?? 0) * -0.18 })),
      ),
    );
  }

  const lamps: Pose[] = [];
  const heads: Pose[] = [];
  for (const [x, z] of [
    [-w * 0.28, -d * 0.28],
    [w * 0.28, -d * 0.28],
    [-w * 0.28, d * 0.28],
    [w * 0.28, d * 0.28],
  ] as Array<[number, number]>) {
    lamps.push({ x, y: 2.1, z });
    heads.push({ x, y: 4.15, z });
  }
  g.add(instanced(getGeo("cylinder", { r: 0.07, r2: 0.09, h: 4.2, seg: 6 }), matLib.get(0x3a3e42, 0.55, 0.4), lamps));
  const bulbs = instanced(getGeo("box", { w: 0.34, h: 0.1, d: 0.5 }), matLib.getEmissive(0xfff0c0, 0xffc870, 0.08), heads, false);
  bulbs.userData.isStreetlight = true;
  g.add(bulbs);

  const beds: Pose[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const r = Math.min(w, d) * 0.28;
    beds.push({
      x: Math.cos(a) * r,
      y: 0.12,
      z: Math.sin(a) * r,
      yaw: a,
      color: [0xb03a4a, 0xd4a017, 0x6a2a48, 0xe8e0d0][i % 4],
    });
  }
  g.add(instanced(getGeo("box", { w: 1.1, h: 0.22, d: 0.7 }), matLib.get(0x3a5a28, 0.95, 0), beds, false));

  if (w > 20 && d > 20) {
    const basin = new THREE.Mesh(getGeo("cylinder", { r: 1.6, h: 0.28, seg: 12 }), matLib.get(QC_PALETTE.pierreGrise, 0.9, 0));
    basin.position.set(0, 0.2, 0);
    g.add(basin);
    const water = new THREE.Mesh(getGeo("cylinder", { r: 1.35, h: 0.05, seg: 12 }), matLib.water(0x2a6a7a, 0.55));
    water.position.set(0, 0.34, 0);
    g.add(water);
  }

  const plaque = new THREE.Mesh(getGeo("box", { w: 1.6, h: 0.7, d: 0.08 }), matLib.get(0x3a4a3c, 0.7, 0.2));
  plaque.position.set(0, 0.9, Math.min(d, w) * 0.36);
  g.add(plaque);

  g.userData.landmark = "parc";
  g.userData.footprint = { width: w, depth: d };
  return g;
}

/** Cimetière paroissial : clôture de fer, stèles, cèdres, allées de gravier. */
export function buildCemetery(width: number, depth: number, seed = 1894): THREE.Group {
  const g = new THREE.Group();
  g.name = "cimetiere";
  const rng = makeRng(seed + 77);
  const w = Math.max(16, width);
  const d = Math.max(18, depth);
  const hw = w / 2;
  const hd = d / 2;
  g.add(lawn(w, d, 0x3a5234, 0.018));

  g.add(pathStrip(2.0, d * 0.9, 0, 0, 0x8a8478));
  g.add(pathStrip(w * 0.72, 1.7, 0, -hd * 0.18, 0x8a8478));

  const iron = matLib.get(0x2a2c2e, 0.55, 0.35);
  const posts: Pose[] = [];
  const rails: Pose[] = [];
  const step = 1.55;
  const gateW = 2.4;
  for (let x = -hw + 0.2; x <= hw - 0.2; x += step) {
    const skipFront = Math.abs(x) < gateW && true;
    posts.push({ x, y: 0.7, z: -hd + 0.12 });
    rails.push({ x, y: 0.95, z: -hd + 0.12, sx: step * 0.92, sy: 1, sz: 1 });
    if (!skipFront) {
      posts.push({ x, y: 0.7, z: hd - 0.12 });
      rails.push({ x, y: 0.95, z: hd - 0.12, sx: step * 0.92, sy: 1, sz: 1 });
    }
  }
  for (let z = -hd + step; z <= hd - step; z += step) {
    posts.push({ x: -hw + 0.12, y: 0.7, z, yaw: Math.PI / 2 });
    posts.push({ x: hw - 0.12, y: 0.7, z, yaw: Math.PI / 2 });
    rails.push({ x: -hw + 0.12, y: 0.95, z, yaw: Math.PI / 2, sx: step * 0.92 });
    rails.push({ x: hw - 0.12, y: 0.95, z, yaw: Math.PI / 2, sx: step * 0.92 });
  }
  g.add(instanced(getGeo("box", { w: 0.09, h: 1.4, d: 0.09 }), iron, posts));
  g.add(instanced(getGeo("box", { w: 1.5, h: 0.05, d: 0.05 }), iron, rails, false));

  const pillarL = new THREE.Mesh(getGeo("box", { w: 0.42, h: 1.8, d: 0.42 }), matLib.get(QC_PALETTE.pierreGrise, 0.94, 0));
  pillarL.position.set(-gateW, 0.9, hd - 0.1);
  pillarL.castShadow = true;
  const pillarR = pillarL.clone();
  pillarR.position.x = gateW;
  g.add(pillarL, pillarR);
  const arch = new THREE.Mesh(getGeo("box", { w: gateW * 2 + 0.6, h: 0.22, d: 0.28 }), matLib.get(QC_PALETTE.pierreGrise, 0.94, 0));
  arch.position.set(0, 1.85, hd - 0.1);
  g.add(arch);
  const crossV = new THREE.Mesh(getGeo("box", { w: 0.1, h: 0.9, d: 0.1 }), matLib.get(0xd8d4c0, 0.4, 0.55));
  crossV.position.set(0, 2.5, hd - 0.1);
  const crossH = new THREE.Mesh(getGeo("box", { w: 0.46, h: 0.1, d: 0.1 }), matLib.get(0xd8d4c0, 0.4, 0.55));
  crossH.position.set(0, 2.62, hd - 0.1);
  g.add(crossV, crossH);

  const stoneA = matLib.get(0x8a8880, 0.96, 0);
  const stoneB = matLib.get(0x6a6864, 0.94, 0);
  const slabs: Pose[] = [];
  const crosses: Pose[] = [];
  const rows = Math.max(3, Math.floor((d - 8) / 3.1));
  const cols = Math.max(4, Math.floor((w - 6) / 2.6));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * 2.55 + (rng() - 0.5) * 0.25;
      const z = -hd + 4.2 + row * 3.05 + (rng() - 0.5) * 0.2;
      if (Math.abs(x) < 1.15) continue;
      if (z > hd - 3.2) continue;
      const yaw = (rng() - 0.5) * 0.08;
      if (rng() > 0.22) {
        slabs.push({
          x,
          y: 0.55 + rng() * 0.12,
          z,
          yaw,
          sy: 0.85 + rng() * 0.35,
          color: rng() > 0.5 ? 0x8a8880 : 0x6e6c68,
        });
      } else {
        crosses.push({ x, y: 0.7, z, yaw, sy: 0.8 + rng() * 0.4 });
      }
    }
  }
  if (slabs.length) g.add(instanced(getGeo("box", { w: 0.52, h: 0.95, d: 0.14 }), stoneA, slabs));
  if (crosses.length) {
    g.add(instanced(getGeo("box", { w: 0.1, h: 1.15, d: 0.1 }), stoneB, crosses));
    g.add(
      instanced(
        getGeo("box", { w: 0.55, h: 0.1, d: 0.1 }),
        stoneB,
        crosses.map((p) => ({ ...p, y: (p.y ?? 0.7) + 0.22 })),
      ),
    );
  }

  const cedars: Pose[] = [];
  const trunks: Pose[] = [];
  const nCedar = Math.min(10, 4 + Math.floor(w / 8));
  for (let i = 0; i < nCedar; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (hw - 1.6 - rng() * 1.2);
    const z = -hd + 3 + (i / nCedar) * (d - 7) + (rng() - 0.5);
    const s = 0.85 + rng() * 0.45;
    trunks.push({ x, y: 1.1 * s, z, sx: s * 0.7, sy: s, sz: s * 0.7 });
    cedars.push({ x, y: 2.4 * s, z, sx: s * 0.55, sy: s, sz: s * 0.55 });
  }
  g.add(instanced(getGeo("cylinder", { r: 0.14, r2: 0.2, h: 2.2, seg: 6 }), matLib.get(0x3a2818, 0.96, 0), trunks));
  g.add(instanced(getGeo("cone", { r: 1.15, h: 4.2, seg: 7 }), matLib.get(0x1e3a28, 0.95, 0), cedars));

  if (w > 20) {
    const chapel = new THREE.Mesh(getGeo("box", { w: 3.4, h: 2.8, d: 4.2 }), matLib.get(QC_PALETTE.pierreGrise, 0.94, 0));
    chapel.position.set(-hw + 3.4, 1.4, -hd + 3.6);
    chapel.castShadow = true;
    g.add(chapel);
    const chapelRoof = new THREE.Mesh(getGeo("cone", { r: 2.4, h: 1.6, seg: 4 }), matLib.get(QC_PALETTE.toleArgent, 0.45, 0.4));
    chapelRoof.position.set(-hw + 3.4, 3.5, -hd + 3.6);
    chapelRoof.rotation.y = Math.PI / 4;
    g.add(chapelRoof);
  }

  const pots: Pose[] = [];
  for (let i = 0; i < Math.min(14, slabs.length); i++) {
    const s = slabs[i]!;
    pots.push({
      x: s.x + 0.38,
      y: 0.12,
      z: s.z + 0.2,
      color: [0xa04838, 0x6a2a48, 0xd4a017][i % 3],
    });
  }
  if (pots.length) g.add(instanced(getGeo("cylinder", { r: 0.12, r2: 0.1, h: 0.2, seg: 6 }), matLib.get(0x6a3a28, 0.9, 0), pots, false));

  g.userData.landmark = "cimetiere";
  g.userData.footprint = { width: w, depth: d };
  return g;
}
