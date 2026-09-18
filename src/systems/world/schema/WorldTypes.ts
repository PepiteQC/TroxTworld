export interface WorldPos {
  x: number;
  z: number;
}

export interface Region {
  id: string;
  name?: string;
}

export interface Village {
  id: string;
  region: string;
  pos: WorldPos;
  spawn?: boolean;
}

export interface Road {
  id: string;
  path: WorldPos[];
  speedLimit: number;
  serves?: string[];
}

export interface POI {
  id: string;
  region: string;
  pos?: WorldPos;
}

export interface Activity {
  id: string;
  region: string;
  anchor?: string;
}

export interface BiomeZone {
  id: string;
  region: string;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface World {
  regions: Region[];
  villages: Village[];
  roads: Road[];
  pois: POI[];
  activities: Activity[];
  biomeZones: BiomeZone[];
  meta: {
    bounds: WorldBounds;
  };
}
