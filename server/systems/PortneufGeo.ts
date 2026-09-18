/**
 * ═══════════════════════════════════════════════════════════════════
 * 🗺️ PORTNEUF GEO — GÉOGRAPHIE SERVEUR MRC DE PORTNEUF (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * Autorité serveur des zones RP — calé sur src/game/zones.ts (ZoneSystem)
 * et sur les constantes réelles de src/game/worlddata.ts.
 * Hooks Colyseus : tracking joueur, violations, périmètre carcéral.
 */

import {
  ZoneSystem,
  buildPortneufZones,
  RPZone,
  ZoneRules,
  ZoneViolation,
  getZoneRules,
  ZoneType,
} from "../../src/game/zones";

import {
  WORLD,
  RIVER_Z,
  A40_Z,
  PRISON,
  SQ_JAIL,
  VILLAGES,
  POIS,
  A40_EXITS,
} from "../../src/game/worlddata";

export interface PortneufGeoState {
  zoneSystem: ZoneSystem;
  worldBounds: typeof WORLD;
  prisonPerimeter: typeof PRISON;
  a40Z: number;
  riverZ: number;
}

export class PortneufGeoServer {
  public zoneSystem: ZoneSystem;
  private core: any;

  constructor(core?: any) {
    this.core = core;
    // Source d'autorité unique : le même constructeur de zones que le client
    this.zoneSystem = new ZoneSystem(buildPortneufZones());
  }

  // ═══════════════════════════════════════════════════════════
  // HOOKS SERVEUR (Colyseus core)
  // ═══════════════════════════════════════════════════════════

  registerHooks(): void {
    if (!this.core || !this.core.on) return;

    // Détection de changement de zone par position
    this.core.on("player:position", (playerId: string, pos: [number, number, number]) => {
      // pos = [x, y, z] selon convention du projet
      this.zoneSystem.updatePlayerPosition(playerId, pos[0], pos[2], pos[1]);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // AUTORITÉ GÉOGRAPHIQUE (anti-triche, validation RP)
  // ═══════════════════════════════════════════════════════════

  getZoneAt(x: number, z: number, y?: number): RPZone {
    return this.zoneSystem.getAt(x, z, y);
  }

  getCircleAt(x: number, z: number): RPZone {
    return this.zoneSystem.getCircleAt(x, z);
  }

  isSafeZone(x: number, z: number): boolean {
    return this.getZoneAt(x, z).rules.isSafeZone;
  }

  getSpeedLimit(x: number, z: number): number {
    return this.getZoneAt(x, z).rules.speedLimit;
  }

  isWeaponAllowed(x: number, z: number, permits: any[] = []): boolean {
    return this.zoneSystem.isWeaponAllowed(x, z, permits);
  }

  isHarvestAllowed(x: number, z: number, permits: any[] = []): boolean {
    return this.zoneSystem.isHarvestAllowed(x, z, permits);
  }

  isFishingAllowed(x: number, z: number, permits: any[] = []): boolean {
    return this.zoneSystem.isFishingAllowed(x, z, permits);
  }

  isCurfewRespected(x: number, z: number, hour: number): boolean {
    return this.zoneSystem.isCurfewRespected(x, z, hour);
  }

  isInsidePrisonPerimeter(x: number, z: number): boolean {
    const d = Math.hypot(x - PRISON.x, z - PRISON.z);
    return d <= 65; // rayon du périmètre carcéral (zones.ts)
  }

  getPlayerZone(playerId: string): RPZone | undefined {
    return this.zoneSystem.getPlayerZone(playerId);
  }

  recordZoneViolation(
    playerId: string,
    x: number,
    z: number,
    type: ZoneViolation["type"],
    severity: ZoneViolation["severity"],
    fine?: number
  ): ZoneViolation {
    return this.zoneSystem.recordViolation(playerId, x, z, type, severity, fine);
  }

  getPlayerViolations(playerId: string): ZoneViolation[] {
    return this.zoneSystem.getPlayerViolations(playerId);
  }

  // ═══════════════════════════════════════════════════════════
  // DONNÉES DU MONDE (constantes réelles de worlddata.ts)
  // ═══════════════════════════════════════════════════════════

  getWorldBounds() {
    return WORLD;
  }

  getA40Zone() {
    return { z: A40_Z, exits: A40_EXITS };
  }

  getRiverLevel() {
    return RIVER_Z;
  }

  getPrisonLocation() {
    return { ...PRISON, sqJail: SQ_JAIL };
  }

  getZoneStats() {
    return this.zoneSystem.getStats();
  }

  dispose(): void {
    console.log("[PortneufGeo] Serveur géographique libéré.");
  }
}

export function registerPortneufGeo(core: any): PortneufGeoServer {
  const geo = new PortneufGeoServer(core);
  geo.registerHooks();

  const stats = geo.getZoneStats();

  console.log("🗺️ [PortneufGeo] MRC Portneuf enregistrée (serveur autoritaire)", {
    zones: stats.total,
    staticZones: stats.static,
    dynamicZones: stats.dynamic,
    worldBounds: WORLD,
    a40Z: A40_Z,
    riverZ: RIVER_Z,
    prison: PRISON,
  });

  return geo;
}
