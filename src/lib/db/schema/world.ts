/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛣️ WORLD SCHEMA, SURFACE DYNAMICS & TIRE PHYSICS — QUEBEC EDITION
 * ═══════════════════════════════════════════════════════════════════════════
 *  Physique avancée des sols de la MRC de Portneuf :
 *   - 8 biomes de surfaces (Asphalte, Garnotte, Glace, Neige, Boue, etc.)
 *   - Gestion thermique des pneus (gomme d'été sous les 7°C)
 *   - Réglementation de la SAAQ (obligation légale du 1er décembre au 15 mars)
 *   - Dynamique d'aquaplanage sur chaussée mouillée
 *   - Multiplicateurs d'adhérence selon la monte de pneumatiques
 */

export type SurfaceKind =
  | "asphalt"
  | "dirt"
  | "grass"
  | "snow"
  | "gravel"
  | "ice"
  | "mud"
  | "water_shallow";

export type TireKind =
  | "summer"   // Pneus d'été / Quatre-saisons de base
  | "winter"   // Pneus d'hiver certifiés (logo pictogramme montagne/flocon)
  | "studded"  // Pneus cloutés (adhérence maximale sur glace vive)
  | "offroad"; // Pneus crampons Tout-Terrain / Mud-Terrain

export type SoundProfile =
  | "screech"
  | "gravel_crunch"
  | "snow_crunch"
  | "dirt_roll"
  | "grass_swish"
  | "ice_slide"
  | "splash";

export type ParticleFX =
  | "smoke"
  | "dust"
  | "pebbles"
  | "snow_spray"
  | "water_spray"
  | "mud_splat"
  | "none";

export interface SurfacePhysics {
  kind: SurfaceKind;
  name: string;
  friction: number;            // Adhérence nominale (1.0 = Grip optimal sur asphalte sec)
  rollingResistance: number;   // Résistance de roulement (dissipation cinétique)
  slipThreshold: number;       // Seuil de force G latérale avant dérapage
  driftMultiplier: number;     // Facilité d'entretien de la glisse latérale
  maxTractionForce: number;    // Capacité maximale de transmission du couple moteur
  soundProfile: SoundProfile;
  particleFX: ParticleFX;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPRIÉTÉS PHYSIQUES DES SURFACES PORTNEUVOISES (VALLÉE, RANGS ET FLEUVE)
// ─────────────────────────────────────────────────────────────────────────────

export const SURFACE_PROPERTIES: Record<SurfaceKind, SurfacePhysics> = {
  asphalt: {
    kind: "asphalt",
    name: "Asphalte / Route 138 & Autoroute 40",
    friction: 1.0,
    rollingResistance: 0.012,
    slipThreshold: 0.85,
    driftMultiplier: 1.1,
    maxTractionForce: 1.0,
    soundProfile: "screech",
    particleFX: "smoke",
  },
  gravel: {
    kind: "gravel",
    name: "Garnotte / Rangs de campagne",
    friction: 0.65,
    rollingResistance: 0.045,
    slipThreshold: 0.45,
    driftMultiplier: 1.6,
    maxTractionForce: 0.75,
    soundProfile: "gravel_crunch",
    particleFX: "pebbles",
  },
  dirt: {
    kind: "dirt",
    name: "Terre battue / Sentiers forestiers du Nord",
    friction: 0.60,
    rollingResistance: 0.038,
    slipThreshold: 0.50,
    driftMultiplier: 1.4,
    maxTractionForce: 0.70,
    soundProfile: "dirt_roll",
    particleFX: "dust",
  },
  snow: {
    kind: "snow",
    name: "Neige damée / Chemin d'hiver",
    friction: 0.35,
    rollingResistance: 0.080,
    slipThreshold: 0.28,
    driftMultiplier: 2.2,
    maxTractionForce: 0.45,
    soundProfile: "snow_crunch",
    particleFX: "snow_spray",
  },
  ice: {
    kind: "ice",
    name: "Glace noire / Verglas routier",
    friction: 0.10,
    rollingResistance: 0.005,
    slipThreshold: 0.12,
    driftMultiplier: 3.5,
    maxTractionForce: 0.18,
    soundProfile: "ice_slide",
    particleFX: "none",
  },
  grass: {
    kind: "grass",
    name: "Pelouse humide / Pâturages agricoles",
    friction: 0.48,
    rollingResistance: 0.050,
    slipThreshold: 0.42,
    driftMultiplier: 1.5,
    maxTractionForce: 0.60,
    soundProfile: "grass_swish",
    particleFX: "dust",
  },
  mud: {
    kind: "mud",
    name: "Boue profonde / Saison de la sloche",
    friction: 0.30,
    rollingResistance: 0.150,
    slipThreshold: 0.25,
    driftMultiplier: 1.8,
    maxTractionForce: 0.35,
    soundProfile: "dirt_roll",
    particleFX: "mud_splat",
  },
  water_shallow: {
    kind: "water_shallow",
    name: "Flaque d'eau / Crue du Saint-Laurent",
    friction: 0.40,
    rollingResistance: 0.110,
    slipThreshold: 0.35,
    driftMultiplier: 1.7,
    maxTractionForce: 0.48,
    soundProfile: "splash",
    particleFX: "water_spray",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIQUE CLIMATIQUE & THERMIQUE DYNAMIQUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détermine la surface effective selon la météo et la température.
 * Ex: Pluie torrentielle sous 0°C -> L'asphalte devient une plaque de verglas.
 */
export function getEffectiveSurface(
  baseSurface: SurfaceKind,
  weather: "clear" | "rain" | "snow" | "fog" | "storm",
  temperatureC: number,
  snowDepthCm = 0
): SurfaceKind {
  // Transformation de l'asphalte mouillé sous 0°C en glace noire (Verglas routier)
  if (baseSurface === "asphalt" && (weather === "rain" || weather === "storm") && temperatureC <= 0) {
    return "ice";
  }

  // Neige accumulée sur la chaussée
  if (snowDepthCm > 3.0 && (baseSurface === "asphalt" || baseSurface === "gravel" || baseSurface === "grass")) {
    return "snow";
  }

  // Boue printanière (Terre + Pluie/Températures positives)
  if (baseSurface === "dirt" && (weather === "rain" || weather === "storm") && temperatureC > 1) {
    return "mud";
  }

  return baseSurface;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATE GRIP — LOGIQUE COMPLÈTE DE PNEUMATIQUES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule l'adhérence finale effective en fonction du type de pneu,
 * de la température, de la vitesse et de la présence d'eau.
 *
 * @param surface Type de surface effective résolue
 * @param tire Type de pneu équipé sur le véhicule
 * @param speedKmH Vitesse linéaire actuelle en km/h
 * @param temperatureC Température ambiante en °C (effet durcissement de la gomme)
 * @param treadDepth Usure de la bande de roulement (1.0 = Neuf, 0.0 = Lisse/Slick)
 */
export function calculateGrip(
  surface: SurfaceKind,
  tire: TireKind,
  speedKmH: number,
  temperatureC: number,
  treadDepth = 1.0
): number {
  const props = SURFACE_PROPERTIES[surface] || SURFACE_PROPERTIES.asphalt;
  let grip = props.friction;

  // 1. GESTION DU DURCISSEMENT DE LA GOMME (Seuil critique de 7°C)
  if (temperatureC < 7.0 && tire === "summer") {
    // Les pneus d'été perdent considérablement leur élasticité sous 7°C
    grip *= 0.70;
  } else if (temperatureC >= 15.0 && (tire === "winter" || tire === "studded")) {
    // Les pneus hiver/clous s'échauffent et s'écrasent au-dessus de 15°C sur asphalte sec
    if (surface === "asphalt") {
      grip *= 0.88;
    }
  }

  // 2. MODIFICATEURS PAR SURFACE ET PNEU
  switch (surface) {
    case "snow":
      if (tire === "winter") grip *= 1.70;
      else if (tire === "studded") grip *= 1.85;
      else if (tire === "offroad") grip *= 1.40;
      else grip *= 0.50; // Pneu été catastrophique sur neige
      break;

    case "ice":
      if (tire === "studded") grip *= 3.20; // Les clous percent la glace vive
      else if (tire === "winter") grip *= 1.45;
      else if (tire === "offroad") grip *= 0.60;
      else grip *= 0.25; // Pneu été sur glace = luge incontrôlable
      break;

    case "mud":
    case "dirt":
      if (tire === "offroad") grip *= 1.60; // Sculptures profondes évacuant la boue
      else if (tire === "winter") grip *= 1.10;
      else if (tire === "studded") grip *= 1.00;
      else grip *= 0.80;
      break;

    case "gravel":
      if (tire === "offroad") grip *= 1.25;
      else if (tire === "summer" || tire === "winter") grip *= 1.00;
      break;

    case "water_shallow":
      // Risque d'aquaplanage : diminution de la traction selon l'usure du pneu
      const aquaplaneRisk = calculateAquaplaneRisk(speedKmH, treadDepth);
      grip *= (1.0 - aquaplaneRisk);
      break;

    case "asphalt":
      if (tire === "offroad") {
        grip *= 0.85; // Moins de surface de contact sur le bitume sec
      } else if (tire === "studded") {
        grip *= 0.80; // Les pointes métalliques glissent légèrement sur le goudron dur
      }
      break;
  }

  // 3. FACTEUR D'USURE GÉNÉRAL DU PNEU
  // Un pneu usé perd en efficacité globale (jusqu'à 15% d'adhérence en moins sur le sec)
  const wearImpact = 0.85 + (treadDepth * 0.15);
  grip *= wearImpact;

  // 4. CHUTE DE GRIP À TRÈS HAUTE VITESSE (Effet de portance aéro/perte d'appui mécanique)
  if (speedKmH > 140) {
    const highSpeedPenalty = Math.max(0.65, 1.0 - (speedKmH - 140) * 0.0025);
    grip *= highSpeedPenalty;
  }

  // Encapsulation sécurisée du grip (0.05 min à 1.5 max avec super-pneus/clous)
  return Math.min(1.5, Math.max(0.05, grip));
}

// ─────────────────────────────────────────────────────────────────────────────
// LOIS CIVILES ET CALCULS GÉOMÉTRIQUES APPLIQUÉS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loi sur la sécurité routière du Québec (SAAQ) :
 * L'obligation d'équiper des pneus d'hiver certifiés s'étend du 1er décembre au 15 mars inclusivement.
 */
export function isWinterTireMandatory(date = new Date()): boolean {
  const month = date.getMonth(); // Janvier = 0, Décembre = 11
  const day = date.getDate();

  // Décembre, Janvier, Février sont entièrement obligatoires
  if (month === 11 || month === 0 || month === 1) {
    return true;
  }

  // Mars : Obligatoire jusqu'au 15 inclusivement
  if (month === 2 && day <= 15) {
    return true;
  }

  return false;
}

/**
 * Évalue le risque d'aquaplanage d'un véhicule roulant sur chaussée inondée.
 * Retourne un coefficient de 0.0 (adhérence nominale) à 1.0 (perte totale de contact/glisse libre).
 */
export function calculateAquaplaneRisk(speedKmH: number, treadDepth: number): number {
  // Seuil de vitesse critique d'aquaplanage théorique (diminue si les pneus sont lisses)
  const criticalSpeed = 70.0 + (treadDepth * 30.0); // 70 km/h si lisse (0.0), 100 km/h si neuf (1.0)

  if (speedKmH < criticalSpeed) {
    return 0.0;
  }

  // Progression exponentielle du risque au-dessus de la vitesse critique
  const overshoot = speedKmH - criticalSpeed;
  const risk = overshoot * 0.025; // 100% de perte de grip après 40 km/h d'excès au-dessus du seuil

  return Math.min(1.0, Math.max(0.0, risk));
}
