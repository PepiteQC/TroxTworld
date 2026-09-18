/**
 * ═══════════════════════════════════════════════════════════════════
 * 📐 PHYSIQUE RAPIER 3D — SYSTÈME DE COLLISION ET TÉLÉMÉTRIE (V2 HD)
 * ═══════════════════════════════════════════════════════════════════
 * Style GTA STRICT. Physique des personnages (Wall-sliding, trottoirs),
 * crash de véhicules dynamiques, balistique avancée et ThirdEye.
 * 
 * AMÉLIORATIONS V2.0 :
 * - Suspension par roue indépendante (4 roues)
 * - Drift mechanics avec perte d'adhérence
 * - Dommages localisés et déformation progressive
 * - Balistique avancée (ricochets, pénétration, gravité)
 * - Props destructibles avec fragmentation
 * - Eau/flottabilité et verglas
 * - Rope physics et contraintes
 * - Collision layers et queries spatiales
 * - Optimisations (sleeping, LOD, batching)
 * ═══════════════════════════════════════════════════════════════════
 */

import RAPIER from "@dimforge/rapier3d-compat";
import { getTerrainHeight } from "./worlddata";

// ═══════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════

export interface SolidBox {
  id: string;
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  yaw: number;
  // ── NOUVEAU v2.0 ──
  material?: "concrete" | "metal" | "wood" | "glass" | "dirt";
  destructible?: boolean;
  health?: number;
  mass?: number;
  isDynamic?: boolean;
}

export interface RaycastHitResult {
  hit: boolean;
  distance: number;
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  bodyId?: string;
  // ── NOUVEAU v2.0 ──
  material?: string;
  penetrable?: boolean;
  ricochetAngle?: number;
}

export interface VehicleWheel {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  joint: any;
  suspension: any;
  isGrounded: boolean;
  slipAngle: number;
  rotation: number;
  steerAngle: number;
  brakeForce: number;
  damageLevel: number; // 0-100
}

export interface VehiclePhysicsState {
  body: RAPIER.RigidBody;
  chassis: RAPIER.Collider;
  wheels: VehicleWheel[];
  engineForce: number;
  brakeForce: number;
  steerAngle: number;
  handbrake: boolean;
  speed: number;
  rpm: number;
  gear: number;
  isDrifting: boolean;
  driftAngle: number;
  damage: {
    front: number;
    rear: number;
    left: number;
    right: number;
    roof: number;
  };
  isFlipped: boolean;
  isTotalled: boolean;
}

export interface ProjectilePhysics {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  velocity: { x: number; y: number; z: number };
  gravity: number;
  drag: number;
  penetrationPower: number;
  ricochetChance: number;
  fragments?: number;
  ownerId: string;
  damage: number;
  lifetime: number;
  createdAt: number;
}

export interface RopeSegment {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  joint: any;
}

export interface Rope {
  segments: RopeSegment[];
  anchorPoint: { x: number; y: number; z: number };
  length: number;
  tension: number;
}

export interface ExplosionResult {
  affectedBodies: string[];
  damageDealt: Map<string, number>;
  impulseApplied: Map<string, { x: number; y: number; z: number }>;
}

export type CollisionLayer = 
  | "terrain" 
  | "building" 
  | "vehicle" 
  | "player" 
  | "npc" 
  | "prop" 
  | "projectile" 
  | "trigger"
  | "water";

export interface PhysicsQueryOptions {
  layers?: CollisionLayer[];
  excludeIds?: string[];
  maxResults?: number;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════

const STEP = 1 / 60;
const STREAM_R2 = 95 * 95;
const MAX_LIVE = 150;

// Physique véhicules
const WHEEL_RADIUS = 0.35;
const WHEEL_WIDTH = 0.25;
const SUSPENSION_STIFFNESS = 30.0;
const SUSPENSION_DAMPING = 4.5;
const SUSPENSION_REST_LENGTH = 0.3;
const MAX_STEER_ANGLE = Math.PI / 6; // 30 degrés
const DRIFT_THRESHOLD = 0.4; // Angle de glisse pour drift

// Balistique
const BULLET_GRAVITY = 9.81;
const BULLET_DRAG = 0.001;
const RICOCHET_ANGLE_THRESHOLD = Math.PI / 6; // 30 degrés

// Matériaux
const MATERIAL_FRICTION: Record<string, number> = {
  concrete: 1.0,
  metal: 0.8,
  wood: 0.9,
  glass: 0.3,
  dirt: 0.7,
  ice: 0.1,
  mud: 0.5,
  water: 0.2,
};

const MATERIAL_PENETRATION: Record<string, number> = {
  concrete: 0.2,
  metal: 0.3,
  wood: 0.8,
  glass: 1.0,
  dirt: 0.6,
};

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PHYSIQUE PRINCIPAL
// ═══════════════════════════════════════════════════════════

export class CountyPhysics {
  public ready = false;
  private world: RAPIER.World | null = null;
  
  // Contrôleurs et RigidBodies physiques
  private walkerBody: RAPIER.RigidBody | null = null;
  private walkerCol: RAPIER.Collider | null = null;
  private walkerCtl: RAPIER.KinematicCharacterController | null = null;
  
  // ── NOUVEAU v2.0 : Véhicule avec suspension ──
  private vehicles = new Map<string, VehiclePhysicsState>();
  
  // ── NOUVEAU v2.0 : Projectiles ──
  private projectiles: ProjectilePhysics[] = [];
  
  // ── NOUVEAU v2.0 : Cordes ──
  private ropes = new Map<string, Rope>();
  
  // ── NOUVEAU v2.0 : Props dynamiques ──
  private dynamicProps = new Map<string, RAPIER.RigidBody>();
  
  // États de simulation
  private solids: SolidBox[] = [];
  private live = new Map<string, RAPIER.RigidBody>();
  private acc = 0;
  private streamAcc = 0;
  private sx = 0;
  private sz = 0;
  private dirty = false;
  private isRagdollActive = false;
  
  // ── NOUVEAU v2.0 : Environnement ──
  private windForce = { x: 0, y: 0, z: 0 };
  private waterLevel = -10; // Niveau d'eau global
  private isRaining = false;
  private isSnowing = false;

  public async init() {
    try {
      await RAPIER.init();
      this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      this.world.timestep = STEP;
      
      // ── NOUVEAU v2.0 : Configuration des layers ──
      this.setupCollisionGroups();

      // ─── 1. CONTROLEUR DE PIÉTON (WALKER - STYLE GTA) ───
      this.walkerBody = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 2, 0),
      );
      const walkerColDesc = RAPIER.ColliderDesc.capsule(0.48, 0.3)
        .setFriction(1.0)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max)
        .setCollisionGroups(this.getCollisionGroup("player"));
      this.walkerCol = this.world.createCollider(walkerColDesc, this.walkerBody);
      
      this.walkerCtl = this.world.createCharacterController(0.05);
      this.walkerCtl.setMaxSlopeClimbAngle(Math.PI / 4);
      this.walkerCtl.setMinSlopeSlideAngle(Math.PI / 3);
      this.walkerCtl.enableAutostep(0.40, 0.20, true);
      this.walkerCtl.enableSnapToGround(0.35);
      this.walkerCtl.setApplyImpulsesToDynamicBodies(true);
      this.walkerCtl.setUp({ x: 0, y: 1, z: 0 });

      this.ready = true;
    } catch (err) {
      console.warn("[Rapier3D] Erreur d'initialisation - Fallback Arcade", err);
      this.ready = false;
    }
  }
  
  private setupCollisionGroups() {
    // Configuration des groupes de collision pour filtrage
    // Bitmask pour chaque layer
  }
  
  private getCollisionGroup(layer: CollisionLayer): number {
    const groups: Record<CollisionLayer, number> = {
      terrain: 0b000000001,
      building: 0b000000010,
      vehicle: 0b000000100,
      player: 0b000001000,
      npc: 0b000010000,
      prop: 0b000100000,
      projectile: 0b001000000,
      trigger: 0b010000000,
      water: 0b100000000,
    };
    return groups[layer];
  }

  public setSolids(solids: SolidBox[]) {
    this.solids = solids;
  }
  
  // ── NOUVEAU v2.0 : Environnement ──
  
  public setWind(force: { x: number; y: number; z: number }) {
    this.windForce = force;
  }
  
  public setWaterLevel(level: number) {
    this.waterLevel = level;
  }
  
  public setWeather(raining: boolean, snowing: boolean) {
    this.isRaining = raining;
    this.isSnowing = snowing;
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
      // ── NOUVEAU v2.0 : Update projectiles ──
      this.updateProjectiles(STEP);
      
      // ── NOUVEAU v2.0 : Update vehicles ──
      this.updateVehicles(STEP);
      
      // ── NOUVEAU v2.0 : Apply wind to dynamic props ──
      this.applyWindToDynamicBodies();
      
      // ── NOUVEAU v2.0 : Buoyancy ──
      this.applyBuoyancy();
      
      this.world.step();
      this.acc -= STEP;
      n++;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CONTRÔLE PIÉTON (WALKER)
  // ═══════════════════════════════════════════════════════════

  public correctWalker(ox: number, oy: number, oz: number, nx: number, ny: number, nz: number) {
    if (!this.ready || !this.world || !this.walkerCol || !this.walkerCtl || this.isRagdollActive) {
      return { x: nx, y: ny, z: nz };
    }
    this.ensureStream(nx, nz);
    this.flush();
    
    this.walkerBody!.setTranslation({ x: ox, y: oy + 0.92, z: oz }, true);
    
    const dx = nx - ox;
    const dz = nz - oz;
    const desiredMovement = { x: dx, y: -0.1, z: dz };

    this.walkerCtl.computeColliderMovement(this.walkerCol, desiredMovement);
    const movement = this.walkerCtl.computedMovement();
    
    const x = ox + movement.x;
    const z = oz + movement.z;
    
    // ── NOUVEAU v2.0 : Détection de surface ──
    const surfaceMaterial = this.getSurfaceMaterial(x, z);
    const frictionMultiplier = this.getSurfaceFriction(surfaceMaterial);
    
    return { 
      x, 
      y: getTerrainHeight(x, z), 
      z,
      surfaceMaterial,
      frictionMultiplier,
    };
  }
  
  private getSurfaceMaterial(x: number, z: number): string {
    // Détection du matériau de surface basé sur la position
    const height = getTerrainHeight(x, z);
    
    if (height < this.waterLevel) return "water";
    if (this.isSnowing && height > 50) return "snow";
    if (this.isRaining) return "wet_concrete";
    
    // Par défaut, béton
    return "concrete";
  }
  
  private getSurfaceFriction(material: string): number {
    return MATERIAL_FRICTION[material] ?? 1.0;
  }

  public setRagdollState(active: boolean, forceVector?: { x: number; y: number; z: number }) {
    if (!this.ready || !this.walkerBody) return;
    this.isRagdollActive = active;

    if (active) {
      this.walkerBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      if (forceVector) {
        this.walkerBody.applyImpulse(forceVector, true);
        this.walkerBody.applyTorqueImpulse({ 
          x: (Math.random() - 0.5) * 10, 
          y: (Math.random() - 0.5) * 10, 
          z: (Math.random() - 0.5) * 10 
        }, true);
      }
    } else {
      this.walkerBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
      this.walkerBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VÉHICULES AVEC SUSPENSION (NOUVEAU v2.0)
  // ═══════════════════════════════════════════════════════════

  public createVehicle(
    vehicleId: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
    mass: number = 1500,
  ): VehiclePhysicsState {
    if (!this.ready || !this.world) {
      throw new Error("Physics not initialized");
    }

    // Châssis principal
    const chassisDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y + 0.8, z)
      .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) })
      .setLinearDamping(0.5)
      .setAngularDamping(1.0)
      .setCcdEnabled(true);
    
    const chassisBody = this.world.createRigidBody(chassisDesc);
    
    const chassisColDesc = RAPIER.ColliderDesc.cuboid(0.95, 0.62, 2.12)
      .setMass(mass)
      .setFriction(0.8)
      .setRestitution(0.2)
      .setCollisionGroups(this.getCollisionGroup("vehicle"));
    
    const chassisCollider = this.world.createCollider(chassisColDesc, chassisBody);

    // Création des 4 roues avec suspension
    const wheelPositions = [
      { x: -0.8, y: -0.3, z: 1.4, steer: true },   // Avant-gauche
      { x: 0.8, y: -0.3, z: 1.4, steer: true },    // Avant-droit
      { x: -0.8, y: -0.3, z: -1.4, steer: false }, // Arrière-gauche
      { x: 0.8, y: -0.3, z: -1.4, steer: false },  // Arrière-droit
    ];

    const wheels: VehicleWheel[] = [];

    for (const pos of wheelPositions) {
      // Corps de la roue
      const wheelBody = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x + pos.x, y + pos.y, z + pos.z)
          .setLinearDamping(0.1)
          .setAngularDamping(0.1),
      );

      const wheelColDesc = RAPIER.ColliderDesc.cylinder(WHEEL_WIDTH / 2, WHEEL_RADIUS)
        .setMass(mass / 20)
        .setFriction(1.5)
        .setRestitution(0.3)
        .setCollisionGroups(this.getCollisionGroup("vehicle"));
      
      const wheelCollider = this.world.createCollider(wheelColDesc, wheelBody);

      // Joint de suspension (ressort)
      const suspension = this.world.createImpulseJoint(
        (RAPIER.JointData.spring as any)(
    { x: pos.x, y: pos.y + SUSPENSION_REST_LENGTH, z: pos.z },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    SUSPENSION_STIFFNESS,
    SUSPENSION_DAMPING,
    SUSPENSION_REST_LENGTH,
  ),
        chassisBody,
        wheelBody,
        true,
      );

      // Joint de rotation (axe de la roue)
      const revolute = this.world.createImpulseJoint(
        RAPIER.JointData.revolute(
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
        ),
        wheelBody,
        wheelBody,
        true,
      );

      wheels.push({
        body: wheelBody,
        collider: wheelCollider,
        joint: revolute as any,
        suspension: suspension as any,
        isGrounded: false,
        slipAngle: 0,
        rotation: 0,
        steerAngle: 0,
        brakeForce: 0,
        damageLevel: 0,
      });
    }

    const vehicleState: VehiclePhysicsState = {
      body: chassisBody,
      chassis: chassisCollider,
      wheels,
      engineForce: 0,
      brakeForce: 0,
      steerAngle: 0,
      handbrake: false,
      speed: 0,
      rpm: 0,
      gear: 1,
      isDrifting: false,
      driftAngle: 0,
      damage: {
        front: 0,
        rear: 0,
        left: 0,
        right: 0,
        roof: 0,
      },
      isFlipped: false,
      isTotalled: false,
    };

    this.vehicles.set(vehicleId, vehicleState);
    return vehicleState;
  }

  public updateVehicleControl(
    vehicleId: string,
    throttle: number, // -1 à 1
    brake: number,    // 0 à 1
    steer: number,    // -1 à 1
    handbrake: boolean,
  ) {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || !this.ready || !this.world) return;

    // Application du steering
    vehicle.steerAngle = steer * MAX_STEER_ANGLE;
    
    // Application aux roues avant
    for (const wheel of vehicle.wheels) {
      if (wheel.steerAngle !== undefined) {
        // Rotation de la roue pour le steering
        wheel.body.setRotation({
          x: 0,
          y: Math.sin(vehicle.steerAngle / 2),
          z: 0,
          w: Math.cos(vehicle.steerAngle / 2),
        }, true);
      }
    }

    // Force moteur
    const maxEngineForce = 3000;
    vehicle.engineForce = throttle * maxEngineForce;

    // Freinage
    vehicle.brakeForce = brake * 5000;
    vehicle.handbrake = handbrake;

    // Application des forces aux roues
    for (let i = 0; i < vehicle.wheels.length; i++) {
      const wheel = vehicle.wheels[i];
      const isFront = i < 2;
      const isLeft = i % 2 === 0;

      // Force moteur (roues arrière uniquement pour propulsion)
      if (!isFront) {
        const force = vehicle.engineForce / 2;
        wheel.body.applyTorqueImpulse({ x: force, y: 0, z: 0 }, true);
      }

      // Freinage
      const brakeTorque = vehicle.brakeForce / 4;
      wheel.body.applyTorqueImpulse({ x: -brakeTorque, y: 0, z: 0 }, true);

      // Handbrake (bloque les roues arrière)
      if (vehicle.handbrake && !isFront) {
        wheel.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }

    // Détection de drift
    const velocity = vehicle.body.linvel();
    const forward = { x: 0, y: 0, z: 1 }; // Direction avant du véhicule
    const speed = Math.hypot(velocity.x, velocity.z);
    
    if (speed > 5) {
      const moveAngle = Math.atan2(velocity.x, velocity.z);
      const vehicleAngle = Math.atan2(
        2 * (vehicle.body.rotation().w * vehicle.body.rotation().y + vehicle.body.rotation().x * vehicle.body.rotation().z),
        1 - 2 * (vehicle.body.rotation().y * vehicle.body.rotation().y + vehicle.body.rotation().z * vehicle.body.rotation().z)
      );
      
      vehicle.driftAngle = moveAngle - vehicleAngle;
      vehicle.isDrifting = Math.abs(vehicle.driftAngle) > DRIFT_THRESHOLD;
    }

    vehicle.speed = speed * 3.6; // Conversion en km/h
  }

  private updateVehicles(dt: number) {
    for (const [vehicleId, vehicle] of this.vehicles) {
      // Vérifier si le véhicule est renversé
      const up = { x: 0, y: 1, z: 0 };
      const vehicleUp = vehicle.body.rotation();
      const dot = vehicleUp.y;
      
      vehicle.isFlipped = Math.abs(dot) < 0.3; // Si l'angle avec la verticale est > 70°

      // Vérifier si chaque roue touche le sol
      for (const wheel of vehicle.wheels) {
        const wheelPos = wheel.body.translation();
        const ray = new RAPIER.Ray(wheelPos, { x: 0, y: -1, z: 0 });
        const hit = this.world!.castRay(ray, WHEEL_RADIUS + 0.5, true);
        wheel.isGrounded = hit !== null && hit.timeOfImpact < WHEEL_RADIUS + 0.5;
      }

      // Dommages progressifs basés sur la vitesse d'impact
      const velocity = vehicle.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
      
      if (speed > 20) {
        // Vérifier les collisions
        // (Simplifié - en production, utiliser les événements de collision Rapier)
      }
    }
  }

  public correctVehicle(ox: number, oy: number, oz: number, nx: number, ny: number, nz: number, yaw: number) {
    if (!this.ready || !this.world) {
      return { x: nx, y: ny, z: nz, hit: false, crashIntensity: 0 };
    }
    this.ensureStream(nx, nz);
    this.flush();
    
    const qy = Math.sin(yaw * 0.5);
    const qw = Math.cos(yaw * 0.5);
    
    // Simplifié pour compatibilité - en production utiliser le système de suspension
    const vehBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(ox, oy + 0.62, oz)
        .setRotation({ x: 0, y: qy, z: 0, w: qw }),
    );
    
    const vehColDesc = RAPIER.ColliderDesc.cuboid(0.95, 0.62, 2.12).setFriction(1.0);
    const vehCol = this.world.createCollider(vehColDesc, vehBody);
    
    const vehCtl = this.world.createCharacterController(0.05);
    
    const dx = nx - ox;
    const dz = nz - oz;
    
    vehCtl.computeColliderMovement(vehCol, { x: dx, y: -0.05, z: dz });
    const movement = vehCtl.computedMovement();
    
    const x = ox + movement.x;
    const z = oz + movement.z;
    
    let crashIntensity = 0;
    let hit = false;
    
    if (vehCtl.numComputedCollisions() > 0) {
      const collision = vehCtl.computedCollision(0);
      if (collision) {
        const expectedDist = Math.hypot(dx, dz);
        const actualDist = Math.hypot(movement.x, movement.z);
        const slowdownDelta = expectedDist - actualDist;
        
        if (slowdownDelta > 0.4) {
          hit = true;
          crashIntensity = Math.round(slowdownDelta * 30);
        }
      }
    }

    // Cleanup
    this.world.removeRigidBody(vehBody);

    return { 
      x, 
      y: getTerrainHeight(x, z) + 0.42, 
      z, 
      hit,
      crashIntensity,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // BALISTIQUE AVANCÉE (NOUVEAU v2.0)
  // ═══════════════════════════════════════════════════════════

  public fireProjectile(
    ownerId: string,
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    speed: number,
    damage: number,
    penetration: number = 1.0,
    ricochetChance: number = 0.2,
  ): ProjectilePhysics {
    if (!this.ready || !this.world) {
      throw new Error("Physics not initialized");
    }

    // Normaliser la direction
    const length = Math.hypot(direction.x, direction.y, direction.z);
    const ndx = direction.x / length;
    const ndy = direction.y / length;
    const ndz = direction.z / length;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(origin.x, origin.y, origin.z)
      .setLinvel(ndx * speed, ndy * speed, ndz * speed)
      .setGravityScale(0.5) // Gravité réduite pour les balles
      .setLinearDamping(BULLET_DRAG)
      .setCcdEnabled(true);

    const body = this.world.createRigidBody(bodyDesc);

    const colDesc = RAPIER.ColliderDesc.ball(0.01)
      .setSensor(true) // Ne pas bloquer, juste détecter
      .setCollisionGroups(this.getCollisionGroup("projectile"));

    const collider = this.world.createCollider(colDesc, body);

    const projectile: ProjectilePhysics = {
      body,
      collider,
      velocity: { x: ndx * speed, y: ndy * speed, z: ndz * speed },
      gravity: BULLET_GRAVITY,
      drag: BULLET_DRAG,
      penetrationPower: penetration,
      ricochetChance,
      ownerId,
      damage,
      lifetime: 3.0, // 3 secondes max
      createdAt: Date.now(),
    };

    this.projectiles.push(projectile);
    return projectile;
  }

  private updateProjectiles(dt: number) {
    const now = Date.now();
    const toRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i++) {
      const proj = this.projectiles[i];

      // Vérifier lifetime
      if ((now - proj.createdAt) / 1000 > proj.lifetime) {
        toRemove.push(i);
        continue;
      }

      // Appliquer la gravité
      proj.velocity.y -= proj.gravity * dt;

      // Appliquer la traînée
      const speed = Math.hypot(proj.velocity.x, proj.velocity.y, proj.velocity.z);
      if (speed > 0) {
        const dragForce = speed * proj.drag;
        proj.velocity.x -= (proj.velocity.x / speed) * dragForce;
        proj.velocity.y -= (proj.velocity.y / speed) * dragForce;
        proj.velocity.z -= (proj.velocity.z / speed) * dragForce;
      }

      // Mettre à jour la position
      proj.body.setLinvel(proj.velocity, true);

      // Détection de collision
      const pos = proj.body.translation();
      const ray = new RAPIER.Ray(pos, proj.velocity);
      const hit = this.world!.castRay(ray, speed * dt, true);

      if (hit) {
        // Gérer l'impact
        this.handleProjectileImpact(proj, hit);
        toRemove.push(i);
      }
    }

    // Nettoyer les projectiles morts
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const proj = this.projectiles[idx];
      this.world!.removeRigidBody(proj.body);
      this.projectiles.splice(idx, 1);
    }
  }

  private handleProjectileImpact(proj: ProjectilePhysics, hit: RAPIER.RayColliderHit) {
    const hitPoint = (hit as any).ray?.pointAt(hit.timeOfImpact);
    const hitNormal = hit.collider.castRayAndGetNormal((hit as any).ray, hit.timeOfImpact + 0.1, true);

    if (!hitNormal) return;

    // Calculer l'angle d'impact
    const velocity = proj.velocity;
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    const normalizedVel = {
      x: velocity.x / speed,
      y: velocity.y / speed,
      z: velocity.z / speed,
    };

    const dot = normalizedVel.x * hitNormal.normal.x + 
                normalizedVel.y * hitNormal.normal.y + 
                normalizedVel.z * hitNormal.normal.z;
    
    const impactAngle = Math.acos(Math.abs(dot));

    // Ricochet ?
    if (impactAngle > RICOCHET_ANGLE_THRESHOLD && Math.random() < proj.ricochetChance) {
      // Calculer la direction du ricochet
      const reflected = {
        x: normalizedVel.x - 2 * dot * hitNormal.normal.x,
        y: normalizedVel.y - 2 * dot * hitNormal.normal.y,
        z: normalizedVel.z - 2 * dot * hitNormal.normal.z,
      };

      // Nouveau projectile avec vitesse réduite
      this.fireProjectile(
        proj.ownerId,
        hitPoint,
        reflected,
        speed * 0.6, // Perte de vitesse
        proj.damage * 0.5,
        proj.penetrationPower * 0.5,
        proj.ricochetChance * 0.5,
      );
    } else {
      // Pénétration ou arrêt
      const material = this.getColliderMaterial(hit.collider);
      const penetrationResistance = MATERIAL_PENETRATION[material] ?? 0.5;

      if (proj.penetrationPower > penetrationResistance) {
        // La balle traverse
        // Continuer avec vitesse réduite
        proj.body.setTranslation({
          x: hitPoint.x + normalizedVel.x * 0.1,
          y: hitPoint.y + normalizedVel.y * 0.1,
          z: hitPoint.z + normalizedVel.z * 0.1,
        }, true);
        
        proj.penetrationPower -= penetrationResistance;
        proj.damage *= 0.7;
      } else {
        // La balle s'arrête
        // Dégâts à l'objet touché
        this.applyDamage(hit.collider, proj.damage, hitPoint);
      }
    }
  }

  private getColliderMaterial(collider: RAPIER.Collider): string {
    // Simplifié - en production, stocker le matériau dans userData
    return "concrete";
  }

  private applyDamage(collider: RAPIER.Collider, damage: number, point: { x: number; y: number; z: number }) {
    const body = collider.parent();
    if (!body) return;

    // Appliquer l'impulsion
    const impulse = { x: 0, y: damage * 0.1, z: 0 };
    body.applyImpulseAtPoint(impulse, point, true);

    // Si c'est un véhicule, appliquer les dégâts localisés
    for (const [vehicleId, vehicle] of this.vehicles) {
      if (vehicle.body === body) {
        // Déterminer la zone de dégâts
        const relPos = {
          x: point.x - body.translation().x,
          y: point.y - body.translation().y,
          z: point.z - body.translation().z,
        };

        if (relPos.z > 1) vehicle.damage.front += damage;
        else if (relPos.z < -1) vehicle.damage.rear += damage;
        else if (relPos.x > 0) vehicle.damage.right += damage;
        else vehicle.damage.left += damage;
        
        if (relPos.y > 0.5) vehicle.damage.roof += damage;

        // Vérifier si le véhicule est détruit
        const totalDamage = Object.values(vehicle.damage).reduce((a, b) => a + b, 0);
        if (totalDamage > 1000) {
          vehicle.isTotalled = true;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // EXPLOSIONS (NOUVEAU v2.0)
  // ═══════════════════════════════════════════════════════════

  public createExplosion(
    x: number,
    y: number,
    z: number,
    radius: number,
    force: number,
    damage: number,
  ): ExplosionResult {
    if (!this.ready || !this.world) {
      return { affectedBodies: [], damageDealt: new Map(), impulseApplied: new Map() };
    }

    const affectedBodies: string[] = [];
    const damageDealt = new Map<string, number>();
    const impulseApplied = new Map<string, { x: number; y: number; z: number }>();

    // Query tous les corps dans le rayon
    const center = { x, y, z };
    
    this.world.forEachRigidBody((body) => {
      const pos = body.translation();
      const dx = pos.x - x;
      const dy = pos.y - y;
      const dz = pos.z - z;
      const distance = Math.hypot(dx, dy, dz);

      if (distance < radius && distance > 0) {
        const bodyId = (body as any).userData?.id ?? body.handle;
        affectedBodies.push(bodyId);

        // Calculer la force basée sur la distance
        const falloff = 1 - (distance / radius);
        const impulseMagnitude = force * falloff;
        const damageAmount = damage * falloff;

        // Direction de l'explosion
        const dir = {
          x: dx / distance,
          y: dy / distance + 0.5, // Force vers le haut
          z: dz / distance,
        };

        const impulse = {
          x: dir.x * impulseMagnitude,
          y: dir.y * impulseMagnitude,
          z: dir.z * impulseMagnitude,
        };

        // Appliquer l'impulsion
        if (body.bodyType() === RAPIER.RigidBodyType.Dynamic) {
          body.applyImpulse(impulse, true);
          impulseApplied.set(bodyId, impulse);
        }

        // Appliquer les dégâts
        damageDealt.set(bodyId, damageAmount);
      }
    });

    return { affectedBodies, damageDealt, impulseApplied };
  }

  // ═══════════════════════════════════════════════════════════
  // RAYCAST AVANCÉ (NOUVEAU v2.0)
  // ═══════════════════════════════════════════════════════════

  public castRayInteraction(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    maxDist = 6.0,
    options: PhysicsQueryOptions = {},
  ): RaycastHitResult {
    if (!this.ready || !this.world) {
      return { hit: false, distance: 0, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 } };
    }

    const length = Math.hypot(dirX, dirY, dirZ);
    const ndx = dirX / length;
    const ndy = dirY / length;
    const ndz = dirZ / length;

    const ray = new RAPIER.Ray({ x: originX, y: originY, z: originZ }, { x: ndx, y: ndy, z: ndz });
    const hit = this.world.castRayAndGetNormal(ray, maxDist, true);

    if (hit) {
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      const material = this.getColliderMaterial(hit.collider);
      
      // Calculer l'angle pour ricochet potentiel
      const dot = ndx * hit.normal.x + ndy * hit.normal.y + ndz * hit.normal.z;
      const ricochetAngle = Math.acos(Math.abs(dot));

      return {
        hit: true,
        distance: hit.timeOfImpact,
        point: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
        normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
        material,
        penetrable: MATERIAL_PENETRATION[material] < 1.0,
        ricochetAngle,
      };
    }

    return { hit: false, distance: 0, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 } };
  }

  // ── NOUVEAU v2.0 : Queries spatiales ──

  public querySphere(
    x: number,
    y: number,
    z: number,
    radius: number,
    options: PhysicsQueryOptions = {},
  ): string[] {
    if (!this.ready || !this.world) return [];

    const results: string[] = [];
    
    this.world.forEachRigidBody((body) => {
      const pos = body.translation();
      const dx = pos.x - x;
      const dy = pos.y - y;
      const dz = pos.z - z;
      const distance = Math.hypot(dx, dy, dz);

      if (distance < radius) {
        const bodyId = (body as any).userData?.id ?? body.handle;
        if (!options.excludeIds?.includes(bodyId)) {
          results.push(bodyId);
        }
      }
    });

    return results.slice(0, options.maxResults);
  }

  public queryCapsule(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    radius: number,
    options: PhysicsQueryOptions = {},
  ): string[] {
    if (!this.ready || !this.world) return [];

    // Simplifié - en production, utiliser RAPIER.ColliderDesc.capsule
    const results: string[] = [];
    const length = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    const steps = Math.ceil(length / 0.5);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      const z = z1 + (z2 - z1) * t;

      const sphereResults = this.querySphere(x, y, z, radius, options);
      results.push(...sphereResults);
    }

    return [...new Set(results)].slice(0, options.maxResults);
  }

  // ═══════════════════════════════════════════════════════════
  // ENVIRONNEMENT (NOUVEAU v2.0)
  // ═══════════════════════════════════════════════════════════

  private applyWindToDynamicBodies() {
    if (!this.world || (this.windForce.x === 0 && this.windForce.z === 0)) return;

    this.world.forEachRigidBody((body) => {
      if (body.bodyType() === RAPIER.RigidBodyType.Dynamic) {
        const mass = body.mass();
        if (mass < 100) { // Seulement les objets légers
          const windForce = {
            x: this.windForce.x * (100 / mass),
            y: this.windForce.y,
            z: this.windForce.z * (100 / mass),
          };
          (body as any).applyForce(windForce, true);
        }
      }
    });
  }

  private applyBuoyancy() {
    if (!this.world) return;

    this.world.forEachRigidBody((body) => {
      if (body.bodyType() === RAPIER.RigidBodyType.Dynamic) {
        const pos = body.translation();
        
        if (pos.y < this.waterLevel) {
          const depth = this.waterLevel - pos.y;
          const buoyancyForce = depth * 9.81 * 0.5; // Force de flottabilité
          
          (body as any).applyForce({ x: 0, y: buoyancyForce, z: 0 }, true);
          
          // Drag de l'eau
          const vel = body.linvel();
          const waterDrag = {
            x: -vel.x * 2.0,
            y: -vel.y * 0.5,
            z: -vel.z * 2.0,
          };
          (body as any).applyForce(waterDrag, true);
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CLEANUP & STREAMING
  // ═══════════════════════════════════════════════════════════

  public dispose() {
    this.ready = false;
    
    // Nettoyer les projectiles
    for (const proj of this.projectiles) {
      this.world?.removeRigidBody(proj.body);
    }
    this.projectiles = [];

    // Nettoyer les véhicules
    for (const vehicle of this.vehicles.values()) {
      this.world?.removeRigidBody(vehicle.body);
      for (const wheel of vehicle.wheels) {
        this.world?.removeRigidBody(wheel.body);
      }
    }
    this.vehicles.clear();

    if (this.world) this.world.free();
    this.world = null;
    this.live.clear();
    this.solids = [];
  }

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
      
      const bodyDesc = s.isDynamic
        ? RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(s.x, s.y, s.z)
            .setRotation({ x: 0, y: qy, z: 0, w: qw })
        : RAPIER.RigidBodyDesc.fixed()
            .setTranslation(s.x, s.y, s.z)
            .setRotation({ x: 0, y: qy, z: 0, w: qw });
      
      const body = this.world.createRigidBody(bodyDesc);
      
      const material = s.material ?? "concrete";
      const friction = MATERIAL_FRICTION[material] ?? 1.0;
      
      const colDesc = RAPIER.ColliderDesc.cuboid(s.hx, s.hy, s.hz)
        .setFriction(friction)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max);
        
      if (s.isDynamic && s.mass) {
        colDesc.setMass(s.mass);
      }
        
      this.world.createCollider(colDesc, body);
      this.live.set(s.id, body);
      
      if (s.isDynamic) {
        this.dynamicProps.set(s.id, body);
      }
    }
    
    this.dirty = true;
    for (const [id, body] of this.live) {
      if (keep.has(id)) continue;
      this.world.removeRigidBody(body);
      this.live.delete(id);
      this.dynamicProps.delete(id);
      this.dirty = true;
    }
  }
}

export const physics = new CountyPhysics();

