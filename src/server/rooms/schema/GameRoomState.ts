import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { VehicleState } from "./VehicleState";
import { ChatMessageState } from "./ChatMessageState";
import { RadioState } from "./RadioState";
import { ItemState } from "./ItemState";
import { PropState } from "./PropState";
import { DoorState } from "./DoorState";
import { ZoneState } from "./ZoneState";

export {
  PlayerState,
  VehicleState,
  ChatMessageState,
  RadioState,
  ItemState,
  PropState,
  DoorState,
  ZoneState,
};

export class GameRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: VehicleState }) vehicles = new MapSchema<VehicleState>();
  @type([ ChatMessageState ]) chatMessages = new ArraySchema<ChatMessageState>();
  @type({ map: ItemState }) items = new MapSchema<ItemState>();
  @type({ map: PropState }) props = new MapSchema<PropState>();
  @type({ map: DoorState }) doors = new MapSchema<DoorState>();
  @type({ map: ZoneState }) zones = new MapSchema<ZoneState>();
  @type("number") timeOfDay: number = 14.0;
  @type("string") weather: string = "clear";
  @type(RadioState) globalRadio = new RadioState();
}
