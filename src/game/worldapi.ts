/**
 * API monde — un seul graphe d'exports pour tout le comté.
 * Game / engine importent ce module : chaque fichier du moteur est branché.
 */
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
} from "./worlddata";
export type { VillageDef, Industry, LandmarkKind, TerrainType, ChurchStyle, RoadDef, RoadKind } from "./worlddata";

export { sampleRoad, buildRoadRibbon, buildCenterLine, buildIntersectionPad, buildRoadSidewalks } from "./roads";
export { PortneufWorld } from "./world";
export { matLib, QC_PALETTE, WALL_COLORS, ROOF_COLORS } from "./materials";
export { commerceMat, COMMERCE_PALETTE, installCommerceEnv } from "./commerceMats";
export { tex } from "./textures";
export { getGeo, geoStats, InstancePool } from "./geo";
export { propAnim, ANIM_TYPES } from "./anim";
export { PROP_CATALOG, buildProp, isPropId, PROP_IDS } from "./builder";
export { MODEL_CATALOG, MODEL_CATEGORIES, MODEL_ALIAS, searchModels, TOTAL_MODELS, buildFromMeta } from "./models";
export { buildCity } from "./city";
export type { BuiltCity, CityDoor, InteriorKind } from "./city";

export {
  buildPrisonComplex,
  animatePrison,
  prisonSystem,
  // TODO: À exporter depuis prison.ts si nécessaire
  // CHARGE_CATALOG,
} from "./prison";
export type { BuiltPrison } from "./prison";
// TODO: Inmate n'est pas exporté depuis prison.ts
// export type { Inmate } from "./prison";

export { zoneSystem, ZoneSystem, buildPortneufZones } from "./zones";
export type { RPZone, ZoneType, ZoneRules } from "./zones";
export { worldConfig, ZONE_CONFIGS, ZONE_BOUNDS, SPAWN_POINTS } from "./worldconfig";
export type { ZoneConfig, ZoneBound, SpawnPoint, SurfaceKey, TrafficMix } from "./worldconfig";
export { withIce } from "./worlddata";

export { SpatialHash } from "./spatial";
export type { SpatialEntry } from "./spatial";
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

export {
  buildCaissePopulaire,
  buildCaisseInterior,
  buildAtmCabinet,
  caisseMapMarks,
  isCaisseOpen,
  caisseHoursLabel,
  caisseNameFor,
  // TODO: À exporter depuis caisse.ts si nécessaire
  // CAISSE_NIP,
} from "./caisse";
export type { BuiltCaisse } from "./caisse";
export {
  LOAN_PRODUCTS,
  INVEST_LABEL,
  parseEconomy,
  EMPTY_ECONOMY,
} from "./banking";
export type { EconomyState, Loan, Investment, Transaction } from "./banking";
export { intellectusClient } from "@/intellectus/IntellectusClient";
export type {
  IntellectusHealth,
  ThirdEyeStats,
  RPPlayerDTO,
  RPPropertyDTO,
  RPGangDTO,
} from "@/intellectus/IntellectusClient";

export {
  WEAPON_CATALOG,
  WEAPONS,
  WEAPON_IDS,
  LICENSES,
  POLICE_KIT,
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
} from "./weapons";
export type { WeaponTemplate, WeaponId, WeaponCategory, LicenseId, LegalClass, LicenseDef } from "./weapons";

export { corpseProp, countyBodies, DEAD_SIT, DEAD_LIE, parseDeadPose, isDeadPose } from "./corpses";
export type { DeadPoseId, BodySpot } from "./corpses";
export { injuredProp, INJURED_CLIPS, playInjuredOn, clearInjuredOn, pickInjuredClip, isInjuredClip, tickInjured, countyInjured, parseInjuredClip } from "./injured";
export type { InjuredClip, HurtSpot } from "./injured";
export { ar15Prop, shotgunProp, pistolProp, ar15Held, shotgunHeld, pistolHeld, tickGuns } from "./guns";
export { ak74Prop, ak74Held, cycleAk74, tickAk74 } from "./ak74";
export { carabineProp, carabineHeld, cycleCarabine, tickCarabine } from "./carabine";
export { bobombProp } from "./bobomb";
export { woolSofa, nightstand, kingBed, brickFireplace, drapeCurtain, setLobbyLights } from "./luxury";
export { mountSofaMesh } from "./sofa";
export { mountNightstandMesh } from "./nightstand";
export { mountLoft } from "./loft";
export { buildCouch, tickCouch } from "./couch";
export { buildCivic, buildJetta, buildLada, buildLambo, loadCar } from "./cars";
export type { CarAssetId } from "./cars";
export { FLEET, fleetById, isVehicleId, persoFleet, proFleet } from "./fleet";
export { ETHER_MATS, getEtherMat, getEtherDef, getEtherByCat, searchEtherMats, ETHER_MAT_STATS } from "./etherMats";
export { createInteriors, INTERIOR_ORIGIN } from "./interiors";
export { buildBoutiqueInterior } from "./boutique";
export { buildDepanneurInterior, DEP_AISLES, depMapMarks, isDepOpen, depHoursLabel } from "./depanneur";
export type { DepAisle, DepAisleHot } from "./depanneur";
export { buildSqdcInterior, SQDC_AISLES, isSqdcOpen, sqdcHoursLabel, catalogForSqdcAisle } from "./sqdc";
export { FOODS, FOOD_IDS, spawnFood, spawnShopFood, buildFoodDisplay, getConsumptionEffect, isFoodId } from "./food";
export type { FoodId, FoodDef, FoodCategory } from "./food";
export { buildCasseInterior, CASSE_AISLES, isCasseOpen, casseHoursLabel } from "./casse";
export { buildHotelTvSetup } from "./hotelTv";
export { CATALOG, itemById, ammoFor, harvestRange } from "./commerce";
export { GLTF_LIBRARY, loadGlb, describeGltf, attachGltfDecoders, warmMeshopt } from "./gltf";
export { loadFbx, tickMixer, isFbxModel } from "./fbx";
export { WildlifeSystem } from "./wildlife";
export { hotelSecurity } from "./hotel";
export { police, QuebecPoliceSirens } from "./police";
export { buildPoliceLightbar, findLightbar } from "./lightbar";
export type { LightbarPattern, LightbarHandle } from "./lightbar";
export { quebecFM, QUEBEC_FM_STATIONS } from "./radio";
export { spatialAudio } from "./audio3d";
export { physics } from "./physics";
export { skySnap, sunElevation, sunDirection } from "./sky";
export { AdminFx } from "./fx";
export { FIRM_TYPES, MAPAQ_GRANTS, countyFirms, buildFirmBuilding, shopKindForFirm, nextFirmSale, canApplyGrant } from "./business";
export type { Firm, FirmType, CountyFirm, PermitId } from "./business";
export { RP_JOBS, GANGS, CRIMES, CRIME_SPOTS, DEEDS, deedById } from "./rp";
export type { Deed } from "./rp";
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
export type { MarketProperty, RealtyState, PropertyType, PropertyZone } from "./realestate";
export { catalogBuilder, tickProps3d, buildStreetProp } from "./props3d";
export { mountFarms, nearestField, tickFields, CROPS, fieldPrompt, farmMapMarks, farmClearings, legalFarmsteads } from "./farms";
export type { FieldPlot, CropId, FieldStage } from "./farms";
export { mountHerd, nearestStock, tickHerd, stockPrompt } from "./livestock";
export type { Stock, StockKind } from "./livestock";
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
export { JOB_CATALOG, allGigs, emptyCareer } from "./gigs";
export type { JobDef, CareerState, ActiveGig } from "./gigs";
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

export const WORLD_ENGINE_VERSION = "1.2.0";