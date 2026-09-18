// ══════════════════════════════════════════════════════════════════════════════
//  Ether-Guard v2.0 — Agent de sécurité · Permissions · Anti-abus · Audit
//  src/agents/EtherGuard.ts
// ──────────────────────────────────────────────────────────────────────────────
//  • Hiérarchie de rôles explicite + wildcards + resource-based
//  • Rate-limit par joueur (Map<playerId, number[]>) O(1)
//  • Key registry avec métadonnées + expiration + issuer
//  • Events (onViolation, onRateLimit, onKeyIssue, onBan)
//  • Config entièrement paramétrable
//  • Threat level dynamique (safe → critical)
//  • Ban/warn state cumulatif
//  • Audit trail persistant (ring buffer + hooks)
//  • Sanitization input (anti prototype pollution)
//  • Stats détaillées par catégorie
//  • Compat 100% v1
// ══════════════════════════════════════════════════════════════════════════════

import type { TroxtTaskPacket, AgentResult, AgentTelemetry } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type PlayerRole = 'admin' | 'staff' | 'resident' | 'visitor' | 'banned';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
export type ThreatLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface PermissionCheck {
  allowed: boolean;
  reason: string;
  requiredRole?: PlayerRole;
  riskLevel: RiskLevel;
}

/** 🆕 v2 : contexte enrichi pour permissions resource-based. */
export interface PermissionContext {
  /** Action demandée (ex: 'property:buy'). */
  action: string;
  /** Rôle du joueur. */
  playerRole: PlayerRole;
  /** ID joueur (audit + rate-limit). */
  playerId?: string;
  /** ID ressource (ex: propertyId, keyId). */
  resourceId?: string;
  /** Propriétaire de la ressource (si applicable). */
  resourceOwnerId?: string;
  /** Métadonnées additionnelles. */
  meta?: Record<string, unknown>;
}

export interface KeyMetadata {
  keyId: string;
  ownerId: string;
  issuedBy: string;
  issuedAt: number;
  expiresAt: number | null;
  /** Joueurs avec co-accès */
  coOwners: Set<string>;
  /** Tags libres */
  tags: string[];
  /** Révocations */
  revoked: boolean;
  revokedAt: number | null;
  revokedBy: string | null;
  revokedReason: string | null;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  playerId: string;
  action: string;
  decision: 'allowed' | 'denied';
  reason: string;
  riskLevel: RiskLevel;
  mission?: string;
  meta?: Record<string, unknown>;
}

export interface ViolationRecord {
  timestamp: number;
  playerId: string;
  action: string;
  reason: string;
  category: ViolationCategory;
  severity: RiskLevel;
}

export type ViolationCategory =
  | 'permission'
  | 'duplication'
  | 'abuse'
  | 'key_integrity'
  | 'purchase'
  | 'rate_limit'
  | 'sanitization';

export interface EtherGuardConfig {
  /** Fenêtre de rate-limit (ms). */
  rateWindowMs: number;
  /** Nombre max d'actions dans la fenêtre avant flag. */
  rateMaxActions: number;
  /** Nombre de violations avant auto-ban. */
  violationsForBan: number;
  /** Nombre de violations avant passage en "warned". */
  violationsForWarn: number;
  /** Taille max de l'abuse log circulaire. */
  abuseLogMax: number;
  /** Taille max de l'audit trail. */
  auditLogMax: number;
  /** Durée de validité par défaut des clés (ms). null = infini. */
  defaultKeyTtlMs: number | null;
  /** Regex de validation des keyIds. */
  keyIdPattern: RegExp;
  /** Sanitize les inputs (anti prototype pollution). */
  sanitizeInputs: boolean;
  /** Filtre les clés expirées à chaque appel. */
  autoCleanupKeys: boolean;
  /** Intervalle de cleanup auto (ms). 0 = manuel. */
  cleanupIntervalMs: number;
  /** Active l'audit trail. */
  auditEnabled: boolean;
}

const DEFAULT_CONFIG: EtherGuardConfig = {
  rateWindowMs: 10_000,
  rateMaxActions: 8,
  violationsForBan: 10,
  violationsForWarn: 4,
  abuseLogMax: 5000,
  auditLogMax: 10_000,
  defaultKeyTtlMs: 30 * 24 * 3600 * 1000, // 30 jours
  keyIdPattern: /^key_[a-z0-9_]+_\d+$/,
  sanitizeInputs: true,
  autoCleanupKeys: true,
  cleanupIntervalMs: 5 * 60 * 1000, // 5 min
  auditEnabled: true,
};

// ══════════════════════════════════════════════════════════════════════════════
//  HIÉRARCHIE DE RÔLES (v2 — explicite)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Plus le rang est élevé, plus le rôle a de pouvoir.
 * `banned` est en dehors de la hiérarchie (rang négatif).
 */
export const ROLE_RANK: Record<PlayerRole, number> = {
  admin: 100,
  staff: 60,
  resident: 30,
  visitor: 10,
  banned: -100,
};

/**
 * Map d'actions → rôles autorisés.
 * Supporte les wildcards : `property:*` couvre `property:buy`, `property:lock`, etc.
 */
export const PERMISSION_MAP: Record<string, PlayerRole[]> = {
  // Propriété
  'property:buy': ['resident', 'staff', 'admin'],
  'property:sell': ['resident', 'staff', 'admin'],
  'property:lock': ['resident', 'staff', 'admin'],
  'property:unlock': ['staff', 'admin'],
  'property:view': ['resident', 'staff', 'admin'],
  'property:*': ['staff', 'admin'], // 🆕 wildcard

  // Portes
  'door:open': ['resident', 'staff', 'admin'],
  'door:lock': ['staff', 'admin'],
  'door:unlock': ['staff', 'admin'],
  'door:breach': ['admin'],
  'door:*': ['staff', 'admin'],

  // Mobilier / décoration
  'furniture:place': ['resident', 'staff', 'admin'],
  'furniture:remove': ['resident', 'staff', 'admin'],
  'furniture:*': ['staff', 'admin'],

  // Économie
  'economy:transfer': ['resident', 'staff', 'admin'],
  'economy:withdraw': ['resident', 'staff', 'admin'],
  'economy:*': ['staff', 'admin'],

  // PNJ / spawn
  'npc:spawn': ['staff', 'admin'],
  'npc:despawn': ['staff', 'admin'],
  'npc:*': ['admin'],

  // Véhicules
  'vehicle:spawn': ['staff', 'admin'],
  'vehicle:impound': ['staff', 'admin'],
  'vehicle:*': ['admin'],

  // Système (admin only)
  'system:saveWorld': ['admin'],
  'system:loadWorld': ['admin'],
  'system:shutdown': ['admin'],
  'system:*': ['admin'],

  // Ban / kick
  'player:ban': ['staff', 'admin'],
  'player:kick': ['staff', 'admin'],
  'player:*': ['admin'],
};

// ══════════════════════════════════════════════════════════════════════════════
//  UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

function isValidInput(input: unknown): input is Record<string, unknown> {
  return (
    typeof input === 'object' &&
    input !== null &&
    !Array.isArray(input) &&
    Object.getPrototypeOf(input) === Object.prototype
  );
}

/**
 * 🆕 Sanitize : empêche la pollution de prototype et copie profonde shallow.
 */
function sanitizeInput(input: unknown): Record<string, unknown> {
  if (!isValidInput(input)) return {};

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      out[key] = sanitizeInput(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** 🆕 Match avec support wildcards. */
function matchAction(pattern: string, action: string): boolean {
  if (pattern === action) return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -2);
    return action === prefix || action.startsWith(prefix + ':');
  }
  return false;
}

/** 🆕 Compare deux riskLevels (retourne le plus élevé). */
function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical'];
  return order.indexOf(a) > order.indexOf(b) ? a : b;
}

function riskScore(risk: RiskLevel): number {
  return { safe: 0, low: 15, medium: 40, high: 70, critical: 100 }[risk];
}

// ══════════════════════════════════════════════════════════════════════════════
//  ETHER GUARD
// ══════════════════════════════════════════════════════════════════════════════

export class EtherGuard {
  readonly name = 'EtherGuard' as const;

  private currentTask: string | null = null;
  private tasksCompleted = 0;

  // Config
  private config: EtherGuardConfig;

  // Abuse log par joueur (Map pour O(1))
  private abuseByPlayer = new Map<string, number[]>();

  // Key registry enrichi
  private keyRegistry = new Map<string, KeyMetadata>();

  // Audit trail
  private auditLog: AuditEntry[] = [];

  // Violations cumulatives par joueur
  private violationsByPlayer = new Map<string, ViolationRecord[]>();

  // Warn / ban state
  private warnedPlayers = new Set<string>();
  private bannedPlayers = new Set<string>();

  // Events
  private listeners = {
    violation: new Set<(v: ViolationRecord) => void>(),
    rateLimit: new Set<(playerId: string, count: number) => void>(),
    keyIssued: new Set<(key: KeyMetadata) => void>(),
    keyRevoked: new Set<(key: KeyMetadata) => void>(),
    banned: new Set<(playerId: string, reason: string) => void>(),
    warned: new Set<(playerId: string, reason: string) => void>(),
  };

  // Stats
  private stats = {
    tasksCompleted: 0,
    permissionChecks: 0,
    permissionDenied: 0,
    violationsTotal: 0,
    rateLimitHits: 0,
    keysIssued: 0,
    keysRevoked: 0,
    keysExpired: 0,
    bansTotal: 0,
    warnsTotal: 0,
    violationsByCategory: {
      permission: 0,
      duplication: 0,
      abuse: 0,
      key_integrity: 0,
      purchase: 0,
      rate_limit: 0,
      sanitization: 0,
    } as Record<ViolationCategory, number>,
  };

  // Cleanup timer
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<EtherGuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Démarre le cleanup auto
    if (this.config.autoCleanupKeys && this.config.cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredKeys();
      }, this.config.cleanupIntervalMs);
      if (this.cleanupTimer.unref) this.cleanupTimer.unref();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PROCESS (v1 compat + async support)
  // ══════════════════════════════════════════════════════════════════════════

  async process(packet: TroxtTaskPacket): Promise<AgentResult> {
    this.currentTask = packet.id;
    const start = Date.now();

    try {
      const input = this.config.sanitizeInputs
        ? sanitizeInput(packet.input)
        : (packet.input as Record<string, unknown>) ?? {};

      const audit = this.fullSecurityAudit(packet, input);
      this.tasksCompleted++;
      this.stats.tasksCompleted++;

      return {
        taskId: packet.id,
        agent: this.name,
        status: audit.approved ? 'success' : 'partial',
        output: audit,
        confidence: audit.approved ? 0.93 : 0.72,
        warnings: audit.violations,
        completedAt: Date.now(),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        taskId: packet.id,
        agent: this.name,
        status: 'failed',
        output: { error: String(err) },
        confidence: 0,
        warnings: [`Erreur interne : ${String(err)}`],
        completedAt: Date.now(),
        durationMs: Date.now() - start,
      };
    } finally {
      this.currentTask = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AUDIT COMPLET
  // ══════════════════════════════════════════════════════════════════════════

  private fullSecurityAudit(packet: TroxtTaskPacket, input: Record<string, unknown>) {
    const { mission } = packet;
    const violations: string[] = [];
    const passed: string[] = [];
    let riskLevel: RiskLevel = 'safe';

    // 1) Permissions
    const roleCheck = this.checkPermissions(input);
    if (!roleCheck.allowed) {
      violations.push(roleCheck.reason);
      riskLevel = maxRisk(riskLevel, 'high');
      this.recordViolation(String(input.playerId ?? 'unknown'), String(input.action ?? 'unknown'), roleCheck.reason, 'permission', 'high');
    } else {
      passed.push('Permissions validées');
    }

    // 2) Duplication
    const dupCheck = this.checkDuplication(input);
    if (dupCheck.found) {
      violations.push(dupCheck.message);
      riskLevel = maxRisk(riskLevel, 'medium');
      this.recordViolation(String(input.playerId ?? 'unknown'), String(input.action ?? 'unknown'), dupCheck.message, 'duplication', 'medium');
    } else {
      passed.push('Pas de duplication détectée');
    }

    // 3) Abuse / rate-limit
    const abuseCheck = this.detectAbuse(input);
    if (abuseCheck.suspicious) {
      violations.push(abuseCheck.reason);
      riskLevel = maxRisk(riskLevel, 'high');
      this.recordViolation(String(input.playerId ?? 'unknown'), String(input.action ?? 'unknown'), abuseCheck.reason, 'abuse', 'high');
    } else {
      passed.push('Comportement normal');
    }

    // 4) Key integrity
    const keyCheck = this.validateKeyIntegrity(input);
    if (!keyCheck.valid) {
      violations.push(keyCheck.reason);
      riskLevel = maxRisk(riskLevel, 'medium');
      this.recordViolation(String(input.playerId ?? 'unknown'), String(input.action ?? 'unknown'), keyCheck.reason, 'key_integrity', 'medium');
    } else {
      passed.push('Intégrité des clés OK');
    }

    // 5) Purchase
    const purchaseCheck = this.validatePurchase(input);
    if (!purchaseCheck.valid) {
      violations.push(purchaseCheck.reason);
      riskLevel = maxRisk(riskLevel, 'high');
      this.recordViolation(String(input.playerId ?? 'unknown'), String(input.action ?? 'unknown'), purchaseCheck.reason, 'purchase', 'high');
    } else {
      passed.push('Achat valide');
    }

    // 6) Sanitization (si input a été modifié)
    if (this.config.sanitizeInputs && !isValidInput(packet.input)) {
      violations.push('Input non conforme (sanitizé)');
      riskLevel = maxRisk(riskLevel, 'low');
      this.recordViolation(String(input.playerId ?? 'unknown'), String(input.action ?? 'unknown'), 'Input non conforme', 'sanitization', 'low');
    }

    // Score
    const score = violations.length === 0
      ? 0
      : Math.min(100, riskScore(riskLevel) + violations.length * 5);

    // Audit trail
    if (this.config.auditEnabled && input.playerId) {
      this.pushAudit({
        id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        playerId: String(input.playerId),
        action: String(input.action ?? 'unknown'),
        decision: violations.length === 0 ? 'allowed' : 'denied',
        reason: violations.length === 0 ? 'Approuvé' : violations.join(' · '),
        riskLevel,
        mission,
      });
    }

    return {
      agent: 'EtherGuard',
      mission,
      approved: violations.length === 0,
      violations,
      passed,
      riskScore: score,
      riskLevel,
      recommendation: violations.length === 0
        ? 'Approuvé — aucun risque détecté'
        : `${violations.length} violation(s) — correction requise avant déploiement`,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PERMISSIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Vérifie une permission (v1 compat + support contextuel).
   */
  checkPermission(action: string, playerRole: PlayerRole): PermissionCheck {
    this.stats.permissionChecks++;

    // Banni ? Toujours refusé (sauf admin override)
    if (playerRole === 'banned') {
      this.stats.permissionDenied++;
      return {
        allowed: false,
        reason: 'Joueur banni',
        requiredRole: 'admin',
        riskLevel: 'critical',
      };
    }

    // Cherche d'abord match exact, puis wildcards
    const directRoles = PERMISSION_MAP[action];
    let allowedRoles: PlayerRole[] | undefined = directRoles;

    if (!allowedRoles) {
      // Cherche un wildcard correspondant
      for (const [pattern, roles] of Object.entries(PERMISSION_MAP)) {
        if (pattern.endsWith(':*') && matchAction(pattern, action)) {
          allowedRoles = roles;
          break;
        }
      }
    }

    if (!allowedRoles) {
      // Action non réglementée → allow par défaut
      return { allowed: true, reason: 'Action non réglementée', riskLevel: 'low' };
    }

    if (allowedRoles.includes(playerRole)) {
      return { allowed: true, reason: `Rôle "${playerRole}" autorisé`, riskLevel: 'safe' };
    }

    // Calcule le rôle minimum requis (rang le plus bas parmi les autorisés)
    const minRole = allowedRoles.reduce(
      (min, r) => (ROLE_RANK[r] < ROLE_RANK[min] ? r : min),
      allowedRoles[0],
    );

    this.stats.permissionDenied++;
    return {
      allowed: false,
      reason: `Rôle insuffisant : "${playerRole}" — minimum requis : "${minRole}"`,
      requiredRole: minRole,
      riskLevel: 'high',
    };
  }

  /**
   * 🆕 Vérifie une permission avec contexte enrichi (resource-based).
   */
  checkPermissionWithContext(ctx: PermissionContext): PermissionCheck {
    const base = this.checkPermission(ctx.action, ctx.playerRole);
    if (!base.allowed) return base;

    // Bypass admin
    if (ctx.playerRole === 'admin') return base;

    // Resource-based : le joueur doit être propriétaire (ou co-owner)
    if (ctx.resourceId && ctx.resourceOwnerId) {
      const isOwner = ctx.resourceOwnerId === ctx.playerId;
      const key = this.keyRegistry.get(ctx.resourceId);
      const isCoOwner = key?.coOwners.has(ctx.playerId ?? '');

      if (!isOwner && !isCoOwner) {
        return {
          allowed: false,
          reason: `Vous n'êtes ni propriétaire ni co-propriétaire de "${ctx.resourceId}"`,
          requiredRole: 'resident',
          riskLevel: 'high',
        };
      }
    }

    return base;
  }

  /**
   * 🆕 Vérifie plusieurs permissions d'un coup (bulk).
   */
  checkPermissionBulk(checks: Array<{ action: string; playerRole: PlayerRole }>): PermissionCheck[] {
    return checks.map((c) => this.checkPermission(c.action, c.playerRole));
  }

  private checkPermissions(input: Record<string, unknown>): { allowed: boolean; reason: string } {
    const action = String(input.action ?? '');
    const role = String(input.playerRole ?? 'visitor') as PlayerRole;
    if (!action) return { allowed: true, reason: 'Pas d\'action à vérifier' };

    // Priorité : context-based si resourceId fourni
    if (input.resourceId && input.resourceOwnerId) {
      const ctx: PermissionContext = {
        action,
        playerRole: role,
        playerId: String(input.playerId ?? ''),
        resourceId: String(input.resourceId),
        resourceOwnerId: String(input.resourceOwnerId),
        meta: input,
      };
      const check = this.checkPermissionWithContext(ctx);
      return { allowed: check.allowed, reason: check.reason };
    }

    const check = this.checkPermission(action, role);
    return { allowed: check.allowed, reason: check.reason };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DUPLICATION
  // ══════════════════════════════════════════════════════════════════════════

  private checkDuplication(input: Record<string, unknown>): { found: boolean; message: string } {
    const keyId = String(input.keyId ?? '');
    const playerId = String(input.playerId ?? '');
    if (!keyId || !playerId) return { found: false, message: '' };

    const key = this.keyRegistry.get(keyId);
    if (!key) return { found: false, message: '' };

    if (key.ownerId === playerId || key.coOwners.has(playerId)) {
      return {
        found: true,
        message: `Duplication détectée : joueur "${playerId}" possède déjà la clé "${keyId}"`,
      };
    }
    return { found: false, message: '' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  KEY REGISTRY (v2 enrichi)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * v1 compat — enregistre une clé.
   * v2 : crée les métadonnées complètes.
   */
  registerKey(keyId: string, playerId: string): void {
    if (!keyId || !playerId) return;

    const existing = this.keyRegistry.get(keyId);
    if (existing) {
      // Ajoute comme co-owner
      existing.coOwners.add(playerId);
      return;
    }

    const now = Date.now();
    const meta: KeyMetadata = {
      keyId,
      ownerId: playerId,
      issuedBy: 'system',
      issuedAt: now,
      expiresAt: this.config.defaultKeyTtlMs
        ? now + this.config.defaultKeyTtlMs
        : null,
      coOwners: new Set(),
      tags: [],
      revoked: false,
      revokedAt: null,
      revokedBy: null,
      revokedReason: null,
    };

    this.keyRegistry.set(keyId, meta);
    this.stats.keysIssued++;

    this.listeners.keyIssued.forEach((cb) => {
      try { cb(meta); } catch { /* noop */ }
    });
  }

  /**
   * 🆕 Enregistre une clé avec métadonnées complètes.
   */
  issueKey(opts: {
    keyId: string;
    ownerId: string;
    issuedBy: string;
    ttlMs?: number | null;
    tags?: string[];
  }): KeyMetadata {
    const now = Date.now();
    const ttl = opts.ttlMs !== undefined ? opts.ttlMs : this.config.defaultKeyTtlMs;

    const meta: KeyMetadata = {
      keyId: opts.keyId,
      ownerId: opts.ownerId,
      issuedBy: opts.issuedBy,
      issuedAt: now,
      expiresAt: ttl ? now + ttl : null,
      coOwners: new Set(),
      tags: opts.tags ?? [],
      revoked: false,
      revokedAt: null,
      revokedBy: null,
      revokedReason: null,
    };

    this.keyRegistry.set(opts.keyId, meta);
    this.stats.keysIssued++;

    this.listeners.keyIssued.forEach((cb) => {
      try { cb(meta); } catch { /* noop */ }
    });

    return meta;
  }

  /**
   * v1 compat — révoque une clé pour un joueur.
   */
  revokeKey(keyId: string, playerId: string): void {
    const key = this.keyRegistry.get(keyId);
    if (!key) return;

    if (key.ownerId === playerId) {
      // Propriétaire → révocation totale
      key.revoked = true;
      key.revokedAt = Date.now();
      key.revokedBy = playerId;
      key.revokedReason = 'owner_revoke';
      this.stats.keysRevoked++;

      this.listeners.keyRevoked.forEach((cb) => {
        try { cb(key); } catch { /* noop */ }
      });
    } else {
      // Co-owner → retrait simple
      key.coOwners.delete(playerId);
    }
  }

  /**
   * 🆕 Ajoute un co-owner.
   */
  addCoOwner(keyId: string, playerId: string, requesterId: string): boolean {
    const key = this.keyRegistry.get(keyId);
    if (!key || key.revoked) return false;
    if (key.ownerId !== requesterId) return false;
    key.coOwners.add(playerId);
    return true;
  }

  /**
   * 🆕 Vérifie si un joueur a accès à une clé.
   */
  hasKeyAccess(keyId: string, playerId: string): boolean {
    const key = this.keyRegistry.get(keyId);
    if (!key || key.revoked) return false;
    if (key.expiresAt && Date.now() > key.expiresAt) return false;
    return key.ownerId === playerId || key.coOwners.has(playerId);
  }

  /**
   * 🆕 Récupère les métadonnées d'une clé.
   */
  getKeyMetadata(keyId: string): KeyMetadata | null {
    return this.keyRegistry.get(keyId) ?? null;
  }

  /**
   * 🆕 Cleanup des clés expirées.
   */
  cleanupExpiredKeys(): number {
    const now = Date.now();
    let count = 0;
    for (const [keyId, key] of this.keyRegistry) {
      if (key.expiresAt && now > key.expiresAt && !key.revoked) {
        key.revoked = true;
        key.revokedAt = now;
        key.revokedBy = 'system';
        key.revokedReason = 'expired';
        this.stats.keysExpired++;
        count++;
      }
    }
    return count;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ABUSE DETECTION (v2 — Map<playerId, timestamps>)
  // ══════════════════════════════════════════════════════════════════════════

  private detectAbuse(input: Record<string, unknown>): { suspicious: boolean; reason: string } {
    const playerId = String(input.playerId ?? '');
    if (!playerId) return { suspicious: false, reason: '' };

    const now = Date.now();
    let timestamps = this.abuseByPlayer.get(playerId);
    if (!timestamps) {
      timestamps = [];
      this.abuseByPlayer.set(playerId, timestamps);
    }

    // Nettoie les timestamps hors fenêtre
    const cutoff = now - this.config.rateWindowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= this.config.rateMaxActions) {
      this.stats.rateLimitHits++;
      this.listeners.rateLimit.forEach((cb) => {
        try { cb(playerId, timestamps!.length); } catch { /* noop */ }
      });
      return {
        suspicious: true,
        reason: `Comportement suspect : ${timestamps.length} actions en ${this.config.rateWindowMs / 1000}s pour "${playerId}"`,
      };
    }

    // Push
    timestamps.push(now);

    // Cap global
    if (this.abuseByPlayer.size > this.config.abuseLogMax) {
      // Supprime les joueurs inactifs
      let toDelete = 0;
      const target = this.abuseByPlayer.size - this.config.abuseLogMax;
      for (const [id, ts] of this.abuseByPlayer) {
        if (ts.length === 0 || ts[ts.length - 1] < now - 60_000) {
          this.abuseByPlayer.delete(id);
          toDelete++;
          if (toDelete >= target) break;
        }
      }
    }

    return { suspicious: false, reason: '' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  VALIDATIONS
  // ══════════════════════════════════════════════════════════════════════════

  private validateKeyIntegrity(input: Record<string, unknown>): { valid: boolean; reason: string } {
    const keyId = String(input.keyId ?? '');
    if (!keyId) return { valid: true, reason: 'Pas de clé dans cette opération' };

    if (!this.config.keyIdPattern.test(keyId)) {
      return {
        valid: false,
        reason: `Format de clé invalide : "${keyId}" — attendu : key_{type}_{index}`,
      };
    }

    // Vérification existence + révocation
    const meta = this.keyRegistry.get(keyId);
    if (meta) {
      if (meta.revoked) {
        return { valid: false, reason: `Clé révoquée : "${keyId}" (${meta.revokedReason})` };
      }
      if (meta.expiresAt && Date.now() > meta.expiresAt) {
        return { valid: false, reason: `Clé expirée : "${keyId}"` };
      }
    }

    return { valid: true, reason: 'Format de clé valide' };
  }

  private validatePurchase(input: Record<string, unknown>): { valid: boolean; reason: string } {
    const priceRaw = input.price;
    const balanceRaw = input.playerBalance;

    const price = Number(priceRaw ?? 0);
    const balance = balanceRaw === undefined || balanceRaw === null
      ? Infinity
      : Number(balanceRaw);

    if (!Number.isFinite(price)) {
      return { valid: false, reason: `Prix non numérique : ${String(priceRaw)}` };
    }
    if (price < 0) {
      return { valid: false, reason: `Prix invalide : ${price} — exploitation possible` };
    }
    if (price > 0 && Number.isFinite(balance) && balance < price) {
      return { valid: false, reason: `Fonds insuffisants : solde ${balance} < prix ${price}` };
    }
    if (price > 100_000_000) {
      return { valid: false, reason: `Prix anormalement élevé : ${price}` };
    }
    return { valid: true, reason: 'Achat financièrement valide' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  VIOLATIONS & SANCTIONS
  // ══════════════════════════════════════════════════════════════════════════

  private recordViolation(
    playerId: string,
    action: string,
    reason: string,
    category: ViolationCategory,
    severity: RiskLevel,
  ): void {
    if (!playerId || playerId === 'unknown') return;

    const v: ViolationRecord = {
      timestamp: Date.now(),
      playerId,
      action,
      reason,
      category,
      severity,
    };

    let list = this.violationsByPlayer.get(playerId);
    if (!list) {
      list = [];
      this.violationsByPlayer.set(playerId, list);
    }
    list.push(v);

    // Cap
    if (list.length > 100) list.shift();

    this.stats.violationsTotal++;
    this.stats.violationsByCategory[category]++;

    // Émission event
    this.listeners.violation.forEach((cb) => {
      try { cb(v); } catch { /* noop */ }
    });

    // Sanctions
    if (list.length >= this.config.violationsForBan && !this.bannedPlayers.has(playerId)) {
      this.banPlayer(playerId, `Auto-ban : ${list.length} violations cumulées`);
    } else if (list.length >= this.config.violationsForWarn && !this.warnedPlayers.has(playerId)) {
      this.warnPlayer(playerId, `Auto-warn : ${list.length} violations cumulées`);
    }
  }

  /** 🆕 Bannit un joueur. */
  banPlayer(playerId: string, reason: string): void {
    this.bannedPlayers.add(playerId);
    this.stats.bansTotal++;
    this.listeners.banned.forEach((cb) => {
      try { cb(playerId, reason); } catch { /* noop */ }
    });
    console.warn(`🛡️ [EtherGuard] BAN : ${playerId} — ${reason}`);
  }

  /** 🆕 Warn un joueur. */
  warnPlayer(playerId: string, reason: string): void {
    this.warnedPlayers.add(playerId);
    this.stats.warnsTotal++;
    this.listeners.warned.forEach((cb) => {
      try { cb(playerId, reason); } catch { /* noop */ }
    });
    console.warn(`⚠️ [EtherGuard] WARN : ${playerId} — ${reason}`);
  }

  /** 🆕 Débannit un joueur. */
  unbanPlayer(playerId: string): boolean {
    const had = this.bannedPlayers.delete(playerId);
    if (had) this.violationsByPlayer.delete(playerId);
    return had;
  }

  /** 🆕 Retire un warn. */
  clearWarn(playerId: string): boolean {
    return this.warnedPlayers.delete(playerId);
  }

  public isBanned(playerId: string): boolean {
    return this.bannedPlayers.has(playerId);
  }

  public isWarned(playerId: string): boolean {
    return this.warnedPlayers.has(playerId);
  }

  public getPlayerViolations(playerId: string): ViolationRecord[] {
    return [...(this.violationsByPlayer.get(playerId) ?? [])];
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AUDIT TRAIL
  // ══════════════════════════════════════════════════════════════════════════

  private pushAudit(entry: AuditEntry): void {
    this.auditLog.push(entry);
    if (this.auditLog.length > this.config.auditLogMax) {
      this.auditLog = this.auditLog.slice(-this.config.auditLogMax);
    }
  }

  public getAuditLog(limit = 100): AuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  public getAuditForPlayer(playerId: string, limit = 50): AuditEntry[] {
    return this.auditLog.filter((a) => a.playerId === playerId).slice(-limit);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  EVENTS
  // ══════════════════════════════════════════════════════════════════════════

  onViolation(cb: (v: ViolationRecord) => void): () => void {
    this.listeners.violation.add(cb);
    return () => this.listeners.violation.delete(cb);
  }

  onRateLimit(cb: (playerId: string, count: number) => void): () => void {
    this.listeners.rateLimit.add(cb);
    return () => this.listeners.rateLimit.delete(cb);
  }

  onKeyIssued(cb: (key: KeyMetadata) => void): () => void {
    this.listeners.keyIssued.add(cb);
    return () => this.listeners.keyIssued.delete(cb);
  }

  onKeyRevoked(cb: (key: KeyMetadata) => void): () => void {
    this.listeners.keyRevoked.add(cb);
    return () => this.listeners.keyRevoked.delete(cb);
  }

  onBan(cb: (playerId: string, reason: string) => void): () => void {
    this.listeners.banned.add(cb);
    return () => this.listeners.banned.delete(cb);
  }

  onWarn(cb: (playerId: string, reason: string) => void): () => void {
    this.listeners.warned.add(cb);
    return () => this.listeners.warned.delete(cb);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  TELEMETRY (v1 compat)
  // ══════════════════════════════════════════════════════════════════════════

  getTelemetry(): AgentTelemetry {
    // Calcule un threatLevel global
    const threatLevel: ThreatLevel =
      this.stats.violationsTotal === 0 ? 'safe' :
      this.bannedPlayers.size > 0 ? 'critical' :
      this.warnedPlayers.size > 2 ? 'high' :
      this.stats.rateLimitHits > 5 ? 'medium' : 'low';

    return {
      agent: this.name,
      taskId: this.currentTask ?? 'idle',
      status: this.currentTask ? 'working' : 'pending',
      confidence: 0.93,
      riskLevel: threatLevel === 'safe' ? 'low' : threatLevel,
      estimatedCompletion: 'short',
      dependencies: [],
      timestamp: Date.now(),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════════════════════════════════════

  getStats() {
    // v1 compat fields
    return {
      tasksCompleted: this.tasksCompleted,
      currentTask: this.currentTask,
      keysRegistered: this.keyRegistry.size,
      abuseLogsCount: this.abuseByPlayer.size,

      // v2
      permissionChecks: this.stats.permissionChecks,
      permissionDenied: this.stats.permissionDenied,
      violationsTotal: this.stats.violationsTotal,
      violationsByCategory: { ...this.stats.violationsByCategory },
      rateLimitHits: this.stats.rateLimitHits,
      keysIssued: this.stats.keysIssued,
      keysRevoked: this.stats.keysRevoked,
      keysExpired: this.stats.keysExpired,
      activeKeys: Array.from(this.keyRegistry.values()).filter((k) => !k.revoked && (!k.expiresAt || Date.now() < k.expiresAt)).length,
      bannedPlayers: this.bannedPlayers.size,
      warnedPlayers: this.warnedPlayers.size,
      auditLogSize: this.auditLog.length,
      config: this.config,
    };
  }

  /** 🆕 Health check. */
  health(): { ok: boolean; reason?: string } {
    if (this.bannedPlayers.size > 50) return { ok: true, reason: 'many_bans' };
    if (this.stats.violationsTotal > 10_000) return { ok: false, reason: 'violation_storm' };
    if (this.keyRegistry.size > 100_000) return { ok: false, reason: 'key_registry_overflow' };
    if (this.abuseByPlayer.size > this.config.abuseLogMax) {
      return { ok: false, reason: 'abuse_log_overflow' };
    }
    return { ok: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DISPOSE
  // ══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.keyRegistry.clear();
    this.abuseByPlayer.clear();
    this.auditLog = [];
    this.violationsByPlayer.clear();
    this.warnedPlayers.clear();
    this.bannedPlayers.clear();
    this.listeners.violation.clear();
    this.listeners.rateLimit.clear();
    this.listeners.keyIssued.clear();
    this.listeners.keyRevoked.clear();
    this.listeners.banned.clear();
    this.listeners.warned.clear();
  }
}

export default EtherGuard;