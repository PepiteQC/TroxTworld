/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈME DE SOFAS & MOBILIER — CHARGEMENT & INSTANCIATION (v2.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES :
 *  - Cache LRU avec disposal automatique
 *  - 6 variantes de sofas (moderne, classique, sectionnel, etc.)
 *  - Matériaux configurables (tissu, cuir, couleurs custom)
 *  - Animations interactives (coussins qui s'enfoncent)
 *  - LOD (Level of Detail) pour performance
 *  - Fallback procédural avancé
 *  - Système de placement intelligent
 *  - Support OBJ + GLB
 *  - Interactivité (s'asseoir, se lever)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { tex } from "./textures";
import { matLib } from "./materials";

// ═══════════════════════════════════════════════════════════
// TYPES — VARIANTES & CONFIGURATION
// ═══════════════════════════════════════════════════════════

export type SofaStyle = 
  | "modern"      // Moderne minimaliste
  | "classic"     // Classique traditionnel
  | "sectional"   // Sectionnel en L
  | "loveseat"    // 2 places compact
  | "recliner"    // Fauteuil inclinable
  | "chesterfield"; // Chesterfield capitonné

export type SofaMaterial = 
  | "cloth"       // Tissu
  | "leather"     // Cuir
  | "velvet"      // Velours
  | "linen";      // Lin

export interface SofaConfig {
  style: SofaStyle;
  material: SofaMaterial;
  color: number;
  width: number;      // Largeur cible en mètres
  seats: number;      // Nombre de places
  interactive: boolean;
}

export interface SofaVariant {
  id: string;
  style: SofaStyle;
  modelPath: string;
  format: "obj" | "glb";
  defaultWidth: number;
  defaultSeats: number;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════

const DEFAULT_WIDTH = 2.15;
const MAX_CACHE_SIZE = 10;
const LOD_DISTANCES = [0, 15, 40]; // Distances pour LOD

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES VARIANTES
// ═══════════════════════════════════════════════════════════

const SOFA_VARIANTS: SofaVariant[] = [
  {
    id: "sofa_modern",
    style: "modern",
    modelPath: "/models/sofa_modern.obj",
    format: "obj",
    defaultWidth: 2.15,
    defaultSeats: 3,
  },
  {
    id: "sofa_classic",
    style: "classic",
    modelPath: "/models/sofa_classic.obj",
    format: "obj",
    defaultWidth: 2.3,
    defaultSeats: 3,
  },
  {
    id: "sofa_sectional",
    style: "sectional",
    modelPath: "/models/sofa_sectional.glb",
    format: "glb",
    defaultWidth: 3.5,
    defaultSeats: 5,
  },
  {
    id: "sofa_loveseat",
    style: "loveseat",
    modelPath: "/models/sofa_loveseat.obj",
    format: "obj",
    defaultWidth: 1.6,
    defaultSeats: 2,
  },
  {
    id: "sofa_recliner",
    style: "recliner",
    modelPath: "/models/sofa_recliner.glb",
    format: "glb",
    defaultWidth: 1.0,
    defaultSeats: 1,
  },
  {
    id: "sofa_chesterfield",
    style: "chesterfield",
    modelPath: "/models/sofa_chesterfield.obj",
    format: "obj",
    defaultWidth: 2.4,
    defaultSeats: 3,
  },
];

// ═══════════════════════════════════════════════════════════
// CACHE LRU (Least Recently Used)
// ═══════════════════════════════════════════════════════════

interface CachedSofa {
  group: THREE.Group;
  lastAccess: number;
  refCount: number;
}

const cache = new Map<string, CachedSofa>();
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
// ═══════════════════════════════════════════════════════════

const box = new THREE.Box3();
const size = new THREE.Vector3();

function fitToWidth(root: THREE.Object3D, targetWidth: number): void {
  box.setFromObject(root);
  box.getSize(size);
  const scale = targetWidth / Math.max(0.01, size.x);
  root.scale.multiplyScalar(scale);
  
  // Centrer
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
}

function createMaterial(type: SofaMaterial, color: number): THREE.Material {
  switch (type) {
    case "cloth":
      return tex.cloth("laineTricot", "laineKnitNrm", 2.4, 1.6, 0.9, color, 0.92);
    
    case "leather":
      return (matLib as any).physical(color, 0.15, 0.6, 0.4);
    
    case "velvet":
      const velvetMat = matLib.get(color, 0.85, 0.1);
      (velvetMat as any).sheen = 1.0;
      (velvetMat as any).sheenColor = new THREE.Color(color).multiplyScalar(1.2);
      return velvetMat;
    
    case "linen":
      return (tex as any).cloth("linWeave", "linNormal", 1.8, 1.2, 0.7, color, 0.85);
    
    default:
      return matLib.get(color, 0.5, 0.3);
  }
}

// ═══════════════════════════════════════════════════════════
// FALLBACK PROCÉDURAL (si modèle indisponible)
// ═══════════════════════════════════════════════════════════

function buildProceduralSofa(config: SofaConfig): THREE.Group {
  const group = new THREE.Group();
  group.name = "sofa-procedural";
  
  const mat = createMaterial(config.material, config.color);
  const legMat = matLib.get(0x3a2a1a, 0.6, 0.2);
  
  const width = config.width;
  const depth = 0.9;
  const seatHeight = 0.45;
  const backHeight = 0.85;
  const armHeight = 0.65;
  
  // Base/assise
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.2, depth),
    mat
  );
  seat.position.y = seatHeight;
  seat.castShadow = true;
  seat.receiveShadow = true;
  seat.name = "seat";
  group.add(seat);
  
  // Dossier
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(width, backHeight - seatHeight, 0.15),
    mat
  );
  back.position.set(0, seatHeight + (backHeight - seatHeight) / 2, -depth / 2 + 0.075);
  back.castShadow = true;
  back.receiveShadow = true;
  back.name = "back";
  group.add(back);
  
  // Accoudoirs
  const armWidth = 0.15;
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(armWidth, armHeight - 0.2, depth),
      mat
    );
    arm.position.set(side * (width / 2 - armWidth / 2), seatHeight + (armHeight - 0.2) / 2, 0);
    arm.castShadow = true;
    arm.receiveShadow = true;
    arm.name = `arm_${side > 0 ? "right" : "left"}`;
    group.add(arm);
  }
  
  // Coussins (si 3+ places)
  if (config.seats >= 3) {
    const cushionWidth = (width - 0.3) / config.seats;
    for (let i = 0; i < config.seats; i++) {
      const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(cushionWidth * 0.9, 0.12, depth * 0.7),
        mat
      );
      cushion.position.set(
        -width / 2 + 0.15 + cushionWidth * (i + 0.5),
        seatHeight + 0.16,
        0.05
      );
      cushion.castShadow = true;
      cushion.receiveShadow = true;
      cushion.name = `cushion_${i}`;
      cushion.userData.isCushion = true;
      cushion.userData.originalY = cushion.position.y;
      group.add(cushion);
    }
  }
  
  // Pieds
  const legHeight = seatHeight - 0.2;
  const legSize = 0.08;
  const legPositions = [
    [-width / 2 + 0.1, legHeight / 2, -depth / 2 + 0.1],
    [width / 2 - 0.1, legHeight / 2, -depth / 2 + 0.1],
    [-width / 2 + 0.1, legHeight / 2, depth / 2 - 0.1],
    [width / 2 - 0.1, legHeight / 2, depth / 2 - 0.1],
  ];
  
  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(legSize, legHeight, legSize),
      legMat
    );
    leg.position.set(x, y, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }
  
  return group;
}

// ═══════════════════════════════════════════════════════════
// CHARGEMENT DES MODÈLES
// ═══════════════════════════════════════════════════════════

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
  wrap.name = "sofa-obj";
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
  wrap.name = "sofa-glb";
  wrap.add(gltf.scene);
  return wrap;
}

async function loadSofaModel(variant: SofaVariant, config: SofaConfig): Promise<THREE.Group> {
  const cacheKey = `${variant.id}_${config.material}_${config.color.toString(16)}`;
  
  // Vérifier cache
  const cached = cache.get(cacheKey);
  if (cached) {
    cached.lastAccess = Date.now();
    cached.refCount++;
    touchCache(cacheKey);
    return cached.group.clone();
  }
  
  // Vérifier si déjà en cours de chargement
  if (inflight.has(cacheKey)) {
    const src = await inflight.get(cacheKey)!;
    return src.clone();
  }
  
  // Charger
  const material = createMaterial(config.material, config.color);
  const promise = variant.format === "glb"
    ? loadGLB(variant.modelPath, material)
    : loadOBJ(variant.modelPath, material);
  
  inflight.set(cacheKey, promise);
  
  try {
    const src = await promise;
    fitToWidth(src, config.width);
    
    // Cacher
    cache.set(cacheKey, {
      group: src,
      lastAccess: Date.now(),
      refCount: 1,
    });
    touchCache(cacheKey);
    evictIfNeeded();
    
    return src.clone();
  } catch (err) {
    console.warn(`[Sofa] Failed to load ${variant.modelPath}, using procedural fallback`);
    return buildProceduralSofa(config);
  } finally {
    inflight.delete(cacheKey);
  }
}

// ═══════════════════════════════════════════════════════════
// ANIMATIONS INTERACTIVES
// ═══════════════════════════════════════════════════════════

export interface SofaInteraction {
  sofa: THREE.Group;
  cushionIndex: number;
  isOccupied: boolean;
  occupantId?: string;
}

const activeInteractions = new Map<string, SofaInteraction>();

export function sitOnSofa(sofaId: string, playerId: string, cushionIndex = 0): boolean {
  const interaction = activeInteractions.get(sofaId);
  if (!interaction || interaction.isOccupied) return false;
  
  interaction.isOccupied = true;
  interaction.occupantId = playerId;
  
  // Animer le coussin (s'enfonce)
  const cushion = interaction.sofa.getObjectByName(`cushion_${cushionIndex}`);
  if (cushion && cushion.userData.isCushion) {
    const originalY = cushion.userData.originalY as number;
    cushion.userData.targetY = originalY - 0.05;
  }
  
  return true;
}

export function standUpFromSofa(sofaId: string, playerId: string): boolean {
  const interaction = activeInteractions.get(sofaId);
  if (!interaction || interaction.occupantId !== playerId) return false;
  
  interaction.isOccupied = false;
  interaction.occupantId = undefined;
  
  // Restaurer tous les coussins
  interaction.sofa.traverse((obj) => {
    if (obj.userData.isCushion) {
      obj.userData.targetY = obj.userData.originalY;
    }
  });
  
  return true;
}

export function updateSofaAnimations(dt: number): void {
  for (const interaction of activeInteractions.values()) {
    interaction.sofa.traverse((obj) => {
      if (obj.userData.isCushion && obj.userData.targetY !== undefined) {
        const currentY = obj.position.y;
        const targetY = obj.userData.targetY as number;
        const speed = 3.0;
        
        obj.position.y += (targetY - currentY) * speed * dt;
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════
// API PUBLIQUE — MOUNT & DISPOSE
// ═══════════════════════════════════════════════════════════

export interface MountedSofa {
  slot: THREE.Group;
  config: SofaConfig;
  dispose: () => void;
}

/**
 * Monte un sofa dans un groupe hôte avec configuration complète.
 */
export async function mountSofa(
  host: THREE.Group,
  config: Partial<SofaConfig> = {}
): Promise<MountedSofa> {
  const fullConfig: SofaConfig = {
    style: config.style ?? "modern",
    material: config.material ?? "cloth",
    color: config.color ?? 0x4a4a6a,
    width: config.width ?? DEFAULT_WIDTH,
    seats: config.seats ?? 3,
    interactive: config.interactive ?? true,
  };
  
  const variant = SOFA_VARIANTS.find(v => v.style === fullConfig.style) ?? SOFA_VARIANTS[0];
  
  const slot = new THREE.Group();
  slot.name = `sofa-slot-${variant.id}`;
  host.add(slot);
  
  const token = { id: `${variant.id}_${Date.now()}` };
  slot.userData.sofaToken = token;
  
  try {
    const src = await loadSofaModel(variant, fullConfig);
    
    // Vérifier que le slot n'a pas été détruit pendant le chargement
    if (slot.userData.sofaToken !== token) {
      disposeGroup(src);
      return { slot, config: fullConfig, dispose: () => {} };
    }
    
    src.name = "sofa-rig";
    slot.add(src);
    
    // Masquer le dummy si présent
    const dummy = host.getObjectByName("sofa-dummy");
    if (dummy) dummy.visible = false;
    
    // Enregistrer pour interactions
    if (fullConfig.interactive) {
      const sofaId = slot.uuid;
      activeInteractions.set(sofaId, {
        sofa: src,
        cushionIndex: 0,
        isOccupied: false,
      });
    }
    
    return {
      slot,
      config: fullConfig,
      dispose: () => {
        const cached = cache.get(`${variant.id}_${fullConfig.material}_${fullConfig.color.toString(16)}`);
        if (cached) {
          cached.refCount = Math.max(0, cached.refCount - 1);
        }
        
        activeInteractions.delete(slot.uuid);
        slot.parent?.remove(slot);
        disposeGroup(slot);
      },
    };
  } catch (err) {
    console.error("[Sofa] Mount failed:", err);
    return { slot, config: fullConfig, dispose: () => {} };
  }
}

/**
 * Version synchrone simplifiée (compatibilité rétroactive).
 */
export function mountSofaMesh(host: THREE.Group): THREE.Group {
  const slot = new THREE.Group();
  slot.name = "sofa-slot";
  host.add(slot);
  
  const token = { id: "sofa" };
  slot.userData.sofaToken = token;
  
  // Chargement asynchrone en arrière-plan
  mountSofa(host, { style: "modern" }).then((mounted) => {
    if (slot.userData.sofaToken !== token) return;
    
    // Remplacer le slot vide par le sofa chargé
    while (slot.children.length > 0) {
      slot.remove(slot.children[0]);
    }
    
    mounted.slot.children.forEach(child => {
      slot.add(child.clone());
    });
  });
  
  return slot;
}

// ═══════════════════════════════════════════════════════════
// HELPERS EXPORTÉS
// ═══════════════════════════════════════════════════════════

export function getSofaVariant(style: SofaStyle): SofaVariant | undefined {
  return SOFA_VARIANTS.find(v => v.style === style);
}

export function getAllSofaVariants(): SofaVariant[] {
  return [...SOFA_VARIANTS];
}

export function clearSofaCache(): void {
  for (const cached of cache.values()) {
    disposeGroup(cached.group);
  }
  cache.clear();
  accessOrder.length = 0;
}

export function getSofaCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(cache.entries()).map(([key, value]) => ({
      key,
      refCount: value.refCount,
      lastAccess: new Date(value.lastAccess).toISOString(),
    })),
  };
}
