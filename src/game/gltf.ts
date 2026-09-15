import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { cheapenTree } from "./materials";

/**
 * Conteneurs glTF 2.0 gérés :
 *  · .glb  — binaire (magic "glTF"), JSON + BIN dans le même fichier
 *  · .gltf — JSON + buffers/images externes (.bin, png, webp)
 *
 * Extensions actives dans nos assets (meshopt GLB) :
 *  · EXT_meshopt_compression   — géométrie compacte (WASM MeshoptDecoder)
 *  · KHR_draco_mesh_compression — géométrie Draco (WASM DRACOLoader)
 *  · KHR_texture_basisu        — textures KTX2 / BasisU (transcoder)
 *  · KHR_mesh_quantization     — positions/normales i8/i16 (natif GLTFLoader)
 *  · EXT_texture_webp          — albedo/normal plus légers
 *  · EXT_mesh_gpu_instancing   — vis Lada
 *  · KHR_materials_*           — speculaire / emissive (Lambo)
 */

THREE.Cache.enabled = true;

const loader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/decoders/draco/");
dracoLoader.setWorkerLimit(2);
loader.setDRACOLoader(dracoLoader);

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath("/decoders/basis/");
ktx2Loader.setWorkerLimit(1);

let ktx2Ready = false;

const meshoptOk = Boolean(MeshoptDecoder?.supported);
if (meshoptOk) {
  loader.setMeshoptDecoder(MeshoptDecoder);
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  const mobile = typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 720;
  if (!mobile && typeof MeshoptDecoder.useWorkers === "function") {
    MeshoptDecoder.useWorkers(Math.min(4, Math.max(1, cores - 1)));
  }
}

let ready: Promise<void> | null = null;

export function warmMeshopt(): Promise<void> {
  if (ready) return ready;
  ready = Promise.all([
    meshoptOk ? MeshoptDecoder.ready : Promise.resolve(),
    dracoLoader.preload(),
  ]).then(() => undefined);
  return ready;
}

export function attachGltfDecoders(renderer: THREE.WebGLRenderer) {
  ktx2Loader.detectSupport(renderer);
  loader.setKTX2Loader(ktx2Loader);
  ktx2Ready = true;
}

warmMeshopt();

export function gltfLoader() {
  return loader;
}

export function meshoptSupported() {
  return meshoptOk;
}

export type GltfContainer = "glb" | "gltf";

export interface GltfAssetMeta {
  id: string;
  url: string;
  container: GltfContainer;
  role: "character" | "vehicle" | "wildlife" | "interior";
  extensions: string[];
}

export const GLTF_LIBRARY: GltfAssetMeta[] = [
  { id: "casual", url: "/models/male_casual.glb", container: "glb", role: "character", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"] },
  { id: "chemise", url: "/models/male_shirt.glb", container: "glb", role: "character", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"] },
  { id: "manches", url: "/models/male_longsleeve.glb", container: "glb", role: "character", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"] },
  { id: "costume", url: "/models/male_suit.glb", container: "glb", role: "character", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"] },
  { id: "bear", url: "/models/bear.glb", container: "glb", role: "wildlife", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization"] },
  { id: "lambo", url: "/models/lambo.glb", container: "glb", role: "vehicle", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp", "KHR_materials_emissive_strength", "KHR_materials_specular"] },
  { id: "lada", url: "/models/lada.glb", container: "glb", role: "vehicle", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_mesh_gpu_instancing"] },
  { id: "jetta", url: "/models/jetta.glb", container: "glb", role: "vehicle", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"] },
  { id: "loft", url: "/models/loft.glb", container: "glb", role: "interior", extensions: ["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"] },
];

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

export function markShared(root: THREE.Object3D) {
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

export async function loadGltf(url: string): Promise<THREE.Group> {
  await warmMeshopt();
  const gltf = await loader.loadAsync(url);
  const scene = gltf.scene;
  if (gltf.animations?.length) scene.animations = gltf.animations;
  scene.userData.gltf = readInfo(gltf, url);
  markShared(scene);
  cheapenTree(scene);
  return scene;
}

/** Alias — nos assets sont des GLB meshopt. */
export const loadGlb = loadGltf;

export function describeGltf(): string {
  const caps = gltfCaps();
  const lines = [
    "glTF 2.0 · GLB binaire (JSON+BIN) et .gltf JSON",
    `Meshopt ${caps.meshopt ? "OK" : "—"} · Draco OK · KTX2/Basis ${caps.ktx2 ? "OK" : "en attente renderer"} · WebP OK · quantification OK`,
    "Tous les décodeurs glTF sont branchés sur le même GLTFLoader.",
    ...GLTF_LIBRARY.map((a) => `${a.id.padEnd(9)} ${a.container}  ${a.extensions.filter((e) => e.includes("meshopt") || e.includes("webp") || e.includes("instancing")).join(" ")}`),
  ];
  return lines.join("\n");
}
