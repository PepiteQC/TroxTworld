const D: any = { clearance: 0.15, wheelR: 0.1, seatW: 1.8 };
/**
 * ═══════════════════════════════════════════════════════════════════
 *  SYSTÈME DE CANAPÉS — ULTIMATE EDITION v2.0
 *  Pour TroxTWorld - Comté de Portneuf
 * ═══════════════════════════════════════════════════════════════════
 *
 * @author xblade benz (TroxTWorld)
 * @description Système complet de canapés avec :
 * - Construction modulaire (siège, dossier, accoudoirs, pieds)
 * - Personnalisation avancée (couleurs, matériaux, tailles)
 * - Animations réalistes (ressorts, coussins, mécanismes)
 * - Intégration physique (collisions, poids, interactions)
 * - Système de dégâts/usure (trous, taches, réparation)
 * - Sons d'interaction (assise, rebond)
 * - Optimisation Zero-GC (cache, InstancedMesh)
 * - Compatibilité avec buildCouch() et tickCouch() existants
 */

import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { playSound } from "./audio3d"; // À adapter selon ton système audio

// ==========================================
// 📌 1. TYPES & CONSTANTES
// ==========================================

/** Types de canapés */
export type CouchType =
  | "standard"      // Canapé 2-3 places standard
  | "loveseat"      // Canapé 2 places
  | "sectional"     // Canapé modulaire en L
  | "chaise"        // Chaise longue
  | "futon"         // Futon japonais
  | "chesterfield"  // Style Chesterfield (boutons capitonnés)
  | "modern"        // Design moderne
  | "vintage"       // Style rétro
  | "gaming"        // Canapé gaming avec supports lombaires
  | "outdoor";      // Canapé d'extérieur (résistant aux intempéries)

/** Matériaux pour les canapés */
export type CouchMaterial =
  | "fabric"        // Tissu standard
  | "leather"       // Cuir
  | "faux_leather"  // Similicuir
  | "velvet"        // Velours
  | "chenille"      // Chenille
  | "microfiber"    // Microfibre
  | "wood"          // Bois (pour les pieds)
  | "metal";        // Métal (pour les pieds)

/** Couleurs de tissu */
export const FABRIC_COLORS: number[] = [
  0x8a4a3a,  // Marron foncé
  0x4a5a6a,  // Bleu gris
  0x6a6a4a,  // Vert olive
  0x7a3a5a,  // Rouge vin
  0x3a5a4a,  // Vert foncé
  0x5a4a4a,  // Gris foncé
  0x8a6a5a,  // Beige
  0x3a4a6a,  // Bleu nuit
  0xa86a4a,  // Orange terre
  0x4a6a5a,  // Vert de grisé
];

/** Couleurs de cuir */
export const LEATHER_COLORS: number[] = [
  0x5a3a28,  // Marron foncé
  0x3a281a,  // Noir
  0x8a6a4a,  // Tan
  0x6a4a3a,  // Rouge foncé
  0x4a5a4a,  // Vert
  0xa88a5a,  // Beige clair
];

/** Couleurs de bois */
export const WOOD_COLORS: number[] = [
  QC_PALETTE.boisNaturel,
  QC_PALETTE.boisClair,
  ((QC_PALETTE as any).boisFonce || 0x3a2010),
  0x5a3a28,  // Chêne foncé
  0x8a6a4a,  // Érable
  0x6a4a3a,  // Cerisier
];

/** Couleurs de métal */
export const METAL_COLORS: number[] = [
  QC_PALETTE.acier,
  ((QC_PALETTE as any).acierBrosse || 0x888888),
  0x8a8e92,  // Aluminium
  0xc8a864,  // Laiton
  0x5a6a78,  // Acier inox
];

/** État du canapé */
export type CouchCondition =
  | "pristine"    // Neuf, sans défaut
  | "good"        // Bon état
  | "used"        // Usé (quelques traces)
  | "worn"        // Très usé (taches, trous)
  | "damaged"     // Endommagé (coussins déchirés, pieds cassés)
  | "broken";      // Brisé (inutilisable)

/** Type de dommage */
export type DamageType =
  | "stain"       // Tache
  | "tear"        // Déchirure
  | "burn"        // Brûlure
  | "scratch"     // Égratignure
  | "dent"        // Bosses
  | "broken_leg"  // Pied cassé
  | "broken_spring" // Ressort cassé
  | "water_damage"; // Dégâts d'eau

/** Dommage sur un canapé */
export interface CouchDamage {
  id: string;
  type: DamageType;
  position: THREE.Vector3; // Position du dommage sur le canapé
  size: number; // Taille (0-1)
  severity: number; // Gravité (0-100)
  age: number; // Âge en ms (pour la réparation naturelle)
  repaired: boolean; // Si le dommage a été réparé
}

/** Interface pour un canapé */
export interface Couch {
  id: string;
  type: CouchType;
  material: CouchMaterial;
  color: number;
  condition: CouchCondition;
  damages: CouchDamage[];
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  mass: number; // Masse en kg
  isOccupied: boolean;
  occupantId?: string; // ID du personnage assis
  comfort: number; // Confort (0-100)
  cleanliness: number; // Propreté (0-100)
  price: number; // Prix d'achat
  maxWeight: number; // Poids maximum supporté
  userData: {
    group?: THREE.Group;
    seat?: THREE.Group;
    back?: THREE.Group;
    arms?: THREE.Group[];
    legs?: THREE.Group[];
    cushions?: THREE.Group[];
    wheels?: THREE.Group[];
    steering?: THREE.Group;
    shake?: THREE.Group;
  };
}

/** Options de construction d'un canapé */
export interface CouchOptions {
  type?: CouchType;
  material?: CouchMaterial;
  colorIndex?: number;
  condition?: CouchCondition;
  damages?: CouchDamage[];
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

/** Dimensions par défaut pour un canapé standard */
const DEFAULT_DIMENSIONS = {
  seatW: 1.85,   // Largeur du siège
  seatD: 0.92,   // Profondeur du siège
  seatH: 0.42,   // Hauteur du siège
  backH: 0.68,   // Hauteur du dossier
  backT: 0.22,   // Épaisseur du dossier
  armW: 0.24,    // Largeur des accoudoirs
  armH: 0.58,    // Hauteur des accoudoirs
  chassisL: 2.35, // Longueur du châssis
  chassisW: 1.55, // Largeur du châssis
  chassisH: 0.16, // Hauteur du châssis
  wheelR: 0.28,   // Rayon des roues
  wheelW: 0.16,   // Épaisseur des roues
  wheelbase: 1.55, // Empattement
  track: 1.35,    // Voie (distance entre les roues)
  clearance: 0.14, // Garde au sol
  legH: 0.2,     // Hauteur des pieds (pour les canapés sans roues)
  legW: 0.08,    // Épaisseur des pieds
};

/** Dimensions par type de canapé */
const COUCH_DIMENSIONS: Record<CouchType, Partial<typeof DEFAULT_DIMENSIONS>> = {
  standard: { seatW: 1.85, seatD: 0.92, backH: 0.68 },
  loveseat: { seatW: 1.4, seatD: 0.8, backH: 0.65 },
  sectional: { seatW: 2.2, seatD: 0.95, backH: 0.7 },
  chaise: { seatW: 1.6, seatD: 1.2, backH: 0.6 },
  futon: { seatW: 1.6, seatD: 1.0, backH: 0.1, seatH: 0.2 },
  chesterfield: { seatW: 2.0, seatD: 0.95, backH: 0.75, backT: 0.25 },
  modern: { seatW: 1.8, seatD: 0.85, backH: 0.55, armH: 0.5 },
  vintage: { seatW: 1.7, seatD: 0.88, backH: 0.72 },
  gaming: { seatW: 2.0, seatD: 1.0, backH: 0.8, armH: 0.6 },
  outdoor: { seatW: 1.8, seatD: 0.9, backH: 0.7 }, // Matériau résistant
};

/** Prix par type de canapé (en $) */
const COUCH_PRICES: Record<CouchType, number> = {
  standard: 800,
  loveseat: 600,
  sectional: 1200,
  chaise: 900,
  futon: 400,
  chesterfield: 1500,
  modern: 1000,
  vintage: 700,
  gaming: 1100,
  outdoor: 950,
};

/** Poids par type de canapé (en kg) */
const COUCH_WEIGHTS: Record<CouchType, number> = {
  standard: 60,
  loveseat: 45,
  sectional: 80,
  chaise: 55,
  futon: 30,
  chesterfield: 75,
  modern: 50,
  vintage: 55,
  gaming: 65,
  outdoor: 60,
};

/** Poids maximum supporté par type (en kg) */
const COUCH_MAX_WEIGHTS: Record<CouchType, number> = {
  standard: 300,
  loveseat: 250,
  sectional: 400,
  chaise: 200,
  futon: 200,
  chesterfield: 350,
  modern: 250,
  vintage: 250,
  gaming: 350,
  outdoor: 300,
};

/** Confort par type (0-100) */
const COUCH_COMFORTS: Record<CouchType, number> = {
  standard: 70,
  loveseat: 75,
  sectional: 85,
  chaise: 80,
  futon: 60,
  chesterfield: 90,
  modern: 75,
  vintage: 65,
  gaming: 95,
  outdoor: 60,
};

// ==========================================
// 🛋 2. CLASSE COUCH (Gestion individuelle des canapés)
// ==========================================

/**
 * Classe représentant un canapé dans le monde
 */
export class Couch {
  // Propriétés
  id: string;
  type: CouchType;
  material: CouchMaterial;
  color: number;
  condition: CouchCondition;
  damages: CouchDamage[];
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  mass: number;
  isOccupied: boolean;
  occupantId?: string;
  comfort: number;
  cleanliness: number;
  price: number;
  maxWeight: number;

  // Références Three.js
  group: THREE.Group;
  seat?: THREE.Group;
  back?: THREE.Group;
  arms: THREE.Group[] = [];
  legs: THREE.Group[] = [];
  cushions: THREE.Group[] = [];
  wheels: THREE.Group[] = [];
  steering?: THREE.Group;
  shake?: THREE.Group;

  // État d'animation
  private animationState: {
    sitting: boolean;
    sittingProgress: number; // 0-1
    bouncing: boolean;
    bounceProgress: number; // 0-1
    shakeIntensity: number; // 0-1
  } = {
    sitting: false,
    sittingProgress: 0,
    bouncing: false,
    bounceProgress: 0,
    shakeIntensity: 0,
  };

  // Cache des matériaux
  private materialCache: Map<string, THREE.Material> = new Map();

  constructor(options: CouchOptions = {}) {
    // Générer un ID unique
    this.id = `couch_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Appliquer les options
    this.type = options.type || "standard";
    this.material = options.material || "fabric";
    this.color = this.getColor(options.colorIndex || 0);
    this.condition = options.condition || "pristine";
    this.damages = options.damages || [];
    this.position = options.position?.clone() || new THREE.Vector3();
    this.rotation = options.rotation?.clone() || new THREE.Euler();
    this.scale = options.scale?.clone() || new THREE.Vector3(1, 1, 1);

    // Calculer les propriétés dérivées
    this.mass = COUCH_WEIGHTS[this.type];
    this.maxWeight = COUCH_MAX_WEIGHTS[this.type];
    this.comfort = COUCH_COMFORTS[this.type];
    this.price = COUCH_PRICES[this.type];
    this.cleanliness = 100;
    this.isOccupied = false;

    // Construire le modèle 3D
    this.group = this.buildGroup();
    this.group.name = `couch_${this.id}`;
    this.group.position.copy(this.position);
    this.group.rotation.copy(this.rotation);
    this.group.scale.copy(this.scale);
    this.group.userData = {
      couch: this,
      type: this.type,
      material: this.material,
      condition: this.condition,
    };

    // Appliquer les dommages initiaux
    this.applyDamages();
  }

  /**
   * Récupère la couleur selon l'index et le matériau
   */
  private getColor(index: number): number {
    switch (this.material) {
      case "fabric":
        return FABRIC_COLORS[index % FABRIC_COLORS.length];
      case "leather":
        return LEATHER_COLORS[index % LEATHER_COLORS.length];
      case "faux_leather":
        return LEATHER_COLORS[index % LEATHER_COLORS.length];
      case "velvet":
        return [0x8a4a6a, 0x6a4a8a, 0x4a6a8a, 0x8a8a4a].random();
      case "chenille":
        return [0xa88a6a, 0x8a6a4a, 0x6a4a8a].random();
      case "microfiber":
        return [0x4a5a6a, 0x5a6a7a, 0x6a7a8a].random();
      case "wood":
        return WOOD_COLORS[index % WOOD_COLORS.length];
      case "metal":
        return METAL_COLORS[index % METAL_COLORS.length];
      default:
        return FABRIC_COLORS[0];
    }
  }

  /**
   * Récupère les dimensions selon le type
   */
  private getDimensions(): typeof DEFAULT_DIMENSIONS {
    return { ...DEFAULT_DIMENSIONS, ...COUCH_DIMENSIONS[this.type] };
  }

  /**
   * Construire le groupe Three.js du canapé
   */
  private buildGroup(): THREE.Group {
    const group = new THREE.Group();
    const D = this.getDimensions();

    // Construire les composants selon le type
    switch (this.type) {
      case "sectional":
        this.buildSectional(group, D);
        break;
      case "chaise":
        this.buildChaise(group, D);
        break;
      case "futon":
        this.buildFuton(group, D);
        break;
      case "chesterfield":
        this.buildChesterfield(group, D);
        break;
      case "gaming":
        this.buildGamingCouch(group, D);
        break;
      case "outdoor":
        this.buildOutdoorCouch(group, D);
        break;
      default:
        this.buildStandardCouch(group, D);
    }

    // Ajouter des détails communs
    this.addCommonDetails(group, D);

    return group;
  }

  /**
   * Construire un canapé standard
   */
  private buildStandardCouch(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Siège
    this.seat = this.buildSeat(D);
    if (this.seat) group.add(this.seat as any);

    // Dossier
    this.back = this.buildBack(D);
    if (this.back) group.add(this.back as any);

    // Accoudoirs
    this.arms = [
      this.buildArm(D, 1),
      this.buildArm(D, -1),
    ];
    this.arms.forEach(arm => group.add(arm));

    // Pieds ou roues selon le type
    if (this.type === "gaming" || this.type === "outdoor") {
      const { group: wheelsGroup, wheels } = this.buildWheels(D);
      this.wheels = wheels;
      group.add(wheelsGroup);
    } else {
      this.legs = [
        this.buildLeg(D, 1, 1),
        this.buildLeg(D, -1, 1),
        this.buildLeg(D, 1, -1),
        this.buildLeg(D, -1, -1),
      ];
      this.legs.forEach(leg => group.add(leg));
    }

    // Coussins
    this.cushions = [
      (this as any).buildCushion(D, 0),
      (this as any).buildCushion(D, 1),
      (this as any).buildCushion(D, -1),
    ];
    this.cushions.forEach(cushion => group.add(cushion));

    // Châssis (pour les canapés avec mécanismes)
    if (this.type === "gaming") {
      const chassis = this.buildChassis(D);
      this.shake = chassis;
      group.add(chassis);
    }
  }

  /**
   * Construire un canapé sectionnel (en L)
   */
  private buildSectional(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Partie principale (2 places)
    const mainPart = new THREE.Group();
    this.seat = this.buildSeat(D, 1.2); // Largeur réduite
    mainPart.add(this.seat);

    this.back = this.buildBack(D, 1.2);
    mainPart.add(this.back);

    this.arms = [this.buildArm(D, -1)];
    this.arms.forEach(arm => mainPart.add(arm));

    this.legs = [
      this.buildLeg(D, -1, 1),
      this.buildLeg(D, -1, -1),
    ];
    this.legs.forEach(leg => mainPart.add(leg));

    this.cushions = [
      (this as any).buildCushion(D, 0),
      (this as any).buildCushion(D, -0.5),
    ];
    this.cushions.forEach(cushion => mainPart.add(cushion));

    // Partie chaise (1 place)
    const chaisePart = new THREE.Group();
    chaisePart.position.x = D.seatW * 0.7;

    const chaiseSeat = this.buildSeat(D, 0.8, true); // Chaise longue
    chaiseSeat.position.x = -D.seatW * 0.35;
    chaisePart.add(chaiseSeat);

    const chaiseBack = (this as any).buildBack(D, 0.8, true);
    chaiseBack.position.x = -D.seatW * 0.35;
    chaisePart.add(chaiseBack);

    this.legs.push(
      this.buildLeg(D, 1, 1),
      this.buildLeg(D, 1, -1),
    );
    this.legs.forEach(leg => chaisePart.add(leg));

    this.cushions.push((this as any).buildCushion(D, 0.5, true));
    this.cushions.forEach(cushion => chaisePart.add(cushion));

    // Assembler les parties
    group.add(mainPart);
    group.add(chaisePart);
  }

  /**
   * Construire une chaise longue
   */
  private buildChaise(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    this.seat = this.buildSeat(D, D.seatW, true); // Siège plus long
    if (this.seat) group.add(this.seat as any);

    this.back = (this as any).buildBack(D, D.seatW, true); // Dossier plus bas
    if (this.back) group.add(this.back as any);

    this.arms = [
      this.buildArm(D, 1),
      this.buildArm(D, -1),
    ];
    this.arms.forEach(arm => group.add(arm));

    this.legs = [
      this.buildLeg(D, 1, 1),
      this.buildLeg(D, -1, 1),
      this.buildLeg(D, 1, -1),
      this.buildLeg(D, -1, -1),
    ];
    this.legs.forEach(leg => group.add(leg));

    this.cushions = [
      (this as any).buildCushion(D, 0),
      (this as any).buildCushion(D, 0.5),
      (this as any).buildCushion(D, -0.5),
    ];
    this.cushions.forEach(cushion => group.add(cushion));
  }

  /**
   * Construire un futon
   */
  private buildFuton(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Matelas (siège + dossier en un seul)
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(D.seatW, D.seatH + D.backH, D.seatD + 0.2),
      this.getMaterial("fabric")
    );
    mattress.position.y = (D.seatH + D.backH) / 2;
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    group.add(mattress);
    this.seat = new THREE.Group().add(mattress);

    // Pieds bas
    this.legs = [
      this.buildLeg(D, 1, 1, 0.1),
      this.buildLeg(D, -1, 1, 0.1),
      this.buildLeg(D, 1, -1, 0.1),
      this.buildLeg(D, -1, -1, 0.1),
    ];
    this.legs.forEach(leg => group.add(leg));
  }

  /**
   * Construire un canapé Chesterfield
   */
  private buildChesterfield(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    this.seat = this.buildSeat(D);
    if (this.seat) group.add(this.seat as any);

    this.back = this.buildChesterfieldBack(D);
    if (this.back) group.add(this.back as any);

    this.arms = [
      this.buildChesterfieldArm(D, 1),
      this.buildChesterfieldArm(D, -1),
    ];
    this.arms.forEach(arm => group.add(arm));

    this.legs = [
      this.buildLeg(D, 1, 1, 0.15),
      this.buildLeg(D, -1, 1, 0.15),
      this.buildLeg(D, 1, -1, 0.15),
      this.buildLeg(D, -1, -1, 0.15),
    ];
    this.legs.forEach(leg => group.add(leg));

    this.cushions = [
      this.buildChesterfieldCushion(D, 0),
      this.buildChesterfieldCushion(D, 0.5),
      this.buildChesterfieldCushion(D, -0.5),
    ];
    this.cushions.forEach(cushion => group.add(cushion));
  }

  /**
   * Construire un canapé gaming
   */
  private buildGamingCouch(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Châssis
    const chassis = this.buildChassis(D);
    this.shake = chassis;
    group.add(chassis);

    // Siège
    this.seat = this.buildSeat(D);
    this.seat.position.y = D.chassisH + 0.16;
    if (this.seat) group.add(this.seat as any);

    // Dossier haut
    this.back = this.buildBack(D, undefined, 0.8); // Dossier plus haut
    this.back.position.y = D.chassisH + 0.16;
    if (this.back) group.add(this.back as any);

    // Accoudoirs larges
    this.arms = [
      this.buildArm(D, 1, 0.8),
      this.buildArm(D, -1, 0.8),
    ];
    this.arms.forEach(arm => {
      arm.position.y = D.chassisH + 0.16;
      group.add(arm);
    });

    // Roues
    const { group: wheelsGroup, wheels } = this.buildWheels(D);
    this.wheels = wheels;
    group.add(wheelsGroup);

    // Moteur (pour les canapés motorisés)
    const engine = this.buildEngine(D);
    group.add(engine);

    // Contrôles
    const { group: controls, steering } = this.buildControls(D);
    this.steering = steering;
    group.add(controls);

    // Coussins ergonomiques
    this.cushions = [
      (this as any).buildCushion(D, 0),
      (this as any).buildCushion(D, 0.5),
      (this as any).buildCushion(D, -0.5),
      this.buildLumbarSupport(D, 0),
    ];
    this.cushions.forEach(cushion => {
      cushion.position.y = D.chassisH + 0.16;
      group.add(cushion);
    });

    // Détails spécifiques
    this.addGamingDetails(group, D);
  }

  /**
   * Construire un canapé d'extérieur
   */
  private buildOutdoorCouch(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Matériau résistant aux intempéries
    const weatherproofMaterial = this.getMaterial("fabric", 0.9, 0.8);

    this.seat = (this as any).buildSeat(D, undefined, weatherproofMaterial);
    if (this.seat) group.add(this.seat as any);

    this.back = this.buildBack(D, undefined, undefined, weatherproofMaterial);
    if (this.back) group.add(this.back as any);

    this.arms = [
      this.buildArm(D, 1, undefined, weatherproofMaterial),
      this.buildArm(D, -1, undefined, weatherproofMaterial),
    ];
    this.arms.forEach(arm => group.add(arm));

    // Pieds larges et stables
    this.legs = [
      this.buildLeg(D, 1, 1, 0.15, 0.12, weatherproofMaterial),
      this.buildLeg(D, -1, 1, 0.15, 0.12, weatherproofMaterial),
      this.buildLeg(D, 1, -1, 0.15, 0.12, weatherproofMaterial),
      this.buildLeg(D, -1, -1, 0.15, 0.12, weatherproofMaterial),
    ];
    this.legs.forEach(leg => group.add(leg));

    this.cushions = [
      (this as any).buildCushion(D, 0, weatherproofMaterial),
      (this as any).buildCushion(D, 0.5, weatherproofMaterial),
      (this as any).buildCushion(D, -0.5, weatherproofMaterial),
    ];
    this.cushions.forEach(cushion => group.add(cushion));
  }

  // ==========================================
  // 🛠 3. CONSTRUCTION DES COMPOSANTS
  // ==========================================

  /**
   * Récupère un matériau selon le type et la couleur
   */
  private getMaterial(
    type: CouchMaterial | string,
    roughness: number = 0.96,
    metalness: number = 0
  ): THREE.Material {
    const cacheKey = `${type}_${this.color}_${roughness}_${metalness}`;
    let material = this.materialCache.get(cacheKey);
    
    if (!material) {
      if (type === "leather" || type === "faux_leather") {
        material = matLib.get(this.color, roughness, 0.1);
      } else if (type === "velvet") {
        material = matLib.get(this.color, roughness, 0.05);
      } else if (type === "wood") {
        material = matLib.get(this.color, 0.7, 0.1);
      } else if (type === "metal") {
        material = matLib.get(this.color, 0.3, 0.8);
      } else {
        // Fabric ou autre
        material = matLib.get(this.color, roughness, metalness);
      }
      this.materialCache.set(cacheKey, material);
    }
    
    return material;
  }

  /**
   * Construire le siège
   */
  private buildSeat(
    D: typeof DEFAULT_DIMENSIONS,
    widthFactor: number = 1,
    isChaise: boolean = false,
    material?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = material || this.getMaterial(this.material);

    // Base du siège
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(D.seatW * widthFactor, D.seatH, D.seatD),
      mat
    );
    base.position.y = D.seatH / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Si c'est une chaise longue, ajouter une extension
    if (isChaise) {
      const extension = new THREE.Mesh(
        new THREE.BoxGeometry(D.seatW * widthFactor * 0.6, D.seatH, D.seatD * 0.8),
        mat
      );
      extension.position.set(D.seatW * widthFactor * 0.4, D.seatH / 2, -D.seatD * 0.5);
      group.add(extension);
    }

    return group;
  }

  /**
   * Construire le dossier
   */
  private buildBack(
    D: typeof DEFAULT_DIMENSIONS,
    widthFactor: number = 1,
    heightFactor: number = 1,
    material?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = material || this.getMaterial(this.material);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(D.seatW * widthFactor, D.backH * heightFactor, D.backT),
      mat
    );
    back.position.set(0, D.seatH + D.backH * heightFactor / 2, -D.seatD / 2 + D.backT / 2);
    back.rotation.x = 0.09;
    back.castShadow = true;
    group.add(back);

    return group;
  }

  /**
   * Construire un dossier Chesterfield (avec boutons)
   */
  private buildChesterfieldBack(D: typeof DEFAULT_DIMENSIONS): THREE.Group {
    const group = new THREE.Group();
    const mat = this.getMaterial(this.material);

    // Dossier principal
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(D.seatW, D.backH, D.backT * 1.2),
      mat
    );
    back.position.set(0, D.seatH + D.backH / 2, -D.seatD / 2 + D.backT / 2);
    back.rotation.x = 0.05;
    group.add(back);

    // Boutons capitonnés
    const buttonMat = this.getMaterial(this.material, 0.8, 0.05);
    const buttonGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
    const buttons = new THREE.InstancedMesh(buttonGeo, buttonMat, 20);

    const dummy = new THREE.Object3D();
    const buttonPositions = [
      [-0.6, 0.2, -D.seatD / 2 + D.backT / 2],
      [-0.6, 0.4, -D.seatD / 2 + D.backT / 2],
      [-0.2, 0.3, -D.seatD / 2 + D.backT / 2],
      [0.2, 0.3, -D.seatD / 2 + D.backT / 2],
      [0.6, 0.2, -D.seatD / 2 + D.backT / 2],
      [0.6, 0.4, -D.seatD / 2 + D.backT / 2],
    ];

    buttonPositions.forEach((pos, i) => {
      dummy.position.set(pos[0], D.seatH + pos[1], pos[2]);
      dummy.updateMatrix();
      buttons.setMatrixAt(i, dummy.matrix);
    });

    group.add(buttons);
    return group;
  }

  /**
   * Construire un accoudoir
   */
  private buildArm(
    D: typeof DEFAULT_DIMENSIONS,
    side: number,
    heightFactor: number = 1,
    material?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = material || this.getMaterial(this.material);

    // Accoudoir principal
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(D.armW, D.armH * heightFactor, D.seatD),
      mat
    );
    arm.position.set(side * (D.seatW / 2 - D.armW / 2), D.seatH + D.armH * heightFactor / 2 - 0.1, 0);
    group.add(arm);

    // Partie supérieure arrondie
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(D.armW / 2, D.armW / 2, D.seatD, 8, 1, false, 0, Math.PI),
      mat
    );
    top.rotation.z = Math.PI / 2;
    top.rotation.y = Math.PI / 2;
    top.position.set(side * (D.seatW / 2 - D.armW / 2), D.seatH + D.armH * heightFactor - 0.1, 0);
    group.add(top);

    return group;
  }

  /**
   * Construire un accoudoir Chesterfield
   */
  private buildChesterfieldArm(
    D: typeof DEFAULT_DIMENSIONS,
    side: number
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = this.getMaterial(this.material);

    // Accoudoir avec courbe
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(D.armW * 1.2, D.armH * 1.1, D.seatD),
      mat
    );
    arm.position.set(side * (D.seatW / 2 - D.armW / 2), D.seatH + D.armH / 2 - 0.1, 0);
    group.add(arm);

    // Courbe supérieure
    const curve = new THREE.Mesh(
      new THREE.TorusGeometry(D.armW / 2, 0.02, 8, 16, Math.PI),
      mat
    );
    curve.rotation.z = Math.PI / 2;
    curve.rotation.y = side * Math.PI / 2;
    curve.position.set(side * (D.seatW / 2 - D.armW / 2), D.seatH + D.armH - 0.1, 0);
    group.add(curve);

    return group;
  }

  /**
   * Construire un pied
   */
  private buildLeg(
    D: typeof DEFAULT_DIMENSIONS,
    sideX: number,
    sideZ: number,
    height: number = D.legH,
    width: number = D.legW,
    material?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = material || this.getMaterial("wood");

    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, width),
      mat
    );
    leg.position.set(
      sideX * (D.seatW / 2 - width / 2),
      height / 2,
      sideZ * (D.seatD / 2 - width / 2)
    );
    leg.castShadow = true;
    group.add(leg);

    return group;
  }

  /**
   * Construire un coussin
   */
  private buildCushion(
    D: typeof DEFAULT_DIMENSIONS,
    offsetX: number,
    isChaise: boolean = false,
    material?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = material || this.getMaterial(this.material, 0.95);

    const cushionW = (D.seatW - 2 * D.armW) / (isChaise ? 1 : 2) - 0.04;
    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(cushionW, 0.16, D.seatD - 0.08),
      mat
    );
    cushion.position.set(
      offsetX * (cushionW / 2 + 0.02),
      D.seatH + 0.06,
      0
    );
    cushion.scale.y = 0.88;
    cushion.castShadow = true;
    group.add(cushion);

    // Plis du coussin
    const creaseMat = this.getMaterial(this.material, 0.85);
    const dent = new THREE.Mesh(
      new THREE.SphereGeometry(cushionW * 0.34, 8, 6),
      creaseMat
    );
    dent.scale.set(1, 0.18, 0.9);
    dent.position.set(
      offsetX * (cushionW / 2 + 0.02),
      D.seatH + 0.11,
      -0.02
    );
    group.add(dent);

    return group;
  }

  /**
   * Construire un coussin Chesterfield
   */
  private buildChesterfieldCushion(
    D: typeof DEFAULT_DIMENSIONS,
    offsetX: number
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = this.getMaterial(this.material, 0.95);

    const cushionW = (D.seatW - 2 * D.armW) / 2 - 0.04;
    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(cushionW, 0.18, D.seatD - 0.06),
      mat
    );
    cushion.position.set(
      offsetX * (cushionW / 2 + 0.02),
      D.seatH + 0.08,
      0
    );
    group.add(cushion);

    // Boutons sur le coussin
    const buttonMat = this.getMaterial(this.material, 0.8, 0.05);
    const buttonGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.015, 8);
    const buttons = new THREE.InstancedMesh(buttonGeo, buttonMat, 4);

    const dummy = new THREE.Object3D();
    const buttonPositions = [
      [0, 0.05],
      [0.2, 0.05],
      [-0.2, 0.05],
      [0, -0.05],
    ];

    buttonPositions.forEach((pos, i) => {
      dummy.position.set(
        offsetX * (cushionW / 2 + 0.02) + pos[0],
        D.seatH + 0.1,
        pos[1]
      );
      dummy.updateMatrix();
      buttons.setMatrixAt(i, dummy.matrix);
    });

    group.add(buttons);
    return group;
  }

  /**
   * Construire un support lombaire (pour les canapés gaming)
   */
  private buildLumbarSupport(
    D: typeof DEFAULT_DIMENSIONS,
    offsetX: number
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = matLib.get(0x2a2a2e, 0.85); // Noir mat

    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
      mat
    );
    support.rotation.x = Math.PI / 2;
    support.position.set(
      offsetX * 0.5,
      D.seatH + 0.25,
      -D.seatD / 2 + 0.1
    );
    group.add(support);

    return group;
  }

  /**
   * Construire le châssis (pour les canapés motorisés)
   */
  private buildChassis(D: typeof DEFAULT_DIMENSIONS): THREE.Group {
    const group = new THREE.Group();
    group.name = "couch_chassis";

    const steel = this.getMaterial("metal", 0.72, 0.55);
    const rust = this.getMaterial("metal", 0.98, 0.1);
    const wood = this.getMaterial("wood");

    // Rails
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, D.chassisH, D.chassisL),
        steel
      );
      rail.position.set(side * (D.chassisW / 2 - 0.05), 0, 0);
      rail.castShadow = true;
      group.add(rail);
    }

    // Traverses
    for (const z of [-D.chassisL / 2 + 0.2, 0, D.chassisL / 2 - 0.2]) {
      const cross = new THREE.Mesh(
        new THREE.BoxGeometry(D.chassisW, D.chassisH * 0.8, 0.07),
        steel
      );
      cross.position.z = z;
      group.add(cross);
    }

    // Plancher
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(D.chassisW - 0.14, 0.024, D.chassisL - 0.1),
      wood
    );
    floor.position.y = D.chassisH / 2 + 0.012;
    floor.receiveShadow = true;
    group.add(floor);

    // Soudures
    const weldGeo = new THREE.SphereGeometry(0.028, 6, 5);
    const welds = new THREE.InstancedMesh(weldGeo, rust, 12);
    const dummy = new THREE.Object3D();

    let i = 0;
    for (const side of [-1, 1]) {
      for (const z of [-D.chassisL / 2 + 0.2, 0, D.chassisL / 2 - 0.2]) {
        for (const y of [-D.chassisH / 3, D.chassisH / 3]) {
          dummy.position.set(
            side * (D.chassisW / 2 - 0.05),
            y,
            z
          );
          dummy.scale.setScalar(0.75);
          dummy.updateMatrix();
          welds.setMatrixAt(i++, dummy.matrix);
        }
      }
    }
    group.add(welds);

    // Sangles
    const strap = this.getMaterial("fabric", 0.95);
    for (const z of [-0.55, 0.55]) {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(D.chassisW + 0.1, 0.035, 0.05),
        strap
      );
      s.position.set(0, D.chassisH / 2 + 0.04, z);
      group.add(s);
    }

    return group;
  }

  /**
   * Construire les roues
   */
  private buildWheels(D: typeof DEFAULT_DIMENSIONS): { group: THREE.Group; wheels: THREE.Group[] } {
    const group = new THREE.Group();
    const wheels: THREE.Group[] = [];

    const tire = this.getMaterial("fabric", 0.94);
    const rim = this.getMaterial("metal", 0.42, 0.72);

    const spots: Array<[number, number]> = [
      [-D.track / 2, D.wheelbase / 2],
      [D.track / 2, D.wheelbase / 2],
      [-D.track / 2, -D.wheelbase / 2],
      [D.track / 2, -D.wheelbase / 2],
    ];

    for (const [x, z] of spots) {
      const wheel = new THREE.Group();

      // Pneu
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(D.wheelR, D.wheelR, D.wheelW, 14),
        tire
      );
      t.rotation.z = Math.PI / 2;
      t.castShadow = true;
      wheel.add(t);

      // Jante
      const r = new THREE.Mesh(
        new THREE.CylinderGeometry(D.wheelR * 0.55, D.wheelR * 0.55, D.wheelW + 0.01, 10),
        rim
      );
      r.rotation.z = Math.PI / 2;
      wheel.add(r);

      wheel.position.set(x, D.wheelR, z);
      wheel.userData.couchWheel = true;
      wheel.userData.front = z > 0;
      group.add(wheel);
      wheels.push(wheel);
    }

    return { group, wheels };
  }

  /**
   * Construire le moteur (pour les canapés gaming motorisés)
   */
  private buildEngine(D: typeof DEFAULT_DIMENSIONS): THREE.Group {
    const group = new THREE.Group();

    const black = this.getMaterial("metal", 0.65, 0.35);
    const alu = this.getMaterial("metal", 0.42, 0.72);
    const exhaust = this.getMaterial("metal", 0.45, 0.68);

    // Bloc moteur
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.34, 0.38),
      black
    );
    block.position.set(0, 0.2, -D.chassisL / 2 + 0.32);
    block.castShadow = true;
    group.add(block);

    // Ailettes de refroidissement
    for (let i = 0; i < 6; i++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.018, 0.4),
        alu
      );
      fin.position.set(0, 0.1 + i * 0.042, -D.chassisL / 2 + 0.32);
      group.add(fin);
    }

    // Réservoir
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.3, 12),
      this.getMaterial("metal", 0.55, 0.4)
    );
    tank.rotation.z = Math.PI / 2;
    tank.position.set(0, 0.44, -D.chassisL / 2 + 0.32);
    tank.castShadow = true;
    group.add(tank);

    // Bouchon du réservoir
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8),
      black
    );
    cap.position.set(0, 0.58, -D.chassisL / 2 + 0.32);
    group.add(cap);

    // Filtre à air
    const filter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.14, 10),
      this.getMaterial("fabric", 0.9)
    );
    filter.position.set(0.26, 0.28, -D.chassisL / 2 + 0.32);
    group.add(filter);

    // Poulie
    const pulley = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.04, 14),
      alu
    );
    pulley.rotation.z = Math.PI / 2;
    pulley.position.set(-0.24, 0.16, -D.chassisL / 2 + 0.32);
    pulley.userData.couchPulley = true;
    group.add(pulley);

    // Courroie
    const belt = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.016, 6, 16),
      this.getMaterial("fabric", 0.95)
    );
    belt.rotation.y = Math.PI / 2;
    belt.position.set(-0.26, 0.1, -D.chassisL / 2 + 0.44);
    belt.userData.couchBelt = true;
    group.add(belt);

    // Échappement
    const chrome = this.getMaterial("metal", 0.22, 0.88);
    const tips: THREE.Mesh[] = [];

    for (const side of [-1, 1]) {
      const header = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.24, 8),
        exhaust
      );
      header.rotation.x = Math.PI / 2.6;
      header.position.set(side * 0.14, 0.24, -D.chassisL / 2 + 0.16);
      group.add(header);

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.14, 0.18, -D.chassisL / 2 + 0.08),
        new THREE.Vector3(side * 0.2, 0.22, -D.chassisL / 2 - 0.1),
        new THREE.Vector3(side * 0.24, 0.32, -D.chassisL / 2 - 0.26),
        new THREE.Vector3(side * 0.26, 0.42, -D.chassisL / 2 - 0.38),
      ]);

      const pipe = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 16, 0.034, 8, false),
        exhaust
      );
      pipe.castShadow = true;
      group.add(pipe);

      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.036, 0.11, 10),
        chrome
      );
      tip.position.set(side * 0.26, 0.46, -D.chassisL / 2 - 0.42);
      tip.rotation.x = -0.55;
      tip.castShadow = true;
      tip.userData.couchTip = true;
      group.add(tip);
      tips.push(tip);
    }

    // Frein
    const brake = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.05, 0.03),
      matLib.getEmissive(0x6a1a1a, 0xff2010, 0.15)
    );
    brake.position.set(0, 0.38, -D.chassisL / 2 - 0.06);
    brake.userData.couchBrake = true;
    group.add(brake);

    return group;
  }

  /**
   * Construire les contrôles (volant, leviers)
   */
  private buildControls(D: typeof DEFAULT_DIMENSIONS): { group: THREE.Group; steering: THREE.Group } {
    const group = new THREE.Group();

    const metal = this.getMaterial("metal", 0.5, 0.6);
    const grip = this.getMaterial("fabric", 0.9);

    // Colonne de direction
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, 0.62, 8),
      metal
    );
    column.position.set(-0.42, 0.72, 0.46);
    column.rotation.x = -0.42;
    column.castShadow = true;
    group.add(column);

    // Volant
    const steering = new THREE.Group();
    steering.add(new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.019, 8, 20),
      grip
    ));

    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.016, 0.016),
        metal
      );
      const a = (i / 3) * Math.PI * 2;
      spoke.rotation.z = a;
      spoke.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0);
      steering.add(spoke);
    }

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.03, 10),
      metal
    );
    hub.rotation.x = Math.PI / 2;
    steering.add(hub);

    steering.position.set(-0.42, 0.98, 0.34);
    steering.rotation.x = -0.42;
    steering.userData.couchSteer = true;
    group.add(steering);

    // Levier de vitesses
    const shifter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.34, 8),
      metal
    );
    shifter.position.set(-0.05, 0.74, 0.2);
    shifter.rotation.x = -0.18;
    group.add(shifter);

    // Pommeau
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 10, 8),
      grip
    );
    knob.position.set(-0.05, 0.91, 0.23);
    group.add(knob);

    // Pédales
    for (const px of [-0.52, -0.34]) {
      const pedal = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.02, 0.13),
        metal
      );
      pedal.position.set(px, 0.28, 0.66);
      pedal.rotation.x = -0.2;
      group.add(pedal);
    }

    return { group, steering };
  }

  /**
   * Ajouter des détails communs à tous les canapés
   */
  private addCommonDetails(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Ajouter des détails selon le type
    if (this.type === "gaming") {
      this.addGamingDetails(group, D);
    } else if (this.type === "chesterfield") {
      this.addChesterfieldDetails(group, D);
    } else if (this.type === "outdoor") {
      this.addOutdoorDetails(group, D);
    }
  }

  /**
   * Ajouter des détails pour un canapé gaming
   */
  private addGamingDetails(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Écran intégré (optionnel)
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.18, 0.01),
      matLib.get(0x1a1a1e, 0.9, 0.1)
    );
    screen.position.set(0, 0.8, -D.chassisL / 2 + 0.4);
    screen.rotation.x = -0.3;
    group.add(screen);

    // Logo
    const logo = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.05, 0.01),
      matLib.get(0xc8a040, 0.9, 0.5)
    );
    logo.position.set(0, 0.7, -D.chassisL / 2 + 0.3);
    group.add(logo);
  }

  /**
   * Ajouter des détails pour un canapé Chesterfield
   */
  private addChesterfieldDetails(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Franges décoratives
    const fringeMat = this.getMaterial(this.material, 0.9);
    for (const side of [-1, 1]) {
      const fringe = new THREE.Mesh(
        new THREE.BoxGeometry(D.seatW * 0.1, 0.02, D.seatD),
        fringeMat
      );
      fringe.position.set(
        side * (D.seatW / 2 - D.seatW * 0.05),
        D.seatH - 0.01,
        0
      );
      group.add(fringe);
    }
  }

  /**
   * Ajouter des détails pour un canapé d'extérieur
   */
  private addOutdoorDetails(group: THREE.Group, D: typeof DEFAULT_DIMENSIONS): void {
    // Protection contre la pluie (auvent)
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(D.seatW + 0.2, 0.02, D.seatD + 0.2),
      this.getMaterial("fabric", 0.9, 0.1)
    );
    canopy.position.set(0, D.seatH + D.backH + 0.1, 0);
    group.add(canopy);

    // Coussin supplémentaire pour le confort
    const extraCushion = new THREE.Mesh(
      new THREE.BoxGeometry(D.seatW, 0.08, D.seatD),
      this.getMaterial(this.material, 0.95)
    );
    extraCushion.position.set(0, D.seatH + 0.04, 0);
    group.add(extraCushion);
  }

  // ==========================================
  // 🎨 4. GESTION DES DOMMAGES
  // ==========================================

  /**
   * Applique les dommages au modèle 3D
   */
  private applyDamages(): void {
    if (!this.group) return;

    this.damages.forEach(damage => {
      this.applyDamage(damage);
    });
  }

  /**
   * Applique un dommage spécifique
   */
  private applyDamage(damage: CouchDamage): void {
    if (!this.group) return;

    switch (damage.type) {
      case "stain":
        this.applyStain(damage);
        break;
      case "tear":
        this.applyTear(damage);
        break;
      case "burn":
        this.applyBurn(damage);
        break;
      case "scratch":
        this.applyScratch(damage);
        break;
      case "dent":
        this.applyDent(damage);
        break;
      case "broken_leg":
        this.applyBrokenLeg(damage);
        break;
      case "broken_spring":
        this.applyBrokenSpring(damage);
        break;
      case "water_damage":
        this.applyWaterDamage(damage);
        break;
    }
  }

  /**
   * Applique une tache
   */
  private applyStain(damage: CouchDamage): void {
    if (!this.group) return;

    const stainMat = matLib.get(darken(this.color, 0.5), 0.95);
    const stain = new THREE.Mesh(
      new THREE.CircleGeometry(damage.size * 0.3, 16),
      stainMat
    );
    stain.rotation.x = Math.PI / 2;
    stain.position.copy(damage.position);
    stain.position.y += 0.01; // Légèrement au-dessus de la surface
    this.group.add(stain);
  }

  /**
   * Applique une déchirure
   */
  private applyTear(damage: CouchDamage): void {
    if (!this.group) return;

    const tearMat = matLib.get(0x1a1a1a, 0.95); // Noir pour la déchirure
    const tear = new THREE.Mesh(
      new THREE.BoxGeometry(damage.size * 0.2, 0.01, damage.size * 0.8),
      tearMat
    );
    tear.position.copy(damage.position);
    tear.position.y += 0.01;
    this.group.add(tear);
  }

  /**
   * Applique une brûlure
   */
  private applyBurn(damage: CouchDamage): void {
    if (!this.group) return;

    const burnMat = matLib.get(0x1a1a1a, 0.95); // Noir carbonisé
    const burn = new THREE.Mesh(
      new THREE.SphereGeometry(damage.size * 0.2, 16, 16),
      burnMat
    );
    burn.position.copy(damage.position);
    burn.position.y += 0.01;
    burn.scale.y = 0.5; // Aplatir la brûlure
    this.group.add(burn);
  }

  /**
   * Applique une égratignure
   */
  private applyScratch(damage: CouchDamage): void {
    if (!this.group) return;

    const scratchMat = matLib.get(0xffffff, 0.95); // Blanc pour l'égratignure
    const scratch = new THREE.Mesh(
      new THREE.BoxGeometry(damage.size * 0.8, 0.005, 0.01),
      scratchMat
    );
    scratch.position.copy(damage.position);
    scratch.position.y += 0.01;
    scratch.rotation.z = Math.random() * Math.PI;
    this.group.add(scratch);
  }

  /**
   * Applique une bosse
   */
  private applyDent(damage: CouchDamage): void {
    if (!this.group) return;

    const dentMat = this.getMaterial(this.material, 0.8);
    const dent = new THREE.Mesh(
      new THREE.SphereGeometry(damage.size * 0.2, 16, 16),
      dentMat
    );
    dent.position.copy(damage.position);
    dent.position.y += 0.01;
    dent.scale.y = 0.3; // Aplatir la bosse
    this.group.add(dent);
  }

  /**
   * Applique un pied cassé
   */
  private applyBrokenLeg(damage: CouchDamage): void {
    if (!this.legs || this.legs.length === 0) return;

    // Trouver le pied le plus proche de la position du dommage
    let closestLeg: THREE.Group | undefined;
    let minDistance = Infinity;

    for (const leg of this.legs) {
      const distance = leg.position.distanceTo(damage.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestLeg = leg;
      }
    }

    if (closestLeg) {
      // Casser le pied (rotation aléatoire)
      closestLeg.rotation.x = Math.random() * 0.5;
      closestLeg.rotation.z = Math.random() * 0.5;

      // Ajouter des éclats de bois
      for (let i = 0; i < 3; i++) {
        const splinter = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.1, 0.02),
          this.getMaterial("wood")
        );
        splinter.position.copy(closestLeg.position);
        splinter.position.y += 0.05;
        splinter.position.x += (Math.random() - 0.5) * 0.1;
        splinter.position.z += (Math.random() - 0.5) * 0.1;
        splinter.rotation.x = Math.random() * Math.PI;
        splinter.rotation.z = Math.random() * Math.PI;
        this.group.add(splinter);
      }
    }
  }

  /**
   * Applique un ressort cassé (pour les canapés avec mécanisme)
   */
  private applyBrokenSpring(damage: CouchDamage): void {
    if (!this.shake) return;

    // Trouver la poulie ou la courroie
    let pulley: THREE.Mesh | undefined;
    let belt: THREE.Mesh | undefined;

    this.shake.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.userData.couchPulley) pulley = obj;
        if (obj.userData.couchBelt) belt = obj;
      }
    });

    if (pulley) {
      pulley.rotation.x = Math.random() * 0.5;
    }
    if (belt) {
      belt.visible = false;
    }
  }

  /**
   * Applique des dégâts d'eau
   */
  private applyWaterDamage(damage: CouchDamage): void {
    if (!this.group) return;

    // Tache d'eau (plus claire)
    const waterMat = matLib.get(0xa8c8e8, 0.95, 0.1);
    const waterStain = new THREE.Mesh(
      new THREE.CircleGeometry(damage.size * 0.4, 16),
      waterMat
    );
    waterStain.rotation.x = Math.PI / 2;
    waterStain.position.copy(damage.position);
    waterStain.position.y += 0.01;
    this.group.add(waterStain);
  }

  /**
   * Ajoute un dommage au canapé
   */
  addDamage(type: DamageType, position: THREE.Vector3, severity: number = 50): void {
    const damage: CouchDamage = {
      id: `damage_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      type,
      position: position.clone(),
      size: severity / 100,
      severity,
      age: 0,
      repaired: false,
    };

    this.damages.push(damage);
    this.applyDamage(damage);

    // Mettre à jour l'état du canapé
    this.updateCondition();
  }

  /**
   * Répare un dommage
   */
  repairDamage(damageId: string): boolean {
    const damageIndex = this.damages.findIndex(d => d.id === damageId);
    if (damageIndex === -1) return false;

    this.damages[damageIndex].repaired = true;

    // Retirer les effets visuels du dommage
    // (À implémenter: supprimer les meshes ajoutés pour le dommage)
    this.updateCondition();
    return true;
  }

  /**
   * Répare tous les dommages
   */
  repairAll(): void {
    this.damages.forEach(damage => {
      damage.repaired = true;
    });
    this.updateCondition();

    // Reconstruire le modèle pour supprimer les effets visuels
    this.group.removeFromParent();
    this.group = this.buildGroup();
    this.group.position.copy(this.position);
    this.group.rotation.copy(this.rotation);
    this.group.scale.copy(this.scale);
  }

  /**
   * Met à jour l'état du canapé selon les dommages
   */
  private updateCondition(): void {
    const totalSeverity = this.damages.reduce((sum, damage) => {
      return sum + (damage.repaired ? 0 : damage.severity);
    }, 0);

    const damagePercentage = totalSeverity / (this.damages.length * 50);

    if (damagePercentage === 0) {
      this.condition = "pristine";
    } else if (damagePercentage < 0.2) {
      this.condition = "good";
    } else if (damagePercentage < 0.5) {
      this.condition = "used";
    } else if (damagePercentage < 0.8) {
      this.condition = "worn";
    } else if (damagePercentage < 1.0) {
      this.condition = "damaged";
    } else {
      this.condition = "broken";
    }

    // Mettre à jour la propreté
    const stainDamages = this.damages.filter(d => d.type === "stain" && !d.repaired);
    this.cleanliness = 100 - stainDamages.reduce((sum, d) => sum + d.severity, 0) / 2;
  }

  // ==========================================
  // 👤 5. GESTION DES INTERACTIONS
  // ==========================================

  /**
   * Assis un personnage sur le canapé
   */
  sit(characterId: string): boolean {
    if (this.isOccupied) {
      console.log(`[Couch ${this.id}] Déjà occupé par ${this.occupantId}.`);
      return false;
    }

    // Vérifier si le personnage est trop lourd
    // (À intégrer avec ton système de personnages)
    this.isOccupied = true;
    this.occupantId = characterId;

    // Animation d'assise
    this.animateSit(true);

    // Jouer un son
    playSound("couch_sit.mp3", this.position);

    return true;
  }

  /**
   * Le personnage se lève du canapé
   */
  stand(): boolean {
    if (!this.isOccupied) {
      console.log(`[Couch ${this.id}] Personne n'est assis sur ce canapé.`);
      return false;
    }

    this.isOccupied = false;
    this.occupantId = undefined;

    // Animation de lever
    this.animateSit(false);

    // Jouer un son
    playSound("couch_stand.mp3", this.position);

    return true;
  }

  /**
   * Anime l'assise/lever
   */
  private animateSit(sitting: boolean): void {
    if (!this.group) return;

    this.animationState.sitting = sitting;
    this.animationState.sittingProgress = sitting ? 0 : 1;

    // Si c'est un canapé gaming avec mécanismes
    if (this.type === "gaming" && this.shake) {
      const targetY = sitting ? D.clearance - 0.05 : D.clearance;
      this.shake.position.y = targetY;
    }
  }

  /**
   * Anime le rebond (quand un personnage s'assoit)
   */
  private animateBounce(): void {
    if (!this.group) return;

    this.animationState.bouncing = true;
    this.animationState.bounceProgress = 0;

    // Si c'est un canapé avec ressorts
    if (this.type === "gaming" || this.type === "chesterfield") {
      // Animation de rebond
      const bounce = () => {
        if (!this.group) return;

        this.animationState.bounceProgress += 0.05;
        if (this.animationState.bounceProgress >= 1) {
          this.animationState.bouncing = false;
          return;
        }

        const progress = this.animationState.bounceProgress;
        const offset = Math.sin(progress * Math.PI) * 0.03;

        if (this.shake) {
          this.shake.position.y = D.clearance + offset;
        }

        requestAnimationFrame(bounce);
      };
      bounce();
    }
  }

  // ==========================================
  // 🔄 6. MISE À JOUR (Tick)
  // ==========================================

  /**
   * Met à jour le canapé (à appeler dans la boucle de jeu)
   */
  tick(dt: number, elapsed: number, speed: number = 0, steer: number = 0, throttle: number = 0, braking: boolean = false): void {
    if (!this.group) return;

    // Animation d'assise
    if (this.animationState.sitting) {
      this.animationState.sittingProgress += dt * 0.002;
      if (this.animationState.sittingProgress >= 1) {
        this.animationState.sittingProgress = 1;
        this.animateBounce(); // Rebond après s'être assis
      }
    } else {
      this.animationState.sittingProgress -= dt * 0.002;
      if (this.animationState.sittingProgress <= 0) {
        this.animationState.sittingProgress = 0;
      }
    }

    // Animation de rebond
    if (this.animationState.bouncing) {
      // Géré dans animateBounce()
    }

    // Animation pour les canapés gaming motorisés
    if (this.type === "gaming" && this.wheels.length > 0) {
      this.animateGamingCouch(dt, elapsed, speed, steer, throttle, braking);
    }

    // Mettre à jour les dommages (vieillissement)
    this.damages.forEach(damage => {
      if (!damage.repaired) {
        damage.age += dt;
        // Après un certain temps, les dommages peuvent s'aggraver
        if (damage.age > 86400000) { // 1 jour
          damage.severity = Math.min(100, damage.severity + 1);
          this.updateCondition();
        }
      }
    });
  }

  /**
   * Anime un canapé gaming motorisé
   */
  private animateGamingCouch(dt: number, elapsed: number, speed: number, steer: number, throttle: number, braking: boolean): void {
    if (!this.group || !this.wheels || !this.shake) return;

    // Rotation des roues
    const spin = (speed / D.wheelR) * dt;
    for (const wheel of this.wheels) {
      wheel.rotation.x += spin;
      if (wheel.userData.front) {
        const t = steer * 0.52;
        wheel.rotation.y += (t - wheel.rotation.y) * Math.min(1, dt * 9);
      }
    }

    // Rotation du volant
    if (this.steering) {
      const t = -steer * Math.PI * 0.85;
      this.steering.rotation.z += (t - this.steering.rotation.z) * Math.min(1, dt * 11);
    }

    // Mouvement du châssis (suspension)
    const on = Math.abs(speed) > 0.15 || throttle > 0.05;
    if (this.shake) {
      if (on) {
        const rpm = 1 + throttle * 3;
        const amp = 0.008 * (1.6 - throttle * 0.9);
        this.shake.position.y = D.clearance + Math.sin(elapsed * 42 * rpm) * amp;
        this.shake.rotation.z = Math.sin(elapsed * 38 * rpm) * amp * 0.7;
      } else {
        this.shake.position.y += (D.clearance - this.shake.position.y) * Math.min(1, dt * 8);
        this.shake.rotation.z += (0 - this.shake.rotation.z) * Math.min(1, dt * 8);
      }
    }

    // Animation des pièces du moteur
    this.group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.userData.couchPulley) {
        obj.rotation.x += dt * 24 * (1 + throttle * 3) * (on ? 1 : 0);
      }
      if (obj.userData.couchBelt) {
        obj.rotation.z += dt * 8 * (1 + throttle * 3) * (on ? 1 : 0);
      }
      if (obj.userData.couchTip) {
        const m = obj.material as THREE.MeshStandardMaterial;
        m.emissive.setHex(0xd06030);
        m.emissiveIntensity = on ? Math.min(1, throttle * 1.2) * 0.35 : 0;
      }
      if (obj.userData.couchBrake) {
        const m = obj.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = braking ? 2.2 : 0.15;
      }
    });
  }

  // ==========================================
  // 💾 7. SAUVEGARDE & CHARGEMENT
  // ==========================================

  /**
   * Exporte les données du canapé pour la sauvegarde
   */
  exportData(): {
    id: string;
    type: CouchType;
    material: CouchMaterial;
    color: number;
    condition: CouchCondition;
    damages: CouchDamage[];
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    isOccupied: boolean;
    occupantId?: string;
    comfort: number;
    cleanliness: number;
  } {
    return {
      id: this.id,
      type: this.type,
      material: this.material,
      color: this.color,
      condition: this.condition,
      damages: this.damages,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
      scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      isOccupied: this.isOccupied,
      occupantId: this.occupantId,
      comfort: this.comfort,
      cleanliness: this.cleanliness,
    };
  }

  /**
   * Charge les données d'un canapé
   */
  importData(data: {
    id: string;
    type: CouchType;
    material: CouchMaterial;
    color: number;
    condition: CouchCondition;
    damages: CouchDamage[];
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    isOccupied: boolean;
    occupantId?: string;
    comfort: number;
    cleanliness: number;
  }): void {
    this.id = data.id;
    this.type = data.type;
    this.material = data.material;
    this.color = data.color;
    this.condition = data.condition;
    this.damages = data.damages;
    this.position = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
    this.rotation = new THREE.Euler(data.rotation.x, data.rotation.y, data.rotation.z);
    this.scale = new THREE.Vector3(data.scale.x, data.scale.y, data.scale.z);
    this.isOccupied = data.isOccupied;
    this.occupantId = data.occupantId;
    this.comfort = data.comfort;
    this.cleanliness = data.cleanliness;

    // Reconstruire le modèle
    this.group.removeFromParent();
    this.group = this.buildGroup();
    this.group.position.copy(this.position);
    this.group.rotation.copy(this.rotation);
    this.group.scale.copy(this.scale);

    // Appliquer les dommages
    this.applyDamages();
  }
}

// ==========================================
// 🛋 8. FONCTIONS DE CRÉATION (Compatibilité Ascendante)
// ==========================================

/**
 * Fonction utilitaire pour assombrir une couleur
 */
function darken(color: number, f: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * f);
  const g = Math.floor(((color >> 8) & 0xff) * f);
  const b = Math.floor((color & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

/**
 * Crée un canapé avec les options par défaut (compatibilité avec l'ancien code)
 */
export function buildCouch(colorIndex: number = 0): THREE.Group {
  const couch = new Couch({ colorIndex });
  return couch.group;
}

/**
 * Met à jour un canapé (compatibilité avec l'ancien code)
 */
export function tickCouch(
  group: THREE.Group,
  dt: number,
  elapsed: number,
  speed: number = 0,
  steer: number = 0,
  throttle: number = 0,
  braking: boolean = false
): void {
  const couch = group.userData.couch as Couch | undefined;
  if (couch) {
    couch.tick(dt, elapsed, speed, steer, throttle, braking);
  }
}

// ==========================================
// 🏭 9. CLASSE COUCH MANAGER (Gestion Globale)
// ==========================================

/**
 * Gestionnaire global des canapés
 */
export class CouchManager {
  private couches: Map<string, Couch> = new Map();
  private lastId: number = 0;

  /**
   * Crée un nouveau canapé
   */
  createCouch(options: CouchOptions = {}): Couch {
    const couch = new Couch(options);
    this.couches.set(couch.id, couch);
    return couch;
  }

  /**
   * Récupère un canapé par son ID
   */
  getCouch(id: string): Couch | undefined {
    return this.couches.get(id);
  }

  /**
   * Récupère tous les canapés
   */
  getAllCouches(): Couch[] {
    return [...this.couches.values()];
  }

  /**
   * Récupère les canapés dans une zone
   */
  getCouchesInArea(x: number, z: number, radius: number = 50): Couch[] {
    return this.getAllCouches().filter(couch => {
      const dx = couch.position.x - x;
      const dz = couch.position.z - z;
      return dx * dx + dz * dz <= radius * radius;
    });
  }

  /**
   * Récupère les canapés occupés
   */
  getOccupiedCouches(): Couch[] {
    return this.getAllCouches().filter(couch => couch.isOccupied);
  }

  /**
   * Récupère les canapés libres
   */
  getFreeCouches(): Couch[] {
    return this.getAllCouches().filter(couch => !couch.isOccupied);
  }

  /**
   * Supprime un canapé
   */
  removeCouch(id: string): boolean {
    const couch = this.couches.get(id);
    if (!couch) return false;

    if (couch.group.parent) {
      couch.group.parent.remove(couch.group);
    }

    this.couches.delete(id);
    return true;
  }

  /**
   * Nettoie tous les canapés
   */
  clearAll(): void {
    for (const couch of this.couches.values()) {
      if (couch.group.parent) {
        couch.group.parent.remove(couch.group);
      }
    }
    this.couches.clear();
  }

  /**
   * Met à jour tous les canapés
   */
  tickAll(dt: number, elapsed: number): void {
    for (const couch of this.couches.values()) {
      couch.tick(dt, elapsed);
    }
  }

  /**
   * Exporte les données de tous les canapés
   */
  exportData(): {
    couches: Array<ReturnType<Couch["exportData"]>>;
  } {
    return {
      couches: this.getAllCouches().map(couch => couch.exportData()),
    };
  }

  /**
   * Charge les données des canapés
   */
  importData(data: {
    couches?: Array<Parameters<Couch["importData"]>[0]>;
  }): void {
    if (data.couches) {
      data.couches.forEach(couchData => {
        const couch = new Couch();
        couch.importData(couchData);
        this.couches.set(couch.id, couch);
      });
    }
  }
}

// Instance globale du gestionnaire de canapés
export const couchManager = new CouchManager();

// ==========================================
// 📤 EXPORTS
// ==========================================

/* Duplicate exports removed */



