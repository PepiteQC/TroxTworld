import * as THREE from "three";
import { fillPlayer, pulseAura, type Appearance, DEFAULT_APPEARANCE } from "./character";
import { clamp } from "./rng";
import { applyPackLoad, buildBackpack, walkLoadMul } from "./backpack";
import { buildHeldTool } from "./tools";
import { getTerrainHeight, getSurfaceAt, inWorld, WORLD } from "./worlddata";
import { resolveWalls, type WallBox } from "./interiors";
import type { Actions } from "./input";
import { tickMixer } from "./fbx";
import { tickCarabine } from "./carabine";
import { tickAk74 } from "./ak74";
import { tickInjured, playInjuredOn, clearInjuredOn, pickInjuredClip } from "./injured";
import { tickGuns } from "./guns";

export class Walker {
  x = 0;
  y = 1;
  z = 0;
  yaw = 0;
  speed = 0;
  headingX = 0;
  headingZ = -1;
  group: THREE.Group;
  bob = 0;
  indoor = false;
  floorY = 0;
  walls: WallBox[] = [];
  look: Appearance = { ...DEFAULT_APPEARANCE };
  heldId: string | null = null;
  packId: string | null = null;
  fill = 0;
  vitalMul = 1;
  reach = 0;
  fly = false;
  noclip = false;

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
    this.refreshHeld();
    this.refreshPack();
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
    this.sync(elapsed);
  }

  update(dt: number, a: Actions, elapsed: number) {
    this.updateHeading();
    const heavy = this.fill > 0.88;
    const sprint = a.boost && !heavy ? 1.7 : 1;
    const surf = this.indoor ? 1 : getSurfaceAt(this.x, this.z).walkMul;
    const walk = (this.indoor ? 3.2 : 4.35) * sprint * surf * walkLoadMul(this.fill) * this.vitalMul;
    const reverse = a.brake > 0.1 && a.throttle < 0.1;
    const along = (a.throttle - (reverse ? a.brake : 0)) * walk;
    const turn = a.steer * (1.9 + Math.min(1, Math.abs(along) / 3) * 0.6);
    this.yaw += turn * dt;
    this.updateHeading();
    this.x += this.headingX * along * dt;
    this.z += this.headingZ * along * dt;
    this.speed = along;
    if (this.fly) {
      const up = (a.boost ? 1 : 0) - (a.handbrake ? 1 : 0);
      this.y += up * 6.5 * dt;
    }
    if (Math.abs(along) > 0.2) this.bob += dt * (8 + sprint * 3);
    else this.bob += dt * 1.4;

    if (this.indoor && !this.noclip) {
      const r = resolveWalls(this.x, this.z, this.walls);
      this.x = r.x;
      this.z = r.z;
      if (!this.fly) this.y = this.floorY;
    } else if (!this.indoor) {
      if (!this.noclip && !inWorld(this.x, this.z)) {
        this.x = clamp(this.x, WORLD.minX + 24, WORLD.maxX - 24);
        this.z = clamp(this.z, WORLD.minZ + 24, WORLD.maxZ - 24);
      }
      if (!this.fly) this.y = getTerrainHeight(this.x, this.z);
    } else if (!this.fly) {
      this.y = this.floorY;
    }
    this.sync(elapsed, dt);
  }

  private sync(elapsed = 0, dt = 0.016) {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = Math.min(0.14, this.fill * 0.1) * (this.speed > 0.3 ? 1 : 0.4);
    tickMixer(this.group, dt);
    tickCarabine(this.group, dt);
    tickAk74(this.group, dt);
    tickInjured(this.group, dt);
    tickGuns(this.group);
    const amp = this.speed > 0.4 ? 0.22 : 0.04;
    this.group.traverse((obj) => {
      if (obj.userData.leg) {
        obj.rotation.x = Math.sin(this.bob + (obj.userData.leg > 0 ? 0 : Math.PI)) * amp;
      }
      if (obj.userData.arm) {
        const base = Math.sin(this.bob + (obj.userData.arm > 0 ? Math.PI : 0)) * amp * 0.7;
        const extra = obj.userData.arm > 0 ? -this.reach * 1.05 : 0;
        obj.rotation.x = base + extra;
      }
      if (obj.userData.cloak) {
        obj.rotation.x = Math.sin(this.bob * 0.45) * (0.04 + amp * 0.15);
      }
    });
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
}
