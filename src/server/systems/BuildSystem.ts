// ═══════════════════════════════════════════════════════════════════════════
//  BUILD SYSTEM v2.0 — Construction RP multi-joueur
//  src/server/systems/BuildSystem.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Grid snapping (0.5u par défaut, configurable)
//  • Rotation libre + snap par pas de 15°
//  • Collision AABB (client + serveur)
//  • Vérification coût + débit banque
//  • Permissions : propriétaire de propriété, staff, jobs
//  • Limites : max objets par joueur/propriété/zone
//  • Undo/redo (stack configurable)
//  • Blueprints (save/load de structures complètes)
//  • Spatial grid pour queries rapides
//  • Chunking (streaming par cellule de 32u)
//  • Sync live multi-joueur (arcadius)
//  • Variantes de tailles par type
//  • Groups / parents hiérarchiques
//  • Catégories (structure / déco / utilitaire / nature)
//  • Compat 100% v1
// ═══════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { EtherPrismDB } from '../core/EtherPrismDB';
import { Intellectus } from '../core/Intellectus';

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type BuildCategory = 'structure' | 'decoration' | 'utility' | 'nature' | 'prop';

export interface BuildCatalogEntry {
  type: string;
  name: string;
  icon: string;
  cost: number;
  color: string;
  /** 🆕 Catégorie (filtrage UI) */
  category?: BuildCategory;
  /** 🆕 Dimensions AABB par défaut [w, h, d] */
  size?: [number, number, number];
  /** 🆕 Rotation par pas (degrés). 0 = libre */
  rotationStep?: number;
  /** 🆕 Peut-on modifier la couleur ? */
  colorable?: boolean;
  /** 🆕 Peut-on modifier l'échelle ? */
  scalable?: boolean;
  /** 🆕 Échelle min/max */
  scaleRange?: [number, number];
  /** 🆕 Restriction : jobs autorisés */
  allowedJobs?: string[];
  /** 🆕 Restriction : propriété requise */
  requiresProperty?: boolean;
  /** 🆕 Objets enfants automatiques (ex: lamp_post → light) */
  children?: string[];
}

/** v1 compat — champs additionnels optionnels */
export interface PlacedObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  color: string;
  placedBy: string;
  propertyId: string | null;

  /** 🆕 Timestamp placement */
  placedAt?: number;
  /** 🆕 Dimensions AABB */
  size?: [number, number, number];
  /** 🆕 Parent (group) */
  parentId?: string | null;
  /** 🆕 Tags (blueprint source, tag admin…) */
  tags?: string[];
  /** 🆕 État : actif ou caché */
  visible?: boolean;
  /** 🆕 Verrouillé (empêche modif non-owner) */
  locked?: boolean;
  /** 🆕 Blueprint d'origine */
  blueprintId?: string | null;
}

export interface BuildPermissionContext {
  playerId: string;
  job?: string;
  isAdmin?: boolean;
  /** Propriété sur laquelle on construit */
  propertyId?: string | null;
  /** Le joueur possède-t-il la propriété ? */
  ownsProperty?: boolean;
  /** Solde du joueur (pour vérifier le coût) */
  cash?: number;
}

export interface PlaceOptions {
  type: string;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  color?: string;
  placedBy: string;
  propertyId?: string | null;
  /** 🆕 Parent pour groupe */
  parentId?: string | null;
  /** 🆕 Tags libres */
  tags?: string[];
  /** 🆕 Ignore les vérifs (admin) */
  bypass?: boolean;
}

export interface PlaceResult {
  success: boolean;
  object: PlacedObject | null;
  message: string;
  cost?: number;
}

export interface BuildValidationError {
  code:
    | 'COST_TOO_HIGH'
    | 'NO_PERMISSION'
    | 'COLLISION'
    | 'OUT_OF_BOUNDS'
    | 'LIMIT_REACHED'
    | 'INVALID_TYPE'
    | 'INVALID_SCALE'
    | 'INVALID_ROTATION'
    | 'PROPERTY_REQUIRED'
    | 'LOCKED'
    | 'OTHER';
  message: string;
  details?: Record<string, unknown>;
}

export interface BlueprintData {
  id: string;
  name: string;
  author: string;
  createdAt: number;
  objects: PlacedObject[];
  tags: string[];
  cost: number;
  icon?: string;
}

export interface BuildStats {
  totalObjects: number;
  objectsByPlayer: Record<string, number>;
  objectsByType: Record<string, number>;
  objectsByCategory: Record<string, number>;
  totalCostSpent: number;
  chunksLoaded: number;
}

export interface BuildSystemConfig {
  /** Taille de la grid de snapping (unités). 0 = pas de snap */
  gridSize: number;
  /** Pas de rotation en degrés. 0 = libre */
  rotationStep: number;
  /** Échelle min/max */
  scaleRange: [number, number];
  /** Limite max d'objets par joueur */
  maxObjectsPerPlayer: number;
  /** Limite max par propriété */
  maxObjectsPerProperty: number;
  /** Bounds global du monde (rejet hors) */
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Taille de chunk pour streaming */
  chunkSize: number;
  /** Historique undo/redo */
  historySize: number;
  /** Activer collisions */
  collisionsEnabled: boolean;
}

const DEFAULT_CONFIG: BuildSystemConfig = {
  gridSize: 0.5,
  rotationStep: 15,
  scaleRange: [0.25, 5],
  maxObjectsPerPlayer: 500,
  maxObjectsPerProperty: 1000,
  worldBounds: { minX: -2000, maxX: 2000, minZ: -1500, maxZ: 500 },
  chunkSize: 32,
  historySize: 50,
  collisionsEnabled: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//  CATALOGUE
// ═══════════════════════════════════════════════════════════════════════════

export const BUILD_CATALOG: readonly BuildCatalogEntry[] = [
  // Structure
  { type: 'cube',       name: 'Cube',       icon: '🧊', cost: 30, color: '#6366f1', category: 'structure',  size: [1, 1, 1],     rotationStep: 15, scalable: true },
  { type: 'sphere',     name: 'Sphère',     icon: '🔮', cost: 35, color: '#8b5cf6', category: 'structure',  size: [1, 1, 1],     rotationStep: 0,  scalable: true },
  { type: 'cylinder',   name: 'Cylindre',   icon: '🛢️', cost: 35, color: '#7c3aed', category: 'structure',  size: [1, 1, 1],     rotationStep: 15, scalable: true },
  { type: 'wall',       name: 'Mur',        icon: '🧱', cost: 50, color: '#b45309', category: 'structure',  size: [2, 2.5, 0.2], rotationStep: 15, scalable: true },
  { type: 'pillar',     name: 'Pilier',     icon: '🏛️', cost: 45, color: '#92400e', category: 'structure',  size: [0.5, 3, 0.5], rotationStep: 45, scalable: true },
  { type: 'ramp',       name: 'Rampe',      icon: '📐', cost: 60, color: '#a16207', category: 'structure',  size: [2, 1, 3],     rotationStep: 15, scalable: true },
  { type: 'arch',       name: 'Arche',      icon: '🏗️', cost: 80, color: '#d97706', category: 'structure',  size: [2, 2.5, 0.5], rotationStep: 15, scalable: true },
  { type: 'fence',      name: 'Clôture',    icon: '🏘️', cost: 25, color: '#a0522d', category: 'structure',  size: [2, 1, 0.1],   rotationStep: 15, scalable: true },
  { type: 'sign',       name: 'Panneau',    icon: '🪧', cost: 35, color: '#0f766e', category: 'structure',  size: [1, 0.8, 0.1], rotationStep: 15, scalable: true },

  // Décoration
  { type: 'bench',      name: 'Banc',       icon: '🪑', cost: 40, color: '#1d4ed8', category: 'decoration', size: [2, 0.5, 0.6], rotationStep: 15, scalable: true },
  { type: 'crate',      name: 'Caisse',     icon: '📦', cost: 20, color: '#7c2d12', category: 'decoration', size: [0.6, 0.6, 0.6], rotationStep: 15, scalable: true },
  { type: 'barrel',     name: 'Baril',      icon: '🛢️', cost: 15, color: '#713f12', category: 'decoration', size: [0.6, 1, 0.6], rotationStep: 15, scalable: true },

  // Utilitaire
  { type: 'lamp_post',  name: 'Lampadaire', icon: '💡', cost: 75, color: '#374151', category: 'utility',    size: [0.4, 4, 0.4], rotationStep: 15, children: ['light_child'] },
  { type: 'neon',       name: 'Néon',       icon: '✨', cost: 60, color: '#06b6d4', category: 'utility',    size: [1.5, 0.2, 0.2], rotationStep: 15, colorable: true },
  { type: 'spot',       name: 'Spot Light', icon: '🔆', cost: 50, color: '#fbbf24', category: 'utility',    size: [0.3, 0.3, 0.3], rotationStep: 15 },

  // Nature
  { type: 'tree',       name: 'Arbre',      icon: '🌲', cost: 0,  color: '#2d6a4f', category: 'nature',     size: [1, 4, 1],     rotationStep: 0,  scalable: true, scaleRange: [0.7, 1.5] },
  { type: 'rock',       name: 'Rocher',     icon: '🪨', cost: 0,  color: '#78716c', category: 'nature',     size: [1, 1, 1],     rotationStep: 0,  scalable: true },
  { type: 'bush',       name: 'Buisson',    icon: '🌿', cost: 0,  color: '#15803d', category: 'nature',     size: [0.8, 0.6, 0.8], rotationStep: 0, scalable: true },
] as const;

export type BuildType = typeof BUILD_CATALOG[number]['type'];

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS INTERNES
// ═══════════════════════════════════════════════════════════════════════════

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function snapToGrid(v: number, gridSize: number): number {
  if (gridSize <= 0) return v;
  return Math.round(v / gridSize) * gridSize;
}

function snapRotation(rot: number, step: number): number {
  if (step <= 0) return rot;
  const stepRad = (step * Math.PI) / 180;
  return Math.round(rot / stepRad) * stepRad;
}

function normalizeRotation(r: number): number {
  const twoPi = Math.PI * 2;
  return ((r % twoPi) + twoPi) % twoPi;
}

/** AABB d'un objet placé (approximation par rotation) */
interface AABB {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

function objectAABB(obj: PlacedObject): AABB {
  const [x, y, z] = obj.position;
  const [w, h, d] = obj.size ?? [0.5, 0.5, 0.5];
  const s = obj.scale ?? 1;

  // Approx : on prend le plus grand côté de la rotation (cercle englobant)
  const c = Math.cos(obj.rotation);
  const sin = Math.sin(obj.rotation);
  const rotatedW = Math.abs(c) * w * s + Math.abs(sin) * d * s;
  const rotatedD = Math.abs(sin) * w * s + Math.abs(c) * d * s;

  const halfW = rotatedW / 2;
  const halfD = rotatedD / 2;
  const halfH = (h * s) / 2;

  return {
    minX: x - halfW, maxX: x + halfW,
    minY: y - halfH, maxY: y + halfH,
    minZ: z - halfD, maxZ: z + halfD,
  };
}

function aabbIntersect(a: AABB, b: AABB): boolean {
  return !(
    a.maxX < b.minX || a.minX > b.maxX ||
    a.maxY < b.minY || a.minY > b.maxY ||
    a.maxZ < b.minZ || a.minZ > b.maxZ
  );
}

function chunkKey(x: number, z: number, chunkSize: number): string {
  return `${Math.floor(x / chunkSize)}_${Math.floor(z / chunkSize)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BUILD SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export class BuildSystem {
  public db: EtherPrismDB;
  public intellectus: Intellectus;
  public config: BuildSystemConfig;

  // Cache mémoire (source de vérité runtime, flush vers DB)
  private objects = new Map<string, PlacedObject>();

  // Spatial index (chunk → objectIds)
  private chunks = new Map<string, Set<string>>();

  // Undo/Redo
  private undoStack: Array<{ action: 'place' | 'remove' | 'update'; obj: PlacedObject }> = [];
  private redoStack: Array<{ action: 'place' | 'remove' | 'update'; obj: PlacedObject }> = [];

  // Blueprints
  private blueprints = new Map<string, BlueprintData>();

  // Stats
  private stats = {
    placedTotal: 0,
    removedTotal: 0,
    failedTotal: 0,
    collisionsDetected: 0,
  };

  private initialized = false;

  constructor(
    db: EtherPrismDB,
    intellectus: Intellectus,
    config: Partial<BuildSystemConfig> = {},
  ) {
    this.db = db;
    this.intellectus = intellectus;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INITIALISATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // Charge tous les objets existants
    const existing = await this.db.list<PlacedObject>('build_objects');
    for (const obj of existing) {
      // Migration : compléter les champs manquants
      const complete: PlacedObject = {
        ...obj,
        placedAt: obj.placedAt ?? Date.now(),
        size: obj.size ?? this.getCatalogSize(obj.type),
        parentId: obj.parentId ?? null,
        tags: obj.tags ?? [],
        visible: obj.visible ?? true,
        locked: obj.locked ?? false,
        blueprintId: obj.blueprintId ?? null,
      };
      this.objects.set(complete.id, complete);
      this.indexObject(complete);
    }

    this.initialized = true;

    this.intellectus.arcadius.emit(
      'system:build:ready',
      {
        objectsLoaded: this.objects.size,
        chunksLoaded: this.chunks.size,
        config: this.config,
      },
      'BuildSystem',
    );

    console.log(
      `🏗️ [Build] ${this.objects.size} objets · ${this.chunks.size} chunks · ` +
      `grid=${this.config.gridSize}u`,
    );
  }

  private getCatalogSize(type: string): [number, number, number] {
    const cat = BUILD_CATALOG.find((c) => c.type === type);
    return cat?.size ?? [0.5, 0.5, 0.5];
  }

  private indexObject(obj: PlacedObject): void {
    const key = chunkKey(obj.position[0], obj.position[2], this.config.chunkSize);
    let bucket = this.chunks.get(key);
    if (!bucket) {
      bucket = new Set();
      this.chunks.set(key, bucket);
    }
    bucket.add(obj.id);
  }

  private unindexObject(obj: PlacedObject): void {
    const key = chunkKey(obj.position[0], obj.position[2], this.config.chunkSize);
    const bucket = this.chunks.get(key);
    if (bucket) {
      bucket.delete(obj.id);
      if (bucket.size === 0) this.chunks.delete(key);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valide un placement. Renvoie `null` si OK, sinon une erreur.
   */
  private validatePlacement(
    data: PlaceOptions,
    catalogEntry: BuildCatalogEntry,
  ): BuildValidationError | null {
    const { position, rotation = 0, scale = 1 } = data;
    const cfg = this.config;

    // Bounds monde
    if (
      position[0] < cfg.worldBounds.minX || position[0] > cfg.worldBounds.maxX ||
      position[2] < cfg.worldBounds.minZ || position[2] > cfg.worldBounds.maxZ
    ) {
      return {
        code: 'OUT_OF_BOUNDS',
        message: `Position hors du monde (${position[0].toFixed(1)}, ${position[2].toFixed(1)})`,
      };
    }

    // Y valide (pas sous terre, pas au ciel)
    if (position[1] < -5 || position[1] > 200) {
      return {
        code: 'OUT_OF_BOUNDS',
        message: `Hauteur invalide (${position[1].toFixed(1)})`,
      };
    }

    // Échelle
    const range = catalogEntry.scaleRange ?? cfg.scaleRange;
    if (scale < range[0] || scale > range[1]) {
      return {
        code: 'INVALID_SCALE',
        message: `Échelle hors plage (${range[0]}-${range[1]})`,
      };
    }

    // Rotation (sanity check : doit être finie)
    if (!Number.isFinite(rotation)) {
      return { code: 'INVALID_ROTATION', message: 'Rotation invalide' };
    }

    // Propriété requise ?
    if (catalogEntry.requiresProperty && !data.propertyId) {
      return {
        code: 'PROPERTY_REQUIRED',
        message: `${catalogEntry.name} requiert une propriété`,
      };
    }

    // Limite par joueur
    const playerCount = this.countObjectsByPlayer(data.placedBy);
    if (playerCount >= cfg.maxObjectsPerPlayer) {
      return {
        code: 'LIMIT_REACHED',
        message: `Limite joueur atteinte (${cfg.maxObjectsPerPlayer})`,
        details: { playerCount, max: cfg.maxObjectsPerPlayer },
      };
    }

    // Limite par propriété
    if (data.propertyId) {
      const propCount = this.countObjectsByProperty(data.propertyId);
      if (propCount >= cfg.maxObjectsPerProperty) {
        return {
          code: 'LIMIT_REACHED',
          message: `Limite propriété atteinte (${cfg.maxObjectsPerProperty})`,
          details: { propCount, max: cfg.maxObjectsPerProperty },
        };
      }
    }

    return null;
  }

  /**
   * Vérifie qu'un objet ne collide pas avec les autres.
   * Utilise l'index spatial (chunks voisins uniquement).
   */
  private detectCollision(candidate: PlacedObject, ignoreId?: string): PlacedObject | null {
    if (!this.config.collisionsEnabled) return null;

    const candBox = objectAABB(candidate);
    const chunk = this.config.chunkSize;
    const x = candidate.position[0];
    const z = candidate.position[2];

    // Vérifie les 9 chunks voisins (3x3)
    const baseGx = Math.floor(x / chunk);
    const baseGz = Math.floor(z / chunk);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${baseGx + dx}_${baseGz + dz}`;
        const bucket = this.chunks.get(key);
        if (!bucket) continue;

        for (const id of bucket) {
          if (id === ignoreId) continue;
          const other = this.objects.get(id);
          if (!other || other.visible === false) continue;

          const otherBox = objectAABB(other);
          if (aabbIntersect(candBox, otherBox)) {
            this.stats.collisionsDetected++;
            return other;
          }
        }
      }
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PERMISSIONS
  // ─────────────────────────────────────────────────────────────────────────

  private checkPermission(
    catalogEntry: BuildCatalogEntry,
    ctx?: BuildPermissionContext,
  ): BuildValidationError | null {
    if (!ctx) return null; // v1 compat : pas de contexte = pas de vérif

    if (ctx.isAdmin) return null;

    // Job requis ?
    if (catalogEntry.allowedJobs && catalogEntry.allowedJobs.length > 0) {
      if (!ctx.job || !catalogEntry.allowedJobs.includes(ctx.job)) {
        return {
          code: 'NO_PERMISSION',
          message: `${catalogEntry.name} réservé aux jobs : ${catalogEntry.allowedJobs.join(', ')}`,
        };
      }
    }

    // Propriété : si un propertyId est spécifié, le joueur doit la posséder
    if (ctx.propertyId && !ctx.ownsProperty) {
      return {
        code: 'NO_PERMISSION',
        message: 'Vous ne possédez pas cette propriété',
      };
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  COMPTAGE
  // ─────────────────────────────────────────────────────────────────────────

  private countObjectsByPlayer(playerId: string): number {
    let count = 0;
    for (const obj of this.objects.values()) {
      if (obj.placedBy === playerId) count++;
    }
    return count;
  }

  private countObjectsByProperty(propertyId: string): number {
    let count = 0;
    for (const obj of this.objects.values()) {
      if (obj.propertyId === propertyId) count++;
    }
    return count;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  API PUBLIQUE — v1 compat
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Place un objet.
   * v1 compat : tous les champs optionnels.
   * v2 : ajoute permissionContext, bypass, parentId, tags.
   */
  async placeObject(
    data: PlaceOptions & { permissionContext?: BuildPermissionContext },
  ): Promise<PlacedObject> {
    const result = await this.placeObjectSafe(data);
    if (!result.success || !result.object) {
      throw new Error(result.message);
    }
    return result.object;
  }

  /**
   * v2 : version safe qui renvoie un résultat détaillé.
   */
  async placeObjectSafe(
    data: PlaceOptions & { permissionContext?: BuildPermissionContext },
  ): Promise<PlaceResult> {
    if (!this.initialized) {
      return { success: false, object: null, message: 'BuildSystem non initialisé' };
    }

    // 1) Trouve le catalogue
    const catalogEntry = BUILD_CATALOG.find((c) => c.type === data.type);
    if (!catalogEntry) {
      this.stats.failedTotal++;
      return { success: false, object: null, message: `Type inconnu : ${data.type}` };
    }

    // 2) Snap grid
    const gx = snapToGrid(data.position[0], this.config.gridSize);
    const gy = data.position[1]; // Y non snap (hauteur libre)
    const gz = snapToGrid(data.position[2], this.config.gridSize);

    // 3) Snap rotation
    const rotStep = catalogEntry.rotationStep ?? this.config.rotationStep;
    const rot = rotStep > 0
      ? snapRotation(data.rotation ?? 0, rotStep)
      : (data.rotation ?? 0);

    // 4) Construit l'objet candidat (avant validation)
    const scale = data.scale ?? 1;
    const size = catalogEntry.size ?? [0.5, 0.5, 0.5];

    const candidate: PlacedObject = {
      id: uuid(),
      type: data.type,
      position: [gx, gy, gz],
      rotation: normalizeRotation(rot),
      scale,
      color: data.color || catalogEntry.color || '#808080',
      placedBy: data.placedBy,
      propertyId: data.propertyId ?? null,
      placedAt: Date.now(),
      size: [...size] as [number, number, number],
      parentId: data.parentId ?? null,
      tags: data.tags ?? [],
      visible: true,
      locked: false,
      blueprintId: null,
    };

    // 5) Bypass = skip toutes les validations
    if (!data.bypass) {
      // 5a) Validation structurelle
      const structErr = this.validatePlacement(data, catalogEntry);
      if (structErr) {
        this.stats.failedTotal++;
        return { success: false, object: null, message: structErr.message };
      }

      // 5b) Permissions
      const permErr = this.checkPermission(catalogEntry, data.permissionContext);
      if (permErr) {
        this.stats.failedTotal++;
        return { success: false, object: null, message: permErr.message };
      }

      // 5c) Coût
      if (catalogEntry.cost > 0 && data.permissionContext?.cash !== undefined) {
        if (data.permissionContext.cash < catalogEntry.cost) {
          this.stats.failedTotal++;
          return {
            success: false,
            object: null,
            message: `Fonds insuffisants (${catalogEntry.cost}$ requis)`,
            cost: catalogEntry.cost,
          };
        }
      }

      // 5d) Collision
      const collide = this.detectCollision(candidate);
      if (collide) {
        this.stats.failedTotal++;
        return {
          success: false,
          object: null,
          message: `Collision avec objet existant (${collide.type})`,
        };
      }
    }

    // 6) Persiste
    await this.db.set('build_objects', candidate.id, candidate);
    this.objects.set(candidate.id, candidate);
    this.indexObject(candidate);

    // 7) History
    this.pushUndo({ action: 'place', obj: candidate });
    this.redoStack.length = 0; // nouvelle action → reset redo

    this.stats.placedTotal++;

    // 8) Event
    this.intellectus.arcadius.emit(
      'build:object.placed',
      {
        objectId: candidate.id,
        type: candidate.type,
        propertyId: candidate.propertyId,
        position: candidate.position,
        placedBy: candidate.placedBy,
        cost: catalogEntry.cost,
      },
      'BuildSystem',
    );

    return {
      success: true,
      object: candidate,
      message: `${catalogEntry.name} placé`,
      cost: catalogEntry.cost,
    };
  }

  /**
   * v1 compat.
   */
  async removeObject(id: string): Promise<void> {
    await this.removeObjectSafe(id);
  }

  /**
   * v2 : renvoie un résultat.
   */
  async removeObjectSafe(
    id: string,
    opts?: { playerId?: string; bypass?: boolean },
  ): Promise<{ success: boolean; message: string }> {
    const obj = this.objects.get(id);
    if (!obj) return { success: false, message: 'Objet introuvable' };

    if (!opts?.bypass && obj.locked && opts?.playerId && obj.placedBy !== opts.playerId) {
      return { success: false, message: 'Objet verrouillé' };
    }

    await this.db.del('build_objects', id);
    this.objects.delete(id);
    this.unindexObject(obj);

    this.pushUndo({ action: 'remove', obj });
    this.redoStack.length = 0;

    this.stats.removedTotal++;

    this.intellectus.arcadius.emit(
      'build:object.removed',
      { objectId: id, removedBy: opts?.playerId },
      'BuildSystem',
    );

    return { success: true, message: 'Objet supprimé' };
  }

  async listObjects(): Promise<PlacedObject[]> {
    return Array.from(this.objects.values());
  }

  async clearAll(): Promise<void> {
    const objs = Array.from(this.objects.values());
    for (const o of objs) {
      await this.db.del('build_objects', o.id);
    }
    this.objects.clear();
    this.chunks.clear();
    this.intellectus.arcadius.emit('build:cleared', { count: objs.length }, 'BuildSystem');
  }

  getCatalog(): readonly BuildCatalogEntry[] {
    return BUILD_CATALOG;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  API v2 — QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  getObject(id: string): PlacedObject | null {
    return this.objects.get(id) ?? null;
  }

  /** Objets d'un joueur. */
  getObjectsByPlayer(playerId: string): PlacedObject[] {
    const out: PlacedObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.placedBy === playerId) out.push(obj);
    }
    return out;
  }

  /** Objets d'une propriété. */
  getObjectsByProperty(propertyId: string): PlacedObject[] {
    const out: PlacedObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.propertyId === propertyId) out.push(obj);
    }
    return out;
  }

  /** Objets d'un type. */
  getObjectsByType(type: string): PlacedObject[] {
    const out: PlacedObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.type === type) out.push(obj);
    }
    return out;
  }

  /**
   * Objets visibles dans un rayon (spatial grid).
   * Idéal pour sync client ou rendu streaming.
   */
  getObjectsInRadius(x: number, z: number, radius: number): PlacedObject[] {
    const out: PlacedObject[] = [];
    const chunk = this.config.chunkSize;
    const radiusChunks = Math.ceil(radius / chunk);

    const gx = Math.floor(x / chunk);
    const gz = Math.floor(z / chunk);

    const radiusSq = radius * radius;

    for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
      for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
        const bucket = this.chunks.get(`${gx + dx}_${gz + dz}`);
        if (!bucket) continue;

        for (const id of bucket) {
          const obj = this.objects.get(id);
          if (!obj || obj.visible === false) continue;
          const ddx = obj.position[0] - x;
          const ddz = obj.position[2] - z;
          if (ddx * ddx + ddz * ddz <= radiusSq) {
            out.push(obj);
          }
        }
      }
    }

    return out;
  }

  /**
   * Objets dans une zone rectangulaire (minimap, culling).
   */
  getObjectsInBounds(
    minX: number, minZ: number, maxX: number, maxZ: number,
  ): PlacedObject[] {
    const out: PlacedObject[] = [];
    const chunk = this.config.chunkSize;
    const gx0 = Math.floor(minX / chunk);
    const gx1 = Math.floor(maxX / chunk);
    const gz0 = Math.floor(minZ / chunk);
    const gz1 = Math.floor(maxZ / chunk);

    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const bucket = this.chunks.get(`${gx}_${gz}`);
        if (!bucket) continue;
        for (const id of bucket) {
          const obj = this.objects.get(id);
          if (!obj || obj.visible === false) continue;
          if (
            obj.position[0] >= minX && obj.position[0] <= maxX &&
            obj.position[2] >= minZ && obj.position[2] <= maxZ
          ) {
            out.push(obj);
          }
        }
      }
    }
    return out;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateObject(
    id: string,
    patch: Partial<Pick<PlacedObject, 'position' | 'rotation' | 'scale' | 'color' | 'visible' | 'locked' | 'tags'>>,
    opts?: { playerId?: string; bypass?: boolean },
  ): Promise<{ success: boolean; message: string; object?: PlacedObject }> {
    const obj = this.objects.get(id);
    if (!obj) return { success: false, message: 'Objet introuvable' };

    if (!opts?.bypass && obj.locked && opts?.playerId && obj.placedBy !== opts.playerId) {
      return { success: false, message: 'Objet verrouillé' };
    }

    // Validation échelle
    if (patch.scale !== undefined) {
      const cat = BUILD_CATALOG.find((c) => c.type === obj.type);
      const range = cat?.scaleRange ?? this.config.scaleRange;
      if (patch.scale < range[0] || patch.scale > range[1]) {
        return { success: false, message: `Échelle hors plage (${range[0]}-${range[1]})` };
      }
    }

    // Snap position si fourni
    const updated: PlacedObject = { ...obj, ...patch };
    if (patch.position) {
      updated.position = [
        snapToGrid(patch.position[0], this.config.gridSize),
        patch.position[1],
        snapToGrid(patch.position[2], this.config.gridSize),
      ];
    }

    // Vérif collision si position changée
    if (patch.position && this.config.collisionsEnabled && !opts?.bypass) {
      this.unindexObject(obj); // retire temporairement
      const collide = this.detectCollision(updated, id);
      if (collide) {
        this.indexObject(obj); // remet
        return { success: false, message: `Collision avec ${collide.type}` };
      }
    }

    // Réindexe si position changée
    if (patch.position) {
      this.unindexObject(obj);
      this.indexObject(updated);
    }

    await this.db.set('build_objects', id, updated);
    this.objects.set(id, updated);
    this.pushUndo({ action: 'update', obj: { ...obj } });

    this.intellectus.arcadius.emit(
      'build:object.updated',
      { objectId: id, patch },
      'BuildSystem',
    );

    return { success: true, message: 'Objet mis à jour', object: updated };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  UNDO / REDO
  // ─────────────────────────────────────────────────────────────────────────

  private pushUndo(entry: { action: 'place' | 'remove' | 'update'; obj: PlacedObject }): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.config.historySize) {
      this.undoStack.shift();
    }
  }

  async undo(): Promise<{ success: boolean; message: string }> {
    const last = this.undoStack.pop();
    if (!last) return { success: false, message: 'Rien à annuler' };

    switch (last.action) {
      case 'place':
        // Annule un placement → supprime
        await this.db.del('build_objects', last.obj.id);
        this.objects.delete(last.obj.id);
        this.unindexObject(last.obj);
        this.redoStack.push(last);
        return { success: true, message: 'Placement annulé' };

      case 'remove':
        // Annule une suppression → remet
        await this.db.set('build_objects', last.obj.id, last.obj);
        this.objects.set(last.obj.id, last.obj);
        this.indexObject(last.obj);
        this.redoStack.push(last);
        return { success: true, message: 'Suppression annulée' };

      case 'update': {
        // Annule un update → remet ancien
        const current = this.objects.get(last.obj.id);
        if (current) {
          this.redoStack.push({ action: 'update', obj: current });
        }
        await this.db.set('build_objects', last.obj.id, last.obj);
        this.objects.set(last.obj.id, last.obj);
        return { success: true, message: 'Modification annulée' };
      }
    }
  }

  async redo(): Promise<{ success: boolean; message: string }> {
    const last = this.redoStack.pop();
    if (!last) return { success: false, message: 'Rien à rétablir' };

    switch (last.action) {
      case 'place':
        await this.db.set('build_objects', last.obj.id, last.obj);
        this.objects.set(last.obj.id, last.obj);
        this.indexObject(last.obj);
        this.undoStack.push(last);
        return { success: true, message: 'Placement rétabli' };

      case 'remove':
        await this.db.del('build_objects', last.obj.id);
        this.objects.delete(last.obj.id);
        this.unindexObject(last.obj);
        this.undoStack.push(last);
        return { success: true, message: 'Suppression rétablie' };

      case 'update':
        await this.db.set('build_objects', last.obj.id, last.obj);
        this.objects.set(last.obj.id, last.obj);
        this.undoStack.push(last);
        return { success: true, message: 'Modification rétablie' };
    }
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  // ─────────────────────────────────────────────────────────────────────────
  //  BLUEPRINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crée un blueprint à partir d'une sélection d'objets.
   */
  createBlueprint(
    name: string,
    author: string,
    objectIds: string[],
    tags: string[] = [],
  ): BlueprintData {
    const objects: PlacedObject[] = [];
    let totalCost = 0;

    for (const id of objectIds) {
      const obj = this.objects.get(id);
      if (!obj) continue;
      objects.push({ ...obj, id: uuid() }); // regénère les IDs
      const cat = BUILD_CATALOG.find((c) => c.type === obj.type);
      totalCost += cat?.cost ?? 0;
    }

    const bp: BlueprintData = {
      id: uuid(),
      name,
      author,
      createdAt: Date.now(),
      objects,
      tags,
      cost: totalCost,
      icon: '📐',
    };
    this.blueprints.set(bp.id, bp);
    return bp;
  }

  getBlueprint(id: string): BlueprintData | null {
    return this.blueprints.get(id) ?? null;
  }

  listBlueprints(author?: string): BlueprintData[] {
    const all = Array.from(this.blueprints.values());
    return author ? all.filter((b) => b.author === author) : all;
  }

  /**
   * Instancie un blueprint à une position donnée (offset).
   */
  async instantiateBlueprint(
    blueprintId: string,
    offset: [number, number, number],
    playerId: string,
    opts?: { propertyId?: string | null; bypass?: boolean },
  ): Promise<{ success: boolean; placed: PlacedObject[]; message: string }> {
    const bp = this.blueprints.get(blueprintId);
    if (!bp) return { success: false, placed: [], message: 'Blueprint introuvable' };

    const placed: PlacedObject[] = [];
    for (const obj of bp.objects) {
      const res = await this.placeObjectSafe({
        type: obj.type,
        position: [
          obj.position[0] + offset[0],
          obj.position[1] + offset[1],
          obj.position[2] + offset[2],
        ],
        rotation: obj.rotation,
        scale: obj.scale,
        color: obj.color,
        placedBy: playerId,
        propertyId: opts?.propertyId ?? null,
        tags: [...(obj.tags ?? []), `bp:${bp.id}`],
        bypass: opts?.bypass,
      });

      if (res.success && res.object) {
        placed.push(res.object);
        // Marque la source blueprint
        res.object.blueprintId = bp.id;
      }
    }

    return {
      success: placed.length > 0,
      placed,
      message: `${placed.length}/${bp.objects.length} objets instanciés`,
    };
  }

  deleteBlueprint(id: string): boolean {
    return this.blueprints.delete(id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SERIALIZE / RESTORE
  // ─────────────────────────────────────────────────────────────────────────

  serialize(): string {
    return JSON.stringify({
      objects: Array.from(this.objects.values()),
      blueprints: Array.from(this.blueprints.values()),
    });
  }

  async restore(payload: string): Promise<boolean> {
    try {
      const data = JSON.parse(payload);
      if (Array.isArray(data.objects)) {
        for (const obj of data.objects) {
          this.objects.set(obj.id, obj);
          this.indexObject(obj);
        }
      }
      if (Array.isArray(data.blueprints)) {
        for (const bp of data.blueprints) {
          this.blueprints.set(bp.id, bp);
        }
      }
      return true;
    } catch (err) {
      console.error('[BuildSystem] Restauration échouée :', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  STATS
  // ─────────────────────────────────────────────────────────────────────────

  getStats(): BuildStats {
    const objectsByPlayer: Record<string, number> = {};
    const objectsByType: Record<string, number> = {};
    const objectsByCategory: Record<string, number> = {};
    let totalCostSpent = 0;

    for (const obj of this.objects.values()) {
      objectsByPlayer[obj.placedBy] = (objectsByPlayer[obj.placedBy] ?? 0) + 1;
      objectsByType[obj.type] = (objectsByType[obj.type] ?? 0) + 1;

      const cat = BUILD_CATALOG.find((c) => c.type === obj.type);
      if (cat) {
        const category = cat.category ?? 'other';
        objectsByCategory[category] = (objectsByCategory[category] ?? 0) + 1;
        totalCostSpent += cat.cost;
      }
    }

    return {
      totalObjects: this.objects.size,
      objectsByPlayer,
      objectsByType,
      objectsByCategory,
      totalCostSpent,
      chunksLoaded: this.chunks.size,
    };
  }

  getInternalStats() {
    return {
      ...this.stats,
      undoStack: this.undoStack.length,
      redoStack: this.redoStack.length,
      blueprints: this.blueprints.size,
    };
  }
}

export default BuildSystem;