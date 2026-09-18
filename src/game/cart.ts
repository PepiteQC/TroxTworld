import * as THREE from "three";
import { matLib } from "./materials";

export function buildCaddie(): THREE.Group {
  const g = new THREE.Group();
  g.name = "caddie";
  const chrome = matLib.get(0x8a9098, 0.28, 0.82);
  const dark = matLib.get(0x1a1c22, 0.55, 0.4);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.72), chrome);
  basket.position.set(0, 0.52, 0);
  g.add(basket);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.64), matLib.get(0x141820, 0.9));
  inner.position.set(0, 0.54, 0);
  g.add(inner);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.04), chrome);
  handle.position.set(0, 0.92, 0.42);
  g.add(handle);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), chrome);
    post.position.set(s * 0.2, 0.7, 0.38);
    g.add(post);
  }
  const child = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.28), dark);
  child.position.set(0, 0.22, 0.18);
  g.add(child);
  for (const [x, z] of [
    [-0.18, -0.26],
    [0.18, -0.26],
    [-0.18, 0.26],
    [0.18, 0.26],
  ] as const) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.07, z);
    g.add(wheel);
  }
  const fill = new THREE.Group();
  fill.name = "caddie-fill";
  fill.position.set(0, 0.48, 0);
  g.add(fill);
  return g;
}

export function fillCaddie(group: THREE.Group, count: number) {
  const fill = group.getObjectByName("caddie-fill");
  if (!fill) return;
  while (fill.children.length) fill.remove(fill.children[0]!);
  const n = Math.min(8, count);
  const colors = [0x8b1a1a, 0x111827, 0x5c3317, 0x1a3a6b, 0xc9a84c, 0x334155];
  for (let i = 0; i < n; i++) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.2),
      matLib.get(colors[i % colors.length]!, 0.85),
    );
    box.position.set(((i % 3) - 1) * 0.14, 0.08 + Math.floor(i / 3) * 0.11, (Math.floor(i / 3) % 2) * 0.12 - 0.08);
    fill.add(box);
  }
}