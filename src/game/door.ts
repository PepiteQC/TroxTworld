/**
 * ═══════════════════════════════════════════════════════════════════
 * TROXTWORLD — MOTEUR PHYSIQUE DES PORTES & CONTRÔLE D'ACCÈS
 * Ultimate v3.0 — API compatible engine / architecture / SQDC
 *
 * Principes :
 * - une seule source de vérité pour l'état d'une porte ;
 * - API publique stable : open / isOpen / isLocked / isBreached / push ;
 * - écoute réseau via netOn(), émission via netEmit() ;
 * - registre local pour synchronisation réseau fiable ;
 * - animation amortie, auto-sleep et garde-fous dt ;
 * - builders réutilisables pour maisons, commerces, garages et prison.
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib, QC_PALETTE } from "./materials";
import { finishMap, tex } from "./textures";
import { netEmit, netOn } from "./net";
import { addWantedPoints } from "./police";

export type DoorLockType =
  | "standard"
  | "reinforced"
  | "electronic_pin"
  | "smart_keycard"
  | "biometric";

export type DoorStyle =
  | "swing"
  | "sliding"
  | "garage"
  | "jail"
  | "double_swing"
  | "revolving";

export type DoorMaterial = "wood" | "metal" | "glass" | "iron" | "custom";

export interface DoorAccessOptions {
  propertyId?: string;
  slotId?: string;
  lockType?: DoorLockType;
  allowedJobs?: string[];
  allowedPlayers?: string[];
  autoOpenRadius?: number;
  openSound?: string;
  closeSound?: string;
  lockedSound?: string;
  breachSound?: string;
  requiresKeycard?: boolean;
  pinCode?: string;
  isEmergencyExit?: boolean;
  linkedDoors?: string[];
}

export interface DoorState {
  isOpen: boolean;
  isLocked: boolean;
  isBreached: boolean;
  angle: number;
  health: number;
  currentPin?: string;
}

export interface DoorNetworkState {
  angle?: number;
  vel?: number;
  isLocked?: boolean;
  isBreached?: boolean;
  health?: number;
}

export interface DoorRegistryKey {
  propertyId: string;
  slotId: string;
}

export class DoorSoundSystem {
  private static instance: DoorSoundSystem | null = null;
  private readonly sounds = new Map<string, unknown>();
  private enabled = true;

  private constructor() {}

  public static getInstance(): DoorSoundSystem {
    if (!DoorSoundSystem.instance) {
      DoorSoundSystem.instance = new DoorSoundSystem();
    }
    return DoorSoundSystem.instance;
  }

  public initSound(id: string, path: string, loop = false, volume = 0.5): void {
    if (!this.enabled || !id || !path) return;
    // Intentionnellement sans dépendance Howler : l'intégration audio réelle
    // peut être branchée ici sans changer l'API publique.
    void loop;
    void volume;
    this.sounds.set(id, { path, loop, volume });
  }

  public playSound(id: string): void {
    if (!this.enabled || !id) return;
    const sound = this.sounds.get(id) as { path?: string } | undefined;
    if (!sound) return;
    // Point d'intégration audio : pas de console spam dans la boucle de jeu.
  }

  public stopSound(id: string): void {
    if (!id) return;
    this.sounds.delete(`${id}:playing`);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled);
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }
}

const DOOR_REGISTRY = new Map<string, BaseDoor>();

function registryKey(propertyId?: string, slotId?: string): string {
  return `${propertyId ?? "public"}::${slotId ?? "main"}`;
}

function registerDoor(door: BaseDoor): void {
  DOOR_REGISTRY.set(registryKey(door.accessOptions.propertyId, door.accessOptions.slotId), door);
}

function unregisterDoor(door: BaseDoor): void {
  const key = registryKey(door.accessOptions.propertyId, door.accessOptions.slotId);
  if (DOOR_REGISTRY.get(key) === door) DOOR_REGISTRY.delete(key);
}

export function findDoorById(propertyId: string, slotId: string): BaseDoor | null {
  return DOOR_REGISTRY.get(registryKey(propertyId, slotId)) ?? null;
}

export function clearDoorRegistry(): void {
  DOOR_REGISTRY.clear();
}

export abstract class BaseDoor {
  protected group: THREE.Group;
  protected leaf: THREE.Group;
  protected hinge?: THREE.Group;

  public state: DoorState = {
    isOpen: false,
    isLocked: true,
    isBreached: false,
    angle: 0,
    health: 100,
  };

  public readonly accessOptions: DoorAccessOptions;
  protected width: number;
  protected height: number;
  protected sign: 1 | -1 = 1;
  protected geom: 1 | -1 = 1;
  protected latch = 0;
  public vel = 0;

  protected readonly soundSystem: DoorSoundSystem;
  protected readonly a = new THREE.Vector3();
  protected readonly b = new THREE.Vector3();
  protected lastNetworkSync = 0;
  protected readonly syncPayload: Record<string, unknown> = {};
  protected readonly actionPayload: Record<string, unknown> = {};

  private disposed = false;

  constructor(
    group: THREE.Group,
    leaf: THREE.Group,
    hinge?: THREE.Group,
    width = 1,
    height = 2,
    accessOptions: DoorAccessOptions = {},
  ) {
    this.group = group;
    this.leaf = leaf;
    this.hinge = hinge;
    this.width = Math.max(0.1, width);
    this.height = Math.max(0.1, height);
    this.accessOptions = { ...accessOptions };
    this.soundSystem = DoorSoundSystem.getInstance();

    this.syncPayload.propertyId = this.propertyId;
    this.syncPayload.slotId = this.slotId;
    this.actionPayload.propertyId = this.propertyId;
    this.actionPayload.slotId = this.slotId;

    const base = registryKey(this.propertyId, this.slotId);
    if (!DOOR_REGISTRY.has(base)) registerDoor(this);

    const pid = this.propertyId;
    if (this.accessOptions.openSound) {
      this.soundSystem.initSound(`${pid}_open`, this.accessOptions.openSound);
    }
    if (this.accessOptions.closeSound) {
      this.soundSystem.initSound(`${pid}_close`, this.accessOptions.closeSound);
    }
    if (this.accessOptions.lockedSound) {
      this.soundSystem.initSound(`${pid}_locked`, this.accessOptions.lockedSound);
    }
    if (this.accessOptions.breachSound) {
      this.soundSystem.initSound(`${pid}_breach`, this.accessOptions.breachSound);
    }
  }

  public get propertyId(): string {
    return this.accessOptions.propertyId ?? "public";
  }

  public get slotId(): string {
    return this.accessOptions.slotId ?? "main";
  }

  /** Compatibilité engine.ts historique. */
  public get open(): boolean {
    return this.state.isOpen;
  }

  /** Compatibilité engine.ts historique. */
  public push(dt: number, force = 10): void {
    if (this.disposed) return;
    const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    const safeForce = Number.isFinite(force) ? force : 0;
    if (safeForce === 0) return;
    this.applyForce(safeForce * Math.max(safeDt, 0.016));
    this.state.isOpen = true;
  }

  public abstract toggle(playerJob?: string, playerId?: string): void;
  public abstract tick(dt: number, playerPos?: THREE.Vector3): void;

  public canOpen(playerJob?: string, playerId?: string, hasKeycard = false): boolean {
    if (this.disposed) return false;
    if (this.state.isBreached || !this.state.isLocked) return true;
    if (this.accessOptions.isEmergencyExit) return true;
    if (playerJob && this.accessOptions.allowedJobs?.includes(playerJob)) return true;
    if (playerId && this.accessOptions.allowedPlayers?.includes(playerId)) return true;
    if (this.accessOptions.requiresKeycard && hasKeycard) return true;
    return false;
  }

  public hit(impulse: number, attackerId?: string): void {
    if (this.disposed) return;
    const magnitude = Math.abs(Number.isFinite(impulse) ? impulse : 0);
    if (magnitude <= 0) return;

    if (this.state.isLocked && !this.state.isBreached) {
      const resistanceFactor = this.getResistanceFactor();
      this.state.health = Math.max(0, this.state.health - magnitude * resistanceFactor);
      if (this.state.health <= 0) this.breachDoor(attackerId);
      else this.emitRattle(attackerId);
    } else {
      this.applyForce(impulse);
    }
  }

  public breachDoor(breakerId?: string): void {
    if (this.disposed || this.state.isBreached) return;
    this.state.isBreached = true;
    this.state.isLocked = false;
    this.state.health = 0;
    this.vel += this.sign * 15;

    if (breakerId) {
      addWantedPoints(breakerId, 30, "Méfait lourd et intrusion par effraction");
    }

    this.actionPayload.breakerId = breakerId ?? null;
    this.emit("door:breached", this.actionPayload);
    this.soundSystem.playSound(`${this.propertyId}_breach`);
  }

  public repairAndLock(lockType: DoorLockType = "standard"): void {
    if (this.disposed) return;
    this.state.isBreached = false;
    this.state.isLocked = true;
    this.state.health = 100;
    this.state.angle = 0;
    this.state.isOpen = false;
    this.vel = 0;
    this.accessOptions.lockType = lockType;
    this.leaf.rotation.set(0, 0, 0);
    this.actionPayload.lockType = lockType;
    this.emit("door:repaired", this.actionPayload);
    this.soundSystem.playSound(`${this.propertyId}_locked`);
  }

  public setLocked(locked: boolean, playerJob?: string): void {
    if (this.disposed || locked === this.state.isLocked) return;
    if (locked && playerJob && this.accessOptions.allowedJobs?.length && !this.accessOptions.allowedJobs.includes(playerJob)) {
      return;
    }

    this.state.isLocked = locked;
    this.actionPayload.isLocked = locked;
    this.emit("door:lock_toggle", this.actionPayload);
    this.soundSystem.playSound(`${this.propertyId}_${locked ? "locked" : "open"}`);
  }

  protected applyForce(impulse: number): void {
    const magnitude = Number.isFinite(impulse) ? impulse : 0;
    if (!magnitude) return;
    this.vel += this.sign * magnitude;
    this.vel = THREE.MathUtils.clamp(this.vel, -30, 30);
    this.latch = Math.max(this.latch, 0.35);
    this.syncNetworkPhysics(true);
  }

  protected emitRattle(attackerId?: string): void {
    this.actionPayload.damage = Math.max(0, 100 - this.state.health);
    this.actionPayload.attackerId = attackerId ?? null;
    this.emit("door:rattle", this.actionPayload);
  }

  protected syncNetworkPhysics(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastNetworkSync < 150) return;
    this.syncPayload.angle = this.state.angle;
    this.syncPayload.vel = this.vel;
    this.syncPayload.isLocked = this.state.isLocked;
    this.syncPayload.isBreached = this.state.isBreached;
    this.syncPayload.health = this.state.health;
    this.emit("door:physics_sync", this.syncPayload);
    this.lastNetworkSync = now;
  }

  protected emit(event: string, payload: Record<string, unknown>): void {
    try {
      netEmit(event, payload);
    } catch {
      // Le moteur local doit continuer à fonctionner si le réseau n'est pas initialisé.
    }
  }

  protected getResistanceFactor(): number {
    switch (this.accessOptions.lockType) {
      case "reinforced": return 0.2;
      case "electronic_pin": return 0.5;
      case "smart_keycard": return 0.6;
      case "biometric": return 0.1;
      default: return 1;
    }
  }

  protected playSlamSound(): void {
    if (Math.abs(this.vel) > 1.5) {
      this.soundSystem.playSound(`${this.propertyId}_close`);
      this.emit("door:slam", this.actionPayload);
    }
  }

  public leafCenter(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    if (this.hinge) {
      return this.hinge.localToWorld(out.set(this.geom * this.width * 0.5, this.height / 2, 0));
    }
    return this.leaf.localToWorld(out.set(0, this.height / 2, 0));
  }

  public handleWorld(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    return this.leaf.getWorldPosition(out);
  }

  public slabDist(px: number, pz: number): number {
    if (this.hinge) {
      this.hinge.getWorldPosition(this.a);
      this.hinge.localToWorld(this.b.set(this.geom * this.width, 1, 0));
      const abx = this.b.x - this.a.x;
      const abz = this.b.z - this.a.z;
      const denom = abx * abx + abz * abz || 1;
      const t = THREE.MathUtils.clamp(
        ((px - this.a.x) * abx + (pz - this.a.z) * abz) / denom,
        0,
        1,
      );
      const dx = px - (this.a.x + abx * t);
      const dz = pz - (this.a.z + abz * t);
      return Math.hypot(dx, dz);
    }
    this.leaf.getWorldPosition(this.a);
    return Math.hypot(px - this.a.x, pz - this.a.z);
  }

  public worldHit(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    return this.leafCenter(out);
  }

  public get isOpen(): boolean { return this.state.isOpen; }
  public get isLocked(): boolean { return this.state.isLocked; }
  public get isBreached(): boolean { return this.state.isBreached; }

  public getState(): DoorState {
    return { ...this.state };
  }

  public setNetworkState(state: DoorNetworkState): void {
    if (this.disposed) return;
    if (Number.isFinite(state.angle)) this.state.angle = Number(state.angle);
    if (Number.isFinite(state.vel)) this.vel = Number(state.vel);
    if (typeof state.isLocked === "boolean") this.state.isLocked = state.isLocked;
    if (typeof state.isBreached === "boolean") this.state.isBreached = state.isBreached;
    if (Number.isFinite(state.health)) this.state.health = THREE.MathUtils.clamp(Number(state.health), 0, 100);
    this.state.isOpen = Math.abs(this.state.angle) > 0.15;
  }

  public applyNetworkBreach(): void {
    if (this.disposed) return;
    this.state.isBreached = true;
    this.state.isLocked = false;
    this.state.health = 0;
    this.state.isOpen = true;
  }

  public applyNetworkRepair(lockType: DoorLockType = "standard"): void {
    if (this.disposed) return;
    this.state.isBreached = false;
    this.state.isLocked = true;
    this.state.health = 100;
    this.state.angle = 0;
    this.state.isOpen = false;
    this.vel = 0;
    this.accessOptions.lockType = lockType;
    this.leaf.rotation.set(0, 0, 0);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    unregisterDoor(this);
  }
}

export class SwingDoor extends BaseDoor {
  public readonly handle: THREE.Object3D;

  constructor(
    hinge: THREE.Group,
    leaf: THREE.Group,
    handle: THREE.Object3D,
    sign: 1 | -1 = 1,
    geom: 1 | -1 = 1,
    width = 1,
    height = 2,
    accessOptions: DoorAccessOptions = {},
  ) {
    super(hinge || leaf, leaf, hinge, width, height, accessOptions);
    this.handle = handle;
    this.sign = sign;
    this.geom = geom;
  }

  public toggle(playerJob?: string, playerId?: string): void {
    if (!this.canOpen(playerJob, playerId)) {
      this.soundSystem.playSound(`${this.propertyId}_locked`);
      return;
    }

    this.state.isOpen = !this.state.isOpen;
    if (this.state.isOpen) {
      this.vel = this.sign * 5;
      this.soundSystem.playSound(`${this.propertyId}_open`);
    } else {
      this.vel = -this.sign * 3.5;
    }
    this.latch = 0;
    this.syncNetworkPhysics(true);
  }

  public tick(dt: number, _playerPos?: THREE.Vector3): void {
    const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    if (safeDt <= 0) return;
    if (this.latch > 0) this.latch = Math.max(0, this.latch - safeDt);

    if (this.latch <= 0 && Math.abs(this.vel) < 0.001 && Math.abs(this.state.angle) < 0.001 && !this.state.isOpen) {
      this.state.angle = 0;
      return;
    }

    const spring = this.latch > 0 || this.state.isBreached ? 0 : -this.state.angle * 5.5;
    this.vel += (spring - this.vel * 6) * safeDt;
    this.state.angle += this.vel * safeDt;

    const min = this.sign < 0 ? -2.4 : -0.06;
    const max = this.sign < 0 ? 0.06 : 2.4;
    if (this.state.angle < min) {
      this.state.angle = min;
      this.vel *= -0.12;
      this.playSlamSound();
    }
    if (this.state.angle > max) {
      this.state.angle = max;
      this.vel *= -0.12;
      this.playSlamSound();
    }

    this.leaf.rotation.y = this.state.angle;
    this.state.isOpen = Math.abs(this.state.angle) > 0.15;
    if (Math.abs(this.state.angle) < 0.002 && Math.abs(this.vel) < 0.01 && this.latch <= 0) {
      this.state.angle = 0;
      this.vel = 0;
      this.state.isOpen = false;
      this.leaf.rotation.y = 0;
    }
    this.syncNetworkPhysics();
  }

  public override handleWorld(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    return this.handle.getWorldPosition(out);
  }

  public openWithPin(pin: string, playerId?: string): boolean {
    if (this.accessOptions.lockType !== "electronic_pin") return false;
    if (!pin || this.accessOptions.pinCode !== pin) return false;
    this.setLocked(false);
    this.toggle(undefined, playerId);
    return true;
  }

  public openWithKeycard(playerId?: string): boolean {
    if (this.accessOptions.lockType !== "smart_keycard" && !this.accessOptions.requiresKeycard) return false;
    this.setLocked(false);
    this.toggle(undefined, playerId);
    return true;
  }
}

export class SlidingDoor extends BaseDoor {
  public readonly slideAxis: "x" | "z";
  public readonly openDistance: number;
  public readonly autoOpenRadius: number;

  constructor(
    leaf: THREE.Group,
    slideAxis: "x" | "z" = "x",
    openDistance = 2,
    width = 2,
    height = 2,
    accessOptions: DoorAccessOptions = {},
  ) {
    super(new THREE.Group(), leaf, undefined, width, height, accessOptions);
    this.slideAxis = slideAxis;
    this.openDistance = Math.max(0.1, Math.abs(openDistance));
    this.autoOpenRadius = Math.max(0, accessOptions.autoOpenRadius ?? 0);
    this.group.add(leaf);
  }

  public toggle(playerJob?: string, playerId?: string): void {
    if (!this.canOpen(playerJob, playerId)) {
      this.soundSystem.playSound(`${this.propertyId}_locked`);
      return;
    }
    this.state.isOpen = !this.state.isOpen;
    this.soundSystem.playSound(`${this.propertyId}_${this.state.isOpen ? "open" : "close"}`);
    this.syncNetworkPhysics(true);
  }

  public tick(dt: number, playerPos?: THREE.Vector3): void {
    const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    if (safeDt <= 0) return;

    if (this.autoOpenRadius > 0 && playerPos && !this.state.isLocked) {
      this.leaf.getWorldPosition(this.a);
      const dist = Math.hypot(this.a.x - playerPos.x, this.a.z - playerPos.z);
      const shouldOpen = dist < this.autoOpenRadius;
      if (shouldOpen !== this.state.isOpen) {
        this.state.isOpen = shouldOpen;
        this.soundSystem.playSound(`${this.propertyId}_${shouldOpen ? "open" : "close"}`);
      }
    }

    const target = this.state.isOpen ? this.openDistance : 0;
    const alpha = 1 - Math.exp(-10 * safeDt);
    this.state.angle += (target - this.state.angle) * alpha;
    this.leaf.position[this.slideAxis] = this.state.angle;
    if (Math.abs(this.state.angle - target) < 0.001) this.state.angle = target;
    this.syncNetworkPhysics();
  }

  public override handleWorld(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    return this.leaf.getWorldPosition(out);
  }
}

export class GarageDoor extends BaseDoor {
  public readonly openHeight: number;

  constructor(
    leaf: THREE.Group,
    openHeight = 3,
    width = 4,
    height = 3.5,
    accessOptions: DoorAccessOptions = {},
  ) {
    super(new THREE.Group(), leaf, undefined, width, height, accessOptions);
    this.openHeight = Math.max(0.1, openHeight);
    this.group.add(leaf);
  }

  public toggle(playerJob?: string, playerId?: string): void {
    if (!this.canOpen(playerJob, playerId)) {
      this.soundSystem.playSound(`${this.propertyId}_locked`);
      return;
    }
    this.state.isOpen = !this.state.isOpen;
    this.soundSystem.playSound(`${this.propertyId}_${this.state.isOpen ? "open" : "close"}`);
    this.syncNetworkPhysics(true);
  }

  public tick(dt: number): void {
    const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    if (safeDt <= 0) return;
    const target = this.state.isOpen ? this.openHeight : 0;
    this.state.angle += (target - this.state.angle) * (1 - Math.exp(-5 * safeDt));
    if (Math.abs(this.state.angle - target) < 0.001) this.state.angle = target;
    this.leaf.position.y = this.state.angle;
    this.syncNetworkPhysics();
  }

  public override handleWorld(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    return this.leaf.getWorldPosition(out);
  }
}

export class JailDoor extends SlidingDoor {
  constructor(
    leaf: THREE.Group,
    slideAxis: "x" | "z" = "x",
    openDistance = 1.8,
    width = 1,
    height = 2.2,
    accessOptions: DoorAccessOptions = {},
  ) {
    super(leaf, slideAxis, openDistance, width, height, {
      ...accessOptions,
      lockType: "smart_keycard",
      allowedJobs: ["policier", "agent_sq", "gardien"],
      requiresKeycard: true,
    });
  }

  public override toggle(playerJob?: string, playerId?: string): void {
    if (!this.canOpen(playerJob, playerId)) {
      this.soundSystem.playSound(`${this.propertyId}_locked`);
      return;
    }
    super.toggle(playerJob, playerId);
  }
}

export class DoubleSwingDoor {
  public readonly leftDoor: SwingDoor;
  public readonly rightDoor: SwingDoor;
  public readonly group: THREE.Group;

  constructor(
    leftHinge: THREE.Group,
    leftLeaf: THREE.Group,
    leftHandle: THREE.Object3D,
    rightHinge: THREE.Group,
    rightLeaf: THREE.Group,
    rightHandle: THREE.Object3D,
    width = 1,
    height = 2,
    accessOptions: DoorAccessOptions = {},
  ) {
    this.group = new THREE.Group();
    this.leftDoor = new SwingDoor(leftHinge, leftLeaf, leftHandle, -1, -1, width, height, accessOptions);
    this.rightDoor = new SwingDoor(rightHinge, rightLeaf, rightHandle, 1, 1, width, height, {
      ...accessOptions,
      slotId: accessOptions.slotId ? `${accessOptions.slotId}:right` : "main:right",
    });
    this.group.add(leftHinge, rightHinge);
  }

  public toggle(playerJob?: string, playerId?: string): void {
    this.leftDoor.toggle(playerJob, playerId);
    this.rightDoor.toggle(playerJob, playerId);
  }

  public tick(dt: number, playerPos?: THREE.Vector3): void {
    this.leftDoor.tick(dt, playerPos);
    this.rightDoor.tick(dt, playerPos);
  }

  public hit(impulse: number, attackerId?: string): void {
    this.leftDoor.hit(impulse * 0.5, attackerId);
    this.rightDoor.hit(impulse * 0.5, attackerId);
  }

  public setLocked(locked: boolean, playerJob?: string): void {
    this.leftDoor.setLocked(locked, playerJob);
    this.rightDoor.setLocked(locked, playerJob);
  }

  public get isOpen(): boolean { return this.leftDoor.isOpen || this.rightDoor.isOpen; }
  public get isLocked(): boolean { return this.leftDoor.isLocked && this.rightDoor.isLocked; }
}

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(getGeo("box", { w, h, d }), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function cyl(
  r: number,
  h: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  seg = 8,
): THREE.Mesh {
  const m = new THREE.Mesh(getGeo("cylinder", { r, r2: r, h, seg }), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export class ElectronicLock {
  private pinCode: string;
  private _isLocked = true;
  private attempts = 0;
  private readonly maxAttempts = 3;
  private cooldown = 0;

  constructor(pinCode = "0000") {
    this.pinCode = pinCode;
  }

  public tryUnlock(pin: string): boolean {
    if (this.cooldown > 0 || this.pinCode !== pin) {
      this.attempts++;
      if (this.attempts >= this.maxAttempts) {
        this.cooldown = 30;
        this.attempts = 0;
      }
      return false;
    }
    this._isLocked = false;
    this.attempts = 0;
    this.cooldown = 0;
    return true;
  }

  public lock(): void { this._isLocked = true; }
  public setPinCode(newPin: string): void { if (/^\d{4,8}$/.test(newPin)) this.pinCode = newPin; }
  public tick(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - Math.max(0, dt));
  }
  public get isLocked(): boolean { return this._isLocked || this.cooldown > 0; }
}

export class KeycardReader {
  private readonly group: THREE.Group;
  private readonly allowedKeycards = new Set<string>();
  private isActive = true;
  private readonly ledMaterial: THREE.MeshLambertMaterial;

  constructor(x = 0, y = 0, z = 0) {
    this.group = new THREE.Group();
    this.group.name = "keycard_reader";

    const readerBody = box(0.08, 0.16, 0.03, matLib.get(0x1a1a1a, 0.5), x, y, z);
    this.group.add(readerBody);
    this.ledMaterial = matLib.getEmissive(0xef4444, 0xef4444, 0.8) as THREE.MeshLambertMaterial;
    const screen = box(0.06, 0.03, 0.005, this.ledMaterial, x, y + 0.05, z + 0.016);
    screen.name = "keycard_led";
    this.group.add(screen);
    this.group.add(box(0.05, 0.07, 0.005, matLib.get(0x2d2d2d, 0.8), x, y - 0.02, z + 0.016));
  }

  public addAllowedKeycard(keycardId: string): void { if (keycardId) this.allowedKeycards.add(keycardId); }
  public removeAllowedKeycard(keycardId: string): void { this.allowedKeycards.delete(keycardId); }

  public tryUnlock(keycardId: string): boolean {
    if (!this.isActive) return false;
    const granted = this.allowedKeycards.has(keycardId);
    this.setLedColor(granted ? 0x00ff00 : 0xff0000);
    return granted;
  }

  public setActive(active: boolean): void {
    this.isActive = Boolean(active);
    this.setLedColor(active ? 0xef4444 : 0x333333);
  }

  private setLedColor(color: number): void {
    this.ledMaterial.color.setHex(color);
    if ("emissive" in this.ledMaterial) this.ledMaterial.emissive.setHex(color);
  }

  public getGroup(): THREE.Group { return this.group; }
}

export function buildGlassLeaf(
  width: number,
  height: number,
  geomSign: 1 | -1,
  swingSign: 1 | -1,
  opts?: {
    glass?: THREE.Material;
    frame?: THREE.Material;
    neon?: number | null;
    handle?: THREE.Material;
    propertyId?: string;
    slotId?: string;
    lockType?: DoorLockType;
    allowedJobs?: string[];
    allowedPlayers?: string[];
    requiresKeycard?: boolean;
    isEmergencyExit?: boolean;
  },
): { hinge: THREE.Group; door: SwingDoor } {
  const hinge = new THREE.Group();
  const leaf = new THREE.Group();
  const s = geomSign;
  const cx = s * (width / 2);
  const alu = opts?.frame ?? matLib.get(0x2a3038, 0.32, 0.72);
  const aluDark = matLib.get(0x161a20, 0.38, 0.62);
  const steel = opts?.handle ?? matLib.get(0xc9ced4, 0.22, 0.88);
  const kick = matLib.get(0x8a9098, 0.35, 0.7);
  const safeW = Math.max(0.2, width - 0.1);
  const safeH = Math.max(0.2, height - 0.28);

  const glass = new THREE.Mesh(getGeo("box", { w: safeW, h: safeH, d: 0.028 }), opts?.glass ?? matLib.glass(0x9ec8e0, 0.28));
  glass.position.set(cx, height / 2 + 0.04, 0);
  glass.castShadow = true;
  leaf.add(glass);

  const railH = 0.07;
  leaf.add(box(width + 0.02, railH, 0.09, alu, cx, height - railH / 2, 0));
  leaf.add(box(width + 0.02, railH, 0.09, alu, cx, railH / 2, 0));
  leaf.add(box(width + 0.02, 0.055, 0.085, alu, cx, height * 0.46, 0));
  leaf.add(box(0.055, height, 0.09, alu, s * 0.028, height / 2, 0));
  leaf.add(box(0.055, height, 0.09, alu, s * (width - 0.028), height / 2, 0));
  leaf.add(box(Math.max(0.2, width - 0.08), 0.26, 0.04, kick, cx, 0.16, 0.04));

  leaf.add(box(width - 0.16, 0.11, 0.01, matLib.glass(0xd8e8f2, 0.55), cx, height * 0.72, 0.02));

  if (opts?.neon !== null) {
    const neonCol = opts?.neon ?? 0xa78bfa;
    leaf.add(box(width * 0.86, 0.016, 0.028, matLib.getEmissive(neonCol, neonCol, 1.15), cx, height - 0.12, 0.055));
  }

  const barX = s * (width - 0.2);
  const standoffA = cyl(0.018, 0.09, steel, barX, height * 0.42, 0.07);
  standoffA.rotation.x = Math.PI / 2;
  leaf.add(standoffA);
  const standoffB = standoffA.clone();
  standoffB.position.y = height * 0.62;
  leaf.add(standoffB);
  const handle = cyl(0.022, 0.58, steel, barX, height * 0.52, 0.115);
  handle.name = "ether-door-handle";
  leaf.add(handle);
  leaf.add(box(0.08, 0.04, 0.04, steel, barX, height * 0.24, 0.06));

  const hingeMat = matLib.get(0x3a4048, 0.4, 0.65);
  for (const hy of [0.28, height * 0.5, height - 0.32]) leaf.add(box(0.045, 0.13, 0.055, hingeMat, s * 0.02, hy, -0.01));

  hinge.add(box(0.22, 0.05, 0.07, aluDark, s * 0.14, height - 0.07, 0.08));
  leaf.add(box(0.32, 0.018, 0.018, aluDark, s * 0.28, height - 0.1, 0.07));
  leaf.add(box(0.12, 0.12, 0.002, matLib.getEmissive(0x2563eb, 0x2563eb, 0.2), cx - 0.1, height * 0.5, 0.015));

  hinge.add(leaf);
  return {
    hinge,
    door: new SwingDoor(hinge, leaf, handle, swingSign, geomSign, width, height, {
      propertyId: opts?.propertyId,
      slotId: opts?.slotId,
      lockType: opts?.lockType,
      allowedJobs: opts?.allowedJobs,
      allowedPlayers: opts?.allowedPlayers,
      requiresKeycard: opts?.requiresKeycard,
      isEmergencyExit: opts?.isEmergencyExit,
      openSound: "/sounds/door_glass_open.mp3",
      closeSound: "/sounds/door_glass_close.mp3",
    }),
  };
}

export function buildWoodenLeaf(
  width = 0.9,
  height = 2.1,
  opts?: {
    wood?: THREE.Material;
    propertyId?: string;
    slotId?: string;
    lockType?: DoorLockType;
    allowedJobs?: string[];
    allowedPlayers?: string[];
    requiresKeycard?: boolean;
  },
): { hinge: THREE.Group; door: SwingDoor } {
  const hinge = new THREE.Group();
  const leaf = new THREE.Group();
  const wood = opts?.wood ?? tex.mat("chene", 1.1, 2.2, 0.52, 0.08);
  const brass = matLib.get(0xc9a24a, 0.22, 0.86);
  const steel = matLib.get(0x2a2e34, 0.4, 0.55);

  leaf.add(box(width, height, 0.05, wood, 0, height / 2, 0));
  leaf.add(box(width + 0.02, 0.04, 0.06, wood, 0, height - 0.02, 0));
  leaf.add(box(width + 0.02, 0.05, 0.06, wood, 0, 0.03, 0));

  const pw = width * 0.34;
  const phTop = height * 0.22;
  const phBot = height * 0.26;
  const gapX = width * 0.2;
  const inset = tex.mat("noyer", 0.55, 0.7, 0.58, 0.06);
  for (const sx of [-gapX, gapX]) {
    leaf.add(box(pw, phTop, 0.035, inset, sx, height * 0.78, 0.012));
    leaf.add(box(pw, phTop * 0.72, 0.035, inset, sx, height * 0.52, 0.012));
    leaf.add(box(pw, phBot, 0.035, inset, sx, height * 0.26, 0.012));
  }

  leaf.add(box(width - 0.06, 0.16, 0.02, steel, 0, 0.12, 0.028));
  const handle = brassLever(width * 0.32, height * 0.48, 0.04, 1);
  leaf.add(handle);

  const peephole = cyl(0.016, 0.04, brass, width * 0.02, height * 0.72, 0.03);
  peephole.rotation.x = Math.PI / 2;
  leaf.add(peephole);
  const lens = cyl(0.01, 0.012, matLib.get(0x111111, 0.15, 0.4), width * 0.02, height * 0.72, 0.048);
  lens.rotation.x = Math.PI / 2;
  leaf.add(lens);

  hinge.add(leaf);
  return {
    hinge,
    door: new SwingDoor(hinge, leaf, handle, 1, 1, width, height, {
      propertyId: opts?.propertyId,
      slotId: opts?.slotId,
      lockType: opts?.lockType,
      allowedJobs: opts?.allowedJobs,
      allowedPlayers: opts?.allowedPlayers,
      requiresKeycard: opts?.requiresKeycard,
      openSound: "/sounds/door_wood_open.mp3",
      closeSound: "/sounds/door_wood_close.mp3",
    }),
  };
}

export function buildDoorCasing(width = 0.96, height = 2.22, depth = 0.16, mat?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = "door-casing";
  const wood = mat ?? matLib.get(0x1c1a24, 0.55, 0.18);
  const casing = matLib.get(0x2a2430, 0.62, 0.12);
  const half = width / 2;
  g.add(box(0.07, height, depth, wood, -half, height / 2, 0));
  g.add(box(0.07, height, depth, wood, half, height / 2, 0));
  g.add(box(width + 0.1, 0.08, depth, wood, 0, height + 0.02, 0));
  g.add(box(0.05, height + 0.1, 0.045, casing, -(half + 0.055), height / 2 + 0.02, depth * 0.38));
  g.add(box(0.05, height + 0.1, 0.045, casing, half + 0.055, height / 2 + 0.02, depth * 0.38));
  g.add(box(width + 0.18, 0.06, 0.05, casing, 0, height + 0.08, depth * 0.4));
  const sill = box(width + 0.08, 0.035, depth + 0.06, matLib.get(0x6a7078, 0.4, 0.7), 0, 0.018, 0.02);
  sill.receiveShadow = true;
  g.add(sill);
  return g;
}

export function brassLever(x: number, y: number, z: number, flip = 1): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const brass = matLib.get(0xc9a24a, 0.22, 0.86);
  g.add(box(0.07, 0.07, 0.02, brass));
  const neck = cyl(0.012, 0.05, brass, 0, 0, 0.03);
  neck.rotation.x = Math.PI / 2;
  g.add(neck);
  g.add(box(0.14, 0.028, 0.028, brass, flip * 0.06, 0, 0.055));
  return g;
}

export function buildHouseFrontDoor(width = 0.95, height = 2.08, opts?: DoorAccessOptions & { wood?: THREE.Material }): { group: THREE.Group; door: SwingDoor } {
  const g = new THREE.Group();
  g.name = "porte_maison";
  const wood = opts?.wood ?? matLib.get(QC_PALETTE.porte, 0.62, 0.08);
  g.add(buildDoorCasing(width + 0.08, height + 0.08, 0.14, matLib.get(QC_PALETTE.boiserie, 0.78)));
  const { hinge, door } = buildWoodenLeaf(width, height, {
    ...opts,
    wood,
  });
  hinge.position.z = 0.02;
  g.add(hinge);
  const frame = matLib.get(QC_PALETTE.boiserie, 0.78);
  g.add(box(width * 0.72, 0.28, 0.05, frame, 0, height + 0.22, 0));
  g.add(box(width * 0.64, 0.2, 0.02, matLib.get(QC_PALETTE.fenetre, 0.22, 0.35), 0, height + 0.22, 0.03));
  g.add(box(0.03, 0.2, 0.03, frame, 0, height + 0.22, 0.03));
  if (opts?.requiresKeycard) g.add(buildKeypadReader(width / 2 + 0.12, height * 0.5, 0.08));
  return { group: g, door };
}

export function buildSlidingGlassDoor(width = 2, height = 2.4, opts?: DoorAccessOptions): { group: THREE.Group; door: SlidingDoor } {
  const g = new THREE.Group();
  const leaf = new THREE.Group();
  const frameMat = matLib.get(0x2a3038, 0.32, 0.72);
  const glassMat = matLib.glass(0x9ec8e0, 0.28);
  g.add(box(width + 0.2, height + 0.1, 0.15, frameMat, 0, height / 2, 0));
  leaf.add(box(width - 0.1, height - 0.2, 0.04, glassMat, 0, height / 2 - 0.05, 0));
  leaf.add(box(width, 0.1, 0.06, frameMat, 0, 0.05, 0));
  leaf.add(box(width, 0.1, 0.06, frameMat, 0, height - 0.15, 0));
  g.add(leaf);
  const door = new SlidingDoor(leaf, "x", width * 0.9, width, height, {
    ...opts,
    openSound: "/sounds/door_sliding_open.mp3",
    closeSound: "/sounds/door_sliding_close.mp3",
  });
  return { group: g, door };
}

export function buildGarageDoor(width = 4, height = 3.5, opts?: DoorAccessOptions): { group: THREE.Group; door: GarageDoor } {
  const g = new THREE.Group();
  const leaf = new THREE.Group();
  const metalMat = matLib.get(0x8a9098, 0.5, 0.6);
  const numSlats = Math.max(1, Math.floor(height / 0.3));
  for (let i = 0; i < numSlats; i++) leaf.add(box(width, 0.28, 0.08, metalMat, 0, i * 0.3 + 0.15, 0));
  g.add(leaf);
  const door = new GarageDoor(leaf, height - 0.2, width, height, {
    ...opts,
    openSound: "/sounds/garage_open.mp3",
    closeSound: "/sounds/garage_close.mp3",
  });
  return { group: g, door };
}

export function buildJailDoor(width = 1, height = 2.2, opts?: DoorAccessOptions): { group: THREE.Group; door: JailDoor } {
  const g = new THREE.Group();
  const leaf = new THREE.Group();
  const ironMat = matLib.get(0x111111, 0.8, 0.9);
  leaf.add(box(0.05, height, 0.05, ironMat, -width / 2 + 0.025, height / 2, 0));
  leaf.add(box(0.05, height, 0.05, ironMat, width / 2 - 0.025, height / 2, 0));
  leaf.add(box(width, 0.05, 0.05, ironMat, 0, 0.025, 0));
  leaf.add(box(width, 0.05, 0.05, ironMat, 0, height - 0.025, 0));
  const numBars = 7;
  const spacing = width / (numBars + 1);
  for (let i = 1; i <= numBars; i++) leaf.add(cyl(0.015, height, ironMat, -width / 2 + i * spacing, height / 2, 0));
  leaf.add(box(0.15, 0.3, 0.08, ironMat, width / 2 - 0.1, height / 2, 0));
  g.add(leaf);
  const door = new JailDoor(leaf, "x", width * 0.95, width, height, {
    ...opts,
    lockType: "smart_keycard",
    allowedJobs: ["policier", "agent_sq", "gardien"],
    requiresKeycard: true,
    openSound: "/sounds/jail_open.mp3",
    closeSound: "/sounds/jail_close.mp3",
  });
  return { group: g, door };
}

export function buildKeypadReader(x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = "keypad_reader";
  g.add(box(0.08, 0.16, 0.03, matLib.get(0x1a1a1a, 0.5), x, y, z));
  const screen = box(0.06, 0.03, 0.005, matLib.getEmissive(0xef4444, 0xef4444, 0.8), x, y + 0.05, z + 0.016);
  screen.name = "keypad_led";
  g.add(screen);
  g.add(box(0.05, 0.07, 0.005, matLib.get(0x2d2d2d, 0.8), x, y - 0.02, z + 0.016));
  return g;
}

const labelCache = new Map<string, THREE.MeshLambertMaterial>();

export function doorLabelMat(text: string, bg = "#c9a24a", fg = "#1a1208"): THREE.MeshLambertMaterial {
  const key = `${text}|${bg}|${fg}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 236, 108);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${text.length > 4 ? 48 : 72}px Georgia, "Times New Roman", serif`;
  ctx.fillText(text, 128, 66);
  const map = finishMap(new THREE.CanvasTexture(c), "clamp");
  const mat = new THREE.MeshLambertMaterial({ map, color: 0xffffff });
  mat.userData.csmWired = true;
  labelCache.set(key, mat);
  return mat;
}

export function createDoorLight(color = 0xffaa00, intensity = 0.5, distance = 5): THREE.PointLight {
  const light = new THREE.PointLight(color, intensity, distance);
  light.castShadow = false;
  return light;
}

export function createDoorParticles(_door: BaseDoor, particleCount = 10): THREE.Group {
  const particles = new THREE.Group();
  const count = Math.max(0, Math.min(Math.floor(particleCount), 128));
  for (let i = 0; i < count; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.8 }),
    );
    particle.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
    particles.add(particle);
  }
  return particles;
}

let networkSyncDispose: (() => void) | null = null;

export function setupDoorNetworkSync(): () => void {
  networkSyncDispose?.();

  const unsubPhysics = netOn("door:physics_sync", (payload: any) => {
    const door = findDoorById(String(payload?.propertyId ?? "public"), String(payload?.slotId ?? "main"));
    if (!door) return;
    door.setNetworkState(payload ?? {});
  });

  const unsubBreached = netOn("door:breached", (payload: any) => {
    const door = findDoorById(String(payload?.propertyId ?? "public"), String(payload?.slotId ?? "main"));
    door?.applyNetworkBreach();
  });

  const unsubRepaired = netOn("door:repaired", (payload: any) => {
    const door = findDoorById(String(payload?.propertyId ?? "public"), String(payload?.slotId ?? "main"));
    door?.applyNetworkRepair((payload?.lockType as DoorLockType | undefined) ?? "standard");
  });

  networkSyncDispose = () => {
    unsubPhysics?.();
    unsubBreached?.();
    unsubRepaired?.();
    networkSyncDispose = null;
  };

  return networkSyncDispose;
}

export function disposeDoorSystems(): void {
  networkSyncDispose?.();
  networkSyncDispose = null;
  DOOR_REGISTRY.clear();
  labelCache.forEach((mat) => mat.map?.dispose());
  labelCache.forEach((mat) => mat.dispose());
  labelCache.clear();
}

export function buildPanelLeaf(width: number, height: number, materialOrOpts?: unknown): THREE.Group {
  const g = new THREE.Group();
  let mat: THREE.Material;
  if (materialOrOpts instanceof THREE.Material) mat = materialOrOpts;
  else if (materialOrOpts && typeof materialOrOpts === "object" && "wood" in materialOrOpts && (materialOrOpts as any).wood instanceof THREE.Material) {
    mat = (materialOrOpts as any).wood;
  } else {
    mat = matLib.get(0x8a5a36, 0.8, 0.1);
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.04), mat);
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}
