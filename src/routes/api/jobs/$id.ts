/**
 * ═══════════════════════════════════════════════════════════════════
 * 💼 TROXTWORLD / ETHERWORLD — FICHE MÉTIER DÉTAILLÉE (/api/jobs/$id)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Spécifications Complètes de Poste, Échelons & Équipements :
 *  - 💰 Grille Salariale (Base, Temps & Demi, Primes de nuit & Blizzard)
 *  - 📈 Échelle de Promotion Syndicale (Rangs & Échelons d'ancienneté)
 *  - 👔 Uniformes & Équipements de Protection Individuelle (EPI)
 *  - 🏥 Cote de Risque CNESST & Mesures de Sécurité
 *  - 🎓 Certifications & Formations de Perfectionnement
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleRpRest } from "@/server/rpRest.server";

export type CnesstRiskLevel = "low" | "medium" | "high" | "extreme";

export interface JobLadderRank {
  rankIndex: number;
  rankTitle: string;
  requiredHours: number;
  wageMultiplier: number;
  unlockedPerks: string[];
}

export interface UniformItem {
  id: string;
  name: string;
  slot: "head" | "torso" | "legs" | "feet" | "tool" | "radio";
  required: boolean;
}

export interface JobDetailedSpec {
  id: string;
  title: string;
  employerName: string;
  departmentTag: string;
  sector: "transport" | "public_safety" | "health" | "forestry" | "construction" | "commerce" | "energy" | "mechanic";
  
  // Grille Salariale
  salary: {
    baseHourly: number;
    overtimeHourly: number; // 1.5x
    nightShiftBonusHourly: number;
    blizzardStormBonusHourly: number;
    estimatedWeeklyGross: number;
  };

  // Syndicat & Normes
  union: {
    affiliation: string;
    duesPercentage: number;
    collectiveAgreementVersion: string;
  };

  // Carrière & Échelons
  careerLadder: JobLadderRank[];

  // Prérequis à l'embauche
  requirements: {
    minimumAge: number;
    cleanCriminalRecordRequired: boolean;
    requiredLicenses: string[];
    requiredSkills: string[];
  };

  // Sécurité & CNESST
  cnesst: {
    riskLevel: CnesstRiskLevel;
    dailyInjuryBenefit: number;
    mandatorySafetyBriefing: string;
  };

  // Équipement & Tenue
  uniformAndGear: UniformItem[];

  // Lieu de travail
  workplace: {
    name: string;
    village: string;
    coordinates: { x: number; y: number; z: number };
    lockerRoomAvailable: boolean;
    companyVehicleProvided: boolean;
    vehicleModel?: string;
  };

  description: string;
  responsibilities: string[];
}

// ═══════════════════════════════════════════════════════════
// BASE DE DONNÉES COMPLÈTE DES POSTES DU COMTÉ
// ═══════════════════════════════════════════════════════════

const JOBS_DETAILED_DATABASE: Record<string, JobDetailedSpec> = {
  // ── 1. CAMIONNAGE TEAMSTERS ──
  camionneur_teamsters: {
    id: "camionneur_teamsters",
    title: "Chauffeur Poids Lourds B-Train",
    employerName: "Transport Provincial Portneuf Inc.",
    departmentTag: "TEAMSTERS-106",
    sector: "transport",
    salary: {
      baseHourly: 34.50,
      overtimeHourly: 51.75,
      nightShiftBonusHourly: 3.50,
      blizzardStormBonusHourly: 8.00,
      estimatedWeeklyGross: 1380.00,
    },
    union: {
      affiliation: "Teamsters Local 106 (Section Transport)",
      duesPercentage: 2.5,
      collectiveAgreementVersion: "2024-2027",
    },
    careerLadder: [
      { rankIndex: 0, rankTitle: "Chauffeur Stagiaire / Classe 1", requiredHours: 0, wageMultiplier: 1.0, unlockedPerks: ["Conduite porteur simple"] },
      { rankIndex: 1, rankTitle: "Chauffeur Régulier 53 Pieds", requiredHours: 50, wageMultiplier: 1.15, unlockedPerks: ["Missions interurbaines A-40"] },
      { rankIndex: 2, rankTitle: "Opérateur Maître B-Train", requiredHours: 150, wageMultiplier: 1.35, unlockedPerks: ["Double remorque lourde", "Primes matières dangereuses"] },
      { rankIndex: 3, rankTitle: "Contremaître de Dispatch", requiredHours: 300, wageMultiplier: 1.5, unlockedPerks: ["Gestion de flotte", "Assignation des contrats"] },
    ],
    requirements: {
      minimumAge: 21,
      cleanCriminalRecordRequired: false,
      requiredLicenses: ["classe_1"],
      requiredSkills: ["conduite", "mecanique"],
    },
    cnesst: {
      riskLevel: "medium",
      dailyInjuryBenefit: 232.00,
      mandatorySafetyBriefing: "Vérification avant-départ (ronde de sécurité) obligatoire et respect des heures de repos SAAQ.",
    },
    uniformAndGear: [
      { id: "veste_haute_visibilite", name: "Dossard réfléchissant classe 2", slot: "torso", required: true },
      { id: "bottes_cap_acier", name: "Bottes de sécurité homologuées CSA", slot: "feet", required: true },
      { id: "radio_cb_canal14", name: "Émetteur-récepteur CB Canal 14", slot: "radio", required: true },
    ],
    workplace: {
      name: "Dépôt Central & Quai de Chargement Portneuf",
      village: "Portneuf",
      coordinates: { x: -420, y: 4.0, z: -10 },
      lockerRoomAvailable: true,
      companyVehicleProvided: true,
      vehicleModel: "Camion Semi-Remorque Mack Granite",
    },
    description: "Transport lourd régional sur le corridor de la 138 et de l'autoroute 40. Chargements de billots de bois, papier et machinerie.",
    responsibilities: [
      "Effectuer l'inspection mécanique pré-départ du camion et des freins à air",
      "Arrimer solidement les cargaisons de billots et de rouleaux de papier",
      "Assurer la liaison radio sur le canal 14 avec les autres transporteurs et les charrues MTQ",
      "Compléter les bordereaux de livraison et faire signer les connaissements",
    ],
  },

  // ── 2. POLICIER SÛRETÉ DU QUÉBEC ──
  policier_sq: {
    id: "policier_sq",
    title: "Patrouilleur — Sûreté du Québec",
    employerName: "Sûreté du Québec (District de la Capitale-Nationale)",
    departmentTag: "SQ-PORTNEUF",
    sector: "public_safety",
    salary: {
      baseHourly: 42.00,
      overtimeHourly: 63.00,
      nightShiftBonusHourly: 4.50,
      blizzardStormBonusHourly: 6.00,
      estimatedWeeklyGross: 1680.00,
    },
    union: {
      affiliation: "Association des policières et policiers du Québec (APPQ)",
      duesPercentage: 2.0,
      collectiveAgreementVersion: "2023-2028",
    },
    careerLadder: [
      { rankIndex: 0, rankTitle: "Cadet de police", requiredHours: 0, wageMultiplier: 0.85, unlockedPerks: ["Patrouille pédestre", "Assistance circulation"] },
      { rankIndex: 1, rankTitle: "Constable patrouilleur", requiredHours: 40, wageMultiplier: 1.0, unlockedPerks: ["Conduite autopatrouille", "Arme de service Glock 19"] },
      { rankIndex: 2, rankTitle: "Constable senior / Enquêteur", requiredHours: 120, wageMultiplier: 1.25, unlockedPerks: ["Radar laser", "Mandats de perquisition"] },
      { rankIndex: 3, rankTitle: "Sergent de relève", requiredHours: 250, wageMultiplier: 1.45, unlockedPerks: ["Commandement d'intervention", "Bouton panique 10-99"] },
      { rankIndex: 4, rankTitle: "Capitaine commandant de poste", requiredHours: 500, wageMultiplier: 1.7, unlockedPerks: ["Accès cellule haute sécurité", "Gestion du poste"] },
    ],
    requirements: {
      minimumAge: 21,
      cleanCriminalRecordRequired: true,
      requiredLicenses: ["permis_conduire", "pal_r", "formation_enpq"],
      requiredSkills: ["conduite", "tir", "negociation"],
    },
    cnesst: {
      riskLevel: "high",
      dailyInjuryBenefit: 285.00,
      mandatorySafetyBriefing: "Port du gilet pare-balles niveau IIIA obligatoire en tout temps lors des patrouilles.",
    },
    uniformAndGear: [
      { id: "uniforme_kaki_sq", name: "Uniforme officiel Kaki & Vert SQ", slot: "torso", required: true },
      { id: "gilet_pare_balles", name: "Gilet pare-balles tactique niveau IIIA", slot: "torso", required: true },
      { id: "ceinturon_service", name: "Ceinturon avec étui sécurisé Safariland", slot: "torso", required: true },
      { id: "arme_glock19", name: "Pistolet de service Glock 19 9mm", slot: "tool", required: true },
      { id: "taser_x26p", name: "Axon Taser X26P jaune", slot: "tool", required: true },
      { id: "radio_pol_104", name: "Radio cryptée motorola SQ (104.2 MHz)", slot: "radio", required: true },
    ],
    workplace: {
      name: "Poste de la Sûreté du Québec — MRC de Portneuf",
      village: "Donnacona",
      coordinates: { x: 420, y: 4.2, z: -10 },
      lockerRoomAvailable: true,
      companyVehicleProvided: true,
      vehicleModel: "Ford Police Interceptor Utility (Kaki)",
    },
    description: "Maintien de la paix, de l'ordre et de la sécurité publique sur tout le territoire du comté de Portneuf et le réseau routier.",
    responsibilities: [
      "Répondre aux appels d'urgence 911 relayés par la centrale de dispatch",
      "Effectuer la surveillance de la vitesse au cinémomètre sur la 138 et l'A-40",
      "Émettre les constats d'infraction au Code de la sécurité routière (CSR)",
      "Procéder à l'arrestation, la mise en cellule et la comparution des suspects",
    ],
  },

  // ── 3. PARAMÉDIC URGENCES-SANTÉ ──
  paramedic: {
    id: "paramedic",
    title: "Technicien Ambulancier Paramédic",
    employerName: "Coopérative des Paramédics de Portneuf",
    departmentTag: "EMS-PORTNEUF",
    sector: "health",
    salary: {
      baseHourly: 36.00,
      overtimeHourly: 54.00,
      nightShiftBonusHourly: 4.00,
      blizzardStormBonusHourly: 7.00,
      estimatedWeeklyGross: 1440.00,
    },
    union: {
      affiliation: "Fédération de la santé et des services sociaux (FSSS-CSN)",
      duesPercentage: 2.0,
      collectiveAgreementVersion: "2024-2028",
    },
    careerLadder: [
      { rankIndex: 0, rankTitle: "Paramédic stagiaire", requiredHours: 0, wageMultiplier: 0.9, unlockedPerks: ["Soins de base", "Conduite ambulance code 2"] },
      { rankIndex: 1, rankTitle: "Paramédic PR-1 certifié", requiredHours: 50, wageMultiplier: 1.1, unlockedPerks: ["Administration Narcan / Épinéphrine", "Code 3 gyrophares"] },
      { rankIndex: 2, rankTitle: "Paramédic de soins avancés (ACP)", requiredHours: 150, wageMultiplier: 1.3, unlockedPerks: ["Défibrillateur cardiaque", "Intubation d'urgence"] },
      { rankIndex: 3, rankTitle: "Superviseur des opérations cliniques", requiredHours: 300, wageMultiplier: 1.5, unlockedPerks: ["Triage catastrophe", "Coordination hélicoptère"] },
    ],
    requirements: {
      minimumAge: 20,
      cleanCriminalRecordRequired: true,
      requiredLicenses: ["permis_conduire_4a", "dec_soins_prehospitaliers"],
      requiredSkills: ["medical", "conduite_urgence"],
    },
    cnesst: {
      riskLevel: "high",
      dailyInjuryBenefit: 245.00,
      mandatorySafetyBriefing: "Gants médicaux en nitrile et lunettes de protection obligatoires lors de chaque intervention.",
    },
    uniformAndGear: [
      { id: "chemise_ambulancier", name: "Chemise paramédic blanche avec écusson", slot: "torso", required: true },
      { id: "pantalon_cargo_marine", name: "Pantalon d'intervention bleu marine", slot: "legs", required: true },
      { id: "trousse_premiers_soins", name: "Trousse médicale complète + Naloxone", slot: "tool", required: true },
      { id: "radio_ems_108", name: "Radio des urgences médicales (108.5 MHz)", slot: "radio", required: true },
    ],
    workplace: {
      name: "Caserne Ambulancière Régionale de Donnacona",
      village: "Donnacona",
      coordinates: { x: 400, y: 4.0, z: 20 },
      lockerRoomAvailable: true,
      companyVehicleProvided: true,
      vehicleModel: "Ambulance Crestline Type III (Gyros rouges/blancs)",
    },
    description: "Soins médicaux d'urgence préhospitaliers, stabilisation des blessés graves de la route et transport vers le centre hospitalier.",
    responsibilities: [
      "Répondre avec gyrophares (Code 3) aux urgences médicales et accidents de la route",
      "Évaluer les signes vitaux (pouls, tension, hypothermie) et administrer les premiers soins",
      "Réanimer les personnes en arrêt cardio-respiratoire ou surdose d'opioïdes",
      "Transporter d'urgence les patients vers l'hôpital de Saint-Raymond ou Donnacona",
    ],
  },

  // ── 4. DÉNEIGEUR MTQ ──
  deneigeur_mtq: {
    id: "deneigeur_mtq",
    title: "Opérateur de Charrue & Saleuse MTQ",
    employerName: "Ministère des Transports et de la Mobilité Durable",
    departmentTag: "MTQ-PORTNEUF",
    sector: "transport",
    salary: {
      baseHourly: 32.00,
      overtimeHourly: 48.00,
      nightShiftBonusHourly: 3.50,
      blizzardStormBonusHourly: 10.00,
      estimatedWeeklyGross: 1280.00,
    },
    union: {
      affiliation: "Syndicat de la fonction publique du Québec (SFPQ)",
      duesPercentage: 1.8,
      collectiveAgreementVersion: "2023-2027",
    },
    careerLadder: [
      { rankIndex: 0, rankTitle: "Opérateur auxiliaire de voirie", requiredHours: 0, wageMultiplier: 0.95, unlockedPerks: ["Épandage de sel/abrasif"] },
      { rankIndex: 1, rankTitle: "Opérateur charrue 10 roues", requiredHours: 40, wageMultiplier: 1.15, unlockedPerks: ["Lame avant sur la 138", "Ailes latérales"] },
      { rankIndex: 2, rankTitle: "Conducteur de souffleuse lourde", requiredHours: 120, wageMultiplier: 1.35, unlockedPerks: ["Dégagement des congères et bancs de neige majeurs"] },
      { rankIndex: 3, rankTitle: "Chef de convoi de déneigement", requiredHours: 250, wageMultiplier: 1.5, unlockedPerks: ["Coordination des convois sur l'A-40"] },
    ],
    requirements: {
      minimumAge: 20,
      cleanCriminalRecordRequired: false,
      requiredLicenses: ["classe_1", "carte_asp"],
      requiredSkills: ["conduite", "mecanique"],
    },
    cnesst: {
      riskLevel: "medium",
      dailyInjuryBenefit: 218.00,
      mandatorySafetyBriefing: "Gyrophare orange et feux de détresse allumés en tout temps lors du déblaiement.",
    },
    uniformAndGear: [
      { id: "manteau_hiver_mtq", name: "Manteau haute visibilité grand froid MTQ", slot: "torso", required: true },
      { id: "tuque_laine_orange", name: "Tuque haute visibilité thermique", slot: "head", required: true },
      { id: "bottes_hiver_cap", name: "Bottes d'hiver à embout protecteur (-40°C)", slot: "feet", required: true },
    ],
    workplace: {
      name: "Centre de Service de Voirie MTQ — Portneuf",
      village: "Portneuf",
      coordinates: { x: -261, y: 4.0, z: 4 },
      lockerRoomAvailable: true,
      companyVehicleProvided: true,
      vehicleModel: "Camion Chasse-Neige Mack Granite MTQ (Orange)",
    },
    description: "Opérations de déneigement, déglaçage et salage des routes provinciales lors des tempêtes de neige et du verglas.",
    responsibilities: [
      "Conduire le camion charrue en convoi pour déblayer la 138 et le 2e Rang",
      "Actionner la trémie d'épandage de sel et d'abrasif dans les côtes glissantes",
      "Évacuer les accumulations de neige soufflée pour éviter la poudrerie",
      "Alerter le ministère en cas d'obstruction majeure ou d'arbres tombés sur les fils",
    ],
  },
};

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
    // Extraction du jobId depuis l'URL
    const pathParts = url.pathname.split("/").filter(Boolean);
    const jobId = pathParts[pathParts.length - 1]?.toLowerCase() || "camionneur_teamsters";

    // Recherche de la fiche de poste
    const jobSpec = JOBS_DETAILED_DATABASE[jobId] || JOBS_DETAILED_DATABASE.camionneur_teamsters!;

    // ── 1. GET : CONSULTATION DE LA FICHE DÉTAILLÉE DU MÉTIER ──
    if (method === "GET") {
      const checkEligibility = url.searchParams.get("checkEligibility") === "true";
      const onlyLadder = url.searchParams.get("ladder") === "true";

      if (onlyLadder) {
        return new Response(
          JSON.stringify({
            ok: true,
            jobId: jobSpec.id,
            jobTitle: jobSpec.title,
            careerLadder: jobSpec.careerLadder,
          }),
          { status: 200, headers }
        );
      }

      if (checkEligibility) {
        const playerLicenses = (url.searchParams.get("licenses") || "").split(",").filter(Boolean);
        const hasCleanRecord = url.searchParams.get("cleanRecord") !== "false";

        const missingLicenses = jobSpec.requirements.requiredLicenses.filter((lic) => !playerLicenses.includes(lic));
        const recordFailed = jobSpec.requirements.cleanCriminalRecordRequired && !hasCleanRecord;

        const isEligible = missingLicenses.length === 0 && !recordFailed;

        return new Response(
          JSON.stringify({
            ok: true,
            jobId: jobSpec.id,
            isEligible,
            missingLicenses,
            recordFailed,
            requirements: jobSpec.requirements,
          }),
          { status: 200, headers }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          job: jobSpec,
          serverTimestamp: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : ACTIONS ASSOCIÉES AU MÉTIER (ÉQUIPEMENT, PROMOTION, FORMATION) ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, playerId = "local_player", currentHours = 0 } = body;

      if (!action) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action" }), { status: 400, headers });
      }

      const nowTs = Date.now();

      switch (action) {
        // Obtenir la tenue et les outils de service
        case "claim_gear": {
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Équipements et uniforme pour [${jobSpec.title}] remis dans votre inventaire.`,
              issuedGear: jobSpec.uniformAndGear,
              timestamp: nowTs,
            }),
            { status: 200, headers }
          );
        }

        // Réclamer une promotion à l'échelon supérieur
        case "claim_promotion": {
          const eligibleRanks = jobSpec.careerLadder.filter((r) => currentHours >= r.requiredHours);
          const highestRank = eligibleRanks[eligibleRanks.length - 1] || jobSpec.careerLadder[0]!;

          const newHourlyWage = Math.round(jobSpec.salary.baseHourly * highestRank.wageMultiplier * 100) / 100;

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Félicitations ! Vous êtes promu au grade de [${highestRank.rankTitle}] avec un salaire de ${newHourlyWage}\u00a0$/h.`,
              rank: highestRank,
              newHourlyWage,
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

export const Route = createFileRoute("/api/jobs/$id")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});