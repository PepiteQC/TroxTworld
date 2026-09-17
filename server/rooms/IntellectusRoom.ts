/**
 * ═══════════════════════════════════════════════════════════
 * INTELLECTUS ROOM — IA, Anti-Cheat & AOI 128 joueurs
 * ═══════════════════════════════════════════════════════════
 */

import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { intellectus } from "../intellectus";

export class AOIPlayer extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") threatScore = 0;
}

export class IntellectusState extends Schema {
  @type({ map: AOIPlayer }) aoiPlayers = new MapSchema<AOIPlayer>();
  @type("string") threatLevel = "GREEN";
  @type("number") activeThreats = 0;
}

export class IntellectusRoom extends Room {
  state!: IntellectusState; // Typage explicite et compatible
  maxClients = 128;
  core = intellectus;

  onCreate(_options: any) {
    this.setState(new IntellectusState());

    this.onMessage("position", (client: Client, message: any) => {
      const aoi = this.state.aoiPlayers.get(client.sessionId);
      if (!aoi) return;
      aoi.x = Number(message?.x ?? 0);
      aoi.z = Number(message?.z ?? 0);
    });

    this.setSimulationInterval((dt) => this.evaluateThreats(dt), 2000);
    console.log("✅ IntellectusRoom créée (AOI & Anti-Cheat)");
  }

  onJoin(client: Client) {
    const aoi = new AOIPlayer();
    this.state.aoiPlayers.set(client.sessionId, aoi);
  }

  private evaluateThreats(_dt: number) {
    let threats = 0;
    this.state.aoiPlayers.forEach((aoi: AOIPlayer) => {
      const eval_ = this.core.thirdEye.evaluateThreat();
      aoi.threatScore = eval_.score;
      if (eval_.score > 50) threats++;
    });

    this.state.activeThreats = threats;
    this.state.threatLevel = threats > 5 ? "RED" : threats > 2 ? "ORANGE" : threats > 0 ? "YELLOW" : "GREEN";
  }

  onLeave(client: Client) {
    this.state.aoiPlayers.delete(client.sessionId);
  }

  onDispose() {}
}
