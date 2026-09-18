import * as THREE from "three";
import { getGeo } from "./geo";
import { matLib } from "./materials";
import { buildFromMeta, MODEL_ALIAS, MODEL_CATEGORIES, placeableModels } from "./models";
import { isDeadPose } from "./corpses";
import { isInjuredClip } from "./injured";

// __BUILDER_LOCAL_HELPERS__
function box(w: number, h: number, d: number, y: number, color: number, rough = 0.8) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: rough })
  );
  m.position.y = y;
  return m;
}

function mesh(type: string, params: Record<string, number>, color: number, y: number, rough = 0.8) {
  let geo: THREE.BufferGeometry;
  switch (type) {
    case "box":      geo = new THREE.BoxGeometry(params.w ?? 1, params.h ?? 1, params.d ?? 1); break;
    case "cylinder": geo = new THREE.CylinderGeometry(params.r ?? 0.5, params.r2 ?? params.r ?? 0.5, params.h ?? 1, params.seg ?? 8); break;
    case "sphere":   geo = new THREE.SphereGeometry(params.r ?? 0.5, params.seg ?? 8, params.seg ?? 8); break;
    case "cone":     geo = new THREE.ConeGeometry(params.r ?? 0.5, params.h ?? 1, params.seg ?? 8); break;
    case "torus":    geo = new THREE.TorusGeometry(params.r ?? 0.5, params.tube ?? 0.1, params.seg ?? 12, params.seg ?? 12); break;
    default:         geo = new THREE.BoxGeometry(1, 1, 1);
  }
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: rough }));
  m.position.y = y;
  return m;
}
// __END_BUILDER_LOCAL_HELPERS__

// ============================================================================
// 🔹 TYPES ET INTERFACES RP
// ============================================================================

/** Identifiant unique d'un prop. */
export type PropId = string;

/** Type pour les ressources du jeu. */
export type ResourceType = "wood" | "stone" | "metal" | "money" | "glass" | "fabric" | "plastic" | "concrete";

/** Quantité de ressources. */
export type ResourceCost = Partial<Record<ResourceType, number>>;

/** Niveau de réputation (1-5 étoiles). */
export type ReputationLevel = 1 | 2 | 3 | 4 | 5;

/** Trait environnemental ou thématique. */
export type PropTrait =
  | "ecologique"
  | "polluant"
  | "industriel"
  | "agricole"
  | "rural"
  | "urbain"
  | "historique"
  | "moderne"
  | "saisonnier_hiver"
  | "saisonnier_ete"
  | "saisonnier_automne"
  | "saisonnier_printemps"
  | "interactif"
  | "destructible"
  | "mobile"
  | "eclairage"
  | "sonore";

/** Saison de l'année. */
export type Season = "hiver" | "ete" | "automne" | "printemps";

/** Type de terrain compatible. */
export type TerrainType = "grass" | "dirt" | "sand" | "road" | "water" | "snow" | "rock";

/** Style visuel pour les props personnalisables. */
export type PropStyle = {
  color?: number; // Couleur principale (hex)
  material?: string; // Matériau (ex: "bois", "métal")
  variant?: string; // Variante (ex: "rustique", "moderne")
};

/** Définition d'un prop enrichi pour le RP. */
export interface PropDef {
  id: PropId;
  label: string;
  cat: string;
  description?: string;
  cost?: ResourceCost; // Coût en ressources
  buildTime?: number; // Temps de construction (en secondes de jeu)
  requiredLevel?: number; // Niveau minimum pour débloquer
  reputationImpact?: number; // Impact sur la réputation (-2 à +2 étoiles)
  traits?: PropTrait[]; // Traits du prop
  compatibleTerrains?: TerrainType[]; // Terrains compatibles
  seasons?: Season[]; // Saisons où le prop est disponible
  durability?: number; // Durabilité (1-100)
  maintenanceCost?: ResourceCost; // Coût de maintenance (par jour de jeu)
  styles?: PropStyle[]; // Styles disponibles
  isInteractive?: boolean; // Peut être interactif
  isDestructible?: boolean; // Peut être détruit
  isMovable?: boolean; // Peut être déplacé
  collision?: {
    width: number;
    height: number;
    depth: number;
  }; // Boîte de collision
  sound?: {
    place?: string; // Son lors du placement
    interact?: string; // Son lors de l'interaction
    ambient?: string; // Son ambiant (ex: feu de camp)
  };
  light?: {
    color?: number; // Couleur de la lumière
    intensity?: number; // Intensité
    distance?: number; // Portée
  }; // Propriétés d'éclairage
  particles?: {
    type: string; // Type de particules (ex: "fumée", "poussière")
    rate?: number; // Taux d'émission
  }; // Effets de particules
  prerequisites?: {
    props?: PropId[]; // Props requis à proximité
    distance?: number; // Distance maximale
  }; // Prérequis de placement
  quests?: {
    id: string;
    title: string;
    description: string;
    reward: {
      reputation?: number;
      resources?: ResourceCost;
      unlocks?: PropId[]; // Props débloqués après la quête
    };
  }[]; // Quêtes associées
}

/** Prop placé dans le monde. */
export interface PlacedProp {
  id: string;
  type: PropId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  style?: PropStyle; // Style appliqué
  durability?: number; // Durabilité actuelle
  isBroken?: boolean; // Est-ce cassé ?
  isActive?: boolean; // Est-ce actif (ex: feu de camp allumé) ?
  placedAt?: number; // Timestamp de placement (en jours de jeu)
  lastMaintenance?: number; // Dernière maintenance (en jours de jeu)
  owner?: string; // Propriétaire (ID du joueur ou village)
}

/** Définition d'une quête liée à un prop. */
export interface PropQuest {
  id: string;
  title: string;
  description: string;
  objective: {
    type: "place" | "interact" | "repair" | "destroy";
    target: PropId;
    count: number; // Nombre requis
  };
  progress: number;
  reward: {
    reputation?: number;
    resources?: ResourceCost;
    unlocks?: PropId[];
  };
  expiry?: number; // Date d'expiration (en jours de jeu)
}

// ============================================================================
// 🌍 CATALOGUE DE PROPS — ENRICHI POUR LE RP RÉALISTE QUÉBÉCOIS
// ============================================================================

// 🔹 Coûts de base pour les ressources (en $)
export const RESOURCE_BASE_COST: Record<ResourceType, number> = {
  wood: 5,
  stone: 10,
  metal: 15,
  money: 1,
  glass: 8,
  fabric: 12,
  plastic: 7,
  concrete: 12,
};

// 🔹 Catalogue principal
export const PROP_CATALOG: { cat: string; items: PropDef[] }[] = [
  // --- PRIMITIVES (base pour le mode créateur) ---
  {
    cat: "Primitives",
    items: [
      {
        id: "cube",
        label: "Cube",
        cat: "Primitives",
        cost: { money: 10 },
        buildTime: 0,
        traits: ["neutre"],
        compatibleTerrains: ["grass", "dirt", "sand", "road", "snow", "rock"],
      },
      {
        id: "sphere",
        label: "Sphère",
        cat: "Primitives",
        cost: { money: 10 },
        buildTime: 0,
        traits: ["neutre"],
        compatibleTerrains: ["grass", "dirt", "sand", "road", "snow", "rock"],
      },
      {
        id: "cylinder",
        label: "Cylindre",
        cat: "Primitives",
        cost: { money: 10 },
        buildTime: 0,
        traits: ["neutre"],
        compatibleTerrains: ["grass", "dirt", "sand", "road", "snow", "rock"],
      },
      {
        id: "plane",
        label: "Dalle",
        cat: "Primitives",
        cost: { money: 10 },
        buildTime: 0,
        traits: ["neutre"],
        compatibleTerrains: ["grass", "dirt", "sand", "road", "snow", "rock"],
      },
    ],
  },

  // --- VIE URBAINE QUÉBÉCOISE ---
  {
    cat: "Mobilier urbain",
    items: [
      {
        id: "bus_stop_quebec",
        label: "Arrêt d'autobus",
        cat: "Mobilier urbain",
        description: "Abribus typique avec banc intégré. Améliore la réputation de la ville.",
        cost: { metal: 20, glass: 15, money: 100 },
        buildTime: 30,
        reputationImpact: 1,
        traits: ["urbain", "ecologique"],
        compatibleTerrains: ["road", "dirt"],
        durability: 90,
        maintenanceCost: { money: 5 },
        collision: { width: 2, height: 2.5, depth: 1.5 },
        prerequisites: { distance: 2 }, // Doit être près d'une route
      },
      {
        id: "street_lamp",
        label: "Lampadaire",
        cat: "Mobilier urbain",
        description: "Éclaire les rues la nuit. Réduit les crimes dans la zone.",
        cost: { metal: 15, glass: 5, money: 80 },
        buildTime: 20,
        reputationImpact: 0.5,
        traits: ["urbain", "eclairage"],
        compatibleTerrains: ["road", "dirt"],
        durability: 85,
        maintenanceCost: { money: 3 },
        light: { color: 0xffd88a, intensity: 1.5, distance: 10 },
        collision: { width: 0.2, height: 4, depth: 0.2 },
      },
      {
        id: "park_bench",
        label: "Banc de parc",
        cat: "Mobilier urbain",
        description: "Banc en bois pour les parcs. Augmente la satisfaction des citoyens.",
        cost: { wood: 10, metal: 5, money: 50 },
        buildTime: 10,
        reputationImpact: 0.5,
        traits: ["urbain", "ecologique"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 80,
        maintenanceCost: { wood: 1, money: 2 },
        collision: { width: 1.6, height: 1, depth: 0.5 },
        styles: [
          { color: 0x5a4030, material: "bois", variant: "classique" },
          { color: 0x8a8a8a, material: "métal", variant: "moderne" },
        ],
      },
      {
        id: "trash_bin",
        label: "Poubelle publique",
        cat: "Mobilier urbain",
        description: "Poubelle standard. Doit être vidée régulièrement.",
        cost: { metal: 10, plastic: 5, money: 40 },
        buildTime: 10,
        reputationImpact: -0.5, // Sans maintenance, impact négatif
        traits: ["urbain"],
        compatibleTerrains: ["road", "dirt", "grass"],
        durability: 70,
        maintenanceCost: { money: 2 },
        collision: { width: 0.6, height: 1, depth: 0.6 },
      },
      {
        id: "recycling_bin",
        label: "Bac de recyclage",
        cat: "Mobilier urbain",
        description: "Bac de recyclage. Améliore la réputation écologique.",
        cost: { metal: 15, plastic: 10, money: 60 },
        buildTime: 15,
        reputationImpact: 1,
        traits: ["urbain", "ecologique"],
        compatibleTerrains: ["road", "dirt", "grass"],
        durability: 75,
        maintenanceCost: { money: 3 },
        collision: { width: 0.8, height: 1.2, depth: 0.8 },
        quests: [
          {
            id: "recycle_5",
            title: "Recyclage citoyen",
            description: "Placez 5 bacs de recyclage pour obtenir un bonus de réputation.",
            objective: { type: "place", target: "recycling_bin", count: 5 },
            progress: 0,
            reward: { reputation: 2, resources: { money: 100 } },
          },
        ],
      },
      {
        id: "fire_hydrant",
        label: "Bouche d'incendie",
        cat: "Mobilier urbain",
        description: "Essentielle pour la sécurité incendie. Réduit les risques d'incendie.",
        cost: { metal: 25, money: 120 },
        buildTime: 25,
        reputationImpact: 0.5,
        traits: ["urbain", "industriel"],
        compatibleTerrains: ["road"],
        durability: 95,
        maintenanceCost: { money: 5 },
        collision: { width: 0.4, height: 0.8, depth: 0.4 },
      },
      {
        id: "traffic_cone",
        label: "Cône orange",
        cat: "Mobilier urbain",
        description: "Utilisé pour les travaux routiers ou les zones dangereuses.",
        cost: { plastic: 2, money: 10 },
        buildTime: 2,
        traits: ["urbain", "mobile"],
        compatibleTerrains: ["road", "dirt"],
        durability: 50,
        isMovable: true,
        collision: { width: 0.4, height: 0.8, depth: 0.4 },
      },
      {
        id: "jersey_barrier",
        label: "Mur Jersey",
        cat: "Mobilier urbain",
        description: "Barrière de sécurité pour les chantiers.",
        cost: { concrete: 5, money: 40 },
        buildTime: 10,
        traits: ["urbain", "industriel"],
        compatibleTerrains: ["road", "dirt"],
        durability: 90,
        collision: { width: 2.4, height: 1, depth: 0.5 },
      },
      {
        id: "parking_meter",
        label: "Parcomètre",
        cat: "Mobilier urbain",
        description: "Collecte des revenus pour la ville. Peut être vandalisé.",
        cost: { metal: 10, money: 80 },
        buildTime: 10,
        reputationImpact: -0.2, // Peut être mal perçu
        traits: ["urbain"],
        compatibleTerrains: ["road"],
        durability: 60,
        isDestructible: true,
        collision: { width: 0.2, height: 1.2, depth: 0.2 },
      },
      {
        id: "mailbox_urban",
        label: "Boîte aux lettres",
        cat: "Mobilier urbain",
        description: "Boîte aux lettres standard pour les rues.",
        cost: { metal: 5, money: 25 },
        buildTime: 5,
        traits: ["urbain"],
        compatibleTerrains: ["road", "dirt"],
        durability: 80,
        collision: { width: 0.3, height: 1, depth: 0.2 },
      },
    ],
  },

  // --- VIE RURALE (RANGS, FERMES, ÉRABLIÈRES) ---
  {
    cat: "Vie rurale",
    items: [
      {
        id: "rural_mailbox",
        label: "Boîte aux lettres rurale",
        cat: "Vie rurale",
        description: "Boîte aux lettres sur pied, typique des campagnes.",
        cost: { wood: 5, metal: 3, money: 20 },
        buildTime: 5,
        reputationImpact: 0.2,
        traits: ["rural", "ecologique"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 85,
        collision: { width: 0.4, height: 1.2, depth: 0.2 },
      },
      {
        id: "wooden_fence",
        label: "Clôture de rang",
        cat: "Vie rurale",
        description: "Clôture en bois pour délimiter les terres agricoles.",
        cost: { wood: 2, money: 10 },
        buildTime: 5,
        traits: ["rural", "agricole", "ecologique"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 70,
        maintenanceCost: { wood: 1, money: 1 },
        collision: { width: 2.6, height: 1.3, depth: 0.1 },
        prerequisites: { props: ["wooden_fence"], distance: 2 }, // S'aligne avec d'autres clôtures
      },
      {
        id: "hay_bale",
        label: "Botte de foin",
        cat: "Vie rurale",
        description: "Utilisée pour nourrir les animaux ou comme décoration.",
        cost: { wood: 1, money: 5 },
        buildTime: 2,
        traits: ["rural", "agricole", "mobile"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 60,
        isMovable: true,
        collision: { width: 1.1, height: 0.9, depth: 1.1 },
      },
      {
        id: "grain_silo",
        label: "Silo à grain",
        cat: "Vie rurale",
        description: "Stockage de grain pour les fermes. Peut être rempli ou vidé.",
        cost: { metal: 30, money: 150 },
        buildTime: 60,
        reputationImpact: 0.5,
        traits: ["rural", "agricole", "industriel"],
        compatibleTerrains: ["dirt"],
        durability: 95,
        maintenanceCost: { metal: 1, money: 5 },
        collision: { width: 2.5, height: 4, depth: 2.5 },
        isInteractive: true,
      },
      {
        id: "log_stack",
        label: "Pile de bois",
        cat: "Vie rurale",
        description: "Pile de bois de chauffage. Peut être utilisée dans un foyer.",
        cost: { wood: 10, money: 20 },
        buildTime: 10,
        traits: ["rural", "ecologique"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 80,
        collision: { width: 1.5, height: 1.5, depth: 1.5 },
        prerequisites: { props: ["sugar_shack", "fire_pit"], distance: 5 }, // Doit être près d'une source de chaleur
      },
      {
        id: "sugar_shack",
        label: "Cabane à sucre",
        cat: "Vie rurale",
        description: "Lieu emblématique du Québec. Produit du sirop d'érable au printemps.",
        cost: { wood: 50, stone: 20, money: 300 },
        buildTime: 120,
        reputationImpact: 2,
        traits: ["rural", "agricole", "historique", "saisonnier_printemps"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 90,
        maintenanceCost: { wood: 2, money: 10 },
        collision: { width: 3, height: 2.5, depth: 2.5 },
        light: { color: 0xffaa44, intensity: 1, distance: 8 }, // Lumière chaude
        particles: { type: "fumée", rate: 0.5 }, // Fumée de cheminée
        quests: [
          {
            id: "maple_season",
            title: "Saison des sucres",
            description: "Placez une cabane à sucre et 3 érables pour débloquer un bonus de réputation.",
            objective: { type: "place", target: "maple_tree", count: 3 },
            progress: 0,
            reward: { reputation: 3, resources: { money: 200 } },
          },
        ],
      },
      {
        id: "maple_tree",
        label: "Érable à sucre",
        cat: "Vie rurale",
        description: "Arbre emblématique du Québec. Produit de la sève au printemps.",
        cost: { wood: 5, money: 50 },
        buildTime: 30,
        reputationImpact: 0.3,
        traits: ["rural", "agricole", "saisonnier_printemps"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 100,
        seasons: ["printemps", "ete", "automne"], // Disparaît en hiver (remplacé par un arbre nu)
        collision: { width: 2, height: 3, depth: 2 },
      },
      {
        id: "spruce_tree",
        label: "Épinette",
        cat: "Vie rurale",
        description: "Arbre conifère typique des forêts québécoises.",
        cost: { wood: 3, money: 20 },
        buildTime: 20,
        reputationImpact: 0.2,
        traits: ["rural", "ecologique"],
        compatibleTerrains: ["dirt", "grass", "snow"],
        durability: 100,
        seasons: ["hiver", "ete", "automne", "printemps"],
        collision: { width: 1.5, height: 4, depth: 1.5 },
      },
      {
        id: "birch_tree",
        label: "Bouleau",
        cat: "Vie rurale",
        description: "Arbre à l'écorce blanche, typique des forêts nordiques.",
        cost: { wood: 3, money: 20 },
        buildTime: 20,
        reputationImpact: 0.2,
        traits: ["rural", "ecologique"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 95,
        seasons: ["ete", "automne", "printemps"],
        collision: { width: 1.5, height: 3.5, depth: 1.5 },
      },
      {
        id: "tractor",
        label: "Tracteur",
        cat: "Vie rurale",
        description: "Véhicule agricole pour les travaux des champs.",
        cost: { metal: 40, money: 200 },
        buildTime: 60,
        reputationImpact: 0.5,
        traits: ["rural", "agricole", "mobile", "industriel"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 80,
        maintenanceCost: { metal: 2, money: 10 },
        collision: { width: 1.5, height: 1.2, depth: 2.5 },
        isMovable: true,
        sound: { place: "tractor_start", interact: "tractor_engine" },
      },
      {
        id: "wagon",
        label: "Char à foin",
        cat: "Vie rurale",
        description: "Remorque pour transporter du foin ou d'autres matériaux.",
        cost: { wood: 20, metal: 10, money: 80 },
        buildTime: 30,
        traits: ["rural", "agricole", "mobile"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 70,
        isMovable: true,
        collision: { width: 2, height: 1, depth: 1.2 },
      },
      {
        id: "cow",
        label: "Vache laitière",
        cat: "Vie rurale",
        description: "Animal de ferme. Produit du lait et améliore la réputation agricole.",
        cost: { money: 150 },
        buildTime: 10,
        reputationImpact: 0.5,
        traits: ["rural", "agricole", "mobile"],
        compatibleTerrains: ["grass"],
        durability: 100, // Les animaux ne se dégradent pas
        isMovable: true,
        collision: { width: 1.5, height: 1.2, depth: 0.8 },
        sound: { ambient: "cow_moo" },
      },
    ],
  },

  // --- STRUCTURES & BÂTIMENTS ---
  {
    cat: "Structures",
    items: [
      {
        id: "wall",
        label: "Mur",
        cat: "Structures",
        description: "Mur de base pour les constructions.",
        cost: { stone: 10, money: 40 },
        buildTime: 20,
        traits: ["neutre"],
        compatibleTerrains: ["grass", "dirt", "sand", "snow"],
        durability: 90,
        collision: { width: 3.2, height: 2.2, depth: 0.3 },
        styles: [
          { color: 0x8a6a4a, material: "pierre" },
          { color: 0x6a5040, material: "bois" },
          { color: 0xc0c0c0, material: "béton" },
        ],
      },
      {
        id: "pillar",
        label: "Pilier",
        cat: "Structures",
        description: "Pilier de soutien pour les structures.",
        cost: { stone: 5, money: 20 },
        buildTime: 10,
        traits: ["neutre"],
        compatibleTerrains: ["grass", "dirt", "sand", "snow"],
        durability: 95,
        collision: { width: 0.5, height: 3.2, depth: 0.5 },
      },
      {
        id: "ramp",
        label: "Rampe",
        cat: "Structures",
        description: "Rampe pour accéder à des zones surélevées.",
        cost: { wood: 10, money: 30 },
        buildTime: 15,
        traits: ["neutre"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 80,
        collision: { width: 2.4, height: 0.2, depth: 3.2 },
      },
      {
        id: "arch",
        label: "Arche",
        cat: "Structures",
        description: "Arche décorative ou fonctionnelle.",
        cost: { stone: 15, money: 50 },
        buildTime: 25,
        traits: ["historique", "ecologique"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 90,
        collision: { width: 2.6, height: 2.4, depth: 0.5 },
      },
      {
        id: "scaffolding",
        label: "Échafaudage",
        cat: "Structures",
        description: "Structure temporaire pour les chantiers.",
        cost: { metal: 20, money: 60 },
        buildTime: 20,
        traits: ["industriel"],
        compatibleTerrains: ["dirt", "road"],
        durability: 70,
        maintenanceCost: { metal: 1, money: 3 },
        collision: { width: 2, height: 3, depth: 1.2 },
      },
      {
        id: "portable_toilet",
        label: "Toilette chimique",
        cat: "Structures",
        description: "Toilette temporaire pour les événements.",
        cost: { plastic: 10, money: 50 },
        buildTime: 10,
        reputationImpact: -0.5, // Peu esthétique
        traits: ["industriel", "mobile"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 60,
        isMovable: true,
        collision: { width: 1.2, height: 2.2, depth: 1.2 },
      },
      {
        id: "storage_shed",
        label: "Hangar de rangement",
        cat: "Structures",
        description: "Hangar pour stocker des outils et équipements.",
        cost: { wood: 30, metal: 10, money: 100 },
        buildTime: 40,
        reputationImpact: 0.3,
        traits: ["rural", "agricole"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 85,
        maintenanceCost: { wood: 1, money: 5 },
        collision: { width: 2.6, height: 2.2, depth: 2 },
        styles: [
          { color: 0x6a5040, material: "bois" },
          { color: 0x8a8a8a, material: "métal" },
        ],
      },
    ],
  },

  // --- COMMERCE & SERVICES ---
  {
    cat: "Commerce",
    items: [
      {
        id: "atm",
        label: "GAB (bancomat)",
        cat: "Commerce",
        description: "Guichet automatique. Génère des revenus passifs.",
        cost: { metal: 15, glass: 5, money: 200 },
        buildTime: 30,
        reputationImpact: 0.5,
        traits: ["urbain", "industriel"],
        compatibleTerrains: ["road", "dirt"],
        durability: 80,
        maintenanceCost: { money: 10 },
        collision: { width: 0.6, height: 1.5, depth: 0.5 },
        light: { color: 0x88ccee, intensity: 0.5, distance: 3 }, // Écran lumineux
        sound: { interact: "atm_beep" },
      },
      {
        id: "gas_pump",
        label: "Pompe à essence",
        cat: "Commerce",
        description: "Pompe à essence pour les véhicules. Génère des revenus.",
        cost: { metal: 25, glass: 10, money: 300 },
        buildTime: 40,
        reputationImpact: 0.3,
        traits: ["urbain", "industriel"],
        compatibleTerrains: ["road"],
        durability: 75,
        maintenanceCost: { money: 15 },
        collision: { width: 0.6, height: 1.6, depth: 0.5 },
        isInteractive: true,
        sound: { interact: "pump_fuel" },
      },
      {
        id: "shop_shelf",
        label: "Étagère",
        cat: "Commerce",
        description: "Étagère pour exposer des marchandises.",
        cost: { wood: 10, metal: 5, money: 50 },
        buildTime: 10,
        traits: ["urbain", "commerce"],
        compatibleTerrains: ["dirt", "road", "grass"],
        durability: 70,
        collision: { width: 1.5, height: 1.8, depth: 0.5 },
        styles: [
          { color: 0x6a5040, material: "bois" },
          { color: 0x8a8a8a, material: "métal" },
        ],
      },
      {
        id: "cash_register",
        label: "Caisse enregistreuse",
        cat: "Commerce",
        description: "Caisse pour les transactions commerciales.",
        cost: { metal: 5, money: 80 },
        buildTime: 5,
        traits: ["urbain", "commerce"],
        compatibleTerrains: ["dirt", "road", "grass"],
        durability: 80,
        collision: { width: 0.5, height: 0.3, depth: 0.4 },
        sound: { interact: "cash_register_cha_ching" },
      },
      {
        id: "shopping_cart",
        label: "Panier d'épicerie",
        cat: "Commerce",
        description: "Panier pour les clients. Peut être poussé.",
        cost: { metal: 3, money: 20 },
        buildTime: 2,
        traits: ["urbain", "mobile"],
        compatibleTerrains: ["road", "dirt"],
        durability: 60,
        isMovable: true,
        collision: { width: 0.7, height: 0.8, depth: 0.5 },
        sound: { interact: "cart_rattle" },
      },
      {
        id: "lcbo_shelf",
        label: "Étalage SAQ",
        cat: "Commerce",
        description: "Étalage pour les bouteilles d'alcool. Requiert un permis.",
        cost: { wood: 15, glass: 5, money: 120 },
        buildTime: 15,
        reputationImpact: -0.3, // Peut être mal perçu
        traits: ["urbain", "commerce"],
        compatibleTerrains: ["dirt", "road"],
        durability: 75,
        collision: { width: 1.3, height: 1.8, depth: 0.4 },
        prerequisites: { props: ["atm"], distance: 10 }, // Doit être près d'un commerce
      },
      {
        id: "neon_sign",
        label: "Néon commercial",
        cat: "Commerce",
        description: "Enseigne lumineuse pour attirer les clients.",
        cost: { metal: 10, glass: 10, money: 150 },
        buildTime: 20,
        reputationImpact: 0.5,
        traits: ["urbain", "eclairage"],
        compatibleTerrains: ["road", "dirt"],
        durability: 80,
        maintenanceCost: { money: 5 },
        light: { color: 0x3ad0e0, intensity: 2, distance: 15 },
        collision: { width: 1.7, height: 0.2, depth: 0.1 },
        sound: { interact: "neon_buzz" },
        styles: [
          { color: 0x3ad0e0, variant: "bleu" },
          { color: 0xff4444, variant: "rouge" },
          { color: 0xffe044, variant: "jaune" },
        ],
      },
    ],
  },

  // --- INDUSTRIEL & CHANTIER ---
  {
    cat: "Industriel",
    items: [
      {
        id: "oil_barrel",
        label: "Baril de pétrole",
        cat: "Industriel",
        description: "Baril pour stocker du pétrole ou des produits chimiques.",
        cost: { metal: 5, money: 30 },
        buildTime: 5,
        reputationImpact: -0.5, // Polluant
        traits: ["industriel", "polluant"],
        compatibleTerrains: ["dirt", "road"],
        durability: 80,
        collision: { width: 0.8, height: 0.95, depth: 0.8 },
        isMovable: true,
      },
      {
        id: "storage_tank",
        label: "Réservoir",
        cat: "Industriel",
        description: "Grand réservoir pour liquides ou gaz.",
        cost: { metal: 50, money: 200 },
        buildTime: 60,
        reputationImpact: -1, // Très polluant
        traits: ["industriel", "polluant"],
        compatibleTerrains: ["dirt"],
        durability: 95,
        maintenanceCost: { metal: 2, money: 10 },
        collision: { width: 3, height: 2.5, depth: 3 },
      },
      {
        id: "forklift",
        label: "Chariot élévateur",
        cat: "Industriel",
        description: "Véhicule pour soulever et déplacer des charges.",
        cost: { metal: 30, money: 150 },
        buildTime: 40,
        traits: ["industriel", "mobile"],
        compatibleTerrains: ["dirt", "road"],
        durability: 75,
        maintenanceCost: { metal: 1, money: 8 },
        collision: { width: 1.2, height: 1.8, depth: 2.2 },
        isMovable: true,
        sound: { interact: "forklift_engine" },
      },
      {
        id: "pallet",
        label: "Palette",
        cat: "Industriel",
        description: "Palette en bois pour le transport de marchandises.",
        cost: { wood: 2, money: 10 },
        buildTime: 2,
        traits: ["industriel", "mobile"],
        compatibleTerrains: ["dirt", "road", "grass"],
        durability: 60,
        isMovable: true,
        collision: { width: 1.2, height: 0.1, depth: 1 },
      },
      {
        id: "cement_bag",
        label: "Sac de ciment",
        cat: "Industriel",
        description: "Sac de ciment pour la construction.",
        cost: { money: 15 },
        buildTime: 1,
        traits: ["industriel"],
        compatibleTerrains: ["dirt", "road"],
        durability: 100, // Ne se dégrade pas
        isMovable: true,
        collision: { width: 0.6, height: 0.4, depth: 0.4 },
      },
      {
        id: "generator",
        label: "Génératrice",
        cat: "Industriel",
        description: "Génératrice électrique. Fournit de l'électricité aux bâtiments voisins.",
        cost: { metal: 20, money: 100 },
        buildTime: 30,
        reputationImpact: -0.2, // Bruyante
        traits: ["industriel", "sonore"],
        compatibleTerrains: ["dirt", "road"],
        durability: 80,
        maintenanceCost: { metal: 1, money: 5 },
        collision: { width: 1, height: 0.8, depth: 0.6 },
        sound: { ambient: "generator_hum" },
        light: { color: 0xffe0a0, intensity: 1, distance: 5 },
      },
      {
        id: "cement_mixer",
        label: "Bétonnière",
        cat: "Industriel",
        description: "Machine pour mélanger le béton.",
        cost: { metal: 25, money: 120 },
        buildTime: 35,
        traits: ["industriel", "sonore"],
        compatibleTerrains: ["dirt", "road"],
        durability: 70,
        maintenanceCost: { metal: 1, money: 6 },
        collision: { width: 1.5, height: 1, depth: 1 },
        sound: { interact: "cement_mixer_spin" },
      },
      {
        id: "electrical_box",
        label: "Boîtier électrique",
        cat: "Industriel",
        description: "Boîtier pour les connexions électriques.",
        cost: { metal: 5, money: 30 },
        buildTime: 5,
        traits: ["industriel"],
        compatibleTerrains: ["dirt", "road"],
        durability: 85,
        collision: { width: 0.7, height: 1, depth: 0.3 },
        light: { color: 0x88ccee, intensity: 0.3, distance: 2 }, // Voyant
      },
    ],
  },

  // --- NATURE & PAYSAGE ---
  {
    cat: "Nature",
    items: [
      {
        id: "rock",
        label: "Rocher de granit",
        cat: "Nature",
        description: "Rocher typique des Laurentides.",
        cost: { stone: 5, money: 10 },
        buildTime: 2,
        reputationImpact: 0.2,
        traits: ["ecologique"],
        compatibleTerrains: ["grass", "dirt", "rock"],
        durability: 100, // Indestructible
        collision: { width: 1, height: 0.8, depth: 1 },
        seasons: ["hiver", "ete", "automne", "printemps"],
      },
      {
        id: "bush",
        label: "Buisson",
        cat: "Nature",
        description: "Buisson sauvage. Cache les petits animaux.",
        cost: { money: 5 },
        buildTime: 1,
        reputationImpact: 0.1,
        traits: ["ecologique"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 70,
        collision: { width: 1, height: 0.5, depth: 1 },
        seasons: ["ete", "automne", "printemps"],
      },
      {
        id: "fern",
        label: "Fougère",
        cat: "Nature",
        description: "Plante typique des sous-bois québécois.",
        cost: { money: 3 },
        buildTime: 1,
        traits: ["ecologique"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 50,
        collision: { width: 0.8, height: 0.6, depth: 0.8 },
        seasons: ["ete", "automne", "printemps"],
      },
      {
        id: "wildflower",
        label: "Fleurs sauvages",
        cat: "Nature",
        description: "Fleurs des champs. Attire les pollinisateurs.",
        cost: { money: 2 },
        buildTime: 1,
        reputationImpact: 0.2,
        traits: ["ecologique"],
        compatibleTerrains: ["grass"],
        durability: 40,
        collision: { width: 0.5, height: 0.3, depth: 0.5 },
        seasons: ["ete", "printemps"],
      },
      {
        id: "dead_tree",
        label: "Arbre mort",
        cat: "Nature",
        description: "Arbre mort. Peut être coupé pour du bois.",
        cost: { money: 10 },
        buildTime: 5,
        reputationImpact: -0.2,
        traits: ["rural"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 50,
        collision: { width: 1.5, height: 2.5, depth: 1.5 },
        seasons: ["hiver", "ete", "automne", "printemps"],
        isDestructible: true, // Peut être coupé
      },
      {
        id: "stump",
        label: "Souche",
        cat: "Nature",
        description: "Souche d'arbre coupé.",
        cost: { wood: 1, money: 5 },
        buildTime: 1,
        traits: ["rural"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 100,
        collision: { width: 0.6, height: 0.4, depth: 0.6 },
        seasons: ["hiver", "ete", "automne", "printemps"],
      },
    ],
  },

  // --- ÉCLAIRAGE ---
  {
    cat: "Éclairage",
    items: [
      {
        id: "lamp_post",
        label: "Lampadaire",
        cat: "Éclairage",
        description: "Lampadaire classique pour éclairer les rues.",
        cost: { metal: 10, glass: 2, money: 60 },
        buildTime: 15,
        reputationImpact: 0.3,
        traits: ["urbain", "eclairage"],
        compatibleTerrains: ["road", "dirt"],
        durability: 80,
        maintenanceCost: { glass: 1, money: 3 },
        light: { color: 0xffd88a, intensity: 1.5, distance: 12 },
        collision: { width: 0.2, height: 4, depth: 0.2 },
      },
      {
        id: "spot",
        label: "Projecteur",
        cat: "Éclairage",
        description: "Projecteur puissant pour les chantiers ou événements.",
        cost: { metal: 8, glass: 2, money: 50 },
        buildTime: 10,
        traits: ["industriel", "eclairage"],
        compatibleTerrains: ["dirt", "road"],
        durability: 75,
        light: { color: 0xffe0a0, intensity: 2, distance: 15 },
        collision: { width: 0.3, height: 0.3, depth: 0.3 },
      },
      {
        id: "neon",
        label: "Néon",
        cat: "Éclairage",
        description: "Enseigne au néon pour les commerces.",
        cost: { metal: 5, glass: 10, money: 80 },
        buildTime: 10,
        reputationImpact: 0.5,
        traits: ["urbain", "eclairage"],
        compatibleTerrains: ["road", "dirt"],
        durability: 70,
        light: { color: 0x3ad0e0, intensity: 1.8, distance: 10 },
        collision: { width: 1.7, height: 0.2, depth: 0.1 },
        styles: [
          { color: 0x3ad0e0, variant: "bleu" },
          { color: 0xff4444, variant: "rouge" },
          { color: 0xffe044, variant: "jaune" },
        ],
      },
      {
        id: "lantern",
        label: "Lanterne",
        cat: "Éclairage",
        description: "Lanterne suspendue ou posée au sol.",
        cost: { metal: 3, glass: 2, money: 20 },
        buildTime: 5,
        reputationImpact: 0.2,
        traits: ["rural", "eclairage"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 60,
        light: { color: 0xffaa44, intensity: 1, distance: 5 },
        collision: { width: 0.3, height: 0.6, depth: 0.3 },
      },
      {
        id: "fire_pit",
        label: "Foyer extérieur",
        cat: "Éclairage",
        description: "Foyer pour les soirées en plein air. Réchauffe les joueurs à proximité.",
        cost: { stone: 10, wood: 5, money: 40 },
        buildTime: 15,
        reputationImpact: 0.5,
        traits: ["rural", "eclairage", "interactif", "sonore"],
        compatibleTerrains: ["dirt", "grass", "snow"],
        durability: 70,
        maintenanceCost: { wood: 1, money: 2 },
        light: { color: 0xff6622, intensity: 2, distance: 8 },
        particles: { type: "fumée", rate: 0.8 },
        sound: { ambient: "fire_crackle" },
        collision: { width: 1, height: 0.5, depth: 1 },
        isInteractive: true, // Peut être allumé/éteint
      },
      {
        id: "christmas_lights",
        label: "Guirlande de Noël",
        cat: "Éclairage",
        description: "Guirlande lumineuse pour les fêtes. Améliore la réputation en hiver.",
        cost: { plastic: 2, money: 15 },
        buildTime: 2,
        reputationImpact: 0.3,
        traits: ["eclairage", "saisonnier_hiver"],
        compatibleTerrains: ["grass", "dirt", "snow"],
        durability: 50,
        light: { color: 0xff4444, intensity: 0.5, distance: 3 },
        seasons: ["hiver"],
        collision: { width: 2, height: 0.1, depth: 0.1 },
      },
    ],
  },

  // --- DÉCOR QUÉBÉCOIS ---
  {
    cat: "Décor",
    items: [
      {
        id: "picnic_table",
        label: "Table à pique-nique",
        cat: "Décor",
        description: "Table pour les pique-niques en famille.",
        cost: { wood: 10, money: 40 },
        buildTime: 10,
        reputationImpact: 0.3,
        traits: ["rural", "ecologique"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 80,
        maintenanceCost: { wood: 1, money: 2 },
        collision: { width: 1.8, height: 0.8, depth: 1 },
      },
      {
        id: "bbq_grill",
        label: "Barbecue",
        cat: "Décor",
        description: "Barbecue pour les repas en plein air.",
        cost: { metal: 10, money: 50 },
        buildTime: 10,
        reputationImpact: 0.3,
        traits: ["rural", "interactif", "sonore"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 70,
        maintenanceCost: { metal: 1, money: 3 },
        collision: { width: 1, height: 0.8, depth: 0.6 },
        isInteractive: true, // Peut être allumé
        particles: { type: "fumée", rate: 0.5 },
        sound: { interact: "bbq_sizzle" },
      },
      {
        id: "canoe",
        label: "Canot",
        cat: "Décor",
        description: "Canot traditionnel québécois.",
        cost: { wood: 15, money: 60 },
        buildTime: 20,
        reputationImpact: 0.4,
        traits: ["rural", "mobile"],
        compatibleTerrains: ["water", "grass"],
        durability: 85,
        isMovable: true,
        collision: { width: 2.5, height: 0.4, depth: 0.6 },
      },
      {
        id: "snowmobile",
        label: "Motoneige",
        cat: "Décor",
        description: "Véhicule emblématique de l’hiver québécois.",
        cost: { metal: 20, money: 100 },
        buildTime: 25,
        reputationImpact: 0.5,
        traits: ["rural", "mobile", "saisonnier_hiver"],
        compatibleTerrains: ["snow", "dirt"],
        durability: 75,
        isMovable: true,
        collision: { width: 1.5, height: 0.8, depth: 2.5 },
        seasons: ["hiver"],
        sound: { interact: "snowmobile_engine" },
      },
      {
        id: "snowman",
        label: "Bonhomme de neige",
        cat: "Décor",
        description: "Symbole de l’hiver québécois.",
        cost: { money: 10 },
        buildTime: 5,
        reputationImpact: 0.3,
        traits: ["rural", "saisonnier_hiver"],
        compatibleTerrains: ["snow"],
        durability: 30, // Fond avec le temps
        seasons: ["hiver"],
        collision: { width: 1, height: 1.8, depth: 1 },
      },
      {
        id: "pumpkin",
        label: "Citrouille",
        cat: "Décor",
        description: "Citrouille pour Halloween ou la décoration.",
        cost: { money: 5 },
        buildTime: 1,
        reputationImpact: 0.2,
        traits: ["rural", "saisonnier_automne"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 40,
        seasons: ["automne"],
        collision: { width: 0.5, height: 0.5, depth: 0.5 },
      },
      {
        id: "christmas_tree",
        label: "Sapin de Noël",
        cat: "Décor",
        description: "Sapin décoré pour les fêtes.",
        cost: { wood: 5, money: 30 },
        buildTime: 10,
        reputationImpact: 0.5,
        traits: ["rural", "saisonnier_hiver", "eclairage"],
        compatibleTerrains: ["grass", "dirt", "snow"],
        durability: 50,
        light: { color: 0xffdd44, intensity: 0.5, distance: 3 },
        seasons: ["hiver"],
        collision: { width: 2, height: 2.5, depth: 2 },
      },
      {
        id: "flag_quebec",
        label: "Drapeau du Québec",
        cat: "Décor",
        description: "Drapeau national du Québec. Améliore le moral des villageois.",
        cost: { fabric: 5, money: 20 },
        buildTime: 5,
        reputationImpact: 0.5,
        traits: ["historique"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 80,
        maintenanceCost: { fabric: 1, money: 2 },
        collision: { width: 1, height: 2.5, depth: 0.1 },
        styles: [
          { color: 0x2a5a8a, variant: "classique" }, // Bleu
          { color: 0xffffff, variant: "fleurdelisé" }, // Blanc
        ],
      },
      {
        id: "bench",
        label: "Banc",
        cat: "Décor",
        description: "Banc simple pour se reposer.",
        cost: { wood: 5, money: 20 },
        buildTime: 5,
        reputationImpact: 0.2,
        traits: ["rural", "urbain"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 75,
        collision: { width: 1.6, height: 0.5, depth: 0.5 },
        styles: [
          { color: 0x5a4030, material: "bois" },
          { color: 0x8a8a8a, material: "métal" },
        ],
      },
      {
        id: "crate",
        label: "Caisse",
        cat: "Décor",
        description: "Caisse en bois pour le transport.",
        cost: { wood: 2, money: 10 },
        buildTime: 2,
        traits: ["rural", "mobile"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 60,
        isMovable: true,
        collision: { width: 0.9, height: 0.9, depth: 0.9 },
      },
      {
        id: "barrel",
        label: "Tonneau",
        cat: "Décor",
        description: "Tonneau en bois pour le stockage.",
        cost: { wood: 5, metal: 2, money: 25 },
        buildTime: 5,
        traits: ["rural", "mobile"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 70,
        isMovable: true,
        collision: { width: 0.8, height: 1, depth: 0.8 },
      },
    ],
  },

  // --- VÉHICULES & ÉPAVES ---
  {
    cat: "Véhicules & épaves",
    items: [
      {
        id: "wreck_pickup",
        label: "Épave de pick-up",
        cat: "Véhicules & épaves",
        description: "Épave de pick-up rouillé. Peut être réparé ou recyclé.",
        cost: { metal: 10, money: 20 },
        buildTime: 5,
        reputationImpact: -0.5, // Peu esthétique
        traits: ["polluant", "industriel"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 40,
        isDestructible: true,
        collision: { width: 2.3, height: 1, depth: 1.2 },
      },
      {
        id: "wreck_truck",
        label: "Épave de camion",
        cat: "Véhicules & épaves",
        description: "Épave de camion abandonné. Peut contenir des ressources.",
        cost: { metal: 15, money: 30 },
        buildTime: 10,
        reputationImpact: -1,
        traits: ["polluant", "industriel"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 30,
        isDestructible: true,
        collision: { width: 3.5, height: 1.2, depth: 1.5 },
      },
      {
        id: "wreck_car",
        label: "Épave de voiture",
        cat: "Véhicules & épaves",
        description: "Épave de voiture. Peut être recyclée pour des pièces.",
        cost: { metal: 8, money: 15 },
        buildTime: 5,
        reputationImpact: -0.3,
        traits: ["polluant"],
        compatibleTerrains: ["dirt", "grass", "road"],
        durability: 35,
        isDestructible: true,
        collision: { width: 1.9, height: 0.8, depth: 1.1 },
      },
      {
        id: "abandoned_tractor",
        label: "Tracteur abandonné",
        cat: "Véhicules & épaves",
        description: "Tracteur rouillé. Peut être réparé.",
        cost: { metal: 12, money: 25 },
        buildTime: 10,
        reputationImpact: -0.2,
        traits: ["polluant", "rural"],
        compatibleTerrains: ["dirt", "grass"],
        durability: 50,
        isDestructible: true,
        collision: { width: 1.5, height: 1.2, depth: 2.5 },
      },
      {
        id: "boat_trailer",
        label: "Remorque à bateau",
        cat: "Véhicules & épaves",
        description: "Remorque pour transporter un bateau.",
        cost: { metal: 15, money: 40 },
        buildTime: 15,
        traits: ["rural", "mobile"],
        compatibleTerrains: ["dirt", "road"],
        durability: 60,
        isMovable: true,
        collision: { width: 2.5, height: 1, depth: 1 },
      },
    ],
  },

  // --- ÉVÉNEMENTS RP ---
  {
    cat: "Événements RP",
    items: [
      {
        id: "barricade",
        label: "Barricade",
        cat: "Événements RP",
        description: "Barricade en bois pour bloquer une route.",
        cost: { wood: 10, money: 20 },
        buildTime: 10,
        reputationImpact: -0.5,
        traits: ["industriel", "destructible"],
        compatibleTerrains: ["road", "dirt"],
        durability: 50,
        isDestructible: true,
        collision: { width: 1.8, height: 1, depth: 0.2 },
      },
      {
        id: "police_barrier",
        label: "Ruban de police",
        cat: "Événements RP",
        description: "Ruban pour délimiter une zone interdite.",
        cost: { plastic: 2, money: 10 },
        buildTime: 2,
        traits: ["urbain", "mobile"],
        compatibleTerrains: ["road", "dirt"],
        durability: 30,
        isMovable: true,
        collision: { width: 2.2, height: 0.1, depth: 0.1 },
      },
      {
        id: "first_aid_kit",
        label: "Trousse de soins",
        cat: "Événements RP",
        description: "Trousse pour soigner les blessés.",
        cost: { fabric: 2, plastic: 3, money: 25 },
        buildTime: 2,
        reputationImpact: 0.5,
        traits: ["ecologique"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 100,
        isMovable: true,
        collision: { width: 0.4, height: 0.3, depth: 0.2 },
      },
      {
        id: "checkpoint",
        label: "Poste de contrôle",
        cat: "Événements RP",
        description: "Poste de contrôle pour les événements spéciaux.",
        cost: { metal: 10, money: 50 },
        buildTime: 15,
        traits: ["urbain"],
        compatibleTerrains: ["road", "dirt"],
        durability: 80,
        collision: { width: 1.2, height: 2.5, depth: 0.2 },
        light: { color: 0xff4444, intensity: 0.5, distance: 5 }, // Lumière rouge
      },
      {
        id: "campfire",
        label: "Feu de camp",
        cat: "Événements RP",
        description: "Feu de camp pour les rassemblements.",
        cost: { wood: 5, stone: 3, money: 20 },
        buildTime: 10,
        reputationImpact: 0.5,
        traits: ["rural", "eclairage", "interactif", "sonore"],
        compatibleTerrains: ["grass", "dirt", "snow"],
        durability: 60,
        maintenanceCost: { wood: 1, money: 1 },
        light: { color: 0xff6622, intensity: 2, distance: 8 },
        particles: { type: "fumée", rate: 1 },
        sound: { ambient: "fire_crackle" },
        collision: { width: 1.2, height: 0.5, depth: 1.2 },
        isInteractive: true,
      },
      {
        id: "tent",
        label: "Tente de camping",
        cat: "Événements RP",
        description: "Tente pour les camps temporaires.",
        cost: { fabric: 10, money: 40 },
        buildTime: 15,
        reputationImpact: 0.2,
        traits: ["rural", "mobile"],
        compatibleTerrains: ["grass", "dirt", "snow"],
        durability: 70,
        isMovable: true,
        collision: { width: 2, height: 2, depth: 2 },
      },
    ],
  },

  // --- GMod (objets fun / sandbox) ---
  {
    cat: "GMod",
    items: [
      {
        id: "chair",
        label: "Chaise",
        cat: "GMod",
        description: "Chaise simple.",
        cost: { wood: 3, money: 10 },
        buildTime: 2,
        traits: ["mobile"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 70,
        isMovable: true,
        collision: { width: 0.6, height: 0.8, depth: 0.6 },
      },
      {
        id: "table",
        label: "Table",
        cat: "GMod",
        description: "Table simple.",
        cost: { wood: 5, money: 15 },
        buildTime: 5,
        traits: ["mobile"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 75,
        isMovable: true,
        collision: { width: 1.5, height: 0.8, depth: 1 },
      },
      {
        id: "trampoline",
        label: "Trampoline",
        cat: "GMod",
        description: "Trampoline pour s'amuser.",
        cost: { fabric: 10, metal: 5, money: 50 },
        buildTime: 10,
        reputationImpact: 0.5,
        traits: ["mobile"],
        compatibleTerrains: ["grass"],
        durability: 60,
        isMovable: true,
        collision: { width: 3, height: 0.2, depth: 3 },
      },
      {
        id: "mine",
        label: "Mine",
        cat: "GMod",
        description: "Mine explosive. À utiliser avec précaution.",
        cost: { metal: 5, money: 20 },
        buildTime: 2,
        reputationImpact: -1,
        traits: ["destructible", "danger"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 1,
        isDestructible: true,
        collision: { width: 0.3, height: 0.15, depth: 0.3 },
      },
      {
        id: "portal",
        label: "Portail",
        cat: "GMod",
        description: "Portail mystérieux. Téléporte les joueurs.",
        cost: { metal: 20, money: 100 },
        buildTime: 30,
        traits: ["mystère"],
        compatibleTerrains: ["grass", "dirt"],
        durability: 100,
        collision: { width: 2, height: 2, depth: 0.2 },
        light: { color: 0x3ad0e0, intensity: 1, distance: 5 },
      },
      {
        id: "bomb",
        label: "Bombe",
        cat: "GMod",
        description: "Bombe explosive. Très dangereuse.",
        cost: { metal: 10, money: 50 },
        buildTime: 5,
        reputationImpact: -2,
        traits: ["destructible", "danger"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 1,
        isDestructible: true,
        collision: { width: 0.4, height: 0.4, depth: 0.4 },
      },
      {
        id: "torus",
        label: "Tore",
        cat: "GMod",
        description: "Forme géométrique en anneau.",
        cost: { metal: 5, money: 15 },
        buildTime: 2,
        traits: ["mobile"],
        compatibleTerrains: ["grass", "dirt", "road"],
        durability: 80,
        isMovable: true,
        collision: { width: 1.5, height: 0.5, depth: 1.5 },
      },
    ],
  },
];

// Ajout dynamique des modèles du catalogue principal
for (const cat of MODEL_CATEGORIES) {
  const items = placeableModels()
    .filter((d) => d.category === cat.id)
    .map((d) => ({
      id: d.id,
      label: d.label,
      cat: cat.label,
      description: d.description,
      cost: { money: 50 }, // Coût par défaut pour les modèles 3D
      buildTime: 10,
      traits: ["neutre"],
      compatibleTerrains: ["grass", "dirt", "road"],
    }));
  if (items.length) PROP_CATALOG.push({ cat: cat.label, items });
}

export const PROP_IDS = PROP_CATALOG.flatMap((c) => c.items.map((i) => i.id));

export function isPropId(id: string): id is PropId {
  if ((PROP_IDS as string[]).includes(id)) return true;
  const alias = MODEL_ALIAS[id];
  if (alias && (PROP_IDS as string[]).includes(alias)) return true;
  return isDeadPose(id) || isInjuredClip(id);
}

// ============================================================================
// 🏗️ STRUCTURE D'UN PROP PLACÉ (avec propriétés RP)
// ============================================================================

/** Propriétés étendues pour un prop placé dans le monde. */
export interface PlacedProp {
  id: string;
  type: PropId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  style?: PropStyle; // Style appliqué (couleur, matériau)
  durability?: number; // Durabilité actuelle (1-100)
  isBroken?: boolean; // Est-ce cassé ?
  isActive?: boolean; // Est-ce actif (ex: feu de camp allumé) ?
  placedAt?: number; // Timestamp de placement (en jours de jeu)
  lastMaintenance?: number; // Dernière maintenance (en jours de jeu)
  owner?: string; // Propriétaire (ID du joueur ou village)
  customData?: Record<string, unknown>; // Données personnalisées (ex: niveau de remplissage pour un silo)
}

// ============================================================================
// 📜 FONCTIONS DE PARSING ET VALIDATION
// ============================================================================

/**
 * Parse une liste de props placés depuis des données brutes.
 * @param raw - Données brutes.
 * @returns Liste de props placés.
 */
export function parsePlaced(raw: unknown): PlacedProp[] {
  if (!Array.isArray(raw)) return [];
  const out: PlacedProp[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const d = row as Partial<PlacedProp>;
    if (!isPropId(String(d.type))) continue;
    if (typeof d.x !== "number" || typeof d.z !== "number") continue;

    // Définition par défaut du prop
    const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === d.type);
    const defaultDurability = propDef?.durability ?? 100;

    out.push({
      id: typeof d.id === "string" ? d.id : `p${out.length}`,
      type: d.type as PropId,
      x: d.x,
      y: typeof d.y === "number" ? d.y : 0,
      z: d.z,
      yaw: typeof d.yaw === "number" ? d.yaw : 0,
      scale: typeof d.scale === "number" ? Math.max(0.25, Math.min(6, d.scale)) : 1,
      style: d.style,
      durability: typeof d.durability === "number" ? d.durability : defaultDurability,
      isBroken: d.isBroken ?? false,
      isActive: d.isActive ?? false,
      placedAt: typeof d.placedAt === "number" ? d.placedAt : 0,
      lastMaintenance: typeof d.lastMaintenance === "number" ? d.lastMaintenance : 0,
      owner: d.owner,
      customData: d.customData,
    });
    if (out.length >= 80) break; // Limite de 80 props
  }
  return out;
}

// ============================================================================
// 🎨 MATÉRIAUX ET STYLES
// ============================================================================

// Matériau fantôme pour la prévisualisation
const GHOST_MAT = new THREE.MeshLambertMaterial({
  color: 0xa78bfa,
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
});

// Matériaux pour les styles personnalisés
const STYLE_MATERIALS: Record<string, Record<string, THREE.Material>> = {
  bois: {
    default: matLib.get(0x5a4030, 0.9),
    usé: matLib.get(0x3a2a20, 0.8),
    peint: matLib.get(0x8a2020, 0.7),
  },
  métal: {
    default: matLib.get(0x8a8a8a, 0.7),
    rouillé: matLib.get(0x6a4020, 0.5),
    poli: matLib.get(0xc0c0c0, 0.8),
  },
  pierre: {
    default: matLib.get(0x8a6a4a, 0.9),
    granit: matLib.get(0x6a6258, 0.8),
  },
  béton: {
    default: matLib.get(0xc0c0c0, 0.8),
    fissuré: matLib.get(0x8a8a8a, 0.6),
  },
};

// ============================================================================
// 🛠️ FONCTIONS DE CONSTRUCTION 3D (avec styles et effets RP)
// ============================================================================

/**
 * Applique un style à un mesh.
 * @param mesh - Mesh à styliser.
 * @param style - Style à appliquer.
 */
function applyStyleToMesh(mesh: THREE.Mesh, style?: PropStyle): void {
  if (!style) return;

  // Remplacer le matériau si un style est défini
  if (style.material && STYLE_MATERIALS[style.material]) {
    const materialKey = style.variant && STYLE_MATERIALS[style.material][style.variant]
      ? style.variant
      : "default";
    mesh.material = STYLE_MATERIALS[style.material][materialKey] || mesh.material;
  }

  // Appliquer une couleur personnalisée
  if (style.color && mesh.material instanceof THREE.MeshLambertMaterial) {
    mesh.material.color.setHex(style.color);
  }
}

/**
 * Crée une lumière pour un prop.
 * @param group - Groupe parent.
 * @param lightDef - Définition de la lumière.
 */
function addLightToProp(group: THREE.Group, lightDef?: PropDef["light"]): void {
  if (!lightDef) return;

  const light = new THREE.PointLight(
    lightDef.color ?? 0xffaa44,
    lightDef.intensity ?? 1,
    lightDef.distance ?? 10
  );
  light.position.y = 1; // Hauteur par défaut
  group.add(light);
}

/**
 * Crée des particules pour un prop (ex: fumée, poussière).
 * @param group - Groupe parent.
 * @param particlesDef - Définition des particules.
 */
function addParticlesToProp(group: THREE.Group, particlesDef?: PropDef["particles"]): void {
  if (!particlesDef) return;

  // Exemple simple avec THREE.ParticleSystem (à remplacer par un système plus avancé)
  const particleGeometry = new THREE.BufferGeometry();
  const particles = 100;
  const positions = new Float32Array(particles * 3);
  const colors = new Float32Array(particles * 3);
  const sizes = new Float32Array(particles);

  for (let i = 0; i < particles; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 1] = Math.random() * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

    colors[i * 3] = 0.5 + Math.random() * 0.5; // R
    colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // G
    colors[i * 3 + 2] = 0.5 + Math.random() * 0.5; // B

    sizes[i] = 0.05 + Math.random() * 0.05;
  }

  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  group.add(particleSystem);
}

/**
 * Construit un prop 3D avec des propriétés RP.
 * @param type - ID du prop.
 * @param style - Style à appliquer (optionnel).
 * @param isGhost - Si vrai, utilise le matériau fantôme.
 * @returns Groupe THREE.js.
 */
export function buildProp(type: PropId, style?: PropStyle, isGhost = false): THREE.Group {
  const g = new THREE.Group();
  g.name = type;
  g.userData.propType = type;
  g.userData.isGhost = isGhost;

  // Résolution d'alias
  if (MODEL_ALIAS[type]) {
    return buildProp(MODEL_ALIAS[type]!, style, isGhost);
  }

  // Récupère la définition du prop
  const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === type);

  // --- PRIMITIVES ---
  if (type === "cube") {
    const m = mesh("box", { w: 1.2, h: 1.2, d: 1.2 }, 0x5a6a88, 0.6, 0.9);
    applyStyleToMesh(m, style);
    if (isGhost) m.material = GHOST_MAT;
    g.add(m);
  } else if (type === "sphere") {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), matLib.get(0x6a5a88, 0.7));
    m.position.y = 0.7;
    applyStyleToMesh(m, style);
    if (isGhost) m.material = GHOST_MAT;
    g.add(m);
  } else if (type === "cylinder") {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 10), matLib.get(0x4a5a70));
    m.position.y = 0.7;
    applyStyleToMesh(m, style);
    if (isGhost) m.material = GHOST_MAT;
    g.add(m);
  } else if (type === "plane") {
    const m = box(2.4, 0.08, 2.4, 0.04, 0x6a6660, 0.9);
    applyStyleToMesh(m, style);
    if (isGhost) m.material = GHOST_MAT;
    g.add(m);
  }

  // --- VIE URBAINE ---
  else if (type === "bus_stop_quebec") {
    // Abribus : poteaux + toit + paroi
    const post1 = box(0.08, 2.4, 0.08, 1.2, 0x3a3a3e, 0.4);
    const post2 = post1.clone();
    post2.position.x = 0.8;
    const roof = box(1.8, 0.06, 1.2, 2.4, 0x2a4a6a, 0.5);
    const back = box(1.8, 1.8, 0.04, 1.3, 0x88ccee, 0.3); // verre
    back.position.z = -0.58;
    const bench = box(1.4, 0.08, 0.35, 0.5, 0x4a4a4e);
    bench.position.z = 0.5;
    g.add(post1, post2, roof, back, bench);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "street_lamp") {
    const post = box(0.12, 3.1, 0.12, 1.55, 0x2a2a2e, 0.4);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), matLib.getEmissive(0xffd88a, 0xffd88a, 1.4));
    lamp.position.y = 3.2;
    g.add(post, lamp);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "park_bench") {
    // Banc de parc en bois
    const seat = box(1.6, 0.08, 0.42, 0.46, 0x5a4030, 0.9);
    const backrest = box(1.6, 0.5, 0.06, 0.76, 0x4a3428, 0.9);
    backrest.position.z = -0.18;
    const leg1 = box(0.08, 0.46, 0.42, 0.23, 0x2a2a2e, 0.9);
    leg1.position.x = -0.7;
    const leg2 = leg1.clone();
    leg2.position.x = 0.7;
    g.add(seat, backrest, leg1, leg2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(seat, style);
    applyStyleToMesh(backrest, style);
  } else if (type === "trash_bin") {
    const bin = mesh("cylinder", { r: 0.28, r2: 0.3, h: 0.9, seg: 10 }, 0x2a4a2a, 0.45, 0.7);
    const lid = mesh("cylinder", { r: 0.32, r2: 0.32, h: 0.06, seg: 10 }, 0x1a3a1a, 0.92, 0.6);
    g.add(bin, lid);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "recycling_bin") {
    const bin = mesh("cylinder", { r: 0.3, r2: 0.32, h: 1.0, seg: 10 }, 0x2a5a8a, 0.5, 0.7);
    g.add(bin);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "fire_hydrant") {
    const body = mesh("cylinder", { r: 0.18, r2: 0.2, h: 0.7, seg: 8 }, 0xc03028, 0.35, 0.8);
    const top = mesh("sphere", { r: 0.14, seg: 8 }, 0xc03028, 0.72, 0.8);
    const nozzle1 = box(0.08, 0.08, 0.18, 0.45, 0xc03028, 0.8);
    nozzle1.position.z = 0.18;
    const nozzle2 = nozzle1.clone();
    nozzle2.position.z = -0.18;
    g.add(body, top, nozzle1, nozzle2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "traffic_cone") {
    const cone = mesh("cone", { r: 0.22, h: 0.7, seg: 8 }, 0xe86820, 0.35, 0.9);
    const base = box(0.4, 0.04, 0.4, 0.02, 0x1a1a1e, 0.9);
    // Bande réfléchissante
    const stripe = mesh("cylinder", { r: 0.16, r2: 0.18, h: 0.06, seg: 8 }, 0xffffff, 0.45, 0.3);
    g.add(cone, base, stripe);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "jersey_barrier") {
    const barrier = box(2.4, 0.9, 0.5, 0.45, 0x8a8a82, 0.95);
    g.add(barrier);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "parking_meter") {
    const post = box(0.08, 1.1, 0.08, 0.55, 0x4a4a4e, 0.5);
    const head = mesh("cylinder", { r: 0.14, r2: 0.14, h: 0.22, seg: 8 }, 0x3a3a3e, 1.2, 0.5);
    g.add(post, head);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "mailbox_urban") {
    const post = box(0.08, 1.0, 0.08, 0.5, 0x4a4a4e, 0.5);
    const box_ = box(0.3, 0.25, 0.2, 1.1, 0x2a2a6a, 0.6);
    g.add(post, box_);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  }

  // --- VIE RURALE ---
  else if (type === "rural_mailbox") {
    const post = box(0.08, 1.1, 0.08, 0.55, 0x4a3828, 0.6);
    const box_ = box(0.4, 0.25, 0.22, 1.2, 0x2a2a2e, 0.6);
    const flag = box(0.04, 0.2, 0.04, 1.25, 0xc03028, 0.8);
    flag.position.x = 0.22;
    g.add(post, box_, flag);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "wooden_fence") {
    // Section de clôture de rang
    for (let i = 0; i < 4; i++) {
      const post = box(0.1, 1.2, 0.1, 0.6, 0x5a4030, 0.9);
      post.position.x = i * 0.8 - 1.2;
      g.add(post);
      applyStyleToMesh(post, style);
    }
    const rail1 = box(2.6, 0.08, 0.06, 0.9, 0x6a5040, 0.9);
    const rail2 = box(2.6, 0.08, 0.06, 0.5, 0x6a5040, 0.9);
    g.add(rail1, rail2);
    applyStyleToMesh(rail1, style);
    applyStyleToMesh(rail2, style);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "hay_bale") {
    const bale = mesh("cylinder", { r: 0.55, r2: 0.55, h: 0.9, seg: 12 }, 0xc8a848, 0.45, 0.95);
    bale.rotation.z = Math.PI / 2;
    g.add(bale);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "grain_silo") {
    const base = mesh("cylinder", { r: 1.2, r2: 1.2, h: 3.5, seg: 14 }, 0x8a8a82, 1.75, 0.8);
    const roof = mesh("cone", { r: 1.25, h: 0.8, seg: 14 }, 0x6a6a62, 3.9, 0.8);
    g.add(base, roof);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(base, style);
    applyStyleToMesh(roof, style);
  } else if (type === "log_stack") {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3 - i; j++) {
        const log = mesh("cylinder", { r: 0.18, r2: 0.18, h: 1.4, seg: 8 }, 0x5a3828, 0.18 + i * 0.34, 0.9);
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.18 + i * 0.34, j * 0.38 - 0.38 + i * 0.19);
        g.add(log);
      }
    }
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "sugar_shack") {
    // Petite cabane en bois rond
    const walls = box(2.4, 1.8, 2.0, 0.9, 0x5a3828, 0.95);
    const roof = box(2.8, 0.12, 2.4, 1.9, 0x3a2818, 0.9);
    roof.rotation.x = 0.15;
    const door = box(0.6, 1.4, 0.06, 0.7, 0x2a1810, 0.9);
    door.position.z = 1.03;
    g.add(walls, roof, door);
    addParticlesToProp(g, propDef?.particles); // Fumée de cheminée
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(walls, style);
    applyStyleToMesh(roof, style);
  } else if (type === "maple_tree") {
    const trunk = mesh("cylinder", { r: 0.18, r2: 0.24, h: 1.8, seg: 6 }, 0x4a3828, 0.9, 0.95);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), matLib.get(0xc85020, 0.95));
    canopy.position.y = 2.6;
    canopy.scale.set(1, 0.8, 1);
    canopy.castShadow = true;
    g.add(trunk, canopy);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "spruce_tree") {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.4, 5), matLib.get(0x4a3828, 0.98));
    t.position.y = 0.7;
    t.castShadow = true;
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 6), matLib.get(0x24422c, 1));
    c.position.y = 2.4;
    c.castShadow = true;
    g.add(t, c);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "birch_tree") {
    const t = mesh("cylinder", { r: 0.12, r2: 0.16, h: 2.2, seg: 6 }, 0xe8e0d0, 1.1, 0.7);
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), matLib.get(0x88aa44, 0.95));
    c.position.y = 2.8;
    c.scale.set(1, 1.2, 1);
    c.castShadow = true;
    g.add(t, c);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "tractor") {
    const body = box(1.4, 0.9, 0.9, 0.7, 0xc03028, 0.8);
    const cab = box(0.9, 0.7, 0.8, 1.35, 0x88ccee, 0.3);
    cab.position.x = -0.1;
    const wheel1 = mesh("cylinder", { r: 0.5, r2: 0.5, h: 0.25, seg: 10 }, 0x1a1a1e, 0.5, 0.9);
    wheel1.rotation.z = Math.PI / 2;
    wheel1.position.set(-0.5, 0.5, 0.55);
    const wheel2 = wheel1.clone();
    wheel2.position.z = -0.55;
    const wheel3 = mesh("cylinder", { r: 0.3, r2: 0.3, h: 0.2, seg: 10 }, 0x1a1a1e, 0.3, 0.9);
    wheel3.rotation.z = Math.PI / 2;
    wheel3.position.set(0.6, 0.3, 0.5);
    const wheel4 = wheel3.clone();
    wheel4.position.z = -0.5;
    g.add(body, cab, wheel1, wheel2, wheel3, wheel4);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "wagon") {
    const bed = box(2.0, 0.12, 1.2, 0.55, 0x5a4030, 0.9);
    for (const [x, z] of [[-0.85, -0.5], [0.85, -0.5], [-0.85, 0.5], [0.85, 0.5]] as const) {
      const wheel = mesh("cylinder", { r: 0.35, r2: 0.35, h: 0.12, seg: 10 }, 0x1a1a1e, 0.35, 0.9);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.35, z);
      g.add(wheel);
    }
    g.add(bed);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "cow") {
    const body = box(1.4, 0.8, 0.7, 0.9, 0xe8e0d0, 0.95);
    const head = box(0.4, 0.4, 0.4, 1.1, 0xe8e0d0, 0.95);
    head.position.x = 0.85;
    const leg1 = box(0.12, 0.5, 0.12, 0.25, 0xe8e0d0, 0.95);
    leg1.position.set(-0.5, 0.25, 0.25);
    const leg2 = leg1.clone();
    leg2.position.z = -0.25;
    const leg3 = leg1.clone();
    leg3.position.x = 0.5;
    const leg4 = leg3.clone();
    leg4.position.z = -0.25;
    g.add(body, head, leg1, leg2, leg3, leg4);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  }

  // --- STRUCTURES ---
  else if (type === "wall") {
    const m = box(3.2, 2.2, 0.28, 1.1, 0x8a6a4a, 0.9);
    applyStyleToMesh(m, style);
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
  } else if (type === "pillar") {
    const m = box(0.42, 3.2, 0.42, 1.6, 0x9a9086, 0.9);
    applyStyleToMesh(m, style);
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
  } else if (type === "ramp") {
    const m = box(2.4, 0.16, 3.2, 0.08, 0x6a6660, 0.9);
    m.rotation.x = -0.32;
    m.position.z = 0.2;
    m.position.y = 0.5;
    applyStyleToMesh(m, style);
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
  } else if (type === "arch") {
    const left = box(0.4, 2.4, 0.4, 1.2, 0x8a8580, 0.9);
    left.position.x = -1.1;
    const right = box(0.4, 2.4, 0.4, 1.2, 0x8a8580, 0.9);
    right.position.x = 1.1;
    const top = box(2.6, 0.36, 0.4, 2.5, 0x8a8580, 0.9);
    g.add(left, right, top);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(left, style);
    applyStyleToMesh(right, style);
    applyStyleToMesh(top, style);
  } else if (type === "scaffolding") {
    for (const y of [0.8, 1.8, 2.8]) {
      const bar1 = box(2.0, 0.06, 0.06, y, 0x6a6a6e, 0.5);
      const bar2 = box(0.06, 0.06, 1.2, y, 0x6a6a6e, 0.5);
      bar2.position.x = -1.0;
      const bar3 = bar2.clone();
      bar3.position.x = 1.0;
      g.add(bar1, bar2, bar3);
    }
    for (const [x, z] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]] as const) {
      const post = box(0.06, 3.0, 0.06, 1.5, 0x6a6a6e, 0.5);
      post.position.set(x, 1.5, z);
      g.add(post);
    }
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "portable_toilet") {
    const cab = box(1.1, 2.2, 1.1, 1.1, 0x2a5a8a, 0.7);
    const roof = box(1.2, 0.08, 1.2, 2.25, 0x1a3a5a, 0.7);
    const door = box(0.7, 1.8, 0.04, 1.0, 0x1a3a5a, 0.7);
    door.position.z = 0.57;
    g.add(cab, roof, door);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "storage_shed") {
    const walls = box(2.4, 2.0, 1.8, 1.0, 0x6a5040, 0.95);
    const roof = box(2.6, 0.1, 2.0, 2.1, 0x3a2818, 0.9);
    roof.rotation.x = 0.12;
    const door = box(0.8, 1.6, 0.06, 0.8, 0x2a1810, 0.9);
    door.position.z = 0.93;
    g.add(walls, roof, door);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(walls, style);
    applyStyleToMesh(roof, style);
  }

  // --- COMMERCE ---
  else if (type === "atm") {
    const body = box(0.6, 1.4, 0.4, 0.7, 0x3a3a3e, 0.5);
    const screen = box(0.4, 0.3, 0.02, 1.1, 0x88ccee, 0.3);
    screen.position.z = 0.21;
    g.add(body, screen);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "gas_pump") {
    const body = box(0.5, 1.5, 0.4, 0.75, 0xc03028, 0.6);
    const screen = box(0.35, 0.25, 0.02, 1.2, 0x88ccee, 0.3);
    screen.position.z = 0.21;
    const nozzle = box(0.08, 0.3, 0.08, 0.9, 0x1a1a1e, 0.9);
    nozzle.position.set(0.3, 0.9, 0);
    g.add(body, screen, nozzle);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "shop_shelf") {
    for (let i = 0; i < 4; i++) {
      const shelf = box(1.4, 0.04, 0.4, 0.3 + i * 0.45, 0x6a5040, 0.9);
      g.add(shelf);
    }
    const side1 = box(0.04, 1.8, 0.4, 0.9, 0x4a3428, 0.9);
    side1.position.x = -0.7;
    const side2 = side1.clone();
    side2.position.x = 0.7;
    g.add(side1, side2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(side1, style);
    applyStyleToMesh(side2, style);
  } else if (type === "cash_register") {
    const body = box(0.4, 0.2, 0.35, 0.1, 0x3a3a3e, 0.5);
    const screen = box(0.25, 0.2, 0.04, 0.3, 0x88ccee, 0.3);
    screen.position.z = -0.18;
    screen.rotation.x = -0.2;
    g.add(body, screen);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "shopping_cart") {
    const basket = box(0.6, 0.4, 0.45, 0.65, 0x8a8a8e, 0.5);
    for (const [x, z] of [[-0.25, -0.18], [0.25, -0.18], [-0.25, 0.18], [0.25, 0.18]] as const) {
      const wheel = mesh("cylinder", { r: 0.06, r2: 0.06, h: 0.04, seg: 6 }, 0x1a1a1e, 0.06, 0.6);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.06, z);
      g.add(wheel);
    }
    g.add(basket);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "lcbo_shelf") {
    for (let i = 0; i < 3; i++) {
      const shelf = box(1.2, 0.04, 0.35, 0.4 + i * 0.4, 0x4a3428, 0.9);
      g.add(shelf);
      // Bouteilles simulées
      for (let j = 0; j < 4; j++) {
        const bottle = mesh("cylinder", { r: 0.04, r2: 0.04, h: 0.28, seg: 6 }, 0x2a4a2a, 0.56 + i * 0.4, 0.4);
        bottle.position.x = -0.4 + j * 0.25;
        g.add(bottle);
      }
    }
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "neon_sign") {
    const post = box(0.08, 1.4, 0.08, 0.7, 0x1a1a1e, 0.5);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.12, 0.08),
      matLib.getEmissive(0x3ad0e0, 0x3ad0e0, 1.8)
    );
    sign.position.y = 1.4;
    g.add(post, sign);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    // Appliquer le style de couleur du néon
    if (style?.color && sign.material instanceof THREE.MeshBasicMaterial) {
      sign.material.color.setHex(style.color);
    }
  }

  // --- INDUSTRIEL ---
  else if (type === "oil_barrel") {
    const m = new THREE.Mesh(getGeo("cylinder", { r: 0.38, r2: 0.4, h: 0.95, seg: 10 }), matLib.get(0x2a2a2e, 0.7, 0.15));
    m.position.y = 0.48;
    m.castShadow = true;
    g.add(m);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "storage_tank") {
    const tank = mesh("cylinder", { r: 1.0, r2: 1.0, h: 2.2, seg: 14 }, 0x8a8a82, 1.1, 0.7);
    g.add(tank);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(tank, style);
  } else if (type === "forklift") {
    const body = box(1.0, 0.8, 0.8, 0.6, 0xc8a020, 0.8);
    const mast = box(0.12, 1.8, 0.12, 0.9, 0x3a3a3e, 0.8);
    mast.position.x = 0.6;
    const fork1 = box(0.08, 0.04, 0.8, 0.08, 0x3a3a3e, 0.8);
    fork1.position.set(0.6, 0.08, 0.2);
    const fork2 = fork1.clone();
    fork2.position.z = -0.2;
    g.add(body, mast, fork1, fork2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "pallet") {
    const base = box(1.0, 0.08, 1.0, 0.04, 0x6a5040, 0.9);
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]] as const) {
      const foot = box(0.12, 0.08, 0.12, 0.04, 0x5a4030, 0.9);
      foot.position.set(x, 0.04, z);
      g.add(foot);
    }
    g.add(base);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "cement_bag") {
    const bag = box(0.5, 0.3, 0.35, 0.15, 0x8a8a82, 0.95);
    g.add(bag);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "generator") {
    const body = box(0.8, 0.6, 0.5, 0.3, 0xc8a020, 0.7);
    const exhaust = mesh("cylinder", { r: 0.06, r2: 0.06, h: 0.2, seg: 6 }, 0x3a3a3e, 0.7, 0.5);
    exhaust.position.x = 0.3;
    g.add(body, exhaust);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "cement_mixer") {
    const drum = mesh("cylinder", { r: 0.5, r2: 0.4, h: 0.9, seg: 10 }, 0xc8a020, 0.7, 0.7);
    drum.rotation.z = 0.3;
    const frame = box(0.8, 0.08, 0.6, 0.04, 0x3a3a3e, 0.8);
    g.add(drum, frame);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "electrical_box") {
    const box_ = box(0.6, 0.8, 0.2, 0.9, 0x4a4a4e, 0.6);
    const warning = box(0.2, 0.2, 0.02, 1.1, 0xc8a040, 0.8);
    warning.position.z = 0.11;
    g.add(box_, warning);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  }

  // --- NATURE ---
  else if (type === "rock") {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), matLib.get(0x6a6258, 1));
    m.position.y = 0.4;
    m.castShadow = true;
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
  } else if (type === "bush") {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), matLib.get(0x2a5a32, 1));
    m.position.y = 0.45;
    m.scale.set(1.3, 0.8, 1.1);
    m.castShadow = true;
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
  } else if (type === "fern") {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 6), matLib.get(0x3a6a3a, 0.95));
    m.position.y = 0.3;
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
  } else if (type === "wildflower") {
    for (let i = 0; i < 5; i++) {
      const stem = mesh("cylinder", { r: 0.02, r2: 0.02, h: 0.3, seg: 4 }, 0x3a6a3a, 0.15, 0.9);
      stem.position.set((Math.random() - 0.5) * 0.4, 0.15, (Math.random() - 0.5) * 0.4);
      const flower = mesh("sphere", { r: 0.06, seg: 6 }, 0xe8a040, 0.32, 0.8);
      flower.position.copy(stem.position);
      flower.position.y = 0.32;
      g.add(stem, flower);
    }
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "dead_tree") {
    const trunk = mesh("cylinder", { r: 0.14, r2: 0.2, h: 2.0, seg: 5 }, 0x4a3828, 1.0, 0.98);
    const branch1 = mesh("cylinder", { r: 0.06, r2: 0.08, h: 0.8, seg: 4 }, 0x4a3828, 1.6, 0.98);
    branch1.rotation.z = 0.6;
    branch1.position.x = 0.3;
    const branch2 = branch1.clone();
    branch2.rotation.z = -0.5;
    branch2.position.x = -0.25;
    branch2.position.y = 1.4;
    g.add(trunk, branch1, branch2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "stump") {
    const m = mesh("cylinder", { r: 0.3, r2: 0.35, h: 0.4, seg: 8 }, 0x5a3828, 0.2, 0.95);
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
  }

  // --- ÉCLAIRAGE ---
  else if (type === "lamp_post") {
    const post = box(0.12, 3.1, 0.12, 1.55, 0x2a2a2e, 0.4);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), matLib.getEmissive(0xffd88a, 0xffd88a, 1.4));
    lamp.position.y = 3.2;
    g.add(post, lamp);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "spot") {
    const base = box(0.2, 0.16, 0.28, 0.2, 0x2a2a2e, 0.35);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), matLib.getEmissive(0xffe0a0, 0xffe0a0, 1.6));
    lamp.position.set(0, 0.32, 0.04);
    g.add(base, lamp);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "neon") {
    const post = box(0.08, 1.4, 0.08, 0.7, 0x1a1a1e, 0.5);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.12, 0.08),
      matLib.getEmissive(0x3ad0e0, 0x3ad0e0, 1.8)
    );
    sign.position.y = 1.4;
    g.add(post, sign);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    // Appliquer le style de couleur
    if (style?.color && sign.material instanceof THREE.MeshBasicMaterial) {
      sign.material.color.setHex(style.color);
    }
  } else if (type === "lantern") {
    const body = box(0.2, 0.3, 0.2, 0.6, 0x3a3a3e, 0.5);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), matLib.getEmissive(0xffaa44, 0xffaa44, 1.5));
    glow.position.y = 0.6;
    g.add(body, glow);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "fire_pit") {
    const ring = mesh("cylinder", { r: 0.5, r2: 0.5, h: 0.2, seg: 10 }, 0x3a3a3e, 0.1, 0.8);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 6), matLib.getEmissive(0xff6622, 0xff4400, 2.0));
    fire.position.y = 0.4;
    g.add(ring, fire);
    addLightToProp(g, propDef?.light);
    addParticlesToProp(g, propDef?.particles);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "christmas_lights") {
    for (let i = 0; i < 8; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), matLib.getEmissive(0xff4444, 0xff2222, 1.5));
      bulb.position.set(i * 0.2 - 0.7, 0, 0);
      g.add(bulb);
    }
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    // Appliquer le style de couleur
    if (style?.color) {
      g.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
          o.material.color.setHex(style.color);
        }
      });
    }
  }

  // --- DÉCOR QUÉBÉCOIS ---
  else if (type === "picnic_table") {
    const top = box(1.6, 0.06, 0.8, 0.74, 0x6a4a30, 0.9);
    const seat1 = box(1.6, 0.06, 0.3, 0.46, 0x5a4030, 0.9);
    seat1.position.z = 0.55;
    const seat2 = seat1.clone();
    seat2.position.z = -0.55;
    for (const [x, z] of [[-0.7, 0], [0.7, 0]] as const) {
      const leg = box(0.08, 0.7, 0.08, 0.35, 0x3a2a20, 0.9);
      leg.position.set(x, 0.35, z);
      g.add(leg);
    }
    g.add(top, seat1, seat2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(top, style);
    applyStyleToMesh(seat1, style);
    applyStyleToMesh(seat2, style);
  } else if (type === "bbq_grill") {
    const body = mesh("cylinder", { r: 0.35, r2: 0.35, h: 0.3, seg: 10 }, 0x1a1a1e, 0.85, 0.5);
    const lid = mesh("sphere", { r: 0.35, seg: 10 }, 0x1a1a1e, 1.0, 0.5);
    lid.scale.y = 0.5;
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as const) {
      const leg = box(0.04, 0.7, 0.04, 0.35, 0x1a1a1e, 0.9);
      leg.position.set(x, 0.35, z);
      g.add(leg);
    }
    g.add(body, lid);
    addParticlesToProp(g, propDef?.particles);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "canoe") {
    const hull = box(2.4, 0.3, 0.5, 0.3, 0xc03028, 0.7);
    hull.rotation.x = 0.1;
    g.add(hull);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(hull, style);
  } else if (type === "snowmobile") {
    const body = box(1.4, 0.4, 0.5, 0.4, 0xc03028, 0.7);
    const seat = box(0.6, 0.15, 0.4, 0.65, 0x1a1a1e, 0.9);
    const ski1 = box(1.2, 0.04, 0.12, 0.02, 0x3a3a3e, 0.9);
    ski1.position.z = 0.28;
    const ski2 = ski1.clone();
    ski2.position.z = -0.28;
    const track = box(0.8, 0.08, 0.4, 0.04, 0x1a1a1e, 0.9);
    track.position.x = -0.3;
    g.add(body, seat, ski1, ski2, track);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(body, style);
  } else if (type === "snowman") {
    const b1 = mesh("sphere", { r: 0.5, seg: 10 }, 0xf0f0f0, 0.5, 0.9);
    const b2 = mesh("sphere", { r: 0.35, seg: 10 }, 0xf0f0f0, 1.2, 0.9);
    const b3 = mesh("sphere", { r: 0.25, seg: 10 }, 0xf0f0f0, 1.7, 0.9);
    const nose = mesh("cone", { r: 0.04, h: 0.2, seg: 6 }, 0xe86820, 1.7, 0.8);
    nose.rotation.z = Math.PI / 2;
    nose.position.x = 0.25;
    g.add(b1, b2, b3, nose);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "pumpkin") {
    const m = mesh("sphere", { r: 0.25, seg: 10 }, 0xe86820, 0.25, 0.9);
    m.scale.set(1, 0.8, 1);
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
  } else if (type === "christmas_tree") {
    const trunk = mesh("cylinder", { r: 0.1, r2: 0.12, h: 0.4, seg: 6 }, 0x4a3828, 0.2, 0.95);
    const c1 = mesh("cone", { r: 0.8, h: 1.0, seg: 8 }, 0x24422c, 0.9, 0.9);
    const c2 = mesh("cone", { r: 0.6, h: 0.8, seg: 8 }, 0x24422c, 1.5, 0.9);
    const c3 = mesh("cone", { r: 0.4, h: 0.6, seg: 8 }, 0x24422c, 2.0, 0.9);
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), matLib.getEmissive(0xffdd44, 0xffdd44, 2.0));
    star.position.y = 2.4;
    g.add(trunk, c1, c2, c3, star);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    // Appliquer le style de couleur aux guirlandes
    if (style?.color) {
      star.material = matLib.getEmissive(style.color, style.color, 2.0);
    }
  } else if (type === "flag_quebec") {
    const post = box(0.06, 2.4, 0.06, 1.2, 0x4a4a4e, 0.5);
    const flag = box(0.8, 0.5, 0.02, 2.0, 0x2a5a8a, 0.9);
    flag.position.x = 0.43;
    const cross1 = box(0.6, 0.08, 0.03, 2.0, 0xffffff, 0.9);
    cross1.position.x = 0.43;
    const cross2 = box(0.08, 0.4, 0.03, 2.0, 0xffffff, 0.9);
    cross2.position.x = 0.43;
    g.add(post, flag, cross1, cross2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    // Appliquer le style de couleur
    if (style?.color) {
      flag.material = matLib.get(style.color, 0.9);
    }
  } else if (type === "bench") {
    const seat = box(1.6, 0.1, 0.46, 0.46, 0x5a4030, 0.9);
    const leg1 = box(0.1, 0.46, 0.46, 0.23, 0x3a2a20, 0.9);
    leg1.position.x = -0.7;
    const leg2 = leg1.clone();
    leg2.position.x = 0.7;
    g.add(seat, leg1, leg2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(seat, style);
    applyStyleToMesh(leg1, style);
    applyStyleToMesh(leg2, style);
  } else if (type === "crate") {
    const m = box(0.9, 0.9, 0.9, 0.45, 0x6a4028, 0.9);
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
    applyStyleToMesh(m, style);
  } else if (type === "barrel") {
    const m = new THREE.Mesh(getGeo("cylinder", { r: 0.38, r2: 0.4, h: 0.95, seg: 10 }), matLib.get(0x5a3a1a, 0.7, 0.15));
    m.position.y = 0.48;
    m.castShadow = true;
    g.add(m);
    if (isGhost) m.material = GHOST_MAT;
    applyStyleToMesh(m, style);
  }

  // --- VÉHICULES & ÉPAVES ---
  else if (type === "wreck_pickup") {
    const body = box(2.2, 0.7, 1.1, 0.55, 0x4a3a30, 0.9);
    const cab = box(1.1, 0.5, 1.05, 1.1, 0x3a2a22, 0.9);
    const w1 = mesh("cylinder", { r: 0.32, r2: 0.32, h: 0.18, seg: 8 }, 0x1a1a1e, 0.32, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.7, 0.32, 0.55);
    const w2 = w1.clone();
    w2.position.z = -0.55;
    g.add(body, cab, w1, w2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "wreck_truck") {
    const body = box(3.2, 1.0, 1.4, 0.7, 0x4a3a30, 0.9);
    const cab = box(1.4, 0.8, 1.3, 1.6, 0x3a2a22, 0.9);
    const w1 = mesh("cylinder", { r: 0.4, r2: 0.4, h: 0.22, seg: 8 }, 0x1a1a1e, 0.4, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-1.2, 0.4, 0.75);
    const w2 = w1.clone();
    w2.position.z = -0.75;
    const w3 = w1.clone();
    w3.position.x = 1.2;
    const w4 = w3.clone();
    w4.position.z = -0.75;
    g.add(body, cab, w1, w2, w3, w4);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "wreck_car") {
    const body = box(1.8, 0.6, 1.0, 0.5, 0x4a3a30, 0.9);
    const cab = box(1.0, 0.45, 0.95, 1.0, 0x3a2a22, 0.9);
    const w1 = mesh("cylinder", { r: 0.28, r2: 0.28, h: 0.16, seg: 8 }, 0x1a1a1e, 0.28, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.6, 0.28, 0.5);
    const w2 = w1.clone();
    w2.position.z = -0.5;
    const w3 = w1.clone();
    w3.position.x = 0.6;
    const w4 = w3.clone();
    w4.position.z = -0.5;
    g.add(body, cab, w1, w2, w3, w4);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "abandoned_tractor") {
    const body = box(1.4, 0.9, 0.9, 0.7, 0x6a5a3a, 0.95);
    const wheel1 = mesh("cylinder", { r: 0.5, r2: 0.5, h: 0.25, seg: 10 }, 0x1a1a1e, 0.5, 0.9);
    wheel1.rotation.z = Math.PI / 2;
    wheel1.position.set(-0.5, 0.5, 0.55);
    const wheel2 = wheel1.clone();
    wheel2.position.z = -0.55;
    g.add(body, wheel1, wheel2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "boat_trailer") {
    const frame = box(2.4, 0.08, 0.8, 0.3, 0x4a4a4e, 0.9);
    const boat = box(2.0, 0.4, 0.7, 0.6, 0x2a5a8a, 0.7);
    const w1 = mesh("cylinder", { r: 0.2, r2: 0.2, h: 0.12, seg: 8 }, 0x1a1a1e, 0.2, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.9, 0.2, 0.45);
    const w2 = w1.clone();
    w2.position.z = -0.45;
    g.add(frame, boat, w1, w2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  }

  // --- ÉVÉNEMENTS RP ---
  else if (type === "barricade") {
    const bar = box(1.6, 0.8, 0.08, 0.4, 0xe86820, 0.8);
    const leg1 = box(0.08, 0.8, 0.5, 0.4, 0x3a3a3e, 0.9);
    leg1.position.x = -0.7;
    const leg2 = leg1.clone();
    leg2.position.x = 0.7;
    g.add(bar, leg1, leg2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "police_barrier") {
    const post1 = box(0.04, 1.0, 0.04, 0.5, 0x3a3a3e, 0.9);
    post1.position.x = -1.0;
    const post2 = post1.clone();
    post2.position.x = 1.0;
    const tape = box(2.0, 0.08, 0.02, 0.8, 0xffdd00, 0.9);
    g.add(post1, post2, tape);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "first_aid_kit") {
    const box_ = box(0.35, 0.25, 0.2, 0.125, 0xc03028, 0.7);
    const cross1 = box(0.2, 0.04, 0.02, 0.125, 0xffffff, 0.9);
    cross1.position.z = 0.11;
    const cross2 = box(0.04, 0.2, 0.02, 0.125, 0xffffff, 0.9);
    cross2.position.z = 0.11;
    g.add(box_, cross1, cross2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "checkpoint") {
    const post = box(0.1, 2.4, 0.1, 1.2, 0x8a8a86, 0.9);
    const flag = box(0.7, 0.4, 0.04, 2.1, 0xc03028, 0.9);
    flag.position.x = 0.4;
    g.add(post, flag);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "campfire") {
    for (let i = 0; i < 6; i++) {
      const stone = mesh("sphere", { r: 0.12, seg: 6 }, 0x6a6258, 0.12, 0.95);
      const angle = (i / 6) * Math.PI * 2;
      stone.position.set(Math.cos(angle) * 0.4, 0.12, Math.sin(angle) * 0.4);
      g.add(stone);
    }
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), matLib.getEmissive(0xff6622, 0xff4400, 2.0));
    fire.position.y = 0.35;
    g.add(fire);
    addLightToProp(g, propDef?.light);
    addParticlesToProp(g, propDef?.particles);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "tent") {
    const body = box(1.8, 1.2, 1.8, 0.6, 0x2a5a2a, 0.9);
    body.rotation.x = 0.15;
    g.add(body);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(body, style);
  }

  // --- GMod ---
  else if (type === "chair") {
    const seat = box(0.5, 0.06, 0.5, 0.46, 0x5a4030, 0.9);
    const backrest = box(0.5, 0.55, 0.06, 0.76, 0x4a3428, 0.9);
    backrest.position.z = -0.22;
    const leg1 = box(0.06, 0.46, 0.06, 0.23, 0x3a2a20, 0.9);
    leg1.position.set(-0.2, 0.23, 0.18);
    const leg2 = leg1.clone();
    leg2.position.x = 0.2;
    g.add(seat, backrest, leg1, leg2);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(seat, style);
    applyStyleToMesh(backrest, style);
  } else if (type === "table") {
    const top = box(1.4, 0.08, 0.8, 0.74, 0x6a4a30, 0.9);
    for (const [x, z] of [[-0.58, -0.3], [0.58, -0.3], [-0.58, 0.3], [0.58, 0.3]] as const) {
      const leg = box(0.07, 0.7, 0.07, 0.35, 0x3a2a20, 0.9);
      leg.position.set(x, 0.35, z);
      g.add(leg);
    }
    g.add(top);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
    applyStyleToMesh(top, style);
  } else if (type === "trampoline") {
    const frame = mesh("cylinder", { r: 1.15, r2: 1.15, h: 0.08, seg: 12 }, 0x2a4a88, 0.42, 0.4);
    const net = mesh("torus", { r: 1.2, tube: 0.08, seg: 16 }, 0x2a2a2e, 0.42, 0.4);
    g.add(frame, net);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "mine") {
    const body = mesh("cylinder", { r: 0.28, r2: 0.32, h: 0.1, seg: 10 }, 0x3a3a28, 0.06, 0.6);
    const spike = mesh("cone", { r: 0.06, h: 0.16, seg: 6 }, 0x8a2020, 0.18, 0.8);
    g.add(body, spike);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "portal") {
    const ring = new THREE.Mesh(getGeo("torus", { r: 1.1, tube: 0.1, seg: 18 }), matLib.getEmissive(0x3ad0e0, 0x3ad0e0, 1.6));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.3;
    const disc = new THREE.Mesh(getGeo("ring", { r: 1.05, r2: 0.08, seg: 16 }), matLib.getEmissive(0x143848, 0x1a6088, 0.7));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 1.3;
    g.add(ring, disc);
    addLightToProp(g, propDef?.light);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "bomb") {
    const body = mesh("sphere", { r: 0.32, seg: 10 }, 0x2a2a2e, 0.36, 0.4);
    const fuse = box(0.06, 0.22, 0.06, 0.7, 0xc8a040, 0.4);
    g.add(body, fuse);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  } else if (type === "torus") {
    const t = new THREE.Mesh(getGeo("torus", { r: 0.7, tube: 0.22, seg: 16 }), matLib.get(0x6a5a88, 0.45, 0.35));
    t.position.y = 0.7;
    t.castShadow = true;
    g.add(t);
    if (isGhost) t.material = GHOST_MAT;
    applyStyleToMesh(t, style);
  }

  // --- FALLBACK : modèle générique ou alias ---
  else {
    const extra = buildFromMeta(type);
    if (extra) return extra;
    // Marqueur visible pour les props non implémentés
    const marker = box(0.12, 1.8, 0.12, 0.9, 0x4a3828, 0.9);
    const label = box(1.2, 0.7, 0.06, 1.6, 0xc8b070, 0.9);
    g.add(marker, label);
    if (isGhost) g.traverse((o) => ((o as THREE.Mesh).material = GHOST_MAT));
  }

  return g;
}

// ============================================================================
// 🌐 GESTIONNAIRE DE CHAMP DE PROPS (avec support RP)
// ============================================================================

/** Saison actuelle du jeu (à définir ailleurs). */
let currentSeason: Season = "ete";
let currentDay: number = 0;

/**
 * Définit la saison actuelle.
 * @param season - Nouvelle saison.
 */
export function setCurrentSeason(season: Season): void {
  currentSeason = season;
  // Rafraîchir les props saisonniers
  // (À implémenter : masquer/afficher les props selon la saison)
}

/**
 * Définit le jour actuel.
 * @param day - Nouveau jour.
 */
export function setCurrentDay(day: number): void {
  currentDay = day;
}

/**
 * Vérifie si un prop est disponible selon la saison actuelle.
 * @param propDef - Définition du prop.
 * @returns `true` si disponible.
 */
export function isPropAvailable(propDef: PropDef): boolean {
  if (!propDef.seasons || propDef.seasons.length === 0) return true;
  return propDef.seasons.includes(currentSeason);
}

/**
 * Vérifie si un prop peut être placé sur un terrain donné.
 * @param propDef - Définition du prop.
 * @param terrain - Type de terrain.
 * @returns `true` si compatible.
 */
export function canPlaceOnTerrain(propDef: PropDef, terrain: TerrainType): boolean {
  if (!propDef.compatibleTerrains || propDef.compatibleTerrains.length === 0) return true;
  return propDef.compatibleTerrains.includes(terrain);
}

/**
 * Vérifie si un prop peut être placé à proximité d'un autre prop requis.
 * @param propDef - Définition du prop.
 * @param nearbyProps - Props à proximité.
 * @param distance - Distance maximale.
 * @returns `true` si les prérequis sont satisfaits.
 */
export function checkPrerequisites(
  propDef: PropDef,
  nearbyProps: PlacedProp[],
  distance: number
): boolean {
  if (!propDef.prerequisites?.props || propDef.prerequisites.props.length === 0) return true;

  for (const requiredProp of propDef.prerequisites.props) {
    const found = nearbyProps.some(
      (p) => p.type === requiredProp && Math.hypot(p.x - nearbyProps[0].x, p.z - nearbyProps[0].z) <= distance
    );
    if (!found) return false;
  }
  return true;
}

/**
 * Applique la dégradation aux props placés.
 * @param placedProps - Liste des props placés.
 * @param daysPassed - Nombre de jours écoulés.
 */
export function applyDurabilityDecay(placedProps: PlacedProp[], daysPassed: number): PlacedProp[] {
  return placedProps.map((prop) => {
    const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === prop.type);
    if (!propDef?.durability) return prop; // Pas de dégradation

    // Calcul de la dégradation (1% par jour par défaut)
    const decayRate = 0.01;
    const newDurability = (prop.durability ?? propDef.durability) - daysPassed * decayRate * 100;

    return {
      ...prop,
      durability: Math.max(0, newDurability),
      isBroken: newDurability <= 0,
    };
  });
}

/**
 * Répare un prop.
 * @param prop - Prop à réparer.
 * @param resources - Ressources disponibles.
 * @returns `true` si la réparation a réussi.
 */
export function repairProp(prop: PlacedProp, resources: ResourceCost): boolean {
  const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === prop.type);
  if (!propDef?.maintenanceCost || !prop.isBroken) return false;

  // Vérifier si les ressources sont suffisantes
  for (const [resource, amount] of Object.entries(propDef.maintenanceCost)) {
    if ((resources[resource as ResourceType] ?? 0) < amount) {
      return false;
    }
  }

  // Réparer le prop
  return true;
}

/**
 * Gère l'interaction avec un prop.
 * @param prop - Prop avec lequel interagir.
 * @returns Résultat de l'interaction (ex: succès, message).
 */
export function interactWithProp(prop: PlacedProp): { success: boolean; message: string } {
  const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === prop.type);
  if (!propDef?.isInteractive) {
    return { success: false, message: "Ce prop n'est pas interactif." };
  }

  // Logique spécifique selon le type de prop
  if (prop.type === "fire_pit" || prop.type === "bbq_grill") {
    const isActive = prop.isActive ?? false;
    return {
      success: true,
      message: isActive ? "Feu éteint." : "Feu allumé!",
    };
  } else if (prop.type === "generator") {
    return {
      success: true,
      message: "Génératrice démarrée/arrêtée.",
    };
  } else {
    return { success: true, message: `Interaction avec ${propDef.label}.` };
  }
}

/**
 * Champ de props avec support pour le RP.
 */
export class PropField {
  group = new THREE.Group();
  ghost = new THREE.Group();
  private meshes = new Map<string, THREE.Group>();
  private ghostType: PropId | null = null;
  private placedProps: PlacedProp[] = [];

  constructor() {
    this.group.name = "builder";
    this.ghost.visible = false;
    this.group.add(this.ghost);
  }

  /**
   * Hydrate le champ avec une liste de props placés.
   * @param list - Liste des props placés.
   */
  hydrate(list: PlacedProp[]) {
    this.placedProps = list;
    for (const m of this.meshes.values()) this.group.remove(m);
    this.meshes.clear();
    for (const p of list) this.spawn(p);
  }

  /**
   * Ajoute un prop au champ.
   * @param p - Prop à ajouter.
   */
  spawn(p: PlacedProp) {
    if (this.meshes.has(p.id)) return;

    const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === p.type);
    if (!propDef) return;

    // Ne pas spawner si le prop n'est pas disponible cette saison
    if (!isPropAvailable(propDef)) return;

    const mesh = buildProp(p.type, p.style, p.isBroken);
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.y = p.yaw;
    mesh.scale.setScalar(p.scale);
    mesh.userData.propId = p.id;
    mesh.userData.isBroken = p.isBroken;

    // Ajouter des effets spéciaux si le prop est actif
    if (p.isActive && propDef.particles) {
      addParticlesToProp(mesh, propDef.particles);
    }

    this.group.add(mesh);
    this.meshes.set(p.id, mesh);
  }

  /**
   * Récupère un prop par son ID.
   * @param id - ID du prop.
   * @returns Mesh du prop ou `null`.
   */
  get(id: string) {
    return this.meshes.get(id) ?? null;
  }

  /**
   * Supprime un prop du champ.
   * @param id - ID du prop.
   */
  remove(id: string) {
    const m = this.meshes.get(id);
    if (!m) return;
    this.group.remove(m);
    this.meshes.delete(id);
    this.placedProps = this.placedProps.filter((p) => p.id !== id);
  }

  /**
   * Supprime tous les props du champ.
   */
  clear() {
    for (const m of this.meshes.values()) this.group.remove(m);
    this.meshes.clear();
    this.placedProps = [];
  }

  /**
   * Trouve le prop le plus proche des coordonnées données.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param maxDistance - Distance maximale (par défaut 5).
   * @returns ID du prop le plus proche ou `null`.
   */
  nearest(x: number, z: number, maxDistance = 5): string | null {
    let best: string | null = null;
    let minDistance = maxDistance;

    for (const [id, m] of this.meshes) {
      const d = Math.hypot(m.position.x - x, m.position.z - z);
      if (d < minDistance) {
        minDistance = d;
        best = id;
      }
    }

    return best;
  }

  /**
   * Synchronise le fantôme de prévisualisation.
   * @param type - Type du prop.
   * @param x - Coordonnée X.
   * @param y - Coordonnée Y.
   * @param z - Coordonnée Z.
   * @param yaw - Rotation.
   * @param scale - Échelle.
   * @param style - Style du prop.
   */
  syncGhost(
    type: PropId | null,
    x: number,
    y: number,
    z: number,
    yaw: number,
    scale: number,
    style?: PropStyle
  ) {
    if (!type) {
      this.ghost.visible = false;
      return;
    }

    const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === type);
    if (!propDef) {
      this.ghost.visible = false;
      return;
    }

    // Ne pas afficher si le prop n'est pas disponible cette saison
    if (!isPropAvailable(propDef)) {
      this.ghost.visible = false;
      return;
    }

    if (this.ghostType !== type) {
      this.ghost.clear();
      const mesh = buildProp(type, style, true); // true = isGhost
      this.ghost.add(mesh);
      this.ghostType = type;
    }

    this.ghost.visible = true;
    this.ghost.position.set(x, y, z);
    this.ghost.rotation.y = yaw;
    this.ghost.scale.setScalar(scale);
  }

  /**
   * Place un prop dans le champ.
   * @param type - Type du prop.
   * @param x - Coordonnée X.
   * @param y - Coordonnée Y.
   * @param z - Coordonnée Z.
   * @param yaw - Rotation.
   * @param scale - Échelle.
   * @param style - Style du prop.
   * @returns ID du prop placé ou `null` en cas d'échec.
   */
  placeProp(
    type: PropId,
    x: number,
    y: number,
    z: number,
    yaw: number,
    scale: number,
    style?: PropStyle
  ): string | null {
    const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === type);
    if (!propDef) return null;

    // Vérifier la saison
    if (!isPropAvailable(propDef)) {
      console.warn(`Le prop ${type} n'est pas disponible cette saison.`);
      return null;
    }

    // Vérifier le terrain (à implémenter avec votre système de terrain)
    // Exemple : const terrain = getTerrainAt(x, z);
    // if (!canPlaceOnTerrain(propDef, terrain)) return null;

    // Vérifier les prérequis (ex: prop requis à proximité)
    const nearbyProps = this.getNearbyProps(x, z, propDef.prerequisites?.distance || 0);
    if (!checkPrerequisites(propDef, nearbyProps, propDef.prerequisites?.distance || 0)) {
      console.warn(`Les prérequis pour ${type} ne sont pas satisfaits.`);
      return null;
    }

    // Créer le prop placé
    const id = `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const placedProp: PlacedProp = {
      id,
      type,
      x,
      y,
      z,
      yaw,
      scale,
      style,
      durability: propDef.durability,
      isBroken: false,
      isActive: false,
      placedAt: currentDay,
      lastMaintenance: currentDay,
    };

    this.placedProps.push(placedProp);
    this.spawn(placedProp);
    return id;
  }

  /**
   * Récupère les props à proximité d'une position.
   * @param x - Coordonnée X.
   * @param z - Coordonnée Z.
   * @param radius - Rayon de recherche.
   * @returns Liste des props à proximité.
   */
  getNearbyProps(x: number, z: number, radius: number): PlacedProp[] {
    return this.placedProps.filter(
      (p) => Math.hypot(p.x - x, p.z - z) <= radius
    );
  }

  /**
   * Active ou désactive un prop.
   * @param id - ID du prop.
   * @param isActive - État souhaité.
   */
  setPropActive(id: string, isActive: boolean) {
    const prop = this.placedProps.find((p) => p.id === id);
    if (!prop) return;

    prop.isActive = isActive;
    const mesh = this.meshes.get(id);
    if (!mesh) return;

    // Reconstruire le mesh pour appliquer les effets (particules, lumière)
    this.group.remove(mesh);
    this.meshes.delete(id);
    this.spawn(prop);
  }

  /**
   * Répare un prop.
   * @param id - ID du prop.
   * @param resources - Ressources à utiliser.
   * @returns `true` si la réparation a réussi.
   */
  repairProp(id: string, resources: ResourceCost): boolean {
    const prop = this.placedProps.find((p) => p.id === id);
    if (!prop) return false;

    const propDef = PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === prop.type);
    if (!propDef?.maintenanceCost || !prop.isBroken) return false;

    // Vérifier les ressources
    for (const [resource, amount] of Object.entries(propDef.maintenanceCost)) {
      if ((resources[resource as ResourceType] ?? 0) < amount) {
        return false;
      }
    }

    // Réparer le prop
    prop.durability = propDef.durability;
    prop.isBroken = false;
    prop.lastMaintenance = currentDay;

    // Mettre à jour le mesh
    const mesh = this.meshes.get(id);
    if (mesh) {
      this.group.remove(mesh);
      this.meshes.delete(id);
      this.spawn(prop);
    }

    return true;
  }

  /**
   * Récupère tous les props placés.
   * @returns Liste des props placés.
   */
  getAllPlacedProps(): PlacedProp[] {
    return this.placedProps;
  }

  /**
   * Applique la dégradation à tous les props.
   * @param daysPassed - Nombre de jours écoulés.
   */
  applyDecay(daysPassed: number): void {
    this.placedProps = applyDurabilityDecay(this.placedProps, daysPassed);
    // Reconstruire les meshs pour refléter la dégradation
    for (const prop of this.placedProps) {
      const mesh = this.meshes.get(prop.id);
      if (mesh) {
        this.group.remove(mesh);
        this.meshes.delete(prop.id);
        this.spawn(prop);
      }
    }
  }
}

// ============================================================================
// 🎯 FONCTIONS UTILITAIRES POUR LE RP
// ============================================================================

/**
 * Récupère la définition d'un prop par son ID.
 * @param id - ID du prop.
 * @returns Définition du prop ou `undefined`.
 */
export function getPropDef(id: PropId): PropDef | undefined {
  return PROP_CATALOG.flatMap((c) => c.items).find((i) => i.id === id);
}

/**
 * Récupère les quêtes associées à un prop.
 * @param id - ID du prop.
 * @returns Liste des quêtes ou vide.
 */
export function getPropQuests(id: PropId): PropQuest[] {
  const propDef = getPropDef(id);
  return propDef?.quests || [];
}

/**
 * Vérifie si un prop est saisonnier et disponible.
 * @param id - ID du prop.
 * @returns `true` si disponible.
 */
export function isPropSeasonal(id: PropId): boolean {
  const propDef = getPropDef(id);
  return propDef?.seasons && propDef.seasons.length > 0;
}

/**
 * Récupère les props d'une catégorie spécifique.
 * @param category - Catégorie.
 * @returns Liste des props de la catégorie.
 */
export function getPropsByCategory(category: string): PropDef[] {
  const cat = PROP_CATALOG.find((c) => c.cat === category);
  return cat?.items || [];
}

/**
 * Récupère les props avec un trait spécifique.
 * @param trait - Trait.
 * @returns Liste des props avec le trait.
 */
export function getPropsByTrait(trait: PropTrait): PropDef[] {
  return PROP_CATALOG.flatMap((c) => c.items).filter((i) => i.traits?.includes(trait));
}

/**
 * Récupère les props accessibles avec les ressources disponibles.
 * @param resources - Ressources disponibles.
 * @returns Liste des props accessibles.
 */
export function getAffordableProps(resources: ResourceCost): PropDef[] {
  return PROP_CATALOG.flatMap((c) => c.items).filter((prop) => {
    if (!prop.cost) return true; // Gratuit
    return Object.entries(prop.cost).every(
      ([resource, amount]) => (resources[resource as ResourceType] ?? 0) >= amount
    );
  });
}
