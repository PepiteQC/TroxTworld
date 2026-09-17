/**
 * ═══════════════════════════════════════════════════════════
 * 🌨️ SYSTÈME DE DÉNEIGEMENT MTQ + PRIVÉ — COMTÉ DE PORTNEUF
 * Chasse-neige, saleuses, souffleuses, niveleuses sur la 138,
 * l'A-40 et les rangs. Style GTA RP hivernal québécois.
 * ═══════════════════════════════════════════════════════════
 */
import * as THREE from "three";
import { buildCamion, buildDeplaceige } from "./architecture";
import { matLib } from "./materials";
import { getTerrainHeight, ROADS } from "./worlddata";
import { sampleRoad } from "./roads";
import { quebecSeasons, type QuebecWeatherState } from "./seasons";

// ═══════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════

function approxLength(pts: Array<[number, number]>) {
  let n = 0;
  for (let i = 1; i < pts.length; i++)
    n += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return n;
}

function box(
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: number, rough = 0.6, metal = 0.3,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(color, rough, metal));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ═══════════════════════════════════════════════════════════
// 🟠 CAMION CHARRUE MTQ MACK (Lame frontale + Aile latérale)
// ═══════════════════════════════════════════════════════════

function buildMtqMack(): THREE.Group {
  const g = buildCamion(0xd45a12);
  g.name = "mtq-charrue-mack";

  // ── Lame frontale principale (V-plow) ──
  const bladeMat = matLib.get(0xc4a030, 0.35, 0.45);
  const bladeL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.18), bladeMat);
  bladeL.position.set(-0.75, 0.85, 3.55);
  bladeL.rotation.set(-0.32, 0.15, 0);
  bladeL.castShadow = true;
  g.add(bladeL);

  const bladeR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.18), bladeMat);
  bladeR.position.set(0.75, 0.85, 3.55);
  bladeR.rotation.set(-0.32, -0.15, 0);
  bladeR.castShadow = true;
  g.add(bladeR);

  // Bordure en caoutchouc noir au bas de la lame
  const rubberEdge = box(3.2, 0.08, 0.22, 0, 0.42, 3.55, 0x1a1a1a, 0.9, 0.05);
  g.add(rubberEdge);

  // ── Aile latérale droite (déportable) ──
  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.12), bladeMat);
  wingBlade.position.set(2.2, 0.65, 0.5);
  wingBlade.rotation.set(-0.2, -0.4, 0.1);
  wingBlade.castShadow = true;
  g.add(wingBlade);

  // ── Trémie de sel/abrasif (arrière) ──
  const hopper = box(1.8, 1.2, 2.6, 0, 1.9, -0.6, 0x3a3e42, 0.55, 0.25);
  g.add(hopper);

  // Couvercle de la trémie
  const lid = box(1.85, 0.06, 2.65, 0, 2.52, -0.6, 0x2a2e32, 0.5, 0.3);
  g.add(lid);

  // ── Barre de gyrophares MTQ (orange/ambre) ──
  const lightBar = box(1.6, 0.12, 0.25, 0, 2.65, 1.2, 0x1a1a1a, 0.4, 0.5);
  g.add(lightBar);

  for (let i = 0; i < 6; i++) {
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8),
      matLib.getEmissive(0xc4a030, 0xffc14a, 1.2),
    );
    beacon.position.set(-0.6 + i * 0.24, 2.72, 1.2);
    beacon.userData.beacon = true;
    beacon.userData.beaconPhase = i * 0.8;
    g.add(beacon);
  }

  // ── Phares de travail LED (blancs) ──
  for (const sx of [-0.8, 0.8]) {
    const workLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.1, 0.08),
      matLib.getEmissive(0xffffff, 0xfff5e0, 1.5),
    );
    workLight.position.set(sx, 2.4, 2.1);
    workLight.userData.workLight = true;
    g.add(workLight);
  }

  // ── Bandes réfléchissantes MTQ ──
  const stripeMat = matLib.getEmissive(0xc4a030, 0xc4a030, 0.3);
  g.add(box(2.05, 0.06, 0.04, 0, 1.15, 2.05, 0x1a1c1e, 0.5));
  g.add(box(0.04, 0.6, 2.6, -0.92, 1.9, -0.6, 0xc4a030, 0.5, 0.2));
  g.add(box(0.04, 0.6, 2.6, 0.92, 1.9, -0.6, 0xc4a030, 0.5, 0.2));

  // ── Échappement vertical (stack) ──
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 1.2, 8),
    matLib.get(0x4a4e52, 0.4, 0.7),
  );
  stack.position.set(-0.85, 2.8, 0.8);
  g.add(stack);

  return g;
}

// ═══════════════════════════════════════════════════════════
// 🟡 SALEUSE ÉPANDEUSE MTQ (Sel + Abrasif)
// ═══════════════════════════════════════════════════════════

function buildSaleuse(): THREE.Group {
  const g = buildCamion(0x2a5a2a);
  g.name = "mtq-saleuse";

  // Grande trémie de sel
  const hopper = box(2.0, 1.5, 3.2, 0, 2.0, -0.3, 0x4a5a4a, 0.6, 0.2);
  g.add(hopper);

  // Cône d'épandage à l'arrière
  const spreader = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.6, 8),
    matLib.get(0x6a7a6a, 0.5, 0.3),
  );
  spreader.rotation.x = Math.PI;
  spreader.position.set(0, 1.0, -2.0);
  spreader.userData.spreader = true;
  g.add(spreader);

  // Gyrophares
  for (let i = 0; i < 4; i++) {
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8),
      matLib.getEmissive(0xc4a030, 0xffc14a, 1.0),
    );
    beacon.position.set(-0.45 + i * 0.3, 2.85, 1.0);
    beacon.userData.beacon = true;
    beacon.userData.beaconPhase = i * 1.2;
    g.add(beacon);
  }

  // Bandes jaunes
  g.add(box(0.04, 0.8, 3.2, -1.02, 2.0, -0.3, 0xc4a030, 0.5, 0.2));
  g.add(box(0.04, 0.8, 3.2, 1.02, 2.0, -0.3, 0xc4a030, 0.5, 0.2));

  return g;
}

// ═══════════════════════════════════════════════════════════
// 🔵 SOUFFLEUSE À NEIGE (Turbine + Éjection latérale)
// ═══════════════════════════════════════════════════════════

function buildSouffleuse(): THREE.Group {
  const g = buildCamion(0x1a3a6a);
  g.name = "mtq-souffleuse";

  // Boîtier de la souffleuse à l'avant
  const blowerHousing = box(2.4, 1.8, 1.5, 0, 1.2, 3.2, 0x2a4a7a, 0.5, 0.3);
  g.add(blowerHousing);

  // Turbine visible (cylindre rotatif)
  const turbine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 1.8, 12),
    matLib.get(0x5a6a7a, 0.3, 0.7),
  );
  turbine.rotation.z = Math.PI / 2;
  turbine.position.set(0, 1.2, 3.8);
  turbine.userData.turbine = true;
  g.add(turbine);

  // Goulotte d'éjection latérale
  const chute = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.35, 2.0, 8),
    matLib.get(0x3a4a5a, 0.5, 0.3),
  );
  chute.rotation.z = Math.PI / 4;
  chute.position.set(1.8, 2.2, 3.2);
  chute.userData.chute = true;
  g.add(chute);

  // Gyrophares
  for (let i = 0; i < 4; i++) {
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8),
      matLib.getEmissive(0x2060ff, 0x4080ff, 1.2),
    );
    beacon.position.set(-0.45 + i * 0.3, 2.65, 1.0);
    beacon.userData.beacon = true;
    beacon.userData.beaconPhase = i * 0.9;
    g.add(beacon);
  }

  return g;
}

// ═══════════════════════════════════════════════════════════
// 🟤 NIVELEUSE (GRADER) POUR RANGS SECONDAIRES
// ═══════════════════════════════════════════════════════════

function buildNiveleuse(): THREE.Group {
  const g = new THREE.Group();
  g.name = "niveleuse-rang";

  // Châssis long
  g.add(box(0.9, 0.5, 5.5, 0, 0.8, 0, 0xd4a030, 0.5, 0.3));

  // Cabine
  g.add(box(1.1, 1.0, 1.4, 0, 1.6, -0.8, 0x2a2e32, 0.4, 0.3));

  // Vitres
  const glassMat = matLib.get(0x80b0d0, 0.1, 0.2);
  g.add(box(1.05, 0.6, 0.02, 0, 1.7, -0.1, 0x80b0d0, 0.1, 0.2));

  // Lame centrale (grader blade)
  const blade = box(3.5, 0.6, 0.12, 0, 0.5, 0.8, 0x8a9098, 0.3, 0.7);
  blade.rotation.y = 0.25;
  g.add(blade);

  // Roues (6 roues)
  const wheelMat = matLib.get(0x1a1a1a, 0.9, 0.05);
  for (const [wx, wz] of [[-0.6, 1.8], [0.6, 1.8], [-0.6, -1.5], [0.6, -1.5], [-0.6, -2.2], [0.6, -2.2]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.4, wz);
    g.add(wheel);
  }

  // Gyrophare
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8),
    matLib.getEmissive(0xc4a030, 0xffc14a, 1.0),
  );
  beacon.position.set(0, 2.2, -0.8);
  beacon.userData.beacon = true;
  beacon.userData.beaconPhase = 0;
  g.add(beacon);

  return g;
}

// ═══════════════════════════════════════════════════════════
// PARTICULES DE NEIGE & SEL
// ═══════════════════════════════════════════════════════════

class ParticleCloud {
  particles: THREE.Mesh[] = [];
  group: THREE.Group;
  private velocities: Array<{ vx: number; vy: number; vz: number; life: number }> = [];

  constructor(count: number, color: number, size: number, opacity: number) {
    this.group = new THREE.Group();
    this.group.name = "particle-cloud";
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const geo = new THREE.SphereGeometry(size, 4, 3);

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat.clone());
      p.visible = false;
      this.group.add(p);
      this.particles.push(p);
      this.velocities.push({ vx: 0, vy: 0, vz: 0, life: 0 });
    }
  }

  emit(origin: THREE.Vector3, direction: THREE.Vector3, spread: number, speed: number, count: number) {
    let emitted = 0;
    for (let i = 0; i < this.particles.length && emitted < count; i++) {
      if (!this.particles[i]!.visible) {
        const p = this.particles[i]!;
        const v = this.velocities[i]!;
        p.position.copy(origin);
        p.position.x += (Math.random() - 0.5) * spread;
        p.position.y += Math.random() * spread * 0.5;
        p.position.z += (Math.random() - 0.5) * spread;
        p.visible = true;
        (p.material as THREE.MeshBasicMaterial).opacity = 0.7;
        v.vx = direction.x * speed + (Math.random() - 0.5) * speed * 0.5;
        v.vy = Math.random() * speed * 0.8 + 0.5;
        v.vz = direction.z * speed + (Math.random() - 0.5) * speed * 0.5;
        v.life = 1.0 + Math.random() * 1.5;
        emitted++;
      }
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]!;
      const v = this.velocities[i]!;
      if (!p.visible) continue;

      v.life -= dt;
      if (v.life <= 0) {
        p.visible = false;
        continue;
      }

      p.position.x += v.vx * dt;
      p.position.y += v.vy * dt;
      p.position.z += v.vz * dt;
      v.vy -= 2.5 * dt; // Gravité

      const mat = p.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, v.life * 0.5);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════

type PlowKind = "charrue" | "saleuse" | "souffleuse" | "niveleuse" | "gratte_privee";

interface PlowRig {
  id: string;
  kind: PlowKind;
  mesh: THREE.Group;
  t: number;
  dir: 1 | -1;
  offset: number;
  speed: number;
  baseSpeed: number;
  beacons: THREE.Mesh[];
  workLights: THREE.Mesh[];
  roadId: string;
  hornCooldown: number;
  cleanRadius: number;
  cleanAmount: number;
}

// ═══════════════════════════════════════════════════════════
// 🌨️ SYSTÈME PRINCIPAL DE DÉNEIGEMENT
// ═══════════════════════════════════════════════════════════

export class SnowPlowField {
  group = new THREE.Group();
  private rigs: PlowRig[] = [];
  private roadLen = 1;
  private road = ROADS.find((r) => r.id === "r138") ?? ROADS[0]!;
  private a40 = ROADS.find((r) => r.id === "a40");

  // Particules
  private snowParticles: ParticleCloud;
  private saltParticles: ParticleCloud;
  private emitTimer = 0;

  // Audio CB (simulation textuelle)
  cbMessages: string[] = [];
  private cbCooldown = 0;

  constructor() {
    this.group.name = "snow-plows";
    this.roadLen = Math.max(1, approxLength(this.road.points));

    // Initialiser les systèmes de particules
    this.snowParticles = new ParticleCloud(80, 0xe8f0ff, 0.12, 0.6);
    this.saltParticles = new ParticleCloud(40, 0x8a7a6a, 0.06, 0.5);
    this.group.add(this.snowParticles.group);
    this.group.add(this.saltParticles.group);

    // ── FLOTTE DE DÉNEIGEMENT MTQ ──

    // 138 — Charrue principale
    this.spawn("mtq_charrue_138_1", "charrue", buildMtqMack(), 0.12, 1, 3.4, 16, "r138");
    this.spawn("mtq_charrue_138_2", "charrue", buildMtqMack(), 0.58, -1, -3.1, 14, "r138");

    // 138 — Saleuse
    this.spawn("mtq_saleuse_138", "saleuse", buildSaleuse(), 0.35, 1, 2.0, 12, "r138");

    // 138 — Souffleuse (déclenchée en blizzard)
    this.spawn("mtq_souffleuse_138", "souffleuse", buildSouffleuse(), 0.78, 1, 0, 10, "r138");

    // Gratte privée Ford
    this.spawn("prive_gratte_ford", "gratte_privee", buildDeplaceige(), 0.62, -1, -3.1, 13, "r138");

    // Niveleuse pour les rangs
    this.spawn("niveleuse_rang_1", "niveleuse", buildNiveleuse(), 0.25, 1, 0, 8, "r138");
  }

  tick(dt: number, elapsed: number, wx: QuebecWeatherState, player?: THREE.Vector3) {
    const anyActive = wx.plows.some((p) => p.active)
      || wx.snowPlowStatus === "en_cours"
      || wx.snowPlowStatus === "alerte_blizzard";
    const heavySnow = wx.snowAccumulationCm > 4;

    this.group.visible = anyActive || heavySnow;
    if (!this.group.visible) return;

    // Mise à jour des particules
    this.snowParticles.update(dt);
    this.saltParticles.update(dt);
    this.emitTimer += dt;

    // Cooldown CB radio
    if (this.cbCooldown > 0) this.cbCooldown -= dt;

    for (const rig of this.rigs) {
      const spec = wx.plows.find((p) => p.id === rig.id);
      const active = spec?.active ?? false;

      // Visibilité selon le type et les conditions
      const shouldShow = active
        || (heavySnow && (rig.kind === "charrue" || rig.kind === "saleuse"))
        || (wx.snowAccumulationCm > 12 && rig.kind === "souffleuse");
      rig.mesh.visible = shouldShow;
      if (!rig.mesh.visible) continue;

      // ── VITESSE ADAPTATIVE ──
      const speedMul = active ? 1.0 : 0.4;
      const curveSlowdown = this.getCurveFactor(rig);
      rig.speed = rig.baseSpeed * speedMul * curveSlowdown;

      // ── MOUVEMENT SUR LA ROUTE ──
      const road = this.getRoad(rig.roadId);
      const roadLen = Math.max(1, approxLength(road.points));
      rig.t += (rig.dir * rig.speed * dt) / roadLen;

      // Demi-tour en bout de route
      if (rig.t > 0.98) { rig.t = 0.98; rig.dir = -1 as const; }
      if (rig.t < 0.02) { rig.t = 0.02; rig.dir = 1 as const; }

      const s = sampleRoad(road, rig.t);
      const x = s.x + -s.tz * rig.offset;
      const z = s.z + s.tx * rig.offset;
      const y = getTerrainHeight(x, z) + 0.38;
      rig.mesh.position.set(x, y, z);

      // Orientation
      const lookT = Math.max(0, Math.min(1, rig.t + rig.dir * 0.01));
      const look = sampleRoad(road, lookT);
      rig.mesh.lookAt(
        look.x + -look.tz * rig.offset,
        y,
        look.z + look.tx * rig.offset,
      );

      // ── GYROPHARES PULSÉS ──
      for (const b of rig.beacons) {
        const mat = b.material as THREE.MeshStandardMaterial;
        const phase = (b.userData.beaconPhase as number) ?? 0;
        if (mat.emissive) {
          if (active) {
            // Pulsation réaliste alternée
            const pulse = 0.4 + Math.abs(Math.sin(elapsed * 6 + phase)) * 1.4;
            mat.emissiveIntensity = pulse;
          } else {
            mat.emissiveIntensity = 0.15 + Math.sin(elapsed * 2 + phase) * 0.1;
          }
        }
      }

      // ── PHARES DE TRAVAIL ──
      for (const wl of rig.workLights) {
        const mat = wl.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissiveIntensity = active ? 1.5 : 0.3;
        }
      }

      // ── PARTICULES DE NEIGE (Charrue / Souffleuse) ──
      if (active && this.emitTimer > 0.08 && (rig.kind === "charrue" || rig.kind === "souffleuse")) {
        const dir3 = new THREE.Vector3(-s.tz * rig.dir, 0, s.tx * rig.dir);
        const origin = new THREE.Vector3(x, y + 0.5, z);
        this.snowParticles.emit(origin, dir3, 2.5, 4.0, rig.kind === "souffleuse" ? 8 : 4);
      }

      // ── PARTICULES DE SEL (Saleuse) ──
      if (active && rig.kind === "saleuse" && this.emitTimer > 0.12) {
        const origin = new THREE.Vector3(x, y + 1.0, z);
        const down = new THREE.Vector3(0, -1, 0);
        this.saltParticles.emit(origin, down, 1.8, 2.0, 3);
      }

      // ── NETTOYAGE DE LA ROUTE ──
      if (active && player) {
        quebecSeasons.runPlowOperation(rig.id, dt * rig.cleanAmount);
      }

      // ── KLAXON D'AVERTISSEMENT ──
      if (player && active && rig.hornCooldown <= 0) {
        const d = Math.hypot(player.x - x, player.z - z);
        if (d < 6.0 && d > 2.0) {
          rig.hornCooldown = 8;
          this.addCbMessage(`📻 [${rig.id}] ATTENTION — Véhicule civil à ${Math.round(d)}m, je klaxonne !`);
        }
      }
      if (rig.hornCooldown > 0) rig.hornCooldown -= dt;
    }

    // Reset du timer d'émission
    if (this.emitTimer > 0.15) this.emitTimer = 0;
  }

  nearest(x: number, z: number) {
    let best: { id: string; x: number; z: number; d: number; kind: PlowKind } | null = null;
    for (const rig of this.rigs) {
      if (!rig.mesh.visible) continue;
      const d = Math.hypot(rig.mesh.position.x - x, rig.mesh.position.z - z);
      if (!best || d < best.d) {
        best = { id: rig.id, x: rig.mesh.position.x, z: rig.mesh.position.z, d, kind: rig.kind };
      }
    }
    return best;
  }

  /**
   * Retourne les derniers messages radio CB des opérateurs
   */
  getCbMessages(): string[] {
    return this.cbMessages.slice(-5);
  }

  // ── MÉTHODES PRIVÉES ──

  private getRoad(id: string) {
    if (id === "a40" && this.a40) return this.a40;
    return this.road;
  }

  private getCurveFactor(rig: PlowRig): number {
    const road = this.getRoad(rig.roadId);
    const t1 = Math.max(0, rig.t - 0.02);
    const t2 = Math.min(1, rig.t + 0.02);
    const s1 = sampleRoad(road, t1);
    const s2 = sampleRoad(road, t2);
    const angle = Math.abs(Math.atan2(s2.tz, s2.tx) - Math.atan2(s1.tz, s1.tx));
    // Ralentir dans les courbes serrées
    return angle > 0.3 ? 0.6 : angle > 0.15 ? 0.8 : 1.0;
  }

  private addCbMessage(msg: string) {
    if (this.cbCooldown > 0) return;
    this.cbMessages.push(msg);
    if (this.cbMessages.length > 20) this.cbMessages.shift();
    this.cbCooldown = 5;
  }

  private spawn(
    id: string,
    kind: PlowKind,
    mesh: THREE.Group,
    t: number,
    dir: 1 | -1,
    offset: number,
    speed: number,
    roadId: string,
  ) {
    const road = this.getRoad(roadId);
    const s = sampleRoad(road, t);
    mesh.position.set(s.x, getTerrainHeight(s.x, s.z) + 0.38, s.z);
    this.group.add(mesh);

    const beacons: THREE.Mesh[] = [];
    const workLights: THREE.Mesh[] = [];
    mesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        if (o.userData.beacon) beacons.push(o);
        if (o.userData.workLight) workLights.push(o);
      }
    });

    const cleanAmount = kind === "charrue" ? 0.4
      : kind === "saleuse" ? 0.25
      : kind === "souffleuse" ? 0.6
      : kind === "niveleuse" ? 0.35
      : 0.2;

    this.rigs.push({
      id, kind, mesh, t, dir, offset, speed,
      baseSpeed: speed,
      beacons, workLights, roadId,
      hornCooldown: 0,
      cleanRadius: kind === "souffleuse" ? 6 : 4,
      cleanAmount,
    });
  }
}