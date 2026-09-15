/**
 * Configuration du monde — secteurs, physique, géométrie, spawns.
 * Miroir du schéma (zone_config / surface_physics / zone_bounds / spawn_points).
 * Le client résout la zone à chaque frame ; une zone imbriquée l'emporte.
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
  laneId?: string;
  activeFromHour: number;
  activeToHour: number;
  weight: number;
  enabled: boolean;
}

const MIX_VILLE: TrafficMix = { voiture: 0.55, pickup: 0.25, tracteur: 0.05, camion: 0.15 };
const MIX_VILLAGE: TrafficMix = { voiture: 0.4, pickup: 0.3, tracteur: 0.22, camion: 0.08 };
const MIX_RANG: TrafficMix = { voiture: 0.2, pickup: 0.35, tracteur: 0.4, camion: 0.05 };
const MIX_A40: TrafficMix = { voiture: 0.5, pickup: 0.22, tracteur: 0.03, camion: 0.25 };
const MIX_138: TrafficMix = { voiture: 0.48, pickup: 0.32, tracteur: 0.08, camion: 0.12 };
const MIX_FOREST: TrafficMix = { voiture: 0.15, pickup: 0.55, tracteur: 0.25, camion: 0.05 };

function cfg(partial: ZoneConfig): ZoneConfig {
  return partial;
}

function buildCatalog(): { configs: ZoneConfig[]; bounds: ZoneBound[]; spawns: SpawnPoint[] } {
  const configs: ZoneConfig[] = [];
  const bounds: ZoneBound[] = [];
  const spawns: SpawnPoint[] = [];

  configs.push(
    cfg({
      zoneName: "campagne",
      displayName: "Campagne de Portneuf",
      village: null,
      roadSurface: "grass",
      speedLimit: 70,
      npcDensity: 0.2,
      trafficMix: MIX_RANG,
      pedestrianDensity: 0.08,
      wildlifeDensity: 0.45,
      ambientSound: "vent_champs",
      ambientVolume: 0.45,
      fogDensity: 0.00145,
      fogColor: "#8aa0a8",
      policeResponseSeconds: 360,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 0,
      rpType: "campagne",
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

  configs.push(
    cfg({
      zoneName: "laurentides",
      displayName: "Forêt laurentienne",
      village: null,
      roadSurface: "forest",
      speedLimit: 70,
      npcDensity: 0.05,
      trafficMix: MIX_FOREST,
      pedestrianDensity: 0.02,
      wildlifeDensity: 1.35,
      ambientSound: "foret_pins",
      ambientVolume: 0.7,
      fogDensity: 0.00235,
      fogColor: "#6a7a70",
      policeResponseSeconds: 480,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 1,
      rpType: "forest",
    }),
  );
  bounds.push({
    zoneName: "laurentides",
    shapeType: "box",
    minX: WORLD.minX,
    maxX: WORLD.maxX,
    minZ: WORLD.minZ,
    maxZ: -380,
  });

  configs.push(
    cfg({
      zoneName: "plaine_138",
      displayName: "Plaine agricole du Chemin du Roy",
      village: null,
      roadSurface: "dirt",
      speedLimit: 70,
      npcDensity: 0.18,
      trafficMix: MIX_RANG,
      pedestrianDensity: 0.05,
      wildlifeDensity: 0.35,
      ambientSound: "vent_champs",
      ambientVolume: 0.4,
      fogDensity: 0.0015,
      fogColor: "#9aab9a",
      policeResponseSeconds: 300,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 1,
      rpType: "campagne",
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

  configs.push(
    cfg({
      zoneName: "fleuve",
      displayName: "Fleuve Saint-Laurent",
      village: null,
      roadSurface: "water",
      speedLimit: 30,
      npcDensity: 0,
      trafficMix: MIX_138,
      pedestrianDensity: 0,
      wildlifeDensity: 0.55,
      ambientSound: "fleuve",
      ambientVolume: 0.75,
      fogDensity: 0.0019,
      fogColor: "#7a90a0",
      policeResponseSeconds: 420,
      allowVehicleSpawn: false,
      isSafeZone: false,
      priority: 8,
      rpType: "fleuve",
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

  for (const v of VILLAGES) {
    const ville = v.type === "ville";
    const agricole = v.industry === "agriculture" || v.industry === "acericole";
    const zoneName = `v_${v.id}`;
    configs.push(
      cfg({
        zoneName,
        displayName: v.name,
        village: v.name,
        roadSurface: "village",
        speedLimit: 50,
        npcDensity: ville ? 1.35 : v.type === "hameau" ? 0.45 : 0.85,
        trafficMix: ville ? MIX_VILLE : agricole ? MIX_VILLAGE : MIX_138,
        pedestrianDensity: ville ? 1.15 : v.type === "hameau" ? 0.25 : 0.7,
        wildlifeDensity: ville ? 0.04 : 0.12,
        ambientSound: ville ? "ville_rue" : "village_matin",
        ambientVolume: ville ? 0.55 : 0.5,
        fogDensity: ville ? 0.00125 : 0.0014,
        fogColor: "#8aa0a8",
        policeResponseSeconds: v.policeResponse,
        allowVehicleSpawn: true,
        isSafeZone: false,
        priority: ville ? 5 : 4,
        rpType: ville ? "ville" : "village",
      }),
    );
    bounds.push({
      zoneName,
      shapeType: "circle",
      centerX: v.center[0],
      centerZ: v.center[1],
      radius: v.coreRadius * (ville ? 1.45 : 1.7),
    });

    const church = villageCivicSpot(v, "church");
    const churchName = `eglise_${v.id}`;
    configs.push(
      cfg({
        zoneName: churchName,
        displayName: `Parvis · ${v.name}`,
        village: v.name,
        roadSurface: "parking",
        speedLimit: 20,
        npcDensity: 0.4,
        trafficMix: MIX_VILLAGE,
        pedestrianDensity: 0.5,
        wildlifeDensity: 0,
        ambientSound: "cloche",
        ambientVolume: 0.35,
        fogDensity: 0.0013,
        fogColor: "#8aa0a8",
        policeResponseSeconds: v.policeResponse,
        allowVehicleSpawn: false,
        isSafeZone: true,
        priority: 9,
        rpType: "institution",
      }),
    );
    bounds.push({
      zoneName: churchName,
      shapeType: "circle",
      centerX: church.x,
      centerZ: church.z,
      radius: 18,
    });

    const pedN = ville ? 5 : v.type === "hameau" ? 1 : 3;
    for (let i = 0; i < pedN; i++) {
      const a = (i / pedN) * Math.PI * 2 + v.roadAngle;
      const r = 10 + (i % 3) * 7;
      spawns.push({
        id: `ped_${v.id}_${i}`,
        zoneName,
        spawnType: "pedestrian",
        posX: v.center[0] + Math.cos(a) * r,
        posY: 0,
        posZ: v.center[1] + Math.sin(a) * r,
        heading: a + Math.PI / 2,
        activeFromHour: 6,
        activeToHour: 22,
        weight: 1,
        enabled: true,
      });
    }
  }

  for (const road of ROADS) {
    if (road.kind === "ramp") continue;
    const highway = road.kind === "highway";
    const gravel = road.surface === "gravel";
    const villageRd = road.kind === "village";
    const zoneName = `road_${road.id}`;
    const mix = highway ? MIX_A40 : villageRd ? MIX_138 : gravel ? MIX_FOREST : road.kind === "regional" ? MIX_138 : MIX_RANG;
    configs.push(
      cfg({
        zoneName,
        displayName: road.name,
        village: road.village ?? null,
        roadSurface: gravel ? "gravel" : villageRd ? "village" : "asphalt",
        speedLimit: road.speed,
        npcDensity: highway ? 0.05 : villageRd ? 0.6 : 0.15,
        trafficMix: mix,
        pedestrianDensity: highway ? 0 : villageRd ? 0.45 : gravel ? 0.04 : 0.08,
        wildlifeDensity: gravel ? 0.7 : highway ? 0.1 : 0.25,
        ambientSound: highway ? "autoroute" : gravel ? "gravelle" : "route",
        ambientVolume: highway ? 0.65 : 0.5,
        fogDensity: gravel ? 0.0018 : 0.0014,
        fogColor: gravel ? "#9a8a72" : "#8aa0a8",
        policeResponseSeconds: highway ? 90 : villageRd ? 150 : 240,
        allowVehicleSpawn: true,
        isSafeZone: false,
        priority: highway ? 6 : villageRd ? 3 : 2,
        rpType: highway ? "highway" : "campagne",
      }),
    );
    bounds.push({
      zoneName,
      shapeType: "corridor",
      pathPoints: road.points,
      corridorWidth: road.width + (highway ? 6 : 3.5),
    });
  }

  configs.push(
    cfg({
      zoneName: "prison_zone",
      displayName: "Établissement de Donnacona",
      village: "Donnacona",
      roadSurface: "parking",
      speedLimit: 30,
      npcDensity: 0.3,
      trafficMix: MIX_VILLE,
      pedestrianDensity: 0.15,
      wildlifeDensity: 0,
      ambientSound: "prison",
      ambientVolume: 0.4,
      fogDensity: 0.0017,
      fogColor: "#6a7080",
      policeResponseSeconds: 25,
      allowVehicleSpawn: false,
      isSafeZone: false,
      priority: 8,
      rpType: "prison",
    }),
  );
  bounds.push({
    zoneName: "prison_zone",
    shapeType: "circle",
    centerX: PRISON.x,
    centerZ: PRISON.z,
    radius: 58,
  });

  configs.push(
    cfg({
      zoneName: "papeterie",
      displayName: "Papeterie de Donnacona",
      village: "Donnacona",
      roadSurface: "parking",
      speedLimit: 40,
      npcDensity: 0.55,
      trafficMix: { voiture: 0.25, pickup: 0.25, tracteur: 0.05, camion: 0.45 },
      pedestrianDensity: 0.2,
      wildlifeDensity: 0,
      ambientSound: "usine",
      ambientVolume: 0.6,
      fogDensity: 0.0017,
      fogColor: "#7a8088",
      policeResponseSeconds: 80,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 7,
      rpType: "industrie",
    }),
  );
  bounds.push({
    zoneName: "papeterie",
    shapeType: "circle",
    centerX: PAPETERIE.x,
    centerZ: PAPETERIE.z,
    radius: 48,
  });

  configs.push(
    cfg({
      zoneName: "carriere",
      displayName: "Carrière Saint-Marc",
      village: "Saint-Marc-des-Carrières",
      roadSurface: "dirt",
      speedLimit: 40,
      npcDensity: 0.35,
      trafficMix: { voiture: 0.15, pickup: 0.4, tracteur: 0.15, camion: 0.3 },
      pedestrianDensity: 0.08,
      wildlifeDensity: 0.15,
      ambientSound: "carriere",
      ambientVolume: 0.55,
      fogDensity: 0.002,
      fogColor: "#a09888",
      policeResponseSeconds: 200,
      allowVehicleSpawn: true,
      isSafeZone: false,
      priority: 7,
      rpType: "industrie",
    }),
  );
  bounds.push({
    zoneName: "carriere",
    shapeType: "circle",
    centerX: -480,
    centerZ: -200,
    radius: 70,
  });

  for (const p of POIS) {
    if (p.type === "echangeur") {
      const zoneName = p.id;
      configs.push(
        cfg({
          zoneName,
          displayName: p.name,
          village: null,
          roadSurface: "asphalt",
          speedLimit: 70,
          npcDensity: 0.1,
          trafficMix: MIX_A40,
          pedestrianDensity: 0,
          wildlifeDensity: 0.05,
          ambientSound: "autoroute",
          ambientVolume: 0.7,
          fogDensity: 0.0015,
          fogColor: "#8aa0a8",
          policeResponseSeconds: 70,
          allowVehicleSpawn: true,
          isSafeZone: false,
          priority: 7,
          rpType: "highway",
        }),
      );
      bounds.push({
        zoneName,
        shapeType: "circle",
        centerX: p.x,
        centerZ: p.z,
        radius: p.radius,
      });
    }
  }

  for (const lake of LAKES) {
    const zoneName = `lac_${lake.name.replace(/\s+/g, "_").toLowerCase()}`;
    configs.push(
      cfg({
        zoneName,
        displayName: lake.name,
        village: null,
        roadSurface: "sand",
        speedLimit: 30,
        npcDensity: 0.1,
        trafficMix: MIX_FOREST,
        pedestrianDensity: 0.12,
        wildlifeDensity: 0.9,
        ambientSound: "lac",
        ambientVolume: 0.6,
        fogDensity: 0.0021,
        fogColor: "#8a9aa0",
        policeResponseSeconds: 420,
        allowVehicleSpawn: false,
        isSafeZone: false,
        priority: 6,
        rpType: "forest",
      }),
    );
    bounds.push({
      zoneName,
      shapeType: "circle",
      centerX: lake.x,
      centerZ: lake.z,
      radius: lake.r + 22,
    });
  }

  const wildlifeHomes: Array<[string, number, number, string]> = [
    ["orignal_eboulis", -640, -590, "laurentides"],
    ["orignal_carillon", -540, -780, "laurentides"],
    ["orignal_raymond", 900, -700, "laurentides"],
    ["loup_alpha", 180, -700, "laurentides"],
    ["ours_bouclier", -200, -640, "laurentides"],
    ["renard_deschambault", -440, 62, "plaine_138"],
    ["castor_fleuve", -100, 84, "fleuve"],
    ["chevreuil_blanc", -360, -770, "laurentides"],
    ["chevreuil_long", -700, -780, "laurentides"],
  ];
  for (const [id, x, z, zoneName] of wildlifeHomes) {
    spawns.push({
      id,
      zoneName,
      spawnType: "wildlife",
      posX: x,
      posY: 0,
      posZ: z,
      heading: 0,
      activeFromHour: 0,
      activeToHour: 24,
      weight: 1,
      enabled: true,
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

export function parseFogColor(hex: string): number {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h.length === 6 ? h : "8aa0a8", 16);
  return Number.isFinite(n) ? n : 0x8aa0a8;
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
      `SQ ${Math.round(c.policeResponseSeconds / 60)} min · prio ${c.priority}${c.isSafeZone ? " · zone sûre" : ""}`,
      `piétons ${c.pedestrianDensity.toFixed(2)} · faune ${c.wildlifeDensity.toFixed(2)} · PNJ ${c.npcDensity.toFixed(2)}`,
      `trafic  berline ${(mix.voiture * 100).toFixed(0)}%  pick-up ${(mix.pickup * 100).toFixed(0)}%  tracteur ${(mix.tracteur * 100).toFixed(0)}%  camion ${(mix.camion * 100).toFixed(0)}%`,
      `brouillard ${c.fogDensity} · ${c.ambientSound}`,
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
