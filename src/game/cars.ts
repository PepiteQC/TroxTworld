/**
 * ═════════════════════════════════════════════════════════════════════════════
 * GESTIONNAIRE DE VÉHICULES HD & MODÈLES 3D GLB (QUÉBEC V3)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { loadGlb } from "./gltf";
<<<<<<< HEAD
import { wireCsm } from "./csm";
import { usePbr, type QcMat } from "./materials";
=======
import type { WeatherRPState } from "./weatherfx";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

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

<<<<<<< HEAD
function placeholder(id: CarAssetId): THREE.Group {
  const color = id === "lambo" ? 0x1a1a22 : id === "lada" ? 0x8a9aaa : 0x2a3a58;
  const g = buildSedan(color);
  g.name = id;
  const slot = new THREE.Group();
  slot.name = "car-slot";
  while (g.children.length) slot.add(g.children[0]!);
  g.add(slot);
  attachAo(g, SPECS[id].length);
  const token = { id };
  slot.userData.carToken = token;
  void loadCar(id)
    .then((rig) => {
      if (slot.userData.carToken !== token) return;
      while (slot.children.length) slot.remove(slot.children[0]!);
      slot.add(rig);
    })
    .catch(() => {
      /* berline low-poly reste */
    });
  return g;
}

export function buildLambo() {
  return placeholder("lambo");
}
export function buildLada() {
  return placeholder("lada");
}
export function buildJetta() {
  return placeholder("jetta");
}

const civicLoader = new THREE.TextureLoader();
const civicMaps = new Map<string, THREE.Texture>();

function civicMap(url: string, linear = false, repeat = false) {
  const key = `${url}|${linear}|${repeat}`;
  const hit = civicMaps.get(key);
  if (hit) return hit;
  const t = civicLoader.load(url);
  t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = 2;
  t.generateMipmaps = true;
  civicMaps.set(key, t);
  return t;
}

function civicMat(opts: {
  color?: number;
  map?: THREE.Texture;
  nrm?: THREE.Texture;
  ao?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  eInt?: number;
  transparent?: boolean;
  opacity?: number;
}): QcMat {
  const roughness = opts.roughness ?? 0.45;
  const metalness = opts.metalness ?? 0.2;
  const pbr = usePbr(roughness, metalness);
  const mat = pbr
    ? new THREE.MeshStandardMaterial({
        color: opts.color ?? 0xffffff,
        map: opts.map,
        normalMap: opts.nrm,
        aoMap: opts.ao,
        roughness,
        metalness,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.eInt ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
      })
    : new THREE.MeshLambertMaterial({
        color: opts.color ?? 0xffffff,
        map: opts.map,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.eInt ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
      });
  return wireCsm(mat) as QcMat;
}

/** Honda Civic — plaque MB-A, pneus + calandre PBR des textures uploadées. */
export function buildCivic() {
  const g = new THREE.Group();
  g.name = "civic";
  const paint = civicMat({ color: 0x0b0b0e, roughness: 0.26, metalness: 0.62 });
  const black = civicMat({ color: 0x111114, roughness: 0.55, metalness: 0.25 });
  const chrome = civicMat({ color: 0xc8ccd0, roughness: 0.18, metalness: 0.92 });
  const glass = civicMat({ color: 0x0a1520, roughness: 0.08, metalness: 0.75, transparent: true, opacity: 0.42 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.58, 4.42), paint);
  body.position.y = 0.68;
  body.castShadow = true;
  g.add(body);

  const rocker = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.12, 4.2), black);
  rocker.position.y = 0.4;
  g.add(rocker);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.52, 1.78), paint);
  cabin.position.set(0, 1.2, -0.18);
  cabin.castShadow = true;
  g.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.55), paint);
  roof.position.set(0, 1.48, -0.2);
  g.add(roof);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.04), glass);
  windshield.position.set(0, 1.18, 0.72);
  windshield.rotation.x = -0.42;
  g.add(windshield);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.36, 0.04), glass);
  rearGlass.position.set(0, 1.18, -1.08);
  rearGlass.rotation.x = 0.38;
  g.add(rearGlass);

  const grille = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.32),
    civicMat({ map: civicMap("/textures/civic/grille.jpg"), roughness: 0.4, metalness: 0.35 }),
  );
  grille.position.set(0, 0.62, 2.24);
  g.add(grille);

  const grilleBas = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 0.2),
    civicMat({ map: civicMap("/textures/civic/grille-bas.jpg"), roughness: 0.42, metalness: 0.38 }),
  );
  grilleBas.position.set(0, 0.46, 2.255);
  g.add(grilleBas);

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.18),
    civicMat({ map: civicMap("/textures/civic/badge.jpg"), roughness: 0.25, metalness: 0.7 }),
  );
  badge.position.set(0, 0.78, 2.245);
  g.add(badge);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 0.28), black);
  bumper.position.set(0, 0.38, 2.18);
  g.add(bumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 0.24), black);
  rearBumper.position.set(0, 0.38, -2.18);
  g.add(rearBumper);

  const plateMat = civicMat({ map: civicMap("/textures/civic/plate.jpg"), roughness: 0.55, metalness: 0.15 });
  const plateF = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), plateMat);
  plateF.position.set(0, 0.42, 2.33);
  g.add(plateF);
  const plateR = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), plateMat);
  plateR.position.set(0, 0.42, -2.31);
  plateR.rotation.y = Math.PI;
  g.add(plateR);

  const lamp = civicMat({ color: 0xf5f0d8, roughness: 0.2, metalness: 0.4, emissive: 0xfff4cc, eInt: 0.55 });
  for (const x of [-0.62, 0.62]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.08), lamp);
    h.position.set(x, 0.72, 2.22);
    g.add(h);
  }
  const tail = civicMat({ color: 0x8a1018, roughness: 0.35, metalness: 0.2, emissive: 0xff2a2a, eInt: 0.45 });
  for (const x of [-0.62, 0.62]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.06), tail);
    t.position.set(x, 0.74, -2.22);
    g.add(t);
  }

  const chromeStrip = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 0.02), chrome);
  chromeStrip.position.set(0, 0.52, 2.24);
  g.add(chromeStrip);

  const tireMap = civicMap("/textures/civic/tire.jpg", false, true);
  tireMap.repeat.set(1, 3);
  const tireNrm = civicMap("/textures/civic/tire-nrm.jpg", true, true);
  tireNrm.repeat.set(1, 3);
  const tire = civicMat({ map: tireMap, nrm: tireNrm, roughness: 0.92, metalness: 0.05, color: 0x1a1a1c });
  const rim = civicMat({ map: civicMap("/textures/civic/wheel.jpg"), roughness: 0.28, metalness: 0.72 });
  const disc = civicMat({
    map: civicMap("/textures/civic/brake.jpg"),
    ao: civicMap("/textures/civic/brake-ao.jpg", true),
    roughness: 0.4,
    metalness: 0.65,
=======
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
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  });
}