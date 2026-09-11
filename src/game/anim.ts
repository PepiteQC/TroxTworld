import * as THREE from "three";

export type AnimType =
  | "rotate"
  | "float"
  | "pulse"
  | "orbit"
  | "shake"
  | "bounce"
  | "wave"
  | "spiral"
  | "pendulum"
  | "path";

export interface AnimJob {
  target: THREE.Object3D;
  type: AnimType;
  speed: number;
  amp: number;
  axis: "x" | "y" | "z" | "all";
  delay: number;
  paused: boolean;
  home: THREE.Vector3;
  path?: THREE.Vector3[];
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

export class AnimEngine {
  private jobs: AnimJob[] = [];

  add(target: THREE.Object3D, type: AnimType, speed = 1, amp = 0.25): AnimJob {
    this.remove(target);
    const job: AnimJob = {
      target,
      type,
      speed,
      amp,
      axis: "y",
      delay: 0,
      paused: false,
      home: target.position.clone(),
    };
    this.jobs.push(job);
    return job;
  }

  remove(target: THREE.Object3D) {
    this.jobs = this.jobs.filter((j) => j.target !== target);
  }

  clear() {
    this.jobs = [];
  }

  tick(dt: number, elapsed: number) {
    for (const job of this.jobs) {
      if (job.paused || !job.target.parent) continue;
      const t = elapsed * job.speed + job.delay;
      const o = job.target;
      const h = job.home;
      switch (job.type) {
        case "rotate":
          if (job.axis === "x" || job.axis === "all") o.rotation.x += dt * job.speed;
          if (job.axis === "y" || job.axis === "all") o.rotation.y += dt * job.speed;
          if (job.axis === "z" || job.axis === "all") o.rotation.z += dt * job.speed * 0.6;
          break;
        case "float":
          o.position.y = h.y + Math.sin(t * 2) * job.amp;
          break;
        case "pulse": {
          const s = 1 + Math.sin(t * 3) * job.amp;
          o.scale.setScalar(s);
          break;
        }
        case "orbit":
          o.position.x = h.x + Math.cos(t) * (job.amp * 8);
          o.position.z = h.z + Math.sin(t) * (job.amp * 8);
          break;
        case "shake":
          o.position.set(
            h.x + (Math.random() - 0.5) * job.amp,
            h.y + (Math.random() - 0.5) * job.amp,
            h.z + (Math.random() - 0.5) * job.amp,
          );
          break;
        case "bounce":
          o.position.y = h.y + Math.abs(Math.sin(t * Math.PI)) * job.amp * 4;
          break;
        case "wave":
          o.rotation.z = Math.sin(t * 2) * job.amp;
          o.position.y = h.y + Math.cos(t * 1.4) * job.amp;
          break;
        case "spiral": {
          const k = 1 - ((t * 0.08) % 1);
          o.position.x = h.x + Math.cos(t) * job.amp * 8 * k;
          o.position.z = h.z + Math.sin(t) * job.amp * 8 * k;
          o.position.y = h.y + ((t * 0.4) % 3);
          break;
        }
        case "pendulum":
          o.rotation.z = Math.sin(t * 2) * job.amp * Math.pow(0.998, elapsed);
          break;
        case "path": {
          const path = job.path;
          if (!path || path.length < 2) break;
          const u = (t * 0.15) % 1;
          const steps = path.length - 1;
          const f = u * steps;
          const i = Math.min(steps - 1, f | 0);
          tmpA.copy(path[i]!);
          tmpB.copy(path[i + 1]!);
          o.position.lerpVectors(tmpA, tmpB, f - i);
          break;
        }
      }
    }
  }

  getStats() {
    return { total: this.jobs.length, types: [...new Set(this.jobs.map((j) => j.type))] };
  }
}

export const ANIM_TYPES: AnimType[] = [
  "rotate",
  "float",
  "pulse",
  "orbit",
  "shake",
  "bounce",
  "wave",
  "spiral",
  "pendulum",
  "path",
];

export const propAnim = new AnimEngine();
