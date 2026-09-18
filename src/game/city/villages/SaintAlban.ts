// ═══════════════════════════════════════════════════════════════════════════
//  SAINT-ALBAN — MODULE DE VILLAGE DÉTAILLÉ
//  src/world/villages/SaintAlban.ts
//
//  Saint-Alban de Portneuf, ~1200 résidents. Le village en entonnoir.
//
//  Trois strates qui structurent tout :
//
//    SUD AGRICOLE     — le noyau villageois dans la plaine, la rivière
//                       Sainte-Anne qui serpente, les fermes laitières
//
//    L'ÉBOULIS DE 1894 — le 27 avril 1894, plus de 6 km² de sol se sont
//                       déplacés d'un coup. L'un des plus gros glissements
//                       documentés au Canada. La rivière a changé de lit.
//                       Aujourd'hui : vallées effondrées, escarpements,
//                       blocs erratiques et un réseau de grottes.
//
//    NORD SAUVAGE     — la Route des Lacs monte dans les contreforts des
//                       Laurentides vers le Parc naturel régional de
//                       Portneuf (73 km²) : lacs Carillon, Blanc, Long,
//                       Montauban, la plage, le camping.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { buildBuilding, matLib, QC_PALETTE } from '../QuebecArchitecture';

// ─────────────────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

export interface SaintAlbanConfig {
  /** Centre du noyau villageois. */
  center: [number, number];
  /** Orientation de la rue principale. */
  roadAngle: number;
  /** Direction dans laquelle la Route des Lacs monte vers le nord. */
  lakeRoadAngle: number;
  heightFn?: (x: number, z: number) => number;
  litRatio?: number;
  /** Le Trou du Diable est-il rattaché à ce village ? */
  includeTrouDuDiable?: boolean;
  season?: 'ete' | 'automne' | 'hiver';
}

export const DEFAULT_CONFIG: SaintAlbanConfig = {
  center: [-3200, -2400],
  roadAngle: 0.9,
  lakeRoadAngle: -1.35,     // monte vers le nord-ouest
  litRatio: 0,
  includeTrouDuDiable: true,
  season: 'ete',
};

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  PALETTE LOCALE
// ─────────────────────────────────────────────────────────────────────────

const SA_PALETTE = {
  argileEboulis: 0x8a7a64,      // argile mise à nu par le glissement
  argileFraiche: 0x9a8a70,
  rocEscarpe: 0x6a6458,
  sableePlage: 0xd8c8a4,
  eauLac: 0x2a6a84,             // lacs très clairs du parc
  eauProfonde: 0x1a4a60,
  boisChalet: 0x6a4a32,
  toileTente: 0x3a6a4a,
  toileTenteRouge: 0x9a4030,
  vrBlanc: 0xe8e4dc,
  quaiFlottant: 0x8a7a62,
  canotVert: 0x2a6a48,
  canotRouge: 0xb03828,
  kayakJaune: 0xe0b038,
  rabaska: 0x7a5030,
};

// ═══════════════════════════════════════════════════════════════════════════
//  L'ÉBOULIS DE 1894 — la cicatrice
//  Un glissement de terrain en argile Champlain : le sol s'est liquéfié et
//  a coulé, laissant une dépression aux parois abruptes et un fond chaotique.
// ═══════════════════════════════════════════════════════════════════════════

export function buildEboulis1894(
  length = 420,
  width = 260,
  angle = 0.6
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'eboulis_1894';

  const rng = makeRng(1894);
  const argileMat = matLib.get(SA_PALETTE.argileEboulis, 0.99);
  const argileFraiche = matLib.get(SA_PALETTE.argileFraiche, 0.98);
  const rocMat = matLib.get(SA_PALETTE.rocEscarpe, 0.98);

  const dirX = Math.cos(angle), dirZ = Math.sin(angle);
  const perpX = -dirZ, perpZ = dirX;

  // ── LA DÉPRESSION ──
  // Maillage déformé : parois abruptes en couronne, fond chaotique.
  const segsU = 40, segsV = 26;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const cArgile = new THREE.Color(SA_PALETTE.argileEboulis);
  const cFraiche = new THREE.Color(SA_PALETTE.argileFraiche);
  const cHerbe = new THREE.Color(0x5a7a42);

  for (let v = 0; v <= segsV; v++) {
    for (let u = 0; u <= segsU; u++) {
      const tu = u / segsU;
      const tv = v / segsV;

      // Coordonnées locales dans le rectangle de l'éboulis
      const lx = (tu - 0.5) * length;
      const lz = (tv - 0.5) * width;

      // Profondeur : creux au centre, remontée sur les bords
      const edgeU = Math.abs(tu - 0.5) * 2;   // 0 au centre, 1 aux bords
      const edgeV = Math.abs(tv - 0.5) * 2;
      const edge = Math.max(edgeU, edgeV);

      // Courbe abrupte : les parois d'un glissement en argile sont raides
      const basin = Math.pow(1 - edge, 0.55);
      let depth = -basin * 22;

      // Fond chaotique — blocs d'argile désordonnés, comme dans la réalité
      if (edge < 0.85) {
        depth += Math.sin(lx * 0.055) * Math.cos(lz * 0.07) * 3.2;
        depth += Math.sin(lx * 0.14 + 1.3) * 1.4;
        depth += (rng() - 0.5) * 1.8;
      }

      // Bourrelet de compression en aval (le sol poussé devant la coulée)
      if (tu > 0.86) {
        depth += (tu - 0.86) * 42;
      }

      const wx = dirX * lx + perpX * lz;
      const wz = dirZ * lx + perpZ * lz;
      positions.push(wx, depth, wz);

      // Coloration : argile nue au fond, herbe qui a repris sur les bords
      const c = new THREE.Color();
      if (edge > 0.88) {
        c.copy(cHerbe);
      } else if (edge > 0.7) {
        c.lerpColors(cArgile, cHerbe, (edge - 0.7) / 0.18);
      } else {
        c.lerpColors(cFraiche, cArgile, basin);
      }
      c.offsetHSL(0, 0, (rng() - 0.5) * 0.05);
      colors.push(c.r, c.g, c.b);

      if (u < segsU && v < segsV) {
        const a = v * (segsU + 1) + u;
        const b = a + segsU + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const basin = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, metalness: 0, flatShading: true,
    })
  );
  basin.receiveShadow = true;
  basin.castShadow = true;
  g.add(basin);

  // ── ESCARPEMENT DE TÊTE ──
  // La paroi verticale laissée en amont, là où le sol s'est détaché.
  const scarpPts: number[] = [];
  const scarpIdx: number[] = [];
  const scarpSegs = 24;

  for (let i = 0; i <= scarpSegs; i++) {
    const t = i / scarpSegs;
    const lz = (t - 0.5) * width * 0.95;
    // Le front de rupture n'est pas droit : il ondule
    const lx = -length / 2 - Math.sin(t * Math.PI * 2.2) * 14;

    const wx = dirX * lx + perpX * lz;
    const wz = dirZ * lx + perpZ * lz;

    scarpPts.push(wx, 9 + Math.sin(t * 5) * 2.2, wz);   // sommet
    scarpPts.push(wx + dirX * 12, -16, wz + dirZ * 12); // pied

    if (i < scarpSegs) {
      const a = i * 2;
      scarpIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const scarpGeo = new THREE.BufferGeometry();
  scarpGeo.setAttribute('position', new THREE.Float32BufferAttribute(scarpPts, 3));
  scarpGeo.setIndex(scarpIdx);
  scarpGeo.computeVertexNormals();

  const scarp = new THREE.Mesh(scarpGeo, rocMat);
  scarp.material.side = THREE.DoubleSide;
  scarp.castShadow = true;
  scarp.receiveShadow = true;
  g.add(scarp);

  // ── BLOCS ERRATIQUES ──
  // Des pans de terrain intacts transportés par la coulée. Sur les vraies
  // photos de 1894, on voit des morceaux de champ encore couverts d'herbe.
  const blockGeo = new THREE.DodecahedronGeometry(1, 0);
  const blockCount = 34;
  const blockInst = new THREE.InstancedMesh(blockGeo, argileMat, blockCount);
  const grassBlockInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.3, 1),
    matLib.get(0x5a7a42, 1),
    12
  );
  const dummy = new THREE.Object3D();

  for (let i = 0; i < blockCount; i++) {
    const lx = (rng() - 0.35) * length * 0.8;
    const lz = (rng() - 0.5) * width * 0.7;
    const wx = dirX * lx + perpX * lz;
    const wz = dirZ * lx + perpZ * lz;

    dummy.position.set(wx, -14 + rng() * 8, wz);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(1.2 + rng() * 3.4);
    dummy.updateMatrix();
    blockInst.setMatrixAt(i, dummy.matrix);
  }
  blockInst.instanceMatrix.needsUpdate = true;
  blockInst.castShadow = true;
  blockInst.receiveShadow = true;
  g.add(blockInst);

  // Pans de prairie transportés intacts
  for (let i = 0; i < 12; i++) {
    const lx = (rng() - 0.3) * length * 0.7;
    const lz = (rng() - 0.5) * width * 0.6;
    const wx = dirX * lx + perpX * lz;
    const wz = dirZ * lx + perpZ * lz;

    dummy.position.set(wx, -12 + rng() * 6, wz);
    dummy.rotation.set((rng() - 0.5) * 0.6, rng() * Math.PI, (rng() - 0.5) * 0.6);
    dummy.scale.set(4 + rng() * 7, 1, 4 + rng() * 7);
    dummy.updateMatrix();
    grassBlockInst.setMatrixAt(i, dummy.matrix);
  }
  grassBlockInst.instanceMatrix.needsUpdate = true;
  grassBlockInst.receiveShadow = true;
  g.add(grassBlockInst);

  // ── ARBRES BASCULÉS ──
  // Emportés par la coulée, ils sont couchés dans tous les sens.
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.42, 9, 6);
  const trunkInst = new THREE.InstancedMesh(
    trunkGeo, matLib.get(0x4a3828, 0.98), 26
  );
  for (let i = 0; i < 26; i++) {
    const lx = (rng() - 0.4) * length * 0.75;
    const lz = (rng() - 0.5) * width * 0.65;
    const wx = dirX * lx + perpX * lz;
    const wz = dirZ * lx + perpZ * lz;

    dummy.position.set(wx, -13 + rng() * 7, wz);
    // Couchés, avec des angles chaotiques
    dummy.rotation.set(
      Math.PI / 2 + (rng() - 0.5) * 0.9,
      rng() * Math.PI * 2,
      (rng() - 0.5) * 0.7
    );
    dummy.scale.setScalar(0.7 + rng() * 0.6);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  trunkInst.castShadow = true;
  g.add(trunkInst);

  // ── PANNEAU COMMÉMORATIF ──
  const monument = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.5, 1.4),
    matLib.get(QC_PALETTE.pierreGrise, 0.96)
  );
  base.position.y = 0.25;
  monument.add(base);

  const stele = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.1, 0.35),
    matLib.get(QC_PALETTE.pierreChamps, 0.95)
  );
  stele.position.y = 1.55;
  stele.castShadow = true;
  monument.add(stele);

  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.4, 0.06),
    matLib.get(0x7a6a4a, 0.5, 0.6)
  );
  plaque.position.set(0, 1.7, 0.2);
  monument.add(plaque);

  monument.position.set(
    dirX * (-length / 2 - 22) + perpX * 8,
    10,
    dirZ * (-length / 2 - 22) + perpZ * 8
  );
  g.add(monument);

  // ── BELVÉDÈRE D'OBSERVATION ──
  const belvedere = new THREE.Group();
  const woodMat = matLib.get(0x7a5a3a, 0.96);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.16, 4), woodMat);
  deck.position.y = 1.2;
  deck.receiveShadow = true;
  deck.castShadow = true;
  belvedere.add(deck);

  for (const [px, pz] of [[-2.6, -1.6], [2.6, -1.6], [-2.6, 1.6], [2.6, 1.6]] as Array<[number, number]>) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 2.4, 7), woodMat
    );
    post.position.set(px, 0.4, pz);
    post.castShadow = true;
    belvedere.add(post);
  }

  // Garde-corps côté vide
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(6, 0.09, 0.09), woodMat);
  railTop.position.set(0, 2.3, 1.9);
  belvedere.add(railTop);
  for (let i = 0; i < 9; i++) {
    const baluster = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.05, 0.06), woodMat
    );
    baluster.position.set(-2.8 + i * 0.7, 1.8, 1.9);
    belvedere.add(baluster);
  }

  belvedere.position.set(
    dirX * (-length / 2 - 16) + perpX * -22,
    9,
    dirZ * (-length / 2 - 16) + perpZ * -22
  );
  belvedere.rotation.y = -angle + Math.PI;
  g.add(belvedere);

  g.userData.landmark = 'eboulis_1894';
  g.userData.poiName = 'Éboulis du 27 avril 1894';
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ENTRÉE DE GROTTE — le réseau creusé dans les escarpements de l'éboulis
// ═══════════════════════════════════════════════════════════════════════════

export function buildCaveEntrance(name = 'Grotte'): THREE.Group {
  const g = new THREE.Group();
  g.name = 'grotte';

  const rockMat = matLib.get(SA_PALETTE.rocEscarpe, 0.99);
  const rockDark = matLib.get(0x38342e, 0.99);
  const shadowMat = matLib.get(0x080706, 1);

  // Affleurement rocheux
  const outcropGeo = new THREE.BoxGeometry(16, 11, 8, 8, 6, 4);
  const pos = outcropGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const strata = Math.sin(y * 1.9) * 0.45;
    pos.setX(i, pos.getX(i) + strata + (Math.random() - 0.5) * 0.35);
    pos.setZ(i, pos.getZ(i) + strata * 0.5 + (Math.random() - 0.5) * 0.3);
  }
  outcropGeo.computeVertexNormals();

  const outcrop = new THREE.Mesh(outcropGeo, rockMat);
  outcrop.position.y = 5.5;
  outcrop.castShadow = true;
  outcrop.receiveShadow = true;
  g.add(outcrop);

  // Ouverture — fissure irrégulière, pas un trou rond
  const mouth = new THREE.Shape();
  mouth.moveTo(-1.5, 0);
  mouth.lineTo(-1.8, 0.9);
  mouth.lineTo(-1.1, 2.0);
  mouth.lineTo(-0.2, 2.5);
  mouth.lineTo(0.9, 2.1);
  mouth.lineTo(1.5, 1.2);
  mouth.lineTo(1.3, 0.3);
  mouth.lineTo(0.8, 0);
  mouth.closePath();

  const mouthMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(mouth, {
      depth: 6, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.2,
    }),
    shadowMat
  );
  mouthMesh.position.set(0, 0.1, 3.8);
  mouthMesh.rotation.y = Math.PI;
  g.add(mouthMesh);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.0, 0.42, 6, 12, Math.PI * 1.4), rockDark
  );
  rim.position.set(0, 1.4, 4.2);
  rim.rotation.z = 0.4;
  g.add(rim);

  // Éboulis au pied
  const rng = makeRng(name.length * 137);
  const boulderInst = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    matLib.get(0x7a7468, 0.99),
    16
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 16; i++) {
    const a = (rng() - 0.5) * Math.PI;
    const d = 3.5 + rng() * 8;
    dummy.position.set(Math.sin(a) * d, 0.3 + rng() * 0.5, 4 + Math.cos(a) * d * 0.5);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(0.4 + rng() * 1.2);
    dummy.updateMatrix();
    boulderInst.setMatrixAt(i, dummy.matrix);
  }
  boulderInst.instanceMatrix.needsUpdate = true;
  boulderInst.castShadow = true;
  g.add(boulderInst);

  // Panneau spéléo
  const signPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.9, 6),
    matLib.get(0x4a3a28, 0.95)
  );
  signPost.position.set(2.6, 0.95, 10);
  g.add(signPost);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.06),
    matLib.get(0x3a5a42, 0.85)
  );
  sign.position.set(2.6, 1.9, 10);
  sign.castShadow = true;
  g.add(sign);

  g.userData.landmark = 'grotte';
  g.userData.poiName = name;
  g.userData.caveEntrance = new THREE.Vector3(0, 1.2, 4);
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LA PLAGE DU PARC RÉGIONAL — Lac Carillon
//  Sable en pente douce, eau claire, quais de location, sanitaires,
//  aires de pique-nique sous couvert forestier.
// ═══════════════════════════════════════════════════════════════════════════

export function buildPlageParc(lakeRadius = 130): THREE.Group {
  const g = new THREE.Group();
  g.name = 'plage_lac_carillon';

  const rng = makeRng(7373);

  // ── LE LAC ──
  // Deux plans : eau claire près du bord, plus foncée au large.
  const shallowGeo = new THREE.CircleGeometry(lakeRadius * 0.45, 48);
  shallowGeo.rotateX(-Math.PI / 2);
  const shallow = new THREE.Mesh(
    shallowGeo,
    new THREE.MeshStandardMaterial({
      color: SA_PALETTE.eauLac, roughness: 0.08, metalness: 0.55,
      transparent: true, opacity: 0.86,
    })
  );
  shallow.position.set(0, -0.15, -lakeRadius * 0.5);
  shallow.userData.isLakeWater = true;
  g.add(shallow);

  const deepGeo = new THREE.CircleGeometry(lakeRadius, 56);
  deepGeo.rotateX(-Math.PI / 2);
  const deep = new THREE.Mesh(
    deepGeo,
    new THREE.MeshStandardMaterial({
      color: SA_PALETTE.eauProfonde, roughness: 0.05, metalness: 0.65,
      transparent: true, opacity: 0.92,
    })
  );
  deep.position.set(0, -0.35, -lakeRadius * 0.8);
  deep.userData.isLakeWater = true;
  g.add(deep);

  // ── LA PLAGE DE SABLE ──
  // Pente douce : le maillage descend progressivement vers l'eau.
  const beachW = 90, beachD = 34;
  const beachGeo = new THREE.PlaneGeometry(beachW, beachD, 30, 12);
  beachGeo.rotateX(-Math.PI / 2);
  const bp = beachGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const z = bp.getZ(i);
    // Descend vers le lac (z négatif)
    const t = (z + beachD / 2) / beachD;
    bp.setY(i, (1 - t) * 1.6 - 0.4 + (Math.random() - 0.5) * 0.12);
  }
  beachGeo.computeVertexNormals();

  const beach = new THREE.Mesh(beachGeo, matLib.get(SA_PALETTE.sableePlage, 1));
  beach.position.set(0, 0, 4);
  beach.receiveShadow = true;
  g.add(beach);

  // ── QUAIS DE LOCATION ──
  const dockMat = matLib.get(SA_PALETTE.quaiFlottant, 0.96);

  for (const [dx, dlen] of [[-26, 22], [26, 18]] as Array<[number, number]>) {
    const dock = new THREE.Group();

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.16, dlen), dockMat
    );
    deck.position.y = 0.45;
    deck.receiveShadow = true;
    deck.castShadow = true;
    dock.add(deck);

    // Flotteurs
    const floatCount = Math.floor(dlen / 3);
    const floatGeo = new THREE.BoxGeometry(2.6, 0.4, 2.2);
    const floatInst = new THREE.InstancedMesh(
      floatGeo, matLib.get(0x5a6068, 0.85), floatCount
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < floatCount; i++) {
      dummy.position.set(0, 0.15, -dlen / 2 + 1.5 + i * 3);
      dummy.updateMatrix();
      floatInst.setMatrixAt(i, dummy.matrix);
    }
    floatInst.instanceMatrix.needsUpdate = true;
    dock.add(floatInst);

    // Taquets d'amarrage
    for (let i = 0; i < 4; i++) {
      const cleat = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.12, 0.1),
        matLib.get(0x3a3a40, 0.6, 0.5)
      );
      cleat.position.set(1.1, 0.6, -dlen / 2 + 3 + i * (dlen / 4));
      dock.add(cleat);
    }

    dock.position.set(dx, 0, -18);
    g.add(dock);
  }

  // ── EMBARCATIONS DE LOCATION ──
  const boatColors = [
    SA_PALETTE.canotVert, SA_PALETTE.canotRouge,
    SA_PALETTE.kayakJaune, 0x3a6a90, 0xd06830,
  ];

  // Canots amarrés
  for (let i = 0; i < 8; i++) {
    const canoe = new THREE.Group();
    const color = boatColors[i % boatColors.length];

    // Coque effilée
    const hull = new THREE.Mesh(
      new THREE.CapsuleGeometry
        ? new THREE.CylinderGeometry(0.42, 0.42, 4.6, 8)
        : new THREE.CylinderGeometry(0.42, 0.42, 4.6, 8),
      matLib.get(color, 0.45, 0.15)
    );
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(1, 1, 0.5);
    hull.position.y = 0.2;
    canoe.add(hull);

    // Proue et poupe pointues
    for (const side of [-1, 1]) {
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 1.1, 8),
        matLib.get(color, 0.45, 0.15)
      );
      tip.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      tip.scale.set(1, 1, 0.5);
      tip.position.set(0, 0.2, side * 2.75);
      canoe.add(tip);
    }

    // Bancs
    for (const bz of [-1.2, 1.2]) {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.06, 0.24),
        matLib.get(0x9a8a6a, 0.9)
      );
      seat.position.set(0, 0.38, bz);
      canoe.add(seat);
    }

    const side = i < 4 ? -1 : 1;
    canoe.position.set(
      side * 26 + side * 2.2,
      0,
      -24 + (i % 4) * 4.5
    );
    canoe.rotation.y = (rng() - 0.5) * 0.18;
    canoe.userData.isBoat = true;
    g.add(canoe);
  }

  // ── LE RABASKA ──
  // Grand canot d'écorce, 10 places. La pièce maîtresse du centre de location.
  const rabaska = new THREE.Group();
  const rabMat = matLib.get(SA_PALETTE.rabaska, 0.75);

  const rabHull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 8.5, 10), rabMat
  );
  rabHull.rotation.x = Math.PI / 2;
  rabHull.scale.set(1, 1, 0.55);
  rabHull.position.y = 0.35;
  rabHull.castShadow = true;
  rabaska.add(rabHull);

  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.2, 10), rabMat);
    tip.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    tip.scale.set(1, 1, 0.55);
    tip.position.set(0, 0.5, side * 5.3);
    rabaska.add(tip);
  }

  for (let i = 0; i < 5; i++) {
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.07, 0.28),
      matLib.get(0x9a8a6a, 0.9)
    );
    bench.position.set(0, 0.62, -3.2 + i * 1.6);
    rabaska.add(bench);
  }

  rabaska.position.set(0, 0, -26);
  rabaska.userData.isBoat = true;
  g.add(rabaska);

  // Kayaks empilés sur des supports
  const rackMat = matLib.get(0x5a5e62, 0.6, 0.5);
  for (let r = 0; r < 2; r++) {
    const rack = new THREE.Group();
    for (const px of [-1.4, 1.4]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 1.6, 0.09), rackMat
      );
      post.position.set(px, 0.8, 0);
      rack.add(post);
    }
    for (let level = 0; level < 3; level++) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.07, 0.6), rackMat
      );
      arm.position.set(0, 0.45 + level * 0.45, 0);
      rack.add(arm);

      const kayak = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 3.4, 8),
        matLib.get(boatColors[(r * 3 + level) % boatColors.length], 0.45, 0.2)
      );
      kayak.rotation.z = Math.PI / 2;
      kayak.scale.set(1, 1, 0.55);
      kayak.position.set(0, 0.62 + level * 0.45, 0);
      kayak.castShadow = true;
      rack.add(kayak);
    }
    rack.position.set(-40 + r * 8, 0.6, 2);
    g.add(rack);
  }

  // ── CENTRE DE LOCATION ──
  const centre = new THREE.Group();
  const chaletMat = matLib.get(SA_PALETTE.boisChalet, 0.95);

  const body = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 7), chaletMat);
  body.position.y = 1.6;
  body.castShadow = true;
  body.receiveShadow = true;
  centre.add(body);

  // Toit à deux versants
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.14, 7.8),
      matLib.get(QC_PALETTE.toleVerte, 0.75, 0.2)
    );
    panel.position.set(side * 2.7, 4.3, 0);
    panel.rotation.z = side * -0.48;
    panel.castShadow = true;
    centre.add(panel);
  }

  // Comptoir de service ouvert
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1.1, 0.5),
    matLib.get(0x8a6a4a, 0.9)
  );
  counter.position.set(0, 0.9, 3.6);
  centre.add(counter);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.12, 2.2),
    matLib.get(QC_PALETTE.toleVerte, 0.75, 0.2)
  );
  awning.position.set(0, 2.9, 4.4);
  awning.rotation.x = -0.12;
  awning.castShadow = true;
  centre.add(awning);

  centre.position.set(-38, 1.2, 12);
  g.add(centre);

  // ── BLOC SANITAIRE ──
  const sanitaire = new THREE.Group();
  const sanBody = new THREE.Mesh(
    new THREE.BoxGeometry(8, 2.9, 5),
    matLib.get(QC_PALETTE.boisCreme, 0.94)
  );
  sanBody.position.y = 1.45;
  sanBody.castShadow = true;
  sanitaire.add(sanBody);

  const sanRoof = new THREE.Mesh(
    new THREE.BoxGeometry(8.8, 0.2, 5.8),
    matLib.get(QC_PALETTE.toleVerte, 0.75, 0.2)
  );
  sanRoof.position.y = 3.0;
  sanitaire.add(sanRoof);

  for (const [dx, color] of [[-1.8, 0x4a6a9a], [1.8, 0x9a4a6a]] as Array<[number, number]>) {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 2.0, 0.1),
      matLib.get(color, 0.85)
    );
    door.position.set(dx, 1.0, 2.55);
    sanitaire.add(door);
  }

  sanitaire.position.set(36, 1.2, 14);
  g.add(sanitaire);

  // ── AIRES DE PIQUE-NIQUE SOUS COUVERT FORESTIER ──
  for (let i = 0; i < 7; i++) {
    const table = buildPicnicTable();
    const a = -0.9 + (i / 7) * 1.8;
    const d = 30 + rng() * 22;
    table.position.set(Math.sin(a) * d * 1.6, 1.2, 16 + Math.cos(a) * 10);
    table.rotation.y = rng() * Math.PI;
    g.add(table);
  }

  // ── BOUÉES DE DÉLIMITATION DE BAIGNADE ──
  const buoyGeo = new THREE.SphereGeometry(0.28, 8, 6);
  const buoyMat = matLib.get(0xe04030, 0.5, 0.2);
  const buoyInst = new THREE.InstancedMesh(buoyGeo, buoyMat, 14);
  const dummy2 = new THREE.Object3D();
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    dummy2.position.set(-38 + t * 76, 0.1, -30 - Math.sin(t * Math.PI) * 5);
    dummy2.updateMatrix();
    buoyInst.setMatrixAt(i, dummy2.matrix);
  }
  buoyInst.instanceMatrix.needsUpdate = true;
  buoyInst.userData.isBuoy = true;
  g.add(buoyInst);

  // ── CHAISE DE SAUVETEUR ──
  const chair = new THREE.Group();
  const chairMat = matLib.get(0xd8d0b8, 0.92);
  for (const [px, pz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]] as Array<[number, number]>) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), chairMat);
    leg.position.set(px, 1.3, pz);
    chair.add(leg);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.6), chairMat);
  seat.position.y = 2.6;
  seat.castShadow = true;
  chair.add(seat);
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.1), chairMat);
  backrest.position.set(0, 3.15, -0.75);
  chair.add(backrest);
  chair.position.set(0, 0.9, -6);
  g.add(chair);

  g.userData.landmark = 'plage_parc';
  g.userData.poiName = 'Plage du lac Carillon';
  return g;
}

function buildPicnicTable(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = matLib.get(0x8a7050, 0.96);

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.8), woodMat);
  top.position.y = 0.74;
  top.castShadow = true;
  g.add(top);

  for (const side of [-1, 1]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.3), woodMat);
    bench.position.set(0, 0.45, side * 0.72);
    g.add(bench);
  }

  for (const px of [-0.7, 0.7]) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), woodMat);
      leg.position.set(px, 0.39, side * 0.5);
      leg.rotation.x = side * 0.32;
      g.add(leg);
    }
  }

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMPING — sites en tentes, prêt-à-camper, VR
// ═══════════════════════════════════════════════════════════════════════════

export function buildCampingSite(kind: 'tente' | 'pret_a_camper' | 'vr'): THREE.Group {
  const g = new THREE.Group();
  g.name = `camping_${kind}`;

  const rng = makeRng(kind.length * 991);

  // Emplacement en gravier
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(6, 12),
    matLib.get(0x7a7264, 1)
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  pad.receiveShadow = true;
  g.add(pad);

  if (kind === 'tente') {
    // Tente dôme
    const tent = new THREE.Group();
    const color = rng() > 0.5 ? SA_PALETTE.toileTente : SA_PALETTE.toileTenteRouge;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      matLib.get(color, 0.92)
    );
    dome.scale.set(1, 0.78, 1.25);
    dome.castShadow = true;
    tent.add(dome);

    // Auvent
    const vestibule = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.1, 6, 1, true),
      matLib.get(color, 0.92)
    );
    vestibule.rotation.x = Math.PI / 2;
    vestibule.position.set(0, 0.5, 1.7);
    tent.add(vestibule);

    tent.position.set(-1.5, 0, 0);
    g.add(tent);

  } else if (kind === 'pret_a_camper') {
    // Tente-roulotte sur plateforme de bois
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.3, 3.5),
      matLib.get(0x7a5a3a, 0.96)
    );
    platform.position.y = 0.35;
    platform.receiveShadow = true;
    platform.castShadow = true;
    g.add(platform);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 1.5, 3),
      matLib.get(0xd8d0b8, 0.92)
    );
    walls.position.y = 1.25;
    walls.castShadow = true;
    g.add(walls);

    // Toit de toile tendu
    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.08, 3.4),
        matLib.get(SA_PALETTE.toileTente, 0.92)
      );
      roof.position.set(side * 1.05, 2.35, 0);
      roof.rotation.z = side * -0.42;
      roof.castShadow = true;
      g.add(roof);
    }

    // Petite galerie
    const steps = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.14, 0.7),
      matLib.get(0x7a5a3a, 0.96)
    );
    steps.position.set(0, 0.15, 2.1);
    g.add(steps);

  } else {
    // Véhicule récréatif
    const vr = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.5, 7.5),
      matLib.get(SA_PALETTE.vrBlanc, 0.55, 0.15)
    );
    body.position.y = 1.9;
    body.castShadow = true;
    vr.add(body);

    // Bande décorative
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.65, 0.35, 7.5),
      matLib.get(0x5a7a9a, 0.5, 0.2)
    );
    stripe.position.y = 1.5;
    vr.add(stripe);

    // Cabine
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.6, 2),
      matLib.get(SA_PALETTE.vrBlanc, 0.55, 0.15)
    );
    cab.position.set(0, 1.4, 4.4);
    vr.add(cab);

    const windshield = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 1.1),
      matLib.get(0x506878, 0.15, 0.6)
    );
    windshield.position.set(0, 1.6, 5.42);
    vr.add(windshield);

    // Auvent déployé
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 5),
      matLib.get(0x8a8e92, 0.6, 0.5)
    );
    awning.position.set(1.35, 3.0, 0);
    vr.add(awning);

    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 5),
      matLib.get(0xc8d4c0, 0.9)
    );
    canvas.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    canvas.position.set(2.6, 2.85, 0);
    vr.add(canvas);

    // Roues
    for (const [wx, wz] of [[-1.2, 2.6], [1.2, 2.6], [-1.2, -2.2], [1.2, -2.2]] as Array<[number, number]>) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10),
        matLib.get(0x1a1a1e, 0.95)
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.5, wz);
      vr.add(wheel);
    }

    vr.position.set(0, 0, 0);
    g.add(vr);
  }

  // ── FEU DE CAMP ──
  const fire = new THREE.Group();
  const ringMat = matLib.get(0x54514d, 0.99);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.22, 0), ringMat
    );
    stone.position.set(Math.cos(a) * 0.65, 0.15, Math.sin(a) * 0.65);
    stone.rotation.set(rng(), rng(), rng());
    stone.scale.setScalar(0.8 + rng() * 0.5);
    fire.add(stone);
  }

  // Bûches croisées
  const logMat = matLib.get(0x4a3626, 0.98);
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), logMat
    );
    log.rotation.set(0.35, (i / 4) * Math.PI, Math.PI / 2 - 0.35);
    log.position.set(0, 0.22, 0);
    fire.add(log);
  }

  // Braises émissives
  const embers = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 10),
    matLib.emissive
      ? matLib.get(0xff6820, 0.4)
      : matLib.get(0xff6820, 0.4)
  );
  embers.rotation.x = -Math.PI / 2;
  embers.position.y = 0.09;
  embers.userData.isEmbers = true;
  fire.add(embers);

  const fireLight = new THREE.PointLight(0xff8830, 0, 9, 2);
  fireLight.position.set(0, 0.6, 0);
  fireLight.userData.isCampfireLight = true;
  fire.add(fireLight);

  fire.position.set(2.8, 0, 2.2);
  g.add(fire);

  // Table de pique-nique
  const table = buildPicnicTable();
  table.position.set(-2.6, 0, 2.8);
  table.rotation.y = rng() * Math.PI;
  g.add(table);

  // Corde à linge entre deux arbres
  g.userData.campKind = kind;
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ASSEMBLAGE COMPLET
// ═══════════════════════════════════════════════════════════════════════════

export interface SaintAlbanResult {
  group: THREE.Group;
  center: THREE.Vector3;
  radius: number;
  buildings: THREE.Group[];
  pointsOfInterest: Array<{
    id: string; name: string; type: string;
    position: THREE.Vector3; radius: number; description?: string;
  }>;
  /** Tracé de la Route des Lacs — à passer au constructeur de routes. */
  routeDesLacs: Array<[number, number]>;
  /** Zones où la navigation piétonne est possible. */
  walkableAreas: Array<{ minX: number; minZ: number; maxX: number; maxZ: number }>;
  /** Zones infranchissables (l'éboulis, les lacs). */
  blockedAreas: Array<{ minX: number; minZ: number; maxX: number; maxZ: number }>;
}

export function buildSaintAlban(
  config: Partial<SaintAlbanConfig> = {}
): SaintAlbanResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const [cx, cz] = cfg.center;
  const ground = cfg.heightFn ?? (() => 0);
  const lit = cfg.litRatio ?? 0;
  const rng = makeRng(1856);

  const group = new THREE.Group();
  group.name = 'village_saint_alban';

  const angle = cfg.roadAngle;
  const dirX = Math.cos(angle), dirZ = Math.sin(angle);
  const perpX = -dirZ, perpZ = dirX;

  // Direction de la montée vers le nord
  const lakeAngle = cfg.lakeRoadAngle;
  const lakeDirX = Math.cos(lakeAngle), lakeDirZ = Math.sin(lakeAngle);

  const buildings: THREE.Group[] = [];
  const pois: SaintAlbanResult['pointsOfInterest'] = [];
  const walkableAreas: SaintAlbanResult['walkableAreas'] = [];
  const blockedAreas: SaintAlbanResult['blockedAreas'] = [];

  // ═══════════════════════════════════════════════════════════════
  //  SUD — LE NOYAU VILLAGEOIS AGRICOLE
  // ═══════════════════════════════════════════════════════════════

  // ── Église ──
  const eglise = buildBuilding('eglise', { seed: 1856, litRatio: lit });
  eglise.scale.setScalar(0.9);
  const egX = cx + perpX * 28, egZ = cz + perpZ * 28;
  eglise.position.set(egX, ground(egX, egZ), egZ);
  eglise.rotation.y = -angle + Math.PI;
  group.add(eglise);
  buildings.push(eglise);
  pois.push({
    id: 'saint_alban_eglise', name: 'Église Saint-Alban', type: 'church',
    position: new THREE.Vector3(egX, 0, egZ), radius: 20,
  });

  // ── 16 maisons du rang ──
  const coreCount = 16;
  const spacing = 30;
  for (let i = 0; i < coreCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const idx = Math.floor(i / 2);
    const along = (idx - coreCount / 4) * spacing + (rng() - 0.5) * 8;
    const setback = 18 + rng() * 9;

    const px = cx + dirX * along + perpX * side * setback;
    const pz = cz + dirZ * along + perpZ * side * setback;

    const house = buildBuilding(
      rng() > 0.8 ? 'maison_mansardee' : 'maison_canadienne',
      { seed: 1856 + i * 41, litRatio: lit }
    );
    tint(house,
      [QC_PALETTE.boisBlanc, QC_PALETTE.boisCreme, QC_PALETTE.boisRouge][Math.floor(rng() * 3)],
      [QC_PALETTE.toleRouge, QC_PALETTE.toleVerte, QC_PALETTE.toleNoire][Math.floor(rng() * 3)]
    );
    house.position.set(px, ground(px, pz), pz);
    house.rotation.y = -angle + (side > 0 ? Math.PI : 0);
    group.add(house);
    buildings.push(house);
  }

  walkableAreas.push({
    minX: cx - 260, minZ: cz - 60, maxX: cx + 260, maxZ: cz + 60,
  });

  // ── Dépanneur ──
  const dep = buildBuilding('depanneur', { seed: 1857, litRatio: lit });
  const depX = cx + dirX * -76 + perpX * 26;
  const depZ = cz + dirZ * -76 + perpZ * 26;
  dep.position.set(depX, ground(depX, depZ), depZ);
  dep.rotation.y = -angle + Math.PI;
  group.add(dep);
  buildings.push(dep);
  pois.push({
    id: 'saint_alban_depanneur', name: 'Dépanneur de Saint-Alban',
    type: 'shop', position: new THREE.Vector3(depX, 0, depZ), radius: 14,
  });

  // ── École ──
  const ecole = buildBuilding('ecole', { seed: 1858, litRatio: lit });
  const ecX = cx + dirX * 82 + perpX * -30;
  const ecZ = cz + dirZ * 82 + perpZ * -30;
  ecole.position.set(ecX, ground(ecX, ecZ), ecZ);
  ecole.rotation.y = -angle;
  group.add(ecole);
  buildings.push(ecole);

  // ── 7 fermes laitières le long de la Sainte-Anne ──
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI - 0.4;
    const dist = 190 + rng() * 170;
    const fx = cx + Math.cos(a) * dist;
    const fz = cz + Math.sin(a) * dist * 0.7;

    const farmhouse = buildBuilding('maison_canadienne', {
      seed: 1870 + i * 19, litRatio: lit,
    });
    tint(farmhouse, QC_PALETTE.boisBlanc, QC_PALETTE.toleRouge);
    farmhouse.position.set(fx, ground(fx, fz), fz);
    farmhouse.rotation.y = rng() * Math.PI * 2;
    group.add(farmhouse);
    buildings.push(farmhouse);

    // Grange-étable + silo (fermes laitières)
    const barn = buildBuilding('grange', { seed: 1880 + i * 23 });
    const ba = rng() * Math.PI * 2;
    const bx = fx + Math.cos(ba) * 36, bz = fz + Math.sin(ba) * 36;
    barn.position.set(bx, ground(bx, bz), bz);
    barn.rotation.y = rng() * Math.PI * 2;
    group.add(barn);
    buildings.push(barn);

    // Champs de foin
    for (let f = 0; f < 3; f++) {
      const size = 95 + rng() * 75;
      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size * 0.7),
        matLib.get([0x7a8a4a, 0x8a9450, 0x6a7a42][Math.floor(rng() * 3)], 1, 0)
      );
      field.rotation.x = -Math.PI / 2;
      field.rotation.z = rng() * Math.PI;
      const px = fx + (rng() - 0.5) * 150, pz = fz + (rng() - 0.5) * 150;
      field.position.set(px, ground(px, pz) + 0.025, pz);
      field.receiveShadow = true;
      group.add(field);
    }
  }

  // ── La rivière Sainte-Anne qui serpente ──
  addRiviere(group, cx, cz + 90, angle + 0.35, 620, ground);

  // ═══════════════════════════════════════════════════════════════
  //  L'ÉBOULIS DE 1894 — entre le village et le nord
  // ═══════════════════════════════════════════════════════════════

  const eboulisX = cx + lakeDirX * 340 + perpX * 90;
  const eboulisZ = cz + lakeDirZ * 340 + perpZ * 90;

  const eboulis = buildEboulis1894(420, 260, lakeAngle + 0.4);
  eboulis.position.set(eboulisX, ground(eboulisX, eboulisZ) + 4, eboulisZ);
  group.add(eboulis);
  buildings.push(eboulis);

  pois.push({
    id: 'saint_alban_eboulis',
    name: 'Éboulis du 27 avril 1894',
    type: 'site_geologique',
    position: new THREE.Vector3(eboulisX, 0, eboulisZ),
    radius: 70,
    description:
      'Plus de six kilomètres carrés de sol déplacés en une seule journée. ' +
      'L\'un des plus grands glissements de terrain documentés au Canada. ' +
      'La rivière Sainte-Anne a dû changer de lit.',
  });

  // L'éboulis est infranchissable — il faut le contourner
  blockedAreas.push({
    minX: eboulisX - 210, minZ: eboulisZ - 130,
    maxX: eboulisX + 210, maxZ: eboulisZ + 130,
  });

  // ── Grottes dans les escarpements ──
  const caveNames = cfg.includeTrouDuDiable
    ? ['Le Trou du Diable', 'Grotte de la Coulée']
    : ['Grotte de la Coulée', 'Grotte du Rang Nord'];

  caveNames.forEach((name, i) => {
    const cave = buildCaveEntrance(name);
    const ca = lakeAngle + 0.4 + (i === 0 ? -1.3 : 1.2);
    const cd = 230 + i * 70;
    const cvx = eboulisX + Math.cos(ca) * cd;
    const cvz = eboulisZ + Math.sin(ca) * cd;
    cave.position.set(cvx, ground(cvx, cvz), cvz);
    cave.rotation.y = ca + Math.PI;
    group.add(cave);
    buildings.push(cave);

    pois.push({
      id: `saint_alban_grotte_${i}`,
      name, type: 'grotte',
      position: new THREE.Vector3(cvx, 0, cvz), radius: 22,
      description:
        'Réseau souterrain creusé dans les escarpements laissés par ' +
        'l\'éboulis. Exploré par les spéléologues.',
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  LA ROUTE DES LACS — l'artère qui monte vers le nord
  // ═══════════════════════════════════════════════════════════════

  const routeDesLacs: Array<[number, number]> = [];
  const lacDistance = 900;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    // Serpente en montant — un chemin forestier ne va jamais droit
    const wobble = Math.sin(t * Math.PI * 2.6) * 42;
    const d = t * lacDistance;
    routeDesLacs.push([
      cx + lakeDirX * d + perpX * (wobble + 60),
      cz + lakeDirZ * d + perpZ * (wobble + 60),
    ]);
  }

  // Panneau d'entrée du parc, au début de la route
  const parkSign = new THREE.Group();
  const signPosts = matLib.get(0x5a4530, 0.95);
  for (const px of [-2.4, 2.4]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 3.6, 7), signPosts
    );
    post.position.set(px, 1.8, 0);
    post.castShadow = true;
    parkSign.add(post);
  }
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 1.6, 0.18),
    matLib.get(0x3a5a42, 0.88)
  );
  board.position.y = 3.0;
  board.castShadow = true;
  parkSign.add(board);

  const [psx, psz] = routeDesLacs[1];
  parkSign.position.set(psx, ground(psx, psz), psz);
  parkSign.rotation.y = lakeAngle + Math.PI / 2;
  group.add(parkSign);

  pois.push({
    id: 'saint_alban_route_lacs',
    name: 'Route des Lacs',
    type: 'route',
    position: new THREE.Vector3(psx, 0, psz), radius: 30,
    description:
      'La frontière entre les rangs agricoles et les contreforts des ' +
      'Laurentides. Passage obligé vers les lacs du parc régional.',
  });

  // ── Forêt boréale qui se densifie en montant ──
  for (let i = 2; i < 12; i++) {
    const [rx, rz] = routeDesLacs[i];
    const density = Math.round(18 + (i / 12) * 34);
    addForetBoreale(group, rx, rz, 130, density, rng, ground);
  }

  // ═══════════════════════════════════════════════════════════════
  //  NORD — LE PARC RÉGIONAL ET LES LACS
  // ═══════════════════════════════════════════════════════════════

  const [lakeX, lakeZ] = routeDesLacs[routeDesLacs.length - 1];

  // ── La plage du lac Carillon ──
  const plage = buildPlageParc(140);
  plage.position.set(lakeX, ground(lakeX, lakeZ) - 1, lakeZ);
  plage.rotation.y = lakeAngle + Math.PI / 2;
  group.add(plage);
  buildings.push(plage);

  pois.push({
    id: 'saint_alban_plage',
    name: 'Plage du lac Carillon',
    type: 'plage',
    position: new THREE.Vector3(lakeX, 0, lakeZ), radius: 90,
    description:
      'Sable naturel en pente douce, eau d\'une grande clarté. Location de ' +
      'canots, kayaks, planches à pagaie et rabaskas. Parc naturel régional ' +
      'de Portneuf — 73 km² protégés.',
  });

  blockedAreas.push({
    minX: lakeX - 150, minZ: lakeZ - 200, maxX: lakeX + 150, maxZ: lakeZ - 20,
  });

  // ── Lacs secondaires : Blanc, Long, Montauban ──
  const secondaryLakes: Array<[string, number, number, number]> = [
    ['Lac Blanc', 280, -0.9, 95],
    ['Lac Long', 340, 0.75, 130],
    ['Lac Montauban', 480, -0.2, 110],
  ];

  for (const [name, dist, offsetAngle, radius] of secondaryLakes) {
    const la = lakeAngle + offsetAngle;
    const lx = lakeX + Math.cos(la) * dist;
    const lz = lakeZ + Math.sin(la) * dist;

    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 32),
      new THREE.MeshStandardMaterial({
        color: SA_PALETTE.eauProfonde, roughness: 0.06, metalness: 0.62,
        transparent: true, opacity: 0.9,
      })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(lx, ground(lx, lz) - 0.5, lz);
    lake.scale.set(1, 1, 0.75 + rng() * 0.4);
    lake.userData.isLakeWater = true;
    group.add(lake);

    pois.push({
      id: `saint_alban_${name.toLowerCase().replace(/[^a-z]/g, '_')}`,
      name, type: 'lac',
      position: new THREE.Vector3(lx, 0, lz), radius: radius * 0.8,
    });

    blockedAreas.push({
      minX: lx - radius, minZ: lz - radius * 0.8,
      maxX: lx + radius, maxZ: lz + radius * 0.8,
    });

    // Chalets de villégiature autour du lac
    const chaletCount = 3 + Math.floor(rng() * 4);
    for (let c = 0; c < chaletCount; c++) {
      const ca = (c / chaletCount) * Math.PI * 2 + rng();
      const cd = radius * 1.25 + rng() * 40;
      const chx = lx + Math.cos(ca) * cd;
      const chz = lz + Math.sin(ca) * cd * 0.8;

      const chalet = buildBuilding('cabane_sucre', {
        seed: 2000 + c * 17, litRatio: lit,
      });
      chalet.scale.setScalar(0.75);
      chalet.position.set(chx, ground(chx, chz), chz);
      chalet.rotation.y = Math.atan2(lx - chx, lz - chz);
      group.add(chalet);
      buildings.push(chalet);
    }

    addForetBoreale(group, lx, lz, radius * 2, 40, rng, ground);
  }

  // ── Camping ceinturant le lac Carillon ──
  const campKinds: Array<'tente' | 'pret_a_camper' | 'vr'> =
    ['tente', 'tente', 'pret_a_camper', 'vr', 'tente', 'pret_a_camper', 'vr', 'tente'];

  campKinds.forEach((kind, i) => {
    const ca = lakeAngle + Math.PI / 2 + (i / campKinds.length) * Math.PI * 1.4 - 0.7;
    const cd = 175 + rng() * 55;
    const cpx = lakeX + Math.cos(ca) * cd;
    const cpz = lakeZ + Math.sin(ca) * cd;

    const site = buildCampingSite(kind);
    site.position.set(cpx, ground(cpx, cpz), cpz);
    site.rotation.y = rng() * Math.PI * 2;
    group.add(site);
    buildings.push(site);
  });

  pois.push({
    id: 'saint_alban_camping',
    name: 'Camping du parc régional',
    type: 'camping',
    position: new THREE.Vector3(lakeX, 0, lakeZ + 180), radius: 100,
    description: 'Sites en tentes, prêt-à-camper et emplacements pour VR.',
  });

  // ── Forêt boréale dense partout au nord ──
  for (let i = 0; i < 8; i++) {
    const fa = lakeAngle + (i / 8) * Math.PI * 2;
    const fd = 300 + rng() * 380;
    const fx = lakeX + Math.cos(fa) * fd;
    const fz = lakeZ + Math.sin(fa) * fd;
    addForetBoreale(group, fx, fz, 220, 70, rng, ground);
  }

  const center = new THREE.Vector3(cx, ground(cx, cz), cz);
  return {
    group, center,
    radius: 1100,
    buildings, pointsOfInterest: pois,
    routeDesLacs, walkableAreas, blockedAreas,
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  HELPERS
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
    if (vol > 60 && !bodyTinted) { obj.material = wallMat; bodyTinted = true; }
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

/**
 * Forêt boréale : conifères serrés, quelques feuillus.
 * Plus dense que la forêt du sud du comté.
 */
function addForetBoreale(
  parent: THREE.Group, cx: number, cz: number, spread: number,
  count: number, rng: () => number, ground: (x: number, z: number) => number
): void {
  if (count <= 0) return;

  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 4, 6);
  const trunkInst = new THREE.InstancedMesh(
    trunkGeo, matLib.get(0x4a3828, 0.98), count
  );

  // Sapins baumiers — cônes étroits et hauts
  const coneGeo = new THREE.ConeGeometry(1.9, 9, 7);
  const coneInst = new THREE.InstancedMesh(
    coneGeo, matLib.get(0x24422c, 1, 0), count
  );

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng() * spread;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const y = ground(x, z);
    const s = 0.65 + rng() * 0.85;

    dummy.position.set(x, y + 2 * s, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = rng() * Math.PI;
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, y + 7.5 * s, z);
    dummy.updateMatrix();
    coneInst.setMatrixAt(i, dummy.matrix);
  }

  trunkInst.instanceMatrix.needsUpdate = true;
  coneInst.instanceMatrix.needsUpdate = true;
  trunkInst.castShadow = true;
  coneInst.castShadow = true;
  parent.add(trunkInst, coneInst);
}

/**
 * La rivière Sainte-Anne — elle serpente à travers les terres agricoles.
 */
function addRiviere(
  parent: THREE.Group, cx: number, cz: number, angle: number,
  length: number, ground: (x: number, z: number) => number
): void {
  const dirX = Math.cos(angle), dirZ = Math.sin(angle);
  const perpX = -dirZ, perpZ = dirX;

  const positions: number[] = [];
  const indices: number[] = [];
  const segments = 28;
  const width = 16;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments - 0.5) * length;
    // Méandres prononcés
    const wobble = Math.sin(i * 0.52) * 34 + Math.cos(i * 0.23) * 16;
    const halfW = width / 2 + Math.sin(i * 0.4) * 3;

    const bx = cx + dirX * t + perpX * wobble;
    const bz = cz + dirZ * t + perpZ * wobble;
    const y = ground(bx, bz) - 1.4;

    positions.push(bx + perpX * halfW, y, bz + perpZ * halfW);
    positions.push(bx - perpX * halfW, y, bz - perpZ * halfW);

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const river = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x35607a, roughness: 0.14, metalness: 0.55,
    })
  );
  river.receiveShadow = true;
  river.userData.isRiver = true;
  parent.add(river);
}

// ─────────────────────────────────────────────────────────────────────────
//  ANIMATION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Anime l'eau des lacs, les embarcations, les feux de camp.
 */
export function animateSaintAlban(
  root: THREE.Object3D, elapsed: number, delta: number
): void {
  root.traverse((obj) => {
    if (obj.userData.isLakeWater) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) {
        // Miroitement lent — les lacs du parc sont calmes
        mat.metalness = 0.58 + Math.sin(elapsed * 0.55 + obj.position.x * 0.01) * 0.09;
      }
    }

    if (obj.userData.isBoat) {
      obj.rotation.z = Math.sin(elapsed * 0.9 + obj.position.x * 0.3) * 0.024;
      obj.position.y = Math.sin(elapsed * 0.75 + obj.position.z * 0.2) * 0.07;
    }

    if (obj.userData.isBuoy) {
      obj.position.y = Math.sin(elapsed * 1.4) * 0.06;
    }

    if (obj.userData.isEmbers) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissive?.setHex(0xff6820);
        mat.emissiveIntensity = 0.7 + Math.sin(elapsed * 7.5) * 0.45
          + Math.sin(elapsed * 13.2) * 0.2;
      }
    }

    if (obj instanceof THREE.PointLight && obj.userData.isCampfireLight) {
      // Le feu vacille de façon irrégulière
      obj.intensity = 1.8 + Math.sin(elapsed * 8.3) * 0.7
        + Math.sin(elapsed * 15.7) * 0.35;
    }

    if (obj.userData.isRiver) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.metalness = 0.5 + Math.sin(elapsed * 1.1) * 0.08;
    }
  });
}

/**
 * Bascule jour/nuit : allume les feux de camp et les chalets.
 */
export function setSaintAlbanNightMode(
  root: THREE.Object3D, isNight: boolean
): void {
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