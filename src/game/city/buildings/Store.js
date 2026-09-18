// src/buildings/Store.js
import * as THREE from 'three';
import { BuildingFactory } from './BuildingFactory';

export class Store {
  /**
   * Magasin générique - INTÉRIEUR VIDE
   * Parfait pour dépanneur, pharmacie, etc.
   */
  static create(options = {}) {
    const {
      width = 12,
      depth = 10,
      wallHeight = 3.5,
      storeName = 'DÉPANNEUR',
      color = 0xE8DCC8,
      accentColor = 0x2E5090,
      hasAwning = true,
      hasNeonSign = true,
    } = options;

    const store = new THREE.Group();
    store.userData = {
      type: 'store',
      enterable: true,
      storeName: storeName,
      dimensions: { width, depth, wallHeight },
    };

    const wallMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });

    const wallThickness = 0.2;

    // ==========================================
    // MUR AVANT - Grande vitrine
    // ==========================================
    const frontWallGeo = BuildingFactory.createWallWithHoles(
      width, wallHeight, wallThickness,
      [
        // Porte vitrée
        { x: width / 2 - 0.75, y: 0, w: 1.5, h: 2.4 },
        // Grande vitrine gauche
        { x: 0.8, y: 0.3, w: width / 2 - 2.3, h: 2.5 },
        // Grande vitrine droite
        { x: width / 2 + 1.5, y: 0.3, w: width / 2 - 2.3, h: 2.5 },
      ]
    );
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(-width / 2, 0, depth / 2);
    frontWall.castShadow = true;
    store.add(frontWall);

    // Mur arrière (porte de service)
    const backWallGeo = BuildingFactory.createWallWithHoles(
      width, wallHeight, wallThickness,
      [
        { x: width - 2.5, y: 0, w: 1.2, h: 2.2 },
      ]
    );
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(width / 2, 0, -depth / 2);
    backWall.rotation.y = Math.PI;
    store.add(backWall);

    // Murs latéraux
    const sideWallGeo = BuildingFactory.createWallWithHoles(
      depth, wallHeight, wallThickness,
      [
        { x: depth / 2 - 0.5, y: 1.2, w: 1.0, h: 1.0 },
      ]
    );

    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(-width / 2, 0, -depth / 2);
    leftWall.rotation.y = Math.PI / 2;
    store.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(width / 2, 0, depth / 2);
    rightWall.rotation.y = -Math.PI / 2;
    store.add(rightWall);

    // ==========================================
    // PLANCHER
    // ==========================================
    const floorGeo = new THREE.BoxGeometry(width, 0.15, depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xBBBBBB,
      roughness: 0.7,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.075;
    store.add(floor);

    // ==========================================
    // TOIT PLAT (commercial)
    // ==========================================
    const roofGeo = new THREE.BoxGeometry(width + 0.5, 0.2, depth + 0.5);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.9,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = wallHeight + 0.1;
    roof.castShadow = true;
    store.add(roof);

    // Rebord du toit (parapet)
    const parapetHeight = 0.4;
    const parapetThick = 0.15;
    
    // Parapet avant
    const parapetFrontGeo = new THREE.BoxGeometry(width + 0.5, parapetHeight, parapetThick);
    const parapetMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 });
    const parapetFront = new THREE.Mesh(parapetFrontGeo, parapetMat);
    parapetFront.position.set(0, wallHeight + 0.2 + parapetHeight / 2, depth / 2 + 0.25);
    store.add(parapetFront);

    // ==========================================
    // VITRINES (grandes fenêtres)
    // ==========================================
    const vitrineMat = new THREE.MeshStandardMaterial({
      color: 0xADD8E6,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    // Vitrine gauche
    const vitrineLeftGeo = new THREE.PlaneGeometry(
      width / 2 - 2.3, 2.5
    );
    const vitrineLeft = new THREE.Mesh(vitrineLeftGeo, vitrineMat);
    vitrineLeft.position.set(
      -width / 2 + 0.8 + (width / 2 - 2.3) / 2,
      1.55,
      depth / 2 + 0.11
    );
    store.add(vitrineLeft);

    // Vitrine droite
    const vitrineRight = new THREE.Mesh(vitrineLeftGeo, vitrineMat);
    vitrineRight.position.set(
      width / 2 - 0.8 - (width / 2 - 2.3) / 2,
      1.55,
      depth / 2 + 0.11
    );
    store.add(vitrineRight);

    // ==========================================
    // PORTE VITRÉE
    // ==========================================
    const glassDoor = this.createGlassDoor();
    glassDoor.position.set(0, 0, depth / 2 + 0.11);
    store.add(glassDoor);

    // ==========================================
    // AUVENT (awning)
    // ==========================================
    if (hasAwning) {
      const awning = this.createAwning(width + 0.5, 2, accentColor);
      awning.position.set(0, wallHeight - 0.3, depth / 2 + 1);
      store.add(awning);
    }

    // ==========================================
    // ENSEIGNE
    // ==========================================
    if (hasNeonSign) {
      const sign = this.createStoreSign(storeName, width * 0.8, accentColor);
      sign.position.set(0, wallHeight + 0.6, depth / 2 + 0.3);
      store.add(sign);
    }

    // ==========================================
    // TROTTOIR DEVANT
    // ==========================================
    const sidewalkGeo = new THREE.BoxGeometry(width + 2, 0.1, 3);
    const sidewalk = new THREE.Mesh(sidewalkGeo, BuildingFactory.materials.concrete);
    sidewalk.position.set(0, 0.05, depth / 2 + 1.5);
    sidewalk.receiveShadow = true;
    store.add(sidewalk);

    return store;
  }

  static createGlassDoor() {
    const doorGroup = new THREE.Group();

    // Cadre aluminium
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xCCCCCC,
      metalness: 0.7,
      roughness: 0.3,
    });

    const frameTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.05, 0.1), frameMat
    );
    frameTop.position.y = 2.4;
    doorGroup.add(frameTop);

    const frameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 2.4, 0.1), frameMat
    );
    frameLeft.position.set(-0.75, 1.2, 0);
    doorGroup.add(frameLeft);

    const frameRight = frameLeft.clone();
    frameRight.position.x = 0.75;
    doorGroup.add(frameRight);

    // Vitre
    const glassGeo = new THREE.PlaneGeometry(1.45, 2.35);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88CCEE,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      side: THREE.DoubleSide,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 1.2;
    doorGroup.add(glass);

    // Poignée
    const handleGeo = new THREE.BoxGeometry(0.03, 0.3, 0.08);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xCCCCCC,
      metalness: 0.9,
      roughness: 0.1,
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.3, 1.1, 0.06);
    doorGroup.add(handle);

    return doorGroup;
  }

  static createAwning(width, depth, color) {
    const awningGroup = new THREE.Group();

    // Toile de l'auvent
    const awningShape = new THREE.Shape();
    awningShape.moveTo(0, 0);
    awningShape.quadraticCurveTo(depth / 2, -0.5, depth, -0.8);
    awningShape.lineTo(depth, -0.9);
    awningShape.quadraticCurveTo(depth / 2, -0.6, 0, -0.1);

    const awningGeo = new THREE.ExtrudeGeometry(awningShape, {
      steps: 1,
      depth: width,
      bevelEnabled: false,
    });

    const awningMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });

    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.rotation.y = -Math.PI / 2;
    awning.position.x = width / 2;
    awning.castShadow = true;
    awningGroup.add(awning);

    // Supports métalliques
    const supportMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
    });

    [-width / 2 + 0.3, width / 2 - 0.3].forEach(x => {
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, depth * 1.1, 6),
        supportMat
      );
      support.rotation.x = Math.PI / 2 - 0.3;
      support.position.set(x, -0.3, depth / 2);
      awningGroup.add(support);
    });

    return awningGroup;
  }

  static createStoreSign(text, width, color) {
    const signGroup = new THREE.Group();

    // Panneau
    const signGeo = new THREE.BoxGeometry(width, 0.8, 0.1);
    const signMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      emissive: new THREE.Color(color).multiplyScalar(0.2),
      emissiveIntensity: 0.5,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    signGroup.add(sign);

    // Bordure lumineuse
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      emissive: 0xFFFFFF,
      emissiveIntensity: 0.3,
    });

    // Bordure haut/bas
    const hBorder = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.1, 0.05, 0.12),
      borderMat
    );
    const topBorder = hBorder.clone();
    topBorder.position.y = 0.4;
    const botBorder = hBorder.clone();
    botBorder.position.y = -0.4;
    signGroup.add(topBorder, botBorder);

    // Lumière pour l'enseigne
    const signLight = new THREE.PointLight(
      new THREE.Color(color), 2, 8
    );
    signLight.position.set(0, 0, 1);
    signGroup.add(signLight);

    return signGroup;
  }

  /**
   * DÉPANNEUR QUÉBÉCOIS typique! 
   */
  static createDepanneur(options = {}) {
    return this.create({
      width: 10,
      depth: 8,
      wallHeight: 3.2,
      storeName: 'DÉPANNEUR',
      color: 0xEEDDCC,
      accentColor: 0xCC0000,
      ...options,
    });
  }

  /**
   * Pharmacie
   */
  static createPharmacy(options = {}) {
    return this.create({
      width: 14,
      depth: 12,
      wallHeight: 4,
      storeName: 'PHARMACIE',
      color: 0xFFFFFF,
      accentColor: 0x006400,
      ...options,
    });
  }

  /**
   * Tim Hortons style
   */
  static createCoffeeShop(options = {}) {
    return this.create({
      width: 11,
      depth: 9,
      wallHeight: 3.5,
      storeName: 'CAFÉ',
      color: 0xF5F0E8,
      accentColor: 0x8B0000,
      ...options,
    });
  }
}