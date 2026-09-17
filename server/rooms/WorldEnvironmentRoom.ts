/**
 * ═══════════════════════════════════════════════════════════
 * WORLD ENVIRONMENT ROOM — Météo, Saisons & Hydro-Québec
 * ═══════════════════════════════════════════════════════════
 */

import { Room, Client } from "colyseus";
import { Schema, type } from "@colyseus/schema";

export class WeatherState extends Schema {
  @type("string") condition = "clear";
  @type("number") temperature = 8.5;
  @type("number") windSpeed = 12;
  @type("number") snowAccumulation = 0;
  @type("boolean") hydroLive = true;
  @type("string") season = "Automne";
  @type("number") visibility = 100;
  @type("boolean") blizzardActive = false;
  @type("boolean") verglasActive = false;
}

export class WorldEnvironmentRoom extends Room {
  state!: WeatherState; // Typage explicite et compatible
  maxClients = 64;

  onCreate(_options: any) {
    this.setState(new WeatherState());
    this.setSimulationInterval((dt) => this.simulateWeather(dt), 1000);
    console.log("✅ WorldEnvironmentRoom créée (Météo & Hydro)");
  }

  onJoin(client: Client) {
    client.send("weather_sync", {
      condition: this.state.condition,
      temperature: this.state.temperature,
      season: this.state.season,
    });
  }

  private simulateWeather(_dt: number) {
    this.state.temperature += (Math.random() - 0.5) * 0.1;
    this.state.temperature = Math.round(this.state.temperature * 10) / 10;
    this.state.windSpeed = Math.max(0, this.state.windSpeed + (Math.random() - 0.5) * 2);

    if (this.state.season === "Hiver" && !this.state.blizzardActive && Math.random() < 0.001) {
      this.state.blizzardActive = true;
      this.state.snowAccumulation += 5;
      this.state.visibility = 20;
      this.broadcast("weather_alert", { type: "blizzard", message: "Blizzard en cours !" });

      setTimeout(() => {
        this.state.blizzardActive = false;
        this.state.visibility = 100;
      }, 60000);
    }

    if (this.state.temperature < -5 && !this.state.verglasActive && Math.random() < 0.002) {
      this.state.verglasActive = true;
      this.state.hydroLive = false;
      this.broadcast("weather_alert", { type: "verglas", message: "Verglas ! Réseau Hydro-Québec coupé." });

      setTimeout(() => {
        this.state.verglasActive = false;
        this.state.hydroLive = true;
      }, 120000);
    }
  }

  onLeave(_client: Client) {}
  onDispose() {}
}
