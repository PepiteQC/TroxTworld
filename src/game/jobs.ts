import * as THREE from "three";
import { LANDMARK_SHOPS } from "./commerce";
import { legalFarmsteads } from "./farms";
import { sugarSites } from "./sugar";
import { matLib } from "./materials";
import { A40_EXITS, A40_Z, PAPETERIE, VILLAGES } from "./worlddata";

export type HaulKind = "livreur" | "laitier" | "camionneur" | "taxi" | "siropier";

export interface HaulStop {
  name: string;
  x: number;
  z: number;
}

export interface HaulJob {
  id: string;
  kind: HaulKind;
  title: string;
  hint: string;
  from: HaulStop;
  to: HaulStop;
  pay: number;
  loaded: boolean;
  needs: "pickup" | "any";
}

const KIND_META: Record<HaulKind, { title: string; hint: string; needs: "pickup" | "any"; rate: number; base: number }> = {
  livreur: { title: "Livreur 138", hint: "Colis, caisse du pick-up", needs: "pickup", rate: 0.055, base: 26 },
  laitier: { title: "Laitier des rangs", hint: "Bidons Québon", needs: "pickup", rate: 0.05, base: 22 },
  camionneur: { title: "Camionneur A-40", hint: "Fret Félix-Leclerc", needs: "pickup", rate: 0.07, base: 38 },
  taxi: { title: "Taxi du comté", hint: "Course villageoise", needs: "any", rate: 0.048, base: 18 },
  siropier: { title: "Siropier des cabanes", hint: "Bidons d'eau d'érable", needs: "pickup", rate: 0.052, base: 24 },
};

function villageStop(id?: string): HaulStop {
  const list = id ? VILLAGES.filter((v) => v.id === id) : VILLAGES;
  const v = list[Math.floor(Math.random() * list.length)] ?? VILLAGES[5]!;
  return { name: v.name, x: v.center[0], z: v.center[1] };
}

function otherVillage(except: string): HaulStop {
  const pool = VILLAGES.filter((v) => v.name !== except);
  const v = pool[Math.floor(Math.random() * pool.length)] ?? VILLAGES[0]!;
  return { name: v.name, x: v.center[0], z: v.center[1] };
}

function shopStop(): HaulStop {
  const s = LANDMARK_SHOPS[Math.floor(Math.random() * LANDMARK_SHOPS.length)]!;
  return { name: s.name, x: s.x, z: s.z };
}

function exitStop(): HaulStop {
  const e = A40_EXITS[Math.floor(Math.random() * A40_EXITS.length)]!;
  return { name: `Sortie ${e.no} ${e.title}`, x: e.x, z: A40_Z + 8 };
}

function millStop(): HaulStop {
  return { name: "Papeterie Donnacona", x: PAPETERIE.x, z: PAPETERIE.z };
}

function farmStop(): HaulStop {
  const farms = legalFarmsteads();
  const f = farms[Math.floor(Math.random() * farms.length)] ?? farms[0]!;
  return { name: `Laiterie · ${f.name}`, x: f.x, z: f.z };
}

function sugarStop(): HaulStop {
  const sites = sugarSites();
  const s = sites[Math.floor(Math.random() * sites.length)] ?? sites[0]!;
  return { name: s.name, x: s.x, z: s.z };
}

function makeJob(kind: HaulKind, from: HaulStop, to: HaulStop): HaulJob {
  const meta = KIND_META[kind];
  const dist = Math.hypot(to.x - from.x, to.z - from.z);
  const pay = Math.max(16, Math.round(meta.base + dist * meta.rate));
  return {
    id: `${kind}-${Math.round(from.x)}-${Math.round(to.x)}-${Math.floor(Math.random() * 99)}`,
    kind,
    title: meta.title,
    hint: meta.hint,
    from,
    to,
    pay,
    loaded: false,
    needs: meta.needs,
  };
}

export function rollBoard(): HaulJob[] {
  const shop = shopStop();
  const destA = otherVillage(shop.name);
  const farm = farmStop();
  const destB = otherVillage(farm.name);
  const cabane = sugarStop();
  const destS = otherVillage(cabane.name);
  const e1 = exitStop();
  let e2 = exitStop();
  let guard = 0;
  while (e2.name === e1.name && guard++ < 8) e2 = exitStop();
  const t1 = villageStop();
  const t2 = otherVillage(t1.name);
  return [
    makeJob("livreur", shop, destA),
    makeJob("laitier", farm, destB),
    makeJob("siropier", cabane, destS),
    makeJob("camionneur", e1, e2),
    makeJob("camionneur", millStop(), destA),
    makeJob("taxi", t1, t2),
  ];
}

export function haulTarget(job: HaulJob): HaulStop {
  return job.loaded ? job.to : job.from;
}

export function nearHaul(job: HaulJob, x: number, z: number, radius = 22) {
  const t = haulTarget(job);
  return Math.hypot(x - t.x, z - t.z) < radius;
}

export function haulDistance(job: HaulJob, x: number, z: number) {
  const t = haulTarget(job);
  return Math.hypot(x - t.x, z - t.z);
}

export function buildCargoCrate(): THREE.Group {
  const g = new THREE.Group();
  g.name = "cargo";
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), matLib.get(0x8a6a3a, 0.9));
  box.position.y = 0.28;
  box.castShadow = true;
  g.add(box);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.06, 0.08), matLib.get(0x3a2a18, 0.85));
  strap.position.y = 0.28;
  g.add(strap);
  return g;
}
