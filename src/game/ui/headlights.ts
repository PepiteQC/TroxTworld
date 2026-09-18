/**
 * ═══════════════════════════════════════════════════════════════════
 * 💡 TROXTWORLD — SYSTÈME DE PHARES & ÉCLAIRAGE NOCTURNE DE VÉHICULE
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";

export interface VehicleLightRig {
  group: THREE.Group;
  leftSpot: THREE.SpotLight;
  rightSpot: THREE.SpotLight;
  leftTarget: THREE.Object3D;
  rightTarget: THREE.Object3D;
  volumetricBeams: THREE.Mesh[];
  tailPoint: THREE.PointLight;
  tailBulbs: THREE.Mesh[];
  headBulbs: THREE.Mesh[];
  reversePoint: THREE.PointLight;
  isHighBeam: boolean;
  isOn: boolean;
}

export function createVehicleLightRig(
  frontZ = 2.15,
  backZ = -2.15,
  width = 1.45,
  height = 0.75,
  isXenon = false
): VehicleLightRig {
  const group = new THREE.Group();
  group.name = "vehicle_light_rig";

  const lightColor = isXenon ? 0xe8f4ff : 0xfffae8;
  const halfW = width / 2;

  const createHeadSpot = (x: number) => {
    const spot = new THREE.SpotLight(lightColor, 2.8, 70, Math.PI / 7, 0.65, 1.4);
    spot.position.set(x, height, frontZ);
    spot.castShadow = true;
    spot.shadow.mapSize.width = 512;
    spot.shadow.mapSize.height = 512;
    spot.shadow.camera.near = 0.5;
    spot.shadow.camera.far = 70;
    spot.shadow.bias = -0.002;

    const target = new THREE.Object3D();
    target.position.set(x * 0.4, 0, frontZ + 45);
    group.add(spot);
    group.add(target);
    spot.target = target;
    return { spot, target };
  };

  const left = createHeadSpot(-halfW);
  const right = createHeadSpot(halfW);

  const beamGeo = new THREE.CylinderGeometry(0.08, 1.8, 30, 16, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, 15);

  const beamMat = new THREE.MeshBasicMaterial({
    color: lightColor,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const beamL = new THREE.Mesh(beamGeo, beamMat.clone());
  beamL.position.set(-halfW, height, frontZ);
  group.add(beamL);

  const beamR = new THREE.Mesh(beamGeo, beamMat.clone());
  beamR.position.set(halfW, height, frontZ);
  group.add(beamR);

  const headBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: lightColor,
    emissiveIntensity: 2.5,
    roughness: 0.1,
  });
  const headBulbGeo = new THREE.BoxGeometry(0.18, 0.12, 0.04);

  const bulbL = new THREE.Mesh(headBulbGeo, headBulbMat);
  bulbL.position.set(-halfW, height, frontZ + 0.02);
  group.add(bulbL);

  const bulbR = new THREE.Mesh(headBulbGeo, headBulbMat.clone());
  bulbR.position.set(halfW, height, frontZ + 0.02);
  group.add(bulbR);

  const tailPoint = new THREE.PointLight(0xff1100, 0.8, 12, 2);
  tailPoint.position.set(0, height, backZ - 0.4);
  group.add(tailPoint);

  const tailBulbMat = new THREE.MeshStandardMaterial({
    color: 0x990000,
    emissive: 0xff1100,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const tailBulbGeo = new THREE.BoxGeometry(0.2, 0.1, 0.04);

  const tailL = new THREE.Mesh(tailBulbGeo, tailBulbMat);
  tailL.position.set(-halfW, height, backZ - 0.02);
  group.add(tailL);

  const tailR = new THREE.Mesh(tailBulbGeo, tailBulbMat.clone());
  tailR.position.set(halfW, height, backZ - 0.02);
  group.add(tailR);

  const reversePoint = new THREE.PointLight(0xffffff, 0, 10, 2);
  reversePoint.position.set(0, height - 0.1, backZ - 0.3);
  group.add(reversePoint);

  return {
    group,
    leftSpot: left.spot,
    rightSpot: right.spot,
    leftTarget: left.target,
    rightTarget: right.target,
    volumetricBeams: [beamL, beamR],
    tailPoint,
    tailBulbs: [tailL, tailR],
    headBulbs: [bulbL, bulbR],
    reversePoint,
    isHighBeam: false,
    isOn: true,
  };
}

export function updateVehicleLights(
  rig: VehicleLightRig,
  opts: {
    isNight: boolean;
    isBraking: boolean;
    isReversing: boolean;
    headlightsOn?: boolean;
    highBeam?: boolean;
    speedKmh?: number;
  }
) {
  const shouldBeOn = opts.headlightsOn !== undefined ? opts.headlightsOn : opts.isNight;
  rig.isOn = shouldBeOn;
  rig.isHighBeam = Boolean(opts.highBeam);

  const spotIntensity = shouldBeOn ? (rig.isHighBeam ? 4.5 : 2.8) : 0;
  const spotDistance = rig.isHighBeam ? 110 : 65;
  const beamOpacity = shouldBeOn ? (rig.isHighBeam ? 0.16 : 0.08) : 0;

  rig.leftSpot.intensity = spotIntensity;
  rig.rightSpot.intensity = spotIntensity;
  rig.leftSpot.distance = spotDistance;
  rig.rightSpot.distance = spotDistance;

  for (const b of rig.volumetricBeams) {
    b.visible = shouldBeOn;
    (b.material as THREE.MeshBasicMaterial).opacity = beamOpacity;
  }

  for (const hb of rig.headBulbs) {
    const mat = hb.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = shouldBeOn ? (rig.isHighBeam ? 4.0 : 2.5) : 0.1;
  }

  const brakeIntensity = opts.isBraking ? 3.5 : shouldBeOn ? 0.8 : 0.05;
  const bulbGlow = opts.isBraking ? 4.0 : shouldBeOn ? 1.4 : 0.2;

  rig.tailPoint.intensity = brakeIntensity;
  for (const tb of rig.tailBulbs) {
    const mat = tb.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = bulbGlow;
    mat.emissive.setHex(opts.isBraking ? 0xff2200 : 0xaa0000);
  }

  rig.reversePoint.intensity = opts.isReversing ? 2.2 : 0;
}
