// ═══════════════════════════════════════════════════════════════════════════
//  WORLD SYSTEM v2.0 — Météo · Saisons · Cycle jour/nuit · Événements
//  src/world/WorldSystem.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Cycle saisonnier complet (Québec : hiver long, été court)
//  • Transitions météo DOUCES (interpolation sur plusieurs minutes)
//  • Prévisions glissantes (5 prochaines météos)
//  • Cycle jour/nuit avec lever/coucher calculé par saison
//  • Température réaliste (base saison + heure + météo + vent)
//  • Vent directionnel avec rafales
//  • Brouillard dynamique (couplé météo + heure + rivière)
//  • Événements rares : verglas, blizzard, canicule, orage violent
//  • Intégration ZoneSystem (weatherBias régional)
//  • Multi-room (une instance par world/roomId)
//  • Hooks : onWeatherChange, onTimeChange, onSeasonChange, onEvent
//  • Paramètres atmosphériques Three.js prêts (fog, sky, sun, moon)
//  • Persistance optionnelle (save/restore)
//  • Contrôle admin (forceWeather, forceTime, pause)
// ═══════════════════════════════════════════════════════════════════════════

import { Intellectus } from '../core/Intellectus';

// ─────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────

export type Weather = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'blizzard' | 'fog' | 'ice';

export type Season = 'printemps' | 'ete' | 'automne' | 'hiver';

export type WeatherEventType =
  | 'ice_storm'      // verglas
  | 'blizzard'       // tempête de neige
  | 'heatwave'       // canicule
  | 'thunderstorm'   // orage violent
  | 'river_fog'      // brouillard du fleuve
  | 'indian_summer'  // été des Indiens
  | 'none';

export interface WorldState {
  weather: Weather;
  /** Météo cible (pendant une transition) */
  targetWeather: Weather;
  /** Progression 0..1 vers targetWeather */
  weatherTransition: number;
  /** Prévision : prochaines météos */
  forecast: Weather[];

  season: Season;
  dayOfYear: number;     // 1..365
  year: number;

  timeOfDay: number;     // 0.0..24.0 (décimal, ex: 14.75 = 14:45)
  /** Est-ce que le temps avance ? */
  timeRunning: boolean;
  /** Multiplicateur temps (1x = temps réel) */
  timeScale: number;

  temperature: number;   // °C
  feelsLike: number;     // °C avec facteur vent
  windSpeed: number;     // km/h
  windDirection: number; // 0..360° (0 = Nord)

  /** Brouillard : 0 = aucun, 1 = opaque */
  fogDensity: number;

  humidity: number;      // 0..100 %
  pressure: number;      // hPa
  precipitation: number; // 0..1 (intensité)

  worldName: string;
  /** Event météo en cours */
  event: WeatherEventType;
  /** Timestamp fin de l'event (0 si aucun) */
  eventEndsAt: number;
}

/** Paramètres prêts à brancher sur Three.js (client) */
export interface AtmosphereParams {
  fogColor: number;
  fogNear: number;
  fogFar: number;
  sunIntensity: number;
  sunColor: number;
  ambientIntensity: number;
  ambientColor: number;
  skyTintTop: number;
  skyTintBottom: number;
  starsVisible: boolean;
  moonVisible: boolean;
  /** Direction du soleil (0..1 sur l'horizon) */
  sunAzimuth: number;
  sunElevation: number;
}

export interface WorldConfig {
  /** Durée d'un jour complet en ms (réel : 86_400_000) */
  dayDurationMs: number;
  /** Transition météo en ms */
  weatherTransitionMs: number;
  /** Latitude pour calcul astronomique (Portneuf ≈ 46.75) */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Nombre de slots de prévision */
  forecastSize: number;
  /** Chance de forcer un event rare par cycle (0..1) */
  rareEventChance: number;
  /** Auto-save interval ms (0 = off) */
  persistIntervalMs: number;
}

const DEFAULT_CONFIG: WorldConfig = {
  dayDurationMs: 60 * 60 * 1000, // 1h IRL = 24h IG (×24 accéléré)
  weatherTransitionMs: 3 * 60 * 1000, // 3 min transition
  latitude: 46.75,
  longitude: -71.58,
  forecastSize: 5,
  rareEventChance: 0.03,
  persistIntervalMs: 60_000,
};

// ─────────────────────────────────────────────────────────────────────────
//  PRESETS SAISONNIERS (Québec)
// ─────────────────────────────────────────────────────────────────────────

interface SeasonProfile {
  label: string;
  tempBase: number;   // °C moyenne
  tempAmp: number;    // amplitude jour/nuit
  humidityBase: number;
  /** Pondération des météos (doit sommer à 1) */
  weatherBias: Record<Weather, number>;
  /** Sunrise/Sunset (heure décimale) */
  sunrise: number;
  sunset: number;
}

const SEASON_PROFILES: Record<Season, SeasonProfile> = {
  printemps: {
    label: 'Printemps',
    tempBase: 8, tempAmp: 8,
    humidityBase: 65,
    weatherBias: {
      clear: 0.30, cloudy: 0.25, rain: 0.25, storm: 0.03,
      snow: 0.05, blizzard: 0, fog: 0.05, ice: 0.02,
    },
    sunrise: 5.5, sunset: 20,
  },
  ete: {
    label: 'Été',
    tempBase: 22, tempAmp: 10,
    humidityBase: 70,
    weatherBias: {
      clear: 0.42, cloudy: 0.22, rain: 0.20, storm: 0.10,
      snow: 0, blizzard: 0, fog: 0.06, ice: 0,
    },
    sunrise: 5, sunset: 21,
  },
  automne: {
    label: 'Automne',
    tempBase: 10, tempAmp: 8,
    humidityBase: 75,
    weatherBias: {
      clear: 0.28, cloudy: 0.28, rain: 0.28, storm: 0.03,
      snow: 0.03, blizzard: 0, fog: 0.08, ice: 0.02,
    },
    sunrise: 6.5, sunset: 19,
  },
  hiver: {
    label: 'Hiver',
    tempBase: -12, tempAmp: 8,
    humidityBase: 60,
    weatherBias: {
      clear: 0.22, cloudy: 0.28, rain: 0.02, storm: 0,
      snow: 0.30, blizzard: 0.08, fog: 0.04, ice: 0.06,
    },
    sunrise: 7.5, sunset: 16.5,
  },
};

// ─────────────────────────────────────────────────────────────────────────
//  MÉTÉO — Caractéristiques physiques
// ─────────────────────────────────────────────────────────────────────────

interface WeatherPhysics {
  tempOffset: number;      // °C vs base saison
  humidityBoost: number;   // %
  windBoost: number;       // km/h
  precipitation: number;   // 0..1
  visibilityKm: number;
  /** Emoji UI */
  emoji: string;
  /** Label FR */
  label: string;
}

const WEATHER_PHYSICS: Record<Weather, WeatherPhysics> = {
  clear:    { tempOffset: 2,  humidityBoost: -10, windBoost: 0,   precipitation: 0,    visibilityKm: 30, emoji: '☀️', label: 'Ensoleillé' },
  cloudy:   { tempOffset: -1, humidityBoost: 5,   windBoost: 5,   precipitation: 0,    visibilityKm: 20, emoji: '☁️', label: 'Nuageux' },
  rain:     { tempOffset: -3, humidityBoost: 20,  windBoost: 10,  precipitation: 0.45, visibilityKm: 8,  emoji: '🌧️', label: 'Pluie' },
  storm:    { tempOffset: -5, humidityBoost: 25,  windBoost: 35,  precipitation: 0.8,  visibilityKm: 4,  emoji: '⛈️', label: 'Orage' },
  snow:     { tempOffset: -4, humidityBoost: 15,  windBoost: 15,  precipitation: 0.55, visibilityKm: 5,  emoji: '❄️', label: 'Neige' },
  blizzard: { tempOffset: -8, humidityBoost: 20,  windBoost: 55,  precipitation: 0.95, visibilityKm: 1,  emoji: '🌨️', label: 'Blizzard' },
  fog:      { tempOffset: -2, humidityBoost: 25,  windBoost: -5,  precipitation: 0.1,  visibilityKm: 0.5, emoji: '🌫️', label: 'Brouillard' },
  ice:      { tempOffset: -1, humidityBoost: 25,  windBoost: 20,  precipitation: 0.7,  visibilityKm: 3,  emoji: '🧊', label: 'Verglas' },
};

// ─────────────────────────────────────────────────────────────────────────
//  ÉVÉNEMENTS RARES
// ─────────────────────────────────────────────────────────────────────────

interface WorldEvent {
  type: WeatherEventType;
  /** Météo forcée pendant l'event */
  forcesWeather: Weather;
  /** Durée min/max en heures IG */
  minHours: number;
  maxHours: number;
  /** Saisons autorisées */
  seasons: Season[];
  label: string;
  description: string;
}

const EVENT_PRESETS: WorldEvent[] = [
  {
    type: 'ice_storm',
    forcesWeather: 'ice',
    minHours: 4, maxHours: 12,
    seasons: ['hiver', 'printemps', 'automne'],
    label: 'Verglas',
    description: 'Pluie verglaçante. Routes dangereuses, pannes électriques probables.',
  },
  {
    type: 'blizzard',
    forcesWeather: 'blizzard',
    minHours: 6, maxHours: 18,
    seasons: ['hiver'],
    label: 'Blizzard',
    description: 'Tempête de neige majeure. Visibilité nulle, urgences saturées.',
  },
  {
    type: 'heatwave',
    forcesWeather: 'clear',
    minHours: 12, maxHours: 36,
    seasons: ['ete'],
    label: 'Canicule',
    description: 'Chaleur extrême. Risque de déshydratation, urgences surchargées.',
  },
  {
    type: 'thunderstorm',
    forcesWeather: 'storm',
    minHours: 2, maxHours: 6,
    seasons: ['ete', 'printemps', 'automne'],
    label: 'Orage violent',
    description: 'Orage électrique intense. Éclairs, vents violents, risque d\'incendie.',
  },
  {
    type: 'river_fog',
    forcesWeather: 'fog',
    minHours: 4, maxHours: 10,
    seasons: ['automne', 'printemps'],
    label: 'Brouillard du fleuve',
    description: 'Brume épaisse remontant du Saint-Laurent. Navigation dangereuse.',
  },
  {
    type: 'indian_summer',
    forcesWeather: 'clear',
    minHours: 24, maxHours: 72,
    seasons: ['automne'],
    label: 'Été des Indiens',
    description: 'Redoux exceptionnel en automne. Conditions idéales en extérieur.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES MATH
// ─────────────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ease in/out smoothstep */
function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Convertit dayOfYear (1..365) vers saison */
function dayToSeason(day: number): Season {
  if (day >= 80 && day < 172) return 'printemps';  // ~21 mars → 20 juin
  if (day >= 172 && day < 265) return 'ete';       // ~20 juin → 22 sept
  if (day >= 265 && day < 355) return 'automne';   // ~22 sept → 20 déc
  return 'hiver';                                  // ~20 déc → 21 mars
}

/** Mélange deux couleurs hex */
function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
}

/** Facteur vent (refroidissement éolien simplifié) */
function windChill(temp: number, windKmh: number): number {
  if (temp > 10 || windKmh < 5) return temp;
  const v = Math.pow(windKmh, 0.16);
  return Math.round(13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * temp * v);
}

/** Pression standard selon altitude (simplifiée) */
function basePressure(): number {
  return 1013.25;
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORLD SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export class WorldSystem {
  public intellectus: Intellectus;
  public state: WorldState;

  private config: WorldConfig;
  private lastTick = Date.now();
  private listeners: {
    weather: Array<(w: Weather, prev: Weather) => void>;
    time: Array<(h: number) => void>;
    season: Array<(s: Season) => void>;
    event: Array<(e: WeatherEventType, data: WorldEvent | null) => void>;
  } = {
    weather: [],
    time: [],
    season: [],
    event: [],
  };

  /** Zone bias apporté par le ZoneSystem */
  private zoneWeatherBias: Partial<Record<Weather, number>> | null = null;

  private persistTimer: ReturnType<typeof setInterval> | null = null;

  constructor(intellectus: Intellectus, config: Partial<WorldConfig> = {}) {
    this.intellectus = intellectus;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.state = {
      weather: 'clear',
      targetWeather: 'clear',
      weatherTransition: 1,
      forecast: [],

      season: 'ete',
      dayOfYear: 180,
      year: 1,

      timeOfDay: 12,
      timeRunning: true,
      timeScale: 1,

      temperature: 18,
      feelsLike: 18,
      windSpeed: 5,
      windDirection: 220,

      fogDensity: 0.2,
      humidity: 65,
      pressure: basePressure(),
      precipitation: 0,

      worldName: 'Portneuf',
      event: 'none',
      eventEndsAt: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INITIALISATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // Recalcule la saison selon le jour initial
    this.state.season = dayToSeason(this.state.dayOfYear);

    // Recalcule la météo en fonction de la saison
    this.rollWeather();

    // Démarre la boucle interne
    this.startTickLoop();

    // Persistance auto si activée
    if (this.config.persistIntervalMs > 0) {
      this.startPersistLoop();
    }

    this.intellectus.arcadius.emit('system:world:ready', {
      worldName: this.state.worldName,
      season: this.state.season,
      weather: this.state.weather,
      config: this.config,
    }, 'WorldSystem');

    console.log(
      `🌤️ [World] ${this.state.worldName} · ${this.state.season} · ` +
      `${this.state.weather} · ${this.state.temperature}°C`,
    );
  }

  async shutdown(): Promise<void> {
    this.stopTickLoop();
    this.stopPersistLoop();
    this.intellectus.arcadius.emit('system:world:shutdown', {
      worldName: this.state.worldName,
    }, 'WorldSystem');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  BOUCLE INTERNE
  // ─────────────────────────────────────────────────────────────────────────

  private startTickLoop(): void {
    // Tick toutes les secondes IRL
    this.intellectus.arcadius.on?.('server:tick', () => this.tick());
  }

  private stopTickLoop(): void {
    // Le hook arcadius gère la durée de vie
  }

  /**
   * Tick principal — appelé par le scheduler arcadius.
   * Peut aussi être appelé manuellement avec un delta custom (tests).
   */
  public tick(now = Date.now()): void {
    const deltaMs = now - this.lastTick;
    this.lastTick = now;

    if (!this.state.timeRunning) return;

    // Progression du temps IG
    const dayProgress = deltaMs / this.config.dayDurationMs;
    const hoursAdvanced = dayProgress * 24 * this.state.timeScale;

    const prevTime = this.state.timeOfDay;
    this.state.timeOfDay += hoursAdvanced;

    // Gestion passage minuit → jour +1
    if (this.state.timeOfDay >= 24) {
      this.state.timeOfDay -= 24;
      this.state.dayOfYear++;
      if (this.state.dayOfYear > 365) {
        this.state.dayOfYear = 1;
        this.state.year++;
      }
      this.onDayChange();
    }

    // Notifie changement d'heure (arrondi à la minute IG)
    if (Math.floor(prevTime * 60) !== Math.floor(this.state.timeOfDay * 60)) {
      this.emitTimeChange();
    }

    // Transition météo
    this.tickWeatherTransition(deltaMs);

    // Recalcul physique
    this.recomputePhysics();

    // Fin event ?
    if (this.state.event !== 'none' && now > this.state.eventEndsAt) {
      this.endEvent();
    }

    // Roll nouvelle météo si stable
    this.maybeRollWeather();
  }

  private onDayChange(): void {
    const newSeason = dayToSeason(this.state.dayOfYear);
    if (newSeason !== this.state.season) {
      this.state.season = newSeason;
      this.listeners.season.forEach((l) => {
        try { l(newSeason); } catch { /* ignore */ }
      });
      this.intellectus.arcadius.emit('world:season', {
        season: newSeason,
        day: this.state.dayOfYear,
      }, 'WorldSystem');
      console.log(`🍂 [World] Saison → ${newSeason}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  TRANSITION MÉTÉO
  // ─────────────────────────────────────────────────────────────────────────

  private tickWeatherTransition(deltaMs: number): void {
    if (this.state.weatherTransition >= 1) return;
    const step = deltaMs / this.config.weatherTransitionMs;
    this.state.weatherTransition = clamp(this.state.weatherTransition + step, 0, 1);

    if (this.state.weatherTransition >= 1) {
      this.state.weather = this.state.targetWeather;
      this.listeners.weather.forEach((l) => {
        try { l(this.state.weather, this.state.weather); } catch { /* ignore */ }
      });
    }
  }

  private maybeRollWeather(): void {
    // Change la météo toutes les ~2h IG si pas d'event
    if (this.state.event !== 'none') return;
    if (this.state.weatherTransition < 1) return;

    const hourOfDay = this.state.timeOfDay;
    const shouldRoll = Math.random() < 0.008; // ~0.8% par tick (1s)
    if (!shouldRoll) return;

    this.rollWeather();
  }

  private rollWeather(): void {
    const season = SEASON_PROFILES[this.state.season];
    const bias = { ...season.weatherBias };

    // Applique bias zone (ex: autoroute a moins de brouillard)
    if (this.zoneWeatherBias) {
      for (const [w, v] of Object.entries(this.zoneWeatherBias)) {
        if (w in bias) bias[w as Weather] = Math.max(0, (bias[w as Weather] ?? 0) + (v ?? 0));
      }
    }

    // Roll pondéré
    const total = Object.values(bias).reduce((s, v) => s + v, 0) || 1;
    let r = Math.random() * total;
    let chosen: Weather = 'clear';
    for (const [w, weight] of Object.entries(bias)) {
      r -= weight;
      if (r <= 0) { chosen = w as Weather; break; }
    }

    if (chosen !== this.state.weather) {
      this.setWeather(chosen, { smooth: true });
    }

    // Prochaine prévision
    this.refreshForecast();
  }

  private refreshForecast(): void {
    const season = SEASON_PROFILES[this.state.season];
    const forecast: Weather[] = [];
    for (let i = 0; i < this.config.forecastSize; i++) {
      const bias = season.weatherBias;
      const total = Object.values(bias).reduce((s, v) => s + v, 0) || 1;
      let r = Math.random() * total;
      let chosen: Weather = 'clear';
      for (const [w, weight] of Object.entries(bias)) {
        r -= weight;
        if (r <= 0) { chosen = w as Weather; break; }
      }
      forecast.push(chosen);
    }
    this.state.forecast = forecast;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ÉVÉNEMENTS RARES
  // ─────────────────────────────────────────────────────────────────────────

  private maybeTriggerEvent(): void {
    if (this.state.event !== 'none') return;
    if (Math.random() > this.config.rareEventChance) return;

    const possible = EVENT_PRESETS.filter((e) => e.seasons.includes(this.state.season));
    if (possible.length === 0) return;

    const ev = possible[Math.floor(Math.random() * possible.length)];
    const hours = lerp(ev.minHours, ev.maxHours, Math.random());
    this.startEvent(ev, hours);
  }

  private startEvent(ev: WorldEvent, hours: number): void {
    this.state.event = ev.type;
    this.state.eventEndsAt = Date.now() + hours * 3600 * 1000;

    // Force météo associée
    this.setWeather(ev.forcesWeather, { smooth: true, durationMs: 60_000 });

    this.listeners.event.forEach((l) => {
      try { l(ev.type, ev); } catch { /* ignore */ }
    });

    this.intellectus.arcadius.emit('world:event:start', {
      type: ev.type,
      label: ev.label,
      description: ev.description,
      hours,
    }, 'WorldSystem');

    console.log(`⚡ [World] ÉVÉNEMENT : ${ev.label} (${hours.toFixed(1)}h)`);
  }

  private endEvent(): void {
    const prev = this.state.event;
    this.state.event = 'none';
    this.state.eventEndsAt = 0;

    this.listeners.event.forEach((l) => {
      try { l('none', null); } catch { /* ignore */ }
    });

    this.intellectus.arcadius.emit('world:event:end', { type: prev }, 'WorldSystem');
    console.log(`✅ [World] Événement terminé : ${prev}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PHYSIQUE — température, vent, brouillard, humidité
  // ─────────────────────────────────────────────────────────────────────────

  private recomputePhysics(): void {
    const s = SEASON_PROFILES[this.state.season];
    const w = WEATHER_PHYSICS[this.state.weather];
    const t = this.state.weatherTransition;

    // Température : base saison + oscillation jour/nuit + offset météo
    // Le pic est vers 15h, le minimum vers 4h
    const dayPhase = (this.state.timeOfDay - 4) / 24;
    const diurnal = Math.sin(dayPhase * Math.PI * 2 - Math.PI / 2); // -1 à 4h, +1 à 15h
    const baseTemp = s.tempBase + diurnal * (s.tempAmp / 2);

    // Interpole avec la météo cible
    const targetWeather = this.state.weatherTransition < 1 ? this.state.targetWeather : this.state.weather;
    const targetPhys = WEATHER_PHYSICS[targetWeather];
    const tempOffset = lerp(w.tempOffset, targetPhys.tempOffset, smoothstep(t));

    this.state.temperature = Math.round((baseTemp + tempOffset) * 10) / 10;

    // Wind chill
    this.state.feelsLike = windChill(this.state.temperature, this.state.windSpeed);

    // Vent : base saison + météo + rafale sinusoïdale lente
    const windPhase = Date.now() / 60000;
    const gust = Math.sin(windPhase * 0.7) * 5 + Math.sin(windPhase * 1.9) * 3;
    this.state.windSpeed = Math.max(0,
      (5 + (s.weatherBias.cloudy * 10)) + lerp(w.windBoost, targetPhys.windBoost, t) + gust,
    );

    // Direction du vent : dérive lente
    this.state.windDirection = (this.state.windDirection + 0.5) % 360;

    // Humidité
    const humBase = s.humidityBase + lerp(w.humidityBoost, targetPhys.humidityBoost, t);
    this.state.humidity = clamp(Math.round(humBase), 0, 100);

    // Précipitation
    this.state.precipitation = lerp(w.precipitation, targetPhys.precipitation, smoothstep(t));

    // Brouillard : dépend visibilité, humidité, heure
    const visibility = lerp(w.visibilityKm, targetPhys.visibilityKm, smoothstep(t));
    const fogFromVisibility = clamp(1 - (visibility / 30), 0, 1);
    const fogFromHumidity = clamp((this.state.humidity - 60) / 40, 0, 1);
    const fogFromDawn = this.computeFogFromDawn();
    const fogBase = Math.max(fogFromVisibility, fogFromHumidity * 0.7, fogFromDawn);
    this.state.fogDensity = clamp(fogBase, 0, 1);

    // Pression
    this.state.pressure = basePressure() + Math.sin(this.state.dayOfYear / 15) * 8;
  }

  private computeFogFromDawn(): number {
    // Brouillard matinal si tôt + humide
    const h = this.state.timeOfDay;
    const isDawn = h >= 4 && h <= 8;
    if (!isDawn) return 0;
    const humFactor = clamp((this.state.humidity - 70) / 30, 0, 1);
    return humFactor * 0.6;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ASTRONOMIE (sun / moon / étoiles)
  // ─────────────────────────────────────────────────────────────────────────

  getSunPosition(): { azimuth: number; elevation: number } {
    // Position approximative du soleil en fonction heure + jour
    const s = SEASON_PROFILES[this.state.season];
    const dayLength = s.sunset - s.sunrise;
    const noon = s.sunrise + dayLength / 2;
    const hoursFromNoon = this.state.timeOfDay - noon;

    // Élévation : cos, max à noon, 0 à sunrise/sunset
    const dayProgress = (this.state.timeOfDay - s.sunrise) / dayLength;
    const elevation = Math.sin(dayProgress * Math.PI) * 60 - 30; // -30..30° (approx)

    // Azimuth : est → sud → ouest
    const azimuth = (dayProgress - 0.5) * 180 + 180; // 90° est ... 270° ouest

    return {
      azimuth: clamp(azimuth, 0, 360),
      elevation: clamp(elevation, -30, 90),
    };
  }

  isDaytime(): boolean {
    const s = SEASON_PROFILES[this.state.season];
    return this.state.timeOfDay >= s.sunrise && this.state.timeOfDay <= s.sunset;
  }

  /** Paramètres prêts pour Three.js / React Three Fiber */
  getAtmosphereParams(): AtmosphereParams {
    const w = WEATHER_PHYSICS[this.state.weather];
    const targetW = WEATHER_PHYSICS[this.state.targetWeather];
    const t = smoothstep(this.state.weatherTransition);
    const s = SEASON_PROFILES[this.state.season];
    const sun = this.getSunPosition();
    const isDay = this.isDaytime();

    // Couleur brouillard : dépend heure + météo
    const nightFog = 0x0a1020;
    const dayFog = 0xa0b4c8;
    const stormFog = 0x506070;
    const fogTarget = isDay ? (this.state.weather === 'storm' ? stormFog : dayFog) : nightFog;
    const fogColor = fogTarget;

    // Intensité soleil : dépend élévation
    const sunIntensity = isDay ? clamp(sun.elevation / 60, 0.2, 1.2) : 0;
    const moonIntensity = isDay ? 0 : 0.15;

    // Couleurs ciel
    const skyTopDay = 0x4a90e2;
    const skyTopNight = 0x050810;
    const skyBottomDay = 0xc8d8e8;
    const skyBottomNight = 0x0a1020;
    const skyTop = isDay ? skyTopDay : skyTopNight;
    const skyBottom = isDay ? skyBottomDay : skyBottomNight;

    // Visibilité brouillard
    const visibility = lerp(w.visibilityKm, targetW.visibilityKm, t);
    const fogFar = visibility * 100;
    const fogNear = Math.max(5, fogFar * 0.05);

    return {
      fogColor,
      fogNear,
      fogFar,
      sunIntensity,
      sunColor: isDay ? 0xfff4d8 : 0x8090b0,
      ambientIntensity: isDay ? 0.35 : 0.08,
      ambientColor: isDay ? 0xb0c4d8 : 0x304060,
      skyTintTop: skyTop,
      skyTintBottom: skyBottom,
      starsVisible: !isDay && this.state.precipitation < 0.3,
      moonVisible: !isDay,
      sunAzimuth: sun.azimuth,
      sunElevation: sun.elevation,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ÉMISSIONS
  // ─────────────────────────────────────────────────────────────────────────

  private emitTimeChange(): void {
    this.listeners.time.forEach((l) => {
      try { l(this.state.timeOfDay); } catch { /* ignore */ }
    });
    this.intellectus.arcadius.emit('world:time', {
      timeOfDay: this.state.timeOfDay,
      isDay: this.isDaytime(),
      season: this.state.season,
    }, 'WorldSystem');
  }

  private emitWeatherChange(prev: Weather): void {
    this.listeners.weather.forEach((l) => {
      try { l(this.state.weather, prev); } catch { /* ignore */ }
    });
    this.intellectus.arcadius.emit('world:weather', {
      weather: this.state.weather,
      previous: prev,
      temperature: this.state.temperature,
      event: this.state.event,
    }, 'WorldSystem');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  API PUBLIQUE — compat v1
  // ─────────────────────────────────────────────────────────────────────────

  getState(): WorldState {
    return { ...this.state };
  }

  setWeather(w: Weather, opts?: { smooth?: boolean; durationMs?: number }): void {
    const prev = this.state.weather;
    if (w === prev && this.state.weatherTransition >= 1) return;

    if (opts?.smooth === false) {
      this.state.weather = w;
      this.state.targetWeather = w;
      this.state.weatherTransition = 1;
      this.emitWeatherChange(prev);
      return;
    }

    // Transition douce
    this.state.targetWeather = w;
    this.state.weatherTransition = 0;

    // Émet l'annoncement de transition
    this.intellectus.arcadius.emit('world:weather:incoming', {
      from: prev,
      to: w,
      durationMs: opts?.durationMs ?? this.config.weatherTransitionMs,
    }, 'WorldSystem');
  }

  setTime(h: number): void {
    const clamped = clamp(h, 0, 23.999);
    const prev = this.state.timeOfDay;
    this.state.timeOfDay = clamped;

    if (Math.floor(prev) !== Math.floor(clamped)) {
      this.emitTimeChange();
    }
  }

  setFog(density: number): void {
    this.state.fogDensity = clamp(density, 0, 1);
  }

  getWeatherEmoji(): string {
    return WEATHER_PHYSICS[this.state.weather]?.emoji ?? '☀️';
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  API PUBLIQUE — extensions v2
  // ─────────────────────────────────────────────────────────────────────────

  /** Force la saison (admin) */
  setSeason(season: Season): void {
    this.state.season = season;
    this.state.dayOfYear = season === 'ete' ? 180
      : season === 'automne' ? 300
      : season === 'hiver' ? 15
      : 100;
    this.listeners.season.forEach((l) => {
      try { l(season); } catch { /* ignore */ }
    });
    this.intellectus.arcadius.emit('world:season:forced', { season }, 'WorldSystem');
  }

  /** Pause / reprend le temps */
  setTimeRunning(running: boolean): void {
    this.state.timeRunning = running;
    this.intellectus.arcadius.emit('world:time:running', { running }, 'WorldSystem');
  }

  /** Modifie l'échelle de temps */
  setTimeScale(scale: number): void {
    this.state.timeScale = clamp(scale, 0.01, 100);
  }

  /** Trigger manuel d'un événement (admin/debug) */
  triggerEvent(type: WeatherEventType, hours?: number): boolean {
    const preset = EVENT_PRESETS.find((e) => e.type === type);
    if (!preset) return false;
    const duration = hours ?? lerp(preset.minHours, preset.maxHours, 0.5);
    this.startEvent(preset, duration);
    return true;
  }

  /** Arrête l'événement en cours */
  stopEvent(): void {
    if (this.state.event !== 'none') this.endEvent();
  }

  /** Applique un bias régional depuis ZoneSystem */
  setZoneWeatherBias(bias: Partial<Record<Weather, number>> | null): void {
    this.zoneWeatherBias = bias;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  LISTENERS
  // ─────────────────────────────────────────────────────────────────────────

  onWeatherChange(cb: (w: Weather, prev: Weather) => void): () => void {
    this.listeners.weather.push(cb);
    return () => {
      const i = this.listeners.weather.indexOf(cb);
      if (i !== -1) this.listeners.weather.splice(i, 1);
    };
  }

  onTimeChange(cb: (h: number) => void): () => void {
    this.listeners.time.push(cb);
    return () => {
      const i = this.listeners.time.indexOf(cb);
      if (i !== -1) this.listeners.time.splice(i, 1);
    };
  }

  onSeasonChange(cb: (s: Season) => void): () => void {
    this.listeners.season.push(cb);
    return () => {
      const i = this.listeners.season.indexOf(cb);
      if (i !== -1) this.listeners.season.splice(i, 1);
    };
  }

  onEvent(cb: (e: WeatherEventType, data: WorldEvent | null) => void): () => void {
    this.listeners.event.push(cb);
    return () => {
      const i = this.listeners.event.indexOf(cb);
      if (i !== -1) this.listeners.event.splice(i, 1);
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PERSISTANCE
  // ─────────────────────────────────────────────────────────────────────────

  private startPersistLoop(): void {
    this.persistTimer = setInterval(() => {
      this.intellectus.arcadius.emit('world:persist', this.serialize(), 'WorldSystem');
    }, this.config.persistIntervalMs);
    if (this.persistTimer.unref) this.persistTimer.unref();
  }

  private stopPersistLoop(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
  }

  serialize(): string {
    return JSON.stringify({
      weather: this.state.weather,
      targetWeather: this.state.targetWeather,
      weatherTransition: this.state.weatherTransition,
      season: this.state.season,
      dayOfYear: this.state.dayOfYear,
      year: this.state.year,
      timeOfDay: this.state.timeOfDay,
      timeRunning: this.state.timeRunning,
      timeScale: this.state.timeScale,
      temperature: this.state.temperature,
      windSpeed: this.state.windSpeed,
      windDirection: this.state.windDirection,
      fogDensity: this.state.fogDensity,
      humidity: this.state.humidity,
      event: this.state.event,
      eventEndsAt: this.state.eventEndsAt,
    });
  }

  restore(payload: string): boolean {
    try {
      const data = JSON.parse(payload);
      Object.assign(this.state, data);
      console.log(`🌤️ [World] État restauré · ${this.state.season} · ${this.state.weather}`);
      return true;
    } catch (err) {
      console.error('[World] Erreur restauration :', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  STATS & DEBUG
  // ─────────────────────────────────────────────────────────────────────────

  getStats() {
    return {
      world: this.state.worldName,
      season: this.state.season,
      day: this.state.dayOfYear,
      year: this.state.year,
      time: `${Math.floor(this.state.timeOfDay).toString().padStart(2, '0')}:${Math.floor((this.state.timeOfDay % 1) * 60).toString().padStart(2, '0')}`,
      weather: this.state.weather,
      weatherLabel: WEATHER_PHYSICS[this.state.weather].label,
      temperature: this.state.temperature,
      feelsLike: this.state.feelsLike,
      humidity: this.state.humidity,
      wind: `${this.state.windSpeed.toFixed(0)} km/h ${this.state.windDirection}°`,
      fog: this.state.fogDensity.toFixed(2),
      event: this.state.event,
      isDay: this.isDaytime(),
      forecast: this.state.forecast.map((w) => WEATHER_PHYSICS[w].emoji).join(' '),
    };
  }
}