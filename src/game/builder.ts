import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { buildFromMeta, MODEL_ALIAS, MODEL_CATEGORIES, placeableModels } from "./models";
import { isDeadPose } from "./corpses";
import { isInjuredClip } from "./injured";

export type PropId = string;

export interface PropDef {
  id: PropId;
  label: string;
  cat: string;
}

export const PROP_CATALOG: { cat: string; items: PropDef[] }[] = [
  {
    cat: "Primitives",
    items: [
      { id: "cube", label: "Cube", cat: "Primitives" },
      { id: "sphere", label: "Sphère", cat: "Primitives" },
      { id: "cylinder", label: "Cylindre", cat: "Primitives" },
      { id: "plane", label: "Dalle", cat: "Primitives" },
    ],
  },
  {
    cat: "Nature",
    items: [
      { id: "tree", label: "Épinette", cat: "Nature" },
      { id: "rock", label: "Rocher", cat: "Nature" },
      { id: "bush", label: "Buisson", cat: "Nature" },
    ],
  },
  {
    cat: "Structures",
    items: [
      { id: "wall", label: "Mur", cat: "Structures" },
      { id: "pillar", label: "Pilier", cat: "Structures" },
      { id: "ramp", label: "Rampe", cat: "Structures" },
      { id: "arch", label: "Arche", cat: "Structures" },
    ],
  },
  {
    cat: "Lumières",
    items: [
      { id: "lamp_post", label: "Lampadaire", cat: "Lumières" },
      { id: "spot", label: "Spot", cat: "Lumières" },
      { id: "neon", label: "Néon", cat: "Lumières" },
    ],
  },
  {
    cat: "Décor",
    items: [
      { id: "bench", label: "Banc", cat: "Décor" },
      { id: "crate", label: "Caisse", cat: "Décor" },
      { id: "barrel", label: "Tonneau", cat: "Décor" },
      { id: "sign", label: "Panneau", cat: "Décor" },
    ],
  },
  {
    cat: "GMod",
    items: [
      { id: "chair", label: "Chaise", cat: "GMod" },
      { id: "table", label: "Table", cat: "GMod" },
      { id: "trampoline", label: "Trampoline", cat: "GMod" },
      { id: "mine", label: "Mine", cat: "GMod" },
      { id: "portal", label: "Portail", cat: "GMod" },
      { id: "checkpoint", label: "Checkpoint", cat: "GMod" },
      { id: "wreck", label: "Carcasse", cat: "GMod" },
      { id: "bomb", label: "Bombe", cat: "GMod" },
      { id: "cone", label: "Cône", cat: "GMod" },
      { id: "torus", label: "Tore", cat: "GMod" },
    ],
  },
];

for (const cat of MODEL_CATEGORIES) {
  const items = placeableModels()
    .filter((d) => d.category === cat.id)
    .map((d) => ({ id: d.id, label: d.label, cat: cat.label }));
  if (items.length) PROP_CATALOG.push({ cat: cat.label, items });
}

export const PROP_IDS = PROP_CATALOG.flatMap((c) => c.items.map((i) => i.id));

export function isPropId(id: string): id is PropId {
  if ((PROP_IDS as string[]).includes(id)) return true;
  const alias = MODEL_ALIAS[id];
  if (alias && (PROP_IDS as string[]).includes(alias)) return true;
  return isDeadPose(id) || isInjuredClip(id);
}

export interface PlacedProp {
  id: string;
  type: PropId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
}

export function parsePlaced(raw: unknown): PlacedProp[] {
  if (!Array.isArray(raw)) return [];
  const out: PlacedProp[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const d = row as Partial<PlacedProp>;
    if (!isPropId(String(d.type))) continue;
    if (typeof d.x !== "number" || typeof d.z !== "number") continue;
    out.push({
      id: typeof d.id === "string" ? d.id : `p${out.length}`,
      type: d.type as PropId,
      x: d.x,
      y: typeof d.y === "number" ? d.y : 0,
      z: d.z,
      yaw: typeof d.yaw === "number" ? d.yaw : 0,
      scale: typeof d.scale === "number" ? Math.max(0.25, Math.min(6, d.scale)) : 1,
    });
    if (out.length >= 80) break;
  }
  return out;
}

function box(w: number, h: number, d: number, y: number, color: number, rx = 0.9) {
  const m = new THREE.Mesh(getGeo("box", { w, h, d }), matLib.get(color, rx));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function mesh(kind: Parameters<typeof getGeo>[0], p: Parameters<typeof getGeo>[1], color: number, y: number, rx = 0.85) {
  const m = new THREE.Mesh(getGeo(kind, p), matLib.get(color, rx));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildProp(type: PropId): THREE.Group {
  const g = new THREE.Group();
  g.name = type;
  if (type === "cube") g.add(box(1.2, 1.2, 1.2, 0.6, 0x5a6a88));
  else if (type === "sphere") {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), matLib.get(0x6a5a88, 0.7));
    m.position.y = 0.7;
    m.castShadow = true;
    g.add(m);
  } else if (type === "cylinder") {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 10), matLib.get(0x4a5a70));
    m.position.y = 0.7;
    m.castShadow = true;
    g.add(m);
  } else if (type === "plane") g.add(box(2.4, 0.08, 2.4, 0.04, 0x6a6660));
  else if (type === "tree") {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.4, 5), matLib.get(0x4a3828, 0.98));
    t.position.y = 0.7;
    t.castShadow = true;
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 6), matLib.get(0x24422c, 1));
    c.position.y = 2.4;
    c.castShadow = true;
    g.add(t, c);
  } else if (type === "rock") {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), matLib.get(0x6a6258, 1));
    m.position.y = 0.4;
    m.castShadow = true;
    g.add(m);
  } else if (type === "bush") {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), matLib.get(0x2a5a32, 1));
    m.position.y = 0.45;
    m.scale.set(1.3, 0.8, 1.1);
    m.castShadow = true;
    g.add(m);
  } else if (type === "wall") g.add(box(3.2, 2.2, 0.28, 1.1, 0x8a6a4a));
  else if (type === "pillar") g.add(box(0.42, 3.2, 0.42, 1.6, 0x9a9086));
  else if (type === "ramp") {
    const m = box(2.4, 0.16, 3.2, 0.08, 0x6a6660);
    m.rotation.x = -0.32;
    m.position.z = 0.2;
    m.position.y = 0.5;
    g.add(m);
  } else if (type === "arch") {
    g.add(box(0.4, 2.4, 0.4, 1.2, 0x8a8580));
    g.children[0]!.position.x = -1.1;
    const r = box(0.4, 2.4, 0.4, 1.2, 0x8a8580);
    r.position.x = 1.1;
    g.add(r, box(2.6, 0.36, 0.4, 2.5, 0x8a8580));
  } else if (type === "lamp_post") {
    g.add(box(0.12, 3.1, 0.12, 1.55, 0x2a2a2e, 0.4));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), matLib.getEmissive(0xffd88a, 0xffd88a, 1.4));
    lamp.position.y = 3.2;
    g.add(lamp);
  } else if (type === "spot") {
    g.add(box(0.2, 0.16, 0.28, 0.2, 0x2a2a2e, 0.35));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), matLib.getEmissive(0xffe0a0, 0xffe0a0, 1.6));
    lamp.position.set(0, 0.32, 0.04);
    g.add(lamp);
  } else if (type === "neon") {
    const n = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), matLib.getEmissive(0x3ad0e0, 0x3ad0e0, 1.8));
    n.position.y = 1.4;
    g.add(box(0.08, 1.4, 0.08, 0.7, 0x1a1a1e), n);
  } else if (type === "bench") {
    g.add(box(1.6, 0.1, 0.46, 0.46, 0x5a4030), box(0.1, 0.46, 0.46, 0.23, 0x3a2a20), box(0.1, 0.46, 0.46, 0.23, 0x3a2a20));
    g.children[1]!.position.x = -0.7;
    g.children[2]!.position.x = 0.7;
  } else if (type === "crate") g.add(box(0.9, 0.9, 0.9, 0.45, 0x6a4028));
  else if (type === "barrel") {
    const m = new THREE.Mesh(getGeo("cylinder", { r: 0.38, r2: 0.4, h: 0.95, seg: 10 }), matLib.get(0x5a3a1a, 0.7, 0.15));
    m.position.y = 0.48;
    m.castShadow = true;
    g.add(m);
  } else if (type === "chair") {
    g.add(box(0.5, 0.06, 0.5, 0.46, 0x5a4030), box(0.5, 0.55, 0.06, 0.76, 0x4a3428));
    g.children[1]!.position.z = -0.22;
    g.add(box(0.06, 0.46, 0.06, 0.23, 0x3a2a20), box(0.06, 0.46, 0.06, 0.23, 0x3a2a20));
    g.children[2]!.position.set(-0.2, 0.23, 0.18);
    g.children[3]!.position.set(0.2, 0.23, 0.18);
  } else if (type === "table") {
    g.add(box(1.4, 0.08, 0.8, 0.74, 0x6a4a30));
    for (const [x, z] of [[-0.58, -0.3], [0.58, -0.3], [-0.58, 0.3], [0.58, 0.3]] as const) {
      const leg = box(0.07, 0.7, 0.07, 0.35, 0x3a2a20);
      leg.position.set(x, 0.35, z);
      g.add(leg);
    }
  } else if (type === "trampoline") {
    g.add(mesh("cylinder", { r: 1.15, r2: 1.15, h: 0.08, seg: 12 }, 0x2a4a88, 0.42));
    g.add(mesh("torus", { r: 1.2, tube: 0.08, seg: 16 }, 0x2a2a2e, 0.42, 0.4));
  } else if (type === "mine") {
    g.add(mesh("cylinder", { r: 0.28, r2: 0.32, h: 0.1, seg: 10 }, 0x3a3a28, 0.06, 0.6));
    const spike = mesh("cone", { r: 0.06, h: 0.16, seg: 6 }, 0x8a2020, 0.18);
    g.add(spike);
  } else if (type === "portal") {
    const ring = new THREE.Mesh(getGeo("torus", { r: 1.1, tube: 0.1, seg: 18 }), matLib.getEmissive(0x3ad0e0, 0x3ad0e0, 1.6));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.3;
    const disc = new THREE.Mesh(getGeo("ring", { r: 1.05, r2: 0.08, seg: 16 }), matLib.getEmissive(0x143848, 0x1a6088, 0.7));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 1.3;
    g.add(ring, disc);
  } else if (type === "checkpoint") {
    g.add(box(0.1, 2.4, 0.1, 1.2, 0x8a8a86));
    const flag = box(0.7, 0.4, 0.04, 2.1, 0xc03028);
    flag.position.x = 0.4;
    g.add(flag);
  } else if (type === "wreck") {
    g.add(box(2.2, 0.7, 1.1, 0.55, 0x4a3a30));
    g.add(box(1.1, 0.5, 1.05, 1.1, 0x3a2a22));
    const w1 = mesh("cylinder", { r: 0.32, r2: 0.32, h: 0.18, seg: 8 }, 0x1a1a1e, 0.32, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.7, 0.32, 0.55);
    const w2 = w1.clone();
    w2.position.z = -0.55;
    g.add(w1, w2);
  } else if (type === "bomb") {
    g.add(mesh("sphere", { r: 0.32, seg: 10 }, 0x2a2a2e, 0.36, 0.4));
    g.add(box(0.06, 0.22, 0.06, 0.7, 0xc8a040, 0.4));
  } else if (type === "cone") {
    g.add(mesh("cone", { r: 0.28, h: 0.85, seg: 8 }, 0xd06018, 0.42));
    g.add(box(0.4, 0.06, 0.4, 0.03, 0x1a1a1e));
  } else if (type === "torus") {
    const t = new THREE.Mesh(getGeo("torus", { r: 0.7, tube: 0.22, seg: 16 }), matLib.get(0x6a5a88, 0.45, 0.35));
    t.position.y = 0.7;
    t.castShadow = true;
    g.add(t);
  } else if (MODEL_ALIAS[type]) {
    return buildProp(MODEL_ALIAS[type]!);
  } else {
    const extra = buildFromMeta(type);
    if (extra) return extra;
    g.add(box(0.12, 1.8, 0.12, 0.9, 0x4a3828), box(1.2, 0.7, 0.06, 1.6, 0xc8b070));
  }
  return g;
}

const GHOST_MAT = new THREE.MeshStandardMaterial({
  color: 0xa78bfa,
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
  roughness: 0.6,
});

export class PropField {
  group = new THREE.Group();
  ghost = new THREE.Group();
  private meshes = new Map<string, THREE.Group>();
  private ghostType: PropId | null = null;

  constructor() {
    this.group.name = "builder";
    this.ghost.visible = false;
    this.group.add(this.ghost);
  }

  hydrate(list: PlacedProp[]) {
    for (const m of this.meshes.values()) this.group.remove(m);
    this.meshes.clear();
    for (const p of list) this.spawn(p);
  }

  spawn(p: PlacedProp) {
    if (this.meshes.has(p.id)) return;
    const mesh = buildProp(p.type);
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.y = p.yaw;
    mesh.scale.setScalar(p.scale);
    mesh.userData.propId = p.id;
    this.group.add(mesh);
    this.meshes.set(p.id, mesh);
  }

  get(id: string) {
    return this.meshes.get(id) ?? null;
  }

  remove(id: string) {
    const m = this.meshes.get(id);
    if (!m) return;
    this.group.remove(m);
    this.meshes.delete(id);
  }

  clear() {
    for (const m of this.meshes.values()) this.group.remove(m);
    this.meshes.clear();
  }

  nearest(x: number, z: number, max = 5): string | null {
    let best: string | null = null;
    let dmin = max;
    for (const [id, m] of this.meshes) {
      const d = Math.hypot(m.position.x - x, m.position.z - z);
      if (d < dmin) {
        dmin = d;
        best = id;
      }
    }
    return best;
  }

  syncGhost(type: PropId | null, x: number, y: number, z: number, yaw: number, scale: number) {
    if (!type) {
      this.ghost.visible = false;
      return;
    }
    if (this.ghostType !== type) {
      this.ghost.clear();
      const mesh = buildProp(type);
      mesh.traverse((o) => {
        const meshObj = o as THREE.Mesh;
        if (meshObj.isMesh) meshObj.material = GHOST_MAT;
      });
      this.ghost.add(mesh);
      this.ghostType = type;
    }
    this.ghost.visible = true;
    this.ghost.position.set(x, y, z);
    this.ghost.rotation.y = yaw;
    this.ghost.scale.setScalar(scale);
  }
}
