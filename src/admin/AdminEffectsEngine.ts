/**
 * AdminEffectsEngine v1.0 — Moteur d'effets visuels Admin / Owner
 * ─────────────────────────────────────────────────────────────
 * 15 effets exclusifs (11 en scène 3D + 4 en surcouche DOM/écran),
 * pensés pour compléter le système des 18 auras déjà en place dans
 * CharacterCreator.tsx (LivingAura / AURA_ALL / godmode).
 *
 * Conception 100% non-invasive :
 *  - Boucle d'animation interne (requestAnimationFrame propre au moteur)
 *    → aucune modification du render-loop existant n'est requise.
 *  - Les objets 3D sont ajoutés à un THREE.Group dédié, lui-même ajouté
 *    à la scène fournie : le renderer.render(scene,camera) déjà en place
 *    les affichera automatiquement.
 *  - Les effets "écran" (impact, chromatique, ralenti, verre brisé)
 *    manipulent uniquement un calque DOM superposé au canvas — le
 *    canvas lui-même n'est jamais touché.
 *
 * @file client/src/systems/AdminEffectsEngine.ts
 */

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────

export type AdminEffectId =
  | 'lightning' | 'meteor' | 'portal' | 'blessing' | 'shadowrealm'
  | 'matrixrain' | 'icecapsule' | 'explosion' | 'godrays' | 'banhammer'
  | 'confetti' | 'impact' | 'chromaticpulse' | 'slowmotion' | 'glassshatter'
  | 'apocalypse' | 'divinejudgment' | 'realitytear' | 'phoenixrebirth' | 'starfall';

export type AdminEffectKind = '3d' | 'dom' | 'hybrid';
export type AdminEffectCategory = 'Élémentaire' | 'Rituel' | 'Choc / Écran' | 'Légendaire';
export type AdminEffectRole = 'admin' | 'owner';

export interface AdminEffectMeta {
  id: AdminEffectId;
  name: string;
  icon: string;
  lore: string;
  color: string;       // couleur d'accent CSS (hex)
  duration: number;    // durée totale de l'effet, ms
  kind: AdminEffectKind;
  category: AdminEffectCategory;
  minRole: AdminEffectRole; // rôle minimum requis ('owner' = exclusif Owner)
}

export const ADMIN_EFFECTS: Record<AdminEffectId, AdminEffectMeta> = {
  lightning: {
    id: 'lightning', name: 'Foudre Céleste', icon: '⚡',
    lore: 'Un éclair déchire le ciel et frappe le sol autour du personnage.',
    color: '#7fd4ff', duration: 1400, kind: '3d', category: 'Élémentaire',
    minRole: 'admin',
  },
  meteor: {
    id: 'meteor', name: 'Pluie de Météores', icon: '☄️',
    lore: 'Des fragments enflammés s\'abattent en orbite autour du personnage.',
    color: '#ff7a33', duration: 2600, kind: '3d', category: 'Élémentaire',
    minRole: 'admin',
  },
  portal: {
    id: 'portal', name: 'Faille Dimensionnelle', icon: '🌀',
    lore: 'Un portail s\'ouvre au sol, engloutit la lumière puis se referme.',
    color: '#b06fff', duration: 2200, kind: '3d', category: 'Rituel',
    minRole: 'admin',
  },
  blessing: {
    id: 'blessing', name: 'Pluie Bénie', icon: '✨',
    lore: 'Une pluie de lumière dorée descend et s\'élève en volutes sacrées.',
    color: '#ffe066', duration: 2600, kind: '3d', category: 'Rituel',
    minRole: 'admin',
  },
  shadowrealm: {
    id: 'shadowrealm', name: 'Royaume des Ombres', icon: '🌑',
    lore: 'Une brume violette engloutit la zone, des volutes sombres rampent au sol.',
    color: '#5a1e8a', duration: 2600, kind: '3d', category: 'Rituel',
    minRole: 'admin',
  },
  matrixrain: {
    id: 'matrixrain', name: 'Pluie de Code', icon: '🟩',
    lore: 'Des glyphes numériques verts ruissellent verticalement — signature TroxT.',
    color: '#22ff66', duration: 2400, kind: '3d', category: 'Rituel',
    minRole: 'admin',
  },
  icecapsule: {
    id: 'icecapsule', name: 'Capsule de Givre', icon: '🧊',
    lore: 'Le personnage est scellé dans un bloc de glace qui explose en éclats.',
    color: '#8be8ff', duration: 2200, kind: '3d', category: 'Élémentaire',
    minRole: 'admin',
  },
  explosion: {
    id: 'explosion', name: 'Détonation', icon: '💥',
    lore: 'Boule de feu, onde de choc et débris incandescents.',
    color: '#ff5522', duration: 1600, kind: 'hybrid', category: 'Choc / Écran',
    minRole: 'admin',
  },
  godrays: {
    id: 'godrays', name: 'Rayons Divins', icon: '🌟',
    lore: 'Des colonnes de lumière volumétrique tombent du ciel.',
    color: '#fff3c4', duration: 2800, kind: '3d', category: 'Rituel',
    minRole: 'admin',
  },
  banhammer: {
    id: 'banhammer', name: 'Marteau du Bannissement', icon: '🔨',
    lore: 'Le marteau de la modération s\'abat avec une onde de choc totale.',
    color: '#ff3333', duration: 1500, kind: 'hybrid', category: 'Choc / Écran',
    minRole: 'admin',
  },
  confetti: {
    id: 'confetti', name: 'Confettis de Victoire', icon: '🎉',
    lore: 'Une explosion de confettis colorés célèbre le personnage.',
    color: '#ff66cc', duration: 2400, kind: '3d', category: 'Rituel',
    minRole: 'admin',
  },
  impact: {
    id: 'impact', name: 'Choc Caméra', icon: '📳',
    lore: 'Secousse et punch de caméra façon coup encaissé.',
    color: '#ffffff', duration: 550, kind: 'dom', category: 'Choc / Écran',
    minRole: 'admin',
  },
  chromaticpulse: {
    id: 'chromaticpulse', name: 'Pulsation Chromatique', icon: '🌈',
    lore: 'Aberration chromatique pulsée — distorsion visuelle courte.',
    color: '#ff33aa', duration: 700, kind: 'dom', category: 'Choc / Écran',
    minRole: 'admin',
  },
  slowmotion: {
    id: 'slowmotion', name: 'Ralenti Dramatique', icon: '🎬',
    lore: 'Vignette bleutée et grain léger — effet cinématique.',
    color: '#3aa0ff', duration: 2200, kind: 'dom', category: 'Choc / Écran',
    minRole: 'admin',
  },
  glassshatter: {
    id: 'glassshatter', name: 'Verre Brisé', icon: '🔻',
    lore: 'L\'écran se fissure sous l\'impact puis se répare.',
    color: '#cfe8ff', duration: 1200, kind: 'dom', category: 'Choc / Écran',
    minRole: 'admin',
  },

  // ── LÉGENDAIRES — exclusifs OWNER ──────────────────────────
  apocalypse: {
    id: 'apocalypse', name: 'Apocalypse', icon: '🔥',
    lore: 'Le ciel s\'embrase, la terre tremble et le feu pleut sur tout le domaine.',
    color: '#ff2200', duration: 3600, kind: 'hybrid', category: 'Légendaire',
    minRole: 'owner',
  },
  divinejudgment: {
    id: 'divinejudgment', name: 'Jugement Divin', icon: '⚖️',
    lore: 'Une colonne de lumière absolue s\'abat, entourée d\'anneaux dorés.',
    color: '#fff6c9', duration: 3000, kind: 'hybrid', category: 'Légendaire',
    minRole: 'owner',
  },
  realitytear: {
    id: 'realitytear', name: 'Déchirure de Réalité', icon: '🕳️',
    lore: 'La trame du monde se fissure entièrement avant de se ressouder.',
    color: '#b06fff', duration: 2800, kind: 'hybrid', category: 'Légendaire',
    minRole: 'owner',
  },
  phoenixrebirth: {
    id: 'phoenixrebirth', name: 'Renaissance du Phénix', icon: '🐦‍🔥',
    lore: 'Le personnage s\'embrase puis renaît dans une volée de plumes dorées.',
    color: '#ff9933', duration: 3200, kind: '3d', category: 'Légendaire',
    minRole: 'owner',
  },
  starfall: {
    id: 'starfall', name: 'Chute d\'Étoiles', icon: '🌠',
    lore: 'Une constellation entière converge et s\'écrase en étoiles filantes.',
    color: '#9fd8ff', duration: 3200, kind: '3d', category: 'Légendaire',
    minRole: 'owner',
  },
};

export const ADMIN_EFFECT_IDS = Object.keys(ADMIN_EFFECTS) as AdminEffectId[];

// ─────────────────────────────────────────────────────────────
//  OBJET TEMPORAIRE GÉNÉRIQUE
// ─────────────────────────────────────────────────────────────

interface TempEntry {
  mesh: THREE.Object3D | null;
  ttl: number;
  age: number;
  tick?: (mesh: THREE.Object3D | null, dt: number, t: number, entry: TempEntry) => void;
  onEnd?: () => void;
  dom?: HTMLElement;
}

type EngineListener = (id: AdminEffectId | null) => void;

// ─────────────────────────────────────────────────────────────
//  MOTEUR
// ─────────────────────────────────────────────────────────────

export class AdminEffectsEngine {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private getTarget: () => THREE.Vector3;

  private group = new THREE.Group();
  private entries: TempEntry[] = [];
  private overlay: HTMLDivElement | null = null;
  private chromaFilter: SVGFilterElement | null = null;

  private clock = new THREE.Clock();
  private rafId = 0;
  private active: AdminEffectId | null = null;
  private listeners = new Set<EngineListener>();
  private sharedGeo = new THREE.SphereGeometry(1, 8, 6);
  private disposed = false;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    getTarget: () => THREE.Vector3 = () => new THREE.Vector3(0, 1.2, 0),
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.getTarget = getTarget;
    this.group.name = 'AdminEffectsGroup';
    this.scene.add(this.group);
    this.clock.start();
    this._loop();
  }

  // ── API PUBLIQUE ──────────────────────────────────────────

  play(id: AdminEffectId): boolean {
    const meta = ADMIN_EFFECTS[id];
    if (!meta || this.disposed) return false;
    this.active = id;
    this._notify(id);
    switch (id) {
      case 'lightning':      this._buildLightning(meta); break;
      case 'meteor':         this._buildMeteor(meta); break;
      case 'portal':         this._buildPortal(meta); break;
      case 'blessing':       this._buildBlessing(meta); break;
      case 'shadowrealm':    this._buildShadowRealm(meta); break;
      case 'matrixrain':     this._buildMatrixRain(meta); break;
      case 'icecapsule':     this._buildIceCapsule(meta); break;
      case 'explosion':      this._buildExplosion(meta); break;
      case 'godrays':        this._buildGodRays(meta); break;
      case 'banhammer':      this._buildBanHammer(meta); break;
      case 'confetti':       this._buildConfetti(meta); break;
      case 'impact':         this._domImpact(meta); break;
      case 'chromaticpulse': this._domChromaticPulse(meta); break;
      case 'slowmotion':     this._domSlowMotion(meta); break;
      case 'glassshatter':   this._domGlassShatter(meta); break;
      case 'apocalypse':     this._buildApocalypse(meta); break;
      case 'divinejudgment': this._buildDivineJudgment(meta); break;
      case 'realitytear':    this._buildRealityTear(meta); break;
      case 'phoenixrebirth': this._buildPhoenixRebirth(meta); break;
      case 'starfall':       this._buildStarfall(meta); break;
    }
    window.setTimeout(() => {
      if (this.active === id) { this.active = null; this._notify(null); }
    }, meta.duration);
    return true;
  }

  clearAll(): void {
    this.entries.forEach(e => this._endEntry(e));
    this.entries = [];
    this.active = null;
    this._notify(null);
  }

  getActive(): AdminEffectId | null { return this.active; }

  onChange(fn: EngineListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.clearAll();
    this.scene.remove(this.group);
    this.sharedGeo.dispose();
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    this.listeners.clear();
  }

  // ── BOUCLE INTERNE ────────────────────────────────────────

  private _loop = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      e.age += dt;
      if (e.tick) e.tick(e.mesh, dt, t, e);
      if (e.age >= e.ttl) {
        this._endEntry(e);
        this.entries.splice(i, 1);
      }
    }
    this.rafId = requestAnimationFrame(this._loop);
  };

  private _add(mesh: THREE.Object3D | null, ttl: number, tick?: TempEntry['tick'], onEnd?: () => void, dom?: HTMLElement) {
    if (mesh) this.group.add(mesh);
    this.entries.push({ mesh, ttl, age: 0, tick, onEnd, dom });
  }

  private _endEntry(e: TempEntry) {
    if (e.mesh) {
      this.group.remove(e.mesh);
      e.mesh.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry && m.geometry !== this.sharedGeo) m.geometry.dispose();
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach(mm => mm.dispose());
        }
      });
    }
    if (e.dom) e.dom.remove();
    if (e.onEnd) e.onEnd();
  }

  private _particleMat(color: THREE.ColorRepresentation, intensity = 5) {
    return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.2, transparent: true });
  }

  // ── OVERLAY DOM (partagé par les 4 effets écran) ─────────

  private _ensureOverlay(): HTMLDivElement {
    if (this.overlay) return this.overlay;
    const parent = this.renderer.domElement.parentElement || document.body;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    const div = document.createElement('div');
    div.className = 'ae-overlay';
    Object.assign(div.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '60', overflow: 'hidden',
    } as CSSStyleDeclaration);
    parent.appendChild(div);
    this.overlay = div;
    return div;
  }

  private _ensureChromaFilter(): void {
    if (this.chromaFilter) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'ae-chroma-filter');
    filter.innerHTML = `
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
      <feOffset in="r" dx="-4" dy="0" result="ro"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
      <feOffset in="b" dx="4" dy="0" result="bo"/>
      <feBlend in="ro" in2="g" mode="screen" result="rg"/>
      <feBlend in="rg" in2="bo" mode="screen"/>
    `;
    svg.appendChild(filter);
    document.body.appendChild(svg);
    this.chromaFilter = filter;
  }

  // ═════════════════════════════════════════════════════════
  //  EFFETS 3D
  // ═════════════════════════════════════════════════════════

  private _buildLightning(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const flash = new THREE.PointLight(new THREE.Color(meta.color), 0, 14);
    flash.position.set(p.x, p.y + 3, p.z);
    this._add(flash, 0.5, (mesh) => {
      const l = mesh as THREE.PointLight;
      l.intensity = Math.max(0, l.intensity - 0.4) || 9;
    });
    for (let i = 0; i < 3; i++) {
      const pts: THREE.Vector3[] = [];
      const ox = p.x + (Math.random() - 0.5) * 1.2, oz = p.z + (Math.random() - 0.5) * 1.2;
      for (let j = 0; j <= 10; j++) {
        const y = 6 - j * 0.6;
        pts.push(new THREE.Vector3(ox + (Math.random() - 0.5) * (0.5 - j * 0.03), y, oz + (Math.random() - 0.5) * (0.5 - j * 0.03)));
      }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.02 - i * 0.004, 5, false);
      const mat = new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 8, transparent: true, opacity: 0.95 });
      const bolt = new THREE.Mesh(geo, mat);
      this._add(bolt, 0.35 + i * 0.05, (mesh, dt, t, e) => {
        (mesh as THREE.Mesh).material && ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity && (((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.95 - e.age / e.ttl));
      });
    }
    const ringGeo = new THREE.TorusGeometry(0.6, 0.05, 8, 48);
    const ring = new THREE.Mesh(ringGeo, this._particleMat(meta.color, 6));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.05, p.z);
    this._add(ring, 1.0, (mesh, dt, t, e) => {
      const s = 1 + (e.age / e.ttl) * 4;
      mesh!.scale.setScalar(s);
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
    });
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.8;
      const spark = new THREE.Mesh(this.sharedGeo, this._particleMat(meta.color, 8));
      spark.scale.setScalar(0.03 + Math.random() * 0.04);
      spark.position.set(p.x + Math.cos(a) * r, 0.1, p.z + Math.sin(a) * r);
      const vy = 1.5 + Math.random() * 2;
      this._add(spark, 0.6, (mesh, dt, t, e) => {
        mesh!.position.y += vy * dt;
        mesh!.position.x += Math.cos(a) * dt * 0.6;
        mesh!.position.z += Math.sin(a) * dt * 0.6;
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
      });
    }
  }

  private _buildMeteor(meta: AdminEffectMeta) {
    const p = this.getTarget();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const r = 1.2 + Math.random() * 1.4;
      const startY = 6 + Math.random() * 3;
      const delay = Math.random() * 1.2;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), this._particleMat(meta.color, 6));
      const trailMat = new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 3, transparent: true, opacity: 0.5 });
      const trail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.6, 6), trailMat);
      const grp = new THREE.Group(); grp.add(head); trail.position.y = 0.35; grp.add(trail);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      grp.position.set(x, startY, z);
      grp.visible = false;
      this._add(grp, 1.8 + delay, (mesh, dt, t, e) => {
        if (e.age < delay) return;
        mesh!.visible = true;
        const local = e.age - delay;
        mesh!.position.y = startY - local * (startY / 1.0);
        if (mesh!.position.y <= 0.05 && !((e as any)._impacted)) {
          (e as any)._impacted = true;
          this._spawnImpactSparks(x, z, meta.color);
        }
      });
    }
  }

  private _spawnImpactSparks(x: number, z: number, color: string) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.09, 24), this._particleMat(color, 5));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.03, z);
    this._add(ring, 0.5, (mesh, dt, t, e) => {
      mesh!.scale.setScalar(1 + (e.age / e.ttl) * 8);
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
    });
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const shard = new THREE.Mesh(this.sharedGeo, this._particleMat(color, 6));
      shard.scale.setScalar(0.02 + Math.random() * 0.03);
      shard.position.set(x, 0.05, z);
      const vy = 1 + Math.random(), vr = 0.8 + Math.random();
      this._add(shard, 0.5, (mesh, dt) => {
        mesh!.position.y += vy * dt; mesh!.position.x += Math.cos(a) * vr * dt; mesh!.position.z += Math.sin(a) * vr * dt;
      });
    }
  }

  private _buildPortal(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.05, 48), new THREE.MeshStandardMaterial({ color: 0x05000f, emissive: meta.color, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(p.x, 0.02, p.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.03, 8, 96), this._particleMat(meta.color, 7));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.03, p.z);
    this._add(disc, 2.2, (mesh, dt, t, e) => {
      const k = e.age / e.ttl;
      const scale = k < 0.4 ? (k / 0.4) : k > 0.75 ? Math.max(0.001, 1 - (k - 0.75) / 0.25) : 1;
      mesh!.scale.setScalar(0.02 + scale * 1.5);
      mesh!.rotation.z += dt * 0.6;
    });
    this._add(ring, 2.2, (mesh, dt, t, e) => {
      const k = e.age / e.ttl;
      const scale = k < 0.4 ? (k / 0.4) : k > 0.75 ? Math.max(0.001, 1 - (k - 0.75) / 0.25) : 1;
      mesh!.scale.setScalar(0.02 + scale * 1.6);
      mesh!.rotation.z -= dt * 1.1;
    });
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.1 + Math.random() * 1.3;
      const s = new THREE.Mesh(this.sharedGeo, this._particleMat(meta.color, 5));
      s.scale.setScalar(0.015 + Math.random() * 0.03);
      const dir = Math.random() > 0.5 ? -1 : 1;
      this._add(s, 2.0, (mesh, dt, t, e) => {
        const k = e.age / e.ttl;
        const rad = dir < 0 ? r * (1 - Math.min(1, k * 1.6)) : r * Math.min(1, k * 1.6);
        const ang = a + t * 1.2;
        mesh!.position.set(p.x + Math.cos(ang) * rad, 0.05 + Math.sin(t * 3 + i) * 0.15, p.z + Math.sin(ang) * rad);
      });
    }
  }

  private _buildBlessing(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const glow = new THREE.PointLight(new THREE.Color(meta.color), 3, 8);
    glow.position.set(p.x, p.y + 1, p.z);
    this._add(glow, 2.6, (mesh, dt, t, e) => { (mesh as THREE.PointLight).intensity = 3 * (1 - e.age / e.ttl); });
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.1;
      const startY = 3.5 + Math.random() * 2;
      const s = new THREE.Mesh(this.sharedGeo, this._particleMat(meta.color, 6));
      s.scale.setScalar(0.02 + Math.random() * 0.03);
      s.position.set(p.x + Math.cos(a) * r, startY, p.z + Math.sin(a) * r);
      const vy = 0.5 + Math.random() * 0.6;
      this._add(s, 2.6, (mesh, dt, t, e) => {
        mesh!.position.y -= vy * dt * 0.6;
        if (mesh!.position.y < 0.05) mesh!.position.y = startY;
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(t * 3 + i) * 0.4;
      });
    }
  }

  private _buildShadowRealm(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const fog = new THREE.Mesh(new THREE.SphereGeometry(1.6, 32, 16), new THREE.MeshStandardMaterial({ color: 0x0a0014, emissive: meta.color, emissiveIntensity: 0.4, transparent: true, opacity: 0.001, side: THREE.DoubleSide }));
    fog.position.set(p.x, p.y, p.z);
    this._add(fog, 2.6, (mesh, dt, t, e) => {
      const k = e.age / e.ttl;
      const op = k < 0.3 ? (k / 0.3) * 0.28 : k > 0.7 ? Math.max(0, 0.28 * (1 - (k - 0.7) / 0.3)) : 0.28;
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = op;
      mesh!.rotation.y += dt * 0.2;
    });
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 1.3;
      const wisp = new THREE.Mesh(this.sharedGeo, this._particleMat(meta.color, 4));
      wisp.scale.setScalar(0.03 + Math.random() * 0.05);
      this._add(wisp, 2.6, (mesh, dt, t, e) => {
        const ang = a + t * 0.8;
        mesh!.position.set(p.x + Math.cos(ang) * r, 0.05 + Math.abs(Math.sin(t * 1.5 + i)) * 0.5, p.z + Math.sin(ang) * r);
      });
    }
  }

  private _buildMatrixRain(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = meta.color; ctx.font = '14px monospace';
    ctx.fillText(String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)), 20, 40);
    const tex = new THREE.CanvasTexture(canvas);
    for (let i = 0; i < 26; i++) {
      const x = p.x + (Math.random() - 0.5) * 2.4, z = p.z + (Math.random() - 0.5) * 2.4;
      const startY = 3 + Math.random() * 2;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), new THREE.MeshBasicMaterial({ map: tex, color: meta.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      plane.position.set(x, startY, z);
      const vy = 1.2 + Math.random() * 1.2;
      this._add(plane, 2.4, (mesh, dt, t, e) => {
        mesh!.position.y -= vy * dt;
        mesh!.lookAt(this.camera.position);
        if (mesh!.position.y < 0) mesh!.position.y = startY;
        ((mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
      });
    }
  }

  private _buildIceCapsule(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 0.6, transparent: true, opacity: 0.001, roughness: 0.05, metalness: 0.9, side: THREE.DoubleSide }));
    shell.position.set(p.x, p.y, p.z);
    this._add(shell, 2.2, (mesh, dt, t, e) => {
      const k = e.age / e.ttl;
      const op = k < 0.25 ? (k / 0.25) * 0.5 : k > 0.8 ? Math.max(0, 0.5 * (1 - (k - 0.8) / 0.2)) : 0.5;
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = op;
      mesh!.rotation.y += dt * 0.15;
      if (k > 0.8 && !(e as any)._burst) { (e as any)._burst = true; this._spawnImpactSparks(p.x, p.z, meta.color); }
    });
    for (let i = 0; i < 18; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.05 + Math.random() * 0.04), this._particleMat(meta.color, 5));
      const a = Math.random() * Math.PI * 2;
      shard.position.set(p.x + Math.cos(a) * 0.9, p.y + (Math.random() - 0.3) * 1.4, p.z + Math.sin(a) * 0.9);
      shard.visible = false;
      this._add(shard, 2.2, (mesh, dt, t, e) => {
        if (e.age < 1.7) return;
        mesh!.visible = true;
        mesh!.position.x += Math.cos(a) * dt * 1.6;
        mesh!.position.z += Math.sin(a) * dt * 1.6;
        mesh!.position.y -= dt * 0.5;
        mesh!.rotation.x += dt * 4; mesh!.rotation.y += dt * 3;
      });
    }
  }

  private _buildExplosion(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const flash = new THREE.PointLight(new THREE.Color(meta.color), 8, 10);
    flash.position.set(p.x, p.y, p.z);
    this._add(flash, 0.5, (mesh, dt, t, e) => { (mesh as THREE.PointLight).intensity = 8 * Math.max(0, 1 - e.age / e.ttl); });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), this._particleMat(meta.color, 6));
    ball.position.set(p.x, p.y, p.z);
    this._add(ball, 0.5, (mesh, dt, t, e) => {
      mesh!.scale.setScalar(1 + (e.age / e.ttl) * 3);
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 48), this._particleMat('#ffffff', 5));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.05, p.z);
    this._add(ring, 0.7, (mesh, dt, t, e) => {
      mesh!.scale.setScalar(1 + (e.age / e.ttl) * 8);
      ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
    });
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, el = Math.random() * Math.PI;
      const debris = new THREE.Mesh(this.sharedGeo, this._particleMat(i % 3 === 0 ? '#ffaa00' : meta.color, 5));
      debris.scale.setScalar(0.03 + Math.random() * 0.05);
      debris.position.set(p.x, p.y, p.z);
      const vx = Math.cos(a) * Math.sin(el) * 2, vz = Math.sin(a) * Math.sin(el) * 2, vy = Math.cos(el) * 2 + 1;
      this._add(debris, 1.0 + Math.random() * 0.4, (mesh, dt, t, e) => {
        mesh!.position.x += vx * dt; mesh!.position.z += vz * dt;
        mesh!.position.y += (vy - 4 * e.age) * dt;
        if (mesh!.position.y < 0.02) mesh!.position.y = 0.02;
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
      });
    }
    this._domImpact(ADMIN_EFFECTS.impact);
  }

  private _buildGodRays(meta: AdminEffectMeta) {
    const p = this.getTarget();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 4.5, 12, 1, true), new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 3, transparent: true, opacity: 0.001, side: THREE.DoubleSide }));
      beam.position.set(p.x + Math.cos(a) * 0.6, p.y + 2.2, p.z + Math.sin(a) * 0.6);
      this._add(beam, 2.8, (mesh, dt, t, e) => {
        const k = e.age / e.ttl;
        const op = k < 0.2 ? (k / 0.2) * 0.22 : k > 0.75 ? Math.max(0, 0.22 * (1 - (k - 0.75) / 0.25)) : 0.22;
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = op;
      });
    }
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.2;
      const mote = new THREE.Mesh(this.sharedGeo, this._particleMat(meta.color, 5));
      mote.scale.setScalar(0.01 + Math.random() * 0.02);
      const startY = Math.random() * 3.5;
      mote.position.set(p.x + Math.cos(a) * r, startY, p.z + Math.sin(a) * r);
      this._add(mote, 2.8, (mesh, dt) => { mesh!.position.y -= dt * 0.4; if (mesh!.position.y < 0) mesh!.position.y = 3.5; });
    }
  }

  private _buildBanHammer(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const grp = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 }));
    handle.position.y = 0.55; grp.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 3, roughness: 0.2, metalness: 0.7 }));
    head.position.y = 1.15; grp.add(head);
    grp.position.set(p.x, p.y + 4, p.z);
    grp.rotation.z = 0.5;
    this._add(grp, 1.3, (mesh, dt, t, e) => {
      const k = Math.min(1, e.age / 0.5);
      mesh!.position.y = (p.y + 4) * (1 - k) + p.y * k;
      mesh!.rotation.z = 0.5 * (1 - k);
      if (k >= 1 && !(e as any)._hit) {
        (e as any)._hit = true;
        this._spawnImpactSparks(p.x, p.z, meta.color);
        this._domImpact(ADMIN_EFFECTS.impact);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.06, 8, 48), this._particleMat(meta.color, 6));
        ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.04, p.z);
        this._add(ring, 0.6, (m2, dt2, t2, e2) => {
          m2!.scale.setScalar(1 + (e2.age / e2.ttl) * 10);
          ((m2 as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e2.age / e2.ttl);
        });
      }
    });
  }

  private _buildConfetti(meta: AdminEffectMeta) {
    const p = this.getTarget();
    const colors = [meta.color, '#ffe066', '#66ff99', '#66ccff', '#ff6699'];
    for (let i = 0; i < 70; i++) {
      const c = colors[i % colors.length];
      const bit = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.1), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5, side: THREE.DoubleSide }));
      bit.position.set(p.x + (Math.random() - 0.5) * 0.4, p.y + 1.6 + Math.random() * 0.4, p.z + (Math.random() - 0.5) * 0.4);
      const vx = (Math.random() - 0.5) * 2.5, vz = (Math.random() - 0.5) * 2.5, vy0 = 2 + Math.random() * 1.5;
      const spin = (Math.random() - 0.5) * 8;
      this._add(bit, 2.4, (mesh, dt, t, e) => {
        mesh!.position.x += vx * dt; mesh!.position.z += vz * dt;
        mesh!.position.y += (vy0 - 3.2 * e.age) * dt;
        mesh!.rotation.x += spin * dt; mesh!.rotation.z += spin * 0.7 * dt;
        if (mesh!.position.y < 0) mesh!.position.y = 0;
      });
    }
  }

  // ═════════════════════════════════════════════════════════
  //  EFFETS LÉGENDAIRES — exclusifs OWNER (combinaisons)
  // ═════════════════════════════════════════════════════════

  private _buildApocalypse(meta: AdminEffectMeta) {
    const p = this.getTarget();
    this._buildMeteor(meta);
    this._spawnImpactSparks(p.x, p.z, meta.color);
    this._domImpact(ADMIN_EFFECTS.impact);
    const overlay = this._ensureOverlay();
    const tint = document.createElement('div');
    Object.assign(tint.style, {
      position: 'absolute', inset: '0',
      background: `radial-gradient(circle at 50% 25%, ${meta.color}33, #1a000099 80%)`,
      mixBlendMode: 'multiply', opacity: '0',
    } as CSSStyleDeclaration);
    overlay.appendChild(tint);
    this._add(null, meta.duration / 1000, (_m, dt, t, e) => {
      const k = e.age / e.ttl;
      const env = k < 0.15 ? k / 0.15 : k > 0.8 ? Math.max(0, 1 - (k - 0.8) / 0.2) : 1;
      tint.style.opacity = String(env * 0.5);
    }, undefined, tint);
    [900, 1800, 2600].forEach(delay => {
      window.setTimeout(() => {
        if (this.disposed) return;
        this._buildMeteor(meta);
        if (Math.random() > 0.4) {
          this._spawnImpactSparks(p.x + (Math.random() - 0.5) * 1.5, p.z + (Math.random() - 0.5) * 1.5, meta.color);
          this._domImpact(ADMIN_EFFECTS.impact);
        }
      }, delay);
    });
  }

  private _buildDivineJudgment(meta: AdminEffectMeta) {
    const p = this.getTarget();
    this._buildGodRays(meta);
    const flash = new THREE.PointLight(new THREE.Color(meta.color), 0, 16);
    flash.position.set(p.x, p.y + 3, p.z);
    this._add(flash, 1.0, (mesh, dt, t, e) => {
      const k = e.age / e.ttl;
      (mesh as THREE.PointLight).intensity = Math.sin(Math.min(1, k) * Math.PI) * 14;
    });
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 64), this._particleMat(meta.color, 7));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, 4 - i * 0.6, p.z);
      this._add(ring, 2.0, (mesh, dt, t, e) => {
        mesh!.position.y -= dt * 1.6;
        mesh!.scale.setScalar(1 + (e.age / e.ttl) * 1.5);
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
      });
    }
    window.setTimeout(() => { if (!this.disposed) this._domImpact(ADMIN_EFFECTS.impact); }, 400);
  }

  private _buildRealityTear(meta: AdminEffectMeta) {
    this._buildPortal(meta);
    this._domGlassShatter(meta);
    window.setTimeout(() => { if (!this.disposed) this._domChromaticPulse(ADMIN_EFFECTS.chromaticpulse); }, 600);
    window.setTimeout(() => { if (!this.disposed) this._domChromaticPulse(ADMIN_EFFECTS.chromaticpulse); }, 1800);
  }

  private _buildPhoenixRebirth(meta: AdminEffectMeta) {
    const p = this.getTarget();
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.6;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6), this._particleMat(meta.color, 6));
      flame.position.set(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r);
      const vy = 1 + Math.random() * 1.5;
      this._add(flame, 1.8 + Math.random() * 0.6, (mesh, dt, t, e) => {
        mesh!.position.y += vy * dt;
        mesh!.scale.setScalar(Math.max(0.05, 1 - e.age / e.ttl));
        ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
      });
    }
    window.setTimeout(() => {
      if (this.disposed) return;
      const flash = new THREE.PointLight(new THREE.Color(meta.color), 10, 10);
      flash.position.set(p.x, p.y + 1, p.z);
      this._add(flash, 0.6, (mesh, dt, t, e) => { (mesh as THREE.PointLight).intensity = 10 * Math.max(0, 1 - e.age / e.ttl); });
      this._domImpact(ADMIN_EFFECTS.impact);
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2, el = Math.random() * Math.PI * 0.5;
        const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.16), new THREE.MeshStandardMaterial({ color: '#ffdd88', emissive: '#ffdd88', emissiveIntensity: 4, side: THREE.DoubleSide, transparent: true }));
        feather.position.set(p.x, p.y + 1, p.z);
        const vx = Math.cos(a) * Math.sin(el) * 2.2, vz = Math.sin(a) * Math.sin(el) * 2.2, vy = Math.cos(el) * 2 + 1;
        this._add(feather, 1.4, (mesh, dt, t, e) => {
          mesh!.position.x += vx * dt; mesh!.position.z += vz * dt;
          mesh!.position.y += (vy - 3 * e.age) * dt;
          mesh!.rotation.z += dt * 3;
          ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - e.age / e.ttl);
        });
      }
    }, 1500);
  }

  private _buildStarfall(meta: AdminEffectMeta) {
    const p = this.getTarget();
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, dist = 4 + Math.random() * 2;
      const startX = p.x + Math.cos(a) * dist, startZ = p.z + Math.sin(a) * dist, startY = 3 + Math.random() * 2;
      const star = new THREE.Mesh(this.sharedGeo, this._particleMat(meta.color, 7));
      star.scale.setScalar(0.05 + Math.random() * 0.04);
      star.position.set(startX, startY, startZ);
      star.visible = false;
      const delay = Math.random() * 1.2;
      this._add(star, 2.4 + delay, (mesh, dt, t, e) => {
        if (e.age < delay) return;
        mesh!.visible = true;
        const k = Math.min(1, (e.age - delay) / (e.ttl - delay) * 1.3);
        mesh!.position.set(startX + (p.x - startX) * k, startY + (0.1 - startY) * k, startZ + (p.z - startZ) * k);
        if (k >= 1 && !(e as any)._land) { (e as any)._land = true; this._spawnImpactSparks(p.x, p.z, meta.color); }
      });
    }
    window.setTimeout(() => { if (!this.disposed) this._domImpact(ADMIN_EFFECTS.impact); }, 1600);
  }

  // ═════════════════════════════════════════════════════════
  //  EFFETS ÉCRAN (DOM)
  // ═════════════════════════════════════════════════════════

  private _domImpact(meta: AdminEffectMeta) {
    const canvasEl = this.renderer.domElement;
    const original = canvasEl.style.transform;
    const originalFilter = canvasEl.style.filter;
    this._add(null, meta.duration / 1000, (_m, dt, t, e) => {
      const k = e.age / e.ttl;
      const env = Math.sin(k * Math.PI) * (1 - k);
      canvasEl.style.transform = `scale(${1 + env * 0.035}) translate(${Math.sin(t * 60) * env * 6}px, ${Math.cos(t * 55) * env * 4}px)`;
      canvasEl.style.filter = `brightness(${1 + env * 0.7})`;
    }, () => { canvasEl.style.transform = original; canvasEl.style.filter = originalFilter; });
  }

  private _domChromaticPulse(meta: AdminEffectMeta) {
    this._ensureChromaFilter();
    const canvasEl = this.renderer.domElement;
    const original = canvasEl.style.filter;
    this._add(null, meta.duration / 1000, (_m, dt, t, e) => {
      const k = e.age / e.ttl;
      const env = Math.sin(k * Math.PI);
      const offsets = this.chromaFilter!.querySelectorAll('feOffset');
      offsets.forEach((off, i) => off.setAttribute('dx', String((i === 0 ? -1 : 1) * env * 10)));
      canvasEl.style.filter = `url(#ae-chroma-filter) saturate(${1 + env * 0.6})`;
    }, () => { canvasEl.style.filter = original; });
  }

  private _domSlowMotion(meta: AdminEffectMeta) {
    const overlay = this._ensureOverlay();
    const vignette = document.createElement('div');
    Object.assign(vignette.style, {
      position: 'absolute', inset: '0',
      background: `radial-gradient(circle at 50% 50%, transparent 35%, ${meta.color}22 100%)`,
      mixBlendMode: 'screen', opacity: '0',
    } as CSSStyleDeclaration);
    overlay.appendChild(vignette);
    const canvasEl = this.renderer.domElement;
    const originalFilter = canvasEl.style.filter;
    this._add(null, meta.duration / 1000, (_m, dt, t, e) => {
      const k = e.age / e.ttl;
      const env = k < 0.15 ? k / 0.15 : k > 0.85 ? Math.max(0, 1 - (k - 0.85) / 0.15) : 1;
      vignette.style.opacity = String(env * 0.55);
      canvasEl.style.filter = `saturate(${1 - env * 0.35}) contrast(${1 + env * 0.05})`;
    }, () => { canvasEl.style.filter = originalFilter; }, vignette);
  }

  private _domGlassShatter(meta: AdminEffectMeta) {
    const overlay = this._ensureOverlay();
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', opacity: '0' } as CSSStyleDeclaration);
    const cx = 50 + (Math.random() - 0.5) * 20, cy = 50 + (Math.random() - 0.5) * 20;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const len = 25 + Math.random() * 35;
      const x2 = cx + Math.cos(a) * len, y2 = cy + Math.sin(a) * len;
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(cx)); line.setAttribute('y1', String(cy));
      line.setAttribute('x2', String(x2)); line.setAttribute('y2', String(y2));
      line.setAttribute('stroke', meta.color); line.setAttribute('stroke-width', '0.35');
      line.setAttribute('opacity', '0.85');
      svg.appendChild(line);
    }
    overlay.appendChild(svg);
    this._add(null, meta.duration / 1000, (_m, dt, t, e) => {
      const k = e.age / e.ttl;
      const env = k < 0.1 ? k / 0.1 : k > 0.6 ? Math.max(0, 1 - (k - 0.6) / 0.4) : 1;
      svg.style.opacity = String(env);
    }, undefined, svg as unknown as HTMLElement);
  }

  // ── Notif ────────────────────────────────────────────────

  private _notify(id: AdminEffectId | null) {
    this.listeners.forEach(fn => fn(id));
  }
}