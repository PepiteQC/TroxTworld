/**
 * ═════════════════════════════════════════════════════════════════════════════
 * USINE DE GÉOMÉTRIES PROCÉDURALES, CACHE LRU, POOL D'INSTANCES & ANIMATEUR GPU
 * Fichier : src/game/geometries.ts
 * Architecture : Zero-GC, LRU Eviction, Dirty Ranges, Import/Export State, Easings.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// §1 — TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type GeoKind =
  | "box"
  | "sphere"
  | "hemisphere"
  | "cylinder"
  | "plane"
  | "torus"
  | "ring"
  | "cone"
  | "capsule"
  | "wedge"
  | "pyramid"
  | "arch"
  | "tetra"
  | "octa"
  | "dodeca"
  | "icosa";

export type PivotAlignment = "center" | "bottom" | "top";

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
  /** Décalage du point de pivot ("bottom" = pose directe sur le sol à y=0) */
  pivot?: PivotAlignment;
}

interface NormalizedParams {
  w: number;
  h: number;
  d: number;
  r: number;
  r2: number;
  tube: number;
  seg: number;
  segH: number;
  open: boolean;
  pivot: PivotAlignment;
}

export interface TransformData {
  x: number;
  y: number;
  z: number;
  rot?: THREE.Euler | THREE.Quaternion | number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: THREE.ColorRepresentation;
}

export interface InstanceMetadata {
  [key: string]: unknown;
}

export interface PoolStats {
  instances: number;
  capacity: number;
  usage: string;
  colors: boolean;
}

export interface SerializedPoolState {
  instances: Array<{
    id: string;
    matrix: number[];
    color?: [number, number, number];
    metadata?: InstanceMetadata;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 — CACHE DE GÉOMÉTRIES (LRU EVICTION)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_CACHE_SIZE = 512;
const cache = new Map<string, THREE.BufferGeometry>();
const accessOrder: string[] = [];
let hits = 0;
let misses = 0;

/** Normalise strictement les paramètres pour garantir la cohérence des clés de cache */
function normalizeParams(kind: GeoKind, p: GeoParams): NormalizedParams {
  const w = Math.round((p.w ?? 1) * 1000) / 1000;
  const h = Math.round((p.h ?? 1) * 1000) / 1000;
  const d = Math.round((p.d ?? 1) * 1000) / 1000;
  const seg = p.seg ?? (kind === "box" || kind === "plane" || kind === "wedge" ? 1 : 12);
  const segH = p.segH ?? Math.max(6, Math.floor(seg / 2));
  const open = !!p.open;
  const pivot = p.pivot ?? "center";

  let r = p.r ?? 1;
  let r2 = p.r2 ?? r;
  const tube = p.tube ?? 0.22;

  if (kind === "cylinder") {
    r = p.r ?? 0.5;
    r2 = p.r2 ?? r;
  } else if (kind === "ring") {
    r = p.r ?? 1;
    r2 = p.r2 ?? r * 0.4;
  }

  return { w, h, d, r, r2, tube, seg, segH, open, pivot };
}

function generateKey(kind: GeoKind, n: NormalizedParams): string {
  return `${kind}|${n.w}|${n.h}|${n.d}|${n.r}|${n.r2}|${n.tube}|${n.seg}|${n.segH}|${n.open ? 1 : 0}|${n.pivot}`;
}

function touchCache(key: string): void {
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) {
    accessOrder.splice(idx, 1);
  }
  accessOrder.push(key);
}

function evictIfNeeded(): void {
  while (cache.size > MAX_CACHE_SIZE && accessOrder.length > 0) {
    const oldest = accessOrder.shift()!;
    const geo = cache.get(oldest);
    if (geo) {
      geo.dispose();
      cache.delete(oldest);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §3 — GÉOMÉTRIES CUSTOM
// ─────────────────────────────────────────────────────────────────────────────

/** Rampe / coin (prisme triangulaire) */
function createWedgeGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // prettier-ignore
  const vertices = new Float32Array([
    // Face avant (triangle)
    -hw, -hh,  hd,   hw, -hh,  hd,  -hw,  hh,  hd,
    // Face arrière (triangle)
     hw, -hh, -hd,  -hw, -hh, -hd,  -hw,  hh, -hd,
    // Dessous (2 triangles)
    -hw, -hh, -hd,   hw, -hh, -hd,   hw, -hh,  hd,
    -hw, -hh, -hd,   hw, -hh,  hd,  -hw, -hh,  hd,
    // Pente (2 triangles)
    -hw,  hh, -hd,  -hw,  hh,  hd,   hw, -hh,  hd,
    -hw,  hh, -hd,   hw, -hh,  hd,   hw, -hh, -hd,
    // Côté vertical arrière (2 triangles)
    -hw, -hh, -hd,  -hw, -hh,  hd,  -hw,  hh,  hd,
    -hw, -hh, -hd,  -hw,  hh,  hd,  -hw,  hh, -hd,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Arche (demi-cylindre creux) */
function createArchGeometry(r: number, tube: number, h: number, seg: number): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(r, tube, 8, seg, Math.PI);
  geo.rotateZ(Math.PI);
  geo.rotateY(Math.PI / 2);
  geo.scale(1, h / (r * 2), 1);
  return geo;
}

// ─────────────────────────────────────────────────────────────────────────────
// §4 — FABRIQUE DE GÉOMÉTRIES AVEC DÉCALAGE DE PIVOT
// ─────────────────────────────────────────────────────────────────────────────

function buildGeometry(kind: GeoKind, n: NormalizedParams): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry;

  switch (kind) {
    case "box":
      geo = new THREE.BoxGeometry(n.w, n.h, n.d);
      break;
    case "sphere":
      geo = new THREE.SphereGeometry(n.r, n.seg, n.segH);
      break;
    case "hemisphere":
      geo = new THREE.SphereGeometry(n.r, n.seg, n.segH, 0, Math.PI * 2, 0, Math.PI / 2);
      break;
    case "cylinder":
      geo = new THREE.CylinderGeometry(n.r, n.r2, n.h, n.seg, 1, n.open);
      break;
    case "plane":
      geo = new THREE.PlaneGeometry(n.w, n.h);
      break;
    case "torus":
      geo = new THREE.TorusGeometry(n.r, n.tube, 8, n.seg);
      break;
    case "ring":
      geo = new THREE.RingGeometry(n.r2, n.r, n.seg);
      break;
    case "cone":
      geo = new THREE.ConeGeometry(n.r, n.h, n.seg);
      break;
    case "capsule":
      geo = new THREE.CapsuleGeometry(n.r, n.h, 4, n.seg);
      break;
    case "wedge":
      geo = createWedgeGeometry(n.w, n.h, n.d);
      break;
    case "pyramid":
      geo = new THREE.ConeGeometry(n.r, n.h, 4);
      break;
    case "arch":
      geo = createArchGeometry(n.r, n.tube, n.h, n.seg);
      break;
    case "tetra":
      geo = new THREE.TetrahedronGeometry(n.r, 0);
      break;
    case "octa":
      geo = new THREE.OctahedronGeometry(n.r, 0);
      break;
    case "dodeca":
      geo = new THREE.DodecahedronGeometry(n.r, 0);
      break;
    case "icosa":
      geo = new THREE.IcosahedronGeometry(n.r, 0);
      break;
    default:
      geo = new THREE.BoxGeometry(1, 1, 1);
  }

  // Calcul dynamique de la hauteur pour le décalage de pivot
  const height =
    kind === "sphere" || kind === "hemisphere" || kind === "tetra" || kind === "octa" || kind === "dodeca" || kind === "icosa"
      ? n.r * 2
      : kind === "torus" || kind === "ring" || kind === "arch"
      ? n.r * 2
      : n.h;

  if (n.pivot === "bottom") {
    geo.translate(0, height / 2, 0);
  } else if (n.pivot === "top") {
    geo.translate(0, -height / 2, 0);
  }

  return geo;
}

/** Récupère ou génère une géométrie avec cache d'éviction LRU */
export function getGeo(kind: GeoKind, p: GeoParams = {}): THREE.BufferGeometry {
  const norm = normalizeParams(kind, p);
  const k = generateKey(kind, norm);

  const existing = cache.get(k);
  if (existing) {
    hits++;
    touchCache(k);
    return existing;
  }

  misses++;
  const geo = buildGeometry(kind, norm);
  cache.set(k, geo);
  touchCache(k);
  evictIfNeeded();
  return geo;
}

export function geoStats() {
  const total = hits + misses;
  return {
    entries: cache.size,
    cachedGeometries: cache.size,
    maxCached: MAX_CACHE_SIZE,
    hits,
    misses,
    hitRate: total ? `${((hits / total) * 100).toFixed(1)}%` : "0%",
  };
}

export function disposeGeos(): void {
  cache.forEach((g) => g.dispose());
  cache.clear();
  accessOrder.length = 0;
  hits = 0;
  misses = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// §5 — HELPERS DE POSITIONNEMENT GÉOMÉTRIQUE
// ─────────────────────────────────────────────────────────────────────────────

export function gridPositions(
  countX: number,
  countZ: number,
  spacingX: number,
  spacingZ: number,
  center: THREE.Vector3 = new THREE.Vector3()
): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];
  const offsetX = (countX - 1) * spacingX * 0.5;
  const offsetZ = (countZ - 1) * spacingZ * 0.5;

  for (let ix = 0; ix < countX; ix++) {
    for (let iz = 0; iz < countZ; iz++) {
      positions.push({
        x: center.x + ix * spacingX - offsetX,
        y: center.y,
        z: center.z + iz * spacingZ - offsetZ,
      });
    }
  }
  return positions;
}

export function circlePositions(
  count: number,
  radius: number,
  center: THREE.Vector3 = new THREE.Vector3(),
  startAngle = 0
): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];
  const angleStep = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y,
      z: center.z + Math.sin(angle) * radius,
    });
  }
  return positions;
}

export function spiralPositions(
  count: number,
  startRadius: number,
  growth: number,
  center: THREE.Vector3 = new THREE.Vector3(),
  anglePerStep = Math.PI / 6
): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];

  for (let i = 0; i < count; i++) {
    const r = startRadius + i * growth;
    const angle = i * anglePerStep;
    positions.push({
      x: center.x + Math.cos(angle) * r,
      y: center.y,
      z: center.z + Math.sin(angle) * r,
    });
  }
  return positions;
}

export function randomPositions(
  count: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  y = 0
): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];
  const dx = maxX - minX;
  const dz = maxZ - minZ;

  for (let i = 0; i < count; i++) {
    positions.push({
      x: minX + Math.random() * dx,
      y,
      z: minZ + Math.random() * dz,
    });
  }
  return positions;
}

export function linePositions(
  count: number,
  spacing: number,
  start: THREE.Vector3 = new THREE.Vector3(),
  direction: "x" | "y" | "z" = "x"
): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];

  for (let i = 0; i < count; i++) {
    const offset = i * spacing;
    positions.push({
      x: start.x + (direction === "x" ? offset : 0),
      y: start.y + (direction === "y" ? offset : 0),
      z: start.z + (direction === "z" ? offset : 0),
    });
  }
  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// §6 — PALETTES DE COULEURS
// ─────────────────────────────────────────────────────────────────────────────

export const COLOR_PALETTES = {
  urban: [0x2d3748, 0x4a5568, 0x718096, 0xa0aec0, 0xe2e8f0],
  concrete: [0x808080, 0x9a9a9a, 0xb3b3b3, 0xcfcfcf, 0xe8e8e8],
  nature: [0x2d5016, 0x4a7c2c, 0x7ba447, 0xa8d67a, 0xd4edbc],
  forest: [0x1a2e0a, 0x2d5016, 0x3d6b1f, 0x4a7c2c, 0x5a8c3c],
  industrial: [0x1a202c, 0x2d3748, 0x4a5568, 0x718096, 0xa0aec0],
  warm: [0xc53030, 0xdd6b20, 0xecc94b, 0x48bb78, 0x4299e1],
  cool: [0x2b6cb0, 0x3182ce, 0x4299e1, 0x63b3ed, 0x90cdf4],
  neon: [0xff006e, 0xfb5607, 0xffbe0b, 0x8338ec, 0x3a86ff],
  gta: [0xff5e3a, 0x00a8e8, 0xf9d423, 0x00d9a3, 0xff006e],
  monochrome: [0x1a202c, 0x2d3748, 0x4a5568, 0x718096, 0xa0aec0, 0xe2e8f0],
  qc_autumn: [0x8b2500, 0xc44536, 0xe88f2a, 0xf7b267, 0xf2d0a9],
  qc_winter: [0xd1e8ff, 0xa5c4e0, 0x7a9ec0, 0x4d7899, 0x2a5373],
};

export type PaletteName = keyof typeof COLOR_PALETTES;

export function randomColor(palette: PaletteName): number {
  const colors = COLOR_PALETTES[palette];
  return colors[Math.floor(Math.random() * colors.length)]!;
}

export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// ─────────────────────────────────────────────────────────────────────────────
// §7 — COURBES D'ASSOUPLISSEMENT (EASING)
// ─────────────────────────────────────────────────────────────────────────────

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

export type EasingFn = (t: number) => number;

// ─────────────────────────────────────────────────────────────────────────────
// §8 — INSTANCE POOL (Zero-Allocation & Dirty Ranges & Metadata & Raycast)
// ─────────────────────────────────────────────────────────────────────────────

export class InstancePool {
  public readonly mesh: THREE.InstancedMesh;
  public readonly max: number;

  private _count = 0;
  private ids = new Map<string, number>();
  private indexToId: string[];
  private metadata = new Map<string, InstanceMetadata>();

  // Dirty ranges pour flush partiel GPU
  private minDirty = Infinity;
  private maxDirty = -1;
  private minColorDirty = Infinity;
  private maxColorDirty = -1;

  // Singletons réutilisables (Zéro allocations dans la boucle de rendu)
  private static dummy = new THREE.Object3D();
  private static tempColor = new THREE.Color();
  private static tempMatrix = new THREE.Matrix4();
  private static tempVec3 = new THREE.Vector3();
  private static tempQuat = new THREE.Quaternion();
  private static tempScale = new THREE.Vector3();

  constructor(
    geo: THREE.BufferGeometry,
    mat: THREE.Material | THREE.Material[],
    max = 256,
    frustumCulled = false
  ) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mesh.frustumCulled = frustumCulled;
    this.indexToId = new Array(max);
  }

  get count(): number {
    return this._count;
  }

  get stats(): PoolStats {
    return {
      instances: this._count,
      capacity: this.max,
      usage: `${((this._count / this.max) * 100).toFixed(1)}%`,
      colors: !!this.mesh.instanceColor,
    };
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  getId(index: number): string | undefined {
    return this.indexToId[index];
  }

  /** Expose un point d'accès typé propre aux index d'instances sans passer par des variables privées */
  public getInstanceIndex(id: string): number | undefined {
    return this.ids.get(id);
  }

  /** Résout un hit Raycast vers l'ID textuel de l'instance */
  resolveIntersection(hit: THREE.Intersection): string | null {
    if (hit.object !== this.mesh || hit.instanceId === undefined) return null;
    return this.getId(hit.instanceId) ?? null;
  }

  getMetadata<T extends InstanceMetadata>(id: string): T | undefined {
    return this.metadata.get(id) as T | undefined;
  }

  /**
   * Ajoute ou met à jour une instance avec metadata optionnelle.
   */
  set(
    id: string,
    transform: TransformData,
    metadata?: InstanceMetadata,
    autoFlush = true
  ): number {
    let idx = this.ids.get(id);

    if (idx === undefined) {
      if (this._count >= this.max) {
        console.warn(`[InstancePool] Capacité max de ${this.max} de géométries atteinte pour l'instance: ${id}`);
        return -1;
      }
      idx = this._count;
      this.ids.set(id, idx);
      this.indexToId[idx] = id;
      this._count++;
      this.mesh.count = this._count;
    }

    this.applyTransform(idx, transform);
    this.markMatrixDirty(idx);

    if (metadata) {
      this.metadata.set(id, metadata);
    }

    if (autoFlush) this.flush();
    return idx;
  }

  /** Ajoute plusieurs instances en batch (flush différé) */
  setBatch(
    entries: Array<{ id: string; transform: TransformData; metadata?: InstanceMetadata }>
  ): number {
    let added = 0;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const idx = this.set(entry.id, entry.transform, entry.metadata, false);
      if (idx >= 0) added++;
    }
    this.flush();
    return added;
  }

  /** Supprime une instance en O(1) via Swap-and-Pop */
  remove(id: string, autoFlush = true): boolean {
    const idx = this.ids.get(id);
    if (idx === undefined) return false;

    const lastIdx = this._count - 1;

    if (idx !== lastIdx) {
      const lastId = this.indexToId[lastIdx]!;

      this.mesh.getMatrixAt(lastIdx, InstancePool.tempMatrix);
      this.mesh.setMatrixAt(idx, InstancePool.tempMatrix);
      this.markMatrixDirty(idx);

      if (this.mesh.instanceColor) {
        this.mesh.getColorAt(lastIdx, InstancePool.tempColor);
        this.mesh.setColorAt(idx, InstancePool.tempColor);
        this.markColorDirty(idx);
      }

      this.ids.set(lastId, idx);
      this.indexToId[idx] = lastId;

      const lastMeta = this.metadata.get(lastId);
      if (lastMeta) {
        this.metadata.set(id, lastMeta);
        this.metadata.delete(lastId);
      }
    }

    this.ids.delete(id);
    this.metadata.delete(id);
    this._count--;
    this.mesh.count = this._count;

    if (autoFlush) this.flush();
    return true;
  }

  /** Change la couleur d'une instance */
  setColor(id: string, color: THREE.ColorRepresentation, autoFlush = true): boolean {
    const idx = this.ids.get(id);
    if (idx === undefined) return false;

    if (!this.mesh.instanceColor) {
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(this.max * 3),
        3
      );
    }

    InstancePool.tempColor.set(color);
    this.mesh.setColorAt(idx, InstancePool.tempColor);
    this.markColorDirty(idx);

    if (autoFlush) {
      this.flush();
    }

    return true;
  }

  /** Applique des couleurs en batch (plus performant que setColor itératif) */
  setColors(colors: Map<string, THREE.ColorRepresentation>): void {
    if (colors.size === 0) return;

    if (!this.mesh.instanceColor) {
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(this.max * 3),
        3
      );
    }

    for (const [id, color] of colors) {
      const idx = this.ids.get(id);
      if (idx !== undefined) {
        InstancePool.tempColor.set(color);
        this.mesh.setColorAt(idx, InstancePool.tempColor);
        this.markColorDirty(idx);
      }
    }

    this.flush();
  }

  /** Récupère la position actuelle d'une instance */
  getPosition(id: string, out = new THREE.Vector3()): THREE.Vector3 | null {
    const idx = this.ids.get(id);
    if (idx === undefined) return null;

    this.mesh.getMatrixAt(idx, InstancePool.tempMatrix);
    InstancePool.tempMatrix.decompose(
      out,
      InstancePool.tempQuat,
      InstancePool.tempScale
    );
    return out;
  }

  private markMatrixDirty(idx: number): void {
    this.minDirty = Math.min(this.minDirty, idx);
    this.maxDirty = Math.max(this.maxDirty, idx);
  }

  private markColorDirty(idx: number): void {
    this.minColorDirty = Math.min(this.minColorDirty, idx);
    this.maxColorDirty = Math.max(this.maxColorDirty, idx);
  }

  private applyTransform(idx: number, t: TransformData): void {
    const dummy = InstancePool.dummy;
    dummy.position.set(t.x, t.y, t.z);

    if (t.rot instanceof THREE.Quaternion) {
      dummy.quaternion.copy(t.rot);
    } else if (t.rot instanceof THREE.Euler) {
      dummy.rotation.copy(t.rot);
    } else if (typeof t.rot === "number") {
      dummy.rotation.set(0, t.rot, 0);
    } else {
      dummy.rotation.set(0, 0, 0);
    }

    dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    dummy.updateMatrix();

    this.mesh.setMatrixAt(idx, dummy.matrix);

    if (t.color !== undefined) {
      this.setColor(this.indexToId[idx]!, t.color, false);
    }
  }

  /** Flush partiel GPU */
  flush(): void {
    if (this.maxDirty >= 0) {
      const offset = this.minDirty * 16;
      const count = (this.maxDirty - this.minDirty + 1) * 16;

      const matrixAttr = this.mesh.instanceMatrix as unknown as {
        updateRanges?: Array<{ start: number; count: number }>;
        updateRange?: { offset: number; count: number };
      };

      if (matrixAttr.updateRanges !== undefined) {
        matrixAttr.updateRanges = [{ start: offset, count }];
      } else if (matrixAttr.updateRange !== undefined) {
        matrixAttr.updateRange = { offset, count };
      }

      this.mesh.instanceMatrix.needsUpdate = true;
      this.minDirty = Infinity;
      this.maxDirty = -1;
    }

    if (this.mesh.instanceColor && this.maxColorDirty >= 0) {
      const offset = this.minColorDirty * 3;
      const count = (this.maxColorDirty - this.minColorDirty + 1) * 3;

      const colorAttr = this.mesh.instanceColor as unknown as {
        updateRanges?: Array<{ start: number; count: number }>;
        updateRange?: { offset: number; count: number };
      };

      if (colorAttr.updateRanges !== undefined) {
        colorAttr.updateRanges = [{ start: offset, count }];
      } else if (colorAttr.updateRange !== undefined) {
        colorAttr.updateRange = { offset, count };
      }

      this.mesh.instanceColor.needsUpdate = true;
      this.minColorDirty = Infinity;
      this.maxColorDirty = -1;
    }
  }

  /** Recalcule la bounding sphere pour réactiver le frustum culling */
  updateBoundingVolumes(): void {
    this.mesh.computeBoundingBox();
    this.mesh.computeBoundingSphere();
    this.mesh.frustumCulled = true;
  }

  public computeBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();

    for (let i = 0; i < this._count; i++) {
      this.mesh.getMatrixAt(i, InstancePool.tempMatrix);
      InstancePool.tempMatrix.decompose(
        InstancePool.tempVec3,
        InstancePool.tempQuat,
        InstancePool.tempScale
      );
      box.expandByPoint(InstancePool.tempVec3);
    }
    return box;
  }

  public clear(): void {
    this._count = 0;
    this.mesh.count = 0;
    this.ids.clear();
    this.metadata.clear();
    this.minDirty = Infinity;
    this.maxDirty = -1;
    this.flush();
  }

  public dispose(): void {
    this.clear();
    this.mesh.dispose();
  }

  /** Sérialise l'état du pool (pour sauvegarde monde) */
  public exportState(): SerializedPoolState {
    const instances: SerializedPoolState["instances"] = [];

    for (let i = 0; i < this._count; i++) {
      const id = this.indexToId[i];
      if (!id) continue;

      this.mesh.getMatrixAt(i, InstancePool.tempMatrix);
      const matrix = Array.from(InstancePool.tempMatrix.elements);

      let color: [number, number, number] | undefined;
      if (this.mesh.instanceColor) {
        this.mesh.getColorAt(i, InstancePool.tempColor);
        color = [
          InstancePool.tempColor.r,
          InstancePool.tempColor.g,
          InstancePool.tempColor.b,
        ];
      }

      const metadata = this.metadata.get(id);
      instances.push({ id, matrix, color, metadata });
    }

    return { instances };
  }

  /** Restaure un état sauvegardé */
  public importState(state: SerializedPoolState): void {
    this.clear();

    for (let i = 0; i < state.instances.length; i++) {
      const inst = state.instances[i]!;
      if (this._count >= this.max) break;

      const idx = this._count;
      this.ids.set(inst.id, idx);
      this.indexToId[idx] = inst.id;

      InstancePool.tempMatrix.fromArray(inst.matrix);
      this.mesh.setMatrixAt(idx, InstancePool.tempMatrix);

      if (inst.color) {
        if (!this.mesh.instanceColor) {
          this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(this.max * 3),
            3
          );
        }
        InstancePool.tempColor.setRGB(inst.color[0], inst.color[1], inst.color[2]);
        this.mesh.setColorAt(idx, InstancePool.tempColor);
      }

      if (inst.metadata) {
        this.metadata.set(inst.id, inst.metadata);
      }

      this._count++;
    }

    this.mesh.count = this._count;
    this.flush();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §9 — INSTANCE ANIMATOR (interpolation de transformations)
// ─────────────────────────────────────────────────────────────────────────────

interface AnimEntry {
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startRot: THREE.Quaternion;
  endRot: THREE.Quaternion;
  startScale: THREE.Vector3;
  endScale: THREE.Vector3;
  easing: EasingFn;
  onComplete?: () => void;
}

/** Animateur pour InstancePool — gère les interpolations de position, échelle et slerp de rotation */
export class InstanceAnimator {
  private pool: InstancePool;
  private animations = new Map<string, AnimEntry>();

  // Buffers réutilisables
  private static _pos = new THREE.Vector3();
  private static _quat = new THREE.Quaternion();
  private static _scale = new THREE.Vector3();
  private static _matrix = new THREE.Matrix4();

  constructor(pool: InstancePool) {
    this.pool = pool;
  }

  /** Démarre une animation de transformation */
  animate(
    id: string,
    endTransform: TransformData,
    duration: number,
    easing: EasingFn = Easing.easeInOutCubic,
    onComplete?: () => void
  ): boolean {
    const idx = this.pool.getInstanceIndex(id);
    if (idx === undefined) return false;

    // Récupère l'état actuel de manière sécurisée sans contourner le typage private
    this.pool.mesh.getMatrixAt(idx, InstanceAnimator._matrix);
    InstanceAnimator._matrix.decompose(
      InstanceAnimator._pos,
      InstanceAnimator._quat,
      InstanceAnimator._scale
    );

    // Construit l'état cible
    const endPos = new THREE.Vector3(endTransform.x, endTransform.y, endTransform.z);
    const endScale = new THREE.Vector3(
      endTransform.sx ?? 1,
      endTransform.sy ?? 1,
      endTransform.sz ?? 1
    );
    const endRot = new THREE.Quaternion();

    if (endTransform.rot instanceof THREE.Quaternion) {
      endRot.copy(endTransform.rot);
    } else if (endTransform.rot instanceof THREE.Euler) {
      endRot.setFromEuler(endTransform.rot);
    } else if (typeof endTransform.rot === "number") {
      endRot.setFromEuler(new THREE.Euler(0, endTransform.rot, 0));
    }

    this.animations.set(id, {
      startTime: performance.now(),
      duration,
      startPos: InstanceAnimator._pos.clone(),
      endPos,
      startRot: InstanceAnimator._quat.clone(),
      endRot,
      startScale: InstanceAnimator._scale.clone(),
      endScale,
      easing,
      onComplete,
    });

    return true;
  }

  /** Met à jour toutes les animations — à appeler dans la boucle de rendu */
  update(): boolean {
    if (this.animations.size === 0) return false;

    const now = performance.now();
    const toRemove: string[] = [];
    let dirty = false;

    for (const [id, anim] of this.animations) {
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      const e = anim.easing(t);

      // Interpolation position
      const x = anim.startPos.x + (anim.endPos.x - anim.startPos.x) * e;
      const y = anim.startPos.y + (anim.endPos.y - anim.startPos.y) * e;
      const z = anim.startPos.z + (anim.endPos.z - anim.startPos.z) * e;

      // Slerp rotation
      const q = new THREE.Quaternion().slerpQuaternions(
        anim.startRot,
        anim.endRot,
        e
      );

      // Interpolation scale
      const sx = anim.startScale.x + (anim.endScale.x - anim.startScale.x) * e;
      const sy = anim.startScale.y + (anim.endScale.y - anim.startScale.y) * e;
      const sz = anim.startScale.z + (anim.endScale.z - anim.startScale.z) * e;

      this.pool.set(
        id,
        { x, y, z, rot: q, sx, sy, sz },
        undefined,
        false
      );
      dirty = true;

      if (t >= 1) {
        toRemove.push(id);
        anim.onComplete?.();
      }
    }

    for (let i = 0; i < toRemove.length; i++) {
      this.animations.delete(toRemove[i]!);
    }

    if (dirty) this.pool.flush();
    return dirty;
  }

  get isActive(): boolean {
    return this.animations.size > 0;
  }

  get activeCount(): number {
    return this.animations.size;
  }

  /** Arrête une animation spécifique */
  stop(id: string): boolean {
    return this.animations.delete(id);
  }

  /** Arrête toutes les animations */
  clear(): void {
    this.animations.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §10 — CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

export const GEO_KINDS: GeoKind[] = [
  "box",
  "sphere",
  "hemisphere",
  "cylinder",
  "plane",
  "torus",
  "ring",
  "cone",
  "capsule",
  "wedge",
  "pyramid",
  "arch",
  "tetra",
  "octa",
  "dodeca",
  "icosa",
];