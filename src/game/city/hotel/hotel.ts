/**
 * ═══════════════════════════════════════════════════════════════════
 *  SYSTÈME DE GESTION D'HÔTEL — ULTIMATE EDITION v2.0
 * ═══════════════════════════════════════════════════════════════════
 * Architecture : Zero-GC, Système de sécurité avancé, Gestion des chambres,
 *              Réservations, Services hôteliers, Événements aléatoires.
 * 
 * @author xblade benz (TroxTWorld)
 */

// ==========================================
// 📌 TYPES & INTERFACES
// ==========================================

/** Résultat d'une tentative de déverrouillage */
export interface LockResult {
  granted: boolean;
  message: string;
  reason: "granted" | "bad_pin" | "bad_card" | "lockout" | "no_vacancy" | "not_checked_in" | "expired";
  lockoutMs: number;
  roomId?: string; // ID de la chambre concernée
}

/** État d'une chambre */
export interface RoomState {
  id: string;
  number: string; // Numéro de chambre (ex: "201")
  type: RoomType;
  pricePerNight: number;
  isOccupied: boolean;
  isLocked: boolean;
  isDirty: boolean; // Nécessite le ménage
  hasMinibar: boolean;
  hasTv: boolean;
  hasAirConditioning: boolean;
  hasWifi: boolean;
  occupantId?: string; // ID du client actuel
  checkInDate?: number; // Timestamp
  checkOutDate?: number; // Timestamp
  accessCard?: string; // Carte d'accès actuelle
  pinCode?: string; // Code PIN actuel
}

/** Type de chambre */
export type RoomType = 
  | "standard"
  | "deluxe"
  | "suite"
  | "penthouse"
  | "family"
  | "accessible";

/** Niveau de service */
export type ServiceLevel = "basic" | "premium" | "vip";

/** État de la réservation */
export type ReservationStatus = 
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

/** Réservation */
export interface Reservation {
  id: string;
  roomId: string;
  customerId: string;
  customerName: string;
  checkInDate: number; // Timestamp
  checkOutDate: number; // Timestamp
  status: ReservationStatus;
  totalPrice: number;
  paymentMethod: "cash" | "card" | "online";
  specialRequests?: string[]; // Ex: ["lit bébé", "vue sur mer"]
  serviceLevel: ServiceLevel;
}

/** Service hôtelier */
export interface HotelService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration?: number; // Durée en minutes (pour les services comme le massage)
  available: boolean;
}

/** État global de l'hôtel */
export interface HotelSnapshot {
  rooms: RoomState[];
  reservations: Reservation[];
  unlockedDoors: string[];
  tvOn: boolean;
  lightsOn: boolean;
  emergencyExitActive: boolean;
  fireAlarm: boolean;
  currentTime: number; // Timestamp
}

/** Événement aléatoire dans l'hôtel */
export interface HotelEvent {
  id: string;
  type: "fire" | "theft" | "noise_complaint" | "vip_arrival" | "power_outage" | "water_leak";
  roomId?: string;
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: number;
  resolved: boolean;
}

/** Client de l'hôtel */
export interface HotelCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  preferredRoomType?: RoomType;
  blacklisted: boolean;
  checkInHistory: string[]; // IDs des réservations passées
}

/** Employé de l'hôtel */
export interface HotelEmployee {
  id: string;
  name: string;
  role: "receptionist" | "housekeeping" | "security" | "manager" | "bellhop";
  shiftStart: number; // Heure de début de quart (0-23)
  shiftEnd: number; // Heure de fin de quart (0-23)
  isOnDuty: boolean;
  currentRoom?: string; // Chambre où l'employé se trouve
}

/** Mini-bar */
export interface MinibarItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restockThreshold: number; // Seuil pour déclencher un réapprovisionnement
}

/** Journal des accès */
export interface AccessLogEntry {
  timestamp: number;
  roomId: string;
  customerId?: string;
  employeeId?: string;
  action: "unlock" | "lock" | "check_in" | "check_out" | "service" | "emergency";
  method: "pin" | "card" | "master_key" | "override";
  success: boolean;
  message?: string;
}

// ==========================================
// 🏨 CLASSE ROOM (Gestion individuelle des chambres)
// ==========================================

export class Room {
  public id: string;
  public number: string;
  public type: RoomType;
  public pricePerNight: number;
  public isOccupied: boolean = false;
  public isLocked: boolean = true;
  public isDirty: boolean = false;
  public hasMinibar: boolean = true;
  public hasTv: boolean = true;
  public hasAirConditioning: boolean = true;
  public hasWifi: boolean = true;
  public occupantId?: string;
  public checkInDate?: number;
  public checkOutDate?: number;
  public accessCard?: string;
  public pinCode?: string;
  public minibar: MinibarItem[] = [];
  public lastCleaningTime: number = 0;

  // Constantes
  private static readonly CLEANING_INTERVAL = 24 * 60 * 60 * 1000; // 24h en ms
  private static readonly MINIBAR_RESTOCK_INTERVAL = 12 * 60 * 60 * 1000; // 12h en ms

  constructor(
    id: string,
    number: string,
    type: RoomType = "standard",
    pricePerNight: number = 100
  ) {
    this.id = id;
    this.number = number;
    this.type = type;
    this.pricePerNight = this.getPriceByType(type);
    this.accessCard = this.generateAccessCard();
    this.pinCode = this.generatePinCode();
    
    // Initialiser le mini-bar
    if (this.hasMinibar) {
      this.minibar = this.initializeMinibar();
    }
  }

  /** Détermine le prix en fonction du type de chambre */
  private getPriceByType(type: RoomType): number {
    const prices: Record<RoomType, number> = {
      standard: 100,
      deluxe: 200,
      suite: 400,
      penthouse: 1000,
      family: 250,
      accessible: 120
    };
    return prices[type] || 100;
  }

  /** Génère une carte d'accès aléatoire */
  private generateAccessCard(): string {
    return `CARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /** Génère un code PIN aléatoire */
  private generatePinCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /** Initialise le mini-bar avec des items par défaut */
  private initializeMinibar(): MinibarItem[] {
    return [
      { id: "water", name: "Eau", price: 5, quantity: 5, restockThreshold: 2 },
      { id: "soda", name: "Soda", price: 3, quantity: 5, restockThreshold: 2 },
      { id: "beer", name: "Bière", price: 8, quantity: 5, restockThreshold: 2 },
      { id: "chocolate", name: "Chocolat", price: 4, quantity: 3, restockThreshold: 1 },
      { id: "chips", name: "Chips", price: 3, quantity: 3, restockThreshold: 1 }
    ];
  }

  /** Vérifie si la chambre est disponible */
  public isAvailable(checkInDate: number, checkOutDate: number): boolean {
    if (!this.isOccupied) return true;
    
    // Si la chambre est occupée, vérifier si les dates se chevauchent
    if (!this.checkInDate || !this.checkOutDate) return true;
    
    return !(
      (checkInDate < this.checkOutDate) && 
      (checkOutDate > this.checkInDate)
    );
  }

  /** Réserver la chambre */
  public book(
    customerId: string,
    checkInDate: number,
    checkOutDate: number
  ): boolean {
    if (this.isOccupied) return false;
    
    this.isOccupied = true;
    this.occupantId = customerId;
    this.checkInDate = checkInDate;
    this.checkOutDate = checkOutDate;
    this.isLocked = true;
    this.isDirty = false;
    
    return true;
  }

  /** Check-in */
  public checkIn(customerId: string): void {
    if (this.occupantId !== customerId) {
      throw new Error(`Le client ${customerId} n'a pas de réservation pour cette chambre.`);
    }
    
    this.isLocked = false;
    this.lastCleaningTime = Date.now();
  }

  /** Check-out */
  public checkOut(): void {
    this.isOccupied = false;
    this.isLocked = true;
    this.isDirty = true;
    this.occupantId = undefined;
    this.checkInDate = undefined;
    this.checkOutDate = undefined;
    
    // Réinitialiser le mini-bar
    this.minibar = this.initializeMinibar();
  }

  /** Nettoyer la chambre */
  public clean(): void {
    this.isDirty = false;
    this.lastCleaningTime = Date.now();
  }

  /** Vérifie si la chambre a besoin de ménage */
  public needsCleaning(): boolean {
    return this.isDirty || 
           (Date.now() - this.lastCleaningTime > Room.CLEANING_INTERVAL);
  }

  /** Ajouter un item au mini-bar */
  public addMinibarItem(item: MinibarItem): void {
    const existingItem = this.minibar.find(i => i.id === item.id);
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.minibar.push(item);
    }
  }

  /** Retirer un item du mini-bar */
  public removeMinibarItem(itemId: string, quantity: number = 1): MinibarItem | null {
    const item = this.minibar.find(i => i.id === itemId);
    if (!item) return null;
    
    if (item.quantity >= quantity) {
      item.quantity -= quantity;
      return { ...item, quantity };
    }
    
    return null;
  }

  /** Vérifie si le mini-bar a besoin d'être réapprovisionné */
  public needsRestocking(): boolean {
    return this.minibar.some(item => item.quantity <= item.restockThreshold);
  }

  /** Réapprovisionner le mini-bar */
  public restockMinibar(): void {
    this.minibar.forEach(item => {
      item.quantity = 10; // Réapprovisionner à 10 unités
    });
  }

  /** Changer le code PIN */
  public setPinCode(pin: string): void {
    this.pinCode = pin.trim();
  }

  /** Changer la carte d'accès */
  public setAccessCard(card: string): void {
    this.accessCard = card.trim();
  }

  /** Obtenir l'état de la chambre */
  public hydrate(state: any): void {
    if (state.isOccupied !== undefined) this.isOccupied = state.isOccupied;
    if (state.customerId !== undefined) (this as any).customerId = state.customerId;
    if (state.customerName !== undefined) (this as any).customerName = state.customerName;
    if (state.nightsRemaining !== undefined) (this as any).nightsRemaining = state.nightsRemaining;
  }

  getState(): RoomState {
    return {
      id: this.id,
      number: this.number,
      type: this.type,
      pricePerNight: this.pricePerNight,
      isOccupied: this.isOccupied,
      isLocked: this.isLocked,
      isDirty: this.isDirty,
      hasMinibar: this.hasMinibar,
      hasTv: this.hasTv,
      hasAirConditioning: this.hasAirConditioning,
      hasWifi: this.hasWifi,
      occupantId: this.occupantId,
      checkInDate: this.checkInDate,
      checkOutDate: this.checkOutDate,
      accessCard: this.accessCard,
      pinCode: this.pinCode
    };
  }

  /** Vérifie si la chambre est déverrouillée */
  public isUnlocked(): boolean {
    return !this.isLocked;
  }

  /** Verrouille/déverrouille la chambre */
  public toggleLock(): void {
    this.isLocked = !this.isLocked;
  }
}

// ==========================================
// 🏢 CLASSE HOTEL SECURITY (Système de sécurité avancé)
// ==========================================

const DEFAULT_PIN = "1234";
const MASTER_PIN = "9999";
const DEFAULT_CARD = "CARD-1234";
const MASTER_CARD = "CARD-MASTER-00";
const LOCKOUT_MS = 15000; // 15 secondes
const MAX_ATTEMPTS = 3;

export class HotelSecurity {
  private fails: Map<string, number> = new Map(); // Tentatives par chambre
  private lockoutUntil: Map<string, number> = new Map(); // Lockout par chambre
  public unlocked: Set<string> = new Set(); // Portes déverrouillées
  
  public tvOn: boolean = false;
  public lightsOn: boolean = false;
  public emergencyExitActive: boolean = false;
  public fireAlarm: boolean = false;

  private customPins: Map<string, string> = new Map();
  private customCards: Map<string, string> = new Map();
  private accessLogs: AccessLogEntry[] = [];
  private masterKeyHolders: Set<string> = new Set(); // Employés avec clé maître

  constructor() {
    // Par défaut, les managers et la sécurité ont la clé maître
    this.masterKeyHolders.add("manager");
    this.masterKeyHolders.add("security");
  }

  /** Initialise l'état du système de sécurité */
  hydrate(
    doorIds: string[] = [],
    tvOn: boolean = false,
    lightsOn: boolean = false,
    emergencyExitActive: boolean = false
  ): void {
    this.unlocked = new Set(doorIds);
    this.tvOn = tvOn;
    this.lightsOn = lightsOn;
    this.emergencyExitActive = emergencyExitActive;
    this.fails.clear();
    this.lockoutUntil.clear();
  }

  /** Prend un snapshot de l'état actuel */
  snapshot(): HotelSnapshot {
    return {
      rooms: [], // À remplir avec les états des chambres
      reservations: [], // À remplir avec les réservations
      unlockedDoors: [...this.unlocked],
      tvOn: this.tvOn,
      lightsOn: this.lightsOn,
      emergencyExitActive: this.emergencyExitActive,
      fireAlarm: this.fireAlarm,
      currentTime: Date.now()
    };
  }

  /** Vérifie si une porte est déverrouillée */
  isUnlocked(doorId: string): boolean {
    return this.unlocked.has(doorId);
  }

  /** Temps restant de lockout pour une chambre */
  remainingLockout(roomId: string): number {
    const until = this.lockoutUntil.get(roomId) || 0;
    return Math.max(0, until - Date.now());
  }

  /** Active/désactive la TV */
  toggleTv(): boolean {
    this.tvOn = !this.tvOn;
    this.logAccess({
      timestamp: Date.now(),
      roomId: "lobby",
      action: this.tvOn ? "unlock" : "lock",
      method: "override",
      success: true,
      message: this.tvOn ? "TV allumée" : "TV éteinte"
    });
    return this.tvOn;
  }

  /** Active/désactive les lumières */
  toggleLights(): boolean {
    this.lightsOn = !this.lightsOn;
    this.logAccess({
      timestamp: Date.now(),
      roomId: "lobby",
      action: this.lightsOn ? "unlock" : "lock",
      method: "override",
      success: true,
      message: this.lightsOn ? "Lumières allumées" : "Lumières éteintes"
    });
    return this.lightsOn;
  }

  /** Active/désactive la sortie de secours */
  toggleEmergencyExit(activate: boolean): void {
    this.emergencyExitActive = activate;
    if (activate) {
      // Déverrouiller toutes les portes en cas d'urgence
      this.unlockAll([...this.unlocked, ...Array.from(this.lockoutUntil.keys())]);
    }
  }

  /** Déclenche l'alarme incendie */
  triggerFireAlarm(): void {
    this.fireAlarm = true;
    this.toggleEmergencyExit(true);
    this.logAccess({
      timestamp: Date.now(),
      roomId: "hotel",
      action: "emergency",
      method: "override",
      success: true,
      message: "Alarme incendie déclenchée"
    });
  }

  /** Réinitialise l'alarme incendie */
  resetFireAlarm(): void {
    this.fireAlarm = false;
    this.toggleEmergencyExit(false);
  }

  /** Définit un code PIN personnalisé pour une chambre */
  setRoomPin(roomId: string, pin: string): void {
    this.customPins.set(roomId, pin.trim());
  }

  /** Définit une carte d'accès personnalisée pour une chambre */
  setRoomCard(roomId: string, cardId: string): void {
    this.customCards.set(roomId, cardId.trim());
  }

  /** Ajoute un détenteur de clé maître */
  addMasterKeyHolder(role: string): void {
    this.masterKeyHolders.add(role);
  }

  /** Retire un détenteur de clé maître */
  removeMasterKeyHolder(role: string): void {
    this.masterKeyHolders.delete(role);
  }

  /** Vérifie si un rôle a la clé maître */
  hasMasterKey(role: string): boolean {
    return this.masterKeyHolders.has(role);
  }

  /** Crocheter une serrure (pour les voleurs ou la police) */
  pick(roomId: string, byRole?: string): LockResult {
    if (this.emergencyExitActive) {
      return this.grant(roomId, "Accès d'urgence activé", "granted");
    }
    
    if (byRole && this.hasMasterKey(byRole)) {
      return this.grant(roomId, "Clé maître utilisée", "granted");
    }
    
    // Chance de 30% de réussir à crocheter
    if (Math.random() < 0.3) {
      return this.grant(roomId, "Serrure crochetée avec succès", "granted");
    }
    
    return this.fail(roomId, "bad_pin");
  }

  /** Verrouille une chambre */
  lock(roomId: string): boolean {
    this.unlocked.delete(roomId);
    this.logAccess({
      timestamp: Date.now(),
      roomId,
      action: "lock",
      method: "override",
      success: true,
      message: `Chambre ${roomId} verrouillée`
    });
    return true;
  }

  /** Déverrouille une chambre */
  unlock(roomId: string): boolean {
    this.unlocked.add(roomId);
    this.logAccess({
      timestamp: Date.now(),
      roomId,
      action: "unlock",
      method: "override",
      success: true,
      message: `Chambre ${roomId} déverrouillée`
    });
    return true;
  }

  /** Bascule l'état de verrouillage d'une chambre */
  toggleDoor(roomId: string): boolean {
    if (this.unlocked.has(roomId)) {
      this.unlocked.delete(roomId);
      return false;
    } else {
      this.unlocked.add(roomId);
      return true;
    }
  }

  /** Déverrouille toutes les chambres */
  unlockAll(ids: string[]): void {
    for (const id of ids) {
      this.unlocked.add(id);
    }
    this.resetLockout();
    this.logAccess({
      timestamp: Date.now(),
      roomId: "all",
      action: "unlock",
      method: "override",
      success: true,
      message: "Toutes les portes déverrouillées"
    });
  }

  /** Verrouille toutes les chambres */
  lockAll(): void {
    this.unlocked.clear();
    this.logAccess({
      timestamp: Date.now(),
      roomId: "all",
      action: "lock",
      method: "override",
      success: true,
      message: "Toutes les portes verrouillées"
    });
  }

  /** Réinitialise le lockout pour toutes les chambres */
  resetLockout(): void {
    this.fails.clear();
    this.lockoutUntil.clear();
  }

  /** Réinitialise le lockout pour une chambre spécifique */
  resetRoomLockout(roomId: string): void {
    this.fails.delete(roomId);
    this.lockoutUntil.delete(roomId);
  }

  /** Essaye de déverrouiller avec un code PIN */
  tryPin(roomId: string, pin: string, byRole?: string): LockResult {
    const left = this.remainingLockout(roomId);
    if (left > 0) {
      return {
        granted: false,
        message: `Lecteur sécurisé bloqué · ${Math.ceil(left / 1000)} s`,
        reason: "lockout",
        lockoutMs: left,
        roomId
      };
    }

    const cleanPin = pin.replace(/[\s-]/g, "");
    const expectedPin = this.customPins.get(roomId) || DEFAULT_PIN;

    // Vérifier si le rôle a la clé maître
    if (byRole && this.hasMasterKey(byRole)) {
      return this.grant(roomId, "Clé maître utilisée", "granted");
    }

    if (cleanPin === expectedPin || cleanPin === MASTER_PIN) {
      return this.grant(roomId, "NIP accepté — Bienvenue dans votre chambre", "granted");
    }

    return this.fail(roomId, "bad_pin");
  }

  /** Essaye de déverrouiller avec une carte magnétique */
  tryCard(roomId: string, cardUid: string = DEFAULT_CARD, byRole?: string): LockResult {
    const left = this.remainingLockout(roomId);
    if (left > 0) {
      return {
        granted: false,
        message: `Lecteur sécurisé bloqué · ${Math.ceil(left / 1000)} s`,
        reason: "lockout",
        lockoutMs: left,
        roomId
      };
    }

    const cleanUid = cardUid.trim();
    const expectedCard = this.customCards.get(roomId) || DEFAULT_CARD;

    // Vérifier si le rôle a la clé maître
    if (byRole && this.hasMasterKey(byRole)) {
      return this.grant(roomId, "Clé maître utilisée", "granted");
    }

    if (cleanUid === expectedCard || cleanUid === MASTER_CARD) {
      return this.grant(roomId, "Carte magnétique validée — Accès autorisé", "granted");
    }

    return this.fail(roomId, "bad_card");
  }

  /** Accorde l'accès à une chambre */
  private grant(roomId: string, message: string, reason: LockResult["reason"]): LockResult {
    this.fails.delete(roomId);
    this.unlocked.add(roomId);
    this.lockoutUntil.delete(roomId);
    
    this.logAccess({
      timestamp: Date.now(),
      roomId,
      action: "unlock",
      method: reason === "granted" ? "pin" : "override",
      success: true,
      message
    });
    
    return {
      granted: true,
      message,
      reason,
      lockoutMs: 0,
      roomId
    };
  }

  /** Échec de déverrouillage */
  private fail(roomId: string, kind: "bad_pin" | "bad_card"): LockResult {
    const currentFails = (this.fails.get(roomId) || 0) + 1;
    this.fails.set(roomId, currentFails);
    
    if (currentFails >= MAX_ATTEMPTS) {
      this.lockoutUntil.set(roomId, Date.now() + LOCKOUT_MS);
      this.fails.set(roomId, 0);
      
      this.logAccess({
        timestamp: Date.now(),
        roomId,
        action: "unlock",
        method: kind === "bad_pin" ? "pin" : "card",
        success: false,
        message: "3 tentatives infructueuses — Terminal bloqué 15 s"
      });
      
      return {
        granted: false,
        message: "3 tentatives infructueuses — Terminal bloqué 15 s",
        reason: "lockout",
        lockoutMs: LOCKOUT_MS,
        roomId
      };
    }

    this.logAccess({
      timestamp: Date.now(),
      roomId,
      action: "unlock",
      method: kind === "bad_pin" ? "pin" : "card",
      success: false,
      message: kind === "bad_pin" ? "NIP incorrect" : "Carte magnétique invalide"
    });
    
    return {
      granted: false,
      message: kind === "bad_pin" ? "NIP incorrect" : "Carte magnétique invalide",
      reason: kind,
      lockoutMs: 0,
      roomId
    };
  }

  /** Ajoute une entrée dans le journal des accès */
  private logAccess(entry: AccessLogEntry): void {
    this.accessLogs.push(entry);
    // Limiter la taille du journal
    if (this.accessLogs.length > 1000) {
      this.accessLogs.shift();
    }
  }

  /** Récupère le journal des accès */
  getAccessLogs(limit: number = 100): AccessLogEntry[] {
    return [...this.accessLogs].slice(-limit);
  }

  /** Vérifie si une chambre est accessible */
  canAccessRoom(roomId: string, customerId?: string, employeeRole?: string): boolean {
    // En cas d'urgence, tout le monde peut accéder
    if (this.emergencyExitActive) return true;
    
    // Vérifier si c'est un employé avec accès
    if (employeeRole && this.hasMasterKey(employeeRole)) return true;
    
    // Vérifier si la porte est déverrouillée
    if (this.unlocked.has(roomId)) return true;
    
    return false;
  }
}

// Instance globale du système de sécurité
export const hotelSecurity = new HotelSecurity();

// ==========================================
// 🏨 CLASSE HOTEL (Gestion complète de l'hôtel)
// ==========================================

export class Hotel {
  public id: string;
  public name: string;
  public address: string;
  public starRating: number; // 1-5 étoiles
  public rooms: Map<string, Room> = new Map();
  public reservations: Map<string, Reservation> = new Map();
  public customers: Map<string, HotelCustomer> = new Map();
  public employees: Map<string, HotelEmployee> = new Map();
  public services: HotelService[] = [];
  public events: HotelEvent[] = [];
  public security: HotelSecurity;

  constructor(
    id: string,
    name: string,
    address: string,
    starRating: number = 3
  ) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.starRating = Math.max(1, Math.min(5, starRating));
    this.security = new HotelSecurity();
    
    // Initialiser les services par défaut
    this.initializeServices();
  }

  /** Initialise les services de l'hôtel */
  private initializeServices(): void {
    this.services = [
      {
        id: "room_service",
        name: "Service en chambre",
        description: "Repas et boissons livrés dans votre chambre",
        price: 15,
        available: true
      },
      {
        id: "housekeeping",
        name: "Ménage",
        description: "Nettoyage de la chambre",
        price: 0,
        available: true
      },
      {
        id: "wake_up_call",
        name: "Réveil",
        description: "Appel de réveil",
        price: 0,
        available: true
      },
      {
        id: "massage",
        name: "Massage",
        description: "Massage relaxant (60 min)",
        price: 80,
        duration: 60,
        available: true
      },
      {
        id: "laundry",
        name: "Blanchisserie",
        description: "Nettoyage de vos vêtements",
        price: 20,
        available: true
      }
    ];
  }

  /** Ajoute une chambre à l'hôtel */
  addRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  /** Supprime une chambre de l'hôtel */
  removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /** Récupère une chambre par son ID */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /** Récupère une chambre par son numéro */
  getRoomByNumber(number: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.number === number) return room;
    }
    return undefined;
  }

  /** Récupère toutes les chambres disponibles */
  getAvailableRooms(checkInDate: number, checkOutDate: number): Room[] {
    const availableRooms: Room[] = [];
    
    for (const room of this.rooms.values()) {
      if (room.isAvailable(checkInDate, checkOutDate)) {
        availableRooms.push(room);
      }
    }
    
    return availableRooms;
  }

  /** Récupère toutes les chambres occupées */
  getOccupiedRooms(): Room[] {
    const occupiedRooms: Room[] = [];
    
    for (const room of this.rooms.values()) {
      if (room.isOccupied) {
        occupiedRooms.push(room);
      }
    }
    
    return occupiedRooms;
  }

  /** Récupère toutes les chambres nécessitant le ménage */
  getRoomsNeedingCleaning(): Room[] {
    const dirtyRooms: Room[] = [];
    
    for (const room of this.rooms.values()) {
      if (room.needsCleaning()) {
        dirtyRooms.push(room);
      }
    }
    
    return dirtyRooms;
  }

  /** Récupère toutes les chambres avec mini-bar à réapprovisionner */
  getRoomsNeedingRestocking(): Room[] {
    const roomsToRestock: Room[] = [];
    
    for (const room of this.rooms.values()) {
      if (room.hasMinibar && room.needsRestocking()) {
        roomsToRestock.push(room);
      }
    }
    
    return roomsToRestock;
  }

  /** Crée une réservation */
  createReservation(
    customerId: string,
    roomId: string,
    checkInDate: number,
    checkOutDate: number,
    serviceLevel: ServiceLevel = "basic"
  ): Reservation | null {
    const customer = this.customers.get(customerId);
    if (!customer) {
      console.error(`Client ${customerId} introuvable.`);
      return null;
    }
    
    const room = this.rooms.get(roomId);
    if (!room) {
      console.error(`Chambre ${roomId} introuvable.`);
      return null;
    }
    
    if (!room.isAvailable(checkInDate, checkOutDate)) {
      console.error(`Chambre ${roomId} non disponible pour les dates spécifiées.`);
      return null;
    }
    
    const nights = Math.ceil((checkOutDate - checkInDate) / (24 * 60 * 60 * 1000));
    const totalPrice = room.pricePerNight * nights * this.getServiceLevelMultiplier(serviceLevel);
    
    const reservation: Reservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId,
      customerId,
      customerName: customer.name,
      checkInDate,
      checkOutDate,
      status: "confirmed",
      totalPrice,
      paymentMethod: "card",
      serviceLevel
    };
    
    this.reservations.set(reservation.id, reservation);
    room.book(customerId, checkInDate, checkOutDate);
    
    return reservation;
  }

  /** Annule une réservation */
  cancelReservation(reservationId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return false;
    
    if (reservation.status !== "confirmed") return false;
    
    reservation.status = "cancelled";
    const room = this.rooms.get(reservation.roomId);
    if (room) {
      room.isOccupied = false;
      room.occupantId = undefined;
      room.checkInDate = undefined;
      room.checkOutDate = undefined;
    }
    
    return true;
  }

  /** Check-in pour une réservation */
  checkIn(reservationId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return false;
    
    if (reservation.status !== "confirmed") return false;
    
    const room = this.rooms.get(reservation.roomId);
    if (!room) return false;
    
    reservation.status = "checked_in";
    room.checkIn(reservation.customerId);
    this.security.unlock(reservation.roomId);
    
    return true;
  }

  /** Check-out pour une réservation */
  checkOut(reservationId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return false;
    
    if (reservation.status !== "checked_in") return false;
    
    const room = this.rooms.get(reservation.roomId);
    if (!room) return false;
    
    reservation.status = "checked_out";
    room.checkOut();
    this.security.lock(reservation.roomId);
    
    return true;
  }

  /** Ajoute un client */
  addCustomer(customer: HotelCustomer): void {
    this.customers.set(customer.id, customer);
  }

  /** Supprime un client */
  removeCustomer(customerId: string): boolean {
    return this.customers.delete(customerId);
  }

  /** Récupère un client par son ID */
  getCustomer(customerId: string): HotelCustomer | undefined {
    return this.customers.get(customerId);
  }

  /** Ajoute un employé */
  addEmployee(employee: HotelEmployee): void {
    this.employees.set(employee.id, employee);
    
    // Si c'est un manager ou un agent de sécurité, lui donner la clé maître
    if (employee.role === "manager" || employee.role === "security") {
      this.security.addMasterKeyHolder(employee.id);
    }
  }

  /** Supprime un employé */
  removeEmployee(employeeId: string): boolean {
    const employee = this.employees.get(employeeId);
    if (employee) {
      this.security.removeMasterKeyHolder(employee.id);
    }
    return this.employees.delete(employeeId);
  }

  /** Récupère un employé par son ID */
  getEmployee(employeeId: string): HotelEmployee | undefined {
    return this.employees.get(employeeId);
  }

  /** Récupère tous les employés en service */
  getEmployeesOnDuty(): HotelEmployee[] {
    const onDuty: HotelEmployee[] = [];
    const currentHour = new Date().getHours();
    
    for (const employee of this.employees.values()) {
      if (employee.isOnDuty) {
        const inShift = currentHour >= employee.shiftStart && currentHour < employee.shiftEnd;
        if (inShift) {
          onDuty.push(employee);
        }
      }
    }
    
    return onDuty;
  }

  /** Assigne un employé à une chambre pour le ménage */
  assignEmployeeToRoom(employeeId: string, roomId: string): boolean {
    const employee = this.employees.get(employeeId);
    if (!employee) return false;
    
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    if (employee.role !== "housekeeping") return false;
    
    employee.currentRoom = roomId;
    room.clean();
    
    return true;
  }

  /** Commande un service pour une chambre */
  orderService(
    roomId: string,
    serviceId: string,
    customerId?: string
  ): boolean {
    const service = this.services.find(s => s.id === serviceId);
    if (!service || !service.available) return false;
    
    const room = this.rooms.get(roomId);
    if (!room || !room.isOccupied) return false;
    
    if (customerId && room.occupantId !== customerId) return false;
    
    // Logique de service
    if (serviceId === "housekeeping") {
      room.clean();
    } else if (serviceId === "minibar_restock") {
      room.restockMinibar();
    }
    
    return true;
  }

  /** Déclenche un événement aléatoire */
  triggerRandomEvent(): void {
    const eventTypes: HotelEvent["type"][] = [
      "fire",
      "theft",
      "noise_complaint",
      "vip_arrival",
      "power_outage",
      "water_leak"
    ];
    
    const roomIds = [...this.rooms.keys()];
    const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const randomRoomId = roomIds[Math.floor(Math.random() * roomIds.length)];
    
    const event: HotelEvent = {
      id: `event_${Date.now()}`,
      type: randomEventType,
      roomId: randomRoomId,
      message: this.generateEventMessage(randomEventType, randomRoomId),
      severity: this.getEventSeverity(randomEventType),
      timestamp: Date.now(),
      resolved: false
    };
    
    this.events.push(event);
    
    // Actions spécifiques selon le type d'événement
    if (randomEventType === "fire") {
      this.security.triggerFireAlarm();
    } else if (randomEventType === "power_outage") {
      this.security.lightsOn = false;
    }
  }

  /** Génère un message pour un événement */
  private generateEventMessage(type: HotelEvent["type"], roomId?: string): string {
    const room = roomId ? this.rooms.get(roomId) : null;
    const roomNumber = room ? room.number : "inconnue";
    
    switch (type) {
      case "fire":
        return `🔥 Incendie détecté dans la chambre ${roomNumber}! Évacuez immédiatement.`;
      case "theft":
        return `🚨 Vol signalé dans la chambre ${roomNumber}. La sécurité est en route.`;
      case "noise_complaint":
        return `🔊 Plainte pour bruit dans la chambre ${roomNumber}. Veuillez faire silence.`;
      case "vip_arrival":
        return `✨ Arrivée d'un client VIP à la réception.`;
      case "power_outage":
        return `⚡ Panne de courant dans l'hôtel. Les générateurs de secours sont activés.`;
      case "water_leak":
        return `💧 Fuite d'eau détectée dans la chambre ${roomNumber}. Maintenance requise.`;
      default:
        return `Événement inconnu dans la chambre ${roomNumber}.`;
    }
  }

  /** Détermine la sévérité d'un événement */
  private getEventSeverity(type: HotelEvent["type"]): HotelEvent["severity"] {
    switch (type) {
      case "fire": return "high";
      case "theft": return "medium";
      case "power_outage": return "high";
      case "water_leak": return "medium";
      default: return "low";
    }
  }

  /** Résout un événement */
  resolveEvent(eventId: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;
    
    event.resolved = true;
    
    // Actions spécifiques après résolution
    if (event.type === "fire") {
      this.security.resetFireAlarm();
    } else if (event.type === "power_outage") {
      this.security.lightsOn = true;
    }
    
    return true;
  }

  /** Récupère tous les événements non résolus */
  getUnresolvedEvents(): HotelEvent[] {
    return this.events.filter(e => !e.resolved);
  }

  /** Calcule le multiplicateur de prix selon le niveau de service */
  private getServiceLevelMultiplier(level: ServiceLevel): number {
    switch (level) {
      case "basic": return 1.0;
      case "premium": return 1.25;
      case "vip": return 1.5;
      default: return 1.0;
    }
  }

  /** Prend un snapshot de l'état de l'hôtel */
  snapshot(): HotelSnapshot {
    return {
      rooms: [...this.rooms.values()].map(room => room.getState()),
      reservations: [...this.reservations.values()],
      unlockedDoors: [...this.security.unlocked],
      tvOn: this.security.tvOn,
      lightsOn: this.security.lightsOn,
      emergencyExitActive: this.security.emergencyExitActive,
      fireAlarm: this.security.fireAlarm,
      currentTime: Date.now()
    };
  }

  /** Charge un état depuis un snapshot */
  hydrate(snapshot: HotelSnapshot): void {
    // Charger les chambres
    for (const roomState of snapshot.rooms) {
      const room = this.rooms.get(roomState.id);
      if (room) {
        room.hydrate(roomState);
      }
    }
    
    // Charger l'état de la sécurité
    this.security.hydrate(
      snapshot.unlockedDoors,
      snapshot.tvOn,
      snapshot.lightsOn,
      snapshot.emergencyExitActive
    );
  }

  /** Met à jour l'état de l'hôtel (à appeler régulièrement) */
  tick(): void {
    // Vérifier les check-out automatiques
    const now = Date.now();
    for (const reservation of this.reservations.values()) {
      if (
        reservation.status === "checked_in" &&
        reservation.checkOutDate &&
        now >= reservation.checkOutDate
      ) {
        this.checkOut(reservation.id);
      }
    }
    
    // Déclencher des événements aléatoires (1% de chance par tick)
    if (Math.random() < 0.01) {
      this.triggerRandomEvent();
    }
  }
}

// ==========================================
// 🏨 INSTANCE GLOBALE DE L'HÔTEL
// ==========================================

// Exemple d'initialisation d'un hôtel
export function createDefaultHotel(): Hotel {
  const hotel = new Hotel(
    "hotel_1",
    "Hôtel du Comté de Portneuf",
    "123 Rue Principale, Portneuf, QC",
    4
  );

  // Ajouter des chambres
  const roomTypes: RoomType[] = ["standard", "deluxe", "suite", "standard", "accessible"];
  const roomNumbers = ["101", "102", "201", "202", "203"];
  
  for (let i = 0; i < roomNumbers.length; i++) {
    const room = new Room(
      `room_${i + 1}`,
      roomNumbers[i],
      roomTypes[i % roomTypes.length]
    );
    hotel.addRoom(room);
    
    // Déverrouiller certaines chambres par défaut
    if (i < 2) {
      hotel.security.unlock(room.id);
    }
  }

  // Ajouter des clients
  hotel.addCustomer({
    id: "customer_1",
    name: "Jean Tremblay",
    phone: "514-123-4567",
    email: "jean.tremblay@example.com",
    loyaltyPoints: 150,
    preferredRoomType: "deluxe",
    blacklisted: false,
    checkInHistory: []
  });

  hotel.addCustomer({
    id: "customer_2",
    name: "Marie Leblanc",
    phone: "418-987-6543",
    email: "marie.leblanc@example.com",
    loyaltyPoints: 0,
    blacklisted: false,
    checkInHistory: []
  });

  // Ajouter des employés
  hotel.addEmployee({
    id: "employee_1",
    name: "Pierre Dubois",
    role: "receptionist",
    shiftStart: 8,
    shiftEnd: 16,
    isOnDuty: true
  });

  hotel.addEmployee({
    id: "employee_2",
    name: "Sophie Martin",
    role: "housekeeping",
    shiftStart: 9,
    shiftEnd: 17,
    isOnDuty: true
  });

  hotel.addEmployee({
    id: "employee_3",
    name: "Luc Bienvenue",
    role: "security",
    shiftStart: 16,
    shiftEnd: 0, // Quart de nuit
    isOnDuty: true
  });

  hotel.addEmployee({
    id: "employee_4",
    name: "Michel Tremblay",
    role: "manager",
    shiftStart: 8,
    shiftEnd: 18,
    isOnDuty: true
  });

  // Créer quelques réservations
  const today = Date.now();
  const tomorrow = today + 24 * 60 * 60 * 1000;
  const inTwoDays = today + 2 * 24 * 60 * 60 * 1000;
  
  hotel.createReservation("customer_1", "room_1", today, tomorrow, "premium");
  hotel.createReservation("customer_2", "room_2", today, inTwoDays, "basic");

  // Check-in pour la première réservation
  const reservation1 = [...hotel.reservations.values()][0];
  if (reservation1) {
    hotel.checkIn(reservation1.id);
  }

  return hotel;
}

// Instance globale de l'hôtel par défaut
export const defaultHotel = createDefaultHotel();

// ==========================================
// 🎯 EXPORTS PRINCIPAUX
// ==========================================

