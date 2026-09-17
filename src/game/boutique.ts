import * as THREE from "three";
import { matLib } from "./materials";
import type { ShopItemId } from "./commerce";
import { finishMap } from "./textures";

export interface BoutiqueGarment {
  itemId: ShopItemId;
  x: number;
  z: number;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, metal = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(color, 0.75, metal));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function rack(x: number, z: number, length: number, colors: number[]) {
  const g = new THREE.Group();
  const metal = matLib.get(0x2a2a35, 0.25, 0.75);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8), metal);
    post.position.set(x + s * (length / 2 - 0.06), 0.85, z);
    g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, length, 8), metal);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(x, 1.68, z);
  g.add(bar);
  colors.forEach((c, i) => {
    const t = colors.length <= 1 ? 0.5 : i / (colors.length - 1);
    const gx = x - length / 2 + 0.22 + t * (length - 0.44);
    const hang = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.05), matLib.get(c, 0.88));
    hang.position.set(gx, 1.28, z);
    hang.castShadow = true;
    g.add(hang);
  });
  return g;
}

function mannequin(x: number, z: number, color: number) {
  const g = new THREE.Group();
  g.add(box(0.36, 0.5, 0.2, x, 1.28, z, color));
  g.add(box(0.32, 0.28, 0.18, x, 0.92, z, color));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), matLib.get(0xd4c8b0, 0.7));
  head.position.set(x, 1.72, z);
  g.add(head);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), matLib.get(0x2a2a35, 0.3, 0.7));
  pole.position.set(x, 0.45, z);
  g.add(pole);
  return g;
}

function productCard(id: ShopItemId, x: number, y: number, z: number) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x22242c });
  const loader = new THREE.TextureLoader();
  loader.load(`/products/${id}.jpg`, (tex) => {
    finishMap(tex, "clamp");
    mat.map = tex;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildBoutiqueInterior() {
  const g = new THREE.Group();
  g.name = "interieur_boutique";
  const W = 12.4;
  const D = 13.2;
  const H = 3.4;
  const walls: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  const garments: BoutiqueGarment[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0x12141c, 0.35, 0.12));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 7.4), matLib.get(0x14101f, 0.95));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.01;
  g.add(carpet);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0x111520, 0.92));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  g.add(box(W, H, 0.2, 0, H / 2, -D / 2, 0x1a1f2e));
  g.add(box(W, H, 0.2, 0, H / 2, D / 2, 0x1a1f2e));
  g.add(box(0.2, H, D, -W / 2, H / 2, 0, 0x1a1f2e));
  g.add(box(0.2, H, D, W / 2, H / 2, 0, 0x1a1f2e));
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.15, maxZ: -D / 2 + 0.15 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.15, maxZ: D / 2 + 0.15 });
  walls.push({ minX: -W / 2 - 0.15, maxX: -W / 2 + 0.15, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.15, maxX: W / 2 + 0.15, minZ: -D / 2, maxZ: D / 2 });

  const neon = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.42, 0.08), matLib.getEmissive(0xa78bfa, 0xa78bfa, 0.95));
  neon.position.set(0, H - 0.4, -D / 2 + 0.16);
  g.add(neon);

  g.add(rack(-3.6, -4.6, 4.4, [0xcc0000, 0x1a3a6b, 0x8b1a1a, 0x111827, 0x5c3317, 0x2a2a2a]));
  g.add(rack(3.6, -4.6, 4.4, [0x1a5276, 0x4a3000, 0xc9a84c, 0x334155, 0x8b1a1a, 0x1c3a1c]));
  g.add(rack(0, -1.2, 3.8, [0x111827, 0x5c3317, 0x1a3a6b, 0xcc0000, 0x2d1f0e]));

  g.add(mannequin(-4.6, 3.8, 0xcc0000));
  g.add(mannequin(-3.2, 3.8, 0x1a3a6b));
  g.add(mannequin(3.2, 3.8, 0x8b1a1a));
  g.add(mannequin(4.6, 3.8, 0x2a2a2a));

  g.add(box(2.6, 1.05, 0.85, -3.8, 0.52, -5.8, 0x0e1520, 0.4));
  g.add(box(2.65, 0.07, 0.9, -3.8, 1.08, -5.8, 0xc9a84c, 0.2));
  const till = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.22), matLib.getEmissive(0x1a3a6b, 0x3a6ab8, 0.6));
  till.position.set(-3.2, 1.28, -5.7);
  g.add(till);

  for (let i = 0; i < 3; i++) {
    const cz = -3.4 + i * 2.2;
    g.add(box(1.5, 2.6, 0.08, 5.1, 1.3, cz - 0.7, 0x242b3d));
    g.add(box(0.08, 2.6, 1.5, 4.4, 1.3, cz, 0x242b3d));
    g.add(box(0.08, 2.6, 1.5, 5.8, 1.3, cz, 0x242b3d));
    g.add(box(1.3, 1.7, 0.04, 5.1, 1.4, cz + 0.72, 0x1a0a2e));
  }
  walls.push({ minX: 4.3, maxX: 5.9, minZ: -4.3, maxZ: 1.6 });

  const spots: Array<{ id: ShopItemId; x: number; z: number; color: number }> = [
    { id: "goose", x: -4.8, z: -4.6, color: 0x8b1a1a },
    { id: "veste", x: -3.4, z: -4.6, color: 0x5c3317 },
    { id: "nike", x: -2.0, z: -4.6, color: 0x111827 },
    { id: "roots", x: 2.2, z: -4.6, color: 0x5c3317 },
    { id: "kaki", x: 3.6, z: -4.6, color: 0x4a5840 },
    { id: "tuque", x: 5.0, z: -4.6, color: 0x1a3a6b },
    { id: "sac", x: -1.2, z: -1.2, color: 0x1a1a1e },
    { id: "sac_rouge", x: 1.2, z: -1.2, color: 0x8a2020 },
    { id: "chaine", x: -4.0, z: 1.0, color: 0xc9a84c },
    { id: "bague", x: -3.2, z: 1.0, color: 0xc9a84c },
    { id: "montre", x: -2.4, z: 1.0, color: 0xc9a84c },
  ];
  for (const s of spots) {
    g.add(productCard(s.id, s.x, 1.52, s.z + 0.08));
    garments.push({ itemId: s.id, x: s.x, z: s.z });
  }

  const lampA = new THREE.PointLight(0xffeedd, 1.4, 14, 2);
  lampA.position.set(0, 2.8, 0);
  g.add(lampA);
  const lampB = new THREE.PointLight(0xa78bfa, 0.55, 8, 2);
  lampB.position.set(-4, 2.4, 2);
  g.add(lampB);

  const exitPlate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.08), matLib.getEmissive(0x8fa8b8, 0xc8dce8, 0.35));
  exitPlate.position.set(0, 1.15, D / 2 - 0.14);
  g.add(exitPlate);

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, D / 2 - 1.9),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.55),
    walls,
    title: "Boutique Éther",
    subtitle: "Québec · cabines, caisse, vitrine",
    garments,
    caisse: { x: -3.8, z: -5.8 },
  };
}
