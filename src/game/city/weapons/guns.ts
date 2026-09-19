import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { matLib } from "../../materials";

export type GunId = "ar15" | "shotgun" | "pistol";

const FILES: Record<GunId, { url: string; length: number }> = {
  ar15: { url: "/models/guns/ar15.fbx", length: 0.84 },
  shotgun: { url: "/models/guns/shotgun.fbx", length: 0.92 },
  pistol: { url: "/models/guns/pistol.fbx", length: 0.22 },
};

const steel = matLib.get(0x3a3c40, 0.38, 0.78);
const polymer = matLib.get(0x1c1e22, 0.62, 0.12);
const wood = matLib.get(0x5a4030, 0.82, 0.04);
const box = new THREE.Box3();
const size = new THREE.Vector3();
const cache = new Map<GunId, THREE.Group>();
const pending = new Map<GunId, Promise<THREE.Group>>();

function dummy(id: GunId) {
  const g = new THREE.Group();
  g.name = `${id}-dummy`;
  if (id === "pistol") {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.034, 0.028), steel);
    slide.position.set(0.04, 0.02, 0);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.09, 0.024), polymer);
    grip.position.set(-0.02, -0.035, 0);
    grip.rotation.z = 0.16;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.055, 8), steel);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.12, 0.02, 0);
    g.add(slide, grip, barrel);
  } else if (id === "ar15") {
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.045), polymer);
    rec.position.set(0.02, 0.01, 0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8), steel);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.32, 0.02, 0);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.035), polymer);
    stock.position.set(-0.2, 0.0, 0);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.03), polymer);
    mag.position.set(0.0, -0.08, 0);
    mag.rotation.z = 0.08;
    const carry = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), steel);
    carry.position.set(0.04, 0.055, 0);
    g.add(rec, barrel, stock, mag, carry);
  } else {
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.04), steel);
    rec.position.set(0.04, 0.01, 0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), steel);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.36, 0.02, 0);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.032), wood);
    stock.position.set(-0.2, -0.01, 0);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.038), wood);
    pump.position.set(0.18, -0.02, 0);
    g.add(rec, barrel, stock, pump);
  }
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return g;
}

function fitLen(root: THREE.Object3D, length: number) {
  box.setFromObject(root);
  box.getSize(size);
  const dim = Math.max(size.x, size.z, 0.05);
  root.scale.multiplyScalar(length / dim);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= (box.min.y + box.max.y) / 2;
}

function meshCount(root: THREE.Object3D) {
  let n = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n++;
  });
  return n;
}

function restyle(root: THREE.Object3D, id: GunId) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const n = (mesh.name || "").toLowerCase();
    if (id === "shotgun" && (n.includes("stock") || n.includes("wood") || n.includes("cube.001"))) {
      mesh.material = wood;
    } else if (n.includes("grip") || n.includes("polymer") || n.includes("plastic") || n.includes("mag")) {
      mesh.material = polymer;
    } else {
      mesh.material = steel;
    }
  });
}

async function loadGun(id: GunId): Promise<THREE.Group> {
  const hit = cache.get(id);
  if (hit) return hit;
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const spec = FILES[id];
  const job = new FBXLoader()
    .loadAsync(spec.url)
    .then((obj) => {
      restyle(obj, id);
      const wrap = new THREE.Group();
      wrap.name = `gun-src:${id}`;
      wrap.userData.sharedAsset = true;
      wrap.add(obj);
      if (meshCount(obj) > 0) fitLen(wrap, spec.length);
      cache.set(id, wrap);
      pending.delete(id);
      return wrap;
    })
    .catch((err) => {
      pending.delete(id);
      throw err;
    });
  pending.set(id, job);
  return job;
}

function fulfill(host: THREE.Group, src: THREE.Group, id: GunId) {
  if (meshCount(src) === 0) return;
  if (host.userData.loaded === id && host.getObjectByName(`${id}-rig`)) return;
  const d = host.getObjectByName(`${id}-dummy`);
  d?.parent?.remove(d);
  const old = host.getObjectByName(`${id}-rig`);
  old?.parent?.remove(old);
  const copy = src.clone(true);
  copy.name = `${id}-rig`;
  copy.userData.sharedAsset = true;
  copy.traverse((o) => {
    o.userData.sharedAsset = true;
    const m = o as THREE.Mesh;
    if (m.isMesh) m.frustumCulled = false;
  });
  host.add(copy);
  host.userData.loaded = id;
}

function mount(host: THREE.Group, id: GunId) {
  host.userData.gunId = id;
  const ready = cache.get(id);
  if (ready) {
    fulfill(host, ready, id);
    return;
  }
  loadGun(id)
    .then((src) => fulfill(host, src, id))
    .catch((err) => {
      host.userData.loadError = String(err);
      console.warn("[guns]", id, err);
    });
}

export function tickGuns(root: THREE.Object3D) {
  root.traverse((o) => {
    const id = o.userData.gunId as GunId | undefined;
    if (!id || o.userData.loaded === id) return;
    const src = cache.get(id);
    if (src) fulfill(o as THREE.Group, src, id);
    else void loadGun(id).catch(() => undefined);
  });
}

export function gunProp(id: GunId): THREE.Group {
  const g = new THREE.Group();
  g.name = id;
  g.userData.prop = id;
  const inner = new THREE.Group();
  inner.add(dummy(id));
  mount(inner, id);
  g.add(inner);
  inner.position.y = 0.06;
  return g;
}

export function gunHeld(id: GunId): THREE.Group {
  const inner = new THREE.Group();
  inner.name = `${id}-held`;
  inner.add(dummy(id));
  mount(inner, id);
  inner.rotation.set(0, Math.PI / 2, 0);
  return inner;
}

export function ar15Prop() {
  return gunProp("ar15");
}
export function shotgunProp() {
  return gunProp("shotgun");
}
export function pistolProp() {
  return gunProp("pistol");
}
export function ar15Held() {
  return gunHeld("ar15");
}
export function shotgunHeld() {
  return gunHeld("shotgun");
}
export function pistolHeld() {
  return gunHeld("pistol");
}

export function preloadGuns() {
  for (const id of ["ar15", "shotgun", "pistol"] as const) void loadGun(id).catch(() => undefined);
}
