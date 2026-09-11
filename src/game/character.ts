import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { tex } from "./textures";
import { fillHero } from "./hero";
import { isFbxModel, loadFbx } from "./fbx";

export type HairStyle = "court" | "long" | "chapeau" | "chauve";
export type OutfitId = "canadienne" | "depanneur" | "sq" | "fermier" | "ville" | "goose" | "roots" | "nike";
export type AuraId =
  | "none"
  | "fleuve"
  | "laurentides"
  | "eboulis"
  | "aurore"
  | "soleil"
  | "divine"
  | "void"
  | "blood"
  | "frost"
  | "nature"
  | "chaos";
export type ModelId = "voyageur" | "troxt" | "casual" | "chemise" | "manches" | "costume";

export interface Appearance {
  name: string;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  outfit: OutfitId;
  aura: AuraId;
  model: ModelId;
  face: number;
}

export const SKIN_TONES = [0xfde0c4, 0xf5cba7, 0xe8a87c, 0xd48b5a, 0xb06040, 0x7a3e20, 0x5c2810, 0x3a1808];
export const HAIR_TONES = [0x0a0502, 0x2a1206, 0x4a2010, 0x7c3a1a, 0xc8a050, 0xe8d080, 0xf0f0f0, 0x606060, 0xb03020, 0x4060d0];

export const MODELS: { id: ModelId; label: string; hint: string }[] = [
  { id: "voyageur", label: "Voyageur", hint: "Low-poly du comté" },
  { id: "troxt", label: "Chevalier", hint: "Armure, cape et épée" },
  { id: "casual", label: "Décontracté", hint: "FBX Smooth Casual" },
  { id: "chemise", label: "Chemise", hint: "FBX Smooth Shirt" },
  { id: "manches", label: "Manches longues", hint: "FBX Smooth LongSleeve" },
  { id: "costume", label: "Complet", hint: "FBX Smooth Suit" },
];

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "court", label: "Court" },
  { id: "long", label: "Long" },
  { id: "chapeau", label: "Tuque" },
  { id: "chauve", label: "Chauve" },
];

export const OUTFITS: { id: OutfitId; label: string; hint: string; jacket: number; pants: number }[] = [
  { id: "canadienne", label: "Canadienne", hint: "Manteau de laine", jacket: 0x2c3a34, pants: 0x2a3548 },
  { id: "depanneur", label: "Dépanneur", hint: "Quart de nuit", jacket: 0x3d4a32, pants: 0x3a3a3c },
  { id: "sq", label: "Patrouille SQ", hint: "Kaki Portneuf", jacket: 0x4a5840, pants: 0x2a2e28 },
  { id: "fermier", label: "Rang", hint: "Chemise de flanelle", jacket: 0x6a4030, pants: 0x3a4a58 },
  { id: "ville", label: "Ville", hint: "Manteau marine", jacket: 0x2a3a52, pants: 0x1e2228 },
  { id: "goose", label: "Canada Goose", hint: "Parka d'hiver", jacket: 0x8b1a1a, pants: 0x1a1a1e },
  { id: "roots", label: "Roots", hint: "Molleton castor", jacket: 0x5c3317, pants: 0x2a2418 },
  { id: "nike", label: "Nike", hint: "Survêtement", jacket: 0x111827, pants: 0x1e293b },
];

export const AURAS: { id: AuraId; label: string; hint: string; color: number }[] = [
  { id: "none", label: "Aucune", hint: "Sans halo", color: 0x000000 },
  { id: "fleuve", label: "Saint-Laurent", hint: "Brume du fleuve", color: 0x5aa0b8 },
  { id: "laurentides", label: "Laurentides", hint: "Forêt boréale", color: 0x4a8a52 },
  { id: "eboulis", label: "Éboulis", hint: "Argile de 1894", color: 0xa04838 },
  { id: "aurore", label: "Aurore", hint: "Ciel d'hiver", color: 0x7a6aaa },
  { id: "soleil", label: "Soleil", hint: "Fin d'après-midi", color: 0xc8a040 },
  { id: "divine", label: "Bouclier divin", hint: "Anneaux d'or", color: 0xffe066 },
  { id: "void", label: "Vide", hint: "Portail violet", color: 0xaa44ff },
  { id: "blood", label: "Rage de sang", hint: "Fureur", color: 0xff3333 },
  { id: "frost", label: "Nova de givre", hint: "Cristaux", color: 0x00d4ff },
  { id: "nature", label: "Âme ancienne", hint: "Feuilles", color: 0x44ff88 },
  { id: "chaos", label: "Chaos", hint: "Instable", color: 0xff8800 },
];

const EPIC: AuraId[] = ["divine", "void", "blood", "frost", "nature", "chaos"];

export const DEFAULT_APPEARANCE: Appearance = {
  name: "Voyageur",
  skin: 2,
  hair: 1,
  hairStyle: "court",
  outfit: "canadienne",
  aura: "none",
  model: "voyageur",
  face: 0,
};

export function parseAppearance(raw: unknown): Appearance {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_APPEARANCE };
  const d = raw as Partial<Appearance>;
  const hairStyle = HAIR_STYLES.some((h) => h.id === d.hairStyle) ? (d.hairStyle as HairStyle) : DEFAULT_APPEARANCE.hairStyle;
  const outfit = OUTFITS.some((o) => o.id === d.outfit) ? (d.outfit as OutfitId) : DEFAULT_APPEARANCE.outfit;
  const aura = AURAS.some((a) => a.id === d.aura) ? (d.aura as AuraId) : DEFAULT_APPEARANCE.aura;
  const model = MODELS.some((m) => m.id === d.model) ? (d.model as ModelId) : DEFAULT_APPEARANCE.model;
  return {
    name: typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 24) : DEFAULT_APPEARANCE.name,
    skin: clampIndex(d.skin, SKIN_TONES.length, DEFAULT_APPEARANCE.skin),
    hair: clampIndex(d.hair, HAIR_TONES.length, DEFAULT_APPEARANCE.hair),
    hairStyle,
    outfit,
    aura,
    model,
    face: clampIndex(d.face, 8, 0),
  };
}

function clampIndex(n: unknown, len: number, fallback: number) {
  return typeof n === "number" && n >= 0 && n < len ? Math.floor(n) : fallback;
}

function clearGroup(group: THREE.Group) {
  const mixer = group.userData.mixer as THREE.AnimationMixer | undefined;
  mixer?.stopAllAction();
  group.userData.mixer = undefined;
  while (group.children.length) {
    const child = group.children[0]!;
    group.remove(child);
    child.traverse((obj) => {
      if (obj.userData.sharedAsset) return;
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry.dispose();
      if (obj.userData.aura) {
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }
}

function auraMat(color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function attachAura(group: THREE.Group, aura: (typeof AURAS)[number]) {
  if (aura.id === "none") return;
  const glow = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 1.15, 6, 12), auraMat(aura.color, 0.28));
  glow.position.y = 1.05;
  glow.scale.z = 0.72;
  glow.userData.aura = true;
  glow.renderOrder = 2;
  group.add(glow);

  if (!EPIC.includes(aura.id)) return;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.018, 8, 32), auraMat(aura.color, 0.85));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  ring.userData.aura = true;
  ring.userData.auraSpin = 0.8;
  group.add(ring);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 6, 28), auraMat(aura.color, 0.7));
  halo.position.y = 1.45;
  halo.userData.aura = true;
  halo.userData.auraSpin = -0.55;
  group.add(halo);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), auraMat(aura.color, 0.9));
    spark.userData.aura = true;
    spark.userData.auraOrb = { angle: a, r: 0.7, y: 0.4 + (i % 3) * 0.45, speed: 0.9 };
    group.add(spark);
  }
}

export function fillPlayer(group: THREE.Group, look: Appearance) {
  clearGroup(group);
  group.name = `marcheur:${look.name}`;
  const outfit = OUTFITS.find((o) => o.id === look.outfit) ?? OUTFITS[0]!;
  const aura = AURAS.find((a) => a.id === look.aura);

  if (isFbxModel(look.model)) {
    const stub = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 1.15, 4, 8),
      matLib.get(SKIN_TONES[look.skin] ?? SKIN_TONES[2]!, 0.7),
    );
    stub.name = "fbx-stub";
    stub.position.y = 0.95;
    group.add(stub);
    if (aura) attachAura(group, aura);
    const token = (group.userData.fbxToken as number | undefined ?? 0) + 1;
    group.userData.fbxToken = token;
    void loadFbx(look.model).then((rig) => {
      if (group.userData.fbxToken !== token) return;
      const old = group.getObjectByName("fbx-stub");
      if (old) group.remove(old);
      group.add(rig);
      group.userData.mixer = rig.userData.mixer;
    }).catch(() => {
      /* stub reste visible */
    });
    return;
  }

  if (look.model === "troxt") {
    fillHero(group, {
      skin: SKIN_TONES[look.skin] ?? SKIN_TONES[2]!,
      hair: HAIR_TONES[look.hair] ?? HAIR_TONES[1]!,
      face: look.face,
      hairStyle: look.hairStyle,
      jacket: outfit.jacket,
      pants: outfit.pants,
    });
    if (aura) attachAura(group, aura);
    return;
  }

  const knit = look.outfit === "roots" || look.outfit === "nike";
  const wool = look.outfit === "canadienne" || look.outfit === "goose" || look.outfit === "ville" || knit;
  const jacket = wool
    ? tex.cloth(
        knit ? "laineTricot" : "laine",
        knit ? "laineKnitNrm" : "laineNrm",
        knit ? 1.6 : 2.4,
        knit ? 1.8 : 2.8,
        0.88,
        outfit.jacket,
        knit ? 1.05 : 0.45,
      )
    : matLib.get(outfit.jacket, 0.82);
  const denim = matLib.get(outfit.pants, 0.9);
  const skin = matLib.get(SKIN_TONES[look.skin] ?? SKIN_TONES[2]!, 0.7);
  const hairMat = matLib.get(HAIR_TONES[look.hair] ?? HAIR_TONES[1]!, 0.95);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.26), jacket);
  torso.name = "ether-body";
  torso.position.y = 1.18;
  torso.castShadow = true;
  group.add(torso);

  if (look.outfit === "sq") {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.28), matLib.get(0xc8a040, 0.5, 0.25));
    band.position.y = 1.38;
    group.add(band);
  }

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.24), denim);
  hips.position.y = 0.8;
  group.add(hips);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);

  if (look.hairStyle !== "chauve") {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 8, 6), hairMat);
    hair.position.y = look.hairStyle === "long" ? 1.66 : 1.7;
    hair.scale.set(1, look.hairStyle === "long" ? 1.05 : 0.55, look.hairStyle === "long" ? 1.15 : 1);
    group.add(hair);
    if (look.hairStyle === "long") {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.12), hairMat);
      tail.position.set(0, 1.46, -0.12);
      group.add(tail);
    }
  }
  if (look.hairStyle === "chapeau") {
    const tuque = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.17, 0.16, 10),
      tex.cloth("laineTricot", "laineKnitNrm", 1.4, 1.1, 0.9, QC_PALETTE.toleRouge, 1.1),
    );
    tuque.position.y = 1.78;
    group.add(tuque);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), matLib.get(0xe8e4d8, 0.95));
    pom.position.y = 1.88;
    group.add(pom);
  }

  for (const s of [-1, 1] as const) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.28, 1.38, 0);
    arm.userData.arm = s;
    if (s === 1) arm.name = "ether-arm-r";
    group.add(arm);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), jacket);
    sleeve.position.y = -0.22;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), skin);
    hand.position.set(0, -0.52, 0);
    if (s === 1) hand.name = "ether-hand";
    arm.add(hand);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.7, 0.16), denim);
    leg.position.set(s * 0.11, 0.4, 0);
    leg.userData.leg = s;
    group.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.22), matLib.get(QC_PALETTE.porte, 0.9));
    boot.position.set(s * 0.11, 0.06, 0.02);
    group.add(boot);
  }

  if (aura) attachAura(group, aura);
}

export function pulseAura(group: THREE.Group, elapsed: number) {
  group.traverse((obj) => {
    if (!obj.userData.aura) return;
    if (obj.userData.auraSpin && obj instanceof THREE.Mesh) {
      obj.rotation.z += obj.userData.auraSpin * 0.016;
    }
    if (obj.userData.auraOrb && obj instanceof THREE.Mesh) {
      const o = obj.userData.auraOrb as { angle: number; r: number; y: number; speed: number };
      o.angle += o.speed * 0.02;
      obj.position.set(Math.cos(o.angle) * o.r, o.y + Math.sin(elapsed * 2 + o.angle) * 0.08, Math.sin(o.angle) * o.r);
    }
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshBasicMaterial) {
      obj.material.opacity = Math.min(0.95, (obj.material.opacity > 0.5 ? 0.7 : 0.26) + Math.sin(elapsed * 2.1) * 0.1);
    }
  });
}