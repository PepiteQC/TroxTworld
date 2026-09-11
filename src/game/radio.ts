export interface RadioStation {
  id: string;
  name: string;
  freq: string;
  genre: string;
  slogan: string;
  color: string;
  tracks: { title: string; artist: string; duration: number; bpm: number }[];
}

export const QUEBEC_FM_STATIONS: RadioStation[] = [
  {
    id: "ckoi",
    name: "CKOI 96,9",
    freq: "96,9",
    genre: "Pop québécois",
    slogan: "L'énergie pop de Montréal",
    color: "#5ad0d8",
    tracks: [
      { title: "Sous les étoiles de Portneuf", artist: "Marie-Laure", duration: 48, bpm: 124 },
      { title: "Ruelle Saint-Denis", artist: "Électro-Pop Québec", duration: 44, bpm: 128 },
    ],
  },
  {
    id: "energie",
    name: "ÉNERGIE 98,5",
    freq: "98,5",
    genre: "Rock",
    slogan: "Plus de rock, plus d'Énergie",
    color: "#e24b6a",
    tracks: [
      { title: "L'Autoroute 40 à minuit", artist: "Les Pistons", duration: 46, bpm: 132 },
      { title: "Chemin du Roy", artist: "Roxanne", duration: 42, bpm: 128 },
    ],
  },
  {
    id: "rythme",
    name: "Rythme 105,7",
    freq: "105,7",
    genre: "Variétés",
    slogan: "La musique de votre vie",
    color: "#a78bfa",
    tracks: [
      { title: "Douce brise du fleuve", artist: "Trio Saint-Laurent", duration: 52, bpm: 92 },
      { title: "Café au lait", artist: "Chantal St-Pierre", duration: 48, bpm: 96 },
    ],
  },
  {
    id: "ici",
    name: "ICI Première 104,7",
    freq: "104,7",
    genre: "Info",
    slogan: "L'information juste, en direct",
    color: "#60a5fa",
    tracks: [
      { title: "Bulletin Portneuf", artist: "Rédaction ICI", duration: 55, bpm: 80 },
      { title: "Météo des rangs", artist: "ICI Québec", duration: 40, bpm: 78 },
    ],
  },
  {
    id: "wknd",
    name: "WKND 91,9",
    freq: "91,9",
    genre: "Hits",
    slogan: "Vos hits, sans chichi",
    color: "#f59e0b",
    tracks: [
      { title: "Danse sous la neige", artist: "Lumina Pop", duration: 42, bpm: 120 },
      { title: "Cœur de néon", artist: "Alex & the Beats", duration: 46, bpm: 118 },
    ],
  },
];

export interface NowPlaying {
  station: RadioStation;
  track: RadioStation["tracks"][number];
  progress: number;
}

class QuebecFM {
  on = false;
  stationId = QUEBEC_FM_STATIONS[0]!.id;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private acc = 0;
  private startedAt = Date.now();
  volume = 0.22;

  station(): RadioStation {
    return QUEBEC_FM_STATIONS.find((s) => s.id === this.stationId) ?? QUEBEC_FM_STATIONS[0]!;
  }

  nowPlaying(): NowPlaying {
    const station = this.station();
    const elapsed = Math.max(0, (Date.now() - this.startedAt) / 1000);
    const total = station.tracks.reduce((s, t) => s + t.duration, 0) || 1;
    let t = elapsed % total;
    for (const track of station.tracks) {
      if (t < track.duration) return { station, track, progress: t };
      t -= track.duration;
    }
    return { station, track: station.tracks[0]!, progress: 0 };
  }

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? this.volume : 0;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setOn(on: boolean) {
    this.on = on;
    void this.ensure();
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.06);
    }
  }

  setStation(id: string) {
    if (id !== this.stationId) this.startedAt = Date.now();
    this.stationId = id;
    this.setOn(true);
  }

  cycle(): RadioStation {
    const i = QUEBEC_FM_STATIONS.findIndex((s) => s.id === this.stationId);
    const next = QUEBEC_FM_STATIONS[(i + 1) % QUEBEC_FM_STATIONS.length]!;
    this.setStation(next.id);
    return next;
  }

  tick(dt: number, audible: boolean) {
    if (!this.on || !audible || !this.ctx || !this.master) return;
    if (this.ctx.state !== "running") return;
    this.acc += dt;
    if (this.acc < 0.24) return;
    this.acc = 0;
    this.beat();
  }

  private beat() {
    const ctx = this.ctx;
    const dest = this.master;
    if (!ctx || !dest) return;
    const { station, track, progress } = this.nowPlaying();
    const t = ctx.currentTime;
    const beat = 60 / track.bpm;
    const step = Math.floor((progress % (beat * 4)) / (beat / 4));
    const id = station.id;

    if (id === "ici") {
      if (step === 0 && Math.floor(progress) % 12 === 0) this.chime(t);
      return;
    }

    if (step % 4 === 0) this.kick(t, id === "energie" ? 0.16 : 0.11);
    if (step % 8 === 4) this.snare(t, 0.08);

    if (id === "rythme") {
      if (step === 0 || step === 8) this.chord(t, [261.63, 329.63, 392], 0.045);
      return;
    }
    if (id === "energie") {
      const bass = [110, 110, 130.81, 146.83];
      this.tone(t, bass[step % bass.length]!, "sawtooth", 0.18, 0.05);
      return;
    }
    if (step % 2 === 0) {
      const notes = [261.63, 329.63, 392, 523.25];
      this.tone(t, notes[step % notes.length]!, "sine", 0.1, 0.04);
    }
  }

  private kick(t: number, vol: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.11);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  private snare(t: number, vol: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  private tone(t: number, freq: number, type: OscillatorType, dur: number, vol: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private chord(t: number, freqs: number[], vol: number) {
    for (const f of freqs) this.tone(t, f, "sine", 0.55, vol);
  }

  private chime(t: number) {
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(t + i * 0.08, f, "sine", 0.22, 0.05));
  }

  dispose() {
    this.setOn(false);
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.master = null;
  }
}

export const quebecFM = new QuebecFM();
