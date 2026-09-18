/**
 * TROXTWORLD — SQDC Intérieur v4.0 (layout corrigé)
 * Z-order : entrée → accueil → allées → caisses → conseil → réserve
 */
import * as THREE from "three";
import { texConcrete, texOak, texBrushedSteel, texEntryMat, texFrostedGlass } from "./textures";
import { POSTERS, makePosterMesh } from "./posters";
import { buildSqdcSas } from "./sas";

export interface SqdcInteriorResult {
  group: THREE.Group;
  spawn: THREE.Vector3;
  spawnYaw: number;
  exit: THREE.Vector3;
  walls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  aisles: Array<{ id: string; label: string; hint: string; x: number; z: number; items: string[] }>;
  garments: Array<{ itemId: string; x: number; z: number }>;
  interactives: {
    register: { x: number; y: number; z: number; id: string };
    safe: { x: number; y: number; z: number };
    backDoor: { x: number; y: number; z: number };
    idScanner: { x: number; y: number; z: number };
    cameraTerminal: { x: number; y: number; z: number };
  };
  title: string;
  subtitle: string;
}

/* ─────────── BOX helper ─────────── */
function box(
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
  name?: string,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

/* ─────────── MATÉRIAUX partagés ─────────── */
function buildMats() {
  const concrete = new THREE.MeshStandardMaterial({
    map: texConcrete([6, 6]),
    roughness: 0.86,
    metalness: 0.02,
    color: 0x8a9098,
  });
  const oak = new THREE.MeshStandardMaterial({
    map: texOak([1, 2]),
    roughness: 0.62,
    metalness: 0.05,
  });
  const oakTop = new THREE.MeshStandardMaterial({
    map: texOak([2, 1]),
    roughness: 0.45,
    metalness: 0.08,
    color: 0xd8b88a,
  });
  const steel = new THREE.MeshStandardMaterial({
    map: texBrushedSteel([2, 1]),
    roughness: 0.28,
    metalness: 0.85,
    color: 0xb8bcc2,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.7 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.95 });
  const accentGreen = new THREE.MeshStandardMaterial({ color: 0x1a5632, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 0.7 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    map: texFrostedGlass(),
    color: 0xa8c8d8,
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.88,
    thickness: 0.4,
    ior: 1.45,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const emissiveGreen = new THREE.MeshStandardMaterial({
    color: 0x0a2818,
    emissive: 0x2a7a48,
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });
  const emissiveGold = new THREE.MeshStandardMaterial({
    color: 0x2a1e0a,
    emissive: 0xc9a24a,
    emissiveIntensity: 1.2,
  });
  return { concrete, oak, oakTop, steel, dark, wallMat, accentGreen, gold, glassMat, emissiveGreen, emissiveGold };
}

/* ─────────── CONSTRUCTION PRINCIPALE ─────────── */
export function buildSqdcInterior(storeId: string): SqdcInteriorResult {
  const g = new THREE.Group();
  g.name = "sqdc_interior";
  g.userData = { type: "sqdc-interior", storeId };

  const W = 15.2;   // largeur intérieure
  const D = 12.6;   // profondeur intérieure
  const H = 3.4;    // hauteur

  const FRONT_Z = D / 2;   // +6.3 (entrée)
  const BACK_Z = -D / 2;   // -6.3 (mur du fond)
  const ENTRY_HALF = 2.2;  // largeur du SAS

  const mats = buildMats();
  const walls: SqdcInteriorResult["walls"] = [];
  const aisles: SqdcInteriorResult["aisles"] = [];
  const garments: SqdcInteriorResult["garments"] = [];

  /* ─── UTIL : ajoute un mur + boîte de collision ─── */
  const addWall = (
    w: number, h: number, d: number,
    x: number, y: number, z: number,
    mat: THREE.Material,
    pad = 0.08,
  ) => {
    const mesh = box(w, h, d, x, y, z, mat);
    g.add(mesh);
    walls.push({
      minX: x - w / 2 - pad, maxX: x + w / 2 + pad,
      minZ: z - d / 2 - pad, maxZ: z + d / 2 + pad,
    });
    return mesh;
  };

  /* ══════════════════════════════════════════════════════════
     1) SOL + PLAFOND + MURS
     ══════════════════════════════════════════════════════════ */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.concrete);
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

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.96 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  g.add(ceiling);

  // Murs
  addWall(W, H, 0.20, 0, H / 2, BACK_Z, mats.wallMat);
  addWall(0.20, H, D, -W / 2, H / 2, 0, mats.wallMat);
  addWall(0.20, H, D, W / 2, H / 2, 0, mats.wallMat);

  // Mur avant percé d'une ouverture (le SAS)
  const frontSegW = (W - ENTRY_HALF * 2) / 2;
  const frontSegX = ENTRY_HALF + frontSegW / 2;
  addWall(frontSegW, H, 0.20, -frontSegX, H / 2, FRONT_Z, mats.wallMat);
  addWall(frontSegW, H, 0.20, frontSegX, H / 2, FRONT_Z, mats.wallMat);
  // Linteau au-dessus de l'entrée
  g.add(box(ENTRY_HALF * 2, 0.40, 0.20, 0, H - 0.20, FRONT_Z, mats.wallMat));

  /* ══════════════════════════════════════════════════════════
     2) ÉCLAIRAGE
     ══════════════════════════════════════════════════════════ */
  for (const x of [-5.2, 0, 5.2]) {
    // Rails LED
    const tube = box(3.6, 0.05, 0.16, x, H - 0.08, 0.4, mats.emissiveGreen.clone());
    g.add(tube);
    const light = new THREE.PointLight(0xfff4d8, 1.6, 8, 1.6);
    light.position.set(x, H - 0.6, 0.4);
    g.add(light);
  }
  const mainLight = new THREE.PointLight(0xfff6e6, 2.0, 18, 1.5);
  mainLight.position.set(0, H - 0.8, 1.5);
  g.add(mainLight);

  /* ══════════════════════════════════════════════════════════
     3) SAS D'ENTRÉE (double-porte sécurisée)
     ══════════════════════════════════════════════════════════ */
  const sas = buildSqdcSas(storeId, 0, 0, FRONT_Z);
  g.add(sas.group);
  walls.push(...sas.collisionWalls);

  /* ══════════════════════════════════════════════════════════
     4) MUR DU FOND — affiches principales
     ══════════════════════════════════════════════════════════ */
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

  const subtitle = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 0.5),
    new THREE.MeshStandardMaterial({ map: POSTERS.legal() }),
  );
  subtitle.position.set(0, 1.55, BACK_Z + 0.11);
  g.add(subtitle);

  /* ══════════════════════════════════════════════════════════
     5) LAYOUT — Repères Z (de l'entrée vers le fond)
        z = +5.4  → SAS / entrée
        z = +3.0  → ACCUEIL (contrôle ID)
        z = +1.5  → Allées avant (accessoires / préroulés)
        z = -0.5  → Allées centrales (vapes / comestibles)
        z = -2.5  → Allées fleur / huiles
        z = -4.5  → CAISSES (rangée 3 postes)
        z = -5.8  → MUR DU FOND (conseil + réserve)
     ══════════════════════════════════════════════════════════ */

  /* ─── ACCUEIL (z = 3.0, proche entrée côté gauche) ─── */
  const accueilX = -4.6;
  const accueilZ = 3.0;
  g.add(box(2.4, 1.05, 0.75, accueilX, 0.525, accueilZ, mats.oak, "accueil_counter"));
  g.add(box(2.5, 0.06, 0.80, accueilX, 1.08, accueilZ, mats.oakTop));
  g.add(box(0.5, 0.1, 0.4, accueilX - 0.7, 1.16, accueilZ, mats.steel));

  // Scanner ID (interactif)
  const idScanner = box(0.35, 0.10, 0.28, accueilX + 0.4, 1.15, accueilZ, mats.dark, "id_scanner");
  g.add(idScanner);
  const idScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.16),
    new THREE.MeshStandardMaterial({ map: POSTERS.idRequired(), emissive: 0x2244aa, emissiveIntensity: 0.3 }),
  );
  idScreen.rotation.x = -Math.PI / 2;
  idScreen.position.set(accueilX + 0.4, 1.205, accueilZ);
  g.add(idScreen);

  walls.push({ minX: accueilX - 1.3, maxX: accueilX + 1.3, minZ: accueilZ - 0.45, maxZ: accueilZ + 0.45 });
  aisles.push({ id: "accueil", label: "Accueil", hint: "Contrôle d'identité 21+", x: accueilX, z: accueilZ + 0.9, items: [] });

  // Affiche ID au-dessus de l'accueil
  const idPoster = makePosterMesh(POSTERS.idRequired(), 1.2, 1.5);
  idPoster.position.set(accueilX, 2.4, FRONT_Z - 0.15);
  idPoster.rotation.y = Math.PI;
  g.add(idPoster);

  /* ─── ALLÉES CENTRALES (rangées de produits) ─── */
  // Rangée 1 (z = +1.5) : Préroulés + Accessoires
  addShelfAisle(g, mats, walls, aisles, garments, {
    id: "preroll",
    label: "Préroulés",
    hint: "Joints, gélules, hash",
    x: -3.4, z: 1.5, width: 3.6, depth: 0.7,
    accent: mats.accentGreen,
    items: ["preroll", "gelules", "hash"],
  });

  addShelfAisle(g, mats, walls, aisles, garments, {
    id: "accessoires",
    label: "Accessoires",
    hint: "Papiers, grinders, pipes",
    x: 3.4, z: 1.5, width: 3.6, depth: 0.7,
    accent: mats.emissiveGold,
    items: ["rolling_papers", "grinder", "pipe_glass"],
  });

  // Rangée 2 (z = -0.5) : Vapes + Comestibles
  addShelfAisle(g, mats, walls, aisles, garments, {
    id: "vape",
    label: "Vapes",
    hint: "Cartouches, batteries",
    x: -3.4, z: -0.5, width: 3.6, depth: 0.7,
    accent: mats.accentGreen,
    items: ["vape", "vape_cart_indica"],
  });

  addShelfAisle(g, mats, walls, aisles, garments, {
    id: "edibles",
    label: "Comestibles",
    hint: "Bonbons, chocolat",
    x: 3.4, z: -0.5, width: 3.6, depth: 0.7,
    accent: mats.emissiveGold,
    items: ["gummies_10mg", "chocolate_5mg"],
  });

  // Rangée 3 (z = -2.5) : Fleur + Huiles (vitrines en verre)
  addVitrine(g, mats, walls, aisles, garments, {
    id: "fleur",
    label: "Fleur séchée",
    hint: "Indica, sativa, hybride",
    x: -3.4, z: -2.5, width: 3.8, depth: 0.75,
    items: ["weed", "fleur_indica", "fleur_sativa"],
  });

  addVitrine(g, mats, walls, aisles, garments, {
    id: "huile",
    label: "Huiles & Concentrés",
    hint: "Flacons 30 ml, shatter",
    x: 3.4, z: -2.5, width: 3.8, depth: 0.75,
    items: ["huile", "shatter", "live_resin"],
  });

  /* ─── CAISSES (z = -4.5, rangée de 3 postes) ─── */
  const registerXs = [-4.2, 0, 4.2];
  for (let i = 0; i < registerXs.length; i++) {
    const rx = registerXs[i];
    const rz = -4.5;

    // Comptoir principal (solide, massif)
    g.add(box(2.6, 1.05, 0.85, rx, 0.525, rz, mats.oak, `register_counter_${i}`));
    g.add(box(2.7, 0.07, 0.90, rx, 1.09, rz, mats.steel));
    // Bandeau LED accent
    const band = box(2.5, 0.08, 0.06, rx, 0.06, rz + 0.44, mats.emissiveGreen.clone());
    g.add(band);

    // Écran caisse
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.32),
      new THREE.MeshStandardMaterial({
        map: POSTERS.age21(),   // fallback, remplacé en runtime si texture dédiée
        emissive: 0x226644,
        emissiveIntensity: 0.4,
      }),
    );
    screen.position.set(rx, 1.35, rz - 0.1);
    screen.rotation.x = -Math.PI / 2.3;
    g.add(screen);

    // Tiroir-caisse
    g.add(box(0.5, 0.18, 0.4, rx - 0.8, 1.14, rz + 0.15, mats.dark));

    // Barrière de sécurité
    g.add(box(0.10, 1.10, 0.10, rx - 1.35, 0.55, rz, mats.gold));

    // Collision
    walls.push({ minX: rx - 1.4, maxX: rx + 1.4, minZ: rz - 0.55, maxZ: rz + 0.55 });

    aisles.push({
      id: i === 0 ? "caisse" : `caisse_${i}`,
      label: i === 0 ? "Caisse 01" : `Caisse 0${i + 1}`,
      hint: "TPS + TVQ · 14.975%",
      x: rx, z: rz + 1.0, items: [],
    });
  }

  /* ─── CONSEIL (z = -5.5, derrière les caisses — AU FOND) ─── */
  const conseilX = -5.2;
  const conseilZ = -5.6;
  g.add(box(2.2, 0.95, 0.7, conseilX, 0.475, conseilZ, mats.oak));
  g.add(box(2.3, 0.06, 0.75, conseilX, 1.0, conseilZ, mats.oakTop));
  g.add(box(0.06, 1.65, 0.7, conseilX + 1.25, 0.825, conseilZ, mats.accentGreen));
  const conseilScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.65),
    new THREE.MeshStandardMaterial({ map: POSTERS.respect(), emissive: 0x224422, emissiveIntensity: 0.2 }),
  );
  conseilScreen.position.set(conseilX + 1.22, 2.3, conseilZ);
  conseilScreen.rotation.y = -Math.PI / 2;
  g.add(conseilScreen);
  walls.push({ minX: conseilX - 1.2, maxX: conseilX + 1.3, minZ: conseilZ - 0.45, maxZ: conseilZ + 0.45 });
  aisles.push({ id: "conseil", label: "Conseiller", hint: "Dosage, produits", x: conseilX + 1.8, z: conseilZ, items: [] });

  /* ─── RÉSERVE (z = -5.6, côté droit, derrière porte sécurisée) ─── */
  const reserveX = 5.0;
  const reserveZ = -5.6;
  // Porte de réserve + encadrement
  g.add(box(0.16, 2.4, 0.16, reserveX - 1.2, 1.2, reserveZ, mats.accentGreen));
  g.add(box(0.16, 2.4, 0.16, reserveX + 1.2, 1.2, reserveZ, mats.accentGreen));
  const backDoor = box(2.0, 2.3, 0.10, reserveX, 1.15, reserveZ, mats.dark, "back_door");
  g.add(backDoor);
  // Panneau "EMPLOYÉS SEULEMENT"
  const reservePoster = makePosterMesh(POSTERS.reserve(), 1.4, 0.9);
  reservePoster.position.set(reserveX, 2.6, reserveZ + 0.06);
  g.add(reservePoster);
  walls.push({ minX: reserveX - 1.2, maxX: reserveX + 1.2, minZ: reserveZ - 0.15, maxZ: reserveZ + 0.15 });
  aisles.push({ id: "reserve", label: "Réserve", hint: "Employés seulement", x: reserveX, z: reserveZ + 1.2, items: [] });

  /* ─── COFFRE-FORT (dans la réserve) ─── */
  const safePos = { x: reserveX + 0.3, y: 0.7, z: reserveZ - 0.5 };
  g.add(box(1.0, 1.4, 0.9, safePos.x, safePos.y, safePos.z, new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, roughness: 0.35, metalness: 0.9,
  }), "safe"));
  g.add(box(0.3, 0.25, 0.08, safePos.x, safePos.y + 0.3, safePos.z + 0.46, mats.gold, "safe_dial"));

  /* ─── TERMINAL CAMÉRAS (accueil) ─── */
  g.add(box(0.55, 0.35, 0.4, accueilX + 0.3, 1.25, accueilZ - 0.15, mats.dark, "camera_terminal"));

  /* ══════════════════════════════════════════════════════════
     6) AFFICHES RÉGLEMENTAIRES (murs latéraux)
     ══════════════════════════════════════════════════════════ */
  const post1 = makePosterMesh(POSTERS.age21(), 1.2, 1.5);
  post1.position.set(-W / 2 + 0.12, 2.1, 2.0);
  post1.rotation.y = Math.PI / 2;
  g.add(post1);

  const post2 = makePosterMesh(POSTERS.video(), 1.2, 1.5);
  post2.position.set(W / 2 - 0.12, 2.1, 2.0);
  post2.rotation.y = -Math.PI / 2;
  g.add(post2);

  const post3 = makePosterMesh(POSTERS.noReentry(), 1.0, 1.3);
  post3.position.set(-W / 2 + 0.12, 2.1, -3.0);
  post3.rotation.y = Math.PI / 2;
  g.add(post3);

  const post4 = makePosterMesh(POSTERS.hours(), 1.0, 1.3);
  post4.position.set(W / 2 - 0.12, 2.1, -3.0);
  post4.rotation.y = -Math.PI / 2;
  g.add(post4);

  /* ══════════════════════════════════════════════════════════
     7) TRI PAR Z (renderOrder) — corrige la superposition
     ══════════════════════════════════════════════════════════ */
  g.children.forEach((child) => {
    if (child instanceof THREE.Object3D) {
      // Les objets plus proches de l'entrée (z +) rendus en premier
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
    interactives: {
      register: { x: 0, y: 1.35, z: -4.4, id: "reg_1" },
      safe: { x: safePos.x, y: safePos.y, z: safePos.z },
      backDoor: { x: reserveX, y: 1.15, z: reserveZ },
      idScanner: { x: accueilX + 0.4, y: 1.15, z: accueilZ },
      cameraTerminal: { x: accueilX + 0.3, y: 1.25, z: accueilZ - 0.15 },
    },
    title: "SQDC",
    subtitle: "Société Québécoise du Cannabis — 21 ans · 10 h – 21 h",
  };
}

/* ─────────── HELPERS : RAYON STANDARD ─────────── */
interface ShelfOpts {
  id: string; label: string; hint: string;
  x: number; z: number; width: number; depth: number;
  accent: THREE.Material;
  items: string[];
}

function addShelfAisle(
  g: THREE.Group, mats: ReturnType<typeof buildMats>,
  walls: SqdcInteriorResult["walls"], aisles: SqdcInteriorResult["aisles"],
  garments: SqdcInteriorResult["garments"], opts: ShelfOpts,
) {
  const { x, z, width, depth } = opts;
  // Structure
  g.add(box(width, 0.10, depth, x, 1.20, z, mats.oak, `shelf_top_${opts.id}`));
  g.add(box(width, 0.10, depth, x, 0.55, z, mats.oak));
  g.add(box(width, 0.85, 0.06, x, 0.42, z + depth * 0.4, mats.dark));
  // Bandeau
  const header = box(width * 0.9, 0.22, 0.06, x, 1.72, z - depth * 0.42, opts.accent.clone());
  g.add(header);
  // Étiquette
  const label = makePosterMesh(POSTERS.legal(), width * 0.75, 0.28);
  label.position.set(x, 1.72, z - depth * 0.44);
  label.rotation.y = 0;
  g.add(label);

  // Étagère supérieure
  g.add(box(width, 0.08, depth, x, 1.85, z, mats.oak));
  // Étagère inférieure
  g.add(box(width, 0.08, depth, x, 0.80, z, mats.oak));

  // Collision
  walls.push({ minX: x - width / 2 - 0.1, maxX: x + width / 2 + 0.1, minZ: z - depth / 2 - 0.1, maxZ: z + depth / 2 + 0.1 });

  aisles.push({ id: opts.id, label: opts.label, hint: opts.hint, x, z: z + depth * 0.6, items: opts.items });

  // Produits exposés
  const count = opts.items.length;
  for (let i = 0; i < count; i++) {
    const px = x - width * 0.35 + i * (width * 0.7 / Math.max(1, count - 1));
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.7 }),
    );
    card.position.set(px, 1.35, z + 0.05);
    g.add(card);
    garments.push({ itemId: opts.items[i], x: px, z });
  }
}

/* ─────────── HELPERS : VITRINE (fleur / huiles) ─────────── */
function addVitrine(
  g: THREE.Group, mats: ReturnType<typeof buildMats>,
  walls: SqdcInteriorResult["walls"], aisles: SqdcInteriorResult["aisles"],
  garments: SqdcInteriorResult["garments"], opts: ShelfOpts,
) {
  const { x, z, width, depth } = opts;
  // Socle
  g.add(box(width, 0.95, depth, x, 0.475, z, mats.oak, `vitrine_base_${opts.id}`));
  g.add(box(width + 0.05, 0.05, depth + 0.05, x, 0.975, z, mats.steel));
  // Vitrine en verre
  const vitre = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.15, 0.9, depth - 0.15),
    mats.glassMat,
  );
  vitre.position.set(x, 1.5, z);
  g.add(vitre);
  // Bandeau émissif
  g.add(box(width * 0.9, 0.15, 0.05, x, 2.1, z - depth * 0.45, opts.accent.clone()));

  walls.push({ minX: x - width / 2 - 0.1, maxX: x + width / 2 + 0.1, minZ: z - depth / 2 - 0.1, maxZ: z + depth / 2 + 0.1 });
  aisles.push({ id: opts.id, label: opts.label, hint: opts.hint, x, z: z + depth * 0.7, items: opts.items });

  // Boccaux exposés
  const count = opts.items.length;
  for (let i = 0; i < count; i++) {
    const px = x - width * 0.32 + i * (width * 0.64 / Math.max(1, count - 1));
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.10, 0.20, 12),
      mats.glassMat,
    );
    jar.position.set(px, 1.25, z);
    g.add(jar);
    g.add(box(0.14, 0.03, 0.14, px, 1.37, z, mats.dark));

    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.30, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x1a1c1e }),
    );
    card.position.set(px, 1.55, z + 0.10);
    g.add(card);
    garments.push({ itemId: opts.items[i], x: px, z });
  }
}