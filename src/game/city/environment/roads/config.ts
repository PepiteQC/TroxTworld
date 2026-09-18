/**
 * 🛣️ CONFIG — Routes du comté de Portneuf
 */
import type { RoadType } from "./types";

// ═══════════════════════════════════════════════════════════
// PROFILS DE CHAUSSÉE (normes MTQ)
// ═══════════════════════════════════════════════════════════

export const ROAD_PROFILES: Record<RoadType, {
  laneWidth: number;
  lanes: number;
  shoulderWidth: number;
  medianWidth: number;
  totalWidth: number;
}> = {
  highway:  { laneWidth: 3.65, lanes: 4, shoulderWidth: 3.0, medianWidth: 4.0, totalWidth: 14.6 },
  regional: { laneWidth: 3.35, lanes: 2, shoulderWidth: 1.5, medianWidth: 0,   totalWidth: 7.4 },
  village:  { laneWidth: 3.0,  lanes: 2, shoulderWidth: 0.8, medianWidth: 0,   totalWidth: 6.5 },
  rural:    { laneWidth: 3.2,  lanes: 2, shoulderWidth: 1.0, medianWidth: 0,   totalWidth: 6.8 },
  gravel:   { laneWidth: 3.0,  lanes: 2, shoulderWidth: 0.5, medianWidth: 0,   totalWidth: 6.5 },
};

export function getRoadWidth(type: RoadType): number {
  return ROAD_PROFILES[type]?.totalWidth ?? 6.5;
}

// ═══════════════════════════════════════════════════════════
// BARÈME QUÉBÉCOIS DE VITESSE
// ═══════════════════════════════════════════════════════════

export const SPEED_FINES_QC = [
  { min: 1,  max: 20, fine: 105,  points: 1 },
  { min: 21, max: 30, fine: 165,  points: 2 },
  { min: 31, max: 45, fine: 285,  points: 3 },
  { min: 46, max: 60, fine: 495,  points: 5 },
  { min: 61, max: 999, fine: 1050, points: 10 },
] as const;

export function computeSpeedingFine(excessKmh: number): { fine: number; points: number } {
  if (excessKmh <= 5) return { fine: 0, points: 0 };
  for (const tier of SPEED_FINES_QC) {
    if (excessKmh >= tier.min && excessKmh <= tier.max) {
      return { fine: tier.fine, points: tier.points };
    }
  }
  return { fine: 1050, points: 10 };
}

// ═══════════════════════════════════════════════════════════
// MARQUAGE ROUTIER (normes QC)
// ═══════════════════════════════════════════════════════════

export const MARKINGS = {
  /** Largeur des lignes (m) */
  yellowLineWidth: 0.15,
  whiteLineWidth: 0.20,
  /** Espacement dash (m) */
  dashOn: 3.0,
  dashOff: 6.0,
  /** Hauteur au-dessus de la chaussée */
  yOffset: 0.07,
} as const;

// ═══════════════════════════════════════════════════════════
// HAZARDS
// ═══════════════════════════════════════════════════════════

export const HAZARDS = {
  potholeDensity: 0.02,
  potholeRadiusRange: [0.3, 1.2],
  potholeDepthRange: [0.05, 0.25],

  iceDensity: 0.15,
  iceFrictionRange: [0.05, 0.3],

  constructionChance: 0.30,
  coneSpacing: 3,
} as const;