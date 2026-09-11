import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { tex } from "./textures";

const TARGET_W = 2.15;
const box = new THREE.Box3();
const size = new THREE.Vector3();

let proto: THREE.Group | null = null;
let inflight: Promise<THREE.Group> | null = null;

function clothMat() {
  return tex.cloth("laineTricot", "laineKnitNrm", 2.4, 1.6, 0.9, 0x4a4a6a, 0.92);
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
    .loadAsync("/models/sofa.obj")
    .then((obj) => {
      const cloth = clothMat();
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = cloth;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      const wrap = new THREE.Group();
      wrap.name = "sofa-src";
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

/** Clone le sofa Blender (laine), 3 places ~2.15 m. */
export function mountSofaMesh(host: THREE.Group) {
  const slot = new THREE.Group();
  slot.name = "sofa-slot";
  host.add(slot);
  const token = { id: "sofa" };
  slot.userData.sofaToken = token;
  void loadProto()
    .then((src) => {
      if (slot.userData.sofaToken !== token) return;
      const copy = src.clone(true);
      copy.name = "sofa-rig";
      const dummy = host.getObjectByName("sofa-dummy");
      if (dummy) dummy.visible = false;
      slot.add(copy);
    })
    .catch(() => {
      /* cubes procéduraux restent */
    });
  return slot;
}
