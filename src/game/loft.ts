import * as THREE from "three";
import { loadGlb } from "./gltf";

const box = new THREE.Box3();
const size = new THREE.Vector3();

/**
 * Place le loft Sketchfab (скетч.fbx → loft.glb meshopt) dans un intérieur.
 * Les murs/collisions de l'appartement restent ceux du projet.
 */
export function mountLoft(host: THREE.Group, width: number, depth: number, height: number) {
  const slot = new THREE.Group();
  slot.name = "loft-slot";
  host.add(slot);
  const token = { id: "loft" };
  slot.userData.loftToken = token;
  void loadGlb("/models/loft.glb")
    .then((src) => {
      if (slot.userData.loftToken !== token) return;
      const wrap = new THREE.Group();
      wrap.name = "loft-rig";
      wrap.add(src);
      box.setFromObject(wrap);
      box.getSize(size);
      const s = Math.min(
        (width * 0.9) / Math.max(0.01, size.x),
        (depth * 0.9) / Math.max(0.01, size.z),
        (height * 0.92) / Math.max(0.01, size.y),
      );
      wrap.scale.multiplyScalar(s);
      box.setFromObject(wrap);
      wrap.position.x -= (box.min.x + box.max.x) / 2;
      wrap.position.z -= (box.min.z + box.max.z) / 2;
      wrap.position.y -= box.min.y + 0.01;
      wrap.traverse((obj) => {
        obj.castShadow = obj.type === "Mesh";
        obj.receiveShadow = obj.type === "Mesh";
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const raw of mats) {
          const m = raw as THREE.MeshStandardMaterial;
          if (!m || !("emissive" in m)) continue;
          if (m.map && !m.emissiveMap) {
            m.emissiveMap = m.map;
            m.emissive = new THREE.Color(0x6a6a6a);
            m.emissiveIntensity = 0.42;
          }
        }
      });
      const proc = host.getObjectByName("appart-proc");
      if (proc) proc.visible = false;
      const fill = new THREE.PointLight(0xffe2c4, 3.2, 14, 1.35);
      fill.position.set(0, Math.max(1.5, height * 0.68), 0);
      slot.add(fill);
      const ember = new THREE.PointLight(0xff7a32, 1.6, 8, 1.8);
      ember.position.set(-width * 0.22, 0.75, -depth * 0.08);
      slot.add(ember);
      slot.add(wrap);
    })
    .catch(() => {
      /* appartement procédural reste */
    });
  return slot;
}
