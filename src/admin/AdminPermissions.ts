// src/admin/AdminPermissions.ts
// ETHERWORLD RP — TroxTetherworld Platinum RBAC System

import { AdminRole, RpJobRole, ROLE_HIERARCHY } from "../shared/AdminTypes";

export { AdminRole, RpJobRole, ROLE_HIERARCHY };

// Registry mapping session IDs / user identifiers to their active admin role
const userRoles: Map<string, AdminRole> = new Map();
const userJobs: Map<string, RpJobRole> = new Map();

// Default staff member setup for local/dev play
userRoles.set("local_player", AdminRole.INTELLECTUS_AI);
userRoles.set("admin_1", AdminRole.SUPERADMIN);
userRoles.set("head_1", AdminRole.HEAD_ADMIN);
userRoles.set("mod_1", AdminRole.MOD);
userRoles.set("helper_1", AdminRole.HELPER);

userJobs.set("local_player", RpJobRole.ETHER_ARCHITECT);
userJobs.set("admin_1", RpJobRole.POLICE_CHIEF);

export function getUserRole(identifier: string): AdminRole {
  return userRoles.get(identifier) || AdminRole.NONE;
}

export function setUserRole(identifier: string, role: AdminRole): void {
  userRoles.set(identifier, role);
}

export function getUserJob(identifier: string): RpJobRole {
  return userJobs.get(identifier) || RpJobRole.CIVILIAN;
}

export function setUserJob(identifier: string, job: RpJobRole): void {
  userJobs.set(identifier, job);
}

export function getAllStaffMembers(): Array<{ identifier: string; role: AdminRole; job: RpJobRole }> {
  const staff: Array<{ identifier: string; role: AdminRole; job: RpJobRole }> = [];
  userRoles.forEach((role, id) => {
    if (role !== AdminRole.NONE) {
      staff.push({
        identifier: id,
        role,
        job: getUserJob(id),
      });
    }
  });
  return staff;
}

export function promoteUser(identifier: string): AdminRole {
  const current = getUserRole(identifier);
  const roles = [
    AdminRole.NONE,
    AdminRole.HELPER,
    AdminRole.MOD,
    AdminRole.ADMIN,
    AdminRole.SUPERADMIN,
    AdminRole.HEAD_ADMIN,
    AdminRole.OWNER,
    AdminRole.DEVELOPER,
    AdminRole.INTELLECTUS_AI,
  ];
  const idx = roles.indexOf(current);
  if (idx >= 0 && idx < roles.length - 1) {
    const next = roles[idx + 1];
    setUserRole(identifier, next);
    return next;
  }
  return current;
}

export function demoteUser(identifier: string): AdminRole {
  const current = getUserRole(identifier);
  const roles = [
    AdminRole.NONE,
    AdminRole.HELPER,
    AdminRole.MOD,
    AdminRole.ADMIN,
    AdminRole.SUPERADMIN,
    AdminRole.HEAD_ADMIN,
    AdminRole.OWNER,
    AdminRole.DEVELOPER,
    AdminRole.INTELLECTUS_AI,
  ];
  const idx = roles.indexOf(current);
  if (idx > 0) {
    const prev = roles[idx - 1];
    setUserRole(identifier, prev);
    return prev;
  }
  return current;
}

export function hasPermission(userRole: AdminRole, requiredRole: AdminRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

export function checkPermission(identifier: string, requiredRole: AdminRole): boolean {
  const role = getUserRole(identifier);
  return hasPermission(role, requiredRole);
}

export function getRoleBadgeStyle(role: AdminRole): { label: string; color: string; bg: string; border: string } {
  switch (role) {
    case AdminRole.INTELLECTUS_AI:
      return { label: "INTELLECTUS AI", color: "text-cyan-300 animate-pulse", bg: "bg-cyan-950/80", border: "border-cyan-400/80" };
    case AdminRole.DEVELOPER:
      return { label: "LEAD DEVELOPER", color: "text-purple-300", bg: "bg-purple-900/40", border: "border-purple-500/50" };
    case AdminRole.OWNER:
      return { label: "FONDATEUR", color: "text-amber-300 font-extrabold", bg: "bg-amber-900/50", border: "border-amber-400/60" };
    case AdminRole.HEAD_ADMIN:
      return { label: "HEAD ADMIN", color: "text-rose-300 font-bold", bg: "bg-rose-950/60", border: "border-rose-500/60" };
    case AdminRole.SUPERADMIN:
      return { label: "SUPERADMIN", color: "text-red-300", bg: "bg-red-900/40", border: "border-red-500/50" };
    case AdminRole.ADMIN:
      return { label: "ADMINISTRATEUR", color: "text-indigo-300", bg: "bg-indigo-900/40", border: "border-indigo-500/50" };
    case AdminRole.MOD:
      return { label: "MODÉRATEUR", color: "text-cyan-300", bg: "bg-cyan-900/40", border: "border-cyan-500/50" };
    case AdminRole.HELPER:
      return { label: "HELPER STAFF", color: "text-emerald-300", bg: "bg-emerald-950/50", border: "border-emerald-500/40" };
    default:
      return { label: "JOUEUR RP", color: "text-slate-400", bg: "bg-slate-800/40", border: "border-slate-700/50" };
  }
}

export function getJobBadgeStyle(job: RpJobRole): { label: string; icon: string; color: string } {
  switch (job) {
    case RpJobRole.POLICE_CHIEF:
      return { label: "CHEF DE POLICE", icon: "👮‍♂️", color: "text-blue-400" };
    case RpJobRole.POLICE_OFFICER:
      return { label: "OFFICIER SPVM", icon: "🚓", color: "text-blue-300" };
    case RpJobRole.FBI_AGENT:
      return { label: "AGENT SECRET FBI", icon: "🕶️", color: "text-slate-200" };
    case RpJobRole.MEDIC_DIRECTOR:
      return { label: "DIRECTEUR URGENCES", icon: "🚑", color: "text-red-400" };
    case RpJobRole.PARAMEDIC:
      return { label: "PARAMÉDIC", icon: "🏥", color: "text-red-300" };
    case RpJobRole.MECHANIC:
      return { label: "MÉCANICIEN LEAD", icon: "🔧", color: "text-amber-400" };
    case RpJobRole.MAFIA_BOSS:
      return { label: "PARRAIN MAFIA", icon: "👔", color: "text-purple-400" };
    case RpJobRole.GANGSTER:
      return { label: "GANGSTER", icon: "🏴‍☠️", color: "text-rose-400" };
    case RpJobRole.MAYOR:
      return { label: "MAIRE DE VILLE", icon: "🏛️", color: "text-yellow-300" };
    case RpJobRole.JUDGE:
      return { label: "JUGE SUPRÊME", icon: "⚖️", color: "text-amber-200" };
    case RpJobRole.SECRET_AGENT:
      return { label: "AGENT INFILTRÉ", icon: "🕵️", color: "text-emerald-300" };
    case RpJobRole.DISPENSARY_OWNER:
      return { label: "BOSSDISPENSARY WEED", icon: "🌱", color: "text-emerald-400" };
    case RpJobRole.ETHER_ARCHITECT:
      return { label: "ARCHITECTE ÉTHER", icon: "✨", color: "text-cyan-300" };
    default:
      return { label: "CITOYEN", icon: "🧢", color: "text-slate-300" };
  }
}

