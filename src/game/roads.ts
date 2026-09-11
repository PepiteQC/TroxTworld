import * as THREE from "three";
import { matLib } from "./materials";
import { getTerrainHeight, type RoadDef } from "./worlddata";

function ribbonMesh(
  road: RoadDef,
  divisions: number,
  width: number,
  color: number,
  yExtra: number,
  offset: number,
): THREE.Mesh {
  const pts = road.points.map(
    ([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z) + yExtra, z),
  );
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const samples = curve.getPoints(divisions);
  const hw = width / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let total = 0;
  const segs = [0];
  for (let i = 1; i < samples.length; i++) {
    total += samples[i].distanceTo(samples[i - 1]);
    segs.push(total);
  }
  for (let i = 0; i < samples.length; i++) {
    const pt = samples[i];
    const next = i < samples.length - 1 ? samples[i + 1] : samples[i - 1];
    const prev = i > 0 ? samples[i - 1] : samples[i + 1];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const ox = n.x * offset;
    const oz = n.z * offset;
    const u = total > 0 ? segs[i] / total : 0;
    positions.push(
      pt.x + ox - n.x * hw,
      pt.y,
      pt.z + oz - n.z * hw,
      pt.x + ox + n.x * hw,
      pt.y,
      pt.z + oz + n.z * hw,
    );
    const v = u * (total / Math.max(1, width));
    uvs.push(0, v, 1, v);
    if (i < samples.length - 1) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, matLib.get(color, 0.96));
  mesh.receiveShadow = true;
  return mesh;
}

export function buildRoadRibbon(road: RoadDef, divisions = 80): THREE.Object3D {
  if (road.kind === "highway") {
    const g = new THREE.Group();
    g.name = road.id;
    const laneW = 7.6;
    const off = 5.1;
    g.add(ribbonMesh(road, divisions, laneW, 0x2e2e34, 0.05, off));
    g.add(ribbonMesh(road, divisions, laneW, 0x2e2e34, 0.05, -off));
    const median = ribbonMesh(road, Math.max(24, Math.floor(divisions / 2)), 2.6, 0x3d4a32, 0.02, 0);
    g.add(median);
    return g;
  }
  const color =
    road.kind === "gravel" ? 0x6a6458 : road.kind === "ramp" ? 0x3c3c42 : 0x35353a;
  const mesh = ribbonMesh(road, divisions, road.width, color, 0.04, 0);
  mesh.name = road.id;
  return mesh;
}

function dashedLine(
  road: RoadDef,
  divisions: number,
  offset: number,
  color: number,
  dash: number,
  gap: number,
): THREE.Line {
  const pts = road.points.map(([x, z]) => {
    return new THREE.Vector3(x, getTerrainHeight(x, z) + 0.07, z);
  });
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const samples = curve.getPoints(divisions);
  const shifted: THREE.Vector3[] = [];
  for (let i = 0; i < samples.length; i++) {
    const pt = samples[i];
    const next = i < samples.length - 1 ? samples[i + 1] : samples[i - 1];
    const prev = i > 0 ? samples[i - 1] : samples[i + 1];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    shifted.push(new THREE.Vector3(pt.x + n.x * offset, pt.y, pt.z + n.z * offset));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(shifted);
  const mat = new THREE.LineDashedMaterial({
    color,
    dashSize: dash,
    gapSize: gap,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

export function buildCenterLine(road: RoadDef, divisions = 50): THREE.Object3D | null {
  if (road.kind === "gravel" || road.kind === "ramp") return null;
  if (road.kind === "highway") {
    const g = new THREE.Group();
    g.add(dashedLine(road, divisions, 5.1, 0xe8e0c8, 4.2, 4.8));
    g.add(dashedLine(road, divisions, -5.1, 0xe8e0c8, 4.2, 4.8));
    return g;
  }
  return dashedLine(road, divisions, 0, 0xd8c020, 3.2, 3.8);
}

export function sampleRoad(
  road: RoadDef,
  t: number,
): { x: number; z: number; tx: number; tz: number } {
  const pts = road.points;
  const n = pts.length - 1;
  const clamped = Math.max(0, Math.min(0.999, t));
  const f = clamped * n;
  const i = Math.floor(f);
  const u = f - i;
  const a = pts[i];
  const b = pts[Math.min(i + 1, n)];
  const x = a[0] + (b[0] - a[0]) * u;
  const z = a[1] + (b[1] - a[1]) * u;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) || 1;
  return { x, z, tx: dx / len, tz: dz / len };
}
