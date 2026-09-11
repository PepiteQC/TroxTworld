import * as THREE from "three";
import { matLib } from "./materials";

export class SwingDoor {
  hinge: THREE.Group;
  leaf: THREE.Group;
  handle: THREE.Object3D;
  sign: 1 | -1;
  geom: 1 | -1;
  angle = 0;
  vel = 0;
  latch = 0;
  width: number;
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();

  constructor(
    hinge: THREE.Group,
    leaf: THREE.Group,
    handle: THREE.Object3D,
    sign: 1 | -1,
    geom: 1 | -1,
    width: number,
  ) {
    this.hinge = hinge;
    this.leaf = leaf;
    this.handle = handle;
    this.sign = sign;
    this.geom = geom;
    this.width = width;
  }

  get open() {
    return Math.abs(this.angle) > 0.9;
  }

  hit(impulse: number) {
    this.vel += this.sign * Math.abs(impulse);
    this.latch = Math.max(this.latch, 3.4);
  }

  push(dt: number, force: number) {
    this.vel += this.sign * Math.abs(force) * dt;
    this.latch = Math.max(this.latch, 2.6);
  }

  tick(dt: number) {
    if (this.latch > 0) this.latch -= dt;
    const spring = this.latch > 0 ? 0 : -this.angle * 5.5;
    this.vel += (spring - this.vel * 6) * dt;
    this.angle += this.vel * dt;
    const min = this.sign < 0 ? -2.4 : -0.06;
    const max = this.sign < 0 ? 0.06 : 2.4;
    if (this.angle < min) {
      this.angle = min;
      this.vel *= -0.12;
    }
    if (this.angle > max) {
      this.angle = max;
      this.vel *= -0.12;
    }
    this.leaf.rotation.y = this.angle;
  }

  leafCenter(out: THREE.Vector3) {
    return this.leaf.localToWorld(out.set(this.geom * this.width * 0.5, 1.15, 0));
  }

  handleWorld(out: THREE.Vector3) {
    this.handle.getWorldPosition(out);
    return out;
  }

  slabDist(px: number, pz: number) {
    this.hinge.getWorldPosition(this.a);
    this.hinge.localToWorld(this.b.set(this.geom * this.width, 1, 0));
    const abx = this.b.x - this.a.x;
    const abz = this.b.z - this.a.z;
    const denom = abx * abx + abz * abz || 1;
    const t = Math.min(1, Math.max(0, ((px - this.a.x) * abx + (pz - this.a.z) * abz) / denom));
    return Math.hypot(px - (this.a.x + abx * t), pz - (this.a.z + abz * t));
  }

  worldHit(out: THREE.Vector3) {
    return this.leafCenter(out);
  }
}

export function buildGlassLeaf(
  width: number,
  height: number,
  geomSign: 1 | -1,
  swingSign: 1 | -1,
): { hinge: THREE.Group; door: SwingDoor } {
  const hinge = new THREE.Group();
  const leaf = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.06),
    matLib.get(0x7dd3fc, 0.08, 0.15),
  );
  (glass.material as THREE.MeshStandardMaterial).transparent = true;
  (glass.material as THREE.MeshStandardMaterial).opacity = 0.22;
  glass.position.set(geomSign * (width / 2), height / 2, 0);
  glass.castShadow = true;
  leaf.add(glass);
  const frame = matLib.get(0x1a1428, 0.35, 0.7);
  for (const [w, h, x, y] of [
    [width + 0.04, 0.06, geomSign * (width / 2), height - 0.03],
    [width + 0.04, 0.06, geomSign * (width / 2), 0.03],
    [0.05, height, geomSign * 0.03, height / 2],
    [0.05, height, geomSign * (width - 0.03), height / 2],
  ] as const) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), frame);
    bar.position.set(x, y, 0);
    leaf.add(bar);
  }
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, 0.018, 0.03),
    matLib.getEmissive(0xa78bfa, 0xa78bfa, 1.15),
  );
  neon.position.set(geomSign * (width / 2), height - 0.1, 0.05);
  leaf.add(neon);
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.48, 8),
    matLib.get(0xc9a84c, 0.25, 0.85),
  );
  handle.name = "ether-door-handle";
  handle.position.set(geomSign * (width - 0.18), height * 0.48, 0.09);
  leaf.add(handle);
  hinge.add(leaf);
  return { hinge, door: new SwingDoor(hinge, leaf, handle, swingSign, geomSign, width) };
}
