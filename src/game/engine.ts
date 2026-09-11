import * as THREE from "three";
import { parseAdmin } from "./admin";
import { FIRM_TYPES, canOperate, gameMonth, jobBonusType, PERMIT_FEES, shopKindForFirm, seasonalFactor, startupTotal, type MapaqGrantId } from "./business";
import { bagFill, haulCargoKg, vehicleLoadMul } from "./backpack";
import { bagWeight, cartCount, itemById, ammoFor, harvestRange, type ShopSpot } from "./commerce";
import { buildCaddie, fillCaddie } from "./cart";
import type { CityDoor } from "./city";
import { hotelSecurity } from "./hotel";
import { input } from "./input";
import { createInteriors, INTERIOR_ORIGIN, paintHomeInterior, type InteriorRoom } from "./interiors";
import { setLobbyLights } from "./luxury";
import { police } from "./police";
import { quebecFM, QUEBEC_FM_STATIONS } from "./radio";
import { persist, useGameStore, type PlayMode } from "./store";
import { PropField, isPropId } from "./builder";
import { ANIM_TYPES, propAnim, type AnimType } from "./anim";
import { geoStats } from "./geo";
import { Vehicle } from "./vehicle";
import { Walker } from "./walker";
import { PortneufWorld } from "./world";
import { refreshCsmFrustums, wireCsmTree } from "./csm";
import { tex } from "./textures";
import type { Appearance } from "./character";
import { fleetById, isVehicleId, type VehicleId } from "./fleet";
import { buildCargoCrate, nearHaul } from "./jobs";
import { workJobAt } from "./tools";
import { shelterOf, applyMeal, ambientOf } from "./survival";
import { crimeById, jobById } from "./rp";
import { ENFORCE_SPEED_LIMITS, getPoiAt, getSpeedLimitAt, getSurfaceAt, getTerrainHeight, getZoneName, policeCatchMul, SPAWN, SQ_JAIL, PRISON } from "./worlddata";
import { prisonSystem, type ChargeId } from "./prison";
import { zoneSystem } from "./zones";
import { checkCarryLegality } from "./weapons";
import { AdminFx } from "./fx";
import { attachGltfDecoders, warmMeshopt } from "./gltf";
import { WORLD_ENGINE_VERSION } from "./worldapi";
import { fieldPrompt, seizeField, workField, CROPS, type CropId } from "./farms";
import { stockPrompt, workStock } from "./livestock";
import { evapPrompt, tapPrompt, workEvap, workTap } from "./sugar";
import {
  canOpenDoor,
  doorDenied,
  emptyHouse,
  hasReno,
  housePrompt,
  insideHouseBody,
  type DoorSlot,
  type HouseLot,
} from "./house";
import {
  depHoursLabel,
  depPrompt,
  isDepOpen,
  shopDoorOffset,
  shopPumpOffset,
  type DepAisleHot,
} from "./depanneur";
import { cycleCarabine } from "./carabine";
import { cycleAk74 } from "./ak74";
import { tickInjured, preloadInjured } from "./injured";
import { tickGuns, preloadGuns } from "./guns";
import { tickProps3d } from "./props3d";
import { heatWorks, hydroLive, setHeatGlow } from "./utilities";

export class PortneufEngine {
  readonly version = WORLD_ENGINE_VERSION;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: PortneufWorld;
  vehicle: Vehicle;
  walker: Walker;
  private fx: AdminFx;
  private fxTarget = new THREE.Vector3();
  private interiors: {
    hotel: InteriorRoom;
    apartment: InteriorRoom;
    boutique: InteriorRoom;
    lobby: InteriorRoom;
    corridor: InteriorRoom;
    prison: InteriorRoom;
    home: InteriorRoom;
    depanneur: InteriorRoom;
  };
  private activeInterior: InteriorRoom | null = null;
  private lastDoor: CityDoor | null = null;
  private pendingDoor: CityDoor | null = null;
  private timer = new THREE.Timer();
  private elapsed = 0;
  private hudAcc = 0;
  private kmAcc = 0;
  private lastFineAt = 0;
  private lastRamAt = 0;
  private lastCatchAt = 0;
  private lastJobAt = 0;
  private lastFirmSale = 0;
  private lastSurv = 0;
  private lastPrison = 0;
  private lastCarry = 0;
  private lastPayroll = 0;
  private lastUtil = 0;
  private lastSwingAt = 0;
  private lastCartKey = "";
  private lastShadow = new THREE.Vector3(1e6, 0, 0);
  private shadowAcc = 0;
  private caddie: THREE.Group | null = null;
  private tvWorld = new THREE.Vector3();
  private doorHit = new THREE.Vector3();
  private bodyHit = new THREE.Vector3();
  private handHit = new THREE.Vector3();
  private handleHit = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private player = new THREE.Vector3();
  private running = false;
  private disposed = false;
  private night = false;
  private cameraMode: "chase" | "hood" = "chase";
  private mode: PlayMode = "drive";
  private indoorHemi: THREE.HemisphereLight;
  private props = new PropField();
  private buildSnap = 0.5;
  private homeDeedId: string | null = null;
  private homeFloor: "main" | "basement" = "main";
  private depShopId: string | null = null;
  private onResize: () => void;
  private savedFog: THREE.Color;
  private savedFogDensity = 0.00115;

  constructor(private canvas: HTMLCanvasElement) {
    void warmMeshopt();
    const qa = new URLSearchParams(window.location.search).get("qa") === "1";
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      preserveDrawingBuffer: qa,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    tex.attach(this.renderer);
    attachGltfDecoders(this.renderer);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.35, 2200);
    this.fit();

    this.world = new PortneufWorld(this.scene, this.camera);
    this.world.build();
    this.world.syncHouses(useGameStore.getState().ownedProps, useGameStore.getState().houses);
    this.vehicle = new Vehicle();
    this.walker = new Walker(useGameStore.getState().appearance);
    this.scene.add(this.vehicle.group, this.walker.group);
    this.fx = new AdminFx(this.scene, this.camera, this.renderer, () => {
      this.fxTarget.set(this.px(), this.py() + 1.15, this.pz());
      return this.fxTarget;
    });
    this.interiors = createInteriors();
    this.scene.add(
      this.interiors.hotel.group,
      this.interiors.apartment.group,
      this.interiors.boutique.group,
      this.interiors.lobby.group,
      this.interiors.corridor.group,
      this.interiors.prison.group,
      this.interiors.home.group,
      this.interiors.depanneur.group,
    );
    wireCsmTree(this.scene);
    this.scene.add(this.props.group);
    this.props.hydrate(useGameStore.getState().placed);
    preloadInjured();
    preloadGuns();
    this.indoorHemi = new THREE.HemisphereLight(0xf0e8d8, 0x2a2a32, 0);
    this.scene.add(this.indoorHemi);
    this.savedFog = new THREE.Color(0x8aa0a8);

    this.night = useGameStore.getState().night;
    if (this.night) this.world.setNight(true);
    this.world.setWeather(useGameStore.getState().weather);
    this.world.markLeavesCollected(useGameStore.getState().leaves);
    const savedRadio = useGameStore.getState().radioId;
    if (savedRadio) quebecFM.stationId = savedRadio;

    input.attach();
    this.wireControlsTest();

    this.onResize = () => this.fit();
    window.addEventListener("resize", this.onResize);
    this.timer.connect(document);
    useGameStore.getState().setHud({ loading: false, mode: "drive" });
  }

  private fit() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    refreshCsmFrustums();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.renderer.setAnimationLoop(() => this.tick());
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  private wireControlsTest() {
    window.__controlsTest = {
      getYaw: () => (this.mode === "drive" ? this.vehicle.yaw : this.walker.yaw),
      getSpeed: () => (this.mode === "drive" ? this.vehicle.speed : this.walker.speed),
      setKeys: (codes) => input.setInjected(codes),
      setSteer: (v) => {
        input.touchSteer = v;
      },
      interact: () => this.handleInteract(),
    };
  }

  private px() {
    return this.mode === "drive" ? this.vehicle.x : this.walker.x;
  }
  private pz() {
    return this.mode === "drive" ? this.vehicle.z : this.walker.z;
  }
  private py() {
    return this.mode === "drive" ? this.vehicle.y : this.walker.y;
  }
  private pYaw() {
    return this.mode === "drive" ? this.vehicle.yaw : this.walker.yaw;
  }

  private tickShadows(dt: number, active: boolean) {
    if (this.mode === "interior" || this.night || !active) {
      this.renderer.shadowMap.needsUpdate = false;
      return;
    }
    this.shadowAcc += dt;
    const moved = this.player.distanceToSquared(this.lastShadow) > 9;
    if (moved || this.shadowAcc > 0.09) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadow.copy(this.player);
      this.shadowAcc = 0;
    }
  }

  private tick() {
    if (this.disposed) return;
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.08);
    this.elapsed += dt;
    this.fx.tick(dt);
    propAnim.tick(dt, this.elapsed);
    tickInjured(this.props.group, dt);
    tickGuns(this.props.group);
    tickProps3d(this.props.group, this.elapsed);
    const store = useGameStore.getState();

    const actions = input.sample();
    this.player.set(this.px(), this.py(), this.pz());
    const wanted = police.getState();
    if (this.mode !== "interior") {
      this.world.update(dt, this.elapsed, this.player, store.speedKmh, wanted.stars);
    }
    this.tickShadows(dt, store.playing && !store.paused);

    if (this.walker.heldId !== store.equippedTool) this.walker.setHeld(store.equippedTool);
    if (this.walker.packId !== store.equippedPack) this.walker.setPack(store.equippedPack);
    const look = store.appearance;
    const cur = this.walker.look;
    if (
      cur.outfit !== look.outfit ||
      cur.hairStyle !== look.hairStyle ||
      cur.skin !== look.skin ||
      cur.hair !== look.hair ||
      cur.model !== look.model ||
      cur.aura !== look.aura ||
      cur.face !== look.face
    ) {
      this.walker.applyLook(look);
    }
    this.walker.setLoad(bagFill(store.inventory, store.equippedPack));
    this.walker.vitalMul = store.surv.speedFactor;
    this.walker.fly = store.flyMode && this.mode !== "drive";
    this.walker.noclip = store.noclipMode;
    this.world.placeFirm(store.firm);
    if (store.playing && !store.paused && this.elapsed - this.lastCarry > 7) {
      const carry = checkCarryLegality(store.licenses, store.equippedTool);
      const here = zoneSystem.getAt(this.px(), this.pz());
      const banned = here && !here.rules.carryWeapons && (store.equippedTool === "pistol" || store.equippedTool === "carabine" || store.equippedTool === "ak74" || store.equippedTool === "ar15" || store.equippedTool === "shotgun");
      if (!carry.legal || banned) {
        this.lastCarry = this.elapsed;
        police.report("arme_prohibee", this.elapsed);
        store.setHud({ notice: carry.legal ? "Arme interdite dans cette zone" : carry.message });
      }
    }
    if (store.playing && !store.paused && this.elapsed - this.lastPrison > 1) {
      this.lastPrison = this.elapsed;
      const held = prisonSystem.inmate;
      prisonSystem.tick(0.12);
      if (held && !prisonSystem.inmate && this.activeInterior?.kind === "prison") {
        this.leaveInterior();
        store.setHud({ notice: "Libéré · fin de peine" });
      }
    }
    const hotel = this.interiors.hotel;
    if (hotel.tvSetup && hotel.group.visible) hotel.tvSetup.tickTv(this.elapsed, store.hotelTvOn);
    if (store.playing && !store.paused && this.elapsed - this.lastSurv > 0.25) {
      const dtSurv = this.elapsed - this.lastSurv;
      this.lastSurv = this.elapsed;
      const hours = (16.5 + this.elapsed / 90) % 24;
      const month = gameMonth(this.elapsed);
      const ambient = ambientOf(hours, this.night, month);
      let indoorC: number | undefined;
      let nearFire = this.mode === "walk" && this.world.nearFire(this.walker.x, this.walker.z);
      if (this.mode === "interior") {
        if (this.activeInterior?.kind === "home" && this.homeDeedId) {
          const st = store.houses[this.homeDeedId] ?? emptyHouse(this.homeDeedId);
          indoorC = st.indoorC;
          nearFire = heatWorks(st, store.gridOutage, ambient);
        } else {
          indoorC = store.gridOutage ? 11 : 21;
        }
      }
      store.tickSurvival(dtSurv, {
        shelter: shelterOf(this.mode),
        night: this.night,
        hours,
        month,
        outfit: store.appearance.outfit,
        hair: store.appearance.hairStyle,
        god: store.godMode,
        nearFire,
        indoorC,
      });
      this.walker.syncHurt(store.surv.health, store.surv.energy);
      if (this.elapsed - this.lastUtil > 0.5) {
        const dtU = this.elapsed - this.lastUtil;
        this.lastUtil = this.elapsed;
        store.tickUtilities(dtU, {
          ambient,
          month,
          elapsed: this.elapsed,
          weather: store.weather,
        });
        if (this.mode === "interior" && this.activeInterior?.kind === "home" && this.homeDeedId) {
          const st = useGameStore.getState().houses[this.homeDeedId];
          if (st) {
            const on = heatWorks(st, useGameStore.getState().gridOutage, ambient);
            setHeatGlow(this.interiors.home.group, on);
            const hydro = hydroLive(st, useGameStore.getState().gridOutage);
            const bright = this.homeFloor === "basement" ? 0.38 : hasReno(st, "eclairage") ? 0.95 : 0.42;
            this.indoorHemi.intensity = hydro ? bright : 0.12;
          }
        }
      }
    }
    if (store.playing && !store.paused && store.firm?.isOpen && this.elapsed - this.lastFirmSale > 8) {
      this.lastFirmSale = this.elapsed;
      store.tickFirm(this.elapsed);
    }
    if (store.playing && !store.paused && this.elapsed - this.lastPayroll > 45) {
      this.lastPayroll = this.elapsed;
      store.tickPayroll(this.elapsed);
    }
    if (store.playing && !store.paused && this.mode !== "interior") {
      const raid = this.world.tickFields(dt, this.elapsed, this.px(), this.pz());
      if (raid) this.seizeCrop(raid);
    }

    if (store.playing && !store.paused) {
      if (this.mode === "drive") {
        this.vehicle.update(dt, actions, vehicleLoadMul(haulCargoKg(store.job), bagWeight(store.inventory), fleetById(this.vehicle.kind).mass));
        this.kmAcc += Math.abs(this.vehicle.speed) * dt;
      } else {
        if (store.sitting && (actions.throttle > 0.1 || actions.brake > 0.1 || Math.abs(actions.steer) > 0.2)) {
          store.stand();
        }
        const move = store.sitting
          ? { ...actions, throttle: 0, brake: 0, steer: 0, boost: false }
          : actions;
        this.walker.update(dt, move, this.elapsed);
      }
      this.player.set(this.px(), this.py(), this.pz());
      this.tickSwing(dt);
      this.syncCaddie();
      if (actions.interact) this.handleInteract();
      this.tickPolice(dt, store.godMode);
      quebecFM.tick(dt, store.radioOn);
    } else {
      if (store.shopOpen && actions.interact) store.closeShop();
      if (store.cartOpen && actions.interact) store.closeCart();
      if (store.citationOpen && actions.interact) store.closeCitation();
    }

    if (store.creatorOpen) {
      if (this.mode !== "interior") this.vehicle.group.visible = false;
      this.updateCreatorCamera(dt);
    } else {
      if (this.mode !== "interior") this.vehicle.group.visible = true;
      this.updateCamera(dt);
    }

    if (actions.camera && store.playing) {
      this.cameraMode = this.cameraMode === "chase" ? "hood" : "chase";
    }
    if (actions.night && store.playing && this.mode !== "interior") {
      this.night = !this.night;
      this.world.setNight(this.night);
      this.lastShadow.set(1e6, 0, 0);
    }
    if (actions.map && store.playing && !store.shopOpen && !store.phoneOpen && !store.lockOpen && !store.creatorOpen) {
      const next = !store.showMap;
      store.setHud({ showMap: next, paused: next, consoleOpen: false });
    }
    if (actions.phone && store.playing) {
      if (store.phoneOpen) store.closePhone();
      else store.openPhone();
    }
    if (actions.console && store.playing) {
      if (store.consoleOpen) store.closeConsole();
      else store.openConsole();
    }
    if (actions.radio && store.playing && !store.overlayOpen()) {
      void this.cycleRadio();
    }
    if (actions.inventory && store.playing) {
      if (store.inventoryOpen) store.closeInventory();
      else store.openInventory();
    }
    if (actions.garage && store.playing) {
      if (store.garageOpen) store.closeGarage();
      else store.openGarage();
    }
    if (actions.jobs && store.playing) {
      if (store.jobsOpen) store.closeJobs();
      else store.openJobs();
    }
    if (actions.firm && store.playing) {
      if (store.firmOpen) store.closeFirm();
      else store.openFirm();
    }
    if (actions.build && store.playing && !store.overlayOpen()) {
      store.toggleBuild();
    }
    if (store.buildOpen && store.playing && !store.paused) {
      this.tickBuilder();
      if (actions.rotate) store.rotateGhost();
    } else {
      this.props.syncGhost(null, 0, 0, 0, 0, 1);
    }
    if (actions.pause && store.playing) {
      store.togglePause();
    }

    this.hudAcc += dt;
    if (this.hudAcc > 0.12) {
      this.hudAcc = 0;
      this.pushHud();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private handleInteract() {
    const store = useGameStore.getState();
    if (store.buildOpen && store.buildType) {
      this.placeProp();
      return;
    }
    if (store.shopOpen) {
      store.closeShop();
      return;
    }
    if (store.cartOpen) {
      store.closeCart();
      return;
    }
    if (store.atmOpen) {
      store.closeAtm();
      return;
    }
    if (store.propertyOpen) {
      store.closeDeed();
      return;
    }
    if (store.elevatorOpen) {
      store.closeElevator();
      return;
    }
    if (this.mode === "drive") {
      if (Math.abs(this.vehicle.speed) < 3.2) {
        if (this.tryHaul()) return;
        if (this.tryFirm()) return;
        if (this.tryParkHouse()) return;
        this.exitVehicle();
      }
      return;
    }
    if (this.mode === "interior") {
      if (store.sitting) {
        store.stand();
        return;
      }
      if (this.tryCaisse()) return;
      if (this.tryGarment()) return;
      if (this.tryDepBits()) return;
      if (this.tryTv()) return;
      if (this.tryLobbyBits()) return;
      if (this.trySit()) return;
      if (this.tryHallDoor()) return;
      if (this.tryHomeBits()) return;
      const room = this.activeInterior;
      if (!room) return;
      const dx = this.walker.x - (room.group.position.x + room.exit.x);
      const dz = this.walker.z - (room.group.position.z + room.exit.z);
      if (Math.hypot(dx, dz) < 2.4) {
        if (room.kind === "home" && this.homeFloor === "basement") {
          this.setHomeFloor("main");
          return;
        }
        this.leaveInterior();
      }
      return;
    }
    if (this.tryHaul()) return;
    if (this.tryFirm()) return;
    const shopEarly = this.world.nearestShop(this.walker.x, this.walker.z, 6.5);
    if (shopEarly && shopEarly.kind === "depanneur") {
      this.tryEnterDepanneur(shopEarly);
      return;
    }
    const atm = this.world.nearestAtm(this.walker.x, this.walker.z, 4.8);
    if (atm) {
      store.openAtm(atm.id);
      return;
    }
    const vend = this.world.nearestStreet(this.walker.x, this.walker.z, 2.4, "vending");
    if (vend) {
      const ok = store.buyItem("cola") || store.buyItem("chips");
      if (!ok) store.setHud({ notice: "Distributeur · pas assez d'espèces" });
      return;
    }
    const fire = this.world.nearestStreet(this.walker.x, this.walker.z, 2.6, "campfire");
    if (fire) {
      if (store.sitting) store.stand();
      else {
        this.walker.place(fire.x, fire.z, this.walker.yaw, false);
        store.sit();
        store.setHud({ notice: "Feu de camp" });
      }
      return;
    }
    const bus = this.world.nearestStreet(this.walker.x, this.walker.z, 2.2, "bus");
    if (bus) {
      if (store.sitting) store.stand();
      else {
        this.walker.place(bus.x, bus.z, bus.yaw, false);
        store.sit();
      }
      return;
    }
    const bench = this.world.nearestStreet(this.walker.x, this.walker.z, 2.0, "bench");
    if (bench) {
      if (store.sitting) store.stand();
      else {
        this.walker.place(bench.x, bench.z, bench.yaw, false);
        store.sit();
      }
      return;
    }
    const pump = this.world.nearestStreet(this.walker.x, this.walker.z, 3.2, "pump");
    if (pump) {
      const ok = store.buyItem("essence");
      if (!ok) store.setHud({ notice: "Pompe · pas assez d'espèces" });
      return;
    }
    const dump = this.world.nearestStreet(this.walker.x, this.walker.z, 2.6, "dump");
    if (dump) {
      const roll = Math.random();
      if (roll < 0.4) {
        useGameStore.setState((s) => ({
          inventory: { ...s.inventory, chips: (s.inventory.chips ?? 0) + 1 },
          notice: "Conteneur · chips ketchup",
        }));
      } else if (roll < 0.7) {
        store.addCash(4, "Canette consignée · 4 $");
      } else {
        store.setHud({ notice: "Conteneur · rien" });
      }
      return;
    }
    const mail = this.world.nearestStreet(this.walker.x, this.walker.z, 1.8, "mail");
    if (mail) {
      store.setHud({ notice: "Boîte · facture Hydro déjà payée" });
      return;
    }
    if (this.tryPortal()) return;
    const field = this.world.nearestField(this.walker.x, this.walker.z, 14);
    if (field) {
      this.tryFarm(field);
      return;
    }
    const stock = this.world.nearestStock(this.walker.x, this.walker.z, 3.6);
    if (stock) {
      this.tryStock(stock);
      return;
    }
    const evap = this.world.nearestEvap(this.walker.x, this.walker.z, 3.6);
    if (evap) {
      this.tryEvap(evap);
      return;
    }
    const tap = this.world.nearestTap(this.walker.x, this.walker.z, 2.8);
    if (tap) {
      this.tryTap(tap);
      return;
    }
    if (this.tryHouse()) return;
    const crime = this.world.nearestCrime(this.walker.x, this.walker.z, 4.8);
    if (crime) {
      store.commitCrime(crime.crime, this.elapsed);
      return;
    }
    const shop = this.world.nearestShop(this.walker.x, this.walker.z, 9);
    if (shop && shop.kind === "depanneur") {
      this.tryEnterDepanneur(shop);
      return;
    }
    if (shop && shop.kind !== "clothing") {
      store.openShop(shop.id);
      return;
    }
    const biz = this.world.nearestCountyFirm(this.walker.x, this.walker.z, 8);
    if (biz && !shopKindForFirm(biz.type) && this.elapsed - this.lastJobAt > 6) {
      this.lastJobAt = this.elapsed;
      const pay = Math.round((18 + Math.random() * 16) * seasonalFactor(biz.type, gameMonth(this.elapsed)));
      store.addCash(Math.max(6, pay), `Contrat · ${biz.name} · +${Math.max(6, pay)}\u00a0$`);
      return;
    }
    const job = workJobAt(store.equippedTool, this.walker.x, this.walker.z);
    if (job && this.elapsed - this.lastJobAt > 7) {
      this.lastJobAt = this.elapsed;
      let pay = job.pay;
      const match = jobBonusType(store.equippedTool);
      if (store.firm && match === store.firm.type && canOperate(store.firm).ok) {
        pay = Math.round(pay * 1.35);
        store.addCash(pay, `${job.label} · ${store.firm.tradeName} · +${pay}\u00a0$`);
      } else {
        store.addCash(pay, `${job.label} · +${pay}\u00a0$`);
      }
      if (job.loot) store.addItem(job.loot, 1);
      return;
    }
    const nearCar = Math.hypot(this.walker.x - this.vehicle.x, this.walker.z - this.vehicle.z);
    if (nearCar < 4.2) {
      this.enterVehicle();
      return;
    }
    const door = this.world.nearestDoor(this.walker.x, this.walker.z, 4.8);
    if (door) {
      if (door.kind === "hotel" && !hotelSecurity.isUnlocked(door.id)) {
        if ((store.inventory.crochet ?? 0) > 0) {
          const inv = { ...store.inventory };
          inv.crochet = (inv.crochet ?? 1) - 1;
          if (inv.crochet <= 0) delete inv.crochet;
          hotelSecurity.pick(door.id);
          store.setHud({
            inventory: inv,
            notice: "Serrure crochetée",
            unlockedDoors: hotelSecurity.snapshot().unlockedDoors,
          });
          persist();
          this.enterInterior(door);
          return;
        }
        this.pendingDoor = door;
        store.openLock(door.id, door.name);
        return;
      }
      this.enterInterior(door);
      return;
    }
    const range = harvestRange(store.equippedTool);
    const fauna = this.world.wildlife.nearestHarvestable(this.walker.x, this.walker.z, range);
    if (fauna) this.harvestFauna(fauna.id);
  }

  private harvestFauna(id: string) {
    const store = useGameStore.getState();
    const ammoId = ammoFor(store.equippedTool);
    if (ammoId && (store.inventory[ammoId] ?? 0) < 1) {
      store.setHud({ notice: "Plus de munitions" });
      return;
    }
    const result = this.world.wildlife.harvest(id);
    if (!result) return;
    if (store.equippedTool === "carabine") cycleCarabine(this.walker.group);
    if (store.equippedTool === "ak74") cycleAk74(this.walker.group);
    if (ammoId) {
      const n = (store.inventory[ammoId] ?? 1) - 1;
      const inventory = { ...store.inventory };
      if (n <= 0) delete inventory[ammoId];
      else inventory[ammoId] = n;
      store.setHud({ inventory });
    }
    const licensed = (store.inventory.permis ?? 0) > 0;
    for (const item of result.items) {
      store.addItem(item.id, item.quantity);
    }
    const loot = result.items
      .map((i) => {
        const it = itemById(i.id);
        return `${i.quantity}× ${it?.name ?? i.id}`;
      })
      .join(", ");
    if (licensed) {
      store.setHud({ notice: `Prélèvement MFFP · ${result.name} · ${loot}` });
    } else {
      police.report("poaching", this.elapsed);
      store.setHud({ notice: `Braconnage · ${result.name} · SQ alertée` });
    }
  }

  enterPendingInterior() {
    const door = this.pendingDoor;
    useGameStore.getState().closeLock();
    useGameStore.getState().setHud({ unlockedDoors: hotelSecurity.snapshot().unlockedDoors });
    persist();
    if (door) this.enterInterior(door);
  }

  private exitVehicle() {
    const side = 2.15;
    const rx = Math.cos(this.vehicle.yaw);
    const rz = -Math.sin(this.vehicle.yaw);
    this.walker.place(this.vehicle.x + rx * side, this.vehicle.z + rz * side, this.vehicle.yaw, false);
    this.vehicle.speed = 0;
    this.mode = "walk";
    this.camera.near = 0.2;
    this.camera.updateProjectionMatrix();
  }

  private enterVehicle() {
    const s = useGameStore.getState();
    for (const [id, h] of Object.entries(s.houses)) {
      if (h.parked.includes(s.vehicleId)) {
        useGameStore.setState({ deedId: id });
        s.takeFromGarage(s.vehicleId);
        this.vehicle.group.visible = true;
        this.refreshHouses();
        break;
      }
    }
    this.walker.hide();
    this.vehicle.speed = 0;
    this.vehicle.snap();
    this.mode = "drive";
    this.camera.near = 0.35;
    this.camera.updateProjectionMatrix();
  }

  private enterInterior(door: CityDoor) {
    if (door.kind === "depanneur") {
      const shop =
        this.world.shops.find((s) => s.id === door.id) ?? this.world.nearestShop(door.x, door.z, 16);
      this.enterDepanneur(shop ?? null, door);
      return;
    }
    this.lastDoor = door;
    const room =
      door.kind === "hotel"
        ? this.interiors.lobby
        : door.kind === "boutique"
          ? this.interiors.boutique
          : door.kind === "prison"
            ? this.interiors.prison
            : this.interiors.apartment;
    this.showRoom(room, door.kind === "hotel" ? 0.7 : door.kind === "boutique" ? 0.72 : door.kind === "prison" ? 0.45 : 1.15);
  }

  showFloor(id: "lobby" | "hotel" | "apartment" | "corridor" | "prison" | "depanneur") {
    useGameStore.getState().closeElevator();
    useGameStore.getState().stand();
    const room = this.interiors[id];
    this.showRoom(
      room,
      id === "lobby" ? 0.7 : id === "hotel" ? 0.85 : id === "corridor" ? 0.55 : id === "prison" ? 0.45 : id === "depanneur" ? 0.9 : 1.15,
    );
  }

  private showRoom(room: InteriorRoom, hemi: number) {
    if (this.activeInterior) this.activeInterior.group.visible = false;
    this.activeInterior = room;
    room.group.visible = true;
    this.world.setExteriorVisible(false);
    this.vehicle.group.visible = false;
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) {
      if (this.mode !== "interior") {
        this.savedFog.copy(fog.color);
        this.savedFogDensity = fog.density;
      }
      fog.color.setHex(0x1a1a24);
      fog.density = 0.012;
    }
    this.scene.background = new THREE.Color(0x0c0c14);
    this.indoorHemi.intensity = hemi;
    this.lastShadow.set(1e6, 0, 0);
    setLobbyLights(this.interiors.lobby.group, useGameStore.getState().lobbyLights);
    const origin = room.group.position;
    this.walker.place(
      origin.x + room.spawn.x,
      origin.z + room.spawn.z,
      room.spawnYaw,
      true,
      origin.y,
      room.walls.map((w) => ({
        minX: w.minX + origin.x,
        maxX: w.maxX + origin.x,
        minZ: w.minZ + origin.z,
        maxZ: w.maxZ + origin.z,
      })),
    );
    this.mode = "interior";
    this.camera.near = 0.12;
    this.camera.fov = 68;
    this.camera.updateProjectionMatrix();
    useGameStore.getState().setHud({ interiorKind: room.kind, paused: false, mode: "interior" });
  }

  private leaveInterior() {
    const room = this.activeInterior;
    useGameStore.getState().stand();
    if (room && (room.kind === "hotel" || (room.kind === "apartment" && this.lastDoor?.kind === "hotel"))) {
      this.showFloor("corridor");
      return;
    }
    if (room && room.kind === "corridor") {
      this.showFloor("lobby");
      return;
    }
    if (room && (room.kind === "depanneur" || room.kind === "boutique")) {
      this.stealUnpaidCart();
    }
    if (this.caddie) this.caddie.visible = false;
    this.depShopId = null;
    if (room) room.group.visible = false;
    this.activeInterior = null;
    this.world.setExteriorVisible(true);
    const parked = Object.values(useGameStore.getState().houses).some((h) =>
      h.parked.includes(useGameStore.getState().vehicleId),
    );
    this.vehicle.group.visible = !parked;
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.copy(this.savedFog);
      fog.density = this.savedFogDensity;
    }
    this.scene.background = new THREE.Color(this.night ? 0x0a1020 : 0x7a9aaa);
    this.indoorHemi.intensity = 0;
    this.lastShadow.set(1e6, 0, 0);
    const door = this.lastDoor;
    if (door) {
      this.walker.place(door.x + Math.sin(door.yaw) * 1.6, door.z + Math.cos(door.yaw) * 1.6, door.yaw + Math.PI, false);
    } else {
      this.walker.place(this.vehicle.x + 2.2, this.vehicle.z, this.vehicle.yaw, false);
    }
    this.mode = "walk";
    this.camera.near = 0.2;
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    useGameStore.getState().setHud({ interiorKind: null, mode: "walk" });
  }

  private tryLobbyBits(): boolean {
    const room = this.activeInterior;
    if (!room) return false;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    const wx = this.walker.x - ox;
    const wz = this.walker.z - oz;
    if (room.bell && Math.hypot(wx - room.bell.x, wz - room.bell.z) < 1.6) {
      useGameStore.getState().ringBell();
      return true;
    }
    if (room.lightSwitch && Math.hypot(wx - room.lightSwitch.x, wz - room.lightSwitch.z) < 1.6) {
      useGameStore.getState().toggleLobbyLights();
      setLobbyLights(this.interiors.lobby.group, useGameStore.getState().lobbyLights);
      return true;
    }
    if (room.elevator && Math.hypot(wx - room.elevator.x, wz - room.elevator.z) < 1.8) {
      useGameStore.getState().openElevator();
      return true;
    }
    if (room.minibar && Math.hypot(wx - room.minibar.x, wz - room.minibar.z) < 1.6) {
      const store = useGameStore.getState();
      if (store.cash < 8) {
        store.setHud({ notice: "Mini-bar · 8 $ requis" });
        return true;
      }
      store.addCash(-8, "Mini-bar · cola");
      useGameStore.setState((s) => ({ surv: applyMeal(s.surv, "drink") }));
      return true;
    }
    return false;
  }

  private updateCamera(dt: number) {
    const indoor = this.mode === "interior";
    const onFoot = this.mode !== "drive";
    const x = this.px();
    const y = this.py();
    const z = this.pz();
    const fx = onFoot ? this.walker.headingX : this.vehicle.headingX;
    const fz = onFoot ? this.walker.headingZ : this.vehicle.headingZ;
    const hood = !onFoot && this.cameraMode === "hood";
    const corridor = indoor && this.activeInterior?.kind === "corridor";
    const sitting = indoor && useGameStore.getState().sitting;
    const dist = indoor ? (sitting ? 2.2 : corridor ? 1.65 : 2.7) : onFoot ? 4.4 : hood ? 2.4 : 9.2;
    const height = indoor ? (sitting ? 1.28 : corridor ? 1.55 : 1.82) : onFoot ? 2.05 : hood ? 1.55 : 3.6;
    const lookAhead = indoor ? 3.6 : onFoot ? 3.2 : hood ? 10 : 6;
    const lookY = onFoot ? y + (indoor ? 1.15 : 1.35) : y + 1.1;
    this.camPos.set(x - fx * dist, y + height, z - fz * dist);
    if (indoor) this.camPos.y = Math.max(this.camPos.y, INTERIOR_ORIGIN.y + 1.2);
    const k = 1 - Math.exp(-(hood ? 10 : onFoot ? 7 : 5.2) * dt);
    this.camera.position.lerp(this.camPos, k);
    this.look.set(x + fx * lookAhead, lookY, z + fz * lookAhead);
    this.camera.lookAt(this.look);
    const speedKmh = onFoot ? 0 : Math.abs(this.vehicle.speed) * 3.6;
    this.camera.fov = onFoot ? 60 : 62 + Math.min(12, speedKmh * 0.08);
    this.camera.updateProjectionMatrix();
  }

  private updateCreatorCamera(dt: number) {
    if (this.mode === "drive") this.exitVehicle();
    this.walker.present(dt, this.elapsed);
    const x = this.walker.x;
    const y = this.walker.y;
    const z = this.walker.z;
    const knight = this.walker.look.model === "troxt";
    const dist = knight ? 3.55 : 2.15;
    const t = this.elapsed * 0.35;
    this.camera.near = 0.12;
    this.camera.fov = knight ? 36 : 32;
    this.camera.position.set(x + Math.sin(t) * dist + 0.9, y + (knight ? 1.72 : 1.42), z + Math.cos(t) * dist);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(x - 0.25, y + (knight ? 1.28 : 1.08), z);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  applyAppearance(look: Appearance) {
    this.walker.applyLook(look);
  }

  swapVehicle(id: VehicleId) {
    const vis = this.vehicle.group.visible;
    this.vehicle.setKind(id);
    this.vehicle.group.visible = vis;
    this.vehicle.snap();
    this.syncCargo();
  }

  private async cycleRadio() {
    await quebecFM.ensure();
    const station = quebecFM.cycle();
    const np = quebecFM.nowPlaying();
    useGameStore.getState().setHud({
      radioOn: true,
      radioId: station.id,
      radioTrack: `${np.track.title} · ${np.track.artist}`,
      notice: `${station.name} · ${station.freq} FM`,
    });
    persist();
  }

  private tickPolice(dt: number, god: boolean) {
    if (god) {
      if (police.stars > 0) police.clear("Godmode");
      police.siren.setActive(false);
      return;
    }
    if (this.mode === "interior") return;
    const store = useGameStore.getState();
    if (store.citationOpen) return;
    const x = this.px();
    const z = this.pz();
    const speedKmh = this.mode === "drive" ? Math.abs(this.vehicle.speed) * 3.6 : Math.abs(this.walker.speed) * 3.6;
    const dist = this.world.nearestPoliceDist(x, z);
    police.update(dt, dist, speedKmh, this.elapsed);

    if (this.mode === "drive" && speedKmh > 40 && this.world.ramPolice(x, z, 4.6) && this.elapsed - this.lastRamAt > 2.4) {
      this.lastRamAt = this.elapsed;
      police.report(speedKmh > 70 ? "officer_assault" : "hit_and_run", this.elapsed);
      useGameStore.getState().setHud({ notice: "Collision · unité SQ" });
    }

    if (
      police.stars > 0 &&
      dist < (this.mode === "drive" ? 5.2 : 3.4) * policeCatchMul(x, z) &&
      speedKmh < 16 &&
      this.elapsed - this.lastCatchAt > 4
    ) {
      this.lastCatchAt = this.elapsed;
      if (this.mode === "drive") this.vehicle.speed = 0;
      if (police.stars >= 4) {
        const notice = police.arrest();
        const booked = prisonSystem.book(useGameStore.getState().appearance.name || "Citoyen", chargesForStars(police.stars));
        const door = this.world.doors.find((d) => d.kind === "prison");
        if (door) {
          if (this.mode === "drive") this.exitVehicle();
          this.lastDoor = door;
          this.enterInterior(door);
        } else {
          this.teleport(PRISON.x, PRISON.z + 42);
        }
        useGameStore.getState().openCitation({
          ...notice,
          message: `${notice.message} · ${booked.booking} · cellule A-1-04`,
        });
      } else {
        useGameStore.getState().openCitation(police.pullOver());
      }
    }
  }

  private promptText(): string | null {
    if (useGameStore.getState().buildOpen) {
      const t = useGameStore.getState().buildType;
      return t ? `E — Placer ${t} · Q rotation` : "Builder · choisissez un objet";
    }
    if (this.mode === "drive") {
      if (this.nearSwing(3.2) && Math.abs(this.vehicle.speed) > 2.4) return "Foncez — les portes s'ouvrent";
      if (Math.abs(this.vehicle.speed) < 3.2) {
        const haul = this.haulPrompt();
        if (haul) return haul;
        const firm = this.firmPrompt();
        if (firm) return firm;
        const park = this.parkPrompt();
        if (park) return park;
        const shop = this.world.nearestShop(this.vehicle.x, this.vehicle.z, 10);
        if (shop) return `E — Descendre · ${shop.name}`;
        return "E — Descendre du véhicule";
      }
      return null;
    }
    if (this.mode === "interior") {
      const room = this.activeInterior;
      if (!room) return null;
      const tv = this.tvPrompt();
      if (tv) return tv;
      const caisse = this.caissePrompt();
      if (caisse) return caisse;
      const garment = this.garmentPrompt();
      if (garment) return garment;
      const depP = this.depInteriorPrompt();
      if (depP) return depP;
      const lobby = this.lobbyPrompt();
      if (lobby) return lobby;
      const sit = this.sitPrompt();
      if (sit) return sit;
      const hall = this.hallPrompt();
      if (hall) return hall;
      const homeP = this.homePrompt();
      if (homeP) return homeP;
      const dx = this.walker.x - (room.group.position.x + room.exit.x);
      const dz = this.walker.z - (room.group.position.z + room.exit.z);
      if (Math.hypot(dx, dz) < 2.6) {
        if (room.kind === "lobby") return "E — Sortir dans la rue";
        if (room.kind === "corridor") return "E — Retour au lobby";
        if (room.kind === "hotel" || room.kind === "apartment") return "E — Retour au couloir";
        if (room.kind === "home") return this.homeFloor === "basement" ? "E — Remonter" : "E — Sortir";
        if (room.kind === "depanneur") return "E — Sortir du dépanneur";
        return "E — Sortir";
      }
      return null;
    }
    const haul = this.haulPrompt();
    if (haul) return haul;
    const firmP = this.firmPrompt();
    if (firmP) return firmP;
    const shopNow = this.world.nearestShop(this.walker.x, this.walker.z, 9);
    if (shopNow?.kind === "depanneur") return this.depLotPrompt(shopNow);
    const biz = this.countyFirmPrompt();
    if (biz) return biz;
    const atm = this.world.nearestAtm(this.walker.x, this.walker.z, 4.8);
    if (atm) return `E — Guichet · ${atm.name}`;
    const vend = this.world.nearestStreet(this.walker.x, this.walker.z, 2.4, "vending");
    if (vend) return `E — ${vend.name} · cola 2,50 $`;
    if (useGameStore.getState().sitting) return "E — Se lever";
    const fire = this.world.nearestStreet(this.walker.x, this.walker.z, 2.6, "campfire");
    if (fire) return `E — S'asseoir · ${fire.name}`;
    const bus = this.world.nearestStreet(this.walker.x, this.walker.z, 2.2, "bus");
    if (bus) return `E — S'asseoir · ${bus.name}`;
    const bench = this.world.nearestStreet(this.walker.x, this.walker.z, 2.0, "bench");
    if (bench) return `E — S'asseoir · ${bench.name}`;
    const pump = this.world.nearestStreet(this.walker.x, this.walker.z, 3.2, "pump");
    if (pump) return `E — ${pump.name} · 20 L · 28,40 $`;
    const dump = this.world.nearestStreet(this.walker.x, this.walker.z, 2.6, "dump");
    if (dump) return "E — Fouiller le conteneur";
    const mail = this.world.nearestStreet(this.walker.x, this.walker.z, 1.8, "mail");
    if (mail) return "E — Boîte aux lettres";
    if (this.nearPortal()) return "E — Téléporteur · Saint-Alban";
    const field = this.world.nearestField(this.walker.x, this.walker.z, 14);
    if (field) return fieldPrompt(field, useGameStore.getState().equippedTool, useGameStore.getState().selectedSeed);
    const stNow = useGameStore.getState();
    const stock = this.world.nearestStock(this.walker.x, this.walker.z, 3.6);
    if (stock) {
      const feed = stock.kind === "vache" ? (stNow.inventory.foin ?? 0) > 0 : (stNow.inventory.ble ?? 0) > 0;
      return stockPrompt(stock, this.elapsed, feed);
    }
    const evap = this.world.nearestEvap(this.walker.x, this.walker.z, 3.6);
    if (evap) return evapPrompt(evap, stNow.inventory.eau_erable ?? 0);
    const tap = this.world.nearestTap(this.walker.x, this.walker.z, 2.8);
    if (tap) return tapPrompt(tap, this.elapsed);
    const houseHit = this.world.nearestHouseHot(this.walker.x, this.walker.z, 8);
    if (houseHit && (houseHit.kind !== "lot" || houseHit.dist < 5.5)) {
      const st = useGameStore.getState();
      return housePrompt(
        houseHit.lot,
        houseHit.kind,
        st.ownedProps.includes(houseHit.lot.deedId),
        st.houses[houseHit.lot.deedId],
        st.inventory,
        false,
      );
    }
    const crime = this.world.nearestCrime(this.walker.x, this.walker.z, 4.8);
    if (crime) {
      const spec = crimeById(crime.crime);
      return `E — ${spec.name} · ${spec.reward}\u00a0$`;
    }
    const shop = this.world.nearestShop(this.walker.x, this.walker.z, 9);
    if (shop) {
      if (shop.kind === "clothing") {
        const open = this.world.swingDoors.some((d) => d.open);
        return open ? "E — Entrer · Boutique Éther" : "Poussez la porte — corps ou main, ou foncez au pick-up";
      }
      if (shop.kind === "depanneur") {
        return this.depLotPrompt(shop);
      }
      return `E — Entrer au ${shop.name}`;
    }
    const job = workJobAt(useGameStore.getState().equippedTool, this.walker.x, this.walker.z);
    if (job) return `E — ${job.label} · +${job.pay}\u00a0$`;
    const mill = getPoiAt(this.walker.x, this.walker.z);
    if (mill?.id === "donnacona_papeterie") return "Casque CSA · quart à la papeterie";
    if (Math.hypot(this.walker.x - this.vehicle.x, this.walker.z - this.vehicle.z) < 4.2) {
      return "E — Monter dans le véhicule";
    }
    const door = this.world.nearestDoor(this.walker.x, this.walker.z, 4.8);
    if (door) {
      if (door.kind === "hotel" && !hotelSecurity.isUnlocked(door.id)) {
        if ((useGameStore.getState().inventory.crochet ?? 0) > 0) {
          return `E — Crocheter · ${door.name}`;
        }
        return `E — Lecteur de carte · ${door.name}`;
      }
      return `E — ${door.prompt}`;
    }
    const st = useGameStore.getState();
    const range = harvestRange(st.equippedTool);
    const fauna = this.world.wildlife.nearestHarvestable(this.walker.x, this.walker.z, range);
    if (fauna) {
      const ammoId = ammoFor(st.equippedTool);
      if (ammoId && (st.inventory[ammoId] ?? 0) < 1) return "E — Plus de munitions";
      return `E — Prélever ${fauna.name}`;
    }
    return null;
  }

  private haulPrompt(): string | null {
    const job = useGameStore.getState().job;
    if (!job) return null;
    if (!nearHaul(job, this.px(), this.pz())) return null;
    if (!job.loaded) return `E — Charger · ${job.from.name}`;
    return `E — Livrer · ${job.to.name} · ${job.pay}\u00a0$`;
  }

  private tryHaul(): boolean {
    const store = useGameStore.getState();
    if (!store.job) return false;
    if (!nearHaul(store.job, this.px(), this.pz())) return false;
    store.progressHaul(this.vehicle.kind);
    this.syncCargo();
    return true;
  }

  private firmPrompt(): string | null {
    const firm = useGameStore.getState().firm;
    if (!firm) return null;
    if (Math.hypot(this.px() - firm.x, this.pz() - firm.z) > 10) return null;
    return `E — ${firm.isOpen ? "Gérer" : "Enseigne"} · ${firm.tradeName}`;
  }

  private countyFirmPrompt(): string | null {
    const biz = this.world.nearestCountyFirm(this.px(), this.pz(), 8);
    if (!biz) return null;
    if (shopKindForFirm(biz.type)) return `E — Magasin · ${biz.name}`;
    return `E — Contrat · ${biz.name}`;
  }

  private tryFirm(): boolean {
    const store = useGameStore.getState();
    if (!store.firm) return false;
    if (Math.hypot(this.px() - store.firm.x, this.pz() - store.firm.z) > 10) return false;
    store.openFirm();
    return true;
  }

  private tvPrompt(): string | null {
    const room = this.activeInterior;
    if (!room?.tvSetup) return null;
    room.tvSetup.tvInteract.getWorldPosition(this.tvWorld);
    if (Math.hypot(this.walker.x - this.tvWorld.x, this.walker.z - this.tvWorld.z) > 1.7) return null;
    return useGameStore.getState().hotelTvOn ? "E — Éteindre la TV" : "E — Allumer Best Life";
  }

  private tryTv(): boolean {
    const room = this.activeInterior;
    if (!room?.tvSetup) return false;
    room.tvSetup.tvInteract.getWorldPosition(this.tvWorld);
    if (Math.hypot(this.walker.x - this.tvWorld.x, this.walker.z - this.tvWorld.z) > 1.7) return false;
    useGameStore.getState().toggleHotelTv();
    return true;
  }

  private lobbyPrompt(): string | null {
    const room = this.activeInterior;
    if (!room) return null;
    const wx = this.walker.x - room.group.position.x;
    const wz = this.walker.z - room.group.position.z;
    if (room.bell && Math.hypot(wx - room.bell.x, wz - room.bell.z) < 1.6) return "E — Sonner à la réception";
    if (room.lightSwitch && Math.hypot(wx - room.lightSwitch.x, wz - room.lightSwitch.z) < 1.6) {
      return useGameStore.getState().lobbyLights ? "E — Éteindre les lustres" : "E — Allumer les lustres";
    }
    if (room.elevator && Math.hypot(wx - room.elevator.x, wz - room.elevator.z) < 1.8) return "E — Ascenseur";
    if (room.minibar && Math.hypot(wx - room.minibar.x, wz - room.minibar.z) < 1.6) return "E — Mini-bar · cola 8 $";
    return null;
  }

  private nearSit() {
    const room = this.activeInterior;
    if (!room?.sits) return null;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    let best = null as (typeof room.sits)[number] | null;
    let bestD = 1.35;
    for (const s of room.sits) {
      const d = Math.hypot(this.walker.x - (ox + s.x), this.walker.z - (oz + s.z));
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  private sitPrompt(): string | null {
    if (useGameStore.getState().sitting) return "E — Se lever";
    return this.nearSit() ? "E — S'asseoir" : null;
  }

  private trySit(): boolean {
    const spot = this.nearSit();
    if (!spot || !this.activeInterior) return false;
    const origin = this.activeInterior.group.position;
    this.walker.place(origin.x + spot.x, origin.z + spot.z, spot.yaw, true, origin.y, this.walker.walls);
    useGameStore.getState().sit();
    return true;
  }

  private nearPortal(): boolean {
    let hit = false;
    let best = 2.4;
    this.props.group.traverse((o) => {
      if (!o.userData.teleport && o.name !== "teleporter") return;
      o.getWorldPosition(this.tvWorld);
      const d = Math.hypot(this.walker.x - this.tvWorld.x, this.walker.z - this.tvWorld.z);
      if (d < best) {
        best = d;
        hit = true;
      }
    });
    return hit;
  }

  private tryPortal(): boolean {
    if (!this.nearPortal()) return false;
    this.teleport(SPAWN.x, SPAWN.z);
    useGameStore.getState().setHud({ notice: "Téléport · Saint-Alban" });
    return true;
  }

  private tryFarm(field: import("./farms").FieldPlot) {
    if (this.elapsed - this.lastJobAt < 1.1) return;
    const store = useGameStore.getState();
    if (field.stage === "laboure" && store.selectedSeed) {
      const spec = CROPS[store.selectedSeed];
      if ((store.inventory[spec.seedId] ?? 0) < 1) {
        store.setHud({ notice: "Pas de semence · sac." });
        return;
      }
    }
    const result = workField(field, store.equippedTool, store.selectedSeed, this.elapsed);
    if (!result.ok) {
      store.setHud({ notice: result.notice });
      return;
    }
    this.lastJobAt = this.elapsed;
    if (result.consumeSeed) store.dropItem(result.consumeSeed, 1);
    if (result.loot) store.addItem(result.loot.id, result.loot.n);
    store.setHud({ notice: result.notice });
  }

  private tryStock(stock: import("./livestock").Stock) {
    if (this.elapsed - this.lastJobAt < 1.1) return;
    const store = useGameStore.getState();
    const result = workStock(stock, this.elapsed, (store.inventory.foin ?? 0) > 0, (store.inventory.ble ?? 0) > 0);
    if (!result.ok) {
      store.setHud({ notice: result.notice });
      return;
    }
    this.lastJobAt = this.elapsed;
    if (result.consume) store.dropItem(result.consume, 1);
    if (result.loot) store.addItem(result.loot.id, result.loot.n);
    store.setHud({ notice: result.notice });
  }

  private tryTap(tap: import("./sugar").SugarTap) {
    if (this.elapsed - this.lastJobAt < 1.1) return;
    const store = useGameStore.getState();
    const result = workTap(tap, this.elapsed);
    if (!result.ok) {
      store.setHud({ notice: result.notice });
      return;
    }
    this.lastJobAt = this.elapsed;
    if (result.loot) store.addItem(result.loot.id, result.loot.n);
    store.setHud({ notice: result.notice });
  }

  private tryEvap(evap: import("./sugar").SugarEvap) {
    if (this.elapsed - this.lastJobAt < 1.1) return;
    const store = useGameStore.getState();
    const result = workEvap(evap, this.elapsed, store.inventory.eau_erable ?? 0);
    if (!result.ok) {
      store.setHud({ notice: result.notice });
      return;
    }
    this.lastJobAt = this.elapsed;
    if (result.consume) store.dropItem(result.consume.id, result.consume.n);
    if (result.loot) store.addItem(result.loot.id, result.loot.n);
    store.setHud({ notice: result.notice });
  }

  refreshHouses() {
    const s = useGameStore.getState();
    this.world.syncHouses(s.ownedProps, s.houses);
    if (this.activeInterior?.kind === "home" && this.homeDeedId) {
      const st = s.houses[this.homeDeedId] ?? emptyHouse(this.homeDeedId);
      paintHomeInterior(this.interiors.home, st, this.homeFloor, {
        hydro: hydroLive(st, s.gridOutage),
        heatOn: heatWorks(st, s.gridOutage, 8),
      });
      const origin = this.interiors.home.group.position;
      this.walker.place(
        this.walker.x,
        this.walker.z,
        this.walker.yaw,
        true,
        origin.y,
        this.interiors.home.walls.map((w) => ({
          minX: w.minX + origin.x,
          maxX: w.maxX + origin.x,
          minZ: w.minZ + origin.z,
          maxZ: w.maxZ + origin.z,
        })),
      );
    }
  }

  private tryHouse(): boolean {
    const hit = this.world.nearestHouseHot(this.walker.x, this.walker.z, 8);
    if (!hit || hit.kind === "lot") return false;
    const store = useGameStore.getState();
    const owned = store.ownedProps.includes(hit.lot.deedId);
    if (!owned) {
      store.openDeed(hit.lot.deedId);
      return true;
    }
    if (hit.kind === "mail") {
      store.openDeed(hit.lot.deedId);
      return true;
    }
    if (hit.kind === "work") return this.tryWorkbench();
    if (hit.kind === "garage") return this.enterHome(hit.lot, "garage");
    if (hit.kind === "door") return this.enterHome(hit.lot, "main");
    return false;
  }

  private enterHome(lot: HouseLot, slot: DoorSlot): boolean {
    const store = useGameStore.getState();
    const st = store.houses[lot.deedId] ?? emptyHouse(lot.deedId);
    if (slot === "garage" && !hasReno(st, "garage")) {
      store.openDeed(lot.deedId);
      return true;
    }
    const lock = canOpenDoor(st, slot, store.inventory);
    if (!lock.ok) {
      store.setHud({ notice: doorDenied(slot) });
      return true;
    }
    if (lock.lockpick) store.dropItem("crochet", 1);
    this.homeDeedId = lot.deedId;
    this.homeFloor = "main";
    store.setHud({ homeFloor: "main", deedId: lot.deedId });
    this.lastDoor = {
      id: `home-${lot.deedId}`,
      name: lot.name,
      kind: "home",
      x: lot.door.x,
      y: getTerrainHeight(lot.door.x, lot.door.z),
      z: lot.door.z,
      yaw: lot.door.yaw,
      prompt: "Entrer",
    };
    paintHomeInterior(this.interiors.home, st, "main", {
      hydro: hydroLive(st, store.gridOutage),
      heatOn: heatWorks(st, store.gridOutage, 8),
    });
    const hydro = hydroLive(st, store.gridOutage);
    this.showRoom(this.interiors.home, hydro ? (hasReno(st, "eclairage") ? 0.95 : 0.42) : 0.12);
    if (slot === "garage") {
      const room = this.interiors.home;
      const origin = room.group.position;
      const gx = room.workbench?.x ?? 8;
      const gz = room.workbench?.z ?? 0;
      this.walker.place(
        origin.x + gx,
        origin.z + gz,
        Math.PI / 2,
        true,
        origin.y,
        room.walls.map((w) => ({
          minX: w.minX + origin.x,
          maxX: w.maxX + origin.x,
          minZ: w.minZ + origin.z,
          maxZ: w.maxZ + origin.z,
        })),
      );
    }
    return true;
  }

  private setHomeFloor(floor: "main" | "basement") {
    if (!this.homeDeedId) return;
    const store = useGameStore.getState();
    const st = store.houses[this.homeDeedId] ?? emptyHouse(this.homeDeedId);
    if (floor === "basement") {
      if (!hasReno(st, "soussol")) {
        store.setHud({ notice: "Sous-sol pas fini" });
        return;
      }
      const lock = canOpenDoor(st, "basement", store.inventory);
      if (!lock.ok) {
        store.setHud({ notice: doorDenied("basement") });
        return;
      }
      if (lock.lockpick) store.dropItem("crochet", 1);
    }
    this.homeFloor = floor;
    store.setHud({ homeFloor: floor });
    paintHomeInterior(this.interiors.home, st, floor, {
      hydro: hydroLive(st, store.gridOutage),
      heatOn: heatWorks(st, store.gridOutage, 8),
    });
    const hydro = hydroLive(st, store.gridOutage);
    this.showRoom(this.interiors.home, hydro ? (floor === "basement" ? 0.38 : hasReno(st, "eclairage") ? 0.95 : 0.42) : 0.12);
  }

  private tryHomeBits(): boolean {
    const room = this.activeInterior;
    if (!room || room.kind !== "home") return false;
    const wx = this.walker.x - room.group.position.x;
    const wz = this.walker.z - room.group.position.z;
    if (room.desk && Math.hypot(wx - room.desk.x, wz - room.desk.z) < 1.7) {
      if (this.homeDeedId) useGameStore.getState().openDeed(this.homeDeedId);
      return true;
    }
    if (room.basement && Math.hypot(wx - room.basement.x, wz - room.basement.z) < 1.7) {
      this.setHomeFloor(this.homeFloor === "basement" ? "main" : "basement");
      return true;
    }
    if (room.workbench && Math.hypot(wx - room.workbench.x, wz - room.workbench.z) < 1.8) {
      return this.tryWorkbench();
    }
    if (room.heater && Math.hypot(wx - room.heater.x, wz - room.heater.z) < 1.8) {
      const st = useGameStore.getState();
      if ((st.inventory.corde_bois ?? 0) > 0) st.loadWood(1);
      else st.toggleHeat();
      if (this.homeDeedId) st.setHud({ deedId: this.homeDeedId });
      const next = useGameStore.getState().houses[this.homeDeedId ?? ""];
      if (next) {
        const hours = (16.5 + this.elapsed / 90) % 24;
        const ambient = ambientOf(hours, this.night, gameMonth(this.elapsed));
        setHeatGlow(this.interiors.home.group, heatWorks(next, useGameStore.getState().gridOutage, ambient));
      }
      return true;
    }
    if (room.panel && Math.hypot(wx - room.panel.x, wz - room.panel.z) < 1.7) {
      useGameStore.getState().toggleHydro();
      return true;
    }
    return false;
  }

  private homePrompt(): string | null {
    const room = this.activeInterior;
    if (!room || room.kind !== "home") return null;
    const wx = this.walker.x - room.group.position.x;
    const wz = this.walker.z - room.group.position.z;
    if (room.desk && Math.hypot(wx - room.desk.x, wz - room.desk.z) < 1.7) return "E — Travaux · rénovations";
    if (room.basement && Math.hypot(wx - room.basement.x, wz - room.basement.z) < 1.7) {
      return this.homeFloor === "basement" ? "E — Remonter" : "E — Sous-sol québécois";
    }
    if (room.workbench && Math.hypot(wx - room.workbench.x, wz - room.workbench.z) < 1.8) return "E — Entretien · établi";
    if (room.heater && Math.hypot(wx - room.heater.x, wz - room.heater.z) < 1.8) {
      const st = useGameStore.getState();
      const house = this.homeDeedId ? st.houses[this.homeDeedId] : null;
      if (house && (st.inventory.corde_bois ?? 0) > 0) return "E — Charger le poêle";
      return house?.heatOn ? "E — Couper le chauffage" : "E — Allumer le chauffage";
    }
    if (room.panel && Math.hypot(wx - room.panel.x, wz - room.panel.z) < 1.7) {
      const st = useGameStore.getState();
      const house = this.homeDeedId ? st.houses[this.homeDeedId] : null;
      return house?.hydroOn ? "E — Disjoncteur · couper" : "E — Panneau Hydro · rétablir";
    }
    return null;
  }

  private tryWorkbench(): boolean {
    const store = useGameStore.getState();
    if (store.equippedTool !== "cle" && store.rpJob !== "mecanicien") {
      store.setHud({ notice: "Clé anglaise ou métier mécanicien" });
      return true;
    }
    if (store.cash < 40) {
      store.setHud({ notice: "Entretien · 40 $" });
      return true;
    }
    useGameStore.setState({
      cash: Math.round((store.cash - 40) * 100) / 100,
      notice: "Entretien · huile, pneus, 40 $",
    });
    persist();
    return true;
  }

  private tryParkHouse(): boolean {
    const hit = this.world.nearestHouseHot(this.vehicle.x, this.vehicle.z, 10);
    if (!hit) return false;
    const store = useGameStore.getState();
    if (!store.ownedProps.includes(hit.lot.deedId)) return false;
    const st = store.houses[hit.lot.deedId] ?? emptyHouse(hit.lot.deedId);
    if (!hasReno(st, "garage")) return false;
    if (hit.kind !== "garage" && hit.dist > 8) return false;
    useGameStore.setState({ deedId: hit.lot.deedId });
    const ok = useGameStore.getState().parkInGarage(store.vehicleId);
    if (!ok) return true;
    this.vehicle.group.visible = false;
    this.refreshHouses();
    this.exitVehicle();
    this.walker.place(hit.lot.door.x, hit.lot.door.z, hit.lot.door.yaw, false);
    return true;
  }

  private parkPrompt(): string | null {
    const hit = this.world.nearestHouseHot(this.vehicle.x, this.vehicle.z, 10);
    if (!hit) return null;
    const store = useGameStore.getState();
    if (!store.ownedProps.includes(hit.lot.deedId)) return null;
    return housePrompt(hit.lot, hit.kind, true, store.houses[hit.lot.deedId], store.inventory, true);
  }

  private seizeCrop(field: import("./farms").FieldPlot) {
    seizeField(field);
    police.report("cultivation", this.elapsed);
    this.world.dispatchFarmRaid(field.x, field.z);
    const store = useGameStore.getState();
    const inv = { ...store.inventory };
    delete inv.graines_cannabis;
    if (inv.weed) delete inv.weed;
    useGameStore.setState({
      inventory: inv,
      notice: `Saisie SQ · ${field.name} · art. 12 LEC`,
      wantedStars: police.stars,
      wantedReason: "Culture illégale de cannabis",
    });
    persist();
  }

  private nearHall() {
    const room = this.activeInterior;
    if (!room?.rooms) return null;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    let best = null as (typeof room.rooms)[number] | null;
    let bestD = 1.45;
    for (const d of room.rooms) {
      const dist = Math.hypot(this.walker.x - (ox + d.x), this.walker.z - (oz + d.z));
      if (dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
    return best;
  }

  private hallPrompt(): string | null {
    const d = this.nearHall();
    if (!d) return null;
    if (d.locked) return `Verrouillée · ${d.label}`;
    return `E — Entrer · ${d.label}`;
  }

  private tryHallDoor(): boolean {
    const d = this.nearHall();
    if (!d) return false;
    if (d.locked) {
      useGameStore.getState().setHud({ notice: `Porte ${d.label} verrouillée` });
      return true;
    }
    this.showFloor(d.to);
    return true;
  }

  private garmentPrompt(): string | null {
    const g = this.nearGarment();
    if (!g) return null;
    const item = itemById(g.itemId);
    if (!item) return null;
    return `E — Au panier · ${item.name} · ${item.price}\u00a0$`;
  }

  private nearGarment() {
    const room = this.activeInterior;
    if (!room?.garments) return null;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    let best = null as (typeof room.garments)[number] | null;
    let bestD = 1.55;
    for (const g of room.garments) {
      const d = Math.hypot(this.walker.x - (ox + g.x), this.walker.z - (oz + g.z));
      if (d < bestD) {
        best = g;
        bestD = d;
      }
    }
    return best;
  }

  private tryGarment(): boolean {
    const g = this.nearGarment();
    if (!g) return false;
    useGameStore.getState().addToCart(g.itemId);
    return true;
  }

  private nearCaisse() {
    const room = this.activeInterior;
    if (!room?.caisse) return false;
    const ox = room.group.position.x + room.caisse.x;
    const oz = room.group.position.z + room.caisse.z;
    return Math.hypot(this.walker.x - ox, this.walker.z - oz) < 1.9;
  }

  private caissePrompt(): string | null {
    if (!this.nearCaisse()) return null;
    const t = cartCount(useGameStore.getState().cart);
    return t > 0 ? `E — Caisse · ${t} article${t > 1 ? "s" : ""}` : "E — Caisse · panier vide";
  }

  private tryCaisse(): boolean {
    if (!this.nearCaisse()) return false;
    useGameStore.getState().openCart();
    return true;
  }

  private stealUnpaidCart() {
    const store = useGameStore.getState();
    const n = cartCount(store.cart);
    if (n <= 0) return;
    for (const [id, qty] of Object.entries(store.cart)) {
      if (qty > 0) store.addItem(id, qty);
    }
    store.clearCart();
    police.report("theft", this.elapsed);
    store.setHud({ notice: "Vol à l'étalage · SQ alertée" });
  }

  private depLotPrompt(shop: ShopSpot): string {
    const pump = shopPumpOffset(shop);
    if (shop.id.startsWith("shop_") && Math.hypot(this.walker.x - pump.x, this.walker.z - pump.z) < 2.9) {
      return "E — Pompe · 20 L · 28,40 $";
    }
    const hours = useGameStore.getState().timeHours;
    const open = isDepOpen(hours);
    if (!open) {
      const inv = useGameStore.getState().inventory;
      const armed = (inv.pistol ?? 0) + (inv.shotgun ?? 0) + (inv.crochet ?? 0) > 0;
      return armed ? `E — Braquer · ${shop.name}` : `Fermé · ${depHoursLabel()}`;
    }
    const near = this.nearSwing(5.2);
    const anyOpen = this.world.swingDoors.some((d) => d.open);
    if (near && !anyOpen) return "Poussez la porte vitrée — puis E";
    return `E — Entrer · ${shop.name}`;
  }

  private tryEnterDepanneur(shop: ShopSpot): boolean {
    const pump = shopPumpOffset(shop);
    if (shop.id.startsWith("shop_") && Math.hypot(this.walker.x - pump.x, this.walker.z - pump.z) < 2.9) {
      const ok = useGameStore.getState().buyItem("essence");
      if (!ok) useGameStore.getState().setHud({ notice: "Pompe · pas assez d'espèces" });
      return true;
    }
    const store = useGameStore.getState();
    const hours = store.timeHours;
    const owner = store.firm?.type === "depanneur";
    const open = isDepOpen(hours) || owner;
    if (!open) {
      const armed = (store.inventory.pistol ?? 0) + (store.inventory.shotgun ?? 0) + (store.inventory.crochet ?? 0) > 0;
      if (!armed) {
        store.setHud({ notice: `Fermé · ${depHoursLabel()}` });
        return true;
      }
      store.commitCrime("robbery", this.elapsed);
    }
    const near = this.nearSwing(5.2);
    const anyOpen = this.world.swingDoors.some((d) => d.open);
    if (near && !anyOpen && open) {
      store.setHud({ notice: "Poussez la porte vitrée" });
      return true;
    }
    const found =
      this.world.doors.find((d) => d.id === shop.id) ??
      this.world.doors.find((d) => d.kind === "depanneur" && Math.hypot(d.x - shop.x, d.z - shop.z) < 18);
    const off = shopDoorOffset(shop);
    const door: CityDoor = found ?? {
      id: shop.id,
      name: shop.name,
      kind: "depanneur",
      x: off.x,
      y: getTerrainHeight(off.x, off.z),
      z: off.z,
      yaw: off.yaw,
      prompt: `Entrer · ${shop.name}`,
    };
    this.enterDepanneur(shop, door);
    return true;
  }

  private enterDepanneur(shop: ShopSpot | null, door: CityDoor) {
    const hours = useGameStore.getState().timeHours;
    const open = isDepOpen(hours);
    this.depShopId = shop?.id ?? door.id;
    this.lastDoor = door;
    const room = this.interiors.depanneur;
    room.title = shop?.name ?? door.name;
    room.subtitle = open ? `${depHoursLabel()} · rayons, caisse, loterie` : "Quart de nuit · lumières basses";
    this.showRoom(room, open ? 0.92 : 0.22);
  }

  private nearAisle(): DepAisleHot | null {
    const room = this.activeInterior;
    if (room?.kind !== "depanneur" || !room.aisles) return null;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    let best: DepAisleHot | null = null;
    let bestD = 1.85;
    for (const a of room.aisles) {
      const d = Math.hypot(this.walker.x - (ox + a.x), this.walker.z - (oz + a.z));
      if (d < bestD) {
        best = a;
        bestD = d;
      }
    }
    return best;
  }

  private depInteriorPrompt(): string | null {
    const room = this.activeInterior;
    if (room?.kind !== "depanneur") return null;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    const wx = this.walker.x - ox;
    const wz = this.walker.z - oz;
    const atAtm = Boolean(room.atmSpot && Math.hypot(wx - room.atmSpot.x, wz - room.atmSpot.z) < 1.6);
    const atBack = Boolean(room.backRoom && Math.hypot(wx - room.backRoom.x, wz - room.backRoom.z) < 1.7);
    return depPrompt(
      this.nearAisle(),
      this.nearGarment(),
      this.nearCaisse(),
      atAtm,
      atBack,
      cartCount(useGameStore.getState().cart),
      useGameStore.getState().firm?.type === "depanneur",
    );
  }

  private tryDepBits(): boolean {
    const room = this.activeInterior;
    if (room?.kind !== "depanneur") return false;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    const wx = this.walker.x - ox;
    const wz = this.walker.z - oz;
    const store = useGameStore.getState();
    if (room.atmSpot && Math.hypot(wx - room.atmSpot.x, wz - room.atmSpot.z) < 1.6) {
      store.openAtm("atm_dep");
      return true;
    }
    if (room.backRoom && Math.hypot(wx - room.backRoom.x, wz - room.backRoom.z) < 1.7) {
      if (store.firm?.type === "depanneur") {
        store.openFirm();
        return true;
      }
      store.setHud({ notice: "Personnel seulement" });
      return true;
    }
    const aisle = this.nearAisle();
    if (aisle && aisle.items.length > 0 && !this.nearGarment()) {
      if (this.depShopId) store.openShop(this.depShopId, aisle.id);
      else store.addToCart(aisle.items[0]!);
      return true;
    }
    return false;
  }

  private syncCaddie() {
    const room = this.activeInterior;
    const inShop = this.mode === "interior" && (room?.kind === "boutique" || room?.kind === "depanneur");
    if (!inShop) {
      if (this.caddie) this.caddie.visible = false;
      return;
    }
    if (!this.caddie) {
      this.caddie = buildCaddie();
      this.scene.add(this.caddie);
    }
    this.caddie.visible = true;
    const n = cartCount(useGameStore.getState().cart);
    const key = `${n}`;
    if (key !== this.lastCartKey) {
      this.lastCartKey = key;
      fillCaddie(this.caddie, n);
    }
    const hx = this.walker.headingX;
    const hz = this.walker.headingZ;
    this.caddie.position.set(
      this.walker.x - hx * 1.15,
      (this.walker.y || this.walker.floorY) + 0.02,
      this.walker.z - hz * 1.15,
    );
    this.caddie.rotation.y = this.walker.yaw;
  }

  private nearSwing(max: number) {
    for (const d of this.world.swingDoors) {
      d.worldHit(this.doorHit);
      if (Math.hypot(this.px() - this.doorHit.x, this.pz() - this.doorHit.z) < max) return true;
    }
    return false;
  }

  private tickSwing(dt: number) {
    const body = this.walker.group.getObjectByName("ether-body");
    const hand = this.walker.group.getObjectByName("ether-hand");
    if (this.mode === "walk" && body) body.getWorldPosition(this.bodyHit);
    else this.bodyHit.set(this.px(), this.py() + 1.1, this.pz());
    if (this.mode === "walk" && hand) hand.getWorldPosition(this.handHit);
    else {
      const yaw = this.pYaw();
      this.handHit.set(
        this.px() - Math.sin(yaw) * 0.42 + Math.cos(yaw) * 0.28,
        this.py() + 0.88,
        this.pz() - Math.cos(yaw) * 0.42 - Math.sin(yaw) * 0.28,
      );
    }

    let anyOpen = false;
    let reach = 0;
    for (const d of this.world.swingDoors) {
      d.leafCenter(this.doorHit);
      d.handleWorld(this.handleHit);
      const _bodyDist = Math.hypot(this.bodyHit.x - this.doorHit.x, this.bodyHit.z - this.doorHit.z);
      const handDist = Math.hypot(
        this.handHit.x - this.handleHit.x,
        this.handHit.y - this.handleHit.y,
        this.handHit.z - this.handleHit.z,
      );
      const slab = d.slabDist(this.walker.x, this.walker.z);
      const bumper = Math.hypot(this.px() - this.doorHit.x, this.pz() - this.doorHit.z);

      if (this.mode === "drive" && bumper < 3.8 && Math.abs(this.vehicle.speed) > 2.8) {
        d.hit(Math.max(4.2, Math.abs(this.vehicle.speed) * 0.85));
        this.vehicle.speed *= 0.5;
        if (this.elapsed - this.lastSwingAt > 0.8) {
          this.lastSwingAt = this.elapsed;
          useGameStore.getState().setHud({ notice: "Portes vitrées — ça cède" });
        }
      }

      if (this.mode === "walk") {
        if (handDist < 0.7) {
          d.push(dt, 16 + Math.abs(this.walker.speed) * 6);
          reach = Math.max(reach, 1 - handDist / 0.7);
        }
        if (slab < 0.7 && Math.abs(this.walker.speed) > 0.08) {
          d.push(dt, 28 + Math.abs(this.walker.speed) * 10);
        }
      }

      d.tick(dt);
      if (d.open) anyOpen = true;
    }
    this.walker.reach = this.mode === "walk" ? reach : 0;

    if (this.mode === "walk" && anyOpen && this.elapsed - this.lastSwingAt > 0.6) {
      const door = this.world.nearestDoor(this.walker.x, this.walker.z, 1.35);
      if (door?.kind === "boutique") {
        this.lastSwingAt = this.elapsed;
        this.enterInterior(door);
      }
    }
  }

  private syncCargo() {
    const job = useGameStore.getState().job;
    let crate = this.vehicle.group.getObjectByName("cargo");
    const show = Boolean(job?.loaded && job.kind !== "taxi" && fleetById(this.vehicle.kind).caisse);
    if (show && !crate) {
      crate = buildCargoCrate();
      const k = this.vehicle.kind;
      const pos =
        k === "camion"
          ? ([0, 1.85, -1.6] as const)
          : k === "fourgon"
            ? ([0, 1.55, -1.3] as const)
            : k === "pickup" || k === "deplaceige" || k === "remorqueuse"
              ? ([0, 1.18, -1.12] as const)
              : ([0, 1.5, -0.12] as const);
      crate.position.set(pos[0], pos[1], pos[2]);
      this.vehicle.group.add(crate);
    }
    if (crate) {
      crate.visible = show;
      const kg = haulCargoKg(job);
      const s = 0.85 + Math.min(1.6, kg / 500);
      crate.scale.set(s, s * (0.7 + Math.min(0.5, kg / 900)), s);
    }
  }

  private pushHud() {
    const onFoot = this.mode !== "drive";
    const x = this.px();
    const z = this.pz();
    const yaw = this.pYaw();
    const { limit, name } = getSpeedLimitAt(x, z);
    const speedKmh = onFoot ? Math.abs(this.walker.speed) * 3.6 : Math.abs(this.vehicle.speed) * 3.6;
    const surface = getSurfaceAt(x, z);
    const zp = zoneSystem.getAt(x, z);
    const zone = zp?.name ?? getZoneName(x, z);
    const poi = this.mode === "interior" ? null : getPoiAt(x, z);
    const speeding = ENFORCE_SPEED_LIMITS && !onFoot && speedKmh > limit + 5;
    const god = useGameStore.getState().godMode;
    let fineFlash = useGameStore.getState().fineFlash;
    let fines = useGameStore.getState().fines;
    if (speeding && !god && this.elapsed - this.lastFineAt > 4) {
      this.lastFineAt = this.elapsed;
      const excess = speedKmh - limit;
      const add = excess < 20 ? 105 : excess < 40 ? 225 : excess < 60 ? 495 : 1050;
      fines += add;
      fineFlash = add;
      const hit = police.reportSpeeding(excess, this.elapsed);
      const label = hit?.citation ? `${hit.citation.article} · −${add}\u00a0$` : `Contravention · −${add}\u00a0$`;
      useGameStore.getState().addCash(-add, label);
    } else {
      fineFlash = Math.max(0, fineFlash - 18);
    }
    const km = useGameStore.getState().km + this.kmAcc / 1000;
    this.kmAcc = 0;
    const hours = (16.5 + this.elapsed / 90) % 24;

    let leaves = useGameStore.getState().leaves;
    if (this.mode === "walk") {
      const found = this.world.nearestLeaf(x, z, 1.8);
      if (found && this.world.collectLeaf(found.id)) {
        leaves = leaves.includes(found.id) ? leaves : [...leaves, found.id];
        useGameStore.getState().addCash(8, "Feuille d'érable · +8\u00a0$");
        persist();
      }
    }

    const fieldHere = this.mode === "interior" ? null : this.world.nearestField(x, z, 18);
    const bushHere = this.mode === "interior" || fieldHere ? null : this.world.nearestBush(x, z, 36);
    const room = this.activeInterior;
    const wanted = police.getState();
    const np = quebecFM.on ? quebecFM.nowPlaying() : null;
    useGameStore.getState().setHud({
      speedKmh,
      limit: onFoot || !ENFORCE_SPEED_LIMITS ? 0 : limit,
      zone:
        this.mode === "interior"
          ? (room?.title ?? "Intérieur")
          : fieldHere
            ? fieldHere.name
            : bushHere
              ? bushHere.name
              : (poi?.name ?? (name.includes("Route") || name.includes("Autoroute") ? name : zone)),
      surface: this.mode === "interior" ? (room?.subtitle ?? "Intérieur") : onFoot ? "À pied" : surface.name,
      speeding,
      fineFlash,
      fines,
      x,
      z,
      yaw,
      km,
      timeHours: hours,
      night: this.night,
      cameraMode: this.cameraMode,
      poi: poi?.name ?? null,
      poiDesc: poi?.description ?? null,
      mode: this.mode,
      prompt: this.promptText(),
      interiorTitle: room?.title ?? null,
      interiorSub:
        room?.kind === "prison" && prisonSystem.inmate
          ? `${prisonSystem.inmate.booking} · ${prisonSystem.remain().toFixed(0)} min · ${prisonSystem.lockdown ? "LOCKDOWN" : "cour fermée"}`
          : (room?.subtitle ?? null),
      leaves,
      fauna: this.mode === "interior" ? null : this.world.wildlife.warning,
      wantedStars: wanted.stars,
      wantedReason: wanted.reason,
      bounty: wanted.bounty,
      evading: wanted.evading,
      dispatch: police.dispatchLine(),
      radioOn: quebecFM.on,
      radioId: quebecFM.stationId,
      radioTrack: np ? `${np.track.title} · ${np.track.artist}` : null,
    });
    if (poi) useGameStore.getState().visit(poi.id);
  }

  runAdmin(raw: string) {
    const store = useGameStore.getState();
    return parseAdmin(raw, {
      teleport: (x, z) => this.teleport(x, z),
      toggleNight: () => this.toggleNight(),
      addCash: (n, notice) => store.addCash(n, notice),
      setGod: (on) => store.setHud({ godMode: on }),
      get god() {
        return useGameStore.getState().godMode;
      },
      hunt: () => {
        const e = this.world.wildlife.entities;
        const lines = e.map((a) => {
          const d = Math.hypot(a.x - this.px(), a.z - this.pz());
          return `${a.name} · ${d.toFixed(0)} m · ${a.harvested ? "prélevé" : a.state}`;
        });
        return `Faune du comté\n${lines.join("\n")}`;
      },
      grantLic: (id) => useGameStore.getState().grantLic(id),
      playFx: (id) => this.fx.play(id),
      clearFx: () => this.fx.clear(),
      spawnProp: (type) => {
        if (!isPropId(type)) return false;
        useGameStore.getState().selectProp(type);
        this.placeProp();
        return true;
      },
      animNearest: (type) => {
        const id = this.props.nearest(this.px(), this.pz(), 8);
        const mesh = id ? this.props.get(id) : null;
        if (!mesh) return "Aucun prop proche.";
        if (type === "clear" || type === "off") {
          propAnim.remove(mesh);
          return "Animation coupée.";
        }
        if (!(ANIM_TYPES as string[]).includes(type)) return `Types : ${ANIM_TYPES.join(" ")}`;
        propAnim.add(mesh, type as AnimType);
        return `Anim ${type} · ${id}`;
      },
      geoStats: () => {
        const g = geoStats();
        const a = propAnim.getStats();
        return `Géo ${g.entries} caches · hit ${g.hitRate} · anim ${a.total}`;
      },
      toggleFly: () => {
        if (this.mode === "drive") this.exitVehicle();
        useGameStore.getState().toggleFly();
      },
      toggleNoclip: () => useGameStore.getState().toggleNoclip(),
      setWeather: (id) => {
        useGameStore.getState().setWeather(id);
        this.world.setWeather(id);
      },
      forceOutage: (kind) => {
        if (!kind) {
          useGameStore.setState({ gridOutage: null, notice: "Hydro-Québec · réseau rétabli" });
          persist();
          return;
        }
        if (kind === "verglas") {
          useGameStore.getState().setWeather("storm");
          this.world.setWeather("storm");
        }
        useGameStore.setState({ gridOutage: { kind, t: 70 }, notice: kind === "verglas" ? "Verglas · réseau Hydro hors service" : "Panne Hydro-Québec" });
        persist();
      },
      say: (text) => {
        const name = useGameStore.getState().appearance.name;
        useGameStore.getState().addChat(name, text, "chat");
      },
      heal: () => {
        this.walker.clearHurt();
        this.respawn();
      },
      hurt: (clip) => {
        if (clip === "clear") {
          this.walker.clearHurt();
          return "Debout.";
        }
        this.walker.playHurt(clip);
        return `Clip · ${clip}`;
      },
      setWanted: (n) => {
        police.setStars(n, n > 0 ? "Avis de recherche (console)" : undefined, n * 1500);
      },
      cycleRadio: () => {
        void this.cycleRadio();
      },
      jail: () => this.teleport(SQ_JAIL.x, SQ_JAIL.z + 10),
      prison: () => this.goPrison(),
      book: () => this.bookPlayer(),
      lockdown: () => {
        prisonSystem.startLockdown(8);
        store.setHud({ notice: "🚨 LOCKDOWN · Établissement de Donnacona" });
      },
      release: () => {
        prisonSystem.release();
        if (this.activeInterior?.kind === "prison") this.leaveInterior();
        store.setHud({ notice: "Libération administrative" });
      },
      pos: () => `${this.px().toFixed(1)} ${this.pz().toFixed(1)} · ${this.mode}`,
      floor: (id) => {
        if (id === "prison") {
          const door = this.world.doors.find((d) => d.kind === "prison");
          if (door) this.lastDoor = door;
        } else if (id === "depanneur") {
          const door = this.world.doors.find((d) => d.kind === "depanneur");
          if (door) this.lastDoor = door;
          const shop = this.world.shops.find((s) => s.kind === "depanneur");
          if (shop) this.depShopId = shop.id;
        } else {
          const door = this.world.doors.find((d) => d.kind === "hotel");
          if (door) this.lastDoor = door;
        }
        this.showFloor(id);
      },
      giveItem: (id, n) => {
        if (!itemById(id)) return false;
        store.addItem(id, n);
        return true;
      },
      giveCar: (id) => {
        const alias =
          id === "couch" || id === "sofa" || id === "divan_moteur"
            ? "divan"
            : id === "honda" || id === "honda_civic"
              ? "civic"
              : id;
        if (!isVehicleId(alias)) return false;
        const spec = fleetById(alias);
        const vid = spec.id;
        const owned = store.ownedVehicles.includes(vid) ? store.ownedVehicles : [...store.ownedVehicles, vid];
        store.setHud({ ownedVehicles: owned, vehicleId: vid });
        this.swapVehicle(vid);
        persist();
        return true;
      },
      walk: () => {
        if (this.mode === "interior") this.leaveInterior();
        else if (this.mode === "drive") this.exitVehicle();
      },
      drive: () => {
        if (this.mode === "interior") this.leaveInterior();
        if (this.mode !== "drive") this.enterVehicle();
      },
      addBank: (n) => {
        const s = useGameStore.getState();
        s.setHud({ bank: Math.round((s.bank + n) * 100) / 100, notice: `Banque ${n >= 0 ? "+" : ""}${n}\u00a0$` });
        persist();
      },
      status: () => {
        const s = useGameStore.getState();
        const inv = Object.entries(s.inventory)
          .filter(([, n]) => n > 0)
          .map(([id, n]) => `${id}×${n}`)
          .join(", ");
        return [
          `${s.appearance.name} · ${s.appearance.model} · ${s.appearance.outfit}`,
          `pos ${this.px().toFixed(0)} ${this.pz().toFixed(0)} · ${this.mode}`,
          `cash ${s.cash}\u00a0$ · banque ${s.bank}\u00a0$ · ${s.wantedStars}★`,
          `emploi ${s.rpJob} · gang ${s.gangId ?? "—"} · firm ${s.firm?.tradeName ?? "—"}`,
          `permis ${s.licenses.join(", ") || "aucun"}`,
          `faim ${s.surv.hunger.toFixed(0)} soif ${s.surv.thirst.toFixed(0)} T ${s.surv.bodyTemp.toFixed(1)}°C`,
          `sac ${inv || "vide"}`,
        ].join("\n");
      },
      setSurv: (patch) => {
        const s = useGameStore.getState();
        s.setHud({ surv: { ...s.surv, ...patch } });
      },
      setJob: (id) => {
        const job = jobById(id);
        if (job.id !== id && id !== "civil") return false;
        useGameStore.getState().setRpJob(job.id);
        return true;
      },
      setGang: (id) => {
        if (!id) {
          useGameStore.getState().leaveGang();
          return true;
        }
        return useGameStore.getState().joinGang(id);
      },
      setLook: (p) => {
        useGameStore.getState().setAppearance(p);
        this.applyAppearance(useGameStore.getState().appearance);
        persist();
      },
      setRadio: (id) => {
        if (!QUEBEC_FM_STATIONS.some((st) => st.id === id)) return false;
        quebecFM.setStation(id);
        useGameStore.getState().setHud({ radioOn: true, radioId: id });
        return true;
      },
      toggleTv: () => {
        useGameStore.getState().toggleHotelTv();
        return useGameStore.getState().hotelTvOn;
      },
      unlockHotel: (on) => {
        const ids = this.world.doors.map((d) => d.id);
        if (on) hotelSecurity.unlockAll(ids);
        else hotelSecurity.lockAll();
        useGameStore.getState().setHud({ unlockedDoors: hotelSecurity.snapshot().unlockedDoors });
        persist();
      },
      equip: (id) => {
        const s = useGameStore.getState();
        if (!itemById(id)) return false;
        if (!(s.inventory[id] > 0)) s.addItem(id, 1);
        return s.useItem(id);
      },
      foundFirm: (type) => {
        const s = useGameStore.getState();
        const need = startupTotal(type);
        if (s.cash < need) s.addCash(need - s.cash + 20);
        if (!useGameStore.getState().foundFirm(type, type)) return false;
        const spec = FIRM_TYPES.find((f) => f.type === type);
        for (const p of spec?.permits ?? []) {
          const st = useGameStore.getState();
          if (st.cash < PERMIT_FEES[p].fee) st.addCash(PERMIT_FEES[p].fee);
          st.buyPermit(p);
        }
        return true;
      },
      payroll: () => useGameStore.getState().tickPayroll(this.elapsed),
      hireStaff: () => useGameStore.getState().hireStaff(),
      applyGrant: (id) => useGameStore.getState().applyMapaqGrant(id as MapaqGrantId),
      sow: (crop) => {
        const id = crop === "weed" ? "cannabis" : crop;
        if (!(id in CROPS)) return "Usage : /semer mais|ble|foin|patate|cannabis";
        const spec = CROPS[id as CropId];
        const s = useGameStore.getState();
        if ((s.inventory[spec.seedId] ?? 0) < 1) s.addItem(spec.seedId, 4);
        s.useItem(spec.seedId);
        return `Semence · ${spec.label}`;
      },
      clearInv: () => {
        useGameStore.getState().setHud({ inventory: {}, equippedTool: null, equippedPack: null });
        persist();
      },
      kit: () => {
        const s = useGameStore.getState();
        for (const [id, n] of [
          ["pistol", 1],
          ["ammo_9mm", 24],
          ["ak74", 1],
          ["ammo_545", 30],
          ["ar15", 1],
          ["ammo_556", 30],
          ["shotgun", 1],
          ["ammo_12", 16],
          ["bobomb", 1],
          ["medkit", 2],
          ["casque", 1],
          ["marteau", 1],
          ["pelle", 1],
          ["rateau", 1],
          ["graines_mais", 6],
          ["graines_foin", 6],
          ["foin", 6],
          ["ble", 4],
          ["graines_cannabis", 4],
          ["eau_erable", 8],
          ["sac_rando", 1],
          ["crochet", 3],
          ["cle_maison", 1],
          ["double_cle", 2],
          ["cle", 1],
        ] as const) {
          s.addItem(id, n);
        }
        s.addCash(1500, "Kit admin");
        s.useItem("sac_rando");
        s.useItem("marteau");
        s.setAppearance({ outfit: "goose" });
        this.applyAppearance(useGameStore.getState().appearance);
        persist();
      },
      setCamera: (mode) => {
        this.cameraMode = mode;
      },
      bell: () => useGameStore.getState().ringBell(),
      lights: () => useGameStore.getState().toggleLobbyLights(),
      elevator: () => useGameStore.getState().openElevator(),
      toggleBuild: () => useGameStore.getState().toggleBuild(),
      clearBuild: () => this.clearProps(),
      undoBuild: () => this.undoProp(),
      removeNear: () => {
        this.removeNearestProp();
        return useGameStore.getState().notice ?? "Retiré.";
      },
      dupNear: () => this.dupNearestProp(),
      selectBuild: (id) => {
        if (!isPropId(id)) return false;
        const s = useGameStore.getState();
        s.selectProp(id);
        if (!s.buildOpen) s.toggleBuild();
        return true;
      },
      rotateBuild: (deg) => {
        if (deg === undefined) {
          useGameStore.getState().rotateGhost();
        } else {
          useGameStore.setState({ buildYaw: ((deg % 360) * Math.PI) / 180 });
        }
        const yaw = useGameStore.getState().buildYaw;
        return `Rotation · ${Math.round((yaw * 180) / Math.PI)}°`;
      },
      scaleBuild: (n) => {
        const scale = Math.max(0.25, Math.min(6, n));
        useGameStore.setState({ buildScale: scale });
        return `Échelle · ×${scale.toFixed(2)}`;
      },
      snapBuild: (n) => {
        this.buildSnap = n <= 0 ? 0 : n;
        return this.buildSnap ? `Grille · ${this.buildSnap} m` : "Grille libre";
      },
      propsInfo: () => {
        const n = useGameStore.getState().placed.length;
        const type = useGameStore.getState().buildType ?? "aucun";
        return `${n}/80 posés · fantôme ${type} · snap ${this.buildSnap || "off"}`;
      },
    });
  }

  setBuildSnap(n: number) {
    this.buildSnap = n <= 0 ? 0 : n;
    useGameStore.getState().setHud({ notice: this.buildSnap ? `Grille · ${this.buildSnap} m` : "Grille libre" });
  }

  toggleNight() {
    if (this.mode === "interior") return;
    this.night = !this.night;
    this.world.setNight(this.night);
    useGameStore.getState().setHud({ night: this.night });
  }

  respawn() {
    if (this.mode === "interior") this.leaveInterior();
    this.walker.hide();
    this.vehicle.reset();
    this.vehicle.group.visible = true;
    this.world.setExteriorVisible(true);
    this.mode = "drive";
  }

  teleport(x: number, z: number) {
    if (this.mode === "interior") this.leaveInterior();
    this.walker.hide();
    this.vehicle.x = x;
    this.vehicle.z = z;
    this.vehicle.speed = 0;
    this.vehicle.y = getTerrainHeight(x, z) + 0.42;
    const dx = SPAWN.x - x;
    this.vehicle.yaw = Math.abs(dx) > 10 ? -Math.PI / 2 : this.vehicle.yaw;
    this.vehicle.snap();
    this.vehicle.group.visible = true;
    this.world.setExteriorVisible(true);
    this.mode = "drive";
  }

  private ghostSpot() {
    const yaw = this.pYaw();
    let x = this.px() - Math.sin(yaw) * 4.2;
    let z = this.pz() - Math.cos(yaw) * 4.2;
    if (this.buildSnap > 0) {
      x = Math.round(x / this.buildSnap) * this.buildSnap;
      z = Math.round(z / this.buildSnap) * this.buildSnap;
    }
    const y = this.mode === "interior" ? this.py() : getTerrainHeight(x, z);
    return { x, y, z };
  }

  private tickBuilder() {
    const s = useGameStore.getState();
    const spot = this.ghostSpot();
    this.props.syncGhost(s.buildType, spot.x, spot.y, spot.z, s.buildYaw + this.pYaw(), s.buildScale);
  }

  private placeProp() {
    const s = useGameStore.getState();
    if (!s.buildType) return;
    if (s.placed.length >= 80) {
      s.setHud({ notice: "Limite 80 objets" });
      return;
    }
    const spot = this.ghostSpot();
    const hit = this.world.nearestHouseHot(spot.x, spot.z, 16);
    if (hit && insideHouseBody(hit.lot, spot.x, spot.z)) {
      s.setHud({ notice: "Collision · maison" });
      return;
    }
    const p = {
      id: `p${Date.now().toString(36)}`,
      type: s.buildType,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      yaw: s.buildYaw + this.pYaw(),
      scale: s.buildScale,
    };
    s.addPlaced(p);
    this.props.spawn(p);
  }

  removeNearestProp() {
    const id = this.props.nearest(this.px(), this.pz(), 6);
    if (!id) {
      useGameStore.getState().setHud({ notice: "Rien à retirer" });
      return;
    }
    this.props.remove(id);
    useGameStore.getState().removePlaced(id);
  }

  clearProps() {
    this.props.clear();
    useGameStore.getState().clearPlaced();
  }

  private undoProp(): string {
    const last = useGameStore.getState().placed.at(-1);
    if (!last) return "Rien à annuler.";
    this.props.remove(last.id);
    useGameStore.getState().removePlaced(last.id);
    return `Annulé · ${last.type}`;
  }

  private dupNearestProp(): string {
    const id = this.props.nearest(this.px(), this.pz(), 8);
    const src = id ? useGameStore.getState().placed.find((p) => p.id === id) : undefined;
    if (!src) return "Rien à copier.";
    const s = useGameStore.getState();
    if (s.placed.length >= 80) return "Limite 80 objets";
    const spot = this.ghostSpot();
    const copy = {
      id: `p${Date.now().toString(36)}`,
      type: src.type,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      yaw: src.yaw,
      scale: src.scale,
    };
    s.addPlaced(copy);
    this.props.spawn(copy);
    return `Copié · ${src.type}`;
  }

  private goPrison() {
    const door = this.world.doors.find((d) => d.kind === "prison");
    if (this.mode === "drive") this.exitVehicle();
    if (door) {
      this.lastDoor = door;
      this.enterInterior(door);
    } else {
      this.teleport(PRISON.x, PRISON.z + 42);
    }
  }

  private bookPlayer(): string {
    const name = useGameStore.getState().appearance.name || "Citoyen";
    const inmate = prisonSystem.book(name, chargesForStars(Math.max(2, police.stars)));
    this.goPrison();
    useGameStore.getState().setHud({
      notice: `Écroué ${inmate.booking} · ${inmate.minutes} min`,
    });
    return `${inmate.booking} · cellule A-1-04 · ${inmate.minutes} min`;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    input.detach();
    this.timer.disconnect();
    window.removeEventListener("resize", this.onResize);
    persist();
    quebecFM.dispose();
    police.dispose();
    this.world.dispose();
    tex.dispose();
    this.renderer.dispose();
    delete window.__controlsTest;
  }
}

function chargesForStars(stars: number): ChargeId[] {
  if (stars >= 5) return ["evasion", "voies_de_fait", "conduite_dangereuse"];
  if (stars >= 4) return ["delit_de_fuite", "conduite_dangereuse"];
  if (stars >= 3) return ["conduite_dangereuse"];
  return ["vol_simple"];
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
      setSteer?: (v: number) => void;
      interact?: () => void;
    };
    __portneuf?: PortneufEngine;
    __store?: { getState: () => ReturnType<typeof useGameStore.getState> } & typeof useGameStore;
  }
}
