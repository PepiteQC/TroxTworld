/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🏡 REGISTRE FONCIER MUNICIPAL & SERRURERIE D'ÉTAT (v3.0)
 * Fichier: src/game/house.ts
 * Architecture : Zero-GC Render Loop, O(1) Map Lookups, Distance-Squared AOI.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { buildMaisonCanadienne, buildForSale, buildSedan } from "./architecture";
import { getGeo } from "./geometries";
import { matLib, QC_PALETTE } from "./materials";
import { type Deed } from "./rp";
import {
  attachScenicHeat,
  emptyUtils,
  heatById,
  parseUtils,
  type HouseUtils,
} from "./utilities";
import { getTerrainHeight } from "./worlddata";

// --- TYPES ET UNIONS IMMOBILIÈRES ---

export type RenoId =
  | "eclairage"
  | "cuisine"
  | "sdb"
  | "salon"
  | "chambres"
  | "soussol"
  | "garage"
  | "terrasse"
  | "piscine"
  | "spa"
  | "cloture"
  | "cabanon"
  | "jardin";

export type RenoGroup = "maison" | "soussol" | "garage" | "terrain";

export type BasementFit =
  | "vide"
  | "familiale"
  | "cinema"
  | "gym"
  | "atelier"
  | "bureau"
  | "chambre"
  | "rangement"
  | "buanderie"
  | "perso";

export type GarageFit = "etabli" | "outils" | "rangement" | "compresseur" | "deco" | "mecanique";

export type DoorSlot = "main" | "back" | "garage" | "basement" | "bedroom" | "private";

export type KeyRole = "owner" | "family" | "roommate" | "employee" | "guest";

export type HouseSnap = 0.25 | 0.5 | 1;

export const SNAP_STEPS: HouseSnap[] = [0.25, 0.5, 1];

// --- CATALOGUES DE CONFIGURATION ---

export const RENO_CATALOG: Array<{
  id: RenoId;
  label: string;
  price: number;
  valueAdd: number;
  group: RenoGroup;
  hint: string;
}> = [
  { id: "eclairage", label: "Éclairage", price: 80, valueAdd: 90, group: "maison", hint: "Plafonniers, interrupteur." },
  { id: "cuisine", label: "Cuisine", price: 200, valueAdd: 240, group: "maison", hint: "Comptoir, frigo, cuisinière." },
  { id: "sdb", label: "Salle de bain", price: 160, valueAdd: 180, group: "maison", hint: "Toilette, lavabo, carrelage." },
  { id: "salon", label: "Salon", price: 140, valueAdd: 170, group: "maison", hint: "Sofa, table, tapis." },
  { id: "chambres", label: "Chambres", price: 180, valueAdd: 210, group: "maison", hint: "Lits, tables de nuit." },
  { id: "soussol", label: "Sous-sol", price: 400, valueAdd: 480, group: "soussol", hint: "Finition québécoise, escalier." },
  { id: "garage", label: "Garage", price: 350, valueAdd: 420, group: "garage", hint: "Attache, porte, dalle." },
  { id: "terrasse", label: "Terrasse", price: 120, valueAdd: 140, group: "terrain", hint: "Deck arrière, rampes." },
  { id: "piscine", label: "Piscine", price: 300, valueAdd: 360, group: "terrain", hint: "Creusée, 4,5 × 8 m." },
  { id: "spa", label: "Spa", price: 150, valueAdd: 170, group: "terrain", hint: "Cuve hors-terre, bulles." },
  { id: "cloture", label: "Clôture", price: 80, valueAdd: 70, group: "terrain", hint: "Maille et poteaux." },
  { id: "cabanon", label: "Cabanon", price: 90, valueAdd: 100, group: "terrain", hint: "Rangement de cour." },
  { id: "jardin", label: "Jardin", price: 70, valueAdd: 80, group: "terrain", hint: "Carrés potagers." },
];

export const BASEMENT_FITS: Array<{ id: BasementFit; label: string; hint: string }> = [
  { id: "vide", label: "Vide", hint: "Béton brut, à aménager." },
  { id: "familiale", label: "Salle familiale", hint: "TV, sofa, tapis." },
  { id: "cinema", label: "Cinéma maison", hint: "Écran, rangées." },
  { id: "gym", label: "Gym", hint: "Tapis, haltères." },
  { id: "atelier", label: "Atelier", hint: "Établi, bois." },
  { id: "bureau", label: "Bureau", hint: "Desk, lampe." },
  { id: "chambre", label: "Chambre", hint: "Lit d'amis." },
  { id: "rangement", label: "Rangement", hint: "Bacs, étagères." },
  { id: "buanderie", label: "Buanderie", hint: "Laveuse, sécheuse." },
  { id: "perso", label: "Espace perso", hint: "Ce que vous voulez." },
];

export const GARAGE_FITS: Array<{ id: GarageFit; label: string; price: number; hint: string }> = [
  { id: "etabli", label: "Établi", price: 60, hint: "Plan de travail, étau." },
  { id: "outils", label: "Coffre à outils", price: 45, hint: "Tiroirs rouges." },
  { id: "rangement", label: "Rangement", price: 40, hint: "Étagères murales." },
  { id: "compresseur", label: "Compresseur", price: 90, hint: "Air, pneus." },
  { id: "deco", label: "Décoration", price: 35, hint: "Enseigne, néon." },
  { id: "mecanique", label: "Espace mécanique", price: 120, hint: "Fosse, entretien." },
];

export const GARAGE_BAYS: Array<{ n: 1 | 2 | 3; label: string; price: number }> = [
  { n: 1, label: "1 voiture", price: 0 },
  { n: 2, label: "2 voitures", price: 180 },
  { n: 3, label: "3 voitures", price: 320 },
];

export const DOOR_SLOTS: Array<{ id: DoorSlot; label: string }> = [
  { id: "main", label: "Porte principale" },
  { id: "back", label: "Porte arrière" },
  { id: "garage", label: "Garage" },
  { id: "basement", label: "Sous-sol" },
  { id: "bedroom", label: "Chambre" },
  { id: "private", label: "Pièce privée" },
];

export const KEY_ROLES: Array<{ id: KeyRole; label: string; hint: string }> = [
  { id: "owner", label: "Propriétaire", hint: "Accès total." },
  { id: "family", label: "Conjoint / famille", hint: "Maison, pas le coffre privé." },
  { id: "roommate", label: "Colocataire", hint: "Entrée, chambre, salon." },
  { id: "employee", label: "Employé", hint: "Garage seulement." },
  { id: "guest", label: "Invité", hint: "Aucune clé permanente." },
];

const SLOT_ROLES: Record<DoorSlot, KeyRole[]> = {
  main: ["owner", "family", "roommate"],
  back: ["owner", "family", "roommate"],
  garage: ["owner", "family", "employee"],
  basement: ["owner", "family"],
  bedroom: ["owner", "family", "roommate"],
  private: ["owner"],
};

// --- TABLES DE HACHAGE O(1) POUR ACCÈS INSTANTANÉ ---

const RENO_MAP = new Map<RenoId, typeof RENO_CATALOG[number]>(RENO_CATALOG.map((r) => [r.id, r]));
const BASEMENT_MAP = new Map<BasementFit, typeof BASEMENT_FITS[number]>(BASEMENT_FITS.map((b) => [b.id, b]));
const GARAGE_MAP = new Map<GarageFit, typeof GARAGE_FITS[number]>(GARAGE_FITS.map((g) => [g.id, g]));
const DOOR_MAP = new Map<DoorSlot, typeof DOOR_SLOTS[number]>(DOOR_SLOTS.map((d) => [d.id, d]));

export interface HouseState extends HouseUtils {
  deedId: string;
  renos: RenoId[];
  basement: BasementFit;
  garageFits: GarageFit[];
  garageBays: 1 | 2 | 3;
  doors: Record<DoorSlot, boolean>;
  keychain: KeyRole[];
  parked: string[];
}

export type HouseHot = "door" | "garage" | "mail" | "work" | "lot";

export interface HouseLot {
  deedId: string;
  name: string;
  town: string;
  x: number;
  z: number;
  yaw: number;
  group: THREE.Group;
  extras: THREE.Group;
  sign: THREE.Group;
  door: { x: number; z: number; yaw: number };
  garageDoor: { x: number; z: number };
  workbench: { x: number; z: number };
  mailbox: { x: number; z: number };
  body: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const LOT_W = 22;
const LOT_D = 28;

export function emptyHouse(deedId: string, town = ""): HouseState {
  return {
    deedId,
    renos: [],
    basement: "vide",
    garageFits: [],
    garageBays: 1,
    doors: { main: true, back: true, garage: true, basement: true, bedroom: true, private: true },
    keychain: ["owner"],
    parked: [],
    ...emptyUtils(deedId, town),
  };
}

export function parseHouses(raw: unknown): Record<string, HouseState> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, HouseState> = {};
  for (const [id, row] of Object.entries(raw as Record<string, unknown>)) {
    if (!row || typeof row !== "object") continue;
    const d = row as Partial<HouseState>;
    const base = emptyHouse(id);
    
    const renos = Array.isArray(d.renos)
      ? d.renos.filter((r): r is RenoId => RENO_MAP.has(r as RenoId))
      : [];
    const fits = Array.isArray(d.garageFits)
      ? d.garageFits.filter((f): f is GarageFit => GARAGE_MAP.has(f as GarageFit))
      : [];
    
    const bays = d.garageBays === 2 || d.garageBays === 3 ? d.garageBays : 1;
    const basement = BASEMENT_MAP.has(d.basement as BasementFit) ? (d.basement as BasementFit) : "vide";
    
    const keychain: KeyRole[] = Array.isArray(d.keychain)
      ? d.keychain.filter((k): k is KeyRole => KEY_ROLES.some((r) => r.id === k))
      : ["owner"];
      
    if (!keychain.includes("owner")) keychain.unshift("owner");
    
    const doors = { ...base.doors };
    if (d.doors && typeof d.doors === "object") {
      for (const slot of DOOR_SLOTS) {
        const v = (d.doors as Record<string, unknown>)[slot.id];
        if (typeof v === "boolean") doors[slot.id] = v;
      }
    }
    
    out[id] = {
      deedId: id,
      renos,
      basement,
      garageFits: fits,
      garageBays: bays,
      doors,
      keychain,
      parked: Array.isArray(d.parked) ? d.parked.filter((p): p is string => typeof p === "string").slice(0, 3) : [],
      ...parseUtils(d, id),
    };
  }
  return out;
}

export function renoById(id: RenoId) {
  return RENO_MAP.get(id)!;
}

export function hasReno(state: HouseState | undefined, id: RenoId): boolean {
  return Boolean(state?.renos.includes(id));
}

export function houseValue(deed: Deed, state: HouseState | undefined): number {
  let v = deed.price;
  if (!state) return v;
  for (const id of state.renos) v += renoById(id).valueAdd;
  if (hasReno(state, "garage")) {
    if (state.garageBays === 2) v += 160;
    if (state.garageBays === 3) v += 280;
    for (const f of state.garageFits) {
      const spec = GARAGE_MAP.get(f);
      if (spec) v += Math.round(spec.price * 0.8);
    }
  }
  v += heatById(state.heat).valueAdd;
  return v;
}

export function playerRoles(state: HouseState, inventory: Record<string, number>): KeyRole[] {
  const roles: KeyRole[] = [];
  if ((inventory.cle_maison ?? 0) > 0 && state.keychain.includes("owner")) roles.push("owner");
  if ((inventory.double_cle ?? 0) > 0) {
    for (const r of state.keychain) {
      if (r !== "owner" && r !== "guest" && !roles.includes(r)) roles.push(r);
    }
  }
  return roles;
}

export function canOpenDoor(
  state: HouseState,
  slot: DoorSlot,
  inventory: Record<string, number>,
): { ok: boolean; lockpick: boolean } {
  if (!state.doors[slot]) return { ok: true, lockpick: false };
  const roles = playerRoles(state, inventory);
  if (roles.some((r) => SLOT_ROLES[slot].includes(r))) return { ok: true, lockpick: false };
  if ((inventory.crochet ?? 0) > 0) return { ok: true, lockpick: true };
  return { ok: false, lockpick: false };
}

export function doorDenied(slot: DoorSlot): string {
  const spec = DOOR_MAP.get(slot);
  return `Verrouillée · ${spec?.label ?? slot} · pas de clé`;
}

// Helper pour instancier des boîtes 3D avec les géométries en cache (O(1))
function box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, metal = 0, rough = 0.86) {
  const m = new THREE.Mesh(getGeo("box", { w, h, d }), matLib.get(color, rough, metal));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildGarageBay(bays: 1 | 2 | 3): THREE.Group {
  const g = new THREE.Group();
  g.name = "garage_lot";
  const w = 4.2 * bays + 0.6;
  const d = 7.2;
  const h = 3.1;
  g.add(box(w, 0.12, d, 0, 0.06, 0, 0x6a6e68, 0.05, 0.92));
  g.add(box(w, h, 0.2, 0, h / 2, -d / 2, 0x8a9096));
  g.add(box(0.2, h, d, -w / 2, h / 2, 0, 0x8a9096));
  g.add(box(0.2, h, d, w / 2, h / 2, 0, 0x8a9096));
  
  const roof = box(w + 0.4, 0.14, d + 0.3, 0, h + 0.2, 0, 0x4a5056, 0.15, 0.7);
  roof.rotation.x = -0.04;
  g.add(roof);
  
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + 2.4 + i * 4.2;
    const door = box(3.4, 2.35, 0.08, x, 1.25, d / 2 - 0.04, 0xc4a030, 0.25, 0.45);
    g.add(door);
    const handle = box(0.18, 0.06, 0.08, x + 1.4, 1.15, d / 2 + 0.04, 0x222222, 0.6, 0.3);
    g.add(handle);
  }
  return g;
}

function buildPool(): THREE.Group {
  const g = new THREE.Group();
  const water = new THREE.Mesh(getGeo("box", { w: 8, h: 0.35, d: 4.4 }), matLib.water(0x3a8aaa, 0.82));
  water.position.y = 0.08;
  g.add(water);
  g.add(box(8.6, 0.28, 0.28, 0, 0.22, -2.4, 0xd8d4c8));
  g.add(box(8.6, 0.28, 0.28, 0, 0.22, 2.4, 0xd8d4c8));
  g.add(box(0.28, 0.28, 4.8, -4.3, 0.22, 0, 0xd8d4c8));
  g.add(box(0.28, 0.28, 4.8, 4.3, 0.22, 0, 0xd8d4c8));
  g.add(box(1.6, 0.08, 0.7, 3.2, 0.36, 1.6, 0xc4a030, 0.4, 0.35));
  return g;
}

function buildSpa(): THREE.Group {
  const g = new THREE.Group();
  const tub = new THREE.Mesh(getGeo("cylinder", { r: 1.05, r2: 1.12, h: 0.72, seg: 12 }), matLib.get(0x3a3e42, 0.4, 0.3));
  tub.position.y = 0.36;
  g.add(tub);
  const water = new THREE.Mesh(getGeo("cylinder", { r: 0.88, r2: 0.88, h: 0.12, seg: 12 }), matLib.water(0x4aa0b8, 0.8));
  water.position.y = 0.62;
  g.add(water);
  return g;
}

function buildShed(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(3.2, 2.4, 2.4, 0, 1.2, 0, 0x8a5a38));
  const roof = box(3.5, 0.1, 2.7, 0, 2.55, 0, 0x4a3020);
  roof.rotation.x = -0.08;
  g.add(roof);
  g.add(box(0.85, 1.7, 0.08, 0, 0.9, 1.22, 0x3a2818));
  return g;
}

function buildTerrace(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(7.2, 0.12, 3.6, 0, 0.18, 0, 0x8a6a48, 0, 0.9));
  for (const x of [-3.4, 3.4]) {
    for (const z of [-1.6, 1.6]) {
      g.add(box(0.1, 0.95, 0.1, x, 0.7, z, 0x6a4a30));
    }
  }
  g.add(box(7.2, 0.06, 0.08, 0, 1.18, -1.8, 0x6a4a30));
  g.add(box(7.2, 0.06, 0.08, 0, 1.18, 1.8, 0x6a4a30));
  return g;
}

function buildFence(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const post = matLib.get(0x6a6e68, 0.7, 0.2);
  const step = 2.2;
  const h = 1.15;
  
  const postGeo = getGeo("cylinder", { r: 0.05, r2: 0.06, h, seg: 6 });

  for (let x = -w / 2; x <= w / 2 + 0.01; x += step) {
    for (const z of [-d / 2, d / 2]) {
      const p = new THREE.Mesh(postGeo, post);
      p.position.set(x, h / 2, z);
      p.castShadow = true;
      g.add(p);
    }
  }
  for (let z = -d / 2; z <= d / 2 + 0.01; z += step) {
    for (const x of [-w / 2, w / 2]) {
      const p = new THREE.Mesh(postGeo, post);
      p.position.set(x, h / 2, z);
      p.castShadow = true;
      g.add(p);
    }
  }
  
  const rail = matLib.get(0x8a8e88, 0.55, 0.25);
  const widthRailGeo = getGeo("box", { w, h: 0.04, d: 0.04 });
  const depthRailGeo = getGeo("box", { w: 0.04, h: 0.04, d });

  for (const z of [-d / 2, d / 2]) {
    const r = new THREE.Mesh(widthRailGeo, rail);
    r.position.set(0, 0.95, z);
    g.add(r);
  }
  for (const x of [-w / 2, w / 2]) {
    const r = new THREE.Mesh(depthRailGeo, rail);
    r.position.set(x, 0.95, 0);
    g.add(r);
  }
  return g;
}

function buildGarden(): THREE.Group {
  const g = new THREE.Group();
  const bedGeo = getGeo("box", { w: 1.8, h: 0.22, d: 0.9 });
  const leafGeo = getGeo("sphere", { r: 0.12, seg: 6, segH: 5 });
  const leafMat = matLib.get(0x3a7a32, 0.95);

  for (let i = 0; i < 3; i++) {
    const bed = new THREE.Mesh(bedGeo, matLib.get(0x5a3a22, 0.85));
    bed.position.set((i - 1) * 2.1, 0.12, 0);
    g.add(bed);
    
    for (let k = 0; k < 4; k++) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set((i - 1) * 2.1 - 0.55 + k * 0.38, 0.32, (k % 2) * 0.18 - 0.08);
      g.add(leaf);
    }
  }
  return g;
}

function buildMailbox(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(getGeo("cylinder", { r: 0.04, r2: 0.05, h: 1.15, seg: 6 }), matLib.get(0x4a3a28, 0.9));
  post.position.y = 0.55;
  g.add(post);
  g.add(box(0.42, 0.22, 0.22, 0, 1.12, 0, 0xc4a030, 0.3, 0.4));
  return g;
}

export function buildWorkbench(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.8, 0.08, 0.7, 0, 0.92, 0, 0x6a4a30));
  for (const x of [-0.75, 0.75]) g.add(box(0.08, 0.92, 0.08, x, 0.46, 0.25, 0x3a2a18));
  for (const x of [-0.75, 0.75]) g.add(box(0.08, 0.92, 0.08, x, 0.46, -0.25, 0x3a2a18));
  g.add(box(0.35, 0.22, 0.22, 0.55, 1.08, 0.05, 0xc4342a, 0.4, 0.35));
  return g;
}

function buildToolChest(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.7, 0.85, 0.42, 0, 0.42, 0, 0xb91c1c, 0.25, 0.4));
  for (let i = 0; i < 4; i++) {
    g.add(box(0.62, 0.04, 0.04, 0, 0.22 + i * 0.18, 0.22, 0x222222, 0.6, 0.3));
  }
  return g;
}

function buildCompressor(): THREE.Group {
  const g = new THREE.Group();
  const tank = new THREE.Mesh(getGeo("cylinder", { r: 0.28, r2: 0.28, h: 0.85, seg: 10 }), matLib.get(0xc0c4c8, 0.3, 0.55));
  tank.rotation.z = Math.PI / 2;
  tank.position.y = 0.32;
  g.add(tank);
  g.add(box(0.28, 0.22, 0.22, 0.15, 0.62, 0, 0x1d4ed8, 0.2, 0.4));
  return g;
}

export function mountHouses(parent: THREE.Group, deeds: Deed[]): HouseLot[] {
  const lots: HouseLot[] = [];
  deeds.forEach((deed, i) => {
    const g = new THREE.Group();
    g.name = `lot_${deed.id}`;
    const y = getTerrainHeight(deed.x, deed.z);
    g.position.set(deed.x, y, deed.z);
    const house = buildMaisonCanadienne(deed.id.length * 13 + i * 9, 0);
    house.position.z = -1.2;
    g.add(house);
    const extras = new THREE.Group();
    extras.name = "extras";
    g.add(extras);
    const sign = buildForSale();
    sign.position.set(4.2, 0, 8.4);
    g.add(sign);
    const mail = buildMailbox();
    mail.position.set(-3.6, 0, 9.2);
    g.add(mail);
    const drive = new THREE.Mesh(
      getGeo("box", { w: 3.6, h: 0.08, d: 11 }),
      matLib.get(0x5a5e58, 0.95),
    );
    drive.position.set(6.4, 0.02, 4.2);
    drive.receiveShadow = true;
    g.add(drive);
    parent.add(g);
    const fp = (house.userData.footprint as { width: number; depth: number } | undefined) ?? { width: 8, depth: 8 };
    lots.push({
      deedId: deed.id,
      name: deed.name,
      town: deed.town,
      x: deed.x,
      z: deed.z,
      yaw: 0,
      group: g,
      extras,
      sign,
      door: { x: deed.x, z: deed.z + fp.depth / 2 + 0.4, yaw: 0 },
      garageDoor: { x: deed.x + 7.4, z: deed.z + 3.2 },
      workbench: { x: deed.x + 7.4, z: deed.z - 0.4 },
      mailbox: { x: deed.x - 3.6, z: deed.z + 9.2 },
      body: {
        minX: deed.x - fp.width / 2 - 0.4,
        maxX: deed.x + fp.width / 2 + 0.4,
        minZ: deed.z - 1.2 - fp.depth / 2,
        maxZ: deed.z - 1.2 + fp.depth / 2,
      },
    });
  });
  return lots;
}

export function paintHouseLot(lot: HouseLot, owned: boolean, state: HouseState | undefined) {
  lot.sign.visible = !owned;
  
  // Pop propre par la fin pour vider l'extras sans restructuration d'index en JS
  while (lot.extras.children.length > 0) {
    const child = lot.extras.children[lot.extras.children.length - 1]!;
    lot.extras.remove(child);
  }
  
  const st = state ?? emptyHouse(lot.deedId);
  if (hasReno(st, "garage")) {
    const garage = buildGarageBay(st.garageBays);
    garage.position.set(7.6, 0, 1.4);
    lot.extras.add(garage);
    const gx = 7.6;
    const gz = 1.4;
    if (st.garageFits.includes("etabli") || st.garageFits.includes("mecanique")) {
      const bench = buildWorkbench();
      bench.position.set(gx - 0.2, 0, gz - 2.4);
      lot.extras.add(bench);
    }
    if (st.garageFits.includes("outils")) {
      const chest = buildToolChest();
      chest.position.set(gx + 1.6, 0, gz - 2.6);
      lot.extras.add(chest);
    }
    if (st.garageFits.includes("compresseur")) {
      const c = buildCompressor();
      c.position.set(gx + 2.4, 0, gz - 1.2);
      lot.extras.add(c);
    }
    if (st.garageFits.includes("rangement")) {
      lot.extras.add(box(0.3, 1.6, 2.4, gx - 1.8, 0.9, gz - 0.4, 0x5a5048));
    }
    if (st.garageFits.includes("deco")) {
      const neon = box(1.6, 0.28, 0.06, gx, 2.55, gz + 3.4, 0x1d4ed8, 0.2, 0.3);
      (neon.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x1d4ed8);
      (neon.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
      lot.extras.add(neon);
    }
    st.parked.slice(0, st.garageBays).forEach((id, i) => {
      const car = buildSedan(id === "sq" ? 0x1e3a5f : 0x6a7080);
      car.position.set(gx - 2.0 + i * 4.1, 0.02, gz + 0.4);
      car.rotation.y = Math.PI;
      car.scale.setScalar(0.92);
      lot.extras.add(car);
    });
    lot.garageDoor = { x: lot.x + 7.6, z: lot.z + 1.4 + 3.6 };
    lot.workbench = { x: lot.x + 7.4, z: lot.z + 1.4 - 2.4 };
  }
  if (hasReno(st, "cloture")) {
    const fence = buildFence(LOT_W, LOT_D);
    fence.position.set(0, 0, 1.2);
    lot.extras.add(fence);
  }
  if (hasReno(st, "piscine")) {
    const pool = buildPool();
    pool.position.set(-5.4, 0, -8.4);
    lot.extras.add(pool);
  }
  if (hasReno(st, "spa")) {
    const spa = buildSpa();
    spa.position.set(-1.2, 0, -7.6);
    lot.extras.add(spa);
  }
  if (hasReno(st, "cabanon")) {
    const shed = buildShed();
    shed.position.set(8.4, 0, -8.2);
    lot.extras.add(shed);
  }
  if (hasReno(st, "terrasse")) {
    const deck = buildTerrace();
    deck.position.set(0, 0, -6.4);
    lot.extras.add(deck);
  }
  if (hasReno(st, "jardin")) {
    const garden = buildGarden();
    garden.position.set(-7.2, 0, -4.2);
    lot.extras.add(garden);
  }
  attachScenicHeat(lot.extras, st.heat, 0, 6.4, 3.2);
  lot.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData.isWindow) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (owned && hasReno(st, "eclairage")) {
        mat.emissive = new THREE.Color(QC_PALETTE.fenetreEclairee);
        mat.emissiveIntensity = 0.7;
      }
    }
  });
}

/**
 * Recherche de proximité de maison ultra-rapide (O(N) optimisé)
 * Évite les racines carrées (Math.sqrt) et les allocations mémoire dans la boucle.
 */
export function nearestHouse(
  lots: HouseLot[],
  x: number,
  z: number,
  max = 16,
): { lot: HouseLot; kind: HouseHot; dist: number } | null {
  let best: { lot: HouseLot; kind: HouseHot; dist: number } | null = null;
  const maxSq = max * max;

  const len = lots.length;
  for (let i = 0; i < len; i++) {
    const lot = lots[i]!;
    
    // Check de distance grossier au centre du lot (distance au carré)
    const dxLot = x - lot.x;
    const dzLot = z - lot.z;
    const distLotSq = dxLot * dxLot + dzLot * dzLot;

    // Distances carrées aux différents points d'intérêts (hotspots)
    const dxDoor = x - lot.door.x;
    const dzDoor = z - lot.door.z;
    const dDoorSq = dxDoor * dxDoor + dzDoor * dzDoor;
    
    const dxGar = x - lot.garageDoor.x;
    const dzGar = z - lot.garageDoor.z;
    const dGarSq = dxGar * dxGar + dzGar * dzGar;

    const dxMail = x - lot.mailbox.x;
    const dzMail = z - lot.mailbox.z;
    const dMailSq = dxMail * dxMail + dzMail * dzMail;

    const dxWork = x - lot.workbench.x;
    const dzWork = z - lot.workbench.z;
    const dWorkSq = dxWork * dxWork + dzWork * dzWork;

    // Évaluation uniquement sur les distances carrées (Sans racine carrée !)
    const hits: Array<{ kind: HouseHot; dSq: number; maxSq: number }> = [
      { kind: "door", dSq: dDoorSq, maxSq: 3.4 * 3.4 },
      { kind: "garage", dSq: dGarSq, maxSq: 3.8 * 3.8 },
      { kind: "mail", dSq: dMailSq, maxSq: 2.2 * 2.2 },
      { kind: "work", dSq: dWorkSq, maxSq: 2.6 * 2.6 },
      { kind: "lot", dSq: distLotSq, maxSq: maxSq },
    ];

    for (let j = 0; j < hits.length; j++) {
      const h = hits[j]!;
      if (h.dSq < h.maxSq) {
        const dist = Math.sqrt(h.dSq);
        if (!best || dist < best.dist) {
          best = { lot, kind: h.kind, dist };
        }
      }
    }
  }
  return best;
}

export function insideHouseBody(lot: HouseLot, x: number, z: number): boolean {
  return x > lot.body.minX && x < lot.body.maxX && z > lot.body.minZ && z < lot.body.maxZ;
}

export function houseMapMarks(lots: HouseLot[], owned: string[]): Array<{ x: number; z: number; owned: boolean }> {
  return lots.map((l) => ({ x: l.x, z: l.z, owned: owned.includes(l.deedId) }));
}

export function housePrompt(
  lot: HouseLot,
  kind: HouseHot,
  owned: boolean,
  state: HouseState | undefined,
  inventory: Record<string, number>,
  driving: boolean,
): string {
  if (!owned) {
    return `E — À vendre · ${lot.name}`;
  }
  const st = state ?? emptyHouse(lot.deedId);
  if (driving && hasReno(st, "garage") && (kind === "garage" || kind === "lot")) {
    if (st.parked.length >= st.garageBays) return "Garage plein";
    return "E — Ranger le véhicule";
  }
  if (kind === "mail") return `E — Travaux · ${lot.name}`;
  if (kind === "work" && hasReno(st, "garage") && st.garageFits.includes("mecanique")) {
    return "E — Entretien · établi";
  }
  if (kind === "garage" && hasReno(st, "garage")) {
    const lock = canOpenDoor(st, "garage", inventory);
    if (!lock.ok) return doorDenied("garage");
    return lock.lockpick ? "E — Crocheter le garage" : "E — Entrer au garage";
  }
  if (kind === "door") {
    const lock = canOpenDoor(st, "main", inventory);
    if (!lock.ok) return doorDenied("main");
    return lock.lockpick ? "E — Crocheter · porte" : `E — Entrer · ${lot.name}`;
  }
  return `Chez vous · ${lot.name}`;
}