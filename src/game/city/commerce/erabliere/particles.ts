/**
 * 🍁 PARTICULES — Vapeur + Feuilles d'automne
 */
import * as THREE from "three";
import { SUGAR_CONFIG } from "./config";

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  size: number;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;

  constructor(count: number, color: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: SUGAR_CONFIG.PARTICLES.STEAM_LIFETIME,
        size: THREE.MathUtils.randFloat(
          SUGAR_CONFIG.PARTICLES.STEAM_SIZE_MIN,
          SUGAR_CONFIG.PARTICLES.STEAM_SIZE_MAX,
        ),
        active: false,
      });
    }

    this.positions = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.opacities = new Float32Array(count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute("opacity", new THREE.BufferAttribute(this.opacities, 1));

    this.material = new THREE.PointsMaterial({
      color, size: 0.5, transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  getMesh(): THREE.Points { return this.points; }

  emit(origin: THREE.Vector3, count: number): void {
    let emitted = 0;
    for (const p of this.particles) {
      if (p.active || emitted >= count) continue;
      p.position.copy(origin);
      p.position.x += THREE.MathUtils.randFloatSpread(SUGAR_CONFIG.PARTICLES.STEAM_SPREAD);
      p.position.z += THREE.MathUtils.randFloatSpread(SUGAR_CONFIG.PARTICLES.STEAM_SPREAD);
      p.velocity.set(
        THREE.MathUtils.randFloatSpread(0.02),
        THREE.MathUtils.randFloat(0.3, 0.6) * SUGAR_CONFIG.PARTICLES.STEAM_RISE_SPEED,
        THREE.MathUtils.randFloatSpread(0.02),
      );
      p.lifetime = 0;
      p.active = true;
      emitted++;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.lifetime += dt;
      if (p.lifetime >= p.maxLifetime) { p.active = false; continue; }
      p.position.addScaledVector(p.velocity, dt);
      p.position.x += Math.sin(p.lifetime * 2) * 0.01;
      p.position.z += Math.cos(p.lifetime * 1.5) * 0.01;
      p.size *= 0.98;
      const lifeRatio = 1 - (p.lifetime / p.maxLifetime);

      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      this.sizes[i] = p.size;
      this.opacities[i] = lifeRatio * 0.6;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.opacity.needsUpdate = true;
  }

  setActive(active: boolean): void { this.points.visible = active; }
  dispose(): void { this.geometry.dispose(); this.material.dispose(); }
}

export class LeafParticleSystem {
  private leaves: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;

  constructor(treePosition: THREE.Vector3, treeHeight: number) {
    const count = SUGAR_CONFIG.LEAVES.COUNT_PER_TREE;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = THREE.MathUtils.randFloat(0.5, 2.0);
      this.leaves.push({
        position: new THREE.Vector3(
          treePosition.x + Math.cos(angle) * radius,
          treePosition.y + THREE.MathUtils.randFloat(treeHeight * 0.3, treeHeight),
          treePosition.z + Math.sin(angle) * radius,
        ),
        velocity: new THREE.Vector3(),
        lifetime: THREE.MathUtils.randFloat(0, SUGAR_CONFIG.LEAVES.LIFETIME),
        maxLifetime: SUGAR_CONFIG.LEAVES.LIFETIME,
        size: THREE.MathUtils.randFloat(0.08, 0.15),
        active: true,
      });
    }

    this.positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const autumnColors = [
      new THREE.Color(0xc45a28),
      new THREE.Color(0xd47830),
      new THREE.Color(0xb84820),
      new THREE.Color(0x8a6a30),
    ];
    for (let i = 0; i < count; i++) {
      const color = autumnColors[i % autumnColors.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.12, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
  }

  getMesh(): THREE.Points { return this.points; }

  update(dt: number, windDirection: number): void {
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      leaf.lifetime += dt;
      leaf.velocity.y = -SUGAR_CONFIG.LEAVES.FALL_SPEED;
      leaf.position.x += Math.sin(leaf.lifetime * SUGAR_CONFIG.LEAVES.SWAY_FREQUENCY + i)
        * SUGAR_CONFIG.LEAVES.SWAY_AMPLITUDE * dt;
      leaf.position.z += Math.cos(leaf.lifetime * SUGAR_CONFIG.LEAVES.SWAY_FREQUENCY + i * 0.5)
        * SUGAR_CONFIG.LEAVES.SWAY_AMPLITUDE * dt;
      leaf.position.x += Math.sin(windDirection + leaf.lifetime) * 0.02 * dt;
      leaf.position.addScaledVector(leaf.velocity, dt);
      if (leaf.position.y < 0) {
        leaf.position.y = 0;
        leaf.velocity.set(0, 0, 0);
      }
      this.positions[i * 3] = leaf.position.x;
      this.positions[i * 3 + 1] = leaf.position.y;
      this.positions[i * 3 + 2] = leaf.position.z;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void { this.geometry.dispose(); this.material.dispose(); }
}