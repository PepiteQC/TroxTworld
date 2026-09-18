/**
 * Ã¢Å¡â€“Ã¯Â¸Â SYSTÃƒË†ME LÃƒâ€°GAL QUÃƒâ€°BÃƒâ€°COIS Ã¢â‚¬â€ TROXTWORLD (v4.0)
 * Fichier: src/game/weapons-qc.ts
 * Gestion des lois sur les armes ÃƒÂ  feu au QuÃƒÂ©bec :
 * - Permis (PPA/PAL, PAL-R, Certificat de chasse)
 * - Enregistrement SIAF (SystÃƒÂ¨me d'immatriculation des armes ÃƒÂ  feu)
 * - Restrictions et classifications
 * - VÃƒÂ©rification de la lÃƒÂ©galitÃƒÂ©
 */

import { WeaponId, LicenseId, LICENSES, WEAPONS, WeaponTemplate, LegalClass } from "./weapons";

// ============================================================================
// Ã°Å¸â€œÅ“ SYSTÃƒË†ME SIAF (SystÃƒÂ¨me d'Immatriculation des Armes ÃƒÂ  Feu du QuÃƒÂ©bec)
// ============================================================================

/** Instance d'une arme avec numÃƒÂ©ro de sÃƒÂ©rie et immatriculation. */
export interface WeaponInstance {
  serialNumber: string;          // NumÃƒÂ©ro de sÃƒÂ©rie unique
  siafRegistrationNumber?: string; // NumÃƒÂ©ro d'immatriculation SIAF (si enregistrÃƒÂ©)
  isDefacedSerial?: boolean;      // Si le numÃƒÂ©ro de sÃƒÂ©rie a ÃƒÂ©tÃƒÂ© effacÃƒÂ©
  templateId: WeaponId;          // ID du template de l'arme
  ownerPlayerId: string;         // ID du propriÃƒÂ©taire (joueur ou PNJ)
  durabilityCurrent: number;    // DurabilitÃƒÂ© actuelle
  cleanlinessScore: number;      // Score de propretÃƒÂ© (0-100)
  isJammed: boolean;             // Si l'arme est enrayÃƒÂ©e
  loadedRounds: number;          // Balles chargÃƒÂ©es
  hasRoundInChamber: boolean;    // Si une balle est en chambre
  selectedFireMode: "safe" | "semi" | "auto" | "burst"; // Mode de tir sÃƒÂ©lectionnÃƒÂ©
  ballisticFingerprintId: string; // ID de l'empreinte balistique (unique par arme)
  attachments: {                 // Accessoires
    silencer: boolean;           // Silencieux
    flashlight: boolean;         // Lampe torche
    opticSight?: "red_dot" | "scope_4x" | "thermal"; // Viseur
    extendedMag: boolean;       // Chargeur ÃƒÂ©tendu
    autoSwitchInstalled: boolean; // SÃƒÂ©lecteur automatique installÃƒÂ© (illÃƒÂ©gal)
  };
}

/** Base de donnÃƒÂ©es des instances d'armes. */
const WEAPON_INSTANCES = new Map<string, WeaponInstance>();

/** Base de donnÃƒÂ©es des douilles balistiques (pour enquÃƒÂªtes). */
export interface BallisticCasing {
  casingId: string;
  caliber: string;
  ballisticFingerprintId: string;
  firedAt: number; // Timestamp
  location: { x: number; y: number; z: number };
}

const BALISTIC_EVIDENCE_CASINGS = new Map<string, BallisticCasing>();

// ============================================================================
// Ã°Å¸â€Â§ FONCTIONS DE GESTION DES ARMES
// ============================================================================

/**
 * CrÃƒÂ©e une nouvelle instance d'arme.
 * @param templateId - ID du template de l'arme.
 * @param ownerPlayerId - ID du propriÃƒÂ©taire.
 * @param serialNumber - NumÃƒÂ©ro de sÃƒÂ©rie (optionnel, gÃƒÂ©nÃƒÂ©rÃƒÂ© si non fourni).
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

  // Ajouter ÃƒÂ  la base de donnÃƒÂ©es
  WEAPON_INSTANCES.set(instance.serialNumber, instance);

  return instance;
}

/**
 * Supprime une instance d'arme.
 * @param serialNumber - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @returns `true` si la suppression a rÃƒÂ©ussi.
 */
export function destroyWeaponInstance(serialNumber: string): boolean {
  return WEAPON_INSTANCES.delete(serialNumber);
}

/**
 * RÃƒÂ©cupÃƒÂ¨re une instance d'arme par son numÃƒÂ©ro de sÃƒÂ©rie.
 * @param serialNumber - NumÃƒÂ©ro de sÃƒÂ©rie.
 * @returns Instance d'arme ou undefined.
 */
export function getWeaponInstance(serialNumber: string): WeaponInstance | undefined {
  return WEAPON_INSTANCES.get(serialNumber);
}

/**
 * RÃƒÂ©cupÃƒÂ¨re toutes les instances d'armes.
 * @returns Liste des instances d'armes.
 */
export function getAllWeaponInstances(): WeaponInstance[] {
  return Array.from(WEAPON_INSTANCES.values());
}

/**
 * RÃƒÂ©cupÃƒÂ¨re les armes d'un joueur.
 * @param playerId - ID du joueur.
 * @returns Liste des armes du joueur.
 */
export function getPlayerWeapons(playerId: string): WeaponInstance[] {
  return Array.from(WEAPON_INSTANCES.values()).filter(
    (instance) => instance.ownerPlayerId === playerId
  );
}

// ============================================================================
// Ã°Å¸Ââ€ºÃ¯Â¸Â FONCTIONS SIAF (Immatriculation des armes)
// ============================================================================

/**
 * Enregistre une arme au SIAF (SystÃƒÂ¨me d'Immatriculation des Armes ÃƒÂ  Feu).
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @param ownerPlayerId - ID du propriÃƒÂ©taire.
 * @param officerBadge - Matricule de l'officier (optionnel).
 * @returns RÃƒÂ©sultat de l'enregistrement.
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
      message: "Impossible d'immatriculer une arme au numÃƒÂ©ro de sÃƒÂ©rie altÃƒÂ©rÃƒÂ©.",
    };
  }

  // GÃƒÂ©nÃƒÂ©rer un numÃƒÂ©ro SIAF
  const siafNumber = `QC-${Math.floor(1000000 + Math.random() * 9000000)}`;
  instance.siafRegistrationNumber = siafNumber;
  instance.ownerPlayerId = ownerPlayerId;

  console.log(`[SIAF] Arme ${instance.templateId} (S/N: ${weaponSerial}) immatriculÃƒÂ©e sous le numÃƒÂ©ro ${siafNumber} au nom de ${ownerPlayerId}.`);

  return {
    ok: true,
    siafNumber,
    message: `Arme immatriculÃƒÂ©e avec succÃƒÂ¨s au fichier central du QuÃƒÂ©bec (SIAF #${siafNumber}).`,
  };
}

/**
 * Efface le numÃƒÂ©ro de sÃƒÂ©rie d'une arme (la rend intraÃƒÂ§able).
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @param mechanicPlayerId - ID du joueur/mÃƒÂ©canicien qui effectue l'opÃƒÂ©ration.
 * @returns RÃƒÂ©sultat de l'opÃƒÂ©ration.
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
    return { ok: false, message: "Le numÃƒÂ©ro de sÃƒÂ©rie est dÃƒÂ©jÃƒÂ  complÃƒÂ¨tement effacÃƒÂ©." };
  }

  // Effacer le numÃƒÂ©ro de sÃƒÂ©rie
  instance.isDefacedSerial = true;
  instance.serialNumber = `DEFACED-${Math.floor(1000 + Math.random() * 9000)}`;
  instance.siafRegistrationNumber = undefined; // Retirer l'immatriculation
  instance.durabilityCurrent = Math.max(10, instance.durabilityCurrent - 15);

  console.log(`[MARCHÃƒâ€° NOIR] NumÃƒÂ©ro de sÃƒÂ©rie de l'arme ${instance.templateId} (ancien S/N: ${weaponSerial}) meulÃƒÂ© par ${mechanicPlayerId}.`);

  return {
    ok: true,
    message: "NumÃƒÂ©ro de sÃƒÂ©rie meulÃƒÂ© avec succÃƒÂ¨s ! L'arme est dÃƒÂ©sormais intraÃƒÂ§able par la SQ.",
  };
}

/**
 * VÃƒÂ©rifie si une arme est immatriculÃƒÂ©e au SIAF.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @returns `true` si l'arme est immatriculÃƒÂ©e.
 */
export function isWeaponRegistered(weaponSerial: string): boolean {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  return !!instance?.siafRegistrationNumber;
}

/**
 * RÃƒÂ©cupÃƒÂ¨re le numÃƒÂ©ro SIAF d'une arme.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @returns NumÃƒÂ©ro SIAF ou undefined.
 */
export function getSiafNumber(weaponSerial: string): string | undefined {
  return WEAPON_INSTANCES.get(weaponSerial)?.siafRegistrationNumber;
}

// ============================================================================
// Ã°Å¸Å½Â¯ FONCTIONS BALISTIQUES (Tir, DÃƒÂ©gÃƒÂ¢ts, EnquÃƒÂªtes)
// ============================================================================

/** RÃƒÂ©sultat d'un tir. */
export interface ShootResult {
  fired: boolean;          // Si le tir a eu lieu
  isJammed: boolean;      // Si l'arme est enrayÃƒÂ©e
  damageDealt: number;    // DÃƒÂ©gÃƒÂ¢ts infligÃƒÂ©s
  bulletImpactPos?: { x: number; y: number; z: number }; // Position de l'impact
  roundsRemaining: number; // Balles restantes dans le chargeur
  soundDecibels: number;   // Niveau sonore du tir (dB)
  message: string;         // Message de retour
  casingId?: string;      // ID de la douille ÃƒÂ©jectÃƒÂ©e (pour enquÃƒÂªtes)
}

/**
 * Tire avec une arme.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @param shooterPlayerId - ID du tireur.
 * @param shooterPos - Position du tireur.
 * @param aimDirection - Direction du tir.
 * @param targetPlayerId - ID de la cible (optionnel).
 * @returns RÃƒÂ©sultat du tir.
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

  // VÃƒÂ©rifier si l'arme est enrayÃƒÂ©e
  if (instance.isJammed) {
    return {
      fired: false,
      isJammed: true,
      damageDealt: 0,
      roundsRemaining: instance.loadedRounds,
      soundDecibels: 0,
      message: "Ã¢Å¡Â Ã¯Â¸Â CLIC ! L'arme est enrayÃƒÂ©e ! Effectuez un dÃƒÂ©senrayage d'urgence.",
    };
  }

  // VÃƒÂ©rifier si l'arme a des munitions (sauf pour les armes blanches)
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

  // RÃƒÂ©duire la durabilitÃƒÂ© et la propretÃƒÂ©
  instance.durabilityCurrent = Math.max(0, instance.durabilityCurrent - 1);
  instance.cleanlinessScore = Math.max(0, instance.cleanlinessScore - 0.5);

  // VÃƒÂ©rifier si l'arme s'enraie (selon la propretÃƒÂ© et la durabilitÃƒÂ©)
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
      message: "Ã°Å¸â€™Â¥ ENRAYAGE ! Une douille est coincÃƒÂ©e dans la culasse !",
    };
  }

  // CrÃƒÂ©er une douille balistique (pour les armes ÃƒÂ  feu)
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

  // Calculer les dÃƒÂ©gÃƒÂ¢ts
  let finalDamage = template.baseDamage;
  const ammoSpec = template.ammo ? (AMMO_CATALOG as any)[template.ammo] : undefined;

  if (ammoSpec) {
    finalDamage *= ammoSpec.damageModifier;
  }

  // Appliquer les dÃƒÂ©gÃƒÂ¢ts ÃƒÂ  la cible si elle existe
  if (targetPlayerId) {
    // Ici, vous devriez appeler votre systÃƒÂ¨me de santÃƒÂ© pour appliquer les dÃƒÂ©gÃƒÂ¢ts
    // Exemple: modifyHealth(-finalDamage, targetPlayerId);
    console.log(`[BALISTIQUE] ${finalDamage} dÃƒÂ©gÃƒÂ¢ts infligÃƒÂ©s ÃƒÂ  ${targetPlayerId} avec ${template.name}.`);
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
    message: `BANG ! Tir effectuÃƒÂ© avec ${template.name}.`,
    casingId,
  };
}

/**
 * DÃƒÂ©senraie une arme.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @returns RÃƒÂ©sultat de l'opÃƒÂ©ration.
 */
export function clearWeaponJam(weaponSerial: string): { ok: boolean; message: string } {
  const instance = WEAPON_INSTANCES.get(weaponSerial);
  if (!instance) {
    return { ok: false, message: "Arme introuvable." };
  }

  if (!instance.isJammed) {
    return { ok: false, message: "L'arme n'est pas enrayÃƒÂ©e." };
  }

  instance.isJammed = false;
  return {
    ok: true,
    message: "Tap-Rack-Bang ! Douille expulsÃƒÂ©e, arme prÃƒÂªte ÃƒÂ  faire feu.",
  };
}

/**
 * Nettoie et entretient une arme.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @param playerId - ID du joueur qui effectue l'entretien.
 * @returns RÃƒÂ©sultat de l'opÃƒÂ©ration.
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
    message: "Arme entiÃƒÂ¨rement dÃƒÂ©montÃƒÂ©e, dÃƒÂ©graissÃƒÂ©e et rÃƒÂ©visÃƒÂ©e.",
  };
}

/**
 * Recharge une arme.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @param ammoType - Type de munition.
 * @param amount - QuantitÃƒÂ© de munitions ÃƒÂ  charger.
 * @returns RÃƒÂ©sultat de l'opÃƒÂ©ration.
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

  // VÃƒÂ©rifier si la munition correspond
  if (template.ammo !== ammoType) {
    return {
      ok: false,
      message: `Cette arme utilise des munitions de type ${template.ammo}, pas ${ammoType}.`,
      loadedRounds: instance.loadedRounds,
    };
  }

  // Calculer le nombre de balles ÃƒÂ  charger
  const spaceAvailable = template.magazineCapacity - instance.loadedRounds;
  const toLoad = Math.min(amount, spaceAvailable);

  instance.loadedRounds += toLoad;

  return {
    ok: true,
    message: `RechargÃƒÂ© ${toLoad} balles de type ${ammoType}.`,
    loadedRounds: instance.loadedRounds,
  };
}

/**
 * Change le mode de tir d'une arme.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @param mode - Mode de tir ("safe", "semi", "auto", "burst").
 * @returns RÃƒÂ©sultat de l'opÃƒÂ©ration.
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

  // VÃƒÂ©rifier si le mode est disponible
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
    message: `Mode de tir changÃƒÂ© pour: ${mode}.`,
  };
}

// ============================================================================
// Ã°Å¸â€Â FONCTIONS D'ENQUÃƒÅ TE BALISTIQUE (pour la SQ)
// ============================================================================

/**
 * Ajoute une douille ÃƒÂ  la base de donnÃƒÂ©es balistique.
 * @param casing - Douille ÃƒÂ  ajouter.
 */
export function addBallisticCasing(casing: BallisticCasing): void {
  BALISTIC_EVIDENCE_CASINGS.set(casing.casingId, casing);
}

/**
 * RÃƒÂ©cupÃƒÂ¨re une douille par son ID.
 * @param casingId - ID de la douille.
 * @returns Douille ou undefined.
 */
export function getBallisticCasing(casingId: string): BallisticCasing | undefined {
  return BALISTIC_EVIDENCE_CASINGS.get(casingId);
}

/**
 * Compare une douille ÃƒÂ  une arme pour voir si elles correspondent.
 * @param casingId - ID de la douille.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @returns RÃƒÂ©sultat de la comparaison.
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
    ? `Ã¢Å“â€¦ MATCH POSITIF (IBIS) : Les rayures de culasse et la marque du percuteur correspondent ÃƒÂ  l'arme ${weapon.templateId} (Matricule: ${weapon.serialNumber}).`
    : "Ã¢ÂÅ’ RÃƒâ€°SULTAT NÃƒâ€°GATIF : Aucune correspondance balistique trouvÃƒÂ©e.";

  return { match: isMatching, confidencePct: confidence, report };
}

/**
 * RÃƒÂ©cupÃƒÂ¨re toutes les douilles associÃƒÂ©es ÃƒÂ  une arme.
 * @param weaponSerial - NumÃƒÂ©ro de sÃƒÂ©rie de l'arme.
 * @returns Liste des douilles associÃƒÂ©es.
 */
export function getCasingsByWeapon(weaponSerial: string): BallisticCasing[] {
  const weapon = WEAPON_INSTANCES.get(weaponSerial);
  if (!weapon) return [];

  return Array.from(BALISTIC_EVIDENCE_CASINGS.values()).filter(
    (casing) => casing.ballisticFingerprintId === weapon.ballisticFingerprintId
  );
}

/**
 * RÃƒÂ©cupÃƒÂ¨re toutes les douilles d'un calibre spÃƒÂ©cifique.
 * @param caliber - Calibre de la munition.
 * @returns Liste des douilles du calibre.
 */
export function getCasingsByCaliber(caliber: string): BallisticCasing[] {
  return Array.from(BALISTIC_EVIDENCE_CASINGS.values()).filter(
    (casing) => casing.caliber === caliber
  );
}

// ============================================================================
// Ã°Å¸â€ºÂ¡Ã¯Â¸Â FONCTIONS DE VÃƒâ€°RIFICATION LÃƒâ€°GALE
// ============================================================================

/**
 * VÃƒÂ©rifie si un joueur peut lÃƒÂ©galement possÃƒÂ©der une arme.
 * @param weaponId - ID de l'arme.
 * @param playerLicenses - Permis du joueur.
 * @param isPolice - Si le joueur est policier.
 * @returns RÃƒÂ©sultat de la vÃƒÂ©rification.
 */
export function isLegalToOwn(
  weaponId: WeaponId,
  playerLicenses: LicenseId[],
  isPolice: boolean = false
): { legal: boolean; missingLicense?: LicenseId; message?: string } {
  const weapon = WEAPONS[weaponId];
  if (!weapon) {
    return { legal: true }; // Arme inconnue = lÃƒÂ©gale par dÃƒÂ©faut
  }

  // Les policiers peuvent tout possÃƒÂ©der
  if (isPolice) {
    return { legal: true };
  }

  // Armes prohibÃƒÂ©es ou artisanales illÃƒÂ©gales
  if (weapon.legal === "prohibee" || weapon.legal === "artisanale_illegale") {
    return {
      legal: false,
      message: `Possession illÃƒÂ©gale: ${weapon.name} (${weapon.legal}).`,
    };
  }

  // VÃƒÂ©rifier les permis requis
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
 * VÃƒÂ©rifie si un joueur peut lÃƒÂ©galement porter une arme en public.
 * @param weaponId - ID de l'arme.
 * @param playerLicenses - Permis du joueur.
 * @param isPolice - Si le joueur est policier.
 * @returns RÃƒÂ©sultat de la vÃƒÂ©rification.
 */
export function isLegalToCarry(
  weaponId: WeaponId,
  playerLicenses: LicenseId[],
  isPolice: boolean = false
): { legal: boolean; missingLicense?: LicenseId; message?: string } {
  const r: any = isLegalToOwn(weaponId, playerLicenses, isPolice); return { ok: r?.legal ?? false, missingLicense: r?.missingLicense, message: r?.message };
}

/**
 * VÃƒÂ©rifie si un joueur peut lÃƒÂ©galement acheter une arme.
 * @param weaponId - ID de l'arme.
 * @param playerLicenses - Permis du joueur.
 * @param isPolice - Si le joueur est policier.
 * @returns RÃƒÂ©sultat de la vÃƒÂ©rification.
 */
export function canPurchaseWeapon(
  weaponId: WeaponId,
  playerLicenses: LicenseId[],
  isPolice: boolean = false
): { ok: boolean; missingLicense?: LicenseId; message?: string } {
  const r: any = isLegalToOwn(weaponId, playerLicenses, isPolice); return { ok: r?.legal ?? false, missingLicense: r?.missingLicense, message: r?.message };
}

/**
 * VÃƒÂ©rifie la lÃƒÂ©galitÃƒÂ© d'une arme dans un contexte spÃƒÂ©cifique.
 * @param weaponId - ID de l'arme.
 * @param context - Contexte ("possession", "carry", "purchase", "transport").
 * @param playerLicenses - Permis du joueur.
 * @param isPolice - Si le joueur est policier.
 * @returns RÃƒÂ©sultat de la vÃƒÂ©rification.
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

  // Contexte spÃƒÂ©cifique
  switch (context) {
    case "purchase":
      // Pour l'achat, vÃƒÂ©rifier les permis et la lÃƒÂ©galitÃƒÂ© de base
      if (weapon.legal === "prohibee" || weapon.legal === "artisanale_illegale") {
        return {
          legal: isPolice,
          message: isPolice ? undefined : `Vente illÃƒÂ©gale: ${weapon.name} est prohibÃƒÂ©(e).`,
        };
      }
      break;

    case "transport":
      // Pour le transport, vÃƒÂ©rifier l'Autorisation de Transport (ATT)
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

  // VÃƒÂ©rification gÃƒÂ©nÃƒÂ©rale
  const r: any = isLegalToOwn(weaponId, playerLicenses, isPolice); return { ok: r?.legal ?? false, missingLicense: r?.missingLicense, message: r?.message };
}

// ============================================================================
// Ã°Å¸â€œÅ“ FONCTIONS DE GESTION DES PERMIS
// ============================================================================

/**
 * VÃƒÂ©rifie si un joueur a un permis spÃƒÂ©cifique.
 * @param playerLicenses - Permis du joueur.
 * @param licenseId - ID du permis ÃƒÂ  vÃƒÂ©rifier.
 * @returns `true` si le joueur a le permis.
 */
export function hasLicense(playerLicenses: LicenseId[], licenseId: LicenseId): boolean {
  return playerLicenses.includes(licenseId);
}

/**
 * Ajoute un permis ÃƒÂ  un joueur.
 * @param playerLicenses - Permis du joueur.
 * @param licenseId - ID du permis ÃƒÂ  ajouter.
 * @returns Nouvelle liste des permis.
 */
export function grantLicense(playerLicenses: LicenseId[], licenseId: LicenseId): LicenseId[] {
  if (playerLicenses.includes(licenseId)) {
    return playerLicenses;
  }
  return [...playerLicenses, licenseId];
}

/**
 * Retire un permis ÃƒÂ  un joueur.
 * @param playerLicenses - Permis du joueur.
 * @param licenseId - ID du permis ÃƒÂ  retirer.
 * @returns Nouvelle liste des permis.
 */
export function revokeLicense(playerLicenses: LicenseId[], licenseId: LicenseId): LicenseId[] {
  return playerLicenses.filter((id) => id !== licenseId);
}

/**
 * VÃƒÂ©rifie si un joueur peut obtenir un permis.
 * @param licenseId - ID du permis.
 * @param player - Ãƒâ€°tat du joueur.
 * @returns `true` si le joueur peut obtenir le permis.
 */
export function canObtainLicense(licenseId: LicenseId, player: any): boolean {
  const license = LICENSES[licenseId];
  if (!license) return false;

  // VÃƒÂ©rifier si le joueur a dÃƒÂ©jÃƒÂ  le permis
  if (player.licenses && player.licenses.includes(licenseId)) {
    return false;
  }

  // VÃƒÂ©rifier si le joueur a assez d'argent
  if (player.money < license.priceCAD) {
    return false;
  }

  // VÃƒÂ©rifier les prÃƒÂ©requis spÃƒÂ©cifiques
  switch (licenseId) {
    case "pal":
    case "pal_r":
      // NÃƒÂ©cessite un cours de sÃƒÂ©curitÃƒÂ©
      return player.hasCompletedSafetyCourse || false;
    case "chasse":
      // NÃƒÂ©cessite un cours de chasse
      return player.hasCompletedHuntingCourse || false;
    case "att_transport":
      // NÃƒÂ©cessite un PAL ou PAL-R
      return (player.licenses && (player.licenses.includes("pal") || player.licenses.includes("pal_r"))) || false;
    default:
      return true;
  }
}

/**
 * AchÃƒÂ¨te un permis pour un joueur.
 * @param licenseId - ID du permis.
 * @param player - Ãƒâ€°tat du joueur.
 * @returns RÃƒÂ©sultat de l'achat.
 */
export function purchaseLicense(licenseId: LicenseId, player: any): { ok: boolean; message: string; newLicenses: LicenseId[] } {
  const license = LICENSES[licenseId];
  if (!license) {
    return { ok: false, message: "Permis introuvable.", newLicenses: player.licenses || [] };
  }

  // VÃƒÂ©rifier si le joueur a dÃƒÂ©jÃƒÂ  le permis
  if (player.licenses && player.licenses.includes(licenseId)) {
    return { ok: false, message: `Vous possÃƒÂ©dez dÃƒÂ©jÃƒÂ  le permis ${license.name}.`, newLicenses: player.licenses };
  }

  // VÃƒÂ©rifier si le joueur peut obtenir le permis
  if (!canObtainLicense(licenseId, player)) {
    return {
      ok: false,
      message: `Vous ne remplissez pas les conditions pour obtenir le permis ${license.name}.`,
      newLicenses: player.licenses || [],
    };
  }

  // DÃƒÂ©duire le coÃƒÂ»t du permis
  player.money -= license.priceCAD;

  // Ajouter le permis
  const newLicenses = grantLicense(player.licenses || [], licenseId);
  player.licenses = newLicenses;

  return {
    ok: true,
    message: `Permis ${license.name} achetÃƒÂ© pour ${license.priceCAD} $. Valide pour ${license.durationYears} ans.`,
    newLicenses,
  };
}

