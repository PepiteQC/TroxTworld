import { buildSqdcInterior as createSqdcInterior } from "./sqdc";
import { buildBathroom } from "../../bathroom";
import * as THREE from "three";
import { matLib, QC_PALETTE } from "../../materials";
import { tex } from "./architecture/materiaux/textures";
import type { InteriorKind } from "./city";
import { buildHotelTvSetup, type HotelTvSetup } from "../hotel/hotelTv";
import { buildBoutiqueInterior, type BoutiqueGarment } from "../../boutique";
import { buildDepanneurInterior, type DepAisleHot } from "../../depanneur";
import {
  baseboard,
  ceilingLight,
  chandelier,
  coffeeTable,
  corridorBench,
  doorFrame,
  elevatorPlate,
  hallDoor,
  kingBed,
  lightPanel,
  lobbyPlant,
  loungeChair,
  nightstand,
  persianRug,
  receptionBell,
  receptionDesk,
  velvetCurtain,
  wallArt,
  brickFireplace,
  drapeCurtain,
  woolSofa,
} from "../hotel/luxury";
import { mountLoft } from "../hotel/loft";
import { buildBathSink, buildFridge, buildKitchenSink, buildMinibar, buildStove, buildToilet, buildWasher } from "./architecture/materiaux/props3d";
import { buildWorkbench, hasReno, type DoorSlot, type HouseState } from "../maison/house";
import {
  buildFurnace,
  buildHydroPanel,
  buildPlinthRow,
  buildWaterHeater,
  buildWoodStove,
  heatById,
  heatWorks,
  setHeatGlow,
} from "../../utilities";

export interface WallBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface InteriorRoom {
  kind: InteriorKind;
  group: THREE.Group;
  spawn: THREE.Vector3;
  spawnYaw: number;
  exit: THREE.Vector3;
  walls: WallBox[];
  title: string;
  subtitle: string;
  tvSetup?: HotelTvSetup;
  garments?: BoutiqueGarment[];
  caisse?: { x: number; z: number };
  bell?: { x: number; z: number };
  elevator?: { x: number; z: number };
vaultSpot?: { x: number; z: number };
  lightSwitch?: { x: number; z: number };
  sits?: { x: number; z: number; yaw: number }[];
  rooms?: { x: number; z: number; to: "hotel" | "apartment"; label: string; locked?: boolean }[];
  minibar?: { x: number; z: number };
  desk?: { x: number; z: number };
  workbench?: { x: number; z: number };
  basement?: { x: number; z: number };
  heater?: { x: number; z: number };
  panel?: { x: number; z: number };
  homeDoors?: Array<{ slot: DoorSlot; x: number; z: number }>;
  aisles?: DepAisleHot[];
  atmSpot?: { x: number; z: number };
  backRoom?: { x: number; z: number };
}

export const INTERIOR_ORIGIN = { x: 80, y: 540, z: -2200 };

function wall(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: number | THREE.Material = 0x2c2c3a,
) {
  const mat = typeof color === "number" ? matLib.get(color, 0.9) : color;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.castShadow = false;
  return m;
}

function furniture(w: number, h: number, d: number, x: number, y: number, z: number, color: number, metal = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLib.get(color, 0.75, metal));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function lamp(x: number, y: number, z: number, color: number, intensity: number, dist: number) {
  const g = new THREE.Group();
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    matLib.getEmissive(color, color, 1.1),
  );
  bulb.position.set(x, y, z);
  g.add(bulb);
  const light = new THREE.PointLight(color, intensity, dist, 2);
  light.position.set(x, y, z);
  g.add(light);
  return g;
}

function buildHotelInterior(): InteriorRoom {
  // --- SALLE DE BAIN COMPLÈTE AJOUTÉE ---
  const sdb = buildBathroom();
  sdb.scale.setScalar(0.75);
  sdb.position.set(2.6, 0, -1.8);
  sdb.rotation.y = -Math.PI / 2;
  const g = new THREE.Group();
  g.name = "interieur_hotel";
  const W = 12;
  const D = 14;
  const H = 3.15;
  const walls: WallBox[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("parquet", 4, 4.5, 0.38, 0.04));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("plafond", 2.2, 2.4, 0.92));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  const mur = tex.mat("murNuit", 2.4, 1.2, 0.88);
  g.add(wall(W, H, 0.22, 0, H / 2, -D / 2, mur));
  g.add(wall(W, H, 0.22, 0, H / 2, D / 2, mur));
  g.add(wall(0.22, H, D, -W / 2, H / 2, 0, mur));
  g.add(wall(0.22, H, D, W / 2, H / 2, 0, mur));
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.16, maxZ: -D / 2 + 0.16 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.16, maxZ: D / 2 + 0.16 });
  walls.push({ minX: -W / 2 - 0.16, maxX: -W / 2 + 0.16, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.16, maxX: W / 2 + 0.16, minZ: -D / 2, maxZ: D / 2 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.08, 0.04), matLib.get(0x111827, 0.7));
  base.position.set(0, 0.04, -D / 2 + 0.14);
  g.add(base);

  g.add(persianRug(2.9, -3.4, 3.6, 3.4));
  g.add(kingBed(2.9, -3.6));
  g.add(nightstand(1.55, -4.55));
  g.add(nightstand(4.25, -4.55));

  g.add(persianRug(-3.2, 0.4, 3.4, 3.6));
  g.add(woolSofa(-3.2, -1.15, 0));
  g.add(coffeeTable(-3.2, 0.5));
  g.add(loungeChair(-3.2, 1.7, Math.PI));

  const tvSetup = buildHotelTvSetup(-1.05, 1.8, H);
  g.add(tvSetup.tvGroup);
  g.add(tvSetup.lampGroup);
  tvSetup.windowGroup.position.set(W / 2 - 0.12, 1.55, -2.2);
  g.add(tvSetup.windowGroup);
  g.add(tvSetup.screenLight);
  g.add(tvSetup.tvInteract);

  g.add(velvetCurtain(W / 2 - 0.18, -2.2, Math.PI / 2, 3.4, 2.8));
  g.add(wallArt(-W / 2 + 0.14, 1.85, 1.2, Math.PI / 2));
  g.add(wallArt(0.2, 2.05, -D / 2 + 0.14, 0));
  g.add(chandelier(0, H - 0.28, -1.2));
  g.add(chandelier(-3.1, H - 0.28, 0.4));

  g.add(wall(2.6, H, 0.16, -4.4, H / 2, -4.6, 0x1f2937));
  g.add(wall(0.16, H, 2.8, -3.1, H / 2, -5.9, 0x1f2937));
  walls.push({ minX: -5.7, maxX: -3.1, minZ: -4.7, maxZ: -4.5 });
  walls.push({ minX: -3.2, maxX: -3.0, minZ: -7.3, maxZ: -4.5 });
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), matLib.get(0x374151, 0.35, 0.2));
  tile.rotation.x = -Math.PI / 2;
  tile.position.set(-4.45, 0.02, -5.85);
  g.add(tile);
  const bathToilet = buildToilet();
  bathToilet.position.set(-3.55, 0, -6.55);
  g.add(bathToilet);
  const bathSink = buildBathSink();
  bathSink.position.set(-4.55, 0, -6.55);
  g.add(bathSink);
  const mini = buildMinibar();
  mini.position.set(4.6, 0, 5.4);
  g.add(mini);

  g.add(elevatorPlate(-2.2, 1.15, D / 2 - 0.14));
  g.add(doorFrame(0, D / 2 - 0.12, 0));
  const exitPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 2.25, 0.08),
    matLib.getEmissive(0xd4a853, 0xd4a853, 0.28),
  );
  exitPlate.position.set(0, 1.15, D / 2 - 0.14);
  g.add(exitPlate);

  g.add(ceilingLight(0, H - 0.08, 2.2, 1.5));
  g.add(ceilingLight(2.9, H - 0.08, -3.2, 1.2));
  g.add(ceilingLight(-3.1, H - 0.08, 0.4, 1.1));
  g.add(baseboard(0, D / 2 - 0.14, W - 0.4));
  g.add(baseboard(0, -D / 2 + 0.14, W - 0.4));

  return {
    kind: "hotel",
    group: g,
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.2),
    spawnYaw: 0,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.7),
    walls,
    title: "Chambre 214",
    subtitle: "Suite · king, Best Life, vue ville",
    tvSetup,
    elevator: { x: -2.2, z: D / 2 - 0.4 },
    minibar: { x: 4.6, z: 5.4 },
    sits: [
      { x: -3.8, z: -1.05, yaw: 0 },
      { x: -3.2, z: -1.05, yaw: 0 },
      { x: -2.6, z: -1.05, yaw: 0 },
      { x: -3.2, z: 1.7, yaw: Math.PI },
    ],
  };
}

function buildLobbyInterior(): InteriorRoom {
  const g = new THREE.Group();
  g.name = "interieur_lobby";
  const W = 12;
  const D = 16;
  const H = 4.2;
  const walls: WallBox[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("marbre", 3.2, 4.2, 0.18, 0.12));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("plafond", 2.4, 3, 0.92));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  const mur = tex.mat("platre", 2.6, 1.4, 0.86);
  g.add(wall(W, H, 0.22, 0, H / 2, -D / 2, mur));
  g.add(wall(W, H, 0.22, 0, H / 2, D / 2, mur));
  g.add(wall(0.22, H, D, -W / 2, H / 2, 0, mur));
  g.add(wall(0.22, H, D, W / 2, H / 2, 0, mur));
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.15, maxZ: -D / 2 + 0.15 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.15, maxZ: D / 2 + 0.15 });
  walls.push({ minX: -W / 2 - 0.15, maxX: -W / 2 + 0.15, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.15, maxX: W / 2 + 0.15, minZ: -D / 2, maxZ: D / 2 });

  g.add(persianRug(0, 1.5, 4.2, 10));
  g.add(chandelier(0, H - 0.35, -2.2));
  g.add(chandelier(0, H - 0.35, 3.2));
  g.add(receptionDesk(0, -6.4));
  g.add(receptionBell(0.9, 1.2, -6.05));
  g.add(lightPanel(-1.4, 1.55, -7.85));
  g.add(lobbyPlant(-4.6, -6.6));
  g.add(lobbyPlant(4.6, -6.6));
  g.add(loungeChair(-3.6, 2.2, 0.6));
  g.add(loungeChair(-2.2, 2.2, -0.6));
  g.add(coffeeTable(-2.9, 3.2));
  g.add(loungeChair(3.6, 2.2, -0.6));
  g.add(loungeChair(2.2, 2.2, 0.6));
  g.add(coffeeTable(2.9, 3.2));
    // --- ASCENSEUR DE LUXE FERMÉ ET RÉALISTE (Mur de droite) ---
  const elGroup = new THREE.Group();
  elGroup.name = "lobby_elevator_assembly";
  elGroup.position.set(W / 2 - 0.08, 0, -1.8);
  elGroup.rotation.y = -Math.PI / 2; // Face à l'intérieur du lobby

  // Matériaux laiton brossé et sombre
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc59f4e, metalness: 0.85, roughness: 0.25 });
  const darkRecess = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9 });

  // Cadre extérieur
  const elFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.12), brassMat);
  elFrame.position.set(0, 1.6, 0);
  elFrame.castShadow = true;
  elGroup.add(elFrame);

  // Fond de cabine sombre
  const elBack = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.7, 0.05), darkRecess);
  elBack.position.set(0, 1.35, -0.02);
  elGroup.add(elBack);

  // Deux portes coulissantes fermées en laiton brossé
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.94, 2.65, 0.04), brassMat);
  doorL.position.set(-0.47, 1.33, 0.01);
  doorL.castShadow = true;
  elGroup.add(doorL);

  const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.94, 2.65, 0.04), brassMat);
  doorR.position.set(0.47, 1.33, 0.01);
  doorR.castShadow = true;
  elGroup.add(doorR);

  // Joint central noir
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.015, 2.65, 0.05), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  seam.position.set(0, 1.33, 0.02);
  elGroup.add(seam);

  // Indicateur d'étage rétro au-dessus
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), brassMat);
  dial.position.set(0, 2.85, 0.07);
  elGroup.add(dial);

  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.01), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
  needle.position.set(0, 2.85, 0.08);
  elGroup.add(needle);

  // Bouton d'appel mural rétro-éclairé
  const buttonPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.02), brassMat);
  buttonPlate.position.set(1.35, 1.3, 0.01);
  elGroup.add(buttonPlate);

  const callLight = new THREE.Mesh(new THREE.CircleGeometry(0.025, 10), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  callLight.position.set(1.35, 1.3, 0.025);
  elGroup.add(callLight);

  g.add(elGroup);

  // Plaque de détection physique au sol (placée à l'entrée de la cabine)
  g.add(elevatorPlate(W / 2 - 0.7, 1.2, -1.8));
  g.add(ceilingLight(0, H - 0.08, 0, 1.6));
  g.add(ceilingLight(-3.2, H - 0.08, 2.6, 0.9));
  g.add(ceilingLight(3.2, H - 0.08, 2.6, 0.9));

  const exitPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.3, 0.08),
    matLib.getEmissive(0xd4a853, 0xd4a853, 0.28),
  );
  exitPlate.position.set(0, 1.15, D / 2 - 0.16);
  g.add(exitPlate);

  g.add(lamp(0, H - 0.25, 0, 0xfff5e6, 2.2, 16));

  return {
    kind: "lobby",
    group: g,
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.2),
    spawnYaw: 0,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.7),
    title: "Grand Lobby",
    subtitle: "Hôtel Pont-Rouge · cloche, lustres, ascenseur",
    walls,
    bell: { x: 0.9, z: -6.05 },
    elevator: { x: 5.2, z: -1.8 },
    lightSwitch: { x: -1.4, z: -7.85 },
    sits: [
      { x: -3.6, z: 2.2, yaw: 0.6 },
      { x: -2.2, z: 2.2, yaw: -0.6 },
      { x: 3.6, z: 2.2, yaw: -0.6 },
      { x: 2.2, z: 2.2, yaw: 0.6 },
    ],
  };
}

function buildApartmentInterior(): InteriorRoom {
  const g = new THREE.Group();
  g.name = "interieur_appart";
  const W = 8.4;
  const D = 10.2;
  const H = 2.75;
  const walls: WallBox[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("parquetLoft", 3.2, 3.8, 0.52, 0.04));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("plafond", 2, 2.2, 0.92));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  const mur = tex.mat("platre", 2.2, 1.2, 0.88);
  g.add(wall(W, H, 0.2, 0, H / 2, -D / 2, mur));
  g.add(wall(W, H, 0.2, 0, H / 2, D / 2, mur));
  g.add(wall(0.2, H, D, -W / 2, H / 2, 0, mur));
  g.add(wall(0.2, H, D, W / 2, H / 2, 0, mur));
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.15, maxZ: -D / 2 + 0.15 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.15, maxZ: D / 2 + 0.15 });
  walls.push({ minX: -W / 2 - 0.15, maxX: -W / 2 + 0.15, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.15, maxX: W / 2 + 0.15, minZ: -D / 2, maxZ: D / 2 });

  const proc = new THREE.Group();
  proc.name = "appart-proc";
  proc.add(wall(0.16, H, 4.2, 0.4, H / 2, -2.2, 0x2a2a38));
  proc.add(woolSofa(-2.05, -3.15, 0.15));
  proc.add(coffeeTable(-2.1, -1.7));
  const fridge = buildFridge();
  fridge.position.set(2.85, 0, -3.9);
  fridge.rotation.y = -0.2;
  proc.add(fridge);
  const stove = buildStove();
  stove.position.set(2.15, 0, -3.9);
  proc.add(stove);
  const kSink = buildKitchenSink();
  kSink.position.set(1.45, 0, -3.9);
  proc.add(kSink);
  const washer = buildWasher();
  washer.position.set(3.4, 0, 3.4);
  proc.add(washer);
  proc.add(loungeChair(2.4, 2.6, Math.PI));
  proc.add(furniture(1.2, 1.6, 0.4, -2.8, 0.82, 3.4, 0x4a3a30));
  proc.add(nightstand(2.55, -4.35));
  proc.add(nightstand(2.55, -3.25));
  proc.add(brickFireplace(-W / 2 + 0.22, -2.4, Math.PI / 2));
  proc.add(drapeCurtain(0, D / 2 - 0.18, Math.PI, 3.1, 2.45));
  g.add(proc);

  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), matLib.get(0x1e3a5f, 0.12, 0.7));
  win.position.set(0, 1.5, D / 2 - 0.12);
  g.add(win);
  for (let i = 0; i < 10; i++) {
    const spec = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.03, 0.02),
      matLib.getEmissive(0xfde68a, 0xf59e0b, 0.85),
    );
    spec.position.set(-1.0 + (i % 5) * 0.5, 1.15 + Math.floor(i / 5) * 0.5, D / 2 - 0.14);
    g.add(spec);
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.15, 0.08), tex.mat("porteAcier", 1, 1.8, 0.42, 0.55));
  door.position.set(0, 1.1, -D / 2 + 0.12);
  door.castShadow = true;
  g.add(door);
  g.add(doorFrame(0, -D / 2 + 0.14, 0));
  g.add(ceilingLight(0, H - 0.06, 0, 1.7));
  g.add(ceilingLight(-2.2, H - 0.06, -3.2, 1.1));
  g.add(ceilingLight(2.4, H - 0.06, 2.2, 1.0));
  g.add(baseboard(0, -D / 2 + 0.12, W - 0.3));
  g.add(baseboard(0, D / 2 - 0.12, W - 0.3));
  g.add(elevatorPlate(0, 1.15, -D / 2 + 0.16));
  (mountLoft as any)(g, W, D, H);

  return {
    kind: "apartment",
    group: g,
    spawn: new THREE.Vector3(0, 0, -D / 2 + 1.8),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, -D / 2 + 0.7),
    walls,
    title: "4½ — 301",
    subtitle: "Tour résidentielle · loft, cheminée, salon",
    elevator: { x: 0, z: -D / 2 + 1.2 },
    sits: [
      { x: -2.5, z: -3.15, yaw: 0.15 },
      { x: -1.6, z: -3.15, yaw: 0.15 },
      { x: 2.4, z: 2.6, yaw: Math.PI },
    ],
  };
}

function buildCorridorInterior(): InteriorRoom {
  const g = new THREE.Group();
  g.name = "interieur_couloir";
  const W = 3.2;
  const D = 18;
  const H = 3.2;
  const walls: WallBox[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("moquette", 2.2, 8, 0.95));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("plafond", 1.4, 6, 0.92));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, D - 0.4), tex.mat("velours", 1, 7, 0.9));
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.012, 0);
  g.add(runner);

  const mur = tex.mat("murNuit", 1.2, 1.1, 0.88);
  g.add(wall(W, H, 0.18, 0, H / 2, -D / 2, mur));
  g.add(wall(W, H, 0.18, 0, H / 2, D / 2, mur));
  g.add(wall(0.16, H, D, -W / 2, H / 2, 0, mur));
  g.add(wall(0.16, H, D, W / 2, H / 2, 0, mur));
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.14, maxZ: -D / 2 + 0.14 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.14, maxZ: D / 2 + 0.14 });
  walls.push({ minX: -W / 2 - 0.14, maxX: -W / 2 + 0.14, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.14, maxX: W / 2 + 0.14, minZ: -D / 2, maxZ: D / 2 });

  const left = [
    { z: -6, label: "210", locked: true },
    { z: -2, label: "212", locked: true },
    { z: 2, label: "214", locked: false },
    { z: 6, label: "216", locked: true },
  ];
  const right = [
    { z: -6, label: "301", locked: false },
    { z: -2, label: "303", locked: true },
    { z: 2, label: "305", locked: true },
    { z: 6, label: "307", locked: true },
  ];
  for (const d of left) g.add(hallDoor(-W / 2 + 0.09, d.z, Math.PI / 2, d.label, d.locked));
  for (const d of right) g.add(hallDoor(W / 2 - 0.09, d.z, -Math.PI / 2, d.label, d.locked));

  for (const z of [-6, -2, 2, 6]) g.add(ceilingLight(0, H - 0.06, z, 1.15));
  g.add(lobbyPlant(W / 2 - 0.45, -4));
  g.add(lobbyPlant(-W / 2 + 0.45, 4));
  g.add(corridorBench(-W / 2 + 0.42, 0, Math.PI / 2));
  g.add(corridorBench(W / 2 - 0.42, -4.2, -Math.PI / 2));
  g.add(baseboard(0, -D / 2 + 0.12, W - 0.2));
  g.add(baseboard(0, D / 2 - 0.12, W - 0.2));

  g.add(elevatorPlate(0, 1.15, -D / 2 + 0.14));
  const exitPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.08),
    matLib.getEmissive(0xd4a853, 0xd4a853, 0.28),
  );
  exitPlate.position.set(0, 1.15, D / 2 - 0.14);
  g.add(exitPlate);

  return {
    kind: "corridor",
    group: g,
    spawn: new THREE.Vector3(0, 0, 3.2),
    spawnYaw: 0,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.7),
    walls,
    title: "Couloir",
    subtitle: "Étage 2 · chambres et appartements",
    elevator: { x: 0, z: -D / 2 + 0.5 },
    sits: [
      { x: -W / 2 + 0.42, z: 0, yaw: Math.PI / 2 },
      { x: W / 2 - 0.42, z: -4.2, yaw: -Math.PI / 2 },
    ],
    rooms: [
      { x: -W / 2 + 0.2, z: 2, to: "hotel", label: "214" },
      { x: W / 2 - 0.2, z: -6, to: "apartment", label: "301" },
      { x: -W / 2 + 0.2, z: -6, to: "hotel", label: "210", locked: true },
      { x: -W / 2 + 0.2, z: -2, to: "hotel", label: "212", locked: true },
      { x: -W / 2 + 0.2, z: 6, to: "hotel", label: "216", locked: true },
      { x: W / 2 - 0.2, z: -2, to: "apartment", label: "303", locked: true },
      { x: W / 2 - 0.2, z: 2, to: "apartment", label: "305", locked: true },
      { x: W / 2 - 0.2, z: 6, to: "apartment", label: "307", locked: true },
    ],
  };
}

function buildPrisonInterior(): InteriorRoom {
  const g = new THREE.Group();
  g.name = "interieur_prison";
  const W = 5.4;
  const D = 7.2;
  const H = 2.85;
  const walls: WallBox[] = [];
  const beton = matLib.get(0x9a9691, 0.95);
  const sol = matLib.get(0x6e6b66, 0.96);
  const acier = matLib.get(0x3e4247, 0.55, 0.7);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), sol);
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), beton);
  ceil.position.y = H;
  g.add(ceil);
  g.add(wall(W, H, 0.18, 0, H / 2, -D / 2, beton));
  g.add(wall(W, H, 0.18, 0, H / 2, D / 2, beton));
  g.add(wall(0.18, H, D, -W / 2, H / 2, 0, beton));
  g.add(wall(0.18, H, D, W / 2, H / 2, 0, beton));
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.12, maxZ: -D / 2 + 0.12 });
  walls.push({ minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.12, maxZ: D / 2 + 0.12 });
  walls.push({ minX: -W / 2 - 0.12, maxX: -W / 2 + 0.12, minZ: -D / 2, maxZ: D / 2 });
  walls.push({ minX: W / 2 - 0.12, maxX: W / 2 + 0.12, minZ: -D / 2, maxZ: D / 2 });

  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.85), matLib.get(0x8aa4c0, 0.2, 0.5));
  win.position.set(0, 1.95, -D / 2 + 0.1);
  g.add(win);
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), acier);
    bar.position.set(-0.24 + i * 0.16, 1.95, -D / 2 + 0.14);
    g.add(bar);
  }

  const neon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.16), matLib.getEmissive(0xffd88a, 0xffd88a, 0.9));
  neon.position.set(0, H - 0.16, 0);
  g.add(neon);

  const steel = matLib.get(0xa8adb4, 0.35, 0.85);
  const mattress = matLib.get(0x5a6470, 0.95);
  for (const y of [0.42, 1.42]) {
    g.add(furniture(0.78, 0.08, 1.95, -W / 2 + 0.55, y, -0.5, 0xa8adb4, 0.85));
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 1.85), mattress);
    mat.position.set(-W / 2 + 0.55, y + 0.11, -0.5);
    g.add(mat);
  }
  for (const z of [-1.35, 0.4]) {
    for (const x of [-W / 2 + 0.2, -W / 2 + 0.9]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6), steel);
      post.position.set(x, 0.95, z);
      g.add(post);
    }
  }

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.42, 12), steel);
  bowl.position.set(W / 2 - 0.45, 0.21, -D / 2 + 0.5);
  g.add(bowl);
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.3), steel);
  sink.position.set(W / 2 - 0.45, 0.82, -D / 2 + 0.42);
  g.add(sink);

  g.add(furniture(0.7, 0.06, 0.34, W / 2 - 0.45, 0.78, 0.9, 0x54514d));
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 10), matLib.get(0x54514d, 0.95));
  stool.position.set(W / 2 - 0.8, 0.21, 0.9);
  g.add(stool);

  const doorW = 1.9;
  for (let i = 0; i < 9; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.15, 6), acier);
    bar.position.set(-doorW / 2 + (i / 8) * doorW, 1.1, D / 2 - 0.08);
    g.add(bar);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.2, 0.1, 0.14), acier);
  frame.position.set(0, 2.2, D / 2 - 0.08);
  g.add(frame);

  return {
    kind: "prison",
    group: g,
    spawn: new THREE.Vector3(0.4, 0, 1.6),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, D / 2 - 0.5),
    walls,
    title: "Cellule A-1-04",
    subtitle: "Établissement de Donnacona · 2 couchettes",
    sits: [
      { x: -W / 2 + 0.55, z: -0.5, yaw: Math.PI / 2 },
      { x: W / 2 - 0.8, z: 0.9, yaw: -Math.PI / 2 },
    ],
  };
}

const HOME_W = 12;
const HOME_D = 10;
const HOME_H = 2.65;

function homeWalls(includeGarage: boolean, bays: number): WallBox[] {
  const W = HOME_W;
  const D = HOME_D;
  const walls: WallBox[] = [
    { minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.16, maxZ: -D / 2 + 0.16 },
    { minX: -W / 2, maxX: W / 2, minZ: D / 2 - 0.16, maxZ: D / 2 + 0.16 },
    { minX: -W / 2 - 0.16, maxX: -W / 2 + 0.16, minZ: -D / 2, maxZ: D / 2 },
    { minX: W / 2 - 0.16, maxX: W / 2 + 0.16, minZ: -D / 2, maxZ: D / 2 },
  ];
  if (includeGarage) {
    const gw = 4.2 * bays + 0.4;
    walls.push({ minX: W / 2, maxX: W / 2 + gw, minZ: -D / 2 - 0.16, maxZ: -D / 2 + 0.16 });
    walls.push({ minX: W / 2, maxX: W / 2 + gw, minZ: D / 2 - 0.16, maxZ: D / 2 + 0.16 });
    walls.push({ minX: W / 2 + gw - 0.16, maxX: W / 2 + gw + 0.16, minZ: -D / 2, maxZ: D / 2 });
  }
  return walls;
}

function buildHomeInterior(): InteriorRoom {
  const g = new THREE.Group();
  g.name = "interieur_maison";
  const W = HOME_W;
  const D = HOME_D;
  const H = HOME_H;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("parquet", 4, 3.4, 0.55, 0.04));
  floor.rotation.x = -Math.PI / 2;
  floor.name = "home_floor";
  floor.receiveShadow = true;
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tex.mat("plafond", 2.2, 2, 0.92));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  ceil.name = "home_ceil";
  g.add(ceil);
  const mur = tex.mat("platre", 2.4, 1.2, 0.88);
  g.add(wall(W, H, 0.22, 0, H / 2, -D / 2, mur));
  g.add(wall(W, H, 0.22, 0, H / 2, D / 2, mur));
  g.add(wall(0.22, H, D, -W / 2, H / 2, 0, mur));
  g.add(wall(0.22, H, D, W / 2, H / 2, 0, mur));
  const winL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), matLib.get(QC_PALETTE.fenetre, 0.18, 0.55));
  winL.position.set(-W / 2 + 0.13, 1.45, -1.6);
  winL.rotation.y = Math.PI / 2;
  g.add(winL);
  const winR = winL.clone();
  winR.position.set(W / 2 - 0.13, 1.45, -1.6);
  winR.rotation.y = -Math.PI / 2;
  g.add(winR);
  g.add(doorFrame(0, -D / 2 + 0.12, 0));
  const exitPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 2.15, 0.08),
    matLib.getEmissive(0xd4a853, 0xd4a853, 0.22),
  );
  exitPlate.position.set(0, 1.1, -D / 2 + 0.14);
  g.add(exitPlate);
  g.add(baseboard(0, -D / 2 + 0.14, W - 0.4));
  g.add(baseboard(0, D / 2 - 0.14, W - 0.4));
  const bulb = lamp(0, H - 0.2, 0, 0xfde68a, 0.45, 8);
  bulb.name = "home_bare_bulb";
  g.add(bulb);
  const fit = new THREE.Group();
  fit.name = "home_fit";
  g.add(fit);
  return {
    kind: "home",
    group: g,
    spawn: new THREE.Vector3(0, 0, -D / 2 + 1.8),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, -D / 2 + 0.7),
    walls: homeWalls(false, 1),
    title: "Maison vide",
    subtitle: "Sol, murs, portes, fenêtres",
    desk: { x: 4.4, z: -3.6 },
    basement: { x: -4.6, z: 3.8 },
    workbench: { x: 8.2, z: 0 },
    heater: { x: -4.6, z: -2.4 },
    panel: { x: 5.2, z: 1.2 },
    homeDoors: [
      { slot: "main", x: 0, z: -D / 2 + 0.4 },
      { slot: "back", x: 0, z: D / 2 - 0.4 },
      { slot: "bedroom", x: -3.2, z: 1.2 },
      { slot: "private", x: 3.4, z: 3.2 },
      { slot: "basement", x: -4.6, z: 3.8 },
      { slot: "garage", x: W / 2 - 0.3, z: 0 },
    ],
    sits: [],
  };
}

function clearGroup(g: THREE.Group) {
  while (g.children.length) g.remove(g.children[0]!);
}

function basementFitGroup(fit: HouseState["basement"]): THREE.Group {
  const g = new THREE.Group();
  if (fit === "vide") {
    g.add(furniture(1.1, 0.7, 0.7, -3.2, 0.35, -2.2, 0x6a5a48));
    g.add(furniture(0.8, 0.9, 0.5, 3.6, 0.45, 2.4, 0x4a4a44));
    return g;
  }
  if (fit === "familiale") {
    g.add(woolSofa(-1.6, -0.4, 0.2));
    g.add(coffeeTable(-1.6, 1.1));
    g.add(persianRug(-1.6, 0.4, 3.4, 3.2));
    return g;
  }
  if (fit === "cinema") {
    g.add(furniture(3.6, 1.6, 0.12, 0, 1.2, -4.2, 0x111111, 0.4));
    g.add(woolSofa(0, 2.4, Math.PI));
    g.add(loungeChair(-1.8, 2.8, Math.PI));
    g.add(loungeChair(1.8, 2.8, Math.PI));
    return g;
  }
  if (fit === "gym") {
    g.add(furniture(2.2, 0.12, 0.7, -2.2, 0.08, 0, 0x1f2937));
    g.add(furniture(0.35, 0.35, 1.4, 2.4, 0.22, 0.4, 0x374151, 0.3));
    g.add(furniture(0.22, 0.22, 0.22, 2.4, 0.5, -0.2, 0x111111, 0.4));
    return g;
  }
  if (fit === "atelier") {
    g.add(buildWorkbench());
    g.children[0]!.position.set(2.6, 0, -1.2);
    g.add(furniture(0.4, 1.4, 2.2, -4.4, 0.7, 0, 0x5a5048));
    return g;
  }
  if (fit === "bureau") {
    g.add(furniture(1.4, 0.08, 0.7, 2.2, 0.74, -1.4, 0x3a2a1c));
    g.add(loungeChair(2.2, -0.4, 0));
    g.add(wallArt(HOME_W / 2 - 0.14, 1.5, -1.4, -Math.PI / 2));
    return g;
  }
  if (fit === "chambre") {
    g.add(kingBed(-2.2, -1.4));
    g.add(nightstand(-0.8, -2.2));
    return g;
  }
  if (fit === "rangement") {
    g.add(furniture(0.45, 1.8, 3.4, -4.6, 0.9, 0, 0x6a5a48));
    g.add(furniture(0.45, 1.8, 3.4, 4.6, 0.9, 0, 0x6a5a48));
    return g;
  }
  if (fit === "buanderie") {
    const washer = buildWasher();
    washer.position.set(3.4, 0, -2.4);
    g.add(washer);
    g.add(furniture(0.7, 1.0, 0.7, 4.2, 0.5, -2.4, 0xd0d4d8, 0.15));
    return g;
  }
  g.add(persianRug(0, 0, 4, 3));
  g.add(loungeChair(1.4, 0.6, -0.4));
  return g;
}

export function paintHomeInterior(
  room: InteriorRoom,
  state: HouseState,
  floor: "main" | "basement",
  opts: { hydro?: boolean; heatOn?: boolean; ambient?: number } = {},
) {
  const fit = room.group.getObjectByName("home_fit") as THREE.Group | undefined;
  if (!fit) return;
  clearGroup(fit);
  const W = HOME_W;
  const D = HOME_D;
  const H = HOME_H;
  const garageOn = hasReno(state, "garage") && floor === "main";
  room.walls = homeWalls(garageOn, state.garageBays);
  const bulb = room.group.getObjectByName("home_bare_bulb");
  if (bulb) bulb.visible = !hasReno(state, "eclairage") && floor === "main";

  if (floor === "basement") {
    if (!hasReno(state, "soussol")) {
      room.title = "Cave brute";
      room.subtitle = "Pas encore fini";
      return;
    }
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0x8a8680, 0.96));
    slab.rotation.x = -Math.PI / 2;
    slab.position.y = 0.01;
    fit.add(slab);
    fit.add(ceilingLight(0, H - 0.08, 0, 0.7));
    fit.add(ceilingLight(-3, H - 0.08, 2, 0.5));
    fit.add(basementFitGroup(state.basement));
    const spec = {
      vide: "Vide",
      familiale: "Salle familiale",
      cinema: "Cinéma maison",
      gym: "Gym",
      atelier: "Atelier",
      bureau: "Bureau",
      chambre: "Chambre",
      rangement: "Rangement",
      buanderie: "Buanderie",
      perso: "Espace perso",
    } as const;
    room.title = "Sous-sol québécois";
    room.subtitle = (spec as Record<string, string>)[state.basement] ?? "Sous-sol";
    room.sits = state.basement === "familiale" || state.basement === "cinema" ? [{ x: -1.6, z: -0.4, yaw: 0.2 }] : [];
    fit.add(furniture(0.9, 0.08, 0.9, -4.6, 0.04, 3.8, 0xc4a030, 0.2));
    const tank = buildWaterHeater();
    tank.position.set(4.4, 0, 3.2);
    fit.add(tank);
    if (state.heat === "central") {
      const furn = buildFurnace();
      furn.position.set(4.4, 0, 1.6);
      fit.add(furn);
    }
    room.heater = { x: 4.4, z: 1.6 };
    room.panel = { x: 4.4, z: 3.2 };
    return;
  }

  if (hasReno(state, "eclairage")) {
    fit.add(ceilingLight(0, H - 0.08, 0, 1.4));
    fit.add(ceilingLight(-3.2, H - 0.08, -2.4, 1.0));
    fit.add(ceilingLight(3.2, H - 0.08, 2.2, 1.0));
    fit.add(lightPanel(4.6, 1.2, -4.4));
  }

  if (hasReno(state, "salon")) {
    fit.add(persianRug(-2.4, -0.6, 3.6, 3.2));
    fit.add(woolSofa(-2.4, -1.8, 0.15));
    fit.add(coffeeTable(-2.4, -0.2));
    fit.add(loungeChair(-3.6, 0.8, 0.6));
    room.sits = [
      { x: -2.9, z: -1.7, yaw: 0.15 },
      { x: -1.9, z: -1.7, yaw: 0.15 },
      { x: -3.6, z: 0.8, yaw: 0.6 },
    ];
  } else {
    room.sits = [];
  }

  if (hasReno(state, "cuisine")) {
    const fridge = buildFridge();
    fridge.position.set(4.4, 0, 3.4);
    fit.add(fridge);
    const stove = buildStove();
    stove.position.set(3.3, 0, 3.4);
    fit.add(stove);
    const sink = buildKitchenSink();
    sink.position.set(2.2, 0, 3.4);
    fit.add(sink);
    fit.add(furniture(3.6, 0.9, 0.55, 3.3, 0.45, 3.85, 0x3a3a42));
  }

  if (hasReno(state, "sdb")) {
    fit.add(wall(2.4, H, 0.14, -4.2, H / 2, 1.6, 0xe8e4dc));
    fit.add(wall(0.14, H, 2.6, -3.0, H / 2, 2.8, 0xe8e4dc));
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.4), matLib.get(0xd4d0c8, 0.35, 0.15));
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(-4.3, 0.02, 2.9);
    fit.add(tile);
    const toilet = buildToilet();
    toilet.position.set(-3.5, 0, 3.6);
    fit.add(toilet);
    const bath = buildBathSink();
    bath.position.set(-4.6, 0, 3.6);
    fit.add(bath);
  }

  if (hasReno(state, "chambres")) {
    fit.add(kingBed(3.2, -2.8));
    fit.add(nightstand(2.0, -3.6));
    fit.add(nightstand(4.4, -3.6));
    fit.add(drapeCurtain(W / 2 - 0.18, -2.6, Math.PI / 2, 2.4, 2.2));
  }

  fit.add(furniture(1.1, 0.08, 0.55, 4.4, 0.74, -3.6, 0x3a2a1c));
  fit.add(loungeChair(4.4, -2.8, 0));

  if (hasReno(state, "soussol")) {
    fit.add(furniture(0.95, 0.06, 0.95, -4.6, 0.04, 3.8, 0x5a3a20));
    fit.add(furniture(0.06, 0.9, 0.9, -4.1, 0.5, 3.8, 0x8a6a48));
  }

  if (garageOn) {
    const gw = 4.2 * state.garageBays + 0.4;
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(gw, D), matLib.get(0x6a6e68, 0.95));
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(W / 2 + gw / 2, 0.01, 0);
    fit.add(slab);
    fit.add(wall(0.18, H, D, W / 2 + gw, H / 2, 0, 0x8a9096));
    fit.add(wall(gw, H, 0.18, W / 2 + gw / 2, H / 2, -D / 2, 0x8a9096));
    fit.add(wall(gw, H, 0.18, W / 2 + gw / 2, H / 2, D / 2, 0x8a9096));
    fit.add(furniture(1.1, 2.1, 0.06, W / 2, 1.05, 0, 0x111111));
    if (state.garageFits.includes("etabli") || state.garageFits.includes("mecanique")) {
      const bench = buildWorkbench();
      bench.position.set(W / 2 + gw - 1.2, 0, -2.4);
      fit.add(bench);
      room.workbench = { x: W / 2 + gw - 1.2, z: -2.4 };
    }
    if (state.garageFits.includes("outils")) {
      fit.add(furniture(0.7, 0.85, 0.42, W / 2 + 1.4, 0.42, -3.4, 0xb91c1c, 0.25));
    }
    if (state.garageFits.includes("compresseur")) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.85, 10), matLib.get(0xc0c4c8, 0.3, 0.55));
      tank.rotation.z = Math.PI / 2;
      tank.position.set(W / 2 + 2.2, 0.32, 3.2);
      fit.add(tank);
    }
    if (state.garageFits.includes("deco")) {
      fit.add(wallArt(W / 2 + gw - 0.12, 1.6, 0, -Math.PI / 2));
    }
    room.homeDoors = (room.homeDoors ?? []).map((d) => (d.slot === "garage" ? { ...d, x: W / 2 + 0.4, z: 0 } : d));
  }

  const spec = heatById(state.heat);
  if (state.heat === "poele") {
    const stove = buildWoodStove();
    stove.position.set(-4.6, 0, -2.4);
    fit.add(stove);
    room.heater = { x: -4.6, z: -2.4 };
  } else if (state.heat === "foyer") {
    fit.add(brickFireplace(-W / 2 + 0.22, -2.2, Math.PI / 2));
    room.heater = { x: -W / 2 + 0.5, z: -2.2 };
  } else {
    const plinth = buildPlinthRow(4.2);
    plinth.position.set(-2.2, 0, D / 2 - 0.18);
    fit.add(plinth);
    if (state.heat === "thermopompe" || state.heat === "electrique") {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.22), matLib.get(0xd8dce0, 0.4, 0.2));
      head.position.set(4.2, 2.15, -3.6);
      fit.add(head);
    }
    room.heater = { x: -2.2, z: D / 2 - 0.4 };
  }
  const panel = buildHydroPanel();
  panel.position.set(5.2, 0, 1.2);
  panel.rotation.y = -Math.PI / 2;
  fit.add(panel);
  room.panel = { x: 5.2, z: 1.2 };

  const n = state.renos.length;
  const hydro = opts.hydro ?? state.hydroOn;
  const glow = opts.heatOn ?? heatWorks(state, null, opts.ambient ?? 8);
  setHeatGlow(fit, glow);
  room.title = n === 0 ? "Maison vide" : "Chez vous";
  room.subtitle = `${spec.label} · ${Math.round(state.indoorC)} °C${hydro ? "" : " · panne"}`;
}

function buildCaisseInterior(): InteriorRoom {
  const g = new THREE.Group();
  g.name = "interieur_caisse";
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x22252a }));
  floor.rotation.x = -Math.PI/2;
  g.add(floor);
  return { kind: "caisse", group: g, walls: [], spawn: new THREE.Vector3(0,0,0), spawnYaw: 0, exit: new THREE.Vector3(0,0,5), title: "Caisse Populaire", subtitle: "Services financiers", vaultSpot: { x: -2, z: -2 } };
}

function buildCasseInterior(): InteriorRoom {
  const g = new THREE.Group();
  g.name = "interieur_casse";
  return { kind: "casse", group: g, walls: [], spawn: new THREE.Vector3(0,0,0), spawnYaw: 0, exit: new THREE.Vector3(0,0,4), title: "Casse-Croûte", subtitle: "Restauroute" };
}

function buildSqdcInterior(): InteriorRoom {
  // Vide car la SQDC est maintenant un MLO intégré directement au bâtiment de la rue !
  const g = new THREE.Group();
  g.name = "interieur_sqdc_placeholder";
  return {
    kind: "sqdc",
    title: "SQDC — Société québécoise du cannabis",
    subtitle: "10h - 21h · 21 ans et plus · Pièce d'identité requise",
    group: g,
    walls: [],
    spawn: new THREE.Vector3(0, 0, 0),
    spawnYaw: 0,
    exit: new THREE.Vector3(0, 0, 0)
  };
}

export function createInteriors() {
  const hotel = buildHotelInterior();
  const apartment = buildApartmentInterior();
  const lobby = buildLobbyInterior();
  const corridor = buildCorridorInterior();
  const raw = buildBoutiqueInterior();
  const boutique: InteriorRoom = { kind: "boutique", ...raw };
  const depRaw = buildDepanneurInterior();
  const depanneur: InteriorRoom = { kind: "depanneur", ...depRaw };
  const prison = buildPrisonInterior();
  const home = buildHomeInterior();
  hotel.group.position.set(INTERIOR_ORIGIN.x, INTERIOR_ORIGIN.y, INTERIOR_ORIGIN.z);
  apartment.group.position.set(INTERIOR_ORIGIN.x + 28, INTERIOR_ORIGIN.y, INTERIOR_ORIGIN.z);
  boutique.group.position.set(INTERIOR_ORIGIN.x + 56, INTERIOR_ORIGIN.y, INTERIOR_ORIGIN.z);
  lobby.group.position.set(INTERIOR_ORIGIN.x + 84, INTERIOR_ORIGIN.y, INTERIOR_ORIGIN.z);
  corridor.group.position.set(INTERIOR_ORIGIN.x + 112, INTERIOR_ORIGIN.y, INTERIOR_ORIGIN.z);
  prison.group.position.set(INTERIOR_ORIGIN.x + 140, INTERIOR_ORIGIN.y, INTERIOR_ORIGIN.z);
  home.group.position.set(INTERIOR_ORIGIN.x + 168, INTERIOR_ORIGIN.y, INTERIOR_ORIGIN.z);
  depanneur.group.position.set(INTERIOR_ORIGIN.x + 196, INTERIOR_ORIGIN.y, INTERIOR_ORIGIN.z);
  hotel.group.visible = false;
  apartment.group.visible = false;
  boutique.group.visible = false;
  lobby.group.visible = false;
  corridor.group.visible = false;
  prison.group.visible = false;
  home.group.visible = false;
  depanneur.group.visible = false;
  const caisse = buildCaisseInterior();
  const casse = buildCasseInterior();
  const sqdc = buildSqdcInterior();
  return { hotel, apartment, boutique, lobby, corridor, prison, home, depanneur, caisse, casse, sqdc };
}

export function resolveWalls(x: number, z: number, walls: WallBox[], radius = 0.38) {
  let nx = x;
  let nz = z;
  for (const w of walls) {
    const minX = w.minX - radius;
    const maxX = w.maxX + radius;
    const minZ = w.minZ - radius;
    const maxZ = w.maxZ + radius;
    if (nx > minX && nx < maxX && nz > minZ && nz < maxZ) {
      const left = nx - minX;
      const right = maxX - nx;
      const top = nz - minZ;
      const bot = maxZ - nz;
      const m = Math.min(left, right, top, bot);
      if (m === left) nx = minX;
      else if (m === right) nx = maxX;
      else if (m === top) nz = minZ;
      else nz = maxZ;
    }
  }
  return { x: nx, z: nz };
}
