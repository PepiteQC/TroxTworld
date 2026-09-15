/**
 * ═══════════════════════════════════════════════════════════════════
 * 📐 PHYSIQUE RAPIER 3D — SYSTÈME DE COLLISION ET TÉLÉMÉTRIE DU COMTÉ
 * ═══════════════════════════════════════════════════════════════════
 * Moteur physique pour personnages, véhicules, chocs balistiques,
 * collisions dynamiques (Ragdoll) et interactions spatiales.
 * ═══════════════════════════════════════════════════════════════════
 */

import RAPIER from "@dimforge/rapier3d-compat";
import { getTerrainHeight } from "./worlddata";

export interface SolidBox {
  id: string;
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  yaw: number;
}

export interface RaycastHitResult {
  hit: boolean;
  distance: number;
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  bodyId?: string;
}

const STEP = 1 / 60;
const STREAM_R2 = 95 * 95;
const MAX_LIVE = 120; // Plus de solides simultanés pour les grands complexes

export class CountyPhysics {
  public ready = false;
  private world: RAPIER.World | null = null;
  
  // Contrôleurs et RigidBodies physiques
  private walkerBody: RAPIER.RigidBody | null = null;
  private walkerCol: RAPIER.Collider | null = null;
  private walkerCtl: RAPIER.KinematicCharacterController | null = null;
  
  private vehBody: RAPIER.RigidBody | null = null;
  private vehCol: RAPIER.Collider | null = null;
  private vehCtl: RAPIER.KinematicCharacterController | null = null;
  
  // États de simulation
  private solids: SolidBox[] = [];
  private live = new Map<string, RAPIER.RigidBody>();
  private acc = 0;
  private streamAcc = 0;
  private sx = 0;
  private sz = 0;
  private dirty = false;
  private isRagdollActive = false;

  public async init() {
    try {
      await RAPIER.init();
      this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      this.world.timestep = STEP;

      // ─── 1. CONTROLEUR DE SQUELETTE DE MARCHE (WALKER) ───
      this.walkerBody = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 2, 0),
      );
      this.walkerCol = this.world.createCollider(
        RAPIER.ColliderDesc.capsule(0.48, 0.3), 
        this.walkerBody
      );
      this.walkerCtl = this.world.createCharacterController(0.08);
      this.walkerCtl.setMaxSlopeClimbAngle(0.95);
      this.walkerCtl.setMinSlopeSlideAngle(1.05);
      this.walkerCtl.enableAutostep(0.42, 0.26, true);
      this.walkerCtl.enableSnapToGround(0.32);
      this.walkerCtl.setApplyImpulsesToDynamicBodies(false);
      this.walkerCtl.setUp({ x: 0, y: 1, z: 0 });

      // ─── 2. CONTROLEUR DE CHÂSSIS DE VÉHICULE (VEHICLE) ───
      this.vehBody = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setCcdEnabled(true).setTranslation(0, 1, 0),
      );
      this.vehCol = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.95, 0.62, 2.12), 
        this.vehBody
      );
      this.vehCtl = this.world.createCharacterController(0.05);
      this.vehCtl.setMaxSlopeClimbAngle(0.72);
      this.vehCtl.enableSnapToGround(0.18);
      this.vehCtl.setApplyImpulsesToDynamicBodies(false);
      this.vehCtl.setUp({ x: 0, y: 1, z: 0 });

      this.ready = true;
    } catch (err) {
      console.warn("Rapier 3D indisponible - Mode arcade actif", err);
      this.ready = false;
    }
  }

  public setSolids(solids: SolidBox[]) {
    this.solids = solids;
  }

  public step(dt: number, px: number, pz: number) {
    if (!this.ready || !this.world) return;
    
    this.streamAcc += dt;
    if (this.streamAcc > 0.32) {
      this.streamAcc = 0;
      this.stream(px, pz);
    }
    
    this.acc += Math.min(dt, 0.08);
    let n = 0;
    while (this.acc >= STEP && n < 3) {
      this.world.step();
      this.acc -= STEP;
      n++;
    }
  }

  // ─── RÉSOLUTIONS DE COLLISIONS GÉOMÉTRIQUES ───

  /**
   * Corrige la trajectoire et applique la gravité au joueur à pied.
   */
  public correctWalker(ox: number, oy: number, oz: number, nx: number, ny: number, nz: number) {
    if (!this.ready || !this.world || !this.walkerCol || this.isRagdollActive) {
      return { x: nx, y: ny, z: nz };
    }
    this.ensureStream(nx, nz);
    this.flush();
    
    const dx = nx - ox;
    const dz = nz - oz;
    const hit = this.cast(ox, oy + 0.92, oz, dx, dz, this.walkerCol, 0);
    
    if (!hit) return { x: nx, y: getTerrainHeight(nx, nz), z: nz };
    
    const x = ox + dx * hit;
    const z = oz + dz * hit;
    return { x, y: getTerrainHeight(x, z), z };
  }

  /**
   * Corrige la trajectoire du véhicule et évalue l'intensité du crash.
   */
  public correctVehicle(ox: number, oy: number, oz: number, nx: number, ny: number, nz: number, yaw: number) {
    if (!this.ready || !this.world || !this.vehCol) {
      return { x: nx, y: ny, z: nz, hit: false, crashIntensity: 0 };
    }
    this.ensureStream(nx, nz);
    this.flush();
    
    const dx = nx - ox;
    const dz = nz - oz;
    const toi = this.cast(ox, oy + 0.55, oz, dx, dz, this.vehCol, yaw);
    
    if (toi === null) {
      return { x: nx, y: ny, z: nz, hit: false, crashIntensity: 0 };
    }

    // Calcul de l'intensité de l'impact basé sur le changement brutal de vitesse
    const expectedDist = Math.hypot(dx, dz);
    const actualDist = expectedDist * toi;
    const slowdownDelta = expectedDist - actualDist;
    const crashIntensity = slowdownDelta > 0.4 ? Math.round(slowdownDelta * 24) : 0;
    
    const x = ox + dx * toi;
    const z = oz + dz * toi;
    return { 
      x, 
      y: getTerrainHeight(x, z) + 0.42, 
      z, 
      hit: true,
      crashIntensity, // Retourne la force de l'impact pour les dégâts mécaniques
    };
  }

  // ─── FONCTIONNALITÉS AVANCÉES RP ───

  /**
   * Bascule l'état physique du joueur de Kinématique à Dynamique (simule un malaise, taser ou chute).
   */
  public setRagdollState(active: boolean, forceVector?: { x: number; y: number; z: number }) {
    if (!this.ready || !this.walkerBody) return;
    this.isRagdollActive = active;

    if (active) {
      // Devient dynamique, soumis à la gravité et aux impulsions
      this.walkerBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      if (forceVector) {
        this.walkerBody.applyImpulse(forceVector, true);
      }
    } else {
      // Reprend son état de contrôleur kinématique
      this.walkerBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    }
  }

  /**
   * Projette un rayon laser d'interaction depuis l'écran ou les yeux du joueur (Style ThirdEye).
   */
  public castRayInteraction(
    originX: number, originY: number, originZ: number,
    dirX: number, dirY: number, dirZ: number,
    maxDist = 6.0
  ): RaycastHitResult {
    if (!this.ready || !this.world) {
      return { hit: false, distance: 0, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 } };
    }

    const ray = new RAPIER.Ray({ x: originX, y: originY, z: originZ }, { x: dirX, y: dirY, z: dirZ });
    const hit = this.world.castRayAndGetNormal(ray, maxDist, true, undefined, undefined, undefined, undefined);

    if (hit) {
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      return {
        hit: true,
        distance: hit.timeOfImpact,
        point: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
        normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
      };
    }

    return { hit: false, distance: 0, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 } };
  }

  public dispose() {
    this.ready = false;
    if (this.world) this.world.free();
    this.world = null;
    this.live.clear();
    this.solids = [];
  }

  // ─── INTERNE ───

  private ensureStream(px: number, pz: number) {
    const dx = px - this.sx;
    const dz = pz - this.sz;
    if (this.live.size === 0 || dx * dx + dz * dz > 40 * 40) this.stream(px, pz);
  }

  private flush() {
    if (!this.world || !this.dirty) return;
    this.world.step();
    this.dirty = false;
  }

  private cast(x: number, y: number, z: number, dx: number, dz: number, col: RAPIER.Collider, yaw: number): number | null {
    if (!this.world) return null;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) return null;
    const hy = Math.sin(yaw * 0.5);
    const hw = Math.cos(yaw * 0.5);
    const hit = this.world.castShape(
      { x, y, z },
      { x: 0, y: hy, z: 0, w: hw },
      { x: dx, y: 0, z: dz },
      col.shape,
      0.04,
      1,
      true,
      undefined,
      undefined,
      col,
      col.parent() ?? undefined,
    );
    if (!hit || hit.time_of_impact >= 0.999) return null;
    return Math.max(0, hit.time_of_impact * 0.92);
  }

  private stream(px: number, pz: number) {
    if (!this.world) return;
    this.sx = px;
    this.sz = pz;
    const keep = new Set<string>();
    const near: SolidBox[] = [];
    for (const s of this.solids) {
      const dx = s.x - px;
      const dz = s.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 > STREAM_R2) continue;
      near.push(s);
    }
    near.sort((a, b) => {
      const da = (a.x - px) * (a.x - px) + (a.z - pz) * (a.z - pz);
      const db = (b.x - px) * (b.x - px) + (b.z - pz) * (b.z - pz);
      return da - db;
    });
    const take = near.slice(0, MAX_LIVE);
    for (const s of take) {
      keep.add(s.id);
      if (this.live.has(s.id)) continue;
      const qy = Math.sin(s.yaw * 0.5);
      const qw = Math.cos(s.yaw * 0.5);
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(s.x, s.y, s.z)
          .setRotation({ x: 0, y: qy, z: 0, w: qw }),
      );
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(s.hx, s.hy, s.hz), body);
      this.live.set(s.id, body);
    }
    this.dirty = true;
    for (const [id, body] of this.live) {
      if (keep.has(id)) continue;
      this.world.removeRigidBody(body);
      this.live.delete(id);
      this.dirty = true;
    }
  }
}

export const physics = new CountyPhysics();

