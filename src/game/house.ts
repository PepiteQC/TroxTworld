/**
 * ═══════════════════════════════════════════════════════════════════
 * GESTION DES PROPRIÉTÉS EN JEU — BÂTIMENTS 3D ET SYSTÈMES PHYSIQUES
 * ═══════════════════════════════════════════════════════════════════
 *
 * IMMERSION VRAIE VIE & INTERCONNECTIONS :
 *  - Hydro-Québec : Compteur circulaire vitré extérieur fonctionnel. Si le courant est coupé,
 *    toutes les sources lumineuses, néons de garage et ateliers s'éteignent instantanément en 3D.
 *  - Serrures interactives : Serrures à clé standard, clavier numérique à code NIP,
 *    ou verrous magnétiques renforcés.
 *  - Usure et Sinistres : Apparition visuelle de taches de moisissure (grow-ops),
 *    de tuyaux qui fuient ou de portes défoncées en cas d'effraction violente.
 *  - Stationnement : Rangement physique des véhicules des joueurs dans le garage (selon la capacité).
 *  - Rénovations en direct : Application temps réel des structures 3D (piscine creusée, spa,
 *    terrasse, cabanon, aménagement paysager).
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { buildMaisonCanadienne, buildForSale, buildSedan } from "./architecture";
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

// Importations du système immobilier Québécois
import {
  propertyById,
  ensureLock,
  ensureHydro,
  ensureCondition,
  type LockSystem,
  type HydroState,
  type PropertyCondition,
  type QuebecLease,
} from "./realestate";
import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { triggerNotification } from "./phone";

// ═══════════════════════════════════════════════════════════
// DÉFINITION DE LA FONCTION DE RENDERER 3D "BOX"
// ═══════════════════════════════════════════════════════════

function box(
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: number,
  roughness = 0.5, metalness = 0.1
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ═══════════════════════════════════════════════════════════
// TYPES ET CATALOGUES (CONSERVÉS ET ENRICHIS)
// ═══════════════════════════════════════════════════════════

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
  | "growop_illegal" // Grow-op de cannabis clandestin !
  | "perso";

export type GarageFit = "etabli" | "outils" | "rangement" | "compresseur" | "deco" | "mecanique";

export type DoorSlot = "main" | "back" | "garage" | "basement" | "bedroom" | "private";

export type KeyRole = "owner" | "family" | "roommate" | "employee" | "tenant" | "guest";

export type HouseSnap = 0.25 | 0.5 | 1;

export const SNAP_STEPS: HouseSnap[] = [0.25, 0.5, 1];

export const RENO_CATALOG: Array<{
  id: RenoId;
  label: string;
  price: number;
  valueAdd: number;
  group: RenoGroup;
  hint: string;
}> = [
  { id: "eclairage", label: "Éclairage", price: 80, valueAdd: 90, group: "maison", hint: "Plafonniers, interrupteurs intelligents." },
  { id: "cuisine", label: "Cuisine moderne", price: 200, valueAdd: 240, group: "maison", hint: "Comptoir en quartz, frigo double, cuisinière." },
  { id: "sdb", label: "Salle de bain", price: 160, valueAdd: 180, group: "maison", hint: "Bain autoportant, douche italienne, carrelage." },
  { id: "salon", label: "Salon rustique", price: 140, valueAdd: 170, group: "maison", hint: "Sofa sectionnel, foyer électrique, tapis." },
  { id: "chambres", label: "Chambres", price: 180, valueAdd: 210, group: "maison", hint: "Lits Queen, tables de nuit en pin." },
  { id: "soussol", label: "Sous-sol fini", price: 400, valueAdd: 480, group: "soussol", hint: "Gyptech, isolation thermique, lumières encastrées." },
  { id: "garage", label: "Garage isolé", price: 350, valueAdd: 420, group: "garage", hint: "Porte automatique, dalle de béton polie." },
  { id: "terrasse", label: "Grand Patio arrière", price: 120, valueAdd: 140, group: "terrain", hint: "Deck en bois traité, rampe en aluminium." },
  { id: "piscine", label: "Piscine chauffée", price: 300, valueAdd: 360, group: "terrain", hint: "Creusée avec thermopompe, clôture sécuritaire." },
  { id: "spa", label: "Spa 6 places", price: 150, valueAdd: 170, group: "terrain", hint: "Cuve de acrylique, jets hydromasseurs, ozonateur." },
  { id: "cloture", label: "Clôture mitoyenne", price: 80, valueAdd: 70, group: "terrain", hint: "Perches de cèdre ou mailles Frost." },
  { id: "cabanon", label: "Cabanon de cour", price: 90, valueAdd: 100, group: "terrain", hint: "Remise extérieure assortie à la maison." },
  { id: "jardin", label: "Jardin et aménagement", price: 70, valueAdd: 80, group: "terrain", hint: "Arbres matures, parterres de fleurs, potager." },
];

export const BASEMENT_FITS: Array<{ id: BasementFit; label: string; hint: string }> = [
  { id: "vide", label: "Béton brut", hint: "Fondations visibles, idéal pour stockage." },
  { id: "familiale", label: "Salle familiale", hint: "Table de billard, divan, cinéma maison." },
  { id: "cinema", label: "Cinéma maison", hint: "Projecteur 4K, fauteuils inclinables." },
  { id: "gym", label: "Gym à domicile", hint: "Poids libres, tapis roulant, miroir mural." },
  { id: "atelier", label: "Atelier d'ébénisterie", hint: "Banc de scie, rack à outils, dépoussiéreur." },
  { id: "bureau", label: "Bureau de télétravail", hint: "Bibliothèque, bureau d'angle, chaise ergonomique." },
  { id: "chambre", label: "Chambre d'amis", hint: "Chambre supplémentaire avec garde-robe." },
  { id: "rangement", label: "Rangement organisé", hint: "Étagères industrielles robustes." },
  { id: "buanderie", label: "Buanderie complète", hint: "Laveuse/sécheuse frontales, cuve de trempage." },
  { id: "growop_illegal", label: "Grow-Op de Cannabis", hint: "Lampes sodium, extracteurs de charbon, humidificateurs." },
];

export const GARAGE_FITS: Array<{ id: GarageFit; label: string; price: number; hint: string }> = [
  { id: "etabli", label: "Établi de mécanicien", price: 60, hint: "Plan de travail en acier, étau, panneaux perforés." },
  { id: "outils", label: "Coffre de pro", price: 45, hint: "Coffre d'outils mobile Mastercraft de 12 tiroirs." },
  { id: "rangement", label: "Meubles de rangement", price: 40, hint: "Armoires en tôle d'acier suspendues." },
  { id: "compresseur", label: "Compresseur d'air", price: 90, hint: "Réservoir de 30 gallons, boyau rétractable." },
  { id: "deco", label: "Déco Man Cave", price: 35, hint: "Enseignes lumineuses, néons de bière québécoise." },
  { id: "mecanique", label: "Fosse de vidange", price: 120, hint: "Fosse sécurisée intégrée à la dalle pour l'entretien." },
];

export const GARAGE_BAYS: Array<{ n: 1 | 2 | 3; label: string; price: number }> = [
  { n: 1, label: "Simple (1 voiture)", price: 0 },
  { n: 2, label: "Double (2 voitures)", price: 180 },
  { n: 3, label: "Triple (3 voitures)", price: 320 },
];

export const DOOR_SLOTS: Array<{ id: DoorSlot; label: string }> = [
  { id: "main", label: "Porte d'entrée principale" },
  { id: "back", label: "Porte patio arrière" },
  { id: "garage", label: "Porte de garage principale" },
  { id: "basement", label: "Porte de cave" },
  { id: "bedroom", label: "Porte de chambre des maîtres" },
  { id: "private", label: "Chambre forte privée" },
];

export const KEY_ROLES: Array<{ id: KeyRole; label: string; hint: string }> = [
  { id: "owner", label: "Propriétaire légal", hint: "Contrôle d'accès total." },
  { id: "family", label: "Conjoint / Famille", hint: "Accès résidentiel, incapable de vendre." },
  { id: "roommate", label: "Colocataire", hint: "Accès restreint aux pièces communes." },
  { id: "tenant", label: "Locataire avec bail", hint: "Contrat actif enregistré au TAL." },
  { id: "employee", label: "Contractuel / Ouvrier", hint: "Accès temporaire ou de garage." },
  { id: "guest", label: "Invité temporaire", hint: "Accès via NIP jetable." },
];

const SLOT_ROLES: Record<DoorSlot, KeyRole[]> = {
  main: ["owner", "family", "roommate", "tenant"],
  back: ["owner", "family", "roommate", "tenant"],
  garage: ["owner", "family", "employee", "tenant"],
  basement: ["owner", "family", "tenant"],
  bedroom: ["owner", "family", "roommate", "tenant"],
  private: ["owner"],
};

// ═══════════════════════════════════════════════════════════
// ÉTAT DE LA MAISON (MULTIJOUERS & SYNC)
// ═══════════════════════════════════════════════════════════

export interface HouseState extends HouseUtils {
  deedId: string;
  renos: RenoId[];
  basement: BasementFit;
  garageFits: GarageFit[];
  garageBays: 1 | 2 | 3;
  doors: Record<DoorSlot, boolean>; // États d'ouverture physique (vrai = ouvert, faux = fermé)
  keychain: KeyRole[];
  parked: string[];
}

export type HouseHot = "door" | "garage" | "mail" | "work" | "lot" | "hydro_meter" | "tal_sign";

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
  hydroMeter: { x: number; z: number }; // Emplacement 3D du compteur Hydro-Québec
  talSign: { x: number; z: number } | null;  // Affiche d'éviction du TAL si applicable
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
    const renos = Array.isArray(d.renos) ? d.renos.filter((r): r is RenoId => RENO_CATALOG.some((c) => c.id === r)) : [];
    const fits = Array.isArray(d.garageFits)
      ? d.garageFits.filter((f): f is GarageFit => GARAGE_FITS.some((c) => c.id === f))
      : [];
    const bays = d.garageBays === 2 || d.garageBays === 3 ? d.garageBays : 1;
    const basement = BASEMENT_FITS.some((b) => b.id === d.basement) ? (d.basement as BasementFit) : "vide";
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
  return RENO_CATALOG.find((r) => r.id === id)!;
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
      const spec = GARAGE_FITS.find((g) => g.id === f);
      if (spec) v += Math.round(spec.price * 0.8);
    }
  }
  v += heatById(state.heat).valueAdd;
  return v;
}

// ═══════════════════════════════════════════════════════════
// CLÉS, SERRURES ET AUTORISATIONS DE SÉCURITÉ
// ═══════════════════════════════════════════════════════════

export function playerRoles(
  state: HouseState,
  inventory: Record<string, number>,
  lockSystem?: LockSystem,
  playerId?: string,
): KeyRole[] {
  const roles: KeyRole[] = [];

  // Si le joueur est le propriétaire enregistré dans realstate.ts/realestate.ts
  if (lockSystem && lockSystem.ownerId === playerId) {
    roles.push("owner");
    return roles;
  }

  // Clés physiques traditionnelles
  if ((inventory.cle_maison ?? 0) > 0 && state.keychain.includes("owner")) roles.push("owner");
  if ((inventory.double_cle ?? 0) > 0) {
    for (const r of state.keychain) {
      if (r !== "owner" && r !== "guest" && !roles.includes(r)) roles.push(r);
    }
  }

  // Clés numériques partagées via realstate.ts/realestate.ts
  if (lockSystem && playerId && lockSystem.authorizedKeyHolders.includes(playerId)) {
    roles.push("tenant"); // Considéré résident autorisé
  }

  return roles;
}

export function canOpenDoor(
  state: HouseState,
  slot: DoorSlot,
  inventory: Record<string, number>,
  lockSystem?: LockSystem,
  playerId?: string,
): { ok: boolean; lockpick: boolean; electronic: boolean } {
  // CORRIGÉ : la condition était inversée. doors[slot] === true veut dire
  // "ouverte/débarrée" (voir le commentaire sur HouseState.doors) — donc c'est
  // CE cas qui doit laisser passer sans vérification, pas l'inverse. Avant ce
  // correctif, une porte explicitement verrouillée (false) donnait un accès
  // libre à n'importe qui, et une porte neuve/jamais verrouillée (true, la
  // valeur par défaut de emptyHouse) forçait toujours la vérification
  // complète des clés — l'exact contraire de ce que le commentaire annonce.
  if (state.doors[slot]) return { ok: true, lockpick: false, electronic: false };

  // Vérifier la méthode d'authentification du verrou
  if (lockSystem) {
    if (lockSystem.lockType === "electronic_pin") {
      return { ok: false, lockpick: false, electronic: true };
    }
    if (lockSystem.lockType === "smart_keycard" && (inventory.carte_acces ?? 0) > 0) {
      return { ok: true, lockpick: false, electronic: false };
    }
  }

  const roles = playerRoles(state, inventory, lockSystem, playerId);
  if (roles.some((r) => SLOT_ROLES[slot].includes(r))) return { ok: true, lockpick: false, electronic: false };

  // Permettre le crochetage de serrure s'il possède le kit
  if ((inventory.crochet ?? 0) > 0 || (inventory.pied_de_biche ?? 0) > 0) {
    return { ok: true, lockpick: true, electronic: false };
  }

  return { ok: false, lockpick: false, electronic: false };
}

export function doorDenied(slot: DoorSlot): string {
  const spec = DOOR_SLOTS.find((d) => d.id === slot);
  return `🔒 Verrouillée · ${spec?.label ?? slot} · pas de clé`;
}

// ═══════════════════════════════════════════════════════════
// CONSTRUCTIONS DES ÉLÉMENTS 3D (AVEC COMPTEUR ET DÉGÂTS)
// ═══════════════════════════════════════════════════════════

function buildHydroMeter(): THREE.Group {
  const g = new THREE.Group();
  g.name = "compteur_hydro";

  // Boîtier métallique gris
  g.add(box(0.24, 0.35, 0.12, 0, 0, 0, 0x8a9096, 0.6, 0.4));
  // Cadran circulaire en verre d'Hydro-Québec
  const dial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12),
    matLib.glass(0xc8dce8, 0.15),
  );
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0, 0.04, 0.08);
  g.add(dial);

  // Petite LED verte de bon fonctionnement
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 6, 6),
    matLib.getEmissive(0x22c55e, 0x22c55e, 0.8),
  );
  led.position.set(0.06, -0.1, 0.06);
  led.name = "hydro_led";
  g.add(led);

  return g;
}

function buildMoldDecay(): THREE.Group {
  const g = new THREE.Group();
  g.name = "moisissure_decoy";

  // Simulation de taches d'humidité/moisissure vert/noir sur les murs extérieurs
  const moldMat = matLib.get(0x1c2d20, 0.98, 0); // Mat très terne
  for (let i = 0; i < 5; i++) {
    const patch = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.14, 1),
      moldMat,
    );
    patch.position.set(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.1,
    );
    patch.scale.set(1.5, 0.8, 0.1);
    g.add(patch);
  }
  return g;
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
  const water = new THREE.Mesh(new THREE.BoxGeometry(8, 0.35, 4.4), matLib.water(0x3a8aaa, 0.82));
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
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.72, 12), matLib.get(0x3a3e42, 0.4, 0.3));
  tub.position.y = 0.36;
  g.add(tub);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.12, 12), matLib.water(0x4aa0b8, 0.8));
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
  for (let x = -w / 2; x <= w / 2 + 0.01; x += step) {
    for (const z of [-d / 2, d / 2]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, h, 6), post);
      p.position.set(x, h / 2, z);
      p.castShadow = true;
      g.add(p);
    }
  }
  for (let z = -d / 2; z <= d / 2 + 0.01; z += step) {
    for (const x of [-w / 2, w / 2]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, h, 6), post);
      p.position.set(x, h / 2, z);
      p.castShadow = true;
      g.add(p);
    }
  }
  const rail = matLib.get(0x8a8e88, 0.55, 0.25);
  for (const z of [-d / 2, d / 2]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.04), rail);
    r.position.set(0, 0.95, z);
    g.add(r);
  }
  for (const x of [-w / 2, w / 2]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, d), rail);
    r.position.set(x, 0.95, 0);
    g.add(r);
  }
  return g;
}

function buildGarden(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const bed = box(1.8, 0.22, 0.9, (i - 1) * 2.1, 0.12, 0, 0x5a3a22);
    g.add(bed);
    for (let k = 0; k < 4; k++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), matLib.get(0x3a7a32, 0.95));
      leaf.position.set((i - 1) * 2.1 - 0.55 + k * 0.38, 0.32, (k % 2) * 0.18 - 0.08);
      g.add(leaf);
    }
  }
  return g;
}

function buildMailbox(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.15, 6), matLib.get(0x4a3a28, 0.9));
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
  g.add(box(0.35, 0.22, 0.22, 0.55, 1.08, 0.05, 0xc4a030, 0.4, 0.35));
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
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.85, 10), matLib.get(0xc0c4c8, 0.3, 0.55));
  tank.rotation.z = Math.PI / 2;
  tank.position.y = 0.32;
  g.add(tank);
  g.add(box(0.28, 0.22, 0.22, 0.15, 0.62, 0, 0x1d4ed8, 0.2, 0.4));
  return g;
}

// Enseigne du TAL apposée sur la pelouse en cas de litige d'éviction
function buildTalSign(leaseId: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `tal_sign_${leaseId}`;

  // Poteau en bois
  g.add(box(0.08, 1.25, 0.08, 0, 0.625, 0, 0x4a3a28));

  // Affiche en carton bleu du TAL
  const board = box(0.62, 0.45, 0.04, 0, 1.05, 0, 0x1d4ed8);
  g.add(board);

  // Inscriptions du TAL
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("AVIS D'ÉVICTION", 128, 48);
  ctx.font = "14px sans-serif";
  ctx.fillText("T.A.L. QUÉBEC", 128, 88);

  const tex = new THREE.CanvasTexture(c);
  const textMat = new THREE.MeshBasicMaterial({ map: tex });
  const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.38), textMat);
  textMesh.position.set(0, 1.05, 0.03);
  g.add(textMesh);

  return g;
}

// ═══════════════════════════════════════════════════════════
// INSTANCIATION GLOBALE ET MONTAGE DES MAISONS (MONDE 3D)
// ═══════════════════════════════════════════════════════════

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

    // Compteur Hydro-Québec monté à côté de la porte arrière ou sur le flanc
    const hydro = buildHydroMeter();
    hydro.position.set(-4.1, 1.25, -2.4);
    g.add(hydro);

    const drive = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.08, 11),
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
      hydroMeter: { x: deed.x - 4.1, z: deed.z - 2.4 },
      talSign: null, // Ajouté de façon dynamique selon l'état du TAL
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

// ═══════════════════════════════════════════════════════════
// PEINTURE ET MISES À JOUR DES LOTS IMMOBILIERS (MOTEUR DE SYNC)
// ═══════════════════════════════════════════════════════════

export function paintHouseLot(
  lot: HouseLot,
  owned: boolean,
  state: HouseState | undefined,
  hydroState?: HydroState,
  conditionState?: PropertyCondition,
  activeLease?: QuebecLease,
) {
  // Affiche de vente Centris / Propriodirect
  lot.sign.visible = !owned;

  // Nettoyage des extras d'architecture
  while (lot.extras.children.length) lot.extras.remove(lot.extras.children[0]!);

  const st = state ?? emptyHouse(lot.deedId);

  // 1. VÉRIFICATION D'HYDRO-QUÉBEC (Effet de coupure sur le rendu)
  const isPowerCut = hydroState ? hydroState.isPowerCut : false;

  // Contrôler la LED du compteur Hydro extérieur
  lot.group.traverse((obj) => {
    if (obj.name === "hydro_led" && obj instanceof THREE.Mesh) {
      const m = obj.material as THREE.MeshLambertMaterial;
      if (m && "emissive" in m) {
        // Rouge clignotant si coupé, Vert si connecté
        m.emissive = new THREE.Color(isPowerCut ? 0xef4444 : 0x22c55e);
      }
    }
  });

  // 2. RENDU DES RENOVATIONS ACTIVES
  if (hasReno(st, "garage")) {
    const garage = buildGarageBay(st.garageBays);
    garage.position.set(7.6, 0, 1.4);
    lot.extras.add(garage);
    const gx = 7.6;
    const gz = 1.4;

    if (!isPowerCut) {
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
      if (st.garageFits.includes("deco")) {
        const neon = box(1.6, 0.28, 0.06, gx, 2.55, gz + 3.4, 0x1d4ed8, 0.2, 0.3);
        (neon.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x1d4ed8);
        (neon.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
        lot.extras.add(neon);
      }
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

  if (hasReno(st, "spa") && !isPowerCut) {
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

  // 3. AFFICHAGE DES TRACES DE MOISISSURE (GROW-OP OU INSALUBRE)
  if (conditionState && (conditionState.hasMold || conditionState.growOpDamages)) {
    const mold = buildMoldDecay();
    mold.position.set(-3.2, 1.4, -1.2);
    lot.extras.add(mold);
  }

  // 4. AFFICHAGE DE L'AVIS DU TAL (ÉVICTION EN COURS)
  if (activeLease && activeLease.status === "evicted") {
    const talSign = buildTalSign(activeLease.leaseId);
    talSign.position.set(-2.2, 0, 7.8);
    lot.extras.add(talSign);
    lot.talSign = { x: lot.x - 2.2, z: lot.z + 7.8 };
  } else {
    lot.talSign = null;
  }

  // 5. INTÉGRATION THERMIQUE DU CHALET
  attachScenicHeat(lot.extras, st.heat, 0, 6.4, 3.2);

  // 6. GESTION DES LUMIÈRES DES FENÊTRES (HYDRO-DEPENDANT)
  lot.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData.isWindow) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (owned && hasReno(st, "eclairage") && !isPowerCut) {
        mat.emissive = new THREE.Color(QC_PALETTE.fenetreEclairee);
        mat.emissiveIntensity = 0.7;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// RECHERCHE DE PROXIMITÉ ET RAYCASTS (MONDE 3D)
// ═══════════════════════════════════════════════════════════

export function nearestHouse(
  lots: HouseLot[],
  x: number,
  z: number,
  max = 16,
): { lot: HouseLot; kind: HouseHot; dist: number } | null {
  let best: { lot: HouseLot; kind: HouseHot; dist: number } | null = null;
  for (const lot of lots) {
    const dDoor = Math.hypot(x - lot.door.x, z - lot.door.z);
    const dGar = Math.hypot(x - lot.garageDoor.x, z - lot.garageDoor.z);
    const dMail = Math.hypot(x - lot.mailbox.x, z - lot.mailbox.z);
    const dWork = Math.hypot(x - lot.workbench.x, z - lot.workbench.z);
    const dLot = Math.hypot(x - lot.x, z - lot.z);
    const dHydro = Math.hypot(x - lot.hydroMeter.x, z - lot.hydroMeter.z);
    const dTal = lot.talSign ? Math.hypot(x - lot.talSign.x, z - lot.talSign.z) : 999;

    const hits: Array<{ kind: HouseHot; dist: number; max: number }> = [
      { kind: "door", dist: dDoor, max: 3.4 },
      { kind: "garage", dist: dGar, max: 3.8 },
      { kind: "mail", dist: dMail, max: 2.2 },
      { kind: "work", dist: dWork, max: 2.6 },
      { kind: "hydro_meter", dist: dHydro, max: 1.8 },
      { kind: "tal_sign", dist: dTal, max: 1.8 },
      { kind: "lot", dist: dLot, max },
    ];
    for (const h of hits) {
      if (h.dist < h.max && (!best || h.dist < best.dist)) {
        best = { lot, kind: h.kind, dist: h.dist };
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

// ═══════════════════════════════════════════════════════════
// PROMPTS EN DIRECT (RÉALISME QUÉBÉCOIS COMPLET)
// ═══════════════════════════════════════════════════════════

export function housePrompt(
  lot: HouseLot,
  kind: HouseHot,
  owned: boolean,
  state: HouseState | undefined,
  inventory: Record<string, number>,
  driving: boolean,
  hydroState?: HydroState,
  lockSystem?: LockSystem,
  activeLease?: QuebecLease,
  playerId?: string,
): string {
  // 1. CAS DU BIEN À VENDRE (CENTRIS)
  if (!owned) {
    if (activeLease && activeLease.tenantId === playerId) {
      return `Chez vous (Locataire) · ${lot.name}`;
    }
    return `E — À vendre (Notaire / Centris) · ${lot.name}`;
  }

  const st = state ?? emptyHouse(lot.deedId);
  const isPowerCut = hydroState ? hydroState.isPowerCut : false;

  // 2. VÉRIFICATION D'HYDRO-QUÉBEC
  if (kind === "hydro_meter") {
    if (isPowerCut) {
      return `⚠️ Compteur Hydro coupé (Compte en souffrance : ${hydroState?.balanceDue}$) · E — Rétablir le service`;
    }
    return `Compteur Hydro-Québec actif · Compte: ${hydroState?.accountNumber}`;
  }

  // 3. VÉRIFICATION D'AFFICHE DE LITIGE (TAL)
  if (kind === "tal_sign") {
    return `🏛️ Litige au TAL · Ordonnance d'éviction active ! · E — Exécuter l'éviction forcée`;
  }

  // 4. CONDUITE ET GARAGE
  if (driving && hasReno(st, "garage") && (kind === "garage" || kind === "lot")) {
    if (isPowerCut) return "❌ Porte de garage électrique bloquée (Panne Hydro-QC)";
    if (st.parked.length >= st.garageBays) return "Garage plein !";
    return "E — Garer le véhicule de sécurité";
  }

  // 5. COMMISSARY / COUR DE TRAVAUX (MAILBOX)
  if (kind === "mail") {
    return `E — Aménagements et Rénovations · ${lot.name}`;
  }

  // 6. ATELIER ET SOUDEUSE
  if (kind === "work" && hasReno(st, "garage") && st.garageFits.includes("mecanique")) {
    if (isPowerCut) return "❌ Soudeuse et compresseur hors service (Panne Hydro-QC)";
    return "E — Entretenir ou réparer un véhicule";
  }

  // 7. PORTE DE GARAGE PRINCIPALE
  if (kind === "garage" && hasReno(st, "garage")) {
    if (isPowerCut) return "❌ Verrou électromagnétique bloqué fermé (Panne Hydro-QC)";
    const lock = canOpenDoor(st, "garage", inventory, lockSystem, playerId);
    if (!lock.ok) return doorDenied("garage");
    return lock.lockpick ? "E — Crocheter la serrure du garage" : "E — Entrer dans le garage";
  }

  // 8. PORTE PRINCIPALE DE LA MAISON
  if (kind === "door") {
    if (lockSystem && lockSystem.brokenState >= 80) {
      return "Serrure brisée par effraction · E — Réparer la serrure";
    }

    const lock = canOpenDoor(st, "main", inventory, lockSystem, playerId);

    if (lock.electronic) {
      return "E — Saisir le NIP de sécurité sur le clavier électronique";
    }

    if (!lock.ok) {
      if (activeLease && activeLease.status === "evicted" && activeLease.tenantId === playerId) {
        return "🔒 Clé bloquée suite à l'ordonnance du TAL · E — Squatter illégalement";
      }
      return doorDenied("main");
    }

    return lock.lockpick
      ? "E — Crocheter la serrure à goupilles (Kit d'outils)"
      : `E — Entrer chez vous · ${lot.name}`;
  }

  return `Chez vous · ${lot.name}`;
}

// ═══════════════════════════════════════════════════════════
// REMOTES (RPC RÉSEAU MULTIJOUEUR)
// ═══════════════════════════════════════════════════════════

export function syncHouseLotChanges(deedId: string, state: HouseState) {
  netEmit("house:sync_lot", { deedId, state });
}

// CORRIGÉ : ce handler ne faisait rien (juste un commentaire) — en
// multijoueur, personne ne voyait jamais les rénovations, l'ameublement de
// garage ou les voitures stationnées des autres joueurs se mettre à jour.
// On expose maintenant un vrai abonnement pub/sub ; il suffit qu'un autre
// module (store.ts / world.ts) appelle onHouseSync(...) pour appliquer l'état
// reçu (ex. mettre à jour houses[deedId] puis rappeler paintHouseLot).
type HouseSyncListener = (deedId: string, state: HouseState) => void;
const houseSyncListeners = new Set<HouseSyncListener>();

export function onHouseSync(fn: HouseSyncListener): () => void {
  houseSyncListeners.add(fn);
  return () => houseSyncListeners.delete(fn);
}

registerRemote("house:sync_lot", (deedId: string, state: HouseState) => {
  for (const fn of houseSyncListeners) fn(deedId, state);
});

// ═══════════════════════════════════════════════════════════
// RP AJOUTÉ : GESTION DES SERRURES ET DU TROUSSEAU DE CLÉS
// ═══════════════════════════════════════════════════════════
// Le système de vérification (canOpenDoor/playerRoles/KEY_ROLES) existait déjà,
// mais rien ne permettait de réellement verrouiller une porte ou de donner/
// retirer une clé à quelqu'un. Fonctions pures et additives, prêtes à être
// appelées depuis une action "verrouiller la porte" / "donner un double" en jeu.

/** Verrouille (locked=true) ou déverrouille une porte précise. Ne modifie pas les autres portes. */
export function setDoorLocked(state: HouseState, slot: DoorSlot, locked: boolean): HouseState {
  return { ...state, doors: { ...state.doors, [slot]: !locked } };
}

/** Verrouille ou déverrouille toutes les portes d'un coup (ex. "barrer la maison" en partant). */
export function setAllDoorsLocked(state: HouseState, locked: boolean): HouseState {
  const doors = { ...state.doors };
  for (const slot of DOOR_SLOTS) doors[slot.id] = !locked;
  return { ...state, doors };
}

/** Ajoute un rôle de clé (colocataire, locataire, employé…) au trousseau, sans doublon. */
export function grantKey(state: HouseState, role: KeyRole): HouseState {
  if (state.keychain.includes(role)) return state;
  return { ...state, keychain: [...state.keychain, role] };
}

/** Retire un rôle de clé du trousseau. Le propriétaire ne peut jamais être retiré ainsi. */
export function revokeKey(state: HouseState, role: KeyRole): HouseState {
  if (role === "owner") return state;
  return { ...state, keychain: state.keychain.filter((r) => r !== role) };
}