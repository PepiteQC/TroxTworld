/**
 * TROXTWORLD — Caméras SQDC (6 angles + terminal)
 */
import * as THREE from "three";

export interface CameraNode {
  id: string;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  mesh: THREE.Group;
  isRecording: boolean;
  viewingPlayers: Set<string>;
}

export function buildCameraMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = "camera_mesh";
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
  arm.position.y = -0.1;
  g.add(arm);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    matGlass,
  );
  dome.position.y = -0.2;
  dome.rotation.x = Math.PI;
  g.add(dome);

  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  );
  led.position.set(0, -0.1, 0.08);
  g.add(led);

  return g;
}

export function buildCameraNetwork(
  storeId: string,
  defs: Array<{ id: string; position: [number, number, number]; lookAt: [number, number, number] }>,
): CameraNode[] {
  return defs.map((d) => {
    const mesh = buildCameraMesh();
    mesh.position.set(d.position[0], d.position[1], d.position[2]);
    mesh.lookAt(d.lookAt[0], d.lookAt[1], d.lookAt[2]);
    return {
      id: d.id,
      position: new THREE.Vector3(...d.position),
      lookAt: new THREE.Vector3(...d.lookAt),
      mesh,
      isRecording: true,
      viewingPlayers: new Set(),
    };
  });
}