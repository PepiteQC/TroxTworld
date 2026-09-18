// server/intellectus/intellectusEngine.ts
// ETHERWORLD RP — TroxTetherworld Platinum Core Server Intellectus Engine

import type { ThreatAssessment, ThreatLevel, ThirdEyeAlert } from './types';
import { ArcadiusBusServer } from './bus/ArcadiusBusServer';

export class ServerIntellectusEngine {
  public bus: ArcadiusBusServer;
  private startTime: number;
  private eventsProcessed = 0;
  private threatLevel: ThreatLevel = 'GREEN';
  private alerts: ThirdEyeAlert[] = [];
  private lockedUsers: Map<string, { until: number; reason: string }> = new Map();

  constructor() {
    this.bus = new ArcadiusBusServer();
    this.startTime = Date.now();
    this.setupListeners();
  }

  private setupListeners() {
    this.bus.on('*', (evt) => {
      this.eventsProcessed++;
      if (evt.priority === 'critical') {
        this.addThirdEyeAlert({
          severity: 'RED',
          source: evt.source || 'Bus',
          message: `Événement critique détecté: ${evt.type}`,
          metadata: evt.payload,
        });
      }
    });
  }

  public evaluateThreat(_contextData: any = {}): ThreatAssessment {
    const alertCount = this.alerts.length;
    let score = 10 + alertCount * 5;
    let level: ThreatLevel = 'GREEN';
    const triggers: string[] = [];

    if (alertCount > 10 || this.lockedUsers.size > 5) {
      score = 85;
      level = 'RED';
      triggers.push('Anomalie réseau sévère', 'Verrouillages multiples actifs');
    } else if (alertCount > 5) {
      score = 55;
      level = 'ORANGE';
      triggers.push('Volume d\'alertes élevé');
    } else if (alertCount > 2) {
      score = 30;
      level = 'YELLOW';
      triggers.push('Alertes mineures enregistrées');
    }

    this.threatLevel = level;

    return {
      level,
      reason: triggers.length > 0 ? triggers.join(', ') : 'Réseau stable et surveillé par Intellectus',
      score: Math.min(100, score),
      triggers,
      timestamp: Date.now(),
    };
  }

  public addThirdEyeAlert(alert: Omit<ThirdEyeAlert, 'id' | 'timestamp'>): ThirdEyeAlert {
    const fullAlert: ThirdEyeAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };

    this.alerts.unshift(fullAlert);
    if (this.alerts.length > 100) this.alerts.pop();

    this.bus.emit('thirdEye:alert', fullAlert, 'high', 'ThirdEye');
    return fullAlert;
  }

  public isUserLockedOut(userId: string): boolean {
    const lockout = this.lockedUsers.get(userId);
    if (!lockout) return false;
    if (Date.now() > lockout.until) {
      this.lockedUsers.delete(userId);
      return false;
    }
    return true;
  }

  public lockoutUser(userId: string, durationMinutes: number, reason: string): void {
    const until = Date.now() + durationMinutes * 60 * 1000;
    this.lockedUsers.set(userId, { until, reason });
    this.addThirdEyeAlert({
      severity: 'ORANGE',
      source: 'SecurityContracts',
      message: `Utilisateur ${userId} bloqué pour ${durationMinutes}m (${reason})`,
    });
  }

  public getStatus() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: 'active',
      uptime,
      threatAssessment: this.evaluateThreat(),
      eventsProcessed: this.eventsProcessed,
      activeRules: 18,
      activeLockoutsCount: this.lockedUsers.size,
      alertsCount: this.alerts.length,
    };
  }
}
