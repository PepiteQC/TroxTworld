// src/buildings/PoliceStation.js
import * as THREE from 'three';
import { BuildingFactory } from './BuildingFactory';

export class PoliceStation {
  static create(options = {}) {
    const {
      width = 16,
      depth = 12,
      wallHeight = 4,
    } = options;

    const station = new THREE.Group();
    station.userData = { type: 'police_station', enterable: true };

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xD4C5A9,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x1B3A5C,
      roughness: 0.4,
    });

    const wallThickness = 0.25;

    // ==========================================
    // MURS (intérieur vide)
    // ==========================================
    
    // Mur avant - entrée principale avec grandes portes vitrées
    const frontGeo = BuildingFactory.createWallWithHoles(
      width, wallHeight, wallThickness,
      [
        // Double porte d'entrée
        { x: width / 2 - 1.5, y: 0, w: 3, h: 2.8 },
        // Fenêtres
        { x: 1.5, y: 1.0, w: 2, h: 1.5 },
        { x: width - 3.5, y: 1.0, w: 2, h: 1.5 },
      ]
    );
    const frontWall = new THREE.Mesh(frontGeo, wallMat);
    frontWall.position.set(-width / 2, 0, depth / 2);
    station.add(frontWall);

    // Mur arrière
    const backGeo = BuildingFactory.createWallWithHoles(
      width, wallHeight, wallThickness,
      [
        // Garage pour véhicules
        { x: 1, y: 0, w: 3.5, h: 3 },
        // Porte arrière
        { x: width - 3, y: 0, w: 1.2, h: 2.2 },
      ]
    );
    const backWall = new THREE.Mesh(backGeo, wallMat);
    backWall.position.set(width / 2, 0, -depth / 2);
    backWall.rotation.y = Math.PI;
    station.add(backWall);

    // Murs latéraux
    const sideGeo = BuildingFactory.createWallWithHoles(
      depth, wallHeight, wallThickness,
      [
        { x: 2, y: 1.0, w: 1.5, h: 1.5 },
        { x: 5, y: 1.0, w: 1.5, h: 1.5 },
        { x: 8, y: 1.0, w: 1.5, h: 1.5 },
      ]
    );
    const leftWall = new THREE.Mesh(sideGeo, wallMat);
    leftWall.position.set(-width / 2, 0, -depth / 2);
    leftWall.rotation.y = Math.PI / 2;
    station.add(leftWall);

    const rightWall = new THREE.Mesh(sideGeo, wallMat);
    rightWall.position.set(width / 2, 0, depth / 2);
    rightWall.rotation.y = -Math.PI / 2;
    station.add(rightWall);

    // Plancher
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.15, depth),
      new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 })
    );
    floor.position.y = 0.075;
    station.add(floor);

    // ==========================================
    // TOIT PLAT AVEC PARAPET
    // ==========================================
    const roofGeo = new THREE.BoxGeometry(width + 0.5, 0.2, depth + 0.5);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({
      color: 0x444444, roughness: 0.9,
    }));
    roof.position.y = wallHeight + 0.1;
    station.add(roof);

    // ==========================================
    // BADGE / EMBLÈME POLICE
    // ==========================================
    const badge = this.createPoliceBadge();
    badge.position.set(0, wallHeight - 0.5, depth / 2 + 0.15);
    station.add(badge);

    // ==========================================
    // ENSEIGNE "POLICE / SÛRETÉ"
    // ==========================================
    const signGeo = new THREE.BoxGeometry(6, 0.6, 0.1);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x1B3A5C,
      emissive: 0x1B3A5C,
      emissiveIntensity: 0.3,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, wallHeight + 0.5, depth / 2 + 0.2);
    station.add(sign);

    // Lumière bleue d'ambiance
    const blueLight = new THREE.PointLight(0x0044FF, 1, 15);
    blueLight.position.set(0, wallHeight + 1, depth / 2 + 1);
    station.add(blueLight);

    // ==========================================
    // STATIONNEMENT
    // ==========================================
    const parkingGeo = new THREE.BoxGeometry(width + 4, 0.08, 8);
    const parking = new THREE.Mesh(parkingGeo, BuildingFactory.materials.asphalt);
    parking.position.set(0, 0.04, depth / 2 + 4);
    station.add(parking);

    // Fondation
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.5, 0.5, depth + 0.5),
      BuildingFactory.materials.concrete
    );
    foundation.position.y = -0.25;
    station.add(foundation);

    return station;
  }

  static createPoliceBadge() {
    const badgeGroup = new THREE.Group();

    // Étoile simplifiée (hexagone)
    const starShape = new THREE.Shape();
    const points = 6;
    const outerR = 0.5;
    const innerR = 0.25;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();

    const starGeo = new THREE.ExtrudeGeometry(starShape, {
      steps: 1,
      depth: 0.05,
      bevelEnabled: false,
    });

    const starMat = new THREE.MeshStandardMaterial({
      color: 0xDAA520,
      metalness: 0.8,
      roughness: 0.2,
    });

    const star = new THREE.Mesh(starGeo, starMat);
    badgeGroup.add(star);

    return badgeGroup;
  }
}