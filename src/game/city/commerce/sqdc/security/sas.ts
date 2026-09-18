/**
 * TROXTWORLD — SQDC SAS double-porte
 * Empêche les vols par "rush" : la porte intérieure ne s'ouvre
 * qu'après fermeture de l'extérieure (ou détection de badge).
 */
import * as THREE from "three";
import { texConcrete } from "./textures";

export interface SasResult {
  group: THREE.Group;
  collisionWalls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  update: (dt: number, playerPos: THREE.Vector3, hasId: boolean) => void;
  setLockdown: (lock: boolean) => void;
  isLockedDown: () => boolean;
}

export function buildSqdcSas(storeId: string, x: number, y: number, outerZ: number): SasResult {
  const group = new THREE.Group();
  group.name = `sas_${storeId}`;

  const sasDepth = 2.4;
  const innerZ = outerZ - sasDepth;
  const halfW = 2.2;
  const doorW = 1.95;
  const panelBaseX = 0.98;
  const doorDepth = 0.10;

  const collisionWalls: SasResult["collisionWalls"] = [];

  // Murs latéraux du SAS
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.9 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1f1c, roughness: 0.55, metalness: 0.3 });
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

  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 3.0, sasDepth),
      wallMat,
    );
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
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, sasDepth), new THREE.MeshStandardMaterial({ map: texConcrete([2, 2]), roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, y + 0.005, innerZ + sasDepth / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // Encadrements + portes
  function buildDoorRow(z: number, label: string) {
    const frameGroup = new THREE.Group();
    frameGroup.name = `sas_frame_${label}`;
    frameGroup.add(box(0.18, 3.1, 0.22, x - halfW, y + 1.55, z, frameMat));
    frameGroup.add(box(0.18, 3.1, 0.22, x + halfW, y + 1.55, z, frameMat));
    frameGroup.add(box(halfW * 2 + 0.2, 0.18, 0.22, x, y + 3.05, z, frameMat));
    group.add(frameGroup);

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

    // Collisions dynamiques
    const cL = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    const cR = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    collisionWalls.push(cL, cR);
    return { left, right, cL, cR };
  }

  const outer = buildDoorRow(outerZ, "outer");
  const inner = buildDoorRow(innerZ, "inner");

  // Transom émissif au-dessus de la porte extérieure
  const transom = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.32, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1a5632, emissive: 0x2a7a48, emissiveIntensity: 1.4 }),
  );
  transom.position.set(x, y + 2.72, outerZ + 0.07);
  group.add(transom);

  // Portiques anti-vol (2 piliers noirs)
  const antitheftMat = new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.4, metalness: 0.5 });
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.20), antitheftMat);
    pillar.position.set(x + sx * 1.65, y + 1.1, innerZ + 0.6);
    group.add(pillar);
    // LED sur le pilier
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x224422, emissive: 0x44ff66, emissiveIntensity: 1.8 }),
    );
    led.position.set(pillar.position.x, y + 2.15, pillar.position.z + 0.11);
    group.add(led);
  }

  // État
  let outerP = 0, innerP = 0;
  let lockedDown = false;

  const openDist = 1.4;

  function setCollisions(doors: ReturnType<typeof buildDoorRow>, shift: number, z: number) {
    const lx = doors.left.position.x - shift;
    const rx = doors.right.position.x + shift;
    doors.cL.minX = lx - doorW / 2; doors.cL.maxX = lx + doorW / 2;
    doors.cL.minZ = z - doorDepth / 2; doors.cL.maxZ = z + doorDepth / 2;
    doors.cR.minX = rx - doorW / 2; doors.cR.maxX = rx + doorW / 2;
    doors.cR.minZ = z - doorDepth / 2; doors.cR.maxZ = z + doorDepth / 2;
  }

  function update(dt: number, playerPos: THREE.Vector3, _hasId: boolean) {
    if (lockedDown) {
      outerP = Math.max(0, outerP - dt * 4);
      innerP = Math.max(0, innerP - dt * 4);
    } else {
      const distOuter = Math.hypot(playerPos.x - x, playerPos.z - outerZ);
      const distInner = Math.hypot(playerPos.x - x, playerPos.z - innerZ);
      const inDoorway = Math.abs(playerPos.x - x) < halfW - 0.25;

      if (distOuter < 3.0 && inDoorway) outerP = Math.min(1, outerP + dt * 2.8);
      else if (distOuter > 3.6) outerP = Math.max(0, outerP - dt * 2.5);

      // Porte intérieure s'ouvre si on est dans le SAS et l'extérieure est fermée
      const outerClosed = outerP < 0.15;
      if (distInner < 2.6 && inDoorway && outerClosed) innerP = Math.min(1, innerP + dt * 2.8);
      else if (distInner > 3.4 || !outerClosed) innerP = Math.max(0, innerP - dt * 2.5);
    }

    // Application
    outer.left.position.x = x - panelBaseX - outerP * openDist;
    outer.right.position.x = x + panelBaseX + outerP * openDist;
    setCollisions(outer, outerP * openDist, outerZ);

    inner.left.position.x = x - panelBaseX - innerP * openDist;
    inner.right.position.x = x + panelBaseX + innerP * openDist;
    setCollisions(inner, innerP * openDist, innerZ);
  }

  return {
    group,
    collisionWalls,
    update,
    setLockdown: (lock: boolean) => { lockedDown = lock; },
    isLockedDown: () => lockedDown,
  };
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}