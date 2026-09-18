import { World, Village, POI, Road, WorldPos } from "./schema/WorldTypes";

export function findNearestVillage(world: World, pos: WorldPos): { village: Village; distance: number } | null {
  if (world.villages.length === 0) return null;

  let nearest = world.villages[0];
  let minDistance = Math.hypot(pos.x - nearest.pos.x, pos.z - nearest.pos.z);

  for (let i = 1; i < world.villages.length; i++) {
    const v = world.villages[i];
    const dist = Math.hypot(pos.x - v.pos.x, pos.z - v.pos.z);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = v;
    }
  }

  return { village: nearest, distance: Math.round(minDistance) };
}

export function findPOIsNear(world: World, pos: WorldPos, radiusMeters: number): POI[] {
  return world.pois.filter((poi) => {
    if (!poi.pos) return false;
    const dist = Math.hypot(pos.x - poi.pos.x, pos.z - poi.pos.z);
    return dist <= radiusMeters;
  });
}

export function getRoadsServing(world: World, targetId: string): Road[] {
  return world.roads.filter((r) => r.serves?.includes(targetId));
}

export function findSpawnPoint(world: World): WorldPos {
  const spawnVillage = world.villages.find((v) => v.spawn);
  if (spawnVillage) return spawnVillage.pos;
  if (world.villages.length > 0) return world.villages[0].pos;
  return { x: 0, z: 0 };
}

export function calculateTotalRoadNetworkMeters(world: World): number {
  let total = 0;
  for (const r of world.roads) {
    for (let i = 1; i < r.path.length; i++) {
      const p1 = r.path[i - 1];
      const p2 = r.path[i];
      total += Math.hypot(p1.x - p2.x, p1.z - p2.z);
    }
  }
  return Math.round(total);
}
