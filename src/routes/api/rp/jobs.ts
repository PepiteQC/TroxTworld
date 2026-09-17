/**
 * ═══════════════════════════════════════════════════════════════════
 * 💼 TROXTWORLD / ETHERWORLD — API EMPLOIS, SALAIRES & CNESST (/api/rp/jobs)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Système de Carrières, Logistique & Normes du Travail au Québec :
 *  - 🚛 Camionnage B-Train & Dispatch Fret (Teamsters Local 106)
 *  - ⏱️ Pointage des Quarts de Travail (Heures sup à 1.5x)
 *  - 🏥 Accidents de Travail & Indemnités CNESST
 *  - 📋 Assurance-Chômage & Allocations de Transition
 *  - 📜 Certifications (Permis Classe 1, Carte ASP Construction, RBQ)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type JobSector = "transport" | "public_safety" | "health" | "forestry" | "construction" | "commerce" | "agriculture" | "mechanic";

export interface JobDefinition {
  id: string;
  title: string;
  employerName: string;
  sector: JobSector;
  hourlyRate: number;
  overtimeRate: number;
  unionAffiliation?: "Teamsters 106" | "FTQ-Construction" | "CSN" | "APPQ";
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

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES EMPLOIS DU COMTÉ DE PORTNEUF
// ═══════════════════════════════════════════════════════════

const JOBS_CATALOG: JobDefinition[] = [
  {
    id: "camionneur_teamsters",
    title: "Chauffeur Poids Lourds B-Train",
    employerName: "Transport Provincial Portneuf",
    sector: "transport",
    hourlyRate: 34.50,
    overtimeRate: 51.75,
    unionAffiliation: "Teamsters 106",
    unionDuesPct: 2.5,
    requiredCertifications: ["classe_1"],
    workLocation: { village: "Portneuf", x: -420, z: -10 },
    description: "Transport de billots de bois, rouleaux de papier et marchandises lourdes sur la 138 et l'A-40.",
  },
  {
    id: "deneigeur_mtq",
    title: "Opérateur de Charrue & Saleuse MTQ",
    employerName: "Ministère des Transports du Québec",
    sector: "transport",
    hourlyRate: 32.00,
    overtimeRate: 48.00,
    unionAffiliation: "CSN",
    unionDuesPct: 2.0,
    requiredCertifications: ["classe_1"],
    workLocation: { village: "Donnacona", x: 420, z: 4 },
    description: "Déblaiement des autoroutes et routes régionales lors des tempêtes hivernales et du verglas.",
  },
  {
    id: "bucheron_mffp",
    title: "Bûcheron & Abatteur Manuel",
    employerName: "Exploitation Forestière du Bouclier",
    sector: "forestry",
    hourlyRate: 28.50,
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
    hourlyRate: 36.00,
    overtimeRate: 54.00,
    unionAffiliation: "FTQ-Construction",
    unionDuesPct: 2.5,
    requiredCertifications: ["carte_asp"],
    workLocation: { village: "Donnacona", x: 440, z: -20 },
    description: "Rénovations de bâtiments municipaux, fondations et travaux de charpente résidentielle.",
  },
  {
    id: "mecanicien_garage",
    title: "Mécanicien Automobile Certifié",
    employerName: "Garage & Atelier Portneuf CAA",
    sector: "mechanic",
    hourlyRate: 31.00,
    overtimeRate: 46.50,
    unionAffiliation: "CSN",
    unionDuesPct: 1.5,
    requiredCertifications: ["carte_mecanique"],
    workLocation: { village: "Portneuf", x: -350, z: 12 },
    description: "Inspection mécanique, réparation de freins, suspension et remorquage d'urgence sur la 138.",
  },
  {
    id: "conseiller_sqdc",
    title: "Conseiller aux Ventes Cannabis",
    employerName: "Société Québécoise du Cannabis (SQDC)",
    sector: "commerce",
    hourlyRate: 22.50,
    overtimeRate: 33.75,
    unionAffiliation: "CSN",
    unionDuesPct: 1.5,
    requiredCertifications: ["formation_cannabis_21"],
    workLocation: { village: "Portneuf", x: -261, z: 0 },
    description: "Accueil, conseil client et respect de l'âge légal (21+) pour les produits dérivés du cannabis.",
  },
];

const inMemoryContracts = new Map<string, EmployeeContract>();
const inMemoryCnesstClaims: CnesstClaim[] = [];
let totalPaidGlobalCash = 142500;

// Initialisation d'un contrat par défaut pour le joueur local
const now = Date.now();
inMemoryContracts.set("local_player", {
  playerId: "local_player",
  playerName: "Benoit Gagnon",
  jobId: "camionneur_teamsters",
  jobTitle: "Chauffeur Poids Lourds B-Train",
  hiredAt: now - 86400000 * 14,
  hourlyWage: 34.50,
  weeklyHoursWorked: 38.5,
  totalEarnings: 8420.00,
  certifications: ["classe_1", "carte_asp"],
  activeShift: null,
});

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Player-Id",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const nowTs = Date.now();

    // ── 1. GET : CATALOGUE D'EMPLOIS, CONTRATS, MISSIONS DE FRET & STATS ──
    if (method === "GET") {
      const type = url.searchParams.get("type") || "board"; // "board" | "haul" | "contract" | "cnesst" | "stats"
      const playerId = url.searchParams.get("playerId") || request.headers.get("X-Player-Id") || "local_player";
      const sectorFilter = url.searchParams.get("sector") as JobSector | undefined;
      const exportFormat = url.searchParams.get("export");

      // ── Statistiques du marché du travail ──
      if (type === "stats") {
        const employed = inMemoryContracts.size;
        const activeShifts = Array.from(inMemoryContracts.values()).filter((c) => c.activeShift !== null).length;
        const avgWage = Math.round(JOBS_CATALOG.reduce((a, j) => a + j.hourlyRate, 0) / JOBS_CATALOG.length);

        const stats: JobsDashboardOverview = {
          totalEmployed: employed,
          unemploymentRatePct: 4.8,
          averageHourlyWage: avgWage,
          activeShiftsCount: activeShifts,
          openHaulMissionsCount: 4,
          activeCnesstClaimsCount: inMemoryCnesstClaims.filter((c) => c.status === "approved").length,
          totalSalariesPaidToday: totalPaidGlobalCash,
        };

        return new Response(JSON.stringify({ ok: true, data: stats, timestamp: nowTs }), { status: 200, headers });
      }

      // ── Contrat actif du joueur ──
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
            { status: 200, headers }
          );
        }

        return new Response(JSON.stringify({ ok: true, employed: true, contract }), { status: 200, headers });
      }

      // ── Tableau des missions de camionnage (Dispatch Fret) ──
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
          { status: 200, headers }
        );
      }

      // ── Export CSV ──
      if (exportFormat === "csv") {
        const rows = [
          ["ID", "Poste", "Employeur", "Secteur", "Taux Horaire", "Temps et Demi", "Syndicat"].join(";"),
          ...JOBS_CATALOG.map((j) => [
            j.id,
            `"${j.title.replace(/"/g, '""')}"`,
            `"${j.employerName.replace(/"/g, '""')}"`,
            j.sector,
            `${j.hourlyRate}$/h`,
            `${j.overtimeRate}$/h`,
            j.unionAffiliation || "Non-syndiqué",
          ].join(";")),
        ];

        return new Response(rows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="offres_emplois_portneuf_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // ── Liste des offres d'emploi (Board) ──
      let jobs = [...JOBS_CATALOG];
      if (sectorFilter) jobs = jobs.filter((j) => j.sector === sectorFilter);

      return new Response(
        JSON.stringify({
          ok: true,
          totalOffers: jobs.length,
          jobs,
          serverTimestamp: nowTs,
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : EMBAUCHE, POINTAGE, PAIE, CNESST & CHÔMAGE ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, playerId = "local_player", playerName = "Citoyen" } = body;

      if (!action) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action" }), { status: 400, headers });
      }

      switch (action) {
        // ── A. POSTULER & SIGNER UN CONTRAT ──
        case "apply_job": {
          const { jobId } = body;
          const job = JOBS_CATALOG.find((j) => j.id === jobId);

          if (!job) {
            return new Response(JSON.stringify({ ok: false, error: "job_not_found" }), { status: 404, headers });
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
            { status: 201, headers }
          );
        }

        // ── B. POINTER AU DÉBUT DU QUART (CLOCK-IN) ──
        case "clock_in": {
          const contract = inMemoryContracts.get(playerId);
          if (!contract) {
            return new Response(JSON.stringify({ ok: false, error: "no_active_contract" }), { status: 400, headers });
          }

          if (contract.activeShift) {
            return new Response(JSON.stringify({ ok: false, error: "already_clocked_in" }), { status: 400, headers });
          }

          contract.activeShift = {
            clockedInAt: nowTs,
            hoursThisShift: 0,
            currentEarnings: 0,
          };

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Quart de travail débuté pour [${contract.jobTitle}] à ${new Date().toLocaleTimeString("fr-CA")}. Bon service !`,
              shift: contract.activeShift,
            }),
            { status: 200, headers }
          );
        }

        // ── C. TERMINER LE QUART & RECEVOIR LA PAIE (CLOCK-OUT) ──
        case "clock_out": {
          const contract = inMemoryContracts.get(playerId);
          if (!contract || !contract.activeShift) {
            return new Response(JSON.stringify({ ok: false, error: "not_clocked_in" }), { status: 400, headers });
          }

          const elapsedMinutes = Math.max(1, (nowTs - contract.activeShift.clockedInAt) / 60000);
          const hoursWorked = Math.round((elapsedMinutes / 60) * 10) / 10 || 0.5;

          // Calcul des heures sup (> 8h par shift ou simulation accélérée)
          const regularHours = Math.min(8, hoursWorked);
          const overtimeHours = Math.max(0, hoursWorked - 8);

          const job = JOBS_CATALOG.find((j) => j.id === contract.jobId);
          const basePay = regularHours * contract.hourlyWage;
          const overtimePay = overtimeHours * (job?.overtimeRate || contract.hourlyWage * 1.5);
          const grossPay = Math.round((basePay + overtimePay) * 100) / 100;

          // Déductions syndicales et impôt provincial
          const unionDues = Math.round(grossPay * ((job?.unionDuesPct || 2) / 100) * 100) / 100;
          const netPay = Math.round((grossPay - unionDues) * 100) / 100;

          contract.weeklyHoursWorked += hoursWorked;
          contract.totalEarnings += netPay;
          contract.activeShift = null;
          totalPaidGlobalCash += netPay;

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Quart terminé (${hoursWorked}h prestées). Paie brute: ${grossPay}\u00a0$ · Cotisation syndicale: -${unionDues}\u00a0$ · Net versé: +${netPay}\u00a0$.`,
              paySlip: {
                hoursWorked,
                grossPay,
                unionDues,
                netPay,
                totalEarningsToDate: contract.totalEarnings,
              },
            }),
            { status: 200, headers }
          );
        }

        // ── D. DÉCLARATION D'ACCIDENT DE TRAVAIL (CNESST) ──
        case "report_cnesst_injury": {
          const contract = inMemoryContracts.get(playerId);
          const { injuryNature = "Lumbago aigu en soulevant un madrier", location = "Chantier Portneuf" } = body;

          const dailyBenefit = contract ? Math.round(contract.hourlyWage * 7.5 * 0.9) : 180; // 90% du salaire net quotidien

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

          // Si le travailleur était en quart, clôture automatique du shift
          if (contract && contract.activeShift) {
            contract.activeShift = null;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Rapport d'accident de travail transmis à la CNESST. Dossier approuvé : Indemnité journalière de ${dailyBenefit}\u00a0$ versée.`,
              claim,
            }),
            { status: 201, headers }
          );
        }

        // ── E. DEMANDE D'ASSURANCE-EMPLOI (CHÔMAGE) ──
        case "claim_unemployment": {
          const contract = inMemoryContracts.get(playerId);
          if (contract) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: "ineligible_employed",
                message: `Demande rejetée : Vous détenez un contrat de travail actif (${contract.jobTitle}). Vous devez être sans emploi.`,
              }),
              { status: 400, headers }
            );
          }

          const weeklyBenefit = 485.00; // Prestation hebdomadaire standard AE

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Demande d'Assurance-Emploi approuvée. Prestation de transition de ${weeklyBenefit}\u00a0$/semaine accordée.`,
              weeklyBenefit,
              referenceNumber: `AE-2026-${Math.floor(10000 + Math.random() * 90000)}`,
            }),
            { status: 200, headers }
          );
        }

        // ── F. PASSER UNE FORMATION OU CERTIFICATION PROFESSIONNELLE ──
        case "take_course": {
          const { courseId, cost = 150 } = body;
          const contract = inMemoryContracts.get(playerId);

          if (contract && !contract.certifications.includes(courseId)) {
            contract.certifications.push(courseId);
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Formation complétée avec succès ! Certification [${courseId}] ajoutée à votre dossier professionnel.`,
              courseId,
              cost,
            }),
            { status: 200, headers }
          );
        }

        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }
    }

    // ── 3. DELETE : DÉMISSION OU LICENCIEMENT D'UN EMPLOYÉ ──
    if (method === "DELETE") {
      const playerId = url.searchParams.get("playerId") || request.headers.get("X-Player-Id");
      if (!playerId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_player_id" }), { status: 400, headers });
      }

      const contract = inMemoryContracts.get(playerId);
      if (!contract) {
        return new Response(JSON.stringify({ ok: false, error: "no_contract_found" }), { status: 404, headers });
      }

      inMemoryContracts.delete(playerId);

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Contrat d'embauche de [${contract.playerName}] (${contract.jobTitle}) résilié. Vous êtes maintenant sans emploi.`,
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