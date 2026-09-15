import * as THREE from "three";
import { matLib } from "./materials";
import { getTerrainHeight } from "./worlddata";
import { SPAWN_POINTS, worldConfig, type SpawnPoint } from "./worldconfig";
import { CharacterAnimationManager } from "./characterAnim";

interface Ped {
  mesh: THREE.Group;
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  phase: number;
  bob: number;
  spawn: SpawnPoint;
  idle: boolean;
  anim: CharacterAnimationManager | null;
}

const COATS = [0x3a4a3c, 0x4a3028, 0x2a3a4a, 0x6a5a48, 0x8a3030, 0x2a2a32];

function buildVillager(i: number): THREE.Group {
  const g = new THREE.Group();
  const coat = matLib.get(COATS[i % COATS.length]!, 0.82);
  const skin = matLib.get(0xc4a882, 0.7);
  const pant = matLib.get(0x2a2a30, 0.9);
  const boot = matLib.get(0x1a1612, 0.92);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.26), coat);
  torso.name = "TorsoJoint";
  torso.position.y = 1.18;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skin);
  head.name = "HeadJoint";
  head.position.y = 1.6;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 7, 6), matLib.get(i % 2 ? 0x2a1208 : 0x4a3020, 0.95));
  hair.position.y = 1.68;
  hair.scale.set(1, 0.55, 1);
  g.add(hair);
  for (const s of [-1, 1] as const) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.26, 1.38, 0);
    arm.userData.arm = s;
    arm.name = s === 1 ? "ArmRJoint" : "ArmLJoint";
    g.add(arm);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), coat);
    sleeve.position.y = -0.2;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), skin);
    hand.position.y = -0.48;
    arm.add(hand);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.68, 0.15), pant);
    leg.position.set(s * 0.11, 0.42, 0);
    leg.userData.leg = s;
    leg.name = s === 1 ? "LegRJoint" : "LegLJoint";
    g.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.2), boot);
    shoe.position.set(s * 0.11, 0.06, 0.02);
    g.add(shoe);
  }
  return g;
}

function poseWalk(mesh: THREE.Group, bob: number, amp: number) {
  mesh.traverse((obj) => {
    if (obj.userData.leg) {
      obj.rotation.x = Math.sin(bob + (obj.userData.leg > 0 ? 0 : Math.PI)) * amp;
    }
    if (obj.userData.arm) {
      obj.rotation.x = Math.sin(bob + (obj.userData.arm > 0 ? Math.PI : 0)) * amp * 0.7;
    }
  });
}

export class PedSystem {
  group = new THREE.Group();
  peds: Ped[] = [];

  build() {
    this.group.name = "pietons";
    let i = 0;
    for (const sp of SPAWN_POINTS) {
      if (sp.spawnType !== "pedestrian" || !sp.enabled) continue;
      const mesh = buildVillager(i);
      mesh.position.set(sp.posX, getTerrainHeight(sp.posX, sp.posZ), sp.posZ);
      this.group.add(mesh);
      this.peds.push({
        mesh,
        homeX: sp.posX,
        homeZ: sp.posZ,
        x: sp.posX,
        z: sp.posZ,
        yaw: sp.heading,
        speed: 1.15 + (i % 5) * 0.12,
        phase: i * 1.7,
        bob: i * 0.4,
        spawn: sp,
        idle: i % 4 === 0,
        anim: CharacterAnimationManager.attach(mesh),
      });
      i++;
    }
  }

  update(dt: number, player: THREE.Vector3, hour: number) {
    for (const p of this.peds) {
      const dx = p.x - player.x;
      const dz = p.z - player.z;
      const dist2 = dx * dx + dz * dz;
      if (dist2 > 220 * 220) {
        if (p.mesh.visible) p.mesh.visible = false;
        continue;
      }
      const zone = worldConfig.at(p.x, p.z);
      const open = worldConfig.hourOpen(p.spawn, hour) && zone.pedestrianDensity > 0.12;
      if (!open) {
        if (p.mesh.visible) p.mesh.visible = false;
        continue;
      }
      if (!p.mesh.visible) p.mesh.visible = true;
      const far = dist2 > 90 * 90;
      p.phase += dt * p.speed * (p.idle ? 0.12 : 0.35);
      const r = 7 + zone.pedestrianDensity * 4;
      const nx = p.homeX + Math.cos(p.phase) * r;
      const nz = p.homeZ + Math.sin(p.phase * 0.85) * r * 0.65;
      const vx = nx - p.x;
      const vz = nz - p.z;
      p.x = nx;
      p.z = nz;
      if (Math.hypot(vx, vz) > 0.001) p.yaw = Math.atan2(-vx, -vz);
      p.mesh.position.set(p.x, getTerrainHeight(p.x, p.z), p.z);
      p.mesh.rotation.y = p.yaw;
      if (far) continue;
      const moving = !p.idle || (hour > 11 && hour < 14);
      p.bob += dt * (moving ? 8.2 : 1.6);
      if (p.anim?.bound) {
        p.anim.update(dt, moving ? p.speed : 0);
      } else {
        poseWalk(p.mesh, p.bob, moving ? 0.38 : 0.06);
      }
    }
  }
}
