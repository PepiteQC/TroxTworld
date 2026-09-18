/**
 * 🛣️ RIBBON — Génération de géométrie de chaussée
 */
import * as THREE from "three";
import type { RoadCurve } from "./types";
import { getCurve } from "./spatial";
import { getRoadWidth } from "./config";

export function buildRoadGeometry(
  curve: RoadCurve,
  divisions = 64,
  widthOverride?: number,
  yOffset = 0,
): THREE.BufferGeometry {
  const catmull = getCurve(curve.id);
  if (!catmull) throw new Error(`[roads] Curve ${curve.id} not registered`);

  const roadPts = catmull.getPoints(divisions);
  const width = widthOverride ?? getRoadWidth(curve.type);
  const hw = width / 2;

  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  let totalLen = 0;
  const segLens: number[] = [0];
  for (let i = 1; i < roadPts.length; i++) {
    totalLen += roadPts[i].distanceTo(roadPts[i - 1]);
    segLens.push(totalLen);
  }

  for (let i = 0; i < roadPts.length; i++) {
    const pt = roadPts[i];
    const next = i < roadPts.length - 1 ? roadPts[i + 1] : roadPts[i - 1];
    const prev = i > 0 ? roadPts[i - 1] : roadPts[i + 1];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const u = segLens[i] / Math.max(1, totalLen);
    const y = pt.y + yOffset;

    positions.push(
      pt.x - normal.x * hw, y, pt.z - normal.z * hw,
      pt.x + normal.x * hw, y, pt.z + normal.z * hw,
    );
    uvs.push(0, u * (totalLen / width), 1, u * (totalLen / width));
    normals.push(0, 1, 0, 0, 1, 0);

    if (i < roadPts.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

export function sampleLane(
  curveId: string,
  t: number,
  offset: number,
  direction: 1 | -1 = 1,
): { position: THREE.Vector3; tangent: THREE.Vector3 } | null {
  const curve = getCurve(curveId);
  if (!curve) return null;

  const clamped = Math.max(0, Math.min(1, t));
  const position = curve.getPointAt(clamped);
  const tangent = curve.getTangentAt(clamped);

  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  position.addScaledVector(normal, offset);
  position.y += 0.05;

  if (direction < 0) tangent.negate();

  return { position, tangent };
}