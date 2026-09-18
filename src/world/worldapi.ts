/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🌐 API MONDE CENTRALISÉE — TROXTWORLD (v3.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * Fichier: src/game/worldapi.ts
 *
 * 📌 DESCRIPTION:
 * Ce fichier expose une API complète pour interagir avec le monde de TroxTWorld.
 * Il centralise l'accès à tous les systèmes :
 * - Gestion du monde (terrain, bâtiments, véhicules)
 * - Systèmes RP (factions, quêtes, événements, PNJ)
 * - Économie et ressources
 * - Météo et saisons
 * - Interactions et actions
 *
 * 📌 VERSION:
 * v3.0.0 - Intégration complète du système RP
 *
 * 📌 DÉPENDANCES:
 * - three.js (pour les types de base)
 * - ./geometries (pour les géométries 3D)
 * - ./textures (pour les textures)
 * - ./world (pour PortneufWorld)
 * - ./city (pour les systèmes de ville)
 * - ./seasons (pour les saisons québécoises)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { getGeo, geoStats, InstancePool } from "./geometries";

// ============================================================================
// 📜 EXPORTS DES TYPES DE BASE (pour la compatibilité ascendante)
// ============================================================================

export type { MapKind, TexMetrics, TexId } from "./textures";
export { getGeo, geoStats, InstancePool };

// Version du moteur de monde 3D requise par engine.ts
export const WORLD_ENGINE_VERSION = "3.0.0";

// ============================================================================
// 🌍 EXPORTS DES TYPES RP (depuis les fichiers correspondants)
// ============================================================================

// --- Types de base ---
export type {
  Season,
  WeatherType,
  DayPhase,
  BuildingType,
  BuildingCategory,
  BuildingCondition,
  QualityLevel,
  ArchitecturalStyle,
  DistrictType,
  TerrainType,
  SatisfactionLevel,
  CitizenType,
  Profession,
  CitizenNeed,
  CrimeType,
  PublicServiceType,
  CityEventType,
  EventSeverity,
  FactionType,
} from "./city";

// --- Structures de données ---
export type {
  CityDoor,
  CityConfig,
  BuiltCity,
  CityBuilding,
  CityDistrict,
  Citizen,
  BoutiqueGarment,
  BoutiqueDef,
  GarmentDef,
  GarmentCategory,
  GarmentTrait,
  Rarity,
  PropTrait,
  ResourceType,
  ResourceCost,
  ReputationLevel,
  PropStyle,
  PropDef,
  PlacedProp,
  PropQuest,
  InteriorKind,
  ShopItemId,
  VillageDef,
  FieldPlot,
  Stock,
  SugarBush,
  SugarEvap,
  SugarTap,
  CountyFirm,
  Firm,
  PropId,
  HouseLot,
  HouseState,
  StreetSpot,
  Deed,
  AtmSpot,
  CrimeSpot,
  ShopSpot,
  SwingDoor,
  SolidBox,
  LightbarHandle,
  LightbarOpts,
  QcMat,
  SkySnap,
  MapKind,
  TexMetrics,
  TexId,
} from "./city";

// --- Types étendus pour le RP ---
export type {
  ExtendedTrafficVehicle,
  ExtendedNPC,
  Campfire,
  FishingSpot,
  HuntingZone,
  NaturalResource,
  HarvestZone,
  Market,
  Festival,
  Crime,
  JusticeSystem,
  EconomySystem,
  WorldEvent,
  WorldQuest,
  PlayerWorldState,
  WorldState,
} from "./world";

// ============================================================================
// 🏗️ EXPORTS DES FONCTIONS DE BASE (pour la compatibilité)
// ============================================================================

export {
  buildCabaneSucre,
  buildCasseCroute,
  buildBoutique,
  buildChasseShop,
  buildQuincaillerie,
  buildDepanneur,
  buildSqdc,
  buildEcole,
  buildEglise,
  buildHotelVille,
  buildMaisonCanadienne,
  buildPanneauArret,
  buildPanneauVitesse,
  buildPanneauSortie,
  buildPanneauAutoroute,
  buildGantrySortie,
  buildOverpass,
  buildPickup,
  buildPolice,
  buildSedan,
  buildCamion,
  buildSqPoste,
  buildAtm,
  buildCrimeCorner,
} from "./architecture";

export {
  buildFirmBuilding,
  countyFirms,
  nearestCountyFirm,
  shopKindForFirm,
} from "./business";

export {
  farmClearings,
  mountFarms,
  nearestField,
  tickFields,
  buildTracteur,
} from "./farms";

export {
  mountHerd,
  nearestStock,
  tickHerd,
} from "./livestock";

export {
  mountSugarbush,
  nearestBush,
  nearestEvap,
  nearestTap,
  sugarClearings,
  tickSugar,
} from "./sugar";

export {
  buildBoiteOutils,
  buildPelle,
  buildRateau,
} from "./tools";

export {
  buildCamping,
  buildCaveEntrance,
  buildEboulis1894,
  buildGorge,
  buildMarmitesDeGeants,
  buildMoulin,
  buildPapeterie,
  buildPlageParc,
  buildPontDeFer,
  buildQuarry,
  buildTrouDuDiable,
  buildMarina,
  buildCemetery,
  buildPark,
} from "./landmarks";

export {
  LANDMARK_SHOPS,
  shopNameFor,
} from "./commerce";

export {
  shopDoorOffset,
  depHoursLabel,
} from "./depanneur";

export {
  animateCaisse,
  buildCaissePopulaire,
  caisseHoursLabel,
  caisseNameFor,
  setCaisseNight,
  worldOffset,
} from "./caisse";

export {
  ATM_SPOTS,
  CRIME_SPOTS,
  DEEDS,
} from "./rp";

export {
  attachScenicHeat,
  scenicHeat,
} from "./utilities";

export {
  houseMapMarks,
  mountHouses,
  nearestHouse,
  paintHouseLot,
} from "./house";

export {
  corpseProp,
  countyBodies,
} from "./corpses";

export {
  injuredProp,
  tickInjured,
  countyInjured,
} from "./injured";

export {
  mountStreetFurniture,
  nearestStreet,
  tickStreet,
} from "./street";

export {
  matLib,
} from "./materials";

export {
  findLightbar,
} from "./lightbar";

export {
  QuebecPoliceSirens,
} from "./police";

export {
  setCommerceEnvNight,
} from "./commerceMats";

export {
  createSunCsm,
  disposeCsm,
  setCsmEnabled,
  applySun,
  wireCsmTree,
} from "./csm";

export {
  skySnap,
} from "./sky";

export {
  WeatherFx,
} from "./weatherfx";

export {
  SnowPlowField,
} from "./plows";

export {
  quebecSeasons,
} from "./seasons";

export {
  parseFogColor,
  pickTrafficKind,
  worldConfig,
} from "./worldconfig";

export {
  buildCity,
  setCurrentDay,
  setCurrentSeason,
  setCurrentTime,
  updateCityForNewDay,
  updateCitizensForNewHour,
  getPropDef,
  getPropQuests,
  isPropSeasonal,
  getPropsByCategory,
  getPropsByTrait,
  getAffordableProps,
  getSaleProps,
  getNewProps,
  checkQuestCompletion,
  updateQuests,
  getActiveQuests,
  generateRandomCustomer,
  generateRandomStaff,
  updateMoods,
  getRandomDialogue,
  generateRandomReview,
  updateReputation,
  interactWithGarment,
  getDisplayGarments,
  getMannequinGarments,
  getRackGarments,
  getAvailableGarments,
  updatePositions,
  getRandomDialogue as getRandomNPCDialogue,
} from "./city";

export {
  PortneufWorld,
  approxLength,
  idmAccel,
  plantCrop,
} from "./world";

// ============================================================================
// 🎯 SYSTÈME DE VERSIONNEMENT ET COMPATIBILITÉ
// ============================================================================

/**
 * Version complète de l'API monde.
 * Format : MAJEUR.MINEUR.PATCH (ex: 3.0.0)
 * - MAJEUR : Changements incompatibles
 * - MINEUR : Ajouts de fonctionnalités (rétrocompatibles)
 * - PATCH : Corrections de bugs
 */
export const WORLD_API_VERSION = "3.0.0";

/**
 * Vérifie la compatibilité entre la version de l'API et une version requise.
 * @param requiredVersion - Version requise (ex: "3.0.0").
 * @returns `true` si compatible, `false` sinon.
 */
export function checkWorldAPICompatibility(requiredVersion: string): boolean {
  const [requiredMajor, requiredMinor, requiredPatch] = requiredVersion
    .split(".")
    .map(Number);
  const [currentMajor, currentMinor, currentPatch] = WORLD_API_VERSION
    .split(".")
    .map(Number);

  // Compatible si :
  // - Majeur est identique
  // - Mineur est supérieur ou égal
  // (On ignore le patch pour la compatibilité)
  return (
    currentMajor === requiredMajor &&
    currentMinor >= requiredMinor
  );
}

// ============================================================================
// 🌐 CLASSE PRINCIPALE : WorldAPI (Point d'entrée unique)
// ============================================================================

/**
 * API principale pour interagir avec le monde de TroxTWorld.
 * Cette classe centralise toutes les fonctionnalités et systèmes RP.
 */
export class WorldAPI {
  /** Instance du monde (PortneufWorld). */
  private world: PortneufWorld | null = null;

  /** État global du monde. */
  private worldState: WorldState | null = null;

  /** Instance singleton pour le pattern Singleton. */
  private static instance: WorldAPI | null = null;

  /**
   * Constructeur privé pour le pattern Singleton.
   * @param scene - Scène THREE.js.
   * @param camera - Caméra THREE.js.
   */
  private constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    this.initializeWorld();
  }

  /**
   * Crée ou récupère l'instance singleton de WorldAPI.
   * @param scene - Scène THREE.js.
   * @param camera - Caméra THREE.js.
   * @returns Instance de WorldAPI.
   */
  static getInstance(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ): WorldAPI {
    if (!WorldAPI.instance) {
      WorldAPI.instance = new WorldAPI(scene, camera);
    }
    return WorldAPI.instance;
  }

  /**
   * Initialise le monde.
   */
  private initializeWorld(): void {
    this.world = new PortneufWorld(this.scene, this.camera);
    this.worldState = this.world.worldState;
  }

  /**
   * Construit le monde (à appeler après l'initialisation de la scène).
   */
  buildWorld(): void {
    if (!this.world) return;
    this.world.build();
  }

  // ============================================================================
  // 🌍 ACCESSEURS AU MONDE
  // ============================================================================

  /**
   * Récupère l'instance du monde (PortneufWorld).
   * @returns Instance de PortneufWorld ou `null`.
   */
  getWorld(): PortneufWorld | null {
    return this.world;
  }

  /**
   * Récupère l'état global du monde.
   * @returns État du monde ou `null`.
   */
  getWorldState(): WorldState | null {
    return this.worldState;
  }

  /**
   * Récupère la scène THREE.js.
   * @returns Scène THREE.js.
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Récupère la caméra THREE.js.
   * @returns Caméra THREE.js.
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  // ============================================================================
  // 🌦️ SYSTÈME DE MÉTÉO ET SAISONS
  // ============================================================================

  /**
   * Définit la météo actuelle.
   * @param weather - Type de météo.
   */
  setWeather(weather: WeatherType): void {
    if (!this.world) return;
    this.world.setWeather(weather);
    this.worldState!.weather = weather;
  }

  /**
   * Récupère la météo actuelle.
   * @returns Type de météo actuel.
   */
  getWeather(): WeatherType {
    return this.worldState?.weather || "clear";
  }

  /**
   * Définit la saison actuelle.
   * @param season - Saison à définir.
   */
  setSeason(season: Season): void {
    if (!this.world) return;
    setCurrentSeason(season);
    this.worldState!.season = season;
  }

  /**
   * Récupère la saison actuelle.
   * @returns Saison actuelle.
   */
  getSeason(): Season {
    return this.worldState?.season || "ete";
  }

  /**
   * Définit l'heure actuelle (0-23).
   * @param hours - Heure à définir.
   */
  setTime(hours: number): void {
    if (!this.world) return;
    this.world.setTime(hours);
    this.worldState!.currentTime = hours;
    this.worldState!.dayPhase = this.world.getDayPhase(hours);
  }

  /**
   * Récupère l'heure actuelle.
   * @returns Heure actuelle (0-23).
   */
  getTime(): number {
    return this.worldState?.currentTime || 12;
  }

  /**
   * Récupère la phase du jour (aube, matin, midi, etc.).
   * @returns Phase du jour.
   */
  getDayPhase(): DayPhase {
    return this.worldState?.dayPhase || "midi";
  }

  /**
   * Définit le jour actuel.
   * @param day - Jour à définir.
   */
  setDay(day: number): void {
    if (!this.world) return;
    setCurrentDay(day);
    this.worldState!.currentDay = day;
  }

  /**
   * Récupère le jour actuel.
   * @returns Jour actuel.
   */
  getDay(): number {
    return this.worldState?.currentDay || 0;
  }

  /**
   * Avance le temps d'une certaine quantité.
   * @param hours - Nombre d'heures à avancer.
   */
  advanceTime(hours: number): void {
    if (!this.world || !this.worldState) return;

    const newTime = this.worldState.currentTime + hours;
    const daysPassed = Math.floor(newTime / 24);
    const newHour = newTime % 24;

    this.setTime(newHour);
    this.setDay(this.worldState.currentDay + daysPassed);

    // Mettre à jour l'état du monde
    this.world.update(0, newTime * 3600, new THREE.Vector3(0, 0, 0));
  }

  // ============================================================================
  // 🏙️ SYSTÈME DE VILLES ET BÂTIMENTS
  // ============================================================================

  /**
   * Récupère toutes les villes construites.
   * @returns Liste des villes.
   */
  getCities(): BuiltCity[] {
    return this.world?.cityBuildings || [];
  }

  /**
   * Récupère une ville par son ID.
   * @param cityId - ID de la ville.
   * @returns Ville ou `undefined`.
   */
  getCityById(cityId: string): BuiltCity | undefined {
    return this.world?.cityBuildings.find((city) => city.group.name === cityId);
  }

  /**
   * Récupère tous les bâtiments du monde.
   * @returns Liste des bâtiments.
   */
  getAllBuildings(): CityBuilding[] {
    if (!this.world) return [];
    let allBuildings: CityBuilding[] = [];
    for (const city of this.world.cityBuildings) {
      allBuildings = allBuildings.concat(city.buildings);
    }
    return allBuildings;
  }

  /**
   * Récupère un bâtiment par son ID.
   * @param buildingId - ID du bâtiment.
   * @returns Bâtiment ou `undefined`.
   */
  getBuildingById(buildingId: string): CityBuilding | undefined {
    if (!this.world) return undefined;
    for (const city of this.world.cityBuildings) {
      const building = city.buildings.find((b) => b.id === buildingId);
      if (building) return building;
    }
    return undefined;
  }

  /**
   * Récupère les bâtiments d'un type spécifique.
   * @param type - Type de bâtiment.
   * @returns Liste des bâtiments du type spécifié.
   */
  getBuildingsByType(type: BuildingType): CityBuilding[] {
    if (!this.world) return [];
    return this.getAllBuildings().filter((b) => b.type === type);
  }

  /**
   * Récupère les bâtiments d'une catégorie spécifique.
   * @param category - Catégorie de bâtiment.
   * @returns Liste des bâtiments de la catégorie spécifiée.
   */
  getBuildingsByCategory(category: BuildingCategory): CityBuilding[] {
    if (!this.world) return [];
    return this.getAllBuildings().filter((b) => b.category === category);
  }

  /**
   * Récupère les bâtiments selon leur condition.
   * @param condition - Condition du bâtiment.
   * @returns Liste des bâtiments avec la condition spécifiée.
   */
  getBuildingsByCondition(condition: BuildingCondition): CityBuilding[] {
    if (!this.world) return [];
    return this.getAllBuildings().filter((b) => b.condition === condition);
  }

  /**
   * Récupère les bâtiments selon leur niveau de qualité.
   * @param minQuality - Qualité minimale (1-5).
   * @param maxQuality - Qualité maximale (1-5).
   * @returns Liste des bâtiments avec la qualité spécifiée.
   */
  getBuildingsByQuality(
    minQuality: QualityLevel = 1,
    maxQuality: QualityLevel = 5
  ): CityBuilding[] {
    if (!this.world) return [];
    return this.getAllBuildings().filter(
      (b) => b.quality >= minQuality && b.quality <= maxQuality
    );
  }

  /**
   * Achete un bâtiment.
   * @param buildingId - ID du bâtiment.
   * @param buyerId - ID de l'acheteur (joueur ou PNJ).
   * @returns `true` si l'achat a réussi.
   */
  buyBuilding(buildingId: string, buyerId: string): boolean {
    if (!this.world) return false;
    const building = this.getBuildingById(buildingId);
    if (!building) return false;

    // Vérifier si le bâtiment est déjà acheté
    if (building.owner) return false;

    // Vérifier si l'acheteur a assez d'argent
    const buyer = this.getNPCById(buyerId) || this.getPlayer();
    if (!buyer || buyer.wealth < building.buyCost) return false;

    // Effectuer l'achat
    buyer.wealth -= building.buyCost;
    building.owner = buyerId;

    // Mettre à jour les statistiques
    if (buyerId === "player") {
      this.worldState!.player.ownedBuildings.push(buildingId);
      this.worldState!.statistics.moneySpent += building.buyCost;
    }

    return true;
  }

  /**
   * Vend un bâtiment.
   * @param buildingId - ID du bâtiment.
   * @param sellerId - ID du vendeur (joueur ou PNJ).
   * @returns `true` si la vente a réussi.
   */
  sellBuilding(buildingId: string, sellerId: string): boolean {
    if (!this.world) return false;
    const building = this.getBuildingById(buildingId);
    if (!building) return false;

    // Vérifier si le bâtiment appartient au vendeur
    if (building.owner !== sellerId) return false;

    // Effectuer la vente
    const seller = this.getNPCById(sellerId) || this.getPlayer();
    if (seller) {
      seller.wealth += Math.floor(building.value * 0.9); // 90% de la valeur
    }

    building.owner = undefined;

    // Mettre à jour les statistiques
    if (sellerId === "player") {
      this.worldState!.player.ownedBuildings = this.worldState!.player.ownedBuildings.filter(
        (id) => id !== buildingId
      );
      this.worldState!.statistics.moneyEarned += Math.floor(building.value * 0.9);
    }

    return true;
  }

  /**
   * Répare un bâtiment.
   * @param buildingId - ID du bâtiment.
   * @returns `true` si la réparation a réussi.
   */
  repairBuilding(buildingId: string): boolean {
    if (!this.world) return false;
    const building = this.getBuildingById(buildingId);
    if (!building) return false;

    // Vérifier si le bâtiment a besoin de réparation
    if (building.condition === "neuf" || building.durability >= 80) {
      return false;
    }

    // Calculer le coût de réparation
    const repairCost = Math.floor(
      building.value * 0.1 * (1 - building.durability / 100)
    );

    // Vérifier si le joueur a assez d'argent
    const player = this.getPlayer();
    if (player.wealth < repairCost) return false;

    // Effectuer la réparation
    player.wealth -= repairCost;
    building.durability = Math.min(100, building.durability + 30);
    building.condition = building.durability >= 80 ? "bon_etat" :
                          building.durability >= 50 ? "use" : "abandonne";

    return true;
  }

  /**
   * Améliore un bâtiment.
   * @param buildingId - ID du bâtiment.
   * @returns `true` si l'amélioration a réussi.
   */
  upgradeBuilding(buildingId: string): boolean {
    if (!this.world) return false;
    const building = this.getBuildingById(buildingId);
    if (!building) return false;

    // Vérifier si le bâtiment peut être amélioré
    if (building.quality >= 5) return false;

    // Calculer le coût d'amélioration
    const upgradeCost = Math.floor(building.value * 0.3);

    // Vérifier si le joueur a assez d'argent
    const player = this.getPlayer();
    if (player.wealth < upgradeCost) return false;

    // Effectuer l'amélioration
    player.wealth -= upgradeCost;
    building.quality = Math.min(5, building.quality + 1) as QualityLevel;
    building.value = Math.floor(building.value * 1.2);
    building.buyCost = Math.floor(building.buyCost * 1.2);
    building.rentCost = Math.floor(building.rentCost * 1.2);
    building.reputationImpact = Math.floor(building.reputationImpact * 1.1);

    return true;
  }

  // ============================================================================
  // 👥 SYSTÈME DE PNJ ET CITOYENS
  // ============================================================================

  /**
   * Récupère tous les PNJ du monde.
   * @returns Liste des PNJ.
   */
  getAllNPCs(): ExtendedNPC[] {
    return this.world?.npcs || [];
  }

  /**
   * Récupère un PNJ par son ID.
   * @param npcId - ID du PNJ.
   * @returns PNJ ou `undefined`.
   */
  getNPCById(npcId: string): ExtendedNPC | undefined {
    return this.world?.npcs.find((npc) => npc.id === npcId);
  }

  /**
   * Récupère les PNJ d'un type spécifique.
   * @param type - Type de PNJ.
   * @returns Liste des PNJ du type spécifié.
   */
  getNPCsByType(type: CitizenType): ExtendedNPC[] {
    return this.getAllNPCs().filter((npc) => npc.type === type);
  }

  /**
   * Récupère les PNJ d'une faction spécifique.
   * @param faction - Faction.
   * @returns Liste des PNJ de la faction spécifiée.
   */
  getNPCsByFaction(faction: FactionType): ExtendedNPC[] {
    return this.getAllNPCs().filter((npc) => npc.faction === faction);
  }

  /**
   * Récupère les PNJ selon leur mood.
   * @param mood - Mood du PNJ.
   * @returns Liste des PNJ avec le mood spécifié.
   */
  getNPCsByMood(mood: ExtendedNPC["mood"]): ExtendedNPC[] {
    return this.getAllNPCs().filter((npc) => npc.mood === mood);
  }

  /**
   * Récupère les citoyens d'une ville spécifique.
   * @param cityId - ID de la ville.
   * @returns Liste des citoyens de la ville.
   */
  getCitizensByCity(cityId: string): Citizen[] {
    if (!this.world) return [];
    const city = this.getCityById(cityId);
    return city ? city.citizens : [];
  }

  /**
   * Récupère un citoyen par son ID.
   * @param citizenId - ID du citoyen.
   * @returns Citoyen ou `undefined`.
   */
  getCitizenById(citizenId: string): Citizen | undefined {
    if (!this.world) return undefined;
    for (const city of this.world.cityBuildings) {
      const citizen = city.citizens.find((c) => c.id === citizenId);
      if (citizen) return citizen;
    }
    return undefined;
  }

  /**
   * Interagit avec un PNJ.
   * @param npcId - ID du PNJ.
   * @param action - Action à effectuer ("talk", "trade", "give", "take").
   * @param params - Paramètres supplémentaires selon l'action.
   * @returns Résultat de l'interaction.
   */
  interactWithNPC(
    npcId: string,
    action: "talk" | "trade" | "give" | "take" | "follow" | "arrest",
    params?: any
  ): { success: boolean; message: string; data?: any } {
    const npc = this.getNPCById(npcId);
    if (!npc) {
      return { success: false, message: "PNJ introuvable." };
    }

    const player = this.getPlayer();

    switch (action) {
      case "talk":
        return this.talkToNPC(npc, player);
      case "trade":
        return this.tradeWithNPC(npc, player, params?.items);
      case "give":
        return this.giveToNPC(npc, player, params?.itemId, params?.quantity);
      case "take":
        return this.takeFromNPC(npc, player, params?.itemId, params?.quantity);
      case "follow":
        return this.setNPCFollow(npc, player, params?.follow);
      case "arrest":
        return this.arrestNPC(npc, player);
      default:
        return { success: false, message: "Action invalide." };
    }
  }

  /**
   * Parle à un PNJ.
   * @param npc - PNJ.
   * @param player - État du joueur.
   * @returns Résultat de la conversation.
   */
  private talkToNPC(npc: ExtendedNPC, player: PlayerWorldState): { success: boolean; message: string; data?: any } {
    // Si le PNJ a un dialogue, utiliser une réplique aléatoire
    if (npc.dialogue?.greetings?.length) {
      const greeting = npc.dialogue.greetings[Math.floor(Math.random() * npc.dialogue.greetings.length)];
      return {
        success: true,
        message: `${npc.name}: ${greeting}`,
        data: {
          npcId: npc.id,
          npcName: npc.name,
          npcMood: npc.mood,
          dialogueOptions: this.getDialogueOptions(npc, player),
        },
      };
    }

    // Réponse par défaut
    return {
      success: true,
      message: `${npc.name}: Bonjour ! Comment puis-je vous aider ?`,
      data: {
        npcId: npc.id,
        npcName: npc.name,
        npcMood: npc.mood,
        dialogueOptions: this.getDialogueOptions(npc, player),
      },
    };
  }

  /**
   * Récupère les options de dialogue avec un PNJ.
   * @param npc - PNJ.
   * @param player - État du joueur.
   * @returns Options de dialogue.
   */
  private getDialogueOptions(npc: ExtendedNPC, player: PlayerWorldState): Array<{ text: string; action: string; params?: any }> {
    const options: Array<{ text: string; action: string; params?: any }> = [];

    // Option pour demander de l'aide
    options.push({
      text: "Avez-vous besoin d'aide ?",
      action: "talk",
      params: { topic: "help" },
    });

    // Option pour échanger
    if (npc.type === "commercant" || npc.profession?.includes("marchand")) {
      options.push({
        text: "Je voudrais échanger.",
        action: "trade",
      });
    }

    // Option pour donner un objet
    if (Object.keys(player.inventory).length > 0) {
      options.push({
        text: "Je voudrais vous donner quelque chose.",
        action: "give",
      });
    }

    // Option pour les quêtes
    if (npc.quests?.length) {
      options.push({
        text: "Avez-vous des quêtes pour moi ?",
        action: "quests",
      });
    }

    // Option pour les PNJ en détresse
    if (npc.mood === "apeuré" || npc.mood === "fâché") {
      options.push({
        text: "Que se passe-t-il ?",
        action: "talk",
        params: { topic: "problem" },
      });
    }

    // Option pour les PNJ heureux
    if (npc.mood === "heureux" || npc.mood === "content") {
      options.push({
        text: "Pourquoi êtes-vous si joyeux ?",
        action: "talk",
        params: { topic: "happy" },
      });
    }

    return options;
  }

  /**
   * Échange avec un PNJ.
   * @param npc - PNJ.
   * @param player - État du joueur.
   * @param items - Items à échanger.
   * @returns Résultat de l'échange.
   */
  private tradeWithNPC(
    npc: ExtendedNPC,
    player: PlayerWorldState,
    items?: string[]
  ): { success: boolean; message: string; data?: any } {
    // Vérifier si le PNJ est un commerçant
    if (npc.type !== "commercant" && !npc.profession?.includes("marchand")) {
      return {
        success: false,
        message: `${npc.name}: Je ne suis pas commerçant, désolé.`,
      };
    }

    // Trouver le marché le plus proche
    const nearestMarket = this.getNearestMarket(npc.position.x, npc.position.z);
    if (!nearestMarket) {
      return {
        success: false,
        message: `${npc.name}: Je n'ai rien à vendre pour le moment.`,
      };
    }

    // Récupérer les items disponibles
    const vendor = nearestMarket.vendors.find((v) => v.id === npc.id);
    if (!vendor) {
      return {
        success: false,
        message: `${npc.name}: Je n'ai pas de stock pour le moment.`,
      };
    }

    // Si des items sont spécifiés, essayer d'acheter
    if (items?.length) {
      const results: Array<{ itemId: string; success: boolean; message: string }> = [];
      let totalCost = 0;

      for (const itemId of items) {
        const item = vendor.items.find((i) => i.id === itemId);
        if (!item) {
          results.push({ itemId, success: false, message: "Item introuvable." });
          continue;
        }

        if (item.quantity <= 0) {
          results.push({ itemId, success: false, message: "Item en rupture de stock." });
          continue;
        }

        if (player.money < item.price) {
          results.push({ itemId, success: false, message: "Vous n'avez pas assez d'argent." });
          continue;
        }

        // Achat réussi
        totalCost += item.price;
        item.quantity--;
        player.money -= item.price;
        player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;

        results.push({ itemId, success: true, message: `Achat de ${item.name} pour ${item.price} $.` });
      }

      return {
        success: true,
        message: `Échange terminé. Coût total: ${totalCost} $.`,
        data: { results, remainingMoney: player.money },
      };
    }

    // Sinon, afficher les items disponibles
    return {
      success: true,
      message: `${npc.name}: Voici ce que j'ai à vendre :`,
      data: {
        vendorId: vendor.id,
        vendorName: vendor.name,
        items: vendor.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    };
  }

  /**
   * Donne un objet à un PNJ.
   * @param npc - PNJ.
   * @param player - État du joueur.
   * @param itemId - ID de l'objet.
   * @param quantity - Quantité.
   * @returns Résultat du don.
   */
  private giveToNPC(
    npc: ExtendedNPC,
    player: PlayerWorldState,
    itemId?: string,
    quantity: number = 1
  ): { success: boolean; message: string; data?: any } {
    if (!itemId) {
      return {
        success: false,
        message: "Quel objet souhaitez-vous donner ?",
        data: {
          inventory: Object.entries(player.inventory).map(([id, qty]) => ({
            id,
            quantity: qty,
          })),
        },
      };
    }

    // Vérifier si le joueur possède l'objet
    if (!player.inventory[itemId] || player.inventory[itemId] < quantity) {
      return { success: false, message: "Vous ne possédez pas cet objet." };
    }

    // Donner l'objet au PNJ
    player.inventory[itemId] -= quantity;
    if (player.inventory[itemId] <= 0) {
      delete player.inventory[itemId];
    }

    // Mettre à jour l'inventaire du PNJ
    npc.inventory[itemId] = (npc.inventory[itemId] || 0) + quantity;

    // Réaction du PNJ
    const reactions = [
      `${npc.name}: Merci beaucoup !`,
      `${npc.name}: C'est très généreux de votre part.`,
      `${npc.name}: Oh, merci ! J'en avais besoin.`,
    ];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];

    // Améliorer la relation avec le PNJ
    npc.relationships = npc.relationships || {};
    npc.relationships["player"] = Math.min(100, (npc.relationships["player"] || 0) + 5);

    return {
      success: true,
      message: reaction,
      data: { newInventory: player.inventory },
    };
  }

  /**
   * Prend un objet à un PNJ.
   * @param npc - PNJ.
   * @param player - État du joueur.
   * @param itemId - ID de l'objet.
   * @param quantity - Quantité.
   * @returns Résultat de la prise.
   */
  private takeFromNPC(
    npc: ExtendedNPC,
    player: PlayerWorldState,
    itemId?: string,
    quantity: number = 1
  ): { success: boolean; message: string; data?: any } {
    if (!itemId) {
      return {
        success: false,
        message: "Quel objet souhaitez-vous prendre ?",
        data: {
          inventory: Object.entries(npc.inventory || {}).map(([id, qty]) => ({
            id,
            quantity: qty,
          })),
        },
      };
    }

    // Vérifier si le PNJ possède l'objet
    if (!npc.inventory || !npc.inventory[itemId] || npc.inventory[itemId] < quantity) {
      return { success: false, message: `${npc.name}: Je n'ai pas cet objet.` };
    }

    // Vérifier si le PNJ accepte de donner l'objet
    if (npc.relationships?.["player"] === undefined || npc.relationships["player"] < 30) {
      return { success: false, message: `${npc.name}: Je ne vous connais pas assez pour vous donner ça.` };
    }

    // Prendre l'objet
    npc.inventory[itemId] -= quantity;
    if (npc.inventory[itemId] <= 0) {
      delete npc.inventory[itemId];
    }

    player.inventory[itemId] = (player.inventory[itemId] || 0) + quantity;

    // Réaction du PNJ
    const reactions = [
      `${npc.name}: Voici, prenez-en soin.`,
      `${npc.name}: J'espère que ça vous sera utile.`,
      `${npc.name}: Avec plaisir !`,
    ];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];

    return {
      success: true,
      message: reaction,
      data: { newInventory: player.inventory },
    };
  }

  /**
   * Définit si un PNJ doit suivre le joueur.
   * @param npc - PNJ.
   * @param player - État du joueur.
   * @param follow - Si `true`, le PNJ suivra le joueur.
   * @returns Résultat de l'opération.
   */
  private setNPCFollow(
    npc: ExtendedNPC,
    player: PlayerWorldState,
    follow: boolean
  ): { success: boolean; message: string } {
    if (follow) {
      // Vérifier si le PNJ accepte de suivre
      if (npc.relationships?.["player"] === undefined || npc.relationships["player"] < 20) {
        return {
          success: false,
          message: `${npc.name}: Je ne vous fais pas assez confiance pour vous suivre.`,
        };
      }

      // Vérifier si le PNJ a le temps
      if (npc.currentActivity === "work" || npc.currentActivity === "sleep") {
        return {
          success: false,
          message: `${npc.name}: Je suis occupé pour le moment, revenez plus tard.`,
        };
      }

      npc.currentActivity = "follow";
      npc.targetPosition = { x: player.position?.x || 0, z: player.position?.z || 0 };
      return {
        success: true,
        message: `${npc.name}: Je vous suis !`,
      };
    } else {
      npc.currentActivity = undefined;
      npc.targetPosition = undefined;
      return {
        success: true,
        message: `${npc.name}: Je reste ici.`,
      };
    }
  }

  /**
   * Arrête un PNJ (pour la police).
   * @param npc - PNJ à arrêter.
   * @param player - État du joueur.
   * @returns Résultat de l'arrestation.
   */
  private arrestNPC(npc: ExtendedNPC, player: PlayerWorldState): { success: boolean; message: string } {
    // Vérifier si le joueur est policier
    const playerNPC = this.getNPCById("player");
    if (!playerNPC || playerNPC.faction !== "police") {
      return {
        success: false,
        message: "Vous n'êtes pas policier, vous ne pouvez pas arrêter ce PNJ.",
      };
    }

    // Vérifier si le PNJ est un criminel
    if (!npc.isWanted) {
      return {
        success: false,
        message: `${npc.name}: Ce citoyen n'est pas recherché.`,
      };
    }

    // Effectuer l'arrestation
    npc.isArrested = true;
    npc.arrestReason = "Arrêté par le joueur";
    npc.arrestDuration = 24; // 24 heures d'arrestation
    npc.currentActivity = "sleep"; // En prison

    // Ajouter à la liste des crimes résolus
    this.worldState!.justiceSystem.crimes.push({
      id: `crime_${Date.now()}`,
      type: "arrestation",
      severity: "modere",
      location: { x: npc.position.x, z: npc.position.z },
      time: this.worldState!.currentDay * 24 + this.worldState!.currentTime,
      perpetrator: npc.id,
      victim: undefined,
      witnesses: ["player"],
      reported: true,
      investigated: true,
      solved: true,
      punishment: "24 heures de prison",
      fine: 100,
      jailTime: 24,
      reward: 50,
    });

    // Récompenser le joueur
    player.money += 50;
    player.reputation.police = Math.min(100, (player.reputation.police || 0) + 5);

    return {
      success: true,
      message: `${npc.name}: Vous êtes en état d'arrestation !`,
    };
  }

  // ============================================================================
  // 👤 SYSTÈME DU JOUEUR
  // ============================================================================

  /**
   * Récupère l'état du joueur.
   * @returns État du joueur.
   */
  getPlayer(): PlayerWorldState {
    return this.worldState?.player || {
      money: 0,
      experience: 0,
      level: 1,
      reputation: {},
      skills: {},
      inventory: {},
      equipped: {},
      ownedBuildings: [],
      ownedVehicles: [],
      activeQuests: [],
      completedQuests: [],
      discoveredAreas: {},
      playTime: 0,
      lastSave: Date.now(),
    };
  }

  /**
   * Met à jour l'argent du joueur.
   * @param amount - Montant à ajouter (peut être négatif).
   * @returns Nouveau montant d'argent.
   */
  updatePlayerMoney(amount: number): number {
    const player = this.getPlayer();
    player.money = Math.max(0, player.money + amount);
    return player.money;
  }

  /**
   * Met à jour l'expérience du joueur.
   * @param amount - Quantité d'expérience à ajouter.
   * @returns Nouveau niveau et expérience.
   */
  updatePlayerExperience(amount: number): { level: number; experience: number } {
    const player = this.getPlayer();
    player.experience += amount;

    // Vérifier si le joueur monte de niveau
    const experienceThresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];
    let newLevel = player.level;

    for (let i = newLevel; i < experienceThresholds.length; i++) {
      if (player.experience >= experienceThresholds[i]) {
        newLevel = i + 1;
      } else {
        break;
      }
    }

    if (newLevel > player.level) {
      player.level = newLevel;
      // Récompenser le joueur pour avoir monté de niveau
      player.money += 100 * (newLevel - player.level + 1);
    }

    return { level: player.level, experience: player.experience };
  }

  /**
   * Ajoute un objet à l'inventaire du joueur.
   * @param itemId - ID de l'objet.
   * @param quantity - Quantité (par défaut 1).
   * @returns Nouvelle quantité de l'objet.
   */
  addToPlayerInventory(itemId: string, quantity: number = 1): number {
    const player = this.getPlayer();
    player.inventory[itemId] = (player.inventory[itemId] || 0) + quantity;
    return player.inventory[itemId];
  }

  /**
   * Retire un objet de l'inventaire du joueur.
   * @param itemId - ID de l'objet.
   * @param quantity - Quantité (par défaut 1).
   * @returns Nouvelle quantité de l'objet, ou `null` si l'objet n'existe pas.
   */
  removeFromPlayerInventory(itemId: string, quantity: number = 1): number | null {
    const player = this.getPlayer();
    if (!player.inventory[itemId] || player.inventory[itemId] < quantity) {
      return null;
    }

    player.inventory[itemId] -= quantity;
    if (player.inventory[itemId] <= 0) {
      delete player.inventory[itemId];
    }

    return player.inventory[itemId] || 0;
  }

  /**
   * Équippe un objet.
   * @param slot - Emplacement ("tool", "weapon", "vehicle").
   * @param itemId - ID de l'objet.
   * @returns `true` si l'équipement a réussi.
   */
  equipItem(slot: "tool" | "weapon" | "vehicle", itemId: string): boolean {
    const player = this.getPlayer();

    // Vérifier si le joueur possède l'objet
    if (!player.inventory[itemId] || player.inventory[itemId] <= 0) {
      return false;
    }

    // Équiper l'objet
    player.equipped[slot] = itemId;
    return true;
  }

  /**
   * Déséquipe un objet.
   * @param slot - Emplacement ("tool", "weapon", "vehicle").
   * @returns `true` si le déséquipement a réussi.
   */
  unequipItem(slot: "tool" | "weapon" | "vehicle"): boolean {
    const player = this.getPlayer();
    player.equipped[slot] = undefined;
    return true;
  }

  /**
   * Améliore une compétence du joueur.
   * @param skill - Compétence à améliorer.
   * @param amount - Quantité à ajouter.
   * @returns Nouveau niveau de la compétence.
   */
  improvePlayerSkill(skill: string, amount: number = 1): number {
    const player = this.getPlayer();
    player.skills[skill] = Math.min(100, (player.skills[skill] || 0) + amount);
    return player.skills[skill];
  }

  // ============================================================================
  // 🎯 SYSTÈME DE QUÊTES
  // ============================================================================

  /**
   * Récupère toutes les quêtes disponibles.
   * @returns Liste des quêtes.
   */
  getAllQuests(): WorldQuest[] {
    return this.worldState?.quests || [];
  }

  /**
   * Récupère une quête par son ID.
   * @param questId - ID de la quête.
   * @returns Quête ou `undefined`.
   */
  getQuestById(questId: string): WorldQuest | undefined {
    return this.worldState?.quests.find((quest) => quest.id === questId);
  }

  /**
   * Récupère les quêtes actives du joueur.
   * @returns Liste des quêtes actives.
   */
  getPlayerActiveQuests(): WorldQuest[] {
    const player = this.getPlayer();
    return this.getAllQuests().filter((quest) =>
      player.activeQuests.includes(quest.id) &&
      !quest.isCompleted &&
      !quest.isFailed
    );
  }

  /**
   * Récupère les quêtes complétées du joueur.
   * @returns Liste des quêtes complétées.
   */
  getPlayerCompletedQuests(): WorldQuest[] {
    const player = this.getPlayer();
    return this.getAllQuests().filter((quest) =>
      player.completedQuests.includes(quest.id) || quest.isCompleted
    );
  }

  /**
   * Active une quête pour le joueur.
   * @param questId - ID de la quête.
   * @returns `true` si l'activation a réussi.
   */
  activateQuest(questId: string): boolean {
    const quest = this.getQuestById(questId);
    if (!quest) return false;

    const player = this.getPlayer();

    // Vérifier les prérequis
    if (quest.prerequisites) {
      // Vérifier les quêtes requises
      if (quest.prerequisites.quests) {
        for (const requiredQuestId of quest.prerequisites.quests) {
          if (!player.completedQuests.includes(requiredQuestId)) {
            return false;
          }
        }
      }

      // Vérifier les niveaux de réputation
      if (quest.prerequisites.reputation) {
        for (const [faction, requiredLevel] of Object.entries(quest.prerequisites.reputation)) {
          if ((player.reputation[faction as FactionType] || 0) < requiredLevel) {
            return false;
          }
        }
      }

      // Vérifier les objets requis
      if (quest.prerequisites.items) {
        for (const itemId of quest.prerequisites.items) {
          if (!player.inventory[itemId] || player.inventory[itemId] <= 0) {
            return false;
          }
        }
      }

      // Vérifier le niveau du joueur
      if (quest.prerequisites.level && player.level < quest.prerequisites.level) {
        return false;
      }
    }

    // Activer la quête
    if (!player.activeQuests.includes(questId)) {
      player.activeQuests.push(questId);
    }
    quest.isActive = true;

    return true;
  }

  /**
   * Met à jour la progression d'une quête.
   * @param questId - ID de la quête.
   * @param objectiveIndex - Index de l'objectif.
   * @param progress - Progression à ajouter.
   * @returns `true` si la mise à jour a réussi.
   */
  updateQuestProgress(
    questId: string,
    objectiveIndex: number,
    progress: number = 1
  ): boolean {
    const quest = this.getQuestById(questId);
    if (!quest || !quest.isActive) return false;

    const objective = quest.objectives[objectiveIndex];
    if (!objective) return false;

    objective.current = (objective.current || 0) + progress;

    // Vérifier si l'objectif est complet
    if (objective.current >= (objective.count || 1)) {
      // Vérifier si tous les objectifs sont complets
      const allObjectivesCompleted = quest.objectives.every(
        (obj) => obj.current >= (obj.count || 1)
      );

      if (allObjectivesCompleted) {
        quest.isCompleted = true;
        // Appliquer les récompenses
        this.applyQuestRewards(quest);
      }
    }

    return true;
  }

  /**
   * Applique les récompenses d'une quête complétée.
   * @param quest - Quête complétée.
   */
  private applyQuestRewards(quest: WorldQuest): void {
    const player = this.getPlayer();

    // Ajouter l'argent
    if (quest.rewards.money) {
      player.money += quest.rewards.money;
    }

    // Ajouter l'expérience
    if (quest.rewards.experience) {
      this.updatePlayerExperience(quest.rewards.experience);
    }

    // Ajouter la réputation
    if (quest.rewards.reputation) {
      for (const [faction, change] of Object.entries(quest.rewards.reputation)) {
        player.reputation[faction as FactionType] = Math.min(
          100,
          Math.max(-100, (player.reputation[faction as FactionType] || 0) + change)
        );
      }
    }

    // Ajouter les items
    if (quest.rewards.items) {
      for (const itemId of quest.rewards.items) {
        this.addToPlayerInventory(itemId);
      }
    }

    // Ajouter la quête aux quêtes complétées
    if (!player.completedQuests.includes(quest.id)) {
      player.completedQuests.push(quest.id);
    }

    // Retirer la quête des quêtes actives
    player.activeQuests = player.activeQuests.filter((id) => id !== quest.id);
  }

  /**
   * Abandonne une quête.
   * @param questId - ID de la quête.
   * @returns `true` si l'abandon a réussi.
   */
  abandonQuest(questId: string): boolean {
    const quest = this.getQuestById(questId);
    if (!quest || !quest.isActive) return false;

    const player = this.getPlayer();

    // Marquer la quête comme échouée
    quest.isFailed = true;
    quest.isActive = false;

    // Retirer la quête des quêtes actives
    player.activeQuests = player.activeQuests.filter((id) => id !== questId);

    return true;
  }

  // ============================================================================
  // 🌲 SYSTÈME DE RESSOURCES ET RÉCOLTE
  // ============================================================================

  /**
   * Récupère toutes les ressources naturelles.
   * @returns Liste des ressources.
   */
  getAllNaturalResources(): NaturalResource[] {
    return this.world?.naturalResources || [];
  }

  /**
   * Récupère une ressource par son ID.
   * @param resourceId - ID de la ressource.
   * @returns Ressource ou `undefined`.
   */
  getNaturalResourceById(resourceId: string): NaturalResource | undefined {
    return this.world?.naturalResources.find((r) => r.id === resourceId);
  }

  /**
   * Récupère les ressources d'un type spécifique.
   * @param type - Type de ressource.
   * @returns Liste des ressources du type spécifié.
   */
  getNaturalResourcesByType(type: ResourceType): NaturalResource[] {
    return this.getAllNaturalResources().filter((r) => r.type === type);
  }

  /**
   * Récolte une ressource.
   * @param resourceId - ID de la ressource.
   * @param quantity - Quantité à récolter.
   * @returns Résultat de la récolte.
   */
  harvestResource(resourceId: string, quantity: number = 1): { success: boolean; message: string; harvested?: number } {
    const resource = this.getNaturalResourceById(resourceId);
    if (!resource) {
      return { success: false, message: "Ressource introuvable." };
    }

    const player = this.getPlayer();

    // Vérifier si la ressource est épuisée
    if (resource.isExhausted) {
      return { success: false, message: "Cette ressource est épuisée." };
    }

    // Vérifier si le joueur a l'outil requis
    if (resource.requiredTool) {
      const equippedTool = player.equipped.tool;
      if (!equippedTool || equippedTool !== resource.requiredTool) {
        return {
          success: false,
          message: `Vous avez besoin d'un ${resource.requiredTool} pour récolter cette ressource.`,
        };
      }
    }

    // Vérifier si le joueur a la compétence requise
    if (resource.requiredSkill) {
      const skillLevel = player.skills[resource.requiredSkill] || 0;
      if (skillLevel < (resource.minSkillLevel || 0)) {
        return {
          success: false,
          message: `Vous avez besoin d'un niveau de ${resource.requiredSkill} plus élevé (niveau ${resource.minSkillLevel} requis).`,
        };
      }
    }

    // Calculer la quantité réelle récoltée (selon la compétence)
    const skill = resource.requiredSkill ? player.skills[resource.requiredSkill] || 0 : 50;
    const harvestEfficiency = 0.5 + (skill / 100) * 0.5; // 50% à 100% d'efficacité
    const actualHarvested = Math.min(
      quantity,
      resource.quantity,
      Math.floor(quantity * harvestEfficiency)
    );

    // Mettre à jour la ressource
    resource.quantity -= actualHarvested;
    resource.lastHarvested = this.worldState!.currentDay;

    if (resource.quantity <= 0) {
      resource.isExhausted = true;
    }

    // Ajouter les ressources au joueur
    this.addToPlayerInventory(resourceId, actualHarvested);

    // Améliorer la compétence du joueur
    if (resource.requiredSkill) {
      this.improvePlayerSkill(resource.requiredSkill, 0.5);
    }

    return {
      success: true,
      message: `Vous avez récolté ${actualHarvested} ${resource.name}.`,
      harvested: actualHarvested,
    };
  }

  /**
   * Récupère toutes les zones de récolte.
   * @returns Liste des zones de récolte.
   */
  getAllHarvestZones(): HarvestZone[] {
    return this.world?.harvestZones || [];
  }

  /**
   * Récupère une zone de récolte par son ID.
   * @param zoneId - ID de la zone.
   * @returns Zone de récolte ou `undefined`.
   */
  getHarvestZoneById(zoneId: string): HarvestZone | undefined {
    return this.world?.harvestZones.find((z) => z.id === zoneId);
  }

  /**
   * Récupère les ressources dans une zone de récolte.
   * @param zoneId - ID de la zone.
   * @returns Liste des ressources dans la zone.
   */
  getResourcesInHarvestZone(zoneId: string): NaturalResource[] {
    const zone = this.getHarvestZoneById(zoneId);
    if (!zone) return [];

    return this.getAllNaturalResources().filter((resource) =>
      Math.hypot(resource.x - zone.x, resource.z - zone.z) <= zone.radius
    );
  }

  // ============================================================================
  // 🛒 SYSTÈME DE MARCHÉS ET COMMERCE
  // ============================================================================

  /**
   * Récupère tous les marchés.
   * @returns Liste des marchés.
   */
  getAllMarkets(): Market[] {
    return this.world?.markets || [];
  }

  /**
   * Récupère un marché par son ID.
   * @param marketId - ID du marché.
   * @returns Marché ou `undefined`.
   */
  getMarketById(marketId: string): Market | undefined {
    return this.world?.markets.find((m) => m.id === marketId);
  }

  /**
   * Récupère le marché le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 100).
   * @returns Marché le plus proche ou `null`.
   */
  getNearestMarket(x: number, z: number, maxDistance: number = 100): Market | null {
    let nearestMarket: Market | null = null;
    let minDistance = maxDistance;

    for (const market of this.getAllMarkets()) {
      const distance = Math.hypot(market.x - x, market.z - z);
      if (distance < minDistance) {
        minDistance = distance;
        nearestMarket = market;
      }
    }

    return nearestMarket;
  }

  /**
   * Récupère les vendeurs d'un marché.
   * @param marketId - ID du marché.
   * @returns Liste des vendeurs.
   */
  getMarketVendors(marketId: string): Market["vendors"] {
    const market = this.getMarketById(marketId);
    return market?.vendors || [];
  }

  /**
   * Récupère un vendeur par son ID.
   * @param vendorId - ID du vendeur.
   * @returns Vendeur ou `undefined`.
   */
  getVendorById(vendorId: string): Market["vendors"][number] | undefined {
    for (const market of this.getAllMarkets()) {
      const vendor = market.vendors.find((v) => v.id === vendorId);
      if (vendor) return vendor;
    }
    return undefined;
  }

  /**
   * Achete un item à un vendeur.
   * @param vendorId - ID du vendeur.
   * @param itemId - ID de l'item.
   * @param quantity - Quantité (par défaut 1).
   * @returns Résultat de l'achat.
   */
  buyFromVendor(
    vendorId: string,
    itemId: string,
    quantity: number = 1
  ): { success: boolean; message: string; totalCost?: number } {
    const vendor = this.getVendorById(vendorId);
    if (!vendor) {
      return { success: false, message: "Vendeur introuvable." };
    }

    const item = vendor.items.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, message: "Item introuvable chez ce vendeur." };
    }

    if (item.quantity < quantity) {
      return {
        success: false,
        message: `Seulement ${item.quantity} ${item.name} disponible(s).`,
      };
    }

    const player = this.getPlayer();
    const totalCost = item.price * quantity;

    if (player.money < totalCost) {
      return {
        success: false,
        message: `Vous n'avez pas assez d'argent. Coût total: ${totalCost} $.`,
      };
    }

    // Effectuer l'achat
    player.money -= totalCost;
    item.quantity -= quantity;
    this.addToPlayerInventory(itemId, quantity);

    return {
      success: true,
      message: `Achat de ${quantity} ${item.name} pour ${totalCost} $.`,
      totalCost,
    };
  }

  // ============================================================================
  // 🎪 SYSTÈME DE FESTIVALS ET ÉVÉNEMENTS
  // ============================================================================

  /**
   * Récupère tous les festivals.
   * @returns Liste des festivals.
   */
  getAllFestivals(): Festival[] {
    return this.world?.festivals || [];
  }

  /**
   * Récupère un festival par son ID.
   * @param festivalId - ID du festival.
   * @returns Festival ou `undefined`.
   */
  getFestivalById(festivalId: string): Festival | undefined {
    return this.world?.festivals.find((f) => f.id === festivalId);
  }

  /**
   * Récupère les festivals actifs.
   * @returns Liste des festivals actifs.
   */
  getActiveFestivals(): Festival[] {
    return this.getAllFestivals().filter((f) => f.isActive);
  }

  /**
   * Participe à une activité de festival.
   * @param festivalId - ID du festival.
   * @param activityIndex - Index de l'activité.
   * @returns Résultat de la participation.
   */
  participateInFestivalActivity(
    festivalId: string,
    activityIndex: number
  ): { success: boolean; message: string; rewards?: any } {
    const festival = this.getFestivalById(festivalId);
    if (!festival || !festival.isActive) {
      return { success: false, message: "Festival introuvable ou inactif." };
    }

    const activity = festival.activities[activityIndex];
    if (!activity) {
      return { success: false, message: "Activité introuvable." };
    }

    const player = this.getPlayer();

    // Vérifier si l'activité est en cours
    const currentHour = this.worldState!.currentTime;
    if (currentHour < activity.startHour || currentHour >= activity.endHour) {
      return {
        success: false,
        message: `Cette activité n'est pas disponible pour le moment (${activity.startHour}h-${activity.endHour}h).`,
      };
    }

    // Participer à l'activité
    festival.attendance = Math.min(festival.maxAttendance, festival.attendance + 1);

    // Appliquer les récompenses
    if (activity.rewards) {
      for (const reward of activity.rewards) {
        if (reward.type === "money") {
          player.money += reward.value;
        } else if (reward.type === "reputation") {
          for (const [faction, change] of Object.entries(reward.value)) {
            player.reputation[faction as FactionType] = Math.min(
              100,
              Math.max(-100, (player.reputation[faction as FactionType] || 0) + change)
            );
          }
        } else if (reward.type === "item") {
          this.addToPlayerInventory(reward.value);
        }
      }
    }

    return {
      success: true,
      message: `Vous participez à l'activité "${activity.name}".`,
      rewards: activity.rewards,
    };
  }

  // ============================================================================
  // 🏞️ SYSTÈME DE FAUNE ET CHASSE/PÊCHE
  // ============================================================================

  /**
   * Récupère toutes les zones de pêche.
   * @returns Liste des zones de pêche.
   */
  getAllFishingSpots(): FishingSpot[] {
    return this.world?.fishingSpots || [];
  }

  /**
   * Récupère une zone de pêche par son ID.
   * @param spotId - ID de la zone.
   * @returns Zone de pêche ou `undefined`.
   */
  getFishingSpotById(spotId: string): FishingSpot | undefined {
    return this.world?.fishingSpots.find((s) => s.id === spotId);
  }

  /**
   * Récupère la zone de pêche la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 50).
   * @returns Zone de pêche la plus proche ou `null`.
   */
  getNearestFishingSpot(x: number, z: number, maxDistance: number = 50): FishingSpot | null {
    let nearestSpot: FishingSpot | null = null;
    let minDistance = maxDistance;

    for (const spot of this.getAllFishingSpots()) {
      const distance = Math.hypot(spot.x - x, spot.z - z);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSpot = spot;
      }
    }

    return nearestSpot;
  }

  /**
   * Pêche dans une zone de pêche.
   * @param spotId - ID de la zone.
   * @returns Résultat de la pêche.
   */
  fishAtSpot(spotId: string): { success: boolean; message: string; caught?: { type: string; size: number; value: number } } {
    const spot = this.getFishingSpotById(spotId);
    if (!spot) {
      return { success: false, message: "Zone de pêche introuvable." };
    }

    const player = this.getPlayer();

    // Vérifier si le joueur a l'outil requis
    if (spot.requiredTool) {
      const equippedTool = player.equipped.tool;
      if (!equippedTool || equippedTool !== spot.requiredTool) {
        return {
          success: false,
          message: `Vous avez besoin d'une ${spot.requiredTool} pour pêcher ici.`,
        };
      }
    }

    // Vérifier si le joueur a le permis requis
    if (spot.requiredLicense) {
      // Vérifier si le joueur a le permis de pêche
      if (!player.inventory["permis_peche"]) {
        return {
          success: false,
          message: "Vous avez besoin d'un permis de pêche pour pêcher ici.",
        };
      }
    }

    // Vérifier si la zone est active
    if (!spot.isActive) {
      return { success: false, message: "Cette zone de pêche est actuellement fermée." };
    }

    // Calculer la probabilité de capture
    const skill = player.skills.peche || 0;
    const luck = Math.random();
    const successProbability = spot.fishProbability * (0.5 + skill / 100);

    if (luck > successProbability) {
      return {
        success: false,
        message: "Rien n'a mordi à l'hameçon cette fois-ci.",
      };
    }

    // Sélectionner un type de poisson aléatoire
    const fishType = spot.fishTypes[Math.floor(Math.random() * spot.fishTypes.length)];
    const size = spot.minFishSize + Math.random() * (spot.maxFishSize - spot.minFishSize);
    const value = Math.floor(size * 10); // Valeur basée sur la taille

    // Ajouter le poisson à l'inventaire
    this.addToPlayerInventory(fishType, 1);

    // Améliorer la compétence de pêche
    this.improvePlayerSkill("peche", 0.3);

    // Mettre à jour la zone de pêche
    spot.lastFished = this.worldState!.currentDay;
    spot.fishStock = Math.max(0, spot.fishStock - 5);

    return {
      success: true,
      message: `Vous avez pêché un ${fishType} de ${size.toFixed(1)} kg !`,
      caught: { type: fishType, size, value },
    };
  }

  /**
   * Récupère toutes les zones de chasse.
   * @returns Liste des zones de chasse.
   */
  getAllHuntingZones(): HuntingZone[] {
    return this.world?.huntingZones || [];
  }

  /**
   * Récupère une zone de chasse par son ID.
   * @param zoneId - ID de la zone.
   * @returns Zone de chasse ou `undefined`.
   */
  getHuntingZoneById(zoneId: string): HuntingZone | undefined {
    return this.world?.huntingZones.find((z) => z.id === zoneId);
  }

  /**
   * Récupère la zone de chasse la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 100).
   * @returns Zone de chasse la plus proche ou `null`.
   */
  getNearestHuntingZone(x: number, z: number, maxDistance: number = 100): HuntingZone | null {
    let nearestZone: HuntingZone | null = null;
    let minDistance = maxDistance;

    for (const zone of this.getAllHuntingZones()) {
      const distance = Math.hypot(zone.x - x, zone.z - z);
      if (distance < minDistance) {
        minDistance = distance;
        nearestZone = zone;
      }
    }

    return nearestZone;
  }

  /**
   * Chasse dans une zone de chasse.
   * @param zoneId - ID de la zone.
   * @returns Résultat de la chasse.
   */
  huntInZone(zoneId: string): { success: boolean; message: string; caught?: { type: string; value: number } } {
    const zone = this.getHuntingZoneById(zoneId);
    if (!zone) {
      return { success: false, message: "Zone de chasse introuvable." };
    }

    const player = this.getPlayer();

    // Vérifier si le joueur a l'outil requis
    if (zone.requiredTool) {
      const equippedTool = player.equipped.weapon;
      if (!equippedTool || equippedTool !== zone.requiredTool) {
        return {
          success: false,
          message: `Vous avez besoin d'un ${zone.requiredTool} pour chasser ici.`,
        };
      }
    }

    // Vérifier si le joueur a le permis requis
    if (zone.requiredLicense) {
      // Vérifier si le joueur a le permis de chasse
      if (!player.inventory["permis_chasse"]) {
        return {
          success: false,
          message: "Vous avez besoin d'un permis de chasse pour chasser ici.",
        };
      }
    }

    // Vérifier si la zone est active
    if (!zone.isActive) {
      return { success: false, message: "Cette zone de chasse est actuellement fermée." };
    }

    // Vérifier si la saison est appropriée
    if (zone.season && !zone.season.includes(this.worldState!.season)) {
      return {
        success: false,
        message: `La chasse n'est pas autorisée en ${this.worldState!.season}.`,
      };
    }

    // Calculer la probabilité de chasse réussie
    const skill = player.skills.chasse || 0;
    const luck = Math.random();
    const successProbability = zone.huntProbability * (0.5 + skill / 100);

    if (luck > successProbability) {
      return {
        success: false,
        message: "La chasse n'a rien donné cette fois-ci.",
      };
    }

    // Sélectionner un type d'animal aléatoire
    const animalType = zone.animalTypes[Math.floor(Math.random() * zone.animalTypes.length)];
    const value = Math.floor(Math.random() * 50) + 20; // Valeur aléatoire

    // Ajouter l'animal à l'inventaire
    this.addToPlayerInventory(animalType, 1);

    // Améliorer la compétence de chasse
    this.improvePlayerSkill("chasse", 0.4);

    // Mettre à jour la zone de chasse
    zone.lastHunted = this.worldState!.currentDay;
    zone.animalStock = Math.max(0, zone.animalStock - 10);

    return {
      success: true,
      message: `Vous avez chassé un ${animalType} !`,
      caught: { type: animalType, value },
    };
  }

  // ============================================================================
  // 🔥 SYSTÈME DE FEUX DE CAMP
  // ============================================================================

  /**
   * Récupère tous les feux de camp.
   * @returns Liste des feux de camp.
   */
  getAllCampfires(): Campfire[] {
    return this.world?.campfires || [];
  }

  /**
   * Récupère un feu de camp par son ID.
   * @param campfireId - ID du feu de camp.
   * @returns Feu de camp ou `undefined`.
   */
  getCampfireById(campfireId: string): Campfire | undefined {
    return this.world?.campfires.find((c) => c.id === campfireId);
  }

  /**
   * Récupère le feu de camp le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 30).
   * @returns Feu de camp le plus proche ou `null`.
   */
  getNearestCampfire(x: number, z: number, maxDistance: number = 30): Campfire | null {
    let nearestCampfire: Campfire | null = null;
    let minDistance = maxDistance;

    for (const campfire of this.getAllCampfires()) {
      const distance = Math.hypot(campfire.x - x, campfire.z - z);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCampfire = campfire;
      }
    }

    return nearestCampfire;
  }

  /**
   * Allume ou éteint un feu de camp.
   * @param campfireId - ID du feu de camp.
   * @param lit - Si `true`, allume le feu ; sinon, l'éteint.
   * @returns Résultat de l'opération.
   */
  toggleCampfire(campfireId: string, lit: boolean): { success: boolean; message: string } {
    const campfire = this.getCampfireById(campfireId);
    if (!campfire) {
      return { success: false, message: "Feu de camp introuvable." };
    }

    const player = this.getPlayer();

    if (lit) {
      // Vérifier si le feu est déjà allumé
      if (campfire.isLit) {
        return { success: false, message: "Ce feu est déjà allumé." };
      }

      // Vérifier si le joueur a du carburant
      if (!player.inventory["bois"] || player.inventory["bois"] < 1) {
        return {
          success: false,
          message: "Vous avez besoin de bois pour allumer le feu.",
        };
      }

      // Allumer le feu
      campfire.isLit = true;
      campfire.fuel = campfire.maxFuel;
      this.removeFromPlayerInventory("bois", 1);

      return {
        success: true,
        message: "Vous avez allumé le feu de camp.",
      };
    } else {
      // Éteindre le feu
      campfire.isLit = false;

      return {
        success: true,
        message: "Vous avez éteint le feu de camp.",
      };
    }
  }

  /**
   * Ajoute du carburant à un feu de camp.
   * @param campfireId - ID du feu de camp.
   * @param quantity - Quantité de carburant à ajouter.
   * @returns Résultat de l'opération.
   */
  addFuelToCampfire(campfireId: string, quantity: number = 1): { success: boolean; message: string; newFuel: number } {
    const campfire = this.getCampfireById(campfireId);
    if (!campfire) {
      return { success: false, message: "Feu de camp introuvable.", newFuel: 0 };
    }

    const player = this.getPlayer();

    // Vérifier si le joueur a assez de bois
    if (!player.inventory["bois"] || player.inventory["bois"] < quantity) {
      return {
        success: false,
        message: "Vous n'avez pas assez de bois.",
        newFuel: campfire.fuel,
      };
    }

    // Ajouter le carburant
    campfire.fuel = Math.min(campfire.maxFuel, campfire.fuel + quantity * 10);
    this.removeFromPlayerInventory("bois", quantity);

    return {
      success: true,
      message: `Vous avez ajouté ${quantity} bois au feu.`,
      newFuel: campfire.fuel,
    };
  }

  // ============================================================================
  // 🚗 SYSTÈME DE VÉHICULES ET TRAFIC
  // ============================================================================

  /**
   * Récupère tout le trafic.
   * @returns Liste des véhicules en circulation.
   */
  getAllTraffic(): ExtendedTrafficVehicle[] {
    return this.world?.traffic || [];
  }

  /**
   * Récupère un véhicule par son ID.
   * @param vehicleId - ID du véhicule.
   * @returns Véhicule ou `undefined`.
   */
  getVehicleById(vehicleId: string): ExtendedTrafficVehicle | undefined {
    return this.world?.traffic.find((v) => v.id === vehicleId);
  }

  /**
   * Récupère les véhicules d'un type spécifique.
   * @param type - Type de véhicule.
   * @returns Liste des véhicules du type spécifié.
   */
  getVehiclesByType(type: ExtendedTrafficVehicle["type"]): ExtendedTrafficVehicle[] {
    return this.getAllTraffic().filter((v) => v.type === type);
  }

  /**
   * Récupère les véhicules du joueur.
   * @returns Liste des véhicules du joueur.
   */
  getPlayerVehicles(): ExtendedTrafficVehicle[] {
    const player = this.getPlayer();
    return this.getAllTraffic().filter((v) =>
      player.ownedVehicles.includes(v.id) || v.owner === "player"
    );
  }

  /**
   * Achète un véhicule.
   * @param vehicleType - Type de véhicule.
   * @param model - Modèle du véhicule.
   * @param color - Couleur du véhicule.
   * @returns Résultat de l'achat.
   */
  buyVehicle(
    vehicleType: ExtendedTrafficVehicle["type"],
    model: string = "standard",
    color: number = 0xc0c0c0
  ): { success: boolean; message: string; vehicle?: ExtendedTrafficVehicle } {
    const player = this.getPlayer();

    // Définir le prix selon le type de véhicule
    const vehiclePrices: Record<ExtendedTrafficVehicle["type"], number> = {
      voiture: 5000,
      camion: 8000,
      pickup: 6000,
      tracteur: 4000,
      police: 10000,
      pompier: 12000,
      ambulance: 11000,
      depanneuse: 9000,
    };

    const price = vehiclePrices[vehicleType] || 5000;

    if (player.money < price) {
      return {
        success: false,
        message: `Vous n'avez pas assez d'argent pour acheter ce véhicule (prix: ${price} $).`,
      };
    }

    // Créer un nouveau véhicule
    const vehicleId = `vehicle_${vehicleType}_${Date.now()}`;
    const newVehicle: ExtendedTrafficVehicle = {
      id: vehicleId,
      type: vehicleType,
      mesh: new THREE.Group(),
      road: ROADS[0],
      roadId: ROADS[0].id,
      roadLen: 100,
      t: 0,
      dir: 1,
      speed: 0,
      targetSpeed: 20,
      offset: 0,
      length: vehicleType === "camion" ? 8.4 : vehicleType === "tracteur" ? 4.8 : 4.4,
      isPolice: vehicleType === "police",
      chasing: false,
      bars: [],
      lightbar: null,
      condition: "neuf",
      owner: "player",
      driver: "player",
      fuel: 100,
      maxFuel: 100,
      fuelConsumption: vehicleType === "camion" ? 0.2 : vehicleType === "tracteur" ? 0.15 : 0.1,
      durability: 100,
      maxDurability: 100,
      value: price,
      isStolen: false,
      isLocked: false,
      hasSiren: vehicleType === "police" || vehicleType === "pompier" || vehicleType === "ambulance",
      sirenActive: false,
      hasLights: vehicleType === "police" || vehicleType === "pompier" || vehicleType === "ambulance",
      lightsActive: false,
      cargo: {},
      maxCargo: vehicleType === "camion" ? 1000 : vehicleType === "pickup" ? 500 : 200,
      passengers: [],
      maxPassengers: vehicleType === "camion" ? 3 : vehicleType === "pickup" ? 4 : 2,
      lastMaintenance: 0,
      maintenanceCost: vehicleType === "camion" ? 10 : vehicleType === "tracteur" ? 5 : 8,
      insuranceCost: vehicleType === "camion" ? 50 : vehicleType === "tracteur" ? 30 : 40,
      licensePlate: `QC ${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`,
      color,
      year: 2020,
      model,
      isEmergency: vehicleType === "police" || vehicleType === "pompier" || vehicleType === "ambulance",
      emergencyPriority: vehicleType === "police" ? 10 : vehicleType === "pompier" ? 8 : vehicleType === "ambulance" ? 9 : 0,
    };

    // Déduire l'argent du joueur
    player.money -= price;
    player.ownedVehicles.push(vehicleId);

    // Ajouter le véhicule au monde
    this.world?.traffic.push(newVehicle);

    return {
      success: true,
      message: `Vous avez acheté un ${vehicleType} ${model} pour ${price} $.`,
      vehicle: newVehicle,
    };
  }

  /**
   * Vend un véhicule.
   * @param vehicleId - ID du véhicule.
   * @returns Résultat de la vente.
   */
  sellVehicle(vehicleId: string): { success: boolean; message: string; salePrice: number } {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) {
      return { success: false, message: "Véhicule introuvable.", salePrice: 0 };
    }

    const player = this.getPlayer();

    // Vérifier si le véhicule appartient au joueur
    if (vehicle.owner !== "player" && !player.ownedVehicles.includes(vehicleId)) {
      return { success: false, message: "Ce véhicule ne vous appartient pas.", salePrice: 0 };
    }

    // Calculer le prix de vente (50% de la valeur)
    const salePrice = Math.floor(vehicle.value * 0.5);

    // Effectuer la vente
    player.money += salePrice;
    player.ownedVehicles = player.ownedVehicles.filter((id) => id !== vehicleId);

    // Supprimer le véhicule du monde
    this.world!.traffic = this.world!.traffic.filter((v) => v.id !== vehicleId);

    return {
      success: true,
      message: `Vous avez vendu votre véhicule pour ${salePrice} $.`,
      salePrice,
    };
  }

  /**
   * Répare un véhicule.
   * @param vehicleId - ID du véhicule.
   * @returns Résultat de la réparation.
   */
  repairVehicle(vehicleId: string): { success: boolean; message: string; repairCost: number } {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) {
      return { success: false, message: "Véhicule introuvable.", repairCost: 0 };
    }

    const player = this.getPlayer();

    // Vérifier si le véhicule appartient au joueur
    if (vehicle.owner !== "player" && !player.ownedVehicles.includes(vehicleId)) {
      return { success: false, message: "Ce véhicule ne vous appartient pas.", repairCost: 0 };
    }

    // Calculer le coût de réparation (selon l'état du véhicule)
    const repairCost = Math.floor(
      vehicle.value * 0.1 * (1 - vehicle.durability / vehicle.maxDurability)
    );

    if (player.money < repairCost) {
      return {
        success: false,
        message: `Vous n'avez pas assez d'argent pour réparer ce véhicule (coût: ${repairCost} $).`,
        repairCost,
      };
    }

    // Effectuer la réparation
    player.money -= repairCost;
    vehicle.durability = vehicle.maxDurability;
    vehicle.condition = "neuf";

    return {
      success: true,
      message: `Vous avez réparé votre véhicule pour ${repairCost} $.`,
      repairCost,
    };
  }

  /**
   * Fait le plein de carburant d'un véhicule.
   * @param vehicleId - ID du véhicule.
   * @param quantity - Quantité de carburant à ajouter (en litres).
   * @returns Résultat du ravitaillement.
   */
  refuelVehicle(vehicleId: string, quantity: number = 10): { success: boolean; message: string; newFuel: number } {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) {
      return { success: false, message: "Véhicule introuvable.", newFuel: 0 };
    }

    const player = this.getPlayer();

    // Vérifier si le véhicule appartient au joueur
    if (vehicle.owner !== "player" && !player.ownedVehicles.includes(vehicleId)) {
      return { success: false, message: "Ce véhicule ne vous appartient pas.", newFuel: vehicle.fuel };
    }

    // Vérifier si le joueur a assez d'essence
    if (!player.inventory["essence"] || player.inventory["essence"] < quantity) {
      return {
        success: false,
        message: "Vous n'avez pas assez d'essence.",
        newFuel: vehicle.fuel,
      };
    }

    // Calculer le carburant ajouté (1 litre = 1 unité de carburant)
    const fuelAdded = Math.min(vehicle.maxFuel - vehicle.fuel, quantity);
    vehicle.fuel += fuelAdded;
    this.removeFromPlayerInventory("essence", fuelAdded);

    return {
      success: true,
      message: `Vous avez ajouté ${fuelAdded} litres d'essence au véhicule.`,
      newFuel: vehicle.fuel,
    };
  }

  /**
   * Utilise un véhicule (le joueur entre dans le véhicule).
   * @param vehicleId - ID du véhicule.
   * @returns `true` si l'utilisation a réussi.
   */
  useVehicle(vehicleId: string): boolean {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) return false;

    const player = this.getPlayer();

    // Vérifier si le véhicule appartient au joueur ou est accessible
    if (vehicle.owner !== "player" &&
        !player.ownedVehicles.includes(vehicleId) &&
        !vehicle.isStolen) {
      return false;
    }

    // Vérifier si le véhicule a assez de carburant
    if (vehicle.fuel <= 0) {
      return false;
    }

    // Définir le véhicule actuel du joueur
    player.currentVehicle = vehicleId;
    vehicle.driver = "player";

    return true;
  }

  /**
   * Quitte un véhicule (le joueur sort du véhicule).
   * @returns `true` si l'opération a réussi.
   */
  exitVehicle(): boolean {
    const player = this.getPlayer();
    if (!player.currentVehicle) return false;

    const vehicle = this.getVehicleById(player.currentVehicle);
    if (!vehicle) return false;

    // Quitter le véhicule
    player.currentVehicle = undefined;
    vehicle.driver = undefined;

    return true;
  }

  // ============================================================================
  // 🏠 SYSTÈME DE MAISONS ET PROPRIÉTÉS
  // ============================================================================

  /**
   * Récupère toutes les maisons.
   * @returns Liste des maisons.
   */
  getAllHouses(): HouseLot[] {
    return this.world?.houses || [];
  }

  /**
   * Récupère une maison par son ID de deed.
   * @param deedId - ID du deed.
   * @returns Maison ou `undefined`.
   */
  getHouseByDeedId(deedId: string): HouseLot | undefined {
    return this.world?.houses.find((h) => h.deedId === deedId);
  }

  /**
   * Récupère la maison la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 50).
   * @returns Maison la plus proche ou `null`.
   */
  getNearestHouse(x: number, z: number, maxDistance: number = 50): HouseLot | null {
    let nearestHouse: HouseLot | null = null;
    let minDistance = maxDistance;

    for (const house of this.getAllHouses()) {
      const distance = Math.hypot(house.x - x, house.z - z);
      if (distance < minDistance) {
        minDistance = distance;
        nearestHouse = house;
      }
    }

    return nearestHouse;
  }

  /**
   * Achète une maison.
   * @param deedId - ID du deed.
   * @returns `true` si l'achat a réussi.
   */
  buyHouse(deedId: string): boolean {
    const house = this.getHouseByDeedId(deedId);
    if (!house) return false;

    const deed = this.world?.deeds.find((d) => d.id === deedId);
    if (!deed) return false;

    const player = this.getPlayer();

    // Vérifier si le joueur a assez d'argent
    if (player.money < deed.price) {
      return false;
    }

    // Effectuer l'achat
    player.money -= deed.price;
    player.ownedBuildings.push(deedId);

    // Mettre à jour l'état de la maison
    house.state = "owned";

    return true;
  }

  /**
   * Vend une maison.
   * @param deedId - ID du deed.
   * @returns `true` si la vente a réussi.
   */
  sellHouse(deedId: string): boolean {
    const house = this.getHouseByDeedId(deedId);
    if (!house) return false;

    const deed = this.world?.deeds.find((d) => d.id === deedId);
    if (!deed) return false;

    const player = this.getPlayer();

    // Vérifier si la maison appartient au joueur
    if (!player.ownedBuildings.includes(deedId)) {
      return false;
    }

    // Calculer le prix de vente (80% du prix d'achat)
    const salePrice = Math.floor(deed.price * 0.8);

    // Effectuer la vente
    player.money += salePrice;
    player.ownedBuildings = player.ownedBuildings.filter((id) => id !== deedId);

    // Mettre à jour l'état de la maison
    house.state = "for_sale";

    return true;
  }

  // ============================================================================
  // 💰 SYSTÈME ÉCONOMIQUE
  // ============================================================================

  /**
   * Récupère le système économique.
   * @returns Système économique.
   */
  getEconomySystem(): EconomySystem {
    return this.worldState?.economySystem || this.economySystem;
  }

  /**
   * Récupère le prix d'une ressource.
   * @param resourceId - ID de la ressource.
   * @returns Prix de la ressource ou `undefined`.
   */
  getResourcePrice(resourceId: string): number | undefined {
    return this.getEconomySystem().resources[resourceId]?.price;
  }

  /**
   * Met à jour le prix d'une ressource.
   * @param resourceId - ID de la ressource.
   * @param newPrice - Nouveau prix.
   * @returns `true` si la mise à jour a réussi.
   */
  updateResourcePrice(resourceId: string, newPrice: number): boolean {
    if (this.getEconomySystem().resources[resourceId]) {
      this.getEconomySystem().resources[resourceId].price = newPrice;
      return true;
    }
    return false;
  }

  /**
   * Récupère les taxes actuelles.
   * @returns Objet des taxes.
   */
  getTaxes(): EconomySystem["taxes"] {
    return this.getEconomySystem().taxes;
  }

  /**
   * Met à jour un taux de taxe.
   * @param taxType - Type de taxe ("incomeTax", "salesTax", "propertyTax", "businessTax").
   * @param newRate - Nouveau taux (0-1).
   * @returns `true` si la mise à jour a réussi.
   */
  updateTaxRate(taxType: keyof EconomySystem["taxes"], newRate: number): boolean {
    if (newRate >= 0 && newRate <= 1) {
      this.getEconomySystem().taxes[taxType] = newRate;
      return true;
    }
    return false;
  }

  // ============================================================================
  // ⚖️ SYSTÈME DE JUSTICE
  // ============================================================================

  /**
   * Récupère le système de justice.
   * @returns Système de justice.
   */
  getJusticeSystem(): JusticeSystem {
    return this.worldState?.justiceSystem || this.justiceSystem;
  }

  /**
   * Récupère tous les crimes.
   * @returns Liste des crimes.
   */
  getAllCrimes(): Crime[] {
    return this.getJusticeSystem().crimes;
  }

  /**
   * Récupère un crime par son ID.
   * @param crimeId - ID du crime.
   * @returns Crime ou `undefined`.
   */
  getCrimeById(crimeId: string): Crime | undefined {
    return this.getJusticeSystem().crimes.find((c) => c.id === crimeId);
  }

  /**
   * Signale un crime.
   * @param crime - Crime à signaler.
   * @returns `true` si le signalement a réussi.
   */
  reportCrime(crime: Omit<Crime, "id" | "reported" | "investigated" | "solved">): boolean {
    const crimeId = `crime_${Date.now()}`;
    const newCrime: Crime = {
      id: crimeId,
      reported: true,
      investigated: false,
      solved: false,
      ...crime,
    };

    this.getJusticeSystem().crimes.push(newCrime);
    return true;
  }

  /**
   * Récupère la liste des recherchés.
   * @returns Liste des recherchés.
   */
  getWantedList(): JusticeSystem["wantedList"] {
    return this.getJusticeSystem().wantedList;
  }

  /**
   * Ajoute un criminel à la liste des recherchés.
   * @param criminalId - ID du criminel.
   * @param crimeId - ID du crime.
   * @param severity - Gravité du crime.
   * @param reward - Récompense pour l'arrestation.
   * @returns `true` si l'ajout a réussi.
   */
  addToWantedList(
    criminalId: string,
    crimeId: string,
    severity: EventSeverity,
    reward: number
  ): boolean {
    const criminal = this.getNPCById(criminalId);
    if (!criminal) return false;

    const crime = this.getCrimeById(crimeId);
    if (!crime) return false;

    // Ajouter à la liste des recherchés
    this.getJusticeSystem().wantedList.push({
      id: criminalId,
      name: criminal.name,
      crimeId,
      severity,
      reward,
      lastSeen: {
        x: criminal.position.x,
        z: criminal.position.z,
        time: this.worldState!.currentDay * 24 + this.worldState!.currentTime,
      },
    });

    // Marquer le PNJ comme recherché
    criminal.isWanted = true;
    criminal.wantedLevel = severity === "mineur" ? 1 :
                           severity === "modere" ? 2 :
                           severity === "majeur" ? 3 :
                           severity === "catastrophique" ? 5 : 4;

    return true;
  }

  // ============================================================================
  // 🎯 FONCTIONS UTILITAIRES
  // ============================================================================

  /**
   * Récupère la porte la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 4.5).
   * @returns Porte la plus proche ou `null`.
   */
  getNearestDoor(x: number, z: number, maxDistance: number = 4.5): CityDoor | null {
    return this.world?.nearestDoor(x, z, maxDistance) || null;
  }

  /**
   * Récupère la boutique la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 8).
   * @returns Boutique la plus proche ou `null`.
   */
  getNearestShop(x: number, z: number, maxDistance: number = 8): ShopSpot | null {
    return this.world?.nearestShop(x, z, maxDistance) || null;
  }

  /**
   * Récupère le GAB (ATM) le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 4.5).
   * @returns GAB le plus proche ou `null`.
   */
  getNearestATM(x: number, z: number, maxDistance: number = 4.5): AtmSpot | null {
    return this.world?.nearestAtm(x, z, maxDistance) || null;
  }

  /**
   * Récupère la caisse populaire la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 9).
   * @returns Caisse populaire la plus proche ou `null`.
   */
  getNearestCaisse(x: number, z: number, maxDistance: number = 9):
    | { id: string; name: string; villageId: string; x: number; z: number; yaw: number; mesh: THREE.Group }
    | null {
    return this.world?.nearestCaisse(x, z, maxDistance) || null;
  }

  /**
   * Récupère la rue la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 3.6).
   * @param kind - Type de rue (optionnel).
   * @returns Rue la plus proche ou `null`.
   */
  getNearestStreet(
    x: number,
    z: number,
    maxDistance: number = 3.6,
    kind?: StreetSpot["kind"]
  ): StreetSpot | null {
    return this.world?.nearestStreet(x, z, maxDistance, kind) || null;
  }

  /**
   * Récupère l'entreprise du comté la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 9).
   * @returns Entreprise la plus proche ou `null`.
   */
  getNearestFirm(x: number, z: number, maxDistance: number = 9): CountyFirm | null {
    return this.world?.nearestCountyFirm(x, z, maxDistance) || null;
  }

  /**
   * Récupère le champ le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 14).
   * @returns Champ le plus proche ou `null`.
   */
  getNearestField(x: number, z: number, maxDistance: number = 14): FieldPlot | null {
    return this.world?.nearestField(x, z, maxDistance) || null;
  }

  /**
   * Récupère le troupeau le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 3.4).
   * @returns Troupeau le plus proche ou `null`.
   */
  getNearestHerd(x: number, z: number, maxDistance: number = 3.4): Stock | null {
    return this.world?.nearestStock(x, z, maxDistance) || null;
  }

  /**
   * Récupère le robinet d'érable le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 2.6).
   * @returns Robinet le plus proche ou `null`.
   */
  getNearestSugarTap(x: number, z: number, maxDistance: number = 2.6): SugarTap | null {
    return this.world?.nearestTap(x, z, maxDistance) || null;
  }

  /**
   * Récupère l'évaporateur le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 3.4).
   * @returns Évaporateur le plus proche ou `null`.
   */
  getNearestSugarEvap(x: number, z: number, maxDistance: number = 3.4): SugarEvap | null {
    return this.world?.nearestEvap(x, z, maxDistance) || null;
  }

  /**
   * Récupère l'érablière la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 36).
   * @returns Érablière la plus proche ou `null`.
   */
  getNearestSugarBush(x: number, z: number, maxDistance: number = 36): SugarBush | null {
    return this.world?.nearestBush(x, z, maxDistance) || null;
  }

  /**
   * Récupère le deed le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 5).
   * @returns Deed le plus proche ou `null`.
   */
  getNearestDeed(x: number, z: number, maxDistance: number = 5): Deed | null {
    return this.world?.nearestDeed(x, z, maxDistance) || null;
  }

  /**
   * Récupère la maison la plus proche en vente.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 16).
   * @returns Maison en vente la plus proche ou `null`.
   */
  getNearestHouseForSale(x: number, z: number, maxDistance: number = 16): HouseLot | null {
    const houses = this.getAllHouses().filter((h) => h.state === "for_sale");
    let nearestHouse: HouseLot | null = null;
    let minDistance = maxDistance;

    for (const house of houses) {
      const distance = Math.hypot(house.x - x, house.z - z);
      if (distance < minDistance) {
        minDistance = distance;
        nearestHouse = house;
      }
    }

    return nearestHouse;
  }

  /**
   * Récupère le crime le plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 4.8).
   * @returns Crime le plus proche ou `null`.
   */
  getNearestCrime(x: number, z: number, maxDistance: number = 4.8): CrimeSpot | null {
    return this.world?.nearestCrime(x, z, maxDistance) || null;
  }

  /**
   * Récupère la feuille d'érable la plus proche.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 2.2).
   * @returns Feuille la plus proche ou `null`.
   */
  getNearestLeaf(x: number, z: number, maxDistance: number = 2.2):
    | { id: string; mesh: THREE.Group; x: number; z: number; collected: boolean }
    | null {
    return this.world?.nearestLeaf(x, z, maxDistance) || null;
  }

  /**
   * Collecte une feuille d'érable.
   * @param leafId - ID de la feuille.
   * @returns `true` si la collecte a réussi.
   */
  collectLeaf(leafId: string): boolean {
    return this.world?.collectLeaf(leafId) || false;
  }

  /**
   * Marque plusieurs feuilles comme collectées.
   * @param leafIds - IDs des feuilles à marquer.
   */
  markLeavesCollected(leafIds: string[]): void {
    this.world?.markLeavesCollected(leafIds);
  }

  // ============================================================================
  // 🎮 FONCTIONS DE JEU (pour l'intégration avec l_engine)
  // ============================================================================

  /**
   * Met à jour le monde (à appeler chaque frame).
   * @param dt - Temps écoulé depuis la dernière frame (en secondes).
   * @param elapsed - Temps total écoulé (en secondes).
   * @param playerPosition - Position du joueur.
   * @param playerSpeed - Vitesse du joueur (en km/h).
   * @param wantedStars - Niveau de recherche du joueur.
   */
  update(
    dt: number,
    elapsed: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number = 0,
    wantedStars: number = 0
  ): void {
    if (!this.world) return;

    // Mettre à jour l'état du monde (heure, jour, saison, etc.)
    this.updateWorldState(dt, playerPosition.x, playerPosition.z);

    // Mettre à jour le monde
    this.world.update(dt, elapsed, playerPosition, playerSpeed, wantedStars);

    // Mettre à jour les systèmes RP
    this.updateRPSystems(dt, elapsed, playerPosition, wantedStars);
  }

  /**
   * Met à jour les systèmes RP.
   * @param dt - Temps écoulé (en secondes).
   * @param elapsed - Temps total écoulé (en secondes).
   * @param playerPosition - Position du joueur.
   * @param wantedStars - Niveau de recherche du joueur.
   */
  private updateRPSystems(
    dt: number,
    elapsed: number,
    playerPosition: THREE.Vector3,
    wantedStars: number
  ): void {
    if (!this.world || !this.worldState) return;

    // Mettre à jour les PNJ
    this.updateNPCsInWorld(dt, elapsed, playerPosition);

    // Mettre à jour les feux de camp
    this.updateCampfires(dt, elapsed);

    // Mettre à jour les véhicules
    this.updateVehicles(dt, elapsed, playerPosition, wantedStars);

    // Mettre à jour les festivals
    this.updateActiveFestivals(dt, elapsed);

    // Sauvegarder automatiquement toutes les 5 minutes
    this.updateAutoSave(dt);
  }

  /**
   * Met à jour les PNJ dans le monde.
   * @param dt - Temps écoulé (en secondes).
   * @param elapsed - Temps total écoulé (en secondes).
   * @param playerPosition - Position du joueur.
   */
  private updateNPCsInWorld(
    dt: number,
    elapsed: number,
    playerPosition: THREE.Vector3
  ): void {
    if (!this.world || !this.worldState) return;

    const hoursPassed = dt / 3600; // Convertir en heures

    // Mettre à jour les PNJ toutes les 10 secondes (0.1 minute)
    this.updateTimer += dt;
    if (this.updateTimer >= 10) {
      this.updateTimer = 0;
      this.updateNPCs(hoursPassed);
    }

    // Mettre à jour les positions des PNJ qui suivent le joueur
    for (const npc of this.getAllNPCs()) {
      if (npc.currentActivity === "follow" && npc.targetPosition) {
        const dx = playerPosition.x - npc.position.x;
        const dz = playerPosition.z - npc.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > 1) {
          const speed = npc.speed * (dt / 1000); // Convertir en ms
          npc.position.x += (dx / distance) * speed;
          npc.position.z += (dz / distance) * speed;
          npc.position.y = getTerrainHeight(npc.position.x, npc.position.z);
        }
      }
    }
  }

  /**
   * Met à jour les feux de camp.
   * @param dt - Temps écoulé (en secondes).
   * @param elapsed - Temps total écoulé (en secondes).
   */
  private updateCampfires(dt: number, elapsed: number): void {
    if (!this.world) return;

    for (const campfire of this.getAllCampfires()) {
      if (!campfire.isLit) continue;

      // Consommer le carburant
      campfire.fuel -= dt * 0.01; // 1% de carburant par seconde

      if (campfire.fuel <= 0) {
        campfire.isLit = false;
        campfire.fuel = 0;
      }

      // Mettre à jour la position Y (pour les animations)
      if (campfire.mesh) {
        campfire.mesh.position.y = getTerrainHeight(campfire.x, campfire.z) + 0.1;
      }
    }
  }

  /**
   * Met à jour les véhicules.
   * @param dt - Temps écoulé (en secondes).
   * @param elapsed - Temps total écoulé (en secondes).
   * @param playerPosition - Position du joueur.
   * @param wantedStars - Niveau de recherche du joueur.
   */
  private updateVehicles(
    dt: number,
    elapsed: number,
    playerPosition: THREE.Vector3,
    wantedStars: number
  ): void {
    if (!this.world) return;

    // Mettre à jour les véhicules du trafic
    for (const vehicle of this.getAllTraffic()) {
      // Consommer le carburant si le véhicule est en mouvement
      if (vehicle.speed > 0) {
        vehicle.fuel -= vehicle.speed * vehicle.fuelConsumption * (dt / 3600); // dt en heures
        vehicle.fuel = Math.max(0, vehicle.fuel);

        // Si le véhicule n'a plus de carburant, l'arrêter
        if (vehicle.fuel <= 0) {
          vehicle.speed = 0;
          vehicle.targetSpeed = 0;
        }
      }

      // Réduire la durabilité si le véhicule est en mouvement
      if (vehicle.speed > 0) {
        vehicle.durability -= vehicle.speed * 0.001 * (dt / 3600);
        vehicle.durability = Math.max(0, vehicle.durability);

        // Mettre à jour la condition
        if (vehicle.durability < vehicle.maxDurability * 0.3) {
          vehicle.condition = "use";
        }
        if (vehicle.durability < vehicle.maxDurability * 0.1) {
          vehicle.condition = "abandonne";
        }
      }

      // Si le véhicule est un véhicule d'urgence et que le joueur est recherché, activer les sirènes
      if (vehicle.isEmergency && wantedStars > 0) {
        const distanceToPlayer = Math.hypot(
          vehicle.mesh.position.x - playerPosition.x,
          vehicle.mesh.position.z - playerPosition.z
        );

        if (distanceToPlayer < 50) {
          vehicle.sirenActive = true;
          vehicle.lightsActive = true;
        } else {
          vehicle.sirenActive = false;
          vehicle.lightsActive = false;
        }
      }
    }

    // Mettre à jour le véhicule du joueur
    if (this.worldState.player.currentVehicle) {
      const vehicle = this.getVehicleById(this.worldState.player.currentVehicle);
      if (vehicle) {
        // Consommer le carburant
        if (vehicle.speed > 0) {
          vehicle.fuel -= vehicle.speed * vehicle.fuelConsumption * (dt / 3600);
          vehicle.fuel = Math.max(0, vehicle.fuel);
        }

        // Réduire la durabilité
        if (vehicle.speed > 0) {
          vehicle.durability -= vehicle.speed * 0.001 * (dt / 3600);
          vehicle.durability = Math.max(0, vehicle.durability);
        }
      }
    }
  }

  /**
   * Met à jour les festivals actifs.
   * @param dt - Temps écoulé (en secondes).
   * @param elapsed - Temps total écoulé (en secondes).
   */
  private updateActiveFestivals(dt: number, elapsed: number): void {
    if (!this.world) return;

    for (const festival of this.getActiveFestivals()) {
      // Mettre à jour l'assistance (PNJ qui se déplacent vers le festival)
      for (const npc of this.getAllNPCs()) {
        if (npc.currentActivity !== "leisure" && Math.random() < 0.01) {
          const distanceToFestival = Math.hypot(
            npc.position.x - festival.location.x,
            npc.position.z - festival.location.z
          );

          if (distanceToFestival < 100) {
            npc.currentActivity = "leisure";
            npc.targetPosition = {
              x: festival.location.x + (Math.random() - 0.5) * festival.location.radius,
              z: festival.location.z + (Math.random() - 0.5) * festival.location.radius,
            };
          }
        }
      }
    }
  }

  /**
   * Met à jour la sauvegarde automatique.
   * @param dt - Temps écoulé (en secondes).
   */
  private updateAutoSave(dt: number): void {
    this.saveTimer += dt;

    // Sauvegarder toutes les 5 minutes (300 secondes)
    if (this.saveTimer >= 300) {
      this.saveTimer = 0;
      this.saveWorldState();
    }
  }

  // ============================================================================
  // 💾 SYSTÈME DE SAUVEGARDE ET CHARGEMENT
  // ============================================================================

  /**
   * Sauvegarde l'état du monde.
   * @returns Objet de sauvegarde.
   */
  saveWorldState(): WorldSaveData {
    if (!this.worldState) {
      return { version: WORLD_API_VERSION, data: {} };
    }

    // Sauvegarder l'état du joueur
    const playerSave = {
      money: this.worldState.player.money,
      experience: this.worldState.player.experience,
      level: this.worldState.player.level,
      reputation: this.worldState.player.reputation,
      skills: this.worldState.player.skills,
      inventory: this.worldState.player.inventory,
      equipped: this.worldState.player.equipped,
      ownedBuildings: this.worldState.player.ownedBuildings,
      ownedVehicles: this.worldState.player.ownedVehicles,
      activeQuests: this.worldState.player.activeQuests,
      completedQuests: this.worldState.player.completedQuests,
      discoveredAreas: this.worldState.player.discoveredAreas,
      playTime: this.worldState.player.playTime,
      lastSave: Date.now(),
    };

    // Sauvegarder l'état du monde
    const worldSave = {
      currentDay: this.worldState.currentDay,
      currentTime: this.worldState.currentTime,
      season: this.worldState.season,
      weather: this.worldState.weather,
      temperature: this.worldState.temperature,
      windSpeed: this.worldState.windSpeed,
      windDirection: this.worldState.windDirection,
      globalReputation: this.worldState.globalReputation,
      globalSatisfaction: this.worldState.globalSatisfaction,
      crimeRate: this.worldState.crimeRate,
      pollution: this.worldState.pollution,
      wealth: this.worldState.wealth,
      population: this.worldState.population,
      taxRate: this.worldState.taxRate,
    };

    // Sauvegarder les factions
    const factionsSave: Record<string, any> = {};
    for (const [factionId, faction] of Object.entries(this.worldState.factions)) {
      factionsSave[factionId] = {
        reputation: faction.reputation,
        power: faction.power,
        wealth: faction.wealth,
        members: faction.members,
        leader: faction.leader,
        relations: faction.relations,
      };
    }

    // Sauvegarder les événements
    const eventsSave = this.worldState.events.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      severity: event.severity,
      startTime: event.startTime,
      duration: event.duration,
      location: event.location,
      effects: event.effects,
      isActive: event.isActive,
      objectives: event.objectives,
    }));

    // Sauvegarder les quêtes
    const questsSave = this.worldState.quests.map((quest) => ({
      id: quest.id,
      title: quest.title,
      description: quest.description,
      giver: quest.giver,
      giverFaction: quest.giverFaction,
      objectives: quest.objectives.map((obj) => ({
        type: obj.type,
        target: obj.target,
        count: obj.count,
        current: obj.current,
      })),
      rewards: quest.rewards,
      prerequisites: quest.prerequisites,
      expiry: quest.expiry,
      isActive: quest.isActive,
      isCompleted: quest.isCompleted,
      isFailed: quest.isFailed,
    }));

    // Sauvegarder les PNJ
    const npcsSave = this.getAllNPCs().map((npc) => ({
      id: npc.id,
      name: npc.name,
      type: npc.type,
      faction: npc.faction,
      age: npc.age,
      gender: npc.gender,
      profession: npc.profession,
      buildingId: npc.buildingId,
      homeBuildingId: npc.homeBuildingId,
      workBuildingId: npc.workBuildingId,
      position: npc.position,
      targetPosition: npc.targetPosition,
      mood: npc.mood,
      health: npc.health,
      wealth: npc.wealth,
      needs: npc.needs,
      schedule: npc.schedule,
      currentActivity: npc.currentActivity,
      speed: npc.speed,
      isActive: npc.isActive,
      relationships: npc.relationships,
      reputation: npc.reputation,
      skills: npc.skills,
      inventory: npc.inventory,
      equipped: npc.equipped,
      isArrested: npc.isArrested,
      arrestReason: npc.arrestReason,
      arrestDuration: npc.arrestDuration,
      wantedLevel: npc.wantedLevel,
      isWanted: npc.isWanted,
      lastInteraction: npc.lastInteraction,
    }));

    // Sauvegarder les bâtiments
    const buildingsSave: any[] = [];
    for (const city of this.world?.cityBuildings || []) {
      for (const building of city.buildings) {
        buildingsSave.push({
          id: building.id,
          type: building.type,
          category: building.category,
          x: building.x,
          y: building.y,
          z: building.z,
          width: building.width,
          depth: building.depth,
          height: building.height,
          floors: building.floors,
          yaw: building.yaw,
          style: building.style,
          condition: building.condition,
          quality: building.quality,
          owner: building.owner,
          residents: building.residents,
          employees: building.employees,
          name: building.name,
          address: building.address,
          value: building.value,
          buyCost: building.buyCost,
          rentCost: building.rentCost,
          maintenanceCost: building.maintenanceCost,
          taxValue: building.taxValue,
          reputationImpact: building.reputationImpact,
          capacity: building.capacity,
          currentOccupancy: building.currentOccupancy,
          production: building.production,
          services: building.services,
          operatingHours: building.operatingHours,
          isOpen: building.isOpen,
          age: building.age,
          durability: building.durability,
          fireRisk: building.fireRisk,
          crimeRate: building.crimeRate,
          satisfaction: building.satisfaction,
          hasElevator: building.hasElevator,
          hasFireExit: building.hasFireExit,
          hasSecurity: building.hasSecurity,
          hasSprinklers: building.hasSprinklers,
          accessibility: building.accessibility,
          historicalValue: building.historicalValue,
          lastRenovation: building.lastRenovation,
          lastMaintenance: building.lastMaintenance,
        });
      }
    }

    // Sauvegarder les ressources naturelles
    const resourcesSave = this.getAllNaturalResources().map((resource) => ({
      id: resource.id,
      type: resource.type,
      name: resource.name,
      x: resource.x,
      z: resource.z,
      quantity: resource.quantity,
      maxQuantity: resource.maxQuantity,
      regrowthRate: resource.regrowthRate,
      requiredTool: resource.requiredTool,
      requiredSkill: resource.requiredSkill,
      minSkillLevel: resource.minSkillLevel,
      lastHarvested: resource.lastHarvested,
      isExhausted: resource.isExhausted,
      owner: resource.owner,
    }));

    // Sauvegarder les feux de camp
    const campfiresSave = this.getAllCampfires().map((campfire) => ({
      id: campfire.id,
      x: campfire.x,
      z: campfire.z,
      yaw: campfire.yaw,
      isLit: campfire.isLit,
      fuel: campfire.fuel,
      maxFuel: campfire.maxFuel,
      owner: campfire.owner,
      lastUsed: campfire.lastUsed,
    }));

    return {
      version: WORLD_API_VERSION,
      timestamp: Date.now(),
      data: {
        player: playerSave,
        world: worldSave,
        factions: factionsSave,
        events: eventsSave,
        quests: questsSave,
        npcs: npcsSave,
        buildings: buildingsSave,
        resources: resourcesSave,
        campfires: campfiresSave,
      },
    };
  }

  /**
   * Charge l'état du monde.
   * @param saveData - Données de sauvegarde.
   * @returns `true` si le chargement a réussi.
   */
  loadWorldState(saveData: WorldSaveData): boolean {
    if (!saveData || saveData.version !== WORLD_API_VERSION) {
      console.warn("Version de sauvegarde incompatible.");
      return false;
    }

    if (!this.worldState || !this.world) return false;

    // Charger l'état du joueur
    const playerSave = saveData.data.player;
    if (playerSave) {
      this.worldState.player = {
        money: playerSave.money || 0,
        experience: playerSave.experience || 0,
        level: playerSave.level || 1,
        reputation: playerSave.reputation || {},
        skills: playerSave.skills || {},
        inventory: playerSave.inventory || {},
        equipped: playerSave.equipped || {},
        ownedBuildings: playerSave.ownedBuildings || [],
        ownedVehicles: playerSave.ownedVehicles || [],
        activeQuests: playerSave.activeQuests || [],
        completedQuests: playerSave.completedQuests || [],
        discoveredAreas: playerSave.discoveredAreas || {},
        playTime: playerSave.playTime || 0,
        lastSave: playerSave.lastSave || Date.now(),
      };
    }

    // Charger l'état du monde
    const worldSave = saveData.data.world;
    if (worldSave) {
      this.worldState.currentDay = worldSave.currentDay || 0;
      this.worldState.currentTime = worldSave.currentTime || 12;
      this.worldState.season = worldSave.season || "ete";
      this.worldState.weather = worldSave.weather || "clear";
      this.worldState.temperature = worldSave.temperature || 22;
      this.worldState.windSpeed = worldSave.windSpeed || 10;
      this.worldState.windDirection = worldSave.windDirection || 180;
      this.worldState.globalReputation = worldSave.globalReputation || 70;
      this.worldState.globalSatisfaction = worldSave.globalSatisfaction || 75;
      this.worldState.crimeRate = worldSave.crimeRate || 10;
      this.worldState.pollution = worldSave.pollution || 20;
      this.worldState.wealth = worldSave.wealth || 5000000;
      this.worldState.population = worldSave.population || 0;
      this.worldState.taxRate = worldSave.taxRate || 0.15;

      // Mettre à jour la phase du jour
      this.worldState.dayPhase = this.getDayPhase(this.worldState.currentTime);
    }

    // Charger les factions
    const factionsSave = saveData.data.factions;
    if (factionsSave) {
      for (const [factionId, factionData] of Object.entries(factionsSave)) {
        if (this.worldState.factions[factionId as FactionType]) {
          this.worldState.factions[factionId as FactionType] = {
            ...this.worldState.factions[factionId as FactionType],
            ...factionData,
          };
        }
      }
    }

    // Charger les événements
    const eventsSave = saveData.data.events;
    if (eventsSave) {
      this.worldState.events = eventsSave.map((event) => ({
        ...event,
        effects: event.effects || {},
      }));
    }

    // Charger les quêtes
    const questsSave = saveData.data.quests;
    if (questsSave) {
      this.worldState.quests = questsSave.map((quest) => ({
        ...quest,
        objectives: quest.objectives.map((obj) => ({
          ...obj,
          current: obj.current || 0,
        })),
        rewards: quest.rewards || {},
        prerequisites: quest.prerequisites || {},
      }));
    }

    // Charger les PNJ
    const npcsSave = saveData.data.npcs;
    if (npcsSave) {
      this.world.npcs = npcsSave.map((npc) => ({
        ...npc,
        position: { ...npc.position },
        targetPosition: npc.targetPosition ? { ...npc.targetPosition } : undefined,
        needs: { ...npc.needs },
        relationships: { ...npc.relationships },
        reputation: { ...npc.reputation },
        skills: { ...npc.skills },
        inventory: { ...npc.inventory },
        equipped: { ...npc.equipped },
      }));
    }

    // Charger les bâtiments
    const buildingsSave = saveData.data.buildings;
    if (buildingsSave && this.world) {
      for (const city of this.world.cityBuildings) {
        for (const building of city.buildings) {
          const savedBuilding = buildingsSave.find((b) => b.id === building.id);
          if (savedBuilding) {
            Object.assign(building, savedBuilding);
          }
        }
      }
    }

    // Charger les ressources naturelles
    const resourcesSave = saveData.data.resources;
    if (resourcesSave && this.world) {
      this.world.naturalResources = resourcesSave.map((resource) => ({
        ...resource,
      }));
    }

    // Charger les feux de camp
    const campfiresSave = saveData.data.campfires;
    if (campfiresSave && this.world) {
      this.world.campfires = campfiresSave.map((campfire) => ({
        ...campfire,
        mesh: new THREE.Group(), // Reconstruire le mesh
      }));
    }

    // Mettre à jour le monde avec les données chargées
    setCurrentDay(this.worldState.currentDay);
    setCurrentSeason(this.worldState.season);
    setCurrentTime(this.worldState.currentTime);

    // Synchroniser les PNJ avec les bâtiments
    this.syncNPCsWithBuildings();

    return true;
  }

  /**
   * Synchronise les PNJ avec les bâtiments (après chargement).
   */
  private syncNPCsWithBuildings(): void {
    if (!this.world) return;

    for (const npc of this.getAllNPCs()) {
      // Trouver le bâtiment de travail
      if (npc.workBuildingId) {
        const building = this.getBuildingById(npc.workBuildingId);
        if (building) {
          npc.position = {
            x: building.x,
            y: building.y,
            z: building.z,
          };
        }
      }

      // Trouver le bâtiment de résidence
      if (npc.homeBuildingId) {
        const building = this.getBuildingById(npc.homeBuildingId);
        if (building) {
          npc.position = {
            x: building.x,
            y: building.y,
            z: building.z,
          };
        }
      }
    }
  }

  // ============================================================================
  // 🧹 NETTOYAGE
  // ============================================================================

  /**
   * Nettoie les ressources de l'API.
   */
  dispose(): void {
    if (this.world) {
      this.world.dispose();
      this.world = null;
    }

    this.worldState = null;
    this.scene = null as unknown as THREE.Scene;
    this.camera = null as unknown as THREE.PerspectiveCamera;
    WorldAPI.instance = null;
  }
}

// ============================================================================
// 📦 TYPES POUR LA SAUVEGARDE
// ============================================================================

/** Données de sauvegarde du monde. */
export interface WorldSaveData {
  version: string;
  timestamp: number;
  data: {
    player?: PlayerWorldState;
    world?: Omit<WorldState, "factions" | "events" | "quests" | "player">;
    factions?: Record<string, any>;
    events?: any[];
    quests?: any[];
    npcs?: any[];
    buildings?: any[];
    resources?: any[];
    campfires?: any[];
  };
}

// ============================================================================
// 🎯 EXPORT DE L'INSTANCE SINGLETON
// ============================================================================

/**
 * Instance singleton de WorldAPI.
 * À utiliser pour accéder à l'API mondiale depuis n'importe où.
 */
export let worldAPI: WorldAPI | null = null;

/**
 * Initialise l'API mondiale.
 * @param scene - Scène THREE.js.
 * @param camera - Caméra THREE.js.
 * @returns Instance de WorldAPI.
 */
export function initializeWorldAPI(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): WorldAPI {
  worldAPI = WorldAPI.getInstance(scene, camera);
  return worldAPI;
}

/**
 * Récupère l'instance de l'API mondiale.
 * @returns Instance de WorldAPI ou `null`.
 */
export function getWorldAPI(): WorldAPI | null {
  return worldAPI;
}