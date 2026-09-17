/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈMES DE FRET, CONVOIS ET LOGISTIQUE DU COMTE — MRC DE PORTNEUF
 * ═════════════════════════════════════════════════════════════════════════════
 * Remplace les collectibles fantaisistes par un système centré sur l'économie,
 * le transport de marchandises, les planques criminelles et les embuscades.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { VILLAGES, PAPETERIE, PRISON, SQ_JAIL } from "./worlddata";

export type CargoCategory = "legal_cargo" | "industrial_supply" | "contraband" | "high_value_transport";

export interface LogisticsRoute {
  id: string;
  name: string;
  category: CargoCategory;
  originName: string;
  destinationName: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  rewardCAD: number;
  riskLevel: "faible" | "moyen" | "élevé" | "extrême"; // Attire plus ou moins la SQ ou les criminels
  requiredJob?: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE DES CONVOIS ET ROUTES LOGISTIQUES DE PORTNEUF
// ═══════════════════════════════════════════════════════════

export const COUNTY_LOGISTICS_ROUTES: LogisticsRoute[] = [
  {
    id: "route_pates_papiers",
    name: "Convoi de bobines de cellulose",
    category: "industrial_supply",
    originName: "Complexe de Pâtes et Papiers de Donnacona",
    destinationName: "Port de Portneuf (Quai hauturier)",
    startX: PAPETERIE.x,
    startZ: PAPETERIE.z,
    endX: -261,
    endZ: 74,
    rewardCAD: 1450,
    riskLevel: "faible",
    requiredJob: "chauffeur_poids_lourd",
    description: "Transport lourd de papier journal le long de la route 138. Surveillance routière standard.",
  },
  {
    id: "route_calcaire_chazy",
    name: "Livraison de blocs de pierre architecturale",
    category: "industrial_supply",
    originName: "Carrières de Saint-Marc-des-Carrières",
    destinationName: "Chantier de construction (Pont-Rouge)",
    startX: -480,
    startZ: -200,
    endX: 1120,
    endZ: -340,
    rewardCAD: 2100,
    riskLevel: "moyen",
    requiredJob: "chauffeur_poids_lourd",
    description: "Blocs de calcaire blanc de haute qualité pour la réfection des façades institutionnelles.",
  },
  {
    id: "route_erable_bio",
    name: "Citerne de sirop d'érable de première coulée",
    category: "legal_cargo",
    originName: "Érablière de Saint-Alban",
    destinationName: "Entrepôt agricole de Saint-Raymond",
    startX: -620,
    startZ: -530,
    endX: 980,
    endZ: -650,
    rewardCAD: 980,
    riskLevel: "faible",
    description: "Transport en vrac de sirop d'érable brut issu des rangs du nord du comté.",
  },
  {
    id: "convoi_contrabande_fleuve",
    name: "Livraison nocturne de tabac/alcool non-estampillé",
    category: "contraband",
    originName: "Quai clandestin de Grondines",
    destinationName: "Planque isolée de Saint-Alban",
    startX: X250 = -400, // Ajusté selon estuaire
    startZ: 25,
    endX: -620,
    endZ: -530,
    rewardCAD: 4500,
    riskLevel: "extrême",
    description: "Cargaison clandestine débarquée par embarcation rapide. Traquée activement par l'unité maritime de la SQ.",
  },
  {
    id: "transport_fonds_caisse",
    name: "Véhicule blindé de transport de fonds (Desjardins)",
    category: "high_value_transport",
    originName: "Caisse Populaire de Portneuf",
    destinationName: "Poste central de la Sûreté du Québec",
    startX: X261,
    startZ: -20,
    endX: SQ_JAIL.x,
    endZ: SQ_JAIL.z,
    rewardCAD: 7500,
    riskLevel: "extrême",
    description: "Transfert sécurisé des liquidités des caisses populaires. Cible privilégiée pour les braquages de grande envergure.",
  },
];

// ═══════════════════════════════════════════════════════════
// GESTIONNAIRE DE LOGISTIQUE EN JEU
// ═══════════════════════════════════════════════════════════

export interface ActiveConvoy {
  routeId: string;
  driverPlayerId: string;
  currentProgress: number; // 0.0 à 1.0
  isAmbushed: boolean;
  startedAt: number;
}

export class CountyLogisticsSystem {
  private activeConvoys = new Map<string, ActiveConvoy>();

  public startRoute(routeId: string, playerId: string): { ok: boolean; message: string } {
    const route = COUNTY_LOGISTICS_ROUTES.find(r => r.id === routeId);
    if (!route) return { ok: false, message: "Route logistique introuvable." };

    if (this.activeConvoys.has(playerId)) {
      return { ok: false, message: "Vous gérez déjà un convoi en cours de route." };
    }

    this.activeConvoys.set(playerId, {
      routeId,
      driverPlayerId: playerId,
      currentProgress: 0.0,
      isAmbushed: false,
      startedAt: Date.now(),
    });

    // Si c'est un convoi à haut risque ou contrebande, la police ou les rivaux sont prévenus
    if (route.riskLevel === "extrême" || route.category === "high_value_transport") {
      dispatchPoliceAlert(route);
    }

    return {
      ok: true,
      message: `Contrat accepté : ${route.name}.\nDe : ${route.originName}\nVers : ${route.destinationName}\nRestez vigilants sur le réseau routier.`,
    };
  }

  public checkAmbush(playerId: string, attackerGangId: string): { success: boolean; lootEarned: number; message: string } {
    const convoy = this.activeConvoys.get(playerId);
    if (!convoy) return { success: false, lootEarned: 0, message: "Aucun convoi actif pour ce joueur." };

    const route = COUNTY_LOGISTICS_ROUTES.find(r => r.id === convoy.routeId);
    if (!route) return { success: false, lootEarned: 0, message: "Erreur de route." };

    convoy.isAmbushed = true;
    this.activeConvoys.delete(playerId);

    const loot = route.rewardCAD * 1.5; // Gros bonus pour les criminels en cas de braquage réussi

    return {
      success: true,
      lootEarned: loot,
      message: `💥 EMBUSCADE RÉUSSIE ! Le convoi "${route.name}" a été intercepté. ${loot}$ de marchandises saisies.`,
    };
  }
}

function dispatchPoliceAlert(route: LogisticsRoute) {
  // Déclenche l'alerte pour les joueurs de la Sûreté du Québec
  console.log(`[SQ DISPATCH] Alerte de convoi sensible en transit : ${route.name} (${route.riskLevel})`);
}

export const countyLogistics = new CountyLogisticsSystem();