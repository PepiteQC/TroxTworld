/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME DE SURVIE & BIOMÉTRIE URBAINE — ETHERWORLD QC
 * ═══════════════════════════════════════════════════════════════════
 *
 * MODÉLISATION MÉDICALE ET STREET RP (STYLE GTA) :
 *  - Traumatologie : Hémorragies, volume sanguin (mL), Pouls (BPM) et Tension.
 *  - Métabolisme : Faim, Soif, Énergie (Stamina).
 *  - Consommables : Junk food, Alcool (SAQ), Cannabis (SQDC), Boissons énergisantes.
 *  - Addictions & Overdoses : Fentanyl, Narcan, et effets de l'alcool sur la conduite.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useGameStore } from "./store";
import { netEmit } from "./net";
import { triggerNotification } from "./phone";
import { sendChatMessage } from "./chat";

// ═══════════════════════════════════════════════════════════
// TYPES & ÉTATS DE SURVIE AVANCÉS
// ═══════════════════════════════════════════════════════════

export type SurvivalAlert =
  | "hemorragie_active"
  | "choc_hypovolemique"   // Perte de sang critique
  | "arret_cardiaque"
  | "overdose_opioides"
  | "intoxication_alcool"
  | "high_thc"             // Effet weed SQDC
  | "deshydratation"
  | "famine"
  | "epuisement_sprint"
  | "hypothermie_moderee"   // Ajouté pour compatibilité admin.ts
  | "coup_de_chaleur";      // Ajouté pour compatibilité admin.ts

export interface SurvivalSnap {
  // Métabolisme de base
  hunger: number;           // 0 à 100
  thirst: number;           // 0 à 100
  energy: number;           // 0 à 100
  health: number;           // 0 à 100
  stamina: number;          // 0 à 100 (Jauge de sprint)
  
  // Biomarkers Médicaux (Pour le RP des Paramédics)
  bloodVolumeMl: number;    // Normal: 5000mL. Mort < 2500mL
  pulseBpm: number;         // Normal: 60-80. Tachycardie > 120. Arrêt = 0
  bloodPressureSys: number; // Normal: 120. Chute si perte de sang
  
  // États d'altération
  speedFactor: number;      // 0.2 à 1.0 (Ralentit si blessé ou ivre)
  bloodAlcoholMg: number;   // mg d'alcool dans le sang (Gère l'ivresse)
  toxicity: number;         // Jauge d'overdose (Drogues dures)
  isBleeding: boolean;
  bleedingRate: number;     // mL de sang perdus par seconde
  
  alerts: SurvivalAlert[];
  advice: string | null;
}

export const FRESH_SURVIVAL: SurvivalSnap = {
  hunger: 85,
  thirst: 85,
  energy: 100,
  health: 100,
  stamina: 100,
  bloodVolumeMl: 5000,
  pulseBpm: 75,
  bloodPressureSys: 120,
  speedFactor: 1.0,
  bloodAlcoholMg: 0,
  toxicity: 0,
  isBleeding: false,
  bleedingRate: 0,
  alerts: [],
  advice: null,
};

// ═══════════════════════════════════════════════════════════
// CATALOGUE ALIMENTAIRE, SAQ & SQDC
// ═══════════════════════════════════════════════════════════

export type QuebecConsumableId =
  | "poutine_reguliere"
  | "hotdog_steamie"
  | "cafe_tim_double_double"
  | "biere_laurentide"
  | "boisson_energie_redbull"
  | "bouteille_eau_eska"
  | "joint_sqdc_indica";

export interface FoodSpec {
  id: QuebecConsumableId;
  name: string;
  hungerBoost: number;
  thirstBoost: number;
  energyBoost: number;
  alcoholMg: number;
  toxicityDelta: number; // Drogues ou médicaments
  description: string;
}

export const QUEBEC_FOOD_CATALOG: Record<QuebecConsumableId, FoodSpec> = {
  poutine_reguliere: {
    id: "poutine_reguliere",
    name: "Poutine Classique",
    hungerBoost: 55,
    thirstBoost: -15, // Donne soif
    energyBoost: -10, // Food coma (ralentit un peu)
    alcoholMg: 0,
    toxicityDelta: 0,
    description: "Frites fraîches, fromage en grains et sauce brune. Bourratif mais lourd.",
  },
  hotdog_steamie: {
    id: "hotdog_steamie",
    name: "Hot-Dog Steamé All-Dressed",
    hungerBoost: 25,
    thirstBoost: -5,
    energyBoost: 5,
    alcoholMg: 0,
    toxicityDelta: 0,
    description: "La bouffe de rue par excellence. Vite mangé, vite digéré.",
  },
  cafe_tim_double_double: {
    id: "cafe_tim_double_double",
    name: "Café Double-Double",
    hungerBoost: 5,
    thirstBoost: 20,
    energyBoost: 40,
    alcoholMg: 0,
    toxicityDelta: 0,
    description: "Gros boost d'énergie immédiat pour le sprint.",
  },
  biere_laurentide: {
    id: "biere_laurentide",
    name: "Canette de Bière (5%)",
    hungerBoost: 5,
    thirstBoost: 15,
    energyBoost: -5,
    alcoholMg: 40,
    toxicityDelta: 0,
    description: "Bière blonde bien froide. Attention au volant.",
  },
  boisson_energie_redbull: {
    id: "boisson_energie_redbull",
    name: "Boisson Énergisante",
    hungerBoost: 0,
    thirstBoost: 10,
    energyBoost: 60,
    alcoholMg: 0,
    toxicityDelta: 0,
    description: "Restaure massivement la stamina, parfait pour fuir la police.",
  },
  bouteille_eau_eska: {
    id: "bouteille_eau_eska",
    name: "Bouteille d'Eau (500ml)",
    hungerBoost: 0,
    thirstBoost: 50,
    energyBoost: 10,
    alcoholMg: 0,
    toxicityDelta: 0,
    description: "Eau de source naturelle pure.",
  },
  joint_sqdc_indica: {
    id: "joint_sqdc_indica",
    name: "Pré-roulé SQDC (Indica)",
    hungerBoost: -30, // Donne les "munchies" (faim intense)
    thirstBoost: -20, // Pâteuse
    energyBoost: -20,
    alcoholMg: 0,
    toxicityDelta: 15,
    description: "Calme le stress de façon RP, mais donne très faim et ralentit les réflexes.",
  },
};

// ═══════════════════════════════════════════════════════════
// CATALOGUE MÉDICAL & TRAUMATOLOGIE D'URGENCE (EMS)
// ═══════════════════════════════════════════════════════════

export type MedicalItemId =
  | "vaporisateur_narcan"
  | "garrot_tourniquet"
  | "bandage_compressif"
  | "trousse_premiers_soins"
  | "poche_solute_iv"
  | "defibrillateur_dea"
  | "morphine_seringue";

export interface MedicalSpec {
  id: MedicalItemId;
  name: string;
  healHP: number;
  stopsBleeding: boolean;
  bloodRestoreMl: number;
  clearsOverdose: boolean;
  description: string;
}

export const MEDICAL_CATALOG: Record<MedicalItemId, MedicalSpec> = {
  vaporisateur_narcan: {
    id: "vaporisateur_narcan",
    name: "Naloxone Nasal (Narcan)",
    healHP: 10,
    stopsBleeding: false,
    bloodRestoreMl: 0,
    clearsOverdose: true,
    description: "Antidote d'urgence obligatoire pour réanimer une overdose (Fentanyl).",
  },
  garrot_tourniquet: {
    id: "garrot_tourniquet",
    name: "Garrot Militaire CAT-7",
    healHP: 0,
    stopsBleeding: true,
    bloodRestoreMl: 0,
    clearsOverdose: false,
    description: "Arrête instantanément une hémorragie majeure (balle/couteau).",
  },
  bandage_compressif: {
    id: "bandage_compressif",
    name: "Bandage Compressif",
    healHP: 20,
    stopsBleeding: true,
    bloodRestoreMl: 0,
    clearsOverdose: false,
    description: "Stoppe les saignements légers et restaure un peu de santé.",
  },
  trousse_premiers_soins: {
    id: "trousse_premiers_soins",
    name: "Trousse Médicale Complète",
    healHP: 60,
    stopsBleeding: true,
    bloodRestoreMl: 250,
    clearsOverdose: false,
    description: "Kit complet pour stabiliser un blessé grave sur le terrain.",
  },
  poche_solute_iv: {
    id: "poche_solute_iv",
    name: "Poche de Soluté (Saline 1L)",
    healHP: 10,
    stopsBleeding: false,
    bloodRestoreMl: 1000,
    clearsOverdose: false,
    description: "Restaure la pression artérielle et le volume sanguin après une fusillade.",
  },
  defibrillateur_dea: {
    id: "defibrillateur_dea",
    name: "Défibrillateur (DEA)",
    healHP: 40,
    stopsBleeding: false,
    bloodRestoreMl: 0,
    clearsOverdose: false,
    description: "Relance le cœur d'un joueur en état de coma/mort clinique.",
  },
  morphine_seringue: {
    id: "morphine_seringue",
    name: "Seringue de Morphine",
    healHP: 30,
    stopsBleeding: false,
    bloodRestoreMl: 0,
    clearsOverdose: false,
    description: "Anesthésiant puissant. Restaure la capacité de courir même blessé.",
  },
};

// ═══════════════════════════════════════════════════════════
// MOTEUR DE PHYSIOLOGIE ET TICK BIOMÉTRIQUE PRINCIPAL
// ═══════════════════════════════════════════════════════════

export function tickSurvival(
  prev: SurvivalSnap,
  dt: number,
  ctx: { god: boolean }
): SurvivalSnap {
  if (ctx.god) return { ...FRESH_SURVIVAL };

  const hoursDelta = dt / 90; // Temps relatif en jeu

  // 1. Déperdition métabolique basique
  let hunger = Math.max(0, prev.hunger - 10 * hoursDelta);
  let thirst = Math.max(0, prev.thirst - 15 * hoursDelta);
  let stamina = Math.min(100, prev.stamina + 25 * hoursDelta); // Récupération endurance

  // 2. Métabolisme Toxique (Alcool & Drogues)
  let alcoholMg = Math.max(0, prev.bloodAlcoholMg - 12 * hoursDelta);
  let toxicity = Math.max(0, prev.toxicity - 5 * hoursDelta);

  // 3. Hémorragie et Sang (Le cœur du système médical)
  let bloodVol = prev.bloodVolumeMl;
  let health = prev.health;

  if (prev.isBleeding && prev.bleedingRate > 0) {
    bloodVol -= prev.bleedingRate * dt; // Perte en temps réel (mL/sec)
  }
  bloodVol = Math.max(0, Math.min(5000, bloodVol));

  // Régénération naturelle très lente du sang et de la santé
  if (!prev.isBleeding && bloodVol < 5000 && hunger > 50 && thirst > 50) {
    bloodVol += 100 * hoursDelta;
    health += 2 * hoursDelta;
  }

  // 4. Calcul du Pouls (BPM) et de la Tension (Sys)
  let bpm = 75;
  let sys = 120;

  if (bloodVol < 4000) {
    bpm = 110; // Tachycardie de compensation
    sys = 90;  // Baisse de tension
  }
  if (bloodVol < 3000) {
    bpm = 135;
    sys = 60;  // Choc hypovolémique
    health -= 5 * hoursDelta; // Dégâts internes par manque de sang
  }
  if (health <= 0 || toxicity >= 100) {
    bpm = 0; // Arrêt cardiaque
    sys = 0;
  }

  // 5. Pénalités de mouvement
  let speed = 1.0;
  if (health < 30) speed *= 0.6;
  if (alcoholMg > 80) speed *= 0.8; // Trébuchements
  if (bloodVol < 3500) speed *= 0.5;

  health = Math.max(0, Math.min(100, health));

  // 6. Alertes et UI
  const alerts: SurvivalAlert[] = [];
  let advice: string | null = null;

  if (health <= 0) alerts.push("arret_cardiaque");
  else if (toxicity >= 80) alerts.push("overdose_opioides");
  else if (prev.isBleeding) alerts.push("hemorragie_active");
  else if (bloodVol < 3500) alerts.push("choc_hypovolemique");
  else if (alcoholMg > 80) alerts.push("intoxication_alcool");
  
  if (thirst < 15) alerts.push("deshydratation");
  if (hunger < 15) alerts.push("famine");

  // Diagnostics RP (Conseils pour le joueur)
  if (health <= 0) advice = "Inconscient. Appelez les Paramédics (911).";
  else if (prev.isBleeding) advice = "Hémorragie ! Utilisez un garrot ou un bandage rapidement.";
  else if (bloodVol < 3500) advice = "Manque de sang sévère. Vision floue. Allez à l'hôpital.";
  else if (toxicity >= 80) advice = "Risque d'overdose. Administrez du Narcan.";
  else if (alcoholMg > 80) advice = "Ivre. Ne prenez pas le volant, appelez un taxi.";

  return {
    hunger: Math.round(hunger * 10) / 10,
    thirst: Math.round(thirst * 10) / 10,
    energy: 100, // Simplifié pour le combat
    health: Math.round(health * 10) / 10,
    stamina: Math.round(stamina),
    bloodVolumeMl: Math.round(bloodVol),
    pulseBpm: Math.round(bpm),
    bloodPressureSys: Math.round(sys),
    speedFactor: Math.max(0.25, Math.round(speed * 100) / 100),
    bloodAlcoholMg: Math.round(alcoholMg * 10) / 10,
    toxicity: Math.round(toxicity * 10) / 10,
    isBleeding: prev.isBleeding && health > 0,
    bleedingRate: prev.bleedingRate,
    alerts,
    advice,
  };
}

// ═══════════════════════════════════════════════════════════
// GESTION DES DÉGÂTS & SANTÉ (BALLES / ACCIDENTS)
// ═══════════════════════════════════════════════════════════

/**
 * Modifie la santé d'un citoyen.
 * Gère de manière robuste les cas d'overload où un ID de joueur est envoyé à la place d'un booléen.
 */
export function modifyHealth(
  delta: number,
  causesBleedingOrPlayerId?: boolean | string,
  targetPlayerId?: string
): { currentHP: number; isAlive: boolean } {
  const store = useGameStore.getState();
  const currentSurv = store.surv ?? FRESH_SURVIVAL;

  let causesBleeding = false;
  let actualPlayerId = targetPlayerId;

  // Gestion intelligente de la surcharge
  if (typeof causesBleedingOrPlayerId === "string") {
    actualPlayerId = causesBleedingOrPlayerId;
  } else if (typeof causesBleedingOrPlayerId === "boolean") {
    causesBleeding = causesBleedingOrPlayerId;
  }
  
  const newHP = Math.max(0, Math.min(100, currentSurv.health + delta));
  const isAlive = newHP > 0;

  // Si on prend de gros dégâts (ex: balle), ça déclenche une hémorragie
  const startBleeding = currentSurv.isBleeding || (causesBleeding && delta < -10);
  const newBleedingRate = startBleeding ? currentSurv.bleedingRate + 15 : currentSurv.bleedingRate;

  useGameStore.setState({
    surv: {
      ...currentSurv,
      health: newHP,
      isBleeding: startBleeding,
      bleedingRate: newBleedingRate,
    },
  });

  if (delta < 0 && actualPlayerId) {
    triggerNotification(actualPlayerId, {
      title: "💥 Blessure grave",
      body: `Santé: ${newHP.toFixed(0)}% ${startBleeding ? " - HÉMORRAGIE!" : ""}`,
      icon: "🩸",
      urgent: true,
    });
  }

  if (!isAlive) {
    sendChatMessage(`🚑 [URGENCES] Citoyen inanimé signalé ! Déploiement des unités requises.`);
  }

  netEmit("survival:health_modified", { playerId: actualPlayerId, delta, newHP, isAlive });
  return { currentHP: newHP, isAlive };
}

// ═══════════════════════════════════════════════════════════
// CONSOMMATION & SOINS (INVOCATIONS UI)
// ═══════════════════════════════════════════════════════════

export function applyQuebecConsumable(foodId: QuebecConsumableId, playerId?: string) {
  const food = QUEBEC_FOOD_CATALOG[foodId];
  if (!food) return;

  const current = useGameStore.getState().surv ?? FRESH_SURVIVAL;
  const next: SurvivalSnap = {
    ...current,
    hunger: Math.min(100, current.hunger + food.hungerBoost),
    thirst: Math.min(100, Math.max(0, current.thirst + food.thirstBoost)),
    stamina: Math.min(100, current.stamina + food.energyBoost),
    bloodAlcoholMg: Math.min(300, current.bloodAlcoholMg + food.alcoholMg),
    toxicity: Math.min(100, current.toxicity + food.toxicityDelta),
  };

  useGameStore.setState({ surv: next });
  triggerNotification(playerId ?? "local_player", {
    title: `🍴 ${food.name}`,
    body: "Consommé avec succès.",
    icon: "🍔",
  });
}

export function applyMedicalItem(itemId: MedicalItemId, targetPlayerId?: string) {
  const item = MEDICAL_CATALOG[itemId];
  if (!item) return;

  const current = useGameStore.getState().surv ?? FRESH_SURVIVAL;
  let next: SurvivalSnap = { ...current };

  if (item.healHP > 0) next.health = Math.min(100, next.health + item.healHP);
  if (item.bloodRestoreMl > 0) next.bloodVolumeMl = Math.min(5000, next.bloodVolumeMl + item.bloodRestoreMl);
  if (item.stopsBleeding) {
    next.isBleeding = false;
    next.bleedingRate = 0;
  }
  if (item.clearsOverdose) next.toxicity = 0;

  useGameStore.setState({ surv: next });
  triggerNotification(targetPlayerId ?? "local_player", {
    title: `💉 ${item.name}`,
    body: `Soins appliqués. (Santé: ${next.health}%)`,
    icon: "🩺",
  });
  
  netEmit("survival:medical_applied", { playerId: targetPlayerId, itemId, newHealth: next.health });
}

// ═══════════════════════════════════════════════════════════
// FONCTIONS DE COMPATIBILITÉ RP (EXPORTS REQUIS)
// ═══════════════════════════════════════════════════════════

export function getPlayerHealth(playerId?: string): number {
  return useGameStore.getState().surv?.health ?? 100;
}

export function shelterOf(pos?: any): number {
  return 1.0; // Protection par défaut (intérieur ou véhicule)
}

export function ambientOf(season: string, hour: number) {
  // Variations réalistes des températures du Québec
  const seasonalTemps: Record<string, number> = {
    printemps: 6,
    ete: 22,
    automne: 5,
    hiver: -14,
  };
  const baseTemp = seasonalTemps[season] ?? 15;
  const isNight = hour < 6 || hour > 20;
  return {
    temp: isNight ? baseTemp - 8 : baseTemp,
    wind: 15 + Math.random() * 20,
  };
}

export function applyMeal(surv: any, mealType: string) {
  const current = surv ?? FRESH_SURVIVAL;
  if (mealType === "drink") {
    return {
      ...current,
      thirst: Math.min(100, (current.thirst ?? 0) + 35),
    };
  }
  return {
    ...current,
    hunger: Math.min(100, (current.hunger ?? 0) + 35),
  };
}

export function survivalLabel(key: string): string {
  const labels: Record<string, string> = {
    hemorragie_active: "Hémorragie Active",
    choc_hypovolemique: "Choc Hypovolémique",
    arret_cardiaque: "Arrêt Cardiaque",
    overdose_opioides: "Overdose d'Opioïdes",
    intoxication_alcool: "Intoxication Alcoolique",
    high_thc: "Effet THC (SQDC)",
    deshydratation: "Déshydratation",
    famine: "Famine",
    epuisement_sprint: "Épuisement",
    hypothermie_moderee: "Hypothermie Modérée",
    coup_de_chaleur: "Coup de Chaleur",
  };
  return labels[key] ?? key;
}
/**
 * Normalize persisted survival state.
 *
 * Keeps FRESH_SURVIVAL as the canonical schema and only accepts
 * fields already present on SurvivalSnap.
 */
export function parseSurvival(raw: unknown): SurvivalSnap {
  if (!raw || typeof raw !== "object") {
    return { ...FRESH_SURVIVAL };
  }

  const input = raw as Partial<SurvivalSnap>;

  return {
    ...FRESH_SURVIVAL,
    ...(typeof input.hunger === "number"
      ? { hunger: input.hunger }
      : {}),
    ...(typeof input.thirst === "number"
      ? { thirst: input.thirst }
      : {}),
    ...(typeof input.energy === "number"
      ? { energy: input.energy }
      : {}),
    ...(typeof input.health === "number"
      ? { health: input.health }
      : {}),
    ...(Array.isArray(input.alerts)
      ? { alerts: input.alerts }
      : {}),
  };
}