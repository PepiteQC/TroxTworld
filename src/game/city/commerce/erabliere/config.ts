/**
 * ═══════════════════════════════════════════════════════════════════
 * 🍁 CONFIGURATION — ÉRABLIÈRES DU COMTÉ DE PORTNEUF
 * ═══════════════════════════════════════════════════════════════════
 */

export const SUGAR_CONFIG = {
  // ─── Production ───
  SAP_PER_SYRUP: 4,
  TAP_REFILL_SECONDS: 14,
  EVAP_BOIL_SECONDS: 6,
  MAX_SAP_PER_TAP: 1,

  // ─── Qualités ───
  SYRUP_QUALITIES: {
    GOLDEN: { id: "sirop_dore", name: "Sirop doré", chance: 0.6, value: 1.0 },
    AMBER:  { id: "sirop_ambre", name: "Sirop ambré", chance: 0.3, value: 1.2 },
    DARK:   { id: "sirop_fonce", name: "Sirop foncé", chance: 0.1, value: 1.5 },
  },

  // ─── Saisons ───
  SEASON_MULTIPLIERS: {
    printemps: 1.0, ete: 0.3, automne: 0.5, hiver: 0.8,
  } as Record<string, number>,

  WEATHER_EFFECTS: {
    rain: 1.2, snow: 0.9, clear: 1.0, storm: 0.7,
    poudrerie: 0.6, polaire: 0.5, verglas: 0.4,
    ensoleille: 1.1, nuageux: 0.95, brouillard: 0.85,
  } as Record<string, number>,

  // ─── Performance ───
  LOD_DISTANCE: { HIGH: 25, MEDIUM: 50, LOW: 100 },
  TICK_RATE_MS: 1000,

  // ─── Audio ───
  SOUNDS: {
    tap_collect: "sfx/sap_collect",
    evap_boil: "sfx/evaporator_loop",
    syrup_ready: "sfx/syrup_complete",
  },

  // ─── Procédural ───
  PROCEDURAL: {
    TRUNK_RADIUS_MIN: 0.18, TRUNK_RADIUS_MAX: 0.28,
    TRUNK_HEIGHT_MIN: 4.2,  TRUNK_HEIGHT_MAX: 5.2,
    CANOPY_SIZE_MIN: 1.8,   CANOPY_SIZE_MAX: 2.5,
    BRANCH_ANGLE_VARIATION: 0.15,
  },

  // ─── Particules ───
  PARTICLES: {
    STEAM_COUNT: 24,
    STEAM_SIZE_MIN: 0.15, STEAM_SIZE_MAX: 0.35,
    STEAM_RISE_SPEED: 0.8, STEAM_LIFETIME: 3.0, STEAM_SPREAD: 0.6,
  },

  LEAVES: {
    COUNT_PER_TREE: 8, FALL_SPEED: 0.3,
    SWAY_AMPLITUDE: 0.4, SWAY_FREQUENCY: 1.2, LIFETIME: 6.0,
  },

  SNOW: {
    LAYER_THICKNESS: 0.08, COVERAGE_CHANCE: 0.7,
    MELT_TEMP_CELSIUS: 2,
  },

  // ─── Audio ───
  AUDIO: {
    EVAP_BOIL_VOLUME: 0.6, EVAP_BOIL_PITCH: 1.0,
    MAX_DISTANCE: 25, ROLLOFF_FACTOR: 1.2,
  },

  // ─── 🆕 Économie ───
  ECONOMY: {
    /** Prix de base du sirop ($/L) */
    BASE_SYRUP_PRICE_PER_LITER: 22,
    /** Coût d'entretien quotidien par entaille ($/jour) */
    MAINTENANCE_PER_TAP_PER_DAY: 0.5,
    /** Salaire horaire minimum aide-évaporateur */
    MIN_WAGE_HELPER: 16.5,
    /** Salaire horaire chauffeur */
    MIN_WAGE_DRIVER: 18.0,
    /** Salaire horaire guide (touristique) */
    MIN_WAGE_GUIDE: 17.25,
    /** Multiplicateur de vente en haute saison */
    HIGH_SEASON_MULT: 1.35,
    /** Multiplicateur de vente hors-saison */
    LOW_SEASON_MULT: 0.85,
  },

  // ─── 🆕 Job system ───
  JOBS: {
    /** Intervalle de paie (ms) */
    PAYROLL_INTERVAL_MS: 15 * 60 * 1000,
    /** XP gain par action */
    XP_PER_TAP: 2,
    XP_PER_SYRUP: 8,
    /** Nombre maximum d'employés par érablière */
    MAX_EMPLOYEES: 8,
    /** Cooldown entre deux shifts */
    SHIFT_COOLDOWN_MS: 30_000,
  },

  // ─── 🆕 Quêtes ───
  QUESTS: {
    MAX_ACTIVE: 5,
    DELIVERY_BASE_REWARD: 120,
    DELIVERY_BONUS_PER_KM: 8,
    CONTRACT_TIMEOUT_MS: 60 * 60 * 1000, // 1h
  },

  // ─── 🆕 Événements ───
  EVENTS: {
    /** Fenêtre d'ouverture publique */
    PUBLIC_OPEN_HOURS: [8, 18],
    /** Durée d'un événement (ms) */
    EVENT_DURATION_MS: 4 * 60 * 60 * 1000,
    /** Nombre maximum de visiteurs simultanés */
    MAX_VISITORS: 30,
    /** Prix d'entrée visiteurs ($) */
    VISITOR_FEE: 12,
    /** Revenu par visiteur ($) */
    REVENUE_PER_VISITOR: 25,
  },
} as const;

export const SUGAR_BUSHES = [
  { id: "erable_alban",     name: "Érablière du Trou-du-Diable",     village: "Saint-Alban",   worldX: -780, worldZ: -640, yaw: 0.35 },
  { id: "erable_casimir",   name: "Érablière de la Gorge",           village: "Saint-Casimir", worldX: -1040, worldZ: -420, yaw: -0.2 },
  { id: "erable_raymond",   name: "Érablière des Laurentides",       village: "Saint-Raymond", worldX: 820, worldZ: -780, yaw: 0.55 },
  { id: "erable_basile",    name: "Érablière de la rivière Portneuf",village: "Saint-Basile",  worldX: 280, worldZ: -440, yaw: 0.15 },
  { id: "erable_collines",  name: "Érablière des Collines",          village: "Saint-Alban",   worldX: -250, worldZ: -720, yaw: -0.4 },
] as const;

export const TAP_POSITIONS: Array<[number, number]> = [
  [-16, -8], [-10, -14], [-2, -18], [8, -16], [16, -10],
  [18, 0], [14, 10], [-18, 4], [-14, 12], [4, -22],
];

export const EVAP_OFFSET: [number, number] = [0, 8.2];
export const WOODPILE_OFFSET: [number, number] = [-6.2, 6.4];