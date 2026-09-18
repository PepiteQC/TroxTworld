import { Schema, type } from "@colyseus/schema";

export class ChatMessageState extends Schema {
  @type("string") id: string = "";
  @type("string") senderId: string = "";
  @type("string") senderName: string = "";
  @type("string") type: string = "local";
  @type("string") text: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") timestamp: number = Date.now();
}
