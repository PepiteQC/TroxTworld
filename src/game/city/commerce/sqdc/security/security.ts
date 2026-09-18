/**
 * TROXTWORLD — SQDC Sécurité : caméras, portiques, alarme, lockdown.
 */
import * as THREE from "three";
import { netEmit } from "../net";
import { dispatchPolice, addWantedPoints } from "../police";

export interface CameraNode {
  id: string;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  mesh: THREE.Group;
}

export interface SecuritySystem {
  cameras: CameraNode[];
  setLockdown: (on: boolean) => void;
  triggerAlarm: (reason: string, suspectId?: string) => void;
  onTheftDetected: (suspectId: string, itemId: string) => void;
  update: (dt: number) => void;
}

export function buildSqdcSecurity(storeId: string, storePos: { x: number; z: number }): SecuritySystem {
  const cameras: CameraNode[] = [];
  let lockedDown = false;
  let alarmTimer = 0;

  const camDefs = [
    { id: "cam_entry", pos: [0, 3.0, 6.0], look: [0, 1.5, 0] },
    { id: "cam_registers", pos: [0, 3.0, -3.0], look: [0, 1.3, -4.5] },
    { id: "cam_aisles_l", pos: [-5.5, 3.0, 0], look: [-3.0, 1.3, 0] },
    { id: "cam_aisles_r", pos: [5.5, 3.0, 0], look: [3.0, 1.3, 0] },
    { id: "cam_reserve", pos: [5.0, 3.0, -4.0], look: [5.0, 1.3, -5.6] },
    { id: "cam_back", pos: [0, 3.0, -5.8], look: [0, 1.5, -2.0] },
  ];

  for (const d of camDefs) {
    const mesh = makeCameraMesh();
    mesh.position.set(d.pos[0], d.pos[1], d.pos[2]);
    mesh.lookAt(d.look[0], d.look[1], d.look[2]);
    cameras.push({
      id: `${storeId}_${d.id}`,
      position: new THREE.Vector3(...d.pos),
      lookAt: new THREE.Vector3(...d.look),
      mesh,
    });
  }

  return {
    cameras,
    setLockdown: (on: boolean) => {
      lockedDown = on;
      netEmit("sqdc:lockdown", { storeId, locked: on });
    },
    triggerAlarm: (reason: string, suspectId?: string) => {
      alarmTimer = 20;
      netEmit("sqdc:alarm", { storeId, reason, suspectId });

      dispatchPolice({
        location: storePos,
        priority: "critical",
        type: "Vol SQDC",
        description: reason,
      });

      if (suspectId) {
        addWantedPoints(suspectId, 60, "Vol à l'étalage SQDC");
      }
    },
    onTheftDetected: (suspectId: string, itemId: string) => {
      netEmit("sqdc:theft_detected", { storeId, suspectId, itemId });
      dispatchPolice({
        location: storePos,
        priority: "high",
        type: "Antivol SQDC",
        description: `Article non payé : ${itemId}`,
      });
      addWantedPoints(suspectId, 40, "Vol à l'étalage SQDC");
    },
    update: (dt: number) => {
      if (alarmTimer > 0) alarmTimer = Math.max(0, alarmTimer - dt);
    },
  };
}

function makeCameraMesh(): THREE.Group {
  const g = new THREE.Group();
  const matDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.4 });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a2a,
    transmission: 0.6,
    roughness: 0.15,
    thickness: 0.3,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), matDark);
  g.add(base);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), matDark);
  arm.position.y = -0.10;
  g.add(arm);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), matGlass);
  dome.position.y = -0.20;
  dome.rotation.x = Math.PI;
  g.add(dome);

  // LED rouge clignotante
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  );
  led.position.set(0, -0.10, 0.08);
  g.add(led);

  return g;
}