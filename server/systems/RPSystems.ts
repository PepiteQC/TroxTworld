/**
 * ═══════════════════════════════════════════════════════════════════
 * 🏙️ TROXTWORLD — SYSTÈMES ROLEPLAY SERVEUR (RP SYSTEMS)
 * ═══════════════════════════════════════════════════════════════════
 */

export interface RPPlayer {
  id: string;
  name: string;
  job: string;
  jobGrade?: number;
  aura: string;
  position: [number, number, number];
  rotation?: number;
  health?: number;
  maxHealth?: number;
  armor?: number;
  wanted?: number;
  cash?: number;
  bank?: number;
  gang?: string;
  salary?: number;
  isCuffed?: boolean;
  isDead?: boolean;
  jailTimeSeconds?: number;
}

export interface RPProperty {
  id: string;
  name: string;
  ownerId?: string;
  price: number;
  locked: boolean;
  rentPrice?: number;
  entryPos?: [number, number, number];
}

export interface RPJobConfig {
  id: string;
  label: string;
  baseSalary: number;
  isWhitelisted?: boolean;
  grades?: { grade: number; label: string; salary: number }[];
}

export const RP_JOBS: Record<string, RPJobConfig> = {
  unemployed: { id: "unemployed", label: "Sans Emploi", baseSalary: 50 },
  police: {
    id: "police",
    label: "LSPD / Police",
    baseSalary: 350,
    isWhitelisted: true,
    grades: [
      { grade: 0, label: "Cadet", salary: 250 },
      { grade: 1, label: "Officier", salary: 350 },
      { grade: 2, label: "Sergent", salary: 450 },
      { grade: 3, label: "Capitaine", salary: 600 },
    ],
  },
  medic: {
    id: "medic",
    label: "EMS / Ambulancier",
    baseSalary: 320,
    isWhitelisted: true,
    grades: [
      { grade: 0, label: "Stagiaire", salary: 220 },
      { grade: 1, label: "Ambulancier", salary: 320 },
      { grade: 2, label: "Médecin Chef", salary: 500 },
    ],
  },
  taxi: { id: "taxi", label: "Chauffeur de Taxi", baseSalary: 180 },
  mechanic: { id: "mechanic", label: "Mécano Benny's", baseSalary: 220 },
  delivery: { id: "delivery", label: "Livreur TroxEats", baseSalary: 160 },
  realtor: { id: "realtor", label: "Agent Immobilier", baseSalary: 280 },
};

export class RPServerManager {
  private core: any;
  private salaryInterval: any = null;
  private properties: Map<string, RPProperty> = new Map();

  constructor(core: any) {
    this.core = core;
    this.initSalaryLoop();
    this.registerEvents();
  }

  private initSalaryLoop(intervalMs = 60000 * 7) {
    if (this.salaryInterval) clearInterval(this.salaryInterval);

    this.salaryInterval = setInterval(() => {
      this.distributeSalaries();
    }, intervalMs);
  }

  public distributeSalaries() {
    if (!this.core || !this.core.players) return;

    for (const [playerId, player] of this.core.players.entries()) {
      const rpPlayer = player as RPPlayer;
      if (!rpPlayer || rpPlayer.isDead || (rpPlayer.jailTimeSeconds ?? 0) > 0) continue;

      const jobConfig = RP_JOBS[rpPlayer.job] || RP_JOBS["unemployed"];
      let salaryAmount = rpPlayer.salary ?? jobConfig.baseSalary;

      if (rpPlayer.jobGrade !== undefined && jobConfig.grades) {
        const gradeInfo = jobConfig.grades.find((g) => g.grade === rpPlayer.jobGrade);
        if (gradeInfo) salaryAmount = gradeInfo.salary;
      }

      rpPlayer.bank = (rpPlayer.bank ?? 0) + salaryAmount;

      if (this.core.emitToPlayer) {
        this.core.emitToPlayer(playerId, "rp:notify", {
          title: "Banque TroxT",
          message: `Paye reçue (${jobConfig.label}): +$${salaryAmount}`,
          type: "success",
        });
        this.core.emitToPlayer(playerId, "rp:sync:economy", {
          cash: rpPlayer.cash ?? 0,
          bank: rpPlayer.bank,
        });
      }
    }
  }

  private registerEvents() {
    if (!this.core || !this.core.on) return;

    this.core.on("rp:setJob", (playerId: string, data: { job: string; grade?: number }) => {
      const player = this.core.players?.get(playerId) as RPPlayer | undefined;
      if (!player) return;

      const job = RP_JOBS[data.job] ? data.job : "unemployed";
      player.job = job;
      player.jobGrade = data.grade ?? 0;
      player.salary = RP_JOBS[job].baseSalary;

      this.core.emitToPlayer?.(playerId, "rp:sync:job", {
        job: player.job,
        jobLabel: RP_JOBS[job].label,
        grade: player.jobGrade,
      });
    });

    this.core.on("rp:bank:deposit", (playerId: string, amount: number) => {
      const p = this.core.players?.get(playerId) as RPPlayer | undefined;
      if (!p || (p.cash ?? 0) < amount || amount <= 0) return;

      p.cash = (p.cash ?? 0) - amount;
      p.bank = (p.bank ?? 0) + amount;
      this.syncPlayerEco(playerId, p);
    });

    this.core.on("rp:bank:withdraw", (playerId: string, amount: number) => {
      const p = this.core.players?.get(playerId) as RPPlayer | undefined;
      if (!p || (p.bank ?? 0) < amount || amount <= 0) return;

      p.bank = (p.bank ?? 0) - amount;
      p.cash = (p.cash ?? 0) + amount;
      this.syncPlayerEco(playerId, p);
    });

    this.core.on("rp:property:buy", (playerId: string, propertyId: string) => {
      const p = this.core.players?.get(playerId) as RPPlayer | undefined;
      const prop = this.properties.get(propertyId);
      if (!p || !prop || prop.ownerId) return;

      if ((p.bank ?? 0) >= prop.price) {
        p.bank = (p.bank ?? 0) - prop.price;
        prop.ownerId = playerId;
        prop.locked = false;
        this.syncPlayerEco(playerId, p);
        this.core.broadcast?.("rp:property:updated", prop);
      }
    });

    this.core.on("rp:property:toggleLock", (playerId: string, propertyId: string) => {
      const prop = this.properties.get(propertyId);
      if (!prop || prop.ownerId !== playerId) return;

      prop.locked = !prop.locked;
      this.core.broadcast?.("rp:property:updated", prop);
    });

    this.core.on("rp:police:cuff", (officerId: string, targetId: string) => {
      const officer = this.core.players?.get(officerId) as RPPlayer | undefined;
      const target = this.core.players?.get(targetId) as RPPlayer | undefined;

      if (!officer || officer.job !== "police" || !target) return;

      target.isCuffed = !(target.isCuffed ?? false);
      this.core.emitToPlayer?.(targetId, "rp:police:cuffedState", { isCuffed: target.isCuffed });
    });

    this.core.on("rp:medic:revive", (medicId: string, targetId: string) => {
      const medic = this.core.players?.get(medicId) as RPPlayer | undefined;
      const target = this.core.players?.get(targetId) as RPPlayer | undefined;

      if (!medic || (medic.job !== "medic" && medic.job !== "police") || !target) return;

      target.isDead = false;
      target.health = Math.floor((target.maxHealth ?? 100) * 0.5);
      this.core.emitToPlayer?.(targetId, "rp:player:revived", { health: target.health });
    });
  }

  private syncPlayerEco(playerId: string, p: RPPlayer) {
    this.core.emitToPlayer?.(playerId, "rp:sync:economy", {
      cash: p.cash ?? 0,
      bank: p.bank ?? 0,
    });
  }

  public registerProperty(prop: RPProperty) {
    this.properties.set(prop.id, prop);
  }

  public getProperties(): RPProperty[] {
    return Array.from(this.properties.values());
  }

  public destroy() {
    if (this.salaryInterval) {
      clearInterval(this.salaryInterval);
      this.salaryInterval = null;
    }
  }
}

export function registerRPSystems(core: any): RPServerManager {
  return new RPServerManager(core);
}
