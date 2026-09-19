/**
 * ═══════════════════════════════════════════════════════════
 * 🛡️ ETHERWORLD — SYSTÈME RBAC COMPLET (v3.0)
 * ═══════════════════════════════════════════════════════════
 * Architecture modulaire pour gestion admin complète :
 *   - Hiérarchie Platinum RBAC (15 grades)
 *   - Métiers RP (35+ professions)
 *   - Permissions granulaires (30+ flags)
 *   - Modules RP avancés (Dispatch, Casier, Primes, etc.)
 *   - Système de validation et helpers
 *
 * Compatible Colyseus / Vite SSR / TypeScript 6+
 * ═══════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════
// 1. GRADES STAFF (Hiérarchie RBAC)
// ═══════════════════════════════════════════════════════════

export enum AdminRole {
  // Grades joueurs
  NONE = "none",
  
  // Staff débutant
  TRIAL_HELPER = "trial_helper",
  HELPER = "helper",
  
  // Modération
  TRIAL_MOD = "trial_mod",
  MOD = "mod",
  SENIOR_MOD = "senior_mod",
  
  // Administration
  ADMIN = "admin",
  SUPERADMIN = "superadmin",
  HEAD_ADMIN = "head_admin",
  
  // Gestion communautaire
  COMMUNITY_MANAGER = "community_manager",
  EVENT_MANAGER = "event_manager",
  
  // Direction
  OWNER = "owner",
  
  // Développement
  DEVELOPER = "developer",
  SENIOR_DEV = "senior_dev",
  
  // IA
  INTELLECTUS_AI = "intellectus_ai",
}

// ═══════════════════════════════════════════════════════════
// 2. MÉTIERS RP (Badges staff & joueurs)
// ═══════════════════════════════════════════════════════════

export enum RpJobRole {
  // Civils
  CIVILIAN = "civilian",
  UNEMPLOYED = "unemployed",
  STUDENT = "student",
  
  // Forces de l'ordre (SQ)
  POLICE_CHIEF = "police_chief",
  POLICE_CAPTAIN = "police_captain",
  POLICE_LIEUTENANT = "police_lieutenant",
  POLICE_SERGEANT = "police_sergeant",
  POLICE_OFFICER = "police_officer",
  POLICE_CADET = "police_cadet",
  SECRET_AGENT = "secret_agent",
  MFFP_AGENT = "mffp_agent",
  
  // Services d'urgence
  MEDIC_DIRECTOR = "medic_director",
  PARAMEDIC = "paramedic",
  FIREFIGHTER = "firefighter",
  CORONER = "coroner",
  
  // Justice & Politique
  MAYOR = "mayor",
  JUDGE = "judge",
  LAWYER = "lawyer",
  NOTARY = "notary",
  
  // Commerce & Industrie
  DISPENSARY_OWNER = "dispensary_owner",
  MECHANIC = "mechanic",
  TRUCKER = "trucker",
  FARMER = "farmer",
  LUMBERJACK = "lumberjack",
  FISHERMAN = "fisherman",
  MINER = "miner",
  CONSTRUCTION = "construction",
  
  // Médias & Services
  JOURNALIST = "journalist",
  DETECTIVE = "detective",
  TAXI_DRIVER = "taxi_driver",
  REALTOR = "realtor",
  BARTENDER = "bartender",
  
  // Crime organisé
  MAFIA_BOSS = "mafia_boss",
  GANGSTER = "gangster",
  DEALER = "dealer",
  
  // Staff technique
  ETHER_ARCHITECT = "ether_architect",
}

// ═══════════════════════════════════════════════════════════
// 3. DÉPARTEMENTS OFFICIELS DU COMTÉ
// ═══════════════════════════════════════════════════════════

export enum Department {
  NONE = "none",
  
  // Forces de l'ordre
  SQ_PORTNEUF = "sq_portneuf",
  SQ_DONNACONA = "sq_donnacona",
  MFFP = "mffp",
  
  // Services d'urgence
  EMS_PORTNEUF = "ems_portneuf",
  FIRE_PORTNEUF = "fire_portneuf",
  
  // Gouvernement
  MRC_PORTNEUF = "mrc_portneuf",
  HYDRO_QUEBEC = "hydro_quebec",
  MTQ = "mtq",
  PALAIS_JUSTICE = "palais_justice",
  PENITENCIER = "penitencier",
  
  // Commerce
  SQDC = "sqdc",
  
  // Crime
  GANG_HELLS = "gang_hells",
  GANG_MAFIA = "gang_mafia",
}

// ═══════════════════════════════════════════════════════════
// 4. PERMISSIONS GRANULAIRES (Flags)
// ═══════════════════════════════════════════════════════════

export enum Permission {
  // --- MODÉRATION JOUEUR ---
  KICK = "kick",
  BAN = "ban",
  MUTE = "mute",
  WARN = "warn",
  JAIL = "jail",
  FREEZE = "freeze",
  
  // --- ADMINISTRATION SYSTÈME ---
  TELEPORT = "teleport",
  SPAWN_VEHICLE = "spawn_vehicle",
  SPAWN_ITEM = "spawn_item",
  SPAWN_WEAPON = "spawn_weapon",
  GOD_MODE = "god_mode",
  NOCLIP = "noclip",
  INVISIBLE = "invisible",
  
  // --- GESTION ÉCONOMIQUE ---
  GIVE_CASH = "give_cash",
  GIVE_BANK = "give_bank",
  SET_JOB = "set_job",
  SET_SALARY = "set_salary",
  
  // --- GESTION STAFF ---
  PROMOTE = "promote",
  DEMOTE = "demote",
  SET_ROLE = "set_role",
  VIEW_AUDIT = "view_audit",
  STAFF_CHAT = "staff_chat",
  
  // --- GESTION DU MONDE ---
  SET_WEATHER = "set_weather",
  SET_TIME = "set_time",
  SPAWN_EVENT = "spawn_event",
  BUILD_MODE = "build_mode",
  
  // --- OUTILS RP AVANCÉS ---
  ARREST = "arrest",
  TICKET = "ticket",
  SEARCH = "search",
  SEIZE = "seize",
  HEAL = "heal",
  REVIVE = "revive",
  DISPATCH = "dispatch",
  VIEW_RECORD = "view_record",
  IMPOUND = "impound",
  BOUNTY = "bounty",
}

// ═══════════════════════════════════════════════════════════
// 5. MAPPING RÔLE -> PERMISSIONS
// ═══════════════════════════════════════════════════════════

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.NONE]: [],
  
  [AdminRole.TRIAL_HELPER]: [
    Permission.STAFF_CHAT,
    Permission.WARN,
  ],
  
  [AdminRole.HELPER]: [
    Permission.STAFF_CHAT,
    Permission.WARN,
    Permission.HEAL,
    Permission.TELEPORT,
  ],
  
  [AdminRole.TRIAL_MOD]: [
    Permission.STAFF_CHAT,
    Permission.WARN,
    Permission.KICK,
    Permission.MUTE,
    Permission.JAIL,
    Permission.HEAL,
    Permission.TELEPORT,
  ],
  
  [AdminRole.MOD]: [
    Permission.STAFF_CHAT,
    Permission.WARN,
    Permission.KICK,
    Permission.MUTE,
    Permission.JAIL,
    Permission.FREEZE,
    Permission.HEAL,
    Permission.REVIVE,
    Permission.TELEPORT,
    Permission.ARREST,
    Permission.TICKET,
    Permission.SEARCH,
    Permission.DISPATCH,
    Permission.VIEW_RECORD,
    Permission.IMPOUND,
    Permission.BOUNTY,
  ],
  
  [AdminRole.SENIOR_MOD]: [
    Permission.STAFF_CHAT,
    Permission.WARN,
    Permission.KICK,
    Permission.MUTE,
    Permission.JAIL,
    Permission.FREEZE,
    Permission.HEAL,
    Permission.REVIVE,
    Permission.TELEPORT,
    Permission.ARREST,
    Permission.TICKET,
    Permission.SEARCH,
    Permission.SEIZE,
    Permission.SPAWN_VEHICLE,
    Permission.DISPATCH,
    Permission.VIEW_RECORD,
    Permission.IMPOUND,
    Permission.BOUNTY,
  ],
  
  [AdminRole.ADMIN]: [
    Permission.STAFF_CHAT,
    Permission.WARN,
    Permission.KICK,
    Permission.MUTE,
    Permission.JAIL,
    Permission.FREEZE,
    Permission.BAN,
    Permission.HEAL,
    Permission.REVIVE,
    Permission.TELEPORT,
    Permission.ARREST,
    Permission.TICKET,
    Permission.SEARCH,
    Permission.SEIZE,
    Permission.SPAWN_VEHICLE,
    Permission.SPAWN_ITEM,
    Permission.GOD_MODE,
    Permission.NOCLIP,
    Permission.INVISIBLE,
    Permission.SET_WEATHER,
    Permission.SET_TIME,
    Permission.DISPATCH,
    Permission.VIEW_RECORD,
    Permission.IMPOUND,
    Permission.BOUNTY,
  ],
  
  [AdminRole.SUPERADMIN]: [
    Permission.STAFF_CHAT,
    Permission.WARN,
    Permission.KICK,
    Permission.MUTE,
    Permission.JAIL,
    Permission.FREEZE,
    Permission.BAN,
    Permission.HEAL,
    Permission.REVIVE,
    Permission.TELEPORT,
    Permission.ARREST,
    Permission.TICKET,
    Permission.SEARCH,
    Permission.SEIZE,
    Permission.SPAWN_VEHICLE,
    Permission.SPAWN_ITEM,
    Permission.SPAWN_WEAPON,
    Permission.GOD_MODE,
    Permission.NOCLIP,
    Permission.INVISIBLE,
    Permission.GIVE_CASH,
    Permission.GIVE_BANK,
    Permission.SET_WEATHER,
    Permission.SET_TIME,
    Permission.SPAWN_EVENT,
    Permission.BUILD_MODE,
    Permission.DISPATCH,
    Permission.VIEW_RECORD,
    Permission.IMPOUND,
    Permission.BOUNTY,
  ],
  
  [AdminRole.HEAD_ADMIN]: Object.values(Permission),
  
  [AdminRole.COMMUNITY_MANAGER]: [
    Permission.STAFF_CHAT,
    Permission.WARN,
    Permission.KICK,
    Permission.MUTE,
    Permission.HEAL,
    Permission.TELEPORT,
    Permission.SPAWN_EVENT,
    Permission.SET_WEATHER,
  ],
  
  [AdminRole.EVENT_MANAGER]: [
    Permission.STAFF_CHAT,
    Permission.TELEPORT,
    Permission.SPAWN_EVENT,
    Permission.SPAWN_ITEM,
    Permission.SPAWN_VEHICLE,
    Permission.SET_WEATHER,
    Permission.SET_TIME,
    Permission.GOD_MODE,
    Permission.BUILD_MODE,
  ],
  
  [AdminRole.OWNER]: Object.values(Permission),
  [AdminRole.DEVELOPER]: Object.values(Permission),
  [AdminRole.SENIOR_DEV]: Object.values(Permission),
  [AdminRole.INTELLECTUS_AI]: Object.values(Permission),
};

// ═══════════════════════════════════════════════════════════
// 6. NIVEAUX D'ACCÈS AUX ZONES
// ═══════════════════════════════════════════════════════════

export enum ZoneAccess {
  PUBLIC = 0,
  RESTRICTED = 1,
  STAFF_ONLY = 2,
  DEV_ONLY = 3,
}

// ═══════════════════════════════════════════════════════════
// 7. HIÉRARCHIE NUMÉRIQUE
// ═══════════════════════════════════════════════════════════

export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.NONE]: 0,
  [AdminRole.TRIAL_HELPER]: 1,
  [AdminRole.HELPER]: 2,
  [AdminRole.TRIAL_MOD]: 3,
  [AdminRole.MOD]: 4,
  [AdminRole.SENIOR_MOD]: 5,
  [AdminRole.ADMIN]: 6,
  [AdminRole.SUPERADMIN]: 7,
  [AdminRole.HEAD_ADMIN]: 8,
  [AdminRole.COMMUNITY_MANAGER]: 8,
  [AdminRole.EVENT_MANAGER]: 7,
  [AdminRole.OWNER]: 9,
  [AdminRole.DEVELOPER]: 10,
  [AdminRole.SENIOR_DEV]: 11,
  [AdminRole.INTELLECTUS_AI]: 12,
};

export const ROLE_LADDER: AdminRole[] = [
  AdminRole.NONE,
  AdminRole.TRIAL_HELPER,
  AdminRole.HELPER,
  AdminRole.TRIAL_MOD,
  AdminRole.MOD,
  AdminRole.SENIOR_MOD,
  AdminRole.ADMIN,
  AdminRole.SUPERADMIN,
  AdminRole.HEAD_ADMIN,
  AdminRole.OWNER,
  AdminRole.DEVELOPER,
  AdminRole.SENIOR_DEV,
  AdminRole.INTELLECTUS_AI,
];

// ═══════════════════════════════════════════════════════════
// 8. INTERFACES UTILISATEURS & BADGES
// ═══════════════════════════════════════════════════════════

export interface StaffEntry {
  identifier: string;
  displayName: string;
  role: AdminRole;
  job: RpJobRole;
  department?: Department;
  onDuty?: boolean;
  joinedAt?: number;
  lastSeen?: number;
}

export interface RoleBadge {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon?: string;
}

export interface JobBadge {
  label: string;
  color: string;
  department?: string;
  icon?: string;
}

// ═══════════════════════════════════════════════════════════
// 9. ALIAS DE PARSING (FR/EN)
// ═══════════════════════════════════════════════════════════

const ROLE_ALIASES: Record<string, AdminRole> = {
  // Français
  aucun: AdminRole.NONE,
  joueur: AdminRole.NONE,
  citoyen: AdminRole.NONE,
  stagiaire: AdminRole.TRIAL_HELPER,
  modo: AdminRole.MOD,
  moderateur: AdminRole.MOD,
  super: AdminRole.SUPERADMIN,
  head: AdminRole.HEAD_ADMIN,
  fondateur: AdminRole.OWNER,
  proprio: AdminRole.OWNER,
  dev: AdminRole.DEVELOPER,
  programmeur: AdminRole.DEVELOPER,
  intellectus: AdminRole.INTELLECTUS_AI,
  ia: AdminRole.INTELLECTUS_AI,
  
  // Anglais
  none: AdminRole.NONE,
  player: AdminRole.NONE,
  trial_helper: AdminRole.TRIAL_HELPER,
  helper: AdminRole.HELPER,
  help: AdminRole.HELPER,
  trial_mod: AdminRole.TRIAL_MOD,
  mod: AdminRole.MOD,
  moderator: AdminRole.MOD,
  senior_mod: AdminRole.SENIOR_MOD,
  admin: AdminRole.ADMIN,
  administrator: AdminRole.ADMIN,
  superadmin: AdminRole.SUPERADMIN,
  head_admin: AdminRole.HEAD_ADMIN,
  community: AdminRole.COMMUNITY_MANAGER,
  community_manager: AdminRole.COMMUNITY_MANAGER,
  event: AdminRole.EVENT_MANAGER,
  event_manager: AdminRole.EVENT_MANAGER,
  owner: AdminRole.OWNER,
  developer: AdminRole.DEVELOPER,
  senior_dev: AdminRole.SENIOR_DEV,
  intellectus_ai: AdminRole.INTELLECTUS_AI,
  ai: AdminRole.INTELLECTUS_AI,
};

const JOB_ALIASES: Record<string, RpJobRole> = {
  // Civils
  civilian: RpJobRole.CIVILIAN,
  civil: RpJobRole.CIVILIAN,
  citoyen: RpJobRole.CIVILIAN,
  unemployed: RpJobRole.UNEMPLOYED,
  chomeur: RpJobRole.UNEMPLOYED,
  student: RpJobRole.STUDENT,
  etudiant: RpJobRole.STUDENT,
  
  // Police
  police_chief: RpJobRole.POLICE_CHIEF,
  chef: RpJobRole.POLICE_CHIEF,
  chef_sq: RpJobRole.POLICE_CHIEF,
  police_captain: RpJobRole.POLICE_CAPTAIN,
  capitaine: RpJobRole.POLICE_CAPTAIN,
  police_lieutenant: RpJobRole.POLICE_LIEUTENANT,
  lieutenant: RpJobRole.POLICE_LIEUTENANT,
  police_sergeant: RpJobRole.POLICE_SERGEANT,
  sergent: RpJobRole.POLICE_SERGEANT,
  police_officer: RpJobRole.POLICE_OFFICER,
  policier: RpJobRole.POLICE_OFFICER,
  sq: RpJobRole.POLICE_OFFICER,
  patrouilleur: RpJobRole.POLICE_OFFICER,
  constable: RpJobRole.POLICE_OFFICER,
  police_cadet: RpJobRole.POLICE_CADET,
  cadet: RpJobRole.POLICE_CADET,
  secret_agent: RpJobRole.SECRET_AGENT,
  agent: RpJobRole.SECRET_AGENT,
  infiltre: RpJobRole.SECRET_AGENT,
  mffp_agent: RpJobRole.MFFP_AGENT,
  mffp: RpJobRole.MFFP_AGENT,
  garde_chasse: RpJobRole.MFFP_AGENT,
  
  // Urgences
  medic_director: RpJobRole.MEDIC_DIRECTOR,
  paramedic: RpJobRole.PARAMEDIC,
  ambulancier: RpJobRole.PARAMEDIC,
  technicien: RpJobRole.PARAMEDIC,
  firefighter: RpJobRole.FIREFIGHTER,
  pompier: RpJobRole.FIREFIGHTER,
  coroner: RpJobRole.CORONER,
  
  // Justice
  mayor: RpJobRole.MAYOR,
  maire: RpJobRole.MAYOR,
  judge: RpJobRole.JUDGE,
  juge: RpJobRole.JUDGE,
  lawyer: RpJobRole.LAWYER,
  avocat: RpJobRole.LAWYER,
  notary: RpJobRole.NOTARY,
  notaire: RpJobRole.NOTARY,
  
  // Commerce
  dispensary_owner: RpJobRole.DISPENSARY_OWNER,
  sqdc: RpJobRole.DISPENSARY_OWNER,
  mechanic: RpJobRole.MECHANIC,
  mecanicien: RpJobRole.MECHANIC,
  trucker: RpJobRole.TRUCKER,
  camionneur: RpJobRole.TRUCKER,
  farmer: RpJobRole.FARMER,
  fermier: RpJobRole.FARMER,
  lumberjack: RpJobRole.LUMBERJACK,
  bucheron: RpJobRole.LUMBERJACK,
  fisherman: RpJobRole.FISHERMAN,
  pecheur: RpJobRole.FISHERMAN,
  miner: RpJobRole.MINER,
  mineur: RpJobRole.MINER,
  construction: RpJobRole.CONSTRUCTION,
  
  // Médias
  journalist: RpJobRole.JOURNALIST,
  journaliste: RpJobRole.JOURNALIST,
  detective: RpJobRole.DETECTIVE,
  taxi_driver: RpJobRole.TAXI_DRIVER,
  taxi: RpJobRole.TAXI_DRIVER,
  realtor: RpJobRole.REALTOR,
  courtier: RpJobRole.REALTOR,
  bartender: RpJobRole.BARTENDER,
  barman: RpJobRole.BARTENDER,
  
  // Crime
  mafia_boss: RpJobRole.MAFIA_BOSS,
  parrain: RpJobRole.MAFIA_BOSS,
  gangster: RpJobRole.GANGSTER,
  criminel: RpJobRole.GANGSTER,
  dealer: RpJobRole.DEALER,
  
  // Staff
  ether_architect: RpJobRole.ETHER_ARCHITECT,
  architecte: RpJobRole.ETHER_ARCHITECT,
};

const DEPARTMENT_ALIASES: Record<string, Department> = {
  none: Department.NONE,
  sq_portneuf: Department.SQ_PORTNEUF,
  sq: Department.SQ_PORTNEUF,
  portneuf: Department.SQ_PORTNEUF,
  sq_donnacona: Department.SQ_DONNACONA,
  donnacona: Department.SQ_DONNACONA,
  ems_portneuf: Department.EMS_PORTNEUF,
  ems: Department.EMS_PORTNEUF,
  fire_portneuf: Department.FIRE_PORTNEUF,
  fire: Department.FIRE_PORTNEUF,
  pompier: Department.FIRE_PORTNEUF,
  mffp: Department.MFFP,
  mrc_portneuf: Department.MRC_PORTNEUF,
  mrc: Department.MRC_PORTNEUF,
  hydro_quebec: Department.HYDRO_QUEBEC,
  hydro: Department.HYDRO_QUEBEC,
  hq: Department.HYDRO_QUEBEC,
  mtq: Department.MTQ,
  palais_justice: Department.PALAIS_JUSTICE,
  justice: Department.PALAIS_JUSTICE,
  penitencier: Department.PENITENCIER,
  prison: Department.PENITENCIER,
  sqdc: Department.SQDC,
  cannabis: Department.SQDC,
  gang_hells: Department.GANG_HELLS,
  hells: Department.GANG_HELLS,
  gang_mafia: Department.GANG_MAFIA,
  mafia: Department.GANG_MAFIA,
};

// ═══════════════════════════════════════════════════════════
// 10. FONCTIONS DE PARSING & VÉRIFICATION
// ═══════════════════════════════════════════════════════════

export function parseAdminRole(raw: unknown): AdminRole | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return ROLE_ALIASES[normalized] ?? null;
}

export function parseRpJobRole(raw: unknown): RpJobRole | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return JOB_ALIASES[normalized] ?? null;
}

export function parseDepartment(raw: unknown): Department | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return DEPARTMENT_ALIASES[normalized] ?? null;
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function getRoleLevel(role: AdminRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function canPerformAction(actorRole: AdminRole, targetRole: AdminRole, permission: Permission): boolean {
  if (!hasPermission(actorRole, permission)) return false;
  if (actorRole === AdminRole.INTELLECTUS_AI || actorRole === AdminRole.OWNER) return true;
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

// ═══════════════════════════════════════════════════════════
// 11. MODULE DISPATCH 911
// ═══════════════════════════════════════════════════════════

export enum DispatchPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum DispatchStatus {
  PENDING = "pending",
  DISPATCHED = "dispatched",
  ON_SCENE = "on_scene",
  RESOLVED = "resolved",
  CANCELLED = "cancelled",
}

export enum DispatchDepartmentTag {
  SQ = "sq",
  EMS = "ems",
  FIRE = "fire",
  MFFP = "mffp",
  TOUS = "tous",
}

export interface DispatchCall {
  id: string;
  code: string;
  label: string;
  department: DispatchDepartmentTag;
  priority: DispatchPriority;
  status: DispatchStatus;
  locationName: string;
  x: number;
  z: number;
  callerId: string;
  callerName: string;
  createdAt: number;
  assignedTo: string[];
  resolvedAt?: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════
// 12. MODULE CASIER JUDICIAIRE
// ═══════════════════════════════════════════════════════════

export interface CriminalCharge {
  id: string;
  identifier: string;
  displayName: string;
  article: string;
  description: string;
  fine: number;
  jailMonths: number;
  officerId: string;
  officerName: string;
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════
// 13. MODULE PRIMES (BOUNTIES)
// ═══════════════════════════════════════════════════════════

export interface Bounty {
  id: string;
  targetId: string;
  targetName: string;
  amount: number;
  issuedBy: string;
  issuedByName: string;
  reason: string;
  createdAt: number;
  claimedBy?: string;
  claimedAt?: number;
  active: boolean;
}

// ═══════════════════════════════════════════════════════════
// 14. MODULE FOURRIÈRE
// ═══════════════════════════════════════════════════════════

export interface ImpoundRecord {
  id: string;
  vehicleId: string;
  ownerId: string;
  ownerName: string;
  reason: string;
  impoundedAt: number;
  feeAmount: number;
  releasedAt?: number;
  releasedBy?: string;
}

// ═══════════════════════════════════════════════════════════
// 15. MODULE SIGNALEMENTS
// ═══════════════════════════════════════════════════════════

export enum ReportStatus {
  OPEN = "open",
  CLAIMED = "claimed",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

export interface PlayerReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId?: string;
  targetName?: string;
  reason: string;
  status: ReportStatus;
  createdAt: number;
  claimedBy?: string;
  resolvedAt?: number;
  resolutionNote?: string;
}

// ═══════════════════════════════════════════════════════════
// 16. TYPES POUR ACTIONS ADMIN
// ═══════════════════════════════════════════════════════════

export interface AdminActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface AdminAction {
  actorId: string;
  targetId?: string;
  permission: Permission;
  args?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// 17. HELPERS DE VALIDATION
// ═══════════════════════════════════════════════════════════

export function isValidAdminRole(role: unknown): role is AdminRole {
  return typeof role === "string" && Object.values(AdminRole).includes(role as AdminRole);
}

export function isValidRpJobRole(job: unknown): job is RpJobRole {
  return typeof job === "string" && Object.values(RpJobRole).includes(job as RpJobRole);
}

export function isValidPermission(perm: unknown): perm is Permission {
  return typeof perm === "string" && Object.values(Permission).includes(perm as Permission);
}

// ═══════════════════════════════════════════════════════════
// 18. CONSTANTES & CONFIGURATION
// ═══════════════════════════════════════════════════════════

export const ADMIN_CONSTANTS = {
  WARN_THRESHOLD: 3,
  AUTO_BAN_DAYS: 7,
  MAX_AUDIT_LOG: 500,
  MAX_SANCTIONS: 200,
  MAX_DISPATCH: 200,
  MAX_REPORTS: 200,
  IMPOUND_BASE_FEE: 250,
  IMPOUND_DAILY_FEE: 40,
} as const;

// ═══════════════════════════════════════════════════════════
// 19. ÉVÉNEMENTS SYSTÈME
// ═══════════════════════════════════════════════════════════

export enum AdminEvent {
  ROLE_CHANGED = "admin:role_changed",
  JOB_CHANGED = "admin:job_changed",
  SANCTION_ISSUED = "admin:sanction_issued",
  SANCTION_REVOKED = "admin:sanction_revoked",
  DUTY_TOGGLED = "admin:duty_toggled",
  REPORT_CREATED = "admin:report_created",
  REPORT_RESOLVED = "admin:report_resolved",
  DISPATCH_CREATED = "admin:dispatch_created",
  DISPATCH_UPDATED = "admin:dispatch_updated",
  BOUNTY_PLACED = "admin:bounty_placed",
  BOUNTY_CLAIMED = "admin:bounty_claimed",
}

// ═══════════════════════════════════════════════════════════
// 20. TYPES DE COMMANDES ADMIN
// ═══════════════════════════════════════════════════════════

export interface CommandContext {
  sender: {
    sessionId: string;
    username: string;
    role: AdminRole;
  };
  args: string[];
  raw: string;
  room: any;
}

export interface CommandDefinition {
  name: string;
  permission: AdminRole;
  minArgs?: number;
  usage: string;
  description: string;
  category: string;
  aliases?: string[];
  handler: (ctx: CommandContext) => void | unknown;
}

export interface ServerPerformanceMetrics {
  fps: number;
  pingMs: number;
  playersCount: number;
  vehiclesCount: number;
  entitiesCount: number;
  memoryUsageMB: number;
  networkKbps: number;
  uptimeSeconds: number;
}