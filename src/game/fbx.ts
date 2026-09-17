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

function fitHeight(root: THREE.Object3D, targetHeight: number) {
  root.updateMatrixWorld(true);

  const bbox = new THREE.Box3().setFromObject(root);
  const currentHeight = bbox.max.y - bbox.min.y;

  if (currentHeight > 0.001) {
    const scaleRatio = targetHeight / currentHeight;
    root.scale.multiplyScalar(scaleRatio);
  }

  root.updateMatrixWorld(true);
  const bboxAfter = new THREE.Box3().setFromObject(root);
  root.position.y -= bboxAfter.min.y;
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

  copy.traverse((child: any) => {
    if (child.isMesh || child.isSkinnedMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
    }
  });

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

export function tickMixer(root: THREE.Object3D, dt: number, speedMultiplier: number = 1) {
  const mixer = root.userData.mixer as THREE.AnimationMixer | undefined;
  if (mixer) {
    // N'avance l'animation que si le personnage est réellement en mouvement
    if (speedMultiplier > 0.05) {
      mixer.update(dt * speedMultiplier);
    }
  }
}

