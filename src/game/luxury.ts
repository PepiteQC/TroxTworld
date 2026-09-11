import * as THREE from "three";
import { matLib } from "./materials";
import { tex } from "./textures";
import { mountNightstandMesh } from "./nightstand";
import { mountSofaMesh } from "./sofa";

const GOLD = 0xd4a853;
const VELVET = 0x3d1c1c;
const WOOD = 0x1e1b2e;

export function kingBed(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 2.2), tex.mat("noyer", 1.4, 1.4, 0.45, 0.08));
  base.position.y = 0.15;
  g.add(base);
  const mat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.32, 2), tex.cloth("laineTricot", "laineKnitNrm", 1.8, 1.8, 0.9, 0x4a4a6a, 0.9));
  mat.position.y = 0.48;
  g.add(mat);
  const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.35, 0.14), matLib.get(WOOD, 0.55, 0.25));
  head.position.set(0, 1.0, -1.05);
  g.add(head);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 0.16), matLib.get(GOLD, 0.18, 0.85));
  trim.position.set(0, 1.72, -1.05);
  g.add(trim);
  for (const sx of [-0.48, 0.48]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 0.4), matLib.get(0xf5f0eb, 0.95));
    p.position.set(sx, 0.72, -0.62);
    p.rotation.x = 0.28;
    g.add(p);
  }
  return g;
}

export function chandelier(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 8), matLib.get(GOLD, 0.15, 0.85));
  rod.position.y = 0.2;
  g.add(rod);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 16), matLib.get(GOLD, 0.15, 0.85));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.2;
  g.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      matLib.getEmissive(0xfff5e6, 0xfff5e6, 0.85),
    );
    bulb.position.set(Math.cos(a) * 0.42, -0.38, Math.sin(a) * 0.42);
    bulb.userData.lobbyLamp = true;
    g.add(bulb);
  }
  const light = new THREE.PointLight(0xfff5e6, 3.4, 14, 2);
  light.position.y = -0.35;
  light.userData.lobbyLamp = true;
  g.add(light);
  return g;
}

export function receptionDesk(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.75), matLib.get(WOOD, 0.4, 0.35));
  body.position.y = 0.52;
  body.castShadow = true;
  g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.07, 0.85), matLib.get(0xf5f0eb, 0.22, 0.15));
  top.position.y = 1.08;
  g.add(top);
  const gold = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.02, 0.02), matLib.get(GOLD, 0.15, 0.9));
  gold.position.set(0, 1.04, 0.4);
  g.add(gold);
  return g;
}

export function receptionBell(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.bell = true;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.07, 16), matLib.get(GOLD, 0.15, 0.9));
  g.add(base);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    matLib.get(GOLD, 0.15, 0.9),
  );
  dome.position.y = 0.07;
  g.add(dome);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 8), matLib.get(0xf5f0eb, 0.4));
  button.position.y = 0.14;
  g.add(button);
  return g;
}

export function loungeChair(x: number, z: number, yaw = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.sit = true;
  const cloth = tex.cloth("laineTricot", "laineKnitNrm", 1.2, 1.2, 0.9, VELVET, 0.85);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.12, 0.7), cloth);
  seat.position.y = 0.42;
  seat.castShadow = true;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.72, 0.1), cloth);
  back.position.set(0, 0.82, -0.3);
  g.add(back);
  for (const sx of [-0.3, 0.3]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), matLib.get(GOLD, 0.2, 0.7));
    leg.position.set(sx, 0.2, 0.22);
    g.add(leg);
    const legB = leg.clone();
    legB.position.z = -0.22;
    g.add(legB);
  }
  return g;
}

export function woolSofa(x: number, z: number, yaw = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.sit = true;
  const cloth = tex.cloth("laineTricot", "laineKnitNrm", 2.2, 1.4, 0.9, 0x4a4a6a, 0.92);
  const dummy = new THREE.Group();
  dummy.name = "sofa-dummy";
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 0.85), cloth);
  seat.position.y = 0.38;
  seat.castShadow = true;
  dummy.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 0.18), cloth);
  back.position.set(0, 0.72, -0.38);
  dummy.add(back);
  for (const sx of [-0.95, 0.95]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.85), cloth);
    arm.position.set(sx, 0.52, 0);
    dummy.add(arm);
  }
  g.add(dummy);
  mountSofaMesh(g);
  return g;
}

export function coffeeTable(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.62), tex.mat("noyer", 1.2, 0.7, 0.35, 0.12));
  top.position.y = 0.38;
  top.castShadow = true;
  g.add(top);
  for (const [sx, sz] of [
    [-0.46, -0.22],
    [0.46, -0.22],
    [-0.46, 0.22],
    [0.46, 0.22],
  ] as Array<[number, number]>) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.36, 8), matLib.get(GOLD, 0.2, 0.75));
    leg.position.set(sx, 0.18, sz);
    g.add(leg);
  }
  return g;
}

export function lobbyPlant(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.32, 10), matLib.get(0x7a4438, 0.7));
  pot.position.y = 0.16;
  g.add(pot);
  const dirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 10), matLib.get(0x3a2a1c, 0.95));
  dirt.position.y = 0.32;
  g.add(dirt);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), matLib.get(0x2a6a38, 0.95));
    leaf.position.set(Math.cos(a) * 0.1, 0.52 + (i % 2) * 0.12, Math.sin(a) * 0.1);
    leaf.scale.set(1, 1.4, 0.55);
    g.add(leaf);
  }
  return g;
}

export function persianRug(x: number, z: number, w: number, d: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tex.mat("velours", Math.max(1.2, w * 0.55), Math.max(1.2, d * 0.55), 0.92));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  m.receiveShadow = true;
  return m;
}

export function nightstand(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const dummy = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.4), matLib.get(WOOD, 0.42, 0.28));
  dummy.name = "nightstand-dummy";
  dummy.position.y = 0.28;
  dummy.castShadow = true;
  g.add(dummy);
  const lampG = new THREE.Group();
  lampG.name = "nightstand-lamp";
  lampG.position.y = 0.68;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 8), matLib.get(GOLD, 0.18, 0.8));
  stem.position.y = 0;
  lampG.add(stem);
  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    matLib.getEmissive(0xfff5e6, 0xfff5e6, 0.45),
  );
  shade.position.y = 0.14;
  lampG.add(shade);
  const light = new THREE.PointLight(0xfff0d8, 1.4, 4.5, 2);
  light.position.y = 0.14;
  lampG.add(light);
  g.add(lampG);
  mountNightstandMesh(g);
  return g;
}

export function velvetCurtain(x: number, z: number, yaw = 0, width = 2.4, height = 2.7): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, width, 8), matLib.get(GOLD, 0.15, 0.9));
  rod.rotation.z = Math.PI / 2;
  rod.position.y = height;
  g.add(rod);
  const left = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, height, 0.05), matLib.get(VELVET, 0.92));
  left.position.set(-width * 0.22, height / 2, 0);
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, height, 0.05), matLib.get(VELVET, 0.92));
  right.position.set(width * 0.22, height / 2, 0);
  g.add(right);
  return g;
}

export function wallArt(x: number, y: number, z: number, yaw = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.78, 0.04), matLib.get(WOOD, 0.35, 0.25));
  g.add(frame);
  const paint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.58),
    matLib.getEmissive(0x4a3aff, 0x4a3aff, 0.12),
  );
  paint.position.z = 0.025;
  g.add(paint);
  const gold = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.02, 0.01), matLib.get(GOLD, 0.15, 0.9));
  gold.position.z = 0.028;
  g.add(gold);
  return g;
}

export function elevatorPlate(x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.3, 0.08),
    matLib.getEmissive(0x22d3ee, 0x0e7490, 0.35),
  );
  m.position.set(x, y, z);
  m.userData.elevator = true;
  return m;
}

export function ceilingLight(x: number, y: number, z: number, intensity = 1.2): THREE.Group {
  const g = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.05, 12), matLib.get(0xf5f0eb, 0.35));
  dish.position.set(x, y, z);
  g.add(dish);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    matLib.getEmissive(0xfff5e6, 0xfff5e6, 0.7),
  );
  bulb.position.set(x, y - 0.04, z);
  g.add(bulb);
  const light = new THREE.PointLight(0xfff5e6, intensity, 9, 2);
  light.position.set(x, y - 0.12, z);
  g.add(light);
  return g;
}

export function lightPanel(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.lightSwitch = true;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.04), matLib.get(0xe8e4dc, 0.5));
  g.add(plate);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    matLib.getEmissive(0x22c55e, 0x22c55e, 0.85),
  );
  led.position.z = 0.03;
  led.userData.panelLed = true;
  g.add(led);
  return g;
}

export function doorFrame(x: number, z: number, yaw = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const mat = matLib.get(0x111827, 0.7, 0.3);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 0.14), mat);
  left.position.set(-0.48, 1.08, 0);
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 0.14), mat);
  right.position.set(0.48, 1.08, 0);
  g.add(right);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 0.14), mat);
  top.position.set(0, 2.18, 0);
  g.add(top);
  return g;
}

export function hallDoor(x: number, z: number, yaw: number, label: string, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.hallDoor = true;
  g.userData.locked = locked;
  g.userData.label = label;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.1, 0.06), matLib.get(locked ? 0x1a1a2e : 0x2a2430, 0.72));
  panel.position.y = 1.08;
  g.add(panel);
  g.add(doorFrame(0, 0, 0));
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    matLib.getEmissive(locked ? 0xef4444 : 0x22c55e, locked ? 0xef4444 : 0x22c55e, 0.95),
  );
  led.position.set(0.38, 1.72, 0.05);
  g.add(led);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.02), matLib.get(0xfef3c7, 0.4));
  plate.position.set(-0.22, 1.78, 0.05);
  g.add(plate);
  return g;
}

export function corridorBench(x: number, z: number, yaw = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.sit = true;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.42), matLib.get(WOOD, 0.55, 0.2));
  seat.position.y = 0.42;
  g.add(seat);
  const legA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), matLib.get(GOLD, 0.2, 0.7));
  legA.position.set(-0.48, 0.21, 0);
  g.add(legA);
  const legB = legA.clone();
  legB.position.x = 0.48;
  g.add(legB);
  return g;
}

export function baseboard(x: number, z: number, width: number, yaw = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.03), matLib.getEmissive(0x4a3aff, 0x4a3aff, 0.12));
  m.position.set(x, 0.04, z);
  m.rotation.y = yaw;
  return m;
}

export function brickFireplace(x: number, z: number, yaw = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.55, 0.22), tex.mat("brique", 1.4, 1.1, 0.82, 0.02));
  back.position.set(0, 0.82, 0);
  back.castShadow = true;
  g.add(back);
  const opening = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.12), tex.mat("cheminee", 1, 0.7, 0.55, 0));
  opening.position.set(0, 0.52, 0.12);
  g.add(opening);
  const fire = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 0.5),
    new THREE.MeshStandardMaterial({
      map: tex.map("cheminee", 1, 0.55),
      emissive: 0xff6a1a,
      emissiveIntensity: 0.85,
      roughness: 0.9,
    }),
  );
  fire.position.set(0, 0.5, 0.185);
  fire.userData.heatFire = true;
  g.add(fire);
  const light = new THREE.PointLight(0xff7a2a, 1.6, 5.5, 2);
  light.position.set(0, 0.55, 0.35);
  light.userData.heatFire = true;
  g.add(light);
  const mantel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.32), tex.mat("orBrosse", 2, 0.2, 0.28, 0.85));
  mantel.position.set(0, 1.42, 0.08);
  g.add(mantel);
  return g;
}

export function drapeCurtain(x: number, z: number, yaw = 0, width = 2.4, height = 2.5): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width, 8), tex.mat("orBrosse", 2, 0.2, 0.22, 0.9));
  rod.rotation.z = Math.PI / 2;
  rod.position.y = height;
  g.add(rod);
  const cloth = tex.mat("rideau", 1.4, 1.1, 0.86);
  const left = new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, height * 0.96, 0.04), cloth);
  left.position.set(-width * 0.24, height * 0.48, 0);
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, height * 0.96, 0.04), cloth);
  right.position.set(width * 0.24, height * 0.48, 0);
  g.add(right);
  return g;
}

export function setLobbyLights(root: THREE.Object3D, on: boolean) {
  root.traverse((obj) => {
    if (obj.userData.lobbyLamp && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (mat.emissive) mat.emissiveIntensity = on ? 0.9 : 0.05;
    }
    if (obj.userData.lobbyLamp && obj instanceof THREE.PointLight) {
      obj.intensity = on ? 3.4 : 0.15;
    }
    if (obj.userData.panelLed && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = on ? 0.85 : 0.08;
    }
  });
}
