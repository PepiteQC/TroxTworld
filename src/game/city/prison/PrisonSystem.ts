// ═══════════════════════════════════════════════════════════════════════════
//  PRISON SYSTEM — GESTION CARCÉRALE
//  src/world/prison/PrisonSystem.ts
//
//  Ce qui fait vivre le pénitencier :
//    · BOOKING       — admission, fouille, saisie des effets, photo
//    · CELLULES      — assignation automatique ou manuelle, compatibilités
//    · SENTENCES     — durée, remise de peine, libération conditionnelle
//    · ROUTINE       — horaire quotidien (réveil, repas, cour, verrouillage)
//    · LOCKDOWN      — verrouillage général sur incident
//    · CATALOGUE     — 30+ objets pour l'éditeur d'intérieur
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import type { BuiltPrison, CellDescriptor, BlockId } from './PrisonComplex';
import { setCellDoorState, triggerLockdown } from './PrisonComplex';

// ─────────────────────────────────────────────────────────────────────────
//  DÉTENUS
// ─────────────────────────────────────────────────────────────────────────

export type SecurityLevel = 'minimale' | 'moyenne' | 'maximale' | 'isolement';

export type ChargeCategory =
  | 'vol' | 'voies_de_fait' | 'stupefiants' | 'arme_prohibee'
  | 'conduite_dangereuse' | 'fraude' | 'meurtre' | 'evasion' | 'autre';

export interface Charge {
  id: string;
  category: ChargeCategory;
  label: string;
  /** Durée ajoutée à la sentence, en minutes de jeu. */
  jailMinutes: number;
  fine: number;
  securityImpact: number;   // influence le classement sécuritaire
}

/** Barème des accusations — aligné sur le système de crimes existant. */
export const CHARGE_CATALOG: Record<string, Charge> = {
  vol_simple: { id: 'vol_simple', category: 'vol', label: 'Vol simple', jailMinutes: 8, fine: 800, securityImpact: 1 },
  vol_qualifie: { id: 'vol_qualifie', category: 'vol', label: 'Vol qualifié', jailMinutes: 22, fine: 3500, securityImpact: 3 },
  intro_par_effraction: { id: 'intro_par_effraction', category: 'vol', label: 'Introduction par effraction', jailMinutes: 15, fine: 2200, securityImpact: 2 },
  vol_vehicule: { id: 'vol_vehicule', category: 'vol', label: 'Vol de véhicule', jailMinutes: 14, fine: 2800, securityImpact: 2 },
  voies_de_fait: { id: 'voies_de_fait', category: 'voies_de_fait', label: 'Voies de fait', jailMinutes: 12, fine: 1500, securityImpact: 2 },
  voies_graves: { id: 'voies_graves', category: 'voies_de_fait', label: 'Voies de fait graves', jailMinutes: 30, fine: 5000, securityImpact: 4 },
  possession_stup: { id: 'possession_stup', category: 'stupefiants', label: 'Possession de stupéfiants', jailMinutes: 6, fine: 900, securityImpact: 1 },
  trafic_stup: { id: 'trafic_stup', category: 'stupefiants', label: 'Trafic de stupéfiants', jailMinutes: 26, fine: 6500, securityImpact: 3 },
  arme_prohibee: { id: 'arme_prohibee', category: 'arme_prohibee', label: 'Possession d\'arme prohibée', jailMinutes: 25, fine: 5000, securityImpact: 4 },
  arme_sans_permis: { id: 'arme_sans_permis', category: 'arme_prohibee', label: 'Possession sans permis', jailMinutes: 10, fine: 1800, securityImpact: 2 },
  conduite_dangereuse: { id: 'conduite_dangereuse', category: 'conduite_dangereuse', label: 'Conduite dangereuse', jailMinutes: 9, fine: 1400, securityImpact: 1 },
  delit_de_fuite: { id: 'delit_de_fuite', category: 'conduite_dangereuse', label: 'Délit de fuite', jailMinutes: 16, fine: 2600, securityImpact: 2 },
  fraude: { id: 'fraude', category: 'fraude', label: 'Fraude', jailMinutes: 18, fine: 4000, securityImpact: 1 },
  meurtre: { id: 'meurtre', category: 'meurtre', label: 'Meurtre au premier degré', jailMinutes: 60, fine: 0, securityImpact: 10 },
  tentative_meurtre: { id: 'tentative_meurtre', category: 'meurtre', label: 'Tentative de meurtre', jailMinutes: 45, fine: 12000, securityImpact: 8 },
  evasion: { id: 'evasion', category: 'evasion', label: 'Évasion', jailMinutes: 40, fine: 8000, securityImpact: 9 },
};

export interface Inmate {
  id: string;
  characterId: string;
  name: string;

  // Admission
  bookingNumber: string;
  bookedAt: number;
  bookedBy: string;             // officier
  mugshotTaken: boolean;
  propertySeized: Array<{ itemId: string; name: string; quantity: number }>;

  // Sentence
  charges: Charge[];
  totalSentenceMinutes: number;
  servedMinutes: number;
  releaseAt: number;
  goodBehaviorCredits: number;  // réduit la peine

  // Classement
  securityLevel: SecurityLevel;
  cellId: string | null;
  block: BlockId | null;

  // Statut
  inYard: boolean;
  inSolitary: boolean;
  solitaryUntil: number | null;
  gangAffiliation: string | null;
  incidents: number;

  // Historique
  visits: number;
  workAssignment: string | null;
}

export interface PrisonIncident {
  id: string;
  type: 'bagarre' | 'contrebande' | 'tentative_evasion' | 'refus_ordre' | 'agression_agent';
  inmateIds: string[];
  location: string;
  timestamp: number;
  reportedBy: string;
  sanctionMinutes: number;
  resolved: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
//  ROUTINE QUOTIDIENNE
// ─────────────────────────────────────────────────────────────────────────

export interface ScheduleSlot {
  hour: number;
  label: string;
  cellsLocked: boolean;
  yardAccess: boolean;
  activity: 'sommeil' | 'reveil' | 'repas' | 'travail' | 'cour' | 'douches' | 'loisirs' | 'comptage';
}

/** Horaire type d'un établissement à sécurité moyenne. */
export const DAILY_SCHEDULE: ScheduleSlot[] = [
  { hour: 0,  label: 'Nuit — verrouillage',       cellsLocked: true,  yardAccess: false, activity: 'sommeil' },
  { hour: 6,  label: 'Réveil',                     cellsLocked: true,  yardAccess: false, activity: 'reveil' },
  { hour: 7,  label: 'Comptage du matin',          cellsLocked: true,  yardAccess: false, activity: 'comptage' },
  { hour: 8,  label: 'Déjeuner — cantine',         cellsLocked: false, yardAccess: false, activity: 'repas' },
  { hour: 9,  label: 'Affectations de travail',    cellsLocked: false, yardAccess: false, activity: 'travail' },
  { hour: 12, label: 'Dîner',                      cellsLocked: false, yardAccess: false, activity: 'repas' },
  { hour: 13, label: 'Cour de promenade',          cellsLocked: false, yardAccess: true,  activity: 'cour' },
  { hour: 15, label: 'Douches et gymnase',         cellsLocked: false, yardAccess: false, activity: 'douches' },
  { hour: 17, label: 'Souper',                     cellsLocked: false, yardAccess: false, activity: 'repas' },
  { hour: 18, label: 'Loisirs — salle commune',    cellsLocked: false, yardAccess: false, activity: 'loisirs' },
  { hour: 20, label: 'Comptage du soir',           cellsLocked: true,  yardAccess: false, activity: 'comptage' },
  { hour: 21, label: 'Retour en cellule',          cellsLocked: true,  yardAccess: false, activity: 'sommeil' },
];

export function getScheduleAt(hour: number): ScheduleSlot {
  let current = DAILY_SCHEDULE[0];
  for (const slot of DAILY_SCHEDULE) {
    if (hour >= slot.hour) current = slot;
  }
  return current;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CATALOGUE D'OBJETS — pour l'éditeur d'intérieur
// ═══════════════════════════════════════════════════════════════════════════

export type PrisonObjectCategory =
  | 'cellule' | 'cantine' | 'gym' | 'douches' | 'controle' | 'cour' | 'securite';

export interface PrisonObjectDef {
  id: string;
  name: string;
  category: PrisonObjectCategory;
  size: [number, number, number];
  icon: string;
  interactive: boolean;
  /** Peut être utilisé comme arme improvisée. */
  weaponizable?: boolean;
  description: string;
}

export const PRISON_OBJECTS: PrisonObjectDef[] = [
  // ── CELLULE ──
  { id: 'lit_superpose', name: 'Lit superposé', category: 'cellule', size: [0.8, 1.9, 2.0], icon: '🛏️', interactive: true, description: 'Deux couchettes en acier soudé.' },
  { id: 'lit_simple', name: 'Couchette simple', category: 'cellule', size: [0.8, 0.5, 2.0], icon: '🛏️', interactive: true, description: 'Cellule individuelle.' },
  { id: 'toilette_inox', name: 'Toilette-lavabo inox', category: 'cellule', size: [0.45, 1.2, 0.45], icon: '🚽', interactive: true, description: 'Combiné inox scellé au mur.' },
  { id: 'tablette_beton', name: 'Tablette de béton', category: 'cellule', size: [0.7, 0.06, 0.35], icon: '📚', interactive: false, description: 'Coulée dans le mur, impossible à arracher.' },
  { id: 'tabouret_fixe', name: 'Tabouret fixe', category: 'cellule', size: [0.32, 0.42, 0.32], icon: '🪑', interactive: true, description: 'Scellé au sol.' },
  { id: 'miroir_metal', name: 'Miroir métallique', category: 'cellule', size: [0.3, 0.4, 0.02], icon: '🪞', interactive: false, weaponizable: true, description: 'Acier poli — le verre est interdit.' },
  { id: 'casier_cellule', name: 'Casier personnel', category: 'cellule', size: [0.4, 0.5, 0.35], icon: '🗄️', interactive: true, description: 'Effets personnels autorisés.' },
  { id: 'radio_cellule', name: 'Radio portative', category: 'cellule', size: [0.2, 0.12, 0.1], icon: '📻', interactive: true, description: 'Privilège retirable en cas d\'incident.' },

  // ── CANTINE ──
  { id: 'table_cantine', name: 'Table de cantine', category: 'cantine', size: [2.4, 0.78, 0.9], icon: '🍽️', interactive: true, description: 'Table à bancs intégrés, boulonnée au sol.' },
  { id: 'comptoir_service', name: 'Comptoir de service', category: 'cantine', size: [4.0, 1.1, 0.8], icon: '🍲', interactive: true, description: 'Ligne de service avec bacs chauffants.' },
  { id: 'plateau_repas', name: 'Plateau-repas', category: 'cantine', size: [0.4, 0.05, 0.3], icon: '🍱', interactive: true, description: 'Plastique rigide, compté à chaque service.' },
  { id: 'chariot_cuisine', name: 'Chariot de cuisine', category: 'cantine', size: [0.9, 1.2, 0.6], icon: '🛒', interactive: true, description: 'Transport des repas vers les blocs.' },
  { id: 'distributeur_eau', name: 'Distributeur d\'eau', category: 'cantine', size: [0.5, 1.4, 0.4], icon: '🚰', interactive: true, description: 'Point d\'eau de la cantine.' },
  { id: 'poubelle_tri', name: 'Poubelle de tri', category: 'cantine', size: [0.5, 0.9, 0.5], icon: '🗑️', interactive: true, description: 'Cachette classique pour la contrebande.' },

  // ── GYMNASE ──
  { id: 'banc_developpe', name: 'Banc de développé', category: 'gym', size: [1.4, 0.5, 0.6], icon: '🏋️', interactive: true, description: 'Le poste le plus disputé du gym.' },
  { id: 'rack_halteres', name: 'Rack d\'haltères', category: 'gym', size: [2.0, 1.0, 0.5], icon: '🏋️', interactive: true, weaponizable: true, description: 'Poids comptés après chaque séance.' },
  { id: 'barre_traction', name: 'Barre de traction', category: 'gym', size: [2.6, 2.4, 0.3], icon: '💪', interactive: true, description: 'Fixée au mur porteur.' },
  { id: 'tapis_sol', name: 'Tapis de sol', category: 'gym', size: [2.0, 0.05, 1.0], icon: '🧘', interactive: false, description: 'Mousse haute densité.' },
  { id: 'sac_frappe', name: 'Sac de frappe', category: 'gym', size: [0.4, 1.4, 0.4], icon: '🥊', interactive: true, description: 'Suspendu à la charpente.' },
  { id: 'velo_stationnaire', name: 'Vélo stationnaire', category: 'gym', size: [1.2, 1.3, 0.6], icon: '🚴', interactive: true, description: 'Cardio autorisé sans surveillance rapprochée.' },
  { id: 'panier_basket_int', name: 'Panier intérieur', category: 'gym', size: [1.8, 3.5, 1.0], icon: '🏀', interactive: true, description: 'Terrain du gymnase.' },

  // ── DOUCHES ──
  { id: 'pomme_douche', name: 'Pomme de douche', category: 'douches', size: [0.15, 0.2, 0.15], icon: '🚿', interactive: true, description: 'Débit et température contrôlés depuis le poste.' },
  { id: 'cloison_douche', name: 'Cloison de douche', category: 'douches', size: [0.06, 1.8, 1.0], icon: '🧱', interactive: false, description: 'Hauteur réglementaire — visibilité conservée.' },
  { id: 'banc_vestiaire', name: 'Banc de vestiaire', category: 'douches', size: [1.8, 0.45, 0.35], icon: '🪑', interactive: true, description: 'Béton coulé.' },
  { id: 'grille_evacuation', name: 'Grille d\'évacuation', category: 'douches', size: [0.3, 0.02, 0.3], icon: '🕳️', interactive: true, description: 'Point de dissimulation fréquent.' },
  { id: 'lavabo_commun', name: 'Lavabo commun', category: 'douches', size: [1.6, 1.0, 0.5], icon: '🚰', interactive: true, description: 'Rangée de lavabos inox.' },

  // ── SALLE DE CONTRÔLE ──
  { id: 'console_controle', name: 'Console de contrôle', category: 'controle', size: [2.4, 1.1, 0.8], icon: '🎛️', interactive: true, description: 'Commande toutes les serrures du bâtiment.' },
  { id: 'mur_ecrans', name: 'Mur d\'écrans CCTV', category: 'controle', size: [3.0, 1.8, 0.15], icon: '📺', interactive: true, description: 'Retour de toutes les caméras.' },
  { id: 'armoire_cles', name: 'Armoire à clés', category: 'controle', size: [0.8, 1.2, 0.3], icon: '🔑', interactive: true, description: 'Clés physiques de secours, sous double contrôle.' },
  { id: 'radio_base', name: 'Station radio', category: 'controle', size: [0.5, 0.4, 0.35], icon: '📡', interactive: true, description: 'Communication avec les agents en poste.' },
  { id: 'alarme_murale', name: 'Alarme murale', category: 'controle', size: [0.25, 0.3, 0.12], icon: '🚨', interactive: true, description: 'Déclenche le lockdown général.' },
  { id: 'registre_detenus', name: 'Registre des détenus', category: 'controle', size: [0.35, 0.05, 0.25], icon: '📋', interactive: true, description: 'Liste nominative et assignations.' },

  // ── COUR ──
  { id: 'banc_cour', name: 'Banc de cour', category: 'cour', size: [2.4, 0.6, 0.5], icon: '🪑', interactive: true, description: 'Béton, scellé au sol.' },
  { id: 'table_picnic', name: 'Table de pique-nique', category: 'cour', size: [1.6, 0.9, 1.6], icon: '🪑', interactive: true, description: 'Pied central en béton.' },
  { id: 'panier_basket_ext', name: 'Panier extérieur', category: 'cour', size: [1.8, 3.6, 1.2], icon: '🏀', interactive: true, description: 'Terrain de la cour.' },
  { id: 'barre_traction_ext', name: 'Barres extérieures', category: 'cour', size: [2.6, 2.4, 0.4], icon: '💪', interactive: true, description: 'Aire de musculation à l\'air libre.' },

  // ── SÉCURITÉ ──
  { id: 'camera_surveillance', name: 'Caméra de surveillance', category: 'securite', size: [0.3, 0.2, 0.2], icon: '📹', interactive: true, description: 'Champ de vision configurable.' },
  { id: 'detecteur_metaux', name: 'Détecteur de métaux', category: 'securite', size: [1.0, 2.2, 0.4], icon: '🔍', interactive: true, description: 'Portique à l\'entrée de chaque bloc.' },
  { id: 'porte_barreaux', name: 'Porte à barreaux', category: 'securite', size: [1.2, 2.2, 0.2], icon: '🚪', interactive: true, description: 'Coulissante, commandée à distance.' },
  { id: 'grille_separation', name: 'Grille de séparation', category: 'securite', size: [3.0, 3.0, 0.15], icon: '🔲', interactive: true, description: 'Sectionne les couloirs en cas d\'incident.' },
  { id: 'projecteur_mural', name: 'Projecteur mural', category: 'securite', size: [0.4, 0.3, 0.3], icon: '💡', interactive: true, description: 'Éclairage d\'urgence.' },
];

export function getObjectsByCategory(cat: PrisonObjectCategory): PrisonObjectDef[] {
  return PRISON_OBJECTS.filter((o) => o.category === cat);
}

// ═══════════════════════════════════════════════════════════════════════════
//  GESTIONNAIRE
// ═══════════════════════════════════════════════════════════════════════════

export interface BookingResult {
  ok: boolean;
  inmate?: Inmate;
  cellId?: string;
  error?: string;
}

export class PrisonSystem {
  private inmates = new Map<string, Inmate>();
  private cellOccupancy = new Map<string, string[]>();  // cellId → inmateIds
  private incidents: PrisonIncident[] = [];
  private lockdownActive = false;
  private lockdownUntil = 0;
  private bookingCounter = 1000;

  private listeners: Array<(event: string, data: any) => void> = [];

  constructor(private prison: BuiltPrison) {
    for (const cell of prison.cells) {
      this.cellOccupancy.set(cell.id, []);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  ADMISSION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Booking complet d'un détenu : calcul de la sentence, classement
   * sécuritaire, assignation de cellule.
   */
  bookInmate(
    characterId: string,
    name: string,
    chargeIds: string[],
    officerName: string,
    seizedItems: Array<{ itemId: string; name: string; quantity: number }> = [],
    gangAffiliation: string | null = null
  ): BookingResult {
    if (this.findInmateByCharacter(characterId)) {
      return { ok: false, error: 'Ce détenu est déjà incarcéré' };
    }

    const charges = chargeIds
      .map((id) => CHARGE_CATALOG[id])
      .filter((c): c is Charge => !!c);

    if (charges.length === 0) {
      return { ok: false, error: 'Aucune accusation valide' };
    }

    const totalMinutes = charges.reduce((s, c) => s + c.jailMinutes, 0);
    const securityScore = charges.reduce((s, c) => s + c.securityImpact, 0);

    const securityLevel: SecurityLevel =
      securityScore >= 9 ? 'maximale'
      : securityScore >= 4 ? 'moyenne'
      : 'minimale';

    const now = Date.now();
    const inmate: Inmate = {
      id: `inm_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      characterId,
      name,
      bookingNumber: `PQ-${this.bookingCounter++}`,
      bookedAt: now,
      bookedBy: officerName,
      mugshotTaken: false,
      propertySeized: seizedItems,
      charges,
      totalSentenceMinutes: totalMinutes,
      servedMinutes: 0,
      releaseAt: now + totalMinutes * 60_000,
      goodBehaviorCredits: 0,
      securityLevel,
      cellId: null,
      block: null,
      inYard: false,
      inSolitary: false,
      solitaryUntil: null,
      gangAffiliation,
      incidents: 0,
      visits: 0,
      workAssignment: null,
    };

    this.inmates.set(inmate.id, inmate);

    // Assignation automatique
    const cell = this.assignCell(inmate);
    if (!cell) {
      this.inmates.delete(inmate.id);
      return { ok: false, error: 'Aucune cellule disponible — établissement plein' };
    }

    this.emit('inmate_booked', { inmate, cellId: cell.id });
    console.log(
      `🔒 [Prison] ${name} écroué — ${inmate.bookingNumber}, ` +
      `cellule ${cell.id}, ${totalMinutes} min, sécurité ${securityLevel}`
    );

    return { ok: true, inmate, cellId: cell.id };
  }

  /**
   * Trouve la meilleure cellule pour un détenu.
   *
   * Règles réelles appliquées :
   *   · sécurité maximale → bloc D, cellule individuelle si possible
   *   · pas de codétenu de gang rival dans la même cellule
   *   · on remplit les cellules à deux avant d'en ouvrir de nouvelles
   */
  private assignCell(inmate: Inmate): CellDescriptor | null {
    const preferredBlocks: BlockId[] =
      inmate.securityLevel === 'maximale' ? ['D', 'C']
      : inmate.securityLevel === 'moyenne' ? ['B', 'C', 'A']
      : ['A', 'B'];

    // 1. Cellule partiellement occupée, compatible
    for (const block of preferredBlocks) {
      const cells = this.prison.cells.filter((c) => c.block === block);
      for (const cell of cells) {
        const occupants = this.cellOccupancy.get(cell.id) ?? [];
        if (occupants.length === 0 || occupants.length >= cell.capacity) continue;

        // Vérification des gangs rivaux
        const conflict = occupants.some((oid) => {
          const other = this.inmates.get(oid);
          return other?.gangAffiliation
            && inmate.gangAffiliation
            && other.gangAffiliation !== inmate.gangAffiliation;
        });
        if (conflict) continue;

        // Sécurité maximale : jamais avec un détenu de niveau inférieur
        if (inmate.securityLevel === 'maximale') continue;

        this.placeInmate(inmate, cell);
        return cell;
      }
    }

    // 2. Cellule vide
    for (const block of preferredBlocks) {
      const cells = this.prison.cells.filter((c) => c.block === block);
      for (const cell of cells) {
        const occupants = this.cellOccupancy.get(cell.id) ?? [];
        if (occupants.length === 0) {
          this.placeInmate(inmate, cell);
          return cell;
        }
      }
    }

    // 3. N'importe quelle place restante
    for (const cell of this.prison.cells) {
      const occupants = this.cellOccupancy.get(cell.id) ?? [];
      if (occupants.length < cell.capacity) {
        this.placeInmate(inmate, cell);
        return cell;
      }
    }

    return null;
  }

  private placeInmate(inmate: Inmate, cell: CellDescriptor): void {
    inmate.cellId = cell.id;
    inmate.block = cell.block;
    const list = this.cellOccupancy.get(cell.id) ?? [];
    list.push(inmate.id);
    this.cellOccupancy.set(cell.id, list);
  }

  /**
   * Transfert manuel vers une autre cellule.
   */
  transferInmate(inmateId: string, targetCellId: string): { ok: boolean; error?: string } {
    const inmate = this.inmates.get(inmateId);
    if (!inmate) return { ok: false, error: 'Détenu introuvable' };

    const target = this.prison.cells.find((c) => c.id === targetCellId);
    if (!target) return { ok: false, error: 'Cellule introuvable' };

    const occupants = this.cellOccupancy.get(targetCellId) ?? [];
    if (occupants.length >= target.capacity) {
      return { ok: false, error: 'Cellule pleine' };
    }

    // Retire de l'ancienne
    if (inmate.cellId) {
      const old = this.cellOccupancy.get(inmate.cellId) ?? [];
      const i = old.indexOf(inmateId);
      if (i !== -1) old.splice(i, 1);
    }

    this.placeInmate(inmate, target);
    this.emit('inmate_transferred', { inmateId, from: inmate.cellId, to: targetCellId });
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────
  //  SENTENCE ET LIBÉRATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Avance le temps de détention. À appeler périodiquement.
   * Retourne les détenus à libérer.
   */
  tick(deltaMinutes: number): Inmate[] {
    const now = Date.now();
    const toRelease: Inmate[] = [];

    for (const inmate of this.inmates.values()) {
      inmate.servedMinutes += deltaMinutes;

      // Bonne conduite : crédit toutes les 10 minutes sans incident
      if (inmate.incidents === 0 && inmate.servedMinutes % 10 < deltaMinutes) {
        inmate.goodBehaviorCredits += 1;
        inmate.releaseAt -= 60_000;  // une minute de moins
      }

      // Fin d'isolement
      if (inmate.inSolitary && inmate.solitaryUntil && now > inmate.solitaryUntil) {
        inmate.inSolitary = false;
        inmate.solitaryUntil = null;
        this.emit('solitary_ended', { inmateId: inmate.id });
      }

      if (now >= inmate.releaseAt) {
        toRelease.push(inmate);
      }
    }

    // Fin du lockdown
    if (this.lockdownActive && now > this.lockdownUntil) {
      this.endLockdown();
    }

    return toRelease;
  }

  /**
   * Libère un détenu et lui rend ses effets personnels.
   */
  releaseInmate(inmateId: string, reason: 'fin_peine' | 'liberation_conditionnelle' | 'admin' = 'fin_peine'): {
    ok: boolean;
    returnedProperty?: Inmate['propertySeized'];
    error?: string;
  } {
    const inmate = this.inmates.get(inmateId);
    if (!inmate) return { ok: false, error: 'Détenu introuvable' };

    if (inmate.cellId) {
      const occupants = this.cellOccupancy.get(inmate.cellId) ?? [];
      const i = occupants.indexOf(inmateId);
      if (i !== -1) occupants.splice(i, 1);
    }

    this.inmates.delete(inmateId);
    this.emit('inmate_released', { inmate, reason });
    console.log(`🚪 [Prison] ${inmate.name} libéré (${reason})`);

    return { ok: true, returnedProperty: inmate.propertySeized };
  }

  // ─────────────────────────────────────────────────────────────────
  //  INCIDENTS ET SANCTIONS
  // ─────────────────────────────────────────────────────────────────

  reportIncident(
    type: PrisonIncident['type'],
    inmateIds: string[],
    location: string,
    reportedBy: string
  ): PrisonIncident {
    const sanctions: Record<PrisonIncident['type'], number> = {
      bagarre: 15,
      contrebande: 20,
      tentative_evasion: 60,
      refus_ordre: 8,
      agression_agent: 45,
    };

    const incident: PrisonIncident = {
      id: `inc_${Date.now().toString(36)}`,
      type,
      inmateIds,
      location,
      timestamp: Date.now(),
      reportedBy,
      sanctionMinutes: sanctions[type],
      resolved: false,
    };

    this.incidents.push(incident);

    // Applique la sanction
    for (const id of inmateIds) {
      const inmate = this.inmates.get(id);
      if (!inmate) continue;
      inmate.incidents++;
      inmate.releaseAt += incident.sanctionMinutes * 60_000;
      inmate.totalSentenceMinutes += incident.sanctionMinutes;
      inmate.goodBehaviorCredits = 0;

      // Les incidents graves envoient au trou
      if (type === 'tentative_evasion' || type === 'agression_agent') {
        this.sendToSolitary(id, 20);
      }
    }

    // Une tentative d'évasion déclenche le lockdown
    if (type === 'tentative_evasion') {
      this.startLockdown(10, 'Tentative d\'évasion');
    }

    this.emit('incident_reported', incident);
    console.log(`⚠️ [Prison] Incident ${type} — ${inmateIds.length} détenu(s), +${incident.sanctionMinutes} min`);
    return incident;
  }

  sendToSolitary(inmateId: string, minutes: number): boolean {
    const inmate = this.inmates.get(inmateId);
    if (!inmate) return false;

    inmate.inSolitary = true;
    inmate.solitaryUntil = Date.now() + minutes * 60_000;
    inmate.securityLevel = 'isolement';
    inmate.inYard = false;

    this.emit('sent_to_solitary', { inmateId, minutes });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────
  //  CONTRÔLE DES PORTES
  // ─────────────────────────────────────────────────────────────────

  openCell(cellId: string): boolean {
    if (this.lockdownActive) return false;
    const cell = this.prison.cells.find((c) => c.id === cellId);
    if (!cell) return false;
    setCellDoorState(cell, true, false);
    this.emit('cell_opened', { cellId });
    return true;
  }

  closeCell(cellId: string, lock = true): boolean {
    const cell = this.prison.cells.find((c) => c.id === cellId);
    if (!cell) return false;
    setCellDoorState(cell, false, lock);
    return true;
  }

  /**
   * Ouvre ou ferme toutes les cellules d'un bloc — routine quotidienne.
   */
  setBlockDoors(block: BlockId, open: boolean): number {
    if (this.lockdownActive && open) return 0;
    let count = 0;
    for (const cell of this.prison.cells) {
      if (cell.block !== block) continue;
      setCellDoorState(cell, open, !open);
      count++;
    }
    this.emit('block_doors_changed', { block, open, count });
    return count;
  }

  /**
   * Applique l'horaire du jour — ouvre ou verrouille selon l'heure.
   */
  applySchedule(hour: number): ScheduleSlot {
    const slot = getScheduleAt(hour);
    if (this.lockdownActive) return slot;

    for (const cell of this.prison.cells) {
      setCellDoorState(cell, !slot.cellsLocked, slot.cellsLocked);
    }

    // Accès à la cour
    for (const inmate of this.inmates.values()) {
      inmate.inYard = slot.yardAccess && !inmate.inSolitary;
    }

    return slot;
  }

  // ─────────────────────────────────────────────────────────────────
  //  LOCKDOWN
  // ─────────────────────────────────────────────────────────────────

  startLockdown(minutes: number, reason: string): void {
    this.lockdownActive = true;
    this.lockdownUntil = Date.now() + minutes * 60_000;

    triggerLockdown(this.prison);

    for (const inmate of this.inmates.values()) {
      inmate.inYard = false;
    }

    this.emit('lockdown_started', { reason, minutes });
    console.log(`🚨 [Prison] LOCKDOWN — ${reason} (${minutes} min)`);
  }

  endLockdown(): void {
    this.lockdownActive = false;
    this.lockdownUntil = 0;
    this.emit('lockdown_ended', {});
    console.log('✅ [Prison] Fin du lockdown');
  }

  isLockdown(): boolean {
    return this.lockdownActive;
  }

  // ─────────────────────────────────────────────────────────────────
  //  REQUÊTES
  // ─────────────────────────────────────────────────────────────────

  getInmate(id: string): Inmate | undefined {
    return this.inmates.get(id);
  }

  findInmateByCharacter(characterId: string): Inmate | undefined {
    for (const i of this.inmates.values()) {
      if (i.characterId === characterId) return i;
    }
    return undefined;
  }

  getAllInmates(): Inmate[] {
    return Array.from(this.inmates.values());
  }

  getInmatesByBlock(block: BlockId): Inmate[] {
    return this.getAllInmates().filter((i) => i.block === block);
  }

  getCellOccupants(cellId: string): Inmate[] {
    const ids = this.cellOccupancy.get(cellId) ?? [];
    return ids.map((id) => this.inmates.get(id)!).filter(Boolean);
  }

  getIncidents(limit = 20): PrisonIncident[] {
    return this.incidents.slice(-limit).reverse();
  }

  getStats() {
    const inmates = this.getAllInmates();
    const totalCapacity = this.prison.cells.reduce((s, c) => s + c.capacity, 0);
    const bySecurity: Record<string, number> = {};
    const byBlock: Record<string, number> = {};

    for (const i of inmates) {
      bySecurity[i.securityLevel] = (bySecurity[i.securityLevel] ?? 0) + 1;
      if (i.block) byBlock[i.block] = (byBlock[i.block] ?? 0) + 1;
    }

    const occupiedCells = Array.from(this.cellOccupancy.values())
      .filter((list) => list.length > 0).length;

    return {
      population: inmates.length,
      capacity: totalCapacity,
      occupancyRate: `${Math.round((inmates.length / totalCapacity) * 100)}%`,
      cells: this.prison.cells.length,
      occupiedCells,
      freeCells: this.prison.cells.length - occupiedCells,
      bySecurity,
      byBlock,
      inSolitary: inmates.filter((i) => i.inSolitary).length,
      inYard: inmates.filter((i) => i.inYard).length,
      incidents24h: this.incidents.filter(
        (i) => Date.now() - i.timestamp < 86_400_000
      ).length,
      lockdown: this.lockdownActive,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  ÉVÉNEMENTS
  // ─────────────────────────────────────────────────────────────────

  on(listener: (event: string, data: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i !== -1) this.listeners.splice(i, 1);
    };
  }

  private emit(event: string, data: any): void {
    this.listeners.forEach((l) => l(event, data));
  }

  // ─────────────────────────────────────────────────────────────────
  //  EXPORT / IMPORT — sauvegarde de l'état carcéral
  // ─────────────────────────────────────────────────────────────────

  exportState(): string {
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      inmates: Array.from(this.inmates.values()),
      cellOccupancy: Array.from(this.cellOccupancy.entries()),
      incidents: this.incidents,
      lockdownActive: this.lockdownActive,
      bookingCounter: this.bookingCounter,
    }, null, 2);
  }

  importState(json: string): { ok: boolean; error?: string } {
    try {
      const data = JSON.parse(json);
      if (data.version !== 1) return { ok: false, error: 'Version incompatible' };

      this.inmates.clear();
      for (const inmate of data.inmates) {
        this.inmates.set(inmate.id, inmate);
      }

      this.cellOccupancy.clear();
      for (const [cellId, ids] of data.cellOccupancy) {
        this.cellOccupancy.set(cellId, ids);
      }

      this.incidents = data.incidents ?? [];
      this.lockdownActive = data.lockdownActive ?? false;
      this.bookingCounter = data.bookingCounter ?? 1000;

      // Réapplique l'état des portes
      for (const cell of this.prison.cells) {
        setCellDoorState(cell, false, true);
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'JSON invalide' };
    }
  }
}