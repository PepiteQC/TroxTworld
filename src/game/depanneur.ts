/**
 * Dépanneur du comté — coquille, rayons, frigos, caisse, loterie, pompes.
 */
import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { finishMap } from "./textures";
import type { ShopItemId, ShopSpot } from "./commerce";
import { itemById, shopNameFor } from "./commerce";
import type { BoutiqueGarment } from "./boutique";
import { villageCivicSpot, VILLAGES } from "./worlddata";

type WallBox = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type DepAisle =
  | "caisse"
  | "frigo"
  | "rayon"
  | "loterie"
  | "tabac"
  | "biere"
  | "cafe"
  | "atm"
  | "arriere";

export interface DepAisleHot {
  id: DepAisle;
  label: string;
  hint: string;
  x: number;
  z: number;
  items: ShopItemId[];
}

export const DEP_AISLES: Array<{
  id: DepAisle;
  label: string;
  hint: string;
  items: ShopItemId[];
}> = [
  { id: "caisse", label: "Comptoir", hint: "Caisse, steamé, journal.", items: ["hotdog", "journal"] },
  { id: "frigo", label: "Frigos", hint: "Lait, cola, œufs.", items: ["lait", "cola", "oeufs", "lait_rang"] },
  { id: "rayon", label: "Rayons", hint: "Chips, pain, patates.", items: ["chips", "pain", "beurre", "patate"] },
  { id: "loterie", label: "Loterie", hint: "Loto-Québec.", items: ["loto"] },
  { id: "tabac", label: "Tabac", hint: "Derrière le comptoir.", items: ["tabac"] },
  { id: "biere", label: "Frigo du fond", hint: "Bière froide.", items: ["biere"] },
  { id: "cafe", label: "Café", hint: "Urne, slush, barre glacée.", items: ["cafe", "slush", "glace"] },
  { id: "atm", label: "Guichet", hint: "Desjardins.", items: [] },
  { id: "arriere", label: "Arrière-boutique", hint: "Stock, personnel.", items: [] },
];

export const DEP_OPEN_FROM = 6;
export const DEP_OPEN_TO = 23;

export function isDepOpen(hours: number): boolean {
  return hours >= DEP_OPEN_FROM && hours < DEP_OPEN_TO;
}

export function depHoursLabel(): string {
  return "6 h – 23 h";
}

export function depMapMarks() {
  return VILLAGES.map((v) => {
    const p = villageCivicSpot(v, "shop");
    return { id: `shop_${v.id}`, name: shopNameFor(v), x: p.x, z: p.z };
  });
}

export function aisleById(id: string) {
  return DEP_AISLES.find((a) => a.id === id) ?? null;
}

export function catalogForAisle(aisle: string) {
  const spec = aisleById(aisle);
  if (!spec || spec.items.length === 0) return [];
  return spec.items.map((id) => itemById(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
}

export function shopDoorOffset(s: Pick<ShopSpot, "x" | "z" | "yaw">, front = 4.35) {
  return {
    x: s.x + Math.sin(s.yaw) * front,
    z: s.z + Math.cos(s.yaw) * front,
    yaw: s.yaw,
  };
}

export function shopPumpOffset(s: Pick<ShopSpot, "x" | "z" | "yaw">, front = 10.4) {
  return {
    x: s.x + Math.sin(s.yaw) * front,
    z: s.z + Math.cos(s.yaw) * front,
  };
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: number,
  metal = 0,
  rough = 0.72,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(color, rough, metal));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function productCard(id: ShopItemId, x: number, y: number, z: number, rotY = 0) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x22242c, roughness: 0.55 });
  const loader = new THREE.TextureLoader();
  loader.load(`/products/${id}.jpg`, (tex) => {
    finishMap(tex, "clamp");
    mat.map = tex;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.48), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  return m;
}

function coolerBank(x: number, z: number, n: number, yaw: number, glass = 0x7ec8e8) {
  const g = new THREE.Group();
  const w = n * 0.92;
  g.add(box(w + 0.12, 2.05, 0.78, x, 1.05, z, 0xd8dde2, 0.45, 0.35));
  for (let i = 0; i < n; i++) {
    const px = x - w / 2 + 0.46 + i * 0.92;
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 1.72),
      matLib.get(glass, 0.12, 0.55),
    );
    (door.material as THREE.MeshStandardMaterial).transparent = true;
    (door.material as THREE.MeshStandardMaterial).opacity = 0.42;
    door.position.set(px, 1.12, z + 0.41);
    g.add(door);
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.42, 0.04),
      matLib.get(0xc8ccd0, 0.25, 0.8),
    );
    handle.position.set(px + 0.28, 1.12, z + 0.44);
    g.add(handle);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.04, 0.04),
      matLib.getEmissive(0xc8e8ff, 0xa8d4f0, 0.55),
    );
    strip.position.set(px, 1.98, z + 0.4);
    g.add(strip);
  }
  g.rotation.y = yaw;
  return g;
}

function gondola(x: number, z: number, len: number) {
  const g = new THREE.Group();
  g.add(box(len, 1.42, 0.72, x, 0.74, z, 0xc8b090, 0.05, 0.82));
  g.add(box(len, 0.04, 0.76, x, 0.52, z, 0xb8a078));
  g.add(box(len, 0.04, 0.76, x, 0.98, z, 0xb8a078));
  g.add(box(len, 0.04, 0.76, x, 1.38, z, 0xb8a078));
  g.add(box(0.04, 1.42, 0.76, x - len / 2, 0.74, z, 0x8a8070, 0.2, 0.5));
  g.add(box(0.04, 1.42, 0.76, x + len / 2, 0.74, z, 0x8a8070, 0.2, 0.5));
  return g;
}

function poster(text: string, color: string, x: number, y: number, z: number, w = 0.7, h = 0.95) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, 128, 160 + (i - (lines.length - 1) / 2) * 44);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z);
  return m;
}

export function buildDepanneurInterior() {
  const g = new THREE.Group();
  g.name = "interieur_depanneur";
  const W = 12.6;
  const D = 11.4;
  const H = 3.15;
  const walls: WallBox[] = [];
  const garments: BoutiqueGarment[] = [];
  const aisles: DepAisleHot[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0xc4b49a, 0.92, 0.02));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const tiles = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, D - 0.4), matLib.get(0xd8c8a8, 0.88, 0));
  tiles.rotation.x = -Math.PI / 2;
  tiles.position.y = 0.01;
  g.add(tiles);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0xe8e4d8, 0.95));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  const wallCol = QC_PALETTE.boisCreme;
  g.add(box(W, H, 0.22, 0, H / 2, -D / 2, wallCol));
  g.add(box(W, H, 0.22, 0, H / 2, D / 2, wallCol));
  g.add(box(0.22, H, D, -W / 2, H / 2, 0, wallCol));
  g.add(box(0.22, H, D, W / 2, H / 2, 0, wallCol));
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.14, maxZ: -D / 2 + 0.14 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.14, maxZ: D / 2 + 0.14 });
  walls.push({ minX: -W / 2 - 0.14, maxX: -W / 2 + 0.14, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.14, maxX: W / 2 + 0.14, minZ: -D / 2, maxZ: D / 2 });

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.18, 0.04), matLib.get(0xc03028, 0.55));
  stripe.position.set(0, 2.35, D / 2 - 0.14);
  g.add(stripe);

  for (const x of [-3.6, 0, 3.6]) {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.06, 0.18),
      matLib.getEmissive(0xf4f0e0, 0xfff6d8, 0.85),
    );
    tube.position.set(x, H - 0.12, 0.2);
    g.add(tube);
  }
  const lampA = new THREE.PointLight(0xfff4dc, 1.55, 16, 2);
  lampA.position.set(0, 2.7, 0.4);
  g.add(lampA);
  const lampB = new THREE.PointLight(0xe8f0ff, 0.55, 10, 2);
  lampB.position.set(-4.2, 2.4, -3.2);
  g.add(lampB);

  g.add(coolerBank(-4.85, -0.4, 4, 0));
  walls.push({ minX: -5.9, maxX: -3.8, minZ: -2.3, maxZ: 1.5 });
  aisles.push({
    id: "frigo",
    label: "Frigos",
    hint: "Lait, cola, œufs.",
    x: -3.6,
    z: -0.4,
    items: ["lait", "cola", "oeufs", "lait_rang"],
  });

  g.add(coolerBank(-1.1, -4.85, 5, 0, 0x4a6a48));
  walls.push({ minX: -3.5, maxX: 1.3, minZ: -5.5, maxZ: -4.2 });
  aisles.push({
    id: "biere",
    label: "Frigo du fond",
    hint: "Bière froide.",
    x: -1.1,
    z: -3.9,
    items: ["biere"],
  });

  g.add(gondola(-1.15, 1.35, 4.4));
  g.add(gondola(1.85, 1.35, 3.6));
  walls.push({ minX: -3.4, maxX: 1.1, minZ: 0.95, maxZ: 1.75 });
  walls.push({ minX: 0.05, maxX: 3.7, minZ: 0.95, maxZ: 1.75 });
  aisles.push({
    id: "rayon",
    label: "Rayons",
    hint: "Chips, pain, patates.",
    x: 0.2,
    z: 1.35,
    items: ["chips", "pain", "beurre", "patate"],
  });

  g.add(box(3.6, 1.12, 0.92, 3.85, 0.56, -3.55, 0x3a3a3e, 0.15, 0.45));
  g.add(box(3.65, 0.06, 0.96, 3.85, 1.14, -3.55, 0x2a2a2e, 0.3, 0.35));
  const till = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.28), matLib.getEmissive(0x1a3a28, 0x3a8a58, 0.7));
  till.position.set(3.2, 1.34, -3.35);
  g.add(till);
  const loto = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.22), matLib.getEmissive(0x1a3a7a, 0x3a6ad0, 0.8));
  loto.position.set(4.45, 1.42, -3.4);
  g.add(loto);
  walls.push({ minX: 2.0, maxX: 5.7, minZ: -4.15, maxZ: -3.0 });
  aisles.push({
    id: "caisse",
    label: "Comptoir",
    hint: "Caisse, steamé.",
    x: 3.4,
    z: -2.7,
    items: ["hotdog", "journal"],
  });
  aisles.push({
    id: "loterie",
    label: "Loterie",
    hint: "Loto-Québec.",
    x: 4.45,
    z: -2.7,
    items: ["loto"],
  });
  aisles.push({
    id: "tabac",
    label: "Tabac",
    hint: "Derrière le comptoir.",
    x: 5.15,
    z: -3.9,
    items: ["tabac"],
  });

  g.add(box(0.72, 1.05, 0.72, 5.15, 0.54, -1.15, 0x8a9094, 0.4, 0.35));
  const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.42, 10), matLib.get(0x2a2a2e, 0.3, 0.6));
  urn.position.set(5.15, 1.28, -1.15);
  g.add(urn);
  const slush = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.5, 10), matLib.getEmissive(0xc03050, 0xe04060, 0.35));
  slush.position.set(5.15, 1.32, -0.55);
  g.add(slush);
  aisles.push({
    id: "cafe",
    label: "Café",
    hint: "Urne, slush.",
    x: 4.4,
    z: -0.85,
    items: ["cafe", "slush", "glace"],
  });

  g.add(box(0.7, 1.45, 0.28, 5.85, 0.85, 2.4, 0x1a3a32, 0.25, 0.4));
  const atmGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), matLib.getEmissive(0x8ad0a0, 0x8ad0a0, 0.7));
  atmGlow.position.set(5.7, 1.15, 2.4);
  atmGlow.rotation.y = -Math.PI / 2;
  g.add(atmGlow);
  aisles.push({
    id: "atm",
    label: "Guichet",
    hint: "Desjardins.",
    x: 4.9,
    z: 2.4,
    items: [],
  });

  const ice = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 0.72), matLib.get(0xe8eef2, 0.25, 0.15));
  ice.position.set(-4.7, 0.44, 3.55);
  ice.castShadow = true;
  g.add(ice);
  const iceLid = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.04, 0.68), matLib.get(0xa8d0e8, 0.15, 0.45));
  iceLid.position.set(-4.7, 0.9, 3.55);
  g.add(iceLid);

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.15, 0.08), matLib.get(QC_PALETTE.porte, 0.85));
  back.position.set(5.4, 1.1, -5.55);
  g.add(back);
  aisles.push({
    id: "arriere",
    label: "Arrière-boutique",
    hint: "Personnel.",
    x: 4.6,
    z: -4.85,
    items: [],
  });

  g.add(poster("LOTO\nQUÉBEC", "#1a3a7a", 2.4, 1.85, -D / 2 + 0.14));
  g.add(poster("BIÈRE\nFROIDE", "#2a4a28", -4.9, 2.05, -D / 2 + 0.14));
  g.add(poster("OUVERT", "#c03028", -2.2, 2.55, D / 2 - 0.14, 1.1, 0.38));

  const spots: Array<{ id: ShopItemId; x: number; z: number; y?: number; rot?: number }> = [
    { id: "lait", x: -4.9, z: 0.6, y: 1.35 },
    { id: "cola", x: -4.9, z: -0.2, y: 1.35 },
    { id: "oeufs", x: -4.9, z: -1.1, y: 1.35 },
    { id: "chips", x: -2.2, z: 1.75, y: 1.22 },
    { id: "pain", x: -0.4, z: 1.75, y: 1.22 },
    { id: "patate", x: 1.4, z: 1.75, y: 1.22 },
    { id: "beurre", x: 2.6, z: 1.75, y: 1.22 },
    { id: "biere", x: -1.1, z: -4.4, y: 1.35 },
    { id: "cafe", x: 5.15, z: -1.15, y: 1.55 },
    { id: "slush", x: 5.15, z: -0.55, y: 1.62 },
    { id: "glace", x: -4.7, z: 3.55, y: 1.05 },
    { id: "hotdog", x: 3.85, z: -3.05, y: 1.35 },
    { id: "journal", x: 2.85, z: -3.05, y: 1.28 },
    { id: "loto", x: 4.45, z: -3.05, y: 1.55 },
    { id: "tabac", x: 5.2, z: -3.9, y: 1.55 },
    { id: "sirop", x: 0.8, z: 1.75, y: 1.22 },
  ];
  for (const s of spots) {
    g.add(productCard(s.id, s.x, s.y ?? 1.28, s.z + 0.06, s.rot ?? 0));
    garments.push({ itemId: s.id, x: s.x, z: s.z });
  }

  const exitPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.2, 0.08),
    matLib.getEmissive(0x8fa8b8, 0xc8dce8, 0.32),
  );
  exitPlate.position.set(0, 1.15, D / 2 - 0.14);
  g.add(exitPlate);

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, D / 2 - 1.85),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.5),
    walls,
    title: "Dépanneur",
    subtitle: "Comptoir · frigos · loterie · 6 h – 23 h",
    garments,
    caisse: { x: 3.85, z: -3.55 },
    aisles,
    atmSpot: { x: 5.2, z: 2.4 },
    backRoom: { x: 5.2, z: -5.1 },
  };
}

export function depPrompt(
  aisle: DepAisleHot | null,
  garment: BoutiqueGarment | null,
  atCaisse: boolean,
  atAtm: boolean,
  atBack: boolean,
  cartN: number,
  owner: boolean,
): string | null {
  if (garment) {
    const item = itemById(garment.itemId);
    if (item) return `E — Au panier · ${item.name} · ${item.price}\u00a0$`;
  }
  if (atCaisse) return cartN > 0 ? `E — Caisse · ${cartN} article${cartN > 1 ? "s" : ""}` : "E — Caisse · panier vide";
  if (atAtm) return "E — Guichet Desjardins";
  if (atBack) return owner ? "E — Stock · arrière-boutique" : "Personnel seulement";
  if (aisle) {
    if (aisle.id === "atm") return "E — Guichet Desjardins";
    if (aisle.id === "arriere") return owner ? "E — Stock · arrière-boutique" : "Personnel seulement";
    if (aisle.id === "caisse") return cartN > 0 ? `E — Caisse · ${cartN} article${cartN > 1 ? "s" : ""}` : "E — Comptoir";
    return `E — ${aisle.label} · ${aisle.hint}`;
  }
  return null;
}
