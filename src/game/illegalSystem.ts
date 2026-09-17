/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME CLANDESTIN & CRIME ORGANISÉ DU QUÉBEC
 * ═══════════════════════════════════════════════════════════════════
 *
 * PILIERS D'IMMERSION RÉALISTE :
 *  1. CULTURE DE CANNABIS CLANDESTINE :
 *     - Indoor (sous-sol, garage, conteneur enterré) & Outdoor (clairière, rang de campagne).
 *     - Dérivation illégale de compteur Hydro-Québec (by-pass) pour éviter les soupçons de consommation.
 *     - Équipements : lampes HPS/LED, engrais, filtres à charbon (odeur détectable par la SQ).
 *
 *  2. LABORATOIRES DE SYNTHÈSE & PRESSAGE :
 *     - Synthèse de Méthamphétamine / Speed ("Ice" québécois).
 *     - Presse à comprimés (pilules de meth/speed aux logos de marques connues).
 *     - Extraction BHO / Shatter au gaz butane (danger réel d'explosion de garage).
 *     - Coupage au Fentanyl (risque mortel d'overdose pour les clients).
 *
 *  3. GANGS & GUERRES DE TERRITOIRE :
 *     - Hells Angels (Chapitres Nomads/Trois-Rivières/Québec, contrôle des clubs, motards patchés).
 *     - Gangs de rue de Montréal (Alliances Bleus / Rouges, CDP, Bo-Gars, STL, RDP, Mtl-Nord).
 *     - Mafia Italienne de Montréal (Clan du Consorzio, pizzo/protection, construction, importation).
 *     - Réseaux des Réserves Autochtones (Contrebande de cigarettes sans taxe, armes non répertoriées).
 *
 *  4. DEAL DE RUE & POINTS DE CHUTE :
 *     - Vente au coin de la rue, stations de métro, parcs, dépanneurs de nuit.
 *     - Téléphones brûleurs ("Burner phones") et messages codés.
 *     - Clients PNJ & Joueurs, négociation, arnaques de faux billets, undercover cops.
 *
 *  5. CONTREBANDE & IMPORTATION :
 *     - Conteneurs au Port de Montréal (dockers soudoyés, saisies aux douanes).
 *     - Cigarettes indiennes (smoke shacks, ballots de tabac brut).
 *     - Détournement de camions de transport sur l'autoroute 20 et la 40.
 *
 *  6. BRAQUAGES AVANCÉS & BLANCHIMENT :
 *     - GAB : chalumeau oxyacétylène, explosion au gaz, arrachage au pick-up V8.
 *     - Fourgons blindés Garda : embuscades coordonnées sur les routes de campagne.
 *     - Entreprises de façade : lave-auto, bar de danseuses, compagnie d'excavation, pizzeria.
 *
 * INTÉGRATIONS :
 *  - police.ts (wanted stars, raids de l'ERM / GTI, surveillance thermique aérienne)
 *  - banking.ts (argent sale marqué vs propre, comptes Desjardins)
 *  - sqdc.ts (concurrence directe, guerre de prix marché noir vs étatique)
 *  - survival.ts (toxicité, overdoses, trousses de Narcan)
 *  - net.ts / remotes.ts (synchronisation multi-joueurs en temps réel)
 * ═══════════════════════════════════════════════════════════════════
 */

import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { sendPrivateMessage, sendChatMessage } from "./chat";
import { triggerNotification } from "./phone";
import { getPlayerData } from "./character";

// Systèmes interconnectés
import { addWantedPoints, dispatchPolice } from "./police";
import { addCash, removeCash, getAccount, pushTx } from "./banking";
import { addToInventory, removeFromInventory, getInventoryItem } from "./backpack";
import { modifyHealth, getPlayerHealth } from "./survival";

// ═══════════════════════════════════════════════════════════
// TYPES & CATALOGUES DES SUBSTANCES
// ═══════════════════════════════════════════════════════════

export type IllicitSubstance =
  | "cannabis_hydro"       // Fleur intérieure forte (Skunk / Kush)
  | "cannabis_outdoor"     // Pot de rang québécois
  | "shatter_bho"          // Concentré de cannabis inflammable
  | "speed_ice"            // Comprimés de méthamphétamine ("Speed")
  | "coke_pure"            // Cocaïne pure importée
  | "coke_cut"             // Poudre coupée de rue
  | "crack"                // Cailloux de base libre cuits au bicarbonate
  | "fentanyl_pure"        // Poudre létale de fentanyl
  | "fentanyl_cut_pills"   // Faux comprimés contrefaits
  | "cigarettes_indiennes" // Cigarettes de contrebande sans taxe
  | "moonshine_quebec";    // Alcool de contrebande artisanal

export type SubstanceQuality =
  | "poubelle"             // 10-25% pureté (coupé à mort)
  | "standard_rue"         // 40-60% pureté
  | "qualite_superieure"   // 75-90% pureté
  | "pure_import"          // 95%+ pureté
  | "contaminee_fentanyl"; // DANGER MORTEL D'OVERDOSE

export interface DrugBatch {
  id: string;
  substance: IllicitSubstance;
  quality: SubstanceQuality;
  weightGrams: number;
  purityScore: number;     // 0 à 100
  hasFentanylRisk: boolean;
  producedBy: string;      // playerId
  batchDate: number;
  streetPricePerGram: number;
}

// ═══════════════════════════════════════════════════════════
// TYPES — PLANTATIONS (GROW-OPS)
// ═══════════════════════════════════════════════════════════

export type GrowOpEnvironment = "sous_sol" | "garage" | "grange_isolee" | "clairiere_foret" | "conteneur_enterre";

export interface GrowOpLocation {
  id: string;
  ownerId: string;
  ownerGang: CriminalFaction;
  environment: GrowOpEnvironment;
  position: { x: number; y: number; z: number };
  plantCount: number;
  maxCapacity: number;
  growthProgress: number;     // 0 à 100%
  health: number;             // 0 à 100% (eau/engrais)
  waterLevel: number;         // 0 à 100%
  nutrientLevel: number;      // 0 à 100%
  lightingType: "led_eco" | "hps_puissant" | "soleil_naturel";
  hydroBypassInstalled: boolean; // Si faux : la SQ repère les pics de consommation électrique !
  carbonFilterQuality: number;   // 0 à 100% (si 0 : l'odeur alerte les voisins)
  smellRadiusMeters: number;
  policeSuspicion: number;    // 0 à 100% (raid à 85%+)
  plantedAt: number;
  lastTendedAt: number;
  estimatedYieldGrams: number;
}

// ═══════════════════════════════════════════════════════════
// TYPES — LABORATOIRES CLANDESTINS
// ═══════════════════════════════════════════════════════════

export type LabType = "meth_speed" | "extraction_bho" | "crack_kitchen" | "pressage_pilules";

export interface ClandestineLab {
  id: string;
  ownerId: string;
  ownerGang: CriminalFaction;
  type: LabType;
  position: { x: number; y: number; z: number };
  equipmentTier: 1 | 2 | 3;   // 1=bricolé (danger d'explosion), 3=verrerie de chimiste
  temperature: number;        // Celsius
  isCooking: boolean;
  cookProgress: number;       // 0 à 100%
  ingredientsLoaded: Record<string, number>;
  explosionRisk: number;      // % de chance d'exploser si surchauffe
  fumesDetected: boolean;
  totalBatchesCooked: number;
}

// ═══════════════════════════════════════════════════════════
// TYPES — GANGS & FACTIONS QUÉBÉCOISES
// ═══════════════════════════════════════════════════════════

export type CriminalFaction =
  | "independant"
  | "hells_angels"           // Motards 1% (Hells Angels QC)
  | "gang_rue_bleu"          // Allégeance Bleue (Crips / CDP / Saint-Michel)
  | "gang_rue_rouge"         // Allégeance Rouge (Bloods / Bo-Gars / Mtl-Nord)
  | "mafia_montreal"         // Clan Italien traditionnel
  | "reseau_autochtone";     // Contrebande frontalière

export interface GangTerritory {
  territoryId: string;
  zoneName: string;          // "Montréal-Nord", "Plateau", "Donnacona", "Port de Montréal"
  controllingGang: CriminalFaction;
  controlPercentage: number; // 0 à 100%
  dailyTaxesCollected: number;
  dealerSpots: Array<{ x: number; z: number; assignedDealerId: string | null }>;
  isUnderContest: boolean;
  warProgress: number;       // 0 à 100% vers prise de contrôle
  challengerGang: CriminalFaction | null;
}

export interface FactionProfile {
  factionId: CriminalFaction;
  name: string;
  leaderId: string | null;
  members: Array<{ playerId: string; rank: "prospect" | "membre" | "lieutenant" | "boss" }>;
  reputation: number;        // 0 à 100
  bankBalance: number;       // Trésor de guerre
  safehouses: Array<{ x: number; z: number }>;
  rivalFactions: CriminalFaction[];
}

// ═══════════════════════════════════════════════════════════
// TYPES — CONTREBANDE, IMPORTATION & FOURGONS
// ═══════════════════════════════════════════════════════════

export interface PortContainer {
  containerId: string;
  originCountry: string;     // "Colombie", "Chine", "Mexique"
  declaredContents: string;  // "Pièces d'autos", "Bananes", "Textiles"
  hiddenIllicitCargo: Array<{ substance: IllicitSubstance; quantity: number }>;
  bribePaidToDocker: boolean;
  customsInspected: boolean;
  isSeized: boolean;
  dockLocation: { x: number; z: number };
  retrieved: boolean;
}

export interface ArmoredTruckHeist {
  heistId: string;
  truckId: string;
  leaderId: string;
  crewIds: string[];
  lootCash: number;
  doorBreached: boolean;
  c4Planted: boolean;
  c4TimerSeconds: number;
  policeResponseTimerSeconds: number;
  status: "planning" | "in_progress" | "loot_secured" | "failed";
}

// ═══════════════════════════════════════════════════════════
// ÉTAT GLOBAL DU MARCHÉ NOIR
// ═══════════════════════════════════════════════════════════

const GROW_OPS = new Map<string, GrowOpLocation>();
const LABS = new Map<string, ClandestineLab>();
const TERRITORIES = new Map<string, GangTerritory>();
const FACTIONS = new Map<CriminalFaction, FactionProfile>();
const PORT_CONTAINERS = new Map<string, PortContainer>();
const ACTIVE_HEISTS = new Map<string, ArmoredTruckHeist>();

let batchCounter = 1000;

// Initialiser les territoires de base du comté et de la métropole
function initTerritories() {
  const zones: Array<{ id: string; name: string; gang: CriminalFaction }> = [
    { id: "ter_mtl_nord", name: "Montréal-Nord", gang: "gang_rue_rouge" },
    { id: "ter_saint_michel", name: "Saint-Michel", gang: "gang_rue_bleu" },
    { id: "ter_petite_italie", name: "Petite-Italie & RDP", gang: "mafia_montreal" },
    { id: "ter_portneuf_centre", name: "Portneuf & Rang Sainte-Anne", gang: "hells_angels" },
    { id: "ter_donnacona_indus", name: "Parc Industriel Donnacona", gang: "hells_angels" },
    { id: "ter_port_montreal", name: "Docks du Port de Montréal", gang: "mafia_montreal" },
    { id: "ter_reserve_frontiere", name: "Corridor Frontalier / Réserve", gang: "reseau_autochtone" },
  ];

  for (const z of zones) {
    TERRITORIES.set(z.id, {
      territoryId: z.id,
      zoneName: z.name,
      controllingGang: z.gang,
      controlPercentage: 80,
      dailyTaxesCollected: 1200,
      dealerSpots: [
        { x: 10, z: -20, assignedDealerId: null },
        { x: -15, z: 30, assignedDealerId: null },
      ],
      isUnderContest: false,
      warProgress: 0,
      challengerGang: null,
    });
  }

  // Factions
  const factionList: CriminalFaction[] = [
    "hells_angels",
    "gang_rue_bleu",
    "gang_rue_rouge",
    "mafia_montreal",
    "reseau_autochtone",
    "independant",
  ];

  for (const f of factionList) {
    FACTIONS.set(f, {
      factionId: f,
      name: f.replace(/_/g, " ").toUpperCase(),
      leaderId: null,
      members: [],
      reputation: 50,
      bankBalance: 250000,
      safehouses: [],
      rivalFactions: f === "gang_rue_bleu" ? ["gang_rue_rouge"] : f === "gang_rue_rouge" ? ["gang_rue_bleu"] : [],
    });
  }
}
initTerritories();

// ═══════════════════════════════════════════════════════════
// 1. CULTURE DE CANNABIS ILLÉGALE (PLANTATIONS DE RANG)
// ═══════════════════════════════════════════════════════════

export interface CreateGrowOpResult {
  ok: boolean;
  message: string;
  growOp: GrowOpLocation | null;
}

export function createGrowOp(
  ownerId: string,
  environment: GrowOpEnvironment,
  position: { x: number; y: number; z: number },
  plantCount: number = 12,
  gang: CriminalFaction = "independant",
): CreateGrowOpResult {
  const growId = `GROW-${Date.now().toString(36).toUpperCase()}`;

  const maxCap =
    environment === "grange_isolee" ? 60
    : environment === "clairiere_foret" ? 100
    : environment === "conteneur_enterre" ? 30
    : 20;

  const growOp: GrowOpLocation = {
    id: growId,
    ownerId,
    ownerGang: gang,
    environment,
    position,
    plantCount: Math.min(plantCount, maxCap),
    maxCapacity: maxCap,
    growthProgress: 0,
    health: 100,
    waterLevel: 80,
    nutrientLevel: 80,
    lightingType: environment === "clairiere_foret" ? "soleil_naturel" : "hps_puissant",
    hydroBypassInstalled: false, // Pas installé par défaut -> risque de détection Hydro
    carbonFilterQuality: 100,
    smellRadiusMeters: 15,
    policeSuspicion: 0,
    plantedAt: Date.now(),
    lastTendedAt: Date.now(),
    estimatedYieldGrams: plantCount * 85, // ~85g par plant
  };

  GROW_OPS.set(growId, growOp);

  triggerNotification(ownerId, {
    title: "🌿 Plantation installée",
    body: `${plantCount} plants en terre (${environment})\nSurveillez l'eau et le compteur Hydro !`,
    icon: "🌱",
  });

  netEmit("illegal:grow_created", { growOp });
  return { ok: true, message: `Plantation clandestine active (${plantCount} plants).`, growOp };
}

// Installer une dérivation clandestine sur le compteur Hydro-Québec
export function installHydroBypass(
  growId: string,
  electricianPlayerId: string,
): { ok: boolean; message: string } {
  const grow = GROW_OPS.get(growId);
  if (!grow) return { ok: false, message: "Plantation introuvable." };
  if (grow.environment === "clairiere_foret") {
    return { ok: false, message: "Pas de compteur Hydro en pleine forêt !" };
  }

  const pliers = getInventoryItem(electricianPlayerId, "pince_electricien" as any) ?? 0;
  if (pliers < 1) {
    return { ok: false, message: "Il vous faut des pinces d'électricien et du câble 240V." };
  }

  // Risque d'électrocution ou d'étincelle
  if (Math.random() < 0.15) {
    modifyHealth(-25, electricianPlayerId);
    return { ok: false, message: "⚡ CHOC ÉLECTRIQUE ! Court-circuit sur le panneau d'Hydro-Québec !" };
  }

  grow.hydroBypassInstalled = true;
  grow.policeSuspicion = Math.max(0, grow.policeSuspicion - 30);

  netEmit("illegal:hydro_bypassed", { growId });
  return { ok: true, message: "Compteur Hydro-Québec contourné ! Électricité gratuite et indétectable." };
}

// Entretien et arrosage de la plantation
export function tendGrowOp(
  growId: string,
  tendedById: string,
  addNutrients: boolean = false,
): { ok: boolean; message: string; grow: GrowOpLocation | null } {
  const grow = GROW_OPS.get(growId);
  if (!grow) return { ok: false, message: "Plantation introuvable.", grow: null };

  grow.waterLevel = 100;
  if (addNutrients) {
    grow.nutrientLevel = 100;
    grow.health = Math.min(100, grow.health + 10);
  }
  grow.lastTendedAt = Date.now();

  netEmit("illegal:grow_tended", { growId });
  return { ok: true, message: "Plants arrosés et fertilisés avec succès.", grow };
}

// Récolte finale de la plantation
export function harvestGrowOp(
  growId: string,
  harvesterId: string,
): { ok: boolean; yieldGrams: number; message: string } {
  const grow = GROW_OPS.get(growId);
  if (!grow) return { ok: false, yieldGrams: 0, message: "Plantation introuvable." };

  if (grow.growthProgress < 85) {
    return { ok: false, yieldGrams: 0, message: `Les cocottes ne sont pas mûres ! (${grow.growthProgress.toFixed(0)}% croissance)` };
  }

  const finalYield = Math.round(grow.estimatedYieldGrams * (grow.health / 100));

  // Ajouter au sac du récolteur
  addToInventory("cannabis_hydro" as any, finalYield, harvesterId);

  GROW_OPS.delete(growId);

  sendChatMessage(`✂️ [RÉCOLTE] Une plantation de ${grow.plantCount} plants a été coupée et séchée (+${finalYield}g de Kush).`);
  netEmit("illegal:grow_harvested", { growId, yieldGrams: finalYield, harvesterId });

  return {
    ok: true,
    yieldGrams: finalYield,
    message: `Récolte exceptionnelle : +${finalYield} grammes de têtes manucurées !`,
  };
}

// ═══════════════════════════════════════════════════════════
// 2. LABORATOIRES DE SYNTHÈSE (METH, SPEED, BHO)
// ═══════════════════════════════════════════════════════════

export function setupLab(
  ownerId: string,
  type: LabType,
  position: { x: number; y: number; z: number },
  tier: 1 | 2 | 3 = 1,
): { ok: boolean; message: string; lab: ClandestineLab | null } {
  const labId = `LAB-${Date.now().toString(36).toUpperCase()}`;

  const lab: ClandestineLab = {
    id: labId,
    ownerId,
    ownerGang: "independant",
    type,
    position,
    equipmentTier: tier,
    temperature: 20,
    isCooking: false,
    cookProgress: 0,
    ingredientsLoaded: {},
    explosionRisk: tier === 1 ? 25 : 5,
    fumesDetected: false,
    totalBatchesCooked: 0,
  };

  LABS.set(labId, lab);
  netEmit("illegal:lab_created", { lab });
  return { ok: true, message: `Laboratoire de ${type} monté au poste.`, lab };
}

export function startChemicalCook(
  labId: string,
  cookerId: string,
): { ok: boolean; message: string } {
  const lab = LABS.get(labId);
  if (!lab) return { ok: false, message: "Labo introuvable." };
  if (lab.isCooking) return { ok: false, message: "Une cuite chimique est déjà en réaction !" };

  lab.isCooking = true;
  lab.cookProgress = 0;
  lab.temperature = 140; // Montée en température chimique

  // Risque d'explosion instantané si erreur de mélange
  if (Math.random() < lab.explosionRisk / 100) {
    lab.isCooking = false;
    modifyHealth(-85, cookerId);
    dispatchPolice({
      location: { x: lab.position.x, z: lab.position.z },
      priority: "critical",
      type: "shots_fired",
      description: "EXPLOSION DE LABORATOIRE CLANDESTIN SIGNALÉE !",
    });
    return { ok: false, message: "💥 BOOM ! Le réacteur a explosé ! Vous êtes gravement brûlé !" };
  }

  netEmit("illegal:cook_started", { labId });
  return { ok: true, message: "Réaction chimique amorcée. Surveillez les manomètres !" };
}

// Pressage de pilules de Speed / Ice (les fameuses pilules québécoises)
export function pressSpeedPills(
  labId: string,
  presserId: string,
  powderGrams: number,
  logoStamp: "etoile" | "canadien" | "playboy" | "cd",
  cutWithFentanyl: boolean = false,
): { ok: boolean; pillsCount: number; message: string } {
  const lab = LABS.get(labId);
  if (!lab || lab.type !== "pressage_pilules") {
    return { ok: false, pillsCount: 0, message: "Presse à comprimés hydraulique requise." };
  }

  // 1g de poudre = ~4 pilules pressées avec agent liant
  const pillsCount = Math.floor(powderGrams * 4);

  const substance: IllicitSubstance = cutWithFentanyl ? "fentanyl_cut_pills" : "speed_ice";
  addToInventory(substance as any, pillsCount, presserId);

  if (cutWithFentanyl) {
    sendChatMessage(`⚠️ [ALERTE SANTÉ] Des pilules de Speed pressées avec du FENTANYL circulent dans la région !`);
  }

  netEmit("illegal:pills_pressed", { labId, pillsCount, stamp: logoStamp, cutWithFentanyl });
  return {
    ok: true,
    pillsCount,
    message: `Pressage terminé : +${pillsCount} comprimés de Speed (Logo ${logoStamp}).`,
  };
}

// ═══════════════════════════════════════════════════════════
// 3. GUERRES DE TERRITOIRE & PIZZO (RACKET)
// ═══════════════════════════════════════════════════════════

export function claimTerritorySpot(
  territoryId: string,
  gang: CriminalFaction,
  spotIndex: number,
  dealerId: string,
): { ok: boolean; message: string } {
  const ter = TERRITORIES.get(territoryId);
  if (!ter) return { ok: false, message: "Territoire introuvable." };

  if (ter.controllingGang !== gang && !ter.isUnderContest) {
    return {
      ok: false,
      message: `Ce secteur est contrôlé par les ${ter.controllingGang.toUpperCase()}. Vous devez leur déclarer la guerre d'abord.`,
    };
  }

  if (!ter.dealerSpots[spotIndex]) {
    return { ok: false, message: "Emplacement de deal invalide." };
  }

  ter.dealerSpots[spotIndex].assignedDealerId = dealerId;
  netEmit("illegal:spot_claimed", { territoryId, spotIndex, dealerId });

  return { ok: true, message: `Coin de rue revendiqué pour les ${gang.toUpperCase()}.` };
}

export function triggerGangWar(
  territoryId: string,
  attackingGang: CriminalFaction,
): { ok: boolean; message: string } {
  const ter = TERRITORIES.get(territoryId);
  if (!ter) return { ok: false, message: "Territoire introuvable." };
  if (ter.controllingGang === attackingGang) return { ok: false, message: "Vous contrôlez déjà ce quartier." };

  ter.isUnderContest = true;
  ter.challengerGang = attackingGang;
  ter.warProgress = 0;

  sendChatMessage(`⚔️ [GUERRE DE TERRITOIRE] Les ${attackingGang.toUpperCase()} attaquent le secteur ${ter.zoneName} tenu par les ${ter.controllingGang.toUpperCase()} !`);
  netEmit("illegal:gang_war_started", { territoryId, attackingGang });

  return { ok: true, message: `Guerre déclarée à ${ter.zoneName} ! Éliminez les rivaux pour prendre le contrôle.` };
}

// Percevoir le Pizzo (taxe de protection sur les commerces locaux)
export function collectPizzoTax(
  territoryId: string,
  collectorId: string,
  gang: CriminalFaction,
): { ok: boolean; collectedAmount: number; message: string } {
  const ter = TERRITORIES.get(territoryId);
  if (!ter) return { ok: false, collectedAmount: 0, message: "Territoire introuvable." };
  if (ter.controllingGang !== gang) return { ok: false, collectedAmount: 0, message: "Votre gang ne contrôle pas ce secteur." };

  const cash = ter.dailyTaxesCollected;
  addCash(cash, collectorId);
  ter.dailyTaxesCollected = 0;

  sendPrivateMessage(collectorId, `💰 Enveloppe de protection perçue : +${cash}$ (argent sale).`);
  netEmit("illegal:pizzo_collected", { territoryId, collectorId, amount: cash });

  return { ok: true, collectedAmount: cash, message: `Racket perçu : ${cash}$ récoltés auprès des marchands.` };
}

// ═══════════════════════════════════════════════════════════
// 4. DEAL DE RUE & INTERACTIONS CLIENTS
// ═══════════════════════════════════════════════════════════

export interface StreetDealResult {
  ok: boolean;
  revenue: number;
  productSold: string;
  isUndercoverCop: boolean;
  overdoseTriggered: boolean;
  message: string;
}

export function executeStreetDeal(
  sellerId: string,
  substance: IllicitSubstance,
  quantityGrams: number,
  territoryId?: string,
): StreetDealResult {
  const count = getInventoryItem(sellerId, substance as any) ?? 0;
  if (count < quantityGrams) {
    return {
      ok: false,
      revenue: 0,
      productSold: substance,
      isUndercoverCop: false,
      overdoseTriggered: false,
      message: "Vous n'avez pas assez de marchandise sur vous.",
    };
  }

  // Prix de base québécois au gramme
  const priceMap: Record<IllicitSubstance, number> = {
    cannabis_hydro: 8,
    cannabis_outdoor: 4,
    shatter_bho: 45,
    speed_ice: 10,
    coke_pure: 100,
    coke_cut: 60,
    crack: 40,
    fentanyl_pure: 150,
    fentanyl_cut_pills: 20,
    cigarettes_indiennes: 5,
    moonshine_quebec: 15,
  };

  const unitPrice = priceMap[substance] || 10;
  const totalCash = unitPrice * quantityGrams;

  // 1. Risque d'agent de police infiltré (Undercover sting)
  if (Math.random() < 0.08) {
    addWantedPoints(sellerId, 45, "Trafic de stupéfiants flagrant délit");
    return {
      ok: false,
      revenue: 0,
      productSold: substance,
      isUndercoverCop: true,
      overdoseTriggered: false,
      message: "🚨 « POLICE ! BOUGEZ PLUS ! » C'était un flic en civil !",
    };
  }

  // 2. Risque de faux billets
  if (Math.random() < 0.05) {
    removeFromInventory(substance as any, quantityGrams, sellerId);
    return {
      ok: false,
      revenue: 0,
      productSold: substance,
      isUndercoverCop: false,
      overdoseTriggered: false,
      message: "💸 Le client s'est poussé avec la drogue et vous a filé des faux billets de 20$ en papier !",
    };
  }

  // 3. Risque d'overdose du client si coupé au fentanyl
  let overdose = false;
  if (substance === "fentanyl_cut_pills" || substance === "fentanyl_pure") {
    if (Math.random() < 0.35) {
      overdose = true;
      sendChatMessage(`🚑 [URGENCE MÉDICALE 911] Un consommateur s'est effondré en arrêt respiratoire suite à une dose de fentanyl contaminé !`);
    }
  }

  // Transaction réussie
  removeFromInventory(substance as any, quantityGrams, sellerId);
  addCash(totalCash, sellerId);

  // Redevance au gang du territoire
  if (territoryId) {
    const ter = TERRITORIES.get(territoryId);
    if (ter) {
      ter.dailyTaxesCollected += Math.round(totalCash * 0.15); // 15% de cote
    }
  }

  netEmit("illegal:street_deal_done", { sellerId, substance, totalCash, overdose });
  return {
    ok: true,
    revenue: totalCash,
    productSold: substance,
    isUndercoverCop: false,
    overdoseTriggered: overdose,
    message: `Vente complétée : +${totalCash}$ en liquide pour ${quantityGrams}g de ${substance}.`,
  };
}

// ═══════════════════════════════════════════════════════════
// 5. IMPORTATION (PORT DE MONTRÉAL & CONTREBANDE)
// ═══════════════════════════════════════════════════════════

export function orderPortContainer(
  buyerId: string,
  origin: string,
  declared: string,
  cargo: Array<{ substance: IllicitSubstance; quantity: number }>,
  bribeDocker: boolean = true,
): { ok: boolean; containerId: string; totalCost: number; message: string } {
  const containerId = `CONT-${Math.floor(100000 + Math.random() * 900000)}`;
  const bribeCost = bribeDocker ? 15000 : 0;
  const cargoCost = cargo.reduce((sum, item) => sum + item.quantity * 25, 0);
  const totalCost = cargoCost + bribeCost;

  const acct = getAccount(buyerId);
  if (!acct || acct.balance < totalCost) {
    return { ok: false, containerId: "", totalCost, message: "Fonds insuffisants pour payer la cargaison et les dockers." };
  }

  removeCash(totalCost, buyerId);

  const container: PortContainer = {
    containerId,
    originCountry: origin,
    declaredContents: declared,
    hiddenIllicitCargo: cargo,
    bribePaidToDocker: bribeDocker,
    customsInspected: false,
    isSeized: false,
    dockLocation: { x: 340, z: -120 },
    retrieved: false,
  };

  PORT_CONTAINERS.set(containerId, container);

  triggerNotification(buyerId, {
    title: "🚢 Conteneur au Port de Montréal",
    body: `Cargaison #${containerId} en transit maritime.\nArrivée prévue au terminal de conteneurs.`,
    icon: "📦",
  });

  netEmit("illegal:container_ordered", { container });
  return { ok: true, containerId, totalCost, message: `Conteneur commandé (+${cargo.length} cargaisons).` };
}

export function unloadPortContainer(
  containerId: string,
  playerId: string,
): { ok: boolean; seized: boolean; itemsRetrieved: number; message: string } {
  const cont = PORT_CONTAINERS.get(containerId);
  if (!cont || cont.retrieved) return { ok: false, seized: false, itemsRetrieved: 0, message: "Conteneur introuvable ou déjà vidé." };

  // Chance de saisie douanière si aucun pot-de-vin payé
  const seizureChance = cont.bribePaidToDocker ? 0.05 : 0.65;
  if (Math.random() < seizureChance) {
    cont.isSeized = true;
    cont.retrieved = true;
    addWantedPoints(playerId, 80, "Importation illégale internationale via le Port de Montréal");
    sendChatMessage(`🚨 [ASFC / DOUANES] Saisie record d'un conteneur de contrebande au Port de Montréal !`);
    return { ok: false, seized: true, itemsRetrieved: 0, message: "Les douaniers et chiens renifleurs ont saisi la cargaison !" };
  }

  // Récupération du stock
  let totalItems = 0;
  for (const cargo of cont.hiddenIllicitCargo) {
    addToInventory(cargo.substance as any, cargo.quantity, playerId);
    totalItems += cargo.quantity;
  }

  cont.retrieved = true;
  netEmit("illegal:container_unloaded", { containerId, playerId });

  return {
    ok: true,
    seized: false,
    itemsRetrieved: totalItems,
    message: `Cargaison déchargée avec succès (+${totalItems} unités illicites dans vos camions) !`,
  };
}

// ═══════════════════════════════════════════════════════════
// 6. BRAQUAGES AVANCÉS (GAB, FOURGON GARDA, CAISSE)
// ═══════════════════════════════════════════════════════════

export function crackAtmAdvanced(
  villageName: string,
  method: "chalumeau" | "arrachage_pickup" | "explosion_gaz" | "carte_skimmer",
  hackerId: string,
): { ok: boolean; loot: number; alarmTriggered: boolean; message: string } {
  let loot = 0;
  let alarmChance = 0.5;

  switch (method) {
    case "chalumeau":
      loot = Math.floor(6000 + Math.random() * 8000);
      alarmChance = 0.4;
      break;
    case "arrachage_pickup":
      loot = Math.floor(12000 + Math.random() * 15000);
      alarmChance = 0.95; // Extrêmement bruyant !
      break;
    case "explosion_gaz":
      loot = Math.floor(18000 + Math.random() * 20000);
      alarmChance = 1.0;
      break;
    case "carte_skimmer":
      loot = Math.floor(2500 + Math.random() * 4000);
      alarmChance = 0.05; // Très discret
      break;
  }

  const alarmTriggered = Math.random() < alarmChance;
  if (alarmTriggered) {
    addWantedPoints(hackerId, 40, `Braquage de GAB Caisse Populaire (${villageName})`);
    dispatchPolice({
      location: { x: 0, z: 0 },
      priority: "high",
      type: "bank_alarm",
      description: `Alarme effraction guichet automatique à ${villageName} (Méthode: ${method})`,
    });
  }

  addCash(loot, hackerId);
  netEmit("illegal:atm_cracked", { villageName, method, loot, alarmTriggered });

  return {
    ok: true,
    loot,
    alarmTriggered,
    message: `GAB forcé via ${method} ! Butin: +${loot}$ ${alarmTriggered ? "(Alarme 10-90 activée !)" : ""}`,
  };
}

// Embuscade sur un fourgon blindé Garda World
export function ambushArmoredTruck(
  truckId: string,
  leaderId: string,
  crewPlayerIds: string[],
): { ok: boolean; totalLoot: number; message: string } {
  const heistId = `HEIST-${Date.now().toString(36).toUpperCase()}`;

  const cashInTruck = Math.floor(150000 + Math.random() * 250000);
  const heist: ArmoredTruckHeist = {
    heistId,
    truckId,
    leaderId,
    crewIds: [leaderId, ...crewPlayerIds],
    lootCash: cashInTruck,
    doorBreached: true,
    c4Planted: true,
    c4TimerSeconds: 0,
    policeResponseTimerSeconds: 90,
    status: "loot_secured",
  };

  ACTIVE_HEISTS.set(heistId, heist);

  // Alerte générale SQ et SPVM
  sendChatMessage(`🚨🚨 [ATTAQUE FOURGON BLINDÉ] Braquage lourd en cours sur un camion blindé de transport de valeurs !`);
  for (const member of heist.crewIds) {
    addWantedPoints(member, 150, "Attaque à main armée sur fourgon blindé");
    const share = Math.round(cashInTruck / heist.crewIds.length);
    addCash(share, member);
  }

  netEmit("illegal:armored_truck_ambushed", { heist });
  return {
    ok: true,
    totalLoot: cashInTruck,
    message: `Portes du fourgon sautées au C4 ! ${cashInTruck}$ récupérés et partagés entre les braqueurs !`,
  };
}

// ═══════════════════════════════════════════════════════════
// 7. BLANCHIMENT D'ARGENT
// ═══════════════════════════════════════════════════════════

export function launderThroughBusiness(
  businessType: "lave_auto" | "bar_danseuses" | "excavation_construction" | "pizzeria",
  dirtyCashAmount: number,
  laundererId: string,
): { ok: boolean; cleanCash: number; taxCut: number; message: string } {
  const cuts: Record<string, number> = {
    lave_auto: 0.20,             // 20% de perte
    bar_danseuses: 0.15,         // 15% de perte (excellent pour le cash)
    excavation_construction: 0.10, // 10% de perte (grosses factures)
    pizzeria: 0.25,              // 25% de perte
  };

  const cutRate = cuts[businessType] || 0.20;
  const taxCut = Math.round(dirtyCashAmount * cutRate);
  const cleanCash = dirtyCashAmount - taxCut;

  const acct = getAccount(laundererId);
  if (acct) {
    pushTx(acct, "business_income", cleanCash, `Revenus déclarés (${businessType})`, acct.balance + cleanCash);
  }

  addCash(cleanCash, laundererId);
  netEmit("illegal:money_laundered", { businessType, dirtyCashAmount, cleanCash });

  return {
    ok: true,
    cleanCash,
    taxCut,
    message: `${dirtyCashAmount}$ blanchis via ${businessType}. Net déposé: ${cleanCash}$ (-${taxCut}$ frais et taxes).`,
  };
}

// ═══════════════════════════════════════════════════════════
// TICK DU SYSTÈME CLANDESTIN (MAÎTRE DU JEU)
// ═══════════════════════════════════════════════════════════

export class IllegalManager {
  tick(dtMinutes: number) {
    // 1. Croissance des plantations de cannabis
    for (const grow of GROW_OPS.values()) {
      grow.waterLevel = Math.max(0, grow.waterLevel - dtMinutes * 0.05);
      grow.nutrientLevel = Math.max(0, grow.nutrientLevel - dtMinutes * 0.03);

      if (grow.waterLevel > 10 && grow.nutrientLevel > 10) {
        grow.growthProgress = Math.min(100, grow.growthProgress + dtMinutes * 0.15);
      } else {
        grow.health = Math.max(0, grow.health - dtMinutes * 0.2);
      }

      // Risque de détection Hydro-Québec si pas de by-pass
      if (!grow.hydroBypassInstalled && grow.lightingType === "hps_puissant") {
        grow.policeSuspicion += dtMinutes * 0.08;
        if (grow.policeSuspicion >= 85 && Math.random() < 0.02) {
          dispatchPolice({
            location: grow.position,
            priority: "high",
            type: "drug_activity",
            description: "PERQUISITION STUPÉFIANTS : Consommation Hydro-Québec anormale détectée !",
          });
        }
      }
    }

    // 2. Gestion des cuites dans les laboratoires
    for (const lab of LABS.values()) {
      if (lab.isCooking) {
        lab.cookProgress += dtMinutes * 1.5;
        if (lab.cookProgress >= 100) {
          lab.isCooking = false;
          lab.cookProgress = 0;
          lab.totalBatchesCooked++;
          triggerNotification(lab.ownerId, {
            title: "🧪 Cuite de labo terminée",
            body: `Le lot de ${lab.type} est prêt à être récupéré !`,
            icon: "⚗️",
          });
        }
      }
    }
  }

  getGrowOp(id: string): GrowOpLocation | null {
    return GROW_OPS.get(id) ?? null;
  }

  getLab(id: string): ClandestineLab | null {
    return LABS.get(id) ?? null;
  }

  getAllTerritories(): GangTerritory[] {
    return Array.from(TERRITORIES.values());
  }
}

export const illegalSystem = new IllegalManager();

// ═══════════════════════════════════════════════════════════
// ENREGISTREMENT DES REMOTES RPC MULTIJOUEUR
// ═══════════════════════════════════════════════════════════

registerRemote("illegal:create_grow", createGrowOp);
registerRemote("illegal:bypass_hydro", installHydroBypass);
registerRemote("illegal:tend_grow", tendGrowOp);
registerRemote("illegal:harvest_grow", harvestGrowOp);
registerRemote("illegal:setup_lab", setupLab);
registerRemote("illegal:start_cook", startChemicalCook);
registerRemote("illegal:press_pills", pressSpeedPills);
registerRemote("illegal:claim_spot", claimTerritorySpot);
registerRemote("illegal:gang_war", triggerGangWar);
registerRemote("illegal:collect_pizzo", collectPizzoTax);
registerRemote("illegal:street_deal", executeStreetDeal);
registerRemote("illegal:order_container", orderPortContainer);
registerRemote("illegal:unload_container", unloadPortContainer);
registerRemote("illegal:crack_atm", crackAtmAdvanced);
registerRemote("illegal:ambush_truck", ambushArmoredTruck);
registerRemote("illegal:launder", launderThroughBusiness);