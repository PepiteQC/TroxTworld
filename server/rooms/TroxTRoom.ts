/**
 * ═══════════════════════════════════════════════════════════
 * TROXT ROOM — Salle Colyseus principale (128 joueurs)
 * ═══════════════════════════════════════════════════════════
 */

import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { intellectus } from "../intellectus";

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
  @type("string") job = "civil";
  @type("string") vehicle = "";
  @type("number") speed = 0;
}

export class TroxtState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") weather = "clear";
  @type("number") timeOfDay = 12;
  @type("number") ambientTemp = 8.5;
}

export class TroxTRoom extends Room {
  state!: TroxtState; // Typage explicite et compatible
  maxClients = 128;
  core = intellectus;

  onCreate(_options: any) {
    this.setState(new TroxtState());

    this.onMessage("move", (client: Client, message: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.x = Number(message.x ?? player.x);
      player.y = Number(message.y ?? player.y);
      player.z = Number(message.z ?? player.z);
      player.yaw = Number(message.yaw ?? player.yaw);
      player.speed = Number(message.speed ?? 0);
    });

    this.onMessage("action", (client: Client, message: any) => {
      this.handleAction(client, message);
    });

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

    this.setSimulationInterval((dt) => this.simulate(dt), 50);
    console.log("✅ TroxTRoom créée (128 slots)");
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    const player = new PlayerState();
    player.name = String(options?.name ?? "Citoyen");
    player.x = Number(options?.x ?? 0);
    player.z = Number(options?.z ?? 0);
    this.state.players.set(client.sessionId, player);
    console.log(`[TroxTRoom] Joueur connecté : ${player.name} (${client.sessionId})`);
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
    console.log(`[TroxTRoom] Joueur déconnecté : ${client.sessionId}`);
  }

  onDispose() {
    console.log("[TroxTRoom] Salle fermée.");
  }
}
