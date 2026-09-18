/**
 * ═══════════════════════════════════════════════════════════════════
 * 🚓 TROXTWORLD / ETHERWORLD — FORCES DE L'ORDRE & SERVICES D'URGENCE
 * ═══════════════════════════════════════════════════════════════════
 * Gestion de la Sûreté du Québec (SQ), Urgences Santé / EMS,
 * Pompiers, matricules officiels, statut de patrouille et Dispatch 911.
 */

export type FactionType = "police" | "ems" | "fire" | "coroner" | "justice";

export interface FactionRank {
  grade: number;
  label: string;
  salary: number;
  callsignPrefix?: string;
  canHire?: boolean;
  canPromote?: boolean;
}

export interface Faction {
  id: string;
  name: string;
  shortName: string;
  type: FactionType;
  badgePrefix: string;
  hqLocation: [number, number, number];
  ranks: FactionRank[];
  colorHex: string;
}

export interface Officer {
  badgeNumber: string;
  playerId: string;
  playerName: string;
  factionId: string;
  factionType: FactionType;
  grade: number;
  rankTitle: string;
  onDuty: boolean;
  dutyStartedAt: number | null;
  patrolVehicleId: string | null;
  arrestsCount: number;
  medicalInterventionsCount: number;
  recruitedAt: number;
}

export interface DispatchCall {
  id: string;
  callerName: string;
  callerPhone?: string;
  code: string; // Ex: "10-71" (Coups de feu), "10-50" (Accident)
  category: FactionType;
  description: string;
  position: [number, number, number];
  zoneName?: string;
  status: "pending" | "responding" | "resolved" | "cancelled";
  respondingOfficers: string[];
  createdAt: number;
  resolvedAt?: number;
}

export type LawUpdateListener = (event: Record<string, unknown>) => void;

// ═══════════════════════════════════════════════════════════════════
// DÉFINITION DES FACTIONS OFFICIELLES (PORTNEUF & ÉTHERWORLD)
// ═══════════════════════════════════════════════════════════════════

export const REGIONAL_FACTIONS: Record<string, Faction> = {
  sq_portneuf: {
    id: "sq_portneuf",
    name: "Sûreté du Québec — MRC de Portneuf",
    shortName: "SQ",
    type: "police",
    badgePrefix: "SQ-",
    hqLocation: [-1160, 15, 1020], // Donnacona
    colorHex: "#1a5276",
    ranks: [
      { grade: 0, label: "Cadet / Aspirant", salary: 280, canHire: false, canPromote: false },
      { grade: 1, label: "Agent de patrouille", salary: 380, canHire: false, canPromote: false },
      { grade: 2, label: "Enquêteur / Sergent", salary: 500, canHire: false, canPromote: false },
      { grade: 3, label: "Lieutenant de poste", salary: 650, canHire: true, canPromote: true },
      { grade: 4, label: "Capitaine / Directeur", salary: 850, canHire: true, canPromote: true },
    ],
  },
  ems_portneuf: {
    id: "ems_portneuf",
    name: "Paramédics & Urgences Médicales Portneuf",
    shortName: "EMS",
    type: "ems",
    badgePrefix: "MED-",
    hqLocation: [80, 24, -1060], // CH Saint-Raymond
    colorHex: "#e74c3c",
    ranks: [
      { grade: 0, label: "Stagiaire Paramédic", salary: 260 },
      { grade: 1, label: "Paramédic Soins Primaires", salary: 360 },
      { grade: 2, label: "Paramédic Soins Avancés", salary: 480 },
      { grade: 3, label: "Coordonnateur Clinique", salary: 620, canHire: true, canPromote: true },
    ],
  },
  fire_portneuf: {
    id: "fire_portneuf",
    name: "Service de Sécurité Incendie Régional",
    shortName: "SSIRP",
    type: "fire",
    badgePrefix: "SSI-",
    hqLocation: [-50, 18, 120], // Pont-Rouge
    colorHex: "#d35400",
    ranks: [
      { grade: 0, label: "Pompier Auxiliaire", salary: 240 },
      { grade: 1, label: "Pompier Qualifié", salary: 340 },
      { grade: 2, label: "Lieutenant aux opérations", salary: 460 },
      { grade: 3, label: "Chef de Brigade", salary: 600, canHire: true, canPromote: true },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════
// GESTIONNAIRE CENTRAL DES FORCES DE L'ORDRE
// ═══════════════════════════════════════════════════════════════════

export class LawEnforcementManager {
  private factions: Map<string, Faction> = new Map();
  private officers: Map<string, Officer> = new Map();
  private dispatchCalls: Map<string, DispatchCall> = new Map();
  private updateListeners: Set<LawUpdateListener> = new Set();
  private badgeCounter = 100;

  constructor() {
    this.seedFactions();
    console.log(`🚓 [LawEnforcementSystem] Initialisé avec ${this.factions.size} factions de sécurité publique.`);
  }

  private seedFactions(): void {
    for (const f of Object.values(REGIONAL_FACTIONS)) {
      this.factions.set(f.id, f);
    }
  }

  public recruitOfficer(
    factionId: string,
    playerId: string,
    playerName: string,
    type: FactionType = "police",
    grade = 0
  ): Officer | null {
    const faction = this.factions.get(factionId);
    if (!faction) return null;

    if (this.officers.has(playerId)) return null;

    const rankInfo = faction.ranks[grade] || faction.ranks[0];
    const badgeNumber = `${faction.badgePrefix}${++this.badgeCounter}`;

    const officer: Officer = {
      badgeNumber,
      playerId,
      playerName: playerName.trim(),
      factionId,
      factionType: type,
      grade: rankInfo?.grade ?? 0,
      rankTitle: rankInfo?.label ?? "Recrue",
      onDuty: false,
      dutyStartedAt: null,
      patrolVehicleId: null,
      arrestsCount: 0,
      medicalInterventionsCount: 0,
      recruitedAt: Date.now(),
    };

    this.officers.set(playerId, officer);
    this.notifyUpdate("officer_recruited", {
      playerId,
      playerName,
      badgeNumber,
      factionId,
      rankTitle: officer.rankTitle,
    });

    return officer;
  }

  public removeOfficer(playerId: string): boolean {
    const officer = this.officers.get(playerId);
    if (!officer) return false;

    this.officers.delete(playerId);
    this.notifyUpdate("officer_removed", { playerId, badgeNumber: officer.badgeNumber, factionId: officer.factionId });
    return true;
  }

  public getOfficer(playerId: string): Officer | undefined {
    return this.officers.get(playerId);
  }

  public setOfficerDuty(playerId: string, onDuty: boolean): boolean {
    const officer = this.officers.get(playerId);
    if (!officer) return false;

    officer.onDuty = onDuty;
    officer.dutyStartedAt = onDuty ? Date.now() : null;

    this.notifyUpdate("duty_changed", {
      playerId,
      badgeNumber: officer.badgeNumber,
      onDuty,
      factionId: officer.factionId,
    });

    return true;
  }

  public createDispatchCall(
    callerName: string,
    code: string,
    category: FactionType,
    description: string,
    position: [number, number, number],
    callerPhone?: string,
    zoneName?: string
  ): DispatchCall {
    const callId = `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const call: DispatchCall = {
      id: callId,
      callerName,
      callerPhone,
      code,
      category,
      description,
      position,
      zoneName,
      status: "pending",
      respondingOfficers: [],
      createdAt: Date.now(),
    };

    this.dispatchCalls.set(callId, call);
    this.notifyUpdate("dispatch_call_created", { call });
    return call;
  }

  public assignOfficerToCall(callId: string, playerId: string): boolean {
    const call = this.dispatchCalls.get(callId);
    const officer = this.officers.get(playerId);
    if (!call || !officer || !officer.onDuty) return false;

    if (!call.respondingOfficers.includes(playerId)) {
      call.respondingOfficers.push(playerId);
      call.status = "responding";
      this.notifyUpdate("dispatch_call_assigned", { callId, playerId, badge: officer.badgeNumber });
    }

    return true;
  }

  public clearDispatchCall(callId: string): boolean {
    const call = this.dispatchCalls.get(callId);
    if (!call) return false;

    call.status = "resolved";
    call.resolvedAt = Date.now();
    this.notifyUpdate("dispatch_call_resolved", { callId });
    return true;
  }

  public getFaction(factionId: string): Faction | undefined {
    return this.factions.get(factionId);
  }

  public getAllFactions(): Faction[] {
    return Array.from(this.factions.values());
  }

  public getAllOfficers(onDutyOnly = false): Officer[] {
    const all = Array.from(this.officers.values());
    return onDutyOnly ? all.filter((o) => o.onDuty) : all;
  }

  public getActiveCalls(category?: FactionType): DispatchCall[] {
    const active = Array.from(this.dispatchCalls.values()).filter(
      (c) => c.status === "pending" || c.status === "responding"
    );
    return category ? active.filter((c) => c.category === category) : active;
  }

  public onUpdate(callback: LawUpdateListener): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("[LawEnforcementSystem] Erreur listener :", err);
      }
    }
  }

  public dispose(): void {
    this.updateListeners.clear();
    this.officers.clear();
    this.dispatchCalls.clear();
    console.log("🛑 [LawEnforcementSystem] Système des forces de l'ordre libéré.");
  }
}

export const lawEnforcementManager = new LawEnforcementManager();
