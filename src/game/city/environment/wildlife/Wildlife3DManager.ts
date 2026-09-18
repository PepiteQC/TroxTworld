import * as THREE from "three";
import { WildlifeAISystem, WildlifeAIEntity, WildlifeAnimalType } from "./WildlifeAISystem";

// ═══════════════════════════════════════════════════════════
// TYPES & CONFIG
// ═══════════════════════════════════════════════════════════

export interface WildlifeParticleEffect {
  mesh: THREE.Points;
  age: number;
  maxAge: number;
}

export interface TrackDecal {
  mesh: THREE.Mesh;
  createdAt: number;
  lifetime: number;
}

export interface Wildlife3DConfig {
  /** Seed RNG */
  seed: number;
  /** Nombre max de decals en vie */
  maxTrackDecals: number;
  /** Durée de vie décals (ms) */
  trackLifetimeMs: number;
  /** Nombre max de particules foliage simultanées */
  maxFoliageEffects: number;
  /** Distance max rendu meshes (unités) */
  renderDistance: number;
  /** Distance LOD mid */
  lodMidDistance: number;
  /** Distance LOD low */
  lodLowDistance: number;
  /** Intervalle animation pas (ms) */
  trackSpawnIntervalMs: number;
  /** Check terrain height pour decals */
  useTerrainHeight: boolean;
  /** Provider terrain height (optionnel) */
  terrainHeightProvider?: (x: number, z: number) => number;
  /** Activer les ombres sur meshes */
  shadowsEnabled: boolean;
  /** Activer les decals d'empreintes */
  tracksEnabled: boolean;
  /** Activer les particules de feuillage */
  foliageEnabled: boolean;
}

const DEFAULT_CONFIG: Wildlife3DConfig = {
  seed: 1337,
  maxTrackDecals: 80,
  trackLifetimeMs: 25000,
  maxFoliageEffects: 40,
  renderDistance: 250,
  lodMidDistance: 80,
  lodLowDistance: 160,
  trackSpawnIntervalMs: 800,
  useTerrainHeight: false,
  shadowsEnabled: true,
  tracksEnabled: true,
  foliageEnabled: true,
};

// ═══════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════

export type Wildlife3DEventType =
  | "mesh_created"
  | "mesh_destroyed"
  | "track_spawned"
  | "foliage_spawned"
  | "alert_set"
  | "alert_cleared";

export interface Wildlife3DEvent {
  type: Wildlife3DEventType;
  entityId?: string;
  position?: [number, number, number];
  data?: Record<string, unknown>;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
// SEEDED RNG
// ═══════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════
// MANAGER
// ═══════════════════════════════════════════════════════════

export class Wildlife3DManager {
  private scene: THREE.Scene;
  private animalMeshes: Map<string, THREE.Group> = new Map();
  private trackDecals: TrackDecal[] = [];
  private foliageParticles: WildlifeParticleEffect[] = [];
  private lastTrackSpawnTime: Map<string, number> = new Map();
  private pawprintTexture: THREE.CanvasTexture | null = null;
  private hoovesTexture: THREE.CanvasTexture | null = null;

  public activeAlert: string | null = null;
  private alertTimer: number = 0;

  // 🆕 v2
  private config: Wildlife3DConfig;
  private rng: () => number;
  private listeners = new Set<(e: Wildlife3DEvent) => void>();
  private terrainCache = new Map<string, number>();
  private lastMeshSyncAt = 0;
  private disposed = false;

  // Stats
  private stats = {
    meshesCreated: 0,
    meshesDestroyed: 0,
    tracksSpawned: 0,
    foliageSpawned: 0,
    alertsRaised: 0,
    orphanCleanups: 0,
  };

  constructor(scene: THREE.Scene, config: Partial<Wildlife3DConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = mulberry32(this.config.seed);

    this.generateFootprintTextures();
    this.spawnInitialFaunaMeshes();
  }

  // ─────────────────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────────────────

  onEvent(cb: (e: Wildlife3DEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(
    type: Wildlife3DEventType,
    entityId?: string,
    position?: [number, number, number],
    data?: Record<string, unknown>,
  ): void {
    const evt: Wildlife3DEvent = { type, entityId, position, data, timestamp: Date.now() };
    for (const cb of this.listeners) {
      try { cb(evt); } catch { /* noop */ }
    }
  }

  // ─────────────────────────────────────────────────────────
  // TERRAIN HEIGHT (cache)
  // ─────────────────────────────────────────────────────────

  private getTerrainHeight(x: number, z: number): number {
    if (!this.config.useTerrainHeight || !this.config.terrainHeightProvider) return 0;
    const key = `${Math.round(x)}_${Math.round(z)}`;
    let h = this.terrainCache.get(key);
    if (h === undefined) {
      h = this.config.terrainHeightProvider(x, z);
      this.terrainCache.set(key, h);
      if (this.terrainCache.size > 3000) this.terrainCache.clear();
    }
    return h;
  }

  // ─────────────────────────────────────────────────────────
  // TEXTURES D'EMPREINTES (v1 compat — inchangé)
  // ─────────────────────────────────────────────────────────

  private generateFootprintTextures() {
    const canvasPaw = document.createElement("canvas");
    canvasPaw.width = canvasPaw.height = 64;
    const ctxPaw = canvasPaw.getContext("2d");
    if (ctxPaw) {
      ctxPaw.clearRect(0, 0, 64, 64);
      ctxPaw.fillStyle = "rgba(40, 25, 15, 0.75)";
      ctxPaw.beginPath();
      ctxPaw.ellipse(32, 42, 12, 10, 0, 0, Math.PI * 2);
      ctxPaw.fill();
      ctxPaw.beginPath();
      ctxPaw.ellipse(18, 22, 5, 7, -0.3, 0, Math.PI * 2);
      ctxPaw.ellipse(27, 16, 5, 8, -0.1, 0, Math.PI * 2);
      ctxPaw.ellipse(37, 16, 5, 8, 0.1, 0, Math.PI * 2);
      ctxPaw.ellipse(46, 22, 5, 7, 0.3, 0, Math.PI * 2);
      ctxPaw.fill();
    }
    this.pawprintTexture = new THREE.CanvasTexture(canvasPaw);

    const canvasHoof = document.createElement("canvas");
    canvasHoof.width = canvasHoof.height = 64;
    const ctxHoof = canvasHoof.getContext("2d");
    if (ctxHoof) {
      ctxHoof.clearRect(0, 0, 64, 64);
      ctxHoof.fillStyle = "rgba(45, 30, 20, 0.85)";
      ctxHoof.beginPath();
      ctxHoof.ellipse(24, 32, 7, 18, -0.15, 0, Math.PI * 2);
      ctxHoof.fill();
      ctxHoof.beginPath();
      ctxHoof.ellipse(40, 32, 7, 18, 0.15, 0, Math.PI * 2);
      ctxHoof.fill();
    }
    this.hoovesTexture = new THREE.CanvasTexture(canvasHoof);
  }

  // ─────────────────────────────────────────────────────────
  // MESH BUILDERS (v1 compat — inchangés sauf beaver)
  // ─────────────────────────────────────────────────────────

  private createMooseMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = "wildlife_moose";
    const furMat = new THREE.MeshStandardMaterial({ color: 0x452818, roughness: 0.85, metalness: 0.05 });
    const darkFurMat = new THREE.MeshStandardMaterial({ color: 0x2e190e, roughness: 0.9 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd6c2a5, roughness: 0.5 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0x331f13, roughness: 0.9 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.8), furMat);
    torso.position.set(0, 1.9, 0);
    torso.castShadow = this.config.shadowsEnabled;
    torso.receiveShadow = this.config.shadowsEnabled;
    group.add(torso);

    const hump = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.2), darkFurMat);
    hump.position.set(0, 2.7, 0.4);
    group.add(hump);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 1.0), furMat);
    neck.position.set(0, 2.6, 1.3);
    neck.rotation.x = -0.3;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 1.4), furMat);
    head.position.set(0, 3.0, 1.8);
    group.add(head);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.8), muzzleMat);
    muzzle.position.set(0, 2.8, 2.5);
    group.add(muzzle);

    const dewlap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 5), darkFurMat);
    dewlap.position.set(0, 2.2, 1.6);
    dewlap.rotation.x = 0.2;
    group.add(dewlap);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
    eyeL.position.set(-0.44, 3.2, 1.9);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
    eyeR.position.set(0.44, 3.2, 1.9);
    group.add(eyeR);

    const antlerBaseL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), antlerMat);
    antlerBaseL.position.set(-0.5, 3.5, 1.7);
    antlerBaseL.rotation.set(0.3, 0.4, 0.5);
    group.add(antlerBaseL);

    const antlerPalmLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.9), antlerMat);
    antlerPalmLeft.position.set(-1.1, 3.8, 1.6);
    antlerPalmLeft.rotation.set(0.2, 0.3, -0.6);
    group.add(antlerPalmLeft);

    const antlerBaseR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), antlerMat);
    antlerBaseR.position.set(0.5, 3.5, 1.7);
    antlerBaseR.rotation.set(0.3, -0.4, -0.5);
    group.add(antlerBaseR);

    const antlerPalmRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.9), antlerMat);
    antlerPalmRight.position.set(1.1, 3.8, 1.6);
    antlerPalmRight.rotation.set(0.2, -0.3, 0.6);
    group.add(antlerPalmRight);

    // 🆕 FIX : legs pivotent depuis le HAUT (géométrie décalée)
    const legGeo = new THREE.CylinderGeometry(0.14, 0.1, 1.7, 8);
    legGeo.translate(0, -0.85, 0); // pivot en haut

    const legFL = new THREE.Mesh(legGeo, darkFurMat);
    legFL.name = "leg_FL";
    legFL.position.set(-0.6, 1.7, 0.9);
    group.add(legFL);

    const legFR = new THREE.Mesh(legGeo, darkFurMat);
    legFR.name = "leg_FR";
    legFR.position.set(0.6, 1.7, 0.9);
    group.add(legFR);

    const legBL = new THREE.Mesh(legGeo, darkFurMat);
    legBL.name = "leg_BL";
    legBL.position.set(-0.6, 1.7, -0.9);
    group.add(legBL);

    const legBR = new THREE.Mesh(legGeo, darkFurMat);
    legBR.name = "leg_BR";
    legBR.position.set(0.6, 1.7, -0.9);
    group.add(legBR);

    return group;
  }

  private createWolfMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = "wildlife_wolf";
    const furMat = new THREE.MeshStandardMaterial({ color: 0x5b6573, roughness: 0.75, metalness: 0.05 });
    const whiteFurMat = new THREE.MeshStandardMaterial({ color: 0xd9e1e8, roughness: 0.8 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 1.6), furMat);
    torso.position.set(0, 0.9, 0);
    torso.castShadow = this.config.shadowsEnabled;
    group.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.7), whiteFurMat);
    chest.position.set(0, 0.8, 0.4);
    group.add(chest);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.6), furMat);
    head.position.set(0, 1.3, 0.9);
    group.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.55), whiteFurMat);
    snout.position.set(0, 1.22, 1.35);
    group.add(snout);

    const earGeo = new THREE.ConeGeometry(0.12, 0.3, 4);
    const earL = new THREE.Mesh(earGeo, furMat);
    earL.position.set(-0.22, 1.68, 0.85);
    earL.rotation.z = -0.2;
    group.add(earL);

    const earR = new THREE.Mesh(earGeo, furMat);
    earR.position.set(0.22, 1.68, 0.85);
    earR.rotation.z = 0.2;
    group.add(earR);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    eyeL.position.set(-0.2, 1.38, 1.15);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    eyeR.position.set(0.2, 1.38, 1.15);
    group.add(eyeR);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.9, 6), furMat);
    tail.name = "tail";
    tail.position.set(0, 0.7, -0.9);
    tail.rotation.x = -0.5;
    group.add(tail);

    // 🆕 FIX legs pivot en haut
    const legGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.85, 6);
    legGeo.translate(0, -0.425, 0);

    const legFL = new THREE.Mesh(legGeo, furMat);
    legFL.name = "leg_FL";
    legFL.position.set(-0.28, 0.85, 0.5);
    group.add(legFL);

    const legFR = new THREE.Mesh(legGeo, furMat);
    legFR.name = "leg_FR";
    legFR.position.set(0.28, 0.85, 0.5);
    group.add(legFR);

    const legBL = new THREE.Mesh(legGeo, furMat);
    legBL.name = "leg_BL";
    legBL.position.set(-0.28, 0.85, -0.5);
    group.add(legBL);

    const legBR = new THREE.Mesh(legGeo, furMat);
    legBR.name = "leg_BR";
    legBR.position.set(0.28, 0.85, -0.5);
    group.add(legBR);

    return group;
  }

  private createBearMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = "wildlife_bear";
    const furMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.05 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.2), furMat);
    torso.position.set(0, 1.2, 0);
    torso.castShadow = this.config.shadowsEnabled;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.9), furMat);
    head.position.set(0, 1.6, 1.3);
    group.add(head);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.5), muzzleMat);
    muzzle.position.set(0, 1.48, 1.8);
    group.add(muzzle);

    const earGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const earL = new THREE.Mesh(earGeo, furMat);
    earL.position.set(-0.35, 1.98, 1.2);
    group.add(earL);
    const earR = new THREE.Mesh(earGeo, furMat);
    earR.position.set(0.35, 1.98, 1.2);
    group.add(earR);

    // 🆕 FIX legs pivot en haut
    const legGeo = new THREE.CylinderGeometry(0.18, 0.15, 1.0, 8);
    legGeo.translate(0, -0.5, 0);

    const legFL = new THREE.Mesh(legGeo, furMat);
    legFL.name = "leg_FL";
    legFL.position.set(-0.5, 1.0, 0.7);
    group.add(legFL);

    const legFR = new THREE.Mesh(legGeo, furMat);
    legFR.name = "leg_FR";
    legFR.position.set(0.5, 1.0, 0.7);
    group.add(legFR);

    const legBL = new THREE.Mesh(legGeo, furMat);
    legBL.name = "leg_BL";
    legBL.position.set(-0.5, 1.0, -0.7);
    group.add(legBL);

    const legBR = new THREE.Mesh(legGeo, furMat);
    legBR.name = "leg_BR";
    legBR.position.set(0.5, 1.0, -0.7);
    group.add(legBR);

    return group;
  }

  private createFoxMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = "wildlife_fox";
    const redFurMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });
    const whiteFurMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
    const blackFurMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.9), redFurMat);
    torso.position.set(0, 0.45, 0);
    torso.castShadow = this.config.shadowsEnabled;
    group.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.35), whiteFurMat);
    chest.position.set(0, 0.4, 0.25);
    group.add(chest);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.35), redFurMat);
    head.position.set(0, 0.65, 0.48);
    group.add(head);

    const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 4), whiteFurMat);
    muzzle.position.set(0, 0.6, 0.75);
    muzzle.rotation.x = Math.PI / 2;
    group.add(muzzle);

    const earGeo = new THREE.ConeGeometry(0.09, 0.22, 4);
    const earL = new THREE.Mesh(earGeo, blackFurMat);
    earL.position.set(-0.12, 0.88, 0.45);
    group.add(earL);
    const earR = new THREE.Mesh(earGeo, blackFurMat);
    earR.position.set(0.12, 0.88, 0.45);
    group.add(earR);

    const tailMain = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.55, 6), redFurMat);
    tailMain.position.set(0, 0.35, -0.6);
    tailMain.rotation.x = -0.8;
    group.add(tailMain);

    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), whiteFurMat);
    tailTip.position.set(0, 0.15, -0.85);
    tailTip.rotation.x = -0.8;
    group.add(tailTip);

    // 🆕 FIX legs pivot en haut
    const legGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.45, 6);
    legGeo.translate(0, -0.225, 0);

    const legFL = new THREE.Mesh(legGeo, blackFurMat);
    legFL.name = "leg_FL";
    legFL.position.set(-0.14, 0.45, 0.28);
    group.add(legFL);

    const legFR = new THREE.Mesh(legGeo, blackFurMat);
    legFR.name = "leg_FR";
    legFR.position.set(0.14, 0.45, 0.28);
    group.add(legFR);

    const legBL = new THREE.Mesh(legGeo, blackFurMat);
    legBL.name = "leg_BL";
    legBL.position.set(-0.14, 0.45, -0.28);
    group.add(legBL);

    const legBR = new THREE.Mesh(legGeo, blackFurMat);
    legBR.name = "leg_BR";
    legBR.position.set(0.14, 0.45, -0.28);
    group.add(legBR);

    return group;
  }

  /** 🆕 v2 — mesh castor dédié (fin du fallback fox) */
  private createBeaverMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = "wildlife_beaver";
    const fur = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
    const darkFur = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.95 });
    const teeth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.9), fur);
    torso.position.set(0, 0.35, 0);
    torso.castShadow = this.config.shadowsEnabled;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.36), fur);
    head.position.set(0, 0.55, 0.5);
    g.add(head);

    // Queue plate caractéristique
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.6), darkFur);
    tail.position.set(0, 0.2, -0.55);
    tail.rotation.x = -0.15;
    g.add(tail);

    // Dents
    const toothL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.04), teeth);
    toothL.position.set(-0.05, 0.45, 0.68);
    g.add(toothL);
    const toothR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.04), teeth);
    toothR.position.set(0.05, 0.45, 0.68);
    g.add(toothR);

    // Pattes courtes
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6);
    legGeo.translate(0, -0.125, 0);
    for (const [lx, lz] of [[-0.15, 0.2], [0.15, 0.2], [-0.15, -0.2], [0.15, -0.2]]) {
      const leg = new THREE.Mesh(legGeo, darkFur);
      leg.name = lx < 0 ? (lz > 0 ? "leg_FL" : "leg_BL") : (lz > 0 ? "leg_FR" : "leg_BR");
      leg.position.set(lx, 0.25, lz);
      g.add(leg);
    }

    return g;
  }

  public createAnimalMeshByType(type: WildlifeAnimalType): THREE.Group {
    switch (type) {
      case "moose": return this.createMooseMesh();
      case "wolf": return this.createWolfMesh();
      case "bear": return this.createBearMesh();
      case "beaver": return this.createBeaverMesh();
      case "fox":
      default: return this.createFoxMesh();
    }
  }

  // ─────────────────────────────────────────────────────────
  // SPAWN INITIAL
  // ─────────────────────────────────────────────────────────

  private spawnInitialFaunaMeshes() {
    const entities = WildlifeAISystem.getActiveEntities();
    for (const entity of entities) {
      this.ensureMesh(entity);
    }
  }

  private ensureMesh(entity: WildlifeAIEntity): THREE.Group {
    let mesh = this.animalMeshes.get(entity.id);
    if (mesh) return mesh;

    mesh = this.createAnimalMeshByType(entity.type);
    mesh.position.set(entity.position[0], entity.position[1], entity.position[2]);
    mesh.rotation.y = entity.rotation;
    this.scene.add(mesh);
    this.animalMeshes.set(entity.id, mesh);
    this.stats.meshesCreated++;
    this.emit("mesh_created", entity.id, entity.position as [number, number, number]);
    return mesh;
  }

  private destroyMesh(id: string): void {
    const mesh = this.animalMeshes.get(id);
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat.dispose();
      }
    });
    this.animalMeshes.delete(id);
    this.lastTrackSpawnTime.delete(id);
    this.stats.meshesDestroyed++;
    this.emit("mesh_destroyed", id);
  }

  // ─────────────────────────────────────────────────────────
  // TRACK DECALS
  // ─────────────────────────────────────────────────────────

  private spawnTrackDecal(
    pos: [number, number, number],
    rotY: number,
    type: "moose" | "wolf" | "bear" | "fox" | "beaver",
  ) {
    if (!this.config.tracksEnabled) return;
    const isHoof = type === "moose";
    const tex = isHoof ? this.hoovesTexture : this.pawprintTexture;
    if (!tex) return;

    const size = isHoof ? 0.35 : 0.22;
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const decal = new THREE.Mesh(geo, mat);
    // 🆕 FIX rotation : applique d'abord -PI/2 sur X, puis yaw via rotation.y
    decal.rotation.x = -Math.PI / 2;
    decal.rotation.z = rotY; // rotation.z en local suit l'axe horizontal après rotation.x
    const groundY = this.config.useTerrainHeight
      ? this.getTerrainHeight(pos[0], pos[2]) + 0.025
      : 0.025;
    decal.position.set(pos[0], groundY, pos[2]);

    this.scene.add(decal);
    this.trackDecals.push({
      mesh: decal,
      createdAt: performance.now(),
      lifetime: this.config.trackLifetimeMs,
    });
    this.stats.tracksSpawned++;
    this.emit("track_spawned", undefined, [pos[0], groundY, pos[2]], { type });

    // Cap dur
    if (this.trackDecals.length > this.config.maxTrackDecals) {
      const oldest = this.trackDecals.shift();
      if (oldest) this.disposeDecal(oldest);
    }
  }

  private disposeDecal(d: TrackDecal): void {
    this.scene.remove(d.mesh);
    d.mesh.geometry.dispose();
    const mat = d.mesh.material as THREE.MeshBasicMaterial;
    mat.dispose();
  }

  // ─────────────────────────────────────────────────────────
  // FOLIAGE PARTICLES
  // ─────────────────────────────────────────────────────────

  private spawnDisturbedFoliage(pos: [number, number, number]) {
    if (!this.config.foliageEnabled) return;
    if (this.foliageParticles.length >= this.config.maxFoliageEffects) return;

    const particleCount = 12;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (this.rng() - 0.5) * 0.8;
      positions[i * 3 + 1] = 0.1 + this.rng() * 0.5;
      positions[i * 3 + 2] = (this.rng() - 0.5) * 0.8;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x166534,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
    });

    const p = new THREE.Points(geo, mat);
    p.position.set(pos[0], pos[1], pos[2]);
    this.scene.add(p);
    this.foliageParticles.push({ mesh: p, age: 0, maxAge: 1.5 });
    this.stats.foliageSpawned++;
    this.emit("foliage_spawned", undefined, [pos[0], pos[1], pos[2]]);
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE (v1 compat + fixes)
  // ─────────────────────────────────────────────────────────

  public update(
    delta: number,
    playerPos: [number, number, number],
    isCrouching: boolean,
    sirenActive: boolean,
    gunfireActive: boolean,
  ) {
    if (this.disposed) return;

    const tickResult = WildlifeAISystem.updateAIBehaviors(
      playerPos,
      isCrouching,
      sirenActive,
      gunfireActive,
      delta,
    );

    // Alert
    if (tickResult.predatorWarning) {
      const wasNull = this.activeAlert === null;
      this.activeAlert = tickResult.predatorWarning;
      this.alertTimer = 3.0;
      if (wasNull) {
        this.stats.alertsRaised++;
        this.emit("alert_set", undefined, playerPos, { message: tickResult.predatorWarning });
      }
    } else if (this.alertTimer > 0) {
      this.alertTimer -= delta;
      if (this.alertTimer <= 0) {
        this.activeAlert = null;
        this.emit("alert_cleared");
      }
    }

    const now = performance.now();

    // Set des IDs vivants
    const liveIds = new Set<string>();

    // Sync AI ↔ mesh
    for (const entity of tickResult.updatedEntities) {
      liveIds.add(entity.id);
      const mesh = this.ensureMesh(entity);

      // LOD : cache mesh si trop loin
      const dx = playerPos[0] - entity.position[0];
      const dz = playerPos[2] - entity.position[2];
      const d2 = dx * dx + dz * dz;
      const renderDistSq = this.config.renderDistance * this.config.renderDistance;

      if (d2 > renderDistSq) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;

      const lodLevel = Math.sqrt(d2) < this.config.lodMidDistance ? 0
        : Math.sqrt(d2) < this.config.lodLowDistance ? 1 : 2;

      // Dead : position fixe au sol
      if (entity.state === "dead") {
        mesh.rotation.z = Math.PI / 2;
        mesh.position.y = 0.2;
        continue;
      } else {
        // Reset rotation.z si sortie de mort
        if (mesh.rotation.z !== 0) mesh.rotation.z = 0;
      }

      // Interpolation
      mesh.position.x += (entity.position[0] - mesh.position.x) * 0.1;
      mesh.position.z += (entity.position[2] - mesh.position.z) * 0.1;
      mesh.position.y = entity.position[1];

      // Rotation smooth
      let diff = entity.rotation - mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      mesh.rotation.y += diff * 0.15;

      // 🆕 FIX : normalisation vitesse pour walk cycle
      // Vitesse attendue : 0.5 à 12 m/s. On map ça vers 0.8 à 2.5 rad/s.
      if (entity.speed > 0.1 && lodLevel < 2) {
        const walkFrequency = Math.min(2.5, 0.8 + entity.speed * 0.15);
        const t = now * 0.001 * walkFrequency * Math.PI * 2;

        const legFL = mesh.getObjectByName("leg_FL");
        const legFR = mesh.getObjectByName("leg_FR");
        const legBL = mesh.getObjectByName("leg_BL");
        const legBR = mesh.getObjectByName("leg_BR");

        const swing = 0.45;
        if (legFL) legFL.rotation.x = Math.sin(t) * swing;
        if (legFR) legFR.rotation.x = -Math.sin(t) * swing;
        if (legBL) legBL.rotation.x = -Math.sin(t) * swing;
        if (legBR) legBR.rotation.x = Math.sin(t) * swing;

        // Track decals (throttle par vitesse)
        const lastSpawn = this.lastTrackSpawnTime.get(entity.id) ?? 0;
        const interval = this.config.trackSpawnIntervalMs / Math.max(1, entity.speed);
        if (now - lastSpawn > interval) {
          this.spawnTrackDecal(
            entity.position as [number, number, number],
            entity.rotation,
            entity.type,
          );
          if (this.rng() < 0.4) {
            this.spawnDisturbedFoliage(entity.position as [number, number, number]);
          }
          this.lastTrackSpawnTime.set(entity.id, now);
        }
      }
    }

    // 🆕 FIX : cleanup orphelins (meshes dont l'entité n'existe plus)
    for (const id of Array.from(this.animalMeshes.keys())) {
      if (!liveIds.has(id)) {
        this.destroyMesh(id);
        this.stats.orphanCleanups++;
      }
    }

    // Decals — 🆕 FIX : itération arrière pour splice safe
    for (let i = this.trackDecals.length - 1; i >= 0; i--) {
      const decal = this.trackDecals[i];
      const age = now - decal.createdAt;
      if (age > decal.lifetime) {
        this.disposeDecal(decal);
        this.trackDecals.splice(i, 1);
      } else {
        const mat = decal.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.7 * (1 - age / decal.lifetime));
      }
    }

    // Foliage particles
    for (let i = this.foliageParticles.length - 1; i >= 0; i--) {
      const p = this.foliageParticles[i];
      p.age += delta;
      if (p.age > p.maxAge) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.PointsMaterial).dispose();
        this.foliageParticles.splice(i, 1);
      } else {
        const mat = p.mesh.material as THREE.PointsMaterial;
        mat.opacity = 0.8 * (1 - p.age / p.maxAge);
        // 🆕 FIX : drift doux des positions internes au lieu du groupe
        const posAttr = p.mesh.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let j = 0; j < arr.length; j += 3) {
          arr[j + 1] += delta * 0.3;
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // STATS & HEALTH & DISPOSE
  // ─────────────────────────────────────────────────────────

  public getStats() {
    return {
      ...this.stats,
      liveMeshes: this.animalMeshes.size,
      liveDecals: this.trackDecals.length,
      liveFoliage: this.foliageParticles.length,
      activeAlert: this.activeAlert,
      terrainCacheSize: this.terrainCache.size,
    };
  }

  public health(): { ok: boolean; reason?: string } {
    if (this.disposed) return { ok: false, reason: "disposed" };
    if (this.animalMeshes.size > 500) return { ok: false, reason: "mesh_overflow" };
    if (this.terrainCache.size > 10000) return { ok: false, reason: "terrain_cache_overflow" };
    return { ok: true };
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;

    // Meshes
    for (const id of Array.from(this.animalMeshes.keys())) {
      this.destroyMesh(id);
    }
    this.animalMeshes.clear();

    // Decals
    for (const d of this.trackDecals) this.disposeDecal(d);
    this.trackDecals = [];

    // Foliage
    for (const p of this.foliageParticles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.PointsMaterial).dispose();
    }
    this.foliageParticles = [];

    // Textures
    this.pawprintTexture?.dispose();
    this.hoovesTexture?.dispose();
    this.pawprintTexture = null;
    this.hoovesTexture = null;

    this.lastTrackSpawnTime.clear();
    this.terrainCache.clear();
    this.listeners.clear();
  }
}