import * as THREE from "three";
import { matLib, type QcMat } from "./materials";
import { tex } from "./textures";

const box = new THREE.Box3();
const size = new THREE.Vector3();

let proto: THREE.Group | null = null;
let stockMat: QcMat | null = null;
let blueMat: QcMat | null = null;
let padMat: QcMat | null = null;
let brassMat: QcMat | null = null;
let glassMat: QcMat | null = null;
let copperMat: QcMat | null = null;
let springMat: QcMat | null = null;

function mats() {
  if (stockMat) return;
  stockMat = tex.pbr("noyer", null, 1.8, 0.55, 0.52, 0.05, 0xffffff, 0.4);
  blueMat = matLib.get(0x1c1e22, 0.32, 0.82);
  padMat = matLib.get(0x1a1210, 0.92, 0.02);
  brassMat = matLib.get(0xb08a48, 0.35, 0.7);
  copperMat = matLib.get(0x8a5a32, 0.4, 0.55);
  springMat = matLib.get(0x6a6e72, 0.28, 0.8);
  glassMat = matLib.glass(0x142418, 0.72);
}

function add(
  g: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function stockShape(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.50, 0.018);
  s.lineTo(-0.50, 0.098);
  s.lineTo(-0.36, 0.112);
  s.lineTo(-0.22, 0.092);
  s.lineTo(-0.155, 0.068);
  s.lineTo(-0.145, -0.078);
  s.lineTo(-0.095, -0.062);
  s.lineTo(-0.08, 0.016);
  s.lineTo(0.20, 0.020);
  s.lineTo(0.235, 0.048);
  s.lineTo(0.10, 0.068);
  s.lineTo(-0.10, 0.078);
  s.lineTo(-0.22, 0.082);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 2,
  });
  geo.translate(0, 0, -0.018);
  return geo;
}

function makeCartridge(g: THREE.Group) {
  mats();
  const round = new THREE.Group();
  round.name = "mech-round";
  add(round, new THREE.CylinderGeometry(0.0062, 0.0064, 0.046, 10), brassMat!, 0, 0, 0, 0, 0, Math.PI / 2);
  add(round, new THREE.CylinderGeometry(0.0052, 0.006, 0.018, 8), copperMat!, 0.028, 0, 0, 0, 0, Math.PI / 2);
  add(round, new THREE.CylinderGeometry(0.0066, 0.0066, 0.004, 10), brassMat!, -0.024, 0, 0, 0, 0, Math.PI / 2);
  round.position.set(0.04, 0.078, 0);
  round.userData.part = "round";
  round.userData.hx = 0.04;
  round.userData.hy = 0.078;
  round.userData.hz = 0;
  g.add(round);
  return round;
}

function makeBolt(g: THREE.Group) {
  mats();
  const steel = blueMat!;
  const bolt = new THREE.Group();
  bolt.name = "mech-bolt";
  add(bolt, new THREE.CylinderGeometry(0.009, 0.0095, 0.11, 12), steel, 0, 0, 0, 0, 0, Math.PI / 2);
  add(bolt, new THREE.BoxGeometry(0.012, 0.008, 0.02), steel, 0.048, 0, 0);
  add(bolt, new THREE.BoxGeometry(0.01, 0.006, 0.008), steel, 0.05, 0, 0.012);
  const handle = new THREE.Group();
  handle.name = "mech-handle";
  add(handle, new THREE.CylinderGeometry(0.0045, 0.005, 0.055, 8), steel, 0, 0, 0.028, 0.15, 0, 0);
  add(handle, new THREE.SphereGeometry(0.009, 8, 6), steel, 0, 0.01, 0.055);
  handle.userData.part = "handle";
  bolt.add(handle);

  const pin = new THREE.Group();
  pin.name = "mech-pin";
  add(pin, new THREE.CylinderGeometry(0.0022, 0.0022, 0.07, 6), steel, 0, 0, 0, 0, 0, Math.PI / 2);
  add(pin, new THREE.CylinderGeometry(0.004, 0.004, 0.01, 8), steel, -0.038, 0, 0, 0, 0, Math.PI / 2);
  pin.position.set(-0.012, 0, 0);
  pin.userData.part = "pin";
  pin.userData.hx = -0.012;
  bolt.add(pin);

  for (let i = 0; i < 5; i++) {
    add(bolt, new THREE.TorusGeometry(0.006, 0.0011, 5, 8), springMat!, -0.02 - i * 0.006, 0, 0, 0, Math.PI / 2, 0);
  }

  bolt.position.set(-0.02, 0.078, 0);
  bolt.userData.part = "bolt";
  bolt.userData.hx = -0.02;
  bolt.userData.hy = 0.078;
  g.add(bolt);
  return bolt;
}

function makeTriggerGroup(g: THREE.Group) {
  mats();
  const steel = blueMat!;
  const trig = new THREE.Group();
  trig.name = "mech-trigger";
  add(trig, new THREE.BoxGeometry(0.008, 0.024, 0.006), steel, 0, -0.01, 0);
  trig.position.set(-0.088, 0.03, 0);
  trig.userData.part = "trigger";
  g.add(trig);
  const sear = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.005, 0.006), steel);
  sear.position.set(-0.07, 0.048, 0);
  sear.name = "mech-sear";
  sear.userData.part = "sear";
  sear.castShadow = true;
  g.add(sear);
  return trig;
}

function makeRifle(): THREE.Group {
  mats();
  const g = new THREE.Group();
  g.name = "carabine-src";
  const wood = stockMat!;
  const steel = blueMat!;

  add(g, stockShape(), wood, 0, 0, 0);
  add(g, new THREE.BoxGeometry(0.028, 0.086, 0.042), padMat!, -0.514, 0.058, 0);

  add(g, new THREE.CylinderGeometry(0.0095, 0.011, 0.52, 12), steel, 0.30, 0.062, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.CylinderGeometry(0.013, 0.013, 0.018, 10), steel, 0.56, 0.062, 0, 0, 0, Math.PI / 2);

  add(g, new THREE.BoxGeometry(0.16, 0.01, 0.032), steel, -0.02, 0.062, 0);
  add(g, new THREE.BoxGeometry(0.16, 0.036, 0.008), steel, -0.02, 0.08, -0.016);
  add(g, new THREE.BoxGeometry(0.05, 0.012, 0.032), steel, -0.075, 0.094, 0);
  add(g, new THREE.BoxGeometry(0.03, 0.012, 0.032), steel, 0.045, 0.094, 0);

  makeBolt(g);
  makeCartridge(g);
  makeTriggerGroup(g);

  add(g, new THREE.BoxGeometry(0.055, 0.01, 0.024), steel, -0.10, 0.012, 0);
  add(g, new THREE.BoxGeometry(0.012, 0.012, 0.012), brassMat!, -0.055, 0.022, 0);

  add(g, new THREE.BoxGeometry(0.018, 0.022, 0.01), steel, 0.22, 0.086, 0);
  add(g, new THREE.BoxGeometry(0.006, 0.018, 0.006), steel, 0.22, 0.104, 0);

  add(g, new THREE.CylinderGeometry(0.014, 0.014, 0.16, 10), steel, -0.01, 0.122, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.CylinderGeometry(0.018, 0.016, 0.04, 10), steel, -0.08, 0.122, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.CylinderGeometry(0.017, 0.015, 0.034, 10), steel, 0.06, 0.122, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.CircleGeometry(0.012, 10), glassMat!, -0.101, 0.122, 0, 0, Math.PI / 2, 0);
  add(g, new THREE.CircleGeometry(0.011, 10), glassMat!, 0.078, 0.122, 0, 0, -Math.PI / 2, 0);
  add(g, new THREE.BoxGeometry(0.04, 0.012, 0.012), steel, -0.02, 0.102, 0);

  add(g, new THREE.TorusGeometry(0.008, 0.0022, 6, 10), steel, -0.42, 0.02, 0, Math.PI / 2, 0, 0);
  add(g, new THREE.TorusGeometry(0.008, 0.0022, 6, 10), steel, 0.18, 0.02, 0, Math.PI / 2, 0, 0);

  g.userData.cycle = 0;
  g.userData.t = 0;
  return g;
}

function fitFloor(root: THREE.Object3D, length = 1.08) {
  box.setFromObject(root);
  box.getSize(size);
  const s = length / Math.max(0.01, size.x);
  root.scale.multiplyScalar(s);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
}

function protoRifle(): THREE.Group {
  if (proto) return proto;
  proto = makeRifle();
  return proto;
}

/** Carabine de chasse au sol / builder (~1,08 m). */
export function carabineProp(): THREE.Group {
  const g = new THREE.Group();
  g.name = "carabine";
  const gun = protoRifle().clone(true);
  gun.name = "carabine-rig";
  fitFloor(gun, 1.08);
  g.add(gun);
  g.userData.prop = "carabine";
  return g;
}

/** Carabine en main, canon vers l’avant. */
export function carabineHeld(): THREE.Group {
  const inner = protoRifle().clone(true);
  inner.name = "carabine-rig";
  inner.rotation.set(0, Math.PI / 2, 0);
  inner.userData.cycle = 1;
  inner.userData.t = 0;
  return inner;
}

/** Déclenche le cycle verrou (tir → extraction → chambrage). */
export function cycleCarabine(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o.name !== "carabine-rig") return;
    o.userData.cycle = 1;
    o.userData.t = 0;
  });
}

function pose(rig: THREE.Object3D, t: number) {
  const bolt = rig.getObjectByName("mech-bolt");
  const handle = rig.getObjectByName("mech-handle");
  const pin = rig.getObjectByName("mech-pin");
  const trig = rig.getObjectByName("mech-trigger");
  const round = rig.getObjectByName("mech-round");
  const sear = rig.getObjectByName("mech-sear");
  if (!bolt || !handle || !pin || !trig) return;

  const hx = (bolt.userData.hx as number) ?? -0.02;
  const hy = (bolt.userData.hy as number) ?? 0.078;
  const px = (pin.userData.hx as number) ?? -0.012;
  const rx = (round?.userData.hx as number) ?? 0.04;
  const ry = (round?.userData.hy as number) ?? 0.078;

  const trigPull = t < 0.08 ? t / 0.08 : t < 0.2 ? 1 : Math.max(0, 1 - (t - 0.2) / 0.15);
  trig.rotation.z = -0.45 * trigPull;
  if (sear) sear.rotation.z = -0.25 * trigPull;

  const fired = t > 0.05 && t < 0.55;
  pin.position.x = px + (fired ? 0.028 : 0);

  let lift = 0;
  let back = 0;
  if (t > 0.14 && t < 0.32) lift = (t - 0.14) / 0.18;
  else if (t >= 0.32 && t < 0.88) lift = 1;
  else if (t >= 0.88 && t < 1.05) lift = 1 - (t - 0.88) / 0.17;

  if (t > 0.3 && t < 0.52) back = (t - 0.3) / 0.22;
  else if (t >= 0.52 && t < 0.7) back = 1;
  else if (t >= 0.7 && t < 0.88) back = 1 - (t - 0.7) / 0.18;

  handle.rotation.x = -1.15 * lift;
  bolt.position.set(hx - 0.09 * back, hy, 0);

  if (round) {
    if (t > 0.38 && t < 0.7) {
      const u = (t - 0.38) / 0.32;
      round.visible = true;
      round.position.set(rx - 0.05 - u * 0.04, ry + u * 0.08, u * 0.11);
      round.rotation.z = u * 1.4;
    } else if (t >= 0.7 && t < 0.86) {
      const u = (t - 0.7) / 0.16;
      round.visible = true;
      round.position.set(rx - (1 - u) * 0.08, ry, 0);
      round.rotation.set(0, 0, 0);
    } else {
      round.visible = t < 0.38 || t > 0.86;
      round.position.set(rx, ry, 0);
      round.rotation.set(0, 0, 0);
    }
  }
}

export function tickCarabine(root: THREE.Object3D, dt: number) {
  root.traverse((o) => {
    if (o.name !== "carabine-rig") return;
    if (!o.userData.cycle) return;
    o.userData.t = (o.userData.t as number) + dt;
    pose(o, o.userData.t as number);
    if ((o.userData.t as number) > 1.12) {
      o.userData.cycle = 0;
      o.userData.t = 0;
      pose(o, 0);
    }
  });
}
