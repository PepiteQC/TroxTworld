/**
 * ═══════════════════════════════════════════════════════════════════
 * 👑 TROXTWORLD / ETHERWORLD — API GANGS & ORGANISATIONS RP (/api/rp/gangs)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Système Criminel & Guerres de Territoires du Comté de Portneuf :
 *  - 🏍️ Hells Angels (Chapitre Portneuf)
 *  - 🍷 Mafia Cité d'Or (Italienne / Blanchiment)
 *  - 🏙️ Syndicat 418 (Gang de rue)
 *  - ⚓ Cartel Maritime du Saint-Laurent
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type GangId = "hells_angels" | "mafia_italienne" | "syndicat_418" | "cartel_maritime" | "independant";
export type GangRank = "boss" | "underboss" | "enforcer" | "soldier" | "prospect";

export interface GangMember {
  identifier: string;
  displayName: string;
  rank: GangRank;
  rankTitle: string;
  joinedAt: number;
  contributedDirtyCash: number;
  killsCount: number;
  isOnline: boolean;
}

export interface TurfZone {
  id: string;
  name: string;
  controllingGang: GangId | null;
  controlPct: number; // 0 à 100%
  weeklyTributeCash: number;
  location: { x: number; z: number; radius: number };
  contested: boolean;
  activeWar?: {
    challengerGang: GangId;
    startedAt: number;
    endsAt: number;
    pointsLeader: GangId;
  };
}

export interface GangVault {
  dirtyCash: number;
  cleanCash: number;
  weapons: Array<{ id: string; name: string; quantity: number }>;
  drugs: Array<{ id: string; name: string; grams: number }>;
  lastLaunderTime: number;
}

export interface CriminalOrganization {
  id: GangId;
  name: string;
  tag: string;
  color: string;
  reputation: number; // 0 à 100
  heatLevel: number;  // 0 à 100 (Surveillance SQ / ERM)
  leaderName: string;
  headquarters: { name: string; x: number; z: number };
  members: GangMember[];
  vault: GangVault;
  controlledTurfs: string[];
  maxMembers: number;
}

// ═══════════════════════════════════════════════════════════
// REGISTRE EN MÉMOIRE DES GANGS & TERRITOIRES
// ═══════════════════════════════════════════════════════════

const now = Date.now();

const inMemoryTurfs: TurfZone[] = [
  {
    id: "turf_marina_portneuf",
    name: "Marina & Quais de Portneuf",
    controllingGang: "cartel_maritime",
    controlPct: 92,
    weeklyTributeCash: 12500,
    location: { x: -420, z: 74, radius: 45 },
    contested: false,
  },
  {
    id: "turf_papeterie_donnacona",
    name: "Papeterie & Hangars de Donnacona",
    controllingGang: "hells_angels",
    controlPct: 85,
    weeklyTributeCash: 18000,
    location: { x: 420, z: -180, radius: 60 },
    contested: false,
  },
  {
    id: "turf_sortie_261",
    name: "Croisement Route 138 & Sortie 261",
    controllingGang: "mafia_italienne",
    controlPct: 78,
    weeklyTributeCash: 15000,
    location: { x: -261, z: 4, radius: 40 },
    contested: false,
  },
  {
    id: "turf_erabliere_bois",
    name: "Érablière & Sentiers Forestiers",
    controllingGang: "syndicat_418",
    controlPct: 60,
    weeklyTributeCash: 8000,
    location: { x: 180, z: -700, radius: 55 },
    contested: false,
  },
];

const inMemoryGangs: CriminalOrganization[] = [
  {
    id: "hells_angels",
    name: "Hells Angels — Chapitre Portneuf",
    tag: "HAMC",
    color: "#dc2626", // Rouge et blanc
    reputation: 95,
    heatLevel: 42,
    leaderName: "Ti-Nomme Paquette",
    headquarters: { name: "Bunker & Clubhouse du Rang", x: 380, z: -220 },
    members: [
      { identifier: "hells_boss", displayName: "Ti-Nomme Paquette", rank: "boss", rankTitle: "Président de Chapitre", joinedAt: now - 86400000 * 180, contributedDirtyCash: 450000, killsCount: 12, isOnline: true },
      { identifier: "hells_sgt", displayName: "Gros-Bob Tremblay", rank: "enforcer", rankTitle: "Sergent d'armes", joinedAt: now - 86400000 * 90, contributedDirtyCash: 180000, killsCount: 6, isOnline: true },
    ],
    vault: {
      dirtyCash: 128500,
      cleanCash: 45000,
      weapons: [
        { id: "ak74", name: "Fusil d'assaut AK-74", quantity: 4 },
        { id: "shotgun", name: "Fusil à pompe Remington 870", quantity: 6 },
      ],
      drugs: [{ id: "weed", name: "Cannabis séché (sachets)", grams: 1200 }],
      lastLaunderTime: now - 3600000,
    },
    controlledTurfs: ["turf_papeterie_donnacona"],
    maxMembers: 16,
  },
  {
    id: "mafia_italienne",
    name: "Famille Cité d'Or",
    tag: "MAFIA",
    color: "#475569", // Gris ardoise / costume
    reputation: 90,
    heatLevel: 25,
    leaderName: "Don Carmine Moretti",
    headquarters: { name: "Manoir & Vignoble de Neuville", x: -261, z: 22 },
    members: [
      { identifier: "mafia_don", displayName: "Don Carmine Moretti", rank: "boss", rankTitle: "Parrain", joinedAt: now - 86400000 * 365, contributedDirtyCash: 950000, killsCount: 4, isOnline: true },
      { identifier: "mafia_consigliere", displayName: "Avocat Santoro", rank: "underboss", rankTitle: "Consigliere", joinedAt: now - 86400000 * 200, contributedDirtyCash: 320000, killsCount: 1, isOnline: false },
    ],
    vault: {
      dirtyCash: 340000,
      cleanCash: 190000,
      weapons: [{ id: "pistol", name: "Pistolet Beretta 9mm", quantity: 8 }],
      drugs: [],
      lastLaunderTime: now - 1800000,
    },
    controlledTurfs: ["turf_sortie_261"],
    maxMembers: 12,
  },
  {
    id: "syndicat_418",
    name: "Syndicat 418",
    tag: "S-418",
    color: "#2563eb", // Bleu royal
    reputation: 75,
    heatLevel: 58,
    leaderName: "K-Roc Dubé",
    headquarters: { name: "Sous-sol bar de Donnacona", x: 440, z: -10 },
    members: [
      { identifier: "synd_boss", displayName: "K-Roc Dubé", rank: "boss", rankTitle: "Chef de bande", joinedAt: now - 86400000 * 60, contributedDirtyCash: 68000, killsCount: 3, isOnline: true },
    ],
    vault: {
      dirtyCash: 42000,
      cleanCash: 12000,
      weapons: [{ id: "pistol", name: "Glock 19 sérial limé", quantity: 3 }],
      drugs: [{ id: "weed", name: "Weed hydroponique", grams: 450 }],
      lastLaunderTime: now - 7200000,
    },
    controlledTurfs: ["turf_erabliere_bois"],
    maxMembers: 20,
  },
  {
    id: "cartel_maritime",
    name: "Cartel Maritime du Golfe",
    tag: "CMG",
    color: "#059669", // Émeraude / marin
    reputation: 88,
    heatLevel: 35,
    leaderName: "Capitaine Vane",
    headquarters: { name: "Hangar & Quai #3 Marina", x: -420, z: 80 },
    members: [
      { identifier: "cartel_boss", displayName: "Capitaine Vane", rank: "boss", rankTitle: "Commandant de flotte", joinedAt: now - 86400000 * 120, contributedDirtyCash: 600000, killsCount: 5, isOnline: true },
    ],
    vault: {
      dirtyCash: 210000,
      cleanCash: 80000,
      weapons: [{ id: "ar15", name: "Carabine AR-15 Tactique", quantity: 5 }],
      drugs: [{ id: "coca", name: "Briques de contrebande", grams: 800 }],
      lastLaunderTime: now - 5400000,
    },
    controlledTurfs: ["turf_marina_portneuf"],
    maxMembers: 14,
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id, X-Gang-Id",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ── 1. GET : CONSULTATION DES GANGS, TERRITOIRES & VAULTS ──
    if (method === "GET") {
      const gangIdQuery = url.searchParams.get("gangId") as GangId | undefined;
      const isTurfOnly = url.searchParams.get("turf") === "true";
      const isLeaderboard = url.searchParams.get("leaderboard") === "true";

      // ── Vue carte des territoires (Turfs) ──
      if (isTurfOnly) {
        return new Response(
          JSON.stringify({
            ok: true,
            totalTurfs: inMemoryTurfs.length,
            turfs: inMemoryTurfs,
            timestamp: Date.now(),
          }),
          { status: 200, headers }
        );
      }

      // ── Classement des organisations criminelles ──
      if (isLeaderboard) {
        const leaderboard = [...inMemoryGangs]
          .sort((a, b) => b.reputation - a.reputation)
          .map((g) => ({
            id: g.id,
            name: g.name,
            tag: g.tag,
            color: g.color,
            reputation: g.reputation,
            heatLevel: g.heatLevel,
            turfCount: g.controlledTurfs.length,
            memberCount: g.members.length,
            totalWealth: g.vault.dirtyCash + g.vault.cleanCash,
          }));

        return new Response(JSON.stringify({ ok: true, leaderboard }), { status: 200, headers });
      }

      // ── Détails d'un gang spécifique ──
      if (gangIdQuery) {
        const gang = inMemoryGangs.find((g) => g.id === gangIdQuery);
        if (!gang) {
          return new Response(JSON.stringify({ ok: false, error: "gang_not_found" }), { status: 404, headers });
        }
        return new Response(JSON.stringify({ ok: true, gang }), { status: 200, headers });
      }

      // ── Vue globale pour le HUD / Map ──
      return new Response(
        JSON.stringify({
          ok: true,
          totalOrganizations: inMemoryGangs.length,
          gangs: inMemoryGangs,
          turfs: inMemoryTurfs,
          serverTime: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : ACTIONS DE GANGS (GUERRES, BLANCHIMENT, STASH, EFFECTIFS) ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, gangId, actorId } = body;

      if (!action || !gangId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action_or_gang_id" }), { status: 400, headers });
      }

      const gang = inMemoryGangs.find((g) => g.id === gangId);
      if (!gang) {
        return new Response(JSON.stringify({ ok: false, error: "gang_not_found" }), { status: 404, headers });
      }

      const nowTs = Date.now();

      switch (action) {
        // ── A. BLANCHIMENT D'ARGENT SALE (LAUNDERING) ──
        case "launder_money": {
          const { amount } = body;
          const numAmount = Math.max(0, parseInt(amount, 10));

          if (numAmount <= 0 || gang.vault.dirtyCash < numAmount) {
            return new Response(JSON.stringify({ ok: false, error: "insufficient_dirty_cash" }), { status: 400, headers });
          }

          // Frais de blanchiment 25% (frais de comptoir/façade)
          const fee = Math.round(numAmount * 0.25);
          const cleanAmount = numAmount - fee;

          gang.vault.dirtyCash -= numAmount;
          gang.vault.cleanCash += cleanAmount;
          gang.vault.lastLaunderTime = nowTs;
          gang.heatLevel = Math.min(100, gang.heatLevel + Math.round(numAmount / 10000));

          return new Response(
            JSON.stringify({
              ok: true,
              message: `${numAmount}\u00a0$ d'argent sale blanchis avec succès (+${cleanAmount}\u00a0$ propres, -${fee}\u00a0$ frais de façade).`,
              vault: gang.vault,
              heatLevel: gang.heatLevel,
            }),
            { status: 200, headers }
          );
        }

        // ── B. DÉPÔT DANS LE COFFRE DU GANG (STASH) ──
        case "deposit_vault": {
          const { dirtyCash = 0, cleanCash = 0, weapon, drug } = body;

          if (dirtyCash > 0) gang.vault.dirtyCash += dirtyCash;
          if (cleanCash > 0) gang.vault.cleanCash += cleanCash;

          if (weapon) {
            const existing = gang.vault.weapons.find((w) => w.id === weapon.id);
            if (existing) existing.quantity += weapon.quantity || 1;
            else gang.vault.weapons.push({ id: weapon.id, name: weapon.name, quantity: weapon.quantity || 1 });
          }

          if (drug) {
            const existing = gang.vault.drugs.find((d) => d.id === drug.id);
            if (existing) existing.grams += drug.grams || 10;
            else gang.vault.drugs.push({ id: drug.id, name: drug.name, grams: drug.grams || 10 });
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: "Coffre-fort d'organisation mis à jour avec succès.",
              vault: gang.vault,
            }),
            { status: 200, headers }
          );
        }

        // ── C. DÉCLENCHER UNE GUERRE DE TERRITOIRE (TURF WAR) ──
        case "initiate_turf_war": {
          const { turfId } = body;
          const turf = inMemoryTurfs.find((t) => t.id === turfId);

          if (!turf) {
            return new Response(JSON.stringify({ ok: false, error: "turf_not_found" }), { status: 404, headers });
          }

          if (turf.controllingGang === gangId) {
            return new Response(JSON.stringify({ ok: false, error: "already_controlling_turf" }), { status: 400, headers });
          }

          turf.contested = true;
          turf.activeWar = {
            challengerGang: gangId,
            startedAt: nowTs,
            endsAt: nowTs + 600000, // 10 minutes de guerre
            pointsLeader: gangId,
          };

          gang.heatLevel = Math.min(100, gang.heatLevel + 20);

          return new Response(
            JSON.stringify({
              ok: true,
              message: `🔥 GUERRE DE TERRITOIRE DÉCLARÉE : [${gang.name}] conteste [${turf.name}] !`,
              turf,
            }),
            { status: 200, headers }
          );
        }

        // ── D. CAPTURER / CONCLURE UN TERRITOIRE ──
        case "capture_turf": {
          const { turfId } = body;
          const turf = inMemoryTurfs.find((t) => t.id === turfId);

          if (!turf) {
            return new Response(JSON.stringify({ ok: false, error: "turf_not_found" }), { status: 404, headers });
          }

          // Retirer l'ancien contrôle
          if (turf.controllingGang) {
            const oldGang = inMemoryGangs.find((g) => g.id === turf.controllingGang);
            if (oldGang) oldGang.controlledTurfs = oldGang.controlledTurfs.filter((id) => id !== turfId);
          }

          turf.controllingGang = gangId;
          turf.controlPct = 100;
          turf.contested = false;
          turf.activeWar = undefined;

          if (!gang.controlledTurfs.includes(turfId)) {
            gang.controlledTurfs.push(turfId);
          }
          gang.reputation = Math.min(100, gang.reputation + 10);

          return new Response(
            JSON.stringify({
              ok: true,
              message: `🏆 VICTOIRE : [${gang.name}] contrôle désormais [${turf.name}] à 100% !`,
              turf,
            }),
            { status: 200, headers }
          );
        }

        // ── E. COLLECTE DE LA TAXE DE PROTECTION (TRIBUTE) ──
        case "collect_tribute": {
          const { turfId } = body;
          const turf = inMemoryTurfs.find((t) => t.id === turfId && t.controllingGang === gangId);

          if (!turf) {
            return new Response(JSON.stringify({ ok: false, error: "turf_not_controlled" }), { status: 400, headers });
          }

          const tribute = turf.weeklyTributeCash;
          gang.vault.dirtyCash += tribute;

          return new Response(
            JSON.stringify({
              ok: true,
              message: `💰 Rente de protection perçue sur [${turf.name}] : +${tribute}\u00a0$ d'argent sale.`,
              tributeCollected: tribute,
              vault: gang.vault,
            }),
            { status: 200, headers }
          );
        }

        // ── F. GESTION DES MEMBRES (INVITATION / PROMOTION) ──
        case "set_member_rank": {
          const { targetId, targetName, rank, rankTitle } = body;
          let member = gang.members.find((m) => m.identifier === targetId);

          if (!member) {
            if (gang.members.length >= gang.maxMembers) {
              return new Response(JSON.stringify({ ok: false, error: "gang_capacity_full" }), { status: 400, headers });
            }
            member = {
              identifier: targetId,
              displayName: targetName || "Nouveau membre",
              rank: (rank as GangRank) || "prospect",
              rankTitle: rankTitle || "Recrue",
              joinedAt: nowTs,
              contributedDirtyCash: 0,
              killsCount: 0,
              isOnline: true,
            };
            gang.members.push(member);
          } else {
            member.rank = (rank as GangRank) || member.rank;
            member.rankTitle = rankTitle || member.rankTitle;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Rang de [${member.displayName}] mis à jour -> ${member.rankTitle} (${member.rank})`,
              member,
            }),
            { status: 200, headers }
          );
        }

        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }
    }

    // ── 3. DELETE : DISSOLUTION DE GANG OU EXPULSION DE MEMBRE ──
    if (method === "DELETE") {
      const gangId = url.searchParams.get("gangId") as GangId;
      const memberId = url.searchParams.get("memberId");

      if (!gangId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_gang_id" }), { status: 400, headers });
      }

      const gang = inMemoryGangs.find((g) => g.id === gangId);
      if (!gang) {
        return new Response(JSON.stringify({ ok: false, error: "gang_not_found" }), { status: 404, headers });
      }

      // Expulsion d'un membre
      if (memberId) {
        const idx = gang.members.findIndex((m) => m.identifier === memberId);
        if (idx < 0) {
          return new Response(JSON.stringify({ ok: false, error: "member_not_found" }), { status: 404, headers });
        }
        const kicked = gang.members.splice(idx, 1)[0]!;
        return new Response(
          JSON.stringify({ ok: true, message: `Membre [${kicked.displayName}] expulsé de [${gang.name}].` }),
          { status: 200, headers }
        );
      }

      return new Response(JSON.stringify({ ok: false, error: "unsupported_operation" }), { status: 400, headers });
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

export const Route = createFileRoute("/api/rp/gangs")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});