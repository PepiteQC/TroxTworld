export type LicenseId = "pal" | "pal_r" | "chasse";
export type LegalClass = "libre" | "sans_restriction" | "restreinte" | "prohibee";

export interface LicenseDef {
  id: LicenseId;
  name: string;
  issuer: string;
  price: number;
  desc: string;
}

export const LICENSES: Record<LicenseId, LicenseDef> = {
  pal: {
    id: "pal",
    name: "PAL sans restriction",
    issuer: "Gendarmerie royale du Canada",
    price: 85,
    desc: "Permis de possession et d'acquisition — armes d'épaule.",
  },
  pal_r: {
    id: "pal_r",
    name: "PAL à autorisation restreinte",
    issuer: "GRC · Québec",
    price: 185,
    desc: "Autorise les armes de poing. Contrôle SQ.",
  },
  chasse: {
    id: "chasse",
    name: "Permis de chasse MFFP",
    issuer: "Faune Québec",
    price: 46,
    desc: "Saison orignal, secteur Portneuf.",
  },
};

export interface WeaponTemplate {
  id: string;
  name: string;
  legal: LegalClass;
  source: "chasse" | "dealer";
  need: LicenseId[];
  ammo?: string;
}

export const WEAPON_CATALOG: WeaponTemplate[] = [
  { id: "carabine", name: "Carabine de chasse", legal: "sans_restriction", source: "chasse", need: ["pal", "chasse"], ammo: "ammo_308" },
  { id: "shotgun", name: "Fusil à pompe", legal: "sans_restriction", source: "chasse", need: ["pal"], ammo: "ammo_12" },
  { id: "pistol", name: "Pistolet tactique", legal: "restreinte", source: "chasse", need: ["pal_r"], ammo: "ammo_9mm" },
  { id: "ar15", name: "Fusil d'assaut", legal: "prohibee", source: "dealer", need: [], ammo: "ammo_556" },
  { id: "ak74", name: "AK-74", legal: "prohibee", source: "dealer", need: [], ammo: "ammo_545" },
];

const ITEM_LICENSE: Record<string, LicenseId> = {
  pal: "pal",
  pal_r: "pal_r",
  permis: "chasse",
};

export function licenseFromItem(id: string): LicenseId | null {
  return ITEM_LICENSE[id] ?? null;
}

export function getWeapon(id: string): WeaponTemplate | undefined {
  return WEAPON_CATALOG.find((w) => w.id === id);
}

export function canPurchase(licenses: LicenseId[], itemId: string): { ok: boolean; missing?: LicenseId; message?: string } {
  const w = getWeapon(itemId);
  if (!w) return { ok: true };
  if (w.legal === "prohibee") return { ok: false, message: `Prohibée · ${w.name}` };
  const miss = w.need.find((n) => !licenses.includes(n));
  if (!miss) return { ok: true };
  const L = LICENSES[miss];
  return { ok: false, missing: miss, message: `Permis requis · ${L.name}` };
}

export function checkCarryLegality(licenses: LicenseId[], equipped: string | null): { legal: boolean; message?: string } {
  if (!equipped) return { legal: true };
  const w = getWeapon(equipped);
  if (!w) return { legal: true };
  if (w.legal === "prohibee") return { legal: false, message: `Port illégal · ${w.name}` };
  const miss = w.need.find((n) => !licenses.includes(n));
  if (!miss) return { legal: true };
  return { legal: false, message: `Port illégal · ${w.name}` };
}

export function grantLicense(list: LicenseId[], id: LicenseId): LicenseId[] {
  return list.includes(id) ? list : [...list, id];
}

export function parseLicenses(raw: unknown): LicenseId[] {
  if (!Array.isArray(raw)) return [];
  const ok: LicenseId[] = [];
  for (const x of raw) {
    if (x === "pal" || x === "pal_r" || x === "chasse") ok.push(x);
  }
  return ok;
}

export function getWeaponsByLegalClass(c: LegalClass): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.legal === c);
}

export function getLegalShopInventory(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.legal !== "prohibee");
}

export function getDealerInventory(): WeaponTemplate[] {
  return WEAPON_CATALOG.filter((w) => w.source === "dealer");
}

export function getCatalogStats() {
  return { weapons: WEAPON_CATALOG.length, licenses: Object.keys(LICENSES).length };
}
