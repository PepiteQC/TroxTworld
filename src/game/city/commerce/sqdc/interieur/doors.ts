/**
 * TROXTWORLD — SAS double-porte SQDC + portes sécurisées
 * Protection anti-vol par SAS séquentiel : la porte intérieure
 * ne s'ouvre que si l'extérieure est verrouillée (ou sur badge).
 */
import * as THREE from "three";
import { sqdcMaterials } from "../materiaux";

export interface SasResult {
  group: THREE.Group;
  collisionWalls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  update: (dt: number, playerPos: THREE.Vector3, hasId: boolean) => void;
  setLockdown: (lock: boolean) => void;
  isLockedDown: () => boolean;
  triggerAlarm: () => void;
  sasCenterZ: number;
}

export function buildSqdcSas(
  storeId: string,
  x: number,
  y: number,
  outerZ: number,
): SasResult {
  const group = new THREE.Group();
  group.name = `sas_${storeId}`;

  const sasDepth = 2.4;
  const innerZ = outerZ - sasDepth;
  const halfW = 2.2;
  const doorW = 1.95;
  const panelBaseX = 0.98;
  const doorDepth = 0.1;

  const collisionWalls: SasResult["collisionWalls"] = [];
  const mats = sqdcMaterials();

  // Murs latéraux
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, sasDepth), mats.wall);
    wall.position.set(x + sx * halfW, y + 1.5, innerZ + sasDepth / 2);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
    collisionWalls.push({
      minX: wall.position.x - 0.14, maxX: wall.position.x + 0.14,
      minZ: wall.position.z - sasDepth / 2, maxZ: wall.position.z + sasDepth / 2,
    });
  }

  // Sol
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2, sasDepth),
    mats.concrete,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, y + 0.005, innerZ + sasDepth / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // Encadrements + portes
  function buildDoorRow(z: number, label: string) {
    const fg = new THREE.Group();
    fg.name = `sas_frame_${label}`;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1f1c, roughness: 0.55, metalness: 0.3 });
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.1, 0.22), frameMat);
      post.position.set(x + sx * halfW, y + 1.55, z);
      fg.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.2, 0.18, 0.22), frameMat);
    lintel.position.set(x, y + 3.05, z);
    fg.add(lintel);
    group.add(fg);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x9cc7d6,
      transmission: 0.92,
      thickness: 0.4,
      roughness: 0.06,
      ior: 1.45,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    const left = new THREE.Mesh(new THREE.BoxGeometry(doorW, 2.78, doorDepth), glassMat);
    left.name = `sas_door_${label}_left`;
    left.position.set(x - panelBaseX, y + 1.42, z);
    left.castShadow = true;
    group.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(doorW, 2.78, doorDepth), glassMat);
    right.name = `sas_door_${label}_right`;
    right.position.set(x + panelBaseX, y + 1.42, z);
    right.castShadow = true;
    group.add(right);

    // Poignées
    for (const lr of [-1, 1]) {
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.6, 10),
        new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.22, metalness: 0.88 }),
      );
      handle.position.set(x + lr * (panelBaseX - doorW / 2 + 0.2), y + 1.42, z + 0.13);
      group.add(handle);
    }

    const cL = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    const cR = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    collisionWalls.push(cL, cR);
    return { left, right, cL, cR };
  }

  const outer = buildDoorRow(outerZ, "outer");
  const inner = buildDoorRow(innerZ, "inner");

  // Transom émissif
  const transom = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.32, 0.12),
    mats.emissiveGreen,
  );
  transom.position.set(x, y + 2.72, outerZ + 0.07);
  group.add(transom);

  // Portiques antivol
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.4, metalness: 0.5 });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x224422, emissive: 0x44ff66, emissiveIntensity: 1.8 });
  const leds: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.2), pillarMat);
    pillar.position.set(x + sx * 1.65, y + 1.1, innerZ + 0.6);
    group.add(pillar);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), ledMat.clone());
    led.position.set(pillar.position.x, y + 2.15, pillar.position.z + 0.11);
    group.add(led);
    leds.push(led);
  }

  let outerP = 0;
  let innerP = 0;
  let lockedDown = false;
  let alarmFlash = 0;
  const openDist = 1.4;

  function setCollisions(d: ReturnType<typeof buildDoorRow>, shift: number, z: number) {
    const lx = d.left.position.x - shift;
    const rx = d.right.position.x + shift;
    d.cL.minX = lx - doorW / 2; d.cL.maxX = lx + doorW / 2;
    d.cL.minZ = z - doorDepth / 2; d.cL.maxZ = z + doorDepth / 2;
    d.cR.minX = rx - doorW / 2; d.cR.maxX = rx + doorW / 2;
    d.cR.minZ = z - doorDepth / 2; d.cR.maxZ = z + doorDepth / 2;
  }

  return {
    group,
    collisionWalls,
    sasCenterZ: innerZ + sasDepth / 2,
    update: (dt, playerPos, _hasId) => {
      const safeDt = Math.min(Math.max(dt, 0), 0.05);

      if (alarmFlash > 0) {
        alarmFlash -= safeDt;
        const on = Math.floor(alarmFlash * 8) % 2 === 0;
        leds.forEach((led) => {
          const m = led.material as THREE.MeshStandardMaterial;
          m.color.setHex(on ? 0xff2222 : 0x220000);
          m.emissive.setHex(on ? 0xff2222 : 0x220000);
        });
      } else {
        leds.forEach((led) => {
          const m = led.material as THREE.MeshStandardMaterial;
          m.color.setHex(0x224422);
          m.emissive.setHex(0x44ff66);
        });
      }

      if (lockedDown) {
        outerP = Math.max(0, outerP - safeDt * 4);
        innerP = Math.max(0, innerP - safeDt * 4);
      } else {
        const distOuter = Math.hypot(playerPos.x - x, playerPos.z - outerZ);
        const distInner = Math.hypot(playerPos.x - x, playerPos.z - innerZ);
        const inDoorway = Math.abs(playerPos.x - x) < halfW - 0.25;

        if (distOuter < 3.0 && inDoorway) outerP = Math.min(1, outerP + safeDt * 2.8);
        else if (distOuter > 3.6) outerP = Math.max(0, outerP - safeDt * 2.5);

        const outerClosed = outerP < 0.15;
        if (distInner < 2.6 && inDoorway && outerClosed) innerP = Math.min(1, innerP + safeDt * 2.8);
        else if (distInner > 3.4 || !outerClosed) innerP = Math.max(0, innerP - safeDt * 2.5);
      }

      outer.left.position.x = x - panelBaseX - outerP * openDist;
      outer.right.position.x = x + panelBaseX + outerP * openDist;
      setCollisions(outer, outerP * openDist, outerZ);

      inner.left.position.x = x - panelBaseX - innerP * openDist;
      inner.right.position.x = x + panelBaseX + innerP * openDist;
      setCollisions(inner, innerP * openDist, innerZ);
    },
    setLockdown: (lock) => { lockedDown = lock; },
    isLockedDown: () => lockedDown,
    triggerAlarm: () => { alarmFlash = 8; },
  };
}

/* ─────────── PORTE RÉSERVE (badge employé) ─────────── */
export function buildReserveDoor(x: number, y: number, z: number, width = 1.4, height = 2.3): THREE.Group {
  const g = new THREE.Group();
  g.name = "reserve_door";
  const mats = sqdcMaterials();

  // Encadrement
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1f1c, roughness: 0.55, metalness: 0.3 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, height + 0.2, 0.22), frameMat)).position.set(x - width / 2, y + (height + 0.2) / 2, z);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, height + 0.2, 0.22), frameMat)).position.set(x + width / 2, y + (height + 0.2) / 2, z);

  // Vantail
  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.1, height - 0.15, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x2a2e2c, roughness: 0.55, metalness: 0.4 }),
  );
  leaf.position.set(x, y + height / 2, z);
  leaf.name = "reserve_door_leaf";
  g.add(leaf);

  // Badge reader
  const readerBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.16, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }),
  );
  readerBody.position.set(x + width / 2 + 0.14, y + 1.2, z);
  g.add(readerBody);

  const led = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.03, 0.005),
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 }),
  );
  led.position.set(x + width / 2 + 0.14, y + 1.25, z + 0.017);
  led.name = "reserve_door_led";
  g.add(led);

  return g;
}