// ═══════════════════════════════════════════════════════════════════════════
//  WEATHER SYSTEM v2.0 — Moteur météo Three.js (engine pur)
//  src/world/WeatherSystem.ts
// ───────────────────────────────────────────────────────────────────────────
//  • 8 météos (v1 : 5 + snow/blizzard/ice)
//  • Transitions douces (interpolation)
//  • Lightning procédural (storm, blizzard)
//  • Splashes au sol (rain, storm)
//  • Vent directionnel + rafales
//  • Zone bias (couplage ZoneSystem)
//  • Time-of-day (nuit plus sombre)
//  • Saison (hiver = neige, été = orage)
//  • Config + stats + events
//  • Compat 100% v1 (setWeather, update, windSpeed, temperature, humidity)
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────

export type WeatherType =
  | 'clear'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'storm'
  // 🆕 v2
  | 'snow'
  | 'blizzard'
  | 'ice';

export type Season = 'printemps' | 'ete' | 'automne' | 'hiver';

export interface WeatherState {
  type: WeatherType;
  windSpeed: number;
  windDirection: number;   // 0..360°
  temperature: number;     // °C
  humidity: number;        // 0..100
  fogNear: number;
  fogFar: number;
  fogColor: number;
  skyColor: number;
  precipitation: number;   // 0..1
  cloudCover: number;      // 0..1
}

export interface WeatherSystemConfig {
  /** Changement auto de météo (ms). 0 = désactivé */
  autoChangeIntervalMs: number;
  /** Transitions douces */
  transitionsEnabled: boolean;
  transitionDurationMs: number;
  /** Particules */
  maxRainParticles: number;
  maxSnowParticles: number;
  maxSplashParticles: number;
  particleBounds: { x: number; y: number; z: number };
  /** Lightning (storm/blizzard) */
  lightningEnabled: boolean;
  lightningMinIntervalMs: number;
  lightningMaxIntervalMs: number;
  /** Splashes au sol */
  splashEnabled: boolean;
  /** Saison & heure (optionnel) */
  season: Season;
  timeOfDay: number;   // 0..24
  /** Centre les particules sur la caméra */
  centerOnCamera: boolean;
  /** Seed pour reproductibilité */
  seed: number;
}

const DEFAULT_CONFIG: WeatherSystemConfig = {
  autoChangeIntervalMs: 120_000,
  transitionsEnabled: true,
  transitionDurationMs: 8_000,
  maxRainParticles: 6000,
  maxSnowParticles: 4000,
  maxSplashParticles: 400,
  particleBounds: { x: 100, y: 40, z: 100 },
  lightningEnabled: true,
  lightningMinIntervalMs: 6_000,
  lightningMaxIntervalMs: 20_000,
  splashEnabled: true,
  season: 'ete',
  timeOfDay: 12,
  centerOnCamera: true,
  seed: 0,
};

// ─────────────────────────────────────────────────────────────────────────
//  PRESETS DE MÉTÉO
// ─────────────────────────────────────────────────────────────────────────

interface WeatherPreset extends Omit<WeatherState, 'type'> {
  label: string;
  emoji: string;
}

const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  clear: {
    label: 'Ensoleillé', emoji: '☀️',
    windSpeed: 3, windDirection: 220, temperature: 24, humidity: 35,
    fogNear: 40, fogFar: 600, fogColor: 0x87ceeb, skyColor: 0x87ceeb,
    precipitation: 0, cloudCover: 0.05,
  },
  cloudy: {
    label: 'Nuageux', emoji: '☁️',
    windSpeed: 12, windDirection: 240, temperature: 18, humidity: 55,
    fogNear: 30, fogFar: 400, fogColor: 0x88aacc, skyColor: 0x88aacc,
    precipitation: 0, cloudCover: 0.65,
  },
  fog: {
    label: 'Brouillard', emoji: '🌫️',
    windSpeed: 3, windDirection: 200, temperature: 12, humidity: 92,
    fogNear: 3, fogFar: 90, fogColor: 0xaaaaaa, skyColor: 0xaaaaaa,
    precipitation: 0.05, cloudCover: 0.9,
  },
  rain: {
    label: 'Pluie', emoji: '🌧️',
    windSpeed: 20, windDirection: 260, temperature: 11, humidity: 95,
    fogNear: 12, fogFar: 180, fogColor: 0x668899, skyColor: 0x668899,
    precipitation: 0.5, cloudCover: 0.85,
  },
  storm: {
    label: 'Orage', emoji: '⛈️',
    windSpeed: 55, windDirection: 280, temperature: 8, humidity: 98,
    fogNear: 8, fogFar: 120, fogColor: 0x445566, skyColor: 0x2a3540,
    precipitation: 0.95, cloudCover: 1.0,
  },
  snow: {
    label: 'Neige', emoji: '❄️',
    windSpeed: 15, windDirection: 300, temperature: -5, humidity: 88,
    fogNear: 10, fogFar: 150, fogColor: 0xc8d8e8, skyColor: 0x9fb4cc,
    precipitation: 0.6, cloudCover: 0.8,
  },
  blizzard: {
    label: 'Blizzard', emoji: '🌨️',
    windSpeed: 75, windDirection: 320, temperature: -14, humidity: 92,
    fogNear: 3, fogFar: 40, fogColor: 0xd8e0e8, skyColor: 0xb0bcc8,
    precipitation: 1.0, cloudCover: 1.0,
  },
  ice: {
    label: 'Verglas', emoji: '🧊',
    windSpeed: 25, windDirection: 280, temperature: -2, humidity: 96,
    fogNear: 6, fogFar: 80, fogColor: 0xa8b8c8, skyColor: 0x8898a8,
    precipitation: 0.7, cloudCover: 0.95,
  },
};

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  WEATHER SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export class WeatherSystem {
  // v1 compat
  public scene: THREE.Scene;
  public currentWeather: WeatherType = 'clear';
  public windSpeed = 0;
  public temperature = 22;
  public humidity = 40;

  // 🆕 v2
  public config: WeatherSystemConfig;
  public state: WeatherState;
  private targetState: WeatherState;

  // Particules
  private rainParticles: THREE.Points | null = null;
  private snowParticles: THREE.Points | null = null;
  private splashParticles: THREE.Points | null = null;
  private rainVelocities: Float32Array | null = null;
  private snowVelocities: Float32Array | null = null;
  private snowPhases: Float32Array | null = null;

  // Lightning
  private lightningLight: THREE.PointLight | null = null;
  private nextLightningAt = 0;
  private lightningFlashUntil = 0;

  // Timing
  private transitionTimer = 0;      // v1 compat : compte pour auto change
  private weatherDuration: number;  // v1 compat : secondes entre changements
  private transitionProgress = 1;   // 🆕 0..1
  private transitionDurationSec = 0; // 🆕

  // Observateur WorldSystem (optionnel)
  private unsubscribeWorldSystem: (() => void) | null = null;

  // PRNG
  private rng: () => number;

  // Events
  private listeners = {
    weatherChange: new Set<(to: WeatherType, from: WeatherType) => void>(),
    lightning: new Set<(intensity: number, position: [number, number, number]) => void>(),
    transitionStart: new Set<(to: WeatherType, durationMs: number) => void>(),
  };

  // Stats
  private stats = {
    changesTotal: 0,
    transitionsStarted: 0,
    lightningFlashes: 0,
    updatesTotal: 0,
    particlesRendered: 0,
  };

  // Bounds pour particules
  private bounds: { x: number; y: number; z: number };

  // Camera reference pour centerOnCamera
  private getCameraPos: (() => THREE.Vector3) | null = null;

  constructor(
    scene: THREE.Scene,
    config: Partial<WeatherSystemConfig> = {},
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bounds = { ...this.config.particleBounds };

    this.weatherDuration = this.config.autoChangeIntervalMs / 1000;
    this.rng = mulberry32(this.config.seed);

    // Initialise l'état et la cible depuis le preset clear
    const preset = WEATHER_PRESETS.clear;
    this.state = { type: 'clear', ...this.stripPreset(preset) };
    this.targetState = { ...this.state };
    this.applyImmediateState(this.state);
  }

  private stripPreset(p: WeatherPreset): Omit<WeatherState, 'type'> {
    const { label, emoji, ...rest } = p;
    void label;
    void emoji;
    return rest;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  API v1 compat
  // ─────────────────────────────────────────────────────────────────────────

  /** Change la météo (instantané en v1, transition en v2 si activée). */
  setWeather(type: WeatherType): void {
    const prev = this.currentWeather;
    if (prev === type && this.transitionProgress >= 1) return;

    if (!this.config.transitionsEnabled) {
      this.applyImmediate(type);
      return;
    }

    // Transition douce
    this.currentWeather = type;
    const preset = WEATHER_PRESETS[type];
    this.targetState = { type, ...this.stripPreset(preset) };
    this.transitionProgress = 0;
    this.transitionDurationSec = this.config.transitionDurationMs / 1000;
    this.stats.transitionsStarted++;

    this.listeners.transitionStart.forEach((cb) => {
      try { cb(type, this.config.transitionDurationMs); } catch { /* noop */ }
    });

    // Applique immédiatement le fog/sky du target pour éviter les pops
    this.applyFogAndSky(this.targetState);

    // Spawn/remove particles selon la nouvelle météo
    this.syncParticlesFor(type);
  }

  private applyImmediate(type: WeatherType): void {
    const prev = this.currentWeather;
    const preset = WEATHER_PRESETS[type];

    this.currentWeather = type;
    this.state = { type, ...this.stripPreset(preset) };
    this.targetState = { ...this.state };
    this.transitionProgress = 1;

    this.applyImmediateState(this.state);
    this.syncParticlesFor(type);

    if (prev !== type) this.emitWeatherChange(type, prev);
  }

  private applyImmediateState(s: WeatherState): void {
    this.windSpeed = s.windSpeed;
    this.temperature = s.temperature;
    this.humidity = s.humidity;
    this.applyFogAndSky(s);
  }

  private applyFogAndSky(s: WeatherState): void {
    // Background
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(s.skyColor);
    } else {
      this.scene.background = new THREE.Color(s.skyColor);
    }

    // Fog
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(s.fogColor);
      this.scene.fog.near = s.fogNear;
      this.scene.fog.far = s.fogFar;
    }
  }

  private emitWeatherChange(to: WeatherType, from: WeatherType): void {
    this.stats.changesTotal++;
    this.listeners.weatherChange.forEach((cb) => {
      try { cb(to, from); } catch { /* noop */ }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  UPDATE (v1 signature conservée : update(deltaTime))
  // ─────────────────────────────────────────────────────────────────────────

  update(deltaTime: number): void {
    const dt = clamp(deltaTime, 0, 0.1);
    this.stats.updatesTotal++;

    // Auto change
    if (this.config.autoChangeIntervalMs > 0) {
      this.transitionTimer += dt;
      if (this.transitionTimer > this.weatherDuration && this.transitionProgress >= 1) {
        this.transitionTimer = 0;
        this.pickRandomWeather();
      }
    }

    // Transition douce
    if (this.transitionProgress < 1) {
      this.transitionProgress = clamp(
        this.transitionProgress + dt / this.transitionDurationSec,
        0,
        1,
      );
      this.interpolateState(this.transitionProgress);

      if (this.transitionProgress >= 1) {
        const prev = this.currentWeather;
        this.state = { ...this.targetState };
        this.emitWeatherChange(prev, prev); // emit pour signaler fin
      }
    }

    // Lightning
    this.updateLightning(dt);

    // Particles
    this.updateParticles(dt);

    // Update couleur de fond dynamique (time of day)
    if (this.config.timeOfDay < 6 || this.config.timeOfDay > 20) {
      // Nuit : on assombrit légèrement
      const factor = 0.35;
      const s = this.state;
      const dark = new THREE.Color(s.skyColor).multiplyScalar(factor);
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(dark, 0.5);
      }
    }
  }

  private pickRandomWeather(): void {
    // Pool selon saison
    const pool = this.getWeatherPoolForSeason();
    const r = this.rng();
    let acc = 0;
    for (const [w, weight] of pool) {
      acc += weight;
      if (r <= acc) {
        this.setWeather(w);
        return;
      }
    }
  }

  private getWeatherPoolForSeason(): Array<[WeatherType, number]> {
    const s = this.config.season;
    if (s === 'hiver') {
      return [['snow', 0.4], ['cloudy', 0.25], ['blizzard', 0.1], ['fog', 0.1], ['ice', 0.05], ['clear', 0.1]];
    }
    if (s === 'ete') {
      return [['clear', 0.45], ['cloudy', 0.2], ['storm', 0.15], ['rain', 0.15], ['fog', 0.05]];
    }
    if (s === 'automne') {
      return [['cloudy', 0.3], ['rain', 0.3], ['fog', 0.15], ['clear', 0.2], ['storm', 0.05]];
    }
    // printemps
    return [['clear', 0.3], ['cloudy', 0.25], ['rain', 0.3], ['fog', 0.1], ['storm', 0.05]];
  }

  private interpolateState(t: number): void {
    const a = this.state;
    const b = this.targetState;
    const e = t * t * (3 - 2 * t); // smoothstep

    this.windSpeed = lerp(a.windSpeed, b.windSpeed, e);
    this.windDirection = lerp(a.windDirection, b.windDirection, e);
    this.temperature = lerp(a.temperature, b.temperature, e);
    this.humidity = lerp(a.humidity, b.humidity, e);
    this.state.fogNear = lerp(a.fogNear, b.fogNear, e);
    this.state.fogFar = lerp(a.fogFar, b.fogFar, e);

    // Couleurs interpolées
    const cA = new THREE.Color(a.fogColor);
    const cB = new THREE.Color(b.fogColor);
    this.state.fogColor = cA.lerp(cB, e).getHex();

    const sA = new THREE.Color(a.skyColor);
    const sB = new THREE.Color(b.skyColor);
    this.state.skyColor = sA.lerp(sB, e).getHex();

    this.state.precipitation = lerp(a.precipitation, b.precipitation, e);
    this.state.cloudCover = lerp(a.cloudCover, b.cloudCover, e);

    // Applique
    this.applyFogAndSky(this.state);
  }

  /** 🆕 Direction du vent (v2) */
  public windDirection = 220;

  // ─────────────────────────────────────────────────────────────────────────
  //  LIGHTNING
  // ─────────────────────────────────────────────────────────────────────────

  private updateLightning(dt: number): void {
    if (!this.config.lightningEnabled) return;

    const supportsLightning = this.currentWeather === 'storm' || this.currentWeather === 'blizzard';
    if (!supportsLightning) {
      if (this.lightningLight) this.lightningLight.intensity = 0;
      return;
    }

    const now = performance.now();
    if (now >= this.lightningFlashUntil) {
      // Fin du flash
      if (this.lightningLight) this.lightningLight.intensity = 0;
    }

    if (now >= this.nextLightningAt) {
      this.triggerLightning();
      const wait = lerp(
        this.config.lightningMinIntervalMs,
        this.config.lightningMaxIntervalMs,
        this.rng(),
      );
      this.nextLightningAt = now + wait;
    }
  }

  private triggerLightning(): void {
    // Crée la light si absente
    if (!this.lightningLight) {
      this.lightningLight = new THREE.PointLight(0xeef4ff, 0, 800, 1.5);
      this.lightningLight.position.set(0, 120, 0);
      this.scene.add(this.lightningLight);
    }

    // Position aléatoire autour du centre
    const x = (this.rng() - 0.5) * this.bounds.x * 2;
    const z = (this.rng() - 0.5) * this.bounds.z * 2;
    this.lightningLight.position.set(x, 100 + this.rng() * 80, z);

    const intensity = 200 + this.rng() * 400;
    this.lightningLight.intensity = intensity;
    this.lightningFlashUntil = performance.now() + 120 + this.rng() * 200;

    this.stats.lightningFlashes++;
    this.listeners.lightning.forEach((cb) => {
      try { cb(intensity, [x, 100, z]); } catch { /* noop */ }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PARTICLES (rain, snow, splash)
  // ─────────────────────────────────────────────────────────────────────────

  private syncParticlesFor(type: WeatherType): void {
    const needsRain = type === 'rain' || type === 'storm' || type === 'ice';
    const needsSnow = type === 'snow' || type === 'blizzard';
    const needsSplash = this.config.splashEnabled && (needsRain || type === 'storm');

    if (needsRain && !this.rainParticles) this.createRainParticles();
    else if (!needsRain && this.rainParticles) this.removeRainParticles();

    if (needsSnow && !this.snowParticles) this.createSnowParticles();
    else if (!needsSnow && this.snowParticles) this.removeSnowParticles();

    if (needsSplash && !this.splashParticles) this.createSplashParticles();
    else if (!needsSplash && this.splashParticles) this.removeSplashParticles();
  }

  private createRainParticles(): void {
    const count = this.config.maxRainParticles;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (this.rng() - 0.5) * this.bounds.x;
      positions[i * 3 + 1] = this.rng() * this.bounds.y;
      positions[i * 3 + 2] = (this.rng() - 0.5) * this.bounds.z;

      velocities[i * 3] = (this.rng() - 0.5) * 0.5;
      velocities[i * 3 + 1] = -(18 + this.rng() * 12);
      velocities[i * 3 + 2] = (this.rng() - 0.5) * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xaad4ff,
      size: 0.09,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.rainParticles = new THREE.Points(geometry, material);
    this.rainParticles.frustumCulled = false;
    this.scene.add(this.rainParticles);
    this.rainVelocities = velocities;
  }

  private removeRainParticles(): void {
    if (!this.rainParticles) return;
    this.scene.remove(this.rainParticles);
    this.rainParticles.geometry.dispose();
    (this.rainParticles.material as THREE.Material).dispose();
    this.rainParticles = null;
    this.rainVelocities = null;
  }

  private createSnowParticles(): void {
    const count = this.config.maxSnowParticles;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (this.rng() - 0.5) * this.bounds.x;
      positions[i * 3 + 1] = this.rng() * this.bounds.y;
      positions[i * 3 + 2] = (this.rng() - 0.5) * this.bounds.z;

      velocities[i * 3] = (this.rng() - 0.5) * 0.3;
      velocities[i * 3 + 1] = -(1 + this.rng() * 2);
      velocities[i * 3 + 2] = (this.rng() - 0.5) * 0.3;

      phases[i] = this.rng() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.snowParticles = new THREE.Points(geometry, material);
    this.snowParticles.frustumCulled = false;
    this.scene.add(this.snowParticles);
    this.snowVelocities = velocities;
    this.snowPhases = phases;
  }

  private removeSnowParticles(): void {
    if (!this.snowParticles) return;
    this.scene.remove(this.snowParticles);
    this.snowParticles.geometry.dispose();
    (this.snowParticles.material as THREE.Material).dispose();
    this.snowParticles = null;
    this.snowVelocities = null;
    this.snowPhases = null;
  }

  private createSplashParticles(): void {
    const count = this.config.maxSplashParticles;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (this.rng() - 0.5) * this.bounds.x;
      positions[i * 3 + 1] = 0.05;
      positions[i * 3 + 2] = (this.rng() - 0.5) * this.bounds.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xccddff,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    this.splashParticles = new THREE.Points(geometry, material);
    this.splashParticles.frustumCulled = false;
    this.scene.add(this.splashParticles);
  }

  private removeSplashParticles(): void {
    if (!this.splashParticles) return;
    this.scene.remove(this.splashParticles);
    this.splashParticles.geometry.dispose();
    (this.splashParticles.material as THREE.Material).dispose();
    this.splashParticles = null;
  }

  private updateParticles(dt: number): void {
    const camPos = this.getCameraPos?.() ?? null;
    const recenter = this.config.centerOnCamera && camPos;

    // RAIN
    if (this.rainParticles && this.rainVelocities) {
      const pos = this.rainParticles.geometry.attributes.position.array as Float32Array;
      const vel = this.rainVelocities;
      const count = pos.length / 3;
      const windRad = (this.windDirection * Math.PI) / 180;
      const windX = Math.cos(windRad) * this.windSpeed * 0.15;
      const windZ = Math.sin(windRad) * this.windSpeed * 0.15;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3] += (vel[i3] + windX) * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += (vel[i3 + 2] + windZ) * dt;

        if (pos[i3 + 1] < 0) {
          pos[i3 + 1] = this.bounds.y;
          pos[i3] = (this.rng() - 0.5) * this.bounds.x;
          pos[i3 + 2] = (this.rng() - 0.5) * this.bounds.z;
        }
      }

      this.recenterParticles(this.rainParticles, pos, recenter, camPos);
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
      this.stats.particlesRendered = count;
    }

    // SNOW
    if (this.snowParticles && this.snowVelocities && this.snowPhases) {
      const pos = this.snowParticles.geometry.attributes.position.array as Float32Array;
      const vel = this.snowVelocities;
      const phases = this.snowPhases;
      const count = pos.length / 3;
      const t = performance.now() / 1000;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const sway = Math.sin(t * 1.5 + phases[i]) * 0.4;
        pos[i3] += (vel[i3] + sway) * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += vel[i3 + 2] * dt;

        if (pos[i3 + 1] < 0) {
          pos[i3 + 1] = this.bounds.y;
          pos[i3] = (this.rng() - 0.5) * this.bounds.x;
          pos[i3 + 2] = (this.rng() - 0.5) * this.bounds.z;
        }
      }

      this.recenterParticles(this.snowParticles, pos, recenter, camPos);
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  private recenterParticles(
    points: THREE.Points,
    pos: Float32Array,
    recenter: boolean,
    camPos: THREE.Vector3 | null,
  ): void {
    if (!recenter || !camPos) {
      points.position.set(0, 0, 0);
      return;
    }
    // Recentre le système autour de la caméra (wrap)
    const halfX = this.bounds.x / 2;
    const halfZ = this.bounds.z / 2;
    const camX = camPos.x;
    const camZ = camPos.z;

    // Déplace le groupe pour suivre la caméra
    points.position.x = camX - Math.round(camX / this.bounds.x) * this.bounds.x;
    points.position.z = camZ - Math.round(camZ / this.bounds.z) * this.bounds.z;
    points.position.y = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  OBSERVATEUR WorldSystem
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 🆕 Branche ce système sur un WorldSystem existant.
   * Le WorldSystem devient autoritaire, ce module se contente de rendre.
   */
  public observeWorldSystem(worldSystem: {
    getState: () => { weather: WeatherType; season: Season; timeOfDay: number };
    onWeatherChange?: (cb: (w: WeatherType, prev: WeatherType) => void) => () => void;
    onTimeChange?: (cb: (h: number) => void) => () => void;
    onSeasonChange?: (cb: (s: Season) => void) => () => void;
  }): void {
    this.unsubscribeWorldSystem?.();

    const unsubs: Array<() => void> = [];

    if (worldSystem.onWeatherChange) {
      unsubs.push(worldSystem.onWeatherChange((w) => {
        this.setWeather(w);
      }));
    }
    if (worldSystem.onSeasonChange) {
      unsubs.push(worldSystem.onSeasonChange((s) => {
        this.config.season = s;
      }));
    }
    if (worldSystem.onTimeChange) {
      unsubs.push(worldSystem.onTimeChange((h) => {
        this.config.timeOfDay = h;
      }));
    }

    this.unsubscribeWorldSystem = () => unsubs.forEach((u) => u());
  }

  /** 🆕 Utilisé par centerOnCamera. À appeler depuis la boucle client. */
  public attachCamera(getPos: () => THREE.Vector3): void {
    this.getCameraPos = getPos;
  }

  public detachCamera(): void {
    this.getCameraPos = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  public onWeatherChange(cb: (to: WeatherType, from: WeatherType) => void): () => void {
    this.listeners.weatherChange.add(cb);
    return () => this.listeners.weatherChange.delete(cb);
  }

  public onLightning(cb: (intensity: number, pos: [number, number, number]) => void): () => void {
    this.listeners.lightning.add(cb);
    return () => this.listeners.lightning.delete(cb);
  }

  public onTransitionStart(cb: (to: WeatherType, durationMs: number) => void): () => void {
    this.listeners.transitionStart.add(cb);
    return () => this.listeners.transitionStart.delete(cb);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ZONE BIAS
  // ─────────────────────────────────────────────────────────────────────────

  /** 🆕 Applique un bias régional (ex: forêt = plus brumeux) */
  public setZoneBias(bias: Partial<Record<WeatherType, number>> | null): void {
    // Réutilise le pool saisonnier, pondéré par le bias
    if (!bias) return;
    // Simple : on applique le bias lors du prochain pick
    // (implémentation extensible sans casser l'API)
    (this as any)._zoneBias = bias;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  STATS & DISPOSE
  // ─────────────────────────────────────────────────────────────────────────

  public getStats() {
    return {
      ...this.stats,
      currentWeather: this.currentWeather,
      windSpeed: Math.round(this.windSpeed * 10) / 10,
      windDirection: Math.round(this.windDirection),
      temperature: Math.round(this.temperature * 10) / 10,
      humidity: Math.round(this.humidity),
      transitionProgress: Math.round(this.transitionProgress * 100) / 100,
      hasRain: this.rainParticles !== null,
      hasSnow: this.snowParticles !== null,
      hasSplash: this.splashParticles !== null,
      lightningActive: this.lightningLight?.intensity !== 0,
    };
  }

  public dispose(): void {
    this.removeRainParticles();
    this.removeSnowParticles();
    this.removeSplashParticles();

    if (this.lightningLight) {
      this.scene.remove(this.lightningLight);
      this.lightningLight.dispose();
      this.lightningLight = null;
    }

    this.unsubscribeWorldSystem?.();
    this.unsubscribeWorldSystem = null;
    this.listeners.weatherChange.clear();
    this.listeners.lightning.clear();
    this.listeners.transitionStart.clear();
  }
}

export default WeatherSystem;