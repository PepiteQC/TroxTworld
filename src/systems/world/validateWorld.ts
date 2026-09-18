/**
 * validateWorld.ts — Vérifie la cohérence des données du monde.
 *  - ids uniques (villages, routes, POI, activités, régions)
 *  - régions/biomes référencés valides
 *  - routes avec au moins 2 points
 *  - "serves" pointant vers des ids existants
 *  - tout le contenu dans les bornes
 *  - au moins 1 spawn
 */
import { World } from "./schema/WorldTypes";

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
  stats: {
    regions: number;
    villages: number;
    roads: number;
    pois: number;
    activities: number;
    biomeZones: number;
    spawns: number;
    roadKm: number;
  };
}

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function validateWorld(world: World): ValidationReport {
  const issues: ValidationIssue[] = [];
  const err = (m: string) => issues.push({ level: "error", message: m });
  const warn = (m: string) => issues.push({ level: "warning", message: m });

  // --- ids uniques ---
  const checkUnique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err(`${label} : id dupliqué "${id}"`);
      seen.add(id);
    }
  };
  checkUnique("régions", world.regions.map((r) => r.id));
  checkUnique("villages", world.villages.map((v) => v.id));
  checkUnique("routes", world.roads.map((r) => r.id));
  checkUnique("POI", world.pois.map((p) => p.id));
  checkUnique("activités", world.activities.map((a) => a.id));

  const regionIds = new Set(world.regions.map((r) => r.id));
  const villageIds = new Set(world.villages.map((v) => v.id));
  const poiIds = new Set(world.pois.map((p) => p.id));
  const anchorIds = new Set<string>([...villageIds, ...poiIds]);

  // --- références régions ---
  const checkRegion = (label: string, region: string) => {
    if (!regionIds.has(region)) err(`${label} : région inconnue "${region}"`);
  };
  world.villages.forEach((v) => checkRegion(`village ${v.id}`, v.region));
  world.pois.forEach((p) => checkRegion(`POI ${p.id}`, p.region));
  world.activities.forEach((a) => checkRegion(`activité ${a.id}`, a.region));
  world.biomeZones.forEach((b) => checkRegion(`zone ${b.id}`, b.region));

  // --- routes ---
  for (const r of world.roads) {
    if (r.path.length < 2) err(`route ${r.id} : moins de 2 points`);
    if (r.speedLimit <= 0) warn(`route ${r.id} : vitesse non définie`);
    for (const s of r.serves ?? []) {
      if (!villageIds.has(s) && !poiIds.has(s)) {
        warn(`route ${r.id} : "serves" pointe vers un id inconnu "${s}"`);
      }
    }
  }

  // --- ancrages activités ---
  for (const a of world.activities) {
    if (a.anchor && !anchorIds.has(a.anchor)) {
      warn(`activité ${a.id} : ancrage inconnu "${a.anchor}"`);
    }
  }

  // --- bornes ---
  const b = world.meta.bounds;
  const inBounds = (c: { x: number; z: number }) =>
    c.x >= b.minX && c.x <= b.maxX && c.z >= b.minZ && c.z <= b.maxZ;
  world.villages.forEach((v) => {
    if (!inBounds(v.pos)) err(`village ${v.id} hors des bornes`);
  });

  // --- "pas une ligne droite" : les villages ne doivent pas être colinéaires ---
  const xs = world.villages.map((v) => v.pos.x);
  const zs = world.villages.map((v) => v.pos.z);
  const spreadX = Math.max(...xs) - Math.min(...xs);
  const spreadZ = Math.max(...zs) - Math.min(...zs);
  if (spreadZ < spreadX * 0.3) {
    warn("les villages semblent alignés horizontalement (manque de dispersion Z)");
  }

  // --- spawns ---
  const spawns = world.villages.filter((v) => v.spawn).length;
  if (spawns === 0) err("aucun point de spawn défini");

  // --- distance min entre villages ---
  for (let i = 0; i < world.villages.length; i++) {
    for (let j = i + 1; j < world.villages.length; j++) {
      const d = dist(world.villages[i].pos, world.villages[j].pos);
      if (d < 150) {
        warn(`villages ${world.villages[i].id} et ${world.villages[j].id} très proches (${Math.round(d)}m)`);
      }
    }
  }

  // --- longueur totale du réseau routier (km) ---
  let roadMeters = 0;
  for (const r of world.roads) {
    for (let i = 1; i < r.path.length; i++) roadMeters += dist(r.path[i - 1], r.path[i]);
  }

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;

  return {
    ok: errors === 0,
    errors,
    warnings,
    issues,
    stats: {
      regions: world.regions.length,
      villages: world.villages.length,
      roads: world.roads.length,
      pois: world.pois.length,
      activities: world.activities.length,
      biomeZones: world.biomeZones.length,
      spawns,
      roadKm: Math.round(roadMeters / 1000),
    },
  };
}

export default validateWorld;
