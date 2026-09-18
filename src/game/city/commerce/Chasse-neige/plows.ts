/**
 * Chasse-neige MTQ + gratte privée — circulation sur la 138.
 */
import * as THREE from "three";
import { buildCamion, buildDeplaceige } from "./architecture";
import { matLib } from "./materials";
import { getTerrainHeight, ROADS } from "./worlddata";
import { sampleRoad } from "./roads";
import { quebecSeasons, type QuebecWeatherState } from "./seasons";

function approxLength(pts: Array<[number, number]>) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return n;
}

function buildMtqMack(): THREE.Group {
  const g = buildCamion(0xd45a12);
  g.name = "mtq-charrue";
  const blade = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.95, 0.22), matLib.get(0xc4a030, 0.4, 0.35));
  blade.position.set(0, 0.85, 3.55);
  blade.rotation.x = -0.32;
  blade.castShadow = true;
  g.add(blade);
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 2.2), matLib.get(0x3a3e42, 0.55, 0.25));
  hopper.position.set(0, 1.85, -0.4);
  g.add(hopper);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 8), matLib.getEmissive(0xc4a030, 0xffc14a, 1.1));
  beacon.position.set(0, 2.55, 1.1);
  beacon.userData.beacon = true;
  g.add(beacon);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 0.04), matLib.get(0x1a1c1e, 0.5));
  stripe.position.set(0, 1.15, 2.05);
  g.add(stripe);
  return g;
}

interface PlowRig {
  id: string;
  mesh: THREE.Group;
  t: number;
  dir: 1 | -1;
  offset: number;
  speed: number;
  beacons: THREE.Mesh[];
}

export class SnowPlowField {
  group = new THREE.Group();
  private rigs: PlowRig[] = [];
  private roadLen = 1;
  private road = ROADS.find((r) => r.id === "r138") ?? ROADS[0]!;

  constructor() {
    this.group.name = "snow-plows";
    this.roadLen = Math.max(1, approxLength(this.road.points));
    this.spawn("mtq_charrue_138", buildMtqMack(), 0.18, 1, 3.4, 16);
    this.spawn("prive_gratte_ford", buildDeplaceige(), 0.62, -1, -3.1, 13);
  }

  tick(dt: number, elapsed: number, wx: QuebecWeatherState, player?: THREE.Vector3) {
    const any = wx.plows.some((p) => p.active) || wx.snowPlowStatus === "en_cours" || wx.snowPlowStatus === "alerte_blizzard";
    this.group.visible = any || wx.snowAccumulationCm > 4;
    if (!this.group.visible) return;

    for (const rig of this.rigs) {
      const spec = wx.plows.find((p) => p.id === rig.id);
      const active = spec?.active ?? false;
      rig.mesh.visible = active || wx.snowAccumulationCm > 8;
      if (!rig.mesh.visible) continue;
      const mul = active ? 1 : 0.45;
      rig.t += (rig.dir * rig.speed * mul * dt) / this.roadLen;
      if (rig.t > 1) rig.t -= 1;
      if (rig.t < 0) rig.t += 1;
      const s = sampleRoad(this.road, rig.t);
      const x = s.x + -s.tz * rig.offset;
      const z = s.z + s.tx * rig.offset;
      const y = getTerrainHeight(x, z) + 0.38;
      rig.mesh.position.set(x, y, z);
      const look = sampleRoad(this.road, (rig.t + rig.dir * 0.01 + 1) % 1);
      rig.mesh.lookAt(look.x + -look.tz * rig.offset, y, look.z + look.tx * rig.offset);
      const pulse = active ? 1.4 + Math.sin(elapsed * 8) * 0.8 : 0.2;
      for (const b of rig.beacons) {
        const mat = b.material as THREE.MeshStandardMaterial;
        if (mat.emissive) mat.emissiveIntensity = pulse;
      }
      if (active && spec) {
        /* le tick saisons gère l'accumulation ; ici on ne fait que rouler */
      }
      if (player && spec?.active) {
        const d = Math.hypot(player.x - x, player.z - z);
        if (d < 4.5) quebecSeasons.runPlowOperation(rig.id, dt * 0.4);
      }
    }
  }

  nearest(x: number, z: number) {
    let best: { id: string; x: number; z: number; d: number } | null = null;
    for (const rig of this.rigs) {
      if (!rig.mesh.visible) continue;
      const d = Math.hypot(rig.mesh.position.x - x, rig.mesh.position.z - z);
      if (!best || d < best.d) best = { id: rig.id, x: rig.mesh.position.x, z: rig.mesh.position.z, d };
    }
    return best;
  }

  private spawn(id: string, mesh: THREE.Group, t: number, dir: 1 | -1, offset: number, speed: number) {
    const s = sampleRoad(this.road, t);
    mesh.position.set(s.x, getTerrainHeight(s.x, s.z) + 0.38, s.z);
    this.group.add(mesh);
    const beacons: THREE.Mesh[] = [];
    mesh.traverse((o) => {
      if (o.userData.beacon && o instanceof THREE.Mesh) beacons.push(o);
    });
    this.rigs.push({ id, mesh, t, dir, offset, speed, beacons });
  }
}
