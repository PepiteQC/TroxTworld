import * as THREE from "three";
import type { SkySnap } from "./sky";
import { sunPosition } from "./sky";

export interface LightingRig {
  group: THREE.Group;
  sunLight: THREE.DirectionalLight;
  moonLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  ambientLight: THREE.AmbientLight;
  update(snap: SkySnap, playerPos: THREE.Vector3, dt: number): void;
  dispose(): void;
}

export function wireCsm(material: THREE.Material): void {
  if (!material || material.userData.csmWired) return;
  material.userData.csmWired = true;
  material.shadowSide = THREE.FrontSide;
  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.roughness = Math.max(0.04, material.roughness);
  }
}

export function createLightingRig(shadowMapSize = 2048): LightingRig {
  const group = new THREE.Group();
  group.name = "lighting_rig";

  const sunLight = new THREE.DirectionalLight(0xfff1d0, 1.25);
  sunLight.name = "sun_directional";
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = shadowMapSize;
  sunLight.shadow.mapSize.height = shadowMapSize;

  const shadowDist = 65;
  const cam = sunLight.shadow.camera;
  cam.near = 1.0;
  cam.far = 400;
  cam.left = -shadowDist;
  cam.right = shadowDist;
  cam.top = shadowDist;
  cam.bottom = -shadowDist;
  sunLight.shadow.bias = -0.0003;
  sunLight.shadow.normalBias = 0.045;
  sunLight.shadow.radius = 1.6;

  group.add(sunLight);
  group.add(sunLight.target);

  const moonLight = new THREE.DirectionalLight(0x6080b0, 0.0);
  moonLight.name = "moon_directional";
  moonLight.castShadow = false;
  group.add(moonLight);
  group.add(moonLight.target);

  const hemiLight = new THREE.HemisphereLight(0xb8d0e8, 0x3a4a32, 0.72);
  hemiLight.name = "hemisphere_ambient";
  hemiLight.position.set(0, 100, 0);
  group.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x8090a0, 0.28);
  ambientLight.name = "ambient_fill";
  group.add(ambientLight);

  const tempCol = new THREE.Color();

  function update(snap: SkySnap, playerPos: THREE.Vector3, dt: number): void {
    const lerpSpeed = Math.min(1.0, dt * 3.0);

    tempCol.setHex(snap.sunColor);
    sunLight.color.lerp(tempCol, lerpSpeed);
    sunLight.intensity = THREE.MathUtils.lerp(
      sunLight.intensity,
      snap.night ? 0.0 : snap.sunIntensity * (1.0 - snap.cloudCoverage * 0.6),
      lerpSpeed
    );

    const sunSkyPos = sunPosition(snap.hours, 180);
    sunLight.position.set(
      playerPos.x + sunSkyPos.x,
      playerPos.y + Math.max(10, sunSkyPos.y),
      playerPos.z + sunSkyPos.z
    );
    sunLight.target.position.copy(playerPos);
    sunLight.target.updateMatrixWorld();
    sunLight.castShadow = !snap.night && sunLight.intensity > 0.05;

    if (snap.night) {
      moonLight.intensity = THREE.MathUtils.lerp(moonLight.intensity, snap.moonOpacity * 0.22, lerpSpeed);
      moonLight.position.set(
        playerPos.x - sunSkyPos.x * 0.8,
        playerPos.y + Math.max(15, -sunSkyPos.y * 0.8),
        playerPos.z - sunSkyPos.z * 0.8
      );
      moonLight.target.position.copy(playerPos);
      moonLight.target.updateMatrixWorld();
    } else {
      moonLight.intensity = 0.0;
    }

    tempCol.setHex(snap.hemiSky);
    hemiLight.color.lerp(tempCol, lerpSpeed);
    tempCol.setHex(snap.hemiGround);
    hemiLight.groundColor.lerp(tempCol, lerpSpeed);
    hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, snap.hemiIntensity, lerpSpeed);
    ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, snap.ambient, lerpSpeed);
  }

  function dispose(): void {
    sunLight.dispose();
    moonLight.dispose();
    hemiLight.dispose();
    ambientLight.dispose();
    group.clear();
  }

  return { group, sunLight, moonLight, hemiLight, ambientLight, update, dispose };
}

// Stubs de compatibilité
export function refreshCsmFrustums(): void {}
export function updateCsm(dt?: number): void { void dt; }
export function wireCsmTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m) => wireCsm(m));
    }
  });
}
export function createSunCsm(camera?: any, scene?: any): any { void camera; void scene; return null; }
export function disposeCsm(): void {}
export function setCsmEnabled(on?: any, night?: any): void { void on; void night; }
export function applySun(hours?: any, intensity?: any, color?: any, night?: any, visible?: any): void {
  void hours; void intensity; void color; void night; void visible;
}
