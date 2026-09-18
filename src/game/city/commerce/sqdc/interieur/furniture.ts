/**
 * TROXTWORLD — Mobilier SQDC (comptoirs, vitrines, étagères)
 * Chaque fonction retourne un Group + sa boîte de collision.
 */
import * as THREE from "three";
import { sqdcMaterials } from "../materiaux";
import { POSTERS, makePosterMesh } from "../posters";

export interface CollisionBox { minX: number; maxX: number; minZ: number; maxZ: number }

export interface FurnitureResult {
  group: THREE.Group;
  collision: CollisionBox;
  interactives?: Record<string, { x: number; y: number; z: number; kind: string }>;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, name?: string) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

/* ─────────── COMPTOIR CAISSE (3 postes) ─────────── */
export function buildRegisterCounter(index: number, x: number, z: number): FurnitureResult {
  const g = new THREE.Group();
  g.name = `register_counter_${index}`;
  const mats = sqdcMaterials();

  g.add(box(2.6, 1.05, 0.85, x, 0.525, z, mats.oak));
  g.add(box(2.72, 0.07, 0.92, x, 1.09, z, mats.steel));
  g.add(box(2.5, 0.08, 0.06, x, 0.06, z + 0.44, mats.emissiveGreen.clone()));

  // Écran tourné vers le client
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.36),
    new THREE.MeshStandardMaterial({
      map: POSTERS.priceInfo(),
      emissive: 0x226644,
      emissiveIntensity: 0.35,
    }),
  );
  screen.position.set(x, 1.38, z - 0.12);
  screen.rotation.x = -Math.PI / 3;
  g.add(screen);

  // Tiroir-caisse
  g.add(box(0.5, 0.18, 0.4, x - 0.8, 1.14, z + 0.15, mats.dark));

  // Terminal TPS
  const terminal = box(0.28, 0.16, 0.22, x + 0.85, 1.20, z + 0.10, mats.dark, `reg_terminal_${index}`);
  g.add(terminal);
  const tScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.12),
    new THREE.MeshStandardMaterial({ emissive: 0x1133aa, emissiveIntensity: 0.9, color: 0x0a0a0a }),
  );
  tScreen.position.set(x + 0.85, 1.29, z + 0.10);
  tScreen.rotation.x = -Math.PI / 2.5;
  g.add(tScreen);

  // Tapis anti-fatigue au sol
  // (déjà inclus dans l'intérieur global)

  // Barrière de sécurité
  g.add(box(0.10, 1.15, 0.10, x - 1.35, 0.575, z, mats.accentGold));

  return {
    group: g,
    collision: { minX: x - 1.4, maxX: x + 1.4, minZ: z - 0.55, maxZ: z + 0.55 },
    interactives: {
      register: { x, y: 1.35, z: z + 0.15, kind: "register" },
      terminal: { x: x + 0.85, y: 1.25, z: z + 0.15, kind: "terminal" },
    },
  };
}

/* ─────────── COMPTOIR ACCUEIL (contrôle ID) ─────────── */
export function buildAccueilCounter(x: number, z: number): FurnitureResult {
  const g = new THREE.Group();
  g.name = "accueil_counter";
  const mats = sqdcMaterials();

  g.add(box(2.4, 1.05, 0.75, x, 0.525, z, mats.oak));
  g.add(box(2.5, 0.06, 0.80, x, 1.08, z, mats.oakTop));
  g.add(box(0.5, 0.10, 0.4, x - 0.7, 1.16, z, mats.steel));

  // Scanner d'identité
  const scanner = box(0.35, 0.10, 0.28, x + 0.4, 1.15, z, mats.dark, "id_scanner");
  g.add(scanner);

  const scanScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.16),
    new THREE.MeshStandardMaterial({
      map: POSTERS.idRequired(),
      emissive: 0x2244aa,
      emissiveIntensity: 0.4,
    }),
  );
  scanScreen.rotation.x = -Math.PI / 2;
  scanScreen.position.set(x + 0.4, 1.205, z);
  g.add(scanScreen);

  // Terminal caméras
  g.add(box(0.55, 0.35, 0.4, x + 0.3, 1.25, z - 0.3, mats.dark, "camera_terminal"));

  // Affiche ID au-dessus
  const idPoster = makePosterMesh(POSTERS.idRequired(), 1.1, 1.4);
  idPoster.position.set(x, 2.5, z + 0.15);
  idPoster.rotation.y = Math.PI;
  g.add(idPoster);

  return {
    group: g,
    collision: { minX: x - 1.3, maxX: x + 1.3, minZ: z - 0.5, maxZ: z + 0.5 },
    interactives: {
      idScanner: { x: x + 0.4, y: 1.2, z, kind: "id_scanner" },
      cameraTerminal: { x: x + 0.3, y: 1.3, z: z - 0.3, kind: "camera_terminal" },
    },
  };
}

/* ─────────── COMPTOIR CONSEIL ─────────── */
export function buildConseilCounter(x: number, z: number): FurnitureResult {
  const g = new THREE.Group();
  g.name = "conseil_counter";
  const mats = sqdcMaterials();

  g.add(box(2.2, 0.95, 0.7, x, 0.475, z, mats.oak));
  g.add(box(2.3, 0.06, 0.75, x, 1.0, z, mats.oakTop));
  g.add(box(0.06, 1.65, 0.7, x + 1.25, 0.825, z, mats.accentGreen));

  // Tablette démo produits
  g.add(box(0.65, 0.55, 0.5, x - 0.6, 1.35, z, mats.steel));

  // Affiche "Conseils"
  const board = makePosterMesh(POSTERS.respect(), 1.1, 1.4);
  board.position.set(x + 1.22, 2.4, z);
  board.rotation.y = -Math.PI / 2;
  g.add(board);

  return {
    group: g,
    collision: { minX: x - 1.2, maxX: x + 1.3, minZ: z - 0.45, maxZ: z + 0.45 },
    interactives: {
      conseil: { x: x + 1.6, y: 1.2, z, kind: "conseil" },
    },
  };
}

/* ─────────── ÉTAGÈRE STANDARD ─────────── */
export interface ShelfOpts {
  id: string;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  accent: THREE.Material;
  items: string[];
  facing?: 1 | -1;
}

export function buildShelfAisle(o: ShelfOpts): FurnitureResult {
  const g = new THREE.Group();
  g.name = `shelf_${o.id}`;
  const mats = sqdcMaterials();
  const { x, z, width, depth } = o;

  g.add(box(width, 0.10, depth, x, 1.20, z, mats.oak));
  g.add(box(width, 0.10, depth, x, 0.55, z, mats.oak));
  g.add(box(width, 0.85, 0.06, x, 0.42, z + depth * 0.4, mats.dark));

  // Bandeau supérieur
  g.add(box(width * 0.9, 0.22, 0.06, x, 1.72, z - depth * 0.42, o.accent.clone()));

  // Étiquettes produits (cartes)
  const count = o.items.length;
  const facing = o.facing ?? 1;
  for (let i = 0; i < count; i++) {
    const px = x - width * 0.35 + i * (width * 0.7 / Math.max(1, count - 1));
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.48),
      new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.72 }),
    );
    card.position.set(px, 1.36, z + facing * 0.04);
    if (facing < 0) card.rotation.y = Math.PI;
    g.add(card);
  }

  return {
    group: g,
    collision: { minX: x - width / 2 - 0.1, maxX: x + width / 2 + 0.1, minZ: z - depth / 2 - 0.1, maxZ: z + depth / 2 + 0.1 },
  };
}

/* ─────────── VITRINE VERRE (fleur / huiles) ─────────── */
export function buildVitrine(o: ShelfOpts): FurnitureResult {
  const g = new THREE.Group();
  g.name = `vitrine_${o.id}`;
  const mats = sqdcMaterials();
  const { x, z, width, depth } = o;

  g.add(box(width, 0.95, depth, x, 0.475, z, mats.oak));
  g.add(box(width + 0.05, 0.05, depth + 0.05, x, 0.975, z, mats.steel));

  const vitre = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.15, 0.9, depth - 0.15),
    mats.glass,
  );
  vitre.position.set(x, 1.5, z);
  g.add(vitre);

  g.add(box(width * 0.9, 0.15, 0.05, x, 2.1, z - depth * 0.45, o.accent.clone()));

  const count = o.items.length;
  for (let i = 0; i < count; i++) {
    const px = x - width * 0.32 + i * (width * 0.64 / Math.max(1, count - 1));
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.20, 12), mats.glass);
    jar.position.set(px, 1.25, z);
    g.add(jar);
    g.add(box(0.14, 0.03, 0.14, px, 1.37, z, mats.dark));

    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x1a1c1e }),
    );
    card.position.set(px, 1.55, z + 0.1);
    g.add(card);
  }

  return {
    group: g,
    collision: { minX: x - width / 2 - 0.1, maxX: x + width / 2 + 0.1, minZ: z - depth / 2 - 0.1, maxZ: z + depth / 2 + 0.1 },
  };
}

/* ─────────── COFFRE-FORT ─────────── */
export function buildSafe(x: number, y: number, z: number): FurnitureResult {
  const g = new THREE.Group();
  g.name = "safe";
  const mats = sqdcMaterials();

  g.add(box(1.0, 1.4, 0.9, x, y, z, new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, roughness: 0.35, metalness: 0.9,
  }), "safe_body"));

  g.add(box(0.3, 0.25, 0.08, x, y + 0.3, z + 0.46, mats.accentGold, "safe_dial"));
  g.add(box(0.9, 0.06, 0.9, x, y - 0.66, z, mats.dark));

  return {
    group: g,
    collision: { minX: x - 0.55, maxX: x + 0.55, minZ: z - 0.5, maxZ: z + 0.5 },
    interactives: {
      safe: { x, y: y + 0.3, z: z + 0.5, kind: "safe" },
    },
  };
}

/* ─────────── TERMINAL CAMÉRAS (poste sécurité) ─────────── */
export function buildCameraTerminal(x: number, y: number, z: number): FurnitureResult {
  const g = new THREE.Group();
  g.name = "camera_terminal";
  const mats = sqdcMaterials();

  g.add(box(1.4, 0.9, 0.6, x, y, z, mats.dark));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.65),
    new THREE.MeshStandardMaterial({
      map: POSTERS.video(),
      emissive: 0x2266aa,
      emissiveIntensity: 0.5,
    }),
  );
  screen.position.set(x, y + 0.4, z - 0.31);
  screen.rotation.x = Math.PI;
  g.add(screen);

  return {
    group: g,
    collision: { minX: x - 0.75, maxX: x + 0.75, minZ: z - 0.35, maxZ: z + 0.35 },
    interactives: {
      cameraTerminal: { x, y: y + 0.5, z: z - 0.4, kind: "camera_terminal" },
    },
  };
}