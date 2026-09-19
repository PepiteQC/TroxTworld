import { netEmit } from "./net";
import { registerRemote } from "./remotes";
import { sendPrivateMessage, sendChatMessage } from "./chat";
import { triggerNotification } from "./phone";
import { addCash, removeCash, getAccount, pushTx } from "./banking";
import { modifyHealth } from "./survival";

export type JobCategory = "securite_publique" | "sante_urgence" | "construction_metiers" | "energie_services" | "transport_logistique" | "agriculture_foret" | "commerce_services" | "juridique_immo";
export type JobId = "agent_sq" | "agent_spvm" | "pompier_municipal" | "agent_correctionnel" | "paramedic_urgence" | "monteur_hydro" | "deneigeur_mtq" | "eboueur_municipal" | "menuisier_ccq" | "electricien_ccq" | "operateur_papeterie" | "bucheron_foret" | "fermier_laitier" | "acericulteur_sirop" | "camionneur_teamster" | "livreur_express" | "chauffeur_taxi" | "commis_sqdc" | "caissier_desjardins" | "commis_depanneur" | "courtier_immobilier" | "notaire_juriste";
export type UnionType = "ftq_construction" | "csn_sante" | "teamsters_quebec" | "fipq_pompiers" | "appsq_police" | "aucun";
export type CertificationType = "carte_asp_construction" | "carte_ccq_apprenti" | "carte_ccq_compagnon" | "permis_classe_1" | "permis_classe_3" | "permis_classe_4a" | "diplome_enpq" | "ordre_infirmiers_oiiq" | "chambre_notaires_cdn" | "permis_courtier_oaciq";

export interface JobDefinition { id: JobId; title: string; category: JobCategory; department: string; baseHourlyWage: number; overtimeRateMultiplier: number; union: UnionType; requiredCertifications: CertificationType[]; hazardPayBonus: number; uniformColor: number; description: string; responsibilities: string[]; }
export interface EmployeeContract { playerId: string; playerName: string; jobId: JobId; jobTitle: string; hourlyWage: number; hiredAt: number; hoursWorkedTotal: number; hoursWorkedThisWeek: number; careerEarningsTotal: number; reputationScore: number; certificationsObtained: CertificationType[]; unionMember: boolean; isOnDuty: boolean; activeShift: WorkShift | null; cnesstActive: boolean; }
export interface WorkShift { shiftId: string; jobId: JobId; startedAt: number; endedAt: number | null; hoursWorked: number; overtimeHours: number; tasksCompleted: number; hazardsEncountered: number; accumulatedPayGross: number; }
export interface PayStub { stubId: string; playerId: string; jobTitle: string; periodEnd: number; grossAmount: number; deductions: { provincialTaxQC: number; federalTaxARC: number; rrqContribution: number; aeContribution: number; rqapContribution: number; unionDues: number; }; netAmount: number; hoursRegular: number; hoursOvertime: number; }
export interface CnesstClaim { claimId: string; playerId: string; jobId: JobId; incidentDate: number; injuryDescription: string; dailyCompensation: number; daysRemaining: number; status: "approved" | "under_review" | "closed"; }
export interface UnemploymentBenefit { claimId: string; playerId: string; weeklyAmount: number; weeksRemaining: number; approvedDate: number; isActive: boolean; }
export interface GigOffer { id: string; title: string; description: string; locationName: string; position: { x: number; z: number }; payCash: number; durationMinutes: number; requiredItems?: string[]; hazardRisk: number; reputationGain: number; }

export const JOB_CATALOG: Record<JobId, JobDefinition> = {
  agent_sq: { id: "agent_sq", title: "Agent Patrouilleur — Sûreté du Québec", category: "securite_publique", department: "District Portneuf (Poste 104)", baseHourlyWage: 38.50, overtimeRateMultiplier: 1.5, union: "appsq_police", requiredCertifications: ["diplome_enpq", "permis_classe_4a"], hazardPayBonus: 4.50, uniformColor: 0x223322, description: "Application du Code de la sécurité routière.", responsibilities: ["Patrouiller la route 138", "Émettre des constats"] },
  agent_spvm: { id: "agent_spvm", title: "Policier — SPVM", category: "securite_publique", department: "Poste de quartier 21", baseHourlyWage: 41.00, overtimeRateMultiplier: 1.5, union: "appsq_police", requiredCertifications: ["diplome_enpq", "permis_classe_4a"], hazardPayBonus: 6.00, uniformColor: 0x1a2430, description: "Maintien de l'ordre en milieu urbain.", responsibilities: ["Interventions en milieu dense", "Contrôles de foule"] },
  pompier_municipal: { id: "pompier_municipal", title: "Pompier — Service de sécurité incendie", category: "securite_publique", department: "Caserne de Portneuf", baseHourlyWage: 32.00, overtimeRateMultiplier: 1.5, union: "fipq_pompiers", requiredCertifications: ["permis_classe_4a"], hazardPayBonus: 8.00, uniformColor: 0xcc2211, description: "Combat des incendies de bâtiments.", responsibilities: ["Éteindre les feux", "Désincarcérer"] },
  agent_correctionnel: { id: "agent_correctionnel", title: "Agent Correctionnel (CX-01) — SCC", category: "securite_publique", department: "Pénitencier de Donnacona", baseHourlyWage: 36.50, overtimeRateMultiplier: 1.5, union: "csn_sante", requiredCertifications: [], hazardPayBonus: 7.00, uniformColor: 0x3e4247, description: "Surveillance en pénitencier.", responsibilities: ["Fouiller les cellules", "Gérer les mouvements"] },
  paramedic_urgence: { id: "paramedic_urgence", title: "Paramédic — Urgences-santé", category: "sante_urgence", department: "Services Préhospitaliers", baseHourlyWage: 34.00, overtimeRateMultiplier: 1.5, union: "csn_sante", requiredCertifications: ["permis_classe_4a", "ordre_infirmiers_oiiq"], hazardPayBonus: 5.00, uniformColor: 0x008855, description: "Soins médicaux d'urgence.", responsibilities: ["Stabiliser les blessés", "Transport gyrophare"] },
  monteur_hydro: { id: "monteur_hydro", title: "Monteur de Lignes — Hydro-Québec", category: "energie_services", department: "Réseau de Distribution", baseHourlyWage: 46.00, overtimeRateMultiplier: 2.0, union: "ftq_construction", requiredCertifications: ["carte_asp_construction", "permis_classe_3"], hazardPayBonus: 9.50, uniformColor: 0xff6600, description: "Réparation des transformateurs.", responsibilities: ["Grimper aux poteaux", "Couper les branches"] },
  deneigeur_mtq: { id: "deneigeur_mtq", title: "Opérateur de Chasse-Neige — MTQ", category: "energie_services", department: "Voirie & Déneigement", baseHourlyWage: 29.50, overtimeRateMultiplier: 1.5, union: "teamsters_quebec", requiredCertifications: ["permis_classe_3"], hazardPayBonus: 4.00, uniformColor: 0xffaa00, description: "Opération des charrues à neige.", responsibilities: ["Pousser les bancs de neige", "Épandre le sel"] },
  eboueur_municipal: { id: "eboueur_municipal", title: "Éboueur — Régie des Déchets", category: "energie_services", department: "Régie de gestion des matières", baseHourlyWage: 24.00, overtimeRateMultiplier: 1.5, union: "teamsters_quebec", requiredCertifications: [], hazardPayBonus: 2.50, uniformColor: 0x33aa33, description: "Ramassage des bacs à ordures.", responsibilities: ["Collecter les bacs", "Opérer le compacteur"] },
  menuisier_ccq: { id: "menuisier_ccq", title: "Charpentier-Menuisier Compagnon — CCQ", category: "construction_metiers", department: "Chantiers Résidentiels", baseHourlyWage: 43.80, overtimeRateMultiplier: 1.5, union: "ftq_construction", requiredCertifications: ["carte_asp_construction", "carte_ccq_compagnon"], hazardPayBonus: 3.50, uniformColor: 0x997755, description: "Érection de structures de maisons.", responsibilities: ["Bâtir les ossatures", "Poser les bardeaux"] },
  electricien_ccq: { id: "electricien_ccq", title: "Électricien de Chantier — CCQ", category: "construction_metiers", department: "Chantiers Portneuf", baseHourlyWage: 45.20, overtimeRateMultiplier: 1.5, union: "ftq_construction", requiredCertifications: ["carte_asp_construction", "carte_ccq_compagnon"], hazardPayBonus: 4.00, uniformColor: 0x335588, description: "Raccordement électrique.", responsibilities: ["Passer le filage", "Brancher les panneaux"] },
  operateur_papeterie: { id: "operateur_papeterie", title: "Opérateur de Machine — Papetière Kruger", category: "construction_metiers", department: "Usine de Donnacona", baseHourlyWage: 31.00, overtimeRateMultiplier: 1.5, union: "csn_sante", requiredCertifications: ["carte_asp_construction"], hazardPayBonus: 3.00, uniformColor: 0x666666, description: "Transformation des billots de bois.", responsibilities: ["Alimenter les broyeurs", "Charger les palettes"] },
  bucheron_foret: { id: "bucheron_foret", title: "Bûcheron / Abatteur — Forêts Laurentides", category: "agriculture_foret", department: "Exploitation Forestière", baseHourlyWage: 33.50, overtimeRateMultiplier: 1.5, union: "ftq_construction", requiredCertifications: ["carte_asp_construction"], hazardPayBonus: 7.50, uniformColor: 0xaa2222, description: "Abattage à la tronçonneuse.", responsibilities: ["Couper les arbres", "Billoter les troncs"] },
  fermier_laitier: { id: "fermier_laitier", title: "Producteur Laitier — Fermes Québon", category: "agriculture_foret", department: "Fermes du Rang Saint-Alban", baseHourlyWage: 23.00, overtimeRateMultiplier: 1.0, union: "aucun", requiredCertifications: [], hazardPayBonus: 1.00, uniformColor: 0x447744, description: "Traite quotidienne des vaches.", responsibilities: ["Opérer le carrousel", "Nettoyer les cuves"] },
  acericulteur_sirop: { id: "acericulteur_sirop", title: "Acériculteur — Cabanes à sucre", category: "agriculture_foret", department: "Érablières du Comté", baseHourlyWage: 25.50, overtimeRateMultiplier: 1.25, union: "aucun", requiredCertifications: [], hazardPayBonus: 1.50, uniformColor: 0x884422, description: "Entretien de la tubulure sous vide.", responsibilities: ["Vérifier les fuites", "Conditionner les cannes"] },
  camionneur_teamster: { id: "camionneur_teamster", title: "Camionneur Longue-Distance — Fret A-40", category: "transport_logistique", department: "Transport Provincial", baseHourlyWage: 36.00, overtimeRateMultiplier: 1.5, union: "teamsters_quebec", requiredCertifications: ["permis_classe_1"], hazardPayBonus: 3.00, uniformColor: 0x334466, description: "Conduite de semi-remorques 53 pieds.", responsibilities: ["Ronde de sécurité", "Arrimer les cargaisons"] },
  livreur_express: { id: "livreur_express", title: "Livreur de Colis — Courrier du Comté", category: "transport_logistique", department: "Dépôt de livraison régionale", baseHourlyWage: 22.00, overtimeRateMultiplier: 1.5, union: "aucun", requiredCertifications: [], hazardPayBonus: 0.50, uniformColor: 0x664422, description: "Livraison rapide de paquets.", responsibilities: ["Scanner les colis", "Conduire les routes rurales"] },
  chauffeur_taxi: { id: "chauffeur_taxi", title: "Chauffeur de Taxi — Taxi Diamond", category: "transport_logistique", department: "Coopérative de Taxi", baseHourlyWage: 18.00, overtimeRateMultiplier: 1.0, union: "aucun", requiredCertifications: [], hazardPayBonus: 2.00, uniformColor: 0xddbb00, description: "Transport de citoyens.", responsibilities: ["Répondre aux appels", "Aider avec les bagages"] },
  commis_sqdc: { id: "commis_sqdc", title: "Conseiller aux ventes — SQDC", category: "commerce_services", department: "Succursale Cannabis Légal", baseHourlyWage: 21.50, overtimeRateMultiplier: 1.5, union: "csn_sante", requiredCertifications: [], hazardPayBonus: 0.50, uniformColor: 0x00874e, description: "Vente responsable de cannabis.", responsibilities: ["Conseiller les souches", "Contrôler l'identité"] },
  caissier_desjardins: { id: "caissier_desjardins", title: "Agent Services aux Membres — Desjardins", category: "commerce_services", department: "Centre de services", baseHourlyWage: 26.00, overtimeRateMultiplier: 1.5, union: "csn_sante", requiredCertifications: [], hazardPayBonus: 1.00, uniformColor: 0x00874e, description: "Opérations bancaires courantes.", responsibilities: ["Traiter les retraits", "Balancier le tiroir"] },
  commis_depanneur: { id: "commis_depanneur", title: "Commis de Nuit — Dépanneur", category: "commerce_services", department: "Dépanneurs du Comté", baseHourlyWage: 16.75, overtimeRateMultiplier: 1.5, union: "aucun", requiredCertifications: [], hazardPayBonus: 3.00, uniformColor: 0xcc2200, description: "Service à la clientèle de nuit.", responsibilities: ["Valider la loterie", "Remplir les frigos"] },
  courtier_immobilier: { id: "courtier_immobilier", title: "Courtier Immobilier Résidentiel — Centris", category: "juridique_immo", department: "Agence Immobilière Rive-Nord", baseHourlyWage: 20.00, overtimeRateMultiplier: 1.0, union: "aucun", requiredCertifications: ["permis_courtier_oaciq"], hazardPayBonus: 0.0, uniformColor: 0x112233, description: "Évaluation de propriétés.", responsibilities: ["Rédiger les fiches MLS", "Faire visiter"] },
  notaire_juriste: { id: "notaire_juriste", title: "Notaire Instrumentant", category: "juridique_immo", department: "Étude Notariale du Comté", baseHourlyWage: 65.00, overtimeRateMultiplier: 1.0, union: "aucun", requiredCertifications: ["chambre_notaires_cdn"], hazardPayBonus: 0.0, uniformColor: 0x111122, description: "Rédaction et officialisation des actes.", responsibilities: ["Publier au Registre foncier", "Authentifier les baux"] }
};

export const CERTIFICATION_CATALOG: Record<CertificationType, any> = {
  carte_asp_construction: { id: "carte_asp_construction", title: "Cours Santé et Sécurité générale (ASP Construction)", costCAD: 250, durationMinutes: 5, institution: "ASP", description: "Obligatoire pour les chantiers." },
  carte_ccq_apprenti: { id: "carte_ccq_apprenti", title: "Carte de Compétence Apprenti — CCQ", costCAD: 450, durationMinutes: 10, institution: "CCQ", description: "Travailler comme apprenti." },
  carte_ccq_compagnon: { id: "carte_ccq_compagnon", title: "Certificat de Compagnon Émérite — CCQ", costCAD: 950, durationMinutes: 15, institution: "CCQ", description: "Plein statut syndiqué." },
  permis_classe_1: { id: "permis_classe_1", title: "Permis de conduire Classe 1", costCAD: 1800, durationMinutes: 12, institution: "SAAQ", description: "Camions lourds et remorques." },
  permis_classe_3: { id: "permis_classe_3", title: "Permis de conduire Classe 3", costCAD: 1100, durationMinutes: 8, institution: "SAAQ", description: "Camions porteurs et déneigeuses." },
  permis_classe_4a: { id: "permis_classe_4a", title: "Permis de conduire Classe 4A", costCAD: 600, durationMinutes: 6, institution: "SAAQ", description: "Véhicules d'urgence." },
  diplome_enpq: { id: "diplome_enpq", title: "Formation Initiale en Patrouille — ENPQ", costCAD: 3500, durationMinutes: 20, institution: "ENPQ", description: "Obligatoire pour la SQ/SPVM." },
  ordre_infirmiers_oiiq: { id: "ordre_infirmiers_oiiq", title: "Permis d'exercice de l'OIIQ", costCAD: 1200, durationMinutes: 15, institution: "OIIQ", description: "Soins cliniques et paramédic." },
  chambre_notaires_cdn: { id: "chambre_notaires_cdn", title: "Inscription au Tableau de l'Ordre des Notaires", costCAD: 4500, durationMinutes: 25, institution: "CNQ", description: "Authentifier les ventes et hypothèques." },
  permis_courtier_oaciq: { id: "permis_courtier_oaciq", title: "Permis de Courtage Immobilier — OACIQ", costCAD: 2200, durationMinutes: 10, institution: "OACIQ", description: "Afficher sur Centris/MLS." }
};

const CONTRACTS = new Map<string, EmployeeContract>();
const ACTIVE_SHIFTS = new Map<string, WorkShift>();
const ACTIVE_GIGS = new Map<string, GigOffer>();

export interface JobApplyResult { success: boolean; message: string; contract: EmployeeContract | null; }

export function applyForJob(playerId: string, playerName: string, jobId: JobId): JobApplyResult {
  const jobDef = JOB_CATALOG[jobId];
  if (!jobDef) return { success: false, message: "Offre d'emploi introuvable.", contract: null };
  let contract = CONTRACTS.get(playerId);
  const playerCerts = contract?.certificationsObtained ?? [];
  for (const cert of jobDef.requiredCertifications) {
    if (!playerCerts.includes(cert)) return { success: false, message: "Candidature rejetée : Certification manquante.", contract: null };
  }
  contract = { playerId, playerName, jobId, jobTitle: jobDef.title, hourlyWage: jobDef.baseHourlyWage, hiredAt: Date.now(), hoursWorkedTotal: contract?.hoursWorkedTotal ?? 0, hoursWorkedThisWeek: contract?.hoursWorkedThisWeek ?? 0, careerEarningsTotal: contract?.careerEarningsTotal ?? 0, reputationScore: contract?.reputationScore ?? 50, certificationsObtained: playerCerts, unionMember: jobDef.union !== "aucun", isOnDuty: false, activeShift: null, cnesstActive: false };
  CONTRACTS.set(playerId, contract);
  triggerNotification(playerId, { title: "🎉 Embauché !", body: "Poste: " + jobDef.title + " | Salaire: " + jobDef.baseHourlyWage.toFixed(2) + "$/h", icon: "💼" });
  sendChatMessage("📢 [RECRUTEMENT] " + playerName + " a été engagé comme " + jobDef.title + " !");
  netEmit("jobs:player_hired", { contract });
  return { success: true, message: "Félicitations ! Vous êtes maintenant embauché comme " + jobDef.title + ".", contract };
}

export function quitJob(playerId: string): { success: boolean; message: string } {
  const contract = CONTRACTS.get(playerId);
  if (!contract) return { success: false, message: "Vous n'avez aucun emploi actuellement." };
  if (contract.isOnDuty) clockOut(playerId);
  const oldTitle = contract.jobTitle;
  CONTRACTS.delete(playerId);
  triggerNotification(playerId, { title: "Démission confirmée", body: "Vous avez quitté votre poste de " + oldTitle + ".", icon: "📋" });
  netEmit("jobs:player_quit", { playerId, oldJobId: contract.jobId });
  return { success: true, message: "Vous avez remis votre démission de " + oldTitle + "." };
}

export function clockIn(playerId: string): { success: boolean; message: string; shift: WorkShift | null } {
  const contract = CONTRACTS.get(playerId);
  if (!contract) return { success: false, message: "Vous n'avez aucun emploi actif.", shift: null };
  if (contract.isOnDuty) return { success: false, message: "Vous êtes déjà en train de travailler.", shift: null };
  if (contract.cnesstActive) return { success: false, message: "Vous êtes en arrêt de travail payé par la CNESST !", shift: null };
  const shiftId = "SHIFT-" + Date.now().toString(36).toUpperCase();
  const shift: WorkShift = { shiftId, jobId: contract.jobId, startedAt: Date.now(), endedAt: null, hoursWorked: 0, overtimeHours: 0, tasksCompleted: 0, hazardsEncountered: 0, accumulatedPayGross: 0 };
  contract.isOnDuty = true;
  contract.activeShift = shift;
  ACTIVE_SHIFTS.set(shiftId, shift);
  triggerNotification(playerId, { title: "⏱️ Début de quart", body: "Vous avez poinçonné à " + new Date().toLocaleTimeString("fr-CA") + ".", icon: "🟢" });
  netEmit("jobs:clocked_in", { playerId, shift });
  return { success: true, message: "Quart de travail débuté pour " + contract.jobTitle + ". Bon quart !", shift };
}

export function clockOut(playerId: string): { success: boolean; message: string; payStub: PayStub | null } {
  const contract = CONTRACTS.get(playerId);
  if (!contract || !contract.isOnDuty || !contract.activeShift) return { success: false, message: "Vous n'êtes pas en service actuellement.", payStub: null };
  const shift = contract.activeShift;
  shift.endedAt = Date.now();
  const elapsedMinutes = Math.max(1, (shift.endedAt - shift.startedAt) / 60000);
  const hoursFraction = elapsedMinutes;
  const jobDef = JOB_CATALOG[contract.jobId];
  let regularHours = hoursFraction;
  let overtimeHours = 0;
  if (contract.hoursWorkedThisWeek + hoursFraction > 40) {
    const regularLeft = Math.max(0, 40 - contract.hoursWorkedThisWeek);
    regularHours = regularLeft;
    overtimeHours = hoursFraction - regularLeft;
  }
  shift.hoursWorked = hoursFraction;
  shift.overtimeHours = overtimeHours;
  const baseRate = contract.hourlyWage + jobDef.hazardPayBonus;
  const regularPay = regularHours * baseRate;
  const overtimePay = overtimeHours * (baseRate * jobDef.overtimeRateMultiplier);
  const grossTotal = Math.round((regularPay + overtimePay) * 100) / 100;
  shift.accumulatedPayGross = grossTotal;
  const deductions = { provincialTaxQC: Math.round(grossTotal * 0.14 * 100) / 100, federalTaxARC: Math.round(grossTotal * 0.15 * 100) / 100, rrqContribution: Math.round(grossTotal * 0.064 * 100) / 100, aeContribution: Math.round(grossTotal * 0.0163 * 100) / 100, rqapContribution: Math.round(grossTotal * 0.0049 * 100) / 100, unionDues: contract.unionMember ? Math.round(grossTotal * 0.015 * 100) / 100 : 0 };
  const totalDeductions = deductions.provincialTaxQC + deductions.federalTaxARC + deductions.rrqContribution + deductions.aeContribution + deductions.rqapContribution + deductions.unionDues;
  const netPay = Math.max(0, Math.round((grossTotal - totalDeductions) * 100) / 100);
  contract.hoursWorkedTotal += hoursFraction;
  contract.hoursWorkedThisWeek += hoursFraction;
  contract.careerEarningsTotal += netPay;
  contract.isOnDuty = false;
  contract.activeShift = null;
  triggerNotification(playerId, { title: "✅ Fin de quart", body: "Heures: " + hoursFraction.toFixed(1) + "h. Salaire accumulé : " + netPay.toFixed(2) + "$ nets.", icon: "⏱️" });
  netEmit("jobs:clocked_out", { playerId, shift });
  return { success: true, message: "Fin de quart ! Salaire accumulé : " + netPay.toFixed(2) + "$ nets.", payStub: null };
}

export function applyForUnemploymentBenefits(playerId: string): { success: boolean; message: string; claim: UnemploymentBenefit | null } {
  return { success: true, message: "Prestations de chômage actives.", claim: null };
}

export function reportWorkplaceInjury(playerId: string, injuryDescription: string, severityDamage: number): { success: boolean; claim: CnesstClaim | null; message: string } {
  modifyHealth(-severityDamage, playerId);
  return { success: true, message: "Réclamation CNESST envoyée.", claim: null };
}

export function takeCertificationCourse(playerId: string, playerName: string, certId: CertificationType): { success: boolean; message: string } {
  const certDef = CERTIFICATION_CATALOG[certId];
  if (!certDef) return { success: false, message: "Formation introuvable." };
  let contract = CONTRACTS.get(playerId);
  if (!contract) {
    contract = { playerId, playerName, jobId: "commis_depanneur", jobTitle: "Sans emploi", hourlyWage: 0, hiredAt: Date.now(), hoursWorkedTotal: 0, hoursWorkedThisWeek: 0, careerEarningsTotal: 0, reputationScore: 50, certificationsObtained: [], unionMember: false, isOnDuty: false, activeShift: null, cnesstActive: false };
    CONTRACTS.set(playerId, contract);
  }
  if (contract.certificationsObtained.includes(certId)) return { success: false, message: "Vous possédez déjà ce certificat !" };
  const acct = getAccount(playerId);
  if (!acct || acct.balance < certDef.costCAD) return { success: false, message: "Fonds insuffisants (" + certDef.costCAD + "$)." };
  removeCash(certDef.costCAD, playerId);
  contract.certificationsObtained.push(certId);
  triggerNotification(playerId, { title: "🎓 Diplôme obtenu !", body: certDef.title, icon: "📜" });
  netEmit("jobs:cert_obtained", { playerId, certId });
  return { success: true, message: "Certificat obtenu : " + certDef.title + " !" };
}

export function generateGigBoard(): GigOffer[] {
  const gigs: GigOffer[] = [
    { id: "gig_divan", title: "Déménagement de meuble lourd", description: "Monter un divan au 3e étage.", locationName: "Pont-Rouge", position: { x: -22, z: 16 }, payCash: 60, durationMinutes: 2, hazardRisk: 10, reputationGain: 2 },
    { id: "gig_pelleter", title: "Pelleter une entrée", description: "Dégager 30 cm de neige lourde.", locationName: "Donnacona", position: { x: 40, z: -28 }, payCash: 75, durationMinutes: 3, hazardRisk: 15, reputationGain: 4 }
  ];
  gigs.forEach((g) => ACTIVE_GIGS.set(g.id, g));
  return gigs;
}

export function completeGig(playerId: string, gigId: string): { success: boolean; message: string; payCash: number } {
  const gig = ACTIVE_GIGS.get(gigId);
  if (!gig) return { success: false, message: "Ce contrat n'est plus disponible.", payCash: 0 };
  if (Math.random() < gig.hazardRisk / 100) {
    modifyHealth(-15, playerId);
    sendPrivateMessage(playerId, "⚠️ Vous vous êtes fait un tour de rein pendant le boulot !");
  }
  addCash(gig.payCash, playerId);
  ACTIVE_GIGS.delete(gigId);
  triggerNotification(playerId, { title: "💵 Payé comptant !", body: gig.title + " terminé. +" + gig.payCash + "$ en liquide.", icon: "🤝" });
  netEmit("jobs:gig_completed", { playerId, gigId, payCash: gig.payCash });
  return { success: true, message: "Boulot terminé ! Vous touchez " + gig.payCash + "$ en liquide.", payCash: gig.payCash };
}

export function getCurrentJob(playerId: string): JobDefinition | null {
  const contract = CONTRACTS.get(playerId);
  if (!contract) return null;
  return JOB_CATALOG[contract.jobId] ?? null;
}

export function getPlayerContract(playerId: string): EmployeeContract | null {
  return CONTRACTS.get(playerId) ?? null;
}

export function getAllActiveWorkers(): EmployeeContract[] {
  return Array.from(CONTRACTS.values()).filter((c) => c.isOnDuty);
}

export function resetWeeklyHours(): void {
  for (const contract of CONTRACTS.values()) {
    contract.hoursWorkedThisWeek = 0;
  }
}

registerRemote("jobs:apply", applyForJob);
registerRemote("jobs:quit", quitJob);
registerRemote("jobs:clock_in", clockIn);
registerRemote("jobs:clock_out", clockOut);
registerRemote("jobs:report_injury", reportWorkplaceInjury);
registerRemote("jobs:apply_unemployment", applyForUnemploymentBenefits);
registerRemote("jobs:take_course", takeCertificationCourse);
registerRemote("jobs:complete_gig", completeGig);

export function rollBoard(): GigOffer[] { return generateGigBoard(); }

// ═══════════════════════════════════════════════════════════
// TYPES LEGACY HAUL (Compatibilité)
// ═══════════════════════════════════════════════════════════
export type HaulKind = "delivery" | "construction" | "moving" | "garbage" | "fuel" | "food" | "furniture" | "camionneur_lourd" | "laitier" | "siropier" | "deblayeur_neige" | "taxi";
export interface HaulLocation { x: number; z: number; name?: string; }
export interface HaulJob {
  id: string; kind: HaulKind; title: string; from: HaulLocation; to: HaulLocation;
  reward: number; pay: number; cargoKg: number; weightKg: number;
  loaded: boolean; dangerousGoods: boolean; perishable: boolean;
}