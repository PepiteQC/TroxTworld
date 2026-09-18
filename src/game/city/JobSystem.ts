/**
 * ═══════════════════════════════════════════════════════════════════
 * 💼 TROXTWORLD / ETHERWORLD — SYSTÈME D'EMPLOIS & TRAVAIL (SERVER)
 * ═══════════════════════════════════════════════════════════════════
 * Gestion des carrières professionnelles, prises de service (shift),
 * calcul des heures prestées, attribution des tâches/missions et paies.
 */

export interface JobGrade {
  grade: number;
  label: string;
  salary: number;
  permissions?: string[];
}

export interface JobTask {
  id: string;
  name: string;
  baseReward: number;
  xpReward: number;
  description: string;
}

export interface JobDef {
  id: string;
  name: string;
  category: "public" | "industrial" | "commercial" | "transport" | "freelance";
  description: string;
  baseSalary: number;
  grades: JobGrade[];
  tasks: JobTask[];
  isWhitelisted?: boolean;
}

export interface Employee {
  playerId: string;
  playerName: string;
  jobId: string;
  grade: number;
  onDuty: boolean;
  shiftStartedAt: number | null;
  totalShiftHours: number;
  completedTasksCount: number;
  totalEarnings: number;
  hiredAt: number;
}

export type JobUpdateListener = (event: Record<string, unknown>) => void;

// ═══════════════════════════════════════════════════════════════════
// CATALOGUE DES EMPLOIS RÉGIONAUX (MRC DE PORTNEUF)
// ═══════════════════════════════════════════════════════════════════

export const PORTNEUF_JOBS: Record<string, JobDef> = {
  // ── Secteur Industriel & Foresterie ──
  papeterie_donnacona: {
    id: "papeterie_donnacona",
    name: "Papeterie de Donnacona",
    category: "industrial",
    description: "Opération des machines à pâte et conditionnement de bobines de papier.",
    baseSalary: 260,
    grades: [
      { grade: 0, label: "Manutentionnaire", salary: 200 },
      { grade: 1, label: "Opérateur Machine", salary: 260 },
      { grade: 2, label: "Chef d'Équipe", salary: 360 },
      { grade: 3, label: "Superviseur d'Usine", salary: 500 },
    ],
    tasks: [
      { id: "task_paper_roll", name: "Charger les bobines de papier", baseReward: 120, xpReward: 15, description: "Empiler et arrimer les rouleaux pour l'expédition." },
      { id: "task_wood_pulp", name: "Contrôler le malaxeur à pâte", baseReward: 160, xpReward: 20, description: "Réguler la pression et la consistance chimique." },
    ],
  },
  scierie_straymond: {
    id: "scierie_straymond",
    name: "Scierie Forestière Saint-Raymond",
    category: "industrial",
    description: "Abattage, ébranchage et débitage du bois des forêts laurentiennes.",
    baseSalary: 280,
    grades: [
      { grade: 0, label: "Bûcheron Apprenti", salary: 220 },
      { grade: 1, label: "Scieur Qualifié", salary: 280 },
      { grade: 2, label: "Contremaître Forestier", salary: 400 },
    ],
    tasks: [
      { id: "task_log_cutting", name: "Débiter les grumes d'épinette", baseReward: 140, xpReward: 18, description: "Couper et écorcer le bois brut." },
      { id: "task_timber_truck", name: "Charger le grumier", baseReward: 210, xpReward: 25, description: "Transférer le bois vers les camions grumiers." },
    ],
  },

  // ── Services & Transports ──
  trox_eats: {
    id: "trox_eats",
    name: "Livreur TroxEats Portneuf",
    category: "transport",
    description: "Livraison rapide de repas chauds et dépanneur à domicile.",
    baseSalary: 160,
    grades: [
      { grade: 0, label: "Coursier Vélo/Scooter", salary: 160 },
      { grade: 1, label: "Livreur Auto Confirmé", salary: 210 },
    ],
    tasks: [
      { id: "task_delivery_poutine", name: "Livrer une commande de casse-croûte", baseReward: 75, xpReward: 10, description: "Prendre la commande et livrer au citoyen dans les délais." },
      { id: "task_delivery_groceries", name: "Livraison de courses Couche-Tard", baseReward: 110, xpReward: 15, description: "Acheminer les provisions d'urgence." },
    ],
  },
  mecanic_bennys: {
    id: "mecanic_bennys",
    name: "Garage & Remorquage Portneuf",
    category: "commercial",
    description: "Entretien mécanique, carrosserie, remorquage sur l'Autoroute 40.",
    baseSalary: 250,
    grades: [
      { grade: 0, label: "Apprenti Dépanneur", salary: 190 },
      { grade: 1, label: "Mécanicien Certifié", salary: 250 },
      { grade: 2, label: "Chef d'Atelier", salary: 380 },
    ],
    tasks: [
      { id: "task_repair_engine", name: "Réparer un moteur endommagé", baseReward: 150, xpReward: 20, description: "Changement de pièces et mise à niveau des fluides." },
      { id: "task_tow_vehicle", name: "Remorquage A-40", baseReward: 230, xpReward: 30, description: "Remorquer un véhicule accidenté jusqu'au garage." },
    ],
  },
  taxi_regional: {
    id: "taxi_regional",
    name: "Taxi Régional Portneuf",
    category: "transport",
    description: "Transport rémunéré de personnes à travers la MRC et vers Québec.",
    baseSalary: 180,
    grades: [
      { grade: 0, label: "Chauffeur", salary: 180 },
      { grade: 1, label: "Chauffeur VIP", salary: 260 },
    ],
    tasks: [
      { id: "task_taxi_fare", name: "Course de taxi urbaine", baseReward: 90, xpReward: 12, description: "Conduire un client en toute sécurité à destination." },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// GESTIONNAIRE D'EMPLOIS (JOB MANAGER)
// ═══════════════════════════════════════════════════════════

export class JobManager {
  private jobs: Map<string, JobDef> = new Map();
  private employees: Map<string, Employee> = new Map();
  private updateListeners: Set<JobUpdateListener> = new Set();

  constructor() {
    this.seedJobs();
    console.log(`💼 [JobSystem] Initialisé avec ${this.jobs.size} carrières professionnelles.`);
  }

  private seedJobs(): void {
    for (const job of Object.values(PORTNEUF_JOBS)) {
      this.jobs.set(job.id, job);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GESTION DES EMPLOYÉS & EMBAUCHES
  // ═══════════════════════════════════════════════════════════

  public hireEmployee(playerId: string, playerName: string, jobId: string, grade = 0): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Si déjà employé quelque part, on refuse l'embauche directe sans démission
    if (this.employees.has(playerId)) return false;

    const validGrade = Math.max(0, Math.min(grade, job.grades.length - 1));

    const employee: Employee = {
      playerId,
      playerName: playerName.trim(),
      jobId,
      grade: validGrade,
      onDuty: false,
      shiftStartedAt: null,
      totalShiftHours: 0,
      completedTasksCount: 0,
      totalEarnings: 0,
      hiredAt: Date.now(),
    };

    this.employees.set(playerId, employee);
    this.notifyUpdate("employee_hired", {
      playerId,
      playerName,
      jobId,
      jobName: job.name,
      grade: validGrade,
      salary: job.grades[validGrade]?.salary ?? job.baseSalary,
    });

    return true;
  }

  public fireEmployee(playerId: string): boolean {
    const emp = this.employees.get(playerId);
    if (!emp) return false;

    if (emp.onDuty) {
      this.endShift(playerId);
    }

    const jobId = emp.jobId;
    this.employees.delete(playerId);
    this.notifyUpdate("employee_fired", { playerId, jobId });
    return true;
  }

  public getEmployee(playerId: string): Employee | undefined {
    return this.employees.get(playerId);
  }

  public setGrade(playerId: string, grade: number): boolean {
    const emp = this.employees.get(playerId);
    if (!emp) return false;

    const job = this.jobs.get(emp.jobId);
    if (!job || grade < 0 || grade >= job.grades.length) return false;

    emp.grade = grade;
    this.notifyUpdate("grade_updated", { playerId, jobId: emp.jobId, grade, gradeLabel: job.grades[grade]!.label });
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // SERVICE & POINTAGE DES HEURES (SHIFT)
  // ═══════════════════════════════════════════════════════════

  public startShift(playerId: string): boolean {
    const emp = this.employees.get(playerId);
    if (!emp || emp.onDuty) return false;

    emp.onDuty = true;
    emp.shiftStartedAt = Date.now();
    this.notifyUpdate("shift_started", { playerId, jobId: emp.jobId });
    return true;
  }

  public endShift(playerId: string): number {
    const emp = this.employees.get(playerId);
    if (!emp || !emp.onDuty || !emp.shiftStartedAt) return 0;

    const durationMs = Date.now() - emp.shiftStartedAt;
    const hours = Math.round((durationMs / 3600000) * 100) / 100;

    emp.onDuty = false;
    emp.shiftStartedAt = null;
    emp.totalShiftHours += hours;

    this.notifyUpdate("shift_ended", { playerId, jobId: emp.jobId, hours });
    return hours;
  }

  // ═══════════════════════════════════════════════════════════
  // EXÉCUTION DE TÂCHES & GAINS
  // ═══════════════════════════════════════════════════════════

  public completeTask(playerId: string, taskId: string): number {
    const emp = this.employees.get(playerId);
    if (!emp) return 0;

    const job = this.jobs.get(emp.jobId);
    if (!job) return 0;

    const task = job.tasks.find((t) => t.id === taskId);
    if (!task) return 0;

    // Bonus multiplicateur selon le grade
    const gradeMultiplier = 1.0 + emp.grade * 0.15;
    const finalReward = Math.round(task.baseReward * gradeMultiplier);

    emp.completedTasksCount += 1;
    emp.totalEarnings += finalReward;

    this.notifyUpdate("task_completed", {
      playerId,
      jobId: emp.jobId,
      taskId,
      taskName: task.name,
      reward: finalReward,
      xp: task.xpReward,
    });

    return finalReward;
  }

  // ═══════════════════════════════════════════════════════════
  // REQUÊTES & EVENT BUS
  // ═══════════════════════════════════════════════════════════

  public getJob(jobId: string): JobDef | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): JobDef[] {
    return Array.from(this.jobs.values());
  }

  public getAllEmployees(): Employee[] {
    return Array.from(this.employees.values());
  }

  public onUpdate(callback: JobUpdateListener): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("[JobSystem] Erreur listener update :", err);
      }
    }
  }

  public dispose(): void {
    this.updateListeners.clear();
    this.employees.clear();
    console.log("🛑 [JobSystem] Système d'emplois libéré proprement.");
  }
}

// Instance globale singleton exportée
export const jobManager = new JobManager();
