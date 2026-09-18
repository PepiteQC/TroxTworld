/**
 * TROXTWORLD — Alarme SQDC + Lockdown
 */
import { netEmit } from "../../../net";
import { dispatchPolice, addWantedPoints } from "../../../police";

export type AlarmReason = "theft" | "robbery" | "tamper" | "manual" | "door_breach";

export interface AlarmSystem {
  trigger: (reason: AlarmReason, suspectId?: string) => void;
  clear: () => void;
  isActive: () => boolean;
  setLockdown: (lock: boolean) => void;
  isLockedDown: () => boolean;
}

export function createSqdcAlarm(storeId: string, storePos: { x: number; z: number }): AlarmSystem {
  let active = false;
  let lockedDown = false;
  let timer = 0;
  const DURATION = 25; // secondes

  return {
    trigger: (reason, suspectId) => {
      if (active) return;
      active = true;
      timer = DURATION;

      netEmit("sqdc:alarm_triggered", { storeId, reason, suspectId });

      const description = (() => {
        switch (reason) {
          case "theft": return "Détection de vol à l'étalage — portiques antivol activés.";
          case "robbery": return "Vol qualifié en cours — confinement enclenché.";
          case "tamper": return "Tentative d'effraction sur équipement sécurisé.";
          case "door_breach": return "Bris de porte détecté — intrusion.";
          default: return "Alarme manuelle déclenchée.";
        }
      })();

      dispatchPolice({
        location: storePos,
        priority: reason === "robbery" ? "critical" : "high",
        type: "Alarme SQDC",
        description,
      });

      if (suspectId) {
        addWantedPoints(suspectId, reason === "robbery" ? 150 : 40, `Vol SQDC (${reason})`);
      }
    },
    clear: () => {
      active = false;
      timer = 0;
      netEmit("sqdc:alarm_cleared", { storeId });
    },
    isActive: () => active,
    setLockdown: (lock) => {
      lockedDown = lock;
      netEmit("sqdc:lockdown", { storeId, locked: lock });
    },
    isLockedDown: () => lockedDown,
  };
}