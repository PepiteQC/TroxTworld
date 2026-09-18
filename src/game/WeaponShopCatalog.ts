/**
 * 🏪 WeaponShopCatalog.ts — TROXTWORLD (v5.0 PLATINUM)
 * Catalogue complet de l'armurerie/coutellerie du comté.
 * 
 * Intègre le catalogue d'armes v5.0 avec génération procédurale de modèles 3D.
 * Chaque item expose createModel() pour l'affichage dans la boutique.
 * Mobilier enrichi : comptoirs, râteliers, vitrines, sécurité, déco, éclairage.
 */

import * as THREE from "three";
import { matLib } from "./materials";
import {
  WEAPON_CATALOG,
  WEAPONS,
  MOD_CATALOG,
  AMMO_CATALOG,
  type WeaponTemplate,
  type WeaponId,
  type WeaponCategory,
  type ModId,
  type AmmoCaliber,
} from "./weapons";

// ============================================================================
// 🔹 TYPES
// ============================================================================

export type ShopItemCategory =
  | "arme_a_feu"
  | "couteau"
  | "munition"
  | "mod"
  | "equipement"
  | "mobilier"
  | "decoration";

export interface WeaponShopItem {
  id: string;
  name: string;
  category: ShopItemCategory;
  price: number;
  desc: string;
  /** ID lié au catalogue weapons.ts (si applicable) */
  weaponId?: WeaponId;
  modId?: ModId;
  ammoCaliber?: AmmoCaliber;
  /** Rarity pour affichage UI */
  rarity?: string;
  /** Tags pour filtrage en boutique */
  tags: string[];
  createModel(): THREE.Group;
}

// ============================================================================
// 🎨 MATÉRIAUX RÉUTILISABLES
// ============================================================================

const steelMat = (): any => matLib.get(0x2a2d30, 0.32, 0.85);
const darkMat = (): any => matLib.get(0x1c1e22, 0.62, 0.12);
const woodMat = (): any => matLib.get(0x5a4632, 0.78, 0.06);
const polymerMat = (): any => matLib.get(0x1a1c20, 0.55, 0.08);
const brassMat = (): any => matLib.get(0xb8943e, 0.35, 0.75);
const leatherMat = (): any => matLib.get(0x3d2b1f, 0.72, 0.05);
const rubberMat = (): any => matLib.get(0x0e0e0e, 0.85, 0.02);

const glassMat = (opacity: number, transmission: number): THREE.MeshPhysicalMaterial =>
  new THREE.MeshPhysicalMaterial({
    color: 0x9fd6ff,
    transparent: true,
    opacity,
    roughness: 0.06,
    metalness: 0.1,
    transmission,
  });

const neonMat = (color: number, intensity: number = 0.8): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.1,
  });

// ============================================================================
// 🛠️ UTILITAIRES GÉOMÉTRIQUES
// ============================================================================

const _box = new THREE.Box3();
const _center = new THREE.Vector3();

/** Recentre un groupe sur son centre de gravité. */
function recenter(g: THREE.Group): void {
  _box.setFromObject(g);
  _box.getCenter(_center);
  for (const child of g.children) {
    child.position.sub(_center);
  }
}

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Crée un texte flottant simple via CanvasTexture. */
function createLabel(text: string, width: number = 256, height: number = 64): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(0, 0, width, height, 8);
  ctx.fill();
  ctx.fillStyle = "#f0e6d2";
  ctx.font = `bold ${Math.floor(height * 0.5)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width / 512, height / 512), mat);
  plane.castShadow = false;
  return plane;
}

// ============================================================================
// 🔫 GÉNÉRATEURS DE MODÈLES D'ARMES PROCÉDURAUX
// ============================================================================

interface RifleSpec {
  name: string;
  barrel: number;
  wood: boolean;
  mag: boolean;
  sight: boolean;
  pump?: boolean;
  suppressor?: boolean;
  stockType?: "fixed" | "collapsible" | "none";
  gripAngle?: number;
  barrelThickness?: number;
}

function buildRifle(spec: RifleSpec): THREE.Group {
  const g = new THREE.Group();
  g.name = spec.name;
  const steel = steelMat();
  const polymer = polymerMat();
  const body = spec.wood ? woodMat() : polymer;
  const bt = spec.barrelThickness ?? 0.014;

  // Receiver
  const rec = mesh(new THREE.BoxGeometry(0.16, 0.065, 0.045), body, -0.02, 0.01, 0);
  g.add(rec);

  // Barrel
  const barrel = mesh(
    new THREE.CylinderGeometry(bt, bt, spec.barrel, 10),
    steel,
    0.11 + spec.barrel / 2,
    0.015,
    0,
  );
  barrel.rotation.z = Math.PI / 2;
  g.add(barrel);

  // Front sight
  if (!spec.suppressor) {
    const frontSight = mesh(
      new THREE.BoxGeometry(0.02, 0.055, 0.016),
      steel,
      0.11 + spec.barrel + 0.01,
      0.05,
      0,
    );
    g.add(frontSight);
  }

  // Stock
  const stockType = spec.stockType ?? "fixed";
  if (stockType === "fixed") {
    const stock = mesh(new THREE.BoxGeometry(0.3, 0.058, 0.042), body, -0.28, -0.005, 0);
    stock.rotation.z = 0.06;
    g.add(stock);
  } else if (stockType === "collapsible") {
    const tube = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), steel, -0.22, 0.01, 0);
    tube.rotation.z = Math.PI / 2;
    g.add(tube);
    const pad = mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), rubberMat(), -0.34, 0.0, 0);
    g.add(pad);
  }

  // Grip
  const angle = spec.gripAngle ?? 0.24;
  const grip = mesh(new THREE.BoxGeometry(0.042, 0.12, 0.032), body, -0.045, -0.07, 0);
  grip.rotation.z = angle;
  g.add(grip);

  // Magazine
  if (spec.mag) {
    const mag = mesh(new THREE.BoxGeometry(0.055, 0.14, 0.036), body, 0.07, -0.085, 0);
    mag.rotation.z = 0.1;
    g.add(mag);
  }

  // Optic
  if (spec.sight) {
    const scope = mesh(new THREE.BoxGeometry(0.13, 0.06, 0.032), steel, 0.05, 0.085, 0);
    g.add(scope);
    // Lens caps
    const lensF = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.005, 8), glassMat(0.3, 0.5), 0.115, 0.085, 0);
    lensF.rotation.z = Math.PI / 2;
    g.add(lensF);
  }

  // Pump action
  if (spec.pump) {
    const pump = mesh(new THREE.BoxGeometry(0.15, 0.048, 0.042), woodMat(), 0.2, -0.04, 0);
    g.add(pump);
  }

  // Suppressor
  if (spec.suppressor) {
    const supp = mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.18, 12),
      darkMat(),
      0.11 + spec.barrel + 0.09,
      0.015,
      0,
    );
    supp.rotation.z = Math.PI / 2;
    g.add(supp);
  }

  recenter(g);
  return g;
}

interface PistolSpec {
  name: string;
  slideColor?: number;
  hasRail?: boolean;
  hasOptic?: boolean;
  compact?: boolean;
  revolver?: boolean;
}

function buildPistol(spec?: PistolSpec): THREE.Group {
  const g = new THREE.Group();
  const sName = spec?.name ?? "pistol";
  g.name = sName;
  const steel = spec?.slideColor ? matLib.get(spec.slideColor, 0.3, 0.8) : steelMat();
  const polymer = polymerMat();

  if (spec?.revolver) {
    // Revolver build
    const frame = mesh(new THREE.BoxGeometry(0.14, 0.04, 0.032), steel, 0, 0.02, 0);
    g.add(frame);
    const barrel = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.1, 8), steel, 0.12, 0.025, 0);
    barrel.rotation.z = Math.PI / 2;
    g.add(barrel);
    const cylinder = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 12), steel, 0.02, 0.025, 0);
    cylinder.rotation.z = Math.PI / 2;
    g.add(cylinder);
    const grip = mesh(new THREE.BoxGeometry(0.038, 0.11, 0.03), woodMat(), -0.06, -0.05, 0);
    grip.rotation.z = 0.2;
    g.add(grip);
    const triggerGuard = mesh(new THREE.TorusGeometry(0.018, 0.003, 6, 12, Math.PI), steel, -0.01, -0.01, 0);
    g.add(triggerGuard);
  } else {
    // Semi-auto pistol build
    const scale = spec?.compact ? 0.75 : 1.0;
    const slideLen = 0.18 * scale;
    const barrelLen = 0.07 * scale;

    const slide = mesh(new THREE.BoxGeometry(slideLen, 0.042, 0.03), steel, 0.02 * scale, 0.03, 0);
    g.add(slide);

    const barrel = mesh(new THREE.CylinderGeometry(0.008, 0.008, barrelLen, 8), steel, slideLen / 2 + barrelLen / 2 + 0.02 * scale, 0.03, 0);
    barrel.rotation.z = Math.PI / 2;
    g.add(barrel);

    const frame = mesh(new THREE.BoxGeometry(0.1 * scale, 0.032, 0.032), polymer, -0.05 * scale, 0.0, 0);
    g.add(frame);

    const grip = mesh(new THREE.BoxGeometry(0.036 * scale, 0.1 * scale, 0.028), polymer, -0.03 * scale, -0.06 * scale, 0);
    grip.rotation.z = 0.14;
    g.add(grip);

    if (spec?.hasRail) {
      const rail = mesh(new THREE.BoxGeometry(0.04 * scale, 0.008, 0.024), polymer, 0.04 * scale, -0.005, 0);
      g.add(rail);
    }

    if (spec?.hasOptic) {
      const optic = mesh(new THREE.BoxGeometry(0.04, 0.025, 0.025), darkMat(), 0.0, 0.058, 0);
      g.add(optic);
      const lens = mesh(new THREE.BoxGeometry(0.005, 0.015, 0.018), neonMat(0xff3333, 0.5), 0.02, 0.058, 0);
      g.add(lens);
    }
  }

  recenter(g);
  return g;
}

function buildKnife(name: string, len: number, black = false, karambit = false): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  const bladeM = black ? matLib.get(0x16181a, 0.35, 0.75) : steelMat();
  const handleM = black ? matLib.get(0x151515, 0.6, 0.15) : woodMat();
  const bolsterM = black ? bladeM : steelMat();

  if (karambit) {
    // Karambit curved blade
    const curve = new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI * 0.7);
    const blade = mesh(curve, bladeM, 0, 0.01, 0.02);
    blade.rotation.y = Math.PI / 2;
    g.add(blade);
    const handle = mesh(new THREE.BoxGeometry(0.028, 0.022, 0.09), handleM, 0, -0.004, -0.04);
    g.add(handle);
    const ring = mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 12), steelMat(), 0, -0.004, -0.09);
    g.add(ring);
  } else {
    const bladeLen = len * 0.55;
    const handleLen = len - bladeLen - 0.03;

    const blade = mesh(
      new THREE.BoxGeometry(0.036, 0.012, bladeLen - 0.04),
      bladeM,
      0,
      0.008,
      0.02 + (bladeLen - 0.04) / 2,
    );
    g.add(blade);

    const tip = mesh(
      new THREE.BoxGeometry(0.02, 0.012, 0.04),
      bladeM,
      0,
      0.008,
      0.02 + bladeLen - 0.02,
    );
    g.add(tip);

    const bolster = mesh(new THREE.BoxGeometry(0.052, 0.03, 0.024), bolsterM, 0, 0.004, 0.005);
    g.add(bolster);

    const handle = mesh(
      new THREE.BoxGeometry(0.03, 0.022, handleLen),
      handleM,
      0,
      -0.004,
      -handleLen / 2 - 0.012,
    );
    g.add(handle);
  }

  recenter(g);
  return g;
}

function buildAmmoBox(caliber: AmmoCaliber): THREE.Group {
  const g = new THREE.Group();
  g.name = `ammo_${caliber}`;
  const spec = AMMO_CATALOG[caliber];

  // Couleur selon disponibilité
  let boxColor = 0x4a6b3a; // Courante = vert olive
  if (spec.legalAvailability === "restreinte") boxColor = 0x8b6914;
  if (spec.legalAvailability === "marche_noir") boxColor = 0x2a1a1a;
  if (spec.legalAvailability === "police_only") boxColor = 0x1a2a4a;

  const boxMat = matLib.get(boxColor, 0.7, 0.1);
  const w = 0.08 + (spec.boxQuantity > 25 ? 0.04 : 0);
  const h = 0.04 + (spec.boxQuantity > 50 ? 0.02 : 0);
  const d = 0.05;

  const box = mesh(new THREE.BoxGeometry(w, h, d), boxMat, 0, h / 2, 0);
  g.add(box);

  // Étiquette
  const label = createLabel(spec.name.substring(0, 20), 256, 64);
  label.position.set(0, h / 2, d / 2 + 0.001);
  label.scale.set(0.8, 0.8, 0.8);
  g.add(label);

  return g;
}

function buildModModel(modId: ModId): THREE.Group {
  const g = new THREE.Group();
  g.name = modId;
  const mod = MOD_CATALOG[modId];
  const steel = steelMat();
  const dark = darkMat();

  switch (mod.type) {
    case "optic": {
      const body = mesh(new THREE.BoxGeometry(0.08, 0.04, 0.035), dark, 0, 0.02, 0);
      g.add(body);
      const lensF = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.004, 8), glassMat(0.3, 0.5), 0.04, 0.02, 0);
      lensF.rotation.z = Math.PI / 2;
      g.add(lensF);
      const mount = mesh(new THREE.BoxGeometry(0.03, 0.015, 0.03), steel, 0, -0.005, 0);
      g.add(mount);
      break;
    }
    case "suppressor": {
      const tube = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 12), dark, 0, 0, 0);
      tube.rotation.z = Math.PI / 2;
      g.add(tube);
      const cap = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12), steel, 0.085, 0, 0);
      cap.rotation.z = Math.PI / 2;
      g.add(cap);
      break;
    }
    case "magazine": {
      const mag = mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), dark, 0, 0, 0);
      g.add(mag);
      const base = mesh(new THREE.BoxGeometry(0.042, 0.01, 0.032), steel, 0, -0.065, 0);
      g.add(base);
      break;
    }
    case "grip": {
      const grip = mesh(new THREE.BoxGeometry(0.035, 0.08, 0.03), dark, 0, -0.02, 0);
      grip.rotation.z = 0.2;
      g.add(grip);
      break;
    }
    case "stock": {
      const tube = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8), steel, 0, 0, 0);
      tube.rotation.z = Math.PI / 2;
      g.add(tube);
      const pad = mesh(new THREE.BoxGeometry(0.035, 0.07, 0.035), rubberMat(), -0.1, 0, 0);
      g.add(pad);
      break;
    }
    case "light_laser": {
      const body = mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.06, 8), dark, 0, 0, 0);
      body.rotation.z = Math.PI / 2;
      g.add(body);
      const lens = mesh(new THREE.SphereGeometry(0.008, 8, 6), neonMat(0xffffff, 0.6), 0.035, 0, 0);
      g.add(lens);
      break;
    }
    case "barrel": {
      const bar = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 10), steel, 0, 0, 0);
      bar.rotation.z = Math.PI / 2;
      g.add(bar);
      break;
    }
  }

  recenter(g);
  return g;
}

// ============================================================================
// 🔄 GÉNÉRATEUR AUTOMATIQUE DEPUIS WEAPON_CATALOG
// ============================================================================

/** Mappe une WeaponCategory vers un générateur de modèle 3D. */
function createWeaponModel(weapon: WeaponTemplate): THREE.Group {
  switch (weapon.category) {
    case "melee": {
      if (weapon.id.includes("karambit")) return buildKnife(weapon.id, 0.18, true, true);
      if (weapon.id.includes("couteau")) return buildKnife(weapon.id, 0.26, weapon.id.includes("tactique"));
      if (weapon.id.includes("batte")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const bat = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.85, 10), woodMat(), 0, 0, 0);
        bat.rotation.z = Math.PI / 2;
        g.add(bat);
        recenter(g);
        return g;
      }
      if (weapon.id.includes("hache")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const handle = mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.7, 8), woodMat(), 0, 0, 0);
        handle.rotation.z = Math.PI / 2;
        g.add(handle);
        const head = mesh(new THREE.BoxGeometry(0.12, 0.15, 0.03), steelMat(), 0.3, 0.02, 0);
        g.add(head);
        recenter(g);
        return g;
      }
      if (weapon.id.includes("machette")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const blade = mesh(new THREE.BoxGeometry(0.04, 0.008, 0.4), steelMat(), 0, 0, 0.1);
        g.add(blade);
        const handle = mesh(new THREE.BoxGeometry(0.03, 0.025, 0.12), woodMat(), 0, 0, -0.16);
        g.add(handle);
        recenter(g);
        return g;
      }
      // Fallback melee
      const g = new THREE.Group();
      g.name = weapon.id;
      const blade = mesh(new THREE.BoxGeometry(0.03, 0.01, 0.2), steelMat(), 0, 0, 0.05);
      g.add(blade);
      const handle = mesh(new THREE.BoxGeometry(0.025, 0.02, 0.1), darkMat(), 0, 0, -0.1);
      g.add(handle);
      recenter(g);
      return g;
    }

    case "poing": {
      if (weapon.id.includes("revolver")) {
        return buildPistol({ name: weapon.id, revolver: true });
      }
      if (weapon.id.includes("ruger-lcp")) {
        return buildPistol({ name: weapon.id, compact: true });
      }
      if (weapon.id.includes("desert-eagle")) {
        return buildPistol({ name: weapon.id, slideColor: 0x8a8a8a });
      }
      if (weapon.id.includes("cz-shadow")) {
        return buildPistol({ name: weapon.id, hasOptic: true, hasRail: true });
      }
      if (weapon.id.includes("glock-switch")) {
        return buildPistol({ name: weapon.id, hasRail: true });
      }
      return buildPistol({
        name: weapon.id,
        hasRail: weapon.tags.includes("tactique"),
        hasOptic: weapon.compatibleMods.includes("optic-red-dot"),
      });
    }

    case "fusil_chasse": {
      return buildRifle({
        name: weapon.id,
        barrel: weapon.barrelLengthInches * 0.0254,
        wood: !weapon.id.includes("tactical") && !weapon.id.includes("590") && !weapon.id.includes("benelli"),
        mag: weapon.magazineCapacity > 2,
        sight: weapon.compatibleMods.includes("optic-red-dot"),
        pump: !weapon.id.includes("benelli") && !weapon.id.includes("superpose"),
        stockType: weapon.id.includes("tactical") || weapon.id.includes("590") ? "collapsible" : "fixed",
      });
    }

    case "carabine": {
      return buildRifle({
        name: weapon.id,
        barrel: weapon.barrelLengthInches * 0.0254,
        wood: weapon.id.includes("winchester") || weapon.id.includes("marlin") || weapon.id.includes("henry") || weapon.id.includes("tikka") || weapon.id.includes("savage"),
        mag: weapon.magazineCapacity > 5,
        sight: weapon.compatibleMods.includes("optic-scope-4x") || weapon.compatibleMods.includes("optic-scope-10x"),
        barrelThickness: weapon.id.includes("308") ? 0.018 : 0.014,
      });
    }

    case "tactique_auto": {
      return buildRifle({
        name: weapon.id,
        barrel: weapon.barrelLengthInches * 0.0254,
        wood: false,
        mag: true,
        sight: weapon.compatibleMods.includes("optic-red-dot") || weapon.compatibleMods.includes("optic-holo"),
        stockType: "collapsible",
        gripAngle: 0.3,
        barrelThickness: 0.016,
        suppressor: weapon.compatibleMods.includes("suppressor-556") && weapon.rarity === "legendary",
      });
    }

    case "non_letal":
    case "outil_police": {
      if (weapon.id.includes("taser")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const body = mesh(new THREE.BoxGeometry(0.14, 0.04, 0.035), neonMat(0xf4d03f, 0.3), 0, 0, 0);
        g.add(body);
        const cartL = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), darkMat(), 0.05, 0.02, -0.01);
        cartL.rotation.z = Math.PI / 2;
        g.add(cartL);
        const cartR = cartL.clone();
        cartR.position.z = 0.01;
        g.add(cartR);
        const grip = mesh(new THREE.BoxGeometry(0.035, 0.09, 0.03), darkMat(), -0.04, -0.05, 0);
        grip.rotation.z = 0.15;
        g.add(grip);
        recenter(g);
        return g;
      }
      if (weapon.id.includes("spray")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const can = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 10), matLib.get(0xcc2222, 0.5, 0.2), 0, 0.05, 0);
        g.add(can);
        const nozzle = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.02, 6), darkMat(), 0, 0.105, 0);
        g.add(nozzle);
        recenter(g);
        return g;
      }
      if (weapon.id.includes("menottes")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const ring1 = mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 16), steelMat(), -0.035, 0, 0);
        g.add(ring1);
        const ring2 = mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 16), steelMat(), 0.035, 0, 0);
        g.add(ring2);
        const chain = mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), steelMat(), 0, 0, 0);
        g.add(chain);
        recenter(g);
        return g;
      }
      if (weapon.id.includes("matraque") || weapon.id.includes("tonfa")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const stick = mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.5, 8), darkMat(), 0, 0, 0);
        stick.rotation.z = Math.PI / 2;
        g.add(stick);
        if (weapon.id.includes("tonfa")) {
          const sideGrip = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8), darkMat(), -0.05, 0, 0.04);
          sideGrip.rotation.x = Math.PI / 2;
          g.add(sideGrip);
        }
        recenter(g);
        return g;
      }
      if (weapon.id.includes("flashbang")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const body = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 10), matLib.get(0x4a5a3a, 0.6, 0.3), 0, 0.04, 0);
        g.add(body);
        const pin = mesh(new THREE.TorusGeometry(0.008, 0.002, 4, 8), steelMat(), 0, 0.085, 0);
        g.add(pin);
        recenter(g);
        return g;
      }
      if (weapon.id.includes("bouclier")) {
        const g = new THREE.Group();
        g.name = weapon.id;
        const shield = mesh(
          new THREE.BoxGeometry(0.6, 0.9, 0.02),
          glassMat(0.4, 0.5),
          0,
          0.45,
          0,
        );
        g.add(shield);
        const frame = mesh(new THREE.BoxGeometry(0.62, 0.92, 0.01), steelMat(), 0, 0.45, -0.01);
        g.add(frame);
        const handle = mesh(new THREE.BoxGeometry(0.04, 0.15, 0.06), rubberMat(), 0, 0.35, -0.04);
        g.add(handle);
        recenter(g);
        return g;
      }
      // Fallback non-letal
      const gf = new THREE.Group();
      gf.name = weapon.id;
      const fb = mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), darkMat(), 0, 0, 0);
      gf.add(fb);
      recenter(gf);
      return gf;
    }

    default:
      return buildPistol({ name: weapon.id });
  }
}

// ============================================================================
// 📋 CATALOGUE BOUTIQUE — ARMES (AUTO-GÉNÉRÉ DEPUIS WEAPON_CATALOG)
// ============================================================================

/** Génère automatiquement les items de boutique depuis le catalogue d'armes. */
function generateWeaponShopItems(): WeaponShopItem[] {
  return WEAPON_CATALOG.filter((w) => {
    // Exclure les armes police-only et prohibées du catalogue civil
    // (elles apparaissent dans le marché noir séparément)
    return !w.policeOnly;
  }).map((w) => ({
    id: w.id,
    name: w.name,
    category: (w.category === "melee" ? "couteau" : "arme_a_feu") as ShopItemCategory,
    price: w.priceCAD,
    desc: w.description,
    weaponId: w.id,
    rarity: w.rarity,
    tags: [w.category, w.legal, w.rarity, ...(w.faction ? [w.faction] : []), ...w.tags],
    createModel: () => createWeaponModel(w),
  }));
}

/** Items munitions auto-générés. */
function generateAmmoShopItems(): WeaponShopItem[] {
  return Object.values(AMMO_CATALOG)
    .filter((a) => a.legalAvailability !== "police_only")
    .map((a) => ({
      id: `ammo_${a.caliber}`,
      name: a.name,
      category: "munition" as ShopItemCategory,
      price: a.boxPriceCAD,
      desc: `${a.boxQuantity} cartouches — Vélocité ${a.bulletVelocityMs} m/s — Pénétration ${a.armorPenetrationPct}%`,
      ammoCaliber: a.caliber,
      rarity: a.legalAvailability === "marche_noir" ? "contrabande" : "common",
      tags: ["munition", a.caliber, a.legalAvailability],
      createModel: () => buildAmmoBox(a.caliber),
    }));
}

/** Items mods auto-générés. */
function generateModShopItems(): WeaponShopItem[] {
  return Object.values(MOD_CATALOG)
    .filter((m) => m.legal !== "prohibee")
    .map((m) => ({
      id: `mod_${m.id}`,
      name: m.name,
      category: "mod" as ShopItemCategory,
      price: m.priceCAD,
      desc: m.description,
      modId: m.id,
      rarity: m.rarity,
      tags: ["mod", m.type, m.legal],
      createModel: () => buildModModel(m.id),
    }));
}

// ============================================================================
// 📦 CATALOGUE COMPLET DE LA BOUTIQUE
// ============================================================================

export const WEAPON_SHOP_CATALOG: WeaponShopItem[] = [
  // Armes auto-générées
  ...generateWeaponShopItems(),
  // Munitions
  ...generateAmmoShopItems(),
  // Mods légaux
  ...generateModShopItems(),
];

/** Accès rapide par ID. */
export const SHOP_ITEMS_BY_ID: Record<string, WeaponShopItem> = WEAPON_SHOP_CATALOG.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, WeaponShopItem>
);

/** Filtrer par catégorie. */
export function getShopItemsByCategory(cat: ShopItemCategory): WeaponShopItem[] {
  return WEAPON_SHOP_CATALOG.filter((i) => i.category === cat);
}

/** Filtrer par tag. */
export function getShopItemsByTag(tag: string): WeaponShopItem[] {
  return WEAPON_SHOP_CATALOG.filter((i) => i.tags.includes(tag));
}

/** Recherche texte libre. */
export function searchShopItems(query: string): WeaponShopItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return WEAPON_SHOP_CATALOG;
  return WEAPON_SHOP_CATALOG.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      i.tags.some((t) => t.toLowerCase().includes(q))
  );
}

// ============================================================================
// 🪑 MOBILIER DE BOUTIQUE
// ============================================================================

/** Comptoir vitré de vente — plateau utile ≈ 0.96 m de haut. */
export function buildComptoirVitre(len: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "comptoir_vitre";
  const wood = woodMat();

  const plinthe = mesh(
    new THREE.BoxGeometry(len, 0.5, 0.92),
    matLib.get(0x3a3228, 0.8, 0.05),
    0,
    0.25,
    0,
  );
  g.add(plinthe);

  const vitrine = mesh(
    new THREE.BoxGeometry(len - 0.1, 0.4, 0.52),
    glassMat(0.28, 0.6),
    0,
    0.7,
    -0.1,
  );
  g.add(vitrine);

  const tablette = mesh(
    new THREE.BoxGeometry(len - 0.26, 0.016, 0.44),
    matLib.get(0x22201c, 0.7, 0.3),
    0,
    0.72,
    -0.1,
  );
  g.add(tablette);

  const comptoir = mesh(new THREE.BoxGeometry(len, 0.06, 1.0), wood, 0, 0.93, 0);
  g.add(comptoir);

  // Bande LED décorative
  const bande = mesh(
    new THREE.BoxGeometry(len, 0.05, 0.02),
    neonMat(0xd8a15a, 0.6),
    0,
    0.82,
    0.461,
  );
  bande.castShadow = false;
  g.add(bande);

  // Plaque prix/info
  const infoPlate = mesh(
    new THREE.BoxGeometry(0.3, 0.15, 0.005),
    matLib.get(0x1a1a1a, 0.6, 0.2),
    0,
    0.96,
    0.48,
  );
  g.add(infoPlate);

  return g;
}

/** Râtelier mural avec crochets et éclairage intégré. */
export function buildRatelierMural(len: number, slots: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "ratelier_mural";
  const wood = woodMat();
  const steel = steelMat();

  const panneau = mesh(new THREE.BoxGeometry(len, 1.6, 0.06), wood, 0, 0, 0);
  panneau.castShadow = false;
  g.add(panneau);

  const liteauHaut = mesh(
    new THREE.BoxGeometry(len + 0.08, 0.09, 0.08),
    matLib.get(0x3a3228, 0.8, 0.05),
    0,
    0.8,
    0.02,
  );
  g.add(liteauHaut);

  const liteauBas = mesh(
    new THREE.BoxGeometry(len + 0.08, 0.07, 0.08),
    matLib.get(0x3a3228, 0.8, 0.05),
    0,
    -0.8,
    0.02,
  );
  g.add(liteauBas);

  // Éclairage LED en haut
  const ledStrip = mesh(
    new THREE.BoxGeometry(len - 0.1, 0.015, 0.03),
    neonMat(0xfff4e0, 0.4),
    0,
    0.74,
    0.04,
  );
  ledStrip.castShadow = false;
  g.add(ledStrip);

  for (let s = 0; s < slots; s++) {
    const y = 0.45 - s * 0.28;
    const crochet = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), steel, 0, y, -0.1);
    crochet.rotation.x = Math.PI / 2;
    g.add(crochet);
    const pointe = mesh(new THREE.SphereGeometry(0.016, 8, 8), steel, 0, y, -0.18);
    g.add(pointe);

    // Numéro de slot
    const numLabel = createLabel(`${s + 1}`, 64, 64);
    numLabel.position.set(-len / 2 + 0.08, y, -0.035);
    numLabel.scale.set(0.3, 0.3, 0.3);
    g.add(numLabel);
  }

  return g;
}

/** Vitrine sécurisée haute pour couteaux et armes de poing. */
export function buildVitrineSecurisee(): THREE.Group {
  const g = new THREE.Group();
  g.name = "vitrine_securisee";
  const steel = steelMat();

  const plinthe = mesh(
    new THREE.BoxGeometry(1.1, 0.2, 0.6),
    matLib.get(0x23201c, 0.7, 0.3),
    0,
    0.1,
    0,
  );
  g.add(plinthe);

  const fond = mesh(
    new THREE.BoxGeometry(1.0, 1.28, 0.03),
    matLib.get(0x141414, 0.55, 0.5),
    0,
    0.85,
    -0.26,
  );
  g.add(fond);

  const vitre = mesh(new THREE.BoxGeometry(0.98, 1.26, 0.5), glassMat(0.22, 0.7), 0, 0.85, 0);
  vitre.castShadow = false;
  g.add(vitre);

  const cadre = mesh(new THREE.BoxGeometry(1.06, 0.07, 0.56), steel, 0, 1.52, 0);
  g.add(cadre);

  const montantG = mesh(new THREE.BoxGeometry(0.04, 1.28, 0.56), steel, -0.5, 0.85, 0);
  g.add(montantG);
  const montantD = montantG.clone();
  montantD.position.x = 0.5;
  g.add(montantD);

  // Tablettes intérieures
  for (let i = 0; i < 3; i++) {
    const shelf = mesh(
      new THREE.BoxGeometry(0.92, 0.008, 0.44),
      glassMat(0.15, 0.8),
      0,
      0.45 + i * 0.35,
      0,
    );
    shelf.castShadow = false;
    g.add(shelf);
  }

  // Barre LED statut (vert = déverrouillé)
  const barre = mesh(
    new THREE.BoxGeometry(1.0, 0.02, 0.02),
    neonMat(0x1fbf3a, 0.6),
    0,
    1.46,
    -0.245,
  );
  barre.castShadow = false;
  g.add(barre);

  // Serrure électronique
  const lock = mesh(new THREE.BoxGeometry(0.06, 0.08, 0.02), darkMat(), 0.42, 0.9, 0.27);
  g.add(lock);
  const keypad = mesh(new THREE.BoxGeometry(0.04, 0.05, 0.005), neonMat(0x3366ff, 0.3), 0.42, 0.92, 0.282);
  keypad.castShadow = false;
  g.add(keypad);

  return g;
}

/** Caisse enregistreuse moderne avec écran tactile. */
export function buildCaisseEnregistreuse(): THREE.Group {
  const g = new THREE.Group();
  g.name = "caisse_enregistreuse";
  const steel = steelMat();

  const corps = mesh(
    new THREE.BoxGeometry(0.42, 0.12, 0.36),
    matLib.get(0xb8bcc0, 0.5, 0.35),
    0,
    0.07,
    0,
  );
  g.add(corps);

  const tiroir = mesh(
    new THREE.BoxGeometry(0.4, 0.05, 0.06),
    matLib.get(0x8a8a86, 0.6, 0.3),
    0,
    0.045,
    0.17,
  );
  g.add(tiroir);

  const clavier = mesh(
    new THREE.BoxGeometry(0.26, 0.03, 0.2),
    darkMat(),
    0,
    0.15,
    -0.02,
  );
  g.add(clavier);

  const ecran = mesh(
    new THREE.BoxGeometry(0.32, 0.11, 0.03),
    neonMat(0x9fd6ff, 0.7),
    0.02,
    0.22,
    -0.08,
  );
  ecran.rotation.x = 0.3;
  g.add(ecran);

  const bras = mesh(new THREE.BoxGeometry(0.015, 0.06, 0.015), steel, 0.02, 0.18, -0.08);
  g.add(bras);

  // Lecteur carte
  const reader = mesh(new THREE.BoxGeometry(0.08, 0.04, 0.1), darkMat(), -0.22, 0.14, 0.05);
  g.add(reader);
  const readerLed = mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), neonMat(0x1fbf3a, 0.8), -0.22, 0.165, 0.1);
  readerLed.castShadow = false;
  g.add(readerLed);

  return g;
}

/** Coffre-fort de réserve avec serrure combinée. */
export function buildCoffreFort(): THREE.Group {
  const g = new THREE.Group();
  g.name = "coffre_fort";
  const steel = steelMat();

  const corps = mesh(
    new THREE.BoxGeometry(0.7, 0.75, 0.55),
    matLib.get(0x232428, 0.42, 0.85),
    0,
    0.375,
    0,
  );
  g.add(corps);

  const porte = mesh(
    new THREE.BoxGeometry(0.68, 0.73, 0.07),
    matLib.get(0x3a3d42, 0.4, 0.8),
    0,
    0.375,
    0.28,
  );
  g.add(porte);

  const molette = mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.035, 16),
    matLib.get(0x8a8f96, 0.3, 0.9),
    0,
    0.48,
    0.325,
  );
  molette.rotation.x = Math.PI / 2;
  g.add(molette);

  // Marqueurs sur la molette
  for (let i = 0; i < 12; i++) {
    const tick = mesh(new THREE.BoxGeometry(0.003, 0.015, 0.003), neonMat(0xffffff, 0.3), 0, 0.48, 0.345);
    tick.rotation.z = (i * Math.PI * 2) / 12;
    tick.position.x += Math.cos((i * Math.PI * 2) / 12) * 0.07;
    tick.position.y += Math.sin((i * Math.PI * 2) / 12) * 0.07 - 0.48 + 0.48;
    g.add(tick);
  }

  const poignee = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), steel, 0.16, 0.33, 0.33);
  poignee.rotation.x = Math.PI / 2;
  g.add(poignee);

  const charniereG = mesh(new THREE.BoxGeometry(0.05, 0.1, 0.04), steel, -0.34, 0.52, 0.3);
  g.add(charniereG);
  const charniereD = charniereG.clone();
  charniereD.position.y = 0.2;
  g.add(charniereD);

  // Voyant statut
  const statusLed = mesh(new THREE.SphereGeometry(0.012, 8, 6), neonMat(0xbf1f1f, 0.9), 0.25, 0.6, 0.32);
  statusLed.castShadow = false;
  g.add(statusLed);

  // Plaque identification
  const plate = mesh(new THREE.BoxGeometry(0.2, 0.06, 0.005), brassMat(), 0, 0.2, 0.32);
  g.add(plate);

  return g;
}

/** Détecteur de métal — portique d'entrée avec LEDs multi-zones. */
export function buildDetecteurMetal(): THREE.Group {
  const g = new THREE.Group();
  g.name = "detecteur_metal";
  const steel = steelMat();
  const ledGreen = neonMat(0x1fbf3a, 0.8);
  const ledRed = neonMat(0xbf1f1f, 0.8);

  const plaque = mesh(
    new THREE.BoxGeometry(1.4, 0.05, 0.35),
    matLib.get(0x232428, 0.5, 0.7),
    0,
    0.025,
    0,
  );
  g.add(plaque);

  const pilierG = mesh(new THREE.BoxGeometry(0.12, 1.9, 0.1), steel, -0.5, 0.95, 0);
  g.add(pilierG);
  const pilierD = pilierG.clone();
  pilierD.position.x = 0.5;
  g.add(pilierD);

  const traverse = mesh(new THREE.BoxGeometry(1.12, 0.14, 0.12), steel, 0, 1.9, 0);
  g.add(traverse);

  // LEDs multi-zones
  for (const px of [-0.44, 0.44]) {
    for (const py of [0.6, 1.1, 1.6]) {
      const del = mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), ledGreen, px, py, 0.052);
      del.castShadow = false;
      g.add(del);
    }
  }

  // Voyant central
  const voyant = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), ledGreen, 0, 1.86, 0.065);
  voyant.castShadow = false;
  g.add(voyant);

  // Panneau instruction
  const sign = createLabel("DÉTECTEUR ACTIF", 256, 64);
  sign.position.set(0, 1.75, 0.06);
  sign.scale.set(0.6, 0.6, 0.6);
  g.add(sign);

  return g;
}

/** Caméra de sécurité dôme PTZ. */
export function buildCameraSecurite(): THREE.Group {
  const g = new THREE.Group();
  g.name = "camera_securite";
  const steel = steelMat();

  const base = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.045, 10), steel, 0, 0.02, 0);
  g.add(base);

  const dome = mesh(
    new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    matLib.get(0x14161a, 0.4, 0.7),
    0,
    0,
    0,
  );
  dome.castShadow = false;
  g.add(dome);

  // IR LED
  const led = mesh(
    new THREE.BoxGeometry(0.018, 0.018, 0.018),
    neonMat(0xbf1f1f, 0.9),
    0,
    -0.035,
    0.06,
  );
  led.castShadow = false;
  g.add(led);

  // Bras articulé
  const arm = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), steel, 0, 0.04, 0);
  g.add(arm);

  return g;
}

/** Enseigne néon « ARMURERIE · COUTELLERIE ». */
export function buildEnseigneArmurerie(): THREE.Group {
  const g = new THREE.Group();
  g.name = "enseigne_armurerie";

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#14141c";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = "#d8a15a";
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.fillStyle = "#f4c98a";
  ctx.font = "bold 112px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ARMURERIE", 512, 100);
  ctx.fillStyle = "#c8d2d8";
  ctx.font = "600 44px sans-serif";
  ctx.fillText("COUTELLERIE", 512, 190);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.5,
    metalness: 0.15,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: tex,
    emissiveIntensity: 0.55,
  });

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.7, 0.09), mat);
  plaque.castShadow = false;
  g.add(plaque);

  // Supports néon latéraux
  const laserL = mesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.06),
    neonMat(0xd8a15a, 0.8),
    -1.44,
    -0.36,
    -0.04,
  );
  laserL.castShadow = false;
  g.add(laserL);
  const laserR = laserL.clone();
  laserR.position.x = 1.44;
  g.add(laserR);

  return g;
}

// ============================================================================
// 🪑 MOBILIER SUPPLÉMENTAIRE (NOUVEAU v5.0)
// ============================================================================

/** Présentoir rotatif pour couteaux de poche. */
export function buildPresentoirCouteaux(): THREE.Group {
  const g = new THREE.Group();
  g.name = "presentoir_couteaux";

  const base = mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.04, 16), woodMat(), 0, 0.02, 0);
  g.add(base);

  const axe = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), steelMat(), 0, 0.195, 0);
  g.add(axe);

  // 4 niveaux de présentation
  for (let i = 0; i < 4; i++) {
    const y = 0.08 + i * 0.08;
    const platform = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.008, 16), woodMat(), 0, y, 0);
    g.add(platform);

    // 6 emplacements par niveau
    for (let j = 0; j < 6; j++) {
      const angle = (j * Math.PI * 2) / 6;
      const slot = mesh(
        new THREE.BoxGeometry(0.04, 0.015, 0.015),
        leatherMat(),
        Math.cos(angle) * 0.08,
        y + 0.01,
        Math.sin(angle) * 0.08,
      );
      slot.rotation.y = -angle;
      g.add(slot);
    }
  }

  const topCap = mesh(new THREE.SphereGeometry(0.02, 8, 6), brassMat(), 0, 0.38, 0);
  g.add(topCap);

  return g;
}

/** Panneau mural de permis/licences requis. */
export function buildPanneauPermis(): THREE.Group {
  const g = new THREE.Group();
  g.name = "panneau_permis";

  const board = mesh(new THREE.BoxGeometry(0.8, 1.0, 0.03), woodMat(), 0, 0.5, 0);
  g.add(board);

  const title = createLabel("PERMIS REQUIS", 256, 64);
  title.position.set(0, 0.9, 0.02);
  title.scale.set(0.7, 0.7, 0.7);
  g.add(title);

  const lines = ["PAL — Armes d'épaule", "PAL-R — Armes de poing", "ATT — Transport", "CHASSE — Certificat MFFP"];
  lines.forEach((line, i) => {
    const lbl = createLabel(line, 512, 48);
    lbl.position.set(0, 0.72 - i * 0.15, 0.02);
    lbl.scale.set(0.6, 0.6, 0.6);
    g.add(lbl);
  });

  // Bordure dorée
  const border = mesh(new THREE.BoxGeometry(0.84, 1.04, 0.01), brassMat(), 0, 0.5, -0.015);
  g.add(border);

  return g;
}

/** Banc d'essai / zone de test (table rembourrée). */
export function buildBancEssai(): THREE.Group {
  const g = new THREE.Group();
  g.name = "banc_essai";

  // Table
  const top = mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), leatherMat(), 0, 0.85, 0);
  g.add(top);

  // Pieds
  for (const [x, z] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]] as [number, number][]) {
    const leg = mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), steelMat(), x, 0.425, z);
    g.add(leg);
  }

  // Coussin de test
  const pad = mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), rubberMat(), 0, 0.89, 0);
  g.add(pad);

  // Vice/étau
  const viceBase = mesh(new THREE.BoxGeometry(0.12, 0.06, 0.1), steelMat(), 0.4, 0.9, 0);
  g.add(viceBase);
  const viceJaw = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), steelMat(), 0.4, 0.96, 0);
  g.add(viceJaw);
  const viceHandle = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 6), steelMat(), 0.4, 0.96, 0.06);
  viceHandle.rotation.x = Math.PI / 2;
  g.add(viceHandle);

  // Label
  const label = createLabel("ZONE DE TEST", 256, 64);
  label.position.set(0, 0.92, 0.31);
  label.rotation.x = -Math.PI / 4;
  label.scale.set(0.5, 0.5, 0.5);
  g.add(label);

  return g;
}

/** Spot lumineux directionnel (plafond). */
export function buildSpotLumineux(targetX: number = 0, targetZ: number = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = "spot_lumineux";

  const housing = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 10), darkMat(), 0, 0, 0);
  g.add(housing);

  const lens = mesh(new THREE.CircleGeometry(0.06, 12), neonMat(0xfff4e0, 0.5), 0, -0.051, 0);
  lens.rotation.x = Math.PI / 2;
  lens.castShadow = false;
  g.add(lens);

  // SpotLight réel
  const spot = new THREE.SpotLight(0xfff4e0, 2, 6, Math.PI / 6, 0.5, 1.5);
  spot.position.set(0, -0.05, 0);
  spot.target.position.set(targetX, -3, targetZ);
  spot.castShadow = true;
  spot.shadow.mapSize.set(512, 512);
  g.add(spot);
  g.add(spot.target);

  return g;
}

/** Poubelle métallique industrielle. */
export function buildPoubelleIndustrielle(): THREE.Group {
  const g = new THREE.Group();
  g.name = "poubelle_industrielle";

  const body = mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.6, 12), steelMat(), 0, 0.3, 0);
  g.add(body);

  const lid = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 12), steelMat(), 0, 0.615, 0);
  g.add(lid);

  const handle = mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 12, Math.PI), steelMat(), 0, 0.64, 0);
  g.add(handle);

  // Symbole recyclage simplifié
  const symbol = mesh(new THREE.RingGeometry(0.06, 0.07, 3), neonMat(0x1fbf3a, 0.3), 0, 0.35, 0.155);
  symbol.castShadow = false;
  g.add(symbol);

  return g;
}

/** Extincteur mural. */
export function buildExtincteur(): THREE.Group {
  const g = new THREE.Group();
  g.name = "extincteur";

  const body = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 10), matLib.get(0xcc2222, 0.5, 0.2), 0, 0.175, 0);
  g.add(body);

  const top = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.05, 8), steelMat(), 0, 0.375, 0);
  g.add(top);

  const hose = mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 12, Math.PI * 0.8), rubberMat(), 0.03, 0.3, 0);
  g.add(hose);

  const bracket = mesh(new THREE.BoxGeometry(0.08, 0.12, 0.03), steelMat(), 0, 0.25, -0.04);
  g.add(bracket);

  // Étiquette
  const label = createLabel("ABC", 64, 64);
  label.position.set(0, 0.2, 0.052);
  label.scale.set(0.2, 0.2, 0.2);
  g.add(label);

  return g;
}