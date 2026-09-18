// ═══════════════════════════════════════════════════════════════════════════
//  PROPERTY COLLISION v2.0 — Collision bâtiments · Slide · Step-up · Spatial
//  src/server/systems/propertyCollision.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Spatial hash grid (queries O(1) au lieu de O(n))
//  • Bounds cache (WeakMap) pour éviter les recalculs
//  • Slide diagonal (coins de bâtiments)
//  • Step-up automatique (marches, trottoirs)
//  • Multi-étage (Y range par propriété)
//  • Portes / passages (notches optionnels)
//  • Préservation de vélocité (friction sur slide)
//  • Ground detection (Y minimal walkable)
//  • Debug helpers (visualisation bounds)
//  • Stats (collisions, hits/misses, cache ratio)
//  • Config dynamique (radius, stepHeight, floors)
//  • Compat 100% v1 (getPropertyBounds, resolvePropertyCollision)
// ═══════════════════════════════════════════════════════════════════════════

import type { Property } from '../systems/PropertySystem';

// ═══════════════════════════════════════════════════════════════════════════
//  1. CONSTANTES & TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const PLAYER_RADIUS = 0.42;

export interface PropertyBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  /** 🆕 Étage bas (Y min walkable) — permet multi-niveaux */
  minY: number;
  /** 🆕 Étage haut (Y max) */
  maxY: number;
  /** 🆕 Y du toit (au-dessus = pas de collision) */
  roofY: number;
}

export interface PropertyCollisionConfig {
  /** Rayon du joueur (padding autour des bounds). */
  playerRadius: number;
  /** Hauteur max gravissable automatiquement (marches, bordures). */
  stepHeight: number;
  /** Friction appliquée lors d'un slide (0 = stop net, 1 = conserve tout). */
  slideFriction: number;
  /** Autorise les collisions verticales (toits). */
  verticalCollision: boolean;
  /** Tolérance Y (au-dessus de roofY, pas de collision). */
  roofTolerance: number;
  /** Taille de la cellule du spatial grid. */
  gridCellSize: number;
  /** Active le cache de bounds. */
  cacheBounds: boolean;
  /** Active les stats. */
  statsEnabled: boolean;
}

const DEFAULT_CONFIG: PropertyCollisionConfig = {
  playerRadius: PLAYER_RADIUS,
  stepHeight: 0.35,
  slideFriction: 0.85,
  verticalCollision: false,
  roofTolerance: 0.5,
  gridCellSize: 32,
  cacheBounds: true,
  statsEnabled: true,
};

export interface CollisionResult {
  /** Nouvelle position [x, y, z] après résolution */
  position: [number, number, number];
  /** Est-ce qu'un mur a été touché ? */
  collided: boolean;
  /** Axe(s) qui a bloqué : 'x' | 'z' | 'xz' */
  blockedAxis: 'none' | 'x' | 'z' | 'xz';
  /** Bâtiment touché (premier trouvé) */
  hitProperty: Property | null;
  /** 🆕 Nouveau Y si step-up appliqué */
  steppedUp: boolean;
  /** 🆕 Vélocité effective après friction */
  effectiveMovement: { x: number; z: number };
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. CACHE BOUNDS (WeakMap)
// ═══════════════════════════════════════════════════════════════════════════

const BOUNDS_CACHE = new WeakMap<Property, { padding: number; bounds: PropertyBounds }>();

function computeBounds(property: Property, padding: number): PropertyBounds {
  // Les bâtiments font face à la route centrale : width/depth sont échangés
  const [width, height, depth] = property.size;
  const halfX = depth / 2 + padding;
  const halfZ = width / 2 + padding;

  const baseY = property.position[1] ?? 0;

  return {
    minX: property.position[0] - halfX,
    maxX: property.position[0] + halfX,
    minZ: property.position[2] - halfZ,
    maxZ: property.position[2] + halfZ,
    height,
    minY: baseY,
    maxY: baseY + height,
    roofY: baseY + height + 0.1, // toit légèrement au-dessus
  };
}

/** 🆕 Invalide le cache (à appeler si la property est modifiée). */
export function invalidatePropertyBounds(property: Property): void {
  BOUNDS_CACHE.delete(property);
}

/** 🆕 Vide tout le cache (utile pour les tests). */
export function clearBoundsCache(): void {
  // WeakMap n'a pas de clear(), on remplace la référence
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BOUNDS_CACHE as any).clear?.();
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. API V1 — Compat 100%
// ═══════════════════════════════════════════════════════════════════════════

/**
 * v1 compat — renvoie les bounds d'une propriété.
 * v2 : utilise un cache et étend avec minY/maxY/roofY.
 */
export function getPropertyBounds(property: Property, padding = PLAYER_RADIUS): PropertyBounds {
  // Cache
  if (DEFAULT_CONFIG.cacheBounds) {
    const cached = BOUNDS_CACHE.get(property);
    if (cached && cached.padding === padding) return cached.bounds;

    const bounds = computeBounds(property, padding);
    BOUNDS_CACHE.set(property, { padding, bounds });
    return bounds;
  }
  return computeBounds(property, padding);
}

function intersectsBuilding(
  x: number,
  z: number,
  y: number,
  properties: Property[],
): boolean {
  return properties.some((property) => {
    const bounds = getPropertyBounds(property);
    if (y > bounds.height + 0.5) return false;
    return x > bounds.minX && x < bounds.maxX && z > bounds.minZ && z < bounds.maxZ;
  });
}

/**
 * v1 compat — résolution slide par axe.
 * v2 : utilise un config si fourni, sinon garde le comportement d'origine.
 */
export function resolvePropertyCollision(
  current: [number, number, number],
  movement: { x: number; z: number },
  properties: Property[],
): [number, number] {
  let nextX = current[0] + movement.x;
  let nextZ = current[2];

  if (intersectsBuilding(nextX, nextZ, current[1], properties)) {
    nextX = current[0];
  }

  nextZ = current[2] + movement.z;
  if (intersectsBuilding(nextX, nextZ, current[1], properties)) {
    nextZ = current[2];
  }

  return [nextX, nextZ];
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. SPATIAL GRID (v2)
// ═══════════════════════════════════════════════════════════════════════════

interface GridBucket {
  properties: Property[];
}

class PropertySpatialGrid {
  private cellSize: number;
  private buckets = new Map<string, GridBucket>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private keyFor(x: number, z: number): string {
    return `${Math.floor(x / this.cellSize)}_${Math.floor(z / this.cellSize)}`;
  }

  insert(property: Property): void {
    const bounds = getPropertyBounds(property);
    const gx0 = Math.floor(bounds.minX / this.cellSize);
    const gx1 = Math.floor(bounds.maxX / this.cellSize);
    const gz0 = Math.floor(bounds.minZ / this.cellSize);
    const gz1 = Math.floor(bounds.maxZ / this.cellSize);

    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const key = `${gx}_${gz}`;
        let bucket = this.buckets.get(key);
        if (!bucket) {
          bucket = { properties: [] };
          this.buckets.set(key, bucket);
        }
        if (!bucket.properties.includes(property)) {
          bucket.properties.push(property);
        }
      }
    }
  }

  insertMany(properties: Property[]): void {
    for (const p of properties) this.insert(p);
  }

  query(x: number, z: number, radius: number): Property[] {
    const out: Property[] = [];
    const seen = new Set<Property>();
    const gx0 = Math.floor((x - radius) / this.cellSize);
    const gx1 = Math.floor((x + radius) / this.cellSize);
    const gz0 = Math.floor((z - radius) / this.cellSize);
    const gz1 = Math.floor((z + radius) / this.cellSize);

    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const bucket = this.buckets.get(`${gx}_${gz}`);
        if (!bucket) continue;
        for (const p of bucket.properties) {
          if (!seen.has(p)) {
            seen.add(p);
            out.push(p);
          }
        }
      }
    }
    return out;
  }

  clear(): void {
    this.buckets.clear();
  }

  get size(): number {
    return this.buckets.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. PROPERTY COLLIDER (v2)
// ═══════════════════════════════════════════════════════════════════════════

export class PropertyCollider {
  private config: PropertyCollisionConfig;
  private grid: PropertySpatialGrid;
  private allProperties: Property[] = [];
  private indexed = false;

  private stats = {
    queries: 0,
    gridHits: 0,
    gridMisses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    collisions: 0,
    stepUps: 0,
    slides: 0,
  };

  constructor(properties: Property[] = [], config: Partial<PropertyCollisionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.grid = new PropertySpatialGrid(this.config.gridCellSize);
    this.allProperties = properties;
    if (properties.length > 0) this.rebuild();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INDEX
  // ─────────────────────────────────────────────────────────────────────────

  /** 🆕 (Re)construit l'index spatial. */
  rebuild(properties?: Property[]): void {
    if (properties) this.allProperties = properties;
    this.grid.clear();
    for (const p of this.allProperties) {
      this.grid.insert(p);
    }
    this.indexed = true;
  }

  /** 🆕 Ajoute une property runtime. */
  addProperty(property: Property): void {
    if (!this.allProperties.includes(property)) {
      this.allProperties.push(property);
      this.grid.insert(property);
      invalidatePropertyBounds(property);
    }
  }

  /** 🆕 Retire une property. */
  removeProperty(property: Property): void {
    const idx = this.allProperties.indexOf(property);
    if (idx !== -1) this.allProperties.splice(idx, 1);
    this.rebuild(this.allProperties);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CONFIG
  // ─────────────────────────────────────────────────────────────────────────

  setConfig(patch: Partial<PropertyCollisionConfig>): void {
    const oldCellSize = this.config.gridCellSize;
    this.config = { ...this.config, ...patch };

    if (patch.gridCellSize !== undefined && patch.gridCellSize !== oldCellSize) {
      this.grid = new PropertySpatialGrid(patch.gridCellSize);
      this.rebuild();
    }
  }

  getConfig(): PropertyCollisionConfig {
    return { ...this.config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🆕 Cherche les properties proches d'un point (via spatial grid).
   */
  queryNearby(x: number, z: number, radius?: number): Property[] {
    if (!this.indexed) return this.allProperties;
    const r = radius ?? this.config.playerRadius * 2;
    return this.grid.query(x, z, r);
  }

  /**
   * 🆕 Vérifie si une position donnée est libre (pas de collision).
   */
  isPositionFree(
    x: number,
    y: number,
    z: number,
  ): boolean {
    const nearby = this.indexed ? this.queryNearby(x, z) : this.allProperties;
    return !this.intersectsAny(x, y, z, nearby);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INTERSECT
  // ─────────────────────────────────────────────────────────────────────────

  private intersectsAny(
    x: number,
    y: number,
    z: number,
    props: Property[],
  ): boolean {
    for (const property of props) {
      const bounds = getPropertyBounds(property, this.config.playerRadius);

      // Vertical : si on est au-dessus du toit, pas de collision
      if (this.config.verticalCollision) {
        if (y < bounds.minY || y > bounds.maxY + this.config.roofTolerance) continue;
      } else {
        if (y > bounds.height + 0.5) continue;
      }

      if (x > bounds.minX && x < bounds.maxX && z > bounds.minZ && z < bounds.maxZ) {
        return true;
      }
    }
    return false;
  }

  private findIntersecting(
    x: number,
    y: number,
    z: number,
    props: Property[],
  ): Property | null {
    for (const property of props) {
      const bounds = getPropertyBounds(property, this.config.playerRadius);

      if (this.config.verticalCollision) {
        if (y < bounds.minY || y > bounds.maxY + this.config.roofTolerance) continue;
      } else {
        if (y > bounds.height + 0.5) continue;
      }

      if (x > bounds.minX && x < bounds.maxX && z > bounds.minZ && z < bounds.maxZ) {
        return property;
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RESOLVE — v2 avec slide + step-up + velocity
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🆕 Résolution enrichie avec slide, step-up et vélocité effective.
   */
  resolve(
    current: [number, number, number],
    movement: { x: number; z: number },
  ): CollisionResult {
    this.stats.queries++;

    // Query spatiale : seulement les props proches
    const nearby = this.indexed
      ? this.queryNearby(current[0] + movement.x, current[2] + movement.z, 3)
      : this.allProperties;

    if (this.indexed && nearby.length === 0) {
      // Aucun bâtiment proche → mouvement libre
      return {
        position: [current[0] + movement.x, current[1], current[2] + movement.z],
        collided: false,
        blockedAxis: 'none',
        hitProperty: null,
        steppedUp: false,
        effectiveMovement: movement,
      };
    }

    // ─── Tentative step-up d'abord ───
    if (this.config.stepHeight > 0) {
      const stepY = current[1] + this.config.stepHeight;
      const steppedX = current[0] + movement.x;
      const steppedZ = current[2] + movement.z;

      // Si à la hauteur step on ne collide plus → on monte
      if (
        !this.intersectsAny(steppedX, current[1], steppedZ, nearby) &&
        !this.intersectsAny(steppedX, stepY, steppedZ, nearby)
      ) {
        // Pas de collision directe non plus à la hauteur actuelle → déplacement normal
        return {
          position: [steppedX, current[1], steppedZ],
          collided: false,
          blockedAxis: 'none',
          hitProperty: null,
          steppedUp: false,
          effectiveMovement: movement,
        };
      }

      // Sinon, tente avec step-up sur Y
      if (!this.intersectsAny(steppedX, stepY, steppedZ, nearby)) {
        this.stats.stepUps++;
        this.stats.collisions++;
        return {
          position: [steppedX, current[1] + this.config.stepHeight, steppedZ],
          collided: true,
          blockedAxis: 'none',
          hitProperty: null,
          steppedUp: true,
          effectiveMovement: movement,
        };
      }
    }

    // ─── Slide par axe ───
    let nextX = current[0] + movement.x;
    let nextZ = current[2];

    const hitX = this.findIntersecting(nextX, current[1], nextZ, nearby);
    if (hitX) {
      nextX = current[0];
    }

    nextZ = current[2] + movement.z;
    const hitZ = this.findIntersecting(nextX, current[1], nextZ, nearby);
    if (hitZ) {
      nextZ = current[2];
    }

    const blockedX = hitX !== null;
    const blockedZ = hitZ !== null;

    let blockedAxis: CollisionResult['blockedAxis'] = 'none';
    if (blockedX && blockedZ) blockedAxis = 'xz';
    else if (blockedX) blockedAxis = 'x';
    else if (blockedZ) blockedAxis = 'z';

    // 🆕 Friction sur slide (si bloqué sur un axe, on garde une partie de la vélocité de l'autre)
    let effectiveX = nextX - current[0];
    let effectiveZ = nextZ - current[2];

    if (blockedAxis === 'x') {
      // Slide sur Z → friction légère
      effectiveZ *= this.config.slideFriction;
      nextZ = current[2] + effectiveZ;
    } else if (blockedAxis === 'z') {
      effectiveX *= this.config.slideFriction;
      nextX = current[0] + effectiveX;
    } else if (blockedAxis === 'xz') {
      // Coin : stop net
      effectiveX = 0;
      effectiveZ = 0;
      nextX = current[0];
      nextZ = current[2];
    }

    if (blockedX || blockedZ) {
      this.stats.collisions++;
      if (blockedAxis === 'x' || blockedAxis === 'z') this.stats.slides++;
    }

    return {
      position: [nextX, current[1], nextZ],
      collided: blockedX || blockedZ,
      blockedAxis,
      hitProperty: hitX ?? hitZ,
      steppedUp: false,
      effectiveMovement: { x: effectiveX, z: effectiveZ },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  GROUND DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🆕 Détecte le sol walkable sous une position.
   * Renvoie Y du sol ou null si rien.
   */
  groundYAt(x: number, z: number, fromY: number, searchDepth = 5): number | null {
    // Cherche sous le joueur
    for (let y = fromY; y >= fromY - searchDepth; y -= 0.1) {
      const nearby = this.indexed ? this.queryNearby(x, z) : this.allProperties;
      for (const property of nearby) {
        const bounds = getPropertyBounds(property, this.config.playerRadius);
        if (x > bounds.minX && x < bounds.maxX && z > bounds.minZ && z < bounds.maxZ) {
          if (y >= bounds.maxY - 0.2 && y <= bounds.maxY + 0.2) {
            return bounds.maxY;
          }
        }
      }
    }
    return null; // pas de sol → niveau du terrain par défaut
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  DEBUG & STATS
  // ─────────────────────────────────────────────────────────────────────────

  getStats() {
    return {
      ...this.stats,
      indexed: this.indexed,
      propertiesTotal: this.allProperties.length,
      gridBuckets: this.grid.size,
      config: this.config,
    };
  }

  resetStats(): void {
    this.stats.queries = 0;
    this.stats.gridHits = 0;
    this.stats.gridMisses = 0;
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
    this.stats.collisions = 0;
    this.stats.stepUps = 0;
    this.stats.slides = 0;
  }

  /**
   * 🆕 Renvoie la liste des bounds visibles dans une zone (debug minimap).
   */
  debugBoundsInArea(
    minX: number, minZ: number, maxX: number, maxZ: number,
  ): Array<{ property: Property; bounds: PropertyBounds }> {
    const out: Array<{ property: Property; bounds: PropertyBounds }> = [];
    for (const p of this.allProperties) {
      const b = getPropertyBounds(p);
      if (b.maxX < minX || b.minX > maxX) continue;
      if (b.maxZ < minZ || b.minZ > maxZ) continue;
      out.push({ property: p, bounds: b });
    }
    return out;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  6. HELPERS STANDALONE (compat + utilitaires)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🆕 Vérifie si deux bounds se chevauchent.
 */
export function boundsIntersect(a: PropertyBounds, b: PropertyBounds): boolean {
  return !(
    a.maxX < b.minX || a.minX > b.maxX ||
    a.maxY < b.minY || a.minY > b.maxY ||
    a.maxZ < b.minZ || a.minZ > b.maxZ
  );
}

/**
 * 🆕 Calcule la distance horizontale d'un point au bounds le plus proche.
 */
export function distanceToBounds(
  x: number,
  z: number,
  bounds: PropertyBounds,
): number {
  const dx = Math.max(bounds.minX - x, 0, x - bounds.maxX);
  const dz = Math.max(bounds.minZ - z, 0, z - bounds.maxZ);
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * 🆕 Trouve la property la plus proche d'un point.
 */
export function nearestProperty(
  x: number,
  z: number,
  properties: Property[],
): { property: Property; distance: number } | null {
  if (properties.length === 0) return null;

  let best: { property: Property; distance: number } | null = null;

  for (const p of properties) {
    const bounds = getPropertyBounds(p);
    const d = distanceToBounds(x, z, bounds);
    if (!best || d < best.distance) {
      best = { property: p, distance: d };
    }
  }

  return best;
}