import { Schema, type } from "@colyseus/schema";

export class PropState extends Schema {
  @type("string") id: string = "";
  @type("string") modelPath: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotX: number = 0;
  @type("number") rotY: number = 0;
  @type("number") rotZ: number = 0;
  @type("number") scale: number = 1;
  @type("string") ownerId: string = "";
}
