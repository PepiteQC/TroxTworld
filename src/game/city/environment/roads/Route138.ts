/**
 * 🛣️ ROUTE 138 — Source de vérité unifiée
 */
import * as THREE from "three";
import type { RoadCurve, Lane } from "./types";
import { ROAD_PROFILES } from "./config";
import { registerCurve } from "./spatial";

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const ROUTE_138_CURVES: RoadCurve[] = [
  {
    id: "r138_st_casimir",
    name: "Saint-Casimir (Village)",
    type: "village",
    speedLimit: 50,
    village: "Saint-Casimir",
    points: [
      v3(-500, 0, 0), v3(0, 0, 0), v3(500, 0, 15), v3(1000, 0, 8),
      v3(1500, 0, 0), v3(2000, 0, -10), v3(2500, 0, -5), v3(2800, 0, 0),
    ],
    totalLength: 3300,
    lanes: 2,
    hasShoulder: true, hasDitch: false, hasGuardrail: false,
    hasStreetlights: true, hasHydroPoles: true, hasMedian: false,
    markings: "double_yellow",
    connectsTo: ["r138_st_marc", "r363_st_alban"],
  },
  {
    id: "r138_st_marc",
    name: "Saint-Marc-des-Carrières",
    type: "regional",
    speedLimit: 70,
    village: "Saint-Marc-des-Carrières",
    points: [
      v3(2800, 0, 0), v3(3400, 0, 20), v3(4000, 0, 35), v3(4600, 0, 20),
      v3(5200, 0, -15), v3(5800, 0, -30), v3(6200, 0, -10), v3(6500, 0, 0),
    ],
    totalLength: 3700,
    lanes: 2,
    hasShoulder: true, hasDitch: true, hasGuardrail: false,
    hasStreetlights: true, hasHydroPoles: true, hasMedian: false,
    markings: "double_yellow",
    connectsTo: ["r138_st_casimir", "r138_deschambault"],
  },
  {
    id: "r138_deschambault",
    name: "Deschambault — Grondines — Cap-Santé",
    type: "rural",
    speedLimit: 90,
    village: "Deschambault",
    points: [
      v3(6500, 0, 0), v3(7000, 0, 25), v3(7600, 0, 40), v3(8200, 0, 30),
      v3(8600, 0, 10), v3(9200, 0, -20), v3(9800, 0, -40), v3(10200, 0, -20),
    ],
    totalLength: 3700,
    lanes: 2,
    hasShoulder: true, hasDitch: true, hasGuardrail: false,
    hasStreetlights: false, hasHydroPoles: true, hasMedian: false,
    markings: "double_yellow",
    connectsTo: ["r138_st_marc", "r138_portneuf"],
  },
  {
    id: "r138_portneuf",
    name: "Portneuf — Pont-Rouge",
    type: "regional",
    speedLimit: 90,
    village: "Portneuf",
    points: [
      v3(10200, 0, -20), v3(10800, 0, 0), v3(11400, 0, 30), v3(12100, 0, 45),
      v3(12800, 0, 20), v3(13500, 0, -10), v3(14100, 0, -30), v3(14800, 0, -20),
    ],
    totalLength: 4600,
    lanes: 2,
    hasShoulder: true, hasDitch: true, hasGuardrail: false,
    hasStreetlights: true, hasHydroPoles: true, hasMedian: false,
    markings: "double_yellow",
    connectsTo: ["r138_deschambault", "r138_pont_rouge_a40"],
  },
  {
    id: "r138_pont_rouge_a40",
    name: "Pont-Rouge — Autoroute 40",
    type: "regional",
    speedLimit: 90,
    village: "Pont-Rouge",
    points: [
      v3(14800, 0, -20), v3(15400, 0, 0), v3(16000, 0, 15),
      v3(16500, 0, 5), v3(17000, 0, 0),
    ],
    totalLength: 2200,
    lanes: 2,
    hasShoulder: true, hasDitch: true, hasGuardrail: true,
    hasStreetlights: false, hasHydroPoles: true, hasMedian: false,
    markings: "double_yellow",
    connectsTo: ["r138_portneuf", "a40_ouest"],
  },
  {
    id: "a40_ouest",
    name: "Autoroute 40 — vers Trois-Rivières",
    type: "highway",
    speedLimit: 100,
    points: [
      v3(17000, 0, 0), v3(17500, 0, 0), v3(18000, 0, 0), v3(18600, 0, 0),
      v3(19200, 0, 0), v3(19800, 0, 0), v3(20400, 0, 0),
    ],
    totalLength: 3400,
    lanes: 4,
    hasShoulder: true, hasDitch: true, hasGuardrail: true,
    hasStreetlights: true, hasHydroPoles: false, hasMedian: true,
    markings: "highway",
    connectsTo: ["r138_pont_rouge_a40"],
  },
  {
    id: "r363_st_alban",
    name: "Route 363 Nord — Saint-Alban",
    type: "rural",
    speedLimit: 80,
    village: "Saint-Alban",
    points: [
      v3(0, 0, 0), v3(-500, 0.5, -200), v3(-1000, 1.5, -500),
      v3(-1600, 2.5, -900), v3(-2200, 3.0, -1400), v3(-2800, 2.5, -1900),
      v3(-3200, 2.0, -2400),
    ],
    totalLength: 2400,
    lanes: 2,
    hasShoulder: false, hasDitch: true, hasGuardrail: false,
    hasStreetlights: false, hasHydroPoles: true, hasMedian: false,
    markings: "double_yellow",
    connectsTo: ["r138_st_casimir"],
  },
];

// Enregistre tous les curves dans l'index spatial
export function initRoute138Spatial(): void {
  for (const curve of ROUTE_138_CURVES) registerCurve(curve);
}

// ═══════════════════════════════════════════════════════════
// BUILD LANES (graphe de voies pour trafic IA)
// ═══════════════════════════════════════════════════════════

export function buildLanesForCurve(curve: RoadCurve): Lane[] {
  const profile = ROAD_PROFILES[curve.type];
  const lanes: Lane[] = [];

  if (curve.type === "highway") {
    const medianHalf = profile.medianWidth / 2;
    for (const dir of [1, -1] as const) {
      for (let i = 0; i < 2; i++) {
        const base = medianHalf + profile.laneWidth * (i + 0.5);
        lanes.push({
          id: `${curve.id}_lane_${dir > 0 ? "e" : "w"}${i}`,
          curveId: curve.id,
          direction: dir,
          offset: dir > 0 ? base : -base,
          speedLimit: curve.speedLimit,
          isPassingLane: i === 1,
        });
      }
    }
  } else {
    const offset = profile.laneWidth / 2;
    for (const dir of [1, -1] as const) {
      lanes.push({
        id: `${curve.id}_lane_${dir > 0 ? "e" : "w"}`,
        curveId: curve.id,
        direction: dir,
        offset: dir > 0 ? offset : -offset,
        speedLimit: curve.speedLimit,
        isPassingLane: false,
      });
    }
  }

  return lanes;
}

export const ALL_LANES: Lane[] = ROUTE_138_CURVES.flatMap(buildLanesForCurve);

export const route138 = {
  buildVisualMesh(): THREE.Group {
    const group = new THREE.Group();
    for (const curve of ROUTE_138_CURVES) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.points),
        new THREE.LineBasicMaterial({ color: 0x4b5563 }),
      );
      group.add(line);
    }
    return group;
  },
};

export function getCurveDef(id: string): RoadCurve | undefined {
  return ROUTE_138_CURVES.find((c) => c.id === id);
}

export function getNetworkStats() {
  const totalLength = ROUTE_138_CURVES.reduce((s, c) => s + c.totalLength, 0);
  const byType: Record<string, number> = {};
  for (const c of ROUTE_138_CURVES) {
    byType[c.type] = (byType[c.type] ?? 0) + c.totalLength;
  }
  return {
    curves: ROUTE_138_CURVES.length,
    lanes: ALL_LANES.length,
    totalLengthM: totalLength,
    totalLengthKm: (totalLength / 1000).toFixed(1),
    byType,
    villages: [...new Set(ROUTE_138_CURVES.map((c) => c.village).filter(Boolean))],
  };
}