/**
 * ═══════════════════════════════════════════════════════════════════
 * 🌲 WORLD ENVIRONMENT ROOM — MÉTÉO, SAISONS & HYDRO-QUÉBEC
 * ═══════════════════════════════════════════════════════════════════
 * Simulation dynamique du climat de la MRC de Portneuf :
 *  - 4 saisons avec variations thermiques et accumulation de neige.
 *  - Précipitations : Pluie, Neige, Blizzard, Verglas et Brume fluviale.
 *  - État du réseau électrique d'Hydro-Québec (pannes, réparations).
 *  - État de la glace sur le fleuve Saint-Laurent.
 */

import { Room, Client } from "colyseus";
import { Schema, type } from "@colyseus/schema";

export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "overcast"
  | "rain"
  | "thunderstorm"
  | "snow"
  | "blizzard"
  | "freezing_rain"
  | "fog";

export type SeasonName = "Printemps" | "Été" | "Automne" | "Hiver";

export class WeatherState extends Schema {
  @type("string") condition: string = "clear";
  @type("number") temperature: number = 8.5; // en °C
  @type("number") windSpeed: number = 15; // en km/h
  @type("number") windDirection: number = 240; // cap en degrés
  @type("number") snowAccumulation: number = 0; // en cm
  @type("number") rainAccumulation: number = 0; // en mm
  @type("boolean") hydroLive: boolean = true; // État réseau Hydro-Québec
  @type("string") season: SeasonName = "Automne";
  @type("number") seasonDay: number = 15; // Jour dans la saison (1-30)
  @type("number") visibility: number = 100; // Pourcentage de visibilité (0-100)
  @type("boolean") blizzardActive: boolean = false;
  @type("boolean") verglasActive: boolean = false;
  @type("boolean") riverFrozen: boolean = false; // Fleuve gelé
}

export class WorldEnvironmentRoom extends Room {
  state!: WeatherState;
  maxClients = 64;

  private activeTimers: Set<NodeJS.Timeout> = new Set();
  private weatherTickCounter = 0;

  onCreate(_options: any) {
    this.setState(new WeatherState());

    // ─── HANDLERS DE MESSAGES CLIENTS / ADMIN ─────────────────────
    this.onMessage("get_forecast", (client: Client) => {
      client.send("weather_forecast", {
        season: this.state.season,
        currentCondition: this.state.condition,
        temperature: this.state.temperature,
        snowAccumulation: this.state.snowAccumulation,
        hydroStatus: this.state.hydroLive ? "Optimal" : "Panne en cours",
      });
    });

    this.onMessage("admin:set_weather", (_client: Client, message: { condition: WeatherCondition; temp?: number }) => {
      if (message.condition) {
        this.applyWeatherCondition(message.condition);
        if (typeof message.temp === "number") {
          this.state.temperature = message.temp;
        }
        this.broadcast("weather_alert", {
          type: "admin_override",
          message: `Météo forcée : ${this.state.condition} (${this.state.temperature}°C)`,
        });
      }
    });

    this.onMessage("admin:set_season", (_client: Client, message: { season: SeasonName }) => {
      if (["Printemps", "Été", "Automne", "Hiver"].includes(message.season)) {
        this.state.season = message.season;
        this.state.seasonDay = 1;
        this.adjustSeasonBasics();
        this.broadcast("weather_alert", {
          type: "season_change",
          message: `Changement de saison : Bienvenue en ${this.state.season} !`,
        });
      }
    });

    this.onMessage("admin:toggle_hydro", (_client: Client) => {
      this.state.hydroLive = !this.state.hydroLive;
      this.broadcast("weather_alert", {
        type: "hydro_manual",
        message: this.state.hydroLive
          ? "⚡ Hydro-Québec : Rétablissement manuel du courant."
          : "⚠️ Hydro-Québec : Déconnexion manuelle du réseau.",
      });
    });

    // Tick de simulation météo toutes les 3 secondes
    this.setSimulationInterval((dt) => this.simulateEnvironment(dt), 3000);
    console.log("✅ WorldEnvironmentRoom initialisée (Climat de Portneuf & Réseau Hydro-Québec).");
  }

  onJoin(client: Client) {
    client.send("weather_sync", {
      condition: this.state.condition,
      temperature: this.state.temperature,
      season: this.state.season,
      snowAccumulation: this.state.snowAccumulation,
      hydroLive: this.state.hydroLive,
      riverFrozen: this.state.riverFrozen,
      visibility: this.state.visibility,
    });
  }

  private simulateEnvironment(_dt: number) {
    this.weatherTickCounter++;

    // 1. Progression du cycle saisonnier (toutes les 100 ticks ~ 5 min)
    if (this.weatherTickCounter % 100 === 0) {
      this.advanceSeasonDay();
    }

    // 2. Fluctuations des températures de base selon la saison
    this.updateTemperatures();

    // 3. Événements météo périodiques (Blizzards, Verglas, Pannes Hydro)
    if (this.weatherTickCounter % 20 === 0) {
      this.evaluateWeatherEvents();
    }
  }

  private advanceSeasonDay() {
    this.state.seasonDay++;
    if (this.state.seasonDay > 30) {
      this.state.seasonDay = 1;
      const seasons: SeasonName[] = ["Printemps", "Été", "Automne", "Hiver"];
      const nextIdx = (seasons.indexOf(this.state.season) + 1) % seasons.length;
      this.state.season = seasons[nextIdx]!;
      this.adjustSeasonBasics();

      this.broadcast("weather_alert", {
        type: "season_change",
        message: `La saison change : C'est maintenant l'${this.state.season} !`,
      });
    }
  }

  private adjustSeasonBasics() {
    switch (this.state.season) {
      case "Hiver":
        this.state.temperature = -12.0;
        this.state.snowAccumulation = Math.max(this.state.snowAccumulation, 25);
        this.state.riverFrozen = true;
        this.applyWeatherCondition("snow");
        break;
      case "Printemps":
        this.state.temperature = 9.0;
        this.state.riverFrozen = false;
        this.applyWeatherCondition("rain");
        break;
      case "Été":
        this.state.temperature = 24.5;
        this.state.snowAccumulation = 0;
        this.state.riverFrozen = false;
        this.applyWeatherCondition("clear");
        break;
      case "Automne":
        this.state.temperature = 7.0;
        this.state.riverFrozen = false;
        this.applyWeatherCondition("partly_cloudy");
        break;
    }
  }

  private updateTemperatures() {
    // Variations douces de la température (-0.2°C à +0.2°C)
    const drift = (Math.random() - 0.5) * 0.4;
    this.state.temperature = Math.round((this.state.temperature + drift) * 10) / 10;

    // Vitesse du vent
    this.state.windSpeed = Math.max(5, Math.min(110, this.state.windSpeed + (Math.random() - 0.5) * 3));

    // Fonte ou accumulation naturelle de la neige
    if (this.state.temperature > 3 && this.state.snowAccumulation > 0) {
      this.state.snowAccumulation = Math.max(0, this.state.snowAccumulation - 0.1);
    }
  }

  private evaluateWeatherEvents() {
    const isWinter = this.state.season === "Hiver";
    const isSummer = this.state.season === "Été";

    // ── Déclenchement d'un blizzard en hiver
    if (isWinter && !this.state.blizzardActive && Math.random() < 0.08) {
      this.triggerBlizzard();
    }

    // ── Déclenchement d'un épisode de verglas
    if (isWinter && this.state.temperature >= -4 && this.state.temperature <= 0 && !this.state.verglasActive && Math.random() < 0.06) {
      this.triggerVerglas();
    }

    // ── Orages estivaux violents
    if (isSummer && this.state.temperature > 26 && Math.random() < 0.07) {
      this.applyWeatherCondition("thunderstorm");
    }
  }

  private triggerBlizzard() {
    this.state.blizzardActive = true;
    this.applyWeatherCondition("blizzard");
    this.state.visibility = 15;
    this.state.windSpeed = 85;

    this.broadcast("weather_alert", {
      type: "blizzard",
      title: "Alerte Météo Environnement Canada",
      message: "Tempête majeure et blizzard en cours sur la MRC de Portneuf. Visibilité nulle.",
    });

    const timer = setTimeout(() => {
      this.state.blizzardActive = false;
      this.state.visibility = 90;
      this.state.snowAccumulation += 12;
      this.applyWeatherCondition("snow");
      this.activeTimers.delete(timer);
    }, 90000);

    this.activeTimers.add(timer);
  }

  private triggerVerglas() {
    this.state.verglasActive = true;
    this.applyWeatherCondition("freezing_rain");
    this.state.hydroLive = false; // Rupture du réseau électrique

    this.broadcast("weather_alert", {
      type: "verglas",
      title: "Panne Majeure Hydro-Québec",
      message: "Verglas sévère ! Lignes sous tension brisées. Réseau électrique coupé.",
    });

    const timer = setTimeout(() => {
      this.state.verglasActive = false;
      this.state.hydroLive = true;
      this.applyWeatherCondition("overcast");

      this.broadcast("weather_alert", {
        type: "hydro_restored",
        message: "⚡ Équipes Hydro-Québec sur le terrain : Courant rétabli.",
      });
      this.activeTimers.delete(timer);
    }, 120000);

    this.activeTimers.add(timer);
  }

  private applyWeatherCondition(cond: WeatherCondition) {
    this.state.condition = cond;
    switch (cond) {
      case "clear":
        this.state.visibility = 100;
        break;
      case "fog":
        this.state.visibility = 30;
        break;
      case "heavy_rain" as any:
      case "thunderstorm":
        this.state.visibility = 50;
        break;
      case "blizzard":
        this.state.visibility = 15;
        break;
      default:
        this.state.visibility = 85;
        break;
    }
  }

  onLeave(_client: Client) {}

  onDispose() {
    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
    console.log("🛑 [WorldEnvironmentRoom] Salle météo libérée proprement.");
  }
}
