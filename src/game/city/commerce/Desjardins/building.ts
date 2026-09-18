/**
 * 🏦 BUILDING — Caisse Desjardins 3D (extérieur + intérieur)
 * Architecture basée sur les Caisses Desjardins modernes :
 *   • Brique beige + grandes vitrines
 *   • Bandeau vert Desjardins
 *   • Enseigne lumineuse (logo hexagone)
 *   • GAB extérieurs 24/7
 *   • Hall d'accueil, guichets, bureaux conseillers, voûte
 */
import * as THREE from "three";
import { P, DESJARDINS_BRANCHES, getBranchDef, caisseNameFor, BANKING_CONSTANTS } from "./config";
import { desjardinsSignTexture, branchPlaqueTexture } from "./signage";
import { matLib } from "../../materials";
import { getGeo } from "../../geo";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface BuiltBranch {
  root: THREE.Group;
  branchId: string;
  name: string;
  entrance: { x: number; z: number };
  vaultPosition: { x: number; z: number };
  tellerPositions: Array<{ id: string; x: number; y: number; z: number }>;
  advisorOffices: Array<{ id: string; x: number; z: number }>;
  atmPositions: Array<{ id: string; x: number; y: number; z: number; isIndoor: boolean }>;
  footprint: { width: number; depth: number; height: number };
}

// ═══════════════════════════════════════════════════════════
// UTILITAIRES INTERNES
// ═══════════════════════════════════════════════════════════

function box(
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function boxColor(
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: number, metal = 0, rough = 0.82,
): THREE.Mesh {
  return box(w, h, d, x, y, z, matLib.get(color, rough, metal));
}

// ═══════════════════════════════════════════════════════════
// BUILD EXTERIOR
// ═══════════════════════════════════════════════════════════

export function buildDesjardinsExterior(branchId: string): BuiltBranch {
  const def = getBranchDef(branchId);
  if (!def) throw new Error(`[Desjardins] Branche inconnue: ${branchId}`);

  const g = new THREE.Group();
  g.name = `caisse_desjardins_${branchId}`;

  const { w, d, h } = def.size;
  const label = caisseNameFor(def.village);

  // ─── Fondation ───
  g.add(boxColor(w + 0.5, 0.42, d + 0.5, 0, 0.21, 0, P.betonClair, 0, 0.95));

  // ─── Corps principal (brique beige) ───
  g.add(boxColor(w, h, d, 0, 0.42 + h / 2, 0, P.briqueBeige, 0, 0.88));

  // ─── Bandeau vert Desjardins (bas) ───
  g.add(boxColor(w + 0.35, 0.55, d + 0.35, 0, 0.42 + 0.28, 0, P.vertDesjardins, 0.05, 0.6));

  // ─── Bandeau vert haut (au-dessus des fenêtres) ───
  const bandTop = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.35, 1.05, d + 0.35),
    matLib.get(P.vertDesjardins, 0.55, 0.05),
  );
  bandTop.position.y = 0.42 + h - 0.35;
  g.add(bandTop);

  // ─── Toit ───
  g.add(boxColor(w + 0.7, 0.28, d + 0.7, 0, 0.42 + h + 0.22, 0, P.toitureNoire, 0.12, 0.7));

  // ─── Enseigne lumineuse principale ───
  const signTex = desjardinsSignTexture(label);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: P.vertDesjardins,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.05), signMat);
  sign.position.set(0, 0.42 + h - 0.32, d / 2 + 0.21);
  sign.name = "main_sign";
  sign.userData = { isSign: true, branchId };
  g.add(sign);

  // ─── Fenêtres (4 grandes vitrines) ───
  const windowXs = [-5.2, -1.7, 1.7, 5.2];
  for (const x of windowXs) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.35),
      matLib.glass(P.vitreBleutee, 0.38),
    );
    pane.position.set(x, 2.15, d / 2 + 0.06);
    g.add(pane);

    // Cadre alu
    g.add(boxColor(2.55, 0.08, 0.08, x, 3.35, d / 2 + 0.07, P.cadreAlu, 0.55, 0.35));
    g.add(boxColor(2.55, 0.08, 0.08, x, 1.05, d / 2 + 0.07, P.cadreAlu, 0.55, 0.35));
    g.add(boxColor(0.08, 2.4, 0.08, x - 1.25, 2.15, d / 2 + 0.07, P.cadreAlu, 0.55, 0.35));
    g.add(boxColor(0.08, 2.4, 0.08, x + 1.25, 2.15, d / 2 + 0.07, P.cadreAlu, 0.55, 0.35));
  }

  // ─── Canopée d'entrée ───
  const canopy = boxColor(7.4, 0.12, 2.6, 0, 3.35, d / 2 + 1.2, P.vertFonce, 0.05, 0.5);
  g.add(canopy);

  // Poteaux
  for (const x of [-3.2, 3.2]) {
    g.add(boxColor(0.14, 3.2, 0.14, x, 1.7, d / 2 + 2.2, P.cadreAlu, 0.6, 0.35));
  }

  // ─── Éclairage canopée ───
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 0.28),
    matLib.getEmissive(0xf0f6ff, 0xf0f6ff, 0.8),
  );
  lamp.position.set(0, 3.22, d / 2 + 1.4);
  lamp.userData = { isLit: true };
  g.add(lamp);

  // ─── Plaque signalétique ───
  const plaqueTex = branchPlaqueTexture(label);
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.5 });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), plaqueMat);
  plaque.position.set(-w / 2 + 1.4, 1.7, d / 2 + 0.09);
  g.add(plaque);

  // ─── Portes vitrées ───
  const opening = 2.7;
  const swings: THREE.Object3D[] = [];

  // Gauche
  const leftDoor = new THREE.Mesh(
    new THREE.BoxGeometry(opening / 2 - 0.05, 2.45, 0.06),
    matLib.glass(0x9ec8e0, 0.28),
  );
  leftDoor.position.set(-(opening / 2), 0.42 + 1.22, d / 2 + 0.03);
  leftDoor.name = "entrance_left";
  leftDoor.userData = { doorId: "left", interactive: true };
  g.add(leftDoor);
  swings.push(leftDoor);

  // Droite
  const rightDoor = new THREE.Mesh(
    new THREE.BoxGeometry(opening / 2 - 0.05, 2.45, 0.06),
    matLib.glass(0x9ec8e0, 0.28),
  );
  rightDoor.position.set(opening / 2, 0.42 + 1.22, d / 2 + 0.03);
  rightDoor.name = "entrance_right";
  rightDoor.userData = { doorId: "right", interactive: true };
  g.add(rightDoor);
  swings.push(rightDoor);

  g.userData.swings = swings;
  g.userData.entranceLocal = new THREE.Vector3(0, 0, d / 2 + 2.4);

  // ─── GAB extérieurs ───
  const atmPositions: BuiltBranch["atmPositions"] = [];
  const atmCount = def.hasAtms;
  for (let i = 0; i < atmCount; i++) {
    const ax = atmCount === 2 ? (-2.2 + i * 4.4) : 0;
    const az = d / 2 + 0.55;
    const atmId = `atm_${branchId}_ext${i}`;
    g.add(buildAtmCabinet(ax, 0.42, az, false, atmId));
    atmPositions.push({ id: atmId, x: ax, y: 0.42, z: az + 1.05, isIndoor: false });
  }

  // ─── Caméras extérieures ───
  g.add(buildCameraDome(-w / 2 + 1.1, h + 0.1, d / 2 - 0.4, 0.7, `${branchId}_ext1`));
  g.add(buildCameraDome(w / 2 - 1.1, h + 0.1, d / 2 - 0.4, -0.7, `${branchId}_ext2`));

  // ─── Position monde ───
  g.position.set(def.worldX, 0, def.worldZ);
  g.rotation.y = def.yaw;

  // ─── Métadonnées ───
  g.userData.buildingType = "caisse_desjardins";
  g.userData.branchId = branchId;
  g.userData.label = label;
  g.userData.footprint = { width: w, depth: d };
  g.userData.village = def.village;

  return {
    root: g,
    branchId,
    name: label,
    entrance: { x: def.worldX, z: def.worldZ + d / 2 + 2.4 },
    vaultPosition: { x: def.worldX, z: def.worldZ - d / 2 + 1.6 },
    tellerPositions: [],
    advisorOffices: [],
    atmPositions,
    footprint: { width: w, depth: d, height: h },
  };
}

// ═══════════════════════════════════════════════════════════
// BUILD INTERIOR
// ═══════════════════════════════════════════════════════════

export interface BuiltInterior {
  group: THREE.Group;
  walls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  spawn: THREE.Vector3;
  exit: THREE.Vector3;
  tellerPositions: Array<{ id: string; x: number; y: number; z: number }>;
  advisorOffices: Array<{ id: string; x: number; z: number }>;
  vaultId: string;
  vaultSpot: { x: number; z: number };
  ticketMachine: { x: number; y: number; z: number };
}

export function buildDesjardinsInterior(branchId: string): BuiltInterior {
  const def = getBranchDef(branchId);
  if (!def) throw new Error(`[Desjardins] Branche inconnue: ${branchId}`);

  const g = new THREE.Group();
  g.name = `interieur_${branchId}`;

  const W = def.size.w - 2.2;
  const D = def.size.d - 1.2;
  const H = 3.35;
  const walls: BuiltInterior["walls"] = [];

  // ─── Sol marbre ───
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    matLib.get(P.marbre, 0.35, 0.08),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // ─── Plafond ───
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    matLib.get(0xe8e6e0, 0.95),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  // ─── Murs ───
  const wallMat = matLib.get(P.murInterieur, 0.9);
  g.add(box(W, H, 0.22, 0, H / 2, -D / 2, wallMat));
  g.add(box(0.22, H, D, -W / 2, H / 2, 0, wallMat));
  g.add(box(0.22, H, D, W / 2, H / 2, 0, wallMat));

  // Mur avant percé (entrée)
  const doorGap = 1.35;
  const frontSegW = (W - doorGap * 2) / 2;
  const frontSegX = doorGap + frontSegW / 2;
  g.add(box(frontSegW, H, 0.22, -frontSegX, H / 2, D / 2, wallMat));
  g.add(box(frontSegW, H, 0.22, frontSegX, H / 2, D / 2, wallMat));

  walls.push(
    { minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.14, maxZ: -D / 2 + 0.14 },
    { minX: -W / 2 - 0.14, maxX: -W / 2 + 0.14, minZ: -D / 2, maxZ: D / 2 },
    { minX: W / 2 - 0.14, maxX: W / 2 + 0.14, minZ: -D / 2, maxZ: D / 2 },
    { minX: -W / 2, maxX: -doorGap, minZ: D / 2 - 0.2, maxZ: D / 2 + 0.2 },
    { minX: doorGap, maxX: W / 2, minZ: D / 2 - 0.2, maxZ: D / 2 + 0.2 },
  );

  // ─── Bandeau vert intérieur ───
  g.add(box(W - 0.4, 0.22, 0.04, 0, 2.55, D / 2 - 0.14, matLib.get(P.vertDesjardins, 0.5)));

  // ─── Éclairage ───
  for (const x of [-W / 3, 0, W / 3]) {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.07, 0.22),
      matLib.getEmissive(0xf6faff, 0xf6faff, 1.1),
    );
    tube.position.set(x, H - 0.18, -1.2);
    tube.userData.isLit = true;
    g.add(tube);
  }

  // ═══ GUICHETS (TELLERS) ═══
  const tellerPositions: BuiltInterior["tellerPositions"] = [];
  const tellerCount = def.hasTellers;
  const counterW = tellerCount * 2.8;
  const counterZ = -D / 2 + 2.7;

  g.add(box(counterW, 1.12, 0.82, 0, 0.62, counterZ, matLib.get(P.comptoirBois, 0.6)));
  g.add(box(counterW + 0.16, 0.06, 0.92, 0, 1.2, counterZ, matLib.get(P.comptoirDessus, 0.4, 0.15)));

  // Vitre protection
  const shield = new THREE.Mesh(
    new THREE.PlaneGeometry(counterW, 1.25),
    matLib.glass(0xc8dce8, 0.22),
  );
  shield.position.set(0, 1.88, counterZ);
  g.add(shield);

  for (let i = 0; i < tellerCount; i++) {
    const sx = -counterW / 2 + (i + 0.5) * (counterW / tellerCount);
    const tellerId = `teller_${branchId}_${i}`;

    // Ordinateur
    g.add(boxColor(0.38, 0.1, 0.42, sx, 1.26, counterZ - 0.25, 0x8a8e92, 0.45, 0.4));

    // Écran
    const mon = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.28, 0.04),
      matLib.getEmissive(0x1a3a4a, 0x2a7a9a, 0.55),
    );
    mon.position.set(sx, 1.52, counterZ + 0.25);
    mon.name = `${tellerId}_monitor`;
    mon.userData = { tellerId, interactive: true, type: "teller_monitor", branchId };
    g.add(mon);

    // Numéro
    g.add(boxColor(0.2, 0.14, 0.03, sx, 2.38, counterZ, P.vertDesjardins));

    // Bouton panique
    g.add(buildPanicButton(sx + 0.15, 0.9, counterZ - 0.4, `panic_${tellerId}`));

    tellerPositions.push({ id: tellerId, x: sx, y: 1.2, z: counterZ });
  }

  // ═══ BUREAUX CONSEILLERS ═══
  const advisorOffices: BuiltInterior["advisorOffices"] = [];
  const advisorCount = def.hasAdvisors;
  for (let i = 0; i < advisorCount; i++) {
    const ox = -W / 2 + 3.6 + i * 4.4;
    const oz = D / 2 - 3.4;
    const officeId = `office_${branchId}_${i}`;

    // Cloison vitrée
    const part = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 2.4),
      matLib.glass(0xd8e4ec, 0.22),
    );
    part.position.set(ox, 1.25, oz - 1.4);
    g.add(part);

    // Bureau
    const desk = boxColor(1.55, 0.72, 0.78, ox, 0.38, oz, P.comptoirBois, 0.05, 0.6);
    desk.name = `${officeId}_desk`;
    desk.userData = { officeId, interactive: true, type: "advisor_desk", branchId };
    g.add(desk);

    // Ordi + chaise
    g.add(boxColor(0.42, 0.08, 0.42, ox, 0.46, oz - 0.7, 0x3a4a52));
    g.add(boxColor(0.42, 0.5, 0.06, ox, 0.74, oz - 0.88, 0x3a4a52));

    advisorOffices.push({ id: officeId, x: ox, z: oz });
  }

  // ═══ VOÛTE ═══
  const vaultId = `vault_${branchId}`;
  const vaultX = W / 2 - 1.4;
  const vaultZ = -D / 2 + 1.5;

  const vault = new THREE.Group();
  vault.name = "voute";

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.12, 10, 24),
    matLib.get(P.acier, 0.32, 0.78),
  );
  ring.position.set(0, 1.15, 0);
  vault.add(ring);

  const door = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 0.88, 0.16, 24),
    matLib.get(P.acier, 0.28, 0.82),
  );
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 1.15, 0.02);
  door.name = "vault_door";
  door.userData = { vaultId, interactive: true, type: "vault_door", branchId };
  vault.add(door);

  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.035, 8, 16),
    matLib.get(P.laiton, 0.3, 0.85),
  );
  wheel.position.set(0, 1.15, 0.14);
  vault.add(wheel);

  vault.position.set(vaultX, 0, vaultZ);
  g.add(vault);

  // ═══ GAB INTÉRIEURS ═══
  const atmIndoor1 = `atm_${branchId}_int1`;
  const atmIndoor2 = `atm_${branchId}_int2`;
  g.add(buildAtmCabinet(-W / 2 + 1.7, 0, -D / 2 + 0.7, true, atmIndoor1));
  g.add(buildAtmCabinet(-W / 2 + 3.2, 0, -D / 2 + 0.7, true, atmIndoor2));

  // ═══ CAMÉRAS INTÉRIEURES ═══
  g.add(buildCameraDome(-W / 2 + 0.6, H - 0.25, -D / 2 + 0.6, -0.6, `${branchId}_int1`));
  g.add(buildCameraDome(W / 2 - 0.6, H - 0.25, D / 2 - 0.6, Math.PI, `${branchId}_int2`));
  g.add(buildCameraDome(0, H - 0.25, -D / 2 + 0.6, 0, `${branchId}_tellers`));
  g.add(buildCameraDome(vaultX, H - 0.25, vaultZ + 1, Math.PI / 2, `${branchId}_vault`));

  // ═══ TAPIS D'ENTRÉE ═══
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.5),
    matLib.get(P.tapisVert, 0.98),
  );
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.03, D / 2 - 1.5);
  g.add(mat);

  // ═══ DISTRIBUTEUR DE TICKETS ═══
  const ticketMachine = boxColor(0.5, 1.2, 0.2, W / 2 - 1, 0.6, D / 2 - 1, 0x1a3a4a, 0.3, 0.6);
  ticketMachine.name = "ticket_dispenser";
  ticketMachine.userData = { interactive: true, type: "ticket_dispenser", branchId };
  g.add(ticketMachine);

  // ═══ ÉCRAN FILE D'ATTENTE ═══
  const displayScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.8),
    matLib.getEmissive(0x0a0a0a, 0x00ff00, 0.6),
  );
  displayScreen.position.set(0, 2.8, -D / 2 + 0.15);
  displayScreen.name = "queue_display";
  displayScreen.userData = { branchId, type: "queue_display" };
  g.add(displayScreen);

  // ═══ FILE D'ATTENTE (poteaux) ═══
  for (let i = 0; i < 5; i++) {
    const px = -2.4 + (i % 3) * 2.4;
    const pz = -D / 2 + 5.1 + Math.floor(i / 3) * 1.8;
    g.add(boxColor(0.08, 0.95, 0.08, px, 0.52, pz, 0x9a9ea2, 0.55, 0.35));
  }

  // ─── Métadonnées ───
  g.userData = {
    type: "desjardins_interior",
    branchId,
  };

  return {
    group: g,
    walls,
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.2),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    tellerPositions,
    advisorOffices,
    vaultId,
    vaultSpot: { x: vaultX, z: vaultZ },
    ticketMachine: { x: W / 2 - 1, y: 0.6, z: D / 2 - 1 },
  };
}

// ═══════════════════════════════════════════════════════════
// HELPERS DÉCOR
// ═══════════════════════════════════════════════════════════

export function buildAtmCabinet(
  x = 0, y = 0, z = 0, wall = false, atmId?: string,
): THREE.Group {
  const g = new THREE.Group();
  g.name = atmId || "atm";
  const h = wall ? 1.4 : 1.62;

  g.add(boxColor(0.72, h, 0.52, 0, y + h / 2, 0, P.atmCorps, 0.45, 0.42));
  g.add(boxColor(0.64, 0.72, 0.08, 0, y + h - 0.42, 0.24, P.atmFacade, 0.5, 0.38));

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.32, 0.03),
    matLib.getEmissive(0x1a4a6a, 0x2a9d63, 0.55),
  );
  screen.position.set(0, y + h - 0.48, 0.29);
  screen.name = atmId ? `${atmId}_screen` : "atm_screen";
  g.add(screen);

  g.add(boxColor(0.38, 0.035, 0.05, 0, y + h - 0.78, 0.28, 0x111111, 0.4, 0.4));
  g.add(boxColor(0.26, 0.16, 0.04, 0, y + 0.52, 0.28, 0x1a1c20));
  g.add(boxColor(0.34, 0.08, 0.08, 0, y + 0.28, 0.28, P.vertDesjardins));

  g.position.set(x, 0, z);
  if (atmId) g.userData = { atmId, interactive: true, type: "atm" };
  return g;
}

export function buildCameraDome(
  x: number, y: number, z: number, yaw: number, camId: string,
): THREE.Group {
  const g = new THREE.Group();
  g.name = `security_cam_${camId}`;

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    matLib.get(0x2a2e32, 0.4, 0.55),
  );
  g.add(body);

  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 6, 6),
    matLib.getEmissive(0xff2a2a, 0xff2a2a, 1.1),
  );
  led.position.set(0.07, 0, 0);
  led.userData.isRecLed = true;
  g.add(led);

  g.position.set(x, y, z);
  g.rotation.y = yaw;
  g.userData = { camId, isCamera: true };
  return g;
}

export function buildPanicButton(
  x: number, y: number, z: number, id: string,
): THREE.Mesh {
  const btn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16),
    matLib.getEmissive(P.alarmeRouge, 0xff0000, 0.5),
  );
  btn.position.set(x, y, z);
  btn.rotation.z = Math.PI / 2;
  btn.name = `panic_button_${id}`;
  btn.userData = { type: "panic_button", id, interactive: true };
  return btn;
}

// ═══════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════

export function animateDesjardins(root: THREE.Object3D, elapsed: number): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.userData.isRecLed && mesh.material) {
      const m = mesh.material as THREE.MeshStandardMaterial;
      if ("emissiveIntensity" in m) {
        m.emissiveIntensity = 1.1 + Math.sin(elapsed * 3) * 0.8;
      }
    }
  });
}

export function setDesjardinsNight(root: THREE.Object3D, night: boolean): void {
  root.traverse((obj) => {
    if (!obj.userData.isLit && !obj.userData.isSign) return;
    const mesh = obj as THREE.Mesh;
    const m = mesh.material as THREE.MeshStandardMaterial;
    if (m && "emissiveIntensity" in m) {
      m.emissiveIntensity = night ? 1.6 : 0.45;
    }
  });
}