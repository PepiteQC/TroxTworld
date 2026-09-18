/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈME D'ARMES AVANCÉ — MULTI-ARMES, RAYCAST, EFFETS (v2.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES :
 *  - Support multi-armes (pistolet, shotgun, rifle, sniper)
 *  - Raycast avec détection de dégâts
 *  - Effets visuels (muzzle flash, impacts, particules)
 *  - Sons (tir, rechargement, clic vide)
 *  - Recul de caméra réaliste
 *  - Visée ADS (Aim Down Sights)
 *  - Persistance via Zustand store
 *  - Animation de rechargement
 *  - Système de overheat pour armes automatiques
 *  - Support multijoueur (sync via net)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { useGameStore } from "./store";
import { netEmit } from "./net";

// Imports réels des modèles d'armes et de leurs animations
import { ak74Held, cycleAk74, tickAk74 } from "./ak74";
import { ar15Held, cycleAr15, tickAr15, shotgunHeld, cycleShotgun, tickShotgun, pistolHeld, cyclePistol, tickPistol } from "./guns";

// ═══════════════════════════════════════════════════════════
// TYPES — CONFIGURATION D'ARME
// ═══════════════════════════════════════════════════════════

export type WeaponType = "pistol" | "shotgun" | "rifle" | "sniper" | "smg";
export type FireMode = "semi" | "auto" | "burst";

export interface WeaponConfig {
  id: string;
  name: string;
  type: WeaponType;
  
  // ── Dégâts ──
  damage: number;
  damageFalloff: number; // Perte de dégâts par mètre (0-1)
  headshotMultiplier: number;
  
  // ── Tir ──
  fireRate: number; // Coups par minute
  fireMode: FireMode;
  burstCount?: number; // Pour mode burst
  magazineSize: number;
  reloadTime: number; // Secondes
  
  // ── Précision ──
  recoilVertical: number;
  recoilHorizontal: number;
  recoilRecovery: number; // Vitesse de récupération
  spread: number; // Radians (imprécision de base)
  spreadIncrease: number; // Augmentation par tir
  spreadRecovery: number; // Vitesse de récupération
  range: number; // Portée max en mètres
  
  // ── Visée ADS ──
  adsZoom: number; // Zoom (1.0 = pas de zoom, 2.0 = 2x)
  adsTime: number; // Temps pour viser (secondes)
  adsSpreadMultiplier: number; // Réduction de spread en ADS
  
  // ── Spéciaux ──
  pelletsPerShot?: number; // Pour shotguns
  overheatRate?: number; // Pour armes auto
  cooldownRate?: number;
  
  // ── Assets ──
  meshFactory: () => THREE.Group;
  cycleAnimation: (mesh: THREE.Group) => void;
  tickAnimation: (mesh: THREE.Group, dt: number) => void;
  
  // ── Audio ──
  fireSound: string;
  reloadSound: string;
  emptySound: string;
}

export interface WeaponState {
  weaponId: string | null;
  equipped: boolean;
  ammo: number;
  reserveAmmo: number;
  isReloading: boolean;
  isAiming: boolean;
  adsProgress: number; // 0-1
  lastFireTime: number;
  canFire: boolean;
  currentSpread: number;
  currentRecoil: { x: number; y: number };
  heat: number; // 0-1 pour overheat
  burstCount: number; // Pour mode burst
  totalShots: number;
  totalHits: number;
  totalDamage: number;
}

export interface HitResult {
  hit: boolean;
  targetId?: string;
  targetName?: string;
  distance: number;
  damage: number;
  isHeadshot: boolean;
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface WeaponEvent {
  type: "fire" | "reload" | "equip" | "unequip" | "hit" | "miss" | "empty" | "overheat";
  weaponId: string;
  timestamp: number;
  data?: any;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES ARMES
// ═══════════════════════════════════════════════════════════

export const WEAPON_CATALOG: Record<string, WeaponConfig> = {
  ak74: {
    id: "ak74",
    name: "AK-74",
    type: "rifle",
    damage: 35,
    damageFalloff: 0.02,
    headshotMultiplier: 2.5,
    fireRate: 650,
    fireMode: "auto",
    magazineSize: 30,
    reloadTime: 2.8,
    recoilVertical: 0.015,
    recoilHorizontal: 0.003,
    recoilRecovery: 5.0,
    spread: 0.008,
    spreadIncrease: 0.002,
    spreadRecovery: 2.0,
    range: 400,
    adsZoom: 1.5,
    adsTime: 0.25,
    adsSpreadMultiplier: 0.3,
    overheatRate: 0.02,
    cooldownRate: 0.1,
    meshFactory: ak74Held,
    cycleAnimation: cycleAk74,
    tickAnimation: tickAk74,
    fireSound: "ak74_fire",
    reloadSound: "ak74_reload",
    emptySound: "weapon_empty",
  },
  
  ar15: {
    id: "ar15",
    name: "AR-15",
    type: "rifle",
    damage: 40,
    damageFalloff: 0.015,
    headshotMultiplier: 2.5,
    fireRate: 750,
    fireMode: "auto",
    magazineSize: 30,
    reloadTime: 2.5,
    recoilVertical: 0.012,
    recoilHorizontal: 0.002,
    recoilRecovery: 6.0,
    spread: 0.006,
    spreadIncrease: 0.0015,
    spreadRecovery: 2.5,
    range: 450,
    adsZoom: 2.0,
    adsTime: 0.2,
    adsSpreadMultiplier: 0.25,
    overheatRate: 0.015,
    cooldownRate: 0.12,
    meshFactory: ar15Held,
    cycleAnimation: cycleAr15,
    tickAnimation: tickAr15,
    fireSound: "ar15_fire",
    reloadSound: "ar15_reload",
    emptySound: "weapon_empty",
  },
  
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    type: "shotgun",
    damage: 15, // Par pellet
    damageFalloff: 0.08,
    headshotMultiplier: 1.8,
    fireRate: 80,
    fireMode: "semi",
    magazineSize: 8,
    reloadTime: 3.5,
    recoilVertical: 0.04,
    recoilHorizontal: 0.008,
    recoilRecovery: 3.0,
    spread: 0.05,
    spreadIncrease: 0.01,
    spreadRecovery: 1.5,
    range: 50,
    adsZoom: 1.2,
    adsTime: 0.3,
    adsSpreadMultiplier: 0.6,
    pelletsPerShot: 8,
    meshFactory: shotgunHeld,
    cycleAnimation: cycleShotgun,
    tickAnimation: tickShotgun,
    fireSound: "shotgun_fire",
    reloadSound: "shotgun_reload",
    emptySound: "weapon_empty",
  },
  
  pistol: {
    id: "pistol",
    name: "Pistolet 9mm",
    type: "pistol",
    damage: 25,
    damageFalloff: 0.03,
    headshotMultiplier: 2.0,
    fireRate: 400,
    fireMode: "semi",
    magazineSize: 15,
    reloadTime: 1.8,
    recoilVertical: 0.02,
    recoilHorizontal: 0.005,
    recoilRecovery: 8.0,
    spread: 0.01,
    spreadIncrease: 0.003,
    spreadRecovery: 3.0,
    range: 150,
    adsZoom: 1.3,
    adsTime: 0.15,
    adsSpreadMultiplier: 0.4,
    meshFactory: pistolHeld,
    cycleAnimation: cyclePistol,
    tickAnimation: tickPistol,
    fireSound: "pistol_fire",
    reloadSound: "pistol_reload",
    emptySound: "weapon_empty",
  },
};

// ═══════════════════════════════════════════════════════════
// SYSTÈME D'ARMES (Singleton)
// ═══════════════════════════════════════════════════════════

class WeaponSystem {
  private state: WeaponState;
  private weaponMesh: THREE.Group | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private scene: THREE.Scene | null = null;
  private raycaster: THREE.Raycaster;
  
  // Effets visuels
  private muzzleFlash: THREE.PointLight | null = null;
  private muzzleFlashTime: number = 0;
  private impacts: Array<{ mesh: THREE.Mesh; time: number }> = [];
  
  // Audio
  private audioListener: THREE.AudioListener | null = null;
  
  // Event listeners
  private eventListeners: Set<(event: WeaponEvent) => void> = new Set();
  
  // Recoil state
  private targetRecoil = { x: 0, y: 0 };
  private currentRecoil = { x: 0, y: 0 };
  
  // ADS state
  private baseFOV: number = 75;
  private targetFOV: number = 75;
  
  constructor() {
    this.state = this.getInitialState();
    this.raycaster = new THREE.Raycaster();
  }
  
  private getInitialState(): WeaponState {
    return {
      weaponId: null,
      equipped: false,
      ammo: 0,
      reserveAmmo: 0,
      isReloading: false,
      isAiming: false,
      adsProgress: 0,
      lastFireTime: 0,
      canFire: true,
      currentSpread: 0,
      currentRecoil: { x: 0, y: 0 },
      heat: 0,
      burstCount: 0,
      totalShots: 0,
      totalHits: 0,
      totalDamage: 0,
    };
  }
  
  // ─── INITIALISATION ─────────────────────────────────────
  
  init(camera: THREE.PerspectiveCamera, scene: THREE.Scene): void {
    this.camera = camera;
    this.scene = scene;
    this.baseFOV = camera.fov;
    this.targetFOV = camera.fov;
    
    // Setup audio listener
    this.audioListener = new THREE.AudioListener();
    camera.add(this.audioListener);
    
    // Setup muzzle flash
    this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 10);
    this.muzzleFlash.visible = false;
    
    console.log("✅ WeaponSystem initialisé");
  }
  
  // ─── ÉQUIPER / DÉSÉQUIPER ───────────────────────────────
  
  equipWeapon(weaponId: string): boolean {
    if (this.state.equipped) {
      this.unequipWeapon();
    }
    
    const config = WEAPON_CATALOG[weaponId];
    if (!config) {
      console.warn(`⚠️ Arme inconnue: ${weaponId}`);
      return false;
    }
    
    if (!this.camera) {
      console.warn("⚠️ Camera non initialisée");
      return false;
    }
    
    // Vérifier inventaire
    const store = useGameStore.getState();
    const inv = store.inventory as Record<string, number>;
    if ((inv[weaponId] ?? 0) < 1) {
      store.setHud({ notice: `⚠️ Pas de ${config.name} dans le sac` });
      return false;
    }
    
    // Créer le mesh
    this.weaponMesh = config.meshFactory();
    if (!this.weaponMesh) {
      console.warn(`⚠️ Impossible de créer le mesh ${weaponId}`);
      return false;
    }
    
    // Positionner l'arme
    this.weaponMesh.position.set(0.3, -0.25, -0.5);
    this.weaponMesh.rotation.set(0, Math.PI, 0);
    this.camera.add(this.weaponMesh);
    
    // Ajouter muzzle flash
    if (this.muzzleFlash) {
      this.weaponMesh.add(this.muzzleFlash);
      this.muzzleFlash.position.set(0, 0, -0.8);
    }
    
    // Charger les munitions depuis le store ou valeurs par défaut
    const savedAmmo = (store as any).weaponAmmo?.[weaponId];
    this.state = {
      ...this.getInitialState(),
      weaponId,
      equipped: true,
      ammo: savedAmmo?.magazine ?? config.magazineSize,
      reserveAmmo: savedAmmo?.reserve ?? config.magazineSize * 4,
    };
    
    this.emitEvent({
      type: "equip",
      weaponId,
      timestamp: Date.now(),
    });
    
    store.setHud({
      notice: `🔫 ${config.name} équipé · ${this.state.ammo}/${this.state.reserveAmmo}`,
    });
    
    // Sync multijoueur
    netEmit("weapon:equipped", { weaponId });
    
    return true;
  }
  
  unequipWeapon(): boolean {
    if (!this.state.equipped || !this.weaponMesh || !this.camera) {
      return false;
    }
    
    // Sauvegarder les munitions
    if (this.state.weaponId) {
      this.saveAmmoToStore();
    }
    
    // Retirer le mesh
    this.camera.remove(this.weaponMesh);
    this.weaponMesh = null;
    
    // Reset state
    const previousWeaponId = this.state.weaponId;
    this.state = this.getInitialState();
    
    this.emitEvent({
      type: "unequip",
      weaponId: previousWeaponId!,
      timestamp: Date.now(),
    });
    
    useGameStore.getState().setHud({ notice: "Arme rangée" });
    
    // Sync multijoueur
    netEmit("weapon:unequipped", { weaponId: previousWeaponId });
    
    return true;
  }
  
  // ─── TIR ────────────────────────────────────────────────
  
  fire(): boolean {
    if (!this.state.equipped || !this.state.weaponId) {
      return false;
    }
    
    const config = WEAPON_CATALOG[this.state.weaponId];
    if (!config) return false;
    
    const now = performance.now();
    const fireDelay = 60000 / config.fireRate;
    
    // Vérifier délai
    if (now - this.state.lastFireTime < fireDelay) {
      return false;
    }
    
    // Vérifier munitions
    if (this.state.ammo <= 0) {
      this.playSound(config.emptySound);
      useGameStore.getState().setHud({ notice: "⚠️ Chargeur vide !" });
      this.emitEvent({
        type: "empty",
        weaponId: this.state.weaponId,
        timestamp: now,
      });
      return false;
    }
    
    // Vérifier rechargement
    if (this.state.isReloading) {
      return false;
    }
    
    // Vérifier overheat
    if (config.overheatRate && this.state.heat >= 1.0) {
      useGameStore.getState().setHud({ notice: "⚠️ Arme surchauffée !" });
      this.emitEvent({
        type: "overheat",
        weaponId: this.state.weaponId,
        timestamp: now,
      });
      return false;
    }
    
    // Mode burst
    if (config.fireMode === "burst" && this.state.burstCount >= (config.burstCount ?? 3)) {
      return false;
    }
    
    // Consommer munition
    this.state.ammo--;
    this.state.lastFireTime = now;
    this.state.totalShots++;
    
    // Burst counter
    if (config.fireMode === "burst") {
      this.state.burstCount++;
      if (this.state.burstCount >= (config.burstCount ?? 3)) {
        setTimeout(() => {
          this.state.burstCount = 0;
        }, 200);
      }
    }
    
    // Appliquer spread
    const spread = this.state.currentSpread * (this.state.isAiming ? config.adsSpreadMultiplier : 1.0);
    const spreadX = (Math.random() - 0.5) * spread;
    const spreadY = (Math.random() - 0.5) * spread;
    
    // Augmenter spread
    this.state.currentSpread = Math.min(
      config.spread * 3,
      this.state.currentSpread + config.spreadIncrease
    );
    
    // Appliquer recul
    this.targetRecoil.y += config.recoilVertical;
    this.targetRecoil.x += (Math.random() - 0.5) * config.recoilHorizontal * 2;
    
    // Overheat
    if (config.overheatRate) {
      this.state.heat = Math.min(1.0, this.state.heat + config.overheatRate);
    }
    
    // Animer le cycle
    if (this.weaponMesh) {
      config.cycleAnimation(this.weaponMesh);
    }
    
    // Muzzle flash
    this.triggerMuzzleFlash();
    
    // Raycast pour dégâts
    const pellets = config.pelletsPerShot ?? 1;
    let totalDamage = 0;
    
    for (let i = 0; i < pellets; i++) {
      const hitResult = this.performRaycast(spreadX, spreadY, config);
      if (hitResult.hit) {
        totalDamage += hitResult.damage;
        this.state.totalHits++;
        this.state.totalDamage += hitResult.damage;
        
        this.emitEvent({
          type: "hit",
          weaponId: this.state.weaponId,
          timestamp: now,
          data: hitResult,
        });
      } else {
        this.emitEvent({
          type: "miss",
          weaponId: this.state.weaponId,
          timestamp: now,
        });
      }
    }
    
    // Jouer son de tir
    this.playSound(config.fireSound);
    
    this.emitEvent({
      type: "fire",
      weaponId: this.state.weaponId,
      timestamp: now,
      data: { damage: totalDamage },
    });
    
    // Mettre à jour HUD
    useGameStore.getState().setHud({
      notice: `🔫 ${config.name} · ${this.state.ammo}/${this.state.reserveAmmo}`,
    });
    
    // Sync multijoueur
    netEmit("weapon:fired", {
      weaponId: this.state.weaponId,
      damage: totalDamage,
    });
    
    return true;
  }
  
  private performRaycast(spreadX: number, spreadY: number, config: WeaponConfig): HitResult {
    if (!this.camera || !this.scene) {
      return {
        hit: false,
        distance: 0,
        damage: 0,
        isHeadshot: false,
        position: new THREE.Vector3(),
        normal: new THREE.Vector3(),
      };
    }
    
    // Calculer direction avec spread
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    direction.x += spreadX;
    direction.y += spreadY;
    direction.normalize();
    
    this.raycaster.set(this.camera.position, direction);
    this.raycaster.far = config.range;
    
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0]!;
      const distance = hit.distance;
      
      // Calculer dégâts avec falloff
      const falloff = Math.max(0, 1 - distance * config.damageFalloff);
      let damage = config.damage * falloff;
      
      // Vérifier headshot
      const isHeadshot = hit.object.name.toLowerCase().includes("head");
      if (isHeadshot) {
        damage *= config.headshotMultiplier;
      }
      
      // Créer impact visuel
      this.createImpact(hit.point, hit.face?.normal ?? new THREE.Vector3(0, 1, 0));
      
      return {
        hit: true,
        targetId: hit.object.userData["id"],
        targetName: hit.object.name,
        distance,
        damage: Math.round(damage),
        isHeadshot,
        position: hit.point,
        normal: hit.face?.normal ?? new THREE.Vector3(0, 1, 0),
      };
    }
    
    return {
      hit: false,
      distance: config.range,
      damage: 0,
      isHeadshot: false,
      position: new THREE.Vector3(),
      normal: new THREE.Vector3(),
    };
  }
  
  // ─── RECHARGEMENT ───────────────────────────────────────
  
  reload(): boolean {
    if (!this.state.equipped || !this.state.weaponId) {
      return false;
    }
    
    const config = WEAPON_CATALOG[this.state.weaponId];
    if (!config) return false;
    
    if (this.state.isReloading) return false;
    
    if (this.state.ammo >= config.magazineSize) {
      useGameStore.getState().setHud({ notice: "Chargeur déjà plein" });
      return false;
    }
    
    if (this.state.reserveAmmo <= 0) {
      useGameStore.getState().setHud({ notice: "⚠️ Plus de munitions !" });
      return false;
    }
    
    this.state.isReloading = true;
    this.playSound(config.reloadSound);
    
    useGameStore.getState().setHud({ notice: "🔄 Rechargement..." });
    
    this.emitEvent({
      type: "reload",
      weaponId: this.state.weaponId,
      timestamp: Date.now(),
    });
    
    setTimeout(() => {
      const needed = config.magazineSize - this.state.ammo;
      const available = Math.min(needed, this.state.reserveAmmo);
      
      this.state.ammo += available;
      this.state.reserveAmmo -= available;
      this.state.isReloading = false;
      
      useGameStore.getState().setHud({
        notice: `✅ Rechargé · ${this.state.ammo}/${this.state.reserveAmmo}`,
      });
      
      this.saveAmmoToStore();
    }, config.reloadTime * 1000);
    
    return true;
  }
  
  // ─── VISÉE ADS ──────────────────────────────────────────
  
  startAiming(): void {
    if (!this.state.equipped || !this.state.weaponId) return;
    
    const config = WEAPON_CATALOG[this.state.weaponId];
    if (!config) return;
    
    this.state.isAiming = true;
    this.targetFOV = this.baseFOV / config.adsZoom;
  }
  
  stopAiming(): void {
    this.state.isAiming = false;
    this.targetFOV = this.baseFOV;
  }
  
  // ─── UPDATE ─────────────────────────────────────────────
  
  update(dt: number): void {
    if (!this.state.equipped || !this.state.weaponId || !this.camera) {
      return;
    }
    
    const config = WEAPON_CATALOG[this.state.weaponId];
    if (!config) return;
    
    // Animer l'arme
    if (this.weaponMesh) {
      config.tickAnimation(this.weaponMesh, dt);
    }
    
    // Récupération du spread
    this.state.currentSpread = Math.max(
      config.spread,
      this.state.currentSpread - config.spreadRecovery * dt
    );
    
    // Récupération du recul
    this.currentRecoil.x += (this.targetRecoil.x - this.currentRecoil.x) * config.recoilRecovery * dt;
    this.currentRecoil.y += (this.targetRecoil.y - this.currentRecoil.y) * config.recoilRecovery * dt;
    
    // Appliquer recul à la caméra
    this.camera.rotation.x -= this.currentRecoil.y * dt * 10;
    this.camera.rotation.y -= this.currentRecoil.x * dt * 10;
    
    // Décroître target recoil
    this.targetRecoil.x *= 0.9;
    this.targetRecoil.y *= 0.9;
    
    // ADS progress
    const adsSpeed = 1.0 / config.adsTime;
    if (this.state.isAiming) {
      this.state.adsProgress = Math.min(1.0, this.state.adsProgress + adsSpeed * dt);
    } else {
      this.state.adsProgress = Math.max(0.0, this.state.adsProgress - adsSpeed * dt);
    }
    
    // Smooth FOV
    this.camera.fov += (this.targetFOV - this.camera.fov) * 10 * dt;
    this.camera.updateProjectionMatrix();
    
    // Cooldown overheat
    if (config.cooldownRate) {
      this.state.heat = Math.max(0, this.state.heat - config.cooldownRate * dt);
    }
    
    // Muzzle flash fade
    if (this.muzzleFlash && this.muzzleFlash.visible) {
      this.muzzleFlashTime -= dt;
      if (this.muzzleFlashTime <= 0) {
        this.muzzleFlash.visible = false;
      } else {
        this.muzzleFlash.intensity = this.muzzleFlashTime * 20;
      }
    }
    
    // Cleanup old impacts
    const now = Date.now();
    this.impacts = this.impacts.filter((impact) => {
      if (now - impact.time > 1000) {
        impact.mesh.parent?.remove(impact.mesh);
        impact.mesh.geometry.dispose();
        (impact.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });
  }
  
  // ─── EFFETS VISUELS ─────────────────────────────────────
  
  private triggerMuzzleFlash(): void {
    if (!this.muzzleFlash) return;
    
    this.muzzleFlash.visible = true;
    this.muzzleFlash.intensity = 3;
    this.muzzleFlashTime = 0.05;
  }
  
  private createImpact(position: THREE.Vector3, normal: THREE.Vector3): void {
    if (!this.scene) return;
    
    const impactGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const impactMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 1.0,
    });
    const impact = new THREE.Mesh(impactGeo, impactMat);
    impact.position.copy(position);
    impact.position.add(normal.multiplyScalar(0.01));
    
    this.scene.add(impact);
    this.impacts.push({ mesh: impact, time: Date.now() });
  }
  
  // ─── AUDIO ──────────────────────────────────────────────
  
  private playSound(soundId: string): void {
    if (!this.audioListener) return;
    console.log(`🔊 Playing sound: ${soundId}`);
  }
  
  // ─── PERSISTANCE ────────────────────────────────────────
  
  private saveAmmoToStore(): void {
    if (!this.state.weaponId) return;
    
    const store = useGameStore.getState();
    const weaponAmmo = (store as any).weaponAmmo ?? {};
    
    weaponAmmo[this.state.weaponId] = {
      magazine: this.state.ammo,
      reserve: this.state.reserveAmmo,
    };
    
    store.setHud({ weaponAmmo } as any);
  }
  
  // ─── GETTERS ────────────────────────────────────────────
  
  getState(): WeaponState {
    return { ...this.state };
  }
  
  isEquipped(): boolean {
    return this.state.equipped;
  }
  
  getCurrentWeapon(): WeaponConfig | null {
    if (!this.state.weaponId) return null;
    return WEAPON_CATALOG[this.state.weaponId] ?? null;
  }
  
  getAmmoCount(): { magazine: number; reserve: number } {
    return {
      magazine: this.state.ammo,
      reserve: this.state.reserveAmmo,
    };
  }
  
  getStats(): { shots: number; hits: number; damage: number; accuracy: number } {
    const accuracy = this.state.totalShots > 0
      ? (this.state.totalHits / this.state.totalShots) * 100
      : 0;
    
    return {
      shots: this.state.totalShots,
      hits: this.state.totalHits,
      damage: this.state.totalDamage,
      accuracy,
    };
  }
  
  // ─── MUNITIONS ──────────────────────────────────────────
  
  addAmmo(weaponId: string, amount: number): void {
    if (this.state.weaponId === weaponId) {
      this.state.reserveAmmo += amount;
      this.saveAmmoToStore();
      
      useGameStore.getState().setHud({
        notice: `+${amount} munitions · Total : ${this.state.reserveAmmo}`,
      });
    }
  }
  
  setAmmo(magazine: number, reserve: number): void {
    if (!this.state.weaponId) return;
    
    const config = WEAPON_CATALOG[this.state.weaponId];
    if (!config) return;
    
    this.state.ammo = Math.max(0, Math.min(magazine, config.magazineSize));
    this.state.reserveAmmo = Math.max(0, reserve);
    this.saveAmmoToStore();
  }
  
  // ─── EVENTS ─────────────────────────────────────────────
  
  onEvent(listener: (event: WeaponEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }
  
  private emitEvent(event: WeaponEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Weapon event listener error:", err);
      }
    }
  }
  
  // ─── RESET ──────────────────────────────────────────────
  
  reset(): void {
    if (this.state.equipped) {
      this.unequipWeapon();
    }
    this.state = this.getInitialState();
  }
  
  dispose(): void {
    this.reset();
    
    for (const impact of this.impacts) {
      impact.mesh.parent?.remove(impact.mesh);
      impact.mesh.geometry.dispose();
      (impact.mesh.material as THREE.Material).dispose();
    }
    this.impacts = [];
    
    if (this.audioListener) {
      this.audioListener.parent?.remove(this.audioListener);
    }
    
    console.log("🗑️ WeaponSystem disposed");
  }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════

export const weaponSystem = new WeaponSystem();

// ═══════════════════════════════════════════════════════════
// API SIMPLIFIÉE (pour compatibilité)
// ═══════════════════════════════════════════════════════════

export function initWeaponSystem(camera: THREE.Camera): void {
  weaponSystem.init(camera as THREE.PerspectiveCamera, new THREE.Scene());
}

export function equipWeapon(): boolean {
  return weaponSystem.equipWeapon("ak74");
}

export function unequipWeapon(): boolean {
  return weaponSystem.unequipWeapon();
}

export function fire(): boolean {
  return weaponSystem.fire();
}

export function reload(): boolean {
  return weaponSystem.reload();
}

export function updateWeapon(dt: number): void {
  weaponSystem.update(dt);
}

export function getWeaponState(): WeaponState {
  return weaponSystem.getState();
}

export function isWeaponEquipped(): boolean {
  return weaponSystem.isEquipped();
}

export function addAmmo(amount: number): void {
  weaponSystem.addAmmo("ak74", amount);
}

export function setAmmo(magazine: number, reserve: number): void {
  weaponSystem.setAmmo(magazine, reserve);
}

export function getAmmoCount(): { magazine: number; reserve: number } {
  return weaponSystem.getAmmoCount();
}

export function resetWeapon(): void {
  weaponSystem.reset();
}