// ═══════════════════════════════════════════════════════════════════════════
//  WORLD ENVIRONMENT ROOM — MÉTÉO QUÉBEC, SAISONS & PHYSIQUE DES SURFACES
//  server/rooms/WorldEnvironmentRoom.ts
//  Synchronisation MTQ · Friction dynamique des routes · Hydro-Québec
// ═══════════════════════════════════════════════════════════════════════════

import { Room, Client } from '@colyseus/core';
import { Schema, type } from '@colyseus/schema';
import { intellectus } from '../intellectus';
import type { SurfaceKind } from '../lib/db/schema/world';

// ─── 1. SCHÉMA COLYSEUS SYNCHRONISÉ (ÉTAT RÉSEAU BINAIRE ULTRA-LÉGER) ──────

export class EnvironmentState extends Schema {
  @type('string') weather: string = 'ensoleille';          // ensoleille, pluie_fine, orage_ete, poudrerie, tempete_neige, verglas
  @type('number') timeOfDay: number = 12.0;               // 0.00 à 24.00 (Temps universel synchronisé)
  @type('string') season: string = 'ete';                 // printemps, ete, automne, hiver
  @type('boolean') powerOutage: boolean = false;          // Panne de courant Hydro-Québec
  @type('number') temperatureCelsius: number = 22.0;      // Température réelle de l'air
  @type('number') windChillCelsius: number = 22.0;        // Facteur de refroidissement éolien (Survie/Santé)
  @type('number') windSpeedKmH: number = 15.0;            // Vitesse du vent
  @type('number') snowAccumulationCm: number = 0.0;       // Hauteur de neige au sol (MTQ)
  @type('number') baseRoadFriction: number = 1.0;         // Coefficient de friction de l'asphalte (1.0 = sec, 0.15 = verglas)
  @type('boolean') snowPlowActive: boolean = false;       // Déneigeuses du MTQ en patrouille
}

// ─── 2. MATRICE PHYSIQUE STATIQUE (ZÉRO ALLOCATION MÉMOIRE) ───────────────

export interface SurfaceProperties {
  traction: number;
  lateralGrip: number;
  rollingResistance: number;
  slipThreshold: number;
  particles: string;
  sound: string;
}

const SURFACE_DATABASE: Readonly<Record<SurfaceKind, SurfaceProperties>> = {
  asphalt: { traction: 1.00, lateralGrip: 1.00, rollingResistance: 0.015, slipThreshold: 65, particles: 'none', sound: 'tire_asphalt' },
  gravel:  { traction: 0.75, lateralGrip: 0.65, rollingResistance: 0.035, slipThreshold: 45, particles: 'gravel_dust', sound: 'tire_gravel' },
  dirt:    { traction: 0.70, lateralGrip: 0.60, rollingResistance: 0.040, slipThreshold: 40, particles: 'dirt_dust', sound: 'tire_gravel' },
  sand:    { traction: 0.45, lateralGrip: 0.40, rollingResistance: 0.080, slipThreshold: 30, particles: 'sand_cloud', sound: 'tire_gravel' },
  grass:   { traction: 0.65, lateralGrip: 0.55, rollingResistance: 0.030, slipThreshold: 38, particles: 'grass_leaves', sound: 'tire_grass' },
  snow:    { traction: 0.38, lateralGrip: 0.32, rollingResistance: 0.055, slipThreshold: 22, particles: 'snow_powder', sound: 'tire_snow' },
  ice:     { traction: 0.12, lateralGrip: 0.08, rollingResistance: 0.010, slipThreshold: 12, particles: 'ice_shards', sound: 'tire_ice' },
  mud:     { traction: 0.35, lateralGrip: 0.30, rollingResistance: 0.090, slipThreshold: 20, particles: 'mud_splash', sound: 'tire_mud' },
};

// ─── 3. SALLE COLYSEUS GESTIONNAIRE DE L'ENVIRONNEMENT ─────────────────────

export class WorldEnvironmentRoom extends Room<EnvironmentState> {
  maxClients = 128;
  private core = intellectus;
  private cleanupHooks: Array<() => void> = [];

  onCreate(_options: any) {
    this.setState(new EnvironmentState());

    // 1. Chargement de l'état persistant depuis le LotusStore
    const envMemory = this.core.memory.get('world', 'environment') || {
      weather: 'ensoleille',
      timeOfDay: 12.0,
      season: 'ete',
      powerOutage: false,
      snowAccumulationCm: 0,
    };

    this.state.weather = envMemory.weather ?? 'ensoleille';
    this.state.timeOfDay = envMemory.timeOfDay ?? 12.0;
    this.state.season = envMemory.season ?? 'ete';
    this.state.powerOutage = Boolean(envMemory.powerOutage);
    this.state.snowAccumulationCm = envMemory.snowAccumulationCm ?? 0;

    // Mise à jour immédiate des variables thermodynamiques
    this.updateAtmosphericConditions();

    // 2. Écouteurs d'événements du Bus Arcadius (Météo, pannes, saisons)
    this.wireBusEvents();

    // 3. Boucle périodique d'environnement (Tick 10s) : Accumulation neige & Soleil
    this.clock.setInterval(() => {
      this.tickEnvironmentalSimulation();
    }, 10_000);

    // 4. Message d'interrogation physique ponctuel (optimisé)
    this.onMessage('query_driving_physics', (client: Client, data: { surfaceKey?: SurfaceKind }) => {
      const surfaceKey = data?.surfaceKey || 'asphalt';
      const physics = this.computeDrivingPhysics(surfaceKey);
      client.send('update_driving_physics', physics);
    });

    console.log('🌲 [WorldEnvironmentRoom] Météo Portneuf & Friction MTQ synchronisées.');
  }

  // ─── SIMULATION PHYSIQUE ATMOSPHÉRIQUE & THERMODYNAMIQUE ───────────────────

  private updateAtmosphericConditions(): void {
    // 1. Calcul température de base selon la saison québécoise
    const baseTemps: Record<string, number> = {
      ete: 24,
      printemps: 12,
      automne: 6,
      hiver: -14,
    };
    const base = baseTemps[this.state.season] ?? 20;

    // Oscillation sinusoïdale jour/nuit (Point froid à 05h00, point chaud à 15h00)
    const hourRad = ((this.state.timeOfDay - 5) / 24) * Math.PI * 2;
    const tempCurve = Math.sin(hourRad) * 5.5;

    let currentTemp = Math.round(base + tempCurve);

    // Modificateurs météo
    if (this.state.weather === 'tempete_neige' || this.state.weather === 'poudrerie') {
      currentTemp -= 6;
      this.state.windSpeedKmH = 45 + Math.random() * 25;
    } else if (this.state.weather === 'pluie_fine' || this.state.weather === 'orage_ete') {
      currentTemp -= 3;
      this.state.windSpeedKmH = 20 + Math.random() * 15;
    } else {
      this.state.windSpeedKmH = 10 + Math.random() * 10;
    }

    this.state.temperatureCelsius = currentTemp;

    // 2. Calcul du Refroidissement Éolien (Formule officielle Environnement Canada)
    if (currentTemp <= 10 && this.state.windSpeedKmH > 4.8) {
      const v016 = Math.pow(this.state.windSpeedKmH, 0.16);
      this.state.windChillCelsius = Math.round(
        13.12 + 0.6215 * currentTemp - 11.37 * v016 + 0.3965 * currentTemp * v016
      );
    } else {
      this.state.windChillCelsius = currentTemp;
    }

    // 3. Calcul de la friction de base sur asphalte
    this.state.baseRoadFriction = this.calculateAsphaltFriction();
  }

  private calculateAsphaltFriction(): number {
    const isFreezing = this.state.temperatureCelsius <= 0;

    if (this.state.weather === 'verglas' || (isFreezing && (this.state.weather === 'pluie_fine' || this.state.weather === 'orage_ete'))) {
      return 0.12; // Verglas noir critique
    }
    if (this.state.weather === 'tempete_neige' || this.state.weather === 'poudrerie' || this.state.snowAccumulationCm > 5) {
      return 0.35; // Neige compactée sur route
    }
    if (this.state.weather === 'pluie_fine' || this.state.weather === 'orage_ete') {
      return 0.78; // Asphalte mouillé (risque aquaplanage)
    }
    return 1.0; // Asphalte sec nominal
  }

  // ─── CALCUL DE L'ADHÉRENCE DU VÉHICULE EN CONDUITE ─────────────────────────

  public computeDrivingPhysics(baseSurface: SurfaceKind) {
    let effectiveSurface = baseSurface;
    const isFreezing = this.state.temperatureCelsius <= 0;

    // Transformation dynamique du type de sol selon la météo
    if (this.state.snowAccumulationCm > 2 || this.state.weather === 'tempete_neige' || this.state.weather === 'poudrerie') {
      if (baseSurface === 'asphalt' || baseSurface === 'grass' || baseSurface === 'dirt') {
        effectiveSurface = 'snow';
      }
    } else if (isFreezing && this.state.weather === 'verglas' && baseSurface === 'asphalt') {
      effectiveSurface = 'ice';
    } else if ((this.state.weather === 'pluie_fine' || this.state.weather === 'orage_ete') && (baseSurface === 'dirt' || baseSurface === 'grass')) {
      effectiveSurface = 'mud';
    }

    const baseProps = SURFACE_DATABASE[effectiveSurface] || SURFACE_DATABASE.asphalt;
    let traction = baseProps.traction;
    let lateralGrip = baseProps.lateralGrip;

    // Facteur d'aquaplanage si pluie battante sur route asphaltée
    if (effectiveSurface === 'asphalt' && this.state.weather === 'orage_ete') {
      traction *= 0.75;
      lateralGrip *= 0.70;
    }

    return {
      surfaceKey: effectiveSurface,
      tractionMultiplier: Number(traction.toFixed(2)),
      lateralGrip: Number(lateralGrip.toFixed(2)),
      rollingResistance: baseProps.rollingResistance,
      slipThreshold: baseProps.slipThreshold,
      particleType: (effectiveSurface === 'snow' || this.state.weather === 'poudrerie') ? 'snow_powder' : baseProps.particles,
      tireSound: baseProps.sound,
      isWet: this.state.weather === 'pluie_fine' || this.state.weather === 'orage_ete',
      isIcy: effectiveSurface === 'ice' || effectiveSurface === 'snow',
      snowDepthCm: this.state.snowAccumulationCm,
    };
  }

  // ─── TICK DE SIMULATION ENVIRONNEMENTALE (TOUTES LES 10 SECONDES) ───────────

  private tickEnvironmentalSimulation(): void {
    // Accumulation graduelle de neige lors des tempêtes
    if (this.state.weather === 'tempete_neige' || this.state.weather === 'poudrerie') {
      this.state.snowAccumulationCm = Math.min(60, Number((this.state.snowAccumulationCm + 0.2).toFixed(1)));
    } else if (this.state.temperatureCelsius > 3 && this.state.snowAccumulationCm > 0) {
      // Fonte progressive
      this.state.snowAccumulationCm = Math.max(0, Number((this.state.snowAccumulationCm - 0.4).toFixed(1)));
    }

    // Sauvegarde en cache mémoire Lotus
    this.core.memory.set('world', 'environment', {
      weather: this.state.weather,
      timeOfDay: this.state.timeOfDay,
      season: this.state.season,
      powerOutage: this.state.powerOutage,
      snowAccumulationCm: this.state.snowAccumulationCm,
    }, false);
  }

  // ─── ÉCOUTEURS DU BUS D'ÉVÉNEMENTS ARCADIUS ───────────────────────────────

  private wireBusEvents(): void {
    // Changement de météo
    this.cleanupHooks.push(
      this.core.bus.on('world:weather_changed', async (event: any) => {
        this.state.weather = event.payload.weather;
        this.updateAtmosphericConditions();

        this.broadcast('weather_updated', {
          weather: this.state.weather,
          temperature: this.state.temperatureCelsius,
          windChill: this.state.windChillCelsius,
          friction: this.state.baseRoadFriction,
        });
      })
    );

    // Changement de saison
    this.cleanupHooks.push(
      this.core.bus.on('world:season_changed', async (event: any) => {
        this.state.season = event.payload.season;
        this.updateAtmosphericConditions();
      })
    );

    // Changement d'heure
    this.cleanupHooks.push(
      this.core.bus.on('world:time_changed', async (event: any) => {
        this.state.timeOfDay = event.payload.timeOfDay;
        this.updateAtmosphericConditions();
      })
    );

    // Panne Hydro-Québec
    this.cleanupHooks.push(
      this.core.bus.on('world:power_outage', async (event: any) => {
        this.state.powerOutage = Boolean(event.payload.active);
        this.broadcast('power_outage_updated', { active: this.state.powerOutage });
      })
    );

    // Déploiement des déneigeuses du MTQ
    this.cleanupHooks.push(
      this.core.bus.on('world:snowplow', async (event: any) => {
        this.state.snowPlowActive = Boolean(event.payload.active);
        if (this.state.snowPlowActive) {
          this.state.snowAccumulationCm = Math.max(0, this.state.snowAccumulationCm - 15);
          this.state.baseRoadFriction = this.calculateAsphaltFriction();
        }
      })
    );
  }

  // ─── CYCLE DE VIE CLIENT COLYSEUS ────────────────────────────────────────

  onJoin(client: Client) {
    client.send('environment_init', {
      weather: this.state.weather,
      timeOfDay: this.state.timeOfDay,
      season: this.state.season,
      powerOutage: this.state.powerOutage,
      temperatureCelsius: this.state.temperatureCelsius,
      windChillCelsius: this.state.windChillCelsius,
      snowAccumulationCm: this.state.snowAccumulationCm,
      baseRoadFriction: this.state.baseRoadFriction,
    });
  }

  onDispose() {
    this.cleanupHooks.forEach((unsub) => unsub());
    console.log('🛑 [WorldEnvironmentRoom] Salle météo déchargée.');
  }
}

export default WorldEnvironmentRoom;