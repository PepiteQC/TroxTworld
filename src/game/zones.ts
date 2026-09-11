import { A40_Z, POIS, PRISON, RIVER_Z, VILLAGES } from "./worlddata";

export type ZoneType =
  | "prison"
  | "institution"
  | "industrie"
  | "highway"
  | "ville"
  | "village"
  | "fleuve"
  | "forest"
  | "campagne";

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
  priority: number;
}

// 1. Priorité claire en cas de chevauchement (plus le chiffre est haut, plus la zone l'emporte)
export const ZONE_PRIORITIES: Record<ZoneType, number> = {
  prison: 100,
  institution: 80,
  industrie: 60,
  highway: 50,
  ville: 40,
  village: 30,
  fleuve: 20,
  forest: 10,
  campagne: 0,
};

export const RULES: Record<ZoneType, ZoneRules> = {
  prison: { speedLimit: 30, carryWeapons: false, harvest: false, wantedMul: 1.8 },
  institution: { speedLimit: 40, carryWeapons: false, harvest: false, wantedMul: 1.5 },
  industrie: { speedLimit: 40, carryWeapons: false, harvest: false, wantedMul: 1.1 },
  highway: { speedLimit: 100, carryWeapons: true, harvest: false, wantedMul: 1.2 },
  ville: { speedLimit: 50, carryWeapons: false, harvest: false, wantedMul: 1.3 },
  village: { speedLimit: 50, carryWeapons: true, harvest: false, wantedMul: 1.15 },
  fleuve: { speedLimit: 30, carryWeapons: true, harvest: false, wantedMul: 0.8 },
  forest: { speedLimit: 70, carryWeapons: true, harvest: true, wantedMul: 0.7 },
  campagne: { speedLimit: 70, carryWeapons: true, harvest: true, wantedMul: 0.9 },
};

// 2. Mapping POI typé et sécurisé
const POI_TYPE_MAP: Record<string, ZoneType> = {
  institution: "institution",
  hopital: "institution",
  police: "institution",
  usine: "industrie",
  industrie: "industrie",
  echangeur: "highway",
  faune: "forest",
  village: "village",
  ville: "ville",
};

function normalizePoiType(rawType: string): ZoneType {
  return POI_TYPE_MAP[rawType.toLowerCase()] ?? "campagne";
}

// 3. Zones constantes de fond (évite les allocations d'objets inutiles à chaque tick)
const STATIC_ZONES = {
  fleuve: (x: number, z: number): RPZone => ({
    id: "fleuve",
    name: "Fleuve Saint-Laurent",
    type: "fleuve",
    x,
    z,
    radius: 0,
    rules: RULES.fleuve,
    priority: ZONE_PRIORITIES.fleuve,
  }),
  laurentides: (x: number, z: number): RPZone => ({
    id: "laurentides",
    name: "Forêt laurentienne",
    type: "forest",
    x,
    z,
    radius: 0,
    rules: RULES.forest,
    priority: ZONE_PRIORITIES.forest,
  }),
  campagne: (x: number, z: number): RPZone => ({
    id: "campagne",
    name: "Campagne de Portneuf",
    type: "campagne",
    x,
    z,
    radius: 0,
    rules: RULES.campagne,
    priority: ZONE_PRIORITIES.campagne,
  }),
  a40: (x: number, z: number): RPZone => ({
    id: "a40",
    name: "Autoroute 40 (Félix-Leclerc)",
    type: "highway",
    x,
    z,
    radius: 25,
    rules: RULES.highway,
    priority: ZONE_PRIORITIES.highway,
  }),
};

export function buildPortneufZones(): RPZone[] {
  const zones: RPZone[] = [];

  // Villes et villages
  for (const v of VILLAGES) {
    const type: ZoneType = v.type === "ville" ? "ville" : "village";
    zones.push({
      id: `v_${v.id}`,
      name: v.name,
      type,
      x: v.center[0],
      z: v.center[1],
      radius: v.coreRadius * 1.5,
      rules: RULES[type],
      priority: ZONE_PRIORITIES[type],
    });
  }

  // Points d'intérêt
  for (const p of POIS) {
    const type = normalizePoiType(p.type);
    zones.push({
      id: p.id,
      name: p.name,
      type,
      x: p.x,
      z: p.z,
      radius: p.radius,
      rules: RULES[type],
      priority: ZONE_PRIORITIES[type],
    });
  }

  // Pénitencier de Donnacona
  zones.push({
    id: "prison_zone",
    name: "Établissement de Donnacona",
    type: "prison",
    x: PRISON.x,
    z: PRISON.z,
    radius: 65,
    rules: RULES.prison,
    priority: ZONE_PRIORITIES.prison,
  });

  return zones;
}

export class ZoneSystem {
  private zones: RPZone[];

  // Largeur du corridor de l'autoroute en mètres
  private readonly A40_HALF_WIDTH = 25;
  // Limites X du Comté (ajuste selon ta map)
  private readonly A40_MIN_X = -2000;
  private readonly A40_MAX_X = 2000;

  constructor(zones = buildPortneufZones()) {
    this.zones = zones;
  }

  /**
   * Retourne la zone active avec la plus haute priorité à la position (x, z).
   */
  getAt(x: number, z: number): RPZone {
    let candidate: RPZone | null = null;
    let highestPrio = -1;
    let closestDistSq = Infinity;

    // 1. Vérifie toutes les zones circulaires enregistrées
    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      const dx = x - zone.x;
      const dz = z - zone.z;
      const distSq = dx * dx + dz * dz;
      const radiusSq = zone.radius * zone.radius;

      if (distSq <= radiusSq) {
        if (
          zone.priority > highestPrio ||
          (zone.priority === highestPrio && distSq < closestDistSq)
        ) {
          candidate = zone;
          highestPrio = zone.priority;
          closestDistSq = distSq;
        }
      }
    }

    // 2. Vérifie le corridor linéaire de l'Autoroute 40
    if (
      Math.abs(z - A40_Z) <= this.A40_HALF_WIDTH &&
      x >= this.A40_MIN_X &&
      x <= this.A40_MAX_X
    ) {
      if (ZONE_PRIORITIES.highway > highestPrio) {
        return STATIC_ZONES.a40(x, z);
      }
    }

    // Si une zone prioritaire (prison, village, etc.) a matché, on la retourne
    if (candidate) {
      return candidate;
    }

    // 3. Régions géographiques globales (fallback si aucune zone spécifique)
    if (z > RIVER_Z - 8) {
      return STATIC_ZONES.fleuve(x, z);
    }

    if (z < -380) {
      return STATIC_ZONES.laurentides(x, z);
    }

    return STATIC_ZONES.campagne(x, z);
  }

  /**
   * Vérifie si un joueur est dans une zone spécifique par son ID
   */
  isInZone(x: number, z: number, zoneId: string): boolean {
    return this.getAt(x, z).id === zoneId;
  }

  /**
   * Récupère la liste de toutes les zones enregistrées
   */
  getAllZones(): readonly RPZone[] {
    return this.zones;
  }
}

export const zoneSystem = new ZoneSystem();