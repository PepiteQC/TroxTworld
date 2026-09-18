// ═══════════════════════════════════════════════════════════════════════════
//  ETHERWORLD RP ENGINE — ORCHESTRATEUR CENTRAL DES SYSTÈMES RP
//  server/systems/RPEngine.ts
//  Économie, Emplois, Gangs, Immobilier, Justice, Commerce & Inventaire
// ═══════════════════════════════════════════════════════════════════════════

import { jobManager, type JobManager } from './JobSystem';
import { gangManager, type GangManager } from './GangSystem';
import { realEstateManager, type RealEstateManager } from './RealEstateSystem';
import { crimeManager, type CrimeManager } from './CrimeSystem';
import { bankingManager, type BankingManager } from './BankingSystem';
import { inventoryManager, type InventoryManager } from './InventorySystem';
import { lawEnforcementManager, type LawEnforcementManager } from './LawEnforcementSystem';
import { commerceManager, type CommerceManager } from './CommerceSystem';

// ==========================================
// INTERFACES TYPÉES (REMPLACEMENT DES `any`)
// ==========================================

export interface PlayerProfile {
  playerId: string;
  playerName: string;
  level: number;
  experience: number;
  bankAccountId: string | null;
  inventoryId: string | null;
  jobId: string | null;
  gangId: string | null;
  factionId: string | null;
  propertyIds: string[];
  wantedStars: number;
  isHandcuffed: boolean;
  inJail: boolean;
  jailReleaseAt: number | null;
  createdAt: number;
  lastLogin: number;
  playtimeHours: number;
  totalEarnings: number;
  totalSpent: number;
}

export interface GameEvent {
  eventId: string;
  category: GameEventCategory;
  type: string;
  playerId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export type GameEventCategory =
  | "player"
  | "job"
  | "gang"
  | "realestate"
  | "crime"
  | "banking"
  | "inventory"
  | "law"
  | "commerce";

export type GameEventListener = (event: GameEvent) => void;

// ==========================================
// BUFFER D'ÉVÉNEMENTS CIRCULAIRE (ZERO LEAK)
// ==========================================

const MAX_EVENT_HISTORY = 200;

class EventBuffer {
  private buffer: GameEvent[] = [];
  private listeners = new Set<GameEventListener>();

  public push(event: GameEvent): void {
    this.buffer.push(event);

    // Protection contre la fuite mémoire : on ne garde que les N derniers
    if (this.buffer.length > MAX_EVENT_HISTORY) {
      this.buffer = this.buffer.slice(-MAX_EVENT_HISTORY);
    }

    // Notification de tous les écouteurs enregistrés
    for (const cb of this.listeners) {
      try {
        cb(event);
      } catch (err) {
        console.error("[RPEngine] Erreur dans un écouteur d'événement :", err);
      }
    }
  }

  public subscribe(cb: GameEventListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public getRecent(count = 50): GameEvent[] {
    return this.buffer.slice(-count);
  }

  public getByCategory(category: GameEventCategory, count = 30): GameEvent[] {
    return this.buffer.filter((e) => e.category === category).slice(-count);
  }

  public clear(): void {
    this.buffer.length = 0;
    this.listeners.clear();
  }

  public get size(): number {
    return this.buffer.length;
  }
}

// ==========================================
// MOTEUR RP CENTRAL
// ==========================================

export class EtherWorldRPEngine {
  private jobs: JobManager;
  private gangs: GangManager;
  private realEstate: RealEstateManager;
  private crimes: CrimeManager;
  private banking: BankingManager;
  private inventory: InventoryManager;
  private lawEnforcement: LawEnforcementManager;
  private commerce: CommerceManager;

  private players = new Map<string, PlayerProfile>();
  private events = new EventBuffer();

  constructor() {
    this.jobs = jobManager;
    this.gangs = gangManager;
    this.realEstate = realEstateManager;
    this.crimes = crimeManager;
    this.banking = bankingManager;
    this.inventory = inventoryManager;
    this.lawEnforcement = lawEnforcementManager;
    this.commerce = commerceManager;

    this.wireSystemCallbacks();
    console.log("🎮 [RPEngine] Moteur RP EtherWorld initialisé (8 sous-systèmes actifs).");
  }

  private wireSystemCallbacks(): void {
    this.jobs.onUpdate((e: Record<string, unknown>) => this.emit("job", "job_update", e));
    this.gangs.onUpdate((e: Record<string, unknown>) => this.emit("gang", "gang_update", e));
    this.realEstate.onUpdate((e: Record<string, unknown>) => this.emit("realestate", "property_update", e));
    this.crimes.onUpdate((e: Record<string, unknown>) => this.emit("crime", "crime_update", e));
    this.banking.onUpdate((e: Record<string, unknown>) => this.emit("banking", "banking_update", e));
    this.inventory.onUpdate((e: Record<string, unknown>) => this.emit("inventory", "inventory_update", e));
    this.lawEnforcement.onUpdate((e: Record<string, unknown>) => this.emit("law", "law_update", e));
    this.commerce.onUpdate((e: Record<string, unknown>) => this.emit("commerce", "commerce_update", e));
  }

  // ==========================================
  // GESTION DES JOUEURS (CITOYENS)
  // ==========================================

  public createPlayer(playerId: string, playerName: string, startingCash = 250, startingBank = 2500): PlayerProfile {
    if (this.players.has(playerId)) {
      return this.players.get(playerId)!;
    }

    const cleanName = String(playerName).trim().slice(0, 64) || "Citoyen";

    // Création du compte bancaire Desjardins
    const bankAccount = this.banking.createAccount(playerId, cleanName, "personal");
    if (bankAccount) {
      this.banking.deposit(bankAccount.accountId, startingBank, "Ouverture de compte · Caisse Desjardins");
    }

    // Création de l'inventaire
    const inv = this.inventory.createInventory(playerId, cleanName, "player", 30);

    const profile: PlayerProfile = {
      playerId,
      playerName: cleanName,
      level: 1,
      experience: 0,
      bankAccountId: bankAccount?.accountId ?? null,
      inventoryId: inv?.id ?? null,
      jobId: null,
      gangId: null,
      factionId: null,
      propertyIds: [],
      wantedStars: 0,
      isHandcuffed: false,
      inJail: false,
      jailReleaseAt: null,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      playtimeHours: 0,
      totalEarnings: startingBank + startingCash,
      totalSpent: 0,
    };

    this.players.set(playerId, profile);
    this.emit("player", "player_created", { playerId, playerName: cleanName });

    return profile;
  }

  public getPlayer(playerId: string): PlayerProfile | undefined {
    return this.players.get(playerId);
  }

  public removePlayer(playerId: string): boolean {
    const existed = this.players.delete(playerId);
    if (existed) {
      this.emit("player", "player_removed", { playerId });
    }
    return existed;
  }

  // ==========================================
  // EMPLOIS & TRAVAIL (HEURES DE SERVICE)
  // ==========================================

  public hirePlayer(playerId: string, jobId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const existing = this.jobs.getEmployee(playerId);
    if (existing) return false;

    const success = this.jobs.hireEmployee(playerId, player.playerName, jobId);
    if (success) {
      player.jobId = jobId;
      this.emit("player", "player_hired", { playerId, jobId });
    }
    return success;
  }

  public firePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || !player.jobId) return false;

    const success = this.jobs.fireEmployee(playerId);
    if (success) {
      player.jobId = null;
      this.emit("player", "player_fired", { playerId });
    }
    return success;
  }

  public startWork(playerId: string): boolean {
    const success = this.jobs.startShift(playerId);
    if (success) this.emit("player", "shift_started", { playerId });
    return success;
  }

  public endWork(playerId: string): number {
    const hours = this.jobs.endShift(playerId);
    if (hours > 0) {
      const player = this.players.get(playerId);
      if (player) {
        player.playtimeHours += hours;
        this.emit("player", "shift_ended", { playerId, hours });
      }
    }
    return hours;
  }

  public completeJobTask(playerId: string, taskId: string): number {
    const reward = this.jobs.completeTask(playerId, taskId);
    if (reward <= 0) return 0;

    const player = this.players.get(playerId);
    if (player) {
      player.totalEarnings += reward;
      player.experience += Math.floor(reward / 10);

      if (player.bankAccountId) {
        this.banking.deposit(player.bankAccountId, reward, `Tâche ${taskId} complétée`);
      }
      this.emit("player", "task_completed", { playerId, taskId, reward });
    }
    return reward;
  }

  // ==========================================
  // GANGS & ORGANISATIONS CRIMINELLES
  // ==========================================

  public recruitInGang(playerId: string, gangId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;
    if (player.gangId) return false; // Déjà dans un gang

    const success = this.gangs.recruitMember(gangId, playerId, player.playerName);
    if (success) {
      player.gangId = gangId;
      this.emit("gang", "member_recruited", { playerId, gangId });
    }
    return success;
  }

  public leaveGang(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || !player.gangId) return false;

    const gangId = player.gangId;
    const success = this.gangs.removeMember(gangId, playerId);
    if (success) {
      player.gangId = null;
      this.emit("gang", "member_left", { playerId, gangId });
    }
    return success;
  }

  // ==========================================
  // IMMOBILIER MLS (ACHAT / VENTE)
  // ==========================================

  public buyProperty(playerId: string, propertyId: string, price: number): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    // Vérification du solde bancaire avant achat (sécurité anti-exploit)
    if (player.bankAccountId) {
      const balance = this.banking.getBalance(player.bankAccountId);
      if (balance < price) {
        this.emit("banking", "insufficient_funds", { playerId, required: price, available: balance });
        return false;
      }
    } else {
      return false;
    }

    const success = this.realEstate.buyProperty(playerId, propertyId, price);
    if (success) {
      this.banking.withdraw(player.bankAccountId, price, `Achat MLS · ${propertyId}`);
      player.propertyIds.push(propertyId);
      player.totalSpent += price;
      this.emit("realestate", "property_purchased", { playerId, propertyId, price });
    }
    return success;
  }

  // ==========================================
  // JUSTICE & CRIMINALITÉ (SQ / PÉNITENCIER)
  // ==========================================

  public commitCrime(playerId: string, crimeId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const success = this.crimes.commitCrime(playerId, player.playerName, crimeId);
    if (success) {
      const wanted = this.crimes.getWantedStatus(playerId);
      player.wantedStars = wanted?.stars ?? 0;
      this.emit("crime", "crime_committed", { playerId, crimeId, stars: player.wantedStars });
    }
    return success;
  }

  public arrestPlayer(officerId: string, targetId: string, prisonMinutes: number): boolean {
    const target = this.players.get(targetId);
    if (!target) return false;

    const success = this.crimes.arrestPlayer(targetId, prisonMinutes);
    if (success) {
      target.wantedStars = 0;
      target.isHandcuffed = true;
      target.inJail = true;
      target.jailReleaseAt = Date.now() + prisonMinutes * 60_000;

      this.emit("law", "player_arrested", {
        officerId,
        targetId,
        prisonMinutes,
        targetName: target.playerName,
      });
    }
    return success;
  }

  public releasePlayer(targetId: string): boolean {
    const target = this.players.get(targetId);
    if (!target) return false;

    target.isHandcuffed = false;
    target.inJail = false;
    target.jailReleaseAt = null;

    this.emit("law", "player_released", { targetId });
    return true;
  }

  // ==========================================
  // FACTIONS LÉGALES (SQ, EMS, POMPIERS)
  // ==========================================

  public joinFaction(playerId: string, factionId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const faction = this.lawEnforcement.getFaction(factionId);
    if (!faction) return false;

    const officer = this.lawEnforcement.recruitOfficer(
      factionId,
      playerId,
      player.playerName,
      faction.type
    );

    if (officer) {
      player.factionId = factionId;
      this.emit("law", "player_joined_faction", { playerId, factionId });
      return true;
    }
    return false;
  }

  // ==========================================
  // COMMERCE & ACHATS EN BOUTIQUE
  // ==========================================

  public buyItem(playerId: string, shopId: string, listingId: string, quantity: number): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    // Validation de quantité (Anti-Duplication)
    const cleanQty = Math.max(1, Math.min(Math.floor(quantity), 100));

    const transaction = this.commerce.buyFromShop(
      shopId,
      playerId,
      player.playerName,
      listingId,
      cleanQty
    );

    if (!transaction) return false;

    const totalPrice = transaction.totalPrice;

    // Vérification du solde
    if (player.bankAccountId) {
      const balance = this.banking.getBalance(player.bankAccountId);
      if (balance < totalPrice) return false;

      this.banking.withdraw(player.bankAccountId, totalPrice, `Achat · ${shopId}`);
    }

    // Ajout à l'inventaire
    if (player.inventoryId) {
      this.inventory.addItem(player.inventoryId, transaction.itemId, cleanQty);
    }

    player.totalSpent += totalPrice;
    this.emit("commerce", "item_purchased", { playerId, shopId, listingId, quantity: cleanQty, totalPrice });
    return true;
  }

  // ==========================================
  // SYSTÈME D'ÉVÉNEMENTS (PUB/SUB)
  // ==========================================

  private emit(category: GameEventCategory, type: string, data: Record<string, unknown> = {}): void {
    this.events.push({
      eventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      category,
      type,
      playerId: typeof data.playerId === "string" ? data.playerId : undefined,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Abonne un écouteur aux événements du moteur RP.
   * Retourne une fonction de désabonnement pour le cleanup automatique.
   */
  public onGameEvent(callback: GameEventListener): () => void {
    return this.events.subscribe(callback);
  }

  public getRecentEvents(count = 50): GameEvent[] {
    return this.events.getRecent(count);
  }

  // ==========================================
  // STATISTIQUES & DIAGNOSTIC
  // ==========================================

  public getEngineStats() {
    return {
      players: this.players.size,
      jobs: this.jobs.getAllJobs().length,
      gangs: this.gangs.getAllGangs().length,
      events: this.events.size,
      timestamp: Date.now(),
    };
  }

  // ==========================================
  // LIBÉRATION MÉMOIRE
  // ==========================================

  public dispose(): void {
    this.jobs.dispose();
    this.gangs.dispose();
    this.realEstate.dispose();
    this.crimes.dispose();
    this.banking.dispose();
    this.inventory.dispose();
    this.lawEnforcement.dispose();
    this.commerce.dispose();
    this.events.clear();
    this.players.clear();
    console.log("🛑 [RPEngine] Moteur RP libéré proprement.");
  }
}

// Singleton exporté
export const rpEngine = new EtherWorldRPEngine();
