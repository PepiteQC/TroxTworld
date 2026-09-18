/**
 * 🛣️ SPATIAL — Index spatial pour requêtes routes O(1)
 */
import * as THREE from "three";
import type { RoadCurve } from "./types";

interface CurveEntry {
  curve: RoadCurve;
  catmull: THREE.CatmullRomCurve3;
  /** Points échantillonnés pour lookup rapide */
  samples: { t: number; point: THREE.Vector3 }[];
}

const CURVE_CACHE = new Map<string, THREE.CatmullRomCurve3>();
const SAMPLE_GRID = new Map<string, CurveEntry[]>();
const GRID_SIZE = 200;

/** Enregistre une courbe + génère ses samples */
export function registerCurve(curve: RoadCurve): THREE.CatmullRomCurve3 {
  let catmull = CURVE_CACHE.get(curve.id);
  if (!catmull) {
    catmull = new THREE.CatmullRomCurve3(curve.points, false, "catmullrom", 0.5);
    CURVE_CACHE.set(curve.id, catmull);
  }

  // Générer 60 samples
  const samples = Array.from({ length: 60 }, (_, i) => ({
    t: i / 59,
    point: catmull!.getPointAt(i / 59),
  }));

  const entry: CurveEntry = { curve, catmull, samples };

  // Index par cellule de grille
  for (const s of samples) {
    const gx = Math.floor(s.point.x / GRID_SIZE);
    const gz = Math.floor(s.point.z / GRID_SIZE);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${gx + dx}_${gz + dz}`;
        let bucket = SAMPLE_GRID.get(key);
        if (!bucket) { bucket = []; SAMPLE_GRID.set(key, bucket); }
        if (!bucket.includes(entry)) bucket.push(entry);
      }
    }
  }

  return catmull;
}

export function getCurve(curveId: string): THREE.CatmullRomCurve3 | null {
  return CURVE_CACHE.get(curveId) ?? null;
}

/**
 * 🆕 Requête rapide : route la plus proche
 */
export function findNearestCurveFast(pos: THREE.Vector3): {
  curve: RoadCurve;
  t: number;
  distance: number;
  point: THREE.Vector3;
} | null {
  const gx = Math.floor(pos.x / GRID_SIZE);
  const gz = Math.floor(pos.z / GRID_SIZE);
  const bucket = SAMPLE_GRID.get(`${gx}_${gz}`);
  if (!bucket || bucket.length === 0) return null;

  let best: { curve: RoadCurve; t: number; distance: number; point: THREE.Vector3 } | null = null;

  for (const entry of bucket) {
    for (const s of entry.samples) {
      const d = s.point.distanceTo(pos);
      if (!best || d < best.distance) {
        best = { curve: entry.curve, t: s.t, distance: d, point: s.point };
      }
    }
  }
  return best;
}

export function clearSpatialIndex(): void {
  CURVE_CACHE.clear();
  SAMPLE_GRID.clear();
}