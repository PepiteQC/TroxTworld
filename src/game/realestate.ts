/**
 * ═══════════════════════════════════════════════════════════════════
 * IMMOBILIER QUÉBÉCOIS & MULTIJOUEUR — Système MLS, TAL et Hydro
 * ═══════════════════════════════════════════════════════════════════
 *
 * CONCEPT D'IMMERSION VRAIE VIE :
 *  - Courtiers immobiliers (joueurs) : gèrent les fiches Centris/MLS, font visiter et touchent des commissions.
 *  - Notaires (joueurs) : authentifient les ventes et rédigent les actes de vente officiels.
 *  - Tribunal administratif du logement (TAL) : gère les litiges, non-paiements, avis d'éviction et rénovictions.
 *  - Baux officiels du Québec : baux résidentiels (3½, 4½, 5½) ou commerciaux signés entre vrais joueurs.
 *  - Hypothèques Desjardins : calculées avec mise de fonds (min 5%), amortissement et taux d'intérêt.
 *  - Hydro-Québec : factures d'électricité basées sur la consommation réelle. Coupure de courant si impayé !
 *  - Serrures & Clés physiques/numériques : les joueurs peuvent changer les serrures, crocheter ou squatter.
 *  - Entretien & Sinistres : moisissure, dégâts d'eau, usure du temps, incendies ou dommages de grow-ops.
 *  - Huissiers de justice & SQ/SPVM : exécution légale des ordonnances d'expulsion du TAL.
 *
 * INTÉGRATIONS :
 *  - banking.ts (comptes Desjardins, prélèvements automatiques, cotes de crédit)
 *  - character.ts (propriétaires, locataires, inventaires de clés)
 *  - house.ts (valeurs, meubles, structures 3D)
 *  - police.ts (évictions forcées, mandats d'intrusion, perquisitions)
 *  - net.ts / remotes.ts (RPC et synchronisation multijoueur)
 *  - phone.tsx (alertes Centris, factures Hydro, baux à signer)
 * ═══════════════════════════════════════════════════════════════════
 */

import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";
import { sendPrivateMessage, sendChatMessage } from "./chat";
import { triggerNotification } from "./phone";
import { getPlayerData } from "./character";

// Systèmes interconnectés
import { getAccount, pushTx, removeCash, addCash, getCreditProfile } from "./banking";
import { addWantedPoints, dispatchPolice } from "./police";
import { VILLAGES } from "./worlddata";

// ═══════════════════════════════════════════════════════════
// UTILS LOCAUX
// ═══════════════════════════════════════════════════════════

// CORRECTION: Ajout de la fonction uid manquante
function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// CORRECTION: Ajout de la fonction round2 manquante
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ═══════════════════════════════════════════════════════════
// ENUMS ET TYPES QUÉBÉCOIS
// ═══════════════════════════════════════════════════════════

// CORRECTION: Ajout de "penthouse" au type PropertyType
export type PropertyType =
  | "house"          // Maison unifamiliale / Bungalow
  | "apartment"      // Condo, 1½, 3½, 4½, 5½
  | "business"       // Local commercial (magasin, resto)
  | "warehouse"      // Entrepôt industriel
  | "garage"         // Garage mécanique ou rangement
  | "cottage"        // Chalet (Laurentides)
  | "multiplex"      // Duplex, Triplex, Bloc appartements
  | "penthouse";     // Penthouse de luxe

export type PropertyZone =
  | "village"        // Centre-village
  | "rang"           // Zone agricole / Rang de campagne
  | "industrie"      // Parc industriel
  | "fleuve"         // Bord de l'eau (Saint-Laurent)
  | "laurentides"    // Zone montagneuse / Chalets
  | "luxe";          // Quartier chic / Domaines

export type LeaseStatus =
  | "pending_signature" // En attente de signature
  | "active"            // En vigueur
  | "expired"           // Terminé
  | "dispute"           // En litige au TAL
  | "evicted";          // Ordonnance d'expulsion prononcée

export type MortgageStatus =
  | "active"
  | "default"           // Défaut de paiement (avis de 60 jours)
  | "foreclosed"        // Saisie par la banque Desjardins
  | "paid_off";

export interface MarketProperty {
  id: string;
  kind: PropertyType;
  zone: PropertyZone;
  name: string;
  address: string;
  town: string;
  x: number;
  z: number;
  price: number;              // Prix de vente suggéré ou affiché
  municipalEvaluation: number;// Évaluation foncière pour les taxes
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  furnished: boolean;
  features: string[];
  rentPerDay: number;         // Équivalent d'un loyer quotidien RP
  garageCapacity: number;
  hydroAccountNumber: string; // Numéro de compte Hydro-Québec
}

// ═══════════════════════════════════════════════════════════
// ETATS DU DOSSIER IMMOBILIER (MLS / CENTRIS)
// ═══════════════════════════════════════════════════════════

export interface ListingState {
  price: number;
  description: string;
  listed: boolean;
  listedByBrokerId: string | null; // ID du courtier affilié
  commissionRate: number;          // % de commission (ex: 4% standard QC)
  views: number;
  offers: PropertyOffer[];
}

export interface PropertyOffer {
  offerId: string;
  buyerId: string;
  buyerName: string;
  amount: number;
  conditions: string[];            // ["inspection", "financement Desjardins"]
  expiryDate: number;
  status: "pending" | "accepted" | "refused" | "expired";
}

// ═══════════════════════════════════════════════════════════
// LE BAIL OFFICIEL (Tribunal Administratif du Logement)
// ═══════════════════════════════════════════════════════════

export interface QuebecLease {
  leaseId: string;
  propertyId: string;
  landlordId: string;
  landlordName: string;
  tenantId: string;
  tenantName: string;
  rentAmount: number;              // Loyer par jour ou semaine de jeu
  status: LeaseStatus;
  startDate: number;
  durationDays: number;
  unpaidRentsCount: number;
  talDisputeId: string | null;
  securityDeposit?: number;        // Illégal au QC en théorie, mais pratiqué en RP
  autoRenew: boolean;
}

export interface TalCase {
  disputeId: string;
  leaseId: string;
  plaintiffId: string;             // Demandeur
  defendantId: string;             // Défendeur
  reason: "non_payment" | "noise" | "damage" | "illegal_sublet" | "renoviction";
  filedAt: number;
  hearingDate: number;
  judgmentDate: number | null;
  judgment: "eviction_ordered" | "dismissed" | "payment_plan" | "lease_termination";
  bailiffAssignedId: string | null; // Huissier assigné pour exécution forcée
  resolved: boolean;
}

// ═══════════════════════════════════════════════════════════
// LE SYSTÈME HYPOTHÉCAIRE DESJARDINS
// ═══════════════════════════════════════════════════════════

export interface QuebecMortgage {
  propertyId: string;
  ownerId: string;
  ownerName: string;
  purchasePrice: number;
  downPayment: number;             // Mise de fonds (min 5% au Canada)
  principalLoanAmount: number;     // Prêt initial
  remainingPrincipal: number;      // Principal restant
  interestRate: number;            // Taux fixe Desjardins (ex: 5.2%)
  amortizationMonths: number;      // Durée du prêt en mois de jeu
  monthlyPayment: number;          // Mensualité
  remainingMonths: number;
  missedPaymentsInARow: number;
  status: MortgageStatus;
  nextPaymentDueDay: number;
  autoDebitAccountId: string;      // Compte chèque lié
}

// ═══════════════════════════════════════════════════════════
// HYDRO-QUÉBEC & SERVICES PUBLICS
// ═══════════════════════════════════════════════════════════

export interface HydroState {
  propertyId: string;
  accountNumber: string;
  currentPayerId: string | null;   // Joueur responsable (propriétaire ou locataire)
  electricityUsageKwh: number;
  balanceDue: number;
  isPowerCut: boolean;             // Si vrai: plus de lumière, frigo arrêté, etc.
  lastMeterReading: number;
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE CONDITION & RESTRUCTURATION 3D
// ═══════════════════════════════════════════════════════════

export interface PropertyCondition {
  propertyId: string;
  cleanliness: number;             // 0 à 100
  structuralIntegrity: number;     // 0 à 100 (dégradation, trous)
  hasMold: boolean;                // Moisissure (dû à l'humidité/cannabis)
  isInfested: boolean;             // Rats/coquerelles
  growOpDamages: boolean;          // Dommages causés par l'humidité d'un grow-op
  plumbingDamages: boolean;
  electricityDamages: boolean;
}

export interface LockSystem {
  propertyId: string;
  ownerId: string;
  lockType: "standard" | "reinforced" | "electronic_pin" | "smart_keycard";
  pinCode?: string;
  isLocked: boolean;
  brokenState: number;             // 0 (intact) à 100 (complètement défoncé)
  authorizedKeyHolders: string[];  // playerIds
}

// ═══════════════════════════════════════════════════════════
// REALTYS STATE PRINCIPAL (Synchronisé)
// ═══════════════════════════════════════════════════════════

export interface RealtyState {
  commercials: string[];
  listings: Record<string, ListingState>;
  rentals: Record<string, QuebecLease>;
  condition: Record<string, PropertyCondition>;
  mortgages: Record<string, QuebecMortgage>;
  hydro: Record<string, HydroState>;
  locks: Record<string, LockSystem>;
  talCases: Record<string, TalCase>;
  visits: Array<{ id: string; propertyId: string; name: string; at: number }>;
}

export const EMPTY_REALTY: RealtyState = {
  commercials: [],
  listings: {},
  rentals: {},
  condition: {},
  mortgages: {},
  hydro: {},
  locks: {},
  talCases: {},
  visits: [],
};

// ═══════════════════════════════════════════════════════════
// CATALOGUES DE PROPRIÉTÉS STATIQUES DU COMTE
// ═══════════════════════════════════════════════════════════

function village(id: string) {
  return VILLAGES.find((v) => v.id === id);
}

function at(id: string, dx: number, dz: number): { x: number; z: number; town: string } {
  const v = village(id);
  return { x: (v?.center[0] ?? 0) + dx, z: (v?.center[1] ?? 0) + dz, town: v?.name ?? id };
}

const HOUSE_META: Record<string, Pick<MarketProperty, "zone" | "bedrooms" | "bathrooms" | "squareFeet" | "features" | "rentPerDay" | "garageCapacity">> = {
  "H-PNF": { zone: "village", bedrooms: 3, bathrooms: 1, squareFeet: 1400, features: ["porche", "proche école"], rentPerDay: 28, garageCapacity: 1 },
  "H-PTR": { zone: "luxe", bedrooms: 4, bathrooms: 2, squareFeet: 2200, features: ["jardin", "piscine creusée", "clôturé"], rentPerDay: 42, garageCapacity: 2 },
  "H-DNC": { zone: "industrie", bedrooms: 2, bathrooms: 1, squareFeet: 980, features: ["loft", "brique apparente"], rentPerDay: 24, garageCapacity: 1 },
  "H-SRY": { zone: "laurentides", bedrooms: 3, bathrooms: 1, squareFeet: 1600, features: ["chalet", "bois rond", "foyer au bois", "lac"], rentPerDay: 36, garageCapacity: 1 },
  "H-NVL": { zone: "fleuve", bedrooms: 3, bathrooms: 2, squareFeet: 1800, features: ["patrimoine", "vue fleuve", "cachet"], rentPerDay: 40, garageCapacity: 1 },
  "H-CPS": { zone: "luxe", bedrooms: 4, bathrooms: 2, squareFeet: 2000, features: ["domaine", "arbres matures"], rentPerDay: 38, garageCapacity: 2 },
  "H-DSC": { zone: "fleuve", bedrooms: 3, bathrooms: 1, squareFeet: 1500, features: ["accès fleuve", "grand quai"], rentPerDay: 32, garageCapacity: 1 },
  "H-SMC": { zone: "rang", bedrooms: 2, bathrooms: 1, squareFeet: 1100, features: ["grand terrain", "rang tranquille", "boisé"], rentPerDay: 22, garageCapacity: 1 },
};

export const COMMERCIALS: MarketProperty[] = [
  {
    id: "C-APT",
    kind: "apartment",
    zone: "rang",
    name: "3½ rustique du rang",
    address: "12 rang Saint-Alban",
    ...at("saint_alban", 18, -14),
    price: 95000,
    municipalEvaluation: 72000,
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 780,
    furnished: true,
    features: ["chauffé éclairé", "stationnement inclus", "tranquille"],
    rentPerDay: 18,
    garageCapacity: 1,
    hydroAccountNumber: "HQ-815-4009-1",
  },
  {
    id: "C-GAR",
    kind: "garage",
    zone: "village",
    name: "Garage Auto Gosselin",
    address: "chemin de la Station, Pont-Rouge",
    ...at("pont_rouge", -22, 16),
    price: 185000,
    municipalEvaluation: 145000,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 1200,
    furnished: false,
    features: ["fosse mécanique", "porte de 12 pieds", "compresseur inclus", "triphasé 600V"],
    rentPerDay: 35,
    garageCapacity: 4,
    hydroAccountNumber: "HQ-815-4009-2",
  },
  {
    id: "C-COM",
    kind: "business",
    zone: "village",
    name: "Local Commercial Saint-Denis",
    address: "rue Notre-Dame, Portneuf",
    ...at("portneuf", 16, 10),
    price: 245000,
    municipalEvaluation: 195000,
    bedrooms: 0,
    bathrooms: 2,
    squareFeet: 2500,
    furnished: true,
    features: ["vitrine achalandée", "arrière-boutique", "chambre forte", "climatisation centrale"],
    rentPerDay: 58,
    garageCapacity: 0,
    hydroAccountNumber: "HQ-815-4009-3",
  },
  {
    id: "C-ENT",
    kind: "warehouse",
    zone: "industrie",
    name: "Entrepôt Logistique de la 138",
    address: "parc industriel, Donnacona",
    ...at("donnacona", 40, -28),
    price: 380000,
    municipalEvaluation: 310000,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 5200,
    furnished: false,
    features: ["quai de chargement niveleur", "hauteur libre 22 pieds", "système gicleurs", "clôturé"],
    rentPerDay: 85,
    garageCapacity: 6,
    hydroAccountNumber: "HQ-815-4009-4",
  },
  {
    id: "C-PEN",
    kind: "penthouse",
    zone: "luxe",
    name: "Penthouse Sommet Pont-Rouge",
    address: "hôtel Pont-Rouge, dernier étage",
    ...at("pont_rouge", 8, 4),
    price: 450000,
    municipalEvaluation: 380000,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1800,
    furnished: true,
    features: ["vue panoramique", "concierge 24/7", "spa privé sur terrasse", "ascenseur direct"],
    rentPerDay: 110,
    garageCapacity: 2,
    hydroAccountNumber: "HQ-815-4009-5",
  },
];

// CORRECTION: KIND_LABEL contient déjà "penthouse", maintenant PropertyType l'inclut aussi
export const KIND_LABEL: Record<PropertyType, string> = {
  house: "Maison unifamiliale",
  apartment: "Appartement / Condo",
  business: "Local commercial",
  warehouse: "Entrepôt industriel",
  garage: "Garage commercial",
  penthouse: "Penthouse de luxe",
  cottage: "Chalet de villégiature",
  multiplex: "Plex résidentiel",
};

export const ZONE_LABEL: Record<PropertyZone, string> = {
  village: "Village",
  rang: "Rang de campagne",
  industrie: "Parc Industriel",
  fleuve: "Bord du fleuve",
  laurentides: "Villégiature Laurentides",
  luxe: "Domaine huppé",
};

// ═══════════════════════════════════════════════════════════
// INSTANCIATION DES DONNÉES ET CACHE
// ═══════════════════════════════════════════════════════════

const DEEDS_CACHE: Map<string, MarketProperty> = new Map();

import { DEEDS, deedById, type Deed } from "./rp";

export function houseAsMarket(deed: Deed): MarketProperty {
  const cached = DEEDS_CACHE.get(deed.id);
  if (cached) return cached;

  const meta = HOUSE_META[deed.id] ?? HOUSE_META["H-PNF"]!;
  const prop: MarketProperty = {
    id: deed.id,
    kind: "house",
    zone: meta.zone,
    name: deed.name,
    address: `${deed.town}`,
    town: deed.town,
    x: deed.x,
    z: deed.z,
    price: deed.price,
    municipalEvaluation: Math.round(deed.price * 0.8),
    bedrooms: meta.bedrooms,
    bathrooms: meta.bathrooms,
    squareFeet: meta.squareFeet,
    furnished: false,
    features: meta.features,
    rentPerDay: meta.rentPerDay,
    garageCapacity: meta.garageCapacity,
    hydroAccountNumber: `HQ-815-${deed.id.split("-").pop()}`,
  };
  DEEDS_CACHE.set(deed.id, prop);
  return prop;
}

export function catalog(): MarketProperty[] {
  return [...DEEDS.map(houseAsMarket), ...COMMERCIALS];
}

export function propertyById(id: string): MarketProperty | undefined {
  return catalog().find((p) => p.id === id);
}

export function isHouseDeed(id: string): boolean {
  return Boolean(deedById(id));
}

export function isCommercial(id: string): boolean {
  return COMMERCIALS.some((c) => c.id === id);
}

// ═══════════════════════════════════════════════════════════
// PARSING ET INITIALISATION DE L'ÉTAT IMMOBILIER
// ═══════════════════════════════════════════════════════════

export function parseRealty(raw: unknown): RealtyState {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_REALTY };
  }
  const d = raw as Partial<RealtyState>;
  return {
    commercials: Array.isArray(d.commercials) ? d.commercials.filter((x) => typeof x === "string") : [],
    listings: d.listings && typeof d.listings === "object" ? d.listings : {},
    rentals: d.rentals && typeof d.rentals === "object" ? d.rentals : {},
    condition: d.condition && typeof d.condition === "object" ? d.condition : {},
    mortgages: d.mortgages && typeof d.mortgages === "object" ? d.mortgages : {},
    hydro: d.hydro && typeof d.hydro === "object" ? d.hydro : {},
    locks: d.locks && typeof d.locks === "object" ? d.locks : {},
    talCases: d.talCases && typeof d.talCases === "object" ? d.talCases : {},
    visits: Array.isArray(d.visits) ? d.visits : [],
  };
}

export function ensureLock(realty: RealtyState, propertyId: string, ownerId: string): LockSystem {
  if (realty.locks[propertyId]) return realty.locks[propertyId]!;
  const lock: LockSystem = {
    propertyId,
    ownerId,
    lockType: "standard",
    isLocked: true,
    brokenState: 0,
    authorizedKeyHolders: [ownerId],
  };
  realty.locks[propertyId] = lock;
  return lock;
}

export function ensureHydro(realty: RealtyState, propertyId: string, ownerId: string): HydroState {
  if (realty.hydro[propertyId]) return realty.hydro[propertyId]!;
  const prop = propertyById(propertyId);
  const hydro: HydroState = {
    propertyId,
    accountNumber: prop?.hydroAccountNumber ?? `HQ-815-${Math.floor(1000 + Math.random() * 9000)}`,
    currentPayerId: ownerId,
    electricityUsageKwh: 0,
    balanceDue: 0,
    isPowerCut: false,
    lastMeterReading: Date.now(),
  };
  realty.hydro[propertyId] = hydro;
  return hydro;
}

export function ensureCondition(realty: RealtyState, propertyId: string): PropertyCondition {
  if (realty.condition[propertyId]) return realty.condition[propertyId]!;
  const condition: PropertyCondition = {
    propertyId,
    cleanliness: 100,
    structuralIntegrity: 100,
    hasMold: false,
    isInfested: false,
    growOpDamages: false,
    plumbingDamages: false,
    electricityDamages: false,
  };
  realty.condition[propertyId] = condition;
  return condition;
}

// ═══════════════════════════════════════════════════════════
// MULTIJOUEUR — VISITES ET BROKERS
// ═══════════════════════════════════════════════════════════

export function requestVisit(realty: RealtyState, propertyId: string, visitorName: string): RealtyState {
  const row = { id: `vis_${Date.now().toString(36)}`, propertyId, name: visitorName, at: Date.now() };
  const listing = realty.listings[propertyId];

  triggerNotification(listing?.listedByBrokerId ?? "local_player", {
    title: "🔑 Visite demandée !",
    body: `${visitorName} veut visiter la propriété ${propertyId}`,
    icon: "🏠",
  });

  return {
    ...realty,
    visits: [row, ...realty.visits].slice(0, 12),
    listings: listing
      ? { ...realty.listings, [propertyId]: { ...listing, views: listing.views + 1 } }
      : realty.listings,
  };
}

// ═══════════════════════════════════════════════════════════
// NOTAIRE — TRANSACTION DE VENTE PAR JOUEUR
// ═══════════════════════════════════════════════════════════

export interface DeedTransactionResult {
  success: boolean;
  message: string;
  realty: RealtyState;
}

export function finalizeSaleWithNotary(
  realty: RealtyState,
  propertyId: string,
  buyerId: string,
  buyerName: string,
  sellerId: string,
  agreedPrice: number,
  notaryPlayerId: string,
): DeedTransactionResult {
  const prop = propertyById(propertyId);
  if (!prop) return { success: false, message: "Bien introuvable", realty };

  const buyerAcct = getAccount(buyerId);
  const sellerAcct = getAccount(sellerId);
  if (!buyerAcct) return { success: false, message: "Compte chèque de l'acheteur introuvable", realty };

  const commission = Math.round(agreedPrice * 0.04); // 4% Courtier
  const notaryFee = 1500; // Frais fixes du notaire QC
  const totalCostForBuyer = agreedPrice + notaryFee;

  if (buyerAcct.balance < totalCostForBuyer) {
    return { success: false, message: "Acheteur en manque de fonds", realty };
  }

  // Transferts monétaires via banking
  removeCash(totalCostForBuyer, buyerId);
  addCash(agreedPrice - commission, sellerId);
  addCash(notaryFee, notaryPlayerId); // Paiement du notaire joueur

  // Payer le courtier si listé
  const listing = realty.listings[propertyId];
  if (listing && listing.listedByBrokerId) {
    addCash(commission, listing.listedByBrokerId);
    sendPrivateMessage(listing.listedByBrokerId, `💸 Commission de vente reçue : ${commission}$ pour la vente de ${propertyId}`);
  }

  // Mise à jour de la propriété
  delete realty.listings[propertyId];
  if (realty.mortgages[propertyId]) delete realty.mortgages[propertyId];

  // Recréer le verrou avec l'acheteur comme propriétaire
  realty.locks[propertyId] = {
    propertyId,
    ownerId: buyerId,
    lockType: "standard",
    isLocked: true,
    brokenState: 0,
    authorizedKeyHolders: [buyerId],
  };

  // Transférer le compte Hydro
  const hydro = ensureHydro(realty, propertyId, buyerId);
  hydro.currentPayerId = buyerId;

  // Envoi des logs Desjardins
  pushTx(buyerAcct, "transfer", totalCostForBuyer, `Achat immobilier notarié : ${propertyId}`, buyerAcct.balance, sellerId);
  if (sellerAcct) pushTx(sellerAcct, "deposit", agreedPrice - commission, `Vente immobilière : ${propertyId}`, sellerAcct.balance, buyerId);

  sendChatMessage(`🏡 [NOTAIRE] La vente du bien ${prop.address} à ${buyerName} pour ${agreedPrice}$ a été enregistrée officiellement.`);
  netEmit("realty:sale_completed", { propertyId, buyerId, agreedPrice });

  return { success: true, message: "Vente finalisée !", realty };
}

// ═══════════════════════════════════════════════════════════
// LE PRESTATAIRE HYPOTHÉCAIRE DESJARDINS
// ═══════════════════════════════════════════════════════════

export interface MortgageApplyResult {
  success: boolean;
  message: string;
  mortgage?: QuebecMortgage;
  realty: RealtyState;
}

export function applyForDesjardinsMortgage(
  realty: RealtyState,
  propertyId: string,
  buyerId: string,
  buyerName: string,
  downPayment: number,
  amortizationMonths: number = 30, // en jours/mois de jeu
  debitAccountId: string,
): MortgageApplyResult {
  const prop = propertyById(propertyId);
  if (!prop) return { success: false, message: "Propriété introuvable.", realty };

  // Calcul du prêt requis
  const principalLoan = prop.price - downPayment;

  // Réglementation canadienne: 5% minimum de mise de fonds
  const minDownPayment = prop.price * 0.05;
  if (downPayment < minDownPayment) {
    return { success: false, message: `Mise de fonds insuffisante. Minimum requis: ${minDownPayment}$ (5%)`, realty };
  }

  // Vérifier la cote de crédit de l'acheteur
  const credit = getCreditProfile(buyerId);
  if (!credit || credit.creditScore < 600) {
    return { success: false, message: `Refusé. Cote de crédit insuffisante. Requiert 600+`, realty };
  }

  // Calcul de la mensualité hypothécaire Desjardins
  const annualRate = 5.25; // 5.25% Taux fixe
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = Math.round(
    (principalLoan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -amortizationMonths)),
  );

  // Vérifier le ratio d'endettement de l'acheteur
  const totalDebtRatio = (credit.totalDebt + monthlyPayment) / credit.monthlyIncome;
  if (totalDebtRatio > 0.44) { // Max 44% amortissement de la dette brute
    return { success: false, message: `Capacité d'emprunt dépassée. Diminuez le prêt ou augmentez la mise de fonds.`, realty };
  }

  // Prélèvement de la mise de fonds
  const buyerAcct = getAccount(buyerId);
  if (!buyerAcct || buyerAcct.balance < downPayment) {
    return { success: false, message: "Mise de fonds indisponible dans votre compte.", realty };
  }

  removeCash(downPayment, buyerId);

  const mortgage: QuebecMortgage = {
    propertyId,
    ownerId: buyerId,
    ownerName: buyerName,
    purchasePrice: prop.price,
    downPayment,
    principalLoanAmount: principalLoan,
    remainingPrincipal: principalLoan,
    interestRate: annualRate,
    amortizationMonths,
    monthlyPayment,
    remainingMonths: amortizationMonths,
    missedPaymentsInARow: 0,
    status: "active",
    nextPaymentDueDay: 1, // Déclenché au prochain tick
    autoDebitAccountId: debitAccountId,
  };

  realty.mortgages[propertyId] = mortgage;

  // Mettre à jour la dette du joueur
  credit.totalDebt += principalLoan;
  credit.activeAccounts++;

  triggerNotification(buyerId, {
    title: "💚 Hypothèque Desjardins approuvée !",
    body: `Mensualité: ${monthlyPayment}$/jour de jeu\nAmortissement: ${amortizationMonths} mois`,
    icon: "🏦",
  });

  netEmit("realty:mortgage_created", { propertyId, mortgage });

  return { success: true, message: "Prêt hypothécaire signé !", mortgage, realty };
}

// ═══════════════════════════════════════════════════════════
// TRIBUNAL ADMINISTRATIF DU LOGEMENT (TAL) — BAILS & CONFLITS
// ═══════════════════════════════════════════════════════════

export interface SignLeaseResult {
  success: boolean;
  message: string;
  lease?: QuebecLease;
  realty: RealtyState;
}

export function signQuebecLease(
  realty: RealtyState,
  propertyId: string,
  landlordId: string,
  landlordName: string,
  tenantId: string,
  tenantName: string,
  rentAmount: number,
  durationDays: number = 12, // Standard
): SignLeaseResult {
  if (realty.rentals[propertyId]) {
    return { success: false, message: "Ce bien fait déjà l'objet d'un bail actif.", realty };
  }

  const cond = ensureCondition(realty, propertyId);
  if (cond.structuralIntegrity < 35 || cond.isInfested) {
    return { success: false, message: "Le logement est déclaré insalubre par la ville. Impossible de louer.", realty };
  }

  const lease: QuebecLease = {
    leaseId: uid("lease"),  // CORRECTION: uid() maintenant défini
    propertyId,
    landlordId,
    landlordName,
    tenantId,
    tenantName,
    rentAmount: Math.round(rentAmount),
    status: "active",
    startDate: Date.now(),
    durationDays,
    unpaidRentsCount: 0,
    talDisputeId: null,
    autoRenew: true,
  };

  realty.rentals[propertyId] = lease;

  // Accorder l'accès des clés numériques au locataire
  const lock = ensureLock(realty, propertyId, landlordId);
  if (!lock.authorizedKeyHolders.includes(tenantId)) {
    lock.authorizedKeyHolders.push(tenantId);
  }

  // Assigner Hydro au locataire
  const hydro = ensureHydro(realty, propertyId, landlordId);
  hydro.currentPayerId = tenantId;

  triggerNotification(tenantId, {
    title: "✍️ Bail résidentiel signé !",
    body: `Loyer: ${rentAmount}$/jour de jeu\nPropriétaire: ${landlordName}`,
    icon: "📝",
  });

  netEmit("realty:lease_signed", { propertyId, lease });
  return { success: true, message: "Bail en vigueur et clé numérique délivrée !", lease, realty };
}

// Dépôt d'une plainte au TAL par le propriétaire
export function fileTalDispute(
  realty: RealtyState,
  propertyId: string,
  plaintiffId: string,
  reason: TalCase["reason"],
): { success: boolean; message: string; caseId?: string; realty: RealtyState } {
  const lease = realty.rentals[propertyId];
  if (!lease) return { success: false, message: "Aucun bail actif sur ce logement.", realty };
  if (lease.landlordId !== plaintiffId) return { success: false, message: "Seul le locateur peut déposer cette plainte.", realty };

  const disputeId = uid("tal");  // CORRECTION: uid() maintenant défini
  const talCase: TalCase = {
    disputeId,
    leaseId: lease.leaseId,
    plaintiffId,
    defendantId: lease.tenantId,
    reason,
    filedAt: Date.now(),
    hearingDate: Date.now() + 2 * 60_000, // Audience dans 2 minutes RP
    judgmentDate: null,
    judgment: "lease_termination",
    bailiffAssignedId: null,
    resolved: false,
  };

  realty.talCases[disputeId] = talCase;
  lease.status = "dispute";
  lease.talDisputeId = disputeId;

  triggerNotification(lease.tenantId, {
    title: "⚖️ Mise en cause au TAL !",
    body: `Le locateur a déposé une plainte pour: ${reason}. Audience planifiée.`,
    icon: "🏛️",
    urgent: true,
  });

  netEmit("realty:tal_case_filed", { talCase });
  return { success: true, message: `Dossier #${disputeId} ouvert au TAL.`, caseId: disputeId, realty };
}

// Résolution de l'audience par le système ou un juge joueur
export function resolveTalHearing(
  realty: RealtyState,
  disputeId: string,
  judgment: TalCase["judgment"],
): { ok: boolean; message: string; realty: RealtyState } {
  const tal = realty.talCases[disputeId];
  if (!tal || tal.resolved) return { ok: false, message: "Dossier clos ou introuvable.", realty };

  tal.judgment = judgment;
  tal.judgmentDate = Date.now();
  tal.resolved = true;

  const lease = Array.from(Object.values(realty.rentals)).find(l => l.leaseId === tal.leaseId);
  if (lease) {
    if (judgment === "eviction_ordered" || judgment === "lease_termination") {
      lease.status = "evicted";
      // Retirer l'accès locataire
      const lock = realty.locks[lease.propertyId];
      if (lock) {
        lock.authorizedKeyHolders = lock.authorizedKeyHolders.filter(id => id !== lease.tenantId);
      }
    } else {
      lease.status = "active";
      lease.talDisputeId = null;
    }
  }

  // Notifier
  triggerNotification(tal.defendantId, {
    title: "🏛️ Jugement rendu par le TAL",
    body: `Verdict: ${judgment.toUpperCase()}`,
    icon: "⚖️",
    urgent: true,
  });

  netEmit("realty:tal_judgment", { disputeId, judgment });
  return { ok: true, message: `Jugement enregistré : ${judgment}`, realty };
}

// Éviction forcée par un Huissier ou la SQ
export function executeEvictionBailiff(
  realty: RealtyState,
  propertyId: string,
  officerPlayerId: string,
): { ok: boolean; message: string; realty: RealtyState } {
  const lease = realty.rentals[propertyId];
  if (!lease || lease.status !== "evicted") {
    return { ok: false, message: "Aucune ordonnance d'expulsion active du TAL pour ce logement.", realty };
  }

  // Effectuer l'expulsion
  delete realty.rentals[propertyId];

  // Forcer les verrous et expulser physiquement
  const lock = ensureLock(realty, propertyId, lease.landlordId);
  lock.authorizedKeyHolders = [lease.landlordId];
  lock.isLocked = true;

  // Restaurer Hydro-Québec au propriétaire
  const hydro = ensureHydro(realty, propertyId, lease.landlordId);
  hydro.currentPayerId = lease.landlordId;

  // Alerte police pour squat
  addWantedPoints(lease.tenantId, 40, "Refus de se conformer à un ordre d'éviction du TAL");

  triggerNotification(lease.tenantId, {
    title: "🚨 ÉVICTION COMPLÉTÉE",
    body: `L'huissier et la police ont libéré les lieux. Vos meubles ont été sortis.`,
    icon: "📦",
    urgent: true,
  });

  sendChatMessage(`📢 [HUISSIER] L'avis d'éviction sur le bien ${propertyId} a été exécuté de force par l'huissier.`);
  netEmit("realty:eviction_executed", { propertyId });

  return { ok: true, message: "Éviction complétée avec succès.", realty };
}

// ═══════════════════════════════════════════════════════════
// HYDRO-QUÉBEC — TICK DE CONSOMMATION & COUPURE
// ═══════════════════════════════════════════════════════════

export function payHydroBill(
  realty: RealtyState,
  propertyId: string,
  payerId: string,
): { ok: boolean; message: string; realty: RealtyState } {
  const hydro = realty.hydro[propertyId];
  if (!hydro) return { ok: false, message: "Aucun compteur Hydro-Québec actif.", realty };
  if (hydro.balanceDue <= 0) return { ok: false, message: "Aucun solde à payer.", realty };

  const payerAcct = getAccount(payerId);
  if (!payerAcct || payerAcct.balance < hydro.balanceDue) {
    return { ok: false, message: "Fonds insuffisants pour payer Hydro-Québec.", realty };
  }

  const paidAmount = hydro.balanceDue;
  removeCash(paidAmount, payerId);
  hydro.balanceDue = 0;

  if (hydro.isPowerCut) {
    hydro.isPowerCut = false;
    triggerNotification(payerId, {
      title: "⚡ Hydro-Québec : Courant rétabli !",
      body: "Le service d'électricité est de retour dans votre logement.",
      icon: "🔌",
    });
  }

  pushTx(payerAcct, "transfer", paidAmount, `Facture Hydro-Québec - Compte ${hydro.accountNumber}`, payerAcct.balance, "HYDRO-QC");
  netEmit("realty:hydro_paid", { propertyId, paidAmount });

  return { ok: true, message: `Paiement de ${paidAmount}$ accepté. Merci d'épargner notre énergie !`, realty };
}

// ═══════════════════════════════════════════════════════════
// EFFETS DE SQUATTING ET CROCHETAGE DE SERRURES
// ═══════════════════════════════════════════════════════════

export function breakOrPickLock(
  realty: RealtyState,
  propertyId: string,
  pickerId: string,
  isBruteForce: boolean,
): { success: boolean; message: string; alarmTriggered: boolean; realty: RealtyState } {
  const lock = realty.locks[propertyId];
  if (!lock) return { success: false, message: "Verrou absent.", alarmTriggered: false, realty };

  let success = false;
  let alarmTriggered = false;

  const roll = Math.random();
  if (isBruteForce) {
    // Force brute: défoncer la porte (rapide, fait du bruit)
    lock.brokenState = Math.min(100, lock.brokenState + 45);
    success = lock.brokenState >= 80 || roll < 0.6;
    alarmTriggered = true;
  } else {
    // Crochetage discret (silencieux)
    success = roll < 0.35;
    alarmTriggered = roll > 0.85; // 15% de chance de faire de l'alarme
  }

  if (success) {
    lock.isLocked = false;
    // Infraction détectée
    addWantedPoints(pickerId, 30, "Intrusion résidentielle");
  }

  if (alarmTriggered) {
    const prop = propertyById(propertyId);
    if (prop) {
      dispatchPolice({
        location: { x: prop.x, z: prop.z },
        priority: "high",
        type: "bank_alarm", // Alarme intrusion standard
        description: `Signal d'effraction en cours au ${prop.address}`,
      });
    }
  }

  netEmit("realty:lock_tampered", { propertyId, pickerId, success, isBruteForce });
  return {
    success,
    message: success ? "Serrure forcée ! Porte ouverte." : "Échec du crochetage.",
    alarmTriggered,
    realty,
  };
}

// ═══════════════════════════════════════════════════════════
// MAINTENANCE, RÉNOVATION ET SINISTRES
// ═══════════════════════════════════════════════════════════

export function maintainProperty(realty: RealtyState, propertyId: string, costMultiplier: number = 1.0): RealtyState {
  const cond = ensureCondition(realty, propertyId);
  const cost = Math.round(500 * costMultiplier);

  // Remettre à neuf
  cond.structuralIntegrity = 100;
  cond.cleanliness = 100;
  cond.hasMold = false;
  cond.isInfested = false;
  cond.growOpDamages = false;
  cond.plumbingDamages = false;
  cond.electricityDamages = false;

  netEmit("realty:property_repaired", { propertyId, cost });
  return realty;
}

// ═══════════════════════════════════════════════════════════
// LE TICK IMMOBILIER QUOTIDIEN (MAÎTRE DU JEU)
// ═══════════════════════════════════════════════════════════

export function tickRealty(
  realty: RealtyState,
  owned: string[],
): {
  realty: RealtyState;
  rentIncome: number;
  mortgageDue: number;
  hydroDue: number;
  notice: string | null;
} {
  const ids = ownedIds(owned, realty);
  let rentIncome = 0;
  let mortgageDue = 0;
  let hydroDue = 0;
  const notices: string[] = [];

  const condition = { ...realty.condition };
  const rentals = { ...realty.rentals };
  const mortgages = { ...realty.mortgages };
  const hydroStates = { ...realty.hydro };

  for (const id of ids) {
    // 1. Dégradation naturelle des bâtiments
    const cond = ensureCondition(realty, id);
    cond.structuralIntegrity = Math.max(0, cond.structuralIntegrity - 1);
    cond.cleanliness = Math.max(0, cond.cleanliness - 2);

    // Dégât d'eau aléatoire si vétuste
    if (cond.structuralIntegrity < 50 && Math.random() < 0.05) {
      cond.plumbingDamages = true;
      notices.push(`Dégât d'eau déclaré au ${id}`);
    }

    condition[id] = cond;

    // 2. Gestion des baux du TAL & Prélèvement des loyers
    const lease = rentals[id];
    if (lease) {
      if (cond.structuralIntegrity < 25) {
        // Insalubrité évidente -> Locataire quitte sans préavis et saisit le TAL
        delete rentals[id];
        notices.push(`Bail rompu - Logement insalubre au ${id}`);
      } else {
        const tenantAcct = getAccount(lease.tenantId);
        if (tenantAcct && tenantAcct.balance >= lease.rentAmount) {
          // Loyer payé
          removeCash(lease.rentAmount, lease.tenantId);
          rentIncome += lease.rentAmount;
          lease.unpaidRentsCount = 0;
        } else {
          // Non-paiement !
          lease.unpaidRentsCount++;
          triggerNotification(lease.landlordId, {
            title: "⚠️ Loyer impayé !",
            body: `${lease.tenantName} n'a pas payé son loyer de ${lease.rentAmount}$`,
            icon: "🚨",
            urgent: true,
          });

          // Si 3 loyers impayés -> Le TAL permet le dépôt immédiat d'une expulsion
          if (lease.unpaidRentsCount >= 3) {
            triggerNotification(lease.landlordId, {
              title: "⚖️ TAL : Ordonnance possible",
              body: `3 loyers impayés pour ${id}. Vous pouvez demander l'éviction légale.`,
              icon: "🏛️",
            });
          }
        }
      }
    }

    // 3. Traitement des Prêts Hypothécaires Desjardins
    const mtg = mortgages[id];
    if (mtg && mtg.status === "active" && mtg.remainingMonths > 0) {
      const mtgAcct = getAccount(mtg.ownerId);
      if (mtgAcct && mtgAcct.balance >= mtg.monthlyPayment) {
        removeCash(mtg.monthlyPayment, mtg.ownerId);
        mortgageDue += mtg.monthlyPayment;
        mtg.remainingMonths--;
        mtg.remainingPrincipal = round2(mtg.remainingPrincipal - (mtg.monthlyPayment * 0.6)); // CORRECTION: round2() maintenant défini
        mtg.missedPaymentsInARow = 0;

        if (mtg.remainingMonths <= 0) {
          mtg.status = "paid_off";
          delete mortgages[id];
          notices.push(`Félicitations! Hypothèque soldée pour ${id}`);
        }
      } else {
        // Défaut de paiement hypothèque
        mtg.missedPaymentsInARow++;
        triggerNotification(mtg.ownerId, {
          title: "⚠️ Desjardins : Défaut de paiement !",
          body: `Échec du prélèvement hypothécaire de ${mtg.monthlyPayment}$. Retard: ${mtg.missedPaymentsInARow} mois.`,
          icon: "🚨",
          urgent: true,
        });

        if (mtg.missedPaymentsInARow >= 3) {
          // SAISIE HYPOTHÉCAIRE (reprise du bien par Desjardins)
          mtg.status = "foreclosed";
          delete mortgages[id];
          delete rentals[id]; // Locataire évincé aussi
          realty.commercials = realty.commercials.filter(cid => cid !== id);
          notices.push(`Saisie hypothécaire Desjardins effectuée sur ${id}`);
        }
      }
    }

    // 4. Factures Hydro-Québec
    const hState = ensureHydro(realty, id, lease?.tenantId ?? realty.locks[id]?.ownerId ?? "system");
    hState.electricityUsageKwh += Math.floor(10 + Math.random() * 20); // conso journalière
    const billRate = 0.0974; // ~10 cents le kWh au Québec
    hState.balanceDue = round2(hState.balanceDue + hState.electricityUsageKwh * billRate); // CORRECTION: round2() maintenant défini
    hState.electricityUsageKwh = 0; // Reset pour le prochain cycle

    if (hState.balanceDue >= 150) {
      // Hydro-Québec coupe le courant pour solde impayé élevé !
      hState.isPowerCut = true;
      triggerNotification(hState.currentPayerId ?? "system", {
        title: "⚡ Coup de courant Hydro-Québec",
        body: `Électricité coupée pour solde impayé de ${hState.balanceDue}$`,
        icon: "🔌",
        urgent: true,
      });
    }

    hydroDue += hState.balanceDue;
    hydroStates[id] = hState;
  }

  return {
    realty: { ...realty, condition, rentals, mortgages, hydro: hydroStates },
    rentIncome,
    mortgageDue,
    hydroDue,
    notice: notices[0] ?? (rentIncome > 0 ? `Entrées de baux : +${rentIncome}$` : null),
  };
}

// ═══════════════════════════════════════════════════════════
// OUTILS DE RECHERCHE ET UTILS CENTRIS/MLS
// ═══════════════════════════════════════════════════════════

export function ownedIds(ownedProps: string[], realty: RealtyState): string[] {
  return [...ownedProps, ...realty.commercials];
}

export function conditionOf(realty: RealtyState, id: string): number {
  return realty.condition[id]?.structuralIntegrity ?? 100;
}

export function evaluatedValue(p: MarketProperty, realty: RealtyState): number {
  let v = p.price;
  const cond = conditionOf(realty, p.id);
  v = Math.round(v * (0.55 + cond / 200));
  const list = realty.listings[p.id];
  if (list?.listed) v = list.price;
  return v;
}

export function mlsList(owned: string[], realty: RealtyState): MarketProperty[] {
  const mine = new Set(ownedIds(owned, realty));
  return catalog().filter((p) => {
    if (mine.has(p.id)) return realty.listings[p.id]?.listed;
    return true;
  });
}

export function searchProperties(zone?: PropertyZone, type?: PropertyType, maxPrice?: number): MarketProperty[] {
  return catalog().filter(
    (p) => (!zone || p.zone === zone) && (!type || p.kind === type) && (!maxPrice || p.price <= maxPrice),
  );
}

export function nearestCommercial(x: number, z: number, max = 8): MarketProperty | null {
  let best: MarketProperty | null = null;
  let bestD = max;
  for (const c of COMMERCIALS) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function marketMarks(owned: string[], realty: RealtyState): Array<{ id: string; x: number; z: number; kind: PropertyType }> {
  return catalog()
    .filter((p) => !ownedIds(owned, realty).includes(p.id) || realty.listings[p.id]?.listed)
    .map((p) => ({ id: p.id, x: p.x, z: p.z, kind: p.kind }));
}

// ═══════════════════════════════════════════════════════════
// CLÉS ET ACCÈS PHYSIQUES
// ═══════════════════════════════════════════════════════════

export function grantAccess(realty: RealtyState, id: string, targetPlayerId: string): RealtyState {
  const lock = ensureLock(realty, id, "system");
  if (!lock.authorizedKeyHolders.includes(targetPlayerId)) {
    lock.authorizedKeyHolders.push(targetPlayerId);
  }
  return realty;
}

export function revokeAccess(realty: RealtyState, id: string, targetPlayerId: string): RealtyState {
  const lock = ensureLock(realty, id, "system");
  lock.authorizedKeyHolders = lock.authorizedKeyHolders.filter((n) => n !== targetPlayerId);
  return realty;
}

// ═══════════════════════════════════════════════════════════
// BAILS AUTOMATIQUES, MLS & HYPOTHÈQUES (Interface Store)
// ═══════════════════════════════════════════════════════════

// ---- Locataires NPC québécois (quand le propriétaire loue sans joueur locataire)
const NPC_TENANT_NAMES = [
  "Maxime Labonté", "Émilie Gagnon", "William Tremblay", "Olivia Côté",
  "Félix Bergeron", "Sophie Roy", "Gabriel Dubois", "Chloé Fortin",
  "Samuel Bélanger", "Léa Morin", "Antoine Girard", "Juliette Lavoie",
  "Thomas Cloutier", "Camille Caron", "Olivier Gauthier", "Rosalie Ouellet",
] as const;

function npcTenantName(): string {
  return NPC_TENANT_NAMES[Math.floor(Math.random() * NPC_TENANT_NAMES.length)]!;
}

function playerDisplayName(playerId: string): string {
  try {
    const data = getPlayerData() as
      | { name?: unknown; firstName?: unknown; lastName?: unknown }
      | undefined;
    if (data && typeof data === "object") {
      if (typeof data.name === "string" && data.name.trim()) return data.name.trim();
      if (typeof data.firstName === "string" && data.firstName.trim()) {
        const last =
          typeof data.lastName === "string" && data.lastName.trim() ? ` ${data.lastName.trim()}` : "";
        return `${data.firstName.trim()}${last}`;
      }
    }
  } catch {
    // getPlayerData indisponible -> fallback générique
  }
  return "Propriétaire";
}

export interface StartRentalResult {
  ok: boolean;
  reason?: string;
  realty?: RealtyState;
}

export function startRental(realty: RealtyState, propertyId: string): StartRentalResult {
  const prop = propertyById(propertyId);
  if (!prop) return { ok: false, reason: "Bien introuvable.", realty };
  if (realty.rentals[propertyId]) {
    return { ok: false, reason: "Ce bien fait déjà l'objet d'un bail actif.", realty };
  }

  const cond = ensureCondition(realty, propertyId);
  if (cond.structuralIntegrity < 35 || cond.isInfested) {
    return { ok: false, reason: "Logement déclaré insalubre. Location impossible.", realty };
  }

  const landlordId = realty.locks[propertyId]?.ownerId ?? "system";
  const landlordName = playerDisplayName(landlordId);
  const tenantId = `npc_${uid("loc")}`;
  const tenantName = npcTenantName();
  const rentAmount = Math.max(1, Math.round(prop.rentPerDay * (0.85 + Math.random() * 0.3)));

  const lease: QuebecLease = {
    leaseId: uid("lease"),
    propertyId,
    landlordId,
    landlordName,
    tenantId,
    tenantName,
    rentAmount,
    status: "active",
    startDate: Date.now(),
    durationDays: 12,
    unpaidRentsCount: 0,
    talDisputeId: null,
    autoRenew: true,
  };

  const next: RealtyState = {
    ...realty,
    rentals: { ...realty.rentals, [propertyId]: lease },
    locks: { ...realty.locks },
    hydro: { ...realty.hydro },
  };

  // Clé numérique au locataire
  const lock = ensureLock(next, propertyId, landlordId);
  if (!lock.authorizedKeyHolders.includes(tenantId)) {
    lock.authorizedKeyHolders.push(tenantId);
  }

  // Hydro-Québec passe au locataire
  const hydro = ensureHydro(next, propertyId, landlordId);
  hydro.currentPayerId = tenantId;

  triggerNotification(landlordId, {
    title: "🧑‍🤝‍🧑 Nouveau locataire !",
    body: `${tenantName} loue ${propertyId} à ${rentAmount}$/jour (bail TAL actif).`,
    icon: "📝",
  });
  netEmit("realty:lease_signed", { propertyId, lease });

  return { ok: true, realty: next };
}

export function evictRental(realty: RealtyState, propertyId: string): RealtyState {
  const lease = realty.rentals[propertyId];
  if (!lease) return realty;

  const next: RealtyState = {
    ...realty,
    rentals: { ...realty.rentals },
    locks: { ...realty.locks },
    hydro: { ...realty.hydro },
  };
  delete next.rentals[propertyId];

  // Retirer la clé numérique du locataire
  const lock = next.locks[propertyId];
  if (lock) {
    next.locks[propertyId] = {
      ...lock,
      authorizedKeyHolders: lock.authorizedKeyHolders.filter((id) => id !== lease.tenantId),
    };
  }

  // Hydro-Québec revient au propriétaire
  const hydro = next.hydro[propertyId];
  if (hydro) {
    next.hydro[propertyId] = { ...hydro, currentPayerId: lease.landlordId };
  }

  triggerNotification(lease.landlordId, {
    title: "📦 Bail terminé",
    body: `${lease.tenantName} a quitté le logement ${propertyId}.`,
    icon: "🏠",
  });
  netEmit("realty:lease_ended", { propertyId, reason: "evicted" });

  return next;
}

export function listForSale(
  realty: RealtyState,
  propertyId: string,
  price: number,
  description?: string,
): RealtyState {
  const prop = propertyById(propertyId);
  if (!prop) return realty;

  const listing: ListingState = {
    price: Math.max(1, Math.round(price)),
    description: description ?? `À vendre · ${prop.address}`,
    listed: true,
    listedByBrokerId: null,
    commissionRate: 4,
    views: 0,
    offers: [],
  };
  return { ...realty, listings: { ...realty.listings, [propertyId]: listing } };
}

export function unlist(realty: RealtyState, propertyId: string): RealtyState {
  if (!realty.listings[propertyId]) return realty;
  const listings = { ...realty.listings };
  delete listings[propertyId];
  return { ...realty, listings };
}

export function addMortgage(realty: RealtyState, propertyId: string, loanAmount: number): RealtyState {
  const prop = propertyById(propertyId);
  if (!prop || loanAmount <= 0) return realty;

  const ownerId = realty.locks[propertyId]?.ownerId ?? "system";
  const annualRate = 5.25; // Taux fixe Desjardins (cohérent avec applyForDesjardinsMortgage)
  const monthlyRate = annualRate / 100 / 12;
  const amortizationMonths = 30;
  const monthlyPayment = Math.max(
    1,
    Math.round((loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -amortizationMonths))),
  );

  const mortgage: QuebecMortgage = {
    propertyId,
    ownerId,
    ownerName: playerDisplayName(ownerId),
    purchasePrice: prop.price,
    downPayment: Math.max(0, Math.round(prop.price - loanAmount)),
    principalLoanAmount: Math.round(loanAmount),
    remainingPrincipal: Math.round(loanAmount),
    interestRate: annualRate,
    amortizationMonths,
    monthlyPayment,
    remainingMonths: amortizationMonths,
    missedPaymentsInARow: 0,
    status: "active",
    nextPaymentDueDay: 1,
    autoDebitAccountId: "desjardins",
  };

  return { ...realty, mortgages: { ...realty.mortgages, [propertyId]: mortgage } };
}

// ═══════════════════════════════════════════════════════════
// REGISTER REMOTES (RPC Réseau Multijoueur)
// ═══════════════════════════════════════════════════════════

registerRemote("realty:request_visit", requestVisit);
registerRemote("realty:notary_sale", finalizeSaleWithNotary);
registerRemote("realty:apply_mortgage", applyForDesjardinsMortgage);
registerRemote("realty:sign_lease", signQuebecLease);
registerRemote("realty:file_tal", fileTalDispute);
registerRemote("realty:resolve_hearing", resolveTalHearing);
registerRemote("realty:execute_eviction", executeEvictionBailiff);
registerRemote("realty:pay_hydro", payHydroBill);
registerRemote("realty:pick_lock", breakOrPickLock);
registerRemote("realty:repair", maintainProperty);
registerRemote("realty:grant_keys", grantAccess);
registerRemote("realty:revoke_keys", revokeAccess);