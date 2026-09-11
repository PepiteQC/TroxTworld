import {
  buildCamion,
  buildDeplaceige,
  buildFourgon,
  buildMotorcycle,
  buildPickup,
  buildPolice,
  buildRemorqueuse,
  buildSedan,
} from "./architecture";
import { buildCouch } from "./couch";
import { buildCivic, buildJetta, buildLada, buildLambo } from "./cars";
import type { FirmType } from "./business";
import type { Group } from "three";

export type VehicleId =
  | "pickup"
  | "sedan"
  | "sq"
  | "moto"
  | "fourgon"
  | "camion"
  | "deplaceige"
  | "remorqueuse"
  | "divan"
  | "lambo"
  | "lada"
  | "jetta"
  | "civic";

export interface FleetEntry {
  id: VehicleId;
  name: string;
  hint: string;
  price: number;
  maxSpeed: number;
  accel: number;
  grip: number;
  mass: number;
  caisse: boolean;
  pro: boolean;
  forFirm?: FirmType[];
  build: () => Group;
}

export const FLEET: FleetEntry[] = [
  {
    id: "pickup",
    name: "Pick-up 138",
    hint: "Caisse, rangs, A-40",
    price: 0,
    maxSpeed: 39,
    accel: 16,
    grip: 1,
    mass: 1,
    caisse: true,
    pro: false,
    build: () => buildPickup(0x2f4a38),
  },
  {
    id: "sedan",
    name: "Berline Cap-Santé",
    hint: "Chemin du Roy",
    price: 8500,
    maxSpeed: 42,
    accel: 18,
    grip: 1.05,
    mass: 0.9,
    caisse: false,
    pro: false,
    build: () => buildSedan(0x6a2a28),
  },
  {
    id: "sq",
    name: "Intercepteur SQ",
    hint: "Ancienne patrouille",
    price: 14200,
    maxSpeed: 46,
    accel: 20.5,
    grip: 1.12,
    mass: 1,
    caisse: false,
    pro: false,
    build: () => buildPolice(),
  },
  {
    id: "moto",
    name: "Moto des rangs",
    hint: "Légère, nerveuse",
    price: 4200,
    maxSpeed: 48,
    accel: 24,
    grip: 0.72,
    mass: 0.45,
    caisse: false,
    pro: false,
    build: () => buildMotorcycle(0x6a2018),
  },
  {
    id: "fourgon",
    name: "Fourgonnette Gosselin",
    hint: "Livraison café · dépanneur",
    price: 2400,
    maxSpeed: 34,
    accel: 12,
    grip: 0.95,
    mass: 1.55,
    caisse: true,
    pro: true,
    forFirm: ["cafe", "depanneur", "restaurant", "bar"],
    build: () => buildFourgon(0x4a5a68),
  },
  {
    id: "camion",
    name: "Camion porte-conteneur",
    hint: "Fret A-40, inscription SAAQ",
    price: 4800,
    maxSpeed: 31,
    accel: 9.5,
    grip: 0.92,
    mass: 2.4,
    caisse: true,
    pro: true,
    forFirm: ["transport"],
    build: () => buildCamion(0xc4a030),
  },
  {
    id: "deplaceige",
    name: "Pick-up déneigeur",
    hint: "Lame avant, contrats d'hiver",
    price: 1900,
    maxSpeed: 32,
    accel: 11,
    grip: 1.08,
    mass: 1.35,
    caisse: true,
    pro: true,
    forFirm: ["deneigement"],
    build: () => buildDeplaceige(),
  },
  {
    id: "remorqueuse",
    name: "Remorqueuse du garage",
    hint: "Crochet, boom, gyrophares",
    price: 3200,
    maxSpeed: 33,
    accel: 11.5,
    grip: 1.02,
    mass: 1.5,
    caisse: true,
    pro: true,
    forFirm: ["garage", "construction"],
    build: () => buildRemorqueuse(),
  },
  {
    id: "divan",
    name: "Divan à moteur",
    hint: "Tondeuse, deux places, 310 kg",
    price: 900,
    maxSpeed: 22,
    accel: 9.5,
    grip: 0.68,
    mass: 0.55,
    caisse: false,
    pro: false,
    build: () => buildCouch(0),
  },
  {
    id: "lambo",
    name: "Centenario LP-770",
    hint: "Lamborghini, A-40 seulement",
    price: 770000,
    maxSpeed: 62,
    accel: 34,
    grip: 1.22,
    mass: 0.82,
    caisse: false,
    pro: false,
    build: () => buildLambo(),
  },
  {
    id: "lada",
    name: "Lada 2107",
    hint: "Rangs, hiver, fiable",
    price: 2400,
    maxSpeed: 34,
    accel: 11,
    grip: 0.86,
    mass: 0.95,
    caisse: false,
    pro: false,
    build: () => buildLada(),
  },
  {
    id: "jetta",
    name: "Jetta GLI",
    hint: "Berline allemande, 138",
    price: 18500,
    maxSpeed: 48,
    accel: 21,
    grip: 1.1,
    mass: 0.92,
    caisse: false,
    pro: false,
    build: () => buildJetta(),
  },
  {
    id: "civic",
    name: "Civic MB-A",
    hint: "Honda, plaque MB-A, 138",
    price: 26800,
    maxSpeed: 47,
    accel: 20.5,
    grip: 1.08,
    mass: 0.9,
    caisse: false,
    pro: false,
    build: () => buildCivic(),
  },
];

export function isVehicleId(id: string): id is VehicleId {
  return FLEET.some((v) => v.id === id);
}

export function fleetById(id: string): FleetEntry {
  return FLEET.find((v) => v.id === id) ?? FLEET[0]!;
}

export function hasCaisse(id: string): boolean {
  return fleetById(id).caisse;
}

export function persoFleet(): FleetEntry[] {
  return FLEET.filter((v) => !v.pro);
}

export function proFleet(): FleetEntry[] {
  return FLEET.filter((v) => v.pro);
}
