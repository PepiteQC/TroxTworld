import * as THREE from "three";
import { matLib } from "./materials";

const FABRIC = [0x8a4a3a, 0x4a5a6a, 0x6a6a4a, 0x7a3a5a, 0x3a5a4a];

const D = {
  seatW: 1.85,
  seatD: 0.92,
  seatH: 0.42,
  backH: 0.68,
  backT: 0.22,
  armW: 0.24,
  armH: 0.58,
  chassisL: 2.35,
  chassisW: 1.55,
  chassisH: 0.16,
  wheelR: 0.28,
  wheelW: 0.16,
  wheelbase: 1.55,
  track: 1.35,
  clearance: 0.14,
};

function darken(color: number, f: number) {
  const r = Math.floor(((color >> 16) & 0xff) * f);
  const g = Math.floor(((color >> 8) & 0xff) * f);
  const b = Math.floor((color & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

function buildBody(fabricColor: number) {
  const g = new THREE.Group();
  const cloth = matLib.get(fabricColor, 0.96);
  const clothDark = matLib.get(darken(fabricColor, 0.72), 0.96);
  const base = new THREE.Mesh(new THREE.BoxGeometry(D.seatW, D.seatH, D.seatD), cloth);
  base.position.y = D.seatH / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);
  const cushionW = (D.seatW - 2 * D.armW) / 2 - 0.04;
  for (const side of [-1, 1]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(cushionW, 0.16, D.seatD - 0.08), cloth);
    cushion.position.set(side * (cushionW / 2 + 0.02), D.seatH + 0.06, 0);
    cushion.scale.y = 0.88;
    cushion.castShadow = true;
    g.add(cushion);
    const dent = new THREE.Mesh(new THREE.SphereGeometry(cushionW * 0.34, 8, 6), clothDark);
    dent.scale.set(1, 0.18, 0.9);
    dent.position.set(side * (cushionW / 2 + 0.02), D.seatH + 0.11, -0.02);
    g.add(dent);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(D.seatW, D.backH, D.backT), cloth);
  back.position.set(0, D.seatH + D.backH / 2, -D.seatD / 2 + D.backT / 2);
  back.rotation.x = 0.09;
  back.castShadow = true;
  g.add(back);
  const btnGeo = new THREE.SphereGeometry(0.022, 6, 5);
  const btnMat = matLib.get(darken(fabricColor, 0.55), 0.85);
  const btns = new THREE.InstancedMesh(btnGeo, btnMat, 12);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      dummy.position.set(-D.seatW / 2 + 0.32 + col * 0.4, D.seatH + 0.14 + row * 0.19, -D.seatD / 2 + D.backT - 0.02);
      dummy.updateMatrix();
      btns.setMatrixAt(i++, dummy.matrix);
    }
  }
  g.add(btns);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(D.armW, D.armH, D.seatD), cloth);
    arm.position.set(side * (D.seatW / 2 - D.armW / 2), D.seatH + D.armH / 2 - 0.1, 0);
    arm.castShadow = true;
    g.add(arm);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(D.armW / 2, D.armW / 2, D.seatD, 8, 1, false, 0, Math.PI), cloth);
    top.rotation.z = Math.PI / 2;
    top.rotation.y = Math.PI / 2;
    top.position.set(side * (D.seatW / 2 - D.armW / 2), D.seatH + D.armH - 0.1, 0);
    g.add(top);
  }
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(D.seatW, 0.14, D.seatD), clothDark);
  skirt.position.y = 0.07;
  g.add(skirt);
  return g;
}

function buildChassis() {
  const g = new THREE.Group();
  const steel = matLib.get(0x4a4e52, 0.72, 0.55);
  const rust = matLib.get(0x7a5030, 0.98);
  const wood = matLib.get(0x8a6a48, 0.95);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, D.chassisH, D.chassisL), steel);
    rail.position.set(side * (D.chassisW / 2 - 0.05), 0, 0);
    rail.castShadow = true;
    g.add(rail);
  }
  for (const z of [-D.chassisL / 2 + 0.2, 0, D.chassisL / 2 - 0.2]) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(D.chassisW, D.chassisH * 0.8, 0.07), steel);
    cross.position.z = z;
    g.add(cross);
  }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(D.chassisW - 0.14, 0.024, D.chassisL - 0.1), wood);
  floor.position.y = D.chassisH / 2 + 0.012;
  floor.receiveShadow = true;
  g.add(floor);
  const weldGeo = new THREE.SphereGeometry(0.028, 6, 5);
  const welds = new THREE.InstancedMesh(weldGeo, rust, 12);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (const side of [-1, 1]) {
    for (const z of [-D.chassisL / 2 + 0.2, 0, D.chassisL / 2 - 0.2]) {
      for (const y of [-D.chassisH / 3, D.chassisH / 3]) {
        dummy.position.set(side * (D.chassisW / 2 - 0.05), y, z);
        dummy.scale.setScalar(0.75);
        dummy.updateMatrix();
        welds.setMatrixAt(i++, dummy.matrix);
      }
    }
  }
  g.add(welds);
  const strap = matLib.get(0x3a3a2a, 0.95);
  for (const z of [-0.55, 0.55]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(D.chassisW + 0.1, 0.035, 0.05), strap);
    s.position.set(0, D.chassisH / 2 + 0.04, z);
    g.add(s);
  }
  return g;
}

function buildEngine() {
  const g = new THREE.Group();
  const black = matLib.get(0x2a2a2e, 0.65, 0.35);
  const alu = matLib.get(0xa8acb0, 0.42, 0.72);
  const exhaust = matLib.get(0x5a5e62, 0.45, 0.68);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.38), black);
  block.position.set(0, 0.2, -D.chassisL / 2 + 0.32);
  block.castShadow = true;
  g.add(block);
  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.018, 0.4), alu);
    fin.position.set(0, 0.1 + i * 0.042, -D.chassisL / 2 + 0.32);
    g.add(fin);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 12), matLib.get(0x8a2a2a, 0.55, 0.4));
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 0.44, -D.chassisL / 2 + 0.32);
  tank.castShadow = true;
  g.add(tank);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), black);
  cap.position.set(0, 0.58, -D.chassisL / 2 + 0.32);
  g.add(cap);
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 10), matLib.get(0x6a6a30, 0.9));
  filter.position.set(0.26, 0.28, -D.chassisL / 2 + 0.32);
  g.add(filter);
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 14), alu);
  pulley.rotation.z = Math.PI / 2;
  pulley.position.set(-0.24, 0.16, -D.chassisL / 2 + 0.32);
  pulley.userData.couchPulley = true;
  g.add(pulley);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.016, 6, 16), matLib.get(0x1a1a1e, 0.95));
  belt.rotation.y = Math.PI / 2;
  belt.position.set(-0.26, 0.1, -D.chassisL / 2 + 0.44);
  belt.userData.couchBelt = true;
  g.add(belt);
  const chrome = matLib.get(0xc8ccd0, 0.22, 0.88);
  const tips: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const header = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.24, 8), exhaust);
    header.rotation.x = Math.PI / 2.6;
    header.position.set(side * 0.14, 0.24, -D.chassisL / 2 + 0.16);
    g.add(header);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.14, 0.18, -D.chassisL / 2 + 0.08),
      new THREE.Vector3(side * 0.2, 0.22, -D.chassisL / 2 - 0.1),
      new THREE.Vector3(side * 0.24, 0.32, -D.chassisL / 2 - 0.26),
      new THREE.Vector3(side * 0.26, 0.42, -D.chassisL / 2 - 0.38),
    ]);
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.034, 8, false), exhaust);
    pipe.castShadow = true;
    g.add(pipe);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.036, 0.11, 10), chrome);
    tip.position.set(side * 0.26, 0.46, -D.chassisL / 2 - 0.42);
    tip.rotation.x = -0.55;
    tip.castShadow = true;
    tip.userData.couchTip = true;
    g.add(tip);
    tips.push(tip);
  }
  return g;
}

function buildWheels() {
  const g = new THREE.Group();
  const tire = matLib.get(0x1a1a1e, 0.94);
  const rim = matLib.get(0x8a8e92, 0.42, 0.72);
  const wheels: THREE.Group[] = [];
  const spots: Array<[number, number]> = [
    [-D.track / 2, D.wheelbase / 2],
    [D.track / 2, D.wheelbase / 2],
    [-D.track / 2, -D.wheelbase / 2],
    [D.track / 2, -D.wheelbase / 2],
  ];
  for (const [x, z] of spots) {
    const wheel = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(D.wheelR, D.wheelR, D.wheelW, 14), tire);
    t.rotation.z = Math.PI / 2;
    t.castShadow = true;
    wheel.add(t);
    const r = new THREE.Mesh(
      new THREE.CylinderGeometry(D.wheelR * 0.55, D.wheelR * 0.55, D.wheelW + 0.01, 10),
      rim,
    );
    r.rotation.z = Math.PI / 2;
    wheel.add(r);
    wheel.position.set(x, D.wheelR, z);
    wheel.userData.couchWheel = true;
    wheel.userData.front = z > 0;
    g.add(wheel);
    wheels.push(wheel);
  }
  return { group: g, wheels };
}

function buildControls() {
  const g = new THREE.Group();
  const metal = matLib.get(0x5a5e62, 0.5, 0.6);
  const grip = matLib.get(0x2a2a2e, 0.9);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.62, 8), metal);
  column.position.set(-0.42, 0.72, 0.46);
  column.rotation.x = -0.42;
  column.castShadow = true;
  g.add(column);
  const steering = new THREE.Group();
  steering.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.019, 8, 20), grip));
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.016), metal);
    const a = (i / 3) * Math.PI * 2;
    spoke.rotation.z = a;
    spoke.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0);
    steering.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 10), metal);
  hub.rotation.x = Math.PI / 2;
  steering.add(hub);
  steering.position.set(-0.42, 0.98, 0.34);
  steering.rotation.x = -0.42;
  steering.userData.couchSteer = true;
  g.add(steering);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.34, 8), metal);
  shifter.position.set(-0.05, 0.74, 0.2);
  shifter.rotation.x = -0.18;
  g.add(shifter);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), grip);
  knob.position.set(-0.05, 0.91, 0.23);
  g.add(knob);
  for (const px of [-0.52, -0.34]) {
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.13), metal);
    pedal.position.set(px, 0.28, 0.66);
    pedal.rotation.x = -0.2;
    g.add(pedal);
  }
  return { group: g, steering };
}

function buildDetails() {
  const g = new THREE.Group();
  const metal = matLib.get(0x6a6e72, 0.5, 0.6);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.07, 12), metal);
  housing.rotation.x = Math.PI / 2;
  housing.position.set(0.18, 0.5, D.chassisL / 2 - 0.04);
  housing.rotation.z = 0.14;
  g.add(housing);
  const lens = matLib.getEmissive(0xfff4d0, 0xffe8a0, 0.35);
  const headlight = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), lens);
  headlight.position.set(0.18, 0.5, D.chassisL / 2 + 0.005);
  headlight.userData.headlight = true;
  g.add(headlight);
  const horn = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), matLib.get(0x1a1a1e, 0.85));
  horn.position.set(-0.62, 0.94, 0.3);
  g.add(horn);
  const trumpet = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.1, 10, 1, true), matLib.get(0xc8a040, 0.35, 0.8));
  trumpet.rotation.z = Math.PI / 2;
  trumpet.position.set(-0.7, 0.94, 0.3);
  g.add(trumpet);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.008), matLib.get(0xd8d4c0, 0.92));
  plate.position.set(0, 0.22, -D.chassisL / 2 - 0.05);
  plate.rotation.z = 0.06;
  g.add(plate);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.07, 10, 1, true), metal);
  cup.position.set(D.seatW / 2 - D.armW / 2, D.seatH + D.armH - 0.06, 0.2);
  g.add(cup);
  return g;
}

export function buildCouch(colorIndex = 0): THREE.Group {
  const root = new THREE.Group();
  root.name = "divan";
  const fabric = FABRIC[colorIndex % FABRIC.length]!;
  const shake = new THREE.Group();
  shake.name = "couch_shake";
  shake.position.y = D.clearance;
  const chassis = buildChassis();
  chassis.position.y = D.chassisH / 2 + 0.14;
  shake.add(chassis);
  const body = buildBody(fabric);
  body.position.y = D.chassisH + 0.16;
  shake.add(body);
  const engine = buildEngine();
  shake.add(engine);
  const { group: controls, steering } = buildControls();
  shake.add(controls);
  shake.add(buildDetails());
  const brake = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.03), matLib.getEmissive(0x6a1a1a, 0xff2010, 0.15));
  brake.position.set(0, 0.38, -D.chassisL / 2 - 0.06);
  brake.userData.couchBrake = true;
  shake.add(brake);
  root.add(shake);
  const { group: wheels, wheels: list } = buildWheels();
  root.add(wheels);
  root.userData.couch = true;
  root.userData.couchWheels = list;
  root.userData.couchSteer = steering;
  root.userData.couchShake = shake;
  return root;
}

export function tickCouch(
  group: THREE.Group,
  dt: number,
  elapsed: number,
  speed: number,
  steer: number,
  throttle: number,
  braking: boolean,
) {
  if (!group.userData.couch) return;
  const wheels = group.userData.couchWheels as THREE.Group[] | undefined;
  const spin = (speed / D.wheelR) * dt;
  if (wheels) {
    for (const w of wheels) {
      w.rotation.x += spin;
      if (w.userData.front) {
        const t = steer * 0.52;
        w.rotation.y += (t - w.rotation.y) * Math.min(1, dt * 9);
      }
    }
  }
  const steering = group.userData.couchSteer as THREE.Group | undefined;
  if (steering) {
    const t = -steer * Math.PI * 0.85;
    steering.rotation.z += (t - steering.rotation.z) * Math.min(1, dt * 11);
  }
  const shake = group.userData.couchShake as THREE.Group | undefined;
  const on = Math.abs(speed) > 0.15 || throttle > 0.05;
  if (shake) {
    if (on) {
      const rpm = 1 + throttle * 3;
      const amp = 0.008 * (1.6 - throttle * 0.9);
      shake.position.y = D.clearance + Math.sin(elapsed * 42 * rpm) * amp;
      shake.rotation.z = Math.sin(elapsed * 38 * rpm) * amp * 0.7;
    } else {
      shake.position.y += (D.clearance - shake.position.y) * Math.min(1, dt * 8);
      shake.rotation.z += (0 - shake.rotation.z) * Math.min(1, dt * 8);
    }
  }
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.userData.couchPulley) obj.rotation.x += dt * 24 * (1 + throttle * 3) * (on ? 1 : 0);
    if (obj.userData.couchBelt) obj.rotation.z += dt * 8 * (1 + throttle * 3) * (on ? 1 : 0);
    if (obj.userData.couchTip) {
      const m = obj.material as THREE.MeshStandardMaterial;
      m.emissive.setHex(0xd06030);
      m.emissiveIntensity = on ? Math.min(1, throttle * 1.2) * 0.35 : 0;
    }
    if (obj.userData.couchBrake) {
      const m = obj.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = braking ? 2.2 : 0.15;
    }
  });
}
