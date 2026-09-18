/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR PHYSIQUE ET BIOMÉCANIQUE DU PERSONNAGE — QUEBEC RP & MULTI
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Gestion avancée des déplacements à pied de l'avatar (Walker) :
 *  - Moteur cinématique avec friction et inertie (accélération/décélération fluides)
 *  - Physique de dérapage et perte d'adhérence sur surfaces glacées (glace noire)
 *  - Transfert de masse dynamique (le tronc se penche selon la vélocité et le sac)
 *  - Grelottement procédural à haute fréquence en cas d'hypothermie clinique
 *  - Amortissement de la suspension verticale (Y) pour éviter les sauts brusques
 *  - Export des données réseau pour Colyseus
 * ═════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { fillPlayer, pulseAura, type Appearance, DEFAULT_APPEARANCE } from "./character";
import { clamp } from "./rng";
import { applyPackLoad, buildBackpack, walkLoadMul } from "./backpack";
import { buildHeldTool } from "./tools";
import { getTerrainHeight, getSurfaceAt, inWorld, withIce, WORLD } from "./worlddata";
import { resolveWalls, type WallBox } from "./interiors";
import type { Actions } from "./input";
import { tickMixer } from "./fbx";
import { tickCarabine } from "./carabine";
import { tickAk74 } from "./ak74";
import { tickInjured, playInjuredOn, clearInjuredOn, pickInjuredClip } from "./injured";
import { tickGuns } from "./guns";
import { useGameStore } from "./store";
import { physics } from "./physics";
import { quebecSeasons } from "./seasons";
import { applyGesture, detachPhoneProp, locksMovement, type RpGesture } from "./gestures";
import { CharacterAnimationManager } from "./characterAnim";

export class Walker {
  // ─── LOCALISATION MONDE ──────────────────────────────────────────────────
  x = 0;
  y = 1;
  z = 0;
  yaw = 0;
  speed = 0;                    // Vitesse longitudinale interpolée
  headingX = 0;
  headingZ = -1;
  group: THREE.Group;
  bob = 0;                      // Phase du balancement de marche
  indoor = false;
  floorY = 0;
  walls: WallBox[] = [];

  // ─── DYNAMIQUES DE GLISSE & INERTIE ──────────────────────────────────────
  private slideX = 0;           // Force d'inertie latérale (dérapage sur glace)
  private slideZ = 0;

  // ─── EFFETS POSTURAUX (Lean & Shiver) ────────────────────────────────────
  private leanPitch = 0;        // Inclinaison vers l'avant (poids/accélération)
  private leanRoll = 0;         // Roulis dans les virages
  private shiverPhase = 0;      // Oscillation haute fréquence (hypothermie)

  // ─── INVENTAIRE & ÉQUIPEMENT ─────────────────────────────────────────────
  look: Appearance = { ...DEFAULT_APPEARANCE };
  heldId: string | null = null;
  packId: string | null = null;
  fill = 0;                     // Taux de remplissage du sac (0.0 à 1.0)
  vitalMul = 1;                 // Modificateur de fatigue/santé (vitals)
  reach = 0;
  fly = false;
  noclip = false;
  airVel = 0;

  // ─── ANIMATIONS ET GESTUELLES RP ─────────────────────────────────────────
  gesture: RpGesture = "none";
  gestureAge = 0;
  gestureTtl = 0;
  anim: CharacterAnimationManager | null = null;

  constructor(look: Appearance = DEFAULT_APPEARANCE) {
    this.group = new THREE.Group();
    this.applyLook(look);
    this.group.visible = false;
  }

  applyLook(look: Appearance) {
    const clip = this.group.userData.injuredClip as string | null | undefined;
    const manual = !!this.group.userData.injuredManual;
    this.look = look;
    fillPlayer(this.group, look);
    this.anim = CharacterAnimationManager.attach(this.group);
    this.refreshHeld();
    this.refreshPack();
    if (this.gesture === "phone") applyGesture(this.group, "phone", this.gestureAge);
    if (clip) playInjuredOn(this.group, clip, manual);
  }

  setHeld(id: string | null) {
    this.heldId = id;
    this.refreshHeld();
  }

  setPack(id: string | null) {
    this.packId = id;
    this.refreshPack();
    applyPackLoad(this.group, this.fill);
  }

  setLoad(fill: number) {
    this.fill = fill;
    applyPackLoad(this.group, fill);
  }

  private refreshHeld() {
    const old = this.group.getObjectByName("held-tool");
    if (old) this.group.remove(old);
    if (!this.heldId) return;
    const mesh = buildHeldTool(this.heldId);
    if (mesh) this.group.add(mesh);
  }

  private refreshPack() {
    const old = this.group.getObjectByName("backpack");
    if (old) this.group.remove(old);
    if (!this.packId) return;
    const mesh = buildBackpack(this.packId);
    if (mesh) this.group.add(mesh);
  }

  place(x: number, z: number, yaw: number, indoor = false, floorY = 0, walls: WallBox[] = []) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.speed = 0;
    this.slideX = 0;
    this.slideZ = 0;
    this.indoor = indoor;
    this.floorY = floorY;
    this.walls = walls;
    this.snap();
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
    this.speed = 0;
  }

  snap() {
    this.y = this.indoor ? this.floorY + 0.02 : getTerrainHeight(this.x, this.z);
    this.updateHeading();
    this.sync();
  }

  updateHeading() {
    this.headingX = -Math.sin(this.yaw);
    this.headingZ = -Math.cos(this.yaw);
  }

  lookTurn(dx: number) {
    this.yaw += dx;
  }

  present(dt: number, elapsed: number) {
    this.yaw += dt * 0.5;
    this.updateHeading();
    this.sync(elapsed, dt);
  }

  setGesture(id: RpGesture, ttl = 0) {
    this.gesture = id;
    this.gestureAge = 0;
    this.gestureTtl = ttl;
    if (id !== "phone") detachPhoneProp(this.group);
  }

  slap(force: number) {
    this.airVel = Math.max(this.airVel, Math.max(2, force));
  }

  /** Mise à jour cinématique et physique complète du marcheur */
  update(dt: number, a: Actions, elapsed: number) {
    this.updateHeading();
    const st = useGameStore.getState();

    // Arrêt complet si figé par le serveur
    if (st.staffFrozen && !this.fly) {
      this.speed = 0;
      this.y = this.indoor ? this.floorY + 0.02 : getTerrainHeight(this.x, this.z);
      this.sync(elapsed, dt);
      return;
    }

    // Blocage si geste restrictif actif (ex: menotté, s'assoit)
    if (locksMovement(this.gesture) && this.gesture !== "surrender") {
      this.speed = 0;
      this.sync(elapsed, dt);
      return;
    }

    // ─── 1. CALCULS DES VITESSES ET ADHÉRENCE (SAAQ / Météo) ───────────────
    const heavy = this.fill > 0.85;
    const sprintFactor = a.boost && !heavy ? 1.65 : 1;
    
    // Détection de verglas ou de neige au sol
    const isIcy = !this.indoor && (
      quebecSeasons.isIcy() || 
      st.weather === "snow" || 
      st.weather === "storm" || 
      st.weather === "verglas" || 
      st.gridOutage?.kind === "verglas"
    );

    const surfaceSample = getSurfaceAt(this.x, this.z);
    const surfaceGrip = this.indoor ? 1 : withIce(surfaceSample, isIcy).walkMul;
    
    // Vitesse cible finale (m/s)
    const targetWalkSpeed = (this.indoor ? 3.0 : 4.2) * sprintFactor * surfaceGrip * walkLoadMul(this.fill) * this.vitalMul;
    const isReversing = a.brake > 0.1 && a.throttle < 0.1;
    const inputDirection = a.throttle - (isReversing ? a.brake : 0);
    const targetSpeed = inputDirection * targetWalkSpeed;

    // ─── 2. INERTIE PROGRESSIVE (Accélération / Décélération) ──────────────
    const frictionFactor = isIcy ? 2.5 : 8.5;
    this.speed += (targetSpeed - this.speed) * frictionFactor * dt;

    // Rotation angulaire (yaw)
    const turnSpeed = a.steer * (1.8 + Math.min(1, Math.abs(this.speed) / 3) * 0.6);
    this.yaw += turnSpeed * dt;
    this.updateHeading();

    // ─── 3. GLISSE SUR GLACE NOIRE (Drift mécanique à pied) ────────────────
    if (isIcy && Math.abs(turnSpeed) > 0.8 && Math.abs(this.speed) > 1.8) {
      const slideDirX = Math.cos(this.yaw);
      const slideDirZ = -Math.sin(this.yaw);
      const impulse = turnSpeed * this.speed * 0.12;
      this.slideX += slideDirX * impulse * dt;
      this.slideZ += slideDirZ * impulse * dt;
    }

    const slideDecel = isIcy ? 1.5 : 9.5;
    this.slideX *= Math.exp(-dt * slideDecel);
    this.slideZ *= Math.exp(-dt * slideDecel);

    const ox = this.x;
    const oz = this.z;

    this.x += (this.headingX * this.speed + this.slideX) * dt;
    this.z += (this.headingZ * this.speed + this.slideZ) * dt;

    // Vol (Noclip d'administration)
    if (this.fly) {
      const verticalInput = (a.boost ? 1 : 0) - (a.handbrake ? 1 : 0);
      this.y += verticalInput * 6.5 * dt;
    }

    // Évolution de la phase d'oscillation (bobbing)
    if (Math.abs(this.speed) > 0.15) {
      this.bob += dt * (8 + sprintFactor * 3.2);
    } else {
      this.bob += dt * 1.35;
    }

    // ─── 4. COLLISIONS ET SÉCURITÉ LIMITES ────────────────────────────────
    if (this.indoor && !this.noclip) {
      const resolved = resolveWalls(this.x, this.z, this.walls);
      this.x = resolved.x;
      this.z = resolved.z;
      if (!this.fly) this.y = this.floorY;
    } else if (!this.indoor) {
      if (!this.noclip && !inWorld(this.x, this.z)) {
        this.x = clamp(this.x, WORLD.minX + 24, WORLD.maxX - 24);
        this.z = clamp(this.z, WORLD.minZ + 24, WORLD.maxZ - 24);
      }
      
      if (!this.fly) {
        const targetTerrainY = getTerrainHeight(this.x, this.z);
        this.y += (targetTerrainY - this.y) * dt * 16;

        if (!this.noclip) {
          const collisionResolution = physics.correctWalker(ox, this.y, oz, this.x, this.y, this.z);
          this.x = collisionResolution.x;
          this.y = collisionResolution.y;
          this.z = collisionResolution.z;
        }
      }
    } else if (!this.fly) {
      this.y = this.floorY;
    }

    // ─── 5. GRAVITÉ ET COMPORTEMENT DE CHUTE ──────────────────────────────
    if (!this.fly && this.airVel > 0.05) {
      const groundLevel = this.indoor ? this.floorY + 0.02 : getTerrainHeight(this.x, this.z);
      this.y = Math.max(groundLevel, this.y + this.airVel * dt);
      this.airVel -= 28 * dt;
      if (this.y <= groundLevel + 0.02) {
        this.y = groundLevel;
        this.airVel = 0;
      }
    } else if (!this.fly) {
      this.airVel = 0;
    }

    // ─── 6. INTERPOLATION DES TRANSFERTS DE MASSE POSTURAUX ───────────────
    const desiredPitch = (this.speed > 0.1 ? 0.08 : -0.02) * (Math.abs(this.speed) / targetWalkSpeed) + (this.fill * 0.16);
    this.leanPitch += (desiredPitch - this.leanPitch) * dt * 6.0;

    const desiredRoll = -turnSpeed * 0.04 * (Math.abs(this.speed) / targetWalkSpeed);
    this.leanRoll += (desiredRoll - this.leanRoll) * dt * 6.0;

    this.sync(elapsed, dt);
  }

  private sync(elapsed = 0, dt = 0.016) {
    const sitDrop = this.gesture === "sit" ? 0.42 : 0;
    this.group.position.set(this.x, this.y - sitDrop, this.z);
    this.group.rotation.set(this.leanPitch, this.yaw, this.leanRoll);

    const isMoving = Math.abs(this.speed) > 0.12;
    const animSpeed = isMoving ? Math.max(0.55, Math.min(1.85, Math.abs(this.speed) / 2.75)) : 0;
    
    tickMixer(this.group, dt, animSpeed);
    tickCarabine(this.group, dt);
    tickAk74(this.group, dt);
    tickInjured(this.group, dt, 0);
    tickGuns(this.group);
    
    this.gestureAge += dt;
    if (this.gestureTtl > 0) {
      this.gestureTtl -= dt;
      if (this.gestureTtl <= 0) this.setGesture("none");
    }

    const usingMixer = !!this.anim?.bound && this.gesture === "none";
    this.anim?.setEnabled(usingMixer);
    this.anim?.update(dt, Math.abs(this.speed));

    const amp = isMoving && this.gesture === "none" ? 0.22 : 0.04;
    
    // ─── GRELOTTEMENT DE FROID (Hypothermie RP) ───────────────────────────
    const st = useGameStore.getState();
    let shiverOffset = 0;
    
    const hasVitals = st.surv && typeof st.surv.bodyTemp === "number";
    const bodyTemp = hasVitals ? st.surv.bodyTemp : 37.0;
    
    if (bodyTemp < 35.0 || st.isHypothermic) {
      this.shiverPhase += dt * 38.0;
      const severity = clamp((37.0 - bodyTemp) / 5.0, 0.1, 1.0);
      shiverOffset = Math.sin(this.shiverPhase) * 0.05 * severity;
    }

    if (!usingMixer) {
      this.group.traverse((obj) => {
        if (obj.userData.leg) {
          obj.rotation.x = Math.sin(this.bob + (obj.userData.leg > 0 ? 0 : Math.PI)) * amp;
        }
        if (obj.userData.arm) {
          const armSign = obj.userData.arm > 0 ? 1 : -1;
          const base = Math.sin(this.bob + (obj.userData.arm > 0 ? Math.PI : 0)) * amp * 0.7;
          const extra = obj.userData.arm > 0 ? -this.reach * 1.05 : 0;
          
          obj.rotation.x = base + extra + shiverOffset * 0.4;
          obj.rotation.z = (obj.rotation.z || 0) + shiverOffset * 0.2 * armSign;
        }
        if (obj.name === "head" || obj.name === "neck") {
          obj.rotation.z = shiverOffset * 0.35;
          obj.rotation.y = (obj.rotation.y || 0) + shiverOffset * 0.15;
        }
        if (obj.userData.cloak) {
          obj.rotation.x = Math.sin(this.bob * 0.45) * (0.04 + amp * 0.15);
        }
      });
    } else {
      this.group.traverse((obj) => {
        if (obj.userData.cloak) {
          obj.rotation.x = Math.sin(this.bob * 0.45) * (0.04 + amp * 0.15);
        }
        if (shiverOffset !== 0 && (obj.name === "head" || obj.name.includes("Hand"))) {
          obj.rotation.z += shiverOffset * 0.15;
        }
      });
    }

    if (this.gesture !== "none") {
      applyGesture(this.group, this.gesture, this.gestureAge);
    }
    
    const sword = this.group.getObjectByName("hero-sword");
    if (sword) sword.visible = !this.heldId;
    pulseAura(this.group, elapsed);
  }

  playHurt(clip: string) {
    playInjuredOn(this.group, clip, true);
  }

  clearHurt() {
    clearInjuredOn(this.group);
  }

  syncHurt(health: number, energy: number) {
    if (this.group.userData.injuredManual) return;
    const clip = pickInjuredClip(health, energy, Math.abs(this.speed) > 0.4);
    const cur = this.group.userData.injuredClip as string | null;
    if (!clip) {
      if (cur) this.clearHurt();
      return;
    }
    if (cur === clip) return;
    playInjuredOn(this.group, clip, false);
  }

  /**
   * Payload réseau pour synchroniser le joueur avec Colyseus
   */
  getNetworkPayload() {
    return {
      x: Number(this.x.toFixed(2)),
      y: Number(this.y.toFixed(2)),
      z: Number(this.z.toFixed(2)),
      yaw: Number(this.yaw.toFixed(3)),
      speed: Number(this.speed.toFixed(2)),
      gesture: this.gesture,
      heldId: this.heldId,
      packId: this.packId,
      indoor: this.indoor,
    };
  }
}