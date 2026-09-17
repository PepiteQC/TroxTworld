/**
 * ═══════════════════════════════════════════════════════════════════
 * 👥 TROXTWORLD / ETHERWORLD — ANNUAIRE DES CITOYENS RP (/api/rp/players)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Annuaire Central & Registre de Population du Comté de Portneuf :
 *  - 📋 Liste des Citoyens en ligne & Métiers RP
 *  - 🚔 Registre SQ des Avis de Recherche (Wanted Level / Mandats)
 *  - 📻 Fréquences Radio actives & Statuts de Voix
 *  - 🏥 Effectifs d'Urgence en Service (SQ, EMS, Pompiers, MTQ)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type DepartmentType = "sq" | "ems" | "fire" | "mtq" | "mffp" | "justice" | "caisse" | "sqdc" | "civilian";

export interface CitizenDirectoryEntry {
  identifier: string;
  displayName: string;
  phoneNumber: string;
  jobTitle: string;
  department: DepartmentType;
  onDuty: boolean;
  wantedStars: number;          // 0 à 5 étoiles SQ
  hasActiveWarrant: boolean;    // Mandat d'arrêt formel
  currentZone: string;
  isTalking: boolean;
  radioFrequencyMhz?: number;
  pingMs: number;
  joinedAt: number;
  isStaff: boolean;
  avatarUrl?: string;
  licenses: {
    driver: boolean;
    gunPermitSIAF: boolean;
    huntingMFFP: boolean;
    transportSAAQ: boolean;
  };
}

export interface PlayerDirectoryStats {
  totalOnline: number;
  citizensCount: number;
  policeOnDutyCount: number;
  emsOnDutyCount: number;
  firefightersOnDutyCount: number;
  wantedCriminalsCount: number;
  averagePingMs: number;
  populationByVillage: Record<string, number>;
  serverTimestamp: number;
}

// ═══════════════════════════════════════════════════════════
// REGISTRE EN MÉMOIRE DE LA POPULATION DU COMTÉ
// ═══════════════════════════════════════════════════════════

const now = Date.now();

const inMemoryCitizens: CitizenDirectoryEntry[] = [
  {
    identifier: "local_player",
    displayName: "Benoit Gagnon",
    phoneNumber: "418-555-0142",
    jobTitle: "Entrepreneur & Propriétaire",
    department: "civilian",
    onDuty: false,
    wantedStars: 0,
    hasActiveWarrant: false,
    currentZone: "Portneuf (Centre-ville)",
    isTalking: false,
    pingMs: 14,
    joinedAt: now - 3600000 * 2,
    isStaff: true,
    licenses: {
      driver: true,
      gunPermitSIAF: true,
      huntingMFFP: true,
      transportSAAQ: true,
    },
  },
  {
    identifier: "agent_bouchard",
    displayName: "Agent Bouchard",
    phoneNumber: "418-555-0194",
    jobTitle: "Patrouilleur Régional",
    department: "sq",
    onDuty: true,
    wantedStars: 0,
    hasActiveWarrant: false,
    currentZone: "Route 138 (km 261)",
    isTalking: true,
    radioFrequencyMhz: 104.2,
    pingMs: 22,
    joinedAt: now - 3600000 * 4,
    isStaff: false,
    licenses: {
      driver: true,
      gunPermitSIAF: true,
      huntingMFFP: false,
      transportSAAQ: false,
    },
  },
  {
    identifier: "paramedic_tremblay",
    displayName: "Paramédic Tremblay",
    phoneNumber: "418-555-0177",
    jobTitle: "Soins Préhospitaliers d'Urgence",
    department: "ems",
    onDuty: true,
    wantedStars: 0,
    hasActiveWarrant: false,
    currentZone: "Donnacona (Hôpital)",
    isTalking: false,
    radioFrequencyMhz: 108.5,
    pingMs: 19,
    joinedAt: now - 3600000 * 3,
    isStaff: false,
    licenses: {
      driver: true,
      gunPermitSIAF: false,
      huntingMFFP: false,
      transportSAAQ: false,
    },
  },
  {
    identifier: "suspect_ti_nomme",
    displayName: "Ti-Nomme Paquette",
    phoneNumber: "418-555-0666",
    jobTitle: "Président de Chapitre",
    department: "civilian",
    onDuty: false,
    wantedStars: 3,
    hasActiveWarrant: true,
    currentZone: "Rang Sainte-Anne",
    isTalking: false,
    radioFrequencyMhz: 418.0,
    pingMs: 28,
    joinedAt: now - 3600000 * 5,
    isStaff: false,
    licenses: {
      driver: true,
      gunPermitSIAF: false,
      huntingMFFP: true,
      transportSAAQ: false,
    },
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ── 1. GET : CONSULTATION DE L'ANNUAIRE, RECHERCHE, STATS & EXPORT ──
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const exportFormat = url.searchParams.get("export");
      const targetId = url.searchParams.get("id") || url.searchParams.get("identifier");

      const deptFilter = url.searchParams.get("department")?.toLowerCase() as DepartmentType | undefined;
      const wantedFilter = url.searchParams.get("wanted");
      const onDutyFilter = url.searchParams.get("onDuty");
      const zoneFilter = url.searchParams.get("zone")?.toLowerCase();
      const search = url.searchParams.get("search")?.toLowerCase();

      // ── Profil spécifique d'un citoyen ──
      if (targetId) {
        const citizen = inMemoryCitizens.find(
          (c) => c.identifier.toLowerCase() === targetId.toLowerCase() || c.displayName.toLowerCase() === targetId.toLowerCase()
        );

        if (!citizen) {
          return new Response(JSON.stringify({ ok: false, error: "citizen_not_found" }), { status: 404, headers });
        }
        return new Response(JSON.stringify({ ok: true, citizen }), { status: 200, headers });
      }

      // ── Statistiques de Population & Démographie ──
      if (isStats) {
        const popByZone: Record<string, number> = {};
        for (const c of inMemoryCitizens) {
          popByZone[c.currentZone] = (popByZone[c.currentZone] || 0) + 1;
        }

        const avgPing = Math.round(inMemoryCitizens.reduce((acc, c) => acc + c.pingMs, 0) / (inMemoryCitizens.length || 1));

        const stats: PlayerDirectoryStats = {
          totalOnline: inMemoryCitizens.length,
          citizensCount: inMemoryCitizens.filter((c) => c.department === "civilian").length,
          policeOnDutyCount: inMemoryCitizens.filter((c) => c.department === "sq" && c.onDuty).length,
          emsOnDutyCount: inMemoryCitizens.filter((c) => c.department === "ems" && c.onDuty).length,
          firefightersOnDutyCount: inMemoryCitizens.filter((c) => c.department === "fire" && c.onDuty).length,
          wantedCriminalsCount: inMemoryCitizens.filter((c) => c.wantedStars > 0 || c.hasActiveWarrant).length,
          averagePingMs: avgPing,
          populationByVillage: popByZone,
          serverTimestamp: Date.now(),
        };

        return new Response(JSON.stringify({ ok: true, data: stats }), { status: 200, headers });
      }

      // ── Export CSV de l'annuaire ──
      if (exportFormat === "csv") {
        const csvRows = [
          ["ID", "Nom RP", "Telephone", "Metier", "Departement", "En Service", "Etoiles SQ", "Mandat", "Secteur", "Ping"].join(";"),
          ...inMemoryCitizens.map((c) => [
            c.identifier,
            `"${c.displayName.replace(/"/g, '""')}"`,
            c.phoneNumber,
            `"${c.jobTitle.replace(/"/g, '""')}"`,
            c.department.toUpperCase(),
            c.onDuty ? "OUI" : "NON",
            c.wantedStars,
            c.hasActiveWarrant ? "OUI" : "NON",
            `"${c.currentZone.replace(/"/g, '""')}"`,
            `${c.pingMs}ms`,
          ].join(";")),
        ];

        return new Response(csvRows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="annuaire_portneuf_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // ── Filtrage de l'annuaire ──
      let list = [...inMemoryCitizens];

      if (deptFilter) list = list.filter((c) => c.department === deptFilter);
      if (onDutyFilter !== null && onDutyFilter !== undefined && onDutyFilter !== "") {
        const isOnDuty = onDutyFilter === "true";
        list = list.filter((c) => c.onDuty === isOnDuty);
      }
      if (wantedFilter !== null && wantedFilter !== undefined && wantedFilter !== "") {
        const isWanted = wantedFilter === "true";
        list = list.filter((c) => (c.wantedStars > 0 || c.hasActiveWarrant) === isWanted);
      }
      if (zoneFilter) list = list.filter((c) => c.currentZone.toLowerCase().includes(zoneFilter));

      if (search) {
        list = list.filter(
          (c) =>
            c.displayName.toLowerCase().includes(search) ||
            c.phoneNumber.includes(search) ||
            c.jobTitle.toLowerCase().includes(search) ||
            c.identifier.toLowerCase().includes(search)
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          totalCount: list.length,
          citizens: list,
          serverTimestamp: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : ENREGISTRER / METTRE À JOUR UN CITOYEN DANS L'ANNUAIRE ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { identifier, displayName, jobTitle, department, onDuty, wantedStars, hasActiveWarrant, currentZone, licenses } = body;

      if (!identifier) {
        return new Response(JSON.stringify({ ok: false, error: "missing_identifier" }), { status: 400, headers });
      }

      let citizen = inMemoryCitizens.find((c) => c.identifier === identifier);
      const nowTs = Date.now();

      if (!citizen) {
        // Enregistrement d'un nouveau citoyen
        citizen = {
          identifier,
          displayName: displayName || "Citoyen Anonyme",
          phoneNumber: body.phoneNumber || `418-555-${Math.floor(1000 + Math.random() * 9000)}`,
          jobTitle: jobTitle || "Citoyen",
          department: (department as DepartmentType) || "civilian",
          onDuty: Boolean(onDuty),
          wantedStars: Math.max(0, Math.min(5, parseInt(wantedStars, 10) || 0)),
          hasActiveWarrant: Boolean(hasActiveWarrant),
          currentZone: currentZone || "Portneuf",
          isTalking: false,
          pingMs: body.pingMs || 15,
          joinedAt: nowTs,
          isStaff: Boolean(body.isStaff),
          licenses: {
            driver: licenses?.driver ?? true,
            gunPermitSIAF: Boolean(licenses?.gunPermitSIAF),
            huntingMFFP: Boolean(licenses?.huntingMFFP),
            transportSAAQ: Boolean(licenses?.transportSAAQ),
          },
        };
        inMemoryCitizens.push(citizen);
      } else {
        // Mise à jour du citoyen existant
        if (displayName) citizen.displayName = displayName;
        if (jobTitle) citizen.jobTitle = jobTitle;
        if (department) citizen.department = department as DepartmentType;
        if (onDuty !== undefined) citizen.onDuty = Boolean(onDuty);
        if (wantedStars !== undefined) citizen.wantedStars = Math.max(0, Math.min(5, parseInt(wantedStars, 10)));
        if (hasActiveWarrant !== undefined) citizen.hasActiveWarrant = Boolean(hasActiveWarrant);
        if (currentZone) citizen.currentZone = currentZone;
        if (licenses) citizen.licenses = { ...citizen.licenses, ...licenses };
      }

      // Relais silencieux vers Intellectus
      try {
        await handleIntellectus(request);
      } catch {
        // Fallback
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Fiche citoyenne de [${citizen.displayName}] mise à jour dans l'annuaire.`,
          citizen,
        }),
        { status: 200, headers }
      );
    }

    // ── 3. DELETE : DÉCONNEXION / RETRAIT D'UN CITOYEN DE L'ANNUAIRE ──
    if (method === "DELETE") {
      const targetId = url.searchParams.get("id") || url.searchParams.get("identifier");
      if (!targetId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_id" }), { status: 400, headers });
      }

      const idx = inMemoryCitizens.findIndex((c) => c.identifier === targetId);
      if (idx < 0) {
        return new Response(JSON.stringify({ ok: false, error: "citizen_not_found" }), { status: 404, headers });
      }

      const removed = inMemoryCitizens.splice(idx, 1)[0]!;

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Citoyen [${removed.displayName}] retiré de l'annuaire des connectés.`,
          removedIdentifier: removed.identifier,
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

export const Route = createFileRoute("/api/rp/players")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});