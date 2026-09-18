// Core Game & Player State Types

import { GarmentItem } from "./inventory";

export interface CatalogItem {
  id: string;
  name: string;
  category: 'furniture' | 'decor' | 'appliances' | 'outdoor' | 'houses' | 'doors' | 'characters' | 'packs';
  size: [number, number, number]; // width, height, depth
  color: string;
  description: string;
  icon: string; // lucide icon name
  price: number;
  packName?: string; // e.g. "Unity Asset Store", "Unreal Engine Marketplace"
  isInteractiveDoor?: boolean;
}

export interface PlacedProp {
  uuid: string;
  itemId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // Euler angles in radians
  isOpen?: boolean; // For interactive opening doors
}

export interface PlayerState {
  health: number;
  cash: number;
  activeStreet: string;
  isSprinting: boolean;
  isBuilding: boolean;
  selectedItemId: string | null;
  gridSnapSize: number; // e.g. 0.25, 0.5, 1.0 or 0 for free placement
  activeMount: 'hoverboard' | 'broom' | null;
  activeCombatMove: 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab' | null;
  combatLogs: string[];
  weedSeeds: number;
  weedBuds: number;
  gangBeastsMode: boolean;
  jointStiffness: 'stiff' | 'relaxed' | 'floppy';
  unlockedFurnitureIds: string[];
  sceneTemplate?: string;
  
  // Chamber Fight Club addition
  fightQueueStatus?: 'idle' | 'queuing' | 'match_ready' | 'fighting';
  fightQueueTimer?: number;
  currentRivals?: { id: string; name: string; health: number; maxHealth: number; activeWeapon: string; isKO: boolean }[];
  currentWeapon?: 'none' | 'pipe' | 'bat' | 'bottle' | 'hammer' | 'sword' | 'pistol' | 'shotgun';
  fightMode?: 'none' | '1v1' | 'ffa';

  // TroxT Real Estate Property Ownership & AI Multi-Agent telemetry
  boughtPropertyIds?: string[];
  activeAgentAction?: string;
  agentCognitiveScore?: number;
  riskRating?: 'GREEN' | 'BLUE' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';
  agentLogs?: string[];

  // Forge-Factory & Ether-Weave configurations status
  forgeFactoryStatus?: 'idle' | 'generated';
  etherWeaveConnected?: boolean;
  thirdEyeRiskValidated?: boolean;
  hoverboardStats?: { speed: number; mass: number; power: number };
  broomStats?: { speed: number; mass: number; power: number };

  // Boutique Éther Integration
  examinedGarment?: GarmentItem | null;
  nearGarment?: GarmentItem | null;
  
  // Cantine Québécoise de Portneuf
  nearCantine?: boolean;
  examinedCantine?: boolean;

  // Marchand de Cannabis/Graines
  nearMarchand?: boolean;
  examinedMarchand?: boolean;
  godMode?: boolean;
}
