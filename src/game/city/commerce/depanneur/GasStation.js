// src/buildings/GasStation.js
import * as THREE from 'three';
import { BuildingFactory } from './BuildingFactory';
import { Store } from './Store';

export class GasStation {
  static create(options = {}) {
    const {
      pumpCount = 2,
      hasCarWash = false,
      color = 0xDDDDDD,
      brandColor = 0xFF4500,
    } = options;

    const station = new THREE.Group();
    station.userData = { type: 'gas_station', enterable: true };

    // ==========================================
    // BÂTIMENT PRINCIPAL (petit dépanneur)
    // ==========================================
    const building = Store.create({
      width: 8,
      depth: 6,
      wallHeight: 3,
      storeName: 'ESSENCE',
      color: color,
      accentColor: brandColor,
    });
    building.position.set(0, 0, -5);
    station.add(building);

    // ==========================================
    // CANOPÉE AU-DESSUS DES POMPES
    // ==========================================
    const canopy = this.createCanopy(10, 6, 4.5, brandColor);
    canopy.position.set(0, 0, 4);
    station.add(canopy);

    // ==========================================
    // POMPES À ESSENCE
    // ==========================================
    for (let i = 0; i < pumpCount; i++) {
      const pump = this.createGasPump();
      pump.position.set(-2 + i * 4, 0, 4);
      station.add(pump);
    }

    // ==========================================
    // TERRAIN ASPHALTÉ
    // ==========================================
    const lotGeo = new THREE.BoxGeometry(18, 0.08, 18);
    const lot = new THREE.Mesh(lotGeo, BuildingFactory.materials.asphalt);
    lot.position.y = 0.04;
    lot.receiveShadow = true;
    station.add(lot);

    // Lignes de stationnement
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
    for (let i = 0; i < 3; i++) {
      const lineGeo = new THREE.BoxGeometry(0.1, 0.09, 4);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(-4 + i * 4, 0.05, 4);
      station.add(line);
    }

    return station;
  }

  static createCanopy(width, depth, height, color) {
    const canopyGroup = new THREE.Group();

    // Toit
    const roofGeo = new THREE.BoxGeometry(width, 0.2, depth);
    const roofMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.5,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height;
    roof.castShadow = true;
    canopyGroup.add(roof);

    // Bordure lumineuse sous le toit
    const borderGeo = new THREE.BoxGeometry(width + 0.1, 0.15, depth + 0.1);
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      emissive: 0xFFFFFF,
      emissiveIntensity: 0.5,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.y = height - 0.15;
    canopyGroup.add(border);

    // Piliers
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xCCCCCC,
      metalness: 0.5,
      roughness: 0.3,
    });

    const pillarPositions = [
      [-width / 2 + 0.5, -depth / 2 + 0.5],
      [-width / 2 + 0.5, depth / 2 - 0.5],
      [width / 2 - 0.5, -depth / 2 + 0.5],
      [width / 2 - 0.5, depth / 2 - 0.5],
    ];

    pillarPositions.forEach(([x, z]) => {
      const pillarGeo = new THREE.BoxGeometry(0.3, height, 0.3);
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, height / 2, z);
      pillar.castShadow = true;
      canopyGroup.add(pillar);
    });

    // Lumières sous la canopée
    const canopyLight = new THREE.RectAreaLight(0xFFFFEE, 3, width, depth);
    canopyLight.position.set(0, height - 0.3, 0);
    canopyLight.rotation.x = Math.PI / 2;
    canopyGroup.add(canopyLight);

    return canopyGroup;
  }

  static createGasPump() {
    const pumpGroup = new THREE.Group();

    // Base
    const baseGeo = new THREE.BoxGeometry(0.8, 0.15, 0.6);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.075;
    pumpGroup.add(base);

    // Corps de la pompe
    const bodyGeo = new THREE.BoxGeometry(0.6, 1.5, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xEEEEEE,
      roughness: 0.4,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    pumpGroup.add(body);

    // Écran
    const screenGeo = new THREE.BoxGeometry(0.35, 0.2, 0.05);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x003300,
      emissive: 0x00FF00,
      emissiveIntensity: 0.3,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.3, 0.22);
    pumpGroup.add(screen);

    // Tuyau/pistolet
    const hoseGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hose = new THREE.Mesh(hoseGeo, hoseMat);
    hose.rotation.z = Math.PI / 4;
    hose.position.set(0.35, 1.0, 0.15);
    pumpGroup.add(hose);

    // Pistolet
    const nozzleGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.2, 8);
    const nozzle = new THREE.Mesh(nozzleGeo, hoseMat);
    nozzle.position.set(0.55, 0.75, 0.15);
    nozzle.rotation.z = Math.PI / 2;
    pumpGroup.add(nozzle);

    return pumpGroup;
  }
}