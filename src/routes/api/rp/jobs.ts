/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 💼 API EMPLOIS, SALAIRES, CONTRATS & CNESST — QUEBEC RP (/api/rp/jobs)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Système de Carrières, Logistique & Normes du Travail au Québec :
 *  - 🚛 Camionnage B-Train & Dispatch Fret (Teamsters Local 106)
 *  - ⏱️ Pointage des Quarts de Travail & Salaire accumulé en temps réel
 *  - 🏥 Accidents de Travail & Indemnités journalières CNESST (90%)
 *  - 📋 Assurance-Emploi (AE) & Allocations de Transition
 *  - 📜 Formations & Certifications professionnelles (Classe 1, ASP, SIAF)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type JobSector =
  | "transport"
  | "public_safety"
  | "health"
  | "forestry"
  | "construction"
  | "commerce"
  | "agriculture"
  | "mechanic";

export interface JobDefinition {
  id: string;
  title: string;
  employerName: string;
  sector: JobSector;
  hourlyRate: number;
  overtimeRate: number;
  unionAffiliation?: "Teamsters 106" | "FTQ-Construction" | "CSN" | "APPQ" | "SPQ";
  unionDuesPct: number;
  requiredCertifications: string[];
  workLocation: { village: string; x: number; z: number };
  description: string;
}

export interface EmployeeContract {
  playerId: string;
  playerName: string;
  jobId: string;
  jobTitle: string;
  hiredAt: number;
  hourlyWage: number;
  weeklyHoursWorked: number;
  totalEarnings: number;
  certifications: string[];
  activeShift: {
    clockedInAt: number;
    hoursThisShift: number;
    currentEarnings: number;
  } | null;
}

export interface HaulMission {
  id: string;
  title: string;
  cargoType: string;
  weightKg: number;
  pickupLocation: { name: string; x: number; z: number };
  dropoffLocation: { name: string; x: number; z: number };
  payoutCash: number;
  expiresInSeconds: number;
  requiresClass1: boolean;
  isFragile: boolean;
}

export interface CnesstClaim {
  id: string;
  playerId: string;
  playerName: string;
  jobTitle: string;
  reportedAt: number;
  injuryNature: string;
  dailyBenefitAmount: number;
  status: "approved" | "under_review" | "closed";
}

export interface JobsDashboardOverview {
  totalEmployed: number;
  unemploymentRatePct: number;
  averageHourlyWage: number;
  activeShiftsCount: number;
  openHaulMissionsCount: number;
  activeCnesstClaimsCount: number;
  totalSalariesPaidToday: number;
}

// ─── CATALOGUE OFFICIEL DES EMPLOIS DU COMTÉ ─────────────────────────────────

export const JOBS_CATALOG: JobDefinition[] = [
  {
    id: "camionneur_teamsters",
    title: "Chauffeur Poids Lourds B-Train",
    employerName: "Transport Provincial Portneuf",
    sector: "transport",
    hourlyRate: 34.5,
    overtimeRate: 51.75,
    unionAffiliation: "Teamsters 106",
    unionDuesPct: 2.5,
    requiredCertifications: ["classe_1"],
    workLocation: { village: "Portneuf", x: -420, z: -10 },
    description: "Transport lourd de billots de bois, rouleaux de papier et matières premières sur la 138 et l'A-40.",
  },
  {
    id: "patrouilleur_sq",
    title: "Agent de Patrouille Régionale",
    employerName: "Sûreté du Québec — District Portneuf",
    sector: "public_safety",
    hourlyRate: 44.0,
    overtimeRate: 66.0,
    unionAffiliation: "APPQ",
    unionDuesPct: 2.2,
    requiredCertifications: ["classe_5", "formation_police_enpq"],
    workLocation: { village: "Donnacona", x: 420, z: 0 },
    description: "Maintien de l'ordre public, surveillance du réseau routier et intervention d'urgence 911.",
  },
  {
    id: "paramedic_ctaq",
    title: "Paramédic aux Soins Préhospitaliers",
    employerName: "Coopérative des Paramédics (CTAQ)",
    sector: "health",
    hourlyRate: 38.0,
    overtimeRate: 57.0,
    unionAffiliation: "CSN",
    unionDuesPct: 2.0,
    requiredCertifications: ["classe_4a", "diplome_paramedical"],
    workLocation: { village: "Donnacona", x: 410, z: -40 },
    description: "Réponse aux urgences médicales de réanimation et transport ambulancier vers l'hôpital.",
  },
  {
    id: "deneigeur_mtq",
    title: "Opérateur de Chasse-Neige & Saleuse MTQ",
    employerName: "Ministère des Transports du Québec",
    sector: "transport",
    hourlyRate: 32.0,
    overtimeRate: 48.0,
    unionAffiliation: "CSN",
    unionDuesPct: 2.0,
    requiredCertifications: ["classe_1"],
    workLocation: { village: "Donnacona", x: 420, z: 4 },
    description: "Déblaiement des autoroutes et routes régionales lors des tempêtes hivernales, poudreries et verglas.",
  },
  {
    id: "bucheron_mffp",
    title: "Bûcheron & Abatteur Manuel",
    employerName: "Exploitation Forestière du Bouclier",
    sector: "forestry",
    hourlyRate: 28.5,
    overtimeRate: 42.75,
    unionAffiliation: "FTQ-Construction",
    unionDuesPct: 2.0,
    requiredCertifications: ["carte_tronconneuse", "secourisme"],
    workLocation: { village: "Saint-Raymond", x: 180, z: -700 },
    description: "Abattage sélectif d'arbres, ébranchage et empilage de cordes de bois franc dans les Laurentides.",
  },
  {
    id: "ouvrier_construction",
    title: "Charpentier-Menuisier / Journalier",
    employerName: "Chantiers Municipaux Portneuf",
    sector: "construction",
    hourlyRate: 36.0,
    overtimeRate: 54.0,
    unionAffiliation: "FTQ-Construction",
    unionDuesPct: 2.5,
    requiredCertifications: ["carte_asp"],
    workLocation: { village: "Donnacona", x: 440, z: -20 },
    description: "Rénovation de bâtiments, coulage de fondations en béton et travaux de charpente résidentielle.",
  },
  {
    id: "mecanicien_garage",
    title: "Mécanicien Automobile Certifié",
    employerName: "Garage & Atelier Portneuf CAA",
    sector: "mechanic",
    hourlyRate: 31.0,
    overtimeRate: 46.5,
    unionAffiliation: "CSN",
    unionDuesPct: 1.5,
    requiredCertifications: ["carte_mecanique"],
    workLocation: { village: "Portneuf", x: -350, z: 12 },
    description: "Inspection mécanique SAAQ, réparation de freins, suspensions et remorquage d'urgence sur la 138.",
  },
  {
    id: "bouilleur_erabliere",
    title: "Bouilleur & Maître Acéricole",
    employerName: "Érablière du Rang Saint-Ignace",
    sector: "agriculture",
    hourlyRate: 26.0,
    overtimeRate: 39.0,
    unionDuesPct: 0.0,
    requiredCertifications: ["hygiene_salubrite_mapaq"],
    workLocation: { village: "Saint-Raymond", x: 510, z: -680 },
    description: "Entretien de la tubulure sous vide, réduction de l'eau d'érable à l'évaporateur au bois et mise en canisse.",
  },
  {
    id: "conseiller_sqdc",
    title: "Conseiller aux Ventes Cannabis",
    employerName: "Société Québécoise du Cannabis (SQDC)",
    sector: "commerce",
    hourlyRate: 22.5,
    overtimeRate: 33.75,
    unionAffiliation: "CSN",
    unionDuesPct: 1.5,
    requiredCertifications: ["formation_cannabis_21"],
    workLocation: { village: "Portneuf", x: -261, z: 0 },
    description: "Accueil, conseil client et respect strict de l'âge légal (21 ans et +) pour les produits dérivés du cannabis.",
  },
];

// ─── STOCKAGE EN MÉMOIRE VIVE ────────────────────────────────────────────────

const inMemoryContracts = new Map<string, EmployeeContract>();
const inMemoryCnesstClaims: CnesstClaim[] = [];
let totalPaidGlobalCash = 142500;

// Contrat par défaut du joueur local
const bootTime = Date.now();
inMemoryContracts.set("local_player", {
  playerId: "local_player",
  playerName: "Benoit Gagnon",
  jobId: "camionneur_teamsters",
  jobTitle: "Chauffeur Poids Lourds B-Train",
  hiredAt: bootTime - 86400000 * 14,
  hourlyWage: 34.5,
  weeklyHoursWorked: 38.5,
  totalEarnings: 8420.0,
  certifications: ["classe_1", "carte_asp"],
  activeShift: null,
});

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Player-Id",
} as const;

// ─── GESTIONNAIRE DE REQUÊTES SERVEUR ────────────────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  try {
    const nowTs = Date.now();

    // ── 1. GET : OFFRES D'EMPLOIS, CONTRATS, MISSIONS DE FRET & STATS ──
    if (method === "GET") {
      const type = url.searchParams.get("type") || "board"; // "board" | "haul" | "contract" | "cnesst" | "stats"
      const playerId = url.searchParams.get("playerId") || request.headers.get("X-Player-Id") || "local_player";
      const sectorFilter = url.searchParams.get("sector") as JobSector | undefined;
      const exportFormat = url.searchParams.get("export");

      // A. Statistiques du marché de l'emploi
      if (type === "stats") {
        const employed = inMemoryContracts.size;
        const activeShifts = Array.from(inMemoryContracts.values()).filter((c) => c.activeShift !== null).length;
        const avgWage = Math.round(
          JOBS_CATALOG.reduce((a, j) => a + j.hourlyRate, 0) / JOBS_CATALOG.length
        );

        const stats: JobsDashboardOverview = {
          totalEmployed: employed,
          unemploymentRatePct: 4.8,
          averageHourlyWage: avgWage,
          activeShiftsCount: activeShifts,
          openHaulMissionsCount: 3,
          activeCnesstClaimsCount: inMemoryCnesstClaims.filter((c) => c.status === "approved").length,
          totalSalariesPaidToday: totalPaidGlobalCash,
        };

        return new Response(JSON.stringify({ ok: true, data: stats, timestamp: nowTs }), { status: 200, headers: JSON_HEADERS });
      }

      // B. Contrat actif avec calcul en direct du quart de travail
      if (type === "contract") {
        const contract = inMemoryContracts.get(playerId);
        if (!contract) {
          return new Response(
            JSON.stringify({
              ok: true,
              employed: false,
              message: "Vous êtes actuellement sans emploi. Consultez les offres d'embauche.",
              contract: null,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // Calcul dynamique en temps réel si un quart est actif
        if (contract.activeShift) {
          const elapsedSec = (nowTs - contract.activeShift.clockedInAt) / 1000;
          const hoursSoFar = Math.round((elapsedSec / 3600) * 100) / 100;
          const currentEarnings = Math.round(hoursSoFar * contract.hourlyWage * 100) / 100;

          contract.activeShift.hoursThisShift = hoursSoFar;
          contract.activeShift.currentEarnings = currentEarnings;
        }

        return new Response(JSON.stringify({ ok: true, employed: true, contract }), { status: 200, headers: JSON_HEADERS });
      }

      // C. Missions de camionnage lourd (Dispatch Fret)
      if (type === "haul") {
        const haulMissions: HaulMission[] = [
          {
            id: "haul_bois_01",
            title: "Transport de billots d'épinette noire",
            cargoType: "Bois brut",
            weightKg: 28500,
            pickupLocation: { name: "Scierie des Laurentides", x: 180, z: -700 },
            dropoffLocation: { name: "Papeterie de Donnacona", x: 420, z: -180 },
            payoutCash: 620,
            expiresInSeconds: 1800,
            requiresClass1: true,
            isFragile: false,
          },
          {
            id: "haul_papier_02",
            title: "Livraison rouleaux de papier journal",
            cargoType: "Papier Donnacona",
            weightKg: 18000,
            pickupLocation: { name: "Papeterie de Donnacona", x: 420, z: -180 },
            dropoffLocation: { name: "Quai de Portneuf (Export)", x: -420, z: 74 },
            payoutCash: 480,
            expiresInSeconds: 2400,
            requiresClass1: true,
            isFragile: true,
          },
          {
            id: "haul_sel_03",
            title: "Acheminement sel de déglaçage MTQ",
            cargoType: "Abrasif & Sel",
            weightKg: 22000,
            pickupLocation: { name: "Dépôt MTQ Portneuf", x: -261, z: 4 },
            dropoffLocation: { name: "Garage de voirie Saint-Raymond", x: 900, z: -700 },
            payoutCash: 550,
            expiresInSeconds: 1200,
            requiresClass1: true,
            isFragile: false,
          },
        ];

        return new Response(
          JSON.stringify({
            ok: true,
            dispatchUnit: "Dispatch Teamsters Local 106",
            openMissions: haulMissions,
            strikeActive: false,
          }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      // D. Export CSV certifié Excel (UTF-8 avec BOM)
      if (exportFormat === "csv") {
        const rows = [
          ["ID", "Poste", "Employeur", "Secteur", "Taux Horaire", "Temps et Demi", "Syndicat"].join(";"),
          ...JOBS_CATALOG.map((j) => [
            j.id,
            `"${j.title.replace(/"/g, '""')}"`,
            `"${j.employerName.replace(/"/g, '""')}"`,
            j.sector,
            `${j.hourlyRate} $/h`,
            `${j.overtimeRate} $/h`,
            j.unionAffiliation || "Non-syndiqué",
          ].join(";")),
        ];

        return new Response("\uFEFF" + rows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="offres_emplois_portneuf_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // E. Tableau d'affichage des offres (Board)
      let jobs = [...JOBS_CATALOG];
      if (sectorFilter) jobs = jobs.filter((j) => j.sector === sectorFilter);

      return new Response(
        JSON.stringify({
          ok: true,
          totalOffers: jobs.length,
          jobs,
          serverTimestamp: nowTs,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    // ── 2. POST : EMBAUCHE, POINTAGE, PAIE, CNESST & ASSURANCE-EMPLOI ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers: JSON_HEADERS });
      }

      const { action, playerId = "local_player", playerName = "Citoyen" } = body;

      if (!action) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action" }), { status: 400, headers: JSON_HEADERS });
      }

      switch (action) {
        // A. EMBAUCHE ET SIGNATURE DE CONTRAT
        case "apply_job": {
          const { jobId } = body;
          const job = JOBS_CATALOG.find((j) => j.id === jobId);

          if (!job) {
            return new Response(JSON.stringify({ ok: false, error: "job_not_found" }), { status: 404, headers: JSON_HEADERS });
          }

          const contract: EmployeeContract = {
            playerId,
            playerName,
            jobId: job.id,
            jobTitle: job.title,
            hiredAt: nowTs,
            hourlyWage: job.hourlyRate,
            weeklyHoursWorked: 0,
            totalEarnings: 0,
            certifications: body.certifications || [],
            activeShift: null,
          };

          inMemoryContracts.set(playerId, contract);

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Félicitations ! Vous êtes embauché comme [${job.title}] chez [${job.employerName}].`,
              contract,
            }),
            { status: 201, headers: JSON_HEADERS }
          );
        }

        // B. POINTER EN DÉBUT DE QUART (CLOCK-IN)
        case "clock_in": {
          const contract = inMemoryContracts.get(playerId);
          if (!contract) {
            return new Response(
              JSON.stringify({ ok: false, error: "no_active_contract", message: "Vous n'avez aucun contrat de travail actif." }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          if (contract.activeShift) {
            return new Response(
              JSON.stringify({ ok: false, error: "already_clocked_in", message: "Vous êtes déjà en train d'effectuer un quart de travail." }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          contract.activeShift = {
            clockedInAt: nowTs,
            hoursThisShift: 0,
            currentEarnings: 0,
          };

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Quart de travail débuté pour [${contract.jobTitle}]. Bon service !`,
              shift: contract.activeShift,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // C. TERMINER LE QUART ET RECEVOIR LA PAIE (CLOCK-OUT)
        case "clock_out": {
          const contract = inMemoryContracts.get(playerId);
          if (!contract || !contract.activeShift) {
            return new Response(
              JSON.stringify({ ok: false, error: "not_clocked_in", message: "Vous n'étiez pas en service actif." }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          const elapsedMinutes = Math.max(1, (nowTs - contract.activeShift.clockedInAt) / 60000);
          const hoursWorked = Math.round((elapsedMinutes / 60) * 10) / 10 || 0.5;

          const regularHours = Math.min(8, hoursWorked);
          const overtimeHours = Math.max(0, hoursWorked - 8);

          const job = JOBS_CATALOG.find((j) => j.id === contract.jobId);
          const basePay = regularHours * contract.hourlyWage;
          const overtimePay = overtimeHours * (job?.overtimeRate || contract.hourlyWage * 1.5);
          const grossPay = Math.round((basePay + overtimePay) * 100) / 100;

          // Déductions syndicales
          const unionDues = Math.round(grossPay * ((job?.unionDuesPct || 2) / 100) * 100) / 100;
          const netPay = Math.round((grossPay - unionDues) * 100) / 100;

          contract.weeklyHoursWorked += hoursWorked;
          contract.totalEarnings += netPay;
          contract.activeShift = null;
          totalPaidGlobalCash += netPay;

          // Relais vers Intellectus
          try {
            await handleIntellectus(request);
          } catch {
            // Ignorer si indisponible
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Quart terminé (${hoursWorked}h effectuées). Salaire brut: ${grossPay} $ · Cotisation syndicale: -${unionDues} $ · Net versé: +${netPay} $ CAD.`,
              paySlip: {
                hoursWorked,
                grossPay,
                unionDues,
                netPay,
                totalEarningsToDate: contract.totalEarnings,
              },
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // D. ACCIDENT DE TRAVAIL & INDEMNITÉS CNESST
        case "report_cnesst_injury": {
          const contract = inMemoryContracts.get(playerId);
          const { injuryNature = "Lumbago aigu en soulevant une charge lourde" } = body;

          // 90 % du salaire net journalier
          const dailyBenefit = contract ? Math.round(contract.hourlyWage * 7.5 * 0.9) : 180;

          const claim: CnesstClaim = {
            id: `cnesst_${nowTs}`,
            playerId,
            playerName,
            jobTitle: contract?.jobTitle || "Travailleur",
            reportedAt: nowTs,
            injuryNature: String(injuryNature),
            dailyBenefitAmount: dailyBenefit,
            status: "approved",
          };

          inMemoryCnesstClaims.unshift(claim);

          if (contract && contract.activeShift) {
            contract.activeShift = null;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Déclaration d'accident transmise à la CNESST. Dossier approuvé : Indemnité de remplacement du revenu de ${dailyBenefit} $ CAD / jour.`,
              claim,
            }),
            { status: 201, headers: JSON_HEADERS }
          );
        }

        // E. DEMANDE D'ASSURANCE-EMPLOI (CHÔMAGE)
        case "claim_unemployment": {
          const contract = inMemoryContracts.get(playerId);
          if (contract) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: "ineligible_employed",
                message: `Demande rejetée : Vous occupez actuellement un poste actif (${contract.jobTitle}).`,
              }),
              { status: 400, headers: JSON_HEADERS }
            );
          }

          const weeklyBenefit = 485.0;

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Prestation d'Assurance-Emploi accordée : ${weeklyBenefit} $ CAD / semaine.`,
              weeklyBenefit,
              referenceNumber: `AE-2026-${Math.floor(10000 + Math.random() * 90000)}`,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        // F. CERTIFICATIONS PROFESSIONNELLES & CARTES DE COMPÉTENCE
        case "take_course": {
          const { courseId, cost = 150 } = body;
          const contract = inMemoryContracts.get(playerId);

          if (contract && !contract.certifications.includes(courseId)) {
            contract.certifications.push(courseId);
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Formation validée avec succès ! Certification [${courseId}] inscrite à votre dossier.`,
              courseId,
              cost,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        default:
          return new Response(
            JSON.stringify({ ok: false, error: "unknown_action", message: "Action non reconnue." }),
            { status: 400, headers: JSON_HEADERS }
          );
      }
    }

    // ── 3. DELETE : DÉMISSION / RÉSILIATION DE CONTRAT ──
    if (method === "DELETE") {
      const playerId = url.searchParams.get("playerId") || request.headers.get("X-Player-Id");
      if (!playerId) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_player_id" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const contract = inMemoryContracts.get(playerId);
      if (!contract) {
        return new Response(
          JSON.stringify({ ok: false, error: "no_contract_found", message: "Aucun contrat de travail trouvé pour ce citoyen." }),
          { status: 404, headers: JSON_HEADERS }
        );
      }

      inMemoryContracts.delete(playerId);

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Contrat d'embauche de [${contract.playerName}] résilié. Vous êtes maintenant sans emploi.`,
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

export const Route = createFileRoute("/api/rp/jobs")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});