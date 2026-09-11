import * as THREE from "three";
import { buildCabaneSucre } from "./architecture";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { getTerrainHeight } from "./worlddata";

/** Quatre seaux d'eau d'érable → un sirop 250 ml (le vrai ratio est ~40:1). */
export const SAP_PER_SYRUP = 4;

export interface SugarTap {
  id: string;
  bushId: string;
  x: number;
  z: number;
  readyAt: number;
  mesh: THREE.Group;
  sapMesh: THREE.Object3D;
}

export interface SugarEvap {
  id: string;
  bushId: string;
  name: string;
  village: string;
  x: number;
  z: number;
  boilingUntil: number;
  mesh: THREE.Group;
  steam: THREE.Object3D[];
}

export interface SugarBush {
  id: string;
  name: string;
  village: string;
  x: number;
  z: number;
  yaw: number;
  taps: SugarTap[];
  evap: SugarEvap;
}

interface BushDef {
  id: string;
  village: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
}

/**
 * Érablières dans les collines laurentiennes — Saint-Alban (acéricole),
 * Saint-Casimir, Saint-Raymond, Saint-Basile. Loin des rangs du Chemin du Roy
 * et des cultures cachées.
 */
const BUSHES: BushDef[] = [
  {
    id: "erable_alban",
    village: "Saint-Alban",
    name: "Érablière du Trou-du-Diable",
    x: -780,
    z: -640,
    yaw: 0.35,
  },
  {
    id: "erable_casimir",
    village: "Saint-Casimir",
    name: "Érablière de la Gorge",
    x: -1040,
    z: -420,
    yaw: -0.2,
  },
  {
    id: "erable_raymond",
    village: "Saint-Raymond",
    name: "Érablière des Laurentides",
    x: 820,
    z: -780,
    yaw: 0.55,
  },
  {
    id: "erable_basile",
    village: "Saint-Basile",
    name: "Érablière de la rivière Portneuf",
    x: 280,
    z: -440,
    yaw: 0.15,
  },
  {
    id: "erable_collines",
    village: "Saint-Alban",
    name: "Érablière des Collines",
    x: -250,
    z: -720,
    yaw: -0.4,
  },
];

const TAP_SPOTS: Array<[number, number]> = [
  [-16, -8],
  [-10, -14],
  [-2, -18],
  [8, -16],
  [16, -10],
  [18, 0],
  [14, 10],
  [-18, 4],
  [-14, 12],
  [4, -22],
];

function farmToWorld(x: number, z: number, yaw: number, ox: number, oz: number) {
  return {
    x: x + Math.cos(yaw) * ox - Math.sin(yaw) * oz,
    z: z + Math.sin(yaw) * ox + Math.cos(yaw) * oz,
  };
}

export function sugarSites() {
  return BUSHES.map((b) => ({ id: b.id, name: b.name, village: b.village, x: b.x, z: b.z, yaw: b.yaw }));
}

export function sugarClearings(): Array<{ x: number; z: number; r: number }> {
  return BUSHES.map((b) => ({ x: b.x, z: b.z, r: 42 }));
}

export function sugarMapMarks(): Array<{ x: number; z: number; r: number }> {
  return BUSHES.map((b) => ({ x: b.x, z: b.z, r: 18 }));
}

function buildSugarMaple(seed: number): { group: THREE.Group; sap: THREE.Object3D } {
  const g = new THREE.Group();
  g.name = "erable_entaillé";
  const bark = matLib.get(0x4a3020, 0.95, 0);
  const autumn = seed % 3 === 0 ? 0xc45a28 : seed % 3 === 1 ? 0xd47830 : 0xb84820;
  const trunk = new THREE.Mesh(getGeo("cylinder", { r: 0.22, r2: 0.34, h: 4.6, seg: 6 }), bark);
  trunk.position.y = 2.3;
  trunk.castShadow = true;
  g.add(trunk);
  const canopy = new THREE.Mesh(getGeo("sphere", { r: 2.15, seg: 7, segH: 5 }), matLib.get(autumn, 0.92, 0));
  canopy.position.y = 5.15;
  canopy.castShadow = true;
  g.add(canopy);
  const blob = new THREE.Mesh(getGeo("sphere", { r: 1.35, seg: 6, segH: 4 }), matLib.get(autumn + 0x081000, 0.92, 0));
  blob.position.set(0.65, 4.55, 0.28);
  g.add(blob);
  const spout = new THREE.Mesh(getGeo("cylinder", { r: 0.03, r2: 0.03, h: 0.3, seg: 5 }), matLib.get(0x8a8a82, 0.4, 0.7));
  spout.rotation.z = Math.PI / 2;
  spout.position.set(0.38, 1.18, 0);
  g.add(spout);
  const bucket = new THREE.Mesh(getGeo("cylinder", { r: 0.16, r2: 0.14, h: 0.32, seg: 8 }), matLib.get(0x9aa0a4, 0.35, 0.65));
  bucket.position.set(0.54, 0.96, 0);
  bucket.castShadow = true;
  g.add(bucket);
  const sap = new THREE.Mesh(getGeo("cylinder", { r: 0.12, r2: 0.12, h: 0.1, seg: 8 }), matLib.get(0xe8d8a8, 0.18, 0.08));
  sap.position.set(0.54, 0.9, 0);
  sap.name = "sap";
  g.add(sap);
  return { group: g, sap };
}

function buildEvaporator(): { group: THREE.Group; steam: THREE.Object3D[] } {
  const g = new THREE.Group();
  g.name = "evaporateur";
  const brick = matLib.get(0x7a4438, 0.92, 0);
  const box = new THREE.Mesh(getGeo("box", { w: 2.8, h: 0.9, d: 1.65 }), brick);
  box.position.y = 0.45;
  box.castShadow = true;
  g.add(box);
  const mouth = new THREE.Mesh(getGeo("box", { w: 0.7, h: 0.38, d: 0.12 }), matLib.get(0x1a1210, 0.95, 0));
  mouth.position.set(0, 0.32, 0.88);
  g.add(mouth);
  const glow = new THREE.Mesh(getGeo("box", { w: 0.48, h: 0.18, d: 0.06 }), matLib.get(0xe07020, 0.4, 0.2));
  glow.position.set(0, 0.3, 0.94);
  g.add(glow);
  const pan = new THREE.Mesh(getGeo("box", { w: 2.55, h: 0.12, d: 1.4 }), matLib.get(0xb8bcc0, 0.28, 0.72));
  pan.position.y = 0.98;
  g.add(pan);
  const syrup = new THREE.Mesh(getGeo("box", { w: 2.25, h: 0.05, d: 1.15 }), matLib.get(0x8a4a18, 0.22, 0.12));
  syrup.position.y = 1.04;
  g.add(syrup);
  const steam: THREE.Object3D[] = [];
  const puffMat = matLib.get(0xe8ece8, 0.85, 0);
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(getGeo("sphere", { r: 0.22, seg: 5, segH: 4 }), puffMat);
    puff.position.set((i - 1.5) * 0.45, 1.35, 0);
    puff.userData.phase = i * 0.7;
    g.add(puff);
    steam.push(puff);
  }
  return { group: g, steam };
}

function buildWoodpile(): THREE.Group {
  const g = new THREE.Group();
  const wood = matLib.get(0x6a4a32, 0.92, 0);
  const log = getGeo("cylinder", { r: 0.12, r2: 0.13, h: 1.4, seg: 5 });
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(log, wood);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, 0.14 + row * 0.24, (i - 2) * 0.26);
      m.castShadow = true;
      g.add(m);
    }
  }
  return g;
}

export function mountSugarbush(parent: THREE.Group): SugarBush[] {
  const out: SugarBush[] = [];
  for (const def of BUSHES) {
    const y = getTerrainHeight(def.x, def.z);
    const cabane = buildCabaneSucre(def.id.length + 21);
    cabane.position.set(def.x, y, def.z);
    cabane.rotation.y = def.yaw;
    parent.add(cabane);

    const evapLocal = farmToWorld(def.x, def.z, def.yaw, 0, 8.2);
    const evapBuilt = buildEvaporator();
    evapBuilt.group.position.set(evapLocal.x, getTerrainHeight(evapLocal.x, evapLocal.z), evapLocal.z);
    evapBuilt.group.rotation.y = def.yaw;
    parent.add(evapBuilt.group);

    const woodPos = farmToWorld(def.x, def.z, def.yaw, -6.2, 6.4);
    const wood = buildWoodpile();
    wood.position.set(woodPos.x, getTerrainHeight(woodPos.x, woodPos.z), woodPos.z);
    wood.rotation.y = def.yaw;
    parent.add(wood);

    const evap: SugarEvap = {
      id: `${def.id}_evap`,
      bushId: def.id,
      name: def.name,
      village: def.village,
      x: evapLocal.x,
      z: evapLocal.z,
      boilingUntil: 0,
      mesh: evapBuilt.group,
      steam: evapBuilt.steam,
    };

    const taps: SugarTap[] = [];
    TAP_SPOTS.forEach(([ox, oz], i) => {
      const p = farmToWorld(def.x, def.z, def.yaw, ox, oz);
      const maple = buildSugarMaple(def.id.length + i);
      maple.group.position.set(p.x, getTerrainHeight(p.x, p.z), p.z);
      maple.group.rotation.y = def.yaw + (i % 2 === 0 ? 0.4 : -0.35);
      parent.add(maple.group);
      taps.push({
        id: `${def.id}_tap_${i}`,
        bushId: def.id,
        x: p.x,
        z: p.z,
        readyAt: 2 + i * 1.6,
        mesh: maple.group,
        sapMesh: maple.sap,
      });
    });

    out.push({
      id: def.id,
      name: def.name,
      village: def.village,
      x: def.x,
      z: def.z,
      yaw: def.yaw,
      taps,
      evap,
    });
  }
  return out;
}

export function nearestTap(bushes: SugarBush[], x: number, z: number, max = 2.6): SugarTap | null {
  let best: SugarTap | null = null;
  let bestD = max;
  for (const b of bushes) {
    for (const t of b.taps) {
      const d = Math.hypot(x - t.x, z - t.z);
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
  }
  return best;
}

export function nearestEvap(bushes: SugarBush[], x: number, z: number, max = 3.4): SugarEvap | null {
  let best: SugarEvap | null = null;
  let bestD = max;
  for (const b of bushes) {
    const d = Math.hypot(x - b.evap.x, z - b.evap.z);
    if (d < bestD) {
      best = b.evap;
      bestD = d;
    }
  }
  return best;
}

export function nearestBush(bushes: SugarBush[], x: number, z: number, max = 36): SugarBush | null {
  let best: SugarBush | null = null;
  let bestD = max;
  for (const b of bushes) {
    const d = Math.hypot(x - b.x, z - b.z);
    if (d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

export function tapPrompt(t: SugarTap, elapsed: number): string {
  if (elapsed >= t.readyAt) return "E — Récolter l'eau d'érable";
  const wait = Math.max(1, Math.ceil(t.readyAt - elapsed));
  return `Entaille · coulée dans ${wait} s`;
}

export function evapPrompt(e: SugarEvap, sapN: number): string {
  if (sapN >= SAP_PER_SYRUP) return `E — Bouillir · ${SAP_PER_SYRUP} seaux → sirop · ${e.name}`;
  if (sapN > 0) return `Évaporateur · ${sapN}/${SAP_PER_SYRUP} seaux · ${e.name}`;
  return `Évaporateur · ${SAP_PER_SYRUP} seaux d'eau d'érable`;
}

export interface SugarWorkResult {
  ok: boolean;
  notice: string;
  loot?: { id: string; n: number };
  consume?: { id: string; n: number };
}

export function workTap(t: SugarTap, elapsed: number): SugarWorkResult {
  if (elapsed < t.readyAt) {
    const wait = Math.max(1, Math.ceil(t.readyAt - elapsed));
    return { ok: false, notice: `Pas encore · ${wait} s` };
  }
  t.readyAt = elapsed + 14 + (t.id.length % 5);
  t.sapMesh.scale.set(1, 0.15, 1);
  return { ok: true, notice: `Coulée · seau d'eau d'érable · ${t.bushId.replace("erable_", "")}`, loot: { id: "eau_erable", n: 1 } };
}

export function workEvap(e: SugarEvap, elapsed: number, sapN: number): SugarWorkResult {
  if (sapN < SAP_PER_SYRUP) {
    return { ok: false, notice: `Il faut ${SAP_PER_SYRUP} seaux · ${sapN} en sac.` };
  }
  e.boilingUntil = elapsed + 6;
  return {
    ok: true,
    notice: `Bouilli · sirop d'érable · ${e.name}`,
    loot: { id: "sirop", n: 1 },
    consume: { id: "eau_erable", n: SAP_PER_SYRUP },
  };
}

export function tickSugar(bushes: SugarBush[], elapsed: number) {
  for (const b of bushes) {
    for (const t of b.taps) {
      const full = elapsed >= t.readyAt;
      const h = full ? 1 : 0.12 + Math.max(0, 1 - (t.readyAt - elapsed) / 16) * 0.7;
      t.sapMesh.scale.set(1, h, 1);
    }
    const boiling = elapsed < b.evap.boilingUntil;
    for (const puff of b.evap.steam) {
      const phase = (puff.userData.phase as number) + elapsed * (boiling ? 1.6 : 0.45);
      const lift = (phase % 2.2) * (boiling ? 0.55 : 0.22);
      puff.position.y = 1.28 + lift;
      const s = boiling ? 0.7 + (phase % 1.4) * 0.5 : 0.35;
      puff.scale.setScalar(s);
      puff.visible = boiling || lift < 0.55;
    }
  }
}
