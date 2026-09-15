/**
 * ═══════════════════════════════════════════════════════════
 * 🛡️ ETHERWORLD — TYPES RBAC & MÉTIERS RP (v2.1)
 * ═══════════════════════════════════════════════════════════
 * Hiérarchie Platinum RBAC + Métiers RP du Comté de Portneuf.
 * Inspiré des serveurs GTA RP NoPixel / Loyola Life.
 *
 * v2.1 — AJOUTS (rien de supprimé) :
 *   §11 Centrale 911 / Dispatch
 *   §12 Casier judiciaire
 *   §13 Primes (Bounties)
 *   §14 Fourrière municipale
 *   §15 Signalements joueurs (/report)
 * ═══════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════
// 1. GRADES STAFF (Hiérarchie RBAC)
// ═══════════════════════════════════════════════════════════

export enum AdminRole {
  NONE = "none",
  TRIAL_HELPER = "trial_helper",
  HELPER = "helper",
  TRIAL_MOD = "trial_mod",
  MOD = "mod",
  SENIOR_MOD = "senior_mod",
  ADMIN = "admin",
  SUPERADMIN = "superadmin",
  HEAD_ADMIN = "head_admin",
  COMMUNITY_MANAGER = "community_manager",
  EVENT_MANAGER = "event_manager",
  OWNER = "owner",
  DEVELOPER = "developer",
  SENIOR_DEV = "senior_dev",
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

  // Forces de l'ordre
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
  SQ_PORTNEUF = "sq_portneuf",
  SQ_DONNACONA = "sq_donnacona",
  EMS_PORTNEUF = "ems_portneuf",
  FIRE_PORTNEUF = "fire_portneuf",
  MFFP = "mffp",
  MRC_PORTNEUF = "mrc_portneuf",
  HYDRO_QUEBEC = "hydro_quebec",
  MTQ = "mtq",
  PALAIS_JUSTICE = "palais_justice",
  PENITENCIER = "penitencier",
  SQDC = "sqdc",
  GANG_HELLS = "gang_hells",
  GANG_MAFIA = "gang_mafia",
}

// ═══════════════════════════════════════════════════════════
// 4. PERMISSIONS GRANULAIRES (Flags)
// ═══════════════════════════════════════════════════════════

export enum Permission {
  // Modération
  KICK = "kick",
  BAN = "ban",
  MUTE = "mute",
  WARN = "warn",
  JAIL = "jail",
  FREEZE = "freeze",

  // Administration
  TELEPORT = "teleport",
  SPAWN_VEHICLE = "spawn_vehicle",
  SPAWN_ITEM = "spawn_item",
  SPAWN_WEAPON = "spawn_weapon",
  GOD_MODE = "god_mode",
  NOCLIP = "noclip",
  INVISIBLE = "invisible",

  // Économie
  GIVE_CASH = "give_cash",
  GIVE_BANK = "give_bank",
  SET_JOB = "set_job",
  SET_SALARY = "set_salary",

  // Staff
  PROMOTE = "promote",
  DEMOTE = "demote",
  SET_ROLE = "set_role",
  VIEW_AUDIT = "view_audit",
  STAFF_CHAT = "staff_chat",

  // Monde
  SET_WEATHER = "set_weather",
  SET_TIME = "set_time",
  SPAWN_EVENT = "spawn_event",
  BUILD_MODE = "build_mode",

  // RP
  ARREST = "arrest",
  TICKET = "ticket",
  SEARCH = "search",
  SEIZE = "seize",
  HEAL = "heal",
  REVIVE = "revive",

  // RP — AJOUTS v2.1
  DISPATCH = "dispatch",
  VIEW_RECORD = "view_record",
  IMPOUND = "impound",
  BOUNTY = "bounty",
}

// Mapping automatique : quel grade donne quelles permissions
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.NONE]: [],
  [AdminRole.TRIAL_HELPER]: [Permission.STAFF_CHAT, Permission.WARN],
  [AdminRole.HELPER]: [Permission.STAFF_CHAT, Permission.WARN, Permission.HEAL, Permission.TELEPORT],
  [AdminRole.TRIAL_MOD]: [Permission.STAFF_CHAT, Permission.WARN, Permission.KICK, Permission.MUTE, Permission.JAIL, Permission.HEAL, Permission.TELEPORT],
  [AdminRole.MOD]: [Permission.STAFF_CHAT, Permission.WARN, Permission.KICK, Permission.MUTE, Permission.JAIL, Permission.FREEZE, Permission.HEAL, Permission.REVIVE, Permission.TELEPORT, Permission.ARREST, Permission.TICKET, Permission.SEARCH, Permission.DISPATCH, Permission.VIEW_RECORD, Permission.IMPOUND, Permission.BOUNTY],
  [AdminRole.SENIOR_MOD]: [Permission.STAFF_CHAT, Permission.WARN, Permission.KICK, Permission.MUTE, Permission.JAIL, Permission.FREEZE, Permission.HEAL, Permission.REVIVE, Permission.TELEPORT, Permission.ARREST, Permission.TICKET, Permission.SEARCH, Permission.SEIZE, Permission.SPAWN_VEHICLE, Permission.DISPATCH, Permission.VIEW_RECORD, Permission.IMPOUND, Permission.BOUNTY],
  [AdminRole.ADMIN]: [Permission.STAFF_CHAT, Permission.WARN, Permission.KICK, Permission.MUTE, Permission.JAIL, Permission.FREEZE, Permission.BAN, Permission.HEAL, Permission.REVIVE, Permission.TELEPORT, Permission.ARREST, Permission.TICKET, Permission.SEARCH, Permission.SEIZE, Permission.SPAWN_VEHICLE, Permission.SPAWN_ITEM, Permission.GOD_MODE, Permission.NOCLIP, Permission.INVISIBLE, Permission.SET_WEATHER, Permission.SET_TIME, Permission.DISPATCH, Permission.VIEW_RECORD, Permission.IMPOUND, Permission.BOUNTY],
  [AdminRole.SUPERADMIN]: [Permission.STAFF_CHAT, Permission.WARN, Permission.KICK, Permission.MUTE, Permission.JAIL, Permission.FREEZE, Permission.BAN, Permission.HEAL, Permission.REVIVE, Permission.TELEPORT, Permission.ARREST, Permission.TICKET, Permission.SEARCH, Permission.SEIZE, Permission.SPAWN_VEHICLE, Permission.SPAWN_ITEM, Permission.SPAWN_WEAPON, Permission.GOD_MODE, Permission.NOCLIP, Permission.INVISIBLE, Permission.GIVE_CASH, Permission.GIVE_BANK, Permission.SET_WEATHER, Permission.SET_TIME, Permission.SPAWN_EVENT, Permission.BUILD_MODE, Permission.DISPATCH, Permission.VIEW_RECORD, Permission.IMPOUND, Permission.BOUNTY],
  [AdminRole.HEAD_ADMIN]: [Permission.STAFF_CHAT, Permission.WARN, Permission.KICK, Permission.MUTE, Permission.JAIL, Permission.FREEZE, Permission.BAN, Permission.HEAL, Permission.REVIVE, Permission.TELEPORT, Permission.ARREST, Permission.TICKET, Permission.SEARCH, Permission.SEIZE, Permission.SPAWN_VEHICLE, Permission.SPAWN_ITEM, Permission.SPAWN_WEAPON, Permission.GOD_MODE, Permission.NOCLIP, Permission.INVISIBLE, Permission.GIVE_CASH, Permission.GIVE_BANK, Permission.SET_JOB, Permission.SET_SALARY, Permission.PROMOTE, Permission.DEMOTE, Permission.SET_ROLE, Permission.VIEW_AUDIT, Permission.SET_WEATHER, Permission.SET_TIME, Permission.SPAWN_EVENT, Permission.BUILD_MODE, Permission.DISPATCH, Permission.VIEW_RECORD, Permission.IMPOUND, Permission.BOUNTY],
  [AdminRole.COMMUNITY_MANAGER]: [Permission.STAFF_CHAT, Permission.WARN, Permission.KICK, Permission.MUTE, Permission.HEAL, Permission.TELEPORT, Permission.SPAWN_EVENT, Permission.SET_WEATHER],
  [AdminRole.EVENT_MANAGER]: [Permission.STAFF_CHAT, Permission.TELEPORT, Permission.SPAWN_EVENT, Permission.SPAWN_ITEM, Permission.SPAWN_VEHICLE, Permission.SET_WEATHER, Permission.SET_TIME, Permission.GOD_MODE, Permission.BUILD_MODE],
  [AdminRole.OWNER]: Object.values(Permission),
  [AdminRole.DEVELOPER]: Object.values(Permission),
  [AdminRole.SENIOR_DEV]: Object.values(Permission),
  [AdminRole.INTELLECTUS_AI]: Object.values(Permission),
};

// ═══════════════════════════════════════════════════════════
// 5. NIVEAUX D'ACCÈS AUX ZONES
// ═══════════════════════════════════════════════════════════

export enum ZoneAccess {
  PUBLIC = 0,
  RESTRICTED = 1,
  STAFF_ONLY = 2,
  DEV_ONLY = 3,
}

// ═══════════════════════════════════════════════════════════
// 6. TYPES DE SHIFTS (Prise de service)
// ═══════════════════════════════════════════════════════════

export enum ShiftType {
  OFF_DUTY = "off_duty",
  DAY = "day",          // 06h - 14h
  EVENING = "evening",  // 14h - 22h
  NIGHT = "night",      // 22h - 06h
  ON_CALL = "on_call",  // Garde à domicile
  OVERTIME = "overtime",// Temps supplémentaire
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
// 8. INTERFACES
// ═══════════════════════════════════════════════════════════

export interface StaffEntry {
  identifier: string;
  displayName: string;
  role: AdminRole;
  job: RpJobRole;
  department?: Department;
  shift?: ShiftType;
  onDuty?: boolean;
  joinedAt?: number;
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
// 9. ALIAS DE PARSING (Français québécois + Anglais)
// ═══════════════════════════════════════════════════════════

const ROLE_ALIASES: Record<string, AdminRole> = {
  none: AdminRole.NONE,
  joueur: AdminRole.NONE,
  citoyen: AdminRole.NONE,
  player: AdminRole.NONE,
  trial_helper: AdminRole.TRIAL_HELPER,
  trialhelper: AdminRole.TRIAL_HELPER,
  stagiaire: AdminRole.TRIAL_HELPER,
  helper: AdminRole.HELPER,
  help: AdminRole.HELPER,
  trial_mod: AdminRole.TRIAL_MOD,
  trialmod: AdminRole.TRIAL_MOD,
  mod: AdminRole.MOD,
  modo: AdminRole.MOD,
  moderator: AdminRole.MOD,
  moderateur: AdminRole.MOD,
  senior_mod: AdminRole.SENIOR_MOD,
  seniormod: AdminRole.SENIOR_MOD,
  admin: AdminRole.ADMIN,
  administrateur: AdminRole.ADMIN,
  superadmin: AdminRole.SUPERADMIN,
  super: AdminRole.SUPERADMIN,
  head: AdminRole.HEAD_ADMIN,
  head_admin: AdminRole.HEAD_ADMIN,
  headadmin: AdminRole.HEAD_ADMIN,
  community: AdminRole.COMMUNITY_MANAGER,
  community_manager: AdminRole.COMMUNITY_MANAGER,
  event: AdminRole.EVENT_MANAGER,
  event_manager: AdminRole.EVENT_MANAGER,
  owner: AdminRole.OWNER,
  fondateur: AdminRole.OWNER,
  proprio: AdminRole.OWNER,
  developer: AdminRole.DEVELOPER,
  dev: AdminRole.DEVELOPER,
  programmeur: AdminRole.DEVELOPER,
  senior_dev: AdminRole.SENIOR_DEV,
  seniordev: AdminRole.SENIOR_DEV,
  intellectus_ai: AdminRole.INTELLECTUS_AI,
  intellectus: AdminRole.INTELLECTUS_AI,
  ia: AdminRole.INTELLECTUS_AI,
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

// ═══════════════════════════════════════════════════════════
// 10. FONCTIONS DE PARSING
// ═══════════════════════════════════════════════════════════

export function parseAdminRole(raw: unknown): AdminRole | null {
  if (typeof raw !== "string") return null;
  return ROLE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export function parseRpJobRole(raw: unknown): RpJobRole | null {
  if (typeof raw !== "string") return null;
  return JOB_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export function parseDepartment(raw: unknown): Department | null {
  if (typeof raw !== "string") return null;
  const q = raw.trim().toLowerCase();
  for (const [key, val] of Object.entries(Department)) {
    if (key.toLowerCase() === q || val === q) return val as Department;
  }
  return null;
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}

export function getPermissions(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ═══════════════════════════════════════════════════════════
// 11. CENTRALE DE RÉPARTITION 911 / DISPATCH (NOUVEAU v2.1)
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
  code: string; // ex: "10-32", "code_3"
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
// 12. CASIER JUDICIAIRE (NOUVEAU v2.1)
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
// 13. PRIMES / BOUNTIES (NOUVEAU v2.1)
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
// 14. FOURRIÈRE MUNICIPALE MTQ (NOUVEAU v2.1)
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
// 15. SIGNALEMENTS JOUEURS /report (NOUVEAU v2.1)
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