import * as THREE from "three";
import { fillPlayer, type Appearance, type AuraId, type HairStyle, type ModelId, type OutfitId } from "./character";
import { fleetById, isVehicleId } from "./fleet";
import { buildSedan } from "./architecture";
import { applyGesture, isGesture, type RpGesture } from "./gestures";
import { rpNet } from "./net";
import type { PlayerState, VehicleState } from "./rpSchema";

interface Slot {
  id: string;
  group: THREE.Group;
  car: THREE.Group | null;
  label: THREE.Sprite;
  from: THREE.Vector3;
  to: THREE.Vector3;
  yawFrom: number;
  yawTo: number;
  vx: number;
  vz: number;
  t: number;
  lookKey: string;
  driving: boolean;
  anim: string;
  bob: number;
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// 🔧 FIX TS : On force la lecture des propriétés (qu'elles soient à la racine ou dans "appearance")
function lookOf(p: PlayerState): Appearance {
  const state = p as any; 
  return {
    name: p.username || "Citoyen",
    skin: state.skin ?? state.appearance?.skinTone ?? 0,
    hair: state.hair ?? state.appearance?.hairColor ?? 0,
    hairStyle: (state.hairStyle || state.appearance?.hairStyle || "court") as HairStyle,
    outfit: (state.outfit || state.appearance?.outfitTop || "canadienne") as OutfitId,
    aura: (state.aura || state.appearance?.aura || "none") as AuraId,
    model: (state.model || state.appearance?.model || "voyageur") as ModelId,
    face: 0,
  };
}

function nameSprite(name: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(12,18,16,0.72)";
  ctx.fillRect(8, 16, 240, 36);
  ctx.fillStyle = "#ece8de";
  ctx.font = "600 22px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name.slice(0, 22), 128, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(2.4, 0.6, 1);
  spr.position.y = 2.35;
  return spr;
}

function makeCar(type: string) {
  if (isVehicleId(type)) return fleetById(type).build();
  return buildSedan(0xc0c0c0);
}

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

export class RemoteField {
  group = new THREE.Group();
  private slots = new Map<string, Slot>();
  private cam = new THREE.Vector3();

  constructor() {
    this.group.name = "rp-remotes";
  }

  sync() {
    const seen = new Set<string>();
    for (const [id, p] of rpNet.remotes) {
      if (!rpNet.inAoi(id)) continue;
      seen.add(id);
      this.upsertPlayer(p);
    }
    for (const [id, v] of rpNet.remoteVehicles) {
      const driver = v.driverId;
      if (driver && this.slots.has(driver)) this.upsertCar(this.slots.get(driver)!, v);
    }
    for (const [id, slot] of this.slots) {
      if (!seen.has(id)) {
        this.group.remove(slot.group);
        this.slots.delete(id);
      }
    }
  }

  tick(dt: number, camera?: THREE.Camera) {
    if (camera) camera.getWorldPosition(this.cam);
    for (const slot of this.slots.values()) {
      slot.t = Math.min(1, slot.t + dt * 9);
      const k = 1 - (1 - slot.t) * (1 - slot.t);
      slot.group.position.lerpVectors(slot.from, slot.to, k);
      if (slot.t >= 1 && (slot.vx || slot.vz)) {
        slot.group.position.x += slot.vx * dt * 0.35;
        slot.group.position.z += slot.vz * dt * 0.35;
      }
      slot.group.rotation.y = lerpAngle(slot.yawFrom, slot.yawTo, k);
      if (slot.car) slot.car.visible = slot.driving;
      for (const child of slot.group.children) {
        if (child !== slot.car && child !== slot.label) child.visible = !slot.driving;
      }
      slot.label.visible = true;
      if (camera) slot.label.lookAt(this.cam);
      const walking = !slot.driving && (slot.anim === "walk" || slot.anim === "run" || slot.anim === "sprint");
      slot.bob += dt * (walking ? 9 : 1.5);
      poseWalk(slot.group, slot.bob, walking ? 0.32 : 0.05);
      if (isGesture(slot.anim) && slot.anim !== "none") {
        applyGesture(slot.group, slot.anim as RpGesture, slot.bob);
        if (slot.anim === "sit") slot.group.position.y = slot.to.y - 0.42;
      }
    }
  }

  private upsertPlayer(p: PlayerState) {
    let slot = this.slots.get(p.id);
    const state = p as any; // 🔧 FIX TS
    const currentLookKey = `${state.outfit}|${state.aura}|${p.username}|${state.skin}|${state.hair}|${state.model}|${state.hairStyle}`;

    if (!slot) {
      const group = new THREE.Group();
      const look = lookOf(p);
      fillPlayer(group, look);
      const label = nameSprite(p.username);
      group.add(label);
      this.group.add(group);
      slot = {
        id: p.id,
        group,
        car: null,
        label,
        from: new THREE.Vector3(p.x, p.y, p.z),
        to: new THREE.Vector3(p.x, p.y, p.z),
        yawFrom: p.rotation,
        yawTo: p.rotation,
        vx: 0,
        vz: 0,
        t: 1,
        lookKey: currentLookKey,
        driving: Boolean(p.vehicleId),
        anim: p.animation || "idle",
        bob: 0,
      };
      this.slots.set(p.id, slot);
    } else {
      slot.from.copy(slot.group.position);
      slot.yawFrom = slot.group.rotation.y;
      slot.vx = (p.x - slot.to.x) * 8;
      slot.vz = (p.z - slot.to.z) * 8;
      slot.to.set(p.x, p.y, p.z);
      slot.yawTo = p.rotation;
      slot.t = 0;
      slot.driving = Boolean(p.vehicleId);
      slot.anim = p.animation || (Math.hypot(slot.vx, slot.vz) > 0.8 ? "walk" : "idle");
      
      if (currentLookKey !== slot.lookKey) {
        slot.lookKey = currentLookKey;
        fillPlayer(slot.group, lookOf(p));
        const map = slot.label.material.map;
        map?.dispose();
        slot.label.material.dispose();
        slot.label = nameSprite(p.username);
        slot.group.add(slot.label);
        if (slot.car) slot.group.add(slot.car);
      }
    }
  }

  private upsertCar(slot: Slot, v: VehicleState) {
    if (!slot.car) {
      slot.car = makeCar(v.type);
      slot.car.position.y = 0;
      slot.group.add(slot.car);
    }
    slot.driving = Boolean(v.driverId);
  }

  dispose() {
    this.group.clear();
    this.slots.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUCHONS DE COMPATIBILITÉ (Legacy)
// ─────────────────────────────────────────────────────────────────────────────
export function registerRemote(name: string, callback: any) { 
  console.log("[Système] Événement réseau enregistré (Legacy):", name); 
}

export function callRemote(name: string, ...args: any[]) { 
  console.log("[Système] Appel réseau effectué (Legacy):", name); 
}