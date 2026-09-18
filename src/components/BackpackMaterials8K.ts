// ============================================================================
// BackpackMaterials8K.ts
// Système de matériaux PBR 8K générés procéduralement pour sac à dos 3D
// Made in Montréal 🍁
// ============================================================================

import * as THREE from 'three';

// ----------------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------------

export interface MaterialConfig {
  name: string;
  color: string;
  roughness: number;
  metalness: number;
  normalScale: number;
  displacementScale: number;
  weavePattern?: 'tight' | 'loose' | 'twill' | 'ripstop' | 'canvas';
  opacity?: number;
  transparent?: boolean;
  side?: THREE.Side;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface GeneratedTextures {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  aoMap: THREE.Texture | null;
  displacementMap: THREE.Texture | null;
  metalnessMap: THREE.Texture | null;
}

// ----------------------------------------------------------------------------
// Matériaux prédéfinis
// ----------------------------------------------------------------------------

export const BACKPACK_MATERIALS: Record<string, MaterialConfig> = {
  nylonBlackTight: {
    name: 'Nylon Noir Serré',
    color: '#1a1a1e',
    roughness: 0.65,
    metalness: 0.05,
    normalScale: 1.2,
    displacementScale: 0.02,
    weavePattern: 'tight',
  },
  nylonGrey: {
    name: 'Nylon Gris',
    color: '#6b6b70',
    roughness: 0.6,
    metalness: 0.05,
    normalScale: 1.0,
    displacementScale: 0.015,
    weavePattern: 'tight',
  },
  corduraBlack: {
    name: 'Cordura Noir',
    color: '#111115',
    roughness: 0.75,
    metalness: 0.03,
    normalScale: 1.5,
    displacementScale: 0.03,
    weavePattern: 'ripstop',
  },
  corduraRed: {
    name: 'Cordura Rouge',
    color: '#8b1a1a',
    roughness: 0.72,
    metalness: 0.04,
    normalScale: 1.4,
    displacementScale: 0.025,
    weavePattern: 'ripstop',
  },
  polyesterVert: {
    name: 'Polyester Vert Forêt',
    color: '#1a3a1a',
    roughness: 0.68,
    metalness: 0.03,
    normalScale: 1.1,
    displacementScale: 0.02,
    weavePattern: 'twill',
  },
  cottonGrey: {
    name: 'Coton Gris Naturel',
    color: '#9e9a8e',
    roughness: 0.85,
    metalness: 0.0,
    normalScale: 0.8,
    displacementScale: 0.015,
    weavePattern: 'canvas',
  },
  aluminiumBrush: {
    name: 'Aluminium Brossé',
    color: '#c0c0c5',
    roughness: 0.35,
    metalness: 0.9,
    normalScale: 0.6,
    displacementScale: 0.005,
    weavePattern: 'tight',
  },
  steelDark: {
    name: 'Acier Sombre',
    color: '#3a3a40',
    roughness: 0.4,
    metalness: 0.85,
    normalScale: 0.5,
    displacementScale: 0.003,
    weavePattern: 'tight',
  },
  syntheticLeather: {
    name: 'Cuir Synthétique',
    color: '#2a1f1a',
    roughness: 0.55,
    metalness: 0.08,
    normalScale: 1.3,
    displacementScale: 0.02,
    weavePattern: 'loose',
  },
  meshBlack: {
    name: 'Mesh Respirant Noir',
    color: '#1e1e22',
    roughness: 0.8,
    metalness: 0.02,
    normalScale: 1.6,
    displacementScale: 0.04,
    weavePattern: 'loose',
  },
  webbing: {
    name: 'Sangle Nylon',
    color: '#1a1a1e',
    roughness: 0.7,
    metalness: 0.02,
    normalScale: 1.8,
    displacementScale: 0.03,
    weavePattern: 'twill',
  },
  rubberGrip: {
    name: 'Caoutchouc Grip',
    color: '#151518',
    roughness: 0.9,
    metalness: 0.0,
    normalScale: 0.4,
    displacementScale: 0.01,
    weavePattern: 'tight',
  },
  zipperMetal: {
    name: 'Zipper Métal',
    color: '#888890',
    roughness: 0.3,
    metalness: 0.95,
    normalScale: 0.3,
    displacementScale: 0.002,
    weavePattern: 'tight',
  },
  reflective: {
    name: 'Bande Réfléchissante',
    color: '#d0d0d5',
    roughness: 0.15,
    metalness: 0.1,
    normalScale: 0.2,
    displacementScale: 0.001,
    weavePattern: 'tight',
    emissive: '#444444',
    emissiveIntensity: 0.3,
  },
  foamPadding: {
    name: 'Mousse Padding',
    color: '#2a2a2e',
    roughness: 0.92,
    metalness: 0.0,
    normalScale: 0.5,
    displacementScale: 0.01,
    weavePattern: 'loose',
  },
};

// ----------------------------------------------------------------------------
// Générateur de textures procédurales
// ----------------------------------------------------------------------------

export class TextureGenerator {
  private width: number;
  private height: number;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(width: number = 2048, height: number = 2048) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Impossible de créer un contexte 2D canvas');
    }
    this.ctx = ctx;
  }

  /**
   * Génère une texture de couleur avec motif de tissage
   */
  generateFabricColor(
    baseColor: string,
    pattern: 'tight' | 'loose' | 'twill' | 'ripstop' | 'canvas' = 'tight'
  ): ImageData {
    const { width, height, ctx } = this;

    // Fond de base
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Parser la couleur de base
    const rgb = this.hexToRgb(baseColor);

    // Obtenir les données d'image pour manipulation pixel par pixel
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    switch (pattern) {
      case 'tight':
        this.applyTightWeave(data, rgb, width, height);
        break;
      case 'loose':
        this.applyLooseWeave(data, rgb, width, height);
        break;
      case 'twill':
        this.applyTwillWeave(data, rgb, width, height);
        break;
      case 'ripstop':
        this.applyRipstopWeave(data, rgb, width, height);
        break;
      case 'canvas':
        this.applyCanvasWeave(data, rgb, width, height);
        break;
    }

    // Ajouter du bruit subtil pour réalisme
    this.addNoise(data, 8, width, height);

    return imageData;
  }

  /**
   * Tissage serré - nylon standard
   */
  private applyTightWeave(
    data: Uint8ClampedArray,
    rgb: { r: number; g: number; b: number },
    w: number,
    h: number
  ): void {
    const threadSize = Math.max(2, Math.floor(w / 512));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const isHorizontalThread = y % (threadSize * 2) < threadSize;
        const isVerticalThread = x % (threadSize * 2) < threadSize;
        let variation = 0;

        if (isHorizontalThread && isVerticalThread) {
          variation = 5;
        } else if (isHorizontalThread || isVerticalThread) {
          variation = -3;
        } else {
          variation = -8;
        }

        // Ajouter variation subtile de teinte
        const microNoise = (Math.sin(x * 0.5) * Math.cos(y * 0.5)) * 2;

        data[idx] = Math.max(0, Math.min(255, rgb.r + variation + microNoise));
        data[idx + 1] = Math.max(0, Math.min(255, rgb.g + variation + microNoise));
        data[idx + 2] = Math.max(0, Math.min(255, rgb.b + variation + microNoise));
        data[idx + 3] = 255;
      }
    }
  }

  /**
   * Tissage lâche - mesh respirant
   */
  private applyLooseWeave(
    data: Uint8ClampedArray,
    rgb: { r: number; g: number; b: number },
    w: number,
    h: number
  ): void {
    const threadSize = Math.max(3, Math.floor(w / 256));
    const gapSize = Math.max(2, Math.floor(w / 384));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const cellX = x % (threadSize + gapSize);
        const cellY = y % (threadSize + gapSize);
        const isThread = cellX < threadSize && cellY < threadSize;

        if (isThread) {
          const centerOffsetX = Math.abs(cellX - threadSize / 2) / (threadSize / 2);
          const centerOffsetY = Math.abs(cellY - threadSize / 2) / (threadSize / 2);
          const roundness = 1 - Math.sqrt(centerOffsetX * centerOffsetX + centerOffsetY * centerOffsetY) * 0.3;
          const variation = Math.floor(roundness * 15) - 5;

          data[idx] = Math.max(0, Math.min(255, rgb.r + variation));
          data[idx + 1] = Math.max(0, Math.min(255, rgb.g + variation));
          data[idx + 2] = Math.max(0, Math.min(255, rgb.b + variation));
        } else {
          // Gap - plus sombre
          data[idx] = Math.max(0, rgb.r - 25);
          data[idx + 1] = Math.max(0, rgb.g - 25);
          data[idx + 2] = Math.max(0, rgb.b - 25);
        }
        data[idx + 3] = 255;
      }
    }
  }

  /**
   * Tissage twill - diagonal
   */
  private applyTwillWeave(
    data: Uint8ClampedArray,
    rgb: { r: number; g: number; b: number },
    w: number,
    h: number
  ): void {
    const threadSize = Math.max(3, Math.floor(w / 384));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const diagonal = (x + y) % (threadSize * 3);
        let variation = 0;

        if (diagonal < threadSize) {
          variation = 8; // Fil dessus
        } else if (diagonal < threadSize * 2) {
          variation = -2; // Transition
        } else {
          variation = -6; // Fil dessous
        }

        const microDetail = Math.sin(x * 0.8 + y * 0.3) * 2;

        data[idx] = Math.max(0, Math.min(255, rgb.r + variation + microDetail));
        data[idx + 1] = Math.max(0, Math.min(255, rgb.g + variation + microDetail));
        data[idx + 2] = Math.max(0, Math.min(255, rgb.b + variation + microDetail));
        data[idx + 3] = 255;
      }
    }
  }

  /**
   * Tissage ripstop - grille renforcée
   */
  private applyRipstopWeave(
    data: Uint8ClampedArray,
    rgb: { r: number; g: number; b: number },
    w: number,
    h: number
  ): void {
    const gridSpacing = Math.max(16, Math.floor(w / 128));
    const gridWidth = Math.max(1, Math.floor(w / 1024));
    const threadSize = Math.max(2, Math.floor(w / 512));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        // Base tissage serré
        const isHThread = y % (threadSize * 2) < threadSize;
        const isVThread = x % (threadSize * 2) < threadSize;
        let variation = 0;

        if (isHThread && isVThread) {
          variation = 3;
        } else if (isHThread || isVThread) {
          variation = -2;
        } else {
          variation = -5;
        }

        // Grille ripstop
        const isGridH = y % gridSpacing < gridWidth;
        const isGridV = x % gridSpacing < gridWidth;

        if (isGridH || isGridV) {
          variation += 10; // Fils renforcés plus brillants
        }

        data[idx] = Math.max(0, Math.min(255, rgb.r + variation));
        data[idx + 1] = Math.max(0, Math.min(255, rgb.g + variation));
        data[idx + 2] = Math.max(0, Math.min(255, rgb.b + variation));
        data[idx + 3] = 255;
      }
    }
  }

  /**
   * Tissage canvas - coton épais
   */
  private applyCanvasWeave(
    data: Uint8ClampedArray,
    rgb: { r: number; g: number; b: number },
    w: number,
    h: number
  ): void {
    const threadSize = Math.max(4, Math.floor(w / 256));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const cellX = x % (threadSize * 2);
        const cellY = y % (threadSize * 2);

        // Pattern de tissage canvas (plain weave plus épais)
        const isOver =
          (cellX < threadSize && cellY < threadSize) ||
          (cellX >= threadSize && cellY >= threadSize);

        let variation = isOver ? 6 : -4;

        // Fibres individuelles
        const fiberNoise =
          Math.sin(x * 2.5 + y * 0.3) * 3 +
          Math.cos(x * 0.2 + y * 3.1) * 2;
        variation += fiberNoise;

        data[idx] = Math.max(0, Math.min(255, rgb.r + variation));
        data[idx + 1] = Math.max(0, Math.min(255, rgb.g + variation));
        data[idx + 2] = Math.max(0, Math.min(255, rgb.b + variation));
        data[idx + 3] = 255;
      }
    }
  }

  /**
   * Génère une normal map pour tissu
   */
  generateFabricNormal(roughness: number = 0.6): ImageData {
    const { width, height, ctx } = this;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const threadScale = Math.max(2, Math.floor(width / 512));
    const intensity = roughness * 40;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Calcul des dérivées pour la normal map
        const dx = this.fabricHeightAt(x + 1, y, threadScale) -
                   this.fabricHeightAt(x - 1, y, threadScale);
        const dy = this.fabricHeightAt(x, y + 1, threadScale) -
                   this.fabricHeightAt(x, y - 1, threadScale);

        // Convertir en normal map (tangent space)
        // Normal = normalize(-dx, -dy, 1)
        const nx = -dx * intensity;
        const ny = -dy * intensity;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        // Encode en RGB [0,255] où 128 = 0.0
        data[idx] = Math.max(0, Math.min(255, ((nx / len) * 0.5 + 0.5) * 255));
        data[idx + 1] = Math.max(0, Math.min(255, ((ny / len) * 0.5 + 0.5) * 255));
        data[idx + 2] = Math.max(0, Math.min(255, ((nz / len) * 0.5 + 0.5) * 255));
        data[idx + 3] = 255;
      }
    }

    return imageData;
  }

  /**
   * Hauteur du tissu à une position (pour normal map)
   */
  private fabricHeightAt(x: number, y: number, threadScale: number): number {
    const w = this.width;
    // Wrap coordinates
    x = ((x % w) + w) % w;
    y = ((y % w) + w) % w;

    const cellX = x % (threadScale * 2);
    const cellY = y % (threadScale * 2);
    const isOver =
      (cellX < threadScale && cellY < threadScale) ||
      (cellX >= threadScale && cellY >= threadScale);

    let height = isOver ? 1.0 : 0.0;

    // Micro-détails
    height += Math.sin(x * 0.5) * 0.1;
    height += Math.cos(y * 0.5) * 0.1;
    height += (this.pseudoRandom(x, y) - 0.5) * 0.05;

    return height;
  }

  /**
   * Génère une roughness map
   */
  generateRoughnessMap(baseRoughness: number = 0.7): ImageData {
    const { width, height, ctx } = this;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const baseValue = Math.floor(baseRoughness * 255);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Variation de rugosité
        const noise1 = Math.sin(x * 0.02 + y * 0.03) * 15;
        const noise2 = Math.cos(x * 0.05 - y * 0.02) * 8;
        const microNoise = (this.pseudoRandom(x, y) - 0.5) * 20;

        const value = Math.max(0, Math.min(255, baseValue + noise1 + noise2 + microNoise));

        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }

    return imageData;
  }

  /**
   * Génère une ambient occlusion map
   */
  generateAOMap(): ImageData {
    const { width, height, ctx } = this;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // AO globale - plus sombre dans les creux
        const threadScale = Math.max(2, Math.floor(width / 512));
        const cellX = x % (threadScale * 2);
        const cellY = y % (threadScale * 2);

        // Distance au centre de la cellule
        const cx = threadScale;
        const cy = threadScale;
        const dist = Math.sqrt(
          Math.pow(cellX - cx, 2) + Math.pow(cellY - cy, 2)
        ) / (threadScale * 1.4);

        // Plus sombre aux bords des fils
        const ao = Math.max(0.6, 1.0 - dist * 0.3);
        const noiseAO = (this.pseudoRandom(x * 3, y * 7) - 0.5) * 0.05;

        const value = Math.max(0, Math.min(255, (ao + noiseAO) * 255));

        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }

    return imageData;
  }

  /**
   * Génère une metalness map
   */
  generateMetalnessMap(baseMetalness: number = 0.0): ImageData {
    const { width, height, ctx } = this;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const baseValue = Math.floor(baseMetalness * 255);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Variation subtile de metalness
        const noise = (this.pseudoRandom(x * 2, y * 3) - 0.5) * 10;
        const value = Math.max(0, Math.min(255, baseValue + noise));

        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }

    return imageData;
  }

  /**
   * Ajouter du bruit aux données d'image
   */
  private addNoise(
    data: Uint8ClampedArray,
    intensity: number,
    w: number,
    h: number
  ): void {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const noise = (this.pseudoRandom(x * 13, y * 37) - 0.5) * intensity * 2;
        data[idx] = Math.max(0, Math.min(255, data[idx] + noise));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise));
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise));
      }
    }
  }

  /**
   * Pseudo-random déterministe basé sur coordonnées
   */
  private pseudoRandom(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Convertir hex en RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace('#', '');
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }

  /**
   * Convertir ImageData en THREE.Texture
   */
  imageDataToTexture(imageData: ImageData): THREE.Texture {
    this.ctx.putImageData(imageData, 0, 0);

    const clonedCanvas = document.createElement('canvas');
    clonedCanvas.width = this.width;
    clonedCanvas.height = this.height;
    const clonedCtx = clonedCanvas.getContext('2d');
    if (clonedCtx) {
      clonedCtx.drawImage(this.canvas, 0, 0);
    }

    const texture = new THREE.CanvasTexture(clonedCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 16;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Canvas sera garbage collecté
  }
}

// ----------------------------------------------------------------------------
// Créateur de matériaux
// ----------------------------------------------------------------------------

export class BackpackMaterialCreator {
  private textureWidth: number;
  private textureHeight: number;
  private generator: TextureGenerator;
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private textureCache: Map<string, GeneratedTextures> = new Map();

  constructor(textureWidth: number = 2048, textureHeight: number = 2048) {
    this.textureWidth = textureWidth;
    this.textureHeight = textureHeight;
    this.generator = new TextureGenerator(textureWidth, textureHeight);
  }

  /**
   * Créer un matériau à partir d'une config prédéfinie
   */
  createMaterial(config: MaterialConfig): THREE.MeshStandardMaterial {
    // Vérifier le cache
    if (this.materialCache.has(config.name)) {
      return this.materialCache.get(config.name)!.clone();
    }

    // Générer les textures
    const textures = this.generateTextures(config);

    // Créer le matériau PBR
    const material = new THREE.MeshStandardMaterial({
      map: textures.map,
      normalMap: textures.normalMap,
      normalScale: new THREE.Vector2(config.normalScale, config.normalScale),
      roughnessMap: textures.roughnessMap,
      roughness: config.roughness,
      metalnessMap: textures.metalnessMap,
      metalness: config.metalness,
      aoMap: textures.aoMap,
      aoMapIntensity: 1.0,
      envMapIntensity: 0.8,
      side: config.side || THREE.FrontSide,
      transparent: config.transparent || false,
      opacity: config.opacity !== undefined ? config.opacity : 1.0,
    });

    // Émissif (pour bandes réfléchissantes)
    if (config.emissive) {
      material.emissive = new THREE.Color(config.emissive);
      material.emissiveIntensity = config.emissiveIntensity || 0.1;
    }

    // Mettre en cache
    this.materialCache.set(config.name, material);

    return material;
  }

  /**
   * Créer un matériau personnalisé
   */
  createCustomMaterial(
    name: string,
    color: string = '#333333',
    roughness: number = 0.7,
    metalness: number = 0.1,
    weavePattern: MaterialConfig['weavePattern'] = 'tight'
  ): THREE.MeshStandardMaterial {
    const config: MaterialConfig = {
      name,
      color,
      roughness,
      metalness,
      normalScale: 1.0,
      displacementScale: 0.02,
      weavePattern,
    };

    return this.createMaterial(config);
  }

  /**
   * Créer un matériau simple (sans textures, pour performance)
   */
  createSimpleMaterial(
    color: string,
    roughness: number = 0.7,
    metalness: number = 0.0
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness,
      side: THREE.FrontSide,
    });
  }

  /**
   * Générer toutes les textures pour un matériau
   */
  private generateTextures(config: MaterialConfig): GeneratedTextures {
    const cacheKey = `${config.name}_${config.color}_${config.weavePattern}`;

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const gen = this.generator;
    const pattern = config.weavePattern || 'tight';

    // Générer chaque texture
    const colorData = gen.generateFabricColor(config.color, pattern);
    const normalData = gen.generateFabricNormal(config.roughness);
    const roughnessData = gen.generateRoughnessMap(config.roughness);
    const aoData = gen.generateAOMap();
    const metalnessData = gen.generateMetalnessMap(config.metalness);

    // Convertir en textures Three.js
    const textures: GeneratedTextures = {
      map: gen.imageDataToTexture(colorData),
      normalMap: gen.imageDataToTexture(normalData),
      roughnessMap: gen.imageDataToTexture(roughnessData),
      aoMap: gen.imageDataToTexture(aoData),
      displacementMap: null, // Optionnel pour performance
      metalnessMap: gen.imageDataToTexture(metalnessData),
    };

    // Configurer les UV repeat pour chaque texture
    const repeatX = 4;
    const repeatY = 4;
    Object.values(textures).forEach((tex) => {
      if (tex) {
        tex.repeat.set(repeatX, repeatY);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
      }
    });

    this.textureCache.set(cacheKey, textures);

    return textures;
  }

  /**
   * Obtenir le matériau principal selon la couleur
   */
  getMainFabricMaterial(
    color: 'black' | 'grey' | 'red' | 'green' | string
  ): THREE.MeshStandardMaterial {
    switch (color) {
      case 'black':
        return this.createMaterial(BACKPACK_MATERIALS.nylonBlackTight);
      case 'grey':
        return this.createMaterial(BACKPACK_MATERIALS.nylonGrey);
      case 'red':
        return this.createMaterial(BACKPACK_MATERIALS.corduraRed);
      case 'green':
        return this.createMaterial(BACKPACK_MATERIALS.polyesterVert);
      default:
        // Couleur personnalisée
        return this.createCustomMaterial('Custom', color, 0.7, 0.05, 'tight');
    }
  }

  /**
   * Set complet de matériaux pour un sac à dos
   */
  createBackpackMaterialSet(mainColor: string = 'black'): {
    main: THREE.MeshStandardMaterial;
    secondary: THREE.MeshStandardMaterial;
    mesh: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial;
    zipper: THREE.MeshStandardMaterial;
    webbing: THREE.MeshStandardMaterial;
    leather: THREE.MeshStandardMaterial;
    foam: THREE.MeshStandardMaterial;
    rubber: THREE.MeshStandardMaterial;
    reflective: THREE.MeshStandardMaterial;
  } {
    return {
      main: this.getMainFabricMaterial(mainColor),
      secondary: this.createMaterial(BACKPACK_MATERIALS.nylonGrey),
      mesh: this.createMaterial(BACKPACK_MATERIALS.meshBlack),
      metal: this.createMaterial(BACKPACK_MATERIALS.aluminiumBrush),
      zipper: this.createMaterial(BACKPACK_MATERIALS.zipperMetal),
      webbing: this.createMaterial(BACKPACK_MATERIALS.webbing),
      leather: this.createMaterial(BACKPACK_MATERIALS.syntheticLeather),
      foam: this.createMaterial(BACKPACK_MATERIALS.foamPadding),
      rubber: this.createMaterial(BACKPACK_MATERIALS.rubberGrip),
      reflective: this.createMaterial(BACKPACK_MATERIALS.reflective),
    };
  }

  /**
   * Nettoyer toutes les ressources
   */
  dispose(): void {
    this.materialCache.forEach((mat) => {
      if (mat.map) mat.map.dispose();
      if (mat.normalMap) mat.normalMap.dispose();
      if (mat.roughnessMap) mat.roughnessMap.dispose();
      if (mat.aoMap) mat.aoMap.dispose();
      if (mat.metalnessMap) mat.metalnessMap.dispose();
      if (mat.displacementMap) mat.displacementMap.dispose();
      mat.dispose();
    });
    this.materialCache.clear();

    this.textureCache.forEach((texSet) => {
      Object.values(texSet).forEach((tex) => {
        if (tex) tex.dispose();
      });
    });
    this.textureCache.clear();

    this.generator.dispose();
  }
}