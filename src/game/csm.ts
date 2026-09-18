import * as THREE from "three";
import { CSM } from "three/addons/csm/CSM.js";
import { sunDirection } from "./sky";

let csm: CSM | null = null;

const DIR = new THREE.Vector3(-0.42, -1, -0.28).normalize();

export function createSunCsm(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
  csm = new CSM({
    camera,
    parent: scene,
    cascades: 2,
    maxFar: 180,
    mode: "practical",
    shadowMapSize: 768,
    shadowBias: -0.00012,
    lightDirection: DIR.clone(),
    lightIntensity: 1.25,
    lightNear: 1,
    lightFar: 360,
    lightMargin: 32,
  });
  csm.fade = false;
  for (const light of csm.lights) {
    light.color.setHex(0xfff1d0);
    light.shadow.normalBias = 0.035;
    light.shadow.bias = -0.00018;
  }
  return csm;
}

function skipCascade(mat: THREE.Material) {
  if (mat instanceof THREE.MeshBasicMaterial) return true;
  if (mat.userData.skipCsm) return true;
  if (mat instanceof THREE.MeshPhysicalMaterial && mat.transmission > 0.01) return true;
  const opacity = "opacity" in mat ? (mat as THREE.MeshLambertMaterial).opacity : 1;
  return Boolean(mat.transparent && opacity < 0.85);
}

export function wireCsm(mat: THREE.Material) {
  if (!csm || mat.userData.csmWired) return mat;
  if (skipCascade(mat)) {
    mat.userData.csmWired = true;
    return mat;
  }
  csm.setupMaterial(mat);
  mat.userData.csmWired = true;
  return mat;
}

export function wireCsmTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = mesh.material;
    if (!mats) return;
    for (const mat of Array.isArray(mats) ? mats : [mats]) wireCsm(mat);
  });
}

export function updateCsm(hours?: number) {
  if (!csm) return;
  if (hours !== undefined) sunDirection(hours, DIR);
  csm.lightDirection.copy(DIR);
  csm.update();
}

export function applySun(hours: number, intensity: number, color: number, night: boolean, visible: boolean) {
  if (!csm) return;
  sunDirection(hours, DIR);
  csm.lightDirection.copy(DIR);
  for (const light of csm.lights) {
    light.visible = visible;
    light.intensity = intensity;
    light.color.setHex(color);
    light.castShadow = visible && !night;
  }
}

export function refreshCsmFrustums() {
  csm?.updateFrustums();
}

export function setCsmEnabled(visible: boolean, night: boolean) {
  if (!csm) return;
  const intensity = night ? 0.08 : 1.25;
  const color = night ? 0x8899bb : 0xfff1d0;
  for (const light of csm.lights) {
    light.visible = visible;
    light.intensity = intensity;
    light.color.setHex(color);
    light.castShadow = visible && !night;
  }
}

export function disposeCsm() {
  csm?.remove();
  csm?.dispose();
  csm = null;
}
