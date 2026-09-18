import { Schema, type } from "@colyseus/schema";

export class ItemState extends Schema {
  @type("string") id: string = "";
  @type("string") itemId: string = "";
  @type("string") name: string = "Objet";
  @type("number") quantity: number = 1;
  @type("string") type: string = "consumable";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("string") ownerId: string = "";
}
