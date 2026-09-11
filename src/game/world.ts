import * as THREE from "three";
import {
  buildCabaneSucre,
  buildCasseCroute,
  buildBoutique,
  buildChasseShop,
  buildQuincaillerie,
  buildDepanneur,
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
  buildSqPoste,
  buildAtm,
  buildCrimeCorner,
} from "./architecture";
import { buildFirmBuilding, countyFirms, nearestCountyFirm, shopKindForFirm, type CountyFirm, type Firm } from "./business";
import { farmClearings, mountFarms, nearestField, tickFields, type FieldPlot } from "./farms";
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
} from "./landmarks";
import { LANDMARK_SHOPS, shopNameFor, type ShopSpot } from "./commerce";
import { shopDoorOffset, depHoursLabel } from "./depanneur";
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
import { matLib } from "./materials";
import { createSunCsm, disposeCsm, setCsmEnabled, updateCsm, wireCsmTree } from "./csm";
import { buildCenterLine, buildRoadRibbon, sampleRoad } from "./roads";
import { buildRoadFurniture } from "./furniture";
import { animatePrison, buildPrisonComplex, type BuiltPrison } from "./prison";
import { makeRng } from "./rng";
import { WildlifeSystem } from "./wildlife";
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
  ROADS,
  SQ_JAIL,
  villageCivicSpot,
  villageHouseLots,
  villageSetback,
  VILLAGES,
  WORLD,
} from "./worlddata";

export class PortneufWorld {
  group = new THREE.Group();
  traffic: Array<{
    mesh: THREE.Group;
    roadId: string;
    t: number;
    dir: 1 | -1;
    speed: number;
    targetSpeed: number;
    offset: number;
    length: number;
    isPolice: boolean;
    chasing: boolean;
  }> = [];
  private forestChunks: THREE.Group[] = [];
  private river: THREE.Mesh | null = null;
  private hemi: THREE.HemisphereLight;
  private ambient: THREE.AmbientLight;
  private night = false;
  private weather: "clear" | "rain" | "snow" | "fog" | "storm" = "clear";
  private lamps: THREE.Mesh[] = [];
  doors: CityDoor[] = [];
  swingDoors: SwingDoor[] = [];
  shops: ShopSpot[] = [];
  atms: AtmSpot[] = [];
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
    this.hemi = new THREE.HemisphereLight(0xb8d0e8, 0x3a4a32, 0.72);
    this.ambient = new THREE.AmbientLight(0xc8d4c0, 0.28);
    this.scene.add(this.group, this.hemi, this.ambient);
    createSunCsm(camera, this.scene);
    this.scene.fog = new THREE.FogExp2(0x8aa0a8, 0.00115);
    this.scene.background = new THREE.Color(0x7a9aaa);
  }

  build() {
    this.buildTerrain();
    this.buildRiver();
    this.buildLakes();
    for (const road of ROADS) {
      const div = road.kind === "ramp" ? 22 : road.kind === "highway" ? 90 : 56;
      this.group.add(buildRoadRibbon(road, div));
      const line = buildCenterLine(road);
      if (line) this.group.add(line);
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
    wireCsmTree(this.group);
  }

  private buildTerrain() {
    const geo = new THREE.PlaneGeometry(WORLD.width, WORLD.depth, 150, 95);
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
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      }),
    );
    mesh.position.set(ox, 0, oz);
    mesh.receiveShadow = true;
    mesh.name = "terrain";
    this.group.add(mesh);
  }

  private buildRiver() {
    const geo = new THREE.PlaneGeometry(WORLD.width + 300, 280, 48, 8);
    geo.rotateX(-Math.PI / 2);
    this.river = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0x2a4a68,
        roughness: 0.12,
        metalness: 0.55,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.river.position.set(0, -1.15, RIVER_Z + 120);
    this.river.receiveShadow = true;
    this.group.add(this.river);
  }

  private buildLakes() {
    for (const lake of LAKES) {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(lake.r, 28),
        new THREE.MeshStandardMaterial({
          color: 0x1a4a60,
          roughness: 0.06,
          metalness: 0.6,
          transparent: true,
          opacity: 0.9,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(lake.x, getTerrainHeight(lake.x, lake.z) - 0.4, lake.z);
      mesh.userData.isLakeWater = true;
      this.group.add(mesh);
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
        const g = new THREE.Group();
        g.add(trunks, cones);
        g.userData.center = new THREE.Vector3(cx + chunk / 2, 0, cz + chunk / 2);
        this.forestChunks.push(g);
        this.group.add(g);
      }
    }
  }

  private placeOnGround(obj: THREE.Object3D, x: number, z: number, rotY = 0) {
    obj.position.set(x, getTerrainHeight(x, z), z);
    obj.rotation.y = rotY;
    this.group.add(obj);
  }

  private addDriveway(x: number, z: number, yaw: number, setback: number) {
    const len = Math.min(12, Math.max(6, setback - 12));
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.05, len),
      matLib.get(0x5a5348, 1, 0),
    );
    pad.receiveShadow = true;
    const mx = x + fx * (len / 2 + 3.4);
    const mz = z + fz * (len / 2 + 3.4);
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
    for (const v of VILLAGES) {
      const [cx, cz] = v.center;
      const urban = isCityVillage(v.name);

      if (v.id === "portneuf") {
        const sq = pushOffRoad(SQ_JAIL.x, SQ_JAIL.z, 10);
        this.placeOnGround(buildSqPoste(), sq.x, sq.z, 0.2);
        const cruiser = buildPolice();
        this.placeOnGround(cruiser, sq.x + 8.5, sq.z + 6.5, 1.2);
        cruiser.position.y += 0.35;
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
        }
      }

      if (!urban) {
        const churchSpot = villageCivicSpot(v, "church");
        const church = buildEglise(v.population, 0);
        church.scale.setScalar(v.churchScale);
        this.placeOnGround(church, churchSpot.x, churchSpot.z, churchSpot.yaw);

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

        for (const lot of villageHouseLots(v)) {
          const house = buildMaisonCanadienne(v.population + Math.round(lot.x + lot.z), 0);
          const rural = v.population < 2800 || v.industry === "agriculture" || v.industry === "foresterie" || v.industry === "acericole";
          attachScenicHeat(house, scenicHeat(Math.round(lot.x * 13 + lot.z), rural), lot.yaw);
          this.placeOnGround(house, lot.x, lot.z, lot.yaw);
          this.addDriveway(lot.x, lot.z, lot.yaw, villageSetback(v));
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

    for (const s of LANDMARK_SHOPS) {
      const pos = pushOffRoad(s.x, s.z, 14);
      const mesh =
        s.kind === "food"
          ? buildCasseCroute()
          : s.kind === "clothing"
            ? buildBoutique()
            : s.kind === "quincaillerie"
              ? buildQuincaillerie()
              : buildChasseShop();
      this.placeOnGround(mesh, pos.x, pos.z, s.yaw);
      this.shops.push({ ...s, x: pos.x, z: pos.z });
      if (s.kind === "clothing") {
        const swings = (mesh.userData.swings as SwingDoor[] | undefined) ?? [];
        this.swingDoors.push(...swings);
        const front = 4.75;
        const dx = Math.sin(s.yaw) * front;
        const dz = Math.cos(s.yaw) * front;
        this.doors.push({
          id: s.id,
          name: s.name,
          kind: "boutique",
          x: pos.x + dx,
          y: getTerrainHeight(pos.x, pos.z),
          z: pos.z + dz,
          yaw: s.yaw,
          prompt: "Entrer · Boutique Éther",
        });
      }
    }
    const qx = A40_EXITS[3]!.x - 72;
    const tools = pushOffRoad(qx, 50, 6);
    this.placeOnGround(buildBoiteOutils(), tools.x + 8, tools.z, 0.5);
    this.placeOnGround(buildPelle(), tools.x - 7, tools.z + 1, 0.2);
    this.placeOnGround(buildRateau(), tools.x - 9, tools.z - 2, -0.4);

    for (const a of ATM_SPOTS) {
      const p = pushOffRoad(a.x, a.z, 7);
      this.placeOnGround(buildAtm(), p.x, p.z, 0.2);
      this.atms.push({ ...a, x: p.x, z: p.z });
    }
    for (const d of DEEDS) {
      const p = deedOffStreet(d.x, d.z, d.town);
      this.deeds.push({ ...d, x: p.x, z: p.z });
    }
    this.houses = mountHouses(this.group, this.deeds);
    for (const c of CRIME_SPOTS) {
      this.placeOnGround(buildCrimeCorner(), c.x, c.z, 0.1);
      this.crimes.push(c);
    }
    for (const b of countyBodies()) {
      this.placeOnGround(corpseProp(b.pose), b.x, b.z, b.yaw);
    }
    this.hurtGroup.name = "injured-npcs";
    this.group.add(this.hurtGroup);
    for (const h of countyInjured()) {
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
    for (const f of firms) {
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
    for (const s of CITY_GRIDS) {
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
      this.doors.push(...city.doors);
      this.swingDoors.push(...city.swings);
      this.cityTextures.push(...city.textures);
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

    const pen = buildPrisonComplex();
    this.placeOnGround(pen.group, PRISON.x, PRISON.z, 0);
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
  }

  private buildTraffic() {
    const sedanColors = [0xc0c0c0, 0x3a4a6a, 0x8a3030, 0x2a4a32, 0xd8d0c0, 0x4a4a50, 0xb9232e, 0xd18b2a];
    const pickupColors = [0x3a4a3c, 0x5a4030, 0x2a3a4a, 0x6a6a62];
    let i = 0;
    for (const road of ROADS) {
      if (road.kind === "ramp") continue;
      const n =
        road.traffic ??
        (road.kind === "highway" ? 8 : road.kind === "regional" ? 6 : road.kind === "gravel" ? 2 : 4);
      if (n <= 0) continue;
      for (let k = 0; k < n; k++) {
        const roll = (i * 19) % 10;
        const isPolice = roll === 0;
        const mesh =
          isPolice
            ? buildPolice()
            : roll < 3
              ? buildPickup(pickupColors[i % pickupColors.length])
              : buildSedan(sedanColors[i % sedanColors.length]);
        i++;
        const t = (k + 0.18) / n;
        const dir: 1 | -1 = k % 2 === 0 ? 1 : -1;
        const sample = sampleRoad(road, t);
        mesh.position.set(sample.x, getTerrainHeight(sample.x, sample.z) + 0.35, sample.z);
        this.group.add(mesh);
        const target = (road.speed / 3.6) * (isPolice ? 1.05 : roll < 3 ? 0.92 : 0.96) * (0.88 + (k % 4) * 0.05);
        const laneOff = road.kind === "highway" ? 5.1 : road.width * 0.22;
        this.traffic.push({
          mesh,
          roadId: road.id,
          t,
          dir,
          speed: target * 0.9,
          targetSpeed: target,
          offset: dir * laneOff,
          length: roll < 3 && !isPolice ? 5.6 : 4.4,
          isPolice,
          chasing: false,
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
    for (const v of VILLAGES) {
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
    for (const [x, z] of ninety) {
      this.placeOnGround(buildPanneauVitesse(90), x - 40, z + 6, -Math.PI / 2);
    }
    for (let i = 0; i < A40_EXITS.length - 1; i++) {
      const a = A40_EXITS[i]!;
      const b = A40_EXITS[i + 1]!;
      const mx = (a.x + b.x) / 2;
      this.placeOnGround(buildPanneauVitesse(100), mx, A40_Z + 12, -Math.PI / 2);
    }
  }

  private buildInterchanges() {
    for (const ex of A40_EXITS) {
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
    for (const def of MAPLE_LEAVES) {
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
    for (const d of this.doors) {
      const dist = Math.hypot(x - d.x, z - d.z);
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
    for (const s of this.shops) {
      const dist = Math.hypot(x - s.x, z - s.z);
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
    for (const a of this.atms) {
      const dist = Math.hypot(x - a.x, z - a.z);
      if (dist < bestD) {
        best = a;
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
    return nearestTap(this.sugar, x, z, max);
  }

  nearestEvap(x: number, z: number, max = 3.4): SugarEvap | null {
    return nearestEvap(this.sugar, x, z, max);
  }

  nearestBush(x: number, z: number, max = 36): SugarBush | null {
    return nearestBush(this.sugar, x, z, max);
  }

  dispatchFarmRaid(x: number, z: number) {
    if (!this.raidCar) {
      this.raidCar = buildPolice();
      this.raidCar.name = "sq-farm-raid";
      this.group.add(this.raidCar);
    }
    const dx = x - SQ_JAIL.x;
    const dz = z - SQ_JAIL.z;
    const len = Math.hypot(dx, dz) || 1;
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
    const dist = Math.hypot(dx, dz) || 1;
    if (dist > 7) {
      const sp = 22;
      const nx = car.position.x + (dx / dist) * sp * dt;
      const nz = car.position.z + (dz / dist) * sp * dt;
      car.position.set(nx, getTerrainHeight(nx, nz) + 0.35, nz);
      car.lookAt(this.raidGoal.x, car.position.y, this.raidGoal.z);
    }
    car.traverse((obj) => {
      if (obj.userData.policeBar && obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(elapsed % 0.22 < 0.11 ? 0x1d4ed8 : 0xb91c1c);
        mat.emissiveIntensity = 2.2;
      }
    });
  }

  nearFire(x: number, z: number, max = 3.8): boolean {
    return Boolean(nearestStreet(this.street, x, z, max, "campfire"));
  }

  nearestDeed(x: number, z: number, max = 5): Deed | null {
    let best: Deed | null = null;
    let bestD = max;
    for (const d of this.deeds) {
      const dist = Math.hypot(x - d.x, z - d.z);
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
    for (const lot of this.houses) {
      paintHouseLot(lot, owned.includes(lot.deedId), states[lot.deedId]);
    }
  }

  houseMarks(owned: string[]) {
    return houseMapMarks(this.houses, owned);
  }

  nearestCrime(x: number, z: number, max = 4.8): CrimeSpot | null {
    let best: CrimeSpot | null = null;
    let bestD = max;
    for (const c of this.crimes) {
      const dist = Math.hypot(x - c.x, z - c.z);
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
    for (const leaf of this.leaves) {
      if (leaf.collected) continue;
      const dist = Math.hypot(x - leaf.x, z - leaf.z);
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
    for (const leaf of this.leaves) {
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
    updateCsm();
    if (this.prison) animatePrison(this.prison, elapsed, dt, this.night);
    tickInjured(this.hurtGroup, dt);
    if (this.streetGroup) tickStreet(this.streetGroup, elapsed);
    this.tickFarmRaid(dt, elapsed);
    tickHerd(this.herd, dt, elapsed);
    tickSugar(this.sugar, elapsed);

    if (this.river) {
      const pos = this.river.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, Math.sin(x * 0.02 + elapsed * 1.1) * 0.28 + Math.cos(z * 0.03 - elapsed * 0.7) * 0.16);
      }
      pos.needsUpdate = true;
    }

    this.group.traverse((obj) => {
      if (obj.userData.isLakeWater) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) mat.metalness = 0.55 + Math.sin(elapsed * 0.5 + obj.position.x * 0.01) * 0.08;
      }
      if (obj.userData.isBoat) {
        obj.rotation.z = Math.sin(elapsed * 0.9 + obj.position.x) * 0.03;
        obj.position.y = 0.25 + Math.sin(elapsed * 0.7) * 0.06;
      }
      if (obj.userData.isMillSails) {
        obj.rotation.x += dt * 0.35;
      }
      if (obj.userData.isMarmiteWater) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) mat.metalness = 0.55 + Math.sin(elapsed * 0.7) * 0.1;
      }
    });

    const byLane = new Map<string, typeof this.traffic>();
    for (const car of this.traffic) {
      const key = `${car.roadId}:${car.dir}`;
      const list = byLane.get(key);
      if (list) list.push(car);
      else byLane.set(key, [car]);
    }
    for (const list of byLane.values()) {
      list.sort((a, b) => a.t - b.t);
    }

    const chaseBudget = wantedStars <= 0 ? 0 : Math.min(8, 1 + wantedStars);
    if (chaseBudget > 0) {
      const cops = this.traffic
        .filter((c) => c.isPolice)
        .sort((a, b) => {
          const da = Math.hypot(a.mesh.position.x - player.x, a.mesh.position.z - player.z);
          const db = Math.hypot(b.mesh.position.x - player.x, b.mesh.position.z - player.z);
          return da - db;
        });
      cops.forEach((c, i) => {
        c.chasing = i < chaseBudget;
      });
    } else {
      for (const car of this.traffic) car.chasing = false;
    }

    for (const car of this.traffic) {
      const road = ROADS.find((r) => r.id === car.roadId);
      if (!road) continue;

      if (car.chasing) {
        const px = player.x;
        const pz = player.z;
        const dx = px - car.mesh.position.x;
        const dz = pz - car.mesh.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        const chaseSpeed = 18 + wantedStars * 3.4;
        car.speed = chaseSpeed;
        if (dist > 3.2) {
          const x = car.mesh.position.x + (dx / dist) * chaseSpeed * dt;
          const z = car.mesh.position.z + (dz / dist) * chaseSpeed * dt;
          car.mesh.position.set(x, getTerrainHeight(x, z) + 0.35, z);
          car.mesh.lookAt(px, car.mesh.position.y, pz);
        }
        car.mesh.traverse((obj) => {
          if (obj.userData.policeBar && obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            mat.emissive.setHex(elapsed % 0.22 < 0.11 ? 0x1d4ed8 : 0xb91c1c);
            mat.emissiveIntensity = 2.2;
          }
        });
        continue;
      }

      const len = approxLength(road.points);
      const lane = byLane.get(`${car.roadId}:${car.dir}`) ?? [];
      let gap = 400;
      let deltaV = 0;
      if (lane.length > 1) {
        let leader = lane[0];
        let minAhead = Infinity;
        for (const other of lane) {
          if (other === car) continue;
          const raw = car.dir > 0 ? other.t - car.t : car.t - other.t;
          const ahead = raw > 0 ? raw : raw + 1;
          if (ahead < minAhead) {
            minAhead = ahead;
            leader = other;
          }
        }
        gap = minAhead * len - (car.length + leader.length) * 0.5;
        deltaV = car.speed - leader.speed;
      }
      const accel = idmAccel(car.speed, car.targetSpeed, gap, deltaV);
      car.speed = Math.max(1.2, Math.min(car.targetSpeed * 1.15, car.speed + accel * dt));
      car.t += (car.dir * car.speed * dt) / Math.max(1, len);
      if (car.t > 1) car.t -= 1;
      if (car.t < 0) car.t += 1;
      const s = sampleRoad(road, car.t);
      const nx = -s.tz;
      const nz = s.tx;
      const x = s.x + nx * car.offset;
      const z = s.z + nz * car.offset;
      car.mesh.position.set(x, getTerrainHeight(x, z) + 0.35, z);
      const fx = s.tx * car.dir;
      const fz = s.tz * car.dir;
      car.mesh.lookAt(x + fx, car.mesh.position.y, z + fz);
      car.mesh.traverse((obj) => {
        if (obj.userData.policeBar && obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(elapsed % 0.6 < 0.3 ? 0x1d4ed8 : 0xb91c1c);
          mat.emissiveIntensity = 0.85;
        }
      });
    }

    for (const chunk of this.forestChunks) {
      const c = chunk.userData.center as THREE.Vector3;
      const d = player.distanceTo(c);
      chunk.visible = d < 1050;
      const shadow = d < 280;
      for (const child of chunk.children) {
        if ((child as THREE.InstancedMesh).isInstancedMesh) child.castShadow = shadow;
      }
    }

    for (const leaf of this.leaves) {
      if (leaf.collected) continue;
      leaf.mesh.rotation.y = elapsed * 1.1;
      leaf.mesh.position.y = getTerrainHeight(leaf.x, leaf.z) + 0.85 + Math.sin(elapsed * 2.1 + leaf.x) * 0.12;
    }

    this.wildlife.update(dt, player, speedKmh, wantedStars > 0);
  }

  nearestPoliceDist(x: number, z: number) {
    let best = Number.POSITIVE_INFINITY;
    for (const car of this.traffic) {
      if (!car.isPolice) continue;
      const d = Math.hypot(car.mesh.position.x - x, car.mesh.position.z - z);
      if (d < best) best = d;
    }
    return best;
  }

  ramPolice(x: number, z: number, radius: number) {
    for (const car of this.traffic) {
      if (!car.isPolice) continue;
      if (Math.hypot(car.mesh.position.x - x, car.mesh.position.z - z) < radius) return true;
    }
    return false;
  }

  setNight(isNight: boolean) {
    this.night = isNight;
    setCsmEnabled(this.group.visible, isNight);
    this.applySky();
    this.group.traverse((obj) => {
      if (obj.userData.isStreetlight) {
        const mat = (obj as THREE.InstancedMesh).material as THREE.MeshStandardMaterial;
        if (mat.emissive) mat.emissiveIntensity = isNight ? 1.6 : 0.05;
      }
    });
  }

  setWeather(kind: "clear" | "rain" | "snow" | "fog" | "storm") {
    this.weather = kind;
    this.applySky();
  }

  private applySky() {
    const fog = this.scene.fog as THREE.FogExp2;
    if (this.night) {
      this.hemi.intensity = 0.12;
      this.hemi.color.setHex(0x203048);
      this.ambient.intensity = 0.08;
      fog.color.setHex(0x0a1020);
      this.scene.background = new THREE.Color(0x0a1020);
      if (this.river) (this.river.material as THREE.MeshStandardMaterial).color.setHex(0x101c2c);
    } else {
      this.hemi.intensity = 0.72;
      this.hemi.color.setHex(0xb8d0e8);
      this.ambient.intensity = 0.28;
      fog.color.setHex(0x8aa0a8);
      this.scene.background = new THREE.Color(0x7a9aaa);
      if (this.river) (this.river.material as THREE.MeshStandardMaterial).color.setHex(0x2a4a68);
    }
    if (this.weather === "fog") {
      fog.density = this.night ? 0.0042 : 0.0034;
      fog.color.setHex(this.night ? 0x1a2430 : 0x9aa8b0);
    } else if (this.weather === "rain") {
      fog.density = 0.0018;
      this.hemi.intensity *= 0.72;
      if (!this.night) this.scene.background = new THREE.Color(0x5a6a78);
    } else if (this.weather === "storm") {
      fog.density = 0.0026;
      this.hemi.intensity *= 0.45;
      this.scene.background = new THREE.Color(this.night ? 0x050810 : 0x3a4450);
    } else if (this.weather === "snow") {
      fog.density = 0.0017;
      fog.color.setHex(this.night ? 0x1a2438 : 0xc8d4dc);
      if (!this.night) this.scene.background = new THREE.Color(0xc0c8d0);
    } else {
      fog.density = 0.00115;
    }
  }

  dispose() {
    this.cityTextures.forEach((t) => t.dispose());
    matLib.dispose();
    disposeCsm();
    this.scene.remove(this.group, this.hemi, this.ambient);
  }
}

function approxLength(pts: Array<[number, number]>) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
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

