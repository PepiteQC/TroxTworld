/**
 * ═══════════════════════════════════════════════════════════════════
 * 🍁 SYSTÈME ACÉRICOLE AVANCÉ — ÉRABLIÈRES DU COMTÉ (v4.0)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Fonctionnalités PREMIUM ajoutées :
 *   ✅ Variations procédurales (tailles/formes d'érables aléatoires)
 *   ✅ Système de particules Three.js pour la vapeur
 *   ✅ Audio spatialisé PositionalAudio (bouillonnement 3D)
 *   ✅ Détails saisonniers (neige sur branches, feuilles qui tombent)
 *   + Toutes les fonctionnalités v3.0 (qualité, LOD, événements, etc.)
 * 
 * Compatible Three.js r150+ / Colyseus / TypeScript 6+
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { buildCabaneSucre } from "./architecture";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { getTerrainHeight } from "./worlddata";
import { quebecSeasons, type QuebecSeason } from "./seasons";

// ═══════════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTES
// ═══════════════════════════════════════════════════════════

export const SUGAR_CONFIG = {
  // Production
  SAP_PER_SYRUP: 4,
  TAP_REFILL_SECONDS: 14,
  EVAP_BOIL_SECONDS: 6,
  MAX_SAP_PER_TAP: 1,
  
  // Qualité du sirop
  SYRUP_QUALITIES: {
    GOLDEN: { id: "sirop_dore", name: "Sirop doré", chance: 0.6, value: 1.0 },
    AMBER: { id: "sirop_ambre", name: "Sirop ambré", chance: 0.3, value: 1.2 },
    DARK: { id: "sirop_fonce", name: "Sirop foncé", chance: 0.1, value: 1.5 },
  },
  
  // Saisons & Météo
  SEASON_MULTIPLIERS: {
    printemps: 1.0,
    ete: 0.3,
    automne: 0.5,
    hiver: 0.8,
  },
  WEATHER_EFFECTS: {
    rain: 1.2,
    snow: 0.9,
    clear: 1.0,
    storm: 0.7,
    poudrerie: 0.6,
    polaire: 0.5,
    verglas: 0.4,
    ensoleille: 1.1,
    nuageux: 0.95,
    brouillard: 0.85,
  } as Record<string, number>,
  
  // Performance
  LOD_DISTANCE: { HIGH: 25, MEDIUM: 50, LOW: 100 },
  TICK_RATE_MS: 1000,
  
  // Audio
  SOUNDS: {
    tap_collect: "sfx/sap_collect",
    evap_boil: "sfx/evaporator_loop",
    syrup_ready: "sfx/syrup_complete",
  },
  
  // ═══════════════════════════════════════════════════════════
  // NOUVEAU v4.0 — CONFIGURATION DES DÉTAILS
  // ═══════════════════════════════════════════════════════════
  
  // Variations procédurales
  PROCEDURAL: {
    TRUNK_RADIUS_MIN: 0.18,
    TRUNK_RADIUS_MAX: 0.28,
    TRUNK_HEIGHT_MIN: 4.2,
    TRUNK_HEIGHT_MAX: 5.2,
    CANOPY_SIZE_MIN: 1.8,
    CANOPY_SIZE_MAX: 2.5,
    BRANCH_ANGLE_VARIATION: 0.15, // Radians
  },
  
  // Particules de vapeur
  PARTICLES: {
    STEAM_COUNT: 24, // Nombre de particules par évaporateur
    STEAM_SIZE_MIN: 0.15,
    STEAM_SIZE_MAX: 0.35,
    STEAM_RISE_SPEED: 0.8,
    STEAM_LIFETIME: 3.0, // Secondes
    STEAM_SPREAD: 0.6, // Dispersion horizontale
  },
  
  // Particules de feuilles (automne)
  LEAVES: {
    COUNT_PER_TREE: 8,
    FALL_SPEED: 0.3,
    SWAY_AMPLITUDE: 0.4,
    SWAY_FREQUENCY: 1.2,
    LIFETIME: 6.0,
  },
  
  // Neige sur les branches
  SNOW: {
    LAYER_THICKNESS: 0.08,
    COVERAGE_CHANCE: 0.7, // 70% des branches enneigées
    MELT_TEMP_CELSIUS: 2, // Fonte au-dessus de 2°C
  },
  
  // Audio
  AUDIO: {
    EVAP_BOIL_VOLUME: 0.6,
    EVAP_BOIL_PITCH: 1.0,
    MAX_DISTANCE: 25, // Portée de l'audio
    ROLLOFF_FACTOR: 1.2, // Atténuation avec distance
  },
} as const;

// ═══════════════════════════════════════════════════════════
// TYPES & ÉNUMÉRATIONS
// ═══════════════════════════════════════════════════════════

export type SyrupQuality = keyof typeof SUGAR_CONFIG.SYRUP_QUALITIES;

export interface SugarTapState {
  sapAmount: number;
  lastCollectedAt: number;
  qualityBonus: number;
  isFrozen: boolean;
  treeSeed: number; // Seed pour variations procédurales
}

export interface SugarEvapState {
  sapBuffer: number;
  isBoiling: boolean;
  boilProgress: number;
  lastBoilAt: number;
  syrupQuality?: SyrupQuality;
  audioPlaying: boolean;
}

export interface SugarBushStats {
  totalSapCollected: number;
  totalSyrupProduced: number;
  bestQualityStreak: number;
  lastProductionAt?: number;
}

export interface SugarBushData {
  id: string;
  name: string;
  village: string;
  worldX: number;
  worldZ: number;
  yaw: number;
  tapPositions: Array<[number, number]>;
  evapOffset: [number, number];
  woodpileOffset: [number, number];
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILITÉ LEGACY — Alias pour les anciens modules
// ─────────────────────────────────────────────────────────────────────────────

export type SugarTap = SugarTapInstance;
export type SugarEvap = SugarEvapInstance;
export type SugarBush = SugarBushInstance;

export const SAP_PER_SYRUP = SUGAR_CONFIG.SAP_PER_SYRUP;

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PARTICULES (NOUVEAU v4.0)
// ═══════════════════════════════════════════════════════════

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  size: number;
  active: boolean;
}

class ParticleSystem {
  private particles: Particle[];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;
  
  constructor(count: number, color: number) {
    this.particles = [];
    
    // Initialisation des particules
    for (let i = 0; i < count; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: SUGAR_CONFIG.PARTICLES.STEAM_LIFETIME,
        size: THREE.MathUtils.randFloat(
          SUGAR_CONFIG.PARTICLES.STEAM_SIZE_MIN,
          SUGAR_CONFIG.PARTICLES.STEAM_SIZE_MAX
        ),
        active: false,
      });
    }
    
    // Buffers pour BufferGeometry
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
    this.material = new THREE.PointsMaterial({
      color,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.positions = positions;
    this.sizes = sizes;
    this.opacities = opacities;
  }
  
  public getMesh(): THREE.Points {
    return this.points;
  }
  
  public emit(origin: THREE.Vector3, count: number): void {
    let emitted = 0;
    for (const p of this.particles) {
      if (!p.active && emitted < count) {
        p.position.copy(origin);
        p.position.x += THREE.MathUtils.randFloatSpread(SUGAR_CONFIG.PARTICLES.STEAM_SPREAD);
        p.position.z += THREE.MathUtils.randFloatSpread(SUGAR_CONFIG.PARTICLES.STEAM_SPREAD);
        
        p.velocity.set(
          THREE.MathUtils.randFloatSpread(0.02),
          THREE.MathUtils.randFloat(0.3, 0.6) * SUGAR_CONFIG.PARTICLES.STEAM_RISE_SPEED,
          THREE.MathUtils.randFloatSpread(0.02)
        );
        
        p.lifetime = 0;
        p.active = true;
        emitted++;
      }
    }
  }
  
  public update(deltaTime: number): void {
    let activeCount = 0;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      if (p.active) {
        p.lifetime += deltaTime;
        
        if (p.lifetime >= p.maxLifetime) {
          p.active = false;
          continue;
        }
        
        // Mise à jour position
        p.position.addScaledVector(p.velocity, deltaTime);
        
        // Vent léger
        p.position.x += Math.sin(p.lifetime * 2) * 0.01;
        p.position.z += Math.cos(p.lifetime * 1.5) * 0.01;
        
        // Taille décroissante
        const lifeRatio = 1 - (p.lifetime / p.maxLifetime);
        p.size *= 0.98;
        
        // Opacité décroissante
        const opacity = lifeRatio * 0.6;
        
        this.positions[i * 3] = p.position.x;
        this.positions[i * 3 + 1] = p.position.y;
        this.positions[i * 3 + 2] = p.position.z;
        this.sizes[i] = p.size;
        this.opacities[i] = opacity;
        
        activeCount++;
      }
    }
    
    // Mise à jour des buffers
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.opacity.needsUpdate = true;
  }
  
  public setActive(active: boolean): void {
    this.points.visible = active;
  }
  
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE FEUILLES D'AUTOMNE (NOUVEAU v4.0)
// ═══════════════════════════════════════════════════════════

class LeafParticleSystem {
  private leaves: Particle[];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  
  constructor(treePosition: THREE.Vector3, treeHeight: number) {
    this.leaves = [];
    const count = SUGAR_CONFIG.LEAVES.COUNT_PER_TREE;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = THREE.MathUtils.randFloat(0.5, 2.0);
      
      this.leaves.push({
        position: new THREE.Vector3(
          treePosition.x + Math.cos(angle) * radius,
          treePosition.y + THREE.MathUtils.randFloat(treeHeight * 0.3, treeHeight),
          treePosition.z + Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(),
        lifetime: THREE.MathUtils.randFloat(0, SUGAR_CONFIG.LEAVES.LIFETIME),
        maxLifetime: SUGAR_CONFIG.LEAVES.LIFETIME,
        size: THREE.MathUtils.randFloat(0.08, 0.15),
        active: true,
      });
    }
    
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Couleurs d'automne
    const autumnColors = [
      new THREE.Color(0xc45a28),
      new THREE.Color(0xd47830),
      new THREE.Color(0xb84820),
      new THREE.Color(0x8a6a30),
    ];
    
    for (let i = 0; i < count; i++) {
      const color = autumnColors[i % autumnColors.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    this.material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.positions = positions;
    this.colors = colors;
  }
  
  public getMesh(): THREE.Points {
    return this.points;
  }
  
  public update(deltaTime: number, windDirection: number): void {
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      
      leaf.lifetime += deltaTime;
      
      // Chute
      leaf.velocity.y = -SUGAR_CONFIG.LEAVES.FALL_SPEED;
      
      // Oscillation
      leaf.position.x += Math.sin(leaf.lifetime * SUGAR_CONFIG.LEAVES.SWAY_FREQUENCY + i) 
        * SUGAR_CONFIG.LEAVES.SWAY_AMPLITUDE * deltaTime;
      leaf.position.z += Math.cos(leaf.lifetime * SUGAR_CONFIG.LEAVES.SWAY_FREQUENCY + i * 0.5) 
        * SUGAR_CONFIG.LEAVES.SWAY_AMPLITUDE * deltaTime;
      
      // Vent
      leaf.position.x += Math.sin(windDirection + leaf.lifetime) * 0.02 * deltaTime;
      
      leaf.position.addScaledVector(leaf.velocity, deltaTime);
      
      // Reset si au sol
      if (leaf.position.y < 0) {
        leaf.position.y = 0;
        leaf.velocity.set(0, 0, 0);
      }
      
      this.positions[i * 3] = leaf.position.x;
      this.positions[i * 3 + 1] = leaf.position.y;
      this.positions[i * 3 + 2] = leaf.position.z;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
  }
  
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME D'ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════

export type SugarEventCallback<T = unknown> = (data: T) => void;

export interface SugarEvents {
  onSapCollected: (data: { tapId: string; bushId: string; amount: number }) => void;
  onSyrupProduced: (data: { evapId: string; bushId: string; quality: SyrupQuality; amount: number }) => void;
  onBushActivated: (data: { bushId: string; playerId: string }) => void;
  onSeasonChanged: (data: { season: QuebecSeason; multiplier: number }) => void;
}

class SugarEventEmitter {
  private listeners = new Map<keyof SugarEvents, Set<SugarEventCallback>>();

  public on<K extends keyof SugarEvents>(event: K, callback: SugarEvents[K]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as SugarEventCallback);
    return () => this.listeners.get(event)?.delete(callback as SugarEventCallback);
  }

  public emit<K extends keyof SugarEvents>(event: K, data: Parameters<SugarEvents[K]>[0]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          (cb as SugarEventCallback)(data);
        } catch (err) {
          console.error(`[SugarSystem] Event listener error for ${event}:`, err);
        }
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// CLASSE PRINCIPALE : SugarSystem
// ═══════════════════════════════════════════════════════════

export class SugarSystem {
  private bushes = new Map<string, SugarBushInstance>();
  private tapStates = new Map<string, SugarTapState>();
  private evapStates = new Map<string, SugarEvapState>();
  private bushStats = new Map<string, SugarBushStats>();
  
  private eventEmitter = new SugarEventEmitter();
  private lastTickTime = 0;
  
  private camera?: THREE.Camera;
  private materialCache = new Map<string, THREE.Material>();
  
  // ═══════════════════════════════════════════════════════════
  // NOUVEAU v4.0 — AUDIO & PARTICULES
  // ═══════════════════════════════════════════════════════════
  
  private audioListener?: THREE.AudioListener;
  private evapSounds = new Map<string, THREE.PositionalAudio>();
  private steamParticles = new Map<string, ParticleSystem>();
  private leafParticles = new Map<string, LeafParticleSystem[]>();
  
  // Listener audio unique
  private static globalAudioListener?: THREE.AudioListener;
  
  public static getAudioListener(): THREE.AudioListener {
    if (!SugarSystem.globalAudioListener) {
      SugarSystem.globalAudioListener = new THREE.AudioListener();
    }
    return SugarSystem.globalAudioListener;
  }

  constructor() {
    this.initMaterialCache();
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════════════════════════

  private initMaterialCache(): void {
    const colors = [0x4a3020, 0xc45a28, 0xd47830, 0xb84820, 0x8a8a82, 0x9aa0a4, 0xe8d8a8, 0x7a4438, 0xe07020, 0xb8bcc0, 0x8a4a18, 0xe8ece8];
    colors.forEach((color) => {
      const key = `mat_${color}`;
      if (!this.materialCache.has(key)) {
        this.materialCache.set(key, matLib.get(color, 0.92, 0));
      }
    });
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public setAudioListener(listener: THREE.AudioListener): void {
    this.audioListener = listener;
  }

  public on<K extends keyof SugarEvents>(event: K, callback: SugarEvents[K]): () => void {
    return this.eventEmitter.on(event, callback);
  }

  // ═══════════════════════════════════════════════════════════
  // DONNÉES DES ÉRABLIÈRES
  // ═══════════════════════════════════════════════════════════

  private readonly BUSH_DEFINITIONS: SugarBushData[] = [
    {
      id: "erable_alban",
      name: "Érablière du Trou-du-Diable",
      village: "Saint-Alban",
      worldX: -780,
      worldZ: -640,
      yaw: 0.35,
      tapPositions: [[-16, -8], [-10, -14], [-2, -18], [8, -16], [16, -10], [18, 0], [14, 10], [-18, 4], [-14, 12], [4, -22]],
      evapOffset: [0, 8.2],
      woodpileOffset: [-6.2, 6.4],
    },
    {
      id: "erable_casimir",
      name: "Érablière de la Gorge",
      village: "Saint-Casimir",
      worldX: -1040,
      worldZ: -420,
      yaw: -0.2,
      tapPositions: [[-16, -8], [-10, -14], [-2, -18], [8, -16], [16, -10], [18, 0], [14, 10], [-18, 4], [-14, 12], [4, -22]],
      evapOffset: [0, 8.2],
      woodpileOffset: [-6.2, 6.4],
    },
    {
      id: "erable_raymond",
      name: "Érablière des Laurentides",
      village: "Saint-Raymond",
      worldX: 820,
      worldZ: -780,
      yaw: 0.55,
      tapPositions: [[-16, -8], [-10, -14], [-2, -18], [8, -16], [16, -10], [18, 0], [14, 10], [-18, 4], [-14, 12], [4, -22]],
      evapOffset: [0, 8.2],
      woodpileOffset: [-6.2, 6.4],
    },
    {
      id: "erable_basile",
      name: "Érablière de la rivière Portneuf",
      village: "Saint-Basile",
      worldX: 280,
      worldZ: -440,
      yaw: 0.15,
      tapPositions: [[-16, -8], [-10, -14], [-2, -18], [8, -16], [16, -10], [18, 0], [14, 10], [-18, 4], [-14, 12], [4, -22]],
      evapOffset: [0, 8.2],
      woodpileOffset: [-6.2, 6.4],
    },
    {
      id: "erable_collines",
      name: "Érablière des Collines",
      village: "Saint-Alban",
      worldX: -250,
      worldZ: -720,
      yaw: -0.4,
      tapPositions: [[-16, -8], [-10, -14], [-2, -18], [8, -16], [16, -10], [18, 0], [14, 10], [-18, 4], [-14, 12], [4, -22]],
      evapOffset: [0, 8.2],
      woodpileOffset: [-6.2, 6.4],
    },
  ];

  // ═══════════════════════════════════════════════════════════
  // CONSTRUCTION VISUELLE AVEC VARIATIONS PROCÉDURALES
  // ═══════════════════════════════════════════════════════════

  private farmToWorld(bush: SugarBushData, ox: number, oz: number): { x: number; z: number } {
    return {
      x: bush.worldX + Math.cos(bush.yaw) * ox - Math.sin(bush.yaw) * oz,
      z: bush.worldZ + Math.sin(bush.yaw) * ox + Math.cos(bush.yaw) * oz,
    };
  }

  /**
   * NOUVEAU v4.0 — Érable avec variations procédurales
   */
  private buildSugarMaple(seed: number): { 
    group: THREE.Group; 
    sapMesh: THREE.Mesh;
    snowMeshes: THREE.Mesh[];
  } {
    const g = new THREE.Group();
    g.name = "erable_entaillé";
    
    // ═══════════════════════════════════════════════════════════
    // VARIATIONS PROCÉDURALES BASÉES SUR LE SEED
    // ═══════════════════════════════════════════════════════════
    const seedNum = seed ? parseInt(seed.toString(), 36) || 0 : Date.now();
const random = {
  random: () => {
    const x = Math.sin(seedNum + Math.random() * 1000) * 10000;
    return x - Math.floor(x);
  }
};
    const trunkRadius = THREE.MathUtils.lerp(
      SUGAR_CONFIG.PROCEDURAL.TRUNK_RADIUS_MIN,
      SUGAR_CONFIG.PROCEDURAL.TRUNK_RADIUS_MAX,
      random.random()
    );
    const trunkHeight = THREE.MathUtils.lerp(
      SUGAR_CONFIG.PROCEDURAL.TRUNK_HEIGHT_MIN,
      SUGAR_CONFIG.PROCEDURAL.TRUNK_HEIGHT_MAX,
      random.random()
    );
    const canopySize = THREE.MathUtils.lerp(
      SUGAR_CONFIG.PROCEDURAL.CANOPY_SIZE_MIN,
      SUGAR_CONFIG.PROCEDURAL.CANOPY_SIZE_MAX,
      random.random()
    );
    const branchVariation = (random.random() - 0.5) * SUGAR_CONFIG.PROCEDURAL.BRANCH_ANGLE_VARIATION;
    
    // Matériaux avec cache
    const barkMat = this.getMaterial(0x4a3020, 0.95, 0);
    const autumnColors = [0xc45a28, 0xd47830, 0xb84820];
    const autumnMat = this.getMaterial(autumnColors[Math.floor(random.random() * 3)], 0.92, 0);
    const metalMat = this.getMaterial(0x8a8a82, 0.4, 0.7);
    const bucketMat = this.getMaterial(0x9aa0a4, 0.35, 0.65);
    const sapMat = this.getMaterial(0xe8d8a8, 0.18, 0.08);
    const snowMat = this.getMaterial(0xffffff, 0.9, 0.1);

    // Tronc avec variation
    const trunk = new THREE.Mesh(
      getGeo("cylinder", { r: trunkRadius, r2: trunkRadius * 1.3, h: trunkHeight, seg: 7 }),
      barkMat
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.userData.treeSeed = seed;
    g.add(trunk);

    // Canopée principale avec taille variable
    const canopy = new THREE.Mesh(
      getGeo("sphere", { r: canopySize, seg: 8, segH: 6 }),
      autumnMat
    );
    canopy.position.y = trunkHeight + canopySize * 0.6;
    canopy.castShadow = true;
    canopy.userData.baseScale = canopySize / 2.15; // Pour LOD
    g.add(canopy);

    // Canopée secondaire avec angle varié
    const blob = new THREE.Mesh(
      getGeo("sphere", { r: canopySize * 0.6, seg: 7, segH: 5 }),
      autumnMat
    );
    blob.position.set(
      0.65 + branchVariation,
      trunkHeight + canopySize * 0.3,
      0.28 + branchVariation
    );
    blob.userData.baseScale = canopySize / 2.15;
    g.add(blob);

    // Entaille (spout)
    const spout = new THREE.Mesh(
      getGeo("cylinder", { r: 0.03, r2: 0.03, h: 0.3, seg: 5 }),
      metalMat
    );
    spout.rotation.z = Math.PI / 2;
    spout.position.set(0.38, trunkHeight * 0.25, 0);
    g.add(spout);

    // Seau
    const bucket = new THREE.Mesh(
      getGeo("cylinder", { r: 0.16, r2: 0.14, h: 0.32, seg: 8 }),
      bucketMat
    );
    bucket.position.set(0.54, trunkHeight * 0.2, 0);
    bucket.castShadow = true;
    bucket.name = "bucket";
    g.add(bucket);

    // Niveau de sève
    const sap = new THREE.Mesh(
      getGeo("cylinder", { r: 0.12, r2: 0.12, h: 0.1, seg: 8 }),
      sapMat
    );
    sap.position.set(0.54, trunkHeight * 0.18, 0);
    sap.name = "sap";
    sap.visible = false;
    g.add(sap);

    // ═══════════════════════════════════════════════════════════
    // NEIGE SUR LES BRANCHES (NOUVEAU v4.0)
    // ═══════════════════════════════════════════════════════════
    const snowMeshes: THREE.Mesh[] = [];
    
    // Couche de neige sur la canopée
    if (random.random() < SUGAR_CONFIG.SNOW.COVERAGE_CHANCE) {
      const snowCap = new THREE.Mesh(
        getGeo("sphere", { r: canopySize * 1.02, seg: 8, segH: 4 }),
        snowMat
      );
      snowCap.position.y = canopy.position.y + canopySize * 0.3;
      snowCap.scale.y = 0.3; // Aplatir pour faire une couche
      snowCap.name = "snow_cap";
      snowCap.visible = false; // Activé seulement en hiver
      g.add(snowCap);
      snowMeshes.push(snowCap);
    }
    
    // Petites accumulations sur branches secondaires
    if (random.random() < SUGAR_CONFIG.SNOW.COVERAGE_CHANCE) {
      const snowBlob = new THREE.Mesh(
        getGeo("sphere", { r: canopySize * 0.5, seg: 6, segH: 3 }),
        snowMat
      );
      snowBlob.position.copy(blob.position);
      snowBlob.position.y += canopySize * 0.2;
      snowBlob.scale.y = 0.4;
      snowBlob.name = "snow_blob";
      snowBlob.visible = false;
      g.add(snowBlob);
      snowMeshes.push(snowBlob);
    }

    // Données pour LOD
    g.userData = {
      lodLevel: "HIGH",
      distance: 0,
      canopy,
      blob,
      sap,
      snowMeshes,
      treeSeed: seed,
      trunkHeight,
      canopySize,
    };

    return { group: g, sapMesh: sap, snowMeshes };
  }

  /**
   * NOUVEAU v4.0 — Évaporateur avec particules de vapeur
   */
  private buildEvaporator(bushId: string): { 
    group: THREE.Group; 
    steam: THREE.Mesh[];
    particleSystem?: ParticleSystem;
  } {
    const g = new THREE.Group();
    g.name = "evaporateur";
    
    const brickMat = this.getMaterial(0x7a4438, 0.92, 0);
    const darkMat = this.getMaterial(0x1a1210, 0.95, 0);
    const glowMat = this.getMaterial(0xe07020, 0.4, 0.2);
    const panMat = this.getMaterial(0xb8bcc0, 0.28, 0.72);
    const syrupMat = this.getMaterial(0x8a4a18, 0.22, 0.12);
    const steamMat = this.getMaterial(0xe8ece8, 0.85, 0);

    // Base en brique
    const box = new THREE.Mesh(getGeo("box", { w: 2.8, h: 0.9, d: 1.65 }), brickMat);
    box.position.y = 0.45;
    box.castShadow = true;
    g.add(box);

    // Ouverture du foyer
    const mouth = new THREE.Mesh(getGeo("box", { w: 0.7, h: 0.38, d: 0.12 }), darkMat);
    mouth.position.set(0, 0.32, 0.88);
    g.add(mouth);

    // Lueur du feu
    const glow = new THREE.Mesh(getGeo("box", { w: 0.48, h: 0.18, d: 0.06 }), glowMat);
    glow.position.set(0, 0.3, 0.94);
    glow.name = "fire_glow";
    g.add(glow);

    // Bac d'évaporation
    const pan = new THREE.Mesh(getGeo("box", { w: 2.55, h: 0.12, d: 1.4 }), panMat);
    pan.position.y = 0.98;
    g.add(pan);

    // Niveau de sirop
    const syrup = new THREE.Mesh(getGeo("box", { w: 2.25, h: 0.05, d: 1.15 }), syrupMat);
    syrup.position.y = 1.04;
    syrup.name = "syrup_level";
    syrup.visible = false;
    g.add(syrup);

    // ═══════════════════════════════════════════════════════════
    // ANCIEN SYSTÈME (gardé pour compatibilité)
    // ═══════════════════════════════════════════════════════════
    const steam: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(getGeo("sphere", { r: 0.22, seg: 5, segH: 4 }), steamMat);
      puff.position.set((i - 1.5) * 0.45, 1.35, 0);
      puff.userData = { phase: i * 0.7, baseY: 1.35 };
      puff.name = `steam_${i}`;
      puff.visible = false;
      g.add(puff);
      steam.push(puff);
    }

    // ═══════════════════════════════════════════════════════════
    // NOUVEAU v4.0 — SYSTÈME DE PARTICULES DE VAPEUR
    // ═══════════════════════════════════════════════════════════
    const particleSystem = new ParticleSystem(
      SUGAR_CONFIG.PARTICLES.STEAM_COUNT,
      0xe8ece8
    );
    particleSystem.getMesh().position.y = 1.35;
    particleSystem.getMesh().name = "steam_particles";
    particleSystem.getMesh().visible = false;
    g.add(particleSystem.getMesh());
    
    this.steamParticles.set(bushId, particleSystem);

    return { group: g, steam, particleSystem };
  }

  private buildWoodpile(): THREE.Group {
    const g = new THREE.Group();
    const woodMat = this.getMaterial(0x6a4a32, 0.92, 0);
    const logGeo = getGeo("cylinder", { r: 0.12, r2: 0.13, h: 1.4, seg: 5 });
    
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(logGeo, woodMat);
        m.rotation.z = Math.PI / 2;
        m.position.set(0, 0.14 + row * 0.24, (i - 2) * 0.26);
        m.castShadow = true;
        g.add(m);
      }
    }
    return g;
  }

  private getMaterial(color: number, roughness: number, metalness: number): THREE.Material {
    const key = `mat_${color}_${roughness}_${metalness}`;
    if (!this.materialCache.has(key)) {
      this.materialCache.set(key, matLib.get(color, roughness, metalness));
    }
    return this.materialCache.get(key)!;
  }

  // ═══════════════════════════════════════════════════════════
  // MOUNT & INSTANTIATION
  // ═══════════════════════════════════════════════════════════

  public mount(parent: THREE.Group): SugarBushInstance[] {
    const instances: SugarBushInstance[] = [];

    for (const def of this.BUSH_DEFINITIONS) {
      const y = getTerrainHeight(def.worldX, def.worldZ);
      
      // Cabane à sucre
      const cabane = buildCabaneSucre(def.id.length + 21);
      cabane.position.set(def.worldX, y, def.worldZ);
      cabane.rotation.y = def.yaw;
      parent.add(cabane);

      // Évaporateur avec audio
      const evapPos = this.farmToWorld(def, def.evapOffset[0], def.evapOffset[1]);
      const evapBuilt = this.buildEvaporator(def.id);
      evapBuilt.group.position.set(evapPos.x, getTerrainHeight(evapPos.x, evapPos.z), evapPos.z);
      evapBuilt.group.rotation.y = def.yaw;
      parent.add(evapBuilt.group);
      
      // ═══════════════════════════════════════════════════════════
      // NOUVEAU v4.0 — AUDIO SPATIALISÉ
      // ═══════════════════════════════════════════════════════════
      if (this.audioListener) {
        const sound = new THREE.PositionalAudio(this.audioListener);
        // TODO: Charger le fichier audio réel
        // const audioLoader = new THREE.AudioLoader();
        // audioLoader.load(SUGAR_CONFIG.SOUNDS.evap_boil, (buffer) => {
        //   sound.setBuffer(buffer);
        //   sound.setLoop(true);
        //   sound.setVolume(SUGAR_CONFIG.AUDIO.EVAP_BOIL_VOLUME);
        //   sound.setRefDistance(5);
        //   sound.setRolloffFactor(SUGAR_CONFIG.AUDIO.ROLLOFF_FACTOR);
        //   sound.setMaxDistance(SUGAR_CONFIG.AUDIO.MAX_DISTANCE);
        // });
        sound.setRefDistance(5);
        sound.setRolloffFactor(SUGAR_CONFIG.AUDIO.ROLLOFF_FACTOR);
        sound.setMaxDistance(SUGAR_CONFIG.AUDIO.MAX_DISTANCE);
        evapBuilt.group.add(sound);
        this.evapSounds.set(def.id, sound);
      }

      // Tas de bois
      const woodPos = this.farmToWorld(def, def.woodpileOffset[0], def.woodpileOffset[1]);
      const wood = this.buildWoodpile();
      wood.position.set(woodPos.x, getTerrainHeight(woodPos.x, woodPos.z), woodPos.z);
      wood.rotation.y = def.yaw;
      parent.add(wood);

      // État de l'évaporateur
      const evapState: SugarEvapState = {
        sapBuffer: 0,
        isBoiling: false,
        boilProgress: 0,
        lastBoilAt: 0,
        audioPlaying: false,
      };
      this.evapStates.set(def.id, evapState);

      // États des entailles avec seed procédural
      const taps: SugarTapInstance[] = [];
      def.tapPositions.forEach(([ox, oz], i) => {
        const pos = this.farmToWorld(def, ox, oz);
        const treeSeed = def.id.length * 1000 + i * 17; // Seed unique par arbre
        const maple = this.buildSugarMaple(treeSeed);
        maple.group.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
        maple.group.rotation.y = def.yaw + (i % 2 === 0 ? 0.4 : -0.35);
        parent.add(maple.group);
        
        // ═══════════════════════════════════════════════════════════
        // NOUVEAU v4.0 — PARTICULES DE FEUILLES (AUTOMNE)
        // ═══════════════════════════════════════════════════════════
        const leafParticles = new LeafParticleSystem(
          maple.group.position,
          maple.group.userData.trunkHeight || 4.6
        );
        leafParticles.getMesh().visible = false;
        parent.add(leafParticles.getMesh());
        
        if (!this.leafParticles.has(def.id)) {
          this.leafParticles.set(def.id, []);
        }
        this.leafParticles.get(def.id)!.push(leafParticles);

        const tapId = `${def.id}_tap_${i}`;
        this.tapStates.set(tapId, {
          sapAmount: 0,
          lastCollectedAt: 0,
          qualityBonus: 0,
          isFrozen: false,
          treeSeed,
        });

        taps.push({
          id: tapId,
          bushId: def.id,
          worldX: pos.x,
          worldZ: pos.z,
          mesh: maple.group,
          sapMesh: maple.sapMesh,
          snowMeshes: maple.snowMeshes,
          leafParticles,
        });
      });

      // Stats de l'érablière
      this.bushStats.set(def.id, {
        totalSapCollected: 0,
        totalSyrupProduced: 0,
        bestQualityStreak: 0,
      });

      // Instance complète
      const instance: SugarBushInstance = {
        id: def.id,
        name: def.name,
        village: def.village,
        worldX: def.worldX,
        worldZ: def.worldZ,
        yaw: def.yaw,
        cabaneMesh: cabane,
        evapMesh: evapBuilt.group,
        evapSteam: evapBuilt.steam,
        evapParticles: evapBuilt.particleSystem,
        woodpileMesh: wood,
        taps,
        evapState: this.evapStates.get(def.id)!,
      };

      this.bushes.set(def.id, instance);
      instances.push(instance);
    }

    return instances;
  }

  // ═══════════════════════════════════════════════════════════
  // RECHERCHE SPATIALE OPTIMISÉE
  // ═══════════════════════════════════════════════════════════

  public findNearestTap(x: number, z: number, maxDist = 2.6): SugarTapInstance | null {
    let best: SugarTapInstance | null = null;
    let bestD = maxDist * maxDist;

    for (const bush of this.bushes.values()) {
      for (const tap of bush.taps) {
        const dx = x - tap.worldX;
        const dz = z - tap.worldZ;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          best = tap;
          bestD = d;
        }
      }
    }
    return best;
  }

  public findNearestEvap(x: number, z: number, maxDist = 3.4): SugarEvapInstance | null {
    let best: SugarEvapInstance | null = null;
    let bestD = maxDist * maxDist;

    for (const bush of this.bushes.values()) {
      const dx = x - bush.evapMesh.position.x;
      const dz = z - bush.evapMesh.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        best = {
          id: bush.evapState ? `${bush.id}_evap` : "",
          bushId: bush.id,
          worldX: bush.evapMesh.position.x,
          worldZ: bush.evapMesh.position.z,
          mesh: bush.evapMesh,
          steam: bush.evapSteam,
          state: bush.evapState,
          particles: bush.evapParticles,
        };
        bestD = d;
      }
    }
    return best;
  }

  public findNearestBush(x: number, z: number, maxDist = 36): SugarBushInstance | null {
    let best: SugarBushInstance | null = null;
    let bestD = maxDist * maxDist;

    for (const bush of this.bushes.values()) {
      const dx = x - bush.worldX;
      const dz = z - bush.worldZ;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        best = bush;
        bestD = d;
      }
    }
    return best;
  }

  // ═══════════════════════════════════════════════════════════
  // INTERACTIONS JOUEUR
  // ═══════════════════════════════════════════════════════════

  public getTapPrompt(tap: SugarTapInstance, elapsed: number): string {
    const state = this.tapStates.get(tap.id);
    if (!state) return "Entaille indisponible";

    const season = quebecSeasons.getState().season;
    const weather = quebecSeasons.getState().condition;
    const seasonMult = SUGAR_CONFIG.SEASON_MULTIPLIERS[season];
    const weatherMult = SUGAR_CONFIG.WEATHER_EFFECTS[weather] ?? 1.0;
    
    if (state.isFrozen) {
      return "❄️ Entaille gelée (trop froid)";
    }
    
    if (state.sapAmount >= SUGAR_CONFIG.MAX_SAP_PER_TAP) {
      return "E — Récolter l'eau d'érable";
    }
    
    const timeSinceCollect = elapsed - state.lastCollectedAt;
    const refillTime = SUGAR_CONFIG.TAP_REFILL_SECONDS / (seasonMult * weatherMult);
    const wait = Math.max(1, Math.ceil(refillTime - timeSinceCollect));
    
    return `Entaille · coulée dans ${wait}s ${seasonMult < 1 ? `(×${seasonMult})` : ""}`;
  }

  public getEvapPrompt(evap: SugarEvapInstance, playerSapCount: number): string {
    const needed = SUGAR_CONFIG.SAP_PER_SYRUP;
    
    if (evap.state && evap.state.sapBuffer >= needed) {
      return `E — Bouillir · ${needed} seaux → sirop`;
    }
    
    const inBuffer = evap.state?.sapBuffer ?? 0;
    if (inBuffer > 0 || playerSapCount > 0) {
      return `Évaporateur · ${inBuffer + playerSapCount}/${needed} seaux`;
    }
    
    return `Évaporateur · Ajouter ${needed} seaux d'eau d'érable`;
  }

  public collectSap(tap: SugarTapInstance, elapsed: number): WorkResult {
    const state = this.tapStates.get(tap.id);
    if (!state) return { ok: false, notice: "Erreur système" };

    const season = quebecSeasons.getState().season;
    const weather = quebecSeasons.getState().condition;
    const seasonMult = SUGAR_CONFIG.SEASON_MULTIPLIERS[season];
    const weatherMult = SUGAR_CONFIG.WEATHER_EFFECTS[weather] ?? 1.0;
    const totalMult = seasonMult * weatherMult;

    if (season === "hiver" && ((weather as string) === "polaire" as any)) {
      state.isFrozen = true;
      return { ok: false, notice: "❄️ Trop froid pour la coulée" };
    }
    state.isFrozen = false;

    const timeSinceCollect = elapsed - state.lastCollectedAt;
    const refillTime = SUGAR_CONFIG.TAP_REFILL_SECONDS / totalMult;
    
    if (timeSinceCollect < refillTime) {
      const wait = Math.max(1, Math.ceil(refillTime - timeSinceCollect));
      return { ok: false, notice: `Pas encore · ${wait}s` };
    }

    const timingBonus = Math.min(1, (timeSinceCollect - refillTime) / 10);
    state.qualityBonus = timingBonus;
    state.sapAmount = SUGAR_CONFIG.MAX_SAP_PER_TAP;
    state.lastCollectedAt = elapsed;
    
    if (tap.sapMesh) {
      tap.sapMesh.visible = true;
      tap.sapMesh.scale.set(1, 1, 1);
    }

    const stats = this.bushStats.get(tap.bushId);
    if (stats) stats.totalSapCollected++;

    this.eventEmitter.emit("onSapCollected", {
      tapId: tap.id,
      bushId: tap.bushId,
      amount: 1,
    });

    return {
      ok: true,
      notice: `✓ Coulée récoltée · ${tap.bushId.replace("erable_", "")}`,
      loot: { id: "eau_erable", n: 1 },
    };
  }

  public processSyrup(evap: SugarEvapInstance, playerSapCount: number): WorkResult {
    const state = evap.state;
    if (!state) return { ok: false, notice: "Évaporateur indisponible" };

    const totalSap = state.sapBuffer + playerSapCount;
    const needed = SUGAR_CONFIG.SAP_PER_SYRUP;

    if (totalSap < needed) {
      return { ok: false, notice: `Il faut ${needed} seaux · ${totalSap} disponibles` };
    }

    state.isBoiling = true;
    state.boilProgress = 0;
    state.lastBoilAt = Date.now();

    let quality: SyrupQuality = "GOLDEN";
    const rand = Math.random();
    if (rand > 0.9) quality = "DARK";
    else if (rand > 0.6) quality = "AMBER";

    state.syrupQuality = quality;
    const qualityData = SUGAR_CONFIG.SYRUP_QUALITIES[quality];

    const syrupLevel = evap.mesh.getObjectByName("syrup_level") as THREE.Mesh;
    if (syrupLevel) syrupLevel.visible = true;
    
    // ═══════════════════════════════════════════════════════════
    // NOUVEAU v4.0 — ACTIVER PARTICULES & AUDIO
    // ═══════════════════════════════════════════════════════════
    if (evap.particles) {
      evap.particles.setActive(true);
    }
    
    const sound = this.evapSounds.get(evap.bushId);
    if (sound && !state.audioPlaying) {
      sound.play();
      state.audioPlaying = true;
    }

    const stats = this.bushStats.get(evap.bushId);
    if (stats) {
      stats.totalSyrupProduced++;
      if (quality === "DARK") stats.bestQualityStreak++;
      else stats.bestQualityStreak = 0;
      stats.lastProductionAt = Date.now();
    }

    this.eventEmitter.emit("onSyrupProduced", {
      evapId: evap.id,
      bushId: evap.bushId,
      quality,
      amount: 1,
    });

    return {
      ok: true,
      notice: `✓ Sirop ${qualityData.name} produit!`,
      loot: { id: qualityData.id, n: 1 },
      consume: { id: "eau_erable", n: needed },
      metadata: { quality, value: qualityData.value },
    };
  }

  public finishBoiling(evap: SugarEvapInstance): WorkResult | null {
    const state = evap.state;
    if (!state?.isBoiling) return null;

    const elapsed = Date.now() - state.lastBoilAt;
    if (elapsed < SUGAR_CONFIG.EVAP_BOIL_SECONDS * 1000) {
      return { 
        ok: false, 
        notice: `Ébullition en cours · ${Math.ceil((SUGAR_CONFIG.EVAP_BOIL_SECONDS * 1000 - elapsed) / 1000)}s` 
      };
    }

    state.isBoiling = false;
    state.sapBuffer = 0;
    state.boilProgress = 0;
    state.audioPlaying = false;
    
    // ═══════════════════════════════════════════════════════════
    // NOUVEAU v4.0 — DÉSACTIVER PARTICULES & AUDIO
    // ═══════════════════════════════════════════════════════════
    if (evap.particles) {
      evap.particles.setActive(false);
    }
    
    const sound = this.evapSounds.get(evap.bushId);
    if (sound) {
      sound.stop();
    }

    const syrupLevel = evap.mesh.getObjectByName("syrup_level") as THREE.Mesh;
    if (syrupLevel) syrupLevel.visible = false;

    const quality = state.syrupQuality ?? "GOLDEN";
    const qualityData = SUGAR_CONFIG.SYRUP_QUALITIES[quality];

    return {
      ok: true,
      notice: `✓ Sirop prêt · ${qualityData.name}`,
      loot: { id: qualityData.id, n: 1 },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // TICK & ANIMATIONS
  // ═══════════════════════════════════════════════════════════

  public tick(elapsed: number, deltaTime: number): void {
    if (elapsed - this.lastTickTime < SUGAR_CONFIG.TICK_RATE_MS) return;
    this.lastTickTime = elapsed;

    const season = quebecSeasons.getState().season;
    const weather = quebecSeasons.getState().condition;
    const temperature = quebecSeasons.getState().temperatureCelsius;

    for (const bush of this.bushes.values()) {
      // Mise à jour des entailles
      for (const tap of bush.taps) {
        const state = this.tapStates.get(tap.id);
        if (!state) continue;

        if (tap.sapMesh) {
          const targetScale = state.sapAmount >= SUGAR_CONFIG.MAX_SAP_PER_TAP ? 1 : 0.12;
          const current = tap.sapMesh.scale.y;
          tap.sapMesh.scale.y = THREE.MathUtils.lerp(current, targetScale, 0.1);
          tap.sapMesh.visible = tap.sapMesh.scale.y > 0.2;
        }
        
        // ═══════════════════════════════════════════════════════════
        // NOUVEAU v4.0 — GESTION NEIGE SAISONNIÈRE
        // ═══════════════════════════════════════════════════════════
        const showSnow = season === "hiver" && temperature < SUGAR_CONFIG.SNOW.MELT_TEMP_CELSIUS;
        if (tap.snowMeshes) {
          tap.snowMeshes.forEach(mesh => {
            mesh.visible = showSnow;
          });
        }
        
        // ═══════════════════════════════════════════════════════════
        // NOUVEAU v4.0 — PARTICULES DE FEUILLES (AUTOMNE)
        // ═══════════════════════════════════════════════════════════
        if (tap.leafParticles) {
          tap.leafParticles.getMesh().visible = season === "automne";
          if (season === "automne") {
            tap.leafParticles.update(deltaTime, bush.yaw);
          }
        }

        if (season === "hiver" && ((weather as string) === "polaire" as any)) {
          state.isFrozen = true;
        } else if (state.isFrozen && season !== "hiver") {
          state.isFrozen = false;
        }
      }

      // Animation de l'évaporateur
      const evapState = this.evapStates.get(bush.id);
      if (evapState && bush.evapSteam) {
        const isBoiling = evapState.isBoiling;
        
        // Ancien système (compatibilité)
        for (const puff of bush.evapSteam) {
          const phase = (puff.userData.phase as number) + deltaTime * (isBoiling ? 1.6 : 0.45);
          puff.userData.phase = phase;
          
          const lift = (phase % 2.2) * (isBoiling ? 0.55 : 0.22);
          puff.position.y = (puff.userData.baseY as number) + lift;
          
          const scale = isBoiling ? 0.7 + (phase % 1.4) * 0.5 : 0.35;
          puff.scale.setScalar(scale);
          puff.visible = isBoiling || lift < 0.55;
          
          if (lift > 0.45) {
            if (puff.material && !Array.isArray(puff.material)) { (puff.material as THREE.Material).opacity = 1 - (lift - 0.45) / 0.3; }
          }
        }
        
        // ═══════════════════════════════════════════════════════════
        // NOUVEAU v4.0 — MISE À JOUR PARTICULES DE VAPEUR
        // ═══════════════════════════════════════════════════════════
        if (bush.evapParticles) {
          bush.evapParticles.setActive(isBoiling);
          if (isBoiling) {
            // Émettre de nouvelles particules
            const emitPos = new THREE.Vector3(0, 1.35, 0);
            bush.evapParticles.emit(emitPos, 3);
            bush.evapParticles.update(deltaTime);
          }
        }

        // Lueur du feu
        const glow = bush.evapMesh.getObjectByName("fire_glow") as THREE.Mesh;
        if (glow) {
          const intensity = isBoiling ? 0.4 + Math.sin(elapsed * 0.01) * 0.1 : 0.2;
          (glow.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
        }
      }

      // LOD selon distance caméra
      if (this.camera) {
        const dist = this.camera.position.distanceTo(bush.evapMesh.position);
        this.updateLOD(bush, dist);
      }
    }
  }

  private updateLOD(bush: SugarBushInstance, distance: number): void {
    let lodLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    
    if (distance < SUGAR_CONFIG.LOD_DISTANCE.HIGH) lodLevel = "HIGH";
    else if (distance < SUGAR_CONFIG.LOD_DISTANCE.MEDIUM) lodLevel = "MEDIUM";

    for (const tap of bush.taps) {
      if (tap.mesh.userData.canopy) {
        tap.mesh.userData.canopy.visible = lodLevel !== "LOW";
      }
      if (tap.mesh.userData.blob) {
        tap.mesh.userData.blob.visible = lodLevel === "HIGH";
      }
      // Neige toujours visible si en hiver
      if (tap.snowMeshes) {
        const season = quebecSeasons.getState().season;
        tap.snowMeshes.forEach(mesh => {
          mesh.visible = mesh.visible && (lodLevel !== "LOW" || season === "hiver");
        });
      }
    }

    if (bush.evapSteam) {
      bush.evapSteam.forEach((puff, i) => {
        puff.visible = lodLevel !== "LOW" || i < 2;
      });
    }
    
    // Particules désactivées en LOD LOW
    if (bush.evapParticles) {
      bush.evapParticles.setActive(distance < SUGAR_CONFIG.LOD_DISTANCE.MEDIUM);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PERSISTANCE & SÉRIALISATION
  // ═══════════════════════════════════════════════════════════

  public saveState(): Record<string, unknown> {
    return {
      tapStates: Object.fromEntries(this.tapStates),
      evapStates: Object.fromEntries(this.evapStates),
      bushStats: Object.fromEntries(this.bushStats),
      timestamp: Date.now(),
    };
  }

  public loadState(data: Record<string, unknown>): boolean {
    try {
      if (data.tapStates) {
        for (const [id, state] of Object.entries(data.tapStates)) {
          this.tapStates.set(id, state as SugarTapState);
        }
      }
      if (data.evapStates) {
        for (const [id, state] of Object.entries(data.evapStates)) {
          this.evapStates.set(id, state as SugarEvapState);
        }
      }
      if (data.bushStats) {
        for (const [id, stats] of Object.entries(data.bushStats)) {
          this.bushStats.set(id, stats as SugarBushStats);
        }
      }
      return true;
    } catch (err) {
      console.error("[SugarSystem] Load state error:", err);
      return false;
    }
  }

  public reset(): void {
    this.tapStates.clear();
    this.evapStates.clear();
    this.bushStats.clear();
    this.bushes.clear();
    this.lastTickTime = 0;
    
    // Nettoyer les particules
    for (const ps of this.steamParticles.values()) {
      ps.dispose();
    }
    this.steamParticles.clear();
    
    for (const leaves of this.leafParticles.values()) {
      for (const lp of leaves) {
        lp.dispose();
      }
    }
    this.leafParticles.clear();
    
    // Nettoyer l'audio
    for (const sound of this.evapSounds.values()) {
      sound.stop();
    }
    this.evapSounds.clear();
  }

  // ═══════════════════════════════════════════════════════════
  // GETTERS & UTILITAIRES
  // ═══════════════════════════════════════════════════════════

  public getBush(id: string): SugarBushInstance | undefined {
    return this.bushes.get(id);
  }

  public getAllBushes(): SugarBushInstance[] {
    return Array.from(this.bushes.values());
  }

  public getBushStats(id: string): SugarBushStats | undefined {
    return this.bushStats.get(id);
  }

  public getSeasonMultiplier(): number {
    const season = quebecSeasons.getState().season;
    return SUGAR_CONFIG.SEASON_MULTIPLIERS[season] ?? 1.0;
  }

  public getWeatherMultiplier(): number {
    const weather = quebecSeasons.getState().condition;
    return SUGAR_CONFIG.WEATHER_EFFECTS[weather] ?? 1.0;
  }

  public getAchievements(bushId: string): Record<string, boolean> {
    const stats = this.bushStats.get(bushId);
    if (!stats) return {};

    return {
      first_syrup: stats.totalSyrupProduced >= 1,
      prolific_producer: stats.totalSyrupProduced >= 50,
      golden_streak: stats.bestQualityStreak >= 5,
      master_maple: stats.totalSapCollected >= 200,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// TYPES EXPORTÉS
// ═══════════════════════════════════════════════════════════

export interface SugarTapInstance {
  id: string;
  bushId: string;
  worldX: number;
  worldZ: number;
  mesh: THREE.Group;
  sapMesh: THREE.Mesh;
  snowMeshes: THREE.Mesh[];
  leafParticles: LeafParticleSystem;
}

export interface SugarEvapInstance {
  id: string;
  bushId: string;
  worldX: number;
  worldZ: number;
  mesh: THREE.Group;
  steam: THREE.Mesh[];
  particles?: ParticleSystem;
  state?: SugarEvapState;
}

export interface SugarBushInstance {
  id: string;
  name: string;
  village: string;
  worldX: number;
  worldZ: number;
  yaw: number;
  cabaneMesh: THREE.Group;
  evapMesh: THREE.Group;
  evapSteam: THREE.Mesh[];
  evapParticles?: ParticleSystem;
  woodpileMesh: THREE.Group;
  taps: SugarTapInstance[];
  evapState?: SugarEvapState;
}

export interface WorkResult {
  ok: boolean;
  notice: string;
  loot?: { id: string; n: number };
  consume?: { id: string; n: number };
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// API LEGACY (COMPATIBILITÉ)
// ═══════════════════════════════════════════════════════════

const _sugarSystem = new SugarSystem();

export const sugarSites = () => 
  _sugarSystem.getAllBushes().map(b => ({ 
    id: b.id, name: b.name, village: b.village, 
    x: b.worldX, z: b.worldZ, yaw: b.yaw 
  }));

export const sugarClearings = () => 
  _sugarSystem.getAllBushes().map(b => ({ x: b.worldX, z: b.worldZ, r: 42 }));

export const sugarMapMarks = () => 
  _sugarSystem.getAllBushes().map(b => ({ x: b.worldX, z: b.worldZ, r: 18 }));

export const mountSugarbush = (parent: THREE.Group) => 
  _sugarSystem.mount(parent);

export const nearestTap = (x: number, z: number, max = 2.6) => 
  _sugarSystem.findNearestTap(x, z, max);

export const nearestEvap = (x: number, z: number, max = 3.4) => 
  _sugarSystem.findNearestEvap(x, z, max);

export const nearestBush = (x: number, z: number, max = 36) => 
  _sugarSystem.findNearestBush(x, z, max);

export const tapPrompt = (tap: SugarTapInstance, elapsed: number) => 
  _sugarSystem.getTapPrompt(tap, elapsed);

export const evapPrompt = (evap: SugarEvapInstance, sapN: number) => 
  _sugarSystem.getEvapPrompt(evap, sapN);

export const workTap = (tap: SugarTapInstance, elapsed: number) => 
  _sugarSystem.collectSap(tap, elapsed);

export const workEvap = (evap: SugarEvapInstance, sapN: number) => 
  _sugarSystem.processSyrup(evap, sapN);

export const tickSugar = (elapsed: number, deltaTime: number) => 
  _sugarSystem.tick(elapsed, deltaTime);

export const SugarSystemInstance = _sugarSystem;





