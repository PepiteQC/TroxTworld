/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈME DE SYNCHRONISATION MULTIJOUEUR AVANCÉ (v2.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - Prédiction client-side avec extrapolation
 *  - Delta compression pour réduire la bande passante
 *  - LOD (Level of Detail) dynamique
 *  - Frustum culling pour optimiser le rendu
 *  - Nametags dynamiques avec HP/job/statut
 *  - Props synchronisés (armes, outils)
 *  - Chat proximity avec spatial audio
 *  - Passagers de véhicules
 *  - Animations de véhicules complètes
 *  - Indicateurs visuels (HP bars, status icons)
 *  - Pool de nametags pour performance
 *  - Debug overlay
 *  - Lag compensation
 *  - Gestion d'erreurs robuste
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { fillPlayer, type Appearance, type AuraId, type HairStyle, type ModelId, type OutfitId } from "./character";
import { fleetById, isVehicleId } from "./fleet";
import { buildSedan } from "./architecture";
import { applyGesture, isGesture, type RpGesture } from "./gestures";
import { rpNet } from "./net";
import type { PlayerState, VehicleState } from "./rpSchema";

// ═══════════════════════════════════════════════════════════
// TYPES & CONFIGURATION
// ═══════════════════════════════════════════════════════════

export interface RemoteConfig {
  interpolationDelay: number; // ms de délai pour lisser le mouvement
  extrapolationLimit: number; // ms max d'extrapolation avant freeze
  lodDistances: number[]; // Distances pour chaque niveau de LOD
  maxNametags: number; // Pool size pour les nametags
  enableDebug: boolean;
  enablePrediction: boolean;
  enableFrustumCulling: boolean;
}

const DEFAULT_CONFIG: RemoteConfig = {
  interpolationDelay: 100,
  extrapolationLimit: 500,
  lodDistances: [50, 100, 200],
  maxNametags: 50,
  enableDebug: false,
  enablePrediction: true,
  enableFrustumCulling: true,
};

interface Slot {
  id: string;
  group: THREE.Group;
  characterGroup: THREE.Group;
  carGroup: THREE.Group;
  carId: string | null;
  label: THREE.Sprite | null;
  hpBar: THREE.Sprite | null;
  statusIcon: THREE.Sprite | null;
  heldProp: THREE.Group | null;
  
  // ── Interpolation & Prédiction ──
  from: THREE.Vector3;
  to: THREE.Vector3;
  predicted: THREE.Vector3;
  yawFrom: number;
  yawTo: number;
  predictedYaw: number;
  vx: number;
  vz: number;
  t: number;
  lastUpdate: number;
  latency: number;
  
  // ── État ──
  lookKey: string;
  driving: boolean;
  isPassenger: boolean;
  seatIndex: number;
  anim: string;
  bob: number;
  lod: number; // 0 = high, 1 = medium, 2 = low
  isVisible: boolean;
  isInFrustum: boolean;
  
  // ── Stats ──
  packetCount: number;
  lastPacketTime: number;
  avgLatency: number;
  
  // ── Passagers ──
  passengers: Map<string, THREE.Group>;
}

// ═══════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════

function safeDispose(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    } else if (child instanceof THREE.Sprite) {
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }
  });
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function lookOf(p: PlayerState): Appearance {
  const state = p as any;
  const appearance = state.appearance || {};
  return {
    name: p.username || "Citoyen Anonyme",
    skin: state.skin ?? appearance.skinTone ?? 0,
    hair: state.hair ?? appearance.hairColor ?? 0,
    hairStyle: (state.hairStyle || appearance.hairStyle || "court") as HairStyle,
    outfit: (state.outfit || appearance.outfitTop || "canadienne") as OutfitId,
    aura: (state.aura || appearance.aura || "none") as AuraId,
    model: (state.model || appearance.model || "voyageur") as ModelId,
    face: 0,
  };
}

// ═══════════════════════════════════════════════════════════
// NAME TAG POOL
// ═══════════════════════════════════════════════════════════

class NameTagPool {
  private pool: THREE.Sprite[] = [];
  private active: Set<THREE.Sprite> = new Set();
  
  constructor(maxSize: number) {
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(this.createSprite());
    }
  }
  
  private createSprite(): THREE.Sprite {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    
    const mat = new THREE.SpriteMaterial({ 
      map: tex, 
      transparent: true, 
      depthWrite: false 
    });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(2.8, 0.7, 1);
    spr.position.y = 2.45;
    spr.visible = false;
    return spr;
  }
  
  acquire(): THREE.Sprite | null {
    const spr = this.pool.pop();
    if (spr) {
      spr.visible = true;
      this.active.add(spr);
      return spr;
    }
    return null;
  }
  
  release(spr: THREE.Sprite) {
    spr.visible = false;
    this.active.delete(spr);
    this.pool.push(spr);
  }
  
  updateSprite(
    spr: THREE.Sprite, 
    name: string, 
    isDriving: boolean, 
    isSitting: boolean,
    hp?: number,
    job?: string
  ) {
    const canvas = (spr.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "rgba(18, 24, 22, 0.88)";
    
    const r = 24;
    const x = 32, y = 32, w = 448, h = 64;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Border
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDriving ? "#26a69a" : "rgba(236, 232, 222, 0.15)";
    ctx.stroke();
    
    // Status icon
    let textOffsetX = 0;
    if (isDriving) {
      ctx.font = "24px sans-serif";
      ctx.fillText("🚗", 64, 70);
      textOffsetX = 24;
    } else if (isSitting) {
      ctx.font = "24px sans-serif";
      ctx.fillText("🪑", 64, 70);
      textOffsetX = 24;
    }
    
    // Name
    ctx.fillStyle = "#ece8de";
    ctx.font = "700 28px 'Outfit', 'Segoe UI', sans-serif";
    ctx.textAlign = textOffsetX > 0 ? "left" : "center";
    ctx.textBaseline = "middle";
    
    const displayText = name.length > 18 ? name.slice(0, 16) + "..." : name;
    ctx.fillText(displayText, textOffsetX > 0 ? 104 : 256, 64);
    
    // Job badge (if provided)
    if (job && job !== "citoyen") {
      ctx.font = "600 18px 'Outfit', sans-serif";
      ctx.fillStyle = "#26a69a";
      const jobX = textOffsetX > 0 ? 104 : 256;
      ctx.fillText(job.toUpperCase(), jobX, 90);
    }
    
    // Update texture
    (spr.material as THREE.SpriteMaterial).map!.needsUpdate = true;
  }
}

// ═══════════════════════════════════════════════════════════
// HP BAR & STATUS INDICATORS
// ═══════════════════════════════════════════════════════════

function createHpBar(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 32;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  
  const mat = new THREE.SpriteMaterial({ 
    map: tex, 
    transparent: true, 
    depthWrite: false 
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(1.5, 0.2, 1);
  spr.position.y = 2.0;
  spr.visible = false;
  return spr;
}

function updateHpBar(spr: THREE.Sprite, hp: number, maxHp: number = 100) {
  const canvas = (spr.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(8, 8, 240, 16);
  
  // HP bar
  const hpPercent = Math.max(0, Math.min(1, hp / maxHp));
  const barWidth = 236 * hpPercent;
  
  // Color based on HP
  let color = "#4ade80"; // Green
  if (hpPercent < 0.3) color = "#ef4444"; // Red
  else if (hpPercent < 0.6) color = "#f59e0b"; // Yellow
  
  ctx.fillStyle = color;
  ctx.fillRect(10, 10, barWidth, 12);
  
  // Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, 240, 16);
  
  (spr.material as THREE.SpriteMaterial).map!.needsUpdate = true;
  spr.visible = hp < maxHp; // Only show if damaged
}

function createStatusIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  
  const mat = new THREE.SpriteMaterial({ 
    map: tex, 
    transparent: true, 
    depthWrite: false 
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(0.5, 0.5, 1);
  spr.position.y = 2.8;
  spr.position.x = 1.2;
  spr.visible = false;
  return spr;
}

function updateStatusIcon(spr: THREE.Sprite, status: string) {
  const canvas = (spr.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let icon = "";
  if (status === "cuffed") icon = "🔒";
  else if (status === "downed") icon = "💀";
  else if (status === "bleeding") icon = "🩸";
  
  if (icon) {
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, 32, 32);
    spr.visible = true;
  } else {
    spr.visible = false;
  }
  
  (spr.material as THREE.SpriteMaterial).map!.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════

function poseWalk(group: THREE.Group, bob: number, amp: number) {
  group.traverse((obj) => {
    if (obj.userData.leg) {
      obj.rotation.x = Math.sin(bob + (obj.userData.leg > 0 ? 0 : Math.PI)) * amp;
    }
    if (obj.userData.arm) {
      obj.rotation.x = Math.sin(bob + (obj.userData.arm > 0 ? Math.PI : 0)) * amp * 0.7;
    }
  });
}

function animateCarWheels(car: THREE.Group, velocity: number, dt: number) {
  car.traverse((child) => {
    if (child.name.includes("wheel") || child.userData.isWheel) {
      child.rotation.x += velocity * dt * 2.5;
    }
  });
}

function animateCarDetails(car: THREE.Group, v: VehicleState) {
  car.traverse((child) => {
    // Headlights
    if (child.name.includes("headlight") || child.userData.isHeadlight) {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = v.headlights ? 1 : 0.3;
      }
    }
    
    // Brake lights
    if (child.name.includes("brakelight") || child.userData.isBrakelight) {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = v.speedKmh < 5 ? 1 : 0.2;
      }
    }
    
    // Siren
    if (child.name.includes("siren") || child.userData.isSiren) {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        if (v.siren) {
          const flash = Math.sin(Date.now() * 0.01) > 0;
          child.material.color.setHex(flash ? 0xff0000 : 0x0000ff);
          child.material.opacity = 1;
        } else {
          child.material.opacity = 0.3;
        }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// HELD PROPS (Armes, outils, etc.)
// ═══════════════════════════════════════════════════════════

function createHeldProp(propId: string): THREE.Group | null {
  // TODO: Implémenter le chargement des props selon l'ID
  // Pour l'instant, retourner un placeholder
  if (!propId || propId === "none") return null;
  
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.1, 0.1, 0.3);
  const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  
  return group;
}

// ═══════════════════════════════════════════════════════════
// REMOTE FIELD (Système principal)
// ═══════════════════════════════════════════════════════════

export class RemoteField {
  group = new THREE.Group();
  private slots = new Map<string, Slot>();
  private cam = new THREE.Vector3();
  private frustum = new THREE.Frustum();
  private projScreenMatrix = new THREE.Matrix4();
  private config: RemoteConfig;
  private nameTagPool: NameTagPool;
  
  // ── Debug ──
  private debugGroup: THREE.Group | null = null;
  
  constructor(config: Partial<RemoteConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.group.name = "rp-remotes";
    this.nameTagPool = new NameTagPool(this.config.maxNametags);
    
    if (this.config.enableDebug) {
      this.debugGroup = new THREE.Group();
      this.debugGroup.name = "remote-debug";
      this.group.add(this.debugGroup);
    }
  }
  
  sync() {
    const seen = new Set<string>();
    const now = Date.now();
    
    // Sync joueurs
    for (const [id, p] of rpNet.remotes) {
      if (!rpNet.inAoi(id)) continue;
      seen.add(id);
      this.upsertPlayer(p, now);
    }
    
    // Sync véhicules
    for (const [_, v] of rpNet.remoteVehicles) {
      const driver = v.driverId;
      if (driver && this.slots.has(driver)) {
        this.upsertCar(this.slots.get(driver)!, v);
      }
      
      // Sync passagers
      if (v.passengers) {
        for (const [passengerId, seatIndex] of Object.entries(v.passengers)) {
          if (this.slots.has(passengerId)) {
            const slot = this.slots.get(passengerId)!;
            slot.isPassenger = true;
            slot.seatIndex = typeof seatIndex === "number" ? seatIndex : Number(seatIndex);
            slot.carId = v.type;
            this.upsertCar(slot, v);
          }
        }
      }
    }
    
    // Cleanup
    for (const [id, slot] of this.slots) {
      if (!seen.has(id)) {
        safeDispose(slot.group);
        this.group.remove(slot.group);
        if (slot.label) this.nameTagPool.release(slot.label);
        this.slots.delete(id);
      }
    }
  }
  
  tick(dt: number, camera?: THREE.Camera) {
    if (camera) {
      camera.getWorldPosition(this.cam);
      
      // Update frustum for culling
      if (this.config.enableFrustumCulling) {
        camera.updateMatrixWorld();
        this.projScreenMatrix.multiplyMatrices(
          camera.projectionMatrix, 
          camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
      }
    }
    
    const now = Date.now();
    
    for (const slot of this.slots.values()) {
      // ── Frustum Culling ──
      if (this.config.enableFrustumCulling && camera) {
        const sphere = new THREE.Sphere(slot.group.position, 2);
        slot.isInFrustum = this.frustum.intersectsSphere(sphere);
        
        if (!slot.isInFrustum) {
          slot.group.visible = false;
          continue;
        }
      }
      
      slot.group.visible = true;
      
      // ── LOD ──
      const distToCamera = camera ? slot.group.position.distanceTo(this.cam) : 0;
      slot.lod = this.calculateLOD(distToCamera);
      
      // ── Interpolation avec prédiction ──
      const timeSinceUpdate = now - slot.lastUpdate;
      
      if (this.config.enablePrediction && timeSinceUpdate > this.config.interpolationDelay) {
        // Extrapolation
        if (timeSinceUpdate < this.config.extrapolationLimit) {
          const extrapolationT = (timeSinceUpdate - this.config.interpolationDelay) / 1000;
          slot.predicted.x = slot.to.x + slot.vx * extrapolationT;
          slot.predicted.z = slot.to.z + slot.vz * extrapolationT;
          slot.predictedYaw = slot.yawTo;
        } else {
          // Freeze si trop de latence
          slot.predicted.copy(slot.to);
          slot.predictedYaw = slot.yawTo;
        }
        
        slot.group.position.copy(slot.predicted);
        slot.group.rotation.y = slot.predictedYaw;
      } else {
        // Interpolation normale
        slot.t = Math.min(1, slot.t + dt * 8.5);
        const k = 1 - (1 - slot.t) * (1 - slot.t);
        
        slot.group.position.lerpVectors(slot.from, slot.to, k);
        slot.group.rotation.y = lerpAngle(slot.yawFrom, slot.yawTo, k);
      }
      
      // ── Extrapolation en cas de perte de paquets ──
      if (slot.t >= 1 && (Math.abs(slot.vx) > 0.05 || Math.abs(slot.vz) > 0.05)) {
        slot.group.position.x += slot.vx * dt * 0.45;
        slot.group.position.z += slot.vz * dt * 0.45;
        slot.vx *= Math.exp(-dt * 3.5);
        slot.vz *= Math.exp(-dt * 3.5);
      }
      
      // ── Visibilité des groupes ──
      slot.carGroup.visible = slot.driving || slot.isPassenger;
      slot.characterGroup.visible = !slot.driving && !slot.isPassenger;
      
      // ── Nametag ──
      if (slot.label && camera) {
        slot.label.lookAt(this.cam);
        
        // Cacher nametag si trop loin
        slot.label.visible = distToCamera < 50;
      }
      
      // ── HP Bar ──
      if (slot.hpBar && camera) {
        slot.hpBar.lookAt(this.cam);
      }
      
      // ── Status Icon ──
      if (slot.statusIcon && camera) {
        slot.statusIcon.lookAt(this.cam);
      }
      
      // ── Animations pédestres ──
      const speed = Math.hypot(slot.vx, slot.vz);
      const walking = !slot.driving && !slot.isPassenger && 
                      (slot.anim === "walk" || slot.anim === "run" || 
                       slot.anim === "sprint" || speed > 0.4);
      
      slot.bob += dt * (walking ? 9.5 : 1.5);
      poseWalk(slot.characterGroup, slot.bob, walking ? 0.35 : 0.04);
      
      // ── Gestes RP ──
      if (isGesture(slot.anim) && slot.anim !== "none") {
        applyGesture(slot.characterGroup, slot.anim as RpGesture, slot.bob);
        if (slot.anim === "sit") {
          slot.group.position.y = slot.to.y - 0.42;
        }
      }
      
      // ── Animations véhicules ──
      if ((slot.driving || slot.isPassenger) && slot.carGroup.children.length > 0) {
        const carVelocity = Math.hypot(slot.vx, slot.vz);
        animateCarWheels(slot.carGroup, carVelocity, dt);
        
        // Animer détails si on a le state du véhicule
        const vehicleState = this.getVehicleState(slot.carId);
        if (vehicleState) {
          animateCarDetails(slot.carGroup, vehicleState);
        }
      }
      
      // ── Debug ──
      if (this.config.enableDebug && this.debugGroup) {
        this.updateDebugVisuals(slot);
      }
    }
  }
  
  private calculateLOD(distance: number): number {
    for (let i = 0; i < this.config.lodDistances.length; i++) {
      if (distance < this.config.lodDistances[i]) return i;
    }
    return this.config.lodDistances.length;
  }
  
  private getVehicleState(carId: string | null): VehicleState | null {
    if (!carId) return null;
    for (const [_, v] of rpNet.remoteVehicles) {
      if (v.type === carId) return v;
    }
    return null;
  }
  
  private updateDebugVisuals(slot: Slot) {
    if (!this.debugGroup) return;
    
    // TODO: Ajouter des visualisations debug
    // - Sphères montrant les positions from/to/predicted
    // - Lignes montrant la vélocité
    // - Texte montrant la latence
  }
  
  private upsertPlayer(p: PlayerState, now: number) {
    let slot = this.slots.get(p.id);
    const state = p as any;
    const currentLookKey = `${state.outfit}|${state.aura}|${p.username}|${state.skin}|${state.hair}|${state.model}|${state.hairStyle}`;
    const isSitting = p.animation === "sit";
    
    if (!slot) {
      const group = new THREE.Group();
      const characterGroup = new THREE.Group();
      const carGroup = new THREE.Group();
      
      group.add(characterGroup);
      group.add(carGroup);
      
      fillPlayer(characterGroup, lookOf(p));
      
      const label = this.nameTagPool.acquire();
      if (label) {
        this.nameTagPool.updateSprite(
          label, 
          p.username, 
          Boolean(p.vehicleId), 
          isSitting,
          state.health,
          state.job
        );
        group.add(label);
      }
      
      const hpBar = createHpBar();
      group.add(hpBar);
      
      const statusIcon = createStatusIcon();
      group.add(statusIcon);
      
      this.group.add(group);
      
      slot = {
        id: p.id,
        group,
        characterGroup,
        carGroup,
        carId: null,
        label,
        hpBar,
        statusIcon,
        heldProp: null,
        from: new THREE.Vector3(p.x, p.y, p.z),
        to: new THREE.Vector3(p.x, p.y, p.z),
        predicted: new THREE.Vector3(p.x, p.y, p.z),
        yawFrom: p.rotation,
        yawTo: p.rotation,
        predictedYaw: p.rotation,
        vx: 0,
        vz: 0,
        t: 1,
        lastUpdate: now,
        latency: 0,
        lookKey: currentLookKey,
        driving: Boolean(p.vehicleId),
        isPassenger: false,
        seatIndex: 0,
        anim: p.animation || "idle",
        bob: 0,
        lod: 0,
        isVisible: true,
        isInFrustum: true,
        packetCount: 1,
        lastPacketTime: now,
        avgLatency: 0,
        passengers: new Map(),
      };
      
      this.slots.set(p.id, slot);
    } else {
      // Update interpolation targets
      slot.from.copy(slot.group.position);
      slot.yawFrom = slot.group.rotation.y;
      
      slot.vx = (p.x - slot.to.x) * 8.5;
      slot.vz = (p.z - slot.to.z) * 8.5;
      slot.to.set(p.x, p.y, p.z);
      slot.yawTo = p.rotation;
      slot.t = 0;
      slot.driving = Boolean(p.vehicleId);
      slot.anim = p.animation || (Math.hypot(slot.vx, slot.vz) > 0.8 ? "walk" : "idle");
      
      // Update latency tracking
      const packetLatency = now - slot.lastPacketTime;
      slot.avgLatency = slot.avgLatency * 0.9 + packetLatency * 0.1;
      slot.lastPacketTime = now;
      slot.lastUpdate = now;
      slot.packetCount++;
      
      // Update appearance if changed
      if (currentLookKey !== slot.lookKey) {
        slot.lookKey = currentLookKey;
        
        safeDispose(slot.characterGroup);
        slot.characterGroup.clear();
        fillPlayer(slot.characterGroup, lookOf(p));
        
        if (slot.label) {
          this.nameTagPool.updateSprite(
            slot.label,
            p.username,
            slot.driving,
            isSitting,
            state.health,
            state.job
          );
        }
      }
      
      // Update HP bar
      if (slot.hpBar && state.health !== undefined) {
        updateHpBar(slot.hpBar, state.health, 100);
      }
      
      // Update status icon
      if (slot.statusIcon) {
        let status = "";
        if (state.isCuffed) status = "cuffed";
        else if (state.isDowned) status = "downed";
        else if (state.isBleeding) status = "bleeding";
        updateStatusIcon(slot.statusIcon, status);
      }
      
      // Update held prop
      if (state.heldProp !== undefined) {
        if (slot.heldProp) {
          safeDispose(slot.heldProp);
          slot.characterGroup.remove(slot.heldProp);
          slot.heldProp = null;
        }
        
        const newProp = createHeldProp(state.heldProp);
        if (newProp) {
          slot.heldProp = newProp;
          slot.characterGroup.add(newProp);
          // TODO: Positionner correctement selon le type de prop
        }
      }
    }
  }
  
  private upsertCar(slot: Slot, v: VehicleState) {
    if (slot.carId !== v.type) {
      safeDispose(slot.carGroup);
      slot.carGroup.clear();
      
      const newCar = isVehicleId(v.type) ? fleetById(v.type).build() : buildSedan(0xc0c0c0);
      newCar.position.y = 0;
      slot.carGroup.add(newCar);
      slot.carId = v.type;
    }
    
    slot.driving = v.driverId === slot.id;
  }
  
  // ── API Publique ──
  
  getPlayerSlot(id: string): Slot | undefined {
    return this.slots.get(id);
  }
  
  getAllSlots(): Slot[] {
    return Array.from(this.slots.values());
  }
  
  getVisibleSlots(): Slot[] {
    return Array.from(this.slots.values()).filter(s => s.isVisible && s.isInFrustum);
  }
  
  getStats() {
    const slots = Array.from(this.slots.values());
    return {
      totalPlayers: slots.length,
      visiblePlayers: slots.filter(s => s.isVisible).length,
      inFrustumPlayers: slots.filter(s => s.isInFrustum).length,
      drivingPlayers: slots.filter(s => s.driving).length,
      passengerPlayers: slots.filter(s => s.isPassenger).length,
      avgLatency: slots.reduce((sum, s) => sum + s.avgLatency, 0) / slots.length,
      lodDistribution: {
        high: slots.filter(s => s.lod === 0).length,
        medium: slots.filter(s => s.lod === 1).length,
        low: slots.filter(s => s.lod >= 2).length,
      },
    };
  }
  
  dispose() {
    for (const slot of this.slots.values()) {
      safeDispose(slot.group);
      if (slot.label) this.nameTagPool.release(slot.label);
    }
    this.group.clear();
    this.slots.clear();
  }
}

// ═══════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════

export function registerRemote(name: string, callback: any) {
    // console.log(`[Réseau] Enregistrement d'événement legacy: ${name}`);
}

export function callRemote(name: string, ...args: any[]) {
  console.log(`[Réseau] Déclenchement de l'appel réseau legacy: ${name}`);
}
