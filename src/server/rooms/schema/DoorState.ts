import { Schema, type } from "@colyseus/schema";

export class DoorState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "Porte";
  @type("boolean") locked: boolean = true;
  @type("string") ownerRole: string = "civil";
}
