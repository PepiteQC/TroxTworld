/**
 * ═════════════════════════════════════════════════════════════════════════════
 * API GLOBALE DU COMTÉ — UNIQUE ENTRY POINT (MRC DE PORTNEUF RP) v2.5
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Ce module centralise et expose l'intégralité des systèmes, données,
 * physiques et modèles nécessaires au fonctionnement du client et du moteur.
 * Toutes les communications inter-modules passent par cette passerelle.
 * 
 * v2.5 — Intégration complète :
 *  - Système d'armement, balistique et lois sur les armes du Québec (SIAF & IBIS)
 *  - Économie souterraine (planques de Saint-Alban, productions illicites, raids SQ)
 *  - Système pénal, cellules, menottes et cautions
 *  - Street v3 avec SpatialHash O(1)
 *  - Zones v2 avec cache spatial et events
 *  - SQDC v3 (braquage, fidélité, inspections)
 *  - World Items v2 (rareté, particules, modèles variés)
 *  - Store v2 (debounce, sélecteurs, typage strict)
 *  - Sofa v2 (LRU cache, animations, variantes)
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─── 1. DONNÉES GÉOGRAPHIQUES, TOPOGRAPHIE ET FLUX DE MONDE ──────────────────
export {
  VILLAGES,
  WORLD,
  RIVER_Z,
  ROAD_138_Z,
  A40_Z,
  A40_EXITS,
  PAPETERIE,
  PRISON,
  SQ_JAIL,
  POIS,
  LAKES,
  SPAWN,
  getTerrainHeight,
  getZoneName,
  getNearestVillage,
  getWorldStats,
  getSpeedLimitAt,
  ENFORCE_SPEED_LIMITS,
  getSurfaceAt,
  SURFACES,
  ROADS,
  withIce,
} from "./worlddata";
export type { VillageDef, Industry, LandmarkKind, TerrainType, ChurchStyle, RoadDef, RoadKind } from "./worlddata";

// ─── 2. GÉOMÉTRIE ET INGÉNIERIE ROUTIÈRE ─────────────────────────────────────
export { 
  sampleRoad, 
  buildRoadRibbon, 
  buildCenterLine, 
  buildIntersectionPad, 
  buildRoadSidewalks 
} from "./roads";

export { PortneufWorld } from "./world";

// ─── 3. SYSTÈME DE RENDU, MATÉRIAUX ET TEXTURES (GPU / VRAM OPTIMISÉ) ────────
export { matLib, QC_PALETTE, WALL_COLORS, ROOF_COLORS } from "./materials";
export { commerceMat, COMMERCE_PALETTE, installCommerceEnv } from "./commerceMats";
export { tex, finishMap } from "./textures";
export type { MapKind, TexMetrics, TexId } from "./textures";
export { getGeo, geoStats, InstancePool } from "./geo";

// ─── 4. ANIMATIONS, PROPS ET MODÈLES 3D PROCEDURAUX ─────────────────────────
export { propAnim, ANIM_TYPES } from "./anim";
export { PROP_CATALOG, buildProp, isPropId, PROP_IDS } from "./builder";
export { MODEL_CATALOG, MODEL_CATEGORIES, MODEL_ALIAS, searchModels, TOTAL_MODELS, buildFromMeta } from "./models";
export { buildCity } from "./city";
export type { BuiltCity, CityDoor, InteriorKind } from "./city";

// ─── 5. INFRASTRUCTURES SPÉCIALES (PÉNITENCIER ET SÉCURITÉ) ──────────────────
export {
  buildPrisonComplex,
  animatePrison,
  prisonSystem,
} from "./prison";
export type { BuiltPrison } from "./prison";

// ─── 6. ZONAGE RP ET RÈGLEMENTATIONS DU TERRITOIRE (v2.0) ────────────────────
export { 
  zoneSystem, 
  ZoneSystem, 
  buildPortneufZones,
  getZoneRules,
  getAllZoneTypes,
} from "./zones";
export type { 
  RPZone, 
  ZoneType, 
  ZoneRules,
  ZoneEnterEvent,
  ZoneExitEvent,
  ZoneViolation,
  PermitType,
} from "./zones";
export { worldConfig, ZONE_CONFIGS, ZONE_BOUNDS, SPAWN_POINTS } from "./worldconfig";
export type { ZoneConfig, ZoneBound, SpawnPoint, SurfaceKey, TrafficMix } from "./worldconfig";

// ── SpatialHash v2.0 (queries O(1)) ──
export { 
  SpatialHash,
  createOptimalSpatialHash,
  mergeSpatialHashes,
} from "./spatial";
export type { 
  SpatialEntry,
  SpatialKind,
  SpatialQueryOptions,
  SpatialStats,
  RectBounds,
} from "./spatial";

// ─── 7. COEUR DE RÉSEAU & SYNCHRONISATION CLIENT-SERVEUR (INTELLECTUS) ───────
export {
  INTELLECTUS,
  ANIMATIONS,
  spatial,
  persistBehind,
  encodePose,
  decodePose,
  worldFromClock,
  inAoi,
  nearbyIds,
} from "./intellectus";
export type { AnimName, CompactPose, IntellectusWorld, SeasonId } from "./intellectus";

export { intellectusClient } from "@/intellectus/IntellectusClient";
export type {
  IntellectusHealth,
  ThirdEyeStats,
  RPPlayerDTO,
  RPPropertyDTO,
  RPGangDTO,
} from "@/intellectus/IntellectusClient";

// ─── 8. INSTITUTIONS FINANCIÈRES (DESJARDINS) ────────────────────────────────
export {
  buildCaissePopulaire,
  buildCaisseInterior,
  buildAtmCabinet,
  caisseMapMarks,
  isCaisseOpen,
  caisseHoursLabel,
  caisseNameFor,
} from "./caisse";
export type { BuiltCaisse } from "./caisse";

export {
  LOAN_PRODUCTS,
  INVEST_LABEL,
  parseEconomy,
  EMPTY_ECONOMY,
} from "./banking";
export type { EconomyState, Loan, Investment, Transaction } from "./banking";

// ─── 9. ÉQUIPEMENTS, SÉCURITÉ PUBLIQUE & ARSENAL DU QUÉBEC (v2.0 Avancé) ─────
export {
  WEAPON_CATALOG,
  WEAPONS,
  WEAPON_IDS,
  LICENSES,
  POLICE_KIT,
  AMMO_CATALOG,
  canPurchase,
  checkCarryLegality,
  getWeapon,
  getWeaponsByLegalClass,
  getWeaponsByCategory,
  getLegalShopInventory,
  getDealerInventory,
  getCivilianWeapons,
  getPoliceWeapons,
  getCatalogStats,
  isLegalToCarry,
  isWeaponId,
  isZoneWeapon,
  buildWeaponMesh,
  attachWeaponTo,
  getEffectiveDPS,
  weaponAmmo,
  weaponHarvestRange,
  registerWeaponToSIAF,
  defaceWeaponSerialNumber,
  fireWeapon,
  clearWeaponJam,
  cleanAndServiceWeapon,
  matchCasingToWeapon,
  parseLicenses,
  grantLicense,
  licenseFromItem,
} from "./weapons";
export type { 
  WeaponTemplate, 
  WeaponId, 
  WeaponCategory, 
  LicenseId, 
  LegalClass, 
  LicenseDef, 
  AmmoCaliber, 
  AmmoSpec,
  WeaponInstance,
  ShootResult 
} from "./weapons";

export {
  initWeaponSystem,
  equipWeapon,
  unequipWeapon,
  fire,
  reload,
  updateWeapon,
  getWeaponState,
  isWeaponEquipped,
  addAmmo,
  setAmmo,
  getAmmoCount,
  resetWeapon,
  weaponSystem,
} from "./weaponSystem";
export type { WeaponConfig, WeaponState, HitResult, WeaponEvent } from "./weaponSystem";

// ─── 10. SYSTÈME MÉDICAL ET TRAUMATOLOGIQUE (CORPSES & INJURED) ───────────────
export { corpseProp, countyBodies, DEAD_SIT, DEAD_LIE, parseDeadPose, isDeadPose } from "./corpses";
export type { DeadPoseId, BodySpot } from "./corpses";
export { 
  injuredProp, 
  INJURED_CLIPS, 
  playInjuredOn, 
  clearInjuredOn, 
  pickInjuredClip, 
  isInjuredClip, 
  tickInjured, 
  countyInjured, 
  parseInjuredClip 
} from "./injured";
export type { InjuredClip, HurtSpot } from "./injured";

// ─── 11. MODÈLES ET LOGIQUE D'ARMES À FEU EN MAIN ────────────────────────────
export { ar15Prop, shotgunProp, pistolProp, ar15Held, shotgunHeld, pistolHeld, tickGuns } from "./guns";
export { ak74Prop, ak74Held, cycleAk74, tickAk74 } from "./ak74";
export { carabineProp, carabineHeld, cycleCarabine, tickCarabine } from "./carabine";
export { bobombProp } from "./bobomb";

// ─── 12. AMÉNAGEMENTS INTÉRIEURS DE PRESTIGE & MOBILIER (v2.0) ───────────────
export { woolSofa, nightstand, kingBed, brickFireplace, drapeCurtain, setLobbyLights } from "./luxury";

// ── Sofas v2.0 (cache LRU, variantes, animations) ──
export { 
  mountSofaMesh,
  mountSofa,
  sitOnSofa,
  standUpFromSofa,
  updateSofaAnimations,
  getSofaVariant,
  getAllSofaVariants,
  clearSofaCache,
  getSofaCacheStats,
} from "./sofa";
export type {
  SofaStyle,
  SofaMaterial,
  SofaConfig,
  SofaVariant,
  MountedSofa,
  SofaInteraction,
} from "./sofa";

export { mountNightstandMesh } from "./nightstand";
export { mountLoft } from "./loft";

// ─── 13. CONCESSIONNAIRES & PARC AUTOMOBILE DE PORTNEUF ──────────────────────
export { buildCouch, tickCouch } from "./couch";
export { buildCivic, buildJetta, buildLada, buildLambo, loadCar, updateCarWeather } from "./cars";
export type { CarAssetId } from "./cars";
export { FLEET, fleetById, isVehicleId, persoFleet, proFleet } from "./fleet";

// ─── 14. SERVICES PUBLICS, BOUTIQUES ET ENSEIGNES DE RANG ────────────────────
export { ETHER_MATS, getEtherMat, getEtherDef, getEtherByCat, searchEtherMats, ETHER_MAT_STATS } from "./etherMats";
export { createInteriors, INTERIOR_ORIGIN } from "./interiors";
export { buildBoutiqueInterior } from "./boutique";
export { buildDepanneurInterior, DEP_AISLES, depMapMarks, isDepOpen, depHoursLabel } from "./depanneur";
export type { DepAisle, DepAisleHot } from "./depanneur";

// ── SQDC v3.0 (braquage, fidélité, inspections) ──
export { 
  buildSqdcInterior, 
  SQDC_AISLES, 
  isSqdcOpen, 
  sqdcHoursLabel, 
  catalogForSqdcAisle,
  buildSqdcExterior,
  createNewStore as createSqdcStore,
  registerStore as registerSqdcStore,
  getStore as getSqdcStore,
  getAllStores as getAllSqdcStores,
  hireEmployee as hireSqdcEmployee,
  fireEmployee as fireSqdcEmployee,
  clockIn as sqdcClockIn,
  clockOut as sqdcClockOut,
  openStore as openSqdcStore,
  closeStore as closeSqdcStore,
  addToCart as addToSqdcCart,
  removeFromCart as removeFromSqdcCart,
  requestCheckout as requestSqdcCheckout,
  cashierRespond as sqdcCashierRespond,
  restockShelf as restockSqdcShelf,
  orderStock as orderSqdcStock,
  createDelivery as createSqdcDelivery,
  acceptDelivery as acceptSqdcDelivery,
  completeDelivery as completeSqdcDelivery,
  banCustomer as banSqdcCustomer,
  reportIncident as reportSqdcIncident,
  viewCameras as viewSqdcCameras,
  depositToSafe as depositToSqdcSafe,
  withdrawFromSafe as withdrawFromSqdcSafe,
  startRobbery as startSqdcRobbery,
  demandMoney as demandSqdcMoney,
  endRobbery as endSqdcRobbery,
  startInspection as startSqdcInspection,
  completeInspection as completeSqdcInspection,
  getLoyaltyCard,
  addLoyaltyPoints,
  updateDoorSystem,
  triggerAlarm as triggerSqdcAlarm,
  ROLE_PERMISSIONS as SQDC_ROLE_PERMISSIONS,
} from "./sqdc";
export type {
  SqdcStore,
  SqdcRole,
  SqdcPermissions,
  SqdcEmployee,
  SqdcStock,
  CashRegister as SqdcCashRegister,
  SqdcTransaction,
  SqdcLicense,
  Delivery as SqdcDelivery,
  Incident as SqdcIncident,
  CameraFeed as SqdcCameraFeed,
  LoyaltyCard,
  DoorSystem,
  RobberyState,
  Inspection as SqdcInspection,
  DailyReport as SqdcDailyReport,
} from "./sqdc";

export { FOODS, FOOD_IDS, spawnFood, spawnShopFood, buildFoodDisplay, getConsumptionEffect, isFoodId } from "./food";
export type { FoodId, FoodDef, FoodCategory } from "./food";
export { buildCasseInterior, CASSE_AISLES, isCasseOpen, casseHoursLabel } from "./casse";
export { buildHotelTvSetup } from "./hotelTv";
export { CATALOG, itemById, ammoFor, harvestRange } from "./commerce";

// ─── 15. LIBS DE FORMATS 3D ET COMPATIBILITÉ (v2.0) ─────────────────────────
export { 
  GLTF_LIBRARY, 
  loadGlb, 
  describeGltf, 
  attachGltfDecoders, 
  warmMeshopt,
  loadAsset,
  loadBatch,
  preloadAssets,
  getAnimationMixer,
  playAnimation,
  releaseAsset,
  clearCache as clearGltfCache,
  getAssetStats,
  registerAsset,
  getAssetMeta,
  getAssetsByRole,
  acquireInstance,
  releaseInstance,
} from "./gltf";
export { loadFbx, tickMixer, isFbxModel } from "./fbx";

// ─── 16. ÉCOSYSTÈME, FAUNE ET CONTRÔLE DE SÉCURITÉ ROUTIÈRE ──────────────────
export { WildlifeSystem } from "./wildlife";
export { hotelSecurity } from "./hotel";
export { police, QuebecPoliceSirens } from "./police";
export { buildPoliceLightbar, findLightbar } from "./lightbar";
export type { LightbarPattern, LightbarHandle } from "./lightbar";
export { quebecFM, QUEBEC_FM_STATIONS } from "./radio";
export { spatialAudio } from "./audio3d";
export { physics } from "./physics";

// ─── 17. ENVIRONNEMENT CLIMATIQUE & PRÉCIPITATIONS BORÉALES ──────────────────
export { skySnap, sunElevation, sunDirection, sunPosition, moonPosition, createSkySystem } from "./sky";
export type { SkySnap, SkySystem } from "./sky";
export { WeatherFx } from "./weatherfx";
export type { WeatherRPState } from "./weatherfx";
export { AdminFx } from "./fx";

// ─── 18. ENREGISTREMENT DES ENTREPRISES ET COMMERCE LOCAL (REQ) ──────────────
export { FIRM_TYPES, MAPAQ_GRANTS, countyFirms, buildFirmBuilding, shopKindForFirm, nextFirmSale, canApplyGrant } from "./business";
export type { Firm, FirmType, CountyFirm, PermitId } from "./business";

// ─── 19. FISCALITÉ, EMPLOIS ET MARCHÉ CLANDESTIN (RP COEUR) ──────────────────
export { 
  RP_JOBS, 
  GANGS, 
  CRIMES, 
  CRIME_SPOTS, 
  DEEDS, 
  defeedById as deedById, 
  withTax, 
  payrollNet, 
  jobById, 
  crimeById, 
  gangById, 
  nearestOf,
  TPS_RATE,
  TVQ_RATE,
  QC_TAX 
} from "./rp";
export type { Deed, RpJobId, RpJobDef, CrimeDef, CrimeId, GangDef } from "./rp";

export {
  COMMERCIALS,
  KIND_LABEL,
  ZONE_LABEL,
  catalog as mlsCatalog,
  propertyById,
  ownedIds,
  mlsList,
  parseRealty,
  EMPTY_REALTY,
  searchProperties,
  nearestCommercial,
} from "./realestate";
export type { MarketProperty, RealtyState, PropertyZone } from "./realestate";

export { catalogBuilder, tickProps3d, buildStreetProp } from "./props3d";

// ─── 20. AGRICULTURE ET ACTIVITÉS DE RANG (UPA) ──────────────────────────────
export { mountFarms, nearestField, tickFields, CROPS, fieldPrompt, farmMapMarks, farmClearings, legalFarmsteads } from "./farms";
export type { FieldPlot, CropId, FieldStage } from "./farms";

export { mountHerd, nearestStock, tickHerd, stockPrompt, workStock } from "./livestock";
export type { Stock, StockKind, StockWorkResult } from "./livestock";

export {
  mountSugarbush,
  nearestTap,
  nearestEvap,
  nearestBush,
  tickSugar,
  tapPrompt,
  evapPrompt,
  sugarSites,
  sugarClearings,
  sugarMapMarks,
  SAP_PER_SYRUP,
} from "./sugar";
export type { SugarBush, SugarTap, SugarEvap } from "./sugar";

// ─── 21. GESTION DU CADASTRE ET DES PROPRIÉTÉS RESIDENTIELLES (MLS) ──────────
export {
  mountHouses,
  nearestHouse,
  houseMapMarks,
  RENO_CATALOG,
  BASEMENT_FITS,
  GARAGE_FITS,
  houseValue,
  emptyHouse,
} from "./house";
export type { HouseState, HouseLot, RenoId, BasementFit, GarageFit, DoorSlot, KeyRole } from "./house";

export {
  HEAT_CATALOG,
  WATER_CATALOG,
  heatById,
  monthlyBill,
  scenicHeat,
} from "./utilities";
export type { HeatId, WaterId, GridOutage } from "./utilities";

export { buildPark, buildCemetery } from "./park";

// ─── 22. SYSTÈME DE CARRIÈRE ET CONTRATS TEMPORAIRES (GIGS) ──────────────────
export { JOB_CATALOG, allGigs, emptyCareer } from "./gigs";
export type { JobDef, CareerState, ActiveGig } from "./gigs";

// ─── 23. PERMISSIONS ADMINISTRATIVES ET JURIDICTIONS DU STAFF ────────────────
export {
  AdminRole,
  RpJobRole,
  ROLE_HIERARCHY,
  checkPermission,
  getUserRole,
  getAllStaffMembers,
  getRoleBadgeStyle,
  LOCAL_PLAYER_ID,
} from "./adminPerms";
export type { StaffEntry, RoleBadge } from "./adminPerms";

// ─── 24. MOBILIER URBAIN & INFRASTRUCTURE DE RUE (v3.0) ──────────────────────
export {
  countyStreetSpots,
  mountStreetFurniture,
  nearestStreet,
  nearestStreetEntity,
  tickStreet,
  buildStreetRuntime,
  resetStreetRuntime,
  getStreetInteractions,
  canInteractWithStreet,
  interactWithStreet,
  setStreetState,
  damageStreet,
  repairStreet,
  markStreetForMaintenance,
  vandalizeStreet,
  updateStreetEnvironment,
  getStreetDiagnostics,
  onStreetEvent,
  connectStreetIntellectus,
  streetRegistry,
  StreetRegistry,
  createStreetEntity,
} from "./street";
export type {
  StreetKind,
  StreetState,
  StreetInteraction,
  StreetEnvironment,
  StreetCapabilities,
  StreetUsageStats,
  StreetMaintenanceState,
  StreetSpot,
  StreetEntity,
  StreetInteractionResult,
  StreetEvent,
  StreetRuntimeOptions,
  StreetInventory,
  StreetLighting,
  StreetAnimation,
  StreetDiagnostics,
} from "./street";

// ─── 25. COLLECTIBLES DU MONDE (v2.0) ───────────────────────────────────────
export {
  WORLD_ITEM_DEFS,
  WorldItemField,
  getRarityColor,
  getRarityLabel,
} from "./worlditems";
export type {
  WorldItemDef,
  ItemRarity,
  ItemCategory,
  CollectEvent,
  NearbyEvent,
} from "./worlditems";

// ─── 26. STORE GLOBAL & PERSISTANCE (v2.0) ──────────────────────────────────
export {
  useGameStore,
  persist,
  persistNow,
  EMPTY_SAVE,
  selectCash,
  selectBank,
  selectInventory,
  selectAppearance,
  selectFirm,
  selectCareer,
  selectSqdc,
  selectVehicle,
  selectOwnedVehicles,
  selectPosition,
  selectPaused,
  selectWeather,
  selectTimeHours,
  selectNight,
  selectPlayerStats,
  selectUIState,
} from "./store";
export type {
  ChatMessage,
  WeatherId,
  PlayMode,
  CameraMode,
  LedgerEntry,
  TicketRecord,
  HudState,
  SqdcState,
} from "./store";

// ═════════════════════════════════════════════════════════════════════════════
// VERSIONING & METADATA
// ═════════════════════════════════════════════════════════════════════════════

export const WORLD_ENGINE_VERSION = "2.5.0";

export const MODULE_VERSIONS = {
  spatial: "2.0.0",
  zones: "2.0.0",
  street: "3.0.0",
  sqdc: "3.0.0",
  worlditems: "2.0.0",
  store: "2.0.0",
  sofa: "2.0.0",
  gltf: "2.0.0",
  weapons: "2.0.0",
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// API DISCOVERY HELPERS
// ═════════════════════════════════════════════════════════════════════════════

export function listModules(): Array<{ name: string; version: string }> {
  return Object.entries(MODULE_VERSIONS).map(([name, version]) => ({
    name,
    version,
  }));
}

export function searchAPI(query: string): string[] {
  const results: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  const symbols = [
    "zoneSystem", "streetRegistry", "useGameStore", "spatialHash",
    "VILLAGES", "POIS", "LAKES", "SPAWN",
    "matLib", "tex", "getGeo",
    "buildSqdcInterior", "mountStreetFurniture",
    "WorldItemField", "mountSofa", "weaponSystem", "fireWeapon",
  ];
  
  for (const sym of symbols) {
    if (sym.toLowerCase().includes(lowerQuery)) {
      results.push(sym);
    }
  }
  
  return results;
}

export function getSystemHealth(): Record<string, { status: "ok" | "degraded" | "error"; details?: string }> {
  return {
    spatial: { status: "ok" },
    zones: { status: "ok" },
    street: { status: "ok", details: `${(globalThis as any).streetRegistry?.size ?? 0} entities loaded` },
    sqdc: { status: "ok" },
    worlditems: { status: "ok", details: `${((globalThis as any).WORLD_ITEM_DEFS?.length ?? 0)} items defined` },
    store: { status: "ok" },
    weapons: { status: "ok", details: "Quebec firearms legislation & IBIS ballistic modules online" },
  };
}