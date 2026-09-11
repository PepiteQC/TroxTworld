import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { loadGlb, markShared } from "./gltf";

export type FbxId = "casual" | "chemise" | "manches" | "costume" | "bear";

const FILES: Record<FbxId, { url: string; height: number }> = {
  casual: { url: "/models/male_casual.glb", height: 1.78 },
  chemise: { url: "/models/male_shirt.glb", height: 1.78 },
  manches: { url: "/models/male_longsleeve.glb", height: 1.78 },
  costume: { url: "/models/male_suit.glb", height: 1.78 },
  bear: { url: "/models/bear.glb", height: 1.12 },
};

const originals = new Map<FbxId, THREE.Group>();
const pending = new Map<FbxId, Promise<THREE.Group>>();
const box = new THREE.Box3();
const size = new THREE.Vector3();

function fitHeight(root: THREE.Object3D, height: number) {
  box.setFromObject(root);
  box.getSize(size);
  const h = size.y || 1;
  const s = height / h;
  root.scale.multiplyScalar(s);
  box.setFromObject(root);
  root.position.y -= box.min.y;
  root.rotation.y = Math.PI;
}

async function loadOriginal(id: FbxId): Promise<THREE.Group> {
  const hit = originals.get(id);
  if (hit) return hit;
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const spec = FILES[id];
  const job = loadGlb(spec.url).then((obj) => {
    originals.set(id, obj);
    pending.delete(id);
    return obj;
  });
  pending.set(id, job);
  return job;
}

export async function loadFbx(id: FbxId): Promise<THREE.Group> {
  const src = await loadOriginal(id);
  const copy = cloneSkinned(src) as THREE.Group;
  markShared(copy);
  const wrap = new THREE.Group();
  wrap.name = `fbx:${id}`;
  wrap.add(copy);
  fitHeight(wrap, FILES[id].height);
  wrap.userData.sharedAsset = true;
  const clips = src.animations ?? [];
  if (clips.length) {
    const mixer = new THREE.AnimationMixer(copy);
    mixer.clipAction(clips[0]!).play();
    wrap.userData.mixer = mixer;
  }
  return wrap;
}

export function isFbxModel(id: string): id is FbxId {
  return id in FILES && id !== "bear";
}

export function tickMixer(root: THREE.Object3D, dt: number) {
  const mixer = root.userData.mixer as THREE.AnimationMixer | undefined;
  if (mixer) mixer.update(dt);
}
