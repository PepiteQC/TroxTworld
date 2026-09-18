import { Schema, type } from "@colyseus/schema";

export class RadioState extends Schema {
  @type("string") stationId: string = "ckoi_969";
  @type("string") stationName: string = "CKOI 96.9 FM";
  @type("number") serverStartTime: number = Date.now();
  @type("number") volume: number = 0.8;
  @type("boolean") isMuted: boolean = false;
  @type("string") lastChangedBy: string = "Serveur";
}
