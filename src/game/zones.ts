import { A40_Z, getPoiAt, getVillageAt, POIS, PRISON, RIVER_Z, VILLAGES } from "./worlddata";
import { worldConfig, type RpZoneKind } from "./worldconfig";

export type ZoneType = RpZoneKind;

export interface ZoneRules {
  speedLimit: number;
  carryWeapons: boolean;
  harvest: boolean;
  wantedMul: number;
}

export interface RPZone {
  id: string;
  name: string;
  type: ZoneType;
  x: number;
  z: number;
  radius: number;
  rules: ZoneRules;
}

const RULES: Record<ZoneType, ZoneRules> = {
  village: { speedLimit: 50, carryWeapons: true, harvest: false, wantedMul: 1.15 },
  ville: { speedLimit: 50, carryWeapons: true, harvest: false, wantedMul: 1.25 },
  highway: { speedLimit: 100, carryWeapons: true, harvest: false, wantedMul: 1.4 },
  forest: { speedLimit: 70, carryWeapons: true, harvest: true, wantedMul: 0.7 },
  prison: { speedLimit: 30, carryWeapons: false, harvest: false, wantedMul: 1.8 },
  industrie: { speedLimit: 40, carryWeapons: false, harvest: false, wantedMul: 1.1 },
  fleuve: { speedLimit: 30, carryWeapons: true, harvest: false, wantedMul: 0.8 },
  institution: { speedLimit: 40, carryWeapons: false, harvest: false, wantedMul: 1.5 },
  campagne: { speedLimit: 70, carryWeapons: true, harvest: true, wantedMul: 0.9 },
};

function poiType(type: string): ZoneType {
  if (type === "institution") return "institution";
  if (type === "usine" || type === "industrie") return "industrie";
  if (type === "echangeur") return "highway";
  if (type === "faune") return "forest";
  if (type === "village") return "village";
  return "campagne";
}

export function buildPortneufZones(): RPZone[] {
  const zones: RPZone[] = [];
  for (const v of VILLAGES) {
    const type: ZoneType = v.type === "ville" ? "ville" : "village";
    zones.push({
      id: `v_${v.id}`,
      name: v.name,
      type,
      x: v.center[0],
      z: v.center[1],
      radius: v.coreRadius * 1.6,
      rules: RULES[type],
    });
  }
  for (const p of POIS) {
    zones.push({
      id: p.id,
      name: p.name,
      type: poiType(p.type),
      x: p.x,
      z: p.z,
      radius: p.radius,
      rules: RULES[poiType(p.type)],
    });
  }
  zones.push({
    id: "a40",
    name: "Autoroute 40",
    type: "highway",
    x: 0,
    z: A40_Z,
    radius: 28,
    rules: RULES.highway,
  });
  zones.push({
    id: "prison_zone",
    name: "Établissement de Donnacona",
    type: "prison",
    x: PRISON.x,
    z: PRISON.z,
    radius: 58,
    rules: RULES.prison,
  });
  return zones;
}

export class ZoneSystem {
  zones: RPZone[];
  constructor(zones = buildPortneufZones()) {
    this.zones = zones;
  }

  getAt(x: number, z: number): RPZone | null {
    const cfg = worldConfig.at(x, z);
    const rules = { ...RULES[cfg.rpType], speedLimit: cfg.speedLimit };
    if (cfg.isSafeZone) rules.carryWeapons = false;
    return {
      id: cfg.zoneName,
      name: cfg.displayName,
      type: cfg.rpType,
      x,
      z,
      radius: 40,
      rules,
    };
  }

  /** Legacy circle lookup kept for carte / debug. */
  getCircleAt(x: number, z: number): RPZone | null {
    if (z > RIVER_Z - 8) {
      return { id: "fleuve", name: "Fleuve Saint-Laurent", type: "fleuve", x, z, radius: 40, rules: RULES.fleuve };
    }
    let best: RPZone | null = null;
    let bestD = Infinity;
    for (const zone of this.zones) {
      const d = Math.hypot(x - zone.x, z - zone.z);
      if (d <= zone.radius && d < bestD) {
        best = zone;
        bestD = d;
      }
    }
    if (best) return best;
    const v = getVillageAt(x, z);
    if (v) {
      return {
        id: v.id,
        name: v.name,
        type: v.type === "ville" ? "ville" : "village",
        x: v.center[0],
        z: v.center[1],
        radius: v.coreRadius,
        rules: RULES.ville,
      };
    }
    const poi = getPoiAt(x, z);
    if (poi) {
      return {
        id: poi.id,
        name: poi.name,
        type: poiType(poi.type),
        x: poi.x,
        z: poi.z,
        radius: poi.radius,
        rules: RULES[poiType(poi.type)],
      };
    }
    if (z < -380) {
      return { id: "laurentides", name: "Forêt laurentienne", type: "forest", x, z, radius: 200, rules: RULES.forest };
    }
    return { id: "campagne", name: "Campagne de Portneuf", type: "campagne", x, z, radius: 80, rules: RULES.campagne };
  }
}

export const zoneSystem = new ZoneSystem();
