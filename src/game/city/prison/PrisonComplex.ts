// ═══════════════════════════════════════════════════════════════════════════
//  PÉNITENCIER DE PORTNEUF — CONSTRUCTION 3D COMPLÈTE
//  src/world/prison/PrisonComplex.ts
//
//  Établissement de détention à sécurité moyenne, inspiré des pénitenciers
//  fédéraux québécois (Donnacona, Port-Cartier, Cowansville).
//
//  Structure :
//    · Bâtiment administratif central avec sas d'entrée (mantrap)
//    · 4 blocs cellulaires A/B/C/D — 2 étages × 10 cellules = 80 cellules
//    · Cantine, gymnase, douches, salle de contrôle
//    · Cour de promenade avec terrain de basket
//    · Double clôture barbelée + razorwire
//    · 4 tours de garde avec projecteur rotatif
//
//  Chaque cellule est un objet interactif indépendant : porte à barreaux,
//  serrure contrôlée depuis la salle de contrôle, occupant assigné.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────
//  PALETTE — béton, acier, néon jaune des couloirs
// ─────────────────────────────────────────────────────────────────────────

export const PRISON_PALETTE = {
  betonMur: 0x9a9691,
  betonSol: 0x6e6b66,
  betonSombre: 0x54514d,
  acierBarreau: 0x3e4247,
  acierPorte: 0x4a4f55,
  acierClair: 0x7a8088,
  grillage: 0x6a6e72,
  barbele: 0xb0b4b8,
  neonJaune: 0xffd88a,
  neonBlanc: 0xf0f4ff,
  projecteur: 0xfff4d0,
  peintureBleue: 0x2f4f6f,
  peintureVerte: 0x3a5a48,
  matelas: 0x5a6470,
  inox: 0xa8adb4,
  asphalteCour: 0x44474a,
  ligneCour: 0xd8d4c0,
  drapeau: 0x1e4d8f,
};

const P = PRISON_PALETTE;

// ─────────────────────────────────────────────────────────────────────────
//  MATÉRIAUX PARTAGÉS
// ─────────────────────────────────────────────────────────────────────────

class PrisonMaterials {
  private cache = new Map<string, THREE.MeshStandardMaterial>();

  get(color: number, roughness = 0.9, metalness = 0, flat = true): THREE.MeshStandardMaterial {
    const key = `${color}_${roughness}_${metalness}_${flat}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: flat });
    this.cache.set(key, m);
    return m;
  }

  emissive(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
    const key = `em_${color}_${emissive}_${intensity}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const m = new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: intensity, roughness: 0.4,
    });
    this.cache.set(key, m);
    return m;
  }

  dispose(): void {
    this.cache.forEach((m) => m.dispose());
    this.cache.clear();
  }
}

export const prisonMat = new PrisonMaterials();

// ─────────────────────────────────────────────────────────────────────────
//  DIMENSIONS — tout le complexe en découle
// ─────────────────────────────────────────────────────────────────────────

export const PRISON_DIMS = {
  // Cellule
  cellWidth: 2.6,
  cellDepth: 3.4,
  cellHeight: 2.8,
  cellsPerFloor: 10,
  floorsPerBlock: 2,

  // Bloc cellulaire
  corridorWidth: 3.2,
  blockWallThickness: 0.4,

  // Complexe
  yardSize: 60,
  fenceHeight: 5.5,
  fenceGap: 6,          // entre les deux clôtures
  towerHeight: 11,

  // Bâtiment central
  adminWidth: 34,
  adminDepth: 18,
  adminHeight: 7,
};

const D = PRISON_DIMS;

// ─────────────────────────────────────────────────────────────────────────
//  DESCRIPTEURS — ce que le PrisonSystem manipule
// ─────────────────────────────────────────────────────────────────────────

export type BlockId = 'A' | 'B' | 'C' | 'D';

export interface CellDescriptor {
  id: string;              // 'A-1-04'
  block: BlockId;
  floor: number;           // 1 ou 2
  number: number;          // 1 à 10
  position: THREE.Vector3;
  doorPosition: THREE.Vector3;
  /** Référence au mesh de la porte, pour l'animer. */
  doorMesh?: THREE.Object3D;
  locked: boolean;
  open: boolean;
  capacity: number;
}

export interface PrisonZoneDescriptor {
  id: string;
  name: string;
  type: 'cellule' | 'cantine' | 'gym' | 'douches' | 'controle' | 'cour' | 'sas' | 'admin' | 'couloir';
  center: THREE.Vector3;
  size: THREE.Vector3;
  editable: boolean;
}

export interface BuiltPrison {
  group: THREE.Group;
  cells: CellDescriptor[];
  zones: PrisonZoneDescriptor[];
  /** Projecteurs des tours — à animer chaque frame. */
  towerLights: THREE.Object3D[];
  /** Portes du sas — s'ouvrent en alternance. */
  mantrapDoors: THREE.Object3D[];
  center: THREE.Vector3;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ÉLÉMENTS DE BASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Porte à barreaux coulissante. C'est l'élément le plus répété du bâtiment
 * (80 exemplaires) — géométrie fusionnée pour rester léger.
 */
function buildCellDoor(): THREE.Group {
  const g = new THREE.Group();
  const barMat = prisonMat.get(P.acierBarreau, 0.6, 0.7);
  const frameMat = prisonMat.get(P.acierPorte, 0.55, 0.75);

  const w = D.cellWidth * 0.78;
  const h = 2.2;

  // Cadre
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.12, 0.16), frameMat);
  frameTop.position.y = h;
  g.add(frameTop);
  const frameBot = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.1, 0.16), frameMat);
  frameBot.position.y = 0.05;
  g.add(frameBot);

  // Barreaux verticaux
  const barCount = 9;
  const barGeo = new THREE.CylinderGeometry(0.032, 0.032, h, 6);
  const barInst = new THREE.InstancedMesh(barGeo, barMat, barCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < barCount; i++) {
    dummy.position.set(-w / 2 + (i / (barCount - 1)) * w, h / 2, 0);
    dummy.updateMatrix();
    barInst.setMatrixAt(i, dummy.matrix);
  }
  barInst.instanceMatrix.needsUpdate = true;
  barInst.castShadow = true;
  g.add(barInst);

  // Traverses horizontales
  for (const y of [h * 0.35, h * 0.72]) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), barMat);
    cross.position.y = y;
    g.add(cross);
  }

  // Mécanisme de serrure — le voyant change de couleur
  const lockHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.3, 0.14), frameMat
  );
  lockHousing.position.set(w / 2 - 0.1, h * 0.5, 0.1);
  g.add(lockHousing);

  const lockLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 6),
    prisonMat.emissive(0xff3020, 0xff2010, 1.4)
  );
  lockLight.position.set(w / 2 - 0.1, h * 0.5 + 0.1, 0.18);
  lockLight.userData.isLockIndicator = true;
  g.add(lockLight);

  g.userData.isCellDoor = true;
  g.userData.lockLight = lockLight;
  return g;
}

/**
 * Mobilier de cellule : lit superposé, toilette-lavabo inox, tablette.
 */
function buildCellFurniture(): THREE.Group {
  const g = new THREE.Group();
  const steelMat = prisonMat.get(P.inox, 0.35, 0.85);
  const mattressMat = prisonMat.get(P.matelas, 0.95);
  const concreteMat = prisonMat.get(P.betonSombre, 0.95);

  // ── Lit superposé (2 places) ──
  for (const [y, idx] of [[0.42, 0], [1.42, 1]] as Array<[number, number]>) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.08, 1.95), steelMat
    );
    frame.position.set(-D.cellWidth / 2 + 0.5, y, -0.4);
    frame.castShadow = true;
    g.add(frame);

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.14, 1.85), mattressMat
    );
    mattress.position.set(-D.cellWidth / 2 + 0.5, y + 0.11, -0.4);
    g.add(mattress);

    // Couverture pliée
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.06, 0.55),
      prisonMat.get(0x6a6258, 0.98)
    );
    blanket.position.set(-D.cellWidth / 2 + 0.5, y + 0.2, 0.15);
    g.add(blanket);
  }

  // Montants du lit
  for (const z of [-1.3, 0.5]) {
    for (const x of [-D.cellWidth / 2 + 0.15, -D.cellWidth / 2 + 0.85]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6), steelMat
      );
      post.position.set(x, 0.95, z);
      g.add(post);
    }
  }

  // ── Toilette-lavabo combiné inox (standard carcéral) ──
  const combo = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.16, 0.42, 12), steelMat
  );
  bowl.position.y = 0.21;
  combo.add(bowl);

  const seat = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.035, 6, 14), steelMat
  );
  seat.rotation.x = -Math.PI / 2;
  seat.position.y = 0.43;
  combo.add(seat);

  // Lavabo intégré au-dessus
  const sink = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.14, 0.3), steelMat
  );
  sink.position.set(0, 0.82, -0.06);
  combo.add(sink);

  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.5, 0.08), steelMat
  );
  backPanel.position.set(0, 1.05, -0.18);
  combo.add(backPanel);

  const faucet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), steelMat
  );
  faucet.position.set(0, 0.96, -0.12);
  combo.add(faucet);

  combo.position.set(D.cellWidth / 2 - 0.42, 0, -D.cellDepth / 2 + 0.45);
  combo.castShadow = true;
  g.add(combo);

  // ── Tablette de béton scellée au mur ──
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.06, 0.34), concreteMat
  );
  shelf.position.set(D.cellWidth / 2 - 0.4, 0.78, 0.7);
  shelf.castShadow = true;
  g.add(shelf);

  // Tabouret fixe
  const stool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.42, 10), concreteMat
  );
  stool.position.set(D.cellWidth / 2 - 0.75, 0.21, 0.7);
  g.add(stool);

  return g;
}

/**
 * Une cellule complète : murs, sol, plafond, mobilier, éclairage.
 */
function buildCell(desc: CellDescriptor): THREE.Group {
  const g = new THREE.Group();
  g.name = `cell_${desc.id}`;

  const wallMat = prisonMat.get(P.betonMur, 0.95);
  const floorMat = prisonMat.get(P.betonSol, 0.96);

  const w = D.cellWidth, d = D.cellDepth, h = D.cellHeight;

  // Sol
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), floorMat);
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  g.add(floor);

  // Murs — 3 pleins, le 4e a la porte
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), wallMat);
  backWall.position.set(0, h / 2, -d / 2);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  g.add(backWall);

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, d), wallMat);
    wall.position.set(side * w / 2, h / 2, 0);
    wall.receiveShadow = true;
    g.add(wall);
  }

  // Mur avant partiel (encadrement de la porte)
  const frontLeft = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.11, h, 0.18), wallMat
  );
  frontLeft.position.set(-w * 0.445, h / 2, d / 2);
  g.add(frontLeft);
  const frontRight = frontLeft.clone();
  frontRight.position.x = w * 0.445;
  g.add(frontRight);

  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(w, h - 2.2, 0.18), wallMat
  );
  lintel.position.set(0, 2.2 + (h - 2.2) / 2, d / 2);
  g.add(lintel);

  // Plafond
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), wallMat);
  ceiling.position.y = h;
  g.add(ceiling);

  // Fenêtre à barreaux (mur du fond, haute et étroite)
  const windowGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.75),
    prisonMat.get(0x8aa4c0, 0.2, 0.5)
  );
  windowGlass.position.set(0, 2.0, -d / 2 + 0.1);
  g.add(windowGlass);

  const winBarMat = prisonMat.get(P.acierBarreau, 0.6, 0.7);
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.78, 5), winBarMat
    );
    bar.position.set(-0.24 + i * 0.16, 2.0, -d / 2 + 0.13);
    g.add(bar);
  }

  // Néon de cellule — protégé par une grille
  const light = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.07, 0.16),
    prisonMat.emissive(P.neonJaune, P.neonJaune, 0.9)
  );
  light.position.set(0, h - 0.14, 0);
  light.userData.isCellLight = true;
  g.add(light);

  // Mobilier
  const furniture = buildCellFurniture();
  g.add(furniture);

  // Porte
  const door = buildCellDoor();
  door.position.set(0, 0, d / 2);
  g.add(door);
  desc.doorMesh = door;

  g.position.copy(desc.position);
  g.userData.cellId = desc.id;
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BLOC CELLULAIRE — 2 étages × 10 cellules, coursive centrale
// ═══════════════════════════════════════════════════════════════════════════

function buildCellBlock(
  blockId: BlockId,
  origin: THREE.Vector3,
  rotationY: number,
  cells: CellDescriptor[]
): THREE.Group {
  const g = new THREE.Group();
  g.name = `block_${blockId}`;

  const wallMat = prisonMat.get(P.betonMur, 0.95);
  const floorMat = prisonMat.get(P.betonSol, 0.96);
  const steelMat = prisonMat.get(P.acierClair, 0.5, 0.7);

  const n = D.cellsPerFloor;
  const blockLength = n * D.cellWidth + 2;
  const blockWidth = D.cellDepth * 2 + D.corridorWidth;
  const blockHeight = D.cellHeight * 2 + 0.6;

  // ── Coque extérieure ──
  const shellMat = prisonMat.get(P.betonSombre, 0.96);

  // Murs longitudinaux
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(blockLength, blockHeight, 0.5), shellMat
    );
    wall.position.set(0, blockHeight / 2, side * blockWidth / 2);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
  }

  // Pignons
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, blockHeight, blockWidth), shellMat
    );
    wall.position.set(side * blockLength / 2, blockHeight / 2, 0);
    wall.castShadow = true;
    g.add(wall);
  }

  // Toit
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(blockLength + 0.6, 0.4, blockWidth + 0.6),
    prisonMat.get(P.betonSombre, 0.95)
  );
  roof.position.y = blockHeight + 0.2;
  roof.castShadow = true;
  g.add(roof);

  // ── Sols par étage ──
  for (let floor = 0; floor < D.floorsPerBlock; floor++) {
    const y = floor * (D.cellHeight + 0.3);
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(blockLength, 0.2, blockWidth), floorMat
    );
    slab.position.y = y - 0.1;
    slab.receiveShadow = true;
    g.add(slab);
  }

  // ── Cellules : deux rangées face à face ──
  for (let floor = 1; floor <= D.floorsPerBlock; floor++) {
    const y = (floor - 1) * (D.cellHeight + 0.3);

    for (let side of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const cellNumber = side < 0 ? i + 1 : i + 1;
        // Numérotation : côté gauche 1-10, côté droit 11-20 par étage
        const number = side < 0 ? i + 1 : i + 1;
        if (side > 0 && floor > D.floorsPerBlock) continue;

        const x = -blockLength / 2 + 1 + i * D.cellWidth + D.cellWidth / 2;
        const z = side * (D.corridorWidth / 2 + D.cellDepth / 2);

        const id = `${blockId}-${floor}-${String(number).padStart(2, '0')}${side > 0 ? 'B' : 'A'}`;

        const desc: CellDescriptor = {
          id, block: blockId, floor, number,
          position: new THREE.Vector3(x, y, z),
          doorPosition: new THREE.Vector3(x, y, z - side * D.cellDepth / 2),
          locked: true, open: false, capacity: 2,
        };

        const cell = buildCell(desc);
        // Les cellules du côté opposé sont retournées vers la coursive
        if (side > 0) cell.rotation.y = Math.PI;
        g.add(cell);
        cells.push(desc);
      }
    }
  }

  // ── Coursive supérieure avec garde-corps ──
  const walkwayY = D.cellHeight + 0.3;
  for (const side of [-1, 1]) {
    const walkway = new THREE.Mesh(
      new THREE.BoxGeometry(blockLength - 1, 0.14, 1.4), steelMat
    );
    walkway.position.set(0, walkwayY - 0.07, side * (D.corridorWidth / 2 - 0.7));
    walkway.castShadow = true;
    walkway.receiveShadow = true;
    g.add(walkway);

    // Garde-corps
    const railTop = new THREE.Mesh(
      new THREE.BoxGeometry(blockLength - 1, 0.07, 0.07), steelMat
    );
    railTop.position.set(0, walkwayY + 1.05, side * (D.corridorWidth / 2 - 1.35));
    g.add(railTop);

    const postGeo = new THREE.BoxGeometry(0.06, 1.1, 0.06);
    const postCount = Math.floor(blockLength / 1.5);
    const postInst = new THREE.InstancedMesh(postGeo, steelMat, postCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < postCount; i++) {
      dummy.position.set(
        -blockLength / 2 + 0.8 + i * 1.5,
        walkwayY + 0.55,
        side * (D.corridorWidth / 2 - 1.35)
      );
      dummy.updateMatrix();
      postInst.setMatrixAt(i, dummy.matrix);
    }
    postInst.instanceMatrix.needsUpdate = true;
    g.add(postInst);

    // Grillage anti-chute entre les poteaux
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(blockLength - 1, 1.0),
      new THREE.MeshStandardMaterial({
        color: P.grillage, roughness: 0.7, metalness: 0.5,
        transparent: true, opacity: 0.35, side: THREE.DoubleSide,
      })
    );
    mesh.position.set(0, walkwayY + 0.55, side * (D.corridorWidth / 2 - 1.35));
    g.add(mesh);
  }

  // ── Escalier métallique en bout de bloc ──
  const stairSteps = 14;
  const stepGeo = new THREE.BoxGeometry(1.2, 0.06, 0.28);
  const stepInst = new THREE.InstancedMesh(stepGeo, steelMat, stairSteps);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < stairSteps; i++) {
    dummy.position.set(
      blockLength / 2 - 1.5,
      (i + 1) * (walkwayY / stairSteps),
      -1.2 + i * 0.22
    );
    dummy.updateMatrix();
    stepInst.setMatrixAt(i, dummy.matrix);
  }
  stepInst.instanceMatrix.needsUpdate = true;
  stepInst.castShadow = true;
  g.add(stepInst);

  // ── Éclairage néon de coursive ──
  const neonCount = Math.floor(blockLength / 3);
  const neonGeo = new THREE.BoxGeometry(1.6, 0.08, 0.2);
  const neonMat = prisonMat.emissive(P.neonJaune, P.neonJaune, 1.2);
  for (let floor = 0; floor < D.floorsPerBlock; floor++) {
    const y = floor * (D.cellHeight + 0.3) + D.cellHeight - 0.2;
    const inst = new THREE.InstancedMesh(neonGeo, neonMat, neonCount);
    for (let i = 0; i < neonCount; i++) {
      dummy.position.set(-blockLength / 2 + 1.5 + i * 3, y, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.userData.isNeon = true;
    g.add(inst);
  }

  // ── Caméras de surveillance aux angles ──
  for (const cx of [-blockLength / 2 + 1, blockLength / 2 - 1]) {
    const cam = buildSecurityCamera();
    cam.position.set(cx, blockHeight - 0.8, 0);
    cam.rotation.y = cx < 0 ? -0.5 : Math.PI + 0.5;
    g.add(cam);
  }

  // ── Panneau d'identification du bloc ──
  const signMat = prisonMat.emissive(0xffffff, P.neonBlanc, 0.6);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.12), signMat);
  sign.position.set(0, blockHeight * 0.75, blockWidth / 2 + 0.1);
  g.add(sign);

  g.position.copy(origin);
  g.rotation.y = rotationY;
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMÉRA DE SURVEILLANCE
// ═══════════════════════════════════════════════════════════════════════════

function buildSecurityCamera(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = prisonMat.get(0x2a2e33, 0.5, 0.6);

  const mount = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), bodyMat
  );
  mount.rotation.z = Math.PI / 2;
  mount.position.x = -0.15;
  g.add(mount);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.16), bodyMat);
  g.add(body);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10),
    prisonMat.get(0x101418, 0.2, 0.8)
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.x = 0.19;
  g.add(lens);

  // LED d'enregistrement
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 6, 5),
    prisonMat.emissive(0xff2010, 0xff2010, 2.0)
  );
  led.position.set(0.1, 0.09, 0);
  led.userData.isRecordingLed = true;
  g.add(led);

  g.userData.isSecurityCamera = true;
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TOUR DE GARDE — plateforme, cabine vitrée, projecteur rotatif, drapeau
// ═══════════════════════════════════════════════════════════════════════════

function buildGuardTower(): THREE.Group {
  const g = new THREE.Group();
  const concreteMat = prisonMat.get(P.betonSombre, 0.95);
  const steelMat = prisonMat.get(P.acierClair, 0.5, 0.7);

  const h = D.towerHeight;

  // ── Fût de béton ──
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.7, h, 8), concreteMat
  );
  shaft.position.y = h / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);

  // ── Plateforme ──
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.35, 8), concreteMat
  );
  platform.position.y = h;
  platform.castShadow = true;
  g.add(platform);

  // Garde-corps de la plateforme
  const railing = new THREE.Mesh(
    new THREE.TorusGeometry(3.1, 0.05, 6, 8), steelMat
  );
  railing.rotation.x = Math.PI / 2;
  railing.position.y = h + 1.1;
  g.add(railing);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5), steelMat
    );
    post.position.set(Math.cos(a) * 3.1, h + 0.72, Math.sin(a) * 3.1);
    g.add(post);
  }

  // ── Cabine vitrée ──
  const cabinH = 2.6;
  const cabinFrame = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, cabinH, 8, 1, true), steelMat
  );
  cabinFrame.position.y = h + 0.2 + cabinH / 2;
  g.add(cabinFrame);

  // Vitrage
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.25, cabinH * 0.72, 8, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x8aa8c0, roughness: 0.1, metalness: 0.7,
      transparent: true, opacity: 0.35, side: THREE.DoubleSide,
    })
  );
  glass.position.y = h + 0.2 + cabinH * 0.58;
  g.add(glass);

  // Toit conique
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.9, 1.1, 8), concreteMat
  );
  roof.position.y = h + 0.2 + cabinH + 0.55;
  roof.castShadow = true;
  g.add(roof);

  // ── Projecteur rotatif ──
  const projectorPivot = new THREE.Group();
  projectorPivot.position.y = h + 0.2 + cabinH + 0.3;

  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.4, 0.6, 10), steelMat
  );
  housing.rotation.z = Math.PI / 2;
  housing.position.x = 0.5;
  projectorPivot.add(housing);

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 12),
    prisonMat.emissive(P.projecteur, P.projecteur, 3.0)
  );
  lens.rotation.y = Math.PI / 2;
  lens.position.x = 0.81;
  projectorPivot.add(lens);

  // Faisceau conique
  const beamMat = new THREE.MeshBasicMaterial({
    color: P.projecteur, transparent: true, opacity: 0.09,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 45, 12, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 23;
  projectorPivot.add(beam);

  const spot = new THREE.SpotLight(P.projecteur, 3.5, 70, 0.22, 0.4, 1.4);
  spot.position.set(0.9, 0, 0);
  spot.target.position.set(45, -h, 0);
  projectorPivot.add(spot);
  projectorPivot.add(spot.target);

  projectorPivot.userData.isTowerProjector = true;
  g.add(projectorPivot);
  g.userData.projector = projectorPivot;

  // ── Mât et drapeau ──
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 5, 6), steelMat
  );
  pole.position.set(0, h + 0.2 + cabinH + 3.2, 0);
  g.add(pole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.1),
    prisonMat.get(P.drapeau, 0.9)
  );
  flag.position.set(0.9, h + 0.2 + cabinH + 5.0, 0);
  flag.userData.isFlag = true;
  g.add(flag);

  // ── Échelle d'accès ──
  const ladderSteps = Math.floor(h / 0.35);
  const stepGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5);
  stepGeo.rotateZ(Math.PI / 2);
  const stepInst = new THREE.InstancedMesh(stepGeo, steelMat, ladderSteps);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ladderSteps; i++) {
    dummy.position.set(0, 0.4 + i * 0.35, 1.75);
    dummy.updateMatrix();
    stepInst.setMatrixAt(i, dummy.matrix);
  }
  stepInst.instanceMatrix.needsUpdate = true;
  g.add(stepInst);

  g.userData.isGuardTower = true;
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CLÔTURE DOUBLE AVEC BARBELÉ
// ═══════════════════════════════════════════════════════════════════════════

function buildFenceLine(
  length: number, height: number, withRazorwire: boolean
): THREE.Group {
  const g = new THREE.Group();
  const postMat = prisonMat.get(0x5a5e62, 0.6, 0.6);
  const wireMat = prisonMat.get(P.barbele, 0.4, 0.85);

  // ── Poteaux ──
  const spacing = 3.5;
  const postCount = Math.ceil(length / spacing);
  const postGeo = new THREE.CylinderGeometry(0.07, 0.09, height, 7);
  const postInst = new THREE.InstancedMesh(postGeo, postMat, postCount);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < postCount; i++) {
    dummy.position.set(-length / 2 + i * spacing, height / 2, 0);
    dummy.updateMatrix();
    postInst.setMatrixAt(i, dummy.matrix);
  }
  postInst.instanceMatrix.needsUpdate = true;
  postInst.castShadow = true;
  g.add(postInst);

  // ── Grillage — plan semi-transparent, texture procédurale ──
  const meshCanvas = document.createElement('canvas');
  meshCanvas.width = meshCanvas.height = 64;
  const ctx = meshCanvas.getContext('2d')!;
  ctx.strokeStyle = 'rgba(150,155,160,0.95)';
  ctx.lineWidth = 2.5;
  // Losanges (chain-link)
  for (let i = -64; i < 128; i += 10) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 64); ctx.lineTo(i + 64, 0); ctx.stroke();
  }
  const meshTex = new THREE.CanvasTexture(meshCanvas);
  meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
  meshTex.repeat.set(length / 1.5, height / 1.5);

  const fence = new THREE.Mesh(
    new THREE.PlaneGeometry(length, height),
    new THREE.MeshStandardMaterial({
      map: meshTex, transparent: true, alphaTest: 0.25,
      side: THREE.DoubleSide, roughness: 0.7, metalness: 0.5,
    })
  );
  fence.position.y = height / 2;
  g.add(fence);

  // Câbles de tension haut et bas
  for (const y of [0.25, height - 0.2]) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, length, 5), wireMat
    );
    cable.rotation.z = Math.PI / 2;
    cable.position.y = y;
    g.add(cable);
  }

  // ── Razorwire en couronne au sommet ──
  if (withRazorwire) {
    const coilCount = Math.floor(length / 1.2);
    const coilGeo = new THREE.TorusGeometry(0.32, 0.022, 5, 12);
    const coilInst = new THREE.InstancedMesh(coilGeo, wireMat, coilCount);
    for (let i = 0; i < coilCount; i++) {
      dummy.position.set(-length / 2 + i * 1.2, height + 0.32, 0);
      dummy.rotation.set(0, 0, Math.PI / 2);
      dummy.scale.set(1, 1, 1 + Math.sin(i * 0.7) * 0.15);
      dummy.updateMatrix();
      coilInst.setMatrixAt(i, dummy.matrix);
    }
    coilInst.instanceMatrix.needsUpdate = true;
    coilInst.castShadow = true;
    g.add(coilInst);

    // Bras inclinés qui portent le razorwire
    const armCount = postCount;
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5);
    const armInst = new THREE.InstancedMesh(armGeo, postMat, armCount);
    for (let i = 0; i < armCount; i++) {
      dummy.position.set(-length / 2 + i * spacing, height + 0.3, 0);
      dummy.rotation.set(0.6, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      armInst.setMatrixAt(i, dummy.matrix);
    }
    armInst.instanceMatrix.needsUpdate = true;
    g.add(armInst);
  }

  return g;
}

/**
 * Double périmètre : deux clôtures parallèles séparées par une zone morte.
 */
function buildDoublePerimeter(size: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'perimetre';

  const inner = size;
  const outer = size + D.fenceGap * 2;

  for (const [dim, hasRazor] of [[inner, true], [outer, true]] as Array<[number, boolean]>) {
    const half = dim / 2;
    // 4 côtés
    const sides: Array<[number, number, number]> = [
      [0, half, 0],              // nord
      [0, -half, Math.PI],       // sud
      [half, 0, Math.PI / 2],    // est
      [-half, 0, -Math.PI / 2],  // ouest
    ];

    for (const [x, z, rot] of sides) {
      const line = buildFenceLine(dim, D.fenceHeight, hasRazor);
      line.position.set(x, 0, z);
      line.rotation.y = rot;
      g.add(line);
    }
  }

  // ── Zone morte entre les clôtures : gravier + capteurs ──
  const deadZoneMat = prisonMat.get(0x7a746a, 1);
  for (const [x, z, w, d] of [
    [0, (inner + outer) / 4, outer, D.fenceGap],
    [0, -(inner + outer) / 4, outer, D.fenceGap],
    [(inner + outer) / 4, 0, D.fenceGap, inner],
    [-(inner + outer) / 4, 0, D.fenceGap, inner],
  ] as Array<[number, number, number, number]>) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, d), deadZoneMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0.02, z);
    strip.receiveShadow = true;
    g.add(strip);
  }

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SAS D'ENTRÉE (MANTRAP) — double porte, jamais ouvertes en même temps
// ═══════════════════════════════════════════════════════════════════════════

function buildMantrap(doors: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.name = 'sas_entree';

  const wallMat = prisonMat.get(P.betonMur, 0.95);
  const steelMat = prisonMat.get(P.acierPorte, 0.5, 0.8);

  const w = 5, d = 8, h = 3.4;

  // Murs latéraux
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d), wallMat);
    wall.position.set(side * w / 2, h / 2, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
  }

  // Toit
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.35, d + 0.6), wallMat);
  roof.position.y = h;
  roof.castShadow = true;
  g.add(roof);

  // Sol
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.15, d), prisonMat.get(P.betonSol, 0.96)
  );
  floor.position.y = -0.07;
  floor.receiveShadow = true;
  g.add(floor);

  // ── Les deux portes coulissantes ──
  for (const [z, name] of [[d / 2, 'exterieure'], [-d / 2, 'interieure']] as Array<[number, string]>) {
    const doorGroup = new THREE.Group();

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.8, h - 0.4, 0.18), steelMat
    );
    panel.position.y = (h - 0.4) / 2;
    panel.castShadow = true;
    doorGroup.add(panel);

    // Hublot vitré
    const port = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.22),
      new THREE.MeshStandardMaterial({
        color: 0x8aa8c0, roughness: 0.15, metalness: 0.6,
        transparent: true, opacity: 0.4,
      })
    );
    port.position.set(0, h * 0.62, 0);
    doorGroup.add(port);

    // Barreaux du hublot
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.5, 0.02),
        prisonMat.get(P.acierBarreau, 0.6, 0.7)
      );
      bar.position.set(-0.26 + i * 0.17, h * 0.62, 0.12);
      doorGroup.add(bar);
    }

    // Voyant d'état
    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      prisonMat.emissive(0xff3020, 0xff2010, 1.6)
    );
    indicator.position.set(w * 0.34, h * 0.6, 0.14);
    indicator.userData.isDoorIndicator = true;
    doorGroup.add(indicator);

    doorGroup.position.set(0, 0, z);
    doorGroup.userData.isMantrapDoor = true;
    doorGroup.userData.doorName = name;
    doorGroup.userData.closedX = 0;
    doorGroup.userData.openX = w * 0.85;
    doorGroup.userData.indicator = indicator;

    g.add(doorGroup);
    doors.push(doorGroup);
  }

  // ── Caméra du sas ──
  const cam = buildSecurityCamera();
  cam.position.set(w / 2 - 0.5, h - 0.5, 0);
  cam.rotation.y = Math.PI + 0.4;
  g.add(cam);

  // ── Poste de contrôle vitré adjacent ──
  const booth = new THREE.Mesh(
    new THREE.BoxGeometry(3, h - 0.2, 3), wallMat
  );
  booth.position.set(w / 2 + 1.9, (h - 0.2) / 2, 1);
  booth.castShadow = true;
  g.add(booth);

  const boothGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.3),
    new THREE.MeshStandardMaterial({
      color: 0x9ab4cc, roughness: 0.1, metalness: 0.7,
      transparent: true, opacity: 0.45,
    })
  );
  boothGlass.position.set(w / 2 + 0.42, 1.8, 1);
  boothGlass.rotation.y = -Math.PI / 2;
  g.add(boothGlass);

  // Néon du sas
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.08, 0.2),
    prisonMat.emissive(P.neonBlanc, P.neonBlanc, 1.4)
  );
  neon.position.set(0, h - 0.25, 0);
  g.add(neon);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  COUR DE PROMENADE — basket, bancs, marquages
// ═══════════════════════════════════════════════════════════════════════════

function buildYard(size: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'cour_promenade';

  // ── Asphalte ──
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    prisonMat.get(P.asphalteCour, 0.98)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.01;
  ground.receiveShadow = true;
  g.add(ground);

  // ── Terrain de basket ──
  const courtW = 15, courtL = 26;
  const lineMat = prisonMat.emissive(P.ligneCour, P.ligneCour, 0.1);

  // Contour du terrain
  const lineWidth = 0.1;
  const lines: Array<[number, number, number, number]> = [
    [0, courtL / 2, courtW, lineWidth],
    [0, -courtL / 2, courtW, lineWidth],
    [courtW / 2, 0, lineWidth, courtL],
    [-courtW / 2, 0, lineWidth, courtL],
    [0, 0, courtW, lineWidth],           // ligne médiane
  ];
  for (const [x, z, w, d] of lines) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.025, z);
    g.add(line);
  }

  // Cercle central
  const circle = new THREE.Mesh(
    new THREE.RingGeometry(1.7, 1.8, 32), lineMat
  );
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.025;
  g.add(circle);

  // Raquettes
  for (const side of [-1, 1]) {
    const key = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 1.8, 32, 1, 0, Math.PI), lineMat
    );
    key.rotation.x = -Math.PI / 2;
    key.rotation.z = side > 0 ? Math.PI : 0;
    key.position.set(0, 0.025, side * (courtL / 2 - 5.8));
    g.add(key);
  }

  // ── Paniers ──
  for (const side of [-1, 1]) {
    const hoop = new THREE.Group();
    const poleMat = prisonMat.get(0x5a5e62, 0.6, 0.6);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 3.6, 8), poleMat
    );
    pole.position.y = 1.8;
    pole.castShadow = true;
    hoop.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.9), poleMat);
    arm.position.set(0, 3.5, -side * 0.45);
    hoop.add(arm);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.05, 0.06),
      prisonMat.get(0xd8d4cc, 0.7)
    );
    board.position.set(0, 3.4, -side * 0.9);
    board.castShadow = true;
    hoop.add(board);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.025, 6, 16),
      prisonMat.get(0xd04020, 0.5, 0.6)
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 3.05, -side * 1.15);
    hoop.add(rim);

    hoop.position.set(0, 0, side * (courtL / 2 + 0.6));
    g.add(hoop);
  }

  // ── Bancs de béton le long du périmètre ──
  const benchMat = prisonMat.get(P.betonSombre, 0.96);
  const benchPositions: Array<[number, number, number]> = [
    [-size / 2 + 5, 0, -12], [-size / 2 + 5, 0, 0], [-size / 2 + 5, 0, 12],
    [size / 2 - 5, 0, -12], [size / 2 - 5, 0, 0], [size / 2 - 5, 0, 12],
  ];
  for (const [x, , z] of benchPositions) {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 2.4), benchMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    bench.add(seat);
    for (const sz of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.3), benchMat);
      leg.position.set(0, 0.22, sz);
      bench.add(leg);
    }
    bench.position.set(x, 0, z);
    g.add(bench);
  }

  // ── Table de pique-nique en béton ──
  const table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.6), benchMat);
  top.position.y = 0.75;
  top.castShadow = true;
  table.add(top);
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 0.75, 8), benchMat
  );
  pedestal.position.y = 0.37;
  table.add(pedestal);
  table.position.set(-size / 2 + 10, 0, 20);
  g.add(table);

  // ── Aire de musculation extérieure ──
  const pullupMat = prisonMat.get(0x4a5058, 0.55, 0.7);
  const pullupBar = new THREE.Group();
  for (const x of [-1.2, 1.2]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), pullupMat
    );
    post.position.set(x, 1.2, 0);
    post.castShadow = true;
    pullupBar.add(post);
  }
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), pullupMat
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 2.35;
  pullupBar.add(bar);
  pullupBar.position.set(size / 2 - 12, 0, -20);
  g.add(pullupBar);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BÂTIMENT ADMINISTRATIF CENTRAL
// ═══════════════════════════════════════════════════════════════════════════

function buildAdminBuilding(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'batiment_admin';

  const wallMat = prisonMat.get(P.betonMur, 0.95);
  const w = D.adminWidth, d = D.adminDepth, h = D.adminHeight;

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.8, 0.5, d + 0.8),
    prisonMat.get(P.betonSombre, 0.95)
  );
  roof.position.y = h + 0.25;
  roof.castShadow = true;
  g.add(roof);

  // Fenêtres à barreaux en façade
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7a94ac, roughness: 0.15, metalness: 0.6,
    transparent: true, opacity: 0.4,
  });
  const barMat = prisonMat.get(P.acierBarreau, 0.6, 0.7);

  for (let i = 0; i < 7; i++) {
    const x = -w / 2 + 3 + i * 4.6;
    for (const y of [2.2, 4.8]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), glassMat);
      win.position.set(x, y, d / 2 + 0.03);
      g.add(win);

      for (let b = 0; b < 5; b++) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 1.25, 0.03), barMat
        );
        bar.position.set(x - 0.6 + b * 0.3, y, d / 2 + 0.08);
        g.add(bar);
      }
    }
  }

  // Enseigne
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(11, 1.3, 0.2),
    prisonMat.emissive(0x1a1e24, P.neonBlanc, 0.45)
  );
  sign.position.set(0, h - 1.2, d / 2 + 0.15);
  g.add(sign);

  // Antenne de communication
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 6, 6),
    prisonMat.get(0x8a8e92, 0.5, 0.7)
  );
  antenna.position.set(w / 2 - 3, h + 3.2, 0);
  g.add(antenna);

  // Caméras de façade
  for (const cx of [-w / 2 + 2, 0, w / 2 - 2]) {
    const cam = buildSecurityCamera();
    cam.position.set(cx, h - 0.7, d / 2 + 0.2);
    cam.rotation.y = Math.PI;
    g.add(cam);
  }

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ASSEMBLAGE COMPLET
// ═══════════════════════════════════════════════════════════════════════════

export interface PrisonConfig {
  position?: [number, number, number];
  rotationY?: number;
  heightFn?: (x: number, z: number) => number;
}

export function buildPrisonComplex(config: PrisonConfig = {}): BuiltPrison {
  const [px, py, pz] = config.position ?? [0, 0, 0];
  const group = new THREE.Group();
  group.name = 'penitencier_portneuf';

  const cells: CellDescriptor[] = [];
  const zones: PrisonZoneDescriptor[] = [];
  const towerLights: THREE.Object3D[] = [];
  const mantrapDoors: THREE.Object3D[] = [];

  const yardSize = D.yardSize;
  const perimeterSize = yardSize + 70;

  // ── Dalle générale ──
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(perimeterSize + 30, perimeterSize + 30),
    prisonMat.get(0x585a5c, 0.98)
  );
  slab.rotation.x = -Math.PI / 2;
  slab.receiveShadow = true;
  group.add(slab);

  // ── Bâtiment administratif (sud) ──
  const admin = buildAdminBuilding();
  admin.position.set(0, 0, perimeterSize / 2 - 22);
  group.add(admin);
  zones.push({
    id: 'admin', name: 'Bâtiment administratif', type: 'admin',
    center: new THREE.Vector3(0, 0, perimeterSize / 2 - 22),
    size: new THREE.Vector3(D.adminWidth, D.adminHeight, D.adminDepth),
    editable: true,
  });

  // ── Sas d'entrée, accolé à l'admin ──
  const mantrap = buildMantrap(mantrapDoors);
  mantrap.position.set(0, 0, perimeterSize / 2 - 8);
  group.add(mantrap);
  zones.push({
    id: 'sas', name: 'Sas d\'entrée', type: 'sas',
    center: new THREE.Vector3(0, 0, perimeterSize / 2 - 8),
    size: new THREE.Vector3(5, 3.4, 8),
    editable: false,
  });

  // ── 4 blocs cellulaires en croix autour de la cour ──
  const blockOffset = yardSize / 2 + 14;
  const blockLayout: Array<[BlockId, THREE.Vector3, number]> = [
    ['A', new THREE.Vector3(-blockOffset, 0, -12), 0],
    ['B', new THREE.Vector3(blockOffset, 0, -12), 0],
    ['C', new THREE.Vector3(-blockOffset, 0, 16), 0],
    ['D', new THREE.Vector3(blockOffset, 0, 16), 0],
  ];

  for (const [id, pos, rot] of blockLayout) {
    const block = buildCellBlock(id, pos, rot, cells);
    group.add(block);
    zones.push({
      id: `block_${id}`, name: `Bloc ${id}`, type: 'cellule',
      center: pos.clone(),
      size: new THREE.Vector3(
        D.cellsPerFloor * D.cellWidth + 2,
        D.cellHeight * 2 + 0.6,
        D.cellDepth * 2 + D.corridorWidth
      ),
      editable: true,
    });
  }

  // ── Cour de promenade au centre ──
  const yard = buildYard(yardSize);
  yard.position.set(0, 0, 0);
  group.add(yard);
  zones.push({
    id: 'cour', name: 'Cour de promenade', type: 'cour',
    center: new THREE.Vector3(0, 0, 0),
    size: new THREE.Vector3(yardSize, 0, yardSize),
    editable: true,
  });

  // ── Bâtiment commun (cantine, gym, douches) au nord ──
  const commonW = 40, commonD = 16, commonH = 6;
  const common = new THREE.Group();
  common.name = 'batiment_commun';

  const commonBody = new THREE.Mesh(
    new THREE.BoxGeometry(commonW, commonH, commonD),
    prisonMat.get(P.betonMur, 0.95)
  );
  commonBody.position.y = commonH / 2;
  commonBody.castShadow = true;
  commonBody.receiveShadow = true;
  common.add(commonBody);

  const commonRoof = new THREE.Mesh(
    new THREE.BoxGeometry(commonW + 0.6, 0.4, commonD + 0.6),
    prisonMat.get(P.betonSombre, 0.95)
  );
  commonRoof.position.y = commonH + 0.2;
  common.add(commonRoof);

  // Verrières du gymnase
  for (let i = 0; i < 5; i++) {
    const skylight = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.2, 3),
      new THREE.MeshStandardMaterial({
        color: 0x9ab4cc, roughness: 0.2, metalness: 0.5,
        transparent: true, opacity: 0.55,
      })
    );
    skylight.position.set(-commonW / 2 + 5 + i * 7.5, commonH + 0.35, 0);
    common.add(skylight);
  }

  common.position.set(0, 0, -perimeterSize / 2 + 24);
  group.add(common);

  const commonCenter = new THREE.Vector3(0, 0, -perimeterSize / 2 + 24);
  zones.push({
    id: 'cantine', name: 'Cantine', type: 'cantine',
    center: commonCenter.clone().add(new THREE.Vector3(-13, 0, 0)),
    size: new THREE.Vector3(14, commonH, commonD),
    editable: true,
  });
  zones.push({
    id: 'gym', name: 'Gymnase', type: 'gym',
    center: commonCenter.clone(),
    size: new THREE.Vector3(14, commonH, commonD),
    editable: true,
  });
  zones.push({
    id: 'douches', name: 'Douches', type: 'douches',
    center: commonCenter.clone().add(new THREE.Vector3(13, 0, 0)),
    size: new THREE.Vector3(12, commonH, commonD),
    editable: true,
  });

  // ── Salle de contrôle — poste central élevé ──
  const control = new THREE.Group();
  control.name = 'salle_controle';
  const ctrlBody = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.5, 5, 8),
    prisonMat.get(P.betonSombre, 0.95)
  );
  ctrlBody.position.y = 2.5;
  ctrlBody.castShadow = true;
  control.add(ctrlBody);

  const ctrlGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(4.9, 4.9, 2, 8, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x8aa8c0, roughness: 0.1, metalness: 0.7,
      transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    })
  );
  ctrlGlass.position.y = 3.8;
  control.add(ctrlGlass);

  const ctrlRoof = new THREE.Mesh(
    new THREE.ConeGeometry(6, 1.4, 8),
    prisonMat.get(P.betonSombre, 0.95)
  );
  ctrlRoof.position.y = 5.7;
  control.add(ctrlRoof);

  control.position.set(0, 0, -yardSize / 2 - 6);
  group.add(control);
  zones.push({
    id: 'controle', name: 'Salle de contrôle', type: 'controle',
    center: new THREE.Vector3(0, 0, -yardSize / 2 - 6),
    size: new THREE.Vector3(11, 5, 11),
    editable: true,
  });

  // ── Double périmètre ──
  const perimeter = buildDoublePerimeter(perimeterSize);
  group.add(perimeter);

  // ── 4 tours de garde aux angles ──
  const towerOffset = perimeterSize / 2 + D.fenceGap;
  const towerPositions: Array<[number, number]> = [
    [-towerOffset, -towerOffset], [towerOffset, -towerOffset],
    [-towerOffset, towerOffset], [towerOffset, towerOffset],
  ];

  towerPositions.forEach(([tx, tz], i) => {
    const tower = buildGuardTower();
    tower.position.set(tx, 0, tz);
    // Chaque projecteur démarre à un angle différent
    if (tower.userData.projector) {
      tower.userData.projector.rotation.y = (i / 4) * Math.PI * 2;
      towerLights.push(tower.userData.projector);
    }
    group.add(tower);
  });

  // ── Position finale ──
  group.position.set(px, py, pz);
  if (config.rotationY) group.rotation.y = config.rotationY;

  console.log(
    `🏛️ [Prison] Pénitencier construit — ${cells.length} cellules, ` +
    `${zones.length} zones, ${towerLights.length} tours`
  );

  return {
    group, cells, zones, towerLights, mantrapDoors,
    center: new THREE.Vector3(px, py, pz),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Anime les projecteurs des tours et les drapeaux.
 * À appeler chaque frame.
 */
export function animatePrison(
  prison: BuiltPrison, elapsed: number, delta: number
): void {
  // Projecteurs rotatifs — vitesses légèrement différentes pour éviter
  // la synchronisation qui trahit l'artifice
  prison.towerLights.forEach((projector, i) => {
    projector.rotation.y += delta * (0.16 + i * 0.035);
  });

  prison.group.traverse((obj) => {
    if (obj.userData.isFlag) {
      obj.rotation.y = Math.sin(elapsed * 1.6) * 0.25;
    }
    if (obj.userData.isRecordingLed) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 1.2 + Math.sin(elapsed * 3.2) * 0.9;
    }
  });
}

/**
 * Ouvre ou ferme une porte de cellule, avec animation de coulissement.
 */
export function setCellDoorState(
  cell: CellDescriptor, open: boolean, locked: boolean
): void {
  cell.open = open;
  cell.locked = locked;

  const door = cell.doorMesh;
  if (!door) return;

  // Voyant : rouge verrouillé, vert déverrouillé
  const light = door.userData.lockLight as THREE.Mesh | undefined;
  if (light) {
    const mat = light.material as THREE.MeshStandardMaterial;
    mat.color.setHex(locked ? 0xff3020 : 0x30ff60);
    mat.emissive.setHex(locked ? 0xff2010 : 0x20ff50);
  }

  // Coulissement latéral
  door.position.x = open ? D.cellWidth * 0.78 : 0;
}

/**
 * Verrouillage général — toutes les cellules d'un coup.
 */
export function triggerLockdown(prison: BuiltPrison): void {
  for (const cell of prison.cells) {
    setCellDoorState(cell, false, true);
  }
  // Sas : les deux portes verrouillées
  for (const door of prison.mantrapDoors) {
    door.position.x = 0;
    const ind = door.userData.indicator as THREE.Mesh | undefined;
    if (ind) {
      const mat = ind.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0xff3020);
      mat.emissive.setHex(0xff2010);
      mat.emissiveIntensity = 2.4;
    }
  }
  console.log('🚨 [Prison] LOCKDOWN — 80 cellules verrouillées');
}

/**
 * Éclairage jour/nuit du pénitencier.
 */
export function setPrisonNightMode(prison: BuiltPrison, isNight: boolean): void {
  prison.group.traverse((obj) => {
    if (obj.userData.isNeon || obj.userData.isCellLight) {
      const mesh = obj as THREE.Mesh | THREE.InstancedMesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = isNight ? 1.5 : 0.35;
    }
  });

  // Les projecteurs ne servent que la nuit
  prison.towerLights.forEach((projector) => {
    projector.traverse((child) => {
      if (child instanceof THREE.SpotLight) {
        child.intensity = isNight ? 4.0 : 0;
      }
      if (child instanceof THREE.Mesh && child.material) {
        const m = child.material as THREE.MeshBasicMaterial;
        if (m.transparent && m.opacity < 0.2) {
          m.opacity = isNight ? 0.11 : 0;
        }
      }
    });
  });
}