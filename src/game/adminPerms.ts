/**
 * ═══════════════════════════════════════════════════════════
 * 🛡️ ETHERWORLD — SYSTÈME RBAC AVANCÉ (v3.0)
 * ═══════════════════════════════════════════════════════════
 * Architecture modulaire avec :
 *   - Permissions granulaires
 *   - Validation robuste
 *   - Indexation optimisée
 *   - Système d'événements
 *   - Anti-abuse renforcé
 */

import {
  AdminRole,
  ROLE_HIERARCHY,
  ROLE_LADDER,
  RpJobRole,
  Permission,
  ROLE_PERMISSIONS,
  parseAdminRole,
  parseRpJobRole,
  hasPermission as checkGranularPermission,
  type JobBadge,
  type RoleBadge,
  type StaffEntry,
  DispatchPriority,
  DispatchStatus,
  DispatchDepartmentTag,
  ReportStatus,
  type DispatchCall,
  type CriminalCharge,
  type Bounty,
  type ImpoundRecord,
  type PlayerReport,
} from "./adminTypes";

export { AdminRole, RpJobRole, ROLE_HIERARCHY, ROLE_LADDER, Permission, parseAdminRole, parseRpJobRole, DispatchPriority, DispatchStatus, DispatchDepartmentTag, ReportStatus };
export type { JobBadge, RoleBadge, StaffEntry, DispatchCall, CriminalCharge, Bounty, ImpoundRecord, PlayerReport };

// ═══════════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTES
// ═══════════════════════════════════════════════════════════

export const LOCAL_PLAYER_ID = "local_player";
const STORAGE_KEY = "etherworld_rbac_v3";

const LIMITS = {
  AUDIT_LOG: 500,
  BAN_HISTORY: 200,
  DISPATCH_LOG: 200,
  REPORT_LOG: 200,
  WARN_THRESHOLD: 3,
  AUTO_BAN_DAYS: 7,
} as const;

// Rate limiting par commande
const RATE_LIMITS: Record<string, { windowMs: number; max: number }> = {
  cash: { windowMs: 60_000, max: 5 },
  givecash: { windowMs: 60_000, max: 5 },
  givebank: { windowMs: 60_000, max: 5 },
  giveweapon: { windowMs: 60_000, max: 3 },
  ban: { windowMs: 300_000, max: 3 },
  kick: { windowMs: 60_000, max: 5 },
  smite: { windowMs: 30_000, max: 2 },
  etherpulse: { windowMs: 60_000, max: 1 },
  warn: { windowMs: 60_000, max: 5 },
  bounty: { windowMs: 60_000, max: 3 },
  "911": { windowMs: 30_000, max: 4 },
  report: { windowMs: 120_000, max: 3 },
  impound: { windowMs: 60_000, max: 5 },
  teleport: { windowMs: 10_000, max: 10 },
  heal: { windowMs: 30_000, max: 5 },
};

// ═══════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actorRole: AdminRole;
  command: string;
  args: string;
  targetId?: string;
  targetName?: string;
  success: boolean;
  reason?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export interface Sanction {
  id: string;
  type: "warn" | "kick" | "ban" | "mute" | "freeze" | "jail";
  targetId: string;
  targetName: string;
  moderatorId: string;
  moderatorName: string;
  reason: string;
  createdAt: number;
  expiresAt?: number;
  active: boolean;
  revokedBy?: string;
  revokedAt?: number;
  revokeReason?: string;
}

export interface DutyStatus {
  identifier: string;
  onDuty: boolean;
  clockedInAt: number;
  totalSecondsToday: number;
  totalSecondsAllTime: number;
  currentShiftStart?: number;
  lastUpdated: number;
}

export interface StaffMetrics {
  identifier: string;
  commandsExecuted: number;
  playersKicked: number;
  playersBanned: number;
  playersWarned: number;
  playersHealed: number;
  reportsResolved: number;
  lastActivityAt: number;
  hoursOnDuty: number;
  reputation: number; // Score de confiance
}

export interface JobRank {
  jobId: RpJobRole;
  currentRank: number;
  maxRank: number;
  rankName: string;
  yearsService: number;
  promotionsCount: number;
  formationsCompleted: string[];
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

// ═══════════════════════════════════════════════════════════
// RANGS DE MÉTIERS
// ═══════════════════════════════════════════════════════════

export const JOB_RANKS: Partial<Record<RpJobRole, string[]>> = {
  [RpJobRole.POLICE_OFFICER]: ["Cadet", "Constable", "Constable Senior", "Sergent", "Lieutenant"],
  [RpJobRole.POLICE_CHIEF]: ["Capitaine", "Inspecteur-Chef", "Directeur Adjoint", "Chef SQ"],
  [RpJobRole.PARAMEDIC]: ["Stagiaire", "Paramédic PR-1", "Paramédic PR-3", "Chef d'équipe", "Coordonnateur"],
  [RpJobRole.MEDIC_DIRECTOR]: ["Médecin résident", "Médecin senior", "Chef de service", "Directeur médical"],
  [RpJobRole.MECHANIC]: ["Apprenti", "Compagnon", "Mécanicien certifié CAA", "Contremaître", "Propriétaire"],
  [RpJobRole.JUDGE]: ["Stagiaire", "Notaire", "Juge de paix", "Juge en chef"],
  [RpJobRole.MAYOR]: ["Conseiller municipal", "Maire suppléant", "Maire"],
  [RpJobRole.DISPENSARY_OWNER]: ["Employé caissier", "Gérant", "Propriétaire SQDC"],
};

// ═══════════════════════════════════════════════════════════
// ROSTER PAR DÉFAUT
// ═══════════════════════════════════════════════════════════

export const DEFAULT_ROSTER: StaffEntry[] = [
  { identifier: LOCAL_PLAYER_ID, displayName: "Citoyen", role: AdminRole.INTELLECTUS_AI, job: RpJobRole.ETHER_ARCHITECT },
  { identifier: "admin_1", displayName: "Capitaine Gosselin", role: AdminRole.SUPERADMIN, job: RpJobRole.POLICE_CHIEF },
  { identifier: "head_1", displayName: "Maire Tremblay", role: AdminRole.HEAD_ADMIN, job: RpJobRole.MAYOR },
  { identifier: "mod_1", displayName: "Agent Bouchard", role: AdminRole.MOD, job: RpJobRole.POLICE_OFFICER },
  { identifier: "helper_1", displayName: "Helper Lavoie", role: AdminRole.HELPER, job: RpJobRole.CIVILIAN },
];

// ═══════════════════════════════════════════════════════════
// COMMANDES PAR NIVEAU (Classification)
// ═══════════════════════════════════════════════════════════

const COMMAND_GROUPS = {
  NONE: new Set([
    "help", "aide", "h", "pos", "coords", "gps", "lieux", "list", "zone", "secteur", "sol",
    "say", "chat", "me", "radio", "fm", "walk", "drive", "camera", "cam", "inv", "inventory",
    "jobs", "emplois", "outfit", "tenue", "aura", "model", "modele", "face", "skin", "pack",
    "sac", "tool", "outil", "tv", "bell", "lights", "elev", "elevator", "floor", "etage",
    "siren", "gyro", "gyrophare", "lightbar", "patrouille", "unites", "amende", "amendes",
    "payer", "boire", "emote", "geste", "911", "dispatch", "sos", "bounties", "primes",
    "diag", "perf", "telemetrie", "alerts", "releasecar", "recuperer", "loan", "pret",
    "invest", "placement", "mls", "immo", "immobilier", "firm", "entreprise", "req", "hire",
    "embaucher", "mapaq", "grant", "subvention", "semer", "seed", "graines", "dutystatus",
  ]),
  HELPER: new Set([
    "status", "stats", "whoami", "staffchat", "sc", "staff", "ooc", "duty", "goduty",
    "stafflist", "staffs", "warn", "warnings", "job", "emploi", "metier", "gang", "report",
    "reports", "signaler", "warns", "sanctions", "calls",
  ]),
  MOD: new Set([
    "kick", "mute", "unmute", "jail", "unjail", "freeze", "unfreeze", "degeler", "dégeler",
    "vanish", "invis", "ghost", "slap", "heal", "revive", "hurt", "blesse", "wanted",
    "etoiles", "stars", "clear", "code4", "arrest", "arrestation", "ticket", "constat",
    "contraven", "alcotest", "ethylotest", "éthylotest", "breathalyzer", "radar", "book",
    "ecrouer", "lockdown", "confinement", "release", "liberer", "prison", "penitencier",
    "cellule", "announce", "audit", "respond", "10-4", "onscene", "surplace", "clear911",
    "codegreen", "record", "casier", "rapsheet", "impound", "fourriere", "fourrière",
    "impoundlot", "fourrierelot", "bounty", "prime", "claimbounty", "encaisser",
  ]),
  SUPER: new Set([
    "kit", "ban", "unban", "kickall", "etherpulse", "pulse", "smite", "foudre", "maxstats",
    "event", "givecash", "givebank", "giveweapon", "gw", "godmode", "god",
  ]),
  HEAD: new Set([
    "promote", "promo", "rankup", "demote", "rankdown", "setrole", "setrank", "grade",
    "setrpjob", "setjobrole", "export", "import", "reset",
  ]),
} as const;

// ═══════════════════════════════════════════════════════════
// SYSTÈME D'ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════

type EventCallback = (data: unknown) => void;
const eventListeners = new Map<string, Set<EventCallback>>();

function emitEvent(eventName: string, data: unknown): void {
  const listeners = eventListeners.get(eventName);
  if (listeners) {
    listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[RBAC] Event listener error for ${eventName}:`, err);
      }
    });
  }
}

export function onEvent(eventName: string, callback: EventCallback): () => void {
  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, new Set());
  }
  eventListeners.get(eventName)!.add(callback);
  return () => eventListeners.get(eventName)?.delete(callback);
}

// ═══════════════════════════════════════════════════════════
// STATE INTERNE AVEC INDEXATION
// ═══════════════════════════════════════════════════════════

class RBACState {
  private userRoles = new Map<string, AdminRole>();
  private userJobs = new Map<string, RpJobRole>();
  private userNames = new Map<string, string>();
  private userDuty = new Map<string, DutyStatus>();
  private userMetrics = new Map<string, StaffMetrics>();
  private userRanks = new Map<string, JobRank>();
  private auditLog: AuditLogEntry[] = [];
  private sanctionsLog: Sanction[] = [];
  private rateLimitBuckets = new Map<string, number[]>();
  private dispatchCalls: DispatchCall[] = [];
  private criminalRecords = new Map<string, CriminalCharge[]>();
  private bounties: Bounty[] = [];
  private impoundLot: ImpoundRecord[] = [];
  private playerReports: PlayerReport[] = [];

  // Index pour recherche rapide
  private sanctionsByTarget = new Map<string, Set<string>>();
  private reportsByStatus = new Map<ReportStatus, Set<string>>();

  constructor() {
    this.initIndexes();
  }

  private initIndexes(): void {
    for (const status of Object.values(ReportStatus)) {
      this.reportsByStatus.set(status, new Set());
    }
  }

  // Getters
  getRole(id: string): AdminRole {
    return this.userRoles.get(id) ?? AdminRole.NONE;
  }

  getJob(id: string): RpJobRole {
    return this.userJobs.get(id) ?? RpJobRole.CIVILIAN;
  }

  getName(id: string): string {
    return this.userNames.get(id) ?? id;
  }

  getDuty(id: string): DutyStatus | null {
    return this.userDuty.get(id) ?? null;
  }

  getMetrics(id: string): StaffMetrics {
    let m = this.userMetrics.get(id);
    if (!m) {
      m = {
        identifier: id,
        commandsExecuted: 0,
        playersKicked: 0,
        playersBanned: 0,
        playersWarned: 0,
        playersHealed: 0,
        reportsResolved: 0,
        lastActivityAt: 0,
        hoursOnDuty: 0,
        reputation: 100,
      };
      this.userMetrics.set(id, m);
    }
    return m;
  }

  // Setters
  setRole(id: string, role: AdminRole): void {
    this.userRoles.set(id, role);
    emitEvent("roleChange", { id, role });
  }

  setJob(id: string, job: RpJobRole): void {
    this.userJobs.set(id, job);
    if (!this.userRanks.has(id) && JOB_RANKS[job]) {
      this.userRanks.set(id, {
        jobId: job,
        currentRank: 0,
        maxRank: (JOB_RANKS[job]?.length ?? 1) - 1,
        rankName: JOB_RANKS[job]?.[0] ?? "Recrue",
        yearsService: 0,
        promotionsCount: 0,
        formationsCompleted: [],
      });
    }
    emitEvent("jobChange", { id, job });
  }

  setName(id: string, name: string): void {
    this.userNames.set(id, name);
  }

  setDuty(id: string, duty: DutyStatus): void {
    this.userDuty.set(id, duty);
  }

  updateMetrics(id: string, updates: Partial<StaffMetrics>): void {
    const m = this.getMetrics(id);
    Object.assign(m, updates);
    this.userMetrics.set(id, m);
  }

  // Audit Log
  addAuditEntry(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
    if (this.auditLog.length > LIMITS.AUDIT_LOG) {
      this.auditLog.splice(0, this.auditLog.length - LIMITS.AUDIT_LOG);
    }
    emitEvent("audit", entry);
  }

  getAuditLog(filters?: {
    actorId?: string;
    targetId?: string;
    command?: string;
    limit?: number;
  }): AuditLogEntry[] {
    let result = [...this.auditLog];
    if (filters?.actorId) result = result.filter((e) => e.actorId === filters.actorId);
    if (filters?.targetId) result = result.filter((e) => e.targetId === filters.targetId);
    if (filters?.command) result = result.filter((e) => e.command === filters.command);
    result.sort((a, b) => b.timestamp - a.timestamp);
    return result.slice(0, filters?.limit ?? 100);
  }

  // Sanctions
  addSanction(sanction: Sanction): void {
    this.sanctionsLog.push(sanction);
    if (this.sanctionsLog.length > LIMITS.BAN_HISTORY) {
      this.sanctionsLog.splice(0, this.sanctionsLog.length - LIMITS.BAN_HISTORY);
    }
    // Index
    if (!this.sanctionsByTarget.has(sanction.targetId)) {
      this.sanctionsByTarget.set(sanction.targetId, new Set());
    }
    this.sanctionsByTarget.get(sanction.targetId)!.add(sanction.id);
    emitEvent("sanction", sanction);
  }

  getSanctions(targetId: string): Sanction[] {
    const ids = this.sanctionsByTarget.get(targetId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.sanctionsLog.find((s) => s.id === id))
      .filter((s): s is Sanction => s !== undefined);
  }

  getActiveWarns(targetId: string): Sanction[] {
    const now = Date.now();
    return this.getSanctions(targetId).filter(
      (s) => s.type === "warn" && s.active && (!s.expiresAt || s.expiresAt > now)
    );
  }

  isBanned(targetId: string): Sanction | null {
    const now = Date.now();
    return (
      this.getSanctions(targetId).find(
        (s) => s.type === "ban" && s.active && (!s.expiresAt || s.expiresAt > now)
      ) ?? null
    );
  }

  isMuted(targetId: string): Sanction | null {
    const now = Date.now();
    return (
      this.getSanctions(targetId).find(
        (s) => s.type === "mute" && s.active && (!s.expiresAt || s.expiresAt > now)
      ) ?? null
    );
  }

  updateSanction(id: string, updates: Partial<Sanction>): boolean {
    const s = this.sanctionsLog.find((s) => s.id === id);
    if (!s) return false;
    Object.assign(s, updates);
    emitEvent("sanctionUpdate", s);
    return true;
  }

  // Reports
  addReport(report: PlayerReport): void {
    this.playerReports.unshift(report);
    if (this.playerReports.length > LIMITS.REPORT_LOG) {
      this.playerReports.length = LIMITS.REPORT_LOG;
    }
    this.reportsByStatus.get(report.status)?.add(report.id);
    emitEvent("report", report);
  }

  getReports(status?: ReportStatus): PlayerReport[] {
    if (!status) return [...this.playerReports];
    const ids = this.reportsByStatus.get(status);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.playerReports.find((r) => r.id === id))
      .filter((r): r is PlayerReport => r !== undefined);
  }

  updateReport(id: string, updates: Partial<PlayerReport>): boolean {
    const r = this.playerReports.find((r) => r.id === id);
    if (!r) return false;
    const oldStatus = r.status;
    Object.assign(r, updates);
    if (updates.status && updates.status !== oldStatus) {
      this.reportsByStatus.get(oldStatus)?.delete(id);
      this.reportsByStatus.get(updates.status)?.add(id);
    }
    emitEvent("reportUpdate", r);
    return true;
  }

  // Dispatch
  addDispatchCall(call: DispatchCall): void {
    this.dispatchCalls.unshift(call);
    if (this.dispatchCalls.length > LIMITS.DISPATCH_LOG) {
      this.dispatchCalls.length = LIMITS.DISPATCH_LOG;
    }
    emitEvent("dispatch", call);
  }

  getActiveDispatchCalls(department?: DispatchDepartmentTag): DispatchCall[] {
    return this.dispatchCalls.filter(
      (c) =>
        c.status !== DispatchStatus.RESOLVED &&
        c.status !== DispatchStatus.CANCELLED &&
        (!department || department === DispatchDepartmentTag.TOUS || c.department === department)
    );
  }

  updateDispatchCall(id: string, updates: Partial<DispatchCall>): boolean {
    const c = this.dispatchCalls.find((c) => c.id === id);
    if (!c) return false;
    Object.assign(c, updates);
    emitEvent("dispatchUpdate", c);
    return true;
  }

  // Criminal Records
  addCriminalCharge(targetId: string, charge: CriminalCharge): void {
    if (!this.criminalRecords.has(targetId)) {
      this.criminalRecords.set(targetId, []);
    }
    this.criminalRecords.get(targetId)!.unshift(charge);
    emitEvent("criminalCharge", { targetId, charge });
  }

  getCriminalRecord(targetId: string): CriminalCharge[] {
    return this.criminalRecords.get(targetId) ?? [];
  }

  // Bounties
  addBounty(bounty: Bounty): void {
    this.bounties.unshift(bounty);
    emitEvent("bounty", bounty);
  }

  getActiveBounties(): Bounty[] {
    return this.bounties.filter((b) => b.active);
  }

  updateBounty(id: string, updates: Partial<Bounty>): boolean {
    const b = this.bounties.find((b) => b.id === id);
    if (!b) return false;
    Object.assign(b, updates);
    emitEvent("bountyUpdate", b);
    return true;
  }

  // Impound
  addImpoundRecord(record: ImpoundRecord): void {
    this.impoundLot.push(record);
    emitEvent("impound", record);
  }

  getImpoundRecords(ownerId?: string): ImpoundRecord[] {
    return this.impoundLot.filter((r) => !r.releasedAt && (!ownerId || r.ownerId === ownerId));
  }

  updateImpoundRecord(id: string, updates: Partial<ImpoundRecord>): boolean {
    const r = this.impoundLot.find((r) => r.id === id);
    if (!r) return false;
    Object.assign(r, updates);
    emitEvent("impoundUpdate", r);
    return true;
  }

  // Rate Limiting
  checkRateLimit(id: string, command: string): { allowed: boolean; retryAfterMs?: number } {
    const limit = RATE_LIMITS[command];
    if (!limit) return { allowed: true };

    const key = `${id}:${command}`;
    const now = Date.now();
    const bucket = this.rateLimitBuckets.get(key) ?? [];
    const recent = bucket.filter((t) => now - t < limit.windowMs);

    if (recent.length >= limit.max) {
      const oldestValid = recent[0]!;
      const retryAfterMs = limit.windowMs - (now - oldestValid);
      return { allowed: false, retryAfterMs };
    }

    recent.push(now);
    this.rateLimitBuckets.set(key, recent);
    return { allowed: true };
  }

  // Snapshot
  snapshotStaff(): StaffEntry[] {
    const ids = new Set([...this.userRoles.keys(), ...this.userJobs.keys()]);
    const out: StaffEntry[] = [];
    for (const id of ids) {
      const role = this.getRole(id);
      if (role === AdminRole.NONE && id !== LOCAL_PLAYER_ID) continue;
      out.push({
        identifier: id,
        displayName: this.getName(id),
        role,
        job: this.getJob(id),
      });
    }
    out.sort((a, b) => ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role]);
    return out;
  }

  // Clear
  clear(): void {
    this.userRoles.clear();
    this.userJobs.clear();
    this.userNames.clear();
    this.userDuty.clear();
    this.userMetrics.clear();
    this.userRanks.clear();
    this.auditLog.length = 0;
    this.sanctionsLog.length = 0;
    this.rateLimitBuckets.clear();
    this.dispatchCalls.length = 0;
    this.criminalRecords.clear();
    this.bounties.length = 0;
    this.impoundLot.length = 0;
    this.playerReports.length = 0;
    this.sanctionsByTarget.clear();
    this.initIndexes();
  }

  // Import/Export
  export(): string {
    return JSON.stringify(
      {
        version: 3,
        roster: this.snapshotStaff(),
        auditLog: this.auditLog,
        sanctions: this.sanctionsLog,
        duty: Array.from(this.userDuty.entries()),
        metrics: Array.from(this.userMetrics.entries()),
        ranks: Array.from(this.userRanks.entries()),
        dispatch: this.dispatchCalls,
        criminalRecords: Array.from(this.criminalRecords.entries()),
        bounties: this.bounties,
        impoundLot: this.impoundLot,
        reports: this.playerReports,
        exportedAt: Date.now(),
      },
      null,
      2
    );
  }

  import(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (!data || typeof data !== "object") return false;

      this.clear();

      if (Array.isArray(data.roster)) {
        for (const e of data.roster) {
          this.setRole(e.identifier, e.role);
          this.setJob(e.identifier, e.job);
          this.setName(e.identifier, e.displayName);
        }
      }
      if (Array.isArray(data.auditLog)) this.auditLog.push(...data.auditLog);
      if (Array.isArray(data.sanctions)) {
        for (const s of data.sanctions) {
          this.sanctionsLog.push(s);
          if (!this.sanctionsByTarget.has(s.targetId)) {
            this.sanctionsByTarget.set(s.targetId, new Set());
          }
          this.sanctionsByTarget.get(s.targetId)!.add(s.id);
        }
      }
      if (Array.isArray(data.duty)) {
        for (const [id, ds] of data.duty) this.userDuty.set(id, ds);
      }
      if (Array.isArray(data.metrics)) {
        for (const [id, m] of data.metrics) this.userMetrics.set(id, m);
      }
      if (Array.isArray(data.ranks)) {
        for (const [id, r] of data.ranks) this.userRanks.set(id, r);
      }
      if (Array.isArray(data.dispatch)) this.dispatchCalls.push(...data.dispatch);
      if (Array.isArray(data.criminalRecords)) {
        for (const [id, charges] of data.criminalRecords) this.criminalRecords.set(id, charges);
      }
      if (Array.isArray(data.bounties)) this.bounties.push(...data.bounties);
      if (Array.isArray(data.impoundLot)) this.impoundLot.push(...data.impoundLot);
      if (Array.isArray(data.reports)) {
        for (const r of data.reports) {
          this.playerReports.push(r);
          this.reportsByStatus.get(r.status)?.add(r.id);
        }
      }

      emitEvent("import", { success: true });
      return true;
    } catch (err) {
      console.error("[RBAC] Import error:", err);
      emitEvent("import", { success: false, error: err });
      return false;
    }
  }
}

// Singleton instance
const state = new RBACState();

// ═══════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════

function validateId(id: unknown): ValidationResult<string> {
  if (typeof id !== "string" || !id.trim()) {
    return { valid: false, errors: ["ID invalide"] };
  }
  return { valid: true, data: id.trim() };
}

function validateAmount(amount: unknown): ValidationResult<number> {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return { valid: false, errors: ["Montant invalide"] };
  }
  return { valid: true, data: amount };
}

function validatePermission(actorId: string, permission: Permission): ValidationResult<void> {
  const role = state.getRole(actorId);
  if (!checkGranularPermission(role, permission)) {
    return { valid: false, errors: [`Permission refusée: ${permission}`] };
  }
  return { valid: true };
}

function validateTarget(actorId: string, targetId: string): ValidationResult<void> {
  if (actorId === targetId) return { valid: true };

  const actorRole = state.getRole(actorId);
  const targetRole = state.getRole(targetId);

  if (actorRole === AdminRole.INTELLECTUS_AI || actorRole === AdminRole.OWNER) {
    return { valid: true };
  }

  if ((ROLE_HIERARCHY[actorRole] ?? 0) <= (ROLE_HIERARCHY[targetRole] ?? 0)) {
    return { valid: false, errors: ["Vous ne pouvez pas agir sur ce joueur (rang supérieur)"] };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// PERSISTANCE
// ═══════════════════════════════════════════════════════════

function saveState(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, state.export());
  } catch (err) {
    console.warn("[RBAC] Save error:", err);
  }
}

function loadState(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return state.import(raw);
  } catch (err) {
    console.warn("[RBAC] Load error:", err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════

function seed(entry: StaffEntry): void {
  state.setRole(entry.identifier, entry.role);
  state.setJob(entry.identifier, entry.job);
  state.setName(entry.identifier, entry.displayName);
}

if (!loadState()) {
  for (const e of DEFAULT_ROSTER) seed(e);
  saveState();
}

// ═══════════════════════════════════════════════════════════
// API PUBLIQUE
// ═══════════════════════════════════════════════════════════

export function hydrateStaff(roster: StaffEntry[] | null | undefined, localRole?: AdminRole): void {
  state.clear();
  const list = roster && roster.length ? roster : DEFAULT_ROSTER;
  for (const e of list) seed(e);
  if (localRole) state.setRole(LOCAL_PLAYER_ID, localRole);
  saveState();
}

export function snapshotStaff(): StaffEntry[] {
  return state.snapshotStaff();
}

export function parseStaffRoster(raw: unknown): StaffEntry[] {
  if (!Array.isArray(raw)) return DEFAULT_ROSTER.map((e) => ({ ...e }));
  const out: StaffEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const idVal = validateId(r.identifier);
    if (!idVal.valid || !idVal.data) continue;
    const role = parseAdminRole(r.role) ?? AdminRole.NONE;
    const job = parseRpJobRole(r.job) ?? RpJobRole.CIVILIAN;
    const displayName = typeof r.displayName === "string" ? r.displayName : idVal.data;
    out.push({ identifier: idVal.data, displayName, role, job });
  }
  return out.length ? out : DEFAULT_ROSTER.map((e) => ({ ...e }));
}

export function setDisplayName(identifier: string, name: string): void {
  const v = validateId(identifier);
  if (!v.valid) return;
  state.setName(v.data!, name);
  saveState();
}

export function getDisplayName(identifier: string): string {
  return state.getName(identifier);
}

export function getUserRole(identifier: string): AdminRole {
  return state.getRole(identifier);
}

export function setUserRole(identifier: string, role: AdminRole): void {
  const v = validateId(identifier);
  if (!v.valid) return;
  state.setRole(v.data!, role);
  saveState();
}

export function getUserJob(identifier: string): RpJobRole {
  return state.getJob(identifier);
}

export function setUserJob(identifier: string, job: RpJobRole): void {
  const v = validateId(identifier);
  if (!v.valid) return;
  state.setJob(v.data!, job);
  saveState();
}

export function getAllStaffMembers(): StaffEntry[] {
  return snapshotStaff();
}

// ═══════════════════════════════════════════════════════════
// PROMOTION / RÉTROGRADATION
// ═══════════════════════════════════════════════════════════

export function promoteUser(identifier: string, actorId?: string): AdminRole {
  const current = state.getRole(identifier);
  const idx = ROLE_LADDER.indexOf(current);
  if (idx >= 0 && idx < ROLE_LADDER.length - 1) {
    const next = ROLE_LADDER[idx + 1]!;
    state.setRole(identifier, next);
    logAudit({
      actorId: actorId ?? "system",
      command: "promote",
      args: `${next}`,
      targetId: identifier,
      success: true,
    });
    saveState();
    return next;
  }
  return current;
}

export function demoteUser(identifier: string, actorId?: string): AdminRole {
  const current = state.getRole(identifier);
  const idx = ROLE_LADDER.indexOf(current);
  if (idx > 0) {
    const prev = ROLE_LADDER[idx - 1]!;
    state.setRole(identifier, prev);
    logAudit({
      actorId: actorId ?? "system",
      command: "demote",
      args: `${prev}`,
      targetId: identifier,
      success: true,
    });
    saveState();
    return prev;
  }
  return current;
}

// ═══════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════

export function hasPermission(userRole: AdminRole, requiredRole: AdminRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function checkPermission(identifier: string, requiredRole: AdminRole): boolean {
  return hasPermission(state.getRole(identifier), requiredRole);
}

export function canPerform(identifier: string, permission: Permission): boolean {
  const role = state.getRole(identifier);
  return checkGranularPermission(role, permission);
}

export function canChangeRole(actorId: string, targetNext: AdminRole): boolean {
  const actor = state.getRole(actorId);
  if (!hasPermission(actor, AdminRole.HEAD_ADMIN)) return false;
  if (actor === AdminRole.INTELLECTUS_AI) return true;
  return ROLE_HIERARCHY[targetNext] < ROLE_HIERARCHY[actor];
}

export function requiredRoleFor(cmd: string): AdminRole {
  if (COMMAND_GROUPS.NONE.has(cmd)) return AdminRole.NONE;
  if (COMMAND_GROUPS.HELPER.has(cmd)) return AdminRole.HELPER;
  if (COMMAND_GROUPS.MOD.has(cmd)) return AdminRole.MOD;
  if (COMMAND_GROUPS.SUPER.has(cmd)) return AdminRole.SUPERADMIN;
  if (COMMAND_GROUPS.HEAD.has(cmd)) return AdminRole.HEAD_ADMIN;
  return AdminRole.ADMIN;
}

// ═══════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════

export function checkRateLimit(identifier: string, command: string): { allowed: boolean; retryAfterMs?: number } {
  return state.checkRateLimit(identifier, command);
}

// ═══════════════════════════════════════════════════════════
// DUTY
// ═══════════════════════════════════════════════════════════

export function toggleDuty(identifier: string): DutyStatus {
  const now = Date.now();
  let ds = state.getDuty(identifier);
  if (!ds) {
    ds = {
      identifier,
      onDuty: false,
      clockedInAt: 0,
      totalSecondsToday: 0,
      totalSecondsAllTime: 0,
      lastUpdated: now,
    };
  }

  if (ds.onDuty) {
    const shiftSec = ds.currentShiftStart ? Math.floor((now - ds.currentShiftStart) / 1000) : 0;
    ds.totalSecondsToday += shiftSec;
    ds.totalSecondsAllTime += shiftSec;
    ds.onDuty = false;
    ds.currentShiftStart = undefined;
  } else {
    ds.onDuty = true;
    ds.clockedInAt = now;
    ds.currentShiftStart = now;
  }

  ds.lastUpdated = now;
  state.setDuty(identifier, ds);
  saveState();
  emitEvent("dutyToggle", { identifier, onDuty: ds.onDuty });
  return ds;
}

export function getDutyStatus(identifier: string): DutyStatus | null {
  return state.getDuty(identifier);
}

export function isOnDuty(identifier: string): boolean {
  return state.getDuty(identifier)?.onDuty ?? false;
}

// ═══════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════

export function logAudit(entry: Partial<AuditLogEntry> & { actorId: string; command: string }): void {
  const now = Date.now();
  const actorRole = state.getRole(entry.actorId);
  const full: AuditLogEntry = {
    id: `audit_${now}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    actorId: entry.actorId,
    actorName: state.getName(entry.actorId),
    actorRole,
    command: entry.command,
    args: entry.args ?? "",
    targetId: entry.targetId,
    targetName: entry.targetId ? state.getName(entry.targetId) : undefined,
    success: entry.success ?? true,
    reason: entry.reason,
    ip: entry.ip,
    metadata: entry.metadata,
  };

  state.addAuditEntry(full);
  state.updateMetrics(entry.actorId, {
    commandsExecuted: state.getMetrics(entry.actorId).commandsExecuted + 1,
    lastActivityAt: now,
  });

  saveState();
}

export function getAuditLog(filters?: {
  actorId?: string;
  targetId?: string;
  command?: string;
  limit?: number;
}): AuditLogEntry[] {
  return state.getAuditLog(filters);
}

// ═══════════════════════════════════════════════════════════
// SANCTIONS
// ═══════════════════════════════════════════════════════════

export function issueSanction(sanction: Omit<Sanction, "id" | "createdAt" | "active">): Sanction {
  const now = Date.now();
  const full: Sanction = {
    id: `sanct_${now}_${Math.random().toString(36).substr(2, 6)}`,
    createdAt: now,
    active: true,
    ...sanction,
  };

  state.addSanction(full);

  // Update metrics
  const metrics = state.getMetrics(sanction.moderatorId);
  if (sanction.type === "kick") metrics.playersKicked++;
  else if (sanction.type === "ban") metrics.playersBanned++;
  else if (sanction.type === "warn") {
    metrics.playersWarned++;
    const warnsCount = state.getActiveWarns(sanction.targetId).length;
    if (warnsCount >= LIMITS.WARN_THRESHOLD) {
      issueSanction({
        type: "ban",
        targetId: sanction.targetId,
        targetName: sanction.targetName,
        moderatorId: "system",
        moderatorName: "SYSTÈME AUTO",
        reason: `Ban automatique après ${LIMITS.WARN_THRESHOLD} warns cumulés`,
        expiresAt: now + LIMITS.AUTO_BAN_DAYS * 24 * 60 * 60 * 1000,
      });
    }
  }
  state.updateMetrics(sanction.moderatorId, metrics);

  logAudit({
    actorId: sanction.moderatorId,
    command: sanction.type,
    args: sanction.reason,
    targetId: sanction.targetId,
    success: true,
  });

  saveState();
  return full;
}

export function revokeSanction(sanctionId: string, moderatorId: string, reason: string): boolean {
  const s = state.getSanctions("").find((s) => s.id === sanctionId);
  if (!s || !s.active) return false;
  const success = state.updateSanction(sanctionId, {
    active: false,
    revokedBy: moderatorId,
    revokedAt: Date.now(),
    revokeReason: reason,
  });
  if (success) saveState();
  return success;
}

export function getActiveWarns(identifier: string): Sanction[] {
  return state.getActiveWarns(identifier);
}

export function isBanned(identifier: string): Sanction | null {
  return state.isBanned(identifier);
}

export function isMuted(identifier: string): Sanction | null {
  return state.isMuted(identifier);
}

export function getSanctionHistory(identifier: string): Sanction[] {
  return state.getSanctions(identifier).sort((a, b) => b.createdAt - a.createdAt);
}

// ═══════════════════════════════════════════════════════════
// MÉTRIQUES
// ═══════════════════════════════════════════════════════════

export function getStaffMetrics(identifier: string): StaffMetrics {
  const m = state.getMetrics(identifier);
  const ds = state.getDuty(identifier);
  if (ds) m.hoursOnDuty = ds.totalSecondsAllTime / 3600;
  return m;
}

// ═══════════════════════════════════════════════════════════
// RANGS DE CARRIÈRE
// ═══════════════════════════════════════════════════════════

export function getJobRank(identifier: string): JobRank | null {
  return null; // TODO: Implement
}

export function promoteJobRank(identifier: string): boolean {
  return false; // TODO: Implement
}

// ═══════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════

export function resolveStaffId(raw: string): string {
  const q = raw.trim().toLowerCase();
  if (!q || q === "me" || q === "self" || q === "moi" || q === "local" || q === LOCAL_PLAYER_ID) {
    return LOCAL_PLAYER_ID;
  }
  for (const e of snapshotStaff()) {
    if (e.identifier.toLowerCase() === q) return e.identifier;
    if (e.displayName.toLowerCase() === q) return e.identifier;
    if (e.displayName.toLowerCase().includes(q)) return e.identifier;
  }
  return raw.trim();
}

export function rpJobToRole(id: string): RpJobRole {
  const map: Record<string, RpJobRole> = {
    policier: RpJobRole.POLICE_OFFICER,
    ambulancier: RpJobRole.PARAMEDIC,
    mecanicien: RpJobRole.MECHANIC,
    avocat: RpJobRole.JUDGE,
    commercant: RpJobRole.DISPENSARY_OWNER,
    criminel: RpJobRole.GANGSTER,
  };
  return map[id] ?? RpJobRole.CIVILIAN;
}

// ═══════════════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════════════

export function getRoleBadgeStyle(role: AdminRole): RoleBadge {
  const styles: Record<AdminRole, RoleBadge> = {
    [AdminRole.INTELLECTUS_AI]: { label: "INTELLECTUS", color: "text-accent", bg: "bg-surface-2", border: "border-accent" },
    [AdminRole.DEVELOPER]: { label: "LEAD DEV", color: "text-fg", bg: "bg-surface-2", border: "border-border-strong" },
    [AdminRole.OWNER]: { label: "FONDATEUR", color: "text-fg", bg: "bg-surface-2", border: "border-border-strong" },
    [AdminRole.HEAD_ADMIN]: { label: "HEAD ADMIN", color: "text-danger", bg: "bg-surface-2", border: "border-danger" },
    [AdminRole.SUPERADMIN]: { label: "SUPERADMIN", color: "text-danger", bg: "bg-surface-2", border: "border-danger" },
    [AdminRole.ADMIN]: { label: "ADMIN", color: "text-accent", bg: "bg-surface-2", border: "border-accent" },
    [AdminRole.MOD]: { label: "MODÉRATEUR", color: "text-accent", bg: "bg-surface-2", border: "border-border-strong" },
    [AdminRole.HELPER]: { label: "HELPER", color: "text-ok", bg: "bg-surface-2", border: "border-ok" },
    [AdminRole.NONE]: { label: "CITOYEN", color: "text-muted", bg: "bg-surface-2", border: "border-border" },
    [AdminRole.TRIAL_HELPER]: { label: "STAGIAIRE", color: "text-ok", bg: "bg-surface-2", border: "border-ok" },
    [AdminRole.TRIAL_MOD]: { label: "MODO ESSAI", color: "text-accent", bg: "bg-surface-2", border: "border-border-strong" },
    [AdminRole.SENIOR_MOD]: { label: "MODO SENIOR", color: "text-accent", bg: "bg-surface-2", border: "border-border-strong" },
    [AdminRole.COMMUNITY_MANAGER]: { label: "COMMUNITY", color: "text-accent", bg: "bg-surface-2", border: "border-accent" },
    [AdminRole.EVENT_MANAGER]: { label: "EVENT", color: "text-accent", bg: "bg-surface-2", border: "border-accent" },
    [AdminRole.SENIOR_DEV]: { label: "DEV SENIOR", color: "text-fg", bg: "bg-surface-2", border: "border-border-strong" },
  };
  return styles[role] ?? styles[AdminRole.NONE];
}

export function getJobBadgeStyle(job: RpJobRole): JobBadge {
  const styles: Partial<Record<RpJobRole, JobBadge>> = {
    [RpJobRole.POLICE_CHIEF]: { label: "CHEF SQ", color: "text-accent" },
    [RpJobRole.POLICE_OFFICER]: { label: "OFFICIER SQ", color: "text-accent" },
    [RpJobRole.SECRET_AGENT]: { label: "AGENT INFILTRÉ", color: "text-muted" },
    [RpJobRole.MEDIC_DIRECTOR]: { label: "DIRECTEUR URGENCES", color: "text-danger" },
    [RpJobRole.PARAMEDIC]: { label: "PARAMÉDIC", color: "text-danger" },
    [RpJobRole.MECHANIC]: { label: "MÉCANICIEN", color: "text-muted" },
    [RpJobRole.MAFIA_BOSS]: { label: "PARRAIN", color: "text-danger" },
    [RpJobRole.GANGSTER]: { label: "GANGSTER", color: "text-danger" },
    [RpJobRole.MAYOR]: { label: "MAIRE", color: "text-fg" },
    [RpJobRole.JUDGE]: { label: "JUGE", color: "text-fg" },
    [RpJobRole.DISPENSARY_OWNER]: { label: "TITULAIRE SQDC", color: "text-ok" },
    [RpJobRole.ETHER_ARCHITECT]: { label: "ARCHITECTE ÉTHER", color: "text-accent" },
  };
  return styles[job] ?? { label: "CITOYEN", color: "text-muted" };
}

export function formatStaffLine(e: StaffEntry): string {
  const r = getRoleBadgeStyle(e.role);
  const j = getJobBadgeStyle(e.job);
  const dutyMark = isOnDuty(e.identifier) ? " 🟢" : "";
  return `${e.displayName}${dutyMark} · ${r.label} · ${j.label}`;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function isStaffOnDuty(identifier: string): boolean {
  const role = state.getRole(identifier);
  if (role === AdminRole.NONE) return false;
  return isOnDuty(identifier);
}

export function isRegularPlayer(identifier: string): boolean {
  return state.getRole(identifier) === AdminRole.NONE;
}

export function hasStaffPrivileges(identifier: string): boolean {
  return !isRegularPlayer(identifier);
}

// ═══════════════════════════════════════════════════════════
// ACTIONS ADMIN SUR JOUEURS (Nouveau)
// ═══════════════════════════════════════════════════════════

export function givePlayerMoney(
  actorId: string,
  targetId: string,
  amount: number,
  type: "cash" | "bank"
): { success: boolean; message: string } {
  const perm = validatePermission(actorId, type === "cash" ? Permission.GIVE_CASH : Permission.GIVE_BANK);
  if (!perm.valid) return { success: false, message: perm.errors![0] };

  const target = validateTarget(actorId, targetId);
  if (!target.valid) return { success: false, message: target.errors![0] };

  const amountVal = validateAmount(amount);
  if (!amountVal.valid) return { success: false, message: amountVal.errors![0] };

  logAudit({
    actorId,
    command: type === "cash" ? "givecash" : "givebank",
    args: `${targetId} ${amount}`,
    targetId,
    success: true,
  });

  saveState();
  return { success: true, message: `Donné ${amount}$ (${type}) à ${state.getName(targetId)}` };
}

export function teleportPlayer(
  actorId: string,
  targetId: string,
  x: number,
  z: number
): { success: boolean; message: string } {
  const perm = validatePermission(actorId, Permission.TELEPORT);
  if (!perm.valid) return { success: false, message: perm.errors![0] };

  const target = validateTarget(actorId, targetId);
  if (!target.valid) return { success: false, message: target.errors![0] };

  logAudit({
    actorId,
    command: "teleport",
    args: `${targetId} ${x} ${z}`,
    targetId,
    success: true,
  });

  saveState();
  return { success: true, message: `Téléporté ${state.getName(targetId)} à (${x}, ${z})` };
}

export function healPlayer(actorId: string, targetId: string): { success: boolean; message: string } {
  const perm = validatePermission(actorId, Permission.HEAL);
  if (!perm.valid) return { success: false, message: perm.errors![0] };

  const target = validateTarget(actorId, targetId);
  if (!target.valid) return { success: false, message: target.errors![0] };

  state.updateMetrics(actorId, {
    playersHealed: state.getMetrics(actorId).playersHealed + 1,
  });

  logAudit({
    actorId,
    command: "heal",
    args: targetId,
    targetId,
    success: true,
  });

  saveState();
  return { success: true, message: `Soigné ${state.getName(targetId)}` };
}

export function setPlayerJob(
  actorId: string,
  targetId: string,
  job: RpJobRole
): { success: boolean; message: string } {
  const perm = validatePermission(actorId, Permission.SET_JOB);
  if (!perm.valid) return { success: false, message: perm.errors![0] };

  const target = validateTarget(actorId, targetId);
  if (!target.valid) return { success: false, message: target.errors![0] };

  state.setJob(targetId, job);

  logAudit({
    actorId,
    command: "setjob",
    args: `${targetId} ${job}`,
    targetId,
    success: true,
  });

  saveState();
  return { success: true, message: `Job de ${state.getName(targetId)} défini sur ${job}` };
}

export function toggleGodMode(actorId: string, targetId: string): { success: boolean; message: string } {
  const perm = validatePermission(actorId, Permission.GOD_MODE);
  if (!perm.valid) return { success: false, message: perm.errors![0] };

  const target = validateTarget(actorId, targetId);
  if (!target.valid) return { success: false, message: target.errors![0] };

  logAudit({
    actorId,
    command: "godmode",
    args: targetId,
    targetId,
    success: true,
  });

  saveState();
  return { success: true, message: `GodMode toggled pour ${state.getName(targetId)}` };
}

// ═══════════════════════════════════════════════════════════
// DISPATCH 911
// ═══════════════════════════════════════════════════════════

const DISPATCH_CODES: Record<string, { label: string; department: DispatchDepartmentTag; priority: DispatchPriority }> = {
  "10-32": { label: "Personne armée", department: DispatchDepartmentTag.SQ, priority: DispatchPriority.CRITICAL },
  "10-50": { label: "Accident de la route", department: DispatchDepartmentTag.SQ, priority: DispatchPriority.HIGH },
  "10-78": { label: "Renfort demandé", department: DispatchDepartmentTag.SQ, priority: DispatchPriority.HIGH },
  code_3: { label: "Urgence médicale", department: DispatchDepartmentTag.EMS, priority: DispatchPriority.CRITICAL },
  incendie: { label: "Incendie déclaré", department: DispatchDepartmentTag.FIRE, priority: DispatchPriority.CRITICAL },
  braconnage: { label: "Braconnage signalé", department: DispatchDepartmentTag.MFFP, priority: DispatchPriority.MEDIUM },
  vol: { label: "Vol en cours", department: DispatchDepartmentTag.SQ, priority: DispatchPriority.HIGH },
  bagarre: { label: "Bagarre / tapage", department: DispatchDepartmentTag.SQ, priority: DispatchPriority.MEDIUM },
  suspect: { label: "Individu suspect", department: DispatchDepartmentTag.SQ, priority: DispatchPriority.LOW },
};

export function listDispatchCodes(): string[] {
  return Object.keys(DISPATCH_CODES);
}

export function createDispatchCall(params: {
  code: string;
  callerId: string;
  callerName: string;
  locationName: string;
  x: number;
  z: number;
  notes?: string;
}): DispatchCall {
  const spec = DISPATCH_CODES[params.code] ?? {
    label: params.code,
    department: DispatchDepartmentTag.TOUS,
    priority: DispatchPriority.MEDIUM,
  };
  const call: DispatchCall = {
    id: `dsp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    code: params.code,
    label: spec.label,
    department: spec.department,
    priority: spec.priority,
    status: DispatchStatus.PENDING,
    locationName: params.locationName,
    x: params.x,
    z: params.z,
    callerId: params.callerId,
    callerName: params.callerName,
    createdAt: Date.now(),
    assignedTo: [],
    notes: params.notes,
  };
  state.addDispatchCall(call);
  saveState();
  return call;
}

export function listActiveDispatchCalls(department?: DispatchDepartmentTag): DispatchCall[] {
  return state.getActiveDispatchCalls(department);
}

export function assignDispatchCall(callId: string, unitId: string): boolean {
  const calls = state.getActiveDispatchCalls();
  const call = calls.find((c) => c.id === callId);
  if (!call) return false;
  if (!call.assignedTo.includes(unitId)) call.assignedTo.push(unitId);
  const success = state.updateDispatchCall(callId, {
    assignedTo: call.assignedTo,
    status: DispatchStatus.DISPATCHED,
  });
  if (success) saveState();
  return success;
}

export function markOnScene(callId: string): boolean {
  const success = state.updateDispatchCall(callId, { status: DispatchStatus.ON_SCENE });
  if (success) saveState();
  return success;
}

export function resolveDispatchCall(callId: string, note?: string): boolean {
  const success = state.updateDispatchCall(callId, {
    status: DispatchStatus.RESOLVED,
    resolvedAt: Date.now(),
    notes: note,
  });
  if (success) saveState();
  return success;
}

export function formatDispatchLine(c: DispatchCall): string {
  const age = Math.floor((Date.now() - c.createdAt) / 1000);
  const ageStr = age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`;
  return `${c.id.slice(-6)} · [${c.priority.toUpperCase()}] ${c.code} · ${c.label} · ${c.locationName} · ${c.status} · il y a ${ageStr}`;
}

// ═══════════════════════════════════════════════════════════
// CASIER JUDICIAIRE
// ═══════════════════════════════════════════════════════════

export function addCriminalCharge(params: {
  identifier: string;
  displayName: string;
  article: string;
  description: string;
  fine: number;
  jailMonths: number;
  officerId: string;
}): CriminalCharge {
  const charge: CriminalCharge = {
    id: `chg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    identifier: params.identifier,
    displayName: params.displayName,
    article: params.article,
    description: params.description,
    fine: params.fine,
    jailMonths: params.jailMonths,
    officerId: params.officerId,
    officerName: state.getName(params.officerId),
    createdAt: Date.now(),
  };
  state.addCriminalCharge(params.identifier, charge);
  saveState();
  return charge;
}

export function getCriminalRecord(identifier: string): CriminalCharge[] {
  return state.getCriminalRecord(identifier);
}

export function formatRapSheet(identifier: string): string {
  const charges = state.getCriminalRecord(identifier);
  if (!charges.length) return "Casier judiciaire vierge.";
  const totalFines = charges.reduce((s, c) => s + c.fine, 0);
  const totalMonths = charges.reduce((s, c) => s + c.jailMonths, 0);
  const lines = charges
    .slice(0, 15)
    .map(
      (c) =>
        `  • ${c.article} — ${c.description} · ${c.fine}$ · ${c.jailMonths}mois · ${new Date(
          c.createdAt
        ).toLocaleDateString("fr-CA")}`
    );
  return [
    `Casier judiciaire (${charges.length} chef${charges.length > 1 ? "s" : ""} d'accusation) :`,
    ...lines,
    `Total : ${totalFines}$ d'amendes · ${totalMonths} mois cumulés`,
  ].join("\n");
}

// ═══════════════════════════════════════════════════════════
// PRIMES (BOUNTIES)
// ═══════════════════════════════════════════════════════════

export function placeBounty(params: {
  targetId: string;
  targetName: string;
  amount: number;
  issuedBy: string;
  reason: string;
}): Bounty {
  const bounty: Bounty = {
    id: `bty_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    targetId: params.targetId,
    targetName: params.targetName,
    amount: params.amount,
    issuedBy: params.issuedBy,
    issuedByName: state.getName(params.issuedBy),
    reason: params.reason,
    createdAt: Date.now(),
    active: true,
  };
  state.addBounty(bounty);
  saveState();
  return bounty;
}

export function listActiveBounties(): Bounty[] {
  return state.getActiveBounties();
}

export function claimBounty(bountyId: string, claimerId: string): Bounty | null {
  const bounties = state.getActiveBounties();
  const bounty = bounties.find((b) => b.id === bountyId);
  if (!bounty) return null;
  const success = state.updateBounty(bountyId, {
    active: false,
    claimedBy: claimerId,
    claimedAt: Date.now(),
  });
  if (success) saveState();
  return success ? bounty : null;
}

export function getBountyOn(targetId: string): Bounty | null {
  return state.getActiveBounties().find((b) => b.targetId === targetId) ?? null;
}

export function formatBountyLine(b: Bounty): string {
  return `${b.id.slice(-6)} · ${b.targetName} · ${b.amount}$ · émise par ${b.issuedByName} · ${b.reason}`;
}

// ═══════════════════════════════════════════════════════════
// FOURRIÈRE
// ═══════════════════════════════════════════════════════════

const IMPOUND_BASE_FEE = 250;
const IMPOUND_DAILY_FEE = 40;

export function impoundVehicle(params: {
  vehicleId: string;
  ownerId: string;
  ownerName: string;
  reason: string;
}): ImpoundRecord {
  const rec: ImpoundRecord = {
    id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    vehicleId: params.vehicleId,
    ownerId: params.ownerId,
    ownerName: params.ownerName,
    reason: params.reason,
    impoundedAt: Date.now(),
    feeAmount: IMPOUND_BASE_FEE,
  };
  state.addImpoundRecord(rec);
  saveState();
  return rec;
}

export function getImpoundFee(recordId: string): number {
  const records = state.getImpoundRecords();
  const rec = records.find((r) => r.id === recordId);
  if (!rec) return 0;
  const days = Math.max(0, Math.ceil((Date.now() - rec.impoundedAt) / 86_400_000));
  return rec.feeAmount + days * IMPOUND_DAILY_FEE;
}

export function releaseVehicleFromImpound(recordId: string, releasedBy: string): number | null {
  const records = state.getImpoundRecords();
  const rec = records.find((r) => r.id === recordId);
  if (!rec || rec.releasedAt) return null;
  const fee = getImpoundFee(recordId);
  const success = state.updateImpoundRecord(recordId, {
    releasedAt: Date.now(),
    releasedBy,
  });
  if (success) saveState();
  return success ? fee : null;
}

export function listImpoundedVehicles(ownerId?: string): ImpoundRecord[] {
  return state.getImpoundRecords(ownerId);
}

export function formatImpoundLine(r: ImpoundRecord): string {
  return `${r.id.slice(-6)} · ${r.vehicleId} · ${r.ownerName} · ${r.reason} · frais actuels: ${getImpoundFee(r.id)}$`;
}

// ═══════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════

export function createReport(params: {
  reporterId: string;
  reporterName: string;
  targetName?: string;
  reason: string;
}): PlayerReport {
  const report: PlayerReport = {
    id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    reporterId: params.reporterId,
    reporterName: params.reporterName,
    targetName: params.targetName,
    reason: params.reason,
    status: ReportStatus.OPEN,
    createdAt: Date.now(),
  };
  state.addReport(report);
  saveState();
  return report;
}

export function listOpenReports(): PlayerReport[] {
  return [
    ...state.getReports(ReportStatus.OPEN),
    ...state.getReports(ReportStatus.CLAIMED),
  ];
}

export function claimReport(reportId: string, staffId: string): boolean {
  const reports = listOpenReports();
  const r = reports.find((r) => r.id === reportId || r.id.endsWith(reportId));
  if (!r) return false;
  const success = state.updateReport(r.id, {
    status: ReportStatus.CLAIMED,
    claimedBy: staffId,
  });
  if (success) saveState();
  return success;
}

export function resolveReport(reportId: string, staffId: string, note?: string): boolean {
  const reports = listOpenReports();
  const r = reports.find((r) => r.id === reportId || r.id.endsWith(reportId));
  if (!r) return false;
  const success = state.updateReport(r.id, {
    status: ReportStatus.RESOLVED,
    claimedBy: r.claimedBy ?? staffId,
    resolvedAt: Date.now(),
    resolutionNote: note,
  });
  if (success) {
    state.updateMetrics(staffId, {
      reportsResolved: state.getMetrics(staffId).reportsResolved + 1,
    });
    saveState();
  }
  return success;
}

export function formatReportLine(r: PlayerReport): string {
  const age = Math.floor((Date.now() - r.createdAt) / 60000);
  return `${r.id.slice(-6)} · ${r.reporterName} → ${r.targetName ?? "?"} · ${r.reason} · [${r.status}] · il y a ${age}min`;
}

// ═══════════════════════════════════════════════════════════
// BACKUP
// ═══════════════════════════════════════════════════════════

export function exportBackup(): string {
  return state.export();
}

export function importBackup(json: string): boolean {
  const success = state.import(json);
  if (success) saveState();
  return success;
}

export function resetAll(): void {
  state.clear();
  for (const e of DEFAULT_ROSTER) seed(e);
  saveState();
  emitEvent("reset", { success: true });
}