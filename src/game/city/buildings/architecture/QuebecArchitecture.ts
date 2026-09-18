// ═══════════════════════════════════════════════════════════════════════════
//  QUEBEC ARCHITECTURE — BÂTIMENTS PROCÉDURAUX PATRIMONIAUX (OPTIMISÉ GPU)
//  src/world/QuebecArchitecture.ts
//  Toits mansardés · Églises de pierre · Cabanes à sucre · Cache VRAM unifié ♻️
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

export type BuildingType =
  | 'maison_canadienne'   // Toit à deux versants, lucarnes, galerie
  | 'maison_mansardee'    // Style Second Empire (Toit Mansart)
  | 'maison_moderne'      // Bungalow d'après-guerre
  | 'eglise'              // Église classique à clocher argenté
  | 'presbytere'          // Presbytère en pierre des champs
  | 'depanneur'           // Dépanneur avec pompes à essence
  | 'grange'              // Grange-étable rouge de rang
  | 'cabane_sucre'        // Cabane avec évaporateur et bois de chauffage
  | 'ecole'               // École de rang patrimoniale
  | 'caisse'              // Caisse Populaire Desjardins
  | 'garage'              // Garage de réparation mécanique
  | 'hotel_ville';        // Hôtel de ville de comté

// ─────────────────────────────────────────────────────────────────────────
//  PALETTE DE COULEURS HISTORIQUES DU QUÉBEC
// ─────────────────────────────────────────────────────────────────────────

export const QC_PALETTE = {
  // Murs
  boisBlanc: 0xe8e4d8,
  boisCreme: 0xd8cfb8,
  boisGris: 0xa8a49a,
  boisBleu: 0x8fa8b8,
  boisVert: 0x7a8f78,
  boisRouge: 0xa04838,
  pierreChamps: 0x9a9086,
  pierreGrise: 0x8a8580,
  brique: 0x8f4a38,
  // Toits
  toleRouge: 0x8f3628,
  toleVerte: 0x2f5a42,
  toleNoire: 0x2a2a2e,
  toleBleue: 0x3a5570,
  bardeauGris: 0x4a4844,
  toleArgent: 0xb8bcc0,
  // Détails
  boiserie: 0xf0ece0,
  boiserieVerte: 0x1f4030,
  fenetre: 0x2a3a48,
  fenetreEclairee: 0xffd88a,
  porte: 0x5a3a28,
  galerie: 0xc8c0b0,
  cheminee: 0x7a4438,
  fondation: 0x6a6660,
  concrete: 0x8a8a86,
};

const WALL_COLORS = [
  QC_PALETTE.boisBlanc, QC_PALETTE.boisCreme, QC_PALETTE.boisGris,
  QC_PALETTE.boisBleu, QC_PALETTE.boisVert, QC_PALETTE.boisRouge,
];
const ROOF_COLORS = [
  QC_PALETTE.toleRouge, QC_PALETTE.toleVerte, QC_PALETTE.toleNoire,
  QC_PALETTE.toleBleue, QC_PALETTE.bardeauGris,
];

// Générateur pseudo-aléatoire déterministe
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  1. CACHE DES GÉOMÉTRIES (Évite la ré-allocation de mémoire RAM/VRAM)
// ─────────────────────────────────────────────────────────────────────────

class GeometryLibrary {
  private cache = new Map<string, THREE.BufferGeometry>();

  getBox(w: number, h: number, d: number): THREE.BoxGeometry {
    const key = `box_${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.BoxGeometry(w, h, d));
    }
    return this.cache.get(key) as THREE.BoxGeometry;
  }

  getCylinder(rt: number, rb: number, h: number, s: number): THREE.CylinderGeometry {
    const key = `cyl_${rt.toFixed(2)}_${rb.toFixed(2)}_${h.toFixed(2)}_${s}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.CylinderGeometry(rt, rb, h, s));
    }
    return this.cache.get(key) as THREE.CylinderGeometry;
  }

  getSphere(r: number, w: number, h: number): THREE.SphereGeometry {
    const key = `sph_${r.toFixed(2)}_${w}_${h}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.SphereGeometry(r, w, h));
    }
    return this.cache.get(key) as THREE.SphereGeometry;
  }

  getPlane(w: number, h: number): THREE.PlaneGeometry {
    const key = `plane_${w.toFixed(2)}_${h.toFixed(2)}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.PlaneGeometry(w, h));
    }
    return this.cache.get(key) as THREE.PlaneGeometry;
  }

  getCone(r: number, h: number, s: number): THREE.ConeGeometry {
    const key = `cone_${r.toFixed(2)}_${h.toFixed(2)}_${s}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.ConeGeometry(r, h, s));
    }
    return this.cache.get(key) as THREE.ConeGeometry;
  }

  /**
   * ⚡ Évite de re-calculer les extrusions triangulaires de toits à la volée
   */
  getGableTriangle(width: number, height: number): THREE.BufferGeometry {
    const key = `gable_${width.toFixed(2)}_${height.toFixed(2)}`;
    if (!this.cache.has(key)) {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, 0);
      shape.lineTo(width / 2, 0);
      shape.lineTo(0, height);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
      this.cache.set(key, geo);
    }
    return this.cache.get(key)!;
  }

  dispose(): void {
    this.cache.forEach((g) => g.dispose());
    this.cache.clear();
  }
}

export const geoLib = new GeometryLibrary();

// ─────────────────────────────────────────────────────────────────────────
//  2. CACHE DES MATÉRIAUX PARTAGÉS (0 Duplication de shaders)
// ─────────────────────────────────────────────────────────────────────────

class MaterialLibrary {
  private cache = new Map<string, THREE.MeshStandardMaterial>();

  get(color: number, roughness = 0.85, metalness = 0, flat = true): THREE.MeshStandardMaterial {
    const key = `${color}_${roughness}_${metalness}_${flat}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const mat = new THREE.MeshStandardMaterial({
      color, roughness, metalness, flatShading: flat,
    });
    this.cache.set(key, mat);
    return mat;
  }

  getEmissive(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
    const key = `em_${color}_${emissive}_${intensity}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const mat = new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: intensity, roughness: 0.4,
    });
    this.cache.set(key, mat);
    return mat;
  }

  /**
   * ⚡ Matériaux de vitres uniques pour le Material Swapping (Anti-Lag)
   */
  getGlass(lit: boolean): THREE.MeshStandardMaterial {
    const key = `glass_${lit ? 'on' : 'off'}`;
    if (!this.cache.has(key)) {
      const mat = new THREE.MeshStandardMaterial({
        color: lit ? QC_PALETTE.fenetreEclairee : QC_PALETTE.fenetre,
        emissive: lit ? QC_PALETTE.fenetreEclairee : 0x000000,
        emissiveIntensity: lit ? 1.1 : 0.0,
        roughness: 0.15,
        metalness: 0.6,
      });
      this.cache.set(key, mat);
    }
    return this.cache.get(key)!;
  }

  dispose(): void {
    this.cache.forEach((m) => m.dispose());
    this.cache.clear();
  }
}

export const matLib = new MaterialLibrary();

// ─────────────────────────────────────────────────────────────────────────
//  3. ÉLÉMENTS ARCHITECTURAUX PROCÉDURAUX COHÉRENTS
// ─────────────────────────────────────────────────────────────────────────

function buildGableRoof(
  width: number, depth: number, height: number, color: number, overhang = 0.5
): THREE.Group {
  const g = new THREE.Group();
  const w = width + overhang * 2;
  const d = depth + overhang * 2;
  const mat = matLib.get(color, 0.75, 0.15);

  const slopeLen = Math.hypot(w / 2, height);
  const angle = Math.atan2(height, w / 2);

  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(geoLib.getBox(slopeLen, 0.12, d), mat);
    panel.position.set((side * w) / 4, height / 2, 0);
    panel.rotation.z = side * -angle;
    panel.castShadow = true;
    g.add(panel);
  }

  const gableGeo = geoLib.getGableTriangle(width, height);
  for (const z of [depth / 2, -depth / 2 - 0.15]) {
    const gable = new THREE.Mesh(gableGeo, mat);
    gable.position.set(0, 0, z);
    g.add(gable);
  }

  return g;
}

function buildMansardRoof(
  width: number, depth: number, color: number
): THREE.Group {
  const g = new THREE.Group();
  const mat = matLib.get(color, 0.75, 0.15);

  const lowerH = 1.6;
  const lowerInset = 0.35;
  for (const [w, d, rotAxis, sign] of [
    [width, 0, 'x', 1], [width, 0, 'x', -1],
    [0, depth, 'z', 1], [0, depth, 'z', -1],
  ] as Array<[number, number, string, number]>) {
    const isX = rotAxis === 'x';
    const panelW = isX ? width + 0.6 : depth + 0.6;
    const panel = new THREE.Mesh(geoLib.getBox(panelW, lowerH * 1.1, 0.14), mat);
    if (isX) {
      panel.position.set(0, lowerH / 2, sign * (depth / 2 + 0.15));
      panel.rotation.x = sign * -0.28;
    } else {
      panel.position.set(sign * (width / 2 + 0.15), lowerH / 2, 0);
      panel.rotation.y = Math.PI / 2;
      panel.rotation.x = 0.28;
    }
    panel.castShadow = true;
    g.add(panel);
  }

  const top = new THREE.Mesh(
    geoLib.getBox(width - lowerInset * 2, 0.16, depth - lowerInset * 2),
    mat
  );
  top.position.y = lowerH + 0.08;
  top.castShadow = true;
  g.add(top);

  return g;
}

function buildGallery(
  width: number, depth: number, height: number, rng: () => number
): THREE.Group {
  const g = new THREE.Group();
  const floorMat = matLib.get(QC_PALETTE.galerie, 0.9);
  const railMat = matLib.get(QC_PALETTE.boiserie, 0.85);

  const floor = new THREE.Mesh(geoLib.getBox(width, 0.16, depth), floorMat);
  floor.position.y = 0.45;
  floor.receiveShadow = true;
  floor.castShadow = true;
  g.add(floor);

  const awning = new THREE.Mesh(geoLib.getBox(width + 0.3, 0.12, depth + 0.3), floorMat);
  awning.position.y = height;
  awning.rotation.x = -0.06;
  awning.castShadow = true;
  g.add(awning);

  const colCount = Math.max(2, Math.round(width / 1.8));
  const colGeo = geoLib.getBox(0.14, height - 0.5, 0.14);
  for (let i = 0; i < colCount; i++) {
    const t = colCount === 1 ? 0.5 : i / (colCount - 1);
    const x = -width / 2 + 0.2 + t * (width - 0.4);
    const col = new THREE.Mesh(colGeo, railMat);
    col.position.set(x, 0.53 + (height - 0.5) / 2, depth / 2 - 0.18);
    col.castShadow = true;
    g.add(col);
  }

  const railTop = new THREE.Mesh(geoLib.getBox(width, 0.08, 0.09), railMat);
  railTop.position.set(0, 1.42, depth / 2 - 0.18);
  g.add(railTop);

  const balusterGeo = geoLib.getBox(0.05, 0.85, 0.05);
  const balusterCount = Math.floor(width / 0.28);
  const balusterInst = new THREE.InstancedMesh(balusterGeo, railMat, balusterCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < balusterCount; i++) {
    const x = -width / 2 + 0.15 + (i / (balusterCount - 1 || 1)) * (width - 0.3);
    dummy.position.set(x, 0.98, depth / 2 - 0.18);
    dummy.updateMatrix();
    balusterInst.setMatrixAt(i, dummy.matrix);
  }
  balusterInst.instanceMatrix.needsUpdate = true;
  g.add(balusterInst);

  const stepMat = matLib.get(QC_PALETTE.galerie, 0.95);
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(geoLib.getBox(1.5, 0.12, 0.32), stepMat);
    step.position.set(0, 0.38 - i * 0.14, depth / 2 + 0.18 + i * 0.3);
    step.receiveShadow = true;
    g.add(step);
  }

  return g;
}

function buildWindow(
  w: number, h: number, lit: boolean, panes = true
): THREE.Group {
  const g = new THREE.Group();
  const frameMat = matLib.get(QC_PALETTE.boiserie, 0.8);
  const glassMat = matLib.getGlass(lit);

  // Vitre
  const glass = new THREE.Mesh(geoLib.getPlane(w, h), glassMat);
  glass.userData.isGlassMesh = true; // Flag pour le swap de phare nuit/jour 💡
  g.add(glass);

  g.userData.isWindow = true;

  const fw = 0.07;
  const frames: Array<[number, number, number, number]> = [
    [w + fw * 2, fw, 0, h / 2],
    [w + fw * 2, fw, 0, -h / 2],
    [fw, h, -w / 2, 0],
    [fw, h, w / 2, 0],
  ];
  for (const [fwx, fhy, fx, fy] of frames) {
    const f = new THREE.Mesh(geoLib.getBox(fwx, fhy, 0.06), frameMat);
    f.position.set(fx, fy, 0.03);
    g.add(f);
  }

  if (panes) {
    const vBar = new THREE.Mesh(geoLib.getBox(0.04, h, 0.05), frameMat);
    vBar.position.z = 0.03;
    g.add(vBar);
    const hBar = new THREE.Mesh(geoLib.getBox(w, 0.04, 0.05), frameMat);
    hBar.position.z = 0.03;
    g.add(hBar);
  }

  return g;
}

function buildChimney(height: number, rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const mat = matLib.get(QC_PALETTE.cheminee, 0.95);
  const body = new THREE.Mesh(geoLib.getBox(0.6, height, 0.6), mat);
  body.position.y = height / 2;
  body.castShadow = true;
  g.add(body);

  const cap = new THREE.Mesh(
    geoLib.getBox(0.78, 0.14, 0.78),
    matLib.get(QC_PALETTE.pierreGrise, 0.9)
  );
  cap.position.y = height + 0.05;
  g.add(cap);
  return g;
}

function buildDormer(width: number, lit: boolean): THREE.Group {
  const g = new THREE.Group();
  const wallMat = matLib.get(QC_PALETTE.boisBlanc, 0.88);

  const box = new THREE.Mesh(geoLib.getBox(width, 1.1, 0.9), wallMat);
  box.position.y = 0.55;
  box.castShadow = true;
  g.add(box);

  const roof = buildGableRoof(width + 0.2, 0.9, 0.5, QC_PALETTE.toleRouge, 0.12);
  roof.position.y = 1.1;
  g.add(roof);

  const win = buildWindow(width * 0.55, 0.65, lit);
  win.position.set(0, 0.6, 0.47);
  g.add(win);

  return g;
}

// ─────────────────────────────────────────────────────────────────────────
//  4. CONSTRUCTEURS DE BÂTIMENTS COMPLETS (0 ALLOCATION MÉMOIRE)
// ─────────────────────────────────────────────────────────────────────────

export interface BuildingOptions {
  seed?: number;
  litRatio?: number; // proportion de fenêtres allumées (0 = jour, 1 = nuit)
  scale?: number;
}

export function buildMaisonCanadienne(opts: BuildingOptions = {}): THREE.Group {
  const rng = makeRng(opts.seed ?? Math.floor(Math.random() * 99999));
  const lit = opts.litRatio ?? 0;
  const g = new THREE.Group();
  g.name = 'maison_canadienne';

  const width = 7.5 + rng() * 3;
  const depth = 8 + rng() * 2.5;
  const wallH = 3.2 + rng() * 0.6;
  const roofH = 2.8 + rng() * 0.9;

  const wallColor = WALL_COLORS[Math.floor(rng() * WALL_COLORS.length)];
  const roofColor = ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)];

  const found = new THREE.Mesh(
    geoLib.getBox(width + 0.25, 0.7, depth + 0.25),
    matLib.get(QC_PALETTE.fondation, 0.98)
  );
  found.position.y = 0.35;
  found.receiveShadow = true;
  g.add(found);

  const body = new THREE.Mesh(
    geoLib.getBox(width, wallH, depth),
    matLib.get(wallColor, 0.88)
  );
  body.position.y = 0.7 + wallH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = buildGableRoof(width, depth, roofH, roofColor);
  roof.position.y = 0.7 + wallH;
  g.add(roof);

  const gallery = buildGallery(width * 0.85, 2.2, 2.9, rng);
  gallery.position.set(0, 0.25, depth / 2 + 1.1);
  g.add(gallery);

  const door = new THREE.Mesh(
    geoLib.getBox(1.0, 2.1, 0.1),
    matLib.get(QC_PALETTE.porte, 0.8)
  );
  door.position.set(0, 0.7 + 1.05, depth / 2 + 0.06);
  g.add(door);

  for (const x of [-width * 0.28, width * 0.28]) {
    const w = buildWindow(1.1, 1.3, rng() < lit);
    w.position.set(x, 0.7 + 1.7, depth / 2 + 0.06);
    g.add(w);
  }

  for (const x of [-width * 0.26, width * 0.26]) {
    const w = buildWindow(1.0, 1.2, rng() < lit);
    w.position.set(x, 0.7 + 1.7, -depth / 2 - 0.06);
    w.rotation.y = Math.PI;
    g.add(w);
  }

  for (const side of [-1, 1]) {
    const w = buildWindow(0.9, 1.1, rng() < lit);
    w.position.set(side * (width / 2 + 0.06), 0.7 + 1.7, 0);
    w.rotation.y = (side * Math.PI) / 2;
    g.add(w);
  }

  if (rng() > 0.5) {
    const dormerCount = rng() > 0.6 ? 2 : 1;
    for (let i = 0; i < dormerCount; i++) {
      const dx = dormerCount === 1 ? 0 : (i === 0 ? -width * 0.24 : width * 0.24);
      const dormer = buildDormer(1.5, rng() < lit);
      dormer.position.set(dx, 0.7 + wallH + roofH * 0.28, depth / 2 - 1.4);
      g.add(dormer);
    }
  }

  const chimney = buildChimney(1.5 + rng() * 0.6, rng);
  chimney.position.set(width * 0.28, 0.7 + wallH + roofH * 0.55, -depth * 0.15);
  g.add(chimney);

  g.userData.buildingType = 'maison_canadienne';
  g.userData.footprint = { width, depth };
  return g;
}

export function buildMaisonMansardee(opts: BuildingOptions = {}): THREE.Group {
  const rng = makeRng(opts.seed ?? Math.floor(Math.random() * 99999));
  const lit = opts.litRatio ?? 0;
  const g = new THREE.Group();
  g.name = 'maison_mansardee';

  const width = 8.5 + rng() * 2.5;
  const depth = 9 + rng() * 2;
  const wallH = 6.2;
  const wallColor = rng() > 0.5 ? QC_PALETTE.boisBlanc : QC_PALETTE.pierreChamps;

  const found = new THREE.Mesh(
    geoLib.getBox(width + 0.3, 0.8, depth + 0.3),
    matLib.get(QC_PALETTE.fondation, 0.98)
  );
  found.position.y = 0.4;
  g.add(found);

  const body = new THREE.Mesh(
    geoLib.getBox(width, wallH, depth),
    matLib.get(wallColor, 0.9)
  );
  body.position.y = 0.8 + wallH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const cornice = new THREE.Mesh(
    geoLib.getBox(width + 0.4, 0.2, depth + 0.4),
    matLib.get(QC_PALETTE.boiserie, 0.85)
  );
  cornice.position.y = 0.8 + wallH;
  g.add(cornice);

  const roof = buildMansardRoof(width, depth, QC_PALETTE.toleNoire);
  roof.position.y = 0.8 + wallH + 0.2;
  g.add(roof);

  const gallery = buildGallery(width * 0.9, 2.5, 3.1, rng);
  gallery.position.set(0, 0.3, depth / 2 + 1.25);
  g.add(gallery);

  const door = new THREE.Mesh(
    geoLib.getBox(1.2, 2.4, 0.12),
    matLib.get(QC_PALETTE.boiserieVerte, 0.75)
  );
  door.position.set(0, 0.8 + 1.2, depth / 2 + 0.07);
  g.add(door);

  for (const level of [1.9, 4.6]) {
    for (const x of [-width * 0.3, 0, width * 0.3]) {
      if (level < 2.5 && Math.abs(x) < 0.1) continue;
      const w = buildWindow(1.1, 1.5, rng() < lit);
      w.position.set(x, 0.8 + level, depth / 2 + 0.07);
      g.add(w);
    }
  }

  for (const dx of [-width * 0.26, width * 0.26]) {
    const dormer = buildDormer(1.4, rng() < lit);
    dormer.position.set(dx, 0.8 + wallH + 0.4, depth / 2 - 0.9);
    g.add(dormer);
  }

  const chimney = buildChimney(1.8, rng);
  chimney.position.set(-width * 0.3, 0.8 + wallH + 2.0, 0);
  g.add(chimney);

  g.userData.buildingType = 'maison_mansardee';
  g.userData.footprint = { width, depth };
  return g;
}

export function buildEglise(opts: BuildingOptions = {}): THREE.Group {
  const rng = makeRng(opts.seed ?? 42);
  const lit = opts.litRatio ?? 0;
  const g = new THREE.Group();
  g.name = 'eglise';

  const navW = 14;
  const navD = 30;
  const navH = 11;
  const stoneMat = matLib.get(QC_PALETTE.pierreGrise, 0.95);

  const nave = new THREE.Mesh(geoLib.getBox(navW, navH, navD), stoneMat);
  nave.position.y = navH / 2;
  nave.castShadow = true;
  nave.receiveShadow = true;
  g.add(nave);

  const roof = buildGableRoof(navW, navD, 4.5, QC_PALETTE.toleArgent, 0.7);
  roof.position.y = navH;
  g.add(roof);

  const towerW = 5.5;
  const towerH = 20;
  const tower = new THREE.Mesh(geoLib.getBox(towerW, towerH, towerW), stoneMat);
  tower.position.set(0, towerH / 2, navD / 2 + towerW / 2 - 0.5);
  tower.castShadow = true;
  g.add(tower);

  const belfryMat = matLib.get(0x1a1a1e, 0.9);
  for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as Array<[number, number]>) {
    const opening = new THREE.Mesh(geoLib.getBox(2.2, 3, 0.2), belfryMat);
    opening.position.set(
      ax * (towerW / 2 + 0.02),
      towerH - 3.5,
      navD / 2 + towerW / 2 - 0.5 + az * (towerW / 2 + 0.02)
    );
    if (ax !== 0) opening.rotation.y = Math.PI / 2;
    g.add(opening);
  }

  const spireMat = matLib.get(QC_PALETTE.toleArgent, 0.35, 0.85);
  const spire = new THREE.Mesh(geoLib.getCone(towerW * 0.72, 9, 4), spireMat);
  spire.position.set(0, towerH + 4.5, navD / 2 + towerW / 2 - 0.5);
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  g.add(spire);

  const crossMat = matLib.get(0xd8d4c0, 0.4, 0.8);
  const crossV = new THREE.Mesh(geoLib.getBox(0.14, 1.8, 0.14), crossMat);
  crossV.position.set(0, towerH + 9.9, navD / 2 + towerW / 2 - 0.5);
  const crossH = new THREE.Mesh(geoLib.getBox(0.9, 0.14, 0.14), crossMat);
  crossH.position.set(0, towerH + 10.3, navD / 2 + towerW / 2 - 0.5);
  g.add(crossV, crossH);

  for (let i = 0; i < 5; i++) {
    const z = -navD / 2 + 4.5 + i * 5.2;
    for (const side of [-1, 1]) {
      const winGroup = new THREE.Group();
      const glassMat = matLib.getGlass(rng() < lit);
      
      const rect = new THREE.Mesh(geoLib.getPlane(1.6, 4), glassMat);
      rect.userData.isGlassMesh = true;
      winGroup.add(rect);
      
      const arch = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16, 0, Math.PI), glassMat);
      arch.position.y = 2;
      winGroup.add(arch);

      winGroup.position.set(side * (navW / 2 + 0.05), 5.5, z);
      winGroup.rotation.y = (side * Math.PI) / 2;
      winGroup.userData.isWindow = true;
      g.add(winGroup);
    }
  }

  const portal = new THREE.Mesh(
    geoLib.getBox(3, 4.5, 0.25),
    matLib.get(QC_PALETTE.porte, 0.75)
  );
  portal.position.set(0, 2.25, navD / 2 + towerW - 0.6);
  g.add(portal);

  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(
      geoLib.getBox(5 - i * 0.2, 0.18, 0.4),
      matLib.get(QC_PALETTE.pierreGrise, 0.95)
    );
    step.position.set(0, 0.09 + i * 0.18, navD / 2 + towerW + 0.2 + (3 - i) * 0.42);
    step.receiveShadow = true;
    g.add(step);
  }

  g.userData.buildingType = 'eglise';
  g.userData.footprint = { width: navW, depth: navD + towerW };
  return g;
}

export function buildDepanneur(opts: BuildingOptions = {}): THREE.Group {
  const rng = makeRng(opts.seed ?? 7);
  const lit = opts.litRatio ?? 0;
  const g = new THREE.Group();
  g.name = 'depanneur';

  const w = 12, d = 9, h = 4;

  const body = new THREE.Mesh(
    geoLib.getBox(w, h, d),
    matLib.get(QC_PALETTE.boisCreme, 0.9)
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(
    geoLib.getBox(w + 0.4, 0.5, d + 0.4),
    matLib.get(QC_PALETTE.toleNoire, 0.9)
  );
  roof.position.y = h + 0.2;
  g.add(roof);

  const vitrineMat = matLib.getGlass(lit > 0);
  const vitrine = new THREE.Mesh(geoLib.getPlane(w * 0.75, 2.4), vitrineMat);
  vitrine.position.set(0, 2.1, d / 2 + 0.03);
  vitrine.userData.isGlassMesh = true;
  vitrine.userData.isWindow = true;
  g.add(vitrine);

  const signMat = matLib.getEmissive(0xd83030, 0xff4040, 1.4);
  const sign = new THREE.Mesh(geoLib.getBox(w * 0.65, 1.1, 0.22), signMat);
  sign.position.set(0, h + 1.0, d / 2 + 0.1);
  g.add(sign);
  g.userData.signMaterial = signMat;

  const awning = new THREE.Mesh(
    geoLib.getBox(w * 0.85, 0.15, 2),
    matLib.get(QC_PALETTE.toleRouge, 0.8)
  );
  awning.position.set(0, 3.6, d / 2 + 1);
  awning.rotation.x = -0.1;
  awning.castShadow = true;
  g.add(awning);

  const door = new THREE.Mesh(
    geoLib.getBox(1.3, 2.3, 0.1),
    matLib.get(0x405060, 0.3, 0.5)
  );
  door.position.set(w * 0.3, 1.15, d / 2 + 0.06);
  g.add(door);

  const island = new THREE.Mesh(geoLib.getBox(6, 0.25, 2.2), matLib.get(QC_PALETTE.concrete, 0.95));
  island.position.set(0, 0.12, d / 2 + 7);
  island.receiveShadow = true;
  g.add(island);

  for (const px of [-1.8, 1.8]) {
    const pump = new THREE.Group();
    const pumpBody = new THREE.Mesh(
      geoLib.getBox(0.75, 1.9, 0.55),
      matLib.get(0xd0d4d8, 0.5, 0.3)
    );
    pumpBody.position.y = 0.95;
    pumpBody.castShadow = true;
    pump.add(pumpBody);

    const screenMat = matLib.getGlass(lit > 0);
    const screen = new THREE.Mesh(geoLib.getPlane(0.5, 0.4), screenMat);
    screen.position.set(0, 1.4, 0.29);
    pump.add(screen);

    pump.position.set(px, 0.25, d / 2 + 7);
    g.add(pump);
  }

  const canopyMat = matLib.get(0xe8e8e4, 0.6, 0.2);
  const canopy = new THREE.Mesh(geoLib.getBox(8, 0.4, 5), canopyMat);
  canopy.position.set(0, 5, d / 2 + 7);
  canopy.castShadow = true;
  g.add(canopy);

  for (const cx of [-3.2, 3.2]) {
    const col = new THREE.Mesh(
      geoLib.getCylinder(0.18, 0.18, 4.8, 8),
      canopyMat
    );
    col.position.set(cx, 2.5, d / 2 + 7);
    g.add(col);
  }

  const neonMat = matLib.getEmissive(0xffffff, 0xffffff, lit > 0 ? 2 : 0.3);
  const neon = new THREE.Mesh(geoLib.getBox(7.6, 0.1, 0.3), neonMat);
  neon.position.set(0, 4.78, d / 2 + 7);
  g.add(neon);

  g.userData.buildingType = 'depanneur';
  g.userData.footprint = { width: w, depth: d + 12 };
  return g;
}

export function buildGrange(opts: BuildingOptions = {}): THREE.Group {
  const rng = makeRng(opts.seed ?? 13);
  const g = new THREE.Group();
  g.name = 'grange';

  const w = 13 + rng() * 4;
  const d = 20 + rng() * 6;
  const h = 6;

  const wallMat = matLib.get(QC_PALETTE.boisRouge, 0.95);
  const body = new THREE.Mesh(geoLib.getBox(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roofMat = matLib.get(QC_PALETTE.toleArgent, 0.6, 0.5);
  for (const side of [-1, 1]) {
    const lower = new THREE.Mesh(geoLib.getBox(w * 0.32, 0.14, d + 0.5), roofMat);
    lower.position.set(side * w * 0.34, h + 1.4, 0);
    lower.rotation.z = side * -0.85;
    lower.castShadow = true;
    g.add(lower);

    const upper = new THREE.Mesh(geoLib.getBox(w * 0.34, 0.14, d + 0.5), roofMat);
    upper.position.set(side * w * 0.15, h + 3.9, 0);
    upper.rotation.z = side * -0.42;
    upper.castShadow = true;
    g.add(upper);
  }

  const doorMat = matLib.get(0x7a2e22, 0.9);
  const bigDoor = new THREE.Mesh(geoLib.getBox(w * 0.42, 4.5, 0.2), doorMat);
  bigDoor.position.set(0, 2.25, d / 2 + 0.1);
  g.add(bigDoor);

  const trimMat = matLib.get(QC_PALETTE.boiserie, 0.85);
  for (const rot of [0.6, -0.6]) {
    const brace = new THREE.Mesh(geoLib.getBox(w * 0.5, 0.16, 0.06), trimMat);
    brace.position.set(0, 2.25, d / 2 + 0.22);
    brace.rotation.z = rot;
    g.add(brace);
  }

  const loft = new THREE.Mesh(
    geoLib.getBox(1.6, 1.6, 0.18),
    matLib.get(0x2a2018, 0.9)
  );
  loft.position.set(0, h + 2.4, d / 2 + 0.1);
  g.add(loft);

  if (rng() > 0.4) {
    const siloMat = matLib.get(0xc0bcb4, 0.85, 0.15);
    const silo = new THREE.Mesh(geoLib.getCylinder(2.2, 2.2, 12, 14), siloMat);
    silo.position.set(w / 2 + 3, 6, -d * 0.25);
    silo.castShadow = true;
    g.add(silo);

    const dome = new THREE.Mesh(
      geoLib.getSphere(2.2, 14, 8),
      matLib.get(QC_PALETTE.toleArgent, 0.5, 0.6)
    );
    dome.position.set(w / 2 + 3, 12, -d * 0.25);
    g.add(dome);
  }

  g.userData.buildingType = 'grange';
  g.userData.footprint = { width: w + 6, depth: d };
  return g;
}

export function buildCabaneASucre(opts: BuildingOptions = {}): THREE.Group {
  const rng = makeRng(opts.seed ?? 21);
  const lit = opts.litRatio ?? 0;
  const g = new THREE.Group();
  g.name = 'cabane_sucre';

  const w = 10, d = 14, h = 3;

  const body = new THREE.Mesh(
    geoLib.getBox(w, h, d),
    matLib.get(0x6a4a32, 0.95)
  );
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);

  const logMat = matLib.get(0x7a5638, 0.95);
  const logGeo = geoLib.getCylinder(0.16, 0.16, d, 6);
  logGeo.rotateX(Math.PI / 2);
  const logCount = Math.floor(h / 0.34);
  for (const side of [-1, 1]) {
    const inst = new THREE.InstancedMesh(logGeo, logMat, logCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < logCount; i++) {
      dummy.position.set(side * (w / 2 + 0.05), 0.2 + i * 0.34, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    g.add(inst);
  }

  const roof = buildGableRoof(w, d, 3.2, QC_PALETTE.toleRouge, 0.8);
  roof.position.y = h;
  g.add(roof);

  const stackMat = matLib.get(0x4a4a4e, 0.6, 0.6);
  const stack = new THREE.Mesh(geoLib.getCylinder(0.45, 0.5, 5, 10), stackMat);
  stack.position.set(0, h + 3.5, 0);
  stack.castShadow = true;
  g.add(stack);

  const cap = new THREE.Mesh(geoLib.getCone(0.75, 0.6, 10), stackMat);
  cap.position.set(0, h + 6.2, 0);
  g.add(cap);
  g.userData.steamAnchor = new THREE.Vector3(0, h + 6.5, 0);

  const door = new THREE.Mesh(
    geoLib.getBox(1.1, 2.1, 0.12),
    matLib.get(0x4a3220, 0.9)
  );
  door.position.set(0, 1.05, d / 2 + 0.07);
  g.add(door);

  for (const x of [-2.8, 2.8]) {
    const win = buildWindow(1.0, 0.9, rng() < lit || lit > 0.3);
    win.position.set(x, 1.9, d / 2 + 0.07);
    g.add(win);
  }

  const woodMat = matLib.get(0x8a6a48, 0.98);
  const logEndGeo = geoLib.getCylinder(0.13, 0.13, 0.9, 7);
  logEndGeo.rotateZ(Math.PI / 2);
  const stackCount = 60;
  const woodInst = new THREE.InstancedMesh(logEndGeo, woodMat, stackCount);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let row = 0; row < 6 && idx < stackCount; row++) {
    for (let col = 0; col < 10 && idx < stackCount; col++) {
      dummy.position.set(
        w / 2 + 1.4,
        0.15 + row * 0.27,
        -d / 2 + 1 + col * 0.28
      );
      dummy.rotation.z = (rng() - 0.5) * 0.15;
      dummy.updateMatrix();
      woodInst.setMatrixAt(idx++, dummy.matrix);
    }
  }
  woodInst.count = idx;
  woodInst.instanceMatrix.needsUpdate = true;
  woodInst.castShadow = true;
  g.add(woodInst);

  g.userData.buildingType = 'cabane_sucre';
  g.userData.footprint = { width: w + 4, depth: d };
  return g;
}

export function buildCaisseDesjardins(opts: BuildingOptions = {}): THREE.Group {
  const lit = opts.litRatio ?? 0;
  const g = new THREE.Group();
  g.name = 'caisse';

  const w = 16, d = 12, h = 5.5;

  const body = new THREE.Mesh(
    geoLib.getBox(w, h, d),
    matLib.get(0xd8d4c8, 0.85)
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const bandMat = matLib.get(0x00874e, 0.6, 0.2);
  const band = new THREE.Mesh(geoLib.getBox(w + 0.3, 1.2, d + 0.3), bandMat);
  band.position.y = h - 0.6;
  g.add(band);

  const roof = new THREE.Mesh(
    geoLib.getBox(w + 0.5, 0.4, d + 0.5),
    matLib.get(QC_PALETTE.toleNoire, 0.9)
  );
  roof.position.y = h + 0.2;
  g.add(roof);

  const glassMat = matLib.getGlass(lit > 0);
  for (const x of [-4.5, 0, 4.5]) {
    const win = new THREE.Mesh(geoLib.getPlane(3.6, 3), glassMat);
    win.position.set(x, 2.6, d / 2 + 0.04);
    win.userData.isGlassMesh = true;
    win.userData.isWindow = true;
    g.add(win);
  }

  const signMat = matLib.getEmissive(0x00a860, 0x00d878, 1.2);
  const sign = new THREE.Mesh(geoLib.getBox(7, 0.9, 0.2), signMat);
  sign.position.set(0, h - 0.6, d / 2 + 0.2);
  g.add(sign);

  const atm = new THREE.Group();
  const atmBody = new THREE.Mesh(
    geoLib.getBox(1.1, 2, 0.7),
    matLib.get(0x2a3038, 0.5, 0.4)
  );
  atmBody.position.y = 1;
  atm.add(atmBody);
  
  const atmScreen = new THREE.Mesh(
    geoLib.getPlane(0.6, 0.5),
    matLib.getEmissive(0x102030, 0x40a0d0, 1.0)
  );
  atmScreen.position.set(0, 1.4, 0.36);
  atm.add(atmScreen);
  atm.position.set(-w / 2 - 1.5, 0, d / 2 - 2);
  atm.userData.isATM = true;
  g.add(atm);

  g.userData.buildingType = 'caisse';
  g.userData.footprint = { width: w + 4, depth: d };
  return g;
}

// ─────────────────────────────────────────────────────────────────────────
//  FABRIQUE & SWAPPING DE MATÉRIAUX JOUR / NUIT
// ─────────────────────────────────────────────────────────────────────────

const BUILDERS: Record<BuildingType, (o: BuildingOptions) => THREE.Group> = {
  maison_canadienne: buildMaisonCanadienne,
  maison_mansardee: buildMaisonMansardee,
  maison_moderne: buildMaisonCanadienne,
  eglise: buildEglise,
  presbytere: buildMaisonMansardee,
  depanneur: buildDepanneur,
  grange: buildGrange,
  cabane_sucre: buildCabaneASucre,
  ecole: buildMaisonMansardee,
  caisse: buildCaisseDesjardins,
  garage: buildDepanneur,
  hotel_ville: buildCaisseDesjardins,
};

export function buildBuilding(type: BuildingType, opts: BuildingOptions = {}): THREE.Group {
  const builder = BUILDERS[type] ?? buildMaisonCanadienne;
  const g = builder(opts);
  if (opts.scale && opts.scale !== 1) g.scale.setScalar(opts.scale);
  return g;
}

/**
 * ⚡ Allumage et extinction des fenêtres en 1 opération (Material Swapping)
 * Extrêmement performant : évite de briser le batching de rendu de Three.js !
 */
export function setBuildingLights(building: THREE.Object3D, on: boolean): void {
  const targetMaterial = matLib.getGlass(on);

  building.traverse((obj) => {
    // Échange de référence de matériau instantané
    if (obj.userData.isWindow && obj instanceof THREE.Mesh && obj.userData.isGlassMesh) {
      obj.material = targetMaterial;
    }
  });
}