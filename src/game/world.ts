import * as THREE from "three";
import {
  buildCabaneSucre,
  buildCasseCroute,
  buildBoutique,
  buildChasseShop,
  buildQuincaillerie,
  buildDepanneur,
  buildSqdc,
  buildEcole,
  buildEglise,
  buildHotelVille,
  buildMaisonCanadienne,
  buildPanneauArret,
  buildPanneauVitesse,
  buildPanneauSortie,
  buildPanneauAutoroute,
  buildGantrySortie,
  buildOverpass,
  buildPickup,
  buildPolice,
  buildSedan,
  buildCamion,
  buildSqPoste,
  buildAtm,
  buildCrimeCorner,
} from "./architecture";
import { buildFirmBuilding, countyFirms, nearestCountyFirm, shopKindForFirm, type CountyFirm, type Firm } from "./business";
import { farmClearings, mountFarms, nearestField, tickFields, buildTracteur, type FieldPlot } from "./farms";
import { mountHerd, nearestStock, tickHerd, type Stock } from "./livestock";
import {
  mountSugarbush,
  nearestBush,
  nearestEvap,
  nearestTap,
  sugarClearings,
  tickSugar,
  type SugarBush,
  type SugarEvap,
  type SugarTap,
} from "./sugar";
import { buildBoiteOutils, buildPelle, buildRateau } from "./tools";
import {
  buildCamping,
  buildCaveEntrance,
  buildEboulis1894,
  buildGorge,
  buildMarmitesDeGeants,
  buildMoulin,
  buildPapeterie,
  buildPlageParc,
  buildPontDeFer,
  buildQuarry,
  buildTrouDuDiable,
  buildMarina,
  buildCemetery,
  buildPark,
} from "./landmarks";
import { LANDMARK_SHOPS, shopNameFor, type ShopSpot } from "./commerce";
import { shopDoorOffset, depHoursLabel } from "./depanneur";
import {
  animateCaisse,
  buildCaissePopulaire,
  caisseHoursLabel,
  caisseNameFor,
  setCaisseNight,
  worldOffset,
} from "./caisse";
import { ATM_SPOTS, CRIME_SPOTS, DEEDS, type AtmSpot, type CrimeSpot, type Deed } from "./rp";
import { attachScenicHeat, scenicHeat } from "./utilities";
import {
  houseMapMarks,
  mountHouses,
  nearestHouse,
  paintHouseLot,
  type HouseLot,
  type HouseState,
} from "./house";
import { corpseProp, countyBodies } from "./corpses";
import { injuredProp, tickInjured, countyInjured } from "./injured";
import { mountStreetFurniture, nearestStreet, tickStreet, type StreetSpot } from "./street";
import { matLib, type QcMat } from "./materials";
import { findLightbar, type LightbarHandle, type LightbarOpts } from "./lightbar";
import { QuebecPoliceSirens } from "./police";
import { setCommerceEnvNight } from "./commerceMats";
import { createSunCsm, disposeCsm, setCsmEnabled, applySun, wireCsmTree } from "./csm";
import { skySnap, type SkySnap } from "./sky";
import { WeatherFx } from "./weatherfx";
import { SnowPlowField } from "./plows";
import { quebecSeasons } from "./seasons";
import type { SolidBox } from "./physics";
import { buildCenterLine, buildIntersectionPad, buildRoadRibbon, buildRoadSidewalks, sampleRoad } from "./roads";
import { buildRoadFurniture } from "./furniture";
import { animatePrison, buildPrisonComplex, type BuiltPrison } from "./prison";
import { makeRng } from "./rng";
import { WildlifeSystem } from "./wildlife";
import { PedSystem } from "./peds";
import { WorldItemField } from "./worlditems";
import { useGameStore } from "./store";
import { parseFogColor, pickTrafficKind, worldConfig } from "./worldconfig";
import { buildCity, type CityDoor } from "./city";
import { type SwingDoor } from "./door";
import {
  A40_EXITS,
  A40_Z,
  CITY_GRIDS,
  cityLotLocal,
  citySpecialLots,
  cityToWorld,
  deedOffStreet,
  getTerrainHeight,
  isCityVillage,
  isNearVillage,
  LAKES,
  MAPLE_LEAVES,
  PAPETERIE,
  PRISON,
  pushOffRoad,
  RIVER_Z,
  ROAD_138_Z,
  ROAD_JUNCTIONS,
  ROADS,
  SPAWN,
  SQ_JAIL,
  villageCivicSpot,
  villageHouseLots,
  VILLAGES,
  WORLD,
} from "./worlddata";

// Fonction utilitaire pour générer des pins réalistes autour du pénitencier
function createProceduralPine(height: number): THREE.Group {
  const group = new THREE.Group();
  
  // Tronc en bois texturé
  const trunkHeight = height * 0.3;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.16, trunkHeight, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a2f13, roughness: 0.9, metalness: 0.1 })
  );
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);
  
  // Feuillage en cône vert foncé (style sapin des Laurentides)
  const leavesHeight = height * 0.85;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(height * 0.32, leavesHeight, 6),
    new THREE.MeshStandardMaterial({ color: 0x143118, roughness: 0.8, metalness: 0.1 })
  );
  leaves.position.y = trunkHeight + (leavesHeight / 2) - 0.1;
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  group.add(leaves);
  
  return group;
}

export class PortneufWorld {
  group = new THREE.Group();
  traffic: Array<{
    mesh: THREE.Group;
    road: (typeof ROADS)[number];
    roadId: string;
    roadLen: number;
    t: number;
    dir: 1 | -1;
    speed: number;
    targetSpeed: number;
    offset: number;
    length: number;
    isPolice: boolean;
    chasing: boolean;
    bars: THREE.Mesh[];
    lightbar: LightbarHandle | null;
  }> = [];
  private parkedSq: THREE.Group[] = [];
  private forestChunks: THREE.Group[] = [];
  private lodNodes: Array<{ obj: THREE.Object3D; x: number; z: number; r: number }> = [];
  private animLakes: THREE.Mesh[] = [];
  private animBoats: THREE.Object3D[] = [];
  private animSails: THREE.Object3D[] = [];
  private animMarmite: THREE.Mesh[] = [];
  private liveRoots: THREE.Object3D[] = [];
  private lodAcc = 0;
  private river: THREE.Mesh | null = null;
  private hemi: THREE.HemisphereLight;
  private ambient: THREE.AmbientLight;
  private night = false;
  private weather: "clear" | "rain" | "snow" | "fog" | "storm" | "blizzard" = "clear";
  private lamps: THREE.Mesh[] = [];
  doors: CityDoor[] = [];
  swingDoors: SwingDoor[] = [];
  shops: ShopSpot[] = [];
  atms: AtmSpot[] = [];
  caisses: Array<{ id: string; name: string; villageId: string; x: number; z: number; yaw: number; mesh: THREE.Group }> = [];
  deeds: Deed[] = [];
  crimes: CrimeSpot[] = [];
  street: StreetSpot[] = [];
  firms: CountyFirm[] = [];
  fields: FieldPlot[] = [];
  herd: Stock[] = [];
  sugar: SugarBush[] = [];
  houses: HouseLot[] = [];
  private streetGroup: THREE.Group | null = null;
  leaves: Array<{ id: string; mesh: THREE.Group; x: number; z: number; collected: boolean }> = [];
  wildlife = new WildlifeSystem();
  peds = new PedSystem();
  worldItems = new WorldItemField();
  solids: SolidBox[] = [];
  private lastSkyHours = -1;
  private sky: SkySnap | null = null;
  private zoneFog = 0.00155;
  private zoneFogColor = 0x8aa0a8;
  weatherFx: WeatherFx | null = null;
  plows: SnowPlowField | null = null;
  private cityTextures: THREE.Texture[] = [];
  private firmStand: THREE.Group | null = null;
  private firmKey = "";
  private prison: BuiltPrison | null = null;
  private hurtGroup = new THREE.Group();
  private raidCar: THREE.Group | null = null;
  private raidGoal = { x: 0, z: 0 };
  private raidLeft = 0;

  constructor(private scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.group.name = "PortneufWorld";
    // Réflexion céleste bleu clair (dessus) + rebond du sol vert-forêt québécois (dessous)
    this.hemi = new THREE.HemisphereLight(0x9fc3e9, 0x2e381a, 0.95);
    // Lumière d'ambiance diffuse douce
    this.ambient = new THREE.AmbientLight(0xd4e3e8, 0.18);
    this.scene.add(this.group, this.hemi, this.ambient);
    createSunCsm(camera, this.scene);
    // Brouillard volumétrique réaliste sur les collines des Laurentides (0x879fb5)
    this.scene.fog = new THREE.FogExp2(0x879fb5, 0.00125);
    this.scene.background = new THREE.Color(0x879fb5);
  }

  build() {
    this.buildTerrain();
    this.buildRiver();
    this.buildLakes();
    for (let i = 0; i < ROADS.length; i++) {
      const road = ROADS[i];
      const div = road.kind === "ramp" ? 14 : road.kind === "highway" ? 48 : road.kind === "village" || road.kind === "rural" ? 36 : 28;
      this.group.add(buildRoadRibbon(road, div));
      const line = buildCenterLine(road, road.kind === "village" ? 36 : 50);
      if (line) this.group.add(line);
      if (road.id === "quai_portneuf" || road.id === "portneuf_quai_ns" || road.id.startsWith("rue_")) {
        this.group.add(buildRoadSidewalks(road, road.id.startsWith("rue_") ? 22 : 18));
      }
    }
    for (let i = 0; i < ROAD_JUNCTIONS.length; i++) {
      const j = ROAD_JUNCTIONS[i];
      this.group.add(buildIntersectionPad(j.x, j.z, j.size));
    }
    this.buildForests();
    this.buildSettlements();
    this.buildLandmarks();
    this.buildRoadSigns();
    this.buildInterchanges();
    this.buildTraffic();
    this.buildStreetlights();
    this.buildHydroPoles();
    buildRoadFurniture(this.group);
    this.buildMaples();
    this.buildLeaves();
    this.wildlife.build();
    this.group.add(this.wildlife.group);
    this.peds.build();
    this.group.add(this.peds.group);
    this.worldItems.build(useGameStore.getState().lootedItems ?? []);
    this.group.add(this.worldItems.group);
    this.collectSolids();
    wireCsmTree(this.group);
    this.collectAnims();
    this.freezeStatic();
    this.weatherFx = new WeatherFx();
    this.group.add(this.weatherFx.group);
    this.plows = new SnowPlowField();
    this.group.add(this.plows.group);
    this.tickLod(new THREE.Vector3(SPAWN.x, 0, SPAWN.z));
  }

  private buildTerrain() {
    const geo = new THREE.PlaneGeometry(WORLD.width, WORLD.depth, 88, 56);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cPlaine = new THREE.Color(0x5a7a42);
    const cAgr = new THREE.Color(0x7a8a4a);
    const cForet = new THREE.Color(0x3a5a34);
    const cMont = new THREE.Color(0x6a6258);
    const cRive = new THREE.Color(0x8a8270);
    const ox = (WORLD.minX + WORLD.maxX) / 2;
    const oz = (WORLD.minZ + WORLD.maxZ) / 2;
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + ox;
      const wz = pos.getZ(i) + oz;
      const h = getTerrainHeight(wx, wz);
      pos.setY(i, h);
      if (wz > RIVER_Z - 45) tmp.copy(cRive);
      else if (h > 42) tmp.copy(cMont);
      else if (h > 16) tmp.copy(cForet).lerp(cMont, (h - 16) / 26);
      else if (wz < -300) tmp.copy(cAgr).lerp(cForet, Math.min(1, (-wz - 300) / 280));
      else tmp.copy(cPlaine).lerp(cAgr, Math.abs(Math.sin(wx * 0.004) * Math.cos(wz * 0.005)));
      tmp.offsetHSL(0, 0, Math.sin(wx * 0.03) * Math.cos(wz * 0.028) * 0.03);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true,
      }),
    );
    mesh.position.set(ox, 0, oz);
    mesh.receiveShadow = true;
    mesh.name = "terrain";
    this.group.add(mesh);
  }

  private buildRiver() {
    const geo = new THREE.PlaneGeometry(WORLD.width + 300, 280, 24, 4);
    geo.rotateX(-Math.PI / 2);
    this.river = new THREE.Mesh(
      geo,
      matLib.water(0x2a4a68, 0.9),
    );
    this.river.position.set(0, -1.15, RIVER_Z + 120);
    this.river.receiveShadow = true;
    this.group.add(this.river);
  }

  private buildLakes() {
    for (let i = 0; i < LAKES.length; i++) {
      const lake = LAKES[i];
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(lake.r, 28),
        matLib.water(0x1a4a60, 0.9),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(lake.x, getTerrainHeight(lake.x, lake.z) - 0.4, lake.z);
      mesh.userData.isLakeWater = true;
      this.group.add(mesh);
      this.animLakes.push(mesh);
    }
  }

  private buildForests() {
    const rng = makeRng(77);
    const chunk = 380;
    const per = 220;
    const clearings = [...farmClearings(), ...sugarClearings()];
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 3.2, 5);
    const coneGeo = new THREE.ConeGeometry(1.9, 7.2, 6);
    const trunkMat = matLib.get(0x4a3828, 0.98);
    const coneMat = matLib.get(0x24422c, 1, 0);
    for (let cx = WORLD.minX; cx < WORLD.maxX; cx += chunk) {
      for (let cz = WORLD.minZ; cz < -300; cz += chunk) {
        const dummy = new THREE.Object3D();
        const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, per);
        const cones = new THREE.InstancedMesh(coneGeo, coneMat, per);
        let placed = 0;
        for (let i = 0; i < per; i++) {
          const x = cx + rng() * chunk;
          const z = cz + rng() * chunk;
          if (Math.abs(z - A40_Z) < 40) continue;
          if (A40_EXITS.some((ex) => Math.hypot(x - ex.x, z - A40_Z) < 90)) continue;
          if (isNearVillage(x, z, 160)) continue;
          if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
          if (LAKES.some((l) => Math.hypot(x - l.x, z - l.z) < l.r + 12)) continue;
          const y = getTerrainHeight(x, z);
          const s = 0.65 + rng() * 0.85;
          dummy.position.set(x, y + 1.5 * s, z);
          dummy.scale.setScalar(s);
          dummy.rotation.y = rng() * Math.PI;
          dummy.updateMatrix();
          trunks.setMatrixAt(placed, dummy.matrix);
          dummy.position.set(x, y + 5.8 * s, z);
          dummy.updateMatrix();
          cones.setMatrixAt(placed, dummy.matrix);
          placed++;
        }
        if (placed === 0) continue;
        trunks.count = placed;
        cones.count = placed;
        trunks.instanceMatrix.needsUpdate = true;
        cones.instanceMatrix.needsUpdate = true;
        cones.castShadow = true;
        trunks.computeBoundingSphere();
        cones.computeBoundingSphere();
        trunks.frustumCulled = true;
        cones.frustumCulled = true;
        const g = new THREE.Group();
        g.add(trunks, cones);
        g.userData.center = new THREE.Vector3(cx + chunk / 2, 0, cz + chunk / 2);
        g.userData.shadow = true;
        this.forestChunks.push(g);
        this.group.add(g);
      }
    }
  }

  private placeOnGround(obj: THREE.Object3D, x: number, z: number, rotY = 0, lod = 520) {
    obj.position.set(x, getTerrainHeight(x, z), z);
    obj.rotation.y = rotY;
    this.group.add(obj);
    if (lod > 0) this.lodNodes.push({ obj, x, z, r: lod });
  }

  private addDriveway(x: number, z: number, yaw: number, setback: number) {
    const len = Math.min(14, Math.max(7, setback - 10));
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.05, len),
      matLib.get(0x5a5348, 1, 0),
    );
    pad.receiveShadow = true;
    const mx = x + fx * (len / 2 + 3.6);
    const mz = z + fz * (len / 2 + 3.6);
    pad.position.set(mx, getTerrainHeight(mx, mz) + 0.03, mz);
    pad.rotation.y = yaw;
    this.group.add(pad);
  }

  placeFirm(firm: Firm | null) {
    const key = firm ? `${firm.id}:${Math.round(firm.x)}:${Math.round(firm.z)}` : "";
    if (key === this.firmKey) return;
    if (this.firmStand) this.group.remove(this.firmStand);
    this.firmStand = null;
    this.firmKey = key;
    if (!firm) return;
    this.firmStand = buildFirmBuilding(firm.type);
    this.placeOnGround(this.firmStand, firm.x, firm.z, 0);
  }

  private buildSettlements() {
    const rng = makeRng(1867);
    for (let i = 0; i < VILLAGES.length; i++) {
      const v = VILLAGES[i];
      const [cx, cz] = v.center;
      const urban = isCityVillage(v.name);

      if (v.id === "portneuf") {
        const sq = pushOffRoad(SQ_JAIL.x, SQ_JAIL.z, 10);
        const cruiser = buildPolice();
        this.placeOnGround(cruiser, sq.x + 8.5, sq.z + 6.5, 1.2);
        cruiser.position.y += 0.35;
        this.parkedSq.push(cruiser);
        const poste = buildSqPoste();
        this.placeOnGround(poste, sq.x, sq.z, 0.2);
        this.parkedSq.push(poste);
      }

      if (urban) {
        const grid = CITY_GRIDS.find((g) => g.name === v.name);
        if (grid) {
          const slot = citySpecialLots(grid).depanneur;
          const lot = cityLotLocal(grid, slot.col, slot.row);
          const w = cityToWorld(grid, lot.cx, lot.cz);
          this.shops.push({
            id: `shop_${v.id}`,
            name: shopNameFor(v),
            villageId: v.id,
            kind: "depanneur",
            x: w.x,
            z: w.z,
            yaw: Math.PI,
            hours: depHoursLabel(),
          });
          if (grid.gridSize < 5) {
            const half = (grid.gridSize * (grid.blockSize + grid.streetWidth)) / 2 + 16;
            const raw = pushOffRoad(grid.center[0] - half, grid.center[1], 16);
            this.placeOnGround(buildCemetery(24, 30, v.population + 5), raw.x, raw.z, 0, 400);
          }
        }
      }

      if (!urban) {
        const churchSpot = villageCivicSpot(v, "church");
        const church = buildEglise(v.population, 0);
        church.scale.setScalar(v.churchScale);
        this.placeOnGround(church, churchSpot.x, churchSpot.z, churchSpot.yaw);

        const cemSpot = villageCivicSpot(v, "cemetery");
        const cem = buildCemetery(26, 32, v.population + 7);
        this.placeOnGround(cem, cemSpot.x, cemSpot.z, cemSpot.yaw, 380);

        const parkSpot = villageCivicSpot(v, "park");
        const green = buildPark(20, 20, v.population + 19);
        this.placeOnGround(green, parkSpot.x, parkSpot.z, parkSpot.yaw, 360);

        const shopPos = villageCivicSpot(v, "shop");
        const dep = buildDepanneur(v.population + 3, 0);
        this.placeOnGround(dep, shopPos.x, shopPos.z, shopPos.yaw);
        const swings = (dep.userData.swings as SwingDoor[] | undefined) ?? [];
        this.swingDoors.push(...swings);
        this.shops.push({
          id: `shop_${v.id}`,
          name: shopNameFor(v),
          villageId: v.id,
          kind: "depanneur",
          x: shopPos.x,
          z: shopPos.z,
          yaw: shopPos.yaw,
          hours: depHoursLabel(),
        });
        const door = shopDoorOffset(shopPos);
        this.doors.push({
          id: `shop_${v.id}`,
          name: shopNameFor(v),
          kind: "depanneur",
          x: door.x,
          y: getTerrainHeight(door.x, door.z),
          z: door.z,
          yaw: door.yaw,
          prompt: `Entrer · ${shopNameFor(v)}`,
        });

        if (v.population > 2000) {
          const school = buildEcole(v.population, 0);
          const sp = villageCivicSpot(v, "school");
          this.placeOnGround(school, sp.x, sp.z, sp.yaw);
        }

        {
          const spot = villageCivicSpot(v, "caisse");
          const built = buildCaissePopulaire(v.name);
          this.placeOnGround(built.root, spot.x, spot.z, spot.yaw, 640);
          this.swingDoors.push(...built.swings);
          this.caisses.push({
            id: `caisse_${v.id}`,
            name: caisseNameFor(v.name),
            villageId: v.id,
            x: spot.x,
            z: spot.z,
            yaw: spot.yaw,
            mesh: built.root,
          });
          const door = worldOffset(spot, spot.yaw, built.entrance.x, built.entrance.z);
          this.doors.push({
            id: `caisse_${v.id}`,
            name: caisseNameFor(v.name),
            kind: "caisse",
            x: door.x,
            y: getTerrainHeight(door.x, door.z),
            z: door.z,
            yaw: spot.yaw,
            prompt: `Entrer · ${caisseNameFor(v.name)}`,
          });
          for (let j = 0; j < built.atms.length; j++) {
            const a = built.atms[j];
            const p = worldOffset(spot, spot.yaw, a.x, a.z);
            this.atms.push({ id: a.id, name: caisseNameFor(v.name), x: p.x, z: p.z });
          }
        }

        const lots = villageHouseLots(v);
        for (let j = 0; j < lots.length; j++) {
          const lot = lots[j];
          const house = buildMaisonCanadienne(v.population + Math.round(lot.x + lot.z), 0);
          const rural = v.population < 2800 || v.industry === "agriculture" || v.industry === "foresterie" || v.industry === "acericole";
          attachScenicHeat(house, scenicHeat(Math.round(lot.x * 13 + lot.z), rural), lot.yaw);
          this.placeOnGround(house, lot.x, lot.z, lot.yaw);
          this.addDriveway(lot.x, lot.z, lot.yaw, 16);
          this.solids.push({
            id: `vh-${v.id}-${lot.x | 0}-${lot.z | 0}`,
            x: lot.x,
            y: getTerrainHeight(lot.x, lot.z) + 3.1,
            z: lot.z,
            hx: 4.1,
            hy: 3.1,
            hz: 4.5,
            yaw: lot.yaw,
          });
        }
      }

      if (v.sugarShackCount > 0 && (v.id === "saint_casimir" || v.id === "saint_alban" || v.id === "deschambault")) {
        for (let i = 0; i < Math.min(v.sugarShackCount, 4); i++) {
          const shack = buildCabaneSucre(30 + i + v.population);
          const p = pushOffRoad(cx + 180 + i * 40, cz - 160 - i * 30, 8);
          this.placeOnGround(shack, p.x, p.z, rng() * 3);
        }
      }
    }

    for (let i = 0; i < LANDMARK_SHOPS.length; i++) {
      const s = LANDMARK_SHOPS[i];
      const pos = pushOffRoad(s.x, s.z, 14);
      const mesh =
        s.kind === "food"
          ? buildCasseCroute()
          : s.kind === "clothing"
            ? buildBoutique()
            : s.kind === "quincaillerie"
              ? buildQuincaillerie()
              : s.kind === "sqdc"
                ? buildSqdc()
                : buildChasseShop();
      this.placeOnGround(mesh, pos.x, pos.z, s.yaw);
      this.shops.push({ ...s, x: pos.x, z: pos.z });
      if (s.kind === "clothing" || s.kind === "food" || s.kind === "sqdc") {
        const swings = (mesh.userData.swings as SwingDoor[] | undefined) ?? [];
        this.swingDoors.push(...swings);
        const front = s.kind === "food" ? 4.55 : s.kind === "sqdc" ? 4.65 : 4.75;
        const dx = Math.sin(s.yaw) * front;
        const dz = Math.cos(s.yaw) * front;
        this.doors.push({
          id: s.id,
          name: s.name,
          kind: s.kind === "food" ? "casse" : s.kind === "sqdc" ? "sqdc" : "boutique",
          x: pos.x + dx,
          y: getTerrainHeight(pos.x, pos.z),
          z: pos.z + dz,
          yaw: s.yaw,
          prompt: s.kind === "food" ? `Entrer · ${s.name}` : s.kind === "sqdc" ? `Entrer · ${s.name}` : "Entrer · Boutique Éther",
        });
      }
    }
    const qx = A40_EXITS[3]!.x - 72;
    const tools = pushOffRoad(qx, 50, 6);
    this.placeOnGround(buildBoiteOutils(), tools.x + 8, tools.z, 0.5);
    this.placeOnGround(buildPelle(), tools.x - 7, tools.z + 1, 0.2);
    this.placeOnGround(buildRateau(), tools.x - 9, tools.z - 2, -0.4);

    for (let i = 0; i < ATM_SPOTS.length; i++) {
      const a = ATM_SPOTS[i];
      if (a.id !== "atm_sq") continue;
      const p = pushOffRoad(a.x, a.z, 7);
      this.placeOnGround(buildAtm(), p.x, p.z, 0.2);
      this.atms.push({ ...a, x: p.x, z: p.z });
    }
    for (let i = 0; i < DEEDS.length; i++) {
      const d = DEEDS[i];
      const p = deedOffStreet(d.x, d.z, d.town);
      this.deeds.push({ ...d, x: p.x, z: p.z });
    }
    this.houses = mountHouses(this.group, this.deeds);
    for (let i = 0; i < this.houses.length; i++) {
      const h = this.houses[i];
      this.lodNodes.push({ obj: h.group, x: h.x, z: h.z, r: 420 });
    }

    for (let i = 0; i < this.houses.length; i++) {
      const h = this.houses[i];
      const first = h.group.children[0];
      const fp = (first?.userData?.footprint as { width: number; depth: number } | undefined) ?? { width: 8, depth: 8 };
      const tr = makeRng(h.deedId.length * 31 + 7);
      const spots: Array<[number, number, number]> = [
        [-(fp.width / 2 + 2.4), -(1.2 + fp.depth / 2 + 1.15), 4.4 + tr() * 1.4],
        [fp.width / 2 + 2.4, -(1.2 + fp.depth / 2 + 0.9), 4.2 + tr() * 1.6],
        [-(fp.width / 2 + 3.2), fp.depth / 2 - 1.0, 4.0 + tr() * 1.2],
      ];
      for (let j = 0; j < spots.length; j++) {
        const [tx, tz, th] = spots[j];
        const tree = createProceduralPine(th);
        this.placeOnGround(tree, h.x + tx, h.z + tz, tr() * Math.PI * 2);
      }
    }
    for (let i = 0; i < CRIME_SPOTS.length; i++) {
      const c = CRIME_SPOTS[i];
      this.placeOnGround(buildCrimeCorner(), c.x, c.z, 0.1);
      this.crimes.push(c);
    }
    const bodies = countyBodies();
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      this.placeOnGround(corpseProp(b.pose), b.x, b.z, b.yaw);
    }
    this.hurtGroup.name = "injured-npcs";
    this.group.add(this.hurtGroup);
    const injuredSpots = countyInjured();
    for (let i = 0; i < injuredSpots.length; i++) {
      const h = injuredSpots[i];
      const g = injuredProp(h.clip);
      g.position.set(h.x, getTerrainHeight(h.x, h.z), h.z);
      g.rotation.y = h.yaw;
      this.hurtGroup.add(g);
    }

    const street = mountStreetFurniture(this.group);
    this.streetGroup = street.group;
    this.street = street.spots;
    this.fields = mountFarms(this.group);
    this.herd = mountHerd(this.group);
    this.sugar = mountSugarbush(this.group);

    const firms = countyFirms();
    this.firms = firms;
    for (let i = 0; i < firms.length; i++) {
      const f = firms[i];
      const p = pushOffRoad(f.x, f.z, 14);
      f.x = p.x;
      f.z = p.z;
      const mesh = buildFirmBuilding(f.type);
      this.placeOnGround(mesh, f.x, f.z, f.yaw);
      const kind = shopKindForFirm(f.type);
      if (kind) {
        this.shops.push({
          id: f.id,
          name: f.name,
          villageId: f.villageId,
          kind,
          x: f.x,
          z: f.z,
          yaw: f.yaw,
          hours: "8 h – 20 h",
        });
      }
    }

    this.buildTowns();
  }

  private buildTowns() {
    for (let i = 0; i < CITY_GRIDS.length; i++) {
      const s = CITY_GRIDS[i];
      const city = buildCity({
        center: s.center,
        gridSize: s.gridSize,
        blockSize: s.blockSize,
        streetWidth: s.streetWidth,
        density: s.density,
        seed: s.seed,
        villageName: s.name,
        id: s.id,
      });
      this.group.add(city.group);
      this.lodNodes.push({ obj: city.group, x: s.center[0], z: s.center[1], r: 640 });
      this.doors.push(...city.doors);
      this.swingDoors.push(...city.swings);
      this.cityTextures.push(...city.textures);
      for (let j = 0; j < city.doors.length; j++) {
        const d = city.doors[j];
        if (d.kind !== "caisse") continue;
        this.caisses.push({
          id: d.id,
          name: d.name,
          villageId: s.id,
          x: d.x,
          z: d.z,
          yaw: d.yaw,
          mesh: city.group,
        });
        for (const lx of [-2.2, 2.2]) {
          const p = worldOffset({ x: d.x, z: d.z }, d.yaw, lx, -1.7);
          this.atms.push({ id: `${d.id}_${lx > 0 ? 1 : 0}`, name: d.name, x: p.x, z: p.z });
        }
      }
    }
  }

  private buildLandmarks() {
    const gorge = buildGorge(200, 0.32);
    this.placeOnGround(gorge, -840, -200, 0.4);
    const pont = buildPontDeFer(38);
    this.placeOnGround(pont, -890, -180, 0.6 + Math.PI / 2);
    const marm = buildMarmitesDeGeants(8);
    this.placeOnGround(marm, -820, -160, 0.3);
    marm.position.y -= 5.2;
    const trou = buildTrouDuDiable();
    this.placeOnGround(trou, -860, -210, 0.8);

    const eb = buildEboulis1894(260, 150, 1.1);
    this.placeOnGround(eb, -620, -580, 0);
    const cave = buildCaveEntrance("Grotte de la Coulée");
    this.placeOnGround(cave, -600, -550, 0.4);

    const plage = buildPlageParc(78);
    this.placeOnGround(plage, -520, -760, 0);
    for (let i = 0; i < 6; i++) {
      const site = buildCamping(i % 3 === 0 ? "vr" : "tente");
      const a = (i / 6) * Math.PI * 1.3;
      this.placeOnGround(site, -520 + Math.cos(a) * 110, -720 + Math.sin(a) * 70, a);
    }

    const quarry = buildQuarry();
    this.placeOnGround(quarry, -480, -200, 0);
    const moulin = buildMoulin();
    this.placeOnGround(moulin, -460, 72, 0.2);
    this.placeOnGround(buildPapeterie(), PAPETERIE.x, PAPETERIE.z, 0.08);

    const x261 = A40_EXITS[3]!.x;
    this.placeOnGround(buildMarina(), x261, 74, 0);
    this.group.add(buildIntersectionPad(x261, 54, 10.5));
    this.group.add(buildIntersectionPad(x261, ROAD_138_Z, 12.5));

    const slabW = 135;
    const slabD = 135;
    const slabH = 14; 
    const concreteMat = new THREE.MeshStandardMaterial({ 
      color: 0x5a5d64, 
      roughness: 0.9, 
      metalness: 0.05 
    });
    
    const foundationSlab = new THREE.Mesh(new THREE.BoxGeometry(slabW, slabH, slabD), concreteMat);
    foundationSlab.name = "prison_retaining_wall";
    foundationSlab.castShadow = true;
    foundationSlab.receiveShadow = true;
    
    this.placeOnGround(foundationSlab, PRISON.x, PRISON.z, 0);
    foundationSlab.position.y -= (slabH / 2) - 0.15; 
    this.group.add(foundationSlab);

    const pen = buildPrisonComplex();

    for (let angle = 0; angle < Math.PI * 2; angle += 0.22) {
      const dist = 62 + (Math.sin(angle * 5) * 8 + 6);
      const tx = PRISON.x + Math.cos(angle) * dist;
      const tz = PRISON.z + Math.sin(angle) * dist;
      if (Math.abs(angle - Math.PI / 2) > 0.35) {
        const tree = createProceduralPine(5.5 + Math.random() * 2.5);
        if (tree) this.placeOnGround(tree, tx, tz, Math.random() * Math.PI * 2);
      }
    }
    this.placeOnGround(pen.group, PRISON.x, PRISON.z, 0, 720);
    this.prison = pen;
    const doorX = PRISON.x + pen.door.x;
    const doorZ = PRISON.z + pen.door.z;
    this.doors.push({
      id: "prison_donnacona",
      name: "Établissement de Donnacona",
      kind: "prison",
      x: doorX,
      y: getTerrainHeight(doorX, doorZ),
      z: doorZ,
      yaw: pen.door.yaw,
      prompt: "Entrer · Établissement de Donnacona",
    });
    const cruiser = buildPolice();
    this.placeOnGround(cruiser, PRISON.x + 10, PRISON.z + 40, 0.4);
    cruiser.position.y += 0.35;
    this.parkedSq.push(cruiser);
  }

  private buildTraffic() {
    const sedanColors = [0xc0c0c0, 0x3a4a6a, 0x8a3030, 0x2a4a32, 0xd8d0c0, 0x4a4a50, 0xb9232e, 0xd18b2a];
    const pickupColors = [0x3a4a3c, 0x5a4030, 0x2a3a4a, 0x6a6a62];
    let i = 0;
    for (let j = 0; j < ROADS.length; j++) {
      const road = ROADS[j];
      if (road.kind === "ramp") continue;
      const mid = sampleRoad(road, 0.5);
      const zone = worldConfig.at(mid.x, mid.z);
      if (!zone.allowVehicleSpawn && road.kind !== "highway") continue;
      const density = Math.max(0.15, zone.npcDensity);
      const nBase =
        road.traffic ??
        (road.kind === "highway" ? 8 : road.kind === "regional" ? 6 : road.kind === "gravel" ? 2 : 4);
      const n = Math.max(0, Math.round(nBase * density));
      if (n <= 0) continue;
      for (let k = 0; k < n; k++) {
        const roll = (i * 19) % 10;
        const isPolice = roll === 0;
        const kind = isPolice ? "voiture" : pickTrafficKind(zone.trafficMix, i);
        const mesh = isPolice
          ? buildPolice()
          : kind === "camion"
            ? buildCamion(0xc4a030)
            : kind === "tracteur"
              ? buildTracteur(i)
              : kind === "pickup"
                ? buildPickup(pickupColors[i % pickupColors.length])
                : buildSedan(sedanColors[i % sedanColors.length]);
        i++;
        const t = (k + 0.18) / n;
        const dir: 1 | -1 = k % 2 === 0 ? 1 : -1;
        const sample = sampleRoad(road, t);
        mesh.position.set(sample.x, getTerrainHeight(sample.x, sample.z) + 0.35, sample.z);
        this.group.add(mesh);
        const bars: THREE.Mesh[] = [];
        let lightbar: LightbarHandle | null = null;
        if (isPolice) {
          lightbar = findLightbar(mesh);
          mesh.traverse((obj) => {
            if (obj.userData.policeBar && obj instanceof THREE.Mesh) bars.push(obj);
          });
        }
        const slow = kind === "tracteur" ? 0.55 : kind === "camion" ? 0.78 : roll < 3 ? 0.92 : 0.96;
        const target = (road.speed / 3.6) * (isPolice ? 1.05 : slow) * (0.88 + (k % 4) * 0.05);
        const laneOff = road.kind === "highway" ? 5.1 : road.width * 0.22;
        this.traffic.push({
          mesh,
          road,
          roadId: road.id,
          roadLen: approxLength(road.points),
          t,
          dir,
          speed: target * 0.9,
          targetSpeed: target,
          offset: dir * laneOff,
          length: kind === "camion" ? 8.4 : kind === "tracteur" ? 4.8 : roll < 3 && !isPolice ? 5.6 : 4.4,
          isPolice,
          chasing: false,
          bars,
          lightbar,
        });
      }
    }
  }

  private buildStreetlights() {
    const r138 = ROADS.find((r) => r.id === "r138");
    if (!r138) return;
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.11, 6.4, 6);
    const headGeo = new THREE.BoxGeometry(0.35, 0.12, 0.7);
    const metal = matLib.get(0x5a5e62, 0.55, 0.65);
    const bulb = matLib.getEmissive(0xffc870, 0xffc870, 0.05);
    const dummy = new THREE.Object3D();
    const count = 48;
    const poles = new THREE.InstancedMesh(poleGeo, metal, count);
    const heads = new THREE.InstancedMesh(headGeo, bulb, count);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const s = sampleRoad(r138, t);
      const nx = -s.tz;
      const nz = s.tx;
      const side = i % 2 === 0 ? 1 : -1;
      const x = s.x + nx * side * 6.2;
      const z = s.z + nz * side * 6.2;
      const y = getTerrainHeight(x, z);
      dummy.position.set(x, y + 3.2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x + nx * side * 0.9, y + 6.4, z + nz * side * 0.9);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    heads.userData.isStreetlight = true;
    this.group.add(poles, heads);
    this.lamps.push(heads);
  }

  private buildRoadSigns() {
    for (let i = 0; i < VILLAGES.length; i++) {
      const v = VILLAGES[i];
      const [cx, cz] = v.center;
      const ang = v.roadAngle;
      const arret = buildPanneauArret();
      this.placeOnGround(arret, cx + Math.cos(ang) * 18, cz + Math.sin(ang) * 18, -ang + Math.PI / 2);
      const fifty = buildPanneauVitesse(50);
      this.placeOnGround(
        fifty,
        cx - Math.cos(ang) * (v.coreRadius + 8),
        cz - Math.sin(ang) * (v.coreRadius + 8),
        -ang + Math.PI / 2,
      );
    }
    const ninety = VILLAGES.filter((v) => Math.abs(v.center[1] - ROAD_138_Z) < 40).map(
      (v) => [v.center[0], ROAD_138_Z] as [number, number],
    );
    for (let i = 0; i < ninety.length; i++) {
      const [x, z] = ninety[i];
      this.placeOnGround(buildPanneauVitesse(90), x - 40, z + 6, -Math.PI / 2);
    }
    {
      const x261 = A40_EXITS[3]!.x;
      this.placeOnGround(buildPanneauArret(), x261 + 5.2, ROAD_138_Z + 11, 0);
      this.placeOnGround(buildPanneauArret(), x261 - 5.2, ROAD_138_Z - 11, Math.PI);
      this.placeOnGround(buildPanneauArret(), x261 + 4.6, 54 + 5, 0);
      this.placeOnGround(buildPanneauVitesse(50), x261 + 6, ROAD_138_Z - 28, Math.PI);
    }
    for (let i = 0; i < A40_EXITS.length - 1; i++) {
      const a = A40_EXITS[i]!;
      const b = A40_EXITS[i + 1]!;
      const mx = (a.x + b.x) / 2;
      this.placeOnGround(buildPanneauVitesse(100), mx, A40_Z + 12, -Math.PI / 2);
    }
  }

  private buildInterchanges() {
    for (let i = 0; i < A40_EXITS.length; i++) {
      const ex = A40_EXITS[i];
      this.placeOnGround(buildOverpass(32), ex.x, A40_Z, 0);
      this.placeOnGround(buildGantrySortie(ex.no, ex.dest), ex.x - 28, A40_Z, 0);
      this.placeOnGround(buildPanneauSortie(ex.no, ex.dest), ex.x - 95, A40_Z + 14, -Math.PI / 2);
      this.placeOnGround(buildPanneauSortie(ex.no, ex.dest), ex.x + 95, A40_Z - 14, Math.PI / 2);
      this.placeOnGround(buildPanneauAutoroute(), ex.x - 170, A40_Z + 13, -Math.PI / 2);
    }
  }

  private buildHydroPoles() {
    const r138 = ROADS.find((r) => r.id === "r138");
    if (!r138) return;
    const count = 32;
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 9.2, 6);
    const armGeo = new THREE.BoxGeometry(2.6, 0.08, 0.08);
    const wood = matLib.get(0x6a5540, 0.95);
    const poles = new THREE.InstancedMesh(poleGeo, wood, count);
    const arms = new THREE.InstancedMesh(armGeo, wood, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const s = sampleRoad(r138, t);
      const nx = -s.tz;
      const nz = s.tx;
      const x = s.x + nx * 8.4;
      const z = s.z + nz * 8.4;
      const y = getTerrainHeight(x, z);
      dummy.position.set(x, y + 4.6, z);
      dummy.rotation.set(0, Math.atan2(s.tx, s.tz), 0);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, y + 8.6, z);
      dummy.updateMatrix();
      arms.setMatrixAt(i, dummy.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
    poles.castShadow = true;
    poles.computeBoundingSphere();
    arms.computeBoundingSphere();
    this.group.add(poles, arms);
  }

  private buildMaples() {
    const rng = makeRng(1867);
    const count = 90;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 4.2, 6);
    const canopyGeo = new THREE.SphereGeometry(2.4, 7, 6);
    const trunkMat = matLib.get(0x4a3020, 0.95);
    const leafMat = matLib.get(0x2d6a30, 0.95);
    const autumnMat = matLib.get(0xc84a20, 0.95);
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leavesA = new THREE.InstancedMesh(canopyGeo, leafMat, count);
    const leavesB = new THREE.InstancedMesh(canopyGeo, autumnMat, Math.floor(count / 3));
    const dummy = new THREE.Object3D();
    let n = 0;
    let nA = 0;
    for (let i = 0; i < 220 && n < count; i++) {
      const x = WORLD.minX + 80 + rng() * (WORLD.width - 160);
      const z = -240 + rng() * 280;
      if (Math.abs(z - A40_Z) < 36) continue;
      if (Math.abs(z - 4) < 22) continue;
      if (A40_EXITS.some((ex) => Math.hypot(x - ex.x, z - A40_Z) < 110)) continue;
      if (isNearVillage(x, z, 90)) continue;
      const y = getTerrainHeight(x, z);
      const s = 0.7 + rng() * 0.7;
      dummy.position.set(x, y + 2.1 * s, z);
      dummy.scale.setScalar(s);
      dummy.rotation.y = rng() * Math.PI;
      dummy.updateMatrix();
      trunks.setMatrixAt(n, dummy.matrix);
      dummy.position.set(x, y + 4.6 * s, z);
      dummy.updateMatrix();
      leavesA.setMatrixAt(n, dummy.matrix);
      if (rng() > 0.72 && nA < leavesB.count) {
        dummy.position.set(x + 0.7 * s, y + 5.1 * s, z + 0.4 * s);
        dummy.scale.setScalar(s * 0.55);
        dummy.updateMatrix();
        leavesB.setMatrixAt(nA, dummy.matrix);
        nA++;
      }
      n++;
    }
    trunks.count = n;
    leavesA.count = n;
    leavesB.count = nA;
    trunks.instanceMatrix.needsUpdate = true;
    leavesA.instanceMatrix.needsUpdate = true;
    leavesB.instanceMatrix.needsUpdate = true;
    trunks.castShadow = true;
    trunks.computeBoundingSphere();
    leavesA.computeBoundingSphere();
    leavesB.computeBoundingSphere();
    this.group.add(trunks, leavesA, leavesB);
  }

  private buildLeaves() {
    for (let i = 0; i < MAPLE_LEAVES.length; i++) {
      const def = MAPLE_LEAVES[i];
      const g = new THREE.Group();
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        matLib.getEmissive(0xc84a20, 0xe07a28, 0.7),
      );
      gem.castShadow = false;
      g.add(gem);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.55, 16),
        new THREE.MeshBasicMaterial({ color: 0xc84a20, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.35;
      g.add(ring);
      const y = getTerrainHeight(def.x, def.z) + 0.85;
      g.position.set(def.x, y, def.z);
      this.group.add(g);
      this.leaves.push({ id: def.id, mesh: g, x: def.x, z: def.z, collected: false });
    }
  }

  nearestDoor(x: number, z: number, max = 4.5): CityDoor | null {
    let best: CityDoor | null = null;
    let bestD = max;
    for (let i = 0; i < this.doors.length; i++) {
      const d = this.doors[i];
      const dist = Math.sqrt((x - d.x)**2 + (z - d.z)**2);
      if (dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
    return best;
  }

  nearestShop(x: number, z: number, max = 8): ShopSpot | null {
    let best: ShopSpot | null = null;
    let bestD = max;
    for (let i = 0; i < this.shops.length; i++) {
      const s = this.shops[i];
      const dist = Math.sqrt((x - s.x)**2 + (z - s.z)**2);
      if (dist < bestD) {
        best = s;
        bestD = dist;
      }
    }
    return best;
  }

  nearestAtm(x: number, z: number, max = 4.5): AtmSpot | null {
    let best: AtmSpot | null = null;
    let bestD = max;
    for (let i = 0; i < this.atms.length; i++) {
      const a = this.atms[i];
      const dist = Math.sqrt((x - a.x)**2 + (z - a.z)**2);
      if (dist < bestD) {
        best = a;
        bestD = dist;
      }
    }
    return best;
  }

  nearestCaisse(x: number, z: number, max = 9): (typeof this.caisses)[number] | null {
    let best: (typeof this.caisses)[number] | null = null;
    let bestD = max;
    for (let i = 0; i < this.caisses.length; i++) {
      const c = this.caisses[i];
      const dist = Math.sqrt((x - c.x)**2 + (z - c.z)**2);
      if (dist < bestD) {
        best = c;
        bestD = dist;
      }
    }
    return best;
  }

  nearestStreet(x: number, z: number, max = 3.6, kind?: StreetSpot["kind"]): StreetSpot | null {
    return nearestStreet(this.street, x, z, max, kind);
  }

  nearestCountyFirm(x: number, z: number, max = 9): CountyFirm | null {
    return nearestCountyFirm(this.firms, x, z, max);
  }

  nearestField(x: number, z: number, max = 14): FieldPlot | null {
    return nearestField(this.fields, x, z, max);
  }

  tickFields(dt: number, elapsed: number, x: number, z: number): FieldPlot | null {
    return tickFields(this.fields, dt, elapsed, x, z);
  }

  nearestStock(x: number, z: number, max = 3.4): Stock | null {
    return nearestStock(this.herd, x, z, max);
  }

  nearestTap(x: number, z: number, max = 2.6): SugarTap | null {
    return (nearestTap as any)(this.sugar, x, z, max);
  }

  nearestEvap(x: number, z: number, max = 3.4): SugarEvap | null {
    return (nearestEvap as any)(this.sugar, x, z, max);
  }

  nearestBush(x: number, z: number, max = 36): SugarBush | null {
    return (nearestBush as any)(this.sugar, x, z, max);
  }

  dispatchFarmRaid(x: number, z: number) {
    if (!this.raidCar) {
      this.raidCar = buildPolice();
      this.raidCar.name = "sq-farm-raid";
      this.group.add(this.raidCar);
    }
    const dx = x - SQ_JAIL.x;
    const dz = z - SQ_JAIL.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const sx = x - (dx / len) * 80;
    const sz = z - (dz / len) * 80;
    this.raidCar.position.set(sx, getTerrainHeight(sx, sz) + 0.35, sz);
    this.raidCar.visible = true;
    this.raidGoal = { x, z };
    this.raidLeft = 16;
  }

  private tickFarmRaid(dt: number, elapsed: number) {
    if (!this.raidCar || this.raidLeft <= 0) {
      if (this.raidCar) this.raidCar.visible = false;
      return;
    }
    this.raidLeft -= dt;
    const car = this.raidCar;
    const dx = this.raidGoal.x - car.position.x;
    const dz = this.raidGoal.z - car.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    if (dist > 7) {
      const sp = 22;
      const nx = car.position.x + (dx / dist) * sp * dt;
      const nz = car.position.z + (dz / dist) * sp * dt;
      car.position.set(nx, getTerrainHeight(nx, nz) + 0.35, nz);
      car.lookAt(this.raidGoal.x, car.position.y, this.raidGoal.z);
    }
    car.traverse((obj) => {
      if (obj.userData.policeBar && obj instanceof THREE.Mesh) {
        const mat = obj.material as QcMat;
        mat.emissive.setHex(elapsed % 0.22 < 0.11 ? 0x1d4ed8 : 0xb91c1c);
        mat.emissiveIntensity = 2.2;
      }
    });
    findLightbar(car)?.tick(elapsed, this.barOpts(true, true));
  }

  nearFire(x: number, z: number, max = 3.8): boolean {
    return Boolean(nearestStreet(this.street, x, z, max, "campfire"));
  }

  nearestDeed(x: number, z: number, max = 5): Deed | null {
    let best: Deed | null = null;
    let bestD = max;
    for (let i = 0; i < this.deeds.length; i++) {
      const d = this.deeds[i];
      const dist = Math.sqrt((x - d.x)**2 + (z - d.z)**2);
      if (dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
    return best;
  }

  nearestHouseHot(x: number, z: number, max = 16) {
    return nearestHouse(this.houses, x, z, max);
  }

  syncHouses(owned: string[], states: Record<string, HouseState>) {
    for (let i = 0; i < this.houses.length; i++) {
      const lot = this.houses[i];
      paintHouseLot(lot, owned.includes(lot.deedId), states[lot.deedId]);
    }
  }

  houseMarks(owned: string[]) {
    return houseMapMarks(this.houses, owned);
  }

  nearestCrime(x: number, z: number, max = 4.8): CrimeSpot | null {
    let best: CrimeSpot | null = null;
    let bestD = max;
    for (let i = 0; i < this.crimes.length; i++) {
      const c = this.crimes[i];
      const dist = Math.sqrt((x - c.x)**2 + (z - c.z)**2);
      if (dist < bestD) {
        best = c;
        bestD = dist;
      }
    }
    return best;
  }

  nearestLeaf(x: number, z: number, max = 2.2) {
    let best: (typeof this.leaves)[number] | null = null;
    let bestD = max;
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      if (leaf.collected) continue;
      const dist = Math.sqrt((x - leaf.x)**2 + (z - leaf.z)**2);
      if (dist < bestD) {
        best = leaf;
        bestD = dist;
      }
    }
    return best;
  }

  collectLeaf(id: string) {
    const leaf = this.leaves.find((l) => l.id === id);
    if (!leaf || leaf.collected) return false;
    leaf.collected = true;
    leaf.mesh.visible = false;
    return true;
  }

  markLeavesCollected(ids: string[]) {
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      if (ids.includes(leaf.id)) {
        leaf.collected = true;
        leaf.mesh.visible = false;
      }
    }
  }

  setExteriorVisible(on: boolean) {
    this.group.visible = on;
    this.hemi.visible = on;
    this.ambient.visible = on;
    setCsmEnabled(on, this.night);
  }

  update(dt: number, elapsed: number, player: THREE.Vector3, speedKmh = 0, wantedStars = 0) {
    this.lodAcc += dt;
    if (this.lodAcc > 0.2) {
      this.lodAcc = 0;
      this.tickLod(player);
    }
    if (this.prison) animatePrison(this.prison, elapsed, dt, this.night);
    tickInjured(this.hurtGroup, dt, 0);
    if (this.streetGroup) tickStreet(this.streetGroup, elapsed);
    for (let i = 0; i < this.caisses.length; i++) animateCaisse(this.caisses[i].mesh, elapsed);
    this.tickFarmRaid(dt, elapsed);
    tickHerd(this.herd, dt, elapsed);
    
    const wx = quebecSeasons.getState();
    this.weatherFx?.apply(wx);
    this.weatherFx?.tick(dt, player, !this.group.visible);
    this.plows?.tick(dt, elapsed, wx, player);
    
    this.worldItems.tick(elapsed);
    tickSugar(this.sugar as any, elapsed);

    // 🚪 MISE À JOUR DES PORTES BATTANTES
    for (let i = 0; i < this.swingDoors.length; i++) {
      const door = this.swingDoors[i];
      if (typeof (door as any).update === "function") {
        (door as any).update(dt, player);
      }
    }

    if (this.river && player.z > 10) {
      this.river.position.y = -1.15 + Math.sin(elapsed * 0.7) * 0.1;
    }
    for (let i = 0; i < this.animBoats.length; i++) {
      const boat = this.animBoats[i];
      boat.rotation.z = Math.sin(elapsed * 0.9 + boat.position.x) * 0.03;
      boat.position.y = 0.25 + Math.sin(elapsed * 0.7) * 0.06;
    }
    for (let i = 0; i < this.animSails.length; i++) {
      this.animSails[i].rotation.x += dt * 0.35;
    }

    const chaseBudget = wantedStars <= 0 ? 0 : Math.min(8, 1 + wantedStars);
    let activeChasers = 0;

    for (let i = 0; i < this.traffic.length; i++) {
      const car = this.traffic[i];
      
      if (car.isPolice && wantedStars > 0) {
        const distSq = (car.mesh.position.x - player.x)**2 + (car.mesh.position.z - player.z)**2;
        if (distSq < 160000 && activeChasers < chaseBudget) {
          car.chasing = true;
          activeChasers++;
        } else {
          car.chasing = false;
        }
      } else {
        car.chasing = false;
      }

      const road = car.road;
      const len = car.roadLen;

      if (car.chasing) {
        const px = player.x;
        const pz = player.z;
        const dx = px - car.mesh.position.x;
        const dz = pz - car.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const chaseSpeed = 18 + wantedStars * 3.4;
        car.speed = chaseSpeed;
        if (dist > 3.2) {
          const x = car.mesh.position.x + (dx / dist) * chaseSpeed * dt;
          const z = car.mesh.position.z + (dz / dist) * chaseSpeed * dt;
          car.mesh.position.set(x, getTerrainHeight(x, z) + 0.35, z);
          car.mesh.lookAt(px, car.mesh.position.y, pz);
        }
        this.flashBars(car.bars, elapsed, true);
        car.lightbar?.tick(elapsed, this.barOpts(true, true));
        continue;
      }

      const dx0 = car.mesh.position.x - player.x;
      const dz0 = car.mesh.position.z - player.z;
      const dist2 = dx0 * dx0 + dz0 * dz0;
      const far = dist2 > 160000;
      const mid = dist2 > 22000;
      
      car.t += (car.dir * (far ? car.targetSpeed : car.speed) * dt) / Math.max(1, len);
      if (car.t > 1) car.t -= 1;
      if (car.t < 0) car.t += 1;
      
      if (far) {
        if (car.mesh.visible) car.mesh.visible = false;
        continue;
      }
      if (!car.mesh.visible) car.mesh.visible = true;

      if (!mid) {
        let gap = 400;
        let deltaV = 0;
        for (let j = 0; j < this.traffic.length; j++) {
          const other = this.traffic[j];
          if (other === car || other.roadId !== car.roadId || other.dir !== car.dir) continue;
          const raw = car.dir > 0 ? other.t - car.t : car.t - other.t;
          const ahead = raw > 0 ? raw : raw + 1;
          const g = ahead * len - (car.length + other.length) * 0.5;
          if (g < gap) {
            gap = g;
            deltaV = car.speed - other.speed;
          }
        }
        const accel = idmAccel(car.speed, car.targetSpeed, gap, deltaV);
        car.speed = Math.max(1.2, Math.min(car.targetSpeed * 1.15, car.speed + accel * dt));
      }
      
      const s = sampleRoad(road, car.t);
      const x = s.x + -s.tz * car.offset;
      const z = s.z + s.tx * car.offset;
      
      car.mesh.position.set(x, getTerrainHeight(x, z) + 0.35, z);
      car.mesh.lookAt(x + s.tx * car.dir, car.mesh.position.y, z + s.tz * car.dir);
      
      if (car.bars.length > 0) this.flashBars(car.bars, elapsed, false);
      if (!mid) car.lightbar?.tick(elapsed, this.barOpts(true, false));
    }

    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      if (leaf.collected) continue;
      const ddx = leaf.x - player.x;
      const ddz = leaf.z - player.z;
      if (ddx * ddx + ddz * ddz > 90000) continue;
      leaf.mesh.rotation.y = elapsed * 1.1;
      leaf.mesh.position.y = getTerrainHeight(leaf.x, leaf.z) + 0.85 + Math.sin(elapsed * 2.1 + leaf.x) * 0.12;
    }

    this.wildlife.update(dt, player, speedKmh, wantedStars > 0);
    const hours = this.sky?.hours ?? (16.5 + elapsed / 90) % 24;
    this.peds.update(dt, player, hours);
    this.blendZoneFog(player.x, player.z);
    
    const phase = QuebecPoliceSirens.getSyncPhase();
    for (let i = 0; i < this.parkedSq.length; i++) {
      const g = this.parkedSq[i];
      const dx = g.position.x - player.x;
      const dz = g.position.z - player.z;
      if (dx * dx + dz * dz > 22000) continue;
      findLightbar(g)?.tick(elapsed, { active: true, pattern: "code1_advisor", trafficAdvisor: "split", sirenPhase: phase });
    }
  }

  applyZoneAmbience(x: number, z: number) {
    this.blendZoneFog(x, z);
  }

  private blendZoneFog(x: number, z: number) {
    const zone = worldConfig.at(x, z);
    this.zoneFog = zone.fogDensity;
    this.zoneFogColor = parseFogColor(zone.fogColor);
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (!fog) return;
    if (this.weather === "clear") {
      fog.density = this.night ? Math.max(this.zoneFog, 0.0018) : this.zoneFog;
      if (!this.night) fog.color.setHex(this.zoneFogColor);
    }
  }

  private barOpts(active: boolean, chase: boolean): LightbarOpts {
    return {
      active,
      pattern: chase ? "pursuit_hyper" : "code2_visual",
      trafficAdvisor: chase ? "split" : "off",
      takedown: chase,
      alleyLights: chase,
      sirenPhase: QuebecPoliceSirens.getSyncPhase(),
    };
  }

  private flashBars(bars: THREE.Mesh[], elapsed: number, chase: boolean) {
    const on = chase ? elapsed % 0.22 < 0.11 : elapsed % 0.6 < 0.3;
    for (let i = 0; i < bars.length; i++) {
      const mat = bars[i].material as QcMat;
      mat.emissive.setHex(on ? 0x1d4ed8 : 0xb91c1c);
      mat.emissiveIntensity = chase ? 2.2 : 0.85;
    }
  }

  private tickLod(player: THREE.Vector3) {
    const px = player.x;
    const pz = player.z;
    for (let i = 0; i < this.lodNodes.length; i++) {
      const n = this.lodNodes[i];
      const vis = Math.sqrt((px - n.x)**2 + (pz - n.z)**2) < n.r;
      if (n.obj.visible !== vis) n.obj.visible = vis;
    }
    for (let i = 0; i < this.forestChunks.length; i++) {
      const chunk = this.forestChunks[i];
      const c = chunk.userData.center as THREE.Vector3;
      const d = Math.sqrt((px - c.x)**2 + (pz - c.z)**2);
      const vis = d < 720;
      if (chunk.visible !== vis) chunk.visible = vis;
      const shadow = d < 150;
      if (chunk.userData.shadow !== shadow) {
        chunk.userData.shadow = shadow;
        const children = chunk.children;
        for (let j = 0; j < children.length; j++) {
          const child = children[j];
          if ((child as THREE.InstancedMesh).isInstancedMesh) child.castShadow = shadow;
        }
      }
    }
  }

  private collectAnims() {
    this.group.traverse((obj) => {
      if (obj.userData.isBoat) this.animBoats.push(obj);
      if (obj.userData.isMillSails) this.animSails.push(obj);
      if (obj.userData.isMarmiteWater && (obj as THREE.Mesh).isMesh) this.animMarmite.push(obj as THREE.Mesh);
    });
    if (this.river) this.liveRoots.push(this.river);
    this.liveRoots.push(this.wildlife.group, this.hurtGroup, this.peds.group);
    if (this.streetGroup) this.liveRoots.push(this.streetGroup);
    if (this.prison) this.liveRoots.push(this.prison.group);
    
    for (let i = 0; i < this.traffic.length; i++) this.liveRoots.push(this.traffic[i].mesh);
    for (let i = 0; i < this.animBoats.length; i++) this.liveRoots.push(this.animBoats[i]);
    for (let i = 0; i < this.animSails.length; i++) this.liveRoots.push(this.animSails[i]);
    for (let i = 0; i < this.leaves.length; i++) this.liveRoots.push(this.leaves[i].mesh);
    for (let i = 0; i < this.herd.length; i++) this.liveRoots.push(this.herd[i].mesh);
    for (let i = 0; i < this.sugar.length; i++) {
      const b = this.sugar[i];
      for (let j = 0; j < b.taps.length; j++) this.liveRoots.push(b.taps[j].sapMesh);
      const puffs = (b as any).evap?.steam ?? [];
      for (let j = 0; j < puffs.length; j++) this.liveRoots.push(puffs[j]);
    }
  }

  private freezeStatic() {
    this.group.updateMatrixWorld(true);
    const live = new Set<THREE.Object3D>();
    for (let i = 0; i < this.liveRoots.length; i++) {
      this.liveRoots[i].traverse((o) => live.add(o));
    }
    this.group.traverse((o) => {
      if (live.has(o)) return;
      o.matrixAutoUpdate = false;
    });
  }

  nearestPoliceDist(x: number, z: number) {
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.traffic.length; i++) {
      const car = this.traffic[i];
      if (!car.isPolice) continue;
      const d = Math.sqrt((car.mesh.position.x - x)**2 + (car.mesh.position.z - z)**2);
      if (d < best) best = d;
    }
    return best;
  }

  ramPolice(x: number, z: number, radius: number) {
    for (let i = 0; i < this.traffic.length; i++) {
      const car = this.traffic[i];
      if (!car.isPolice) continue;
      if (Math.sqrt((car.mesh.position.x - x)**2 + (car.mesh.position.z - z)**2) < radius) return true;
    }
    return false;
  }

  setNight(isNight: boolean) {
    this.setTime(isNight ? 21.6 : 11.2);
  }

  setTime(hours: number) {
    if (Math.abs(hours - this.lastSkyHours) < 0.02 && this.sky) {
      this.night = this.sky.night;
      return;
    }
    this.lastSkyHours = hours;
    const snap = skySnap(hours, this.skyWeather());
    this.sky = snap;
    this.night = snap.night;
    this.applySky(snap);
    applySun(hours, snap.sunIntensity, snap.sunColor, snap.night, this.group.visible);
    
    this.group.traverse((obj) => {
      if (obj.userData.isStreetlight) {
        const mat = (obj as THREE.InstancedMesh).material as QcMat;
        if (mat.emissive) mat.emissiveIntensity = 0.05 + snap.lamp * 1.7;
      }
      if (obj.userData.isWindow && obj instanceof THREE.Mesh) {
        const mat = obj.material as QcMat;
        if (mat.emissive) mat.emissiveIntensity = 0.08 + snap.lamp * 0.9;
      }
      if (obj.userData.headlight && obj instanceof THREE.Mesh) {
        const mat = obj.material as QcMat;
        if (mat.emissive) mat.emissiveIntensity = 0.15 + snap.lamp * 1.4;
      }
    });
    
    for (let i = 0; i < this.caisses.length; i++) {
      setCaisseNight(this.caisses[i].mesh, snap.night);
    }
  }

  setWeather(kind: "clear" | "rain" | "snow" | "fog" | "storm" | "blizzard") {
    const wx = quebecSeasons.getState();
    const skyKind =
      wx.condition === "tempete_neige" || (wx.condition === "poudrerie" && wx.windSpeedKmH > 50)
        ? "blizzard"
        : kind === "blizzard"
          ? "blizzard"
          : kind;
    this.weather = kind === "blizzard" ? "storm" : kind;
    this.lastSkyHours = -1;
    if (this.sky) this.setTime(this.sky.hours);
    else this.applySky(skySnap(this.night ? 22 : 14, skyKind));
    this.weatherFx?.apply(wx);
  }

  private skyWeather(): string {
    const c = quebecSeasons.getState().condition;
    if (c === "tempete_neige") return "blizzard";
    if (c === "poudrerie" || c === "froid_polaire") return "snow";
    if (c === "verglas") return "storm";
    if (c === "pluie_fine") return "rain";
    if (c === "orage_ete") return "storm";
    if (c === "nuageux") return "fog";
    return this.weather;
  }

  private applySky(snap?: SkySnap) {
    const s = snap ?? this.sky ?? skySnap(this.night ? 22 : 14, this.weather);
    const fog = this.scene.fog as THREE.FogExp2;
    setCommerceEnvNight(this.scene, s.night);
    this.hemi.intensity = s.hemiIntensity;
    this.hemi.color.setHex(s.hemiSky);
    this.hemi.groundColor.setHex(s.hemiGround);
    this.ambient.intensity = s.ambient;
    fog.color.setHex(s.fog);
    this.scene.background = new THREE.Color(s.bg);
    if (this.river) (this.river.material as THREE.MeshLambertMaterial).color.setHex(s.river);
    
    if (this.weather === "fog") {
      fog.density = s.night ? 0.0042 : 0.0034;
    } else if (this.weather === "rain") {
      fog.density = 0.0018;
    } else if (this.weather === "storm") {
      fog.density = 0.0026;
    } else if (this.weather === "snow" || quebecSeasons.isWinterPrecip()) {
      fog.density = quebecSeasons.getState().condition === "tempete_neige" ? 0.0038 : 0.0017;
    } else {
      fog.density = this.zoneFog;
      if (!s.night) fog.color.setHex(this.zoneFogColor);
    }
  }

  // ==========================================
  // HOLLOW BOXES (MURS CREUX POUR COMMERCES)
  // ==========================================
  private collectSolids() {
    const box = (id: string, x: number, z: number, hx: number, hy: number, hz: number, yaw = 0) => {
      this.solids.push({
        id,
        x,
        y: getTerrainHeight(x, z) + hy,
        z,
        hx,
        hy,
        hz,
        yaw,
      });
    };

    /**
     * Génère une boîte creuse (3 murs) laissant l'avant ouvert pour franchir les portes.
     */
    const hollowShopBox = (id: string, cx: number, cz: number, w: number, h: number, d: number, yaw: number) => {
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      const th = 0.6; // Épaisseur des murs (Hitbox)

      // Mur Arrière (Local +Z)
      const bx = cx + sin * ((d / 2) - (th / 2));
      const bz = cz + cos * ((d / 2) - (th / 2));
      box(`${id}_back`, bx, bz, w / 2, h, th / 2, yaw);

      // Mur Gauche (Local -X)
      const lx = cx - cos * ((w / 2) - (th / 2));
      const lz = cz + sin * ((w / 2) - (th / 2));
      box(`${id}_left`, lx, lz, th / 2, h, d / 2, yaw);

      // Mur Droit (Local +X)
      const rx = cx + cos * ((w / 2) - (th / 2));
      const rz = cz - sin * ((w / 2) - (th / 2));
      box(`${id}_right`, rx, rz, th / 2, h, d / 2, yaw);
    };

    for (let i = 0; i < this.shops.length; i++) {
      const s = this.shops[i];
      hollowShopBox(s.id, s.x, s.z, 10.4, 3.2, 13.6, s.yaw); // Ouverture de la façade
    }
    
    for (let i = 0; i < this.houses.length; i++) {
      const h = this.houses[i];
      const hx = Math.max(2.4, (h.body.maxX - h.body.minX) / 2);
      const hz = Math.max(2.4, (h.body.maxZ - h.body.minZ) / 2);
      box(h.deedId, (h.body.minX + h.body.maxX) / 2, (h.body.minZ + h.body.maxZ) / 2, hx, 3.2, hz, h.yaw);
    }
    
    for (let i = 0; i < this.firms.length; i++) {
      const f = this.firms[i];
      hollowShopBox(f.id, f.x, f.z, 12, 3.5, 14, f.yaw);
    }
    
    for (let i = 0; i < this.caisses.length; i++) {
      const c = this.caisses[i];
      hollowShopBox(c.id, c.x, c.z, 10, 3.4, 12, c.yaw);
    }
    
    box("prison", PRISON.x, PRISON.z, 28, 8, 36, 0);
    box("papeterie", PAPETERIE.x, PAPETERIE.z, 16, 8, 22, 0.08);
    box("sq", SQ_JAIL.x, SQ_JAIL.z, 7, 4, 8, 0.2);
  }

  dispose() {
    this.cityTextures.forEach((t) => t.dispose());
    this.weatherFx?.dispose();
    matLib.dispose();
    disposeCsm();
    this.scene.remove(this.group, this.hemi, this.ambient);
  }
}

function approxLength(pts: Array<[number, number]>) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.sqrt((pts[i][0] - pts[i - 1][0])**2 + (pts[i][1] - pts[i - 1][1])**2);
  return n;
}

function idmAccel(v: number, v0: number, gap: number, deltaV: number) {
  const a = 1.8;
  const b = 2.4;
  const sStar = 6 + Math.max(0, v * 1.25 + (v * deltaV) / (2 * Math.sqrt(a * b)));
  const free = 1 - (v / Math.max(0.2, v0)) ** 4;
  const interaction = gap > 0.4 ? (sStar / gap) ** 2 : 4;
  return a * (free - interaction);
}

function plantCrop(
  parent: THREE.Group,
  x: number,
  z: number,
  size: number,
  kind: "corn" | "wheat" | "hay",
  rng: () => number,
) {
  const h = kind === "corn" ? 1.45 : kind === "wheat" ? 0.72 : 0.32;
  const color = kind === "corn" ? 0xc8a840 : kind === "wheat" ? 0xd4b850 : 0x5a8a40;
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.72), matLib.get(0x4a3525, 1, 0));
  soil.rotation.x = -Math.PI / 2;
  soil.rotation.z = rng() * 0.4;
  soil.position.set(x, getTerrainHeight(x, z) + 0.04, z);
  soil.receiveShadow = true;
  parent.add(soil);
  const rows = Math.max(3, Math.floor(size / 5.2));
  const depth = size * 0.62;
  for (let i = 0; i < rows; i++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(1.05, h, depth), matLib.get(color, 1, 0));
    const ox = (i - (rows - 1) / 2) * 2.15;
    row.position.set(x + ox, getTerrainHeight(x, z) + h / 2, z);
    row.castShadow = true;
    parent.add(row);
  }
}