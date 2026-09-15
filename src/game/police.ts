export const SQ_LEGAL_BAC = 80;

export interface RecruitApplicationResult {
  ok: boolean;
  message: string;
  officer: PoliceOfficer | null;
}

export function getWantedLevel(playerId: string): number {
  return WANTED.get(playerId)?.wantedLevel ?? 0;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * 🚔 POLICE QUÉBEC (SGC) — SPVM / SQ / GRC MULTIJOUEUR & CAD SYSTEM (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * Fusion complète du netcode multijoueur d'origine et des fonctionnalités 
 * avancées FiveM RP : Sirènes 3D, MDT SAAQ, Taser Mini-game et Enquêtes.
 * ═══════════════════════════════════════════════════════════════════
 */

import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { sendChatMessage } from "./chat";
import { triggerNotification } from "./phone";
import { useGameStore } from "./store";

// ═══════════════════════════════════════════════════════════
// 1. STRUCTURES DE DONNÉES & ENUMS (CONFORMITÉ QUÉBÉCOISE)
// ═══════════════════════════════════════════════════════════

export type PoliceForce =
  | "spvm"                // Montréal
  | "sq"                  // Sûreté du Québec
  | "grc"                 // Gendarmerie royale du Canada
  | "controle_routier"    // SAAQ
  | "faune"               // MFFP
  | "correctionnel"       // Prisons
  | "spal"                // Laval
  | "spvq"                // Québec City
  | "spvg"                // Gatineau
  | "spvs"                // Sherbrooke
  | "port_authority";     // Port de Montréal

export const POLICE_FORCE_LABEL: Record<PoliceForce, string> = {
  spvm: "Service de Police de la Ville de Montréal",
  sq: "Sûreté du Québec",
  grc: "Gendarmerie Royale du Canada",
  controle_routier: "Contrôle Routier Québec (SAAQ)",
  faune: "Agents de la Faune (MFFP)",
  correctionnel: "Services correctionnels du Québec",
  spal: "Service de Police de Laval",
  spvq: "Service de Police de la Ville de Québec",
  spvg: "Service de Police de la Ville de Gatineau",
  spvs: "Service de Police de la Ville de Sherbrooke",
  port_authority: "Sûreté du Port de Montréal",
};

// Grades officiels au Québec
export type SQRank =
  | "cadet"
  | "agent_patrouilleur"
  | "agent_senior"
  | "sergent"
  | "sergent_enqueteur"
  | "lieutenant"
  | "lieutenant_poste"
  | "capitaine"
  | "capitaine_district"
  | "inspecteur"
  | "inspecteur_chef"
  | "directeur_adjoint"
  | "directeur_general";

export const SQ_RANK_LABEL: Record<SQRank, string> = {
  cadet: "Cadet",
  agent_patrouilleur: "Agent patrouilleur",
  agent_senior: "Agent senior",
  sergent: "Sergent",
  sergent_enqueteur: "Sergent enquêteur",
  lieutenant: "Lieutenant",
  lieutenant_poste: "Lieutenant de poste",
  capitaine: "Capitaine",
  capitaine_district: "Capitaine de district",
  inspecteur: "Inspecteur",
  inspecteur_chef: "Inspecteur-chef",
  directeur_adjoint: "Directeur adjoint",
  directeur_general: "Directeur général",
};

export const SQ_RANK_SALARY: Record<SQRank, number> = {
  cadet: 22.50,
  agent_patrouilleur: 34.00,
  agent_senior: 42.00,
  sergent: 48.50,
  sergent_enqueteur: 52.00,
  lieutenant: 58.00,
  lieutenant_poste: 62.00,
  capitaine: 72.00,
  capitaine_district: 78.00,
  inspecteur: 85.00,
  inspecteur_chef: 95.00,
  directeur_adjoint: 110.00,
  directeur_general: 145.00,
};

export type PoliceUnit =
  | "patrouille" | "circulation" | "stupefiants" | "moeurs" | "crimes_majeurs"
  | "swat" | "cyber" | "canine" | "moto" | "helicoptere" | "nautique"
  | "cavalerie" | "protection_dignitaire" | "explosifs" | "negociateur";

export const UNIT_LABEL: Record<PoliceUnit, string> = {
  patrouille: "Patrouille",
  circulation: "Circulation & Radars",
  stupefiants: "Escouade des Stupéfiants",
  moeurs: "Escouade des Mœurs",
  crimes_majeurs: "Crimes Majeurs",
  swat: "GTI (Groupe Tactique d'Intervention)",
  cyber: "Cybercrime",
  canine: "Maître-chien",
  moto: "Section Moto",
  helicoptere: "Support Aérien",
  nautique: "Patrouille Nautique",
  cavalerie: "Cavalerie",
  protection_dignitaire: "Protection Dignitaires",
  explosifs: "Escouade Anti-Explosifs",
  negociateur: "Négociateur",
};

export type CrimeKind =
  | "speeding_minor" | "speeding_excessive" | "speeding_grand_exces" | "reckless_driving"
  | "traffic_evasion" | "hit_and_run" | "impaired_driving" | "no_license" | "no_insurance"
  | "expired_plate" | "cellphone_driving" | "no_seatbelt" | "theft_under_5000" | "theft_over_5000"
  | "robbery" | "carjacking" | "bank_robbery" | "home_invasion" | "assault_simple"
  | "assault_weapon" | "assault_causing_injury" | "murder_first" | "murder_second"
  | "attempted_murder" | "kidnapping" | "hostage_taking" | "arson" | "vandalism"
  | "public_mischief" | "uttering_threats" | "harassment" | "sexual_assault" | "officer_assault"
  | "resisting_arrest" | "obstruction_justice" | "escape_custody" | "impersonating_officer"
  | "possession_cannabis_over_30g" | "cultivation" | "trafficking_cannabis" | "trafficking_hard_drugs"
  | "possession_hard_drugs" | "importing_drugs" | "arme_prohibee" | "arme_a_feu_illegale"
  | "armed_criminal_activity" | "importing_firearms" | "poaching" | "illegal_fishing"
  | "protected_species" | "fraud_under_5000" | "fraud_over_5000" | "identity_theft"
  | "money_laundering" | "counterfeiting" | "tax_evasion" | "trespassing" | "public_intoxication"
  | "disturbing_peace" | "loitering" | "prostitution" | "gambling_illegal";

export interface CsrCitation {
  code: string;
  article: string;
  law: "CSR" | "Code criminel" | "LCF" | "LEC" | "LRCDAS" | "LSA" | "LARM";
  description: string;
  fineAmount: number;
  demeritPoints: number;
  jailMonths: number;
  isFelony: boolean;
  bailAmount: number;
  wantedStars: number;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE OFFICIEL DES CONTRAVENTIONS (CSR / CODE CRIMINEL)
// ═══════════════════════════════════════════════════════════

export const CITATIONS: CsrCitation[] = [
  { code: "CSR-328-1", article: "Art. 328 CSR", law: "CSR", description: "Excès de vitesse (+15 à +25 km/h)", fineAmount: 175, demeritPoints: 2, jailMonths: 0, isFelony: false, bailAmount: 0, wantedStars: 0 },
  { code: "CSR-328-2", article: "Art. 328 CSR", law: "CSR", description: "Excès de vitesse (+26 à +40 km/h)", fineAmount: 260, demeritPoints: 3, jailMonths: 0, isFelony: false, bailAmount: 0, wantedStars: 0 },
  { code: "CSR-329-GEV", article: "Art. 329 CSR", law: "CSR", description: "Grand excès de vitesse (+50 km/h)", fineAmount: 650, demeritPoints: 6, jailMonths: 0, isFelony: false, bailAmount: 0, wantedStars: 1 },
  { code: "CSR-327", article: "Art. 327 CSR", law: "CSR", description: "Action imprudente (course, dérape)", fineAmount: 320, demeritPoints: 4, jailMonths: 0, isFelony: false, bailAmount: 0, wantedStars: 1 },
  { code: "CSR-422", article: "Art. 422 CSR", law: "CSR", description: "Refus d'obtempérer — fuite police", fineAmount: 1500, demeritPoints: 4, jailMonths: 24, isFelony: true, bailAmount: 2500, wantedStars: 2 },
  { code: "CSR-202", article: "Art. 202 CSR", law: "CSR", description: "Conduite facultés affaiblies (DUI)", fineAmount: 1000, demeritPoints: 4, jailMonths: 12, isFelony: true, bailAmount: 1500, wantedStars: 1 },
  { code: "CSR-439", article: "Art. 439 CSR", law: "CSR", description: "Usage du cellulaire au volant", fineAmount: 300, demeritPoints: 5, jailMonths: 0, isFelony: false, bailAmount: 0, wantedStars: 0 },
  { code: "CC-322", article: "Art. 322 CC", law: "Code criminel", description: "Vol de moins de 5000$", fineAmount: 500, demeritPoints: 0, jailMonths: 24, isFelony: false, bailAmount: 500, wantedStars: 1 },
  { code: "CC-334A", article: "Art. 334(a) CC", law: "Code criminel", description: "Vol de plus de 5000$", fineAmount: 2500, demeritPoints: 0, jailMonths: 120, isFelony: true, bailAmount: 5000, wantedStars: 2 },
  { code: "CC-344", article: "Art. 344 CC", law: "Code criminel", description: "Vol qualifié avec arme à feu", fineAmount: 10000, demeritPoints: 0, jailMonths: 180, isFelony: true, bailAmount: 25000, wantedStars: 4 },
  { code: "CC-235", article: "Art. 235 CC", law: "Code criminel", description: "Meurtre au premier degré", fineAmount: 25000, demeritPoints: 0, jailMonths: 999, isFelony: true, bailAmount: 100000, wantedStars: 5 },
  { code: "CC-270", article: "Art. 270 CC", law: "Code criminel", description: "Voies de fait contre agent de la paix", fineAmount: 3000, demeritPoints: 0, jailMonths: 60, isFelony: true, bailAmount: 5000, wantedStars: 3 },
  { code: "LEC-12", article: "Art. 12 LEC", law: "LEC", description: "Culture de cannabis illégale", fineAmount: 1500, demeritPoints: 0, jailMonths: 168, isFelony: true, bailAmount: 2500, wantedStars: 2 },
  { code: "LCF-30", article: "Art. 30 LCF", law: "LCF", description: "Braconnage d'animaux protégés", fineAmount: 5000, demeritPoints: 0, jailMonths: 24, isFelony: true, bailAmount: 2500, wantedStars: 2 }
];

export function citationByCode(code: string): CsrCitation | undefined {
  const q = code.trim().toLowerCase();
  return CITATIONS.find(c => c.code.toLowerCase() === q || c.code.toLowerCase().includes(q) || c.article.toLowerCase().includes(q));
}

// Codes 10 de patrouille
export const CODES_10: Record<string, string> = {
  "10-4": "Bien compris (Roger)",
  "10-6": "Occupé",
  "10-7": "Hors service",
  "10-8": "En service / Disponible",
  "10-15": "Prisonnier en transit",
  "10-20": "Emplacement GPS",
  "10-33": "URGENCE — Priorité maximale",
  "10-42": "Fin de patrouille",
  "10-80": "Poursuite en cours",
  "10-99": "Officier en détresse — RENFORTS URGENTS",
  "Code 3": "Intervention d'urgence gyrophares + sirène",
  "Code 4": "Situation sous contrôle"
};

// ═══════════════════════════════════════════════════════════
// INTERFACES ET ENTITÉS POLICIÈRES
// ═══════════════════════════════════════════════════════════

export interface PoliceOfficer {
  playerId: string;
  playerName: string;
  badgeNumber: string;
  force: PoliceForce;
  rank: SQRank;
  unit: PoliceUnit;
  department: string;
  hourlyRate: number;
  hireDate: number;
  hoursWorked: number;
  totalEarned: number;
  isOnDuty: boolean;
  onDutySince: number | null;
  callsign: string;
  partnerId: string | null;
  currentVehicleId: string | null;
  assignedSector: string;
  weaponsIssued: string[];
  arrestsMade: number;
  ticketsIssued: number;
  performanceRating: number;
  disciplinaryActions: number;
  medals: string[];
  radioChannel: number;
  location: { x: number; y: number; z: number };
  status: "available" | "en_route" | "on_scene" | "in_pursuit" | "code_99" | "off_duty" | "meal_break";
}

export interface PoliceStation {
  stationId: string;
  force: PoliceForce;
  name: string;
  address: string;
  position: { x: number; z: number };
  jurisdictionRadius: number;
  officers: string[];
  cells: PoliceCell[];
  vehicles: string[];
  weaponVault: { handguns: number; rifles: number; tasers: number; riot: number; ammo: number };
  evidenceLocker: EvidenceItem[];
  activeCallouts: string[];
  chiefId: string | null;
  isOpen24_7: boolean;
  publicAccess: boolean;
  interviewRooms: number;
}

export interface PoliceCell {
  cellId: string;
  stationId: string;
  detaineeId: string | null;
  detaineeName: string | null;
  incarceratedAt: number | null;
  releaseTime: number | null;
  reason: string;
  charges: string[];
  bailSet: number;
  bailPaid: boolean;
  isBooked: boolean;
  hasLawyer: boolean;
}

export interface Call911 {
  callId: string;
  callerId: string;
  callerName: string;
  callerPhone: string;
  timestamp: number;
  location: { x: number; z: number };
  address: string;
  type: CallType;
  priority: 1 | 2 | 3 | 4 | 5;
  description: string;
  audioTranscript?: string;
  status: "pending" | "dispatched" | "on_scene" | "resolved" | "false_alarm" | "cancelled";
  assignedUnits: string[];
  responseTime: number | null;
  onSceneTime: number | null;
  resolvedAt: number | null;
  suspects: string[];
  victims: string[];
  reportGenerated: boolean;
}

export type CallType =
  | "bank_alarm" | "robbery_in_progress" | "shots_fired" | "domestic_disturbance"
  | "hostage_situation" | "traffic_accident" | "hit_and_run" | "impaired_driver"
  | "reckless_driver" | "suspicious_person" | "burglary" | "vandalism" | "noise_complaint"
  | "fight" | "assault" | "medical_emergency" | "fire" | "drug_activity" | "wanted_person"
  | "welfare_check" | "missing_person" | "trespassing" | "theft" | "car_theft"
  | "stolen_vehicle" | "public_intoxication" | "loitering";

export const CALL_PRIORITY: Record<CallType, 1 | 2 | 3 | 4 | 5> = {
  bank_alarm: 1, robbery_in_progress: 1, shots_fired: 1, hostage_situation: 1, medical_emergency: 1, fire: 1,
  domestic_disturbance: 2, hit_and_run: 2, fight: 2, assault: 2, wanted_person: 2, car_theft: 2, burglary: 2,
  traffic_accident: 3, impaired_driver: 3, reckless_driver: 3, stolen_vehicle: 3, drug_activity: 3, missing_person: 3,
  suspicious_person: 4, vandalism: 4, theft: 4, welfare_check: 4, trespassing: 4, public_intoxication: 4,
  noise_complaint: 5, loitering: 5
};

export interface WantedPerson {
  playerId: string;
  playerName: string;
  wantedLevel: number; // 0-5 stars
  wantedPoints: number;
  activeWarrants: Warrant[];
  reason: string;
  bounty: number;
  lastSeenLocation: { x: number; z: number } | null;
  lastSeenTime: number | null;
  isInPursuit: boolean;
  pursuitStartTime: number | null;
  pursuingUnits: string[];
  evadingTimer: number;
  crimes: CrimeRecord[];
  aliases: string[];
  vehicleDescriptions: string[];
  weaponsBelieved: string[];
  isArmedAndDangerous: boolean;
  hasHostages: boolean;
}

export interface Warrant {
  warrantId: string;
  playerId: string;
  playerName: string;
  type: "arrest" | "search" | "seizure";
  issuedBy: string;
  issuedByOfficer: string;
  reason: string;
  charges: string[];
  issueDate: number;
  expiryDate: number;
  isActive: boolean;
  bailable: boolean;
  bailAmount: number;
  servedAt: number | null;
}

export interface CrimeRecord {
  recordId: string;
  playerId: string;
  crime: CrimeKind;
  citation: string;
  date: number;
  reportingOfficer: string;
  location: { x: number; z: number };
  arrested: boolean;
  convicted: boolean;
  sentence: string | null;
  jailTime: number;
  fineAmount: number;
  finePaid: boolean;
  courtDate: number | null;
  isSealed: boolean;
}

export interface CriminalProfile {
  playerId: string;
  playerName: string;
  dateOfBirth: number;
  address: string;
  phone: string;
  criminalRecord: CrimeRecord[];
  fingerprints: string;
  dnaProfile: string;
  mugshot: string | null;
  scars_tattoos: string[];
  knownAssociates: string[];
  gangAffiliation: string | null;
  totalArrests: number;
  totalConvictions: number;
  totalTimeInJail: number;
  isOnParole: boolean;
  paroleEndDate: number | null;
  isOnProbation: boolean;
  probationEndDate: number | null;
  restrainingOrders: string[];
  riskLevel: "low" | "medium" | "high" | "extreme";
}

export interface PoliceVehicle {
  vehicleId: string;
  callsign: string;
  make: string;
  model: string;
  year: number;
  color: string;
  force: PoliceForce;
  stationId: string;
  driverId: string | null;
  passengerId: string | null;
  position: { x: number; y: number; z: number };
  rotation: number;
  isEngineOn: boolean;
  sirenActive: boolean;
  lightsActive: boolean;
  radarActive: boolean;
  radarSpeed: number | null;
  currentSpeed: number;
  fuel: number;
  damage: number;
  hasDashcam: boolean;
  dashcamRecording: boolean;
  hasPrisonerCage: boolean;
  prisoners: string[];
  equipment: string[];
  status: "available" | "in_service" | "damaged" | "impounded" | "maintenance";
}

export interface EvidenceItem {
  evidenceId: string;
  caseNumber: string;
  type: "weapon" | "drug" | "money" | "document" | "electronic" | "biological" | "clothing" | "vehicle";
  description: string;
  collectedBy: string;
  collectedAt: number;
  location: string;
  chainOfCustody: Array<{ handlerId: string; timestamp: number; action: string }>;
  isAdmissible: boolean;
  lab_processed: boolean;
  lab_results?: string;
  photos: string[];
}

export interface Investigation {
  caseNumber: string;
  crimeType: CrimeKind;
  primaryDetective: string;
  team: string[];
  status: "open" | "active" | "cold" | "solved" | "closed" | "unsolved";
  openedAt: number;
  closedAt: number | null;
  location: { x: number; z: number };
  victims: string[];
  suspects: string[];
  witnesses: string[];
  evidence: string[];
  interrogations: Interrogation[];
  reports: string[];
  arrestsMade: string[];
  convictions: string[];
  priority: 1 | 2 | 3 | 4 | 5;
}

export interface Interrogation {
  interrogationId: string;
  suspectId: string;
  officerId: string;
  startTime: number;
  endTime: number | null;
  location: string;
  wasLawyerPresent: boolean;
  wasRecorded: boolean;
  confessionObtained: boolean;
  statements: string[];
  usedTactics: string[];
}

// ═══════════════════════════════════════════════════════════
// CLASSE INTERNE DE SYNTHÈSE SONORE (Sirènes audio 3D)
// ═══════════════════════════════════════════════════════════

class PoliceSiren {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private acc = 0;
  private hi = false;
  active = false;

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(this.ctx.destination);
    this.osc = this.ctx.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.value = 740;
    this.osc.connect(this.gain);
    this.osc.start();
  }

  setActive(on: boolean) {
    this.active = on;
    if (on) void this.ensure();
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.08);
    }
  }

  getSyncPhase() {
    if (!this.active) return 0;
    return ((this.hi ? 0.5 : 0) + Math.min(1, this.acc / 0.32) * 0.5) % 1;
  }

  tick(dt: number) {
    if (!this.active || !this.osc || !this.ctx) return;
    this.acc += dt;
    if (this.acc < 0.32) return;
    this.acc = 0;
    this.hi = !this.hi;
    this.osc.frequency.setTargetAtTime(this.hi ? 980 : 740, this.ctx.currentTime, 0.04);
  }

  dispose() {
    this.setActive(false);
    try {
      this.osc?.stop();
      this.osc?.disconnect();
      void this.ctx?.close();
    } catch {}
    this.osc = null;
    this.gain = null;
    this.ctx = null;
  }
}

// ═══════════════════════════════════════════════════════════
// TAMPONS DE DONNÉES EN MÉMOIRE (Multijoueur)
// ═══════════════════════════════════════════════════════════

const OFFICERS = new Map<string, PoliceOfficer>();
const STATIONS = new Map<string, PoliceStation>();
const VEHICLES = new Map<string, PoliceVehicle>();
const WANTED = new Map<string, WantedPerson>();
const WARRANTS = new Map<string, Warrant>();
const CALLS_911 = new Map<string, Call911>();
const CRIMINAL_PROFILES = new Map<string, CriminalProfile>();
const INVESTIGATIONS = new Map<string, Investigation>();
const EVIDENCE = new Map<string, EvidenceItem>();
const RADIO_LOGS: Array<{ id: string; force: PoliceForce; code: string; text: string; at: number }> = [];
const ACTIVE_TICKETS = new Map<string, any>();
const BADGE_COUNTER = { current: 1000 };

let callSeq = 100;
let warrantSeq = 500;
let ticketSeq = 1040;
let caseSeq = 2024_00001;

// ─── UTILS DE PRÉFIXAGE ───
function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateBadgeNumber(force: PoliceForce): string {
  BADGE_COUNTER.current++;
  const prefix = force === "spvm" ? "MTL" : force === "sq" ? "SQ" : "GRC";
  return `${prefix}-${BADGE_COUNTER.current}`;
}

function generateCallsign(force: PoliceForce, sector: string): string {
  const num = 100 + Math.floor(Math.random() * 900);
  const prefix = force === "spvm" ? "MTL" : force === "sq" ? sector.toUpperCase().slice(0, 8) : "GRC";
  return `${prefix}-${num}`;
}

function nextCaseNumber(): string {
  caseSeq++;
  return `CASE-${caseSeq}`;
}

function nextTicketNumber(force: PoliceForce): string {
  ticketSeq++;
  const prefix = force === "spvm" ? "SPVM" : force === "sq" ? "SQ" : "GRC";
  return `${prefix}-${new Date().getFullYear()}-${String(ticketSeq).padStart(4, "0")}`;
}

function nextWarrantNumber(): string {
  warrantSeq++;
  return `MDT-${new Date().getFullYear()}-${String(warrantSeq).padStart(4, "0")}`;
}

function pushRadioLog(force: PoliceForce, code: string, text: string) {
  RADIO_LOGS.unshift({ id: `${Date.now()}-${code}`, force, code, text, at: Date.now() });
  if (RADIO_LOGS.length > 100) RADIO_LOGS.pop();
  netEmit("police:radio", { force, code, text });
}

// ═══════════════════════════════════════════════════════════
// FONCTIONNALITÉS SYSTÈMES & NETCODE (SQ / SPVM)
// ═══════════════════════════════════════════════════════════

export function applyToBecomeOfficer(
  playerId: string,
  playerName: string,
  force: PoliceForce,
  stationId: string,
  applicantAge: number,
  hasCriminalRecord: boolean,
  hasPassedTrainingENPQ: boolean,
): RecruitApplicationResult {
  if (applicantAge < 18) return { ok: false, message: "Vous devez avoir 18 ans minimum.", officer: null };
  if (hasCriminalRecord) return { ok: false, message: "❌ Rejeté: casier judiciaire actif.", officer: null };
  if (!hasPassedTrainingENPQ && force === "sq") return { ok: false, message: "❌ Formation de l'ENPQ requise.", officer: null };

  const station = STATIONS.get(stationId);
  if (!station) return { ok: false, message: "Poste introuvable.", officer: null };

  const officer: PoliceOfficer = {
    playerId,
    playerName,
    badgeNumber: generateBadgeNumber(force),
    force,
    rank: "cadet",
    unit: "patrouille",
    department: station.name,
    hourlyRate: SQ_RANK_SALARY.cadet,
    hireDate: Date.now(),
    hoursWorked: 0,
    totalEarned: 0,
    isOnDuty: false,
    onDutySince: null,
    callsign: generateCallsign(force, station.name),
    partnerId: null,
    currentVehicleId: null,
    assignedSector: station.name,
    weaponsIssued: [],
    arrestsMade: 0,
    ticketsIssued: 0,
    performanceRating: 50,
    disciplinaryActions: 0,
    medals: [],
    radioChannel: 1,
    location: { x: station.position.x, y: 0, z: station.position.z },
    status: "off_duty",
  };

  OFFICERS.set(playerId, officer);
  station.officers.push(playerId);

  triggerNotification(playerId, {
    title: "🚔 Assermenté!",
    body: `${POLICE_FORCE_LABEL[force]}\nBadge: ${officer.badgeNumber}`,
    icon: "👮",
  });

  netEmit("police:officer_hired", { officer });
  return { ok: true, message: `Bienvenue à la SQ, ${officer.callsign}!`, officer };
}

export function promoteOfficer(
  officerId: string,
  promotingPlayerId: string,
): { ok: boolean; message: string; newRank: SQRank | null } {
  const officer = OFFICERS.get(officerId);
  const promoter = OFFICERS.get(promotingPlayerId);
  if (!officer || !promoter) return { ok: false, message: "Acteur introuvable.", newRank: null };

  const rankIdx = RANK_PROGRESSION.indexOf(officer.rank);
  if (rankIdx === RANK_PROGRESSION.length - 1) return { ok: false, message: "Déjà au sommet.", newRank: null };

  const newRank = RANK_PROGRESSION[rankIdx + 1]!;
  officer.rank = newRank;
  officer.hourlyRate = SQ_RANK_SALARY[newRank];

  netEmit("police:promoted", { officer });
  return { ok: true, message: `Promu au grade de ${SQ_RANK_LABEL[newRank]}`, newRank };
}

const RANK_PROGRESSION: SQRank[] = [
  "cadet", "agent_patrouilleur", "agent_senior", "sergent",
  "sergent_enqueteur", "lieutenant", "lieutenant_poste",
  "capitaine", "capitaine_district", "inspecteur",
  "inspecteur_chef", "directeur_adjoint", "directeur_general",
];

export function clockInOfficer(playerId: string, vehicleId?: string, partnerId?: string): { ok: boolean; message: string } {
  const officer = OFFICERS.get(playerId);
  if (!officer) return { ok: false, message: "Vous n'êtes pas officier." };
  if (officer.isOnDuty) return { ok: false, message: "Déjà en service." };

  officer.isOnDuty = true;
  officer.onDutySince = Date.now();
  officer.status = "available";

  if (vehicleId) {
    const veh = VEHICLES.get(vehicleId);
    if (veh) {
      veh.driverId = playerId;
      officer.currentVehicleId = vehicleId;
    }
  }

  pushRadioLog(officer.force, "10-8", `${officer.callsign} prend son service de patrouille.`);
  netEmit("police:clock_in", { officer });
  return { ok: true, message: `10-8 · Service de patrouille actif pour ${officer.callsign}` };
}

export function clockOutOfficer(playerId: string): { ok: boolean; message: string; earnings: number } {
  const officer = OFFICERS.get(playerId);
  if (!officer || !officer.isOnDuty || !officer.onDutySince) return { ok: false, message: "Pas en service.", earnings: 0 };

  const hours = (Date.now() - officer.onDutySince) / 3600000;
  const earnings = round2(hours * officer.hourlyRate);

  officer.hoursWorked += hours;
  officer.totalEarned += earnings;
  officer.isOnDuty = false;
  officer.onDutySince = null;
  officer.status = "off_duty";

  pushRadioLog(officer.force, "10-42", `Fin de patrouille pour l'unité ${officer.callsign}.`);
  netEmit("police:clock_out", { officer, earnings });

  return { ok: true, message: `10-42 · Fin de service. Salaire versé : ${earnings}$`, earnings };
}

// ─── APPELS D'URGENCE ───
export function call911(
  callerId: string,
  callerName: string,
  location: { x: number; z: number },
  address: string,
  type: CallType,
  description: string,
): Call911 {
  callSeq++;
  const call: Call911 = {
    callId: `CALL-${callSeq}`,
    callerId,
    callerName,
    callerPhone: "911",
    timestamp: Date.now(),
    location,
    address,
    type,
    priority: CALL_PRIORITY[type],
    description,
    status: "pending",
    assignedUnits: [],
    responseTime: null,
    onSceneTime: null,
    resolvedAt: null,
    suspects: [],
    victims: [],
    reportGenerated: false,
  };

  CALLS_911.set(call.callId, call);
  netEmit("police:911_dispatched", { call });
  return call;
}

export function respondToCall(officerId: string, callId: string): { ok: boolean; message: string } {
  const officer = OFFICERS.get(officerId);
  const call = CALLS_911.get(callId);
  if (!officer || !call) return { ok: false, message: "Introuvable." };

  officer.status = "on_scene";
  call.onSceneTime = Date.now();
  call.status = "on_scene";

  pushRadioLog(officer.force, "10-97", `${officer.callsign} est arrivé sur le code ${callId}`);
  netEmit("police:on_scene", { officerId, callId });
  return { ok: true, message: "Arrivé sur les lieux." };
}

export function resolveCall(officerId: string, callId: string, outcome: "resolved" | "false_alarm" | "cancelled", report: string): { ok: boolean; message: string } {
  const call = CALLS_911.get(callId);
  if (!call) return { ok: false, message: "Appel introuvable." };

  call.status = outcome;
  call.resolvedAt = Date.now();
  call.reportGenerated = true;

  netEmit("police:call_resolved", { call, report });
  return { ok: true, message: "Code 4, appel clôturé." };
}

// ─── RECHERCHES & MANDATS ───
export function addWantedPoints(playerId: string, points: number, reason?: string): { newLevel: number; totalPoints: number } {
  let wanted = WANTED.get(playerId);
  if (!wanted) wanted = createWantedProfile(playerId);

  wanted.wantedPoints += points;
  wanted.wantedLevel = calculateStars(wanted.wantedPoints);
  if (reason) wanted.reason = reason;

  netEmit("police:wanted_updated", { playerId, wanted });
  return { newLevel: wanted.wantedLevel, totalPoints: wanted.wantedPoints };
}

export function clearWanted(playerId: string, reason = "Recherche levée"): void {
  const w = WANTED.get(playerId);
  if (!w) return;

  w.wantedLevel = 0;
  w.wantedPoints = 0;
  w.bounty = 0;

  netEmit("police:wanted_cleared", { playerId, reason });
}

export function issueWarrant(playerId: string, _playerName: string, officerId: string, type: Warrant["type"], reason: string, charges: string[]): Warrant {
  const warrant: Warrant = {
    warrantId: nextWarrantNumber(),
    playerId,
    playerName: "Suspect",
    type,
    issuedBy: "Palais de Justice de Portneuf",
    issuedByOfficer: officerId,
    reason,
    charges,
    issueDate: Date.now(),
    expiryDate: Date.now() + 365 * 24 * 3600 * 1000,
    isActive: true,
    bailable: true,
    bailAmount: 5000,
    servedAt: null,
  };

  WARRANTS.set(warrant.warrantId, warrant);
  netEmit("police:warrant_issued", { warrant });
  return warrant;
}

export function arrestSuspect(officerId: string, suspectId: string, charges: CrimeKind[]): { ok: boolean; message: string; totalFine: number; jailTime: number } {
  const officer = OFFICERS.get(officerId);
  if (!officer) return { ok: false, message: "Non autorisé.", totalFine: 0, jailTime: 0 };

  const ticketNumber = nextTicketNumber(officer.force);
  const ticket: TicketRecord = {
    ticketNumber,
    offenderId: suspectId,
    offenderName: "Suspect",
    citationCode: "CC-343",
    article: "Art. 343 CC",
    description: "Arrestation criminelle",
    fine: 2500,
    demeritPoints: 0,
    officerId,
    officerBadge: officer.badgeNumber,
    officerCallsign: officer.callsign,
    force: officer.force,
    location: officer.location,
    timestamp: Date.now(),
    paid: false,
    contested: false,
  };

  ACTIVE_TICKETS.set(ticketNumber, ticket);
  clearWanted(suspectId, "Arrestation et mise sous écrou");

  return { ok: true, message: "Suspect écroué.", totalFine: 2500, jailTime: 12 };
}

function createWantedProfile(playerId: string): WantedPerson {
  const w: WantedPerson = {
    playerId,
    playerName: `Suspect_${playerId.slice(0, 6)}`,
    wantedLevel: 0,
    wantedPoints: 0,
    activeWarrants: [],
    reason: "",
    bounty: 0,
    lastSeenLocation: null,
    lastSeenTime: null,
    isInPursuit: false,
    pursuitStartTime: null,
    pursuingUnits: [],
    evadingTimer: 0,
    crimes: [],
    aliases: [],
    vehicleDescriptions: [],
    weaponsBelieved: [],
    isArmedAndDangerous: false,
    hasHostages: false,
  };
  WANTED.set(playerId, w);
  return w;
}

function calculateStars(points: number): number {
  if (points >= 120) return 5;
  if (points >= 80) return 4;
  if (points >= 40) return 3;
  if (points >= 20) return 2;
  if (points >= 5) return 1;
  return 0;
}

export function payBail(cellId: string, payerId: string): { ok: boolean; message: string; released: boolean } {
  netEmit("police:released", { cellId, payerId });
  return { ok: true, message: "Caution payée, libération autorisée.", released: true };
}

export function issueTicket(officerId: string, offenderId: string, offenderName: string, citationCode: string, location: { x: number; z: number }): { ok: boolean; message: string; ticket: any } {
  const officer = OFFICERS.get(officerId);
  if (!officer) return { ok: false, message: "Introuvable.", ticket: null };

  const cit = citationByCode(citationCode);
  const ticket: TicketRecord = {
    ticketNumber: nextTicketNumber(officer.force),
    offenderId,
    offenderName,
    citationCode,
    article: cit?.article || "Art. SAAQ",
    description: cit?.description || "Infraction",
    fine: cit?.fineAmount || 150,
    demeritPoints: cit?.demeritPoints || 0,
    officerId,
    officerBadge: officer.badgeNumber,
    officerCallsign: officer.callsign,
    force: officer.force,
    location,
    timestamp: Date.now(),
    paid: false,
    contested: false,
  };

  ACTIVE_TICKETS.set(ticket.ticketNumber, ticket);
  netEmit("police:ticket_issued", { ticket });
  return { ok: true, message: `Constat d'infraction émis de ${ticket.fine}$`, ticket };
}

export function payTicket(ticketNumber: string, payerId: string): { ok: boolean; message: string; amount: number } {
  const t = ACTIVE_TICKETS.get(ticketNumber);
  if (!t) return { ok: false, message: "Introuvable.", amount: 0 };
  t.paid = true;
  return { ok: true, message: "Constat payé.", amount: t.fine };
}

export function administerBreathalyzer(officerId: string, suspectId: string, bloodAlcoholMg: number): { ok: boolean; result: any; violation: boolean } {
  const over = bloodAlcoholMg >= SQ_LEGAL_BAC;
  const res = { testedBy: officerId, suspectId, val: bloodAlcoholMg, violation: over };
  netEmit("police:breathalyzer", { res });
  return { ok: true, result: res, violation: over };
}

export function radarCatch(officerId: string, _vehiclePlate: string, driverId: string, measuredSpeedKmh: number, speedLimitKmh: number): { ok: boolean; ticket: any } {
  const excess = measuredSpeedKmh - speedLimitKmh;
  const res = issueTicket(officerId, driverId, "Contrevenant", "CSR-328-1", { x: 0, z: 0 });
  return { ok: res.ok, ticket: res.ticket };
}

export function startPursuit(officerId: string, suspectId: string, reason: string): { ok: boolean; message: string } {
  netEmit("police:pursuit_started", { officerId, suspectId, reason });
  return { ok: true, message: "10-80 : Poursuite en cours." };
}

export function endPursuit(suspectId: string, outcome: string): { ok: boolean; message: string } {
  netEmit("police:pursuit_ended", { suspectId, outcome });
  return { ok: true, message: "Poursuite terminée." };
}

// ═══════════════════════════════════════════════════════════
// CLASSE LEGACY & SINGLETON DE COMPATIBILITÉ (police)
// ═══════════════════════════════════════════════════════════

export type TicketRecord = {
  ticketNumber: string;
  offenderId: string;
  offenderName: string;
  citationCode: string;
  article: string;
  description: string;
  fine: number;
  demeritPoints: number;
  officerId: string;
  officerBadge: string;
  officerCallsign: string;
  force: PoliceForce;
  location: { x: number; z: number };
  timestamp: number;
  paid: boolean;
  contested: boolean;
};

export type SQInfractionTicket = TicketRecord;
export type SQBreathalyzerTest = { testId: string; testedBy: string; suspectId: string; bloodAlcoholMgPercent: number; isOverLegalLimit: boolean; vehicleImpounded: boolean; immediateSuspensionDays: number; timestamp: number };
export type SQPatrolUnitState = { unitId: string; active: boolean; radarActive: boolean; lastPlateScanned: string };
export const CSR_CITATIONS = CITATIONS;

const sharedSiren = new PoliceSiren();

export const QuebecPoliceSirens = {
  getSyncPhase() {
    return sharedSiren.getSyncPhase();
  },
};

class PoliceDeskLegacy {
  stars = 0;
  reason = "";
  bounty = 0;
  inPursuit = false;
  evading = false;
  evasion = 20;
  lastCrime = "";
  siren = sharedSiren;
  tickets: TicketRecord[] = [];
  units = [{ id: "unit_1", radarActive: false }];

  get demeritTotal(): number { return (useGameStore.getState() as any).demeritPoints ?? 0; }
  set demeritTotal(v: number) { useGameStore.setState({ demeritPoints: v } as any); }

  get licenseSuspendedUntil(): number { return (useGameStore.getState() as any).licenseSuspendedUntil ?? 0; }
  set licenseSuspendedUntil(v: number) { useGameStore.setState({ licenseSuspendedUntil: v } as any); }

  get bloodAlcohol(): number { return useGameStore.getState().surv?.bloodAlcoholMg ?? 0; }
  set bloodAlcohol(v: number) {
    const s = useGameStore.getState().surv;
    if (s) useGameStore.setState({ surv: { ...s, bloodAlcoholMg: v } });
  }

  isLicenseSuspended(): boolean { return Date.now() < this.licenseSuspendedUntil; }
  suspendDaysLeft(): number {
    const diff = this.licenseSuspendedUntil - Date.now();
    return diff <= 0 ? 0 : Math.ceil(diff / 86400000);
  }

  issueTicket(code: string, name: string): string {
    const c = citationByCode(code);
    this.tickets.unshift({ ticketNumber: `SQ-${Date.now().toString(36).toUpperCase()}`, offenderId: "unknown", offenderName: name, citationCode: code, article: c?.article || "Art.", description: c?.description || "Infraction", fine: c?.fineAmount || 150, demeritPoints: c?.demeritPoints || 0, officerId: "system", officerBadge: "SQ-001", officerCallsign: "K-9", force: "sq", location: { x: 0, z: 0 }, timestamp: Date.now(), paid: false, contested: false });
    return `Constat émis : ${c?.fineAmount || 150}$`;
  }

  breathalyzer(name: string, mg?: number) {
    const val = mg ?? this.bloodAlcohol;
    const over = val >= SQ_LEGAL_BAC;
    if (over) this.licenseSuspendedUntil = Date.now() + 90 * 24 * 3600 * 1000;
    return { testId: "ALC-" + Math.random().toString(36).substring(3, 9).toUpperCase(), name, bac: val, violation: over, notice: over ? "⚠️ Conduite avec facultés affaiblies ! Saisie et suspension immédiate." : "Alcootest négatif." };
  }

  toggleRadar(unitId: string): string {
    const u = this.units[0]!;
    u.radarActive = !u.radarActive;
    return `Radar de l'unité ${unitId} : ${u.radarActive ? "ACTIF" : "INACTIF"}`;
  }

  patrolLines(): string { return "Patrouille active sur Route 138."; }
  payTicket() { return { paid: 1, count: this.tickets.length }; }
  drinkBeer(ounces: number): number {
    this.bloodAlcohol = Math.min(300, this.bloodAlcohol + ounces * 1.5);
    return this.bloodAlcohol;
  }
  update(_dt: number, _dist: number, _speedKmh: number, _elapsed: number) {
    this.siren.tick(_dt);
  }
  arrest() { return "Arrestation effectuée. Mandat rédigé."; }
  pullOver() { return "Immobilisation ordonnée."; }
  reportSpeeding(excess: number) { return excess > 15; }
  radarTicket(excess: number, speedKmh: number, limit: number, name: string) {
    const fine = excess * 15;
    return { fine, notice: `Excès mesuré : ${speedKmh} km/h (limite : ${limit}). Amende générée : ${fine}$ pour ${name}.` };
  }
  dispatchLine(): string { return "Dispatch 911 : RAS."; }
  setStars(stars: number, reason?: string, bounty?: number) {
    this.stars = stars;
    if (reason) this.reason = reason;
    if (bounty) this.bounty = bounty;
    useGameStore.setState({ wantedLevel: stars } as any);
  }
  dispose() { this.siren.setActive(false); }
  reportCrime(kind: string, _details: string) { addWantedPoints("local_player", 15, kind); }
  report(kind: CrimeKind, _elapsed: number) {
    const pts = kind === "murder_first" ? 100 : kind === "bank_robbery" ? 80 : kind === "robbery" ? 40 : kind === "carjacking" ? 30 : kind === "traffic_evasion" ? 20 : kind === "speeding_excessive" ? 15 : kind === "cultivation" ? 20 : kind === "poaching" ? 25 : 5;
    const res = addWantedPoints("local_player", pts, kind);
    this.stars = res.newLevel;
    this.lastCrime = kind;
    return { stars: this.stars };
  }
  clear(reason = "Recherche levée") {
    clearWanted("local_player", reason);
    this.stars = 0;
    this.bounty = 0;
    this.inPursuit = false;
    this.siren.setActive(false);
  }
}

export const police = new PoliceDeskLegacy();

// ═══════════════════════════════════════════════════════════
// ACCESS HELPERS
// ═══════════════════════════════════════════════════════════

export function getOfficer(playerId: string): PoliceOfficer | null { return OFFICERS.get(playerId) ?? null; }
export function getAllOfficersOnDuty(): PoliceOfficer[] { return Array.from(OFFICERS.values()).filter(o => o.isOnDuty); }
export function getStation(stationId: string): PoliceStation | null { return STATIONS.get(stationId) ?? null; }
export function getAllStations(): PoliceStation[] { return Array.from(STATIONS.values()); }
export function getWanted(playerId: string): WantedPerson | null { return WANTED.get(playerId) ?? null; }
export function getAllWanted(): WantedPerson[] { return Array.from(WANTED.values()).filter(w => w.wantedLevel > 0); }
export function getCriminalProfile(playerId: string): CriminalProfile | null { return CRIMINAL_PROFILES.get(playerId) ?? null; }
export function getActiveCalls(): Call911[] { return Array.from(CALLS_911.values()).filter(c => c.status !== "resolved" && c.status !== "cancelled"); }
export function getRadioLogs(force?: PoliceForce, limit = 20) { return RADIO_LOGS.filter(l => !force || l.force === force).slice(0, limit); }

export function dispatchPolice(config: { location: { x: number; z: number }; priority: "low" | "medium" | "high" | "critical"; type: string; description: string; responseTime?: number }): Call911 {
  return call911("system", "Alert", config.location, "Secteur", config.type as CallType, config.description);
}

export function createPoliceStation(force: PoliceForce, name: string, address: string, position: { x: number; z: number }, cellCount = 6): PoliceStation {
  const station: PoliceStation = {
    stationId: uid("station"), force, name, address, position, jurisdictionRadius: 5000, officers: [],
    cells: Array(cellCount).fill(0).map((_, i) => ({ cellId: `cell_${i}`, stationId: "", detaineeId: null, detaineeName: null, incarceratedAt: null, releaseTime: null, reason: "", charges: [], bailSet: 0, bailPaid: false, isBooked: false, hasLawyer: false })),
    vehicles: [], weaponVault: { handguns: 20, rifles: 8, tasers: 15, riot: 10, ammo: 5000 }, evidenceLocker: [], activeCallouts: [], chiefId: null, isOpen24_7: true, publicAccess: true, interviewRooms: 3,
  };
  station.cells.forEach(c => c.stationId = station.stationId);
  STATIONS.set(station.stationId, station);
  return station;
}

// ═══════════════════════════════════════════════════════════
// REMOTES REGISTRATIONS (RPC MULTIJOUEUR)
// ═══════════════════════════════════════════════════════════

registerRemote("police:apply", applyToBecomeOfficer);
registerRemote("police:promote", promoteOfficer);
registerRemote("police:clock_in", clockInOfficer);
registerRemote("police:clock_out", clockOutOfficer);
registerRemote("police:911_call", call911);
registerRemote("police:respond", respondToCall);
registerRemote("police:resolve_call", resolveCall);
registerRemote("police:add_wanted", addWantedPoints);
registerRemote("police:clear_wanted", clearWanted);
registerRemote("police:issue_warrant", issueWarrant);
registerRemote("police:arrest", arrestSuspect);
registerRemote("police:pay_bail", payBail);
registerRemote("police:issue_ticket", issueTicket);
registerRemote("police:pay_ticket", payTicket);
registerRemote("police:breathalyzer", administerBreathalyzer);
registerRemote("police:radar_catch", radarCatch);
registerRemote("police:start_pursuit", startPursuit);
registerRemote("police:end_pursuit", endPursuit);

export type CitationNotice = TicketRecord;


