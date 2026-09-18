// src/buildings/House.js
import * as THREE from 'three';
import { BuildingFactory } from './BuildingFactory';

export class House {
  /**
   * Crée une maison québécoise typique - INTÉRIEUR VIDE
   * @param {Object} options
   * @param {number} options.width - Largeur (défaut: 10)
   * @param {number} options.depth - Profondeur (défaut: 8)
   * @param {number} options.wallHeight - Hauteur murs (défaut: 3)
   * @param {number} options.roofHeight - Hauteur toit (défaut: 2.5)
   * @param {string} options.style - 'colonial', 'bungalow', 'cottage'
   * @param {number} options.color - Couleur principale
   */
  static create(options = {}) {
    const {
      width = 10,
      depth = 8,
      wallHeight = 3,
      roofHeight = 2.5,
      style = 'colonial',
      color = 0xF5F5DC,
      roofColor = 0x2F2F2F,
    } = options;

    const house = new THREE.Group();
    house.userData = {
      type: 'house',
      enterable: true,
      style: style,
      dimensions: { width, depth, wallHeight },
    };

    const wallMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.8,
      metalness: 0.1,
    });

    const wallThickness = 0.2;

    // ==========================================
    // MUR AVANT (avec porte et fenêtres)
    // ==========================================
    const frontWallGeo = BuildingFactory.createWallWithHoles(
      width, wallHeight, wallThickness,
      [
        // Porte d'entrée au centre
        { x: width / 2 - 0.5, y: 0, w: 1.0, h: 2.2 },
        // Fenêtre gauche
        { x: 1.5, y: 1.0, w: 1.2, h: 1.2 },
        // Fenêtre droite
        { x: width - 2.7, y: 1.0, w: 1.2, h: 1.2 },
      ]
    );
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(-width / 2, 0, depth / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    house.add(frontWall);

    // ==========================================
    // MUR ARRIÈRE (avec fenêtres seulement)
    // ==========================================
    const backWallGeo = BuildingFactory.createWallWithHoles(
      width, wallHeight, wallThickness,
      [
        { x: 1.5, y: 1.0, w: 1.2, h: 1.2 },
        { x: width / 2 - 0.6, y: 1.0, w: 1.2, h: 1.2 },
        { x: width - 2.7, y: 1.0, w: 1.2, h: 1.2 },
      ]
    );
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(width / 2, 0, -depth / 2);
    backWall.rotation.y = Math.PI;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    house.add(backWall);

    // ==========================================
    // MUR GAUCHE
    // ==========================================
    const leftWallGeo = BuildingFactory.createWallWithHoles(
      depth, wallHeight, wallThickness,
      [
        { x: 1.5, y: 1.0, w: 1.0, h: 1.2 },
        { x: depth - 2.5, y: 1.0, w: 1.0, h: 1.2 },
      ]
    );
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-width / 2, 0, -depth / 2);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    house.add(leftWall);

    // ==========================================
    // MUR DROIT
    // ==========================================
    const rightWallGeo = BuildingFactory.createWallWithHoles(
      depth, wallHeight, wallThickness,
      [
        { x: 1.5, y: 1.0, w: 1.0, h: 1.2 },
        { x: depth - 2.5, y: 1.0, w: 1.0, h: 1.2 },
      ]
    );
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(width / 2, 0, depth / 2);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    house.add(rightWall);

    // ==========================================
    // PLANCHER
    // ==========================================
    const floorGeo = new THREE.BoxGeometry(width, 0.15, depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.075;
    floor.receiveShadow = true;
    house.add(floor);

    // ==========================================
    // TOIT EN PENTE
    // ==========================================
    const roof = this.createRoof(width, depth, roofHeight, roofMat);
    roof.position.y = wallHeight;
    house.add(roof);

    // ==========================================
    // PIGNONS (triangles aux extrémités du toit)
    // ==========================================
    const gableShape = new THREE.Shape();
    gableShape.moveTo(0, 0);
    gableShape.lineTo(width, 0);
    gableShape.lineTo(width / 2, roofHeight);
    gableShape.lineTo(0, 0);

    const gableGeo = new THREE.ShapeGeometry(gableShape);

    const frontGable = new THREE.Mesh(gableGeo, wallMat);
    frontGable.position.set(-width / 2, wallHeight, depth / 2 + 0.01);
    house.add(frontGable);

    const backGable = new THREE.Mesh(gableGeo, wallMat);
    backGable.position.set(width / 2, wallHeight, -depth / 2 - 0.01);
    backGable.rotation.y = Math.PI;
    house.add(backGable);

    // ==========================================
    // FENÊTRES (vitres)
    // ==========================================
    // Avant gauche
    const winFL = BuildingFactory.createWindow(1.1, 1.1);
    winFL.position.set(-width / 2 + 2.1, 1.6, depth / 2 + 0.12);
    house.add(winFL);

    // Avant droite
    const winFR = BuildingFactory.createWindow(1.1, 1.1);
    winFR.position.set(width / 2 - 2.1, 1.6, depth / 2 + 0.12);
    house.add(winFR);

    // ==========================================
    // PORTE D'ENTRÉE
    // ==========================================
    const door = BuildingFactory.createDoor(0.95, 2.15);
    door.position.set(0, 0, depth / 2 + 0.12);
    house.add(door);

    // ==========================================
    // PERRON / MARCHES
    // ==========================================
    const porch = BuildingFactory.createPorch(2.5, 1.5, 0.3, 2);
    porch.position.set(0, 0, depth / 2 + 0.2);
    porch.rotation.y = Math.PI;
    house.add(porch);

    // ==========================================
    // CHEMINÉE (optionnel style québécois)
    // ==========================================
    if (style === 'colonial' || style === 'cottage') {
      const chimney = this.createChimney();
      chimney.position.set(width / 4, wallHeight + roofHeight * 0.5, 0);
      house.add(chimney);
    }

    // Fondation
    const foundationGeo = new THREE.BoxGeometry(width + 0.3, 0.4, depth + 0.3);
    const foundation = new THREE.Mesh(foundationGeo, BuildingFactory.materials.concrete);
    foundation.position.y = -0.2;
    foundation.receiveShadow = true;
    house.add(foundation);

    return house;
  }

  static createRoof(width, depth, height, material) {
    const roofGroup = new THREE.Group();
    const overhang = 0.5;

    // Calcul de la pente
    const slopeWidth = Math.sqrt(
      Math.pow(width / 2 + overhang, 2) + Math.pow(height, 2)
    );

    // Côté gauche du toit
    const leftRoofGeo = new THREE.PlaneGeometry(
      slopeWidth, depth + overhang * 2
    );
    const leftRoof = new THREE.Mesh(leftRoofGeo, material);
    const angle = Math.atan2(height, width / 2);
    leftRoof.rotation.x = -Math.PI / 2;
    leftRoof.rotation.y = angle;
    leftRoof.position.set(
      -width / 4 - overhang / 4, 
      height / 2, 
      0
    );
    leftRoof.castShadow = true;
    roofGroup.add(leftRoof);

    // Côté droit du toit
    const rightRoof = new THREE.Mesh(leftRoofGeo, material);
    rightRoof.rotation.x = -Math.PI / 2;
    rightRoof.rotation.y = -angle;
    rightRoof.position.set(
      width / 4 + overhang / 4, 
      height / 2, 
      0
    );
    rightRoof.castShadow = true;
    roofGroup.add(rightRoof);

    return roofGroup;
  }

  static createChimney() {
    const chimneyGroup = new THREE.Group();

    const chimneyGeo = new THREE.BoxGeometry(0.6, 2.0, 0.6);
    const chimneyMat = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
    });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.y = 1.0;
    chimney.castShadow = true;
    chimneyGroup.add(chimney);

    // Chapeau de cheminée
    const capGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
    const cap = new THREE.Mesh(capGeo, chimneyMat);
    cap.position.y = 2.05;
    chimneyGroup.add(cap);

    return chimneyGroup;
  }

  /**
   * Variante: Bungalow québécois
   */
  static createBungalow(options = {}) {
    return this.create({
      width: 12,
      depth: 10,
      wallHeight: 2.6,
      roofHeight: 1.8,
      style: 'bungalow',
      color: 0xCCBB99,
      ...options,
    });
  }

  /**
   * Variante: Petite maison de campagne
   */
  static createCottage(options = {}) {
    return this.create({
      width: 7,
      depth: 6,
      wallHeight: 2.8,
      roofHeight: 2.2,
      style: 'cottage',
      color: 0xFFF8DC,
      roofColor: 0x228B22,
      ...options,
    });
  }
}