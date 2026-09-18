// src/admin/AdminLogger.ts
// ETHERWORLD RP — TroxTetherworld Platinum Admin Logging Service

export type LogSeverity = "info" | "warning" | "danger" | "critical";

export interface AdminLogEntry {
  id: string;
  timestamp: number;
  adminId: string;
  adminName: string;
  action: string;
  severity?: LogSeverity;
  targetId?: string;
  targetName?: string;
  details?: string;
  metadata?: Record<string, any>;
}

class AdminLogService {
  private logs: AdminLogEntry[] = [];
  private maxLogs = 500;
  private listeners: ((log: AdminLogEntry) => void)[] = [];
  private storageKey = "troxt_admin_logs_v1";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs.slice(0, 200)));
    } catch {
      // ignore storage errors
    }
  }

  public log(entry: Omit<AdminLogEntry, "id" | "timestamp">): AdminLogEntry {
    const fullLog: AdminLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      severity: entry.severity || "info",
    };

    this.logs.unshift(fullLog);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.saveToStorage();

    console.log(`🛡️ [ADMIN LOG] [${fullLog.adminName}] -> ${fullLog.action} (${fullLog.details || "aucun détail"})`);
    
    this.listeners.forEach((fn) => {
      try {
        fn(fullLog);
      } catch (err) {
        console.error("Error in admin log listener:", err);
      }
    });

    return fullLog;
  }

  public getLogs(limit = 100, severityFilter?: LogSeverity): AdminLogEntry[] {
    if (severityFilter) {
      return this.logs.filter(l => l.severity === severityFilter).slice(0, limit);
    }
    return this.logs.slice(0, limit);
  }

  public clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }

  public exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public exportAsCSV(): string {
    const headers = ["ID", "Timestamp", "AdminName", "Action", "Severity", "TargetName", "Details"];
    const rows = this.logs.map(l => [
      l.id,
      new Date(l.timestamp).toISOString(),
      `"${l.adminName.replace(/"/g, '""')}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      l.severity || "info",
      `"${(l.targetName || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  }

  public subscribe(listener: (log: AdminLogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const AdminLogger = new AdminLogService();
