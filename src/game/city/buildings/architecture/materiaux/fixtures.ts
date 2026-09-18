/**
 * Portes sécurisées, salles de bain, fenêtres à rideaux — builders Three.js
 * (palette PBR québécoise, pas de R3F).
 */
import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { tex } from "./textures";

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildCardReader(x = 0, y = 1.12, z = 0.06) {
  const g = new THREE.Group();
  g.name = "card-reader";
  g.position.set(x, y, z);
  const body = box(0.1, 0.15, 0.03, matLib.get(0x1a1a1a, 0.45, 0.55));
  const pad = box(0.07, 0.08, 0.006, matLib.get(0x0f172a, 0.25, 0.8), 0, -0.02, 0.016);
  const led = box(0.03, 0.015, 0.005, matLib.getEmissive(0x22c55e, 0x22c55e, 0.9), 0, 0.055, 0.016);
  const stripe = box(0.04, 0.01, 0.002, matLib.getEmissive(0x22c55e, 0x22c55e, 0.45), 0, -0.065, 0.016);
  g.add(body, pad, led, stripe);
  return g;
}

export function buildSecurityDoor() {
  const g = new THREE.Group();
  g.name = "security-door";
  const steel = matLib.get(0x111827, 0.42, 0.55);
  const leaf = matLib.get(0x1a1a2e, 0.38, 0.62);
  const chrome = matLib.get(0x6b7280, 0.18, 0.9);
  g.add(box(0.08, 2.3, 0.15, steel, -0.48, 1.15, 0));
  g.add(box(0.08, 2.3, 0.15, steel, 0.48, 1.15, 0));
  g.add(box(1.04, 0.08, 0.15, steel, 0, 2.28, 0));
  const door = new THREE.Group();
  door.name = "security-leaf";
  door.position.set(-0.45, 0, 0);
  door.add(box(0.9, 2.2, 0.08, leaf, 0.45, 1.1, 0));
  door.add(box(0.12, 0.04, 0.04, chrome, 0.8, 1.05, 0.06));
  const knob = cyl(0.02, 0.08, chrome, 0.82, 1.05, 0.1);
  knob.rotation.x = Math.PI / 2;
  door.add(knob);
  const peep = cyl(0.015, 0.1, matLib.get(0x0a0a0a, 0.5, 0.4), 0.45, 1.5, 0.045);
  peep.rotation.x = Math.PI / 2;
  door.add(peep);
  g.add(door);
  g.add(buildCardReader(0.62, 1.12, 0.08));
  return g;
}

export function buildBathroomFixtures() {
  const g = new THREE.Group();
  g.name = "bathroom-fixtures";
  const porcelain = matLib.get(0xf4f1ea, 0.22, 0.08);
  const chrome = matLib.get(0xc8ccd0, 0.16, 0.9);
  const tile = tex.mat("betonMur", 1.6, 1.2, 0.78, 0.05);

  const toilet = new THREE.Group();
  toilet.add(box(0.42, 0.38, 0.52, porcelain, 0, 0.32, 0));
  toilet.add(box(0.4, 0.46, 0.16, porcelain, 0, 0.7, -0.22));
  toilet.add(cyl(0.16, 0.08, porcelain, 0, 0.54, 0.04, 12));
  toilet.add(cyl(0.03, 0.12, chrome, 0.14, 0.92, -0.22));
  toilet.position.set(-0.7, 0, 0);
  g.add(toilet);

  const sink = new THREE.Group();
  sink.add(box(0.62, 0.08, 0.42, porcelain, 0, 0.88, 0));
  sink.add(box(0.08, 0.82, 0.08, tile, -0.22, 0.41, 0.12));
  sink.add(box(0.08, 0.82, 0.08, tile, 0.22, 0.41, 0.12));
  sink.add(cyl(0.12, 0.05, porcelain, 0, 0.9, 0.02, 12));
  const tap = cyl(0.018, 0.16, chrome, 0, 1.02, -0.12);
  sink.add(tap);
  const spout = cyl(0.014, 0.12, chrome, 0, 1.08, -0.04);
  spout.rotation.x = Math.PI / 2;
  sink.add(spout);
  sink.position.set(0.55, 0, -0.1);
  g.add(sink);

  const tub = new THREE.Group();
  tub.add(box(1.55, 0.48, 0.72, porcelain, 0, 0.28, 0));
  tub.add(box(1.48, 0.08, 0.64, matLib.glass(0x9ec8e0, 0.35), 0, 0.42, 0));
  tub.position.set(0, 0, 1.15);
  g.add(tub);

  return g;
}

export function buildWindowWithCurtains(width = 1.35, height = 1.55) {
  const g = new THREE.Group();
  g.name = "window-curtains";
  const frame = matLib.get(QC_PALETTE.porte, 0.72);
  const wood = tex.cloth("laine", "laineNrm", 1.4, 1.2, 0.9, 0x6a3a3a, 0.4);
  g.add(box(width + 0.1, 0.06, 0.08, frame, 0, height + 0.03, 0));
  g.add(box(width + 0.1, 0.06, 0.08, frame, 0, 0.03, 0));
  g.add(box(0.06, height, 0.08, frame, -width / 2, height / 2, 0));
  g.add(box(0.06, height, 0.08, frame, width / 2, height / 2, 0));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, height - 0.1, 0.02), matLib.glass(0xb8d4e8, 0.32));
  glass.position.set(0, height / 2, 0);
  g.add(glass);
  const rod = cyl(0.018, width + 0.16, matLib.get(0xc8a040, 0.28, 0.75), 0, height + 0.08, 0.08);
  rod.rotation.z = Math.PI / 2;
  g.add(rod);
  for (const s of [-1, 1] as const) {
    const drape = box(width * 0.28, height * 0.92, 0.04, wood, s * width * 0.32, height * 0.48, 0.1);
    drape.rotation.y = s * 0.12;
    g.add(drape);
  }
  return g;
}

export { buildSecurityDoor as SecurityDoor, buildBathroomFixtures as BathroomFixtures, buildWindowWithCurtains as WindowWithCurtains };
