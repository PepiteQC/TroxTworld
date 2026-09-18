/**
 * ═════════════════════════════════════════════════════════════════════════════
 *  THIRD EYE v3.0 — DIRECTEUR D'ÉVÉNEMENTS DYNAMIQUES DU COMTÉ DE PORTNEUF
 *  src/server/systems/DynamicEventsService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Catalogue extensible de templates (15+ événements)
 *  • Scheduler autonome (probabilités par saison/heure/météo/zone)
 *  • Conditions de déclenchement contextuelles
 *  • Réactions en chaîne (blizzard → panne → barrage routier)
 *  • Subscribers pub/sub (onEvent, onResolve, onExpire)
 *  • Priorité de banner + queue
 *  • Modifiers globaux calculés (valeur, pas bool)
 *  • Cache de modifiers avec invalidation
 *  • Cooldowns anti-spam (par event + par catégorie)
 *  • Stats détaillées (par catégorie, sévérité, durée)
 *  • Persistance Drizzle avec fallback silencieux
 *  • RNG seedé (reproductibilité)
 *  • Cleanup auto des vieux events
 *  • Intégration ZoneSystem + WeatherSystem (optionnelle)
 *  • Compat 100% v1
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { A40_EXITS, VILLAGES } from './worlddata';
// import { db } from "./db";
// import { gameLogs } from "../db/schema";

// ═════════════════════════════════════════════════════════════════════════════
//  1. TYPES (compat v1 + extensions v3)
// ═════════════════════════════════════════════════════════════════════════════

export type EventCategory =
  | 'meteo'
  | 'infrastructures'
  | 'urgence'
  | 'economie'
  | 'social';

export type EventSeverity = 'mineur' | 'majeur' | 'catastrophe';

export interface GlobalModifiers {
  /** Multiplicateur de vitesse max (0.5 = 50%, 1.5 = 150%). */
  speedLimitMultiplier?: number;
  /** Aggressivité police (1.0 = normal, 2.0 = double). */
  policeAggressiveness?: number;
  /** Coupure de courant (éclairage public éteint). */
  powerOutage?: boolean;
  /** 🆕 Densité de trafic (0.3 = calme, 2.0 = embouteillé). */
  trafficDensity?: number;
  /** 🆕 Modificateur d'économie (0.5 = récession, 1.5 = boom). */
  economyMultiplier?: number;
  /** 🆕 Visibilité réduite (brouillard, neige). */
  visibilityMultiplier?: number;
  /** 🆕 Risque d'accidents (0..2). */
  accidentRisk?: number;
  /** 🆕 Bonus d'urgence EMS (ambulances plus rapides ?). */
  emsResponseMultiplier?: number;
}

export interface DynamicQuebecEvent {
  id: string;
  title: string;
  category: EventCategory;
  severity: EventSeverity;
  locationName: string;
  coordinates: [number, number, number];
  description: string;
  active: boolean;
  startedAt: number;
  durationMinutes: number;
  impacts: string[];
  globalModifiers?: GlobalModifiers;

  // 🆕 v3 extensions
  /** Template source (debug + analytics). */
  templateId?: string;
  /** Timestamp de fin prévue. */
  expectedEndAt?: number;
  /** Timestamp de résolution effective. */
  resolvedAt?: number;
  /** Raison de fin (expired/resolved/cleared/chain). */
  endReason?: 'expired' | 'resolved' | 'cleared' | 'chain_reaction';
  /** Événements déclenchés en chaîne. */
  chainedEventIds?: string[];
  /** VILLAGES touchés. */
  villageIds?: string[];
  /** Tags libres. */
  tags?: string[];
  /** Priorité de banner (0-100). Calculée depuis severity + modifiers. */
  bannerPriority?: number;
}

/**
 * 🆕 Template d'événement (catalogue extensible).
 */
export interface EventTemplate {
  /** ID unique du template. */
  id: string;
  /** Titre par défaut. */
  title: string;
  category: EventCategory;
  severity: EventSeverity;
  locationName: string;
  coordinates: [number, number, number];
  description: string;
  durationMinutes: number;
  impacts: string[];
  globalModifiers?: GlobalModifiers;

  // 🆕 v3
  /** Probabilité de base (0..1) au tick de scheduler. */
  baseProbability?: number;
  /** Conditions de déclenchement (toutes doivent être vraies). */
  conditions?: TriggerConditions;
  /** Événements à déclencher en chaîne après N secondes. */
  chains?: Array<{
    templateId: string;
    delaySeconds: number;
    probability: number;
  }>;
  /** Cooldown après résolution avant re-trigger (minutes). */
  cooldownMinutes?: number;
  /** Villages concernés (informatif). */
  villageIds?: string[];
  /** Tags libres. */
  tags?: string[];
}

export interface TriggerConditions {
  /** Saisons autorisées. */
  seasons?: Array<'printemps' | 'ete' | 'automne' | 'hiver'>;
  /** Plage horaire (heure de jeu 0-24). */
  hourRange?: [number, number];
  /** Météos autorisées (si WeatherSystem connecté). */
  weather?: string[];
  /** Zones requises (si ZoneSystem connecté). */
  zoneTypes?: string[];
  /** Nombre minimum de joueurs connectés. */
  minPlayers?: number;
  /** Nombre maximum de joueurs connectés. */
  maxPlayers?: number;
  /** Ne déclenche pas si un event de la même catégorie est déjà actif. */
  exclusiveCategory?: boolean;
  /** Ne déclenche pas si ce template est déjà actif. */
  exclusiveSelf?: boolean;
}

export interface DynamicEventsConfig {
  /** Nombre max d'événements gardés en mémoire (active + resolved). */
  maxEvents: number;
  /** Intervalle du scheduler (ms). */
  schedulerIntervalMs: number;
  /** Intervalle du tick cleanup (ms). */
  cleanupIntervalMs: number;
  /** Age max des events résolus avant cleanup (ms). */
  resolvedRetentionMs: number;
  /** Active le scheduler automatique. */
  schedulerEnabled: boolean;
  /** Seed pour le RNG (0 = aléatoire). */
  seed: number;
  /** Cooldown global (ms) entre deux déclenchements de scheduler. */
  globalTriggerCooldownMs: number;
  /** Active la persistance Drizzle. */
  persistenceEnabled: boolean;
  /** Active les logs console. */
  verbose: boolean;
}

const DEFAULT_CONFIG: DynamicEventsConfig = {
  maxEvents: 100,
  schedulerIntervalMs: 60_000,
  cleanupIntervalMs: 5 * 60_000,
  resolvedRetentionMs: 24 * 3600 * 1000,
  schedulerEnabled: true,
  seed: 0,
  globalTriggerCooldownMs: 90_000,
  persistenceEnabled: true,
  verbose: false,
};

// ═════════════════════════════════════════════════════════════════════════════
//  2. RNG SEEDÉ
// ═════════════════════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════════════════════
//  3. UTILITAIRES
// ═════════════════════════════════════════════════════════════════════════════

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function severityRank(s: EventSeverity): number {
  return { catastrophe: 3, majeur: 2, mineur: 1 }[s];
}

// ═════════════════════════════════════════════════════════════════════════════
//  4. CATALOGUE DE TEMPLATES (15+ événements réalistes QC)
// ═════════════════════════════════════════════════════════════════════════════

const X254 = A40_EXITS[1]?.x ?? -500;
const X261 = A40_EXITS[3]?.x ?? -300;

/**
 * 🆕 Catalogue de templates d'événements.
 * Chaque template peut être déclenché manuellement ou par le scheduler
 * selon ses conditions + probabilité.
 */
export const EVENT_CATALOG: EventTemplate[] = [
  // ─── MÉTÉO ───
  {
    id: 'blizzard_a40',
    title: "Tempête de poudrerie majeure sur l'Autoroute 40",
    category: 'meteo',
    severity: 'majeur',
    locationName: 'A-40 entre Donnacona et Saint-Marc-des-Carrières',
    coordinates: [(X254 + X261) / 2, 2, 6],
    description:
      'Vents violents du nord-est à 80 km/h, visibilité nulle par intermittence. Sorties de route signalées.',
    durationMinutes: 90,
    impacts: [
      'Vitesse maximale conseillée : 50 km/h',
      'Intervention prioritaire des chasse-neige du MTQ',
      'Risque accru de patinage sur ponts et viaducs',
    ],
    globalModifiers: {
      speedLimitMultiplier: 0.6,
      policeAggressiveness: 0.8,
      visibilityMultiplier: 0.3,
      accidentRisk: 1.8,
    },
    baseProbability: 0.05,
    conditions: {
      seasons: ['hiver'],
      weather: ['blizzard', 'snow'],
      exclusiveCategory: true,
    },
    chains: [
      { templateId: 'outage_hydro', delaySeconds: 60, probability: 0.4 },
    ],
    cooldownMinutes: 180,
    tags: ['A40', 'hiver', 'tempête'],
  },
  {
    id: 'freezing_rain',
    title: 'Pluie verglaçante sur le Chemin du Roy',
    category: 'meteo',
    severity: 'majeur',
    locationName: 'Route 138 entre Neuville et Donnacona',
    coordinates: [-200, 2, 20],
    description:
      'Précipitations sous forme de verglas. Chaussées glissantes, ponceaux gelés, risques d\'accidents multiples.',
    durationMinutes: 120,
    impacts: [
      'Vitesse réduite à 40 km/h',
      'Épandage de sel et sable en cours',
      'Risque élevé de sortie de route',
    ],
    globalModifiers: {
      speedLimitMultiplier: 0.4,
      accidentRisk: 2.0,
      visibilityMultiplier: 0.5,
    },
    baseProbability: 0.04,
    conditions: {
      seasons: ['hiver', 'printemps', 'automne'],
      weather: ['ice', 'rain', 'fog'],
      exclusiveCategory: true,
    },
    cooldownMinutes: 240,
    tags: ['138', 'verglas'],
  },
  {
    id: 'river_fog',
    title: 'Brouillard dense du Saint-Laurent',
    category: 'meteo',
    severity: 'mineur',
    locationName: 'Berges du Saint-Laurent — Portneuf',
    coordinates: [0, 2, 80],
    description:
      'Brume épaisse remontant du fleuve. Visibilité réduite à moins de 100 mètres sur les routes longeant les berges.',
    durationMinutes: 90,
    impacts: [
      'Réduction de visibilité critique',
      'Navigation maritime ralentie',
      'Prudence accrue aux intersections riveraines',
    ],
    globalModifiers: {
      visibilityMultiplier: 0.2,
      accidentRisk: 1.4,
    },
    baseProbability: 0.08,
    conditions: {
      seasons: ['automne', 'printemps'],
      hourRange: [4, 9],
      exclusiveCategory: true,
    },
    cooldownMinutes: 60,
    tags: ['fleuve', 'brouillard'],
  },

  // ─── INFRASTRUCTURES ───
  {
    id: 'outage_hydro',
    title: 'Panne générale Hydro-Québec — Ligne 25 kV',
    category: 'infrastructures',
    severity: 'majeur',
    locationName: 'Bourg patrimonial de Saint-Casimir',
    coordinates: [-900, 2, -280],
    description:
      'Bris de matériel sur le réseau de distribution principal suite à des accumulations de glace.',
    durationMinutes: 60,
    impacts: [
      "Coupure totale de l'éclairage public et des feux de circulation",
      'Activation des génératrices de secours institutionnelles',
      'Intervention des monteurs de lignes requise',
    ],
    globalModifiers: { powerOutage: true, trafficDensity: 0.7 },
    baseProbability: 0.03,
    conditions: {
      seasons: ['hiver', 'automne'],
      exclusiveCategory: true,
    },
    cooldownMinutes: 300,
    villageIds: ['saint_casimir'],
    tags: ['hydro', 'coupure'],
  },
  {
    id: 'bridge_maintenance',
    title: 'Fermeture du pont de Cap-Santé pour réfection',
    category: 'infrastructures',
    severity: 'mineur',
    locationName: 'Pont de Cap-Santé',
    coordinates: [200, 2, 60],
    description:
      'Travaux majeurs de réfection de la chaussée du pont historique. Circulation en alternance.',
    durationMinutes: 180,
    impacts: [
      'Circulation alternée sur une seule voie',
      'Délais importants aux heures de pointe',
      'Déviation recommandée par la 138',
    ],
    globalModifiers: {
      trafficDensity: 1.6,
      speedLimitMultiplier: 0.5,
    },
    baseProbability: 0.02,
    conditions: {
      seasons: ['printemps', 'ete', 'automne'],
      hourRange: [6, 20],
      exclusiveCategory: true,
    },
    cooldownMinutes: 480,
    villageIds: ['cap_sante'],
    tags: ['mtq', 'travaux'],
  },

  // ─── URGENCES ───
  {
    id: 'police_checkpoint',
    title: 'Opération marteau — Barrage routier Sûreté du Québec (SQ)',
    category: 'urgence',
    severity: 'mineur',
    locationName: 'Route 138, Entrée est de Saint-Alban',
    coordinates: [-450, 2, -150],
    description:
      'Contrôle routier intensif de la SQ ciblant les capacités affaiblies et la vérification des immatriculations.',
    durationMinutes: 45,
    impacts: [
      'Ralentissements majeurs sur la route 138',
      'Fouilles aléatoires des coffres de véhicules',
      'Tolérance zéro pour les infractions au Code de la sécurité routière',
    ],
    globalModifiers: { policeAggressiveness: 1.5 },
    baseProbability: 0.06,
    conditions: {
      hourRange: [18, 4],
      exclusiveCategory: true,
    },
    cooldownMinutes: 90,
    villageIds: ['saint_alban'],
    tags: ['sq', 'contrôle'],
  },
  {
    id: 'accident_majeur',
    title: 'Carambolage sur l\'Autoroute 40',
    category: 'urgence',
    severity: 'catastrophe',
    locationName: 'A-40, km 254 — Sortie Donnacona',
    coordinates: [X254, 2, 6],
    description:
      'Collision multiple impliquant 8 véhicules. Plusieurs blessés. Autoroute fermée dans les deux directions.',
    durationMinutes: 120,
    impacts: [
      'A-40 complètement fermée',
      'Intervention EMS + SQ + pompiers',
      'Déviation obligatoire par la 138',
      'Circulation paralysée sur 15 km',
    ],
    globalModifiers: {
      trafficDensity: 2.0,
      policeAggressiveness: 1.3,
      emsResponseMultiplier: 0.7,
    },
    baseProbability: 0.01,
    conditions: {
      weather: ['storm', 'blizzard', 'ice', 'snow'],
      exclusiveCategory: true,
    },
    chains: [
      { templateId: 'police_checkpoint', delaySeconds: 120, probability: 0.6 },
    ],
    cooldownMinutes: 360,
    villageIds: ['donnacona'],
    tags: ['accident', 'A40', 'catastrophe'],
  },
  {
    id: 'forest_fire',
    title: 'Feu de forêt en Haute-Mauricie',
    category: 'urgence',
    severity: 'catastrophe',
    locationName: 'Forêt au nord de Saint-Raymond',
    coordinates: [-300, 2, -500],
    description:
      'Incendie majeur en forêt boréale. SOPFEU en intervention. Panache visible à des kilomètres.',
    durationMinutes: 240,
    impacts: [
      'Évacuation préventive des zones boisées',
      'Fumée réduisant la visibilité',
      'Interdiction de feux à ciel ouvert',
      'SOPFEU mobilisé',
    ],
    globalModifiers: {
      visibilityMultiplier: 0.4,
      accidentRisk: 1.5,
      trafficDensity: 0.6,
    },
    baseProbability: 0.005,
    conditions: {
      seasons: ['ete'],
      hourRange: [10, 20],
      weather: ['clear', 'cloudy'],
      exclusiveCategory: true,
    },
    cooldownMinutes: 720,
    tags: ['feu', 'SOPFEU', 'forêt'],
  },

  // ─── ÉCONOMIE ───
  {
    id: 'black_friday',
    title: 'Vendredi Fou — Portes ouvertes commerciales',
    category: 'economie',
    severity: 'mineur',
    locationName: 'Zone commerciale Portneuf',
    coordinates: [100, 2, 100],
    description:
      'Soldes majeurs dans tous les commerces. Afflux record de clients et embouteillages aux abords des centres commerciaux.',
    durationMinutes: 480,
    impacts: [
      'Prix réduits chez les commerçants participants',
      'Affluence record en ville',
      'Stationnements saturés',
      'Patrouilles policières renforcées',
    ],
    globalModifiers: {
      economyMultiplier: 1.4,
      trafficDensity: 1.8,
      policeAggressiveness: 1.2,
    },
    baseProbability: 0.01,
    conditions: {
      seasons: ['automne', 'hiver'],
      hourRange: [8, 21],
    },
    cooldownMinutes: 1440,
    tags: ['commerce', 'solde'],
  },
  {
    id: 'gas_strike',
    title: 'Pénurie d\'essence dans le comté',
    category: 'economie',
    severity: 'majeur',
    locationName: 'Comté de Portneuf — toutes stations',
    coordinates: [0, 2, 0],
    description:
      'Blocage des raffineries à Montréal. Réapprovisionnement ralenti. Plusieurs stations à sec.',
    durationMinutes: 360,
    impacts: [
      'Prix à la pompe en hausse de 40%',
      'Files d\'attente aux stations restantes',
      'Risque de rupture de stock',
    ],
    globalModifiers: {
      economyMultiplier: 1.3,
      trafficDensity: 1.2,
    },
    baseProbability: 0.008,
    conditions: { exclusiveCategory: true },
    cooldownMinutes: 2880,
    tags: ['essence', 'pénurie'],
  },

  // ─── SOCIAL ───
  {
    id: 'festival_patate',
    title: 'Festival de la patate et foire agricole',
    category: 'social',
    severity: 'mineur',
    locationName: 'Parc municipal de Portneuf',
    coordinates: [120, 2, 400],
    description:
      'Rassemblement populaire, kiosques de producteurs locaux et afflux touristique important.',
    durationMinutes: 120,
    impacts: [
      'Stationnement interdit sur le pourtour du parc',
      'Présence accrue de patrouilleurs à pied',
      "Hausse de l'activité commerciale locale",
    ],
    globalModifiers: { trafficDensity: 1.3, economyMultiplier: 1.15 },
    baseProbability: 0.05,
    conditions: {
      seasons: ['ete', 'automne'],
      hourRange: [10, 22],
      exclusiveCategory: true,
    },
    cooldownMinutes: 240,
    villageIds: ['portneuf'],
    tags: ['festival', 'social'],
  },
  {
    id: 'hockey_game',
    title: 'Match des Canadiens — Diffusion géante',
    category: 'social',
    severity: 'mineur',
    locationName: 'Aréna de Saint-Raymond',
    coordinates: [-500, 2, -300],
    description:
      'Grande finale télévisée. Bars et restaurants bondés. Circulation dense après le match.',
    durationMinutes: 180,
    impacts: [
      'Attroupements dans les bars',
      'Circulation dense à la sortie',
      'Consommation d\'alcool en hausse',
    ],
    globalModifiers: {
      trafficDensity: 1.4,
      policeAggressiveness: 1.2,
      economyMultiplier: 1.2,
    },
    baseProbability: 0.03,
    conditions: {
      hourRange: [18, 23],
      exclusiveCategory: true,
    },
    cooldownMinutes: 720,
    villageIds: ['saint_raymond'],
    tags: ['sport', 'hockey'],
  },
  {
    id: 'fair_agricole',
    title: 'Expo agricole de Deschambault',
    category: 'social',
    severity: 'mineur',
    locationName: 'Deschambault-Grondines',
    coordinates: [400, 2, -100],
    description:
      'Exposition agricole régionale. Animaux, kiosques, démonstrations.',
    durationMinutes: 240,
    impacts: [
      'Circulation ralentie',
      'Affluence familiale',
      'Stationnement périphérique obligatoire',
    ],
    globalModifiers: { trafficDensity: 1.2, economyMultiplier: 1.1 },
    baseProbability: 0.02,
    conditions: {
      seasons: ['ete'],
      hourRange: [9, 18],
      exclusiveCategory: true,
    },
    cooldownMinutes: 1440,
    villageIds: ['deschambault_grondines'],
    tags: ['agriculture', 'expo'],
  },

  // ─── RARE / SPÉCIAL ───
  {
    id: 'celebrity_visit',
    title: 'Visite d\'une personnalité publique',
    category: 'social',
    severity: 'mineur',
    locationName: 'Centre-ville de Portneuf',
    coordinates: [100, 2, 50],
    description:
      'Une personnalité médiatique en visite officielle. Foule et médias sur place.',
    durationMinutes: 60,
    impacts: [
      'Foules et médias',
      'Sécurité renforcée',
      'Circulation perturbée au centre-ville',
    ],
    globalModifiers: {
      trafficDensity: 1.5,
      policeAggressiveness: 1.4,
    },
    baseProbability: 0.005,
    conditions: {
      hourRange: [10, 16],
      exclusiveCategory: true,
    },
    cooldownMinutes: 2880,
    tags: ['célébrité', 'média'],
  },
  {
    id: 'prison_transfer',
    title: 'Transfert de détenus vers le pénitencier',
    category: 'urgence',
    severity: 'mineur',
    locationName: 'Route 138 — convoi SQ',
    coordinates: [0, 2, 0],
    description:
      'Convoi exceptionnel de la SQ pour transfert de détenus dangereux.',
    durationMinutes: 45,
    impacts: [
      'Route fermée par intermittence',
      'Consignes strictes de circulation',
      'Aucun arrêt autorisé',
    ],
    globalModifiers: { policeAggressiveness: 1.6 },
    baseProbability: 0.01,
    conditions: {
      hourRange: [22, 6],
      exclusiveCategory: true,
    },
    cooldownMinutes: 720,
    tags: ['sq', 'transfert'],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
//  5. SERVICE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════

export type EventsListener = (event: DynamicQuebecEvent) => void;

interface EventSubscribers {
  triggered: Set<EventsListener>;
  resolved: Set<EventsListener>;
  expired: Set<EventsListener>;
  bannerChanged: Set<(banner: ReturnType<DynamicEventsService['banner']>) => void>;
}

export class DynamicEventsService {
  private static instance: DynamicEventsService;

  private activeEvents: DynamicQuebecEvent[] = [];
  private config: DynamicEventsConfig;
  private rng: () => number;

  // 🆕 Cooldowns
  private templateCooldowns = new Map<string, number>();   // templateId → timestamp fin cooldown
  private lastGlobalTriggerAt = 0;

  // 🆕 Scheduler
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // 🆕 Chaînes en attente
  private pendingChains: Array<{
    templateId: string;
    triggerAt: number;
    probability: number;
    sourceEventId: string;
  }> = [];

  // 🆕 Subscribers
  private subscribers: EventSubscribers = {
    triggered: new Set(),
    resolved: new Set(),
    expired: new Set(),
    bannerChanged: new Set(),
  };

  // 🆕 Cache de modifiers
  private modifierCache: GlobalModifiers | null = null;
  private modifierCacheInvalidated = true;

  // 🆕 Contexte externe (weather/zone/time)
  private contextProvider: (() => {
    hour?: number;
    season?: string;
    weather?: string;
    playersCount?: number;
    zoneTypes?: string[];
  }) | null = null;

  // 🆕 Stats
  private stats = {
    triggeredTotal: 0,
    resolvedTotal: 0,
    expiredTotal: 0,
    clearedTotal: 0,
    chainTriggers: 0,
    schedulerTicks: 0,
    schedulerTriggers: 0,
    cooldownRejections: 0,
    conditionRejections: 0,
    byCategory: {
      meteo: 0,
      infrastructures: 0,
      urgence: 0,
      economie: 0,
      social: 0,
    } as Record<EventCategory, number>,
    bySeverity: {
      mineur: 0,
      majeur: 0,
      catastrophe: 0,
    } as Record<EventSeverity, number>,
    averageDurationMinutes: 0,
    _durationSum: 0,
    _durationCount: 0,
  };

  // 🆕 Dernier banner connu (pour diff)
  private lastBannerTitle: string | null = null;

  private constructor(config: Partial<DynamicEventsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = mulberry32(this.config.seed || Date.now());

    if (this.config.schedulerEnabled) this.startScheduler();
    if (this.config.cleanupIntervalMs > 0) this.startCleanup();
  }

  public static getInstance(config?: Partial<DynamicEventsConfig>): DynamicEventsService {
    if (!DynamicEventsService.instance) {
      DynamicEventsService.instance = new DynamicEventsService(config);
    }
    return DynamicEventsService.instance;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v1 COMPAT
  // ═════════════════════════════════════════════════════════════════════════

  public getActiveEvents(): DynamicQuebecEvent[] {
    return this.activeEvents.filter((e) => e.active);
  }

  public getAll(): DynamicQuebecEvent[] {
    return this.activeEvents.slice();
  }

  /**
   * Déclenche un événement personnalisé.
   * v1 compat — accepte aussi la forme "template partiel".
   */
  public triggerEvent(
    event: Omit<DynamicQuebecEvent, 'id' | 'startedAt' | 'active'>,
  ): DynamicQuebecEvent {
    return this.triggerEventInternal(event, undefined, 'manual');
  }

  public triggerBlizzard(): DynamicQuebecEvent {
    return this.triggerFromTemplate('blizzard_a40', { force: true });
  }

  public triggerOutage(): DynamicQuebecEvent {
    return this.triggerFromTemplate('outage_hydro', { force: true });
  }

  public triggerPoliceCheckPoint(): DynamicQuebecEvent {
    return this.triggerFromTemplate('police_checkpoint', { force: true });
  }

  public triggerFestival(): DynamicQuebecEvent {
    return this.triggerFromTemplate('festival_patate', { force: true });
  }

  public triggerRandomEvent(): DynamicQuebecEvent {
    const eligible = EVENT_CATALOG.filter(
      (t) => !this.isTemplateOnCooldown(t.id) && this.checkConditions(t),
    );
    if (eligible.length === 0) {
      // Fallback : prend n'importe quel template
      const t = EVENT_CATALOG[Math.floor(this.rng() * EVENT_CATALOG.length)]!;
      return this.triggerFromTemplate(t.id, { force: true });
    }
    const t = eligible[Math.floor(this.rng() * eligible.length)]!;
    return this.triggerFromTemplate(t.id, { force: true });
  }

  public resolveEvent(eventId: string, endReason: DynamicQuebecEvent['endReason'] = 'resolved'): boolean {
    const e = this.activeEvents.find((x) => x.id === eventId);
    if (!e || !e.active) return false;

    e.active = false;
    e.resolvedAt = Date.now();
    e.endReason = endReason;

    this.stats.resolvedTotal++;
    this.setTemplateCooldown(e.templateId, e);

    this.persistEventLog(e, endReason === 'expired' ? 'EXPIRED' : 'RESOLVED');
    this.emitResolved(e);
    this.invalidateModifierCache();

    if (this.config.verbose) {
      console.log(`✅ [ThirdEye] Résolu : ${e.title} (${endReason})`);
    }

    return true;
  }

  public resolveCategory(cat: EventCategory): number {
    let count = 0;
    for (const e of this.activeEvents) {
      if (e.category === cat && e.active) {
        e.active = false;
        e.resolvedAt = Date.now();
        e.endReason = 'resolved';
        count++;
        this.stats.resolvedTotal++;
        this.setTemplateCooldown(e.templateId, e);
        this.persistEventLog(e, 'RESOLVED_CATEGORY');
        this.emitResolved(e);
      }
    }
    if (count > 0) this.invalidateModifierCache();
    return count;
  }

  public clearAll(): void {
    for (const e of this.activeEvents) {
      if (e.active) {
        e.active = false;
        e.resolvedAt = Date.now();
        e.endReason = 'cleared';
        this.stats.clearedTotal++;
        this.setTemplateCooldown(e.templateId, e);
        this.persistEventLog(e, 'CLEARED');
        this.emitResolved(e);
      }
    }
    this.invalidateModifierCache();
  }

  /**
   * Tick principal — expire les events échus + traite les chaînes.
   */
  public tick(): DynamicQuebecEvent[] {
    const now = Date.now();

    // 1) Expiration
    for (const e of this.activeEvents) {
      if (!e.active) continue;
      if (e.expectedEndAt && now >= e.expectedEndAt) {
        e.active = false;
        e.resolvedAt = now;
        e.endReason = 'expired';
        this.stats.expiredTotal++;
        this.setTemplateCooldown(e.templateId, e);
        this.persistEventLog(e, 'EXPIRED');
        this.emitExpired(e);
      }
    }

    // 2) Chaînes en attente
    const readyChains = this.pendingChains.filter((c) => now >= c.triggerAt);
    if (readyChains.length > 0) {
      this.pendingChains = this.pendingChains.filter((c) => now < c.triggerAt);
      for (const chain of readyChains) {
        if (this.rng() <= chain.probability) {
          this.stats.chainTriggers++;
          this.triggerFromTemplate(chain.templateId, {
            force: true,
            sourceEventId: chain.sourceEventId,
            endReasonChain: true,
          });
        }
      }
    }

    // 3) Invalide cache si un event a expiré
    if (readyChains.length > 0) this.invalidateModifierCache();

    // 4) Notifie banner si changé
    this.checkBannerChange();

    return this.getActiveEvents();
  }

  /**
   * Banner HUD prioritaire.
   */
  public banner(): { title: string; severity: EventSeverity; locationName: string } | null {
    const live = this.getActiveEvents();
    if (!live.length) return null;

    // Tri par priorité (calculée ou severity)
    const sorted = [...live].sort((a, b) => {
      const pa = a.bannerPriority ?? severityRank(a.severity) * 30;
      const pb = b.bannerPriority ?? severityRank(b.severity) * 30;
      return pb - pa;
    });

    const top = sorted[0]!;
    return {
      title: top.title,
      severity: top.severity,
      locationName: top.locationName,
    };
  }

  /**
   * v1 compat — vérifie si un modifier booléen est actif.
   */
  public hasGlobalModifier(modifierKey: keyof GlobalModifiers): boolean {
    const modifiers = this.getComputedModifiers();
    const v = modifiers[modifierKey];
    return v === true;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v3 — EXTENSIONS
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Récupère un template par ID. */
  public getTemplate(id: string): EventTemplate | null {
    return EVENT_CATALOG.find((t) => t.id === id) ?? null;
  }

  /** 🆕 Liste tous les templates du catalogue. */
  public listTemplates(): readonly EventTemplate[] {
    return EVENT_CATALOG;
  }

  /** 🆕 Déclenche un événement depuis un template. */
  public triggerFromTemplate(
    templateId: string,
    opts?: {
      force?: boolean;
      sourceEventId?: string;
      endReasonChain?: boolean;
      overrides?: Partial<Omit<DynamicQuebecEvent, 'id' | 'startedAt' | 'active'>>;
    },
  ): DynamicQuebecEvent | null {
    const template = this.getTemplate(templateId);
    if (!template) {
      if (this.config.verbose) {
        console.warn(`[ThirdEye] Template introuvable : ${templateId}`);
      }
      return null;
    }

    // Cooldowns
    if (!opts?.force) {
      if (this.isTemplateOnCooldown(templateId)) {
        this.stats.cooldownRejections++;
        return null;
      }
      if (Date.now() - this.lastGlobalTriggerAt < this.config.globalTriggerCooldownMs) {
        this.stats.cooldownRejections++;
        return null;
      }
      if (!this.checkConditions(template)) {
        this.stats.conditionRejections++;
        return null;
      }
    }

    const now = Date.now();
    const event: DynamicQuebecEvent = {
      id: genId('evt'),
      title: opts?.overrides?.title ?? template.title,
      category: opts?.overrides?.category ?? template.category,
      severity: opts?.overrides?.severity ?? template.severity,
      locationName: opts?.overrides?.locationName ?? template.locationName,
      coordinates: opts?.overrides?.coordinates ?? template.coordinates,
      description: opts?.overrides?.description ?? template.description,
      active: true,
      startedAt: now,
      durationMinutes: opts?.overrides?.durationMinutes ?? template.durationMinutes,
      impacts: opts?.overrides?.impacts ?? [...template.impacts],
      globalModifiers: opts?.overrides?.globalModifiers ?? { ...template.globalModifiers },
      templateId,
      expectedEndAt: now + (opts?.overrides?.durationMinutes ?? template.durationMinutes) * 60_000,
      villageIds: opts?.overrides?.villageIds ?? template.villageIds,
      tags: opts?.overrides?.tags ?? template.tags,
      bannerPriority: this.computeBannerPriority(
        opts?.overrides?.severity ?? template.severity,
        opts?.overrides?.globalModifiers ?? template.globalModifiers,
      ),
      chainedEventIds: [],
    };

    // Si provient d'une chaîne, ajoute à la source
    if (opts?.sourceEventId) {
      const source = this.activeEvents.find((e) => e.id === opts.sourceEventId);
      if (source) {
        source.chainedEventIds = source.chainedEventIds ?? [];
        source.chainedEventIds.push(event.id);
      }
    }

    // Ajoute en tête
    this.activeEvents.unshift(event);
    this.trimEvents();

    // Stats
    this.stats.triggeredTotal++;
    this.stats.byCategory[event.category]++;
    this.stats.bySeverity[event.severity]++;
    this.stats._durationSum += event.durationMinutes;
    this.stats._durationCount++;
    this.stats.averageDurationMinutes = Math.round(
      this.stats._durationSum / Math.max(1, this.stats._durationCount),
    );
    this.lastGlobalTriggerAt = now;

    // Planifie les chaînes
    if (template.chains) {
      for (const chain of template.chains) {
        this.pendingChains.push({
          templateId: chain.templateId,
          triggerAt: now + chain.delaySeconds * 1000,
          probability: chain.probability,
          sourceEventId: event.id,
        });
      }
    }

    // Invalide cache
    this.invalidateModifierCache();

    // Persistance + notifs
    this.persistEventLog(event, 'TRIGGERED');
    this.emitTriggered(event);
    this.checkBannerChange();

    if (this.config.verbose) {
      const chain = opts?.endReasonChain ? '🔗 ' : '';
      console.log(`${chain}⚡ [ThirdEye] ${event.title} (${event.severity})`);
    }

    return event;
  }

  /**
   * 🆕 Renvoie les modifiers globaux calculés (agrégation de tous les events actifs).
   */
  public getComputedModifiers(): GlobalModifiers {
    if (!this.modifierCacheInvalidated && this.modifierCache) {
      return { ...this.modifierCache };
    }

    const result: GlobalModifiers = {};
    const live = this.getActiveEvents();

    for (const e of live) {
      const m = e.globalModifiers;
      if (!m) continue;

      if (m.speedLimitMultiplier !== undefined) {
        result.speedLimitMultiplier = Math.min(
          result.speedLimitMultiplier ?? 1,
          m.speedLimitMultiplier,
        );
      }
      if (m.policeAggressiveness !== undefined) {
        result.policeAggressiveness = Math.max(
          result.policeAggressiveness ?? 1,
          m.policeAggressiveness,
        );
      }
      if (m.trafficDensity !== undefined) {
        result.trafficDensity = Math.max(
          result.trafficDensity ?? 1,
          m.trafficDensity,
        );
      }
      if (m.economyMultiplier !== undefined) {
        result.economyMultiplier = (result.economyMultiplier ?? 1) * m.economyMultiplier;
      }
      if (m.visibilityMultiplier !== undefined) {
        result.visibilityMultiplier = Math.min(
          result.visibilityMultiplier ?? 1,
          m.visibilityMultiplier,
        );
      }
      if (m.accidentRisk !== undefined) {
        result.accidentRisk = Math.max(result.accidentRisk ?? 1, m.accidentRisk);
      }
      if (m.emsResponseMultiplier !== undefined) {
        result.emsResponseMultiplier = Math.min(
          result.emsResponseMultiplier ?? 1,
          m.emsResponseMultiplier,
        );
      }
      if (m.powerOutage === true) {
        result.powerOutage = true;
      }
    }

    this.modifierCache = result;
    this.modifierCacheInvalidated = false;
    return { ...result };
  }

  /**
   * 🆕 Définit le fournisseur de contexte externe (météo, heure, saison, joueurs).
   */
  public setContextProvider(provider: () => {
    hour?: number;
    season?: string;
    weather?: string;
    playersCount?: number;
    zoneTypes?: string[];
  }): void {
    this.contextProvider = provider;
  }

  /**
   * 🆕 Souscription aux événements.
   */
  public onEvent(type: 'triggered', cb: EventsListener): () => void;
  public onEvent(type: 'resolved', cb: EventsListener): () => void;
  public onEvent(type: 'expired', cb: EventsListener): () => void;
  public onEvent(type: 'bannerChanged', cb: (banner: ReturnType<DynamicEventsService['banner']>) => void): () => void;
  public onEvent(type: string, cb: any): () => void {
    const set = (this.subscribers as any)[type];
    if (!set) return () => {};
    set.add(cb);
    return () => set.delete(cb);
  }

  /**
   * 🆕 Config dynamique.
   */
  public updateConfig(patch: Partial<DynamicEventsConfig>): void {
    this.config = { ...this.config, ...patch };

    // Redémarre scheduler si toggle
    if (patch.schedulerEnabled === false) this.stopScheduler();
    else if (patch.schedulerEnabled === true && !this.schedulerTimer) this.startScheduler();

    if (patch.cleanupIntervalMs !== undefined) {
      this.stopCleanup();
      if (patch.cleanupIntervalMs > 0) this.startCleanup();
    }
  }

  /**
   * 🆕 Stats.
   */
  public getStats() {
    const { _durationSum, _durationCount, ...rest } = this.stats;
    void _durationSum;
    void _durationCount;
    return {
      ...rest,
      activeCount: this.getActiveEvents().length,
      totalCount: this.activeEvents.length,
      pendingChains: this.pendingChains.length,
      templatesOnCooldown: this.templateCooldowns.size,
      catalogSize: EVENT_CATALOG.length,
      config: this.config,
    };
  }

  /**
   * 🆕 Health check.
   */
  public health(): { ok: boolean; reason?: string } {
    if (this.activeEvents.length >= this.config.maxEvents) {
      return { ok: false, reason: 'event_buffer_full' };
    }
    if (this.stats.triggeredTotal > 10_000 && this.stats.resolvedTotal === 0) {
      return { ok: false, reason: 'trigger_storm_no_resolution' };
    }
    return { ok: true };
  }

  /**
   * 🆕 Dispose.
   */
  public dispose(): void {
    this.stopScheduler();
    this.stopCleanup();
    this.activeEvents = [];
    this.pendingChains = [];
    this.templateCooldowns.clear();
    this.subscribers.triggered.clear();
    this.subscribers.resolved.clear();
    this.subscribers.expired.clear();
    this.subscribers.bannerChanged.clear();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  INTERNALS
  // ═════════════════════════════════════════════════════════════════════════

  private triggerEventInternal(
    partial: Omit<DynamicQuebecEvent, 'id' | 'startedAt' | 'active'>,
    templateId: string | undefined,
    source: string,
  ): DynamicQuebecEvent {
    const now = Date.now();
    const event: DynamicQuebecEvent = {
      ...partial,
      id: genId('evt'),
      startedAt: now,
      active: true,
      templateId,
      expectedEndAt: now + partial.durationMinutes * 60_000,
      bannerPriority: this.computeBannerPriority(partial.severity, partial.globalModifiers),
    };

    this.activeEvents.unshift(event);
    this.trimEvents();

    this.stats.triggeredTotal++;
    this.stats.byCategory[event.category]++;
    this.stats.bySeverity[event.severity]++;

    this.invalidateModifierCache();
    this.persistEventLog(event, `TRIGGERED_${source.toUpperCase()}`);
    this.emitTriggered(event);
    this.checkBannerChange();

    return event;
  }

  private trimEvents(): void {
    if (this.activeEvents.length > this.config.maxEvents) {
      // Supprime les plus vieux events résolus en priorité
      const resolved = this.activeEvents.filter((e) => !e.active);
      const active = this.activeEvents.filter((e) => e.active);
      const excess = this.activeEvents.length - this.config.maxEvents;

      resolved.sort((a, b) => (a.resolvedAt ?? a.startedAt) - (b.resolvedAt ?? b.startedAt));
      const removed = resolved.splice(0, excess);
      void removed;

      this.activeEvents = [...active, ...resolved];
      // Retri chronologique inverse
      this.activeEvents.sort((a, b) => b.startedAt - a.startedAt);
    }
  }

  private computeBannerPriority(
    severity: EventSeverity,
    modifiers?: GlobalModifiers,
  ): number {
    let priority = severityRank(severity) * 30;
    if (modifiers?.powerOutage) priority += 20;
    if (modifiers?.speedLimitMultiplier && modifiers.speedLimitMultiplier < 0.5) priority += 10;
    if (modifiers?.accidentRisk && modifiers.accidentRisk >= 1.8) priority += 15;
    return clamp(priority, 0, 100);
  }

  private isTemplateOnCooldown(templateId?: string): boolean {
    if (!templateId) return false;
    const until = this.templateCooldowns.get(templateId);
    if (!until) return false;
    if (Date.now() >= until) {
      this.templateCooldowns.delete(templateId);
      return false;
    }
    return true;
  }

  private setTemplateCooldown(templateId: string | undefined, event: DynamicQuebecEvent): void {
    if (!templateId) return;
    const template = this.getTemplate(templateId);
    const cooldown = template?.cooldownMinutes ?? 60;
    this.templateCooldowns.set(templateId, Date.now() + cooldown * 60_000);
  }

  private checkConditions(template: EventTemplate): boolean {
    const c = template.conditions;
    if (!c) return true;

    const ctx = this.contextProvider?.() ?? {};

    // Heure
    if (c.hourRange && ctx.hour !== undefined) {
      const [start, end] = c.hourRange;
      const h = ctx.hour;
      const inRange = start <= end ? h >= start && h < end : h >= start || h < end;
      if (!inRange) return false;
    }

    // Saison
    if (c.seasons && ctx.season) {
      if (!c.seasons.includes(ctx.season as any)) return false;
    }

    // Météo
    if (c.weather && ctx.weather) {
      if (!c.weather.includes(ctx.weather)) return false;
    }

    // Joueurs
    if (c.minPlayers !== undefined && ctx.playersCount !== undefined) {
      if (ctx.playersCount < c.minPlayers) return false;
    }
    if (c.maxPlayers !== undefined && ctx.playersCount !== undefined) {
      if (ctx.playersCount > c.maxPlayers) return false;
    }

    // Zones
    if (c.zoneTypes && ctx.zoneTypes && ctx.zoneTypes.length > 0) {
      const hasZone = c.zoneTypes.some((z) => ctx.zoneTypes!.includes(z));
      if (!hasZone) return false;
    }

    // Exclusivité catégorie
    if (c.exclusiveCategory) {
      const active = this.getActiveEvents().some((e) => e.category === template.category);
      if (active) return false;
    }

    // Exclusivité self
    if (c.exclusiveSelf) {
      const active = this.getActiveEvents().some((e) => e.templateId === template.id);
      if (active) return false;
    }

    return true;
  }

  private invalidateModifierCache(): void {
    this.modifierCacheInvalidated = true;
    this.modifierCache = null;
  }

  private checkBannerChange(): void {
    const b = this.banner();
    const title = b?.title ?? null;
    if (title !== this.lastBannerTitle) {
      this.lastBannerTitle = title;
      for (const cb of this.subscribers.bannerChanged) {
        try { cb(b); } catch { /* noop */ }
      }
    }
  }

  // ─── EMITTERS ───
  private emitTriggered(e: DynamicQuebecEvent): void {
    for (const cb of this.subscribers.triggered) {
      try { cb(e); } catch (err) { console.error('[ThirdEye] listener err:', err); }
    }
  }

  private emitResolved(e: DynamicQuebecEvent): void {
    for (const cb of this.subscribers.resolved) {
      try { cb(e); } catch (err) { console.error('[ThirdEye] listener err:', err); }
    }
  }

  private emitExpired(e: DynamicQuebecEvent): void {
    for (const cb of this.subscribers.expired) {
      try { cb(e); } catch (err) { console.error('[ThirdEye] listener err:', err); }
    }
  }

  // ─── SCHEDULER ───
  private startScheduler(): void {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setInterval(() => {
      this.stats.schedulerTicks++;
      this.runScheduler();
    }, this.config.schedulerIntervalMs);
    if (this.schedulerTimer.unref) this.schedulerTimer.unref();
  }

  private stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private runScheduler(): void {
    // Cooldown global
    if (Date.now() - this.lastGlobalTriggerAt < this.config.globalTriggerCooldownMs) {
      return;
    }

    // Sélectionne les templates éligibles
    const eligible = EVENT_CATALOG.filter((t) => {
      if (this.isTemplateOnCooldown(t.id)) return false;
      if (!this.checkConditions(t)) return false;
      return true;
    });

    if (eligible.length === 0) return;

    // Roll indépendant par template (chaque template peut trigger selon sa probabilité)
    for (const t of eligible) {
      const prob = t.baseProbability ?? 0;
      if (this.rng() < prob) {
        this.stats.schedulerTriggers++;
        this.triggerFromTemplate(t.id);
        return; // un seul event par tick pour éviter la spam
      }
    }
  }

  // ─── CLEANUP ───
  private startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldEvents();
    }, this.config.cleanupIntervalMs);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private cleanupOldEvents(): void {
    const cutoff = Date.now() - this.config.resolvedRetentionMs;
    const before = this.activeEvents.length;
    this.activeEvents = this.activeEvents.filter((e) => {
      if (e.active) return true;
      return (e.resolvedAt ?? e.startedAt) >= cutoff;
    });
    const removed = before - this.activeEvents.length;
    if (removed > 0 && this.config.verbose) {
      console.log(`🧹 [ThirdEye] ${removed} event(s) nettoyé(s)`);
    }
  }

  // ─── PERSISTENCE (Drizzle) ───
  private async persistEventLog(event: DynamicQuebecEvent, action: string): Promise<void> {
    if (!this.config.persistenceEnabled) return;
    try {
      // Exemple (à activer si db + schema importés) :
      // await db.insert(gameLogs).values({
      //   id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      //   event: `THIRD_EYE_${action}`,
      //   details: `${event.title} [${event.severity}] à ${event.locationName}`,
      //   metadata: {
      //     eventId: event.id,
      //     templateId: event.templateId,
      //     category: event.category,
      //     severity: event.severity,
      //   },
      // });
    } catch {
      // Silencieux
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SINGLETON EXPORTÉ (v1 compat)
// ═════════════════════════════════════════════════════════════════════════════

export const dynamicEventsService = DynamicEventsService.getInstance();