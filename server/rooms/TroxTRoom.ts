/**
 * ═══════════════════════════════════════════════════════════
 * 🎮 TROXT ROOM — SALLE COLYSEUS PRINCIPALE (128 JOUEURS)
 * ═══════════════════════════════════════════════════════════
 * Orchestration en temps réel : synchronisation de l'économie,
 * du zonage géographique autoritaire (Portneuf Geo) et du
 * moteur RP central (EtherWorld Engine).
 */

import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { intellectus } from "../intellectus";

// Moteurs RP et Géographique autoritaires du serveur
import { rpEngine } from "../systems/RPEngine";
import { bankingManager } from "../systems/BankingSystem";
import { zoneSystem } from "../../src/game/zones";

export class PlayerState extends Schema {
  @type("string") name = "Citoyen";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 0;
  @type("number") yaw = 0;
  @type("number") health = 100;
  @type("number") cash = 250;
  @type("number") bank = 2500;
  @type("number") wanted = 0;
  @type("string") job = "unemployed";
  @type("string") vehicle = "";
  @type("number") speed = 0;
  @type("string") currentZoneId = "";
}

export class TroxtState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") weather = "clear";
  @type("number") timeOfDay = 12;
  @type("number") ambientTemp = 8.5;
}

export class TroxTRoom extends Room {
  state!: TroxtState;
  maxClients = 128;
  core = intellectus;

  // Références d'abonnements pour éviter les fuites mémoire
  private zoneEnterUnsub?: () => void;
  private zoneExitUnsub?: () => void;
  private zoneViolationUnsub?: () => void;

  onCreate(_options: any) {
    this.setState(new TroxtState());

    // ─── HANDLER DE MOUVEMENT & GÉOLOCALISATION AUTORITAIRE ─────────────────
    this.onMessage("move", (client: Client, message: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Mise à jour de la position dans le State Colyseus
      player.x = Number(message.x ?? player.x);
      player.y = Number(message.y ?? player.y);
      player.z = Number(message.z ?? player.z);
      player.yaw = Number(message.yaw ?? player.yaw);
      player.speed = Number(message.speed ?? 0);

      // Met à jour la position dans le gestionnaire spatial (zoneSystem)
      zoneSystem.updatePlayerPosition(client.sessionId, player.x, player.z, player.y);

      // Émet la position sur le bus global pour les autres services SQ, Radar, etc.
      if (this.core && typeof this.core.emit === "function") {
        this.core.emit("player:position", client.sessionId, [player.x, player.y, player.z]);
      }

      // Optionnel : Contrôle de vitesse autoritaire SQ sur le serveur
      const limit = zoneSystem.getSpeedLimit(player.x, player.z);
      if (player.speed > limit + 25) {
        // Enregistre automatiquement une violation d'excès de vitesse sur le serveur
        zoneSystem.recordViolation(client.sessionId, player.x, player.z, "speed", "fine", 150);
      }
    });

    // ─── ACTIONS DISPATCH (Moteur RP intellectus) ───────────────────────────
    this.onMessage("action", (client: Client, message: any) => {
      this.handleAction(client, message);
    });

    // ─── CHAT GÉOLOCALISÉ (PROXIMITÉ) ───────────────────────────────────────
    this.onMessage("chat", (client: Client, message: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      this.broadcast("chat", {
        sender: player.name,
        text: String(message.text ?? "").slice(0, 200),
        x: player.x,
        z: player.z,
      });
    });

    // ─── LISTENERS DU SYSTÈME DE ZONES (PORTNEUF GEO) ───────────────────────
    this.setupGeographyListeners();

    this.setSimulationInterval((dt) => this.simulate(dt), 50);
    console.log("✅ TroxTRoom créée avec succès et synchronisée avec le RPEngine & ZoneSystem.");
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    const player = new PlayerState();
    player.name = String(options?.name ?? "Citoyen");
    player.x = Number(options?.x ?? 0);
    player.y = Number(options?.y ?? 18);
    player.z = Number(options?.z ?? 0);

    // ─── COUPLAGE AVEC LE MOTEUR CENTRAL (ETHERWORLD RPEngine) ─────────────
    const profile = rpEngine.createPlayer(client.sessionId, player.name);

    // Initialisation et récupération du compte Desjardins
    const bankAcc = bankingManager.getAccountByOwner(client.sessionId);
    player.bank = bankAcc ? bankAcc.balance : 2500;
    player.cash = 250;
    player.job = profile.jobId ?? "unemployed";
    player.wanted = profile.wantedStars;

    this.state.players.set(client.sessionId, player);

    // Notification globale
    console.log(`[TroxTRoom] ${player.name} (${client.sessionId}) a rejoint Portneuf. Profil RP synchronisé.`);
  }

  private setupGeographyListeners() {
    // onEnterZone : Envoi d'une notification UI enrichie dès que le joueur traverse un rang/municipalité
    this.zoneEnterUnsub = zoneSystem.onEnterZone((event) => {
      const client = this.clients.find((c) => c.sessionId === event.playerId);
      const playerState = this.state.players.get(event.playerId);
      
      if (playerState) {
        playerState.currentZoneId = event.zone.id;
      }

      if (client) {
        client.send("rp:notification:zone", {
          type: "enter",
          zoneId: event.zone.id,
          zoneName: event.zone.name,
          speedLimit: event.zone.rules.speedLimit,
          isSafeZone: event.zone.rules.isSafeZone,
          message: `Vous entrez dans la zone : ${event.zone.name}`,
        });
      }
    });

    // onViolation : Envoi d'un constat d'infraction SQ ou d'un avertissement
    this.zoneViolationUnsub = zoneSystem.onViolation((violation) => {
      const client = this.clients.find((c) => c.sessionId === violation.playerId);
      if (client) {
        client.send("rp:notification:ticket", {
          id: violation.id,
          title: "Sûreté du Québec · Constat d'infraction",
          type: violation.severity,
          description: violation.description,
          fine: violation.fine,
        });
      }
    });
  }

  private async handleAction(client: Client, message: any) {
    const action = String(message?.action ?? "");
    const payload = message?.payload ?? {};

    const res = await this.core.dispatch(action, payload, {
      actorId: client.sessionId,
      playerId: client.sessionId,
    });

    client.send("action_result", { action, ...res });
  }

  private simulate(dt: number) {
    this.state.timeOfDay = (this.state.timeOfDay + dt * 0.001) % 24;
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    rpEngine.removePlayer(client.sessionId);
    console.log(`[TroxTRoom] Citoyen déconnecté : ${client.sessionId}. Profil déchargé du RPEngine.`);
  }

  onDispose() {
    // Nettoyage des abonnements pour éviter les fuites de mémoire
    if (this.zoneEnterUnsub) this.zoneEnterUnsub();
    if (this.zoneExitUnsub) this.zoneExitUnsub();
    if (this.zoneViolationUnsub) this.zoneViolationUnsub();

    console.log("[TroxTRoom] Salle libérée proprement.");
  }
}
