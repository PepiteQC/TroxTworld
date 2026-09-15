import * as THREE from "three";
import { buildSedan } from "./architecture";
import { loadGlb } from "./gltf";
import { wireCsm } from "./csm";
import { usePbr, type QcMat } from "./materials";
import type { WeatherRPState } from "./weatherfx"; // <-- Import de l'état RP météo

const aoLoader = new THREE.TextureLoader();
let aoMap: THREE.Texture | null = null;

function getAoMap() {
  if (aoMap) return aoMap;
  aoMap = aoLoader.load("/textures/car-ao.jpg");
  aoMap.colorSpace = THREE.SRGBColorSpace;
  aoMap.wrapS = THREE.ClampToEdgeWrapping;
  aoMap.wrapT = THREE.ClampToEdgeWrapping;
  aoMap.anisotropy = 2;
  return aoMap;
}

function aoBlob(length: number) {
  const mat = new THREE.MeshBasicMaterial({
    map: getAoMap(),
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.85, length * 1.25), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.renderOrder = -1;
  mesh.name = "car-ao";
  return mesh;
}

export type CarAssetId = "lambo" | "lada" | "jetta";

const SPECS: Record<CarAssetId, { url: string; length: number }> = {
  lambo: { url: "/models/lambo.glb", length: 4.7 },
  lada: { url: "/models/lada.glb", length: 4.15 },
  jetta: { url: "/models/jetta.glb", length: 4.55 },
};

const originals = new Map<CarAssetId, THREE.Object3D>();
const pending = new Map<CarAssetId, Promise<THREE.Object3D>>();
const box = new THREE.Box3();
const size = new THREE.Vector3();

function fitCar(root: THREE.Object3D, length: number) {
  box.setFromObject(root);
  box.getSize(size);
  if (size.x > size.z * 1.15) root.rotation.y += Math.PI / 2;
  box.setFromObject(root);
  box.getSize(size);
  const len = Math.max(size.z, 0.01);
  root.scale.multiplyScalar(length / len);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
  root.rotation.y += Math.PI;
}

async function loadOriginal(id: CarAssetId): Promise<THREE.Object3D> {
  const hit = originals.get(id);
  if (hit) return hit;
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const spec = SPECS[id];
  const job = loadGlb(spec.url).then((obj) => {
    originals.set(id, obj);
    pending.delete(id);
    return obj;
  });
  pending.set(id, job);
  return job;
}

function attachAo(g: THREE.Group, length: number) {
  if (g.getObjectByName("car-ao")) return;
  const blob = aoBlob(length);
  g.add(blob);
}

/**
 * Injecte les éléments RP dynamiques sur n'importe quel véhicule (phares, neige, boue).
 */
function injectCarRPParts(car: THREE.Group, length: number) {
  // 1. Phares automatiques (SpotLights)
  const hlL = new THREE.SpotLight(0xfff4cc, 0, 30, Math.PI / 5, 0.4, 1);
  hlL.name = "headlight-L";
  hlL.position.set(-length * 0.18, 0.8, length * 0.48);
  hlL.target.position.set(-length * 0.18, 0, length * 0.48 + 15);
  car.add(hlL);
  car.add(hlL.target);

  const hlR = new THREE.SpotLight(0xfff4cc, 0, 30, Math.PI / 5, 0.4, 1);
  hlR.name = "headlight-R";
  hlR.position.set(length * 0.18, 0.8, length * 0.48);
  hlR.target.position.set(length * 0.18, 0, length * 0.48 + 15);
  car.add(hlR);
  car.add(hlR.target);

  // 2. Neige sur le toit
  const snowRoof = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.38, 0.08, length * 0.32),
    new THREE.MeshBasicMaterial({ color: 0xf0f4f8, transparent: true, opacity: 0, depthWrite: false })
  );
  snowRoof.name = "car-snow-roof";
  snowRoof.position.set(0, 1.55, -length * 0.05);
  snowRoof.renderOrder = 1;
  car.add(snowRoof);

  // 3. Boue / Salissure sous le châssis
  const mud = new THREE.Mesh(
    new THREE.PlaneGeometry(length * 0.45, length * 0.95),
    new THREE.MeshBasicMaterial({ color: 0x2a1a0a, transparent: true, opacity: 0, depthWrite: false })
  );
  mud.rotation.x = -Math.PI / 2;
  mud.position.set(0, 0.04, 0);
  mud.name = "car-mud";
  mud.renderOrder = -1;
  car.add(mud);
}

export async function loadCar(id: CarAssetId): Promise<THREE.Group> {
  const src = await loadOriginal(id);
  const copy = src.clone(true);
  const wrap = new THREE.Group();
  wrap.name = `car:${id}`;
  wrap.add(copy);
  fitCar(wrap, SPECS[id].length);
  wrap.position.y = -0.42;
  wrap.userData.sharedAsset = true;
  injectCarRPParts(wrap, SPECS[id].length); // <-- Injection RP
  return wrap;
}

function placeholder(id: CarAssetId): THREE.Group {
  const color = id === "lambo" ? 0x1a1a22 : id === "lada" ? 0x8a9aaa : 0x2a3a58;
  const g = buildSedan(color);
  g.name = id;
  const slot = new THREE.Group();
  slot.name = "car-slot";
  while (g.children.length) slot.add(g.children[0]!);
  g.add(slot);
  attachAo(g, SPECS[id].length);
  injectCarRPParts(g, SPECS[id].length); // <-- Injection RP
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

export function buildLambo() { return placeholder("lambo"); }
export function buildLada() { return placeholder("lada"); }
export function buildJetta() { return placeholder("jetta"); }

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
  color?: number; map?: THREE.Texture; nrm?: THREE.Texture; ao?: THREE.Texture;
  roughness?: number; metalness?: number; emissive?: number; eInt?: number;
  transparent?: boolean; opacity?: number;
}): QcMat {
  const roughness = opts.roughness ?? 0.45;
  const metalness = opts.metalness ?? 0.2;
  const pbr = usePbr(roughness, metalness);
  const mat = pbr
    ? new THREE.MeshStandardMaterial({
        color: opts.color ?? 0xffffff, map: opts.map, normalMap: opts.nrm, aoMap: opts.ao,
        roughness, metalness, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.eInt ?? 0,
        transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1,
      })
    : new THREE.MeshLambertMaterial({
        color: opts.color ?? 0xffffff, map: opts.map,
        emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.eInt ?? 0,
        transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1,
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
  body.position.y = 0.68; body.castShadow = true; g.add(body);

  const rocker = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.12, 4.2), black);
  rocker.position.y = 0.4; g.add(rocker);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.52, 1.78), paint);
  cabin.position.set(0, 1.2, -0.18); cabin.castShadow = true; g.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.55), paint);
  roof.position.set(0, 1.48, -0.2); g.add(roof);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.04), glass);
  windshield.position.set(0, 1.18, 0.72); windshield.rotation.x = -0.42; g.add(windshield);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.36, 0.04), glass);
  rearGlass.position.set(0, 1.18, -1.08); rearGlass.rotation.x = 0.38; g.add(rearGlass);

  const grille = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.32),
    civicMat({ map: civicMap("/textures/civic/grille.jpg"), roughness: 0.4, metalness: 0.35 }),
  );
  grille.position.set(0, 0.62, 2.24); g.add(grille);

  const grilleBas = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 0.2),
    civicMat({ map: civicMap("/textures/civic/grille-bas.jpg"), roughness: 0.42, metalness: 0.38 }),
  );
  grilleBas.position.set(0, 0.46, 2.255); g.add(grilleBas);

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.18),
    civicMat({ map: civicMap("/textures/civic/badge.jpg"), roughness: 0.25, metalness: 0.7 }),
  );
  badge.position.set(0, 0.78, 2.245); g.add(badge);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 0.28), black);
  bumper.position.set(0, 0.38, 2.18); g.add(bumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 0.24), black);
  rearBumper.position.set(0, 0.38, -2.18); g.add(rearBumper);

  const plateMat = civicMat({ map: civicMap("/textures/civic/plate.jpg"), roughness: 0.55, metalness: 0.15 });
  const plateF = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), plateMat);
  plateF.position.set(0, 0.42, 2.33); g.add(plateF);
  const plateR = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), plateMat);
  plateR.position.set(0, 0.42, -2.31); plateR.rotation.y = Math.PI; g.add(plateR);

  const lamp = civicMat({ color: 0xf5f0d8, roughness: 0.2, metalness: 0.4, emissive: 0xfff4cc, eInt: 0.55 });
  for (const x of [-0.62, 0.62]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.08), lamp);
    h.position.set(x, 0.72, 2.22); g.add(h);
  }
  const tail = civicMat({ color: 0x8a1018, roughness: 0.35, metalness: 0.2, emissive: 0xff2a2a, eInt: 0.45 });
  for (const x of [-0.62, 0.62]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.06), tail);
    t.position.set(x, 0.74, -2.22); g.add(t);
  }

  const chromeStrip = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 0.02), chrome);
  chromeStrip.position.set(0, 0.52, 2.24); g.add(chromeStrip);

  const tireMap = civicMap("/textures/civic/tire.jpg", false, true);
  tireMap.repeat.set(1, 3);
  const tireNrm = civicMap("/textures/civic/tire-nrm.jpg", true, true);
  tireNrm.repeat.set(1, 3);
  const tire = civicMat({ map: tireMap, nrm: tireNrm, roughness: 0.92, metalness: 0.05, color: 0x1a1a1c });
  const rim = civicMat({ map: civicMap("/textures/civic/wheel.jpg"), roughness: 0.28, metalness: 0.72 });
  const disc = civicMat({
    map: civicMap("/textures/civic/brake.jpg"),
    ao: civicMap("/textures/civic/brake-ao.jpg", true),
    roughness: 0.4, metalness: 0.65,
  });

  const tireGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.18, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const discGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16);
  discGeo.rotateZ(Math.PI / 2);

  for (const [wx, wz] of [
    [-0.82, 1.32], [0.82, 1.32], [-0.82, -1.28], [0.82, -1.28],
  ]) {
    const wh = new THREE.Mesh(tireGeo, tire);
    wh.position.set(wx, 0.33, wz); wh.castShadow = true; g.add(wh);
    const r = new THREE.Mesh(rimGeo, rim);
    r.position.set(wx + Math.sign(wx) * 0.02, 0.33, wz); g.add(r);
    const d = new THREE.Mesh(discGeo, disc);
    d.position.set(wx, 0.33, wz); g.add(d);
  }

  attachAo(g, 4.55);
  injectCarRPParts(g, 4.55); // <-- Injection RP pour la Civic aussi
  return g;
}

/**
 * Met à jour les effets RP de la météo sur un véhicule (phares, neige, boue).
 * À appeler dans la boucle de jeu (engine.ts / Game.tsx) pour chaque voiture.
 */
export function updateCarWeather(car: THREE.Group, weather: WeatherRPState) {
  // 1. Phares automatiques (s'allument si mauvaise visibilité)
  const hlL = car.getObjectByName("headlight-L") as THREE.SpotLight;
  const hlR = car.getObjectByName("headlight-R") as THREE.SpotLight;
  if (hlL && hlR) {
    const autoOn = weather.visibility < 0.75;
    const targetIntensity = autoOn ? 3.5 : 0;
    // Lissage pour un allumage/arrêt progressif et réaliste
    hlL.intensity += (targetIntensity - hlL.intensity) * 0.08;
    hlR.intensity += (targetIntensity - hlR.intensity) * 0.08;
  }

  // 2. Neige accumulée sur le toit
  const snowRoof = car.getObjectByName("car-snow-roof") as THREE.Mesh;
  if (snowRoof) {
    const mat = snowRoof.material as THREE.MeshBasicMaterial;
    // Plus la traction est faible (neige/verglas), plus il y a de neige
    const targetOpacity = Math.max(0, (1 - weather.tractionMultiplier) * 1.2);
    mat.opacity += (targetOpacity - mat.opacity) * 0.03;
    snowRoof.visible = mat.opacity > 0.05;
  }

  // 3. Boue et salissure
  const mud = car.getObjectByName("car-mud") as THREE.Mesh;
  if (mud) {
    const mat = mud.material as THREE.MeshBasicMaterial;
    // La boue apparaît quand il pleut ou qu'il y a de la neige fondue
    const isWet = weather.wetness > 10 || weather.tractionMultiplier < 0.9;
    const targetOpacity = isWet ? Math.min(0.65, weather.wetness / 100 + (1 - weather.tractionMultiplier) * 0.5) : 0;
    // La boue s'enlève très lentement (nécessite un lavage ou beaucoup de temps sec)
    const decay = isWet ? 0.02 : 0.005; 
    mat.opacity += (targetOpacity - mat.opacity) * decay;
    mud.visible = mat.opacity > 0.05;
  }
}