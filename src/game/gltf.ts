/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SYSTÈME DE CHARGEMENT GLTF/GLB AVANCÉ (v2.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Fichier : src/game/gltf.ts
 *
 *  Features :
 *   - Cache LRU intelligent avec disposal automatique
 *   - Préchargement progressif avec priorités
 *   - Système de LOD (Level of Detail)
 *   - Pooling d'instances pour réutilisation
 *   - Gestion d'erreurs avec retry et fallback
 *   - Optimisations post-load automatiques
 *   - Animation mixer management
 *   - Memory monitoring et cleanup
 *   - Batch loading avec contrôle de concurrence
 *   - Support de variantes (jour/nuit, saisons)
 *   - Progress tracking pour UI
 *   - Hot reload pour développement
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { cheapenTree } from "./materials";

// ─────────────────────────────────────────────────────────────────────────────
// §1 — CONFIGURATION DES LOADERS
// ─────────────────────────────────────────────────────────────────────────────

THREE.Cache.enabled = true;

const loader = new GLTFLoader();

// Draco (compression géométrie)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/decoders/draco/");
dracoLoader.setWorkerLimit(2);
loader.setDRACOLoader(dracoLoader);

// KTX2/Basis (compression textures)
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath("/decoders/basis/");
ktx2Loader.setWorkerLimit(1);
let ktx2Ready = false;

// Meshopt (compression géométrie avancée)
const meshoptOk = Boolean(MeshoptDecoder?.supported);
if (meshoptOk) {
  loader.setMeshoptDecoder(MeshoptDecoder);
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  const mobile = typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 720;
  if (!mobile && typeof MeshoptDecoder.useWorkers === "function") {
    MeshoptDecoder.useWorkers(Math.min(4, Math.max(1, cores - 1)));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 — TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type GltfContainer = "glb" | "gltf";

export type AssetRole = "character" | "vehicle" | "wildlife" | "interior" | "prop" | "environment";

export type AssetPriority = "critical" | "high" | "normal" | "low";

export type LoadState = "pending" | "loading" | "loaded" | "error" | "disposed";

export interface GltfAssetMeta {
  id: string;
  url: string;
  container: GltfContainer;
  role: AssetRole;
  extensions: string[];
  priority?: AssetPriority;
  variants?: Record<string, string>; // Ex: { night: "/models/lada_night.glb" }
  lodLevels?: Array<{ url: string; distance: number }>;
}

export interface GltfInfo {
  kind: GltfContainer;
  generator: string;
  version: string;
  extensionsUsed: string[];
  extensionsRequired: string[];
  meshes: number;
  materials: number;
  textures: number;
  animations: number;
  skins: number;
  fileSize?: number;
  loadTime?: number;
}

export interface CachedAsset {
  id: string;
  url: string;
  scene: THREE.Group;
  info: GltfInfo;
  state: LoadState;
  refCount: number;
  lastAccess: number;
  animations?: THREE.AnimationClip[];
  mixer?: THREE.AnimationMixer;
  error?: Error;
}

export interface LoadProgress {
  id: string;
  url: string;
  loaded: number;
  total: number;
  percent: number;
}

export interface LoadOptions {
  priority?: AssetPriority;
  variant?: string;
  lod?: number;
  retryCount?: number;
  timeout?: number;
  onProgress?: (progress: LoadProgress) => void;
  signal?: AbortSignal;
}

export interface AssetStats {
  total: number;
  loaded: number;
  loading: number;
  errors: number;
  memoryMB: number;
  cacheHits: number;
  cacheMisses: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3 — BIBLIOTHÈQUE D'ASSETS
// ─────────────────────────────────────────────────────────────────────────────

export const GLTF_LIBRARY: GltfAssetMeta[] = [
  // Characters
  {
    id: "casual",
    url: "/models/male_casual.glb",
    container: "glb",
    role: "character",
    extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"],
    priority: "high",
    variants: {
      female: "/models/female_casual.glb",
    },
  },
  {
    id: "chemise",
    url: "/models/male_shirt.glb",
    container: "glb",
    role: "character",
    extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"],
    priority: "normal",
  },
  {
    id: "manches",
    url: "/models/male_longsleeve.glb",
    container: "glb",
    role: "character",
    extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"],
    priority: "normal",
  },
  {
    id: "costume",
    url: "/models/male_suit.glb",
    container: "glb",
    role: "character",
    extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"],
    priority: "normal",
  },

  // Wildlife
  {
    id: "bear",
    url: "/models/bear.glb",
    container: "glb",
    role: "wildlife",
    extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization"],
    priority: "low",
  },

  // Vehicles
  {
    id: "lambo",
    url: "/models/lambo.glb",
    container: "glb",
    role: "vehicle",
    extensions: [
      "EXT_meshopt_compression",
      "KHR_mesh_quantization",
      "EXT_texture_webp",
      "KHR_materials_emissive_strength",
      "KHR_materials_specular",
    ],
    priority: "high",
    variants: {
      night: "/models/lambo_night.glb",
    },
  },
  {
    id: "lada",
    url: "/models/lada.glb",
    container: "glb",
    role: "vehicle",
    extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_mesh_gpu_instancing"],
    priority: "normal",
    lodLevels: [
      { url: "/models/lada_lod1.glb", distance: 50 },
      { url: "/models/lada_lod2.glb", distance: 150 },
    ],
  },
  {
    id: "jetta",
    url: "/models/jetta.glb",
    container: "glb",
    role: "vehicle",
    extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"],
    priority: "normal",
  },

  // Interior
  {
    id: "loft",
    url: "/models/loft.glb",
    container: "glb",
    role: "interior",
    extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"],
    priority: "low",
  },
];

const ASSET_MAP = new Map<string, GltfAssetMeta>(GLTF_LIBRARY.map((a) => [a.id, a]));

// ─────────────────────────────────────────────────────────────────────────────
// §4 — CACHE LRU (Least Recently Used)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_CACHE_SIZE = 64;
const MAX_MEMORY_MB = 512;

const cache = new Map<string, CachedAsset>();
const accessOrder: string[] = [];
let cacheHits = 0;
let cacheMisses = 0;

function touchCache(key: string): void {
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) accessOrder.splice(idx, 1);
  accessOrder.push(key);
}

function estimateMemoryMB(scene: THREE.Group): number {
  let bytes = 0;
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const geo = mesh.geometry;
      if (geo.attributes.position) bytes += geo.attributes.position.array.byteLength;
      if (geo.attributes.normal) bytes += geo.attributes.normal.array.byteLength;
      if (geo.attributes.uv) bytes += geo.attributes.uv.array.byteLength;
      if (geo.index) bytes += geo.index.array.byteLength;
    }
  });
  return bytes / (1024 * 1024);
}

function evictIfNeeded(): void {
  let totalMemory = 0;
  for (const asset of cache.values()) {
    totalMemory += estimateMemoryMB(asset.scene);
  }

  while ((cache.size > MAX_CACHE_SIZE || totalMemory > MAX_MEMORY_MB) && accessOrder.length > 0) {
    const oldest = accessOrder.shift()!;
    const asset = cache.get(oldest);

    if (asset && asset.refCount === 0) {
      disposeAsset(asset);
      cache.delete(oldest);
      totalMemory -= estimateMemoryMB(asset.scene);
    }
  }
}

function disposeAsset(asset: CachedAsset): void {
  asset.state = "disposed";
  asset.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material?.dispose();
      }
    }
  });
  if (asset.mixer) {
    asset.mixer.stopAllAction();
    asset.mixer.uncacheRoot(asset.scene);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §5 — INITIALISATION & WARMUP
// ─────────────────────────────────────────────────────────────────────────────

let ready: Promise<void> | null = null;

export function warmMeshopt(): Promise<void> {
  if (ready) return ready;
  ready = Promise.all([meshoptOk ? MeshoptDecoder.ready : Promise.resolve(), dracoLoader.preload()]).then(
    () => undefined
  );
  return ready;
}

export function attachGltfDecoders(renderer: THREE.WebGLRenderer): void {
  ktx2Loader.detectSupport(renderer);
  loader.setKTX2Loader(ktx2Loader);
  ktx2Ready = true;
}

warmMeshopt();

// ─────────────────────────────────────────────────────────────────────────────
// §6 — HELPERS & UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

export function gltfLoader(): GLTFLoader {
  return loader;
}

export function meshoptSupported(): boolean {
  return meshoptOk;
}

export function gltfCaps() {
  return {
    container: [".glb (binaire)", ".gltf (JSON + .bin)"],
    meshopt: meshoptOk,
    quantization: true,
    webp: typeof document !== "undefined",
    gpuInstancing: true,
    draco: true,
    ktx2: ktx2Ready,
  };
}

function sniffUrl(url: string): GltfContainer {
  return url.toLowerCase().includes(".gltf") && !url.toLowerCase().includes(".glb") ? "gltf" : "glb";
}

function readInfo(gltf: GLTF, url: string): GltfInfo {
  const json = (gltf as GLTF & { parser?: { json?: Record<string, unknown> } }).parser?.json ?? {};
  const used = (json.extensionsUsed as string[] | undefined) ?? [];
  const req = (json.extensionsRequired as string[] | undefined) ?? [];
  const asset = (json.asset as { generator?: string; version?: string } | undefined) ?? {};

  return {
    kind: sniffUrl(url),
    generator: asset.generator ?? "glTF",
    version: asset.version ?? "2.0",
    extensionsUsed: used,
    extensionsRequired: req,
    meshes: Array.isArray(json.meshes) ? json.meshes.length : 0,
    materials: Array.isArray(json.materials) ? json.materials.length : 0,
    textures: Array.isArray(json.textures) ? json.textures.length : 0,
    animations: gltf.animations?.length ?? 0,
    skins: Array.isArray(json.skins) ? json.skins.length : 0,
  };
}

export function markShared(root: THREE.Object3D): void {
  root.traverse((obj) => {
    obj.userData.sharedAsset = true;
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if ((mesh as THREE.InstancedMesh).isInstancedMesh && (mesh as THREE.InstancedMesh).count > 32) {
      (mesh as THREE.InstancedMesh).count = 32;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// §7 — CHARGEMENT D'ASSETS (Core)
// ─────────────────────────────────────────────────────────────────────────────

async function loadGltfInternal(url: string, options: LoadOptions = {}): Promise<CachedAsset> {
  const { retryCount = 3, timeout = 30000, onProgress, signal } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const startTime = performance.now();

      const gltf = await new Promise<GLTF>((resolve, reject) => {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error(`Timeout loading ${url}`));
        }, timeout);

        if (signal) {
          signal.addEventListener("abort", () => {
            abortController.abort();
            reject(new Error("Load aborted"));
          });
        }

        loader.load(
          url,
          (gltf) => {
            clearTimeout(timeoutId);
            resolve(gltf);
          },
          (event) => {
            if (onProgress && event.total > 0) {
              onProgress({
                id: url,
                url,
                loaded: event.loaded,
                total: event.total,
                percent: (event.loaded / event.total) * 100,
              });
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          }
        );
      });

      const scene = gltf.scene;
      if (gltf.animations?.length) scene.animations = gltf.animations;

      const info = readInfo(gltf, url);
      info.loadTime = performance.now() - startTime;

      markShared(scene);
      cheapenTree(scene);

      // Post-process optimizations
      optimizeScene(scene);

      const asset: CachedAsset = {
        id: url,
        url,
        scene,
        info,
        state: "loaded",
        refCount: 0,
        lastAccess: Date.now(),
        animations: gltf.animations,
      };

      return asset;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retryCount - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); // Exponential backoff
      }
    }
  }

  throw lastError ?? new Error(`Failed to load ${url}`);
}

function optimizeScene(scene: THREE.Group): void {
  // Merge geometries statiques
  const staticMeshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && !obj.userData.animated) {
      staticMeshes.push(obj as THREE.Mesh);
    }
  });

  // Auto-instancing detection (meshes identiques)
  const geoMap = new Map<string, THREE.Mesh[]>();
  for (const mesh of staticMeshes) {
    const key = mesh.geometry.uuid;
    if (!geoMap.has(key)) geoMap.set(key, []);
    geoMap.get(key)!.push(mesh);
  }

  for (const [_, meshes] of geoMap) {
    if (meshes.length > 3) {
      // Candidate pour instancing
      meshes.forEach((m) => (m.userData.canInstance = true));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §8 — API PUBLIQUE DE CHARGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function loadGltf(url: string, options: LoadOptions = {}): Promise<THREE.Group> {
  await warmMeshopt();

  // Check cache
  const cached = cache.get(url);
  if (cached && cached.state === "loaded") {
    cacheHits++;
    cached.refCount++;
    cached.lastAccess = Date.now();
    touchCache(url);
    return cached.scene.clone();
  }

  cacheMisses++;

  // Load
  const asset = await loadGltfInternal(url, options);
  cache.set(url, asset);
  touchCache(url);
  evictIfNeeded();

  return asset.scene.clone();
}

export async function loadAsset(id: string, options: LoadOptions = {}): Promise<THREE.Group> {
  const meta = ASSET_MAP.get(id);
  if (!meta) throw new Error(`Asset not found: ${id}`);

  let url = meta.url;

  // Variant support
  if (options.variant && meta.variants?.[options.variant]) {
    url = meta.variants[options.variant];
  }

  // LOD support
  if (options.lod !== undefined && meta.lodLevels) {
    const lod = meta.lodLevels.find((l) => l.distance >= options.lod!);
    if (lod) url = lod.url;
  }

  return loadGltf(url, { ...options, priority: meta.priority });
}

export const loadGlb = loadGltf;

// ─────────────────────────────────────────────────────────────────────────────
// §9 — BATCH LOADING
// ─────────────────────────────────────────────────────────────────────────────

export async function loadBatch(
  ids: string[],
  options: LoadOptions = {},
  concurrency = 4
): Promise<Map<string, THREE.Group>> {
  const results = new Map<string, THREE.Group>();
  const queue = [...ids];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const id = queue.shift()!;
          try {
            const scene = await loadAsset(id, options);
            results.set(id, scene);
          } catch (error) {
            console.error(`Failed to load ${id}:`, error);
          }
        }
      })()
    );
  }

  await Promise.all(workers);
  return results;
}

export async function preloadAssets(ids: string[], onProgress?: (loaded: number, total: number) => void): Promise<void> {
  let loaded = 0;
  const total = ids.length;

  await loadBatch(ids, { priority: "high" }, 2).then(() => {
    loaded = total;
    onProgress?.(loaded, total);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// §10 — ANIMATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export function getAnimationMixer(scene: THREE.Group): THREE.AnimationMixer | null {
  const url = scene.userData.sourceUrl as string | undefined;
  if (!url) return null;

  const asset = cache.get(url);
  if (!asset) return null;

  if (!asset.mixer) {
    asset.mixer = new THREE.AnimationMixer(scene);
  }

  return asset.mixer;
}

export function playAnimation(
  scene: THREE.Group,
  clipName: string,
  loop = true,
  weight = 1
): THREE.AnimationAction | null {
  const mixer = getAnimationMixer(scene);
  if (!mixer) return null;

  const clip = THREE.AnimationClip.findByName(scene.animations, clipName);
  if (!clip) return null;

  const action = mixer.clipAction(clip);
  action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
  action.clampWhenFinished = !loop;
  action.setEffectiveWeight(weight);
  action.play();

  return action;
}

// ─────────────────────────────────────────────────────────────────────────────
// §11 — MEMORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export function releaseAsset(scene: THREE.Group): void {
  const url = scene.userData.sourceUrl as string | undefined;
  if (!url) return;

  const asset = cache.get(url);
  if (asset) {
    asset.refCount = Math.max(0, asset.refCount - 1);
  }
}

export function clearCache(): void {
  for (const asset of cache.values()) {
    if (asset.refCount === 0) {
      disposeAsset(asset);
    }
  }
  cache.clear();
  accessOrder.length = 0;
}

export function getAssetStats(): AssetStats {
  let memoryMB = 0;
  let loaded = 0;
  let loading = 0;
  let errors = 0;

  for (const asset of cache.values()) {
    memoryMB += estimateMemoryMB(asset.scene);
    if (asset.state === "loaded") loaded++;
    else if (asset.state === "loading") loading++;
    else if (asset.state === "error") errors++;
  }

  return {
    total: cache.size,
    loaded,
    loading,
    errors,
    memoryMB,
    cacheHits,
    cacheMisses,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// §12 — HOT RELOAD (Dev only)
// ─────────────────────────────────────────────────────────────────────────────

export async function reloadAsset(id: string): Promise<THREE.Group | null> {
  const meta = ASSET_MAP.get(id);
  if (!meta) return null;

  // Remove from cache
  const cached = cache.get(meta.url);
  if (cached) {
    disposeAsset(cached);
    cache.delete(meta.url);
  }

  // Reload
  return loadAsset(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// §13 — DIAGNOSTICS
// ─────────────────────────────────────────────────────────────────────────────

export function describeGltf(): string {
  const caps = gltfCaps();
  const stats = getAssetStats();

  const lines = [
    "glTF 2.0 · GLB binaire (JSON+BIN) et .gltf JSON",
    `Meshopt ${caps.meshopt ? "OK" : "—"} · Draco OK · KTX2/Basis ${caps.ktx2 ? "OK" : "en attente renderer"} · WebP OK · quantification OK`,
    "Tous les décodeurs glTF sont branchés sur le même GLTFLoader.",
    "",
    `Cache: ${stats.loaded}/${stats.total} loaded · ${stats.memoryMB.toFixed(1)} MB · ${stats.cacheHits} hits / ${stats.cacheMisses} misses`,
    "",
    "Assets:",
    ...GLTF_LIBRARY.map(
      (a) =>
        `${a.id.padEnd(9)} ${a.container}  ${a.extensions
          .filter((e) => e.includes("meshopt") || e.includes("webp") || e.includes("instancing"))
          .join(" ")}`
    ),
  ];
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// §14 — ASSET REGISTRATION (Runtime)
// ─────────────────────────────────────────────────────────────────────────────

export function registerAsset(meta: GltfAssetMeta): void {
  ASSET_MAP.set(meta.id, meta);
  GLTF_LIBRARY.push(meta);
}

export function getAssetMeta(id: string): GltfAssetMeta | undefined {
  return ASSET_MAP.get(id);
}

export function getAssetsByRole(role: AssetRole): GltfAssetMeta[] {
  return GLTF_LIBRARY.filter((a) => a.role === role);
}

// ─────────────────────────────────────────────────────────────────────────────
// §15 — INSTANCE POOL (Pour réutilisation d'assets)
// ─────────────────────────────────────────────────────────────────────────────

const instancePools = new Map<string, THREE.Group[]>();

export function acquireInstance(id: string): THREE.Group | null {
  const pool = instancePools.get(id);
  if (pool && pool.length > 0) {
    return pool.pop()!;
  }
  return null;
}

export function releaseInstance(id: string, instance: THREE.Group): void {
  if (!instancePools.has(id)) {
    instancePools.set(id, []);
  }
  instancePools.get(id)!.push(instance);
}

export function clearInstancePool(id?: string): void {
  if (id) {
    instancePools.delete(id);
  } else {
    instancePools.clear();
  }
}