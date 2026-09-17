import * as THREE from "three";

const box = new THREE.Box3();
const size = new THREE.Vector3();

let proto: THREE.Group | null = null;
let wood: THREE.MeshStandardMaterial | null = null;
let steel: THREE.MeshStandardMaterial | null = null;
let magMat: THREE.MeshStandardMaterial | null = null;

function finishMap(t: THREE.Texture, srgb: boolean, u = 0, v = 0, ru = 1, rv = 1) {
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.offset.set(u, v);
  t.repeat.set(ru, rv);
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function cloneUv(src: THREE.Texture, srgb: boolean, u: number, v: number, ru: number, rv: number) {
  const t = src.clone();
  return finishMap(t, srgb, u, v, ru, rv);
}

function ensureMats() {
  if (wood) return;
  wood = new THREE.MeshStandardMaterial({
    color: 0x8a4a28,
    roughness: 0.62,
    metalness: 0.05,
  });
  steel = new THREE.MeshStandardMaterial({
    color: 0x3a3c40,
    roughness: 0.4,
    metalness: 0.78,
  });
  magMat = new THREE.MeshStandardMaterial({
    color: 0x6e3a24,
    roughness: 0.7,
    metalness: 0.06,
  });
  const loader = new THREE.TextureLoader();
  loader.load("/textures/ak74/color.jpg", (color) => {
    wood!.map = finishMap(color, true, 0.38, 0.06, 0.2, 0.46);
    steel!.map = cloneUv(color, true, 0.04, 0.62, 0.28, 0.22);
    magMat!.map = cloneUv(color, true, 0.54, 0.22, 0.18, 0.34);
    wood!.color.setHex(0xffffff);
    steel!.color.setHex(0xc8c8c8);
    magMat!.color.setHex(0xffffff);
    wood!.needsUpdate = true;
    steel!.needsUpdate = true;
    magMat!.needsUpdate = true;
  });
  loader.load("/textures/ak74/normal.jpg", (nrm) => {
    wood!.normalMap = finishMap(nrm, false, 0.38, 0.06, 0.2, 0.46);
    wood!.normalScale.set(0.9, 0.9);
    steel!.normalMap = cloneUv(nrm, false, 0.04, 0.62, 0.28, 0.22);
    magMat!.normalMap = cloneUv(nrm, false, 0.54, 0.22, 0.18, 0.34);
    wood!.needsUpdate = true;
    steel!.needsUpdate = true;
    magMat!.needsUpdate = true;
  });
  loader.load("/textures/ak74/rough.jpg", (rough) => {
    wood!.roughnessMap = finishMap(rough, false, 0.38, 0.06, 0.2, 0.46);
    steel!.roughnessMap = cloneUv(rough, false, 0.04, 0.62, 0.28, 0.22);
    wood!.needsUpdate = true;
    steel!.needsUpdate = true;
  });
  loader.load("/textures/ak74/ao.png", (ao) => {
    wood!.aoMap = finishMap(ao, false, 0.38, 0.06, 0.2, 0.46);
    wood!.needsUpdate = true;
  });
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
  if (m.geometry.attributes.uv && !m.geometry.attributes.uv2) {
    m.geometry.setAttribute("uv2", m.geometry.attributes.uv);
  }
  g.add(m);
  return m;
}

function makeAk74(): THREE.Group {
  ensureMats();
  const w = wood!;
  const s = steel!;
  const mg = magMat!;
  const g = new THREE.Group();
  g.name = "ak74-src";

  const barrel = new THREE.CylinderGeometry(0.009, 0.01, 0.38, 10);
  add(g, barrel, s, 0.28, 0.055, 0, 0, 0, Math.PI / 2);

  const brake = new THREE.CylinderGeometry(0.016, 0.014, 0.07, 10);
  add(g, brake, s, 0.5, 0.055, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.012, 10), s, 0.535, 0.055, 0, 0, 0, Math.PI / 2);

  const gas = new THREE.CylinderGeometry(0.011, 0.012, 0.26, 8);
  add(g, gas, s, 0.18, 0.084, 0, 0, 0, Math.PI / 2);

  add(g, new THREE.BoxGeometry(0.03, 0.05, 0.018), s, 0.34, 0.1, 0);
  add(g, new THREE.BoxGeometry(0.008, 0.035, 0.008), s, 0.34, 0.128, 0);

  add(g, new THREE.BoxGeometry(0.22, 0.045, 0.052), w, 0.12, 0.038, 0);
  add(g, new THREE.BoxGeometry(0.2, 0.028, 0.04), w, 0.11, 0.072, 0);

  add(g, new THREE.BoxGeometry(0.24, 0.05, 0.042), s, -0.08, 0.048, 0);
  add(g, new THREE.BoxGeometry(0.24, 0.038, 0.006), s, -0.08, 0.07, -0.018);
  add(g, new THREE.BoxGeometry(0.04, 0.02, 0.042), s, 0.03, 0.082, 0);

  const carrier = new THREE.Group();
  carrier.name = "ak-carrier";
  carrier.position.set(-0.06, 0.078, 0);
  carrier.userData.part = "carrier";
  carrier.userData.hx = -0.06;
  add(carrier, new THREE.BoxGeometry(0.14, 0.022, 0.028), s, 0, 0, 0);
  add(carrier, new THREE.BoxGeometry(0.03, 0.018, 0.012), s, -0.06, 0.016, 0.012);
  add(carrier, new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8), s, 0.12, 0.012, 0, 0, 0, Math.PI / 2);
  const bolt = new THREE.Group();
  bolt.name = "ak-bolt";
  bolt.userData.part = "bolt";
  add(bolt, new THREE.CylinderGeometry(0.0075, 0.008, 0.07, 10), s, 0.02, 0, 0, 0, 0, Math.PI / 2);
  add(bolt, new THREE.BoxGeometry(0.01, 0.007, 0.018), s, 0.05, 0, 0);
  add(bolt, new THREE.BoxGeometry(0.01, 0.007, 0.018), s, 0.05, 0, 0, 0, 0, Math.PI / 2);
  carrier.add(bolt);
  g.add(carrier);

  const round = new THREE.Group();
  round.name = "ak-round";
  round.position.set(0.02, 0.07, 0);
  round.userData.part = "round";
  round.userData.hx = 0.02;
  round.userData.hy = 0.07;
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a48, roughness: 0.35, metalness: 0.7 });
  const copper = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.4, metalness: 0.55 });
  add(round, new THREE.CylinderGeometry(0.0048, 0.005, 0.04, 8), brass, 0, 0, 0, 0, 0, Math.PI / 2);
  add(round, new THREE.CylinderGeometry(0.004, 0.0046, 0.012, 8), copper, 0.024, 0, 0, 0, 0, Math.PI / 2);
  g.add(round);

  for (let i = 0; i < 6; i++) {
    add(g, new THREE.TorusGeometry(0.006, 0.0012, 5, 8), s, -0.18 - i * 0.008, 0.078, 0, 0, Math.PI / 2, 0);
  }

  const grip = new THREE.BoxGeometry(0.038, 0.11, 0.032);
  add(g, grip, w, -0.16, -0.04, 0, 0, 0, 0.35);

  add(g, new THREE.BoxGeometry(0.06, 0.012, 0.028), s, -0.12, -0.01, 0);
  add(g, new THREE.BoxGeometry(0.01, 0.028, 0.008), s, -0.1, 0.01, 0);

  const mag = new THREE.BoxGeometry(0.04, 0.16, 0.03);
  add(g, mag, mg, -0.02, -0.07, 0, 0, 0, 0.45);

  add(g, new THREE.BoxGeometry(0.26, 0.078, 0.04), w, -0.34, 0.052, 0);
  add(g, new THREE.BoxGeometry(0.028, 0.09, 0.042), s, -0.48, 0.05, 0);
  add(g, new THREE.BoxGeometry(0.02, 0.018, 0.018), s, -0.22, 0.02, 0);

  return g;
}

function fitWorld(root: THREE.Object3D, length = 0.94) {
  box.setFromObject(root);
  box.getSize(size);
  const s = length / Math.max(0.01, size.x);
  root.scale.multiplyScalar(s);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
}

function protoGun(): THREE.Group {
  if (proto) return proto;
  proto = makeAk74();
  return proto;
}

/** Fusil au sol / builder (~94 cm). */
export function ak74Prop(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ak74";
  const gun = protoGun().clone(true);
  gun.name = "ak74-rig";
  fitWorld(gun, 0.94);
  g.add(gun);
  g.userData.prop = "ak74";
  return g;
}

/** Fusil en main, canon vers l'avant. */
export function ak74Held(): THREE.Group {
  const inner = protoGun().clone(true);
  inner.name = "ak74-rig";
  inner.rotation.set(0, Math.PI / 2, 0);
  inner.userData.cycle = 1;
  inner.userData.t = 0;
  return inner;
}

/** Cycle gaz : piston → déverrouillage rotatif → extraction → relock. */
export function cycleAk74(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o.name !== "ak74-rig") return;
    o.userData.cycle = 1;
    o.userData.t = 0;
  });
}

function poseAk(rig: THREE.Object3D, t: number) {
  const carrier = rig.getObjectByName("ak-carrier");
  const bolt = rig.getObjectByName("ak-bolt");
  const round = rig.getObjectByName("ak-round");
  if (!carrier || !bolt) return;
  const hx = (carrier.userData.hx as number) ?? -0.06;
  const rx = (round?.userData.hx as number) ?? 0.02;
  const ry = (round?.userData.hy as number) ?? 0.07;

  let back = 0;
  if (t > 0.04 && t < 0.16) back = (t - 0.04) / 0.12;
  else if (t >= 0.16 && t < 0.28) back = 1;
  else if (t >= 0.28 && t < 0.48) back = 1 - (t - 0.28) / 0.2;

  let rot = 0;
  if (t > 0.05 && t < 0.14) rot = (t - 0.05) / 0.09;
  else if (t >= 0.14 && t < 0.34) rot = 1;
  else if (t >= 0.34 && t < 0.46) rot = 1 - (t - 0.34) / 0.12;

  carrier.position.x = hx - 0.11 * back;
  bolt.rotation.x = 0.62 * rot;

  if (round) {
    if (t > 0.12 && t < 0.32) {
      const u = (t - 0.12) / 0.2;
      round.visible = true;
      round.position.set(rx - u * 0.05, ry + u * 0.07, u * 0.1);
      round.rotation.z = u * 1.6;
    } else if (t >= 0.32 && t < 0.42) {
      const u = (t - 0.32) / 0.1;
      round.visible = true;
      round.position.set(rx - (1 - u) * 0.06, ry, 0);
      round.rotation.set(0, 0, 0);
    } else {
      round.visible = t < 0.12 || t > 0.42;
      round.position.set(rx, ry, 0);
      round.rotation.set(0, 0, 0);
    }
  }
}

export function tickAk74(root: THREE.Object3D, dt: number) {
  root.traverse((o) => {
    if (o.name !== "ak74-rig") return;
    if (!o.userData.cycle) return;
    o.userData.t = (o.userData.t as number) + dt;
    poseAk(o, o.userData.t as number);
    if ((o.userData.t as number) > 0.52) {
      o.userData.cycle = 0;
      o.userData.t = 0;
      poseAk(o, 0);
    }
  });
}