/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME AUDIO RADIO QUÉBEC-FM, CB CANAL 19 & SCANNER D'ONDES POLICE
 * ═══════════════════════════════════════════════════════════════════
 *
 * FONCTIONNALITÉS :
 *  - 8 Stations FM/AM Québécoises avec synthétiseur procédural multi-styles :
 *    * CKOI 96,9 (Pop / Hits québécois / Électro)
 *    * ÉNERGIE 98,5 (Classic Rock québécois & Hard Rock)
 *    * CHOM 97,7 (Montréal's Spirit of Rock - Bilingue / Anglophone)
 *    * Rythme 105,7 (Variétés, Chansons douces, Pop adulte)
 *    * ICI Première 104,7 (Radio-Canada : Bulletins d'actualités & météo des rangs)
 *    * WKND 91,9 (Indie Pop / Hits festifs de la Rive-Nord)
 *    * Radio Pirate 99,1 (Talk radio d'opinion / Underground)
 *    * Fréquence Clandestine 107,9 (Rap québ underground & messages de gangs)
 *
 *  - Système CB Radio des Camionneurs (Teamsters & Rangs) :
 *    * Canal 19 : Corridor A-40 / A-20 (signalements de radars SQ, bouchons, météo)
 *    * Canal 10 : Rang agricole & érablières (entraide, convois)
 *    * Canal 9 : Canal d'urgence universel
 *    * Sons réalistes de squelch, compression microphone et Roger Beep
 *
 *  - Scanner d'Interception d'Ondes de la Sûreté du Québec :
 *    * Écoute des transmissions radio 10-codes de la police en temps réel
 *
 *  - Système d'Alerte d'Urgence Officiel "En Alerte Québec" (Alert Ready) :
 *    * Tonalité DTMF bitonale stridente (932 Hz + 853 Hz)
 *    * Interruptions de diffusion en direct pour blizzard, tornade ou évasion de prison
 *
 *  - Traitement Spatial & Acoustique Réaliste :
 *    * Bruit blanc de syntonisation entre les stations
 *    * Perte de signal / friture sous les tunnels ou dans les vallées profondes
 *    * Égalisation acoustique dans l'habitacle des véhicules (Filtre passe-bas / Bass Boost)
 *
 * INTÉGRATIONS :
 *  - police.ts (scanner de police, alertes de poursuite 10-80)
 *  - prison.ts (alertes d'évasion En Alerte)
 *  - haul.tsx (communications de convoi CB radio)
 *  - seasons.ts (bulletins météo en direct d'ICI Première)
 *  - net.ts (synchronisation multijoueur du temps de lecture radio)
 * ═══════════════════════════════════════════════════════════════════
 */

import { netEmit, netOn } from "../game/net";
import { getWantedLevel } from "../game/police";
import { getCurrentSeason } from "../game/seasons";

// ═══════════════════════════════════════════════════════════
// TYPES & STRUCTURES DE DONNÉES
// ═══════════════════════════════════════════════════════════

export type RadioCategory = "fm" | "am" | "cb" | "scanner_police" | "pirate";

export interface RadioTrack {
  title: string;
  artist: string;
  duration: number; // en secondes
  bpm: number;
  genre: "pop" | "rock" | "chanson" | "talk" | "electro" | "country" | "rap_queb" | "news";
  keyNotes: number[]; // Fréquences de base en Hz pour le synthétiseur
  bassline: number[];
}

export interface RadioJingle {
  id: string;
  tagline: string;
  duration: number;
  chimeFrequencies: number[];
}

export interface RadioNewsFlash {
  headline: string;
  category: "meteo" | "faits_divers" | "circulation" | "politique";
  announcerText: string;
}

export interface RadioStation {
  id: string;
  name: string;
  freq: string;
  category: RadioCategory;
  genre: string;
  slogan: string;
  color: string;
  djName: string;
  tracks: RadioTrack[];
  jingles: RadioJingle[];
  newsBulletin?: RadioNewsFlash[];
}

export interface EmergencyBroadcast {
  id: string;
  active: boolean;
  type: "alerte_argent" | "meteo_extreme" | "evasion_prison" | "accident_majeur";
  headline: string;
  message: string;
  startedAt: number;
  durationSeconds: number;
}

export interface CBChatMessage {
  id: string;
  channel: number; // 19, 10, 9
  senderCallsign: string;
  senderName: string;
  message: string;
  timestamp: number;
}

export interface NowPlaying {
  station: RadioStation;
  track: RadioTrack;
  progress: number;
  isJingle: boolean;
  isEmergencyAlert: boolean;
  currentDJText?: string;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES STATIONS QUÉBÉCOISES
// ═══════════════════════════════════════════════════════════

export const QUEBEC_FM_STATIONS: RadioStation[] = [
  // ── 1. CKOI 96,9 — LE GÉANT POP DE MONTRÉAL ──
  {
    id: "ckoi",
    name: "CKOI 96,9",
    freq: "96,9",
    category: "fm",
    genre: "Pop québécois & Hits",
    slogan: "Le son de Montréal et de la Rive-Nord",
    color: "#06b6d4",
    djName: "Martin & l'équipe du matin",
    tracks: [
      {
        title: "Sous les étoiles de Portneuf",
        artist: "Marie-Laure",
        duration: 48,
        bpm: 124,
        genre: "pop",
        keyNotes: [261.63, 329.63, 392.00, 523.25], // C - E - G - C
        bassline: [130.81, 130.81, 164.81, 174.61],
      },
      {
        title: "Ruelle Saint-Denis (Remix)",
        artist: "Électro-Pop Québec",
        duration: 44,
        bpm: 128,
        genre: "electro",
        keyNotes: [293.66, 349.23, 440.00, 587.33], // Dm
        bassline: [73.42, 73.42, 87.31, 98.00],
      },
      {
        title: "Vendredi soir sur la 40",
        artist: "Les Frères du Nord",
        duration: 50,
        bpm: 120,
        genre: "pop",
        keyNotes: [349.23, 440.00, 523.25, 659.25], // Fmaj7
        bassline: [87.31, 87.31, 110.00, 130.81],
      },
    ],
    jingles: [
      {
        id: "ckoi_jingle_1",
        tagline: "CKOI 96-9... La puissance musicale !",
        duration: 4,
        chimeFrequencies: [523.25, 659.25, 783.99, 1046.50],
      },
    ],
  },

  // ── 2. ÉNERGIE 98,5 — LE ROCK QUÉBÉCOIS PUR JUS ──
  {
    id: "energie",
    name: "ÉNERGIE 98,5",
    freq: "98,5",
    category: "fm",
    genre: "Classic Rock & Québ Rock",
    slogan: "Plus de rock, plus d'Énergie !",
    color: "#e11d48",
    djName: "Le Boost ÉNERGIE",
    tracks: [
      {
        title: "L'Autoroute 40 à minuit",
        artist: "Les Pistons de Donnacona",
        duration: 46,
        bpm: 134,
        genre: "rock",
        keyNotes: [110.00, 130.81, 146.83, 164.81], // A blues
        bassline: [55.00, 55.00, 65.41, 73.42],
      },
      {
        title: "Chemin du Roy (Guitare sale)",
        artist: "Roxanne & The V8",
        duration: 52,
        bpm: 128,
        genre: "rock",
        keyNotes: [146.83, 174.61, 220.00, 261.63], // Dm pentatonique
        bassline: [73.42, 73.42, 87.31, 110.00],
      },
      {
        title: "Gueule de bois au shack",
        artist: "Gros Char Noir",
        duration: 45,
        bpm: 138,
        genre: "rock",
        keyNotes: [164.81, 196.00, 220.00, 246.94], // Em
        bassline: [82.41, 82.41, 98.00, 110.00],
      },
    ],
    jingles: [
      {
        id: "energie_jingle",
        tagline: "É-NER-GIE ! 98... 5 !",
        duration: 3,
        chimeFrequencies: [220.00, 329.63, 440.00, 880.00],
      },
    ],
  },

  // ── 3. CHOM 97,7 — MONTREAL'S SPIRIT OF ROCK (BILINGUE) ──
  {
    id: "chom",
    name: "CHOM 97,7",
    freq: "97,7",
    category: "fm",
    genre: "Classic Rock Heritage",
    slogan: "The Spirit of Rock · En direct de Montréal",
    color: "#f59e0b",
    djName: "Terry DiMonte Classic",
    tracks: [
      {
        title: "Laurentian Highway Blues",
        artist: "St-Laurent Delta Band",
        duration: 55,
        bpm: 116,
        genre: "rock",
        keyNotes: [196.00, 246.94, 293.66, 392.00], // G major
        bassline: [98.00, 98.00, 123.47, 146.83],
      },
      {
        title: "Cold Montreal Night",
        artist: "Vic Park Connection",
        duration: 48,
        bpm: 122,
        genre: "rock",
        keyNotes: [220.00, 261.63, 329.63, 440.00], // Am
        bassline: [110.00, 110.00, 130.81, 146.83],
      },
    ],
    jingles: [
      {
        id: "chom_jingle",
        tagline: "CHOM 97-7... Montreal's Spirit of Rock.",
        duration: 3,
        chimeFrequencies: [196.00, 293.66, 392.00, 587.33],
      },
    ],
  },

  // ── 4. RYTHME 105,7 — CHANSONS DOUCES & VARIÉTÉS ──
  {
    id: "rythme",
    name: "Rythme 105,7",
    freq: "105,7",
    category: "fm",
    genre: "Variétés & Pop Adulte",
    slogan: "La musique de votre vie",
    color: "#a855f7",
    djName: "Sébastien & Marie-Ève",
    tracks: [
      {
        title: "Douce brise du fleuve",
        artist: "Trio Saint-Laurent",
        duration: 52,
        bpm: 92,
        genre: "chanson",
        keyNotes: [261.63, 329.63, 392.00, 493.88], // Cmaj7
        bassline: [130.81, 130.81, 164.81, 196.00],
      },
      {
        title: "Café au lait au village",
        artist: "Chantal St-Pierre",
        duration: 48,
        bpm: 96,
        genre: "chanson",
        keyNotes: [220.00, 277.18, 329.63, 440.00], // A major
        bassline: [110.00, 110.00, 138.59, 164.81],
      },
    ],
    jingles: [
      {
        id: "rythme_jingle",
        tagline: "Rythme FM... Votre plus belle journée.",
        duration: 3,
        chimeFrequencies: [440.00, 554.37, 659.25, 880.00],
      },
    ],
  },

  // ── 5. ICI PREMIÈRE 104,7 — NOUVELLES & BULLETIN EN DIRECT ──
  {
    id: "ici",
    name: "ICI Première 104,7",
    freq: "104,7",
    category: "fm",
    genre: "Information & Météo",
    slogan: "L'information juste, en direct de Radio-Canada",
    color: "#3b82f6",
    djName: "Alain Gravel & la rédaction",
    tracks: [
      {
        title: "Bulletin Portneuf & Régions",
        artist: "Rédaction Radio-Canada",
        duration: 55,
        bpm: 80,
        genre: "news",
        keyNotes: [523.25, 659.25, 783.99, 1046.50],
        bassline: [130.81, 130.81, 130.81, 130.81],
      },
      {
        title: "Météo et État des Routes MTQ",
        artist: "ICI Québec",
        duration: 42,
        bpm: 76,
        genre: "news",
        keyNotes: [440.00, 523.25, 659.25, 880.00],
        bassline: [110.00, 110.00, 110.00, 110.00],
      },
    ],
    jingles: [
      {
        id: "ici_jingle",
        tagline: "ICI Première... Radio-Canada.",
        duration: 2,
        chimeFrequencies: [523.25, 659.25, 783.99],
      },
    ],
    newsBulletin: [
      {
        headline: "Tempête hivernale sur la Rive-Nord",
        category: "meteo",
        announcerText: "Le ministère des Transports recommande la prudence sur la 138 entre Neuville et Donnacona. Poudrerie intense et chaussée glacée.",
      },
      {
        headline: "Bilan des récoltes de sirop d'érable",
        category: "faits_divers",
        announcerText: "Excellente coulée dans les érablières de Portneuf cette semaine grâce aux nuits fraîches et aux journées ensoleillées.",
      },
    ],
  },

  // ── 6. WKND 91,9 — HITS & BONNE HUMEUR ──
  {
    id: "wknd",
    name: "WKND 91,9",
    freq: "91,9",
    category: "fm",
    genre: "Indie Pop & Hits",
    slogan: "La radio différente à Québec et Portneuf",
    color: "#fbbf24",
    djName: "Les Retours WKND",
    tracks: [
      {
        title: "Danse sous la neige",
        artist: "Lumina Pop",
        duration: 42,
        bpm: 122,
        genre: "pop",
        keyNotes: [329.63, 392.00, 493.88, 659.25], // Em
        bassline: [82.41, 82.41, 98.00, 123.47],
      },
      {
        title: "Cœur de néon sur la Main",
        artist: "Alex & the Beats",
        duration: 46,
        bpm: 118,
        genre: "pop",
        keyNotes: [261.63, 329.63, 392.00, 523.25], // C
        bassline: [130.81, 130.81, 164.81, 196.00],
      },
    ],
    jingles: [
      {
        id: "wknd_jingle",
        tagline: "WKND 91-9... C'est toujours le week-end !",
        duration: 3,
        chimeFrequencies: [329.63, 392.00, 523.25, 659.25],
      },
    ],
  },

  // ── 7. RADIO PIRATE 99,1 — TALK LIBRE & OPINION ──
  {
    id: "pirate",
    name: "Radio Pirate 99,1",
    freq: "99,1",
    category: "pirate",
    genre: "Talk Radio & Débats",
    slogan: "La parole libre, sans subventions",
    color: "#10b981",
    djName: "Jeff & les moussaillons",
    tracks: [
      {
        title: "Édito : Le gros bon sens dans le comté",
        artist: "Radio Pirate Studio",
        duration: 60,
        bpm: 90,
        genre: "talk",
        keyNotes: [110.00, 130.81, 146.83, 164.81],
        bassline: [55.00, 55.00, 55.00, 55.00],
      },
    ],
    jingles: [
      {
        id: "pirate_jingle",
        tagline: "Radio Pirate... Pavillon noir levé.",
        duration: 2,
        chimeFrequencies: [110.00, 146.83, 220.00],
      },
    ],
  },

  // ── 8. FRÉQUENCE CLANDESTINE 107,9 — RAP QUÉB & MARCHÉ NOIR ──
  {
    id: "clandestine",
    name: "Clandestine 107,9",
    freq: "107,9",
    category: "pirate",
    genre: "Rap Québ & Trap Underground",
    slogan: "Diffusé depuis les toits de Montréal-Nord",
    color: "#6366f1",
    djName: "DJ Hangar 514",
    tracks: [
      {
        title: "Règles du bitume (514/418)",
        artist: "Krew Saint-Michel",
        duration: 48,
        bpm: 140,
        genre: "rap_queb",
        keyNotes: [146.83, 174.61, 220.00, 261.63], // Dm 808
        bassline: [36.71, 36.71, 43.65, 49.00], // Sub-bass très lourd
      },
      {
        title: "Convoi fantôme dans la brume",
        artist: "Nomads Trap",
        duration: 45,
        bpm: 136,
        genre: "rap_queb",
        keyNotes: [130.81, 155.56, 196.00, 233.08], // Cm
        bassline: [32.70, 32.70, 38.89, 43.65],
      },
    ],
    jingles: [
      {
        id: "clandestine_jingle",
        tagline: "107-9... Pas de nom, pas de visage.",
        duration: 2,
        chimeFrequencies: [73.42, 110.00, 146.83],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// CANAUX CB RADIO (TRUCKERS & RANGS)
// ═══════════════════════════════════════════════════════════

export const CB_CHANNELS: Record<number, { name: string; description: string }> = {
  19: { name: "Canal 19 — Corridor A-40 / A-20", description: "Le canal officiel des camionneurs longue distance (Fret, signalements SQ)" },
  10: { name: "Canal 10 — Rangs & Agricole", description: "Échanges ruraux, laitiers, producteurs et machinerie lourde" },
  9:  { name: "Canal 9 — Urgence & Sauvetage", description: "Fréquence de secours réservée aux détresses et accidents" },
};

// ═══════════════════════════════════════════════════════════
// ALERTE D'URGENCE NATIONALE (EN ALERTE QUÉBEC / ALERT READY)
// ═══════════════════════════════════════════════════════════

let emergencyState: EmergencyBroadcast = {
  id: "",
  active: false,
  type: "meteo_extreme",
  headline: "",
  message: "",
  startedAt: 0,
  durationSeconds: 15,
};

export function triggerEmergencyBroadcast(
  type: EmergencyBroadcast["type"],
  headline: string,
  message: string,
  durationSec = 20,
) {
  emergencyState = {
    id: `ALERT-${Date.now()}`,
    active: true,
    type,
    headline,
    message,
    startedAt: Date.now(),
    durationSeconds: durationSec,
  };

  quebecFM.playAlertReadyTone();
  netEmit("radio:emergency_alert", { emergencyState });
}

export function clearEmergencyBroadcast() {
  emergencyState.active = false;
  netEmit("radio:emergency_cleared", {});
}

// ═══════════════════════════════════════════════════════════
// MOTEUR AUDIO & SYNTHÉTISEUR PROCÉDURAL WEB AUDIO
// ═══════════════════════════════════════════════════════════

class QuebecFM {
  on = false;
  stationId = QUEBEC_FM_STATIONS[0]!.id;
  volume = 0.25;

  // CB Radio State
  cbActive = false;
  cbChannel = 19;
  cbMessages: CBChatMessage[] = [];

  // Scanner SQ State
  scannerActive = false;

  // Audio Context & Nodes
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private carFilter: BiquadFilterNode | null = null; // Filtre acoustique d'habitacle
  private staticNode: AudioBufferSourceNode | null = null;
  private staticGain: GainNode | null = null;

  private acc = 0;
  private startedAt = Date.now();
  private isTuning = false;

  constructor() {
    this.initDefaultCBMessages();
  }

  private initDefaultCBMessages() {
    this.cbMessages = [
      {
        id: "cb_1",
        channel: 19,
        senderCallsign: "Gros-Bison-104",
        senderName: "Trucker Marc",
        message: "Attention les boys, y'a une Crown Victoria de la SQ cachée dans le terre-plein à la sortie 281 Donnacona !",
        timestamp: Date.now() - 45000,
      },
      {
        id: "cb_2",
        channel: 19,
        senderCallsign: "L'Aigle-du-Nord",
        senderName: "Ti-Guy",
        message: "10-4 Bison ! Merci du call, je slack la pédale avec mon 53 pieds.",
        timestamp: Date.now() - 20000,
      },
      {
        id: "cb_3",
        channel: 10,
        senderCallsign: "Tracteur-Bleu",
        senderName: "Fermier Roger",
        message: "Convoi de lisier sur le Rang Sainte-Anne, ça roule à 30 km/h, dépassement prudent.",
        timestamp: Date.now() - 60000,
      },
    ];
  }

  station(): RadioStation {
    return QUEBEC_FM_STATIONS.find((s) => s.id === this.stationId) ?? QUEBEC_FM_STATIONS[0]!;
  }

  nowPlaying(): NowPlaying {
    const station = this.station();
    const elapsed = Math.max(0, (Date.now() - this.startedAt) / 1000);
    const total = station.tracks.reduce((s, t) => s + t.duration, 0) || 1;
    let t = elapsed % total;

    for (const track of station.tracks) {
      if (t < track.duration) {
        return {
          station,
          track,
          progress: t,
          isJingle: false,
          isEmergencyAlert: emergencyState.active,
          currentDJText: station.djName,
        };
      }
      t -= track.duration;
    }

    return {
      station,
      track: station.tracks[0]!,
      progress: 0,
      isJingle: false,
      isEmergencyAlert: emergencyState.active,
      currentDJText: station.djName,
    };
  }

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }

    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();

    // Chaîne audio principale : Master -> Filtre Voiture -> Destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.on ? this.volume : 0;

    // Filtre passe-bas pour simuler la caisse de résonance du véhicule
    this.carFilter = this.ctx.createBiquadFilter();
    this.carFilter.type = "lowpass";
    this.carFilter.frequency.value = 18000; // Son clair par défaut

    this.masterGain.connect(this.carFilter);
    this.carFilter.connect(this.ctx.destination);

    // Initialisation du bruit blanc de syntonisation (Static Noise)
    this.initStaticNoise();

    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  private initStaticNoise() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.staticGain = this.ctx.createGain();
    this.staticGain.gain.value = 0; // Inaudible tant qu'on ne change pas de poste
    this.staticGain.connect(this.masterGain);

    const playStatic = () => {
      if (!this.ctx || !this.staticGain) return;
      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      source.connect(this.staticGain);
      source.start();
    };

    playStatic();
  }

  setOn(on: boolean) {
    this.on = on;
    void this.ensure();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.08);
    }
  }

  setStation(id: string) {
    if (id !== this.stationId) {
      this.startedAt = Date.now();
      this.playTuningStatic();
    }
    this.stationId = id;
    this.setOn(true);
  }

  cycle(): RadioStation {
    const i = QUEBEC_FM_STATIONS.findIndex((s) => s.id === this.stationId);
    const next = QUEBEC_FM_STATIONS[(i + 1) % QUEBEC_FM_STATIONS.length]!;
    this.setStation(next.id);
    return next;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && this.on) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  // Simuler le passage dans un tunnel ou sous un orage (perte de signal)
  setSignalQuality(qualityPercent: number) {
    if (!this.staticGain || !this.carFilter || !this.ctx) return;
    const factor = 1 - Math.max(0, Math.min(1, qualityPercent / 100));

    // Bruit blanc monte si le signal est mauvais
    this.staticGain.gain.setTargetAtTime(factor * 0.12, this.ctx.currentTime, 0.1);
    // Les hautes fréquences sont étouffées
    this.carFilter.frequency.setTargetAtTime(18000 * (1 - factor * 0.7), this.ctx.currentTime, 0.1);
  }

  private playTuningStatic() {
    if (!this.staticGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.staticGain.gain.setValueAtTime(0.08, t);
    this.staticGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  }

  // ═══════════════════════════════════════════════════════════
  // SYNTHÉTISEUR DE L'ALERTE EN ALERTE QUÉBEC (ALERT READY)
  // ═══════════════════════════════════════════════════════════

  playAlertReadyTone() {
    void this.ensure();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Les deux tonalités officielles canadiennes : 853 Hz et 932 Hz
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const alertGain = this.ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(853, t);
    osc2.frequency.setValueAtTime(932, t);

    alertGain.gain.setValueAtTime(0.22, t);
    alertGain.gain.setValueAtTime(0.22, t + 2.5);
    alertGain.gain.exponentialRampToValueAtTime(0.001, t + 3.0);

    osc1.connect(alertGain);
    osc2.connect(alertGain);
    alertGain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 3.0);
    osc2.stop(t + 3.0);
  }

  // ═══════════════════════════════════════════════════════════
  // CB RADIO (CANAL 19 & ROGER BEEP)
  // ═══════════════════════════════════════════════════════════

  sendCBMessage(senderCallsign: string, senderName: string, message: string) {
    const msg: CBChatMessage = {
      id: `cb_${Date.now()}`,
      channel: this.cbChannel,
      senderCallsign,
      senderName,
      message,
      timestamp: Date.now(),
    };

    this.cbMessages.unshift(msg);
    if (this.cbMessages.length > 30) this.cbMessages.pop();

    this.playRogerBeep();
    netEmit("radio:cb_message", { message: msg });
  }

  setCBChannel(channel: number) {
    if (CB_CHANNELS[channel]) {
      this.cbChannel = channel;
      this.playSquelchBurst();
    }
  }

  private playRogerBeep() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, t);
    osc.frequency.setValueAtTime(1400, t + 0.08);

    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private playSquelchBurst() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // ═══════════════════════════════════════════════════════════
  // TICK AUDIO MULTI-GENRES (POP, ROCK, TRAP, NOUVELLES)
  // ═══════════════════════════════════════════════════════════

  tick(dt: number, audible: boolean) {
    if (!this.on || !audible || !this.ctx || !this.masterGain) return;
    if (this.ctx.state !== "running") return;

    // Si une alerte d'urgence nationale est active, ne pas jouer la musique normale
    if (emergencyState.active) {
      if (Date.now() - emergencyState.startedAt > emergencyState.durationSeconds * 1000) {
        emergencyState.active = false;
      }
      return;
    }

    this.acc += dt;
    if (this.acc < 0.2) return;
    this.acc = 0;

    this.synthesizeBeat();
  }

  private synthesizeBeat() {
    const ctx = this.ctx;
    const dest = this.masterGain;
    if (!ctx || !dest) return;

    const { station, track, progress } = this.nowPlaying();
    const t = ctx.currentTime;
    const beatDuration = 60 / track.bpm;
    const step = Math.floor((progress % (beatDuration * 4)) / (beatDuration / 4));
    const id = station.id;

    // ── 1. NOUVELLES RADIO-CANADA (ICI PREMIÈRE) ──
    if (id === "ici") {
      if (step === 0 && Math.floor(progress) % 8 === 0) {
        this.chime(t, [523.25, 659.25, 783.99]);
      }
      return;
    }

    // ── 2. ROCK QUÉBÉCOIS (ÉNERGIE 98,5 / CHOM 97,7) ──
    if (id === "energie" || id === "chom") {
      if (step % 4 === 0) this.kick(t, 0.18, 55); // Grosse caisse rock
      if (step % 8 === 4) this.snare(t, 0.12, "triangle"); // Caisse claire claquante
      if (step % 2 === 0) this.hihat(t, 0.04); // Cymbale charleston

      const bass = track.bassline;
      if (bass.length > 0) {
        const freq = bass[step % bass.length]!;
        this.tone(t, freq, "sawtooth", 0.14, 0.12);
      }
      return;
    }

    // ── 3. TRAP & RAP QUÉB (CLANDESTINE 107,9) ──
    if (id === "clandestine") {
      if (step % 8 === 0) this.sub808(t, 0.25, 42); // 808 Sub-bass percutant
      if (step % 8 === 4) this.snare(t, 0.14, "sine"); // Trap clap
      this.hihat(t, 0.06); // Hi-hats rapides en triolets

      const notes = track.keyNotes;
      if (step % 4 === 0 && notes.length > 0) {
        this.tone(t, notes[step % notes.length]!, "triangle", 0.3, 0.09);
      }
      return;
    }

    // ── 4. POP & HITS (CKOI 96,9 / WKND 91,9) ──
    if (step % 4 === 0) this.kick(t, 0.14, 120);
    if (step % 8 === 4) this.snare(t, 0.09, "sine");
    if (step % 2 === 0) this.hihat(t, 0.03);

    // ── 5. CHANSONS DOUCES (RYTHME 105,7) ──
    if (id === "rythme") {
      if (step === 0 || step === 8) {
        this.chord(t, track.keyNotes, 0.06);
      }
      return;
    }

    // Arpège mélodique standard
    if (step % 2 === 0 && track.keyNotes.length > 0) {
      const note = track.keyNotes[step % track.keyNotes.length]!;
      this.tone(t, note, "sine", 0.09, 0.06);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INSTRUMENTS DU SYNTHÉTISEUR (KICK, 808, SNARE, HIHAT)
  // ═══════════════════════════════════════════════════════════

  private kick(t: number, vol: number, startPitch = 140) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(startPitch, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.1);

    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  private sub808(t: number, vol: number, freq = 45) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq + 40, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);

    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.46);
  }

  private snare(t: number, vol: number, type: OscillatorType = "triangle") {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private hihat(t: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(8000, t);

    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private tone(t: number, freq: number, type: OscillatorType, dur: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private chord(t: number, freqs: number[], vol: number) {
    for (const f of freqs) {
      this.tone(t, f, "sine", 0.5, vol);
    }
  }

  private chime(t: number, freqs: number[]) {
    freqs.forEach((f, i) => {
      this.tone(t + i * 0.09, f, "sine", 0.25, 0.07);
    });
  }

  dispose() {
    this.setOn(false);
    try {
      void this.ctx?.close();
    } catch { /* ignore */ }
    this.ctx = null;
    this.masterGain = null;
    this.carFilter = null;
    this.staticGain = null;
  }
}

export const quebecFM = new QuebecFM();