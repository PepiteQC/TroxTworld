import * as THREE from "three";
import { ak74Held } from "./ak74";
import { carabineHeld } from "./carabine";
import { bobombProp } from "./bobomb";
import { ar15Held, shotgunHeld, pistolHeld } from "./guns";
import { matLib } from "./materials";
import { getPoiAt, getSurfaceAt, getVillageAt, getZoneName } from "./worlddata";

export type WorkToolId = "marteau" | "pelle" | "rateau" | "perceuse" | "tronconneuse" | "casque" | "gilet" | "boite";

export function isWorkTool(id: string): id is WorkToolId {
  return id === "marteau" || id === "pelle" || id === "rateau" || id === "perceuse" || id === "tronconneuse" || id === "casque" || id === "gilet" || id === "boite" || id === "cle";
}

function steel() {
  return matLib.get(0x6b6f75, 0.35, 0.85);
}
function wood() {
  return matLib.get(0x8a5a2f, 0.7);
}
function plastic(c: number) {
  return matLib.get(c, 0.45, 0.08);
}

export function buildMarteau(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.32, 8), wood());
  manche.position.y = 0.16;
  g.add(manche);
  const tete = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.04), steel());
  tete.position.y = 0.32;
  tete.castShadow = true;
  g.add(tete);
  return g;
}

export function buildPelle(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.85, 8), wood());
  manche.position.y = 0.42;
  g.add(manche);
  const lame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.012), steel());
  lame.position.y = 0.02;
  lame.rotation.x = -0.18;
  lame.castShadow = true;
  g.add(lame);
  return g;
}

export function buildRateau(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.9, 8), wood());
  manche.position.y = 0.45;
  g.add(manche);
  const barre = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.016, 0.012), steel());
  barre.position.y = 0.02;
  g.add(barre);
  for (let i = 0; i < 7; i++) {
    const dent = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.01), steel());
    dent.position.set(-0.09 + i * 0.03, -0.03, 0);
    g.add(dent);
  }
  return g;
}

export function buildPerceuse(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.07), plastic(0xf0c020));
  corps.position.set(0.02, 0.08, 0);
  corps.castShadow = true;
  g.add(corps);
  const poignee = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), plastic(0x1c1c1e));
  poignee.position.set(-0.04, 0.0, 0);
  g.add(poignee);
  const meche = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), steel());
  meche.rotation.z = Math.PI / 2;
  meche.position.set(0.14, 0.08, 0);
  g.add(meche);
  return g;
}

export function buildTronconneuse(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.1), plastic(0xf0761c));
  corps.position.set(-0.04, 0.08, 0);
  corps.castShadow = true;
  g.add(corps);
  const barre = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.012), steel());
  barre.position.set(0.18, 0.08, 0);
  g.add(barre);
  return g;
}

export function buildCasque(): THREE.Group {
  const g = new THREE.Group();
  const coque = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.8), plastic(0xf0c020));
  g.add(coque);
  const bord = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12), plastic(0xf0c020));
  bord.position.y = -0.02;
  g.add(bord);
  return g;
}

export function buildGilet(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.12), matLib.getEmissive(0xe8e820, 0xe8e820, 0.12));
  corps.position.y = 0.2;
  g.add(corps);
  return g;
}

export function buildBoiteOutils(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.16), plastic(0xc9302c));
  corps.position.y = 0.09;
  corps.castShadow = true;
  g.add(corps);
  const poignee = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 10, Math.PI), steel());
  poignee.rotation.z = Math.PI;
  poignee.position.y = 0.22;
  g.add(poignee);
  return g;
}

function _buildPistol(): THREE.Group {
  const g = new THREE.Group();
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.032, 0.028), steel());
  slide.position.set(0.04, 0.05, 0);
  slide.castShadow = true;
  g.add(slide);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.024), wood());
  grip.position.set(-0.02, -0.02, 0);
  grip.rotation.z = 0.18;
  g.add(grip);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 8), steel());
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.12, 0.05, 0);
  g.add(barrel);
  return g;
}

export function buildHeldTool(id: string): THREE.Group | null {
  let inner: THREE.Group | null = null;
  const wrap = new THREE.Group();
  wrap.name = "held-tool";
  if (id === "marteau" || id === "cle") {
    inner = buildMarteau();
    wrap.position.set(0.3, 0.74, 0.1);
    wrap.rotation.set(-0.5, 0.35, 0.2);
    wrap.scale.setScalar(0.9);
  } else if (id === "pelle") {
    inner = buildPelle();
    wrap.position.set(0.22, 0.55, 0.18);
    wrap.rotation.set(0.15, 0.1, 0.4);
    wrap.scale.setScalar(0.55);
  } else if (id === "rateau") {
    inner = buildRateau();
    wrap.position.set(0.22, 0.52, 0.18);
    wrap.rotation.set(0.15, 0.1, 0.45);
    wrap.scale.setScalar(0.5);
  } else if (id === "perceuse") {
    inner = buildPerceuse();
    wrap.position.set(0.32, 0.78, 0.16);
    wrap.rotation.set(0.2, 1.2, 0.4);
    wrap.scale.setScalar(0.9);
  } else if (id === "tronconneuse") {
    inner = buildTronconneuse();
    wrap.position.set(0.28, 0.78, 0.28);
    wrap.rotation.set(0.1, 0.6, 0.2);
    wrap.scale.setScalar(0.7);
  } else if (id === "casque") {
    inner = buildCasque();
    wrap.position.set(0, 1.86, 0.02);
  } else if (id === "gilet") {
    inner = buildGilet();
    wrap.position.set(0, 1.18, 0.02);
    wrap.scale.setScalar(1.05);
  } else if (id === "boite") {
    inner = buildBoiteOutils();
    wrap.position.set(0.28, 0.55, 0.12);
    wrap.rotation.set(0, 0.4, 0);
    wrap.scale.setScalar(0.55);
  } else if (id === "ak74") {
    inner = ak74Held();
    wrap.position.set(0.18, 0.98, 0.22);
    wrap.rotation.set(0.22, 0.08, 0.18);
    wrap.scale.setScalar(0.95);
  } else if (id === "ar15") {
    inner = ar15Held();
    wrap.position.set(0.18, 0.96, 0.22);
    wrap.rotation.set(0.2, 0.08, 0.16);
    wrap.scale.setScalar(0.95);
  } else if (id === "shotgun") {
    inner = shotgunHeld();
    wrap.position.set(0.16, 0.94, 0.24);
    wrap.rotation.set(0.18, 0.05, 0.12);
    wrap.scale.setScalar(0.95);
  } else if (id === "carabine") {
    inner = carabineHeld();
    wrap.position.set(0.16, 0.96, 0.24);
    wrap.rotation.set(0.18, 0.06, 0.14);
    wrap.scale.setScalar(0.92);
  } else if (id === "bobomb") {
    inner = bobombProp();
    wrap.position.set(0.26, 0.72, 0.14);
    wrap.rotation.set(0.1, 0.4, 0.15);
    wrap.scale.setScalar(0.7);
  } else if (id === "pistol") {
    inner = pistolHeld();
    wrap.position.set(0.28, 0.9, 0.18);
    wrap.rotation.set(0.18, 0.2, 0.28);
    wrap.scale.setScalar(1.05);
  }
  if (!inner) return null;
  wrap.add(inner);
  return wrap;
}

export interface WorkJob {
  label: string;
  pay: number;
  loot?: string;
}

export function workJobAt(toolId: string | null, x: number, z: number): WorkJob | null {
  if (!toolId) return null;
  const zone = getZoneName(x, z);
  const surf = getSurfaceAt(x, z);
  const village = getVillageAt(x, z);
  const poi = getPoiAt(x, z);
  if (poi?.id === "donnacona_papeterie" && (toolId === "casque" || toolId === "gilet" || toolId === "perceuse")) {
    return { label: "Quart machine à papier", pay: 54, loot: "papier" };
  }
  if ((toolId === "pelle" || toolId === "rateau") && (surf.key === "grass" || surf.key === "clay") && z < 70) {
    return { label: toolId === "pelle" ? "Foin rentré" : "Rang ratissé", pay: toolId === "pelle" ? 28 : 22 };
  }
  if ((toolId === "marteau" || toolId === "perceuse") && village) {
    return { label: "Chantier du village", pay: toolId === "perceuse" ? 36 : 24 };
  }
  if (toolId === "tronconneuse" && (z < -360 || zone.includes("Forêt") || zone.includes("Laurent"))) {
    return { label: "Bois de chauffage", pay: 48 };
  }
  if ((toolId === "cle" || toolId === "boite") && surf.key === "asphalt") {
    return { label: "Mécanique de rang", pay: 32 };
  }
  return null;
}
