import { Schema, type } from "@colyseus/schema";

export class ZoneState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "Zone";
  @type("string") type: string = "safezone";
  @type("number") x: number = 0;
  @type("number") z: number = 0;
  @type("number") radius: number = 50;
}
