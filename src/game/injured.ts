import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { A40_Z, PAPETERIE, SQ_JAIL } from "./worlddata";
import { CRIME_SPOTS } from "./rp";

export const INJURED_CLIPS = [
  "limp_walk_right_leg",
  "limp_walk_left_leg",
  "walk_clutching_arm",
  "walk_clutching_side",
  "hobble_with_cane",
  "stagger_dizzy",
  "barely_stand_swaying",
  "exhausted_heavy_breathing",
  "hands_on_knees_exhausted",
  "lean_on_wall_rest",
  "back_pain_crouch",
  "collapse_to_knees",
  "crawl_exhausted",
  "curl_up_fetal",
  "drag_self_forward",
  "cough_fit",
  "cover_ears",
  "panic_look_around",
  "sob_crying",
  "neck_stiff_turn",
  "massage_shoulder",
  "bandage_arm",
  "inject_self",
  "drink_potion",
  "revive_gasp_awake",
  "revive_slowly_rise",
  "death_fall_forward",
  "death_fall_backward",
  "death_collapse_sideways",
  "death_on_knees",
] as const;

export type InjuredClip = (typeof INJURED_CLIPS)[number];

const SKIN = new THREE.MeshLambertMaterial({
  color: 0xe6ddd2,
  emissive: 0x2a2620,
  emissiveIntensity: 0.22,
  side: THREE.DoubleSide,
});
const JOINT = new THREE.MeshLambertMaterial({
  color: 0xa8a198,
  emissive: 0x1c1a16,
  emissiveIntensity: 0.16,
  side: THREE.DoubleSide,
});
const ONCE = /^(death_|collapse_|curl_up|revive_slowly)/;
const box = new THREE.Box3();
const size = new THREE.Vector3();
const cache = new Map<string, THREE.Group>();
const pending = new Map<string, Promise<THREE.Group>>();

export function isInjuredClip(id: string): id is InjuredClip {
  return (INJURED_CLIPS as readonly string[]).includes(id);
}

export function parseInjuredClip(id: string): InjuredClip {
  if (id === "injured" || id === "hurt" || id === "limp") return "limp_walk_right_leg";
  if (id === "exhaust" || id === "tired") return "exhausted_heavy_breathing";
  if (id === "death" || id === "dead") return "death_fall_forward";
  if (isInjuredClip(id)) return id;
  const hit = INJURED_CLIPS.find((c) => c.includes(id));
  return hit ?? "limp_walk_right_leg";
}

function dummy() {
  const g = new THREE.Group();
  g.name = "injured-dummy";
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.48, 4, 8), SKIN);
  torso.position.y = 1.12;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), SKIN);
  head.position.y = 1.58;
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), JOINT);
  hips.position.y = 0.86;
  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.55, 3, 6), SKIN);
  legL.position.set(-0.09, 0.42, 0);
  const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.55, 3, 6), SKIN);
  legR.position.set(0.09, 0.42, 0);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.42, 3, 6), SKIN);
  armL.position.set(-0.24, 1.18, 0);
  armL.rotation.z = 0.18;
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.42, 3, 6), SKIN);
  armR.position.set(0.24, 1.18, 0);
  armR.rotation.z = -0.18;
  for (const m of [torso, head, hips, legL, legR, armL, armR]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

function restyle(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = SKIN;
      mesh.frustumCulled = false;
      return;
    }
    const line = o as THREE.LineSegments;
    if (line.isLine || line.isLineSegments) {
      line.material = new THREE.LineBasicMaterial({ color: 0xc8c0b6 });
      line.frustumCulled = false;
    }
  });
}

function fitHeight(root: THREE.Object3D, h = 1.72) {
  box.setFromObject(root);
  box.getSize(size);
  const s = h / Math.max(0.2, size.y);
  root.scale.multiplyScalar(s);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
}

function loopClip(obj: THREE.Object3D, clips: THREE.AnimationClip[], id: InjuredClip) {
  if (!clips.length) return;
  const mixer = new THREE.AnimationMixer(obj);
  const action = mixer.clipAction(clips[0]!);
  action.reset();
  if (ONCE.test(id)) {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
  } else {
    action.setLoop(THREE.LoopRepeat, Infinity);
  }
  action.play();
  mixer.update(0.05);
  obj.userData.mixer = mixer;
}

async function loadClip(id: InjuredClip): Promise<THREE.Group> {
  const hit = cache.get(id);
  if (hit) return hit;
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const job = new FBXLoader()
    .loadAsync(`/models/injured/${id}.fbx`)
    .then((obj) => {
      restyle(obj);
      const wrap = new THREE.Group();
      wrap.name = `injured-src:${id}`;
      wrap.userData.clips = obj.animations ?? [];
      wrap.userData.sharedAsset = true;
      wrap.add(obj);
      fitHeight(wrap);
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

function markShared(root: THREE.Object3D) {
  root.userData.sharedAsset = true;
  root.traverse((o) => {
    o.userData.sharedAsset = true;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.frustumCulled = false;
  });
}

function instance(src: THREE.Group, id: InjuredClip) {
  const copy = cloneSkinned(src) as THREE.Group;
  copy.name = "injured-rig";
  markShared(copy);
  const clips = (src.userData.clips as THREE.AnimationClip[]) ?? [];
  const inner = copy.children[0] ?? copy;
  loopClip(inner, clips, id);
  return copy;
}

function fulfill(host: THREE.Group, src: THREE.Group, id: InjuredClip) {
  if (host.userData.loaded === id && host.getObjectByName("injured-rig")) return;
  const dummyMesh = host.getObjectByName("injured-dummy");
  dummyMesh?.parent?.remove(dummyMesh);
  const old = host.getObjectByName("injured-rig");
  old?.parent?.remove(old);
  host.add(instance(src, id));
  host.userData.loaded = id;
}

function mount(host: THREE.Group, id: InjuredClip) {
  host.userData.clip = id;
  const ready = cache.get(id);
  if (ready) {
    fulfill(host, ready, id);
    return;
  }
  loadClip(id)
    .then((src) => fulfill(host, src, id))
    .catch((err) => {
      host.userData.loadError = String(err);
      console.warn("[injured]", id, err);
    });
}

function hideOverlayBodies(root: THREE.Object3D) {
  if (!root.userData.injuredClip) return;
  const actor = root.getObjectByName("injured-actor");
  if (!actor) return;
  for (const child of root.children) {
    if (child === actor || child.name === "held-tool" || child.name === "backpack") {
      child.visible = true;
      continue;
    }
    child.visible = false;
  }
}

/** PNJ / builder — mannequin Motifect (clip Mixamo). */
export function injuredProp(clip = "limp_walk_right_leg"): THREE.Group {
  const id = parseInjuredClip(clip);
  const g = new THREE.Group();
  g.name = "injured";
  g.userData.prop = "injured";
  g.userData.clip = id;
  g.add(dummy());
  mount(g, id);
  return g;
}

export function tickInjured(root: THREE.Object3D, dt: number) {
  root.traverse((o) => {
    const mixer = o.userData.mixer as THREE.AnimationMixer | undefined;
    if (mixer) mixer.update(dt);
    if (o.userData.prop === "injured") {
      const id = o.userData.clip as InjuredClip | undefined;
      if (id && o.userData.loaded !== id) {
        const src = cache.get(id);
        if (src) fulfill(o as THREE.Group, src, id);
        else void loadClip(id).catch(() => undefined);
      }
    }
  });
  hideOverlayBodies(root);
}

/** Joue un clip sur le marcheur (overlay mannequin). */
export function playInjuredOn(host: THREE.Group, clip: string, manual = true) {
  const id = parseInjuredClip(clip);
  const old = host.getObjectByName("injured-actor");
  old?.parent?.remove(old);
  const actor = injuredProp(id);
  actor.name = "injured-actor";
  host.add(actor);
  host.userData.injuredClip = id;
  host.userData.injuredManual = manual;
  hideOverlayBodies(host);
}

export function clearInjuredOn(host: THREE.Group) {
  const old = host.getObjectByName("injured-actor");
  old?.parent?.remove(old);
  host.userData.injuredClip = null;
  host.userData.injuredManual = false;
  for (const child of host.children) child.visible = true;
}

export function pickInjuredClip(health: number, energy: number, moving: boolean): InjuredClip | null {
  if (health < 18) return moving ? "crawl_exhausted" : "curl_up_fetal";
  if (health < 35) return moving ? "limp_walk_right_leg" : "hands_on_knees_exhausted";
  if (energy < 18) return moving ? "hobble_with_cane" : "exhausted_heavy_breathing";
  if (energy < 32) return moving ? "stagger_dizzy" : "barely_stand_swaying";
  return null;
}

export interface HurtSpot {
  clip: InjuredClip;
  x: number;
  z: number;
  yaw: number;
}

/** PNJ blessés du comté — SQ, papeterie, crime, A-40. */
export function countyInjured(): HurtSpot[] {
  const c0 = CRIME_SPOTS[0]!;
  return [
    { clip: "limp_walk_right_leg", x: SQ_JAIL.x + 5.5, z: SQ_JAIL.z + 3.2, yaw: 0.7 },
    { clip: "hands_on_knees_exhausted", x: PAPETERIE.x + 10, z: PAPETERIE.z - 4, yaw: 2.2 },
    { clip: "walk_clutching_side", x: c0.x - 2.8, z: c0.z + 2.4, yaw: -0.5 },
    { clip: "stagger_dizzy", x: 22, z: A40_Z + 9, yaw: 0.3 },
  ];
}

export function preloadInjured(ids: InjuredClip[] = ["limp_walk_right_leg", "exhausted_heavy_breathing"]) {
  for (const id of ids) void loadClip(id).catch(() => undefined);
}
