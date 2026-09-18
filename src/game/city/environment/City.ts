// ═══════════════════════════════════════════════════════════════════════════
//  CITY — GÉNÉRATEUR DE VILLE PROCÉDURALE (GPU OPTIMISÉ)
//  src/world/city/City.ts
//  Grille urbaine · Escalier colimaçon · Penthouses · 0 Fuite VRAM ♻️
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { matLib, geoLib, QC_PALETTE, buildBuilding } from '../QuebecArchitecture';

// ─────────────────────────────────────────────────────────────────────────
//  TYPES ET INTERFACES
// ─────────────────────────────────────────────────────────────────────────

export type StreetClass = 'artere' | 'collectrice' | 'locale' | 'ruelle';

export type LotUse =
  | 'residentiel_bas'      // Maison unifamiliale, duplex
  | 'residentiel_moyen'    // Immeuble 3-4 étages (Appartements)
  | 'residentiel_haut'     // Tour d'appartements + Penthouse
  | 'commercial'           // Rez-de-chaussée commercial
  | 'mixte'                // Commerce au RdC, appartements au-dessus
  | 'institutionnel'       // École, caisse populaire
  | 'hotel'
  | 'parc'
  | 'stationnement'
  | 'vide';

export interface CityLot {
  id: string;
  col: number;
  row: number;
  use: LotUse;
  center: THREE.Vector3;
  width: number;
  depth: number;
  frontAngle: number;
  isCorner: boolean;
  floors: number;
  building?: THREE.Group;
  hasInterior: boolean;
  entrance?: THREE.Vector3;
  units?: CityUnit[];
}

export interface CityUnit {
  id: string;
  lotId: string;
  floor: number;
  unitNumber: string;      // '201', '302', 'PH'
  type: 'studio' | '3_et_demi' | '4_et_demi' | '5_et_demi' | 'penthouse' | 'chambre_hotel';
  rooms: number;
  areaM2: number;
  rentPerDay: number;
  purchasePrice: number | null;
  ownerId: string | null;
  interiorAnchor: THREE.Vector3;
}

export interface CityConfig {
  center: [number, number];
  gridSize: number;
  blockSize: number;
  blockVariation: number;
  streetWidth: number;
  sidewalkWidth: number;
  angle: number;
  density: number;
  seed: number;
  heightFn?: (x: number, z: number) => number;
  litRatio?: number;
  villageName?: string;
}

export const DEFAULT_CITY: CityConfig = {
  center: [0, 0],
  gridSize: 12,
  blockSize: 46,
  blockVariation: 0.22,
  streetWidth: 11,
  sidewalkWidth: 2.4,
  angle: 0,
  density: 1.0,
  seed: 1867,
  litRatio: 0,
};

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  PALETTE DE COULEURS URBAINES
// ─────────────────────────────────────────────────────────────────────────

const CITY_PALETTE = {
  asphalte: 0x24262c,
  trottoir: 0x94a3b8,
  bordure: 0x64748b,
  gazon: 0x3f6212,
  briqueRouge: 0x991b1b,
  briqueBeige: 0xd97706,
  briqueGrise: 0x475569,
  stuc: 0xf1f5f9,
  beton: 0x64748b,
  vitrine: 0x0284c7,
  fenetreEclairee: 0xfef08a,
  toitPlat: 0x0f172a,
  balconMetal: 0x334155,
  ligneRue: 0xfacc15,
};

const FACADE_COLORS = [
  CITY_PALETTE.briqueRouge, CITY_PALETTE.briqueBeige,
  CITY_PALETTE.briqueGrise, CITY_PALETTE.stuc, CITY_PALETTE.beton,
];

// ─── SCRATCH VECTORS (0 Allocation RAM à la frame ♻️) ─────────────────────
const _scratchV3 = new THREE.Vector3();

// ═══════════════════════════════════════════════════════════════════════════
//  RÉSEAU DE VOIES URBAINES (RUES & TROTTOIRS)
// ═══════════════════════════════════════════════════════════════════════════

interface StreetLine {
  id: string;
  name: string;
  streetClass: StreetClass;
  start: THREE.Vector3;
  end: THREE.Vector3;
  width: number;
}

function generateStreetGrid(
  cfg: CityConfig, rng: () => number
): { streets: StreetLine[]; colOffsets: number[]; rowOffsets: number[] } {
  const streets: StreetLine[] = [];
  const n = cfg.gridSize;

  const colOffsets: number[] = [0];
  const rowOffsets: number[] = [0];

  for (let i = 0; i < n; i++) {
    const varW = 1 + (rng() - 0.5) * 2 * cfg.blockVariation;
    const varD = 1 + (rng() - 0.5) * 2 * cfg.blockVariation;
    colOffsets.push(colOffsets[i] + cfg.blockSize * varW + cfg.streetWidth);
    rowOffsets.push(rowOffsets[i] + cfg.blockSize * varD + cfg.streetWidth);
  }

  const totalW = colOffsets[n];
  const totalD = rowOffsets[n];

  const shiftX = -totalW / 2;
  const shiftZ = -totalD / 2;

  const cos = Math.cos(cfg.angle), sin = Math.sin(cfg.angle);
  const [cx, cz] = cfg.center;

  const toWorld = (lx: number, lz: number) =>
    new THREE.Vector3(
      cx + (lx + shiftX) * cos - (lz + shiftZ) * sin,
      0,
      cz + (lx + shiftX) * sin + (lz + shiftZ) * cos
    );

  const nsNames = [
    'rue Notre-Dame', 'rue Saint-Jacques', 'rue Principale',
    'avenue des Érables', 'rue Sainte-Anne', 'rue du Moulin',
    'rue de l\'Église', 'avenue Dupont', 'rue de la Reine',
  ];
  const ewNames = [
    'boulevard du Roy', 'rue de la Fabrique', 'rue Frontenac',
    'avenue Papineau', 'rue Cartier', 'rue de la SAAQ',
  ];

  for (let i = 0; i <= n; i++) {
    const isMain = i === Math.floor(n / 2);
    const isCollector = i % 4 === 0;
    const cls: StreetClass = isMain ? 'artere' : isCollector ? 'collectrice' : 'locale';
    const width = isMain ? cfg.streetWidth * 1.5 : isCollector ? cfg.streetWidth * 1.15 : cfg.streetWidth;

    streets.push({
      id: `ns_${i}`,
      name: nsNames[i % nsNames.length],
      streetClass: cls,
      start: toWorld(colOffsets[i], -cfg.streetWidth),
      end: toWorld(colOffsets[i], totalD + cfg.streetWidth),
      width,
    });
  }

  for (let i = 0; i <= n; i++) {
    const isMain = i === Math.floor(n / 2);
    const isCollector = i % 4 === 0;
    const cls: StreetClass = isMain ? 'artere' : isCollector ? 'collectrice' : 'locale';
    const width = isMain ? cfg.streetWidth * 1.5 : isCollector ? cfg.streetWidth * 1.15 : cfg.streetWidth;

    streets.push({
      id: `ew_${i}`,
      name: ewNames[i % ewNames.length],
      streetClass: cls,
      start: toWorld(-cfg.streetWidth, rowOffsets[i]),
      end: toWorld(totalW + cfg.streetWidth, rowOffsets[i]),
      width,
    });
  }

  return { streets, colOffsets, rowOffsets };
}

function buildStreets(streets: StreetLine[], ground: (x: number, z: number) => number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'rues';

  const asphaltMat = matLib.get(CITY_PALETTE.asphalte, 0.96);
  const sidewalkMat = matLib.get(CITY_PALETTE.trottoir, 0.94);
  const curbMat = matLib.get(CITY_PALETTE.bordure, 0.92);
  const lineMat = matLib.get(CITY_PALETTE.ligneRue, 0.7);

  for (const st of streets) {
    _scratchV3.subVectors(st.end, st.start);
    const length = _scratchV3.length();
    _scratchV3.normalize();
    const angle = Math.atan2(_scratchV3.x, _scratchV3.z);
    
    const mid = new THREE.Vector3().addVectors(st.start, st.end).multiplyScalar(0.5);
    const y = ground(mid.x, mid.z);

    // Asphalte chaussée (0 Leak)
    const roadGeo = geoLib.getPlane(st.width, length);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = -angle;
    road.position.set(mid.x, y + 0.02, mid.z);
    road.receiveShadow = true;
    g.add(road);

    // Trottoirs des deux côtés (0 Leak)
    const sw = 2.4;
    const sidewalkGeo = geoLib.getBox(sw, 0.16, length);
    const curbGeo = geoLib.getBox(0.22, 0.2, length);

    for (const side of [-1, 1]) {
      const offset = (st.width / 2 + sw / 2);
      const px = mid.x + Math.cos(angle) * offset * side;
      const pz = mid.z - Math.sin(angle) * offset * side;

      const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
      sidewalk.rotation.y = -angle;
      sidewalk.position.set(px, y + 0.09, pz);
      sidewalk.receiveShadow = true;
      g.add(sidewalk);

      // Bordure
      const curbX = mid.x + Math.cos(angle) * (st.width / 2) * side;
      const curbZ = mid.z - Math.sin(angle) * (st.width / 2) * side;
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.rotation.y = -angle;
      curb.position.set(curbX, y + 0.11, curbZ);
      g.add(curb);
    }

    // Ligne centrale en tirets jaunes (Caisse/Artere)
    if (st.streetClass === 'artere' || st.streetClass === 'collectrice') {
      const dashLen = 2.6;
      const gapLen = 3.4;
      const count = Math.floor(length / (dashLen + gapLen));
      if (count > 0) {
        const dashGeo = geoLib.getPlane(0.14, dashLen);
        const inst = new THREE.InstancedMesh(dashGeo, lineMat, count);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
          const t = (i * (dashLen + gapLen) + dashLen / 2) / length;
          const p = new THREE.Vector3().lerpVectors(st.start, st.end, t);
          dummy.position.set(p.x, y + 0.035, p.z);
          dummy.rotation.y = -angle;
          dummy.updateMatrix();
          inst.setMatrixAt(i, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
        g.add(inst);
      }
    }
  }

  return g;
}

// ─────────────────────────────────────────────────────────────────────────
//  BÂTIMENTS URBAINS (COMPATIBLES DRIZZLE UNITS)
// ─────────────────────────────────────────────────────────────────────────

function buildAppartements(
  width: number, depth: number, floors: number,
  rng: () => number, litRatio: number
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'immeuble_appartements';

  const floorH = 3.1;
  const totalH = floors * floorH;
  const facadeColor = FACADE_COLORS[Math.floor(rng() * FACADE_COLORS.length)];
  const wallMat = matLib.get(facadeColor, 0.92);

  // Corps principal (0 Leak)
  const bodyGeo = geoLib.getBox(width, totalH, depth);
  const body = new THREE.Mesh(bodyGeo, wallMat);
  body.position.y = totalH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Fondation béton (0 Leak)
  const baseGeo = geoLib.getBox(width + 0.3, 0.9, depth + 0.3);
  const base = new THREE.Mesh(baseGeo, matLib.get(CITY_PALETTE.beton, 0.95));
  base.position.y = 0.45;
  g.add(base);

  // Toit plat (0 Leak)
  const parapetGeo = geoLib.getBox(width + 0.4, 0.7, depth + 0.4);
  const parapet = new THREE.Mesh(parapetGeo, matLib.get(CITY_PALETTE.toitPlat, 0.95));
  parapet.position.y = totalH + 0.25;
  parapet.castShadow = true;
  g.add(parapet);

  // Fenêtres
  const winPerFloor = Math.max(2, Math.floor(width / 3));
  const glassOn = matLib.getGlass(true);
  const glassOff = matLib.getGlass(false);
  const frameMat = matLib.get(0xf0ece0, 0.85);

  const windowGeo = geoLib.getPlane(1.15, 1.5);
  const frameGeo = geoLib.getBox(1.3, 1.65, 0.06);

  for (let f = 0; f < floors; f++) {
    const y = 1.2 + f * floorH;

    for (let w = 0; w < winPerFloor; w++) {
      const x = -width / 2 + (w + 0.5) * (width / winPerFloor);
      const lit = rng() < litRatio;
      const activeGlassMat = lit ? glassOn : glassOff;

      for (const side of [1, -1]) {
        const win = new THREE.Mesh(windowGeo, activeGlassMat);
        win.position.set(x, y, side * (depth / 2 + 0.03));
        if (side < 0) win.rotation.y = Math.PI;
        win.userData.isWindow = true;
        win.userData.isGlassMesh = true;
        g.add(win);

        // Cadre
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(x, y, side * (depth / 2 + 0.01));
        g.add(frame);
      }
    }
  }

  // Escalier métallique en colimaçon (0 Leak)
  if (floors >= 2 && floors <= 4 && rng() > 0.35) {
    const stair = new THREE.Group();
    const metalMat = matLib.get(CITY_PALETTE.balconMetal, 0.55, 0.7);

    const steps = floors * 14;
    const stepGeo = geoLib.getBox(1.1, 0.05, 0.28);
    const stepInst = new THREE.InstancedMesh(stepGeo, metalMat, steps);
    const dummy = new THREE.Object3D();

    const radius = 1.5;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const a = t * Math.PI * 2 * (floors * 0.85);
      dummy.position.set(Math.cos(a) * radius, 0.3 + t * (floors * floorH - 0.6), Math.sin(a) * radius);
      dummy.rotation.y = -a;
      dummy.updateMatrix();
      stepInst.setMatrixAt(i, dummy.matrix);
    }
    stepInst.instanceMatrix.needsUpdate = true;
    stepInst.castShadow = true;
    stair.add(stepInst);

    // Mât de soutien
    const poleGeo = geoLib.getCylinder(0.09, 0.09, floors * floorH, 8);
    const pole = new THREE.Mesh(poleGeo, metalMat);
    pole.position.y = (floors * floorH) / 2;
    stair.add(pole);

    stair.position.set(width / 2 + 1.6, 0, depth * 0.22);
    g.add(stair);
  }

  // Porte d'entrée
  const doorMat = matLib.get(0x3a2e22, 0.8);
  const doorGeo = geoLib.getBox(1.4, 2.3, 0.12);
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 1.15 + 0.9, depth / 2 + 0.07);
  g.add(door);

  g.userData.entranceLocal = new THREE.Vector3(0, 0, depth / 2 + 2.2);
  return g;
}

function buildTourResidentielle(
  width: number, depth: number, floors: number,
  rng: () => number, litRatio: number
): THREE.Group {
  const g = buildAppartements(width, depth, floors, rng, litRatio);
  g.name = 'tour_residentielle';

  const floorH = 3.1;
  const totalH = floors * floorH;

  const phInset = 2.2;
  const phW = width - phInset * 2;
  const phD = depth - phInset * 2;
  const phH = 3.6;

  const penthouseGeo = geoLib.getBox(phW, phH, phD);
  const penthouse = new THREE.Mesh(penthouseGeo, matLib.get(CITY_PALETTE.stuc, 0.88));
  penthouse.position.y = totalH + 0.6 + phH / 2;
  penthouse.castShadow = true;
  g.add(penthouse);

  // Baies vitrées penthouse
  const phGlassMat = matLib.getGlass(litRatio > 0.4);
  const planeWGeo = geoLib.getPlane(phW * 0.85, phH * 0.72);
  const planeDGeo = geoLib.getPlane(phD * 0.85, phH * 0.72);

  for (const side of [1, -1]) {
    const glass = new THREE.Mesh(planeWGeo, phGlassMat);
    glass.position.set(0, totalH + 0.6 + phH * 0.5, side * (phD / 2 + 0.03));
    if (side < 0) glass.rotation.y = Math.PI;
    glass.userData.isWindow = true;
    glass.userData.isGlassMesh = true;
    g.add(glass);
  }
  for (const side of [1, -1]) {
    const glass = new THREE.Mesh(planeDGeo, phGlassMat);
    glass.position.set(side * (phW / 2 + 0.03), totalH + 0.6 + phH * 0.5, 0);
    glass.rotation.y = side * Math.PI / 2;
    glass.userData.isWindow = true;
    glass.userData.isGlassMesh = true;
    g.add(glass);
  }

  // Toit Penthouse
  const phRoofGeo = geoLib.getBox(phW + 0.6, 0.3, phD + 0.6);
  const phRoof = new THREE.Mesh(phRoofGeo, matLib.get(CITY_PALETTE.toitPlat, 0.95));
  phRoof.position.y = totalH + 0.6 + phH + 0.15;
  phRoof.castShadow = true;
  g.add(phRoof);

  g.userData.hasPenthouse = true;
  g.userData.penthouseY = totalH + 0.6;
  return g;
}

function buildMixte(
  width: number, depth: number, floors: number,
  rng: () => number, litRatio: number
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'batiment_mixte';

  const groundH = 4.2;
  const floorH = 3.1;
  const upperH = (floors - 1) * floorH;
  const totalH = groundH + upperH;

  const facadeColor = FACADE_COLORS[Math.floor(rng() * FACADE_COLORS.length)];

  // Rez-de-chaussée commercial
  const groundFloor = new THREE.Mesh(
    geoLib.getBox(width, groundH, depth),
    matLib.get(CITY_PALETTE.beton, 0.9)
  );
  groundFloor.position.y = groundH / 2;
  groundFloor.castShadow = true;
  groundFloor.receiveShadow = true;
  g.add(groundFloor);

  // Étages résidentiels
  const upper = new THREE.Mesh(
    geoLib.getBox(width, upperH, depth),
    matLib.get(facadeColor, 0.92)
  );
  upper.position.y = groundH + upperH / 2;
  upper.castShadow = true;
  g.add(upper);

  // Vitrines RdC
  const vitrineMat = matLib.getGlass(litRatio > 0.3);
  const vitrine = new THREE.Mesh(geoLib.getPlane(width * 0.82, 2.6), vitrineMat);
  vitrine.position.set(0, 2.2, depth / 2 + 0.04);
  vitrine.userData.isWindow = true;
  vitrine.userData.isGlassMesh = true;
  g.add(vitrine);

  // Toit Plat Parapet
  const parapetGeo = geoLib.getBox(width + 0.4, 0.65, depth + 0.4);
  const parapet = new THREE.Mesh(parapetGeo, matLib.get(CITY_PALETTE.toitPlat, 0.95));
  parapet.position.y = totalH + 0.2;
  g.add(parapet);

  g.userData.entranceLocal = new THREE.Vector3(-width * 0.38, 0, depth / 2 + 1.5);
  return g;
}

function buildHotel(
  width: number, depth: number, floors: number, litRatio: number
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'hotel';

  const lobbyH = 5.2;
  const floorH = 3.0;
  const upperH = (floors - 1) * floorH;
  const totalH = lobbyH + upperH;

  // Lobby d'accueil
  const lobby = new THREE.Mesh(
    geoLib.getBox(width, lobbyH, depth),
    matLib.get(CITY_PALETTE.beton, 0.85)
  );
  lobby.position.y = lobbyH / 2;
  lobby.castShadow = true;
  lobby.receiveShadow = true;
  g.add(lobby);

  const lobbyGlassMat = matLib.getGlass(litRatio > 0.2);
  const lobbyGlass = new THREE.Mesh(geoLib.getPlane(width * 0.88, lobbyH * 0.72), lobbyGlassMat);
  lobbyGlass.position.set(0, lobbyH * 0.48, depth / 2 + 0.04);
  lobbyGlass.userData.isWindow = true;
  lobbyGlass.userData.isGlassMesh = true;
  g.add(lobbyGlass);

  // Tour des chambres
  const tower = new THREE.Mesh(
    geoLib.getBox(width * 0.94, upperH, depth * 0.94),
    matLib.get(QC_PALETTE.boisCreme, 0.9)
  );
  tower.position.y = lobbyH + upperH / 2;
  tower.castShadow = true;
  g.add(tower);

  // Marquise béton
  const canopyMat = matLib.get(0x1e293b, 0.6, 0.3);
  const canopy = new THREE.Mesh(geoLib.getBox(width * 0.6, 0.35, 5), canopyMat);
  canopy.position.set(0, 4.2, depth / 2 + 2.5);
  canopy.castShadow = true;
  g.add(canopy);

  // Éclairage sous-marquise
  const canopyLight = new THREE.Mesh(geoLib.getBox(width * 0.55, 0.08, 0.4), matLib.getGlass(true));
  canopyLight.position.set(0, 4.0, depth / 2 + 2.5);
  canopyLight.userData.isWindow = true;
  g.add(canopyLight);

  // Enseigne
  const signMat = matLib.getEmissive(0xb91c1c, 0xef4444, 1.2);
  const vertSign = new THREE.Mesh(geoLib.getBox(1.4, upperH * 0.55, 0.3), signMat);
  vertSign.position.set(width / 2 - 0.5, lobbyH + upperH * 0.55, depth / 2 + 0.25);
  g.add(vertSign);

  // Fenêtres des chambres
  const glassLit = matLib.getGlass(true);
  const glassDark = matLib.getGlass(false);
  const roomsPerFloor = Math.max(4, Math.floor(width / 3.2));

  for (let f = 0; f < floors - 1; f++) {
    const y = lobbyH + 1.4 + f * floorH;
    for (let r = 0; r < roomsPerFloor; r++) {
      const x = -width * 0.47 + (r + 0.5) * ((width * 0.94) / roomsPerFloor);
      const lit = Math.random() < litRatio;

      for (const side of [1, -1]) {
        const win = new THREE.Mesh(geoLib.getPlane(1.2, 1.6), lit ? glassLit : glassDark);
        win.position.set(x, y, side * (depth * 0.47 + 0.03));
        if (side < 0) win.rotation.y = Math.PI;
        win.userData.isWindow = true;
        win.userData.isGlassMesh = true;
        g.add(win);
      }
    }
  }

  g.userData.entranceLocal = new THREE.Vector3(0, 0, depth / 2 + 4);
  g.userData.isHotel = true;
  return g;
}

// ─────────────────────────────────────────────────────────────────────────
//  PARC URBAIN & MOBILIER
// ─────────────────────────────────────────────────────────────────────────

function buildParc(width: number, depth: number, rng: () => number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'parc_central';

  const lawn = new THREE.Mesh(geoLib.getPlane(width, depth), matLib.get(CITY_PALETTE.gazon, 1.0));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = 0.03;
  lawn.receiveShadow = true;
  g.add(lawn);

  // Allées en béton
  const pathMat = matLib.get(0x64748b, 0.95);
  const pathW = new THREE.Mesh(geoLib.getPlane(width, 3), pathMat);
  pathW.rotation.x = -Math.PI / 2;
  pathW.position.y = 0.05;
  pathW.receiveShadow = true;
  
  const pathD = new THREE.Mesh(geoLib.getPlane(3, depth), pathMat);
  pathD.rotation.x = -Math.PI / 2;
  pathD.position.y = 0.05;
  pathD.receiveShadow = true;
  g.add(pathW, pathD);

  // Kiosque à musique de village
  const gazebo = new THREE.Group();
  const woodMat = matLib.get(QC_PALETTE.boisBlanc, 0.9);
  const roofMat = matLib.get(QC_PALETTE.toleVerte, 0.75, 0.2);

  const floor = new THREE.Mesh(geoLib.getCylinder(3.4, 3.4, 0.4, 8), matLib.get(0x78350f, 0.94));
  floor.position.y = 0.4;
  floor.receiveShadow = true;
  gazebo.add(floor);

  const colGeo = geoLib.getCylinder(0.1, 0.12, 3, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(colGeo, woodMat);
    col.position.set(Math.cos(a) * 3, 2.1, Math.sin(a) * 3);
    col.castShadow = true;
    gazebo.add(col);
  }

  const gazeboRoof = new THREE.Mesh(geoLib.getCone(4.2, 2.2, 8), roofMat);
  gazeboRoof.position.y = 4.7;
  gazeboRoof.castShadow = true;
  gazebo.add(gazeboRoof);

  g.add(gazebo);
  return g;
}

function addStreetFurniture(
  parent: THREE.Group, streets: StreetLine[],
  rng: () => number, ground: (x: number, z: number) => number
): void {
  const lampMat = matLib.get(0x1e293b, 0.6, 0.6);
  const bulbMat = matLib.getGlass(true);

  let totalLamps = 0;
  for (const st of streets) {
    totalLamps += Math.floor(st.start.distanceTo(st.end) / 26);
  }
  if (totalLamps === 0) return;

  const poleGeo = geoLib.getCylinder(0.09, 0.12, 7, 8);
  const armGeo = geoLib.getBox(0.1, 0.1, 1.6);
  const headGeo = geoLib.getBox(0.4, 0.14, 0.8);

  const poleInst = new THREE.InstancedMesh(poleGeo, lampMat, totalLamps);
  const armInst = new THREE.InstancedMesh(armGeo, lampMat, totalLamps);
  const headInst = new THREE.InstancedMesh(headGeo, bulbMat, totalLamps);
  const dummy = new THREE.Object3D();
  let idx = 0;

  for (const st of streets) {
    const length = st.start.distanceTo(st.end);
    const count = Math.floor(length / 26);
    const dir = _scratchV3.subVectors(st.end, st.start).normalize();
    const angle = Math.atan2(dir.x, dir.z);

    for (let i = 0; i < count && idx < totalLamps; i++) {
      const t = (i + 0.5) / count;
      const p = new THREE.Vector3().lerpVectors(st.start, st.end, t);
      const side = i % 2 === 0 ? 1 : -1;
      const off = st.width / 2 + 1.6;
      const px = p.x + Math.cos(angle) * off * side;
      const pz = p.z - Math.sin(angle) * off * side;
      const y = ground(px, pz);

      dummy.position.set(px, y + 3.5, pz);
      dummy.rotation.set(0, angle, 0);
      dummy.updateMatrix();
      poleInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(px - Math.cos(angle) * 0.8 * side, y + 6.9, pz + Math.sin(angle) * 0.8 * side);
      dummy.rotation.set(0, angle + Math.PI / 2, 0);
      dummy.updateMatrix();
      armInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(px - Math.cos(angle) * 1.5 * side, y + 6.8, pz + Math.sin(angle) * 1.5 * side);
      dummy.updateMatrix();
      headInst.setMatrixAt(idx, dummy.matrix);

      idx++;
    }
  }

  poleInst.count = armInst.count = headInst.count = idx;
  poleInst.instanceMatrix.needsUpdate = true;
  armInst.instanceMatrix.needsUpdate = true;
  headInst.instanceMatrix.needsUpdate = true;
  poleInst.castShadow = true;
  
  headInst.userData.isStreetlight = true;
  headInst.userData.lampMaterial = bulbMat;
  
  parent.add(poleInst, armInst, headInst);
}

// ─────────────────────────────────────────────────────────────────────────
//  INDEXATION DES APPARTEMENTS & UNITÉS HABITABLES
// ─────────────────────────────────────────────────────────────────────────

function generateUnits(lot: CityLot, rng: () => number): CityUnit[] {
  const units: CityUnit[] = [];
  const floorH = 3.1;

  if (lot.use === 'hotel') {
    const roomsPerFloor = 8;
    for (let f = 1; f < lot.floors; f++) {
      for (let r = 0; r < roomsPerFloor; r++) {
        units.push({
          id: `${lot.id}_ch${f}${String(r + 1).padStart(2, '0')}`,
          lotId: lot.id,
          floor: f,
          unitNumber: `${f}${String(r + 1).padStart(2, '0')}`,
          type: 'chambre_hotel',
          rooms: 1,
          areaM2: 24 + rng() * 10,
          rentPerDay: 95 + Math.round(rng() * 60),
          purchasePrice: null,
          ownerId: null,
          interiorAnchor: new THREE.Vector3(lot.center.x, lot.center.y + 5.2 + (f - 1) * 3.0, lot.center.z),
        });
      }
    }
    return units;
  }

  if (lot.use !== 'residentiel_moyen' && lot.use !== 'residentiel_haut' && lot.use !== 'mixte') {
    return units;
  }

  const startFloor = lot.use === 'mixte' ? 1 : 0;
  const unitsPerFloor = Math.max(2, Math.floor(lot.width / 7));
  const types: CityUnit['type'][] = ['3_et_demi', '4_et_demi', '4_et_demi', '5_et_demi'];

  for (let f = startFloor; f < lot.floors; f++) {
    for (let u = 0; u < unitsPerFloor; u++) {
      const type = types[Math.floor(rng() * types.length)];
      const rooms = type === '3_et_demi' ? 3 : type === '4_et_demi' ? 4 : 5;
      const area = 45 + rooms * 12 + rng() * 15;

      units.push({
        id: `${lot.id}_apt${f + 1}${String(u + 1).padStart(2, '0')}`,
        lotId: lot.id,
        floor: f + 1,
        unitNumber: `${f + 1}${String(u + 1).padStart(2, '0')}`,
        type,
        rooms,
        areaM2: Math.round(area),
        rentPerDay: Math.round(28 + rooms * 9 + rng() * 12),
        purchasePrice: Math.round(area * (2400 + rng() * 900)),
        ownerId: null,
        interiorAnchor: new THREE.Vector3(lot.center.x + (u - unitsPerFloor / 2) * 6, lot.center.y + 0.9 + f * floorH, lot.center.z),
      });
    }
  }

  if (lot.use === 'residentiel_haut') {
    units.push({
      id: `${lot.id}_PH`,
      lotId: lot.id,
      floor: lot.floors + 1,
      unitNumber: 'PH',
      type: 'penthouse',
      rooms: 7,
      areaM2: Math.round(lot.width * lot.depth * 0.55),
      rentPerDay: 420,
      purchasePrice: 890000 + Math.round(rng() * 260000),
      ownerId: null,
      interiorAnchor: new THREE.Vector3(lot.center.x, lot.center.y + lot.floors * floorH + 2.4, lot.center.z),
    });
  }

  return units;
}

// ─────────────────────────────────────────────────────────────────────────
//  ASSEMBLAGE PRINCIPAL DE LA VILLE
// ─────────────────────────────────────────────────────────────────────────

export interface BuiltCity {
  group: THREE.Group;
  center: THREE.Vector3;
  lots: CityLot[];
  units: CityUnit[];
  streets: Array<{ id: string; name: string; class: StreetClass; points: [number, number][] }>;
  pointsOfInterest: Array<{
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    radius: number;
  }>;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
}

export function buildCity(config: Partial<CityConfig> = {}): BuiltCity {
  const cfg = { ...DEFAULT_CITY, ...config };
  const rng = makeRng(cfg.seed);
  const ground = cfg.heightFn ?? (() => 0);
  const lit = cfg.litRatio ?? 0;

  const group = new THREE.Group();
  group.name = `ville_${cfg.villageName ?? 'procedurale'}`;

  const lots: CityLot[] = [];
  const allUnits: CityUnit[] = [];
  const pois: BuiltCity['pointsOfInterest'] = [];

  const { streets, colOffsets, rowOffsets } = generateStreetGrid(cfg, rng);
  group.add(buildStreets(streets, ground));
  addStreetFurniture(group, streets, rng, ground);

  const n = cfg.gridSize;
  const cos = Math.cos(cfg.angle);
  const sin = Math.sin(cfg.angle);
  const [ccx, ccz] = cfg.center;
  const totalW = colOffsets[n];
  const totalD = rowOffsets[n];
  const shiftX = -totalW / 2;
  const shiftZ = -totalD / 2;

  const toWorld = (lx: number, lz: number) =>
    new THREE.Vector3(
      ccx + (lx + shiftX) * cos - (lz + shiftZ) * sin,
      0,
      ccz + (lx + shiftX) * sin + (lz + shiftZ) * cos
    );

  const parkCol = Math.floor(n / 2);
  const parkRow = Math.floor(n / 2) - 1;
  const hotelCol = Math.floor(n / 2) + 1;
  const hotelRow = Math.floor(n / 2);
  const towerCol = Math.floor(n / 2);
  const towerRow = Math.floor(n / 2) + 2;

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const lx0 = colOffsets[col] + cfg.streetWidth / 2;
      const lx1 = colOffsets[col + 1] - cfg.streetWidth / 2;
      const lz0 = rowOffsets[row] + cfg.streetWidth / 2;
      const lz1 = rowOffsets[row + 1] - cfg.streetWidth / 2;

      const width = lx1 - lx0;
      const depth = lz1 - lz0;
      const centerLocal = [(lx0 + lx1) / 2, (lz0 + lz1) / 2];
      const world = toWorld(centerLocal[0], centerLocal[1]);
      world.y = ground(world.x, world.z);

      const dc = Math.hypot(col - n / 2, row - n / 2) / (n / 2);
      const isCorner = col === 0 || col === n - 1 || row === 0 || row === n - 1;
      const onArtery = col === Math.floor(n / 2) || row === Math.floor(n / 2);

      let use: LotUse;
      let floors: number;

      if (col === parkCol && row === parkRow) {
        use = 'parc';
        floors = 0;
      } else if (col === hotelCol && row === hotelRow) {
        use = 'hotel';
        floors = 6;
      } else if (col === towerCol && row === towerRow) {
        use = 'residentiel_haut';
        floors = 8;
      } else if (onArtery && dc < 0.55) {
        use = 'mixte';
        floors = 3 + Math.floor(rng() * 2);
      } else if (dc < 0.35) {
        use = rng() > 0.4 ? 'residentiel_moyen' : 'mixte';
        floors = 3 + Math.floor(rng() * 2);
      } else if (dc < 0.68) {
        use = rng() > 0.75 ? 'commercial' : 'residentiel_moyen';
        floors = 2 + Math.floor(rng() * 2);
      } else {
        use = rng() > 0.88 ? 'stationnement' : 'residentiel_bas';
        floors = 1 + Math.floor(rng() * 2);
      }

      floors = Math.max(1, Math.round(floors * cfg.density));

      const lot: CityLot = {
        id: `lot_${col}_${row}`,
        col,
        row,
        use,
        center: world,
        width,
        depth,
        frontAngle: cfg.angle + (row < n / 2 ? Math.PI : 0),
        isCorner,
        floors,
        hasInterior: false,
      };

      let building: THREE.Group | null = null;
      const bw = width * 0.78;
      const bd = depth * 0.7;

      switch (use) {
        case 'parc':
          building = buildParc(width, depth, rng);
          pois.push({
            id: `${lot.id}_parc`,
            name: `Parc de ${cfg.villageName || 'la ville'}`,
            type: 'park',
            position: world.clone(),
            radius: Math.max(width, depth) / 2,
          });
          break;

        case 'hotel':
          building = buildHotel(bw, bd, floors, lit);
          lot.hasInterior = true;
          pois.push({
            id: `${lot.id}_hotel`,
            name: `Hôtel ${cfg.villageName || 'Portneuf'}`,
            type: 'hotel',
            position: world.clone(),
            radius: 22,
          });
          break;

        case 'residentiel_haut':
          building = buildTourResidentielle(bw, bd, floors, rng, lit);
          lot.hasInterior = true;
          pois.push({
            id: `${lot.id}_tour`,
            name: 'Résidence Royale — Penthouse disponible',
            type: 'residence',
            position: world.clone(),
            radius: 20,
          });
          break;

        case 'residentiel_moyen':
          building = buildAppartements(bw, bd, floors, rng, lit);
          lot.hasInterior = true;
          break;

        case 'mixte':
        case 'commercial':
          building = buildMixte(bw, bd, Math.max(2, floors), rng, lit);
          lot.hasInterior = use === 'mixte';
          break;

        case 'residentiel_bas': {
          const sub = new THREE.Group();
          for (let h = 0; h < 2; h++) {
            const house = buildBuilding(rng() > 0.7 ? 'maison_mansardee' : 'maison_canadienne', {
              seed: cfg.seed + col * 31 + row * 17 + h,
              litRatio: lit,
            });
            house.position.set((h - 0.5) * width * 0.42, 0, 0);
            house.rotation.y = lot.frontAngle;
            sub.add(house);
          }
          building = sub;
          break;
        }

        case 'stationnement': {
          const lotMesh = new THREE.Group();
          const asphaltGeo = geoLib.getPlane(width * 0.92, depth * 0.92);
          const asphalt = new THREE.Mesh(asphaltGeo, matLib.get(CITY_PALETTE.asphalte, 0.96));
          asphalt.rotation.x = -Math.PI / 2;
          asphalt.position.y = 0.035;
          asphalt.receiveShadow = true;
          lotMesh.add(asphalt);

          const lineMat = matLib.get(0xd8d0b8, 0.7);
          const rows = Math.floor(depth / 6);
          const cols = Math.floor(width / 2.8);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= cols; c++) {
              const line = new THREE.Mesh(geoLib.getPlane(0.1, 5), lineMat);
              line.rotation.x = -Math.PI / 2;
              line.position.set(-width * 0.44 + c * 2.8, 0.04, -depth * 0.4 + r * 6);
              lotMesh.add(line);
            }
          }
          building = lotMesh;
          break;
        }

        default:
          break;
      }

      if (building) {
        building.position.copy(world);
        if (use !== 'parc' && use !== 'stationnement' && use !== 'residentiel_bas') {
          building.rotation.y = lot.frontAngle;
          const local = building.userData.entranceLocal as THREE.Vector3 | undefined;
          if (local) {
            const e = local.clone().applyEuler(new THREE.Euler(0, lot.frontAngle, 0));
            lot.entrance = world.clone().add(e);
          }
        }
        group.add(building);
        lot.building = building;
      }

      if (lot.hasInterior) {
        lot.units = generateUnits(lot, rng);
        allUnits.push(...lot.units);
      }

      lots.push(lot);
    }
  }

  const corners = [toWorld(0, 0), toWorld(totalW, 0), toWorld(0, totalD), toWorld(totalW, totalD)];
  const bounds = {
    minX: Math.min(...corners.map((c) => c.x)),
    maxX: Math.max(...corners.map((c) => c.x)),
    minZ: Math.min(...corners.map((c) => c.z)),
    maxZ: Math.max(...corners.map((c) => c.z)),
  };

  return {
    group,
    center: new THREE.Vector3(ccx, ground(ccx, ccz), ccz),
    lots,
    units: allUnits,
    streets: streets.map((s) => ({
      id: s.id,
      name: s.name,
      class: s.streetClass,
      points: [[s.start.x, s.start.z], [s.end.x, s.end.z]] as [number, number][],
    })),
    pointsOfInterest: pois,
    bounds,
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  REQUÊTES SPATIALES HAUTE PERFORMANCE (GC-FREE ♻️)
// ─────────────────────────────────────────────────────────────────────────

export function getUnitsForSale(city: BuiltCity): CityUnit[] {
  return city.units.filter((u) => u.purchasePrice !== null && u.ownerId === null);
}

export function getUnitsForRent(city: BuiltCity): CityUnit[] {
  return city.units.filter((u) => u.ownerId === null);
}

export function getPenthouses(city: BuiltCity): CityUnit[] {
  return city.units.filter((u) => u.type === 'penthouse');
}

export function getLotAt(city: BuiltCity, x: number, z: number): CityLot | null {
  let best: CityLot | null = null;
  let minDistanceSq = Number.POSITIVE_INFINITY;

  for (const lot of city.lots) {
    const dx = lot.center.x - x;
    const dz = lot.center.z - z;
    const distSq = dx * dx + dz * dz;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      best = lot;
    }
  }

  if (best) {
    const limit = Math.max(best.width, best.depth);
    if (Math.sqrt(minDistanceSq) > limit) return null;
  }
  return best;
}

/**
 * ⚡ Swapping de matière Jour/Nuit instantané pour toute la ville (0 Lag)
 */
export function setCityNightMode(city: BuiltCity, isNight: boolean): void {
  const targetWindowMat = matLib.getGlass(isNight);

  city.group.traverse((obj) => {
    // A. Éclairage public
    if (obj.userData.isStreetlight && obj.userData.lampMaterial) {
      const mat = obj.userData.lampMaterial as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0xffd88a);
      mat.emissiveIntensity = isNight ? 1.7 : 0.05;
    }
    
    // B. Vitres de bâtiments
    if (obj.userData.isWindow && obj instanceof THREE.Mesh && obj.userData.isGlassMesh) {
      obj.material = targetWindowMat;
    }
  });
}