/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 👥 ANNUAIRE DES CITOYENS & REGISTRE DE POPULATION RP (/api/rp/players)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Annuaire Central & Registre de Population du Comté de Portneuf :
 *  - 📋 Annuaire des Citoyens en ligne & Métiers RP (MDT Sûreté du Québec)
 *  - 🚔 Registre SQ des Avis de Recherche (Wanted Stars & Mandats d'arrêt)
 *  - 📻 Fréquences Radio actives & Télémétrie Vocale 3D
 *  - 🏥 Effectifs d'Urgence en Service (SQ, Paramédics EMS, Pompiers, MTQ)
 *  - 📊 Démographie par village & Export CSV pour administration
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type DepartmentType =
  | "sq"
  | "ems"
  | "fire"
  | "mtq"
  | "mffp"
  | "justice"
  | "caisse"
  | "sqdc"
  | "civilian";

export interface CitizenDirectoryEntry {
  identifier: string;
  displayName: string;
  phoneNumber: string;
  jobTitle: string;
  department: DepartmentType;
  onDuty: boolean;
  wantedStars: number;          // 0 à 5 étoiles SQ
  hasActiveWarrant: boolean;    // Mandat d'arrêt formel en vigueur
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
  mtqOnDutyCount: number;
  wantedCriminalsCount: number;
  averagePingMs: number;
  populationByVillage: Record<string, number>;
  serverTimestamp: number;
}

// ─── REGISTRE EN MÉMOIRE VIVE DU COMTÉ ───────────────────────────────────────

const bootTime = Date.now();

const citizensMap = new Map<string, CitizenDirectoryEntry>([
  [
    "local_player",
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
      joinedAt: bootTime - 3600000 * 2,
      isStaff: true,
      licenses: {
        driver: true,
        gunPermitSIAF: true,
        huntingMFFP: true,
        transportSAAQ: true,
      },
    },
  ],
  [
    "agent_bouchard",
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
      joinedAt: bootTime - 3600000 * 4,
      isStaff: false,
      licenses: {
        driver: true,
        gunPermitSIAF: true,
        huntingMFFP: false,
        transportSAAQ: false,
      },
    },
  ],
  [
    "paramedic_tremblay",
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
      joinedAt: bootTime - 3600000 * 3,
      isStaff: false,
      licenses: {
        driver: true,
        gunPermitSIAF: false,
        huntingMFFP: false,
        transportSAAQ: false,
      },
    },
  ],
  [
    "suspect_ti_nomme",
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
      joinedAt: bootTime - 3600000 * 5,
      isStaff: false,
      licenses: {
        driver: true,
        gunPermitSIAF: false,
        huntingMFFP: true,
        transportSAAQ: false,
      },
    },
  ],
]);

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id",
} as const;

// ─── GESTIONNAIRE DE REQUÊTES SERVEUR ────────────────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
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
      const search = url.searchParams.get("search")?.toLowerCase().trim();

      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 50));
      const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

      const allCitizens = Array.from(citizensMap.values());

      // A. Profil individuel d'un citoyen
      if (targetId) {
        const citizen =
          citizensMap.get(targetId) ||
          allCitizens.find((c) => c.displayName.toLowerCase() === targetId.toLowerCase());

        if (!citizen) {
          return new Response(
            JSON.stringify({ ok: false, error: "citizen_not_found", message: "Citoyen introuvable au registre civil." }),
            { status: 404, headers: JSON_HEADERS }
          );
        }
        return new Response(JSON.stringify({ ok: true, citizen }), { status: 200, headers: JSON_HEADERS });
      }

      // B. Statistiques Démographiques & Effectifs en Service
      if (isStats) {
        const popByZone: Record<string, number> = {};
        for (const c of allCitizens) {
          popByZone[c.currentZone] = (popByZone[c.currentZone] || 0) + 1;
        }

        const avgPing = allCitizens.length > 0
          ? Math.round(allCitizens.reduce((acc, c) => acc + c.pingMs, 0) / allCitizens.length)
          : 0;

        const stats: PlayerDirectoryStats = {
          totalOnline: allCitizens.length,
          citizensCount: allCitizens.filter((c) => c.department === "civilian").length,
          policeOnDutyCount: allCitizens.filter((c) => c.department === "sq" && c.onDuty).length,
          emsOnDutyCount: allCitizens.filter((c) => c.department === "ems" && c.onDuty).length,
          firefightersOnDutyCount: allCitizens.filter((c) => c.department === "fire" && c.onDuty).length,
          mtqOnDutyCount: allCitizens.filter((c) => c.department === "mtq" && c.onDuty).length,
          wantedCriminalsCount: allCitizens.filter((c) => c.wantedStars > 0 || c.hasActiveWarrant).length,
          averagePingMs: avgPing,
          populationByVillage: popByZone,
          serverTimestamp: Date.now(),
        };

        return new Response(JSON.stringify({ ok: true, data: stats }), { status: 200, headers: JSON_HEADERS });
      }

      // C. Export CSV compatible Excel (UTF-8 avec BOM)
      if (exportFormat === "csv") {
        const csvRows = [
          ["Identifiant", "Nom RP", "Téléphone", "Métier", "Département", "En Service", "Étoiles SQ", "Mandat Actif", "Secteur", "Ping"].join(";"),
          ...allCitizens.map((c) => [
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

        return new Response("\uFEFF" + csvRows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="annuaire_portneuf_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // D. Filtrage et Pagination
      let list = allCitizens;

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

      const paginatedList = list.slice(offset, offset + limit);

      return new Response(
        JSON.stringify({
          ok: true,
          totalCount: list.length,
          count: paginatedList.length,
          offset,
          limit,
          citizens: paginatedList,
          serverTimestamp: Date.now(),
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    // ── 2. POST : ENREGISTRER OU METTRE À JOUR UN CITOYEN ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers: JSON_HEADERS });
      }

      const {
        identifier,
        displayName,
        jobTitle,
        department,
        onDuty,
        wantedStars,
        hasActiveWarrant,
        currentZone,
        licenses,
      } = body;

      if (!identifier) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_identifier", message: "L'identifiant unique du citoyen est requis." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      let citizen = citizensMap.get(identifier);
      const nowTs = Date.now();
      const isNew = !citizen;

      if (!citizen) {
        citizen = {
          identifier,
          displayName: displayName || "Citoyen Anonyme",
          phoneNumber: body.phoneNumber || `418-555-${Math.floor(1000 + Math.random() * 9000)}`,
          jobTitle: jobTitle || "Sans-emploi",
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
        citizensMap.set(identifier, citizen);
      } else {
        if (displayName) citizen.displayName = displayName;
        if (jobTitle) citizen.jobTitle = jobTitle;
        if (department) citizen.department = department as DepartmentType;
        if (onDuty !== undefined) citizen.onDuty = Boolean(onDuty);
        if (wantedStars !== undefined) citizen.wantedStars = Math.max(0, Math.min(5, parseInt(wantedStars, 10)));
        if (hasActiveWarrant !== undefined) citizen.hasActiveWarrant = Boolean(hasActiveWarrant);
        if (currentZone) citizen.currentZone = currentZone;
        if (licenses) citizen.licenses = { ...citizen.licenses, ...licenses };
      }

      // Relais télémétrique vers Intellectus
      try {
        await handleIntellectus(request);
      } catch {
        // Ignorer si hors-ligne
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Fiche citoyenne de [${citizen.displayName}] ${isNew ? "créée" : "mise à jour"} dans l'annuaire.`,
          citizen,
        }),
        { status: isNew ? 201 : 200, headers: JSON_HEADERS }
      );
    }

    // ── 3. DELETE : DÉCONNEXION DU REGISTRE ──
    if (method === "DELETE") {
      const targetId = url.searchParams.get("id") || url.searchParams.get("identifier");
      if (!targetId) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_id", message: "Identifiant manquant pour la suppression." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const citizen = citizensMap.get(targetId);
      if (!citizen) {
        return new Response(
          JSON.stringify({ ok: false, error: "citizen_not_found" }),
          { status: 404, headers: JSON_HEADERS }
        );
      }

      citizensMap.delete(targetId);

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Citoyen [${citizen.displayName}] retiré de l'annuaire de population.`,
          removedIdentifier: citizen.identifier,
        }),
        { status: 200, headers: JSON_HEADERS }
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