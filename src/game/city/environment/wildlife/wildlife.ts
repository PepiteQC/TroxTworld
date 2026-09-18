import * as THREE from "three";
import { matLib } from "./materials";
import { getTerrainHeight } from "./worlddata";
import { worldConfig } from "./worldconfig";
import { loadFbx, tickMixer } from "./fbx";

// ═══════════════════════════════════════════════════════════
// TYPES ET INTERFACES ÉTENDUS
// ═══════════════════════════════════════════════════════════

export type FaunaKind =
  | "moose" | "wolf" | "bear" | "fox" | "beaver" | "deer"
  | "caribou" | "hare" | "squirrel" | "raccoon" | "goose"
  | "loon" | "heron" | "eagle" | "lynx" | "coyote"
  | "skunk" | "walleye" | "bass";

export type FaunaState =
  | "idle" | "graze" | "roam" | "flee" | "stalk" | "chase"
  | "stampede" | "dam" | "hibernate" | "sleep" | "drink"
  | "hunt" | "fly" | "swim" | "climb" | "wounded" | "dead";

export type Season = "printemps" | "ete" | "automne" | "hiver";
export type TimeOfDay = "aube" | "jour" | "crepuscule" | "nuit";

export interface Fauna {
  id: string;
  kind: FaunaKind;
  name: string;
  mesh: THREE.Group;
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  y: number;
  yaw: number;
  speed: number;
  state: FaunaState;
  detect: number;
  harvested: boolean;
  respawnIn: number;

  health: number;
  maxHealth: number;
  wounded: boolean;
  bloodTrail: BloodDrop[];
  protected: boolean;
  ageDays: number;
  gender: "male" | "female";
  packId?: string;
  fleeDirection?: number;
  lastAttackedBy?: string;
  soundCooldown: number;

  // 🆕 v2
  /** Timestamp prochaine vocalisation */
  nextVocalAt: number;
  /** En hibernation profonde */
  isHibernating: boolean;
  /** Timestamp dernière reproduction */
  lastMatedAt: number;
  /** Nombre de petits */
  offspring: number;
  /** Zone d'habitat (rayon) */
  homeRadius: number;
  /** LOD level (0=high, 1=mid, 2=low) */
  lodLevel: 0 | 1 | 2;
}

export interface BloodDrop {
  x: number;
  z: number;
  age: number;
}

export interface HarvestLoot {
  id: string;
  quantity: number;
  quality?: "commune" | "bonne" | "excellente" | "trophee";
}

export interface HarvestResult {
  name: string;
  kind: FaunaKind;
  items: HarvestLoot[];
  legality: "legal" | "illegal" | "protege";
  mffpFine?: number;
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — CONFIG
// ═══════════════════════════════════════════════════════════

export interface WildlifeConfig {
  /** Seed pour RNG déterministe */
  seed: number;
  /** Distance de rendu max (unités) */
  renderDistance: number;
  /** Distance LOD mid */
  lodMidDistance: number;
  /** Distance LOD low */
  lodLowDistance: number;
  /** Nombre max de traces de sang par animal */
  maxBloodTrail: number;
  /** Durée de vie des traces (secondes) */
  bloodTrailLifetime: number;
  /** Reset auto du compteur de braconnage (secondes) */
  poachingResetSeconds: number;
  /** Activer la reproduction */
  reproductionEnabled: boolean;
  /** Activer le pathfinding basique (éviter obstacles) */
  pathfindingEnabled: boolean;
  /** Callback vérification obstacle (x, z) → bool */
  obstacleCheck?: (x: number, z: number) => boolean;
  /** Multiplicateur de vitesse global */
  speedMultiplier: number;
  /** Activer les animations FBX */
  animationsEnabled: boolean;
  /** Fréquence update complet (Hz). Les frames intermédiaires ne font que bouger. */
  fullUpdateHz: number;
}

const DEFAULT_CONFIG: WildlifeConfig = {
  seed: 42,
  renderDistance: 200,
  lodMidDistance: 60,
  lodLowDistance: 120,
  maxBloodTrail: 24,
  bloodTrailLifetime: 120,
  poachingResetSeconds: 300,
  reproductionEnabled: true,
  pathfindingEnabled: false,
  speedMultiplier: 1.0,
  animationsEnabled: true,
  fullUpdateHz: 5,
};

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — SEEDED RNG
// ═══════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — EVENTS
// ═══════════════════════════════════════════════════════════

export type WildlifeEventType =
  | "wound"
  | "kill"
  | "flee"
  | "stampede"
  | "chase"
  | "harvest"
  | "respawn"
  | "vocalize"
  | "warn";

export interface WildlifeEvent {
  type: WildlifeEventType;
  fauna: Fauna;
  byPlayerId?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
// UTILITAIRES 3D (inchangés — v1 compat)
// ═══════════════════════════════════════════════════════════

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, rough = 0.95, metal = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(color, rough, metal));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r: number, x: number, y: number, z: number, color: number, rough = 0.9) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), matLib.get(color, rough));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ═══════════════════════════════════════════════════════════
// BUILDERS 3D (v1 compat — inchangés)
// ═══════════════════════════════════════════════════════════

export function buildMoose(): THREE.Group {
  const g = new THREE.Group();
  g.name = "orignal";
  g.add(box(0.95, 0.82, 2.05, 0, 1.22, 0, 0x5a3a24));
  g.add(box(0.55, 0.48, 0.7, 0, 1.55, -1.15, 0x4a3020));
  g.add(box(0.22, 0.38, 0.55, 0, 1.32, -1.55, 0x3a2418));
  g.add(sphere(0.04, -0.15, 1.6, -1.35, 0x1a1a1a));
  g.add(sphere(0.04, 0.15, 1.6, -1.35, 0x1a1a1a));
  g.add(box(0.08, 0.22, 0.06, 0, 1.15, -1.4, 0x2a1c14));
  const antler = matLib.get(0xc8b090, 0.75);
  for (const sx of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.24), antler);
    a.position.set(sx * 0.42, 1.95, -1.12);
    a.rotation.z = sx * 0.4;
    a.castShadow = true;
    g.add(a);
    for (let i = 0; i < 4; i++) {
      const tine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), antler);
      tine.position.set(sx * (0.55 + i * 0.1), 2.12, -1.12);
      tine.rotation.z = sx * (0.15 + i * 0.08);
      g.add(tine);
    }
  }
  for (const [lx, lz] of [[-0.32, 0.7], [0.32, 0.7], [-0.32, -0.7], [0.32, -0.7]]) {
    g.add(box(0.18, 0.9, 0.18, lx, 0.42, lz, 0x2a1c14));
    g.add(box(0.14, 0.08, 0.14, lx, 0.04, lz, 0x1a1210));
  }
  return g;
}

export function buildWolf(): THREE.Group {
  const g = new THREE.Group();
  g.name = "loup";
  g.add(box(0.42, 0.38, 0.95, 0, 0.62, 0, 0x6a6a68));
  g.add(box(0.28, 0.26, 0.32, 0, 0.78, -0.55, 0x5a5a58));
  g.add(box(0.12, 0.12, 0.38, 0, 0.58, 0.62, 0x4a4a48));
  g.add(box(0.08, 0.16, 0.08, -0.08, 0.96, -0.58, 0x3a3a38));
  g.add(box(0.08, 0.16, 0.08, 0.08, 0.96, -0.58, 0x3a3a38));
  g.add(sphere(0.025, -0.08, 0.82, -0.68, 0xf5c518));
  g.add(sphere(0.025, 0.08, 0.82, -0.68, 0xf5c518));
  g.add(box(0.06, 0.04, 0.08, 0, 0.75, -0.72, 0x1a1210));
  for (const [lx, lz] of [[-0.14, 0.28], [0.14, 0.28], [-0.14, -0.28], [0.14, -0.28]]) {
    g.add(box(0.09, 0.42, 0.09, lx, 0.22, lz, 0x3a3a38));
  }
  return g;
}

function buildBear(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ours";
  g.add(box(1.15, 0.95, 1.85, 0, 1.05, 0, 0x1a1816));
  g.add(box(0.62, 0.52, 0.7, 0, 1.28, -1.05, 0x141210));
  g.add(box(0.38, 0.28, 0.42, 0, 1.12, -1.42, 0x5a3a22));
  g.add(box(0.18, 0.18, 0.18, -0.28, 1.58, -1.05, 0x1a1816));
  g.add(box(0.18, 0.18, 0.18, 0.28, 1.58, -1.05, 0x1a1816));
  g.add(sphere(0.04, -0.14, 1.35, -1.4, 0x8a6030));
  g.add(sphere(0.04, 0.14, 1.35, -1.4, 0x8a6030));
  g.add(box(0.08, 0.05, 0.1, 0, 1.15, -1.55, 0x0a0808));
  for (const [lx, lz] of [[-0.38, 0.55], [0.38, 0.55], [-0.38, -0.55], [0.38, -0.55]]) {
    g.add(box(0.24, 0.75, 0.24, lx, 0.38, lz, 0x12100e));
    g.add(box(0.28, 0.06, 0.32, lx, 0.03, lz, 0x080604));
  }

  // 🆕 FIX : on capture la référence au groupe original
  const fallbackGroup = g;
  void loadFbx("bear").then((rig) => {
    // 🆕 FIX : on remplace les enfants UNIQUEMENT si le groupe est toujours dans la scène
    if (!fallbackGroup.parent) return;
    while (fallbackGroup.children.length) {
      const child = fallbackGroup.children[0];
      if (child) fallbackGroup.remove(child);
    }
    fallbackGroup.add(rig);
    fallbackGroup.userData.mixer = rig.userData.mixer;
  }).catch(() => { /* fallback silencieux conservé */ });

  return g;
}

function buildFox(): THREE.Group {
  const g = new THREE.Group();
  g.name = "renard";
  g.add(box(0.32, 0.28, 0.72, 0, 0.42, 0, 0xd85820));
  g.add(box(0.22, 0.22, 0.28, 0, 0.55, -0.42, 0xc84010));
  g.add(box(0.12, 0.1, 0.22, 0, 0.48, -0.62, 0xf8f0e0));
  g.add(sphere(0.02, -0.05, 0.6, -0.68, 0x1a1a1a));
  g.add(sphere(0.02, 0.05, 0.6, -0.68, 0x1a1a1a));
  g.add(box(0.08, 0.16, 0.06, -0.1, 0.72, -0.42, 0x1a1a1a));
  g.add(box(0.08, 0.16, 0.06, 0.1, 0.72, -0.42, 0x1a1a1a));
  g.add(box(0.1, 0.12, 0.55, 0, 0.42, 0.55, 0xd85820));
  g.add(box(0.12, 0.14, 0.18, 0, 0.4, 0.85, 0xffffff));
  for (const [lx, lz] of [[-0.1, 0.22], [0.1, 0.22], [-0.1, -0.22], [0.1, -0.22]]) {
    g.add(box(0.07, 0.35, 0.07, lx, 0.17, lz, 0x1a1a1a));
  }
  return g;
}

function buildBeaver(): THREE.Group {
  const g = new THREE.Group();
  g.name = "castor";
  g.add(box(0.38, 0.28, 0.62, 0, 0.32, 0, 0x4a3424));
  g.add(box(0.28, 0.22, 0.28, 0, 0.38, -0.38, 0x3a281c));
  g.add(box(0.22, 0.04, 0.42, 0, 0.18, 0.48, 0x2a1c14));
  g.add(box(0.04, 0.08, 0.04, -0.04, 0.42, -0.55, 0xffffff));
  g.add(box(0.04, 0.08, 0.04, 0.04, 0.42, -0.55, 0xffffff));
  for (const [lx, lz] of [[-0.12, 0.16], [0.12, 0.16], [-0.12, -0.16], [0.12, -0.16]]) {
    g.add(box(0.07, 0.2, 0.1, lx, 0.12, lz, 0x2a1c14));
  }
  return g;
}

function buildDeer(): THREE.Group {
  const g = new THREE.Group();
  g.name = "cerf";
  g.add(box(0.55, 0.55, 1.35, 0, 0.85, 0, 0xa87848));
  g.add(box(0.35, 0.32, 0.42, 0, 1.1, -0.75, 0x8a5a30));
  g.add(box(0.18, 0.22, 0.32, 0, 0.98, -1.05, 0x8a5a30));
  g.add(box(0.55, 0.35, 1.35, 0, 0.65, 0, 0xf5deb3));
  const antler = matLib.get(0xc8b090, 0.7);
  for (const sx of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 6), antler);
    a.position.set(sx * 0.1, 1.35, -1.0);
    g.add(a);
    for (let i = 0; i < 3; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.15, 6), antler);
      branch.position.set(sx * (0.15 + i * 0.05), 1.4 + i * 0.08, -1.0);
      branch.rotation.z = sx * 0.4;
      g.add(branch);
    }
  }
  for (const [lx, lz] of [[-0.18, 0.45], [0.18, 0.45], [-0.18, -0.45], [0.18, -0.45]]) {
    g.add(box(0.08, 0.62, 0.08, lx, 0.31, lz, 0x2a1c14));
  }
  g.add(box(0.1, 0.15, 0.1, 0, 1.05, 0.75, 0xffffff));
  return g;
}

function buildCaribou(): THREE.Group {
  const g = new THREE.Group();
  g.name = "caribou";
  g.add(box(0.75, 0.7, 1.65, 0, 1.05, 0, 0x6a5040));
  g.add(box(0.45, 0.4, 0.55, 0, 1.32, -0.9, 0x8a6a4a));
  g.add(box(0.22, 0.28, 0.42, 0, 1.15, -1.25, 0x5a4030));
  const antler = matLib.get(0xd8c0a0, 0.7);
  for (const sx of [-1, 1]) {
    const shovel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.05), antler);
    shovel.position.set(sx * 0.3, 1.75, -1.1);
    shovel.rotation.z = sx * 0.3;
    g.add(shovel);
  }
  for (const [lx, lz] of [[-0.28, 0.58], [0.28, 0.58], [-0.28, -0.58], [0.28, -0.58]]) {
    g.add(box(0.13, 0.72, 0.13, lx, 0.36, lz, 0x3a2818));
  }
  return g;
}

function buildHare(): THREE.Group {
  const g = new THREE.Group();
  g.name = "lievre";
  g.add(box(0.24, 0.2, 0.42, 0, 0.22, 0, 0xa89078));
  g.add(box(0.16, 0.15, 0.2, 0, 0.32, -0.24, 0x8a7860));
  g.add(box(0.05, 0.28, 0.03, -0.06, 0.48, -0.22, 0xa89078));
  g.add(box(0.05, 0.28, 0.03, 0.06, 0.48, -0.22, 0xa89078));
  g.add(sphere(0.02, -0.05, 0.35, -0.32, 0x1a1a1a));
  g.add(sphere(0.02, 0.05, 0.35, -0.32, 0x1a1a1a));
  g.add(box(0.08, 0.08, 0.06, 0, 0.16, 0.24, 0xffffff));
  for (const [lx, lz] of [[-0.08, 0.12], [0.08, 0.12], [-0.09, -0.14], [0.09, -0.14]]) {
    g.add(box(0.05, 0.14, 0.08, lx, 0.09, lz, 0x8a7860));
  }
  return g;
}

function buildSquirrel(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ecureuil";
  g.add(box(0.14, 0.12, 0.22, 0, 0.15, 0, 0xd85820));
  g.add(sphere(0.06, 0, 0.22, -0.11, 0xc84010));
  g.add(box(0.08, 0.35, 0.1, 0, 0.28, 0.15, 0xd85820));
  g.add(sphere(0.015, -0.03, 0.25, -0.15, 0x1a1a1a));
  g.add(sphere(0.015, 0.03, 0.25, -0.15, 0x1a1a1a));
  for (const [lx, lz] of [[-0.05, 0.06], [0.05, 0.06], [-0.05, -0.06], [0.05, -0.06]]) {
    g.add(box(0.03, 0.08, 0.03, lx, 0.07, lz, 0x8a3810));
  }
  return g;
}

function buildRaccoon(): THREE.Group {
  const g = new THREE.Group();
  g.name = "raton_laveur";
  g.add(box(0.32, 0.28, 0.55, 0, 0.32, 0, 0x6a6060));
  g.add(sphere(0.15, 0, 0.42, -0.32, 0x8a7878));
  g.add(box(0.24, 0.08, 0.05, 0, 0.42, -0.45, 0x0a0a0a));
  g.add(sphere(0.02, -0.06, 0.42, -0.45, 0xffe000));
  g.add(sphere(0.02, 0.06, 0.42, -0.45, 0xffe000));
  for (let i = 0; i < 4; i++) {
    g.add(box(0.09, 0.09, 0.09, 0, 0.35 - i * 0.02, 0.35 + i * 0.08, i % 2 === 0 ? 0x1a1a1a : 0x8a7878));
  }
  for (const [lx, lz] of [[-0.12, 0.18], [0.12, 0.18], [-0.12, -0.18], [0.12, -0.18]]) {
    g.add(box(0.07, 0.24, 0.07, lx, 0.14, lz, 0x2a2020));
  }
  return g;
}

function buildGoose(): THREE.Group {
  const g = new THREE.Group();
  g.name = "bernache";
  g.add(box(0.35, 0.28, 0.65, 0, 0.4, 0, 0x5a4a3a));
  g.add(box(0.08, 0.35, 0.08, 0, 0.65, -0.32, 0x0a0a0a));
  g.add(sphere(0.08, 0, 0.85, -0.32, 0x0a0a0a));
  g.add(box(0.06, 0.03, 0.06, 0, 0.85, -0.42, 0x2a2828));
  g.add(box(0.42, 0.05, 0.42, 0, 0.28, 0, 0xffffff));
  g.add(box(0.28, 0.22, 0.35, -0.18, 0.45, 0, 0x4a3a2a));
  g.add(box(0.28, 0.22, 0.35, 0.18, 0.45, 0, 0x4a3a2a));
  return g;
}

function buildLoon(): THREE.Group {
  const g = new THREE.Group();
  g.name = "huard";
  g.add(box(0.32, 0.22, 0.58, 0, 0.28, 0, 0x1a1a1a));
  g.add(box(0.28, 0.05, 0.5, 0, 0.35, 0, 0xffffff));
  g.add(box(0.08, 0.28, 0.08, 0, 0.5, -0.28, 0x1a1a1a));
  g.add(sphere(0.06, 0, 0.68, -0.28, 0x1a1a1a));
  g.add(box(0.04, 0.02, 0.09, 0, 0.68, -0.38, 0x8a8a8a));
  g.add(sphere(0.015, -0.04, 0.7, -0.3, 0xc00010));
  g.add(sphere(0.015, 0.04, 0.7, -0.3, 0xc00010));
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2 === 0) {
        g.add(box(0.05, 0.01, 0.08, -0.1 + i * 0.04, 0.4, -0.2 + j * 0.15, 0xffffff));
      }
    }
  }
  return g;
}

function buildHeron(): THREE.Group {
  const g = new THREE.Group();
  g.name = "heron";
  g.add(box(0.22, 0.2, 0.42, 0, 0.75, 0, 0x8a9098));
  g.add(box(0.06, 0.55, 0.06, 0, 1.1, -0.18, 0xa0a8b0));
  g.add(sphere(0.08, 0, 1.45, -0.18, 0xa0a8b0));
  g.add(box(0.03, 0.03, 0.15, 0, 1.45, -0.3, 0xf0c020));
  g.add(box(0.35, 0.15, 0.3, -0.18, 0.75, 0, 0x9098a0));
  g.add(box(0.35, 0.15, 0.3, 0.18, 0.75, 0, 0x9098a0));
  for (const [lx, lz] of [[-0.08, 0.08], [0.08, 0.08]]) {
    g.add(box(0.02, 0.72, 0.02, lx, 0.36, lz, 0xf0c020));
  }
  return g;
}

function buildEagle(): THREE.Group {
  const g = new THREE.Group();
  g.name = "aigle";
  g.add(box(0.28, 0.22, 0.5, 0, 0, 0, 0x5a3018));
  g.add(sphere(0.1, 0, 0.05, -0.32, 0xffffff));
  g.add(box(0.04, 0.02, 0.08, 0, 0.02, -0.42, 0xf0c020));
  g.add(sphere(0.02, -0.05, 0.08, -0.35, 0xffb000));
  g.add(sphere(0.02, 0.05, 0.08, -0.35, 0xffb000));
  const wingMat = matLib.get(0x3a2010, 0.9);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.3), wingMat);
  wingL.position.set(-0.55, 0.05, 0);
  wingL.rotation.z = -0.15;
  g.add(wingL);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.3), wingMat);
  wingR.position.set(0.55, 0.05, 0);
  wingR.rotation.z = 0.15;
  g.add(wingR);
  g.add(box(0.25, 0.04, 0.3, 0, 0, 0.35, 0x5a3018));
  return g;
}

function buildLynx(): THREE.Group {
  const g = new THREE.Group();
  g.name = "lynx";
  g.add(box(0.4, 0.4, 0.8, 0, 0.6, 0, 0x9a7050));
  g.add(box(0.28, 0.26, 0.32, 0, 0.75, -0.52, 0x8a6040));
  g.add(box(0.06, 0.12, 0.05, -0.08, 0.92, -0.48, 0x1a1a1a));
  g.add(box(0.06, 0.12, 0.05, 0.08, 0.92, -0.48, 0x1a1a1a));
  g.add(sphere(0.025, -0.08, 0.82, -0.66, 0xfff000));
  g.add(sphere(0.025, 0.08, 0.82, -0.66, 0xfff000));
  g.add(box(0.06, 0.06, 0.1, 0, 0.35, 0.5, 0x1a1a1a));
  for (const [lx, lz] of [[-0.14, 0.25], [0.14, 0.25], [-0.14, -0.25], [0.14, -0.25]]) {
    g.add(box(0.1, 0.42, 0.1, lx, 0.21, lz, 0x8a6040));
  }
  return g;
}

function buildCoyote(): THREE.Group {
  const g = new THREE.Group();
  g.name = "coyote";
  g.add(box(0.36, 0.32, 0.85, 0, 0.52, 0, 0xa89060));
  g.add(box(0.24, 0.22, 0.28, 0, 0.66, -0.5, 0x907830));
  g.add(box(0.1, 0.1, 0.32, 0, 0.5, 0.55, 0x8a7050));
  g.add(box(0.07, 0.14, 0.06, -0.07, 0.82, -0.52, 0x605030));
  g.add(box(0.07, 0.14, 0.06, 0.07, 0.82, -0.52, 0x605030));
  for (const [lx, lz] of [[-0.12, 0.25], [0.12, 0.25], [-0.12, -0.25], [0.12, -0.25]]) {
    g.add(box(0.08, 0.38, 0.08, lx, 0.19, lz, 0x604828));
  }
  return g;
}

function buildSkunk(): THREE.Group {
  const g = new THREE.Group();
  g.name = "mouffette";
  g.add(box(0.22, 0.2, 0.42, 0, 0.22, 0, 0x0a0a0a));
  g.add(sphere(0.08, 0, 0.28, -0.22, 0x0a0a0a));
  g.add(box(0.04, 0.05, 0.28, 0, 0.32, 0, 0xffffff));
  g.add(box(0.04, 0.05, 0.28, 0.08, 0.32, 0, 0xffffff));
  g.add(box(0.04, 0.05, 0.28, -0.08, 0.32, 0, 0xffffff));
  g.add(box(0.12, 0.28, 0.15, 0, 0.42, 0.28, 0xffffff));
  for (const [lx, lz] of [[-0.08, 0.12], [0.08, 0.12], [-0.08, -0.12], [0.08, -0.12]]) {
    g.add(box(0.05, 0.18, 0.05, lx, 0.09, lz, 0x0a0a0a));
  }
  return g;
}

function buildWalleye(): THREE.Group {
  const g = new THREE.Group();
  g.name = "dore";
  g.add(box(0.22, 0.15, 0.5, 0, 0, 0, 0x8a9020));
  g.add(box(0.12, 0.18, 0.12, 0, 0, 0.28, 0x8a9020));
  g.add(sphere(0.02, -0.05, 0.05, -0.22, 0xf0c000));
  g.add(sphere(0.02, 0.05, 0.05, -0.22, 0xf0c000));
  g.add(box(0.15, 0.12, 0.02, 0, 0.15, 0, 0x4a5010));
  return g;
}

function buildBass(): THREE.Group {
  const g = new THREE.Group();
  g.name = "achigan";
  g.add(box(0.24, 0.18, 0.42, 0, 0, 0, 0x506020));
  g.add(box(0.1, 0.16, 0.14, 0, 0, 0.24, 0x506020));
  g.add(sphere(0.02, -0.06, 0.02, -0.18, 0x1a1a1a));
  g.add(sphere(0.02, 0.06, 0.02, -0.18, 0x1a1a1a));
  for (let i = 0; i < 5; i++) {
    g.add(box(0.005, 0.15, 0.05, 0, 0.02, -0.15 + i * 0.06, 0x2a3010));
  }
  return g;
}

export function meshFor(kind: FaunaKind): THREE.Group {
  switch (kind) {
    case "moose": return buildMoose();
    case "wolf": return buildWolf();
    case "bear": return buildBear();
    case "fox": return buildFox();
    case "beaver": return buildBeaver();
    case "deer": return buildDeer();
    case "caribou": return buildCaribou();
    case "hare": return buildHare();
    case "squirrel": return buildSquirrel();
    case "raccoon": return buildRaccoon();
    case "goose": return buildGoose();
    case "loon": return buildLoon();
    case "heron": return buildHeron();
    case "eagle": return buildEagle();
    case "lynx": return buildLynx();
    case "coyote": return buildCoyote();
    case "skunk": return buildSkunk();
    case "walleye": return buildWalleye();
    case "bass": return buildBass();
    default: return buildFox();
  }
}

// ═══════════════════════════════════════════════════════════
// HOMES (v1 compat)
// ═══════════════════════════════════════════════════════════

export const HOMES: Array<{ id: string; kind: FaunaKind; name: string; x: number; z: number; gender?: "male" | "female"; packId?: string; protected?: boolean }> = [
  { id: "orignal_eboulis", kind: "moose", name: "Orignal de l'éboulis", x: -640, z: -590, gender: "male" },
  { id: "orignal_carillon", kind: "moose", name: "Orignal du lac Carillon", x: -540, z: -780, gender: "female" },
  { id: "orignal_raymond", kind: "moose", name: "Orignal de Saint-Raymond", x: 900, z: -700, gender: "male" },
  { id: "orignal_femelle", kind: "moose", name: "Orignal femelle des bois", x: 620, z: -820, gender: "female" },
  { id: "loup_alpha", kind: "wolf", name: "Alpha de la meute", x: 180, z: -700, gender: "male", packId: "pack_portneuf" },
  { id: "loup_beta", kind: "wolf", name: "Bêta de la meute", x: 205, z: -715, gender: "female", packId: "pack_portneuf" },
  { id: "loup_gamma", kind: "wolf", name: "Loup gamma", x: 155, z: -685, gender: "male", packId: "pack_portneuf" },
  { id: "loup_omega", kind: "wolf", name: "Louveteau oméga", x: 170, z: -720, gender: "female", packId: "pack_portneuf" },
  { id: "ours_bouclier", kind: "bear", name: "Ours noir du Bouclier", x: -200, z: -640, gender: "male" },
  { id: "ours_maman", kind: "bear", name: "Ourse et ses petits", x: 320, z: -880, gender: "female" },
  { id: "cerf_blanc", kind: "deer", name: "Cerf mâle du lac Blanc", x: -360, z: -770, gender: "male" },
  { id: "cerf_long", kind: "deer", name: "Chevreuil du lac Long", x: -700, z: -780, gender: "male" },
  { id: "biche_rang", kind: "deer", name: "Biche du 2e rang", x: 440, z: -520, gender: "female" },
  { id: "biche_ferme", kind: "deer", name: "Biche près des fermes", x: -280, z: -420, gender: "female" },
  { id: "caribou_nord", kind: "caribou", name: "Caribou des bois protégé", x: 600, z: -950, gender: "male", protected: true },
  { id: "renard_deschambault", kind: "fox", name: "Renard roux de Deschambault", x: -440, z: 62, gender: "male" },
  { id: "renard_saint_marc", kind: "fox", name: "Renard de Saint-Marc", x: -500, z: -280, gender: "female" },
  { id: "castor_fleuve", kind: "beaver", name: "Castor du Saint-Laurent", x: -100, z: 84 },
  { id: "castor_rive", kind: "beaver", name: "Castor des berges", x: -500, z: 88 },
  { id: "castor_barrage", kind: "beaver", name: "Ingénieur castor", x: 380, z: 95 },
  { id: "lievre_1", kind: "hare", name: "Lièvre d'Amérique", x: -420, z: -680 },
  { id: "lievre_2", kind: "hare", name: "Lièvre du sentier", x: 250, z: -580 },
  { id: "ecureuil_1", kind: "squirrel", name: "Écureuil roux", x: -180, z: -420 },
  { id: "ecureuil_2", kind: "squirrel", name: "Écureuil chapardeur", x: 150, z: -380 },
  { id: "raton_1", kind: "raccoon", name: "Raton-laveur nocturne", x: -320, z: -180 },
  { id: "raton_2", kind: "raccoon", name: "Raton fouilleur", x: 480, z: -220 },
  { id: "bernache_1", kind: "goose", name: "Bernache du Canada", x: -80, z: 92 },
  { id: "bernache_2", kind: "goose", name: "Bernache migratrice", x: -420, z: 96 },
  { id: "huard_1", kind: "loon", name: "Huard du lac", x: -580, z: -720, protected: true },
  { id: "heron_1", kind: "heron", name: "Grand héron bleu", x: -220, z: 88 },
  { id: "heron_2", kind: "heron", name: "Héron de la marina", x: 380, z: 92 },
  { id: "aigle_1", kind: "eagle", name: "Aigle royal des Laurentides", x: 200, z: -900, protected: true },
  { id: "lynx_1", kind: "lynx", name: "Lynx du Canada", x: -680, z: -880, gender: "male" },
  { id: "coyote_1", kind: "coyote", name: "Coyote solitaire", x: 380, z: -320, gender: "male" },
  { id: "coyote_2", kind: "coyote", name: "Coyote de la plaine", x: -180, z: -280, gender: "female" },
  { id: "mouffette_1", kind: "skunk", name: "Mouffette rayée", x: 220, z: -180 },
  { id: "dore_1", kind: "walleye", name: "Doré jaune du fleuve", x: -300, z: 105 },
  { id: "dore_2", kind: "walleye", name: "Doré du chenal", x: 250, z: 108 },
  { id: "achigan_1", kind: "bass", name: "Achigan à petite bouche", x: -150, z: 100 },
  { id: "achigan_2", kind: "bass", name: "Achigan de la baie", x: 420, z: 110 },
];

// ═══════════════════════════════════════════════════════════
// TABLES DE LOOT (v1 compat)
// ═══════════════════════════════════════════════════════════

export function lootFor(kind: FaunaKind, ageDays: number, season: Season): HarvestLoot[] {
  const winterBonus = season === "hiver" ? "excellente" : "commune";

  switch (kind) {
    case "moose":
      return [
        { id: "venaison_orignal", quantity: 8, quality: "excellente" },
        { id: "fourrure_orignal", quantity: 2, quality: winterBonus },
        { id: "bois_orignal", quantity: 1, quality: ageDays > 730 ? "trophee" : "bonne" },
        { id: "sabots", quantity: 4 },
      ];
    case "caribou":
      return [
        { id: "venaison_caribou", quantity: 6, quality: "excellente" },
        { id: "fourrure_caribou", quantity: 2, quality: "trophee" },
        { id: "bois_caribou", quantity: 1, quality: "trophee" },
      ];
    case "bear":
      return [
        { id: "viande_ours", quantity: 6, quality: "bonne" },
        { id: "fourrure_ours", quantity: 3, quality: winterBonus },
        { id: "graisse_ours", quantity: 4 },
        { id: "griffe_ours", quantity: 4, quality: "trophee" },
      ];
    case "deer":
      return [
        { id: "venaison", quantity: 4, quality: "bonne" },
        { id: "fourrure_chevreuil", quantity: 1 },
        { id: "bois_cerf", quantity: 1, quality: ageDays > 400 ? "excellente" : "commune" },
      ];
    case "wolf":
      return [
        { id: "fourrure_loup", quantity: 2, quality: winterBonus },
        { id: "crocs_loup", quantity: 4, quality: "bonne" },
      ];
    case "lynx":
      return [
        { id: "fourrure_lynx", quantity: 3, quality: "excellente" },
        { id: "griffes_lynx", quantity: 4 },
      ];
    case "coyote":
      return [
        { id: "fourrure_coyote", quantity: 1, quality: winterBonus },
        { id: "crocs_coyote", quantity: 2 },
      ];
    case "fox":
      return [
        { id: "fourrure_renard", quantity: 1, quality: winterBonus },
        { id: "queue_renard", quantity: 1 },
      ];
    case "beaver":
      return [
        { id: "queue_castor", quantity: 1 },
        { id: "fourrure_castor", quantity: 2, quality: "bonne" },
        { id: "dents_castor", quantity: 2 },
      ];
    case "hare":
      return [{ id: "viande_lievre", quantity: 1 }, { id: "fourrure_lievre", quantity: 1 }];
    case "squirrel":
      return [{ id: "queue_ecureuil", quantity: 1 }];
    case "raccoon":
      return [{ id: "fourrure_raton", quantity: 1 }, { id: "viande_petit", quantity: 1 }];
    case "goose":
      return [{ id: "viande_bernache", quantity: 2 }, { id: "plumes_bernache", quantity: 3 }];
    case "heron":
      return [{ id: "plumes_heron", quantity: 2 }];
    case "skunk":
      return [{ id: "glande_mouffette", quantity: 1 }];
    case "walleye":
      return [{ id: "dore", quantity: 1, quality: ageDays > 365 ? "excellente" : "bonne" }];
    case "bass":
      return [{ id: "achigan", quantity: 1, quality: "bonne" }];
    default:
      return [{ id: "viande_petit", quantity: 1 }];
  }
}

// ═══════════════════════════════════════════════════════════
// 🆕 v2 — HEALTH & SPEED TABLES
// ═══════════════════════════════════════════════════════════

const HEALTH: Record<FaunaKind, number> = {
  moose: 200, bear: 200, caribou: 180, wolf: 120, lynx: 120,
  deer: 100, coyote: 100, fox: 60, beaver: 60,
  hare: 40, squirrel: 40, raccoon: 40, goose: 40, loon: 40,
  heron: 40, eagle: 40, skunk: 40, walleye: 20, bass: 20,
};

const DETECT: Record<FaunaKind, number> = {
  moose: 22, wolf: 18, bear: 16, deer: 20, caribou: 22,
  fox: 14, beaver: 12, hare: 16, squirrel: 8, raccoon: 12,
  goose: 18, loon: 20, heron: 22, eagle: 30,
  lynx: 24, coyote: 20, skunk: 10, walleye: 8, bass: 8,
};

const SCALE: Record<FaunaKind, number> = {
  moose: 1.45, bear: 1.35, wolf: 1.28, deer: 1.15, caribou: 1.4,
  fox: 1.15, beaver: 1.15, hare: 0.85, squirrel: 0.6, raccoon: 1.0,
  goose: 1.0, loon: 0.95, heron: 1.15, eagle: 1.2, lynx: 1.15,
  coyote: 1.2, skunk: 0.85, walleye: 1.0, bass: 1.0,
};

/** Vitesse de fuite par espèce (m/s) */
const FLEE_SPEED: Record<FaunaKind, number> = {
  moose: 9, bear: 7.5, caribou: 8, wolf: 8.5, lynx: 8,
  deer: 10, coyote: 6, fox: 7.2, beaver: 3, hare: 8,
  squirrel: 4, raccoon: 3.4, goose: 4, loon: 4, heron: 5,
  eagle: 4, skunk: 2, walleye: 2, bass: 2,
};

/** Durée de respawn par espèce (secondes) */
const RESPAWN_TIME: Record<FaunaKind, number> = {
  moose: 90, bear: 90, caribou: 200, wolf: 60, lynx: 60,
  deer: 42, coyote: 42, fox: 42, beaver: 42,
  hare: 30, squirrel: 30, raccoon: 30, goose: 30, loon: 200,
  heron: 30, eagle: 200, skunk: 30, walleye: 30, bass: 30,
};

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE FAUNE PRINCIPAL (v2)
// ═══════════════════════════════════════════════════════════

export class WildlifeSystem {
  group = new THREE.Group();
  entities: Fauna[] = [];
  bloodPool: THREE.Group = new THREE.Group();
  warning: string | null = null;
  currentSeason: Season = "automne";
  timeOfDay: TimeOfDay = "jour";
  poachingCount = 0;

  // 🆕 v2
  private config: WildlifeConfig;
  private rng: () => number;
  private listeners = new Set<(e: WildlifeEvent) => void>();
  private lastPoachingResetAt = 0;
  private lastFullUpdate = 0;
  private terrainHeightCache = new Map<string, number>();

  constructor(config: Partial<WildlifeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = mulberry32(this.config.seed);
  }

  // ─────────────────────────────────────────────────────────
  // 🆕 v2 — EVENTS
  // ─────────────────────────────────────────────────────────

  onEvent(cb: (e: WildlifeEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(
    type: WildlifeEventType,
    fauna: Fauna,
    byPlayerId?: string,
    data?: Record<string, unknown>,
  ): void {
    const evt: WildlifeEvent = {
      type,
      fauna,
      byPlayerId,
      data,
      timestamp: Date.now(),
    };
    for (const cb of this.listeners) {
      try { cb(evt); } catch { /* noop */ }
    }
  }

  // ─────────────────────────────────────────────────────────
  // 🆕 v2 — CACHE TERRAIN
  // ─────────────────────────────────────────────────────────

  private cachedTerrainHeight(x: number, z: number): number {
    const key = `${Math.round(x)}_${Math.round(z)}`;
    let h = this.terrainHeightCache.get(key);
    if (h === undefined) {
      h = getTerrainHeight(x, z);
      this.terrainHeightCache.set(key, h);
      if (this.terrainHeightCache.size > 5000) {
        this.terrainHeightCache.clear();
      }
    }
    return h;
  }

  // ─────────────────────────────────────────────────────────
  // BUILD (v1 compat)
  // ─────────────────────────────────────────────────────────

  build() {
    this.group.name = "faune";
    this.bloodPool.name = "traces_sang";
    this.group.add(this.bloodPool);

    // 🆕 Seed déterministe pour les yaws initiaux
    const rng = mulberry32(this.config.seed);

    for (const home of HOMES) {
      const mesh = meshFor(home.kind);
      const y = getTerrainHeight(home.x, home.z);
      mesh.position.set(home.x, y, home.z);

      mesh.scale.setScalar(SCALE[home.kind] ?? 1.0);
      this.group.add(mesh);

      const maxHealth = HEALTH[home.kind] ?? 100;
      const now = Date.now();

      this.entities.push({
        id: home.id,
        kind: home.kind,
        name: home.name,
        mesh,
        homeX: home.x,
        homeZ: home.z,
        x: home.x,
        z: home.z,
        y,
        yaw: rng() * Math.PI * 2,
        speed: 0,
        state: home.kind === "moose" || home.kind === "deer" || home.kind === "caribou"
          ? "graze"
          : home.kind === "beaver"
          ? "dam"
          : home.kind === "walleye" || home.kind === "bass"
          ? "swim"
          : home.kind === "eagle"
          ? "fly"
          : "roam",
        detect: DETECT[home.kind] ?? 15,
        harvested: false,
        respawnIn: 0,
        health: maxHealth,
        maxHealth,
        wounded: false,
        bloodTrail: [],
        protected: home.protected ?? false,
        ageDays: 200 + Math.floor(rng() * 800),
        gender: home.gender ?? (rng() > 0.5 ? "male" : "female"),
        packId: home.packId,
        soundCooldown: 0,
        // 🆕 v2
        nextVocalAt: now + rng() * 30000,
        isHibernating: false,
        lastMatedAt: 0,
        offspring: 0,
        homeRadius: 90,
        lodLevel: 0,
      });
    }
  }

  setSeason(season: Season) {
    this.currentSeason = season;
  }

  setTimeOfDay(time: TimeOfDay) {
    this.timeOfDay = time;
  }

  updateConfig(patch: Partial<WildlifeConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  // ─────────────────────────────────────────────────────────
  // WOUND (v2 — BUG FIX : plus d'explosion de vitesse)
  // ─────────────────────────────────────────────────────────

  woundAnimal(id: string, damage: number, shooterId?: string): boolean {
    const e = this.entities.find((a) => a.id === id);
    if (!e || e.harvested) return false;

    e.health -= damage;
    e.lastAttackedBy = shooterId;

    this.emit("wound", e, shooterId, { damage, healthLeft: e.health });

    if (e.health <= 0) {
      e.state = "dead";
      e.speed = 0;
      this.emit("kill", e, shooterId);
      return true;
    }

    e.wounded = true;
    e.state = "flee";

    // 🆕 v2 FIX : vitesse fixe basée sur l'espèce, pas d'accumulation
    const baseFlee = FLEE_SPEED[e.kind] ?? 6;
    e.speed = Math.min(baseFlee * 1.4, 14);
    e.fleeDirection = this.rng() * Math.PI * 2;

    // Fuite immédiate dans une direction
    e.yaw = e.fleeDirection;

    this.emit("flee", e, shooterId, { reason: "wounded" });
    return false;
  }

  // ─────────────────────────────────────────────────────────
  // HARVEST (v1 compat)
  // ─────────────────────────────────────────────────────────

  nearestHarvestable(x: number, z: number, max = 4.6): Fauna | null {
    let best: Fauna | null = null;
    let bestD = max;
    for (const e of this.entities) {
      if (e.harvested) continue;
      if (e.state !== "dead" && e.health > 20) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  harvest(id: string): HarvestResult | null {
    const e = this.entities.find((a) => a.id === id);
    if (!e || e.harvested) return null;

    e.harvested = true;
    e.respawnIn = e.protected ? 200 : (RESPAWN_TIME[e.kind] ?? 42);
    e.mesh.visible = false;
    e.speed = 0;
    e.health = e.maxHealth;
    e.wounded = false;
    e.bloodTrail = [];

    const items = lootFor(e.kind, e.ageDays, this.currentSeason);

    let legality: "legal" | "illegal" | "protege" = "legal";
    let mffpFine = 0;

    if (e.protected) {
      legality = "protege";
      mffpFine = 5000;
      this.poachingCount++;
    } else if (e.kind === "moose" && this.currentSeason !== "automne") {
      legality = "illegal";
      mffpFine = 1500;
      this.poachingCount++;
    } else if (e.kind === "bear" && (this.currentSeason === "hiver" || this.currentSeason === "printemps")) {
      legality = "illegal";
      mffpFine = 2000;
      this.poachingCount++;
    }

    this.emit("harvest", e, undefined, { items, legality, mffpFine });

    return { name: e.name, kind: e.kind, items, legality, mffpFine: mffpFine > 0 ? mffpFine : undefined };
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────

  update(dt: number, player: THREE.Vector3, speedKmh: number, siren = false) {
    let warn: string | null = null;
    const loud = speedKmh > 40 || siren;
    const stampede = speedKmh > 68;
    let stampedeYaw: number | null = null;
    const isNight = this.timeOfDay === "nuit";
    const isDawnDusk = this.timeOfDay === "aube" || this.timeOfDay === "crepuscule";
    const now = Date.now();

    // Reset auto du compteur de braconnage
    if (this.poachingCount > 0 && now - this.lastPoachingResetAt > this.config.poachingResetSeconds * 1000) {
      this.poachingCount = 0;
      this.lastPoachingResetAt = now;
    }

    // Update complet throttled (5 Hz par défaut) — sinon on saute les décisions
    const shouldFullUpdate = (now - this.lastFullUpdate) > (1000 / this.config.fullUpdateHz);
    if (shouldFullUpdate) this.lastFullUpdate = now;

    // Vieillir les traces de sang
    for (const e of this.entities) {
      for (const drop of e.bloodTrail) drop.age += dt;
      e.bloodTrail = e.bloodTrail.filter((d) => d.age < this.config.bloodTrailLifetime);
    }

    for (const e of this.entities) {
      // Respawn
      if (e.harvested) {
        e.respawnIn -= dt;
        if (e.respawnIn <= 0) {
          e.harvested = false;
          e.x = e.homeX;
          e.z = e.homeZ;
          e.health = e.maxHealth;
          e.wounded = false;
          e.mesh.visible = true;
          e.state = e.kind === "moose" || e.kind === "deer" ? "graze" : "roam";
          this.emit("respawn", e);
        }
        continue;
      }

      // Hibernation
      if (e.kind === "bear" && this.currentSeason === "hiver") {
        e.state = "hibernate";
        e.isHibernating = true;
        e.mesh.visible = false;
        continue;
      } else if (e.isHibernating) {
        e.isHibernating = false;
        e.mesh.visible = true;
        e.state = "roam";
      }

      const dens = worldConfig.at(e.homeX, e.homeZ).wildlifeDensity;
      if (dens < 0.06) {
        if (e.mesh.visible) e.mesh.visible = false;
        continue;
      }

      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const dist = Math.hypot(dx, dz);

      // Culling LOD (renderDistance au lieu de 520)
      if (dist > this.config.renderDistance) {
        if (e.mesh.visible) e.mesh.visible = false;
        continue;
      }

      // LOD level
      const newLod: 0 | 1 | 2 = dist < this.config.lodMidDistance
        ? 0
        : dist < this.config.lodLowDistance
        ? 1
        : 2;
      e.lodLevel = newLod;

      // Animer seulement en LOD 0/1
      if (this.config.animationsEnabled && newLod < 2) {
        tickMixer(e.mesh, dt);
      }

      if (!e.mesh.visible) e.mesh.visible = true;

      // Vieillissement du sang
      if (e.wounded && !e.harvested) {
        e.health -= dt * 0.5;
        const lastDrop = e.bloodTrail[e.bloodTrail.length - 1];
        if (!lastDrop || Math.hypot(e.x - lastDrop.x, e.z - lastDrop.z) > 5) {
          if (e.bloodTrail.length < this.config.maxBloodTrail) {
            e.bloodTrail.push({ x: e.x, z: e.z, age: 0 });
          }
        }
        if (e.health <= 0) {
          e.state = "dead";
          e.speed = 0;
          this.emit("kill", e);
          continue;
        }
      }

      // Décisions IA (throttled)
      if (shouldFullUpdate) {
        this.updateAI(e, player, dx, dz, dist, loud, stampede, siren, isNight, isDawnDusk, now);
      }

      // Mouvement (chaque frame)
      if (e.speed > 0) {
        const hx = e.x - e.homeX;
        const hz = e.z - e.homeZ;
        if (Math.hypot(hx, hz) > e.homeRadius) {
          e.yaw = Math.atan2(-hx, -hz);
          e.speed = Math.min(e.speed, 4);
        }

        // 🆕 Pathfinding : évite les obstacles
        let nextX = e.x + Math.sin(e.yaw) * e.speed * dt * this.config.speedMultiplier;
        let nextZ = e.z + Math.cos(e.yaw) * e.speed * dt * this.config.speedMultiplier;

        if (this.config.pathfindingEnabled && this.config.obstacleCheck) {
          if (this.config.obstacleCheck(nextX, nextZ)) {
            // Contourne : déviation 90°
            e.yaw += Math.PI / 2;
            nextX = e.x + Math.sin(e.yaw) * e.speed * dt * this.config.speedMultiplier;
            nextZ = e.z + Math.cos(e.yaw) * e.speed * dt * this.config.speedMultiplier;
          }
        }

        e.x = nextX;
        e.z = nextZ;
      }

      // Position
      const y = e.kind === "eagle"
        ? this.cachedTerrainHeight(e.x, e.z) + 25
        : (e.kind === "walleye" || e.kind === "bass")
        ? this.cachedTerrainHeight(e.x, e.z) - 0.5
        : this.cachedTerrainHeight(e.x, e.z);

      e.y = y;
      e.mesh.position.set(e.x, y, e.z);
      e.mesh.rotation.y = e.yaw;

      // Warnings
      if (dist < 18) {
        if (e.state === "dead") warn = `Carcasse · ${e.name}`;
        else if (e.wounded) warn = `${e.name} · blessé`;
        else if (e.kind === "moose" && e.state === "stampede") warn = "⚠️ STAMPEDE D'ORIGNAUX ⚠️";
        else if (e.kind === "bear" && e.state === "chase") warn = `⚠️ ${e.name} CHARGE !`;
        else if (e.kind === "bear" && e.state === "stalk") warn = `${e.name} défend son territoire`;
        else if (e.kind === "wolf" && e.state === "hunt") warn = `🐺 Meute · ${e.name} vous traque !`;
        else if (e.kind === "wolf" && e.state === "stalk") warn = `${e.name} vous observe`;
        else if (e.kind === "lynx" && e.state === "stalk") warn = `👁️ ${e.name} rôde dans l'ombre`;
        else if (e.kind === "skunk" && dist < 4) warn = `⚠️ ${e.name} · odeur nauséabonde !`;
        else if (e.protected) warn = `🛡️ ${e.name} (PROTÉGÉ - Ne pas tirer !)`;
        else if (!warn) warn = e.name;
      }

      // Capture la direction de stampede
      if (e.kind === "moose" && e.state === "stampede" && !stampedeYaw) {
        stampedeYaw = e.yaw;
      }
    }

    // Stampede collectif
    if (stampedeYaw !== null) {
      for (const e of this.entities) {
        if (e.kind !== "moose" || e.harvested) continue;
        if (e.state !== "stampede") {
          e.state = "stampede";
          e.speed = 10.5;
          e.yaw = stampedeYaw;
        }
      }
      warn = "⚠️ STAMPEDE D'ORIGNAUX SUR LA ROUTE ⚠️";
      this.emit("stampede", this.entities[0], undefined, { yaw: stampedeYaw });
    }

    this.warning = warn;
  }

  // ─────────────────────────────────────────────────────────
  // 🆕 v2 — IA DÉCISIONS (extraite pour clarté)
  // ─────────────────────────────────────────────────────────

  private updateAI(
    e: Fauna,
    _player: THREE.Vector3,
    dx: number,
    dz: number,
    dist: number,
    loud: boolean,
    stampede: boolean,
    siren: boolean,
    isNight: boolean,
    isDawnDusk: boolean,
    now: number,
  ): void {
    const radius = loud ? e.detect * 1.4 : e.detect;
    const rng = this.rng;

    // Vocalisation (nouveau)
    if (now > e.nextVocalAt && dist < 80) {
      e.nextVocalAt = now + 15000 + rng() * 60000;
      this.emit("vocalize", e);
    }

    switch (e.kind) {
      case "moose":
        if (stampede && dist < 48) {
          e.state = "stampede";
          e.speed = 11;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (dist < radius || siren) {
          e.state = "flee";
          e.speed = dist < 3.2 ? 9 : 7.2;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (e.state === "flee" && dist > radius + 18) {
          e.state = "graze";
          e.speed = 0;
        } else if (rng() < 0.012) {
          e.state = isDawnDusk ? "graze" : rng() > 0.5 ? "roam" : "graze";
          e.speed = e.state === "roam" ? 1.5 : 0;
          if (e.state === "roam") e.yaw += (rng() - 0.5) * 1.6;
        }
        break;

      case "deer":
        if (dist < radius || siren) {
          e.state = "flee";
          e.speed = 10;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (e.state === "flee" && dist > radius + 15) {
          e.state = "graze";
          e.speed = 0;
        } else if (rng() < 0.015) {
          e.state = "roam";
          e.speed = 2;
          e.yaw += (rng() - 0.5) * 1.5;
        }
        break;

      case "caribou":
        if (dist < radius || siren) {
          e.state = "flee";
          e.speed = 8;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (rng() < 0.01) {
          e.state = "graze";
          e.speed = 0;
        }
        break;

      case "bear":
        if (dist < 4.5) {
          e.state = "chase";
          e.speed = 7.5;
          e.yaw = Math.atan2(dx, dz);
          this.emit("chase", e);
        } else if (dist < radius) {
          e.state = "stalk";
          e.speed = 3.4;
          e.yaw = Math.atan2(dx, dz);
        } else if (rng() < 0.012) {
          e.yaw += (rng() - 0.5) * 1.2;
          e.speed = 1.3;
          e.state = "roam";
        }
        break;

      case "wolf": {
        const hunts = isNight || isDawnDusk;
        if (loud || dist < 4 || siren) {
          e.state = "flee";
          e.speed = 8.5;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (dist < radius && hunts) {
          e.state = dist < 8 ? "hunt" : "stalk";
          e.speed = dist < 8 ? 4.5 : 3.2;
          e.yaw = Math.atan2(dx, dz);
        } else if (rng() < 0.02) {
          e.yaw += (rng() - 0.5) * 1.4;
          e.speed = 1.6;
          e.state = "roam";
        }
        break;
      }

      case "lynx":
        if (isNight && dist < radius) {
          e.state = "stalk";
          e.speed = 3.8;
          e.yaw = Math.atan2(dx, dz);
        } else if (dist < 3) {
          e.state = "chase";
          e.speed = 8;
          e.yaw = Math.atan2(dx, dz);
        } else if (rng() < 0.01) {
          e.state = "roam";
          e.speed = 1.5;
          e.yaw += (rng() - 0.5) * 1.3;
        }
        break;

      case "coyote":
        if (dist < radius) {
          e.state = isNight ? "stalk" : "flee";
          e.speed = isNight ? 3.5 : 6;
          e.yaw = isNight ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz);
        } else if (rng() < 0.02) {
          e.yaw += (rng() - 0.5) * 1.3;
          e.speed = 1.8;
          e.state = "roam";
        }
        break;

      case "eagle":
        e.state = "fly";
        e.speed = 4;
        if (rng() < 0.02) e.yaw += (rng() - 0.5) * 0.5;
        break;

      case "heron":
      case "loon":
      case "goose":
        if (dist < radius) {
          e.state = "flee";
          e.speed = e.kind === "heron" ? 5 : 4;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (rng() < 0.008) {
          e.state = e.kind === "goose" ? "graze" : "idle";
          e.speed = 0;
        }
        break;

      case "walleye":
      case "bass":
        e.state = "swim";
        e.speed = 1.2;
        if (rng() < 0.05) e.yaw += (rng() - 0.5) * 1.0;
        break;

      default:
        // fox, hare, squirrel, raccoon, skunk, beaver
        if (dist < radius) {
          e.state = "flee";
          e.speed = FLEE_SPEED[e.kind] ?? 4;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (e.state === "flee" && dist > radius + 12) {
          e.state = e.kind === "beaver" ? "dam" : "roam";
          e.speed = e.kind === "beaver" ? 0.6 : 1.2;
        } else if (rng() < 0.02) {
          e.yaw += (rng() - 0.5) * 1.5;
          e.speed = e.kind === "beaver" ? 0.9 : 1.6;
        }
    }
  }

  // ─────────────────────────────────────────────────────────
  // GETTERS (v1 compat + v2)
  // ─────────────────────────────────────────────────────────

  getBloodTrails(): BloodDrop[] {
    const all: BloodDrop[] = [];
    for (const e of this.entities) {
      if (e.wounded) all.push(...e.bloodTrail);
    }
    return all;
  }

  getPoachingLevel(): number {
    return this.poachingCount;
  }

  resetPoaching() {
    this.poachingCount = 0;
    this.lastPoachingResetAt = Date.now();
  }

  // 🆕 v2
  getStats() {
    const byState: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let wounded = 0;
    let dead = 0;
    let harvested = 0;
    let protectedCount = 0;

    for (const e of this.entities) {
      byState[e.state] = (byState[e.state] ?? 0) + 1;
      byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
      if (e.wounded) wounded++;
      if (e.state === "dead") dead++;
      if (e.harvested) harvested++;
      if (e.protected) protectedCount++;
    }

    return {
      total: this.entities.length,
      byState,
      byKind,
      wounded,
      dead,
      harvested,
      protectedCount,
      poachingCount: this.poachingCount,
      renderDistance: this.config.renderDistance,
      season: this.currentSeason,
      timeOfDay: this.timeOfDay,
    };
  }

  health(): { ok: boolean; reason?: string } {
    if (this.entities.length === 0) return { ok: false, reason: "no_entities" };
    if (this.terrainHeightCache.size > 10000) return { ok: false, reason: "cache_overflow" };
    return { ok: true };
  }

  dispose(): void {
    this.listeners.clear();
    this.terrainHeightCache.clear();
    this.entities = [];
    this.bloodPool.clear();
  }
}