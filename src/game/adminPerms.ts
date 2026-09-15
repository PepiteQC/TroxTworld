/**
 * ═══════════════════════════════════════════════════════════
 * 🛡️ ETHERWORLD — SYSTÈME RBAC STAFF DE PRODUCTION (v2.1)
 * ═══════════════════════════════════════════════════════════
 * Inspiré des serveurs GTA RP de haute qualité (NoPixel, Loyola).
 *
 * v2.1 — AJOUTS (aucune ligne existante supprimée) :
 *   - Centrale 911 / Dispatch (appels, assignation, résolution)
 *   - Casier judiciaire (chefs d'accusation, rap sheet)
 *   - Primes (bounties)
 *   - Fourrière municipale MTQ
 *   - Signalements joueurs (/report)
 *   - getDisplayName() exporté pour usage externe
 *   - Persistance étendue (saveState/loadState/export/import/reset)
 *   - Classification des nouvelles commandes par palier RBAC
 * ═══════════════════════════════════════════════════════════
 */
import {
  AdminRole,
  ROLE_HIERARCHY,
  ROLE_LADDER,
  RpJobRole,
  parseAdminRole,
  parseRpJobRole,
  type JobBadge,
  type RoleBadge,
  type StaffEntry,
  // NOUVEAU v2.1
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

export { AdminRole, RpJobRole, ROLE_HIERARCHY, ROLE_LADDER, parseAdminRole, parseRpJobRole, DispatchPriority, DispatchStatus, DispatchDepartmentTag, ReportStatus };
export type { JobBadge, RoleBadge, StaffEntry, DispatchCall, CriminalCharge, Bounty, ImpoundRecord, PlayerReport };

// ═══════════════════════════════════════════════════════════
// CONSTANTES & CONFIGURATION
// ═══════════════════════════════════════════════════════════

export const LOCAL_PLAYER_ID = "local_player";
const STORAGE_KEY = "etherworld_rbac_v2";
const AUDIT_LOG_MAX = 500;
const BAN_HISTORY_MAX = 200;
const DISPATCH_LOG_MAX = 200;
const REPORT_LOG_MAX = 200;

// Rate limiting (Anti Power-Abuse)
const RATE_LIMITS: Record<string, { windowMs: number; max: number }> = {
  cash: { windowMs: 60_000, max: 5 },
  givecash: { windowMs: 60_000, max: 5 },
  givebank: { windowMs: 60_000, max: 5 },
  giveweapon: { windowMs: 60_000, max: 3 },
  ban: { windowMs: 300_000, max: 3 },
  kick: { windowMs: 60_000, max: 5 },
  smite: { windowMs: 30_000, max: 2 },
  etherpulse: { windowMs: 60_000, max: 1 },
  // AJOUTS v2.1
  warn: { windowMs: 60_000, max: 5 },
  bounty: { windowMs: 60_000, max: 3 },
  "911": { windowMs: 30_000, max: 4 },
  report: { windowMs: 120_000, max: 3 },
  impound: { windowMs: 60_000, max: 5 },
};

// ═══════════════════════════════════════════════════════════
// TYPES & INTERFACES ÉTENDUS
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
}

export interface Sanction {
  id: string;
  type: "warn" | "kick" | "ban" | "mute";
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
}

export interface StaffMetrics {
  identifier: string;
  commandsExecuted: number;
  playersKicked: number;
  playersBanned: number;
  playersWarned: number;
  playersHelped: number;
  reportsResolved: number;
  lastActivityAt: number;
  hoursOnDuty: number;
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

// Grille de rangs syndicaux par métier
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
// COMMANDES PAR NIVEAU DE PERMISSION
// ═══════════════════════════════════════════════════════════

const NONE_CMDS = new Set([
  "help", "aide", "h",
  "pos", "coords", "gps",
  "lieux", "list",
  "zone", "secteur", "sol",
  "say", "chat", "me",
  "radio", "fm",
  "walk", "drive",
  "camera", "cam",
  "inv", "inventory",
  "jobs", "emplois",
  "outfit", "tenue", "aura", "model", "modele", "face", "skin",
  "pack", "sac", "tool", "outil",
  "tv", "bell", "lights", "elev", "elevator",
  "floor", "etage",
  "siren", "gyro", "gyrophare", "lightbar",
  "patrouille", "unites", "amende", "amendes", "payer",
  "boire", "emote", "geste",
]);

const HELPER_CMDS = new Set([
  "status", "stats", "whoami",
  "staffchat", "sc", "staff",
  "ooc", "duty", "goduty",
  "stafflist", "staffs",
  "warn", "warnings",
  "job", "emploi", "metier",
  "gang", "report", "reports",
]);

const MOD_CMDS = new Set([
  "kick", "mute", "unmute",
  "jail", "unjail",
  "freeze", "unfreeze", "degeler", "dégeler",
  "vanish", "invis", "ghost",
  "slap",
  "heal", "revive",
  "hurt", "blesse",
  "wanted", "etoiles", "stars", "clear", "code4",
  "arrest", "arrestation",
  "ticket", "constat", "contraven",
  "alcotest", "ethylotest", "éthylotest", "breathalyzer",
  "radar",
  "book", "ecrouer",
  "lockdown", "confinement",
  "release", "liberer",
  "prison", "penitencier", "cellule",
  "announce", "audit",
]);

const SUPER_CMDS = new Set([
  "kit", "ban", "unban", "kickall",
  "etherpulse", "pulse", "smite", "foudre",
  "maxstats", "event",
  "givecash", "givebank", "giveweapon", "gw",
  "godmode", "god",
]);

const HEAD_CMDS = new Set([
  "promote", "promo", "rankup",
  "demote", "rankdown",
  "setrole", "setrank", "grade",
  "setrpjob", "setjobrole",
  "export", "import", "reset",
]);

// ═══════════════════════════════════════════════════════════
// AJOUTS v2.1 — CLASSIFICATION DES NOUVELLES COMMANDES
// Ne touche à aucun tableau existant : ajout par .add() seulement.
// ═══════════════════════════════════════════════════════════

for (const c of [
  "911", "dispatch", "sos",
  "bounties", "primes",
  "diag", "perf", "telemetrie", "alerts",
  "releasecar", "recuperer",
  "loan", "pret", "invest", "placement",
  "mls", "immo", "immobilier",
  "firm", "entreprise", "req",
  "hire", "embaucher",
  "mapaq", "grant", "subvention",
  "semer", "seed", "graines",
  "dutystatus",
]) {
  NONE_CMDS.add(c);
}

for (const c of ["signaler", "warns", "sanctions", "calls"]) {
  HELPER_CMDS.add(c);
}

for (const c of [
  "respond", "10-4", "onscene", "surplace", "clear911", "codegreen",
  "record", "casier", "rapsheet",
  "impound", "fourriere", "fourrière", "impoundlot", "fourrierelot",
  "bounty", "prime", "claimbounty", "encaisser",
]) {
  MOD_CMDS.add(c);
}

// ═══════════════════════════════════════════════════════════
// STATE INTERNE (Persistance localStorage)
// ═══════════════════════════════════════════════════════════

const userRoles = new Map<string, AdminRole>();
const userJobs = new Map<string, RpJobRole>();
const userNames = new Map<string, string>();
const userDuty = new Map<string, DutyStatus>();
const userMetrics = new Map<string, StaffMetrics>();
const userRanks = new Map<string, JobRank>();
const auditLog: AuditLogEntry[] = [];
const sanctionsLog: Sanction[] = [];
const rateLimitBuckets = new Map<string, number[]>();

// AJOUTS v2.1 — déclarés ici (avant loadState()) pour éviter toute
// erreur de "temporal dead zone" au chargement du module.
const dispatchCalls: DispatchCall[] = [];
const criminalRecords = new Map<string, CriminalCharge[]>();
const bounties: Bounty[] = [];
const impoundLot: ImpoundRecord[] = [];
const playerReports: PlayerReport[] = [];

// ═══════════════════════════════════════════════════════════
// PERSISTANCE (localStorage)
// ═══════════════════════════════════════════════════════════

function saveState() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const data = {
      roster: snapshotStaff(),
      auditLog: auditLog.slice(-AUDIT_LOG_MAX),
      sanctions: sanctionsLog.slice(-BAN_HISTORY_MAX),
      duty: Array.from(userDuty.entries()),
      metrics: Array.from(userMetrics.entries()),
      ranks: Array.from(userRanks.entries()),
      // AJOUTS v2.1
      dispatch: dispatchCalls.slice(0, DISPATCH_LOG_MAX),
      criminalRecords: Array.from(criminalRecords.entries()),
      bounties,
      impoundLot,
      reports: playerReports.slice(0, REPORT_LOG_MAX),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[RBAC] Impossible de sauvegarder l'état:", e);
  }
}

function loadState(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (Array.isArray(data.roster)) {
      for (const e of data.roster) seed(e);
    }
    if (Array.isArray(data.auditLog)) {
      auditLog.push(...data.auditLog);
    }
    if (Array.isArray(data.sanctions)) {
      sanctionsLog.push(...data.sanctions);
    }
    if (Array.isArray(data.duty)) {
      for (const [id, ds] of data.duty) userDuty.set(id, ds);
    }
    if (Array.isArray(data.metrics)) {
      for (const [id, m] of data.metrics) userMetrics.set(id, m);
    }
    if (Array.isArray(data.ranks)) {
      for (const [id, r] of data.ranks) userRanks.set(id, r);
    }
    // AJOUTS v2.1
    if (Array.isArray(data.dispatch)) {
      dispatchCalls.push(...data.dispatch);
    }
    if (Array.isArray(data.criminalRecords)) {
      for (const [id, charges] of data.criminalRecords) criminalRecords.set(id, charges);
    }
    if (Array.isArray(data.bounties)) {
      bounties.push(...data.bounties);
    }
    if (Array.isArray(data.impoundLot)) {
      impoundLot.push(...data.impoundLot);
    }
    if (Array.isArray(data.reports)) {
      playerReports.push(...data.reports);
    }
    return true;
  } catch (e) {
    console.warn("[RBAC] Impossible de restaurer l'état:", e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════

function seed(entry: StaffEntry) {
  userRoles.set(entry.identifier, entry.role);
  userJobs.set(entry.identifier, entry.job);
  userNames.set(entry.identifier, entry.displayName);
}

// Charge l'état persisté, ou utilise le roster par défaut
if (!loadState()) {
  for (const e of DEFAULT_ROSTER) seed(e);
}

// ═══════════════════════════════════════════════════════════
// GESTION DU ROSTER
// ═══════════════════════════════════════════════════════════

export function hydrateStaff(roster: StaffEntry[] | null | undefined, localRole?: AdminRole) {
  userRoles.clear();
  userJobs.clear();
  userNames.clear();
  const list = roster && roster.length ? roster : DEFAULT_ROSTER;
  for (const e of list) seed(e);
  if (localRole) userRoles.set(LOCAL_PLAYER_ID, localRole);
  saveState();
}

export function snapshotStaff(): StaffEntry[] {
  const ids = new Set([...userRoles.keys(), ...userJobs.keys()]);
  const out: StaffEntry[] = [];
  for (const id of ids) {
    const role = userRoles.get(id) ?? AdminRole.NONE;
    if (role === AdminRole.NONE && id !== LOCAL_PLAYER_ID) continue;
    out.push({
      identifier: id,
      displayName: userNames.get(id) ?? id,
      role,
      job: userJobs.get(id) ?? RpJobRole.CIVILIAN,
    });
  }
  out.sort((a, b) => ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role]);
  return out;
}

export function parseStaffRoster(raw: unknown): StaffEntry[] {
  if (!Array.isArray(raw)) return DEFAULT_ROSTER.map((e) => ({ ...e }));
  const out: StaffEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.identifier === "string" ? r.identifier : "";
    if (!id) continue;
    const role = parseAdminRole(r.role) ?? AdminRole.NONE;
    const job = parseRpJobRole(r.job) ?? RpJobRole.CIVILIAN;
    const displayName = typeof r.displayName === "string" ? r.displayName : id;
    out.push({ identifier: id, displayName, role, job });
  }
  return out.length ? out : DEFAULT_ROSTER.map((e) => ({ ...e }));
}

export function setDisplayName(identifier: string, name: string) {
  userNames.set(identifier, name);
  saveState();
}

/** AJOUT v2.1 — lecture publique du nom d'affichage d'un identifiant. */
export function getDisplayName(identifier: string): string {
  return userNames.get(identifier) ?? identifier;
}

export function getUserRole(identifier: string): AdminRole {
  return userRoles.get(identifier) || AdminRole.NONE;
}

export function setUserRole(identifier: string, role: AdminRole): void {
  userRoles.set(identifier, role);
  saveState();
}

export function getUserJob(identifier: string): RpJobRole {
  return userJobs.get(identifier) || RpJobRole.CIVILIAN;
}

export function setUserJob(identifier: string, job: RpJobRole): void {
  userJobs.set(identifier, job);
  // Initialiser le rang si nouveau métier
  if (!userRanks.has(identifier) && JOB_RANKS[job]) {
    userRanks.set(identifier, {
      jobId: job,
      currentRank: 0,
      maxRank: (JOB_RANKS[job]?.length ?? 1) - 1,
      rankName: JOB_RANKS[job]?.[0] ?? "Recrue",
      yearsService: 0,
      promotionsCount: 0,
      formationsCompleted: [],
    });
  }
  saveState();
}

export function getAllStaffMembers(): StaffEntry[] {
  return snapshotStaff();
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PROMOTION / RÉTROGRADATION
// ═══════════════════════════════════════════════════════════

export function promoteUser(identifier: string, actorId?: string): AdminRole {
  const current = getUserRole(identifier);
  const idx = ROLE_LADDER.indexOf(current);
  if (idx >= 0 && idx < ROLE_LADDER.length - 1) {
    const next = ROLE_LADDER[idx + 1]!;
    setUserRole(identifier, next);
    logAudit({
      actorId: actorId ?? "system",
      command: "promote",
      args: `${next}`,
      targetId: identifier,
      success: true,
    });
    return next;
  }
  return current;
}

export function demoteUser(identifier: string, actorId?: string): AdminRole {
  const current = getUserRole(identifier);
  const idx = ROLE_LADDER.indexOf(current);
  if (idx > 0) {
    const prev = ROLE_LADDER[idx - 1]!;
    setUserRole(identifier, prev);
    logAudit({
      actorId: actorId ?? "system",
      command: "demote",
      args: `${prev}`,
      targetId: identifier,
      success: true,
    });
    return prev;
  }
  return current;
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PERMISSIONS
// ═══════════════════════════════════════════════════════════

export function hasPermission(userRole: AdminRole, requiredRole: AdminRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function checkPermission(identifier: string, requiredRole: AdminRole): boolean {
  return hasPermission(getUserRole(identifier), requiredRole);
}

export function canChangeRole(actorId: string, targetNext: AdminRole): boolean {
  const actor = getUserRole(actorId);
  if (!hasPermission(actor, AdminRole.HEAD_ADMIN)) return false;
  if (actor === AdminRole.INTELLECTUS_AI) return true;
  return ROLE_HIERARCHY[targetNext] < ROLE_HIERARCHY[actor];
}

export function requiredRoleFor(cmd: string): AdminRole {
  if (NONE_CMDS.has(cmd)) return AdminRole.NONE;
  if (HELPER_CMDS.has(cmd)) return AdminRole.HELPER;
  if (MOD_CMDS.has(cmd)) return AdminRole.MOD;
  if (SUPER_CMDS.has(cmd)) return AdminRole.SUPERADMIN;
  if (HEAD_CMDS.has(cmd)) return AdminRole.HEAD_ADMIN;
  return AdminRole.ADMIN;
}

// ═══════════════════════════════════════════════════════════
// RATE LIMITING (Anti Power-Abuse)
// ═══════════════════════════════════════════════════════════

export function checkRateLimit(identifier: string, command: string): { allowed: boolean; retryAfterMs?: number } {
  const limit = RATE_LIMITS[command];
  if (!limit) return { allowed: true };

  const key = `${identifier}:${command}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key) ?? [];
  const recent = bucket.filter((t) => now - t < limit.windowMs);

  if (recent.length >= limit.max) {
    const oldestValid = recent[0]!;
    const retryAfterMs = limit.windowMs - (now - oldestValid);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PRISE DE SERVICE (DUTY ON/OFF)
// ═══════════════════════════════════════════════════════════

export function toggleDuty(identifier: string): DutyStatus {
  const now = Date.now();
  let ds = userDuty.get(identifier);
  if (!ds) {
    ds = {
      identifier,
      onDuty: false,
      clockedInAt: 0,
      totalSecondsToday: 0,
      totalSecondsAllTime: 0,
    };
  }

  if (ds.onDuty) {
    // Fin du service
    const shiftSec = ds.currentShiftStart ? Math.floor((now - ds.currentShiftStart) / 1000) : 0;
    ds.totalSecondsToday += shiftSec;
    ds.totalSecondsAllTime += shiftSec;
    ds.onDuty = false;
    ds.currentShiftStart = undefined;
  } else {
    // Prise de service
    ds.onDuty = true;
    ds.clockedInAt = now;
    ds.currentShiftStart = now;
  }

  userDuty.set(identifier, ds);
  saveState();
  return ds;
}

export function getDutyStatus(identifier: string): DutyStatus | null {
  return userDuty.get(identifier) ?? null;
}

export function isOnDuty(identifier: string): boolean {
  return userDuty.get(identifier)?.onDuty ?? false;
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME D'AUDIT LOG
// ═══════════════════════════════════════════════════════════

export function logAudit(entry: Partial<AuditLogEntry> & { actorId: string; command: string }): void {
  const now = Date.now();
  const actorRole = getUserRole(entry.actorId);
  const full: AuditLogEntry = {
    id: `audit_${now}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    actorId: entry.actorId,
    actorName: userNames.get(entry.actorId) ?? entry.actorId,
    actorRole,
    command: entry.command,
    args: entry.args ?? "",
    targetId: entry.targetId,
    targetName: entry.targetId ? (userNames.get(entry.targetId) ?? entry.targetId) : undefined,
    success: entry.success ?? true,
    reason: entry.reason,
    ip: entry.ip,
  };

  auditLog.push(full);
  if (auditLog.length > AUDIT_LOG_MAX) {
    auditLog.splice(0, auditLog.length - AUDIT_LOG_MAX);
  }

  // Mise à jour des métriques
  const metrics = getStaffMetrics(entry.actorId);
  metrics.commandsExecuted++;
  metrics.lastActivityAt = now;
  userMetrics.set(entry.actorId, metrics);

  saveState();
}

export function getAuditLog(filters?: {
  actorId?: string;
  targetId?: string;
  command?: string;
  limit?: number;
}): AuditLogEntry[] {
  let result = [...auditLog];
  if (filters?.actorId) result = result.filter((e) => e.actorId === filters.actorId);
  if (filters?.targetId) result = result.filter((e) => e.targetId === filters.targetId);
  if (filters?.command) result = result.filter((e) => e.command === filters.command);
  result.sort((a, b) => b.timestamp - a.timestamp);
  return result.slice(0, filters?.limit ?? 100);
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE SANCTIONS (Warns / Kicks / Bans / Mutes)
// ═══════════════════════════════════════════════════════════

export function issueSanction(sanction: Omit<Sanction, "id" | "createdAt" | "active">): Sanction {
  const now = Date.now();
  const full: Sanction = {
    id: `sanct_${now}_${Math.random().toString(36).substr(2, 6)}`,
    createdAt: now,
    active: true,
    ...sanction,
  };

  sanctionsLog.push(full);
  if (sanctionsLog.length > BAN_HISTORY_MAX) {
    sanctionsLog.splice(0, sanctionsLog.length - BAN_HISTORY_MAX);
  }

  // Mise à jour des métriques modérateur
  const metrics = getStaffMetrics(sanction.moderatorId);
  if (sanction.type === "kick") metrics.playersKicked++;
  else if (sanction.type === "ban") metrics.playersBanned++;
  else if (sanction.type === "warn") {
    metrics.playersWarned++;
    // Ban automatique à 3 warns
    const warnsCount = getActiveWarns(sanction.targetId).length;
    if (warnsCount >= 3) {
      issueSanction({
        type: "ban",
        targetId: sanction.targetId,
        targetName: sanction.targetName,
        moderatorId: "system",
        moderatorName: "SYSTÈME AUTO",
        reason: `Ban automatique après 3 warns cumulés (dernier: ${sanction.reason})`,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 jours
      });
    }
  }
  userMetrics.set(sanction.moderatorId, metrics);

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
  const s = sanctionsLog.find((s) => s.id === sanctionId);
  if (!s || !s.active) return false;
  s.active = false;
  s.revokedBy = moderatorId;
  s.revokedAt = Date.now();
  s.revokeReason = reason;
  saveState();
  return true;
}

export function getActiveWarns(identifier: string): Sanction[] {
  const now = Date.now();
  return sanctionsLog.filter((s) =>
    s.targetId === identifier &&
    s.type === "warn" &&
    s.active &&
    (!s.expiresAt || s.expiresAt > now)
  );
}

export function isBanned(identifier: string): Sanction | null {
  const now = Date.now();
  return sanctionsLog.find((s) =>
    s.targetId === identifier &&
    s.type === "ban" &&
    s.active &&
    (!s.expiresAt || s.expiresAt > now)
  ) ?? null;
}

export function isMuted(identifier: string): Sanction | null {
  const now = Date.now();
  return sanctionsLog.find((s) =>
    s.targetId === identifier &&
    s.type === "mute" &&
    s.active &&
    (!s.expiresAt || s.expiresAt > now)
  ) ?? null;
}

export function getSanctionHistory(identifier: string): Sanction[] {
  return sanctionsLog.filter((s) => s.targetId === identifier).sort((a, b) => b.createdAt - a.createdAt);
}

// ═══════════════════════════════════════════════════════════
// MÉTRIQUES DE STAFF
// ═══════════════════════════════════════════════════════════

export function getStaffMetrics(identifier: string): StaffMetrics {
  let m = userMetrics.get(identifier);
  if (!m) {
    m = {
      identifier,
      commandsExecuted: 0,
      playersKicked: 0,
      playersBanned: 0,
      playersWarned: 0,
      playersHelped: 0,
      reportsResolved: 0,
      lastActivityAt: 0,
      hoursOnDuty: 0,
    };
    userMetrics.set(identifier, m);
  }
  const ds = getDutyStatus(identifier);
  if (ds) m.hoursOnDuty = ds.totalSecondsAllTime / 3600;
  return m;
}

// ═══════════════════════════════════════════════════════════
// RANGS DE CARRIÈRE PAR MÉTIER
// ═══════════════════════════════════════════════════════════

export function getJobRank(identifier: string): JobRank | null {
  return userRanks.get(identifier) ?? null;
}

export function promoteJobRank(identifier: string): boolean {
  const rank = userRanks.get(identifier);
  if (!rank) return false;
  if (rank.currentRank < rank.maxRank) {
    rank.currentRank++;
    rank.promotionsCount++;
    rank.rankName = JOB_RANKS[rank.jobId]?.[rank.currentRank] ?? "Recrue";
    userRanks.set(identifier, rank);
    saveState();
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// UTILITAIRES DE RECHERCHE
// ═══════════════════════════════════════════════════════════

export function resolveStaffId(raw: string): string {
  const q = raw.trim().toLowerCase();
  if (!q || q === "me" || q === "self" || q === "moi") return LOCAL_PLAYER_ID;
  if (q === "local" || q === LOCAL_PLAYER_ID) return LOCAL_PLAYER_ID;
  for (const e of snapshotStaff()) {
    if (e.identifier.toLowerCase() === q) return e.identifier;
    if (e.displayName.toLowerCase() === q) return e.identifier;
    if (e.displayName.toLowerCase().includes(q)) return e.identifier;
  }
  return raw.trim();
}

export function rpJobToRole(id: string): RpJobRole {
  switch (id) {
    case "policier": return RpJobRole.POLICE_OFFICER;
    case "ambulancier": return RpJobRole.PARAMEDIC;
    case "mecanicien": return RpJobRole.MECHANIC;
    case "avocat": return RpJobRole.JUDGE;
    case "commercant": return RpJobRole.DISPENSARY_OWNER;
    case "criminel": return RpJobRole.GANGSTER;
    default: return RpJobRole.CIVILIAN;
  }
}

// ═══════════════════════════════════════════════════════════
// STYLES DE BADGES (UI)
// ═══════════════════════════════════════════════════════════

export function getRoleBadgeStyle(role: AdminRole): RoleBadge {
  switch (role) {
    case AdminRole.INTELLECTUS_AI:
      return { label: "INTELLECTUS", color: "text-accent", bg: "bg-surface-2", border: "border-accent" };
    case AdminRole.DEVELOPER:
      return { label: "LEAD DEV", color: "text-fg", bg: "bg-surface-2", border: "border-border-strong" };
    case AdminRole.OWNER:
      return { label: "FONDATEUR", color: "text-fg", bg: "bg-surface-2", border: "border-border-strong" };
    case AdminRole.HEAD_ADMIN:
      return { label: "HEAD ADMIN", color: "text-danger", bg: "bg-surface-2", border: "border-danger" };
    case AdminRole.SUPERADMIN:
      return { label: "SUPERADMIN", color: "text-danger", bg: "bg-surface-2", border: "border-danger" };
    case AdminRole.ADMIN:
      return { label: "ADMIN", color: "text-accent", bg: "bg-surface-2", border: "border-accent" };
    case AdminRole.MOD:
      return { label: "MODÉRATEUR", color: "text-accent", bg: "bg-surface-2", border: "border-border-strong" };
    case AdminRole.HELPER:
      return { label: "HELPER", color: "text-ok", bg: "bg-surface-2", border: "border-ok" };
    default:
      return { label: "CITOYEN", color: "text-muted", bg: "bg-surface-2", border: "border-border" };
  }
}

export function getJobBadgeStyle(job: RpJobRole): JobBadge {
  switch (job) {
    case RpJobRole.POLICE_CHIEF:
      return { label: "CHEF SQ", color: "text-accent" };
    case RpJobRole.POLICE_OFFICER:
      return { label: "OFFICIER SQ", color: "text-accent" };
    case RpJobRole.SECRET_AGENT:
      return { label: "AGENT INFILTRÉ", color: "text-muted" };
    case RpJobRole.MEDIC_DIRECTOR:
      return { label: "DIRECTEUR URGENCES", color: "text-danger" };
    case RpJobRole.PARAMEDIC:
      return { label: "PARAMÉDIC", color: "text-danger" };
    case RpJobRole.MECHANIC:
      return { label: "MÉCANICIEN", color: "text-muted" };
    case RpJobRole.MAFIA_BOSS:
      return { label: "PARRAIN", color: "text-danger" };
    case RpJobRole.GANGSTER:
      return { label: "GANGSTER", color: "text-danger" };
    case RpJobRole.MAYOR:
      return { label: "MAIRE", color: "text-fg" };
    case RpJobRole.JUDGE:
      return { label: "JUGE", color: "text-fg" };
    case RpJobRole.DISPENSARY_OWNER:
      return { label: "TITULAIRE SQDC", color: "text-ok" };
    case RpJobRole.ETHER_ARCHITECT:
      return { label: "ARCHITECTE ÉTHER", color: "text-accent" };
    default:
      return { label: "CITOYEN", color: "text-muted" };
  }
}

export function formatStaffLine(e: StaffEntry): string {
  const r = getRoleBadgeStyle(e.role);
  const j = getJobBadgeStyle(e.job);
  const dutyMark = isOnDuty(e.identifier) ? " 🟢" : "";
  return `${e.displayName}${dutyMark} · ${r.label} · ${j.label}`;
}

// ═══════════════════════════════════════════════════════════
// HELPERS DE VÉRIFICATION
// ═══════════════════════════════════════════════════════════

export function isStaffOnDuty(identifier: string): boolean {
  const role = getUserRole(identifier);
  if (role === AdminRole.NONE) return false;
  return isOnDuty(identifier);
}

export function isRegularPlayer(identifier: string): boolean {
  const role = getUserRole(identifier);
  return role === AdminRole.NONE;
}

export function hasStaffPrivileges(identifier: string): boolean {
  return !isRegularPlayer(identifier);
}

// ═══════════════════════════════════════════════════════════
// AJOUT v2.1 — CENTRALE DE RÉPARTITION 911 (DISPATCH)
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
  const spec = DISPATCH_CODES[params.code] ?? { label: params.code, department: DispatchDepartmentTag.TOUS, priority: DispatchPriority.MEDIUM };
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
  dispatchCalls.unshift(call);
  if (dispatchCalls.length > DISPATCH_LOG_MAX) dispatchCalls.length = DISPATCH_LOG_MAX;
  saveState();
  return call;
}

export function listActiveDispatchCalls(department?: DispatchDepartmentTag): DispatchCall[] {
  return dispatchCalls.filter(
    (c) =>
      c.status !== DispatchStatus.RESOLVED &&
      c.status !== DispatchStatus.CANCELLED &&
      (!department || department === DispatchDepartmentTag.TOUS || c.department === department || c.department === DispatchDepartmentTag.TOUS),
  );
}

export function assignDispatchCall(callId: string, unitId: string): boolean {
  const call = dispatchCalls.find((c) => c.id === callId);
  if (!call) return false;
  if (!call.assignedTo.includes(unitId)) call.assignedTo.push(unitId);
  call.status = DispatchStatus.DISPATCHED;
  saveState();
  return true;
}

export function markOnScene(callId: string): boolean {
  const call = dispatchCalls.find((c) => c.id === callId);
  if (!call) return false;
  call.status = DispatchStatus.ON_SCENE;
  saveState();
  return true;
}

export function resolveDispatchCall(callId: string, note?: string): boolean {
  const call = dispatchCalls.find((c) => c.id === callId);
  if (!call) return false;
  call.status = DispatchStatus.RESOLVED;
  call.resolvedAt = Date.now();
  if (note) call.notes = note;
  saveState();
  return true;
}

export function formatDispatchLine(c: DispatchCall): string {
  const age = Math.floor((Date.now() - c.createdAt) / 1000);
  const ageStr = age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`;
  return `${c.id.slice(-6)} · [${c.priority.toUpperCase()}] ${c.code} · ${c.label} · ${c.locationName} · ${c.status} · il y a ${ageStr}`;
}

// ═══════════════════════════════════════════════════════════
// AJOUT v2.1 — CASIER JUDICIAIRE (RAP SHEET)
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
    officerName: getDisplayName(params.officerId),
    createdAt: Date.now(),
  };
  const list = criminalRecords.get(params.identifier) ?? [];
  list.unshift(charge);
  criminalRecords.set(params.identifier, list);
  saveState();
  return charge;
}

export function getCriminalRecord(identifier: string): CriminalCharge[] {
  return criminalRecords.get(identifier) ?? [];
}

export function formatRapSheet(identifier: string): string {
  const charges = getCriminalRecord(identifier);
  if (!charges.length) return "Casier judiciaire vierge.";
  const totalFines = charges.reduce((s, c) => s + c.fine, 0);
  const totalMonths = charges.reduce((s, c) => s + c.jailMonths, 0);
  const lines = charges
    .slice(0, 15)
    .map((c) => `  • ${c.article} — ${c.description} · ${c.fine}$ · ${c.jailMonths}mois · ${new Date(c.createdAt).toLocaleDateString("fr-CA")}`);
  return [
    `Casier judiciaire (${charges.length} chef${charges.length > 1 ? "s" : ""} d'accusation) :`,
    ...lines,
    `Total : ${totalFines}$ d'amendes · ${totalMonths} mois cumulés`,
  ].join("\n");
}

// ═══════════════════════════════════════════════════════════
// AJOUT v2.1 — PRIMES (BOUNTIES)
// ═══════════════════════════════════════════════════════════

export function placeBounty(params: { targetId: string; targetName: string; amount: number; issuedBy: string; reason: string }): Bounty {
  const bounty: Bounty = {
    id: `bty_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    targetId: params.targetId,
    targetName: params.targetName,
    amount: params.amount,
    issuedBy: params.issuedBy,
    issuedByName: getDisplayName(params.issuedBy),
    reason: params.reason,
    createdAt: Date.now(),
    active: true,
  };
  bounties.unshift(bounty);
  saveState();
  return bounty;
}

export function listActiveBounties(): Bounty[] {
  return bounties.filter((b) => b.active);
}

export function claimBounty(bountyId: string, claimerId: string): Bounty | null {
  const bounty = bounties.find((b) => b.id === bountyId && b.active);
  if (!bounty) return null;
  bounty.active = false;
  bounty.claimedBy = claimerId;
  bounty.claimedAt = Date.now();
  saveState();
  return bounty;
}

export function getBountyOn(targetId: string): Bounty | null {
  return bounties.find((b) => b.targetId === targetId && b.active) ?? null;
}

export function formatBountyLine(b: Bounty): string {
  return `${b.id.slice(-6)} · ${b.targetName} · ${b.amount}$ · émise par ${b.issuedByName} · ${b.reason}`;
}

// ═══════════════════════════════════════════════════════════
// AJOUT v2.1 — FOURRIÈRE MUNICIPALE MTQ
// ═══════════════════════════════════════════════════════════

const IMPOUND_BASE_FEE = 250;
const IMPOUND_DAILY_FEE = 40;

export function impoundVehicle(params: { vehicleId: string; ownerId: string; ownerName: string; reason: string }): ImpoundRecord {
  const rec: ImpoundRecord = {
    id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    vehicleId: params.vehicleId,
    ownerId: params.ownerId,
    ownerName: params.ownerName,
    reason: params.reason,
    impoundedAt: Date.now(),
    feeAmount: IMPOUND_BASE_FEE,
  };
  impoundLot.push(rec);
  saveState();
  return rec;
}

export function getImpoundFee(recordId: string): number {
  const rec = impoundLot.find((r) => r.id === recordId);
  if (!rec) return 0;
  const days = Math.max(0, Math.ceil((Date.now() - rec.impoundedAt) / 86_400_000));
  return rec.feeAmount + days * IMPOUND_DAILY_FEE;
}

export function releaseVehicleFromImpound(recordId: string, releasedBy: string): number | null {
  const rec = impoundLot.find((r) => r.id === recordId && !r.releasedAt);
  if (!rec) return null;
  const fee = getImpoundFee(recordId);
  rec.releasedAt = Date.now();
  rec.releasedBy = releasedBy;
  saveState();
  return fee;
}

export function listImpoundedVehicles(ownerId?: string): ImpoundRecord[] {
  return impoundLot.filter((r) => !r.releasedAt && (!ownerId || r.ownerId === ownerId));
}

export function formatImpoundLine(r: ImpoundRecord): string {
  return `${r.id.slice(-6)} · ${r.vehicleId} · ${r.ownerName} · ${r.reason} · frais actuels: ${getImpoundFee(r.id)}$`;
}

// ═══════════════════════════════════════════════════════════
// AJOUT v2.1 — SIGNALEMENTS JOUEURS (/report)
// ═══════════════════════════════════════════════════════════

export function createReport(params: { reporterId: string; reporterName: string; targetName?: string; reason: string }): PlayerReport {
  const report: PlayerReport = {
    id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    reporterId: params.reporterId,
    reporterName: params.reporterName,
    targetName: params.targetName,
    reason: params.reason,
    status: ReportStatus.OPEN,
    createdAt: Date.now(),
  };
  playerReports.unshift(report);
  if (playerReports.length > REPORT_LOG_MAX) playerReports.length = REPORT_LOG_MAX;
  saveState();
  return report;
}

export function listOpenReports(): PlayerReport[] {
  return playerReports.filter((r) => r.status === ReportStatus.OPEN || r.status === ReportStatus.CLAIMED);
}

export function claimReport(reportId: string, staffId: string): boolean {
  const r = playerReports.find((r) => r.id === reportId || r.id.endsWith(reportId));
  if (!r) return false;
  r.status = ReportStatus.CLAIMED;
  r.claimedBy = staffId;
  saveState();
  return true;
}

export function resolveReport(reportId: string, staffId: string, note?: string): boolean {
  const r = playerReports.find((r) => r.id === reportId || r.id.endsWith(reportId));
  if (!r) return false;
  r.status = ReportStatus.RESOLVED;
  r.claimedBy = r.claimedBy ?? staffId;
  r.resolvedAt = Date.now();
  r.resolutionNote = note;
  const metrics = getStaffMetrics(staffId);
  metrics.reportsResolved++;
  userMetrics.set(staffId, metrics);
  saveState();
  return true;
}

export function formatReportLine(r: PlayerReport): string {
  const age = Math.floor((Date.now() - r.createdAt) / 60000);
  return `${r.id.slice(-6)} · ${r.reporterName} → ${r.targetName ?? "?"} · ${r.reason} · [${r.status}] · il y a ${age}min`;
}

// ═══════════════════════════════════════════════════════════
// EXPORT / IMPORT / RESET (BACKUP)
// ═══════════════════════════════════════════════════════════

export function exportBackup(): string {
  const data = {
    version: 2,
    roster: snapshotStaff(),
    auditLog,
    sanctions: sanctionsLog,
    duty: Array.from(userDuty.entries()),
    metrics: Array.from(userMetrics.entries()),
    ranks: Array.from(userRanks.entries()),
    // AJOUTS v2.1
    dispatch: dispatchCalls,
    criminalRecords: Array.from(criminalRecords.entries()),
    bounties,
    impoundLot,
    reports: playerReports,
    exportedAt: Date.now(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackup(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== "object") return false;
    userRoles.clear();
    userJobs.clear();
    userNames.clear();
    userDuty.clear();
    userMetrics.clear();
    userRanks.clear();
    auditLog.length = 0;
    sanctionsLog.length = 0;
    // AJOUTS v2.1
    dispatchCalls.length = 0;
    criminalRecords.clear();
    bounties.length = 0;
    impoundLot.length = 0;
    playerReports.length = 0;

    if (Array.isArray(data.roster)) for (const e of data.roster) seed(e);
    if (Array.isArray(data.auditLog)) auditLog.push(...data.auditLog);
    if (Array.isArray(data.sanctions)) sanctionsLog.push(...data.sanctions);
    if (Array.isArray(data.duty)) for (const [id, ds] of data.duty) userDuty.set(id, ds);
    if (Array.isArray(data.metrics)) for (const [id, m] of data.metrics) userMetrics.set(id, m);
    if (Array.isArray(data.ranks)) for (const [id, r] of data.ranks) userRanks.set(id, r);
    if (Array.isArray(data.dispatch)) dispatchCalls.push(...data.dispatch);
    if (Array.isArray(data.criminalRecords)) for (const [id, charges] of data.criminalRecords) criminalRecords.set(id, charges);
    if (Array.isArray(data.bounties)) bounties.push(...data.bounties);
    if (Array.isArray(data.impoundLot)) impoundLot.push(...data.impoundLot);
    if (Array.isArray(data.reports)) playerReports.push(...data.reports);

    saveState();
    return true;
  } catch (e) {
    console.error("[RBAC] Erreur d'import:", e);
    return false;
  }
}

export function resetAll(): void {
  userRoles.clear();
  userJobs.clear();
  userNames.clear();
  userDuty.clear();
  userMetrics.clear();
  userRanks.clear();
  auditLog.length = 0;
  sanctionsLog.length = 0;
  rateLimitBuckets.clear();
  // AJOUTS v2.1
  dispatchCalls.length = 0;
  criminalRecords.clear();
  bounties.length = 0;
  impoundLot.length = 0;
  playerReports.length = 0;
  for (const e of DEFAULT_ROSTER) seed(e);
  saveState();
}