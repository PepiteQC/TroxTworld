import * as THREE from 'three';

export interface TownDef {
  name: string;
  x: number;
  z: number;
  size: number;
}

// Les vraies villes du comté et environ
export const TOWNS: TownDef[] = [
  { name: "Québec", x: 1300, z: 0, size: 30 },
  { name: "Neuville", x: 900, z: 0, size: 15 },
  { name: "Pont-Rouge", x: 800, z: -300, size: 18 },
  { name: "Donnacona", x: 600, z: 0, size: 20 },
  { name: "Cap-Santé", x: 400, z: 0, size: 12 },
  { name: "Saint-Raymond", x: 400, z: -800, size: 22 },
  { name: "Sainte-Christine-d'Auvergne", x: 100, z: -1000, size: 8 },
  { name: "Portneuf", x: 0, z: 0, size: 18 },
  { name: "Saint-Alban", x: -100, z: -700, size: 10 },
  { name: "Saint-Marc-des-Carrières", x: -200, z: -300, size: 16 },
  { name: "Deschambault", x: -300, z: 0, size: 14 },
  { name: "Grondines", x: -500, z: 0, size: 10 },
  { name: "Saint-Casimir", x: -500, z: -400, size: 15 },
  { name: "Saint-Ubalde", x: -700, z: -800, size: 12 },
  { name: "Sainte-Anne-de-la-Pérade", x: -800, z: 0, size: 16 },
  { name: "Batiscan", x: -1000, z: 0, size: 12 },
  { name: "Saint-Tite", x: -1200, z: -900, size: 18 },
  { name: "Trois-Rivières", x: -1300, z: 0, size: 30 },
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
  // Axe Principal Est-Ouest (Route 138)
  { id: '138', name: 'Route 138', start: [1500, 0], end: [-1500, 0], width: 14, type: 'main' },
  // Autoroute 40 (Parallèle, évite les villages)
  { id: 'a40', name: 'Autoroute 40', start: [1500, -150], end: [-1500, -150], width: 22, type: 'highway' },
  
  // Interconnexions et routes secondaires pour lier tous les villages
  { id: 'r_pont_rouge', name: 'Route 365', start: [900, 0], end: [800, -300], width: 10, type: 'main' },
  { id: 'r_st_raymond', name: 'Route 365 Nord', start: [800, -300], end: [400, -800], width: 10, type: 'main' },
  { id: 'r_cap_sante', name: 'Route de Grand-Ligne', start: [400, 0], end: [400, -800], width: 8, type: 'rural' },
  { id: 'r_ste_christine', name: 'Rang Ste-Christine', start: [400, -800], end: [100, -1000], width: 8, type: 'rural' },
  { id: 'r_st_alban', name: 'Route Principale', start: [100, -1000], end: [-100, -700], width: 10, type: 'main' },
  { id: 'r_st_marc', name: 'Route 363', start: [-100, -700], end: [-200, -300], width: 10, type: 'main' },
  { id: 'r_deschambault', name: 'Route 363 Sud', start: [-200, -300], end: [-300, 0], width: 10, type: 'main' },
  { id: 'r_st_casimir', name: 'Route 354', start: [-200, -300], end: [-500, -400], width: 10, type: 'main' },
  { id: 'r_grondines', name: 'Route Sir-Lomer-Gouin', start: [-500, -400], end: [-500, 0], width: 8, type: 'rural' },
  { id: 'r_st_ubalde', name: 'Route 367', start: [-500, -400], end: [-700, -800], width: 10, type: 'main' },
  { id: 'r_ste_anne', name: 'Route 159', start: [-700, -800], end: [-800, 0], width: 10, type: 'main' },
  { id: 'r_st_tite', name: 'Route 153', start: [-700, -800], end: [-1200, -900], width: 10, type: 'main' },
  { id: 'r_batiscan', name: 'Route 361', start: [-1200, -900], end: [-1000, 0], width: 8, type: 'rural' },
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
