/**
 * ═════════════════════════════════════════════════════════════════════════════
 * GESTION DES SERVICES PUBLICS (HYDRO, EAU, TÉLÉCOM) ET RÉSILIENCE (v3.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * NOUVEAUTÉS v3.0 :
 *  - Détection d'anomalies Hydro-Québec : Les planques avec une surconsommation 
 *    (lampes de croissance, labo, serveurs de blanchiment) alertent la SQ.
 *  - Génératrices de secours : Consomment de l'essence en cas de panne de secteur.
 *  - Pannes de télécommunications : Coupure d'Internet lors de désastres majeurs.
 *  - Dégâts matériels : Risque de tuyaux éclatés (gel) ou feu de cheminée.
 *  - Synchronisation réseau : Les pannes affectent les lampadaires de rue (Street v3).
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib } from "../game/materials";
import { tex } from "../game/textures";
import { netEmit } from "../game/net";

export const PIPE_THAW = 85;
export function scenicHeat(seed: number, rural = false): HeatId {
  const choices: HeatId[] = rural ? ["poele", "foyer", "central"] : ["electrique", "thermopompe", "plinthes"];
  return choices[Math.abs(Math.trunc(seed)) % choices.length]!;
}
export function parseUtils(value: unknown, _id = ""): Record<string, unknown> {
  return value && typeof value === "object" ? { ...(value as Record<string, unknown>) } : {};
}
export function heatHint(u: HouseUtils, grid: GridOutage | null, ambient: number): string {
  return heatWorks(u, grid, ambient) ? "Chauffage fonctionnel" : "Chauffage indisponible";
}

export type HeatId = "plinthes" | "electrique" | "thermopompe" | "central" | "foyer" | "poele";
export type WaterId = "municipal" | "puits";
export type InternetId = "fibre" | "cable" | "satellite" | "aucun";
export type GeneratorId = "aucun" | "portatif" | "standby";
export type GridOutageKind = "verglas" | "panne" | "surcharge";

export interface HeatSpec {
  id: HeatId;
  label: string;
  price: number;
  valueAdd: number;
  monthlyHydro: number;
  monthlyMaint: number;
  indoorTarget: number;
  needsHydro: boolean;
  needsWood: boolean;
  panneProof: boolean;
  hint: string;
}

export interface WaterSpec {
  id: WaterId;
  label: string;
  monthly: number;
  needsHydro: boolean;
  hint: string;
}

export interface GridOutage {
  kind: GridOutageKind;
  t: number; // Durée restante en minutes
  affectsTelecom: boolean; // Si true, l'Internet plante aussi
}

export interface HouseUtils {
  heat: HeatId;
  heatOn: boolean;
  water: WaterId;
  waterOn: boolean;
  internet: InternetId;
  generator: GeneratorId;
  
  // États actifs
  hydroOn: boolean;
  wood: number;         // Corde de bois (0 à 8)
  gasReserve: number;   // Litres d'essence pour génératrice
  billAcc: number;      // Cumul facturation
  indoorC: number;      // Température interne
  
  // Défaillances
  broke: boolean;       // Fournaise brisée
  frozen: boolean;      // Tuyaux gelés
  waterDamage: boolean; // Dégât d'eau suite au gel
  
  // Rôle-Play Criminel & Planques
  illegalDrawKw: number;    // kW consommés par des activités illicites (ex: 50 kW = grosse serre)
  anomalyReported: boolean; // Dossier envoyé à la Sûreté du Québec ?
}

export const HEAT_CATALOG: HeatSpec[] = [
  { id: "plinthes", label: "Plinthes électriques", price: 0, valueAdd: 40, monthlyHydro: 92, monthlyMaint: 4, indoorTarget: 21, needsHydro: true, needsWood: false, panneProof: false, hint: "Le standard québécois. Tarif D Hydro-Québec." },
  { id: "electrique", label: "Chauffage électrique", price: 160, valueAdd: 90, monthlyHydro: 82, monthlyMaint: 6, indoorTarget: 21, needsHydro: true, needsWood: false, panneProof: false, hint: "Convecteurs muraux, thermostat digital." },
  { id: "thermopompe", label: "Thermopompe", price: 480, valueAdd: 280, monthlyHydro: 38, monthlyMaint: 14, indoorTarget: 22, needsHydro: true, needsWood: false, panneProof: false, hint: "Efficace jusqu'à −20 °C. Subvention LogisVert." },
  { id: "central", label: "Système central", price: 640, valueAdd: 340, monthlyHydro: 58, monthlyMaint: 22, indoorTarget: 22, needsHydro: true, needsWood: false, panneProof: false, hint: "Fournaise + conduits. Confort uniforme." },
  { id: "foyer", label: "Foyer", price: 280, valueAdd: 160, monthlyHydro: 8, monthlyMaint: 10, indoorTarget: 19, needsHydro: false, needsWood: true, panneProof: true, hint: "Chaleur d'appoint. Indispensable durant le verglas." },
  { id: "poele", label: "Poêle à bois", price: 360, valueAdd: 210, monthlyHydro: 6, monthlyMaint: 12, indoorTarget: 21, needsHydro: false, needsWood: true, panneProof: true, hint: "Rangs et chalets. Chauffe toute la maison." },
];

export const WATER_CATALOG: WaterSpec[] = [
  { id: "municipal", label: "Aqueduc municipal", monthly: 18, needsHydro: false, hint: "Ville / MRC. Compteur et taxes d'eau." },
  { id: "puits", label: "Puits artésien", monthly: 4, needsHydro: true, hint: "Pompe électrique. Coupe si panne d'Hydro." },
];

export const LOGISVERT = 80;
export const WOOD_MAX = 8;
export const GAS_MAX = 40; // Litres
export const BILL_EVERY = 95;
export const FURNACE_REPAIR = 85;
export const WATER_DAMAGE_REPAIR = 1500; // Coût exorbitant d'un dégât d'eau
export const WOOD_BURN_EVERY = 72;

const RURAL_TOWNS = new Set([
  "Saint-Casimir", "Saint-Alban", "Grondines", "Saint-Marc", 
  "Deschambault", "Saint-Thuribe", "Saint-Ubalde", "Saint-Gilbert", "Saint-Raymond"
]);

export function heatById(id: HeatId): HeatSpec { return HEAT_CATALOG.find((h) => h.id === id) ?? HEAT_CATALOG[0]!; }
export function waterById(id: WaterId): WaterSpec { return WATER_CATALOG.find((w) => w.id === id) ?? WATER_CATALOG[0]!; }

export function defaultHeat(deedId: string, town = ""): HeatId {
  if (deedId === "H-SRY") return "poele";
  if (deedId === "H-NVL") return "foyer";
  if (deedId === "H-PTR" || deedId === "H-CPS") return "thermopompe";
  if (deedId === "H-DNC") return "plinthes";
  if (RURAL_TOWNS.has(town)) return "poele";
  return "plinthes";
}

export function defaultWater(town = ""): WaterId {
  return RURAL_TOWNS.has(town) ? "puits" : "municipal";
}

export function emptyUtils(deedId: string, town = ""): HouseUtils {
  const heat = defaultHeat(deedId, town);
  return {
    heat,
    heatOn: true,
    water: defaultWater(town),
    waterOn: true,
    internet: RURAL_TOWNS.has(town) ? "satellite" : "fibre",
    generator: "aucun",
    hydroOn: true,
    wood: heatById(heat).needsWood ? 3 : 0,
    gasReserve: 0,
    billAcc: 0,
    indoorC: 18,
    broke: false,
    frozen: false,
    waterDamage: false,
    illegalDrawKw: 0,
    anomalyReported: false,
  };
}

export function heatWorks(u: HouseUtils, grid: GridOutage | null, ambient: number): boolean {
  if (!u.heatOn) return false;
  const spec = heatById(u.heat);
  if (u.broke && u.heat === "central") return false;
  if (spec.needsWood && u.wood <= 0) return false;
  
  // Si le chauffage a besoin d'électricité
  if (spec.needsHydro) {
    if (!u.hydroOn) return false;
    // La génératrice peut sauver la mise si elle a du gaz
    const hasBackupPower = u.generator !== "aucun" && u.gasReserve > 0;
    if (grid && !hasBackupPower) return false;
  }
  
  if (u.heat === "thermopompe" && ambient <= -22) return false;
  return true;
}

export function hydroLive(u: HouseUtils, grid: GridOutage | null): boolean {
  const hasBackupPower = u.generator !== "aucun" && u.gasReserve > 0;
  return u.hydroOn && (!grid || hasBackupPower);
}

export function internetLive(u: HouseUtils, grid: GridOutage | null): boolean {
  if (!hydroLive(u, grid)) return false; // Pas de courant = pas de routeur
  if (grid?.affectsTelecom && u.internet !== "satellite") return false; // Réseau filaire coupé
  return u.internet !== "aucun";
}

export function indoorTarget(u: HouseUtils, grid: GridOutage | null, ambient: number): number {
  if (!heatWorks(u, grid, ambient)) return Math.min(ambient + 3.5, 12);
  const spec = heatById(u.heat);
  let t = spec.indoorTarget;
  if (u.heat === "thermopompe" && ambient < -16) t -= Math.min(6, (-16 - ambient) * 0.45);
  return t;
}

export function monthlyBill(u: HouseUtils, month: number): { hydro: number; water: number; telecom: number; maint: number; total: number } {
  const winter = month <= 3 || month >= 11;
  const spec = heatById(u.heat);
  const hydroMul = winter && spec.needsHydro ? 1.35 : 1;
  
  // Calcul de l'anomalie de surconsommation (Labos illégaux, weed, crypto)
  const illegalCost = u.illegalDrawKw * 1.5; 
  const hydro = Math.round((spec.monthlyHydro * hydroMul * (u.heatOn ? 1 : 0.22)) + illegalCost);
  
  const eau = waterById(u.water).monthly;
  const maint = spec.monthlyMaint;
  const telecom = u.internet === "fibre" ? 75 : u.internet === "satellite" ? 110 : 0;
  
  return { hydro, water: eau, telecom, maint, total: hydro + eau + telecom + maint };
}

export function outageLabel(kind: GridOutageKind | "fournaise" | "gel" | "degat_eau"): string {
  if (kind === "verglas") return "Crise du Verglas · Réseau provincial H-Q effondré";
  if (kind === "panne") return "Panne de secteur Hydro-Québec";
  if (kind === "surcharge") return "Délestage · Surcharge du réseau local";
  if (kind === "fournaise") return "Fournaise en panne (Appeler un chauffagiste)";
  if (kind === "degat_eau") return "DÉGÂT D'EAU MAJEUR · Tuyauterie éclatée";
  return "Tuyaux gelés · Risque de rupture";
}

export interface UtilTickCtx {
  ambient: number;
  weather: "clear" | "rain" | "snow" | "fog" | "storm";
  month: number;
  elapsed: number;
}

export interface UtilTickResult {
  houses: Record<string, HouseUtils>;
  grid: GridOutage | null;
  notice: string | null;
  debit: number;
  label: string | null;
}

export function tickHouseUtils(
  prev: Record<string, HouseUtils>,
  owned: string[],
  grid: GridOutage | null,
  dt: number,
  ctx: UtilTickCtx,
): UtilTickResult {
  const houses: Record<string, HouseUtils> = {};
  for (const [id, row] of Object.entries(prev)) houses[id] = { ...row };
  
  let notice: string | null = null;
  let debit = 0;
  let label: string | null = null;
  let nextGrid = grid;

  // ─── GESTION DES PANNES RÉSEAU HYDRO-QUÉBEC ───
  if (nextGrid) {
    nextGrid = { ...nextGrid, t: nextGrid.t - dt };
    if (nextGrid.t <= 0) {
      nextGrid = null;
      notice = "Hydro-Québec · Courant rétabli dans la MRC";
      netEmit("street:power_restored", {}); // Rallume les lampadaires de la rue
    }
  } else {
    const winter = ctx.month <= 3 || ctx.month >= 11;
    if (winter && ctx.weather === "storm" && Math.random() < 0.0038 * dt) {
      nextGrid = { kind: "verglas", t: 48 + Math.random() * 42, affectsTelecom: true };
      notice = outageLabel("verglas");
      netEmit("street:power_outage", { reason: "verglas" }); // Coupe les lampadaires de la rue
    } else if (ctx.weather === "storm" && Math.random() < 0.0014 * dt) {
      nextGrid = { kind: "panne", t: 28 + Math.random() * 24, affectsTelecom: false };
      notice = outageLabel("panne");
      netEmit("street:power_outage", { reason: "panne" });
    }
  }

  // ─── GESTION RÉSIDENTIELLE ET DOMOTIQUE ───
  for (const id of owned) {
    const cur = houses[id] ?? emptyUtils(id);
    const spec = heatById(cur.heat);
    let { wood, broke, frozen, heatOn, gasReserve, waterDamage, illegalDrawKw, anomalyReported } = cur;
    let billAcc = cur.billAcc + dt;

    // 1. Détection de fraude / Labos illicites
    if (illegalDrawKw > 40 && !anomalyReported && Math.random() < 0.008 * dt) {
      anomalyReported = true;
      // Dénonciation automatique au poste de la SQ
      netEmit("police:hydro_anomaly", { 
        deedId: id, 
        usageKw: illegalDrawKw, 
        message: `Surconsommation critique signalée à l'adresse ${id}`
      });
      console.log(`[HYDRO-QUÉBEC] Fraude détectée au cadastre ${id}. Rapport transféré à la SQ.`);
    }

    // 2. Génératrice d'urgence
    if (nextGrid && cur.generator !== "aucun" && gasReserve > 0) {
      const burnRate = cur.generator === "industriel" ? 0.5 : 0.2; // Litres par minute
      gasReserve = Math.max(0, gasReserve - burnRate * dt);
      if (gasReserve <= 0 && !notice) {
        notice = "Génératrice arrêtée · Panne d'essence sèche";
      }
    }

    // 3. Consommation de bois
    if (heatOn && spec.needsWood && wood > 0) {
      const burn = dt / WOOD_BURN_EVERY;
      wood = Math.max(0, wood - burn);
      if (wood <= 0) {
        wood = 0;
        notice = notice ?? "Plus de bois · le feu s'éteint";
      }
    }

    // 4. Bris mécaniques
    if (!broke && cur.heat === "central" && Math.random() < 0.0009 * dt) {
      broke = true;
      heatOn = false;
      notice = notice ?? outageLabel("fournaise");
    }

    // 5. Thermodynamique de la maison
    const works = heatWorks({ ...cur, wood, gasReserve, broke, heatOn }, nextGrid, ctx.ambient);
    const target = indoorTarget({ ...cur, wood, gasReserve, broke, heatOn }, nextGrid, ctx.ambient);
    const drift = works ? 0.55 : 0.28; // Isolation
    let indoorC = cur.indoorC + (target - cur.indoorC) * Math.min(1, dt * drift);
    indoorC = Math.round(indoorC * 10) / 10;

    // 6. Gel de la tuyauterie & Dégât d'eau
    if (!frozen && !waterDamage && indoorC < 1.0 && ctx.ambient < -6 && cur.waterOn) {
      frozen = true;
      notice = notice ?? outageLabel("gel");
    }
    
    // Si la maison reste gelée trop longtemps (ex: -10C à l'intérieur), les tuyaux pètent
    if (frozen && indoorC < -5 && Math.random() < 0.01 * dt) {
      frozen = false;
      waterDamage = true;
      notice = notice ?? outageLabel("degat_eau");
    }

    if (frozen && indoorC > 10) frozen = false;

    // 7. Facturation
    if (billAcc >= BILL_EVERY) {
      const bill = monthlyBill({ ...cur, illegalDrawKw, heatOn }, ctx.month);
      debit += bill.total;
      billAcc = 0;
      label = `Hydro-Qc ${bill.hydro}$ · Eau ${bill.water}$ · Bell ${bill.telecom}$`;
    }

    houses[id] = {
      ...cur,
      heatOn,
      wood: Math.round(wood * 100) / 100,
      gasReserve: Math.round(gasReserve * 10) / 10,
      billAcc,
      indoorC,
      broke,
      frozen,
      waterDamage,
      anomalyReported,
    };
  }

  return { houses, grid: nextGrid, notice, debit, label };
}

// ═══════════════════════════════════════════════════════════
// BUILDERS THREE.JS — ACCESSOIRES DE MAISON
// ═══════════════════════════════════════════════════════════

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, metal = 0.15, rough = 0.55) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(color, rough, metal));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildHeatPump(): THREE.Group {
  const g = new THREE.Group();
  g.name = "thermopompe";
  g.add(box(0.92, 0.72, 0.38, 0, 0.42, 0, 0xb8bec4, 0.45, 0.4));
  g.add(box(0.78, 0.52, 0.06, 0, 0.44, 0.2, 0x3a4046, 0.2, 0.7));
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12), matLib.get(0x2a3036, 0.45, 0.35));
  fan.rotation.x = Math.PI / 2;
  fan.position.set(0, 0.44, 0.23);
  g.add(fan);
  g.add(box(0.08, 0.08, 0.55, 0.4, 0.82, -0.12, 0x8a9096, 0.5, 0.35));
  return g;
}

export function buildGenerator(): THREE.Group {
  const g = new THREE.Group();
  g.name = "generatrice_secours";
  // Bloc moteur Generac gris foncé
  g.add(box(1.1, 0.8, 0.65, 0, 0.4, 0, 0x333333, 0.6, 0.5));
  // Couvercle
  g.add(box(1.15, 0.1, 0.7, 0, 0.85, 0, 0x1f2937, 0.7, 0.4));
  // Panneau de contrôle LCD
  const lcd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.02), matLib.getEmissive(0x4ade80, 0x22c55e, 0.5));
  lcd.position.set(0.3, 0.6, 0.33);
  lcd.userData.generatorLed = true;
  g.add(lcd);
  return g;
}

export function buildWoodPile(): THREE.Group {
  const g = new THREE.Group();
  g.name = "corde_bois";
  const wood = tex.mat("noyer", 0.6, 0.35, 0.7, 0.05);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.72, 6), wood);
      log.rotation.z = Math.PI / 2;
      log.position.set((i - 2) * 0.16, 0.1 + row * 0.15, (row % 2) * 0.04);
      log.castShadow = true;
      g.add(log);
    }
  }
  g.add(box(0.9, 0.06, 0.4, 0, 0.03, 0, 0x4a3a28, 0, 0.92));
  return g;
}

export function buildWoodStove(): THREE.Group {
  const g = new THREE.Group();
  g.name = "poele_bois";
  g.add(box(0.62, 0.55, 0.48, 0, 0.38, 0, 0x2a2420, 0.35, 0.45));
  g.add(box(0.72, 0.06, 0.56, 0, 0.68, 0, 0x1a1614, 0.4, 0.4));
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.28),
    matLib.getEmissive(0xff6a1a, 0xff4a10, 0.7),
  );
  glass.position.set(0, 0.4, 0.25);
  glass.userData.heatFire = true;
  g.add(glass);
  const light = new THREE.PointLight(0xff7a2a, 0.9, 4.2, 2);
  light.position.set(0, 0.45, 0.35);
  light.userData.heatFire = true;
  g.add(light);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.55, 8), matLib.get(0x3a3a3a, 0.4, 0.5));
  pipe.position.set(-0.18, 1.45, 0);
  g.add(pipe);
  return g;
}

export function buildHydroPanel(): THREE.Group {
  const g = new THREE.Group();
  g.name = "panneau_hydro";
  g.add(box(0.42, 0.62, 0.1, 0, 1.15, 0, 0x6a6e72, 0.25, 0.5));
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), matLib.getEmissive(0x4ade80, 0x22c55e, 0.85));
  led.position.set(0.12, 1.32, 0.06);
  led.userData.hydroLed = true;
  g.add(led);
  g.add(box(0.28, 0.08, 0.04, 0, 0.98, 0.06, 0x1f2937, 0.2, 0.6));
  return g;
}

export function buildWaterHeater(): THREE.Group {
  const g = new THREE.Group();
  g.name = "chauffe_eau";
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 1.15, 12), matLib.get(0xc8ccd0, 0.35, 0.45));
  tank.position.y = 0.62;
  tank.castShadow = true;
  g.add(tank);
  g.add(box(0.12, 0.12, 0.12, 0.22, 1.05, 0, 0x3a3e42, 0.4, 0.4));
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), matLib.get(0xb45309, 0.35, 0.55));
  pipe.position.set(-0.18, 1.28, 0);
  g.add(pipe);
  return g;
}

export function buildPlinthRow(length: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "plinthes";
  const body = new THREE.Mesh(new THREE.BoxGeometry(length, 0.16, 0.08), matLib.get(0xc4c0b8, 0.55, 0.12));
  body.position.set(0, 0.12, 0);
  g.add(body);
  const grill = new THREE.Mesh(new THREE.BoxGeometry(length - 0.08, 0.04, 0.02), matLib.get(0x6a6e68, 0.5, 0.3));
  grill.position.set(0, 0.18, 0.04);
  g.add(grill);
  return g;
}

export function buildFurnace(): THREE.Group {
  const g = new THREE.Group();
  g.name = "fournaise";
  g.add(box(0.7, 1.15, 0.55, 0, 0.58, 0, 0x8a9098, 0.3, 0.5));
  g.add(box(0.22, 0.12, 0.08, 0.18, 0.95, 0.28, 0x1f2937, 0.2, 0.55));
  const duct = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.9), matLib.get(0xb8bec4, 0.4, 0.35));
  duct.position.set(0, 1.28, -0.2);
  g.add(duct);
  return g;
}

export function setHeatGlow(root: THREE.Object3D, on: boolean, generatorOn: boolean = false) {
  root.traverse((obj) => {
    if (obj.userData.heatFire && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (mat.emissive) mat.emissiveIntensity = on ? 0.75 : 0.04;
    }
    if (obj.userData.heatFire && obj instanceof THREE.PointLight) {
      obj.intensity = on ? 0.95 : 0;
    }
    if (obj.userData.hydroLed && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        mat.emissive.setHex(on ? 0x22c55e : 0x991b1b);
        mat.emissiveIntensity = 0.85;
      }
    }
    if (obj.userData.generatorLed && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        mat.emissive.setHex(generatorOn ? 0x3b82f6 : 0x1f2937); // Bleu vif si allumée
        mat.emissiveIntensity = generatorOn ? 1.0 : 0.0;
      }
    }
  });
}

export function buildHydroMeter(): THREE.Group {
  const g = new THREE.Group();
  g.name = "compteur_hydro";
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.05, 6), matLib.get(0x3a3e42, 0.5, 0.3));
  post.position.y = 0.52;
  g.add(post);
  g.add(box(0.28, 0.36, 0.16, 0, 1.05, 0, 0x6a6e72, 0.3, 0.45));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.03), matLib.getEmissive(0x86efac, 0x22c55e, 0.35));
  glass.position.set(0, 1.08, 0.08);
  g.add(glass);
  return g;
}

export function attachScenicHeat(parent: THREE.Object3D, heat: HeatId, yaw: number, side = 5.1, back = 3.4, hasGenerator = false) {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  
  const meter = buildHydroMeter();
  meter.position.set(rx * (side * 0.55) - fx * 0.4, 0, rz * (side * 0.55) - fz * 0.4);
  meter.rotation.y = yaw + Math.PI / 2;
  parent.add(meter);
  
  if (heat === "thermopompe" || heat === "central" || heat === "electrique") {
    const unit = buildHeatPump();
    unit.position.set(rx * side - fx * back * 0.15, 0, rz * side - fz * back * 0.15);
    unit.rotation.y = yaw + Math.PI / 2;
    parent.add(unit);
  }
  
  if (hasGenerator) {
    const gen = buildGenerator();
    gen.position.set(rx * side - fx * back * 0.4, 0, rz * side - fz * back * 0.4);
    gen.rotation.y = yaw;
    parent.add(gen);
  }
  
  if (heat === "poele" || heat === "foyer") {
    const pile = buildWoodPile();
    pile.position.set(-rx * (side * 0.72) - fx * 1.2, 0, -rz * (side * 0.72) - fz * 1.2);
    pile.rotation.y = yaw;
    parent.add(pile);
  }
}
