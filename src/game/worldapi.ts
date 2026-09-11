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

export { sampleRoad, buildRoadRibbon, buildCenterLine } from "./roads";
export { PortneufWorld } from "./world";
export { matLib, QC_PALETTE, WALL_COLORS, ROOF_COLORS } from "./materials";
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
  CHARGE_CATALOG,
} from "./prison";
export type { BuiltPrison, Inmate } from "./prison";

export { zoneSystem, ZoneSystem, buildPortneufZones } from "./zones";
export type { RPZone, ZoneType, ZoneRules } from "./zones";

export {
  WEAPON_CATALOG,
  LICENSES,
  canPurchase,
  checkCarryLegality,
  getWeapon,
  getWeaponsByLegalClass,
  getLegalShopInventory,
  getDealerInventory,
  getCatalogStats,
} from "./weapons";
export type { WeaponTemplate, LicenseId, LegalClass, LicenseDef } from "./weapons";

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
export { buildHotelTvSetup } from "./hotelTv";
export { CATALOG, itemById, ammoFor, harvestRange } from "./commerce";
export { GLTF_LIBRARY, loadGlb, describeGltf, attachGltfDecoders, warmMeshopt } from "./gltf";
export { loadFbx, tickMixer, isFbxModel } from "./fbx";
export { WildlifeSystem } from "./wildlife";
export { hotelSecurity } from "./hotel";
export { police } from "./police";
export { quebecFM, QUEBEC_FM_STATIONS } from "./radio";
export { AdminFx } from "./fx";
export { FIRM_TYPES, MAPAQ_GRANTS, countyFirms, buildFirmBuilding, shopKindForFirm, nextFirmSale, canApplyGrant } from "./business";
export type { Firm, FirmType, CountyFirm, PermitId } from "./business";
export { RP_JOBS, GANGS, CRIMES, CRIME_SPOTS } from "./rp";
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

export const WORLD_ENGINE_VERSION = "0.3.4";
