// src/effects/VisualEffects.ts
import * as THREE from "three";
import { TextureGenerator } from "../utils/TextureGenerator";

export type ParticleType = "smoke" | "spark" | "blood" | "tracer";

interface Particle {
  mesh: THREE.Mesh | THREE.Line;
  type: ParticleType;
  lifetime: number;
  maxLifetime: number;
}

export class VisualEffects {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private textures: Record<ParticleType, THREE.Texture>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textures = this.loadDefaultTextures();
  }

  private loadDefaultTextures(): Record<ParticleType, THREE.Texture> {
    return {
      smoke: TextureGenerator.generateSmokeTexture(128),
      spark: TextureGenerator.generateSparkTexture(64, 10),
      blood: TextureGenerator.generateBloodTexture(128),
      tracer: TextureGenerator.generateSparkTexture(32, 1),
    };
  }

  public createSmoke(
    position: THREE.Vector3,
    direction: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    count: number = 5
  ): void {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.PlaneGeometry(0.2, 0.2);
      const material = new THREE.MeshBasicMaterial({
        map: this.textures.smoke,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.7,
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ));
      particle.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      particle.userData = {
        velocity: direction.clone().normalize().multiplyScalar(0.02 + Math.random() * 0.03),
        maxLifetime: 1.0 + Math.random() * 0.5,
        initialScale: 0.1 + Math.random() * 0.1,
      };
      this.scene.add(particle);
      this.particles.push({
        mesh: particle,
        type: "smoke",
        lifetime: 0,
        maxLifetime: particle.userData.maxLifetime,
      });
    }
  }

  public createSparks(
    position: THREE.Vector3,
    direction: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    count: number = 5
  ): void {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.PlaneGeometry(0.05, 0.05);
      const material = new THREE.MeshBasicMaterial({
        map: this.textures.spark,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 1.0,
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      particle.userData = {
        velocity: direction.clone().normalize().multiplyScalar(0.1 + Math.random() * 0.2),
        maxLifetime: 0.3 + Math.random() * 0.2,
        initialScale: 0.05 + Math.random() * 0.05,
      };
      this.scene.add(particle);
      this.particles.push({
        mesh: particle,
        type: "spark",
        lifetime: 0,
        maxLifetime: particle.userData.maxLifetime,
      });
    }
  }

  public createBlood(
    position: THREE.Vector3,
    direction: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    count: number = 3
  ): void {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.PlaneGeometry(0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({
        map: this.textures.blood,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.9,
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      particle.userData = {
        velocity: direction.clone().normalize().multiplyScalar(0.05 + Math.random() * 0.1),
        maxLifetime: 1.5 + Math.random(),
        initialScale: 0.1 + Math.random() * 0.1,
      };
      this.scene.add(particle);
      this.particles.push({
        mesh: particle,
        type: "blood",
        lifetime: 0,
        maxLifetime: particle.userData.maxLifetime,
      });
    }
  }

  public createBulletTracer(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: number = 0xffaa00
  ): void {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [
      start.x, start.y, start.z,
      end.x, end.y, end.z,
    ];
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions), 3)
    );
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
    const tracer = new THREE.Line(geometry, material);
    this.scene.add(tracer);
    this.particles.push({
      mesh: tracer,
      type: "tracer",
      lifetime: 0,
      maxLifetime: 0.1,
    });
  }

  public createImpactMark(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    type: "bullet" | "blood" = "bullet"
  ): void {
    const texture = type === "bullet" ? this.textures.spark : this.textures.blood;
    const geometry = new THREE.PlaneGeometry(0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0.9,
    });
    const mark = new THREE.Mesh(geometry, material);
    mark.position.copy(position).add(normal.clone().multiplyScalar(0.01));
    mark.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );
    mark.userData = {
      maxLifetime: 5.0,
    };
    this.scene.add(mark);
    this.particles.push({
      mesh: mark,
      type: "tracer",
      lifetime: 0,
      maxLifetime: 5.0,
    });
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.lifetime += dt;

      if (particle.lifetime >= particle.maxLifetime) {
        if (particle.mesh.parent) {
          particle.mesh.parent.remove(particle.mesh);
        }
        if (particle.mesh instanceof THREE.Mesh) {
          particle.mesh.geometry.dispose();
          (particle.mesh.material as THREE.Material).dispose();
        } else if (particle.mesh instanceof THREE.Line) {
          particle.mesh.geometry.dispose();
          (particle.mesh.material as THREE.Material).dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      if (particle.mesh instanceof THREE.Mesh && particle.mesh.userData.velocity) {
        particle.mesh.position.add(
          particle.mesh.userData.velocity.clone().multiplyScalar(dt * 60)
        );
        const progress = particle.lifetime / particle.maxLifetime;
        particle.mesh.scale.setScalar(particle.mesh.userData.initialScale * (1 - progress));
        if (particle.mesh.material.transparent) {
          particle.mesh.material.opacity = 1 - progress;
        }
      }
    }
  }

  public dispose(): void {
    for (const particle of this.particles) {
      if (particle.mesh.parent) {
        particle.mesh.parent.remove(particle.mesh);
      }
      if (particle.mesh instanceof THREE.Mesh) {
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
      }
    }
    this.particles = [];
  }
}