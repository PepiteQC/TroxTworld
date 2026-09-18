// ============================================================================
// BackpackGeometry.ts
// Constructeur de géométrie 3D détaillée pour sac à dos réaliste
// ~50k polygones optimisés
// Made in Montréal 🍁
// ============================================================================

import * as THREE from 'three';
import {
  BackpackMaterialCreator,
  BACKPACK_MATERIALS,
} from './BackpackMaterials8K';

// ----------------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------------

export interface BackpackConfig {
  width: number;        // 0.3 - 0.4 (mètres)
  height: number;       // 0.45 - 0.65
  depth: number;        // 0.15 - 0.25
  color: 'black' | 'grey' | 'red' | 'green' | string;
  hasWaterproof: boolean;
  hasLaptopCompartment: boolean;
  hasChestStrap: boolean;
  hasHipBelt: boolean;
  variant: 'urban' | 'hiking' | 'daypack';
}

export const DEFAULT_CONFIG: BackpackConfig = {
  width: 0.35,
  height: 0.55,
  depth: 0.2,
  color: 'black',
  hasWaterproof: false,
  hasLaptopCompartment: true,
  hasChestStrap: true,
  hasHipBelt: false,
  variant: 'urban',
};

export const PRESET_CONFIGS: Record<string, Partial<BackpackConfig>> = {
  daypack: {
    width: 0.3,
    height: 0.45,
    depth: 0.15,
    variant: 'daypack',
    hasLaptopCompartment: false,
    hasHipBelt: false,
    hasChestStrap: false,
  },
  urban: {
    width: 0.35,
    height: 0.55,
    depth: 0.2,
    variant: 'urban',
    hasLaptopCompartment: true,
    hasChestStrap: true,
  },
  hiking: {
    width: 0.4,
    height: 0.65,
    depth: 0.25,
    variant: 'hiking',
    hasWaterproof: true,
    hasHipBelt: true,
    hasChestStrap: true,
    hasLaptopCompartment: false,
  },
};

// ----------------------------------------------------------------------------
// Constructeur de géométrie
// ----------------------------------------------------------------------------

export class BackpackGeometryBuilder {
  private config: BackpackConfig;
  private materialCreator: BackpackMaterialCreator;
  private materialSet: ReturnType<BackpackMaterialCreator['createBackpackMaterialSet']> | null = null;

  constructor(config?: Partial<BackpackConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.materialCreator = new BackpackMaterialCreator(1024, 1024);
  }

  /**
   * Construire le sac à dos complet - retourne un THREE.Group
   */
  build(): THREE.Group {
    const backpack = new THREE.Group();
    backpack.name = 'Backpack';

    // Générer les matériaux
    this.materialSet = this.materialCreator.createBackpackMaterialSet(this.config.color);

    // Construire chaque composant
    const mainBody = this.buildMainBody();
    backpack.add(mainBody);

    const frontPocket = this.buildFrontPocket();
    backpack.add(frontPocket);

    const sidePockets = this.buildSidePockets();
    backpack.add(sidePockets);

    const topLid = this.buildTopLid();
    backpack.add(topLid);

    const bottomPanel = this.buildBottomPanel();
    backpack.add(bottomPanel);

    const straps = this.buildShoulderStraps();
    backpack.add(straps);

    const backPanel = this.buildBackPanel();
    backpack.add(backPanel);

    const handle = this.buildTopHandle();
    backpack.add(handle);

    const zippers = this.buildZippers();
    backpack.add(zippers);

    const buckles = this.buildBuckles();
    backpack.add(buckles);

    // Options conditionnelles
    if (this.config.hasChestStrap) {
      const chestStrap = this.buildChestStrap();
      backpack.add(chestStrap);
    }

    if (this.config.hasHipBelt) {
      const hipBelt = this.buildHipBelt();
      backpack.add(hipBelt);
    }

    if (this.config.hasLaptopCompartment) {
      const laptop = this.buildLaptopCompartment();
      backpack.add(laptop);
    }

    // Détails supplémentaires selon la variante
    if (this.config.variant === 'hiking') {
      const hikingDetails = this.buildHikingDetails();
      backpack.add(hikingDetails);
    }

    if (this.config.variant === 'urban') {
      const urbanDetails = this.buildUrbanDetails();
      backpack.add(urbanDetails);
    }

    // Compression straps
    const compressionStraps = this.buildCompressionStraps();
    backpack.add(compressionStraps);

    // Bande réfléchissante
    const reflective = this.buildReflectiveStrip();
    backpack.add(reflective);

    // Configurer shadows
    backpack.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return backpack;
  }

  // ========================================================================
  // CORPS PRINCIPAL
  // ========================================================================

  private buildMainBody(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'MainBody';

    const { width, height, depth } = this.config;
    const mat = this.materialSet!.main;

    // Forme principale avec arrondis
    const shape = new THREE.Shape();
    const r = 0.03; // Rayon des coins

    // Dessiner la face avant avec coins arrondis
    shape.moveTo(-width / 2 + r, -height / 2);
    shape.lineTo(width / 2 - r, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + r);
    shape.lineTo(width / 2, height / 2 - r * 2);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - r, height / 2);
    shape.lineTo(-width / 2 + r, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - r * 2);
    shape.lineTo(-width / 2, -height / 2 + r);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + r, -height / 2);

    // Extruder avec une courbure
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 8,
      depth: depth,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 4,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.computeVertexNormals();

    // Déformer pour donner du volume (bombé)
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // Bomber le devant
      const normalizedZ = z / depth;
      const bulge = Math.sin(normalizedZ * Math.PI) * 0.02;
      const yBulge = (1 - Math.pow((y / (height / 2)), 2)) * bulge;

      positions.setZ(i, z + yBulge);

      // Rétrécir légèrement vers le haut
      const topTaper = 1 - Math.max(0, (y / (height / 2)) * 0.05);
      positions.setX(i, x * topTaper);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = 'MainBody_Mesh';
    mesh.position.z = -depth / 2;

    group.add(mesh);

    // Coutures décoratives
    const seams = this.createSeamLines(width, height, depth);
    group.add(seams);

    return group;
  }

  // ========================================================================
  // POCHE AVANT
  // ========================================================================

  private buildFrontPocket(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'FrontPocket';

    const { width, height, depth } = this.config;
    const mat = this.materialSet!.main;

    const pocketW = width * 0.85;
    const pocketH = height * 0.4;
    const pocketD = depth * 0.25;

    // Forme de la poche avec coins arrondis
    const shape = new THREE.Shape();
    const r = 0.02;

    shape.moveTo(-pocketW / 2 + r, -pocketH / 2);
    shape.lineTo(pocketW / 2 - r, -pocketH / 2);
    shape.quadraticCurveTo(pocketW / 2, -pocketH / 2, pocketW / 2, -pocketH / 2 + r);
    shape.lineTo(pocketW / 2, pocketH / 2 - r);
    shape.quadraticCurveTo(pocketW / 2, pocketH / 2, pocketW / 2 - r, pocketH / 2);
    shape.lineTo(-pocketW / 2 + r, pocketH / 2);
    shape.quadraticCurveTo(-pocketW / 2, pocketH / 2, -pocketW / 2, pocketH / 2 - r);
    shape.lineTo(-pocketW / 2, -pocketH / 2 + r);
    shape.quadraticCurveTo(-pocketW / 2, -pocketH / 2, -pocketW / 2 + r, -pocketH / 2);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 4,
      depth: pocketD,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 3,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Bomber la poche
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      const normalizedZ = z / pocketD;
      const bulge = Math.sin(normalizedZ * Math.PI) * 0.008;
      positions.setZ(i, z + bulge);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = 'FrontPocket_Mesh';
    mesh.position.set(0, -height * 0.1, depth / 2 - 0.005);

    group.add(mesh);

    // Logo / détail poche
    const logoPlate = this.createLogoBadge();
    logoPlate.position.set(0, -height * 0.1 + pocketH * 0.3, depth / 2 + pocketD + 0.005);
    group.add(logoPlate);

    return group;
  }

  // ========================================================================
  // POCHES LATÉRALES
  // ========================================================================

  private buildSidePockets(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SidePockets';

    const { width, height, depth } = this.config;
    const meshMat = this.materialSet!.mesh;

    // Dimensions de la poche
    const pocketH = height * 0.35;
    const pocketD = depth * 0.7;
    const pocketW = 0.015;

    [-1, 1].forEach((side) => {
      const pocketGroup = new THREE.Group();
      pocketGroup.name = `SidePocket_${side > 0 ? 'Right' : 'Left'}`;

      // Géométrie de la poche (mesh élastique en demi-cylindre)
      const pocketGeom = new THREE.CylinderGeometry(
        depth * 0.25,   // radiusTop
        depth * 0.3,    // radiusBottom
        pocketH,        // height
        12,             // radialSegments
        4,              // heightSegments
        true,           // openEnded
        0,              // thetaStart
        Math.PI         // thetaLength (demi-cercle)
      );

      const pocketMesh = new THREE.Mesh(pocketGeom, meshMat);
      pocketMesh.name = `SidePocket_Mesh_${side > 0 ? 'Right' : 'Left'}`;
      pocketMesh.position.set(
        side * (width / 2 + 0.005),
        -height * 0.1,
        0
      );
      pocketMesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

      pocketGroup.add(pocketMesh);

      // Bord élastique en haut de la poche
      const elasticGeom = new THREE.TorusGeometry(
        depth * 0.27,   // radius
        0.004,           // tube
        8,               // radialSegments
        12,              // tubularSegments
        Math.PI          // arc
      );

      const elasticMesh = new THREE.Mesh(elasticGeom, this.materialSet!.rubber);
      elasticMesh.position.set(
        side * (width / 2 + 0.005),
        -height * 0.1 + pocketH / 2,
        0
      );
      elasticMesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      elasticMesh.rotation.x = Math.PI / 2;

      pocketGroup.add(elasticMesh);

      group.add(pocketGroup);
    });

    return group;
  }

  // ========================================================================
  // COUVERCLE SUPÉRIEUR
  // ========================================================================

  private buildTopLid(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TopLid';

    const { width, height, depth } = this.config;
    const mat = this.materialSet!.main;

    // Géométrie du couvercle
    const lidW = width * 1.02;
    const lidH = height * 0.15;
    const lidD = depth * 1.1;

    const lidGeom = new THREE.BoxGeometry(lidW, lidH, lidD, 8, 4, 4);

    // Arrondir et bomber
    const positions = lidGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // Arrondir les bords
      const edgeFactor =
        (1 - Math.pow(Math.abs(x) / (lidW / 2), 4)) *
        (1 - Math.pow(Math.abs(z) / (lidD / 2), 4));
      const yAdjust = y > 0 ? edgeFactor * 0.02 : 0;

      positions.setY(i, y + yAdjust);
    }
    positions.needsUpdate = true;
    lidGeom.computeVertexNormals();

    const lidMesh = new THREE.Mesh(lidGeom, mat);
    lidMesh.name = 'TopLid_Mesh';
    lidMesh.position.set(0, height / 2 + lidH / 2 - 0.01, -depth * 0.05);

    group.add(lidMesh);

    // Poche dans le couvercle
    const lidPocketW = lidW * 0.7;
    const lidPocketH = lidH * 0.5;
    const lidPocketD = 0.015;

    const lidPocketGeom = new THREE.BoxGeometry(lidPocketW, lidPocketH, lidPocketD, 4, 2, 1);
    const lidPocketMesh = new THREE.Mesh(lidPocketGeom, mat);
    lidPocketMesh.name = 'TopLidPocket_Mesh';
    lidPocketMesh.position.set(
      0,
      height / 2 + lidH - 0.01,
      lidD / 2 - 0.01
    );

    group.add(lidPocketMesh);

    return group;
  }

  // ========================================================================
  // PANNEAU INFÉRIEUR
  // ========================================================================

  private buildBottomPanel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BottomPanel';

    const { width, height, depth } = this.config;

    // Matériau renforcé pour le fond
    const mat = this.config.hasWaterproof
      ? this.materialSet!.rubber
      : this.materialSet!.main;

    const bottomGeom = new THREE.BoxGeometry(
      width * 1.01,
      0.02,
      depth * 1.01,
      4, 1, 4
    );

    // Arrondir les bords du fond
    const positions = bottomGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const edge =
        Math.pow(Math.abs(x) / (width * 0.505), 6) +
        Math.pow(Math.abs(z) / (depth * 0.505), 6);
      if (edge > 0.8) {
        const y = positions.getY(i);
        positions.setY(i, y + (edge - 0.8) * 0.01);
      }
    }
    positions.needsUpdate = true;
    bottomGeom.computeVertexNormals();

    const bottomMesh = new THREE.Mesh(bottomGeom, mat);
    bottomMesh.name = 'BottomPanel_Mesh';
    bottomMesh.position.set(0, -height / 2, 0);

    group.add(bottomMesh);

    // Pieds de protection (4 petits dômes)
    const footGeom = new THREE.SphereGeometry(0.008, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const footMat = this.materialSet!.rubber;

    const footPositions = [
      [-width * 0.35, -height / 2 - 0.005, -depth * 0.35],
      [width * 0.35, -height / 2 - 0.005, -depth * 0.35],
      [-width * 0.35, -height / 2 - 0.005, depth * 0.35],
      [width * 0.35, -height / 2 - 0.005, depth * 0.35],
    ];

    footPositions.forEach((pos, idx) => {
      const foot = new THREE.Mesh(footGeom, footMat);
      foot.name = `Foot_${idx}`;
      foot.position.set(pos[0], pos[1], pos[2]);
      foot.rotation.x = Math.PI;
      group.add(foot);
    });

    return group;
  }

  // ========================================================================
  // BRETELLES
  // ========================================================================

  private buildShoulderStraps(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ShoulderStraps';

    const { width, height, depth } = this.config;
    const webbingMat = this.materialSet!.webbing;
    const foamMat = this.materialSet!.foam;

    [-1, 1].forEach((side) => {
      const strapGroup = new THREE.Group();
      strapGroup.name = `ShoulderStrap_${side > 0 ? 'Right' : 'Left'}`;

      // Courbe de la bretelle (Catmull-Rom)
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * width * 0.2, height * 0.45, -depth * 0.4),
        new THREE.Vector3(side * width * 0.25, height * 0.3, -depth * 0.2),
        new THREE.Vector3(side * width * 0.28, height * 0.1, depth * 0.1),
        new THREE.Vector3(side * width * 0.25, -height * 0.05, depth * 0.2),
        new THREE.Vector3(side * width * 0.22, -height * 0.2, depth * 0.15),
        new THREE.Vector3(side * width * 0.18, -height * 0.35, -depth * 0.1),
      ]);

      // Bretelle principale (tube plat)
      const strapWidth = 0.04;
      const strapThickness = 0.012;

      // Créer un profil rectangulaire arrondi pour la bretelle
      const strapShape = new THREE.Shape();
      const sr = 0.003;
      strapShape.moveTo(-strapWidth / 2 + sr, -strapThickness / 2);
      strapShape.lineTo(strapWidth / 2 - sr, -strapThickness / 2);
      strapShape.quadraticCurveTo(strapWidth / 2, -strapThickness / 2, strapWidth / 2, -strapThickness / 2 + sr);
      strapShape.lineTo(strapWidth / 2, strapThickness / 2 - sr);
      strapShape.quadraticCurveTo(strapWidth / 2, strapThickness / 2, strapWidth / 2 - sr, strapThickness / 2);
      strapShape.lineTo(-strapWidth / 2 + sr, strapThickness / 2);
      strapShape.quadraticCurveTo(-strapWidth / 2, strapThickness / 2, -strapWidth / 2, strapThickness / 2 - sr);
      strapShape.lineTo(-strapWidth / 2, -strapThickness / 2 + sr);
      strapShape.quadraticCurveTo(-strapWidth / 2, -strapThickness / 2, -strapWidth / 2 + sr, -strapThickness / 2);

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        steps: 32,
        extrudePath: strapCurve,
        bevelEnabled: false,
      };

      const strapGeom = new THREE.ExtrudeGeometry(strapShape, extrudeSettings);
      strapGeom.computeVertexNormals();

      const strapMesh = new THREE.Mesh(strapGeom, webbingMat);
      strapMesh.name = `Strap_Mesh_${side > 0 ? 'Right' : 'Left'}`;

      strapGroup.add(strapMesh);

      // Padding de la bretelle (mousse sur l'épaule)
      const paddingCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * width * 0.22, height * 0.4, -depth * 0.35),
        new THREE.Vector3(side * width * 0.26, height * 0.25, -depth * 0.1),
        new THREE.Vector3(side * width * 0.28, height * 0.1, depth * 0.08),
        new THREE.Vector3(side * width * 0.26, -height * 0.02, depth * 0.18),
      ]);

      const paddingShape = new THREE.Shape();
      const pw = strapWidth * 1.3;
      const ph = strapThickness * 2;
      const pr = 0.004;
      paddingShape.moveTo(-pw / 2 + pr, -ph / 2);
      paddingShape.lineTo(pw / 2 - pr, -ph / 2);
      paddingShape.quadraticCurveTo(pw / 2, -ph / 2, pw / 2, -ph / 2 + pr);
      paddingShape.lineTo(pw / 2, ph / 2 - pr);
      paddingShape.quadraticCurveTo(pw / 2, ph / 2, pw / 2 - pr, ph / 2);
      paddingShape.lineTo(-pw / 2 + pr, ph / 2);
      paddingShape.quadraticCurveTo(-pw / 2, ph / 2, -pw / 2, ph / 2 - pr);
      paddingShape.lineTo(-pw / 2, -ph / 2 + pr);
      paddingShape.quadraticCurveTo(-pw / 2, -ph / 2, -pw / 2 + pr, -ph / 2);

      const paddingExtSettings: THREE.ExtrudeGeometryOptions = {
        steps: 20,
        extrudePath: paddingCurve,
        bevelEnabled: false,
      };

      const paddingGeom = new THREE.ExtrudeGeometry(paddingShape, paddingExtSettings);
      paddingGeom.computeVertexNormals();

      const paddingMesh = new THREE.Mesh(paddingGeom, foamMat);
      paddingMesh.name = `StrapPadding_${side > 0 ? 'Right' : 'Left'}`;

      strapGroup.add(paddingMesh);

      // Boucle d'ajustement en bas de la bretelle
      const buckleGeom = this.createBuckleGeometry(0.035, 0.025);
      const buckleMesh = new THREE.Mesh(buckleGeom, this.materialSet!.metal);
      buckleMesh.name = `StrapBuckle_${side > 0 ? 'Right' : 'Left'}`;
      buckleMesh.position.set(
        side * width * 0.18,
        -height * 0.35,
        -depth * 0.1
      );
      strapGroup.add(buckleMesh);

      // Ajusteur de sangle (triglide)
      const triglide = this.createTriglideGeometry(0.04, 0.02);
      const triglideMesh = new THREE.Mesh(triglide, this.materialSet!.metal);
      triglideMesh.name = `StrapTriglide_${side > 0 ? 'Right' : 'Left'}`;
      triglideMesh.position.set(
        side * width * 0.25,
        -height * 0.15,
        depth * 0.12
      );
      strapGroup.add(triglideMesh);

      group.add(strapGroup);
    });

    return group;
  }

  // ========================================================================
  // PANNEAU ARRIÈRE
  // ========================================================================

  private buildBackPanel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BackPanel';

    const { width, height, depth } = this.config;
    const meshMat = this.materialSet!.mesh;
    const foamMat = this.materialSet!.foam;

    // Panneau principal (mesh respirant)
    const panelGeom = new THREE.PlaneGeometry(
      width * 0.9,
      height * 0.85,
      8, 12
    );

    // Courber le panneau pour épouser le dos
    const positions = panelGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      // Courbure pour épouser le dos
      const curvature = Math.pow(Math.abs(x) / (width * 0.45), 2) * depth * 0.15;
      const z = -curvature;

      // Canal de ventilation central
      const ventilation = Math.exp(-Math.pow(x / 0.03, 2)) * 0.008;

      positions.setZ(i, z + ventilation);
    }
    positions.needsUpdate = true;
    panelGeom.computeVertexNormals();

    const panelMesh = new THREE.Mesh(panelGeom, meshMat);
    panelMesh.name = 'BackPanel_Mesh';
    panelMesh.position.set(0, 0, -depth / 2 - 0.005);

    group.add(panelMesh);

    // Padding lombaire
    const lumbarW = width * 0.6;
    const lumbarH = height * 0.2;
    const lumbarGeom = new THREE.BoxGeometry(lumbarW, lumbarH, 0.02, 6, 4, 2);

    // Bomber le padding
    const lumbarPos = lumbarGeom.attributes.position;
    for (let i = 0; i < lumbarPos.count; i++) {
      const x = lumbarPos.getX(i);
      const y = lumbarPos.getY(i);
      const z = lumbarPos.getZ(i);

      if (z < 0) {
        const bump =
          (1 - Math.pow(x / (lumbarW / 2), 2)) *
          (1 - Math.pow(y / (lumbarH / 2), 2)) * 0.015;
        lumbarPos.setZ(i, z - bump);
      }
    }
    lumbarPos.needsUpdate = true;
    lumbarGeom.computeVertexNormals();

    const lumbarMesh = new THREE.Mesh(lumbarGeom, foamMat);
    lumbarMesh.name = 'LumbarPad_Mesh';
    lumbarMesh.position.set(0, -height * 0.15, -depth / 2 - 0.015);

    group.add(lumbarMesh);

    // Padding supérieur (2 pads verticaux)
    [-1, 1].forEach((side) => {
      const padGeom = new THREE.BoxGeometry(width * 0.15, height * 0.35, 0.015, 3, 6, 1);

      const padPos = padGeom.attributes.position;
      for (let i = 0; i < padPos.count; i++) {
        const x = padPos.getX(i);
        const y = padPos.getY(i);
        const z = padPos.getZ(i);

        if (z < 0) {
          const bump =
            (1 - Math.pow(x / (width * 0.075), 2)) *
            (1 - Math.pow(y / (height * 0.175), 2)) * 0.01;
          padPos.setZ(i, z - bump);
        }
      }
      padPos.needsUpdate = true;
      padGeom.computeVertexNormals();

      const padMesh = new THREE.Mesh(padGeom, foamMat);
      padMesh.name = `BackPad_${side > 0 ? 'Right' : 'Left'}`;
      padMesh.position.set(
        side * width * 0.2,
        height * 0.1,
        -depth / 2 - 0.015
      );

      group.add(padMesh);
    });

    return group;
  }

  // ========================================================================
  // POIGNÉE SUPÉRIEURE
  // ========================================================================

  private buildTopHandle(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TopHandle';

    const { width, height, depth } = this.config;

    // Courbe de la poignée
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-width * 0.12, height / 2, -depth * 0.35),
      new THREE.Vector3(-width * 0.08, height / 2 + 0.04, -depth * 0.3),
      new THREE.Vector3(0, height / 2 + 0.055, -depth * 0.28),
      new THREE.Vector3(width * 0.08, height / 2 + 0.04, -depth * 0.3),
      new THREE.Vector3(width * 0.12, height / 2, -depth * 0.35),
    ]);

    // Tube de la poignée
    const handleGeom = new THREE.TubeGeometry(handleCurve, 16, 0.007, 8, false);
    const handleMesh = new THREE.Mesh(handleGeom, this.materialSet!.webbing);
    handleMesh.name = 'Handle_Mesh';

    group.add(handleMesh);

    // Grip en caoutchouc au centre
    const gripCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-width * 0.06, height / 2 + 0.045, -depth * 0.29),
      new THREE.Vector3(0, height / 2 + 0.055, -depth * 0.28),
      new THREE.Vector3(width * 0.06, height / 2 + 0.045, -depth * 0.29),
    ]);

    const gripGeom = new THREE.TubeGeometry(gripCurve, 12, 0.01, 8, false);
    const gripMesh = new THREE.Mesh(gripGeom, this.materialSet!.rubber);
    gripMesh.name = 'HandleGrip_Mesh';

    group.add(gripMesh);

    // Points d'attache
    [-1, 1].forEach((side) => {
      const attachGeom = new THREE.CylinderGeometry(0.008, 0.01, 0.008, 8);
      const attachMesh = new THREE.Mesh(attachGeom, this.materialSet!.metal);
      attachMesh.name = `HandleAttach_${side > 0 ? 'Right' : 'Left'}`;
      attachMesh.position.set(
        side * width * 0.12,
        height / 2 - 0.002,
        -depth * 0.35
      );
      group.add(attachMesh);
    });

    return group;
  }

  // ========================================================================
  // ZIPPERS
  // ========================================================================

  private buildZippers(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Zippers';

    const { width, height, depth } = this.config;
    const zipMat = this.materialSet!.zipper;

    // Zipper principal (compartiment principal)
    const mainZipperPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-width * 0.35, height * 0.4, depth / 2 + 0.012),
      new THREE.Vector3(-width * 0.3, height * 0.42, depth / 2 + 0.013),
      new THREE.Vector3(0, height * 0.43, depth / 2 + 0.014),
      new THREE.Vector3(width * 0.3, height * 0.42, depth / 2 + 0.013),
      new THREE.Vector3(width * 0.35, height * 0.4, depth / 2 + 0.012),
    ]);

    const mainZipGeom = new THREE.TubeGeometry(mainZipperPath, 20, 0.003, 6, false);
    const mainZipMesh = new THREE.Mesh(mainZipGeom, zipMat);
    mainZipMesh.name = 'MainZipper_Track';
    group.add(mainZipMesh);

    // Dents du zipper
    const zipTeethGroup = this.createZipperTeeth(mainZipperPath, 40);
    zipTeethGroup.name = 'MainZipper_Teeth';
    group.add(zipTeethGroup);

    // Tirette du zipper
    const pullerGroup = this.createZipperPuller();
    pullerGroup.name = 'MainZipper_Puller';
    pullerGroup.position.copy(mainZipperPath.getPoint(0.5));
    pullerGroup.userData = { type: 'zipper', interactive: true };
    group.add(pullerGroup);

    // Zipper poche avant
    const frontZipPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-width * 0.3, -height * 0.1 + height * 0.12, depth / 2 + 0.02),
      new THREE.Vector3(0, -height * 0.1 + height * 0.13, depth / 2 + 0.022),
      new THREE.Vector3(width * 0.3, -height * 0.1 + height * 0.12, depth / 2 + 0.02),
    ]);

    const frontZipGeom = new THREE.TubeGeometry(frontZipPath, 16, 0.002, 6, false);
    const frontZipMesh = new THREE.Mesh(frontZipGeom, zipMat);
    frontZipMesh.name = 'FrontPocketZipper_Track';
    group.add(frontZipMesh);

    const frontPuller = this.createZipperPuller(0.7);
    frontPuller.name = 'FrontPocketZipper_Puller';
    frontPuller.position.copy(frontZipPath.getPoint(0.5));
    frontPuller.userData = { type: 'zipper-front', interactive: true };
    group.add(frontPuller);

    return group;
  }

  // ========================================================================
  // BOUCLES
  // ========================================================================

  private buildBuckles(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Buckles';

    // Les boucles sont déjà partiellement intégrées dans les bretelles
    // Ici, on ajoute des boucles de compression supplémentaires

    return group;
  }

  // ========================================================================
  // SANGLE POITRINE
  // ========================================================================

  private buildChestStrap(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ChestStrap';

    const { width, height, depth } = this.config;
    const webbingMat = this.materialSet!.webbing;
    const metalMat = this.materialSet!.metal;

    // Sangle gauche
    const leftStrap = new THREE.BoxGeometry(width * 0.15, 0.015, 0.004, 4, 1, 1);
    const leftMesh = new THREE.Mesh(leftStrap, webbingMat);
    leftMesh.name = 'ChestStrap_Left';
    leftMesh.position.set(-width * 0.15, height * 0.15, -depth * 0.05);
    group.add(leftMesh);

    // Sangle droite
    const rightStrap = new THREE.BoxGeometry(width * 0.15, 0.015, 0.004, 4, 1, 1);
    const rightMesh = new THREE.Mesh(rightStrap, webbingMat);
    rightMesh.name = 'ChestStrap_Right';
    rightMesh.position.set(width * 0.15, height * 0.15, -depth * 0.05);
    group.add(rightMesh);

    // Boucle centrale
    const buckleGeom = this.createBuckleGeometry(0.03, 0.02);
    const buckleMesh = new THREE.Mesh(buckleGeom, metalMat);
    buckleMesh.name = 'ChestStrap_Buckle';
    buckleMesh.position.set(0, height * 0.15, -depth * 0.05);
    buckleMesh.userData = { type: 'chest-strap', interactive: true };
    group.add(buckleMesh);

    // Sifflet d'urgence (petit détail)
    const whistleGeom = new THREE.CylinderGeometry(0.004, 0.004, 0.015, 6);
    const whistleMesh = new THREE.Mesh(whistleGeom, metalMat);
    whistleMesh.name = 'ChestStrap_Whistle';
    whistleMesh.position.set(0.015, height * 0.15, -depth * 0.05 - 0.005);
    whistleMesh.rotation.z = Math.PI / 2;
    group.add(whistleMesh);

    return group;
  }

  // ========================================================================
  // CEINTURE HANCHES
  // ========================================================================

  private buildHipBelt(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HipBelt';

    const { width, height, depth } = this.config;
    const foamMat = this.materialSet!.foam;
    const webbingMat = this.materialSet!.webbing;
    const metalMat = this.materialSet!.metal;

    [-1, 1].forEach((side) => {
      // Padding de la ceinture
      const padCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * width * 0.15, -height * 0.4, -depth * 0.4),
        new THREE.Vector3(side * width * 0.3, -height * 0.4, -depth * 0.1),
        new THREE.Vector3(side * width * 0.35, -height * 0.4, depth * 0.15),
      ]);

      const padShape = new THREE.Shape();
      const pw = 0.06;
      const ph = 0.015;
      padShape.moveTo(-pw / 2, -ph / 2);
      padShape.lineTo(pw / 2, -ph / 2);
      padShape.lineTo(pw / 2, ph / 2);
      padShape.lineTo(-pw / 2, ph / 2);
      padShape.lineTo(-pw / 2, -ph / 2);

      const padGeom = new THREE.ExtrudeGeometry(padShape, {
        steps: 16,
        extrudePath: padCurve,
        bevelEnabled: false,
      });
      padGeom.computeVertexNormals();

      const padMesh = new THREE.Mesh(padGeom, foamMat);
      padMesh.name = `HipBelt_Pad_${side > 0 ? 'Right' : 'Left'}`;
      group.add(padMesh);

      // Sangle de la ceinture
      const strapGeom = new THREE.BoxGeometry(0.12, 0.025, 0.003, 4, 1, 1);
      const strapMesh = new THREE.Mesh(strapGeom, webbingMat);
      strapMesh.name = `HipBelt_Strap_${side > 0 ? 'Right' : 'Left'}`;
      strapMesh.position.set(
        side * width * 0.35,
        -height * 0.4,
        depth * 0.15
      );
      group.add(strapMesh);
    });

    // Boucle centrale de la ceinture
    const buckleGeom = this.createBuckleGeometry(0.05, 0.03);
    const buckleMesh = new THREE.Mesh(buckleGeom, metalMat);
    buckleMesh.name = 'HipBelt_Buckle';
    buckleMesh.position.set(0, -height * 0.4, depth * 0.15);
    buckleMesh.userData = { type: 'hip-belt', interactive: true };
    group.add(buckleMesh);

    return group;
  }

  // ========================================================================
  // COMPARTIMENT LAPTOP
  // ========================================================================

  private buildLaptopCompartment(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LaptopCompartment';

    const { width, height, depth } = this.config;

    // Pochette interne (visible légèrement à travers le zipper)
    const laptopW = width * 0.8;
    const laptopH = height * 0.7;
    const laptopThick = 0.005;

    const laptopGeom = new THREE.BoxGeometry(laptopW, laptopH, laptopThick, 1, 1, 1);
    const laptopMesh = new THREE.Mesh(laptopGeom, this.materialSet!.foam);
    laptopMesh.name = 'LaptopSleeve_Mesh';
    laptopMesh.position.set(0, height * 0.05, -depth * 0.35);

    group.add(laptopMesh);

    // Indicateur externe "Laptop" (étiquette en relief)
    const labelGeom = new THREE.PlaneGeometry(0.04, 0.015);
    const labelMat = this.materialSet!.secondary.clone();
    const labelMesh = new THREE.Mesh(labelGeom, labelMat);
    labelMesh.name = 'LaptopLabel';
    labelMesh.position.set(width * 0.3, height * 0.35, depth / 2 + 0.015);
    group.add(labelMesh);

    return group;
  }

  // ========================================================================
  // DÉTAILS VARIANTES
  // ========================================================================

  private buildHikingDetails(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HikingDetails';

    const { width, height, depth } = this.config;
    const webbingMat = this.materialSet!.webbing;
    const metalMat = this.materialSet!.metal;

    // Points d'attache pour bâtons de marche (daisy chain)
    [-1, 1].forEach((side) => {
      const loopCount = 4;
      for (let i = 0; i < loopCount; i++) {
        const loopGeom = new THREE.TorusGeometry(0.008, 0.002, 6, 8);
        const loopMesh = new THREE.Mesh(loopGeom, webbingMat);
        loopMesh.name = `DaisyChain_${side > 0 ? 'R' : 'L'}_${i}`;
        loopMesh.position.set(
          side * (width / 2 + 0.01),
          height * 0.3 - i * 0.08,
          0
        );
        loopMesh.rotation.y = Math.PI / 2;
        group.add(loopMesh);
      }
    });

    // Porte-bâtons (élastique)
    [-1, 1].forEach((side) => {
      const holderGeom = new THREE.TorusGeometry(0.02, 0.003, 6, 12);
      const holderMesh = new THREE.Mesh(holderGeom, this.materialSet!.rubber);
      holderMesh.name = `PoleHolder_${side > 0 ? 'Right' : 'Left'}`;
      holderMesh.position.set(
        side * (width / 2 + 0.015),
        -height * 0.3,
        0
      );
      holderMesh.rotation.y = Math.PI / 2;
      group.add(holderMesh);
    });

    // Port pour poche à eau (tube sortant en haut)
    const hydrationPort = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8);
    const hydrationMesh = new THREE.Mesh(hydrationPort, this.materialSet!.rubber);
    hydrationMesh.name = 'HydrationPort';
    hydrationMesh.position.set(0, height / 2 + 0.01, -depth * 0.3);
    group.add(hydrationMesh);

    // Rain cover pocket (petite poche en bas)
    const rcPocketGeom = new THREE.BoxGeometry(width * 0.4, 0.04, depth * 0.3, 2, 1, 2);
    const rcPocketMesh = new THREE.Mesh(rcPocketGeom, this.materialSet!.main);
    rcPocketMesh.name = 'RainCoverPocket';
    rcPocketMesh.position.set(0, -height / 2 + 0.02, 0);
    group.add(rcPocketMesh);

    return group;
  }

  private buildUrbanDetails(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'UrbanDetails';

    const { width, height, depth } = this.config;

    // Port USB (petit cylindre sur le côté)
    const usbGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.008, 8);
    const usbMesh = new THREE.Mesh(usbGeom, this.materialSet!.rubber);
    usbMesh.name = 'USBPort';
    usbMesh.position.set(width / 2 + 0.005, height * 0.1, -depth * 0.15);
    usbMesh.rotation.z = Math.PI / 2;
    group.add(usbMesh);

    // Port pour écouteurs
    const audioGeom = new THREE.CylinderGeometry(0.003, 0.003, 0.006, 6);
    const audioMesh = new THREE.Mesh(audioGeom, this.materialSet!.rubber);
    audioMesh.name = 'AudioPort';
    audioMesh.position.set(width * 0.25, height / 2, -depth * 0.2);
    audioMesh.rotation.x = Math.PI / 2;
    group.add(audioMesh);

    // Poche cachée anti-vol (dans le dos)
    const secretPocketGeom = new THREE.PlaneGeometry(width * 0.3, height * 0.15);
    const secretPocketMesh = new THREE.Mesh(secretPocketGeom, this.materialSet!.main);
    secretPocketMesh.name = 'SecretPocket';
    secretPocketMesh.position.set(0, -height * 0.1, -depth / 2 - 0.008);
    group.add(secretPocketMesh);

    // Zipper de la poche cachée
    const secretZipGeom = new THREE.BoxGeometry(width * 0.25, 0.003, 0.003);
    const secretZipMesh = new THREE.Mesh(secretZipGeom, this.materialSet!.zipper);
    secretZipMesh.name = 'SecretPocket_Zipper';
    secretZipMesh.position.set(0, -height * 0.1 + height * 0.075, -depth / 2 - 0.009);
    group.add(secretZipMesh);

    return group;
  }

  // ========================================================================
  // SANGLES DE COMPRESSION
  // ========================================================================

  private buildCompressionStraps(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CompressionStraps';

    const { width, height, depth } = this.config;
    const webbingMat = this.materialSet!.webbing;
    const metalMat = this.materialSet!.metal;

    // 2 sangles de chaque côté
    [-1, 1].forEach((side) => {
      [0.15, -0.15].forEach((yOffset, idx) => {
        // Sangle horizontale
        const strapGeom = new THREE.BoxGeometry(0.005, 0.012, depth * 0.8, 1, 1, 4);
        const strapMesh = new THREE.Mesh(strapGeom, webbingMat);
        strapMesh.name = `CompStrap_${side > 0 ? 'R' : 'L'}_${idx}`;
        strapMesh.position.set(
          side * (width / 2 + 0.003),
          height * yOffset,
          0
        );
        group.add(strapMesh);

        // Petite boucle de tension
        const buckleGeom = this.createBuckleGeometry(0.015, 0.012);
        const buckleMesh = new THREE.Mesh(buckleGeom, metalMat);
        buckleMesh.name = `CompBuckle_${side > 0 ? 'R' : 'L'}_${idx}`;
        buckleMesh.position.set(
          side * (width / 2 + 0.006),
          height * yOffset,
          depth * 0.35
        );
        group.add(buckleMesh);
      });
    });

    return group;
  }

  // ========================================================================
  // BANDE RÉFLÉCHISSANTE
  // ========================================================================

  private buildReflectiveStrip(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ReflectiveStrips';

    const { width, height, depth } = this.config;
    const reflMat = this.materialSet!.reflective;

    // Bande réfléchissante frontale (bas)
    const frontStripGeom = new THREE.PlaneGeometry(width * 0.6, 0.008);
    const frontStripMesh = new THREE.Mesh(frontStripGeom, reflMat);
    frontStripMesh.name = 'ReflectiveStrip_Front';
    frontStripMesh.position.set(0, -height * 0.35, depth / 2 + 0.013);
    group.add(frontStripMesh);

    // Bandes réfléchissantes sur les bretelles
    [-1, 1].forEach((side) => {
      const strapStripGeom = new THREE.PlaneGeometry(0.008, height * 0.15);
      const strapStripMesh = new THREE.Mesh(strapStripGeom, reflMat);
      strapStripMesh.name = `ReflectiveStrip_Strap_${side > 0 ? 'R' : 'L'}`;
      strapStripMesh.position.set(
        side * width * 0.27,
        height * 0.05,
        depth * 0.12
      );
      group.add(strapStripMesh);
    });

    return group;
  }

  // ========================================================================
  // HELPERS - Géométries utilitaires
  // ========================================================================

  /**
   * Créer les lignes de couture
   */
  private createSeamLines(w: number, h: number, d: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Seams';

    const seamMaterial = new THREE.LineBasicMaterial({
      color: 0x333336,
      linewidth: 1,
    });

    // Couture verticale centrale avant
    const centerSeam = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -h / 2 + 0.02, d / 2 + 0.012),
      new THREE.Vector3(0, h / 2 - 0.02, d / 2 + 0.012),
    ]);
    const centerLine = new THREE.Line(centerSeam, seamMaterial);
    centerLine.name = 'Seam_CenterFront';
    group.add(centerLine);

    // Coutures latérales
    [-1, 1].forEach((side) => {
      const sideSeamPoints = [
        new THREE.Vector3(side * w / 2, -h / 2 + 0.02, d / 2),
        new THREE.Vector3(side * w / 2, h / 2 - 0.02, d / 2),
      ];
      const sideSeam = new THREE.BufferGeometry().setFromPoints(sideSeamPoints);
      const sideLine = new THREE.Line(sideSeam, seamMaterial);
      sideLine.name = `Seam_Side_${side > 0 ? 'Right' : 'Left'}`;
      group.add(sideLine);
    });

    return group;
  }

  /**
   * Badge/Logo du sac
   */
  private createLogoBadge(): THREE.Mesh {
    const badgeGeom = new THREE.BoxGeometry(0.03, 0.015, 0.002, 1, 1, 1);
    const badgeMat = this.materialSet!.leather;
    const badge = new THREE.Mesh(badgeGeom, badgeMat);
    badge.name = 'LogoBadge';
    return badge;
  }

  /**
   * Géométrie de boucle (buckle)
   */
  private createBuckleGeometry(w: number, h: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const r = Math.min(w, h) * 0.15;

    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

    // Trou central
    const hole = new THREE.Path();
    const holeW = w * 0.6;
    const holeH = h * 0.5;
    const hr = Math.min(holeW, holeH) * 0.15;

    hole.moveTo(-holeW / 2 + hr, -holeH / 2);
    hole.lineTo(holeW / 2 - hr, -holeH / 2);
    hole.quadraticCurveTo(holeW / 2, -holeH / 2, holeW / 2, -holeH / 2 + hr);
    hole.lineTo(holeW / 2, holeH / 2 - hr);
    hole.quadraticCurveTo(holeW / 2, holeH / 2, holeW / 2 - hr, holeH / 2);
    hole.lineTo(-holeW / 2 + hr, holeH / 2);
    hole.quadraticCurveTo(-holeW / 2, holeH / 2, -holeW / 2, holeH / 2 - hr);
    hole.lineTo(-holeW / 2, -holeH / 2 + hr);
    hole.quadraticCurveTo(-holeW / 2, -holeH / 2, -holeW / 2 + hr, -holeH / 2);

    shape.holes.push(hole);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: 0.003,
      bevelEnabled: true,
      bevelThickness: 0.0005,
      bevelSize: 0.0005,
      bevelSegments: 2,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Géométrie triglide (ajusteur de sangle)
   */
  private createTriglideGeometry(w: number, h: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const r = Math.min(w, h) * 0.1;

    // Rectangle extérieur
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

    // 2 trous pour le passage de la sangle
    const slotW = w * 0.35;
    const slotH = h * 0.5;

    [-1, 1].forEach((side) => {
      const slotHole = new THREE.Path();
      const sx = side * w * 0.18;
      slotHole.moveTo(sx - slotW / 2, -slotH / 2);
      slotHole.lineTo(sx + slotW / 2, -slotH / 2);
      slotHole.lineTo(sx + slotW / 2, slotH / 2);
      slotHole.lineTo(sx - slotW / 2, slotH / 2);
      slotHole.lineTo(sx - slotW / 2, -slotH / 2);
      shape.holes.push(slotHole);
    });

    // Barre centrale
    // (implicite par les trous)

    return new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.002,
      bevelEnabled: true,
      bevelThickness: 0.0003,
      bevelSize: 0.0003,
      bevelSegments: 1,
    });
  }

  /**
   * Dents de zipper le long d'un chemin
   */
  private createZipperTeeth(path: THREE.CatmullRomCurve3, count: number): THREE.Group {
    const group = new THREE.Group();
    const toothGeom = new THREE.BoxGeometry(0.002, 0.003, 0.002);
    const toothMat = this.materialSet!.zipper;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const point = path.getPoint(t);

      // Dent gauche
      const toothL = new THREE.Mesh(toothGeom, toothMat);
      toothL.position.copy(point);
      toothL.position.y -= 0.003;
      group.add(toothL);

      // Dent droite
      const toothR = new THREE.Mesh(toothGeom, toothMat);
      toothR.position.copy(point);
      toothR.position.y += 0.003;
      group.add(toothR);
    }

    return group;
  }

  /**
   * Tirette de zipper
   */
  private createZipperPuller(scale: number = 1): THREE.Group {
    const group = new THREE.Group();

    const s = scale;

    // Corps de la tirette
    const bodyGeom = new THREE.BoxGeometry(
      0.008 * s,
      0.004 * s,
      0.012 * s,
      1, 1, 1
    );
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materialSet!.zipper);
    bodyMesh.name = 'ZipperPuller_Body';
    group.add(bodyMesh);

    // Tab (languette)
    const tabGeom = new THREE.BoxGeometry(
      0.006 * s,
      0.001 * s,
      0.02 * s,
      1, 1, 1
    );
    const tabMesh = new THREE.Mesh(tabGeom, this.materialSet!.zipper);
    tabMesh.name = 'ZipperPuller_Tab';
    tabMesh.position.z = 0.014 * s;
    group.add(tabMesh);

    // Anneau
    const ringGeom = new THREE.TorusGeometry(0.004 * s, 0.001 * s, 4, 8);
    const ringMesh = new THREE.Mesh(ringGeom, this.materialSet!.zipper);
    ringMesh.name = 'ZipperPuller_Ring';
    ringMesh.position.z = 0.025 * s;
    group.add(ringMesh);

    return group;
  }

  /**
   * Obtenir le nombre total de polygones
   */
  getPolygonCount(object: THREE.Object3D): number {
    let count = 0;
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geom = child.geometry;
        if (geom.index) {
          count += geom.index.count / 3;
        } else if (geom.attributes.position) {
          count += geom.attributes.position.count / 3;
        }
      }
    });
    return count;
  }

  /**
   * Nettoyer les ressources
   */
  dispose(): void {
    this.materialCreator.dispose();
  }
}