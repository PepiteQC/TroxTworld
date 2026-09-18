/**
 * Immobilier du comté — MLS, loyers, hypothèques, entretien.
 * S'appuie sur les actes (DEEDS) + locaux commerciaux. Horloge du jeu.
 */
import { houseValue, type HouseState } from "./house";
import { DEEDS, deedById, type Deed } from "./rp";
import { VILLAGES } from "./worlddata";

export type PropertyType = "house" | "apartment" | "business" | "warehouse" | "garage" | "penthouse";
export type PropertyZone = "village" | "rang" | "industrie" | "fleuve" | "laurentides" | "luxe";

export interface MarketProperty {
  id: string;
  kind: PropertyType;
  zone: PropertyZone;
  name: string;
  address: string;
  town: string;
  x: number;
  z: number;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  furnished: boolean;
  features: string[];
  rentPerDay: number;
  garageCapacity: number;
}

export interface ListingState {
  price: number;
  description: string;
  listed: boolean;
  views: number;
}

export interface RentalState {
  tenantName: string;
  rent: number;
  daysLeft: number;
}

export interface MortgageState {
  principal: number;
  monthlyPayment: number;
  remainingMonths: number;
  rate: number;
}

export interface RealtyState {
  commercials: string[];
  listings: Record<string, ListingState>;
  rentals: Record<string, RentalState>;
  condition: Record<string, number>;
  mortgages: Record<string, MortgageState>;
  visits: Array<{ id: string; propertyId: string; name: string; at: number }>;
  access: Record<string, string[]>;
}

export const EMPTY_REALTY: RealtyState = {
  commercials: [],
  listings: {},
  rentals: {},
  condition: {},
  mortgages: {},
  visits: [],
  access: {},
};

function village(id: string) {
  return VILLAGES.find((v) => v.id === id);
}

function at(id: string, dx: number, dz: number): { x: number; z: number; town: string } {
  const v = village(id);
  return { x: (v?.center[0] ?? 0) + dx, z: (v?.center[1] ?? 0) + dz, town: v?.name ?? id };
}

const HOUSE_META: Record<string, Pick<MarketProperty, "zone" | "bedrooms" | "bathrooms" | "squareFeet" | "features" | "rentPerDay" | "garageCapacity">> = {
  "H-PNF": { zone: "village", bedrooms: 3, bathrooms: 1, squareFeet: 1400, features: ["porche"], rentPerDay: 28, garageCapacity: 1 },
  "H-PTR": { zone: "luxe", bedrooms: 4, bathrooms: 2, squareFeet: 2200, features: ["jardin"], rentPerDay: 42, garageCapacity: 2 },
  "H-DNC": { zone: "industrie", bedrooms: 2, bathrooms: 1, squareFeet: 980, features: ["loft"], rentPerDay: 24, garageCapacity: 1 },
  "H-SRY": { zone: "laurentides", bedrooms: 3, bathrooms: 1, squareFeet: 1600, features: ["chalet", "bois"], rentPerDay: 36, garageCapacity: 1 },
  "H-NVL": { zone: "fleuve", bedrooms: 3, bathrooms: 2, squareFeet: 1800, features: ["patrimoine", "vue"], rentPerDay: 40, garageCapacity: 1 },
  "H-CPS": { zone: "luxe", bedrooms: 4, bathrooms: 2, squareFeet: 2000, features: ["domaine"], rentPerDay: 38, garageCapacity: 2 },
  "H-DSC": { zone: "fleuve", bedrooms: 3, bathrooms: 1, squareFeet: 1500, features: ["fleuve"], rentPerDay: 32, garageCapacity: 1 },
  "H-SMC": { zone: "rang", bedrooms: 2, bathrooms: 1, squareFeet: 1100, features: ["rang"], rentPerDay: 22, garageCapacity: 1 },
};

export const COMMERCIALS: MarketProperty[] = [
  {
    id: "C-APT",
    kind: "apartment",
    zone: "rang",
    name: "3½ du rang",
    address: "12 rang Saint-Alban",
    ...at("saint_alban", 18, -14),
    price: 520,
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 780,
    furnished: true,
    features: ["chauffé", "stationnement"],
    rentPerDay: 18,
    garageCapacity: 1,
  },
  {
    id: "C-GAR",
    kind: "garage",
    zone: "village",
    name: "Box Gosselin",
    address: "chemin Pont-Rouge",
    ...at("pont_rouge", -22, 16),
    price: 640,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 900,
    furnished: false,
    features: ["fosse", "porte 10 pi"],
    rentPerDay: 16,
    garageCapacity: 3,
  },
  {
    id: "C-COM",
    kind: "business",
    zone: "village",
    name: "Local du chef-lieu",
    address: "rue Notre-Dame, Portneuf",
    ...at("portneuf", 16, 10),
    price: 1800,
    bedrooms: 0,
    bathrooms: 2,
    squareFeet: 2200,
    furnished: true,
    features: ["vitrine", "arrière-boutique", "coffre"],
    rentPerDay: 48,
    garageCapacity: 0,
  },
  {
    id: "C-ENT",
    kind: "warehouse",
    zone: "industrie",
    name: "Entrepôt de la 138",
    address: "parc industriel, Donnacona",
    ...at("donnacona", 40, -28),
    price: 2200,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 4800,
    furnished: false,
    features: ["quai", "hauteur 6 m"],
    rentPerDay: 55,
    garageCapacity: 4,
  },
  {
    id: "C-PEN",
    kind: "penthouse",
    zone: "luxe",
    name: "Suite de l'hôtel",
    address: "hôtel Pont-Rouge, dernier étage",
    ...at("pont_rouge", 8, 4),
    price: 2400,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1600,
    furnished: true,
    features: ["vue", "concierge", "spa"],
    rentPerDay: 70,
    garageCapacity: 1,
  },
];

export const KIND_LABEL: Record<PropertyType, string> = {
  house: "Maison",
  apartment: "Logement",
  business: "Local commercial",
  warehouse: "Entrepôt",
  garage: "Garage",
  penthouse: "Suite",
};

export const ZONE_LABEL: Record<PropertyZone, string> = {
  village: "Village",
  rang: "Rang",
  industrie: "Industrie",
  fleuve: "Fleuve",
  laurentides: "Laurentides",
  luxe: "Domaine",
};

export function houseAsMarket(deed: Deed): MarketProperty {
  const meta = HOUSE_META[deed.id] ?? HOUSE_META["H-PNF"]!;
  return {
    id: deed.id,
    kind: "house",
    zone: meta.zone,
    name: deed.name,
    address: `${deed.town}`,
    town: deed.town,
    x: deed.x,
    z: deed.z,
    price: deed.price,
    bedrooms: meta.bedrooms,
    bathrooms: meta.bathrooms,
    squareFeet: meta.squareFeet,
    furnished: false,
    features: meta.features,
    rentPerDay: meta.rentPerDay,
    garageCapacity: meta.garageCapacity,
  };
}

export function catalog(): MarketProperty[] {
  return [...DEEDS.map(houseAsMarket), ...COMMERCIALS];
}

export function propertyById(id: string): MarketProperty | undefined {
  return catalog().find((p) => p.id === id);
}

export function isHouseDeed(id: string): boolean {
  return Boolean(deedById(id));
}

export function isCommercial(id: string): boolean {
  return COMMERCIALS.some((c) => c.id === id);
}

export function parseRealty(raw: unknown): RealtyState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_REALTY, listings: {}, rentals: {}, condition: {}, mortgages: {}, visits: [], access: {} };
  const d = raw as Partial<RealtyState>;
  return {
    commercials: Array.isArray(d.commercials) ? d.commercials.filter((x) => typeof x === "string") : [],
    listings: d.listings && typeof d.listings === "object" ? d.listings : {},
    rentals: d.rentals && typeof d.rentals === "object" ? d.rentals : {},
    condition: d.condition && typeof d.condition === "object" ? d.condition : {},
    mortgages: d.mortgages && typeof d.mortgages === "object" ? d.mortgages : {},
    visits: Array.isArray(d.visits) ? d.visits : [],
    access: d.access && typeof d.access === "object" ? d.access : {},
  };
}

export function ownedIds(ownedProps: string[], realty: RealtyState): string[] {
  return [...ownedProps, ...realty.commercials];
}

export function conditionOf(realty: RealtyState, id: string): number {
  return realty.condition[id] ?? 100;
}

export function evaluatedValue(p: MarketProperty, house: HouseState | undefined, realty: RealtyState): number {
  let v = p.kind === "house" && house ? houseValue({ id: p.id, name: p.name, town: p.town, price: p.price, x: p.x, z: p.z }, house) : p.price;
  const cond = conditionOf(realty, p.id);
  v = Math.round(v * (0.55 + cond / 200));
  const list = realty.listings[p.id];
  if (list?.listed) v = list.price;
  return v;
}

export function mlsList(owned: string[], realty: RealtyState): MarketProperty[] {
  const mine = new Set(ownedIds(owned, realty));
  return catalog().filter((p) => {
    if (mine.has(p.id)) return realty.listings[p.id]?.listed;
    return true;
  });
}

export function requestVisit(realty: RealtyState, propertyId: string, name: string): RealtyState {
  const row = { id: `vis_${Date.now().toString(36)}`, propertyId, name, at: Date.now() };
  const listing = realty.listings[propertyId];
  return {
    ...realty,
    visits: [row, ...realty.visits].slice(0, 12),
    listings: listing
      ? { ...realty.listings, [propertyId]: { ...listing, views: listing.views + 1 } }
      : realty.listings,
  };
}

const NPC_TENANTS = ["Les Côté", "Famille Gosselin", "M. Tremblay", "Les Bouchard", "Mme Lavoie"];

export function startRental(realty: RealtyState, id: string, days = 6): { ok: boolean; reason?: string; realty?: RealtyState } {
  if (realty.rentals[id]) return { ok: false, reason: "Déjà loué" };
  const p = propertyById(id);
  if (!p) return { ok: false, reason: "Bien introuvable" };
  if (conditionOf(realty, id) < 35) return { ok: false, reason: "Trop délabré pour louer" };
  const tenant = NPC_TENANTS[Math.floor(Math.random() * NPC_TENANTS.length)]!;
  return {
    ok: true,
    realty: {
      ...realty,
      rentals: { ...realty.rentals, [id]: { tenantName: tenant, rent: p.rentPerDay, daysLeft: days } },
    },
  };
}

export function evictRental(realty: RealtyState, id: string): RealtyState {
  const rentals = { ...realty.rentals };
  delete rentals[id];
  return { ...realty, rentals };
}

export function listForSale(realty: RealtyState, id: string, price: number, description: string): RealtyState {
  return {
    ...realty,
    listings: {
      ...realty.listings,
      [id]: { price: Math.max(100, Math.round(price)), description, listed: true, views: realty.listings[id]?.views ?? 0 },
    },
  };
}

export function unlist(realty: RealtyState, id: string): RealtyState {
  const cur = realty.listings[id];
  if (!cur) return realty;
  return { ...realty, listings: { ...realty.listings, [id]: { ...cur, listed: false } } };
}

export function maintainProperty(realty: RealtyState, id: string): RealtyState {
  const cur = conditionOf(realty, id);
  return {
    ...realty,
    condition: { ...realty.condition, [id]: Math.min(100, cur + 50) },
  };
}

export function addMortgage(realty: RealtyState, id: string, principal: number): RealtyState {
  const months = 10;
  const rate = 2.6;
  const monthlyPayment = Math.round((principal * (1 + (rate / 100) * months)) / months);
  return {
    ...realty,
    mortgages: {
      ...realty.mortgages,
      [id]: { principal, monthlyPayment, remainingMonths: months, rate },
    },
  };
}

export function tickRealty(realty: RealtyState, owned: string[]): { realty: RealtyState; rentIncome: number; mortgageDue: number; notice: string | null } {
  const ids = ownedIds(owned, realty);
  let rentIncome = 0;
  let mortgageDue = 0;
  const notices: string[] = [];
  const condition = { ...realty.condition };
  const rentals = { ...realty.rentals };
  const mortgages = { ...realty.mortgages };

  for (const id of ids) {
    const c = (condition[id] ?? 100) - 2;
    condition[id] = Math.max(8, c);
    const r = rentals[id];
    if (r) {
      if ((condition[id] ?? 0) < 30) {
        delete rentals[id];
        notices.push(`Locataire parti · ${r.tenantName}`);
      } else {
        rentIncome += r.rent;
        const left = r.daysLeft - 1;
        if (left <= 0) {
          delete rentals[id];
          notices.push(`Bail terminé · ${r.tenantName}`);
        } else rentals[id] = { ...r, daysLeft: left };
      }
    }
    const m = mortgages[id];
    if (m && m.remainingMonths > 0) {
      mortgageDue += m.monthlyPayment;
      const rem = m.remainingMonths - 1;
      if (rem <= 0) {
        delete mortgages[id];
        notices.push("Hypothèque soldée");
      } else mortgages[id] = { ...m, remainingMonths: rem };
    }
  }

  return {
    realty: { ...realty, condition, rentals, mortgages },
    rentIncome,
    mortgageDue,
    notice: notices[0] ?? (rentIncome > 0 ? `Loyers · ${rentIncome}\u00a0$` : null),
  };
}

export function searchProperties(zone?: PropertyZone, type?: PropertyType, maxPrice?: number): MarketProperty[] {
  return catalog().filter(
    (p) => (!zone || p.zone === zone) && (!type || p.kind === type) && (!maxPrice || p.price <= maxPrice),
  );
}

export function grantAccess(realty: RealtyState, id: string, name: string): RealtyState {
  const cur = realty.access[id] ?? [];
  if (cur.includes(name)) return realty;
  return { ...realty, access: { ...realty.access, [id]: [...cur, name] } };
}

export function revokeAccess(realty: RealtyState, id: string, name: string): RealtyState {
  const cur = realty.access[id] ?? [];
  return { ...realty, access: { ...realty.access, [id]: cur.filter((n) => n !== name) } };
}

export function nearestCommercial(x: number, z: number, max = 8): MarketProperty | null {
  let best: MarketProperty | null = null;
  let bestD = max;
  for (const c of COMMERCIALS) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function marketMarks(owned: string[], realty: RealtyState): Array<{ id: string; x: number; z: number; kind: PropertyType }> {
  return catalog()
    .filter((p) => !ownedIds(owned, realty).includes(p.id) || realty.listings[p.id]?.listed)
    .map((p) => ({ id: p.id, x: p.x, z: p.z, kind: p.kind }));
}
