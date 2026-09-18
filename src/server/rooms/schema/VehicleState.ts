import { Schema, type } from "@colyseus/schema";

export class VehicleState extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "supercar";
  @type("string") name: string = "Supercar TroxT GT";
  @type("string") plate: string = "TROXT-01";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotation: number = 0;
  @type("number") speed: number = 0;
  @type("number") health: number = 100;
  @type("boolean") locked: boolean = false;
  @type("string") driverId: string = "";
  @type("boolean") siren: boolean = false;
  @type("boolean") headlights: boolean = true;
  @type("string") radioStation: string = "ckoi_969";
}
