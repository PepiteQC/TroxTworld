/**
 * ═══════════════════════════════════════════════════════════════════
 * HAUL & LOGISTIQUE QUÉBÉCOISE — Transporteur & Chasse-Neige
 * ═══════════════════════════════════════════════════════════════════
 *
 * FLOTTE DE MÉTIERS DES ROUTES QUÉBÉCOISES :
 *  - Livreur Interprovincial (Colis & Dépôts Épicerie)
 *  - Camionneur Lourd (Fret Poids Lourd, Papeterie, Bois)
 *  - Laitier des Rangs (Québon & Producteurs Porter)
 *  - Siropier des Cabanes (Bidons d'eau d'érable)
 *  - Chauffeur de Taxi du Comté
 *  - Deneigeur SAAQ (Cônes orange, bancs de neige, sel de voirie)
 *
 * INTÉGRATIONS :
 *  - jobs.ts (paiement, syndicat des Teamsters)
 *  - banking.ts (argent déposé direct dans le compte Desjardins)
 *  - trailer.ts (7 essieux, 53 pieds B-Train, charge utile 45 000 kg)
 *  - stores.ts (délégués syndicaux, dépôts)
 *  - seasons.ts (conditions hivernales de glace et de neige)
 *  - net.ts / remotes.ts (synchronisation multijoueurs)
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { sendPrivateMessage, sendChatMessage } from "./chat";
import { triggerNotification } from "./phone";
import { addCash, getAccount } from "./banking";
import { getPlayerData } from "./character";

// Systèmes existants (base géographique)
import { LANDMARK_SHOPS } from "./commerce";
import { legalFarmsteads } from "./farms";
import { sugarSites } from "./sugar";
import { matLib } from "./materials";
import { A40_EXITS, A40_Z, PAPETERIE, VILLAGES } from "./worlddata";

// ═══════════════════════════════════════════════════════════
// TYPES DE MÉTIERS & CRITÈRES DE CAMIONNAGE
// ═══════════════════════════════════════════════════════════

export type HaulKind =
  | "livreur"           // Livreur de colis / dépanneur
  | "laitier"           // Réservoir de lait des rangs
  | "camionneur_lourd"  // Fret sur Great Dane 53' / B-Train
  | "taxi"              // Taxi du comté
  | "siropier"          // Bidons d'eau d'érable (Cabane à sucre)
  | "deblayeur_neige";  // Chasse-neige / Déneigeur contractuel

export interface HaulStop {
  name: string;
  x: number;
  z: number;
  sector: "agricole" | "autoroute" | "commercial" | "residentiel" | "sucre";
}

export interface HaulJob {
  id: string;
  kind: HaulKind;
  title: string;
  hint: string;
  from: HaulStop;
  to: HaulStop;
  pay: number;
  loaded: boolean;
  needs: "pickup" | "any";
  trailerRequirement: "standard" | "b_train" | "doubles_53" | "reso_remorque";
  payoutPenaltyIfVehiculeIncorrect: number; // % retiré si vous arrivez avec le mauvais véhicule
  weightKg: number;
  dangerousGoods: boolean;
  perishable: boolean;
}

// ═══════════════════════════════════════════════════════════
// MÉTADONNÉES DE CARRIÈRES ET DE RÉMUNÉRATION SYNDICALE
// ═══════════════════════════════════════════════════════════

const KIND_META: Record<HaulKind, {
  title: string;
  hint: string;
  needs: "pickup" | "any";
  rate: number;              // $ par unité de distance
  base: number;              // Salaire de base
  weightMinKg: number;
  weightMaxKg: number;
  dangerous: boolean;
  perishable: boolean;
  trailer: "standard" | "b_train" | "doubles_53" | "reso_remorque";
  penalty: number;           // % de pénalité pour mauvais véhicule
}> = {
  livreur: {
    title: "Livreur & Dépanneur",
    hint: "Colis délicats et dépanneur de bord de route. Coffre du pick-up F-150.",
    needs: "pickup",
    rate: 0.065,
    base: 32,
    weightMinKg: 250,
    weightMaxKg: 3200,
    dangerous: false,
    perishable: false,
    trailer: "standard",
    penalty: 25,
  },
  laitier: {
    title: "Laitier des rangs",
    hint: "Camion-citerne de lait cru, retour chargé des fermes. Certification MAPAQ requise.",
    needs: "pickup",
    rate: 0.045,
    base: 24,
    weightMinKg: 12000,
    weightMaxKg: 28000,
    dangerous: false,
    perishable: true,
    trailer: "reso_remorque",
    penalty: 40,
  },
  camionneur_lourd: {
    title: "Camionneur Fret Lourd",
    hint: "B-Train de 53 pieds chargé de poutres de bois ou papier journal. Péages A-40 acceptés.",
    needs: "pickup",
    rate: 0.085,
    base: 65,
    weightMinKg: 25000,
    weightMaxKg: 45000,
    dangerous: false,
    perishable: false,
    trailer: "doubles_53",
    penalty: 55,
  },
  taxi: {
    title: "Taxi du comté 10-8",
    hint: "Course locale à travers les 12 villages. Toyota Corolla hybride ou Kia Optima.",
    needs: "any",
    rate: 0.035,
    base: 20,
    weightMinKg: 90,
    weightMaxKg: 1450,
    dangerous: false,
    perishable: false,
    trailer: "standard",
    penalty: 15,
  },
  siropier: {
    title: "Siropier des Cabanes",
    hint: "Collecte des bidons d'eau d'érable des érablières vers l'évaporateur central.",
    needs: "pickup",
    rate: 0.05,
    base: 28,
    weightMinKg: 500,
    weightMaxKg: 5200,
    dangerous: false,
    perishable: true,
    trailer: "standard",
    penalty: 20,
  },
  deblayeur_neige: {
    title: "Déneigeur Contractuel",
    hint: "Pousse les bancs de neige avant les autobus scolaires. Contrat SAAQ et MRC de Portneuf.",
    needs: "pickup",
    rate: 0.06,
    base: 45,
    weightMinKg: 6000,
    weightMaxKg: 11000,
    dangerous: true,
    perishable: false,
    trailer: "standard",
    penalty: 35,
  },
};

// ═══════════════════════════════════════════════════════════
// SYSTÈME SYNDICAL QUÉBÉCOIS & AREX (AVIS DE GRÈVES)
// ═══════════════════════════════════════════════════════════

export interface FreightUnionState {
  isStrikeActive: boolean;
  workersOnStrike: number;
  convoyProtestLocation: { x: number; z: number } | null;
}

let unionState: FreightUnionState = {
  isStrikeActive: false,
  workersOnStrike: 18,
  convoyProtestLocation: null,
};

function checkUnionStrike() {
  // 3% de chance de déclarer un blocus syndical sauvage dans la journée
  if (!unionState.isStrikeActive && Math.random() < 0.03) {
    triggerUnionProtest();
  }
}

function triggerUnionProtest() {
  unionState.isStrikeActive = true;
  const blockingVillage = VILLAGES[Math.floor(Math.random() * VILLAGES.length)];
  unionState.convoyProtestLocation = { x: blockingVillage.center[0], z: blockingVillage.center[1] };

  sendChatMessage(`📢 [SYNDICAT TEAMSTERS] GRÈVE ROTATIVE DES TRANSPORTEURS À ${blockingVillage.name.toUpperCase()} ! Les camions sont bloqués par des cônes et piquets de grève.`);
  netEmit("haul:union_strike", { unionState });
}

// ═══════════════════════════════════════════════════════════
// CONSTRUCTION DE LA COMMANDE DE COURSE DE MARCHANDISES
// ═══════════════════════════════════════════════════════════

function villageStop(id?: string): HaulStop {
  const list = id ? VILLAGES.filter((v) => v.id === id) : VILLAGES;
  const v = list[Math.floor(Math.random() * list.length)] ?? VILLAGES[5]!;
  return { name: v.name, x: v.center[0], z: v.center[1], sector: v.id === "portneuf" ? "commercial" : "residentiel" };
}

function otherVillage(except: string): HaulStop {
  const pool = VILLAGES.filter((v) => v.name !== except);
  const v = pool[Math.floor(Math.random() * pool.length)] ?? VILLAGES[0]!;
  return { name: v.name, x: v.center[0], z: v.center[1], sector: "residentiel" };
}

function shopStop(): HaulStop {
  const s = LANDMARK_SHOPS[Math.floor(Math.random() * LANDMARK_SHOPS.length)]!;
  return { name: s.name, x: s.x, z: s.z, sector: "commercial" };
}

function exitStop(): HaulStop {
  const e = A40_EXITS[Math.floor(Math.random() * A40_EXITS.length)]!;
  return { name: `Sortie ${e.no} ${e.title}`, x: e.x, z: A40_Z + 10, sector: "autoroute" };
}

function millStop(): HaulStop {
  return { name: "Papetière Kruger de Donnacona", x: PAPETERIE.x, z: PAPETERIE.z, sector: "commercial" };
}

function farmStop(): HaulStop {
  const farms = legalFarmsteads();
  const f = farms[Math.floor(Math.random() * farms.length)] ?? farms[0]!;
  return { name: `Laiterie · ${f.name}`, x: f.x, z: f.z, sector: "agricole" };
}

function sugarStop(): HaulStop {
  const sites = sugarSites();
  const s = sites[Math.floor(Math.random() * sites.length)] ?? sites[0]!;
  return { name: s.name, x: s.x, z: s.z, sector: "sucre" };
}

// Création d'une mission selon les paramètres du métier
function makeJob(kind: HaulKind, from: HaulStop, to: HaulStop): HaulJob {
  const meta = KIND_META[kind];
  const dist = Math.hypot(to.x - from.x, to.z - from.z);
  const pay = Math.max(14, Math.round(meta.base + dist * meta.rate));

  // Facteur d'essence et chargement
  const weight = Math.floor(meta.weightMinKg + (Math.random() * (meta.weightMaxKg - meta.weightMinKg)));

  return {
    id: `${kind}-${from.name.replace(/ /g, "-")}-${to.name.replace(/ /g, "-")}-${Math.floor(Math.random() * 999)}`,
    kind,
    title: meta.title,
    hint: meta.hint,
    from,
    to,
    pay: pay,
    loaded: false,
    needs: meta.needs,
    trailerRequirement: meta.trailer,
    payoutPenaltyIfVehiculeIncorrect: meta.penalty,
    weightKg: weight,
    dangerousGoods: meta.dangerous,
    perishable: meta.perishable,
  };
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRATION DU TABLEAU DE QUART (DISPATCH BOARD)
// ═══════════════════════════════════════════════════════════

export function rollBoard(): HaulJob[] {
  checkUnionStrike();

  const shop = shopStop();
  const destA = otherVillage(shop.name);
  const farm = farmStop();
  const destB = otherVillage(farm.name);
  const cabane = sugarStop();
  const destS = otherVillage(cabane.name);

  let e1 = exitStop();
  let e2 = exitStop();
  let guard = 0;
  while (e2.name === e1.name && guard++ < 8) e2 = exitStop();

  const t1 = villageStop();
  const t2 = otherVillage(t1.name);

  const board: HaulJob[] = [
    makeJob("livreur", shop, destA),
    makeJob("laitier", farm, destB),
    makeJob("siropier", cabane, destS),
    makeJob("camionneur_lourd", e1, e2),
    makeJob("camionneur_lourd", millStop(), destA),
    makeJob("taxi", t1, t2),
  ];

  // Si c'est l'hiver (<= -1°C), ajouter une mission de déneigement
  const date = new Date();
  const month = date.getMonth();
  if (month <= 2 || month >= 11 || Math.random() < 0.25) {
    const snowStart = villageStop();
    const snowEnd = otherVillage(snowStart.name);
    board.push(makeJob("deblayeur_neige", snowStart, snowEnd));
  }

  return board;
}

// ═══════════════════════════════════════════════════════════
// OUTILS DE TRACKING ET DE PROXIMITÉ
// ═══════════════════════════════════════════════════════════

export function haulTarget(job: HaulJob): HaulStop {
  return job.loaded ? job.to : job.from;
}

export function nearHaul(job: HaulJob, x: number, z: number, radius = 24) {
  const t = haulTarget(job);
  return Math.hypot(x - t.x, z - t.z) < radius;
}

export function haulDistance(job: HaulJob, x: number, z: number) {
  const t = haulTarget(job);
  return Math.hypot(x - t.x, z - t.z);
}

// Vérifier si la commande passe à travers un piquet de grève
export function isJobBlockedByStrike(job: HaulJob): boolean {
  if (!unionState.isStrikeActive || !unionState.convoyProtestLocation) return false;
  const mouth = unionState.convoyProtestLocation;
  const dFrom = Math.hypot(job.from.x - mouth.x, job.from.z - mouth.z);
  const dTo = Math.hypot(job.to.x - mouth.x, job.to.z - mouth.z);
  return dFrom < 120 || dTo < 120;
}

// Calculer le paiement réel selon les conditions du camionnage
export function calculateHaulPay(job: HaulJob, truckTrailerValid: boolean): number {
  let pay = job.pay;

  // Grève syndicale : 30% de danger en plus ou refus du chargement
  if (isJobBlockedByStrike(job)) {
    pay = Math.round(pay * 1.35); // Danger de briseur de grève
  }

  if (!truckTrailerValid) {
    const penaltyMultiplier = 1 - (job.payoutPenaltyIfVehiculeIncorrect / 100);
    pay = Math.round(pay * penaltyMultiplier);
  }

  return pay;
}

// ═══════════════════════════════════════════════════════════
// SOUMISSION ET COMPLÉTION DE LA COURSE DE MARCHANDISES
// ═══════════════════════════════════════════════════════════

export function startHaulJob(
  playerId: string,
  jobId: string,
  board: HaulJob[],
): { ok: boolean; message: string; job: HaulJob | null } {
  const job = board.find(j => j.id === jobId);
  if (!job) return { ok: false, message: "Commande introuvable.", job: null };

  if (isJobBlockedByStrike(job)) {
    sendPrivateMessage(playerId, `⛔ [TEAMSTERS] Cette course traverse un piquet de grève ! Risque élevé de vandalisation de votre camion.`);
  }

  triggerNotification(playerId, {
    title: "🚚 Course acceptée",
    body: `${job.title} : ${job.from.name} → ${job.to.name}\nPoids: ${job.weightKg} kg${job.dangerousGoods ? " (MATIÈRE DANGEREUSE)" : ""}`,
    icon: "📦",
  });

  netEmit("haul:job_started", { playerId, jobId, board });
  return { ok: true, message: `Course ${job.id} démarrée.`, job };
}

export function completeHaulJob(
  playerId: string,
  job: HaulJob,
  vehicleTrailerOK: boolean,
): { ok: boolean; pay: number; message: string } {
  const pay = calculateHaulPay(job, vehicleTrailerOK);

  const acct = getAccount(playerId);
  if (acct) {
    addCash(pay, playerId);
    pushTx(acct, "business_income", pay, `Transport ${job.kind} complété`, acct.balance + pay);
  }

  triggerNotification(playerId, {
    title: "✅ Livraison complétée",
    body: `Reçu: ${pay}$ payés par le despatch. ${job.weightKg} kg de fret.`,
    icon: "🚛",
  });

  sendChatMessage(`📦 [LOGISTIQUE] La course ${job.title} a été livrée par ${playerId} (+${pay}$)`);
  netEmit("haul:job_completed", { playerId, job, pay });

  return { ok: true, pay, message: `Livraison terminée ! Total: ${pay}$` };
}

// ═══════════════════════════════════════════════════════════
// MODÈLES 3D DES CAISSES, PALETTES, BIDONS ET CÔNES DE NEIGE
// ═══════════════════════════════════════════════════════════

export function buildCargoCrate(): THREE.Group {
  const g = new THREE.Group();
  g.name = "cargo";
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), matLib.get(0x8a6a3a, 0.9));
  box.position.y = 0.28;
  box.castShadow = true;
  g.add(box);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.06, 0.08), matLib.get(0x3a2a18, 0.85));
  strap.position.y = 0.28;
  g.add(strap);
  return g;
}

export function buildMilkCanister(): THREE.Group {
  const g = new THREE.Group();
  g.name = "bidon_lait";
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.52, 10), matLib.get(0xf0e8d8, 0.7, 0.5));
  tank.position.y = 0.26;
  g.add(tank);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), matLib.get(0x4a4a4a, 0.3, 0.6));
  lid.position.y = 0.48;
  g.add(lid);
  return g;
}

export function buildMapleBarrel(): THREE.Group {
  const g = new THREE.Group();
  g.name = "baril_sirop";
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.65, 12), matLib.get(0xcf8d20, 0.8, 0.1));
  barrel.position.y = 0.34;
  g.add(barrel);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), matLib.get(0x6b4e18, 0.3, 0.7));
  tap.position.set(0, 0.22, 0.46);
  g.add(tap);
  return g;
}

export function buildSaltBagPallet(): THREE.Group {
  const g = new THREE.Group();
  g.name = "palette_sel";
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.13, 1.2), matLib.get(0x8a6a3a, 0.9));
  pallet.position.y = 0.07;
  g.add(pallet);

  for (let i = 0; i < 9; i++) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.32), matLib.get(0xe8e8e0, 0.9));
    bag.position.set(-0.36 + (i % 3) * 0.36, 0.2 + Math.floor(i / 3) * 0.26, -0.36 + Math.floor((i % 5) / 2) * 0.28);
    bag.castShadow = true;
    g.add(bag);
  }
  return g;
}

export function buildSnowBarrow() {
  const g = new THREE.Group();
  g.name = "souffleuse_neige";
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.6), matLib.get(0xd5441c, 0.5, 0.3));
  chassis.position.y = 0.24;
  chassis.castShadow = true;
  g.add(chassis);
  const auger = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8), matLib.get(0x3a3e44, 0.3, 0.8));
  auger.rotation.z = Math.PI / 2;
  auger.position.set(0.9, 0.44, 0);
  auger.castShadow = true;
  g.add(auger);

  // Cône orange emblématique des chantiers du Québec
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), matLib.get(0xff6600, 0.4, 0.3));
  cone.position.set(0, 0.2, 0.8);
  g.add(cone);

  return g;
}

// ═══════════════════════════════════════════════════════════
// EXPORT DU SYSTÈME GLOBAL DE CARRIÈRES
// ═══════════════════════════════════════════════════════════

export function getUnionState(): FreightUnionState {
  return unionState;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pushTx(account: any, type: string, amount: number, desc: string, balance: number) {
  // Intégration simple : ceci est un placeholder pour banking.ts
  netEmit("bank:tx_push", { accountId: account.accountId, type, amount, desc, balance });
}

// ═══════════════════════════════════════════════════════════
// ENREGISTREMENT DES REMOTES RPC MULTIJOUEUR
// ═══════════════════════════════════════════════════════════

registerRemote("haul:start_job", startHaulJob);
registerRemote("haul:complete_job", completeHaulJob);
registerRemote("haul:check_union", getUnionState);