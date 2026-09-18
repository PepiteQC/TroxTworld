import { World, WorldBounds } from "./schema/WorldTypes";

export interface GeneratorConfig {
  bounds?: WorldBounds;
  regionCount?: number;
  villageCount?: number;
  roadCount?: number;
}

export function generateProceduralWorld(config?: GeneratorConfig): World {
  const bounds: WorldBounds = config?.bounds ?? {
    minX: -1500,
    maxX: 1500,
    minZ: -1500,
    maxZ: 1500,
  };

  const regionCount = config?.regionCount ?? 3;
  const villageCount = config?.villageCount ?? 4;

  const regions = Array.from({ length: regionCount }, (_, i) => ({
    id: `gen_region_${i + 1}`,
    name: `Secteur Procédural ${String.fromCharCode(65 + i)}`,
  }));

  const villages = [];
  const minDist = 200;

  for (let i = 0; i < villageCount; i++) {
    let x = 0;
    let z = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 50) {
      attempts++;
      x = Math.floor(bounds.minX + 200 + Math.random() * (bounds.maxX - bounds.minX - 400));
      z = Math.floor(bounds.minZ + 200 + Math.random() * (bounds.maxZ - bounds.minZ - 400));

      valid = true;
      for (const v of villages) {
        if (Math.hypot(v.pos.x - x, v.pos.z - z) < minDist) {
          valid = false;
          break;
        }
      }
    }

    villages.push({
      id: `gen_village_${i + 1}`,
      region: regions[i % regions.length].id,
      pos: { x, z },
      spawn: i === 0,
    });
  }

  // Roads connecting consecutive villages
  const roads = [];
  for (let i = 0; i < villages.length - 1; i++) {
    const v1 = villages[i];
    const v2 = villages[i + 1];
    const midX = Math.round((v1.pos.x + v2.pos.x) / 2 + (Math.random() - 0.5) * 100);
    const midZ = Math.round((v1.pos.z + v2.pos.z) / 2 + (Math.random() - 0.5) * 100);

    roads.push({
      id: `gen_road_${i + 1}`,
      path: [
        { x: v1.pos.x, z: v1.pos.z },
        { x: midX, z: midZ },
        { x: v2.pos.x, z: v2.pos.z },
      ],
      speedLimit: 80,
      serves: [v1.id, v2.id],
    });
  }

  // POIs around villages
  const pois = [];
  const activities = [];

  villages.forEach((v, idx) => {
    const poiId = `gen_poi_${idx + 1}`;
    pois.push({
      id: poiId,
      region: v.region,
      pos: { x: v.pos.x + 25, z: v.pos.z - 20 },
    });

    activities.push({
      id: `gen_activity_${idx + 1}`,
      region: v.region,
      anchor: poiId,
    });
  });

  const biomeZones = regions.map((r, i) => ({
    id: `gen_biome_${i + 1}`,
    region: r.id,
  }));

  return {
    meta: { bounds },
    regions,
    villages,
    roads,
    pois,
    activities,
    biomeZones,
  };
}
