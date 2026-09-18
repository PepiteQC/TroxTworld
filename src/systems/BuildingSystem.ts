/**
 * Système de bâtiments polytexturés et polymorphes
 * Supporte plusieurs styles architecturaux avec réutilisation de matériaux
 */

import * as THREE from 'three';

export enum BuildingType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  CIVIC = 'civic',
  ROAD = 'road',
  PARK = 'park',
}

export enum TextureStyle {
  BRICK = 'brick',
  CONCRETE = 'concrete',
  WOOD = 'wood',
  METAL = 'metal',
  GLASS = 'glass',
  STONE = 'stone',
}

export interface BuildingConfig {
  id: string;
  type: BuildingType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  height: number;
  width: number;
  depth: number;
  textures: TextureStyle[];
  roofType?: 'flat' | 'pitched' | 'dome';
  windowCount?: { x: number; y: number };
  doorCount?: number;
  color?: number;
  metadata?: Record<string, any>;
}

/**
 * Gestionnaire centralisé de matériaux réutilisables
 * Optimise la mémoire en partageant les matériaux entre les bâtiments
 */
export class MaterialLibrary {
  private materials = new Map<string, THREE.Material>();
  private textureCache = new Map<string, THREE.Texture>();

  constructor() {
    this.initializeDefaultMaterials();
  }

  private initializeDefaultMaterials(): void {
    // Matériaux par défaut optimisés
    const brickMat = new THREE.MeshStandardMaterial({
      color: 0xb44e3a,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    this.materials.set('brick', brickMat);

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.materials.set('concrete', concreteMat);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x8b6b47,
      roughness: 0.6,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.materials.set('wood', woodMat);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.3,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });
    this.materials.set('metal', metalMat);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xb3d9ff,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    this.materials.set('glass', glassMat);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x7d7d7d,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.materials.set('stone', stoneMat);

    // Matériaux spécialisés
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.3,
      side: THREE.DoubleSide,
    });
    this.materials.set('roof', roofMat);

    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.materials.set('asphalt', asphaltMat);

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2d8659,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.materials.set('grass', grassMat);
  }

  getMaterial(style: TextureStyle | string): THREE.Material {
    const key = style.toLowerCase();
    if (this.materials.has(key)) {
      return this.materials.get(key)!.clone();
    }
    return this.materials.get('concrete')!;
  }

  getMaterialByKey(key: string): THREE.Material {
    return this.materials.get(key)?.clone() || this.materials.get('concrete')!.clone();
  }

  getAllMaterials(): Map<string, THREE.Material> {
    return this.materials;
  }

  dispose(): void {
    this.materials.forEach((mat) => mat.dispose());
    this.textureCache.forEach((tex) => tex.dispose());
    this.materials.clear();
    this.textureCache.clear();
  }
}

/**
 * Fabrique pour créer des géométries de bâtiments réutilisables
 */
export class BuildingGeometryFactory {
  static createBox(width: number, height: number, depth: number): THREE.BoxGeometry {
    return new THREE.BoxGeometry(width, height, depth);
  }

  static createRoof(width: number, depth: number, height: number, style: 'flat' | 'pitched' | 'dome'): THREE.BufferGeometry {
    if (style === 'pitched') {
      return this.createPitchedRoof(width, depth, height);
    } else if (style === 'dome') {
      return this.createDomeRoof(width, depth, height);
    }
    return new THREE.PlaneGeometry(width, depth);
  }

  private static createPitchedRoof(width: number, depth: number, height: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -width / 2, 0, -depth / 2,
      width / 2, 0, -depth / 2,
      0, height, 0,
      width / 2, 0, depth / 2,
      -width / 2, 0, depth / 2,
      0, height, 0,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createDomeRoof(width: number, depth: number, _height: number): THREE.BufferGeometry {
    return new THREE.SphereGeometry(Math.max(width, depth) / 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  }

  static createWindow(width: number, height: number): THREE.PlaneGeometry {
    return new THREE.PlaneGeometry(width, height);
  }

  static createDoor(width: number, height: number): THREE.PlaneGeometry {
    return new THREE.PlaneGeometry(width, height);
  }

  static addWindowsToFace(geometry: THREE.BufferGeometry, columnsX: number, rowsY: number): void {
    (geometry as any).windowGrid = { x: columnsX, y: rowsY };
  }
}

/**
 * Classe pour représenter et gérer un bâtiment 3D
 */
export class Building3D {
  config: BuildingConfig;
  mesh?: THREE.Mesh;
  materialLib: MaterialLibrary;
  private roofMesh?: THREE.Mesh;
  private doorsMeshes: THREE.Mesh[] = [];
  private windowsMeshes: THREE.Mesh[] = [];

  constructor(config: BuildingConfig, materialLib: MaterialLibrary) {
    this.config = config;
    this.materialLib = materialLib;
  }

  createMesh(): THREE.Mesh {
    const group = new THREE.Group() as any as THREE.Mesh;
    group.position.set(...this.config.position);
    group.rotation.set(...this.config.rotation);
    group.scale.set(...this.config.scale);

    const wallGeometry = BuildingGeometryFactory.createBox(
      this.config.width,
      this.config.height,
      this.config.depth
    );

    const wallMaterial = this.materialLib.getMaterial(this.config.textures[0] || 'concrete');
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.y = this.config.height / 2;
    group.add(wallMesh);

    if (this.config.roofType) {
      const roofGeometry = BuildingGeometryFactory.createRoof(
        this.config.width,
        this.config.depth,
        this.config.height * 0.3,
        this.config.roofType
      );
      const roofMaterial = this.materialLib.getMaterialByKey('roof');
      this.roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
      this.roofMesh.position.y = this.config.height;
      group.add(this.roofMesh);
    }

    if (this.config.windowCount) {
      this.addWindows(group as any as THREE.Group, this.config.windowCount.x, this.config.windowCount.y);
    }

    if (this.config.doorCount && this.config.doorCount > 0) {
      this.addDoors(group as any as THREE.Group, this.config.doorCount);
    }

    this.mesh = group as any;
    return this.mesh;
  }

  private addWindows(group: THREE.Group, columnsX: number, rowsY: number): void {
    const windowMat = this.materialLib.getMaterial('glass');
    const windowWidth = this.config.width / (columnsX + 1);
    const windowHeight = this.config.height / (rowsY + 1);
    const windowGeo = BuildingGeometryFactory.createWindow(windowWidth * 0.8, windowHeight * 0.8);

    for (let y = 0; y < rowsY; y++) {
      for (let x = 0; x < columnsX; x++) {
        const windowMesh = new THREE.Mesh(windowGeo, windowMat.clone());
        windowMesh.position.set(
          -this.config.width / 2 + windowWidth * (x + 1),
          this.config.height - windowHeight * (y + 1),
          this.config.depth / 2 + 0.01
        );
        group.add(windowMesh);
        this.windowsMeshes.push(windowMesh);
      }
    }
  }

  private addDoors(group: THREE.Group, count: number): void {
    const doorMat = this.materialLib.getMaterial('wood');
    const doorWidth = this.config.width / (count + 1);
    const doorHeight = this.config.height * 0.8;
    const doorGeo = BuildingGeometryFactory.createDoor(doorWidth * 0.8, doorHeight);

    for (let i = 0; i < count; i++) {
      const doorMesh = new THREE.Mesh(doorGeo, doorMat.clone());
      doorMesh.position.set(
        -this.config.width / 2 + doorWidth * (i + 1),
        doorHeight / 2,
        this.config.depth / 2 + 0.01
      );
      group.add(doorMesh);
      this.doorsMeshes.push(doorMesh);
    }
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  getMetadata(): Record<string, any> {
    return this.config.metadata || {};
  }
}

export default {
  Building3D,
  BuildingGeometryFactory,
  MaterialLibrary,
  BuildingType,
  TextureStyle,
};
