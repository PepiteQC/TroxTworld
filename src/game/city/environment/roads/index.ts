/**
 * 🛣️ INDEX — Barrel export roads
 */
export * from "./config";
export * from "./types";
export * from "./spatial";
export * from "./hazards";
export * from "./route138";
export * from "./ribbon";
export * from "./furniture";

// Helper : initialisation spatiale automatique
import { initRoute138Spatial } from "./route138";
initRoute138Spatial();