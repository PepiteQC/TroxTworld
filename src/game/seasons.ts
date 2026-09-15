/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME DES SAISONS QUÉBÉCOISES — ETHERWORLD QC
 * ═══════════════════════════════════════════════════════════════════
 *
 * Météo québécoise réaliste :
 *  - Tempêtes de neige, poudrerie, verglas, froids polaires (-32°C)
 *  - Déneigement MTQ (Route 138) et grattes privées
 *  - Adhérence dynamique sur l'asphalte (friction de 0.18 à 1.0)
 * ═══════════════════════════════════════════════════════════════════
 */

export type WeatherId = "clear" | "rain" | "snow" | "fog" | "storm";
export type QuebecSeason = "printemps" | "ete" | "automne" | "hiver";

export type WeatherCondition =
  | "ensoleille"
  | "nuageux"
  | "pluie_fine"
  | "orage_ete"
  | "poudrerie"
  | "tempete_neige"
  | "verglas"
  | "froid_polaire";

export interface SnowPlowTruck {
  id: string;
  name: string;
  driverName: string;
  isMTQ: boolean;
  assignedRoute: string;
  active: boolean;
  saltSpreaderOn: boolean;
  progressPercent: number;
}

export type SnowPlowStatus = "idle" | "en_cours" | "routes_dégagées" | "alerte_blizzard";

export interface QuebecWeatherState {
  season: QuebecSeason;
  condition: WeatherCondition;
  temperatureCelsius: number;
  windSpeedKmH: number;
  snowAccumulationCm: number;
  roadFrictionCoeff: number;
  snowPlowStatus: SnowPlowStatus;
  plows: SnowPlowTruck[];
  lastUpdated: number;
}

export const CONDITION_LABEL: Record<WeatherCondition, string> = {
  ensoleille: "Ensoleillé",
  nuageux: "Nuageux",
  pluie_fine: "Pluie fine",
  orage_ete: "Orage d'été",
  poudrerie: "Poudrerie",
  tempete_neige: "Tempête de neige",
  verglas: "Verglas",
  froid_polaire: "Froid polaire",
};

export const SEASON_LABEL: Record<QuebecSeason, string> = {
  printemps: "Printemps",
  ete: "Été",
  automne: "Automne",
  hiver: "Hiver",
};

export const PLOW_STATUS_LABEL: Record<SnowPlowStatus, string> = {
  idle: "Repos",
  en_cours: "Déneigement en cours",
  "routes_dégagées": "Routes dégagées",
  alerte_blizzard: "Alerte blizzard",
};

const DEFAULT_PLOWS: SnowPlowTruck[] = [
  {
    id: "mtq_charrue_138",
    name: "Chasse-neige MTQ Mack #401",
    driverName: "Ghislain Lévesque",
    isMTQ: true,
    assignedRoute: "Route 138 Portneuf — Pont-Rouge",
    active: false,
    saltSpreaderOn: false,
    progressPercent: 0,
  },
  {
    id: "prive_gratte_ford",
    name: "Ford F-350 gratte privée",
    driverName: "Sylvain Bureau",
    isMTQ: false,
    assignedRoute: "Rangs de Saint-Alban & entrées privées",
    active: false,
    saltSpreaderOn: false,
    progressPercent: 0,
  },
];

export function seasonFromMonth(month: number): QuebecSeason {
  if (month <= 2 || month === 12) return "hiver";
  if (month <= 5) return "printemps";
  if (month <= 8) return "ete";
  return "automne";
}

export function weatherIdFromCondition(c: WeatherCondition): WeatherId {
  if (c === "ensoleille") return "clear";
  if (c === "nuageux") return "fog";
  if (c === "pluie_fine") return "rain";
  if (c === "orage_ete" || c === "tempete_neige" || c === "verglas") return "storm";
  return "snow";
}

export function conditionFromWeather(id: WeatherId, season: QuebecSeason): WeatherCondition {
  if (id === "rain") return "pluie_fine";
  if (id === "fog") return "nuageux";
  if (id === "clear") return "ensoleille";
  if (id === "snow") return "poudrerie";
  if (id === "storm") return season === "hiver" || season === "automne" ? "tempete_neige" : "orage_ete";
  return "ensoleille";
}

function clonePlows(src: SnowPlowTruck[]): SnowPlowTruck[] {
  return src.map((p) => ({ ...p }));
}

export class QuebecSeasonsService {
  private static instance: QuebecSeasonsService;
  private state: QuebecWeatherState;
  private locked = false;

  private constructor() {
    this.state = {
      season: "automne",
      condition: "nuageux",
      temperatureCelsius: 9,
      windSpeedKmH: 18,
      snowAccumulationCm: 0,
      roadFrictionCoeff: 0.75,
      snowPlowStatus: "idle",
      plows: clonePlows(DEFAULT_PLOWS),
      lastUpdated: Date.now(),
    };
  }

  public static getInstance(): QuebecSeasonsService {
    if (!QuebecSeasonsService.instance) QuebecSeasonsService.instance = new QuebecSeasonsService();
    return QuebecSeasonsService.instance;
  }

  public getState(): QuebecWeatherState {
    return {
      ...this.state,
      plows: clonePlows(this.state.plows),
    };
  }

  public isWinterPrecip(): boolean {
    const c = this.state.condition;
    return c === "poudrerie" || c === "tempete_neige" || c === "froid_polaire";
  }

  public isIcy(): boolean {
    return this.state.roadFrictionCoeff < 0.72 || this.state.condition === "verglas";
  }

  public triggerBlizzard(): QuebecWeatherState {
    this.locked = true;
    this.state.season = "hiver";
    this.state.condition = "tempete_neige";
    this.state.temperatureCelsius = -22;
    this.state.windSpeedKmH = 75;
    this.state.snowAccumulationCm = Math.min(80, this.state.snowAccumulationCm + 15);
    this.state.roadFrictionCoeff = 0.25;
    this.state.snowPlowStatus = "alerte_blizzard";
    this.state.plows.forEach((p) => {
      p.active = true;
      p.saltSpreaderOn = true;
    });
    this.state.lastUpdated = Date.now();
    return this.getState();
  }

  public runPlowOperation(plowId: string, amountClearedCm: number): QuebecWeatherState {
    const plow = this.state.plows.find((p) => p.id === plowId);
    if (plow) {
      plow.active = true;
      plow.progressPercent = Math.min(100, plow.progressPercent + amountClearedCm * 1.6);
      if (plow.isMTQ) plow.saltSpreaderOn = true;
    }
    this.state.snowAccumulationCm = Math.max(0, this.state.snowAccumulationCm - amountClearedCm);
    if (this.state.snowAccumulationCm < 5) {
      this.state.roadFrictionCoeff = Math.min(0.92, this.state.roadFrictionCoeff + 0.12);
      this.state.snowPlowStatus = "routes_dégagées";
      if (this.state.condition === "tempete_neige") this.state.condition = "poudrerie";
    } else {
      this.state.roadFrictionCoeff = Math.min(0.7, 0.35 + (1 - this.state.snowAccumulationCm / 50) * 0.3);
      this.state.snowPlowStatus = "en_cours";
    }
    this.state.lastUpdated = Date.now();
    return this.getState();
  }

  public setSeason(season: QuebecSeason): QuebecWeatherState {
    this.locked = true;
    this.state.season = season;
    switch (season) {
      case "hiver":
        this.state.condition = "poudrerie";
        this.state.temperatureCelsius = -15;
        this.state.windSpeedKmH = 38;
        this.state.snowAccumulationCm = 25;
        this.state.roadFrictionCoeff = 0.45;
        this.state.snowPlowStatus = "en_cours";
        this.state.plows.forEach((p) => {
          p.active = true;
          p.saltSpreaderOn = p.isMTQ;
          p.progressPercent = 20;
        });
        break;
      case "printemps":
        this.state.condition = "pluie_fine";
        this.state.temperatureCelsius = 7;
        this.state.windSpeedKmH = 22;
        this.state.snowAccumulationCm = 0;
        this.state.roadFrictionCoeff = 0.8;
        this.idlePlows();
        break;
      case "ete":
        this.state.condition = "ensoleille";
        this.state.temperatureCelsius = 26;
        this.state.windSpeedKmH = 12;
        this.state.snowAccumulationCm = 0;
        this.state.roadFrictionCoeff = 1;
        this.idlePlows();
        break;
      case "automne":
        this.state.condition = "nuageux";
        this.state.temperatureCelsius = 9;
        this.state.windSpeedKmH = 18;
        this.state.snowAccumulationCm = 0;
        this.state.roadFrictionCoeff = 0.75;
        this.idlePlows();
        break;
    }
    this.state.lastUpdated = Date.now();
    return this.getState();
  }

  public setCondition(condition: WeatherCondition): QuebecWeatherState {
    this.locked = true;
    this.state.condition = condition;
    if (condition === "tempete_neige") return this.triggerBlizzard();
    if (condition === "poudrerie") {
      this.state.season = "hiver";
      this.state.temperatureCelsius = -14;
      this.state.windSpeedKmH = 45;
      this.state.snowAccumulationCm = Math.max(12, this.state.snowAccumulationCm);
      this.state.roadFrictionCoeff = 0.45;
      this.state.snowPlowStatus = "en_cours";
      this.state.plows.forEach((p) => {
        p.active = true;
        p.saltSpreaderOn = p.isMTQ;
      });
    } else if (condition === "verglas") {
      this.state.temperatureCelsius = Math.min(-1, this.state.temperatureCelsius);
      this.state.roadFrictionCoeff = 0.22;
      this.state.windSpeedKmH = 28;
      this.state.snowPlowStatus = "en_cours";
      this.state.plows.forEach((p) => {
        p.active = true;
        p.saltSpreaderOn = true;
      });
    } else if (condition === "froid_polaire") {
      this.state.season = "hiver";
      this.state.temperatureCelsius = -32;
      this.state.windSpeedKmH = 20;
      this.state.roadFrictionCoeff = 0.55;
    } else if (condition === "orage_ete") {
      this.state.season = "ete";
      this.state.temperatureCelsius = 24;
      this.state.windSpeedKmH = 55;
      this.state.snowAccumulationCm = 0;
      this.state.roadFrictionCoeff = 0.7;
      this.idlePlows();
    } else if (condition === "pluie_fine") {
      this.state.temperatureCelsius = this.state.season === "hiver" ? 1 : 8;
      this.state.windSpeedKmH = 22;
      this.state.roadFrictionCoeff = 0.78;
    } else if (condition === "ensoleille") {
      this.state.windSpeedKmH = 10;
      this.state.roadFrictionCoeff = this.state.season === "hiver" ? 0.7 : 1;
    } else {
      this.state.windSpeedKmH = 16;
    }
    this.state.lastUpdated = Date.now();
    return this.getState();
  }

  public syncFromClock(month: number, weather: WeatherId): QuebecWeatherState {
    if (this.locked) return this.getState();
    const season = seasonFromMonth(month);
    this.state.season = season;
    this.state.condition = conditionFromWeather(weather, season);
    if (season === "hiver" && (weather === "snow" || weather === "storm")) {
      this.state.snowAccumulationCm = Math.max(this.state.snowAccumulationCm, weather === "storm" ? 28 : 12);
      this.state.roadFrictionCoeff = weather === "storm" ? 0.28 : 0.48;
      this.state.snowPlowStatus = "en_cours";
      this.state.plows.forEach((p) => {
        p.active = true;
        p.saltSpreaderOn = p.isMTQ;
      });
    }
    this.state.lastUpdated = Date.now();
    return this.getState();
  }

  public unlockClock() {
    this.locked = false;
  }

  public tick(dt: number, hours: number): QuebecWeatherState {
    const sun = Math.sin(((hours - 7) / 24) * Math.PI * 2) * 3.2;
    const base = this.baseTemp();
    this.state.temperatureCelsius = Math.round((base + sun) * 10) / 10;

    const c = this.state.condition;
    if (c === "tempete_neige") {
      this.state.snowAccumulationCm = Math.min(90, this.state.snowAccumulationCm + dt * 0.35);
      this.state.roadFrictionCoeff = Math.max(0.18, 0.4 - this.state.snowAccumulationCm * 0.004);
      this.state.windSpeedKmH = 70 + Math.sin(hours) * 8;
    } else if (c === "poudrerie") {
      this.state.snowAccumulationCm = Math.min(45, this.state.snowAccumulationCm + dt * 0.08);
      this.state.windSpeedKmH = 38 + Math.sin(hours * 0.7) * 10;
    } else if (c === "pluie_fine" && this.state.season === "printemps" && this.state.snowAccumulationCm > 0) {
      this.state.snowAccumulationCm = Math.max(0, this.state.snowAccumulationCm - dt * 0.2);
    }

    if (this.state.snowPlowStatus === "en_cours" || this.state.snowPlowStatus === "alerte_blizzard") {
      for (const p of this.state.plows) {
        if (!p.active) continue;
        p.progressPercent = Math.min(100, p.progressPercent + dt * (p.isMTQ ? 1.8 : 1.1));
        const cleared = dt * (p.isMTQ ? 0.12 : 0.05);
        this.state.snowAccumulationCm = Math.max(0, this.state.snowAccumulationCm - cleared);
      }
      if (this.state.snowAccumulationCm < 4 && c !== "tempete_neige") {
        this.state.snowPlowStatus = "routes_dégagées";
        this.state.roadFrictionCoeff = Math.min(0.9, this.state.roadFrictionCoeff + dt * 0.04);
      }
    }
    this.state.lastUpdated = Date.now();
    return this.getState();
  }

  private baseTemp(): number {
    switch (this.state.condition) {
      case "froid_polaire":
        return -32;
      case "tempete_neige":
        return -22;
      case "poudrerie":
        return -14;
      case "verglas":
        return -3;
      case "pluie_fine":
        return this.state.season === "hiver" ? 1 : 7;
      case "orage_ete":
        return 24;
      case "ensoleille":
        return this.state.season === "ete" ? 26 : this.state.season === "hiver" ? -8 : 14;
      default:
        return this.state.season === "hiver" ? -10 : this.state.season === "ete" ? 22 : 9;
    }
  }

  private idlePlows() {
    this.state.snowPlowStatus = "idle";
    this.state.plows.forEach((p) => {
      p.active = false;
      p.saltSpreaderOn = false;
      p.progressPercent = 0;
    });
  }
}

export const quebecSeasons = QuebecSeasonsService.getInstance();

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS DE COMPATIBILITÉ RP (Utilisés par jobs.ts, radio.ts, sqdc.ts, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export function getCurrentSeason(): QuebecSeason {
  return quebecSeasons.getState().season;
}

export function getGameHour(): number {
  return new Date().getHours();
}

export function getWeatherState(): QuebecWeatherState {
  return quebecSeasons.getState();
}