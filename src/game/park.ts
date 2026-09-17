/**
 * Parc municipal + cimetière paroissial du Comté de Portneuf.
 * Rendu détaillé avec architecture québécoise authentique — Kiosque, Fontaine, Monuments.
 * Fichier: src/game/park.ts
 */
import * as THREE from "three";
import { getGeo, InstancePool, type TransformData } from "./geometries";
import { matLib, QC_PALETTE } from "./materials";
import { makeRng } from "./rng";

type Pose = {
  x: number;
  y: number;
  z: number;
  yaw?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: number;
};

/**
 * Génère un InstancedMesh optimisé via l'InstancePool
 */
function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, poses: Pose[], cast = true): THREE.InstancedMesh {
  if (poses.length === 0) {
    // Retourne un mesh vide pour éviter les erreurs
    return new THREE.InstancedMesh(geo, mat, 1);
  }

  const pool = new InstancePool(geo, mat, poses.length);

  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const transform: TransformData = {
      x: p.x,
      y: p.y,
      z: p.z,
      rot: p.yaw ?? 0,
      sx: p.sx ?? 1,
      sy: p.sy ?? 1,
      sz: p.sz ?? 1,
      color: p.color,
    };
    pool.set(`p_${i}`, transform, { visible: false } as any);
  }

  pool.flush();
  pool.mesh.castShadow = cast;
  pool.mesh.receiveShadow = true;
  pool.updateBoundingVolumes();

  return pool.mesh;
}

/** Sol tapis vert (gazon municipal) */
function lawn(width: number, depth: number, hex: number, y = 0.02): THREE.Mesh {
  const mesh = new THREE.Mesh(getGeo("plane", { w: width, h: depth }), matLib.get(hex, 1, 0));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

/** Bande de gravier / allée pavée */
function pathStrip(w: number, d: number, x: number, z: number, hex = 0x9a9086, y = 0.04): THREE.Mesh {
  const mesh = new THREE.Mesh(getGeo("plane", { w, h: d }), matLib.get(hex, 0.96, 0));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

/* =========================================================================
   CONSTRUCTION DU PARC MUNICIPAL — Kiosque, Fontaine, Bancs, Lampadaires
   ========================================================================= */

/**
 * Construit un kiosque à musique octogonal (style Belvédère 1900).
 */
function buildBandstand(centerX: number, centerZ: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "kiosque-musique";
  g.position.set(centerX, 0, centerZ);

  const woodWhite = matLib.get(QC_PALETTE.boisBlanc ?? 0xf0ead6, 0.9, 0);
  const woodBrown = matLib.get(0x8b6f47, 0.9, 0);
  const roofGreen = matLib.get(QC_PALETTE.toleVerte ?? 0x2d5a3d, 0.5, 0.6);
  const gold = matLib.get(0xd4af37, 0.35, 0.85);

  // Fondation en pierre
  const foundation = new THREE.Mesh(
    getGeo("cylinder", { r: 3.4, h: 0.35, seg: 8, pivot: "bottom" }),
    matLib.get(QC_PALETTE.pierreGrise ?? 0x8a8a8a, 0.95, 0)
  );
  foundation.receiveShadow = true;
  g.add(foundation);

  // Plancher hexagonal en planches
  const floor = new THREE.Mesh(
    getGeo("cylinder", { r: 3.15, h: 0.18, seg: 8, pivot: "bottom" }),
    woodWhite
  );
  floor.position.y = 0.35;
  floor.receiveShadow = true;
  floor.castShadow = true;
  g.add(floor);

  // Marches d'accès
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(
      getGeo("box", { w: 1.8 - i * 0.15, h: 0.12, d: 0.35, pivot: "bottom" }),
      woodWhite
    );
    step.position.set(0, i * 0.12, 3.3 + (2 - i) * 0.35);
    step.castShadow = true;
    step.receiveShadow = true;
    g.add(step);
  }

  // Colonnes cannelées (8 poteaux)
  const colBases: Pose[] = [];
  const colShafts: Pose[] = [];
  const colCaps: Pose[] = [];
  const balustrade: Pose[] = [];

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 2.75;
    const z = Math.sin(a) * 2.75;

    colBases.push({ x, y: 0.53, z });
    colShafts.push({ x, y: 0.65, z });
    colCaps.push({ x, y: 3.45, z });

    // Balustrade décorative entre colonnes
    if (i < 7) {
      // Skip un côté pour l'accès
      const a2 = ((i + 1) / 8) * Math.PI * 2;
      const midX = (Math.cos(a) + Math.cos(a2)) / 2 * 2.75;
      const midZ = (Math.sin(a) + Math.sin(a2)) / 2 * 2.75;
      const midYaw = a + Math.PI / 8;
      balustrade.push({ x: midX, y: 0.9, z: midZ, yaw: midYaw });
    }
  }

  // Base des colonnes
  g.add(instanced(getGeo("cylinder", { r: 0.14, r2: 0.16, h: 0.12, seg: 8, pivot: "bottom" }), woodBrown, colBases));
  // Fût des colonnes
  g.add(instanced(getGeo("cylinder", { r: 0.09, r2: 0.11, h: 2.8, seg: 8, pivot: "bottom" }), woodWhite, colShafts));
  // Chapiteaux
  g.add(instanced(getGeo("cylinder", { r: 0.14, r2: 0.11, h: 0.14, seg: 8, pivot: "bottom" }), woodBrown, colCaps));
  // Balustrade
  if (balustrade.length) {
    g.add(instanced(getGeo("box", { w: 1.6, h: 0.55, d: 0.08, pivot: "bottom" }), woodWhite, balustrade));
  }

  // Toit conique octogonal
  const roof = new THREE.Mesh(
    getGeo("cone", { r: 3.85, h: 1.9, seg: 8, pivot: "bottom" }),
    roofGreen
  );
  roof.position.y = 3.6;
  roof.castShadow = true;
  g.add(roof);

  // Lanternon central
  const lantern = new THREE.Mesh(
    getGeo("cylinder", { r: 0.35, h: 0.8, seg: 8, pivot: "bottom" }),
    woodWhite
  );
  lantern.position.y = 5.5;
  lantern.castShadow = true;
  g.add(lantern);

  // Petit dôme du lanternon
  const dome = new THREE.Mesh(
    getGeo("hemisphere", { r: 0.4, seg: 12 }),
    roofGreen
  );
  dome.position.y = 6.3;
  dome.castShadow = true;
  g.add(dome);

  // Girouette dorée
  const spire = new THREE.Mesh(
    getGeo("cylinder", { r: 0.04, h: 0.6, seg: 6, pivot: "bottom" }),
    gold
  );
  spire.position.y = 6.7;
  g.add(spire);

  const rooster = new THREE.Mesh(
    getGeo("box", { w: 0.35, h: 0.22, d: 0.06, pivot: "center" }),
    gold
  );
  rooster.position.y = 7.15;
  g.add(rooster);

  return g;
}

/**
 * Construit une fontaine sculpturale à trois paliers.
 */
function buildFountain(centerX: number, centerZ: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "fontaine";
  g.position.set(centerX, 0, centerZ);

  const stoneMat = matLib.get(QC_PALETTE.pierreGrise ?? 0x8a8a8a, 0.9, 0);
  const stoneDark = matLib.get(0x6a6864, 0.94, 0);
  const waterMat = (matLib.water ?? matLib.get)(0x2a6a7a, 0.55);

  // Bassin extérieur (grande vasque)
  const outerBasin = new THREE.Mesh(
    getGeo("cylinder", { r: 2.2, r2: 2.4, h: 0.5, seg: 24, pivot: "bottom" }),
    stoneMat
  );
  outerBasin.castShadow = true;
  outerBasin.receiveShadow = true;
  g.add(outerBasin);

  // Rebord décoratif
  const rim = new THREE.Mesh(
    getGeo("torus", { r: 2.3, tube: 0.08, seg: 24 }),
    stoneDark
  );
  rim.position.y = 0.5;
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  g.add(rim);

  // Eau du bassin extérieur
  const outerWater = new THREE.Mesh(
    getGeo("cylinder", { r: 2.15, h: 0.05, seg: 20, pivot: "bottom" }),
    waterMat
  );
  outerWater.position.y = 0.45;
  g.add(outerWater);

  // Pilier central
  const pillar = new THREE.Mesh(
    getGeo("cylinder", { r: 0.4, h: 0.9, seg: 12, pivot: "bottom" }),
    stoneMat
  );
  pillar.position.y = 0.5;
  pillar.castShadow = true;
  g.add(pillar);

  // Vasque intermédiaire
  const midBasin = new THREE.Mesh(
    getGeo("cylinder", { r: 0.9, r2: 1.1, h: 0.35, seg: 16, pivot: "bottom" }),
    stoneMat
  );
  midBasin.position.y = 1.4;
  midBasin.castShadow = true;
  g.add(midBasin);

  // Eau vasque intermédiaire
  const midWater = new THREE.Mesh(
    getGeo("cylinder", { r: 0.95, h: 0.04, seg: 16, pivot: "bottom" }),
    waterMat
  );
  midWater.position.y = 1.7;
  g.add(midWater);

  // Colonne centrale supérieure
  const upperPillar = new THREE.Mesh(
    getGeo("cylinder", { r: 0.2, h: 0.7, seg: 8, pivot: "bottom" }),
    stoneMat
  );
  upperPillar.position.y = 1.75;
  g.add(upperPillar);

  // Petite vasque supérieure
  const topBasin = new THREE.Mesh(
    getGeo("cylinder", { r: 0.35, r2: 0.5, h: 0.2, seg: 12, pivot: "bottom" }),
    stoneMat
  );
  topBasin.position.y = 2.45;
  g.add(topBasin);

  // Jet d'eau vertical (colonne d'eau)
  const jet = new THREE.Mesh(
    getGeo("cylinder", { r: 0.06, r2: 0.02, h: 0.9, seg: 8, pivot: "bottom" }),
    waterMat
  );
  jet.position.y = 2.65;
  g.add(jet);

  return g;
}

/**
 * Construit un banc de parc "Frontenac" avec accoudoirs.
 */
function makeBenchInstances(benches: Pose[]): THREE.Group[] {
  const g: THREE.Group[] = [];
  const woodMat = matLib.get(0x6a4a28, 0.92, 0);
  const ironMat = matLib.get(0x2a2a2c, 0.65, 0.4);

  // Assise
  const seatsPoses = benches.map((p) => ({ ...p, y: 0.45 }));
  const seatsGroup = new THREE.Group();
  seatsGroup.add(instanced(getGeo("box", { w: 1.7, h: 0.08, d: 0.42, pivot: "bottom" }), woodMat, seatsPoses));
  g.push(seatsGroup);

  // Dossier arqué
  const backPoses = benches.map((p) => ({
    ...p,
    y: 0.53,
    z: p.z + Math.cos(p.yaw ?? 0) * -0.18,
  }));
  const backGroup = new THREE.Group();
  backGroup.add(instanced(getGeo("box", { w: 1.7, h: 0.5, d: 0.06, pivot: "bottom" }), woodMat, backPoses));
  g.push(backGroup);

  // Accoudoirs (2 par banc)
  const armPoses: Pose[] = [];
  for (const b of benches) {
    const cy = Math.cos(b.yaw ?? 0);
    const sy = Math.sin(b.yaw ?? 0);
    armPoses.push({
      x: b.x + sy * 0.8,
      y: 0.45,
      z: b.z + cy * 0.8,
      yaw: b.yaw,
    });
    armPoses.push({
      x: b.x - sy * 0.8,
      y: 0.45,
      z: b.z - cy * 0.8,
      yaw: b.yaw,
    });
  }
  const armGroup = new THREE.Group();
  armGroup.add(instanced(getGeo("box", { w: 0.08, h: 0.35, d: 0.4, pivot: "bottom" }), woodMat, armPoses));
  g.push(armGroup);

  // Pieds en fonte
  const feetPoses: Pose[] = [];
  for (const b of benches) {
    const cy = Math.cos(b.yaw ?? 0);
    const sy = Math.sin(b.yaw ?? 0);
    for (const off of [-0.7, 0.7]) {
      feetPoses.push({
        x: b.x + sy * off,
        y: 0,
        z: b.z + cy * off,
        yaw: b.yaw,
      });
    }
  }
  const feetGroup = new THREE.Group();
  feetGroup.add(instanced(getGeo("cylinder", { r: 0.05, r2: 0.07, h: 0.45, seg: 6, pivot: "bottom" }), ironMat, feetPoses));
  g.push(feetGroup);

  return g;
}

/**
 * Construit un lampadaire victorien complet.
 */
function makeVictorianLamps(positions: Array<[number, number]>): THREE.Group[] {
  const groups: THREE.Group[] = [];
  const ironMat = matLib.get(0x1a1a1c, 0.35, 0.6);
  const bulbMat = matLib.getEmissive?.(0xffe4a0, 0xffc870, 0.15) ?? matLib.get(0xffe4a0, 0.4, 0.2);

  const bases: Pose[] = [];
  const shafts: Pose[] = [];
  const arms: Pose[] = [];
  const globes: Pose[] = [];
  const finials: Pose[] = [];

  for (const [x, z] of positions) {
    bases.push({ x, y: 0, z });
    shafts.push({ x, y: 0.35, z });
    arms.push({ x, y: 3.9, z });
    globes.push({ x, y: 4.2, z });
    finials.push({ x, y: 4.65, z });
  }

  // Base sculptée
  const baseGroup = new THREE.Group();
  baseGroup.add(instanced(getGeo("cylinder", { r: 0.18, r2: 0.22, h: 0.35, seg: 12, pivot: "bottom" }), ironMat, bases));
  groups.push(baseGroup);

  // Tige cannelée
  const shaftGroup = new THREE.Group();
  shaftGroup.add(instanced(getGeo("cylinder", { r: 0.06, r2: 0.08, h: 3.55, seg: 12, pivot: "bottom" }), ironMat, shafts));
  groups.push(shaftGroup);

  // Croisillons décoratifs (petites cornes)
  const armGroup = new THREE.Group();
  armGroup.add(instanced(getGeo("box", { w: 0.6, h: 0.04, d: 0.04, pivot: "center" }), ironMat, arms));
  groups.push(armGroup);

  // Globe lumineux
  const globeGroup = new THREE.Group();
  const globeMesh = instanced(getGeo("sphere", { r: 0.22, seg: 12, segH: 10 }), bulbMat, globes, false);
  globeMesh.userData.isStreetlight = true;
  globeGroup.add(globeMesh);
  groups.push(globeGroup);

  // Finial (pointe supérieure)
  const finialGroup = new THREE.Group();
  finialGroup.add(instanced(getGeo("cone", { r: 0.08, h: 0.25, seg: 8, pivot: "bottom" }), ironMat, finials));
  groups.push(finialGroup);

  return groups;
}

/** Parc québécois avec kiosque à musique, fontaine et aménagements paysagers. */
export function buildPark(width: number, depth: number, seed = 1867, simple = false): THREE.Group {
  const g = new THREE.Group();
  g.name = "parc";
  const rng = makeRng(seed + 41);
  const w = Math.max(14, width);
  const d = Math.max(14, depth);

  // Tapis d'herbe
  g.add(lawn(w, d, 0x3e6a34));

  const gravel = 0x9a9086;
  const cobblestone = 0x8a8580;

  // Allées principales en croix
  g.add(pathStrip(w * 0.92, 2.4, 0, 0, cobblestone));
  g.add(pathStrip(2.4, d * 0.92, 0, 0, cobblestone));

  if (simple) {
    g.userData.landmark = "parc";
    g.userData.footprint = { width: w, depth: d };
    return g;
  }

  // Placette centrale circulaire
  const plazaOuter = new THREE.Mesh(
    getGeo("cylinder", { r: Math.min(w, d) * 0.22, h: 0.04, seg: 24, pivot: "bottom" }),
    matLib.get(cobblestone, 0.96, 0)
  );
  plazaOuter.position.y = 0.045;
  plazaOuter.receiveShadow = true;
  g.add(plazaOuter);

  // Anneau intérieur décoratif
  const plazaInner = new THREE.Mesh(
    getGeo("ring", { r: Math.min(w, d) * 0.18, r2: Math.min(w, d) * 0.14, seg: 24 }),
    matLib.get(0x6a6560, 0.92, 0)
  );
  plazaInner.rotation.x = -Math.PI / 2;
  plazaInner.position.y = 0.055;
  g.add(plazaInner);

  // KIOSQUE À MUSIQUE au centre
  g.add(buildBandstand(0, 0));

  // FONTAINE d'ornement (si assez grand)
  if (w > 24 && d > 24) {
    const angleFountain = Math.PI * 1.5;
    const rFountain = Math.min(w, d) * 0.32;
    g.add(buildFountain(Math.cos(angleFountain) * rFountain, Math.sin(angleFountain) * rFountain));
  }

  // ARBRES : Érables et feuillages saisonniers
  const hw = w * 0.42;
  const hd = d * 0.42;
  const trunkPos: Pose[] = [];
  const canopyPos: Pose[] = [];
  const canopyTopPos: Pose[] = [];
  const autumnPos: Pose[] = [];
  const nTrees = Math.min(24, 8 + Math.floor((w * d) / 60));

  for (let i = 0; i < nTrees; i++) {
    const a = rng() * Math.PI * 2;
    const r = 6.5 + rng() * Math.min(hw, hd) * 0.65;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // Évite le kiosque central et les allées
    if (Math.abs(x) < 3.5 && Math.abs(z) < 3.5) continue;
    if (Math.abs(x) < 1.5 || Math.abs(z) < 1.5) continue;

    const s = 0.75 + rng() * 0.55;
    const isAutumn = rng() > 0.55;

    trunkPos.push({ x, y: 0, z, sx: s, sy: s, sz: s, yaw: rng() * Math.PI * 2 });
    canopyPos.push({ x, y: 3.8 * s, z, sx: s * 1.1, sy: s * 0.85, sz: s * 1.1 });
    canopyTopPos.push({
      x: x + (rng() - 0.5) * 0.5 * s,
      y: 4.7 * s,
      z: z + (rng() - 0.5) * 0.5 * s,
      sx: s * 0.7,
      sy: s * 0.6,
      sz: s * 0.7,
    });

    if (isAutumn) {
      autumnPos.push({
        x: x + (rng() - 0.5) * 1.2,
        y: 3.4 * s,
        z: z + (rng() - 0.5) * 1.2,
        sx: s * 0.65,
        sy: s * 0.55,
        sz: s * 0.65,
      });
    }
  }

  // Troncs texturés
  g.add(instanced(
    getGeo("cylinder", { r: 0.18, r2: 0.28, h: 4.2, seg: 8, pivot: "bottom" }),
    matLib.get(0x4a3020, 0.95, 0),
    trunkPos
  ));

  // Canopée principale (vert profond)
  g.add(instanced(
    getGeo("sphere", { r: 2.4, seg: 10, segH: 8 }),
    matLib.get(0x2d6a30, 0.95, 0),
    canopyPos
  ));

  // Sous-canopée (vert clair)
  g.add(instanced(
    getGeo("sphere", { r: 1.6, seg: 8, segH: 6 }),
    matLib.get(0x4a8540, 0.95, 0),
    canopyTopPos
  ));

  // Feuillages d'automne
  if (autumnPos.length) {
    g.add(instanced(
      getGeo("sphere", { r: 1.8, seg: 8, segH: 6 }),
      matLib.get(0xd85a24, 0.95, 0),
      autumnPos,
      false
    ));
  }

  // BANCS FRONTENAC en cercle autour du kiosque
  const benchPositions: Pose[] = [];
  const nBenches = 8;
  const benchRadius = Math.min(w, d) * 0.28;
  for (let i = 0; i < nBenches; i++) {
    const a = (i / nBenches) * Math.PI * 2 + Math.PI / nBenches;
    const bx = Math.cos(a) * benchRadius;
    const bz = Math.sin(a) * benchRadius;
    if (Math.abs(bx) > hw - 1 || Math.abs(bz) > hd - 1) continue;
    // Orientation face au kiosque
    benchPositions.push({ x: bx, y: 0, z: bz, yaw: a + Math.PI });
  }
  const benchGroups = makeBenchInstances(benchPositions);
  benchGroups.forEach((bg) => g.add(bg));

  // LAMPADAIRES VICTORIENS aux 4 coins et le long des allées
  const lampPositions: Array<[number, number]> = [
    [-w * 0.32, -d * 0.32],
    [w * 0.32, -d * 0.32],
    [-w * 0.32, d * 0.32],
    [w * 0.32, d * 0.32],
    [-w * 0.15, 0],
    [w * 0.15, 0],
    [0, -d * 0.15],
    [0, d * 0.15],
  ];
  const lampGroups = makeVictorianLamps(lampPositions);
  lampGroups.forEach((lg) => g.add(lg));

  // PARTERRES DE FLEURS en vagues colorées
  const flowerBeds: Pose[] = [];
  const flowerColors = [0xd83a5a, 0xf4c020, 0x9a3a68, 0xf0e8d0, 0xf28030, 0xc850a0];
  const nBeds = 12;
  for (let i = 0; i < nBeds; i++) {
    const a = (i / nBeds) * Math.PI * 2 + 0.3;
    const r = Math.min(w, d) * 0.36;
    flowerBeds.push({
      x: Math.cos(a) * r,
      y: 0.03,
      z: Math.sin(a) * r,
      yaw: a,
      color: flowerColors[i % flowerColors.length],
    });
  }
  g.add(instanced(getGeo("box", { w: 1.4, h: 0.28, d: 0.85, pivot: "bottom" }), matLib.get(0x3a5a28, 0.95, 0), flowerBeds, false));

  // Bordure des parterres en pierre
  const borderPoses: Pose[] = flowerBeds.map((p) => ({ ...p, y: 0.02, sx: 1.05, sy: 0.5, sz: 1.05 }));
  g.add(instanced(getGeo("box", { w: 1.5, h: 0.15, d: 0.95, pivot: "bottom" }), matLib.get(0x7a7570, 0.95, 0), borderPoses, false));

  // MONUMENT COMMÉMORATIF (près de l'entrée)
  const monumentBase = new THREE.Mesh(
    getGeo("box", { w: 2.2, h: 0.6, d: 1.4, pivot: "bottom" }),
    matLib.get(QC_PALETTE.pierreGrise ?? 0x8a8a8a, 0.95, 0)
  );
  monumentBase.position.set(0, 0.02, Math.min(d, w) * 0.4);
  monumentBase.castShadow = true;
  monumentBase.receiveShadow = true;
  g.add(monumentBase);

  const monumentStele = new THREE.Mesh(
    getGeo("box", { w: 1.8, h: 1.4, d: 0.4, pivot: "bottom" }),
    matLib.get(0x6a6864, 0.94, 0)
  );
  monumentStele.position.set(0, 0.62, Math.min(d, w) * 0.4);
  monumentStele.castShadow = true;
  g.add(monumentStele);

  // Plaque de bronze
  const plaque = new THREE.Mesh(
    getGeo("box", { w: 1.4, h: 0.9, d: 0.05, pivot: "bottom" }),
    matLib.get(0x8a6a30, 0.5, 0.7)
  );
  plaque.position.set(0, 0.85, Math.min(d, w) * 0.4 + 0.22);
  g.add(plaque);

  // Sommet couronné
  const monumentCap = new THREE.Mesh(
    getGeo("pyramid", { r: 1.0, h: 0.5, pivot: "bottom" }),
    matLib.get(0x6a6864, 0.94, 0)
  );
  monumentCap.position.set(0, 2.02, Math.min(d, w) * 0.4);
  monumentCap.rotation.y = Math.PI / 4;
  g.add(monumentCap);

  g.userData.landmark = "parc";
  g.userData.footprint = { width: w, depth: d };
  return g;
}

/* =========================================================================
   CIMETIÈRE PAROISSIAL — Portail, Chapelle, Stèles Variées
   ========================================================================= */

/**
 * Construit le portail monumental d'entrée du cimetière.
 */
function buildCemeteryGate(hw: number, hd: number, gateW: number): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = matLib.get(QC_PALETTE.pierreGrise ?? 0x8a8a8a, 0.94, 0);
  const stoneDark = matLib.get(0x6a6560, 0.94, 0);
  const marbleMat = matLib.get(0xd8d4c0, 0.4, 0.55);

  // Piliers avec chapiteaux (2)
  for (const side of [-1, 1]) {
    // Base
    const base = new THREE.Mesh(
      getGeo("box", { w: 0.65, h: 0.3, d: 0.65, pivot: "bottom" }),
      stoneDark
    );
    base.position.set(side * gateW, 0.02, hd - 0.1);
    base.castShadow = true;
    g.add(base);

    // Fût
    const shaft = new THREE.Mesh(
      getGeo("box", { w: 0.5, h: 1.8, d: 0.5, pivot: "bottom" }),
      stoneMat
    );
    shaft.position.set(side * gateW, 0.32, hd - 0.1);
    shaft.castShadow = true;
    g.add(shaft);

    // Chapiteau
    const cap = new THREE.Mesh(
      getGeo("box", { w: 0.7, h: 0.25, d: 0.7, pivot: "bottom" }),
      stoneDark
    );
    cap.position.set(side * gateW, 2.12, hd - 0.1);
    cap.castShadow = true;
    g.add(cap);

    // Petite pyramide décorative au sommet
    const pyramid = new THREE.Mesh(
      getGeo("pyramid", { r: 0.4, h: 0.35, pivot: "bottom" }),
      stoneDark
    );
    pyramid.position.set(side * gateW, 2.37, hd - 0.1);
    pyramid.rotation.y = Math.PI / 4;
    g.add(pyramid);
  }

  // Arche ouvragée
  const arch = new THREE.Mesh(
    getGeo("box", { w: gateW * 2 + 0.8, h: 0.35, d: 0.35, pivot: "bottom" }),
    stoneMat
  );
  arch.position.set(0, 2.15, hd - 0.1);
  arch.castShadow = true;
  g.add(arch);

  // Fronton triangulaire
  const pediment = new THREE.Mesh(
    getGeo("wedge", { w: gateW * 2 + 0.5, h: 0.5, d: 0.3, pivot: "bottom" }),
    stoneDark
  );
  pediment.position.set(0, 2.5, hd - 0.1);
  g.add(pediment);

  // Croix centrale monumentale
  const crossBase = new THREE.Mesh(
    getGeo("box", { w: 0.2, h: 0.15, d: 0.2, pivot: "bottom" }),
    stoneDark
  );
  crossBase.position.set(0, 3.0, hd - 0.1);
  g.add(crossBase);

  const crossV = new THREE.Mesh(
    getGeo("box", { w: 0.14, h: 1.1, d: 0.14, pivot: "bottom" }),
    marbleMat
  );
  crossV.position.set(0, 3.15, hd - 0.1);
  crossV.castShadow = true;
  g.add(crossV);

  const crossH = new THREE.Mesh(
    getGeo("box", { w: 0.6, h: 0.14, d: 0.14, pivot: "center" }),
    marbleMat
  );
  crossH.position.set(0, 3.85, hd - 0.1);
  crossH.castShadow = true;
  g.add(crossH);

  return g;
}

/**
 * Construit une chapelle funéraire de style paroissial.
 */
function buildChapel(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const stoneMat = matLib.get(QC_PALETTE.pierreGrise ?? 0x8a8a8a, 0.94, 0);
  const roofMat = matLib.get(QC_PALETTE.toleArgent ?? 0xa0a0a0, 0.4, 0.5);
  const doorMat = matLib.get(0x4a2818, 0.85, 0.15);
  const crossMat = matLib.get(0xd8d4c0, 0.4, 0.55);

  // Base
  const foundation = new THREE.Mesh(
    getGeo("box", { w: 4.0, h: 0.4, d: 5.0, pivot: "bottom" }),
    matLib.get(0x5a5852, 0.95, 0)
  );
  foundation.receiveShadow = true;
  g.add(foundation);

  // Murs
  const walls = new THREE.Mesh(
    getGeo("box", { w: 3.6, h: 3.2, d: 4.6, pivot: "bottom" }),
    stoneMat
  );
  walls.position.y = 0.4;
  walls.castShadow = true;
  walls.receiveShadow = true;
  g.add(walls);

  // Toit à quatre pans
  const roof = new THREE.Mesh(
    getGeo("pyramid", { r: 3.0, h: 1.8, pivot: "bottom" }),
    roofMat
  );
  roof.position.y = 3.6;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.15, 1, 0.95);
  roof.castShadow = true;
  g.add(roof);

  // Petit clocher
  const bellTower = new THREE.Mesh(
    getGeo("box", { w: 0.8, h: 1.0, d: 0.8, pivot: "bottom" }),
    stoneMat
  );
  bellTower.position.y = 5.4;
  bellTower.castShadow = true;
  g.add(bellTower);

  // Toit du clocher
  const bellRoof = new THREE.Mesh(
    getGeo("pyramid", { r: 0.6, h: 0.7, pivot: "bottom" }),
    roofMat
  );
  bellRoof.position.y = 6.4;
  bellRoof.rotation.y = Math.PI / 4;
  bellRoof.castShadow = true;
  g.add(bellRoof);

  // Croix au sommet
  const crossV = new THREE.Mesh(
    getGeo("box", { w: 0.06, h: 0.5, d: 0.06, pivot: "bottom" }),
    crossMat
  );
  crossV.position.y = 7.1;
  g.add(crossV);

  const crossH = new THREE.Mesh(
    getGeo("box", { w: 0.28, h: 0.06, d: 0.06, pivot: "center" }),
    crossMat
  );
  crossH.position.y = 7.4;
  g.add(crossH);

  // Porte cintrée
  const door = new THREE.Mesh(
    getGeo("box", { w: 0.9, h: 1.8, d: 0.08, pivot: "bottom" }),
    doorMat
  );
  door.position.set(0, 0.4, 2.35);
  g.add(door);

  // Arche au-dessus de la porte
  const doorArch = new THREE.Mesh(
    getGeo("hemisphere", { r: 0.5, seg: 12 }),
    stoneMat
  );
  doorArch.position.set(0, 2.2, 2.35);
  doorArch.rotation.x = Math.PI / 2;
  doorArch.scale.set(1, 0.4, 1);
  g.add(doorArch);

  // Rosace circulaire
  const rose = new THREE.Mesh(
    getGeo("torus", { r: 0.35, tube: 0.05, seg: 16 }),
    crossMat
  );
  rose.position.set(0, 2.8, 2.32);
  g.add(rose);

  // Vitraux (petites fenêtres cintrées sur les côtés)
  for (const side of [-1, 1]) {
    for (const zOff of [-1, 0.5]) {
      const window = new THREE.Mesh(
        getGeo("box", { w: 0.08, h: 1.0, d: 0.5, pivot: "bottom" }),
        matLib.get(0x2a4a6a, 0.3, 0.5)
      );
      window.position.set(side * 1.85, 1.4, zOff);
      g.add(window);
    }
  }

  return g;
}

/**
 * Construit une variété de stèles funéraires (croix, plates, obélisques).
 */
function buildTombstones(g: THREE.Group, slabs: Pose[], crosses: Pose[], obelisks: Pose[], family: Pose[]) {
  const stoneA = matLib.get(0x8a8880, 0.96, 0);
  const stoneB = matLib.get(0x6a6864, 0.94, 0);
  const marbleWhite = matLib.get(0xe0dcd0, 0.5, 0.4);

  // TYPE 1 : Stèles rectangulaires classiques
  if (slabs.length) {
    // Base
    const bases = slabs.map((p) => ({ ...p, y: 0.02, sx: 1.1, sy: 0.3, sz: 1.4 }));
    g.add(instanced(getGeo("box", { w: 0.6, h: 0.15, d: 0.25, pivot: "bottom" }), stoneB, bases));

    // Stèle principale
    g.add(instanced(getGeo("box", { w: 0.6, h: 1.0, d: 0.14, pivot: "bottom" }), stoneA, slabs.map((p) => ({ ...p, y: 0.17 }))));

    // Sommet arrondi
    g.add(instanced(getGeo("hemisphere", { r: 0.3, seg: 8 }), stoneA, slabs.map((p) => ({ ...p, y: 0.17 + 1.0 * (p.sy ?? 1) }))));
  }

  // TYPE 2 : Croix latines simples
  if (crosses.length) {
    // Base
    g.add(instanced(getGeo("box", { w: 0.4, h: 0.12, d: 0.4, pivot: "bottom" }), stoneB, crosses.map((p) => ({ ...p, y: 0.02 }))));

    // Barre verticale
    g.add(instanced(getGeo("box", { w: 0.12, h: 1.3, d: 0.12, pivot: "bottom" }), stoneA, crosses.map((p) => ({ ...p, y: 0.14 }))));

    // Barre horizontale
    g.add(instanced(getGeo("box", { w: 0.6, h: 0.12, d: 0.12, pivot: "center" }), stoneA, crosses.map((p) => ({ ...p, y: 0.14 + 1.0 * (p.sy ?? 1) }))));
  }

  // TYPE 3 : Obélisques
  if (obelisks.length) {
    // Base large
    g.add(instanced(getGeo("box", { w: 0.5, h: 0.25, d: 0.5, pivot: "bottom" }), stoneB, obelisks.map((p) => ({ ...p, y: 0.02 }))));

    // Corps carré
    g.add(instanced(getGeo("box", { w: 0.35, h: 1.4, d: 0.35, pivot: "bottom" }), marbleWhite, obelisks.map((p) => ({ ...p, y: 0.27 }))));

    // Pointe pyramidale
    g.add(instanced(getGeo("pyramid", { r: 0.25, h: 0.4, pivot: "bottom" }), marbleWhite, obelisks.map((p) => ({ ...p, y: 0.27 + 1.4 * (p.sy ?? 1), yaw: (p.yaw ?? 0) + Math.PI / 4 }))));
  }

  // TYPE 4 : Monuments familiaux plus imposants
  if (family.length) {
    // Base impressionnante
    g.add(instanced(getGeo("box", { w: 1.2, h: 0.3, d: 0.8, pivot: "bottom" }), stoneB, family.map((p) => ({ ...p, y: 0.02 }))));

    // Stèle centrale large
    g.add(instanced(getGeo("box", { w: 1.0, h: 1.6, d: 0.25, pivot: "bottom" }), stoneA, family.map((p) => ({ ...p, y: 0.32 }))));

    // Fronton triangulaire
    g.add(instanced(getGeo("wedge", { w: 1.0, h: 0.4, d: 0.25, pivot: "bottom" }), stoneA, family.map((p) => ({ ...p, y: 0.32 + 1.6 * (p.sy ?? 1) }))));

    // Croix au sommet
    g.add(instanced(getGeo("box", { w: 0.08, h: 0.4, d: 0.08, pivot: "bottom" }), marbleWhite, family.map((p) => ({ ...p, y: 0.32 + 1.6 * (p.sy ?? 1) + 0.4 }))));
  }
}

/** Cimetière paroissial québécois avec portail monumental, chapelle et stèles variées. */
export function buildCemetery(width: number, depth: number, seed = 1894): THREE.Group {
  const g = new THREE.Group();
  g.name = "cimetiere";
  const rng = makeRng(seed + 77);
  const w = Math.max(16, width);
  const d = Math.max(18, depth);
  const hw = w / 2;
  const hd = d / 2;

  // Sol de gazon plus sombre
  g.add(lawn(w, d, 0x3a5234, 0.018));

  // Allée principale (croix latine)
  g.add(pathStrip(2.2, d * 0.9, 0, 0, 0x8a8478));
  g.add(pathStrip(w * 0.72, 1.8, 0, -hd * 0.18, 0x8a8478));
  g.add(pathStrip(w * 0.5, 1.4, 0, hd * 0.2, 0x8a8478));

  // CLÔTURE EN FER FORGÉ
  const iron = matLib.get(0x1a1a1c, 0.55, 0.5);
  const posts: Pose[] = [];
  const rails: Pose[] = [];
  const spikes: Pose[] = [];
  const step = 1.55;
  const gateW = 2.4;

  for (let x = -hw + 0.2; x <= hw - 0.2; x += step) {
    const skipFront = Math.abs(x) < gateW;
    // Arrière
    posts.push({ x, y: 0.02, z: -hd + 0.12 });
    rails.push({ x, y: 0.4, z: -hd + 0.12, sx: step * 0.92, sy: 1, sz: 1 });
    rails.push({ x, y: 1.15, z: -hd + 0.12, sx: step * 0.92, sy: 1, sz: 1 });
    spikes.push({ x, y: 1.4, z: -hd + 0.12 });

    if (!skipFront) {
      posts.push({ x, y: 0.02, z: hd - 0.12 });
      rails.push({ x, y: 0.4, z: hd - 0.12, sx: step * 0.92, sy: 1, sz: 1 });
      rails.push({ x, y: 1.15, z: hd - 0.12, sx: step * 0.92, sy: 1, sz: 1 });
      spikes.push({ x, y: 1.4, z: hd - 0.12 });
    }
  }
  for (let z = -hd + step; z <= hd - step; z += step) {
    posts.push({ x: -hw + 0.12, y: 0.02, z, yaw: Math.PI / 2 });
    posts.push({ x: hw - 0.12, y: 0.02, z, yaw: Math.PI / 2 });
    rails.push({ x: -hw + 0.12, y: 0.4, z, yaw: Math.PI / 2, sx: step * 0.92 });
    rails.push({ x: -hw + 0.12, y: 1.15, z, yaw: Math.PI / 2, sx: step * 0.92 });
    rails.push({ x: hw - 0.12, y: 0.4, z, yaw: Math.PI / 2, sx: step * 0.92 });
    rails.push({ x: hw - 0.12, y: 1.15, z, yaw: Math.PI / 2, sx: step * 0.92 });
    spikes.push({ x: -hw + 0.12, y: 1.4, z });
    spikes.push({ x: hw - 0.12, y: 1.4, z });
  }

  g.add(instanced(getGeo("box", { w: 0.1, h: 1.4, d: 0.1, pivot: "bottom" }), iron, posts));
  g.add(instanced(getGeo("box", { w: 1.5, h: 0.05, d: 0.05, pivot: "bottom" }), iron, rails, false));
  // Pointes de lance au sommet des poteaux
  g.add(instanced(getGeo("pyramid", { r: 0.06, h: 0.2, pivot: "bottom" }), iron, spikes, false));

  // PORTAIL MONUMENTAL
  g.add(buildCemeteryGate(hw, hd, gateW));

  // STÈLES VARIÉES (4 types de monuments)
  const slabs: Pose[] = [];
  const crosses: Pose[] = [];
  const obelisks: Pose[] = [];
  const familyMonuments: Pose[] = [];

  const rows = Math.max(4, Math.floor((d - 8) / 2.8));
  const cols = Math.max(5, Math.floor((w - 6) / 2.4));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * 2.4 + (rng() - 0.5) * 0.3;
      const z = -hd + 4.5 + row * 2.9 + (rng() - 0.5) * 0.25;
      // Évite l'allée centrale et le portail
      if (Math.abs(x) < 1.4) continue;
      if (z > hd - 3.5) continue;

      const yaw = (rng() - 0.5) * 0.08;
      const hScale = 0.85 + rng() * 0.4;
      const type = rng();

      if (type < 0.5) {
        // 50% stèles classiques
        slabs.push({
          x,
          y: 0.02,
          z,
          yaw,
          sy: hScale,
          color: rng() > 0.5 ? 0x8a8880 : 0x6e6c68,
        });
      } else if (type < 0.75) {
        // 25% croix
        crosses.push({ x, y: 0.02, z, yaw, sy: hScale });
      } else if (type < 0.9) {
        // 15% obélisques
        obelisks.push({ x, y: 0.02, z, yaw, sy: hScale * 1.1 });
      } else {
        // 10% monuments familiaux
        familyMonuments.push({ x, y: 0.02, z, yaw, sy: hScale });
      }
    }
  }

  buildTombstones(g, slabs, crosses, obelisks, familyMonuments);

  // CÈDRES COLONNAIRES (le long des allées)
  const trunks: Pose[] = [];
  const cedars: Pose[] = [];
  const nCedar = Math.min(14, 6 + Math.floor(w / 6));
  for (let i = 0; i < nCedar; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (hw - 1.4 - rng() * 0.6);
    const z = -hd + 3 + (i / nCedar) * (d - 6) + (rng() - 0.5) * 0.5;
    const s = 0.85 + rng() * 0.35;
    trunks.push({ x, y: 0, z, sx: s * 0.7, sy: s, sz: s * 0.7 });
    cedars.push({ x, y: 1.8 * s, z, sx: s * 0.55, sy: s * 1.3, sz: s * 0.55 });
  }
  g.add(instanced(getGeo("cylinder", { r: 0.14, r2: 0.2, h: 1.8, seg: 8, pivot: "bottom" }), matLib.get(0x3a2818, 0.96, 0), trunks));
  g.add(instanced(getGeo("cone", { r: 1.0, h: 5.5, seg: 8, pivot: "bottom" }), matLib.get(0x1e3a28, 0.95, 0), cedars));

  // CHAPELLE FUNÉRAIRE (si assez grand)
  if (w > 22) {
    g.add(buildChapel(-hw + 4, -hd + 4.5));
  }

  // FLEURS SUR LES TOMBES (pots colorés)
  const pots: Pose[] = [];
  const flowers: Pose[] = [];
  const potColors = [0xa04838, 0x6a2a48, 0xd4a017, 0x3a6a48, 0xc85a68];
  const flowerColors = [0xf03060, 0xffd020, 0xf090b8, 0xe0e0e0];

  const allGraves = [...slabs, ...crosses, ...obelisks];
  const nPots = Math.min(20, allGraves.length);
  for (let i = 0; i < nPots; i++) {
    if (rng() > 0.4) continue; // Pas toutes les tombes ont des fleurs
    const s = allGraves[i]!;
    const offsetX = (rng() - 0.5) * 0.4;
    const offsetZ = 0.3 + rng() * 0.15;
    pots.push({
      x: s.x + offsetX,
      y: 0.02,
      z: s.z + offsetZ,
      color: potColors[i % potColors.length],
    });
    flowers.push({
      x: s.x + offsetX,
      y: 0.2,
      z: s.z + offsetZ,
      color: flowerColors[i % flowerColors.length],
    });
  }
  if (pots.length) {
    g.add(instanced(getGeo("cylinder", { r: 0.14, r2: 0.11, h: 0.2, seg: 8, pivot: "bottom" }), matLib.get(0x6a3a28, 0.9, 0), pots, false));
    g.add(instanced(getGeo("sphere", { r: 0.12, seg: 8, segH: 6 }), matLib.get(0x3a5a28, 0.95, 0), flowers, false));
  }

  // BANC DE MÉDITATION près de la chapelle
  if (w > 22) {
    const meditationBench: Pose[] = [{ x: -hw + 8, y: 0, z: -hd + 6, yaw: -Math.PI / 2 }];
    const bg = makeBenchInstances(meditationBench);
    bg.forEach((b) => g.add(b));
  }

  g.userData.landmark = "cimetiere";
  g.userData.footprint = { width: w, depth: d };
  return g;
}
