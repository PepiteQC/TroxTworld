import * as THREE from "three";

export type AdminEffectId =
  | "lightning" | "meteor" | "portal" | "blessing" | "shadowrealm"
  | "matrixrain" | "icecapsule" | "explosion" | "godrays" | "banhammer"
  | "confetti" | "impact" | "chromaticpulse" | "slowmotion" | "glassshatter"
  | "apocalypse" | "divinejudgment" | "realitytear" | "phoenixrebirth" | "starfall";

export interface AdminEffectMeta {
  id: AdminEffectId;
  name: string;
  icon: string;
  color: string;
  duration: number;
}

export const ADMIN_EFFECTS: Record<AdminEffectId, AdminEffectMeta> = {
  lightning: { id: "lightning", name: "Foudre céleste", icon: "⚡", color: "#7fd4ff", duration: 1400 },
  meteor: { id: "meteor", name: "Pluie de météores", icon: "☄️", color: "#ff7a33", duration: 2600 },
  portal: { id: "portal", name: "Faille dimensionnelle", icon: "🌀", color: "#b06fff", duration: 2200 },
  blessing: { id: "blessing", name: "Pluie bénie", icon: "✨", color: "#ffe066", duration: 2600 },
  shadowrealm: { id: "shadowrealm", name: "Royaume des ombres", icon: "🌑", color: "#5a1e8a", duration: 2600 },
  matrixrain: { id: "matrixrain", name: "Pluie de code", icon: "🟩", color: "#22ff66", duration: 2400 },
  icecapsule: { id: "icecapsule", name: "Capsule de givre", icon: "🧊", color: "#8be8ff", duration: 2200 },
  explosion: { id: "explosion", name: "Détonation", icon: "💥", color: "#ff5522", duration: 1600 },
  godrays: { id: "godrays", name: "Rayons divins", icon: "🌟", color: "#fff3c4", duration: 2800 },
  banhammer: { id: "banhammer", name: "Marteau du bannissement", icon: "🔨", color: "#ff3333", duration: 1500 },
  confetti: { id: "confetti", name: "Confettis", icon: "🎉", color: "#ff66cc", duration: 2400 },
  impact: { id: "impact", name: "Choc caméra", icon: "📳", color: "#ffffff", duration: 550 },
  chromaticpulse: { id: "chromaticpulse", name: "Pulsation chromatique", icon: "🌈", color: "#ff33aa", duration: 700 },
  slowmotion: { id: "slowmotion", name: "Ralenti", icon: "🎬", color: "#3aa0ff", duration: 2200 },
  glassshatter: { id: "glassshatter", name: "Verre brisé", icon: "🔻", color: "#cfe8ff", duration: 1200 },
  apocalypse: { id: "apocalypse", name: "Apocalypse", icon: "🔥", color: "#ff2200", duration: 3600 },
  divinejudgment: { id: "divinejudgment", name: "Jugement divin", icon: "⚖️", color: "#fff6c9", duration: 3000 },
  realitytear: { id: "realitytear", name: "Déchirure", icon: "🕳️", color: "#b06fff", duration: 2800 },
  phoenixrebirth: { id: "phoenixrebirth", name: "Phénix", icon: "🐦‍🔥", color: "#ff9933", duration: 3200 },
  starfall: { id: "starfall", name: "Chute d'étoiles", icon: "🌠", color: "#9fd8ff", duration: 3200 },
};

export const ADMIN_EFFECT_IDS = Object.keys(ADMIN_EFFECTS) as AdminEffectId[];

interface TempEntry {
  mesh: THREE.Object3D | null;
  ttl: number;
  age: number;
  tick?: (mesh: THREE.Object3D | null, dt: number, t: number, e: TempEntry) => void;
  onEnd?: () => void;
  dom?: HTMLElement;
  hit?: boolean;
}

function glow(color: THREE.ColorRepresentation, intensity = 5) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.25,
    transparent: true,
    opacity: 1,
  });
}

export class AdminFx {
  private group = new THREE.Group();
  private entries: TempEntry[] = [];
  private overlay: HTMLDivElement | null = null;
  private chroma: SVGFilterElement | null = null;
  private ball = new THREE.SphereGeometry(1, 8, 6);
  private t = 0;
  private active: AdminEffectId | null = null;
  private until = 0;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer,
    private target: () => THREE.Vector3,
  ) {
    this.group.name = "admin-fx";
    this.scene.add(this.group);
  }

  play(id: string): boolean {
    if (!(id in ADMIN_EFFECTS)) return false;
    const meta = ADMIN_EFFECTS[id as AdminEffectId];
    this.active = meta.id;
    this.until = this.t + meta.duration / 1000;
    const fn: Record<AdminEffectId, (m: AdminEffectMeta) => void> = {
      lightning: (m) => this.lightning(m),
      meteor: (m) => this.meteor(m),
      portal: (m) => this.portal(m),
      blessing: (m) => this.blessing(m),
      shadowrealm: (m) => this.shadow(m),
      matrixrain: (m) => this.matrix(m),
      icecapsule: (m) => this.ice(m),
      explosion: (m) => this.boom(m),
      godrays: (m) => this.rays(m),
      banhammer: (m) => this.hammer(m),
      confetti: (m) => this.confetti(m),
      impact: (m) => this.domImpact(m),
      chromaticpulse: (m) => this.domChroma(m),
      slowmotion: (m) => this.domSlow(m),
      glassshatter: (m) => this.domGlass(m),
      apocalypse: (m) => this.apocalypse(m),
      divinejudgment: (m) => this.judgment(m),
      realitytear: (m) => this.tear(m),
      phoenixrebirth: (m) => this.phoenix(m),
      starfall: (m) => this.stars(m),
    };
    fn[meta.id](meta);
    return true;
  }

  getActive() {
    return this.active;
  }

  tick(dt: number) {
    this.t += dt;
    if (this.active && this.t >= this.until) this.active = null;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      e.age += dt;
      e.tick?.(e.mesh, dt, this.t, e);
      if (e.age >= e.ttl) {
        this.end(e);
        this.entries.splice(i, 1);
      }
    }
  }

  clear() {
    this.entries.forEach((e) => this.end(e));
    this.entries = [];
    this.active = null;
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    this.ball.dispose();
    this.overlay?.remove();
    this.overlay = null;
  }

  private add(mesh: THREE.Object3D | null, ttl: number, tick?: TempEntry["tick"], onEnd?: () => void, dom?: HTMLElement) {
    if (mesh) this.group.add(mesh);
    this.entries.push({ mesh, ttl, age: 0, tick, onEnd, dom });
  }

  private end(e: TempEntry) {
    if (e.mesh) {
      this.group.remove(e.mesh);
      e.mesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry && m.geometry !== this.ball) m.geometry.dispose();
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mm) => mm.dispose());
        }
      });
    }
    e.dom?.remove();
    e.onEnd?.();
  }

  private spark(x: number, z: number, color: string) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.1, 20), glow(color, 5));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.04, z);
    this.add(ring, 0.45, (mesh, _d, _t, e) => {
      mesh!.scale.setScalar(1 + (e.age / e.ttl) * 7);
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
    });
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = new THREE.Mesh(this.ball, glow(color, 6));
      s.scale.setScalar(0.03);
      s.position.set(x, 0.08, z);
      const vy = 1.2 + Math.random();
      this.add(s, 0.45, (mesh, dt) => {
        mesh!.position.y += vy * dt;
        mesh!.position.x += Math.cos(a) * dt;
        mesh!.position.z += Math.sin(a) * dt;
      });
    }
  }

  private lightning(meta: AdminEffectMeta) {
    const p = this.target();
    const flash = new THREE.PointLight(meta.color, 10, 16);
    flash.position.set(p.x, p.y + 3, p.z);
    this.add(flash, 0.45, (mesh, _d, _t, e) => {
      (mesh as THREE.PointLight).intensity = 10 * Math.max(0, 1 - e.age / e.ttl);
    });
    for (let i = 0; i < 3; i++) {
      const pts: THREE.Vector3[] = [];
      const ox = p.x + (Math.random() - 0.5) * 1.1;
      const oz = p.z + (Math.random() - 0.5) * 1.1;
      for (let j = 0; j <= 8; j++) {
        pts.push(new THREE.Vector3(ox + (Math.random() - 0.5) * 0.35, 5.5 - j * 0.65, oz + (Math.random() - 0.5) * 0.35));
      }
      const bolt = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.022 - i * 0.004, 5, false),
        glow(meta.color, 8),
      );
      this.add(bolt, 0.32 + i * 0.05, (mesh, _d, _t, e) => {
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
      });
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 8, 36), glow(meta.color, 6));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.06, p.z);
    this.add(ring, 0.9, (mesh, _d, _t, e) => {
      mesh!.scale.setScalar(1 + (e.age / e.ttl) * 4);
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
    });
  }

  private meteor(meta: AdminEffectMeta) {
    const p = this.target();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 1.3 + Math.random();
      const startY = 6 + Math.random() * 2;
      const delay = Math.random() * 0.9;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glow(meta.color, 6));
      const trail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.5, 6), glow(meta.color, 3));
      trail.position.y = 0.3;
      const g = new THREE.Group();
      g.add(head, trail);
      const x = p.x + Math.cos(a) * r;
      const z = p.z + Math.sin(a) * r;
      g.position.set(x, startY, z);
      g.visible = false;
      this.add(g, 1.6 + delay, (mesh, _d, _t, e) => {
        if (e.age < delay) return;
        mesh!.visible = true;
        mesh!.position.y = startY - (e.age - delay) * (startY / 0.95);
        if (mesh!.position.y <= 0.08 && !e.hit) {
          e.hit = true;
          this.spark(x, z, meta.color);
        }
      });
    }
  }

  private portal(meta: AdminEffectMeta) {
    const p = this.target();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 32),
      new THREE.MeshStandardMaterial({ color: 0x05000f, emissive: meta.color, emissiveIntensity: 0.7, transparent: true, opacity: 0.7 }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(p.x, 0.03, p.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.03, 8, 48), glow(meta.color, 7));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.04, p.z);
    const scale = (_m: THREE.Object3D, e: TempEntry, base: number) => {
      const k = e.age / e.ttl;
      const s = k < 0.35 ? k / 0.35 : k > 0.75 ? Math.max(0.001, 1 - (k - 0.75) / 0.25) : 1;
      return 0.02 + s * base;
    };
    this.add(disc, 2.1, (mesh, dt, _t, e) => {
      mesh!.scale.setScalar(scale(mesh!, e, 1.5));
      mesh!.rotation.z += dt * 0.6;
    });
    this.add(ring, 2.1, (mesh, dt, _t, e) => {
      mesh!.scale.setScalar(scale(mesh!, e, 1.6));
      mesh!.rotation.z -= dt * 1.1;
    });
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 1.1;
      const s = new THREE.Mesh(this.ball, glow(meta.color, 5));
      s.scale.setScalar(0.02);
      this.add(s, 2, (mesh, _d, t) => {
        const ang = a + t * 1.2;
        mesh!.position.set(p.x + Math.cos(ang) * r, 0.08 + Math.sin(t * 3 + i) * 0.12, p.z + Math.sin(ang) * r);
      });
    }
  }

  private blessing(meta: AdminEffectMeta) {
    const p = this.target();
    const glowL = new THREE.PointLight(meta.color, 3, 8);
    glowL.position.copy(p);
    this.add(glowL, 2.5, (mesh, _d, _t, e) => {
      (mesh as THREE.PointLight).intensity = 3 * (1 - e.age / e.ttl);
    });
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.1;
      const startY = 3.2 + Math.random() * 1.6;
      const s = new THREE.Mesh(this.ball, glow(meta.color, 6));
      s.scale.setScalar(0.025);
      s.position.set(p.x + Math.cos(a) * r, startY, p.z + Math.sin(a) * r);
      const vy = 0.5 + Math.random() * 0.5;
      this.add(s, 2.5, (mesh, dt) => {
        mesh!.position.y -= vy * dt * 0.65;
        if (mesh!.position.y < 0.06) mesh!.position.y = startY;
      });
    }
  }

  private shadow(meta: AdminEffectMeta) {
    const p = this.target();
    const fog = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 12),
      new THREE.MeshStandardMaterial({ color: 0x0a0014, emissive: meta.color, emissiveIntensity: 0.4, transparent: true, opacity: 0.01, side: THREE.DoubleSide }),
    );
    fog.position.copy(p);
    this.add(fog, 2.5, (mesh, dt, _t, e) => {
      const k = e.age / e.ttl;
      const op = k < 0.3 ? (k / 0.3) * 0.28 : k > 0.7 ? Math.max(0, 0.28 * (1 - (k - 0.7) / 0.3)) : 0.28;
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = op;
      mesh!.rotation.y += dt * 0.2;
    });
  }

  private matrix(meta: AdminEffectMeta) {
    const p = this.target();
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = meta.color;
    ctx.font = "16px monospace";
    ctx.fillText(String.fromCharCode(0x30a0 + Math.floor(Math.random() * 90)), 6, 22);
    const tex = new THREE.CanvasTexture(canvas);
    for (let i = 0; i < 14; i++) {
      const x = p.x + (Math.random() - 0.5) * 2.2;
      const z = p.z + (Math.random() - 0.5) * 2.2;
      const startY = 3 + Math.random() * 1.6;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.14, 0.14),
        new THREE.MeshBasicMaterial({ map: tex, color: meta.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
      );
      plane.position.set(x, startY, z);
      const vy = 1.2 + Math.random();
      this.add(plane, 2.3, (mesh, dt, _t, e) => {
        mesh!.position.y -= vy * dt;
        mesh!.lookAt(this.camera.position);
        if (mesh!.position.y < 0) mesh!.position.y = startY;
        ((mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
      });
    }
  }

  private ice(meta: AdminEffectMeta) {
    const p = this.target();
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 0.6, transparent: true, opacity: 0.01, roughness: 0.08, metalness: 0.85, side: THREE.DoubleSide }),
    );
    shell.position.copy(p);
    this.add(shell, 2.1, (mesh, dt, _t, e) => {
      const k = e.age / e.ttl;
      const op = k < 0.25 ? (k / 0.25) * 0.5 : k > 0.8 ? Math.max(0, 0.5 * (1 - (k - 0.8) / 0.2)) : 0.5;
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = op;
      mesh!.rotation.y += dt * 0.15;
      if (k > 0.8 && !e.hit) {
        e.hit = true;
        this.spark(p.x, p.z, meta.color);
      }
    });
  }

  private boom(meta: AdminEffectMeta) {
    const p = this.target();
    const flash = new THREE.PointLight(meta.color, 8, 10);
    flash.position.copy(p);
    this.add(flash, 0.45, (mesh, _d, _t, e) => {
      (mesh as THREE.PointLight).intensity = 8 * Math.max(0, 1 - e.age / e.ttl);
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), glow(meta.color, 6));
    ball.position.copy(p);
    this.add(ball, 0.45, (mesh, _d, _t, e) => {
      mesh!.scale.setScalar(1 + (e.age / e.ttl) * 3);
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
    });
    this.spark(p.x, p.z, meta.color);
    this.domImpact(ADMIN_EFFECTS.impact);
  }

  private rays(meta: AdminEffectMeta) {
    const p = this.target();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.22, 4.2, 10, 1, true),
        new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 3, transparent: true, opacity: 0.01, side: THREE.DoubleSide }),
      );
      beam.position.set(p.x + Math.cos(a) * 0.55, p.y + 2, p.z + Math.sin(a) * 0.55);
      this.add(beam, 2.6, (mesh, _d, _t, e) => {
        const k = e.age / e.ttl;
        const op = k < 0.2 ? (k / 0.2) * 0.22 : k > 0.75 ? Math.max(0, 0.22 * (1 - (k - 0.75) / 0.25)) : 0.22;
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = op;
      });
    }
  }

  private hammer(meta: AdminEffectMeta) {
    const p = this.target();
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.05, 8), new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 }));
    handle.position.y = 0.52;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.32), glow(meta.color, 3));
    head.position.y = 1.1;
    g.add(handle, head);
    g.position.set(p.x, p.y + 4, p.z);
    g.rotation.z = 0.5;
    this.add(g, 1.25, (mesh, _d, _t, e) => {
      const k = Math.min(1, e.age / 0.5);
      mesh!.position.y = (p.y + 4) * (1 - k) + p.y * k;
      mesh!.rotation.z = 0.5 * (1 - k);
      if (k >= 1 && !e.hit) {
        e.hit = true;
        this.spark(p.x, p.z, meta.color);
        this.domImpact(ADMIN_EFFECTS.impact);
      }
    });
  }

  private confetti(meta: AdminEffectMeta) {
    const p = this.target();
    const colors = [meta.color, "#ffe066", "#66ff99", "#66ccff", "#ff6699"];
    for (let i = 0; i < 36; i++) {
      const c = colors[i % colors.length];
      const bit = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.1), glow(c, 1.4));
      bit.position.set(p.x, p.y + 1.5, p.z);
      const vx = (Math.random() - 0.5) * 2.4;
      const vz = (Math.random() - 0.5) * 2.4;
      const vy0 = 2 + Math.random();
      const spin = (Math.random() - 0.5) * 8;
      this.add(bit, 2.2, (mesh, dt, _t, e) => {
        mesh!.position.x += vx * dt;
        mesh!.position.z += vz * dt;
        mesh!.position.y += (vy0 - 3.2 * e.age) * dt;
        mesh!.rotation.x += spin * dt;
        if (mesh!.position.y < 0) mesh!.position.y = 0;
      });
    }
  }

  private apocalypse(meta: AdminEffectMeta) {
    this.meteor(meta);
    this.domImpact(ADMIN_EFFECTS.impact);
    const overlay = this.ensureOverlay();
    const tint = document.createElement("div");
    Object.assign(tint.style, {
      position: "absolute",
      inset: "0",
      background: `radial-gradient(circle at 50% 25%, ${meta.color}33, #1a000099 80%)`,
      mixBlendMode: "multiply",
      opacity: "0",
    });
    overlay.appendChild(tint);
    this.add(null, meta.duration / 1000, (_m, _d, _t, e) => {
      const k = e.age / e.ttl;
      const env = k < 0.15 ? k / 0.15 : k > 0.8 ? Math.max(0, 1 - (k - 0.8) / 0.2) : 1;
      tint.style.opacity = String(env * 0.5);
    }, undefined, tint);
  }

  private judgment(meta: AdminEffectMeta) {
    const p = this.target();
    this.rays(meta);
    const flash = new THREE.PointLight(meta.color, 0, 14);
    flash.position.set(p.x, p.y + 3, p.z);
    this.add(flash, 1, (mesh, _d, _t, e) => {
      (mesh as THREE.PointLight).intensity = Math.sin(Math.min(1, e.age / e.ttl) * Math.PI) * 12;
    });
    this.domImpact(ADMIN_EFFECTS.impact);
  }

  private tear(meta: AdminEffectMeta) {
    this.portal(meta);
    this.domGlass(meta);
    this.domChroma(ADMIN_EFFECTS.chromaticpulse);
  }

  private phoenix(meta: AdminEffectMeta) {
    const p = this.target();
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 0.5;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 6), glow(meta.color, 6));
      flame.position.set(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r);
      const vy = 1 + Math.random();
      this.add(flame, 1.6, (mesh, dt, _t, e) => {
        mesh!.position.y += vy * dt;
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
      });
    }
    this.domImpact(ADMIN_EFFECTS.impact);
  }

  private stars(meta: AdminEffectMeta) {
    const p = this.target();
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 2;
      const sx = p.x + Math.cos(a) * dist;
      const sz = p.z + Math.sin(a) * dist;
      const sy = 3 + Math.random() * 2;
      const star = new THREE.Mesh(this.ball, glow(meta.color, 7));
      star.scale.setScalar(0.05);
      star.position.set(sx, sy, sz);
      star.visible = false;
      const delay = Math.random() * 1;
      this.add(star, 2.3 + delay, (mesh, _d, _t, e) => {
        if (e.age < delay) return;
        mesh!.visible = true;
        const k = Math.min(1, (e.age - delay) / Math.max(0.2, e.ttl - delay));
        mesh!.position.set(sx + (p.x - sx) * k, sy + (0.12 - sy) * k, sz + (p.z - sz) * k);
        if (k >= 1 && !e.hit) {
          e.hit = true;
          this.spark(p.x, p.z, meta.color);
        }
      });
    }
  }

  private ensureOverlay() {
    if (this.overlay) return this.overlay;
    const parent = this.renderer.domElement.parentElement || document.body;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    const div = document.createElement("div");
    Object.assign(div.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "60", overflow: "hidden" });
    parent.appendChild(div);
    this.overlay = div;
    return div;
  }

  private ensureChroma() {
    if (this.chroma) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", "ae-chroma-filter");
    filter.innerHTML = `<feOffset in="SourceGraphic" dx="-4" dy="0" result="r"/><feOffset in="SourceGraphic" dx="4" dy="0" result="b"/><feBlend in="r" in2="SourceGraphic" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/>`;
    svg.appendChild(filter);
    document.body.appendChild(svg);
    this.chroma = filter;
  }

  private domImpact(meta: AdminEffectMeta) {
    const el = this.renderer.domElement;
    const origT = el.style.transform;
    const origF = el.style.filter;
    this.add(null, meta.duration / 1000, (_m, _d, t, e) => {
      const k = e.age / e.ttl;
      const env = Math.sin(k * Math.PI) * (1 - k);
      el.style.transform = `scale(${1 + env * 0.03}) translate(${Math.sin(t * 50) * env * 5}px, ${Math.cos(t * 44) * env * 3}px)`;
      el.style.filter = `brightness(${1 + env * 0.55})`;
    }, () => {
      el.style.transform = origT;
      el.style.filter = origF;
    });
  }

  private domChroma(meta: AdminEffectMeta) {
    this.ensureChroma();
    const el = this.renderer.domElement;
    const orig = el.style.filter;
    this.add(null, meta.duration / 1000, (_m, _d, _t, e) => {
      const env = Math.sin((e.age / e.ttl) * Math.PI);
      el.style.filter = `url(#ae-chroma-filter) saturate(${1 + env * 0.5})`;
    }, () => {
      el.style.filter = orig;
    });
  }

  private domSlow(meta: AdminEffectMeta) {
    const overlay = this.ensureOverlay();
    const v = document.createElement("div");
    Object.assign(v.style, {
      position: "absolute",
      inset: "0",
      background: `radial-gradient(circle at 50% 50%, transparent 35%, ${meta.color}22 100%)`,
      opacity: "0",
    });
    overlay.appendChild(v);
    const el = this.renderer.domElement;
    const orig = el.style.filter;
    this.add(null, meta.duration / 1000, (_m, _d, _t, e) => {
      const k = e.age / e.ttl;
      const env = k < 0.15 ? k / 0.15 : k > 0.85 ? Math.max(0, 1 - (k - 0.85) / 0.15) : 1;
      v.style.opacity = String(env * 0.55);
      el.style.filter = `saturate(${1 - env * 0.3})`;
    }, () => {
      el.style.filter = orig;
    }, v);
  }

  private domGlass(meta: AdminEffectMeta) {
    const overlay = this.ensureOverlay();
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%", opacity: "0" });
    const cx = 48, cy = 46;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = 28 + (i % 3) * 10;
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(cx));
      line.setAttribute("y1", String(cy));
      line.setAttribute("x2", String(cx + Math.cos(a) * len));
      line.setAttribute("y2", String(cy + Math.sin(a) * len));
      line.setAttribute("stroke", meta.color);
      line.setAttribute("stroke-width", "0.35");
      svg.appendChild(line);
    }
    overlay.appendChild(svg);
    this.add(null, meta.duration / 1000, (_m, _d, _t, e) => {
      const k = e.age / e.ttl;
      const env = k < 0.1 ? k / 0.1 : k > 0.6 ? Math.max(0, 1 - (k - 0.6) / 0.4) : 1;
      svg.style.opacity = String(env);
    }, undefined, svg as unknown as HTMLElement);
  }
}

export function listFx(): string {
  return ADMIN_EFFECT_IDS.map((id) => `${ADMIN_EFFECTS[id].icon} ${id} — ${ADMIN_EFFECTS[id].name}`).join("\n");
}
