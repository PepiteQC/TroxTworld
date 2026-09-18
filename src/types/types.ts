export interface CatalogItem {
  id: string;
  name: string;
  category: 'furniture' | 'decor' | 'appliances' | 'outdoor';
  size: [number, number, number]; // width, height, depth
  color: string;
  description: string;
  icon: string; // lucide icon name
  price: number;
}

export interface PlacedProp {
  uuid: string;
  itemId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // Euler angles in radians
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
  currentWeapon?: 'none' | 'pipe' | 'bat' | 'bottle' | 'hammer';
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

export interface GarmentItem {
  brand: string;
  color: string;
  type: string;
  price: string;
  tag: string;
}

export type Vec3 = [number, number, number];

export interface Light {
  id: string;
  type: 'point' | 'spot' | 'ambient' | 'directional';
  position?: Vec3;
  color: string;
  intensity: number;
  distance?: number;
}

export interface PolyTexture {
  id?: string;
  name: string;
  color: string;
  metalness?: number;
  roughness?: number;
  polyCount?: number;
  edges?: boolean;
  faceted?: boolean;
}

export interface BuildingRoom {
  id: string;
  name: string;
  position: Vec3;
  size: Vec3;
  furniture?: string[];
  lights?: Light[];
}

export interface BuildingDoor {
  id: string;
  position: Vec3;
  locked: boolean;
  accessLevel?: string;
  targetRoom?: string;
}

export interface ApartmentCorridor {
  id: string;
  number: string;
  position: Vec3;
  isLocked: boolean;
  lightOn: boolean;
  doorColor: string;
}

export interface BuildingCorridor {
  id: string;
  name: string;
  apartments: ApartmentCorridor[];
  length: number;
}

export interface BuildingInterior {
  entryPoint: Vec3;
  exitPoint: Vec3;
  doors: BuildingDoor[];
  corridors: BuildingCorridor[];
}

export interface Building {
  id: string;
  type: 'building' | 'house' | 'commercial';
  name: string;
  model: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  rooms?: BuildingRoom[];
  interior?: BuildingInterior;
}

export interface RoadSegment {
  id: string;
  name?: string;
  startPos: Vec3;
  endPos: Vec3;
  width: number;
  texture?: PolyTexture;
  markings?: string;
  intersections?: string[];
}

export interface Intersection {
  id: string;
  position: Vec3;
  type: string;
  connectedRoads: string[];
}

