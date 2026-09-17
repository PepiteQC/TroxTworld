/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME DE TABLES DE NUIT AVANCÉ (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - 5 variantes de nightstands (moderne, classique, rustique, etc.)
 *  - Cache LRU avec disposal automatique
 *  - Matériaux configurables (bois clair, foncé, peint, métal)
 *  - Tiroirs animables (ouverture/fermeture)
 *  - Support OBJ + GLB
 *  - Fallback procédural enrichi
 *  - Système de lampe intégrée
 *  - Items interactifs sur la table (livre, verre, téléphone)
 *  - Interactivité (ouvrir tiroir, allumer lampe)
 *  - API enrichie pour inventaire
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { tex } from "./textures";
import { matLib } from "./materials";

// ═══════════════════════════════════════════════════════════
// TYPES — VARIANTES & CONFIGURATION
// ═══════════════════════════════════════════

export type NightstandStyle = 
  | "modern"      // Moderne minimaliste
  | "classic"     // Classique traditionnel
  | "rustic"      // Rustique campagne
  | "industrial"  // Industriel métal/bois
  | "scandinavian"; // Scandinave bois clair

export type NightstandMaterial = 
  | "walnut"      // Noyer foncé
  | "oak"         // Chêne clair
  | "pine"        // Pin naturel
  | "painted"     // Peint (blanc/noir)
  | "metal";      // Métal brossé

export interface NightstandConfig {
  style: NightstandStyle;
  material: NightstandMaterial;
  width: number;      // Largeur cible en mètres
  height: number;     // Hauteur cible
  depth: number;      // Profondeur
  hasLamp: boolean;
  hasDrawer: boolean;
  interactive: boolean;
}

export interface NightstandVariant {
  id: string;
  style: NightstandStyle;
  modelPath: string;
  format: "obj" | "glb";
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
}

export interface NightstandItem {
  id: string;
  name: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  interactable: boolean;
  onInteract?: () => void;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════

const DEFAULT_WIDTH = 0.5;
const DEFAULT_HEIGHT = 0.6;
const DEFAULT_DEPTH = 0.4;
const MAX_CACHE_SIZE = 8;

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES VARIANTES
// ═══════════════════════════════════════════

const NIGHTSTAND_VARIANTS: NightstandVariant[] = [
  {
    id: "ns_modern",
    style: "modern",
    modelPath: "/models/nightstand_modern.obj",
    format: "obj",
    defaultWidth: 0.5,
    defaultHeight: 0.55,
    defaultDepth: 0.4,
  },
  {
    id: "ns_classic",
    style: "classic",
    modelPath: "/models/nightstand_classic.obj",
    format: "obj",
    defaultWidth: 0.55,
    defaultHeight: 0.65,
    defaultDepth: 0.45,
  },
  {
    id: "ns_rustic",
    style: "rustic",
    modelPath: "/models/nightstand_rustic.glb",
    format: "glb",
    defaultWidth: 0.5,
    defaultHeight: 0.6,
    defaultDepth: 0.42,
  },
  {
    id: "ns_industrial",
    style: "industrial",
    modelPath: "/models/nightstand_industrial.obj",
    format: "obj",
    defaultWidth: 0.48,
    defaultHeight: 0.58,
    defaultDepth: 0.4,
  },
  {
    id: "ns_scandinavian",
    style: "scandinavian",
    modelPath: "/models/nightstand_scandi.glb",
    format: "glb",
    defaultWidth: 0.52,
    defaultHeight: 0.6,
    defaultDepth: 0.4,
  },
];

// ═══════════════════════════════════════════════════════════
// CACHE LRU (Least Recently Used)
// ═══════════════════════════════════════════

interface CachedNightstand {
  group: THREE.Group;
  lastAccess: number;
  refCount: number;
  height: number;
}

const cache = new Map<string, CachedNightstand>();
const accessOrder: string[] = [];
const inflight = new Map<string, Promise<THREE.Group>>();

function touchCache(key: string): void {
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) accessOrder.splice(idx, 1);
  accessOrder.push(key);
}

function evictIfNeeded(): void {
  while (cache.size > MAX_CACHE_SIZE && accessOrder.length > 0) {
    const oldest = accessOrder.shift()!;
    const cached = cache.get(oldest);
    
    if (cached && cached.refCount === 0) {
      disposeGroup(cached.group);
      cache.delete(oldest);
    }
  }
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material?.dispose();
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// HELPERS — GÉOMÉTRIE & MATÉRIAUX
// ═══════════════════════════════════════════

const box = new THREE.Box3();
const size = new THREE.Vector3();

function fitToWidth(root: THREE.Object3D, targetWidth: number): number {
  box.setFromObject(root);
  box.getSize(size);
  const scale = targetWidth / Math.max(0.01, size.x);
  root.scale.multiplyScalar(scale);
  
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
  
  return box.max.y; // Retourne la hauteur après fit
}

function createMaterial(type: NightstandMaterial): THREE.Material {
  switch (type) {
    case "walnut":
      return tex.pbr("noyer", null, 1.1, 1.6, 0.52, 0.06, 0x7d5340, 0.4);
    
    case "oak":
      return tex.pbr("chene", null, 1.2, 1.5, 0.48, 0.08, 0xc4a57b, 0.35);
    
    case "pine":
      return (tex as any).pbr("pin", null, 1.0, 1.4, 0.45, 0.1, 0xd4b896, 0.3);
    
    case "painted":
      return matLib.get(0xf5f5f5, 0.3, 0.7);
    
    case "metal":
      return (matLib as any).physical(0x4a4a4a, 0.2, 0.8, 0.5);
    
    default:
      return matLib.get(0x7d5340, 0.5, 0.3);
  }
}

// ═══════════════════════════════════════════════════════════
// FALLBACK PROCÉDURAL (si modèle indisponible)
// ═══════════════════════════════════════════

function buildProceduralNightstand(config: NightstandConfig): THREE.Group {
  const group = new THREE.Group();
  group.name = "nightstand-procedural";
  
  const mat = createMaterial(config.material);
  const width = config.width;
  const height = config.height;
  const depth = config.depth;
  
  // Corps principal
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    mat
  );
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  
  // Plateau supérieur
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.02, 0.03, depth + 0.02),
    mat
  );
  top.position.y = height;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);
  
  // Tiroir (si demandé)
  if (config.hasDrawer) {
    const drawerHeight = height * 0.35;
    const drawer = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.04, drawerHeight, depth - 0.02),
      mat
    );
    drawer.position.y = drawerHeight / 2 + 0.05;
    drawer.position.z = 0.02;
    drawer.castShadow = true;
    drawer.name = "drawer";
    drawer.userData.isDrawer = true;
    drawer.userData.closedZ = 0.02;
    drawer.userData.openZ = 0.15;
    drawer.userData.isOpen = false;
    group.add(drawer);
    
    // Poignée
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.02, 0.02),
      matLib.get(0x2a2a2a, 0.6, 0.3)
    );
    handle.position.y = drawerHeight / 2 + 0.05;
    handle.position.z = depth / 2 + 0.01;
    drawer.add(handle);
  }
  
  // Pieds (style moderne)
  if (config.style === "modern" || config.style === "scandinavian") {
    const legHeight = 0.08;
    const legSize = 0.04;
    const legPositions = [
      [-width / 2 + 0.05, legHeight / 2, -depth / 2 + 0.05],
      [width / 2 - 0.05, legHeight / 2, -depth / 2 + 0.05],
      [-width / 2 + 0.05, legHeight / 2, depth / 2 - 0.05],
      [width / 2 - 0.05, legHeight / 2, depth / 2 - 0.05],
    ];
    
    for (const [x, y, z] of legPositions) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(legSize / 2, legSize / 2, legHeight, 8),
        matLib.get(0x2a2a2a, 0.6, 0.3)
      );
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    }
    
    // Surélever le corps
    body.position.y += legHeight;
    top.position.y += legHeight;
  }
  
  return group;
}

// ═══════════════════════════════════════════════════════════
// LAMPE INTÉGRÉE
// ═══════════════════════════════════════════

function buildLamp(): THREE.Group {
  const lamp = new THREE.Group();
  lamp.name = "nightstand-lamp";
  
  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.02, 16),
    matLib.get(0x2a2a2a, 0.6, 0.3)
  );
  base.castShadow = true;
  lamp.add(base);
  
  // Tige
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8),
    matLib.get(0x4a4a4a, 0.5, 0.4)
  );
  stem.position.y = 0.135;
  stem.castShadow = true;
  lamp.add(stem);
  
  // Abat-jour
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.15, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xf5e6d3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    })
  );
  shade.position.y = 0.33;
  shade.castShadow = true;
  lamp.add(shade);
  
  // Ampoule (lumière)
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    matLib.getEmissive(0xfff4e0, 0xfff4e0, 1.5)
  );
  bulb.position.y = 0.3;
  bulb.visible = false;
  bulb.name = "bulb";
  lamp.add(bulb);
  
  // Point light
  const light = new THREE.PointLight(0xfff4e0, 0, 3);
  light.position.y = 0.3;
  light.castShadow = false;
  light.name = "lamp-light";
  lamp.add(light);
  
  lamp.userData.isOn = false;
  lamp.userData.brightness = 0;
  
  return lamp;
}

function toggleLamp(lamp: THREE.Group): boolean {
  const isOn = !lamp.userData.isOn;
  lamp.userData.isOn = isOn;
  
  const bulb = lamp.getObjectByName("bulb");
  const light = lamp.getObjectByName("lamp-light") as THREE.PointLight;
  
  if (bulb) bulb.visible = isOn;
  if (light) light.intensity = isOn ? 1.5 : 0;
  
  return isOn;
}

// ═══════════════════════════════════════════════════════════
// ITEMS INTERACTIFS
// ═══════════════════════════════════════════

function buildBookItem(): NightstandItem {
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.02, 0.2),
    matLib.get(0x8b0000, 0.7, 0.2)
  );
  book.castShadow = true;
  book.name = "book";
  
  return {
    id: "book",
    name: "Livre",
    mesh: book,
    position: new THREE.Vector3(0.1, 0, 0),
    interactable: true,
    onInteract: () => console.log("📖 Lecture du livre"),
  };
}

function buildGlassItem(): NightstandItem {
  const glass = new THREE.Group();
  
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.1, 12),
    matLib.glass(0xaaddff, 0.3, 0.1)
  );
  body.castShadow = true;
  glass.add(body);
  
  // Eau
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.033, 0.028, 0.06, 12),
    new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6,
    })
  );
  water.position.y = -0.02;
  glass.add(water);
  
  glass.name = "glass";
  
  return {
    id: "glass",
    name: "Verre d'eau",
    mesh: glass,
    position: new THREE.Vector3(-0.12, 0, 0.05),
    interactable: true,
    onInteract: () => console.log("🥤 Boire de l'eau"),
  };
}

function buildPhoneItem(): NightstandItem {
  const phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.01, 0.14),
    matLib.get(0x1a1a1a, 0.3, 0.8)
  );
  phone.castShadow = true;
  phone.name = "phone";
  
  // Écran
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.12),
    matLib.getEmissive(0x111111, 0x4488ff, 0.3)
  );
  screen.position.y = 0.006;
  screen.rotation.x = -Math.PI / 2;
  phone.add(screen);
  
  return {
    id: "phone",
    name: "Téléphone",
    mesh: phone,
    position: new THREE.Vector3(0, 0, -0.1),
    interactable: true,
    onInteract: () => console.log("📱 Vérifier le téléphone"),
  };
}

// ═══════════════════════════════════════════════════════════
// CHARGEMENT DES MODÈLES
// ═══════════════════════════════════════════

async function loadOBJ(path: string, material: THREE.Material): Promise<THREE.Group> {
  const obj = await new OBJLoader().loadAsync(path);
  
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  
  const wrap = new THREE.Group();
  wrap.name = "nightstand-obj";
  wrap.add(obj);
  return wrap;
}

async function loadGLB(path: string, material: THREE.Material): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(path);
  
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  
  const wrap = new THREE.Group();
  wrap.name = "nightstand-glb";
  wrap.add(gltf.scene);
  return wrap;
}

async function loadNightstandModel(variant: NightstandVariant, config: NightstandConfig): Promise<{ group: THREE.Group; height: number }> {
  const cacheKey = `${variant.id}_${config.material}`;
  
  // Vérifier cache
  const cached = cache.get(cacheKey);
  if (cached) {
    cached.lastAccess = Date.now();
    cached.refCount++;
    touchCache(cacheKey);
    return { group: cached.group.clone(), height: cached.height };
  }
  
  // Vérifier si déjà en cours de chargement
  if (inflight.has(cacheKey)) {
    const src = await inflight.get(cacheKey)!;
    return { group: src.clone(), height: 0 };
  }
  
  // Charger
  const material = createMaterial(config.material);
  const promise = variant.format === "glb"
    ? loadGLB(variant.modelPath, material)
    : loadOBJ(variant.modelPath, material);
  
  inflight.set(cacheKey, promise);
  
  try {
    const src = await promise;
    const height = fitToWidth(src, config.width);
    
    // Cacher
    cache.set(cacheKey, {
      group: src,
      lastAccess: Date.now(),
      refCount: 1,
      height,
    });
    touchCache(cacheKey);
    evictIfNeeded();
    
    return { group: src.clone(), height };
  } catch (err) {
    console.warn(`[Nightstand] Failed to load ${variant.modelPath}, using procedural fallback`);
    const procedural = buildProceduralNightstand(config);
    return { group: procedural, height: config.height };
  } finally {
    inflight.delete(cacheKey);
  }
}

// ═══════════════════════════════════════════════════════════
// INTERACTIONS
// ═══════════════════════════════════════════

export interface MountedNightstand {
  slot: THREE.Group;
  config: NightstandConfig;
  items: NightstandItem[];
  lamp: THREE.Group | null;
  dispose: () => void;
}

function toggleDrawer(nightstand: THREE.Group): boolean {
  const drawer = nightstand.getObjectByName("drawer");
  if (!drawer || !drawer.userData.isDrawer) return false;
  
  const isOpen = !drawer.userData.isOpen;
  drawer.userData.isOpen = isOpen;
  
  const targetZ = isOpen ? drawer.userData.openZ : drawer.userData.closedZ;
  
  // Animation simple (à améliorer avec tweening)
  const startZ = drawer.position.z;
  const startTime = Date.now();
  const duration = 300; // ms
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    
    drawer.position.z = startZ + (targetZ - startZ) * eased;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  animate();
  return isOpen;
}

// ═══════════════════════════════════════════════════════════
// API PUBLIQUE — MOUNT & DISPOSE
// ═══════════════════════════════════════════

export async function mountNightstand(
  host: THREE.Group,
  config: Partial<NightstandConfig> = {}
): Promise<MountedNightstand> {
  const fullConfig: NightstandConfig = {
    style: config.style ?? "modern",
    material: config.material ?? "walnut",
    width: config.width ?? DEFAULT_WIDTH,
    height: config.height ?? DEFAULT_HEIGHT,
    depth: config.depth ?? DEFAULT_DEPTH,
    hasLamp: config.hasLamp ?? true,
    hasDrawer: config.hasDrawer ?? true,
    interactive: config.interactive ?? true,
  };
  
  const variant = NIGHTSTAND_VARIANTS.find(v => v.style === fullConfig.style) ?? NIGHTSTAND_VARIANTS[0];
  
  const slot = new THREE.Group();
  slot.name = `nightstand-slot-${variant.id}`;
  host.add(slot);
  
  const token = { id: `${variant.id}_${Date.now()}` };
  slot.userData.nsToken = token;
  
  try {
    const { group: src, height } = await loadNightstandModel(variant, fullConfig);
    
    if (slot.userData.nsToken !== token) {
      disposeGroup(src);
      return { slot, config: fullConfig, items: [], lamp: null, dispose: () => {} };
    }
    
    src.name = "nightstand-rig";
    slot.add(src);
    
    // Masquer le dummy si présent
    const dummy = host.getObjectByName("nightstand-dummy");
    if (dummy) dummy.visible = false;
    
    // Ajouter lampe
    let lamp: THREE.Group | null = null;
    if (fullConfig.hasLamp) {
      lamp = buildLamp();
      lamp.position.y = height;
      slot.add(lamp);
    }
    
    // Ajouter items interactifs
    const items: NightstandItem[] = [];
    if (fullConfig.interactive) {
      const book = buildBookItem();
      book.mesh.position.y = height + 0.01;
      book.mesh.position.add(book.position);
      slot.add(book.mesh);
      items.push(book);
      
      const glass = buildGlassItem();
      glass.mesh.position.y = height + 0.01;
      glass.mesh.position.add(glass.position);
      slot.add(glass.mesh);
      items.push(glass);
      
      const phone = buildPhoneItem();
      phone.mesh.position.y = height + 0.01;
      phone.mesh.position.add(phone.position);
      slot.add(phone.mesh);
      items.push(phone);
    }
    
    return {
      slot,
      config: fullConfig,
      items,
      lamp,
      dispose: () => {
        const cacheKey = `${variant.id}_${fullConfig.material}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          cached.refCount = Math.max(0, cached.refCount - 1);
        }
        
        slot.parent?.remove(slot);
        disposeGroup(slot);
      },
    };
  } catch (err) {
    console.error("[Nightstand] Mount failed:", err);
    return { slot, config: fullConfig, items: [], lamp: null, dispose: () => {} };
  }
}

// ═══════════════════════════════════════════════════════════
// API SIMPLIFIÉE (compatibilité rétroactive)
// ═══════════════════════════════════════════

let cachedHeight = 0.78;

export function mountNightstandMesh(host: THREE.Group): THREE.Group {
  const slot = new THREE.Group();
  slot.name = "nightstand-slot";
  host.add(slot);
  
  const token = { id: "nightstand" };
  slot.userData.nsToken = token;
  
  mountNightstand(host, { style: "modern" }).then((mounted) => {
    if (slot.userData.nsToken !== token) return;
    
    cachedHeight = mounted.config.height;
    
    while (slot.children.length > 0) {
      slot.remove(slot.children[0]);
    }
    
    mounted.slot.children.forEach(child => {
      slot.add(child.clone());
    });
  });
  
  return slot;
}

export function nightstandHeight(): number {
  return cachedHeight;
}

// ═══════════════════════════════════════════════════════════
// INTERACTIONS PUBLIQUES
// ═══════════════════════════════════════════

export function openDrawer(host: THREE.Group): boolean {
  return toggleDrawer(host);
}

export function toggleLampLight(host: THREE.Group): boolean {
  const lamp = host.getObjectByName("nightstand-lamp") as THREE.Group;
  if (!lamp) return false;
  return toggleLamp(lamp);
}

export function interactWithItem(host: THREE.Group, itemId: string): boolean {
  const item = host.getObjectByName(itemId);
  if (!item) return false;
  
  // TODO: Implémenter callback d'interaction
  console.log(`[Nightstand] Interaction avec ${itemId}`);
  return true;
}

// ═══════════════════════════════════════════════════════════
// HELPERS EXPORTÉS
// ═══════════════════════════════════════════

export function getNightstandVariant(style: NightstandStyle): NightstandVariant | undefined {
  return NIGHTSTAND_VARIANTS.find(v => v.style === style);
}

export function getAllNightstandVariants(): NightstandVariant[] {
  return [...NIGHTSTAND_VARIANTS];
}

export function clearNightstandCache(): void {
  for (const cached of cache.values()) {
    disposeGroup(cached.group);
  }
  cache.clear();
  accessOrder.length = 0;
}

export function getNightstandCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(cache.entries()).map(([key, value]) => ({
      key,
      refCount: value.refCount,
      lastAccess: new Date(value.lastAccess).toISOString(),
      height: value.height,
    })),
  };
}
