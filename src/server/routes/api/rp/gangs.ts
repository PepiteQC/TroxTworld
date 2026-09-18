/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 👑 GANGS, SYNDICATS CRIMINELS & GUERRES DE TERRITOIRES (/api/rp/gangs)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Système Criminel & Guerres de Territoires du Comté de Portneuf :
 *  - 🏍️ Hells Angels (Chapitre Portneuf — Contrôle des routes & stupéfiants)
 *  - 🍷 Famille Cité d'Or (Mafia Italienne — Extorsion & Blanchiment d'argent)
 *  - 🏙️ Syndicat 418 (Gang de rue local — Hydroponie & Rackets)
 *  - ⚓ Cartel Maritime du Golfe (Contrebande portuaire & Fleuve St-Laurent)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

// ─── 1. TYPES & STRUCTURES CRIMINELLES ──────────────────────────────────────

export type GangId =
  | "hells_angels"
  | "mafia_italienne"
  | "syndicat_418"
  | "cartel_maritime"
  | "independant";

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
  controlPct: number;          // 0 à 100%
  weeklyTributeCash: number;   // Rente de protection versée au gang
  location: { x: number; y: number; z: number; radius: number };
  contested: boolean;
  activeWar?: {
    challengerGang: GangId;
    startedAt: number;
    endsAt: number;
    pointsLeader: GangId;
    challengerScore: number;
    defenderScore: number;
  };
}

export interface GangVaultItem {
  id: string;
  name: string;
  quantity: number;
}

export interface GangVaultDrug {
  id: string;
  name: string;
  grams: number;
}

export interface GangVault {
  dirtyCash: number;
  cleanCash: number;
  weapons: GangVaultItem[];
  drugs: GangVaultDrug[];
  lastLaunderTime: number;
}

export interface CriminalOrganization {
  id: GangId;
  name: string;
  tag: string;
  color: string;
  reputation: number;          // 0 à 100
  heatLevel: number;           // 0 à 100 (Surveillance SQ / Escouade mixte)
  leaderName: string;
  headquarters: { name: string; x: number; y: number; z: number };
  members: GangMember[];
  vault: GangVault;
  controlledTurfs: string[];
  maxMembers: number;
}

// ─── 2. REGISTRE EN MÉMOIRE VIVE DES TERRITOIRES & ORGANISATIONS ─────────────

const bootTime = Date.now();

const turfsMap = new Map<string, TurfZone>([
  [
    "turf_marina_portneuf",
    {
      id: "turf_marina_portneuf",
      name: "Marina & Quais de Portneuf",
      controllingGang: "cartel_maritime",
      controlPct: 92,
      weeklyTributeCash: 12500,
      location: { x: -420, y: 1.5, z: 74, radius: 45 },
      contested: false,
    },
  ],
  [
    "turf_papeterie_donnacona",
    {
      id: "turf_papeterie_donnacona",
      name: "Papeterie & Hangars de Donnacona",
      controllingGang: "hells_angels",
      controlPct: 85,
      weeklyTributeCash: 18000,
      location: { x: 420, y: 3.5, z: -180, radius: 60 },
      contested: false,
    },
  ],
  [
    "turf_sortie_261",
    {
      id: "turf_sortie_261",
      name: "Croisement Route 138 & Sortie 261",
      controllingGang: "mafia_italienne",
      controlPct: 78,
      weeklyTributeCash: 15000,
      location: { x: -261, y: 4.0, z: 4, radius: 40 },
      contested: false,
    },
  ],
  [
    "turf_erabliere_bois",
    {
      id: "turf_erabliere_bois",
      name: "Érablière & Sentiers Forestiers (Saint-Raymond)",
      controllingGang: "syndicat_418",
      controlPct: 60,
      weeklyTributeCash: 8000,
      location: { x: 180, y: 12.0, z: -700, radius: 55 },
      contested: false,
    },
  ],
]);

const gangsMap = new Map<GangId, CriminalOrganization>([
  [
    "hells_angels",
    {
      id: "hells_angels",
      name: "Hells Angels — Chapitre Portneuf",
      tag: "HAMC",
      color: "#dc2626",
      reputation: 95,
      heatLevel: 42,
      leaderName: "Ti-Nomme Paquette",
      headquarters: { name: "Bunker & Clubhouse du Rang", x: 380, y: 4.0, z: -220 },
      members: [
        {
          identifier: "hells_boss",
          displayName: "Ti-Nomme Paquette",
          rank: "boss",
          rankTitle: "Président de Chapitre",
          joinedAt: bootTime - 86400000 * 180,
          contributedDirtyCash: 450000,
          killsCount: 12,
          isOnline: true,
        },
        {
          identifier: "hells_sgt",
          displayName: "Gros-Bob Tremblay",
          rank: "enforcer",
          rankTitle: "Sergent d'armes",
          joinedAt: bootTime - 86400000 * 90,
          contributedDirtyCash: 180000,
          killsCount: 6,
          isOnline: true,
        },
      ],
      vault: {
        dirtyCash: 128500,
        cleanCash: 45000,
        weapons: [
          { id: "ak74", name: "Fusil d'assaut AK-74", quantity: 4 },
          { id: "shotgun", name: "Fusil à pompe Remington 870", quantity: 6 },
        ],
        drugs: [{ id: "weed", name: "Cannabis séché (sachets)", grams: 1200 }],
        lastLaunderTime: bootTime - 3600000,
      },
      controlledTurfs: ["turf_papeterie_donnacona"],
      maxMembers: 16,
    },
  ],
  [
    "mafia_italienne",
    {
      id: "mafia_italienne",
      name: "Famille Cité d'Or",
      tag: "MAFIA",
      color: "#475569",
      reputation: 90,
      heatLevel: 25,
      leaderName: "Don Carmine Moretti",
      headquarters: { name: "Manoir & Vignoble de Neuville", x: -261, y: 6.0, z: 22 },
      members: [
        {
          identifier: "mafia_don",
          displayName: "Don Carmine Moretti",
          rank: "boss",
          rankTitle: "Parrain",
          joinedAt: bootTime - 86400000 * 365,
          contributedDirtyCash: 950000,
          killsCount: 4,
          isOnline: true,
        },
        {
          identifier: "mafia_consigliere",
          displayName: "Avocat Santoro",
          rank: "underboss",
          rankTitle: "Consigliere",
          joinedAt: bootTime - 86400000 * 200,
          contributedDirtyCash: 320000,
          killsCount: 1,
          isOnline: false,
        },
      ],
      vault: {
        dirtyCash: 340000,
        cleanCash: 190000,
        weapons: [{ id: "pistol", name: "Pistolet Beretta 9mm", quantity: 8 }],
        drugs: [],
        lastLaunderTime: bootTime - 1800000,
      },
      controlledTurfs: ["turf_sortie_261"],
      maxMembers: 12,
    },
  ],
  [
    "syndicat_418",
    {
      id: "syndicat_418",
      name: "Syndicat 418",
      tag: "S-418",
      color: "#2563eb",
      reputation: 75,
      heatLevel: 58,
      leaderName: "K-Roc Dubé",
      headquarters: { name: "Sous-sol du bar de Donnacona", x: 440, y: 3.0, z: -10 },
      members: [
        {
          identifier: "synd_boss",
          displayName: "K-Roc Dubé",
          rank: "boss",
          rankTitle: "Chef de bande",
          joinedAt: bootTime - 86400000 * 60,
          contributedDirtyCash: 68000,
          killsCount: 3,
          isOnline: true,
        },
      ],
      vault: {
        dirtyCash: 42000,
        cleanCash: 12000,
        weapons: [{ id: "pistol", name: "Glock 19 (Numéro limé)", quantity: 3 }],
        drugs: [{ id: "weed", name: "Weed hydroponique québécoise", grams: 450 }],
        lastLaunderTime: bootTime - 7200000,
      },
      controlledTurfs: ["turf_erabliere_bois"],
      maxMembers: 20,
    },
  ],
  [
    "cartel_maritime",
    {
      id: "cartel_maritime",
      name: "Cartel Maritime du Golfe",
      tag: "CMG",
      color: "#059669",
      reputation: 88,
      heatLevel: 35,
      leaderName: "Capitaine Vane",
      headquarters: { name: "Hangar & Quai #3 de la Marina", x: -420, y: 2.0, z: 80 },
      members: [
        {
          identifier: "cartel_boss",
          displayName: "Capitaine Vane",
          rank: "boss",
          rankTitle: "Commandant de flotte",
          joinedAt: bootTime - 86400000 * 120,
          contributedDirtyCash: 600000,
          killsCount: 5,
          isOnline: true,
        },
      ],
      vault: {
        dirtyCash: 210000,
        cleanCash: 80000,
        weapons: [{ id: "ar15", name: "Carabine AR-15 Tactique", quantity: 5 }],
        drugs: [{ id: "coca", name: "Briques de contrebande maritime", grams: 800 }],
        lastLaunderTime: bootTime - 5400000,
      },
      controlledTurfs: ["turf_marina_portneuf"],
      maxMembers: 14,
    },
  ],
]);

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Admin-Role, X-Actor-Id, X-Gang-Id, X-Player-Id",
} as const;

// ─── 3. GESTIONNAIRE DE REQUÊTES SERVEUR TANSTACK ────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  try {
    const nowTs = Date.now();

    // ── 1. GET : CONSULTATION DES GANGS, TERRITOIRES, CLASSEMENT & COFFRES ──
    if (method === "GET") {
      const gangIdQuery = url.searchParams.get("gangId") as GangId | undefined;
      const isTurfOnly = url.searchParams.get("turf") === "true";
      const isLeaderboard = url.searchParams.get("leaderboard") === "true";
      const playerId = url.searchParams.get("playerId");

      const allTurfs = Array.from(turfsMap.values());
      const allGangs = Array.from(gangsMap.values());

      // A. Recherche du gang d'un joueur
      if (playerId) {
        for (const gang of allGangs) {
          const member = gang.members.find((m) => m.identifier === playerId);
          if (member) {
            return new Response(
              JSON.stringify({ ok: true, inGang: true, gang, member }),
              { status: 200, headers: JSON_HEADERS }
            );
          }
        }
        return new Response(
          JSON.stringify({ ok: true, inGang: false, gang: null, member: null }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      // B. Carte des Territoires (Turfs)
      if (isTurfOnly) {
        return new Response(
          JSON.stringify({
            ok: true,
            totalTurfs: allTurfs.length,
            turfs: allTurfs,
            timestamp: nowTs,
          }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      // C. Classement Criminel (Leaderboard)
      if (isLeaderboard) {
        const leaderboard = allGangs
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

        return new Response(
          JSON.stringify({ ok: true, count: leaderboard.length, leaderboard }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      // D. Détails d'un gang spécifique
      if (gangIdQuery) {
        const gang = gangsMap.get(gangIdQuery);
        if (!gang) {
          return new Response(
            JSON.stringify({ ok: false, error: "gang_not_found", message: "Organisation criminelle introuvable." }),
            { status: 404, headers: JSON_HEADERS }
          );
        }
        return new Response(JSON.stringify({ ok: true, gang }), { status: 200, headers: JSON_HEADERS });
      }

      // E. Vue d'ensemble complète
      return new Response(
        JSON.stringify({
          ok: true,
          totalOrganizations: allGangs.length,
          gangs: allGangs,
          turfs: allTurfs,
          serverTime: nowTs,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    // ── 2. POST : ACTIONS DE GANGS (GUERRES, BLANCHIMENT, COFFRES, MEMBRES) ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: "invalid_json" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const { action, gangId, actorId = "local_player" } = body;

      if (!action || !gangId) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_action_or_gang_id", message: "Action et identifiant de gang requis." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const gang = gangsMap.get(gangId as GangId);
      if (!gang) {
        return new Response(
          JSON.stringify({ ok: false, error: "gang_not_found" }),
          { status: 404, headers: JSON_HEADERS }
        );
      }

      switch (action) {
        // A. BLANCHIMENT D'ARGENT SALE (LAUNDERING)
        case "launder_money": {
          const { amount } = body;
          const numAmount = Math.max(0, parseInt(amount, 10) || 0);

          if (numAmount <= 0 || gang.vault.dirtyCash < numAmount) {
            return new Response(
              JSON.stringify({ ok: false, error: "insufficient_dirty_cash", message: "Fonds d'argent sale insuffisants dans le coffre." }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          // Commission de blanchiment de 25% (Frais de commerces façades)
          const fee = Math.round(numAmount * 0.25);
          const cleanAmount = numAmount - fee;

          gang.vault.dirtyCash -= numAmount;
          gang.vault.cleanCash += cleanAmount;
          gang.vault.lastLaunderTime = nowTs;
          gang.heatLevel = Math.min(100, gang.heatLevel + Math.round(numAmount / 15000));

          // Télémétrie vers Intellectus
          try {
            await handleIntellectus(request);
          } catch {}

          return new Response(
            JSON.stringify({
              ok: true,
              message: `${numAmount} $ d'argent sale blanchis avec succès (+${cleanAmount} $ propres, -${fee} $ frais de façade).`,
              vault: gang.vault,
              heatLevel: gang.heatLevel,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // B. DÉPÔT DANS LE COFFRE DU GANG (STASH)
        case "deposit_vault": {
          const { dirtyCash = 0, cleanCash = 0, weapon, drug } = body;

          if (dirtyCash > 0) gang.vault.dirtyCash += dirtyCash;
          if (cleanCash > 0) gang.vault.cleanCash += cleanCash;

          if (weapon) {
            const existing = gang.vault.weapons.find((w) => w.id === weapon.id);
            if (existing) {
              existing.quantity += weapon.quantity || 1;
            } else {
              gang.vault.weapons.push({ id: weapon.id, name: weapon.name, quantity: weapon.quantity || 1 });
            }
          }

          if (drug) {
            const existing = gang.vault.drugs.find((d) => d.id === drug.id);
            if (existing) {
              existing.grams += drug.grams || 10;
            } else {
              gang.vault.drugs.push({ id: drug.id, name: drug.name, grams: drug.grams || 10 });
            }
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: "Dépôt effectué dans la planque de l'organisation.",
              vault: gang.vault,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // C. RETRAIT DU COFFRE (RÉSERVÉ AUX HAUTS GRADÉS)
        case "withdraw_vault": {
          const { dirtyCash = 0, cleanCash = 0, weaponId, drugId } = body;
          const member = gang.members.find((m) => m.identifier === actorId);

          if (member && member.rank !== "boss" && member.rank !== "underboss") {
            return new Response(
              JSON.stringify({ ok: false, error: "unauthorized_rank", message: "Seul le Boss ou l'Underboss peut retirer du coffre." }),
              { status: 403, headers: JSON_HEADERS }
            );
          }

          if (dirtyCash > 0) {
            if (gang.vault.dirtyCash < dirtyCash) {
              return new Response(JSON.stringify({ ok: false, error: "insufficient_funds" }), { status: 400, headers: JSON_HEADERS });
            }
            gang.vault.dirtyCash -= dirtyCash;
          }

          if (cleanCash > 0) {
            if (gang.vault.cleanCash < cleanCash) {
              return new Response(JSON.stringify({ ok: false, error: "insufficient_funds" }), { status: 400, headers: JSON_HEADERS });
            }
            gang.vault.cleanCash -= cleanCash;
          }

          if (weaponId) {
            const wIdx = gang.vault.weapons.findIndex((w) => w.id === weaponId);
            if (wIdx >= 0) {
              const w = gang.vault.weapons[wIdx]!;
              w.quantity -= 1;
              if (w.quantity <= 0) gang.vault.weapons.splice(wIdx, 1);
            }
          }

          if (drugId) {
            const dIdx = gang.vault.drugs.findIndex((d) => d.id === drugId);
            if (dIdx >= 0) {
              gang.vault.drugs.splice(dIdx, 1);
            }
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: "Retrait d'équipement / fonds complété depuis le coffre.",
              vault: gang.vault,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // D. DÉCLENCHER UNE GUERRE DE TERRITOIRE (TURF WAR)
        case "initiate_turf_war": {
          const { turfId } = body;
          const turf = turfsMap.get(turfId);

          if (!turf) {
            return new Response(
              JSON.stringify({ ok: false, error: "turf_not_found", message: "Secteur territorial introuvable." }),
              { status: 404, headers: JSON_HEADERS }
            );
          }

          if (turf.controllingGang === gangId) {
            return new Response(
              JSON.stringify({ ok: false, error: "already_controlling_turf", message: "Votre organisation contrôle déjà ce secteur." }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          turf.contested = true;
          turf.activeWar = {
            challengerGang: gangId as GangId,
            startedAt: nowTs,
            endsAt: nowTs + 600000, // Guerre active de 10 minutes
            pointsLeader: gangId as GangId,
            challengerScore: 0,
            defenderScore: 0,
          };

          gang.heatLevel = Math.min(100, gang.heatLevel + 25);

          try {
            await handleIntellectus(request);
          } catch {}

          return new Response(
            JSON.stringify({
              ok: true,
              message: `🔥 GUERRE DE TERRITOIRE DÉCLARÉE : [${gang.name}] conteste [${turf.name}] !`,
              turf,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // E. CAPTURER / SCELLER LA VICTOIRE D'UN TERRITOIRE
        case "capture_turf": {
          const { turfId } = body;
          const turf = turfsMap.get(turfId);

          if (!turf) {
            return new Response(
              JSON.stringify({ ok: false, error: "turf_not_found" }),
              { status: 404, headers: JSON_HEADERS }
            );
          }

          // Retrait du contrôle de l'ancien gang
          if (turf.controllingGang) {
            const oldGang = gangsMap.get(turf.controllingGang);
            if (oldGang) {
              oldGang.controlledTurfs = oldGang.controlledTurfs.filter((id) => id !== turfId);
            }
          }

          turf.controllingGang = gangId as GangId;
          turf.controlPct = 100;
          turf.contested = false;
          turf.activeWar = undefined;

          if (!gang.controlledTurfs.includes(turfId)) {
            gang.controlledTurfs.push(turfId);
          }
          gang.reputation = Math.min(100, gang.reputation + 12);

          try {
            await handleIntellectus(request);
          } catch {}

          return new Response(
            JSON.stringify({
              ok: true,
              message: `🏆 VICTOIRE : [${gang.name}] contrôle désormais [${turf.name}] à 100% !`,
              turf,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // F. COLLECTE DE LA RENTE DE PROTECTION (TRIBUTE)
        case "collect_tribute": {
          const { turfId } = body;
          const turf = turfsMap.get(turfId);

          if (!turf || turf.controllingGang !== gangId) {
            return new Response(
              JSON.stringify({ ok: false, error: "turf_not_controlled", message: "Ce secteur n'est pas sous votre contrôle." }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          const tribute = turf.weeklyTributeCash;
          gang.vault.dirtyCash += tribute;

          return new Response(
            JSON.stringify({
              ok: true,
              message: `💰 Rente de protection perçue sur [${turf.name}] : +${tribute} $ d'argent sale.`,
              tributeCollected: tribute,
              vault: gang.vault,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // G. GESTION DES EFFECTIFS (RECRUTEMENT & PROMOTION)
        case "set_member_rank": {
          const { targetId, targetName, rank, rankTitle } = body;
          let member = gang.members.find((m) => m.identifier === targetId);

          if (!member) {
            if (gang.members.length >= gang.maxMembers) {
              return new Response(
                JSON.stringify({ ok: false, error: "gang_capacity_full", message: "L'effectif maximal du gang est atteint." }),
                { status: 400, headers: JSON_HEADERS }
              );
            }

            member = {
              identifier: targetId,
              displayName: targetName || "Recrue",
              rank: (rank as GangRank) || "prospect",
              rankTitle: rankTitle || "Prospect / Recrue",
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
              message: `Rang de [${member.displayName}] mis à jour : ${member.rankTitle} (${member.rank}).`,
              member,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // H. DESCENTE DE POLICE / RAID SQ (ESCROUERIE / PERQUISITION)
        case "police_raid": {
          const seizedDirty = gang.vault.dirtyCash;
          const seizedWeaponsCount = gang.vault.weapons.length;

          gang.vault.dirtyCash = 0;
          gang.vault.weapons = [];
          gang.heatLevel = Math.max(0, gang.heatLevel - 40);

          return new Response(
            JSON.stringify({
              ok: true,
              message: `🚨 PERQUISITION SQ : ${seizedDirty} $ CAD d'argent sale et ${seizedWeaponsCount} armes saisies au QG de [${gang.name}].`,
              seizedDirty,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        default:
          return new Response(
            JSON.stringify({ ok: false, error: "unknown_action", message: "Action de gang non reconnue." }),
            { status: 400, headers: JSON_HEADERS }
          );
      }
    }

    // ── 3. DELETE : EXPULSION DE MEMBRE OU RETRAIT DE L'ORGANISATION ──
    if (method === "DELETE") {
      const gangId = url.searchParams.get("gangId") as GangId;
      const memberId = url.searchParams.get("memberId");

      if (!gangId) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_gang_id" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const gang = gangsMap.get(gangId);
      if (!gang) {
        return new Response(
          JSON.stringify({ ok: false, error: "gang_not_found" }),
          { status: 404, headers: JSON_HEADERS }
        );
      }

      if (memberId) {
        const idx = gang.members.findIndex((m) => m.identifier === memberId);
        if (idx < 0) {
          return new Response(
            JSON.stringify({ ok: false, error: "member_not_found" }),
            { status: 404, headers: JSON_HEADERS }
          );
        }

        const kicked = gang.members.splice(idx, 1)[0]!;
        return new Response(
          JSON.stringify({
            ok: true,
            message: `Membre [${kicked.displayName}] banni de l'organisation [${gang.name}].`,
          }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({ ok: false, error: "unsupported_operation" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: "method_not_allowed" }),
      { status: 405, headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

// ─── ROUTEUR TANSTACK START ──────────────────────────────────────────────────

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