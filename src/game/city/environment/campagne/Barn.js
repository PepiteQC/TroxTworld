// src/buildings/Barn.js
import * as THREE from 'three';
import { BuildingFactory } from './BuildingFactory';

export class Barn {
  /**
   * Crée une grange québécoise typique - INTÉRIEUR VIDE
   * Toit gambrel (mansardé) classique rouge
   */
  static create(options = {}) {
    const {
      width = 14,
      depth = 20,
      wallHeight = 4,
      roofHeight = 4,
      color = 0x8B0000,  // Rouge grange classique!
      roofColor = 0x5C0000,
      hasSilo = true,
      hasLoft = false,
    } = options;

    const barn = new THREE.Group();
    barn.userData = {
      type: 'barn',
      enterable: true,
      dimensions: { width, depth, wallHeight },
    };

    const wallMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.5,
    });

    const wallThickness = 0.25;

    // ==========================================
    // GRANDES PORTES DE GRANGE (avant)
    // ==========================================
    const frontWallGeo = BuildingFactory.createWallWithHoles(
      width, wallHeight, wallThickness,
      [
        // Grande porte double au centre
        { x: width / 2 - 2, y: 0, w: 4, h: 3.5 },
        // Petite fenêtre en haut à gauche
        { x: 1.5, y: 2.5, w: 0.8, h: 0.8 },
        // Petite fenêtre en haut à droite
        { x: width - 2.3, y: 2.5, w: 0.8, h: 0.8 },
      ]
    );
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(-width / 2, 0, depth / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    barn.add(frontWall);

    // Mur arrière (porte de service)
    const backWallGeo = BuildingFactory.createWallWithHoles(
      width, wallHeight, wallThickness,
      [
        { x: width / 2 - 1.5, y: 0, w: 3, h: 3 },
      ]
    );
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(width / 2, 0, -depth / 2);
    backWall.rotation.y = Math.PI;
    backWall.castShadow = true;
    barn.add(backWall);

    // Murs latéraux avec fenêtres espacées
    const sideHoles = [];
    const windowSpacing = depth / 5;
    for (let i = 1; i < 5; i++) {
      sideHoles.push({
        x: windowSpacing * i - 0.4,
        y: 2.2,
        w: 0.8,
        h: 0.8,
      });
    }

    // Mur gauche
    const leftWallGeo = BuildingFactory.createWallWithHoles(
      depth, wallHeight, wallThickness, sideHoles
    );
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-width / 2, 0, -depth / 2);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.castShadow = true;
    barn.add(leftWall);

    // Mur droit
    const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
    rightWall.position.set(width / 2, 0, depth / 2);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.castShadow = true;
    barn.add(rightWall);

    // ==========================================
    // PLANCHER DE LA GRANGE
    // ==========================================
    const floorGeo = new THREE.BoxGeometry(width, 0.15, depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x5C4033,
      roughness: 0.95,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.075;
    floor.receiveShadow = true;
    barn.add(floor);

    // ==========================================
    // TOIT GAMBREL (style mansardé québécois)
    // ==========================================
    const roof = this.createGambrelRoof(width, depth, roofHeight, roofColor);
    roof.position.y = wallHeight;
    barn.add(roof);

    // ==========================================
    // PIGNONS (forme gambrel)
    // ==========================================
    const gableShape = new THREE.Shape();
    const midH = roofHeight * 0.6;
    const topW = width * 0.3;

    gableShape.moveTo(0, 0);
    gableShape.lineTo(width * 0.15, midH);
    gableShape.lineTo(width / 2 - topW / 2, midH);
    gableShape.lineTo(width / 2, roofHeight);
    gableShape.lineTo(width / 2 + topW / 2, midH);
    gableShape.lineTo(width * 0.85, midH);
    gableShape.lineTo(width, 0);

    // Fenêtre de grange dans le pignon (trou circulaire simulé par un carré)
    const loftWindow = new THREE.Path();
    const cx = width / 2;
    const cy = roofHeight * 0.45;
    const wr = 0.6;
    loftWindow.moveTo(cx - wr, cy - wr);
    loftWindow.lineTo(cx + wr, cy - wr);
    loftWindow.lineTo(cx + wr, cy + wr);
    loftWindow.lineTo(cx - wr, cy + wr);
    gableShape.holes.push(loftWindow);

    const gableGeo = new THREE.ShapeGeometry(gableShape);

    const frontGable = new THREE.Mesh(gableGeo, wallMat);
    frontGable.position.set(-width / 2, wallHeight, depth / 2 + 0.01);
    barn.add(frontGable);

    const backGable = new THREE.Mesh(gableGeo, wallMat);
    backGable.position.set(width / 2, wallHeight, -depth / 2 - 0.01);
    backGable.rotation.y = Math.PI;
    barn.add(backGable);

    // ==========================================
    // TRIM BLANC (bordures - typique Québec)
    // ==========================================
    this.addTrim(barn, width, depth, wallHeight, trimMat);

    // ==========================================
    // PORTES DE GRANGE
    // ==========================================
    const barnDoors = this.createBarnDoors(4, 3.5);
    barnDoors.position.set(0, 0, depth / 2 + 0.13);
    barn.add(barnDoors);

    // ==========================================
    // SILO (optionnel)
    // ==========================================
    if (hasSilo) {
      const silo = this.createSilo();
      silo.position.set(width / 2 + 2.5, 0, -depth / 4);
      barn.add(silo);
    }

    // Fondation en pierre
    const foundGeo = new THREE.BoxGeometry(width + 0.4, 0.6, depth + 0.4);
    const foundMat = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.95,
    });
    const foundation = new THREE.Mesh(foundGeo, foundMat);
    foundation.position.y = -0.3;
    barn.add(foundation);

    return barn;
  }

  static createGambrelRoof(width, depth, height, color) {
    const roofGroup = new THREE.Group();
    const overhang = 0.6;
    const midH = height * 0.6;

    const roofMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });

    // Partie basse gauche (pente raide)
    const lowerWidth = Math.sqrt(
      Math.pow(width * 0.35, 2) + Math.pow(midH, 2)
    );
    const lowerGeo = new THREE.PlaneGeometry(lowerWidth, depth + overhang * 2);
    
    const lowerLeft = new THREE.Mesh(lowerGeo, roofMat);
    const lowerAngle = Math.atan2(midH, width * 0.35);
    lowerLeft.rotation.set(-Math.PI / 2, lowerAngle, 0, 'YXZ');
    lowerLeft.position.set(-width * 0.325, midH / 2, 0);
    lowerLeft.castShadow = true;
    roofGroup.add(lowerLeft);

    // Partie basse droite
    const lowerRight = lowerLeft.clone();
    lowerRight.rotation.set(-Math.PI / 2, -lowerAngle, 0, 'YXZ');
    lowerRight.position.set(width * 0.325, midH / 2, 0);
    roofGroup.add(lowerRight);

    // Partie haute gauche (pente douce)
    const topW = width * 0.3;
    const upperHeight = height - midH;
    const upperWidth = Math.sqrt(
      Math.pow(topW / 2 + width * 0.2, 2) + Math.pow(upperHeight, 2)
    );
    const upperGeo = new THREE.PlaneGeometry(upperWidth, depth + overhang * 2);

    const upperAngle = Math.atan2(upperHeight, topW);
    const upperLeft = new THREE.Mesh(upperGeo, roofMat);
    upperLeft.rotation.set(-Math.PI / 2, upperAngle, 0, 'YXZ');
    upperLeft.position.set(-topW / 2, midH + upperHeight / 2, 0);
    upperLeft.castShadow = true;
    roofGroup.add(upperLeft);

    const upperRight = upperLeft.clone();
    upperRight.rotation.set(-Math.PI / 2, -upperAngle, 0, 'YXZ');
    upperRight.position.set(topW / 2, midH + upperHeight / 2, 0);
    roofGroup.add(upperRight);

    return roofGroup;
  }

  static createBarnDoors(width, height) {
    const doorsGroup = new THREE.Group();

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x6B0000,
      roughness: 0.8,
    });

    // Porte gauche
    const doorGeo = new THREE.BoxGeometry(width / 2 - 0.05, height, 0.1);
    const leftDoor = new THREE.Mesh(doorGeo, doorMat);
    leftDoor.position.set(-width / 4, height / 2, 0);
    doorsGroup.add(leftDoor);

    // Porte droite
    const rightDoor = new THREE.Mesh(doorGeo, doorMat);
    rightDoor.position.set(width / 4, height / 2, 0);
    doorsGroup.add(rightDoor);

    // Rail en haut
    const railGeo = new THREE.BoxGeometry(width + 1, 0.15, 0.15);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3,
    });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.y = height + 0.1;
    doorsGroup.add(rail);

    // Planches diagonales sur les portes (croix X)
    const plankMat = new THREE.MeshStandardMaterial({
      color: 0x5C0000,
      roughness: 0.9,
    });

    [-1, 1].forEach(side => {
      const plankGeo = new THREE.BoxGeometry(0.1, Math.sqrt(
        Math.pow(width / 2, 2) + Math.pow(height, 2)
      ) * 0.8, 0.05);
      
      const plank1 = new THREE.Mesh(plankGeo, plankMat);
      plank1.rotation.z = Math.atan2(height, width / 2) * side;
      plank1.position.set(side * width / 4, height / 2, 0.06);
      doorsGroup.add(plank1);
    });

    return doorsGroup;
  }

  static createSilo(height = 12, radius = 2) {
    const siloGroup = new THREE.Group();

    const siloMat = new THREE.MeshStandardMaterial({
      color: 0xC0C0C0,
      roughness: 0.4,
      metalness: 0.6,
    });

    // Corps du silo
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 16);
    const body = new THREE.Mesh(bodyGeo, siloMat);
    body.position.y = height / 2;
    body.castShadow = true;
    siloGroup.add(body);

    // Toit conique
    const roofGeo = new THREE.ConeGeometry(radius + 0.2, 2, 16);
    const roof = new THREE.Mesh(roofGeo, siloMat);
    roof.position.y = height + 1;
    siloGroup.add(roof);

    // Anneaux
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(radius + 0.05, 0.08, 8, 16);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.8,
        roughness: 0.3,
      }));
      ring.position.y = 2 + i * 3;
      ring.rotation.x = Math.PI / 2;
      siloGroup.add(ring);
    }

    return siloGroup;
  }

  static addTrim(barn, width, depth, wallHeight, trimMat) {
    // Bordures horizontales blanches
    const trimGeo = new THREE.BoxGeometry(0.1, 0.1, depth + 0.5);

    // Coins verticaux
    const cornerGeo = new THREE.BoxGeometry(0.12, wallHeight, 0.12);
    
    const corners = [
      [-width / 2, wallHeight / 2, -depth / 2],
      [-width / 2, wallHeight / 2, depth / 2],
      [width / 2, wallHeight / 2, -depth / 2],
      [width / 2, wallHeight / 2, depth / 2],
    ];

    corners.forEach(pos => {
      const corner = new THREE.Mesh(cornerGeo, trimMat);
      corner.position.set(...pos);
      barn.add(corner);
    });
  }
}