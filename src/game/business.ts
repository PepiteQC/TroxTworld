import * as THREE from "three";
import { itemById } from "./commerce";
import { matLib } from "./materials";
import { inlandSide, pushOffRoad, villageAxis, villageSetback, VILLAGES, type VillageDef } from "./worlddata";

export type FirmType =
  | "cafe"
  | "depanneur"
  | "garage"
  | "paysagiste"
  | "deneigement"
  | "transport"
  | "restaurant"
  | "bar"
  | "construction"
  | "securite"
  | "forestiere"
  | "immobilier";
export type PermitId = "MAPAQ" | "MUNICIPAL" | "SAAQ_T" | "CNESST" | "RACJ" | "RBQ" | "BSP" | "OACIQ" | "MFFP";
export type FirmStatus = "en_demarrage" | "active" | "suspendue";

export interface FirmPermit {
  type: PermitId;
  number: string;
}

export interface Firm {
  id: string;
  neq: string;
  tradeName: string;
  type: FirmType;
  village: string;
  x: number;
  z: number;
  status: FirmStatus;
  balance: number;
  taxOwed: number;
  permits: FirmPermit[];
  stock: Record<string, number>;
  isOpen: boolean;
  lifetimeRevenue: number;
  staff: number;
  grants: Record<string, number>;
}

export interface FirmSpec {
  type: FirmType;
  label: string;
  startup: number;
  permits: PermitId[];
  model: "comptoir" | "contrat";
  peak: number[];
  hint: string;
}

export const FIRM_TYPES: FirmSpec[] = [
  { type: "cafe", label: "Café", startup: 420, permits: ["MAPAQ", "MUNICIPAL"], model: "comptoir", peak: [1, 2, 10, 11, 12], hint: "Café double, pâtisserie. Haute saison l'hiver." },
  { type: "depanneur", label: "Dépanneur", startup: 580, permits: ["MAPAQ", "MUNICIPAL"], model: "comptoir", peak: [6, 7, 8], hint: "Ouvert tard, volume. Stock depuis le sac." },
  { type: "restaurant", label: "Restaurant", startup: 860, permits: ["MAPAQ", "MUNICIPAL"], model: "comptoir", peak: [6, 7, 8, 12], hint: "Salle, pourboires, permis aliments." },
  { type: "bar", label: "Bar", startup: 920, permits: ["RACJ", "MUNICIPAL"], model: "comptoir", peak: [5, 6, 7, 11, 12], hint: "Permis d'alcool RACJ. Soirées." },
  { type: "garage", label: "Garage", startup: 980, permits: ["MUNICIPAL"], model: "contrat", peak: [4, 5, 10, 11], hint: "Clé anglaise, pics aux pneus." },
  { type: "paysagiste", label: "Paysagiste", startup: 360, permits: ["MUNICIPAL"], model: "contrat", peak: [5, 6, 7, 8, 9], hint: "Pelle et râteau dans les rangs." },
  { type: "deneigement", label: "Déneigement", startup: 520, permits: ["MUNICIPAL"], model: "contrat", peak: [11, 12, 1, 2, 3], hint: "Contrats d'hiver, forfait tempête." },
  { type: "transport", label: "Transport", startup: 740, permits: ["SAAQ_T"], model: "contrat", peak: [1, 2, 10, 11, 12], hint: "Contrats 138 / A-40, +25 %." },
  { type: "construction", label: "Construction", startup: 1100, permits: ["RBQ", "CNESST"], model: "contrat", peak: [5, 6, 7, 8, 9], hint: "Licence RBQ, chantiers municipaux." },
  { type: "securite", label: "Sécurité", startup: 640, permits: ["BSP"], model: "contrat", peak: [1, 2, 10, 11, 12], hint: "Permis BSP, rondes de nuit." },
  { type: "forestiere", label: "Forestière", startup: 880, permits: ["MFFP", "CNESST"], model: "contrat", peak: [9, 10, 11, 1, 2], hint: "Permis d'intervention, bois de chauffage." },
  { type: "immobilier", label: "Immobilier", startup: 720, permits: ["OACIQ"], model: "contrat", peak: [4, 5, 6, 9, 10], hint: "Certificat OACIQ, commissions sur ventes." },
];

export const PERMIT_FEES: Record<PermitId, { label: string; fee: number; authority: string }> = {
  MAPAQ: { label: "Permis MAPAQ", fee: 72, authority: "Aliments" },
  MUNICIPAL: { label: "Occupation municipale", fee: 42, authority: "Mairie" },
  SAAQ_T: { label: "Transport SAAQ", fee: 98, authority: "Marchandises" },
  CNESST: { label: "CNESST", fee: 34, authority: "SST" },
  RACJ: { label: "Permis d'alcool RACJ", fee: 160, authority: "Alcool" },
  RBQ: { label: "Licence RBQ", fee: 210, authority: "Bâtiment" },
  BSP: { label: "Permis BSP", fee: 145, authority: "Sécurité" },
  OACIQ: { label: "Certificat OACIQ", fee: 185, authority: "Courtage" },
  MFFP: { label: "Intervention forestière", fee: 120, authority: "Forêt" },
};

export type MapaqGrantId = "proximite" | "pta" | "padaar" | "releve" | "alimentsqc";

export interface MapaqGrant {
  id: MapaqGrantId;
  name: string;
  short: string;
  hint: string;
  types: FirmType[];
  permit?: PermitId;
  minRevenue: number;
  maxRevenue?: number;
  base: number;
  ruralBonus: number;
}

/** Programmes MAPAQ réels, montants à l'échelle du comté. */
export const MAPAQ_GRANTS: MapaqGrant[] = [
  {
    id: "proximite",
    name: "Initiative Proximité",
    short: "Proximité",
    hint: "Mise en marché locale, kiosque, produits d'ici. Jusqu'à 70 % des dépenses, +15 % en région.",
    types: ["cafe", "depanneur", "restaurant"],
    permit: "MAPAQ",
    minRevenue: 30,
    base: 180,
    ruralBonus: 0.15,
  },
  {
    id: "pta",
    name: "Programme transformation alimentaire",
    short: "PTA",
    hint: "Moderniser cuisine et productivité. Aide ~50 % des dépenses admissibles.",
    types: ["cafe", "depanneur", "restaurant"],
    permit: "MAPAQ",
    minRevenue: 80,
    base: 260,
    ruralBonus: 0.1,
  },
  {
    id: "padaar",
    name: "PADAAR — produits régionaux",
    short: "PADAAR",
    hint: "Promotion agroalimentaire en région. Événements, étals, produits du comté.",
    types: ["cafe", "restaurant", "paysagiste"],
    minRevenue: 0,
    base: 140,
    ruralBonus: 0.2,
  },
  {
    id: "releve",
    name: "Relève agricole",
    short: "Relève",
    hint: "Bonification jeunes entreprises. CA encore bas, petit effectif.",
    types: ["cafe", "depanneur", "restaurant", "paysagiste"],
    permit: "MAPAQ",
    minRevenue: 0,
    maxRevenue: 280,
    base: 120,
    ruralBonus: 0.15,
  },
  {
    id: "alimentsqc",
    name: "Aliments du Québec",
    short: "Aliments QC",
    hint: "Identification et mise en marché des produits québécois.",
    types: ["cafe", "depanneur", "restaurant"],
    permit: "MAPAQ",
    minRevenue: 20,
    base: 90,
    ruralBonus: 0.1,
  },
];

const URBAN_VILLAGES = new Set(["Portneuf", "Pont-Rouge", "Donnacona", "Saint-Raymond"]);

export function isRuralVillage(name: string): boolean {
  return !URBAN_VILLAGES.has(name);
}

export function mapaqGrant(id: string): MapaqGrant | undefined {
  return MAPAQ_GRANTS.find((g) => g.id === id);
}

export function grantAmount(firm: Firm, spec: MapaqGrant): number {
  let n = spec.base;
  if (isRuralVillage(firm.village)) n *= 1 + spec.ruralBonus;
  if ((firm.staff ?? 0) <= 1 && spec.id !== "pta") n *= 1.08;
  return Math.round(n);
}

export function canApplyGrant(firm: Firm, id: MapaqGrantId): { ok: boolean; amount: number; reason: string } {
  const spec = mapaqGrant(id);
  if (!spec) return { ok: false, amount: 0, reason: "Programme inconnu." };
  if (!spec.types.includes(firm.type)) {
    return { ok: false, amount: 0, reason: `${spec.short} · pas pour un ${firmSpec(firm.type).label.toLowerCase()}.` };
  }
  if (firm.status === "suspendue") return { ok: false, amount: 0, reason: "Entreprise suspendue." };
  if (spec.permit && !firm.permits.some((p) => p.type === spec.permit)) {
    return { ok: false, amount: 0, reason: `Permis ${spec.permit} requis.` };
  }
  if (firm.lifetimeRevenue < spec.minRevenue) {
    return { ok: false, amount: 0, reason: `CA trop bas · ${spec.minRevenue}\u00a0$ minimum.` };
  }
  if (spec.maxRevenue !== undefined && firm.lifetimeRevenue > spec.maxRevenue) {
    return { ok: false, amount: 0, reason: "Relève : CA trop élevé." };
  }
  if ((firm.grants ?? {})[id]) return { ok: false, amount: 0, reason: "Déjà versée." };
  const amount = grantAmount(firm, spec);
  return { ok: true, amount, reason: `${spec.name} · ${amount}\u00a0$` };
}

export function firmSpec(type: FirmType): FirmSpec {
  return FIRM_TYPES.find((s) => s.type === type) ?? FIRM_TYPES[0]!;
}

export function generateNEQ(): string {
  const y = String(new Date().getFullYear() % 10);
  const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  return y + rest;
}

export function generatePermitNumber(type: PermitId): string {
  return `${type}-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function startupTotal(type: FirmType): number {
  const spec = firmSpec(type);
  return spec.startup + spec.permits.reduce((s, p) => s + PERMIT_FEES[p].fee, 0);
}

export function canOperate(firm: Firm): { ok: boolean; missing: PermitId[] } {
  const need = firmSpec(firm.type).permits;
  const held = new Set(firm.permits.map((p) => p.type));
  const missing = need.filter((p) => !held.has(p));
  if (firm.status === "suspendue") return { ok: false, missing };
  return { ok: missing.length === 0, missing };
}

export function seasonalFactor(type: FirmType, month: number): number {
  const spec = firmSpec(type);
  if (spec.peak.includes(month)) return 1.55;
  const adj = spec.peak.some((m) => Math.abs(m - month) === 1 || Math.abs(m - month) === 11);
  if (adj) return 0.85;
  const hard = type === "deneigement" || type === "paysagiste" || type === "forestiere";
  return hard ? 0.15 : 0.6;
}

export function saleTax(subtotal: number): number {
  return Math.round(subtotal * 0.14975 * 100) / 100;
}

export function gameMonth(elapsed: number): number {
  return ((Math.floor(elapsed / 180) + 8) % 12) + 1;
}

export function parseFirm(raw: unknown): Firm | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Firm>;
  if (typeof d.neq !== "string" || typeof d.type !== "string") return null;
  const type = FIRM_TYPES.some((t) => t.type === d.type) ? (d.type as FirmType) : "cafe";
  return {
    id: typeof d.id === "string" ? d.id : "firm-1",
    neq: d.neq,
    tradeName: typeof d.tradeName === "string" ? d.tradeName : firmSpec(type).label,
    type,
    village: typeof d.village === "string" ? d.village : "Portneuf",
    x: typeof d.x === "number" ? d.x : 0,
    z: typeof d.z === "number" ? d.z : 0,
    status: d.status === "active" || d.status === "suspendue" ? d.status : "en_demarrage",
    balance: typeof d.balance === "number" ? d.balance : 0,
    taxOwed: typeof d.taxOwed === "number" ? d.taxOwed : 0,
    permits: Array.isArray(d.permits) ? d.permits.filter((p) => p && typeof p.type === "string") : [],
    stock: d.stock && typeof d.stock === "object" ? d.stock : {},
    isOpen: Boolean(d.isOpen),
    lifetimeRevenue: typeof d.lifetimeRevenue === "number" ? d.lifetimeRevenue : 0,
    staff: typeof d.staff === "number" ? Math.max(0, Math.min(8, Math.floor(d.staff))) : 0,
    grants: d.grants && typeof d.grants === "object" ? (d.grants as Record<string, number>) : {},
  };
}

export function nearestVillageName(x: number, z: number): string {
  let best = VILLAGES[5]!;
  let d = Infinity;
  for (const v of VILLAGES) {
    const n = Math.hypot(v.center[0] - x, v.center[1] - z);
    if (n < d) {
      d = n;
      best = v;
    }
  }
  return best.name;
}

export function stockValue(stock: Record<string, number>): number {
  let n = 0;
  for (const [id, q] of Object.entries(stock)) n += (itemById(id)?.price ?? 0) * q;
  return Math.round(n * 100) / 100;
}

export function buildFirmStand(type: FirmType): THREE.Group {
  return buildFirmBuilding(type);
}

export function buildFirmBuilding(type: FirmType): THREE.Group {
  const g = new THREE.Group();
  g.name = `firm-${type}`;
  const pal: Record<FirmType, { wall: number; accent: number; roof: number; w: number; d: number; h: number }> = {
    cafe: { wall: 0xc8b49a, accent: 0x6a3a28, roof: 0x3a2a22, w: 8.4, d: 7.2, h: 3.4 },
    depanneur: { wall: 0xe8e0d4, accent: 0xc03028, roof: 0x3a3a3e, w: 10, d: 7.6, h: 3.5 },
    restaurant: { wall: 0xd8c8b0, accent: 0x8a3020, roof: 0x4a3028, w: 11, d: 8.4, h: 3.8 },
    bar: { wall: 0x2a2430, accent: 0x7c3aed, roof: 0x1a1420, w: 9.2, d: 7.4, h: 3.6 },
    garage: { wall: 0x8a9096, accent: 0xc4a030, roof: 0x4a5056, w: 12, d: 9.2, h: 4.2 },
    paysagiste: { wall: 0x6a7a50, accent: 0x3a6a38, roof: 0x4a3a28, w: 7.4, d: 6.2, h: 3.1 },
    deneigement: { wall: 0xd8e0e8, accent: 0x2a5a9a, roof: 0x6a7080, w: 8.6, d: 7.0, h: 3.4 },
    transport: { wall: 0xc4a030, accent: 0x2a2a28, roof: 0x3a3a36, w: 14, d: 10, h: 4.6 },
    construction: { wall: 0xb8a078, accent: 0xc05018, roof: 0x5a5048, w: 10.5, d: 8.2, h: 4.0 },
    securite: { wall: 0x3a4450, accent: 0x1a3a7a, roof: 0x2a3038, w: 8.0, d: 6.8, h: 3.6 },
    forestiere: { wall: 0x6a5038, accent: 0x3a5a30, roof: 0x4a3a28, w: 11, d: 8.6, h: 4.2 },
    immobilier: { wall: 0xf0ebe4, accent: 0x1a5a7a, roof: 0x4a5560, w: 8.8, d: 7.0, h: 3.7 },
  };
  const p = pal[type];
  const body = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), matLib.get(p.wall, 0.82));
  body.position.y = p.h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.5, 0.28, p.d + 0.5), matLib.get(p.roof, 0.7, 0.12));
  roof.position.y = p.h + 0.16;
  roof.castShadow = true;
  g.add(roof);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(p.w * 0.62, p.h * 0.48),
    type === "bar" ? matLib.getEmissive(0x7c3aed, 0x7c3aed, 0.45) : matLib.glass("#87ceeb", 0.35, 0.1, 0.18),
  );
  glass.position.set(0, p.h * 0.52, p.d / 2 + 0.04);
  g.add(glass);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(p.w * 0.55, 0.7, 0.12), matLib.getEmissive(p.accent, p.accent, 0.85));
  sign.position.set(0, p.h + 0.72, p.d / 2 + 0.08);
  g.add(sign);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(p.w * 0.72, 0.08, 1.5), matLib.get(p.accent, 0.7));
  awning.position.set(0, p.h * 0.78, p.d / 2 + 0.75);
  awning.rotation.x = -0.12;
  g.add(awning);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.15, 0.08), matLib.get(0x4a3a2a, 0.6, 0.08));
  door.position.set(-p.w * 0.22, 1.08, p.d / 2 + 0.05);
  g.add(door);

  if (type === "garage") {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 0.08), matLib.get(0x3a4048, 0.45, 0.25));
    bay.position.set(2.2, 1.35, p.d / 2 + 0.06);
    g.add(bay);
  }
  if (type === "cafe" || type === "restaurant") {
    for (const ox of [-1.6, 0.2, 1.8]) {
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.72, 10), matLib.get(0x6a4a30, 0.7));
      tbl.position.set(ox, 0.36, p.d / 2 + 2.1);
      g.add(tbl);
    }
  }
  if (type === "paysagiste") {
    for (const ox of [-2.4, 2.4]) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), matLib.get(0x2a6a28, 0.9));
      bush.position.set(ox, 0.5, p.d / 2 + 1.8);
      g.add(bush);
    }
  }
  if (type === "forestiere") {
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8), matLib.get(0x6a4a28, 0.85));
      log.rotation.z = Math.PI / 2;
      log.position.set(-2 + i * 0.42, 0.2, p.d / 2 + 2.4);
      g.add(log);
    }
  }
  if (type === "construction") {
    const pile = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.4), matLib.get(0xb8a078, 0.85));
    pile.position.set(p.w / 2 + 1.6, 0.55, 0);
    g.add(pile);
  }
  if (type === "deneigement") {
    const pile = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), matLib.get(0xe8eef4, 0.55));
    pile.position.set(p.w / 2 + 1.8, 0.7, 1.2);
    g.add(pile);
  }
  if (type === "transport") {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 2.2), matLib.get(0x5a5048, 0.8));
    dock.position.set(0, 0.6, -p.d / 2 - 1.1);
    g.add(dock);
  }
  if (type === "bar") {
    const neon = new THREE.PointLight(0x7c3aed, 1.2, 10);
    neon.position.set(0, 2.4, p.d / 2 + 0.4);
    g.add(neon);
  }
  return g;
}

export function jobBonusType(toolId: string | null): FirmType | null {
  if (toolId === "pelle" || toolId === "rateau") return "paysagiste";
  if (toolId === "cle") return "garage";
  if (toolId === "marteau" || toolId === "perceuse") return "construction";
  if (toolId === "tronconneuse") return "forestiere";
  if (toolId === "casque" || toolId === "gilet") return "securite";
  return null;
}

export interface CountyFirm {
  id: string;
  type: FirmType;
  name: string;
  village: string;
  villageId: string;
  x: number;
  z: number;
  yaw: number;
}

const TRADE_NAMES: Record<FirmType, string> = {
  cafe: "Café",
  depanneur: "Dépanneur",
  garage: "Garage",
  paysagiste: "Paysage",
  deneigement: "Déneigement",
  transport: "Transport",
  restaurant: "Resto",
  bar: "Bar",
  construction: "Construction",
  securite: "Sécurité",
  forestiere: "Scierie",
  immobilier: "Immo",
};

function industryFirm(industry: VillageDef["industry"]): FirmType {
  if (industry === "papeterie" || industry === "carriere") return "construction";
  if (industry === "foresterie") return "forestiere";
  if (industry === "agriculture") return "paysagiste";
  if (industry === "peche" || industry === "tourisme") return "restaurant";
  if (industry === "acericole") return "cafe";
  if (industry === "maritime") return "transport";
  if (industry === "residentiel") return "immobilier";
  return "cafe";
}

export function countyFirms(): CountyFirm[] {
  const out: CountyFirm[] = [];
  for (const v of VILLAGES) {
    const { cx, cz, ang, dirX, dirZ, perpX, perpZ } = villageAxis(v);
    const side = inlandSide(v);
    const setback = villageSetback(v) + 8;
    const type = industryFirm(v.industry);
    const distMultiplier = type === "transport" ? 96 : 58;
    const a = pushOffRoad(cx + dirX * distMultiplier + perpX * side * (setback + (type === "transport" ? 12 : 0)), cz + dirZ * distMultiplier + perpZ * side * (setback + (type === "transport" ? 12 : 0)), 16);
    out.push({
      id: `biz_${v.id}`,
      type,
      name: `${TRADE_NAMES[type]} ${v.name}`,
      village: v.name,
      villageId: v.id,
      x: a.x,
      z: a.z,
      yaw: -ang + (side > 0 ? Math.PI : 0),
    });
    if (v.type === "ville") {
      const extra: FirmType = v.population > 8000 ? "bar" : "garage";
      const b = pushOffRoad(cx - dirX * 42 + perpX * -side * (setback + 8), cz - dirZ * 42 + perpZ * -side * (setback + 8), 14);
      out.push({
        id: `biz2_${v.id}`,
        type: extra,
        name: `${TRADE_NAMES[extra]} ${v.name}`,
        village: v.name,
        villageId: v.id,
        x: b.x,
        z: b.z,
        yaw: -ang + (side < 0 ? Math.PI : 0),
      });
    }
  }
  return out;
}

export function shopKindForFirm(type: FirmType): "depanneur" | "food" | "quincaillerie" | null {
  if (type === "depanneur") return "depanneur";
  if (type === "cafe" || type === "restaurant" || type === "bar") return "food";
  if (type === "garage" || type === "construction") return "quincaillerie";
  return null;
}

export function nextFirmSale(firm: Firm, elapsed: number): { take: number; tax: number; sold?: string } {
  const month = gameMonth(elapsed);
  const factor = seasonalFactor(firm.type, month);
  const staff = firm.staff ?? 0;
  const spec = firmSpec(firm.type);
  let take = (spec.model === "comptoir" ? 11 : 18) + staff * 7;
  take *= factor;
  let sold: string | undefined;
  const keys = Object.keys(firm.stock).filter((k) => (firm.stock[k] ?? 0) > 0);
  if (keys.length) {
    sold = keys[Math.floor(Math.random() * keys.length)];
    take += (itemById(sold)?.price ?? 8) * 0.85;
  }
  take = Math.max(0, Math.round(take + Math.random() * 9 - staff * 4));
  return { take, tax: saleTax(take), sold };
}

export function nearestCountyFirm(list: CountyFirm[], x: number, z: number, max = 8): CountyFirm | null {
  let best: CountyFirm | null = null;
  let bestD = max;
  for (const f of list) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < bestD) {
      best = f;
      bestD = d;
    }
  }
  return best;
}
