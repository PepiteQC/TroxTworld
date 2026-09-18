import { Intellectus } from '../core/Intellectus';

export type Weather = 'clear' | 'rain' | 'snow' | 'fog';
export type TimeOfDay = number; // 0-23

export interface WorldState {
  weather: Weather;
  timeOfDay: TimeOfDay;
  temperature: number;
  windSpeed: number;
  season: string;
  worldName: string;
  fogDensity: number;
}

export class WorldSystem {
  intellectus: Intellectus;
  state: WorldState = {
    weather: 'clear', timeOfDay: 12, temperature: 18, windSpeed: 5,
    season: 'Été', worldName: 'Québec Road 01', fogDensity: 120,
  };

  constructor(intellectus: Intellectus) {
    this.intellectus = intellectus;
  }

  async initialize() {
    this.intellectus.arcadius.emit('system:world:ready', { worldName: this.state.worldName }, 'WorldSystem');
  }

  getState(): WorldState { return { ...this.state }; }

  setWeather(w: Weather) {
    this.state.weather = w;
    this.state.temperature = w === 'snow' ? -5 : w === 'rain' ? 10 : 18;
    this.intellectus.arcadius.emit('world:weather', { weather: w }, 'WorldSystem');
  }

  setTime(h: number) {
    this.state.timeOfDay = Math.max(0, Math.min(23, h));
    this.intellectus.arcadius.emit('world:time', { timeOfDay: this.state.timeOfDay }, 'WorldSystem');
  }

  setFog(density: number) {
    this.state.fogDensity = density;
  }

  getWeatherEmoji(): string {
    return { clear: '☀️', rain: '🌧️', snow: '❄️', fog: '🌫️' }[this.state.weather] || '☀️';
  }
}
