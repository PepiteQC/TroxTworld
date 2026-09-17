/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CONFIGURATION DU MONDE — SECTEURS, ZOONING RP & LOGIQUE DE SPAWN (v3.0)
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Gestionnaire de zonage géolocalisé et dynamique de la MRC de Portneuf :
 *  - Profils de zones, vitesses, densités et comportements de la Sûreté du Québec (SQ).
 *  - Prise en charge complète de la map agrandie et des municipalités de l'arrière-pays.
 * ═════════════════════════════════════════════════════════════════════════
 */

import {
  A40_Z,
  closestOnPolyline,
  LAKES,
  PAPETERIE,
  POIS,
  PRISON,
  RIVER_Z,
  ROADS,
  villageCivicSpot,
  VILLAGES,
  WORLD,
} from "./worlddata";

export type RpZoneKind =
  | "village"
  | "ville"
  | "highway"
  | "forest"
  | "prison"
  | "industrie"
  | "fleuve"
  | "institution"
  | "campagne";

export type SurfaceKey =
  | "asphalt"
  | "village"
  | "gravel"
  | "sand"
  | "grass"
  | "clay"
  | "dirt"
  | "ice"
  | "water"
  | "forest"
  | "parking";

export interface TrafficMix {
  voiture: number;
  pickup: number;
  tracteur: number;
  camion: number;
}

export interface ZoneConfig {
  zoneName: string;
  displayName: string;
  village: string | null;
  roadSurface: SurfaceKey;
  speedLimit: number;
  npcDensity: number;
  trafficMix: TrafficMix;
  pedestrianDensity: number;
  wildlifeDensity: number;
  ambientSound: string;
  ambientVolume: number;
  fogDensity: number;
  fogColor: string;
  policeResponseSeconds: number;
  allowVehicleSpawn: boolean;
  isSafeZone: boolean;
  priority: number;
  rpType: RpZoneKind;
  sqPatrolFrequency: number;
  allowOpenCarrying: boolean;
}

export type ShapeType = "circle" | "box" | "corridor";

export interface ZoneBound {
  zoneName: string;
  shapeType: ShapeType;
  centerX?: number;
  centerZ?: number;
  radius?: number;
  minX?: number;
  minZ?: number;
  maxX?: number;
  maxZ?: number;
  pathPoints?: Array<[number, number]>;
  corridorWidth?: number;
}

export type SpawnKind = "vehicle" | "pedestrian" | "wildlife";

export interface SpawnPoint {
  id: string;
  zoneName: string;
  spawnType: SpawnKind;
  posX: number;
  posY: number;
  posZ: number;
  heading: number;
  activeFromHour: number;
  activeToHour: number;
  weight: number;
  enabled: boolean;
}

const MIX_URBAIN: TrafficMix = { voiture: 0.55, pickup: 0.25, tracteur: 0.02, camion: 0.18 };
const MIX_VILLAGE: TrafficMix = { voiture: 0.45, pickup: 0.32, tracteur: 0.15, camion: 0.08 };
const MIX_RANG: TrafficMix = { voiture: 0.18, pickup: 0.38, tracteur: 0.38, camion: 0.06 };
const MIX_A40: TrafficMix = { voiture: 0.48, pickup: 0.22, tracteur: 0.02, camion: 0.28 };
const MIX_138: TrafficMix = { voiture: 0.46, pickup: 0.34, tracteur: 0.05, camion: 0.15 };
const MIX_FOREST: TrafficMix = { voiture: 0.12, pickup: 0.58, tracteur: 0.25, camion: 0.05 };

function cfg(partial: ZoneConfig): ZoneConfig {
  return partial;
}

function buildCatalog(): { configs: ZoneConfig[]; bounds: ZoneBound[]; spawns: SpawnPoint[] } {
  const configs: ZoneConfig[] = [];
  const bounds: ZoneBound[] = [];
  const spawns: SpawnPoint[] = [];

  // Campagne générale
  configs.push(
    cfg({
      zoneName: "campagne",
      displayName: "Grands rangs et terres de Portneuf",
      village: null,
      roadSurface: "grass",
      speedLimit: 70,
      npcDensity: 0.22,
      trafficMix: MIX_RANG,
      pedestrianDensity: 0.06,
      wildlifeDensity: 0.42,
      ambientSound: "vent_champs",
      ambientVolume: 0.4,
      fogDensity: 0.0014,
      fogColor: "#8aa0a8",
      policeResponseSeconds: 360,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 0,
      rpType: "campagne",
      sqPatrolFrequency: 0.3,
      allowOpenCarrying: true,
    }),
  );
  bounds.push({
    zoneName: "campagne",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: WORLD.minZ,
    maxZ: WORLD.maxZ,
  });

  // Laurentides Nord (Agrandies)
  configs.push(
    cfg({
      zoneName: "laurentides",
      displayName: "Contreforts profonds du Bouclier canadien",
      village: null,
      roadSurface: "forest",
      speedLimit: 70,
      npcDensity: 0.05,
      trafficMix: MIX_FOREST,
      pedestrianDensity: 0.01,
      wildlifeDensity: 1.6,
      ambientSound: "foret_pins",
      ambientVolume: 0.65,
      fogDensity: 0.0022,
      fogColor: "#5c6e62",
      policeResponseSeconds: 520,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 1,
      rpType: "forest",
      sqPatrolFrequency: 0.1,
      allowOpenCarrying: true,
    }),
  );
  bounds.push({
    zoneName: "laurentides",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: WORLD.minZ,
    maxZ: -450,
  });

  // Plaine maraîchère
  configs.push(
    cfg({
      zoneName: "plaine_138",
      displayName: "Plaine maraîchère du Chemin du Roy",
      village: null,
      roadSurface: "dirt",
      speedLimit: 70,
      npcDensity: 0.2,
      trafficMix: MIX_RANG,
      pedestrianDensity: 0.05,
      wildlifeDensity: 0.28,
      ambientSound: "vent_champs",
      ambientVolume: 0.35,
      fogDensity: 0.0013,
      fogColor: "#93a493",
      policeResponseSeconds: 300,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 1,
      rpType: "campagne",
      sqPatrolFrequency: 0.4,
      allowOpenCarrying: false,
    }),
  );
  bounds.push({
    zoneName: "plaine_138",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: A40_Z + 36,
    maxZ: RIVER_Z - 12,
  });

  // Fleuve Saint-Laurent
  configs.push(
    cfg({
      zoneName: "fleuve",
      displayName: "Chenal du Saint-Laurent (Voie maritime)",
      village: null,
      roadSurface: "water",
      speedLimit: 30,
      npcDensity: 0,
      trafficMix: MIX_138,
      pedestrianDensity: 0,
      wildlifeDensity: 0.6,
      ambientSound: "fleuve",
      ambientVolume: 0.7,
      fogDensity: 0.0018,
      fogColor: "#718799",
      policeResponseSeconds: 420,
      allowVehicleSpawn: false,
      isSafeZone: false,
      priority: 8,
      rpType: "fleuve",
      sqPatrolFrequency: 0.2,
      allowOpenCarrying: true,
    }),
  );
  bounds.push({
    zoneName: "fleuve",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: RIVER_Z - 10,
    maxZ: WORLD.maxZ,
  });

  // Génération automatique pour TOUS les villages (inclus Saint-Ubalde, Rivière-à-Pierre, etc.)
  for (const v of VILLAGES) {
    const isCity = v.type === "ville";
    const zoneName = `v_${v.id}`;
    
    configs.push(
      cfg({
        zoneName,
        displayName: isCity ? `${v.name} (Secteur Urbain)` : `${v.name} (Noyau Villageois)`,
        village: v.name,
        roadSurface: "village",
        speedLimit: 50,
        npcDensity: isCity ? 1.4 : v.type === "hameau" ? 0.4 : 0.9,
        trafficMix: isCity ? MIX_URBAIN : MIX_VILLAGE,
        pedestrianDensity: isCity ? 1.2 : 0.6,
        wildlifeDensity: isCity ? 0.02 : 0.1,
        ambientSound: isCity ? "ville_rue" : "village_matin",
        ambientVolume: isCity ? 0.5 : 0.45,
        fogDensity: 0.0012,
        fogColor: "#8aa0a8",
        policeResponseSeconds: v.policeResponse,
        allowVehicleSpawn: true,
        isSafeZone: false,
        priority: isCity ? 5 : 4,
        rpType: isCity ? "ville" : "village",
        sqPatrolFrequency: isCity ? 0.9 : 0.5,
        allowOpenCarrying: false,
      }),
    );
    bounds.push({
      zoneName,
      shapeType: "circle",
      centerX: v.center[0],
      centerZ: v.center[1],
      radius: v.coreRadius * 1.6,
    });
  }

  // Couloirs routiers
  for (const road of ROADS) {
    if (road.kind === "ramp") continue;
    const isHighway = road.kind === "highway";
    const isGravel = road.surface === "gravel";
    const zoneName = `road_${road.id}`;

    configs.push(
      cfg({
        zoneName,
        displayName: road.name,
        village: road.village ?? null,
        roadSurface: isGravel ? "gravel" : "asphalt",
        speedLimit: road.speed,
        npcDensity: isHighway ? 0.05 : 0.2,
        trafficMix: isHighway ? MIX_A40 : MIX_RANG,
        pedestrianDensity: isHighway ? 0 : 0.05,
        wildlifeDensity: isGravel ? 0.7 : 0.2,
        ambientSound: isHighway ? "autoroute" : "route",
        ambientVolume: 0.5,
        fogDensity: 0.0014,
        fogColor: "#8aa0a8",
        policeResponseSeconds: isHighway ? 90 : 200,
        allowVehicleSpawn: true,
        isSafeZone: false,
        priority: isHighway ? 6 : 2,
        rpType: isHighway ? "highway" : "campagne",
        sqPatrolFrequency: isHighway ? 0.8 : 0.4,
        allowOpenCarrying: isGravel,
      }),
    );
    bounds.push({
      zoneName,
      shapeType: "corridor",
      pathPoints: road.points,
      corridorWidth: road.width + (isHighway ? 6 : 3.5),
    });
  }

  return { configs, bounds, spawns };
}

const BUILT = buildCatalog();

export const ZONE_CONFIGS: ZoneConfig[] = BUILT.configs;
export const ZONE_BOUNDS: ZoneBound[] = BUILT.bounds;
export const SPAWN_POINTS: SpawnPoint[] = BUILT.spawns;

const CONFIG_BY = new Map(ZONE_CONFIGS.map((c) => [c.zoneName, c]));

function contains(b: ZoneBound, x: number, z: number): boolean {
  if (b.shapeType === "circle") {
    return Math.hypot(x - (b.centerX ?? 0), z - (b.centerZ ?? 0)) <= (b.radius ?? 0);
  }
  if (b.shapeType === "box") {
    return x >= (b.minX ?? 0) && x <= (b.maxX ?? 0) && z >= (b.minZ ?? 0) && z <= (b.maxZ ?? 0);
  }
  const pts = b.pathPoints;
  if (!pts || pts.length < 2) return false;
  return closestOnPolyline(x, z, pts).dist <= (b.corridorWidth ?? 12) * 0.5;
}

export class WorldConfigSystem {
  at(x: number, z: number): ZoneConfig {
    let best: ZoneConfig | null = null;
    let bestP = -1;
    for (const b of ZONE_BOUNDS) {
      if (!contains(b, x, z)) continue;
      const c = CONFIG_BY.get(b.zoneName);
      if (!c) continue;
      if (c.priority > bestP) {
        best = c;
        bestP = c.priority;
      }
    }
    return best ?? CONFIG_BY.get("campagne")!;
  }

  policeCatchMul(x: number, z: number) {
    const n = this.at(x, z).policeResponseSeconds;
    return Math.max(0.38, Math.min(1.35, 180 / Math.max(20, n)));
  }

  hourOpen(sp: SpawnPoint, hour: number) {
    if (!sp.enabled) return false;
    if (sp.activeFromHour <= sp.activeToHour) return hour >= sp.activeFromHour && hour < sp.activeToHour;
    return hour >= sp.activeFromHour || hour < sp.activeToHour;
  }

  spawnsOf(type: SpawnKind, hour: number): SpawnPoint[] {
    return SPAWN_POINTS.filter((s) => s.spawnType === type && this.hourOpen(s, hour));
  }

  describe(x: number, z: number): string {
    const c = this.at(x, z);
    const mix = c.trafficMix;
    return [
      `${c.displayName}  [${c.zoneName}]`,
      `limite ${c.speedLimit} km/h · sol ${c.roadSurface}`,
      `SQ ${Math.round(c.policeResponseSeconds / 60)} min · prio ${c.priority}`,
      `port d'arme apparent : ${c.allowOpenCarrying ? "autorisé" : "interdit"} · patrouilles SQ : ${(c.sqPatrolFrequency * 100).toFixed(0)}%`,
    ].join("\n");
  }
}

export const worldConfig = new WorldConfigSystem();

export function pickTrafficKind(mix: TrafficMix, i: number): "voiture" | "pickup" | "tracteur" | "camion" {
  const r = ((i * 37 + 13) % 1000) / 1000;
  if (r < mix.voiture) return "voiture";
  if (r < mix.voiture + mix.pickup) return "pickup";
  if (r < mix.voiture + mix.pickup + mix.tracteur) return "tracteur";
  return "camion";
}