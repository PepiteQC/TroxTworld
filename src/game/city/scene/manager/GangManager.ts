// ═══════════════════════════════════════════════════════════════════════════
//  GANG SYSTEM v3.0 — GANGS, GRADES RP & CONQUÊTES DE TERRITOIRES
//  src/game/gangs/GangManager.ts
//  Persistance SQLite (Lotus) · Économie de territoires · Guerres de Turfs
// ═══════════════════════════════════════════════════════════════════════════

import { intellectus } from '../../intellectus';

export type GangRole = 'leader' | 'officer' | 'muscle' | 'dealer' | 'soldier' | 'recruit';
export type GangActivityType = 'drug_trafficking' | 'theft' | 'robbery' | 'extortion' | 'smuggling' | 'protection';
export type TurfStatus = 'controlled' | 'contested' | 'lost' | 'neutral';

export interface GangMember {
  playerId: string;
  playerName: string;
  role: GangRole;
  joinedDate: number;
  reputation: number; // 0-100
  kills: number;
  arrests: number;
  bounty: number;
  isOnline: boolean;
  lastSeen: number;
  respect: number; // Points de respect
  wealth: number;
}

export interface Territory {
  territoryId: string;
  name: string;
  description: string;
  center: { x: number; y: number; z: number };
  radius: number;
  controlledBy?: string; // gangId
  status: TurfStatus;
  income: number; // Revenu généré par heure ($)
  population: number;
  lastAttack?: number;
  defenderCount: number;
  attackerCount: number;
}

export interface GangActivity {
  activityId: string;
  type: GangActivityType;
  description: string;
  location: { x: number; y: number; z: number };
  reward: number;
  risk: number; // 0-100 (pourcentage de chance d'arrestation SQ)
  duration: number; // en minutes
  maxParticipants: number;
  currentParticipants: number;
  initiator: string; // playerId
  status: 'available' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
}

export interface Gang {
  gangId: string;
  name: string;
  color: string;
  description: string;
  territory: Territory[];
  treasury: number;
  reputation: number; // 0 à 1000
  membersCount: number;
  maxMembers: number;
  leader: string; // playerId du chef
  founded: number;
  symbol?: string;
  enemyGangs: string[]; // gangIds
  alliedGangs: string[]; // gangIds
  currentActivities: GangActivity[];
  wars: Array<{
    enemyGangId: string;
    startDate: number;
    killsFor: number;
    killsAgainst: number;
    status: 'active' | 'ended';
  }>;
  level: number; // 1 à 10
  perks: string[]; // Atouts débloqués
}

// ─────────────────────────────────────────────────────────────────────────
//  CLASS GANG MANAGER (AUTORITAIRE SERVEUR)
// ─────────────────────────────────────────────────────────────────────────

export class GangManager {
  private updateListener: ((data: any) => void) | null = null;
  private economyInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeDefaultGangs();
    this.startEconomySystem();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SEED DES GANGS PAR DÉFAUT (Pour les quartiers de Portneuf)
  // ─────────────────────────────────────────────────────────────────────────

  private initializeDefaultGangs() {
    // Si des gangs existent déjà en mémoire, on ne ré-exécute pas le seed
    const existingGangs = intellectus.memory.values('gangs') || [];
    if (existingGangs.length > 0) return;

    const defaultGangs: Gang[] = [
      {
        gangId: 'GANG_LEOPARDS_NOIRS',
        name: '🔴 Les Léopards Noirs',
        color: '#dc2626',
        description: 'Organisation criminelle de motards basée près de la scierie',
        territory: [],
        treasury: 50000,
        reputation: 800,
        membersCount: 0,
        maxMembers: 50,
        leader: 'system',
        founded: Date.now(),
        symbol: '🔴',
        enemyGangs: ['GANG_VIPERS_TECH'],
        alliedGangs: [],
        currentActivities: [],
        wars: [],
        level: 5,
        perks: ['discount_weapons', 'safe_houses'],
      },
      {
        gangId: 'GANG_VIPERS_TECH',
        name: '🔵 Les Vipers Tech',
        color: '#06b6d4',
        description: 'Secteur de contrebande électronique et piratage',
        territory: [],
        treasury: 35000,
        reputation: 600,
        membersCount: 0,
        maxMembers: 40,
        leader: 'system',
        founded: Date.now(),
        symbol: '🔵',
        enemyGangs: ['GANG_LEOPARDS_NOIRS'],
        alliedGangs: [],
        currentActivities: [],
        wars: [],
        level: 4,
        perks: ['street_knowledge'],
      },
    ];

    defaultGangs.forEach((gang) => {
      intellectus.memory.set('gangs', gang.gangId, gang, true);
    });

    // Seed des territoires par défaut
    this.initializeDefaultTerritories();

    console.log(`💀 [GangManager] ${defaultGangs.length} familles criminelles de départ implantées.`);
  }

  private initializeDefaultTerritories() {
    const defaultTerritories: Territory[] = [
      {
        territoryId: 'turf_scierie_portneuf',
        name: '🪵 Secteur Bois de la Scierie',
        description: 'Zone de transit forestière pour le bois et la contrebande',
        center: { x: -1600, y: 1.0, z: -900 },
        radius: 80,
        controlledBy: 'GANG_LEOPARDS_NOIRS',
        status: 'controlled',
        income: 360, // Rapporte 360$ / heure
        population: 150,
        defenderCount: 0,
        attackerCount: 0,
      },
      {
        territoryId: 'turf_carriere_calc',
        name: '⛏️ Mine & Carrière de Saint-Marc',
        description: 'Territoire de minage et de recel de métaux précieux',
        center: { x: 2800, y: 1.0, z: 10 },
        radius: 120,
        status: 'neutral',
        income: 600, // Rapporte 600$ / heure
        population: 50,
        defenderCount: 0,
        attackerCount: 0,
      },
    ];

    defaultTerritories.forEach((t) => {
      intellectus.memory.set('territories', t.territoryId, t, true);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CRÉATION ET RECRUTEMENT RP DE GANG (DRIZZLE SYNCED)
  // ─────────────────────────────────────────────────────────────────────────

  public createGang(
    name: string,
    color: string,
    leaderId: string,
    leaderName: string
  ): Gang | null {
    const gangId = `GANG-${Date.now().toString(36).toUpperCase()}`;

    // Vérifie si le joueur n'est pas déjà dans un gang
    const existingPlayer = intellectus.memory.get<any>('players', leaderId);
    if (existingPlayer?.gang && existingPlayer.gang !== 'Aucun') {
      console.warn(`[GangManager] Création annulée : ${leaderName} est déjà dans un gang.`);
      return null;
    }

    const gang: Gang = {
      gangId,
      name,
      color,
      description: `Gang officiel de ${name}`,
      territory: [],
      treasury: 10000, // Dotation de départ de la trésorerie de gang
      reputation: 10,
      membersCount: 1,
      maxMembers: 20,
      leader: leaderId,
      founded: Date.now(),
      symbol: '👊',
      enemyGangs: [],
      alliedGangs: [],
      currentActivities: [],
      wars: [],
      level: 1,
      perks: [],
    };

    const leaderMember: GangMember = {
      playerId: leaderId,
      playerName: leaderName,
      role: 'leader',
      joinedDate: Date.now(),
      reputation: 100,
      kills: 0,
      arrests: 0,
      bounty: 0,
      isOnline: true,
      lastSeen: Date.now(),
      respect: 100,
      wealth: 0,
    };

    // 1. Sauvegarde du gang
    intellectus.memory.set('gangs', gangId, gang, true);

    // 2. Sauvegarde du lien membre
    intellectus.memory.set('gang_members', leaderId, { gangId, member: leaderMember }, true);

    // 3. Mise à jour de la session active du joueur (RAM + DB)
    if (existingPlayer) {
      existingPlayer.gang = name;
      existingPlayer.gangId = gangId;
      existingPlayer.gangRank = 'leader';
      intellectus.memory.set('players', leaderId, existingPlayer, true);
    }

    this.onUpdate?.({ type: 'gang_created', gangId });
    return gang;
  }

  public recruitMember(gangId: string, playerId: string, playerName: string): boolean {
    const gang = intellectus.memory.get<Gang>('gangs', gangId);
    if (!gang) return false;

    if (gang.membersCount >= gang.maxMembers) return false;

    // S'assurer que le joueur n'est pas déjà dans un gang
    const isMember = intellectus.memory.get<any>('gang_members', playerId);
    if (isMember) return false;

    const member: GangMember = {
      playerId,
      playerName,
      role: 'recruit',
      joinedDate: Date.now(),
      reputation: 0,
      kills: 0,
      arrests: 0,
      bounty: 0,
      isOnline: true,
      lastSeen: Date.now(),
      respect: 10,
      wealth: 0,
    };

    // 1. Enregistrer le membre
    intellectus.memory.set('gang_members', playerId, { gangId, member }, true);

    // 2. Mettre à jour le nombre de membres
    gang.membersCount++;
    intellectus.memory.set('gangs', gangId, gang, true);

    // 3. Mettre à jour la session active du joueur recruté
    const player = intellectus.memory.get<any>('players', playerId);
    if (player) {
      player.gang = gang.name;
      player.gangId = gangId;
      player.gangRank = 'recruit';
      intellectus.memory.set('players', playerId, player, true);
    }

    this.onUpdate?.({ type: 'member_recruited', gangId, playerId });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. HIÉRARCHIE & PROMOTIONS RP (PROMOTE / KICK)
  // ─────────────────────────────────────────────────────────────────────────

  public promoteMember(gangId: string, playerId: string, newRole: GangRole): boolean {
    const memberData = intellectus.memory.get<any>('gang_members', playerId);
    if (!memberData || memberData.gangId !== gangId) return false;

    const roles: GangRole[] = ['recruit', 'soldier', 'muscle', 'dealer', 'officer', 'leader'];
    const currentIndex = roles.indexOf(memberData.member.role);
    const newIndex = roles.indexOf(newRole);

    if (newIndex <= currentIndex) return false; // Impossible de rétrograder avec promote

    memberData.member.role = newRole;
    memberData.member.respect += 35; // Gain de respect

    intellectus.memory.set('gang_members', playerId, memberData, true);

    // Sync session
    const player = intellectus.memory.get<any>('players', playerId);
    if (player) {
      player.gangRank = newRole;
      intellectus.memory.set('players', playerId, player, true);
    }

    this.onUpdate?.({ type: 'member_promoted', gangId, playerId, role: newRole });
    return true;
  }

  public kickMember(gangId: string, playerId: string): boolean {
    const memberData = intellectus.memory.get<any>('gang_members', playerId);
    if (!memberData || memberData.gangId !== gangId) return false;

    const gang = intellectus.memory.get<Gang>('gangs', gangId);
    if (gang) {
      gang.membersCount = Math.max(0, gang.membersCount - 1);
      intellectus.memory.set('gangs', gangId, gang, true);
    }

    // Retrait des registres de gang
    intellectus.memory.delete('gang_members', playerId);

    // Remise à zéro de la session du joueur
    const player = intellectus.memory.get<any>('players', playerId);
    if (player) {
      player.gang = 'Aucun';
      player.gangId = '';
      player.gangRank = '';
      intellectus.memory.set('players', playerId, player, true);
    }

    this.onUpdate?.({ type: 'member_kicked', gangId, playerId });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CONQUÊTE DE TERRITOIRES & WAR SYSTEM SÉCURISÉ (MOMENTUS COMPATIBLE)
  // ─────────────────────────────────────────────────────────────────────────

  public startTurfWar(attackerGangId: string, defenderTerritoryId: string): boolean {
    const territory = intellectus.memory.get<Territory>('territories', defenderTerritoryId);
    if (!territory) return false;

    const attackerGang = intellectus.memory.get<Gang>('gangs', attackerGangId);
    if (!attackerGang) return false;

    territory.status = 'contested';
    territory.attackerCount = 1;
    territory.defenderCount = 0;
    territory.lastAttack = Date.now();

    intellectus.memory.set('territories', defenderTerritoryId, territory, true);

    console.log(`⚔️  [TurfWar] Les ${attackerGang.name} attaquent le secteur : ${territory.name}`);
    this.onUpdate?.({ type: 'turf_war_started', attackerGangId, territoryId: defenderTerritoryId });
    return true;
  }

  /**
   * ⚡ Système de revenus et d'activités automatiques (Exécuté toutes les 10 secondes)
   */
  private startEconomySystem() {
    this.economyInterval = setInterval(() => {
      const allGangs = intellectus.memory.values<Gang>('gangs') || [];
      const allTerritories = intellectus.memory.values<Territory>('territories') || [];

      allGangs.forEach((gang) => {
        let hourlyIncome = 0;

        // 1. Calcul du revenu de tous les territoires contrôlés par ce gang
        allTerritories.forEach((terr) => {
          if (terr.controlledBy === gang.gangId && terr.status === 'controlled') {
            hourlyIncome += terr.income;
          }
        });

        // ⚡ Fraction exacte : Revenu pour 10 secondes = (revenu_horaire / 3600 secondes) * 10 secondes
        const fractionIncome = Math.round((hourlyIncome / 3600) * 10);
        if (fractionIncome > 0) {
          gang.treasury += fractionIncome;
        }

        // 2. Progression de la réputation de gang par les activités actives
        if (gang.currentActivities && gang.currentActivities.length > 0) {
          gang.reputation += gang.currentActivities.length * 0.3;
        }

        // 3. Montée de niveau automatique de gang (reputation points)
        const expectedLevel = Math.min(10, Math.floor(gang.reputation / 150) + 1);
        if (expectedLevel > gang.level) {
          gang.level = expectedLevel;
          gang.maxMembers += 5; // Augmentation des slots de recrutement
          console.log(`⬆️  [GangLevel] ${gang.name} grimpe au niveau : ${gang.level} !`);
        }

        // Sauvegarde de l'état asynchrone léger (RAM)
        intellectus.memory.set('gangs', gang.gangId, gang, false);
      });
    }, 10000); // Ticks toutes les 10 secondes
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ACCESSEURS DRIZZLE SÉCURISÉS
  // ─────────────────────────────────────────────────────────────────────────

  public getGang(gangId: string): Gang | undefined {
    return intellectus.memory.get<Gang>('gangs', gangId);
  }

  public getPlayerGang(playerId: string): Gang | undefined {
    const data = intellectus.memory.get<any>('gang_members', playerId);
    if (!data) return undefined;
    return this.getGang(data.gangId);
  }

  public getMember(playerId: string): GangMember | undefined {
    return intellectus.memory.get<any>('gang_members', playerId)?.member;
  }

  public getAllGangs(): Gang[] {
    const list = intellectus.memory.values<Gang>('gangs') || [];
    return list.sort((a, b) => b.reputation - a.reputation);
  }

  public getGangMembers(gangId: string): GangMember[] {
    const all = intellectus.memory.values<any>('gang_members') || [];
    return all.filter((m) => m.gangId === gangId).map((m) => m.member);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. ALLIANCES, PACTES ET RIVALITÉS EN LIGNE
  // ─────────────────────────────────────────────────────────────────────────

  public createAlliance(gangId1: string, gangId2: string): boolean {
    const gang1 = this.getGang(gangId1);
    const gang2 = this.getGang(gangId2);

    if (!gang1 || !gang2) return false;

    // Ajout mutuel
    if (!gang1.alliedGangs.includes(gangId2)) gang1.alliedGangs.push(gangId2);
    if (!gang2.alliedGangs.includes(gangId1)) gang2.alliedGangs.push(gangId1);

    intellectus.memory.set('gangs', gangId1, gang1, true);
    intellectus.memory.set('gangs', gangId2, gang2, true);

    this.onUpdate?.({ type: 'alliance_formed', gang1Id: gangId1, gang2Id: gangId2 });
    return true;
  }

  public declareWar(attackerGangId: string, defenderGangId: string): boolean {
    const attacker = this.getGang(attackerGangId);
    const defender = this.getGang(defenderGangId);

    if (!attacker || !defender) return false;

    // Déclaration de guerre officielle
    attacker.wars.push({
      enemyGangId: defenderGangId,
      startDate: Date.now(),
      killsFor: 0,
      killsAgainst: 0,
      status: 'active',
    });

    if (!attacker.enemyGangs.includes(defenderGangId)) attacker.enemyGangs.push(defenderGangId);
    if (!defender.enemyGangs.includes(attackerGangId)) defender.enemyGangs.push(attackerGangId);

    intellectus.memory.set('gangs', attackerGangId, attacker, true);
    intellectus.memory.set('gangs', defenderGangId, defender, true);

    this.onUpdate?.({ type: 'war_declared', attackerId: attackerGangId, defenderId: defenderGangId });
    return true;
  }

  public recordKill(killerGangId: string, victimGangId: string): void {
    const killerGang = this.getGang(killerGangId);
    if (!killerGang) return;

    const war = killerGang.wars.find((w) => w.enemyGangId === victimGangId && w.status === 'active');
    if (war) {
      war.killsFor++;
      killerGang.reputation = Math.min(1000, killerGang.reputation + 15); // Gain de réputation
      intellectus.memory.set('gangs', killerGangId, killerGang, true);
    }
  }

  public registerListener(callback: (data: any) => void) {
    this.updateListener = callback;
  }

  public dispose() {
    if (this.economyInterval) {
      clearInterval(this.economyInterval);
      this.economyInterval = null;
    }
  }
}

export const gangManager = new GangManager();