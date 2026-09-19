// ═══════════════════════════════════════════════════════════════════════════
//  SAINT-CASIMIR — MODULE DE GÉNÉRATION GÉOLOGIQUE ET RURALE PROCÉDURALE
//  src/world/villages/SaintCasimir.ts
//  Vallée agricole · La gorge érodée · Les marmites de géants · Pont de fer (0 Leaks ♻️)
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { buildBuilding, matLib, geoLib, QC_PALETTE } from '../buildings/architecture/QuebecArchitecture';
import type { VillageProfile } from '../VillageProfiles';

// ─────────────────────────────────────────────────────────────────────────
//  PROFIL AUTHENTIQUE DE SAINT-CASIMIR
// ─────────────────────────────────────────────────────────────────────────

export const SAINT_CASIMIR_PROFILE: VillageProfile = {
  name: 'Saint-Casimir',
  center: [-500, -400],
  population: 1400,
  founded: 1847,
  type: 'village',

  industry: 'agriculture',
  secondaryIndustry: 'tourisme',
  landmarks: ['pont_couvert'],
  motto: 'Les marmites de géants',
  description:
    "Village agricole niché dans la gorge de la rivière Sainte-Anne. Ses marmites de " +
    "géants — cuves creusées dans le roc par les tourbillons glaciaires — et les grottes " +
    "du Trou du Diable en font un site géologique unique au Québec.",

  wallPalette: [QC_PALETTE.boisBlanc, QC_PALETTE.boisCreme, QC_PALETTE.boisVert],
  roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleVerte, QC_PALETTE.toleArgent],
  churchStyle: 'pierre_grise',
  churchScale: 0.95,

  mainRoadAngle: 0.4,
  density: 0.7,
  setbackBase: 16,
  gridPattern: false,

  terrain: 'vallee',
  forestDensity: 0.55,
  farmCount: 8,
  fieldColors: [0x7a8a4a, 0x8a9450, 0x6a7a42, 0xa89a58],
  hasRiver: true,
  riverAngle: 0.3,

  hasDepanneur: true,
  hasCaisse: false,
  hasEcole: true,
  hasGarage: false,
  sugarShackCount: 4,
};

// ─────────────────────────────────────────────────────────────────────────
//  CONFIGURATION SPATIALE
// ─────────────────────────────────────────────────────────────────────────

export interface SaintCasimirConfig {
  center: [number, number];
  roadAngle: number;
  gorgeAngle: number;
  heightFn?: (x: number, z: number) => number;
  litRatio?: number;
}

export const DEFAULT_CONFIG: SaintCasimirConfig = {
  center: [-500, -400],
  roadAngle: 0.4,
  gorgeAngle: 0.3,
  litRatio: 0,
};

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Tableau de suivi mémoire pour nettoyer le GPU
const localDisposables: Array<THREE.BufferGeometry | THREE.Material> = [];

// ═══════════════════════════════════════════════════════════════════════════
//  1. LES MARMITES DE GÉANTS (CUVES CYLINDRIQUES POLIES DANS LE ROC)
// ═══════════════════════════════════════════════════════════════════════════

export function buildMarmitesDeGeants(count = 9): THREE.Group {
  const g = new THREE.Group();
  g.name = 'marmites_geants';

  const rng = makeRng(1847);

  const rockMat = matLib.get(0x8a8478, 0.98);
  const rockDark = matLib.get(0x6a6458, 0.98);
  const wetRock = matLib.get(0x5a5850, 0.45, 0.25); // Roc mouillé luisant

  // Le lit de roc — plan irrégulier
  const bedGeo = new THREE.PlaneGeometry(70, 34, 24, 12);
  bedGeo.rotateX(-Math.PI / 2);
  const bedPos = bedGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bedPos.count; i++) {
    const x = bedPos.getX(i);
    const z = bedPos.getZ(i);
    bedPos.setY(i, Math.sin(x * 0.14) * 0.5 + Math.cos(z * 0.22) * 0.35 + (rng() - 0.5) * 0.25);
  }
  bedGeo.computeVertexNormals();
  localDisposables.push(bedGeo);

  const bedMesh = new THREE.Mesh(bedGeo, rockMat);
  bedMesh.receiveShadow = true;
  g.add(bedMesh);

  // Génération des cuves (marmites)
  for (let i = 0; i < count; i++) {
    const marmite = new THREE.Group();

    const radius = 0.8 + rng() * 2.6;
    const depth = 1.2 + radius * 1.3 + rng() * 1.5;

    // Paroi intérieure polie
    const wallGeo = geoLib.getCylinder(radius, radius * 0.82, depth, 20);
    const wall = new THREE.Mesh(wallGeo, wetRock);
    wall.position.y = -depth / 2;
    wall.material.side = THREE.BackSide;
    marmite.add(wall);

    // Fond
    const bottomGeo = geoLib.getPlane(radius * 1.64, radius * 1.64);
    const bottom = new THREE.Mesh(bottomGeo, rockDark);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -depth;
    marmite.add(bottom);

    // Eau stagnante émeraude
    const waterDepth = depth * (0.25 + rng() * 0.35);
    const waterGeo = geoLib.getPlane(radius * 1.72, radius * 1.72);
    const water = new THREE.Mesh(waterGeo, matLib.get(0x2a6a5a, 0.08, 0.65));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -depth + waterDepth;
    water.userData.isMarmiteWater = true;
    marmite.add(water);

    // Rebords érodés de la cuve (Torus géométrie)
    const rimGeo = new THREE.TorusGeometry(radius, radius * 0.14, 8, 20);
    localDisposables.push(rimGeo);

    const rim = new THREE.Mesh(rimGeo, rockMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -0.05;
    rim.receiveShadow = true;
    marmite.add(rim);

    // Galets d'érosion au fond
    const pebbleCount = 3 + Math.floor(rng() * 5);
    const pebbleGeo = geoLib.getSphere(0.16, 6, 5);
    const pebbleInst = new THREE.InstancedMesh(pebbleGeo, rockDark, pebbleCount);
    const dummy = new THREE.Object3D();
    for (let p = 0; p < pebbleCount; p++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * radius * 0.6;
      dummy.position.set(Math.cos(a) * r, -depth + 0.15, Math.sin(a) * r);
      dummy.scale.setScalar(0.6 + rng() * 0.9);
      dummy.updateMatrix();
      pebbleInst.setMatrixAt(p, dummy.matrix);
    }
    pebbleInst.instanceMatrix.needsUpdate = true;
    marmite.add(pebbleInst);

    // Placement regroupé
    const clusterAngle = (i / count) * Math.PI * 2 + rng() * 0.9;
    const clusterDist = 6 + rng() * 22;
    marmite.position.set(Math.cos(clusterAngle) * clusterDist, 0, Math.sin(clusterAngle) * clusterDist * 0.55);
    g.add(marmite);
  }

  // Passerelle piétonne d'observation
  const woodMat = matLib.get(0x7a5a3a, 0.96);
  const railMat = matLib.get(0x5a4530, 0.94);

  const walkway = new THREE.Group();
  const deckLength = 44;
  const deck = new THREE.Mesh(geoLib.getBox(1.6, 0.14, deckLength), woodMat);
  deck.position.y = 1.4;
  deck.receiveShadow = true;
  deck.castShadow = true;
  walkway.add(deck);

  // Pilotis d'acier
  const pileGeo = geoLib.getCylinder(0.11, 0.13, 2.2, 7);
  const pileCount = 14;
  const pileInst = new THREE.InstancedMesh(pileGeo, railMat, pileCount * 2);
  const dummy = new THREE.Object3D();
  let pi = 0;
  for (let i = 0; i < pileCount; i++) {
    for (const side of [-0.7, 0.7]) {
      dummy.position.set(side, 0.4, -deckLength / 2 + i * (deckLength / (pileCount - 1)));
      dummy.updateMatrix();
      pileInst.setMatrixAt(pi++, dummy.matrix);
    }
  }
  pileInst.instanceMatrix.needsUpdate = true;
  pileInst.castShadow = true;
  walkway.add(pileInst);

  // Garde-corps de la passerelle
  const railTop = new THREE.Mesh(geoLib.getBox(0.08, 0.08, deckLength), railMat);
  const railMid = new THREE.Mesh(geoLib.getBox(0.06, 0.06, deckLength), railMat);
  const postGeo = geoLib.getBox(0.09, 1.1, 0.09);

  for (const side of [-0.78, 0.78]) {
    const top = railTop.clone();
    top.position.set(side, 2.4, 0);
    walkway.add(top);

    const mid = railMid.clone();
    mid.position.set(side, 1.95, 0);
    walkway.add(mid);

    const postInst = new THREE.InstancedMesh(postGeo, railMat, pileCount);
    for (let i = 0; i < pileCount; i++) {
      dummy.position.set(side, 1.95, -deckLength / 2 + i * (deckLength / (pileCount - 1)));
      dummy.updateMatrix();
      postInst.setMatrixAt(i, dummy.matrix);
    }
    postInst.instanceMatrix.needsUpdate = true;
    walkway.add(postInst);
  }

  walkway.position.set(0, 0, -14);
  walkway.rotation.y = 0.15;
  g.add(walkway);

  // Panneau d'interprétation géologique
  const signPost = new THREE.Mesh(geoLib.getBox(0.12, 2.0, 0.12), matLib.get(0x4a3a28, 0.95));
  signPost.position.set(3.5, 1.0, -20);
  g.add(signPost);

  const signPanel = new THREE.Mesh(geoLib.getBox(1.8, 1.1, 0.08), matLib.get(0x3a5a42, 0.85));
  signPanel.position.set(3.5, 2.1, -20);
  signPanel.rotation.x = -0.22;
  signPanel.castShadow = true;
  g.add(signPanel);

  g.userData.landmark = 'marmites_geants';
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. ENTREE DU TROU DU DIABLE (GROTTE)
// ═══════════════════════════════════════════════════════════════════════════

export function buildTrouDuDiable(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'trou_du_diable';

  const rockMat = matLib.get(0x6a6458, 0.99);
  const rockDark = matLib.get(0x38342e, 0.99);
  const shadowMat = matLib.get(0x0a0908, 1.0);

  // Paroi calcaire Champlain ondulée
  const cliffGeo = new THREE.BoxGeometry(30, 16, 10, 12, 8, 4);
  const cliffPos = cliffGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cliffPos.count; i++) {
    const x = cliffPos.getX(i);
    const y = cliffPos.getY(i);
    const z = cliffPos.getZ(i);
    const strata = Math.sin(y * 1.6) * 0.4;
    cliffPos.setX(i, x + strata * 0.5 + (Math.random() - 0.5) * 0.4);
    cliffPos.setZ(i, z + strata * 0.3 + (Math.random() - 0.5) * 0.4);
  }
  cliffGeo.computeVertexNormals();
  localDisposables.push(cliffGeo); // Anti-fuite

  const cliff = new THREE.Mesh(cliffGeo, rockMat);
  cliff.position.y = 8;
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  g.add(cliff);

  // Ouverture triangulaire irrégulière
  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-1.9, 0);
  mouthShape.lineTo(-2.2, 1.1);
  mouthShape.lineTo(-1.5, 2.3);
  mouthShape.lineTo(-0.4, 3.0);
  mouthShape.lineTo(0.8, 2.7);
  mouthShape.lineTo(1.7, 1.6);
  mouthShape.lineTo(2.0, 0.5);
  mouthShape.lineTo(1.4, 0);
  mouthShape.closePath();

  const mouthGeo = new THREE.ExtrudeGeometry(mouthShape, {
    depth: 7,
    bevelEnabled: true,
    bevelSize: 0.3,
    bevelThickness: 0.25,
  });
  localDisposables.push(mouthGeo);

  const mouth = new THREE.Mesh(mouthGeo, shadowMat);
  mouth.position.set(0, 0.1, 4.6);
  mouth.rotation.y = Math.PI;
  g.add(mouth);

  // Cadre d'entrée
  const rimGeo = new THREE.TorusGeometry(2.4, 0.5, 7, 14, Math.PI * 1.5);
  localDisposables.push(rimGeo);

  const rim = new THREE.Mesh(rimGeo, rockDark);
  rim.position.set(0, 1.6, 5.1);
  rim.rotation.z = 0.35;
  rim.castShadow = true;
  g.add(rim);

  // Éboulis au sol instanciés
  const bouldersMat = matLib.get(0x7a7468, 0.99);
  const boulderGeo = geoLib.getSphere(1.2, 8, 6);
  const boulderInst = new THREE.InstancedMesh(boulderGeo, bouldersMat, 22);
  const dummy = new THREE.Object3D();
  const rng = makeRng(666);

  for (let i = 0; i < 22; i++) {
    const a = (rng() - 0.5) * Math.PI * 1.2;
    const d = 5 + rng() * 11;
    dummy.position.set(Math.sin(a) * d, 0.3 + rng() * 0.6, 5 + Math.cos(a) * d * 0.5);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(0.5 + rng() * 1.4);
    dummy.updateMatrix();
    boulderInst.setMatrixAt(i, dummy.matrix);
  }
  boulderInst.instanceMatrix.needsUpdate = true;
  boulderInst.castShadow = true;
  boulderInst.receiveShadow = true;
  g.add(boulderInst);

  const trail = new THREE.Mesh(geoLib.getPlane(2.4, 26), matLib.get(0x6a5f50, 1.0));
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(0, 0.03, 18);
  trail.receiveShadow = true;
  g.add(trail);

  // Panneau avertissement Sûreté du Québec
  const warnPost = new THREE.Mesh(geoLib.getCylinder(0.06, 0.06, 2.0, 6), matLib.get(0x5a5a5e, 0.6, 0.4));
  warnPost.position.set(2.8, 1.0, 12);
  g.add(warnPost);

  const warnSign = new THREE.Mesh(geoLib.getBox(1.1, 0.8, 0.05), matLib.get(0xd8b020, 0.7));
  warnSign.position.set(2.8, 2.0, 12);
  warnSign.castShadow = true;
  g.add(warnSign);

  // Fougères et mousse
  const mossMat = matLib.get(0x3a5a2e, 1);
  const mossGeo = geoLib.getSphere(0.5, 5, 4);
  const mossInst = new THREE.InstancedMesh(mossGeo, mossMat, 16);
  for (let i = 0; i < 16; i++) {
    const a = (rng() - 0.5) * Math.PI;
    const d = 3 + rng() * 7;
    dummy.position.set(Math.sin(a) * d, 0.25, 5.5 + Math.cos(a) * d * 0.4);
    dummy.scale.set(0.8 + rng() * 0.7, 0.35 + rng() * 0.3, 0.8 + rng() * 0.7);
    dummy.rotation.y = rng() * Math.PI;
    dummy.updateMatrix();
    mossInst.setMatrixAt(i, dummy.matrix);
  }
  mossInst.instanceMatrix.needsUpdate = true;
  g.add(mossInst);

  g.userData.landmark = 'trou_du_diable';
  g.userData.caveEntrance = new THREE.Vector3(0, 1.2, 5);
  return g;
}

// ─────────────────────────────────────────────────────────────────────────
//  3. LE PONT DE FER (TREILLIS RIVETÉ D'ÉPOQUE)
// ─────────────────────────────────────────────────────────────────────────

export function buildPontDeFer(span = 42): THREE.Group {
  const g = new THREE.Group();
  g.name = 'pont_de_fer';

  const steelMat = matLib.get(0x4a5a52, 0.55, 0.72);
  const steelDark = matLib.get(0x3a4a44, 0.6, 0.68);
  const deckMat = matLib.get(0x4a4844, 0.95);

  const height = 7.5;
  const width = 7;

  const deck = new THREE.Mesh(geoLib.getBox(width, 0.5, span), deckMat);
  deck.position.y = 4;
  deck.receiveShadow = true;
  deck.castShadow = true;
  g.add(deck);

  const subBeamGeo = geoLib.getBox(0.35, 0.9, span);
  for (const side of [-width / 2 + 0.4, width / 2 - 0.4]) {
    const beam = new THREE.Mesh(subBeamGeo, steelDark);
    beam.position.set(side, 3.4, 0);
    beam.castShadow = true;
    g.add(beam);
  }

  // Treillis d'acier
  const panelCount = 8;
  const panelLen = span / panelCount;

  const topChordGeo = geoLib.getBox(0.3, 0.42, span);
  const botChordGeo = geoLib.getBox(0.3, 0.38, span);
  const postGeo = geoLib.getBox(0.26, height, 0.26);

  const diagLen = Math.hypot(panelLen, height);
  const diagAngle = Math.atan2(height, panelLen);
  const diagGeo = geoLib.getBox(0.2, diagLen, 0.2);

  const strutGeo = geoLib.getBox(width, 0.22, 0.22);
  const braceLen = Math.hypot(width, panelLen * 2);
  const braceGeo = geoLib.getBox(braceLen, 0.14, 0.14);

  for (const side of [-width / 2, width / 2]) {
    const topChord = new THREE.Mesh(topChordGeo, steelMat);
    topChord.position.set(side, 4 + height, 0);
    topChord.castShadow = true;
    g.add(topChord);

    const bottomChord = new THREE.Mesh(botChordGeo, steelMat);
    bottomChord.position.set(side, 4.3, 0);
    g.add(bottomChord);

    for (let i = 0; i <= panelCount; i++) {
      const z = -span / 2 + i * panelLen;
      const post = new THREE.Mesh(postGeo, steelMat);
      post.position.set(side, 4.3 + height / 2, z);
      post.castShadow = true;
      g.add(post);
    }

    for (let i = 0; i < panelCount; i++) {
      const z = -span / 2 + i * panelLen + panelLen / 2;
      const dir = i % 2 === 0 ? 1 : -1;
      const diag = new THREE.Mesh(diagGeo, steelMat);
      diag.position.set(side, 4.3 + height / 2, z);
      diag.rotation.x = dir * diagAngle;
      diag.castShadow = true;
      g.add(diag);
    }
  }

  for (let i = 0; i <= panelCount; i += 2) {
    const z = -span / 2 + i * panelLen;
    const strut = new THREE.Mesh(strutGeo, steelMat);
    strut.position.set(0, 4.3 + height, z);
    g.add(strut);

    for (const rot of [1, -1]) {
      const brace = new THREE.Mesh(braceGeo, steelDark);
      brace.position.set(0, 4.3 + height - 0.3, z + panelLen);
      brace.rotation.y = rot * Math.atan2(panelLen * 2, width);
      g.add(brace);
    }
  }

  const railGeo = geoLib.getBox(0.09, 0.09, span);
  for (const side of [-width / 2 + 0.5, width / 2 - 0.5]) {
    const rail = new THREE.Mesh(railGeo, steelDark);
    rail.position.set(side, 5.3, 0);
    g.add(rail);
  }

  const abutmentGeo = geoLib.getBox(width + 3, 8, 5);
  const concreteMat = matLib.get(0x8a8880, 0.96);
  for (const z of [span / 2 + 2, -span / 2 - 2]) {
    const abutment = new THREE.Mesh(abutmentGeo, concreteMat);
    abutment.position.set(0, 0.5, z);
    abutment.receiveShadow = true;
    abutment.castShadow = true;
    g.add(abutment);
  }

  g.userData.landmark = 'pont_de_fer';
  return g;
}

// ─────────────────────────────────────────────────────────────────────────
//  4. LA GORGE DE LA RIVIÈRE SAINTE-ANNE EN ROC PROPRIÉTÉ
// ─────────────────────────────────────────────────────────────────────────

export function buildGorgeSainteAnne(length = 320, angle = 0.3): THREE.Group {
  const g = new THREE.Group();
  g.name = 'gorge_sainte_anne';

  const rng = makeRng(1847);
  const rockMat = matLib.get(0x7a7468, 0.98);
  const rockLower = matLib.get(0x5a5850, 0.97);

  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  const perpX = -dirZ;
  const perpZ = dirX;

  const segments = 26;
  const gorgeWidth = 24;
  const gorgeDepth = 9;

  for (const side of [-1, 1]) {
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments - 0.5) * length;
      const wobble = Math.sin(i * 0.42) * 5;
      const halfW = gorgeWidth / 2 + Math.sin(i * 0.31) * 3.5;

      const baseX = dirX * t + perpX * wobble;
      const baseZ = dirZ * t + perpZ * wobble;

      const topX = baseX + perpX * side * (halfW + 7);
      const topZ = baseZ + perpZ * side * (halfW + 7);
      const botX = baseX + perpX * side * halfW;
      const botZ = baseZ + perpZ * side * halfW;

      const topY = 1.5 + rng() * 1.2;
      positions.push(topX, topY, topZ);
      positions.push(botX, -gorgeDepth, botZ);

      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    localDisposables.push(geo);

    const wall = new THREE.Mesh(geo, side > 0 ? rockMat : rockLower);
    wall.receiveShadow = true;
    wall.castShadow = true;
    wall.material.side = THREE.DoubleSide;
    g.add(wall);
  }

  // Rendu de l'eau ondulante
  const riverPositions: number[] = [];
  const riverIndices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments - 0.5) * length;
    const wobble = Math.sin(i * 0.42) * 5;
    const halfW = gorgeWidth / 2 + Math.sin(i * 0.31) * 3.5;

    const baseX = dirX * t + perpX * wobble;
    const baseZ = dirZ * t + perpZ * wobble;

    for (const side of [-1, 1]) {
      riverPositions.push(baseX + perpX * side * halfW, -gorgeDepth + 1.6, baseZ + perpZ * side * halfW);
    }

    if (i < segments) {
      const a = i * 2;
      riverIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const riverGeo = new THREE.BufferGeometry();
  riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeo.setIndex(riverIndices);
  riverGeo.computeVertexNormals();
  localDisposables.push(riverGeo);

  const river = new THREE.Mesh(riverGeo, matLib.get(0x2a5a5a, 0.12, 0.6, true));
  river.receiveShadow = true;
  river.userData.isGorgeRiver = true;
  g.add(river);

  // Écume et rapides instanciés
  const foamGeo = geoLib.getPlane(6, 4);
  const foamMat = matLib.get(0xe0eae8, 0.35, 0.15);
  const foamCount = 12;
  const foamInst = new THREE.InstancedMesh(foamGeo, foamMat, foamCount);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < foamCount; i++) {
    const t = (i / foamCount - 0.5) * length * 0.9;
    const wobble = Math.sin((i / foamCount) * segments * 0.42) * 5;
    dummy.position.set(
      dirX * t + perpX * (wobble + (rng() - 0.5) * 8),
      -gorgeDepth + 1.75,
      dirZ * t + perpZ * (wobble + (rng() - 0.5) * 8)
    );
    dummy.rotation.y = angle + (rng() - 0.5) * 0.5;
    dummy.scale.setScalar(0.6 + rng() * 0.8);
    dummy.updateMatrix();
    foamInst.setMatrixAt(i, dummy.matrix);
  }
  foamInst.instanceMatrix.needsUpdate = true;
  foamInst.userData.isFoam = true;
  g.add(foamInst);

  // Rochers érosifs
  const boulderGeo = geoLib.getSphere(1.2, 8, 6);
  const boulderInst = new THREE.InstancedMesh(boulderGeo, matLib.get(0x6a6458, 0.96), 18);
  for (let i = 0; i < 18; i++) {
    const t = (rng() - 0.5) * length * 0.85;
    const wobble = Math.sin((t / length + 0.5) * segments * 0.42) * 5;
    dummy.position.set(
      dirX * t + perpX * (wobble + (rng() - 0.5) * 14),
      -gorgeDepth + 1.2 + rng() * 0.8,
      dirZ * t + perpZ * (wobble + (rng() - 0.5) * 14)
    );
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(0.5 + rng() * 1.1);
    dummy.updateMatrix();
    boulderInst.setMatrixAt(i, dummy.matrix);
  }
  boulderInst.instanceMatrix.needsUpdate = true;
  boulderInst.castShadow = true;
  g.add(boulderInst);

  g.userData.landmark = 'gorge_sainte_anne';
  return g;
}

// ─────────────────────────────────────────────────────────────────────────
//  5. ASSEMBLAGE DE SAINT-CASIMIR
// ─────────────────────────────────────────────────────────────────────────

export interface SaintCasimirResult {
  group: THREE.Group;
  center: THREE.Vector3;
  radius: number;
  buildings: THREE.Group[];
  pointsOfInterest: Array<{
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    radius: number;
    description?: string;
  }>;
  walkableAreas: Array<{ minX: number; minZ: number; maxX: number; maxZ: number }>;
}

export function buildSaintCasimir(config: Partial<SaintCasimirConfig> = {}): SaintCasimirResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const [cx, cz] = cfg.center;
  const ground = cfg.heightFn ?? (() => 0);
  const lit = cfg.litRatio ?? 0;
  const rng = makeRng(1847);

  const group = new THREE.Group();
  group.name = 'village_saint_casimir';

  const angle = cfg.roadAngle;
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  const perpX = -dirZ;
  const perpZ = dirX;

  const buildings: THREE.Group[] = [];
  const pois: SaintCasimirResult['pointsOfInterest'] = [];
  const walkableAreas: SaintCasimirResult['walkableAreas'] = [];

  const gorge = buildGorgeSainteAnne(320, cfg.gorgeAngle);
  const gorgeX = cx + perpX * 95;
  const gorgeZ = cz + perpZ * 95;
  gorge.position.set(gorgeX, ground(gorgeX, gorgeZ), gorgeZ);
  group.add(gorge);

  const pont = buildPontDeFer(46);
  const pontX = gorgeX + dirX * 30;
  const pontZ = gorgeZ + dirZ * 30;
  pont.position.set(pontX, ground(pontX, pontZ) - 1, pontZ);
  pont.rotation.y = cfg.gorgeAngle + Math.PI / 2;
  group.add(pont);
  buildings.push(pont);

  pois.push({
    id: 'saint_casimir_pont_fer',
    name: 'Pont de fer de Saint-Casimir',
    type: 'pont_fer',
    position: new THREE.Vector3(pontX, 0, pontZ),
    radius: 26,
  });

  const marmites = buildMarmitesDeGeants(9);
  const marmX = gorgeX + dirX * -75 + perpX * 12;
  const marmZ = gorgeZ + dirZ * -75 + perpZ * 12;
  marmites.position.set(marmX, ground(marmX, marmZ) - 6.5, marmZ);
  marmites.rotation.y = cfg.gorgeAngle;
  group.add(marmites);
  buildings.push(marmites);

  pois.push({
    id: 'saint_casimir_marmites',
    name: 'Marmites de géants',
    type: 'site_geologique',
    position: new THREE.Vector3(marmX, 0, marmZ),
    radius: 34,
  });

  const trou = buildTrouDuDiable();
  const trouX = cx + perpX * 165 + dirX * 55;
  const trouZ = cz + perpZ * 165 + dirZ * 55;
  trou.position.set(trouX, ground(trouX, trouZ), trouZ);
  trou.rotation.y = cfg.gorgeAngle - 0.6;
  group.add(trou);
  buildings.push(trou);

  pois.push({
    id: 'saint_casimir_trou_diable',
    name: 'Le Trou du Diable',
    type: 'grotte',
    position: new THREE.Vector3(trouX, 0, trouZ),
    radius: 22,
  });

  const eglise = buildBuilding('eglise', { seed: 1847, litRatio: lit });
  eglise.scale.setScalar(0.95);
  const egX = cx + perpX * 30;
  const egZ = cz + perpZ * 30;
  eglise.position.set(egX, ground(egX, egZ), egZ);
  eglise.rotation.y = -angle + Math.PI;
  group.add(eglise);
  buildings.push(eglise);

  pois.push({
    id: 'saint_casimir_eglise',
    name: 'Église Saint-Casimir',
    type: 'church',
    position: new THREE.Vector3(egX, 0, egZ),
    radius: 21,
  });

  const presbytere = buildBuilding('presbytere', { seed: 1848, litRatio: lit });
  const prX = egX + dirX * 34;
  const prZ = egZ + dirZ * 34;
  presbytere.position.set(prX, ground(prX, prZ), prZ);
  presbytere.rotation.y = -angle + Math.PI;
  group.add(presbytere);
  buildings.push(presbytere);

  const coreCount = 22;
  const spacing = 27;

  for (let i = 0; i < coreCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const idx = Math.floor(i / 2);
    const along = (idx - coreCount / 4) * spacing + (rng() - 0.5) * 7;
    const setback = 16 + rng() * 8;

    const px = cx + dirX * along + perpX * side * setback;
    const pz = cz + dirZ * along + perpZ * side * setback;

    const type = rng() > 0.72 ? 'maison_mansardee' : 'maison_canadienne';
    const house = buildBuilding(type as any, {
      seed: 1847 + i * 37,
      litRatio: lit,
    });

    const wallColors = SAINT_CASIMIR_PROFILE.wallPalette;
    const roofColors = SAINT_CASIMIR_PROFILE.roofPalette;
    tint(
      house,
      wallColors[Math.floor(rng() * wallColors.length)],
      roofColors[Math.floor(rng() * roofColors.length)]
    );

    house.position.set(px, ground(px, pz), pz);
    house.rotation.y = -angle + (side > 0 ? Math.PI : 0);
    group.add(house);
    buildings.push(house);
  }

  walkableAreas.push({
    minX: cx - (spacing * coreCount) / 3,
    minZ: cz - 40,
    maxX: cx + (spacing * coreCount) / 3,
    maxZ: cz + 40,
  });

  const dep = buildBuilding('depanneur', { seed: 1849, litRatio: lit });
  const depX = cx + dirX * -72 + perpX * 26;
  const depZ = cz + dirZ * -72 + perpZ * 26;
  dep.position.set(depX, ground(depX, depZ), depZ);
  dep.rotation.y = -angle + Math.PI;
  group.add(dep);
  buildings.push(dep);

  pois.push({
    id: 'saint_casimir_depanneur',
    name: 'Dépanneur de Saint-Casimir',
    type: 'shop',
    position: new THREE.Vector3(depX, 0, depZ),
    radius: 14,
  });

  const ecole = buildBuilding('ecole', { seed: 1850, litRatio: lit });
  const ecX = cx + dirX * 78 + perpX * -28;
  const ecZ = cz + dirZ * 78 + perpZ * -28;
  ecole.position.set(ecX, ground(ecX, ecZ), ecZ);
  ecole.rotation.y = -angle;
  group.add(ecole);
  buildings.push(ecole);

  pois.push({
    id: 'saint_casimir_ecole',
    name: 'École de Saint-Casimir',
    type: 'school',
    position: new THREE.Vector3(ecX, 0, ecZ),
    radius: 15,
  });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rng() * 0.6;
    const dist = 200 + rng() * 190;
    const fx = cx + Math.cos(a) * dist;
    const fz = cz + Math.sin(a) * dist;

    const farmhouse = buildBuilding('maison_canadienne', {
      seed: 1860 + i * 13,
      litRatio: lit,
    });
    tint(farmhouse, QC_PALETTE.boisBlanc, QC_PALETTE.toleRouge);
    farmhouse.position.set(fx, ground(fx, fz), fz);
    farmhouse.rotation.y = rng() * Math.PI * 2;
    group.add(farmhouse);
    buildings.push(farmhouse);

    const barn = buildBuilding('grange', { seed: 1870 + i * 17 });
    const ba = rng() * Math.PI * 2;
    const bx = fx + Math.cos(ba) * 36;
    const bz = fz + Math.sin(ba) * 36;
    barn.position.set(bx, ground(bx, bz), bz);
    barn.rotation.y = rng() * Math.PI * 2;
    group.add(barn);
    buildings.push(barn);

    for (let f = 0; f < 3; f++) {
      const size = 90 + rng() * 70;
      const color = SAINT_CASIMIR_PROFILE.fieldColors[Math.floor(rng() * SAINT_CASIMIR_PROFILE.fieldColors.length)];
      const fieldGeo = geoLib.getPlane(size, size * 0.68);
      const field = new THREE.Mesh(fieldGeo, matLib.get(color, 1.0, 0.0, true));
      
      field.rotation.x = -Math.PI / 2;
      field.rotation.z = rng() * Math.PI;
      const px = fx + (rng() - 0.5) * 140;
      const pz = fz + (rng() - 0.5) * 140;
      field.position.set(px, ground(px, pz) + 0.025, pz);
      field.receiveShadow = true;
      group.add(field);
    }
  }

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.8 + rng() * 0.9;
    const dist = 270 + rng() * 170;
    const sx = cx + Math.cos(a) * dist;
    const sz = cz + Math.sin(a) * dist;

    const shack = buildBuilding('cabane_sucre', {
      seed: 1880 + i * 23,
      litRatio: lit,
    });
    shack.position.set(sx, ground(sx, sz), sz);
    shack.rotation.y = rng() * Math.PI * 2;
    group.add(shack);
    buildings.push(shack);

    if (i === 0) {
      pois.push({
        id: 'saint_casimir_cabane',
        name: 'Cabane à sucre de Saint-Casimir',
        type: 'sugar_shack',
        position: new THREE.Vector3(sx, 0, sz),
        radius: 16,
      });
    }

    addErabliere(group, sx, sz, 82, 36, rng, ground);
  }

  addVegetation(group, cx, cz, 190, 62, rng, ground);
  addCimetiere(group, egX - perpX * 27, egZ - perpZ * 27, angle, rng, ground);

  const center = new THREE.Vector3(cx, ground(cx, cz), cz);
  return {
    group,
    center,
    radius: 380,
    buildings,
    pointsOfInterest: pois,
    walkableAreas,
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  HELPERS & DÉCORATION
// ─────────────────────────────────────────────────────────────────────────

function tint(building: THREE.Group, wallColor: number, roofColor: number): void {
  const wallMat = matLib.get(wallColor, 0.88);
  const roofMat = matLib.get(roofColor, 0.75, 0.15);
  let bodyTinted = false;

  building.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || obj.userData.isWindow) return;
    const params = (obj.geometry as any).parameters;
    if (!params || !params.width) return;
    const vol = (params.width ?? 1) * (params.height ?? 1) * (params.depth ?? 1);
    if (vol > 60 && !bodyTinted) {
      obj.material = wallMat;
      bodyTinted = true;
    }
  });

  building.children.forEach((child) => {
    if (child instanceof THREE.Group && child.children.length >= 2) {
      child.children.forEach((panel) => {
        if (panel instanceof THREE.Mesh && panel.rotation.z !== 0) {
          panel.material = roofMat;
        }
      });
    }
  });
}

function addErabliere(
  parent: THREE.Group,
  cx: number,
  cz: number,
  spread: number,
  count: number,
  rng: () => number,
  ground: (x: number, z: number) => number
): void {
  const trunkGeo = geoLib.getCylinder(0.3, 0.42, 6, 7);
  const trunkInst = new THREE.InstancedMesh(trunkGeo, matLib.get(0x6a5040, 0.98), count);
  const leafGeo = geoLib.getSphere(3.4, 7, 6);
  const leafInst = new THREE.InstancedMesh(leafGeo, matLib.get(0xc06830, 1.0, 0.0), count);

  const dummy = new THREE.Object3D();
  const cols = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = cx + (col - cols / 2) * (spread / cols) + (rng() - 0.5) * 6;
    const z = cz + (row - cols / 2) * (spread / cols) + (rng() - 0.5) * 6;
    const y = ground(x, z);
    const s = 0.9 + rng() * 0.4;

    dummy.position.set(x, y + 3 * s, z);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, y + 7.5 * s, z);
    dummy.updateMatrix();
    leafInst.setMatrixAt(i, dummy.matrix);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  leafInst.instanceMatrix.needsUpdate = true;
  trunkInst.castShadow = true;
  leafInst.castShadow = true;
  parent.add(trunkInst, leafInst);
}

function addVegetation(
  parent: THREE.Group,
  cx: number,
  cz: number,
  spread: number,
  count: number,
  rng: () => number,
  ground: (x: number, z: number) => number
): void {
  const trunkGeo = geoLib.getCylinder(0.22, 0.32, 4.5, 6);
  const trunkInst = new THREE.InstancedMesh(trunkGeo, matLib.get(0x5a4030, 0.98), count);
  
  const leafGeo = geoLib.getSphere(2.6, 7, 6);
  const leafInst = new THREE.InstancedMesh(leafGeo, matLib.get(0x3a6238, 1.0, 0.0), count);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = 60 + rng() * spread;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const y = ground(x, z);
    const s = 0.7 + rng() * 0.8;

    dummy.position.set(x, y + 2.2 * s, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = rng() * Math.PI;
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, y + 5.2 * s, z);
    dummy.updateMatrix();
    leafInst.setMatrixAt(i, dummy.matrix);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  leafInst.instanceMatrix.needsUpdate = true;
  trunkInst.castShadow = true;
  leafInst.castShadow = true;
  parent.add(trunkInst, leafInst);
}

function addCimetiere(
  parent: THREE.Group,
  cx: number,
  cz: number,
  angle: number,
  rng: () => number,
  ground: (x: number, z: number) => number
): void {
  const stoneGeo = geoLib.getBox(0.55, 1.0, 0.16);
  const count = 36;
  const inst = new THREE.InstancedMesh(stoneGeo, matLib.get(0xa8a49c, 0.95), count);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const lx = (col - 4) * 2.4;
    const lz = (row - 2.5) * 2.8;
    const x = cx + lx * Math.cos(angle) - lz * Math.sin(angle);
    const z = cz + lx * Math.sin(angle) + lz * Math.cos(angle);
    dummy.position.set(x, ground(x, z) + 0.5, z);
    dummy.rotation.set(0, -angle + (rng() - 0.5) * 0.1, (rng() - 0.5) * 0.05);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  parent.add(inst);

  const crossMat = matLib.get(0x8a8680, 0.9);
  const cv = new THREE.Mesh(geoLib.getBox(0.22, 3.2, 0.22), crossMat);
  cv.position.set(cx, ground(cx, cz) + 1.6, cz);
  cv.castShadow = true;
  
  const ch = new THREE.Mesh(geoLib.getBox(1.5, 0.22, 0.22), crossMat);
  ch.position.set(cx, ground(cx, cz) + 2.5, cz);
  parent.add(cv, ch);
}

// ─────────────────────────────────────────────────────────────────────────
//  MOTEUR D'ANIMATION (LACS ET RAPIDES)
// ─────────────────────────────────────────────────────────────────────────

export function animateSaintCasimir(root: THREE.Object3D, elapsed: number, delta: number): void {
  root.traverse((obj) => {
    if (obj.userData.isMarmiteWater) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.metalness = 0.6 + Math.sin(elapsed * 0.7 + obj.position.x) * 0.12;
      }
    }
    if (obj.userData.isFoam) {
      const mat = (obj as THREE.InstancedMesh).material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.opacity = 0.7 + Math.sin(elapsed * 4.5) * 0.18;
        mat.transparent = true;
      }
    }
    if (obj.userData.isGorgeRiver) {
      const mesh = obj as THREE.Mesh;
      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const base = -7.4; // -gorgeDepth + 1.6
        pos.setY(i, base + Math.sin(x * 0.09 + elapsed * 2.2) * 0.18 + Math.cos(z * 0.11 - elapsed * 1.6) * 0.12);
      }
      pos.needsUpdate = true;
    }
  });
}

export function setSaintCasimirNightMode(root: THREE.Object3D, isNight: boolean): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.PointLight && obj.userData.isCampfireLight) {
      obj.intensity = isNight ? 2.2 : 0;
    }
    if (obj.userData.isEmbers) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = isNight ? 1.1 : 0.25;
    }
  });
}

/**
 * ⚡ Nettoyage complet du GPU lors de la fermeture de la scène de Saint-Casimir
 */
export function disposeSaintCasimir(): void {
  localDisposables.forEach((g) => g.dispose());
  localDisposables.length = 0;
}