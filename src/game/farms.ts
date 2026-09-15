import * as THREE from "three";
import { buildGrange, buildMaisonCanadienne } from "./architecture";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { getTerrainHeight, pushOffRoad, RANG_2E_Z, RIVER_RANGS, nearestRoadHit } from "./worlddata";
import { attachScenicHeat } from "./utilities";

export type CropId = "mais" | "ble" | "foin" | "patate" | "cannabis";
export type FieldStage = "friche" | "laboure" | "seme" | "pousse" | "mur";

export interface CropSpec {
  id: CropId;
  label: string;
  seedId: string;
  yieldId: string;
  yieldN: number;
  grow: number;
  illegal: boolean;
  color: number;
  height: number;
}

export const CROPS: Record<CropId, CropSpec> = {
  mais: { id: "mais", label: "Maïs", seedId: "graines_mais", yieldId: "mais", yieldN: 4, grow: 44, illegal: false, color: 0xc8a840, height: 1.65 },
  ble: { id: "ble", label: "Blé", seedId: "graines_ble", yieldId: "ble", yieldN: 3, grow: 36, illegal: false, color: 0xd4b850, height: 0.82 },
  foin: { id: "foin", label: "Foin", seedId: "graines_foin", yieldId: "foin", yieldN: 4, grow: 28, illegal: false, color: 0x5a8a40, height: 0.4 },
  patate: { id: "patate", label: "Patates", seedId: "graines_patate", yieldId: "patate", yieldN: 5, grow: 40, illegal: false, color: 0x6a8a48, height: 0.46 },
  cannabis: { id: "cannabis", label: "Cannabis", seedId: "graines_cannabis", yieldId: "weed", yieldN: 5, grow: 42, illegal: true, color: 0x2a6a32, height: 1.2 },
};

export function cropFromSeed(id: string): CropId | null {
  const hit = Object.values(CROPS).find((c) => c.seedId === id);
  return hit?.id ?? null;
}

export interface FieldPlot {
  id: string;
  name: string;
  village: string;
  x: number;
  z: number;
  yaw: number;
  w: number;
  d: number;
  illegal: boolean;
  concealed: boolean;
  heat: number;
  stage: FieldStage;
  crop: CropId | null;
  plantedAt: number;
  group: THREE.Group;
}

interface PlotDef {
  ox: number;
  oz: number;
  w: number;
  d: number;
  crop?: CropId | null;
  stage?: FieldStage;
}

interface FarmDef {
  id: string;
  village: string;
  villageId: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  crop: CropId;
  hidden?: boolean;
  plots: PlotDef[];
}

/** Rangs seigneuriaux : lots à l'est du rang N-S, cour face au 2e Rang. */
function riverYard(farmId: string): { x: number; z: number; yaw: number } | null {
  const rang = RIVER_RANGS.find((r) => r.farmId === farmId);
  if (!rang) return null;
  return { x: rang.x + 22, z: RANG_2E_Z - 17, yaw: 0 };
}

const FARMSTEADS: FarmDef[] = [
  {
    id: "rang_grondines_ouest",
    village: "Grondines",
    villageId: "grondines",
    name: "Rang du Chemin du Roy",
    ...riverYard("rang_grondines_ouest")!,
    crop: "mais",
    plots: [
      { ox: -13, oz: -22, w: 22, d: 30, crop: "mais", stage: "pousse" },
      { ox: 13, oz: -22, w: 22, d: 30, crop: null, stage: "friche" },
    ],
  },
  {
    id: "rang_grondines_est",
    village: "Grondines",
    villageId: "grondines",
    name: "Rang Sainte-Anne",
    ...riverYard("rang_grondines_est")!,
    crop: "foin",
    plots: [
      { ox: -12, oz: -22, w: 20, d: 30, crop: "foin", stage: "mur" },
      { ox: 12, oz: -22, w: 20, d: 30, crop: "ble", stage: "seme" },
    ],
  },
  {
    id: "rang_deschambault_ouest",
    village: "Deschambault-Grondines",
    villageId: "deschambault",
    name: "Rang des Pins",
    ...riverYard("rang_deschambault_ouest")!,
    crop: "mais",
    plots: [
      { ox: -14, oz: -22, w: 24, d: 32, crop: "mais", stage: "pousse" },
      { ox: 14, oz: -22, w: 24, d: 32, crop: "foin", stage: "laboure" },
    ],
  },
  {
    id: "rang_deschambault_est",
    village: "Deschambault-Grondines",
    villageId: "deschambault",
    name: "Côte de la Traverse",
    ...riverYard("rang_deschambault_est")!,
    crop: "ble",
    plots: [
      { ox: -13, oz: -22, w: 22, d: 30, crop: "ble", stage: "pousse" },
      { ox: 13, oz: -22, w: 22, d: 30, crop: null, stage: "friche" },
    ],
  },
  {
    id: "rang_portneuf_ouest",
    village: "Portneuf",
    villageId: "portneuf",
    name: "Rang de la Pointe",
    ...riverYard("rang_portneuf_ouest")!,
    crop: "mais",
    plots: [
      { ox: -13, oz: -22, w: 22, d: 30, crop: "mais", stage: "mur" },
      { ox: 13, oz: -22, w: 22, d: 30, crop: "patate", stage: "pousse" },
    ],
  },
  {
    id: "rang_capsante_ouest",
    village: "Cap-Santé",
    villageId: "cap_sante",
    name: "Rang Saint-Joseph",
    ...riverYard("rang_capsante_ouest")!,
    crop: "patate",
    plots: [
      { ox: -12, oz: -22, w: 20, d: 30, crop: "patate", stage: "pousse" },
      { ox: 12, oz: -22, w: 20, d: 30, crop: "foin", stage: "friche" },
    ],
  },
  {
    id: "rang_capsante_est",
    village: "Cap-Santé",
    villageId: "cap_sante",
    name: "Rang du Vieux Chemin",
    ...riverYard("rang_capsante_est")!,
    crop: "foin",
    plots: [
      { ox: -13, oz: -22, w: 22, d: 30, crop: "foin", stage: "pousse" },
      { ox: 13, oz: -22, w: 22, d: 30, crop: "ble", stage: "laboure" },
    ],
  },
  {
    id: "rang_neuville_ouest",
    village: "Neuville",
    villageId: "neuville",
    name: "Côte des Écureuils",
    ...riverYard("rang_neuville_ouest")!,
    crop: "patate",
    plots: [
      { ox: -12, oz: -20, w: 20, d: 28, crop: "patate", stage: "mur" },
      { ox: 12, oz: -20, w: 20, d: 28, crop: "mais", stage: "seme" },
    ],
  },
  {
    id: "rang_basile",
    village: "Saint-Basile",
    villageId: "saint_basile",
    name: "Rang de la Rivière",
    x: 340,
    z: -248,
    yaw: 0.18,
    crop: "foin",
    plots: [
      { ox: -14, oz: -28, w: 24, d: 40, crop: "foin", stage: "pousse" },
      { ox: 14, oz: -28, w: 24, d: 40, crop: null, stage: "friche" },
    ],
  },
  {
    id: "rang_casimir",
    village: "Saint-Casimir",
    villageId: "saint_casimir",
    name: "Rang Sainte-Anne",
    x: -980,
    z: -360,
    yaw: 0.4,
    crop: "mais",
    plots: [
      { ox: -14, oz: -26, w: 24, d: 38, crop: "mais", stage: "pousse" },
      { ox: 14, oz: -26, w: 24, d: 38, crop: "foin", stage: "laboure" },
    ],
  },
  {
    id: "rang_marc",
    village: "Saint-Marc-des-Carrières",
    villageId: "saint_marc",
    name: "Rang des Carrières",
    x: -600,
    z: -380,
    yaw: 0.12,
    crop: "foin",
    plots: [
      { ox: -13, oz: -24, w: 22, d: 36, crop: "foin", stage: "mur" },
      { ox: 13, oz: -24, w: 22, d: 36, crop: "ble", stage: "pousse" },
    ],
  },
  {
    id: "rang_alban",
    village: "Saint-Alban",
    villageId: "saint_alban",
    name: "Rang de l'Éboulis",
    x: -540,
    z: -470,
    yaw: 0.85,
    crop: "ble",
    plots: [
      { ox: -12, oz: -22, w: 20, d: 32, crop: "ble", stage: "pousse" },
      { ox: 12, oz: -22, w: 20, d: 32, crop: null, stage: "friche" },
    ],
  },
  {
    id: "farm_illicite_alban",
    village: "Saint-Alban",
    villageId: "saint_alban",
    name: "Culture cachée · Bois de Saint-Alban",
    x: -880,
    z: -700,
    yaw: 0.55,
    crop: "cannabis",
    hidden: true,
    plots: [{ ox: 0, oz: 0, w: 16, d: 12, crop: null, stage: "friche" }],
  },
  {
    id: "farm_illicite_laurentides",
    village: "Saint-Alban",
    villageId: "saint_alban",
    name: "Culture cachée · Laurentides",
    x: -740,
    z: -820,
    yaw: -0.3,
    crop: "cannabis",
    hidden: true,
    plots: [{ ox: 0, oz: 0, w: 14, d: 11, crop: null, stage: "friche" }],
  },
];

export function countyFarmLayout(): FarmDef[] {
  return FARMSTEADS;
}

export function legalFarmsteads(): Array<{ id: string; name: string; village: string; x: number; z: number; yaw: number }> {
  return FARMSTEADS.filter((f) => !f.hidden).map((f) => ({
    id: f.id,
    name: f.name,
    village: f.village,
    x: f.x,
    z: f.z,
    yaw: f.yaw,
  }));
}

export function farmClearings(): Array<{ x: number; z: number; r: number }> {
  const out: Array<{ x: number; z: number; r: number }> = [];
  for (const farm of FARMSTEADS) {
    out.push({ x: farm.x, z: farm.z, r: farm.hidden ? 28 : 36 });
    for (const p of farm.plots) {
      const x = farm.x + Math.cos(farm.yaw) * p.ox - Math.sin(farm.yaw) * p.oz;
      const z = farm.z + Math.sin(farm.yaw) * p.ox + Math.cos(farm.yaw) * p.oz;
      out.push({ x, z, r: Math.max(p.w, p.d) * 0.55 + 8 });
    }
  }
  return out;
}

export function farmMapMarks(): Array<{ x: number; z: number; w: number; d: number; yaw: number; illegal: boolean }> {
  const out: Array<{ x: number; z: number; w: number; d: number; yaw: number; illegal: boolean }> = [];
  for (const farm of FARMSTEADS) {
    for (const p of farm.plots) {
      const x = farm.x + Math.cos(farm.yaw) * p.ox - Math.sin(farm.yaw) * p.oz;
      const z = farm.z + Math.sin(farm.yaw) * p.ox + Math.cos(farm.yaw) * p.oz;
      out.push({ x, z, w: p.w, d: p.d, yaw: farm.yaw, illegal: Boolean(farm.hidden) });
    }
  }
  return out;
}

const dummy = new THREE.Object3D();

function soilColor(stage: FieldStage, illegal: boolean) {
  if (stage === "friche") return illegal ? 0x3a4a32 : 0x4a5a38;
  if (stage === "laboure") return 0x4a3525;
  if (illegal) return 0x3a4a28;
  if (stage === "mur") return 0x4a3a22;
  return 0x4a3525;
}

function cropTint(spec: CropSpec, stage: FieldStage) {
  if (stage === "seme") return 0x3a5a28;
  if (stage === "pousse" && spec.id !== "foin") return spec.id === "cannabis" ? 0x245828 : 0x4a7a30;
  return spec.color;
}

function addFurrows(g: THREE.Group, plot: FieldPlot) {
  const n = Math.max(5, Math.floor(plot.w / 1.15));
  const geo = getGeo("box", { w: 0.2, h: 0.06, d: plot.d * 0.92 });
  const mesh = new THREE.InstancedMesh(geo, matLib.get(0x3a2818, 1, 0), n);
  mesh.receiveShadow = true;
  for (let i = 0; i < n; i++) {
    dummy.position.set((i - (n - 1) / 2) * (plot.w / n), 0.06, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  g.add(mesh);
}

function addFence(g: THREE.Group, plot: FieldPlot) {
  const posts: Array<[number, number]> = [];
  const step = 5.2;
  for (let x = -plot.w / 2; x <= plot.w / 2 + 0.01; x += step) {
    posts.push([x, -plot.d / 2], [x, plot.d / 2]);
  }
  for (let z = -plot.d / 2 + step; z < plot.d / 2; z += step) {
    posts.push([-plot.w / 2, z], [plot.w / 2, z]);
  }
  const geo = getGeo("cylinder", { r: 0.07, r2: 0.09, h: 1.15, seg: 5 });
  const mesh = new THREE.InstancedMesh(geo, matLib.get(0x6a5a48, 0.92, 0), posts.length);
  mesh.castShadow = true;
  posts.forEach(([x, z], i) => {
    dummy.position.set(x, 0.55, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  g.add(mesh);
  const railMat = matLib.get(0x5a4a3a, 0.9, 0);
  for (const z of [-plot.d / 2, plot.d / 2]) {
    const rail = new THREE.Mesh(getGeo("box", { w: plot.w, h: 0.06, d: 0.05 }), railMat);
    rail.position.set(0, 0.72, z);
    g.add(rail);
  }
  for (const x of [-plot.w / 2, plot.w / 2]) {
    const rail = new THREE.Mesh(getGeo("box", { w: 0.05, h: 0.06, d: plot.d }), railMat);
    rail.position.set(x, 0.72, 0);
    g.add(rail);
  }
}

function addSign(g: THREE.Group, plot: FieldPlot, spec: CropSpec | null) {
  const post = new THREE.Mesh(getGeo("box", { w: 0.08, h: 1.25, d: 0.08 }), matLib.get(0x5a4030, 0.9));
  post.position.set(0, 0.62, plot.d / 2 + 0.45);
  const board = new THREE.Mesh(
    getGeo("box", { w: 0.95, h: 0.38, d: 0.05 }),
    matLib.get(spec ? cropTint(spec, plot.stage) : 0x6a5a40, 0.82),
  );
  board.position.set(0, 1.18, plot.d / 2 + 0.45);
  g.add(post, board);
}

function addWeeds(g: THREE.Group, plot: FieldPlot) {
  const n = 14;
  const geo = getGeo("cone", { r: 0.18, h: 0.32, seg: 5 });
  const mesh = new THREE.InstancedMesh(geo, matLib.get(plot.illegal ? 0x3a5a32 : 0x4a6a38, 1, 0), n);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * plot.w * 0.32, 0.16, Math.sin(a * 1.7) * plot.d * 0.32);
    dummy.rotation.set(0, a, 0);
    dummy.scale.setScalar(0.7 + (i % 4) * 0.18);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  g.add(mesh);
}

function plantCrop(g: THREE.Group, plot: FieldPlot, spec: CropSpec) {
  const stageMul = plot.stage === "seme" ? 0.16 : plot.stage === "pousse" ? 0.5 : 1;
  const h = Math.max(0.08, spec.height * stageMul);
  const rows = Math.max(4, Math.floor(plot.w / 2.05));
  const cols = Math.max(4, Math.floor(plot.d / 1.85));
  const n = rows * cols;
  const tint = cropTint(spec, plot.stage);
  let geo: THREE.BufferGeometry;
  if (spec.id === "mais") geo = getGeo("cylinder", { r: 0.055, r2: 0.08, h, seg: 5 });
  else if (spec.id === "cannabis") geo = getGeo("icosa", { r: 0.34 * stageMul + 0.14 });
  else if (spec.id === "patate") geo = getGeo("sphere", { r: 0.26 * stageMul + 0.1, seg: 6, segH: 4 });
  else if (spec.id === "foin") geo = getGeo("box", { w: 1.55, h, d: 1.55 });
  else geo = getGeo("box", { w: 0.2, h, d: 0.07 });
  const mesh = new THREE.InstancedMesh(geo, matLib.get(tint, 0.92, 0), n);
  mesh.castShadow = plot.stage !== "seme";
  mesh.receiveShadow = true;
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lx = (r - (rows - 1) / 2) * (plot.w / rows) * 0.92;
      const lz = (c - (cols - 1) / 2) * (plot.d / cols) * 0.9;
      const y = spec.id === "patate" || spec.id === "cannabis" ? h * 0.38 : h / 2;
      dummy.position.set(lx, y, lz);
      dummy.rotation.set(0, (r * 13 + c * 7) * 0.04, 0);
      dummy.scale.setScalar(0.82 + ((r * 3 + c) % 5) * 0.07);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    }
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  g.add(mesh);

  if (plot.stage === "mur" && spec.id === "foin") {
    const baleGeo = getGeo("cylinder", { r: 0.72, r2: 0.72, h: 1.25, seg: 8 });
    const bales = new THREE.InstancedMesh(baleGeo, matLib.get(0xc4a44a, 0.95, 0), 5);
    bales.castShadow = true;
    for (let b = 0; b < 5; b++) {
      dummy.position.set((b - 2) * 3.2, 0.72, plot.d * 0.28);
      dummy.rotation.set(0, 0, Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bales.setMatrixAt(b, dummy.matrix);
    }
    g.add(bales);
  }
  if (plot.stage === "mur" && spec.id === "mais") {
    const earGeo = getGeo("box", { w: 0.1, h: 0.22, d: 0.1 });
    const ears = new THREE.InstancedMesh(earGeo, matLib.get(0xe8c84a, 0.7, 0), rows);
    ears.castShadow = true;
    for (let r = 0; r < rows; r++) {
      dummy.position.set((r - (rows - 1) / 2) * (plot.w / rows) * 0.92, h * 0.72, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ears.setMatrixAt(r, dummy.matrix);
    }
    g.add(ears);
  }
}

function hoopHouse(w: number, d: number) {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(
    getGeo("cylinder", { r: w * 0.48, r2: w * 0.48, h: d * 0.92, seg: 10, open: true }),
    matLib.glass("7a9a72", 0.22),
  );
  cover.rotation.x = Math.PI / 2;
  cover.position.y = w * 0.22;
  cover.scale.set(1, 0.55, 1);
  g.add(cover);
  const frameMat = matLib.get(0x8a8a82, 0.45, 0.35);
  for (const z of [-d * 0.35, 0, d * 0.35]) {
    const rib = new THREE.Mesh(getGeo("torus", { r: w * 0.42, tube: 0.05, seg: 10 }), frameMat);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(0, w * 0.12, z);
    rib.scale.set(1, 0.55, 1);
    g.add(rib);
  }
  return g;
}

export function buildTracteur(seed: number) {
  const g = new THREE.Group();
  g.name = "tracteur";
  const body = new THREE.Mesh(getGeo("box", { w: 1.7, h: 1.05, d: 2.6 }), matLib.get(seed % 2 === 0 ? 0x8a2020 : 0x2a6a38, 0.55, 0.2));
  body.position.y = 1.05;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(getGeo("box", { w: 1.35, h: 1.05, d: 1.1 }), matLib.get(0x1a1a1e, 0.4, 0.25));
  cabin.position.set(0, 2.05, -0.15);
  cabin.castShadow = true;
  g.add(cabin);
  const glass = new THREE.Mesh(getGeo("box", { w: 1.2, h: 0.7, d: 0.08 }), matLib.glass("88aacc", 0.35));
  glass.position.set(0, 2.15, 0.42);
  g.add(glass);
  const wheelGeo = getGeo("cylinder", { r: 0.55, r2: 0.55, h: 0.32, seg: 8 });
  const tire = matLib.get(0x1a1a1c, 0.95, 0);
  for (const [x, z, s] of [
    [-0.85, 0.85, 1],
    [0.85, 0.85, 1],
    [-0.9, -0.95, 1.25],
    [0.9, -0.95, 1.25],
  ] as const) {
    const w = new THREE.Mesh(wheelGeo, tire);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.55 * s, z);
    w.scale.setScalar(s);
    w.castShadow = true;
    g.add(w);
  }
  const stack = new THREE.Mesh(getGeo("cylinder", { r: 0.08, r2: 0.1, h: 0.9, seg: 6 }), matLib.get(0x3a3a3e, 0.5, 0.4));
  stack.position.set(0.35, 2.05, 0.9);
  g.add(stack);
  return g;
}

function paintField(plot: FieldPlot) {
  const g = plot.group;
  while (g.children.length) g.remove(g.children[0]!);
  const y = getTerrainHeight(plot.x, plot.z);
  const soil = new THREE.Mesh(
    getGeo("box", { w: plot.w, h: 0.09, d: plot.d }),
    matLib.get(soilColor(plot.stage, plot.illegal), 1, 0),
  );
  soil.position.y = 0.045;
  soil.receiveShadow = true;
  g.add(soil);

  if (plot.stage === "friche") addWeeds(g, plot);
  if (plot.stage === "laboure" || plot.stage === "seme") addFurrows(g, plot);

  const spec = plot.crop ? CROPS[plot.crop] : null;
  if (spec && plot.stage !== "friche" && plot.stage !== "laboure") plantCrop(g, plot, spec);
  if (!plot.concealed) {
    addFence(g, plot);
    addSign(g, plot, spec);
  } else {
    const tarp = new THREE.Mesh(getGeo("box", { w: 3.2, h: 0.04, d: 2.4 }), matLib.get(0x2a3228, 0.95, 0));
    tarp.position.set(plot.w * 0.28, 0.08, -plot.d * 0.28);
    g.add(tarp);
    if (plot.stage !== "friche") g.add(hoopHouse(plot.w * 0.7, plot.d * 0.75));
  }

  g.position.set(plot.x, y, plot.z);
  g.rotation.y = plot.yaw;
}

function placeFarmstead(parent: THREE.Group, farm: FarmDef) {
  const hit = nearestRoadHit(farm.x, farm.z);
  const yaw = hit ? Math.atan2(hit.x - farm.x, hit.z - farm.z) : farm.yaw;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const y = getTerrainHeight(farm.x, farm.z);

  const yard = new THREE.Mesh(getGeo("box", { w: 22, h: 0.07, d: 16 }), matLib.get(0x6a5a42, 1, 0));
  yard.position.set(farm.x, y + 0.03, farm.z);
  yard.rotation.y = yaw;
  yard.receiveShadow = true;
  parent.add(yard);

  const driveLen = hit ? Math.min(14, Math.max(7, hit.dist - 4.2)) : 10;
  const drive = new THREE.Mesh(getGeo("box", { w: 3.2, h: 0.05, d: driveLen }), matLib.get(0x5a4a38, 1, 0));
  const dx = farm.x + fx * (driveLen / 2 + 3.2);
  const dz = farm.z + fz * (driveLen / 2 + 3.2);
  drive.position.set(dx, getTerrainHeight(dx, dz) + 0.025, dz);
  drive.rotation.y = yaw;
  drive.receiveShadow = true;
  parent.add(drive);

  const house = buildMaisonCanadienne(farm.village.length * 17 + farm.id.length, 0);
  attachScenicHeat(house, "poele", yaw);
  house.position.set(farm.x, y, farm.z);
  house.rotation.y = yaw;
  parent.add(house);

  const barnX = farm.x + rx * 16 - fx * 3;
  const barnZ = farm.z + rz * 16 - fz * 3;
  const barn = buildGrange(2100 + farm.id.length * 13);
  barn.position.set(barnX, getTerrainHeight(barnX, barnZ), barnZ);
  barn.rotation.y = yaw + 0.08;
  parent.add(barn);

  const tx = farm.x + rx * 6 + fx * 5;
  const tz = farm.z + rz * 6 + fz * 5;
  const tractor = buildTracteur(farm.id.length);
  tractor.position.set(tx, getTerrainHeight(tx, tz) + 0.02, tz);
  tractor.rotation.y = yaw + 0.5;
  parent.add(tractor);
}

export function mountFarms(parent: THREE.Group): FieldPlot[] {
  const plots: FieldPlot[] = [];
  for (const raw of FARMSTEADS) {
    const river = RIVER_RANGS.some((r) => r.farmId === raw.id);
    const farm = raw.hidden || river ? raw : { ...raw, ...pushOffRoad(raw.x, raw.z, 18) };
    if (!farm.hidden) placeFarmstead(parent, farm);
    for (let p = 0; p < farm.plots.length; p++) {
      const def = farm.plots[p]!;
      const px = farm.x + Math.cos(farm.yaw) * def.ox - Math.sin(farm.yaw) * def.oz;
      const pz = farm.z + Math.sin(farm.yaw) * def.ox + Math.cos(farm.yaw) * def.oz;
      const plot: FieldPlot = {
        id: `${farm.id}_p${p}`,
        name: farm.hidden ? farm.name : `${farm.name} · ${farm.village}`,
        village: farm.village,
        x: px,
        z: pz,
        yaw: farm.yaw,
        w: def.w,
        d: def.d,
        illegal: Boolean(farm.hidden),
        concealed: Boolean(farm.hidden),
        heat: 0,
        stage: def.stage ?? "friche",
        crop: def.crop ?? (def.stage && def.stage !== "friche" && def.stage !== "laboure" ? farm.crop : null),
        plantedAt: 0,
        group: new THREE.Group(),
      };
      plot.group.name = plot.id;
      paintField(plot);
      parent.add(plot.group);
      plots.push(plot);
    }
  }
  return plots;
}

function localOffset(plot: FieldPlot, x: number, z: number) {
  const dx = x - plot.x;
  const dz = z - plot.z;
  const c = Math.cos(-plot.yaw);
  const s = Math.sin(-plot.yaw);
  return { lx: dx * c - dz * s, lz: dx * s + dz * c };
}

function insidePlot(plot: FieldPlot, x: number, z: number, pad = 3.2) {
  const { lx, lz } = localOffset(plot, x, z);
  return Math.abs(lx) <= plot.w / 2 + pad && Math.abs(lz) <= plot.d / 2 + pad;
}

export function nearestField(plots: FieldPlot[], x: number, z: number, max = 12): FieldPlot | null {
  let best: FieldPlot | null = null;
  let bestD = 1e9;
  for (const p of plots) {
    if (!insidePlot(p, x, z, Math.max(3.2, max * 0.25))) continue;
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

export function fieldPrompt(plot: FieldPlot, tool: string | null, seed: CropId | null): string {
  if (plot.stage === "friche") return tool === "pelle" ? `E — Labourer · ${plot.name}` : `Pelle pour labourer · ${plot.name}`;
  if (plot.stage === "laboure") {
    if (!seed) return `E — Semer · choisissez des graines`;
    const spec = CROPS[seed];
    return spec.illegal ? `E — Semer ${spec.label} (illégal · art. 12 LEC)` : `E — Semer ${spec.label}`;
  }
  if (plot.stage === "seme" || plot.stage === "pousse") {
    const label = plot.crop ? CROPS[plot.crop].label : "culture";
    const heat = plot.illegal ? ` · SQ ${Math.min(99, Math.round(plot.heat * 100))}%` : "";
    return tool === "rateau" || tool === "pelle" ? `E — Binage · ${label}${heat}` : `Râteau pour travailler · ${label}`;
  }
  const label = plot.crop ? CROPS[plot.crop].label : "récolte";
  return `E — Récolter ${label}`;
}

export interface FieldWorkResult {
  ok: boolean;
  notice: string;
  loot?: { id: string; n: number };
  consumeSeed?: string;
  illegalSow?: boolean;
  seized?: boolean;
}

export function workField(plot: FieldPlot, tool: string | null, seed: CropId | null, elapsed: number): FieldWorkResult {
  if (plot.stage === "friche") {
    if (tool !== "pelle") return { ok: false, notice: "Équipez la pelle." };
    plot.stage = "laboure";
    plot.crop = null;
    paintField(plot);
    return { ok: true, notice: `Labouré · ${plot.name}` };
  }
  if (plot.stage === "laboure") {
    if (!seed) return { ok: false, notice: "Pas de semence · sac." };
    const spec = CROPS[seed];
    plot.crop = seed;
    plot.stage = "seme";
    plot.plantedAt = elapsed;
    plot.illegal = spec.illegal;
    plot.heat = spec.illegal ? (plot.concealed ? 0.08 : 0.22) : 0;
    paintField(plot);
    return {
      ok: true,
      notice: spec.illegal
        ? plot.concealed
          ? "Semis illégal · serre cachée · la SQ surveille"
          : "Semis illégal au rang · visible du Chemin du Roy"
        : `Semé · ${spec.label}`,
      consumeSeed: spec.seedId,
      illegalSow: spec.illegal,
    };
  }
  if (plot.stage === "seme" || plot.stage === "pousse") {
    if (tool !== "rateau" && tool !== "pelle") return { ok: false, notice: "Râteau pour le binage." };
    plot.plantedAt -= 8;
    plot.heat += plot.illegal ? (plot.concealed ? 0.05 : 0.12) : 0;
    return { ok: true, notice: `Binage · ${plot.crop ? CROPS[plot.crop].label : "rang"}` };
  }
  if (plot.stage === "mur" && plot.crop) {
    const spec = CROPS[plot.crop];
    const loot = { id: spec.yieldId, n: spec.yieldN };
    const illegal = spec.illegal;
    plot.stage = "friche";
    plot.crop = null;
    plot.illegal = plot.concealed;
    plot.heat = 0;
    paintField(plot);
    return { ok: true, notice: `Récolte · ${spec.label} ×${spec.yieldN}`, loot, illegalSow: illegal };
  }
  return { ok: false, notice: "Rien à faire." };
}

export function tickFields(plots: FieldPlot[], dt: number, elapsed: number, px: number, pz: number): FieldPlot | null {
  let raid: FieldPlot | null = null;
  for (const plot of plots) {
    if ((plot.stage === "seme" || plot.stage === "pousse") && plot.crop) {
      const spec = CROPS[plot.crop];
      const age = elapsed - plot.plantedAt;
      if (plot.stage === "seme" && age > spec.grow * 0.28) {
        plot.stage = "pousse";
        paintField(plot);
      } else if (age > spec.grow) {
        plot.stage = "mur";
        paintField(plot);
      }
    }
    if (plot.illegal && plot.crop === "cannabis" && plot.stage !== "friche") {
      const near = Math.hypot(px - plot.x, pz - plot.z) < 55;
      const roadside = plot.z > -110;
      const rate = plot.concealed ? (near ? 0.02 : 0.007) : roadside ? (near ? 0.055 : 0.03) : near ? 0.04 : 0.016;
      plot.heat += dt * rate;
      if (plot.heat > 1 && Math.random() < dt * 0.4) raid = plot;
    }
  }
  return raid;
}

export function seizeField(plot: FieldPlot): void {
  plot.stage = "friche";
  plot.crop = null;
  plot.illegal = plot.concealed;
  plot.heat = 0;
  plot.plantedAt = 0;
  paintField(plot);
}
