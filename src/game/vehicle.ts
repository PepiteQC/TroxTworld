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

export class Vehicle {
  x = SPAWN.x;
  y = 1;
  z = SPAWN.z;
  yaw = SPAWN.yaw;
  speed = 0;
  slip = 0;
  lateral = 0;
  bump = 0;
  bumpVel = 0;
  bumpPhase = 0;
  drifting = false;
  kmAccum = 0;
  kind: VehicleId = "pickup";
  group: THREE.Group;
  surface: SurfaceSample;
  headingX = 0;
  headingZ = -1;
  clock = 0;
  steer = 0;
  throttle = 0;
  braking = false;
  collided = false;
  sirenIndex = 0;

  constructor() {
    const s = useGameStore.getState();
    this.x = s.x;
    this.z = s.z;
    this.yaw = s.yaw;
    this.kind = (s.vehicleId as VehicleId) || "pickup";
    this.group = fleetById(this.kind).build();
    this.surface = getSurfaceAt(this.x, this.z);
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
    this.clock += dt;
    this.steer = a.steer;
    this.throttle = a.throttle;
    this.braking = a.brake > 0.15;
    this.surface = getSurfaceAt(this.x, this.z);
    const st = useGameStore.getState();
    const wx = quebecSeasons.getState();
    const iced = wx.roadFrictionCoeff < 0.72 || st.weather === "snow" || st.weather === "storm" || st.gridOutage?.kind === "verglas";
    const s = withIce(this.surface, iced);
    this.surface = s;
    const spec = fleetById(this.kind);
    const speedKmh = Math.abs(this.speed) * 3.6;

    const heavy = spec.mass > 1.4 ? s.heavyPenalty : 1;
    let traction = (s.traction * spec.grip / heavy) * wx.roadFrictionCoeff;
    if (this.kind === "deplaceige") traction = Math.min(1.08, traction / Math.max(0.42, wx.roadFrictionCoeff) * 0.94);
    if (a.boost) traction *= 1.12;
    const throttle = a.throttle * traction;
    const maxSpeed = spec.maxSpeed * s.traction * wx.roadFrictionCoeff * (a.boost ? 1.18 : 1) * loadMul / Math.sqrt(heavy);

    if (throttle > 0) this.speed += throttle * spec.accel * loadMul * dt;
    if (a.brake > 0) {
      if (this.speed > 0.4) this.speed -= 26 * a.brake * dt;
      else this.speed -= 9 * a.brake * dt;
    }
    const drag = (0.32 + s.rolling * 10) * (a.throttle > 0.1 ? 0.45 : 1);
    this.speed *= 1 - drag * dt;
    if (Math.abs(this.speed) < 0.04 && a.throttle < 0.05 && a.brake < 0.05) this.speed = 0;
    this.speed = clamp(this.speed, -11, maxSpeed);

    const speedFactor = Math.min(1, Math.abs(this.speed) / 7.5);
    const reverse = this.speed >= 0 ? 1 : -1;
    const steerResponse = 1 - this.slip * 0.42;
    this.yaw += a.steer * 1.85 * speedFactor * reverse * steerResponse * s.lateralGrip * spec.grip * dt;

    const corner = Math.abs(a.steer) * speedKmh * speedKmh * 0.0004;
    const grip = s.lateralGrip * 2.4 * spec.grip;
    const hb = a.handbrake ? 3.1 : 1;
    const demand = (corner * hb) / Math.max(0.05, grip);
    const sf = Math.max(0, (speedKmh - s.slipThreshold * 0.45) / Math.max(20, s.slipThreshold));
    const targetSlip = Math.min(1, Math.max(0, (demand - 0.75) * sf * 1.5));
    if (targetSlip > this.slip) this.slip += (targetSlip - this.slip) * Math.min(1, dt * 9);
    else this.slip += (targetSlip - this.slip) * Math.min(1, dt * s.gripRecovery);
    this.slip = clamp(this.slip, 0, 1);
    this.drifting = this.slip > 0.22;
    this.lateral = this.slip * Math.abs(this.speed) * 0.5;

    this.updateHeading();
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const ox = this.x;
    const oy = this.y;
    const oz = this.z;
    this.x += this.headingX * this.speed * dt + rx * this.lateral * 0.25 * dt * Math.sign(a.steer || 1);
    this.z += this.headingZ * this.speed * dt + rz * this.lateral * 0.25 * dt * Math.sign(a.steer || 1);

    if (!inWorld(this.x, this.z)) {
      this.x = clamp(this.x, WORLD.minX + 24, WORLD.maxX - 24);
      this.z = clamp(this.z, WORLD.minZ + 24, WORLD.maxZ - 24);
      this.speed *= 0.4;
    }

    const hit = physics.correctVehicle(ox, oy, oz, this.x, this.y, this.z, this.yaw);
    this.collided = hit.hit;
    if (hit.hit) {
      this.x = hit.x;
      this.z = hit.z;
      this.speed *= 0.55;
    }

    this.bumpPhase += dt * (4 + speedKmh * 0.12);
    const bumpT =
      s.bumpiness *
      Math.min(1, speedKmh / 50) *
      (Math.sin(this.bumpPhase) * 0.6 + Math.sin(this.bumpPhase * 2.6) * 0.3) *
      0.12;
    this.bumpVel += (bumpT - this.bump) * dt * 40;
    this.bumpVel *= 0.86;
    this.bump += this.bumpVel * dt;

    this.y = getTerrainHeight(this.x, this.z) + 0.42 + this.bump;
    this.kmAccum += Math.abs(this.speed) * dt / 1000;
    this.syncMesh(dt);
  }

  private syncMesh(dt = 0) {
    this.group.position.set(this.x, this.y, this.z);
    this.group.lookAt(this.x + this.headingX, this.y, this.z + this.headingZ);
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
      alleyLights: pattern === "code3_emergency",
      sirenPhase: QuebecPoliceSirens.getSyncPhase(),
    });
  }

  private spinWheels(dt: number) {
    const spin = this.speed * dt;
    this.group.traverse((obj) => {
      const r = obj.userData.wheel as number | undefined;
      if (!r || !(obj instanceof THREE.Mesh || obj instanceof THREE.Group)) return;
      obj.rotation.x += spin / Math.max(0.2, r);
    });
  }
}
