// 3D World Architecture, Buildings & Roads Types

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
