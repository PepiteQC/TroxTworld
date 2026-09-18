export type AccessorySlot = "hat" | "weapon" | "back" | "item";

export type Accessory = {
  id: string;
  slot: AccessorySlot;
  modelPath: string;      // ex: "/models/synty/Weapon_Sword.glb"
  scale?: [number, number, number];
  offset?: [number, number, number];
  rotation?: [number, number, number];
};

export type NetworkPlayerState = {
  id: string;
  name?: string;
  firstName?: string;
  skin?: number;
  topColor?: number;
  pantsColor?: number;
  // position & rotation venant du serveur
  position: [number, number, number];
  rotationY: number;
  // accessoires
  accessories?: Accessory[];
  // est-ce le joueur local ?
  isLocal?: boolean;
};
