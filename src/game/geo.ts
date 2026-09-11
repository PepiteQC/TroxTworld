import * as THREE from "three";

/** Usine + cache GPU. Les matériaux restent dans matLib. */
export type GeoKind =
  | "box"
  | "sphere"
  | "cylinder"
  | "plane"
  | "torus"
  | "ring"
  | "cone"
  | "capsule"
  | "tetra"
  | "octa"
  | "dodeca"
  | "icosa";

export interface GeoParams {
  w?: number;
  h?: number;
  d?: number;
  r?: number;
  r2?: number;
  tube?: number;
  seg?: number;
  segH?: number;
  open?: boolean;
}

const cache = new Map<string, THREE.BufferGeometry>();
let hits = 0;
let misses = 0;

function key(kind: GeoKind, p: GeoParams): string {
  return `${kind}|${p.w ?? 1}|${p.h ?? 1}|${p.d ?? 1}|${p.r ?? 0}|${p.r2 ?? 0}|${p.tube ?? 0}|${p.seg ?? 0}|${p.segH ?? 0}|${p.open ? 1 : 0}`;
}

function build(kind: GeoKind, p: GeoParams): THREE.BufferGeometry {
  const w = p.w ?? 1;
  const h = p.h ?? 1;
  const d = p.d ?? 1;
  const r = p.r ?? 1;
  const seg = p.seg ?? 10;
  switch (kind) {
    case "box":
      return new THREE.BoxGeometry(w, h, d);
    case "sphere":
      return new THREE.SphereGeometry(r, seg, p.segH ?? Math.max(6, (seg / 2) | 0));
    case "cylinder":
      return new THREE.CylinderGeometry(p.r ?? 0.5, p.r2 ?? p.r ?? 0.5, h, seg, 1, !!p.open);
    case "plane":
      return new THREE.PlaneGeometry(w, h);
    case "torus":
      return new THREE.TorusGeometry(r, p.tube ?? 0.22, 8, seg);
    case "ring":
      return new THREE.RingGeometry(p.r2 ?? r * 0.4, r, seg);
    case "cone":
      return new THREE.ConeGeometry(r, h, seg);
    case "capsule":
      return new THREE.CapsuleGeometry(r, h, 4, seg);
    case "tetra":
      return new THREE.TetrahedronGeometry(r, 0);
    case "octa":
      return new THREE.OctahedronGeometry(r, 0);
    case "dodeca":
      return new THREE.DodecahedronGeometry(r, 0);
    case "icosa":
      return new THREE.IcosahedronGeometry(r, 0);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

export function getGeo(kind: GeoKind, p: GeoParams = {}): THREE.BufferGeometry {
  const k = key(kind, p);
  const hit = cache.get(k);
  if (hit) {
    hits++;
    return hit;
  }
  misses++;
  const geo = build(kind, p);
  cache.set(k, geo);
  return geo;
}

export function geoStats() {
  const total = hits + misses;
  return {
    entries: cache.size,
    hits,
    misses,
    hitRate: total ? `${((hits / total) * 100).toFixed(0)}%` : "0%",
  };
}

export function disposeGeos() {
  cache.forEach((g) => g.dispose());
  cache.clear();
  hits = 0;
  misses = 0;
}

/** Instancing optionnel — un draw call pour N copies identiques. */
export class InstancePool {
  mesh: THREE.InstancedMesh;
  count = 0;
  readonly max: number;
  private dummy = new THREE.Object3D();
  private ids = new Map<string, number>();

  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, max = 256) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mesh.frustumCulled = true;
  }

  add(id: string, x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1): number {
    if (this.ids.has(id)) return this.ids.get(id)!;
    if (this.count >= this.max) return -1;
    const idx = this.count;
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(0, yaw, 0);
    this.dummy.scale.set(sx, sy, sz);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(idx, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.count++;
    this.mesh.count = this.count;
    this.ids.set(id, idx);
    return idx;
  }
}

export const GEO_KINDS: GeoKind[] = [
  "box",
  "sphere",
  "cylinder",
  "plane",
  "torus",
  "ring",
  "cone",
  "capsule",
  "tetra",
  "octa",
  "dodeca",
  "icosa",
];
