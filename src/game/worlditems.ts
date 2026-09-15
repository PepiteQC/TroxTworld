/**
 * Collectibles du comté — lingots, cristaux d'éther, trésors de rang.
 * Placés hors chaussée, collés au relief.
 */
import * as THREE from "three";
import { matLib } from "./materials";
import { getTerrainHeight, SQ_JAIL, VILLAGES } from "./worlddata";

export interface WorldItemDef {
  id: string;
  itemId: string;
  name: string;
  color: number;
  cash: number;
  x: number;
  z: number;
}

const SIDE = 16;

function offStreet(x: number, z: number, yaw: number, side = SIDE): { x: number; z: number } {
  return {
    x: x + Math.sin(yaw) * side + Math.cos(yaw) * 4,
    z: z - Math.cos(yaw) * side + Math.sin(yaw) * 4,
  };
}

function defs(): WorldItemDef[] {
  const spots: WorldItemDef[] = [];
  const catalog: Array<{ village: string; itemId: string; name: string; color: number; cash: number; side?: number }> = [
    { village: "grondines", itemId: "lingot", name: "Lingot d'or", color: 0xfacc15, cash: 120, side: 18 },
    { village: "deschambault", itemId: "fromage_grains", name: "Fromage en grains", color: 0xf4e4a4, cash: 12, side: -17 },
    { village: "portneuf", itemId: "cle_rouillee", name: "Clé rouillée", color: 0xb4532a, cash: 25, side: 20 },
    { village: "cap_sante", itemId: "cristal_ether", name: "Cristal d'éther", color: 0x38bdf8, cash: 85, side: -19 },
    { village: "donnacona", itemId: "fiole_ether", name: "Fiole magique", color: 0xa855f7, cash: 70, side: 17 },
    { village: "neuville", itemId: "pepite", name: "Pépite rare", color: 0x10b981, cash: 95, side: -16 },
    { village: "pont_rouge", itemId: "medaille_sq", name: "Médaille SQ", color: 0x3b82f6, cash: 40, side: 19 },
    { village: "saint_alban", itemId: "cristal_ether", name: "Cristal d'éther", color: 0x7dd3fc, cash: 85, side: 22 },
    { village: "saint_casimir", itemId: "lingot", name: "Lingot d'or", color: 0xeab308, cash: 120, side: -20 },
    { village: "saint_raymond", itemId: "pepite", name: "Pépite rare", color: 0x34d399, cash: 95, side: 18 },
  ];
  for (const row of catalog) {
    const v = VILLAGES.find((g) => g.id === row.village);
    if (!v) continue;
    const p = offStreet(v.center[0], v.center[1], v.roadAngle, row.side ?? SIDE);
    spots.push({
      id: `loot_${row.village}_${row.itemId}`,
      itemId: row.itemId,
      name: row.name,
      color: row.color,
      cash: row.cash,
      x: p.x,
      z: p.z,
    });
  }
  const sq = offStreet(SQ_JAIL.x, SQ_JAIL.z, 0.2, 14);
  spots.push({
    id: "loot_sq_medaille",
    itemId: "medaille_sq",
    name: "Médaille SQ",
    color: 0x60a5fa,
    cash: 40,
    x: sq.x,
    z: sq.z,
  });
  return spots;
}

export const WORLD_ITEM_DEFS = defs();

function buildGem(color: number) {
  const g = new THREE.Group();
  const mat = matLib.get(color, 0.22, 0.55);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat);
  core.castShadow = true;
  g.add(core);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.52, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.name = "loot-ring";
  g.add(ring);
  return g;
}

interface Slot {
  def: WorldItemDef;
  mesh: THREE.Group;
  collected: boolean;
}

export class WorldItemField {
  group = new THREE.Group();
  private slots: Slot[] = [];

  build(looted: string[] = []) {
    this.group.name = "world-items";
    this.slots = [];
    for (const def of WORLD_ITEM_DEFS) {
      const mesh = buildGem(def.color);
      const y = getTerrainHeight(def.x, def.z) + 0.55;
      mesh.position.set(def.x, y, def.z);
      mesh.name = def.id;
      const taken = looted.includes(def.id);
      mesh.visible = !taken;
      this.group.add(mesh);
      this.slots.push({ def, mesh, collected: taken });
    }
  }

  tick(elapsed: number) {
    for (const slot of this.slots) {
      if (slot.collected) continue;
      slot.mesh.rotation.y = elapsed * 1.15;
      slot.mesh.position.y = getTerrainHeight(slot.def.x, slot.def.z) + 0.52 + Math.sin(elapsed * 2.1 + slot.def.x) * 0.08;
      const ring = slot.mesh.getObjectByName("loot-ring");
      if (ring) {
        const s = 1 + Math.sin(elapsed * 1.6 + slot.def.z) * 0.12;
        ring.scale.set(s, 1, s);
      }
    }
  }

  nearest(x: number, z: number, max = 2.4) {
    let best: Slot | null = null;
    let bestD = max;
    for (const slot of this.slots) {
      if (slot.collected) continue;
      const d = Math.hypot(x - slot.def.x, z - slot.def.z);
      if (d < bestD) {
        best = slot;
        bestD = d;
      }
    }
    return best ? { ...slotView(best), dist: bestD } : null;
  }

  collect(id: string) {
    const slot = this.slots.find((s) => s.def.id === id);
    if (!slot || slot.collected) return null;
    slot.collected = true;
    slot.mesh.visible = false;
    return slot.def;
  }
}

function slotView(slot: Slot) {
  return { id: slot.def.id, itemId: slot.def.itemId, name: slot.def.name, cash: slot.def.cash, x: slot.def.x, z: slot.def.z };
}
