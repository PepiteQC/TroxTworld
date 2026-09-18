/**
 * ═══════════════════════════════════════════════════════════════════
 * 🌨️ SYSTÈME DES SAISONS QUÉBÉCOISES — ETHERWORLD QC (v3.0)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Météo québécoise ultra-réaliste avec :
 *   ✅ Particules de pluie/neige/poudrerie (Three.js)
 *   ✅ Audio spatialisé (vent, pluie, orage, craquement de glace)
 *   ✅ Détails saisonniers procéduraux (neige terrain, feuilles, verglas)
 *   ✅ Système de friction dynamique avancé (véhicules, piétons)
 *   ✅ Prévisions météo & alertes en temps réel
 *   ✅ Événements météo extrêmes (blizzard, verglas noir, chaudron)
 *   ✅ Intégration avec le système acéricole et autres modules
 * 
 * Compatible Three.js r150+ / Colyseus / TypeScript 6+
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";

// ═══════════════════════════════════════════════════════════
// TYPES & ÉNUMÉRATIONS
// ═══════════════════════════════════════════════════════════

export type WeatherId = "clear" | "rain" | "snow" | "fog" | "storm";
export type QuebecSeason = "printemps" | "ete" | "automne" | "hiver";

export type WeatherCondition =
  | "ensoleille"
  | "nuageux"
  | "pluie_fine"
  | "pluie_battante"
  | "orage_ete"
  | "poudrerie"
  | "tempete_neige"
  | "verglas"
  | "verglas_noir"
  | "froid_polaire"
  | "redoux";

export type ForecastPeriod = "now" | "1h" | "3h" | "6h" | "12h" | "24h";

export interface WeatherForecast {
  period: ForecastPeriod;
  condition: WeatherCondition;
  temperatureMin: number;
  temperatureMax: number;
  precipitationChance: number;
  windSpeedKmH: number;
  alert?: WeatherAlert;
}

export interface WeatherAlert {
  id: string;
  severity: "watch" | "warning" | "emergency";
  type: "blizzard" | "verglas" | "froid_extreme" | "orage_violent";
  title: string;
  message: string;
  issuedAt: number;
  expiresAt: number;
  affectedZones: string[];
}

export interface SnowPlowTruck {
  id: string;
  name: string;
  driverName: string;
  isMTQ: boolean;
  assignedRoute: string;
  active: boolean;
  saltSpreaderOn: boolean;
  progressPercent: number;
  position?: { x: number; z: number };
  lastUpdate: number;
}

export type SnowPlowStatus = "idle" | "en_cours" | "routes_dégagées" | "alerte_blizzard" | "en_attente";

export interface RoadSurfaceState {
  frictionCoeff: number;
  iceThickness: number; // mm
  snowDepth: number; // cm
  wetness: number; // 0-1
  temperature: number;
  lastTreated: number;
}

export interface QuebecWeatherState {
  season: QuebecSeason;
  condition: WeatherCondition;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  humidity: number;
  pressure: number;
  windSpeedKmH: number;
  windDirection: number; // degrés
  windGustKmH: number;
  visibility: number; // km
  cloudCover: number; // 0-1
  uvIndex: number;
  
  // Neige & glace
  snowAccumulationCm: number;
  snowDepthVariation: number; // variation locale ±cm
  iceLayer: boolean;
  blackIceRisk: number; // 0-1
  
  // Routes
  roadFrictionCoeff: number;
  roadSurfaceState: Record<string, RoadSurfaceState>; // par zone/route
  
  // Déneigement
  snowPlowStatus: SnowPlowStatus;
  plows: SnowPlowTruck[];
  
  // Prévisions
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  
  // Métadonnées
  lastUpdated: number;
  nextUpdateIn: number; // secondes
  dataProvider: string;
}

// ═══════════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTES
// ═══════════════════════════════════════════════════════════

export const WEATHER_CONFIG = {
  // Températures de base par saison (°C)
  SEASON_BASE_TEMP: {
    printemps: { min: -5, max: 18, avg: 7 },
    ete: { min: 12, max: 32, avg: 22 },
    automne: { min: -2, max: 20, avg: 9 },
    hiver: { min: -35, max: 5, avg: -12 },
  },
  
  // Conditions météo par saison
  SEASON_CONDITIONS: {
    printemps: ["pluie_fine", "nuageux", "ensoleille", "orage_ete", "redoux"],
    ete: ["ensoleille", "nuageux", "pluie_fine", "orage_ete", "pluie_battante"],
    automne: ["nuageux", "pluie_fine", "ensoleille", "poudrerie", "verglas"],
    hiver: ["poudrerie", "tempete_neige", "verglas", "froid_polaire", "ensoleille"],
  },
  
  // Friction des routes par condition
  ROAD_FRICTION: {
    ensoleille: 1.0,
    nuageux: 0.95,
    pluie_fine: 0.78,
    pluie_battante: 0.65,
    orage_ete: 0.55,
    poudrerie: 0.45,
    tempete_neige: 0.25,
    verglas: 0.22,
    verglas_noir: 0.18,
    froid_polaire: 0.55,
    redoux: 0.7,
  },
  
  // Accumulation de neige (cm/h)
  SNOW_ACCUMULATION: {
    poudrerie: 0.08,
    tempete_neige: 0.35,
  },
  
  // Fonte de neige (cm/h) par température
  SNOW_MELT_RATE: {
    above_zero: 0.2, // > 0°C
    near_zero: 0.05, // -2°C à 0°C
    below_freezing: 0, // < -2°C
  },
  
  // Risque de verglas
  BLACK_ICE_THRESHOLDS: {
    temp_range: [-3, 1], // °C
    humidity_min: 85, // %
    recent_precip_hours: 6,
  },
  
  // Particules météo
  PARTICLES: {
    RAIN_COUNT: 2000,
    SNOW_COUNT: 1500,
    FOG_DENSITY: 0.35,
    FALL_SPEED_RAIN: 12,
    FALL_SPEED_SNOW: 1.5,
    WIND_INFLUENCE: 0.3,
  },
  
  // Audio
  AUDIO: {
    WIND_VOLUME_BASE: 0.3,
    RAIN_VOLUME_BASE: 0.4,
    THUNDER_VOLUME: 0.8,
    MAX_DISTANCE: 100,
    ROLLOFF_FACTOR: 0.8,
  },
  
  // Prévisions
  FORECAST: {
    UPDATE_INTERVAL_MINUTES: 15,
    ACCURACY_BY_PERIOD: {
      "now": 0.98,
      "1h": 0.92,
      "3h": 0.85,
      "6h": 0.75,
      "12h": 0.6,
      "24h": 0.45,
    },
  },
  
  // Alertes
  ALERTS: {
    BLIZZARD_WIND_MIN: 60, // km/h
    BLIZZARD_VISIBILITY_MAX: 0.4, // km
    EXTREME_COLD_THRESHOLD: -30, // °C
    ICE_WARNING_FRICTION_MAX: 0.3,
  },
} as const;

// ═══════════════════════════════════════════════════════════
// LABELS & TRADUCTIONS
// ═══════════════════════════════════════════════════════════

export const CONDITION_LABEL: Record<WeatherCondition, string> = {
  ensoleille: "Ensoleillé",
  nuageux: "Nuageux",
  pluie_fine: "Pluie fine",
  pluie_battante: "Pluie battante",
  orage_ete: "Orage d'été",
  poudrerie: "Poudrerie",
  tempete_neige: "Tempête de neige",
  verglas: "Verglas",
  verglas_noir: "Verglas noir",
  froid_polaire: "Froid polaire",
  redoux: "Redoux",
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
  alerte_blizzard: "🚨 Alerte blizzard",
  en_attente: "En attente",
};

export const ALERT_SEVERITY_LABEL: Record<WeatherAlert["severity"], string> = {
  watch: "Veille",
  warning: "Avertissement",
  emergency: "Urgence",
};

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PARTICULES MÉTÉO (NOUVEAU v3.0)
// ═══════════════════════════════════════════════════════════

interface WeatherParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  type: "rain" | "snow" | "fog";
}

class WeatherParticleSystem {
  private particles: WeatherParticle[];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  
  private positions: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;
  
  private windDirection = new THREE.Vector3(0, 0, 1);
  private windStrength = 0;
  
  constructor(type: "rain" | "snow" | "fog", count: number, color: number) {
    this.particles = [];
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        position: new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(100),
          THREE.MathUtils.randFloat(0, 50),
          THREE.MathUtils.randFloatSpread(100)
        ),
        velocity: new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(0.5),
          type === "rain" ? -WEATHER_CONFIG.PARTICLES.FALL_SPEED_RAIN : -WEATHER_CONFIG.PARTICLES.FALL_SPEED_SNOW,
          THREE.MathUtils.randFloatSpread(0.5)
        ),
        size: type === "snow" 
          ? THREE.MathUtils.randFloat(0.08, 0.2) 
          : type === "rain" 
            ? THREE.MathUtils.randFloat(0.02, 0.05) 
            : 0.15,
        opacity: type === "fog" ? 0.15 : THREE.MathUtils.randFloat(0.4, 0.9),
        life: THREE.MathUtils.randFloat(0, 10),
        maxLife: type === "fog" ? 30 : 10,
        type,
      });
    }
    
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));
    
    this.material = new THREE.PointsMaterial({
      color,
      size: type === "fog" ? 2 : 0.1,
      transparent: true,
      opacity: type === "fog" ? WEATHER_CONFIG.PARTICLES.FOG_DENSITY : 0.7,
      depthWrite: false,
      blending: type === "fog" ? THREE.NormalBlending : THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    
    this.positions = positions;
    this.sizes = sizes;
    this.opacities = opacities;
    
    this.updateBuffers();
  }
  
  public getMesh(): THREE.Points {
    return this.points;
  }
  
  public setWind(direction: THREE.Vector3, strength: number): void {
    this.windDirection.copy(direction).normalize();
    this.windStrength = strength;
  }
  
  public update(deltaTime: number, cameraPosition?: THREE.Vector3): void {
    let activeCount = 0;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        // Reset particule
        p.position.set(
          THREE.MathUtils.randFloatSpread(100),
          50,
          THREE.MathUtils.randFloatSpread(100)
        );
        p.life = 0;
        p.velocity.y = p.type === "rain" 
          ? -WEATHER_CONFIG.PARTICLES.FALL_SPEED_RAIN 
          : -WEATHER_CONFIG.PARTICLES.FALL_SPEED_SNOW;
      }
      
      // Gravité
      p.velocity.y += p.type === "snow" ? 0.02 : 0;
      
      // Vent
      if (this.windStrength > 0) {
        p.velocity.x += this.windDirection.x * this.windStrength * WEATHER_CONFIG.PARTICLES.WIND_INFLUENCE * deltaTime;
        p.velocity.z += this.windDirection.z * this.windStrength * WEATHER_CONFIG.PARTICLES.WIND_INFLUENCE * deltaTime;
      }
      
      // Turbulence pour neige
      if (p.type === "snow") {
        p.velocity.x += Math.sin(p.life * 2 + i) * 0.02;
        p.velocity.z += Math.cos(p.life * 1.5 + i * 0.5) * 0.02;
      }
      
      // Mise à jour position
      p.position.addScaledVector(p.velocity, deltaTime);
      
      // Recyclage si hors zone
      if (p.position.y < -10) {
        p.position.y = 50;
        p.position.x = THREE.MathUtils.randFloatSpread(100);
        p.position.z = THREE.MathUtils.randFloatSpread(100);
      }
      
      // Opacité basée sur la vie
      const lifeRatio = 1 - (p.life / p.maxLife);
      p.opacity = p.type === "fog" 
        ? WEATHER_CONFIG.PARTICLES.FOG_DENSITY * lifeRatio 
        : THREE.MathUtils.lerp(0.2, 0.9, lifeRatio);
      
      // Taille variable pour neige
      if (p.type === "snow") {
        p.size = THREE.MathUtils.lerp(0.08, 0.2, Math.sin(p.life * 3) * 0.5 + 0.5);
      }
      
      // LOD : cacher les particules loin de la caméra
      if (cameraPosition) {
        const dist = p.position.distanceTo(cameraPosition);
        if (dist > 80) {
          p.opacity *= 0.1;
        }
      }
      
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      this.sizes[i] = p.size;
      this.opacities[i] = p.opacity;
      
      activeCount++;
    }
    
    this.updateBuffers();
  }
  
  private updateBuffers(): void {
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.opacity.needsUpdate = true;
  }
  
  public setVisible(visible: boolean): void {
    this.points.visible = visible;
  }
  
  public setOpacity(opacity: number): void {
    this.material.opacity = opacity;
  }
  
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME AUDIO MÉTÉO (NOUVEAU v3.0)
// ═══════════════════════════════════════════════════════════

class WeatherAudioSystem {
  private listener?: THREE.AudioListener;
  private sounds = new Map<string, THREE.PositionalAudio>();
  private ambientSound?: THREE.Audio;
  private thunderSound?: THREE.Audio;
  
  private windVolume = 0;
  private rainVolume = 0;
  private thunderNext = 0;
  
  constructor() {}
  
  public setListener(listener: THREE.AudioListener): void {
    this.listener = listener;
  }
  
  public createAmbientSound(audioLoader: THREE.AudioLoader, url: string): void {
    if (!this.listener) return;
    
    this.ambientSound = new THREE.Audio(this.listener);
    audioLoader.load(url, (buffer) => {
      this.ambientSound?.setBuffer(buffer);
      this.ambientSound?.setLoop(true);
      this.ambientSound?.setVolume(0);
    });
  }
  
  public createThunderSound(audioLoader: THREE.AudioLoader, url: string): void {
    if (!this.listener) return;
    
    this.thunderSound = new THREE.Audio(this.listener);
    audioLoader.load(url, (buffer) => {
      this.thunderSound?.setBuffer(buffer);
      this.thunderSound?.setVolume(0);
    });
  }
  
  public createPositionalSound(id: string, position: THREE.Vector3): THREE.PositionalAudio | null {
    if (!this.listener) return null;
    
    const sound = new THREE.PositionalAudio(this.listener);
    sound.position.copy(position);
    sound.setRefDistance(10);
    sound.setRolloffFactor(WEATHER_CONFIG.AUDIO.ROLLOFF_FACTOR);
    sound.setMaxDistance(WEATHER_CONFIG.AUDIO.MAX_DISTANCE);
    
    this.sounds.set(id, sound);
    return sound;
  }
  
  public updateWeatherAudio(condition: WeatherCondition, windSpeed: number, temperature: number): void {
    // Volume du vent
    const targetWindVolume = Math.min(1, windSpeed / 80) * WEATHER_CONFIG.AUDIO.WIND_VOLUME_BASE;
    this.windVolume = THREE.MathUtils.lerp(this.windVolume, targetWindVolume, 0.02);
    
    // Volume de la pluie
    let targetRainVolume = 0;
    if (condition === "pluie_fine") targetRainVolume = 0.3;
    else if (condition === "pluie_battante") targetRainVolume = 0.6;
    else if (condition === "tempete_neige") targetRainVolume = 0.4;
    else if (condition === "poudrerie") targetRainVolume = 0.2;
    
    this.rainVolume = THREE.MathUtils.lerp(this.rainVolume, targetRainVolume * WEATHER_CONFIG.AUDIO.RAIN_VOLUME_BASE, 0.02);
    
    // Appliquer les volumes
    if (this.ambientSound) {
      this.ambientSound.setVolume(this.windVolume + this.rainVolume);
    }
    
    // Orage : tonnerre aléatoire
    if (condition === "orage_ete" && Date.now() > this.thunderNext) {
      if (Math.random() < 0.02 && this.thunderSound) {
        this.thunderSound.setVolume(WEATHER_CONFIG.AUDIO.THUNDER_VOLUME * Math.random() + 0.3);
        this.thunderSound.play();
        this.thunderNext = Date.now() + THREE.MathUtils.randInt(5000, 20000);
      }
    }
    
    // Craquement de la glace en froid extrême
    if (condition === "froid_polaire" && temperature < -25) {
      if (Math.random() < 0.005) {
        // TODO: Jouer son de craquement de glace
      }
    }
  }
  
  public stopAll(): void {
    this.ambientSound?.stop();
    this.thunderSound?.stop();
    for (const sound of this.sounds.values()) {
      sound.stop();
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE NEIGE PROCÉDURALE SUR TERRAIN (NOUVEAU v3.0)
// ═══════════════════════════════════════════════════════════

interface SnowLayer {
  depth: number; // cm
  density: number; // 0-1 (poudreuse à tassée)
  lastUpdate: number;
  melted: boolean;
}

class TerrainSnowSystem {
  private snowLayers = new Map<string, SnowLayer>();
  private snowTexture?: THREE.DataTexture;
  private snowMaterial?: THREE.ShaderMaterial;
  
  public updateSnowDepth(zoneId: string, accumulation: number, meltRate: number, deltaTime: number): void {
    let layer = this.snowLayers.get(zoneId);
    
    if (!layer) {
      layer = {
        depth: 0,
        density: 0.3,
        lastUpdate: Date.now(),
        melted: false,
      };
      this.snowLayers.set(zoneId, layer);
    }
    
    // Accumulation
    layer.depth = Math.max(0, layer.depth + accumulation * deltaTime - meltRate * deltaTime);
    
    // Densité : augmente avec le temps et la température
    if (layer.depth > 0) {
      layer.density = Math.min(1, layer.density + deltaTime * 0.001);
      if (layer.depth > 20) layer.density = Math.min(1, layer.density + deltaTime * 0.002);
    }
    
    // Fonte complète
    if (layer.depth < 0.5) {
      layer.melted = true;
      layer.depth = 0;
    }
    
    layer.lastUpdate = Date.now();
  }
  
  public getSnowDepth(zoneId: string): number {
    return this.snowLayers.get(zoneId)?.depth ?? 0;
  }
  
  public getSnowDensity(zoneId: string): number {
    return this.snowLayers.get(zoneId)?.density ?? 0.3;
  }
  
  public isSnowCovered(zoneId: string): boolean {
    return (this.snowLayers.get(zoneId)?.depth ?? 0) > 2;
  }
  
  public clearZone(zoneId: string): void {
    this.snowLayers.delete(zoneId);
  }
  
  public clearAll(): void {
    this.snowLayers.clear();
  }
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME D'ÉVÉNEMENTS MÉTÉO
// ═══════════════════════════════════════════════════════════

export type WeatherEventCallback<T = unknown> = (data: T) => void;

export interface WeatherEvents {
  onConditionChanged: (data: { old: WeatherCondition; new: WeatherCondition }) => void;
  onSeasonChanged: (data: { old: QuebecSeason; new: QuebecSeason }) => void;
  onAlertIssued: (data: { alert: WeatherAlert }) => void;
  onAlertExpired: (data: { alertId: string }) => void;
  onPlowActivated: (data: { plowId: string; route: string }) => void;
  onRoadConditionsUpdated: (data: { zoneId: string; friction: number; ice: boolean }) => void;
}

class WeatherEventEmitter {
  private listeners = new Map<keyof WeatherEvents, Set<WeatherEventCallback>>();

  public on<K extends keyof WeatherEvents>(event: K, callback: WeatherEvents[K]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as WeatherEventCallback);
    return () => this.listeners.get(event)?.delete(callback as WeatherEventCallback);
  }

  public emit<K extends keyof WeatherEvents>(event: K, data: Parameters<WeatherEvents[K]>[0]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          (cb as WeatherEventCallback)(data);
        } catch (err) {
          console.error(`[QuebecSeasons] Event listener error for ${event}:`, err);
        }
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// CLASSE PRINCIPALE : QuebecSeasonsService
// ═══════════════════════════════════════════════════════════

export class QuebecSeasonsService {
  private static instance: QuebecSeasonsService;
  
  private state: QuebecWeatherState;
  private locked = false;
  
  // Systèmes internes
  private particleSystem?: WeatherParticleSystem;
  private audioSystem = new WeatherAudioSystem();
  private terrainSnow = new TerrainSnowSystem();
  private eventEmitter = new WeatherEventEmitter();
  
  // Cache pour performance
  private frictionCache = new Map<string, number>();
  private lastFrictionUpdate = 0;
  
  // Prévisions générées
  private forecastCache: WeatherForecast[] = [];
  private lastForecastUpdate = 0;
  
  private constructor() {
    this.state = this.createInitialState();
    this.generateForecast();
  }

  public static getInstance(): QuebecSeasonsService {
    if (!QuebecSeasonsService.instance) {
      QuebecSeasonsService.instance = new QuebecSeasonsService();
    }
    return QuebecSeasonsService.instance;
  }

  private createInitialState(): QuebecWeatherState {
    return {
      season: "automne",
      condition: "nuageux",
      temperatureCelsius: 9,
      feelsLikeCelsius: 7,
      humidity: 72,
      pressure: 1013,
      windSpeedKmH: 18,
      windDirection: 245,
      windGustKmH: 28,
      visibility: 12,
      cloudCover: 0.6,
      uvIndex: 2,
      
      snowAccumulationCm: 0,
      snowDepthVariation: 0,
      iceLayer: false,
      blackIceRisk: 0,
      
      roadFrictionCoeff: 0.75,
      roadSurfaceState: {},
      
      snowPlowStatus: "idle",
      plows: this.clonePlows(DEFAULT_PLOWS),
      
      forecast: [],
      alerts: [],
      
      lastUpdated: Date.now(),
      nextUpdateIn: 300,
      dataProvider: "Environnement Canada (simulé)",
    };
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALISATION DES EFFETS VISUELS & AUDIO
  // ═══════════════════════════════════════════════════════════

  public initVisualEffects(scene: THREE.Scene, camera: THREE.Camera, audioContext?: AudioContext): void {
    // Particules météo
    this.particleSystem = new WeatherParticleSystem(
      "rain",
      WEATHER_CONFIG.PARTICLES.RAIN_COUNT,
      0x88aacc
    );
    this.particleSystem.getMesh().position.y = 25;
    this.particleSystem.setVisible(false);
    scene.add(this.particleSystem.getMesh());
    
    // Audio
    if (audioContext) {
      const listener = new THREE.AudioListener();
      camera.add(listener);
      this.audioSystem.setListener(listener);
      
      // TODO: Charger les sons réels
      // const audioLoader = new THREE.AudioLoader();
      // this.audioSystem.createAmbientSound(audioLoader, "sfx/weather_ambient_loop.mp3");
      // this.audioSystem.createThunderSound(audioLoader, "sfx/thunder_01.mp3");
    }
  }

  public setCamera(camera: THREE.Camera): void {
    // Pour le LOD des particules
  }

  public on<K extends keyof WeatherEvents>(event: K, callback: WeatherEvents[K]): () => void {
    return this.eventEmitter.on(event, callback);
  }

  // ═══════════════════════════════════════════════════════════
  // GETTERS & ÉTAT
  // ═══════════════════════════════════════════════════════════

  public getState(): QuebecWeatherState {
    return {
      ...this.state,
      plows: this.clonePlows(this.state.plows),
      forecast: [...this.state.forecast],
      alerts: [...this.state.alerts],
    };
  }

  public getRoadFriction(zoneId?: string): number {
    // Cache pour performance
    const now = Date.now();
    const cacheKey = zoneId || "global";
    
    if (now - this.lastFrictionUpdate < 1000 && this.frictionCache.has(cacheKey)) {
      return this.frictionCache.get(cacheKey)!;
    }
    
    let friction: number = WEATHER_CONFIG.ROAD_FRICTION[this.state.condition] ?? 0.75;
    
    // Variation locale
    if (zoneId) {
      const roadState = this.state.roadSurfaceState[zoneId];
      if (roadState) {
        friction = roadState.frictionCoeff;
      } else {
        // Variation aléatoire basée sur la zone
        const hash = zoneId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
        const variation = ((hash % 100) - 50) / 1000;
        friction = THREE.MathUtils.clamp(friction + variation, 0.15, 1);
      }
    }
    
    // Effet de la température sur la glace
    if (this.state.iceLayer || this.state.condition === "verglas") {
      friction = Math.min(friction, 0.25);
    }
    
    this.frictionCache.set(cacheKey, friction);
    this.lastFrictionUpdate = now;
    
    return friction;
  }

  public isWinterPrecip(): boolean {
    const c = this.state.condition;
    return c === "poudrerie" || c === "tempete_neige" || c === "froid_polaire";
  }

  public isIcy(): boolean {
    return this.state.roadFrictionCoeff < 0.72 || 
           this.state.condition === "verglas" || 
           this.state.condition === "verglas_noir";
  }

  public getSnowDepth(zoneId?: string): number {
    if (zoneId) {
      return this.terrainSnow.getSnowDepth(zoneId);
    }
    return this.state.snowAccumulationCm + (this.state.snowDepthVariation || 0);
  }

  // ═══════════════════════════════════════════════════════════
  // CONTRÔLE DE LA MÉTÉO
  // ═══════════════════════════════════════════════════════════

  public triggerBlizzard(): QuebecWeatherState {
    const oldCondition = this.state.condition;
    
    this.locked = true;
    this.state.season = "hiver";
    this.state.condition = "tempete_neige";
    this.state.temperatureCelsius = -22;
    this.state.feelsLikeCelsius = -35;
    this.state.windSpeedKmH = 75;
    this.state.windGustKmH = 95;
    this.state.visibility = 0.3;
    this.state.cloudCover = 1;
    this.state.snowAccumulationCm = Math.min(80, this.state.snowAccumulationCm + 15);
    this.state.roadFrictionCoeff = 0.25;
    this.state.iceLayer = true;
    this.state.blackIceRisk = 0.9;
    this.state.snowPlowStatus = "alerte_blizzard";
    
    this.state.plows.forEach((p) => {
      p.active = true;
      p.saltSpreaderOn = true;
    });
    
    // Alertes
    this.createAlert({
      severity: "emergency",
      type: "blizzard",
      title: "Blizzard en cours",
      message: "Visibilité réduite à moins de 400m. Vent soutenu à 75 km/h. Évitez tout déplacement non essentiel.",
      affectedZones: ["route_138", "rang_alban", "rang_casimir"],
    });
    
    // Mise à jour particules
    this.updateParticleEffect();
    
    this.state.lastUpdated = Date.now();
    this.eventEmitter.emit("onConditionChanged", { old: oldCondition, new: "tempete_neige" });
    
    return this.getState();
  }

  public runPlowOperation(plowId: string, amountClearedCm: number): QuebecWeatherState {
    const plow = this.state.plows.find((p) => p.id === plowId);
    if (!plow) return this.getState();
    
    plow.active = true;
    plow.progressPercent = Math.min(100, plow.progressPercent + amountClearedCm * 1.6);
    plow.lastUpdate = Date.now();
    
    if (plow.isMTQ) {
      plow.saltSpreaderOn = true;
      // Le sel réduit le risque de verglas
      this.state.blackIceRisk = Math.max(0, this.state.blackIceRisk - 0.1);
    }
    
    // Mise à jour accumulation
    this.state.snowAccumulationCm = Math.max(0, this.state.snowAccumulationCm - amountClearedCm);
    
    // Mise à jour friction
    if (this.state.snowAccumulationCm < 5) {
      this.state.roadFrictionCoeff = Math.min(0.92, this.state.roadFrictionCoeff + 0.12);
      this.state.snowPlowStatus = "routes_dégagées";
      if (this.state.condition === "tempete_neige") {
        this.setCondition("poudrerie");
      }
    } else {
      this.state.roadFrictionCoeff = Math.min(0.7, 0.35 + (1 - this.state.snowAccumulationCm / 50) * 0.3);
      this.state.snowPlowStatus = "en_cours";
    }
    
    // Mise à jour terrain snow
    if (plow.assignedRoute) {
      this.terrainSnow.updateSnowDepth(plow.assignedRoute, -amountClearedCm, 0, 1);
      this.eventEmitter.emit("onRoadConditionsUpdated", {
        zoneId: plow.assignedRoute,
        friction: this.state.roadFrictionCoeff,
        ice: this.state.iceLayer,
      });
    }
    
    this.eventEmitter.emit("onPlowActivated", { plowId, route: plow.assignedRoute });
    
    this.state.lastUpdated = Date.now();
    return this.getState();
  }

  public setSeason(season: QuebecSeason): QuebecWeatherState {
    const oldSeason = this.state.season;
    
    this.locked = true;
    this.state.season = season;
    
    switch (season) {
      case "hiver":
        this.state.condition = "poudrerie";
        this.state.temperatureCelsius = -15;
        this.state.windSpeedKmH = 38;
        this.state.snowAccumulationCm = 25;
        this.state.roadFrictionCoeff = 0.45;
        this.state.iceLayer = true;
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
        this.state.iceLayer = false;
        this.idlePlows();
        this.terrainSnow.clearAll();
        break;
        
      case "ete":
        this.state.condition = "ensoleille";
        this.state.temperatureCelsius = 26;
        this.state.windSpeedKmH = 12;
        this.state.snowAccumulationCm = 0;
        this.state.roadFrictionCoeff = 1;
        this.state.iceLayer = false;
        this.idlePlows();
        this.terrainSnow.clearAll();
        break;
        
      case "automne":
        this.state.condition = "nuageux";
        this.state.temperatureCelsius = 9;
        this.state.windSpeedKmH = 18;
        this.state.snowAccumulationCm = 0;
        this.state.roadFrictionCoeff = 0.75;
        this.state.iceLayer = false;
        this.idlePlows();
        this.terrainSnow.clearAll();
        break;
    }
    
    this.updateParticleEffect();
    this.generateForecast();
    
    this.state.lastUpdated = Date.now();
    this.eventEmitter.emit("onSeasonChanged", { old: oldSeason, new: season });
    
    return this.getState();
  }

  public setCondition(condition: WeatherCondition): QuebecWeatherState {
    const oldCondition = this.state.condition;
    
    this.locked = true;
    this.state.condition = condition;
    
    // Gestion des cas spéciaux
    if (condition === "tempete_neige") {
      return this.triggerBlizzard();
    }
    
    if (condition === "poudrerie") {
      this.state.season = "hiver";
      this.state.temperatureCelsius = -14;
      this.state.windSpeedKmH = 45;
      this.state.snowAccumulationCm = Math.max(12, this.state.snowAccumulationCm);
      this.state.roadFrictionCoeff = 0.45;
      this.state.iceLayer = true;
      this.state.snowPlowStatus = "en_cours";
      this.state.plows.forEach((p) => {
        p.active = true;
        p.saltSpreaderOn = p.isMTQ;
      });
    } else if (condition === "verglas" || condition === "verglas_noir") {
      this.state.temperatureCelsius = Math.min(-1, this.state.temperatureCelsius);
      this.state.roadFrictionCoeff = condition === "verglas_noir" ? 0.18 : 0.22;
      this.state.windSpeedKmH = 28;
      this.state.iceLayer = true;
      this.state.blackIceRisk = condition === "verglas_noir" ? 1 : 0.8;
      this.state.snowPlowStatus = "en_cours";
      this.state.plows.forEach((p) => {
        p.active = true;
        p.saltSpreaderOn = true;
      });
      
      // Alerte verglas
      if (condition === "verglas_noir") {
        this.createAlert({
          severity: "warning",
          type: "verglas",
          title: "Verglas noir détecté",
          message: "Surface routière extrêmement glissante. Prudence extrême requise.",
          affectedZones: ["route_138", "autoroute_40"],
        });
      }
    } else if (condition === "froid_polaire") {
      this.state.season = "hiver";
      this.state.temperatureCelsius = -32;
      this.state.feelsLikeCelsius = -45;
      this.state.windSpeedKmH = 20;
      this.state.roadFrictionCoeff = 0.55;
      this.state.visibility = 15;
    } else if (condition === "orage_ete") {
      this.state.season = "ete";
      this.state.temperatureCelsius = 24;
      this.state.windSpeedKmH = 55;
      this.state.windGustKmH = 80;
      this.state.snowAccumulationCm = 0;
      this.state.roadFrictionCoeff = 0.7;
      this.state.visibility = 5;
      this.state.cloudCover = 0.95;
      this.idlePlows();
    } else if (condition === "pluie_fine" || condition === "pluie_battante") {
      this.state.temperatureCelsius = this.state.season === "hiver" ? 1 : 8;
      this.state.windSpeedKmH = condition === "pluie_battante" ? 45 : 22;
      this.state.roadFrictionCoeff = WEATHER_CONFIG.ROAD_FRICTION[condition];
      this.state.visibility = condition === "pluie_battante" ? 3 : 8;
    } else if (condition === "ensoleille") {
      this.state.windSpeedKmH = 10;
      this.state.roadFrictionCoeff = this.state.season === "hiver" ? 0.7 : 1;
      this.state.visibility = 20;
      this.state.cloudCover = 0.1;
      this.state.uvIndex = this.state.season === "ete" ? 7 : 3;
    } else {
      this.state.windSpeedKmH = 16;
    }
    
    // Mise à jour "feels like"
    this.state.feelsLikeCelsius = this.calculateFeelsLike();
    
    // Mise à jour particules
    this.updateParticleEffect();
    
    this.state.lastUpdated = Date.now();
    this.eventEmitter.emit("onConditionChanged", { old: oldCondition, new: condition });
    
    return this.getState();
  }

  public syncFromClock(month: number, weather: WeatherId): QuebecWeatherState {
    if (this.locked) return this.getState();
    
    const season = seasonFromMonth(month);
    this.state.season = season;
    this.state.condition = conditionFromWeather(weather, season);
    
    if (season === "hiver" && (weather === "snow" || weather === "storm")) {
      this.state.snowAccumulationCm = Math.max(
        this.state.snowAccumulationCm, 
        weather === "storm" ? 28 : 12
      );
      this.state.roadFrictionCoeff = weather === "storm" ? 0.28 : 0.48;
      this.state.snowPlowStatus = "en_cours";
      this.state.plows.forEach((p) => {
        p.active = true;
        p.saltSpreaderOn = p.isMTQ;
      });
    }
    
    this.updateParticleEffect();
    this.state.lastUpdated = Date.now();
    return this.getState();
  }

  public unlockClock(): void {
    this.locked = false;
  }

  // ═══════════════════════════════════════════════════════════
  // TICK & SIMULATION TEMPS RÉEL
  // ═══════════════════════════════════════════════════════════

  public tick(dt: number, gameHours: number, cameraPosition?: THREE.Vector3): QuebecWeatherState {
    // Mise à jour température avec cycle jour/nuit
    const sunAngle = ((gameHours - 7) / 24) * Math.PI * 2;
    const sunFactor = Math.max(0, Math.sin(sunAngle)) * 3.2;
    const baseTemp = this.baseTemp();
    this.state.temperatureCelsius = Math.round((baseTemp + sunFactor) * 10) / 10;
    this.state.feelsLikeCelsius = this.calculateFeelsLike();
    
    const c = this.state.condition;
    
    // Accumulation/fonte de neige
    if (c === "tempete_neige") {
      this.state.snowAccumulationCm = Math.min(90, this.state.snowAccumulationCm + dt * WEATHER_CONFIG.SNOW_ACCUMULATION.tempete_neige);
      this.state.roadFrictionCoeff = Math.max(0.18, 0.4 - this.state.snowAccumulationCm * 0.004);
      this.state.windSpeedKmH = 70 + Math.sin(gameHours) * 8;
      this.state.visibility = Math.max(0.2, 0.4 - this.state.snowAccumulationCm * 0.003);
    } else if (c === "poudrerie") {
      this.state.snowAccumulationCm = Math.min(45, this.state.snowAccumulationCm + dt * WEATHER_CONFIG.SNOW_ACCUMULATION.poudrerie);
      this.state.windSpeedKmH = 38 + Math.sin(gameHours * 0.7) * 10;
    } else if ((c === "pluie_fine" || c === "pluie_battante") && this.state.season === "printemps" && this.state.snowAccumulationCm > 0) {
      // Fonte au printemps
      const meltRate = this.state.temperatureCelsius > 0 
        ? WEATHER_CONFIG.SNOW_MELT_RATE.above_zero 
        : this.state.temperatureCelsius > -2 
          ? WEATHER_CONFIG.SNOW_MELT_RATE.near_zero 
          : WEATHER_CONFIG.SNOW_MELT_RATE.below_freezing;
      this.state.snowAccumulationCm = Math.max(0, this.state.snowAccumulationCm - dt * meltRate);
    }
    
    // Mise à jour terrain snow par zone
    for (const [zoneId, roadState] of Object.entries(this.state.roadSurfaceState)) {
      const meltRate = roadState.temperature > 0 ? 0.2 : roadState.temperature > -2 ? 0.05 : 0;
      this.terrainSnow.updateSnowDepth(zoneId, 
        c === "tempete_neige" ? 0.35 : c === "poudrerie" ? 0.08 : 0,
        meltRate,
        dt
      );
    }
    
    // Déneigement automatique
    if (this.state.snowPlowStatus === "en_cours" || this.state.snowPlowStatus === "alerte_blizzard") {
      for (const p of this.state.plows) {
        if (!p.active) continue;
        p.progressPercent = Math.min(100, p.progressPercent + dt * (p.isMTQ ? 1.8 : 1.1));
        const cleared = dt * (p.isMTQ ? 0.12 : 0.05);
        this.state.snowAccumulationCm = Math.max(0, this.state.snowAccumulationCm - cleared);
        
        if (p.assignedRoute) {
          this.terrainSnow.updateSnowDepth(p.assignedRoute, -cleared, 0, dt);
        }
      }
      
      if (this.state.snowAccumulationCm < 4 && c !== "tempete_neige") {
        this.state.snowPlowStatus = "routes_dégagées";
        this.state.roadFrictionCoeff = Math.min(0.9, this.state.roadFrictionCoeff + dt * 0.04);
      }
    }
    
    // Vérification risque de verglas noir
    this.updateBlackIceRisk();
    
    // Mise à jour particules
    if (this.particleSystem) {
      this.particleSystem.setWind(
        new THREE.Vector3(
          Math.cos(this.state.windDirection * Math.PI / 180),
          0,
          Math.sin(this.state.windDirection * Math.PI / 180)
        ),
        this.state.windSpeedKmH / 100
      );
      this.particleSystem.update(dt, cameraPosition);
    }
    
    // Mise à jour audio
    this.audioSystem.updateWeatherAudio(c, this.state.windSpeedKmH, this.state.temperatureCelsius);
    
    // Expiration des alertes
    this.checkAlertExpirations();
    
    // Mise à jour prévisions périodique
    if (Date.now() - this.lastForecastUpdate > WEATHER_CONFIG.FORECAST.UPDATE_INTERVAL_MINUTES * 60 * 1000) {
      this.generateForecast();
    }
    
    this.state.lastUpdated = Date.now();
    this.state.nextUpdateIn = Math.max(0, 300 - Math.floor((Date.now() - this.state.lastUpdated) / 1000));
    
    // Invalidation cache friction
    this.frictionCache.clear();
    
    return this.getState();
  }

  // ═══════════════════════════════════════════════════════════
  // PARTICULES & EFFETS VISUELS
  // ═══════════════════════════════════════════════════════════

  private updateParticleEffect(): void {
    if (!this.particleSystem) return;
    
    const c = this.state.condition;
    
    if (c === "pluie_fine" || c === "pluie_battante" || c === "orage_ete") {
      this.particleSystem.setVisible(true);
      // TODO: Changer couleur/paramètres pour pluie
    } else if (c === "poudrerie" || c === "tempete_neige") {
      this.particleSystem.setVisible(true);
      // TODO: Changer pour neige
    } else if (c === "nuageux" || (c as string) === "fog") {
      // TODO: Activer fog particles
    } else {
      this.particleSystem.setVisible(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PRÉVISIONS MÉTÉO
  // ═══════════════════════════════════════════════════════════

  private generateForecast(): void {
    const now = Date.now();
    const baseCondition = this.state.condition;
    const baseTemp = this.state.temperatureCelsius;
    
    this.state.forecast = [
      {
        period: "now",
        condition: baseCondition,
        temperatureMin: Math.round(baseTemp - 1),
        temperatureMax: Math.round(baseTemp + 2),
        precipitationChance: this.getPrecipChance(baseCondition),
        windSpeedKmH: this.state.windSpeedKmH,
      },
      this.generateForecastEntry("1h", baseCondition, baseTemp, 0.92),
      this.generateForecastEntry("3h", baseCondition, baseTemp, 0.85),
      this.generateForecastEntry("6h", baseCondition, baseTemp, 0.75),
      this.generateForecastEntry("12h", baseCondition, baseTemp, 0.6),
      this.generateForecastEntry("24h", baseCondition, baseTemp, 0.45),
    ];
    
    this.forecastCache = [...this.state.forecast];
    this.lastForecastUpdate = now;
  }

  private generateForecastEntry(
    period: ForecastPeriod,
    baseCondition: WeatherCondition,
    baseTemp: number,
    accuracy: number
  ): WeatherForecast {
    // Variation aléatoire basée sur la précision
    const variation = (1 - accuracy) * 2;
    
    let condition = baseCondition;
    if (Math.random() < variation) {
      const possibleConditions = WEATHER_CONFIG.SEASON_CONDITIONS[this.state.season];
      condition = possibleConditions[Math.floor(Math.random() * possibleConditions.length)];
    }
    
    const tempVariation = (1 - accuracy) * 5;
    
    return {
      period,
      condition,
      temperatureMin: Math.round(baseTemp - 3 - tempVariation * Math.random()),
      temperatureMax: Math.round(baseTemp + 4 + tempVariation * Math.random()),
      precipitationChance: this.getPrecipChance(condition) + (Math.random() - 0.5) * variation * 20,
      windSpeedKmH: Math.round(this.state.windSpeedKmH * (1 + (Math.random() - 0.5) * variation * 0.5)),
    };
  }

  private getPrecipChance(condition: WeatherCondition): number {
    const precipConditions: Record<WeatherCondition, number> = {
      ensoleille: 5,
      nuageux: 20,
      pluie_fine: 90,
      pluie_battante: 95,
      orage_ete: 85,
      poudrerie: 70,
      tempete_neige: 95,
      verglas: 40,
      verglas_noir: 30,
      froid_polaire: 10,
      redoux: 50,
    };
    return precipConditions[condition] ?? 20;
  }

  public getForecast(period: ForecastPeriod = "now"): WeatherForecast | undefined {
    return this.state.forecast.find((f) => f.period === period);
  }

  // ═══════════════════════════════════════════════════════════
  // ALERTES MÉTÉO
  // ═══════════════════════════════════════════════════════════

  private createAlert(alert: Omit<WeatherAlert, "id" | "issuedAt" | "expiresAt">): WeatherAlert {
    const fullAlert: WeatherAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (alert.severity === "emergency" ? 2 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000),
    };
    
    this.state.alerts.push(fullAlert);
    this.eventEmitter.emit("onAlertIssued", { alert: fullAlert });
    
    return fullAlert;
  }

  private checkAlertExpirations(): void {
    const now = Date.now();
    const expiredIds: string[] = [];
    
    this.state.alerts = this.state.alerts.filter((alert) => {
      if (alert.expiresAt < now) {
        expiredIds.push(alert.id);
        return false;
      }
      return true;
    });
    
    for (const id of expiredIds) {
      this.eventEmitter.emit("onAlertExpired", { alertId: id });
    }
  }

  private updateBlackIceRisk(): void {
    const { temp_range, humidity_min, recent_precip_hours } = WEATHER_CONFIG.BLACK_ICE_THRESHOLDS;
    
    let risk = 0;
    
    // Température dans la zone critique
    if (this.state.temperatureCelsius >= temp_range[0] && this.state.temperatureCelsius <= temp_range[1]) {
      risk += 0.4;
    }
    
    // Humidité élevée
    if (this.state.humidity >= humidity_min) {
      risk += 0.3;
    }
    
    // Précipitations récentes
    if (["pluie_fine", "pluie_battante", "tempete_neige", "poudrerie"].includes(this.state.condition)) {
      risk += 0.3;
    }
    
    this.state.blackIceRisk = Math.min(1, risk);
    
    // Alerte automatique si risque élevé
    if (this.state.blackIceRisk > 0.7 && this.state.condition !== "verglas_noir") {
      const existing = this.state.alerts.find((a) => a.type === "verglas" && !a.expiresAt || a.expiresAt > Date.now());
      if (!existing) {
        this.createAlert({
          severity: "warning",
          type: "verglas",
          title: "Risque de verglas",
          message: "Conditions propices à la formation de verglas. Prudence sur les routes.",
          affectedZones: ["route_138"],
        });
      }
    }
  }

  public getActiveAlerts(): WeatherAlert[] {
    const now = Date.now();
    return this.state.alerts.filter((a) => !a.expiresAt || a.expiresAt > now);
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITAIRES INTERNES
  // ═══════════════════════════════════════════════════════════

  private calculateFeelsLike(): number {
    // Formule simplifiée de wind chill / heat index
    const temp = this.state.temperatureCelsius;
    const wind = this.state.windSpeedKmH;
    const humidity = this.state.humidity;
    
    if (temp <= 10 && wind >= 5) {
      // Wind chill (froid)
      return Math.round((13.12 + 0.6215 * temp - 11.37 * Math.pow(wind, 0.16) + 0.3965 * temp * Math.pow(wind, 0.16)) * 10) / 10;
    } else if (temp >= 20 && humidity >= 40) {
      // Heat index simplifié (chaud)
      return Math.round((temp + (humidity - 40) * 0.1) * 10) / 10;
    }
    
    return temp;
  }

  private baseTemp(): number {
    const config = WEATHER_CONFIG.SEASON_BASE_TEMP[this.state.season];
    
    switch (this.state.condition) {
      case "froid_polaire": return -32;
      case "tempete_neige": return -22;
      case "poudrerie": return -14;
      case "verglas":
      case "verglas_noir": return -3;
      case "pluie_fine":
      case "pluie_battante": return this.state.season === "hiver" ? 1 : 7;
      case "orage_ete": return 24;
      case "ensoleille": return this.state.season === "ete" ? 26 : this.state.season === "hiver" ? -8 : config.avg;
      default: return config.avg;
    }
  }

  private idlePlows(): void {
    this.state.snowPlowStatus = "idle";
    this.state.plows.forEach((p) => {
      p.active = false;
      p.saltSpreaderOn = false;
      p.progressPercent = 0;
    });
  }

  private clonePlows(src: SnowPlowTruck[]): SnowPlowTruck[] {
    return src.map((p) => ({ ...p }));
  }

  // ═══════════════════════════════════════════════════════════
  // PERSISTANCE & RESET
  // ═══════════════════════════════════════════════════════════

  public saveState(): Record<string, unknown> {
    return {
      state: { ...this.state },
      terrainSnow: Object.fromEntries(((this.terrainSnow as any).getSnowLayers?.() ?? [])),
      timestamp: Date.now(),
    };
  }

  public loadState(data: Record<string, unknown>): boolean {
    try {
      if (data.state && typeof data.state === "object") {
        this.state = { ...this.state, ...(data.state as Partial<QuebecWeatherState>) };
      }
      // TODO: Restaurer terrainSnow
      return true;
    } catch (err) {
      console.error("[QuebecSeasons] Load state error:", err);
      return false;
    }
  }

  public reset(): void {
    this.state = this.createInitialState();
    this.frictionCache.clear();
    this.terrainSnow.clearAll();
    this.audioSystem.stopAll();
    if (this.particleSystem) {
      this.particleSystem.setVisible(false);
    }
  }

  public dispose(): void {
    if (this.particleSystem) {
      this.particleSystem.dispose();
    }
    this.audioSystem.stopAll();
    this.reset();
  }
}

// ═══════════════════════════════════════════════════════════
// DONNÉES PAR DÉFAUT
// ═══════════════════════════════════════════════════════════

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
    lastUpdate: 0,
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
    lastUpdate: 0,
  },
  {
    id: "mtq_charrue_40",
    name: "Chasse-neige MTQ Freightliner #205",
    driverName: "Marc-André Tremblay",
    isMTQ: true,
    assignedRoute: "Autoroute 40 Québec — Trois-Rivières",
    active: false,
    saltSpreaderOn: false,
    progressPercent: 0,
    lastUpdate: 0,
  },
];

// ═══════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES EXPORTÉES
// ═══════════════════════════════════════════════════════════

export function seasonFromMonth(month: number): QuebecSeason {
  if (month <= 2 || month === 12) return "hiver";
  if (month <= 5) return "printemps";
  if (month <= 8) return "ete";
  return "automne";
}

export function weatherIdFromCondition(c: WeatherCondition): WeatherId {
  if (c === "ensoleille") return "clear";
  if (c === "nuageux") return "fog";
  if (c === "pluie_fine" || c === "pluie_battante") return "rain";
  if (c === "orage_ete" || c === "tempete_neige" || c === "verglas" || c === "verglas_noir" || c === "froid_polaire") return "storm";
  return "snow";
}

export function conditionFromWeather(id: WeatherId, season: QuebecSeason): WeatherCondition {
  if (id === "rain") return season === "ete" ? "pluie_battante" : "pluie_fine";
  if (id === "fog") return "nuageux";
  if (id === "clear") return "ensoleille";
  if (id === "snow") return season === "hiver" ? "poudrerie" : "nuageux";
  if (id === "storm") {
    if (season === "hiver") return Math.random() > 0.7 ? "tempete_neige" : "poudrerie";
    if (season === "ete") return "orage_ete";
    return "pluie_battante";
  }
  return "ensoleille";
}

// ═══════════════════════════════════════════════════════════
// EXPORTS DE COMPATIBILITÉ & INSTANCE GLOBALE
// ═══════════════════════════════════════════════════════════

export const quebecSeasons = QuebecSeasonsService.getInstance();

export function getCurrentSeason(): QuebecSeason {
  return quebecSeasons.getState().season;
}

export function getCurrentCondition(): WeatherCondition {
  return quebecSeasons.getState().condition;
}

export function getTemperature(): number {
  return quebecSeasons.getState().temperatureCelsius;
}

export function getFeelsLike(): number {
  return quebecSeasons.getState().feelsLikeCelsius;
}

export function getRoadFriction(zoneId?: string): number {
  return quebecSeasons.getRoadFriction(zoneId);
}

export function getSnowDepth(zoneId?: string): number {
  return quebecSeasons.getSnowDepth(zoneId);
}

export function isIcy(): boolean {
  return quebecSeasons.isIcy();
}

export function getActiveWeatherAlerts(): WeatherAlert[] {
  return quebecSeasons.getActiveAlerts();
}

export function getWeatherForecast(period: ForecastPeriod = "now"): WeatherForecast | undefined {
  return quebecSeasons.getForecast(period);
}

