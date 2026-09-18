/**
 * 🛣️ TYPES — Routes du comté
 */
import * as THREE from "three";

export type RoadType = "highway" | "regional" | "village" | "rural" | "gravel";

export type RoadSurfaceState =
  | "clean" | "wet" | "icy" | "snowy" | "slush" | "salty" | "potholed" | "construction";

export interface RoadCurve {
  id: string;
  name: string;
  points: THREE.Vector3[];
  type: RoadType;
  speedLimit: number;
  totalLength: number;

  lanes: number;
  hasShoulder: boolean;
  hasDitch: boolean;
  hasGuardrail: boolean;
  hasStreetlights: boolean;
  hasHydroPoles: boolean;
  hasMedian: boolean;
  markings: "double_yellow" | "dashed_white" | "highway" | "none";

  village?: string;
  connectsTo?: string[];
}

export interface Lane {
  id: string;
  curveId: string;
  direction: 1 | -1;
  offset: number;
  speedLimit: number;
  isPassingLane: boolean;
}

export interface Pothole {
  t: number;
  offset: number;
  radius: number;
  depth: number;
}

export interface IcePatch {
  t: number;
  offset: number;
  length: number;
  width: number;
  friction: number;
}

export interface ConstructionZone {
  tStart: number;
  tEnd: number;
  laneBlocked: "left" | "right" | "both";
  coneSpacing: number;
}

export type SignType =
  | "stop" | "yield" | "speed_limit" | "school_zone"
  | "deer_crossing" | "moose_crossing" | "ice_warning"
  | "construction" | "dead_end" | "route_number";

export interface RoadSign {
  t: number;
  side: "left" | "right";
  type: SignType;
  speedLimit?: number;
  routeNum?: string;
}

// Saisons
export type Season = "printemps" | "ete" | "automne" | "hiver";