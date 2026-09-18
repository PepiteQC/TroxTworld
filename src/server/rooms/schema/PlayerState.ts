import { Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") username: string = "";
  @type("string") job: string = "Civil";
  @type("string") aura: string = "none";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotation: number = 0;
  @type("string") animation: string = "idle";
  @type("number") health: number = 100;
  @type("number") maxHealth: number = 100;
  @type("number") cash: number = 500;
  @type("number") bank: number = 2500;
  @type("string") vehicleId: string = "";
  @type("string") role: string = "player";
  @type("boolean") isFrozen: boolean = false;
  @type("boolean") isMuted: boolean = false;
  @type("number") ping: number = 0;
}
