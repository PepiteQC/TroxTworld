/**
<<<<<<< HEAD
 * Hachage spatial — grille de cellules pour requêtes rayon O(1) amorti.
 * Évite le O(n²) quand on cherche les voisins de chaque joueur.
 */

export interface SpatialEntry {
  id: string;
  x: number;
  z: number;
  kind: "player" | "entity";
}

export class SpatialHash {
  private cells = new Map<number, SpatialEntry[]>();
  private entryCell = new Map<string, number>();

  constructor(private cellSize: number) {}

  private key(x: number, z: number): number {
    const cx = Math.floor(x / this.cellSize) & 0xffff;
    const cz = Math.floor(z / this.cellSize) & 0xffff;
    return (cx << 16) | cz;
  }

  update(id: string, x: number, z: number, kind: SpatialEntry["kind"]): void {
    const newKey = this.key(x, z);
    const oldKey = this.entryCell.get(id);
    if (oldKey === newKey) {
      const bucket = this.cells.get(newKey);
      if (bucket) {
        const entry = bucket.find((e) => e.id === id);
        if (entry) {
          entry.x = x;
          entry.z = z;
          return;
        }
      }
    }
    if (oldKey !== undefined) this.removeFromCell(oldKey, id);
    let bucket = this.cells.get(newKey);
    if (!bucket) {
      bucket = [];
      this.cells.set(newKey, bucket);
    }
    bucket.push({ id, x, z, kind });
    this.entryCell.set(id, newKey);
  }

  remove(id: string): void {
    const key = this.entryCell.get(id);
    if (key === undefined) return;
    this.removeFromCell(key, id);
    this.entryCell.delete(id);
  }

  private removeFromCell(key: number, id: string): void {
    const bucket = this.cells.get(key);
    if (!bucket) return;
    const i = bucket.findIndex((e) => e.id === id);
    if (i !== -1) bucket.splice(i, 1);
    if (bucket.length === 0) this.cells.delete(key);
  }

  query(x: number, z: number, radius: number, out: SpatialEntry[]): SpatialEntry[] {
    out.length = 0;
    const cells = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const r2 = radius * radius;
    for (let dx = -cells; dx <= cells; dx++) {
      for (let dz = -cells; dz <= cells; dz++) {
        const key = (((cx + dx) & 0xffff) << 16) | ((cz + dz) & 0xffff);
        const bucket = this.cells.get(key);
        if (!bucket) continue;
        for (const entry of bucket) {
          const ex = entry.x - x;
          const ez = entry.z - z;
          if (ex * ex + ez * ez <= r2) out.push(entry);
        }
      }
    }
    return out;
  }

  get size(): number {
    return this.entryCell.size;
  }

  get cellCount(): number {
    return this.cells.size;
  }

  clear(): void {
    this.cells.clear();
    this.entryCell.clear();
  }
}
=======
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈME DE HACHAGE SPATIAL AVANCÉ (v2.5)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Grille de cellules pour requêtes spatiales O(1) amorti.
 * Évite le O(n²) lors de la recherche des voisins de chaque entité.
 * 
 * FEATURES v2.5 :
 *  - Support 2D et 3D complètement unifié (Traversée de grille X,Y,Z).
 *  - Distances euclidiennes exactes en 3D.
 *  - Bounding Box volumétriques (RectBounds avec Y optionnel).
 *  - Callbacks "Zero-allocation" pour des performances extrêmes en boucle de rendu.
 *  - Clés binaires (Bitwise) ultra-rapides.
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════
// TYPES — ENTRIES & CONFIGURATION
// ═══════════════════════════════════════════════════════════

export type SpatialKind = "player" | "npc" | "animal" | "vehicle" | "item" | "prop" | "zone";

export interface SpatialEntry {
  id: string;
  x: number;
  y?: number; // Optionnel pour la 3D
  z: number;
  kind: SpatialKind;
  metadata?: any; // Données custom attachées
}

export interface SpatialQueryOptions {
  kinds?: SpatialKind[]; // Filtrer par types d'entités
  maxResults?: number;   // Limiter le nombre de résultats
  includeSelf?: boolean; // Inclure l'origine de la requête si elle est présente
}

export interface SpatialStats {
  totalEntries: number;
  totalCells: number;
  avgEntriesPerCell: number;
  maxEntriesPerCell: number;
  emptyCells: number;
  queryCount: number;
  avgQueryTime: number;
}

export interface RectBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  minY?: number; // Pour requêtes volumétriques 3D
  maxY?: number;
}

// ═══════════════════════════════════════════════════════════
// SPATIAL HASH GRID (Core Implementation)
// ═══════════════════════════════════════════════════════════

export class SpatialHash {
  private cells = new Map<number, Set<SpatialEntry>>();
  private entryCell = new Map<string, number>();
  private entries = new Map<string, SpatialEntry>();
  
  // Statistiques de performance
  private queryCount = 0;
  private totalQueryTime = 0;
  
  constructor(
    private readonly _cellSize: number,
    private readonly _enable3D: boolean = false
  ) {
    if (_cellSize <= 0) {
      throw new Error("[SpatialHash] cellSize doit être supérieur à zéro.");
    }
  }

  get cellSize(): number { return this._cellSize; }
  get is3D(): boolean { return this._enable3D; }
  
  // ─── GÉNÉRATION DES CLÉS (BITWISE O(1)) ──────────────────
  
  private getCellCoords(x: number, y: number | undefined, z: number) {
    return {
      cx: Math.floor(x / this._cellSize),
      cy: y !== undefined ? Math.floor(y / this._cellSize) : 0,
      cz: Math.floor(z / this._cellSize)
    };
  }

  private getKey(cx: number, cy: number, cz: number): number {
    if (this._enable3D) {
      // 3D : 11 bits (X), 11 bits (Y), 10 bits (Z) = 32 bits
      return ((cx & 0x7ff) << 21) | ((cy & 0x7ff) << 10) | (cz & 0x3ff);
    }
    // 2D : 16 bits (X), 16 bits (Z) = 32 bits
    return ((cx & 0xffff) << 16) | (cz & 0xffff);
  }
  
  // ─── INSERTION & MISE À JOUR ─────────────────────────────
  
  /**
   * Met à jour ou insère une entité. O(1) amorti.
   */
  update(id: string, x: number, z: number, kind: SpatialKind, metadata?: any, y?: number): void {
    const coords = this.getCellCoords(x, y, z);
    const newKey = this.getKey(coords.cx, coords.cy, coords.cz);
    const oldKey = this.entryCell.get(id);
    
    // Mise à jour de l'entité existante dans la même cellule
    if (oldKey === newKey) {
      const entry = this.entries.get(id);
      if (entry) {
        entry.x = x;
        entry.z = z;
        if (y !== undefined) entry.y = y;
        if (metadata !== undefined) entry.metadata = metadata;
        entry.kind = kind;
      }
      return;
    }
    
    // Suppression de l'ancienne cellule si changement
    if (oldKey !== undefined) {
      this.removeFromCell(oldKey, id);
    }
    
    // Ajout dans la nouvelle cellule
    let bucket = this.cells.get(newKey);
    if (!bucket) {
      bucket = new Set();
      this.cells.set(newKey, bucket);
    }
    
    const entry: SpatialEntry = { id, x, z, kind, metadata };
    if (y !== undefined) entry.y = y;
    
    bucket.add(entry);
    this.entries.set(id, entry);
    this.entryCell.set(id, newKey);
  }
  
  /**
   * Mise à jour en lot pour plus d'efficacité.
   */
  updateBatch(entries: Array<{
    id: string;
    x: number;
    z: number;
    kind: SpatialKind;
    metadata?: any;
    y?: number;
  }>): void {
    for (const entry of entries) {
      this.update(entry.id, entry.x, entry.z, entry.kind, entry.metadata, entry.y);
    }
  }
  
  // ─── SUPPRESSION ─────────────────────────────────────────
  
  /**
   * Retire une entité par son ID. O(1) amorti.
   */
  remove(id: string): boolean {
    const key = this.entryCell.get(id);
    if (key === undefined) return false;
    
    this.removeFromCell(key, id);
    this.entryCell.delete(id);
    this.entries.delete(id);
    return true;
  }
  
  /**
   * Suppression en lot.
   */
  removeBatch(ids: string[]): number {
    let removed = 0;
    for (const id of ids) {
      if (this.remove(id)) removed++;
    }
    return removed;
  }
  
  private removeFromCell(key: number, id: string): void {
    const bucket = this.cells.get(key);
    if (!bucket) return;
    
    const entry = this.entries.get(id);
    if (entry) {
      bucket.delete(entry);
    }
    
    if (bucket.size === 0) {
      this.cells.delete(key);
    }
  }
  
  // ─── REQUÊTES (QUERIES) ──────────────────────────────────
  
  /**
   * Requête Radiale standard (Alloue un tableau).
   */
  queryRadius(
    x: number,
    z: number,
    radius: number,
    options: SpatialQueryOptions = {},
    y?: number
  ): SpatialEntry[] {
    const startTime = performance.now();
    const results: SpatialEntry[] = [];
    
    this.queryRadiusCallback(x, z, radius, (entry) => {
      if (options.maxResults && results.length >= options.maxResults) {
        return false; // Stoppe l'itération
      }
      results.push(entry);
      return true; // Continue
    }, options, y);
    
    this.recordQuery(performance.now() - startTime);
    return results;
  }
  
  /**
   * Requête avec Callback (Zéro-allocation de mémoire). Retourne false pour stopper.
   */
  queryRadiusCallback(
    x: number,
    z: number,
    radius: number,
    callback: (entry: SpatialEntry) => boolean,
    options: SpatialQueryOptions = {},
    y?: number
  ): void {
    const c = this.getCellCoords(x, y, z);
    const cellsRadius = Math.ceil(radius / this._cellSize);
    const r2 = radius * radius;
    
    // Limiter la recherche Y si la 3D n'est pas activée
    const minDy = this._enable3D && y !== undefined ? -cellsRadius : 0;
    const maxDy = this._enable3D && y !== undefined ? cellsRadius : 0;

    for (let dx = -cellsRadius; dx <= cellsRadius; dx++) {
      for (let dy = minDy; dy <= maxDy; dy++) {
        for (let dz = -cellsRadius; dz <= cellsRadius; dz++) {
          
          const key = this.getKey(c.cx + dx, c.cy + dy, c.cz + dz);
          const bucket = this.cells.get(key);
          if (!bucket) continue;
          
          for (const entry of bucket) {
            // Filtrer par type
            if (options.kinds && !options.kinds.includes(entry.kind)) {
              continue;
            }
            
            // Ignorer soi-même si demandé
            if (!options.includeSelf && entry.x === x && entry.z === z && entry.id) {
              continue;
            }
            
            // Calcul de distance exacte (Sphère 2D ou 3D)
            const ex = entry.x - x;
            const ez = entry.z - z;
            let dist2 = ex * ex + ez * ez;
            
            if (this._enable3D && entry.y !== undefined && y !== undefined) {
              const ey = entry.y - y;
              dist2 += ey * ey;
            }

            if (dist2 <= r2) {
              const continueIter = callback(entry);
              if (!continueIter) return;
            }
          }
        }
      }
    }
  }
  
  /**
   * Requête Rectangulaire (Bounding Box 2D/3D).
   */
  queryRect(
    bounds: RectBounds,
    options: SpatialQueryOptions = {}
  ): SpatialEntry[] {
    const startTime = performance.now();
    const results: SpatialEntry[] = [];
    
    const minC = this.getCellCoords(bounds.minX, bounds.minY, bounds.minZ);
    const maxC = this.getCellCoords(bounds.maxX, bounds.maxY, bounds.maxZ);
    
    const minCY = this._enable3D && bounds.minY !== undefined ? minC.cy : 0;
    const maxCY = this._enable3D && bounds.maxY !== undefined ? maxC.cy : 0;

    for (let cx = minC.cx; cx <= maxC.cx; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        for (let cz = minC.cz; cz <= maxC.cz; cz++) {
          
          const key = this.getKey(cx, cy, cz);
          const bucket = this.cells.get(key);
          if (!bucket) continue;
          
          for (const entry of bucket) {
            if (options.kinds && !options.kinds.includes(entry.kind)) continue;
            
            const inX = entry.x >= bounds.minX && entry.x <= bounds.maxX;
            const inZ = entry.z >= bounds.minZ && entry.z <= bounds.maxZ;
            const inY = !this._enable3D || bounds.minY === undefined || entry.y === undefined || 
                        (entry.y >= bounds.minY && entry.y <= (bounds.maxY ?? Infinity));

            if (inX && inZ && inY) {
              results.push(entry);
              if (options.maxResults && results.length >= options.maxResults) {
                this.recordQuery(performance.now() - startTime);
                return results;
              }
            }
          }
        }
      }
    }
    
    this.recordQuery(performance.now() - startTime);
    return results;
  }
  
  /**
   * Trouve l'entité la plus proche.
   */
  queryNearest(
    x: number,
    z: number,
    maxRadius: number = Infinity,
    options: SpatialQueryOptions = {},
    y?: number
  ): SpatialEntry | null {
    const startTime = performance.now();
    let nearest: SpatialEntry | null = null;
    let nearestDist2 = maxRadius * maxRadius;
    
    this.queryRadiusCallback(x, z, maxRadius, (entry) => {
      const dx = entry.x - x;
      const dz = entry.z - z;
      let dist2 = dx * dx + dz * dz;
      
      if (this._enable3D && entry.y !== undefined && y !== undefined) {
        const dy = entry.y - y;
        dist2 += dy * dy;
      }
      
      if (dist2 < nearestDist2) {
        nearestDist2 = dist2;
        nearest = entry;
      }
      return true;
    }, options, y);
    
    this.recordQuery(performance.now() - startTime);
    return nearest;
  }
  
  /**
   * Retourne tout le contenu du Hash (Debug ou parcours global).
   */
  queryAll(options: SpatialQueryOptions = {}): SpatialEntry[] {
    const results: SpatialEntry[] = [];
    for (const entry of this.entries.values()) {
      if (options.kinds && !options.kinds.includes(entry.kind)) continue;
      results.push(entry);
      if (options.maxResults && results.length >= options.maxResults) break;
    }
    return results;
  }
  
  // ─── UTILITIES ────────────────────────────────────────────
  
  getEntry(id: string): SpatialEntry | undefined { return this.entries.get(id); }
  has(id: string): boolean { return this.entries.has(id); }
  
  countByKind(): Record<SpatialKind, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.entries.values()) {
      counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
    }
    return counts as Record<SpatialKind, number>;
  }
  
  // ─── STATISTIQUES & DEBUG ─────────────────────────────────
  
  get size(): number { return this.entries.size; }
  get cellCount(): number { return this.cells.size; }
  
  getStats(): SpatialStats {
    let maxEntries = 0;
    let emptyCells = 0;
    
    for (const bucket of this.cells.values()) {
      maxEntries = Math.max(maxEntries, bucket.size);
      if (bucket.size === 0) emptyCells++;
    }
    
    return {
      totalEntries: this.entries.size,
      totalCells: this.cells.size,
      avgEntriesPerCell: this.cells.size > 0 ? this.entries.size / this.cells.size : 0,
      maxEntriesPerCell: maxEntries,
      emptyCells,
      queryCount: this.queryCount,
      avgQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
    };
  }
  
  private recordQuery(timeMs: number): void {
    this.queryCount++;
    this.totalQueryTime += timeMs;
  }
  
  /**
   * Purge complète du système.
   */
  clear(): void {
    this.cells.clear();
    this.entryCell.clear();
    this.entries.clear();
    this.queryCount = 0;
    this.totalQueryTime = 0;
  }
  
  /**
   * Retire toutes les entités en dehors d'une zone donnée.
   */
  cull(bounds: RectBounds): number {
    const toRemove: string[] = [];
    for (const entry of this.entries.values()) {
      if (entry.x < bounds.minX || entry.x > bounds.maxX || entry.z < bounds.minZ || entry.z > bounds.maxZ) {
        toRemove.push(entry.id);
      }
    }
    return this.removeBatch(toRemove);
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS PUBLICS
// ═══════════════════════════════════════════════════════════

/**
 * Instancie un Hash Spatial avec une taille de cellule optimale pour les performances.
 */
export function createOptimalSpatialHash(
  worldSize: number,
  expectedEntities: number,
  avgQueryRadius: number
): SpatialHash {
  // Heuristique: La cellule doit faire environ ~2x la taille du rayon de requête moyen
  const cellSize = Math.max(avgQueryRadius * 2, worldSize / 100);
  return new SpatialHash(cellSize);
}

/**
 * Fusionne deux grilles spatiales en une seule.
 */
export function mergeSpatialHashes(a: SpatialHash, b: SpatialHash): SpatialHash {
  const merged = new SpatialHash(a.cellSize, a.is3D);
  
  for (const entry of a.queryAll()) {
    merged.update(entry.id, entry.x, entry.z, entry.kind, entry.metadata, entry.y);
  }
  for (const entry of b.queryAll()) {
    merged.update(entry.id, entry.x, entry.z, entry.kind, entry.metadata, entry.y);
  }
  
  return merged;
}
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
