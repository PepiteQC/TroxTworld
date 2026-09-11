/**
 * Mobilier de rue du comté — arrêts, bornes, distributeurs, feux, feux de camp.
 */
import * as THREE from "three";
import { depanneurOffset } from "./commerce";
import { buildStreetProp, tickProps3d } from "./props3d";
import { A40_EXITS, getTerrainHeight, LAKES, VILLAGES } from "./worlddata";

export type StreetKind = "vending" | "bus" | "hydrant" | "mail" | "campfire" | "tlight" | "bench" | "dump" | "pump" | "trash" | "stop" | "flag";

export interface StreetSpot {
  id: string;
  kind: StreetKind;
  name: string;
  x: number;
  z: number;
  yaw: number;
}

export function countyStreetSpots(): StreetSpot[] {
  const out: StreetSpot[] = [];
  for (const v of VILLAGES) {
    const [cx, cz] = v.center;
    const ang = v.roadAngle;
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);
    const perpX = -dirZ;
    const perpZ = dirX;
    const shop = depanneurOffset(v);
    out.push({
      id: `bus_${v.id}`,
      kind: "bus",
      name: `Arrêt ${v.name}`,
      x: cx + dirX * 22 + perpX * 8,
      z: cz + dirZ * 22 + perpZ * 8,
      yaw: -ang + Math.PI,
    });
    out.push({
      id: `hyd_${v.id}`,
      kind: "hydrant",
      name: "Borne-incendie",
      x: shop.x + Math.cos(shop.yaw) * 4.2,
      z: shop.z + Math.sin(shop.yaw) * 4.2,
      yaw: shop.yaw,
    });
    out.push({
      id: `mail_${v.id}`,
      kind: "mail",
      name: "Boîte aux lettres",
      x: cx + dirX * 8 + perpX * 14,
      z: cz + dirZ * 8 + perpZ * 14,
      yaw: -ang,
    });
    out.push({
      id: `vend_${v.id}`,
      kind: "vending",
      name: `Distributeur · ${v.name}`,
      x: shop.x + Math.cos(shop.yaw) * 6.4,
      z: shop.z - Math.sin(shop.yaw) * 6.4,
      yaw: shop.yaw,
    });
    if (v.type === "ville" || v.population >= 4000) {
      out.push({
        id: `tl_${v.id}`,
        kind: "tlight",
        name: "Feu de circulation",
        x: cx + dirX * 6 + perpX * 10,
        z: cz + dirZ * 6 + perpZ * 10,
        yaw: -ang,
      });
    }
    out.push({
      id: `bench_${v.id}`,
      kind: "bench",
      name: `Banc · ${v.name}`,
      x: cx + perpX * 12,
      z: cz + perpZ * 12,
      yaw: -ang + Math.PI / 2,
    });
    out.push({
      id: `dump_${v.id}`,
      kind: "dump",
      name: "Conteneur",
      x: shop.x - Math.sin(shop.yaw) * 7.5,
      z: shop.z - Math.cos(shop.yaw) * 7.5,
      yaw: shop.yaw,
    });
    out.push({
      id: `stop_${v.id}`,
      kind: "stop",
      name: "Arrêt",
      x: cx + dirX * 16 + perpX * 7,
      z: cz + dirZ * 16 + perpZ * 7,
      yaw: -ang,
    });
    if (v.hasEglise || v.type === "ville") {
      out.push({
        id: `flag_${v.id}`,
        kind: "flag",
        name: `Drapeau · ${v.name}`,
        x: cx + perpX * 6,
        z: cz + perpZ * 6,
        yaw: -ang,
      });
    }
  }
  for (const ex of A40_EXITS) {
    out.push({
      id: `pump_${ex.no}`,
      kind: "pump",
      name: `Petro-Canada ${ex.title}`,
      x: ex.x + 18,
      z: 28,
      yaw: Math.PI,
    });
  }
  for (const lake of LAKES) {
    out.push({
      id: `fire_${lake.name.replace(/\s+/g, "_")}`,
      kind: "campfire",
      name: `Feu de camp · ${lake.name}`,
      x: lake.x + lake.r * 0.62,
      z: lake.z + 10,
      yaw: 0.4,
    });
  }
  return out;
}

export function mountStreetFurniture(parent: THREE.Group): { group: THREE.Group; spots: StreetSpot[] } {
  const group = new THREE.Group();
  group.name = "street-furniture";
  const spots = countyStreetSpots();
  for (const s of spots) {
    const mesh = buildStreetProp(s.kind);
    mesh.position.set(s.x, getTerrainHeight(s.x, s.z), s.z);
    mesh.rotation.y = s.yaw;
    mesh.userData.streetId = s.id;
    mesh.userData.streetKind = s.kind;
    group.add(mesh);
  }
  parent.add(group);
  return { group, spots };
}

export function nearestStreet(
  spots: StreetSpot[],
  x: number,
  z: number,
  max: number,
  kind?: StreetKind,
): StreetSpot | null {
  let best: StreetSpot | null = null;
  let bestD = max;
  for (const s of spots) {
    if (kind && s.kind !== kind) continue;
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

export function tickStreet(group: THREE.Group, elapsed: number): void {
  tickProps3d(group, elapsed);
}
