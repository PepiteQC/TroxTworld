import * as THREE from "three";
import { matLib } from "./materials";
import type { HairStyle } from "./character";

export const FACE_STYLES = [
  { id: 0, label: "Classique" },
  { id: 1, label: "Déterminé" },
  { id: 2, label: "Souriant" },
  { id: 3, label: "Balafré" },
  { id: 4, label: "Stoïque" },
  { id: 5, label: "Jeune" },
  { id: 6, label: "Âgé" },
  { id: 7, label: "Mystérieux" },
] as const;

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function faceMat(hex: number) {
  const m = new THREE.MeshBasicMaterial({ color: hex });
  return m;
}

function paintFace(head: THREE.Group, style: number) {
  const fg = new THREE.Group();
  fg.name = "hero-face";
  head.add(fg);
  const eyeW = faceMat(0xf0f0f0);
  const eye = faceMat(0x050505);
  const mouth = faceMat(0x7a4030);
  const scar = faceMat(0x8a4030);
  const brow = faceMat(0x3a2010);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rz = 0) => {
    const m = mesh(geo, mat, x, y, z);
    m.castShadow = false;
    m.rotation.z = rz;
    fg.add(m);
  };
  const FZ = 0.26;
  const FZ2 = 0.268;
  switch (style) {
    case 1:
      add(new THREE.BoxGeometry(0.11, 0.06, 0.01), eyeW, 0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.11, 0.06, 0.01), eyeW, -0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.07, 0.035, 0.012), eye, 0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.07, 0.035, 0.012), eye, -0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.12, 0.02, 0.01), brow, 0.12, 0.12, FZ);
      add(new THREE.BoxGeometry(0.12, 0.02, 0.01), brow, -0.12, 0.12, FZ);
      add(new THREE.BoxGeometry(0.14, 0.018, 0.01), mouth, 0, -0.1, 0.265);
      break;
    case 2:
      add(new THREE.BoxGeometry(0.12, 0.1, 0.01), eyeW, 0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.12, 0.1, 0.01), eyeW, -0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.07, 0.06, 0.012), eye, 0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.07, 0.06, 0.012), eye, -0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.18, 0.025, 0.01), mouth, 0, -0.1, 0.265);
      add(new THREE.BoxGeometry(0.06, 0.025, 0.01), mouth, 0.08, -0.085, 0.265);
      add(new THREE.BoxGeometry(0.06, 0.025, 0.01), mouth, -0.08, -0.085, 0.265);
      break;
    case 3:
      add(new THREE.BoxGeometry(0.11, 0.085, 0.01), eyeW, 0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.11, 0.085, 0.01), eyeW, -0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.065, 0.052, 0.012), eye, 0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.065, 0.052, 0.012), eye, -0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.03, 0.18, 0.01), scar, -0.12, 0.04, FZ2 + 0.005, 0.4);
      add(new THREE.BoxGeometry(0.13, 0.028, 0.01), mouth, 0, -0.1, 0.265);
      break;
    case 4:
      add(new THREE.BoxGeometry(0.12, 0.04, 0.01), eyeW, 0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.12, 0.04, 0.01), eyeW, -0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.08, 0.022, 0.012), eye, 0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.08, 0.022, 0.012), eye, -0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.12, 0.015, 0.01), mouth, 0, -0.1, 0.265);
      add(new THREE.BoxGeometry(0.11, 0.015, 0.01), brow, 0.12, 0.1, FZ);
      add(new THREE.BoxGeometry(0.11, 0.015, 0.01), brow, -0.12, 0.1, FZ);
      break;
    case 5:
      add(new THREE.BoxGeometry(0.13, 0.12, 0.01), eyeW, 0.12, 0.05, FZ);
      add(new THREE.BoxGeometry(0.13, 0.12, 0.01), eyeW, -0.12, 0.05, FZ);
      add(new THREE.BoxGeometry(0.08, 0.075, 0.012), eye, 0.12, 0.05, FZ2);
      add(new THREE.BoxGeometry(0.08, 0.075, 0.012), eye, -0.12, 0.05, FZ2);
      add(new THREE.BoxGeometry(0.08, 0.02, 0.01), mouth, 0, -0.09, 0.265);
      break;
    case 6:
      add(new THREE.BoxGeometry(0.11, 0.07, 0.01), eyeW, 0.12, 0.03, FZ);
      add(new THREE.BoxGeometry(0.11, 0.07, 0.01), eyeW, -0.12, 0.03, FZ);
      add(new THREE.BoxGeometry(0.065, 0.04, 0.012), eye, 0.12, 0.03, FZ2);
      add(new THREE.BoxGeometry(0.065, 0.04, 0.012), eye, -0.12, 0.03, FZ2);
      add(new THREE.BoxGeometry(0.14, 0.01, 0.008), brow, 0, 0.16, FZ);
      add(new THREE.BoxGeometry(0.13, 0.025, 0.01), brow, 0.12, 0.11, FZ);
      add(new THREE.BoxGeometry(0.13, 0.025, 0.01), brow, -0.12, 0.11, FZ);
      add(new THREE.BoxGeometry(0.12, 0.022, 0.01), mouth, 0, -0.1, 0.265);
      add(new THREE.BoxGeometry(0.04, 0.022, 0.01), mouth, 0.06, -0.115, 0.265);
      add(new THREE.BoxGeometry(0.04, 0.022, 0.01), mouth, -0.06, -0.115, 0.265);
      break;
    case 7:
      add(new THREE.BoxGeometry(0.13, 0.03, 0.01), eyeW, 0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.13, 0.03, 0.01), eyeW, -0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.09, 0.018, 0.012), eye, 0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.09, 0.018, 0.012), eye, -0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.4, 0.08, 0.02), faceMat(0x1a1a2a), 0, 0.06, 0.255);
      add(new THREE.BoxGeometry(0.1, 0.018, 0.01), mouth, 0, -0.1, 0.265);
      add(new THREE.BoxGeometry(0.04, 0.018, 0.01), mouth, 0.05, -0.088, 0.265);
      add(new THREE.BoxGeometry(0.04, 0.018, 0.01), mouth, -0.05, -0.088, 0.265);
      break;
    default:
      add(new THREE.BoxGeometry(0.11, 0.085, 0.01), eyeW, 0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.11, 0.085, 0.01), eyeW, -0.12, 0.04, FZ);
      add(new THREE.BoxGeometry(0.065, 0.052, 0.012), eye, 0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.065, 0.052, 0.012), eye, -0.12, 0.04, FZ2);
      add(new THREE.BoxGeometry(0.13, 0.028, 0.01), mouth, 0, -0.1, 0.265);
  }
}

export function fillHero(
  group: THREE.Group,
  look: { skin: number; hair: number; face: number; hairStyle: HairStyle; jacket: number; pants: number },
) {
  const skin = matLib.get(look.skin, 0.55, 0.05);
  const shirt = matLib.get(look.jacket, 0.55, 0.12);
  const shirtD = matLib.get(look.jacket, 0.62, 0.1);
  const pants = matLib.get(look.pants, 0.55, 0.08);
  const pantsD = matLib.get(look.pants, 0.62, 0.08);
  const shoe = matLib.get(0x1a1a1a, 0.65, 0.2);
  const belt = matLib.get(0x2a1a0a, 0.55, 0.2);
  const armor = matLib.get(0x8a8a9a, 0.22, 0.85);
  const armorD = matLib.get(0x4a4a5a, 0.32, 0.8);
  const gold = matLib.get(0xc8a030, 0.28, 0.72);
  const goldD = matLib.get(0x8a7020, 0.4, 0.6);
  const blade = matLib.get(0xaabbcc, 0.08, 0.95);
  const grip = matLib.get(0x2a1a0a, 0.8, 0.1);
  const hat = matLib.get(0xcc2222, 0.4, 0.15);
  const hatBr = matLib.get(0xaa1818, 0.45, 0.15);
  const cloak = matLib.get(look.jacket, 0.7, 0.05);

  const root = new THREE.Group();
  root.name = "hero-root";
  root.position.y = 0.08;
  group.add(root);

  const body = new THREE.Group();
  body.name = "ether-body";
  root.add(body);

  const legL = new THREE.Group();
  legL.position.set(-0.16, 0.56, 0);
  legL.userData.leg = -1;
  body.add(legL);
  legL.add(mesh(new THREE.BoxGeometry(0.24, 0.42, 0.24), pants, 0, -0.09, 0));
  const lowL = new THREE.Group();
  lowL.position.set(0, -0.33, 0);
  legL.add(lowL);
  lowL.add(mesh(new THREE.BoxGeometry(0.22, 0.36, 0.22), pantsD, 0, -0.09, 0));
  lowL.add(mesh(new THREE.BoxGeometry(0.26, 0.09, 0.34), shoe, 0, -0.28, 0.04));
  lowL.add(mesh(new THREE.BoxGeometry(0.25, 0.14, 0.25), armor, 0, 0.08, 0.02));
  lowL.add(mesh(new THREE.BoxGeometry(0.27, 0.04, 0.27), gold, 0, 0.15, 0.02));

  const legR = new THREE.Group();
  legR.position.set(0.16, 0.56, 0);
  legR.userData.leg = 1;
  body.add(legR);
  legR.add(mesh(new THREE.BoxGeometry(0.24, 0.42, 0.24), pants, 0, -0.09, 0));
  const lowR = new THREE.Group();
  lowR.position.set(0, -0.33, 0);
  legR.add(lowR);
  lowR.add(mesh(new THREE.BoxGeometry(0.22, 0.36, 0.22), pantsD, 0, -0.09, 0));
  lowR.add(mesh(new THREE.BoxGeometry(0.26, 0.09, 0.34), shoe, 0, -0.28, 0.04));
  lowR.add(mesh(new THREE.BoxGeometry(0.25, 0.14, 0.25), armor, 0, 0.08, 0.02));
  lowR.add(mesh(new THREE.BoxGeometry(0.27, 0.04, 0.27), gold, 0, 0.15, 0.02));

  body.add(mesh(new THREE.BoxGeometry(0.68, 0.8, 0.36), shirt, 0, 1.12, 0));
  body.add(mesh(new THREE.BoxGeometry(0.58, 0.62, 0.06), armor, 0, 1.14, 0.19));
  body.add(mesh(new THREE.BoxGeometry(0.6, 0.04, 0.08), gold, 0, 1.4, 0.19));
  body.add(mesh(new THREE.BoxGeometry(0.6, 0.04, 0.08), gold, 0, 0.9, 0.19));
  body.add(mesh(new THREE.BoxGeometry(0.04, 0.56, 0.08), gold, 0, 1.14, 0.2));
  body.add(mesh(new THREE.BoxGeometry(0.7, 0.07, 0.38), belt, 0, 0.74, 0));
  body.add(mesh(new THREE.BoxGeometry(0.14, 0.1, 0.05), gold, 0, 0.74, 0.21));
  body.add(mesh(new THREE.BoxGeometry(0.72, 0.28, 0.42), shirtD, 0, 0.54, 0));
  body.add(mesh(new THREE.BoxGeometry(0.74, 0.04, 0.44), gold, 0, 0.4, 0));

  const armL = new THREE.Group();
  armL.position.set(-0.48, 1.3, 0);
  armL.userData.arm = -1;
  body.add(armL);
  armL.add(mesh(new THREE.BoxGeometry(0.2, 0.48, 0.2), shirt, 0, -0.12, 0));
  armL.add(mesh(new THREE.BoxGeometry(0.28, 0.16, 0.28), armor, 0, 0.16, 0));
  armL.add(mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), gold, 0, 0.24, 0));
  const foreL = new THREE.Group();
  foreL.position.set(0, -0.36, 0);
  armL.add(foreL);
  foreL.add(mesh(new THREE.BoxGeometry(0.17, 0.3, 0.17), shirtD, 0, -0.07, 0));
  foreL.add(mesh(new THREE.BoxGeometry(0.15, 0.11, 0.15), skin, 0, -0.24, 0));
  foreL.add(mesh(new THREE.BoxGeometry(0.19, 0.14, 0.19), armor, 0, -0.02, 0));
  foreL.add(mesh(new THREE.BoxGeometry(0.2, 0.03, 0.2), gold, 0, 0.05, 0));

  const armR = new THREE.Group();
  armR.position.set(0.48, 1.3, 0);
  armR.userData.arm = 1;
  armR.name = "ether-arm-r";
  body.add(armR);
  armR.add(mesh(new THREE.BoxGeometry(0.2, 0.48, 0.2), shirt, 0, -0.12, 0));
  armR.add(mesh(new THREE.BoxGeometry(0.28, 0.16, 0.28), armor, 0, 0.16, 0));
  armR.add(mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), gold, 0, 0.24, 0));
  const foreR = new THREE.Group();
  foreR.position.set(0, -0.36, 0);
  armR.add(foreR);
  foreR.add(mesh(new THREE.BoxGeometry(0.17, 0.3, 0.17), shirtD, 0, -0.07, 0));
  const heroHand = mesh(new THREE.BoxGeometry(0.15, 0.11, 0.15), skin, 0, -0.24, 0);
  heroHand.name = "ether-hand";
  foreR.add(heroHand);
  foreR.add(mesh(new THREE.BoxGeometry(0.19, 0.14, 0.19), armor, 0, -0.02, 0));
  foreR.add(mesh(new THREE.BoxGeometry(0.2, 0.03, 0.2), gold, 0, 0.05, 0));

  const sword = new THREE.Group();
  sword.name = "hero-sword";
  sword.add(mesh(new THREE.BoxGeometry(0.05, 1.25, 0.14), blade, 0, 0.65, 0));
  sword.add(mesh(new THREE.BoxGeometry(0.02, 1.1, 0.03), armorD, 0, 0.62, 0.08));
  sword.add(mesh(new THREE.ConeGeometry(0.07, 0.12, 4), blade, 0, 1.33, 0));
  sword.add(mesh(new THREE.BoxGeometry(0.36, 0.06, 0.12), gold, 0, 0.02, 0));
  sword.add(mesh(new THREE.BoxGeometry(0.38, 0.02, 0.14), goldD, 0, -0.02, 0));
  sword.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 8), grip, 0, -0.14, 0));
  sword.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.06, 8), gold, 0, -0.3, 0));
  sword.position.set(0.06, -0.22, 0.06);
  sword.rotation.z = -0.08;
  foreR.add(sword);

  const head = new THREE.Group();
  head.position.set(0, 1.88, 0);
  body.add(head);
  head.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin, 0, 0, 0));
  paintFace(head, look.face);

  if (look.hairStyle === "chapeau") {
    head.add(mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.2, 12), hat, 0, 0.32, 0));
    head.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16), hatBr, 0, 0.21, 0.05));
  } else if (look.hairStyle !== "chauve") {
    const hair = mesh(new THREE.BoxGeometry(0.52, 0.18, 0.52), matLib.get(look.hair, 0.9), 0, 0.22, 0);
    head.add(hair);
    if (look.hairStyle === "long") {
      head.add(mesh(new THREE.BoxGeometry(0.22, 0.4, 0.14), matLib.get(look.hair, 0.9), 0, -0.1, -0.28));
    }
  }

  body.add(mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), armor, 0, 1.58, 0));
  body.add(mesh(new THREE.BoxGeometry(0.34, 0.03, 0.34), gold, 0, 1.64, 0));

  const cape = new THREE.Group();
  cape.position.set(0, 1.4, -0.19);
  cape.userData.cloak = true;
  cape.add(mesh(new THREE.BoxGeometry(0.74, 0.85, 0.03), cloak, 0, -0.35, 0));
  cape.add(mesh(new THREE.BoxGeometry(0.42, 0.16, 0.05), cloak, 0, 0.1, 0.01));
  cape.add(mesh(new THREE.BoxGeometry(0.76, 0.03, 0.05), gold, 0, 0.18, 0.01));
  cape.add(mesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), armorD, 0, -0.38, 0.02));
  body.add(cape);
}
