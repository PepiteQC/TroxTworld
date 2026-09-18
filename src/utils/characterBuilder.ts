import * as THREE from 'three';

function bodyMat(color: number, roughness = 0.5, metalness = 0.3) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

interface CharacterParts {
  body: THREE.Group | null;
  head: THREE.Group | null;
  faceGroup: THREE.Group | null;
  legL: THREE.Group | null;
  legR: THREE.Group | null;
  lLowL: THREE.Group | null;
  lLowR: THREE.Group | null;
  armL: THREE.Group | null;
  armR: THREE.Group | null;
  foreL: THREE.Group | null;
  foreR: THREE.Group | null;
  sword: THREE.Group | null;
  cloak: THREE.Group | null;
  mats: {
    skin: THREE.MeshStandardMaterial;
    shirt: THREE.MeshStandardMaterial;
    shirtDark: THREE.MeshStandardMaterial;
    pants: THREE.MeshStandardMaterial;
    pantsDark: THREE.MeshStandardMaterial;
    shoes: THREE.MeshStandardMaterial;
    eye: THREE.MeshBasicMaterial;
    cloak: THREE.MeshStandardMaterial;
  } | null;
}

const PR: CharacterParts = {
  body: null, head: null, faceGroup: null, legL: null, legR: null,
  lLowL: null, lLowR: null, armL: null, armR: null,
  foreL: null, foreR: null, sword: null, cloak: null, mats: null,
};

const playerAnim = { t: 0, spd: 0, breath: 0, walking: false };

export function buildCharacter(charGroup: THREE.Group) {
  // ── Skin & clothing materials ──
  const mSkin = bodyMat(0xe0b48a, 0.35, 0.05);
  const mShirt = bodyMat(0x2d3a5c, 0.5, 0.1);
  const mShirtD = bodyMat(0x1e2a44, 0.55, 0.1);
  const mPants = bodyMat(0x1a3a2a, 0.5, 0.08);
  const mPantsD = bodyMat(0x122a1e, 0.55, 0.08);
  const mShoe = bodyMat(0x1a1a1a, 0.6, 0.2);
  const mBelt = bodyMat(0x2a1a0a, 0.5, 0.2);
  const mEye = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const mCloak = bodyMat(0x8a2020, 0.6, 0.05);

  // ── Armor & weapon materials (fixed epic palette) ──
  const mArmor = bodyMat(0x8a8a9a, 0.2, 0.85);
  const mArmorDark = bodyMat(0x4a4a5a, 0.3, 0.8);
  const mGold = bodyMat(0xc8a030, 0.3, 0.7);
  const mGoldDark = bodyMat(0x8a7020, 0.4, 0.6);
  const mBlade = bodyMat(0xaabbcc, 0.05, 0.95);
  const mGrip = bodyMat(0x2a1a0a, 0.8, 0.1);
  const mHat = bodyMat(0xcc2222, 0.35, 0.15);
  const mHatBr = bodyMat(0xaa1818, 0.4, 0.15);

  function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // ── BODY ROOT ──
  const bodyGroup = new THREE.Group();
  charGroup.add(bodyGroup);
  PR.body = bodyGroup;

  // Leg L
  const legL = new THREE.Group(); legL.position.set(-0.16, 0.56, 0); bodyGroup.add(legL);
  legL.add(mesh(new THREE.BoxGeometry(0.24, 0.42, 0.24), mPants, 0, -0.09, 0));
  const lLowL = new THREE.Group(); lLowL.position.set(0, -0.33, 0); legL.add(lLowL);
  lLowL.add(mesh(new THREE.BoxGeometry(0.22, 0.36, 0.22), mPantsD, 0, -0.09, 0));
  lLowL.add(mesh(new THREE.BoxGeometry(0.26, 0.09, 0.34), mShoe, 0, -0.28, 0.04));
  // Knee guard L
  lLowL.add(mesh(new THREE.BoxGeometry(0.25, 0.14, 0.25), mArmor, 0, 0.08, 0.02));
  lLowL.add(mesh(new THREE.BoxGeometry(0.27, 0.04, 0.27), mGold, 0, 0.15, 0.02));
  PR.legL = legL; PR.lLowL = lLowL;

  // Leg R
  const legR = new THREE.Group(); legR.position.set(0.16, 0.56, 0); bodyGroup.add(legR);
  legR.add(mesh(new THREE.BoxGeometry(0.24, 0.42, 0.24), mPants, 0, -0.09, 0));
  const lLowR = new THREE.Group(); lLowR.position.set(0, -0.33, 0); legR.add(lLowR);
  lLowR.add(mesh(new THREE.BoxGeometry(0.22, 0.36, 0.22), mPantsD, 0, -0.09, 0));
  lLowR.add(mesh(new THREE.BoxGeometry(0.26, 0.09, 0.34), mShoe, 0, -0.28, 0.04));
  // Knee guard R
  lLowR.add(mesh(new THREE.BoxGeometry(0.25, 0.14, 0.25), mArmor, 0, 0.08, 0.02));
  lLowR.add(mesh(new THREE.BoxGeometry(0.27, 0.04, 0.27), mGold, 0, 0.15, 0.02));
  PR.legR = legR; PR.lLowR = lLowR;

  // Torso
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.68, 0.80, 0.36), mShirt, 0, 1.12, 0));
  // Chest plate (armor overlay on torso)
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.58, 0.62, 0.06), mArmor, 0, 1.14, 0.19));
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.60, 0.04, 0.08), mGold, 0, 1.40, 0.19));
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.60, 0.04, 0.08), mGold, 0, 0.90, 0.19));
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.04, 0.56, 0.08), mGold, 0, 1.14, 0.20));
  // Belt
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.70, 0.07, 0.38), mBelt, 0, 0.74, 0));
  // Belt buckle
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.14, 0.10, 0.05), mGold, 0, 0.74, 0.21));
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.10, 0.06, 0.06), mGoldDark, 0, 0.74, 0.23));
  // Tunic skirt (below belt)
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.72, 0.28, 0.42), mShirtD, 0, 0.54, 0));
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.74, 0.04, 0.44), mGold, 0, 0.40, 0));

  // Arm L
  const armL = new THREE.Group(); armL.position.set(-0.48, 1.30, 0); bodyGroup.add(armL);
  armL.add(mesh(new THREE.BoxGeometry(0.20, 0.48, 0.20), mShirt, 0, -0.12, 0));
  // Pauldron L
  armL.add(mesh(new THREE.BoxGeometry(0.28, 0.16, 0.28), mArmor, 0, 0.16, 0));
  armL.add(mesh(new THREE.BoxGeometry(0.30, 0.04, 0.30), mGold, 0, 0.24, 0));
  const foreL = new THREE.Group(); foreL.position.set(0, -0.36, 0); armL.add(foreL);
  foreL.add(mesh(new THREE.BoxGeometry(0.17, 0.30, 0.17), mShirtD, 0, -0.07, 0));
  foreL.add(mesh(new THREE.BoxGeometry(0.15, 0.11, 0.15), mSkin, 0, -0.24, 0));
  // Bracer L
  foreL.add(mesh(new THREE.BoxGeometry(0.19, 0.14, 0.19), mArmor, 0, -0.02, 0));
  foreL.add(mesh(new THREE.BoxGeometry(0.20, 0.03, 0.20), mGold, 0, 0.05, 0));
  PR.armL = armL; PR.foreL = foreL;

  // Arm R
  const armR = new THREE.Group(); armR.position.set(0.48, 1.30, 0); bodyGroup.add(armR);
  armR.add(mesh(new THREE.BoxGeometry(0.20, 0.48, 0.20), mShirt, 0, -0.12, 0));
  // Pauldron R
  armR.add(mesh(new THREE.BoxGeometry(0.28, 0.16, 0.28), mArmor, 0, 0.16, 0));
  armR.add(mesh(new THREE.BoxGeometry(0.30, 0.04, 0.30), mGold, 0, 0.24, 0));
  const foreR = new THREE.Group(); foreR.position.set(0, -0.36, 0); armR.add(foreR);
  foreR.add(mesh(new THREE.BoxGeometry(0.17, 0.30, 0.17), mShirtD, 0, -0.07, 0));
  foreR.add(mesh(new THREE.BoxGeometry(0.15, 0.11, 0.15), mSkin, 0, -0.24, 0));
  // Bracer R
  foreR.add(mesh(new THREE.BoxGeometry(0.19, 0.14, 0.19), mArmor, 0, -0.02, 0));
  foreR.add(mesh(new THREE.BoxGeometry(0.20, 0.03, 0.20), mGold, 0, 0.05, 0));
  PR.armR = armR; PR.foreR = foreR;

  // ── SWORD (in right hand, child of foreR so it follows arm) ──
  const sword = new THREE.Group();
  // Blade
  sword.add(mesh(new THREE.BoxGeometry(0.05, 1.25, 0.14), mBlade, 0, 0.65, 0));
  // Blade fuller (ridge)
  sword.add(mesh(new THREE.BoxGeometry(0.02, 1.10, 0.03), mArmorDark, 0, 0.62, 0.08));
  // Blade tip (tapered)
  sword.add(mesh(new THREE.ConeGeometry(0.07, 0.12, 4), mBlade, 0, 1.33, 0));
  // Crossguard
  sword.add(mesh(new THREE.BoxGeometry(0.36, 0.06, 0.12), mGold, 0, 0.02, 0));
  sword.add(mesh(new THREE.BoxGeometry(0.38, 0.02, 0.14), mGoldDark, 0, -0.02, 0));
  // Grip
  sword.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 8), mGrip, 0, -0.14, 0));
  // Pommel
  sword.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.06, 8), mGold, 0, -0.30, 0));
  sword.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), mGoldDark, 0, -0.34, 0));
  // Position in right hand, blade pointing upward alongside the arm
  sword.position.set(0.06, -0.22, 0.06);
  sword.rotation.z = -0.08;
  foreR.add(sword);
  PR.sword = sword;

  // Head
  const head = new THREE.Group(); head.position.set(0, 1.88, 0); bodyGroup.add(head);
  head.add(mesh(new THREE.BoxGeometry(0.50, 0.50, 0.50), mSkin, 0, 0, 0));

  // ── Face group (swappable facial features) ──
  const faceGroup = new THREE.Group();
  head.add(faceGroup);
  PR.faceGroup = faceGroup;
  PR.head = head;

  // Build default face (style 0 = original)
  setFaceStyle(0);

  // Hat (stays on head, not part of faceGroup)
  const hatTop = mesh(new THREE.CylinderGeometry(0.26, 0.30, 0.20, 12), mHat, 0, 0.32, 0);
  head.add(hatTop);
  const hatBrim = mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.04, 16), mHatBr, 0, 0.21, 0.05);
  head.add(hatBrim);

  // Neck guard (gorget)
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), mArmor, 0, 1.58, 0));
  bodyGroup.add(mesh(new THREE.BoxGeometry(0.34, 0.03, 0.34), mGold, 0, 1.64, 0));

  // ── CLOAK (on back, child of bodyGroup so it follows torso) ──
  const cloak = new THREE.Group();
  cloak.position.set(0, 1.40, -0.19);
  // Main cloak body
  cloak.add(mesh(new THREE.BoxGeometry(0.74, 0.85, 0.03), mCloak, 0, -0.35, 0));
  // Cloak collar (raised top)
  cloak.add(mesh(new THREE.BoxGeometry(0.42, 0.16, 0.05), mCloak, 0, 0.10, 0.01));
  // Gold trim at top
  cloak.add(mesh(new THREE.BoxGeometry(0.76, 0.03, 0.05), mGold, 0, 0.18, 0.01));
  // Cloak split detail
  cloak.add(mesh(new THREE.BoxGeometry(0.04, 0.80, 0.04), mArmorDark, 0, -0.38, 0.02));
  bodyGroup.add(cloak);
  PR.cloak = cloak;

  PR.mats = {
    skin: mSkin, shirt: mShirt, shirtDark: mShirtD, pants: mPants,
    pantsDark: mPantsD, shoes: mShoe, eye: mEye, cloak: mCloak,
  };

  charGroup.position.y = 0.07;

  return PR;
}

// ── Face style presets ──
// Each function builds facial features into the faceGroup. The original face (style 0)
// is preserved exactly. Styles 1+ add variations without removing the base head mesh.
export const FACE_STYLES = ['Classique', 'Déterminé', 'Souriant', 'Balafré', 'Stoïque', 'Jeune', 'Âgé', 'Mystérieux'];

let currentFaceStyle = 0;

function clearFaceGroup() {
  if (!PR.faceGroup) return;
  while (PR.faceGroup.children.length > 0) {
    const child = PR.faceGroup.children[0];
    PR.faceGroup.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
    }
  }
}

export function setFaceStyle(style: number) {
  if (!PR.faceGroup) return;
  currentFaceStyle = style;
  clearFaceGroup();

  const fg = PR.faceGroup;

  // Shared materials (re-create lightweight basic materials per call to avoid disposal issues)
  const mEyeW = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
  const mEye = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const mMouth = new THREE.MeshBasicMaterial({ color: 0x7a4030 });
  const mScar = new THREE.MeshBasicMaterial({ color: 0x8a4030 });
  const mBrow = new THREE.MeshBasicMaterial({ color: 0x3a2010 });

  function fmesh(geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    return m;
  }

  // All face features are placed at z=0.26 (front of head)
  const FZ = 0.26;
  const FZ2 = 0.268;

  switch (style) {
    case 0: // ── Classique (original face) ──
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.11, 0.085, 0.01), mEyeW, x, y, FZ));
      });
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.065, 0.052, 0.012), mEye, x, y, FZ2));
      });
      fg.add(fmesh(new THREE.BoxGeometry(0.13, 0.028, 0.01), mMouth, 0, -0.10, 0.265));
      break;

    case 1: // ── Déterminé (narrower eyes, clenched mouth, brows) ──
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.11, 0.06, 0.01), mEyeW, x, y, FZ));
      });
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.07, 0.035, 0.012), mEye, x, y, FZ2));
      });
      // Angry brows
      fg.add(fmesh(new THREE.BoxGeometry(0.12, 0.02, 0.01), mBrow, 0.12, 0.12, FZ));
      fg.add(fmesh(new THREE.BoxGeometry(0.12, 0.02, 0.01), mBrow, -0.12, 0.12, FZ));
      fg.add(fmesh(new THREE.BoxGeometry(0.04, 0.02, 0.01), mBrow, 0.16, 0.10, FZ));
      fg.add(fmesh(new THREE.BoxGeometry(0.04, 0.02, 0.01), mBrow, -0.16, 0.10, FZ));
      // Clenched mouth (thin line)
      fg.add(fmesh(new THREE.BoxGeometry(0.14, 0.018, 0.01), mMouth, 0, -0.10, 0.265));
      break;

    case 2: // ── Souriant (bigger eyes, smile mouth) ──
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.12, 0.10, 0.01), mEyeW, x, y, FZ));
      });
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.07, 0.06, 0.012), mEye, x, y, FZ2));
      });
      // Smile (curved via two angled boxes)
      fg.add(fmesh(new THREE.BoxGeometry(0.18, 0.025, 0.01), mMouth, 0, -0.10, 0.265));
      fg.add(fmesh(new THREE.BoxGeometry(0.06, 0.025, 0.01), mMouth, 0.08, -0.085, 0.265));
      fg.add(fmesh(new THREE.BoxGeometry(0.06, 0.025, 0.01), mMouth, -0.08, -0.085, 0.265));
      break;

    case 3: // ── Balafré (scar across eye + classic features) ──
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.11, 0.085, 0.01), mEyeW, x, y, FZ));
      });
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.065, 0.052, 0.012), mEye, x, y, FZ2));
      });
      // Scar diagonally across left eye
      const scar1 = fmesh(new THREE.BoxGeometry(0.03, 0.18, 0.01), mScar, -0.12, 0.04, FZ2 + 0.005);
      scar1.rotation.z = 0.4;
      fg.add(scar1);
      const scar2 = fmesh(new THREE.BoxGeometry(0.03, 0.06, 0.01), mScar, -0.08, -0.02, FZ2 + 0.005);
      scar2.rotation.z = 0.4;
      fg.add(scar2);
      fg.add(fmesh(new THREE.BoxGeometry(0.13, 0.028, 0.01), mMouth, 0, -0.10, 0.265));
      break;

    case 4: // ── Stoïque (thin eyes, flat mouth, no expression) ──
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.12, 0.04, 0.01), mEyeW, x, y, FZ));
      });
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.08, 0.022, 0.012), mEye, x, y, FZ2));
      });
      // Flat thin mouth
      fg.add(fmesh(new THREE.BoxGeometry(0.12, 0.015, 0.01), mMouth, 0, -0.10, 0.265));
      // Subtle brows
      fg.add(fmesh(new THREE.BoxGeometry(0.11, 0.015, 0.01), mBrow, 0.12, 0.10, FZ));
      fg.add(fmesh(new THREE.BoxGeometry(0.11, 0.015, 0.01), mBrow, -0.12, 0.10, FZ));
      break;

    case 5: // ── Jeune (big round eyes, small mouth, youthful) ──
      [[0.12, 0.05], [-0.12, 0.05]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.13, 0.12, 0.01), mEyeW, x, y, FZ));
      });
      [[0.12, 0.05], [-0.12, 0.05]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.08, 0.075, 0.012), mEye, x, y, FZ2));
      });
      // Small mouth
      fg.add(fmesh(new THREE.BoxGeometry(0.08, 0.02, 0.01), mMouth, 0, -0.09, 0.265));
      // Light brows
      fg.add(fmesh(new THREE.BoxGeometry(0.10, 0.015, 0.01), mBrow, 0.12, 0.14, FZ));
      fg.add(fmesh(new THREE.BoxGeometry(0.10, 0.015, 0.01), mBrow, -0.12, 0.14, FZ));
      break;

    case 6: // ── Âgé (wrinkles, tired eyes, lines) ──
      [[0.12, 0.03], [-0.12, 0.03]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.11, 0.07, 0.01), mEyeW, x, y, FZ));
      });
      [[0.12, 0.03], [-0.12, 0.03]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.065, 0.04, 0.012), mEye, x, y, FZ2));
      });
      // Wrinkle lines around eyes
      fg.add(fmesh(new THREE.BoxGeometry(0.08, 0.012, 0.008), mBrow, 0.18, 0.02, FZ));
      fg.add(fmesh(new THREE.BoxGeometry(0.08, 0.012, 0.008), mBrow, -0.18, 0.02, FZ));
      // Forehead lines
      fg.add(fmesh(new THREE.BoxGeometry(0.14, 0.01, 0.008), mBrow, 0, 0.16, FZ));
      fg.add(fmesh(new THREE.BoxGeometry(0.10, 0.01, 0.008), mBrow, 0, 0.19, FZ));
      // Slightly downturned mouth
      fg.add(fmesh(new THREE.BoxGeometry(0.12, 0.022, 0.01), mMouth, 0, -0.10, 0.265));
      fg.add(fmesh(new THREE.BoxGeometry(0.04, 0.022, 0.01), mMouth, 0.06, -0.115, 0.265));
      fg.add(fmesh(new THREE.BoxGeometry(0.04, 0.022, 0.01), mMouth, -0.06, -0.115, 0.265));
      // Heavy brows
      fg.add(fmesh(new THREE.BoxGeometry(0.13, 0.025, 0.01), mBrow, 0.12, 0.11, FZ));
      fg.add(fmesh(new THREE.BoxGeometry(0.13, 0.025, 0.01), mBrow, -0.12, 0.11, FZ));
      break;

    case 7: // ── Mystérieux (half-closed eyes, mask-like, enigmatic) ──
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.13, 0.03, 0.01), mEyeW, x, y, FZ));
      });
      [[0.12, 0.04], [-0.12, 0.04]].forEach(([x, y]) => {
        fg.add(fmesh(new THREE.BoxGeometry(0.09, 0.018, 0.012), mEye, x, y, FZ2));
      });
      // Shadow mask strip across upper face
      fg.add(fmesh(new THREE.BoxGeometry(0.40, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0x1a1a2a }), 0, 0.06, 0.255));
      // Enigmatic slight smile
      fg.add(fmesh(new THREE.BoxGeometry(0.10, 0.018, 0.01), mMouth, 0, -0.10, 0.265));
      fg.add(fmesh(new THREE.BoxGeometry(0.04, 0.018, 0.01), mMouth, 0.05, -0.088, 0.265));
      fg.add(fmesh(new THREE.BoxGeometry(0.04, 0.018, 0.01), mMouth, -0.05, -0.088, 0.265));
      break;
  }
}

const SKIN_COLORS = ['#fde0c4', '#f5cba7', '#e8a87c', '#d48b5a', '#b06040', '#7a3e20', '#5c2810', '#3a1808'];
const HAIR_COLORS = ['#0a0502', '#2a1206', '#4a2010', '#7c3a1a', '#b06030', '#c8a050', '#e8d080', '#f0f0f0', '#c0c0c0', '#606060', '#b03020', '#ff4080', '#4060d0', '#20a060'];
const EYE_COLORS = ['#1a3a8c', '#204a20', '#7c3a10', '#106868', '#5c5c6c', '#802860', '#c04010', '#18284c'];
const OUTFIT_COLS = ['#0f0f14', '#1a1a2e', '#2a1a3e', '#1a2a3e', '#1e3a1e', '#3a1a1a', '#2a3a10', '#8a6a10', '#6a3020', '#3a2a4e', '#d0d0d0', '#e8e8e0'];

function toHex(color: string): number {
  return parseInt(color.replace('#', ''), 16);
}

export function updateCharacterMaterials(charGroup: THREE.Group, state: {
  skin: number; hairColor: number; topColor: number; pantsColor: number; shoesColor: number; eyeColor: number;
}) {
  if (!PR.mats) return;

  PR.mats.skin.color.setHex(toHex(SKIN_COLORS[state.skin] ?? SKIN_COLORS[0]));
  PR.mats.shirt.color.setHex(toHex(OUTFIT_COLS[state.topColor] ?? OUTFIT_COLS[0]));
  PR.mats.shirtDark.color.setHex(toHex(OUTFIT_COLS[state.topColor] ?? OUTFIT_COLS[0]));
  PR.mats.pants.color.setHex(toHex(OUTFIT_COLS[state.pantsColor] ?? OUTFIT_COLS[0]));
  PR.mats.pantsDark.color.setHex(toHex(OUTFIT_COLS[state.pantsColor] ?? OUTFIT_COLS[0]));
  PR.mats.shoes.color.setHex(toHex(OUTFIT_COLS[state.shoesColor] ?? OUTFIT_COLS[0]));
  PR.mats.eye.color.setHex(toHex(EYE_COLORS[state.eyeColor] ?? EYE_COLORS[0]));
  PR.mats.cloak.color.setHex(toHex(OUTFIT_COLS[state.topColor] ?? OUTFIT_COLS[0]));
}

export function animateCharacter(charGroup: THREE.Group, time: number, delta: number) {
  const anim = playerAnim;
  anim.breath += delta * 1.6;
  const breathOff = Math.sin(anim.breath) * 0.007;

  const walkCycle = time % 9;
  anim.walking = walkCycle > 5.5;
  const tgtSpd = anim.walking ? 0.55 : 0;
  anim.spd = THREE.MathUtils.lerp(anim.spd, tgtSpd, 1 - Math.exp(-delta * 12));

  if (anim.walking) {
    anim.t += delta * 9.0;
    const sw = Math.sin(anim.t) * 0.48 * anim.spd;
    const co = Math.cos(anim.t);
    if (PR.legL) PR.legL.rotation.x = sw;
    if (PR.legR) PR.legR.rotation.x = -sw;
    if (PR.lLowL) PR.lLowL.rotation.x = Math.max(0, -co) * 0.45 * anim.spd;
    if (PR.lLowR) PR.lLowR.rotation.x = Math.max(0, co) * 0.45 * anim.spd;
    if (PR.armL) PR.armL.rotation.x = -sw * 0.8;
    if (PR.armR) PR.armR.rotation.x = sw * 0.8;
    if (PR.foreL) PR.foreL.rotation.x = -0.12 - Math.max(0, co) * 0.28 * anim.spd;
    if (PR.foreR) PR.foreR.rotation.x = -0.12 - Math.max(0, -co) * 0.28 * anim.spd;
  } else {
    const decay = Math.exp(-delta * 6);
    if (PR.legL) PR.legL.rotation.x *= decay;
    if (PR.legR) PR.legR.rotation.x *= decay;
    if (PR.armL) PR.armL.rotation.x *= decay;
    if (PR.armR) PR.armR.rotation.x *= decay;
    if (PR.lLowL) PR.lLowL.rotation.x *= decay;
    if (PR.lLowR) PR.lLowR.rotation.x *= decay;
    if (PR.foreL) PR.foreL.rotation.x = THREE.MathUtils.lerp(PR.foreL.rotation.x, -0.07, 1 - decay);
    if (PR.foreR) PR.foreR.rotation.x = THREE.MathUtils.lerp(PR.foreR.rotation.x, -0.07, 1 - decay);
  }

  if (PR.body) PR.body.position.y = breathOff;

  // Cloak sway
  if (PR.cloak) {
    const sway = Math.sin(anim.breath * 0.7) * 0.025;
    const walkSway = anim.walking ? Math.sin(anim.t * 0.5) * 0.06 * anim.spd : 0;
    PR.cloak.rotation.x = sway + walkSway;
  }

  charGroup.position.y = 0.07 + Math.sin(time * 1.1) * 0.015;
}
