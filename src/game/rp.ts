import { VILLAGES } from "./worlddata";

export const QC_TAX = 0.14975;

export type RpJobId =
  | "civil"
  | "policier"
  | "ambulancier"
  | "mecanicien"
  | "taxi"
  | "livreur"
  | "pecheur"
  | "avocat"
  | "commercant"
  | "criminel";

export const RP_JOBS: Array<{ id: RpJobId; name: string; salary: number; hint: string }> = [
  { id: "civil", name: "Civil", salary: 300, hint: "Pas de patrouille." },
  { id: "policier", name: "Policier", salary: 1200, hint: "Sûreté du Québec." },
  { id: "ambulancier", name: "Ambulancier", salary: 1100, hint: "Urgence 911." },
  { id: "mecanicien", name: "Mécanicien", salary: 900, hint: "Garage Gosselin." },
  { id: "taxi", name: "Chauffeur taxi", salary: 700, hint: "138 et villages." },
  { id: "livreur", name: "Livreur", salary: 600, hint: "Colis du comté." },
  { id: "pecheur", name: "Pêcheur", salary: 650, hint: "Fleuve et rivières." },
  { id: "avocat", name: "Avocat", salary: 1500, hint: "Palais, Portneuf." },
  { id: "commercant", name: "Commerçant", salary: 800, hint: "Comptoir et REQ." },
  { id: "criminel", name: "Criminel", salary: 0, hint: "Pas de paie. Le rang paie autrement." },
];

export interface Deed {
  id: string;
  name: string;
  town: string;
  price: number;
  x: number;
  z: number;
}

function townCenter(id: string): [number, number] {
  const v = VILLAGES.find((t) => t.id === id);
  return v ? [v.center[0], v.center[1]] : [0, 0];
}

export const DEEDS: Deed[] = [
  { id: "H-PNF", name: "Maison du chef-lieu", town: "Portneuf", price: 980, x: townCenter("portneuf")[0] - 28, z: townCenter("portneuf")[1] + 22 },
  { id: "H-PTR", name: "Manoir Pont-Rouge", town: "Pont-Rouge", price: 1420, x: townCenter("pont_rouge")[0] + 36, z: townCenter("pont_rouge")[1] - 18 },
  { id: "H-DNC", name: "Loft Donnacona", town: "Donnacona", price: 860, x: townCenter("donnacona")[0] + 24, z: townCenter("donnacona")[1] + 18 },
  { id: "H-SRY", name: "Chalet Laurentien", town: "Saint-Raymond", price: 1180, x: townCenter("saint_raymond")[0] - 30, z: townCenter("saint_raymond")[1] + 20 },
  { id: "H-NVL", name: "Maison patrimoniale", town: "Neuville", price: 1340, x: townCenter("neuville")[0] - 22, z: townCenter("neuville")[1] + 16 },
  { id: "H-CPS", name: "Domaine du Cap", town: "Cap-Santé", price: 1100, x: townCenter("cap_sante")[0] + 20, z: townCenter("cap_sante")[1] + 18 },
  { id: "H-DSC", name: "Résidence du fleuve", town: "Deschambault", price: 920, x: townCenter("deschambault")[0] - 18, z: townCenter("deschambault")[1] + 20 },
  { id: "H-SMC", name: "Pavillon des Carrières", town: "Saint-Marc", price: 740, x: townCenter("saint_marc")[0] + 18, z: townCenter("saint_marc")[1] + 16 },
];

export interface AtmSpot {
  id: string;
  name: string;
  x: number;
  z: number;
}

export const ATM_SPOTS: AtmSpot[] = [
  { id: "atm_portneuf", name: "Desjardins Portneuf", x: townCenter("portneuf")[0] + 16, z: townCenter("portneuf")[1] + 10 },
  { id: "atm_pont", name: "Desjardins Pont-Rouge", x: townCenter("pont_rouge")[0] - 14, z: townCenter("pont_rouge")[1] + 8 },
  { id: "atm_donna", name: "Desjardins Donnacona", x: townCenter("donnacona")[0] - 16, z: townCenter("donnacona")[1] + 8 },
  { id: "atm_raymond", name: "Desjardins Saint-Raymond", x: townCenter("saint_raymond")[0] + 14, z: townCenter("saint_raymond")[1] + 8 },
  { id: "atm_cap", name: "Desjardins Cap-Santé", x: townCenter("cap_sante")[0] - 12, z: townCenter("cap_sante")[1] + 8 },
  { id: "atm_alban", name: "Desjardins Saint-Alban", x: townCenter("saint_alban")[0] + 12, z: townCenter("saint_alban")[1] + 8 },
  { id: "atm_sq", name: "Guichet du poste SQ", x: -82, z: -40 },
];

export interface GangDef {
  id: string;
  name: string;
  color: string;
  hint: string;
}

export const GANGS: GangDef[] = [
  { id: "G-01", name: "Léopards Noirs", color: "#dc2626", hint: "Saint-Alban, rangs." },
  { id: "G-02", name: "Vipers Tech", color: "#06b6d4", hint: "Pont-Rouge, 365." },
];

export type CrimeId = "theft" | "robbery" | "carjacking" | "drug_dealing" | "bank_robbery";

export interface CrimeDef {
  id: CrimeId;
  name: string;
  reward: number;
  stars: number;
  hint: string;
}

export const CRIMES: CrimeDef[] = [
  { id: "theft", name: "Vol à l'étalage", reward: 80, stars: 1, hint: "Rapide, petit risque." },
  { id: "robbery", name: "Braquage du rang", reward: 220, stars: 2, hint: "Dépanneur après minuit." },
  { id: "carjacking", name: "Vol de char", reward: 340, stars: 3, hint: "Pick-up sur la 138." },
  { id: "drug_dealing", name: "Passe de poche", reward: 180, stars: 2, hint: "Coin sombre." },
  { id: "bank_robbery", name: "Caisse Desjardins", reward: 720, stars: 4, hint: "Gros coup." },
];

export interface CrimeSpot {
  id: string;
  crime: CrimeId;
  x: number;
  z: number;
}

export const CRIME_SPOTS: CrimeSpot[] = [
  { id: "c_alban", crime: "theft", x: townCenter("saint_alban")[0] + 40, z: townCenter("saint_alban")[1] - 8 },
  { id: "c_donna", crime: "robbery", x: townCenter("donnacona")[0] - 40, z: townCenter("donnacona")[1] - 6 },
  { id: "c_pont", crime: "carjacking", x: townCenter("pont_rouge")[0] - 48, z: townCenter("pont_rouge")[1] + 24 },
  { id: "c_ray", crime: "drug_dealing", x: townCenter("saint_raymond")[0] + 48, z: townCenter("saint_raymond")[1] - 12 },
  { id: "c_bank", crime: "bank_robbery", x: townCenter("portneuf")[0] + 22, z: townCenter("portneuf")[1] + 10 },
];

export function jobById(id: string): (typeof RP_JOBS)[number] {
  return RP_JOBS.find((j) => j.id === id) ?? RP_JOBS[0]!;
}

export function deedById(id: string): Deed | undefined {
  return DEEDS.find((d) => d.id === id);
}

export function crimeById(id: CrimeId): CrimeDef {
  return CRIMES.find((c) => c.id === id) ?? CRIMES[0]!;
}

export function gangById(id: string | null): GangDef | undefined {
  return GANGS.find((g) => g.id === id);
}

export function withTax(price: number): { tax: number; total: number } {
  const tax = Math.round(price * QC_TAX);
  return { tax, total: price + tax };
}

export function nearestOf<T extends { x: number; z: number }>(list: T[], x: number, z: number, max: number): T | null {
  let best: T | null = null;
  let bestD = max;
  for (const item of list) {
    const d = Math.hypot(x - item.x, z - item.z);
    if (d < bestD) {
      best = item;
      bestD = d;
    }
  }
  return best;
}

export function payrollNet(job: RpJobId): number {
  const gross = jobById(job).salary;
  if (gross <= 0) return 0;
  return Math.max(1, Math.round(gross * 0.04 * (1 - QC_TAX)));
}