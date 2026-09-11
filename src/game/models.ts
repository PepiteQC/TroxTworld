import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { tex } from "./textures";
import { nightstand, woolSofa } from "./luxury";
import { ak74Prop } from "./ak74";
import { bobombProp } from "./bobomb";
import { carabineProp } from "./carabine";
import { corpseProp, DEAD_LIE, DEAD_SIT } from "./corpses";
import { ar15Prop, shotgunProp, pistolProp } from "./guns";
import { injuredProp, INJURED_CLIPS } from "./injured";
import { catalogBuilder } from "./props3d";

/** IDs EtherWorld — le mesh réel est généré depuis dims, pas 770 fichiers GLB. */
export interface ModelMeta {
  id: string;
  label: string;
  category: string;
  dims: [number, number, number];
  color: string;
  placeable: boolean;
}

const CORE_SKIP = new Set([
  "cube", "sphere", "cylinder", "ramp", "arch", "tree", "bush", "rock",
  "bench", "chair", "cone", "barrel", "crate", "neon", "portal",
]);

function hex(c: string) {
  return parseInt(c.replace("#", ""), 16) || 0x888888;
}

function m(id: string, label: string, category: string, dims: [number, number, number], color: string, placeable = true): ModelMeta {
  return { id, label, category, dims, color, placeable };
}

export const MODEL_CATALOG: Record<string, ModelMeta> = {
  w1: m("w1", "Mur 1m", "structures", [1, 3, 0.2], "#ccbbaa"),
  w2: m("w2", "Mur 2m", "structures", [2, 3, 0.2], "#ccbbaa"),
  w3: m("w3", "Mur 3m", "structures", [3, 3, 0.2], "#ccbbaa"),
  w4: m("w4", "Mur 4m", "structures", [4, 3, 0.2], "#ccbbaa"),
  w5: m("w5", "Mur 5m", "structures", [5, 3, 0.2], "#ccbbaa"),
  w6: m("w6", "Mur 6m", "structures", [6, 3, 0.2], "#ccbbaa"),
  w8: m("w8", "Mur 8m", "structures", [8, 3, 0.2], "#ccbbaa"),
  wb2: m("wb2", "Mur fenêtre", "structures", [2, 3, 0.2], "#c4b8a8"),
  wd3: m("wd3", "Mur porte", "structures", [3, 3, 0.2], "#c4b8a8"),
  corner: m("corner", "Coin", "structures", [0.2, 3, 0.2], "#ccbbaa"),
  ft: m("ft", "Plancher bois", "structures", [2, 0.1, 2], "#8B6F47"),
  fc: m("fc", "Plancher béton", "structures", [2, 0.1, 2], "#9a9590"),
  f4x4: m("f4x4", "Dalle 4x4", "structures", [4, 0.1, 4], "#8B6F47"),
  st: m("st", "Escalier", "structures", [1.2, 1.6, 2.2], "#888888"),
  stsp: m("stsp", "Escalier spiral", "structures", [1.6, 2.4, 1.6], "#8a8a86"),
  rflat: m("rflat", "Toit plat", "structures", [4, 0.12, 4], "#3a3a3e"),
  rpitch: m("rpitch", "Toit pente", "structures", [4, 0.16, 3], "#8f3628"),
  dwood: m("dwood", "Porte bois", "structures", [1, 2.2, 0.1], "#704214"),
  dglass: m("dglass", "Porte vitre", "structures", [1.2, 2.2, 0.1], "#87ceeb"),
  ddouble: m("ddouble", "Double porte", "structures", [2, 2.2, 0.1], "#704214"),
  pil: m("pil", "Pilier", "structures", [0.4, 3.2, 0.4], "#9a9086"),
  ceil4: m("ceil4", "Plafond 4x4", "structures", [4, 0.1, 4], "#f4f1ec"),
  wins: m("wins", "Fenêtre", "structures", [1.2, 1.2, 0.08], "#87ceeb"),

  toilet: m("toilet", "Toilettes", "sdb", [0.6, 0.8, 0.7], "#f4f4f4"),
  batht: m("batht", "Baignoire", "sdb", [1.7, 0.55, 0.8], "#e8e8e8"),
  showr: m("showr", "Douche", "sdb", [1, 2.2, 1], "#ccddee"),
  bsink: m("bsink", "Lavabo", "sdb", [0.5, 0.9, 0.4], "#ffffff"),
  washmach: m("washmach", "Laveuse", "sdb", [0.65, 0.9, 0.65], "#d0d4d8"),

  sofa: m("sofa", "Sofa 3 places", "meubles", [2.2, 0.9, 0.9], "#4a4a6a"),
  sofaL: m("sofaL", "Sofa L", "meubles", [2.4, 0.9, 1.6], "#5a5a7a"),
  armch: m("armch", "Fauteuil", "meubles", [0.9, 1, 0.9], "#6a4a2a"),
  ctbl: m("ctbl", "Table basse", "meubles", [1.2, 0.4, 0.7], "#704214"),
  dintbl: m("dintbl", "Table à manger", "meubles", [1.8, 0.8, 0.9], "#8B6F47"),
  bed: m("bed", "Lit double", "meubles", [1.6, 0.6, 2.1], "#2a2a4a"),
  beds: m("beds", "Lit simple", "meubles", [1, 0.55, 2], "#3a3a5a"),
  ward: m("ward", "Armoire", "meubles", [1.5, 2.2, 0.6], "#8B6F47"),
  desk: m("desk", "Bureau", "meubles", [1.5, 0.8, 0.7], "#704214"),
  book: m("book", "Bibliothèque", "meubles", [1.4, 2, 0.4], "#6a4a30"),
  night: m("night", "Table de nuit", "meubles", [0.5, 0.78, 0.42], "#7d5340"),

  kcnt: m("kcnt", "Comptoir", "cuisine", [2, 0.9, 0.6], "#bbbbbb"),
  stove: m("stove", "Cuisinière", "cuisine", [0.6, 0.9, 0.6], "#555555"),
  fridge: m("fridge", "Réfrigérateur", "cuisine", [0.7, 1.8, 0.7], "#dddddd"),
  sink: m("sink", "Évier", "cuisine", [0.8, 0.9, 0.6], "#aaaaaa"),
  kisland: m("kisland", "Îlot", "cuisine", [1.6, 0.9, 0.8], "#c8c4bc"),
  micro: m("micro", "Micro-ondes", "cuisine", [0.5, 0.32, 0.4], "#2a2a2e"),

  pine: m("pine", "Pin", "exterieur", [1.6, 5.5, 1.6], "#0a5a0a"),
  palm: m("palm", "Palmier", "exterieur", [1.2, 5, 1.2], "#2a8a2a"),
  lpost: m("lpost", "Lampadaire", "exterieur", [0.2, 4.2, 0.2], "#555555"),
  fence: m("fence", "Clôture bois", "exterieur", [2, 1.2, 0.1], "#8B5A2B"),
  trash: m("trash", "Poubelle", "exterieur", [0.4, 0.9, 0.4], "#333333"),
  hydr: m("hydr", "Borne-incendie", "exterieur", [0.28, 0.8, 0.28], "#c03028"),
  dump: m("dump", "Conteneur", "exterieur", [2.2, 1.2, 1.1], "#2a5a38"),
  mailb: m("mailb", "Boîte aux lettres", "exterieur", [0.22, 1.2, 0.18], "#1a3a7a"),
  utpole: m("utpole", "Poteau Hydro", "exterieur", [0.22, 8, 0.22], "#8a7060"),
  flower: m("flower", "Fleurs", "exterieur", [0.5, 0.4, 0.5], "#c04060"),

  tlight: m("tlight", "Feu circulation", "routes", [0.25, 4.2, 0.25], "#444444"),
  stop: m("stop", "Panneau stop", "routes", [0.7, 2.4, 0.08], "#c02020"),
  ssign: m("ssign", "Panneau rue", "routes", [1.1, 2.2, 0.08], "#1c5f32"),
  swalk: m("swalk", "Trottoir", "routes", [2, 0.12, 4], "#9a9690"),

  plant: m("plant", "Plante", "deco", [0.4, 0.9, 0.4], "#2a7a2a"),
  tvwall: m("tvwall", "TV murale", "deco", [1.4, 0.8, 0.08], "#111111"),
  lamp: m("lamp", "Lampe sol", "deco", [0.35, 1.5, 0.35], "#d8c8a0"),
  rug: m("rug", "Tapis", "deco", [2, 0.04, 1.4], "#6a3040"),
  piano: m("piano", "Piano", "deco", [1.5, 1.1, 0.5], "#1a1a1e"),
  clock: m("clock", "Horloge", "deco", [0.4, 0.4, 0.08], "#e8e0d0"),

  ceillamp: m("ceillamp", "Plafonnier", "eclairage", [0.5, 0.16, 0.5], "#ffffcc"),
  chandelier: m("chandelier", "Lustre", "eclairage", [0.9, 0.7, 0.9], "#ffeeaa"),
  walllamp: m("walllamp", "Applique", "eclairage", [0.25, 0.3, 0.18], "#ffddaa"),
  ledstrip: m("ledstrip", "Bande LED", "eclairage", [2, 0.04, 0.04], "#00e8ff"),

  celldoor: m("celldoor", "Porte cellule", "prison", [1, 2.4, 0.08], "#888888"),
  bunkprison: m("bunkprison", "Lit superposé", "prison", [2, 1.8, 0.9], "#4a4e52"),
  barbed: m("barbed", "Barbelé", "prison", [3, 0.3, 0.08], "#7a8088"),
  watchtower: m("watchtower", "Tour de garde", "prison", [2.2, 8, 2.2], "#6a6660"),

  reception: m("reception", "Réception", "hotel", [3, 1.1, 1], "#8B6F47"),
  minibar: m("minibar", "Mini-bar", "hotel", [0.8, 0.9, 0.5], "#333333"),
  hotelbed: m("hotelbed", "Lit hôtel", "hotel", [1.8, 0.6, 2.2], "#e8e4dc"),
  safebox: m("safebox", "Coffre-fort", "hotel", [0.45, 0.4, 0.35], "#2a2a2e"),
  bellhop: m("bellhop", "Chariot bagages", "hotel", [0.9, 1.1, 0.6], "#8a8a86"),

  atm: m("atm", "ATM", "commerce", [0.5, 1.6, 0.4], "#2a6099"),
  vending: m("vending", "Distributeur", "commerce", [0.7, 1.8, 0.5], "#cc4444"),
  gaspump: m("gaspump", "Pompe essence", "commerce", [0.5, 1.8, 0.5], "#ff6600"),
  shopshelf: m("shopshelf", "Étagère shop", "commerce", [1.2, 2, 0.4], "#888888"),
  cashregister: m("cashregister", "Caisse", "commerce", [0.45, 0.4, 0.4], "#333333"),
  busstop: m("busstop", "Arrêt d'autobus", "commerce", [2.2, 2.6, 0.8], "#1a4a7a"),

  tv65: m("tv65", "TV 65\"", "electronique", [1.6, 0.95, 0.1], "#111111"),
  gamingpc: m("gamingpc", "PC Gaming", "electronique", [0.28, 0.5, 0.45], "#1a1a2a"),
  laptop: m("laptop", "Laptop", "electronique", [0.35, 0.04, 0.24], "#2a2a2e"),
  speaker: m("speaker", "Haut-parleur", "electronique", [0.22, 0.5, 0.22], "#1a1a1e"),

  spawnpoint: m("spawnpoint", "Spawn", "special", [1, 0.08, 1], "#1a8a3a"),
  teleporter: m("teleporter", "Téléporteur", "special", [1.6, 2.4, 1.6], "#8800ff"),
  campfire: m("campfire", "Feu de camp", "special", [0.9, 0.5, 0.9], "#ff6600"),
  medkit: m("medkit", "Kit médical", "special", [0.4, 0.22, 0.28], "#cc2020"),
  tent: m("tent", "Tente", "special", [2.2, 1.4, 1.6], "#3a5a38"),
  flagcanada: m("flagcanada", "Drapeau Canada", "special", [1.4, 2.6, 0.08], "#c8102e"),
  toolbox: m("toolbox", "Boîte à outils", "special", [0.5, 0.28, 0.28], "#c05018"),
  ak74: m("ak74", "AK-74", "special", [0.94, 0.22, 0.08], "#6a3a28"),
  ar15: m("ar15", "Fusil d'assaut", "special", [0.84, 0.2, 0.07], "#3a3c40"),
  shotgun: m("shotgun", "Fusil à pompe", "special", [0.92, 0.16, 0.07], "#4a4038"),
  pistol: m("pistol", "Pistolet tactique", "special", [0.22, 0.14, 0.04], "#2a2c30"),
  carabine: m("carabine", "Carabine de chasse", "special", [1.08, 0.16, 0.06], "#6a4a28"),
  bobomb: m("bobomb", "Bob-omb", "special", [0.28, 0.34, 0.28], "#1a1a1e"),
  injured: m("injured", "Blessé (boiteux)", "special", [0.7, 1.7, 0.5], "#c8b49a"),
  corpse: m("corpse", "Corps couché", "special", [1.8, 0.35, 0.7], "#5a4038"),
  corpse_sit: m("corpse_sit", "Corps assis", "special", [0.9, 0.95, 0.7], "#5a4038"),
};

for (const id of DEAD_SIT) {
  MODEL_CATALOG[id] = m(id, `Corps assis ${id.slice(-2)}`, "special", [0.9, 0.95, 0.7], "#5a4038");
}
for (const id of DEAD_LIE) {
  MODEL_CATALOG[id] = m(id, `Corps couché ${id.slice(-2)}`, "special", [1.8, 0.35, 0.7], "#5a4038");
}
for (const id of INJURED_CLIPS) {
  MODEL_CATALOG[id] = m(id, id.replace(/_/g, " "), "special", [0.7, 1.7, 0.5], "#c8b49a");
}

export const MODEL_CATEGORIES = [
  { id: "structures", label: "Structures" },
  { id: "meubles", label: "Meubles" },
  { id: "cuisine", label: "Cuisine" },
  { id: "sdb", label: "Salle de bain" },
  { id: "exterieur", label: "Extérieur" },
  { id: "routes", label: "Routes" },
  { id: "eclairage", label: "Éclairage" },
  { id: "deco", label: "Décoration" },
  { id: "prison", label: "Prison" },
  { id: "hotel", label: "Hôtel" },
  { id: "commerce", label: "Commerce" },
  { id: "electronique", label: "Électronique" },
  { id: "special", label: "Spécial" },
];

export const MODEL_ALIAS: Record<string, string> = {
  lpost: "lamp_post",
  pine: "tree",
  spotlamp: "spot",
  neonsign: "neon",
  coneShape: "cone",
  torusShape: "torus",
  planeShape: "plane",
  corpse_lie: "corpse",
  dead: "corpse",
  body: "corpse",
  body_sit: "corpse_sit",
  limp: "injured",
  hurt: "injured",
};

export function getModelMeta(id: string): ModelMeta | undefined {
  return MODEL_CATALOG[id];
}

export function isModelId(id: string): boolean {
  return !!MODEL_CATALOG[id] && !CORE_SKIP.has(id);
}

export function placeableModels(): ModelMeta[] {
  return Object.values(MODEL_CATALOG).filter((d) => d.placeable && !CORE_SKIP.has(d.id));
}

export function searchModels(q: string): ModelMeta[] {
  const s = q.toLowerCase();
  return Object.values(MODEL_CATALOG).filter(
    (d) => d.id.includes(s) || d.label.toLowerCase().includes(s) || d.category.includes(s),
  );
}

function addBox(g: THREE.Group, w: number, h: number, d: number, y: number, color: number, rx = 0.85) {
  const mesh = new THREE.Mesh(getGeo("box", { w, h, d }), matLib.get(color, rx));
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

export function buildFromMeta(id: string): THREE.Group | null {
  const def = MODEL_CATALOG[id];
  if (!def) return null;
  const g = new THREE.Group();
  g.name = id;
  const [w, h, d] = def.dims;
  const col = hex(def.color);
  const lit = def.category === "eclairage" || id === "campfire" || id === "teleporter" || id === "ledstrip";

  if (id === "night") {
    return nightstand(0, 0);
  }
  if (id === "sofa") {
    return woolSofa(0, 0);
  }
  if (id === "ak74") {
    return ak74Prop();
  }
  if (id === "ar15") {
    return ar15Prop();
  }
  if (id === "shotgun") {
    return shotgunProp();
  }
  if (id === "pistol") {
    return pistolProp();
  }
  if (id === "carabine") {
    return carabineProp();
  }
  if (id === "bobomb") {
    return bobombProp();
  }
  if (id === "injured" || INJURED_CLIPS.includes(id as (typeof INJURED_CLIPS)[number])) {
    return injuredProp(id);
  }
  if (id === "corpse" || id === "corpse_sit" || id.startsWith("sit_") || id.startsWith("lie_")) {
    return corpseProp(id);
  }
  const crafted = catalogBuilder(id);
  if (crafted) return crafted;
  if (id === "pine" || id === "palm") {
    const trunk = new THREE.Mesh(getGeo("cylinder", { r: 0.12, r2: 0.16, h: h * 0.35, seg: 6 }), matLib.get(0x4a3828, 0.98));
    trunk.position.y = h * 0.18;
    trunk.castShadow = true;
    const crown = new THREE.Mesh(getGeo("cone", { r: w * 0.45, h: h * 0.7, seg: 6 }), matLib.get(col, 1));
    crown.position.y = h * 0.55;
    crown.castShadow = true;
    g.add(trunk, crown);
    return g;
  }
  if (id === "st") {
    for (let i = 0; i < 6; i++) {
      addBox(g, w, 0.14, d / 6, 0.14 * i + 0.07, col);
      g.children[i]!.position.z = (i - 2.5) * (d / 6);
    }
    return g;
  }
  if (id === "dglass" || id === "wins" || id === "showr") {
    const glass = new THREE.Mesh(getGeo("box", { w, h, d }), matLib.glass(def.color, 0.35, 0.08, 0.1));
    glass.position.y = h / 2;
    g.add(glass);
    return g;
  }
  if (lit) {
    const lamp = new THREE.Mesh(getGeo("box", { w, h, d }), matLib.getEmissive(col, col, 1.3));
    lamp.position.y = h / 2;
    g.add(lamp);
    return g;
  }
  addBox(g, w, h, d, h / 2, col, def.category === "meubles" ? 0.7 : 0.88);
  if (id === "sofa" || id === "armch" || id === "sofaL") {
    const cloth = tex.cloth("laineTricot", "laineKnitNrm", 1.8, 1.4, 0.9, col, 0.95);
    g.children[0] && ((g.children[0] as THREE.Mesh).material = cloth);
    addBox(g, w, 0.45, 0.12, h * 0.7, col - 0x101018);
    g.children[1]!.position.z = -d / 2 + 0.08;
    (g.children[1] as THREE.Mesh).material = cloth;
  }
  if (id === "bed" || id === "beds" || id === "hotelbed") {
    addBox(g, w * 0.92, 0.16, d * 0.55, h + 0.08, 0xe8e4dc, 0.9);
  }
  if (id === "fridge" || id === "ward") {
    addBox(g, 0.04, h * 0.7, 0.02, h * 0.55, 0x2a2a2e);
    g.children[1]!.position.x = w * 0.35;
    g.children[1]!.position.z = d / 2 + 0.01;
  }
  if (id === "flagcanada") {
    addBox(g, 0.08, h, 0.08, h / 2, 0x8a8a86);
    addBox(g, 0.9, 0.5, 0.04, h * 0.78, 0xc8102e);
    g.children[1]!.position.x = 0.5;
  }
  if (id === "tlight") {
    addBox(g, 0.28, 0.7, 0.18, h - 0.2, 0x1a1a1e);
    const r = new THREE.Mesh(getGeo("sphere", { r: 0.08, seg: 8 }), matLib.getEmissive(0xff2020, 0xff2020, 1.2));
    r.position.set(0, h - 0.05, 0.12);
    g.add(r);
  }
  if (id === "campfire") {
    const flame = new THREE.Mesh(getGeo("cone", { r: 0.18, h: 0.5, seg: 6 }), matLib.getEmissive(0xff6600, 0xff4010, 1.8));
    flame.position.y = 0.45;
    g.add(flame);
  }
  return g;
}

export const TOTAL_MODELS = Object.keys(MODEL_CATALOG).length;
