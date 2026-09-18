// ═══════════════════════════════════════════════════════════════════════════
//  NAVIGATION SYSTEM — PATHFINDING ET DÉPLACEMENT DES PNJ
//  src/world/NavigationSystem.ts
//
//  Trois couches, comme dans tout moteur open-world :
//
//    1. NAVGRAPH     — graphe de navigation construit depuis le monde
//                      (trottoirs, sentiers, intérieurs). Grille hiérarchique
//                      pour éviter de stocker 3200×1300 cases.
//    2. A*           — recherche de chemin avec heuristique octile, cache LRU
//                      des chemins fréquents, et lissage par corde tendue.
//    3. STEERING     — le PNJ ne téléporte pas de nœud en nœud : il suit le
//                      chemin avec des comportements (seek, arrive, séparation,
//                      évitement d'obstacles) qui donnent un mouvement crédible.
//
//  Budget : le pathfinding est étalé sur les frames. Jamais plus de N requêtes
//  résolues par frame, le reste attend dans une file par priorité.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────
//  NAVGRAPH — représentation du terrain navigable
// ─────────────────────────────────────────────────────────────────────────

export type SurfaceType = 'sidewalk' | 'road' | 'grass' | 'forest' | 'water' | 'interior' | 'blocked';

/** Coût de traversée par surface. Un PNJ préfère le trottoir à la forêt. */
const SURFACE_COST: Record<SurfaceType, number> = {
  sidewalk: 1.0,
  interior: 1.0,
  road: 1.8,      // traverser la rue est possible mais moins naturel
  grass: 1.4,
  forest: 2.6,
  water: Infinity,
  blocked: Infinity,
};

export interface NavCell {
  x: number;            // coordonnées de grille
  z: number;
  worldX: number;       // centre en unités monde
  worldZ: number;
  worldY: number;       // hauteur du terrain
  surface: SurfaceType;
  cost: number;
  /** Zones connectées — permet de rejeter un chemin impossible en O(1). */
  island: number;
}

export interface NavGraphConfig {
  cellSize: number;         // taille d'une cellule en unités monde
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  maxSlope: number;         // pente max franchissable (en unités de hauteur/cellule)
}

export class NavGraph {
  private cells = new Map<string, NavCell>();
  private config: NavGraphConfig;
  private heightFn: (x: number, z: number) => number;
  private islandCount = 0;

  constructor(
    config: NavGraphConfig,
    heightFn: (x: number, z: number) => number = () => 0
  ) {
    this.config = config;
    this.heightFn = heightFn;
  }

  private key(gx: number, gz: number): string {
    return `${gx},${gz}`;
  }

  worldToGrid(x: number, z: number): { gx: number; gz: number } {
    return {
      gx: Math.floor(x / this.config.cellSize),
      gz: Math.floor(z / this.config.cellSize),
    };
  }

  gridToWorld(gx: number, gz: number): { x: number; z: number } {
    const s = this.config.cellSize;
    return { x: gx * s + s / 2, z: gz * s + s / 2 };
  }

  /**
   * Marque une zone comme navigable avec un type de surface donné.
   * Appelé par le monde après construction (trottoirs, routes, intérieurs).
   */
  paintArea(
    minX: number, minZ: number, maxX: number, maxZ: number,
    surface: SurfaceType
  ): void {
    const s = this.config.cellSize;
    const gx0 = Math.floor(minX / s), gx1 = Math.floor(maxX / s);
    const gz0 = Math.floor(minZ / s), gz1 = Math.floor(maxZ / s);

    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        this.setCell(gx, gz, surface);
      }
    }
  }

  /**
   * Peint un couloir le long d'une polyligne — pour les routes et sentiers.
   */
  paintCorridor(
    points: Array<[number, number]>, width: number, surface: SurfaceType
  ): void {
    const s = this.config.cellSize;
    const half = width / 2;
    const steps = Math.ceil(this.polylineLength(points) / (s * 0.5));

    for (let i = 0; i <= steps; i++) {
      const p = this.samplePolyline(points, (i / steps) * this.polylineLength(points));
      if (!p) continue;
      const cells = Math.ceil(half / s);
      for (let dx = -cells; dx <= cells; dx++) {
        for (let dz = -cells; dz <= cells; dz++) {
          const wx = p.x + dx * s, wz = p.z + dz * s;
          if (Math.hypot(wx - p.x, wz - p.z) > half) continue;
          const { gx, gz } = this.worldToGrid(wx, wz);
          this.setCell(gx, gz, surface);
        }
      }
    }
  }

  /**
   * Bloque une zone (bâtiment, obstacle statique).
   */
  blockArea(minX: number, minZ: number, maxX: number, maxZ: number): void {
    this.paintArea(minX, minZ, maxX, maxZ, 'blocked');
  }

  /**
   * Bloque l'empreinte d'un objet 3D — calculée depuis sa bounding box.
   */
  blockObject(obj: THREE.Object3D, margin = 0.5): void {
    const box = new THREE.Box3().setFromObject(obj);
    this.blockArea(
      box.min.x - margin, box.min.z - margin,
      box.max.x + margin, box.max.z + margin
    );
  }

  private setCell(gx: number, gz: number, surface: SurfaceType): void {
    const { minX, maxX, minZ, maxZ } = this.config.bounds;
    const w = this.gridToWorld(gx, gz);
    if (w.x < minX || w.x > maxX || w.z < minZ || w.z > maxZ) return;

    const k = this.key(gx, gz);
    const existing = this.cells.get(k);

    // Un blocage écrase tout ; sinon la surface la moins coûteuse gagne
    if (existing && surface !== 'blocked') {
      if (SURFACE_COST[existing.surface] <= SURFACE_COST[surface]) return;
    }

    this.cells.set(k, {
      x: gx, z: gz,
      worldX: w.x, worldZ: w.z,
      worldY: this.heightFn(w.x, w.z),
      surface,
      cost: SURFACE_COST[surface],
      island: -1,
    });
  }

  getCell(gx: number, gz: number): NavCell | undefined {
    return this.cells.get(this.key(gx, gz));
  }

  getCellAt(x: number, z: number): NavCell | undefined {
    const { gx, gz } = this.worldToGrid(x, z);
    return this.getCell(gx, gz);
  }

  isWalkable(gx: number, gz: number): boolean {
    const c = this.cells.get(this.key(gx, gz));
    return !!c && c.cost !== Infinity;
  }

  /**
   * Voisins franchissables — 8 directions, avec test de pente et
   * interdiction de couper les coins entre deux obstacles.
   */
  getNeighbors(cell: NavCell): Array<{ cell: NavCell; cost: number }> {
    const result: Array<{ cell: NavCell; cost: number }> = [];
    const dirs: Array<[number, number, number]> = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
    ];

    for (const [dx, dz, mult] of dirs) {
      const n = this.getCell(cell.x + dx, cell.z + dz);
      if (!n || n.cost === Infinity) continue;

      // Pas de coupe de coin en diagonale si un des deux orthogonaux est bloqué
      if (dx !== 0 && dz !== 0) {
        if (!this.isWalkable(cell.x + dx, cell.z) ||
            !this.isWalkable(cell.x, cell.z + dz)) continue;
      }

      // Pente trop raide
      const slope = Math.abs(n.worldY - cell.worldY);
      if (slope > this.config.maxSlope) continue;

      // Le coût monte avec la pente — un PNJ préfère le plat
      const slopePenalty = 1 + slope * 0.6;
      result.push({ cell: n, cost: mult * n.cost * slopePenalty });
    }

    return result;
  }

  /**
   * Calcule les îlots connectés (flood fill). Permet de rejeter
   * instantanément un chemin vers une zone inaccessible.
   */
  computeIslands(): number {
    for (const c of this.cells.values()) c.island = -1;
    let island = 0;

    for (const start of this.cells.values()) {
      if (start.island !== -1 || start.cost === Infinity) continue;

      const stack: NavCell[] = [start];
      start.island = island;
      while (stack.length) {
        const cur = stack.pop()!;
        for (const { cell } of this.getNeighbors(cur)) {
          if (cell.island === -1) {
            cell.island = island;
            stack.push(cell);
          }
        }
      }
      island++;
    }

    this.islandCount = island;
    console.log(`🧭 [NavGraph] ${this.cells.size} cellules, ${island} îlots connectés`);
    return island;
  }

  /**
   * Cellule navigable la plus proche d'une position quelconque.
   * Indispensable : un PNJ peut spawner à moitié dans un mur.
   */
  findNearestWalkable(x: number, z: number, maxRadius = 12): NavCell | null {
    const direct = this.getCellAt(x, z);
    if (direct && direct.cost !== Infinity) return direct;

    const { gx, gz } = this.worldToGrid(x, z);
    const maxCells = Math.ceil(maxRadius / this.config.cellSize);

    for (let r = 1; r <= maxCells; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          // Seulement l'anneau extérieur
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const c = this.getCell(gx + dx, gz + dz);
          if (c && c.cost !== Infinity) return c;
        }
      }
    }
    return null;
  }

  /**
   * Ligne de vue libre entre deux points — utilisé pour lisser les chemins.
   * Algorithme de Bresenham sur la grille.
   */
  hasLineOfSight(from: NavCell, to: NavCell): boolean {
    let x0 = from.x, z0 = from.z;
    const x1 = to.x, z1 = to.z;
    const dx = Math.abs(x1 - x0), dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;

    while (true) {
      if (!this.isWalkable(x0, z0)) return false;
      if (x0 === x1 && z0 === z1) return true;
      const e2 = 2 * err;
      if (e2 > -dz) { err -= dz; x0 += sx; }
      if (e2 < dx) { err += dx; z0 += sz; }
    }
  }

  private polylineLength(points: Array<[number, number]>): number {
    let t = 0;
    for (let i = 1; i < points.length; i++) {
      t += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    }
    return t;
  }

  private samplePolyline(
    points: Array<[number, number]>, distance: number
  ): { x: number; z: number } | null {
    let accum = 0;
    for (let i = 1; i < points.length; i++) {
      const len = Math.hypot(
        points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]
      );
      if (accum + len >= distance) {
        const t = (distance - accum) / len;
        return {
          x: points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
          z: points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t,
        };
      }
      accum += len;
    }
    return points.length ? { x: points[points.length - 1][0], z: points[points.length - 1][1] } : null;
  }

  getStats() {
    const bySurface: Record<string, number> = {};
    for (const c of this.cells.values()) {
      bySurface[c.surface] = (bySurface[c.surface] ?? 0) + 1;
    }
    return {
      cells: this.cells.size,
      islands: this.islandCount,
      bySurface,
      cellSize: this.config.cellSize,
      memoryEstimateKB: Math.round(this.cells.size * 0.08),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  A* — RECHERCHE DE CHEMIN
// ─────────────────────────────────────────────────────────────────────────

interface AStarNode {
  cell: NavCell;
  g: number;          // coût depuis le départ
  f: number;          // g + heuristique
  parent: AStarNode | null;
}

/**
 * File de priorité binaire — bien plus rapide qu'un tri à chaque insertion.
 */
class BinaryHeap {
  private items: AStarNode[] = [];

  push(node: AStarNode): void {
    this.items.push(node);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.items[p].f <= this.items[i].f) break;
      [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
      i = p;
    }
  }

  pop(): AStarNode | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let smallest = i;
        if (l < this.items.length && this.items[l].f < this.items[smallest].f) smallest = l;
        if (r < this.items.length && this.items[r].f < this.items[smallest].f) smallest = r;
        if (smallest === i) break;
        [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
        i = smallest;
      }
    }
    return top;
  }

  get size(): number { return this.items.length; }
}

export interface PathResult {
  found: boolean;
  waypoints: THREE.Vector3[];
  cost: number;
  nodesExplored: number;
  computeMs: number;
}

export class Pathfinder {
  private cache = new Map<string, PathResult>();
  private cacheOrder: string[] = [];
  private maxCache = 200;

  constructor(private graph: NavGraph) {}

  /**
   * Heuristique octile — exacte pour une grille 8-directions, donc A*
   * explore le minimum de nœuds.
   */
  private heuristic(a: NavCell, b: NavCell): number {
    const dx = Math.abs(a.x - b.x), dz = Math.abs(a.z - b.z);
    return (dx + dz) + (1.414 - 2) * Math.min(dx, dz);
  }

  /**
   * Recherche de chemin. maxNodes borne le coût : au-delà, on abandonne
   * plutôt que de geler la frame.
   */
  findPath(
    from: THREE.Vector3, to: THREE.Vector3,
    opts: { maxNodes?: number; smooth?: boolean; useCache?: boolean } = {}
  ): PathResult {
    const t0 = performance.now();
    const maxNodes = opts.maxNodes ?? 3000;
    const smooth = opts.smooth ?? true;

    const startCell = this.graph.findNearestWalkable(from.x, from.z);
    const goalCell = this.graph.findNearestWalkable(to.x, to.z);

    const empty: PathResult = {
      found: false, waypoints: [], cost: 0,
      nodesExplored: 0, computeMs: performance.now() - t0,
    };

    if (!startCell || !goalCell) return empty;

    // Rejet instantané si les deux points sont sur des îlots différents
    if (startCell.island !== -1 && goalCell.island !== -1
        && startCell.island !== goalCell.island) {
      return empty;
    }

    // Cache
    const cacheKey = `${startCell.x},${startCell.z}>${goalCell.x},${goalCell.z}`;
    if (opts.useCache !== false && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // A*
    const open = new BinaryHeap();
    const gScore = new Map<string, number>();
    const closed = new Set<string>();
    const startKey = `${startCell.x},${startCell.z}`;

    open.push({ cell: startCell, g: 0, f: this.heuristic(startCell, goalCell), parent: null });
    gScore.set(startKey, 0);

    let explored = 0;
    let goalNode: AStarNode | null = null;

    while (open.size > 0 && explored < maxNodes) {
      const current = open.pop()!;
      const curKey = `${current.cell.x},${current.cell.z}`;

      if (closed.has(curKey)) continue;
      closed.add(curKey);
      explored++;

      if (current.cell.x === goalCell.x && current.cell.z === goalCell.z) {
        goalNode = current;
        break;
      }

      for (const { cell, cost } of this.graph.getNeighbors(current.cell)) {
        const nKey = `${cell.x},${cell.z}`;
        if (closed.has(nKey)) continue;

        const tentativeG = current.g + cost;
        const known = gScore.get(nKey);
        if (known !== undefined && tentativeG >= known) continue;

        gScore.set(nKey, tentativeG);
        open.push({
          cell, g: tentativeG,
          f: tentativeG + this.heuristic(cell, goalCell),
          parent: current,
        });
      }
    }

    if (!goalNode) {
      const result = { ...empty, nodesExplored: explored, computeMs: performance.now() - t0 };
      return result;
    }

    // Reconstruction
    const cells: NavCell[] = [];
    let node: AStarNode | null = goalNode;
    while (node) { cells.unshift(node.cell); node = node.parent; }

    const finalCells = smooth ? this.smoothPath(cells) : cells;
    const waypoints = finalCells.map(
      (c) => new THREE.Vector3(c.worldX, c.worldY, c.worldZ)
    );
    // Le dernier waypoint vise la destination exacte, pas le centre de cellule
    if (waypoints.length > 0) {
      waypoints[waypoints.length - 1] = to.clone();
    }

    const result: PathResult = {
      found: true,
      waypoints,
      cost: goalNode.g,
      nodesExplored: explored,
      computeMs: performance.now() - t0,
    };

    this.putCache(cacheKey, result);
    return result;
  }

  /**
   * Lissage par corde tendue : supprime les waypoints intermédiaires
   * quand la ligne de vue est dégagée. Un PNJ marche droit au lieu
   * de suivre l'escalier de la grille.
   */
  private smoothPath(cells: NavCell[]): NavCell[] {
    if (cells.length <= 2) return cells;

    const result: NavCell[] = [cells[0]];
    let anchor = 0;

    for (let i = 2; i < cells.length; i++) {
      if (!this.graph.hasLineOfSight(cells[anchor], cells[i])) {
        result.push(cells[i - 1]);
        anchor = i - 1;
      }
    }
    result.push(cells[cells.length - 1]);
    return result;
  }

  private putCache(key: string, result: PathResult): void {
    this.cache.set(key, result);
    this.cacheOrder.push(key);
    while (this.cacheOrder.length > this.maxCache) {
      const old = this.cacheOrder.shift()!;
      this.cache.delete(old);
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheOrder = [];
  }

  getCacheStats() {
    return { size: this.cache.size, max: this.maxCache };
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  FILE DE REQUÊTES — étale le pathfinding sur les frames
// ─────────────────────────────────────────────────────────────────────────

interface PathRequest {
  id: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
  priority: number;
  callback: (result: PathResult) => void;
}

export class PathRequestQueue {
  private queue: PathRequest[] = [];
  private budgetMs: number;

  constructor(private pathfinder: Pathfinder, budgetMs = 2) {
    this.budgetMs = budgetMs;
  }

  request(
    id: string, from: THREE.Vector3, to: THREE.Vector3,
    callback: (r: PathResult) => void, priority = 1
  ): void {
    // Une seule requête en attente par entité
    const existing = this.queue.findIndex((r) => r.id === id);
    if (existing !== -1) this.queue.splice(existing, 1);

    this.queue.push({ id, from: from.clone(), to: to.clone(), priority, callback });
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  cancel(id: string): void {
    const i = this.queue.findIndex((r) => r.id === id);
    if (i !== -1) this.queue.splice(i, 1);
  }

  /**
   * Traite les requêtes dans la limite du budget de frame.
   */
  update(): number {
    const t0 = performance.now();
    let processed = 0;

    while (this.queue.length > 0) {
      if (performance.now() - t0 > this.budgetMs) break;
      const req = this.queue.shift()!;
      const result = this.pathfinder.findPath(req.from, req.to);
      req.callback(result);
      processed++;
    }

    return processed;
  }

  get pending(): number { return this.queue.length; }
}

// ─────────────────────────────────────────────────────────────────────────
//  STEERING — déplacement crédible le long du chemin
// ─────────────────────────────────────────────────────────────────────────

export interface AgentConfig {
  maxSpeed: number;
  maxForce: number;
  radius: number;
  arriveRadius: number;      // ralentit à l'approche
  waypointRadius: number;    // distance pour valider un waypoint
  separationRadius: number;  // évitement des autres agents
}

export const AGENT_PRESETS: Record<string, AgentConfig> = {
  pieton: {
    maxSpeed: 1.4, maxForce: 6, radius: 0.35,
    arriveRadius: 2, waypointRadius: 0.9, separationRadius: 1.6,
  },
  pieton_presse: {
    maxSpeed: 2.2, maxForce: 9, radius: 0.35,
    arriveRadius: 2.5, waypointRadius: 1.0, separationRadius: 1.4,
  },
  animal: {
    maxSpeed: 3.5, maxForce: 12, radius: 0.7,
    arriveRadius: 3, waypointRadius: 1.5, separationRadius: 3.0,
  },
  policier: {
    maxSpeed: 2.6, maxForce: 11, radius: 0.4,
    arriveRadius: 2, waypointRadius: 1.0, separationRadius: 1.5,
  },
};

export class NavAgent {
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  private path: THREE.Vector3[] = [];
  private waypointIndex = 0;
  private config: AgentConfig;

  /** Direction du regard, lissée — évite les rotations brusques. */
  heading = 0;
  arrived = true;

  constructor(
    public id: string,
    startPos: THREE.Vector3,
    config: AgentConfig = AGENT_PRESETS.pieton
  ) {
    this.position.copy(startPos);
    this.config = config;
  }

  setPath(waypoints: THREE.Vector3[]): void {
    this.path = waypoints;
    this.waypointIndex = 0;
    this.arrived = waypoints.length === 0;
  }

  clearPath(): void {
    this.path = [];
    this.waypointIndex = 0;
    this.arrived = true;
    this.velocity.set(0, 0, 0);
  }

  get hasPath(): boolean {
    return this.path.length > 0 && this.waypointIndex < this.path.length;
  }

  get currentWaypoint(): THREE.Vector3 | null {
    return this.path[this.waypointIndex] ?? null;
  }

  get remainingDistance(): number {
    if (!this.hasPath) return 0;
    let d = this.position.distanceTo(this.path[this.waypointIndex]);
    for (let i = this.waypointIndex; i < this.path.length - 1; i++) {
      d += this.path[i].distanceTo(this.path[i + 1]);
    }
    return d;
  }

  /**
   * Mise à jour du mouvement. neighbors sert à la séparation (anti-collision
   * entre PNJ) — sans ça, une foule se superpose et c'est immédiatement faux.
   */
  update(
    delta: number,
    neighbors: NavAgent[] = [],
    heightFn?: (x: number, z: number) => number
  ): void {
    if (!this.hasPath) {
      // Freinage progressif
      this.velocity.multiplyScalar(Math.max(0, 1 - delta * 6));
      this.position.addScaledVector(this.velocity, delta);
      return;
    }

    const target = this.path[this.waypointIndex];
    const toTarget = new THREE.Vector3().subVectors(target, this.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    // Waypoint atteint
    if (dist < this.config.waypointRadius) {
      this.waypointIndex++;
      if (this.waypointIndex >= this.path.length) {
        this.arrived = true;
        this.clearPath();
        return;
      }
    }

    // ── SEEK + ARRIVE ──
    const isLast = this.waypointIndex === this.path.length - 1;
    let desiredSpeed = this.config.maxSpeed;
    if (isLast && dist < this.config.arriveRadius) {
      desiredSpeed = this.config.maxSpeed * (dist / this.config.arriveRadius);
    }
    const desired = toTarget.normalize().multiplyScalar(desiredSpeed);
    const steering = desired.sub(this.velocity);

    // ── SÉPARATION — évite de traverser les autres PNJ ──
    const separation = new THREE.Vector3();
    let count = 0;
    for (const other of neighbors) {
      if (other === this) continue;
      const d = this.position.distanceTo(other.position);
      if (d > 0 && d < this.config.separationRadius) {
        const away = new THREE.Vector3()
          .subVectors(this.position, other.position)
          .normalize()
          .divideScalar(Math.max(0.2, d)); // plus proche = plus fort
        separation.add(away);
        count++;
      }
    }
    if (count > 0) {
      separation.divideScalar(count)
        .normalize()
        .multiplyScalar(this.config.maxSpeed)
        .sub(this.velocity);
      steering.addScaledVector(separation, 1.6);
    }

    // Limite de force — l'accélération reste crédible
    if (steering.length() > this.config.maxForce) {
      steering.normalize().multiplyScalar(this.config.maxForce);
    }

    this.velocity.addScaledVector(steering, delta);
    this.velocity.y = 0;
    if (this.velocity.length() > this.config.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.config.maxSpeed);
    }

    this.position.addScaledVector(this.velocity, delta);

    // Suit le relief
    if (heightFn) {
      this.position.y = heightFn(this.position.x, this.position.z);
    }

    // Orientation lissée vers la direction du mouvement
    if (this.velocity.lengthSq() > 0.01) {
      const targetHeading = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, delta * 8);
    }
  }

  get speed(): number { return this.velocity.length(); }

  /** État d'animation déduit de la vitesse — pour le rendu. */
  get animationState(): 'idle' | 'walk' | 'run' {
    const s = this.speed;
    if (s < 0.15) return 'idle';
    if (s < this.config.maxSpeed * 0.72) return 'walk';
    return 'run';
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  GRILLE SPATIALE — voisinage rapide pour la séparation
// ─────────────────────────────────────────────────────────────────────────

export class AgentSpatialGrid {
  private cells = new Map<string, NavAgent[]>();

  constructor(private cellSize = 4) {}

  rebuild(agents: NavAgent[]): void {
    this.cells.clear();
    for (const a of agents) {
      const key = this.key(a.position.x, a.position.z);
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key)!.push(a);
    }
  }

  private key(x: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  /**
   * Voisins dans les 9 cellules adjacentes — O(1) au lieu de O(n).
   */
  getNeighbors(agent: NavAgent, radius = 3): NavAgent[] {
    const result: NavAgent[] = [];
    const cells = Math.ceil(radius / this.cellSize);
    const gx = Math.floor(agent.position.x / this.cellSize);
    const gz = Math.floor(agent.position.z / this.cellSize);

    for (let dx = -cells; dx <= cells; dx++) {
      for (let dz = -cells; dz <= cells; dz++) {
        const list = this.cells.get(`${gx + dx},${gz + dz}`);
        if (list) result.push(...list);
      }
    }
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SYSTÈME DE NAVIGATION COMPLET
// ═══════════════════════════════════════════════════════════════════════════

export class NavigationSystem {
  readonly graph: NavGraph;
  readonly pathfinder: Pathfinder;
  readonly queue: PathRequestQueue;
  private spatialGrid = new AgentSpatialGrid(4);
  private agents = new Map<string, NavAgent>();
  private heightFn: (x: number, z: number) => number;

  private stats = {
    agents: 0,
    pathsRequested: 0,
    pathsFound: 0,
    pathsFailed: 0,
    avgComputeMs: 0,
  };

  constructor(
    config: NavGraphConfig,
    heightFn: (x: number, z: number) => number = () => 0
  ) {
    this.heightFn = heightFn;
    this.graph = new NavGraph(config, heightFn);
    this.pathfinder = new Pathfinder(this.graph);
    this.queue = new PathRequestQueue(this.pathfinder, 2);
  }

  addAgent(
    id: string, position: THREE.Vector3, preset: keyof typeof AGENT_PRESETS = 'pieton'
  ): NavAgent {
    const agent = new NavAgent(id, position, AGENT_PRESETS[preset]);
    this.agents.set(id, agent);
    this.stats.agents = this.agents.size;
    return agent;
  }

  removeAgent(id: string): void {
    this.agents.delete(id);
    this.queue.cancel(id);
    this.stats.agents = this.agents.size;
  }

  getAgent(id: string): NavAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Envoie un agent vers une destination. Le chemin est calculé en différé.
   */
  moveTo(agentId: string, destination: THREE.Vector3, priority = 1): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    this.stats.pathsRequested++;
    this.queue.request(agentId, agent.position, destination, (result) => {
      if (result.found) {
        agent.setPath(result.waypoints);
        this.stats.pathsFound++;
      } else {
        agent.clearPath();
        this.stats.pathsFailed++;
      }
      // Moyenne glissante du temps de calcul
      this.stats.avgComputeMs =
        this.stats.avgComputeMs * 0.9 + result.computeMs * 0.1;
    }, priority);
  }

  /**
   * Destination aléatoire navigable dans un rayon — pour l'errance des PNJ.
   */
  randomPointNear(center: THREE.Vector3, radius: number): THREE.Vector3 | null {
    for (let attempt = 0; attempt < 10; attempt++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const x = center.x + Math.cos(a) * r;
      const z = center.z + Math.sin(a) * r;
      const cell = this.graph.getCellAt(x, z);
      if (cell && cell.cost !== Infinity) {
        return new THREE.Vector3(cell.worldX, cell.worldY, cell.worldZ);
      }
    }
    return null;
  }

  /**
   * À appeler chaque frame.
   */
  update(delta: number): void {
    this.queue.update();

    const all = Array.from(this.agents.values());
    this.spatialGrid.rebuild(all);

    for (const agent of all) {
      const neighbors = this.spatialGrid.getNeighbors(agent, 3);
      agent.update(delta, neighbors, this.heightFn);
    }
  }

  getStats() {
    return {
      ...this.stats,
      pendingPaths: this.queue.pending,
      graph: this.graph.getStats(),
      cache: this.pathfinder.getCacheStats(),
    };
  }
}