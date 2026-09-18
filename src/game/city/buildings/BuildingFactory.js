// src/buildings/BuildingFactory.js
import * as THREE from 'three';

export class BuildingFactory {
  static materials = {
    // Murs
    woodWall: new THREE.MeshStandardMaterial({ 
      color: 0x8B7355, 
      roughness: 0.9,
      metalness: 0.0 
    }),
    brickWall: new THREE.MeshStandardMaterial({ 
      color: 0xA0522D, 
      roughness: 0.8,
      metalness: 0.0 
    }),
    stuccoWall: new THREE.MeshStandardMaterial({ 
      color: 0xF5F5DC, 
      roughness: 0.7,
      metalness: 0.0 
    }),
    vinylSiding: new THREE.MeshStandardMaterial({ 
      color: 0xCCCCDD, 
      roughness: 0.5,
      metalness: 0.1 
    }),
    redPaint: new THREE.MeshStandardMaterial({ 
      color: 0x8B0000, 
      roughness: 0.6,
      metalness: 0.0 
    }),
    whitePaint: new THREE.MeshStandardMaterial({ 
      color: 0xFAFAFA, 
      roughness: 0.5,
      metalness: 0.0 
    }),

    // Toits
    shingleRoof: new THREE.MeshStandardMaterial({ 
      color: 0x2F2F2F, 
      roughness: 0.9,
      metalness: 0.0 
    }),
    metalRoof: new THREE.MeshStandardMaterial({ 
      color: 0x708090, 
      roughness: 0.3,
      metalness: 0.7 
    }),
    redRoof: new THREE.MeshStandardMaterial({ 
      color: 0x8B0000, 
      roughness: 0.4,
      metalness: 0.5 
    }),

    // Autres
    window: new THREE.MeshStandardMaterial({ 
      color: 0x87CEEB, 
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.5 
    }),
    door: new THREE.MeshStandardMaterial({ 
      color: 0x4A3728, 
      roughness: 0.8,
      metalness: 0.1 
    }),
    floor: new THREE.MeshStandardMaterial({ 
      color: 0x696969, 
      roughness: 0.9,
      metalness: 0.0 
    }),
    concrete: new THREE.MeshStandardMaterial({ 
      color: 0x999999, 
      roughness: 0.95,
      metalness: 0.0 
    }),
    glass: new THREE.MeshStandardMaterial({ 
      color: 0xADD8E6, 
      roughness: 0.05,
      metalness: 0.2,
      transparent: true,
      opacity: 0.3 
    }),
    sign: new THREE.MeshStandardMaterial({ 
      color: 0xFFD700, 
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x332200,
      emissiveIntensity: 0.3 
    }),
    neonSign: new THREE.MeshStandardMaterial({ 
      color: 0x00FF41, 
      emissive: 0x00FF41,
      emissiveIntensity: 0.8,
      roughness: 0.1 
    }),
    asphalt: new THREE.MeshStandardMaterial({ 
      color: 0x333333, 
      roughness: 1.0,
      metalness: 0.0 
    }),
  };

  /**
   * Crée un mur avec possibilité de trous (portes/fenêtres)
   * L'intérieur reste VIDE - juste les murs extérieurs
   */
  static createWallWithHoles(width, height, depth, holes = []) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, height);
    shape.lineTo(0, height);
    shape.lineTo(0, 0);

    // Découper les trous pour fenêtres et portes
    holes.forEach(hole => {
      const holePath = new THREE.Path();
      holePath.moveTo(hole.x, hole.y);
      holePath.lineTo(hole.x + hole.w, hole.y);
      holePath.lineTo(hole.x + hole.w, hole.y + hole.h);
      holePath.lineTo(hole.x, hole.y + hole.h);
      holePath.lineTo(hole.x, hole.y);
      shape.holes.push(holePath);
    });

    const extrudeSettings = {
      steps: 1,
      depth: depth,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    return geometry;
  }

  /**
   * Crée un toit en pente (style québécois)
   */
  static createGableRoof(width, length, height, overhang = 0.5) {
    const roofGroup = new THREE.Group();

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-overhang, 0);
    roofShape.lineTo(width / 2, height);
    roofShape.lineTo(width + overhang, 0);

    const extrudeSettings = {
      steps: 1,
      depth: length + overhang * 2,
      bevelEnabled: false,
    };

    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const roofMesh = new THREE.Mesh(roofGeometry, this.materials.shingleRoof);
    roofMesh.position.set(0, 0, -overhang);

    roofGroup.add(roofMesh);
    return roofGroup;
  }

  /**
   * Crée une fenêtre (vitre + cadre)
   */
  static createWindow(width = 1, height = 1.2) {
    const windowGroup = new THREE.Group();

    // Cadre
    const frameGeo = new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.15);
    const frameMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF, roughness: 0.5 
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    windowGroup.add(frame);

    // Vitre
    const glassGeo = new THREE.BoxGeometry(width - 0.05, height - 0.05, 0.05);
    const glass = new THREE.Mesh(glassGeo, this.materials.window);
    glass.position.z = 0.02;
    windowGroup.add(glass);

    // Croix de fenêtre
    const barGeo1 = new THREE.BoxGeometry(0.03, height - 0.05, 0.06);
    const barGeo2 = new THREE.BoxGeometry(width - 0.05, 0.03, 0.06);
    const bar1 = new THREE.Mesh(barGeo1, frameMat);
    const bar2 = new THREE.Mesh(barGeo2, frameMat);
    bar1.position.z = 0.05;
    bar2.position.z = 0.05;
    windowGroup.add(bar1, bar2);

    return windowGroup;
  }

  /**
   * Crée une porte
   */
  static createDoor(width = 1, height = 2.2, color = 0x4A3728) {
    const doorGroup = new THREE.Group();

    // Cadre de porte
    const frameGeo = new THREE.BoxGeometry(width + 0.15, height + 0.05, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ 
      color: 0x3D3D3D, roughness: 0.6 
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = height / 2;
    doorGroup.add(frame);

    // Porte elle-même
    const doorGeo = new THREE.BoxGeometry(width, height, 0.08);
    const doorMat = new THREE.MeshStandardMaterial({ 
      color: color, roughness: 0.7 
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.y = height / 2;
    door.position.z = 0.05;
    doorGroup.add(door);

    // Poignée
    const handleGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const handleMat = new THREE.MeshStandardMaterial({ 
      color: 0xDAA520, metalness: 0.8, roughness: 0.2 
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(width / 2 - 0.15, height / 2, 0.12);
    doorGroup.add(handle);

    return doorGroup;
  }

  /**
   * Crée des marches/perron (très québécois!)
   */
  static createPorch(width, depth, height, steps = 3) {
    const porchGroup = new THREE.Group();
    const stepHeight = height / steps;
    const stepDepth = depth / steps;

    for (let i = 0; i < steps; i++) {
      const stepGeo = new THREE.BoxGeometry(
        width, stepHeight, stepDepth
      );
      const step = new THREE.Mesh(stepGeo, this.materials.concrete);
      step.position.set(
        0,
        stepHeight * i + stepHeight / 2,
        -stepDepth * i - stepDepth / 2
      );
      step.castShadow = true;
      step.receiveShadow = true;
      porchGroup.add(step);
    }

    return porchGroup;
  }
}