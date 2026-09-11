import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { makeRng } from "./rng";

export function buildEboulis1894(length = 280, width = 170, angle = 0.5): THREE.Group {
  const g = new THREE.Group();
  g.name = "eboulis_1894";
  const rng = makeRng(1894);
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  const perpX = -dirZ;
  const perpZ = dirX;
  const segsU = 28;
  const segsV = 18;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const cArgile = new THREE.Color(0x8a7a64);
  const cFraiche = new THREE.Color(0x9a8a70);
  const cHerbe = new THREE.Color(0x5a7a42);

  for (let v = 0; v <= segsV; v++) {
    for (let u = 0; u <= segsU; u++) {
      const tu = u / segsU;
      const tv = v / segsV;
      const lx = (tu - 0.5) * length;
      const lz = (tv - 0.5) * width;
      const edge = Math.max(Math.abs(tu - 0.5) * 2, Math.abs(tv - 0.5) * 2);
      const basin = Math.pow(1 - edge, 0.55);
      let depth = -basin * 18;
      if (edge < 0.85) {
        depth += Math.sin(lx * 0.055) * Math.cos(lz * 0.07) * 2.8;
        depth += (rng() - 0.5) * 1.4;
      }
      if (tu > 0.86) depth += (tu - 0.86) * 36;
      positions.push(dirX * lx + perpX * lz, depth, dirZ * lx + perpZ * lz);
      const c = new THREE.Color();
      if (edge > 0.88) c.copy(cHerbe);
      else if (edge > 0.7) c.lerpColors(cArgile, cHerbe, (edge - 0.7) / 0.18);
      else c.lerpColors(cFraiche, cArgile, basin);
      colors.push(c.r, c.g, c.b);
      if (u < segsU && v < segsV) {
        const a = v * (segsU + 1) + u;
        const b = a + segsU + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const basinMesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    }),
  );
  basinMesh.receiveShadow = true;
  basinMesh.castShadow = true;
  g.add(basinMesh);

  const blockGeo = new THREE.DodecahedronGeometry(1, 0);
  const blockInst = new THREE.InstancedMesh(blockGeo, matLib.get(0x8a7a64, 0.99), 22);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 22; i++) {
    const lx = (rng() - 0.35) * length * 0.75;
    const lz = (rng() - 0.5) * width * 0.65;
    dummy.position.set(dirX * lx + perpX * lz, -12 + rng() * 7, dirZ * lx + perpZ * lz);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(1.1 + rng() * 2.8);
    dummy.updateMatrix();
    blockInst.setMatrixAt(i, dummy.matrix);
  }
  blockInst.instanceMatrix.needsUpdate = true;
  blockInst.castShadow = true;
  g.add(blockInst);

  const wood = matLib.get(0x7a5a3a, 0.96);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.14, 3.6), wood);
  deck.position.set(dirX * (-length / 2 - 12) + perpX * -16, 8, dirZ * (-length / 2 - 12) + perpZ * -16);
  deck.castShadow = true;
  g.add(deck);

  g.userData.landmark = "eboulis_1894";
  return g;
}

export function buildCaveEntrance(name = "Grotte"): THREE.Group {
  const g = new THREE.Group();
  const rock = matLib.get(0x6a6458, 0.99);
  const outcrop = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 7), rock);
  outcrop.position.y = 5;
  outcrop.castShadow = true;
  g.add(outcrop);
  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 10, 8),
    matLib.get(0x080706, 1),
  );
  mouth.position.set(0, 2.2, 3.6);
  mouth.scale.set(1, 1.1, 1.6);
  g.add(mouth);
  const rng = makeRng(name.length * 137);
  const inst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), matLib.get(0x7a7468, 0.99), 10);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 10; i++) {
    const a = (rng() - 0.5) * Math.PI;
    const d = 3 + rng() * 7;
    dummy.position.set(Math.sin(a) * d, 0.3, 4 + Math.cos(a) * d * 0.45);
    dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    dummy.scale.setScalar(0.4 + rng() * 1.1);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);
  g.userData.poiName = name;
  return g;
}

export function buildMarmitesDeGeants(count = 8): THREE.Group {
  const g = new THREE.Group();
  const rng = makeRng(1847);
  const rock = matLib.get(0x8a8478, 0.98);
  const wet = matLib.get(0x5a5850, 0.45, 0.25);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(56, 1.2, 26), rock);
  bed.position.y = -0.4;
  bed.receiveShadow = true;
  g.add(bed);
  for (let i = 0; i < count; i++) {
    const radius = 0.85 + rng() * 2.2;
    const depth = 1.4 + radius * 1.1;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.82, depth, 14, 1, true),
      wet,
    );
    wall.position.y = -depth / 2;
    (wall.material as THREE.MeshStandardMaterial).side = THREE.BackSide;
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.84, 14),
      matLib.get(0x2a6a5a, 0.1, 0.6),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -depth * 0.55;
    water.userData.isMarmiteWater = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.12, 6, 14), rock);
    rim.rotation.x = -Math.PI / 2;
    const m = new THREE.Group();
    m.add(wall, water, rim);
    const a = (i / count) * Math.PI * 2 + rng() * 0.6;
    const d = 5 + rng() * 16;
    m.position.set(Math.cos(a) * d, 0.2, Math.sin(a) * d * 0.5);
    g.add(m);
  }
  const wood = matLib.get(0x7a5a3a, 0.96);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 36), wood);
  walk.position.set(0, 1.3, -10);
  walk.castShadow = true;
  g.add(walk);
  return g;
}

export function buildTrouDuDiable(): THREE.Group {
  const g = buildCaveEntrance("Le Trou du Diable");
  g.name = "trou_du_diable";
  const cliff = new THREE.Mesh(
    new THREE.BoxGeometry(26, 14, 8),
    matLib.get(0x6a6458, 0.99),
  );
  cliff.position.set(0, 7, -3);
  cliff.castShadow = true;
  g.add(cliff);
  return g;
}

export function buildPontDeFer(span = 40): THREE.Group {
  const g = new THREE.Group();
  g.name = "pont_de_fer";
  const steel = matLib.get(0x4a5a52, 0.55, 0.7);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, span), matLib.get(0x4a4844, 0.95));
  deck.position.y = 3.6;
  deck.receiveShadow = true;
  deck.castShadow = true;
  g.add(deck);
  const height = 6.4;
  const panelCount = 7;
  const panelLen = span / panelCount;
  for (const side of [-3.1, 3.1]) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, span), steel);
    top.position.set(side, 3.6 + height, 0);
    top.castShadow = true;
    g.add(top);
    for (let i = 0; i <= panelCount; i++) {
      const z = -span / 2 + i * panelLen;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, height, 0.2), steel);
      post.position.set(side, 3.6 + height / 2, z);
      post.castShadow = true;
      g.add(post);
    }
    const diagLen = Math.hypot(panelLen, height);
    const diagAngle = Math.atan2(height, panelLen);
    for (let i = 0; i < panelCount; i++) {
      const z = -span / 2 + i * panelLen + panelLen / 2;
      const dir = i % 2 === 0 ? 1 : -1;
      const diag = new THREE.Mesh(new THREE.BoxGeometry(0.14, diagLen, 0.14), steel);
      diag.position.set(side, 3.6 + height / 2, z);
      diag.rotation.x = dir * diagAngle;
      g.add(diag);
    }
  }
  const conc = matLib.get(0x8a8880, 0.96);
  for (const z of [span / 2 + 1.6, -span / 2 - 1.6]) {
    const ab = new THREE.Mesh(new THREE.BoxGeometry(8.5, 6.5, 3.5), conc);
    ab.position.set(0, 0.4, z);
    ab.castShadow = true;
    g.add(ab);
  }
  return g;
}

export function buildGorge(length = 220, angle = 0.3): THREE.Group {
  const g = new THREE.Group();
  const rng = makeRng(1847);
  const rock = matLib.get(0x7a7468, 0.98);
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  const perpX = -dirZ;
  const perpZ = dirX;
  const segs = 18;
  for (const side of [-1, 1]) {
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs - 0.5) * length;
      const wobble = Math.sin(i * 0.42) * 4;
      const halfW = 10 + Math.sin(i * 0.31) * 2.4;
      const bx = dirX * t + perpX * wobble;
      const bz = dirZ * t + perpZ * wobble;
      pos.push(bx + perpX * side * (halfW + 6), 1.4 + rng() * 0.8, bz + perpZ * side * (halfW + 6));
      pos.push(bx + perpX * side * halfW, -7.2, bz + perpZ * side * halfW);
      if (i < segs) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const wall = new THREE.Mesh(geo, rock);
    wall.castShadow = true;
    (wall.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    g.add(wall);
  }
  const riverPos: number[] = [];
  const riverIdx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs - 0.5) * length;
    const wobble = Math.sin(i * 0.42) * 4;
    const halfW = 10 + Math.sin(i * 0.31) * 2.4;
    const bx = dirX * t + perpX * wobble;
    const bz = dirZ * t + perpZ * wobble;
    for (const side of [-1, 1]) {
      riverPos.push(bx + perpX * side * halfW, -5.6, bz + perpZ * side * halfW);
    }
    if (i < segs) {
      const a = i * 2;
      riverIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute("position", new THREE.Float32BufferAttribute(riverPos, 3));
  rgeo.setIndex(riverIdx);
  rgeo.computeVertexNormals();
  const river = new THREE.Mesh(rgeo, matLib.get(0x2a5a5a, 0.12, 0.58));
  river.userData.isGorgeRiver = true;
  g.add(river);
  return g;
}

export function buildPlageParc(radius = 78): THREE.Group {
  const g = new THREE.Group();
  g.name = "plage_lac_carillon";
  const deep = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshStandardMaterial({
      color: 0x1a4a60,
      roughness: 0.06,
      metalness: 0.62,
      transparent: true,
      opacity: 0.9,
    }),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(0, -0.4, -radius * 0.35);
  deep.userData.isLakeWater = true;
  g.add(deep);
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 22),
    matLib.get(0xd8c8a4, 1),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.04, 8);
  beach.receiveShadow = true;
  g.add(beach);
  const dockMat = matLib.get(0x8a7a62, 0.96);
  for (const dx of [-18, 18]) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 16), dockMat);
    dock.position.set(dx, 0.4, -8);
    dock.castShadow = true;
    g.add(dock);
  }
  const boatCols = [0x2a6a48, 0xb03828, 0xe0b038];
  for (let i = 0; i < 5; i++) {
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 4.2, 8),
      matLib.get(boatCols[i % 3], 0.45, 0.15),
    );
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(1, 1, 0.48);
    hull.position.set(i < 3 ? -20 : 20, 0.25, -6 + (i % 3) * 4);
    hull.userData.isBoat = true;
    g.add(hull);
  }
  const centre = new THREE.Mesh(
    new THREE.BoxGeometry(8, 2.8, 6),
    matLib.get(0x6a4a32, 0.95),
  );
  centre.position.set(-32, 1.6, 10);
  centre.castShadow = true;
  g.add(centre);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.16, 7),
    matLib.get(QC_PALETTE.toleVerte, 0.75, 0.2),
  );
  roof.position.set(-32, 3.2, 10);
  g.add(roof);
  return g;
}

export function buildCamping(kind: "tente" | "vr"): THREE.Group {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CircleGeometry(5, 10), matLib.get(0x7a7264, 1));
  pad.rotation.x = -Math.PI / 2;
  g.add(pad);
  if (kind === "tente") {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      matLib.get(0x3a6a4a, 0.92),
    );
    dome.scale.set(1, 0.75, 1.2);
    dome.castShadow = true;
    g.add(dome);
  } else {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 2.2, 6.4),
      matLib.get(0xe8e4dc, 0.55, 0.15),
    );
    body.position.y = 1.5;
    body.castShadow = true;
    g.add(body);
  }
  return g;
}

export function buildQuarry(): THREE.Group {
  const g = new THREE.Group();
  const pit = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 36, 12, 10, 1, true),
    matLib.get(0xc8c0b0, 0.95),
  );
  pit.position.y = -4;
  (pit.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  g.add(pit);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(28, 16),
    matLib.get(0xb8b09e, 0.98),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -10;
  g.add(floor);
  const pile = new THREE.Mesh(
    new THREE.ConeGeometry(8, 6, 8),
    matLib.get(0xd0c8b4, 0.98),
  );
  pile.position.set(40, 3, 8);
  pile.castShadow = true;
  g.add(pile);
  return g;
}

export function buildMoulin(): THREE.Group {
  const g = new THREE.Group();
  const stone = matLib.get(QC_PALETTE.pierreGrise, 0.95);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 10, 10), stone);
  tower.position.y = 5;
  tower.castShadow = true;
  g.add(tower);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 3.2, 10),
    matLib.get(QC_PALETTE.toleRouge, 0.75, 0.2),
  );
  cap.position.y = 11.4;
  g.add(cap);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.6, 8),
    matLib.get(0x4a3828, 0.9),
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.set(3.6, 8.2, 0);
  g.add(hub);
  const sails = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 7.5, 1.1),
      matLib.get(0xe8e0d0, 0.9),
    );
    sail.position.y = 3.6;
    const arm = new THREE.Group();
    arm.add(sail);
    arm.rotation.z = (i * Math.PI) / 2;
    sails.add(arm);
  }
  sails.position.set(4.2, 8.2, 0);
  sails.userData.isMillSails = true;
  g.add(sails);
  return g;
}

export function buildPark(width: number, depth: number): THREE.Group {
  const g = new THREE.Group();
  const lawn = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    matLib.get(0x4a6a3a, 1),
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  g.add(lawn);
  const path = matLib.get(0x9a9086, 0.95);
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(width, 2.6), path);
  p1.rotation.x = -Math.PI / 2;
  p1.position.y = 0.03;
  g.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, depth), path);
  p2.rotation.x = -Math.PI / 2;
  p2.position.y = 0.03;
  g.add(p2);
  const gazeboRoof = new THREE.Mesh(
    new THREE.ConeGeometry(3.8, 2.0, 8),
    matLib.get(QC_PALETTE.toleVerte, 0.75, 0.2),
  );
  gazeboRoof.position.y = 4.4;
  gazeboRoof.castShadow = true;
  g.add(gazeboRoof);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 2.8, 6),
      matLib.get(QC_PALETTE.boisBlanc, 0.9),
    );
    col.position.set(Math.cos(a) * 2.7, 1.5, Math.sin(a) * 2.7);
    g.add(col);
  }
  return g;
}

/** Usine à papier de Donnacona — hall de brique, cheminée, quai, rouleaux. */
export function buildPapeterie(): THREE.Group {
  const g = new THREE.Group();
  g.name = "papeterie_donnacona";
  const brick = matLib.get(0x8f4a38, 0.92);
  const concrete = matLib.get(0x8a8a86, 0.96);
  const steel = matLib.get(0x5a5e62, 0.45, 0.55);
  const tole = matLib.get(QC_PALETTE.toleNoire, 0.88);
  const kraft = matLib.get(0xe8e0d0, 0.92);

  const yard = new THREE.Mesh(new THREE.BoxGeometry(92, 0.12, 48), matLib.get(0x6a6862, 1));
  yard.position.y = 0.04;
  yard.receiveShadow = true;
  g.add(yard);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(52, 11, 18), brick);
  hall.position.set(-6, 5.5, -4);
  hall.castShadow = true;
  hall.receiveShadow = true;
  g.add(hall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(54, 0.4, 20), tole);
  roof.position.set(-6, 11.2, -4);
  g.add(roof);

  for (let i = 0; i < 8; i++) {
    const lit = i % 2 === 0;
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.1),
      lit
        ? matLib.getEmissive(QC_PALETTE.fenetreEclairee, QC_PALETTE.fenetreEclairee, 0.55)
        : matLib.get(QC_PALETTE.fenetre, 0.25, 0.5),
    );
    pane.position.set(-26 + i * 6.2, 5.2, 5.02);
    pane.userData.isWindow = true;
    g.add(pane);
  }

  const machine = new THREE.Mesh(new THREE.BoxGeometry(22, 8.5, 16), matLib.get(0x6a7068, 0.7, 0.25));
  machine.position.set(28, 4.25, -2);
  machine.castShadow = true;
  g.add(machine);
  const machineRoof = new THREE.Mesh(new THREE.BoxGeometry(24, 0.35, 18), steel);
  machineRoof.position.set(28, 8.7, -2);
  g.add(machineRoof);

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 28, 10), matLib.get(0x6a6660, 0.85, 0.2));
  stack.position.set(18, 14, -10);
  stack.castShadow = true;
  g.add(stack);
  const lip = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.7, 1.2, 10),
    matLib.getEmissive(0x3a2a22, 0xff6a20, 0.35),
  );
  lip.position.set(18, 28.4, -10);
  g.add(lip);

  const tank = new THREE.Mesh(new THREE.SphereGeometry(4.2, 10, 8), steel);
  tank.position.set(-36, 13.6, 8);
  g.add(tank);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 8, 10), concrete);
  stem.position.set(-36, 4, 8);
  g.add(stem);

  const dock = new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 8), concrete);
  dock.position.set(8, 0.7, 16);
  dock.castShadow = true;
  g.add(dock);

  for (let i = 0; i < 6; i++) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.4, 10), kraft);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(-8 + (i % 3) * 2.6, 1.15 + Math.floor(i / 3) * 2.2, 15.5);
    roll.castShadow = true;
    g.add(roll);
  }

  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 6.5, 7), matLib.get(0x6a4a28, 0.95));
    log.rotation.z = Math.PI / 2;
    log.position.set(-28, 0.55 + (i % 2) * 0.7, 14 + Math.floor(i / 2) * 1.1);
    log.castShadow = true;
    g.add(log);
  }

  const belt = new THREE.Mesh(new THREE.BoxGeometry(18, 0.18, 1.4), matLib.get(0x2a2a28, 0.7));
  belt.position.set(-4, 2.4, 8.5);
  g.add(belt);

  const office = new THREE.Mesh(new THREE.BoxGeometry(10, 6.2, 8), matLib.get(0x9a9086, 0.9));
  office.position.set(-38, 3.1, -8);
  office.castShadow = true;
  g.add(office);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1.1, 0.12),
    matLib.getEmissive(0x1a3a2a, 0x3dff9a, 0.25),
  );
  sign.position.set(-6, 12.2, 5.2);
  g.add(sign);
  return g;
}
