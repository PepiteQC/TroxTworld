import * as THREE from "three";
import { matLib } from "./materials";
import { getTerrainHeight } from "./worlddata";
import { loadFbx, tickMixer } from "./fbx";

export type FaunaKind = "moose" | "wolf" | "bear" | "fox" | "beaver";
export type FaunaState = "idle" | "graze" | "roam" | "flee" | "stalk" | "chase" | "stampede" | "dam";

export interface Fauna {
  id: string;
  kind: FaunaKind;
  name: string;
  mesh: THREE.Group;
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  state: FaunaState;
  detect: number;
  harvested: boolean;
  respawnIn: number;
}

export interface HarvestLoot {
  id: string;
  quantity: number;
}

export interface HarvestResult {
  name: string;
  kind: FaunaKind;
  items: HarvestLoot[];
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(color, 0.95));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildMoose(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.95, 0.82, 2.05, 0, 1.22, 0, 0x5a3a24));
  g.add(box(0.55, 0.48, 0.7, 0, 1.55, -1.15, 0x4a3020));
  g.add(box(0.22, 0.38, 0.55, 0, 1.32, -1.55, 0x3a2418));
  const antler = matLib.get(0xc8b090, 0.7);
  for (const sx of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.18), antler);
    a.position.set(sx * 0.42, 1.92, -1.12);
    a.rotation.z = sx * 0.35;
    a.castShadow = true;
    g.add(a);
    const tine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), antler);
    tine.position.set(sx * 0.68, 2.08, -1.12);
    g.add(tine);
  }
  for (const [lx, lz] of [
    [-0.32, 0.7],
    [0.32, 0.7],
    [-0.32, -0.7],
    [0.32, -0.7],
  ]) {
    g.add(box(0.16, 0.85, 0.16, lx, 0.42, lz, 0x2a1c14));
  }
  return g;
}

export function buildWolf(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.42, 0.38, 0.95, 0, 0.62, 0, 0x6a6a68));
  g.add(box(0.28, 0.26, 0.32, 0, 0.78, -0.55, 0x5a5a58));
  g.add(box(0.12, 0.12, 0.38, 0, 0.58, 0.62, 0x4a4a48));
  g.add(box(0.08, 0.16, 0.08, -0.08, 0.96, -0.58, 0x3a3a38));
  g.add(box(0.08, 0.16, 0.08, 0.08, 0.96, -0.58, 0x3a3a38));
  for (const [lx, lz] of [
    [-0.14, 0.28],
    [0.14, 0.28],
    [-0.14, -0.28],
    [0.14, -0.28],
  ]) {
    g.add(box(0.09, 0.42, 0.09, lx, 0.22, lz, 0x3a3a38));
  }
  return g;
}

function buildBear(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.15, 0.95, 1.85, 0, 1.05, 0, 0x1a1816));
  g.add(box(0.62, 0.52, 0.7, 0, 1.28, -1.05, 0x141210));
  g.add(box(0.38, 0.28, 0.42, 0, 1.12, -1.42, 0x5a3a22));
  g.add(box(0.18, 0.18, 0.18, -0.28, 1.58, -1.05, 0x1a1816));
  g.add(box(0.18, 0.18, 0.18, 0.28, 1.58, -1.05, 0x1a1816));
  for (const [lx, lz] of [
    [-0.38, 0.55],
    [0.38, 0.55],
    [-0.38, -0.55],
    [0.38, -0.55],
  ]) {
    g.add(box(0.22, 0.7, 0.22, lx, 0.36, lz, 0x12100e));
  }
  void loadFbx("bear").then((rig) => {
    while (g.children.length) g.remove(g.children[0]!);
    g.add(rig);
    g.userData.mixer = rig.userData.mixer;
  }).catch(() => {
    /* low-poly reste */
  });
  return g;
}

function buildFox(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.28, 0.26, 0.72, 0, 0.42, 0, 0xc2410c));
  g.add(box(0.22, 0.2, 0.28, 0, 0.55, -0.42, 0xc2410c));
  g.add(box(0.12, 0.1, 0.22, 0, 0.48, -0.62, 0xf8fafc));
  g.add(box(0.08, 0.16, 0.06, -0.08, 0.72, -0.42, 0x1e293b));
  g.add(box(0.08, 0.16, 0.06, 0.08, 0.72, -0.42, 0x1e293b));
  g.add(box(0.1, 0.12, 0.42, 0, 0.38, 0.52, 0xc2410c));
  g.add(box(0.08, 0.08, 0.14, 0, 0.28, 0.74, 0xf8fafc));
  for (const [lx, lz] of [
    [-0.1, 0.22],
    [0.1, 0.22],
    [-0.1, -0.22],
    [0.1, -0.22],
  ]) {
    g.add(box(0.06, 0.32, 0.06, lx, 0.16, lz, 0x1e293b));
  }
  return g;
}

function buildBeaver(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.38, 0.28, 0.62, 0, 0.32, 0, 0x4a3424));
  g.add(box(0.28, 0.22, 0.28, 0, 0.38, -0.38, 0x3a281c));
  g.add(box(0.22, 0.04, 0.42, 0, 0.18, 0.48, 0x2a1c14));
  for (const [lx, lz] of [
    [-0.12, 0.16],
    [0.12, 0.16],
    [-0.12, -0.16],
    [0.12, -0.16],
  ]) {
    g.add(box(0.07, 0.2, 0.1, lx, 0.12, lz, 0x2a1c14));
  }
  return g;
}

function meshFor(kind: FaunaKind): THREE.Group {
  if (kind === "moose") return buildMoose();
  if (kind === "wolf") return buildWolf();
  if (kind === "bear") return buildBear();
  if (kind === "fox") return buildFox();
  return buildBeaver();
}

const HOMES: Array<{ id: string; kind: FaunaKind; name: string; x: number; z: number }> = [
  { id: "orignal_eboulis", kind: "moose", name: "Orignal de l'éboulis", x: -640, z: -590 },
  { id: "orignal_carillon", kind: "moose", name: "Orignal du lac Carillon", x: -540, z: -780 },
  { id: "orignal_raymond", kind: "moose", name: "Orignal de Saint-Raymond", x: 900, z: -700 },
  { id: "loup_alpha", kind: "wolf", name: "Loup alpha de Portneuf", x: 180, z: -700 },
  { id: "loup_beta", kind: "wolf", name: "Loup de la meute", x: 205, z: -715 },
  { id: "loup_gamma", kind: "wolf", name: "Loup de la meute", x: 155, z: -685 },
  { id: "ours_bouclier", kind: "bear", name: "Ours noir du Bouclier", x: -200, z: -640 },
  { id: "renard_deschambault", kind: "fox", name: "Renard roux de Deschambault", x: -440, z: 62 },
  { id: "castor_fleuve", kind: "beaver", name: "Castor du Saint-Laurent", x: -100, z: 84 },
  { id: "castor_rive", kind: "beaver", name: "Castor des berges", x: -500, z: 88 },
];

export class WildlifeSystem {
  group = new THREE.Group();
  entities: Fauna[] = [];
  warning: string | null = null;

  build() {
    this.group.name = "faune";
    for (const home of HOMES) {
      const mesh = meshFor(home.kind);
      const y = getTerrainHeight(home.x, home.z);
      mesh.position.set(home.x, y, home.z);
      const scale = home.kind === "moose" ? 1.45 : home.kind === "bear" ? 1.35 : home.kind === "wolf" ? 1.28 : 1.15;
      mesh.scale.setScalar(scale);
      this.group.add(mesh);
      this.entities.push({
        id: home.id,
        kind: home.kind,
        name: home.name,
        mesh,
        homeX: home.x,
        homeZ: home.z,
        x: home.x,
        z: home.z,
        yaw: Math.random() * Math.PI * 2,
        speed: 0,
        state: home.kind === "moose" ? "graze" : home.kind === "beaver" ? "dam" : "roam",
        detect: home.kind === "moose" ? 22 : home.kind === "bear" ? 16 : home.kind === "wolf" ? 18 : 12,
        harvested: false,
        respawnIn: 0,
      });
    }
  }

  nearestHarvestable(x: number, z: number, max = 4.6): Fauna | null {
    let best: Fauna | null = null;
    let bestD = max;
    for (const e of this.entities) {
      if (e.harvested) continue;
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
    e.respawnIn = 42;
    e.mesh.visible = false;
    e.speed = 0;
    const items: HarvestLoot[] =
      e.kind === "moose" || e.kind === "bear"
        ? [
            { id: "venaison", quantity: 2 },
            { id: "fourrure", quantity: 1 },
          ]
        : e.kind === "beaver"
          ? [{ id: "queue_castor", quantity: 1 }]
          : [{ id: "fourrure", quantity: 1 }];
    return { name: e.name, kind: e.kind, items };
  }

  update(dt: number, player: THREE.Vector3, speedKmh: number, siren = false) {
    let warn: string | null = null;
    const loud = speedKmh > 40 || siren;
    const stampede = speedKmh > 68;
    let stampedeYaw: number | null = null;

    for (const e of this.entities) {
      tickMixer(e.mesh, dt);
      if (e.harvested) {
        e.respawnIn -= dt;
        if (e.respawnIn <= 0) {
          e.harvested = false;
          e.x = e.homeX;
          e.z = e.homeZ;
          e.mesh.visible = true;
          e.state = e.kind === "moose" ? "graze" : "roam";
        }
        continue;
      }

      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const dist = Math.hypot(dx, dz);
      const radius = loud ? e.detect * 1.4 : e.detect;

      if (e.kind === "moose" && stampede && dist < 48) {
        e.state = "stampede";
        e.speed = 11;
        e.yaw = Math.atan2(-dx, -dz);
        stampedeYaw = e.yaw;
      } else if (e.kind === "moose") {
        if (dist < radius || siren) {
          e.state = "flee";
          e.speed = dist < 3.2 ? 9 : 7.2;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (e.state === "flee" && dist > radius + 18) {
          e.state = "graze";
          e.speed = 0;
        } else if (e.state === "stampede" && dist > 70) {
          e.state = "graze";
          e.speed = 0;
        } else if (e.state !== "flee" && e.state !== "stampede" && Math.random() < 0.012) {
          e.state = Math.random() > 0.45 ? "roam" : "graze";
          e.speed = e.state === "roam" ? 1.5 : 0;
          if (e.state === "roam") e.yaw += (Math.random() - 0.5) * 1.6;
        }
      } else if (e.kind === "bear") {
        if (dist < 4.5) {
          e.state = "chase";
          e.speed = 7.5;
          e.yaw = Math.atan2(dx, dz);
        } else if (dist < radius) {
          e.state = "stalk";
          e.speed = 3.4;
          e.yaw = Math.atan2(dx, dz);
        } else if (e.state === "chase" || e.state === "stalk") {
          e.state = "roam";
          e.speed = 1.4;
        } else if (Math.random() < 0.012) {
          e.yaw += (Math.random() - 0.5) * 1.2;
          e.speed = 1.3;
        }
      } else if (e.kind === "wolf") {
        if (loud || dist < 4 || siren) {
          e.state = "flee";
          e.speed = 8.5;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (dist < radius) {
          e.state = dist < 8 ? "stalk" : "roam";
          e.speed = dist < 8 ? 3.2 : 2.4;
          e.yaw = Math.atan2(dx, dz);
        } else if (e.state === "flee" && dist > radius + 14) {
          e.state = "roam";
          e.speed = 1.8;
        } else if (Math.random() < 0.02) {
          e.yaw += (Math.random() - 0.5) * 1.4;
          e.speed = 1.6;
          e.state = "roam";
        }
      } else {
        if (dist < radius) {
          e.state = "flee";
          e.speed = e.kind === "fox" ? 7.2 : 3.4;
          e.yaw = Math.atan2(-dx, -dz);
        } else if (e.state === "flee" && dist > radius + 12) {
          e.state = e.kind === "beaver" ? "dam" : "roam";
          e.speed = e.kind === "beaver" ? 0.6 : 1.2;
        } else if (Math.random() < 0.02) {
          e.yaw += (Math.random() - 0.5) * 1.5;
          e.speed = e.kind === "beaver" ? 0.9 : 1.6;
          if (e.kind === "beaver" && dist > 16) e.state = "dam";
        }
      }

      if (e.speed > 0) {
        const hx = e.x - e.homeX;
        const hz = e.z - e.homeZ;
        if (Math.hypot(hx, hz) > 90) {
          e.yaw = Math.atan2(-hx, -hz);
          e.speed = Math.min(e.speed, 4);
        }
        e.x += Math.sin(e.yaw) * e.speed * dt;
        e.z += Math.cos(e.yaw) * e.speed * dt;
      }

      const y = getTerrainHeight(e.x, e.z);
      e.mesh.position.set(e.x, y, e.z);
      e.mesh.rotation.y = e.yaw;
      e.mesh.visible = dist < 520;

      if (dist < 18) {
        if (e.kind === "moose" && e.state === "stampede") warn = "Stampede d'orignaux !";
        else if (e.kind === "moose" && e.state === "flee") warn = `${e.name} s'enfuit dans les bois`;
        else if (e.kind === "wolf" && e.state === "stalk") warn = `Meute · ${e.name} vous observe`;
        else if (e.kind === "bear" && e.state === "chase") warn = `${e.name} charge !`;
        else if (e.kind === "bear" && e.state === "stalk") warn = `${e.name} défend son territoire`;
        else if (e.kind === "beaver" && e.state === "dam") warn = `${e.name} aménage un barrage`;
        else if (e.kind === "beaver" && e.state === "flee") warn = `${e.name} claque de la queue et plonge`;
        else if (!warn) warn = e.name;
      }
    }

    if (stampedeYaw !== null) {
      for (const e of this.entities) {
        if (e.kind !== "moose" || e.harvested) continue;
        if (e.state !== "stampede") {
          e.state = "stampede";
          e.speed = 10.5;
          e.yaw = stampedeYaw;
        }
      }
      warn = "Stampede d'orignaux !";
    }
    this.warning = warn;
  }
}
