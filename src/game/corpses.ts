import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { A40_Z, PRISON, SQ_JAIL } from "./worlddata";
import { CRIME_SPOTS } from "./rp";

export const DEAD_SIT = [
  "sit_01", "sit_02", "sit_03", "sit_04", "sit_05",
  "sit_06", "sit_07", "sit_08", "sit_09",
] as const;

export const DEAD_LIE = [
  "lie_01", "lie_02", "lie_03", "lie_04", "lie_05",
  "lie_06", "lie_07", "lie_08", "lie_09", "lie_10",
  "lie_11", "lie_12", "lie_13", "lie_14", "lie_15",
  "lie_16", "lie_17", "lie_18", "lie_19", "lie_20", "lie_21",
] as const;

export type DeadPoseId = (typeof DEAD_SIT)[number] | (typeof DEAD_LIE)[number];

const SKIN = new THREE.MeshStandardMaterial({
  color: 0xb89a7a,
  roughness: 0.88,
  metalness: 0.02,
});
const CLOTH = new THREE.MeshStandardMaterial({
  color: 0x3a3e46,
  roughness: 0.9,
  metalness: 0.04,
});

const cache = new Map<string, THREE.Group>();
const pending = new Map<string, Promise<THREE.Group>>();
const box = new THREE.Box3();
const size = new THREE.Vector3();

export function isDeadPose(id: string): id is DeadPoseId {
  return (DEAD_SIT as readonly string[]).includes(id) || (DEAD_LIE as readonly string[]).includes(id);
}

export function parseDeadPose(id: string): DeadPoseId {
  if (id === "corpse_sit" || id === "corpse-sit") return "sit_01";
  if (id === "corpse" || id === "corpse_lie") return "lie_01";
  if (isDeadPose(id)) return id;
  return "lie_01";
}

function isSit(id: string) {
  return id.startsWith("sit");
}

function dummy(sit: boolean) {
  const g = new THREE.Group();
  g.name = "corpse-dummy";
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(sit ? 0.38 : 0.42, sit ? 0.55 : 0.22, sit ? 0.22 : 1.55),
    CLOTH,
  );
  torso.castShadow = true;
  torso.receiveShadow = true;
  if (sit) {
    torso.position.set(0, 0.55, 0.02);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), SKIN);
    head.position.set(0.04, 0.96, 0.02);
    head.castShadow = true;
    g.add(torso, head);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.55), CLOTH);
    leg.position.set(0.08, 0.14, 0.32);
    g.add(leg);
  } else {
    torso.position.set(0, 0.12, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), SKIN);
    head.position.set(0, 0.14, 0.82);
    g.add(torso, head);
  }
  return g;
}

function restyle(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const name = (mesh.name || "").toLowerCase();
    mesh.material = name.includes("head") || name.includes("face") ? SKIN : CLOTH;
  });
}

function fitPose(root: THREE.Object3D, sit: boolean) {
  box.setFromObject(root);
  box.getSize(size);
  const target = sit ? 1.12 : 1.72;
  const dim = sit ? Math.max(size.y, 0.4) : Math.max(size.x, size.z, 0.4);
  root.scale.multiplyScalar(target / dim);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
}

function freezeClip(obj: THREE.Group) {
  const clips = obj.animations ?? [];
  if (!clips.length) return;
  const mixer = new THREE.AnimationMixer(obj);
  const action = mixer.clipAction(clips[0]!);
  action.play();
  action.paused = true;
  action.time = clips[0]!.duration;
  mixer.update(0);
}

async function loadPose(id: DeadPoseId): Promise<THREE.Group> {
  const hit = cache.get(id);
  if (hit) return hit;
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const job = new FBXLoader()
    .loadAsync(`/models/dead/${id}.fbx`)
    .then((obj) => {
      freezeClip(obj);
      restyle(obj);
      const wrap = new THREE.Group();
      wrap.name = `dead-src:${id}`;
      wrap.add(obj);
      fitPose(wrap, isSit(id));
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

function mount(host: THREE.Group, id: DeadPoseId) {
  loadPose(id)
    .then((src) => {
      const dummyMesh = host.getObjectByName("corpse-dummy");
      if (dummyMesh) host.remove(dummyMesh);
      const copy = src.clone(true);
      copy.name = "dead-rig";
      host.add(copy);
    })
    .catch(() => {
      /* dummy stays */
    });
}

/** Corps au sol / builder. 30 poses mocap (9 assis, 21 couchés). */
export function corpseProp(pose = "lie_01"): THREE.Group {
  const id = parseDeadPose(pose);
  const g = new THREE.Group();
  g.name = isSit(id) ? "corpse_sit" : "corpse";
  g.userData.prop = g.name;
  g.userData.pose = id;
  g.add(dummy(isSit(id)));
  mount(g, id);
  return g;
}

export interface BodySpot {
  pose: DeadPoseId;
  x: number;
  z: number;
  yaw: number;
}

/** Scènes du comté — crime, SQ, A-40, prison. */
export function countyBodies(): BodySpot[] {
  const c0 = CRIME_SPOTS[0]!;
  const c1 = CRIME_SPOTS[1]!;
  const c2 = CRIME_SPOTS[2]!;
  const c3 = CRIME_SPOTS[3]!;
  return [
    { pose: "lie_04", x: c0.x + 2.4, z: c0.z - 1.6, yaw: 1.2 },
    { pose: "sit_01", x: SQ_JAIL.x + 3.2, z: SQ_JAIL.z - 2.4, yaw: -0.4 },
    { pose: "lie_10", x: 18, z: A40_Z + 7, yaw: 0.2 },
    { pose: "sit_07", x: PRISON.x + 14, z: PRISON.z + 6, yaw: 2.6 },
    { pose: "lie_16", x: -620, z: -540, yaw: 0.8 },
    { pose: "sit_05", x: c1.x + 1.8, z: c1.z + 2.2, yaw: 1.1 },
    { pose: "lie_01", x: c2.x - 2, z: c2.z - 1.4, yaw: -0.6 },
    { pose: "sit_09", x: c3.x + 1.5, z: c3.z - 2, yaw: 0.3 },
  ];
}
