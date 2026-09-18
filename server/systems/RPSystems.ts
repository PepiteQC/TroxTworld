// ═══════════════════════════════════════════════════════════════════════════
//  RP SYSTEMS — Enregistrement des systèmes RP (stub)
//  server/systems/RPSystems.ts
// ═══════════════════════════════════════════════════════════════════════════

export function registerRPSystems(core: any) {}

export interface RPPlayer {
  id: string;
  name: string;
  job: string;
  aura: string;
  position: [number, number, number];
  rotation?: number;
  health?: number;
  armor?: number;
  wanted?: number;
  cash?: number;
  bank?: number;
  gang?: string;
  salary?: number;
}

export interface RPProperty {
  id: string;
  name: string;
  ownerId?: string;
  price: number;
  locked: boolean;
}