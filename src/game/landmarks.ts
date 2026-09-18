import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { makeRng } from "./rng";

// Palettes de couleurs régionales et historiques de la MRC de Portneuf
const COLOR_SHALE_GREY = new THREE.Color(0x5c5854); // Calcaire de Saint-Marc / schiste
const COLOR_CLAY_ST_ALBAN = new THREE.Color(0x7c6a58); // Argile Leda (glissement de terrain)
const COLOR_BOREAL_MOSS = new THREE.Color(0x425434); // Mousse boréale et épinettes
const COLOR_WET_MUD = new THREE.Color(0x3e352b); // Boue humide de fond de cuve
const COLOR_MTQ_GREEN = 0x1d4a3e; // Vert ministère des Transports / Parcs Qc

/**
 * L'Éboulis de Saint-Alban (1894) - Glissement de terrain historique majeur de la rivière Sainte-Anne.
 * Amélioré avec des strates argileuses érodées et un belvédère d'observation touristique sécurisé.
 */
export function buildEboulis1894(length = 280, width = 170, angle = 0.5): THREE.Group {
  const g = new THREE.Group();
  g.name = "eboulis_1894";
  const rng = makeRng(1894);
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  const perpX = -dirZ;
  const perpZ = dirX;
  const segsU = 32; // Résolution augmentée pour un meilleur rendu de la cicatrice
  const segsV = 22;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let v = 0; v <= segsV; v++) {
    for (let u = 0; u <= segsU; u++) {
      const tu = u / segsU;
      const tv = v / segsV;
      const lx = (tu - 0.5) * length;
      const lz = (tv - 0.5) * width;
      const edge = Math.max(Math.abs(tu - 0.5) * 2, Math.abs(tv - 0.5) * 2);
      
      // Profil de cicatrice d'effondrement argileux (glissement rétrograde)
      const basin = Math.pow(1 - edge, 0.65);
      let depth = -basin * 22; // Profondeur du ravin d'effondrement

      if (edge < 0.85) {
        // Ondulations dues au mouvement de masse
        depth += Math.sin(lx * 0.06) * Math.cos(lz * 0.08) * 3.2;
        depth += (rng() - 0.5) * 1.8;
      }
      
      // Remontée abrupte de la couronne d'éboulis
      if (tu > 0.82) {
        depth += Math.pow((tu - 0.82) / 0.18, 2) * 38;
      }

      positions.push(dirX * lx + perpX * lz, depth, dirZ * lx + perpZ * lz);

      // Coloration géologique réaliste (herbe -> argile exposée -> boue humide)
      const c = new THREE.Color();
      if (edge > 0.85) {
        c.copy(COLOR_BOREAL_MOSS);
      } else if (edge > 0.6) {
        // Zone de transition érodée / arrachement herbeux
        const tLerp = (edge - 0.6) / 0.25;
        c.lerpColors(COLOR_CLAY_ST_ALBAN, COLOR_BOREAL_MOSS, tLerp);
      } else {
        // Lit argileux exposé, plus sombre et humide au centre
        c.lerpColors(COLOR_WET_MUD, COLOR_CLAY_ST_ALBAN, basin);
      }
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
      flatShading: true,
      roughness: 0.9,
      metalness: 0.1,
    }),
  );
  basinMesh.receiveShadow = true;
  basinMesh.castShadow = true;
  g.add(basinMesh);

  // Blocs d'argile compacte et débris rocheux instanciés
  const blockGeo = new THREE.DodecahedronGeometry(1.2, 0);
  const blockInst = new THREE.InstancedMesh(blockGeo, matLib.get(0x6e5e4f, 0.95), 30);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 30; i++) {
    const lx = (rng() - 0.35) * length * 0.7;
    const lz = (rng() - 0.5) * width * 0.6;
    dummy.position.set(dirX * lx + perpX * lz, -14 + rng() * 9, dirZ * lx + perpZ * lz);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(1.2 + rng() * 3.2);
    dummy.updateMatrix();
    blockInst.setMatrixAt(i, dummy.matrix);
  }
  blockInst.instanceMatrix.needsUpdate = true;
  blockInst.castShadow = true;
  g.add(blockInst);

  // Belvédère historique (Passerelle d'observation en bois traité)
  const platform = new THREE.Group();
  const woodDark = matLib.get(0x5c4230, 0.9);
  
  // Plateforme principale
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 4.5), woodDark);
  deck.position.set(0, 8.5, 0);
  deck.castShadow = true;
  platform.add(deck);

  // Pilotis d'ancrage dans le roc stable
  for (const [px, pz] of [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9), woodDark);
    post.position.set(px, 4, pz);
    post.castShadow = true;
    platform.add(post);
  }

  // Garde-fous de sécurité touristique
  const railingMat = matLib.get(0x3e2a1c, 0.9);
  const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 4.5), railingMat);
  leftRail.position.set(-3.1, 9.1, 0);
  const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 4.5), railingMat);
  rightRail.position.set(3.1, 9.1, 0);
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 0.15), railingMat);
  backRail.position.set(0, 9.1, -2.1);

  platform.add(leftRail, rightRail, backRail);
  platform.position.set(dirX * (-length / 2 - 10) + perpX * -12, 0, dirZ * (-length / 2 - 10) + perpZ * -12);
  g.add(platform);

  g.userData.landmark = "eboulis_1894";
  return g;
}

/**
 * Entrée de Caverne / Spéléologie.
 * Amélioré avec un tunnel sombre profond, des rochers moussus et un panneau d'avertissement RP.
 */
export function buildCaveEntrance(name = "Grotte"): THREE.Group {
  const g = new THREE.Group();
  const rock = matLib.get(0x4a4640, 0.98); // Calcaire gris d'éboulis
  
  // Affleurement calcaire massif sculpté
  const mainOutcrop = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 10), rock);
  mainOutcrop.position.set(0, 5.5, -1);
  mainOutcrop.castShadow = true;
  mainOutcrop.receiveShadow = true;
  g.add(mainOutcrop);

  // Tunnel de fond noir pour l'illusion d'abysse
  const abyssMat = new THREE.MeshBasicMaterial({ color: 0x010101 });
  const abyss = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.0, 8, 12), abyssMat);
  abyss.rotation.x = Math.PI / 2;
  abyss.position.set(0, 2.2, -1.5);
  g.add(abyss);

  // Bouche de la caverne (Arche rocheuse naturelle)
  const mouthGeo = new THREE.TorusGeometry(2.6, 0.8, 8, 16);
  const mouth = new THREE.Mesh(mouthGeo, rock);
  mouth.position.set(0, 2.2, 2.2);
  mouth.scale.set(1.1, 1.1, 0.7);
  mouth.castShadow = true;
  g.add(mouth);

  // Eboulis rocheux instanciés (Roches de ruissellement)
  const rng = makeRng(name.length * 137);
  const rockInst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), matLib.get(0x5a5650, 0.95), 14);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 14; i++) {
    const angle = (rng() - 0.5) * Math.PI * 0.9;
    const dist = 4.5 + rng() * 6;
    dummy.position.set(Math.sin(angle) * dist, 0.4, 2.5 + Math.cos(angle) * dist * 0.5);
    dummy.rotation.set(rng() * 4, rng() * 4, rng() * 4);
    dummy.scale.setScalar(0.5 + rng() * 1.3);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  rockInst.castShadow = true;
  g.add(rockInst);

  // Panneau RP d'information forestier / Sécurité spéléologique
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5), matLib.get(0x4a321a, 0.9));
  signPost.position.set(4.5, 1.25, 5);
  signPost.castShadow = true;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.1), matLib.get(COLOR_MTQ_GREEN, 0.85));
  board.position.set(4.5, 2.1, 5);
  board.rotation.y = -0.3;
  board.castShadow = true;
  g.add(signPost, board);

  g.userData.poiName = name;
  return g;
}

/**
 * Marmites de Géants (Erosion hydrique de rivières de la région de Pont-Rouge).
 * Amélioré avec des couches d'eau turbulente, des parois polies humides et une passerelle en bois.
 */
export function buildMarmitesDeGeants(count = 10): THREE.Group {
  const g = new THREE.Group();
  const rng = makeRng(1902);
  const rockColor = matLib.get(0x767066, 0.95); // Pierre de lit de rivière
  const rockWet = matLib.get(0x423d35, 0.2, 0.8); // Roche polie et ruisselante

  // Lit de rivière rocheux principal
  const bed = new THREE.Mesh(new THREE.BoxGeometry(60, 2.2, 32), rockColor);
  bed.position.y = -0.9;
  bed.receiveShadow = true;
  g.add(bed);

  for (let i = 0; i < count; i++) {
    const radius = 1.1 + rng() * 2.5;
    const depth = 2.0 + radius * 1.3;
    const kettleGroup = new THREE.Group();

    // Paroi polie interne de la marmite (Cylindre inversé)
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.78, depth, 16, 1, true),
      rockWet,
    );
    wall.position.y = -depth / 2;
    (wall.material as THREE.MeshStandardMaterial).side = THREE.BackSide;
    wall.receiveShadow = true;
    kettleGroup.add(wall);

    // Eau turbulente (Plan d'eau semi-transparent de couleur émeraude avec mousse)
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.86, 16),
      matLib.get(0x1a5c4e, 0.12, 0.7), // Eau verte et glaciale
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -depth * 0.45;
    water.userData.isMarmiteWater = true;
    kettleGroup.add(water);

    // Bordure d'érosion arrondie (Torus)
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius, radius * 0.14, 8, 16),
      rockColor,
    );
    rim.rotation.x = -Math.PI / 2;
    rim.castShadow = true;
    rim.receiveShadow = true;
    kettleGroup.add(rim);

    // Positionnement organique le long d'un chenal sinueux
    const flowT = i / count;
    const offsetZ = Math.sin(flowT * Math.PI * 2) * 5.5 + (rng() - 0.5) * 2.2;
    const offsetX = (flowT - 0.5) * 44;
    kettleGroup.position.set(offsetX, 0.1, offsetZ);

    g.add(kettleGroup);
  }

  // Passerelle piétonne sécurisée en bois d'épinette pour touristes
  const pineWood = matLib.get(0x82654c, 0.95);
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(42, 0.16, 1.8), pineWood);
  walkway.position.set(0, 1.6, -9);
  walkway.castShadow = true;
  g.add(walkway);

  // Garde-corps de la passerelle
  const fenceMat = matLib.get(0x4a3726, 0.9);
  for (const side of [-1, 1]) {
    const rails = new THREE.Mesh(new THREE.BoxGeometry(42, 0.08, 0.08), fenceMat);
    rails.position.set(0, 2.7, -9 + side * 0.85);
    g.add(rails);

    // Poteaux de soutien verticaux pour la passerelle
    for (let j = 0; j < 6; j++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), fenceMat);
      post.position.set(-20 + j * 8, 2.1, -9 + side * 0.85);
      post.castShadow = true;
      g.add(post);
    }
  }

  return g;
}

/**
 * Le Trou du Diable (Parc régional de St-Casimir) - La deuxième plus longue grotte du Québec.
 */
export function buildTrouDuDiable(): THREE.Group {
  const g = buildCaveEntrance("Le Trou du Diable");
  g.name = "trou_du_diable";
  
  const rockMat = matLib.get(0x4a4640, 0.98);
  const escarpment = new THREE.Mesh(
    new THREE.BoxGeometry(32, 16, 12),
    rockMat,
  );
  escarpment.position.set(-2, 8, -6);
  escarpment.castShadow = true;
  escarpment.receiveShadow = true;
  g.add(escarpment);
  
  return g;
}

/**
 * Pont de Fer (Structure en treillis d'acier noir/rouille typique des voies ferrées du Canadien National).
 * Amélioré avec des rails de train, des rivets lourds et des culées de béton armé réalistes.
 */
export function buildPontDeFer(span = 44): THREE.Group {
  const g = new THREE.Group();
  g.name = "pont_de_fer";
  
  const steelRust = matLib.get(0x3e322d, 0.45, 0.65); // Acier autopatinable COR-TEN
  const deckBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.45, span), matLib.get(0x2d2b28, 0.9));
  deckBase.position.y = 3.6;
  deckBase.receiveShadow = true;
  deckBase.castShadow = true;
  g.add(deckBase);

  // Ajout de rails ferroviaires d'époque (RP) sur le tablier
  const steelRail = matLib.get(0x7a7d80, 0.2, 0.8);
  for (const rx of [-1.1, 1.1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, span), steelRail);
    rail.position.set(rx, 3.9, 0);
    g.add(rail);
  }

  // Traverses de chemin de fer en bois créosoté
  const sleeperGeo = new THREE.BoxGeometry(3.2, 0.14, 0.25);
  const sleeperMat = matLib.get(0x281f18, 0.98);
  const sleeperCount = Math.floor(span / 0.8);
  const sleeperInst = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
  const dummySleeper = new THREE.Object3D();
  for (let i = 0; i < sleeperCount; i++) {
    const sz = -span / 2 + i * 0.8;
    dummySleeper.position.set(0, 3.75, sz);
    dummySleeper.updateMatrix();
    sleeperInst.setMatrixAt(i, dummySleeper.matrix);
  }
  sleeperInst.instanceMatrix.needsUpdate = true;
  sleeperInst.castShadow = true;
  g.add(sleeperInst);

  const height = 7.2;
  const panelCount = 8;
  const panelLen = span / panelCount;

  // Treillis de type Warren avec montants verticaux
  for (const side of [-3.4, 3.4]) {
    const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, span), steelRust);
    topChord.position.set(side, 3.6 + height, 0);
    topChord.castShadow = true;
    g.add(topChord);

    // Montants verticaux d'armature
    for (let i = 0; i <= panelCount; i++) {
      const z = -span / 2 + i * panelLen;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, height, 0.25), steelRust);
      post.position.set(side, 3.6 + height / 2, z);
      post.castShadow = true;
      g.add(post);
    }

    // Diagonales en croix
    const diagLen = Math.hypot(panelLen, height);
    const diagAngle = Math.atan2(height, panelLen);
    for (let i = 0; i < panelCount; i++) {
      const z = -span / 2 + i * panelLen + panelLen / 2;
      const dir = i % 2 === 0 ? 1 : -1;
      const diag = new THREE.Mesh(new THREE.BoxGeometry(0.18, diagLen, 0.18), steelRust);
      diag.position.set(side, 3.6 + height / 2, z);
      diag.rotation.x = dir * diagAngle;
      diag.castShadow = true;
      g.add(diag);
    }
  }

  // Culées de soutien massives en béton coffré (Marquées de traces d'efflorescence)
  const concreteMat = matLib.get(0x86827a, 0.94);
  for (const z of [span / 2 + 1.8, -span / 2 - 1.8]) {
    const abutment = new THREE.Mesh(new THREE.BoxGeometry(10.5, 7.5, 4.0), concreteMat);
    abutment.position.set(0, 0.35, z);
    abutment.castShadow = true;
    abutment.receiveShadow = true;
    g.add(abutment);
  }

  return g;
}

/**
 * Gorge forestière avec lit de rivière rapide (Inspiré du secteur de la rivière Portneuf).
 * Amélioré avec des falaises d'éboulis stratifiées et une eau vive turbulente écumeuse.
 */
export function buildGorge(length = 220, angle = 0.3): THREE.Group {
  const g = new THREE.Group();
  const rng = makeRng(1933);
  const rockCliff = matLib.get(0x56504a, 0.98); // Schiste calcaire gris foncé
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  const perpX = -dirZ;
  const perpZ = dirX;
  const segs = 20;

  // Création des deux flancs escarpés de la faille de la gorge
  for (const side of [-1, 1]) {
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs - 0.5) * length;
      const wobble = Math.sin(i * 0.45) * 5.2 + (rng() - 0.5) * 1.5;
      const widthAtPoint = 11 + Math.sin(i * 0.28) * 3.0;
      
      const bx = dirX * t + perpX * wobble;
      const bz = dirZ * t + perpZ * wobble;

      // Sommet de la falaise (avec irrégularité forestière)
      pos.push(bx + perpX * side * (widthAtPoint + 8), 2.5 + rng() * 1.5, bz + perpZ * side * (widthAtPoint + 8));
      // Pied de la falaise s'enfonçant abruptement dans la rivière
      pos.push(bx + perpX * side * widthAtPoint, -8.5, bz + perpZ * side * widthAtPoint);

      if (i < segs) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const wall = new THREE.Mesh(geo, rockCliff);
    wall.castShadow = true;
    wall.receiveShadow = true;
    (wall.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    g.add(wall);
  }

  // Lit de la rivière de la Gorge (Eau vive et rapide)
  const riverPos: number[] = [];
  const riverIdx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs - 0.5) * length;
    const wobble = Math.sin(i * 0.45) * 5.2;
    const widthAtPoint = 11 + Math.sin(i * 0.28) * 3.0;
    const bx = dirX * t + perpX * wobble;
    const bz = dirZ * t + perpZ * wobble;

    for (const side of [-1, 1]) {
      riverPos.push(bx + perpX * side * widthAtPoint, -6.8, bz + perpZ * side * widthAtPoint);
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

  const river = new THREE.Mesh(rgeo, matLib.water(0x1a4542, 0.85)); // Eau sombre de rivière forestière
  river.userData.isGorgeRiver = true;
  g.add(river);

  return g;
}

/**
 * Plage du Lac Carillon.
 * Améliorée avec des zones de baignade délimitées, cabane de sauveteur et racks de canots/kayaks (RP).
 */
export function buildPlageParc(radius = 84): THREE.Group {
  const g = new THREE.Group();
  g.name = "plage_lac_carillon";

  // Lac profond
  const deep = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    matLib.water(0x0f3645, 0.92),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(0, -0.4, -radius * 0.32);
  deep.userData.isLakeWater = true;
  g.add(deep);

  // Sable fin du rivage
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 24),
    matLib.get(0xdecba3, 1, 0),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.05, 7.5);
  beach.receiveShadow = true;
  g.add(beach);

  // Quais en bois flottants
  const dockMat = matLib.get(0x826e54, 0.92);
  for (const dx of [-20, 20]) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 18), dockMat);
    dock.position.set(dx, 0.42, -7.5);
    dock.castShadow = true;
    g.add(dock);

    // Piles de support de quai (Ancrage)
    for (const dz of [-14, -6, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3), matLib.get(0x2d251d, 1));
      post.position.set(dx, -0.8, dz);
      post.castShadow = true;
      g.add(post);
    }
  }

  // Canots en fibre de verre colorés (RP de villégiature québécoise)
  const boatCols = [0x9e2a2b, 0x1f4e5b, 0xbf942e];
  for (let i = 0; i < 4; i++) {
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 4.4, 8),
      matLib.get(boatCols[i % 3]!, 0.4, 0.2),
    );
    hull.rotation.x = Math.PI / 2;
    hull.rotation.z = 1.2; // Rangés de biais sur la plage
    hull.scale.set(1, 1, 0.45);
    hull.position.set(-26 + i * 4.2, 0.3, -4);
    hull.userData.isBoat = true;
    hull.castShadow = true;
    g.add(hull);
  }

  // Pavillon d'accueil du Lac (Garde-parc / Vente de crème glacée)
  const pavilion = new THREE.Mesh(
    new THREE.BoxGeometry(10, 3.2, 7.5),
    matLib.get(QC_PALETTE.boisCreme, 0.95),
  );
  pavilion.position.set(-34, 1.6, 9.5);
  pavilion.castShadow = true;
  g.add(pavilion);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(11.2, 0.2, 8.8),
    matLib.get(QC_PALETTE.toleVerte, 0.8, 0.3),
  );
  roof.position.set(-34, 3.3, 9.5);
  roof.castShadow = true;
  g.add(roof);

  return g;
}

/**
 * Emplacement de camping rustique (Inspiré de la Sépaq).
 */
export function buildCamping(kind: "tente" | "vr"): THREE.Group {
  const g = new THREE.Group();
  
  // Aménagement de gravier compacté
  const pad = new THREE.Mesh(new THREE.CircleGeometry(5.5, 12), matLib.get(0x6e685f, 1));
  pad.rotation.x = -Math.PI / 2;
  pad.receiveShadow = true;
  g.add(pad);

  // Foyer de feu de camp en pierres de taille avec une grille de cuisson métallique (Détail RP)
  const pitRim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.18, 6, 12), matLib.get(0x4a4640, 0.98));
  pitRim.rotation.x = -Math.PI / 2;
  pitRim.position.set(3, 0.18, 2);
  pitRim.castShadow = true;
  g.add(pitRim);

  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.7, 10), matLib.get(0x231e1a, 0.9));
  ash.rotation.x = -Math.PI / 2;
  ash.position.set(3, 0.1, 2);
  g.add(ash);

  if (kind === "tente") {
    // Tente de style coupole canadienne double toit
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      matLib.get(0xb86c25, 0.9), // Tente orange vif de camping d'aventure
    );
    dome.scale.set(1.1, 0.8, 1.2);
    dome.castShadow = true;
    g.add(dome);
  } else {
    // VR / Roulotte de camping classique de marque Boler des années 70/80
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.3, 6.8),
      matLib.get(0xe3dec3, 0.7, 0.1),
    );
    body.position.y = 1.55;
    body.castShadow = true;
    g.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.35, 6.84), matLib.get(0x255b6e, 0.8));
    stripe.position.set(0, 1.35, 0);
    g.add(stripe);
  }
  return g;
}

/**
 * Ancienne Carrière de calcaire à ciel ouvert.
 * Améliorée avec des paliers d'extraction industriels réalistes et des cônes de gravats tamisés.
 */
export function buildQuarry(): THREE.Group {
  const g = new THREE.Group();
  
  // Puits d'extraction étagé
  const pit = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 38, 14, 12, 2, true),
    matLib.get(0x9a958b, 0.98),
  );
  pit.position.y = -5;
  pit.receiveShadow = true;
  (pit.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  g.add(pit);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 16),
    matLib.get(0x86827a, 0.98),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -12;
  floor.receiveShadow = true;
  g.add(floor);

  // Amas conique de pierre concassée (Calcaire 0-3/4") ready pour le transport routier
  const pile = new THREE.Mesh(
    new THREE.ConeGeometry(9, 7.5, 10),
    matLib.get(0xb5b0a5, 0.99),
  );
  pile.position.set(42, 3.75, 8);
  pile.castShadow = true;
  pile.receiveShadow = true;
  g.add(pile);

  return g;
}

/**
 * Moulin à Vent Historique (Inspiré du vieux moulin de Grondines dans la MRC de Portneuf).
 * Amélioré avec des textures de maçonnerie de pierre des champs d'époque et des engrenages de pale.
 */
export function buildMoulin(): THREE.Group {
  const g = new THREE.Group();
  
  // Tour conique en maçonnerie de pierre calcaire robuste de Portneuf
  const stone = matLib.get(QC_PALETTE.pierreGrise, 0.98);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.9, 11, 12), stone);
  tower.position.y = 5.5;
  tower.castShadow = true;
  tower.receiveShadow = true;
  g.add(tower);

  // Calotte pivotante de couverture
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(3.7, 3.4, 12),
    matLib.get(QC_PALETTE.toleRouge, 0.72, 0.22),
  );
  cap.position.y = 12.5;
  cap.castShadow = true;
  g.add(cap);

  // Arbre moteur d'entraînement en bois ferré
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 2.0, 8),
    matLib.get(0x3e2b1c, 0.95),
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.set(3.8, 9.0, 0);
  hub.castShadow = true;
  g.add(hub);

  // Les quatre ailes entoilées traditionnelles
  const sails = new THREE.Group();
  const sailWood = matLib.get(0x4a3726, 0.95);
  const sailCloth = matLib.get(0xf2ecd8, 0.9); // Toile de lin écrue

  for (let i = 0; i < 4; i++) {
    const sailArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 8.5, 0.18), sailWood);
    sailArm.position.y = 4.25;
    sailArm.castShadow = true;

    // Voilure en tissu tendu sur cadre de bois
    const sailClothMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 6.5, 1.3), sailCloth);
    sailClothMesh.position.set(0.08, 5.0, 0.5);
    sailClothMesh.castShadow = true;

    const armGroup = new THREE.Group();
    armGroup.add(sailArm, sailClothMesh);
    armGroup.rotation.z = (i * Math.PI) / 2;
    sails.add(armGroup);
  }

  sails.position.set(4.6, 9.0, 0);
  sails.userData.isMillSails = true;
  g.add(sails);

  return g;
}

export { buildPark, buildCemetery } from "./park";

/**
 * Marina de Portneuf — Hangar maritime, quais sur pilotis, bateaux de pêche et taquets d'amarrage.
 * Conforme au port de plaisance sur le fleuve Saint-Laurent.
 */
export function buildMarina(): THREE.Group {
  const g = new THREE.Group();
  g.name = "marina_portneuf";
  const wood = matLib.get(0x564334, 0.96);
  const plank = matLib.get(0x7a6c58, 0.94);
  const steel = matLib.get(0x505458, 0.45, 0.55);

  // Dalle en béton d'accès (Rampe de mise à l'eau)
  const apron = new THREE.Mesh(new THREE.BoxGeometry(32, 0.2, 16), matLib.get(0x6e6a64, 0.98));
  apron.position.set(0, 0.1, -4);
  apron.receiveShadow = true;
  g.add(apron);

  // Hangar à bateaux industriel (Bardage métallique vert classique de quai)
  const shed = new THREE.Mesh(new THREE.BoxGeometry(11, 4.6, 8.2), matLib.get(QC_PALETTE.toleVerte, 0.85, 0.25));
  shed.position.set(-8, 2.4, -5.5);
  shed.castShadow = true;
  g.add(shed);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.2, 9.2), matLib.get(QC_PALETTE.toleNoire, 0.82));
  roof.position.set(-8, 4.75, -5.5);
  roof.rotation.z = 0.05;
  g.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 0.15), matLib.get(QC_PALETTE.porte, 0.9));
  door.position.set(-8, 1.5, -1.32);
  g.add(door);

  // Bureau d'enregistrement de la marina (Petite cabane côtière en clin)
  const office = new THREE.Mesh(new THREE.BoxGeometry(6.0, 3.4, 4.8), matLib.get(QC_PALETTE.boisCreme, 0.95));
  office.position.set(7.5, 1.8, -5.8);
  office.castShadow = true;
  g.add(office);

  const officeRoof = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.16, 5.6), matLib.get(QC_PALETTE.toleRouge, 0.8, 0.3));
  officeRoof.position.set(7.5, 3.6, -5.8);
  g.add(officeRoof);

  // Quais flottants d'accostage principaux
  const dock = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 24), plank);
  dock.position.set(0, 0.45, 12);
  dock.castShadow = true;
  g.add(dock);

  const finger = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 1.8), plank);
  finger.position.set(0, 0.45, 22);
  g.add(finger);

  // Pilotis d'amarrage (Soutien enfoncé profondément)
  for (const [x, z] of [
    [-2.4, 4],
    [2.4, 4],
    [-2.4, 12],
    [2.4, 12],
    [-2.4, 20],
    [2.4, 20],
    [-7.5, 22],
    [7.5, 22],
  ] as Array<[number, number]>) {
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.2, 8), wood);
    pile.position.set(x, 0.4, z);
    pile.castShadow = true;
    g.add(pile);
  }

  // Chaloupes de pêche fluviale avec cabine (Inspirées du fleuve)
  const boatCols = [0x124a2f, 0x9a2b21, 0xcca625];
  for (let i = 0; i < 3; i++) {
    const boatX = -6.5 + i * 6.5;
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 5.0, 8),
      matLib.get(boatCols[i]!, 0.4, 0.3),
    );
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(1, 1, 0.52);
    hull.position.set(boatX, 0.3, 17.5);
    hull.userData.isBoat = true;
    hull.castShadow = true;
    g.add(hull);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.6), steel);
    cabin.position.set(boatX, 0.9, 16.6);
    cabin.castShadow = true;
    g.add(cabin);
  }

  return g;
}

/**
 * Papeterie de Donnacona (Pâte et Papier, complexe industriel de la Jacques-Cartier depuis 1912).
 * Améliorée avec une haute cheminée de briques à balisage lumineux de sécurité nocturne,
 * convoyeurs, piles de billots d'épinette et rouleaux de papier d'emballage prêts à charger.
 */
export function buildPapeterie(): THREE.Group {
  const g = new THREE.Group();
  g.name = "papeterie_donnacona";
  const brick = matLib.get(0x8c3f30, 0.92); // Brique rouge d'époque industrielle
  const concrete = matLib.get(0x7e7c75, 0.96);
  const steel = matLib.get(0x4a4d50, 0.4, 0.6);
  const tole = matLib.get(QC_PALETTE.toleNoire, 0.88);
  const paperKraft = matLib.get(0xe3d9c3, 0.95); // Bobines de papier kraft fini

  // Cour de transbordement (Asphalte lourd)
  const yard = new THREE.Mesh(new THREE.BoxGeometry(100, 0.15, 54), matLib.get(0x32302d, 0.98));
  yard.position.y = 0.05;
  yard.receiveShadow = true;
  g.add(yard);

  // Hall principal de raffinage
  const hall = new THREE.Mesh(new THREE.BoxGeometry(56, 12, 20), brick);
  hall.position.set(-6, 6, -3);
  hall.castShadow = true;
  hall.receiveShadow = true;
  g.add(hall);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(58.5, 0.45, 22), tole);
  roof.position.set(-6, 12.2, -3);
  roof.castShadow = true;
  g.add(roof);

  // Fenêtres d'usine typiques avec lueur de quart de nuit
  for (let i = 0; i < 9; i++) {
    const lit = i % 2 === 0;
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 2.5),
      lit
        ? matLib.getEmissive(QC_PALETTE.fenetreEclairee, QC_PALETTE.fenetreEclairee, 0.6)
        : matLib.get(QC_PALETTE.fenetre, 0.2, 0.8),
    );
    pane.position.set(-27 + i * 6.5, 5.5, 7.05);
    pane.userData.isWindow = true;
    g.add(pane);
  }

  // Hall de la machine à papier
  const machineHall = new THREE.Mesh(new THREE.BoxGeometry(24, 9.5, 18), brick);
  machineHall.position.set(28, 4.75, -2);
  machineHall.castShadow = true;
  machineHall.receiveShadow = true;
  g.add(machineHall);

  const machineRoof = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 20), steel);
  machineRoof.position.set(28, 9.7, -2);
  g.add(machineRoof);

  // Grande cheminée de briques industrielles avec balisage aérien rouge (RP)
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, 32, 12), matLib.get(0x6e6159, 0.95));
  stack.position.set(18, 16, -11);
  stack.castShadow = true;
  g.add(stack);

  // Sommet noirci par la suie de charbon et lumière de balisage d'aviation (DEL rouge clignotante RP)
  const chimneyLip = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 1.85, 1.4, 12),
    matLib.getEmissive(0x1a1512, 0xff0000, 0.6), // Tête rouge émissive pour balisage aérien de nuit
  );
  chimneyLip.position.set(18, 32.7, -11);
  g.add(chimneyLip);

  // Réservoir à liqueur noire (Pâte chimique sulfatée)
  const tank = new THREE.Mesh(new THREE.SphereGeometry(4.5, 12, 10), steel);
  tank.position.set(-38, 14, 8);
  tank.castShadow = true;
  g.add(tank);

  const tankStem = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, 8, 12), concrete);
  tankStem.position.set(-38, 4, 8);
  tankStem.castShadow = true;
  g.add(tankStem);

  // Quai de chargement expédition (Béton de quai ferroviaire)
  const dock = new THREE.Mesh(new THREE.BoxGeometry(18, 1.5, 9), concrete);
  dock.position.set(8, 0.75, 16);
  dock.castShadow = true;
  dock.receiveShadow = true;
  g.add(dock);

  // Rouleaux de papier géants prêts pour l'exportation maritime/ferroviaire
  for (let i = 0; i < 6; i++) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.5, 12), paperKraft);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(-8 + (i % 3) * 2.8, 1.3 + Math.floor(i / 3) * 2.4, 15.5);
    roll.castShadow = true;
    roll.receiveShadow = true;
    g.add(roll);
  }

  // Piles de billots de bois de résineux de la Côte-Nord (Bois à pâte)
  for (let i = 0; i < 6; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 7.0, 8), matLib.get(0x563820, 0.98));
    log.rotation.z = Math.PI / 2;
    log.position.set(-30, 0.6 + (i % 2) * 0.8, 13 + Math.floor(i / 2) * 1.25);
    log.castShadow = true;
    g.add(log);
  }

  // Convoyeur industriel de Copeaux de bois (Conveyeur à bande)
  const conveyor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.25, 1.6), matLib.get(0x1c1a18, 0.8));
  conveyor.position.set(-18, 3.5, 8.5);
  conveyor.rotation.z = -0.15;
  conveyor.castShadow = true;
  g.add(conveyor);

  // Supports en H en acier pour le convoyeur
  for (let h = 0; h < 2; h++) {
    const supportX = -26 + h * 8;
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2 + h * 1.2, 1.8), steel);
    support.position.set(supportX, (3.2 + h * 1.2) / 2, 8.5);
    support.castShadow = true;
    g.add(support);
  }

  // Enseigne lumineuse corporative RP ("PAPETERIE DONNACONA")
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(12, 1.3, 0.15),
    matLib.getEmissive(0x0e2417, 0x48f572, 0.35), // Rétroéclairage vert néon classique
  );
  sign.position.set(-6, 13.5, 7.1);
  g.add(sign);

  return g;
}