import { dist2 } from "./rng";

export const WORLD = {
  minX: -1400,
  maxX: 1450,
  minZ: -900,
  maxZ: 230,
  get width() {
    return this.maxX - this.minX;
  },
  get depth() {
    return this.maxZ - this.minZ;
  },
};

export const RIVER_Z = 96;
export const ROAD_138_Z = 4;
export const A40_Z = -178;
export const SQ_JAIL = { x: -176, z: -52 };

export function a40X(km: number) {
  return Math.round((km - 263) * 60);
}

export interface A40Exit {
  no: string;
  km: number;
  x: number;
  title: string;
  dest: string;
}

export const A40_EXITS: A40Exit[] = [
  { no: "250", km: 250, x: a40X(250), title: "Grondines", dest: "Saint-Casimir · Saint-Ubalde" },
  { no: "254", km: 254, x: a40X(254), title: "Route 363", dest: "Saint-Marc · Deschambault · Saint-Alban" },
  { no: "257", km: 257, x: a40X(257), title: "Route Proulx", dest: "Saint-Gilbert · Deschambault" },
  { no: "261", km: 261, x: a40X(261), title: "Portneuf", dest: "Portneuf" },
  { no: "269", km: 269, x: a40X(269), title: "Route 358", dest: "Cap-Santé · Saint-Basile" },
  { no: "274", km: 274, x: a40X(274), title: "Donnacona", dest: "Donnacona" },
  { no: "281", km: 281, x: a40X(281), title: "Route 365", dest: "Neuville · Pont-Rouge · Saint-Raymond" },
  { no: "285", km: 285, x: a40X(285), title: "Route Gravel", dest: "Neuville" },
];

export const RAMP_S = 56;

const X250 = A40_EXITS[0]!.x;
const X254 = A40_EXITS[1]!.x;
const X257 = A40_EXITS[2]!.x;
const X261 = A40_EXITS[3]!.x;
const X269 = A40_EXITS[4]!.x;
const X274 = A40_EXITS[5]!.x;
const X281 = A40_EXITS[6]!.x;
const X285 = A40_EXITS[7]!.x;

export const PAPETERIE = { x: X274 - 36, z: 56 };
export const PRISON = { x: a40X(274) - 140, z: -580 };

export type RoadKind = "highway" | "regional" | "village" | "rural" | "gravel" | "ramp";

export interface RoadDef {
  id: string;
  name: string;
  kind: RoadKind;
  speed: number;
  width: number;
  points: Array<[number, number]>;
  village?: string;
  surface: "asphalt" | "gravel";
  traffic?: number;
  exit?: string;
}

export type Industry =
  | "papeterie"
  | "carriere"
  | "foresterie"
  | "agriculture"
  | "peche"
  | "tourisme"
  | "acericole"
  | "residentiel"
  | "maritime"
  | "urbain";

export type LandmarkKind =
  | "moulin_vent"
  | "moulin_eau"
  | "usine_papier"
  | "carriere_calcaire"
  | "barrage"
  | "marina"
  | "rue_patrimoniale"
  | "pont_couvert"
  | "quai_fleuve"
  | "marmites_geants"
  | "trou_du_diable"
  | "pont_de_fer"
  | "eboulis";

export type ChurchStyle = "pierre_grise" | "pierre_blanche" | "brique_rouge" | "bois_blanc";
export type TerrainType = "plaine_fleuve" | "vallee" | "colline" | "montagne" | "plateau";
export type SettlementType = "ville" | "village" | "hameau";

export interface VillageDef {
  id: string;
  name: string;
  center: [number, number];
  population: number;
  roadAngle: number;
  houseCount: number;
  farmCount: number;
  coreRadius: number;
  description: string;
  motto: string;
  founded: number;
  type: SettlementType;
  industry: Industry;
  secondaryIndustry?: Industry;
  landmarks: LandmarkKind[];
  churchStyle: ChurchStyle;
  churchScale: number;
  terrain: TerrainType;
  sugarShackCount: number;
  hasCaisse: boolean;
  hasEcole: boolean;
  hasEglise: boolean;
  policeResponse: number;
}

export const INDUSTRY_LABEL: Record<Industry, string> = {
  papeterie: "Papeterie",
  carriere: "Carrières",
  foresterie: "Foresterie",
  agriculture: "Agriculture",
  peche: "Pêche",
  tourisme: "Tourisme",
  acericole: "Acéricole",
  residentiel: "Résidentiel",
  maritime: "Maritime",
  urbain: "Urbain",
};

export const LANDMARK_LABEL: Record<LandmarkKind, string> = {
  moulin_vent: "Moulin à vent",
  moulin_eau: "Moulin à eau",
  usine_papier: "Usine à papier",
  carriere_calcaire: "Carrière de calcaire",
  barrage: "Barrage",
  marina: "Marina",
  rue_patrimoniale: "Rue patrimoniale",
  pont_couvert: "Pont couvert",
  quai_fleuve: "Quai du fleuve",
  marmites_geants: "Marmites de géants",
  trou_du_diable: "Trou du Diable",
  pont_de_fer: "Pont de fer",
  eboulis: "Éboulis de 1894",
};

export interface PoiDef {
  id: string;
  name: string;
  type: string;
  x: number;
  z: number;
  radius: number;
  description: string;
}

export const VILLAGES: VillageDef[] = [
  {
    id: "grondines",
    name: "Grondines",
    center: [X250, 12],
    population: 900,
    roadAngle: -0.04,
    houseCount: 10,
    farmCount: 3,
    coreRadius: 64,
    description: "Ouest du comté, Chemin du Roy, sortie 250. Moulin à vent de 1674.",
    motto: "Au fil du Roy",
    founded: 1680,
    type: "hameau",
    industry: "agriculture",
    secondaryIndustry: "tourisme",
    landmarks: ["moulin_vent", "quai_fleuve"],
    churchStyle: "pierre_grise",
    churchScale: 0.85,
    terrain: "plaine_fleuve",
    sugarShackCount: 2,
    hasCaisse: false,
    hasEcole: false,
    hasEglise: true,
    policeResponse: 360,
  },
  {
    id: "saint_casimir",
    name: "Saint-Casimir",
    center: [-900, -280],
    population: 1400,
    roadAngle: 0.42,
    houseCount: 10,
    farmCount: 3,
    coreRadius: 68,
    description: "Gorge de la Sainte-Anne, marmites de géants, Trou du Diable.",
    motto: "Les marmites de géants",
    founded: 1847,
    type: "village",
    industry: "agriculture",
    secondaryIndustry: "tourisme",
    landmarks: ["marmites_geants", "trou_du_diable", "pont_de_fer"],
    churchStyle: "pierre_grise",
    churchScale: 0.95,
    terrain: "vallee",
    sugarShackCount: 4,
    hasCaisse: false,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 300,
  },
  {
    id: "saint_alban",
    name: "Saint-Alban",
    center: [-620, -530],
    population: 1200,
    roadAngle: 0.9,
    houseCount: 10,
    farmCount: 3,
    coreRadius: 70,
    description: "Le village en entonnoir, au pied de l'éboulis de 1894.",
    motto: "L'éboulis du 27 avril",
    founded: 1856,
    type: "village",
    industry: "agriculture",
    secondaryIndustry: "acericole",
    landmarks: ["eboulis"],
    churchStyle: "bois_blanc",
    churchScale: 0.9,
    terrain: "colline",
    sugarShackCount: 5,
    hasCaisse: false,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 480,
  },
  {
    id: "saint_marc",
    name: "Saint-Marc-des-Carrières",
    center: [-520, -280],
    population: 2800,
    roadAngle: 0.18,
    houseCount: 14,
    farmCount: 3,
    coreRadius: 78,
    description: "Le village des carrières de calcaire, au nord de la 363.",
    motto: "Pierre et poussière",
    founded: 1913,
    type: "village",
    industry: "carriere",
    secondaryIndustry: "agriculture",
    landmarks: ["carriere_calcaire"],
    churchStyle: "pierre_blanche",
    churchScale: 1.1,
    terrain: "plateau",
    sugarShackCount: 1,
    hasCaisse: true,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 240,
  },
  {
    id: "deschambault",
    name: "Deschambault-Grondines",
    center: [-500, 14],
    population: 1800,
    roadAngle: -0.04,
    houseCount: 12,
    farmCount: 4,
    coreRadius: 68,
    description: "Bord du fleuve, vieux moulin, terminus sud de la 363.",
    motto: "Face au Saint-Laurent",
    founded: 1713,
    type: "village",
    industry: "tourisme",
    secondaryIndustry: "agriculture",
    landmarks: ["moulin_eau", "moulin_vent", "rue_patrimoniale", "quai_fleuve"],
    churchStyle: "pierre_grise",
    churchScale: 1.25,
    terrain: "plaine_fleuve",
    sugarShackCount: 3,
    hasCaisse: false,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 240,
  },
  {
    id: "portneuf",
    name: "Portneuf",
    center: [X261, -20],
    population: 5200,
    roadAngle: 0,
    houseCount: 16,
    farmCount: 3,
    coreRadius: 100,
    description: "Chef-lieu du comté, sortie 261 de l'A-40. Marina et quai.",
    motto: "La porte du fleuve",
    founded: 1861,
    type: "ville",
    industry: "maritime",
    secondaryIndustry: "agriculture",
    landmarks: ["marina", "quai_fleuve"],
    churchStyle: "pierre_grise",
    churchScale: 1.15,
    terrain: "plaine_fleuve",
    sugarShackCount: 1,
    hasCaisse: true,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 150,
  },
  {
    id: "cap_sante",
    name: "Cap-Santé",
    center: [X269, 12],
    population: 3600,
    roadAngle: 0.02,
    houseCount: 10,
    farmCount: 2,
    coreRadius: 72,
    description: "Plus vieux village du comté, terminus ouest de la 358. Vieux Chemin du Roy.",
    motto: "Le Vieux Chemin du Roy",
    founded: 1679,
    type: "village",
    industry: "tourisme",
    secondaryIndustry: "agriculture",
    landmarks: ["rue_patrimoniale", "quai_fleuve"],
    churchStyle: "pierre_blanche",
    churchScale: 1.35,
    terrain: "plaine_fleuve",
    sugarShackCount: 2,
    hasCaisse: false,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 180,
  },
  {
    id: "saint_basile",
    name: "Saint-Basile",
    center: [420, -300],
    population: 2600,
    roadAngle: 0.2,
    houseCount: 8,
    farmCount: 2,
    coreRadius: 62,
    description: "Rang de la 358, entre Cap-Santé et Pont-Rouge.",
    motto: "Rivière Portneuf",
    founded: 1845,
    type: "village",
    industry: "agriculture",
    secondaryIndustry: "residentiel",
    landmarks: [],
    churchStyle: "pierre_grise",
    churchScale: 0.92,
    terrain: "vallee",
    sugarShackCount: 2,
    hasCaisse: false,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 240,
  },
  {
    id: "donnacona",
    name: "Donnacona",
    center: [X274, 12],
    population: 7500,
    roadAngle: 0.02,
    houseCount: 8,
    farmCount: 2,
    coreRadius: 80,
    description: "Ancienne ville papetière, sortie 274.",
    motto: "Au fil du Saint-Laurent",
    founded: 1915,
    type: "ville",
    industry: "papeterie",
    secondaryIndustry: "urbain",
    landmarks: ["usine_papier", "quai_fleuve"],
    churchStyle: "brique_rouge",
    churchScale: 1.05,
    terrain: "plaine_fleuve",
    sugarShackCount: 0,
    hasCaisse: true,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 120,
  },
  {
    id: "neuville",
    name: "Neuville",
    center: [X281, 14],
    population: 4600,
    roadAngle: 0.02,
    houseCount: 10,
    farmCount: 2,
    coreRadius: 74,
    description: "Terminus sud de la 365, vers Pont-Rouge et Saint-Raymond.",
    motto: "Pointe aux Écureuils",
    founded: 1684,
    type: "village",
    industry: "tourisme",
    secondaryIndustry: "agriculture",
    landmarks: ["rue_patrimoniale", "quai_fleuve"],
    churchStyle: "pierre_blanche",
    churchScale: 1.2,
    terrain: "plaine_fleuve",
    sugarShackCount: 1,
    hasCaisse: true,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 150,
  },
  {
    id: "pont_rouge",
    name: "Pont-Rouge",
    center: [1120, -340],
    population: 9400,
    roadAngle: 1.52,
    houseCount: 6,
    farmCount: 2,
    coreRadius: 130,
    description: "Grille urbaine sur la 365, au nord de la sortie 281. Jacques-Cartier.",
    motto: "Sur la Jacques-Cartier",
    founded: 1867,
    type: "ville",
    industry: "residentiel",
    secondaryIndustry: "foresterie",
    landmarks: ["barrage", "pont_couvert"],
    churchStyle: "brique_rouge",
    churchScale: 1.05,
    terrain: "vallee",
    sugarShackCount: 1,
    hasCaisse: true,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 120,
  },
  {
    id: "saint_raymond",
    name: "Saint-Raymond",
    center: [980, -650],
    population: 10800,
    roadAngle: -0.48,
    houseCount: 16,
    farmCount: 3,
    coreRadius: 92,
    description: "Porte des Laurentides, au bout de la 365.",
    motto: "Porte des Laurentides",
    founded: 1844,
    type: "ville",
    industry: "foresterie",
    secondaryIndustry: "tourisme",
    landmarks: [],
    churchStyle: "pierre_grise",
    churchScale: 1.1,
    terrain: "colline",
    sugarShackCount: 2,
    hasCaisse: true,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 180,
  },
];

function wobbleLine(x0: number, z0: number, x1: number, z1: number, steps: number, amp: number, seed: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = Math.sin(t * Math.PI * 2.4 + seed) * amp * Math.sin(t * Math.PI);
    pts.push([x0 + dx * t + nx * u, z0 + dz * t + nz * u]);
  }
  return pts;
}

function approach(x: number, z0: number, z1: number): Array<[number, number]> {
  const zs = [...new Set([z0, -122, A40_Z, -234, z1])].sort((a, b) => b - a);
  return zs.map((z) => [x, z] as [number, number]);
}

function rampsForExit(e: A40Exit): RoadDef[] {
  const t = e.x;
  const ramp = (id: string, name: string, points: Array<[number, number]>): RoadDef => ({
    id,
    name,
    kind: "ramp",
    speed: 40,
    width: 6.4,
    surface: "asphalt",
    traffic: 0,
    exit: e.no,
    points,
  });
  return [
    ramp(`a40_${e.no}_e_off`, `A-40 sortie ${e.no} est`, [
      [t - 130, -169.4],
      [t - 88, -163.4],
      [t - 48, -148],
      [t - 18, -130],
      [t - 8, -122],
    ]),
    ramp(`a40_${e.no}_e_on`, `A-40 entrée ${e.no} est`, [
      [t + 8, -122],
      [t + 18, -130],
      [t + 48, -148],
      [t + 88, -163.4],
      [t + 130, -169.4],
    ]),
    ramp(`a40_${e.no}_w_off`, `A-40 sortie ${e.no} ouest`, [
      [t + 130, -186.6],
      [t + 88, -192.6],
      [t + 48, -208],
      [t + 18, -226],
      [t + 8, -234],
    ]),
    ramp(`a40_${e.no}_w_on`, `A-40 entrée ${e.no} ouest`, [
      [t - 8, -234],
      [t - 18, -226],
      [t - 48, -208],
      [t - 88, -192.6],
      [t - 130, -186.6],
    ]),
  ];
}

export interface CityGridSpec {
  id: string;
  name: string;
  center: [number, number];
  gridSize: number;
  blockSize: number;
  streetWidth: number;
  density: number;
  seed: number;
}

export const CITY_ARTERY_MUL = 1.25;
export const CITY_SIDEWALK_W = 2.4;
export const CITY_FRONT_YARD = 4.2;

export function cityPitch(g: Pick<CityGridSpec, "blockSize" | "streetWidth">) {
  return g.blockSize + g.streetWidth;
}

export function cityStreetHalf(g: Pick<CityGridSpec, "gridSize" | "streetWidth">, i: number) {
  const artery = i === Math.floor(g.gridSize / 2);
  return (artery ? g.streetWidth * CITY_ARTERY_MUL : g.streetWidth) / 2;
}

/** Aligne une rue du damier sur une route régionale (la chaussée passe ENTRE les lots). */
function cityAlign(g: CityGridSpec, nsX?: number, ewZ?: number, nsI?: number, ewI?: number): CityGridSpec {
  const pitch = cityPitch(g);
  const total = g.gridSize * pitch;
  const mid = Math.floor(g.gridSize / 2);
  const iNs = nsI ?? mid;
  const iEw = ewI ?? mid;
  let [cx, cz] = g.center;
  if (nsX != null) cx = nsX - (-total / 2 + iNs * pitch);
  if (ewZ != null) cz = ewZ - (-total / 2 + iEw * pitch);
  return { ...g, center: [cx, cz] };
}

export interface CityLotLocal {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cx: number;
  cz: number;
  w: number;
  d: number;
}

export function cityLotLocal(g: Pick<CityGridSpec, "gridSize" | "blockSize" | "streetWidth">, col: number, row: number): CityLotLocal {
  const pitch = cityPitch(g);
  const padL = cityStreetHalf(g, col) + CITY_SIDEWALK_W + CITY_FRONT_YARD;
  const padR = cityStreetHalf(g, col + 1) + CITY_SIDEWALK_W + CITY_FRONT_YARD;
  const padN = cityStreetHalf(g, row) + CITY_SIDEWALK_W + CITY_FRONT_YARD;
  const padS = cityStreetHalf(g, row + 1) + CITY_SIDEWALK_W + CITY_FRONT_YARD;
  const x0 = col * pitch + padL;
  const x1 = (col + 1) * pitch - padR;
  const z0 = row * pitch + padN;
  const z1 = (row + 1) * pitch - padS;
  const w = Math.max(6, x1 - x0);
  const d = Math.max(6, z1 - z0);
  return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w, d };
}

export function cityToWorld(
  g: Pick<CityGridSpec, "center" | "gridSize" | "blockSize" | "streetWidth">,
  lx: number,
  lz: number,
  angle = 0,
) {
  const total = g.gridSize * cityPitch(g);
  const shift = -total / 2;
  const [cx, cz] = g.center;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = cx + (lx + shift) * cos - (lz + shift) * sin;
  const z = cz + (lx + shift) * sin + (lz + shift) * cos;
  return { x, z, y: getTerrainHeight(x, z) };
}

export function citySpecialLots(g: CityGridSpec) {
  const n = g.gridSize;
  const mid = Math.floor(n / 2);
  return {
    park: { col: mid, row: mid },
    hotel: { col: Math.min(n - 1, mid + 1), row: mid },
    tower: { col: mid, row: Math.max(0, mid - 1) },
    church: { col: Math.max(0, mid - 1), row: mid },
    hotelVille: { col: Math.min(n - 1, mid + 1), row: Math.max(0, mid - 1) },
    depanneur: { col: mid, row: 0 },
    ecole: { col: 0, row: n - 1 },
    caisse: { col: 0, row: mid },
    cemetery: { col: Math.max(0, mid - 1), row: Math.min(n - 1, mid + 1) },
  };
}

export const CITY_GRIDS: CityGridSpec[] = [
  cityAlign({ id: "pontrouge", name: "Pont-Rouge", center: [1120, -340], gridSize: 5, blockSize: 30, streetWidth: 9.5, density: 1.05, seed: 9400 }, 1120, -340),
  cityAlign({ id: "portneuf", name: "Portneuf", center: [X261, -20], gridSize: 3, blockSize: 28, streetWidth: 9, density: 0.95, seed: 5200 }, X261, ROAD_138_Z, undefined, 3),
  cityAlign({ id: "st_raymond", name: "Saint-Raymond", center: [980, -650], gridSize: 3, blockSize: 28, streetWidth: 9, density: 0.9, seed: 10800 }, 980),
  cityAlign({ id: "donnacona", name: "Donnacona", center: [X274, 12], gridSize: 3, blockSize: 26, streetWidth: 8.5, density: 0.88, seed: 7500 }, X274, 4),
];

export function isCityVillage(name: string) {
  return CITY_GRIDS.some((g) => g.name === name);
}

/** 2e Rang seigneurial, parallèle au Chemin du Roy, entre le village et l'A-40. */
export const RANG_2E_Z = -70;

/** Rangs N-S : chaussée à `x`, ferme à l'est du rang, cour sur le 2e Rang. */
export const RIVER_RANGS: Array<{
  farmId: string;
  name: string;
  village: string;
  x: number;
}> = [
  { farmId: "rang_grondines_ouest", name: "Rang du Chemin du Roy", village: "Grondines", x: -1000 },
  { farmId: "rang_grondines_est", name: "Rang Sainte-Anne", village: "Grondines", x: -700 },
  { farmId: "rang_deschambault_ouest", name: "Rang des Pins", village: "Deschambault-Grondines", x: -580 },
  { farmId: "rang_deschambault_est", name: "Côte de la Traverse", village: "Deschambault-Grondines", x: -410 },
  { farmId: "rang_portneuf_ouest", name: "Rang de la Pointe", village: "Portneuf", x: -250 },
  { farmId: "rang_capsante_ouest", name: "Rang Saint-Joseph", village: "Cap-Santé", x: 220 },
  { farmId: "rang_capsante_est", name: "Rang du Vieux Chemin", village: "Cap-Santé", x: 500 },
  { farmId: "rang_neuville_ouest", name: "Côte des Écureuils", village: "Neuville", x: 940 },
];

export const ROAD_JUNCTIONS: Array<{ x: number; z: number; size: number }> = [];

function overlaysStaticRoad(points: Array<[number, number]>, width: number): boolean {
  const a = points[0];
  const b = points[points.length - 1];
  if (!a || !b) return false;
  const samples: Array<[number, number]> = [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b];
  let hits = 0;
  for (const p of samples) {
    for (const r of ROADS_STATIC) {
      const h = closestOnPolyline(p[0], p[1], r.points);
      if (h.dist < Math.max(2.4, Math.min(r.width, width) * 0.42)) {
        hits++;
        break;
      }
    }
  }
  return hits >= 2;
}

/** Route régionale sous un point (pour caler trottoirs / pads sur la vraie largeur). */
export function overlayRoadAt(x: number, z: number): RoadDef | null {
  let best: RoadDef | null = null;
  let bestD = Infinity;
  for (const r of ROADS_STATIC) {
    const h = closestOnPolyline(x, z, r.points);
    const need = Math.max(2.2, r.width * 0.5);
    if (h.dist < need && h.dist < bestD) {
      best = r;
      bestD = h.dist;
    }
  }
  return best;
}

function cityGridRoads(g: CityGridSpec): RoadDef[] {
  const n = g.gridSize;
  const pitch = cityPitch(g);
  const total = n * pitch;
  const shift = -total / 2;
  const [cx, cz] = g.center;
  const mid = Math.floor(n / 2);
  const out: RoadDef[] = [];
  for (let i = 0; i <= n; i++) {
    const artery = i === mid;
    const width = artery ? g.streetWidth * CITY_ARTERY_MUL : g.streetWidth;
    const along = shift + i * pitch;
    const ns: RoadDef = {
      id: `${g.id}_ns_${i}`,
      name:
        g.id === "portneuf" && artery
          ? "Rue de la Station — Portneuf"
          : artery
            ? `Rue Principale — ${g.name}`
            : `Rue ${i + 1} N-S — ${g.name}`,
      kind: "village",
      speed: 50,
      width,
      surface: "asphalt",
      village: g.name,
      traffic: artery ? 2 : 0,
      points: [
        [cx + along, cz + shift - g.streetWidth],
        [cx + along, cz + shift + total + g.streetWidth],
      ],
    };
    const ew: RoadDef = {
      id: `${g.id}_ew_${i}`,
      name:
        g.id === "portneuf" && artery
          ? "Rue Saint-Charles — Portneuf"
          : artery
            ? `Boulevard — ${g.name}`
            : `Rue ${i + 1} E-O — ${g.name}`,
      kind: "village",
      speed: 50,
      width,
      surface: "asphalt",
      village: g.name,
      traffic: artery ? 2 : 0,
      points: [
        [cx + shift - g.streetWidth, cz + along],
        [cx + shift + total + g.streetWidth, cz + along],
      ],
    };
    if (!overlaysStaticRoad(ns.points, width)) out.push(ns);
    if (!overlaysStaticRoad(ew.points, width)) out.push(ew);
  }
  return out;
}

function villageStreetRoads(): RoadDef[] {
  const city = new Set(CITY_GRIDS.map((g) => g.name));
  const out: RoadDef[] = [];
  const junc: Array<{ x: number; z: number; size: number }> = [];
  const r138 = ROADS_STATIC.find((r) => r.id === "r138");
  const z138At = (x: number) => (r138 ? closestOnPolyline(x, ROAD_138_Z, r138.points).z : ROAD_138_Z);
  const addJ = (x: number, z: number, size: number) => {
    junc.push({ x, z, size });
  };
  const nsTaken = (x: number) => {
    for (const r of ROADS_STATIC) {
      if (r.kind === "highway" || r.kind === "ramp") continue;
      const h = closestOnPolyline(x, RANG_2E_Z, r.points);
      if (h.dist < 22) return true;
    }
    return false;
  };

  out.push({
    id: "rang2e_ouest",
    name: "2e Rang — Grondines / Deschambault",
    kind: "rural",
    speed: 70,
    width: 6.2,
    surface: "asphalt",
    traffic: 1,
    points: [
      [-1080, RANG_2E_Z],
      [-780, RANG_2E_Z],
      [-500, RANG_2E_Z],
      [-210, RANG_2E_Z],
    ],
  });
  out.push({
    id: "rang2e_est",
    name: "2e Rang — Cap-Santé / Neuville",
    kind: "rural",
    speed: 70,
    width: 6.2,
    surface: "asphalt",
    traffic: 1,
    points: [
      [40, RANG_2E_Z],
      [360, RANG_2E_Z],
      [700, RANG_2E_Z],
      [1020, RANG_2E_Z],
    ],
  });

  for (const rang of RIVER_RANGS) {
    if (nsTaken(rang.x)) continue;
    const z0 = z138At(rang.x);
    out.push({
      id: `rangns_${rang.farmId}`,
      name: rang.name,
      kind: "rural",
      speed: 50,
      width: 5.6,
      surface: "asphalt",
      village: rang.village,
      traffic: 0,
      points: [
        [rang.x, z0],
        [rang.x, (z0 + RANG_2E_Z) / 2],
        [rang.x, RANG_2E_Z],
      ],
    });
    addJ(rang.x, z0, 11.5);
    addJ(rang.x, RANG_2E_Z, 10.5);
  }

  for (const x of [-780, -540, -360, 360, 660, 1080]) {
    addJ(x, RANG_2E_Z, 11);
    addJ(x, z138At(x), 12);
  }

  for (const v of VILLAGES) {
    if (city.has(v.name)) continue;
    const [cx, cz] = v.center;
    const dirX = Math.cos(v.roadAngle);
    const dirZ = Math.sin(v.roadAngle);
    const px = -dirZ;
    const pz = dirX;
    const river = v.terrain === "plaine_fleuve" || Math.abs(cz - ROAD_138_Z) < 50;
    if (river) {
      const z0 = z138At(cx);
      const streetZ = z0 - 30;
      const half = Math.max(62, v.coreRadius * 1.2);
      out.push({
        id: `rue_${v.id}`,
        name: `Rue Principale — ${v.name}`,
        kind: "village",
        speed: 50,
        width: 6.4,
        surface: "asphalt",
        village: v.name,
        traffic: 1,
        points: [
          [cx - half, streetZ],
          [cx, streetZ],
          [cx + half, streetZ],
        ],
      });
      addJ(cx, streetZ, 11);
      let spine = false;
      for (const r of ROADS_STATIC) {
        if (r.kind === "highway" || r.kind === "ramp") continue;
        if (closestOnPolyline(cx, streetZ, r.points).dist < 10) {
          spine = true;
          break;
        }
      }
      if (!spine) {
        out.push({
          id: `lien_${v.id}`,
          name: `Côte — ${v.name}`,
          kind: "village",
          speed: 50,
          width: 6,
          surface: "asphalt",
          village: v.name,
          traffic: 0,
          points: [
            [cx, z0],
            [cx, streetZ],
            [cx, RANG_2E_Z],
          ],
        });
        addJ(cx, z0, 12);
        addJ(cx, RANG_2E_Z, 10.5);
      }
    } else {
      const hasMain = ROADS_STATIC.some((r) => r.village === v.name);
      const len = v.coreRadius * 1.55;
      if (!hasMain) {
        out.push({
          id: `rue_${v.id}`,
          name: `Rue Principale — ${v.name}`,
          kind: "village",
          speed: 50,
          width: 6.6,
          surface: "asphalt",
          village: v.name,
          traffic: 1,
          points: [
            [cx - dirX * len, cz - dirZ * len],
            [cx, cz],
            [cx + dirX * len, cz + dirZ * len],
          ],
        });
      }
      const inland = pz > 0 ? -1 : 1;
      const fl = Math.max(48, v.coreRadius * 0.95);
      out.push({
        id: `rang_${v.id}`,
        name: `Rang — ${v.name}`,
        kind: "village",
        speed: 50,
        width: 5.8,
        surface: "asphalt",
        village: v.name,
        traffic: 0,
        points: [
          [cx, cz],
          [cx + px * inland * fl * 0.45, cz + pz * inland * fl * 0.45],
          [cx + px * inland * fl, cz + pz * inland * fl],
        ],
      });
      addJ(cx, cz, 11);
    }
  }

  ROAD_JUNCTIONS.length = 0;
  ROAD_JUNCTIONS.push(...junc);
  return out;
}

const ROADS_STATIC: RoadDef[] = [
    {
      id: "r_prison_donnacona",
      name: "Chemin du Pénitencier — Donnacona",
      kind: "rural",
      speed: 70,
      width: 7.2,
      surface: "asphalt",
      village: "Donnacona",
      points: [
        [a40X(274), 4],
        [a40X(274) - 20, -60],
        [a40X(274) - 50, -178],
        [a40X(274) - 90, -320],
        [a40X(274) - 120, -460],
        [a40X(274) - 140, -530],
        [a40X(274) - 140, -580],
      ],
    },
  {
    id: "r138",
    name: "Route 138 — Chemin du Roy",
    kind: "regional",
    speed: 90,
    width: 8.4,
    surface: "asphalt",
    points: [
      [-1320, 12],
      [X250, 10],
      [X254, 6],
      [X257, 5],
      [X261 - 80, 4],
      [X261, 4],
      [X261 + 80, 4],
      [X269, 5],
      [X274, 4],
      [X281, 7],
      [X285, 9],
      [1420, 10],
    ],
  },
  {
    id: "a40",
    name: "Autoroute 40 — Félix-Leclerc",
    kind: "highway",
    speed: 100,
    width: 16.5,
    surface: "asphalt",
    traffic: 10,
    points: [
      [-1320, A40_Z],
      [X250, A40_Z],
      [X254, A40_Z],
      [X257, A40_Z],
      [X261, A40_Z],
      [X269, A40_Z],
      [X274, A40_Z],
      [X281, A40_Z],
      [X285, A40_Z],
      [1420, A40_Z],
    ],
  },
  {
    id: "r363",
    name: "Route 363 — Dussault",
    kind: "rural",
    speed: 80,
    width: 7.2,
    surface: "asphalt",
    village: "Saint-Marc-des-Carrières",
    points: [
      [-500, 4],
      [X254, -122],
      [X254, A40_Z],
      [X254, -234],
      [-520, -280],
      [-580, -420],
      [-620, -530],
    ],
  },
  {
    id: "r365",
    name: "Route 365 — Pont-Rouge / Saint-Raymond",
    kind: "rural",
    speed: 80,
    width: 7.4,
    surface: "asphalt",
    village: "Pont-Rouge",
    points: [
      [X281, 4],
      [X281, -122],
      [X281, A40_Z],
      [X281, -234],
      [1120, -240],
      [1120, -340],
      [1060, -480],
      [980, -650],
    ],
  },
  {
    id: "r358",
    name: "Route 358 — Cap-Santé / Saint-Basile",
    kind: "rural",
    speed: 80,
    width: 7,
    surface: "asphalt",
    village: "Cap-Santé",
    points: [
      [X269, 4],
      [X269, -122],
      [X269, A40_Z],
      [X269, -234],
      [420, -300],
      [720, -320],
      [1120, -340],
    ],
  },
  {
    id: "r354",
    name: "Route 354 — Gorge Sainte-Anne",
    kind: "rural",
    speed: 70,
    width: 6.6,
    surface: "asphalt",
    village: "Saint-Casimir",
    points: [
      [-900, -280],
      [-860, -220],
      [-820, -160],
    ],
  },
  {
    id: "ch_casimir",
    name: "Chemin de Saint-Casimir",
    kind: "rural",
    speed: 70,
    width: 6.8,
    surface: "asphalt",
    village: "Saint-Casimir",
    points: [
      [X250, 4],
      [X250, -122],
      [X250, A40_Z],
      [X250, -234],
      [-840, -180],
      [-900, -280],
    ],
  },
  { id: "proulx", name: "Route Proulx — Saint-Gilbert", kind: "rural", speed: 70, width: 6.4, surface: "asphalt", village: "Deschambault-Grondines", points: approach(X257, 4, -90) },
  {
    id: "r_portneuf",
    name: "Route de Portneuf — sortie 261",
    kind: "village",
    speed: 50,
    width: 8.4,
    surface: "asphalt",
    village: "Portneuf",
    traffic: 3,
    points: [
      [X261, ROAD_138_Z],
      [X261, -70],
      [X261, -122],
      [X261, A40_Z],
      [X261, -234],
    ],
  },
  { id: "rang_donnacona", name: "2e Rang — Donnacona", kind: "village", speed: 50, width: 7.2, surface: "asphalt", village: "Donnacona", points: approach(X274, 4, -88) },
  { id: "r_gravel", name: "Route Gravel — Neuville", kind: "village", speed: 50, width: 6.6, surface: "asphalt", village: "Neuville", points: approach(X285, 4, -80) },
  {
    id: "lacs",
    name: "Route des Lacs",
    kind: "gravel",
    speed: 50,
    width: 5.4,
    surface: "gravel",
    village: "Saint-Alban",
    traffic: 2,
    points: [
      [-620, -530],
      [-580, -620],
      [-540, -700],
      [-520, -760],
    ],
  },
  {
    id: "rang_marc",
    name: "Rang de la Carrière",
    kind: "gravel",
    speed: 50,
    width: 5.5,
    surface: "gravel",
    village: "Saint-Marc-des-Carrières",
    traffic: 1,
    points: [
      [-520, -280],
      [-500, -220],
      [-480, -200],
    ],
  },
  {
    id: "quai",
    name: "Chemin du Quai",
    kind: "village",
    speed: 50,
    width: 6.2,
    surface: "asphalt",
    village: "Deschambault-Grondines",
    traffic: 1,
    points: [
      [-500, 18],
      [-480, 48],
      [-460, 72],
    ],
  },
  {
    id: "quai_portneuf",
    name: "Chemin du Quai — Portneuf",
    kind: "village",
    speed: 50,
    width: 6.4,
    surface: "asphalt",
    village: "Portneuf",
    traffic: 1,
    points: [
      [X261 - 88, 28],
      [X261 - 36, 50],
      [X261, 54],
      [X261 + 42, 58],
      [X261 + 22, 74],
    ],
  },
  {
    id: "portneuf_quai_ns",
    name: "Avenue du Quai — Portneuf",
    kind: "village",
    speed: 50,
    width: 7.2,
    surface: "asphalt",
    village: "Portneuf",
    traffic: 1,
    points: [
      [X261, ROAD_138_Z],
      [X261, 28],
      [X261, 54],
      [X261, 76],
    ],
  },
  {
    id: "pont_ns",
    name: "Avenue du Pont",
    kind: "village",
    speed: 50,
    width: 8,
    surface: "asphalt",
    village: "Pont-Rouge",
    traffic: 3,
    points: [
      [1120, -420],
      [1120, -340],
      [1120, -260],
    ],
  },
  {
    id: "rue_alban",
    name: "Rue Principale — Saint-Alban",
    kind: "village",
    speed: 50,
    width: 6.4,
    surface: "asphalt",
    village: "Saint-Alban",
    traffic: 2,
    points: wobbleLine(-688, -510, -552, -550, 7, 5, 3.1),
  },
  ...A40_EXITS.flatMap(rampsForExit),
];

export const ROADS: RoadDef[] = [...ROADS_STATIC, ...CITY_GRIDS.flatMap(cityGridRoads), ...villageStreetRoads()];

export const POIS: PoiDef[] = [
  { id: "casimir_marmites", name: "Marmites de géants", type: "site_geologique", x: -820, z: -160, radius: 36, description: "Cuves circulaires polies par les tourbillons glaciaires." },
  { id: "casimir_trou", name: "Le Trou du Diable", type: "grotte", x: -860, z: -210, radius: 24, description: "Entrée du réseau de grottes de Saint-Casimir." },
  { id: "casimir_pont", name: "Pont de fer", type: "pont_fer", x: -890, z: -180, radius: 22, description: "Pont à treillis d'acier sur la rivière Sainte-Anne." },
  { id: "alban_eboulis", name: "Éboulis du 27 avril 1894", type: "site_geologique", x: -620, z: -580, radius: 70, description: "Plus de six kilomètres carrés de sol déplacés en une journée." },
  { id: "alban_plage", name: "Plage du lac Carillon", type: "plage", x: -520, z: -760, radius: 80, description: "Sable naturel, eau claire, rabaskas et kayaks." },
  { id: "alban_grotte", name: "Grotte de la Coulée", type: "grotte", x: -600, z: -550, radius: 20, description: "Réseau creusé dans les escarpements de l'éboulis." },
  { id: "marc_carriere", name: "Carrière de Saint-Marc", type: "industrie", x: -480, z: -200, radius: 40, description: "Fosse calcaire, dumpers et poussière blanche." },
  { id: "desch_moulin", name: "Moulin de Deschambault", type: "moulin", x: -460, z: 72, radius: 22, description: "Vieux moulin face au fleuve." },
  { id: "portneuf_hotel", name: "Hôtel de ville de Portneuf", type: "institution", x: X261, z: ROAD_138_Z, radius: 24, description: "Le cœur administratif du comté, au croisement de la 138 et de la sortie 261." },
  { id: "portneuf_marina", name: "Marina de Portneuf", type: "marina", x: X261, z: 74, radius: 28, description: "Quai municipal, hangar et bateaux de pêche sur le Saint-Laurent." },
  { id: "pont_parc", name: "Parc central de Pont-Rouge", type: "park", x: 1120, z: -340, radius: 30, description: "Kiosque, allées et bancs sous les érables." },
  { id: "pont_cimetiere", name: "Cimetière de Pont-Rouge", type: "cimetiere", x: 1090, z: -372, radius: 24, description: "Cimetière paroissial, stèles de granite et cèdres." },
  { id: "portneuf_cimetiere", name: "Cimetière de Portneuf", type: "cimetiere", x: X261 - 48, z: -20, radius: 22, description: "Cimetière du chef-lieu, à l'ouest de la grille." },
  { id: "alban_cimetiere", name: "Cimetière de Saint-Alban", type: "cimetiere", x: -620, z: -500, radius: 22, description: "Cimetière paroissial au pied de l'éboulis." },
  { id: "casimir_cimetiere", name: "Cimetière de Saint-Casimir", type: "cimetiere", x: -900, z: -250, radius: 22, description: "Stèles face à la gorge de la Sainte-Anne." },
  { id: "desch_cimetiere", name: "Cimetière de Deschambault", type: "cimetiere", x: -500, z: 40, radius: 20, description: "Cimetière du fleuve, clôture de fer." },
  { id: "grondines_parc", name: "Parc de Grondines", type: "park", x: X250, z: 28, radius: 18, description: "Carré vert le long du Chemin du Roy." },
  { id: "pont_hotel", name: "Hôtel Pont-Rouge", type: "hotel", x: 1164, z: -340, radius: 22, description: "Descendez du pick-up et entrez par la marquise." },
  { id: "pont_tour", name: "Tour résidentielle", type: "apartment", x: 1120, z: -308, radius: 20, description: "Immeuble avec penthouse. Un 4½ se visite." },
  { id: "raymond_centre", name: "Saint-Raymond", type: "village", x: 980, z: -650, radius: 40, description: "Porte des Laurentides, bout de la 365." },
  { id: "alban_centre", name: "Saint-Alban", type: "village", x: -620, z: -530, radius: 36, description: "Le village en entonnoir, au pied de l'éboulis." },
  { id: "casimir_centre", name: "Saint-Casimir", type: "village", x: -900, z: -280, radius: 36, description: "Gorge, marmites de géants et Trou du Diable." },
  { id: "marc_centre", name: "Saint-Marc-des-Carrières", type: "village", x: -520, z: -280, radius: 36, description: "Carrières de calcaire, route 363." },
  { id: "desch_centre", name: "Deschambault-Grondines", type: "village", x: -500, z: 14, radius: 34, description: "Bord du fleuve, terminus sud de la 363." },
  { id: "grondines_centre", name: "Grondines", type: "village", x: X250, z: 12, radius: 30, description: "Chemin du Roy, sortie 250 vers Saint-Casimir." },
  { id: "saint_basile_centre", name: "Saint-Basile", type: "village", x: 420, z: -300, radius: 30, description: "Route 358, entre Cap-Santé et Pont-Rouge." },
  { id: "cap_sante_centre", name: "Cap-Santé", type: "village", x: X269, z: 12, radius: 32, description: "Plus vieux village, route 358, sortie 269." },
  { id: "donnacona_centre", name: "Donnacona", type: "village", x: X274, z: 12, radius: 34, description: "Sortie 274, 2e Rang vers l'A-40." },
  { id: "donnacona_papeterie", name: "Papeterie de Donnacona", type: "usine", x: PAPETERIE.x, z: PAPETERIE.z, radius: 48, description: "Ancienne usine à papier sur le Saint-Laurent. Quart, rouleaux, quai de chargement." },
  { id: "donnacona_prison", name: "Établissement de Donnacona", type: "institution", x: PRISON.x, z: PRISON.z, radius: 65, description: "Pénitencier fédéral à sécurité maximale isolé en forêt. Blocs A–D, cour grillagée, miradors et barbelés." },
  { id: "neuville_centre", name: "Neuville", type: "village", x: X281, z: 14, radius: 34, description: "Terminus sud de la 365, sortie 281." },
  { id: "faune_laurentides", name: "Orignaux des Laurentides", type: "faune", x: 200, z: -700, radius: 48, description: "Orignaux, loups, ours noir, renards et castors — permis MFFP obligatoire." },
  { id: "portneuf_sq", name: "Poste SQ Portneuf", type: "institution", x: SQ_JAIL.x, z: SQ_JAIL.z, radius: 22, description: "Sûreté du Québec — cellules, constats CSR et relâchement après arrestation." },
  ...A40_EXITS.map((e) => ({
    id: `a40_${e.no}`,
    name: `A-40 sortie ${e.no} — ${e.title}`,
    type: "echangeur",
    x: e.x,
    z: A40_Z,
    radius: 36,
    description: `Bretelles d'entrée et de sortie. ${e.dest}.`,
  })),
];

export const LAKES = [
  { name: "Lac Carillon", x: -520, z: -760, r: 78 },
  { name: "Lac Blanc", x: -360, z: -770, r: 52 },
  { name: "Lac Long", x: -700, z: -780, r: 64 },
];

export interface SurfaceSample {
  key: string;
  name: string;
  traction: number;
  lateralGrip: number;
  rolling: number;
  slipThreshold: number;
  gripRecovery: number;
  bumpiness: number;
  walkMul: number;
  particle: "none" | "dust" | "sand" | "snow" | "spray";
  particleColor: string;
  particleRate: number;
  leavesTracks: boolean;
  trackOpacity: number;
  tireSound: string;
  footstepSound: string;
  heavyPenalty: number;
}

export const SURFACES: Record<string, SurfaceSample> = {
  asphalt: {
    key: "asphalt",
    name: "Asphalte",
    traction: 1,
    lateralGrip: 1,
    rolling: 0.013,
    slipThreshold: 95,
    gripRecovery: 3.2,
    bumpiness: 0.04,
    walkMul: 1,
    particle: "none",
    particleColor: "#8a7a62",
    particleRate: 0,
    leavesTracks: false,
    trackOpacity: 0.2,
    tireSound: "tire_asphalt",
    footstepSound: "step_concrete",
    heavyPenalty: 1,
  },
  village: {
    key: "village",
    name: "Rue de village",
    traction: 0.96,
    lateralGrip: 0.92,
    rolling: 0.018,
    slipThreshold: 70,
    gripRecovery: 2.8,
    bumpiness: 0.08,
    walkMul: 1,
    particle: "none",
    particleColor: "#8a7a62",
    particleRate: 0,
    leavesTracks: false,
    trackOpacity: 0.25,
    tireSound: "tire_asphalt",
    footstepSound: "step_concrete",
    heavyPenalty: 1.02,
  },
  gravel: {
    key: "gravel",
    name: "Gravelle",
    traction: 0.72,
    lateralGrip: 0.48,
    rolling: 0.04,
    slipThreshold: 42,
    gripRecovery: 2.1,
    bumpiness: 0.28,
    walkMul: 0.9,
    particle: "dust",
    particleColor: "#c4b090",
    particleRate: 8,
    leavesTracks: true,
    trackOpacity: 0.45,
    tireSound: "tire_gravel",
    footstepSound: "step_gravel",
    heavyPenalty: 1.15,
  },
  dirt: {
    key: "dirt",
    name: "Rang de terre",
    traction: 0.58,
    lateralGrip: 0.52,
    rolling: 0.055,
    slipThreshold: 38,
    gripRecovery: 1.8,
    bumpiness: 0.32,
    walkMul: 0.82,
    particle: "dust",
    particleColor: "#8a7a62",
    particleRate: 10,
    leavesTracks: true,
    trackOpacity: 0.55,
    tireSound: "tire_dirt",
    footstepSound: "step_dirt",
    heavyPenalty: 1.22,
  },
  sand: {
    key: "sand",
    name: "Sable",
    traction: 0.42,
    lateralGrip: 0.62,
    rolling: 0.1,
    slipThreshold: 30,
    gripRecovery: 1.4,
    bumpiness: 0.18,
    walkMul: 0.55,
    particle: "sand",
    particleColor: "#d4c4a0",
    particleRate: 12,
    leavesTracks: true,
    trackOpacity: 0.6,
    tireSound: "tire_sand",
    footstepSound: "step_sand",
    heavyPenalty: 1.45,
  },
  grass: {
    key: "grass",
    name: "Prairie",
    traction: 0.62,
    lateralGrip: 0.7,
    rolling: 0.045,
    slipThreshold: 50,
    gripRecovery: 2.4,
    bumpiness: 0.16,
    walkMul: 0.85,
    particle: "dust",
    particleColor: "#6a7a52",
    particleRate: 4,
    leavesTracks: true,
    trackOpacity: 0.35,
    tireSound: "tire_grass",
    footstepSound: "step_grass",
    heavyPenalty: 1.18,
  },
  clay: {
    key: "clay",
    name: "Argile de l'éboulis",
    traction: 0.38,
    lateralGrip: 0.4,
    rolling: 0.08,
    slipThreshold: 28,
    gripRecovery: 1.3,
    bumpiness: 0.35,
    walkMul: 0.5,
    particle: "dust",
    particleColor: "#8a6a52",
    particleRate: 9,
    leavesTracks: true,
    trackOpacity: 0.65,
    tireSound: "tire_dirt",
    footstepSound: "step_dirt",
    heavyPenalty: 1.5,
  },
  forest: {
    key: "forest",
    name: "Sentier forestier",
    traction: 0.52,
    lateralGrip: 0.55,
    rolling: 0.06,
    slipThreshold: 36,
    gripRecovery: 1.9,
    bumpiness: 0.42,
    walkMul: 0.72,
    particle: "dust",
    particleColor: "#5a4a38",
    particleRate: 6,
    leavesTracks: true,
    trackOpacity: 0.4,
    tireSound: "tire_dirt",
    footstepSound: "step_leaves",
    heavyPenalty: 1.35,
  },
  parking: {
    key: "parking",
    name: "Béton",
    traction: 0.94,
    lateralGrip: 0.96,
    rolling: 0.016,
    slipThreshold: 80,
    gripRecovery: 3,
    bumpiness: 0.06,
    walkMul: 1,
    particle: "none",
    particleColor: "#8a8a88",
    particleRate: 0,
    leavesTracks: false,
    trackOpacity: 0.15,
    tireSound: "tire_asphalt",
    footstepSound: "step_concrete",
    heavyPenalty: 1.04,
  },
  water: {
    key: "water",
    name: "Eau",
    traction: 0.18,
    lateralGrip: 0.22,
    rolling: 0.16,
    slipThreshold: 12,
    gripRecovery: 0.8,
    bumpiness: 0.5,
    walkMul: 0.28,
    particle: "spray",
    particleColor: "#a8c4d4",
    particleRate: 14,
    leavesTracks: false,
    trackOpacity: 0.1,
    tireSound: "tire_water",
    footstepSound: "step_water",
    heavyPenalty: 1.8,
  },
  ice: {
    key: "ice",
    name: "Verglas",
    traction: 0.28,
    lateralGrip: 0.22,
    rolling: 0.01,
    slipThreshold: 18,
    gripRecovery: 0.9,
    bumpiness: 0.03,
    walkMul: 0.7,
    particle: "snow",
    particleColor: "#e8f0f4",
    particleRate: 5,
    leavesTracks: true,
    trackOpacity: 0.25,
    tireSound: "tire_ice",
    footstepSound: "step_ice",
    heavyPenalty: 1.6,
  },
};


export const SPAWN = { x: -280, z: 4, yaw: -Math.PI / 2 };

export const MAPLE_LEAVES = [
  { id: "leaf_eboulis", name: "Éboulis de 1894", x: -620, z: -580 },
  { id: "leaf_plage", name: "Plage Carillon", x: -520, z: -760 },
  { id: "leaf_marmites", name: "Marmites de géants", x: -820, z: -160 },
  { id: "leaf_pont", name: "Pont de fer", x: -890, z: -180 },
  { id: "leaf_carriere", name: "Carrière Saint-Marc", x: -480, z: -200 },
  { id: "leaf_moulin", name: "Moulin de Deschambault", x: -460, z: 72 },
  { id: "leaf_hotelville", name: "Hôtel de ville", x: X261, z: ROAD_138_Z },
  { id: "leaf_parc", name: "Parc Pont-Rouge", x: 1120, z: -340 },
  { id: "leaf_raymond", name: "Saint-Raymond", x: 980, z: -650 },
  { id: "leaf_casimir", name: "Saint-Casimir", x: -900, z: -280 },
  { id: "leaf_alban", name: "Saint-Alban", x: -620, z: -530 },
  { id: "leaf_spawn", name: "Chemin du Roy", x: -280, z: 12 },
];

export const ENFORCE_SPEED_LIMITS = false;

function distToPolyline(x: number, z: number, pts: Array<[number, number]>) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1]!;
    const [bx, bz] = pts[i]!;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return best;
}

export function closestOnPolyline(
  x: number,
  z: number,
  points: Array<[number, number]>,
): { x: number; z: number; dist: number; nx: number; nz: number } {
  let best = { x: points[0]![0], z: points[0]![1], dist: Infinity, nx: 0, nz: 1 };
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]!;
    const [bx, bz] = points[i + 1]!;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < best.dist) {
      let nx = x - px;
      let nz = z - pz;
      const nl = Math.hypot(nx, nz);
      if (nl < 1e-4) {
        nx = -dz;
        nz = dx;
        const pl = Math.hypot(nx, nz) || 1;
        nx /= pl;
        nz /= pl;
      } else {
        nx /= nl;
        nz /= nl;
      }
      best = { x: px, z: pz, dist: d, nx, nz };
    }
  }
  return best;
}

export function roadHalfWidth(road: RoadDef): number {
  if (road.kind === "highway") return road.width * 0.5 + 5;
  if (road.kind === "ramp") return road.width * 0.5 + 3.2;
  return road.width * 0.5;
}

export function nearestRoadHit(x: number, z: number) {
  let best: { road: RoadDef; x: number; z: number; dist: number; nx: number; nz: number } | null = null;
  for (const road of ROADS) {
    const h = closestOnPolyline(x, z, road.points);
    if (!best || h.dist < best.dist) best = { road, ...h };
  }
  return best;
}

/** Pousse un point hors de la chaussée (accotement + cour avant). */
export function pushOffRoad(x: number, z: number, margin = 8, loops = 12): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let i = 0; i < loops; i++) {
    const hit = nearestRoadHit(px, pz);
    if (!hit) break;
    const need = roadHalfWidth(hit.road) + margin;
    if (hit.dist >= need) break;
    const push = need - hit.dist + 0.8;
    px += hit.nx * push;
    pz += hit.nz * push;
  }
  if (pz > RIVER_Z - 22) pz = RIVER_Z - 22;
  return { x: px, z: pz };
}

export function onPavement(x: number, z: number, extra = 0): boolean {
  const hit = nearestRoadHit(x, z);
  return Boolean(hit && hit.dist < roadHalfWidth(hit.road) + extra);
}

export function villageAxis(v: VillageDef) {
  const [cx, cz] = v.center;
  const ang = v.roadAngle;
  const dirX = Math.cos(ang);
  const dirZ = Math.sin(ang);
  return { cx, cz, ang, dirX, dirZ, perpX: -dirZ, perpZ: dirX };
}

export function villageSetback(v: VillageDef): number {
  const on138 = v.terrain === "plaine_fleuve" || Math.abs(v.center[1] - ROAD_138_Z) < 50;
  return on138 ? 32 : 28;
}

/** Côté opposé au fleuve (nord / −Z) le long de la perpendiculaire à la rue. */
export function inlandSide(v: VillageDef): 1 | -1 {
  const { perpZ } = villageAxis(v);
  return perpZ > 0 ? -1 : 1;
}

export interface VillageLot {
  x: number;
  z: number;
  yaw: number;
}

function secondRoadClearance(x: number, z: number, skipId: string): number {
  let best = Infinity;
  for (const road of ROADS) {
    if (road.id === skipId) continue;
    const d = closestOnPolyline(x, z, road.points).dist - roadHalfWidth(road);
    if (d < best) best = d;
  }
  return best;
}

/** True si un bâtiment (centre ou coins du lot) empiète une route qui n'est pas une rue du damier. */
export function lotHitsThroughRoad(
  x: number,
  z: number,
  radius: number,
  cityId: string,
  halfW = 0,
  halfD = 0,
): boolean {
  const prefix = `${cityId}_`;
  const samples: Array<[number, number]> = [[x, z]];
  if (halfW > 0.5 && halfD > 0.5) {
    for (const sx of [-1, 0, 1] as const) {
      for (const sz of [-1, 0, 1] as const) {
        if (sx === 0 && sz === 0) continue;
        samples.push([x + sx * halfW, z + sz * halfD]);
      }
    }
  } else if (radius > 0) {
    samples.push([x + radius, z], [x - radius, z], [x, z + radius], [x, z - radius]);
  }
  const pad = halfW > 0 ? 2.2 : 0;
  for (const road of ROADS) {
    if (road.id.startsWith(prefix)) continue;
    const need = roadHalfWidth(road) + pad;
    for (const [sx, sz] of samples) {
      const h = closestOnPolyline(sx, sz, road.points);
      if (h.dist < need + (halfW > 0 ? 0 : radius)) return true;
    }
  }
  return false;
}

function villageStreetOf(v: VillageDef): RoadDef | null {
  return (
    ROADS.find((r) => r.id === `rue_${v.id}`) ??
    ROADS.find((r) => r.village === v.name && r.kind === "village" && r.id.startsWith("rue_")) ??
    ROADS.find((r) => r.village === v.name && r.kind === "village") ??
    null
  );
}

export function villageHouseLots(v: VillageDef): VillageLot[] {
  const street = villageStreetOf(v);
  const houseR = 8.6;
  const front = 14.2;
  const spacing = 30;
  const n = v.houseCount;
  const out: VillageLot[] = [];
  const tryLot = (x: number, z: number) => {
    if (z > RIVER_Z - 28) return;
    const hit = nearestRoadHit(x, z);
    if (!hit) return;
    if (hit.road.kind === "highway" || hit.road.kind === "ramp") return;
    const edge = hit.dist - roadHalfWidth(hit.road) - houseR;
    if (edge < 4.2) return;
    if (secondRoadClearance(x, z, hit.road.id) < houseR + 5.5) return;
    out.push({ x, z, yaw: Math.atan2(hit.x - x, hit.z - z) });
  };

  if (street && street.points.length >= 2) {
    const a = street.points[0]!;
    const b = street.points[street.points.length - 1]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    const dirX = dx / len;
    const dirZ = dz / len;
    const perpX = -dirZ;
    const perpZ = dirX;
    const inland = perpZ > 0 ? -1 : 1;
    const hw = roadHalfWidth(street);
    const [cx, cz] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const riverStreet = Math.abs(cz - ROAD_138_Z) < 55;
    for (let i = 0; i < n; i++) {
      const side: 1 | -1 = riverStreet || i % 2 === 0 ? inland : ((-inland) as 1 | -1);
      const idx = riverStreet ? i : Math.floor(i / 2);
      const perSide = riverStreet ? n : Math.ceil(n / 2);
      let along = (idx - (perSide - 1) / 2) * spacing;
      if (Math.abs(along) < 16) along += Math.sign(along || inland) * 22;
      tryLot(cx + dirX * along + perpX * side * (hw + front), cz + dirZ * along + perpZ * side * (hw + front));
    }
  }

  if (out.length < 3) {
    const { cx, cz, dirX, dirZ, perpX, perpZ } = villageAxis(v);
    const setback = villageSetback(v);
    const inland = inlandSide(v);
    for (let i = 0; i < n; i++) {
      const side: 1 | -1 = i % 2 === 0 ? inland : ((-inland) as 1 | -1);
      const idx = Math.floor(i / 2);
      const perSide = Math.ceil(n / 2);
      let along = (idx - (perSide - 1) / 2) * spacing;
      if (Math.abs(along) < 20) along += Math.sign(along || inland) * 24;
      const p = pushOffRoad(cx + dirX * along + perpX * side * setback, cz + dirZ * along + perpZ * side * setback, houseR + 6);
      tryLot(p.x, p.z);
    }
  }
  return out;
}

export function villageCivicSpot(v: VillageDef, kind: "church" | "school" | "shop" | "caisse" | "cemetery" | "park"): VillageLot {
  const street = villageStreetOf(v);
  let along = 0;
  let radius = 10;
  if (kind === "church") {
    along = -Math.max(40, v.coreRadius * 0.5);
    radius = 16;
  } else if (kind === "cemetery") {
    along = -Math.max(40, v.coreRadius * 0.5);
    radius = 34;
  } else if (kind === "park") {
    along = Math.max(12, v.coreRadius * 0.18);
    radius = 16;
  } else if (kind === "shop") {
    along = Math.max(38, v.coreRadius * 0.42);
    radius = 10;
  } else if (kind === "caisse") {
    along = -Math.max(18, v.coreRadius * 0.22);
    radius = 14;
  } else {
    along = Math.max(70, v.coreRadius * 0.9);
    radius = 12;
  }

  if (street && street.points.length >= 2) {
    const a = street.points[0]!;
    const b = street.points[street.points.length - 1]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    const dirX = dx / len;
    const dirZ = dz / len;
    const perpX = -dirZ;
    const perpZ = dirX;
    const inland = perpZ > 0 ? -1 : 1;
    const hw = roadHalfWidth(street);
    const [mx, mz] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const yard = hw + radius + 8;
    const raw = {
      x: mx + dirX * along + perpX * inland * yard,
      z: mz + dirZ * along + perpZ * inland * yard,
    };
    const p = pushOffRoad(raw.x, raw.z, radius + 8);
    const hit = nearestRoadHit(p.x, p.z);
    const yaw = hit ? Math.atan2(hit.x - p.x, hit.z - p.z) : Math.atan2(-perpX * inland, -perpZ * inland);
    return { x: p.x, z: p.z, yaw };
  }

  const { cx, cz, ang, dirX, dirZ, perpX, perpZ } = villageAxis(v);
  const side = inlandSide(v);
  const setback = villageSetback(v) + (kind === "church" ? 18 : kind === "cemetery" ? 40 : kind === "park" ? 22 : 12);
  const raw = {
    x: cx + dirX * along + perpX * side * setback,
    z: cz + dirZ * along + perpZ * side * setback,
  };
  const p = pushOffRoad(raw.x, raw.z, radius + 8);
  const hit = nearestRoadHit(p.x, p.z);
  const yaw = hit ? Math.atan2(hit.x - p.x, hit.z - p.z) : -ang + (side > 0 ? Math.PI : 0);
  return { x: p.x, z: p.z, yaw };
}

/** Place un point (acte, commerce) sur un lot de ville hors chaussée, sinon recul route. */
export function deedOffStreet(x: number, z: number, town: string): { x: number; z: number } {
  const g = CITY_GRIDS.find((c) => c.name === town);
  if (g) {
    const n = g.gridSize;
    const candidates: Array<[number, number]> = [
      [0, 0],
      [n - 1, 0],
      [0, n - 1],
      [n - 1, n - 1],
      [0, Math.min(1, n - 1)],
      [n - 1, Math.min(1, n - 1)],
      [Math.min(1, n - 1), 0],
      [Math.min(1, n - 1), n - 1],
    ];
    for (const [col, row] of candidates) {
      const lot = cityLotLocal(g, col, row);
      const w = cityToWorld(g, lot.cx, lot.cz);
      if (!lotHitsThroughRoad(w.x, w.z, 0, g.id, lot.w * 0.48, lot.d * 0.48)) {
        return { x: w.x, z: w.z };
      }
    }
  }
  return pushOffRoad(x, z, 14);
}

export function nearestRoad(x: number, z: number): { road: RoadDef; dist: number } | null {
  const hit = nearestRoadHit(x, z);
  return hit ? { road: hit.road, dist: hit.dist } : null;
}

export function getVillageAt(x: number, z: number): VillageDef | null {
  let best: VillageDef | null = null;
  let bestD = Infinity;
  for (const v of VILLAGES) {
    const d = Math.hypot(x - v.center[0], z - v.center[1]);
    if (d < v.coreRadius * 2.3 && d < bestD) {
      best = v;
      bestD = d;
    }
  }
  return best;
}

export function getNearestVillage(x: number, z: number): VillageDef {
  let best = VILLAGES[0]!;
  let bestD = Infinity;
  for (const v of VILLAGES) {
    const d = Math.hypot(x - v.center[0], z - v.center[1]);
    if (d < bestD) {
      best = v;
      bestD = d;
    }
  }
  return best;
}

export function getPoiAt(x: number, z: number): PoiDef | null {
  for (const p of POIS) {
    if (Math.hypot(x - p.x, z - p.z) < p.radius) return p;
  }
  return null;
}

export function getSurfaceAt(x: number, z: number): SurfaceSample {
  if (z > RIVER_Z - 8) return SURFACES.water!;
  for (const lake of LAKES) {
    const d = Math.hypot(x - lake.x, z - lake.z);
    if (d < lake.r - 6) return SURFACES.water!;
    if (d < lake.r + 18) return SURFACES.sand!;
  }
  if (Math.hypot(x + 620, z + 580) < 120) return SURFACES.clay!;
  const nr = nearestRoad(x, z);
  if (nr && nr.dist < nr.road.width * 0.7) {
    if (nr.road.surface === "gravel") return SURFACES.gravel!;
    const v = getVillageAt(x, z);
    if (v && Math.hypot(x - v.center[0], z - v.center[1]) < v.coreRadius * 1.4) return SURFACES.village!;
    return SURFACES.asphalt!;
  }
  if (z < -380) return SURFACES.forest!;
  return SURFACES.grass!;
}

export function withIce(s: SurfaceSample, ice: boolean): SurfaceSample {
  if (!ice || s.key === "water" || s.key === "ice") return s;
  const iceS = SURFACES.ice!;
  const glazed = s.key === "asphalt" || s.key === "village" || s.key === "parking";
  return {
    ...s,
    name: glazed ? "Verglas" : `${s.name} · givre`,
    traction: s.traction * (glazed ? 0.32 : 0.55),
    lateralGrip: s.lateralGrip * (glazed ? 0.28 : 0.5),
    slipThreshold: Math.min(s.slipThreshold, iceS.slipThreshold + (glazed ? 0 : 10)),
    gripRecovery: glazed ? iceS.gripRecovery : s.gripRecovery * 0.55,
    rolling: glazed ? iceS.rolling : s.rolling,
    particle: glazed ? "snow" : s.particle,
    particleColor: glazed ? iceS.particleColor : s.particleColor,
    particleRate: Math.max(s.particleRate, glazed ? 6 : 2),
    walkMul: s.walkMul * 0.78,
    heavyPenalty: s.heavyPenalty * 1.25,
    tireSound: "tire_ice",
  };
}


export function getSpeedLimitAt(x: number, z: number): { limit: number; name: string } {
  const v = getVillageAt(x, z);
  if (v && Math.hypot(x - v.center[0], z - v.center[1]) < v.coreRadius * 1.8) return { limit: 50, name: v.name };
  const nr = nearestRoad(x, z);
  if (nr && nr.dist < nr.road.width * 1.4) return { limit: nr.road.speed, name: nr.road.name };
  return { limit: 70, name: "Campagne" };
}

export function getZoneName(x: number, z: number): string {
  if (z > RIVER_Z - 10) return "Fleuve Saint-Laurent";
  const poi = getPoiAt(x, z);
  if (poi) return poi.name;
  const v = getVillageAt(x, z);
  if (v) return v.name;
  const nr = nearestRoad(x, z);
  if (nr && nr.dist < nr.road.width) return nr.road.name;
  if (z < ROAD_138_Z - 10 && z > A40_Z + 36) return "Plaine agricole du Chemin du Roy";
  if (z < -380) return "Forêt laurentienne";
  return "Campagne de Portneuf";
}

export function policeCatchMul(x: number, z: number) {
  const zone = getVillageAt(x, z);
  const n = zone?.policeResponse ?? 360;
  return Math.max(0.42, Math.min(1.25, 180 / n));
}

export function getWorldStats() {
  return {
    villages: VILLAGES.length,
    totalPopulation: VILLAGES.reduce((s, v) => s + v.population, 0),
    landmarks: [...new Set(VILLAGES.flatMap((v) => v.landmarks))],
  };
}

export function getTerrainHeight(x: number, z: number): number {
  if (z > RIVER_Z - 18) {
    const depth = (z - (RIVER_Z - 18)) / 55;
    return -2.2 - depth * 4.2;
  }
  let h = 0;
  const distFromRiver = Math.max(0, RIVER_Z - z);
  if (z < -390) {
    const mountainFactor = (-z - 390) / 520;
    h += mountainFactor * mountainFactor * 72;
  }
  h += Math.sin(x * 0.0018) * Math.cos(z * 0.0022) * 7;
  h += Math.sin(x * 0.0045 + 1.3) * Math.cos(z * 0.0038 - 0.7) * 3.4;
  h += Math.sin(x * 0.012) * Math.cos(z * 0.011) * 0.85;

  const ebx = x + 620;
  const ebz = z + 580;
  const ebr = Math.hypot(ebx, ebz * 1.4);
  if (ebr < 160) {
    const t = 1 - ebr / 160;
    h -= Math.pow(t, 0.7) * 16;
  }

  for (const lake of LAKES) {
    const d = Math.hypot(x - lake.x, z - lake.z);
    if (d < lake.r + 24) {
      const t = 1 - d / (lake.r + 24);
      h -= Math.max(0, t) * 4;
    }
  }

  if (distFromRiver < 120) h *= distFromRiver / 120;

  const flatten = (roadZ: number, width: number) => {
    const d = Math.abs(z - roadZ);
    if (d < width) h *= 0.18 + (d / width) * 0.82;
  };
  flatten(ROAD_138_Z, 44);
  flatten(A40_Z, 52);

  const nr = nearestRoad(x, z);
  if (nr && nr.dist < 34) {
    const e = nr.road.kind === "highway" ? 46 : nr.road.kind === "ramp" ? 22 : 30;
    if (nr.dist < e) h *= 0.2 + (nr.dist / e) * 0.8;
  }
  for (const v of VILLAGES) {
    const d = Math.hypot(x - v.center[0], z - v.center[1]);
    const a = v.coreRadius * 1.6;
    if (d < a) h *= 0.25 + (d / a) * 0.75;
  }
  return h;
}

export function inWorld(x: number, z: number) {
  return x > WORLD.minX + 20 && x < WORLD.maxX - 20 && z > WORLD.minZ + 20 && z < WORLD.maxZ - 20;
}

export function isNearVillage(x: number, z: number, radius: number) {
  for (const v of VILLAGES) {
    if (dist2(x, z, v.center[0], v.center[1]) < radius * radius) return true;
  }
  return false;
}


