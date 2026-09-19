/**
 * ═══════════════════════════════════════════════════════════════════
 *  SYSTÈME AGRICOLE AVANCÉ — ULTIMATE EDITION v2.0
 *  Pour TroxTWorld - Comté de Portneuf
 * ═══════════════════════════════════════════════════════════════════
 *
 * @author xblade benz (TroxTWorld)
 * @description Système complet de gestion agricole avec :
 * - 5 types de cultures (maïs, blé, foin, patates, cannabis)
 * - 5 étapes de croissance (friche → labouré → semé → pousse → mûr)
 * - Serres clandestines pour le cannabis
 * - Système de chaleur (heat) pour la détection par la SQ
 * - Raids de la SQ et saisie des récoltes
 * - Outils agricoles (pelle, râteau, tracteur)
 * - Saisonnalité et conditions météo
 * - Intégration avec le système de crime et d'inventaire
 * - Animations de croissance
 * - Sauvegarde/Chargement
 */

import * as THREE from "three";
import { buildGrange, buildMaisonCanadienne } from "./city/buildings/architecture/architecture";
import { getGeo } from "./city/environment/geo";
import { matLib } from "./materials";
import { getTerrainHeight, pushOffRoad, RANG_2E_Z, RIVER_RANGS, nearestRoadHit } from "./worlddata";
import { attachScenicHeat } from "../utils/utilities";
import { addWantedPoints } from "./police";

export const farmMapMarks: Array<{ x: number; z: number; label?: string }> = [];
import { itemById, ShopItemId, getSellPrice, bagValue } from "./commerce";
export { cropFromSeed, countyFarmLayout, farmClearings, fieldPrompt, legalFarmsteads, mountFarms, nearestField, seizeField, tickFields, workField } from "./city/environment/campagne/farms";

// ==========================================
// 🌾 1. TYPES & CONSTANTES
// ==========================================

/** IDs des cultures */
export type CropId = "mais" | "ble" | "foin" | "patate" | "cannabis";

/** Étapes de croissance d'un champ */
export type FieldStage = "friche" | "laboure" | "seme" | "pousse" | "mur";

/** Saison */
export type Season = "printemps" | "ete" | "automne" | "hiver";

/** Condition météo */
export type WeatherCondition = "soleil" | "pluie" | "neige" | "brouillard" | "orage";

/** Spécifications d'une culture */
export interface CropSpec {
  id: CropId;
  label: string;
  seedId: ShopItemId; // ID de la graine dans commerce.ts
  yieldId: ShopItemId; // ID de la récolte dans commerce.ts
  yieldN: number; // Nombre d'items récoltés
  growTime: number; // Temps de croissance en ms (par défaut: 44h pour le maïs)
  illegal: boolean;
  color: number;
  height: number;
  season: Season[]; // Saisons où la culture peut pousser
  waterNeed: number; // Besoin en eau (0-100)
  sunlightNeed: number; // Besoin en soleil (0-100)
  fertilizerNeed: number; // Besoin en engrais (0-100)
  pestResistance: number; // Résistance aux nuisibles (0-100)
  minTemperature: number; // Température minimale en °C
  maxTemperature: number; // Température maximale en °C
  basePrice: number; // Prix de base de la récolte
}

/** Spécifications des cultures */
export const CROPS: Record<CropId, CropSpec> = {
  mais: {
    id: "mais",
    label: "Maïs",
    seedId: "graines_mais",
    yieldId: "mais",
    yieldN: 4,
    growTime: 44 * 60 * 60 * 1000, // 44 heures
    illegal: false,
    color: 0xc8a840,
    height: 1.65,
    season: ["printemps", "ete"],
    waterNeed: 70,
    sunlightNeed: 80,
    fertilizerNeed: 50,
    pestResistance: 60,
    minTemperature: 10,
    maxTemperature: 35,
    basePrice: 8,
  },
  ble: {
    id: "ble",
    label: "Blé",
    seedId: "graines_ble",
    yieldId: "ble",
    yieldN: 3,
    growTime: 36 * 60 * 60 * 1000, // 36 heures
    illegal: false,
    color: 0xd4b850,
    height: 0.82,
    season: ["printemps", "ete", "automne"],
    waterNeed: 60,
    sunlightNeed: 85,
    fertilizerNeed: 40,
    pestResistance: 70,
    minTemperature: 5,
    maxTemperature: 30,
    basePrice: 11,
  },
  foin: {
    id: "foin",
    label: "Foin",
    seedId: "graines_foin",
    yieldId: "foin",
    yieldN: 4,
    growTime: 28 * 60 * 60 * 1000, // 28 heures
    illegal: false,
    color: 0x5a8a40,
    height: 0.4,
    season: ["printemps", "ete", "automne"],
    waterNeed: 50,
    sunlightNeed: 70,
    fertilizerNeed: 30,
    pestResistance: 80,
    minTemperature: 5,
    maxTemperature: 30,
    basePrice: 6,
  },
  patate: {
    id: "patate",
    label: "Patates",
    seedId: "graines_patate",
    yieldId: "patate",
    yieldN: 5,
    growTime: 40 * 60 * 60 * 1000, // 40 heures
    illegal: false,
    color: 0x6a8a48,
    height: 0.46,
    season: ["printemps", "ete"],
    waterNeed: 80,
    sunlightNeed: 60,
    fertilizerNeed: 60,
    pestResistance: 50,
    minTemperature: 8,
    maxTemperature: 28,
    basePrice: 5,
  },
  cannabis: {
    id: "cannabis",
    label: "Cannabis",
    seedId: "graines_cannabis",
    yieldId: "weed",
    yieldN: 5,
    growTime: 42 * 60 * 60 * 1000, // 42 heures
    illegal: true,
    color: 0x2a6a32,
    height: 1.2,
    season: ["ete", "automne"], // Pousse mieux en été/automne
    waterNeed: 75,
    sunlightNeed: 70,
    fertilizerNeed: 80,
    pestResistance: 40,
    minTemperature: 15,
    maxTemperature: 30,
    basePrice: 32,
  },
};

/** Type d'outil agricole */
export type FarmTool = "pelle" | "rateau" | "herser" | "faux" | "tracteur" | null;

/** Type de sol */
export type SoilType = "argile" | "sable" | "limon" | "tourbe" | "rocheux";

/** Qualité du sol (0-100) */
export interface SoilQuality {
  fertility: number; // Fertilité
  drainage: number; // Drainage
  ph: number; // pH (0-14)
  moisture: number; // Humidité (0-100)
}

/** Parcelles de terrain */
export interface FieldPlot {
  id: string;
  name: string;
  village: string;
  x: number;
  z: number;
  yaw: number;
  w: number; // Largeur
  d: number; // Profondeur
  illegal: boolean;
  concealed: boolean; // Si la culture est cachée (serre)
  heat: number; // Niveau de chaleur (0-1) pour la détection par la SQ
  stage: FieldStage;
  crop: CropId | null;
  plantedAt: number; // Timestamp de plantation
  harvestedAt: number; // Timestamp de récolte
  lastWatered: number; // Dernier arrosage
  lastFertilized: number; // Dernière fertilisation
  soilType: SoilType;
  soilQuality: SoilQuality;
  growthProgress: number; // Progression de croissance (0-1)
  health: number; // Santé de la culture (0-100)
  pests: number; // Niveau de nuisibles (0-100)
  weeds: number; // Niveau de mauvaises herbes (0-100)
  irrigation: boolean; // Si le champ est irrigué
  group: THREE.Group;
  greenhouse?: THREE.Group; // Serre (pour les cultures clandestines)
}

/** Définition d'une parcelle */
interface PlotDef {
  ox: number; // Offset X
  oz: number; // Offset Z
  w: number; // Largeur
  d: number; // Profondeur
  crop?: CropId | null;
  stage?: FieldStage;
  soilType?: SoilType;
}

/** Définition d'une ferme */
interface FarmDef {
  id: string;
  village: string;
  villageId: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  crop: CropId;
  hidden?: boolean; // Ferme cachée (culture illégale)
  plots: PlotDef[];
  soilType?: SoilType;
}

/** Résultat d'un travail agricole */
export interface FieldWorkResult {
  ok: boolean;
  notice: string;
  loot?: { id: ShopItemId; n: number };
  consumeSeed?: ShopItemId;
  consumeWater?: number; // Litres d'eau utilisés
  consumeFertilizer?: number; // Unités d'engrais utilisées
  illegalSow?: boolean;
  seized?: boolean;
  wantedPoints?: number;
}

/** Événement agricole */
export interface FarmEvent {
  id: string;
  type: "raid" | "pest_outbreak" | "drought" | "flood" | "storm";
  plotId: string;
  time: number;
  severity: number; // 0-100
  resolved: boolean;
}

/** Conditions météo actuelles */
export interface WeatherData {
  season: Season;
  condition: WeatherCondition;
  temperature: number; // en °C
  humidity: number; // 0-100
  windSpeed: number; // km/h
  precipitation: number; // mm/h
}

// ==========================================
// 🌍 2. CONDITIONS ENVIRONNEMENTALES
// ==========================================

/** Conditions météo par défaut pour chaque saison */
const SEASON_WEATHER: Record<Season, WeatherData> = {
  printemps: {
    season: "printemps",
    condition: "pluie",
    temperature: 12,
    humidity: 70,
    windSpeed: 15,
    precipitation: 2,
  },
  ete: {
    season: "ete",
    condition: "soleil",
    temperature: 25,
    humidity: 50,
    windSpeed: 10,
    precipitation: 0,
  },
  automne: {
    season: "automne",
    condition: "brouillard",
    temperature: 15,
    humidity: 80,
    windSpeed: 5,
    precipitation: 1,
  },
  hiver: {
    season: "hiver",
    condition: "neige",
    temperature: -5,
    humidity: 60,
    windSpeed: 20,
    precipitation: 3,
  },
};

/** Qualité du sol par type */
const SOIL_QUALITIES: Record<SoilType, SoilQuality> = {
  argile: { fertility: 80, drainage: 30, ph: 6.5, moisture: 70 },
  sable: { fertility: 40, drainage: 90, ph: 7.2, moisture: 30 },
  limon: { fertility: 90, drainage: 60, ph: 6.8, moisture: 60 },
  tourbe: { fertility: 70, drainage: 20, ph: 5.5, moisture: 90 },
  rocheux: { fertility: 20, drainage: 100, ph: 7.5, moisture: 10 },
};

// ==========================================
// 🚜 3. CLASSE FARM MANAGER (Gestion Globale)
// ==========================================

/**
 * Gestionnaire global des fermes et des cultures
 */
export class FarmManager {
  private plots: Map<string, FieldPlot> = new Map();
  private farms: Map<string, FarmDef> = new Map();
  private events: Map<string, FarmEvent> = new Map();
  private lastPlotId: number = 0;
  private lastEventId: number = 0;
  private currentWeather: WeatherData;
  private currentSeason: Season = "ete";
  private lastWeatherUpdate: number = 0;
  private weatherChangeInterval: number = 6 * 60 * 60 * 1000; // 6 heures

  constructor() {
    // Initialiser avec les données par défaut
    this.currentWeather = SEASON_WEATHER[this.currentSeason];
    this.initializeFarms();
  }

  /**
   * Initialise les fermes avec les données par défaut
   */
  private initializeFarms(): void {
    const farmsteads = countyFarmLayout();
    farmsteads.forEach(farm => {
      this.farms.set(farm.id, farm);

      // Créer les parcelles
      farm.plots.forEach((plotDef, index) => {
        const plot = this.createPlot(farm, plotDef, index);
        this.plots.set(plot.id, plot);
      });
    });
  }

  /**
   * Crée une parcelle
   */
  private createPlot(farm: FarmDef, plotDef: PlotDef, index: number): FieldPlot {
    const px = farm.x + Math.cos(farm.yaw) * plotDef.ox - Math.sin(farm.yaw) * plotDef.oz;
    const pz = farm.z + Math.sin(farm.yaw) * plotDef.ox + Math.cos(farm.yaw) * plotDef.oz;

    const plot: FieldPlot = {
      id: `${farm.id}_p${index}`,
      name: farm.hidden ? farm.name : `${farm.name} · ${farm.village}`,
      village: farm.village,
      x: px,
      z: pz,
      yaw: farm.yaw,
      w: plotDef.w,
      d: plotDef.d,
      illegal: Boolean(farm.hidden),
      concealed: Boolean(farm.hidden),
      heat: 0,
      stage: plotDef.stage ?? "friche",
      crop: plotDef.crop ?? (plotDef.stage && plotDef.stage !== "friche" && plotDef.stage !== "laboure" ? farm.crop : null),
      plantedAt: 0,
      harvestedAt: 0,
      lastWatered: 0,
      lastFertilized: 0,
      soilType: plotDef.soilType ?? farm.soilType ?? "limon",
      soilQuality: { ...SOIL_QUALITIES[plotDef.soilType ?? farm.soilType ?? "limon"] },
      growthProgress: 0,
      health: 100,
      pests: 0,
      weeds: 0,
      irrigation: false,
      group: new THREE.Group(),
    };

    plot.group.name = plot.id;
    return plot;
  }

  /**
   * Récupère une parcelle par son ID
   */
  getPlot(plotId: string): FieldPlot | undefined {
    return this.plots.get(plotId);
  }

  /**
   * Récupère toutes les parcelles
   */
  getAllPlots(): FieldPlot[] {
    return [...this.plots.values()];
  }

  /**
   * Récupère les parcelles d'une ferme
   */
  getPlotsByFarm(farmId: string): FieldPlot[] {
    return [...this.plots.values()].filter(plot => plot.id.startsWith(farmId));
  }

  /**
   * Récupère les parcelles dans une zone
   */
  getPlotsInArea(x: number, z: number, radius: number = 50): FieldPlot[] {
    return [...this.plots.values()].filter(plot => {
      const dx = plot.x - x;
      const dz = plot.z - z;
      return dx * dx + dz * dz <= radius * radius;
    });
  }

  /**
   * Récupère les parcelles illégales
   */
  getIllegalPlots(): FieldPlot[] {
    return [...this.plots.values()].filter(plot => plot.illegal);
  }

  /**
   * Récupère les parcelles cachées (serres)
   */
  getConcealedPlots(): FieldPlot[] {
    return [...this.plots.values()].filter(plot => plot.concealed);
  }

  /**
   * Récupère les parcelles prêtes à être récoltées
   */
  getHarvestablePlots(): FieldPlot[] {
    return [...this.plots.values()].filter(plot => {
      return plot.stage === "mur" && plot.crop && plot.health > 20;
    });
  }

  /**
   * Récupère les parcelles nécessitant de l'eau
   */
  getPlotsNeedingWater(): FieldPlot[] {
    return [...this.plots.values()].filter(plot => {
      if (!plot.crop || plot.stage === "friche" || plot.stage === "laboure") return false;
      const crop = CROPS[plot.crop];
      const timeSinceWatered = Date.now() - plot.lastWatered;
      const waterNeed = crop.waterNeed;
      return timeSinceWatered > 24 * 60 * 60 * 1000 && !plot.irrigation; // 24h sans arrosage
    });
  }

  /**
   * Récupère les parcelles nécessitant de l'engrais
   */
  getPlotsNeedingFertilizer(): FieldPlot[] {
    return [...this.plots.values()].filter(plot => {
      if (!plot.crop || plot.stage === "friche" || plot.stage === "laboure") return false;
      const crop = CROPS[plot.crop];
      const timeSinceFertilized = Date.now() - plot.lastFertilized;
      const fertilizerNeed = crop.fertilizerNeed;
      return timeSinceFertilized > 7 * 24 * 60 * 60 * 1000; // 7 jours sans engrais
    });
  }

  /**
   * Récupère les parcelles avec des nuisibles
   */
  getPlotsWithPests(): FieldPlot[] {
    return [...this.plots.values()].filter(plot => plot.pests > 50);
  }

  /**
   * Récupère les parcelles avec des mauvaises herbes
   */
  getPlotsWithWeeds(): FieldPlot[] {
    return [...this.plots.values()].filter(plot => plot.weeds > 50);
  }

  /**
   * Récupère une ferme par son ID
   */
  getFarm(farmId: string): FarmDef | undefined {
    return this.farms.get(farmId);
  }

  /**
   * Récupère toutes les fermes
   */
  getAllFarms(): FarmDef[] {
    return [...this.farms.values()];
  }

  /**
   * Récupère les fermes légales
   */
  getLegalFarms(): FarmDef[] {
    return [...this.farms.values()].filter(farm => !farm.hidden);
  }

  /**
   * Récupère les fermes illégales
   */
  getIllegalFarms(): FarmDef[] {
    return [...this.farms.values()].filter(farm => farm.hidden);
  }

  /**
   * Met à jour la météo
   */
  updateWeather(elapsed: number): void {
    // Changer de météo périodiquement
    if (elapsed - this.lastWeatherUpdate > this.weatherChangeInterval) {
      this.lastWeatherUpdate = elapsed;

      // Changer de saison tous les 3 jours (en jeu)
      const daysPassed = Math.floor(elapsed / (24 * 60 * 60 * 1000));
      const seasonIndex = Math.floor(daysPassed / 3) % 4;
      const seasons: Season[] = ["printemps", "ete", "automne", "hiver"];
      this.currentSeason = seasons[seasonIndex];

      // Changer de condition météo aléatoirement
      const conditions: WeatherCondition[] = ["soleil", "pluie", "brouillard", "orage"];
      if (this.currentSeason === "hiver") {
        conditions.push("neige");
      }

      const randomCondition = conditions.random();
      const baseWeather = SEASON_WEATHER[this.currentSeason];

      this.currentWeather = {
        ...baseWeather,
        condition: randomCondition,
        // Ajouter des variations aléatoires
        temperature: baseWeather.temperature + (Math.random() - 0.5) * 10,
        humidity: Math.max(0, Math.min(100, baseWeather.humidity + (Math.random() - 0.5) * 30)),
        windSpeed: Math.max(0, baseWeather.windSpeed + (Math.random() - 0.5) * 15),
        precipitation: Math.max(0, baseWeather.precipitation + (Math.random() - 0.5) * 2),
      };
    }
  }

  /**
   * Récupère la météo actuelle
   */
  getCurrentWeather(): WeatherData {
    return this.currentWeather;
  }

  /**
   * Récupère la saison actuelle
   */
  getCurrentSeason(): Season {
    return this.currentSeason;
  }

  /**
   * Travailler une parcelle
   */
  workPlot(
    plotId: string,
    tool: FarmTool,
    seed: CropId | null,
    playerId: string,
    elapsed: number
  ): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    // Vérifier si la culture est possible en cette saison
    if (seed && !this.canGrowInSeason(seed, this.currentSeason)) {
      return {
        ok: false,
        notice: `Impossible de semer ${CROPS[seed].label} en ${this.currentSeason}.`,
      };
    }

    // Vérifier si le sol est adapté
    if (seed) {
      const crop = CROPS[seed];
      const soil = SOIL_QUALITIES[plot.soilType];

      if (soil.fertility < crop.fertilizerNeed * 0.7) {
        return {
          ok: false,
          notice: `Le sol ${plot.soilType} n'est pas assez fertile pour ${crop.label}.`,
        };
      }

      if (soil.drainage < 50 && crop.waterNeed > 70) {
        return {
          ok: false,
          notice: `Le sol ${plot.soilType} a un mauvais drainage pour ${crop.label}.`,
        };
      }
    }

    // Traiter selon l'outil et l'état de la parcelle
    switch (plot.stage) {
      case "friche":
        return this.plowPlot(plot, tool, playerId, elapsed);
      case "laboure":
        return this.sowPlot(plot, tool, seed, playerId, elapsed);
      case "seme":
      case "pousse":
        return this.tendPlot(plot, tool, playerId, elapsed);
      case "mur":
        return this.harvestPlot(plot, tool, playerId, elapsed);
      default:
        return { ok: false, notice: "État de la parcelle inconnu." };
    }
  }

  /**
   * Labourer une parcelle
   */
  private plowPlot(
    plot: FieldPlot,
    tool: FarmTool,
    playerId: string,
    elapsed: number
  ): FieldWorkResult {
    if (tool !== "pelle" && tool !== "tracteur") {
      return { ok: false, notice: "Équipez une pelle ou un tracteur." };
    }

    // Vérifier si le sol est trop rocheux
    if (plot.soilType === "rocheux") {
      return { ok: false, notice: "Le sol est trop rocheux pour être labouré." };
    }

    plot.stage = "laboure";
    plot.crop = null;
    plot.plantedAt = 0;
    plot.health = 100;
    plot.pests = 0;
    plot.weeds = 0;
    plot.growthProgress = 0;

    // Réduire légèrement la fertilité
    plot.soilQuality.fertility = Math.max(0, plot.soilQuality.fertility - 2);

    this.paintField(plot);

    return {
      ok: true,
      notice: `Labouré · ${plot.name}`,
      consumeSeed: undefined,
    };
  }

  /**
   * Semer une parcelle
   */
  private sowPlot(
    plot: FieldPlot,
    tool: FarmTool,
    seed: CropId | null,
    playerId: string,
    elapsed: number
  ): FieldWorkResult {
    if (!seed) {
      return { ok: false, notice: "Pas de semence sélectionnée." };
    }

    if (tool !== "pelle" && tool !== "tracteur") {
      return { ok: false, notice: "Équipez une pelle ou un tracteur." };
    }

    const crop = CROPS[seed];

    // Vérifier si le joueur a les graines
    // (À intégrer avec ton système d'inventaire)
    // const hasSeeds = inventoryHasItem(playerId, crop.seedId);
    // if (!hasSeeds) return { ok: false, notice: `Pas de graines de ${crop.label}.` };

    plot.crop = seed;
    plot.stage = "seme";
    plot.plantedAt = elapsed;
    plot.illegal = crop.illegal;
    plot.concealed = crop.illegal; // Par défaut, les cultures illégales sont cachées
    plot.heat = crop.illegal ? (plot.concealed ? 0.08 : 0.22) : 0;
    plot.health = 100;
    plot.pests = 0;
    plot.weeds = 0;
    plot.growthProgress = 0;

    this.paintField(plot);

    return {
      ok: true,
      notice: crop.illegal
        ? plot.concealed
          ? `Semis clandestin de ${crop.label} · serre cachée`
          : `Semis illégal de ${crop.label} · visible depuis le chemin`
        : `Semé · ${crop.label}`,
      consumeSeed: crop.seedId,
      illegalSow: crop.illegal,
    };
  }

  /**
   * Entretenir une parcelle (binage, désherbage)
   */
  private tendPlot(
    plot: FieldPlot,
    tool: FarmTool,
    playerId: string,
    elapsed: number
  ): FieldWorkResult {
    if (tool !== "rateau" && tool !== "pelle" && tool !== "herser") {
      return { ok: false, notice: "Équipez un râteau, une herse ou une pelle." };
    }

    if (!plot.crop) {
      return { ok: false, notice: "Aucune culture à entretenir." };
    }

    const crop = CROPS[plot.crop];

    // Binage (améliore la croissance)
    if (tool === "rateau" || tool === "herser") {
      plot.plantedAt -= 8 * 60 * 60 * 1000; // Réduit le temps de croissance de 8h
      plot.health = Math.min(100, plot.health + 5);
      plot.weeds = Math.max(0, plot.weeds - 10);
      plot.growthProgress = Math.min(1, (elapsed - plot.plantedAt) / crop.growTime);

      // Augmenter légèrement la chaleur pour les cultures illégales
      if (plot.illegal) {
        plot.heat += plot.concealed ? 0.05 : 0.12;
      }

      this.paintField(plot);

      return {
        ok: true,
        notice: `Binage · ${crop.label}`,
      };
    }

    // Désherbage manuel
    if (tool === "pelle") {
      plot.weeds = Math.max(0, plot.weeds - 20);
      plot.health = Math.min(100, plot.health + 2);

      this.paintField(plot);

      return {
        ok: true,
        notice: `Désherbage · ${crop.label}`,
      };
    }

    return { ok: false, notice: "Outil non valide pour cette action." };
  }

  /**
   * Récolter une parcelle
   */
  private harvestPlot(
    plot: FieldPlot,
    tool: FarmTool,
    playerId: string,
    elapsed: number
  ): FieldWorkResult {
    if (!plot.crop) {
      return { ok: false, notice: "Aucune culture à récolter." };
    }

    if (tool !== "faux" && tool !== "tracteur") {
      return { ok: false, notice: "Équipez une faux ou un tracteur." };
    }

    const crop = CROPS[plot.crop];

    // Vérifier si la culture est mûre
    if (plot.stage !== "mur") {
      return {
        ok: false,
        notice: `La culture de ${crop.label} n'est pas encore mûre.`,
      };
    }

    // Calculer le rendement en fonction de la santé
    const healthFactor = plot.health / 100;
    const pestFactor = 1 - (plot.pests / 100);
    const weedFactor = 1 - (plot.weeds / 100);
    const soilFactor = plot.soilQuality.fertility / 100;

    const yieldMultiplier = healthFactor * pestFactor * weedFactor * soilFactor;
    const actualYield = Math.max(1, Math.floor(crop.yieldN * yieldMultiplier));

    // Récolte
    plot.stage = "friche";
    plot.crop = null;
    plot.illegal = plot.concealed;
    plot.heat = 0;
    plot.plantedAt = 0;
    plot.harvestedAt = elapsed;
    plot.health = 100;
    plot.pests = 0;
    plot.weeds = 0;
    plot.growthProgress = 0;

    // Réduire légèrement la fertilité du sol
    plot.soilQuality.fertility = Math.max(0, plot.soilQuality.fertility - 5);

    this.paintField(plot);

    // Si la culture est illégale, risque de raid
    if (crop.illegal) {
      const raidChance = plot.concealed ? 0.3 : 0.7;
      if (Math.random() < raidChance) {
        // Déclencher un raid de la SQ
        const raidEvent: FarmEvent = {
          id: `raid_${++this.lastEventId}_${Date.now()}`,
          type: "raid",
          plotId: plot.id,
          time: elapsed,
          severity: 100,
          resolved: false,
        };
        this.events.set(raidEvent.id, raidEvent);

        // Ajouter des points de wanted au joueur
        addWantedPoints(playerId, 50, `Culture illégale de ${crop.label}`);

        return {
          ok: true,
          notice: `Récolte de ${crop.label} ×${actualYield} · RAID DE LA SQ !`,
          loot: { id: crop.yieldId, n: actualYield },
          illegalSow: true,
          seized: true,
          wantedPoints: 50,
        };
      }
    }

    return {
      ok: true,
      notice: `Récolte · ${crop.label} ×${actualYield}`,
      loot: { id: crop.yieldId, n: actualYield },
      illegalSow: crop.illegal,
    };
  }

  /**
   * Arroser une parcelle
   */
  waterPlot(plotId: string, waterAmount: number = 10): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    if (!plot.crop || plot.stage === "friche" || plot.stage === "laboure") {
      return { ok: false, notice: "Rien à arroser." };
    }

    const crop = CROPS[plot.crop];

    // Mettre à jour le dernier arrosage
    plot.lastWatered = Date.now();

    // Améliorer la santé et la croissance
    plot.health = Math.min(100, plot.health + 5);
    plot.growthProgress = Math.min(1, plot.growthProgress + 0.05);

    // Réduire les nuisibles
    plot.pests = Math.max(0, plot.pests - 10);

    // Mettre à jour l'affichage
    this.paintField(plot);

    return {
      ok: true,
      notice: `Arrosage · ${crop.label}`,
      consumeWater: waterAmount,
    };
  }

  /**
   * Fertiliser une parcelle
   */
  fertilizePlot(plotId: string, fertilizerAmount: number = 1): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    if (!plot.crop || plot.stage === "friche" || plot.stage === "laboure") {
      return { ok: false, notice: "Rien à fertiliser." };
    }

    // Mettre à jour le dernier fertilisation
    plot.lastFertilized = Date.now();

    // Améliorer la fertilité du sol
    plot.soilQuality.fertility = Math.min(100, plot.soilQuality.fertility + 10);

    // Améliorer la santé et la croissance
    plot.health = Math.min(100, plot.health + 10);
    plot.growthProgress = Math.min(1, plot.growthProgress + 0.1);

    // Réduire les mauvaises herbes
    plot.weeds = Math.max(0, plot.weeds - 20);

    // Mettre à jour l'affichage
    this.paintField(plot);

    return {
      ok: true,
      notice: `Fertilisation · ${plot.crop ? CROPS[plot.crop].label : "parcelle"}`,
      consumeFertilizer: fertilizerAmount,
    };
  }

  /**
   * Traiter les nuisibles
   */
  treatPests(plotId: string, pesticideAmount: number = 1): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    if (!plot.crop || plot.stage === "friche" || plot.stage === "laboure") {
      return { ok: false, notice: "Rien à traiter." };
    }

    // Réduire les nuisibles
    plot.pests = Math.max(0, plot.pests - 30);

    // Légère amélioration de la santé
    plot.health = Math.min(100, plot.health + 5);

    this.paintField(plot);

    return {
      ok: true,
      notice: `Traitement contre les nuisibles · ${plot.crop ? CROPS[plot.crop].label : "parcelle"}`,
    };
  }

  /**
   * Désherber une parcelle
   */
  weedPlot(plotId: string): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    if (!plot.crop || plot.stage === "friche" || plot.stage === "laboure") {
      return { ok: false, notice: "Rien à désherber." };
    }

    // Réduire les mauvaises herbes
    plot.weeds = Math.max(0, plot.weeds - 40);

    // Légère amélioration de la santé
    plot.health = Math.min(100, plot.health + 5);

    this.paintField(plot);

    return {
      ok: true,
      notice: `Désherbage · ${plot.crop ? CROPS[plot.crop].label : "parcelle"}`,
    };
  }

  /**
   * Installer un système d'irrigation
   */
  installIrrigation(plotId: string): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    if (plot.irrigation) {
      return { ok: false, notice: "Système d'irrigation déjà installé." };
    }

    plot.irrigation = true;
    this.paintField(plot);

    return {
      ok: true,
      notice: `Système d'irrigation installé · ${plot.name}`,
    };
  }

  /**
   * Construire une serre (pour les cultures illégales)
   */
  buildGreenhouse(plotId: string): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    if (!plot.illegal || !plot.crop) {
      return { ok: false, notice: "Seulement pour les cultures illégales." };
    }

    if (plot.concealed) {
      return { ok: false, notice: "Une serre est déjà installée." };
    }

    // Créer la serre
    plot.concealed = true;
    plot.heat = 0.08; // Réduire la chaleur initiale

    // Reconstruire le champ avec la serre
    this.paintField(plot);

    return {
      ok: true,
      notice: `Serre construite · culture cachée`,
    };
  }

  /**
   * Détruire une serre
   */
  destroyGreenhouse(plotId: string): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    if (!plot.concealed) {
      return { ok: false, notice: "Aucune serre à détruire." };
    }

    plot.concealed = false;
    plot.heat = 0.22; // Augmenter la chaleur (visible)

    // Reconstruire le champ sans la serre
    this.paintField(plot);

    return {
      ok: true,
      notice: `Serre détruite · culture exposée`,
    };
  }

  /**
   * Vérifie si une culture peut pousser en cette saison
   */
  canGrowInSeason(cropId: CropId, season: Season): boolean {
    const crop = CROPS[cropId];
    return crop.season.includes(season);
  }

  /**
   * Met à jour toutes les parcelles (à appeler régulièrement)
   */
  tick(dt: number, elapsed: number, playerX: number, playerZ: number): FieldPlot | null {
    // Mettre à jour la météo
    this.updateWeather(elapsed);

    let raidPlot: FieldPlot | null = null;

    // Mettre à jour chaque parcelle
    for (const plot of this.plots.values()) {
      // Mettre à jour la croissance des cultures
      if (plot.crop && (plot.stage === "seme" || plot.stage === "pousse")) {
        this.updateCropGrowth(plot, dt, elapsed);
      }

      // Mettre à jour les nuisibles et mauvaises herbes
      this.updatePestsAndWeeds(plot, dt);

      // Mettre à jour la chaleur pour les cultures illégales
      if (plot.illegal && plot.crop === "cannabis" && plot.stage !== "friche") {
        this.updateHeat(plot, dt, playerX, playerZ);
        if (plot.heat > 1 && Math.random() < dt * 0.4) {
          raidPlot = plot;
        }
      }

      // Mettre à jour les événements (raids, etc.)
      this.updateEvents(plot, dt, elapsed);
    }

    return raidPlot;
  }

  /**
   * Met à jour la croissance d'une culture
   */
  private updateCropGrowth(plot: FieldPlot, dt: number, elapsed: number): void {
    if (!plot.crop) return;

    const crop = CROPS[plot.crop];

    // Calculer le temps écoulé depuis la plantation
    const timeSincePlanted = elapsed - plot.plantedAt;

    // Calculer la progression de croissance (0-1)
    const oldProgress = plot.growthProgress;
    plot.growthProgress = Math.min(1, timeSincePlanted / crop.growTime);

    // Si la progression a changé, mettre à jour l'affichage
    if (Math.floor(oldProgress * 10) !== Math.floor(plot.growthProgress * 10)) {
      this.paintField(plot);
    }

    // Passer à l'étape suivante si la croissance est complète
    if (plot.stage === "seme" && plot.growthProgress >= 0.3) {
      plot.stage = "pousse";
      this.paintField(plot);
    } else if (plot.stage === "pousse" && plot.growthProgress >= 1) {
      plot.stage = "mur";
      this.paintField(plot);
    }

    // Appliquer les effets de la météo
    this.applyWeatherEffects(plot, dt);
  }

  /**
   * Applique les effets de la météo sur une parcelle
   */
  private applyWeatherEffects(plot: FieldPlot, dt: number): void {
    if (!plot.crop) return;

    const crop = CROPS[plot.crop];
    const weather = this.currentWeather;

    // Effets de la température
    if (weather.temperature < crop.minTemperature) {
      // Gel : ralentir la croissance et réduire la santé
      plot.growthProgress = Math.max(0, plot.growthProgress - dt * 0.00001);
      plot.health = Math.max(0, plot.health - dt * 0.01);
    } else if (weather.temperature > crop.maxTemperature) {
      // Canicule : réduire la santé
      plot.health = Math.max(0, plot.health - dt * 0.005);
    } else {
      // Température idéale : accélérer légèrement la croissance
      plot.growthProgress = Math.min(1, plot.growthProgress + dt * 0.000005);
    }

    // Effets de la pluie
    if (weather.condition === "pluie") {
      if (weather.precipitation > 0) {
        // Pluie bénéfique pour la plupart des cultures
        plot.growthProgress = Math.min(1, plot.growthProgress + dt * 0.00001 * weather.precipitation);
        plot.health = Math.min(100, plot.health + dt * 0.001);
        plot.soilQuality.moisture = Math.min(100, plot.soilQuality.moisture + dt * 0.01);
      }
    } else if (weather.condition === "neige") {
      // Neige : gel et ralentissement
      plot.growthProgress = Math.max(0, plot.growthProgress - dt * 0.00002);
      plot.health = Math.max(0, plot.health - dt * 0.02);
    } else if (weather.condition === "soleil") {
      // Soleil : bon pour la photosynthèse, mais peut assécher
      plot.growthProgress = Math.min(1, plot.growthProgress + dt * 0.00001);
      plot.soilQuality.moisture = Math.max(0, plot.soilQuality.moisture - dt * 0.005);
    }

    // Effets du vent
    if (weather.windSpeed > 30) {
      // Vent fort : risque de dommages
      if (Math.random() < dt * 0.0001) {
        plot.health = Math.max(0, plot.health - 5);
        plot.growthProgress = Math.max(0, plot.growthProgress - 0.05);
      }
    }

    // Effets de l'humidité du sol
    if (plot.soilQuality.moisture < 30) {
      // Sécheresse : ralentir la croissance
      plot.growthProgress = Math.max(0, plot.growthProgress - dt * 0.00001);
      plot.health = Math.max(0, plot.health - dt * 0.005);
    } else if (plot.soilQuality.moisture > 80) {
      // Excès d'eau : risque de pourriture
      if (Math.random() < dt * 0.0001) {
        plot.health = Math.max(0, plot.health - 10);
      }
    }
  }

  /**
   * Met à jour les nuisibles et mauvaises herbes
   */
  private updatePestsAndWeeds(plot: FieldPlot, dt: number): void {
    if (!plot.crop || plot.stage === "friche" || plot.stage === "laboure") return;

    const crop = CROPS[plot.crop];

    // Croissance des nuisibles
    if (plot.pests < 100) {
      const pestGrowthRate = 0.00001 * dt * (100 - crop.pestResistance) / 100;
      plot.pests = Math.min(100, plot.pests + pestGrowthRate);
    }

    // Croissance des mauvaises herbes
    if (plot.weeds < 100) {
      const weedGrowthRate = 0.00002 * dt;
      plot.weeds = Math.min(100, plot.weeds + weedGrowthRate);
    }

    // Effets des nuisibles sur la santé
    if (plot.pests > 50) {
      plot.health = Math.max(0, plot.health - dt * 0.001 * (plot.pests / 100));
    }

    // Effets des mauvaises herbes sur la croissance
    if (plot.weeds > 50) {
      plot.growthProgress = Math.max(0, plot.growthProgress - dt * 0.00001 * (plot.weeds / 100));
    }
  }

  /**
   * Met à jour la chaleur (heat) pour les cultures illégales
   */
  private updateHeat(plot: FieldPlot, dt: number, playerX: number, playerZ: number): void {
    if (!plot.illegal || plot.crop !== "cannabis") return;

    const near = Math.hypot(playerX - plot.x, playerZ - plot.z) < 55;
    const roadside = plot.z > -110; // Proche de la route (A-40)
    const rate = plot.concealed
      ? near ? 0.02 : 0.007
      : roadside ? (near ? 0.055 : 0.03) : near ? 0.04 : 0.016;

    plot.heat += dt * rate;

    // Réduire la chaleur si la culture est cachée
    if (plot.concealed) {
      plot.heat = Math.max(0, plot.heat - dt * 0.0001);
    }
  }

  /**
   * Met à jour les événements (raids, etc.)
   */
  private updateEvents(plot: FieldPlot, dt: number, elapsed: number): void {
    // Vérifier les raids en cours
    for (const [eventId, event] of this.events) {
      if (!event.resolved && event.plotId === plot.id && event.type === "raid") {
        // Après un certain temps, le raid est résolu
        if (elapsed - event.time > 5 * 60 * 1000) { // 5 minutes
          event.resolved = true;

          // Saisir la parcelle
          this.seizeField(plot);

          // Notifier le joueur
          console.log(`[FarmManager] Raid terminé sur ${plot.name}. La parcelle a été saisie.`);
        }
      }
    }
  }

  /**
   * Saisir une parcelle (après un raid)
   */
  seizeField(plot: FieldPlot): void {
    plot.stage = "friche";
    plot.crop = null;
    plot.illegal = plot.concealed;
    plot.heat = 0;
    plot.plantedAt = 0;
    plot.harvestedAt = 0;
    plot.health = 100;
    plot.pests = 0;
    plot.weeds = 0;
    plot.growthProgress = 0;

    // Détruire la serre si elle existe
    if (plot.concealed) {
      plot.concealed = false;
    }

    this.paintField(plot);
  }

  /**
   * Peindre une parcelle (mettre à jour son apparence)
   */
  paintField(plot: FieldPlot): void {
    const g = plot.group;
    while (g.children.length) {
      g.remove(g.children[0]!);
    }

    const y = getTerrainHeight(plot.x, plot.z);

    // Sol
    const soil = new THREE.Mesh(
      getGeo("box", { w: plot.w, h: 0.09, d: plot.d }),
      matLib.get(soilColor(plot.stage, plot.illegal), 1, 0)
    );
    soil.position.y = 0.045;
    soil.receiveShadow = true;
    g.add(soil);

    // Ajouter les éléments selon l'état
    if (plot.stage === "friche") {
      this.addWeeds(g, plot);
    }
    if (plot.stage === "laboure" || plot.stage === "seme") {
      this.addFurrows(g, plot);
    }

    const spec = plot.crop ? CROPS[plot.crop] : null;
    if (spec && plot.stage !== "friche" && plot.stage !== "laboure") {
      this.plantCrop(g, plot, spec, plot.growthProgress);
    }

    if (!plot.concealed) {
      this.addFence(g, plot);
      this.addSign(g, plot, spec);
    } else {
      // Ajouter une bâche pour cacher la culture
      const tarp = new THREE.Mesh(
        getGeo("box", { w: plot.w * 0.8, h: 0.04, d: plot.d * 0.8 }),
        matLib.get(0x2a3228, 0.95, 0)
      );
      tarp.position.set(0, 0.08, 0);
      g.add(tarp);

      // Ajouter une serre
      if (plot.crop === "cannabis") {
        plot.greenhouse = this.hoopHouse(plot.w * 0.7, plot.d * 0.75);
        g.add(plot.greenhouse);
      }
    }

    g.position.set(plot.x, y, plot.z);
    g.rotation.y = plot.yaw;
  }

  /**
   * Ajoute des mauvaises herbes
   */
  private addWeeds(g: THREE.Group, plot: FieldPlot): void {
    const n = 14;
    const geo = getGeo("cone", { r: 0.18, h: 0.32, seg: 5 });
    const mesh = new THREE.InstancedMesh(
      geo,
      matLib.get(plot.illegal ? 0x3a5a32 : 0x4a6a38, 1, 0),
      n
    );
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      dummy.position.set(
        Math.cos(a) * plot.w * 0.32,
        0.16,
        Math.sin(a * 1.7) * plot.d * 0.32
      );
      dummy.rotation.set(0, a, 0);
      dummy.scale.setScalar(0.7 + (i % 4) * 0.18);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    g.add(mesh);
  }

  /**
   * Ajoute des sillons
   */
  private addFurrows(g: THREE.Group, plot: FieldPlot): void {
    const n = Math.max(5, Math.floor(plot.w / 1.15));
    const geo = getGeo("box", { w: 0.2, h: 0.06, d: plot.d * 0.92 });
    const mesh = new THREE.InstancedMesh(
      geo,
      matLib.get(0x3a2818, 1, 0),
      n
    );
    mesh.receiveShadow = true;
    for (let i = 0; i < n; i++) {
      dummy.position.set(
        (i - (n - 1) / 2) * (plot.w / n),
        0.06,
        0
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    g.add(mesh);
  }

  /**
   * Ajoute une clôture
   */
  private addFence(g: THREE.Group, plot: FieldPlot): void {
    const posts: Array<[number, number]> = [];
    const step = 5.2;
    for (let x = -plot.w / 2; x <= plot.w / 2 + 0.01; x += step) {
      posts.push([x, -plot.d / 2], [x, plot.d / 2]);
    }
    for (let z = -plot.d / 2 + step; z < plot.d / 2; z += step) {
      posts.push([-plot.w / 2, z], [plot.w / 2, z]);
    }
    const geo = getGeo("cylinder", { r: 0.07, r2: 0.09, h: 1.15, seg: 5 });
    const mesh = new THREE.InstancedMesh(
      geo,
      matLib.get(0x6a5a48, 0.92, 0),
      posts.length
    );
    mesh.castShadow = true;
    posts.forEach(([x, z], i) => {
      dummy.position.set(x, 0.55, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    g.add(mesh);

    const railMat = matLib.get(0x5a4a3a, 0.9, 0);
    for (const z of [-plot.d / 2, plot.d / 2]) {
      const rail = new THREE.Mesh(
        getGeo("box", { w: plot.w, h: 0.06, d: 0.05 }),
        railMat
      );
      rail.position.set(0, 0.72, z);
      g.add(rail);
    }
    for (const x of [-plot.w / 2, plot.w / 2]) {
      const rail = new THREE.Mesh(
        getGeo("box", { w: 0.05, h: 0.06, d: plot.d }),
        railMat
      );
      rail.position.set(x, 0.72, 0);
      g.add(rail);
    }
  }

  /**
   * Ajoute un panneau
   */
  private addSign(g: THREE.Group, plot: FieldPlot, spec: CropSpec | null): void {
    const post = new THREE.Mesh(
      getGeo("box", { w: 0.08, h: 1.25, d: 0.08 }),
      matLib.get(0x5a4030, 0.9)
    );
    post.position.set(0, 0.62, plot.d / 2 + 0.45);
    const board = new THREE.Mesh(
      getGeo("box", { w: 0.95, h: 0.38, d: 0.05 }),
      matLib.get(
        spec ? cropTint(spec, plot.stage) : 0x6a5a40,
        0.82
      )
    );
    board.position.set(0, 1.18, plot.d / 2 + 0.45);
    g.add(post, board);
  }

  /**
   * Plante une culture
   */
  private plantCrop(
    g: THREE.Group,
    plot: FieldPlot,
    spec: CropSpec,
    growthProgress: number = 1
  ): void {
    const stageMul = plot.stage === "seme"
      ? 0.16
      : plot.stage === "pousse"
        ? 0.5 + (growthProgress - 0.3) * (1 / 0.7)
        : 1;

    const h = Math.max(0.08, spec.height * stageMul);
    const rows = Math.max(4, Math.floor(plot.w / 2.05));
    const cols = Math.max(4, Math.floor(plot.d / 1.85));
    const n = rows * cols;
    const tint = cropTint(spec, plot.stage);

    let geo: THREE.BufferGeometry;
    if (spec.id === "mais") {
      geo = getGeo("cylinder", { r: 0.055, r2: 0.08, h, seg: 5 });
    } else if (spec.id === "cannabis") {
      geo = getGeo("icosa", { r: 0.34 * stageMul + 0.14 });
    } else if (spec.id === "patate") {
      geo = getGeo("sphere", { r: 0.26 * stageMul + 0.1, seg: 6, segH: 4 });
    } else if (spec.id === "foin") {
      geo = getGeo("box", { w: 1.55, h, d: 1.55 });
    } else {
      geo = getGeo("box", { w: 0.2, h, d: 0.07 });
    }

    const mesh = new THREE.InstancedMesh(
      geo,
      matLib.get(tint, 0.92, 0),
      n
    );
    mesh.castShadow = plot.stage !== "seme";
    mesh.receiveShadow = true;

    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lx = (r - (rows - 1) / 2) * (plot.w / rows) * 0.92;
        const lz = (c - (cols - 1) / 2) * (plot.d / cols) * 0.9;
        const y = spec.id === "patate" || spec.id === "cannabis"
          ? h * 0.38
          : h / 2;

        dummy.position.set(lx, y, lz);
        dummy.rotation.set(0, (r * 13 + c * 7) * 0.04, 0);
        dummy.scale.setScalar(0.82 + ((r * 3 + c) % 5) * 0.07);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    g.add(mesh);

    // Ajouter des détails spécifiques selon la culture et l'étape
    if (plot.stage === "mur" && spec.id === "foin") {
      const baleGeo = getGeo("cylinder", { r: 0.72, r2: 0.72, h: 1.25, seg: 8 });
      const bales = new THREE.InstancedMesh(
        baleGeo,
        matLib.get(0xc4a44a, 0.95, 0),
        5
      );
      bales.castShadow = true;
      for (let b = 0; b < 5; b++) {
        dummy.position.set((b - 2) * 3.2, 0.72, plot.d * 0.28);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bales.setMatrixAt(b, dummy.matrix);
      }
      g.add(bales);
    }

    if (plot.stage === "mur" && spec.id === "mais") {
      const earGeo = getGeo("box", { w: 0.1, h: 0.22, d: 0.1 });
      const ears = new THREE.InstancedMesh(
        earGeo,
        matLib.get(0xe8c84a, 0.7, 0),
        rows
      );
      ears.castShadow = true;
      for (let r = 0; r < rows; r++) {
        dummy.position.set(
          (r - (rows - 1) / 2) * (plot.w / rows) * 0.92,
          h * 0.72,
          0
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        ears.setMatrixAt(r, dummy.matrix);
      }
      g.add(ears);
    }
  }

  /**
   * Construire une serre (hoop house)
   */
  private hoopHouse(w: number, d: number): THREE.Group {
    const g = new THREE.Group();
    const cover = new THREE.Mesh(
      getGeo("cylinder", { r: w * 0.48, r2: w * 0.48, h: d * 0.92, seg: 10, open: true }),
      matLib.glass(0x7a9a72, 0.22)
    );
    cover.rotation.x = Math.PI / 2;
    cover.position.y = w * 0.22;
    cover.scale.set(1, 0.55, 1);
    g.add(cover);

    const frameMat = matLib.get(0x8a8a82, 0.45, 0.35);
    for (const z of [-d * 0.35, 0, d * 0.35]) {
      const rib = new THREE.Mesh(
        getGeo("torus", { r: w * 0.42, tube: 0.05, seg: 10 }),
        frameMat
      );
      rib.rotation.y = Math.PI / 2;
      rib.position.set(0, w * 0.12, z);
      rib.scale.set(1, 0.55, 1);
      g.add(rib);
    }
    return g;
  }

  /**
   * Construire un tracteur
   */
  buildTractor(seed: number): THREE.Group {
    const g = new THREE.Group();
    g.name = "tracteur";

    const body = new THREE.Mesh(
      getGeo("box", { w: 1.7, h: 1.05, d: 2.6 }),
      matLib.get(seed % 2 === 0 ? 0x8a2020 : 0x2a6a38, 0.55, 0.2)
    );
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);

    const cabin = new THREE.Mesh(
      getGeo("box", { w: 1.35, h: 1.05, d: 1.1 }),
      matLib.get(0x1a1a1e, 0.4, 0.25)
    );
    cabin.position.set(0, 2.05, -0.15);
    cabin.castShadow = true;
    g.add(cabin);

    const glass = new THREE.Mesh(
      getGeo("box", { w: 1.2, h: 0.7, d: 0.08 }),
      matLib.glass(0x88aacc, 0.35)
    );
    glass.position.set(0, 2.15, 0.42);
    g.add(glass);

    const wheelGeo = getGeo("cylinder", { r: 0.55, r2: 0.55, h: 0.32, seg: 8 });
    const tire = matLib.get(0x1a1a1c, 0.95, 0);

    for (const [x, z, s] of [
      [-0.85, 0.85, 1],
      [0.85, 0.85, 1],
      [-0.9, -0.95, 1.25],
      [0.9, -0.95, 1.25],
    ] as const) {
      const w = new THREE.Mesh(wheelGeo, tire);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.55 * s, z);
      w.scale.setScalar(s);
      w.castShadow = true;
      g.add(w);
    }

    const stack = new THREE.Mesh(
      getGeo("cylinder", { r: 0.08, r2: 0.1, h: 0.9, seg: 6 }),
      matLib.get(0x3a3a3e, 0.5, 0.4)
    );
    stack.position.set(0.35, 2.05, 0.9);
    g.add(stack);

    return g;
  }

  /**
   * Placer une ferme
   */
  private placeFarmstead(parent: THREE.Group, farm: FarmDef): void {
    const hit = nearestRoadHit(farm.x, farm.z);
    const yaw = hit ? Math.atan2(hit.x - farm.x, hit.z - farm.z) : farm.yaw;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const y = getTerrainHeight(farm.x, farm.z);

    // Cour de ferme
    const yard = new THREE.Mesh(
      getGeo("box", { w: 22, h: 0.07, d: 16 }),
      matLib.get(0x6a5a42, 1, 0)
    );
    yard.position.set(farm.x, y + 0.03, farm.z);
    yard.rotation.y = yaw;
    yard.receiveShadow = true;
    parent.add(yard);

    // Entrée
    const driveLen = hit ? Math.min(14, Math.max(7, hit.dist - 4.2)) : 10;
    const drive = new THREE.Mesh(
      getGeo("box", { w: 3.2, h: 0.05, d: driveLen }),
      matLib.get(0x5a4a38, 1, 0)
    );
    const dx = farm.x + fx * (driveLen / 2 + 3.2);
    const dz = farm.z + fz * (driveLen / 2 + 3.2);
    drive.position.set(dx, getTerrainHeight(dx, dz) + 0.025, dz);
    drive.rotation.y = yaw;
    drive.receiveShadow = true;
    parent.add(drive);

    // Maison
    const house = buildMaisonCanadienne(farm.village.length * 17 + farm.id.length, 0);
    attachScenicHeat(house, "poele", yaw);
    house.position.set(farm.x, y, farm.z);
    house.rotation.y = yaw;
    parent.add(house);

    // Grange
    const barnX = farm.x + rx * 16 - fx * 3;
    const barnZ = farm.z + rz * 16 - fz * 3;
    const barn = buildGrange(2100 + farm.id.length * 13);
    barn.position.set(barnX, getTerrainHeight(barnX, barnZ), barnZ);
    barn.rotation.y = yaw + 0.08;
    parent.add(barn);

    // Tracteur
    const tx = farm.x + rx * 6 + fx * 5;
    const tz = farm.z + rz * 6 + fz * 5;
    const tractor = this.buildTractor(farm.id.length);
    tractor.position.set(tx, getTerrainHeight(tx, tz) + 0.02, tz);
    tractor.rotation.y = yaw + 0.5;
    parent.add(tractor);
  }

  /**
   * Monte toutes les fermes dans la scène
   */
  mountFarms(parent: THREE.Group): FieldPlot[] {
    const plots: FieldPlot[] = [];

    for (const raw of FARMSTEADS) {
      const river = RIVER_RANGS.some((r) => r.farmId === raw.id);
      const farm = raw.hidden || river
        ? raw
        : { ...raw, ...pushOffRoad(raw.x, raw.z, 18) };

      if (!farm.hidden) {
        this.placeFarmstead(parent, farm);
      }

      // Créer les parcelles
      for (let p = 0; p < farm.plots.length; p++) {
        const def = farm.plots[p]!;
        const px = farm.x + Math.cos(farm.yaw) * def.ox - Math.sin(farm.yaw) * def.oz;
        const pz = farm.z + Math.sin(farm.yaw) * def.ox + Math.cos(farm.yaw) * def.oz;

        const plot: FieldPlot = {
          id: `${farm.id}_p${p}`,
          name: farm.hidden ? farm.name : `${farm.name} · ${farm.village}`,
          village: farm.village,
          x: px,
          z: pz,
          yaw: farm.yaw,
          w: def.w,
          d: def.d,
          illegal: Boolean(farm.hidden),
          concealed: Boolean(farm.hidden),
          heat: 0,
          stage: def.stage ?? "friche",
          crop: def.crop ?? (def.stage && def.stage !== "friche" && def.stage !== "laboure" ? farm.crop : null),
          plantedAt: 0,
          harvestedAt: 0,
          lastWatered: 0,
          lastFertilized: 0,
          soilType: def.soilType ?? farm.soilType ?? "limon",
          soilQuality: { ...SOIL_QUALITIES[def.soilType ?? farm.soilType ?? "limon"] },
          growthProgress: 0,
          health: 100,
          pests: 0,
          weeds: 0,
          irrigation: false,
          group: new THREE.Group(),
        };

        plot.group.name = plot.id;
        this.paintField(plot);
        parent.add(plot.group);
        this.plots.set(plot.id, plot);
        plots.push(plot);
      }
    }

    return plots;
  }

  /**
   * Récupère les parcelles les plus proches
   */
  nearestField(x: number, z: number, max: number = 12): FieldPlot | null {
    let best: FieldPlot | null = null;
    let bestD = 1e9;

    for (const p of this.plots.values()) {
      if (!this.insidePlot(p, x, z, Math.max(3.2, max * 0.25))) continue;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }

    return best;
  }

  /**
   * Vérifie si un point est à l'intérieur d'une parcelle
   */
  insidePlot(plot: FieldPlot, x: number, z: number, pad: number = 3.2): boolean {
    const dx = x - plot.x;
    const dz = z - plot.z;
    const c = Math.cos(-plot.yaw);
    const s = Math.sin(-plot.yaw);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    return Math.abs(lx) <= plot.w / 2 + pad && Math.abs(lz) <= plot.d / 2 + pad;
  }

  /**
   * Récupère les fermes légales (pour l'interface)
   */
  legalFarmsteads(): Array<{ id: string; name: string; village: string; x: number; z: number; yaw: number }> {
    return [...this.farms.values()]
      .filter((f) => !f.hidden)
      .map((f) => ({
        id: f.id,
        name: f.name,
        village: f.village,
        x: f.x,
        z: f.z,
        yaw: f.yaw,
      }));
  }

  /**
   * Récupère les zones de défrichage
   */
  farmClearings(): Array<{ x: number; z: number; r: number }> {
    const out: Array<{ x: number; z: number; r: number }> = [];

    for (const farm of this.farms.values()) {
      out.push({ x: farm.x, z: farm.z, r: farm.hidden ? 28 : 36 });
      for (const p of farm.plots) {
        const x = farm.x + Math.cos(farm.yaw) * p.ox - Math.sin(farm.yaw) * p.oz;
        const z = farm.z + Math.sin(farm.yaw) * p.ox + Math.cos(farm.yaw) * p.oz;
        out.push({ x, z, r: Math.max(p.w, p.d) * 0.55 + 8 });
      }
    }

    return out;
  }

  /**
   * Récupère les marques de carte pour les champs
   */
  farmMapMarks(): Array<{ x: number; z: number; w: number; d: number; yaw: number; illegal: boolean }> {
    const out: Array<{ x: number; z: number; w: number; d: number; yaw: number; illegal: boolean }> = [];

    for (const farm of this.farms.values()) {
      for (const p of farm.plots) {
        const x = farm.x + Math.cos(farm.yaw) * p.ox - Math.sin(farm.yaw) * p.oz;
        const z = farm.z + Math.sin(farm.yaw) * p.ox + Math.cos(farm.yaw) * p.oz;
        out.push({
          x,
          z,
          w: p.w,
          d: p.d,
          yaw: farm.yaw,
          illegal: Boolean(farm.hidden)
        });
      }
    }

    return out;
  }

  /**
   * Récupère le message d'interaction pour une parcelle
   */
  fieldPrompt(plot: FieldPlot, tool: FarmTool | null, seed: CropId | null): string {
    if (plot.stage === "friche") {
      return tool === "pelle"
        ? `E — Labourer · ${plot.name}`
        : `Pelle pour labourer · ${plot.name}`;
    }

    if (plot.stage === "laboure") {
      if (!seed) {
        return `E — Semer · choisissez des graines`;
      }
      const spec = CROPS[seed];
      return spec.illegal
        ? `E — Semer ${spec.label} (illégal · art. 12 LEC)`
        : `E — Semer ${spec.label}`;
    }

    if (plot.stage === "seme" || plot.stage === "pousse") {
      const label = plot.crop ? CROPS[plot.crop].label : "culture";
      const heat = plot.illegal
        ? ` · SQ ${Math.min(99, Math.round(plot.heat * 100))}%`
        : "";
      return tool === "rateau" || tool === "pelle"
        ? `E — Binage · ${label}${heat}`
        : `Râteau pour travailler · ${label}`;
    }

    const label = plot.crop ? CROPS[plot.crop].label : "récolte";
    return `E — Récolter ${label}`;
  }

  /**
   * Travailler une parcelle (version simplifiée pour la compatibilité)
   */
  workField(
    plot: FieldPlot,
    tool: FarmTool | null,
    seed: CropId | null,
    elapsed: number
  ): FieldWorkResult {
    return this.workPlot(plot.id, tool, seed, "player_1", elapsed);
  }

  /**
   * Met à jour les champs (version simplifiée pour la compatibilité)
   */
  tickFields(plots: FieldPlot[], dt: number, elapsed: number, px: number, pz: number): FieldPlot | null {
    this.updateWeather(elapsed);
    return this.tick(dt, elapsed, px, pz);
  }

  /**
   * Saisir une parcelle (version simplifiée pour la compatibilité)
   */
  seizeField(plot: FieldPlot): void {
    const farmPlot = this.getPlot(plot.id);
    if (farmPlot) {
      this.seizeField(farmPlot);
    }
  }
}

// ==========================================
// 🌾 4. FONCTIONS UTILITAIRES (Compatibilité Ascendante)
// ==========================================

/** Obtient une couleur de sol selon l'étape et si c'est illégal */
function soilColor(stage: FieldStage, illegal: boolean): number {
  if (stage === "friche") return illegal ? 0x3a4a32 : 0x4a5a38;
  if (stage === "laboure") return 0x4a3525;
  if (illegal) return 0x3a4a28;
  if (stage === "mur") return 0x4a3a22;
  return 0x4a3525;
}

/** Obtient une teinte de culture selon l'étape */
function cropTint(spec: CropSpec, stage: FieldStage): number {
  if (stage === "seme") return 0x3a5a28;
  if (stage === "pousse" && spec.id !== "foin") return spec.id === "cannabis" ? 0x245828 : 0x4a7a30;
  return spec.color;
}

/** Convertit un offset local en coordonnées mondiales */
function localOffset(plot: FieldPlot, x: number, z: number): { lx: number; lz: number } {
  const dx = x - plot.x;
  const dz = z - plot.z;
  const c = Math.cos(-plot.yaw);
  const s = Math.sin(-plot.yaw);
  return { lx: dx * c - dz * s, lz: dx * s + dz * c };
}

// Instance globale du gestionnaire de fermes
export const farmManager = new FarmManager();
