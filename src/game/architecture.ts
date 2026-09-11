import * as THREE from "three";
import { matLib, QC_PALETTE, WALL_COLORS, ROOF_COLORS } from "./materials";
import { makeRng } from "./rng";
import { buildGlassLeaf, type SwingDoor } from "./door";
import { finishMap, tex } from "./textures";

function gableRoof(width: number, depth: number, height: number, color: number, overhang = 0.45) {
  const g = new THREE.Group();
  const w = width + overhang * 2;
  const d = depth + overhang * 2;
  const mat = matLib.get(color, 0.75, 0.15);
  const slopeLen = Math.hypot(w / 2, height);
  const angle = Math.atan2(height, w / 2);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.12, d), mat);
    panel.position.set((side * w) / 4, height / 2, 0);
    panel.rotation.z = side * -angle;
    panel.castShadow = true;
    g.add(panel);
  }
  return g;
}

function windowPane(w: number, h: number, lit: boolean) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    lit
      ? matLib.getEmissive(QC_PALETTE.fenetreEclairee, QC_PALETTE.fenetreEclairee, 0.85)
      : matLib.get(QC_PALETTE.fenetre, 0.2, 0.55),
  );
  glass.userData.isWindow = true;
  g.add(glass);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.05),
    matLib.get(QC_PALETTE.boiserie, 0.82),
  );
  frame.position.z = -0.02;
  g.add(frame);
  return g;
}

export function buildMaisonCanadienne(seed = 1, lit = 0): THREE.Group {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.name = "maison_canadienne";
  const width = 7.4 + rng() * 2.6;
  const depth = 7.8 + rng() * 2.2;
  const wallH = 3.15 + rng() * 0.45;
  const roofH = 2.6 + rng() * 0.7;
  const wallColor = WALL_COLORS[Math.floor(rng() * WALL_COLORS.length)];
  const roofColor = ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)];

  const found = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.22, 0.62, depth + 0.22),
    matLib.get(QC_PALETTE.fondation, 0.97),
  );
  found.position.y = 0.31;
  found.receiveShadow = true;
  g.add(found);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, wallH, depth),
    matLib.get(wallColor, 0.88),
  );
  body.position.y = 0.62 + wallH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = gableRoof(width, depth, roofH, roofColor);
  roof.position.y = 0.62 + wallH;
  g.add(roof);

  const galW = width * 0.82;
  const gal = new THREE.Mesh(
    new THREE.BoxGeometry(galW, 0.12, 2.0),
    matLib.get(QC_PALETTE.galerie, 0.9),
  );
  gal.position.set(0, 0.72, depth / 2 + 1.0);
  gal.castShadow = true;
  g.add(gal);
  for (const x of [-galW / 2 + 0.2, galW / 2 - 0.2]) {
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.4, 0.12),
      matLib.get(QC_PALETTE.boiserie, 0.85),
    );
    col.position.set(x, 1.9, depth / 2 + 1.85);
    col.castShadow = true;
    g.add(col);
  }
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(galW + 0.2, 0.1, 2.2),
    matLib.get(roofColor, 0.75, 0.15),
  );
  awning.position.set(0, 3.15, depth / 2 + 1.0);
  awning.rotation.x = -0.08;
  g.add(awning);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 2.05, 0.1),
    matLib.get(QC_PALETTE.porte, 0.8),
  );
  door.position.set(0, 0.62 + 1.02, depth / 2 + 0.06);
  g.add(door);

  for (const x of [-width * 0.28, width * 0.28]) {
    const w = windowPane(1.05, 1.2, rng() < lit);
    w.position.set(x, 0.62 + 1.65, depth / 2 + 0.07);
    g.add(w);
  }

  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.6, 0.55),
    matLib.get(QC_PALETTE.cheminee, 0.95),
  );
  chimney.position.set(width * 0.28, 0.62 + wallH + roofH * 0.55, -depth * 0.12);
  chimney.castShadow = true;
  g.add(chimney);

  g.userData.footprint = { width, depth };
  return g;
}

export function buildEglise(seed = 42, lit = 0): THREE.Group {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.name = "eglise";
  const navW = 12;
  const navD = 24;
  const navH = 9.5;
  const stone = matLib.get(QC_PALETTE.pierreGrise, 0.95);

  const nave = new THREE.Mesh(new THREE.BoxGeometry(navW, navH, navD), stone);
  nave.position.y = navH / 2;
  nave.castShadow = true;
  nave.receiveShadow = true;
  g.add(nave);

  const roof = gableRoof(navW, navD, 4.0, QC_PALETTE.toleArgent, 0.6);
  roof.position.y = navH;
  g.add(roof);

  const towerW = 4.8;
  const towerH = 17;
  const tower = new THREE.Mesh(new THREE.BoxGeometry(towerW, towerH, towerW), stone);
  tower.position.set(0, towerH / 2, navD / 2 + towerW / 2 - 0.4);
  tower.castShadow = true;
  g.add(tower);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(towerW * 0.68, 8.2, 4),
    matLib.get(QC_PALETTE.toleArgent, 0.35, 0.82),
  );
  spire.position.set(0, towerH + 4.1, navD / 2 + towerW / 2 - 0.4);
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  g.add(spire);

  const crossMat = matLib.get(0xd8d4c0, 0.4, 0.75);
  const tz = navD / 2 + towerW / 2 - 0.4;
  const cv = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), crossMat);
  cv.position.set(0, towerH + 9.1, tz);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.12), crossMat);
  ch.position.set(0, towerH + 9.45, tz);
  g.add(cv, ch);

  for (let i = 0; i < 4; i++) {
    const z = -navD / 2 + 4.2 + i * 5.0;
    for (const side of [-1, 1]) {
      const win = windowPane(1.4, 3.2, rng() < lit);
      win.position.set(side * (navW / 2 + 0.04), 5.0, z);
      win.rotation.y = side * (Math.PI / 2);
      g.add(win);
    }
  }

  const portal = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 4.0, 0.22),
    matLib.get(QC_PALETTE.porte, 0.75),
  );
  portal.position.set(0, 2.0, navD / 2 + towerW - 0.5);
  g.add(portal);

  g.userData.footprint = { width: navW, depth: navD + towerW };
  return g;
}

export function buildDepanneur(seed = 7, lit = 0): THREE.Group {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.name = "depanneur";
  const w = 11.2;
  const d = 8.4;
  const h = 3.55;
  const clapboard = matLib.get(QC_PALETTE.boisCreme, 0.88);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), clapboard);
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.5, 0.32, d + 0.5),
    matLib.get(QC_PALETTE.toleNoire, 0.9),
  );
  roof.position.y = h + 0.12;
  g.add(roof);

  const opening = 2.15;
  const wing = (w * 0.72 - opening) / 2;
  for (const s of [-1, 1]) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(2.2, wing * 1.15), 2.15),
      lit > 0.3 ? matLib.getEmissive(0xfff4d0, 0xffe0a0, 0.9) : matLib.get(0x304050, 0.14, 0.62),
    );
    pane.position.set(s * (opening / 2 + wing * 0.7 + 0.35), 1.85, d / 2 + 0.05);
    pane.userData.isWindow = true;
    g.add(pane);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(2.3, wing * 1.2), 2.28, 0.08),
      matLib.get(QC_PALETTE.boiserie, 0.8),
    );
    frame.position.set(s * (opening / 2 + wing * 0.7 + 0.35), 1.85, d / 2 + 0.02);
    g.add(frame);
  }

  const signW = w * 0.78;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(signW, 1.05, 0.16), depSignMat());
  sign.position.set(0, h + 0.72, d / 2 + 0.1);
  g.add(sign);
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(signW + 0.12, 1.16, 0.04),
    matLib.getEmissive(0xc02828, 0xff4040, 0.55),
  );
  neon.position.set(0, h + 0.72, d / 2 + 0.02);
  g.add(neon);

  const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.1, 1.65), matLib.get(QC_PALETTE.toleRouge, 0.8));
  awning.position.set(0, 3.05, d / 2 + 0.85);
  awning.rotation.x = -0.12;
  g.add(awning);

  const swings: SwingDoor[] = [];
  const leafW = opening / 2 - 0.05;
  const left = buildGlassLeaf(leafW, 2.35, 1, -1);
  left.hinge.position.set(-(opening / 2), 0, d / 2);
  g.add(left.hinge);
  swings.push(left.door);
  const right = buildGlassLeaf(leafW, 2.35, -1, 1);
  right.hinge.position.set(opening / 2, 0, d / 2);
  g.add(right.hinge);
  swings.push(right.door);
  g.userData.swings = swings;

  const ice = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.92, 0.78), matLib.get(0xe8eef4, 0.28, 0.12));
  ice.position.set(-4.4, 0.48, d / 2 + 1.35);
  ice.castShadow = true;
  g.add(ice);
  const iceLid = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.74), matLib.get(0xa8d0e8, 0.18, 0.4));
  iceLid.position.set(-4.4, 0.96, d / 2 + 1.35);
  g.add(iceLid);

  const boxNews = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 0.42), matLib.get(0xb02028, 0.55));
  boxNews.position.set(4.55, 0.55, d / 2 + 1.15);
  boxNews.castShadow = true;
  g.add(boxNews);

  const island = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 2.2), matLib.get(QC_PALETTE.beton, 0.95));
  island.position.set(0, 0.1, d / 2 + 6.15);
  g.add(island);
  for (const px of [-1.7, 1.7]) {
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.85, 0.48), matLib.get(0xd8dce0, 0.4, 0.35));
    pump.position.set(px, 1.02, d / 2 + 6.15);
    pump.castShadow = true;
    g.add(pump);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.28),
      matLib.getEmissive(0x1a3a28, 0x4ada70, 0.7),
    );
    screen.position.set(px, 1.55, d / 2 + 6.4);
    g.add(screen);
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), matLib.get(0x1a1a1e, 0.7));
    hose.position.set(px + 0.38, 0.85, d / 2 + 6.15);
    hose.rotation.z = 0.35;
    g.add(hose);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 4.6), matLib.get(0xf0ece4, 0.55, 0.15));
  canopy.position.set(0, 4.35, d / 2 + 6.15);
  canopy.castShadow = true;
  g.add(canopy);
  const canopyPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), matLib.get(0xc8ccd0, 0.35, 0.55));
  canopyPostL.position.set(-3.6, 2.15, d / 2 + 6.15);
  g.add(canopyPostL);
  const canopyPostR = canopyPostL.clone();
  canopyPostR.position.x = 3.6;
  g.add(canopyPostR);

  const pad = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.06, 8.4), matLib.get(0x3a3a3e, 0.95));
  pad.position.set(0, 0.02, d / 2 + 5.4);
  pad.receiveShadow = true;
  g.add(pad);
  for (const px of [-2.4, 2.4]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 5.2), matLib.get(0xe8e0c8, 0.7));
    line.position.set(px, 0.06, d / 2 + 5.6);
    g.add(line);
  }

  const dump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.15, 1.05), matLib.get(0x3a4a38, 0.75));
  dump.position.set(w / 2 - 0.4, 0.58, -d / 2 - 1.4);
  dump.castShadow = true;
  g.add(dump);

  if (rng() > 0.35) {
    const sedan = buildSedan(0x3a4a62);
    sedan.scale.setScalar(0.92);
    sedan.position.set(-3.4, 0, d / 2 + 9.4);
    sedan.rotation.y = Math.PI * 0.02;
    g.add(sedan);
  }

  g.userData.footprint = { width: w, depth: d + 10 };
  g.userData.entranceLocal = new THREE.Vector3(0, 0, d / 2 + 1.8);
  return g;
}

let _depSign: THREE.MeshStandardMaterial | null = null;
function depSignMat() {
  if (_depSign) return _depSign;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#c02828";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = "#fff6e8";
  ctx.font = "bold 118px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DÉPANNEUR", 512, 118);
  ctx.font = "600 36px sans-serif";
  ctx.fillText("OUVERT  6 h – 23 h", 512, 200);
  const texMap = new THREE.CanvasTexture(c);
  texMap.colorSpace = THREE.SRGBColorSpace;
  texMap.anisotropy = 4;
  _depSign = new THREE.MeshStandardMaterial({
    map: texMap,
    roughness: 0.45,
    metalness: 0.08,
    emissive: new THREE.Color(0x401010),
    emissiveIntensity: 0.35,
  });
  return _depSign;
}


export function buildCasseCroute(): THREE.Group {
  const g = new THREE.Group();
  g.name = "casse_croute";
  const w = 10;
  const d = 7.2;
  const h = 3.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(0xd8c4a0, 0.9));
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.28, d + 1.4), matLib.get(QC_PALETTE.toleRouge, 0.85));
  roof.position.set(0, h + 0.2, 0.3);
  g.add(roof);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.9, 0.16), matLib.getEmissive(0xc45a28, 0xff7a3a, 1.1));
  sign.position.set(0, h + 0.9, d / 2 + 0.06);
  g.add(sign);
  const window = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.6), matLib.get(0x304050, 0.2, 0.5));
  window.position.set(0, 1.7, d / 2 + 0.04);
  g.add(window);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.05, 1.1), matLib.get(QC_PALETTE.toleArgent, 0.4, 0.4));
  counter.position.set(0, 0.55, d / 2 + 1.1);
  g.add(counter);
  g.userData.footprint = { width: w, depth: d + 2.4 };
  return g;
}

export function buildBoutique(): THREE.Group {
  const g = new THREE.Group();
  g.name = "boutique";
  const w = 12.6;
  const d = 9.4;
  const h = 4.4;
  const wall = matLib.get(0x1a1f2e, 0.88);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.28), wall);
  back.position.set(0, h / 2, -d / 2);
  back.castShadow = true;
  g.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.28, h, d), wall);
    side.position.set(s * (w / 2), h / 2, 0);
    side.castShadow = true;
    g.add(side);
  }
  const opening = 2.5;
  const wing = (w - opening) / 2;
  for (const s of [-1, 1]) {
    const front = new THREE.Mesh(new THREE.BoxGeometry(wing, h, 0.18), wall);
    front.position.set(s * (opening / 2 + wing / 2), h / 2, d / 2);
    g.add(front);
    const vitrine = new THREE.Mesh(new THREE.PlaneGeometry(wing * 0.72, 2.3), matLib.get(0x7dd3fc, 0.08, 0.2));
    (vitrine.material as THREE.MeshStandardMaterial).transparent = true;
    (vitrine.material as THREE.MeshStandardMaterial).opacity = 0.28;
    vitrine.position.set(s * (opening / 2 + wing / 2), 1.65, d / 2 + 0.12);
    g.add(vitrine);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(opening + 0.2, 0.28, 0.22), matLib.get(0x1a2535, 0.4, 0.65));
  lintel.position.set(0, h - 0.2, d / 2);
  g.add(lintel);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.32, d + 0.3), matLib.get(QC_PALETTE.toleNoire, 0.9));
  roof.position.y = h + 0.12;
  g.add(roof);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.55, 0.12), matLib.getEmissive(0xa78bfa, 0xa78bfa, 0.9));
  sign.position.set(0, h + 0.5, d / 2 + 0.08);
  g.add(sign);

  const swings: SwingDoor[] = [];
  const leafW = opening / 2 - 0.04;
  const left = buildGlassLeaf(leafW, 2.45, 1, -1);
  left.hinge.position.set(-(opening / 2), 0, d / 2);
  g.add(left.hinge);
  swings.push(left.door);
  const right = buildGlassLeaf(leafW, 2.45, -1, 1);
  right.hinge.position.set(opening / 2, 0, d / 2);
  g.add(right.hinge);
  swings.push(right.door);
  g.userData.swings = swings;

  for (const s of [-1, 1]) {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.2), matLib.get(s < 0 ? 0x8b1a1a : 0x111827, 0.85));
    torso.position.set(s * 3.6, 1.35, d / 2 - 1.15);
    torso.castShadow = true;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), matLib.get(0xd4c8b0, 0.7));
    head.position.set(s * 3.6, 1.78, d / 2 - 1.15);
    g.add(head);
  }
  g.userData.footprint = { width: w, depth: d };
  return g;
}

export function buildChasseShop(): THREE.Group {
  const g = new THREE.Group();
  g.name = "chasse";
  const w = 10.5;
  const d = 8.4;
  const h = 3.8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(0x6b624a, 0.92));
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5), matLib.get(QC_PALETTE.toleVerte, 0.88));
  roof.position.y = h + 0.16;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), matLib.get(QC_PALETTE.porte, 0.9));
  door.position.set(0, 1.15, d / 2 + 0.05);
  g.add(door);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.8, 0.16), matLib.getEmissive(0x3d4b35, 0x7a8f62, 0.85));
  sign.position.set(0, h + 0.7, d / 2 + 0.06);
  g.add(sign);
  g.userData.footprint = { width: w, depth: d };
  return g;
}

export function buildQuincaillerie(): THREE.Group {
  const g = new THREE.Group();
  g.name = "quincaillerie";
  const w = 12.4;
  const d = 9.2;
  const h = 4.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(0xc8a028, 0.86));
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.32, d + 0.4), matLib.get(QC_PALETTE.toleNoire, 0.9));
  roof.position.y = h + 0.12;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.12), matLib.get(0x2a2a2c, 0.7, 0.2));
  door.position.set(-2.2, 1.25, d / 2 + 0.05);
  g.add(door);
  const vitrine = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.2), matLib.get(0x3a5060, 0.12, 0.7));
  vitrine.position.set(2.2, 1.7, d / 2 + 0.05);
  g.add(vitrine);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.85, 0.16), matLib.getEmissive(0xc8a028, 0xf0d060, 0.7));
  sign.position.set(0, h + 0.7, d / 2 + 0.06);
  g.add(sign);
  g.userData.footprint = { width: w, depth: d };
  return g;
}

export function buildGrange(seed = 13): THREE.Group {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.name = "grange";
  const w = 12 + rng() * 3;
  const d = 18 + rng() * 5;
  const h = 5.6;
  const wall = matLib.get(QC_PALETTE.boisRouge, 0.95);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roofMat = matLib.get(QC_PALETTE.toleArgent, 0.55, 0.45);
  for (const side of [-1, 1]) {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.14, d + 0.4), roofMat);
    lower.position.set(side * w * 0.34, h + 1.25, 0);
    lower.rotation.z = side * -0.82;
    lower.castShadow = true;
    g.add(lower);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, 0.14, d + 0.4), roofMat);
    upper.position.set(side * w * 0.15, h + 3.5, 0);
    upper.rotation.z = side * -0.4;
    g.add(upper);
  }
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.4, 4.2, 0.16),
    tex.pbr("porteGrange", "porteGrangeNrm", 1, 1, 0.82, 0.05, 0xffffff, 1.1),
  );
  door.position.set(0, 2.1, d / 2 + 0.08);
  g.add(door);
  if (rng() > 0.4) {
    const silo = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 11, 12),
      matLib.get(0xc0bcb4, 0.85, 0.15),
    );
    silo.position.set(w / 2 + 2.8, 5.5, -d * 0.22);
    silo.castShadow = true;
    g.add(silo);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      matLib.get(QC_PALETTE.toleArgent, 0.5, 0.55),
    );
    dome.position.set(w / 2 + 2.8, 11, -d * 0.22);
    g.add(dome);
  }
  return g;
}

export function buildCabaneSucre(seed = 21, lit = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = "cabane_sucre";
  const w = 9;
  const d = 12;
  const h = 2.8;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    matLib.get(0x6a4a32, 0.95),
  );
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const roof = gableRoof(w, d, 2.8, QC_PALETTE.toleRouge, 0.7);
  roof.position.y = h;
  g.add(roof);
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.46, 4.4, 8),
    matLib.get(0x4a4a4e, 0.6, 0.55),
  );
  stack.position.set(0, h + 3.2, 0);
  stack.castShadow = true;
  g.add(stack);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.0, 0.1),
    matLib.get(0x4a3220, 0.9),
  );
  door.position.set(0, 1.0, d / 2 + 0.06);
  g.add(door);
  void seed;
  void lit;
  return g;
}

export function buildEcole(seed = 9, lit = 0): THREE.Group {
  const g = new THREE.Group();
  const w = 16;
  const d = 10;
  const h = 4.6;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    matLib.get(QC_PALETTE.brique, 0.9),
  );
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const roof = gableRoof(w, d, 2.4, QC_PALETTE.toleVerte, 0.5);
  roof.position.y = h;
  g.add(roof);
  for (let i = 0; i < 5; i++) {
    const win = windowPane(1.3, 1.6, lit > 0.4);
    win.position.set(-6 + i * 3, 2.4, d / 2 + 0.05);
    g.add(win);
  }
  void seed;
  g.userData.footprint = { width: w, depth: d };
  return g;
}

export function buildSqPoste(): THREE.Group {
  const g = new THREE.Group();
  g.name = "poste_sq";
  const w = 14.5;
  const d = 10.2;
  const h = 5.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(0x3f4a3c, 0.92));
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.7, d + 0.25), matLib.get(0xcaa24d, 0.5, 0.25));
  band.position.y = h - 0.55;
  g.add(band);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5), matLib.get(QC_PALETTE.toleNoire, 0.9));
  roof.position.y = h + 0.16;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.14), matLib.get(0x1a1c18, 0.7));
  door.position.set(0, 1.2, d / 2 + 0.06);
  g.add(door);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.55, 0.12),
    matLib.getEmissive(0x1d4ed8, 0x1d4ed8, 1.1),
  );
  bar.position.set(0, 4.55, d / 2 + 0.08);
  bar.userData.policeBar = true;
  g.add(bar);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.2, 8), matLib.get(0x5a5e62, 0.5, 0.65));
  pole.position.set(w / 2 + 1.4, 3.1, d / 2 - 1);
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), matLib.get(0x1d4ed8, 0.55));
  flag.position.set(w / 2 + 2.15, 5.7, d / 2 - 1);
  g.add(flag);
  g.userData.footprint = { width: w + 3.2, depth: d };
  return g;
}

export function buildHotelVille(): THREE.Group {
  const g = new THREE.Group();
  const w = 18;
  const d = 12;
  const h = 7.2;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    matLib.get(QC_PALETTE.pierreGrise, 0.92),
  );
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.3, 1.1, d + 0.3),
    matLib.get(QC_PALETTE.toleVerte, 0.6, 0.2),
  );
  band.position.y = h - 0.5;
  g.add(band);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6),
    matLib.get(QC_PALETTE.toleNoire, 0.9),
  );
  roof.position.y = h + 0.2;
  g.add(roof);
  const clock = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 16),
    matLib.get(0xf0ece0, 0.6),
  );
  clock.position.set(0, 5.6, d / 2 + 0.05);
  g.add(clock);
  g.userData.footprint = { width: w, depth: d };
  return g;
}

export function buildUrbanBlock(
  width: number,
  depth: number,
  floors: number,
  color: number,
  lit: number,
): THREE.Group {
  const g = new THREE.Group();
  const floorH = 3.05;
  const h = floors * floorH;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, h, depth),
    matLib.get(color, 0.9),
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.3, 0.5, depth + 0.3),
    matLib.get(0x3a3a3e, 0.95),
  );
  parapet.position.y = h + 0.15;
  g.add(parapet);
  const band = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.88, h * 0.7),
    matLib.get(QC_PALETTE.fenetre, 0.2, 0.45),
  );
  band.position.set(0, h * 0.52, depth / 2 + 0.04);
  g.add(band);
  void lit;
  return g;
}

export function buildPickup(color = 0x3a4a3c): THREE.Group {
  const g = new THREE.Group();
  g.name = "pickup";
  const paint = matLib.get(color, 0.45, 0.25);
  const dark = matLib.get(0x1a1a1e, 0.6, 0.4);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.35, 1.85), paint);
  cab.position.set(0, 1.25, 0.85);
  cab.castShadow = true;
  g.add(cab);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 1.15), paint);
  nose.position.set(0, 0.78, 2.15);
  nose.castShadow = true;
  g.add(nose);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 2.15), paint);
  bed.position.set(0, 0.95, -1.15);
  bed.castShadow = true;
  g.add(bed);
  for (const s of [-0.85, 0.85]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 2.1), dark);
    rail.position.set(s, 1.4, -1.15);
    g.add(rail);
  }
  const glass = matLib.get(0x6a88a0, 0.15, 0.65);
  const wind = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), glass);
  wind.position.set(0, 1.55, 1.78);
  wind.rotation.x = -0.25;
  g.add(wind);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const tire = matLib.get(0x1a1a1e, 0.95);
  for (const [wx, wz] of [
    [-0.95, 1.55],
    [0.95, 1.55],
    [-0.95, -1.35],
    [0.95, -1.35],
  ]) {
    const wh = new THREE.Mesh(wheelGeo, tire);
    wh.position.set(wx, 0.38, wz);
    g.add(wh);
  }
  const lightMat = matLib.getEmissive(0xfff4d8, 0xfff4d8, 0.2);
  for (const s of [-0.55, 0.55]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.08), lightMat);
    lamp.position.set(s, 0.85, 2.74);
    lamp.userData.headlight = true;
    g.add(lamp);
  }
  const tail = matLib.getEmissive(0xa02020, 0xa02020, 0.3);
  for (const s of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), tail);
    t.position.set(s, 0.85, -2.24);
    g.add(t);
  }
  return g;
}

export function buildSedan(color: number): THREE.Group {
  const g = new THREE.Group();
  const paint = matLib.get(color, 0.4, 0.3);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 4.1), paint);
  body.position.y = 0.7;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.65, 2.0), paint);
  cabin.position.set(0, 1.3, -0.1);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const tire = matLib.get(0x1a1a1e, 0.95);
  for (const [wx, wz] of [
    [-0.8, 1.2],
    [0.8, 1.2],
    [-0.8, -1.25],
    [0.8, -1.25],
  ]) {
    const wh = new THREE.Mesh(wheelGeo, tire);
    wh.position.set(wx, 0.32, wz);
    g.add(wh);
  }
  return g;
}

export function buildPolice(): THREE.Group {
  const g = buildSedan(0x3f4a3c);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.16, 0.38),
    matLib.getEmissive(0x1d4ed8, 0x1d4ed8, 0.85),
  );
  bar.position.set(0, 1.72, 0.05);
  bar.userData.policeBar = true;
  g.add(bar);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.14, 4.12), matLib.get(0xcaa24d, 0.45, 0.25));
  stripe.position.set(0, 0.78, 0);
  g.add(stripe);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.55), matLib.get(0xf2f2f0, 0.5));
  door.position.set(0.86, 0.95, 0.15);
  g.add(door);
  return g;
}

export function buildMotorcycle(color = 0x6a2018): THREE.Group {
  const g = new THREE.Group();
  g.name = "moto";
  const paint = matLib.get(color, 0.4, 0.35);
  const dark = matLib.get(0x1a1a1e, 0.85);
  const chrome = matLib.get(0xb8bcc0, 0.25, 0.85);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.7), paint);
  tank.position.set(0, 0.78, 0.05);
  tank.castShadow = true;
  g.add(tank);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.46), dark);
  seat.position.set(0, 0.82, -0.38);
  g.add(seat);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), chrome);
  fork.position.set(0, 0.72, 0.62);
  fork.rotation.x = -0.35;
  g.add(fork);
  const bars = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.05), dark);
  bars.position.set(0, 1.08, 0.52);
  g.add(bars);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.16, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const tire = matLib.get(0x1a1a1e, 0.95);
  for (const wz of [0.62, -0.58]) {
    const wh = new THREE.Mesh(wheelGeo, tire);
    wh.position.set(0, 0.32, wz);
    g.add(wh);
  }
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.08), matLib.getEmissive(0xfff4d8, 0xfff4d8, 0.35));
  lamp.position.set(0, 0.92, 0.78);
  lamp.userData.headlight = true;
  g.add(lamp);
  return g;
}

function addWheels(g: THREE.Group, spots: [number, number][], r = 0.38) {
  const geo = new THREE.CylinderGeometry(r, r, 0.28, 10);
  geo.rotateZ(Math.PI / 2);
  const tire = matLib.get(0x1a1a1e, 0.95);
  for (const [wx, wz] of spots) {
    const wh = new THREE.Mesh(geo, tire);
    wh.position.set(wx, r, wz);
    g.add(wh);
  }
}

export function buildFourgon(color = 0x4a5a68): THREE.Group {
  const g = new THREE.Group();
  g.name = "fourgon";
  const paint = matLib.get(color, 0.5, 0.22);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.55, 1.7), paint);
  cab.position.set(0, 1.35, 1.55);
  cab.castShadow = true;
  g.add(cab);
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.15, 3.35), paint);
  box.position.set(0, 1.65, -1.15);
  box.castShadow = true;
  g.add(box);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.7), matLib.get(0x6a88a0, 0.15, 0.65));
  glass.position.set(0, 1.65, 2.42);
  g.add(glass);
  addWheels(g, [
    [-1.05, 1.35],
    [1.05, 1.35],
    [-1.05, -1.85],
    [1.05, -1.85],
  ]);
  return g;
}

export function buildCamion(color = 0xc4a030): THREE.Group {
  const g = new THREE.Group();
  g.name = "camion";
  const paint = matLib.get(color, 0.48, 0.2);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.85, 1.9), paint);
  cab.position.set(0, 1.55, 2.35);
  cab.castShadow = true;
  g.add(cab);
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.45, 4.6), paint);
  box.position.set(0, 1.85, -1.15);
  box.castShadow = true;
  g.add(box);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.35, 0.35), matLib.get(0x2a2a2c, 0.7));
  bumper.position.set(0, 0.55, 3.35);
  g.add(bumper);
  addWheels(
    g,
    [
      [-1.15, 1.95],
      [1.15, 1.95],
      [-1.15, -0.4],
      [1.15, -0.4],
      [-1.15, -2.55],
      [1.15, -2.55],
    ],
    0.42,
  );
  return g;
}

export function buildDeplaceige(): THREE.Group {
  const g = buildPickup(0xe8e4d8);
  g.name = "deplaceige";
  const blade = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.7, 0.18), matLib.get(0xc4a030, 0.45, 0.3));
  blade.position.set(0, 0.7, 2.85);
  blade.rotation.x = -0.35;
  blade.castShadow = true;
  g.add(blade);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), matLib.get(0x3a3a3c, 0.6));
  arm.position.set(0, 0.85, 2.45);
  g.add(arm);
  return g;
}

export function buildRemorqueuse(): THREE.Group {
  const g = buildPickup(0xc4a030);
  g.name = "remorqueuse";
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.4), matLib.get(0x2a2a2c, 0.5, 0.4));
  boom.position.set(0, 2.05, -0.4);
  boom.rotation.x = 0.45;
  g.add(boom);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), matLib.get(0x8a8e92, 0.35, 0.7));
  hook.position.set(0, 1.35, -1.85);
  g.add(hook);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 8), matLib.getEmissive(0xc4a030, 0xffc14a, 0.9));
  beacon.position.set(0, 2.05, 0.7);
  g.add(beacon);
  return g;
}

let arretTex: THREE.CanvasTexture | null = null;
const speedTex = new Map<number, THREE.CanvasTexture>();

function canvasTex(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 256, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  return finishMap(tex, "clamp");
}

function getArretTex() {
  if (arretTex) return arretTex;
  arretTex = canvasTex((ctx, size) => {
    const c = size / 2;
    const r = size * 0.46;
    ctx.fillStyle = "#b02a20";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (i === 0) {
        ctx.moveTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
      } else {
        ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f4f2ec";
    ctx.lineWidth = size * 0.035;
    ctx.stroke();
    ctx.fillStyle = "#f4f2ec";
    ctx.font = `bold ${size * 0.22}px Outfit, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ARRÊT", c, c);
  });
  return arretTex;
}

function getSpeedTex(limit: number) {
  let tex = speedTex.get(limit);
  if (tex) return tex;
  tex = canvasTex(
    (ctx, w, h) => {
      ctx.fillStyle = "#f0eee6";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "center";
      ctx.font = "bold 28px Outfit, Arial, sans-serif";
      ctx.fillText("MAXIMUM", w / 2, 52);
      ctx.font = "bold 96px Outfit, Arial, sans-serif";
      ctx.fillText(String(limit), w / 2, 155);
      ctx.font = "bold 28px Outfit, Arial, sans-serif";
      ctx.fillText("km/h", w / 2, 220);
    },
    200,
    260,
  );
  speedTex.set(limit, tex);
  return tex;
}

export function buildPanneauArret(height = 2.05): THREE.Group {
  const g = new THREE.Group();
  g.name = "panneau_arret";
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, height, 8),
    matLib.get(0x8a8e92, 0.5, 0.65),
  );
  post.position.y = height / 2;
  post.castShadow = true;
  g.add(post);
  const sign = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 8),
    new THREE.MeshStandardMaterial({
      map: getArretTex(),
      roughness: 0.55,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
  );
  sign.rotation.z = Math.PI / 8;
  sign.position.set(0, height - 0.12, 0.03);
  g.add(sign);
  return g;
}

export function buildPanneauVitesse(limit: number, height = 2.15): THREE.Group {
  const g = new THREE.Group();
  g.name = `panneau_vitesse_${limit}`;
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.033, 0.038, height, 8),
    matLib.get(0x8a8e92, 0.5, 0.65),
  );
  post.position.y = height / 2;
  post.castShadow = true;
  g.add(post);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.65),
    new THREE.MeshStandardMaterial({
      map: getSpeedTex(limit),
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  sign.position.set(0, height - 0.22, 0.03);
  g.add(sign);
  return g;
}

function getSortieTex(no: string, dest: string) {
  return canvasTex(
    (ctx, w, h) => {
      ctx.fillStyle = "#2f6b3c";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#f5c542";
      ctx.fillRect(0, 0, w, 70);
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "center";
      ctx.font = "bold 28px Outfit, Arial, sans-serif";
      ctx.fillText("SORTIE", w / 2, 32);
      ctx.font = "bold 34px Outfit, Arial, sans-serif";
      ctx.fillText(no, w / 2, 62);
      ctx.fillStyle = "#f4f2ec";
      ctx.font = "bold 22px Outfit, Arial, sans-serif";
      const parts = dest.split(" · ");
      ctx.fillText(parts[0] ?? dest, w / 2, 118);
      if (parts[1]) {
        ctx.font = "18px Outfit, Arial, sans-serif";
        ctx.fillText(parts[1], w / 2, 148);
      }
    },
    280,
    180,
  );
}

export function buildPanneauSortie(no: string, dest: string, height = 3.4): THREE.Group {
  const g = new THREE.Group();
  g.name = `sortie_${no}`;
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, height, 8),
    matLib.get(0x8a8e92, 0.5, 0.65),
  );
  post.position.y = height / 2;
  post.castShadow = true;
  g.add(post);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.55),
    new THREE.MeshStandardMaterial({
      map: getSortieTex(no, dest),
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  sign.position.set(0, height - 0.15, 0.04);
  g.add(sign);
  return g;
}

export function buildOverpass(span = 28): THREE.Group {
  const g = new THREE.Group();
  g.name = "overpass";
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.55, span), matLib.get(QC_PALETTE.beton, 0.92));
  deck.position.y = 6.2;
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);
  const rail = matLib.get(0x4a4e52, 0.55, 0.4);
  for (const x of [-4.9, 4.9]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, span), rail);
    r.position.set(x, 6.75, 0);
    g.add(r);
  }
  for (const z of [-span / 2 + 1.4, span / 2 - 1.4]) {
    for (const x of [-4.2, 4.2]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.2, 0.6), matLib.get(QC_PALETTE.beton, 0.95));
      p.position.set(x, 3.1, z);
      p.castShadow = true;
      g.add(p);
    }
  }
  return g;
}

function getAutorouteTex() {
  return canvasTex(
    (ctx, w, h) => {
      ctx.fillStyle = "#1e4a9a";
      ctx.beginPath();
      const r = 18;
      ctx.moveTo(r, 8);
      ctx.lineTo(w - r, 8);
      ctx.quadraticCurveTo(w - 8, 8, w - 8, r);
      ctx.lineTo(w - 8, h - r);
      ctx.quadraticCurveTo(w - 8, h - 8, w - r, h - 8);
      ctx.lineTo(r, h - 8);
      ctx.quadraticCurveTo(8, h - 8, 8, h - r);
      ctx.lineTo(8, r);
      ctx.quadraticCurveTo(8, 8, r, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f4f2ec";
      ctx.textAlign = "center";
      ctx.font = "bold 22px Outfit, Arial, sans-serif";
      ctx.fillText("A", w / 2, 48);
      ctx.font = "bold 72px Outfit, Arial, sans-serif";
      ctx.fillText("40", w / 2, 122);
    },
    140,
    150,
  );
}

export function buildPanneauAutoroute(height = 3.2): THREE.Group {
  const g = new THREE.Group();
  g.name = "panneau_a40";
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, height, 8),
    matLib.get(0x8a8e92, 0.5, 0.65),
  );
  post.position.y = height / 2;
  post.castShadow = true;
  g.add(post);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.25),
    new THREE.MeshStandardMaterial({
      map: getAutorouteTex(),
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  sign.position.set(0, height - 0.2, 0.04);
  g.add(sign);
  return g;
}

export function buildGantrySortie(no: string, dest: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `gantry_${no}`;
  const steel = matLib.get(0x5a5e62, 0.45, 0.55);
  const span = 28;
  for (const z of [-span / 2, span / 2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.4, 0.45), steel);
    post.position.set(0, 3.7, z);
    post.castShadow = true;
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, span + 1.2), steel);
  beam.position.set(0, 7.4, 0);
  beam.castShadow = true;
  g.add(beam);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.7),
    new THREE.MeshStandardMaterial({
      map: getSortieTex(no, dest),
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  sign.position.set(0.08, 6.45, 5.2);
  g.add(sign);
  return g;
}

export function buildAtm(): THREE.Group {
  const g = new THREE.Group();
  g.name = "atm";
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.45, 0.52), matLib.get(0x1a3a2a, 0.45, 0.4));
  body.position.y = 0.72;
  body.castShadow = true;
  g.add(body);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.32, 0.04),
    matLib.getEmissive(0x3dff9a, 0x14532d, 0.7),
  );
  screen.position.set(0, 1.12, 0.26);
  g.add(screen);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.06), matLib.get(0x111111, 0.4, 0.5));
  slot.position.set(0, 0.78, 0.26);
  g.add(slot);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.04), matLib.get(0x0f172a, 0.6));
  pad.position.set(0, 0.52, 0.26);
  g.add(pad);
  return g;
}

export function buildForSale(): THREE.Group {
  const g = new THREE.Group();
  g.name = "for_sale";
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.7, 6), matLib.get(0x4a3a28, 0.9));
  post.position.y = 0.85;
  g.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.06), matLib.get(0xc9a84c, 0.55, 0.2));
  board.position.y = 1.55;
  board.castShadow = true;
  g.add(board);
  return g;
}

export function buildCrimeCorner(): THREE.Group {
  const g = new THREE.Group();
  const bin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), matLib.get(0x2a2e28, 0.85));
  bin.position.y = 0.55;
  bin.castShadow = true;
  g.add(bin);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.76), matLib.get(0x3a3e38, 0.7));
  lid.position.y = 1.12;
  g.add(lid);
  return g;
}
