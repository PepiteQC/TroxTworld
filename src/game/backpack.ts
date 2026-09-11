import * as THREE from "three";
import { bagCapacity, bagWeight } from "./commerce";
import type { HaulJob } from "./jobs";
import { matLib } from "./materials";
import { tex } from "./textures";

export type PackId = "sac" | "sac_rouge" | "sac_rando";

export function isPack(id: string): id is PackId {
  return id === "sac" || id === "sac_rouge" || id === "sac_rando";
}

export function packCapacity(id: string | null): number {
  return bagCapacity(id);
}

export function bagFill(inv: Record<string, number>, packId: string | null): number {
  const cap = bagCapacity(packId);
  if (cap <= 0) return 0;
  return bagWeight(inv) / cap;
}

export function haulCargoKg(job: HaulJob | null): number {
  if (!job?.loaded) return 0;
  if (job.kind === "taxi") return 80;
  if (job.kind === "laitier") return 240;
  if (job.kind === "siropier") return 180;
  if (job.kind === "camionneur") return 720;
  return 95;
}

export function walkLoadMul(fill: number): number {
  if (fill <= 0.12) return 1;
  if (fill > 1) return 0.46;
  return 1 - fill * 0.34;
}

export function vehicleLoadMul(cargoKg: number, bagKg: number, mass = 1): number {
  return 1 / (1 + (cargoKg + bagKg * 0.2) / (1600 * Math.max(0.5, mass)));
}

export function applyPackLoad(group: THREE.Group, fill: number) {
  const pack = group.getObjectByName("backpack");
  if (!pack) return;
  const t = Math.min(1.4, Math.max(0, fill));
  pack.scale.set(1 + t * 0.1, 1 - t * 0.14, 1 + t * 0.42);
  pack.position.set(0, 1.04 - t * 0.05, -0.28 - t * 0.05);
}

export function buildBackpack(id: string): THREE.Group | null {
  if (!isPack(id)) return null;
  const color = id === "sac_rando" ? 0x2a4a32 : id === "sac_rouge" ? 0x7a1c1c : 0x1c1c1e;
  const cloth = tex.cloth("laine", "laineNrm", 1.5, 2.1, 0.86, color, 0.5);
  const g = new THREE.Group();
  g.name = "backpack";
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.16), cloth);
  body.name = "pack-body";
  body.position.y = 0.22;
  body.castShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.17), cloth);
  lid.position.y = 0.46;
  g.add(lid);
  for (const s of [-1, 1] as const) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.4, 0.02), matLib.get(0x2a2a28, 0.88));
    strap.position.set(s * 0.1, 0.18, 0.1);
    g.add(strap);
  }
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.02), matLib.get(0xc0c4c8, 0.35, 0.85));
  buckle.position.set(0, 0.08, 0.1);
  g.add(buckle);
  if (id === "sac_rando") {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), matLib.get(0x4a5a38, 0.9));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.54, 0);
    g.add(roll);
  }
  if (id === "sac_rouge") {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.01), matLib.getEmissive(0x8a2020, 0xc04040, 0.15));
    patch.position.set(0, 0.28, 0.085);
    g.add(patch);
  }
  g.position.set(0, 1.04, -0.28);
  return g;
}
