import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

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
  colors: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE DE GÉOMÉTRIES (LRU - Least Recently Used)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_CACHE_SIZE = 512;
const cache = new Map<string, THREE.BufferGeometry>();
const accessOrder: string[] = [];
let hits = 0;
let misses = 0;

/** Normalise les paramètres pour garantir la cohérence des clés de cache */
function normalizeParams(kind: GeoKind, p: GeoParams): NormalizedParams {
  const w = Math.round((p.w ?? 1) * 1000) / 1000;
  const h = Math.round((p.h ?? 1) * 1000) / 1000;
  const d = Math.round((p.d ?? 1) * 1000) / 1000;
  const seg = p.seg ?? (kind === "box" || kind === "plane" ? 1 : 12);
  const segH = p.segH ?? Math.max(6, Math.floor(seg / 2));
  const open = !!p.open;

  let r = p.r ?? 1;
  let r2 = p.r2 ?? r;
  let tube = p.tube ?? 0.22;

  if (kind === "cylinder") {
    r = p.r ?? 0.5;
    r2 = p.r2 ?? r;
  } else if (kind === "ring") {
    r = p.r ?? 1;
    r2 = p.r2 ?? r * 0.4;
  }

  return { w, h, d, r, r2, tube, seg, segH, open };
}

function generateKey(kind: GeoKind, n: NormalizedParams): string {
  return `${kind}|${n.w}|${n.h}|${n.d}|${n.r}|${n.r2}|${n.tube}|${n.seg}|${n.segH}|${n.open ? 1 : 0}`;
}

function buildGeometry(kind: GeoKind, n: NormalizedParams): THREE.BufferGeometry {
  switch (kind) {
    case "box":
      return new THREE.BoxGeometry(n.w, n.h, n.d, n.seg, n.seg, n.seg);
    case "sphere":
      return new THREE.SphereGeometry(n.r, n.seg, n.segH);
    case "cylinder":
      return new THREE.CylinderGeometry(n.r, n.r2, n.h, n.seg, 1, n.open);
    case "plane":
      return new THREE.PlaneGeometry(n.w, n.h, n.seg, n.segH);
    case "torus":
      return new THREE.TorusGeometry(n.r, n.tube, 8, n.seg);
    case "ring":
      return new THREE.RingGeometry(n.r2, n.r, n.seg);
    case "cone":
      return new THREE.ConeGeometry(n.r, n.h, n.seg);
    case "capsule":
      return new THREE.CapsuleGeometry(n.r, n.h, 4, n.seg);
    case "tetra":
      return new THREE.TetrahedronGeometry(n.r, 0);
    case "octa":
      return new THREE.OctahedronGeometry(n.r, 0);
    case "dodeca":
      return new THREE.DodecahedronGeometry(n.r, 0);
    case "icosa":
      return new THREE.IcosahedronGeometry(n.r, 0);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/** Met à jour l'ordre d'accès pour LRU */
function touchCache(key: string): void {
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) {
    accessOrder.splice(idx, 1);
  }
  accessOrder.push(key);
}

/** Éviction LRU si le cache dépasse la limite */
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

/** Récupère une géométrie avec cache LRU */
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
    maxEntries: MAX_CACHE_SIZE,
    hits,
    misses,
    hitRate: total ? `${((hits / total) * 100).toFixed(1)}%` : "0%",
  };
}

/** Libère toutes les géométries en cache */
export function disposeGeos() {
  cache.forEach((g) => g.dispose());
  cache.clear();
  accessOrder.length = 0;
  hits = 0;
  misses = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE POSITIONNEMENT
// ─────────────────────────────────────────────────────────────────────────────

/** Génère des positions en grille */
export function gridPositions(
  countX: number,
  countZ: number,
  spacingX: number,
  spacingZ: number,
  centerX = 0,
  centerY = 0,
  centerZ = 0
): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];
  const offsetX = (countX - 1) * spacingX * 0.5;
  const offsetZ = (countZ - 1) * spacingZ * 0.5;

  for (let ix = 0; ix < countX; ix++) {
    for (let iz = 0; iz < countZ; iz++) {
      positions.push({
        x: centerX + ix * spacingX - offsetX,
        y: centerY,
        z: centerZ + iz * spacingZ - offsetZ,
      });
    }
  }

  return positions;
}

/** Génère des positions en cercle */
export function circlePositions(
  count: number,
  radius: number,
  centerX = 0,
  centerY = 0,
  centerZ = 0,
  startAngle = 0
): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];
  const angleStep = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY,
      z: centerZ + Math.sin(angle) * radius,
    });
  }

  return positions;
}

/** Génère des positions aléatoires dans une zone */
export function randomPositions(
  count: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  y = 0
): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];

  for (let i = 0; i < count; i++) {
    positions.push({
      x: minX + Math.random() * (maxX - minX),
      y,
      z: minZ + Math.random() * (maxZ - minZ),
    });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTES DE COULEURS PRÉDÉFINIES
// ─────────────────────────────────────────────────────────────────────────────

export const COLOR_PALETTES = {
  urban: [0x2d3748, 0x4a5568, 0x718096, 0xa0aec0, 0xe2e8f0],
  nature: [0x2d5016, 0x4a7c2c, 0x7ba447, 0xa8d67a, 0xd4edbc],
  industrial: [0x1a202c, 0x2d3748, 0x4a5568, 0x718096, 0xa0aec0],
  warm: [0xc53030, 0xdd6b20, 0xecc94b, 0x48bb78, 0x4299e1],
  cool: [0x2b6cb0, 0x3182ce, 0x4299e1, 0x63b3ed, 0x90cdf4],
  neon: [0xff006e, 0xfb5607, 0xffbe0b, 0x8338ec, 0x3a86ff],
  monochrome: [0x1a202c, 0x2d3748, 0x4a5568, 0x718096, 0xa0aec0, 0xe2e8f0],
};

/** Retourne une couleur aléatoire d'une palette */
export function randomColor(palette: keyof typeof COLOR_PALETTES): number {
  const colors = COLOR_PALETTES[palette];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTIONNAIRE D'INSTANCEDMESH (ZERO-GC OPTIMIZED)
// ─────────────────────────────────────────────────────────────────────────────

export class InstancePool {
  public readonly mesh: THREE.InstancedMesh;
  public readonly max: number;

  private _count = 0;
  private ids = new Map<string, number>();
  private indexToId: string[];
  private metadata = new Map<string, InstanceMetadata>();

  // Objets temporaires réutilisables (Zero-GC dans les boucles)
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
      colors: this.mesh.instanceColor ? 1 : 0,
    };
  }

  /** Ajoute ou met à jour une instance avec metadata optionnelle */
  set(
    id: string,
    transform: TransformData,
    metadata?: InstanceMetadata,
    autoFlush = true
  ): number {
    let idx = this.ids.get(id);

    if (idx === undefined) {
      if (this._count >= this.max) {
        console.warn(`[InstancePool] Capacité maximale atteinte (${this.max})`);
        return -1;
      }
      idx = this._count;
      this.ids.set(id, idx);
      this.indexToId[idx] = id;
      this._count++;
      this.mesh.count = this._count;
    }

    this.applyTransform(idx, transform);

    if (metadata) {
      this.metadata.set(id, metadata);
    }

    if (autoFlush) {
      this.flush();
    }

    return idx;
  }

  /** Supprime une instance en O(1) via Swap-and-Pop */
  remove(id: string, autoFlush = true): boolean {
    const idx = this.ids.get(id);
    if (idx === undefined) return false;

    const lastIdx = this._count - 1;

    if (idx !== lastIdx) {
      const lastId = this.indexToId[lastIdx]!;

      // Copie matrice
      this.mesh.getMatrixAt(lastIdx, InstancePool.tempMatrix);
      this.mesh.setMatrixAt(idx, InstancePool.tempMatrix);

      // Copie couleur si présente
      if (this.mesh.instanceColor) {
        this.mesh.getColorAt(lastIdx, InstancePool.tempColor);
        this.mesh.setColorAt(idx, InstancePool.tempColor);
      }

      // Mise à jour index
      this.ids.set(lastId, idx);
      this.indexToId[idx] = lastId;

      // Déplacement metadata
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

    if (autoFlush) {
      this.flush();
    }

    return true;
  }

  /** Applique la couleur sur une instance */
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

    if (autoFlush && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    return true;
  }

  /** Applique les couleurs en batch (plus performant) */
  setColors(colors: Map<string, THREE.ColorRepresentation>, autoFlush = true): void {
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
      }
    }

    if (autoFlush && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /** Récupère la metadata d'une instance */
  getMetadata<T extends InstanceMetadata>(id: string): T | undefined {
    return this.metadata.get(id) as T | undefined;
  }

  /** Met à jour la metadata d'une instance */
  updateMetadata(id: string, updates: Partial<InstanceMetadata>): boolean {
    const meta = this.metadata.get(id);
    if (!meta) return false;

    Object.assign(meta, updates);
    return true;
  }

  /** Applique transformation et couleur */
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

    if (t.color) {
      this.setColor(this.indexToId[idx]!, t.color, false);
    }
  }

  /** Envoie toutes les modifications au GPU */
  flush(): void {
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /** Calcule la bounding box de toutes les instances */
  computeBoundingBox(): THREE.Box3 {
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

  /** Nettoie complètement le pool */
  clear(): void {
    this._count = 0;
    this.mesh.count = 0;
    this.ids.clear();
    this.metadata.clear();
    this.flush();
  }

  /** Libère les ressources */
  dispose(): void {
    this.clear();
    this.mesh.dispose();
  }

  /** Exporte l'état du pool (pour sauvegarde) */
  exportState(): {
    instances: Array<{ id: string; matrix: number[]; color?: number[]; metadata?: InstanceMetadata }>;
  } {
    const instances = [];

    for (let i = 0; i < this._count; i++) {
      const id = this.indexToId[i];
      if (!id) continue;

      this.mesh.getMatrixAt(i, InstancePool.tempMatrix);
      const matrix = Array.from(InstancePool.tempMatrix.elements);

      let color: number[] | undefined;
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

  /** Restaure l'état du pool (depuis sauvegarde) */
  importState(state: {
    instances: Array<{ id: string; matrix: number[]; color?: number[]; metadata?: InstanceMetadata }>;
  }): void {
    this.clear();

    for (const inst of state.instances) {
      const idx = this._count;
      if (idx >= this.max) break;

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
// HELPERS D'ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

/** Animation helpers pour InstancePool */
export class InstanceAnimator {
  private pool: InstancePool;
  private animations = new Map<string, {
    startTime: number;
    duration: number;
    startTransform: TransformData;
    endTransform: TransformData;
    easing: (t: number) => number;
  }>();

  constructor(pool: InstancePool) {
    this.pool = pool;
  }

  /** Ajoute une animation de transformation */
  animate(
    id: string,
    endTransform: TransformData,
    duration: number,
    easing: (t: number) => number = (t) => t
  ): void {
    const idx = this.pool["ids"].get(id);
    if (idx === undefined) return;

    // Récupère transformation actuelle
    this.pool.mesh.getMatrixAt(idx, InstancePool["tempMatrix"]);
    InstancePool["tempMatrix"].decompose(
      InstancePool["tempVec3"],
      InstancePool["tempQuat"],
      InstancePool["tempScale"]
    );

    const startTransform: TransformData = {
      x: InstancePool["tempVec3"].x,
      y: InstancePool["tempVec3"].y,
      z: InstancePool["tempVec3"].z,
      rot: InstancePool["tempQuat"].clone(),
      sx: InstancePool["tempScale"].x,
      sy: InstancePool["tempScale"].y,
      sz: InstancePool["tempScale"].z,
    };

    this.animations.set(id, {
      startTime: Date.now(),
      duration,
      startTransform,
      endTransform,
      easing,
    });
  }

  /** Met à jour toutes les animations actives */
  update(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, anim] of this.animations) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const easedProgress = anim.easing(progress);

      // Interpolation linéaire
      const current: TransformData = {
        x: anim.startTransform.x + (anim.endTransform.x - anim.startTransform.x) * easedProgress,
        y: anim.startTransform.y + (anim.endTransform.y - anim.startTransform.y) * easedProgress,
        z: anim.startTransform.z + (anim.endTransform.z - anim.startTransform.z) * easedProgress,
        sx: (anim.startTransform.sx ?? 1) + ((anim.endTransform.sx ?? 1) - (anim.startTransform.sx ?? 1)) * easedProgress,
        sy: (anim.startTransform.sy ?? 1) + ((anim.endTransform.sy ?? 1) - (anim.startTransform.sy ?? 1)) * easedProgress,
        sz: (anim.startTransform.sz ?? 1) + ((anim.endTransform.sz ?? 1) - (anim.startTransform.sz ?? 1)) * easedProgress,
      };

      // Interpolation rotation (slerp pour quaternion)
      if (anim.startTransform.rot instanceof THREE.Quaternion && anim.endTransform.rot instanceof THREE.Quaternion) {
        current.rot = new THREE.Quaternion().slerpQuaternions(
          anim.startTransform.rot,
          anim.endTransform.rot,
          easedProgress
        );
      }

      this.pool.set(id, current, undefined, false);

      if (progress >= 1) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.animations.delete(id);
    }

    if (this.animations.size > 0) {
      this.pool.flush();
    }
  }

  /** Vérifie si des animations sont en cours */
  get isActive(): boolean {
    return this.animations.size > 0;
  }

  /** Arrête toutes les animations */
  clear(): void {
    this.animations.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EASING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

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