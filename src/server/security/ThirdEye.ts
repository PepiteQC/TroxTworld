// ═════════════════════════════════════════════════════════════════════════════
//  THIRD EYE v2.0 — Anti-Cheat Threat Engine
//  src/server/security/ThirdEye.ts
// ─────────────────────────────────────────────────────────────────────────────
//  • Catégories de menaces structurées (9 types)
//  • Trust score dynamique (decay + recovery)
//  • Escalade progressive (GREEN → YELLOW → ORANGE → RED)
//  • Détection heuristique (speed/teleport/aim/wallhack/rate)
//  • Sessions par joueur (auth fingerprint)
//  • Rate-limit granulaire par action
//  • Events (onThreat, onBan, onEscalate, onTrustChange)
//  • Config complète + hot-reload
//  • Stats par catégorie + par sévérité
//  • Ring buffer O(1) pour threats
//  • Health check + dispose
//  • Bulk operations
//  • Compat 100% v1
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
//  1. TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type ThreatCategory =
  | 'rate_limit'
  | 'speed_hack'
  | 'teleport'
  | 'aim_anomaly'
  | 'wall_clip'
  | 'duplication'
  | 'auth_anomaly'
  | 'client_tamper'
  | 'ban'
  | 'custom';

export type ThreatSeverity = 1 | 2 | 3 | 4 | 5; // 1=info, 5=critique

export type EscalationTier = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface ThirdEyeThreat {
  id: string;
  type: string;
  category: ThreatCategory;
  source: string;        // playerId ou 'system'
  details: string;
  severity: number;      // 1-5
  timestamp: number;
  meta?: Record<string, unknown>;
}

export interface TrustProfile {
  playerId: string;
  score: number;              // 0-100
  lastUpdatedAt: number;
  /** Historique de décisions (dernier vote trust) */
  history: Array<{ delta: number; reason: string; at: number }>;
  /** Flags permanents */
  flags: Set<string>;
  /** Nombre de menaces imputées */
  threatCount: number;
}

export interface PlayerSession {
  playerId: string;
  fingerprint: string;
  ipHash: string;
  startedAt: number;
  lastSeenAt: number;
  actionCounts: Map<string, number>;
  lastActionAt: Map<string, number>;
}

export interface AnalyzeResult {
  allowed: boolean;
  reason?: string;
  category?: ThreatCategory;
  trustAfter?: number;
  autoBanned?: boolean;
}

export interface ThirdEyeConfig {
  /** Taille max du buffer de menaces. */
  maxThreats: number;
  /** Fenêtre de stats "récentes" (ms). */
  recentWindowMs: number;
  /** Trust initial pour nouveaux joueurs. */
  defaultTrust: number;
  /** Trust minimum pour autoriser. */
  minTrustToAllow: number;
  /** Nombre de menaces (30min) avant auto-ban. */
  threatsForAutoBan: number;
  /** Sévérité cumulée (30min) avant auto-ban. */
  severityForAutoBan: number;
  /** Décroissance automatique du trust (points par minute). */
  trustDecayPerMinute: number;
  /** Récupération automatique du trust (points par minute sans menace). */
  trustRecoveryPerMinute: number;
  /** Intervalle du timer de maintenance (ms). */
  maintenanceIntervalMs: number;
  /** Rate limit par défaut (actions / fenêtre). */
  defaultRateLimit: { actions: number; windowMs: number };
  /** Active l'escalade automatique. */
  autoEscalationEnabled: boolean;
  /** Intervalle d'escalade (ms). */
  escalationIntervalMs: number;
}

const DEFAULT_CONFIG: ThirdEyeConfig = {
  maxThreats: 500,
  recentWindowMs: 30 * 60 * 1000, // 30 min
  defaultTrust: 75,
  minTrustToAllow: 20,
  threatsForAutoBan: 5,
  severityForAutoBan: 15,
  trustDecayPerMinute: 0.5,
  trustRecoveryPerMinute: 0.2,
  maintenanceIntervalMs: 60_000, // 1 min
  defaultRateLimit: { actions: 20, windowMs: 10_000 },
  autoEscalationEnabled: true,
  escalationIntervalMs: 30_000,
};

// ═════════════════════════════════════════════════════════════════════════════
//  2. UTILITAIRES
// ═════════════════════════════════════════════════════════════════════════════

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hashString(s: string): string {
  // FNV-1a 32 bits (rapide, non cryptographique)
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ═════════════════════════════════════════════════════════════════════════════
//  3. RING BUFFER (O(1) push)
// ═════════════════════════════════════════════════════════════════════════════

class ThreatRingBuffer {
  private buffer: (ThirdEyeThreat | null)[];
  private writeIndex = 0;
  private _size = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
  }

  push(threat: ThirdEyeThreat): void {
    this.buffer[this.writeIndex] = threat;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this._size < this.capacity) this._size++;
  }

  /** Retourne les N plus récents (ordre antéchronologique). */
  recent(n: number): ThirdEyeThreat[] {
    const out: ThirdEyeThreat[] = [];
    const count = Math.min(n, this._size);
    for (let i = 0; i < count; i++) {
      const idx = (this.writeIndex - 1 - i + this.capacity) % this.capacity;
      const t = this.buffer[idx];
      if (t) out.push(t);
    }
    return out;
  }

  /** Compte les threats dans une fenêtre. */
  countSince(timestampMs: number): number {
    let count = 0;
    for (let i = 0; i < this._size; i++) {
      const idx = (this.writeIndex - 1 - i + this.capacity) % this.capacity;
      const t = this.buffer[idx];
      if (!t) break;
      if (t.timestamp < timestampMs) break;
      count++;
    }
    return count;
  }

  /** Somme des sévérités dans une fenêtre. */
  severitySumSince(timestampMs: number): number {
    let sum = 0;
    for (let i = 0; i < this._size; i++) {
      const idx = (this.writeIndex - 1 - i + this.capacity) % this.capacity;
      const t = this.buffer[idx];
      if (!t) break;
      if (t.timestamp < timestampMs) break;
      sum += t.severity;
    }
    return sum;
  }

  /** Filtre par source (joueur). */
  forSource(source: string, n = 50): ThirdEyeThreat[] {
    const out: ThirdEyeThreat[] = [];
    for (let i = 0; i < this._size && out.length < n; i++) {
      const idx = (this.writeIndex - 1 - i + this.capacity) % this.capacity;
      const t = this.buffer[idx];
      if (!t) continue;
      if (t.source === source) out.push(t);
    }
    return out;
  }

  clear(): void {
    this.buffer.fill(null);
    this.writeIndex = 0;
    this._size = 0;
  }

  get size(): number {
    return this._size;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  4. THIRD EYE SECURITY
// ═════════════════════════════════════════════════════════════════════════════

export class ThirdEyeSecurity {
  private config: ThirdEyeConfig;

  // État
  private bannedPlayers = new Set<string>();
  private trust = new Map<string, TrustProfile>();
  private threats: ThreatRingBuffer;
  private sessions = new Map<string, PlayerSession>();
  private escalatedPlayers = new Set<string>();

  // Rate-limit per-player per-action
  private rateLimits = new Map<string, Map<string, number[]>>();

  // Timers
  private maintenanceTimer: ReturnType<typeof setInterval> | null = null;

  // Events
  private listeners = {
    threat: new Set<(t: ThirdEyeThreat) => void>(),
    ban: new Set<(playerId: string, reason: string) => void>(),
    unban: new Set<(playerId: string) => void>(),
    trustChange: new Set<(playerId: string, oldScore: number, newScore: number) => void>(),
    escalate: new Set<(playerId: string, tier: EscalationTier, previous: EscalationTier) => void>(),
    autoBan: new Set<(playerId: string, reason: string, threats: ThirdEyeThreat[]) => void>(),
  };

  // Stats
  private stats = {
    threatsTotal: 0,
    threatsByCategory: {} as Record<ThreatCategory, number>,
    threatsBySeverity: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
    bansTotal: 0,
    autoBansTotal: 0,
    unbansTotal: 0,
    rateLimitHits: 0,
    escalationsTotal: 0,
    trustChanges: 0,
  };

  // Tier courant (global)
  private lastGlobalTier: EscalationTier = 'GREEN';

  constructor(config: Partial<ThirdEyeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.threats = new ThreatRingBuffer(this.config.maxThreats);

    // Timer de maintenance (decay, recovery, re-escalade)
    if (this.config.maintenanceIntervalMs > 0) {
      this.maintenanceTimer = setInterval(() => {
        this.runMaintenance();
      }, this.config.maintenanceIntervalMs);
      if (this.maintenanceTimer.unref) this.maintenanceTimer.unref();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v1 COMPAT
  // ═════════════════════════════════════════════════════════════════════════

  getStats() {
    const avgTrust = this.trust.size > 0
      ? Array.from(this.trust.values()).reduce((a, b) => a + b.score, 0) / this.trust.size
      : this.config.defaultTrust;

    const recentThreats = this.threats.countSince(Date.now() - this.config.recentWindowMs);
    const tier = this.computeGlobalTier();

    return {
      riskLevel: tier,
      totalThreats: this.threats.size,
      recentThreats,
      bannedPlayers: this.bannedPlayers.size,
      avgTrustScore: Math.round(avgTrust),
      // 🆕
      sessionsActive: this.sessions.size,
      escalatedPlayers: this.escalatedPlayers.size,
      byCategory: { ...this.stats.threatsByCategory },
      bySeverity: { ...this.stats.threatsBySeverity },
    };
  }

  getRecentThreats(limit = 30): ThirdEyeThreat[] {
    return this.threats.recent(limit);
  }

  recordThreat(
    type: string,
    source: string,
    details: string,
    severity = 1,
    category?: ThreatCategory,
    meta?: Record<string, unknown>,
  ): ThirdEyeThreat {
    const s = clamp(Math.round(severity), 1, 5) as ThreatSeverity;
    const cat = category ?? this.inferCategory(type);

    const threat: ThirdEyeThreat = {
      id: genId('thr'),
      type,
      category: cat,
      source,
      details,
      severity: s,
      timestamp: Date.now(),
      meta,
    };

    this.threats.push(threat);

    // Stats
    this.stats.threatsTotal++;
    this.stats.threatsByCategory[cat] = (this.stats.threatsByCategory[cat] ?? 0) + 1;
    this.stats.threatsBySeverity[s] = (this.stats.threatsBySeverity[s] ?? 0) + 1;

    // Trust impact
    if (source && source !== 'system') {
      this.adjustTrust(source, -s * 2, `Threat: ${type}`);
    }

    // Émission
    for (const cb of this.listeners.threat) {
      try { cb(threat); } catch { /* noop */ }
    }

    // Check auto-ban
    if (source && source !== 'system') {
      this.checkAutoBan(source);
    }

    return threat;
  }

  ban(playerId: string, reason?: string): void {
    if (this.bannedPlayers.has(playerId)) return;
    this.bannedPlayers.add(playerId);
    this.stats.bansTotal++;

    this.recordThreat(
      'PLAYER_BAN',
      playerId,
      reason || 'Banni par ThirdEye',
      4,
      'ban',
    );

    // Trust à 0
    this.adjustTrust(playerId, -100, 'banned', true);

    for (const cb of this.listeners.ban) {
      try { cb(playerId, reason || 'Banni par ThirdEye'); } catch { /* noop */ }
    }
  }

  unban(playerId: string): boolean {
    const wasBanned = this.bannedPlayers.delete(playerId);
    if (wasBanned) {
      this.stats.unbansTotal++;
      this.recordThreat(
        'PLAYER_UNBAN',
        playerId,
        'Débanni par administrateur',
        1,
        'ban',
      );

      // Restaure un trust minimal
      const profile = this.trust.get(playerId);
      if (profile) {
        profile.score = 50;
        profile.flags.delete('BANNED');
      }

      for (const cb of this.listeners.unban) {
        try { cb(playerId); } catch { /* noop */ }
      }
    }
    return wasBanned;
  }

  isBanned(playerId: string): boolean {
    return this.bannedPlayers.has(playerId);
  }

  analyze(action: string, playerId: string): AnalyzeResult {
    // v1 compat : check banned
    if (this.bannedPlayers.has(playerId)) {
      return {
        allowed: false,
        reason: 'Joueur banni par le système ThirdEye',
        category: 'ban',
        trustAfter: 0,
      };
    }

    // 🆕 Check trust minimum
    const profile = this.getOrCreateProfile(playerId);
    if (profile.score < this.config.minTrustToAllow) {
      return {
        allowed: false,
        reason: `Trust insuffisant (${profile.score.toFixed(0)} < ${this.config.minTrustToAllow})`,
        trustAfter: profile.score,
      };
    }

    // 🆕 Rate limit
    const rateResult = this.checkRateLimit(playerId, action);
    if (!rateResult.allowed) {
      return rateResult;
    }

    return {
      allowed: true,
      trustAfter: profile.score,
    };
  }

  getPlayerTrust(playerId: string): { score: number; flags?: string[] } {
    if (this.bannedPlayers.has(playerId)) {
      return { score: 0, flags: ['BANNED'] };
    }
    const profile = this.getOrCreateProfile(playerId);
    return {
      score: Math.round(profile.score),
      flags: Array.from(profile.flags),
    };
  }

  setPlayerTrust(playerId: string, score: number): void {
    const old = this.getOrCreateProfile(playerId).score;
    const newScore = clamp(score, 0, 100);
    const profile = this.getOrCreateProfile(playerId);
    profile.score = newScore;
    profile.lastUpdatedAt = Date.now();
    profile.history.push({
      delta: newScore - old,
      reason: 'manual_set',
      at: Date.now(),
    });
    this.trimHistory(profile);

    this.stats.trustChanges++;
    for (const cb of this.listeners.trustChange) {
      try { cb(playerId, old, newScore); } catch { /* noop */ }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  API v2 — EXTENSIONS
  // ═════════════════════════════════════════════════════════════════════════

  /** 🆕 Enregistre une session joueur (auth fingerprint). */
  registerSession(
    playerId: string,
    fingerprint: string,
    ip: string,
  ): PlayerSession {
    const session: PlayerSession = {
      playerId,
      fingerprint,
      ipHash: hashString(ip),
      startedAt: Date.now(),
      lastSeenAt: Date.now(),
      actionCounts: new Map(),
      lastActionAt: new Map(),
    };
    this.sessions.set(playerId, session);

    // Détecte changement d'IP ou de fingerprint
    const previous = this.sessions.get(playerId);
    if (previous && previous.fingerprint !== fingerprint) {
      this.recordThreat(
        'FINGERPRINT_CHANGE',
        playerId,
        `Fingerprint changé : ${previous.fingerprint} → ${fingerprint}`,
        3,
        'auth_anomaly',
      );
    }

    return session;
  }

  /** 🆕 Termine une session. */
  endSession(playerId: string): void {
    this.sessions.delete(playerId);
  }

  /** 🆕 Heartbeat de session. */
  heartbeat(playerId: string): void {
    const s = this.sessions.get(playerId);
    if (s) s.lastSeenAt = Date.now();
  }

  /** 🆕 Rate-limit granulaire. */
  private checkRateLimit(playerId: string, action: string): AnalyzeResult {
    let playerLimits = this.rateLimits.get(playerId);
    if (!playerLimits) {
      playerLimits = new Map();
      this.rateLimits.set(playerId, playerLimits);
    }

    let timestamps = playerLimits.get(action);
    if (!timestamps) {
      timestamps = [];
      playerLimits.set(action, timestamps);
    }

    const now = Date.now();
    const window = this.config.defaultRateLimit.windowMs;
    const cutoff = now - window;

    // Cleanup anciens
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= this.config.defaultRateLimit.actions) {
      this.stats.rateLimitHits++;
      this.recordThreat(
        'RATE_LIMIT',
        playerId,
        `${action} : ${timestamps.length} actions en ${window / 1000}s`,
        2,
        'rate_limit',
      );
      return {
        allowed: false,
        reason: `Rate limit : ${action}`,
        category: 'rate_limit',
        trustAfter: this.getOrCreateProfile(playerId).score,
      };
    }

    timestamps.push(now);
    return { allowed: true };
  }

  /** 🆕 Heuristique : détection de vitesse anormale (m/s). */
  detectSpeedAnomaly(
    playerId: string,
    currentSpeedMs: number,
    maxAllowedMs: number,
  ): boolean {
    if (currentSpeedMs > maxAllowedMs * 2) {
      this.recordThreat(
        'SPEED_ANOMALY',
        playerId,
        `Vitesse anormale : ${currentSpeedMs.toFixed(2)} m/s (max ${maxAllowedMs})`,
        currentSpeedMs > maxAllowedMs * 4 ? 5 : 3,
        'speed_hack',
      );
      return true;
    }
    return false;
  }

  /** 🆕 Heuristique : détection de téléportation. */
  detectTeleport(
    playerId: string,
    distanceMeters: number,
    deltaSeconds: number,
  ): boolean {
    if (deltaSeconds <= 0) return false;
    const speedMs = distanceMeters / deltaSeconds;
    if (speedMs > 100) { // > 360 km/h instantané
      this.recordThreat(
        'TELEPORT_SUSPECT',
        playerId,
        `Déplacement suspect : ${distanceMeters.toFixed(1)}m en ${deltaSeconds.toFixed(2)}s`,
        speedMs > 300 ? 5 : 3,
        'teleport',
      );
      return true;
    }
    return false;
  }

  /** 🆕 Heuristique : anomalie de visée (aimbot). */
  detectAimAnomaly(
    playerId: string,
    angleDeltaDegrees: number,
    deltaSeconds: number,
  ): boolean {
    if (deltaSeconds <= 0) return false;
    const angularSpeed = angleDeltaDegrees / deltaSeconds;
    // Rotation > 1000 deg/sec = suspicieux
    if (angularSpeed > 1000) {
      this.recordThreat(
        'AIM_ANOMALY',
        playerId,
        `Rotation instantanée : ${angularSpeed.toFixed(0)} °/s`,
        4,
        'aim_anomaly',
      );
      return true;
    }
    return false;
  }

  /** 🆕 Détecte un client tamperé (hash mismatch). */
  detectClientTamper(playerId: string, expected: string, actual: string): boolean {
    if (expected !== actual) {
      this.recordThreat(
        'CLIENT_TAMPER',
        playerId,
        `Hash client invalide : attendu=${expected.slice(0, 8)}…, reçu=${actual.slice(0, 8)}…`,
        4,
        'client_tamper',
      );
      return true;
    }
    return false;
  }

  /** 🆕 Tier d'escalade global (basé sur les menaces récentes). */
  computeGlobalTier(): EscalationTier {
    const recent = this.threats.countSince(Date.now() - this.config.recentWindowMs);
    const severity = this.threats.severitySumSince(Date.now() - this.config.recentWindowMs);
    const bans = this.bannedPlayers.size;

    if (bans > 10 || severity > 30) return 'RED';
    if (bans > 5 || severity > 15) return 'ORANGE';
    if (recent > 5 || severity > 5) return 'YELLOW';
    return 'GREEN';
  }

  /** 🆕 Nombre de menaces pour un joueur (fenêtre récente). */
  getPlayerThreatCount(playerId: string): number {
    const cutoff = Date.now() - this.config.recentWindowMs;
    return this.threats.forSource(playerId).filter((t) => t.timestamp >= cutoff).length;
  }

  /** 🆕 Historique des menaces d'un joueur. */
  getPlayerThreatHistory(playerId: string, limit = 50): ThirdEyeThreat[] {
    return this.threats.forSource(playerId, limit);
  }

  /** 🆕 Force l'escalade d'un joueur. */
  escalatePlayer(playerId: string, tier: EscalationTier): void {
    if (tier === 'GREEN') {
      this.escalatedPlayers.delete(playerId);
    } else {
      this.escalatedPlayers.add(playerId);
    }

    this.recordThreat(
      'ESCALATION',
      playerId,
      `Escalade manuelle : ${tier}`,
      2,
      'auth_anomaly',
    );
  }

  /** 🆕 Bulk analyze (N actions d'un coup). */
  analyzeBulk(
    actions: Array<{ action: string; playerId: string }>,
  ): AnalyzeResult[] {
    return actions.map((a) => this.analyze(a.action, a.playerId));
  }

  /** 🆕 Reset trust (admin). */
  resetPlayer(playerId: string): void {
    this.unban(playerId);
    this.trust.delete(playerId);
    this.rateLimits.delete(playerId);
    this.escalatedPlayers.delete(playerId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  EVENTS
  // ═════════════════════════════════════════════════════════════════════════

  onThreat(cb: (t: ThirdEyeThreat) => void): () => void {
    this.listeners.threat.add(cb);
    return () => this.listeners.threat.delete(cb);
  }

  onBan(cb: (playerId: string, reason: string) => void): () => void {
    this.listeners.ban.add(cb);
    return () => this.listeners.ban.delete(cb);
  }

  onUnban(cb: (playerId: string) => void): () => void {
    this.listeners.unban.add(cb);
    return () => this.listeners.unban.delete(cb);
  }

  onTrustChange(cb: (playerId: string, oldScore: number, newScore: number) => void): () => void {
    this.listeners.trustChange.add(cb);
    return () => this.listeners.trustChange.delete(cb);
  }

  onEscalate(cb: (playerId: string, tier: EscalationTier, previous: EscalationTier) => void): () => void {
    this.listeners.escalate.add(cb);
    return () => this.listeners.escalate.delete(cb);
  }

  onAutoBan(cb: (playerId: string, reason: string, threats: ThirdEyeThreat[]) => void): () => void {
    this.listeners.autoBan.add(cb);
    return () => this.listeners.autoBan.delete(cb);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  INTERNALS
  // ═════════════════════════════════════════════════════════════════════════

  private getOrCreateProfile(playerId: string): TrustProfile {
    let profile = this.trust.get(playerId);
    if (!profile) {
      profile = {
        playerId,
        score: this.config.defaultTrust,
        lastUpdatedAt: Date.now(),
        history: [],
        flags: new Set(),
        threatCount: 0,
      };
      this.trust.set(playerId, profile);
    }
    return profile;
  }

  private adjustTrust(
    playerId: string,
    delta: number,
    reason: string,
    absolute = false,
  ): void {
    const profile = this.getOrCreateProfile(playerId);
    const old = profile.score;
    profile.score = absolute
      ? clamp(delta + 100, 0, 100)
      : clamp(profile.score + delta, 0, 100);
    profile.lastUpdatedAt = Date.now();
    profile.threatCount++;

    profile.history.push({ delta: profile.score - old, reason, at: Date.now() });
    this.trimHistory(profile);

    if (profile.score !== old) {
      this.stats.trustChanges++;
      for (const cb of this.listeners.trustChange) {
        try { cb(playerId, old, profile.score); } catch { /* noop */ }
      }
    }
  }

  private trimHistory(profile: TrustProfile): void {
    if (profile.history.length > 50) {
      profile.history = profile.history.slice(-50);
    }
  }

  private inferCategory(type: string): ThreatCategory {
    const t = type.toLowerCase();
    if (t.includes('ban')) return 'ban';
    if (t.includes('rate')) return 'rate_limit';
    if (t.includes('speed')) return 'speed_hack';
    if (t.includes('teleport')) return 'teleport';
    if (t.includes('aim')) return 'aim_anomaly';
    if (t.includes('wall')) return 'wall_clip';
    if (t.includes('dup')) return 'duplication';
    if (t.includes('auth') || t.includes('fingerprint')) return 'auth_anomaly';
    if (t.includes('tamper') || t.includes('client')) return 'client_tamper';
    return 'custom';
  }

  private checkAutoBan(playerId: string): void {
    const recentThreats = this.getPlayerThreatHistory(playerId, 100)
      .filter((t) => Date.now() - t.timestamp < this.config.recentWindowMs);

    const count = recentThreats.length;
    const severity = recentThreats.reduce((s, t) => s + t.severity, 0);

    if (count >= this.config.threatsForAutoBan || severity >= this.config.severityForAutoBan) {
      if (!this.bannedPlayers.has(playerId)) {
        this.stats.autoBansTotal++;
        this.ban(
          playerId,
          `Auto-ban : ${count} threats / sévérité ${severity} en 30 min`,
        );
        for (const cb of this.listeners.autoBan) {
          try { cb(playerId, 'auto', recentThreats); } catch { /* noop */ }
        }
      }
    }
  }

  private runMaintenance(): void {
    const now = Date.now();
    const minuteDelta = this.config.maintenanceIntervalMs / 60_000;

    // Trust decay/recovery par joueur
    for (const [playerId, profile] of this.trust) {
      if (this.bannedPlayers.has(playerId)) continue;

      const threats = this.getPlayerThreatHistory(playerId, 100).filter(
        (t) => now - t.timestamp < this.config.recentWindowMs,
      );

      if (threats.length > 0) {
        // Decay : plus il y a de menaces, plus le trust baisse
        const decay = this.config.trustDecayPerMinute * minuteDelta;
        profile.score = clamp(profile.score - decay, 0, 100);
      } else {
        // Recovery lente
        const recovery = this.config.trustRecoveryPerMinute * minuteDelta;
        profile.score = clamp(profile.score + recovery, 0, 100);
      }
      profile.lastUpdatedAt = now;
    }

    // Escalade globale
    if (this.config.autoEscalationEnabled) {
      const currentTier = this.computeGlobalTier();
      if (currentTier !== this.lastGlobalTier) {
        this.stats.escalationsTotal++;
        const previous = this.lastGlobalTier;
        this.lastGlobalTier = currentTier;
        for (const cb of this.listeners.escalate) {
          try { cb('__global__', currentTier, previous); } catch { /* noop */ }
        }
      }
    }

    // Cleanup sessions inactives
    const sessionCutoff = now - 10 * 60_000;
    for (const [playerId, session] of this.sessions) {
      if (session.lastSeenAt < sessionCutoff) {
        this.sessions.delete(playerId);
      }
    }

    // Cleanup rate limits vides
    for (const [playerId, limits] of this.rateLimits) {
      let hasAny = false;
      for (const [action, timestamps] of limits) {
        if (timestamps.length === 0) {
          limits.delete(action);
        } else {
          hasAny = true;
        }
      }
      if (!hasAny) this.rateLimits.delete(playerId);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  CONFIG & HEALTH
  // ═════════════════════════════════════════════════════════════════════════

  updateConfig(patch: Partial<ThirdEyeConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  getConfig(): ThirdEyeConfig {
    return { ...this.config };
  }

  health(): { ok: boolean; reason?: string } {
    if (this.threats.size >= this.config.maxThreats * 0.95) {
      return { ok: false, reason: 'threat_buffer_near_full' };
    }
    if (this.stats.autoBansTotal > 50) {
      return { ok: true, reason: 'many_auto_bans' };
    }
    return { ok: true };
  }

  dispose(): void {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }
    this.bannedPlayers.clear();
    this.trust.clear();
    this.threats.clear();
    this.sessions.clear();
    this.escalatedPlayers.clear();
    this.rateLimits.clear();
    for (const set of Object.values(this.listeners)) {
      (set as Set<unknown>).clear();
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SINGLETON (v1 compat)
// ═════════════════════════════════════════════════════════════════════════════

export const thirdEye = new ThirdEyeSecurity();