/**
 * ═══════════════════════════════════════════════════════════════════
 * 💼 TROXTWORLD / ETHERWORLD — CATALOGUE GÉNÉRAL DES MÉTIERS (/api/jobs/)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Répertoire des Emplois du Comté de Portneuf & Conventions Collectives :
 *  - 📋 Liste exhaustive des métiers légaux (SQ, Urgences, MTQ, Hydro, BTP, etc.)
 *  - 💰 Grilles salariales, primes & cotisations syndicales (FTQ, CSN, Teamsters)
 *  - 📍 Répartition géographique des employeurs par village
 *  - 📊 Statistiques de l'emploi & Postes à pourvoir
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleRpRest } from "@/server/rpRest.server";

export type JobSector = 
  | "public_safety" 
  | "health" 
  | "transport" 
  | "forestry" 
  | "construction" 
  | "mechanic" 
  | "energy_hydro" 
  | "commerce" 
  | "justice_politics" 
  | "agriculture_mapaq"
  | "media_services";

export interface JobSummary {
  id: string;
  title: string;
  employerName: string;
  departmentTag: string;
  sector: JobSector;
  sectorLabel: string;
  baseHourlyWage: number;
  overtimeHourlyWage: number;
  union: string;
  unionDuesPct: number;
  requiredLicenses: string[];
  village: string;
  openPositions: number;
  isHiring: boolean;
  cnesstRisk: "low" | "medium" | "high" | "extreme";
  iconName: string;
  description: string;
}

export interface JobsDirectoryStats {
  totalJobsListed: number;
  totalOpenPositions: number;
  averageHourlyWage: number;
  highestPaidJob: { title: string; wage: number };
  sectorsCount: number;
  unionizedJobsPercentage: number;
  jobsByVillage: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE EXHAUSTIF DES MÉTIERS DU COMTÉ
// ═══════════════════════════════════════════════════════════

const JOBS_CATALOG: JobSummary[] = [
  // ── SÉCURITÉ PUBLIQUE & SERVICES D'URGENCE ──
  {
    id: "policier_sq",
    title: "Patrouilleur — Sûreté du Québec",
    employerName: "Sûreté du Québec (District Capitale-Nationale)",
    departmentTag: "SQ-PORTNEUF",
    sector: "public_safety",
    sectorLabel: "Sécurité publique & Police",
    baseHourlyWage: 42.00,
    overtimeHourlyWage: 63.00,
    union: "APPQ (Syndicat des policiers du Québec)",
    unionDuesPct: 2.0,
    requiredLicenses: ["permis_conduire", "pal_r", "formation_enpq"],
    village: "Donnacona",
    openPositions: 4,
    isHiring: true,
    cnesstRisk: "high",
    iconName: "shield",
    description: "Patrouille sur la 138 et l'A-40, maintien de l'ordre et interventions d'urgence 911.",
  },
  {
    id: "paramedic",
    title: "Technicien Ambulancier Paramédic",
    employerName: "Coopérative des Paramédics de Portneuf",
    departmentTag: "EMS-PORTNEUF",
    sector: "health",
    sectorLabel: "Santé & Urgences préhospitalières",
    baseHourlyWage: 36.00,
    overtimeHourlyWage: 54.00,
    union: "FSSS-CSN",
    unionDuesPct: 2.0,
    requiredLicenses: ["permis_conduire_4a", "dec_soins_prehospitaliers"],
    village: "Donnacona",
    openPositions: 3,
    isHiring: true,
    cnesstRisk: "high",
    iconName: "plus",
    description: "Soins médicaux d'urgence, réanimation et transport prioritaire en ambulance.",
  },
  {
    id: "pompier_portneuf",
    title: "Pompier Volontaire / Sauvetage",
    employerName: "Service de Sécurité Incendie Portneuf",
    departmentTag: "FIRE-PORTNEUF",
    sector: "public_safety",
    sectorLabel: "Sécurité publique & Incendie",
    baseHourlyWage: 33.50,
    overtimeHourlyWage: 50.25,
    union: "SPQ (Pompiers du Québec)",
    unionDuesPct: 1.8,
    requiredLicenses: ["permis_conduire_4a", "pompier_1"],
    village: "Portneuf",
    openPositions: 6,
    isHiring: true,
    cnesstRisk: "extreme",
    iconName: "flame",
    description: "Lutte contre les incendies de bâtiments et désincarcération lors d'accidents routiers.",
  },
  {
    id: "agent_mffp",
    title: "Agent de Protection de la Faune (Garde-Chasse)",
    employerName: "Ministère des Forêts, de la Faune et des Parcs",
    departmentTag: "MFFP-FAUNE",
    sector: "public_safety",
    sectorLabel: "Protection environnementale & Faune",
    baseHourlyWage: 38.00,
    overtimeHourlyWage: 57.00,
    union: "SFPQ",
    unionDuesPct: 1.8,
    requiredLicenses: ["permis_conduire", "pal", "carte_faune"],
    village: "Saint-Raymond",
    openPositions: 2,
    isHiring: true,
    cnesstRisk: "medium",
    iconName: "compass",
    description: "Surveillance de la chasse/pêche, lutte contre le braconnage et protection des réserves.",
  },

  // ── TRANSPORT, VOIRIE & LOGISTIQUE ──
  {
    id: "camionneur_teamsters",
    title: "Chauffeur Poids Lourds B-Train",
    employerName: "Transport Provincial Portneuf Inc.",
    departmentTag: "TEAMSTERS-106",
    sector: "transport",
    sectorLabel: "Transport lourd & Fret routier",
    baseHourlyWage: 34.50,
    overtimeHourlyWage: 51.75,
    union: "Teamsters Local 106",
    unionDuesPct: 2.5,
    requiredLicenses: ["classe_1"],
    village: "Portneuf",
    openPositions: 8,
    isHiring: true,
    cnesstRisk: "medium",
    iconName: "truck",
    description: "Conduite de semi-remorques 53 pieds et doubles remorques sur les corridors de fret.",
  },
  {
    id: "deneigeur_mtq",
    title: "Opérateur de Charrue & Saleuse MTQ",
    employerName: "Ministère des Transports du Québec",
    departmentTag: "MTQ-VOIRIE",
    sector: "transport",
    sectorLabel: "Voirie provinciale & Déneigement",
    baseHourlyWage: 32.00,
    overtimeHourlyWage: 48.00,
    union: "SFPQ",
    unionDuesPct: 1.8,
    requiredLicenses: ["classe_1", "carte_asp"],
    village: "Portneuf",
    openPositions: 5,
    isHiring: true,
    cnesstRisk: "medium",
    iconName: "cloud-snow",
    description: "Déblaiement des autoroutes et épandage de sel/abrasif lors des tempêtes hivernales.",
  },

  // ── ÉNERGIE, BTP & FORESTERIE ──
  {
    id: "monteur_ligne_hydro",
    title: "Monteur de Lignes Haute Tension",
    employerName: "Hydro-Québec (Poste Régional)",
    departmentTag: "HYDRO-QC",
    sector: "energy_hydro",
    sectorLabel: "Énergie & Réseau électrique",
    baseHourlyWage: 46.50,
    overtimeHourlyWage: 69.75,
    union: "Syndicat des employés d'Hydro-Québec (SCFP-1500)",
    unionDuesPct: 2.2,
    requiredLicenses: ["dep_monteur_lignes", "carte_asp", "classe_3"],
    village: "Donnacona",
    openPositions: 2,
    isHiring: true,
    cnesstRisk: "extreme",
    iconName: "zap",
    description: "Entretien du réseau électrique, réparation de transformateurs et rétablissement après verglas.",
  },
  {
    id: "bucheron_mffp",
    title: "Bûcheron & Opérateur Forestier",
    employerName: "Exploitation Forestière du Bouclier",
    departmentTag: "FOREST-QC",
    sector: "forestry",
    sectorLabel: "Foresterie & Coupe de bois",
    baseHourlyWage: 28.50,
    overtimeHourlyWage: 42.75,
    union: "FTQ-Construction",
    unionDuesPct: 2.0,
    requiredLicenses: ["carte_tronconneuse", "secourisme"],
    village: "Saint-Raymond",
    openPositions: 10,
    isHiring: true,
    cnesstRisk: "high",
    iconName: "tree-pine",
    description: "Abattage d'arbres, ébranchage et approvisionnement en bois de la papeterie.",
  },
  {
    id: "ouvrier_construction",
    title: "Charpentier-Menuisier / BTP",
    employerName: "Chantiers Municipaux Portneuf",
    departmentTag: "RBQ-BTP",
    sector: "construction",
    sectorLabel: "Construction & Charpente",
    baseHourlyWage: 36.00,
    overtimeHourlyWage: 54.00,
    union: "FTQ-Construction",
    unionDuesPct: 2.5,
    requiredLicenses: ["carte_asp"],
    village: "Donnacona",
    openPositions: 6,
    isHiring: true,
    cnesstRisk: "high",
    iconName: "hammer",
    description: "Travaux de gros œuvre, charpente de toiture et rénovations résidentielles conformes RBQ.",
  },
  {
    id: "mecanicien_garage",
    title: "Mécanicien Automobile & Dépannage CAA",
    employerName: "Garage & Atelier Mécanique Portneuf",
    departmentTag: "GARAGE-CAA",
    sector: "mechanic",
    sectorLabel: "Mécanique & Dépannage",
    baseHourlyWage: 31.00,
    overtimeHourlyWage: 46.50,
    union: "CSN",
    unionDuesPct: 1.5,
    requiredLicenses: ["carte_mecanique", "permis_conduire"],
    village: "Portneuf",
    openPositions: 3,
    isHiring: true,
    cnesstRisk: "medium",
    iconName: "wrench",
    description: "Réparation mécanique, réfection de freins, suspension et remorquage sur la 138.",
  },

  // ── COMMERCE, JUSTICE & AGRICULTURE ──
  {
    id: "conseiller_sqdc",
    title: "Conseiller aux Ventes Cannabis",
    employerName: "Société Québécoise du Cannabis (SQDC)",
    departmentTag: "SQDC-PORTNEUF",
    sector: "commerce",
    sectorLabel: "Commerce de détail d'État",
    baseHourlyWage: 22.50,
    overtimeHourlyWage: 33.75,
    union: "CSN (Employés SQDC)",
    unionDuesPct: 1.5,
    requiredLicenses: ["formation_cannabis_21"],
    village: "Portneuf",
    openPositions: 2,
    isHiring: true,
    cnesstRisk: "low",
    iconName: "leaf",
    description: "Vente de cannabis légal, gestion des stocks et vérification stricte de l'âge légal (21+).",
  },
  {
    id: "avocat_justice",
    title: "Avocat de la Défense / Notaire Foncier",
    employerName: "Palais de Justice & Étude Notariale",
    departmentTag: "BARREAU-QC",
    sector: "justice_politics",
    sectorLabel: "Justice, Droit & Notariat",
    baseHourlyWage: 65.00,
    overtimeHourlyWage: 97.50,
    union: "Barreau du Québec / Chambre des Notaires",
    unionDuesPct: 1.0,
    requiredLicenses: ["bac_droit", "membre_barreau"],
    village: "Donnacona",
    openPositions: 1,
    isHiring: true,
    cnesstRisk: "low",
    iconName: "scale",
    description: "Rédaction d'actes notariés, signature de baux TAL et défense des accusés en cour.",
  },
  {
    id: "agriculteur_mapaq",
    title: "Ouvrier Agricole & Érablière",
    employerName: "Ferme Maraîchère & Cabane de Portneuf",
    departmentTag: "MAPAQ-TERRE",
    sector: "agriculture_mapaq",
    sectorLabel: "Agriculture & Acériculture",
    baseHourlyWage: 24.00,
    overtimeHourlyWage: 36.00,
    union: "UPA (Union des producteurs agricoles)",
    unionDuesPct: 1.5,
    requiredLicenses: [],
    village: "Cap-Santé",
    openPositions: 8,
    isHiring: true,
    cnesstRisk: "medium",
    iconName: "droplets",
    description: "Entretien des terres cultivables, récolte maraîchère et entaillage des érables au printemps.",
  },
  {
    id: "journaliste_portneuf",
    title: "Journaliste Reporter / Faits Divers",
    employerName: "Le Journal de Portneuf",
    departmentTag: "MEDIA-PRESSE",
    sector: "media_services",
    sectorLabel: "Médias & Information",
    baseHourlyWage: 26.00,
    overtimeHourlyWage: 39.00,
    union: "FPJQ",
    unionDuesPct: 1.5,
    requiredLicenses: ["permis_conduire"],
    village: "Portneuf",
    openPositions: 2,
    isHiring: true,
    cnesstRisk: "low",
    iconName: "newspaper",
    description: "Couverture des événements d'actualité, enquêtes locales et reportages sur les incidents de la 138.",
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Player-Id, X-Admin-Role",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ── 1. GET : CONSULTATION DU CATALOGUE D'EMPLOIS, STATS & EXPORTS ──
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const exportFormat = url.searchParams.get("export");
      const sectorFilter = url.searchParams.get("sector") as JobSector | undefined;
      const villageFilter = url.searchParams.get("village")?.toLowerCase();
      const hiringOnly = url.searchParams.get("hiring") === "true";
      const search = url.searchParams.get("search")?.toLowerCase();
      const minWage = parseFloat(url.searchParams.get("minWage") || "0");

      // ── Statistiques du marché de l'emploi ──
      if (isStats) {
        const totalPositions = JOBS_CATALOG.reduce((acc, j) => acc + j.openPositions, 0);
        const avgWage = Math.round((JOBS_CATALOG.reduce((acc, j) => acc + j.baseHourlyWage, 0) / JOBS_CATALOG.length) * 100) / 100;
        
        let highest = JOBS_CATALOG[0]!;
        for (const j of JOBS_CATALOG) {
          if (j.baseHourlyWage > highest.baseHourlyWage) highest = j;
        }

        const byVillage: Record<string, number> = {};
        for (const j of JOBS_CATALOG) {
          byVillage[j.village] = (byVillage[j.village] || 0) + j.openPositions;
        }

        const stats: JobsDirectoryStats = {
          totalJobsListed: JOBS_CATALOG.length,
          totalOpenPositions: totalPositions,
          averageHourlyWage: avgWage,
          highestPaidJob: { title: highest.title, wage: highest.baseHourlyWage },
          sectorsCount: new Set(JOBS_CATALOG.map((j) => j.sector)).size,
          unionizedJobsPercentage: 92,
          jobsByVillage: byVillage,
        };

        return new Response(JSON.stringify({ ok: true, data: stats, timestamp: Date.now() }), { status: 200, headers });
      }

      // ── Export CSV pour affichage municipal ──
      if (exportFormat === "csv") {
        const csvRows = [
          ["ID", "Titre", "Employeur", "Secteur", "Taux Horaire", "Temps et Demi", "Syndicat", "Postes", "Village"].join(";"),
          ...JOBS_CATALOG.map((j) => [
            j.id,
            "\"" + j.title.replace(/"/g, '""') + "\"",
            "\"" + j.employerName.replace(/"/g, '""') + "\"",
            j.sectorLabel,
            j.baseHourlyWage.toFixed(2) + "$/h",
            j.overtimeHourlyWage.toFixed(2) + "$/h",
            "\"" + j.union.replace(/"/g, '""') + "\"",
            j.openPositions,
            j.village,
          ].join(";")),
        ];

        return new Response(csvRows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"catalogue_emplois_portneuf_" + new Date().toISOString().slice(0, 10) + ".csv\"",
          },
        });
      }

      // ── Filtrage des offres d'emploi ──
      let list = [...JOBS_CATALOG];

      if (sectorFilter) list = list.filter((j) => j.sector === sectorFilter);
      if (villageFilter) list = list.filter((j) => j.village.toLowerCase() === villageFilter);
      if (hiringOnly) list = list.filter((j) => j.isHiring && j.openPositions > 0);
      if (minWage > 0) list = list.filter((j) => j.baseHourlyWage >= minWage);

      if (search) {
        list = list.filter(
          (j) =>
            j.title.toLowerCase().includes(search) ||
            j.employerName.toLowerCase().includes(search) ||
            j.description.toLowerCase().includes(search) ||
            j.union.toLowerCase().includes(search)
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          total: list.length,
          jobs: list,
          serverTimestamp: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : VÉRIFICATION RAPIDE D'ÉLIGIBILITÉ OU DÉPÔT DE CANDIDATURE ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, jobId, playerLicenses = [] } = body;

      if (!action || !jobId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action_or_job_id" }), { status: 400, headers });
      }

      const job = JOBS_CATALOG.find((j) => j.id === jobId);
      if (!job) {
        return new Response(JSON.stringify({ ok: false, error: "job_not_found" }), { status: 404, headers });
      }

      switch (action) {
        case "check_eligibility": {
          const missingLicenses = job.requiredLicenses.filter((lic) => !playerLicenses.includes(lic));
          const eligible = missingLicenses.length === 0;

          return new Response(
            JSON.stringify({
              ok: true,
              jobId: job.id,
              jobTitle: job.title,
              eligible,
              missingLicenses,
              message: eligible 
                ? "Vous remplissez tous les prérequis pour le poste de [" + job.title + "]."
                : "Candidature incomplète : Certifications manquantes (" + missingLicenses.join(", ") + ").",
            }),
            { status: 200, headers }
          );
        }

        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "internal_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// ROUTEUR TANSTACK
// ═══════════════════════════════════════════════════════════

export const Route = createFileRoute("/api/jobs/")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});