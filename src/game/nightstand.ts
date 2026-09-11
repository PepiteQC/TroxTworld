import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { tex } from "./textures";

const TARGET_W = 0.5;
const box = new THREE.Box3();
const size = new THREE.Vector3();

let proto: THREE.Group | null = null;
let inflight: Promise<THREE.Group> | null = null;

function woodMat() {
  return tex.pbr("noyer", null, 1.1, 1.6, 0.52, 0.06, 0x7d5340, 0.4);
}

function fit(root: THREE.Object3D) {
  box.setFromObject(root);
  box.getSize(size);
  const s = TARGET_W / Math.max(0.01, size.x);
  root.scale.multiplyScalar(s);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
}

async function loadProto(): Promise<THREE.Group> {
  if (proto) return proto;
  if (inflight) return inflight;
  inflight = new OBJLoader()
    .loadAsync("/models/nightstand.obj")
    .then((obj) => {
      const wood = woodMat();
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = wood;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      const wrap = new THREE.Group();
      wrap.name = "nightstand-src";
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

/** Clone le meuble Figuro, à l’échelle d’une table de nuit (~50 cm). */
export function mountNightstandMesh(host: THREE.Group) {
  const slot = new THREE.Group();
  slot.name = "nightstand-slot";
  host.add(slot);
  const token = { id: "nightstand" };
  slot.userData.nsToken = token;
  void loadProto()
    .then((src) => {
      if (slot.userData.nsToken !== token) return;
      const copy = src.clone(true);
      copy.name = "nightstand-rig";
      const dummy = host.getObjectByName("nightstand-dummy");
      if (dummy) dummy.visible = false;
      box.setFromObject(copy);
      const lamp = host.getObjectByName("nightstand-lamp");
      if (lamp) lamp.position.y = box.max.y + 0.12;
      slot.add(copy);
    })
    .catch(() => {
      /* cube procédural reste */
    });
  return slot;
}

export function nightstandHeight() {
  if (!proto) return 0.78;
  box.setFromObject(proto);
  return Math.max(0.55, box.max.y);
}
