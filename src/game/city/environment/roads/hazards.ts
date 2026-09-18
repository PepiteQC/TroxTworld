/**
 * 🛣️ HAZARDS — Nids-de-poule, glace, chantiers (déterministes)
 */
import type { Pothole, IcePatch, ConstructionZone, RoadCurve, Season } from "./types";
import { HAZARDS } from "./config";

// ═══════════════════════════════════════════════════════════
// SEEDED RNG
// ═══════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRATION DÉTERMINISTE
// ═══════════════════════════════════════════════════════════

export function generatePotholes(road: RoadCurve, season: Season): Pothole[] {
  if (season !== "printemps" && season !== "ete") return [];

  const rng = mulberry32(hashStr(road.id + "_pothole"));
  const count = Math.floor(road.totalLength / 500 * HAZARDS.potholeDensity * 100);
  const out: Pothole[] = [];

  for (let i = 0; i < count; i++) {
    if (rng() > 0.4) continue;
    out.push({
      t: rng(),
      offset: (rng() - 0.5) * 6.5 * 0.7,
      radius: HAZARDS.potholeRadiusRange[0] + rng() * (HAZARDS.potholeRadiusRange[1] - HAZARDS.potholeRadiusRange[0]),
      depth: HAZARDS.potholeDepthRange[0] + rng() * (HAZARDS.potholeDepthRange[1] - HAZARDS.potholeDepthRange[0]),
    });
  }
  return out;
}

export function generateIcePatches(road: RoadCurve, season: Season): IcePatch[] {
  if (season !== "hiver" && season !== "automne") return [];

  const rng = mulberry32(hashStr(road.id + "_ice"));
  const count = Math.floor(road.totalLength / 1000 * 5);
  const out: IcePatch[] = [];

  for (let i = 0; i < count; i++) {
    if (rng() > HAZARDS.iceDensity) continue;
    out.push({
      t: rng(),
      offset: (rng() - 0.5) * 6.5 * 0.5,
      length: 5 + rng() * 20,
      width: 2 + rng() * 3,
      friction: HAZARDS.iceFrictionRange[0] + rng() * (HAZARDS.iceFrictionRange[1] - HAZARDS.iceFrictionRange[0]),
    });
  }
  return out;
}

export function generateConstructionZones(road: RoadCurve, season: Season): ConstructionZone[] {
  if (season === "hiver") return [];
  if (road.type === "gravel") return [];

  const rng = mulberry32(hashStr(road.id + "_construction"));
  if (rng() > HAZARDS.constructionChance) return [];

  const tStart = 0.2 + rng() * 0.5;
  return [{
    tStart,
    tEnd: Math.min(1, tStart + 0.05 + rng() * 0.1),
    laneBlocked: rng() > 0.5 ? "right" : "left",
    coneSpacing: HAZARDS.coneSpacing + rng() * 4,
  }];
}

// ═══════════════════════════════════════════════════════════
// FRICTION (gameplay)
// ═══════════════════════════════════════════════════════════

export function getRoadFrictionAt(
  road: RoadCurve,
  season: Season,
  t: number,
  lateralOffset: number,
): number {
  let base = 1.0;
  if (season === "hiver") base = 0.4;
  else if (season === "printemps") base = 0.75;

  if (road.type === "gravel") base *= 0.6;

  const icePatches = generateIcePatches(road, season);
  for (const patch of icePatches) {
    if (Math.abs(t - patch.t) < 0.01 && Math.abs(lateralOffset - patch.offset) < patch.width / 2) {
      return patch.friction;
    }
  }

  const potholes = generatePotholes(road, season);
  for (const ph of potholes) {
    if (Math.abs(t - ph.t) < 0.005 && Math.abs(lateralOffset - ph.offset) < ph.radius) {
      return base * 0.5;
    }
  }

  return base;
}