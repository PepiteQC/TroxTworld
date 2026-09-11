import type { OutfitId, HairStyle } from "./character";

export type ClothingLayer = "nu" | "leger" | "moyen" | "chaud" | "grand_froid";
export type ShelterKind = "exterieur" | "vehicule" | "interieur";
export type SurvivalAlert =
  | "hypothermie_legere"
  | "hypothermie_moderee"
  | "hypothermie_severe"
  | "coup_de_chaleur"
  | "deshydratation"
  | "famine"
  | "epuisement";

export interface SurvivalSnap {
  hunger: number;
  thirst: number;
  energy: number;
  bodyTemp: number;
  health: number;
  speedFactor: number;
  shiver: number;
  isWet: boolean;
  alerts: SurvivalAlert[];
  ambient: number;
  felt: number;
  advice: string | null;
}

export const FRESH_SURVIVAL: SurvivalSnap = {
  hunger: 82,
  thirst: 78,
  energy: 88,
  bodyTemp: 37,
  health: 100,
  speedFactor: 1,
  shiver: 0,
  isWet: false,
  alerts: [],
  ambient: 12,
  felt: 12,
  advice: null,
};

const CLO: Record<ClothingLayer, number> = {
  nu: 0.1,
  leger: 0.5,
  moyen: 1.2,
  chaud: 2.4,
  grand_froid: 3.8,
};

const SHELTER: Record<ShelterKind, { wind: number; bonus: number }> = {
  exterieur: { wind: 0, bonus: 0 },
  vehicule: { wind: 0.95, bonus: 5 },
  interieur: { wind: 1, bonus: 20 },
};

export function clothingOf(outfit: OutfitId, hair: HairStyle): ClothingLayer {
  if (outfit === "goose" && hair === "chapeau") return "grand_froid";
  if (outfit === "goose") return "chaud";
  if (outfit === "canadienne" || outfit === "sq" || outfit === "ville") return "chaud";
  if (outfit === "roots" || outfit === "fermier") return "moyen";
  return "leger";
}

export function shelterOf(mode: "drive" | "walk" | "interior"): ShelterKind {
  if (mode === "interior") return "interieur";
  if (mode === "drive") return "vehicule";
  return "exterieur";
}

/** Température de Portneuf selon l'heure, la nuit et le mois. */
export function ambientOf(hours: number, night: boolean, month: number): number {
  const seasonal = [-16, -14, -7, 4, 12, 18, 22, 21, 14, 7, -1, -12][Math.max(0, Math.min(11, month - 1))]!;
  const sun = Math.sin(((hours - 7) / 24) * Math.PI * 2) * 4.5;
  return Math.round((seasonal + sun + (night ? -3.5 : 0)) * 10) / 10;
}

export function parseSurvival(raw: unknown): SurvivalSnap {
  if (!raw || typeof raw !== "object") return { ...FRESH_SURVIVAL };
  const d = raw as Partial<SurvivalSnap>;
  const n = (v: unknown, f: number) => (typeof v === "number" && Number.isFinite(v) ? v : f);
  return {
    ...FRESH_SURVIVAL,
    hunger: n(d.hunger, 82),
    thirst: n(d.thirst, 78),
    energy: n(d.energy, 88),
    bodyTemp: n(d.bodyTemp, 37),
    health: n(d.health, 100),
  };
}

export function tickSurvival(
  prev: SurvivalSnap,
  dt: number,
  ctx: {
    shelter: ShelterKind;
    night: boolean;
    hours: number;
    month: number;
    outfit: OutfitId;
    hair: HairStyle;
    god: boolean;
    nearFire?: boolean;
    indoorC?: number;
  },
): SurvivalSnap {
  if (ctx.god) {
    return { ...prev, hunger: 100, thirst: 100, energy: 100, bodyTemp: 37, health: 100, speedFactor: 1, shiver: 0, alerts: [], advice: null, ambient: ambientOf(ctx.hours, ctx.night, ctx.month), felt: ambientOf(ctx.hours, ctx.night, ctx.month) };
  }
  const hours = dt / 90;
  const clothing = clothingOf(ctx.outfit, ctx.hair);
  const shelter = ctx.shelter;
  const ambient = ambientOf(ctx.hours, ctx.night, ctx.month);
  const sh = SHELTER[shelter];
  let felt = ambient + sh.bonus + (ctx.nearFire ? 22 : 0);
  if (shelter === "interieur" && typeof ctx.indoorC === "number") {
    felt = ctx.indoorC + (ctx.nearFire ? 6 : 0);
  }
  const wind = (ctx.night ? 18 : 10) * (1 - sh.wind);
  if (felt <= 10 && wind >= 4.8) {
    const v = Math.pow(wind, 0.16);
    felt = 13.12 + 0.6215 * felt - 11.37 * v + 0.3965 * felt * v;
  }

  const heat = felt > 22 ? 1 + (felt - 22) * 0.09 : 1;
  const cold = felt < 0 ? 1 + Math.abs(felt) * 0.022 : 1;
  let hunger = Math.max(0, prev.hunger - 16 * hours * cold);
  let thirst = Math.max(0, prev.thirst - 22 * hours * heat);
  let energy = Math.max(0, prev.energy - (12 + prev.shiver * 2.5) * hours);

  let insulation = CLO[clothing];
  if (prev.isWet) insulation *= 0.3;
  const protectedFrom = insulation * 4.2;
  const equilibrium = 37 - Math.max(0, 28 - felt - protectedFrom) * 0.28;
  const heatExcess = Math.max(0, felt + protectedFrom - 34) * 0.12;
  let bodyTemp = prev.bodyTemp;
  const target = equilibrium + (felt > 28 ? heatExcess : 0);
  const drift = target < bodyTemp ? 1.1 : 1.6;
  bodyTemp += (target - bodyTemp) * Math.min(1, hours * drift);
  bodyTemp = Math.max(28, Math.min(42, bodyTemp));

  let shiver = 0;
  if (bodyTemp < 36.5 && bodyTemp > 33) shiver = Math.min(1, (36.5 - bodyTemp) / 2.5);
  else if (bodyTemp <= 33) shiver = 0.15;

  const alerts: SurvivalAlert[] = [];
  let speed = 1;
  let health = prev.health;
  if (bodyTemp < 35 && bodyTemp >= 34) {
    alerts.push("hypothermie_legere");
    speed *= 0.92;
  } else if (bodyTemp < 34 && bodyTemp >= 32) {
    alerts.push("hypothermie_moderee");
    speed *= 0.74;
    health -= 0.6 * hours * 60;
  } else if (bodyTemp < 32) {
    alerts.push("hypothermie_severe");
    speed *= 0.45;
    health -= 1.2 * hours * 60;
  }
  if (bodyTemp > 39) {
    alerts.push("coup_de_chaleur");
    speed *= 0.65;
    health -= 0.9 * hours * 60;
  }
  if (thirst < 15) {
    alerts.push("deshydratation");
    speed *= 0.8;
    health -= 0.8 * hours * 60;
  }
  if (hunger < 15) {
    alerts.push("famine");
    speed *= 0.85;
    health -= 0.5 * hours * 60;
  }
  if (energy < 20) {
    alerts.push("epuisement");
    speed *= 0.7;
  }
  health = Math.max(8, Math.min(100, health));

  let advice: string | null = null;
  if (bodyTemp < 34 && shelter === "exterieur" && !ctx.nearFire) advice = "Trouvez un abri, un feu ou le pick-up.";
  else if (ctx.nearFire && bodyTemp < 36.8) advice = "Feu de camp — vous vous réchauffez.";
  else if (shelter === "interieur" && felt < 12) advice = "Maison froide — chauffage, bois, ou panne Hydro.";
  else if (bodyTemp < 35.5 && (clothing === "nu" || clothing === "leger")) advice = "Manteau, tuque — le froid mord.";
  else if (thirst < 20) advice = "Buvez quelque chose.";
  else if (hunger < 20) advice = "Mangez — poutine, burger.";
  else if (energy < 25) advice = "Assoyez-vous, ou un café.";
  else if (bodyTemp > 39) advice = "Ombre et boisson froide.";

  return {
    hunger: Math.round(hunger * 10) / 10,
    thirst: Math.round(thirst * 10) / 10,
    energy: Math.round(energy * 10) / 10,
    bodyTemp: Math.round(bodyTemp * 10) / 10,
    health: Math.round(health * 10) / 10,
    speedFactor: Math.max(0.28, Math.round(speed * 100) / 100),
    shiver: Math.round(shiver * 100) / 100,
    isWet: prev.isWet && shelter === "exterieur",
    alerts,
    ambient,
    felt: Math.round(felt * 10) / 10,
    advice,
  };
}

export function applyMeal(prev: SurvivalSnap, kind: "eat" | "drink" | "hot" | "cold"): SurvivalSnap {
  const next = { ...prev };
  if (kind === "eat" || kind === "hot") next.hunger = Math.min(100, next.hunger + 28);
  if (kind === "drink" || kind === "hot" || kind === "cold") next.thirst = Math.min(100, next.thirst + 32);
  if (kind === "hot") next.bodyTemp = Math.min(37.6, next.bodyTemp + 0.4);
  if (kind === "cold" && next.bodyTemp > 37.2) next.bodyTemp = Math.max(36.6, next.bodyTemp - 0.3);
  next.energy = Math.min(100, next.energy + 8);
  return next;
}

export function survivalLabel(alert: SurvivalAlert): string {
  if (alert === "hypothermie_severe") return "Hypothermie sévère";
  if (alert === "hypothermie_moderee") return "Hypothermie";
  if (alert === "hypothermie_legere") return "Vous grelottez";
  if (alert === "coup_de_chaleur") return "Coup de chaleur";
  if (alert === "deshydratation") return "Soif";
  if (alert === "famine") return "Faim";
  return "Épuisé";
}