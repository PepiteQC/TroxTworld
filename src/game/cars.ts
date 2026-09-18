/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🚗 PHYSIQUE VÉHICULES QUÉBÉCOIS & CONDUITE HIVERNALE (v4.0)
 * Fichier: src/game/cars.ts
 * Architecture : Rendu PBR carrosserie, Phares volumétriques, Gyrophares SQ,
 *                Physique verglas Route 138, Sons moteur 3D synthétisés.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { getGeo } from "./geometries";
import { matLib, QC_PALETTE } from "./materials";

// ─────────────────────────────────────────────────────────────────────────────
// §1 — TYPES DE VÉHICULES QUÉBÉCOIS
// ─────────────────────────────────────────────────────────────────────────────

export type VehicleClass = "civilian" | "police_sq" | "ems" | "fire" | "mtq_plow" | "truck";
export type TireType = "summer" | "all_season" | "winter" | "studded_winter";
export type GroundSurface = "asphalt" | "wet" | "snow" | "ice_black" | "dirt" | "gravel";

export interface TireProperties {
  id: TireType;
  name: string;
  gripAsphalt: number;      // 0.0 (glissant) à 1.0 (parfait)
  gripWet: number;
  gripSnow: number;
  gripIce: number;
  costCad: number;
}

export const TIRE_CATALOG: Record<TireType, TireProperties> = {
  summer: {
    id: "summer",
    name: "Pneus d'été",
    gripAsphalt: 1.0,
    gripWet: 0.75,
    gripSnow: 0.25,
    gripIce: 0.1,
    costCad: 320,
  },
  all_season: {
    id: "all_season",
    name: "Quatre-saisons",
    gripAsphalt: 0.9,
    gripWet: 0.8,
    gripSnow: 0.55,
    gripIce: 0.35,
    costCad: 480,
  },
  winter: {
    id: "winter",
    name: "Pneus d'hiver (Nokian)",
    gripAsphalt: 0.85,
    gripWet: 0.85,
    gripSnow: 0.92,
    gripIce: 0.68,
    costCad: 780,
  },
  studded_winter: {
    id: "studded_winter",
    name: "Pneus cloutés d'hiver",
    gripAsphalt: 0.75,
    gripWet: 0.82,
    gripSnow: 0.98,
    gripIce: 0.94,
    costCad: 950,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// §2 — CONFIGURATION PHYSIQUE
// ─────────────────────────────────────────────────────────────────────────────

export interface VehicleConfig {
  id: string;
  className: string;
  vehicleClass: VehicleClass;
  bodyColor: number;
  maxSpeedKmh: number;
  acceleration: number;      // m/s²
  brakeForce: number;
  turnRate: number;          // rad/s
  mass: number;              // kg
  drivetrain: "FWD" | "RWD" | "AWD" | "4x4";
  tireType: TireType;
  hasSiren: boolean;
  hasLightbar: boolean;
  hasSnowPlow: boolean;
}

export interface VehicleState {
  speed: number;             // km/h
  velocity: THREE.Vector3;   // Vecteur vitesse en m/s
  heading: number;           // Yaw en radians
  steering: number;          // -1.0 à 1.0
  throttle: number;          // 0.0 à 1.0
  brake: number;             // 0.0 à 1.0
  handbrake: boolean;
  reversing: boolean;
  wheelSpin: number;         // Facteur de dérapage 0-1
  engineRpm: number;         // 800-8000 tours/minute
  headlightsOn: boolean;
  highBeamsOn: boolean;
  sirenActive: boolean;
  lightbarActive: boolean;
  brakeLightIntensity: number;
  turnSignal: "off" | "left" | "right" | "hazards";
}

// ─────────────────────────────────────────────────────────────────────────────
// §3 — GESTIONNAIRE DES SONS DE MOTEUR 3D SYNTHÉTISÉS
// ─────────────────────────────────────────────────────────────────────────────

export class EngineSound {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isRunning = false;

  public start(): void {
    if (this.isRunning || typeof window === "undefined") return;

    try {
      this.audioContext = new AudioContext();
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      this.oscillator.type = "sawtooth";
      this.oscillator.frequency.value = 60; // Ralenti moteur
      this.gainNode.gain.value = 0.04;

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      this.oscillator.start();
      this.isRunning = true;
    } catch (err) {
      console.warn("[EngineSound] Audio non disponible:", err);
    }
  }

  public updateRpm(rpm: number): void {
    if (!this.oscillator || !this.gainNode || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    // Fréquence liée aux RPM (60 Hz à 800 tr/min, 260 Hz à 8000 tr/min)
    const freq = 40 + (rpm / 8000) * 220;
    const volume = 0.03 + (rpm / 8000) * 0.06;

    this.oscillator.frequency.linearRampToValueAtTime(freq, now + 0.05);
    this.gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
  }

  public stop(): void {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isRunning = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §4 — GESTIONNAIRE DES GYROPHARES SÛRETÉ DU QUÉBEC (STYLE WHELEN)
// ─────────────────────────────────────────────────────────────────────────────

export class PoliceLightbar {
  public readonly group: THREE.Group;
  private redLights: THREE.Mesh[] = [];
  private blueLights: THREE.Mesh[] = [];
  private whiteFlash: THREE.Mesh | null = null;
  private time = 0;
  private active = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "lightbar-sq";
    this.buildLightbar();
  }

  private buildLightbar(): void {
    // Support / Base du gyrophare (barre noire)
    const baseMat = matLib.get(0x0a0a0a, 0.4, 0.7);
    const base = new THREE.Mesh(
      getGeo("box", { w: 1.4, h: 0.12, d: 0.35 }),
      baseMat
    );
    base.position.set(0, 0, 0);
    base.castShadow = true;
    this.group.add(base);

    // Créer 4 modules rouges (côté conducteur / gauche)
    const redEmissive = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0,
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
    });

    // Créer 4 modules bleus (côté passager / droite)
    const blueEmissive = new THREE.MeshStandardMaterial({
      color: 0x0033ff,
      emissive: 0x0033ff,
      emissiveIntensity: 0,
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
    });

    // 4 modules rouges à gauche
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(
        getGeo("box", { w: 0.15, h: 0.08, d: 0.28 }),
        redEmissive.clone()
      );
      light.position.set(-0.6 + i * 0.14, 0.08, 0);
      this.redLights.push(light);
      this.group.add(light);
    }

    // 4 modules bleus à droite
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(
        getGeo("box", { w: 0.15, h: 0.08, d: 0.28 }),
        blueEmissive.clone()
      );
      light.position.set(0.05 + i * 0.14, 0.08, 0);
      this.blueLights.push(light);
      this.group.add(light);
    }

    // Flash blanc central (takedown)
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      toneMapped: false,
    });
    this.whiteFlash = new THREE.Mesh(
      getGeo("box", { w: 0.6, h: 0.06, d: 0.25 }),
      whiteMat
    );
    this.whiteFlash.position.set(0, 0.12, 0);
    this.group.add(this.whiteFlash);
  }

  public setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      // Éteindre toutes les lumières
      this.redLights.forEach((m) => {
        (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      });
      this.blueLights.forEach((m) => {
        (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      });
      if (this.whiteFlash) {
        (this.whiteFlash.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }
    }
  }

  /**
   * Animation Whelen Cencom : Pattern authentique de la Sûreté du Québec.
   * Cycle : Rouge gauche flash → Bleu droite flash → Alternance rapide → Repeat
   */
  public update(dt: number): void {
    if (!this.active) return;
    this.time += dt;

    // Pattern flash rapide (10 Hz)
    const phase = (this.time * 10) % 4;
    const phaseFloor = Math.floor(phase);

    this.redLights.forEach((m, i) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      // Rouge : allumé sur phases 0 et 2, pattern alterné
      const on = phaseFloor === 0 || (phaseFloor === 2 && i % 2 === 0);
      mat.emissiveIntensity = on ? 3.5 : 0;
    });

    this.blueLights.forEach((m, i) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      // Bleu : allumé sur phases 1 et 3, pattern inversé
      const on = phaseFloor === 1 || (phaseFloor === 3 && i % 2 === 1);
      mat.emissiveIntensity = on ? 3.5 : 0;
    });

    // Flash blanc occasionnel (2 Hz)
    if (this.whiteFlash) {
      const flashPhase = Math.sin(this.time * 12);
      const mat = this.whiteFlash.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = flashPhase > 0.85 ? 5 : 0;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §5 — CONSTRUCTEUR VISUEL DU VÉHICULE (Carrosserie PBR + Phares)
// ─────────────────────────────────────────────────────────────────────────────

export class Vehicle {
  public readonly group: THREE.Group;
  public readonly config: VehicleConfig;
  public state: VehicleState;

  // Composants visuels
  private bodyMesh!: THREE.Mesh;
  private wheelMeshes: THREE.Mesh[] = [];
  private headlights: THREE.SpotLight[] = [];
  private headlightMeshes: THREE.Mesh[] = [];
  private tailLightMeshes: THREE.Mesh[] = [];
  private brakeLightMat: THREE.MeshStandardMaterial | null = null;
  private turnSignalMats: { left: THREE.MeshStandardMaterial; right: THREE.MeshStandardMaterial } | null = null;
  private lightbar: PoliceLightbar | null = null;
  private engineSound: EngineSound;

  // Vecteurs temporaires (Zero-GC)
  private static tempVec = new THREE.Vector3();

  constructor(config: VehicleConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = `vehicle-${config.id}`;
    this.engineSound = new EngineSound();

    this.state = {
      speed: 0,
      velocity: new THREE.Vector3(),
      heading: 0,
      steering: 0,
      throttle: 0,
      brake: 0,
      handbrake: false,
      reversing: false,
      wheelSpin: 0,
      engineRpm: 800,
      headlightsOn: false,
      highBeamsOn: false,
      sirenActive: false,
      lightbarActive: false,
      brakeLightIntensity: 0,
      turnSignal: "off",
    };

    this.buildVehicle();
  }

  /** Construit toutes les parties visuelles du véhicule */
  private buildVehicle(): void {
    // ── CARROSSERIE PRINCIPALE ──
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.config.bodyColor,
      metalness: 0.85,
      roughness: 0.35,
      envMapIntensity: 1.5,
    });

    // Châssis inférieur
    this.bodyMesh = new THREE.Mesh(
      getGeo("box", { w: 1.9, h: 0.6, d: 4.4 }),
      bodyMat
    );
    this.bodyMesh.position.set(0, 0.7, 0);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // Capot avant
    const hood = new THREE.Mesh(
      getGeo("box", { w: 1.75, h: 0.25, d: 1.5 }),
      bodyMat
    );
    hood.position.set(0, 1.0, 1.1);
    hood.castShadow = true;
    this.group.add(hood);

    // Coffre arrière
    const trunk = new THREE.Mesh(
      getGeo("box", { w: 1.75, h: 0.25, d: 1.1 }),
      bodyMat
    );
    trunk.position.set(0, 1.0, -1.5);
    trunk.castShadow = true;
    this.group.add(trunk);

    // Habitacle (cabine)
    const cabin = new THREE.Mesh(
      getGeo("box", { w: 1.7, h: 0.7, d: 2.2 }),
      bodyMat
    );
    cabin.position.set(0, 1.35, -0.15);
    cabin.castShadow = true;
    this.group.add(cabin);

    // ── FENÊTRES TRANSPARENTES (Verre teinté PBR) ──
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2a35,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.6,
      opacity: 0.5,
      transparent: true,
      thickness: 0.3,
      envMapIntensity: 2.0,
      ior: 1.5,
    });

    // Pare-brise avant (incliné)
    const windshield = new THREE.Mesh(
      getGeo("box", { w: 1.65, h: 0.55, d: 0.08 }),
      glassMat
    );
    windshield.position.set(0, 1.55, 0.9);
    windshield.rotation.x = -Math.PI / 8;
    this.group.add(windshield);

    // Pare-brise arrière (incliné)
    const rearWindshield = new THREE.Mesh(
      getGeo("box", { w: 1.65, h: 0.5, d: 0.08 }),
      glassMat
    );
    rearWindshield.position.set(0, 1.55, -1.2);
    rearWindshield.rotation.x = Math.PI / 8;
    this.group.add(rearWindshield);

    // Fenêtres latérales gauches
    for (const zPos of [0.5, -0.5]) {
      const sideWindow = new THREE.Mesh(
        getGeo("box", { w: 0.08, h: 0.5, d: 0.8 }),
        glassMat
      );
      sideWindow.position.set(-0.86, 1.5, zPos);
      this.group.add(sideWindow);
    }

    // Fenêtres latérales droites
    for (const zPos of [0.5, -0.5]) {
      const sideWindow = new THREE.Mesh(
        getGeo("box", { w: 0.08, h: 0.5, d: 0.8 }),
        glassMat
      );
      sideWindow.position.set(0.86, 1.5, zPos);
      this.group.add(sideWindow);
    }

    // ── PHARES AVANT (Halogènes avec cône de lumière volumétrique) ──
    this.buildHeadlights();

    // ── FEUX ARRIÈRE (Rouges + Clignotants ambrés) ──
    this.buildTailLights();

    // ── ROUES ──
    this.buildWheels();

    // ── ÉQUIPEMENTS SPÉCIAUX (Gyrophares SQ, chasse-neige) ──
    if (this.config.hasLightbar) {
      this.lightbar = new PoliceLightbar();
      this.lightbar.group.position.set(0, 1.85, -0.15);
      this.group.add(this.lightbar.group);
    }

    // Positionnement racine
    this.group.position.set(0, 0, 0);
  }

  /** Construction des phares avant avec cônes de lumière PBR */
  private buildHeadlights(): void {
    // Verre du phare (transparent brillant)
    const lensGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffffee,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.95,
      opacity: 0.7,
      transparent: true,
      emissive: 0xffffee,
      emissiveIntensity: 0,
      toneMapped: false,
    });

    // Phare gauche
    for (const xPos of [-0.6, 0.6]) {
      const lensMesh = new THREE.Mesh(
        getGeo("box", { w: 0.35, h: 0.2, d: 0.15 }),
        lensGlass.clone()
      );
      lensMesh.position.set(xPos, 0.85, 2.15);
      this.headlightMeshes.push(lensMesh);
      this.group.add(lensMesh);

      // Spot lumineux 3D projeté sur le sol
      const spotLight = new THREE.SpotLight(0xfff0d8, 0, 40, Math.PI / 5, 0.5, 1.5);
      spotLight.position.set(xPos, 0.85, 2.2);
      spotLight.target.position.set(xPos, -0.5, 15);
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.set(512, 512);
      this.headlights.push(spotLight);
      this.group.add(spotLight);
      this.group.add(spotLight.target);
    }
  }

  /** Construction des feux arrière (freinage + clignotants) */
  private buildTailLights(): void {
    // Matériau des feux arrière rouges
    this.brakeLightMat = new THREE.MeshStandardMaterial({
      color: 0xdd0808,
      emissive: 0xdd0808,
      emissiveIntensity: 0.4, // Éclat de base
      toneMapped: false,
    });

    // Matériaux clignotants ambrés
    const turnSignalMat = () =>
      new THREE.MeshStandardMaterial({
        color: 0xff8800,
        emissive: 0xff8800,
        emissiveIntensity: 0,
        toneMapped: false,
      });

    const leftSignal = turnSignalMat();
    const rightSignal = turnSignalMat();
    this.turnSignalMats = { left: leftSignal, right: rightSignal };

    // 4 feux arrière (2 rouges + 2 clignotants)
    for (const [xPos, mat] of [
      [-0.75, this.brakeLightMat],
      [-0.45, leftSignal],
      [0.45, rightSignal],
      [0.75, this.brakeLightMat],
    ] as const) {
      const light = new THREE.Mesh(
        getGeo("box", { w: 0.22, h: 0.14, d: 0.1 }),
        mat
      );
      light.position.set(xPos, 0.85, -2.15);
      this.tailLightMeshes.push(light);
      this.group.add(light);
    }
  }

  /** Construction des 4 roues avec pneus noirs et jantes en alliage */
  private buildWheels(): void {
    const tireMat = matLib.get(0x0a0a0a, 0.85, 0.05);
    const rimMat = matLib.get(0x808088, 0.32, 0.75);

    const wheelPositions: Array<[number, number]> = [
      [-0.85, 1.4], [0.85, 1.4],   // Avant gauche/droite
      [-0.85, -1.4], [0.85, -1.4], // Arrière gauche/droite
    ];

    for (const [x, z] of wheelPositions) {
      // Pneu
      const tire = new THREE.Mesh(
        getGeo("cylinder", { r: 0.35, r2: 0.35, h: 0.25, seg: 20 }),
        tireMat
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.35, z);
      tire.castShadow = true;
      this.wheelMeshes.push(tire);
      this.group.add(tire);

      // Jante (à l'intérieur du pneu)
      const rim = new THREE.Mesh(
        getGeo("cylinder", { r: 0.22, r2: 0.22, h: 0.26, seg: 12 }),
        rimMat
      );
      rim.rotation.z = Math.PI / 2;
      rim.position.set(x, 0.35, z);
      this.group.add(rim);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §6 — PHYSIQUE DE CONDUITE (Adhérence, Dérapage, Verglas)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calcule le multiplicateur d'adhérence dynamique selon la surface et les pneus.
   */
  private computeGripFactor(surface: GroundSurface): number {
    const tire = TIRE_CATALOG[this.config.tireType];
    switch (surface) {
      case "asphalt": return tire.gripAsphalt;
      case "wet":     return tire.gripWet;
      case "snow":    return tire.gripSnow;
      case "ice_black": return tire.gripIce;
      case "dirt":    return tire.gripAsphalt * 0.7;
      case "gravel":  return tire.gripAsphalt * 0.6;
      default:        return 1.0;
    }
  }

  /**
   * Met à jour la physique du véhicule à chaque frame.
   * @param dt Delta temps en secondes
   * @param surface Surface actuelle du sol
   */
  public update(dt: number, surface: GroundSurface = "asphalt"): void {
    const grip = this.computeGripFactor(surface);

    // Calcul de la force d'accélération avec perte de traction en cas de dérapage
    const targetSpeed = this.state.throttle * this.config.maxSpeedKmh;
    const accelForce = this.config.acceleration * this.state.throttle * grip;

    // Vitesse actuelle (avec inertie)
    this.state.speed += accelForce * dt * 3.6; // Convert m/s vers km/h
    this.state.speed -= this.state.brake * this.config.brakeForce * dt * grip;
    this.state.speed -= 0.5 * dt; // Friction naturelle
    this.state.speed = Math.max(0, Math.min(this.config.maxSpeedKmh, this.state.speed));

    // Direction (avec réduction de la maniabilité à haute vitesse)
    const speedRatio = this.state.speed / this.config.maxSpeedKmh;
    const effectiveTurn = this.config.turnRate * (1 - speedRatio * 0.5) * grip;
    this.state.heading += this.state.steering * effectiveTurn * dt * (this.state.speed / 30);

    // Calcul du dérapage (wheelSpin) sur surface glissante
    const speedInMs = this.state.speed / 3.6;
    const desiredLateralGrip = Math.abs(this.state.steering) * speedInMs * 0.1;
    const actualGrip = grip;
    this.state.wheelSpin = Math.max(0, Math.min(1, desiredLateralGrip - actualGrip));

    // Ajout d'un déplacement latéral en cas de perte d'adhérence
    const lateralSlip = this.state.wheelSpin * this.state.steering * 0.5;

    // Mise à jour de la position dans le monde
    const forwardX = Math.sin(this.state.heading);
    const forwardZ = Math.cos(this.state.heading);
    const rightX = Math.cos(this.state.heading);
    const rightZ = -Math.sin(this.state.heading);

    this.group.position.x += forwardX * speedInMs * dt + rightX * lateralSlip;
    this.group.position.z += forwardZ * speedInMs * dt + rightZ * lateralSlip;
    this.group.rotation.y = this.state.heading;

    // ── ANIMATION DES ROUES (rotation en fonction de la vitesse) ──
    const wheelRotationSpeed = speedInMs / 0.35; // rad/s
    for (const wheel of this.wheelMeshes) {
      wheel.rotation.x += wheelRotationSpeed * dt;
    }

    // ── MOTEUR : Calcul des RPM ──
    this.state.engineRpm = 800 + (speedRatio * 7200) + (this.state.throttle * 400);

    // ── FREINS : Intensité lumineuse ──
    const brakeTarget = this.state.brake > 0.1 ? 2.5 : 0.4;
    this.state.brakeLightIntensity += (brakeTarget - this.state.brakeLightIntensity) * dt * 8;

    if (this.brakeLightMat) {
      this.brakeLightMat.emissiveIntensity = this.state.brakeLightIntensity;
    }

    // ── PHARES AVANT ──
    this.updateHeadlights();

    // ── CLIGNOTANTS ──
    this.updateTurnSignals();

    // ── GYROPHARES SQ ──
    if (this.lightbar) {
      this.lightbar.setActive(this.state.lightbarActive);
      this.lightbar.update(dt);
    }

    // ── SON DU MOTEUR ──
    this.engineSound.updateRpm(this.state.engineRpm);
  }

  /** Active/désactive les phares avant */
  private updateHeadlights(): void {
    const baseIntensity = this.state.headlightsOn ? (this.state.highBeamsOn ? 15 : 8) : 0;

    for (const light of this.headlights) {
      light.intensity = baseIntensity;
    }

    for (const mesh of this.headlightMeshes) {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = this.state.headlightsOn ? 2.5 : 0;
    }
  }

  /** Animation des clignotants (0.5 Hz alterné) */
  private updateTurnSignals(): void {
    if (!this.turnSignalMats) return;

    const blink = Math.floor(performance.now() / 500) % 2 === 0;
    const leftActive = this.state.turnSignal === "left" || this.state.turnSignal === "hazards";
    const rightActive = this.state.turnSignal === "right" || this.state.turnSignal === "hazards";

    this.turnSignalMats.left.emissiveIntensity = leftActive && blink ? 3.5 : 0;
    this.turnSignalMats.right.emissiveIntensity = rightActive && blink ? 3.5 : 0;
  }

  /** Démarre le moteur (son + état) */
  public startEngine(): void {
    this.engineSound.start();
    this.state.engineRpm = 800;
  }

  /** Arrête le moteur */
  public stopEngine(): void {
    this.engineSound.stop();
    this.state.engineRpm = 0;
  }

  /** Change le type de pneus (mécanique / boutique) */
  public setTireType(type: TireType): void {
    (this.config as any).tireType = type;
  }

  /** Libère les ressources */
  public dispose(): void {
    this.engineSound.stop();
    this.group.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §7 — CATALOGUE PRÉ-CONFIGURÉ DE VÉHICULES QUÉBÉCOIS
// ─────────────────────────────────────────────────────────────────────────────

export const VEHICLE_PRESETS: Record<string, VehicleConfig> = {
  civilian_pickup: {
    id: "civilian_pickup",
    className: "Ford F-150 SuperCrew",
    vehicleClass: "civilian",
    bodyColor: 0x1e3a5f, // Bleu marine
    maxSpeedKmh: 180,
    acceleration: 5.5,
    brakeForce: 30,
    turnRate: 1.2,
    mass: 2200,
    drivetrain: "4x4",
    tireType: "winter",
    hasSiren: false,
    hasLightbar: false,
    hasSnowPlow: false,
  },
  civilian_sedan: {
    id: "civilian_sedan",
    className: "Honda Civic Touring",
    vehicleClass: "civilian",
    bodyColor: 0xc0c4c8, // Argent
    maxSpeedKmh: 210,
    acceleration: 6.5,
    brakeForce: 32,
    turnRate: 1.5,
    mass: 1350,
    drivetrain: "FWD",
    tireType: "all_season",
    hasSiren: false,
    hasLightbar: false,
    hasSnowPlow: false,
  },
  sq_interceptor: {
    id: "sq_interceptor",
    className: "Ford Police Interceptor Utility (SQ)",
    vehicleClass: "police_sq",
    bodyColor: 0x0a1728, // Noir bleuté SQ
    maxSpeedKmh: 240,
    acceleration: 8.5,
    brakeForce: 40,
    turnRate: 1.8,
    mass: 2100,
    drivetrain: "AWD",
    tireType: "studded_winter",
    hasSiren: true,
    hasLightbar: true,
    hasSnowPlow: false,
  },
  ambulance: {
    id: "ambulance",
    className: "Ambulance Crestline Type III",
    vehicleClass: "ems",
    bodyColor: 0xf5f5f0, // Blanc ambulancier
    maxSpeedKmh: 160,
    acceleration: 4.5,
    brakeForce: 35,
    turnRate: 1.0,
    mass: 3800,
    drivetrain: "RWD",
    tireType: "winter",
    hasSiren: true,
    hasLightbar: true,
    hasSnowPlow: false,
  },
  mtq_plow: {
    id: "mtq_plow",
    className: "Chasse-neige Mack Granite MTQ",
    vehicleClass: "mtq_plow",
    bodyColor: 0xff9800, // Orange sécurité MTQ
    maxSpeedKmh: 90,
    acceleration: 3.0,
    brakeForce: 45,
    turnRate: 0.7,
    mass: 15000,
    drivetrain: "4x4",
    tireType: "studded_winter",
    hasSiren: false,
    hasLightbar: true,
    hasSnowPlow: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// §8 — UTILITAIRES DE CONDUITE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détermine la surface au sol selon la météo actuelle.
 */
export function determineSurface(
  season: string,
  weatherCondition: string,
  snowDepthCm: number,
  isOnRoad = true
): GroundSurface {
  if (!isOnRoad) return "dirt";
  if (weatherCondition === "verglas" || weatherCondition === "freezing_rain") return "ice_black";
  if (snowDepthCm > 5) return "snow";
  if (weatherCondition === "rain" || weatherCondition === "heavy_rain") return "wet";
  if (season === "hiver" && snowDepthCm > 1) return "snow";
  return "asphalt";
}

/**
 * Recommande le meilleur type de pneus pour la saison en cours.
 */
export function recommendTires(season: string): TireType {
  switch (season) {
    case "hiver": return "studded_winter";
    case "automne": return "all_season";
    case "printemps": return "all_season";
    case "ete": return "summer";
    default: return "all_season";
  }
}