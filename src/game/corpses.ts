/**
 * ═══════════════════════════════════════════════════════════════════
 *  SYSTÈME DE CADAVRES — ULTIMATE EDITION v2.0
 * ═══════════════════════════════════════════════════════════════════
 * Gestion avancée des cadavres pour TroxTWorld (Comté de Portneuf).
 * 
 * Fonctionnalités :
 * - 30 poses MoCap (9 assis, 21 couchés)
 * - Décomposition réaliste (7 états: frais → squelette)
 * - Système de blessures détaillé (type, localisation, sévérité)
 * - Effets visuels dynamiques (sang, mouches, changements de couleur)
 * - Intégration complète avec le système de crime (SQ, coroner)
 * - Détection automatique par les patrouilles
 * - Enquêtes et autopsies avec rapports détaillés
 * - Sauvegarde/Chargement des scènes de crime
 * - Optimisation des performances (cache FBX, Zero-GC)
 * - Gestion des fluides corporels (sang qui sèche)
 * - Système de température et d'odeurs
 * - Génération procédurale de vêtements et effets personnels
 * 
 * @author xblade benz (TroxTWorld)
 */

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { A40_Z, PRISON, SQ_JAIL } from "./worlddata";
import { CRIME_SPOTS, addWantedPoints, getCrimeById, Crime } from "./rp";

// ==========================================
// 📌 1. TYPES & CONSTANTES
// ==========================================

/** IDs des poses de cadavres assis */
export const DEAD_SIT = [
  "sit_01", "sit_02", "sit_03", "sit_04", "sit_05",
  "sit_06", "sit_07", "sit_08", "sit_09",
] as const;

/** IDs des poses de cadavres allongés */
export const DEAD_LIE = [
  "lie_01", "lie_02", "lie_03", "lie_04", "lie_05",
  "lie_06", "lie_07", "lie_08", "lie_09", "lie_10",
  "lie_11", "lie_12", "lie_13", "lie_14", "lie_15",
  "lie_16", "lie_17", "lie_18", "lie_19", "lie_20", "lie_21",
] as const;

/** Type pour les IDs de poses */
export type DeadPoseId = (typeof DEAD_SIT)[number] | (typeof DEAD_LIE)[number];

/** État de décomposition du cadavre */
export type DecompositionState = 
  | "fresh"        // 0-2h : Cadavre frais, pas de changements visibles
  | "early"       // 2-6h : Rigidité cadavérique, légère pâleur
  | "bloat"       // 6-24h : Gonflement, début d'odeurs
  | "active_decay" // 1-3 jours : Décomposition active, mouches, odeurs fortes
  | "advanced_decay" // 3-7 jours : Décomposition avancée, tissus mous
  | "skeletal"    // 7-14 jours : Squelettisation partielle
  | "skeleton";   // 14+ jours : Squelette complet

/** Type de blessure */
export type WoundType = 
  | "gunshot"       // Balle
  | "stab"          // Coup de couteau
  | "blunt"         // Traumatisme contondant
  | "slash"         // Coup tranchant
  | "burn"          // Brûlure
  | "drown"         // Noyade
  | "poison"        // Empoisonnement
  | "strangulation" // Étranglement
  | "fall"          // Chute
  | "natural"       // Cause naturelle
  | "unknown";      // Inconnue

/** Localisation des blessures */
export type WoundLocation = 
  | "head"
  | "neck"
  | "torch"        // Torse
  | "left_arm"
  | "right_arm"
  | "left_hand"
  | "right_hand"
  | "left_leg"
  | "right_leg"
  | "left_foot"
  | "right_foot"
  | "stomach"
  | "back"
  | "multiple";

/** Interface pour une blessure */
export interface Wound {
  type: WoundType;
  location: WoundLocation;
  severity: number; // 0-100
  description: string;
  timeOfInjury?: number; // Timestamp
  weaponId?: string; // ID de l'arme utilisée (si applicable)
}

/** Interface pour un cadavre */
export interface Corpse {
  id: string;
  pose: DeadPoseId;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  decompositionState: DecompositionState;
  timeOfDeath: number; // Timestamp
  wounds: Wound[];
  causeOfDeath: WoundType;
  discovered: boolean;
  discoveredBy?: string; // ID du joueur ou PNJ qui a découvert
  discoveryTime?: number;
  investigated: boolean;
  autopsied: boolean;
  crimeId?: string; // Lien avec un crime (rp.ts)
  bloodPools: string[]; // IDs des flaques de sang
  flies?: THREE.Group; // Groupe des mouches
  smellIntensity: number; // 0-100
  bodyTemperature: number; // en °C
  rigorMortis: boolean; // Rigidité cadavérique
  livorMortis: boolean; // Livor mortis (accumulation de sang)
  ownerId?: string; // ID du propriétaire (pour les PNJ)
  clothing?: string[]; // Vêtements portés
  personalEffects?: string[]; // Objets personnels trouvés
  userData?: {
    group?: THREE.Group; // Référence au groupe Three.js
  };
}

/** Spot de cadavre dans le monde */
export interface BodySpot {
  pose: DeadPoseId;
  x: number;
  z: number;
  yaw: number;
  crimeId?: string; // Lien avec un crime
  timePlaced?: number; // Quand le cadavre a été placé
}

/** Rapport d'autopsie */
export interface AutopsyReport {
  id: string;
  corpseId: string;
  performedBy: string; // ID du coroner
  timePerformed: number;
  estimatedTimeOfDeath: number;
  causeOfDeath: WoundType;
  mannerOfDeath: "natural" | "accidental" | "suicide" | "homicide" | "undetermined";
  wounds: Wound[];
  toxicology: {
    alcohol: number; // 0-0.8 (pourcentage)
    drugs: string[]; // Liste des substances détectées
    poisons: string[];
  };
  stomachContents: string[]; // Contenu de l'estomac
  notes: string;
  conclusion: string;
}

/** Rapport de scène de crime */
export interface CrimeSceneReport {
  id: string;
  location: { x: number; y: number; z: number };
  timeDiscovered: number;
  discoveredBy: string;
  corpses: string[]; // IDs des cadavres
  evidence: string[]; // Liste des preuves (armes, objets, etc.)
  photos: string[]; // URLs des captures d'écran (à implémenter)
  notes: string;
  assignedTo?: string; // ID du détective assigné
  status: "open" | "investigating" | "solved" | "closed";
}

/** Type de fluide corporel */
export type BodyFluidType = "blood" | "saliva" | "urine" | "vomit" | "cerebrospinal";

/** Interface pour une flaque de fluide */
export interface BodyFluidPool {
  id: string;
  type: BodyFluidType;
  position: THREE.Vector3;
  size: number; // Rayon de la flaque
  mesh: THREE.Mesh;
  age: number; // Âge en ms
  dried: boolean; // Si la flaque est sèche
}

/** Type de trace ADN */
export type DNAType = "blood" | "hair" | "skin" | "saliva" | "sweat";

/** Interface pour une trace ADN */
export interface DNATrace {
  id: string;
  type: DNAType;
  position: THREE.Vector3;
  mesh?: THREE.Mesh; // Mesh pour les traces visibles (sang, etc.)
  ownerId?: string; // ID du propriétaire (victime ou suspect)
  collected: boolean; // Si la trace a été collectée
  collectedBy?: string; // Qui a collecté la trace
  collectedTime?: number;
}

// ==========================================
// 🧬 2. CONSTANTES DE DÉCOMPOSITION
// ==========================================

/** Durée des états de décomposition (en ms) */
export const DECOMPOSITION_TIMES: Record<DecompositionState, number> = {
  fresh: 2 * 60 * 60 * 1000,        // 2 heures
  early: 4 * 60 * 60 * 1000,        // 4 heures (total: 6h)
  bloat: 18 * 60 * 60 * 1000,       // 18 heures (total: 24h)
  active_decay: 3 * 24 * 60 * 60 * 1000, // 3 jours (total: 4 jours)
  advanced_decay: 4 * 24 * 60 * 60 * 1000, // 4 jours (total: 8 jours)
  skeletal: 7 * 24 * 60 * 60 * 1000, // 7 jours (total: 15 jours)
  skeleton: 14 * 24 * 60 * 60 * 1000, // 14 jours (total: 29 jours)
};

/** Températures corporelles selon l'état (°C) */
export const BODY_TEMPERATURES: Record<DecompositionState, number> = {
  fresh: 37.0,     // Température normale
  early: 30.0,     // Refroidissement
  bloat: 22.0,     // Température ambiante
  active_decay: 18.0,
  advanced_decay: 15.0,
  skeletal: 15.0,
  skeleton: 15.0,
};

/** Intensité des odeurs selon l'état (0-100) */
export const SMELL_INTENSITIES: Record<DecompositionState, number> = {
  fresh: 0,        // Aucune odeur
  early: 10,       // Légère odeur
  bloat: 50,       // Odeur forte
  active_decay: 80,
  advanced_decay: 90,
  skeletal: 70,    // Odeur de pourriture avancée
  skeleton: 30,    // Odeur faible (os)
};

/** Probabilité de mouches selon l'état (0-1) */
export const FLY_PROBABILITIES: Record<DecompositionState, number> = {
  fresh: 0.0,
  early: 0.1,
  bloat: 0.5,
  active_decay: 0.9,
  advanced_decay: 0.8,
  skeletal: 0.3,
  skeleton: 0.0,
};

/** Couleurs des flaques de sang selon l'âge (en hex) */
export const BLOOD_COLORS: Record<number, number> = {
  0: 0x800000,    // Rouge foncé (frais: 0-6h)
  1: 0x6a0000,    // Rouge foncé (6-12h)
  2: 0x4a0000,    // Rouge très foncé (12-24h)
  3: 0x3a1a1a,    // Brun rougeâtre (1-2 jours)
  4: 0x2a1a1a,    // Brun foncé (2-4 jours)
  5: 0x1a1a1a,    // Noirâtre (4+ jours)
};

/** Taux de séchage des flaques selon le type de fluide (ms pour sécher complètement) */
export const FLUID_DRY_TIMES: Record<BodyFluidType, number> = {
  blood: 48 * 60 * 60 * 1000,    // 48 heures
  saliva: 12 * 60 * 60 * 1000,  // 12 heures
  urine: 24 * 60 * 60 * 1000,   // 24 heures
  vomit: 36 * 60 * 60 * 1000,   // 36 heures
  cerebrospinal: 6 * 60 * 60 * 1000, // 6 heures
};

// ==========================================
// 🎨 3. MATÉRIAUX POUR LES CADAVRES
// ==========================================

/** Matériau pour la peau (base) */
const SKIN_BASE = new THREE.MeshLambertMaterial({
  color: 0xb89a7a,
  flatShading: false,
});

/** Matériau pour les vêtements (base) */
const CLOTH_BASE = new THREE.MeshLambertMaterial({
  color: 0x3a3e46,
  flatShading: false,
});

/** Matériau pour le sang frais */
const BLOOD_FRESH = new THREE.MeshLambertMaterial({
  color: 0x800000,
  flatShading: false,
});

/** Matériau pour le sang séché */
const BLOOD_DRIED = new THREE.MeshLambertMaterial({
  color: 0x2a1a1a,
  flatShading: false,
});

/** Matériau pour les os */
const BONE_MATERIAL = new THREE.MeshLambertMaterial({
  color: 0xf0e8d8,
  flatShading: false,
});

/** Matériau pour les vêtements ensanglantés */
const BLOODY_CLOTH = new THREE.MeshLambertMaterial({
  color: 0x5a1a1a,
  flatShading: false,
});

// ==========================================
// 🧟 4. CLASSE CORPSE MANAGER
// ==========================================

export class CorpseManager {
  // --- Données ---
  private corpses: Map<string, Corpse> = new Map();
  private fluidPools: Map<string, BodyFluidPool> = new Map();
  private dnaTraces: Map<string, DNATrace> = new Map();
  private autopsyReports: Map<string, AutopsyReport> = new Map();
  private crimeSceneReports: Map<string, CrimeSceneReport> = new Map();
  
  // --- Compteurs ---
  private lastCorpseId: number = 0;
  private lastFluidId: number = 0;
  private lastTraceId: number = 0;
  private lastReportId: number = 0;

  // --- Référence à la scène Three.js ---
  private scene?: THREE.Scene;

  // --- Cache pour les modèles ---
  private poseCache: Map<string, THREE.Group> = new Map();
  private pendingLoads: Map<string, Promise<THREE.Group>> = new Map();

  // --- Outils temporaires ---
  private tempBox: THREE.Box3 = new THREE.Box3();
  private tempSize: THREE.Vector3 = new THREE.Vector3();

  constructor(scene?: THREE.Scene) {
    this.scene = scene;
    this.initializeDefaultCorpses();
  }

  // ==========================================
  // 🔄 INITIALISATION
  // ==========================================

  /**
   * Initialise les cadavres par défaut dans le comté
   */
  private initializeDefaultCorpses(): void {
    const defaultSpots = this.getDefaultBodySpots();
    for (const spot of defaultSpots) {
      this.createCorpse(spot);
    }
  }

  /**
   * Récupère les spots de cadavres par défaut
   */
  getDefaultBodySpots(): BodySpot[] {
    const c0 = CRIME_SPOTS[0]!;
    const c1 = CRIME_SPOTS[1]!;
    const c2 = CRIME_SPOTS[2]!;
    const c3 = CRIME_SPOTS[3]!;
    
    return [
      { pose: "lie_04", x: c0.x + 2.4, z: c0.z - 1.6, yaw: 1.2, crimeId: "crime_001" },
      { pose: "sit_01", x: SQ_JAIL.x + 3.2, z: SQ_JAIL.z - 2.4, yaw: -0.4 },
      { pose: "lie_10", x: 18, z: A40_Z + 7, yaw: 0.2 },
      { pose: "sit_07", x: PRISON.x + 14, z: PRISON.z + 6, yaw: 2.6 },
      { pose: "lie_16", x: -620, z: -540, yaw: 0.8 },
      { pose: "sit_05", x: c1.x + 1.8, z: c1.z + 2.2, yaw: 1.1, crimeId: "crime_002" },
      { pose: "lie_01", x: c2.x - 2, z: c2.z - 1.4, yaw: -0.6 },
      { pose: "sit_09", x: c3.x + 1.5, z: c3.z - 2, yaw: 0.3 },
    ];
  }

  /**
   * Définit la scène Three.js (à appeler après l'initialisation de la scène)
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
    // Recharger les cadavres existants avec la nouvelle scène
    for (const corpse of this.corpses.values()) {
      this.loadCorpseModel(corpse);
    }
  }

  // ==========================================
  // 💀 CRÉATION ET GESTION DES CADAVRES
  // ==========================================

  /**
   * Crée un nouveau cadavre
   * @param spot - Spot où placer le cadavre
   * @param options - Options de création
   * @returns ID du cadavre créé
   */
  createCorpse(
    spot: BodySpot,
    options: {
      wounds?: Wound[];
      causeOfDeath?: WoundType;
      timeOfDeath?: number;
      ownerId?: string;
      clothing?: string[];
      personalEffects?: string[];
      crimeId?: string;
    } = {}
  ): string {
    const id = `corpse_${++this.lastCorpseId}_${Date.now()}`;
    
    const corpse: Corpse = {
      id,
      pose: spot.pose,
      position: new THREE.Vector3(spot.x, 0, spot.z),
      rotation: new THREE.Euler(0, spot.yaw, 0),
      decompositionState: "fresh",
      timeOfDeath: options.timeOfDeath || Date.now(),
      wounds: options.wounds || this.generateDefaultWounds(options.causeOfDeath || "unknown"),
      causeOfDeath: options.causeOfDeath || "unknown",
      discovered: false,
      autopsied: false,
      investigated: false,
      crimeId: options.crimeId || spot.crimeId,
      bloodPools: [],
      smellIntensity: 0,
      bodyTemperature: BODY_TEMPERATURES.fresh,
      rigorMortis: false,
      livorMortis: false,
      ownerId: options.ownerId,
      clothing: options.clothing || this.generateRandomClothing(),
      personalEffects: options.personalEffects || this.generateRandomPersonalEffects(),
    };

    this.corpses.set(id, corpse);
    
    // Créer le modèle 3D si la scène est disponible
    if (this.scene) {
      this.loadCorpseModel(corpse);
    }
    
    // Créer les flaques de sang
    this.createBloodPools(corpse);
    
    // Créer les traces ADN
    this.createDNATraces(corpse);
    
    // Lier au crime si spécifié
    if (corpse.crimeId) {
      this.linkToCrime(corpse.id, corpse.crimeId);
    }

    return id;
  }

  /**
   * Génère des blessures par défaut selon la cause du décès
   */
  private generateDefaultWounds(causeOfDeath: WoundType): Wound[] {
    const wounds: Wound[] = [];
    
    switch (causeOfDeath) {
      case "gunshot":
        // 1-3 blessures par balle
        const numShots = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numShots; i++) {
          wounds.push({
            type: "gunshot",
            location: ["head", "torch", "stomach", "back", "left_arm", "right_arm"].random(),
            severity: 70 + Math.random() * 30,
            description: `Balle de calibre ${["9mm", "5.56mm", ".45", "7.62mm"].random()}`,
            timeOfInjury: Date.now() - Math.random() * 3600000, // 0-1h avant
          });
        }
        break;
      case "stab":
        // 1-5 coups de couteau
        const numStabs = 1 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numStabs; i++) {
          wounds.push({
            type: "stab",
            location: ["torch", "stomach", "back", "neck", "left_arm", "right_arm"].random(),
            severity: 50 + Math.random() * 50,
            description: `Coup de couteau${numStabs > 1 ? ` (${i+1})` : ''}`,
            timeOfInjury: Date.now() - Math.random() * 3600000,
          });
        }
        break;
      case "blunt":
        // Traumatismes contondants
        wounds.push({
          type: "blunt",
          location: "head",
          severity: 85 + Math.random() * 15,
          description: "Traumatisme crânien sévère",
          timeOfInjury: Date.now() - Math.random() * 3600000,
        });
        if (Math.random() > 0.5) {
          wounds.push({
            type: "blunt",
            location: ["torch", "stomach", "back"].random(),
            severity: 60 + Math.random() * 40,
            description: "Contusions et fractures internes",
            timeOfInjury: Date.now() - Math.random() * 3600000,
          });
        }
        break;
      case "slash":
        // Coup tranchant (ex: machette)
        wounds.push({
          type: "slash",
          location: ["neck", "torch"].random(),
          severity: 90 + Math.random() * 10,
          description: "Sectionnement de l'artère carotide",
          timeOfInjury: Date.now() - Math.random() * 3600000,
        });
        break;
      case "burn":
        // Brûlures
        wounds.push({
          type: "burn",
          location: "multiple",
          severity: 80 + Math.random() * 20,
          description: `Brûlures au ${["deuxième", "troisième"].random()} degré sur ${Math.random() > 0.5 ? "plus de 60%" : "40-60%"} du corps`,
          timeOfInjury: Date.now() - Math.random() * 3600000,
        });
        break;
      case "drown":
        // Noyade
        wounds.push({
          type: "drown",
          location: "multiple",
          severity: 100,
          description: "Noyade. Eau dans les poumons.",
          timeOfInjury: Date.now() - Math.random() * 3600000,
        });
        break;
      case "poison":
        // Empoisonnement
        wounds.push({
          type: "poison",
          location: "multiple",
          severity: 100,
          description: `Intoxication au ${["cyanure", "arsenic", "monoxyde de carbone", "ricin", "strychnine"].random()}`,
          timeOfInjury: Date.now() - Math.random() * 7200000, // 0-2h avant
        });
        break;
      case "strangulation":
        // Étranglement
        wounds.push({
          type: "strangulation",
          location: "neck",
          severity: 100,
          description: "Étranglement. Marques de strangulation visibles.",
          timeOfInjury: Date.now() - Math.random() * 3600000,
        });
        break;
      case "fall":
        // Chute
        wounds.push({
          type: "blunt",
          location: "head",
          severity: 75 + Math.random() * 25,
          description: "Traumatisme crânien suite à une chute de grande hauteur",
          timeOfInjury: Date.now() - Math.random() * 3600000,
        });
        if (Math.random() > 0.5) {
          wounds.push({
            type: "blunt",
            location: ["left_leg", "right_leg", "torch"].random(),
            severity: 50 + Math.random() * 50,
            description: "Fractures multiples",
            timeOfInjury: Date.now() - Math.random() * 3600000,
          });
        }
        break;
      case "natural":
        // Cause naturelle
        wounds.push({
          type: "natural",
          location: "multiple",
          severity: 0,
          description: `Cause naturelle: ${["crise cardiaque", "AVC", "maladie terminale", "arrêt respiratoire"].random()}`,
          timeOfInjury: Date.now() - Math.random() * 86400000, // 0-24h avant
        });
        break;
      default:
        // Cause inconnue
        wounds.push({
          type: "unknown",
          location: "multiple",
          severity: 0,
          description: "Cause du décès indéterminée",
        });
    }
    
    return wounds;
  }

  /**
   * Génère des vêtements aléatoires
   */
  private generateRandomClothing(): string[] {
    const clothingTypes = [
      { type: "t-shirt", colors: ["noir", "blanc", "bleu", "rouge", "vert", "gris", "marron"] },
      { type: "chemise", colors: ["blanc", "bleu", "rose", "jaune"] },
      { type: "chandail", colors: ["noir", "gris", "bleu", "marron"] },
      { type: "veste", colors: ["noir", "marron", "vert", "bleu"] },
      { type: "manteau", colors: ["noir", "marron", "bleu", "gris"] },
      { type: "pantalon", colors: ["noir", "bleu", "gris", "kaki"] },
      { type: "jeans", colors: ["bleu", "noir", "gris"] },
      { type: "short", colors: ["noir", "bleu", "gris", "kaki"] },
      { type: "jupe", colors: ["noir", "bleu", "rouge", "vert"] },
      { type: "robe", colors: ["noir", "bleu", "rouge", "vert", "rose"] },
      { type: "souliers", colors: ["noir", "marron", "beige"] },
      { type: "bottes", colors: ["noir", "marron"] },
      { type: "espadrilles", colors: ["blanc", "noir", "bleu", "rouge"] },
      { type: "tuque", colors: ["noir", "marron", "bleu", "rouge", "vert"] },
      { type: "casquette", colors: ["noir", "bleu", "rouge", "vert"] },
    ];
    
    const numItems = 3 + Math.floor(Math.random() * 5); // 3-7 vêtements
    const clothing: string[] = [];
    
    for (let i = 0; i < numItems; i++) {
      const type = clothingTypes.random();
      const color = type.colors.random();
      clothing.push(`${color}_${type.type}`);
    }
    
    return clothing;
  }

  /**
   * Génère des effets personnels aléatoires
   */
  private generateRandomPersonalEffects(): string[] {
    const effects = [
      "portefeuille", "téléphone", "clés", "monnaie", "carte_d'identité",
      "montres", "bague", "collier", "boucles_d'oreilles", "lunettes",
      "couteau", "arme", "drogue", "médicaments", "lettre", "photo",
      "cigarette", "allumettes", "briquet", "mouchoir", "stylo",
      "carte_de_crédit", "papiers", "journal", "livre", "clés_de_voiture",
      "bijoux", "montre_de_luxe", "chaîne_en_or", "médaille"
    ];
    
    const numEffects = Math.floor(Math.random() * 4); // 0-3 objets
    const personalEffects: string[] = [];
    
    for (let i = 0; i < numEffects; i++) {
      personalEffects.push(effects.random());
    }
    
    return personalEffects;
  }

  // ==========================================
  // 📥 CHARGEMENT DES MODÈLES 3D
  // ==========================================

  /**
   * Charge le modèle 3D d'un cadavre
   */
  private async loadCorpseModel(corpse: Corpse): Promise<void> {
    if (!this.scene) return;
    
    try {
      const group = new THREE.Group();
      group.name = `corpse_${corpse.id}`;
      group.position.copy(corpse.position);
      group.rotation.copy(corpse.rotation);
      group.userData = { type: "corpse", corpseId: corpse.id };
      
      // Ajouter un dummy temporaire
      group.add(this.createDummy(corpse.pose));
      
      // Charger le modèle FBX
      await this.loadPoseModel(corpse.pose, group);
      
      // Ajouter à la scène
      this.scene.add(group);
      
      // Stocker la référence dans le cadavre
      corpse.userData = { group };
    } catch (error) {
      console.error(`[CorpseManager] Erreur de chargement du cadavre ${corpse.id}:`, error);
    }
  }

  /**
   * Crée un dummy temporaire pour un cadavre
   */
  private createDummy(pose: DeadPoseId): THREE.Group {
    const g = new THREE.Group();
    g.name = "corpse-dummy";
    
    const isSit = pose.startsWith("sit");
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(isSit ? 0.38 : 0.42, isSit ? 0.55 : 0.22, isSit ? 0.22 : 1.55),
      CLOTH_BASE
    );
    torso.castShadow = true;
    torso.receiveShadow = true;
    
    if (isSit) {
      torso.position.set(0, 0.55, 0.02);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), SKIN_BASE);
      head.position.set(0.04, 0.96, 0.02);
      head.castShadow = true;
      g.add(torso, head);
      
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.55), CLOTH_BASE);
      leg.position.set(0.08, 0.14, 0.32);
      g.add(leg);
    } else {
      torso.position.set(0, 0.12, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), SKIN_BASE);
      head.position.set(0, 0.14, 0.82);
      g.add(torso, head);
    }
    
    return g;
  }

  /**
   * Charge un modèle de pose FBX
   */
  private async loadPoseModel(pose: DeadPoseId, parent: THREE.Group): Promise<void> {
    const hit = this.poseCache.get(pose);
    if (hit) {
      const clone = hit.clone(true);
      const dummy = parent.getObjectByName("corpse-dummy");
      if (dummy) parent.remove(dummy);
      parent.add(clone);
      this.fitPose(clone, pose.startsWith("sit"));
      return;
    }

    const inflight = this.pendingLoads.get(pose);
    if (inflight) {
      const model = await inflight;
      const clone = model.clone(true);
      const dummy = parent.getObjectByName("corpse-dummy");
      if (dummy) parent.remove(dummy);
      parent.add(clone);
      this.fitPose(clone, pose.startsWith("sit"));
      return;
    }

    const job = new FBXLoader()
      .loadAsync(`/models/dead/${pose}.fbx`)
      .then((obj) => {
        this.freezeClip(obj);
        this.restyle(obj, corpse);
        const wrap = new THREE.Group();
        wrap.name = `dead-src:${pose}`;
        wrap.add(obj);
        this.fitPose(wrap, pose.startsWith("sit"));
        this.poseCache.set(pose, wrap);
        this.pendingLoads.delete(pose);
        
        // Remplacer le dummy
        const dummy = parent.getObjectByName("corpse-dummy");
        if (dummy) parent.remove(dummy);
        const clone = wrap.clone(true);
        parent.add(clone);
        
        return wrap;
      })
      .catch((err) => {
        this.pendingLoads.delete(pose);
        console.error(`[CorpseManager] Erreur de chargement de la pose ${pose}:`, err);
        throw err;
      });

    this.pendingLoads.set(pose, job);
    await job;
  }

  /**
   * Gèle l'animation du modèle FBX
   */
  private freezeClip(obj: THREE.Group): void {
    const clips = obj.animations ?? [];
    if (!clips.length) return;
    
    const mixer = new THREE.AnimationMixer(obj);
    const action = mixer.clipAction(clips[0]!);
    action.play();
    action.paused = true;
    action.time = clips[0]!.duration;
    mixer.update(0);
  }

  /**
   * Applique les matériaux aux parties du corps
   */
  private restyle(root: THREE.Object3D, corpse?: Corpse): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const name = (mesh.name || "").toLowerCase();
      
      // Déterminer le matériau selon la partie du corps et l'état
      if (name.includes("head") || name.includes("face") || name.includes("skin")) {
        // Peau
        if (corpse && corpse.decompositionState !== "fresh") {
          // Appliquer une couleur selon l'état de décomposition
          const color = this.getSkinColor(corpse.decompositionState);
          mesh.material = new THREE.MeshLambertMaterial({ 
            color, 
            flatShading: false 
          });
        } else {
          mesh.material = SKIN_BASE;
        }
      } else if (name.includes("blood") || name.includes("wound")) {
        // Sang ou blessure
        mesh.material = BLOOD_FRESH;
      } else {
        // Vêtements
        if (corpse && corpse.clothing && corpse.clothing.length > 0) {
          // Appliquer une couleur aléatoire parmi les vêtements
          const colorIndex = Math.floor(Math.random() * corpse.clothing.length);
          const colorName = corpse.clothing[colorIndex].split("_")[0];
          const color = this.getColorFromName(colorName);
          mesh.material = new THREE.MeshLambertMaterial({ 
            color, 
            flatShading: false 
          });
        } else {
          mesh.material = CLOTH_BASE;
        }
      }
    });
  }

  /**
   * Récupère la couleur de la peau selon l'état de décomposition
   */
  private getSkinColor(state: DecompositionState): number {
    const colors: Record<DecompositionState, number> = {
      fresh: 0xb89a7a,      // Peau normale
      early: 0xc8b8a8,      // Légère pâleur
      bloat: 0xa8c8a0,      // Verdâtre
      active_decay: 0x88a880, // Vert décomposition
      advanced_decay: 0x688860, // Vert foncé
      skeletal: 0x888888,   // Grisâtre
      skeleton: 0xf0e8d8,   // Couleur des os
    };
    return colors[state] || 0xb89a7a;
  }

  /**
   * Convertit un nom de couleur en valeur hexadécimale
   */
  private getColorFromName(colorName: string): number {
    const colors: Record<string, number> = {
      noir: 0x1a1a1a,
      blanc: 0xf8f8f8,
      bleu: 0x2a4a78,
      rouge: 0x7a2828,
      vert: 0x2a5a28,
      gris: 0x4a4a4a,
      marron: 0x5a3828,
      kaki: 0x5a5a38,
      rose: 0xc8a0a0,
      jaune: 0xc8a048,
    };
    return colors[colorName] || 0x4a4a4a;
  }

  /**
   * Ajuste la taille et la position du modèle
   */
  private fitPose(root: THREE.Object3D, sit: boolean): void {
    this.tempBox.setFromObject(root);
    this.tempBox.getSize(this.tempSize);
    
    const target = sit ? 1.12 : 1.72;
    const dim = sit 
      ? Math.max(this.tempSize.y, 0.4)
      : Math.max(this.tempSize.x, this.tempSize.z, 0.4);
    
    root.scale.multiplyScalar(target / dim);
    
    this.tempBox.setFromObject(root);
    root.position.x -= (this.tempBox.min.x + this.tempBox.max.x) / 2;
    root.position.z -= (this.tempBox.min.z + this.tempBox.max.z) / 2;
    root.position.y -= this.tempBox.min.y;
  }

  // ==========================================
  // 🩸 GESTION DES EFFETS VISUELS
  // ==========================================

  /**
   * Crée des flaques de sang autour du cadavre
   */
  private createBloodPools(corpse: Corpse): void {
    if (!this.scene) return;
    
    // Créer 1-4 flaques de sang
    const numPools = 1 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numPools; i++) {
      const poolId = `blood_pool_${corpse.id}_${i}`;
      const size = 0.3 + Math.random() * 0.7; // 0.3-1.0m de diamètre
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.2 + Math.random() * 1.2; // 0.2-1.4m du cadavre
      
      const x = corpse.position.x + Math.cos(angle) * distance;
      const z = corpse.position.z + Math.sin(angle) * distance;
      
      const pool: BodyFluidPool = {
        id: poolId,
        type: "blood",
        position: new THREE.Vector3(x, 0.01, z),
        size,
        mesh: this.createBloodPoolMesh(x, z, size),
        age: 0,
        dried: false,
      };
      
      this.fluidPools.set(poolId, pool);
      corpse.bloodPools.push(poolId);
      
      if (this.scene) {
        this.scene.add(pool.mesh);
      }
    }
  }

  /**
   * Crée une flaque de sang (mesh)
   */
  private createBloodPoolMesh(x: number, z: number, size: number): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(size, 16);
    const material = BLOOD_FRESH.clone();
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 0.01, z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    
    return mesh;
  }

  /**
   * Crée des traces ADN autour du cadavre
   */
  private createDNATraces(corpse: Corpse): void {
    if (!this.scene) return;
    
    // Créer 2-5 traces ADN (sang, cheveux, etc.)
    const numTraces = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numTraces; i++) {
      const traceId = `dna_trace_${corpse.id}_${i}`;
      const type: DNAType = ["blood", "hair", "skin", "saliva"].random();
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.5 + Math.random() * 2.0; // 0.5-2.5m du cadavre
      
      const x = corpse.position.x + Math.cos(angle) * distance;
      const z = corpse.position.z + Math.sin(angle) * distance;
      
      const trace: DNATrace = {
        id: traceId,
        type,
        position: new THREE.Vector3(x, 0.01, z),
        ownerId: corpse.ownerId,
        collected: false,
      };
      
      // Créer un mesh visible pour les traces de sang
      if (type === "blood") {
        const size = 0.1 + Math.random() * 0.3;
        trace.mesh = this.createBloodPoolMesh(x, z, size);
        if (this.scene) {
          this.scene.add(trace.mesh);
        }
      }
      
      this.dnaTraces.set(traceId, trace);
    }
  }

  // ==========================================
  // 🔄 MISE À JOUR DES CADAVRES
  // ==========================================

  /**
   * Met à jour l'état de décomposition d'un cadavre
   */
  updateDecomposition(corpseId: string, dt: number = 0): void {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) return;

    const now = Date.now();
    const timeSinceDeath = now - corpse.timeOfDeath;
    
    // Déterminer l'état de décomposition
    let newState: DecompositionState = "fresh";
    for (const [state, duration] of Object.entries(DECOMPOSITION_TIMES)) {
      if (timeSinceDeath >= duration) {
        newState = state as DecompositionState;
      } else {
        break;
      }
    }
    
    // Mettre à jour l'état
    if (corpse.decompositionState !== newState) {
      corpse.decompositionState = newState;
      this.updateCorpseVisuals(corpse);
    }
    
    // Mettre à jour la température corporelle
    corpse.bodyTemperature = BODY_TEMPERATURES[corpse.decompositionState];
    
    // Mettre à jour la rigidité cadavérique (6-12h après la mort)
    const hoursSinceDeath = timeSinceDeath / (60 * 60 * 1000);
    corpse.rigorMortis = hoursSinceDeath >= 6 && hoursSinceDeath <= 12;
    
    // Mettre à jour la livor mortis (2-6h après la mort)
    corpse.livorMortis = hoursSinceDeath >= 2 && hoursSinceDeath <= 6;
    
    // Mettre à jour l'intensité des odeurs
    corpse.smellIntensity = SMELL_INTENSITIES[corpse.decompositionState];
    
    // Mettre à jour les flaques de sang (séchage)
    for (const poolId of corpse.bloodPools) {
      const pool = this.fluidPools.get(poolId);
      if (pool) {
        pool.age += dt;
        this.updateFluidPool(pool);
      }
    }
    
    // Ajouter des mouches si nécessaire
    if (FLY_PROBABILITIES[corpse.decompositionState] > 0 && Math.random() < 0.005) {
      this.addFlies(corpse);
    }
    
    // Mettre à jour les traces ADN
    for (const [traceId, trace] of this.dnaTraces) {
      if (traceId.startsWith(`dna_trace_${corpseId}_`)) {
        // Les traces ADN ne changent pas avec le temps
        // Mais on pourrait ajouter des effets de dégradation
      }
    }
  }

  /**
   * Met à jour une flaque de fluide
   */
  private updateFluidPool(pool: BodyFluidPool): void {
    if (!this.scene) return;
    
    const dryTime = FLUID_DRY_TIMES[pool.type];
    const progress = Math.min(1, pool.age / dryTime);
    
    // Mettre à jour la couleur
    if (pool.type === "blood") {
      const colorIndex = Math.min(5, Math.floor(progress * 6));
      if (pool.mesh.material instanceof THREE.MeshLambertMaterial) {
        pool.mesh.material.color.setHex(BLOOD_COLORS[colorIndex]);
      }
    }
    
    // Réduire la taille après séchage
    if (pool.age > dryTime * 0.5) {
      const shrinkFactor = 1 - (pool.age - dryTime * 0.5) / (dryTime * 0.5);
      pool.mesh.scale.set(Math.max(0.1, shrinkFactor), 1, Math.max(0.1, shrinkFactor));
    }
    
    // Marquer comme sèche après le temps de séchage
    if (pool.age >= dryTime) {
      pool.dried = true;
    }
  }

  /**
   * Met à jour les visuels du cadavre selon son état
   */
  private updateCorpseVisuals(corpse: Corpse): void {
    if (!this.scene) return;
    
    const group = this.scene.getObjectByName(`corpse_${corpse.id}`) as THREE.Group;
    if (!group) return;
    
    // Trouver le mesh principal
    const deadRig = group.getObjectByName("dead-rig") as THREE.Group;
    if (!deadRig) return;
    
    // Appliquer les effets visuels selon l'état
    this.restyle(deadRig, corpse);
    
    // Ajouter des effets spéciaux pour les états avancés
    if (corpse.decompositionState === "active_decay" || 
        corpse.decompositionState === "advanced_decay") {
      this.addDecayEffects(deadRig);
    }
    
    if (corpse.decompositionState === "skeletal" || 
        corpse.decompositionState === "skeleton") {
      this.addSkeletalEffects(deadRig);
    }
  }

  /**
   * Ajoute des effets de décomposition (vers, mouches)
   */
  private addDecayEffects(parent: THREE.Group): void {
    // Ajouter des vers (simplifié)
    if (Math.random() < 0.3) {
      const worm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.05, 8),
        new THREE.MeshLambertMaterial({ color: 0x8a6a48 })
      );
      worm.position.set(
        (Math.random() - 0.5) * 0.5,
        0.1 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.5
      );
      parent.add(worm);
    }
  }

  /**
   * Ajoute des effets squelettiques
   */
  private addSkeletalEffects(parent: THREE.Group): void {
    // Remplacer certaines parties par des os
    // (À implémenter avec des modèles squelettiques)
  }

  // ==========================================
  // 🪰 GESTION DES MOUCHES
  // ==========================================

  /**
   * Ajoute des mouches autour du cadavre
   */
  private addFlies(corpse: Corpse): void {
    if (!this.scene) return;
    
    const group = this.scene.getObjectByName(`corpse_${corpse.id}`) as THREE.Group;
    if (!group) return;
    
    // Vérifier si des mouches existent déjà
    let fliesGroup = group.getObjectByName(`flies_${corpse.id}`) as THREE.Group;
    
    if (!fliesGroup) {
      fliesGroup = new THREE.Group();
      fliesGroup.name = `flies_${corpse.id}`;
      group.add(fliesGroup);
    }
    
    // Ajouter de nouvelles mouches (2-5)
    const numNewFlies = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numNewFlies; i++) {
      const fly = this.createFly();
      fly.position.set(
        (Math.random() - 0.5) * 2,
        0.1 + Math.random() * 0.5,
        (Math.random() - 0.5) * 2
      );
      fliesGroup.add(fly);
    }
    
    // Animer les mouches
    this.animateFlies(fliesGroup, corpse);
  }

  /**
   * Crée une mouche (mesh simplifiée)
   */
  private createFly(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.015, 8, 8);
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x282828,
      flatShading: false 
    });
    const fly = new THREE.Mesh(geometry, material);
    fly.castShadow = true;
    return fly;
  }

  /**
   * Anime les mouches
   */
  private animateFlies(fliesGroup: THREE.Group, corpse: Corpse): void {
    if (!this.scene) return;
    
    const corpseGroup = this.scene.getObjectByName(`corpse_${corpse.id}`) as THREE.Group;
    if (!corpseGroup) return;
    
    // Animation basique avec des trajectoires aléatoires
    const animate = () => {
      if (!this.scene) return;
      
      fliesGroup.children.forEach((fly) => {
        // Mouvement aléatoire
        fly.position.x += (Math.random() - 0.5) * 0.05;
        fly.position.y += (Math.random() - 0.5) * 0.05;
        fly.position.z += (Math.random() - 0.5) * 0.05;
        
        // Limiter la distance du cadavre
        const dx = fly.position.x - corpseGroup.position.x;
        const dy = fly.position.y - corpseGroup.position.y;
        const dz = fly.position.z - corpseGroup.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance > 2.5) {
          // Repositionner la mouche près du cadavre
          fly.position.x = corpseGroup.position.x + (Math.random() - 0.5) * 2;
          fly.position.y = corpseGroup.position.y + 0.1 + Math.random() * 0.5;
          fly.position.z = corpseGroup.position.z + (Math.random() - 0.5) * 2;
        }
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  // ==========================================
  // 🔗 INTÉGRATION AVEC LE SYSTÈME DE CRIME
  // ==========================================

  /**
   * Lier un cadavre à un crime
   */
  private linkToCrime(corpseId: string, crimeId: string): void {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) return;
    
    corpse.crimeId = crimeId;
    
    // Mettre à jour le crime avec l'ID du cadavre
    const crime = getCrimeById(crimeId);
    if (crime) {
      crime.corpses = crime.corpses || [];
      if (!crime.corpses.includes(corpseId)) {
        crime.corpses.push(corpseId);
      }
      
      // Si le crime est un meurtre, ajouter des points de wanted au coupable
      if (crime.type === "murder" && crime.suspectId) {
        addWantedPoints(crime.suspectId, 100, `Meurtre: ${crime.description}`);
      }
    }
  }

  /**
   * Récupère les crimes liés à un cadavre
   */
  getCrimesForCorpse(corpseId: string): Crime[] {
    const corpse = this.corpses.get(corpseId);
    if (!corpse || !corpse.crimeId) return [];
    
    const crime = getCrimeById(corpse.crimeId);
    return crime ? [crime] : [];
  }

  // ==========================================
  // 🕵️‍♂️ SYSTÈME D'ENQUÊTE
  // ==========================================

  /**
   * Découvre un cadavre
   * @param corpseId - ID du cadavre
   * @param discovererId - ID du découvreur (joueur ou PNJ)
   * @returns true si la découverte a réussi
   */
  discoverCorpse(corpseId: string, discovererId: string): boolean {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) return false;
    
    if (corpse.discovered) {
      console.log(`[CorpseManager] Le cadavre ${corpseId} a déjà été découvert.`);
      return false;
    }
    
    corpse.discovered = true;
    corpse.discoveredBy = discovererId;
    corpse.discoveryTime = Date.now();
    
    // Créer un rapport de scène de crime
    this.createCrimeSceneReport(corpse, discovererId);
    
    // Si le découvreur est un joueur, vérifier s'il est impliqué dans un crime
    if (discovererId.startsWith("player_") && corpse.crimeId) {
      const crime = getCrimeById(corpse.crimeId);
      if (crime && crime.suspectId === discovererId) {
        // Le joueur a découvert un cadavre lié à son propre crime
        // Ajouter des points de wanted
        addWantedPoints(discovererId, 50, `Découverte d'un cadavre lié à un crime`);
      }
    }
    
    // Si le découvreur est une patrouille SQ, déclencher une enquête
    if (discovererId === "patrouille_sq" || discovererId.includes("sq_")) {
      this.startInvestigation(corpseId);
    }
    
    console.log(`[CorpseManager] Cadavre ${corpseId} découvert par ${discovererId}.`);
    return true;
  }

  /**
   * Crée un rapport de scène de crime
   */
  private createCrimeSceneReport(corpse: Corpse, discovererId: string): string {
    const reportId = `crime_scene_${++this.lastReportId}_${Date.now()}`;
    
    const report: CrimeSceneReport = {
      id: reportId,
      location: { 
        x: corpse.position.x, 
        y: corpse.position.y, 
        z: corpse.position.z 
      },
      timeDiscovered: Date.now(),
      discoveredBy: discovererId,
      corpses: [corpse.id],
      evidence: corpse.personalEffects || [],
      photos: [],
      notes: this.generateCrimeSceneNotes(corpse),
      status: "open",
    };
    
    this.crimeSceneReports.set(reportId, report);
    
    // Assigner à un détective si disponible
    this.assignDetective(reportId);
    
    return reportId;
  }

  /**
   * Génère des notes pour la scène de crime
   */
  private generateCrimeSceneNotes(corpse: Corpse): string {
    const notes: string[] = [];
    
    // Position
    notes.push(`Scène de crime découverte à (${corpse.position.x.toFixed(2)}, ${corpse.position.z.toFixed(2)}).`);
    
    // État du cadavre
    notes.push(`Cadavre en état de ${corpse.decompositionState.replace("_", " ")}.`);
    notes.push(`Température corporelle: ${corpse.bodyTemperature}°C.`);
    notes.push(`Rigidité cadavérique: ${corpse.rigorMortis ? "présente" : "absente"}.`);
    notes.push(`Livor mortis: ${corpse.livorMortis ? "présent" : "absent"}.`);
    
    // Pose
    notes.push(`Pose: ${corpse.pose}.`);
    
    // Vêtements
    if (corpse.clothing && corpse.clothing.length > 0) {
      notes.push(`Vêtements: ${corpse.clothing.join(", ")}.`);
    }
    
    // Effets personnels
    if (corpse.personalEffects && corpse.personalEffects.length > 0) {
      notes.push(`Effets personnels: ${corpse.personalEffects.join(", ")}.`);
    }
    
    // Blessures visibles
    if (corpse.wounds.length > 0) {
      notes.push("Blessures visibles:");
      for (const wound of corpse.wounds) {
        notes.push(`  - ${wound.type} à ${wound.location}: ${wound.description}`);
      }
    }
    
    // Flaques de sang
    if (corpse.bloodPools.length > 0) {
      notes.push(`Flaques de sang: ${corpse.bloodPools.length} flaques visibles.`);
    }
    
    return notes.join("\n");
  }

  /**
   * Assigne un détective à une enquête
   */
  private assignDetective(reportId: string): void {
    // Dans un vrai jeu, on choisirait un détective disponible
    // Pour l'instant, on assignera un détective aléatoire
    const detectives = ["detective_1", "detective_2", "detective_3"];
    const detective = detectives.random();
    
    const report = this.crimeSceneReports.get(reportId);
    if (report) {
      report.assignedTo = detective;
      report.status = "investigating";
    }
  }

  /**
   * Débute une enquête sur un cadavre
   */
  startInvestigation(corpseId: string): void {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) return;
    
    // Marquer comme étant enquêté
    corpse.investigated = true;
    
    // Trouver le rapport de scène de crime
    for (const report of this.crimeSceneReports.values()) {
      if (report.corpses.includes(corpseId)) {
        report.status = "investigating";
        break;
      }
    }
    
    console.log(`[CorpseManager] Enquête débutée pour le cadavre ${corpseId}.`);
  }

  /**
   * Enquête sur un cadavre
   */
  investigateCorpse(corpseId: string, investigatorId: string): boolean {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) return false;
    
    if (!corpse.discovered) {
      console.log(`[CorpseManager] Le cadavre ${corpseId} n'a pas encore été découvert.`);
      return false;
    }
    
    if (corpse.investigated) {
      console.log(`[CorpseManager] Le cadavre ${corpseId} a déjà été enquêté.`);
      return false;
    }
    
    corpse.investigated = true;
    
    // Trouver le rapport de scène de crime et le mettre à jour
    for (const report of this.crimeSceneReports.values()) {
      if (report.corpses.includes(corpseId)) {
        report.status = "investigating";
        report.notes += `\n\nEnquête menée par ${investigatorId} à ${new Date().toLocaleString('fr-CA')}.`;
        break;
      }
    }
    
    // Si le cadavre est lié à un crime, mettre à jour le crime
    if (corpse.crimeId) {
      const crime = getCrimeById(corpse.crimeId);
      if (crime) {
        crime.investigated = true;
        crime.investigator = investigatorId;
      }
    }
    
    console.log(`[CorpseManager] Cadavre ${corpseId} enquêté par ${investigatorId}.`);
    return true;
  }

  /**
   * Effectue une autopsie sur un cadavre
   */
  performAutopsy(corpseId: string, coronerId: string): AutopsyReport | null {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) return null;
    
    if (!corpse.discovered) {
      console.log(`[CorpseManager] Le cadavre ${corpseId} n'a pas été découvert.`);
      return null;
    }
    
    if (corpse.autopsied) {
      console.log(`[CorpseManager] Le cadavre ${corpseId} a déjà été autopsié.`);
      return null;
    }
    
    corpse.autopsied = true;
    
    // Générer un rapport d'autopsie
    const report: AutopsyReport = {
      corpseId,
      performedBy: coronerId,
      timePerformed: Date.now(),
      estimatedTimeOfDeath: this.estimateTimeOfDeath(corpse),
      causeOfDeath: corpse.causeOfDeath,
      mannerOfDeath: this.determineMannerOfDeath(corpse),
      wounds: corpse.wounds,
      toxicology: {
        alcohol: Math.random() * 0.8,
        drugs: [],
        poisons: [],
      },
      stomachContents: this.generateStomachContents(),
      notes: this.generateAutopsyNotes(corpse),
      conclusion: this.generateAutopsyConclusion(corpse),
    };
    
    // Ajouter des drogues ou poisons aléatoires si la cause est liée
    if (corpse.causeOfDeath === "poison" || corpse.causeOfDeath === "drug") {
      const substances = ["cocaïne", "héroïne", "méthamphétamine", "cyanure", "arsenic", "monoxyde_de_carbone", "ricin", "strychnine"];
      const numSubstances = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numSubstances; i++) {
        const substance = substances.random();
        if (Math.random() > 0.5) {
          report.toxicology.drugs.push(substance);
        } else {
          report.toxicology.poisons.push(substance);
        }
      }
    }
    
    // Si le cadavre a des blessures par balle, vérifier les résidus de poudre
    if (corpse.wounds.some(w => w.type === "gunshot")) {
      report.toxicology.drugs.push("résidus_de_poudre");
    }
    
    this.autopsyReports.set(report.id, report);
    
    // Mettre à jour le rapport de scène de crime
    for (const crimeReport of this.crimeSceneReports.values()) {
      if (crimeReport.corpses.includes(corpseId)) {
        crimeReport.notes += `\n\nAutopsie effectuée par ${coronerId}. Cause du décès: ${report.conclusion}`;
        crimeReport.status = "investigating";
        break;
      }
    }
    
    console.log(`[CorpseManager] Autopsie effectuée sur le cadavre ${corpseId} par ${coronerId}.`);
    return report;
  }

  /**
   * Estime l'heure du décès
   */
  private estimateTimeOfDeath(corpse: Corpse): number {
    const now = Date.now();
    const hoursSinceDeath = (now - corpse.timeOfDeath) / (60 * 60 * 1000);
    
    // Méthode 1: Température corporelle (règle de Glaister)
    // La température baisse d'environ 1.5°C par heure
    const tempDiff = 37 - corpse.bodyTemperature;
    const tempHours = tempDiff / 1.5;
    
    // Méthode 2: Rigidité cadavérique (6-12h après la mort)
    let rigorHours = -1;
    if (corpse.rigorMortis) {
      rigorHours = 6 + Math.random() * 6; // 6-12h
    }
    
    // Méthode 3: Livor mortis (2-6h après la mort)
    let livorHours = -1;
    if (corpse.livorMortis) {
      livorHours = 2 + Math.random() * 4; // 2-6h
    }
    
    // Méthode 4: État de décomposition
    const stateIndex = Object.keys(DECOMPOSITION_TIMES).indexOf(corpse.decompositionState);
    let decompositionHours = -1;
    if (stateIndex > 0) {
      const prevState = Object.keys(DECOMPOSITION_TIMES)[stateIndex - 1] as DecompositionState;
      const nextState = Object.keys(DECOMPOSITION_TIMES)[stateIndex] as DecompositionState;
      const prevTime = DECOMPOSITION_TIMES[prevState];
      const nextTime = DECOMPOSITION_TIMES[nextState];
      const progress = (now - corpse.timeOfDeath - prevTime) / (nextTime - prevTime);
      decompositionHours = prevTime / (60 * 60 * 1000) + progress * (nextTime - prevTime) / (60 * 60 * 1000);
    }
    
    // Utiliser la méthode la plus précise disponible
    const estimates = [
      tempHours,
      rigorHours,
      livorHours,
      decompositionHours,
    ].filter(h => h >= 0);
    
    if (estimates.length > 0) {
      // Moyenne des estimations
      const avgHours = estimates.reduce((a, b) => a + b, 0) / estimates.length;
      return now - avgHours * 60 * 60 * 1000;
    }
    
    return corpse.timeOfDeath; // Retourner l'heure réelle si aucune estimation n'est possible
  }

  /**
   * Détermine la manière du décès (naturelle, accidentelle, suicide, homicide)
   */
  private determineMannerOfDeath(corpse: Corpse): AutopsyReport["mannerOfDeath"] {
    if (corpse.causeOfDeath === "natural") {
      return "natural";
    }
    
    if (corpse.causeOfDeath === "poison" && Math.random() > 0.5) {
      return "suicide";
    }
    
    if (corpse.causeOfDeath === "gunshot" || 
        corpse.causeOfDeath === "stab" || 
        corpse.causeOfDeath === "blunt" ||
        corpse.causeOfDeath === "slash" ||
        corpse.causeOfDeath === "strangulation") {
      return "homicide";
    }
    
    if (corpse.causeOfDeath === "drown" || 
        corpse.causeOfDeath === "fall" ||
        corpse.causeOfDeath === "burn") {
      return Math.random() > 0.3 ? "accidental" : "homicide";
    }
    
    return "undetermined";
  }

  /**
   * Génère le contenu de l'estomac
   */
  private generateStomachContents(): string[] {
    const contents: string[] = [];
    const lastMealTime = Math.random() * 24; // 0-24h avant le décès
    
    if (lastMealTime < 4) {
      contents.push("estomac vide");
    } else if (lastMealTime < 8) {
      contents.push("résidus de petit-déjeuner");
    } else if (lastMealTime < 12) {
      contents.push("déjeuner partiellement digéré");
    } else if (lastMealTime < 16) {
      contents.push("déjeuner digéré");
    } else if (lastMealTime < 20) {
      contents.push("dîner partiellement digéré");
    } else {
      contents.push("dîner digéré");
    }
    
    // Ajouter des substances suspectes
    if (Math.random() > 0.7) {
      const substances = ["alcool", "médicaments", "drogues", "poison"];
      if (Math.random() > 0.5) {
        contents.push(substances.random());
      }
    }
    
    return contents;
  }

  /**
   * Génère des notes pour l'autopsie
   */
  private generateAutopsyNotes(corpse: Corpse): string {
    const notes: string[] = [];
    
    // Informations de base
    const age = 20 + Math.floor(Math.random() * 60);
    const gender = Math.random() > 0.5 ? "homme" : "femme";
    notes.push(`=== RAPPORT D'AUTOPSIE ===`);
    notes.push(`Victime: ${gender}, environ ${age} ans`);
    notes.push(`ID du cadavre: ${corpse.id}`);
    notes.push(`Heure estimée du décès: ${new Date(corpse.timeOfDeath).toLocaleString('fr-CA')}`);
    notes.push("");
    
    // État général
    notes.push(`État général: ${corpse.decompositionState.replace("_", " ")}`);
    notes.push(`Température corporelle: ${corpse.bodyTemperature}°C`);
    notes.push(`Rigidité cadavérique: ${corpse.rigorMortis ? "présente" : "absente"}`);
    notes.push(`Livor mortis: ${corpse.livorMortis ? "présent" : "absent"}`);
    notes.push("");
    
    // Blessures
    if (corpse.wounds.length > 0) {
      notes.push("Blessures:");
      for (const wound of corpse.wounds) {
        notes.push(`  - ${wound.type} à ${wound.location}: ${wound.description} (sévérité: ${wound.severity}%)`);
      }
    }
    
    // Toxicologie
    notes.push("");
    notes.push("Toxicologie:");
    notes.push(`  - Alcoolémie: ${(corpse.toxicology?.alcohol || 0) * 100}‰`);
    if (corpse.toxicology?.drugs?.length) {
      notes.push(`  - Drogues détectées: ${corpse.toxicology.drugs.join(", ")}`);
    }
    if (corpse.toxicology?.poisons?.length) {
      notes.push(`  - Poisons détectés: ${corpse.toxicology.poisons.join(", ")}`);
    }
    
    // Contenu de l'estomac
    notes.push("");
    notes.push("Contenu de l'estomac:");
    notes.push(`  - ${corpse.stomachContents?.join(", ") || "aucune information"}`);
    
    return notes.join("\n");
  }

  /**
   * Génère une conclusion pour l'autopsie
   */
  private generateAutopsyConclusion(corpse: Corpse): string {
    const cause = corpse.causeOfDeath;
    const manner = this.determineMannerOfDeath(corpse);
    
    switch (cause) {
      case "gunshot":
        return `Décès par hémorragie massive suite à une ou plusieurs blessures par balle. ${manner === "homicide" ? "Cause: homicide." : "Cause probable: accident."}`;
      case "stab":
        return `Décès par hémorragie interne suite à une ou plusieurs blessures par arme blanche. Cause: homicide.`;
      case "blunt":
        return `Décès par traumatisme crânien ou interne suite à un coup violent. ${manner === "homicide" ? "Cause: homicide." : "Cause probable: accident."}`;
      case "slash":
        return `Décès par sectionnement de l'artère carotide ou autre artère majeure. Cause: homicide.`;
      case "burn":
        return `Décès par brûlures au troisième degré couvrant plus de 60% du corps. ${manner === "homicide" ? "Cause: homicide." : "Cause probable: accident."}`;
      case "drown":
        return `Décès par noyade. Eau trouvée dans les poumons. ${manner === "homicide" ? "Cause: homicide." : "Cause probable: accident."}`;
      case "poison":
        return `Décès par intoxication aiguë. Substance toxique détectée dans le sang. ${manner === "suicide" ? "Cause: suicide." : "Cause probable: homicide."}`;
      case "strangulation":
        return `Décès par asphyxie suite à un étranglement. Cause: homicide.`;
      case "fall":
        return `Décès par traumatismes multiples suite à une chute de grande hauteur. ${manner === "homicide" ? "Cause: homicide." : "Cause probable: accident."}`;
      case "natural":
        return `Décès par cause naturelle. Aucune blessure externe détectée.`;
      default:
        return `Cause du décès indéterminée. Investigation supplémentaire requise.`;
    }
  }

  // ==========================================
  // 🔍 FONCTIONS DE RECHERCHE
  // ==========================================

  /**
   * Récupère un cadavre par son ID
   */
  getCorpse(corpseId: string): Corpse | undefined {
    return this.corpses.get(corpseId);
  }

  /**
   * Récupère tous les cadavres
   */
  getAllCorpses(): Corpse[] {
    return [...this.corpses.values()];
  }

  /**
   * Récupère les cadavres dans une zone spécifique
   */
  getCorpsesInArea(x: number, z: number, radius: number = 50): Corpse[] {
    const corpses: Corpse[] = [];
    
    for (const corpse of this.corpses.values()) {
      const dx = corpse.position.x - x;
      const dz = corpse.position.z - z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance <= radius) {
        corpses.push(corpse);
      }
    }
    
    return corpses;
  }

  /**
   * Récupère les cadavres non découverts
   */
  getUndiscoveredCorpses(): Corpse[] {
    return [...this.corpses.values()].filter((corpse) => !corpse.discovered);
  }

  /**
   * Récupère les cadavres découverts mais non enquêtés
   */
  getDiscoveredUninvestigatedCorpses(): Corpse[] {
    return [...this.corpses.values()].filter(
      (corpse) => corpse.discovered && !corpse.investigated
    );
  }

  /**
   * Récupère les cadavres non autopsiés
   */
  getUnautopsiedCorpses(): Corpse[] {
    return [...this.corpses.values()].filter(
      (corpse) => corpse.discovered && !corpse.autopsied
    );
  }

  /**
   * Récupère les cadavres liés à un crime spécifique
   */
  getCorpsesForCrime(crimeId: string): Corpse[] {
    return [...this.corpses.values()].filter(
      (corpse) => corpse.crimeId === crimeId
    );
  }

  /**
   * Récupère un rapport d'autopsie
   */
  getAutopsyReport(corpseId: string): AutopsyReport | undefined {
    for (const report of this.autopsyReports.values()) {
      if (report.corpsId === corpseId) {
        return report;
      }
    }
    return undefined;
  }

  /**
   * Récupère un rapport de scène de crime
   */
  getCrimeSceneReport(reportId: string): CrimeSceneReport | undefined {
    return this.crimeSceneReports.get(reportId);
  }

  /**
   * Récupère toutes les traces ADN
   */
  getAllDNATraces(): DNATrace[] {
    return [...this.dnaTraces.values()];
  }

  /**
   * Récupère les traces ADN pour un cadavre
   */
  getDNATracesForCorpse(corpseId: string): DNATrace[] {
    return [...this.dnaTraces.values()].filter(
      (trace) => trace.id.startsWith(`dna_trace_${corpseId}_`)
    );
  }

  /**
   * Récupère les traces ADN non collectées
   */
  getUncollectedDNATraces(): DNATrace[] {
    return [...this.dnaTraces.values()].filter(
      (trace) => !trace.collected
    );
  }

  /**
   * Collecte une trace ADN
   */
  collectDNATrace(traceId: string, collectorId: string): boolean {
    const trace = this.dnaTraces.get(traceId);
    if (!trace) return false;
    
    if (trace.collected) {
      console.log(`[CorpseManager] La trace ${traceId} a déjà été collectée.`);
      return false;
    }
    
    trace.collected = true;
    trace.collectedBy = collectorId;
    trace.collectedTime = Date.now();
    
    // Si la trace a un mesh visible, le supprimer
    if (trace.mesh && this.scene) {
      this.scene.remove(trace.mesh);
      trace.mesh.geometry.dispose();
      if (trace.mesh.material instanceof THREE.Material) {
        trace.mesh.material.dispose();
      }
      trace.mesh = undefined;
    }
    
    console.log(`[CorpseManager] Trace ADN ${traceId} collectée par ${collectorId}.`);
    return true;
  }

  // ==========================================
  // 🗑 NETTOYAGE
  // ==========================================

  /**
   * Supprime un cadavre
   */
  removeCorpse(corpseId: string): boolean {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) return false;
    
    // Supprimer le modèle 3D
    if (this.scene) {
      const group = this.scene.getObjectByName(`corpse_${corpseId}`);
      if (group) {
        this.scene.remove(group);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (obj.material instanceof THREE.Material) {
              obj.material.dispose();
            }
          }
        });
      }
    }
    
    // Supprimer les flaques de sang
    for (const poolId of corpse.bloodPools) {
      const pool = this.fluidPools.get(poolId);
      if (pool && this.scene) {
        this.scene.remove(pool.mesh);
        pool.mesh.geometry.dispose();
        if (pool.mesh.material instanceof THREE.Material) {
          pool.mesh.material.dispose();
        }
      }
      this.fluidPools.delete(poolId);
    }
    
    // Supprimer les traces ADN
    for (const [traceId, trace] of this.dnaTraces) {
      if (traceId.startsWith(`dna_trace_${corpseId}_`)) {
        if (trace.mesh && this.scene) {
          this.scene.remove(trace.mesh);
          trace.mesh.geometry.dispose();
          if (trace.mesh.material instanceof THREE.Material) {
            trace.mesh.material.dispose();
          }
        }
        this.dnaTraces.delete(traceId);
      }
    }
    
    this.corpses.delete(corpseId);
    return true;
  }

  /**
   * Nettoie tous les cadavres
   */
  clearAllCorpses(): void {
    for (const corpseId of this.corpses.keys()) {
      this.removeCorpse(corpseId);
    }
    this.corpses.clear();
    this.fluidPools.clear();
    this.dnaTraces.clear();
    this.autopsyReports.clear();
    this.crimeSceneReports.clear();
    this.poseCache.clear();
    this.pendingLoads.clear();
  }

  // ==========================================
  // 🔄 MISE À JOUR PÉRIODIQUE
  // ==========================================

  /**
   * Met à jour tous les cadavres (à appeler régulièrement)
   * @param dt - Delta time en ms
   */
  tick(dt: number = 0): void {
    const now = Date.now();
    
    // Mettre à jour la décomposition de tous les cadavres
    for (const corpse of this.corpses.values()) {
      this.updateDecomposition(corpse.id, dt);
      
      // Vérifier si le cadavre doit être découvert automatiquement
      if (!corpse.discovered && Math.random() < 0.0001) {
        // 0.01% de chance par tick de découvrir un cadavre (patrouille, passant, etc.)
        this.discoverCorpse(corpse.id, "patrouille_sq");
      }
    }
    
    // Nettoyer les cadavres trop anciens (plus de 30 jours)
    for (const [corpseId, corpse] of this.corpses) {
      if (now - corpse.timeOfDeath > 30 * 24 * 60 * 60 * 1000) {
        this.removeCorpse(corpseId);
      }
    }
  }

  // ==========================================
  // 💾 SAUVEGARDE & CHARGEMENT
  // ==========================================

  /**
   * Exporte les données pour la sauvegarde
   */
  exportData(): {
    corpses: Array<Omit<Corpse, "position" | "rotation" | "userData"> & {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
    }>;
    autopsyReports: AutopsyReport[];
    crimeSceneReports: CrimeSceneReport[];
    dnaTraces: Array<Omit<DNATrace, "mesh">>;
  } {
    return {
      corpses: [...this.corpses.values()].map((corpse) => ({
        ...corpse,
        position: { x: corpse.position.x, y: corpse.position.y, z: corpse.position.z },
        rotation: { x: corpse.rotation.x, y: corpse.rotation.y, z: corpse.rotation.z },
        userData: undefined,
      })),
      autopsyReports: [...this.autopsyReports.values()],
      crimeSceneReports: [...this.crimeSceneReports.values()],
      dnaTraces: [...this.dnaTraces.values()].map((trace) => ({
        ...trace,
        mesh: undefined,
      })),
    };
  }

  /**
   * Charge les données depuis une sauvegarde
   */
  importData(data: {
    corpses?: Array<Omit<Corpse, "position" | "rotation" | "userData"> & {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
    }>;
    autopsyReports?: AutopsyReport[];
    crimeSceneReports?: CrimeSceneReport[];
    dnaTraces?: Array<Omit<DNATrace, "mesh">>;
  }): void {
    if (data.corpses) {
      for (const corpseData of data.corpses) {
        const corpse: Corpse = {
          ...corpseData,
          position: new THREE.Vector3(
            corpseData.position.x,
            corpseData.position.y || 0,
            corpseData.position.z
          ),
          rotation: new THREE.Euler(
            corpseData.rotation.x,
            corpseData.rotation.y || 0,
            corpseData.rotation.z
          ),
        };
        this.corpses.set(corpse.id, corpse);
        
        // Recharger le modèle 3D si la scène est disponible
        if (this.scene) {
          this.loadCorpseModel(corpse);
        }
        
        // Recharger les flaques de sang
        for (const poolId of corpse.bloodPools) {
          const poolData = data.dnaTraces?.find(t => t.id === poolId);
          if (poolData) {
            const pool: BodyFluidPool = {
              ...poolData as BodyFluidPool,
              position: new THREE.Vector3(poolData.position.x, 0.01, poolData.position.z),
              mesh: this.createBloodPoolMesh(poolData.position.x, poolData.position.z, poolData.size),
            };
            this.fluidPools.set(poolId, pool);
            if (this.scene) {
              this.scene.add(pool.mesh);
            }
          }
        }
      }
    }
    
    if (data.autopsyReports) {
      for (const report of data.autopsyReports) {
        this.autopsyReports.set(report.id, report);
      }
    }
    
    if (data.crimeSceneReports) {
      for (const report of data.crimeSceneReports) {
        this.crimeSceneReports.set(report.id, report);
      }
    }
    
    if (data.dnaTraces) {
      for (const traceData of data.dnaTraces) {
        const trace: DNATrace = {
          ...traceData,
          position: new THREE.Vector3(traceData.position.x, 0.01, traceData.position.z),
        };
        this.dnaTraces.set(trace.id, trace);
        
        // Recharger les mesh visibles pour les traces de sang
        if (trace.type === "blood" && this.scene) {
          trace.mesh = this.createBloodPoolMesh(trace.position.x, trace.position.z, 0.2);
          this.scene.add(trace.mesh);
        }
      }
    }
  }
}

// ==========================================
// 💀 FONCTIONS UTILITAIRES (COMPATIBILITÉ)
// ==========================================

/** Vérifie si une pose est valide */
export function isDeadPose(id: string): id is DeadPoseId {
  return (DEAD_SIT as readonly string[]).includes(id) || (DEAD_LIE as readonly string[]).includes(id);
}

/** Parse une ID de pose de cadavre */
export function parseDeadPose(id: string): DeadPoseId {
  if (id === "corpse_sit" || id === "corpse-sit") return "sit_01";
  if (id === "corpse" || id === "corpse_lie") return "lie_01";
  if (isDeadPose(id)) return id;
  return "lie_01";
}

/**
 * Crée un cadavre avec une pose (version simplifiée pour la compatibilité)
 * @param pose - ID de la pose
 * @returns Groupe Three.js
 */
export function corpseProp(pose: string = "lie_01"): THREE.Group {
  const id = parseDeadPose(pose);
  const corpseId = corpseManager.createCorpse({
    pose: id,
    x: 0,
    z: 0,
    yaw: 0,
  });
  
  const corpse = corpseManager.getCorpse(corpseId);
  if (!corpse) return new THREE.Group();
  
  // Récupérer le groupe du cadavre depuis la scène
  if (corpseManager.scene) {
    const group = corpseManager.scene.getObjectByName(`corpse_${corpseId}`) as THREE.Group;
    if (group) {
      return group;
    }
  }
  
  // Retourner un dummy si le groupe n'est pas trouvé
  return new THREE.Group();
}

/**
 * Récupère les spots de cadavres du comté (version simplifiée)
 */
export function countyBodies(): BodySpot[] {
  return corpseManager.getDefaultBodySpots();
}

// ==========================================
// 🚀 INSTANCE GLOBALE
// ==========================================

// Créer le gestionnaire de cadavres (sera initialisé avec une scène plus tard)
export const corpseManager = new CorpseManager();

// ==========================================
// 🎯 EXPORTS
// ==========================================

export {
  // Types
  DecompositionState,
  WoundType,
  WoundLocation,
  Wound,
  Corpse,
  BodySpot,
  AutopsyReport,
  CrimeSceneReport,
  BodyFluidType,
  BodyFluidPool,
  DNAType,
  DNATrace,
  
  // Constantes
  DEAD_SIT,
  DEAD_LIE,
  DECOMPOSITION_TIMES,
  BODY_TEMPERATURES,
  SMELL_INTENSITIES,
  FLY_PROBABILITIES,
  BLOOD_COLORS,
  FLUID_DRY_TIMES,
  
  // Fonctions
  isDeadPose,
  parseDeadPose,
  corpseProp,
  countyBodies,
  
  // Gestionnaire
  corpseManager,
};