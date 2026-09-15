/**
 * Gestes RP TroxTWorld — roue radiale, poses bras/jambes, accessoires.
 */
import * as THREE from "three";
import { matLib } from "./materials";

export type RpGesture =
  | "none"
  | "wave"
  | "surrender"
  | "cross_arms"
  | "point"
  | "dance"
  | "gang_sign"
  | "sit"
  | "phone"
  | "salute";

export interface GestureDef {
  id: RpGesture;
  label: string;
  hint: string;
  key?: string;
  hold: boolean;
  duration: number;
}

export const RP_GESTURES: GestureDef[] = [
  { id: "wave", label: "Saluer", hint: "Signe de main", hold: false, duration: 2.6 },
  { id: "surrender", label: "Se rendre", hint: "Mains en l'air", key: "X", hold: true, duration: 0 },
  { id: "cross_arms", label: "Bras croisés", hint: "Attente, ferme", hold: true, duration: 0 },
  { id: "point", label: "Pointer", hint: "Désigner un lieu", hold: false, duration: 2.4 },
  { id: "dance", label: "Danse RP", hint: "Un petit deux", hold: true, duration: 0 },
  { id: "gang_sign", label: "Signe RP", hint: "Check de gang", hold: true, duration: 0 },
  { id: "sit", label: "S'asseoir", hint: "Par terre", hold: true, duration: 0 },
  { id: "phone", label: "Téléphoner", hint: "Main à l'oreille", hold: true, duration: 0 },
  { id: "salute", label: "Salut", hint: "Respect / SQ", hold: false, duration: 2.2 },
];

export const GESTURE_IDS = RP_GESTURES.map((g) => g.id);

export function isGesture(id: string): id is RpGesture {
  return id === "none" || GESTURE_IDS.includes(id as RpGesture);
}

export function gestureDef(id: string): GestureDef | undefined {
  return RP_GESTURES.find((g) => g.id === id);
}

export function locksMovement(id: RpGesture) {
  return id === "sit" || id === "dance" || id === "surrender";
}

export function attachPhoneProp(group: THREE.Group) {
  const old = group.getObjectByName("rp-phone");
  if (old) group.remove(old);
  const phone = new THREE.Group();
  phone.name = "rp-phone";
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.012), matLib.get(0x1a1e24, 0.35, 0.2));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.118, 0.004), matLib.get(0x3a6a88, 0.18, 0.55));
  glass.position.z = 0.008;
  phone.add(body, glass);
  const hand = group.getObjectByName("ether-hand") ?? group.getObjectByName("ArmRJoint") ?? group.getObjectByName("ether-arm-r");
  if (hand) {
    phone.position.set(0, -0.58, 0.04);
    phone.rotation.set(-0.4, 0.2, 0.15);
    hand.add(phone);
  } else {
    phone.position.set(0.32, 1.42, 0.12);
    group.add(phone);
  }
}

export function detachPhoneProp(group: THREE.Group) {
  group.traverse((obj) => {
    const phone = obj.getObjectByName?.("rp-phone");
    if (phone) phone.parent?.remove(phone);
  });
  const loose = group.getObjectByName("rp-phone");
  if (loose) group.remove(loose);
}

export function applyGesture(group: THREE.Group, id: RpGesture, t: number) {
  if (id === "none") {
    detachPhoneProp(group);
    return;
  }
  if (id === "phone") {
    if (!group.getObjectByName("rp-phone")) attachPhoneProp(group);
  } else {
    detachPhoneProp(group);
  }

  group.traverse((obj) => {
    const arm = obj.userData.arm as number | undefined;
    const leg = obj.userData.leg as number | undefined;
    if (!arm && !leg) return;
    if (id === "surrender") {
      if (arm) {
        obj.rotation.x = -2.55;
        obj.rotation.z = arm * 0.18;
      }
      return;
    }
    if (id === "wave") {
      if (arm === 1) {
        obj.rotation.x = -2.15;
        obj.rotation.z = 0.35 + Math.sin(t * 9) * 0.55;
      }
      return;
    }
    if (id === "salute") {
      if (arm === 1) {
        obj.rotation.x = -2.35;
        obj.rotation.z = -0.35;
      }
      return;
    }
    if (id === "point") {
      if (arm === 1) {
        obj.rotation.x = -1.45;
        obj.rotation.z = 0.05;
      }
      return;
    }
    if (id === "cross_arms") {
      if (arm) {
        obj.rotation.x = -1.15;
        obj.rotation.z = -arm * 0.72;
      }
      return;
    }
    if (id === "phone") {
      if (arm === 1) {
        obj.rotation.x = -2.05;
        obj.rotation.z = -0.55;
      }
      return;
    }
    if (id === "gang_sign") {
      if (arm) {
        obj.rotation.x = -1.55;
        obj.rotation.z = arm * 0.45;
      }
      return;
    }
    if (id === "dance") {
      const swing = Math.sin(t * 6.2);
      if (arm) {
        obj.rotation.x = -1.1 + swing * arm * 0.85;
        obj.rotation.z = arm * 0.4;
      }
      if (leg) obj.rotation.x = swing * (leg > 0 ? 0.45 : -0.45);
      return;
    }
    if (id === "sit") {
      if (leg) {
        obj.rotation.x = -1.35;
      }
      if (arm) {
        obj.rotation.x = -0.55;
        obj.rotation.z = arm * 0.12;
      }
    }
  });
}
