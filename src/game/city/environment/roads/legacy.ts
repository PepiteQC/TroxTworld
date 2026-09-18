/**
 * 🛣️ LEGACY — Compat 100% avec l'API v1
 */
import { ROUTE_138_CURVES, ALL_LANES, buildLanesForCurve, getNetworkStats } from "./route138";
import { buildRoadGeometry, sampleLane } from "./ribbon";
import { buildRoadSign, buildChevron, buildConstructionCone, placeConstructionCones } from "./furniture";
import { findNearestCurveFast } from "./spatial";
import { computeSpeedingFine } from "./config";

// Export direct de l'API v1
export const ROUTE_138 = ROUTE_138_CURVES;
export const ALL_LANES_V1 = ALL_LANES;

// Compat : getRoutePointAtX
export function getRoutePointAtX(x: number) {
  let closest = ROUTE_138_CURVES[0].points[0];
  let minDist = Infinity;
  for (const curve of ROUTE_138_CURVES) {
    for (const pt of curve.points) {
      const d = Math.abs(pt.x - x);
      if (d < minDist) { minDist = d; closest = pt; }
    }
  }
  return closest;
}

// Compat : findNearestCurve (avec la signature v1)
export function findNearestCurve(pos: { x: number; z: number }, samples = 40) {
  const v3 = { x: pos.x, y: 0, z: pos.z } as any;
  return findNearestCurveFast(v3);
}

// Compat : getSpeedLimitAt
export function getSpeedLimitAt(pos: { x: number; z: number }) {
  const v3 = { x: pos.x, y: 0, z: pos.z } as any;
  const nearest = findNearestCurveFast(v3);
  if (!nearest) return { limit: 50, roadName: "Hors route", onRoad: false };
  return {
    limit: nearest.curve.speedLimit,
    roadName: nearest.curve.name,
    village: nearest.curve.village,
    onRoad: true,
  };
}

// Compat : checkSpeeding
export function checkSpeeding(speedKmh: number, pos: { x: number; z: number }) {
  const { limit } = getSpeedLimitAt(pos);
  const excess = Math.max(0, speedKmh - limit);
  const { fine, points } = computeSpeedingFine(excess);
  return { speeding: excess > 5, limit, excess, fine, points };
}

// Réexport builders
export { buildRoadGeometry, sampleLane, buildRoadSign, buildChevron, buildConstructionCone, placeConstructionCones, buildLanesForCurve, getNetworkStats };