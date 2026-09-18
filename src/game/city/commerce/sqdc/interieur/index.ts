/**
 * TROXTWORLD — SQDC Intérieur v5.0
 * Layout définitif corrigé (de l'entrée vers le fond) :
 *   z = +6.3 → SAS
 *   z = +4.5 → Accueil
 *   z = +2.5 → Préroulés / Accessoires
 *   z = +0.5 → Vapes / Comestibles
 *   z = -1.5 → Vitrines Fleur / Huiles
 *   z = -3.5 → CAISSES
 *   z = -5.2 → CONSEIL / RÉSERVE
 */
import * as THREE from "three";
import { sqdcMaterials } from "../materiaux";
import { texConcrete, texEntryMat } from "../materiaux/textures";
import { POSTERS, makePosterMesh } from "../posters";
import { buildSqdcSas, buildReserveDoor, type SasResult } from "./doors";
import {
  buildAccueilCounter, buildRegisterCounter, buildConseilCounter,
  buildShelfAisle, buildVitrine, buildSafe, buildCameraTerminal,
  type CollisionBox,
} from "./furniture";

export interface InteriorAisle {
  id: string;
  label: string;
  hint: string;
  x: number;
  z: number;
  items: string[];
}

export interface InteriorInteractive {
  kind: string;
  x: number;
  y: number;
  z: number;
}

export interface SqdcInteriorResult {
  group: THREE.Group;
  spawn: THREE.Vector3;
  spawnYaw: number;
  exit: THREE.Vector3;
  walls: CollisionBox[];
  aisles: InteriorAisle[];
  garments: Array<{ itemId: string; x: number; z: number }>;
  interactives: InteriorInteractive[];
  cameras: Array<{ id: string; position: [number, number, number]; lookAt: [number, number, number] }>;
  sas: SasResult;
  title: string;
  subtitle: string;
}

export function buildSqdcInterior(storeId: string): SqdcInteriorResult {
  const g = new THREE.Group();
  g.name = "sqdc_interior";
  g.userData = { type: "sqdc-interior", storeId };

  const W = 15.2;
  const D = 12.6;
  const H = 3.4;
  const FRONT_Z = D / 2;   // +6.3
  const BACK_Z = -D / 2;   // -6.3
  const ENTRY_HALF = 2.2;

  const mats = sqdcMaterials();
  const walls: CollisionBox[] = [];
  const aisles: InteriorAisle[] = [];
  const garments: Array<{ itemId: string; x: number; z: number }> = [];
  const interactives: InteriorInteractive[] = [];
  const cameras: SqdcInteriorResult["cameras"] = [];

  /* ─── SOL ─── */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({
    map: texConcrete([6, 6]),
    roughness: 0.86,
    color: 0x8a9098,
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "sqdc_floor";
  g.add(floor);

  // Tapis d'entrée
  const entryMat = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.6),
    new THREE.MeshStandardMaterial({ map: texEntryMat(), roughness: 0.95 }),
  );
  entryMat.rotation.x = -Math.PI / 2;
  entryMat.position.set(0, 0.01, FRONT_Z - 1.6);
  g.add(entryMat);

  /* ─── PLAFOND ─── */
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.96 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  g.add(ceiling);

  /* ─── MURS ─── */
  const addWall = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    walls.push({
      minX: x - w / 2 - 0.08, maxX: x + w / 2 + 0.08,
      minZ: z - d / 2 - 0.08, maxZ: z + d / 2 + 0.08,
    });
  };

  addWall(W, H, 0.20, 0, H / 2, BACK_Z, mats.wall);
  addWall(0.20, H, D, -W / 2, H / 2, 0, mats.wall);
  addWall(0.20, H, D, W / 2, H / 2, 0, mats.wall);

  const frontSegW = (W - ENTRY_HALF * 2) / 2;
  const frontSegX = ENTRY_HALF + frontSegW / 2;
  addWall(frontSegW, H, 0.20, -frontSegX, H / 2, FRONT_Z, mats.wall);
  addWall(frontSegW, H, 0.20, frontSegX, H / 2, FRONT_Z, mats.wall);
  addWall(ENTRY_HALF * 2, 0.40, 0.20, 0, H - 0.20, FRONT_Z, mats.wall);

  /* ─── ÉCLAIRAGE ─── */
  for (const x of [-5.2, 0, 5.2]) {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.05, 0.16),
      mats.emissiveGreen.clone(),
    );
    tube.position.set(x, H - 0.08, 0.4);
    g.add(tube);
    const light = new THREE.PointLight(0xfff4d8, 1.6, 8, 1.6);
    light.position.set(x, H - 0.6, 0.4);
    g.add(light);
  }
  const mainLight = new THREE.PointLight(0xfff6e6, 2.0, 18, 1.5);
  mainLight.position.set(0, H - 0.8, 1.5);
  g.add(mainLight);

  /* ─── SAS ─── */
  const sas = buildSqdcSas(storeId, 0, 0, FRONT_Z);
  g.add(sas.group);
  walls.push(...sas.collisionWalls);

  /* ─── BANNIÈRE MUR DU FOND ─── */
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 1.4),
    new THREE.MeshStandardMaterial({
      map: POSTERS.age21(),
      emissive: 0x1a5632,
      emissiveIntensity: 0.15,
    }),
  );
  banner.position.set(0, H - 1.1, BACK_Z + 0.11);
  g.add(banner);

  /* ═══════════════════════════════════════════
     MOBILIER — de l'entrée vers le fond
     ═══════════════════════════════════════════ */

  /* Accueil */
  const accueil = buildAccueilCounter(-4.6, 4.5);
  g.add(accueil.group);
  walls.push(accueil.collision);
  aisles.push({ id: "accueil", label: "Accueil", hint: "Contrôle d'identité 21+", x: -4.6, z: 4.5, items: [] });
  Object.values(accueil.interactives ?? {}).forEach((it) => interactives.push(it));

  /* Préroulés */
  const preroll = buildShelfAisle({
    id: "preroll", label: "Préroulés", hint: "Joints, gélules, hash",
    x: -3.4, z: 2.5, width: 3.6, depth: 0.7,
    accent: mats.accentGreen, items: ["preroll", "gelules", "hash"],
  });
  g.add(preroll.group);
  walls.push(preroll.collision);
  aisles.push({ id: "preroll", label: "Préroulés", hint: "Joints, gélules, hash", x: -3.4, z: 3.0, items: ["preroll", "gelules", "hash"] });
  ["preroll", "gelules", "hash"].forEach((id, i) => garments.push({ itemId: id, x: -4.5 + i * 1.2, z: 2.5 }));

  /* Accessoires */
  const accessoires = buildShelfAisle({
    id: "accessoires", label: "Accessoires", hint: "Papiers, grinders, pipes",
    x: 3.4, z: 2.5, width: 3.6, depth: 0.7,
    accent: mats.emissiveGold, items: ["rolling_papers", "grinder", "pipe_glass"],
  });
  g.add(accessoires.group);
  walls.push(accessoires.collision);
  aisles.push({ id: "accessoires", label: "Accessoires", hint: "Papiers, grinders, pipes", x: 3.4, z: 3.0, items: ["rolling_papers", "grinder", "pipe_glass"] });
  ["rolling_papers", "grinder", "pipe_glass"].forEach((id, i) => garments.push({ itemId: id, x: 2.3 + i * 1.2, z: 2.5 }));

  /* Vapes */
  const vape = buildShelfAisle({
    id: "vape", label: "Vapes", hint: "Cartouches, batteries",
    x: -3.4, z: 0.5, width: 3.6, depth: 0.7,
    accent: mats.accentGreen, items: ["vape", "vape_cart_indica"],
  });
  g.add(vape.group);
  walls.push(vape.collision);
  aisles.push({ id: "vape", label: "Vapes", hint: "Cartouches, batteries", x: -3.4, z: 1.0, items: ["vape", "vape_cart_indica"] });
  ["vape", "vape_cart_indica"].forEach((id, i) => garments.push({ itemId: id, x: -4.3 + i * 1.2, z: 0.5 }));

  /* Comestibles */
  const edibles = buildShelfAisle({
    id: "edibles", label: "Comestibles", hint: "Bonbons, chocolat",
    x: 3.4, z: 0.5, width: 3.6, depth: 0.7,
    accent: mats.emissiveGold, items: ["gummies_10mg", "chocolate_5mg"],
  });
  g.add(edibles.group);
  walls.push(edibles.collision);
  aisles.push({ id: "edibles", label: "Comestibles", hint: "Bonbons, chocolat", x: 3.4, z: 1.0, items: ["gummies_10mg", "chocolate_5mg"] });
  ["gummies_10mg", "chocolate_5mg"].forEach((id, i) => garments.push({ itemId: id, x: 2.5 + i * 1.2, z: 0.5 }));

  /* Vitrine Fleur */
  const fleur = buildVitrine({
    id: "fleur", label: "Fleur séchée", hint: "Indica, sativa, hybride",
    x: -3.4, z: -1.5, width: 3.8, depth: 0.75,
    accent: mats.accentGreen, items: ["weed", "fleur_indica", "fleur_sativa"],
  });
  g.add(fleur.group);
  walls.push(fleur.collision);
  aisles.push({ id: "fleur", label: "Fleur séchée", hint: "Indica, sativa, hybride", x: -3.4, z: -0.8, items: ["weed", "fleur_indica", "fleur_sativa"] });
  ["weed", "fleur_indica", "fleur_sativa"].forEach((id, i) => garments.push({ itemId: id, x: -4.4 + i * 1.0, z: -1.5 }));

  /* Vitrine Huiles */
  const huile = buildVitrine({
    id: "huile", label: "Huiles & Concentrés", hint: "Flacons 30 ml, shatter",
    x: 3.4, z: -1.5, width: 3.8, depth: 0.75,
    accent: mats.emissiveGold, items: ["huile", "shatter", "live_resin"],
  });
  g.add(huile.group);
  walls.push(huile.collision);
  aisles.push({ id: "huile", label: "Huiles & Concentrés", hint: "Flacons 30 ml, shatter", x: 3.4, z: -0.8, items: ["huile", "shatter", "live_resin"] });
  ["huile", "shatter", "live_resin"].forEach((id, i) => garments.push({ itemId: id, x: 2.4 + i * 1.0, z: -1.5 }));

  /* Caisses (3 postes) */
  const registerXs = [-4.2, 0, 4.2];
  registerXs.forEach((rx, i) => {
    const rz = -3.5;
    const reg = buildRegisterCounter(i, rx, rz);
    g.add(reg.group);
    walls.push(reg.collision);
    aisles.push({
      id: i === 0 ? "caisse" : `caisse_${i}`,
      label: i === 0 ? "Caisse 01" : `Caisse 0${i + 1}`,
      hint: "TPS + TVQ · 14.975%",
      x: rx, z: rz + 1.1, items: [],
    });
    Object.values(reg.interactives ?? {}).forEach((it) => interactives.push(it));
  });

  /* Conseil (au fond gauche) */
  const conseil = buildConseilCounter(-5.2, -5.0);
  g.add(conseil.group);
  walls.push(conseil.collision);
  aisles.push({ id: "conseil", label: "Conseiller", hint: "Dosage, produits", x: -3.4, z: -5.0, items: [] });
  Object.values(conseil.interactives ?? {}).forEach((it) => interactives.push(it));

  /* Réserve (au fond droit) */
  const reserveX = 5.0;
  const reserveZ = -5.2;
  const reserveDoor = buildReserveDoor(reserveX, 0, reserveZ, 1.4, 2.3);
  g.add(reserveDoor);
  walls.push({ minX: reserveX - 0.75, maxX: reserveX + 0.75, minZ: reserveZ - 0.15, maxZ: reserveZ + 0.15 });
  aisles.push({ id: "reserve", label: "Réserve", hint: "Employés seulement", x: reserveX, z: reserveZ + 1.3, items: [] });

  /* Coffre-fort */
  const safe = buildSafe(reserveX + 0.2, 0.7, reserveZ - 0.8);
  g.add(safe.group);
  walls.push(safe.collision);
  Object.values(safe.interactives ?? {}).forEach((it) => interactives.push(it));

  /* Terminal caméras (accueil arrière) */
  const camTerm = buildCameraTerminal(-4.6, 1.3, 3.4);
  g.add(camTerm.group);
  walls.push(camTerm.collision);
  Object.values(camTerm.interactives ?? {}).forEach((it) => interactives.push(it));

  /* ─── AFFICHES MURALES ─── */
  const postersData: Array<{ tex: THREE.Texture; x: number; y: number; z: number; w: number; h: number; rotY: number }> = [
    { tex: POSTERS.age21(),    x: -W / 2 + 0.12, y: 2.1, z: 3.5, w: 1.2, h: 1.5, rotY: Math.PI / 2 },
    { tex: POSTERS.video(),    x: W / 2 - 0.12,  y: 2.1, z: 3.5, w: 1.2, h: 1.5, rotY: -Math.PI / 2 },
    { tex: POSTERS.noReentry(),x: -W / 2 + 0.12, y: 2.1, z: -1.0, w: 1.0, h: 1.3, rotY: Math.PI / 2 },
    { tex: POSTERS.hours(),    x: W / 2 - 0.12,  y: 2.1, z: -1.0, w: 1.0, h: 1.3, rotY: -Math.PI / 2 },
    { tex: POSTERS.noSmoke(),  x: -W / 2 + 0.12, y: 2.1, z: -4.5, w: 1.0, h: 1.3, rotY: Math.PI / 2 },
    { tex: POSTERS.proof21(),  x: W / 2 - 0.12,  y: 2.1, z: -4.5, w: 1.0, h: 1.3, rotY: -Math.PI / 2 },
  ];
  for (const p of postersData) {
    const m = makePosterMesh(p.tex, p.w, p.h);
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = p.rotY;
    g.add(m);
  }

  /* ─── CAMÉRAS (positions logiques) ─── */
  cameras.push(
    { id: `${storeId}_cam_entry`,     position: [0, H - 0.3, FRONT_Z - 0.6], lookAt: [0, 1.5, 0] },
    { id: `${storeId}_cam_registers`, position: [0, H - 0.3, -2.0],          lookAt: [0, 1.3, -3.5] },
    { id: `${storeId}_cam_aisles_l`,  position: [-5.5, H - 0.3, 0.5],        lookAt: [-3.0, 1.3, 0.5] },
    { id: `${storeId}_cam_aisles_r`,  position: [5.5, H - 0.3, 0.5],         lookAt: [3.0, 1.3, 0.5] },
    { id: `${storeId}_cam_back`,      position: [0, H - 0.3, BACK_Z + 0.5],  lookAt: [0, 1.5, -2.0] },
    { id: `${storeId}_cam_reserve`,   position: [reserveX, H - 0.3, reserveZ + 1.2], lookAt: [reserveX, 1.3, reserveZ] },
  );

  /* ─── TRI RENDERORDER (corrige les superpositions) ─── */
  g.children.forEach((child) => {
    if (child instanceof THREE.Object3D) {
      child.renderOrder = Math.round((FRONT_Z - child.position.z) * 10);
    }
  });

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, FRONT_Z - 2.4),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, FRONT_Z - 0.6),
    walls,
    aisles,
    garments,
    interactives,
    cameras,
    sas,
    title: "SQDC",
    subtitle: "Société Québécoise du Cannabis — 21 ans · 10 h – 21 h",
  };
}