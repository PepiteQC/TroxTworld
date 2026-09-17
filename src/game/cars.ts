/**
 * ═════════════════════════════════════════════════════════════════════════════
 * GESTIONNAIRE DE VÉHICULES HD & MODÈLES 3D GLB (QUÉBEC V3)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { loadGlb } from "./gltf";
import type { WeatherRPState } from "./weatherfx";

export type CarAssetId = "lambo" | "lada" | "jetta" | "civic" | "pickup" | "sq";

const SPECS: Record<CarAssetId, { url: string; length: number; color: number }> = {
  lambo: { url: "/models/lambo.glb", length: 4.65, color: 0xd97706 },
  lada: { url: "/models/lada.glb", length: 4.15, color: 0x475569 },
  jetta: { url: "/models/jetta.glb", length: 4.55, color: 0x1e293b },
  civic: { url: "/models/civic.glb", length: 4.50, color: 0x0f172a },
  pickup: { url: "/models/pickup.glb", length: 5.30, color: 0xb91c1c },
  sq: { url: "/models/sq.glb", length: 4.85, color: 0x111827 },
};

// ═══════════════════════════════════════════════════════════════════
// OPTIMISATION ET CALIBRATION DES MODÈLES 3D GLB IMPORTÉS
// ═══════════════════════════════════════════════════════════════════

function optimizeGlbCar(model: THREE.Object3D, targetLength: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Redressement de l'axe si le modèle 3D est orienté de travers
  if (size.x > size.z * 1.15) {
    model.rotation.y += Math.PI / 2;
    box.setFromObject(model);
    box.getSize(size);
  }

  // Échelle proportionnelle précise
  const currentLen = Math.max(size.z, 0.1);
  const scale = targetLength / currentLen;
  model.scale.set(scale, scale, scale);

  // Recentrage sur le point de pivot physique
  box.setFromObject(model);
  model.position.x -= (box.min.x + box.max.x) / 2;
  model.position.z -= (box.min.z + box.max.z) / 2;
  model.position.y -= box.min.y;

  // Activation des ombres dynamiques et amélioration PBR des matériaux
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          const name = (child.name + " " + mat.name).toLowerCase();
          // Peinture carrosserie
          if (name.includes("body") || name.includes("paint") || name.includes("carrosserie") || name.includes("car")) {
            mat.metalness = 0.85;
            mat.roughness = 0.18;
          }
          // Vitres teintées
          if (name.includes("glass") || name.includes("window") || name.includes("vitre")) {
            mat.transparent = true;
            mat.opacity = 0.45;
            mat.roughness = 0.05;
            mat.metalness = 0.1;
          }
          mat.needsUpdate = true;
        }
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// MODÈLE PROCÉDURAL HD DE SECOURS (POUR PICKUP / CIVIC / CHARGEMENT)
// ═══════════════════════════════════════════════════════════════════

export function buildDetailedVehicle(id: CarAssetId): THREE.Group {
  const root = new THREE.Group();
  root.name = `procedural_${id}`;
  const spec = SPECS[id] || SPECS.civic;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: spec.color,
    metalness: 0.85,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.55,
  });

  const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.3 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.1, metalness: 0.95 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.92, metalness: 0.05 });

  const length = spec.length;
  const isTruck = id === "pickup";
  const width = isTruck ? 2.15 : 1.9;

  // Carrosserie profilée
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.52, length * 0.94), paintMat);
  body.position.y = 0.48;
  body.castShadow = true;
  root.add(body);

  // Cabine
  const cabinLength = isTruck ? length * 0.45 : length * 0.5;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.58, cabinLength), paintMat);
  cabin.position.set(0, 0.95, isTruck ? length * 0.08 : -0.05);
  cabin.castShadow = true;
  root.add(cabin);

  // Pare-brise
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.52, 0.04), glassMat);
  windshield.position.set(0, 0.95, cabin.position.z + cabinLength / 2 + 0.04);
  windshield.rotation.x = -0.45;
  root.add(windshield);

  // Vitre arrière
  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.48, 0.04), glassMat);
  rearWindow.position.set(0, 0.95, cabin.position.z - cabinLength / 2 - 0.04);
  rearWindow.rotation.x = 0.35;
  root.add(rearWindow);

  // Roues avec jantes
  const wheelRadius = isTruck ? 0.42 : 0.35;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.24, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, 0.25, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-width * 0.48, length * 0.3],
    [width * 0.48, length * 0.3],
    [-width * 0.48, -length * 0.28],
    [width * 0.48, -length * 0.28],
  ];

  wheelPositions.forEach(([x, z], idx) => {
    const wheelMesh = new THREE.Mesh(wheelGeo, tireMat);
    wheelMesh.position.set(x, wheelRadius, z);
    wheelMesh.castShadow = true;

    const rimMesh = new THREE.Mesh(rimGeo, chromeMat);
    wheelMesh.add(rimMesh);

    wheelMesh.userData = { wheel: wheelRadius, frontWheel: idx < 2 };
    root.add(wheelMesh);
  });

  // Ombre de contact au sol
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.1, length * 1.05),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  return root;
}

// ═══════════════════════════════════════════════════════════════════
// CRÉATION DE VÉHICULE AVEC CHARGEMENT ASYNCHRONE DU GLB
// ═══════════════════════════════════════════════════════════════════

function createCarSlot(id: CarAssetId): THREE.Group {
  const root = new THREE.Group();
  root.name = `vehicle_slot_${id}`;

  // 1. Modèle HD procédural immédiat
  const placeholder = buildDetailedVehicle(id);
  root.add(placeholder);

  // 2. Chargement asynchrone du fichier .glb
  const spec = SPECS[id];
  if (spec?.url) {
    loadGlb(spec.url)
      .then((glbScene) => {
        const model = glbScene.clone(true);
        optimizeGlbCar(model, spec.length);

        // Remplacement propre du placeholder par le vrai modèle 3D
        while (root.children.length) root.remove(root.children[0]!);
        root.add(model);
      })
      .catch(() => {
        // En cas d'erreur de chargement, le modèle procédural HD reste en place
      });
  }

  return root;
}

export function buildLambo() { return createCarSlot("lambo"); }
export function buildLada() { return createCarSlot("lada"); }
export function buildJetta() { return createCarSlot("jetta"); }
export function buildCivic() { return createCarSlot("civic"); }
export function buildPickup() { return createCarSlot("pickup"); }
export function buildSq() { return createCarSlot("sq"); }

export async function loadCar(id: CarAssetId): Promise<THREE.Group> {
  return createCarSlot(id);
}

export function updateCarWeather(car: THREE.Group, weather: WeatherRPState) {
  const wetFactor = Math.min(1, weather.wetness / 100);
  car.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.roughness = THREE.MathUtils.lerp(mat.roughness, 0.05, wetFactor * 0.8);
        }
      });
    }
  });
}