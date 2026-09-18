/**
 * Casse-croûte — Chez Ti-Guy et comptoirs de village.
 */
import * as THREE from "three";
import type { BoutiqueGarment } from "./boutique";
import type { ShopItemId } from "./commerce";
import { itemById } from "./commerce";
import type { DepAisleHot } from "./depanneur";
import { spawnShopFood } from "./food";
import { matLib, QC_PALETTE } from "./materials";
import { buildDiningTable } from "./props3d";

export const CASSE_OPEN_FROM = 11;
export const CASSE_OPEN_TO = 23;

export function isCasseOpen(hours: number): boolean {
  return hours >= CASSE_OPEN_FROM && hours < CASSE_OPEN_TO;
}

export function casseHoursLabel(): string {
  return "11 h – 23 h";
}

export const CASSE_AISLES: Array<{
  id: string;
  label: string;
  hint: string;
  items: ShopItemId[];
}> = [
  { id: "menu", label: "Comptoir", hint: "Poutine, steamé, burger.", items: ["poutine", "hotdog", "pizza", "burger"] },
  { id: "tables", label: "Tables", hint: "Plats du jour.", items: ["tourtiere", "pate_chinois", "soupe_pois", "viande_fumee"] },
  { id: "dessert", label: "Desserts", hint: "Pouding, tarte, beigne.", items: ["pouding_chomeur", "tarte_sucre", "beigne"] },
  { id: "boisson", label: "Boissons", hint: "Café, cola, bière.", items: ["cafe", "cola", "biere", "jus_orange"] },
];

export function casseAisleById(id: string) {
  return CASSE_AISLES.find((a) => a.id === id) ?? null;
}

export function catalogForCasseAisle(aisle: string) {
  const spec = casseAisleById(aisle);
  if (!spec || spec.items.length === 0) return [];
  return spec.items.map((id) => itemById(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
}

export function cassePrompt(
  aisle: DepAisleHot | null,
  garment: BoutiqueGarment | null,
  atCaisse: boolean,
  cartN: number,
): string | null {
  if (garment) {
    const item = itemById(garment.itemId);
    if (item) return `E — Au panier · ${item.name} · ${item.price}\u00a0$`;
  }
  if (atCaisse) return cartN > 0 ? `E — Caisse · ${cartN} article${cartN > 1 ? "s" : ""}` : "E — Comptoir · commander";
  if (aisle) return `E — ${aisle.label} · ${aisle.hint}`;
  return null;
}

type WallBox = { minX: number; maxX: number; minZ: number; maxZ: number };

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, metal = 0, rough = 0.72) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(color, rough, metal));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function placeFood(g: THREE.Group, garments: BoutiqueGarment[], id: ShopItemId, x: number, y: number, z: number, scale = 1.2, rot = 0) {
  const food = spawnShopFood(id, new THREE.Vector3(x, y, z), scale, Math.round(x * 13 + z * 7));
  if (!food) return;
  food.rotation.y = rot;
  g.add(food);
  garments.push({ itemId: id, x, z });
}

function menuBoard(text: string, x: number, y: number, z: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1a1c16";
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = "#c45a28";
  ctx.fillRect(0, 0, 512, 48);
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CHEZ TI-GUY", 256, 34);
  ctx.font = "22px sans-serif";
  ctx.textAlign = "left";
  text.split("\n").forEach((line, i) => {
    ctx.fillText(line, 36, 92 + i * 42);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.35), new THREE.MeshBasicMaterial({ map: tex }));
  mesh.position.set(x, y, z);
  return mesh;
}

export function buildCasseInterior() {
  const g = new THREE.Group();
  g.name = "interieur_casse";
  const W = 11.4;
  const D = 10.6;
  const H = 3.05;
  const walls: WallBox[] = [];
  const garments: BoutiqueGarment[] = [];
  const aisles: DepAisleHot[] = [];
  const sits: { x: number; z: number; yaw: number }[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0xc8b090, 0.92, 0.02));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0xe8e0d0, 0.95));
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

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.16, 0.04), matLib.get(0xc45a28, 0.55));
  stripe.position.set(0, 2.28, D / 2 - 0.14);
  g.add(stripe);

  for (const x of [-3.2, 0, 3.2]) {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 0.16), matLib.getEmissive(0xf4f0e0, 0xfff6d8, 0.8));
    tube.position.set(x, H - 0.12, 0);
    g.add(tube);
  }
  const lamp = new THREE.PointLight(0xfff1d4, 1.45, 15, 2);
  lamp.position.set(0, 2.55, 0.2);
  g.add(lamp);

  g.add(box(6.4, 1.12, 0.95, 0.4, 0.56, -3.85, 0x8a9094, 0.22, 0.4));
  g.add(box(6.45, 0.05, 0.98, 0.4, 1.14, -3.85, 0x3a3a3e, 0.3, 0.35));
  const till = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.26), matLib.getEmissive(0x1a3a28, 0x3a8a58, 0.7));
  till.position.set(-1.6, 1.32, -3.65);
  g.add(till);
  walls.push({ minX: -2.9, maxX: 3.7, minZ: -4.4, maxZ: -3.3 });

  aisles.push({
    id: "menu",
    label: "Comptoir",
    hint: "Poutine, steamé, burger.",
    x: 0.4,
    z: -2.85,
    items: ["poutine", "hotdog", "pizza", "burger"],
  });

  placeFood(g, garments, "poutine", -0.4, 1.2, -3.45, 1.35);
  placeFood(g, garments, "hotdog", 0.7, 1.2, -3.45, 1.4);
  placeFood(g, garments, "pizza", 1.7, 1.18, -3.45, 1.35, 0.4);
  placeFood(g, garments, "burger", 2.6, 1.18, -3.45, 1.3);
  placeFood(g, garments, "cafe", -1.5, 1.2, -3.45, 1.15);

  g.add(box(0.85, 1.85, 0.72, -4.55, 0.92, -3.7, 0xd8dde2, 0.35, 0.4));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.55), matLib.glass(0x7ec8e8, 0.4));
  glass.position.set(-4.55, 1.05, -3.32);
  g.add(glass);
  placeFood(g, garments, "cola", -4.55, 1.35, -3.45, 1.2);
  placeFood(g, garments, "biere", -4.55, 0.85, -3.45, 1.15);
  aisles.push({
    id: "boisson",
    label: "Boissons",
    hint: "Café, cola, bière.",
    x: -3.6,
    z: -3.2,
    items: ["cafe", "cola", "biere", "jus_orange"],
  });

  const tables: Array<{ x: number; z: number; yaw: number; foods: ShopItemId[] }> = [
    { x: -2.8, z: 1.6, yaw: 0.12, foods: ["tourtiere", "soupe_pois"] },
    { x: 0.2, z: 2.15, yaw: -0.08, foods: ["pate_chinois", "pouding_chomeur"] },
    { x: 3.0, z: 1.4, yaw: 0.2, foods: ["viande_fumee", "tarte_sucre"] },
  ];
  for (const t of tables) {
    const tbl = buildDiningTable();
    tbl.position.set(t.x, 0, t.z);
    tbl.rotation.y = t.yaw;
    tbl.scale.set(0.72, 1, 0.72);
    g.add(tbl);
    walls.push({ minX: t.x - 0.85, maxX: t.x + 0.85, minZ: t.z - 0.5, maxZ: t.z + 0.5 });
    t.foods.forEach((id, i) => {
      placeFood(g, garments, id, t.x + (i - 0.4) * 0.38, 0.8, t.z, 1.05, t.yaw);
    });
    sits.push({ x: t.x - 0.55, z: t.z + 0.55, yaw: t.yaw + Math.PI });
    sits.push({ x: t.x + 0.55, z: t.z - 0.55, yaw: t.yaw });
  }
  aisles.push({
    id: "tables",
    label: "Tables",
    hint: "Plats du jour.",
    x: 0.2,
    z: 1.7,
    items: ["tourtiere", "pate_chinois", "soupe_pois", "viande_fumee"],
  });
  aisles.push({
    id: "dessert",
    label: "Desserts",
    hint: "Pouding, tarte, beigne.",
    x: 3.0,
    z: 1.4,
    items: ["pouding_chomeur", "tarte_sucre", "beigne"],
  });

  g.add(menuBoard("Poutine extra    9,50 $\nSteamé            3,50 $\nBurger bacon     14,50 $\nPointe pizza      5,75 $\nPouding chômeur   6,00 $", -4.95, 1.85, 0.4));
  const board = g.children[g.children.length - 1] as THREE.Mesh;
  board.rotation.y = Math.PI / 2;

  const exitPlate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.08), matLib.getEmissive(0x8fa8b8, 0xc8dce8, 0.28));
  exitPlate.position.set(0, 1.15, D / 2 - 0.14);
  g.add(exitPlate);

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, D / 2 - 1.85),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.5),
    walls,
    title: "Chez Ti-Guy",
    subtitle: "Casse-croûte · 11 h – 23 h",
    garments,
    caisse: { x: -1.6, z: -3.7 },
    aisles,
    sits,
  };
}
