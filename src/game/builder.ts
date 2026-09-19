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
  | "sonore"
  | "";

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
}

// ============================================================================
// CATALOGUE DE PROPS — STRUCTURÉ POUR LE RP RÉALISTE QUÉBÉCOIS
// ============================================================================
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
      { id: "bus_stop_quebec", label: "Arrêt d'autobus", cat: "Mobilier urbain", description: "Abribus typique" },
      { id: "street_lamp", label: "Lampadaire", cat: "Mobilier urbain" },
      { id: "park_bench", label: "Banc de parc", cat: "Mobilier urbain" },
      { id: "trash_bin", label: "Poubelle publique", cat: "Mobilier urbain" },
      { id: "recycling_bin", label: "Bac de recyclage", cat: "Mobilier urbain" },
      { id: "fire_hydrant", label: "Bouche d'incendie", cat: "Mobilier urbain" },
      { id: "traffic_cone", label: "Cône orange", cat: "Mobilier urbain" },
      { id: "jersey_barrier", label: "Mur Jersey", cat: "Mobilier urbain" },
      { id: "parking_meter", label: "Parcomètre", cat: "Mobilier urbain" },
      { id: "mailbox_urban", label: "Boîte aux lettres", cat: "Mobilier urbain" },
    ],
  },

  // --- VIE RURALE (RANGS, FERMES, ÉRABLIÈRES) ---
  {
    cat: "Vie rurale",
    items: [
      { id: "rural_mailbox", label: "Boîte aux lettres rurale", cat: "Vie rurale", description: "Sur pied en acier" },
      { id: "wooden_fence", label: "Clôture de rang", cat: "Vie rurale" },
      { id: "hay_bale", label: "Botte de foin", cat: "Vie rurale" },
      { id: "grain_silo", label: "Silo à grain", cat: "Vie rurale" },
      { id: "log_stack", label: "Pile de bois", cat: "Vie rurale" },
      { id: "sugar_shack", label: "Cabane à sucre", cat: "Vie rurale" },
      { id: "maple_tree", label: "Érable à sucre", cat: "Vie rurale" },
      { id: "spruce_tree", label: "Épinette", cat: "Vie rurale" },
      { id: "birch_tree", label: "Bouleau", cat: "Vie rurale" },
      { id: "tractor", label: "Tracteur", cat: "Vie rurale" },
      { id: "wagon", label: "Char à foin", cat: "Vie rurale" },
      { id: "cow", label: "Vache laitière", cat: "Vie rurale" },
    ],
  },

  // --- STRUCTURES & BÂTIMENTS ---
  {
    cat: "Structures",
    items: [
      { id: "wall", label: "Mur", cat: "Structures" },
      { id: "pillar", label: "Pilier", cat: "Structures" },
      { id: "ramp", label: "Rampe", cat: "Structures" },
      { id: "arch", label: "Arche", cat: "Structures" },
      { id: "scaffolding", label: "Échafaudage", cat: "Structures" },
      { id: "portable_toilet", label: "Toilette chimique", cat: "Structures" },
      { id: "storage_shed", label: "Hangar de rangement", cat: "Structures" },
    ],
  },

  // --- COMMERCE & SERVICES ---
  {
    cat: "Commerce",
    items: [
      { id: "atm", label: "GAB (bancomat)", cat: "Commerce" },
      { id: "gas_pump", label: "Pompe à essence", cat: "Commerce" },
      { id: "shop_shelf", label: "Étagère", cat: "Commerce" },
      { id: "cash_register", label: "Caisse enregistreuse", cat: "Commerce" },
      { id: "shopping_cart", label: "Panier d'épicerie", cat: "Commerce" },
      { id: "lcbo_shelf", label: "Étalage SAQ", cat: "Commerce" },
      { id: "neon_sign", label: "Néon commercial", cat: "Commerce" },
    ],
  },

  // --- INDUSTRIEL & CHANTIER ---
  {
    cat: "Industriel",
    items: [
      { id: "oil_barrel", label: "Baril de pétrole", cat: "Industriel" },
      { id: "storage_tank", label: "Réservoir", cat: "Industriel" },
      { id: "forklift", label: "Chariot élévateur", cat: "Industriel" },
      { id: "pallet", label: "Palette", cat: "Industriel" },
      { id: "cement_bag", label: "Sac de ciment", cat: "Industriel" },
      { id: "generator", label: "Génératrice", cat: "Industriel" },
      { id: "cement_mixer", label: "Bétonnière", cat: "Industriel" },
      { id: "electrical_box", label: "Boîtier électrique", cat: "Industriel" },
    ],
  },

  // --- NATURE & PAYSAGE ---
  {
    cat: "Nature",
    items: [
      { id: "rock", label: "Rocher de granit", cat: "Nature" },
      { id: "bush", label: "Buisson", cat: "Nature" },
      { id: "fern", label: "Fougère", cat: "Nature" },
      { id: "wildflower", label: "Fleurs sauvages", cat: "Nature" },
      { id: "dead_tree", label: "Arbre mort", cat: "Nature" },
      { id: "stump", label: "Souche", cat: "Nature" },
    ],
  },

  // --- ÉCLAIRAGE ---
  {
    cat: "Éclairage",
    items: [
      { id: "lamp_post", label: "Lampadaire", cat: "Éclairage" },
      { id: "spot", label: "Projecteur", cat: "Éclairage" },
      { id: "neon", label: "Néon", cat: "Éclairage" },
      { id: "lantern", label: "Lanterne", cat: "Éclairage" },
      { id: "fire_pit", label: "Foyer extérieur", cat: "Éclairage" },
      { id: "christmas_lights", label: "Guirlande de Noël", cat: "Éclairage" },
    ],
  },

  // --- DÉCOR QUÉBÉCOIS ---
  {
    cat: "Décor",
    items: [
      { id: "picnic_table", label: "Table à pique-nique", cat: "Décor" },
      { id: "bbq_grill", label: "Barbecue", cat: "Décor" },
      { id: "canoe", label: "Canot", cat: "Décor" },
      { id: "snowmobile", label: "Motoneige", cat: "Décor" },
      { id: "snowman", label: "Bonhomme de neige", cat: "Décor" },
      { id: "pumpkin", label: "Citrouille", cat: "Décor" },
      { id: "christmas_tree", label: "Sapin de Noël", cat: "Décor" },
      { id: "flag_quebec", label: "Drapeau du Québec", cat: "Décor" },
      { id: "bench", label: "Banc", cat: "Décor" },
      { id: "crate", label: "Caisse", cat: "Décor" },
      { id: "barrel", label: "Tonneau", cat: "Décor" },
    ],
  },

  // --- VÉHICULES & ÉPAVES ---
  {
    cat: "Véhicules & épaves",
    items: [
      { id: "wreck_pickup", label: "Épave de pick-up", cat: "Véhicules & épaves" },
      { id: "wreck_truck", label: "Épave de camion", cat: "Véhicules & épaves" },
      { id: "wreck_car", label: "Épave de voiture", cat: "Véhicules & épaves" },
      { id: "abandoned_tractor", label: "Tracteur abandonné", cat: "Véhicules & épaves" },
      { id: "boat_trailer", label: "Remorque à bateau", cat: "Véhicules & épaves" },
    ],
  },

  // --- ÉVÉNEMENTS RP ---
  {
    cat: "Événements RP",
    items: [
      { id: "barricade", label: "Barricade", cat: "Événements RP" },
      { id: "police_barrier", label: "Ruban de police", cat: "Événements RP" },
      { id: "first_aid_kit", label: "Trousse de soins", cat: "Événements RP" },
      { id: "checkpoint", label: "Poste de contrôle", cat: "Événements RP" },
      { id: "campfire", label: "Feu de camp", cat: "Événements RP" },
      { id: "tent", label: "Tente de camping", cat: "Événements RP" },
    ],
  },

  // --- GMod (objets fun / sandbox) ---
  {
    cat: "GMod",
    items: [
      { id: "chair", label: "Chaise", cat: "GMod" },
      { id: "table", label: "Table", cat: "GMod" },
      { id: "trampoline", label: "Trampoline", cat: "GMod" },
      { id: "mine", label: "Mine", cat: "GMod" },
      { id: "portal", label: "Portail", cat: "GMod" },
      { id: "bomb", label: "Bombe", cat: "GMod" },
      { id: "torus", label: "Tore", cat: "GMod" },
    ],
  },
];

// Ajout dynamique des modèles du catalogue principal
for (const cat of MODEL_CATEGORIES) {
  const items = placeableModels()
    .filter((d) => d.category === cat.id)
    .map((d) => ({ id: d.id, label: d.label, cat: cat.label, description: d.description }));
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
// STRUCTURE D'UN PROP PLACÉ
// ============================================================================
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

// ============================================================================
// CONSTRUCTEUR DE PROPS — BIBLIOTHÈQUE RP RÉALISTE
// ============================================================================
export function buildProp(type: PropId): THREE.Group {
  const g = new THREE.Group();
  g.name = type;

  // Résolution d'alias
  if (MODEL_ALIAS[type]) {
    return buildProp(MODEL_ALIAS[type]!);
  }

  // --- PRIMITIVES ---
  if (type === "cube") g.add(box(1.2, 1.2, 1.2, 0.6, 0x5a6a88));
  else if (type === "sphere") {
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
  } else if (type === "plane") g.add(box(2.4, 0.08, 2.4, 0.04, 0x6a6660));

  // --- VIE URBAINE ---
  else if (type === "bus_stop_quebec") {
    // Abribus : poteaux + toit + paroi
    const post1 = box(0.08, 2.4, 0.08, 1.2, 0x3a3a3e, 0.4);
    post1.position.x = -0.8;
    const post2 = post1.clone();
    post2.position.x = 0.8;
    const roof = box(1.8, 0.06, 1.2, 2.4, 0x2a4a6a, 0.5);
    const back = box(1.8, 1.8, 0.04, 1.3, 0x88ccee, 0.3); // verre
    back.position.z = -0.58;
    const bench = box(1.4, 0.08, 0.35, 0.5, 0x4a4a4e);
    g.add(post1, post2, roof, back, bench);
  } else if (type === "street_lamp") {
    g.add(box(0.12, 3.1, 0.12, 1.55, 0x2a2a2e, 0.4));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), matLib.getEmissive(0xffd88a, 0xffd88a, 1.4));
    lamp.position.y = 3.2;
    g.add(lamp);
  } else if (type === "park_bench") {
    // Banc de parc en bois
    const seat = box(1.6, 0.08, 0.42, 0.46, 0x5a4030);
    const backrest = box(1.6, 0.5, 0.06, 0.76, 0x4a3428);
    backrest.position.z = -0.18;
    const leg1 = box(0.08, 0.46, 0.42, 0.23, 0x2a2a2e);
    leg1.position.x = -0.7;
    const leg2 = leg1.clone();
    leg2.position.x = 0.7;
    g.add(seat, backrest, leg1, leg2);
  } else if (type === "trash_bin") {
    const bin = mesh("cylinder", { r: 0.28, r2: 0.3, h: 0.9, seg: 10 }, 0x2a4a2a, 0.45, 0.7);
    const lid = mesh("cylinder", { r: 0.32, r2: 0.32, h: 0.06, seg: 10 }, 0x1a3a1a, 0.92, 0.6);
    g.add(bin, lid);
  } else if (type === "recycling_bin") {
    const bin = mesh("cylinder", { r: 0.3, r2: 0.32, h: 1.0, seg: 10 }, 0x2a5a8a, 0.5, 0.7);
    g.add(bin);
  } else if (type === "fire_hydrant") {
    const body = mesh("cylinder", { r: 0.18, r2: 0.2, h: 0.7, seg: 8 }, 0xc03028, 0.35, 0.8);
    const top = mesh("sphere", { r: 0.14, seg: 8 }, 0xc03028, 0.72, 0.8);
    const nozzle1 = box(0.08, 0.08, 0.18, 0.45, 0xc03028);
    nozzle1.position.z = 0.18;
    const nozzle2 = nozzle1.clone();
    nozzle2.position.z = -0.18;
    g.add(body, top, nozzle1, nozzle2);
  } else if (type === "traffic_cone") {
    g.add(mesh("cone", { r: 0.22, h: 0.7, seg: 8 }, 0xe86820, 0.35));
    g.add(box(0.4, 0.04, 0.4, 0.02, 0x1a1a1e));
    // Bande réfléchissante
    const stripe = mesh("cylinder", { r: 0.16, r2: 0.18, h: 0.06, seg: 8 }, 0xffffff, 0.45, 0.3);
    g.add(stripe);
  } else if (type === "jersey_barrier") {
    const barrier = box(2.4, 0.9, 0.5, 0.45, 0x8a8a82, 0.95);
    g.add(barrier);
  } else if (type === "parking_meter") {
    const post = box(0.08, 1.1, 0.08, 0.55, 0x4a4a4e);
    const head = mesh("cylinder", { r: 0.14, r2: 0.14, h: 0.22, seg: 8 }, 0x3a3a3e, 1.2, 0.5);
    g.add(post, head);
  } else if (type === "mailbox_urban") {
    const post = box(0.08, 1.0, 0.08, 0.5, 0x4a4a4e);
    const box_ = box(0.3, 0.25, 0.2, 1.1, 0x2a2a6a);
    g.add(post, box_);
  }

  // --- VIE RURALE ---
  else if (type === "rural_mailbox") {
    const post = box(0.08, 1.1, 0.08, 0.55, 0x4a3828);
    const box_ = box(0.4, 0.25, 0.22, 1.2, 0x2a2a2e, 0.6);
    const flag = box(0.04, 0.2, 0.04, 1.25, 0xc03028);
    flag.position.x = 0.22;
    g.add(post, box_, flag);
  } else if (type === "wooden_fence") {
    // Section de clôture de rang
    for (let i = 0; i < 4; i++) {
      const post = box(0.1, 1.2, 0.1, 0.6, 0x5a4030);
      post.position.x = i * 0.8 - 1.2;
      g.add(post);
    }
    const rail1 = box(2.6, 0.08, 0.06, 0.9, 0x6a5040);
    const rail2 = box(2.6, 0.08, 0.06, 0.5, 0x6a5040);
    g.add(rail1, rail2);
  } else if (type === "hay_bale") {
    const bale = mesh("cylinder", { r: 0.55, r2: 0.55, h: 0.9, seg: 12 }, 0xc8a848, 0.45, 0.95);
    bale.rotation.z = Math.PI / 2;
    g.add(bale);
  } else if (type === "grain_silo") {
    const base = mesh("cylinder", { r: 1.2, r2: 1.2, h: 3.5, seg: 14 }, 0x8a8a82, 1.75, 0.8);
    const roof = mesh("cone", { r: 1.25, h: 0.8, seg: 14 }, 0x6a6a62, 3.9);
    g.add(base, roof);
  } else if (type === "log_stack") {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3 - i; j++) {
        const log = mesh("cylinder", { r: 0.18, r2: 0.18, h: 1.4, seg: 8 }, 0x5a3828, 0.18 + i * 0.34, 0.9);
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.18 + i * 0.34, j * 0.38 - 0.38 + i * 0.19);
        g.add(log);
      }
    }
  } else if (type === "sugar_shack") {
    // Petite cabane en bois rond
    const walls = box(2.4, 1.8, 2.0, 0.9, 0x5a3828, 0.95);
    const roof = box(2.8, 0.12, 2.4, 1.9, 0x3a2818);
    roof.rotation.x = 0.15;
    const door = box(0.6, 1.4, 0.06, 0.7, 0x2a1810);
    door.position.z = 1.03;
    g.add(walls, roof, door);
  } else if (type === "maple_tree") {
    const trunk = mesh("cylinder", { r: 0.18, r2: 0.24, h: 1.8, seg: 6 }, 0x4a3828, 0.9, 0.95);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), matLib.get(0xc85020, 0.95));
    canopy.position.y = 2.6;
    canopy.scale.set(1, 0.8, 1);
    canopy.castShadow = true;
    g.add(trunk, canopy);
  } else if (type === "spruce_tree") {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.4, 5), matLib.get(0x4a3828, 0.98));
    t.position.y = 0.7;
    t.castShadow = true;
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 6), matLib.get(0x24422c, 1));
    c.position.y = 2.4;
    c.castShadow = true;
    g.add(t, c);
  } else if (type === "birch_tree") {
    const t = mesh("cylinder", { r: 0.12, r2: 0.16, h: 2.2, seg: 6 }, 0xe8e0d0, 1.1, 0.7);
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), matLib.get(0x88aa44, 0.95));
    c.position.y = 2.8;
    c.scale.set(1, 1.2, 1);
    c.castShadow = true;
    g.add(t, c);
  } else if (type === "tractor") {
    const body = box(1.4, 0.9, 0.9, 0.7, 0xc03028);
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
  } else if (type === "wagon") {
    const bed = box(2.0, 0.12, 1.2, 0.55, 0x5a4030);
    for (const [x, z] of [[-0.85, -0.5], [0.85, -0.5], [-0.85, 0.5], [0.85, 0.5]] as const) {
      const wheel = mesh("cylinder", { r: 0.35, r2: 0.35, h: 0.12, seg: 10 }, 0x1a1a1e, 0.35, 0.9);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.35, z);
      g.add(wheel);
    }
    g.add(bed);
  } else if (type === "cow") {
    const body = box(1.4, 0.8, 0.7, 0.9, 0xe8e0d0, 0.95);
    const head = box(0.4, 0.4, 0.4, 1.1, 0xe8e0d0, 0.95);
    head.position.x = 0.85;
    const leg1 = box(0.12, 0.5, 0.12, 0.25, 0xe8e0d0);
    leg1.position.set(-0.5, 0.25, 0.25);
    const leg2 = leg1.clone();
    leg2.position.z = -0.25;
    const leg3 = leg1.clone();
    leg3.position.x = 0.5;
    const leg4 = leg3.clone();
    leg4.position.z = -0.25;
    g.add(body, head, leg1, leg2, leg3, leg4);
  }

  // --- STRUCTURES ---
  else if (type === "wall") g.add(box(3.2, 2.2, 0.28, 1.1, 0x8a6a4a));
  else if (type === "pillar") g.add(box(0.42, 3.2, 0.42, 1.6, 0x9a9086));
  else if (type === "ramp") {
    const m = box(2.4, 0.16, 3.2, 0.08, 0x6a6660);
    m.rotation.x = -0.32;
    m.position.z = 0.2;
    m.position.y = 0.5;
    g.add(m);
  } else if (type === "arch") {
    g.add(box(0.4, 2.4, 0.4, 1.2, 0x8a8580));
    g.children[0]!.position.x = -1.1;
    const r = box(0.4, 2.4, 0.4, 1.2, 0x8a8580);
    r.position.x = 1.1;
    g.add(r, box(2.6, 0.36, 0.4, 2.5, 0x8a8580));
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
  } else if (type === "portable_toilet") {
    const cab = box(1.1, 2.2, 1.1, 1.1, 0x2a5a8a, 0.7);
    const roof = box(1.2, 0.08, 1.2, 2.25, 0x1a3a5a);
    const door = box(0.7, 1.8, 0.04, 1.0, 0x1a3a5a);
    door.position.z = 0.57;
    g.add(cab, roof, door);
  } else if (type === "storage_shed") {
    const walls = box(2.4, 2.0, 1.8, 1.0, 0x6a5040, 0.95);
    const roof = box(2.6, 0.1, 2.0, 2.1, 0x3a2818);
    roof.rotation.x = 0.12;
    const door = box(0.8, 1.6, 0.06, 0.8, 0x2a1810);
    door.position.z = 0.93;
    g.add(walls, roof, door);
  }

  // --- COMMERCE ---
  else if (type === "atm") {
    const body = box(0.6, 1.4, 0.4, 0.7, 0x3a3a3e, 0.5);
    const screen = box(0.4, 0.3, 0.02, 1.1, 0x88ccee, 0.3);
    screen.position.z = 0.21;
    g.add(body, screen);
  } else if (type === "gas_pump") {
    const body = box(0.5, 1.5, 0.4, 0.75, 0xc03028, 0.6);
    const screen = box(0.35, 0.25, 0.02, 1.2, 0x88ccee, 0.3);
    screen.position.z = 0.21;
    const nozzle = box(0.08, 0.3, 0.08, 0.9, 0x1a1a1e);
    nozzle.position.set(0.3, 0.9, 0);
    g.add(body, screen, nozzle);
  } else if (type === "shop_shelf") {
    for (let i = 0; i < 4; i++) {
      const shelf = box(1.4, 0.04, 0.4, 0.3 + i * 0.45, 0x6a5040);
      g.add(shelf);
    }
    const side1 = box(0.04, 1.8, 0.4, 0.9, 0x4a3428);
    side1.position.x = -0.7;
    const side2 = side1.clone();
    side2.position.x = 0.7;
    g.add(side1, side2);
  } else if (type === "cash_register") {
    const body = box(0.4, 0.2, 0.35, 0.1, 0x3a3a3e, 0.5);
    const screen = box(0.25, 0.2, 0.04, 0.3, 0x88ccee, 0.3);
    screen.position.z = -0.18;
    screen.rotation.x = -0.2;
    g.add(body, screen);
  } else if (type === "shopping_cart") {
    const basket = box(0.6, 0.4, 0.45, 0.65, 0x8a8a8e, 0.5);
    for (const [x, z] of [[-0.25, -0.18], [0.25, -0.18], [-0.25, 0.18], [0.25, 0.18]] as const) {
      const wheel = mesh("cylinder", { r: 0.06, r2: 0.06, h: 0.04, seg: 6 }, 0x1a1a1e, 0.06, 0.6);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.06, z);
      g.add(wheel);
    }
    g.add(basket);
  } else if (type === "lcbo_shelf") {
    for (let i = 0; i < 3; i++) {
      const shelf = box(1.2, 0.04, 0.35, 0.4 + i * 0.4, 0x4a3428);
      g.add(shelf);
      // Bouteilles simulées
      for (let j = 0; j < 4; j++) {
        const bottle = mesh("cylinder", { r: 0.04, r2: 0.04, h: 0.28, seg: 6 }, 0x2a4a2a, 0.56 + i * 0.4, 0.4);
        bottle.position.x = -0.4 + j * 0.25;
        g.add(bottle);
      }
    }
  } else if (type === "neon_sign") {
    const n = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), matLib.getEmissive(0x3ad0e0, 0x3ad0e0, 1.8));
    n.position.y = 1.4;
    g.add(box(0.08, 1.4, 0.08, 0.7, 0x1a1a1e), n);
  }

  // --- INDUSTRIEL ---
  else if (type === "oil_barrel") {
    const m = new THREE.Mesh(getGeo("cylinder", { r: 0.38, r2: 0.4, h: 0.95, seg: 10 }), matLib.get(0x2a2a2e, 0.7, 0.15));
    m.position.y = 0.48;
    m.castShadow = true;
    g.add(m);
  } else if (type === "storage_tank") {
    const tank = mesh("cylinder", { r: 1.0, r2: 1.0, h: 2.2, seg: 14 }, 0x8a8a82, 1.1, 0.7);
    g.add(tank);
  } else if (type === "forklift") {
    const body = box(1.0, 0.8, 0.8, 0.6, 0xc8a020);
    const mast = box(0.12, 1.8, 0.12, 0.9, 0x3a3a3e);
    mast.position.x = 0.6;
    const fork1 = box(0.08, 0.04, 0.8, 0.08, 0x3a3a3e);
    fork1.position.set(0.6, 0.08, 0.2);
    const fork2 = fork1.clone();
    fork2.position.z = -0.2;
    g.add(body, mast, fork1, fork2);
  } else if (type === "pallet") {
    const base = box(1.0, 0.08, 1.0, 0.04, 0x6a5040);
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]] as const) {
      const foot = box(0.12, 0.08, 0.12, 0.04, 0x5a4030);
      foot.position.set(x, 0.04, z);
      g.add(foot);
    }
    g.add(base);
  } else if (type === "cement_bag") {
    const bag = box(0.5, 0.3, 0.35, 0.15, 0x8a8a82, 0.95);
    g.add(bag);
  } else if (type === "generator") {
    const body = box(0.8, 0.6, 0.5, 0.3, 0xc8a020, 0.7);
    const exhaust = mesh("cylinder", { r: 0.06, r2: 0.06, h: 0.2, seg: 6 }, 0x3a3a3e, 0.7, 0.5);
    exhaust.position.x = 0.3;
    g.add(body, exhaust);
  } else if (type === "cement_mixer") {
    const drum = mesh("cylinder", { r: 0.5, r2: 0.4, h: 0.9, seg: 10 }, 0xc8a020, 0.7, 0.7);
    drum.rotation.z = 0.3;
    const frame = box(0.8, 0.08, 0.6, 0.04, 0x3a3a3e);
    g.add(drum, frame);
  } else if (type === "electrical_box") {
    const box_ = box(0.6, 0.8, 0.2, 0.9, 0x4a4a4e, 0.6);
    const warning = box(0.2, 0.2, 0.02, 1.1, 0xc8a020);
    warning.position.z = 0.11;
    g.add(box_, warning);
  }

  // --- NATURE ---
  else if (type === "rock") {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), matLib.get(0x6a6258, 1));
    m.position.y = 0.4;
    m.castShadow = true;
    g.add(m);
  } else if (type === "bush") {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), matLib.get(0x2a5a32, 1));
    m.position.y = 0.45;
    m.scale.set(1.3, 0.8, 1.1);
    m.castShadow = true;
    g.add(m);
  } else if (type === "fern") {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 6), matLib.get(0x3a6a3a, 0.95));
    m.position.y = 0.3;
    g.add(m);
  } else if (type === "wildflower") {
    for (let i = 0; i < 5; i++) {
      const stem = mesh("cylinder", { r: 0.02, r2: 0.02, h: 0.3, seg: 4 }, 0x3a6a3a, 0.15, 0.9);
      stem.position.set((Math.random() - 0.5) * 0.4, 0.15, (Math.random() - 0.5) * 0.4);
      const flower = mesh("sphere", { r: 0.06, seg: 6 }, 0xe8a040, 0.32, 0.8);
      flower.position.copy(stem.position);
      flower.position.y = 0.32;
      g.add(stem, flower);
    }
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
  } else if (type === "stump") {
    const m = mesh("cylinder", { r: 0.3, r2: 0.35, h: 0.4, seg: 8 }, 0x5a3828, 0.2, 0.95);
    g.add(m);
  }

  // --- ÉCLAIRAGE ---
  else if (type === "lamp_post") {
    g.add(box(0.12, 3.1, 0.12, 1.55, 0x2a2a2e, 0.4));
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
    const n = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), matLib.getEmissive(0x3ad0e0, 0x3ad0e0, 1.8));
    n.position.y = 1.4;
    g.add(box(0.08, 1.4, 0.08, 0.7, 0x1a1a1e), n);
  } else if (type === "lantern") {
    const body = box(0.2, 0.3, 0.2, 0.6, 0x3a3a3e, 0.5);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), matLib.getEmissive(0xffaa44, 0xffaa44, 1.5));
    glow.position.y = 0.6;
    g.add(body, glow);
  } else if (type === "fire_pit") {
    const ring = mesh("cylinder", { r: 0.5, r2: 0.5, h: 0.2, seg: 10 }, 0x3a3a3e, 0.1, 0.8);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 6), matLib.getEmissive(0xff6622, 0xff4400, 2.0));
    fire.position.y = 0.4;
    g.add(ring, fire);
  } else if (type === "christmas_lights") {
    for (let i = 0; i < 8; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), matLib.getEmissive(0xff4444, 0xff2222, 1.5));
      bulb.position.set(i * 0.2 - 0.7, 0, 0);
      g.add(bulb);
    }
  }

  // --- DÉCOR QUÉBÉCOIS ---
  else if (type === "picnic_table") {
    const top = box(1.6, 0.06, 0.8, 0.74, 0x6a4a30);
    const seat1 = box(1.6, 0.06, 0.3, 0.46, 0x5a4030);
    seat1.position.z = 0.55;
    const seat2 = seat1.clone();
    seat2.position.z = -0.55;
    for (const [x, z] of [[-0.7, 0], [0.7, 0]] as const) {
      const leg = box(0.08, 0.7, 0.08, 0.35, 0x3a2a20);
      leg.position.set(x, 0.35, z);
      g.add(leg);
    }
    g.add(top, seat1, seat2);
  } else if (type === "bbq_grill") {
    const body = mesh("cylinder", { r: 0.35, r2: 0.35, h: 0.3, seg: 10 }, 0x1a1a1e, 0.85, 0.5);
    const lid = mesh("sphere", { r: 0.35, seg: 10 }, 0x1a1a1e, 1.0, 0.5);
    lid.scale.y = 0.5;
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as const) {
      const leg = box(0.04, 0.7, 0.04, 0.35, 0x1a1a1e);
      leg.position.set(x, 0.35, z);
      g.add(leg);
    }
    g.add(body, lid);
  } else if (type === "canoe") {
    const hull = box(2.4, 0.3, 0.5, 0.3, 0xc03028, 0.7);
    hull.rotation.x = 0.1;
    g.add(hull);
  } else if (type === "snowmobile") {
    const body = box(1.4, 0.4, 0.5, 0.4, 0xc03028, 0.7);
    const seat = box(0.6, 0.15, 0.4, 0.65, 0x1a1a1e);
    const ski1 = box(1.2, 0.04, 0.12, 0.02, 0x3a3a3e);
    ski1.position.z = 0.28;
    const ski2 = ski1.clone();
    ski2.position.z = -0.28;
    const track = box(0.8, 0.08, 0.4, 0.04, 0x1a1a1e);
    track.position.x = -0.3;
    g.add(body, seat, ski1, ski2, track);
  } else if (type === "snowman") {
    const b1 = mesh("sphere", { r: 0.5, seg: 10 }, 0xf0f0f0, 0.5, 0.9);
    const b2 = mesh("sphere", { r: 0.35, seg: 10 }, 0xf0f0f0, 1.2, 0.9);
    const b3 = mesh("sphere", { r: 0.25, seg: 10 }, 0xf0f0f0, 1.7, 0.9);
    const nose = mesh("cone", { r: 0.04, h: 0.2, seg: 6 }, 0xe86820, 1.7, 0.8);
    nose.rotation.z = Math.PI / 2;
    nose.position.x = 0.25;
    g.add(b1, b2, b3, nose);
  } else if (type === "pumpkin") {
    const m = mesh("sphere", { r: 0.25, seg: 10 }, 0xe86820, 0.25, 0.9);
    m.scale.set(1, 0.8, 1);
    g.add(m);
  } else if (type === "christmas_tree") {
    const trunk = mesh("cylinder", { r: 0.1, r2: 0.12, h: 0.4, seg: 6 }, 0x4a3828, 0.2, 0.95);
    const c1 = mesh("cone", { r: 0.8, h: 1.0, seg: 8 }, 0x24422c, 0.9);
    const c2 = mesh("cone", { r: 0.6, h: 0.8, seg: 8 }, 0x24422c, 1.5);
    const c3 = mesh("cone", { r: 0.4, h: 0.6, seg: 8 }, 0x24422c, 2.0);
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), matLib.getEmissive(0xffdd44, 0xffdd44, 2.0));
    star.position.y = 2.4;
    g.add(trunk, c1, c2, c3, star);
  } else if (type === "flag_quebec") {
    const post = box(0.06, 2.4, 0.06, 1.2, 0x4a4a4e);
    const flag = box(0.8, 0.5, 0.02, 2.0, 0x2a5a8a);
    flag.position.x = 0.43;
    const cross1 = box(0.6, 0.08, 0.03, 2.0, 0xffffff);
    cross1.position.x = 0.43;
    const cross2 = box(0.08, 0.4, 0.03, 2.0, 0xffffff);
    cross2.position.x = 0.43;
    g.add(post, flag, cross1, cross2);
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
  }

  // --- VÉHICULES & ÉPAVES ---
  else if (type === "wreck_pickup") {
    g.add(box(2.2, 0.7, 1.1, 0.55, 0x4a3a30));
    g.add(box(1.1, 0.5, 1.05, 1.1, 0x3a2a22));
    const w1 = mesh("cylinder", { r: 0.32, r2: 0.32, h: 0.18, seg: 8 }, 0x1a1a1e, 0.32, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.7, 0.32, 0.55);
    const w2 = w1.clone();
    w2.position.z = -0.55;
    g.add(w1, w2);
  } else if (type === "wreck_truck") {
    g.add(box(3.2, 1.0, 1.4, 0.7, 0x4a3a30));
    g.add(box(1.4, 0.8, 1.3, 1.6, 0x3a2a22));
    const w1 = mesh("cylinder", { r: 0.4, r2: 0.4, h: 0.22, seg: 8 }, 0x1a1a1e, 0.4, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-1.2, 0.4, 0.75);
    const w2 = w1.clone();
    w2.position.z = -0.75;
    const w3 = w1.clone();
    w3.position.x = 1.2;
    const w4 = w3.clone();
    w4.position.z = -0.75;
    g.add(w1, w2, w3, w4);
  } else if (type === "wreck_car") {
    g.add(box(1.8, 0.6, 1.0, 0.5, 0x4a3a30));
    g.add(box(1.0, 0.45, 0.95, 1.0, 0x3a2a22));
    const w1 = mesh("cylinder", { r: 0.28, r2: 0.28, h: 0.16, seg: 8 }, 0x1a1a1e, 0.28, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.6, 0.28, 0.5);
    const w2 = w1.clone();
    w2.position.z = -0.5;
    const w3 = w1.clone();
    w3.position.x = 0.6;
    const w4 = w3.clone();
    w4.position.z = -0.5;
    g.add(w1, w2, w3, w4);
  } else if (type === "abandoned_tractor") {
    const body = box(1.4, 0.9, 0.9, 0.7, 0x6a5a3a, 0.95);
    const wheel1 = mesh("cylinder", { r: 0.5, r2: 0.5, h: 0.25, seg: 10 }, 0x1a1a1e, 0.5, 0.9);
    wheel1.rotation.z = Math.PI / 2;
    wheel1.position.set(-0.5, 0.5, 0.55);
    const wheel2 = wheel1.clone();
    wheel2.position.z = -0.55;
    g.add(body, wheel1, wheel2);
  } else if (type === "boat_trailer") {
    const frame = box(2.4, 0.08, 0.8, 0.3, 0x4a4a4e);
    const boat = box(2.0, 0.4, 0.7, 0.6, 0x2a5a8a, 0.7);
    const w1 = mesh("cylinder", { r: 0.2, r2: 0.2, h: 0.12, seg: 8 }, 0x1a1a1e, 0.2, 0.9);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.9, 0.2, 0.45);
    const w2 = w1.clone();
    w2.position.z = -0.45;
    g.add(frame, boat, w1, w2);
  }

  // --- ÉVÉNEMENTS RP ---
  else if (type === "barricade") {
    const bar = box(1.6, 0.8, 0.08, 0.4, 0xe86820, 0.8);
    const leg1 = box(0.08, 0.8, 0.5, 0.4, 0x3a3a3e);
    leg1.position.x = -0.7;
    const leg2 = leg1.clone();
    leg2.position.x = 0.7;
    g.add(bar, leg1, leg2);
  } else if (type === "police_barrier") {
    const post1 = box(0.04, 1.0, 0.04, 0.5, 0x3a3a3e);
    post1.position.x = -1.0;
    const post2 = post1.clone();
    post2.position.x = 1.0;
    const tape = box(2.0, 0.08, 0.02, 0.8, 0xffdd00);
    g.add(post1, post2, tape);
  } else if (type === "first_aid_kit") {
    const box_ = box(0.35, 0.25, 0.2, 0.125, 0xc03028, 0.7);
    const cross1 = box(0.2, 0.04, 0.02, 0.125, 0xffffff);
    cross1.position.z = 0.11;
    const cross2 = box(0.04, 0.2, 0.02, 0.125, 0xffffff);
    cross2.position.z = 0.11;
    g.add(box_, cross1, cross2);
  } else if (type === "checkpoint") {
    g.add(box(0.1, 2.4, 0.1, 1.2, 0x8a8a86));
    const flag = box(0.7, 0.4, 0.04, 2.1, 0xc03028);
    flag.position.x = 0.4;
    g.add(flag);
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
  } else if (type === "tent") {
    const body = box(1.8, 1.2, 1.8, 0.6, 0x2a5a2a, 0.9);
    body.rotation.x = 0.15;
    g.add(body);
  }

  // --- GMod ---
  else if (type === "chair") {
    g.add(box(0.5, 0.06, 0.5, 0.46, 0x5a4030), box(0.5, 0.55, 0.06, 0.76, 0x4a3428));
    g.children[1]!.position.z = -0.22;
    g.add(box(0.06, 0.46, 0.06, 0.23, 0x3a2a20), box(0.06, 0.46, 0.06, 0.23, 0x3a2a20));
    g.children[2]!.position.set(-0.2, 0.23, 0.18);
    g.children[3]!.position.set(0.2, 0.23, 0.18);
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
  } else if (type === "bomb") {
    g.add(mesh("sphere", { r: 0.32, seg: 10 }, 0x2a2a2e, 0.36, 0.4));
    g.add(box(0.06, 0.22, 0.06, 0.7, 0xc8a040, 0.4));
  } else if (type === "torus") {
    const t = new THREE.Mesh(getGeo("torus", { r: 0.7, tube: 0.22, seg: 16 }), matLib.get(0x6a5a88, 0.45, 0.35));
    t.position.y = 0.7;
    t.castShadow = true;
    g.add(t);
  }

  // --- FALLBACK : modèle générique ---
  else {
    const extra = buildFromMeta(type);
    if (extra) return extra;
    // Marqueur visible pour les props non implémentés
    g.add(box(0.12, 1.8, 0.12, 0.9, 0x4a3828), box(1.2, 0.7, 0.06, 1.6, 0xc8b070));
  }

  return g;
}

// ============================================================================
// MATÉRIAU FANTÔME (PRÉVISUALISATION)
// ============================================================================
const GHOST_MAT = new THREE.MeshLambertMaterial({
  color: 0xa78bfa,
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
});

// ============================================================================
// GESTIONNAIRE DE CHAMP DE PROPS
// ============================================================================
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
}
