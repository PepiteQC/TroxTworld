/**
 * ═══════════════════════════════════════════════════════════════════
 *  FIXTURES — QUALITÉ GTA RP (v2.0)
 *  Portes sécurisées, salle de bain, fenêtres à rideaux.
 *  Builders Three.js purs, sans R3F.
 *
 *  Améliorations :
 *  - Détails visuels plus "GTA RP" : panneaux, poignées, charnières,
 *    plinthes, miroir, robinetterie, rideaux avec plis, etc.
 *  - userData Roleplay pour interactions : portes, lecteurs carte,
 *    fenêtres, sanitaires.
 *  - Géométries mises en cache pour réduire les allocations répétées.
 *  - Ombres propres, matériaux PBR, proportions conservées.
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { tex } from "./textures";

// ─────────────────────────────────────────────────────────────────────────────
// CACHE DE GÉOMÉTRIE — évite de recréer des Box/Cylinder identiques
// ─────────────────────────────────────────────────────────────────────────────

const GEO_CACHE = new Map<string, THREE.BufferGeometry>();

function boxGeo(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = `box|${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}`;
  let geo = GEO_CACHE.get(key);

  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    GEO_CACHE.set(key, geo);
  }

  return geo;
}

function cylGeo(r: number, h: number, seg = 12): THREE.BufferGeometry {
  const key = `cyl|${r.toFixed(4)}|${h.toFixed(4)}|${seg}`;
  let geo = GEO_CACHE.get(key);

  if (!geo) {
    geo = new THREE.CylinderGeometry(r, r, h, seg);
    GEO_CACHE.set(key, geo);
  }

  return geo;
}

function torusGeo(
  radius: number,
  tube: number,
  radialSegments = 10,
  tubularSegments = 22
): THREE.BufferGeometry {
  const key = `torus|${radius.toFixed(4)}|${tube.toFixed(4)}|${radialSegments}|${tubularSegments}`;
  let geo = GEO_CACHE.get(key);

  if (!geo) {
    geo = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
    GEO_CACHE.set(key, geo);
  }

  return geo;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS MESH
// ─────────────────────────────────────────────────────────────────────────────

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(boxGeo(w, h, d), mat);
  mesh.position.set(x, y, z);

  if (rx) mesh.rotation.x = rx;
  if (ry) mesh.rotation.y = ry;
  if (rz) mesh.rotation.z = rz;

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);
  return mesh;
}

function addCyl(
  parent: THREE.Object3D,
  r: number,
  h: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  seg = 12,
  rx = 0,
  ry = 0,
  rz = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(cylGeo(r, h, seg), mat);
  mesh.position.set(x, y, z);

  if (rx) mesh.rotation.x = rx;
  if (ry) mesh.rotation.y = ry;
  if (rz) mesh.rotation.z = rz;

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);
  return mesh;
}

function addTorus(
  parent: THREE.Object3D,
  radius: number,
  tube: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  radialSegments = 10,
  tubularSegments = 22
): THREE.Mesh {
  const mesh = new THREE.Mesh(torusGeo(radius, tube, radialSegments, tubularSegments), mat);
  mesh.position.set(x, y, z);

  if (rx) mesh.rotation.x = rx;
  if (ry) mesh.rotation.y = ry;
  if (rz) mesh.rotation.z = rz;

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// LECTEUR DE CARTE
// ─────────────────────────────────────────────────────────────────────────────

export function buildCardReader(
  x = 0,
  y = 1.12,
  z = 0.06,
  mode: "idle" | "granted" | "denied" = "granted"
): THREE.Group {
  const g = new THREE.Group();
  g.name = "card-reader";
  g.position.set(x, y, z);

  const shell = matLib.get(0x12151a, 0.38, 0.55);
  const face = matLib.get(0x1d232c, 0.32, 0.62);
  const darkPlastic = matLib.get(0x05070a, 0.8, 0.1);
  const keyMat = matLib.get(0x2b323c, 0.55, 0.25);

  const ledColor = mode === "denied" ? 0xef4444 : 0x22c55e;
  const ledMat = matLib.getEmissive(ledColor, ledColor, mode === "denied" ? 1.15 : 0.9);
  const screenMat = matLib.getEmissive(0x071018, 0x123a5e, 0.55);

  // Corps principal
  addBox(g, 0.115, 0.21, 0.028, shell, 0, 0, 0);
  addBox(g, 0.105, 0.198, 0.008, face, 0, 0, 0.015);

  // Écran
  addBox(g, 0.072, 0.05, 0.005, screenMat, 0, 0.048, 0.02);

  // Slot carte
  addBox(g, 0.056, 0.01, 0.004, darkPlastic, 0, 0.008, 0.02);

  // LED statut
  addBox(g, 0.03, 0.011, 0.004, ledMat, 0, 0.085, 0.02);

  // Keypad 3x4
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const isConfirm = row === 3 && col === 2;
      addBox(
        g,
        0.016,
        0.016,
        0.004,
        isConfirm ? matLib.getEmissive(0x22c55e, 0x22c55e, 0.22) : keyMat,
        -0.024 + col * 0.024,
        -0.022 - row * 0.024,
        0.02
      );
    }
  }

  // Conduit / câble discret
  addBox(g, 0.02, 0.24, 0.018, shell, 0, -0.2, -0.004);

  g.userData = {
    rp: "card-reader",
    interactable: true,
    state: mode,
    requires: "card",
    doorTarget: null,
  };

  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTE SÉCURISÉE
// ─────────────────────────────────────────────────────────────────────────────

export function buildSecurityDoor(): THREE.Group {
  const g = new THREE.Group();
  g.name = "security-door";

  const steel = matLib.get(0x151a22, 0.36, 0.62);
  const darkSteel = matLib.get(0x0b0f14, 0.5, 0.45);
  const leafMat = matLib.get(0x1e2432, 0.34, 0.58);
  const panelMat = matLib.get(0x232a38, 0.32, 0.5);
  const chrome = matLib.get(0xd7dbdf, 0.12, 0.95);
  const rubber = matLib.get(0x090909, 0.9, 0.02);
  const blackMat = matLib.get(0x050505, 0.4, 0.4);

  // ── Cadre extérieur ──
  addBox(g, 0.09, 2.32, 0.18, steel, -0.52, 1.16, 0);
  addBox(g, 0.09, 2.32, 0.18, steel, 0.52, 1.16, 0);
  addBox(g, 1.13, 0.09, 0.18, steel, 0, 2.3, 0);

  // Seuil de porte
  addBox(g, 1.04, 0.05, 0.2, darkSteel, 0, 0.025, 0);

  // Reveals internes pour profondeur
  addBox(g, 0.04, 2.2, 0.12, darkSteel, -0.47, 1.1, 0);
  addBox(g, 0.04, 2.2, 0.12, darkSteel, 0.47, 1.1, 0);
  addBox(g, 0.96, 0.04, 0.12, darkSteel, 0, 2.24, 0);

  // ── Charnières côté gauche ──
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.03, 0.12, 0.035, chrome, -0.455, 0.45 + i * 0.65, 0.075);
  }

  // ── Battant de porte ──
  const door = new THREE.Group();
  door.name = "security-leaf";
  door.position.set(-0.45, 0, 0);
  door.userData = {
    pivot: true,
    hinge: "left",
  };

  // Panneau principal
  addBox(door, 0.92, 2.22, 0.075, leafMat, 0.46, 1.11, 0);

  // Joints / bords métalliques
  addBox(door, 0.03, 2.2, 0.082, steel, 0.015, 1.1, 0);
  addBox(door, 0.03, 2.2, 0.082, steel, 0.905, 1.1, 0);

  // Joint caoutchouc intérieur
  addBox(door, 0.9, 2.16, 0.006, rubber, 0.46, 1.1, -0.042);

  // Panneaux décoratifs
  addBox(door, 0.68, 0.78, 0.012, panelMat, 0.46, 1.6, 0.043);
  addBox(door, 0.68, 0.68, 0.012, panelMat, 0.46, 0.72, 0.043);

  // Plaque de renfort basse
  addBox(door, 0.8, 0.22, 0.014, steel, 0.46, 0.24, 0.046);

  // ── Poignée / serrure ──
  const handle = new THREE.Group();
  handle.position.set(0.82, 1.06, 0.055);
  door.add(handle);

  // Plaque de poignée
  addBox(handle, 0.05, 0.14, 0.012, chrome, 0, 0, 0);

  // Levier
  addBox(handle, 0.12, 0.032, 0.035, chrome, -0.045, 0, 0.035);

  // Cylindre de serrure
  addCyl(handle, 0.014, 0.045, chrome, 0.015, -0.05, 0.02, 12, Math.PI / 2, 0, 0);

  // Deadbolt / pêne dormant
  addBox(door, 0.05, 0.07, 0.02, chrome, 0.86, 1.22, 0.046);

  // Œilleton / judas
  addCyl(door, 0.016, 0.09, blackMat, 0.46, 1.55, 0.04, 10, Math.PI / 2, 0, 0);

  // Ferme-porte hydraulique
  addBox(door, 0.28, 0.05, 0.04, darkSteel, 0.42, 2.12, -0.06);

  g.add(door);

  // ── Gâche / strike plate ──
  addBox(g, 0.035, 0.16, 0.03, chrome, 0.485, 1.06, 0.085);

  // ── Capteur d'ouverture ──
  addBox(
    g,
    0.025,
    0.06,
    0.02,
    matLib.getEmissive(0x22c55e, 0x22c55e, 0.4),
    0.48,
    2.18,
    0.09
  );

  // ── Lecteur carte mural ──
  g.add(buildCardReader(0.64, 1.12, 0.11, "granted"));

  g.userData = {
    rp: "door",
    doorType: "security",
    doorLeaf: "security-leaf",
    locked: true,
    open: false,
    hinge: "left",
    openAngle: Math.PI * 0.55,
    closeAngle: 0,
    interactable: true,
    requires: "card",
    faction: null,
  };

  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALLE DE BAIN
// ─────────────────────────────────────────────────────────────────────────────

export function buildBathroomFixtures(): THREE.Group {
  const g = new THREE.Group();
  g.name = "bathroom-fixtures";

  const porcelain = matLib.get(0xf5f2ea, 0.2, 0.05);
  const chrome = matLib.get(0xd8dde2, 0.12, 0.95);
  const darkMetal = matLib.get(0x2f343a, 0.45, 0.6);
  const cabinet = matLib.get(0x4a3320, 0.58, 0.06);
  const paper = matLib.get(0xf8f6f0, 0.88, 0.0);
  const tile = tex.mat("betonMur", 1.6, 1.2, 0.78, 0.05);
  const towelMat = tex.cloth("laine", "laineNrm", 0.9, 0.9, 0.95, 0xd8d2c6, 0.18);

  // ───────────────────────────────
  // TOILETTE
  // ───────────────────────────────
  const toilet = new THREE.Group();
  toilet.name = "toilet";
  toilet.position.set(-0.7, 0, 0);

  // Base
  addBox(toilet, 0.36, 0.1, 0.42, porcelain, 0, 0.05, 0.02);

  // Corps
  addBox(toilet, 0.4, 0.34, 0.52, porcelain, 0, 0.27, 0.02);

  // Bol
  addCyl(toilet, 0.2, 0.08, porcelain, 0, 0.48, 0.06, 16);

  // Siège
  addTorus(toilet, 0.17, 0.024, porcelain, 0, 0.53, 0.06, Math.PI / 2, 0, 0, 10, 22);

  // Réservoir
  addBox(toilet, 0.4, 0.5, 0.18, porcelain, 0, 0.78, -0.22);

  // Couvercle réservoir
  addBox(toilet, 0.36, 0.05, 0.16, porcelain, 0, 1.02, -0.22);

  // Bouton flush
  addBox(toilet, 0.08, 0.02, 0.04, chrome, 0.12, 1.05, -0.2);

  // Tuyau d'alimentation
  addCyl(toilet, 0.02, 0.25, chrome, 0.18, 0.65, -0.25, 10);

  // Support papier
  addBox(toilet, 0.02, 0.02, 0.14, chrome, -0.32, 0.72, 0.22);

  // Rouleau papier
  addCyl(toilet, 0.05, 0.12, paper, -0.32, 0.72, 0.22, 14, Math.PI / 2, 0, 0);

  toilet.userData = {
    rp: "toilet",
    interactable: true,
  };

  g.add(toilet);

  // ───────────────────────────────
  // LAVABO / VANITY
  // ───────────────────────────────
  const sink = new THREE.Group();
  sink.name = "sink";
  sink.position.set(0.55, 0, -0.1);

  // Plinth carrelée
  addBox(sink, 0.68, 0.06, 0.46, tile, 0, 0.03, 0);

  // Cabinet
  addBox(sink, 0.64, 0.78, 0.42, cabinet, 0, 0.48, 0);

  // Comptoir
  addBox(sink, 0.72, 0.05, 0.48, porcelain, 0, 0.92, 0);

  // Bassin
  addCyl(sink, 0.14, 0.08, porcelain, 0, 0.9, 0.02, 18);
  addCyl(sink, 0.12, 0.02, matLib.get(0x101418, 0.8, 0.1), 0, 0.93, 0.02, 18);

  // Robinet principal
  addCyl(sink, 0.022, 0.2, chrome, 0, 1.02, -0.14, 12);

  // Bec
  addCyl(sink, 0.016, 0.14, chrome, 0, 1.12, -0.07, 12, Math.PI / 2, 0, 0);

  // Pointe du bec
  addCyl(sink, 0.012, 0.04, chrome, 0, 1.08, -0.01, 10);

  // Poignées eau chaude / froide
  addCyl(sink, 0.018, 0.07, chrome, -0.06, 0.99, -0.14, 10);
  addCyl(sink, 0.018, 0.07, chrome, 0.06, 0.99, -0.14, 10);

  // Miroir
  addBox(sink, 0.62, 0.78, 0.03, matLib.get(0x22262b, 0.35, 0.65), 0, 1.62, -0.23);
  const mirror = addBox(
    sink,
    0.56,
    0.7,
    0.006,
    matLib.glass(0xcfe6f5, 0.22),
    0,
    1.62,
    -0.21
  );
  mirror.castShadow = false;

  // Barre à serviette
  addCyl(sink, 0.012, 0.44, chrome, 0.36, 1.18, 0.1, 10, 0, 0, Math.PI / 2);

  // Serviette
  addBox(sink, 0.24, 0.36, 0.03, towelMat, 0.36, 1.0, 0.1);

  sink.userData = {
    rp: "sink",
    interactable: true,
  };

  g.add(sink);

  // ───────────────────────────────
  // BAIN
  // ───────────────────────────────
  const tub = new THREE.Group();
  tub.name = "bathtub";
  tub.position.set(0, 0, 1.15);

  // Corps baignoire
  addBox(tub, 1.62, 0.46, 0.78, porcelain, 0, 0.23, 0);

  // Rim / rebord
  addBox(tub, 1.68, 0.07, 0.84, porcelain, 0, 0.5, 0);

  // Eau
  const water = addBox(
    tub,
    1.48,
    0.04,
    0.66,
    matLib.glass(0x6fb8d8, 0.3),
    0,
    0.48,
    0
  );
  water.castShadow = false;

  // Robinet baignoire
  addCyl(tub, 0.02, 0.2, chrome, -0.65, 0.62, 0.22, 10);
  addCyl(tub, 0.015, 0.12, chrome, -0.65, 0.72, 0.14, 10, Math.PI / 2, 0, 0);

  // Colonne douche
  addBox(tub, 0.05, 1.4, 0.05, chrome, -0.75, 1.05, -0.3);

  // Pomme de douche
  addCyl(tub, 0.075, 0.02, chrome, -0.75, 1.72, -0.18, 18);

  // Drain
  addCyl(tub, 0.03, 0.01, darkMetal, 0.55, 0.49, 0.15, 12);

  tub.userData = {
    rp: "bathtub",
    interactable: true,
  };

  g.add(tub);

  g.userData = {
    rp: "bathroom-set",
    interactable: true,
  };

  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// FENÊTRE AVEC RIDEAUX
// ─────────────────────────────────────────────────────────────────────────────

export function buildWindowWithCurtains(width = 1.35, height = 1.55): THREE.Group {
  const g = new THREE.Group();
  g.name = "window-curtains";

  const frame = matLib.get(QC_PALETTE.porte, 0.72);
  const innerFrame = matLib.get(0x3d2b1f, 0.6, 0.05);
  const clothMat = tex.cloth("laine", "laineNrm", 1.4, 1.2, 0.9, 0x6a3a3a, 0.4);
  const rodMat = matLib.get(0xc8a040, 0.28, 0.75);

  // ── Cadre extérieur ──
  addBox(g, width + 0.16, 0.08, 0.1, frame, 0, height + 0.04, 0);
  addBox(g, width + 0.16, 0.08, 0.1, frame, 0, 0.04, 0);
  addBox(g, 0.08, height + 0.08, 0.1, frame, -width / 2 - 0.04, height / 2, 0);
  addBox(g, 0.08, height + 0.08, 0.1, frame, width / 2 + 0.04, height / 2, 0);

  // ── Rejet / appui de fenêtre ──
  addBox(g, width + 0.24, 0.05, 0.16, frame, 0, 0.02, 0.06);

  // ── Cadre intérieur ──
  addBox(g, width + 0.04, 0.05, 0.08, innerFrame, 0, height - 0.01, 0.02);
  addBox(g, width + 0.04, 0.05, 0.08, innerFrame, 0, 0.07, 0.02);
  addBox(g, 0.05, height - 0.08, 0.08, innerFrame, -width / 2 + 0.02, height / 2, 0.02);
  addBox(g, 0.05, height - 0.08, 0.08, innerFrame, width / 2 - 0.02, height / 2, 0.02);

  // ── Mullions / croisée ──
  addBox(g, 0.03, height - 0.12, 0.03, innerFrame, 0, height / 2, 0.02);
  addBox(g, width - 0.08, 0.03, 0.03, innerFrame, 0, height * 0.52, 0.02);

  // ── Vitre ──
  const glass = new THREE.Mesh(
    boxGeo(width - 0.06, height - 0.08, 0.016),
    matLib.glass(0xb8d4e8, 0.32)
  );
  glass.position.set(0, height / 2, 0);
  glass.receiveShadow = true;
  glass.castShadow = false;
  g.add(glass);

  // ── Tringle à rideaux ──
  addCyl(g, 0.018, width + 0.24, rodMat, 0, height + 0.12, 0.12, 12, 0, 0, Math.PI / 2);

  // Embouts de tringle
  addCyl(
    g,
    0.03,
    0.03,
    rodMat,
    -(width + 0.24) / 2,
    height + 0.12,
    0.12,
    10,
    0,
    0,
    Math.PI / 2
  );
  addCyl(
    g,
    0.03,
    0.03,
    rodMat,
    (width + 0.24) / 2,
    height + 0.12,
    0.12,
    10,
    0,
    0,
    Math.PI / 2
  );

  // ── Rideaux avec plis ──
  for (const side of [-1, 1] as const) {
    const curtain = new THREE.Group();
    curtain.name = side === -1 ? "curtain-left" : "curtain-right";
    curtain.position.set(side * width * 0.26, 0, 0.12);

    curtain.userData = {
      rp: "curtain",
      side,
    };

    const panelW = width * 0.16;
    const panelH = height * 0.92;

    // 3 plis par panneau pour donner du volume
    for (let i = 0; i < 3; i++) {
      const fold = addBox(
        curtain,
        panelW,
        panelH,
        0.032,
        clothMat,
        side * i * panelW * 0.36,
        height * 0.48,
        i * 0.014
      );

      fold.rotation.y = side * (0.16 - i * 0.04);
    }

    // Attache / embrasse
    addCyl(
      curtain,
      0.012,
      0.14,
      rodMat,
      side * width * 0.05,
      height * 0.34,
      0.05,
      8,
      0,
      0,
      side * 0.4
    );

    g.add(curtain);
  }

  g.userData = {
    rp: "window",
    interactable: true,
    open: false,
    curtains: "closed",
  };

  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS ALIAS COMPATIBLES
// ─────────────────────────────────────────────────────────────────────────────

export {
  buildSecurityDoor as SecurityDoor,
  buildBathroomFixtures as BathroomFixtures,
  buildWindowWithCurtains as WindowWithCurtains,
};