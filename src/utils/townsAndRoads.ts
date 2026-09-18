import * as THREE from 'three';

export interface TownDef {
  name: string;
  x: number;
  z: number;
  size: number;
}

// Les vraies villes du comté et environ à échelle immersive non compressée
export const TOWNS: TownDef[] = [
  { name: "Québec (Capitale-Nationale)", x: 5400, z: 300, size: 80 },
  { name: "Neuville", x: 3600, z: 150, size: 35 },
  { name: "Donnacona", x: 2200, z: 80, size: 40 },
  { name: "Pont-Rouge", x: 2000, z: -1000, size: 50 },
  { name: "Cap-Santé", x: 1100, z: 50, size: 30 },
  { name: "Saint-Raymond", x: 1600, z: -3600, size: 55 },
  { name: "Portneuf", x: 0, z: 0, size: 50 },
  { name: "Deschambault-Grondines", x: -2000, z: 200, size: 45 },
  { name: "Saint-Marc-des-Carrières", x: -2600, z: -800, size: 45 },
  { name: "Saint-Alban", x: -2800, z: -2600, size: 40 },
  { name: "Saint-Casimir", x: -3800, z: -1200, size: 45 },
  { name: "Sainte-Christine-d'Auvergne", x: 500, z: -2500, size: 25 },
  { name: "Saint-Ubalde", x: -3600, z: -3200, size: 30 },
  { name: "Sainte-Anne-de-la-Pérade", x: -4800, z: 350, size: 40 },
];

export interface RoadDef {
  id: string;
  name: string;
  start: [number, number]; // [x, z]
  end: [number, number];   // [x, z]
  width: number;
  type: 'highway' | 'main' | 'rural';
}

export const PORTNEUF_ROADS: RoadDef[] = [
  // Axe Principal Est-Ouest (Route 138 - Chemin du Roy) sans compression
  { id: '138_ouest', name: 'Route 138 Ouest (Grondines - Deschambault)', start: [-4800, 300], end: [-2000, 200], width: 12, type: 'main' },
  { id: '138_centre', name: 'Route 138 Centre (Deschambault - Portneuf - Donnacona)', start: [-2000, 200], end: [2200, 80], width: 12, type: 'main' },
  { id: '138_est', name: 'Route 138 Est (Donnacona - Neuville - Québec)', start: [2200, 80], end: [5600, 280], width: 14, type: 'highway' },
  
  // Routes régionales et interconnexions
  { id: 'r_354_st_casimir', name: 'Route 354 (Vers Saint-Casimir)', start: [-3500, 250], end: [-3800, -1200], width: 9, type: 'main' },
  { id: 'r_363_st_marc', name: 'Route 363 (Deschambault -> Saint-Marc)', start: [-2000, 200], end: [-2600, -800], width: 9, type: 'main' },
  { id: 'r_363_st_alban', name: 'Route 363 Nord (Saint-Marc -> Saint-Alban)', start: [-2600, -800], end: [-2800, -2600], width: 9, type: 'main' },
  { id: 'r_365_pont_rouge', name: 'Route 365 (Donnacona -> Pont-Rouge)', start: [2200, 80], end: [2000, -1000], width: 10, type: 'main' },
  { id: 'r_365_st_raymond', name: 'Route 365 Nord (Pont-Rouge -> Saint-Raymond)', start: [2000, -1000], end: [1600, -3600], width: 10, type: 'main' },
];

export function distanceToLineSegment(pX: number, pZ: number, x1: number, z1: number, x2: number, z2: number): number {
  const A = pX - x1;
  const B = pZ - z1;
  const C = x2 - x1;
  const D = z2 - z1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq != 0) param = dot / len_sq;

  let xx, zz;

  if (param < 0) { xx = x1; zz = z1; }
  else if (param > 1) { xx = x2; zz = z2; }
  else { xx = x1 + param * C; zz = z1 + param * D; }

  const dx = pX - xx;
  const dz = pZ - zz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function getClosestRoadDistance(x: number, z: number): number {
  let minDist = Infinity;
  for (const road of PORTNEUF_ROADS) {
    const dist = distanceToLineSegment(x, z, road.start[0], road.start[1], road.end[0], road.end[1]);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

// Fonction GPS: Trouve la ville la plus proche des coordonnées actuelles
export function getZoneName(x: number, z: number): string {
  let closestTown = "Hors Zone";
  let minDistance = Infinity;

  for (const town of TOWNS) {
    const dx = town.x - x;
    const dz = town.z - z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < minDistance) {
      minDistance = distance;
      closestTown = town.name;
    }
  }

  if (minDistance > 150 && z < -100 && z > -250) {
    return "Autoroute 40";
  }
  return closestTown;
}
