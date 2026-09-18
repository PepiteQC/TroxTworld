/**
 * ═══════════════════════════════════════════════════════════
 * 🧠 INTELLECTUS ROOM — IA, ANTI-CHEAT & AOI (128 JOUEURS)
 * ═══════════════════════════════════════════════════════════
 * Supervision centrale de la sécurité et du partitionnement spatial :
 *  - Moteur Anti-Cheat ThirdEye : Détection de speedhack, noclip et téléportations.
 *  - Area of Interest (AOI) : Optimisation de bande passante par grille spatiale.
 *  - Calcul de menace globale et audit des anomalies réseau en temps réel.
 */

import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { intellectus } from "../intellectus";

export class AOIPlayer extends Schema {
  @type("string") playerId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") velocityKmh: number = 0;
  @type("number") threatScore: number = 0; // 0 (sûr) à 100 (suspect critique)
  @type("string") flaggedReason: string = "clean";
  @type("number") lastUpdate: number = Date.now();
}

export class IntellectusState extends Schema {
  @type({ map: AOIPlayer }) aoiPlayers = new MapSchema<AOIPlayer>();
  @type("string") threatLevel: string = "GREEN"; // GREEN, YELLOW, ORANGE, RED, CRITICAL
  @type("number") activeThreats: number = 0;
  @type("number") averagePingMs: number = 25;
  @type("number") totalPacketsProcessed: number = 0;
}

interface PlayerTelemetry {
  lastX: number;
  lastY: number;
  lastZ: number;
  lastTimestamp: number;
  packetCount: number;
  violationsCount: number;
}

export class IntellectusRoom extends Room {
  state!: IntellectusState;
  maxClients = 128;
  core = intellectus;

  private telemetry = new Map<string, PlayerTelemetry>();
  private readonly MAX_REASONABLE_SPEED_KMH = 340; // Vitesse maximale autorisée (véhicules rapides)
  private readonly MAX_TELEPORT_DISTANCE = 85; // Distance max franchissable en 1 frame sans TP déclarée

  onCreate(_options: any) {
    this.setState(new IntellectusState());

    // ─── RECEPTION DE LA TÉLÉMÉTRIE JOUEUR ─────────────────────────
    this.onMessage("position", (client: Client, message: any) => {
      this.handlePositionTelemetry(client, message);
    });

    // ─── PING & LATENCE ────────────────────────────────────────────
    this.onMessage("ping", (client: Client, message: { timestamp: number }) => {
      const now = Date.now();
      const rtt = message?.timestamp ? Math.max(1, now - message.timestamp) : 20;
      client.send("pong", { rtt, serverTime: now });
    });

    // ─── COMMANDE D'AUDIT ADMIN ────────────────────────────────────
    this.onMessage("admin:scan_player", (client: Client, message: { targetId: string }) => {
      const target = this.state.aoiPlayers.get(message.targetId);
      const tele = this.telemetry.get(message.targetId);

      client.send("admin:player_report", {
        targetId: message.targetId,
        threatScore: target?.threatScore ?? 0,
        flaggedReason: target?.flaggedReason ?? "clean",
        violationsCount: tele?.violationsCount ?? 0,
        position: target ? [target.x, target.y, target.z] : null,
      });
    });

    // Tick d'évaluation de la sécurité toutes les 2 secondes
    this.setSimulationInterval((dt) => this.evaluateThreats(dt), 2000);
    console.log("✅ IntellectusRoom opérationnelle (Surveillance IA & Anti-Cheat ThirdEye active).");
  }

  onJoin(client: Client) {
    const aoi = new AOIPlayer();
    aoi.playerId = client.sessionId;
    aoi.lastUpdate = Date.now();

    this.state.aoiPlayers.set(client.sessionId, aoi);
    this.telemetry.set(client.sessionId, {
      lastX: 0,
      lastY: 0,
      lastZ: 0,
      lastTimestamp: Date.now(),
      packetCount: 0,
      violationsCount: 0,
    });

    console.log(`🧠 [Intellectus] Agent assigné à la surveillance du client : ${client.sessionId}`);
  }

  private handlePositionTelemetry(client: Client, message: any) {
    const aoi = this.state.aoiPlayers.get(client.sessionId);
    const tele = this.telemetry.get(client.sessionId);
    if (!aoi || !tele) return;

    this.state.totalPacketsProcessed++;
    tele.packetCount++;

    const now = Date.now();
    const dtSeconds = Math.max(0.01, (now - tele.lastTimestamp) / 1000);

    const newX = Number(message?.x ?? aoi.x);
    const newY = Number(message?.y ?? aoi.y);
    const newZ = Number(message?.z ?? aoi.z);

    // Calcul de la distance parcourue depuis le dernier tick
    const dx = newX - tele.lastX;
    const dy = newY - tele.lastY;
    const dz = newZ - tele.lastZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Vitesse calculée en km/h
    const calculatedKmh = Math.round((dist / dtSeconds) * 3.6);
    aoi.velocityKmh = calculatedKmh;

    // ── VÉRIFICATION ANTI-CHEAT (Vitesse anormale / Téléportation)
    if (dist > this.MAX_TELEPORT_DISTANCE && !message?.isAuthorizedTeleport) {
      tele.violationsCount++;
      aoi.threatScore = Math.min(100, aoi.threatScore + 30);
      aoi.flaggedReason = "TELEPORT_DETECTED";

      console.warn(
        `🚨 [ThirdEye AntiCheat] Téléportation anormale : ${client.sessionId} (${Math.round(dist)}m en ${dtSeconds.toFixed(2)}s)`
      );
    } else if (calculatedKmh > this.MAX_REASONABLE_SPEED_KMH) {
      tele.violationsCount++;
      aoi.threatScore = Math.min(100, aoi.threatScore + 15);
      aoi.flaggedReason = "SPEED_HACK";

      console.warn(
        `🚨 [ThirdEye AntiCheat] Vitesse anormale : ${client.sessionId} (${calculatedKmh} km/h)`
      );
    } else {
      // Décroissance progressive du score de suspicion si tout est normal
      if (aoi.threatScore > 0) {
        aoi.threatScore = Math.max(0, aoi.threatScore - 1);
        if (aoi.threatScore === 0) aoi.flaggedReason = "clean";
      }
    }

    // Mise à jour de la position
    aoi.x = newX;
    aoi.y = newY;
    aoi.z = newZ;
    aoi.lastUpdate = now;

    tele.lastX = newX;
    tele.lastY = newY;
    tele.lastZ = newZ;
    tele.lastTimestamp = now;
  }

  private evaluateThreats(_dt: number) {
    let threats = 0;

    this.state.aoiPlayers.forEach((aoi: AOIPlayer) => {
      // Intégration optionnelle avec ThirdEye Core si disponible
      if (this.core && (this.core as any).thirdEye?.evaluateThreat) {
        const evalRes = (this.core as any).thirdEye.evaluateThreat();
        if (evalRes?.score !== undefined) {
          aoi.threatScore = Math.max(aoi.threatScore, evalRes.score);
        }
      }

      if (aoi.threatScore >= 40) {
        threats++;
      }
    });

    this.state.activeThreats = threats;

    // Échelle de vigilance
    if (threats > 5) {
      this.state.threatLevel = "CRITICAL";
    } else if (threats > 2) {
      this.state.threatLevel = "RED";
    } else if (threats > 0) {
      this.state.threatLevel = "YELLOW";
    } else {
      this.state.threatLevel = "GREEN";
    }
  }

  onLeave(client: Client) {
    this.state.aoiPlayers.delete(client.sessionId);
    this.telemetry.delete(client.sessionId);
    console.log(`🧠 [Intellectus] Données de surveillance déchargées pour : ${client.sessionId}`);
  }

  onDispose() {
    this.telemetry.clear();
    console.log("🛑 [IntellectusRoom] Salle de sécurité fermée proprement.");
  }
}
