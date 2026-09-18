// ============================================================
//  src/utils/threeHelpers.ts
//  Helpers Three.js partagés — dispose, raycaster, terrain
// ============================================================

import * as THREE from 'three';

// ─── Dispose ─────────────────────────────────────────────────

export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        for (const val of Object.values(mat)) {
          if (val instanceof THREE.Texture) val.dispose();
        }
        mat.dispose();
      }
    }
    if ((child as THREE.Sprite).isSprite) {
      const sprite = child as THREE.Sprite;
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
  });
}

export function removeAndDispose(
  scene: THREE.Scene,
  obj:   THREE.Object3D,
): void {
  scene.remove(obj);
  disposeObject(obj);
}

// ─── Terrain ──────────────────────────────────────────────────

export function getTerrainHeight(x: number, z: number): number {
  let elevation = 0;
  if (z > 20) {
    elevation += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 6
               + (z - 20) * 0.12;
  }
  if (z < -40) {
    elevation -= 3 + Math.sin(x * 0.1);
  } else {
    elevation += Math.cos(x * 0.03) * Math.sin(z * 0.03) * 1.5;
  }
  return elevation;
}

// ─── Shared primitives ────────────────────────────────────────

/** Géométries partagées (une seule instance par process) */
export const SharedGeo = {
  playerBody: new THREE.CylinderGeometry(0.7, 0.7, 2, 8),
  playerHead: new THREE.SphereGeometry(0.6, 8, 8),
} as const;

// ─── Lerp ─────────────────────────────────────────────────────

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Canvas resize helper ─────────────────────────────────────

export function fitRenderer(
  renderer: THREE.WebGLRenderer,
  camera:   THREE.PerspectiveCamera,
  container: HTMLElement,
): void {
  const { clientWidth: w, clientHeight: h } = container;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
