/**
 * ═══════════════════════════════════════════════════════════════════
 * ⚔️ TROXTWORLD / ETHERWORLD — SYSTÈME DE GANGS & CRIMINALITÉ (SERVER)
 * ═══════════════════════════════════════════════════════════════════
 * Gestion des organisations criminelles, recrutement, trésorerie,
 * territoires/turfs disputés et hiérarchie interne.
 */

export type GangRank = "leader" | "lieutenant" | "enforcer" | "member" | "recruit";

export interface GangMember {
  playerId: string;
  playerName: string;
  rank: GangRank;
  joinedAt: number;
  contributedFunds: number;
}

export interface GangTerritory {
  id: string;
  name: string;
  controllingGangId: string | null;
  influencePercent: number;
  revenuePerCycle: number;
  lastContestedAt?: number;
}

export interface Gang {
  id: string;
  name: string;
  tag: string;
  colorHex: string;
  leaderId: string;
  bankBalance: number;
  members: Map<string, GangMember>;
  territoryIds: string[];
  maxMembers: number;
  reputation: number;
  createdAt: number;
}

export interface GangDTO {
  id: string;
  name: string;
  tag: string;
  colorHex: string;
  leaderId: string;
  bankBalance: number;
  memberCount: number;
  territoryCount: number;
  reputation: number;
  members: GangMember[];
}

export type GangUpdateListener = (event: Record<string, unknown>) => void;

export class GangManager {
  private gangs: Map<string, Gang> = new Map();
  private territories: Map<string, GangTerritory> = new Map();
  private updateListeners: Set<GangUpdateListener> = new Set();
  private territoryIncomeInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.seedDefaultGangsAndTerritories();
    this.startTerritoryIncomeLoop();
    console.log(`⚔️ [GangSystem] Initialisé : ${this.gangs.size} factions criminelles et ${this.territories.size} territoires.`);
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALISATION DU LORE DE PORTNEUF
  // ═══════════════════════════════════════════════════════════

  private seedDefaultGangsAndTerritories(): void {
    // Territoires clés
    const defaultTerritories: GangTerritory[] = [
      { id: "turf_donnacona_docks", name: "Docks Fluviaux (Donnacona)", controllingGangId: "gang_motards", influencePercent: 100, revenuePerCycle: 450 },
      { id: "turf_saint_raymond_forest", name: "Scierie Abandonnée (Saint-Raymond)", controllingGangId: "gang_syndicate", influencePercent: 80, revenuePerCycle: 350 },
      { id: "turf_pont_rouge_gravel", name: "Sablière & Rang Ouest (Pont-Rouge)", controllingGangId: null, influencePercent: 0, revenuePerCycle: 250 },
    ];

    for (const t of defaultTerritories) {
      this.territories.set(t.id, t);
    }

    // Gangs de départ
    this.createGangInternal("gang_motards", "Chapitre Portneuf (Motards)", "MC-66", "#e53e3e", "system_npc_1", "NPC_Boss1", 12000);
    this.createGangInternal("gang_syndicate", "Syndicat du Fleuve", "SDF", "#805ad5", "system_npc_2", "NPC_Boss2", 8500);
  }

  private createGangInternal(
    id: string,
    name: string,
    tag: string,
    colorHex: string,
    leaderId: string,
    leaderName: string,
    initialTreasury = 0
  ): Gang {
    const members = new Map<string, GangMember>();
    members.set(leaderId, {
      playerId: leaderId,
      playerName: leaderName,
      rank: "leader",
      joinedAt: Date.now(),
      contributedFunds: 0,
    });

    const gang: Gang = {
      id,
      name,
      tag,
      colorHex,
      leaderId,
      bankBalance: initialTreasury,
      members,
      territoryIds: [],
      maxMembers: 16,
      reputation: 100,
      createdAt: Date.now(),
    };

    this.gangs.set(id, gang);
    return gang;
  }

  // ═══════════════════════════════════════════════════════════
  // GESTION DES RECRUTEMENTS ET DES MEMBRES
  // ═══════════════════════════════════════════════════════════

  public recruitMember(gangId: string, playerId: string, playerName: string): boolean {
    const gang = this.gangs.get(gangId);
    if (!gang) return false;

    // Vérifier si le joueur est déjà dans un gang
    if (this.getGangByMember(playerId)) return false;

    // Limite d'effectif
    if (gang.members.size >= gang.maxMembers) return false;

    const newMember: GangMember = {
      playerId,
      playerName: playerName.trim(),
      rank: "recruit",
      joinedAt: Date.now(),
      contributedFunds: 0,
    };

    gang.members.set(playerId, newMember);
    this.notifyUpdate("member_joined", { gangId, playerId, playerName, rank: newMember.rank });
    return true;
  }

  public removeMember(gangId: string, playerId: string): boolean {
    const gang = this.gangs.get(gangId);
    if (!gang || !gang.members.has(playerId)) return false;

    // Empêcher de kick le chef sans passation
    if (gang.leaderId === playerId && gang.members.size > 1) {
      return false;
    }

    gang.members.delete(playerId);
    this.notifyUpdate("member_left", { gangId, playerId });
    return true;
  }

  public setMemberRank(gangId: string, playerId: string, rank: GangRank): boolean {
    const gang = this.gangs.get(gangId);
    if (!gang) return false;

    const member = gang.members.get(playerId);
    if (!member) return false;

    if (rank === "leader") {
      const oldLeader = gang.members.get(gang.leaderId);
      if (oldLeader) oldLeader.rank = "lieutenant";
      gang.leaderId = playerId;
    }

    member.rank = rank;
    this.notifyUpdate("rank_changed", { gangId, playerId, newRank: rank });
    return true;
  }

  public getGangByMember(playerId: string): Gang | undefined {
    for (const gang of this.gangs.values()) {
      if (gang.members.has(playerId)) return gang;
    }
    return undefined;
  }

  // ═══════════════════════════════════════════════════════════
  // ÉCONOMIE & TRÉSORERIE DE GANG
  // ═══════════════════════════════════════════════════════════

  public depositFunds(gangId: string, playerId: string, amount: number): boolean {
    if (amount <= 0) return false;
    const gang = this.gangs.get(gangId);
    if (!gang) return false;

    const member = gang.members.get(playerId);
    if (!member) return false;

    gang.bankBalance += amount;
    member.contributedFunds += amount;
    this.notifyUpdate("funds_deposited", { gangId, playerId, amount, newBalance: gang.bankBalance });
    return true;
  }

  public withdrawFunds(gangId: string, playerId: string, amount: number): boolean {
    if (amount <= 0) return false;
    const gang = this.gangs.get(gangId);
    if (!gang || gang.bankBalance < amount) return false;

    const member = gang.members.get(playerId);
    if (!member || (member.rank !== "leader" && member.rank !== "lieutenant")) {
      return false; // Seuls les officiers peuvent retirer
    }

    gang.bankBalance -= amount;
    this.notifyUpdate("funds_withdrawn", { gangId, playerId, amount, newBalance: gang.bankBalance });
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // CONTRÔLE DE TERRITOIRE & REVENUS ILLÉGAUX
  // ═══════════════════════════════════════════════════════════

  public captureTerritory(gangId: string, territoryId: string): boolean {
    const gang = this.gangs.get(gangId);
    const turf = this.territories.get(territoryId);
    if (!gang || !turf) return false;

    turf.controllingGangId = gangId;
    turf.influencePercent = 100;
    turf.lastContestedAt = Date.now();

    if (!gang.territoryIds.includes(territoryId)) {
      gang.territoryIds.push(territoryId);
    }

    this.notifyUpdate("territory_captured", { gangId, territoryId, territoryName: turf.name });
    return true;
  }

  private startTerritoryIncomeLoop(intervalMs = 60000 * 10): void {
    if (this.territoryIncomeInterval) clearInterval(this.territoryIncomeInterval);

    // Distribution des dividendes de territoires aux caisses de gangs toutes les 10 min
    this.territoryIncomeInterval = setInterval(() => {
      for (const turf of this.territories.values()) {
        if (!turf.controllingGangId) continue;
        const gang = this.gangs.get(turf.controllingGangId);
        if (gang) {
          gang.bankBalance += turf.revenuePerCycle;
          this.notifyUpdate("territory_revenue", {
            gangId: gang.id,
            territoryId: turf.id,
            revenue: turf.revenuePerCycle,
          });
        }
      }
    }, intervalMs);
  }

  // ═══════════════════════════════════════════════════════════
  // API EXTERNE & EVENT BUS
  // ═══════════════════════════════════════════════════════════

  public getGang(gangId: string): Gang | undefined {
    return this.gangs.get(gangId);
  }

  public getAllGangs(): GangDTO[] {
    return Array.from(this.gangs.values()).map((g) => ({
      id: g.id,
      name: g.name,
      tag: g.tag,
      colorHex: g.colorHex,
      leaderId: g.leaderId,
      bankBalance: g.bankBalance,
      memberCount: g.members.size,
      territoryCount: g.territoryIds.length,
      reputation: g.reputation,
      members: Array.from(g.members.values()),
    }));
  }

  public getAllTerritories(): GangTerritory[] {
    return Array.from(this.territories.values());
  }

  public onUpdate(callback: GangUpdateListener): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("[GangSystem] Erreur écouteur update :", err);
      }
    }
  }

  public dispose(): void {
    if (this.territoryIncomeInterval) {
      clearInterval(this.territoryIncomeInterval);
      this.territoryIncomeInterval = null;
    }
    this.updateListeners.clear();
    this.gangs.clear();
    this.territories.clear();
    console.log("🛑 [GangSystem] Système de gangs libéré.");
  }
}

// Instance exportée pour RPEngine
export const gangManager = new GangManager();
