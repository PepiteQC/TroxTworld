// Vehicle, Mounts & Cyber Flight Mechanics Types

export type MountType = 'hoverboard' | 'broom' | 'cyberbike' | 'quad';

export interface VehicleStats {
  speed: number;
  mass: number;
  power: number;
  handling?: number;
  boostMultiplier?: number;
}

export interface MountConfig {
  id: MountType;
  name: string;
  modelPath: string;
  stats: VehicleStats;
  isUnlocked: boolean;
  unlockedAtLevel?: number;
}
