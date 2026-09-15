/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME DE L'EMPLOI ET DU TRAVAIL AU QUÉBEC (CNESST & REVENU QC)
 * ═══════════════════════════════════════════════════════════════════
 *
 * MÉTIERS RÉALISTES DU QUÉBEC :
 *  - Secteur Public & Urgence : Sûreté du Québec, SPVM, Ambulancier Urgences-santé, Pompier,
 *    Agent correctionnel Donnacona, Monteur de ligne Hydro-Québec, Voirie MTQ / Déneigeur.
 *  - Industrie, Construction & Forêt : Ouvrier CCQ (Menuisier, Électricien, Journalier),
 *    Bûcheron des Laurentides, Opérateur de papetière Kruger.
 *  - Agriculture & Terroir : Producteur laitier Québon, Acériculteur (Cabane à sucre).
 *  - Logistique & Transport : Camionneur lourd B-Train (Teamsters), Chauffeur Taxi Diamond, Livreur.
 *  - Commerce & Finance : Caissier/Conseiller Desjardins, Commis/Sécurité SQDC, Commis Dépanneur.
 *  - Juridique & Immobilier : Notaire, Avocat au TAL / Cour, Courtier Centris.
 *
 * SYSTÈMES COMPLETS :
 *  - Fiche de paie québécoise avec retenues : Impôt Provincial (Revenu QC), Fédéral (ARC),
 *    Régime de rentes du Québec (RRQ), Assurance-emploi (AE), RQAP et cotisation syndicale.
 *  - Normes du travail & CNESST : Indemnité de remplacement du revenu en cas d'accident de travail.
 *  - Assurance-chômage (Prestations régulières de 55% du salaire moyen).
 *  - Cartes & Certifications : Carte ASP Construction, Cartes CCQ, Permis SAAQ Classe 1/3/4A, Diplôme ENPQ.
 *  - Grèves & Piquets syndicaux (FTQ, CSN, Teamsters).
 *  - Gigs au noir (Petits boulots rapides payés en argent comptant non déclaré).
 *
 * INTÉGRATIONS :
 *  - banking.ts (paie automatique déposée chez Desjardins)
 *  - character.ts (identités et réputation des travailleurs)
 *  - phone.tsx (reçus de paie, alertes d'offres d'emploi, chômage)
 *  - haul.tsx (missions de camionnage et transport)
 *  - net.ts / remotes.ts (synchronisation multijoueurs en temps réel)
 * ═══════════════════════════════════════════════════════════════════
 */

import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { sendPrivateMessage, sendChatMessage } from "./chat";
import { triggerNotification } from "./phone";
import { getPlayerData } from "./character";

// Systèmes interconnectés
import { addCash, removeCash, getAccount, pushTx } from "./banking";
import { modifyHealth, getPlayerHealth } from "./survival";
import { getCurrentSeason } from "./seasons";

// ═══════════════════════════════════════════════════════════
// TYPES — MÉTIERS, GRADES & CATÉGORIES
// ═══════════════════════════════════════════════════════════

export type JobCategory =
  | "securite_publique"     // Police, Pompiers, Correctionnel
  | "sante_urgence"          // Ambulanciers, Infirmiers, Médecins
  | "construction_metiers"  // CCQ, Électriciens, Menuisiers
  | "energie_services"       // Hydro-Québec, Voirie MTQ, Déneigement
  | "transport_logistique"   // Camionnage, Livraisons, Taxi
  | "agriculture_foret"      // Fermes laitières, Cabanes à sucre, Bûcherons
  | "commerce_services"      // SQDC, Desjardins, Dépanneur, Restauration
  | "juridique_immo";        // Notaires, Avocats, Courtiers

export type JobId =
  // Sécurité publique & Urgence
  | "agent_sq"
  | "agent_spvm"
  | "pompier_municipal"
  | "agent_correctionnel"
  | "paramedic_urgence"
  // Énergie, Voirie & Déneigement
  | "monteur_hydro"
  | "deneigeur_mtq"
  | "eboueur_municipal"
  // Construction & Industrie
  | "menuisier_ccq"
  | "electricien_ccq"
  | "operateur_papeterie"
  | "bucheron_foret"
  // Agriculture & Terroir
  | "fermier_laitier"
  | "acericulteur_sirop"
  // Transport & Logistique
  | "camionneur_teamster"
  | "livreur_express"
  | "chauffeur_taxi"
  // Commerce & Finance
  | "commis_sqdc"
  | "caissier_desjardins"
  | "commis_depanneur"
  // Juridique & Immobilier
  | "courtier_immobilier"
  | "notaire_juriste";

export type UnionType = "ftq_construction" | "csn_sante" | "teamsters_quebec" | "fipq_pompiers" | "appsq_police" | "aucun";

export type CertificationType =
  | "carte_asp_construction"   // Cours de santé et sécurité générale sur les chantiers (30h)
  | "carte_ccq_apprenti"       // Carte d'apprenti de la Commission de la construction du Québec
  | "carte_ccq_compagnon"      // Carte de compagnon certifié
  | "permis_classe_1"          // Permis semi-remorque (B-Train, 53 pieds)
  | "permis_classe_3"          // Permis camion porteur / Charrue à neige
  | "permis_classe_4a"         // Permis véhicule d'urgence (Ambulance / Police / Pompier)
  | "diplome_enpq"             // École nationale de police du Québec (Nicolet)
  | "ordre_infirmiers_oiiq"    // OIIQ pour la santé
  | "chambre_notaires_cdn"     // Titre de notaire officiel
  | "permis_courtier_oaciq";   // Organisme d'autoréglementation du courtage immobilier

// ═══════════════════════════════════════════════════════════
// STRUCT — CONTRAT DE TRAVAIL & PROFIL EMPLOYÉ
// ═══════════════════════════════════════════════════════════

export interface JobDefinition {
  id: JobId;
  title: string;
  category: JobCategory;
  department: string;
  baseHourlyWage: number;       // Taux horaire de base ($/h)
  overtimeRateMultiplier: number; // 1.5x (temps et demi après 40h)
  union: UnionType;
  requiredCertifications: CertificationType[];
  hazardPayBonus: number;       // Prime de risque horaire
  uniformColor: number;
  description: string;
  responsibilities: string[];
}

export interface EmployeeContract {
  playerId: string;
  playerName: string;
  jobId: JobId;
  jobTitle: string;
  hourlyWage: number;
  hiredAt: number;
  hoursWorkedTotal: number;
  hoursWorkedThisWeek: number;
  careerEarningsTotal: number;
  reputationScore: number;      // 0 à 100
  certificationsObtained: CertificationType[];
  unionMember: boolean;
  isOnDuty: boolean;
  activeShift: WorkShift | null;
  cnesstActive: boolean;        // En arrêt de travail payé CNESST
}

export interface WorkShift {
  shiftId: string;
  jobId: JobId;
  startedAt: number;
  endedAt: number | null;
  hoursWorked: number;
  overtimeHours: number;
  tasksCompleted: number;
  hazardsEncountered: number;
  accumulatedPayGross: number;
}

export interface PayStub {
  stubId: string;
  playerId: string;
  jobTitle: string;
  periodEnd: number;
  grossAmount: number;
  deductions: {
    provincialTaxQC: number;    // Revenu Québec (~14%)
    federalTaxARC: number;       // Agence du Revenu du Canada (~15%)
    rrqContribution: number;     // Régime de rentes du Québec (6.4%)
    aeContribution: number;      // Assurance-emploi (1.63%)
    rqapContribution: number;    // Régime québécois d'assurance parentale (0.49%)
    unionDues: number;           // Cotisation syndicale (1.5%)
  };
  netAmount: number;
  hoursRegular: number;
  hoursOvertime: number;
}

// ═══════════════════════════════════════════════════════════
// CNESST (ACCIDENTS DE TRAVAIL) & ASSURANCE-CHÔMAGE
// ═══════════════════════════════════════════════════════════

export interface CnesstClaim {
  claimId: string;
  playerId: string;
  jobId: JobId;
  incidentDate: number;
  injuryDescription: string;
  dailyCompensation: number;    // 90% du revenu net moyen
  daysRemaining: number;
  status: "approved" | "under_review" | "closed";
}

export interface UnemploymentBenefit {
  claimId: string;
  playerId: string;
  weeklyAmount: number;         // 55% du salaire hebdomadaire moyen
  weeksRemaining: number;
  approvedDate: number;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════
// BOULOTS RAPIDES AU NOIR (GIGS)
// ═══════════════════════════════════════════════════════════

export interface GigOffer {
  id: string;
  title: string;
  description: string;
  locationName: string;
  position: { x: number; z: number };
  payCash: number;              // Payé en liquide net, sans impôt
  durationMinutes: number;
  requiredItems?: string[];
  hazardRisk: number;           // Risque de blessure
  reputationGain: number;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE COMPLET DES MÉTIERS QUÉBÉCOIS
// ═══════════════════════════════════════════════════════════

export const JOB_CATALOG: Record<JobId, JobDefinition> = {
  // ── SÉCURITÉ PUBLIQUE & SANTÉ ──
  agent_sq: {
    id: "agent_sq",
    title: "Agent Patrouilleur — Sûreté du Québec",
    category: "securite_publique",
    department: "District Portneuf (Poste 104)",
    baseHourlyWage: 38.50,
    overtimeRateMultiplier: 1.5,
    union: "appsq_police",
    requiredCertifications: ["diplome_enpq", "permis_classe_4a"],
    hazardPayBonus: 4.50,
    uniformColor: 0x223322,
    description: "Application du Code de la sécurité routière, patrouille rurale et réponse aux appels 911.",
    responsibilities: ["Patrouiller la route 138 et l'A-40", "Émettre des constats du CSR", "Répondre aux alarmes de cambriolage"],
  },
  agent_spvm: {
    id: "agent_spvm",
    title: "Policier — SPVM",
    category: "securite_publique",
    department: "Poste de quartier 21",
    baseHourlyWage: 41.00,
    overtimeRateMultiplier: 1.5,
    union: "appsq_police",
    requiredCertifications: ["diplome_enpq", "permis_classe_4a"],
    hazardPayBonus: 6.00,
    uniformColor: 0x1a2430,
    description: "Maintien de l'ordre en milieu urbain et lutte contre les gangs de rue.",
    responsibilities: ["Interventions en milieu dense", "Contrôles de foule", "Enquêtes de stupéfiants"],
  },
  pompier_municipal: {
    id: "pompier_municipal",
    title: "Pompier — Service de sécurité incendie",
    category: "securite_publique",
    department: "Caserne de Portneuf",
    baseHourlyWage: 32.00,
    overtimeRateMultiplier: 1.5,
    union: "fipq_pompiers",
    requiredCertifications: ["permis_classe_4a"],
    hazardPayBonus: 8.00,
    uniformColor: 0xcc2211,
    description: "Combat des incendies de bâtiments et désincarcération sur les autoroutes.",
    responsibilities: ["Éteindre les feux de granges et maisons", "Désincarcérer les accidentés de la 40", "Vérifier les bornes-fontaines"],
  },
  agent_correctionnel: {
    id: "agent_correctionnel",
    title: "Agent Correctionnel (CX-01) — SCC",
    category: "securite_publique",
    department: "Pénitencier de Donnacona",
    baseHourlyWage: 36.50,
    overtimeRateMultiplier: 1.5,
    union: "csn_sante",
    requiredCertifications: [],
    hazardPayBonus: 7.00,
    uniformColor: 0x3e4247,
    description: "Surveillance et maintien de l'ordre dans un pénitencier à sécurité maximale.",
    responsibilities: ["Fouiller les cellules pour la contrebande", "Gérer les mouvements vers la cour", "Contrôler les émeutes et mutineries"],
  },
  paramedic_urgence: {
    id: "paramedic_urgence",
    title: "Paramédic — Urgences-santé",
    category: "sante_urgence",
    department: "Services Préhospitaliers Rive-Nord",
    baseHourlyWage: 34.00,
    overtimeRateMultiplier: 1.5,
    union: "csn_sante",
    requiredCertifications: ["permis_classe_4a", "ordre_infirmiers_oiiq"],
    hazardPayBonus: 5.00,
    uniformColor: 0x008855,
    description: "Soins médicaux d'urgence préhospitaliers et transport urgent vers l'hôpital.",
    responsibilities: ["Stabiliser les blessés graves", "Administrer de la naloxone (Narcan) en cas d'overdose", "Transport gyrophare"],
  },

  // ── ÉNERGIE, VOIRIE & DÉNEIGEMENT ──
  monteur_hydro: {
    id: "monteur_hydro",
    title: "Monteur de Lignes — Hydro-Québec",
    category: "energie_services",
    department: "Réseau de Distribution Portneuf",
    baseHourlyWage: 46.00,
    overtimeRateMultiplier: 2.0, // Double temps lors des tempêtes de verglas
    union: "ftq_construction",
    requiredCertifications: ["carte_asp_construction", "permis_classe_3"],
    hazardPayBonus: 9.50,
    uniformColor: 0xff6600,
    description: "Réparation des transformateurs, rétablissement du courant après les tempêtes et détection des dérivations illégales.",
    responsibilities: ["Grimper aux poteaux électriques", "Couper les branches sur les fils 25kV", "Débrancher les compteurs trafiqués"],
  },
  deneigeur_mtq: {
    id: "deneigeur_mtq",
    title: "Opérateur de Chasse-Neige — MTQ / Ville",
    category: "energie_services",
    department: "Voirie & Déneigement",
    baseHourlyWage: 29.50,
    overtimeRateMultiplier: 1.5,
    union: "teamsters_quebec",
    requiredCertifications: ["permis_classe_3"],
    hazardPayBonus: 4.00,
    uniformColor: 0xffaa00,
    description: "Opération des charrues à neige et épandeuses d'abrasif/sel sur les routes verglacées du comté.",
    responsibilities: ["Pousser les bancs de neige", "Épandre le sel sur la 138", "Dégager les routes secondaires avant l'aube"],
  },
  eboueur_municipal: {
    id: "eboueur_municipal",
    title: "Éboueur / Collecteur — Régie des Déchets",
    category: "energie_services",
    department: "Régie de gestion des matières résiduelles",
    baseHourlyWage: 24.00,
    overtimeRateMultiplier: 1.5,
    union: "teamsters_quebec",
    requiredCertifications: [],
    hazardPayBonus: 2.50,
    uniformColor: 0x33aa33,
    description: "Ramassage des bacs à ordures et recyclage le long des rangs.",
    responsibilities: ["Collecter les bacs verts et noirs", "Opérer le compacteur du camion", "Nettoyer les déversements"],
  },

  // ── CONSTRUCTION & INDUSTRIE ──
  menuisier_ccq: {
    id: "menuisier_ccq",
    title: "Charpentier-Menuisier Compagnon — CCQ",
    category: "construction_metiers",
    department: "Chantiers Résidentiels et Commerciaux",
    baseHourlyWage: 43.80,
    overtimeRateMultiplier: 1.5,
    union: "ftq_construction",
    requiredCertifications: ["carte_asp_construction", "carte_ccq_compagnon"],
    hazardPayBonus: 3.50,
    uniformColor: 0x997755,
    description: "Érection de structures de maisons canadiennes, toitures et charpentes en bois.",
    responsibilities: ["Bâtir les ossatures de maisons", "Poser les bardeaux de toit", "Installer les terrasses et patios"],
  },
  electricien_ccq: {
    id: "electricien_ccq",
    title: "Électricien de Chantier — CCQ",
    category: "construction_metiers",
    department: "Chantiers Portneuf",
    baseHourlyWage: 45.20,
    overtimeRateMultiplier: 1.5,
    union: "ftq_construction",
    requiredCertifications: ["carte_asp_construction", "carte_ccq_compagnon"],
    hazardPayBonus: 4.00,
    uniformColor: 0x335588,
    description: "Raccordement électrique des panneaux 200A, filage et mise aux normes du Code de l'électricité.",
    responsibilities: ["Passer le filage dans les murs", "Brancher les panneaux à disjoncteurs", "Installer l'éclairage encastré"],
  },
  operateur_papeterie: {
    id: "operateur_papeterie",
    title: "Opérateur de Machine — Papetière Kruger",
    category: "construction_metiers",
    department: "Usine de Donnacona",
    baseHourlyWage: 31.00,
    overtimeRateMultiplier: 1.5,
    union: "csn_sante",
    requiredCertifications: ["carte_asp_construction"],
    hazardPayBonus: 3.00,
    uniformColor: 0x666666,
    description: "Transformation des billots de bois en pâte à papier et rouleaux de papier journal.",
    responsibilities: ["Alimenter les broyeurs de pulpe", "Surveiller les rouleaux compresseurs", "Charger les palettes de fret"],
  },
  bucheron_foret: {
    id: "bucheron_foret",
    title: "Bûcheron / Abatteur — Forêts Laurentides",
    category: "agriculture_foret",
    department: "Exploitation Forestière de la Rive-Nord",
    baseHourlyWage: 33.50,
    overtimeRateMultiplier: 1.5,
    union: "ftq_construction",
    requiredCertifications: ["carte_asp_construction"],
    hazardPayBonus: 7.50,
    uniformColor: 0xaa2222, // Chemise à carreaux rouge
    description: "Abattage à la tronçonneuse d'épinettes et d'érables dans les concessions forestières.",
    responsibilities: ["Couper les arbres matures", "Ébrancher et billoter les troncs", "Charger les remorques forestières"],
  },

  // ── AGRICULTURE & TERROIR ──
  fermier_laitier: {
    id: "fermier_laitier",
    title: "Producteur Laitier — Fermes Québon",
    category: "agriculture_foret",
    department: "Fermes du Rang Saint-Alban",
    baseHourlyWage: 23.00,
    overtimeRateMultiplier: 1.0,
    union: "aucun",
    requiredCertifications: [],
    hazardPayBonus: 1.00,
    uniformColor: 0x447744,
    description: "Traite quotidienne des vaches Holstein, entretien de l'étable et ensilage.",
    responsibilities: ["Opérer le carrousel de traite", "Nettoyer les cuves à lait réfrigérées", "Nourrir le bétail"],
  },
  acericulteur_sirop: {
    id: "acericulteur_sirop",
    title: "Acériculteur — Cabanes à sucre",
    category: "agriculture_foret",
    department: "Érablières du Comté",
    baseHourlyWage: 25.50,
    overtimeRateMultiplier: 1.25,
    union: "aucun",
    requiredCertifications: [],
    hazardPayBonus: 1.50,
    uniformColor: 0x884422,
    description: "Entretien de la tubulure sous vide, bouillage de l'eau d'érable et mise en barils de sirop ambré.",
    responsibilities: ["Vérifier les fuites de tubulure dans le bois", "Nourrir l'évaporateur au bois", "Conditionner les cannes de sirop"],
  },

  // ── TRANSPORT & LOGISTIQUE ──
  camionneur_teamster: {
    id: "camionneur_teamster",
    title: "Camionneur Longue-Distance — Fret A-40 / A-20",
    category: "transport_logistique",
    department: "Transport Provincial (Teamsters Local 106)",
    baseHourlyWage: 36.00,
    overtimeRateMultiplier: 1.5,
    union: "teamsters_quebec",
    requiredCertifications: ["permis_classe_1"],
    hazardPayBonus: 3.00,
    uniformColor: 0x334466,
    description: "Conduite de semi-remorques 53 pieds et B-Trains à travers le corridor Québec-Montréal.",
    responsibilities: ["Effectuer la ronde de sécurité (RDS)", "Arrimer les cargaisons de fret", "Respecter les heures de conduite"],
  },
  livreur_express: {
    id: "livreur_express",
    title: "Livreur de Colis — Courrier du Comté",
    category: "transport_logistique",
    department: "Dépôt de livraison régionale",
    baseHourlyWage: 22.00,
    overtimeRateMultiplier: 1.5,
    union: "aucun",
    requiredCertifications: [],
    hazardPayBonus: 0.50,
    uniformColor: 0x664422,
    description: "Livraison rapide de paquets résidentiels et de fournitures de dépanneurs.",
    responsibilities: ["Scanner les colis de livraison", "Conduire les routes rurales de gravier", "Faire signer les bordereaux"],
  },
  chauffeur_taxi: {
    id: "chauffeur_taxi",
    title: "Chauffeur de Taxi — Taxi Diamond Portneuf",
    category: "transport_logistique",
    department: "Coopérative de Taxi",
    baseHourlyWage: 18.00, // Plus pourboires directs
    overtimeRateMultiplier: 1.0,
    union: "aucun",
    requiredCertifications: [],
    hazardPayBonus: 2.00,
    uniformColor: 0xddbb00,
    description: "Transport de citoyens, sorties de bar et navettes vers la gare de train.",
    responsibilities: ["Répondre aux appels de la centrale", "Aider avec les bagages", "Entretenir le taximètre"],
  },

  // ── COMMERCE & FINANCE ──
  commis_sqdc: {
    id: "commis_sqdc",
    title: "Conseiller aux ventes — SQDC",
    category: "commerce_services",
    department: "Succursale Cannabis Légal",
    baseHourlyWage: 21.50,
    overtimeRateMultiplier: 1.5,
    union: "csn_sante",
    requiredCertifications: [],
    hazardPayBonus: 0.50,
    uniformColor: 0x00874e,
    description: "Vente responsable de cannabis récréatif et vérification rigoureuse des pièces d'identité (21+).",
    responsibilities: ["Conseiller les souches (Indica/Sativa)", "Contrôler la carte d'identité", "Gérer la caisse enregistreuse"],
  },
  caissier_desjardins: {
    id: "caissier_desjardins",
    title: "Agent Services aux Membres — Caisse Desjardins",
    category: "commerce_services",
    department: "Centre de services Desjardins",
    baseHourlyWage: 26.00,
    overtimeRateMultiplier: 1.5,
    union: "csn_sante",
    requiredCertifications: [],
    hazardPayBonus: 1.00,
    uniformColor: 0x00874e,
    description: "Opérations bancaires courantes, dépôts d'espèces et délivrance de chèques visés.",
    responsibilities: ["Traiter les retraits et dépôts", "Balancier le tiroir-caisse", "Identifier les transactions suspectes"],
  },
  commis_depanneur: {
    id: "commis_depanneur",
    title: "Commis de Nuit — Dépanneur Couche-Tard",
    category: "commerce_services",
    department: "Dépanneurs du Comté",
    baseHourlyWage: 16.75, // Salaire minimum + prime de nuit
    overtimeRateMultiplier: 1.5,
    union: "aucun",
    requiredCertifications: [],
    hazardPayBonus: 3.00, // Risque de vol la nuit
    uniformColor: 0xcc2200,
    description: "Service à la clientèle, vente de loterie Loto-Québec, bières et café de nuit.",
    responsibilities: ["Valider les billets de loterie", "Remplir les frigidaires à bière", "Garder un œil sur les voleurs"],
  },

  // ── JURIDIQUE & IMMOBILIER ──
  courtier_immobilier: {
    id: "courtier_immobilier",
    title: "Courtier Immobilier Résidentiel — Centris",
    category: "juridique_immo",
    department: "Agence Immobilière Rive-Nord",
    baseHourlyWage: 20.00, // Plus 4% de commission sur chaque vente
    overtimeRateMultiplier: 1.0,
    union: "aucun",
    requiredCertifications: ["permis_courtier_oaciq"],
    hazardPayBonus: 0.0,
    uniformColor: 0x112233,
    description: "Évaluation de propriétés, visites libres et négociation des offres d'achat.",
    responsibilities: ["Rédiger les fiches MLS/Centris", "Faire visiter les bungalows et chalets", "Négocier les promesses d'achat"],
  },
  notaire_juriste: {
    id: "notaire_juriste",
    title: "Notaire Instrumentant — Chambre des Notaires",
    category: "juridique_immo",
    department: "Étude Notariale du Comté",
    baseHourlyWage: 65.00,
    overtimeRateMultiplier: 1.0,
    union: "chambre_notaires_cdn" as UnionType,
    requiredCertifications: ["chambre_notaires_cdn"],
    hazardPayBonus: 0.0,
    uniformColor: 0x111122,
    description: "Rédaction et officialisation des actes de vente de maisons, hypothèques et testaments.",
    responsibilities: ["Publier les actes au Registre foncier", "Transférer les fonds de transaction", "Authentifier les baux et contrats"],
  },
};

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES CERTIFICATIONS & FORMATIONS PROFESSIONNELLES
// ═══════════════════════════════════════════════════════════

export interface CertificationDef {
  id: CertificationType;
  title: string;
  costCAD: number;
  durationMinutes: number;
  institution: string;
  description: string;
}

export const CERTIFICATION_CATALOG: Record<CertificationType, CertificationDef> = {
  carte_asp_construction: {
    id: "carte_asp_construction",
    title: "Cours Santé et Sécurité générale (ASP Construction)",
    costCAD: 250,
    durationMinutes: 5,
    institution: "Association paritaire pour la santé et la sécurité du travail",
    description: "Obligatoire pour avoir le droit de poser le pied sur n'importe quel chantier au Québec.",
  },
  carte_ccq_apprenti: {
    id: "carte_ccq_apprenti",
    title: "Carte de Compétence Apprenti — CCQ",
    costCAD: 450,
    durationMinutes: 10,
    institution: "Commission de la construction du Québec",
    description: "Permet de travailler légalement comme apprenti charpentier, électricien ou grutier.",
  },
  carte_ccq_compagnon: {
    id: "carte_ccq_compagnon",
    title: "Certificat de Compagnon Émérite — CCQ",
    costCAD: 950,
    durationMinutes: 15,
    institution: "Commission de la construction du Québec",
    description: "Plein statut syndiqué permettant de toucher le salaire horaire maximum de l'industrie.",
  },
  permis_classe_1: {
    id: "permis_classe_1",
    title: "Permis de conduire Classe 1 (Semi-Remorque)",
    costCAD: 1800,
    durationMinutes: 12,
    institution: "École de Conduite Professionnelle SAAQ",
    description: "Autorise la conduite des camions lourds, remorques doubles et citernes.",
  },
  permis_classe_3: {
    id: "permis_classe_3",
    title: "Permis de conduire Classe 3 (Camion Porteur)",
    costCAD: 1100,
    durationMinutes: 8,
    institution: "École de Conduite Professionnelle SAAQ",
    description: "Autorise la conduite des déneigeuses, camions d'Hydro-Québec et camions à ordures.",
  },
  permis_classe_4a: {
    id: "permis_classe_4a",
    title: "Permis de conduire Classe 4A (Véhicules d'urgence)",
    costCAD: 600,
    durationMinutes: 6,
    institution: "Société de l'assurance automobile du Québec (SAAQ)",
    description: "Permet de piloter gyrophares allumés les autopatrouilles, ambulances et camions d'incendie.",
  },
  diplome_enpq: {
    id: "diplome_enpq",
    title: "Formation Initiale en Patrouille — ENPQ Nicolet",
    costCAD: 3500,
    durationMinutes: 20,
    institution: "École nationale de police du Québec",
    description: "Diplôme officiel obligatoire pour devenir policier à la Sûreté du Québec ou au SPVM.",
  },
  ordre_infirmiers_oiiq: {
    id: "ordre_infirmiers_oiiq",
    title: "Permis d'exercice de l'Ordre des Infirmiers (OIIQ)",
    costCAD: 1200,
    durationMinutes: 15,
    institution: "Ordre des infirmières et infirmiers du Québec",
    description: "Permet d'administrer des soins cliniques et de pratiquer comme paramédic d'urgence.",
  },
  chambre_notaires_cdn: {
    id: "chambre_notaires_cdn",
    title: "Inscription au Tableau de l'Ordre des Notaires",
    costCAD: 4500,
    durationMinutes: 25,
    institution: "Chambre des notaires du Québec",
    description: "Donne le statut officiel d'officier public pour authentifier les ventes de maisons et hypothèques.",
  },
  permis_courtier_oaciq: {
    id: "permis_courtier_oaciq",
    title: "Permis de Courtage Immobilier — OACIQ",
    costCAD: 2200,
    durationMinutes: 10,
    institution: "Organisme d'autoréglementation du courtage immobilier du Québec",
    description: "Permet d'afficher des maisons sur le réseau Centris/MLS et de prélever des commissions.",
  },
};

// ═══════════════════════════════════════════════════════════
// ÉTAT GLOBAL DES EMPLOYÉS & DU TRAVAIL (MULTIJOUERS)
// ═══════════════════════════════════════════════════════════

const CONTRACTS = new Map<string, EmployeeContract>();
const ACTIVE_SHIFTS = new Map<string, WorkShift>();
const CNESST_CLAIMS = new Map<string, CnesstClaim>();
const UNEMPLOYMENT_CLAIMS = new Map<string, UnemploymentBenefit>();
const ACTIVE_GIGS = new Map<string, GigOffer>();

// ═══════════════════════════════════════════════════════════
// GESTION DE L'EMBAUCHE, PROMOTION & CONGÉDIEMENT
// ═══════════════════════════════════════════════════════════

export interface JobApplyResult {
  success: boolean;
  message: string;
  contract: EmployeeContract | null;
}

export function applyForJob(playerId: string, playerName: string, jobId: JobId): JobApplyResult {
  const jobDef = JOB_CATALOG[jobId];
  if (!jobDef) return { success: false, message: "Offre d'emploi introuvable.", contract: null };

  let contract = CONTRACTS.get(playerId);

  // Vérifier si le joueur possède toutes les certifications obligatoires
  const playerCerts = contract?.certificationsObtained ?? [];
  for (const cert of jobDef.requiredCertifications) {
    if (!playerCerts.includes(cert)) {
      const missingCert = CERTIFICATION_CATALOG[cert];
      return {
        success: false,
        message: `Candidature rejetée : Il vous manque la certification « ${missingCert?.title ?? cert} ».`,
        contract: null,
      };
    }
  }

  // Créer ou mettre à jour le contrat de travail
  contract = {
    playerId,
    playerName,
    jobId,
    jobTitle: jobDef.title,
    hourlyWage: jobDef.baseHourlyWage,
    hiredAt: Date.now(),
    hoursWorkedTotal: contract?.hoursWorkedTotal ?? 0,
    hoursWorkedThisWeek: 0,
    careerEarningsTotal: contract?.careerEarningsTotal ?? 0,
    reputationScore: contract?.reputationScore ?? 50,
    certificationsObtained: playerCerts,
    unionMember: jobDef.union !== "aucun",
    isOnDuty: false,
    activeShift: null,
    cnesstActive: false,
  };

  CONTRACTS.set(playerId, contract);

  triggerNotification(playerId, {
    title: "🎉 Embauché !",
    body: `Poste: ${jobDef.title}\nSalaire: ${jobDef.baseHourlyWage.toFixed(2)}$/h\nDépartement: ${jobDef.department}`,
    icon: "💼",
  });

  sendChatMessage(`📢 [RECRUTEMENT] ${playerName} a été engagé comme ${jobDef.title} !`);
  netEmit("jobs:player_hired", { contract });

  return { success: true, message: `Félicitations ! Vous êtes maintenant embauché comme ${jobDef.title}.`, contract };
}

export function quitJob(playerId: string): { success: boolean; message: string } {
  const contract = CONTRACTS.get(playerId);
  if (!contract) return { success: false, message: "Vous n'avez aucun emploi actuellement." };

  if (contract.isOnDuty) {
    clockOut(playerId);
  }

  const oldTitle = contract.jobTitle;
  CONTRACTS.delete(playerId);

  triggerNotification(playerId, {
    title: "Démission confirmée",
    body: `Vous avez quitté votre poste de ${oldTitle}.`,
    icon: "📋",
  });

  sendChatMessage(`📢 [DÉMISSION] ${contract.playerName} a démissionné de son poste de ${oldTitle}.`);
  netEmit("jobs:player_quit", { playerId, oldJobId: contract.jobId });

  return { success: true, message: `Vous avez remis votre démission de ${oldTitle}.` };
}

// ═══════════════════════════════════════════════════════════
// POINTEUSE & HEURES DE TRAVAIL (PUNCH IN / PUNCH OUT)
// ═══════════════════════════════════════════════════════════

export function clockIn(playerId: string): { success: boolean; message: string; shift: WorkShift | null } {
  const contract = CONTRACTS.get(playerId);
  if (!contract) return { success: false, message: "Vous n'avez aucun emploi actif.", shift: null };
  if (contract.isOnDuty) return { success: false, message: "Vous êtes déjà en train de travailler.", shift: null };
  if (contract.cnesstActive) return { success: false, message: "Vous êtes en arrêt de travail payé par la CNESST !", shift: null };

  const shiftId = `SHIFT-${Date.now().toString(36).toUpperCase()}`;
  const shift: WorkShift = {
    shiftId,
    jobId: contract.jobId,
    startedAt: Date.now(),
    endedAt: null,
    hoursWorked: 0,
    overtimeHours: 0,
    tasksCompleted: 0,
    hazardsEncountered: 0,
    accumulatedPayGross: 0,
  };

  contract.isOnDuty = true;
  contract.activeShift = shift;
  ACTIVE_SHIFTS.set(shiftId, shift);

  const jobDef = JOB_CATALOG[contract.jobId];
  triggerNotification(playerId, {
    title: "⏱️ Début de quart de travail",
    body: `Vous avez poinçonné à ${new Date().toLocaleTimeString("fr-CA")}.\nUniforme et équipement prêts.`,
    icon: "🟢",
  });

  netEmit("jobs:clocked_in", { playerId, shift });
  return { success: true, message: `Quart de travail débuté pour ${jobDef.title}. Bon quart !`, shift };
}

export function clockOut(playerId: string): { success: boolean; message: string; payStub: PayStub | null } {
  const contract = CONTRACTS.get(playerId);
  if (!contract || !contract.isOnDuty || !contract.activeShift) {
    return { success: false, message: "Vous n'êtes pas en service actuellement.", payStub: null };
  }

  const shift = contract.activeShift;
  shift.endedAt = Date.now();

  // Calcul du temps écoulé (1 heure réelle = plusieurs heures in-game selon l'échelle)
  const elapsedMinutes = Math.max(1, (shift.endedAt - shift.startedAt) / 60000);
  const hoursFraction = elapsedMinutes / 60; // Fraction d'heure

  const jobDef = JOB_CATALOG[contract.jobId];

  // Calcul des heures régulières vs supplémentaires (Overtime > 40h semaine)
  let regularHours = hoursFraction;
  let overtimeHours = 0;

  if (contract.hoursWorkedThisWeek + hoursFraction > 40) {
    const regularLeft = Math.max(0, 40 - contract.hoursWorkedThisWeek);
    regularHours = regularLeft;
    overtimeHours = hoursFraction - regularLeft;
  }

  shift.hoursWorked = hoursFraction;
  shift.overtimeHours = overtimeHours;

  // Calcul du salaire brut (avec prime de risque et temps et demi)
  const baseRate = contract.hourlyWage + jobDef.hazardPayBonus;
  const regularPay = regularHours * baseRate;
  const overtimePay = overtimeHours * (baseRate * jobDef.overtimeRateMultiplier);
  const grossTotal = Math.round((regularPay + overtimePay) * 100) / 100;

  shift.accumulatedPayGross = grossTotal;

  // ── RETENUES À LA SOURCE DU QUÉBEC (CALCUL FISCAL RÉEL) ──
  const deductions = {
    provincialTaxQC: Math.round(grossTotal * 0.14 * 100) / 100,    // Revenu Québec (Palier 14%)
    federalTaxARC: Math.round(grossTotal * 0.15 * 100) / 100,      // Fédéral ARC (15%)
    rrqContribution: Math.round(grossTotal * 0.064 * 100) / 100,    // Régime des rentes du Québec (6.4%)
    aeContribution: Math.round(grossTotal * 0.0163 * 100) / 100,   // Assurance-emploi (1.63%)
    rqapContribution: Math.round(grossTotal * 0.0049 * 100) / 100, // RQAP (0.49%)
    unionDues: contract.unionMember ? Math.round(grossTotal * 0.015 * 100) / 100 : 0, // Cotisation syndicale (1.5%)
  };

  const totalDeductions =
    deductions.provincialTaxQC +
    deductions.federalTaxARC +
    deductions.rrqContribution +
    deductions.aeContribution +
    deductions.rqapContribution +
    deductions.unionDues;

  const netPay = Math.max(0, Math.round((grossTotal - totalDeductions) * 100) / 100);

  // Mettre à jour les stats du travailleur
  contract.hoursWorkedTotal += hoursFraction;
  contract.hoursWorkedThisWeek += hoursFraction;
  contract.careerEarningsTotal += netPay;
  contract.isOnDuty = false;
  contract.activeShift = null;

  // Dépôt direct dans le compte bancaire Desjardins
  addCash(netPay, playerId);
  const acct = getAccount(playerId);
  if (acct) {
    pushTx(acct, "salary", netPay, `Dépôt direct paie : ${jobDef.title}`, acct.balance + netPay, jobDef.department);
  }

  const payStub: PayStub = {
    stubId: `PAIE-${Date.now().toString(36).toUpperCase()}`,
    playerId,
    jobTitle: jobDef.title,
    periodEnd: Date.now(),
    grossAmount: grossTotal,
    deductions,
    netAmount: netPay,
    hoursRegular: regularHours,
    hoursOvertime: overtimeHours,
  };

  triggerNotification(playerId, {
    title: "💵 Dépôt direct reçu !",
    body: `Salaire net: ${netPay.toFixed(2)}$ déposés chez Desjardins.\nBrut: ${grossTotal.toFixed(2)}$ (Retenues: ${totalDeductions.toFixed(2)}$)`,
    icon: "💰",
  });

  netEmit("jobs:clocked_out", { playerId, payStub });

  return {
    success: true,
    message: `Fin de quart ! Vous avez gagné ${netPay.toFixed(2)}$ nets déposés sur votre compte.`,
    payStub,
  };
}

// ═══════════════════════════════════════════════════════════
// CNESST (ACCIDENT DU TRAVAIL & INDEMNITÉ DE REMPLACEMENT)
// ═══════════════════════════════════════════════════════════

export function reportWorkplaceInjury(
  playerId: string,
  injuryDescription: string,
  severityDamage: number,
): { success: boolean; claim: CnesstClaim | null; message: string } {
  const contract = CONTRACTS.get(playerId);
  if (!contract || !contract.isOnDuty) {
    return { success: false, claim: null, message: "Seul un accident survenu en service est admissible à la CNESST." };
  }

  // Appliquer les dégâts corporels au travailleur
  modifyHealth(-severityDamage, playerId);

  // Calcul de l'indemnité journalière de remplacement du revenu (90% du revenu net moyen)
  const estimatedDailyWage = contract.hourlyWage * 8 * 0.70 * 0.90; // 90% du net estimé

  const claimId = `CNESST-${Date.now().toString(36).toUpperCase()}`;
  const claim: CnesstClaim = {
    claimId,
    playerId,
    jobId: contract.jobId,
    incidentDate: Date.now(),
    injuryDescription,
    dailyCompensation: Math.round(estimatedDailyWage * 100) / 100,
    daysRemaining: 7, // 7 jours de repos payés par la CNESST
    status: "approved",
  };

  CNESST_CLAIMS.set(claimId, claim);
  contract.cnesstActive = true;
  clockOut(playerId); // Fin de quart automatique pour blessure

  triggerNotification(playerId, {
    title: "🏥 Réclamation CNESST Acceptée",
    body: `Accident déclaré : ${injuryDescription}\nIndemnité: ${claim.dailyCompensation.toFixed(2)}$/jour pendant ${claim.daysRemaining} jours.`,
    icon: "🩹",
    urgent: true,
  });

  sendChatMessage(`🚨 [CNESST] Un accident de travail est survenu (${injuryDescription}) affectant ${contract.playerName}.`);
  netEmit("jobs:cnesst_approved", { claim });

  return { success: true, claim, message: "Réclamation approuvée par la CNESST. Reposez-vous !" };
}

// ═══════════════════════════════════════════════════════════
// ASSURANCE-CHÔMAGE (PRESTATIONS D'ASSURANCE-EMPLOI)
// ═══════════════════════════════════════════════════════════

export function applyForUnemploymentBenefits(playerId: string): { success: boolean; message: string; claim: UnemploymentBenefit | null } {
  const contract = CONTRACTS.get(playerId);
  if (contract && contract.isOnDuty) {
    return { success: false, message: "Vous ne pouvez pas toucher le chômage si vous travaillez déjà !", claim: null };
  }

  const existing = UNEMPLOYMENT_CLAIMS.get(playerId);
  if (existing && existing.isActive) {
    return { success: false, message: `Vous recevez déjà des prestations d'assurance-emploi (${existing.weeklyAmount.toFixed(2)}$/semaine).`, claim: existing };
  }

  // 55% du salaire hebdomadaire de référence (max 650$/semaine selon les normes canadiennes)
  const weeklyAverage = contract ? (contract.hourlyWage * 35 * 0.55) : 385.00;
  const weeklyAmount = Math.min(650.00, Math.round(weeklyAverage * 100) / 100);

  const claimId = `AE-${Date.now().toString(36).toUpperCase()}`;
  const claim: UnemploymentBenefit = {
    claimId,
    playerId,
    weeklyAmount,
    weeksRemaining: 14, // 14 semaines de prestations
    approvedDate: Date.now(),
    isActive: true,
  };

  UNEMPLOYMENT_CLAIMS.set(playerId, claim);

  triggerNotification(playerId, {
    title: "🍁 Assurance-Emploi (Chômage)",
    body: `Demande acceptée : ${weeklyAmount.toFixed(2)}$ par semaine (14 semaines restantes).`,
    icon: "📄",
  });

  netEmit("jobs:unemployment_started", { claim });
  return { success: true, message: `Prestations de chômage actives : ${weeklyAmount.toFixed(2)}$/semaine.`, claim };
}

// ═══════════════════════════════════════════════════════════
// CERTIFICATIONS & FORMATIONS PROFESSIONNELLES
// ═══════════════════════════════════════════════════════════

export function takeCertificationCourse(
  playerId: string,
  certId: CertificationType,
): { success: boolean; message: string } {
  const certDef = CERTIFICATION_CATALOG[certId];
  if (!certDef) return { success: false, message: "Formation introuvable." };

  let contract = CONTRACTS.get(playerId);
  if (!contract) {
    contract = {
      playerId,
      playerName: getPlayerData()?.name ?? "Citoyen",
      jobId: "commis_depanneur",
      jobTitle: "Sans emploi",
      hourlyWage: 0,
      hiredAt: Date.now(),
      hoursWorkedTotal: 0,
      hoursWorkedThisWeek: 0,
      careerEarningsTotal: 0,
      reputationScore: 50,
      certificationsObtained: [],
      unionMember: false,
      isOnDuty: false,
      activeShift: null,
      cnesstActive: false,
    };
    CONTRACTS.set(playerId, contract);
  }

  if (contract.certificationsObtained.includes(certId)) {
    return { success: false, message: "Vous possédez déjà ce certificat officiel !" };
  }

  const acct = getAccount(playerId);
  if (!acct || acct.balance < certDef.costCAD) {
    return { success: false, message: `Fonds insuffisants pour payer les frais de formation (${certDef.costCAD}$).` };
  }

  removeCash(certDef.costCAD, playerId);
  contract.certificationsObtained.push(certId);

  triggerNotification(playerId, {
    title: "🎓 Diplôme & Carte obtenue !",
    body: `${certDef.title}\nÉmis par: ${certDef.institution}`,
    icon: "📜",
  });

  sendChatMessage(`📜 [FORMATION] ${contract.playerName} a réussi son examen : « ${certDef.title} » !`);
  netEmit("jobs:cert_obtained", { playerId, certId });

  return { success: true, message: `Certificat obtenu : ${certDef.title} !` };
}

// ═══════════════════════════════════════════════════════════
// BOULOTS RAPIDES AU NOIR (GIGS PAYÉS COMPTANT)
// ═══════════════════════════════════════════════════════════

export function generateGigBoard(): GigOffer[] {
  const currentSeason = getCurrentSeason();

  const gigs: GigOffer[] = [
    {
      id: "gig_divan",
      title: "Déménagement de meuble lourd",
      description: "Monter un divan sectionnel au 3e étage d'un duplex.",
      locationName: "Pont-Rouge (Secteur Résidentiel)",
      position: { x: -22, z: 16 },
      payCash: 60,
      durationMinutes: 2,
      hazardRisk: 10,
      reputationGain: 2,
    },
    {
      id: "gig_plonge",
      title: "Plongeur d'urgence au Casse-Croûte",
      description: "Faire la vaisselle pendant le rush de poutine du midi.",
      locationName: "Casse-Croûte du Village",
      position: { x: 14, z: -8 },
      payCash: 45,
      durationMinutes: 3,
      hazardRisk: 5,
      reputationGain: 1,
    },
    {
      id: "gig_secu",
      title: "Bouncer / Sécurité de festival",
      description: "Surveiller la tente à bière et calmer les fêtards éméchés.",
      locationName: "Parc municipal de Portneuf",
      position: { x: 0, z: 12 },
      payCash: 95,
      durationMinutes: 4,
      hazardRisk: 25,
      reputationGain: 3,
    },
  ];

  // Boulots d'hiver spécifiques
  if (currentSeason === "hiver") {
    gigs.push({
      id: "gig_pelleter",
      title: "Pelleter une entrée après la tempête",
      description: "Dégager 30 cm de neige lourde devant le garage d'une dame âgée.",
      locationName: "Donnacona (Rang Saint-Joseph)",
      position: { x: 40, z: -28 },
      payCash: 75,
      durationMinutes: 3,
      hazardRisk: 15,
      reputationGain: 4,
    });
  }

  // Boulots d'été / automne
  if (currentSeason === "ete" || currentSeason === "automne") {
    gigs.push({
      id: "gig_tonte",
      title: "Tondre un grand terrain de campagne",
      description: "Passer la tondeuse autoportée sur un terrain de 2 âcres.",
      locationName: "Saint-Alban (Rang 2)",
      position: { x: -50, z: 45 },
      payCash: 80,
      durationMinutes: 3,
      hazardRisk: 5,
      reputationGain: 2,
    });
  }

  gigs.forEach((g) => ACTIVE_GIGS.set(g.id, g));
  return gigs;
}

export function completeGig(playerId: string, gigId: string): { success: boolean; message: string; payCash: number } {
  const gig = ACTIVE_GIGS.get(gigId);
  if (!gig) return { success: false, message: "Ce contrat n'est plus disponible.", payCash: 0 };

  // Risque de blessure
  if (Math.random() < gig.hazardRisk / 100) {
    modifyHealth(-15, playerId);
    sendPrivateMessage(playerId, "⚠️ Vous vous êtes fait un tour de rein pendant le boulot !");
  }

  // Paiement en argent comptant liquide net (au noir)
  addCash(gig.payCash, playerId);
  ACTIVE_GIGS.delete(gigId);

  triggerNotification(playerId, {
    title: "💵 Payé comptant !",
    body: `${gig.title} terminé.\n+${gig.payCash}$ en liquide dans vos poches.`,
    icon: "🤝",
  });

  netEmit("jobs:gig_completed", { playerId, gigId, payCash: gig.payCash });
  return { success: true, message: `Boulot terminé ! Vous touchez ${gig.payCash}$ en liquide.`, payCash: gig.payCash };
}

// ═══════════════════════════════════════════════════════════
// COMPATIBILITÉ & EXPORTS POUR L'INTERFACE ET HAUL
// ═══════════════════════════════════════════════════════════

export type { HaulJob, HaulKind } from "./haul";

export function getPlayerContract(playerId: string): EmployeeContract | null {
  return CONTRACTS.get(playerId) ?? null;
}

export function getAllActiveWorkers(): EmployeeContract[] {
  return Array.from(CONTRACTS.values()).filter((c) => c.isOnDuty);
}

// ═══════════════════════════════════════════════════════════
// REMOTES (RPC MULTIJOUEUR EN TEMPS RÉEL)
// ═══════════════════════════════════════════════════════════

registerRemote("jobs:apply", applyForJob);
registerRemote("jobs:quit", quitJob);
registerRemote("jobs:clock_in", clockIn);
registerRemote("jobs:clock_out", clockOut);
registerRemote("jobs:report_injury", reportWorkplaceInjury);
registerRemote("jobs:apply_unemployment", applyForUnemploymentBenefits);
registerRemote("jobs:take_course", takeCertificationCourse);
registerRemote("jobs:complete_gig", completeGig);
/**
 * Legacy store compatibility.
 *
 * Canonical API:
 * generateGigBoard()
 *
 * Legacy store API:
 * rollBoard()
 */
export function rollBoard(): GigOffer[] {
  return generateGigBoard();
}