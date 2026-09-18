/**
 * TROXTWORLD — SQDC Security Hub
 * Regroupe caméras + alarme + antivol en une seule API.
 */
import * as THREE from "three";
import { buildCameraNetwork, type CameraNode } from "./cameras";
import { createSqdcAlarm, type AlarmSystem } from "./alarm";
import { createAntiTheftSystem, type AntiTheftSystem } from "./antiTheft";

export interface SqdcSecurity {
  cameras: CameraNode[];
  alarm: AlarmSystem;
  antiTheft: AntiTheftSystem;
  update: (dt: number) => void;
  viewCameras: (playerId: string) => CameraNode[];
  getFeed: (cameraId: string) => CameraNode | null;
}

export function buildSqdcSecurity(
  storeId: string,
  storePos: { x: number; z: number },
  cameraDefs: Array<{ id: string; position: [number, number, number]; lookAt: [number, number, number] }>,
): SqdcSecurity {
  const cameras = buildCameraNetwork(storeId, cameraDefs);
  const alarm = createSqdcAlarm(storeId, storePos);
  const antiTheft = createAntiTheftSystem();

  return {
    cameras,
    alarm,
    antiTheft,
    update: (_dt) => {
      // Hook pour timer d'alarme côté serveur
    },
    viewCameras: (playerId) => {
      cameras.forEach((c) => c.viewingPlayers.add(playerId));
      return cameras;
    },
    getFeed: (cameraId) => cameras.find((c) => c.id === cameraId) ?? null,
  };
}

export type { CameraNode, AlarmSystem, AntiTheftSystem };