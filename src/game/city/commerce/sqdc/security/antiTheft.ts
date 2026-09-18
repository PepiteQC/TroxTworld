/**
 * TROXTWORLD — Portiques antivol SQDC
 * Détecte les articles non payés au passage du SAS.
 */
import type { CameraNode } from "./cameras";

export interface AntiTheftSystem {
  checkExit: (playerId: string, cartPaid: boolean, cartItems: string[]) => { trigger: boolean; reason?: string };
  registerCamera: (cam: CameraNode) => void;
  onTheft: (callback: (playerId: string, itemCount: number) => void) => void;
}

export function createAntiTheftSystem(): AntiTheftSystem {
  let theftCallback: ((playerId: string, itemCount: number) => void) | null = null;

  return {
    checkExit: (playerId, cartPaid, cartItems) => {
      if (cartPaid) return { trigger: false };
      if (cartItems.length === 0) return { trigger: false };
      if (theftCallback) theftCallback(playerId, cartItems.length);
      return {
        trigger: true,
        reason: `Passage avec ${cartItems.length} article(s) non payé(s)`,
      };
    },
    registerCamera: () => {},
    onTheft: (cb) => { theftCallback = cb; },
  };
}