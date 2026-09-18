/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈME DE ZONAGE RP & RÈGLEMENTATIONS MUNICIPALES — MRC DE PORTNEUF (v2.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - Cache spatial grid-based O(1) pour lookups ultra-rapides
 *  - Zones dynamiques/temporaires (chantiers, événements, barricades)
 *  - Système de permis requis par zone
 *  - Events hooks (onEnterZone, onExitZone, onViolation)
 *  - Zonage horaire (règles selon l'heure du jeu)
 *  - Zones privées avec contrôle d'accès
 *  - Système de violations et historique par joueur
 *  - Support 3D (altitude pour fleuve, bâtiments)
 *  - Priorités de zones sophistiquées
 *  - API enrichie pour queries complexes
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { A40_Z, getPoiAt, getVillageAt, POIS, PRISON, RIVER_Z, VILLAGES } from "./worlddata";
import { worldConfig, type RpZoneKind } from "./worldconfig";

// ═══════════════════════════════════════════════════════════
// TYPES — ZONES & RÈGLES
// ═══════════════════════════════════════════════════════════

export type ZoneType = RpZoneKind;

export type PermitType = 
  | "permis_chasse"
  | "permis_peche"
  | "permis_port_arme"
  | "permis_conduire"
  | "permis_batiment"
  | "permis_exploitation";

export interface ZoneRules {
  speedLimit: number;
  carryWeapons: boolean;
  harvest: boolean;
  huntingAllowed: boolean;
  wantedMul: number;
  isSafeZone: boolean;
  openAlcoholAllowed: boolean;
  
  // ── Nouvelles règles v2.0 ──
  noiseRestriction?: "none" | "low" | "medium" | "high"; // Restrictions sonores
  parkingAllowed?: boolean;
  campingAllowed?: boolean;
  fishingAllowed?: boolean;
  constructionAllowed?: boolean;
  commercialActivity?: boolean;
  curfewStart?: number; // Heure de début couvre-feu (0-24)
  curfewEnd?: number;   // Heure de fin couvre-feu (0-24)
  requiredPermits?: PermitType[];
  jurisdiction?: "municipal" | "provincial" | "federal" | "private";
}

export interface RPZone {
  id: string;
  name: string;
  type: ZoneType;
  x: number;
  z: number;
  y?: number; // Altitude pour zones 3D
  radius: number;
  height?: number; // Hauteur pour zones 3D
  rules: ZoneRules;
  priority: number; // Plus élevé = priorité plus forte
  isDynamic?: boolean;
  expiresAt?: number; // Timestamp d'expiration pour zones temporaires
  ownerId?: string; // Pour zones privées
  allowedPlayers?: string[]; // Liste blanche pour zones privées
}

// ═══════════════════════════════════════════════════════════
// TYPES — EVENTS & VIOLATIONS
// ═══════════════════════════════════════════════════════════

export interface ZoneEnterEvent {
  zone: RPZone;
  playerId: string;
  timestamp: number;
}

export interface ZoneExitEvent {
  zone: RPZone;
  playerId: string;
  timestamp: number;
}

export interface ZoneViolation {
  id: string;
  playerId: string;
  zoneId: string;
  zoneName: string;
  type: "speed" | "weapon" | "harvest" | "hunting" | "alcohol" | "trespass" | "noise" | "curfew";
  severity: "warning" | "fine" | "arrest";
  timestamp: number;
  fine?: number;
  description: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTES — CACHE SPATIAL
// ═══════════════════════════════════════════════════════════

const GRID_CELL_SIZE = 50; // mètres par cellule
const MAX_CACHE_SIZE = 10000;

// ═══════════════════════════════════════════════════════════
// RÈGLEMENTS TERRITORIAUX STANDARDS DU QUÉBEC (ENRICHI)
// ═══════════════════════════════════════════════════════════

const RULES: any = {
  village: {
    speedLimit: 50,
    carryWeapons: false,
    harvest: false,
    huntingAllowed: false,
    wantedMul: 1.2,
    isSafeZone: false,
    openAlcoholAllowed: false,
    noiseRestriction: "medium",
    parkingAllowed: true,
    campingAllowed: false,
    fishingAllowed: false,
    constructionAllowed: true,
    commercialActivity: true,
    requiredPermits: [],
    jurisdiction: "municipal",
  },
  ville: {
    speedLimit: 50,
    carryWeapons: false,
    harvest: false,
    huntingAllowed: false,
    wantedMul: 1.35,
    isSafeZone: false,
    openAlcoholAllowed: false,
    noiseRestriction: "high",
    parkingAllowed: true,
    campingAllowed: false,
    fishingAllowed: false,
    constructionAllowed: true,
    commercialActivity: true,
    curfewStart: 23,
    curfewEnd: 5,
    requiredPermits: [],
    jurisdiction: "municipal",
  },
  highway: {
    speedLimit: 100,
    carryWeapons: true,
    harvest: false,
    huntingAllowed: false,
    wantedMul: 1.45,
    isSafeZone: false,
    openAlcoholAllowed: false,
    noiseRestriction: "none",
    parkingAllowed: false,
    campingAllowed: false,
    fishingAllowed: false,
    constructionAllowed: false,
    commercialActivity: false,
    requiredPermits: ["permis_conduire"],
    jurisdiction: "provincial",
  },
  forest: {
    speedLimit: 70,
    carryWeapons: true,
    harvest: true,
    huntingAllowed: true,
    wantedMul: 0.65,
    isSafeZone: false,
    openAlcoholAllowed: true,
    noiseRestriction: "low",
    parkingAllowed: true,
    campingAllowed: true,
    fishingAllowed: true,
    constructionAllowed: false,
    commercialActivity: false,
    requiredPermits: ["permis_chasse"],
    jurisdiction: "provincial",
  },
  prison: {
    speedLimit: 30,
    carryWeapons: false,
    harvest: false,
    huntingAllowed: false,
    wantedMul: 2.0,
    isSafeZone: false,
    openAlcoholAllowed: false,
    noiseRestriction: "high",
    parkingAllowed: false,
    campingAllowed: false,
    fishingAllowed: false,
    constructionAllowed: false,
    commercialActivity: false,
    requiredPermits: [],
    jurisdiction: "federal",
  },
  industrie: {
    speedLimit: 40,
    carryWeapons: false,
    harvest: false,
    huntingAllowed: false,
    wantedMul: 1.1,
    isSafeZone: false,
    openAlcoholAllowed: false,
    noiseRestriction: "low",
    parkingAllowed: true,
    campingAllowed: false,
    fishingAllowed: false,
    constructionAllowed: true,
    commercialActivity: true,
    requiredPermits: [],
    jurisdiction: "private",
  },
  fleuve: {
    speedLimit: 30,
    carryWeapons: true,
    harvest: true,
    huntingAllowed: true,
    wantedMul: 0.8,
    isSafeZone: false,
    openAlcoholAllowed: true,
    noiseRestriction: "low",
    parkingAllowed: false,
    campingAllowed: true,
    fishingAllowed: true,
    constructionAllowed: false,
    commercialActivity: true,
    requiredPermits: ["permis_peche"],
    jurisdiction: "provincial",
  },
  institution: {
    speedLimit: 30,
    carryWeapons: false,
    harvest: false,
    huntingAllowed: false,
    wantedMul: 1.6,
    isSafeZone: true,
    openAlcoholAllowed: false,
    noiseRestriction: "high",
    parkingAllowed: true,
    campingAllowed: false,
    fishingAllowed: false,
    constructionAllowed: false,
    commercialActivity: false,
    requiredPermits: [],
    jurisdiction: "provincial",
  },
  campagne: {
    speedLimit: 70,
    carryWeapons: true,
    harvest: true,
    huntingAllowed: false,
    wantedMul: 0.85,
    isSafeZone: false,
    openAlcoholAllowed: true,
    noiseRestriction: "low",
    parkingAllowed: true,
    campingAllowed: true,
    fishingAllowed: true,
    constructionAllowed: true,
    commercialActivity: true,
    requiredPermits: [],
    jurisdiction: "municipal",
  },
};

// ═══════════════════════════════════════════════════════════
// CACHE SPATIAL (Grid-based O(1) lookups)
// ═══════════════════════════════════════════════════════════

class SpatialCache {
  private grid = new Map<string, RPZone[]>();
  private lookupCache = new Map<string, RPZone>();
  
  private getCellKey(x: number, z: number): string {
    const cellX = Math.floor(x / GRID_CELL_SIZE);
    const cellZ = Math.floor(z / GRID_CELL_SIZE);
    return `${cellX},${cellZ}`;
  }
  
  private getLookupKey(x: number, z: number): string {
    const precision = 2; // 2 décimales
    return `${x.toFixed(precision)},${z.toFixed(precision)}`;
  }
  
  addZone(zone: RPZone): void {
    // Ajouter la zone à toutes les cellules qu'elle touche
    const minX = zone.x - zone.radius;
    const maxX = zone.x + zone.radius;
    const minZ = zone.z - zone.radius;
    const maxZ = zone.z + zone.radius;
    
    const minCellX = Math.floor(minX / GRID_CELL_SIZE);
    const maxCellX = Math.floor(maxX / GRID_CELL_SIZE);
    const minCellZ = Math.floor(minZ / GRID_CELL_SIZE);
    const maxCellZ = Math.floor(maxZ / GRID_CELL_SIZE);
    
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = `${cx},${cz}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(zone);
      }
    }
  }
  
  getCandidates(x: number, z: number): RPZone[] {
    const key = this.getCellKey(x, z);
    return this.grid.get(key) ?? [];
  }
  
  getCachedResult(x: number, z: number): RPZone | undefined {
    const key = this.getLookupKey(x, z);
    return this.lookupCache.get(key);
  }
  
  cacheResult(x: number, z: number, zone: RPZone): void {
    const key = this.getLookupKey(x, z);
    this.lookupCache.set(key, zone);
    
    // Limiter la taille du cache
    if (this.lookupCache.size > MAX_CACHE_SIZE) {
      const firstKey = this.lookupCache.keys().next().value;
      if (firstKey !== undefined) {
        this.lookupCache.delete(firstKey);
      }
    }
  }
  
  clear(): void {
    this.grid.clear();
    this.lookupCache.clear();
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function poiType(type: string): ZoneType {
  if (type === "institution") return "institution";
  if (type === "usine" || type === "industrie") return "industrie";
  if (type === "echangeur") return "highway";
  if (type === "faune") return "forest";
  if (type === "village") return "village";
  return "campagne";
}

// ═══════════════════════════════════════════════════════════
// CONSTRUCTION DES ZONES
// ═══════════════════════════════════════════════════════════

export function buildPortneufZones(): RPZone[] {
  const zones: RPZone[] = [];
  let priority = 100;

  // 1. Municipalités et villages (priorité moyenne)
  for (const v of VILLAGES) {
    const type: ZoneType = v.type === "ville" ? "ville" : "village";
    zones.push({
      id: `v_${v.id}`,
      name: `${v.name} (${v.type === "ville" ? "Centre urbain" : "Village"})`,
      type,
      x: v.center[0],
      z: v.center[1],
      radius: v.coreRadius * 1.6,
      rules: RULES[type],
      priority: priority--,
    });
  }

  // 2. Points d'intérêt majeurs (priorité haute)
  for (const p of POIS) {
    const type = poiType(p.type);
    zones.push({
      id: p.id,
      name: p.name,
      type,
      x: p.x,
      z: p.z,
      radius: p.radius,
      rules: RULES[type],
      priority: priority--,
    });
  }

  // 3. Tronçon Autoroutier (priorité très haute)
  zones.push({
    id: "a40_corridor",
    name: "Autoroute 40 (Félix-Leclerc)",
    type: "highway",
    x: 0,
    z: A40_Z,
    radius: 32,
    rules: RULES.highway,
    priority: 200,
  });

  // 4. Périmètre carcéral (priorité maximale)
  zones.push({
    id: "prison_zone",
    name: "Établissement de Donnacona (Périmètre carcéral)",
    type: "prison",
    x: PRISON.x,
    z: PRISON.z,
    radius: 65,
    rules: RULES.prison,
    priority: 300,
  });

  return zones;
}

// ═══════════════════════════════════════════════════════════
// ZONE SYSTEM (Gestionnaire principal)
// ═══════════════════════════════════════════════════════════

export class ZoneSystem {
  zones: RPZone[];
  private dynamicZones: RPZone[] = [];
  private spatialCache = new SpatialCache();
  private playerZones = new Map<string, RPZone>(); // Zone actuelle par joueur
  private violations: ZoneViolation[] = [];
  
  // Event callbacks
  private onEnterCallbacks: Array<(event: ZoneEnterEvent) => void> = [];
  private onExitCallbacks: Array<(event: ZoneExitEvent) => void> = [];
  private onViolationCallbacks: Array<(violation: ZoneViolation) => void> = [];
  
  constructor(zones = buildPortneufZones()) {
    this.zones = zones;
    this.rebuildSpatialCache();
  }
  
  private rebuildSpatialCache(): void {
    this.spatialCache.clear();
    for (const zone of this.zones) {
      this.spatialCache.addZone(zone);
    }
    for (const zone of this.dynamicZones) {
      this.spatialCache.addZone(zone);
    }
  }
  
  /**
   * Résout la zone active à une position avec cache O(1).
   */
  getAt(x: number, z: number, y?: number): RPZone {
    // 1. Vérifier le cache
    const cached = this.spatialCache.getCachedResult(x, z);
    if (cached) return cached;
    
    // 2. Utiliser worldConfig comme base
    const cfg = worldConfig.at(x, z);
    const baseRules = RULES[cfg.rpType];
    
    const rules: ZoneRules = {
      ...baseRules,
      speedLimit: cfg.speedLimit,
      isSafeZone: cfg.isSafeZone,
      carryWeapons: cfg.isSafeZone ? false : baseRules.carryWeapons,
    };

    const zone: RPZone = {
      id: cfg.zoneName,
      name: cfg.displayName,
      type: cfg.rpType,
      x,
      z,
      y,
      radius: 40,
      rules,
      priority: 50,
    };
    
    // 3. Vérifier les zones candidates (cache spatial)
    const candidates = this.spatialCache.getCandidates(x, z);
    let best: RPZone | null = null;
    let bestPriority = -1;
    
    for (const candidate of candidates) {
      // Vérifier expiration
      if (candidate.expiresAt && Date.now() > candidate.expiresAt) {
        continue;
      }
      
      // Vérifier distance
      const dx = x - candidate.x;
      const dz = z - candidate.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist <= candidate.radius) {
        // Vérifier altitude si zone 3D
        if (candidate.y !== undefined && candidate.height !== undefined && y !== undefined) {
          if (y < candidate.y || y > candidate.y + candidate.height) {
            continue;
          }
        }
        
        // Priorité la plus haute gagne
        if (candidate.priority > bestPriority) {
          best = candidate;
          bestPriority = candidate.priority;
        }
      }
    }
    
    const result = best ?? zone;
    
    // 4. Cacher le résultat
    this.spatialCache.cacheResult(x, z, result);
    
    return result;
  }
  
  /**
   * Résolution géométrique circulaire directe (pour UI cartographique).
   */
  getCircleAt(x: number, z: number): RPZone {
    // 1. Détection prioritaire du chenal fluvial
    if (z > RIVER_Z - 8) {
      return {
        id: "fleuve",
        name: "Fleuve Saint-Laurent",
        type: "fleuve",
        x,
        z,
        radius: 40,
        rules: RULES.fleuve,
        priority: 150,
      };
    }

    // 2. Recherche par chevauchement de rayon de zone
    let best: RPZone | null = null;
    let bestDist = Infinity;
    for (const zone of this.zones) {
      const d = Math.hypot(x - zone.x, z - zone.z);
      if (d <= zone.radius && d < bestDist) {
        best = zone;
        bestDist = d;
      }
    }
    if (best) return best;

    // 3. Repli vers le village le plus proche
    const v = getVillageAt(x, z);
    if (v) {
      const type: ZoneType = v.type === "ville" ? "ville" : "village";
      return {
        id: `v_${v.id}`,
        name: v.name,
        type,
        x: v.center[0],
        z: v.center[1],
        radius: v.coreRadius,
        rules: RULES[type],
        priority: 100,
      };
    }

    // 4. Repli vers un point d'intérêt
    const poi = getPoiAt(x, z);
    if (poi) {
      const type = poiType(poi.type);
      return {
        id: poi.id,
        name: poi.name,
        type,
        x: poi.x,
        z: poi.z,
        radius: poi.radius,
        rules: RULES[type],
        priority: 80,
      };
    }

    // 5. Grand biome boréal (Nord) vs Campagne agricole (Sud)
    if (z < -380) {
      return {
        id: "laurentides",
        name: "Contreforts du Bouclier canadien",
        type: "forest",
        x,
        z,
        radius: 200,
        rules: RULES.forest,
        priority: 60,
      };
    }

    return {
      id: "campagne",
      name: "Grands rangs et terres de Portneuf",
      type: "campagne",
      x,
      z,
      radius: 80,
      rules: RULES.campagne,
      priority: 40,
    };
  }
  
  // ═══════════════════════════════════════════════════════════
  // ZONES DYNAMIQUES
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Ajoute une zone temporaire (chantier, événement, barricade).
   */
  addDynamicZone(zone: RPZone): void {
    zone.isDynamic = true;
    this.dynamicZones.push(zone);
    this.spatialCache.addZone(zone);
  }
  
  /**
   * Supprime une zone dynamique.
   */
  removeDynamicZone(zoneId: string): boolean {
    const idx = this.dynamicZones.findIndex(z => z.id === zoneId);
    if (idx === -1) return false;
    
    this.dynamicZones.splice(idx, 1);
    this.rebuildSpatialCache();
    return true;
  }
  
  /**
   * Nettoie les zones dynamiques expirées.
   */
  cleanupExpiredZones(): void {
    const now = Date.now();
    const before = this.dynamicZones.length;
    
    this.dynamicZones = this.dynamicZones.filter(z => 
      !z.expiresAt || z.expiresAt > now
    );
    
    if (this.dynamicZones.length !== before) {
      this.rebuildSpatialCache();
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // TRACKING DE JOUEURS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Met à jour la position d'un joueur et détecte les transitions de zone.
   */
  updatePlayerPosition(playerId: string, x: number, z: number, y?: number): void {
    const currentZone = this.getAt(x, z, y);
    const previousZone = this.playerZones.get(playerId);
    
    // Détecter changement de zone
    if (previousZone && previousZone.id !== currentZone.id) {
      // Exit event
      const exitEvent: ZoneExitEvent = {
        zone: previousZone,
        playerId,
        timestamp: Date.now(),
      };
      this.onExitCallbacks.forEach(cb => cb(exitEvent));
      
      // Enter event
      const enterEvent: ZoneEnterEvent = {
        zone: currentZone,
        playerId,
        timestamp: Date.now(),
      };
      this.onEnterCallbacks.forEach(cb => cb(enterEvent));
    } else if (!previousZone) {
      // Première entrée
      const enterEvent: ZoneEnterEvent = {
        zone: currentZone,
        playerId,
        timestamp: Date.now(),
      };
      this.onEnterCallbacks.forEach(cb => cb(enterEvent));
    }
    
    this.playerZones.set(playerId, currentZone);
  }
  
  /**
   * Retourne la zone actuelle d'un joueur.
   */
  getPlayerZone(playerId: string): RPZone | undefined {
    return this.playerZones.get(playerId);
  }
  
  // ═══════════════════════════════════════════════════════════
  // VALIDATIONS & VIOLATIONS
  // ═══════════════════════════════════════════════════════════
  
  isWeaponAllowed(x: number, z: number, playerPermits: PermitType[] = []): boolean {
    const zone = this.getAt(x, z);
    if (!zone.rules.carryWeapons) return false;
    
    // Vérifier permis requis
    if (zone.rules.requiredPermits?.includes("permis_port_arme")) {
      return playerPermits.includes("permis_port_arme");
    }
    
    return true;
  }
  
  isHarvestAllowed(x: number, z: number, playerPermits: PermitType[] = []): boolean {
    const zone = this.getAt(x, z);
    if (!zone.rules.harvest) return false;
    
    // Vérifier permis de chasse si requis
    if (zone.rules.huntingAllowed && zone.rules.requiredPermits?.includes("permis_chasse")) {
      return playerPermits.includes("permis_chasse");
    }
    
    return true;
  }
  
  isFishingAllowed(x: number, z: number, playerPermits: PermitType[] = []): boolean {
    const zone = this.getAt(x, z);
    if (!zone.rules.fishingAllowed) return false;
    
    if (zone.rules.requiredPermits?.includes("permis_peche")) {
      return playerPermits.includes("permis_peche");
    }
    
    return true;
  }
  
  getSpeedLimit(x: number, z: number): number {
    return this.getAt(x, z).rules.speedLimit;
  }
  
  isParkingAllowed(x: number, z: number): boolean {
    return this.getAt(x, z).rules.parkingAllowed ?? true;
  }
  
  isCampingAllowed(x: number, z: number): boolean {
    return this.getAt(x, z).rules.campingAllowed ?? false;
  }
  
  isConstructionAllowed(x: number, z: number): boolean {
    return this.getAt(x, z).rules.constructionAllowed ?? false;
  }
  
  isCommercialActivityAllowed(x: number, z: number): boolean {
    return this.getAt(x, z).rules.commercialActivity ?? false;
  }
  
  /**
   * Vérifie si l'heure actuelle respecte le couvre-feu de la zone.
   */
  isCurfewRespected(x: number, z: number, currentHour: number): boolean {
    const zone = this.getAt(x, z);
    const { curfewStart, curfewEnd } = zone.rules;
    
    if (curfewStart === undefined || curfewEnd === undefined) {
      return true; // Pas de couvre-feu
    }
    
    // Couvre-feu de nuit (ex: 23h à 5h)
    if (curfewStart > curfewEnd) {
      return currentHour < curfewStart && currentHour >= curfewEnd;
    }
    
    // Couvre-feu de jour (ex: 12h à 14h)
    return currentHour < curfewStart || currentHour >= curfewEnd;
  }
  
  /**
   * Vérifie l'accès à une zone privée.
   */
  hasAccess(x: number, z: number, playerId: string): boolean {
    const zone = this.getAt(x, z);
    
    // Zone publique
    if (zone.rules.jurisdiction !== "private") {
      return true;
    }
    
    // Propriétaire
    if (zone.ownerId === playerId) {
      return true;
    }
    
    // Liste blanche
    if (zone.allowedPlayers?.includes(playerId)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Enregistre une violation.
   */
  recordViolation(
    playerId: string,
    x: number,
    z: number,
    type: ZoneViolation["type"],
    severity: ZoneViolation["severity"],
    fine?: number
  ): ZoneViolation {
    const zone = this.getAt(x, z);
    
    const violation: ZoneViolation = {
      id: `viol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      zoneId: zone.id,
      zoneName: zone.name,
      type,
      severity,
      timestamp: Date.now(),
      fine,
      description: this.getViolationDescription(type, zone),
    };
    
    this.violations.push(violation);
    
    // Limiter l'historique
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-500);
    }
    
    // Trigger callbacks
    this.onViolationCallbacks.forEach(cb => cb(violation));
    
    return violation;
  }
  
  private getViolationDescription(type: ZoneViolation["type"], zone: RPZone): string {
    switch (type) {
      case "speed":
        return `Excès de vitesse dans ${zone.name} (limite: ${zone.rules.speedLimit} km/h)`;
      case "weapon":
        return `Port d'arme illégal dans ${zone.name}`;
      case "harvest":
        return `Récolte non autorisée dans ${zone.name}`;
      case "hunting":
        return `Chasse illégale dans ${zone.name}`;
      case "alcohol":
        return `Consommation d'alcool publique dans ${zone.name}`;
      case "trespass":
        return `Intrusion dans ${zone.name}`;
      case "noise":
        return `Nuisance sonore dans ${zone.name}`;
      case "curfew":
        return `Violation du couvre-feu dans ${zone.name}`;
      default:
        return `Infraction dans ${zone.name}`;
    }
  }
  
  /**
   * Retourne l'historique des violations d'un joueur.
   */
  getPlayerViolations(playerId: string): ZoneViolation[] {
    return this.violations.filter(v => v.playerId === playerId);
  }
  
  // ═══════════════════════════════════════════════════════════
  // EVENT HOOKS
  // ═══════════════════════════════════════════════════════════
  
  onEnterZone(callback: (event: ZoneEnterEvent) => void): () => void {
    this.onEnterCallbacks.push(callback);
    return () => {
      const idx = this.onEnterCallbacks.indexOf(callback);
      if (idx >= 0) this.onEnterCallbacks.splice(idx, 1);
    };
  }
  
  onExitZone(callback: (event: ZoneExitEvent) => void): () => void {
    this.onExitCallbacks.push(callback);
    return () => {
      const idx = this.onExitCallbacks.indexOf(callback);
      if (idx >= 0) this.onExitCallbacks.splice(idx, 1);
    };
  }
  
  onViolation(callback: (violation: ZoneViolation) => void): () => void {
    this.onViolationCallbacks.push(callback);
    return () => {
      const idx = this.onViolationCallbacks.indexOf(callback);
      if (idx >= 0) this.onViolationCallbacks.splice(idx, 1);
    };
  }
  
  // ═══════════════════════════════════════════════════════════
  // QUERIES AVANCÉES
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Retourne toutes les zones d'un type spécifique.
   */
  getZonesByType(type: ZoneType): RPZone[] {
    return [...this.zones, ...this.dynamicZones].filter(z => z.type === type);
  }
  
  /**
   * Retourne toutes les zones dans un rayon donné.
   */
  getZonesInRadius(x: number, z: number, radius: number): RPZone[] {
    const candidates = this.spatialCache.getCandidates(x, z);
    return candidates.filter(zone => {
      const dist = Math.hypot(x - zone.x, z - zone.z);
      return dist <= radius + zone.radius;
    });
  }
  
  /**
   * Retourne les statistiques des zones.
   */
  getStats() {
    const allZones = [...this.zones, ...this.dynamicZones];
    
    const byType: Record<string, number> = {};
    const byJurisdiction: Record<string, number> = {};
    
    for (const zone of allZones) {
      byType[zone.type] = (byType[zone.type] ?? 0) + 1;
      const jurisdiction = zone.rules.jurisdiction ?? "unknown";
      byJurisdiction[jurisdiction] = (byJurisdiction[jurisdiction] ?? 0) + 1;
    }
    
    return {
      total: allZones.length,
      static: this.zones.length,
      dynamic: this.dynamicZones.length,
      byType,
      byJurisdiction,
      violations: this.violations.length,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// INSTANCE GLOBALE
// ═══════════════════════════════════════════════════════════

export const zoneSystem = new ZoneSystem();

// ═══════════════════════════════════════════════════════════
// HELPERS EXPORTÉS
// ═══════════════════════════════════════════════════════════

export function getZoneRules(type: ZoneType): ZoneRules {
  return RULES[type];
}

export function getAllZoneTypes(): ZoneType[] {
  return Object.keys(RULES) as ZoneType[];
}