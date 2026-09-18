/**
 * ═════════════════════════════════════════════════════════════════════════════
 * DONNÉES GÉOGRAPHIQUES, TOPOGRAPHIE ET INFRASTRUCTURES — MRC DE PORTNEUF (RP v3.0)
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Modélisation géographique et cartographique fidèle et agrandie de la région de Portneuf :
 *  - Tracé de la Route 138, de l'Autoroute 40 et des routes forestières du nord.
 *  - Fiches municipales complètes incluant Saint-Ubalde, Saint-Gilbert, Rivière-à-Pierre et Saint-Thuribe.
 *  - Propriétés physiques des sols québécois et topographie dynamique.
 * ═════════════════════════════════════════════════════════════════════════
 */

import { dist2 } from "./rng";

// ─── LIMITES DU MONDE DE JEU AGRANDIES (MRC DE PORTNEUF) ─────────────────────
export const WORLD = {
  minX: -1800, // Étendu vers l'ouest (Saint-Ubalde)
  maxX: 1800,  // Étendu vers l'est
  minZ: -1500, // Étendu vers le nord (Rivière-à-Pierre & Laurentides profondes)
  maxZ: 250,   // Étendu vers le sud (Fleuve)
  get width() {
    return this.maxX - this.minX;
  },
  get depth() {
    return this.maxZ - this.minZ;
  },
};

export const RIVER_Z = 96;             // Niveau moyen du fleuve Saint-Laurent
export const ROAD_138_Z = 4;           // Alignement de la Route 138 (Chemin du Roy)
export const A40_Z = -178;             // Tracé de l'Autoroute 40 (Félix-Leclerc)
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
  { no: "250", km: 250, x: a40X(250), title: "Échangeur Grondines", dest: "Route 363 Nord • Saint-Casimir · Saint-Ubalde" },
  { no: "254", km: 254, x: a40X(254), title: "Échangeur de la 363", dest: "Route 363 • Saint-Marc · Deschambault · Saint-Alban" },
  { no: "257", km: 257, x: a40X(257), title: "Échangeur Route Proulx", dest: "Saint-Gilbert · Deschambault-Grondines" },
  { no: "261", km: 261, x: a40X(261), title: "Échangeur Portneuf", dest: "Route 365 Sud • Chef-lieu de Portneuf" },
  { no: "269", km: 269, x: a40X(269), title: "Échangeur Route 358", dest: "Route 358 • Cap-Santé · Saint-Basile" },
  { no: "274", km: 274, x: a40X(274), title: "Échangeur Donnacona", dest: "Route 138 • Centre-ville de Donnacona · Pénitencier" },
  { no: "281", km: 281, x: a40X(281), title: "Échangeur Route 365", dest: "Route 365 • Neuville · Pont-Rouge · Saint-Raymond" },
  { no: "285", km: 285, x: a40X(285), title: "Échangeur Route Gravel", dest: "Neuville • Secteur ouest" },
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
  | "eboulis"
  | "gare_patrimoniale"
  | "pourvoirie";

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
  papeterie: "Complexe de Pâtes et Papiers",
  carriere: "Carrières de calcaire actif",
  foresterie: "Exploitation forestière",
  agriculture: "Agriculture et Élevage bovin",
  peche: "Pêche commerciale et estuarienne",
  tourisme: "Patrimoine et Villégiature",
  acericole: "Acériculture (Érablières de rang)",
  residentiel: "Développement résidentiel",
  maritime: "Activités portuaires et maritimes",
  urbain: "Secteur commercial urbain",
};

export const LANDMARK_LABEL: Record<LandmarkKind, string> = {
  moulin_vent: "Vieux moulin à vent de seigneurie",
  moulin_eau: "Moulin à eau patrimonial",
  usine_papier: "Papeterie de la Jacques-Cartier",
  carriere_calcaire: "Front de taille de calcaire Chazy",
  barrage: "Barrage hydroélectrique au fil de l'eau",
  marina: "Port de plaisance municipal",
  rue_patrimoniale: "Chemin du Roy et maisons de pierre",
  pont_couvert: "Pont couvert en bois d'époque",
  quai_fleuve: "Halte nautique et quai d'embarquement",
  marmites_geants: "Marmites d'érosion fluviale de la Sainte-Anne",
  trou_du_diable: "Réseau spéléologique du Trou du Diable",
  pont_de_fer: "Pont à treillis métallique ferroviaire du CN",
  eboulis: "Glissement de terrain historique (1894)",
  gare_patrimoniale: "Gare ferroviaire historique du CN",
  pourvoirie: "Pourvoirie de pêche et chasse en territoire nordique",
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

// ─── REGISTRE COMPLET DES MUNICIPALITÉS DE LA MRC DE PORTNEUF ────────────────
export const VILLAGES: VillageDef[] = [
  {
    id: "grondines",
    name: "Grondines",
    center: [X250, 12],
    population: 920,
    roadAngle: -0.04,
    houseCount: 10,
    farmCount: 3,
    coreRadius: 64,
    description: "Porte d'entrée ouest de la MRC le long du Chemin du Roy. Réputée pour ses paysages agricoles d'estuaire et son moulin seigneurial érigé en 1674.",
    motto: "Au fil du fleuve et du temps",
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
    id: "saint_ubalde",
    name: "Saint-Ubalde",
    center: [-1250, -650],
    population: 1350,
    roadAngle: 0.55,
    houseCount: 10,
    farmCount: 4,
    coreRadius: 65,
    description: "Paradis des lacs et des chalets au nord-ouest de la MRC, parsemé de plans d'eau cristallins et de forêts sauvages.",
    motto: "Entre lacs et montagnes",
    founded: 1860,
    type: "village",
    industry: "tourisme",
    secondaryIndustry: "foresterie",
    landmarks: ["pourvoirie"],
    churchStyle: "bois_blanc",
    churchScale: 0.9,
    terrain: "montagne",
    sugarShackCount: 6,
    hasCaisse: true,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 500,
  },
  {
    id: "saint_casimir",
    name: "Saint-Casimir",
    center: [-900, -280],
    population: 1450,
    roadAngle: 0.42,
    houseCount: 10,
    farmCount: 3,
    coreRadius: 68,
    description: "Blottie dans la vallée fertile de la rivière Sainte-Anne. Berceau de la spéléologie québécoise avec son célèbre Trou du Diable.",
    motto: "D'eau, de pierre et de légendes",
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
    id: "saint_thuribe",
    name: "Saint-Thuribe",
    center: [-1050, -420],
    population: 320,
    roadAngle: 0.2,
    houseCount: 6,
    farmCount: 5,
    coreRadius: 45,
    description: "Petit hameau de rang agricole très paisible, caractérisé par ses immenses champs de maïs et d'avoine.",
    motto: "Terre fertile et solidaire",
    founded: 1885,
    type: "hameau",
    industry: "agriculture",
    landmarks: [],
    churchStyle: "bois_blanc",
    churchScale: 0.75,
    terrain: "plateau",
    sugarShackCount: 3,
    hasCaisse: false,
    hasEcole: false,
    hasEglise: true,
    policeResponse: 420,
  },
  {
    id: "saint_alban",
    name: "Saint-Alban",
    center: [-620, -530],
    population: 1250,
    roadAngle: 0.9,
    houseCount: 10,
    farmCount: 3,
    coreRadius: 70,
    description: "Érigée sur les contreforts des Laurentides. Marquée par le glissement de terrain dévastateur du 27 avril 1894.",
    motto: "Renaître de la terre",
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
    id: "saint_gilbert",
    name: "Saint-Gilbert",
    center: [-340, -180],
    population: 280,
    roadAngle: -0.15,
    houseCount: 6,
    farmCount: 6,
    coreRadius: 48,
    description: "Petite paroisse rurale de transition agricole entre le Chemin du Roy et le haut-comté.",
    motto: "Labeur et clocher",
    founded: 1878,
    type: "hameau",
    industry: "agriculture",
    landmarks: [],
    churchStyle: "bois_blanc",
    churchScale: 0.8,
    terrain: "plateau",
    sugarShackCount: 2,
    hasCaisse: false,
    hasEcole: false,
    hasEglise: true,
    policeResponse: 340,
  },
  {
    id: "saint_marc",
    name: "Saint-Marc-des-Carrières",
    center: [-520, -280],
    population: 2950,
    roadAngle: 0.18,
    houseCount: 14,
    farmCount: 3,
    coreRadius: 78,
    description: "Capitale régionale de l'extraction de pierre calcaire Chazy et de ses carrières monumentales.",
    motto: "Bâtie sur le roc",
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
    population: 2100,
    roadAngle: -0.04,
    houseCount: 12,
    farmCount: 4,
    coreRadius: 68,
    description: "Joyau patrimonial du Chemin du Roy face aux vagues et aux marées du Saint-Laurent.",
    motto: "Fidèle au fleuve",
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
    population: 3200,
    roadAngle: 0,
    houseCount: 16,
    farmCount: 3,
    coreRadius: 100,
    description: "Chef-lieu d'enregistrement et pôle maritime de la MRC avec son quai hauturier.",
    motto: "La porte du grand chenal",
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
    population: 3500,
    roadAngle: 0.02,
    houseCount: 10,
    farmCount: 2,
    coreRadius: 72,
    description: "Promontoire de schiste escarpé abritant l'église Sainte-Famille (1714).",
    motto: "Fierté sous le cap",
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
    population: 2700,
    roadAngle: 0.2,
    houseCount: 8,
    farmCount: 2,
    coreRadius: 62,
    description: "Village de plaine campé sur la rive nord de la rivière Portneuf, spécialisé en élevage laitier.",
    motto: "De paille et de lait d'or",
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
    population: 7400,
    roadAngle: 0.02,
    houseCount: 8,
    farmCount: 2,
    coreRadius: 80,
    description: "Ville industrielle majeure érigée au confluent de la Jacques-Cartier et du fleuve.",
    motto: "L'énergie du confluent",
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
    population: 4500,
    roadAngle: 0.02,
    houseCount: 10,
    farmCount: 2,
    coreRadius: 74,
    description: "Secteur maraîcher réputé pour son célèbre maïs sucré protégé par l'UPA.",
    motto: "De terre et de marée",
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
    population: 9600,
    roadAngle: 1.52,
    houseCount: 6,
    farmCount: 2,
    coreRadius: 130,
    description: "Grand centre urbain traversé par la rivière Jacques-Cartier et ses sentiers de plein air.",
    motto: "L'élan de la Jacques-Cartier",
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
    population: 11200,
    roadAngle: -0.48,
    houseCount: 16,
    farmCount: 3,
    coreRadius: 92,
    description: "Capitale de la foresterie et de l'aventure, porte d'entrée de la vallée de la Bras-du-Nord.",
    motto: "La nature comme horizon",
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
  {
    id: "riviere_a_pierre",
    name: "Rivière-à-Pierre",
    center: [450, -1350],
    population: 710,
    roadAngle: -0.3,
    houseCount: 6,
    farmCount: 2,
    coreRadius: 55,
    description: "Carrefour ferroviaire historique du Nord-Portneuf et terminus de la piste cyclable Jacques-Cartier/Portneuf.",
    motto: "Au cœur du granit et du rail",
    founded: 1894,
    type: "village",
    industry: "foresterie",
    secondaryIndustry: "tourisme",
    landmarks: ["gare_patrimoniale"],
    churchStyle: "bois_blanc",
    churchScale: 0.85,
    terrain: "montagne",
    sugarShackCount: 4,
    hasCaisse: false,
    hasEcole: true,
    hasEglise: true,
    policeResponse: 600,
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
    ramp(`a40_${e.no}_e_off`, `A-40 sortie ${e.no} est (Sortie)`, [
      [t - 130, -169.4],
      [t - 88, -163.4],
      [t - 48, -148],
      [t - 18, -130],
      [t - 8, -122],
    ]),
    ramp(`a40_${e.no}_e_on`, `A-40 entrée ${e.no} est (Insertion)`, [
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

export const RANG_2E_Z = -70;

export const RIVER_RANGS: Array<{
  farmId: string;
  name: string;
  village: string;
  x: number;
}> = [
  { farmId: "rang_grondines_ouest", name: "Rang du Chemin du Roy (Grondines)", village: "Grondines", x: -1000 },
  { farmId: "rang_grondines_est", name: "Rang Sainte-Anne", village: "Grondines", x: -700 },
  { farmId: "rang_deschambault_ouest", name: "Rang des Pins", village: "Deschambault-Grondines", x: -580 },
  { farmId: "rang_deschambault_est", name: "Côte de la Traverse", village: "Deschambault-Grondines", x: -410 },
  { farmId: "rang_portneuf_ouest", name: "Rang de la Pointe (Portneuf)", village: "Portneuf", x: -250 },
  { farmId: "rang_capsante_ouest", name: "Rang Saint-Joseph (Cap-Santé)", village: "Cap-Santé", x: 220 },
  { farmId: "rang_capsante_est", name: "Rang du Vieux Chemin", village: "Cap-Santé", x: 500 },
  { farmId: "rang_neuville_ouest", name: "Côte des Écureuils (Neuville)", village: "Neuville", x: 940 },
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
      name: g.id === "portneuf" && artery ? "Rue de la Station — Portneuf" : artery ? `Rue Principale — ${g.name}` : `Rue ${i + 1} N-S — ${g.name}`,
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
      name: g.id === "portneuf" && artery ? "Rue Saint-Charles — Portneuf" : artery ? `Boulevard — ${g.name}` : `Rue ${i + 1} E-O — ${g.name}`,
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
    name: "2e Rang Ouest",
    kind: "rural",
    speed: 70,
    width: 6.2,
    surface: "asphalt",
    traffic: 1,
    points: [
      [-1600, RANG_2E_Z],
      [-1080, RANG_2E_Z],
      [-780, RANG_2E_Z],
      [-500, RANG_2E_Z],
      [-210, RANG_2E_Z],
    ],
  });
  out.push({
    id: "rang2e_est",
    name: "2e Rang Est",
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
    }
  }

  ROAD_JUNCTIONS.length = 0;
  ROAD_JUNCTIONS.push(...junc);
  return out;
}

const ROADS_STATIC: RoadDef[] = [
  {
    id: "r_prison_donnacona",
    name: "Chemin de la Grande-Ligne — Donnacona",
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
    name: "Route 138 (Chemin du Roy)",
    kind: "regional",
    speed: 90,
    width: 8.4,
    surface: "asphalt",
    points: [
      [-1700, 12],
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
      [1700, 10],
    ],
  },
  {
    id: "a40",
    name: "Autoroute 40 (Félix-Leclerc)",
    kind: "highway",
    speed: 100,
    width: 16.5,
    surface: "asphalt",
    traffic: 10,
    points: [
      [-1700, A40_Z],
      [X250, A40_Z],
      [X254, A40_Z],
      [X257, A40_Z],
      [X261, A40_Z],
      [X269, A40_Z],
      [X274, A40_Z],
      [X281, A40_Z],
      [X285, A40_Z],
      [1700, A40_Z],
    ],
  },
  {
    id: "route_nord_ubalde",
    name: "Route de liaison Nord (Saint-Ubalde / Rivière-à-Pierre)",
    kind: "regional",
    speed: 80,
    width: 6.8,
    surface: "asphalt",
    points: [
      [-1250, -650],
      [-1050, -850],
      [-450, -1100],
      [450, -1350],
      [980, -650],
    ],
  },
  ...A40_EXITS.flatMap(rampsForExit),
];

export const ROADS: RoadDef[] = [...ROADS_STATIC, ...CITY_GRIDS.flatMap(cityGridRoads), ...villageStreetRoads()];

export const POIS: PoiDef[] = [
  { id: "ubalde_lac", name: "Pourvoirie du lac Sept-Îles", type: "pourvoirie", x: -1250, z: -650, radius: 45, description: "Centre de villégiature et pourvoirie prisée des pêcheurs." },
  { id: "rp_gare", name: "Gare patrimoniale de Rivière-à-Pierre", type: "gare", x: 450, z: -1350, radius: 35, description: "Ancienne gare ferroviaire du CN aux portes de la zec Batiscan-Neilson." },
  { id: "casimir_marmites", name: "Marmites de géants de la Sainte-Anne", type: "site_geologique", x: -820, z: -160, radius: 36, description: "Cavités d'érosion circulaires creusées dans le calcaire." },
  { id: "casimir_trou", name: "Spéléo : Le Trou du Diable", type: "grotte", x: -860, z: -210, radius: 24, description: "Réseau de grottes de la rivière Sainte-Anne." },
  { id: "portneuf_sq", name: "Poste de police de district SQ", type: "institution", x: SQ_JAIL.x, z: SQ_JAIL.z, radius: 22, description: "Sûreté du Québec — Centrale d'appel, cellules et patrouilleurs." },
  ...A40_EXITS.map((e) => ({
    id: `a40_${e.no}`,
    name: `A-40 sortie ${e.no} — ${e.title}`,
    type: "echangeur",
    x: e.x,
    z: A40_Z,
    radius: 36,
    description: `Bretelles de raccordement du MTQ. ${e.dest}.`,
  })),
];

export const LAKES = [
  { name: "Lac Carillon", x: -520, z: -760, r: 78 },
  { name: "Lac Blanc", x: -360, z: -770, r: 52 },
  { name: "Lac Long", x: -700, z: -780, r: 64 },
  { name: "Lac Sept-Îles", x: -1200, z: -720, r: 95 },
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
  asphalt: { key: "asphalt", name: "Enrobé bitumineux", traction: 1, lateralGrip: 1, rolling: 0.013, slipThreshold: 95, gripRecovery: 3.2, bumpiness: 0.04, walkMul: 1, particle: "none", particleColor: "#8a7a62", particleRate: 0, leavesTracks: false, trackOpacity: 0.2, tireSound: "tire_asphalt", footstepSound: "step_concrete", heavyPenalty: 1 },
  village: { key: "village", name: "Béton de rue", traction: 0.96, lateralGrip: 0.92, rolling: 0.018, slipThreshold: 70, gripRecovery: 2.8, bumpiness: 0.08, walkMul: 1, particle: "none", particleColor: "#8a7a62", particleRate: 0, leavesTracks: false, trackOpacity: 0.25, tireSound: "tire_asphalt", footstepSound: "step_concrete", heavyPenalty: 1.02 },
  gravel: { key: "gravel", name: "Gravelle de rang", traction: 0.72, lateralGrip: 0.48, rolling: 0.04, slipThreshold: 42, gripRecovery: 2.1, bumpiness: 0.28, walkMul: 0.9, particle: "dust", particleColor: "#c4b090", particleRate: 8, leavesTracks: true, trackOpacity: 0.45, tireSound: "tire_gravel", footstepSound: "step_gravel", heavyPenalty: 1.15 },
  dirt: { key: "dirt", name: "Terre battue", traction: 0.58, lateralGrip: 0.52, rolling: 0.055, slipThreshold: 38, gripRecovery: 1.8, bumpiness: 0.32, walkMul: 0.82, particle: "dust", particleColor: "#8a7a62", particleRate: 10, leavesTracks: true, trackOpacity: 0.55, tireSound: "tire_dirt", footstepSound: "step_dirt", heavyPenalty: 1.22 },
  sand: { key: "sand", name: "Sable", traction: 0.42, lateralGrip: 0.62, rolling: 0.1, slipThreshold: 30, gripRecovery: 1.4, bumpiness: 0.18, walkMul: 0.55, particle: "sand", particleColor: "#d4c4a0", particleRate: 12, leavesTracks: true, trackOpacity: 0.6, tireSound: "tire_sand", footstepSound: "step_sand", heavyPenalty: 1.45 },
  grass: { key: "grass", name: "Pelouse", traction: 0.62, lateralGrip: 0.7, rolling: 0.045, slipThreshold: 50, gripRecovery: 2.4, bumpiness: 0.16, walkMul: 0.85, particle: "dust", particleColor: "#6a7a52", particleRate: 4, leavesTracks: true, trackOpacity: 0.35, tireSound: "tire_grass", footstepSound: "step_grass", heavyPenalty: 1.18 },
  clay: { key: "clay", name: "Argile Leda", traction: 0.38, lateralGrip: 0.4, rolling: 0.08, slipThreshold: 28, gripRecovery: 1.3, bumpiness: 0.35, walkMul: 0.5, particle: "dust", particleColor: "#8a6a52", particleRate: 9, leavesTracks: true, trackOpacity: 0.65, tireSound: "tire_dirt", footstepSound: "step_dirt", heavyPenalty: 1.5 },
  forest: { key: "forest", name: "Humus forestier", traction: 0.52, lateralGrip: 0.55, rolling: 0.06, slipThreshold: 36, gripRecovery: 1.9, bumpiness: 0.42, walkMul: 0.72, particle: "dust", particleColor: "#5a4a38", particleRate: 6, leavesTracks: true, trackOpacity: 0.4, tireSound: "tire_dirt", footstepSound: "step_leaves", heavyPenalty: 1.35 },
  parking: { key: "parking", name: "Béton armé", traction: 0.94, lateralGrip: 0.96, rolling: 0.016, slipThreshold: 80, gripRecovery: 3, bumpiness: 0.06, walkMul: 1, particle: "none", particleColor: "#8a8a88", particleRate: 0, leavesTracks: false, trackOpacity: 0.15, tireSound: "tire_asphalt", footstepSound: "step_concrete", heavyPenalty: 1.04 },
  water: { key: "water", name: "Eau douce", traction: 0.18, lateralGrip: 0.22, rolling: 0.16, slipThreshold: 12, gripRecovery: 0.8, bumpiness: 0.5, walkMul: 0.28, particle: "spray", particleColor: "#a8c4d4", particleRate: 14, leavesTracks: false, trackOpacity: 0.1, tireSound: "tire_water", footstepSound: "step_water", heavyPenalty: 1.8 },
  ice: { key: "ice", name: "Verglas", traction: 0.28, lateralGrip: 0.22, rolling: 0.01, slipThreshold: 18, gripRecovery: 0.9, bumpiness: 0.03, walkMul: 0.7, particle: "snow", particleColor: "#e8f0f4", particleRate: 5, leavesTracks: true, trackOpacity: 0.25, tireSound: "tire_ice", footstepSound: "step_ice", heavyPenalty: 1.6 },
};

export const SPAWN = { x: -280, z: 4, yaw: -Math.PI / 2 };
export const ENFORCE_SPEED_LIMITS = false;

export function closestOnPolyline(x: number, z: number, points: Array<[number, number]>) {
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
  if (z < -450) return SURFACES.forest!;
  return SURFACES.grass!;
}

export function withIce(s: SurfaceSample, ice: boolean): SurfaceSample {
  if (!ice || s.key === "water" || s.key === "ice") return s;
  const iceS = SURFACES.ice!;
  const glazed = s.key === "asphalt" || s.key === "village" || s.key === "parking";
  return {
    ...s,
    name: glazed ? "Glace noire (Asphalte verglacé)" : `${s.name} · givre`,
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
  return { limit: 70, name: "Campagne de Portneuf" };
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
  if (z < -450) return "Forêt laurentienne profonde";
  return "Campagne de Portneuf";
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
  if (z < -450) {
    const mountainFactor = (-z - 450) / 600;
    h += mountainFactor * mountainFactor * 95;
  }
  h += Math.sin(x * 0.0018) * Math.cos(z * 0.0022) * 7;
  h += Math.sin(x * 0.0045 + 1.3) * Math.cos(z * 0.0038 - 0.7) * 3.4;

  if (distFromRiver < 120) h *= distFromRiver / 120;
  return h;
}

export function inWorld(x: number, z: number) {
  return x > WORLD.minX + 20 && x < WORLD.maxX - 20 && z > WORLD.minZ + 20 && z < WORLD.maxZ - 20;
}

export function villageCivicSpot(v: VillageDef, kind: "church" | "school" | "shop" | "caisse" | "cemetery" | "park"): { x: number; z: number; yaw: number } {
  return { x: v.center[0], z: v.center[1] - 15, yaw: 0 };
}