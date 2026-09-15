import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const TARGET_H = 0.34;
const box = new THREE.Box3();
const size = new THREE.Vector3();

let proto: THREE.Group | null = null;
let inflight: Promise<THREE.Group> | null = null;

const body = new THREE.MeshLambertMaterial({ color: 0x141418 });
const fuse = new THREE.MeshLambertMaterial({ color: 0xc45a18, emissive: 0xff6a18, emissiveIntensity: 0.35 });
const eye = new THREE.MeshLambertMaterial({ color: 0xf2f2ea });

function dummyBomb() {
  const g = new THREE.Group();
  g.name = "bobomb-dummy";
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), body);
  sphere.position.y = 0.12;
  sphere.castShadow = true;
  g.add(sphere);
  const key = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 16), body);
  key.position.set(0, 0.2, 0);
  key.rotation.x = Math.PI / 2;
  g.add(key);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6), fuse);
  wick.position.set(0.02, 0.27, 0);
  wick.rotation.z = -0.4;
  g.add(wick);
  for (const sx of [-0.04, 0.04]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eye);
    e.position.set(sx, 0.14, 0.1);
    g.add(e);
  }
  return g;
}

function fit(root: THREE.Object3D) {
  box.setFromObject(root);
  box.getSize(size);
  const s = TARGET_H / Math.max(0.01, size.y);
  root.scale.multiplyScalar(s);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
}

async function loadProto(): Promise<THREE.Group> {
  if (proto) return proto;
  if (inflight) return inflight;
  inflight = new FBXLoader()
    .loadAsync("/models/bobomb.fbx")
    .then((obj) => {
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = body;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      const wrap = new THREE.Group();
      wrap.name = "bobomb-src";
      wrap.add(obj);
      fit(wrap);
      proto = wrap;
      inflight = null;
      return wrap;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

export function mountBobombMesh(host: THREE.Group) {
  const slot = new THREE.Group();
  slot.name = "bobomb-slot";
  host.add(slot);
  const token = { id: "bobomb" };
  slot.userData.bobToken = token;
  void loadProto()
    .then((src) => {
      if (slot.userData.bobToken !== token) return;
      const copy = src.clone(true);
      copy.name = "bobomb-rig";
      const dummy = host.getObjectByName("bobomb-dummy");
      if (dummy) dummy.visible = false;
      slot.add(copy);
    })
    .catch(() => {
      /* sphère procédurale reste */
    });
  return slot;
}

export function bobombProp(): THREE.Group {
  const g = new THREE.Group();
  g.name = "bobomb";
  g.add(dummyBomb());
  mountBobombMesh(g);
  g.userData.prop = "bobomb";
  return g;
}
