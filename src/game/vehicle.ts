/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SIMULATION VÉHICULE RP QUÉBEC — DIRECTION INVERSÉE CORRIGÉE & MULTIJOUEUR SYNC
 * ═════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { clamp } from "./rng";
import { useGameStore } from "./store";
import { fleetById, type VehicleId } from "./fleet";
import { tickCouch } from "./couch";
import { getSurfaceAt, getTerrainHeight, inWorld, SPAWN, WORLD, withIce, type SurfaceSample } from "./worlddata";
import { quebecSeasons } from "./seasons";
import type { Actions } from "./input";
import { physics } from "./physics";
import { findLightbar, LIGHTBAR_CYCLE, LIGHTBAR_LABEL, type LightbarPattern } from "./lightbar";
import { QuebecPoliceSirens } from "./police";
import { dynamicEventsService } from "./events"; // Intégration du directeur d'événements Third Eye

interface CachedWheel {
  obj: THREE.Object3D;
  radius: number;
  isFront: boolean;
}

export class Vehicle {
  x = SPAWN.x;
  y = 1;
  z = SPAWN.z;
  yaw = SPAWN.yaw;
  speed = 0;
  slip = 0;
  lateral = 0;
  headingX = 0;
  headingZ = -1;

  bump = 0;
  bumpVel = 0;
  bumpPhase = 0;
  roll = 0;
  rollVel = 0;
  pitch = 0;
  pitchVel = 0;

  drifting = false;
  kmAccum = 0;
  engineRpm = 900;
  gear = 1;
  kind: VehicleId = "jetta";
  group: THREE.Group;
  surface: SurfaceSample;
  clock = 0;
  steer = 0;
  throttle = 0;
  braking = false;
  collided = false;
  sirenIndex = 0;

  private wheels: CachedWheel[] = [];

  constructor() {
    const s = useGameStore.getState();
    this.x = s.x;
    this.z = s.z;
    this.yaw = s.yaw;
    this.kind = (s.vehicleId as VehicleId) || "jetta";
    this.group = fleetById(this.kind).build();
    this.surface = getSurfaceAt(this.x, this.z);
    this.cacheWheels();
    this.snap();
  }

  setKind(id: VehicleId) {
    this.kind = id;
    const next = fleetById(id).build();
    while (this.group.children.length) this.group.remove(this.group.children[0]!);
    while (next.children.length) this.group.add(next.children[0]!);
    this.group.name = next.name || id;
    this.group.userData = next.userData;
    if (id !== "sq") this.sirenIndex = 0;
    this.roll = 0;
    this.pitch = 0;
    this.cacheWheels();
  }

  private cacheWheels() {
    this.wheels = [];
    this.group.traverse((obj) => {
      const r = obj.userData.wheel as number | undefined;
      const isFront = obj.userData.frontWheel === true;
      if (r !== undefined && (obj instanceof THREE.Mesh || obj instanceof THREE.Group)) {
        this.wheels.push({ obj, radius: r, isFront });
      }
    });
  }

  cycleSiren(): string {
    if (this.kind !== "sq") return "Pas un intercepteur SQ.";
    this.sirenIndex = (this.sirenIndex + 1) % LIGHTBAR_CYCLE.length;
    return LIGHTBAR_LABEL[LIGHTBAR_CYCLE[this.sirenIndex]!];
  }

  sirenPattern(): LightbarPattern | "off" {
    return this.kind === "sq" ? LIGHTBAR_CYCLE[this.sirenIndex]! : "off";
  }

  reset() {
    this.x = SPAWN.x;
    this.z = SPAWN.z;
    this.yaw = SPAWN.yaw;
    this.speed = 0;
    this.slip = 0;
    this.lateral = 0;
    this.steer = 0;
    this.roll = 0;
    this.pitch = 0;
    this.snap();
  }

  snap() {
    this.y = getTerrainHeight(this.x, this.z) + 0.42;
    this.updateHeading();
    this.syncMesh();
  }

  private updateHeading() {
    this.headingX = -Math.sin(this.yaw);
    this.headingZ = -Math.cos(this.yaw);
  }

  update(dt: number, a: Actions, loadMul = 1) {
    const safeDt = Math.min(dt, 0.05);
    this.clock += safeDt;
    this.throttle = a.throttle;
    this.braking = a.brake > 0.15;

    // Lissage du volant
    const steerSpeed = a.steer !== 0 ? 8.0 : 12.0;
    this.steer = THREE.MathUtils.lerp(this.steer, a.steer, safeDt * steerSpeed);

    // Environnement & Couplage dynamique avec Third Eye (Météo / Verglas / Tempête)
    this.surface = getSurfaceAt(this.x, this.z);
    const st = useGameStore.getState();
    const wx = quebecSeasons.getState();
    
    // Vérification combinée store, saisons et événements dynamiques en cours
    const isBlizzardActive = dynamicEventsService.hasGlobalModifier("speedLimitMultiplier");
    const iced = wx.roadFrictionCoeff < 0.72 || st.weather === "snow" || st.weather === "storm" || st.gridOutage?.kind === "verglas" || isBlizzardActive;
    
    const s = withIce(this.surface, iced);
    this.surface = s;
    const spec = fleetById(this.kind);
    const speedKmh = Math.abs(this.speed) * 3.6;

    const heavy = spec.mass > 1.4 ? s.heavyPenalty : 1;
    const traction = (s.traction * spec.grip / heavy) * wx.roadFrictionCoeff;

    // Vitesse max calibrée (m/s) avec modificateur global de tempête si actif
    const baseMaxKmh = Math.min(spec.maxSpeed, 135);
    const stormLimitFactor = isBlizzardActive ? 0.75 : 1.0;
    const maxKmh = baseMaxKmh * stormLimitFactor;

    const maxSpeedMs = (maxKmh / 3.6) * s.traction * wx.roadFrictionCoeff * (a.boost ? 1.15 : 1) * loadMul;
    const maxReverseMs = -6.5;

    // Accélération
    if (a.throttle > 0) {
      const speedRatio = Math.min(1.0, Math.abs(this.speed) / Math.max(1, maxSpeedMs));
      const torque = Math.max(0.3, 1.0 - Math.pow(speedRatio, 1.2));
      const accelForce = 6.8 * torque * traction * loadMul;
      this.speed += a.throttle * accelForce * safeDt;
    }

    // Freinage
    if (a.brake > 0) {
      if (this.speed > 0.2) {
        this.speed -= 16.0 * a.brake * safeDt;
      } else {
        this.speed -= 3.8 * a.brake * safeDt;
      }
    }

    // Résistance de l'air & frein moteur
    const airDrag = 0.003 * Math.pow(this.speed, 2) * Math.sign(this.speed);
    const rollingFriction = 0.02 * this.speed;
    const engineBraking = (a.throttle < 0.05 && a.brake < 0.05) ? (this.speed * 0.45) : 0;

    this.speed -= (airDrag + rollingFriction + engineBraking) * safeDt;

    if (Math.abs(this.speed) < 0.08 && a.throttle < 0.05 && a.brake < 0.05) {
      this.speed = 0;
    }

    this.speed = clamp(this.speed, maxReverseMs, maxSpeedMs);

    // ═══════════════════════════════════════════════════════════════════
    // GÉOMÉTRIE DE DIRECTION CORRIGÉE (TOURNER À DROITE = VA À DROITE)
    // ═══════════════════════════════════════════════════════════════════
    const wheelbase = 2.75;
    const maxWheelAngle = 0.45;
    const speedRatio = Math.min(1.0, speedKmh / 120.0);
    const speedSteerLimiter = 1.0 - speedRatio * 0.68;
    const currentWheelAngle = this.steer * maxWheelAngle * speedSteerLimiter;

    const baseTurnRate = (this.speed / wheelbase) * Math.tan(currentWheelAngle);
    const gripTurnFactor = clamp(s.lateralGrip * spec.grip, 0.5, 1.2);

    this.yaw += baseTurnRate * gripTurnFactor * safeDt;

    // Dérapage / Drift
    const corner = Math.abs(this.steer) * speedKmh * speedKmh * 0.00025;
    const grip = s.lateralGrip * 2.5 * spec.grip;
    const hb = a.handbrake ? 3.0 : 1.0;
    const demand = (corner * hb) / Math.max(0.05, grip);
    const sf = Math.max(0, (speedKmh - s.slipThreshold * 0.5) / Math.max(20, s.slipThreshold));
    const targetSlip = Math.min(1, Math.max(0, (demand - 0.75) * sf * 1.2));

    if (targetSlip > this.slip) {
      this.slip += (targetSlip - this.slip) * Math.min(1, safeDt * 6);
    } else {
      this.slip += (targetSlip - this.slip) * Math.min(1, safeDt * s.gripRecovery);
    }

    this.slip = clamp(this.slip, 0, 1);
    this.drifting = this.slip > 0.22;
    this.lateral = this.slip * Math.abs(this.speed) * 0.4;

    // Intégration position monde
    this.updateHeading();
    const perpX = -this.headingZ;
    const perpZ = this.headingX;
    const ox = this.x;
    const oy = this.y;
    const oz = this.z;

    this.x += this.headingX * this.speed * safeDt + perpX * this.lateral * 0.2 * safeDt * Math.sign(this.steer || 1);
    this.z += this.headingZ * this.speed * safeDt + perpZ * this.lateral * 0.2 * safeDt * Math.sign(this.steer || 1);

    if (!inWorld(this.x, this.z)) {
      this.x = clamp(this.x, WORLD.minX + 24, WORLD.maxX - 24);
      this.z = clamp(this.z, WORLD.minZ + 24, WORLD.maxZ - 24);
      this.speed *= 0.4;
    }

    // Collision
    const hit = physics.correctVehicle(ox, oy, oz, this.x, this.y, this.z, this.yaw);
    this.collided = hit.hit;
    if (hit.hit) {
      this.x = hit.x;
      this.z = hit.z;
      this.speed *= 0.5;
    }

    // Suspension
    this.updateChassisDynamics(safeDt, speedKmh, s);
    this.y = getTerrainHeight(this.x, this.z) + 0.42 + this.bump;
    this.kmAccum += Math.abs(this.speed) * safeDt / 1000;

    this.gear = Math.max(1, Math.min(6, Math.floor(speedKmh / 26) + 1));
    this.engineRpm = clamp(900 + (speedKmh / this.gear) * 55 + a.throttle * 1400, 800, 6000);

    this.syncMesh(safeDt);
  }

  private updateChassisDynamics(dt: number, speedKmh: number, s: SurfaceSample) {
    const rollTarget = this.steer * Math.min(1, speedKmh / 45) * 0.065;
    this.rollVel += (rollTarget - this.roll) * 28.0 * dt;
    this.rollVel *= 1 - 4.5 * dt;
    this.roll = clamp(this.roll + this.rollVel * dt, -0.12, 0.12);

    let pitchTarget = 0;
    if (this.braking) pitchTarget = 0.04;
    else if (this.throttle > 0.3) pitchTarget = -0.025;

    this.pitchVel += (pitchTarget - this.pitch) * 28.0 * dt;
    this.pitchVel *= 1 - 4.5 * dt;
    this.pitch = clamp(this.pitch + this.pitchVel * dt, -0.08, 0.08);

    this.bumpPhase += dt * (4 + speedKmh * 0.12);
    const bumpT = s.bumpiness * Math.min(1, speedKmh / 50) * Math.sin(this.bumpPhase) * 0.06;
    this.bumpVel += (bumpT - this.bump) * dt * 30;
    this.bumpVel *= 0.85;
    this.bump += this.bumpVel * dt;
  }

  private syncMesh(dt = 0) {
    this.group.position.set(this.x, this.y, this.z);

    this.group.rotation.order = "YXZ";
    this.group.rotation.set(this.pitch, this.yaw, this.roll);

    tickCouch(this.group, dt, this.clock, this.speed, this.steer, this.throttle, this.braking);
    if (dt > 0) this.spinWheels(dt);
    this.tickLightbar(this.clock);
  }

  tickLightbar(elapsed = this.clock) {
    const mode = this.sirenPattern();
    const handle = findLightbar(this.group);
    if (!handle) return;
    const active = mode !== "off";
    const pattern = mode === "off" ? "code1_advisor" : mode;
    handle.tick(elapsed, {
      active,
      pattern,
      trafficAdvisor: pattern === "code1_advisor" && active ? "split" : pattern === "code3_emergency" ? "split" : "off",
      takedown: pattern === "code3_emergency",
      alleyLights: pattern ===="code3_emergency",
      sirenPhase: QuebecPoliceSirens.getSyncPhase(),
    });
  }

  private spinWheels(dt: number) {
    const spin = this.speed * dt;
    for (const wheel of this.wheels) {
      wheel.obj.rotation.x += spin / Math.max(0.2, wheel.radius);

      if (wheel.isFront) {
        wheel.obj.rotation.y = THREE.MathUtils.lerp(wheel.obj.rotation.y || 0, -this.steer * 0.45, 0.25);
      }
    }
  }

  getDashboardTelemetry() {
    return {
      speedKmh: Math.round(Math.abs(this.speed) * 3.6),
      rpm: Math.round(this.engineRpm),
      gear: this.gear,
      drifting: this.drifting,
      slip: this.slip,
    };
  }

  /**
   * Package de télémétrie complet à envoyer au serveur multijoueur (Colyseus)
   */
  getNetworkPayload() {
    return {
      x: Number(this.x.toFixed(2)),
      y: Number(this.y.toFixed(2)),
      z: Number(this.z.toFixed(2)),
      yaw: Number(this.yaw.toFixed(3)),
      steer: Number(this.steer.toFixed(2)),
      speed: Number(this.speed.toFixed(2)),
      kind: this.kind,
      siren: this.sirenPattern(),
    };
  }
}