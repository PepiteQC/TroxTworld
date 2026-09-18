/**
 * ═══════════════════════════════════════════════════════════════════
 * ⚖️ TROXTWORLD / ETHERWORLD — DÉBANNISSEMENT & GRÂCE THIRDEYE (/admin/thirdeye/unban)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Capacités du Module de Débannissement :
 *  - GET    /admin/thirdeye/unban           : Liste paginée et filtrée des bannissements actifs.
 *  - GET    /admin/thirdeye/unban?check=id  : Vérifie si un joueur ou une IP est actuellement banni.
 *  - POST   /admin/thirdeye/unban           : Lève un bannissement (avec ou sans période probatoire).
 *  - DELETE /admin/thirdeye/unban           : Amnistie totale et suppression de la trace de sanction.
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type BanType = "permanent" | "temporary" | "hardware_hwid" | "ip_block" | "security_auto";
export type PardonType = "full_pardon" | "probation" | "appeal_accepted" | "false_positive";

export interface BannedEntry {
  id: string;
  targetId: string;
  targetName: string;
  targetIp?: string;
  type: BanType;
  reason: string;
  category: string;
  bannedAt: number;
  expiresAt: number | null; // null = Permanent
  bannedBy: {
    id: string;
    name: string;
    role: string;
  };
  evidenceUrl?: string;
  active: boolean;
  appealSubmitted: boolean;
}

export interface UnbanResult {
  ok: boolean;
  message: string;
  unbannedEntry: {
    targetId: string;
    targetName: string;
    pardonType: PardonType;
    unbannedAt: number;
    probationDays?: number;
    trustScoreRestored: number;
  };
  operator: {
    id: string;
    name: string;
    role: string;
  };
  reason: string;
}

// ═══════════════════════════════════════════════════════════
// REGISTRE EN MÉMOIRE DES BANNISSEMENTS THIRDEYE
// ═══════════════════════════════════════════════════════════

const now = Date.now();
const inMemoryBans: BannedEntry[] = [
  {
    id: `ban_${now - 86400000 * 3}`,
    targetId: "player_cheater_99",
    targetName: "Xx_Speedy_xX",
    targetIp: "198.51.100.42",
    type: "temporary",
    reason: "SpeedHack répété (> 45 m/s) sur la Route 138",
    category: "speed_teleport",
    bannedAt: now - 86400000 * 3,
    expiresAt: now + 86400000 * 4, // 7 jours au total
    bannedBy: {
      id: "thirdeye_sentinel",
      name: "ThirdEye Anti-Cheat (Auto)",
      role: "intellectus_ai",
    },
    active: true,
    appealSubmitted: true,
  },
  {
    id: `ban_${now - 86400000 * 12}`,
    targetId: "player_exploiter_01",
    targetName: "DarkMoney_Dupe",
    targetIp: "203.0.113.19",
    type: "permanent",
    reason: "Génération illégale de 500 000 $ à la Caisse Populaire",
    category: "money_injection",
    bannedAt: now - 86400000 * 12,
    expiresAt: null,
    bannedBy: {
      id: "admin_1",
      name: "Capitaine Gosselin",
      role: "superadmin",
    },
    active: true,
    appealSubmitted: false,
  },
];

// ═══════════════════════════════════════════════════════════
// HANDLERS SERVEUR
// ═══════════════════════════════════════════════════════════

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id, X-Actor-Name",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ── 1. GET : CONSULTATION DES BANS OU VÉRIFICATION DU STATUT D'UN JOUEUR ──
    if (method === "GET") {
      const checkTarget = url.searchParams.get("check")?.toLowerCase();
      const search = url.searchParams.get("search")?.toLowerCase();
      const statusFilter = url.searchParams.get("active");
      const categoryFilter = url.searchParams.get("category")?.toLowerCase();
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "25", 10)));

      // ── Vérification spécifique d'un joueur ──
      if (checkTarget) {
        const ban = inMemoryBans.find(
          (b) =>
            b.active &&
            (b.targetId.toLowerCase() === checkTarget ||
              b.targetName.toLowerCase() === checkTarget ||
              b.targetIp === checkTarget) &&
            (!b.expiresAt || b.expiresAt > Date.now())
        );

        if (ban) {
          const remainingSec = ban.expiresAt ? Math.max(0, Math.floor((ban.expiresAt - Date.now()) / 1000)) : null;
          return new Response(
            JSON.stringify({
              banned: true,
              entry: ban,
              remainingSeconds: remainingSec,
              permanent: ban.expiresAt === null,
            }),
            { status: 200, headers }
          );
        }

        return new Response(JSON.stringify({ banned: false, message: "Aucun bannissement actif trouvé." }), { status: 200, headers });
      }

      // ── Filtrage et Pagination de la liste ──
      let list = [...inMemoryBans];

      if (statusFilter !== null && statusFilter !== undefined && statusFilter !== "") {
        const isActive = statusFilter === "true";
        list = list.filter((b) => b.active === isActive);
      }

      if (categoryFilter) {
        list = list.filter((b) => b.category.toLowerCase() === categoryFilter);
      }

      if (search) {
        list = list.filter(
          (b) =>
            b.targetName.toLowerCase().includes(search) ||
            b.targetId.toLowerCase().includes(search) ||
            b.reason.toLowerCase().includes(search) ||
            b.bannedBy.name.toLowerCase().includes(search)
        );
      }

      list.sort((a, b) => b.bannedAt - a.bannedAt);

      const totalCount = list.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const paginated = list.slice((page - 1) * limit, page * limit);

      return new Response(
        JSON.stringify({
          ok: true,
          page,
          limit,
          totalPages,
          totalCount,
          activeBansCount: inMemoryBans.filter((b) => b.active).length,
          data: paginated,
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : DÉBANNISSEMENT AUTORITAIRE D'UN JOUEUR ──
    if (method === "POST") {
      const actorRole = request.headers.get("X-Admin-Role")?.toLowerCase() || "none";
      const actorId = request.headers.get("X-Actor-Id") || "console";
      const actorName = request.headers.get("X-Actor-Name") || "Staff Supérieur";

      // Contrôle de permissions strict (au moins Admin)
      const allowedRoles = ["admin", "superadmin", "head_admin", "owner", "developer", "senior_dev", "intellectus_ai"];
      if (!allowedRoles.includes(actorRole)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "forbidden",
            message: "Privilèges insuffisants. Seul un administrateur senior ou le superviseur ThirdEye peut lever un ban.",
          }),
          { status: 403, headers }
        );
      }

      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { targetId, targetName, reason = "Recours accepté / Grâce administrative", pardonType = "full_pardon", resetTrustScore = false, probationDays = 0 } = body;

      if (!targetId && !targetName) {
        return new Response(JSON.stringify({ ok: false, error: "missing_target" }), { status: 400, headers });
      }

      // Recherche du ban correspondant
      const banIdx = inMemoryBans.findIndex(
        (b) =>
          b.active &&
          ((targetId && b.targetId.toLowerCase() === String(targetId).toLowerCase()) ||
            (targetName && b.targetName.toLowerCase() === String(targetName).toLowerCase()))
      );

      if (banIdx < 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "not_found",
            message: `Aucun bannissement actif trouvé pour le joueur [${targetName || targetId}].`,
          }),
          { status: 404, headers }
        );
      }

      const targetBan = inMemoryBans[banIdx]!;
      targetBan.active = false;

      // Calcul du score de confiance restauré
      const restoredScore = resetTrustScore ? 100 : pardonType === "probation" ? 60 : 85;

      // Relais optionnel vers Intellectus
      try {
        await handleIntellectus(request);
      } catch {
        // Fallback
      }

      const result: UnbanResult = {
        ok: true,
        message: `Le joueur [${targetBan.targetName}] (${targetBan.targetId}) a été débanni avec succès.`,
        unbannedEntry: {
          targetId: targetBan.targetId,
          targetName: targetBan.targetName,
          pardonType: pardonType as PardonType,
          unbannedAt: Date.now(),
          probationDays: probationDays > 0 ? probationDays : undefined,
          trustScoreRestored: restoredScore,
        },
        operator: {
          id: actorId,
          name: actorName,
          role: actorRole,
        },
        reason: String(reason),
      };

      return new Response(JSON.stringify(result), { status: 200, headers });
    }

    // ── 3. DELETE : AMNISTIE TOTALE ET EFFACEMENT DE LA SANCTION ──
    if (method === "DELETE") {
      const actorRole = request.headers.get("X-Admin-Role")?.toLowerCase() || "none";
      if (actorRole !== "owner" && actorRole !== "head_admin" && actorRole !== "intellectus_ai") {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "forbidden",
            message: "Seul le Fondateur ou le Head Admin peut purger définitivement un dossier de ban.",
          }),
          { status: 403, headers }
        );
      }

      const banId = url.searchParams.get("id");
      if (!banId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_id" }), { status: 400, headers });
      }

      const idx = inMemoryBans.findIndex((b) => b.id === banId);
      if (idx < 0) {
        return new Response(JSON.stringify({ ok: false, error: "ban_not_found" }), { status: 404, headers });
      }

      const deleted = inMemoryBans.splice(idx, 1)[0]!;

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Dossier de sanction de [${deleted.targetName}] effacé définitivement du registre.`,
          deletedId: deleted.id,
        }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// ROUTEUR TANSTACK
// ═══════════════════════════════════════════════════════════

export const Route = createFileRoute("/admin/thirdeye/unban")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});