/**
 * ⚖️ SYSTÈME LÉGAL QUÉBÉCOIS — TROXTWORLD (v4.0)
 * Fichier: src/game/weapons-qc.ts
 * Gestion des lois sur les armes à feu au Québec :
 * - Permis (PPA/PAL, PAL-R, Certificat de chasse)
 * - Enregistrement SIAF (Système d'immatriculation des armes à feu)
 * - Restrictions et classifications
 * - Vérification de la légalité
 */

import { WeaponId, LicenseId, LICENSES, WEAPONS, WeaponTemplate, LegalClass } from "./weapons";

// ============================================================================
// 📜 SYSTÈME SIAF (Système d'Immatriculation des Armes à Feu du Québec)
// ============================================================================

/** Instance d'une arme avec numéro de série et immatriculation. */
export interface WeaponInstance {
  serialNumber: string;          // Numéro de série unique
  siafRegistrationNumber?: string; // Numéro d'immatriculation SIAF (si enregistré)
  isDefacedSerial: boolean;      // Si le numéro de série a été effacé
  templateId: WeaponId;          // ID du template de l'arme
  ownerPlayerId: string;         // ID du propriétaire (joueur ou PNJ)
  durabilityCurrent: number;    // Durabilité actuelle
  cleanlinessScore: number;      // Score de propreté (0-100)
  isJammed: boolean;             // Si l'arme est enrayée
  loadedRounds: number;          // Balles chargées
  hasRoundInChamber: boolean;    // Si une balle est en chambre
  selectedFireMode: "safe" | "semi" | "auto" | "burst"; // Mode de tir sélectionné
  ballisticFingerprintId: string; // ID de l'empreinte balistique (unique par arme)
  attachments: {                 // Accessoires
    silencer: boolean;           // Silencieux
    flashlight: boolean;         // Lampe torche
    opticSight?: "red_dot" | "scope_4x" | "thermal"; // Viseur
    extendedMag: boolean;       // Chargeur étendu
    autoSwitchInstalled: boolean; // Sélecteur automatique installé (illégal)
  };
}

/** Base de données des instances d'armes. */
const WEAPON_INSTANCES = new Map<string, WeaponInstance>();

/** Base de données des douilles balistiques (pour enquêtes). */
export interface BallisticCasing {
  casingId: string;
  caliber: string;
  ballisticFingerprintId: string;
  firedAt: number; // Timestamp
  location: { x: number; y: number; z: number };
}

const BALISTIC_EVIDENCE_CASINGS = new Map<string, BallisticCasing>();

// ============================================================================
// 🔧 FONCTIONS DE GESTION DES ARMES
// ============================================================================

/**
 * Crée une nouvelle instance d'arme.
 * @param templateId - ID du template de l'arme.
 * @param ownerPlayerId - ID du propriétaire.
 * @param serialNumber - Numéro de série (optionnel, généré si non fourni).
 * @returns Nouvelle instance d'arme.
 */
export function createWeaponInstance(
  templateId: WeaponId,
  ownerPlayerId: string,
  serialNumber?: string
): WeaponInstance {
  const template = WEAPONS[templateId];
  if (!template) {
    throw new Error(`Template d'arme introuvable: ${templateId}`);
  }

  const instance: WeaponInstance = {
    serialNumber: serialNumber || `QC-${Math.floor(1000000 + Math.random() * 9000000)}`,
    templateId,
    ownerPlayerId,
    durabilityCurrent: template.maxDurability,
    cleanlinessScore: 100,
    isJammed: false,
    loadedRounds: template.magazineCapacity,
    hasRoundInChamber: false,
    selectedFireMode: template.isFullAutoCapable ? "semi" : "semi",
    ballisticFingerprintId: `FP-${Math.random().toString(36).substr(2, 8)}`,
    attachments: {
      silencer: false,
      flashlight: false,
      extendedMag: false,
      autoSwitchInstalled: false,
    },
  };

  // Ajouter à la base de données
  WEAPON_INSTANCES.set(instance.serialNumber, instance);

  return instance;
}

/**
 * Supprime une instance d'arme.
 * @param serialNumber - Numéro de série de l'arme.
 * @returns `true` si la suppression a réussi.
 */
export function destroyWeaponInstance(serialNumber: string): boolean {
  return WEAPON_INSTANCES.delete(serialNumber);
}

/**
 * Récupère une instance d'arme par son numéro de série.
 * @param serialNumber - Numéro de série.
 * @returns Instance d'arme ou undefined.
 */
export function getWeaponInstance(serialNumber: string): WeaponInstance | undefined {
  return WEAPON_INSTANCES.get(serialNumber);
}

/**
 * Récupère toutes les instances d'armes.
 * @returns Liste des instances d'armes.
 */
export function getAllWeaponInstances(): WeaponInstance[] {
  return Array.from(WEAPON_INSTANCES.values());
}

/**
 * Récupère les armes d'un joueur.
 * @param playerId - ID du joueur.
 * @returns Liste des armes du joueur.
 */
export function getPlayerWeapons(playerId: string): WeaponInstance[] {
  return Array.from(WEAPON_INSTANCES.values()).filter(
    (instance) => instance.ownerPlayerId === playerId
  );
}

// ============================================================================
// 🏛️ FONCTIONS SIAF (Immatriculation des armes)
// ============================================================================

/**
 * Enregistre une arme au SIAF (Système d'Immatriculation des Armes à Feu).
 * @param weaponSerial - Numéro de série de l'arme.
 * @param ownerPlayerId - ID du propriétaire.
 * @param officerBadge - Matricule de l'officier (optionnel).
 * @returns Résultat de l'enregistrement.
 */
export function registerWeaponToSIAF(
  weaponSerial: string,
  ownerPlayerId: string,
  officerBadge: string = "SIAF-SYSTEM"
): { ok: boolean; siafNumber: string; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) {
    return { ok: false, siafNumber: "", message: "Arme introuvable dans le registre." };
  }

  if (instance.isDefacedSerial) {
    return {
      ok: false,
      siafNumber: "",
      message: "Impossible d'immatriculer une arme au numéro de série altéré.",
    };
  }

  // Générer un numéro SIAF
  const siafNumber = `QC-${Math.floor(1000000 + Math.random() * 9000000)}`;
  instance.siafRegistrationNumber = siafNumber;
  instance.ownerPlayerId = ownerPlayerId;

  console.log(`[SIAF] Arme ${instance.templateId} (S/N: ${weaponSerial}) immatriculée sous le numéro ${siafNumber} au nom de ${ownerPlayerId}.`);

  return {
    ok: true,
    siafNumber,
    message: `Arme immatriculée avec succès au fichier central du Québec (SIAF #${siafNumber}).`,
  };
}

/**
 * Efface le numéro de série d'une arme (la rend intraçable).
 * @param weaponSerial - Numéro de série de l'arme.
 * @param mechanicPlayerId - ID du joueur/mécanicien qui effectue l'opération.
 * @returns Résultat de l'opération.
 */
export function defaceWeaponSerialNumber(
  weaponSerial: string,
  mechanicPlayerId: string
): { ok: boolean; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) {
    return { ok: false, message: "Arme introuvable." };
  }

  if (instance.isDefacedSerial) {
    return { ok: false, message: "Le numéro de série est déjà complètement effacé." };
  }

  // Effacer le numéro de série
  instance.isDefacedSerial = true;
  instance.serialNumber = `DEFACED-${Math.floor(1000 + Math.random() * 9000)}`;
  instance.siafRegistrationNumber = undefined; // Retirer l'immatriculation
  instance.durabilityCurrent = Math.max(10, instance.durabilityCurrent - 15);

  console.log(`[MARCHÉ NOIR] Numéro de série de l'arme ${instance.templateId} (ancien S/N: ${weaponSerial}) meulé par ${mechanicPlayerId}.`);

  return {
    ok: true,
    message: "Numéro de série meulé avec succès ! L'arme est désormais intraçable par la SQ.",
  };
}

/**
 * Vérifie si une arme est immatriculée au SIAF.
 * @param weaponSerial - Numéro de série de l'arme.
 * @returns `true` si l'arme est immatriculée.
 */
export function isWeaponRegistered(weaponSerial: string): boolean {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  return !!instance?.siafRegistrationNumber;
}

/**
 * Récupère le numéro SIAF d'une arme.
 * @param weaponSerial - Numéro de série de l'arme.
 * @returns Numéro SIAF ou undefined.
 */
export function getSiafNumber(weaponSerial: string): string | undefined {
  return WEAPON_INSTANCES.get(weaponSerial)?.siafRegistrationNumber;
}

// ============================================================================
// 🎯 FONCTIONS BALISTIQUES (Tir, Dégâts, Enquêtes)
// ============================================================================

/** Résultat d'un tir. */
export interface ShootResult {
  fired: boolean;          // Si le tir a eu lieu
  isJammed: boolean;      // Si l'arme est enrayée
  damageDealt: number;    // Dégâts infligés
  bulletImpactPos?: { x: number; y: number; z: number }; // Position de l'impact
  roundsRemaining: number; // Balles restantes dans le chargeur
  soundDecibels: number;   // Niveau sonore du tir (dB)
  message: string;         // Message de retour
  casingId?: string;      // ID de la douille éjectée (pour enquêtes)
}

/**
 * Tire avec une arme.
 * @param weaponSerial - Numéro de série de l'arme.
 * @param shooterPlayerId - ID du tireur.
 * @param shooterPos - Position du tireur.
 * @param aimDirection - Direction du tir.
 * @param targetPlayerId - ID de la cible (optionnel).
 * @returns Résultat du tir.
 */
export function fireWeapon(
  weaponSerial: string,
  shooterPlayerId: string,
  shooterPos: { x: number; y: number; z: number },
  aimDirection: { x: number; y: number; z: number },
  targetPlayerId?: string
): ShootResult {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  const template = instance ? WEAPONS[instance.templateId] : undefined;

  if (!instance || !template) {
    return {
      fired: false,
      isJammed: false,
      damageDealt: 0,
      roundsRemaining: 0,
      soundDecibels: 0,
      message: "Arme invalide.",
    };
  }

  // Vérifier si l'arme est enrayée
  if (instance.isJammed) {
    return {
      fired: false,
      isJammed: true,
      damageDealt: 0,
      roundsRemaining: instance.loadedRounds,
      soundDecibels: 0,
      message: "⚠️ CLIC ! L'arme est enrayée ! Effectuez un désenrayage d'urgence.",
    };
  }

  // Vérifier si l'arme a des munitions (sauf pour les armes blanches)
  if (template.category !== "melee") {
    if (instance.loadedRounds <= 0) {
      return {
        fired: false,
        isJammed: false,
        damageDealt: 0,
        roundsRemaining: 0,
        soundDecibels: 10,
        message: "CLIC ! Chargeur vide.",
      };
    }

    // Consommer une munition
    instance.loadedRounds--;
  }

  // Réduire la durabilité et la propreté
  instance.durabilityCurrent = Math.max(0, instance.durabilityCurrent - 1);
  instance.cleanlinessScore = Math.max(0, instance.cleanlinessScore - 0.5);

  // Vérifier si l'arme s'enraie (selon la propreté et la durabilité)
  const jamChance = (100 - instance.cleanlinessScore) * 0.001 +
    (instance.durabilityCurrent < 50 ? 0.05 : 0.005);
  if (Math.random() < jamChance && template.category !== "melee") {
    instance.isJammed = true;
    return {
      fired: false,
      isJammed: true,
      damageDealt: 0,
      roundsRemaining: instance.loadedRounds,
      soundDecibels: 20,
      message: "💥 ENRAYAGE ! Une douille est coincée dans la culasse !",
    };
  }

  // Créer une douille balistique (pour les armes à feu)
  let casingId: string | undefined;
  if (template.ammo) {
    casingId = `CASING-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`;
    BALISTIC_EVIDENCE_CASINGS.set(casingId, {
      casingId,
      caliber: template.ammo,
      ballisticFingerprintId: instance.ballisticFingerprintId,
      firedAt: Date.now(),
      location: { ...shooterPos },
    });
  }

  // Calculer les dégâts
  let finalDamage = template.baseDamage;
  const ammoSpec = template.ammo ? AMMO_CATALOG[template.ammo] : undefined;

  if (ammoSpec) {
    finalDamage *= ammoSpec.damageModifier;
  }

  // Appliquer les dégâts à la cible si elle existe
  if (targetPlayerId) {
    // Ici, vous devriez appeler votre système de santé pour appliquer les dégâts
    // Exemple: modifyHealth(-finalDamage, targetPlayerId);
    console.log(`[BALISTIQUE] ${finalDamage} dégâts infligés à ${targetPlayerId} avec ${template.name}.`);
  }

  // Calculer le niveau sonore
  let soundLevel = template.noiseLevelDecibels;
  if (instance.attachments.silencer) {
    soundLevel = Math.max(110, soundLevel - 35);
  }

  return {
    fired: true,
    isJammed: false,
    damageDealt: finalDamage,
    roundsRemaining: instance.loadedRounds,
    soundDecibels: soundLevel,
    message: `BANG ! Tir effectué avec ${template.name}.`,
    casingId,
  };
}

/**
 * Désenraie une arme.
 * @param weaponSerial - Numéro de série de l'arme.
 * @returns Résultat de l'opération.
 */
export function clearWeaponJam(weaponSerial: string): { ok: boolean; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) {
    return { ok: false, message: "Arme introuvable." };
  }

  if (!instance.isJammed) {
    return { ok: false, message: "L'arme n'est pas enrayée." };
  }

  instance.isJammed = false;
  return {
    ok: true,
    message: "Tap-Rack-Bang ! Douille expulsée, arme prête à faire feu.",
  };
}

/**
 * Nettoie et entretient une arme.
 * @param weaponSerial - Numéro de série de l'arme.
 * @param playerId - ID du joueur qui effectue l'entretien.
 * @returns Résultat de l'opération.
 */
export function cleanAndServiceWeapon(
  weaponSerial: string,
  playerId: string
): { ok: boolean; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) {
    return { ok: false, message: "Arme introuvable." };
  }

  const template = WEAPONS[instance.templateId];
  if (!template) {
    return { ok: false, message: "Template d'arme introuvable." };
  }

  // Nettoyer l'arme
  instance.cleanlinessScore = 100;
  instance.durabilityCurrent = Math.min(
    template.maxDurability,
    instance.durabilityCurrent + 50
  );
  instance.isJammed = false;

  return {
    ok: true,
    message: "Arme entièrement démontée, dégraissée et révisée.",
  };
}

/**
 * Recharge une arme.
 * @param weaponSerial - Numéro de série de l'arme.
 * @param ammoType - Type de munition.
 * @param amount - Quantité de munitions à charger.
 * @returns Résultat de l'opération.
 */
export function reloadWeapon(
  weaponSerial: string,
  ammoType: string,
  amount: number = 1
): { ok: boolean; message: string; loadedRounds: number } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) {
    return { ok: false, message: "Arme introuvable.", loadedRounds: 0 };
  }

  const template = WEAPONS[instance.templateId];
  if (!template) {
    return { ok: false, message: "Template d'arme introuvable.", loadedRounds: 0 };
  }

  // Vérifier si la munition correspond
  if (template.ammo !== ammoType) {
    return {
      ok: false,
      message: `Cette arme utilise des munitions de type ${template.ammo}, pas ${ammoType}.`,
      loadedRounds: instance.loadedRounds,
    };
  }

  // Calculer le nombre de balles à charger
  const spaceAvailable = template.magazineCapacity - instance.loadedRounds;
  const toLoad = Math.min(amount, spaceAvailable);

  instance.loadedRounds += toLoad;

  return {
    ok: true,
    message: `Rechargé ${toLoad} balles de type ${ammoType}.`,
    loadedRounds: instance.loadedRounds,
  };
}

/**
 * Change le mode de tir d'une arme.
 * @param weaponSerial - Numéro de série de l'arme.
 * @param mode - Mode de tir ("safe", "semi", "auto", "burst").
 * @returns Résultat de l'opération.
 */
export function setFireMode(
  weaponSerial: string,
  mode: "safe" | "semi" | "auto" | "burst"
): { ok: boolean; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) {
    return { ok: false, message: "Arme introuvable." };
  }

  const template = WEAPONS[instance.templateId];
  if (!template) {
    return { ok: false, message: "Template d'arme introuvable." };
  }

  // Vérifier si le mode est disponible
  if (mode === "auto" && !template.isFullAutoCapable && !instance.attachments.autoSwitchInstalled) {
    return {
      ok: false,
      message: `Cette arme ne peut pas tirer en mode automatique sans modificateur.`,
    };
  }

  if (mode === "burst" && !template.isFullAutoCapable) {
    return {
      ok: false,
      message: `Cette arme ne peut pas tirer en mode rafale.`,
    };
  }

  instance.selectedFireMode = mode;
  return {
    ok: true,
    message: `Mode de tir changé pour: ${mode}.`,
  };
}

// ============================================================================
// 🔍 FONCTIONS D'ENQUÊTE BALISTIQUE (pour la SQ)
// ============================================================================

/**
 * Ajoute une douille à la base de données balistique.
 * @param casing - Douille à ajouter.
 */
export function addBallisticCasing(casing: BallisticCasing): void {
  BALISTIC_EVIDENCE_CASINGS.set(casing.casingId, casing);
}

/**
 * Récupère une douille par son ID.
 * @param casingId - ID de la douille.
 * @returns Douille ou undefined.
 */
export function getBallisticCasing(casingId: string): BallisticCasing | undefined {
  return BALISTIC_EVIDENCE_CASINGS.get(casingId);
}

/**
 * Compare une douille à une arme pour voir si elles correspondent.
 * @param casingId - ID de la douille.
 * @param weaponSerial - Numéro de série de l'arme.
 * @returns Résultat de la comparaison.
 */
export function matchCasingToWeapon(
  casingId: string,
  weaponSerial: string
): { match: boolean; confidencePct: number; report: string } {
  const casing = BALISTIC_EVIDENCE_CASINGS.get(casingId);
  const weapon = WEAPON_INSTANCES.get(weaponSerial);

  if (!casing || !weapon) {
    return {
      match: false,
      confidencePct: 0,
      report: "Indice ou arme non disponible pour analyse.",
    };
  }

  const isMatching = casing.ballisticFingerprintId === weapon.ballisticFingerprintId;
  const confidence = isMatching ? 99.8 : 0.0;
  const report = isMatching
    ? `✅ MATCH POSITIF (IBIS) : Les rayures de culasse et la marque du percuteur correspondent à l'arme ${weapon.templateId} (Matricule: ${weapon.serialNumber}).`
    : "❌ RÉSULTAT NÉGATIF : Aucune correspondance balistique trouvée.";

  return { match: isMatching, confidencePct: confidence, report };
}

/**
 * Récupère toutes les douilles associées à une arme.
 * @param weaponSerial - Numéro de série de l'arme.
 * @returns Liste des douilles associées.
 */
export function getCasingsByWeapon(weaponSerial: string): BallisticCasing[] {
  const weapon = WEAPON_INSTANCES.get(weaponSerial);
  if (!weapon) return [];

  return Array.from(BALISTIC_EVIDENCE_CASINGS.values()).filter(
    (casing) => casing.ballisticFingerprintId === weapon.ballisticFingerprintId
  );
}

/**
 * Récupère toutes les douilles d'un calibre spécifique.
 * @param caliber - Calibre de la munition.
 * @returns Liste des douilles du calibre.
 */
export function getCasingsByCaliber(caliber: string): BallisticCasing[] {
  return Array.from(BALISTIC_EVIDENCE_CASINGS.values()).filter(
    (casing) => casing.caliber === caliber
  );
}

// ============================================================================
// 🛡️ FONCTIONS DE VÉRIFICATION LÉGALE
// ============================================================================

/**
 * Vérifie si un joueur peut légalement posséder une arme.
 * @param weaponId - ID de l'arme.
 * @param playerLicenses - Permis du joueur.
 * @param isPolice - Si le joueur est policier.
 * @returns Résultat de la vérification.
 */
export function isLegalToOwn(
  weaponId: WeaponId,
  playerLicenses: LicenseId[],
  isPolice: boolean = false
): { legal: boolean; missingLicense?: LicenseId; message?: string } {
  const weapon = WEAPONS[weaponId];
  if (!weapon) {
    return { legal: true }; // Arme inconnue = légale par défaut
  }

  // Les policiers peuvent tout posséder
  if (isPolice) {
    return { legal: true };
  }

  // Armes prohibées ou artisanales illégales
  if (weapon.legal === "prohibee" || weapon.legal === "artisanale_illegale") {
    return {
      legal: false,
      message: `Possession illégale: ${weapon.name} (${weapon.legal}).`,
    };
  }

  // Vérifier les permis requis
  for (const requiredLicense of weapon.need) {
    if (!playerLicenses.includes(requiredLicense)) {
      return {
        legal: false,
        missingLicense: requiredLicense,
        message: `Permis requis: ${LICENSES[requiredLicense].name}`,
      };
    }
  }

  return { legal: true };
}

/**
 * Vérifie si un joueur peut légalement porter une arme en public.
 * @param weaponId - ID de l'arme.
 * @param playerLicenses - Permis du joueur.
 * @param isPolice - Si le joueur est policier.
 * @returns Résultat de la vérification.
 */
export function isLegalToCarry(
  weaponId: WeaponId,
  playerLicenses: LicenseId[],
  isPolice: boolean = false
): { legal: boolean; missingLicense?: LicenseId; message?: string } {
  return isLegalToOwn(weaponId, playerLicenses, isPolice);
}

/**
 * Vérifie si un joueur peut légalement acheter une arme.
 * @param weaponId - ID de l'arme.
 * @param playerLicenses - Permis du joueur.
 * @param isPolice - Si le joueur est policier.
 * @returns Résultat de la vérification.
 */
export function canPurchaseWeapon(
  weaponId: WeaponId,
  playerLicenses: LicenseId[],
  isPolice: boolean = false
): { ok: boolean; missingLicense?: LicenseId; message?: string } {
  return isLegalToOwn(weaponId, playerLicenses, isPolice);
}

/**
 * Vérifie la légalité d'une arme dans un contexte spécifique.
 * @param weaponId - ID de l'arme.
 * @param context - Contexte ("possession", "carry", "purchase", "transport").
 * @param playerLicenses - Permis du joueur.
 * @param isPolice - Si le joueur est policier.
 * @returns Résultat de la vérification.
 */
export function checkWeaponLegality(
  weaponId: WeaponId,
  context: "possession" | "carry" | "purchase" | "transport",
  playerLicenses: LicenseId[],
  isPolice: boolean = false
): { legal: boolean; message?: string } {
  const weapon = WEAPONS[weaponId];
  if (!weapon) {
    return { legal: true };
  }

  // Contexte spécifique
  switch (context) {
    case "purchase":
      // Pour l'achat, vérifier les permis et la légalité de base
      if (weapon.legal === "prohibee" || weapon.legal === "artisanale_illegale") {
        return {
          legal: isPolice,
          message: isPolice ? undefined : `Vente illégale: ${weapon.name} est prohibé(e).`,
        };
      }
      break;

    case "transport":
      // Pour le transport, vérifier l'Autorisation de Transport (ATT)
      if (weapon.legal === "restreinte" || weapon.legal === "prohibee") {
        if (!playerLicenses.includes("att_transport") && !isPolice) {
          return {
            legal: false,
            message: `Autorisation de transport (ATT) requise pour ${weapon.name}.`,
          };
        }
      }
      break;
  }

  // Vérification générale
  return isLegalToOwn(weaponId, playerLicenses, isPolice);
}

// ============================================================================
// 📜 FONCTIONS DE GESTION DES PERMIS
// ============================================================================

/**
 * Vérifie si un joueur a un permis spécifique.
 * @param playerLicenses - Permis du joueur.
 * @param licenseId - ID du permis à vérifier.
 * @returns `true` si le joueur a le permis.
 */
export function hasLicense(playerLicenses: LicenseId[], licenseId: LicenseId): boolean {
  return playerLicenses.includes(licenseId);
}

/**
 * Ajoute un permis à un joueur.
 * @param playerLicenses - Permis du joueur.
 * @param licenseId - ID du permis à ajouter.
 * @returns Nouvelle liste des permis.
 */
export function grantLicense(playerLicenses: LicenseId[], licenseId: LicenseId): LicenseId[] {
  if (playerLicenses.includes(licenseId)) {
    return playerLicenses;
  }
  return [...playerLicenses, licenseId];
}

/**
 * Retire un permis à un joueur.
 * @param playerLicenses - Permis du joueur.
 * @param licenseId - ID du permis à retirer.
 * @returns Nouvelle liste des permis.
 */
export function revokeLicense(playerLicenses: LicenseId[], licenseId: LicenseId): LicenseId[] {
  return playerLicenses.filter((id) => id !== licenseId);
}

/**
 * Vérifie si un joueur peut obtenir un permis.
 * @param licenseId - ID du permis.
 * @param player - État du joueur.
 * @returns `true` si le joueur peut obtenir le permis.
 */
export function canObtainLicense(licenseId: LicenseId, player: any): boolean {
  const license = LICENSES[licenseId];
  if (!license) return false;

  // Vérifier si le joueur a déjà le permis
  if (player.licenses && player.licenses.includes(licenseId)) {
    return false;
  }

  // Vérifier si le joueur a assez d'argent
  if (player.money < license.priceCAD) {
    return false;
  }

  // Vérifier les prérequis spécifiques
  switch (licenseId) {
    case "pal":
    case "pal_r":
      // Nécessite un cours de sécurité
      return player.hasCompletedSafetyCourse || false;
    case "chasse":
      // Nécessite un cours de chasse
      return player.hasCompletedHuntingCourse || false;
    case "att_transport":
      // Nécessite un PAL ou PAL-R
      return (player.licenses && (player.licenses.includes("pal") || player.licenses.includes("pal_r"))) || false;
    default:
      return true;
  }
}

/**
 * Achète un permis pour un joueur.
 * @param licenseId - ID du permis.
 * @param player - État du joueur.
 * @returns Résultat de l'achat.
 */
export function purchaseLicense(licenseId: LicenseId, player: any): { ok: boolean; message: string; newLicenses: LicenseId[] } {
  const license = LICENSES[licenseId];
  if (!license) {
    return { ok: false, message: "Permis introuvable.", newLicenses: player.licenses || [] };
  }

  // Vérifier si le joueur a déjà le permis
  if (player.licenses && player.licenses.includes(licenseId)) {
    return { ok: false, message: `Vous possédez déjà le permis ${license.name}.`, newLicenses: player.licenses };
  }

  // Vérifier si le joueur peut obtenir le permis
  if (!canObtainLicense(licenseId, player)) {
    return {
      ok: false,
      message: `Vous ne remplissez pas les conditions pour obtenir le permis ${license.name}.`,
      newLicenses: player.licenses || [],
    };
  }

  // Déduire le coût du permis
  player.money -= license.priceCAD;

  // Ajouter le permis
  const newLicenses = grantLicense(player.licenses || [], licenseId);
  player.licenses = newLicenses;

  return {
    ok: true,
    message: `Permis ${license.name} acheté pour ${license.priceCAD} $. Valide pour ${license.durationYears} ans.`,
    newLicenses,
  };
}

