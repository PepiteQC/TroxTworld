/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈME RP COMPLET — JOBS, CRIMES, GANGS, PROPRIÉTÉS (v2.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - 28 métiers (vs 15) avec progression de carrière
 *  - 20+ propriétés (vs 8) incluant locations et terrains
 *  - 6 gangs avec hiérarchie et réputation
 *  - 12 crimes avec niveaux de difficulté
 *  - Système de casier judiciaire
 *  - Permis et licences
 *  - Assurances
 *  - Prêts sur gage
 *  - Système de heat/recherche
 *  - Événements dynamiques
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { VILLAGES } from "./worlddata";

// ═══════════════════════════════════════════════════════════
// FISCALITÉ QUÉBÉCOISE
// ═══════════════════════════════════════════════════════════

export const TPS_RATE = 0.05;
export const TVQ_RATE = 0.09975;
export const QC_TAX = TPS_RATE + TVQ_RATE;

// Taux de cotisations sociales
export const RRQ_RATE = 0.064; // Régie des rentes
export const RQAP_RATE = 0.00494; // Régime québécois d'assurance parentale
export const ASSURANCE_EMPLOI_RATE = 0.0163;
export const IMPOT_FEDERAL_RATE = 0.15;
export const IMPOT_PROVINCIAL_RATE = 0.15;

export interface TaxBreakdown {
  subtotal: number;
  tps: number;
  tvq: number;
  totalTax: number;
  total: number;
}

export function withTax(price: number): TaxBreakdown {
  const subtotal = Math.max(0, price);
  const tps = Math.round(subtotal * TPS_RATE * 100) / 100;
  const tvq = Math.round(subtotal * TVQ_RATE * 100) / 100;
  const totalTax = Math.round((tps + tvq) * 100) / 100;
  const total = Math.round((subtotal + totalTax) * 100) / 100;
  return { subtotal, tps, tvq, totalTax, total };
}

/**
 * Calcul des déductions salariales québécoises complètes.
 */
export function calculatePayrollDeductions(grossSalary: number): {
  gross: number;
  rrq: number;
  rqap: number;
  assuranceEmploi: number;
  impotFederal: number;
  impotProvincial: number;
  totalDeductions: number;
  net: number;
} {
  const rrq = Math.round(grossSalary * RRQ_RATE * 100) / 100;
  const rqap = Math.round(grossSalary * RQAP_RATE * 100) / 100;
  const assuranceEmploi = Math.round(grossSalary * ASSURANCE_EMPLOI_RATE * 100) / 100;
  
  // Impôt progressif simplifié
  const impotFederal = grossSalary > 53359
    ? Math.round((grossSalary * IMPOT_FEDERAL_RATE + (grossSalary - 53359) * 0.05) * 100) / 100
    : Math.round(grossSalary * IMPOT_FEDERAL_RATE * 100) / 100;
  
  const impotProvincial = grossSalary > 49275
    ? Math.round((grossSalary * IMPOT_PROVINCIAL_RATE + (grossSalary - 49275) * 0.04) * 100) / 100
    : Math.round(grossSalary * IMPOT_PROVINCIAL_RATE * 100) / 100;
  
  const totalDeductions = rrq + rqap + assuranceEmploi + impotFederal + impotProvincial;
  const net = Math.max(1, Math.round((grossSalary - totalDeductions) * 100) / 100);
  
  return {
    gross: grossSalary,
    rrq,
    rqap,
    assuranceEmploi,
    impotFederal,
    impotProvincial,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    net,
  };
}

// ═══════════════════════════════════════════════════════════
// TYPES — EMPLOIS RP
// ═══════════════════════════════════════════════════════════

export type RpJobCategory = 
  | "service_public" 
  | "sante" 
  | "education"
  | "industrie" 
  | "commerce" 
  | "transport"
  | "justice" 
  | "clandestin"
  | "agriculture"
  | "construction";

export type RpJobId =
  | "civil"
  // Service public
  | "policier_sq"
  | "paramedic"
  | "pompier"
  | "monteur_hydro"
  | "agent_correctionnel"
  | "garde_parcs"
  // Santé
  | "medecin_omnipraticien"
  | "infirmier"
  | "pharmacien"
  | "prepose_beneficiaires"
  // Éducation
  | "enseignant_primaire"
  | "enseignant_secondaire"
  | "professeur_cegep"
  // Industrie
  | "mecanicien"
  | "bucheron"
  | "operateur_usine"
  | "soudeur"
  | "electricien"
  | "plombier"
  | "journalier_ccq"
  // Transport
  | "camionneur"
  | "taxi_rural"
  | "chauffeur_autobus"
  | "livreur"
  // Agriculture
  | "agriculteur"
  | "producteur_laitier"
  | "pecheur_artisan"
  | "apiculteur"
  | "acériculteur"
  // Commerce
  | "commis_depanneur"
  | "serveur_restaurant"
  | "cuisinier"
  | "coiffeur"
  | "boucher"
  | "boulanger"
  // Justice
  | "avocat_notaire"
  | "huissier"
  | "agent_immobilier"
  // Construction
  | "charpentier"
  | "machiniste"
  | "grutier"
  // Clandestin
  | "independant_clandestin"
  | "bookmaker"
  | "preteur_gage";

export interface RpJobDef {
  id: RpJobId;
  name: string;
  category: RpJobCategory;
  salary: number; // Hebdomadaire brut
  gradeTitle: string;
  unionized: boolean;
  employerName: string;
  hint: string;
  
  // ── NOUVEAU v2.0 ──
  minEducation?: "none" | "des" | "dep" | "dec" | "bacc" | "maitrise" | "doctorat";
  requiredLicense?: string;
  hazardPay?: number; // Prime de risque
  nightDifferential?: number; // Prime de nuit (%)
  overtimeRate?: number; // Taux heures supp (1.5x)
  pensionPlan?: boolean;
  benefits?: string[];
  careerPath?: RpJobId[]; // Progression possible
  stressLevel?: number; // 1-10
  physicalDemand?: number; // 1-10
}

export const RP_JOBS: RpJobDef[] = [
  // ═══ CIVIL ═══
  { 
    id: "civil", name: "Citoyen / En recherche d'emploi", category: "commerce", 
    salary: 320, gradeTitle: "Résident", unionized: false, 
    employerName: "Aide à l'emploi Portneuf", 
    hint: "Prestation de base.",
    minEducation: "none",
    stressLevel: 4,
    physicalDemand: 2,
  },
  
  // ═══ SERVICE PUBLIC ═══
  { 
    id: "policier_sq", name: "Agent de la Paix (SQ)", category: "service_public", 
    salary: 1350, gradeTitle: "Agent patrouilleur", unionized: true, 
    employerName: "Sûreté du Québec", 
    hint: "Patrouille de la 138 et de l'A-40.",
    minEducation: "dec",
    requiredLicense: "permis_arme_force_ordre",
    hazardPay: 150,
    nightDifferential: 0.15,
    overtimeRate: 1.5,
    pensionPlan: true,
    benefits: ["Assurance dentaire", "Assurance médicaments", "Congés payés"],
    careerPath: ["policier_sq"],
    stressLevel: 8,
    physicalDemand: 7,
  },
  { 
    id: "paramedic", name: "Technicien ambulancier paramédic", category: "sante", 
    salary: 1250, gradeTitle: "Paramédic de soins primaires", unionized: true, 
    employerName: "CTAQ Portneuf", 
    hint: "Interventions d'urgence 911.",
    minEducation: "dec",
    requiredLicense: "permis_conduire_4b",
    hazardPay: 100,
    nightDifferential: 0.20,
    overtimeRate: 1.5,
    pensionPlan: true,
    benefits: ["Assurance complète", "Formation continue"],
    stressLevel: 9,
    physicalDemand: 8,
  },
  { 
    id: "pompier", name: "Pompier de sécurité civile", category: "service_public", 
    salary: 1100, gradeTitle: "Pompier 1", unionized: true, 
    employerName: "Régie intermunicipale", 
    hint: "Combats d'incendies de grange.",
    minEducation: "des",
    requiredLicense: "permis_conduire_4b",
    hazardPay: 120,
    nightDifferential: 0.10,
    overtimeRate: 2.0,
    pensionPlan: true,
    benefits: ["Assurance vie", "Régime retraite"],
    stressLevel: 9,
    physicalDemand: 9,
  },
  { 
    id: "monteur_hydro", name: "Monteur de lignes (Hydro-Québec)", category: "industrie", 
    salary: 1400, gradeTitle: "Monteur de lignes classe 1", unionized: true, 
    employerName: "Hydro-Québec Mauricie", 
    hint: "Rétablissement de pannes.",
    minEducation: "dep",
    requiredLicense: "permis_travail_hauteur",
    hazardPay: 200,
    overtimeRate: 2.0,
    pensionPlan: true,
    benefits: ["Fonds de pension", "Assurance invalidité"],
    stressLevel: 7,
    physicalDemand: 9,
  },
  { 
    id: "agent_correctionnel", name: "Agent de services correctionnels", category: "service_public", 
    salary: 1050, gradeTitle: "Agent de détention", unionized: true, 
    employerName: "Établissement de Donnacona", 
    hint: "Surveillance des détenus.",
    minEducation: "dec",
    hazardPay: 100,
    nightDifferential: 0.15,
    pensionPlan: true,
    benefits: ["Assurance complète"],
    stressLevel: 8,
    physicalDemand: 6,
  },
  { 
    id: "garde_parcs", name: "Garde-parc (SEPAQ)", category: "service_public", 
    salary: 780, gradeTitle: "Patrouilleur de sentier", unionized: true, 
    employerName: "Parc national de la Jacques-Cartier", 
    hint: "Protection de la faune et flore.",
    minEducation: "dec",
    requiredLicense: "permis_chasse",
    benefits: ["Accès gratuit aux parcs"],
    stressLevel: 3,
    physicalDemand: 7,
  },
  
  // ═══ SANTÉ ═══
  { 
    id: "medecin_omnipraticien", name: "Médecin de famille", category: "sante", 
    salary: 2800, gradeTitle: "Docteur en médecine", unionized: false, 
    employerName: "GMF de Portneuf", 
    hint: "Clinique médicale générale.",
    minEducation: "doctorat",
    requiredLicense: "permis_pratique_medecine",
    pensionPlan: true,
    benefits: ["Assurance responsabilité"],
    stressLevel: 8,
    physicalDemand: 4,
  },
  { 
    id: "infirmier", name: "Infirmier(ère) autorisé(e)", category: "sante", 
    salary: 1100, gradeTitle: "Infirmier clinicien", unionized: true, 
    employerName: "CIUSSS de la Capitale-Nationale", 
    hint: "Soins hospitaliers et communautaires.",
    minEducation: "bacc",
    requiredLicense: "permis_oiiq",
    nightDifferential: 0.20,
    overtimeRate: 1.75,
    pensionPlan: true,
    benefits: ["Assurance complète", "Congés maladie"],
    careerPath: ["infirmier", "medecin_omnipraticien"],
    stressLevel: 8,
    physicalDemand: 6,
  },
  { 
    id: "pharmacien", name: "Pharmacien(ne)", category: "sante", 
    salary: 1800, gradeTitle: "Pharmacien communautaire", unionized: false, 
    employerName: "Pharmacie Jean Coutu Portneuf", 
    hint: "Dispensation d'ordonnances.",
    minEducation: "doctorat",
    requiredLicense: "permis_opq",
    benefits: ["Rabais médicaments"],
    stressLevel: 5,
    physicalDemand: 3,
  },
  { 
    id: "prepose_beneficiaires", name: "Préposé aux bénéficiaires", category: "sante", 
    salary: 720, gradeTitle: "PAB certifié", unionized: true, 
    employerName: "CHSLD de Donnacona", 
    hint: "Soins aux personnes âgées.",
    minEducation: "dep",
    nightDifferential: 0.15,
    pensionPlan: true,
    stressLevel: 7,
    physicalDemand: 8,
  },
  
  // ═══ ÉDUCATION ═══
  { 
    id: "enseignant_primaire", name: "Enseignant au primaire", category: "education", 
    salary: 950, gradeTitle: "Professeur titulaire", unionized: true, 
    employerName: "Centre de services scolaire de Portneuf", 
    hint: "Éducation des 6-12 ans.",
    minEducation: "bacc",
    requiredLicense: "brevet_enseignement",
    pensionPlan: true,
    benefits: ["Congés scolaires", "Assurance collective"],
    stressLevel: 6,
    physicalDemand: 4,
  },
  { 
    id: "enseignant_secondaire", name: "Enseignant au secondaire", category: "education", 
    salary: 1020, gradeTitle: "Professeur de matière", unionized: true, 
    employerName: "Polyvalente de Portneuf", 
    hint: "Éducation des 12-17 ans.",
    minEducation: "bacc",
    requiredLicense: "brevet_enseignement",
    pensionPlan: true,
    benefits: ["Congés scolaires", "Assurance collective"],
    stressLevel: 7,
    physicalDemand: 4,
  },
  { 
    id: "professeur_cegep", name: "Professeur de cégep", category: "education", 
    salary: 1350, gradeTitle: "Chargé de cours", unionized: true, 
    employerName: "Cégep de Limoilou - Campus Portneuf", 
    hint: "Enseignement collégial.",
    minEducation: "maitrise",
    pensionPlan: true,
    benefits: ["Recherche subventionnée"],
    stressLevel: 5,
    physicalDemand: 3,
  },
  
  // ═══ INDUSTRIE ═══
  { 
    id: "mecanicien", name: "Mécanicien d'équipements", category: "industrie", 
    salary: 980, gradeTitle: "Compagnon mécanicien", unionized: false, 
    employerName: "Garage Gosselin & Fils", 
    hint: "Inspections SAAQ et pneus d'hiver.",
    minEducation: "dep",
    requiredLicense: "permis_mecanicien",
    overtimeRate: 1.5,
    stressLevel: 5,
    physicalDemand: 7,
  },
  { 
    id: "bucheron", name: "Opérateur forestier", category: "industrie", 
    salary: 920, gradeTitle: "Abatteur-tronçonneur", unionized: false, 
    employerName: "Exploitation Forestière Portneuf", 
    hint: "Coupe de bois résineux.",
    minEducation: "dep",
    requiredLicense: "permis_chaine",
    hazardPay: 80,
    benefits: ["Botte et chandail fournis"],
    stressLevel: 6,
    physicalDemand: 9,
  },
  { 
    id: "operateur_usine", name: "Opérateur de production", category: "industrie", 
    salary: 850, gradeTitle: "Opérateur classe B", unionized: true, 
    employerName: "Papaterie Résolu Donnacona", 
    hint: "Production de pâte et papier.",
    minEducation: "des",
    nightDifferential: 0.15,
    pensionPlan: true,
    stressLevel: 5,
    physicalDemand: 6,
  },
  { 
    id: "soudeur", name: "Soudeur-monteur", category: "industrie", 
    salary: 1050, gradeTitle: "Soudeur certifié CWB", unionized: true, 
    employerName: "Acier Portneuf Inc.", 
    hint: "Soudure industrielle et structurale.",
    minEducation: "dep",
    requiredLicense: "permis_soudure_cwb",
    hazardPay: 60,
    overtimeRate: 1.5,
    stressLevel: 5,
    physicalDemand: 7,
  },
  { 
    id: "electricien", name: "Électricien(ne)", category: "construction", 
    salary: 1150, gradeTitle: "Électricien compagnon", unionized: true, 
    employerName: "Électricité Portneuf CMEQ", 
    hint: "Installation et réparation électrique.",
    minEducation: "dep",
    requiredLicense: "permis_cmeq",
    overtimeRate: 1.5,
    pensionPlan: true,
    stressLevel: 5,
    physicalDemand: 6,
  },
  { 
    id: "plombier", name: "Plombier(ère)", category: "construction", 
    salary: 1080, gradeTitle: "Plombier certifié CMMTQ", unionized: true, 
    employerName: "Plomberie du Comté", 
    hint: "Tuyauterie résidentielle et commerciale.",
    minEducation: "dep",
    requiredLicense: "permis_cmmtq",
    overtimeRate: 1.5,
    pensionPlan: true,
    stressLevel: 5,
    physicalDemand: 6,
  },
  { 
    id: "journalier_ccq", name: "Ouvrier de chantier (CCQ)", category: "construction", 
    salary: 1150, gradeTitle: "Apprenti CCQ", unionized: true, 
    employerName: "Chantiers de voirie", 
    hint: "Réfection d'asphalte et de ponts.",
    minEducation: "dep",
    requiredLicense: "carte_ccq",
    overtimeRate: 2.0,
    pensionPlan: true,
    benefits: ["Fonds de vacances CCQ"],
    stressLevel: 5,
    physicalDemand: 8,
  },
  
  // ═══ TRANSPORT ═══
  { 
    id: "camionneur", name: "Chauffeur poids lourd (Classe 1)", category: "transport", 
    salary: 1050, gradeTitle: "Routier longue distance", unionized: false, 
    employerName: "Transport Vrac Portneuf", 
    hint: "Convois de 53 pieds sur la 40.",
    minEducation: "dep",
    requiredLicense: "permis_classe_1",
    benefits: ["Per diem route"],
    stressLevel: 6,
    physicalDemand: 5,
  },
  { 
    id: "taxi_rural", name: "Chauffeur de taxi", category: "transport", 
    salary: 720, gradeTitle: "Chauffeur autorisé CTQ", unionized: false, 
    employerName: "Taxi Régional du Comté", 
    hint: "Navettes entre les villages.",
    minEducation: "des",
    requiredLicense: "permis_taxi",
    stressLevel: 5,
    physicalDemand: 4,
  },
  { 
    id: "chauffeur_autobus", name: "Chauffeur d'autobus scolaire", category: "transport", 
    salary: 650, gradeTitle: "Chauffeur agréé", unionized: true, 
    employerName: "Transport scolaire Portneuf", 
    hint: "Transport des écoliers.",
    minEducation: "des",
    requiredLicense: "permis_classe_2",
    pensionPlan: true,
    benefits: ["Congés scolaires"],
    stressLevel: 5,
    physicalDemand: 4,
  },
  { 
    id: "livreur", name: "Livreur de colis", category: "transport", 
    salary: 680, gradeTitle: "Coursier régional", unionized: false, 
    employerName: "Livraison Express Portneuf", 
    hint: "Distribution de colis et repas.",
    minEducation: "none",
    requiredLicense: "permis_classe_5",
    stressLevel: 5,
    physicalDemand: 7,
  },
  
  // ═══ AGRICULTURE ═══
  { 
    id: "agriculteur", name: "Producteur agricole", category: "agriculture", 
    salary: 850, gradeTitle: "Exploitant", unionized: false, 
    employerName: "UPA Portneuf", 
    hint: "Culture maraîchère et céréalière.",
    minEducation: "dep",
    benefits: ["Subventions MAPAQ"],
    stressLevel: 6,
    physicalDemand: 8,
  },
  { 
    id: "producteur_laitier", name: "Producteur laitier", category: "agriculture", 
    salary: 920, gradeTitle: "Fermier laitier", unionized: false, 
    employerName: "Fédération des producteurs de lait", 
    hint: "Gestion du troupeau Holstein.",
    minEducation: "dep",
    benefits: ["Quota laitier"],
    stressLevel: 6,
    physicalDemand: 8,
  },
  { 
    id: "pecheur_artisan", name: "Pêcheur fluvial", category: "agriculture", 
    salary: 760, gradeTitle: "Capitaine-artisan", unionized: false, 
    employerName: "Pêcheries du St-Laurent", 
    hint: "Esturgeon, doré, perchaude.",
    minEducation: "none",
    requiredLicense: "permis_peche_commerciale",
    stressLevel: 5,
    physicalDemand: 7,
  },
  { 
    id: "apiculteur", name: "Apiculteur", category: "agriculture", 
    salary: 680, gradeTitle: "Éleveur d'abeilles", unionized: false, 
    employerName: "Miellerie de Portneuf", 
    hint: "Production de miel et pollen.",
    minEducation: "none",
    stressLevel: 4,
    physicalDemand: 6,
  },
  { 
    id: "acériculteur", name: "Acériculteur", category: "agriculture", 
    salary: 780, gradeTitle: "Producteur de sirop d'érable", unionized: false, 
    employerName: "FPAQ Portneuf", 
    hint: "Entaillage et bouilleur.",
    minEducation: "none",
    benefits: ["Quota sirop d'érable"],
    stressLevel: 4,
    physicalDemand: 7,
  },
  
  // ═══ COMMERCE ═══
  { 
    id: "commis_depanneur", name: "Commis de dépanneur", category: "commerce", 
    salary: 620, gradeTitle: "Gérant de comptoir", unionized: false, 
    employerName: "Dépanneur Le Relais", 
    hint: "Vente de loto, tabac et bière.",
    minEducation: "none",
    stressLevel: 4,
    physicalDemand: 5,
  },
  { 
    id: "serveur_restaurant", name: "Serveur(se) de restaurant", category: "commerce", 
    salary: 480, gradeTitle: "Serveur(se) expérimenté(e)", unionized: false, 
    employerName: "Restaurant Le Vieux Quai", 
    hint: "Service à table + pourboires.",
    minEducation: "none",
    benefits: ["Pourboires", "Repas gratuit"],
    stressLevel: 6,
    physicalDemand: 6,
  },
  { 
    id: "cuisinier", name: "Cuisinier(ère)", category: "commerce", 
    salary: 720, gradeTitle: "Chef de partie", unionized: false, 
    employerName: "Auberge du Manoir", 
    hint: "Cuisine gastronomique régionale.",
    minEducation: "dep",
    requiredLicense: "certificat_salubrite",
    overtimeRate: 1.5,
    stressLevel: 7,
    physicalDemand: 7,
  },
  { 
    id: "coiffeur", name: "Coiffeur(se)", category: "commerce", 
    salary: 650, gradeTitle: "Styliste coiffeur", unionized: false, 
    employerName: "Salon Élégance Portneuf", 
    hint: "Coupes et colorations.",
    minEducation: "dep",
    requiredLicense: "permis_coiffure",
    stressLevel: 4,
    physicalDemand: 5,
  },
  { 
    id: "boucher", name: "Boucher(ère)", category: "commerce", 
    salary: 780, gradeTitle: "Boucher détaillant", unionized: false, 
    employerName: "Boucherie du Terroir", 
    hint: "Découpe de viandes locales.",
    minEducation: "dep",
    stressLevel: 4,
    physicalDemand: 7,
  },
  { 
    id: "boulanger", name: "Boulanger(ère)", category: "commerce", 
    salary: 700, gradeTitle: "Artisan boulanger", unionized: false, 
    employerName: "Boulangerie St-Amour", 
    hint: "Pains artisanaux au levain.",
    minEducation: "dep",
    stressLevel: 5,
    physicalDemand: 6,
  },
  
  // ═══ JUSTICE ═══
  { 
    id: "avocat_notaire", name: "Avocat / Notaire", category: "justice", 
    salary: 1650, gradeTitle: "Maître du Barreau", unionized: false, 
    employerName: "Étude Notariale du Palais", 
    hint: "Contentieux TAL et actes notariés.",
    minEducation: "maitrise",
    requiredLicense: "permis_barreau",
    stressLevel: 7,
    physicalDemand: 2,
  },
  { 
    id: "huissier", name: "Huissier de justice", category: "justice", 
    salary: 950, gradeTitle: "Huissier agréé", unionized: false, 
    employerName: "Huissiers Associés Portneuf", 
    hint: "Signification et saisies.",
    minEducation: "dec",
    requiredLicense: "permis_huissier",
    stressLevel: 6,
    physicalDemand: 5,
  },
  { 
    id: "agent_immobilier", name: "Courtier immobilier", category: "commerce", 
    salary: 1100, gradeTitle: "Courtier agréé OACIQ", unionized: false, 
    employerName: "Via Capitale Portneuf", 
    hint: "Vente de propriétés.",
    minEducation: "dec",
    requiredLicense: "permis_oaciq",
    benefits: ["Commission sur ventes"],
    stressLevel: 6,
    physicalDemand: 4,
  },
  
  // ═══ CONSTRUCTION ═══
  { 
    id: "charpentier", name: "Charpentier-menuisier", category: "construction", 
    salary: 1050, gradeTitle: "Compagnon CCQ", unionized: true, 
    employerName: "Construction Bois Franc", 
    hint: "Charpente et finition.",
    minEducation: "dep",
    requiredLicense: "carte_ccq",
    overtimeRate: 1.5,
    pensionPlan: true,
    stressLevel: 5,
    physicalDemand: 8,
  },
  { 
    id: "machiniste", name: "Machiniste CNC", category: "industrie", 
    salary: 1100, gradeTitle: "Opérateur CNC classe A", unionized: true, 
    employerName: "Usinage Précision Portneuf", 
    hint: "Usinage de pièces aéronautiques.",
    minEducation: "dep",
    overtimeRate: 1.5,
    pensionPlan: true,
    stressLevel: 5,
    physicalDemand: 5,
  },
  { 
    id: "grutier", name: "Grutier", category: "construction", 
    salary: 1250, gradeTitle: "Opérateur de grue", unionized: true, 
    employerName: "Grues du Comté", 
    hint: "Manutention de charges lourdes.",
    minEducation: "dep",
    requiredLicense: "permis_grue",
    hazardPay: 80,
    overtimeRate: 2.0,
    pensionPlan: true,
    stressLevel: 6,
    physicalDemand: 5,
  },
  
  // ═══ CLANDESTIN ═══
  { 
    id: "independant_clandestin", name: "Sans emploi déclaré", category: "clandestin", 
    salary: 0, gradeTitle: "Affranchi", unionized: false, 
    employerName: "Économie souterraine", 
    hint: "Aucune retenue à la source.",
    stressLevel: 7,
    physicalDemand: 5,
  },
  { 
    id: "bookmaker", name: "Bookmaker", category: "clandestin", 
    salary: 0, gradeTitle: "Preneur de paris", unionized: false, 
    employerName: "Réseau sportif clandestin", 
    hint: "Paris sur hockey et courses.",
    stressLevel: 8,
    physicalDemand: 2,
  },
  { 
    id: "preteur_gage", name: "Prêteur sur gage", category: "clandestin", 
    salary: 0, gradeTitle: "Usurier", unionized: false, 
    employerName: "Cash Express", 
    hint: "Prêts à taux usuraires.",
    stressLevel: 7,
    physicalDemand: 3,
  },
];

// ═══════════════════════════════════════════════════════════
// PROPRIÉTÉS IMMOBILIÈRES
// ═══════════════════════════════════════════════════════════

export type PropertyType = 
  | "maison_ancestrale" 
  | "chalet_bois" 
  | "bungalow" 
  | "loft_industriel" 
  | "fermette" 
  | "domaine"
  | "appartement"
  | "condo"
  | "terrain_vacant"
  | "commerce"
  | "multiplex";

export interface Deed {
  id: string;
  cadastre: string;
  name: string;
  type: PropertyType;
  town: string;
  price: number;
  municipalTaxYear: number;
  hydroEstimatedBill: number;
  x: number;
  z: number;
  description: string;
  
  // ── NOUVEAU v2.0 ──
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number; // en pieds carrés
  yearBuilt?: number;
  garageSpaces?: number;
  features?: string[];
  forRent?: boolean;
  monthlyRent?: number;
}

function townCenter(id: string): [number, number] {
  const v = VILLAGES.find((t) => t.id === id);
  return v ? [v.center[0], v.center[1]] : [0, 0];
}

export const DEEDS: Deed[] = [
  // ═══ MAISONS ANCESTRAL ═══
  { 
    id: "H-PNF-01", cadastre: "LOT-482-PNF", name: "Maison à mansarde du Chef-Lieu", 
    type: "maison_ancestrale", town: "Portneuf", price: 125000, 
    municipalTaxYear: 1420, hydroEstimatedBill: 165, 
    x: townCenter("portneuf")[0] - 28, z: townCenter("portneuf")[1] + 22, 
    description: "Demeure centenaire avec toit en tôle.",
    bedrooms: 3, bathrooms: 1, squareFeet: 1450, lotSize: 6500,
    yearBuilt: 1892, garageSpaces: 1,
    features: ["Toit en tôle", "Planchers bois franc", "Foyer au bois"],
  },
  { 
    id: "H-NVL-05", cadastre: "LOT-552-NVL", name: "Maison patrimoniale de Neuville", 
    type: "maison_ancestrale", town: "Neuville", price: 172000, 
    municipalTaxYear: 1940, hydroEstimatedBill: 210, 
    x: townCenter("neuville")[0] - 22, z: townCenter("neuville")[1] + 16, 
    description: "Bâtisse au cachet Nouvelle-France.",
    bedrooms: 4, bathrooms: 2, squareFeet: 1850, lotSize: 8200,
    yearBuilt: 1845, garageSpaces: 2,
    features: ["Pierre des champs", "Fenêtres à guillotine", "Cave à légumes"],
  },
  
  // ═══ DOMAINES ═══
  { 
    id: "H-PTR-02", cadastre: "LOT-910-PTR", name: "Manoir en pierre de taille", 
    type: "domaine", town: "Pont-Rouge", price: 195000, 
    municipalTaxYear: 2180, hydroEstimatedBill: 240, 
    x: townCenter("pont_rouge")[0] + 36, z: townCenter("pont_rouge")[1] - 18, 
    description: "Propriété de prestige.",
    bedrooms: 5, bathrooms: 3, squareFeet: 2800, lotSize: 22000,
    yearBuilt: 1928, garageSpaces: 3,
    features: ["Piscine creusée", "Cave à vin", "Bureau bibliothèque"],
  },
  
  // ═══ LOFTS ═══
  { 
    id: "H-DNC-03", cadastre: "LOT-114-DNC", name: "Loft ouvrier de la Papeterie", 
    type: "loft_industriel", town: "Donnacona", price: 89000, 
    municipalTaxYear: 980, hydroEstimatedBill: 125, 
    x: townCenter("donnacona")[0] + 24, z: townCenter("donnacona")[1] + 18, 
    description: "Appartement en briques rouges.",
    bedrooms: 1, bathrooms: 1, squareFeet: 950,
    yearBuilt: 1952,
    features: ["Plafonds 12 pieds", "Poutres apparentes", "Briques exposées"],
  },
  
  // ═══ CHALETS ═══
  { 
    id: "H-SRY-04", cadastre: "LOT-733-SRY", name: "Chalet boréal du Lac Sept-Îles", 
    type: "chalet_bois", town: "Saint-Raymond", price: 148000, 
    municipalTaxYear: 1650, hydroEstimatedBill: 190, 
    x: townCenter("saint_raymond")[0] - 30, z: townCenter("saint_raymond")[1] + 20, 
    description: "Chalet en pin massif.",
    bedrooms: 3, bathrooms: 1, squareFeet: 1200, lotSize: 45000,
    yearBuilt: 1978, garageSpaces: 1,
    features: ["Accès au lac", "Quai privé", "Foyer extérieur"],
  },
  
  // ═══ FERMETTES ═══
  { 
    id: "H-CPS-06", cadastre: "LOT-628-CPS", name: "Fermette du Cap-Saint-Joseph", 
    type: "fermette", town: "Cap-Santé", price: 138000, 
    municipalTaxYear: 1510, hydroEstimatedBill: 180, 
    x: townCenter("cap_sante")[0] + 20, z: townCenter("cap_sante")[1] + 18, 
    description: "Lopin de terre agricole.",
    bedrooms: 3, bathrooms: 1, squareFeet: 1350, lotSize: 180000,
    yearBuilt: 1965, garageSpaces: 2,
    features: ["Grange", "Poulailler", "Potager"],
  },
  
  // ═══ BUNGALOWS ═══
  { 
    id: "H-DSC-07", cadastre: "LOT-309-DSC", name: "Bungalow de Deschambault", 
    type: "bungalow", town: "Deschambault", price: 105000, 
    municipalTaxYear: 1190, hydroEstimatedBill: 140, 
    x: townCenter("deschambault")[0] - 18, z: townCenter("deschambault")[1] + 20, 
    description: "Bungalow des années 70.",
    bedrooms: 3, bathrooms: 1, squareFeet: 1100, lotSize: 7500,
    yearBuilt: 1974, garageSpaces: 1,
    features: ["Sous-sol fini", "Cour clôturée"],
  },
  { 
    id: "H-SMC-08", cadastre: "LOT-201-SMC", name: "Pavillon des Carrières", 
    type: "bungalow", town: "Saint-Marc", price: 92000, 
    municipalTaxYear: 1020, hydroEstimatedBill: 130, 
    x: townCenter("saint_marc")[0] + 18, z: townCenter("saint_marc")[1] + 16, 
    description: "Habitation en pierre calcaire.",
    bedrooms: 2, bathrooms: 1, squareFeet: 980, lotSize: 5800,
    yearBuilt: 1968, garageSpaces: 1,
    features: ["Pierre calcaire locale", "Véranda"],
  },
  
  // ═══ NOUVEAU v2.0 : APPARTEMENTS ═══
  { 
    id: "A-PNF-09", cadastre: "LOT-118-PNF", name: "Appartement 4½ Centre-Ville", 
    type: "appartement", town: "Portneuf", price: 0, forRent: true, monthlyRent: 750,
    municipalTaxYear: 0, hydroEstimatedBill: 65, 
    x: townCenter("portneuf")[0] + 8, z: townCenter("portneuf")[1] - 12, 
    description: "4½ lumineux au cœur du village.",
    bedrooms: 2, bathrooms: 1, squareFeet: 780,
    yearBuilt: 1985,
    features: ["Balcon", "Stationnement inclus", "Buanderie"],
  },
  { 
    id: "A-DNC-10", cadastre: "LOT-225-DNC", name: "Appartement 3½ Donnacona", 
    type: "appartement", town: "Donnacona", price: 0, forRent: true, monthlyRent: 625,
    municipalTaxYear: 0, hydroEstimatedBill: 55, 
    x: townCenter("donnacona")[0] - 14, z: townCenter("donnacona")[1] + 8, 
    description: "3½ près du pont.",
    bedrooms: 1, bathrooms: 1, squareFeet: 580,
    yearBuilt: 1992,
    features: ["RDC", "Entrée laveuse/sécheuse"],
  },
  
  // ═══ NOUVEAU v2.0 : CONDOS ═══
  { 
    id: "C-PTR-11", cadastre: "LOT-445-PTR", name: "Condo Les Rives du Pont", 
    type: "condo", town: "Pont-Rouge", price: 165000, 
    municipalTaxYear: 1680, hydroEstimatedBill: 95, 
    x: townCenter("pont_rouge")[0] + 18, z: townCenter("pont_rouge")[1] + 24, 
    description: "Condo moderne avec vue sur la rivière.",
    bedrooms: 2, bathrooms: 1, squareFeet: 1050,
    yearBuilt: 2015, garageSpaces: 1,
    features: ["Gym commun", "Terrasse sur le toit", "Vue rivière"],
  },
  
  // ═══ NOUVEAU v2.0 : TERRAINS VACANTS ═══
  { 
    id: "T-SAL-12", cadastre: "LOT-890-SAL", name: "Terrain boisé Saint-Alban", 
    type: "terrain_vacant", town: "Saint-Alban", price: 45000, 
    municipalTaxYear: 380, hydroEstimatedBill: 0, 
    x: townCenter("saint_alban")[0] - 45, z: townCenter("saint_alban")[1] - 20, 
    description: "2 acres boisés, prêts à bâtir.",
    lotSize: 87120,
    features: ["Boisé mature", "Accès chemin public", "Non zoné agricole"],
  },
  { 
    id: "T-SRY-13", cadastre: "LOT-667-SRY", name: "Terrain riverain Lac Sept-Îles", 
    type: "terrain_vacant", town: "Saint-Raymond", price: 85000, 
    municipalTaxYear: 520, hydroEstimatedBill: 0, 
    x: townCenter("saint_raymond")[0] + 55, z: townCenter("saint_raymond")[1] + 40, 
    description: "Terrain avec 150 pieds de rivage.",
    lotSize: 43560,
    features: ["Accès au lac", "150 pieds de rivage", "Boisé mixte"],
  },
  
  // ═══ NOUVEAU v2.0 : COMMERCES ═══
  { 
    id: "COM-PNF-14", cadastre: "LOT-156-PNF", name: "Local commercial Route 138", 
    type: "commerce", town: "Portneuf", price: 225000, 
    municipalTaxYear: 2850, hydroEstimatedBill: 380, 
    x: townCenter("portneuf")[0] + 35, z: townCenter("portneuf")[1] - 8, 
    description: "Local commercial avec vitrine.",
    squareFeet: 1800, lotSize: 12000,
    yearBuilt: 1988,
    features: ["Vitrine sur la 138", "Stationnement 8 places", "Quai de chargement"],
  },
  
  // ═══ NOUVEAU v2.0 : MULTIPLEX ═══
  { 
    id: "M-DNC-15", cadastre: "LOT-334-DNC", name: "Triplex Donnacona Centre", 
    type: "multiplex", town: "Donnacona", price: 285000, 
    municipalTaxYear: 3200, hydroEstimatedBill: 420, 
    x: townCenter("donnacona")[0] + 16, z: townCenter("donnacona")[1] - 22, 
    description: "Triplex avec revenus locatifs.",
    bedrooms: 6, bathrooms: 3, squareFeet: 2400, lotSize: 6800,
    yearBuilt: 1962,
    features: ["3 logements 3½", "Revenus locatifs", "Cour arrière"],
  },
  { 
    id: "M-PTR-16", cadastre: "LOT-512-PTR", name: "Sixplex Pont-Rouge", 
    type: "multiplex", town: "Pont-Rouge", price: 425000, 
    municipalTaxYear: 4800, hydroEstimatedBill: 580, 
    x: townCenter("pont_rouge")[0] - 28, z: townCenter("pont_rouge")[1] + 12, 
    description: "Immeuble à revenus 6 logements.",
    bedrooms: 12, bathrooms: 6, squareFeet: 4200, lotSize: 9500,
    yearBuilt: 1975,
    features: ["6 logements", "Garage 4 places", "Buanderie commune"],
  },
  
  // ═══ AUTRES PROPRIÉTÉS ═══
  { 
    id: "H-GND-17", cadastre: "LOT-423-GND", name: "Maison de campagne Grondines", 
    type: "maison_ancestrale", town: "Grondines", price: 115000, 
    municipalTaxYear: 1280, hydroEstimatedBill: 155, 
    x: townCenter("grondines")[0] - 15, z: townCenter("grondines")[1] + 25, 
    description: "Maison rurale avec cachet.",
    bedrooms: 3, bathrooms: 1, squareFeet: 1280, lotSize: 12000,
    yearBuilt: 1935, garageSpaces: 1,
    features: ["Toit en bardeau", "Galerie couverte"],
  },
  { 
    id: "H-SCM-18", cadastre: "LOT-278-SCM", name: "Cottage Saint-Casimir", 
    type: "chalet_bois", town: "Saint-Casimir", price: 98000, 
    municipalTaxYear: 1120, hydroEstimatedBill: 145, 
    x: townCenter("saint_casimir")[0] + 32, z: townCenter("saint_casimir")[1] - 18, 
    description: "Petit chalet en forêt.",
    bedrooms: 2, bathrooms: 1, squareFeet: 850, lotSize: 35000,
    yearBuilt: 1982,
    features: ["Poêle à bois", "Sentiers de randonnée"],
  },
];

// ═══════════════════════════════════════════════════════════
// GUICHETS AUTOMATIQUES
// ═══════════════════════════════════════════════════════════

export interface AtmSpot {
  id: string;
  name: string;
  network?: "desjardins" | "banque_nationale" | "interac_prive" | "scotiabank" | "rbc";
  feePerTransaction?: number;
  x: number;
  z: number;
  
  // ── NOUVEAU v2.0 ──
  withdrawalLimit?: number;
  isOpen24h?: boolean;
  hasEnvelopeDeposit?: boolean;
  securityLevel?: "low" | "medium" | "high";
}

export const ATM_SPOTS: AtmSpot[] = [
  { 
    id: "atm_desj_pnf", name: "Caisse Desjardins Portneuf", 
    network: "desjardins", feePerTransaction: 0.0, 
    x: townCenter("portneuf")[0] + 14, z: townCenter("portneuf")[1] + 6,
    withdrawalLimit: 2000, isOpen24h: true, hasEnvelopeDeposit: true,
    securityLevel: "high",
  },
  { 
    id: "atm_sq_poste", name: "Guichet Poste SQ", 
    network: "desjardins", feePerTransaction: 0.0, 
    x: -82, z: -40,
    withdrawalLimit: 1000, isOpen24h: true,
    securityLevel: "high",
  },
  { 
    id: "atm_desj_pont", name: "Caisse Desjardins Pont-Rouge", 
    network: "desjardins", feePerTransaction: 0.0, 
    x: townCenter("pont_rouge")[0] - 12, z: townCenter("pont_rouge")[1] + 8,
    withdrawalLimit: 2000, isOpen24h: true, hasEnvelopeDeposit: true,
    securityLevel: "medium",
  },
  { 
    id: "atm_bnc_donna", name: "Banque Nationale Donnacona", 
    network: "banque_nationale", feePerTransaction: 1.5, 
    x: townCenter("donnacona")[0] + 10, z: townCenter("donnacona")[1] - 14,
    withdrawalLimit: 1500, isOpen24h: false, hasEnvelopeDeposit: true,
    securityLevel: "medium",
  },
  { 
    id: "atm_dep_ray", name: "Guichet Couche-Tard St-Raymond", 
    network: "interac_prive", feePerTransaction: 3.25, 
    x: townCenter("saint_raymond")[0] + 8, z: townCenter("saint_raymond")[1] + 16,
    withdrawalLimit: 500, isOpen24h: true,
    securityLevel: "low",
  },
  // ── NOUVEAU v2.0 ──
  { 
    id: "atm_rbc_donna", name: "RBC Donnacona", 
    network: "rbc", feePerTransaction: 0.0, 
    x: townCenter("donnacona")[0] - 18, z: townCenter("donnacona")[1] + 12,
    withdrawalLimit: 2000, isOpen24h: true, hasEnvelopeDeposit: true,
    securityLevel: "high",
  },
  { 
    id: "atm_scotia_pont", name: "Scotiabank Pont-Rouge", 
    network: "scotiabank", feePerTransaction: 2.0, 
    x: townCenter("pont_rouge")[0] + 22, z: townCenter("pont_rouge")[1] - 6,
    withdrawalLimit: 1500, isOpen24h: true,
    securityLevel: "medium",
  },
  { 
    id: "atm_dep_neuville", name: "Guichet Ultramar Neuville", 
    network: "interac_prive", feePerTransaction: 2.95, 
    x: townCenter("neuville")[0] + 16, z: townCenter("neuville")[1] - 10,
    withdrawalLimit: 400, isOpen24h: true,
    securityLevel: "low",
  },
];

// ═══════════════════════════════════════════════════════════
// GANGS CRIMINELS
// ═══════════════════════════════════════════════════════════

export type GangClassification = 
  | "motards_1pct" 
  | "reseau_contrebande" 
  | "braconniers_forestiers"
  | "gang_rue"
  | "mafia"
  | "cartel";

export type GangRank = "recrue" | "associé" | "soldat" | "capo" | "sous_boss" | "boss";

export interface GangDef {
  id: string;
  name: string;
  classification: GangClassification;
  color: string;
  turfLocation: string;
  hint: string;
  
  // ── NOUVEAU v2.0 ──
  leader?: string;
  memberCount?: number;
  founded?: number;
  allies?: string[];
  rivals?: string[];
  specialties?: string[];
  joinRequirements?: {
    minReputation?: number;
    requiredCrime?: CrimeId;
    initiationFee?: number;
  };
  ranks?: Array<{ rank: GangRank; minReputation: number; perks: string[] }>;
}

export const GANGS: GangDef[] = [
  { 
    id: "G-MC-01", name: "Black Bastards MC", classification: "motards_1pct", 
    color: "#b91c1c", turfLocation: "Rang Saint-Alban / Route 363", 
    hint: "Club de motards criminalisés 1%.",
    leader: "Gérald 'Iron Horse' Tremblay",
    memberCount: 24,
    founded: 1978,
    allies: ["G-BRAC-03"],
    rivals: ["G-MC-04"],
    specialties: ["Trafic de drogues", "Extorsion", "Vol de véhicules"],
    joinRequirements: {
      minReputation: 50,
      requiredCrime: "theft_machinery",
      initiationFee: 500,
    },
    ranks: [
      { rank: "recrue", minReputation: 0, perks: ["Accès au clubhouse"] },
      { rank: "associé", minReputation: 25, perks: ["Vest sans patch"] },
      { rank: "soldat", minReputation: 50, perks: ["Patch complet", "Part des profits"] },
      { rank: "capo", minReputation: 100, perks: ["Territoire assigné"] },
      { rank: "sous_boss", minReputation: 200, perks: ["Vote au chapter"] },
      { rank: "boss", minReputation: 500, perks: ["Contrôle total"] },
    ],
  },
  { 
    id: "G-CONTR-02", name: "Réseau des Bateliers du Fleuve", classification: "reseau_contrebande", 
    color: "#0891b2", turfLocation: "Anses de Deschambault", 
    hint: "Contrebande de tabac et alcool.",
    leader: "Marc 'Le Capitaine' Dubois",
    memberCount: 18,
    founded: 1995,
    allies: [],
    rivals: ["G-CONTR-05"],
    specialties: ["Contrebande de tabac", "Trafic d'alcool", "Immigration clandestine"],
    joinRequirements: {
      minReputation: 30,
      requiredCrime: "drug_trafficking",
      initiationFee: 300,
    },
    ranks: [
      { rank: "recrue", minReputation: 0, perks: ["Petites missions"] },
      { rank: "associé", minReputation: 20, perks: ["Accès au réseau"] },
      { rank: "soldat", minReputation: 40, perks: ["Part des profits"] },
      { rank: "capo", minReputation: 80, perks: ["Route assignée"] },
    ],
  },
  { 
    id: "G-BRAC-03", name: "La Faction des Hauts-Rangs", classification: "braconniers_forestiers", 
    color: "#4d7c0f", turfLocation: "Terres de la Couronne", 
    hint: "Braconnage de gros gibier.",
    leader: "Réjean 'Le Trappeur' Gagnon",
    memberCount: 12,
    founded: 2005,
    allies: ["G-MC-01"],
    rivals: [],
    specialties: ["Braconnage", "Culture de cannabis", "Vol de bois"],
    joinRequirements: {
      minReputation: 20,
      requiredCrime: "poaching_forest",
    },
    ranks: [
      { rank: "recrue", minReputation: 0, perks: ["Accès aux caches"] },
      { rank: "associé", minReputation: 15, perks: ["Part du gibier"] },
      { rank: "soldat", minReputation: 35, perks: ["Territoire de chasse"] },
    ],
  },
  
  // ── NOUVEAU v2.0 ──
  { 
    id: "G-MC-04", name: "Saints de Portneuf MC", classification: "motards_1pct", 
    color: "#7c3aed", turfLocation: "Donnacona Sud", 
    hint: "Club rival des Black Bastards.",
    leader: "Yvon 'Le Saint' Bergeron",
    memberCount: 19,
    founded: 1985,
    allies: ["G-RUE-06"],
    rivals: ["G-MC-01"],
    specialties: ["Trafic de méthamphétamine", "Prêts usuraires", "Extorsion"],
    joinRequirements: {
      minReputation: 60,
      initiationFee: 800,
    },
  },
  { 
    id: "G-CONTR-05", name: "Organisation Calabrese", classification: "mafia", 
    color: "#1e293b", turfLocation: "Pont-Rouge Centre", 
    hint: "Famille mafieuse italienne.",
    leader: "Don Antonio Calabrese",
    memberCount: 35,
    founded: 1952,
    allies: [],
    rivals: ["G-CONTR-02"],
    specialties: ["Blanchiment", "Extorsion", "Construction", "Jeux illégaux"],
    joinRequirements: {
      minReputation: 100,
      initiationFee: 2000,
    },
  },
  { 
    id: "G-RUE-06", name: "Les 138 Boyz", classification: "gang_rue", 
    color: "#dc2626", turfLocation: "Route 138 Ouest", 
    hint: "Gang de rue de Donnacona.",
    leader: "K-Mac",
    memberCount: 45,
    founded: 2012,
    allies: ["G-MC-04"],
    rivals: ["G-RUE-07"],
    specialties: ["Vente au détail", "Vol de voiture", "Vandalisme"],
    joinRequirements: {
      minReputation: 10,
    },
  },
  { 
    id: "G-RUE-07", name: "North Side Crew", classification: "gang_rue", 
    color: "#2563eb", turfLocation: "Donnacona Nord", 
    hint: "Gang rival des 138 Boyz.",
    leader: "D-Block",
    memberCount: 38,
    founded: 2015,
    rivals: ["G-RUE-06"],
    specialties: ["Trafic de rue", "Cambriolage"],
    joinRequirements: {
      minReputation: 10,
    },
  },
];

// ═══════════════════════════════════════════════════════════
// CRIMES ET INFRACTIONS
// ═══════════════════════════════════════════════════════════

export type CrimeId =
  | "theft_shop"
  | "robbery_depanneur"
  | "theft_machinery"
  | "drug_trafficking"
  | "bank_heist_caisse"
  | "poaching_forest"
  // ── NOUVEAU v2.0 ──
  | "car_theft"
  | "carjacking"
  | "armed_robbery"
  | "burglary_home"
  | "burglary_business"
  | "assault"
  | "aggravated_assault"
  | "fraud"
  | "identity_theft"
  | "arson"
  | "kidnapping"
  | "murder"
  | "dui"
  | "hit_and_run"
  | "possession_weapon"
  | "possession_drugs";

export type CrimeSeverity = "infraction" | "misdemeanor" | "felony" | "indictable";

export interface CrimeDef {
  id: CrimeId;
  name: string;
  penalCodeArticle?: string;
  rewardCad: number;
  reward: number;
  wantedStars: number;
  cooldownSeconds?: number;
  hint: string;
  
  // ── NOUVEAU v2.0 ──
  severity: CrimeSeverity;
  fineMin?: number;
  fineMax?: number;
  jailTimeMin?: number; // en mois
  jailTimeMax?: number;
  recordPoints?: number; // points au casier
  requiredSkill?: number; // 1-10
  requiredTool?: string;
  escapeDifficulty?: number; // 1-10
  heatIncrease?: number; // augmentation de heat
}

export const CRIMES: CrimeDef[] = [
  // ═══ INFRACTIONS ═══
  { 
    id: "theft_shop", name: "Vol à l'étalage", penalCodeArticle: "Art. 334 CCC", 
    rewardCad: 110, reward: 110, wantedStars: 1, cooldownSeconds: 90, 
    hint: "Subtiliser des marchandises.",
    severity: "infraction",
    fineMin: 100, fineMax: 500,
    recordPoints: 1,
    requiredSkill: 2,
    escapeDifficulty: 2,
    heatIncrease: 5,
  },
  { 
    id: "dui", name: "Conduite avec facultés affaiblies", penalCodeArticle: "Art. 320.14 CCC", 
    rewardCad: 0, reward: 0, wantedStars: 2, cooldownSeconds: 0, 
    hint: "Conduire avec alcoolémie > 80mg.",
    severity: "misdemeanor",
    fineMin: 1000, fineMax: 5000,
    jailTimeMin: 0, jailTimeMax: 6,
    recordPoints: 8,
    escapeDifficulty: 4,
    heatIncrease: 20,
  },
  { 
    id: "hit_and_run", name: "Délit de fuite", penalCodeArticle: "Art. 320.16 CCC", 
    rewardCad: 0, reward: 0, wantedStars: 3, cooldownSeconds: 0, 
    hint: "Quitter les lieux d'un accident.",
    severity: "misdemeanor",
    fineMin: 2000, fineMax: 10000,
    jailTimeMin: 0, jailTimeMax: 12,
    recordPoints: 10,
    escapeDifficulty: 5,
    heatIncrease: 25,
  },
  { 
    id: "possession_drugs", name: "Possession simple", penalCodeArticle: "Art. 4 CDSA", 
    rewardCad: 0, reward: 0, wantedStars: 1, cooldownSeconds: 60, 
    hint: "Possession de substance contrôlée.",
    severity: "infraction",
    fineMin: 500, fineMax: 2000,
    recordPoints: 2,
    escapeDifficulty: 2,
    heatIncrease: 10,
  },
  
  // ═══ MÉFAITS ═══
  { 
    id: "robbery_depanneur", name: "Braquage de dépanneur", penalCodeArticle: "Art. 343 CCC", 
    rewardCad: 380, reward: 380, wantedStars: 2, cooldownSeconds: 180, 
    hint: "Vider le tiroir-caisse.",
    severity: "misdemeanor",
    fineMin: 2000, fineMax: 10000,
    jailTimeMin: 6, jailTimeMax: 24,
    recordPoints: 5,
    requiredSkill: 4,
    requiredTool: "cagoule",
    escapeDifficulty: 5,
    heatIncrease: 30,
  },
  { 
    id: "drug_trafficking", name: "Trafic de stupéfiants", penalCodeArticle: "Art. 5 LRDS", 
    rewardCad: 290, reward: 290, wantedStars: 2, cooldownSeconds: 120, 
    hint: "Écouler des substances illicites.",
    severity: "misdemeanor",
    fineMin: 5000, fineMax: 25000,
    jailTimeMin: 12, jailTimeMax: 60,
    recordPoints: 8,
    requiredSkill: 5,
    escapeDifficulty: 6,
    heatIncrease: 40,
  },
  { 
    id: "theft_machinery", name: "Vol de machinerie", penalCodeArticle: "Art. 354 CCC", 
    rewardCad: 620, reward: 620, wantedStars: 3, cooldownSeconds: 300, 
    hint: "Dépouiller un camion forestier.",
    severity: "misdemeanor",
    fineMin: 3000, fineMax: 15000,
    jailTimeMin: 6, jailTimeMax: 36,
    recordPoints: 6,
    requiredSkill: 6,
    escapeDifficulty: 6,
    heatIncrease: 35,
  },
  { 
    id: "poaching_forest", name: "Braconnage nocturne", penalCodeArticle: "Loi conservation faune", 
    rewardCad: 520, reward: 520, wantedStars: 2, cooldownSeconds: 240, 
    hint: "Tir illégal dans les réserves.",
    severity: "misdemeanor",
    fineMin: 1000, fineMax: 5000,
    jailTimeMin: 0, jailTimeMax: 6,
    recordPoints: 4,
    requiredSkill: 4,
    requiredTool: "fusil_chasse",
    escapeDifficulty: 4,
    heatIncrease: 20,
  },
  
  // ── NOUVEAU v2.0 ═══
  { 
    id: "car_theft", name: "Vol de véhicule", penalCodeArticle: "Art. 333 CCC", 
    rewardCad: 450, reward: 450, wantedStars: 2, cooldownSeconds: 300, 
    hint: "Dérober un véhicule stationné.",
    severity: "misdemeanor",
    fineMin: 2000, fineMax: 10000,
    jailTimeMin: 6, jailTimeMax: 24,
    recordPoints: 5,
    requiredSkill: 5,
    requiredTool: "slim_jim",
    escapeDifficulty: 5,
    heatIncrease: 30,
  },
  { 
    id: "carjacking", name: "Vol de véhicule avec violence", penalCodeArticle: "Art. 344 CCC", 
    rewardCad: 800, reward: 800, wantedStars: 4, cooldownSeconds: 600, 
    hint: "Arracher un véhicule à son conducteur.",
    severity: "indictable",
    fineMin: 5000, fineMax: 25000,
    jailTimeMin: 24, jailTimeMax: 120,
    recordPoints: 12,
    requiredSkill: 7,
    requiredTool: "arme_feu",
    escapeDifficulty: 8,
    heatIncrease: 60,
  },
  { 
    id: "armed_robbery", name: "Vol à main armée", penalCodeArticle: "Art. 344 CCC", 
    rewardCad: 1200, reward: 1200, wantedStars: 4, cooldownSeconds: 600, 
    hint: "Braquage avec arme à feu.",
    severity: "indictable",
    fineMin: 10000, fineMax: 50000,
    jailTimeMin: 48, jailTimeMax: 180,
    recordPoints: 15,
    requiredSkill: 8,
    requiredTool: "arme_feu",
    escapeDifficulty: 8,
    heatIncrease: 70,
  },
  { 
    id: "burglary_home", name: "Introduction par effraction (résidence)", penalCodeArticle: "Art. 348 CCC", 
    rewardCad: 550, reward: 550, wantedStars: 2, cooldownSeconds: 300, 
    hint: "Cambrioler une maison.",
    severity: "misdemeanor",
    fineMin: 3000, fineMax: 15000,
    jailTimeMin: 12, jailTimeMax: 48,
    recordPoints: 7,
    requiredSkill: 6,
    requiredTool: "pied_biche",
    escapeDifficulty: 6,
    heatIncrease: 35,
  },
  { 
    id: "burglary_business", name: "Introduction par effraction (commerce)", penalCodeArticle: "Art. 348 CCC", 
    rewardCad: 900, reward: 900, wantedStars: 3, cooldownSeconds: 480, 
    hint: "Cambrioler un commerce.",
    severity: "felony",
    fineMin: 5000, fineMax: 25000,
    jailTimeMin: 24, jailTimeMax: 72,
    recordPoints: 10,
    requiredSkill: 7,
    requiredTool: "pied_biche",
    escapeDifficulty: 7,
    heatIncrease: 50,
  },
  { 
    id: "assault", name: "Voies de fait simples", penalCodeArticle: "Art. 266 CCC", 
    rewardCad: 0, reward: 0, wantedStars: 2, cooldownSeconds: 120, 
    hint: "Agression physique sans arme.",
    severity: "misdemeanor",
    fineMin: 500, fineMax: 5000,
    jailTimeMin: 0, jailTimeMax: 18,
    recordPoints: 5,
    requiredSkill: 3,
    escapeDifficulty: 4,
    heatIncrease: 25,
  },
  { 
    id: "aggravated_assault", name: "Voies de fait graves", penalCodeArticle: "Art. 268 CCC", 
    rewardCad: 0, reward: 0, wantedStars: 4, cooldownSeconds: 300, 
    hint: "Agression causant blessures graves.",
    severity: "indictable",
    fineMin: 5000, fineMax: 25000,
    jailTimeMin: 24, jailTimeMax: 168,
    recordPoints: 15,
    requiredSkill: 6,
    escapeDifficulty: 7,
    heatIncrease: 60,
  },
  { 
    id: "fraud", name: "Fraude", penalCodeArticle: "Art. 380 CCC", 
    rewardCad: 400, reward: 400, wantedStars: 2, cooldownSeconds: 600, 
    hint: "Escroquerie financière.",
    severity: "misdemeanor",
    fineMin: 2000, fineMax: 20000,
    jailTimeMin: 6, jailTimeMax: 48,
    recordPoints: 6,
    requiredSkill: 7,
    escapeDifficulty: 3,
    heatIncrease: 30,
  },
  { 
    id: "identity_theft", name: "Vol d'identité", penalCodeArticle: "Art. 402.2 CCC", 
    rewardCad: 600, reward: 600, wantedStars: 3, cooldownSeconds: 900, 
    hint: "Usurpation d'identité.",
    severity: "felony",
    fineMin: 5000, fineMax: 25000,
    jailTimeMin: 12, jailTimeMax: 60,
    recordPoints: 8,
    requiredSkill: 8,
    escapeDifficulty: 4,
    heatIncrease: 40,
  },
  { 
    id: "arson", name: "Incendie criminel", penalCodeArticle: "Art. 433 CCC", 
    rewardCad: 0, reward: 0, wantedStars: 5, cooldownSeconds: 1200, 
    hint: "Mettre le feu à un bâtiment.",
    severity: "indictable",
    fineMin: 10000, fineMax: 100000,
    jailTimeMin: 60, jailTimeMax: 240,
    recordPoints: 20,
    requiredSkill: 5,
    requiredTool: "accelerant",
    escapeDifficulty: 8,
    heatIncrease: 80,
  },
  { 
    id: "kidnapping", name: "Enlèvement", penalCodeArticle: "Art. 279 CCC", 
    rewardCad: 2500, reward: 2500, wantedStars: 5, cooldownSeconds: 1800, 
    hint: "Séquestration d'une personne.",
    severity: "indictable",
    fineMin: 25000, fineMax: 100000,
    jailTimeMin: 120, jailTimeMax: 300,
    recordPoints: 25,
    requiredSkill: 9,
    escapeDifficulty: 9,
    heatIncrease: 90,
  },
  { 
    id: "murder", name: "Meurtre", penalCodeArticle: "Art. 235 CCC", 
    rewardCad: 0, reward: 0, wantedStars: 5, cooldownSeconds: 3600, 
    hint: "Homicide volontaire.",
    severity: "indictable",
    fineMin: 0, fineMax: 0,
    jailTimeMin: 300, jailTimeMax: 600,
    recordPoints: 50,
    requiredSkill: 8,
    escapeDifficulty: 10,
    heatIncrease: 100,
  },
  { 
    id: "possession_weapon", name: "Possession d'arme prohibée", penalCodeArticle: "Art. 95 CCC", 
    rewardCad: 0, reward: 0, wantedStars: 2, cooldownSeconds: 180, 
    hint: "Port d'arme sans permis.",
    severity: "misdemeanor",
    fineMin: 1000, fineMax: 10000,
    jailTimeMin: 6, jailTimeMax: 60,
    recordPoints: 8,
    escapeDifficulty: 3,
    heatIncrease: 30,
  },
  
  // ═══ CRIMES MAJEURS ═══
  { 
    id: "bank_heist_caisse", name: "Braquage de Caisse", penalCodeArticle: "Art. 344 CCC", 
    rewardCad: 1450, reward: 1450, wantedStars: 4, cooldownSeconds: 600, 
    hint: "Percer la voûte blindée.",
    severity: "indictable",
    fineMin: 25000, fineMax: 100000,
    jailTimeMin: 60, jailTimeMax: 180,
    recordPoints: 20,
    requiredSkill: 9,
    requiredTool: "explosif",
    escapeDifficulty: 9,
    heatIncrease: 80,
  },
];

// ═══════════════════════════════════════════════════════════
// LIEUX DE CRIME
// ═══════════════════════════════════════════════════════════

export interface CrimeSpot {
  id: string;
  crime: CrimeId;
  name: string;
  x: number;
  z: number;
  
  // ── NOUVEAU v2.0 ──
  difficulty?: number; // 1-10
  securityLevel?: "none" | "low" | "medium" | "high";
  bestTime?: "day" | "night" | "any";
  escapeRoutes?: number;
}

export const CRIME_SPOTS: CrimeSpot[] = [
  { 
    id: "c_alban_dep", crime: "theft_shop", name: "Dépanneur de Saint-Alban", 
    x: townCenter("saint_alban")[0] + 40, z: townCenter("saint_alban")[1] - 8,
    difficulty: 2, securityLevel: "low", bestTime: "night", escapeRoutes: 3,
  },
  { 
    id: "c_donna_braquage", crime: "robbery_depanneur", name: "Poste d'essence Route 138", 
    x: townCenter("donnacona")[0] - 40, z: townCenter("donnacona")[1] - 6,
    difficulty: 5, securityLevel: "medium", bestTime: "night", escapeRoutes: 2,
  },
  { 
    id: "c_pont_machinerie", crime: "theft_machinery", name: "Cour de machinerie", 
    x: townCenter("pont_rouge")[0] - 48, z: townCenter("pont_rouge")[1] + 24,
    difficulty: 6, securityLevel: "low", bestTime: "night", escapeRoutes: 4,
  },
  { 
    id: "c_ray_deal", crime: "drug_trafficking", name: "Bar de Saint-Raymond", 
    x: townCenter("saint_raymond")[0] + 48, z: townCenter("saint_raymond")[1] - 12,
    difficulty: 4, securityLevel: "none", bestTime: "any", escapeRoutes: 2,
  },
  { 
    id: "c_foret_braconnage", crime: "poaching_forest", name: "Rang Sainte-Anne", 
    x: townCenter("saint_marc")[0] - 55, z: townCenter("saint_marc")[1] - 38,
    difficulty: 4, securityLevel: "none", bestTime: "night", escapeRoutes: 5,
  },
  { 
    id: "c_caisse_portneuf", crime: "bank_heist_caisse", name: "Voûte Caisse Portneuf", 
    x: townCenter("portneuf")[0] + 22, z: townCenter("portneuf")[1] + 10,
    difficulty: 9, securityLevel: "high", bestTime: "night", escapeRoutes: 2,
  },
  
  // ── NOUVEAU v2.0 ──
  { 
    id: "c_parking_vol", crime: "car_theft", name: "Stationnement centre commercial", 
    x: townCenter("donnacona")[0] + 35, z: townCenter("donnacona")[1] + 28,
    difficulty: 5, securityLevel: "medium", bestTime: "night", escapeRoutes: 4,
  },
  { 
    id: "c_residence_camb", crime: "burglary_home", name: "Résidence cossue Neuville", 
    x: townCenter("neuville")[0] - 45, z: townCenter("neuville")[1] + 35,
    difficulty: 6, securityLevel: "medium", bestTime: "day", escapeRoutes: 3,
  },
  { 
    id: "c_entrepot_vol", crime: "burglary_business", name: "Entrepôt industriel Donnacona", 
    x: townCenter("donnacona")[0] + 55, z: townCenter("donnacona")[1] - 35,
    difficulty: 7, securityLevel: "medium", bestTime: "night", escapeRoutes: 3,
  },
];

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE CASIER JUDICIAIRE
// ═══════════════════════════════════════════════════════════

export interface CriminalRecord {
  playerId: string;
  convictions: CriminalConviction[];
  totalPoints: number;
  licenseSuspended: boolean;
  suspendedUntil?: number;
  onParole: boolean;
  paroleUntil?: number;
  outstandingWarrants: Warrant[];
}

export interface CriminalConviction {
  id: string;
  crimeId: CrimeId;
  date: number;
  sentence: {
    fine?: number;
    jailMonths?: number;
    probationMonths?: number;
    communityService?: number;
  };
  points: number;
  served: boolean;
}

export interface Warrant {
  id: string;
  playerId: string;
  crimeId: CrimeId;
  issuedAt: number;
  issuingOfficer?: string;
  bail?: number;
}

export const LICENSE_SUSPENSION_THRESHOLDS = [
  { points: 4, suspensionMonths: 3, label: "Avertissement" },
  { points: 8, suspensionMonths: 6, label: "Suspension courte" },
  { points: 12, suspensionMonths: 12, label: "Suspension longue" },
  { points: 15, suspensionMonths: 24, label: "Suspension majeure" },
  { points: 20, suspensionMonths: 0, label: "Révocation permanente" },
];

// ═══════════════════════════════════════════════════════════
// PERMIS ET LICENCES
// ═══════════════════════════════════════════════════════════

export type LicenseType = 
  | "permis_conduire_5" 
  | "permis_conduire_4b" 
  | "permis_classe_1" 
  | "permis_classe_2"
  | "permis_chasse" 
  | "permis_peche"
  | "permis_port_arme" 
  | "permis_port_arme_restreint"
  | "permis_arme_force_ordre"
  | "permis_mecanicien"
  | "permis_electricien"
  | "permis_plombier"
  | "permis_coiffure"
  | "permis_barreau"
  | "permis_oaciq"
  | "permis_huissier"
  | "permis_soudure_cwb"
  | "permis_grue"
  | "permis_travail_hauteur"
  | "carte_ccq"
  | "permis_oiiq"
  | "permis_opq"
  | "brevet_enseignement"
  | "permis_pratique_medecine"
  | "permis_mma_cannabis"
  | "permis_peche_commerciale"
  | "permis_taxi"
  | "certificat_salubrite";

export interface LicenseDef {
  id: LicenseType;
  name: string;
  category: "conduite" | "armes" | "profession" | "loisir" | "commerce";
  fee: number;
  renewalYears: number;
  prerequisites?: LicenseType[];
  requiredEducation?: string;
  examRequired?: boolean;
  examFee?: number;
}

export const LICENSES: Record<string, LicenseDef> = {
  permis_conduire_5: {
    id: "permis_conduire_5",
    name: "Permis de conduire classe 5",
    category: "conduite",
    fee: 100,
    renewalYears: 4,
    examRequired: true,
    examFee: 30,
  },
  permis_conduire_4b: {
    id: "permis_conduire_4b",
    name: "Permis classe 4B (urgence)",
    category: "conduite",
    fee: 150,
    renewalYears: 4,
    prerequisites: ["permis_conduire_5"],
    examRequired: true,
    examFee: 50,
  },
  permis_classe_1: {
    id: "permis_classe_1",
    name: "Permis classe 1 (poids lourd)",
    category: "conduite",
    fee: 250,
    renewalYears: 4,
    prerequisites: ["permis_conduire_5"],
    examRequired: true,
    examFee: 150,
  },
  permis_classe_2: {
    id: "permis_classe_2",
    name: "Permis classe 2 (autobus)",
    category: "conduite",
    fee: 200,
    renewalYears: 4,
    prerequisites: ["permis_conduire_5"],
    examRequired: true,
    examFee: 100,
  },
  permis_chasse: {
    id: "permis_chasse",
    name: "Certificat du chasseur",
    category: "loisir",
    fee: 50,
    renewalYears: 3,
    examRequired: true,
    examFee: 25,
  },
  permis_peche: {
    id: "permis_peche",
    name: "Permis de pêche sportive",
    category: "loisir",
    fee: 35,
    renewalYears: 1,
  },
  permis_port_arme: {
    id: "permis_port_arme",
    name: "PPAF (Possession et acquisition)",
    category: "armes",
    fee: 80,
    renewalYears: 5,
    examRequired: true,
    examFee: 50,
  },
  permis_port_arme_restreint: {
    id: "permis_port_arme_restreint",
    name: "PPAF Restreint (armes de poing)",
    category: "armes",
    fee: 120,
    renewalYears: 5,
    prerequisites: ["permis_port_arme"],
    examRequired: true,
    examFee: 75,
  },
  permis_arme_force_ordre: {
    id: "permis_arme_force_ordre",
    name: "Autorisation policière",
    category: "armes",
    fee: 0,
    renewalYears: 5,
  },
  permis_mecanicien: {
    id: "permis_mecanicien",
    name: "Certificat de qualification mécanicien",
    category: "profession",
    fee: 200,
    renewalYears: 5,
    requiredEducation: "DEP Mécanique automobile",
  },
  permis_electricien: {
    id: "permis_electricien",
    name: "Licence CMEQ électricien",
    category: "profession",
    fee: 350,
    renewalYears: 3,
    requiredEducation: "DEP Électricité",
    examRequired: true,
    examFee: 200,
  },
  permis_plombier: {
    id: "permis_plombier",
    name: "Licence CMMTQ plombier",
    category: "profession",
    fee: 300,
    renewalYears: 3,
    requiredEducation: "DEP Plomberie",
    examRequired: true,
    examFee: 175,
  },
  carte_ccq: {
    id: "carte_ccq",
    name: "Carte de compétence CCQ",
    category: "profession",
    fee: 150,
    renewalYears: 5,
    requiredEducation: "DEP Construction",
  },
  permis_coiffure: {
    id: "permis_coiffure",
    name: "Permis de coiffure",
    category: "profession",
    fee: 100,
    renewalYears: 3,
    requiredEducation: "DEP Coiffure",
  },
  permis_barreau: {
    id: "permis_barreau",
    name: "Membre du Barreau du Québec",
    category: "profession",
    fee: 1500,
    renewalYears: 1,
    requiredEducation: "LL.B. + École du Barreau",
    examRequired: true,
    examFee: 500,
  },
  permis_oaciq: {
    id: "permis_oaciq",
    name: "Permis courtier immobilier OACIQ",
    category: "profession",
    fee: 800,
    renewalYears: 2,
    examRequired: true,
    examFee: 400,
  },
  permis_oiiq: {
    id: "permis_oiiq",
    name: "Permis OIIQ (infirmier)",
    category: "profession",
    fee: 600,
    renewalYears: 1,
    requiredEducation: "B.Sc. Sciences infirmières",
    examRequired: true,
    examFee: 300,
  },
  brevet_enseignement: {
    id: "brevet_enseignement",
    name: "Brevet d'enseignement",
    category: "profession",
    fee: 200,
    renewalYears: 5,
    requiredEducation: "B.Ed. Éducation",
  },
  permis_pratique_medecine: {
    id: "permis_pratique_medecine",
    name: "Permis CMQ (médecin)",
    category: "profession",
    fee: 2500,
    renewalYears: 1,
    requiredEducation: "M.D. Doctorat en médecine",
    examRequired: true,
    examFee: 1000,
  },
  permis_mma_cannabis: {
    id: "permis_mma_cannabis",
    name: "Licence MMA (micro-culture cannabis)",
    category: "commerce",
    fee: 5000,
    renewalYears: 3,
  },
  permis_peche_commerciale: {
    id: "permis_peche_commerciale",
    name: "Permis de pêche commerciale",
    category: "commerce",
    fee: 800,
    renewalYears: 1,
  },
  permis_taxi: {
    id: "permis_taxi",
    name: "Permis de taxi CTQ",
    category: "commerce",
    fee: 400,
    renewalYears: 3,
    prerequisites: ["permis_conduire_5"],
  },
  certificat_salubrite: {
    id: "certificat_salubrite",
    name: "Certificat de salubrité alimentaire",
    category: "profession",
    fee: 75,
    renewalYears: 5,
    examRequired: true,
    examFee: 25,
  },
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function jobById(id: string): RpJobDef {
  return RP_JOBS.find((j) => j.id === id) ?? RP_JOBS[0]!;
}

export function deedById(id: string): Deed | undefined {
  return DEEDS.find((d) => d.id === id);
}

export const defeedById = deedById;
export { addWantedPoints } from "./police";
export const getCrimeById = crimeById;

export function crimeById(id: CrimeId): CrimeDef {
  return CRIMES.find((c) => c.id === id) ?? CRIMES[0]!;
}

export function gangById(id: string | null): GangDef | undefined {
  return GANGS.find((g) => g.id === id);
}

export function atmById(id: string): AtmSpot | undefined {
  return ATM_SPOTS.find((a) => a.id === id);
}

export function licenseById(id: string): LicenseDef | undefined {
  return LICENSES[id];
}

export function crimeSpotById(id: string): CrimeSpot | undefined {
  return CRIME_SPOTS.find((s) => s.id === id);
}

export function nearestOf<T extends { x: number; z: number }>(
  list: T[], 
  x: number, 
  z: number, 
  maxDistance: number
): T | null {
  let best: T | null = null;
  let bestD = maxDistance;
  for (const item of list) {
    const d = Math.hypot(x - item.x, z - item.z);
    if (d < bestD) {
      best = item;
      bestD = d;
    }
  }
  return best;
}

export function payrollNet(jobId: RpJobId): { 
  gross: number; 
  deductions: number; 
  net: number;
  breakdown: ReturnType<typeof calculatePayrollDeductions>;
} {
  const gross = jobById(jobId).salary;
  if (gross <= 0) {
    return { 
      gross: 0, 
      deductions: 0, 
      net: 0,
      breakdown: calculatePayrollDeductions(0),
    };
  }
  
  const breakdown = calculatePayrollDeductions(gross);
  
  return { 
    gross, 
    deductions: breakdown.totalDeductions, 
    net: breakdown.net,
    breakdown,
  };
}

export function getJobsByCategory(category: RpJobCategory): RpJobDef[] {
  return RP_JOBS.filter((j) => j.category === category);
}

export function getCrimesBySeverity(severity: CrimeSeverity): CrimeDef[] {
  return CRIMES.filter((c) => c.severity === severity);
}

export function getAvailableJobs(
  playerEducation: string,
  playerLicenses: string[]
): RpJobDef[] {
  return RP_JOBS.filter((job) => {
    // Vérifier éducation
    if (job.minEducation) {
      const educationLevels = ["none", "des", "dep", "dec", "bacc", "maitrise", "doctorat"];
      const requiredLevel = educationLevels.indexOf(job.minEducation);
      const playerLevel = educationLevels.indexOf(playerEducation);
      if (playerLevel < requiredLevel) return false;
    }
    
    // Vérifier licence
    if (job.requiredLicense && !playerLicenses.includes(job.requiredLicense)) {
      return false;
    }
    
    return true;
  });
}

export function calculateCrimeSuccess(
  crimeId: CrimeId,
  playerSkill: number,
  playerHeat: number,
  timeOfDay: "day" | "night"
): { success: boolean; successChance: number; detected: boolean } {
  const crime = crimeById(crimeId);
  if (!crime) {
    return { success: false, successChance: 0, detected: true };
  }
  
  let baseChance = 70;
  
  // Difficulté du crime
  baseChance -= (crime.escapeDifficulty ?? 0) * 5;
  
  // Skill du joueur
  baseChance += (playerSkill - 5) * 3;
  
  // Heat du joueur (recherche policière)
  baseChance -= playerHeat * 0.5;
  
  // Bonus de nuit pour certains crimes
  if (timeOfDay === "night" && crime.wantedStars >= 2) {
    baseChance += 10;
  }
  
  // Limiter entre 5% et 95%
  const successChance = Math.max(5, Math.min(95, baseChance));
  
  const success = Math.random() * 100 < successChance;
  const detected = !success && Math.random() * 100 < (100 - successChance) * 0.5;
  
  return { success, successChance, detected };
}

export function getLicenseSuspensionLevel(points: number): {
  level: number;
  suspensionMonths: number;
  label: string;
} {
  let result = { level: 0, suspensionMonths: 0, label: "Aucune suspension" };
  
  for (let i = 0; i < LICENSE_SUSPENSION_THRESHOLDS.length; i++) {
    const threshold = LICENSE_SUSPENSION_THRESHOLDS[i];
    if (points >= threshold.points) {
      result = {
        level: i + 1,
        suspensionMonths: threshold.suspensionMonths,
        label: threshold.label,
      };
    }
  }
  
  return result;
}

export function getGangReputationForRank(
  gangId: string,
  currentReputation: number
): { currentRank: GangRank; nextRank: GangRank | null; pointsToNext: number } {
  const gang = gangById(gangId);
  if (!gang || !gang.ranks) {
    return { currentRank: "recrue", nextRank: null, pointsToNext: 0 };
  }
  
  let currentRank: GangRank = "recrue";
  let nextRank: GangRank | null = null;
  let pointsToNext = 0;
  
  for (let i = gang.ranks.length - 1; i >= 0; i--) {
    const rank = gang.ranks[i];
    if (currentReputation >= rank.minReputation) {
      currentRank = rank.rank;
      if (i < gang.ranks.length - 1) {
        nextRank = gang.ranks[i + 1].rank;
        pointsToNext = gang.ranks[i + 1].minReputation - currentReputation;
      }
      break;
    }
  }
  
  return { currentRank, nextRank, pointsToNext };
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

export const TOTAL_JOBS = RP_JOBS.length;
export const TOTAL_CRIMES = CRIMES.length;
export const TOTAL_GANGS = GANGS.length;
export const TOTAL_DEEDS = DEEDS.length;
export const TOTAL_ATMS = ATM_SPOTS.length;
export const TOTAL_LICENSES = Object.keys(LICENSES).length;
