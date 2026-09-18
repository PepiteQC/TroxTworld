/**
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
