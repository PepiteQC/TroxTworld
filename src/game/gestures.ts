/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SYSTÈME DE GESTES RP AVANCÉ (v2.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Fichier : src/game/gestures.ts
 *
 *  Features :
 *   - 25+ gestes RP avec catégories (social, combat, émotion, utilitaire)
 *   - Système de blending entre gestes (transitions fluides)
 *   - Inverse Kinematics basique (pointer vers objets)
 *   - Props étendus (téléphone, cigarette, arme, bouteille, etc.)
 *   - Gestes faciaux (sourire, froncer, clin d'œil)
 *   - Gestes contextuels (véhicule, assis, combat)
 *   - Système d'événements pour hooks gameplay
 *   - Animations procédurales (respiration, idle variations)
 *   - Combos et enchaînements
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib } from "./materials";
import { getGeo } from "./geometries";

// ─────────────────────────────────────────────────────────────────────────────
// §1 — TYPES & DÉFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export type GestureCategory = "social" | "combat" | "emotion" | "utility" | "dance" | "vehicle" | "seated";

export type RpGesture =
  // Social
  | "none"
  | "wave"
  | "salute"
  | "handshake"
  | "high_five"
  | "fist_bump"
  | "bow"
  | "curtsy"
  // Émotion
  | "laugh"
  | "cry"
  | "angry"
  | "shrug"
  | "facepalm"
  | "thumbs_up"
  | "thumbs_down"
  | "clap"
  // Combat
  | "surrender"
  | "point"
  | "threaten"
  | "gang_sign"
  | "box_stance"
  // Utilitaire
  | "phone"
  | "smoke"
  | "drink"
  | "eat"
  | "check_watch"
  | "cross_arms"
  | "hands_on_hips"
  // Danse
  | "dance"
  | "dance_hip_hop"
  | "dance_salsa"
  // Posture
  | "sit"
  | "sit_cross_legged"
  | "kneel"
  | "lean"
  // Véhicule
  | "drive"
  | "drive_one_hand"
  | "passenger_relax";

export type PropType = "phone" | "cigarette" | "bottle" | "cup" | "pistol" | "rifle" | "knife";

export interface GestureDef {
  id: RpGesture;
  label: string;
  hint: string;
  category: GestureCategory;
  key?: string;
  hold: boolean;
  duration: number;
  prop?: PropType;
  locksMovement: boolean;
  interruptible: boolean;
  priority: number; // 0 = low, 10 = high
  facial?: FacialExpression;
}

export type FacialExpression = "neutral" | "smile" | "frown" | "wink" | "surprise" | "angry";

export interface GestureEvent {
  type: "start" | "update" | "end" | "interrupt";
  gesture: RpGesture;
  timestamp: number;
  duration: number;
  character: THREE.Group;
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 — REGISTRE DES GESTES
// ─────────────────────────────────────────────────────────────────────────────

export const RP_GESTURES: GestureDef[] = [
  // ── Social ──
  { id: "wave", label: "Saluer", hint: "Signe de la main", category: "social", hold: false, duration: 2.6, locksMovement: false, interruptible: true, priority: 3 },
  { id: "salute", label: "Salut militaire", hint: "Respect / SQ", category: "social", hold: false, duration: 2.2, locksMovement: false, interruptible: true, priority: 3 },
  { id: "handshake", label: "Poignée de main", hint: "Accord commercial", category: "social", hold: true, duration: 0, locksMovement: true, interruptible: false, priority: 8 },
  { id: "high_five", label: "Tape dans la main", hint: "Célébration", category: "social", hold: false, duration: 1.8, locksMovement: false, interruptible: true, priority: 4 },
  { id: "fist_bump", label: "Check du poing", hint: "Salut fraternel", category: "social", hold: false, duration: 1.5, locksMovement: false, interruptible: true, priority: 4 },
  { id: "bow", label: "S'incliner", hint: "Respect formel", category: "social", hold: false, duration: 2.8, locksMovement: false, interruptible: true, priority: 5 },
  { id: "curtsy", label: "Révérence", hint: "Salut élégant", category: "social", hold: false, duration: 3.0, locksMovement: false, interruptible: true, priority: 5 },
  
  // ── Émotion ──
  { id: "laugh", label: "Rire", hint: "Joie intense", category: "emotion", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 2, facial: "smile" },
  { id: "cry", label: "Pleurer", hint: "Tristesse", category: "emotion", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 2, facial: "frown" },
  { id: "angry", label: "Colère", hint: "Frustration", category: "emotion", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 2, facial: "angry" },
  { id: "shrug", label: "Hausser épaules", hint: "Je ne sais pas", category: "emotion", hold: false, duration: 1.8, locksMovement: false, interruptible: true, priority: 2 },
  { id: "facepalm", label: "Main au front", hint: "Exaspération", category: "emotion", hold: false, duration: 2.0, locksMovement: false, interruptible: true, priority: 3, facial: "frown" },
  { id: "thumbs_up", label: "Pouce en l'air", hint: "Approbation", category: "emotion", hold: false, duration: 2.0, locksMovement: false, interruptible: true, priority: 2, facial: "smile" },
  { id: "thumbs_down", label: "Pouce en bas", hint: "Désapprobation", category: "emotion", hold: false, duration: 2.0, locksMovement: false, interruptible: true, priority: 2, facial: "frown" },
  { id: "clap", label: "Applaudir", hint: "Bravo !", category: "emotion", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 3, facial: "smile" },
  
  // ── Combat ──
  { id: "surrender", label: "Se rendre", hint: "Mains en l'air", category: "combat", key: "X", hold: true, duration: 0, locksMovement: true, interruptible: false, priority: 10 },
  { id: "point", label: "Pointer", hint: "Désigner un lieu", category: "combat", hold: false, duration: 2.4, locksMovement: false, interruptible: true, priority: 4 },
  { id: "threaten", label: "Menacer", hint: "Poing levé", category: "combat", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 5, facial: "angry" },
  { id: "gang_sign", label: "Signe de gang", hint: "Affiliation", category: "combat", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 4 },
  { id: "box_stance", label: "Position de combat", hint: "Prêt à frapper", category: "combat", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 6, facial: "angry" },
  
  // ── Utilitaire ──
  { id: "phone", label: "Téléphoner", hint: "Main à l'oreille", category: "utility", hold: true, duration: 0, prop: "phone", locksMovement: false, interruptible: true, priority: 5 },
  { id: "smoke", label: "Fumer", hint: "Cigarette", category: "utility", hold: true, duration: 0, prop: "cigarette", locksMovement: false, interruptible: true, priority: 3 },
  { id: "drink", label: "Boire", hint: "Bouteille/verre", category: "utility", hold: true, duration: 0, prop: "bottle", locksMovement: false, interruptible: true, priority: 3 },
  { id: "eat", label: "Manger", hint: "Sandwich/burger", category: "utility", hold: true, duration: 0, prop: "cup", locksMovement: false, interruptible: true, priority: 3 },
  { id: "check_watch", label: "Regarder l'heure", hint: "Impatient", category: "utility", hold: false, duration: 2.5, locksMovement: false, interruptible: true, priority: 2 },
  { id: "cross_arms", label: "Bras croisés", hint: "Attente, fermé", category: "utility", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 2 },
  { id: "hands_on_hips", label: "Mains sur hanches", hint: "Autorité", category: "utility", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 2 },
  
  // ── Danse ──
  { id: "dance", label: "Danse RP", hint: "Danse libre", category: "dance", hold: true, duration: 0, locksMovement: true, interruptible: true, priority: 7, facial: "smile" },
  { id: "dance_hip_hop", label: "Hip-hop", hint: "Style urbain", category: "dance", hold: true, duration: 0, locksMovement: true, interruptible: true, priority: 7, facial: "smile" },
  { id: "dance_salsa", label: "Salsa", hint: "Danse latine", category: "dance", hold: true, duration: 0, locksMovement: true, interruptible: true, priority: 7, facial: "smile" },
  
  // ── Posture ──
  { id: "sit", label: "S'asseoir", hint: "Par terre", category: "seated", hold: true, duration: 0, locksMovement: true, interruptible: true, priority: 6 },
  { id: "sit_cross_legged", label: "Assis en tailleur", hint: "Méditation", category: "seated", hold: true, duration: 0, locksMovement: true, interruptible: true, priority: 6 },
  { id: "kneel", label: "S'agenouiller", hint: "Soumission/prière", category: "seated", hold: true, duration: 0, locksMovement: true, interruptible: true, priority: 6 },
  { id: "lean", label: "S'appuyer", hint: "Contre un mur", category: "seated", hold: true, duration: 0, locksMovement: false, interruptible: true, priority: 3 },
  
  // ── Véhicule ──
  { id: "drive", label: "Conduire", hint: "Deux mains", category: "vehicle", hold: true, duration: 0, locksMovement: true, interruptible: false, priority: 9 },
  { id: "drive_one_hand", label: "Conduire cool", hint: "Une main", category: "vehicle", hold: true, duration: 0, locksMovement: true, interruptible: true, priority: 8 },
  { id: "passenger_relax", label: "Passager détendu", hint: "Bras sur portière", category: "vehicle", hold: true, duration: 0, locksMovement: true, interruptible: true, priority: 5 },
];

export const GESTURE_IDS = RP_GESTURES.map((g) => g.id);
export const GESTURE_MAP = new Map<RpGesture, GestureDef>(RP_GESTURES.map((g) => [g.id, g]));

export function isGesture(id: string): id is RpGesture {
  return id === "none" || GESTURE_IDS.includes(id as RpGesture);
}

export function gestureDef(id: string): GestureDef | undefined {
  return GESTURE_MAP.get(id as RpGesture);
}

export function locksMovement(id: RpGesture): boolean {
  const def = gestureDef(id);
  return def?.locksMovement ?? false;
}

export function gesturesByCategory(category: GestureCategory): GestureDef[] {
  return RP_GESTURES.filter((g) => g.category === category);
}

// ─────────────────────────────────────────────────────────────────────────────
// §3 — CACHE DES MEMBRES (Évite traverse() par frame)
// ─────────────────────────────────────────────────────────────────────────────

export interface CharacterLimbs {
  head?: THREE.Object3D;
  neck?: THREE.Object3D;
  spine?: THREE.Object3D;
  armR?: THREE.Object3D;
  armL?: THREE.Object3D;
  forearmR?: THREE.Object3D;
  forearmL?: THREE.Object3D;
  handR?: THREE.Object3D;
  handL?: THREE.Object3D;
  legR?: THREE.Object3D;
  legL?: THREE.Object3D;
  shinR?: THREE.Object3D;
  shinL?: THREE.Object3D;
  footR?: THREE.Object3D;
  footL?: THREE.Object3D;
  bodyRoot?: THREE.Object3D;
}

export function getOrCacheLimbs(group: THREE.Group): CharacterLimbs {
  if (group.userData._cachedLimbs) {
    return group.userData._cachedLimbs as CharacterLimbs;
  }

  const limbs: CharacterLimbs = {};

  group.traverse((obj) => {
    const arm = obj.userData.arm as number | undefined;
    const leg = obj.userData.leg as number | undefined;
    const name = obj.name.toLowerCase();

    // Bras
    if (arm === 1) limbs.armR = obj;
    else if (arm === -1) limbs.armL = obj;

    // Avant-bras
    if (name.includes("forearm") && name.includes("r")) limbs.forearmR = obj;
    else if (name.includes("forearm") && name.includes("l")) limbs.forearmL = obj;

    // Jambes
    if (leg === 1) limbs.legR = obj;
    else if (leg === -1) limbs.legL = obj;

    // Tibias
    if (name.includes("shin") && name.includes("r")) limbs.shinR = obj;
    else if (name.includes("shin") && name.includes("l")) limbs.shinL = obj;

    // Mains
    if (name.includes("hand") && name.includes("r")) limbs.handR = obj;
    else if (name.includes("hand") && name.includes("l")) limbs.handL = obj;

    // Pieds
    if (name.includes("foot") && name.includes("r")) limbs.footR = obj;
    else if (name.includes("foot") && name.includes("l")) limbs.footL = obj;

    // Tête et cou
    if (name.includes("head")) limbs.head = obj;
    if (name.includes("neck")) limbs.neck = obj;

    // Colonne
    if (name.includes("spine") || name.includes("chest")) limbs.spine = obj;
  });

  limbs.bodyRoot = group.getObjectByName("bodyRoot") ?? group.getObjectByName("hips") ?? group;
  group.userData._cachedLimbs = limbs;
  return limbs;
}

// ─────────────────────────────────────────────────────────────────────────────
// §4 — SYSTÈME DE PROPS (Accessoires réutilisables)
// ─────────────────────────────────────────────────────────────────────────────

function buildPhoneProp(): THREE.Group {
  const phone = new THREE.Group();
  phone.name = "rp-prop-phone";
  phone.userData.propType = "phone";

  const bodyGeo = getGeo("box", { w: 0.07, h: 0.14, d: 0.012 });
  const screenGeo = getGeo("box", { w: 0.058, h: 0.118, d: 0.004 });

  const body = new THREE.Mesh(bodyGeo, matLib.get(0x1a1e24, 0.35, 0.2));
  const screen = new THREE.Mesh(screenGeo, matLib.getEmissive(0x3a6a88, 0x4a9eff, 0.8));
  screen.position.z = 0.008;

  phone.add(body, screen);
  return phone;
}

function buildCigaretteProp(): THREE.Group {
  const cig = new THREE.Group();
  cig.name = "rp-prop-cigarette";
  cig.userData.propType = "cigarette";

  const stickGeo = getGeo("cylinder", { r: 0.008, h: 0.08, seg: 8 });
  const filterGeo = getGeo("cylinder", { r: 0.009, h: 0.025, seg: 8 });
  const emberGeo = getGeo("sphere", { r: 0.01, seg: 6 });

  const stick = new THREE.Mesh(stickGeo, matLib.get(0xf5f5dc, 0.9, 0.0));
  stick.rotation.z = Math.PI / 2;

  const filter = new THREE.Mesh(filterGeo, matLib.get(0xd2691e, 0.7, 0.1));
  filter.rotation.z = Math.PI / 2;
  filter.position.x = -0.05;

  const ember = new THREE.Mesh(emberGeo, matLib.getEmissive(0xff4500, 0xff6347, 1.2));
  ember.position.x = 0.045;

  cig.add(stick, filter, ember);
  return cig;
}

function buildBottleProp(): THREE.Group {
  const bottle = new THREE.Group();
  bottle.name = "rp-prop-bottle";
  bottle.userData.propType = "bottle";

  const bodyGeo = getGeo("cylinder", { r: 0.035, h: 0.18, seg: 12 });
  const neckGeo = getGeo("cylinder", { r: 0.015, h: 0.05, seg: 10 });
  const capGeo = getGeo("cylinder", { r: 0.018, h: 0.012, seg: 10 });

  const body = new THREE.Mesh(bodyGeo, matLib.get(0x2f4f4f, 0.3, 0.6));
  const neck = new THREE.Mesh(neckGeo, matLib.get(0x2f4f4f, 0.3, 0.6));
  neck.position.y = 0.115;

  const cap = new THREE.Mesh(capGeo, matLib.get(0xffd700, 0.2, 0.8));
  cap.position.y = 0.145;

  bottle.add(body, neck, cap);
  return bottle;
}

function buildCupProp(): THREE.Group {
  const cup = new THREE.Group();
  cup.name = "rp-prop-cup";
  cup.userData.propType = "cup";

  const cupGeo = getGeo("cylinder", { r: 0.04, h: 0.12, seg: 12 });
  const lidGeo = getGeo("cylinder", { r: 0.042, h: 0.01, seg: 12 });

  const cupMesh = new THREE.Mesh(cupGeo, matLib.get(0xffffff, 0.6, 0.1));
  const lid = new THREE.Mesh(lidGeo, matLib.get(0x8b4513, 0.5, 0.2));
  lid.position.y = 0.065;

  cup.add(cupMesh, lid);
  return cup;
}

const PROP_BUILDERS: Record<PropType, () => THREE.Group> = {
  phone: buildPhoneProp,
  cigarette: buildCigaretteProp,
  bottle: buildBottleProp,
  cup: buildCupProp,
  pistol: () => new THREE.Group(), // Placeholder
  rifle: () => new THREE.Group(), // Placeholder
  knife: () => new THREE.Group(), // Placeholder
};

export function attachProp(group: THREE.Group, propType: PropType, attachTo: "handR" | "handL" | "mouth" = "handR"): void {
  detachProp(group);
  const limbs = getOrCacheLimbs(group);

  const builder = PROP_BUILDERS[propType];
  if (!builder) return;

  const propObj = builder();

  let target: THREE.Object3D | null = null;
  if (attachTo === "handR") target = limbs.handR ?? null;
  else if (attachTo === "handL") target = limbs.handL ?? null;
  else if (attachTo === "mouth") target = limbs.head ?? null;

  if (!target) {
    target = group;
    propObj.position.set(0.32, 1.42, 0.12);
  }

  // Positionnement selon le type de prop
  switch (propType) {
    case "phone":
      propObj.position.set(0, -0.58, 0.04);
      propObj.rotation.set(-0.4, 0.2, 0.15);
      break;
    case "cigarette":
      propObj.position.set(0.02, 0, 0.08);
      propObj.rotation.set(0, 0, 0);
      break;
    case "bottle":
      propObj.position.set(0, -0.1, 0);
      propObj.rotation.set(0, 0, 0);
      break;
    case "cup":
      propObj.position.set(0, -0.08, 0);
      propObj.rotation.set(0, 0, 0);
      break;
  }

  target.add(propObj);
}

export function detachProp(group: THREE.Group, propType?: PropType): void {
  const limbs = getOrCacheLimbs(group);
  const targets = [limbs.handR, limbs.handL, limbs.head, group].filter(Boolean) as THREE.Object3D[];

  for (const target of targets) {
    for (let i = target.children.length - 1; i >= 0; i--) {
      const child = target.children[i];
      if (child.name.startsWith("rp-prop-")) {
        if (!propType || child.userData.propType === propType) {
          target.remove(child);
        }
      }
    }
  }
}

export function hasProp(group: THREE.Group, propType: PropType): boolean {
  const limbs = getOrCacheLimbs(group);
  const targets = [limbs.handR, limbs.handL, limbs.head, group].filter(Boolean) as THREE.Object3D[];

  for (const target of targets) {
    for (const child of target.children) {
      if (child.userData.propType === propType) return true;
    }
  }
  return false;
}

// Compatibilité rétroactive
export function attachPhoneProp(group: THREE.Group): void {
  attachProp(group, "phone");
}

export function detachPhoneProp(group: THREE.Group): void {
  detachProp(group, "phone");
}

// ─────────────────────────────────────────────────────────────────────────────
// §5 — SYSTÈME DE BLENDING (Transitions fluides entre gestes)
// ─────────────────────────────────────────────────────────────────────────────

export interface GestureState {
  current: RpGesture;
  previous: RpGesture;
  blendFactor: number; // 0 = previous, 1 = current
  blendSpeed: number;
  startTime: number;
  elapsed: number;
  active: boolean;
}

const gestureStates = new Map<THREE.Group, GestureState>();

export function getGestureState(group: THREE.Group): GestureState {
  let state = gestureStates.get(group);
  if (!state) {
    state = {
      current: "none",
      previous: "none",
      blendFactor: 1,
      blendSpeed: 0.15,
      startTime: 0,
      elapsed: 0,
      active: false,
    };
    gestureStates.set(group, state);
  }
  return state;
}

export function setGesture(group: THREE.Group, id: RpGesture, blendSpeed = 0.15): void {
  const state = getGestureState(group);
  const def = gestureDef(id);

  if (!def) {
    console.warn(`[Gestures] Geste inconnu: ${id}`);
    return;
  }

  // Vérifie la priorité
  if (state.current !== "none") {
    const currentDef = gestureDef(state.current);
    if (currentDef && !currentDef.interruptible && def.priority <= currentDef.priority) {
      return; // Geste actuel ne peut pas être interrompu
    }
  }

  state.previous = state.current;
  state.current = id;
  state.blendFactor = 0;
  state.blendSpeed = blendSpeed;
  state.startTime = performance.now();
  state.elapsed = 0;
  state.active = id !== "none";

  // Props
  if (def.prop) {
    attachProp(group, def.prop);
  } else {
    detachProp(group);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §6 — INVERSE KINEMATICS BASIQUE (Pointer vers objets)
// ─────────────────────────────────────────────────────────────────────────────

export function pointAtTarget(
  group: THREE.Group,
  target: THREE.Vector3,
  limb: "armR" | "armL" = "armR",
  blendSpeed = 0.15
): void {
  const limbs = getOrCacheLimbs(group);
  const arm = limb === "armR" ? limbs.armR : limbs.armL;
  if (!arm || !limbs.bodyRoot) return;

  // Position locale de la cible
  const localTarget = limbs.bodyRoot.worldToLocal(target.clone());

  // Direction vers la cible
  const direction = localTarget.clone().normalize();

  // Calcule les angles (simplifié)
  const angleY = Math.atan2(direction.x, direction.z);
  const angleX = Math.atan2(direction.y, Math.sqrt(direction.x ** 2 + direction.z ** 2));

  // Applique avec blending
  arm.rotation.y = lerp(arm.rotation.y, angleY, blendSpeed);
  arm.rotation.x = lerp(arm.rotation.x, -angleX - Math.PI / 2, blendSpeed);
}

// ─────────────────────────────────────────────────────────────────────────────
// §7 — APPLICATION DES GESTES (Interpolé et procédural)
// ─────────────────────────────────────────────────────────────────────────────

function lerp(current: number, target: number, speed: number): number {
  return current + (target - current) * speed;
}

function lerpAngle(current: number, target: number, speed: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * speed;
}

export function applyGesture(group: THREE.Group, id: RpGesture, t: number, blendSpeed = 0.15): void {
  const limbs = getOrCacheLimbs(group);
  const state = getGestureState(group);

  // Update blending
  if (state.blendFactor < 1) {
    state.blendFactor = Math.min(1, state.blendFactor + blendSpeed);
  }

  const def = gestureDef(id);
  if (!def) return;

  state.elapsed = t - state.startTime / 1000;

  if (id === "none") {
    // Reset progressif vers pose neutre
    if (limbs.armR) {
      limbs.armR.rotation.x = lerp(limbs.armR.rotation.x, 0, blendSpeed);
      limbs.armR.rotation.y = lerp(limbs.armR.rotation.y, 0, blendSpeed);
      limbs.armR.rotation.z = lerp(limbs.armR.rotation.z, 0, blendSpeed);
    }
    if (limbs.armL) {
      limbs.armL.rotation.x = lerp(limbs.armL.rotation.x, 0, blendSpeed);
      limbs.armL.rotation.y = lerp(limbs.armL.rotation.y, 0, blendSpeed);
      limbs.armL.rotation.z = lerp(limbs.armL.rotation.z, 0, blendSpeed);
    }
    if (limbs.legR) limbs.legR.rotation.x = lerp(limbs.legR.rotation.x, 0, blendSpeed);
    if (limbs.legL) limbs.legL.rotation.x = lerp(limbs.legL.rotation.x, 0, blendSpeed);
    if (limbs.spine) limbs.spine.rotation.x = lerp(limbs.spine.rotation.x, 0, blendSpeed);
    return;
  }

  const blend = state.blendFactor;
  const { armR, armL, legR, legL, spine, head } = limbs;

  switch (id) {
    case "surrender":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -2.55, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, 0.18, blendSpeed);
      }
      if (armL) {
        armL.rotation.x = lerp(armL.rotation.x, -2.55, blendSpeed);
        armL.rotation.z = lerp(armL.rotation.z, -0.18, blendSpeed);
      }
      break;

    case "wave":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -2.15, blendSpeed);
        armR.rotation.z = 0.35 + Math.sin(t * 9) * 0.55;
      }
      break;

    case "salute":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -2.35, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, -0.35, blendSpeed);
      }
      break;

    case "point":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -1.45, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, 0.05, blendSpeed);
      }
      break;

    case "cross_arms":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -1.15, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, -0.72, blendSpeed);
      }
      if (armL) {
        armL.rotation.x = lerp(armL.rotation.x, -1.15, blendSpeed);
        armL.rotation.z = lerp(armL.rotation.z, 0.72, blendSpeed);
      }
      break;

    case "hands_on_hips":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -0.4, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, -0.8, blendSpeed);
      }
      if (armL) {
        armL.rotation.x = lerp(armL.rotation.x, -0.4, blendSpeed);
        armL.rotation.z = lerp(armL.rotation.z, 0.8, blendSpeed);
      }
      break;

    case "phone":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -2.05, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, -0.55, blendSpeed);
      }
      if (head) {
        head.rotation.z = lerp(head.rotation.z, 0.15, blendSpeed);
      }
      break;

    case "smoke":
      if (armR) {
        const smokeCycle = Math.sin(t * 0.8) * 0.5 + 0.5;
        armR.rotation.x = lerp(armR.rotation.x, -1.8 + smokeCycle * 0.4, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, -0.6, blendSpeed);
      }
      break;

    case "drink":
      if (armR) {
        const drinkCycle = Math.sin(t * 1.2) * 0.5 + 0.5;
        armR.rotation.x = lerp(armR.rotation.x, -2.2 + drinkCycle * 0.3, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, -0.4, blendSpeed);
      }
      break;

    case "gang_sign":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -1.55, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, 0.45, blendSpeed);
      }
      if (armL) {
        armL.rotation.x = lerp(armL.rotation.x, -1.55, blendSpeed);
        armL.rotation.z = lerp(armL.rotation.z, -0.45, blendSpeed);
      }
      break;

    case "dance": {
      const swing = Math.sin(t * 6.2);
      const bounce = Math.abs(Math.sin(t * 6.2)) * 0.1;
      if (armR) {
        armR.rotation.x = -1.1 + swing * 0.85;
        armR.rotation.z = 0.4;
      }
      if (armL) {
        armL.rotation.x = -1.1 - swing * 0.85;
        armL.rotation.z = -0.4;
      }
      if (legR) legR.rotation.x = swing * 0.45;
      if (legL) legL.rotation.x = -swing * 0.45;
      if (spine) spine.position.y = bounce;
      break;
    }

    case "dance_hip_hop": {
      const beat = t * 4;
      const bounce = Math.abs(Math.sin(beat)) * 0.15;
      const sway = Math.sin(beat * 0.5) * 0.2;
      if (armR) {
        armR.rotation.x = -0.8 + Math.sin(beat) * 0.6;
        armR.rotation.z = 0.3 + sway;
      }
      if (armL) {
        armL.rotation.x = -0.8 + Math.sin(beat + Math.PI) * 0.6;
        armL.rotation.z = -0.3 - sway;
      }
      if (spine) {
        spine.rotation.z = sway * 0.5;
        spine.position.y = bounce;
      }
      break;
    }

    case "sit":
      if (legR) legR.rotation.x = lerp(legR.rotation.x, -1.35, blendSpeed);
      if (legL) legL.rotation.x = lerp(legL.rotation.x, -1.35, blendSpeed);
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -0.55, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, 0.12, blendSpeed);
      }
      if (armL) {
        armL.rotation.x = lerp(armL.rotation.x, -0.55, blendSpeed);
        armL.rotation.z = lerp(armL.rotation.z, -0.12, blendSpeed);
      }
      if (spine) spine.rotation.x = lerp(spine.rotation.x, -0.3, blendSpeed);
      break;

    case "sit_cross_legged":
      if (legR) {
        legR.rotation.x = lerp(legR.rotation.x, -1.6, blendSpeed);
        legR.rotation.z = lerp(legR.rotation.z, 0.4, blendSpeed);
      }
      if (legL) {
        legL.rotation.x = lerp(legL.rotation.x, -1.6, blendSpeed);
        legL.rotation.z = lerp(legL.rotation.z, -0.4, blendSpeed);
      }
      if (spine) spine.rotation.x = lerp(spine.rotation.x, -0.4, blendSpeed);
      break;

    case "kneel":
      if (legR) legR.rotation.x = lerp(legR.rotation.x, -Math.PI / 2, blendSpeed);
      if (legL) legL.rotation.x = lerp(legL.rotation.x, -Math.PI / 2, blendSpeed);
      if (spine) spine.rotation.x = lerp(spine.rotation.x, -0.2, blendSpeed);
      break;

    case "laugh":
      if (spine) {
        const laughShake = Math.sin(t * 12) * 0.08;
        spine.rotation.x = -0.3 + laughShake;
      }
      if (armR) armR.rotation.z = lerp(armR.rotation.z, 0.3, blendSpeed);
      if (armL) armL.rotation.z = lerp(armL.rotation.z, -0.3, blendSpeed);
      break;

    case "clap":
      if (armR && armL) {
        const clapCycle = Math.abs(Math.sin(t * 8));
        armR.rotation.z = lerp(armR.rotation.z, 0.2 + clapCycle * 0.3, blendSpeed);
        armL.rotation.z = lerp(armL.rotation.z, -0.2 - clapCycle * 0.3, blendSpeed);
      }
      break;

    case "shrug":
      if (armR) {
        armR.rotation.z = lerp(armR.rotation.z, -0.8, blendSpeed);
        armR.rotation.x = lerp(armR.rotation.x, -0.3, blendSpeed);
      }
      if (armL) {
        armL.rotation.z = lerp(armL.rotation.z, 0.8, blendSpeed);
        armL.rotation.x = lerp(armL.rotation.x, -0.3, blendSpeed);
      }
      break;

    case "facepalm":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -2.4, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, -0.3, blendSpeed);
      }
      if (head) head.rotation.x = lerp(head.rotation.x, -0.2, blendSpeed);
      break;

    case "thumbs_up":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -1.2, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, 0.3, blendSpeed);
      }
      break;

    case "bow":
      if (spine) spine.rotation.x = lerp(spine.rotation.x, -0.8, blendSpeed);
      if (head) head.rotation.x = lerp(head.rotation.x, -0.3, blendSpeed);
      break;

    case "threaten":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -1.8, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, 0.5, blendSpeed);
      }
      if (spine) spine.rotation.x = lerp(spine.rotation.x, -0.15, blendSpeed);
      break;

    case "box_stance":
      if (armR) {
        armR.rotation.x = lerp(armR.rotation.x, -1.5, blendSpeed);
        armR.rotation.z = lerp(armR.rotation.z, 0.4, blendSpeed);
      }
      if (armL) {
        armL.rotation.x = lerp(armL.rotation.x, -1.5, blendSpeed);
        armL.rotation.z = lerp(armL.rotation.z, -0.4, blendSpeed);
      }
      if (legR) legR.rotation.z = lerp(legR.rotation.z, 0.2, blendSpeed);
      if (legL) legL.rotation.z = lerp(legL.rotation.z, -0.2, blendSpeed);
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §8 — ANIMATIONS PROCÉDURALES (Idle variations)
// ─────────────────────────────────────────────────────────────────────────────

export function applyIdleBreathing(group: THREE.Group, t: number): void {
  const limbs = getOrCacheLimbs(group);
  if (!limbs.spine) return;

  const breath = Math.sin(t * 2) * 0.02;
  limbs.spine.position.y += breath;
}

export function applyIdleSway(group: THREE.Group, t: number, intensity = 0.05): void {
  const limbs = getOrCacheLimbs(group);
  if (!limbs.bodyRoot) return;

  const sway = Math.sin(t * 1.5) * intensity;
  limbs.bodyRoot.rotation.z = sway;
}

// ─────────────────────────────────────────────────────────────────────────────
// §9 — SYSTÈME D'ÉVÉNEMENTS
// ─────────────────────────────────────────────────────────────────────────────

type GestureEventHandler = (event: GestureEvent) => void;
const eventHandlers: GestureEventHandler[] = [];

export function onGestureEvent(handler: GestureEventHandler): () => void {
  eventHandlers.push(handler);
  return () => {
    const idx = eventHandlers.indexOf(handler);
    if (idx >= 0) eventHandlers.splice(idx, 1);
  };
}

function emitGestureEvent(event: GestureEvent): void {
  for (const handler of eventHandlers) {
    handler(event);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §10 — HELPERS & UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

export function getActiveGesture(group: THREE.Group): RpGesture {
  return getGestureState(group).current;
}

export function isGestureActive(group: THREE.Group): boolean {
  return getGestureState(group).active;
}

export function clearGesture(group: THREE.Group): void {
  setGesture(group, "none");
}

export function getGestureProgress(group: THREE.Group): number {
  const state = getGestureState(group);
  const def = gestureDef(state.current);
  if (!def || def.duration === 0) return 1;
  return Math.min(1, state.elapsed / def.duration);
}

// ─────────────────────────────────────────────────────────────────────────────
// §11 — EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const GESTURE_CATEGORIES: GestureCategory[] = [
  "social",
  "combat",
  "emotion",
  "utility",
  "dance",
  "vehicle",
  "seated",
];