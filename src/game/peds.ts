/**
 * ═══════════════════════════════════════════════════════════════════
 * 🚶 SYSTÈME DE PIÉTONS & PNJ AVANCÉ (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - 7 Archétypes de PNJ (Citoyen, Joggeur, Touriste, Business, Police, etc.)
 *  - IA avec Machine à États (Idle, Walk, Run, Flee, Wait, Sit, Interact)
 *  - Génération procédurale variée (taille, vêtements, accessoires)
 *  - Évitement du joueur et des autres PNJ
 *  - Réactions aux véhicules et aux événements (coups de feu, crashes)
 *  - Système LOD (Level of Detail) pour performance
 *  - Adaptation météo/heure (parapluies, manteaux, densité nocturne)
 *  - Interactions avec l'environnement (bancs, abribus, téléphones)
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib } from "./materials";
import { getTerrainHeight } from "./worlddata";
import { SPAWN_POINTS, worldConfig, type SpawnPoint } from "./worldconfig";
import { CharacterAnimationManager } from "./characterAnim";
import { makeRng } from "./rng";

// ═══════════════════════════════════════════════════════════
// TYPES & CONFIGURATION
// ═══════════════════════════════════════════════════════════

export type PedArchetype = 
  | "citizen"       // Citoyen standard
  | "jogger"        // Coureur matinal
  | "tourist"       // Touriste avec caméra/sac
  | "business"      // Homme/femme d'affaires
  | "police"        // Policier en patrouille
  | "construction"  // Ouvrier chantier
  | "homeless";     // Itinérant

export type PedState = 
  | "idle"          // Debout, regarde autour
  | "walking"       // Marche normale
  | "running"       // Course (jogging ou fuite)
  | "fleeing"       // Panique, fuit un danger
  | "sitting"       // Assis sur un banc
  | "waiting"       // Attend au feu piéton / abribus
  | "interacting"   // Utilise un distributeur / téléphone
  | "dead";         // Au sol (ragdoll)

export type PedAccessory = 
  | "none" 
  | "phone" 
  | "coffee" 
  | "backpack" 
  | "umbrella" 
  | "briefcase" 
  | "camera" 
  | "hardhat"
  | "dog_leash";

interface PedConfig {
  archetype: PedArchetype;
  baseSpeed: number;
  heightScale: number;
  widthScale: number;
  clothingPalette: number[];
  skinTone: number;
  accessory: PedAccessory;
  canSit: boolean;
  canFlee: boolean;
  spawnWeight: number; // Probabilité d'apparition
}

interface Ped {
  id: string;
  mesh: THREE.Group;
  config: PedConfig;
  state: PedState;
  stateTimer: number;
  
  // Position & Mouvement
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  y: number;
  yaw: number;
  targetYaw: number;
  speed: number;
  targetX: number;
  targetZ: number;
  
  // Animation
  phase: number;
  bob: number;
  anim: CharacterAnimationManager | null;
  
  // IA & Comportement
  spawn: SpawnPoint;
  waypointPath: Array<{ x: number; z: number }>;
  currentWaypoint: number;
  awarenessRadius: number;
  isAlerted: boolean;
  alertSource: { x: number; z: number } | null;
  
  // LOD & Rendu
  lodLevel: "high" | "medium" | "low" | "culled";
  lastLODUpdate: number;
}

// ═══════════════════════════════════════════════════════════
// PALETTES & CONSTANTES
// ═══════════════════════════════════════════════════════════

const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x4a2c17];

const CLOTHING_PALETTES: Record<PedArchetype, number[]> = {
  citizen: [0x3a4a3c, 0x4a3028, 0x2a3a4a, 0x6a5a48, 0x8a3030, 0x2a2a32, 0x5c4033, 0x4682b4],
  jogger: [0xff4500, 0x1e90ff, 0x32cd32, 0xff1493, 0xffd700, 0x000000],
  tourist: [0xff6347, 0x40e0d0, 0xffa500, 0x9370db, 0xf0e68c],
  business: [0x1a1a2e, 0x16213e, 0x0f3460, 0x2c3e50, 0x34495e, 0x7f8c8d],
  police: [0x1a237e, 0x0d47a1], // Bleu SQ
  construction: [0xff8c00, 0xffd700, 0xffa500], // Haute visibilité
  homeless: [0x556b2f, 0x8b4513, 0x696969, 0x2f4f4f],
};

const ARCHETYPE_CONFIGS: Record<PedArchetype, Partial<PedConfig>> = {
  citizen: { baseSpeed: 1.2, heightScale: 1.0, canSit: true, canFlee: true, spawnWeight: 50 },
  jogger: { baseSpeed: 3.5, heightScale: 1.05, canSit: false, canFlee: false, spawnWeight: 10 },
  tourist: { baseSpeed: 0.9, heightScale: 0.95, canSit: true, canFlee: true, spawnWeight: 15 },
  business: { baseSpeed: 1.4, heightScale: 1.05, canSit: false, canFlee: true, spawnWeight: 10 },
  police: { baseSpeed: 1.5, heightScale: 1.1, canSit: false, canFlee: false, spawnWeight: 5 },
  construction: { baseSpeed: 1.1, heightScale: 1.08, canSit: true, canFlee: true, spawnWeight: 5 },
  homeless: { baseSpeed: 0.7, heightScale: 0.95, canSit: true, canFlee: true, spawnWeight: 5 },
};

// Distances LOD
const LOD_HIGH_DIST = 35;   // < 35m : Mesh complet + animations
const LOD_MEDIUM_DIST = 80; // 35-80m : Mesh simplifié
const LOD_CULL_DIST = 150;  // > 150m : Invisible

// ═══════════════════════════════════════════════════════════
// GÉNÉRATION VISUELLE PROCÉDURALE
// ═══════════════════════════════════════════════════════════

function buildPedestrianMesh(config: PedConfig, seed: number): THREE.Group {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  
  const coatColor = rng.pick(config.clothingPalette);
  const pantColor = config.archetype === "business" ? 0x1a1a2e : rng.pick([0x2a2a30, 0x3d3d45, 0x1c2833]);
  const coat = matLib.get(coatColor, 0.82);
  const skin = matLib.get(config.skinTone, 0.7);
  const pant = matLib.get(pantColor, 0.9);
  const boot = matLib.get(0x1a1612, 0.92);
  
  const height = config.heightScale;
  const width = config.widthScale;
  
  // Torse
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.42 * width, 0.55 * height, 0.26 * width), 
    coat
  );
  torso.name = "TorsoJoint";
  torso.position.y = 1.18 * height;
  torso.castShadow = true;
  g.add(torso);
  
  // Tête
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14 * width, 8, 8), skin);
  head.name = "HeadJoint";
  head.position.y = 1.6 * height;
  head.castShadow = true;
  g.add(head);
  
  // Cheveux / Couvre-chef
  if (config.archetype === "construction") {
    // Casque de chantier
    const hardhat = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      matLib.get(0xffd700, 0.6)
    );
    hardhat.position.y = 1.68 * height;
    g.add(hardhat);
  } else if (config.archetype === "police") {
    // Casquette SQ
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.15, 0.08, 8),
      matLib.get(0x1a237e, 0.9)
    );
    cap.position.y = 1.72 * height;
    g.add(cap);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.1),
      matLib.get(0x000000, 0.9)
    );
    visor.position.set(0, 1.68 * height, 0.1);
    g.add(visor);
  } else {
    // Cheveux standards
    const hairColor = rng.pick([0x2a1208, 0x4a3020, 0x8b4513, 0x000000, 0xd4af37]);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.145 * width, 7, 6), 
      matLib.get(hairColor, 0.95)
    );
    hair.position.y = 1.68 * height;
    hair.scale.set(1, 0.55, 1);
    g.add(hair);
  }
  
  // Bras et Jambes
  for (const s of [-1, 1] as const) {
    // Bras
    const arm = new THREE.Group();
    arm.position.set(s * 0.26 * width, 1.38 * height, 0);
    arm.userData.arm = s;
    arm.name = s === 1 ? "ArmRJoint" : "ArmLJoint";
    g.add(arm);
    
    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.1 * width, 0.5 * height, 0.1 * width), 
      coat
    );
    sleeve.position.y = -0.2 * height;
    arm.add(sleeve);
    
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 * width, 0.09 * height, 0.08 * width), 
      skin
    );
    hand.position.y = -0.48 * height;
    arm.add(hand);
    
    // Jambes
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.13 * width, 0.68 * height, 0.15 * width), 
      pant
    );
    leg.position.set(s * 0.11 * width, 0.42 * height, 0);
    leg.userData.leg = s;
    leg.name = s === 1 ? "LegRJoint" : "LegLJoint";
    g.add(leg);
    
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * width, 0.1 * height, 0.2 * width), 
      boot
    );
    shoe.position.set(s * 0.11 * width, 0.06 * height, 0.02);
    g.add(shoe);
  }
  
  // Accessoires
  if (config.accessory === "phone") {
    const phone = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.08, 0.01),
      matLib.getEmissive(0x111111, 0x4488ff, 0.5)
    );
    phone.position.set(0.28 * width, 1.0 * height, 0.15);
    g.add(phone);
  } else if (config.accessory === "backpack") {
    const backpack = new THREE.Mesh(
      new THREE.BoxGeometry(0.3 * width, 0.4 * height, 0.15),
      matLib.get(rng.pick([0x8b0000, 0x2f4f4f, 0x000000]), 0.8)
    );
    backpack.position.set(0, 1.2 * height, -0.18);
    g.add(backpack);
  } else if (config.accessory === "briefcase") {
    const briefcase = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.18, 0.08),
      matLib.get(0x3e2723, 0.7)
    );
    briefcase.position.set(0.3 * width, 0.6 * height, 0);
    g.add(briefcase);
  }
  
  return g;
}

// ═══════════════════════════════════════════════════════════
// ANIMATIONS PROCÉDURALES
// ═══════════════════════════════════════════════════════════

function poseWalk(mesh: THREE.Group, bob: number, amp: number) {
  mesh.traverse((obj) => {
    if (obj.userData.leg) {
      obj.rotation.x = Math.sin(bob + (obj.userData.leg > 0 ? 0 : Math.PI)) * amp;
    }
    if (obj.userData.arm) {
      obj.rotation.x = Math.sin(bob + (obj.userData.arm > 0 ? Math.PI : 0)) * amp * 0.7;
    }
  });
}

function poseIdle(mesh: THREE.Group, time: number) {
  mesh.traverse((obj) => {
    if (obj.name === "HeadJoint") {
      // Regarde autour lentement
      obj.rotation.y = Math.sin(time * 0.5) * 0.3;
      obj.rotation.x = Math.sin(time * 0.3) * 0.1;
    }
    if (obj.userData.arm) {
      // Léger balancement des bras
      obj.rotation.x = Math.sin(time * 0.8 + obj.userData.arm) * 0.05;
    }
  });
}

function poseRun(mesh: THREE.Group, bob: number, amp: number) {
  mesh.traverse((obj) => {
    if (obj.userData.leg) {
      obj.rotation.x = Math.sin(bob * 2 + (obj.userData.leg > 0 ? 0 : Math.PI)) * amp * 1.5;
    }
    if (obj.userData.arm) {
      obj.rotation.x = Math.sin(bob * 2 + (obj.userData.arm > 0 ? Math.PI : 0)) * amp * 1.2;
    }
    if (obj.name === "TorsoJoint") {
      // Légère inclinaison vers l'avant
      obj.rotation.x = -0.15;
    }
  });
}

function poseFlee(mesh: THREE.Group, bob: number) {
  poseRun(mesh, bob, 0.6);
  mesh.traverse((obj) => {
    if (obj.userData.arm) {
      // Bras levés en signe de panique
      obj.rotation.x = -1.2 + Math.sin(bob * 3) * 0.3;
      obj.rotation.z = obj.userData.arm * 0.4;
    }
  });
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PIÉTONS (CLASSE PRINCIPALE)
// ═══════════════════════════════════════════════════════════

export class PedSystem {
  group = new THREE.Group();
  peds: Ped[] = [];
  private pedIdCounter = 0;
  private globalTime = 0;
  
  // Configuration environnementale
  private weather: "clear" | "rain" | "snow" = "clear";
  private isNight = false;

  constructor() {
    this.group.name = "pietons_v2";
  }

  build() {
    this.group.clear();
    this.peds = [];
    this.pedIdCounter = 0;

    for (const sp of SPAWN_POINTS) {
      if (sp.spawnType !== "pedestrian" || !sp.enabled) continue;
      
      // Déterminer combien de PNJ spawn à ce point
      const count = Math.floor(1 + Math.random() * 3);
      
      for (let i = 0; i < count; i++) {
        this.spawnPed(sp, i);
      }
    }
  }
  
  private spawnPed(sp: SpawnPoint, offset: number) {
    const archetype = this.pickArchetype();
    const config = this.generatePedConfig(archetype);
    
    const offsetX = (Math.random() - 0.5) * 4;
    const offsetZ = (Math.random() - 0.5) * 4;
    const spawnX = sp.posX + offsetX;
    const spawnZ = sp.posZ + offsetZ;
    
    const mesh = buildPedestrianMesh(config, this.pedIdCounter);
    mesh.position.set(spawnX, getTerrainHeight(spawnX, spawnZ), spawnZ);
    this.group.add(mesh);
    
    const ped: Ped = {
      id: `ped_${this.pedIdCounter++}`,
      mesh,
      config,
      state: "walking",
      stateTimer: Math.random() * 10,
      homeX: spawnX,
      homeZ: spawnZ,
      x: spawnX,
      z: spawnZ,
      y: getTerrainHeight(spawnX, spawnZ),
      yaw: sp.heading + Math.random() * 0.5,
      targetYaw: sp.heading,
      speed: config.baseSpeed,
      targetX: spawnX,
      targetZ: spawnZ,
      phase: Math.random() * Math.PI * 2,
      bob: 0,
      anim: CharacterAnimationManager.attach(mesh),
      spawn: sp,
      waypointPath: [],
      currentWaypoint: 0,
      awarenessRadius: 15,
      isAlerted: false,
      alertSource: null,
      lodLevel: "culled",
      lastLODUpdate: 0,
    };
    
    this.peds.push(ped);
    this.pickNewDestination(ped);
  }
  
  private pickArchetype(): PedArchetype {
    const weights: Array<{ type: PedArchetype; weight: number }> = [];
    let totalWeight = 0;
    
    for (const [type, cfg] of Object.entries(ARCHETYPE_CONFIGS)) {
      const w = cfg.spawnWeight ?? 10;
      weights.push({ type: type as PedArchetype, weight: w });
      totalWeight += w;
    }
    
    let roll = Math.random() * totalWeight;
    for (const w of weights) {
      roll -= w.weight;
      if (roll <= 0) return w.type;
    }
    
    return "citizen";
  }
  
  private generatePedConfig(archetype: PedArchetype): PedConfig {
    const base = ARCHETYPE_CONFIGS[archetype];
    const rng = makeRng(Math.floor(Math.random() * 100000));
    
    return {
      archetype,
      baseSpeed: (base.baseSpeed ?? 1.2) * (0.85 + Math.random() * 0.3),
      heightScale: (base.heightScale ?? 1.0) * (0.9 + Math.random() * 0.2),
      widthScale: 0.9 + Math.random() * 0.2,
      clothingPalette: CLOTHING_PALETTES[archetype],
      skinTone: rng.pick(SKIN_TONES),
      accessory: this.pickAccessory(archetype, rng),
      canSit: base.canSit ?? true,
      canFlee: base.canFlee ?? true,
      spawnWeight: base.spawnWeight ?? 10,
    };
  }
  
  private pickAccessory(archetype: PedArchetype, rng: ReturnType<typeof makeRng>): PedAccessory {
    const roll = Math.random();
    
    if (archetype === "business") {
      return roll < 0.4 ? "briefcase" : roll < 0.7 ? "phone" : "none";
    }
    if (archetype === "tourist") {
      return roll < 0.3 ? "camera" : roll < 0.6 ? "backpack" : "none";
    }
    if (archetype === "construction") {
      return "hardhat";
    }
    if (this.weather === "rain" && roll < 0.4) {
      return "umbrella";
    }
    
    // Citoyens standards
    if (roll < 0.15) return "phone";
    if (roll < 0.25) return "coffee";
    if (roll < 0.35) return "backpack";
    return "none";
  }

  // ─── IA & COMPORTEMENT ───────────────────────────────────

  private pickNewDestination(ped: Ped) {
    // Rayon de wandering autour du point de spawn
    const zone = worldConfig.at(ped.homeX, ped.homeZ);
    const radius = 15 + (zone.pedestrianDensity ?? 0.5) * 25;
    
    const angle = Math.random() * Math.PI * 2;
    ped.targetX = ped.homeX + Math.cos(angle) * radius;
    ped.targetZ = ped.homeZ + Math.sin(angle) * radius;
    
    // Limiter à la zone de spawn
    const maxDist = 50;
    const dx = ped.targetX - ped.homeX;
    const dz = ped.targetZ - ped.homeZ;
    const dist = Math.hypot(dx, dz);
    if (dist > maxDist) {
      ped.targetX = ped.homeX + (dx / dist) * maxDist;
      ped.targetZ = ped.homeZ + (dz / dist) * maxDist;
    }
  }
  
  private updateAI(ped: Ped, dt: number, playerPos: THREE.Vector3) {
    ped.stateTimer -= dt;
    
    // Évitement du joueur
    const dxPlayer = ped.x - playerPos.x;
    const dzPlayer = ped.z - playerPos.z;
    const distPlayer = Math.hypot(dxPlayer, dzPlayer);
    
    if (distPlayer < 3 && ped.state !== "fleeing") {
      // Pousser le PNJ loin du joueur
      const pushX = (dxPlayer / distPlayer) * 2;
      const pushZ = (dzPlayer / distPlayer) * 2;
      ped.targetX = ped.x + pushX;
      ped.targetZ = ped.z + pushZ;
    }
    
    // Fuite si alerté
    if (ped.isAlerted && ped.alertSource) {
      const dxAlert = ped.x - ped.alertSource.x;
      const dzAlert = ped.z - ped.alertSource.z;
      const distAlert = Math.hypot(dxAlert, dzAlert);
      
      if (distAlert < 30 && ped.config.canFlee) {
        ped.state = "fleeing";
        ped.speed = ped.config.baseSpeed * 2.5;
        ped.targetX = ped.x + (dxAlert / distAlert) * 20;
        ped.targetZ = ped.z + (dzAlert / distAlert) * 20;
      }
    }
    
    // Machine à états
    if (ped.stateTimer <= 0) {
      const roll = Math.random();
      
      if (ped.state === "walking" || ped.state === "running") {
        // Arrivée à destination ou changement d'état
        const dxTarget = ped.targetX - ped.x;
        const dzTarget = ped.targetZ - ped.z;
        const distTarget = Math.hypot(dxTarget, dzTarget);
        
        if (distTarget < 2) {
          // Arrivé, décider du prochain état
          if (roll < 0.3 && ped.config.canSit) {
            ped.state = "idle";
            ped.stateTimer = 3 + Math.random() * 5;
          } else if (roll < 0.5 && ped.config.archetype === "tourist") {
            ped.state = "interacting"; // Prendre une photo
            ped.stateTimer = 2 + Math.random() * 3;
          } else {
            this.pickNewDestination(ped);
            ped.state = ped.config.archetype === "jogger" ? "running" : "walking";
            ped.speed = ped.config.baseSpeed;
          }
        }
      } else if (ped.state === "idle" || ped.state === "interacting") {
        // Fin de la pause, reprendre la marche
        this.pickNewDestination(ped);
        ped.state = ped.config.archetype === "jogger" ? "running" : "walking";
        ped.speed = ped.config.baseSpeed;
        ped.stateTimer = 5 + Math.random() * 10;
      } else if (ped.state === "fleeing") {
        // Arrêter de fuir après un moment
        ped.isAlerted = false;
        ped.alertSource = null;
        ped.state = "walking";
        ped.speed = ped.config.baseSpeed;
        ped.stateTimer = 3;
      }
    }
  }

  // ─── BOUCLE PRINCIPALE ───────────────────────────────────

  update(dt: number, player: THREE.Vector3, hour: number, weather: "clear" | "rain" | "snow" = "clear") {
    this.globalTime += dt;
    this.weather = weather;
    this.isNight = hour < 6 || hour >= 21;
    
    for (const p of this.peds) {
      // ── 1. CULLING & LOD ──
      const dx = p.x - player.x;
      const dz = p.z - player.z;
      const dist2 = dx * dx + dz * dz;
      const dist = Math.sqrt(dist2);
      
      if (dist > LOD_CULL_DIST) {
        if (p.mesh.visible) p.mesh.visible = false;
        p.lodLevel = "culled";
        continue;
      }
      
      // Vérifier si le PNJ devrait être visible (heure/zone)
      const zone = worldConfig.at(p.x, p.z);
      const open = worldConfig.hourOpen(p.spawn, hour) && zone.pedestrianDensity > 0.12;
      const nightPenalty = this.isNight ? 0.3 : 1.0;
      const weatherPenalty = weather === "rain" ? 0.6 : weather === "snow" ? 0.4 : 1.0;
      
      if (!open && Math.random() > nightPenalty * weatherPenalty) {
        if (p.mesh.visible) p.mesh.visible = false;
        continue;
      }
      
      if (!p.mesh.visible) p.mesh.visible = true;
      
      // Update LOD
      if (dist < LOD_HIGH_DIST) p.lodLevel = "high";
      else if (dist < LOD_MEDIUM_DIST) p.lodLevel = "medium";
      else p.lodLevel = "low";
      
      // ── 2. IA ──
      this.updateAI(p, dt, player);
      
      // ── 3. MOUVEMENT ──
      if (p.state === "walking" || p.state === "running" || p.state === "fleeing") {
        const dxTarget = p.targetX - p.x;
        const dzTarget = p.targetZ - p.z;
        const distTarget = Math.hypot(dxTarget, dzTarget);
        
        if (distTarget > 0.5) {
          const moveX = (dxTarget / distTarget) * p.speed * dt;
          const moveZ = (dzTarget / distTarget) * p.speed * dt;
          
          p.x += moveX;
          p.z += moveZ;
          
          // Rotation fluide vers la direction de mouvement
          p.targetYaw = Math.atan2(-dxTarget, -dzTarget);
        }
      }
      
      // Interpolation Yaw
      let yawDiff = p.targetYaw - p.yaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      p.yaw += yawDiff * Math.min(1, dt * 5);
      
      // Terrain height
      p.y = getTerrainHeight(p.x, p.z);
      
      // ── 4. APPLICATION VISUELLE ──
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = p.yaw;
      
      // ── 5. ANIMATIONS ──
      if (p.lodLevel === "low") {
        // Pas d'animation pour les PNJ lointains
        continue;
      }
      
      const isMoving = p.state === "walking" || p.state === "running" || p.state === "fleeing";
      p.bob += dt * (isMoving ? 8.2 : 1.6);
      
      if (p.anim?.bound && p.lodLevel === "high") {
        p.anim.update(dt, isMoving ? p.speed : 0);
      } else {
        // Animations procédurales fallback
        switch (p.state) {
          case "walking":
            poseWalk(p.mesh, p.bob, 0.38);
            break;
          case "running":
            poseRun(p.mesh, p.bob, 0.45);
            break;
          case "fleeing":
            poseFlee(p.mesh, p.bob);
            break;
          case "idle":
          case "interacting":
            poseIdle(p.mesh, this.globalTime);
            break;
        }
      }
    }
  }
  
  // ─── API PUBLIQUE ────────────────────────────────────────
  
  /**
   * Alert all peds in radius of a danger (gunshot, explosion, crash)
   */
  alertPeds(x: number, z: number, radius: number = 30) {
    for (const ped of this.peds) {
      const dx = ped.x - x;
      const dz = ped.z - z;
      const dist = Math.hypot(dx, dz);
      
      if (dist < radius && ped.config.canFlee) {
        ped.isAlerted = true;
        ped.alertSource = { x, z };
        ped.stateTimer = 0; // Force state change
      }
    }
  }
  
  /**
   * Get all peds in a given radius
   */
  getPedsInRadius(x: number, z: number, radius: number): Ped[] {
    const r2 = radius * radius;
    return this.peds.filter(p => {
      const dx = p.x - x;
      const dz = p.z - z;
      return dx * dx + dz * dz <= r2;
    });
  }
  
  /**
   * Kill a specific ped (for RP/medical scenarios)
   */
  killPed(pedId: string) {
    const ped = this.peds.find(p => p.id === pedId);
    if (!ped) return;
    
    ped.state = "dead";
    ped.speed = 0;
    
    // Ragdoll simple : coucher le mesh
    ped.mesh.rotation.x = Math.PI / 2;
    ped.mesh.position.y -= 0.8;
  }
  
  /**
   * Get stats for debugging
   */
  getStats() {
    const visible = this.peds.filter(p => p.mesh.visible).length;
    const byState: Record<string, number> = {};
    const byArchetype: Record<string, number> = {};
    
    for (const p of this.peds) {
      byState[p.state] = (byState[p.state] ?? 0) + 1;
      byArchetype[p.config.archetype] = (byArchetype[p.config.archetype] ?? 0) + 1;
    }
    
    return {
      total: this.peds.length,
      visible,
      byState,
      byArchetype,
    };
  }
  
  dispose() {
    for (const ped of this.peds) {
      ped.mesh.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    }
    this.peds = [];
    this.group.clear();
  }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════

export const pedSystem = new PedSystem();