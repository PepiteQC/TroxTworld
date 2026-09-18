<<<<<<< HEAD
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 PORTNEUF ENGINE v2.0 — Orchestrateur principal du monde RP
 * ───────────────────────────────────────────────────────────────────────────
 *  • Construction safe (try/catch + events)
 *  • tick() découpé en 12 phases claires
 *  • pushHud() diff-based (skip si rien n'a changé)
 *  • dispose() complet (interiors + props + caddie + textures)
 *  • Events système (boot, tick, interact, mode_change, dispose, error)
 *  • Stats & health & config hot-reload
 *  • Graceful shutdown (beforeunload)
 *  • API publique 100% préservée
 * ═══════════════════════════════════════════════════════════════════════════
 */

=======
// --- Filtre anti-spam console Three.js / FBXLoader ---
if (typeof window !== 'undefined' && !(window as any).__threeWarnPatched) {
  (window as any).__threeWarnPatched = true;
  const _origWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('Texture marked for update but no image data found') ||
      msg.includes('THREE.FBXLoader') ||
      msg.includes('skeleton attached to more than one geometry') ||
      msg.includes('Vertex has more than 4 skinning weights') ||
      msg.includes('Encountered a unused curve') ||
      msg.includes('Z-UP coordinate system')
    ) {
      return;
    }
    _origWarn(...args);
  };
}
// -----------------------------------------------------
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
import { spatialAudio } from "./audio3d";
import { physics } from "./physics";
import { sunElevation } from "./sky";
import { persist, useGameStore, type PlayMode, CAMERA_CYCLE, CAMERA_LABEL, type CameraMode } from "./store";
import { PropField, isPropId } from "./builder";
import { ANIM_TYPES, propAnim, type AnimType } from "./anim";
import { geoStats } from "./geo";
import { Vehicle } from "./vehicle";
import { Walker } from "./walker";
import { PortneufWorld } from "./world";
import { refreshCsmFrustums, updateCsm, wireCsmTree } from "./csm";
import { tex } from "./textures";
import { installCommerceEnv } from "./commerceMats";
import type { Appearance } from "./character";
import { fleetById, isVehicleId, type VehicleId } from "./fleet";
<<<<<<< HEAD
import { buildCargoCrate, haulDistance, nearHaul } from "./jobs";
=======
import { buildCargoCrate, haulDistance, nearHaul } from "./haul";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
import { currentStep, getCannotStartReason, nearestGig } from "./gigs";
import { workJobAt } from "./tools";
import { shelterOf, applyMeal, ambientOf } from "./survival";
import { crimeById, gangById, jobById } from "./rp";
import { KIND_LABEL, nearestCommercial, ownedIds } from "./realestate";
import { ENFORCE_SPEED_LIMITS, getPoiAt, getSpeedLimitAt, getSurfaceAt, getTerrainHeight, getZoneName, SPAWN, SQ_JAIL, PRISON, withIce } from "./worlddata";
<<<<<<< HEAD
import { prisonSystem, type ChargeId } from "./prison";
=======
import { prisonSystem } from "./prison";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
import { zoneSystem } from "./zones";
import { worldConfig } from "./worldconfig";
import { checkCarryLegality, isZoneWeapon } from "./weapons";
import { AdminFx } from "./fx";
import { attachGltfDecoders, warmMeshopt } from "./gltf";
import { WORLD_ENGINE_VERSION } from "./worldapi";
import { rpNet } from "./net";
import { RemoteField } from "./remotes";
import { fieldPrompt, seizeField, workField, CROPS, type CropId } from "./farms";
import { stockPrompt, workStock } from "./livestock";
import { evapPrompt, tapPrompt, workEvap, workTap } from "./sugar";
<<<<<<< HEAD
import { canOpenDoor, doorDenied, emptyHouse, hasReno, housePrompt, insideHouseBody, type DoorSlot, type HouseLot } from "./house";
import { caisseHoursLabel, isCaisseOpen } from "./caisse";
import { breakAtm } from "./banking";
import { depHoursLabel, depPrompt, isDepOpen, shopDoorOffset, shopPumpOffset, type DepAisleHot } from "./depanneur";
=======
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
  caisseHoursLabel,
  isCaisseOpen,
} from "./caisse";
import { breakAtm } from "./banking";
import {
  depHoursLabel,
  depPrompt,
  isDepOpen,
  shopDoorOffset,
  shopPumpOffset,
  type DepAisleHot,
} from "./depanneur";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
import { isSqdcOpen, sqdcHoursLabel, sqdcPrompt } from "./sqdc";
import { casseHoursLabel, cassePrompt, isCasseOpen } from "./casse";
import { cycleCarabine } from "./carabine";
import { cycleAk74 } from "./ak74";
import { tickInjured, preloadInjured } from "./injured";
import { tickGuns, preloadGuns } from "./guns";
import { tickProps3d } from "./props3d";
import { heatWorks, hydroLive, setHeatGlow } from "./utilities";
import { quebecSeasons, weatherIdFromCondition, conditionFromWeather, seasonFromMonth, type QuebecSeason, type WeatherCondition } from "./seasons";
import { dynamicEventsService } from "./events";
import { AdminMetrics } from "./adminMetrics";
import { gestureDef, type RpGesture } from "./gestures";

<<<<<<< HEAD
// ═══════════════════════════════════════════════════════════════════════════
// 🆕 v2 — TYPES & CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface PortneufEngineConfig {
  targetFps: number;
  dprCapDesktop: number;
  dprCapMobile: number;
  hudIntervalS: number;
  fineCooldownS: number;
  persistIntervalS: number;
  cameraFar: number;
  cameraFov: number;
  shadowThrottleS: number;
  maxProps: number;
  metricsEnabled: boolean;
  eventsEnabled: boolean;
  gracefulShutdown: boolean;
}

const DEFAULT_CONFIG: PortneufEngineConfig = {
  targetFps: 60,
  dprCapDesktop: 1.25,
  dprCapMobile: 1.1,
  hudIntervalS: 0.12,
  fineCooldownS: 4,
  persistIntervalS: 20,
  cameraFar: 1200,
  cameraFov: 62,
  shadowThrottleS: 0.16,
  maxProps: 80,
  metricsEnabled: true,
  eventsEnabled: true,
  gracefulShutdown: true,
};

export type EngineEventType =
  | "boot"
  | "ready"
  | "tick"
  | "interact"
  | "teleport"
  | "mode_change"
  | "dispose"
  | "error";

export interface EngineEvent {
  type: EngineEventType;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface EngineStats {
  ticksTotal: number;
  lastTickMs: number;
  avgTickMs: number;
  peakTickMs: number;
  interactCount: number;
  teleportCount: number;
  modeChanges: number;
  hudPushes: number;
  hudSkips: number;
  errorsCaught: number;
  uptimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS
// ═══════════════════════════════════════════════════════════════════════════
=======
type ChargeId = string;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

export class PortneufEngine {
  readonly version = WORLD_ENGINE_VERSION;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: PortneufWorld;
  vehicle: Vehicle;
  walker: Walker;

  // 🆕 v2
  public config: PortneufEngineConfig;
  private listeners = new Set<(e: EngineEvent) => void>();
  private engineStats: EngineStats = {
    ticksTotal: 0,
    lastTickMs: 0,
    avgTickMs: 0,
    peakTickMs: 0,
    interactCount: 0,
    teleportCount: 0,
    modeChanges: 0,
    hudPushes: 0,
    hudSkips: 0,
    errorsCaught: 0,
    uptimeMs: 0,
  };
  private bootAt = Date.now();
  private lastPersistAt = 0;
  private lastHudHash = "";
  private pendingUnloadHandler: (() => void) | null = null;

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
    caisse: InteriorRoom;
    casse: InteriorRoom;
    sqdc: InteriorRoom;
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
  private lastYawShadow = 0;
  private dprCap = 1.25;
  private dprNow = 1.25;
  private fpsEma = 60;
  private dprAcc = 0;
  private remotes = new RemoteField();
  private netAcc = 0;
  private lastWeather = "";
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
  private clockShift = 0;
  private lastSkyAt = 0;
  private cameraMode: CameraMode = "chase";
  private mode: PlayMode = "drive";
  private indoorHemi: THREE.HemisphereLight;
  private props = new PropField();
  private buildSnap = 0.5;
  private homeDeedId: string | null = null;
  private homeFloor: "main" | "basement" = "main";
  private depShopId: string | null = null;
  private onResize: () => void;
  private savedFog: THREE.Color;
  private savedFogDensity = 0.00155;

  // ═════════════════════════════════════════════════════════════════════════
  // CONSTRUCTOR
  // ═════════════════════════════════════════════════════════════════════════

  constructor(private canvas: HTMLCanvasElement, config: Partial<PortneufEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    try {
      this.initCore();
      this.emit("boot");
      this.emit("ready");
    } catch (err) {
      this.engineStats.errorsCaught++;
      this.emit("error", { phase: "constructor", error: String(err) });
      console.error("[PortneufEngine] Constructor error:", err);
      throw err;
    }
  }

  private initCore(): void {
    void warmMeshopt();
    const qa = new URLSearchParams(window.location.search).get("qa") === "1";
    const mobile = Math.min(window.innerWidth, window.innerHeight) < 800;
<<<<<<< HEAD
    this.dprCap = mobile ? this.config.dprCapMobile : this.config.dprCapDesktop;
    this.dprNow = Math.min(window.devicePixelRatio || 1, this.dprCap);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
=======
    this.dprCap = mobile ? 1.1 : 1.25;
    this.dprNow = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      antialias: !mobile,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      preserveDrawingBuffer: qa,
    });
    this.renderer.setPixelRatio(this.dprNow);
<<<<<<< HEAD
    this.renderer.setSize(
      this.canvas.clientWidth || window.innerWidth,
      this.canvas.clientHeight || window.innerHeight,
      false,
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 1.35;
=======
    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔 PCF Soft Shadows (Finies les ombres pixelisées !)
    this.renderer.shadowMap.autoUpdate = false;            // CORRIGÉ : avec autoUpdate=true, Three.js ignore complètement
                                                            // le throttling manuel de tickShadows() (needsUpdate) et recalcule
                                                            // les ombres à CHAQUE frame — le throttle ne servait donc à rien.
                                                            // autoUpdate=false + tickShadows() gère l'update réelle (perf mobile).
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Tonemapping cinéma réaliste (couleurs riches et contrastées)
    this.renderer.toneMappingExposure = 1.05;              // Exposition équilibrée pour ACES Filmic
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    tex.attach(this.renderer);
    attachGltfDecoders(this.renderer);
    this.scene = new THREE.Scene();
<<<<<<< HEAD
    this.camera = new THREE.PerspectiveCamera(this.config.cameraFov, 1, 0.35, this.config.cameraFar);
    this.fit();

    this.initWorld();
    this.initCharacters();
    this.initInteriors();
    this.initSystems();
    this.initListeners();
  }

  private initWorld(): void {
=======
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.35, 1200);
    this.fit();
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.world = new PortneufWorld(this.scene, this.camera);
    this.world.build();
    installCommerceEnv(this.renderer, this.scene);
    this.world.syncHouses(useGameStore.getState().ownedProps, useGameStore.getState().houses);
    this.savedFog = new THREE.Color(0x8aa0a8);
  }

  private initCharacters(): void {
    this.vehicle = new Vehicle();
    this.walker = new Walker(useGameStore.getState().appearance);
    this.scene.add(this.vehicle.group, this.walker.group, this.remotes.group);
    this.fx = new AdminFx(this.scene, this.camera, this.renderer, () => {
      this.fxTarget.set(this.px(), this.py() + 1.15, this.pz());
      return this.fxTarget;
    });
  }

  private initInteriors(): void {
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
      this.interiors.caisse.group,
      this.interiors.casse.group,
      this.interiors.sqdc.group,
    );
  }

  private initSystems(): void {
    wireCsmTree(this.scene);
    this.scene.add(this.props.group);
    this.props.hydrate(useGameStore.getState().placed);
    preloadInjured();
    preloadGuns();

    this.indoorHemi = new THREE.HemisphereLight(0xf0e8d8, 0x2a2a32, 0);
    this.scene.add(this.indoorHemi);
<<<<<<< HEAD

=======
    this.savedFog = new THREE.Color(0x8aa0a8);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.night = useGameStore.getState().night;
    this.clockShift = this.night ? 5.1 : 0;
    this.world.setTime(this.clockHours());
    quebecSeasons.syncFromClock(gameMonth(0), useGameStore.getState().weather);
    this.world.setWeather(useGameStore.getState().weather);
    this.lastWeather = useGameStore.getState().weather;
    this.world.markLeavesCollected(useGameStore.getState().leaves);

    const savedRadio = useGameStore.getState().radioId;
    if (savedRadio) quebecFM.stationId = savedRadio;
    police.demeritTotal = useGameStore.getState().demeritPoints ?? 0;
    police.licenseSuspendedUntil = useGameStore.getState().licenseSuspendedUntil ?? 0;
<<<<<<< HEAD

    input.attach();
    this.wireControlsTest();
    spatialAudio.attachUnlock();

    void physics.init()
      .then(() => {
        if (this.disposed) return;
        physics.setSolids(this.world.solids);
      })
      .catch((err) => {
        this.engineStats.errorsCaught++;
        console.warn("[PortneufEngine] Physics init failed — fallback no-collision:", err);
        this.emit("error", { phase: "physics_init", error: String(err) });
      });

    (window as any).__rpNet = rpNet;
    (window as any).__physics = physics;
  }

  private initListeners(): void {
=======
    input.attach();
    this.wireControlsTest();
    spatialAudio.attachUnlock();
    void physics.init().then(() => {
      if (!this.disposed) physics.setSolids(this.world.solids);
    });
    window.__rpNet = rpNet;
    window.__physics = physics;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.onResize = () => this.fit();
    window.addEventListener("resize", this.onResize);

    if (this.config.gracefulShutdown) {
      this.pendingUnloadHandler = () => {
        try { this.dispose(); } catch { /* noop */ }
      };
      window.addEventListener("beforeunload", this.pendingUnloadHandler);
    }

    this.timer.connect(document);
    useGameStore.getState().setHud({ loading: false, mode: "drive" });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // EVENTS API
  // ═════════════════════════════════════════════════════════════════════════

  public on(cb: (e: EngineEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(type: EngineEventType, data?: Record<string, unknown>): void {
    if (!this.config.eventsEnabled) return;
    const evt: EngineEvent = { type, data, timestamp: Date.now() };
    for (const cb of this.listeners) {
      try { cb(evt); } catch { /* noop */ }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════════

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
    (window as any).__controlsTest = {
      getYaw: () => (this.mode === "drive" ? this.vehicle.yaw : this.walker.yaw),
      getSpeed: () => (this.mode === "drive" ? this.vehicle.speed : this.walker.speed),
      setKeys: (codes: string[]) => input.setInjected(codes),
      setSteer: (v: number) => {
        input.touchSteer = v;
      },
      interact: () => this.handleInteract(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // HELPERS DE POSITION
  // ═════════════════════════════════════════════════════════════════════════

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

  private clockHours() {
    return (16.5 + this.elapsed / 90 + this.clockShift + 48) % 24;
  }

<<<<<<< HEAD
  private setMode(mode: PlayMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.engineStats.modeChanges++;
    this.emit("mode_change", { to: mode });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SHADOWS & DPR
  // ═════════════════════════════════════════════════════════════════════════

=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  private tickShadows(dt: number, active: boolean) {
    if (this.mode === "interior" || this.night || !active) {
      this.renderer.shadowMap.needsUpdate = false;
      return;
    }
    this.shadowAcc += dt;
    const moved = this.player.distanceToSquared(this.lastShadow) > 16;
    const turned = Math.abs(this.pYaw() - this.lastYawShadow) > 0.12;
<<<<<<< HEAD
    if (moved || turned || this.shadowAcc > this.config.shadowThrottleS) {
=======
    if (moved || turned || this.shadowAcc > 0.16) {
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      updateCsm(this.clockHours());
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadow.copy(this.player);
      this.lastYawShadow = this.pYaw();
      this.shadowAcc = 0;
    }
  }

  private tickDpr(dt: number) {
    const fps = 1 / Math.max(0.008, dt);
    this.fpsEma = this.fpsEma * 0.9 + fps * 0.1;
    this.dprAcc += dt;
    if (this.dprAcc < 1.4) return;
    this.dprAcc = 0;
    let next = this.dprNow;
    if (this.fpsEma < 36 && this.dprNow > 1) next = Math.max(1, this.dprNow - 0.15);
    else if (this.fpsEma > 54 && this.dprNow < this.dprCap) next = Math.min(this.dprCap, this.dprNow + 0.08);
    if (Math.abs(next - this.dprNow) > 0.04) {
      this.dprNow = next;
      this.renderer.setPixelRatio(this.dprNow);
<<<<<<< HEAD
=======
    }
  }

  private tick() {
    if (this.disposed) return;
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.08);
    this.elapsed += dt;
    this.tickDpr(dt);
    this.fx.tick(dt);
    propAnim.tick(dt, this.elapsed);
    tickInjured(this.props.group, dt, 0);
    tickGuns(this.props.group);
    tickProps3d(this.props.group, this.elapsed);

    const store = useGameStore.getState();
    const actions = input.sample();
    this.player.set(this.px(), this.py(), this.pz());

    const wanted = {
      stars: (police as any).stars ?? 0,
      reason: (police as any).reason ?? (police as any).wantedReason ?? "",
      bounty: (police as any).bounty ?? 0,
      evading: (police as any).evading ?? false,
    };

    if (this.mode !== "interior" && store.playing && !store.paused) {
      physics.step(dt, this.player.x, this.player.z);
      this.world.update(dt, this.elapsed, this.player, store.speedKmh, wanted.stars);
      if (this.elapsed - this.lastSkyAt > 0.12) {
        this.lastSkyAt = this.elapsed;
        const hours = this.clockHours();
        this.world.setTime(hours);
        this.night = sunElevation(hours) < 0.07;
      }
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TICK — 12 PHASES
  // ═════════════════════════════════════════════════════════════════════════

  private tick(): void {
    if (this.disposed) return;
    const t0 = performance.now();

    try {
      this.timer.update();
      const dt = Math.min(this.timer.getDelta(), 0.08);
      this.elapsed += dt;

      // ─── PHASE 1 : INPUT & SNAPSHOT ───
      const actions = input.sample();
      const store = useGameStore.getState();
      this.player.set(this.px(), this.py(), this.pz());

      // ─── PHASE 2 : PERFORMANCE ───
      this.tickDpr(dt);

      // ─── PHASE 3 : FX & ANIMATIONS ───
      this.fx.tick(dt);
      propAnim.tick(dt, this.elapsed);
      tickInjured(this.props.group, dt);
      tickGuns(this.props.group);
      tickProps3d(this.props.group, this.elapsed);

      // ─── PHASE 4 : MONDE EXTERNE ───
      if (this.mode !== "interior" && store.playing && !store.paused) {
        physics.step(dt, this.player.x, this.player.z);
        const wanted = police.getState();
        this.world.update(dt, this.elapsed, this.player, store.speedKmh, wanted.stars);
        if (this.elapsed - this.lastSkyAt > 0.12) {
          this.lastSkyAt = this.elapsed;
          const hours = this.clockHours();
          this.world.setTime(hours);
          this.night = sunElevation(hours) < 0.07;
        }
      }

      // ─── PHASE 5 : SHADOWS ───
      this.tickShadows(dt, store.playing && !store.paused);

      // ─── PHASE 6 : CHARACTER SYNC ───
      this.syncCharacter(store);

      // ─── PHASE 7 : CARRY & PRISON CHECKS ───
      this.tickCarryCheck(store);
      this.tickPrisonCheck(store);

      // ─── PHASE 8 : SURVIVAL / UTILITIES / FIRM / PAYROLL ───
      this.tickSurvivalSystems(dt, store);
      this.tickFirmAndPayroll(store);

      // ─── PHASE 9 : GIGS & FARMS ───
      if (store.playing && !store.paused && store.activeGig) {
        store.tickGig(dt, this.elapsed);
      }
      if (store.playing && !store.paused && this.mode !== "interior") {
        const raid = this.world.tickFields(dt, this.elapsed, this.px(), this.pz());
        if (raid) this.seizeCrop(raid);
      }

      // ─── PHASE 10 : ACTIONS JOUEUR ───
      if (store.playing && !store.paused) {
        this.tickPlayerActions(dt, actions, store);
      } else {
        this.tickPausedActions(actions, store);
      }

      // ─── PHASE 11 : CAMERA & HUD ───
      if (store.creatorOpen) {
        if (this.mode !== "interior") this.vehicle.group.visible = false;
        this.updateCreatorCamera(dt);
      } else {
        if (this.mode !== "interior") this.vehicle.group.visible = true;
        this.updateCamera(dt);
      }

      this.tickInputActions(actions, store);

      this.hudAcc += dt;
      if (this.hudAcc > this.config.hudIntervalS) {
        this.hudAcc = 0;
        this.pushHud(store);
      }

      // ─── PHASE 12 : WEATHER / SEASONS / EVENTS / NETWORK / RENDER ───
      this.tickWeatherAndSeasons(dt, store);
      this.tickNetwork(dt, store);
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      this.engineStats.errorsCaught++;
      this.emit("error", { phase: "tick", error: String(err) });
      console.error("[PortneufEngine] Tick error:", err);
    }

    if (this.config.metricsEnabled) {
      const dur = performance.now() - t0;
      this.engineStats.ticksTotal++;
      this.engineStats.lastTickMs = dur;
      this.engineStats.avgTickMs =
        this.engineStats.ticksTotal === 1
          ? dur
          : this.engineStats.avgTickMs * 0.9 + dur * 0.1;
      if (dur > this.engineStats.peakTickMs) this.engineStats.peakTickMs = dur;
      this.engineStats.uptimeMs = Date.now() - this.bootAt;
    }

    this.emit("tick");
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PHASES EXTRAITES
  // ═════════════════════════════════════════════════════════════════════════

  private syncCharacter(store: ReturnType<typeof useGameStore.getState>): void {
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
    if (this.mode !== "drive") this.walker.group.visible = !store.vanished;
    this.world.placeFirm(store.firm);
<<<<<<< HEAD
  }

  private tickCarryCheck(store: ReturnType<typeof useGameStore.getState>): void {
    if (!store.playing || store.paused) return;
    if (this.elapsed - this.lastCarry < 7) return;
    const carry = checkCarryLegality(store.licenses, store.equippedTool, store.rpJob);
    const here = zoneSystem.getAt(this.px(), this.pz());
    const banned = here && !here.rules.carryWeapons && isZoneWeapon(store.equippedTool);
    if (!carry.legal || banned) {
      this.lastCarry = this.elapsed;
      police.report("arme_prohibee", this.elapsed);
      store.setHud({ notice: carry.legal ? "Arme interdite dans cette zone" : carry.message });
    }
  }

  private tickPrisonCheck(store: ReturnType<typeof useGameStore.getState>): void {
    if (!store.playing || store.paused) return;
    if (this.elapsed - this.lastPrison < 1) return;
    this.lastPrison = this.elapsed;
    const held = prisonSystem.inmate;
    prisonSystem.tick(0.12);
    if (held && !prisonSystem.inmate && this.activeInterior?.kind === "prison") {
      this.leaveInterior();
      store.setHud({ notice: "Libéré · fin de peine" });
    }
  }

  private tickSurvivalSystems(dt: number, store: ReturnType<typeof useGameStore.getState>): void {
    const hotel = this.interiors.hotel;
    if (hotel.tvSetup && hotel.group.visible) {
      hotel.tvSetup.tickTv(this.elapsed, store.hotelTvOn);
    }

    if (!store.playing || store.paused) return;
    if (this.elapsed - this.lastSurv <= 0.25) return;

    const dtSurv = this.elapsed - this.lastSurv;
    this.lastSurv = this.elapsed;
    const hours = this.clockHours();
    const month = gameMonth(this.elapsed);
    const wx = quebecSeasons.getState();
    const ambient = ambientOf(hours, this.night, month, wx.temperatureCelsius);

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
    store.tickEconomy(hours);
    this.walker.syncHurt(store.surv.health, store.surv.energy);

    if (this.elapsed - this.lastUtil > 0.5) {
      const dtU = this.elapsed - this.lastUtil;
      this.lastUtil = this.elapsed;
      store.tickUtilities(dtU, {
        ambient,
=======

    if (store.playing && !store.paused && this.elapsed - this.lastCarry > 7) {
      const carry = checkCarryLegality(store.licenses, store.equippedTool, store.rpJob);
      const here = zoneSystem.getAt(this.px(), this.pz());
      const banned = here && !here.rules.carryWeapons && isZoneWeapon(store.equippedTool);
      if (!carry.legal || banned) {
        this.lastCarry = this.elapsed;
        police.report("arme_prohibee" as any, this.elapsed);
        store.setHud({ notice: carry.legal ? "Arme interdite dans cette zone" : carry.message });
      }
    }

    if (store.playing && !store.paused && this.elapsed - this.lastPrison > 1) {
      this.lastPrison = this.elapsed;
      const held = (prisonSystem as any).inmate;
      (prisonSystem as any).tick?.(0.12);
      if (held && !(prisonSystem as any).inmate && this.activeInterior?.kind === "prison") {
        this.leaveInterior();
        store.setHud({ notice: "Libéré · fin de peine" });
      }
    }

    const hotel = this.interiors.hotel;
    if (hotel.tvSetup && hotel.group.visible) hotel.tvSetup.tickTv(this.elapsed, store.hotelTvOn);

    if (store.playing && !store.paused && this.elapsed - this.lastSurv > 0.25) {
      const dtSurv = this.elapsed - this.lastSurv;
      this.lastSurv = this.elapsed;
      const hours = this.clockHours();
      const month = gameMonth(this.elapsed);
      const wx = quebecSeasons.getState();
      const ambient = ambientOf(wx.season, hours);
      const ambientTemp = ambient.temp;

      let indoorC: number | undefined;
      let nearFire = this.mode === "walk" && this.world.nearFire(this.walker.x, this.walker.z);
      if (this.mode === "interior") {
        if (this.activeInterior?.kind === "home" && this.homeDeedId) {
          const st = store.houses[this.homeDeedId] ?? emptyHouse(this.homeDeedId);
          indoorC = st.indoorC;
          nearFire = heatWorks(st, store.gridOutage, ambientTemp);
        } else {
          indoorC = store.gridOutage ? 11 : 21;
        }
      }

      store.tickSurvival(dtSurv, {
        shelter: shelterOf(this.mode),
        night: this.night,
        hours,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        month,
        elapsed: this.elapsed,
        weather: store.weather,
      });
<<<<<<< HEAD
      if (this.mode === "interior" && this.activeInterior?.kind === "home" && this.homeDeedId) {
        const st = useGameStore.getState().houses[this.homeDeedId];
        if (st) {
          const on = heatWorks(st, useGameStore.getState().gridOutage, ambient);
          setHeatGlow(this.interiors.home.group, on);
          const hydro = hydroLive(st, useGameStore.getState().gridOutage);
          const bright =
            this.homeFloor === "basement" ? 0.38 : hasReno(st, "eclairage") ? 0.95 : 0.42;
          this.indoorHemi.intensity = hydro ? bright : 0.12;
        }
      }
    }
  }

  private tickFirmAndPayroll(store: ReturnType<typeof useGameStore.getState>): void {
    if (!store.playing || store.paused) return;

    if (store.firm?.isOpen && this.elapsed - this.lastFirmSale > 8) {
      this.lastFirmSale = this.elapsed;
      store.tickFirm(this.elapsed);
    }
    if (this.elapsed - this.lastPayroll > 45) {
      this.lastPayroll = this.elapsed;
      store.tickPayroll(this.elapsed);
    }
  }

  private tickPlayerActions(
    dt: number,
    actions: ReturnType<typeof input.sample>,
    store: ReturnType<typeof useGameStore.getState>,
  ): void {
    if (this.mode === "drive") {
      if (!store.staffFrozen) {
        this.vehicle.update(
          dt,
          actions,
          vehicleLoadMul(
            haulCargoKg(store.job),
            bagWeight(store.inventory),
            fleetById(this.vehicle.kind).mass,
          ),
        );
        this.kmAcc += Math.abs(this.vehicle.speed) * dt;
      }
    } else {
      if (store.sitting && (actions.throttle > 0.1 || actions.brake > 0.1 || Math.abs(actions.steer) > 0.2)) {
        store.stand();
        if (this.walker.gesture === "sit") this.walker.setGesture("none");
      }
      const move =
        store.sitting || store.gestureOpen
          ? { ...actions, throttle: 0, brake: 0, steer: 0, boost: false }
          : actions;
      this.walker.update(dt, move, this.elapsed);
=======
      store.tickEconomy(hours);
      this.walker.syncHurt(store.surv.health, store.surv.energy);

      if (this.elapsed - this.lastUtil > 0.5) {
        const dtU = this.elapsed - this.lastUtil;
        this.lastUtil = this.elapsed;
        store.tickUtilities(dtU, {
          ambient: ambientTemp,
          month,
          elapsed: String(this.elapsed),
          weather: store.weather,
        });

        if (this.mode === "interior" && this.activeInterior?.kind === "home" && this.homeDeedId) {
          const st = useGameStore.getState().houses[this.homeDeedId];
          if (st) {
            const on = heatWorks(st, useGameStore.getState().gridOutage, ambientTemp);
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

    if (store.playing && !store.paused && store.activeGig) {
      store.tickGig(dt, this.elapsed);
    }

    if (store.playing && !store.paused && this.mode !== "interior") {
      const raid = this.world.tickFields(dt, this.elapsed, this.px(), this.pz());
      if (raid) this.seizeCrop(raid);
    }

    if (store.playing && !store.paused) {
      if (this.mode === "drive") {
        if (!store.staffFrozen) {
          this.vehicle.update(dt, actions, vehicleLoadMul(haulCargoKg(store.job), bagWeight(store.inventory), fleetById(this.vehicle.kind).mass));
          this.kmAcc += Math.abs(this.vehicle.speed) * dt;
        }
      } else {
        if (store.sitting && (actions.throttle > 0.1 || actions.brake > 0.1 || Math.abs(actions.steer) > 0.2)) {
          store.stand();
          if (this.walker.gesture === "sit") this.walker.setGesture("none");
        }
        const move = store.sitting || store.gestureOpen
          ? { ...actions, throttle: 0, brake: 0, steer: 0, boost: false }
          : actions;
        this.walker.update(dt, move, this.elapsed);
      }
      this.player.set(this.px(), this.py(), this.pz());
      this.tickSwing(dt);
      this.syncCaddie();
      if (actions.interact) this.handleInteract();
      this.tickPolice(dt, store.godMode);
      if (this.vehicle.kind === "sq") this.vehicle.tickLightbar(this.elapsed);
      if (this.vehicle.sirenPattern() === "code3_emergency") police.siren.setActive(true);
      quebecFM.tick(dt, store.radioOn);
      spatialAudio.setListener(this.camera);
      spatialAudio.tickEngine(this.mode === "drive", this.vehicle.speed, this.vehicle.x, this.vehicle.y, this.vehicle.z);
      spatialAudio.tickWind(store.speedKmh, store.weather);
      spatialAudio.tickSiren(
        wanted.stars > 0 || this.vehicle.sirenPattern() === "code3_emergency",
        this.player.x,
        this.player.y,
        this.player.z,
      );
      spatialAudio.footstep(dt, this.mode !== "drive" && Math.abs(this.walker.speed) > 0.5, this.walker.x, this.walker.y, this.walker.z);
    } else {
      if (store.shopOpen && actions.interact) store.closeShop();
      if (store.cartOpen && actions.interact) store.closeCart();
      if (store.citationOpen && actions.interact) store.closeCitation();
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    }

    this.player.set(this.px(), this.py(), this.pz());
    this.tickSwing(dt);
    this.syncCaddie();

    if (actions.interact) this.handleInteract();
    this.tickPolice(dt, store.godMode);

    if (this.vehicle.kind === "sq") this.vehicle.tickLightbar(this.elapsed);
    if (this.vehicle.sirenPattern() === "code3_emergency") police.siren.setActive(true);

    quebecFM.tick(dt, store.radioOn);
    spatialAudio.setListener(this.camera);
    spatialAudio.tickEngine(
      this.mode === "drive",
      this.vehicle.speed,
      this.vehicle.x,
      this.vehicle.y,
      this.vehicle.z,
    );
    spatialAudio.tickWind(store.speedKmh, store.weather);
    spatialAudio.tickSiren(
      police.getState().stars > 0 || this.vehicle.sirenPattern() === "code3_emergency",
      this.player.x,
      this.player.y,
      this.player.z,
    );
    spatialAudio.footstep(
      dt,
      this.mode !== "drive" && Math.abs(this.walker.speed) > 0.5,
      this.walker.x,
      this.walker.y,
      this.walker.z,
    );
  }

  private tickPausedActions(
    actions: ReturnType<typeof input.sample>,
    store: ReturnType<typeof useGameStore.getState>,
  ): void {
    if (store.shopOpen && actions.interact) store.closeShop();
    if (store.cartOpen && actions.interact) store.closeCart();
    if (store.citationOpen && actions.interact) store.closeCitation();
  }

  private tickInputActions(
    actions: ReturnType<typeof input.sample>,
    store: ReturnType<typeof useGameStore.getState>,
  ): void {
    if (actions.camera && store.playing) {
      const i = CAMERA_CYCLE.indexOf(this.cameraMode);
      this.cameraMode = CAMERA_CYCLE[(i + 1) % CAMERA_CYCLE.length]!;
      store.setHud({ cameraMode: this.cameraMode, notice: `Caméra · ${CAMERA_LABEL[this.cameraMode]}` });
<<<<<<< HEAD
    }
    if (actions.gesture && store.playing && !store.overlayOpen()) {
      store.toggleGesture();
    } else if (actions.gesture && store.playing && store.gestureOpen) {
      store.closeGesture();
    }
    if (actions.surrender && store.playing) {
      this.playGesture(this.walker.gesture === "surrender" ? "none" : "surrender");
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    }

    if (actions.gesture && store.playing && !store.overlayOpen()) {
      store.toggleGesture();
    } else if (actions.gesture && store.playing && store.gestureOpen) {
      store.closeGesture();
    }

    if (actions.surrender && store.playing) {
      this.playGesture(this.walker.gesture === "surrender" ? "none" : "surrender");
    }

    if (actions.night && store.playing && this.mode !== "interior") {
      this.toggleNight();
    }

    if (actions.map && store.playing && !store.shopOpen && !store.phoneOpen && !store.lockOpen && !store.creatorOpen) {
      const next = !store.showMap;
      store.setHud({ showMap: next, paused: next, consoleOpen: false });
    }

    if (actions.phone && store.playing) {
      if (store.phoneOpen) store.closePhone();
      else store.openPhone();
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (actions.chat && store.playing) {
      if (store.chatOpen) store.closeChat();
      else if (!store.overlayOpen()) store.openChat();
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (actions.console && store.playing) {
      if (store.consoleOpen) store.closeConsole();
      else store.openConsole();
    }

    if (actions.radio && store.playing && !store.overlayOpen()) {
      void this.cycleRadio();
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (actions.siren && store.playing && !store.overlayOpen()) {
      const msg = this.vehicle.cycleSiren();
      if (this.vehicle.sirenPattern() === "code3_emergency") police.siren.setActive(true);
      store.setHud({ notice: msg, sirenMode: this.vehicle.sirenPattern() });
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
<<<<<<< HEAD
=======

    this.hudAcc += dt;
    if (this.hudAcc > 0.12) {
      this.hudAcc = 0;
      this.pushHud();
    }

    if (store.weather !== this.lastWeather) {
      this.lastWeather = store.weather;
      quebecSeasons.setCondition(conditionFromWeather(store.weather, quebecSeasons.getState().season));
      this.world.setWeather(store.weather);
    }

    if (store.playing && !store.paused) {
      quebecSeasons.tick(dt, this.clockHours());
      const wx = quebecSeasons.getState();
      const mapped = weatherIdFromCondition(wx.condition);
      if (mapped !== store.weather) {
        this.lastWeather = mapped;
        useGameStore.getState().setWeather(mapped);
        this.world.setWeather(mapped);
      } else {
        this.world.weatherFx?.apply(wx);
      }

      dynamicEventsService.tick();

      if (this.mode === "drive" && this.vehicle.kind === "deplaceige" && wx.snowAccumulationCm > 0.4) {
        quebecSeasons.runPlowOperation("prive_gratte_ford", Math.min(0.35, Math.abs(this.vehicle.speed) * dt * 0.08));
      }

      if (wx.condition === "orage_ete" && Math.random() < dt * 0.08) this.fx.play("lightning");
      AdminMetrics.noteFps(this.fpsEma);
    }

    if (rpNet.live && store.playing) {
      rpNet.setPose({
        x: this.px(),
        y: this.py(),
        z: this.pz(),
        rotation: this.pYaw(),
        animation: this.mode === "drive" ? "drive" : this.walker.gesture !== "none" ? this.walker.gesture : this.walker.speed > 0.6 ? "walk" : "idle",
        vehicleId: this.mode === "drive" ? store.vehicleId : "",
        speed: this.mode === "drive" ? this.vehicle.speed : this.walker.speed,
        headlights: !this.night,
      });
      this.netAcc += dt;
      if (this.netAcc > 0.05) {
        this.netAcc = 0;
        rpNet.publish();
        this.remotes.sync();
      }
      this.remotes.tick(dt, this.camera);
    }

    this.renderer.render(this.scene, this.camera);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  }

  private tickWeatherAndSeasons(dt: number, store: ReturnType<typeof useGameStore.getState>): void {
    if (store.weather !== this.lastWeather) {
      this.lastWeather = store.weather;
      quebecSeasons.setCondition(conditionFromWeather(store.weather, quebecSeasons.getState().season));
      this.world.setWeather(store.weather);
    }

    if (!store.playing || store.paused) return;

    quebecSeasons.tick(dt, this.clockHours());
    const wx = quebecSeasons.getState();
    const mapped = weatherIdFromCondition(wx.condition);
    if (mapped !== store.weather) {
      this.lastWeather = mapped;
      useGameStore.getState().setWeather(mapped);
      this.world.setWeather(mapped);
    } else {
      this.world.weatherFx?.apply(wx);
    }

    dynamicEventsService.tick();

    if (this.mode === "drive" && this.vehicle.kind === "deplaceige" && wx.snowAccumulationCm > 0.4) {
      quebecSeasons.runPlowOperation("prive_gratte_ford", Math.min(0.35, Math.abs(this.vehicle.speed) * dt * 0.08));
    }
    if (wx.condition === "orage_ete" && Math.random() < dt * 0.08) this.fx.play("lightning");
    AdminMetrics.noteFps(this.fpsEma);

    if (this.elapsed - this.lastPersistAt > this.config.persistIntervalS) {
      this.lastPersistAt = this.elapsed;
      try { persist(); } catch { /* noop */ }
    }
  }

  private tickNetwork(dt: number, store: ReturnType<typeof useGameStore.getState>): void {
    if (!rpNet.live || !store.playing) return;

    rpNet.setPose({
      x: this.px(),
      y: this.py(),
      z: this.pz(),
      rotation: this.pYaw(),
      animation:
        this.mode === "drive"
          ? "drive"
          : this.walker.gesture !== "none"
            ? this.walker.gesture
            : this.walker.speed > 0.6
              ? "walk"
              : "idle",
      vehicleId: this.mode === "drive" ? store.vehicleId : "",
      speed: this.mode === "drive" ? this.vehicle.speed : this.walker.speed,
      headlights: !this.night,
    });

    this.netAcc += dt;
    if (this.netAcc > 0.05) {
      this.netAcc = 0;
      rpNet.publish();
      this.remotes.sync();
    }
    this.remotes.tick(dt, this.camera);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLE INTERACT (inchangé, avec stats)
  // ═════════════════════════════════════════════════════════════════════════

  private handleInteract() {
    this.engineStats.interactCount++;
    this.emit("interact", { mode: this.mode, x: this.px(), z: this.pz() });

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
        if (this.tryGig()) return;
        if (this.tryFirm()) return;
        if (this.tryParkHouse()) return;
        this.exitVehicle();
      }
      return;
    }

    if (this.mode === "interior") {
      if (store.sitting) {
        // CORRIGÉ/AJOUTÉ : avant, être assis coupait court à tout — impossible
        // de manger sans se relever d'abord. On mange en premier si un repas
        // est disponible ; sinon comportement original inchangé (se lever).
        if (this.tryEatMeal()) return;
        store.stand();
        return;
      }
      if (this.tryCaisse()) return;
      if (this.tryCaisseBank()) return;
      if (this.tryGarment()) return;
      if (this.tryDepBits()) return;
      if (this.tryCasseBits()) return;
      if (this.trySqdcBits()) return;
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
    if (this.tryGig()) return;
    if (this.tryFirm()) return;

    const shopEarly = this.world.nearestShop(this.walker.x, this.walker.z, 6.5);
    if (shopEarly && shopEarly.kind === "depanneur") {
      this.tryEnterDepanneur(shopEarly);
      return;
    }
    if (shopEarly && shopEarly.kind === "sqdc") {
      this.tryEnterSqdc(shopEarly);
      return;
    }
    if (shopEarly && shopEarly.kind === "food") {
      this.tryEnterCasse(shopEarly);
      return;
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    const atm = this.world.nearestAtm(this.walker.x, this.walker.z, 4.8);
    if (atm) {
      store.openAtm(atm.id);
      return;
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    const caisseEarly = this.world.nearestCaisse(this.walker.x, this.walker.z, 7.5);
    if (caisseEarly) {
      this.tryEnterCaisse(caisseEarly);
      return;
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
        useGameStore.setState((s: any) => ({
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
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    const mls = nearestCommercial(this.walker.x, this.walker.z, 7);
    if (mls) {
      store.openDeed(mls.id);
      return;
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
    if (shop && shop.kind === "sqdc") {
      this.tryEnterSqdc(shop);
      return;
    }
    if (shop && shop.kind === "food") {
      this.tryEnterCasse(shop);
      return;
    }
    if (shop && shop.kind !== "clothing") {
      store.openShop(shop.id);
      return;
    }

    const biz = this.world.nearestCountyFirm(this.walker.x, this.walker.z, 8);
    if (biz && !shopKindForFirm(biz.type) && this.elapsed - this.lastJobAt > 6) {
      this.lastJobAt = this.elapsed;
      const pay = Math.round(
        (18 + Math.random() * 16) * seasonalFactor(biz.type, gameMonth(this.elapsed)),
      );
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

    const ammoId = ammoFor(store.equippedTool);
    const range = harvestRange(store.equippedTool);
    const fauna = this.world.wildlife.nearestHarvestable(this.walker.x, this.walker.z, range);
    if (fauna) this.harvestFauna(fauna.id);
    void ammoId;
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
      police.report("poaching" as any, this.elapsed);
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

  // ═════════════════════════════════════════════════════════════════════════
  // VEHICLE
  // ═════════════════════════════════════════════════════════════════════════

  private exitVehicle() {
    const side = 2.15;
    const rx = Math.cos(this.vehicle.yaw);
    const rz = -Math.sin(this.vehicle.yaw);
    this.walker.place(this.vehicle.x + rx * side, this.vehicle.z + rz * side, this.vehicle.yaw, false);
    this.vehicle.speed = 0;
    this.setMode("walk");
    this.camera.near = 0.2;
    this.camera.updateProjectionMatrix();
  }

  private enterVehicle() {
    const s = useGameStore.getState();
<<<<<<< HEAD
    police.licenseSuspendedUntil = Math.max(
      police.licenseSuspendedUntil,
      s.licenseSuspendedUntil ?? 0,
    );
=======
    police.licenseSuspendedUntil = Math.max(police.licenseSuspendedUntil, s.licenseSuspendedUntil ?? 0);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (police.isLicenseSuspended() && !s.godMode) {
      s.setHud({
        notice: `Permis SAAQ suspendu · ${police.suspendDaysLeft()} j · Art. 202 / points d'inaptitude`,
      });
      return;
    }
<<<<<<< HEAD
    for (const [id, h] of Object.entries(s.houses)) {
      if (h.parked.includes(s.vehicleId)) {
=======
    const houses = s.houses as Record<string, { parked: string[] }>;
    for (const [id, h] of Object.entries(houses)) {
      if (h && h.parked && h.parked.includes(s.vehicleId)) {
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
    this.setMode("drive");
    this.camera.near = 0.35;
    this.camera.updateProjectionMatrix();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // INTERIOR ENTRY / EXIT
  // ═════════════════════════════════════════════════════════════════════════

  private enterInterior(door: CityDoor) {
    if (door.kind === "depanneur") {
      const shop =
        this.world.shops.find((s) => s.id === door.id) ?? this.world.nearestShop(door.x, door.z, 16);
      this.enterDepanneur(shop ?? null, door);
      return;
    }
    if (door.kind === "sqdc") {
      const shop =
        this.world.shops.find((s) => s.id === door.id) ?? this.world.nearestShop(door.x, door.z, 16);
      this.enterSqdc(shop ?? null, door);
      return;
    }
    if (door.kind === "casse") {
      const shop =
        this.world.shops.find((s) => s.id === door.id) ?? this.world.nearestShop(door.x, door.z, 16);
      this.enterCasse(shop ?? null, door);
      return;
    }
    if (door.kind === "caisse") {
      this.enterCaisse(door);
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
    this.showRoom(
      room,
      door.kind === "hotel"
        ? 0.7
        : door.kind === "boutique"
          ? 0.72
          : door.kind === "prison"
            ? 0.45
            : 1.15,
    );
  }

  showFloor(id: "lobby" | "hotel" | "apartment" | "corridor" | "prison" | "depanneur" | "caisse" | "casse" | "sqdc") {
    useGameStore.getState().closeElevator();
    useGameStore.getState().stand();
    const room = this.interiors[id];
    this.showRoom(
      room,
<<<<<<< HEAD
      id === "lobby"
        ? 0.7
        : id === "hotel"
          ? 0.85
          : id === "corridor"
            ? 1.15
            : id === "prison"
              ? 0.45
              : id === "sqdc"
                ? 1.05
                : id === "depanneur" || id === "casse"
                  ? 0.9
                  : id === "caisse"
                    ? 0.95
                    : 1.15,
=======
      id === "lobby" ? 0.7 : id === "hotel" ? 0.85 : id === "corridor" ? 1.15 : id === "prison" ? 0.45 : id === "sqdc" ? 1.05 : id === "depanneur" || id === "casse" ? 0.9 : id === "caisse" ? 0.95 : 1.15,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
      fog.density = room.kind === "corridor" ? 0.0032 : 0.012;
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
    this.setMode("interior");
    this.camera.near = 0.12;
    this.camera.far = 48;
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
    if (room && (room.kind === "depanneur" || room.kind === "boutique" || room.kind === "casse" || room.kind === "sqdc")) {
      this.stealUnpaidCart();
    }
    if (this.caddie) this.caddie.visible = false;
    this.depShopId = null;
    if (room) room.group.visible = false;
    this.activeInterior = null;
    this.world.setExteriorVisible(true);
    const parked = Object.values(useGameStore.getState().houses as Record<string, { parked: string[] }>).some((h: any) =>
      h.parked && h.parked.includes(useGameStore.getState().vehicleId),
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
      this.walker.place(
        door.x + Math.sin(door.yaw) * 1.6,
        door.z + Math.cos(door.yaw) * 1.6,
        door.yaw + Math.PI,
        false,
      );
    } else {
      this.walker.place(this.vehicle.x + 2.2, this.vehicle.z, this.vehicle.yaw, false);
    }
<<<<<<< HEAD
    this.setMode("walk");
    this.camera.near = 0.35;
    this.camera.far = this.config.cameraFar;
    this.camera.fov = this.config.cameraFov;
=======
    this.mode = "walk";
    this.camera.near = 0.35;
    this.camera.far = 1200;
    this.camera.fov = 62;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.camera.updateProjectionMatrix();
    useGameStore.getState().setHud({ interiorKind: null, mode: "walk" });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LOBBY BITS
  // ═════════════════════════════════════════════════════════════════════════

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
      useGameStore.setState((s: any) => ({ surv: applyMeal(s.surv, "drink") }));
      return true;
    }
    return false;
  }

<<<<<<< HEAD
  // ═════════════════════════════════════════════════════════════════════════
  // CAMERA
  // ═════════════════════════════════════════════════════════════════════════
=======
  // --- RP : repas / dîner sur place ---------------------------------------
  // Table basse et casse-croûte : s'asseoir puis "manger" un article de
  // nourriture/boisson déjà présent dans le sac restaure la survie via le
  // même applyMeal() que le mini-bar de l'hôtel. Purement additif : ne
  // touche à aucune mécanique existante, seulement à la priorité de la
  // touche E pendant qu'on est assis à l'intérieur (voir handleInteract).
  private static readonly MEAL_ITEMS: Record<string, { label: string; kind: "food" | "drink" }> = {
    poutine: { label: "Poutine", kind: "food" },
    steame: { label: "Steamé", kind: "food" },
    tourtiere: { label: "Tourtière", kind: "food" },
    chips: { label: "Chips ketchup", kind: "food" },
    sirop_erable: { label: "Sirop d'érable", kind: "food" },
    cafe: { label: "Café", kind: "drink" },
    cola: { label: "Cola", kind: "drink" },
    chocolat_chaud: { label: "Chocolat chaud", kind: "drink" },
  };

  private nearbyMealChoice(): string | null {
    const inv = useGameStore.getState().inventory as Record<string, number>;
    for (const id of Object.keys(PortneufEngine.MEAL_ITEMS)) {
      if ((inv[id] ?? 0) > 0) return id;
    }
    return null;
  }

  private mealPrompt(): string | null {
    if (this.mode !== "interior" || !useGameStore.getState().sitting) return null;
    const id = this.nearbyMealChoice();
    if (!id) return null;
    return `E — Manger · ${PortneufEngine.MEAL_ITEMS[id].label}`;
  }

  private tryEatMeal(): boolean {
    if (this.mode !== "interior") return false;
    const store = useGameStore.getState();
    if (!store.sitting) return false;
    const id = this.nearbyMealChoice();
    if (!id) return false;
    const meal = PortneufEngine.MEAL_ITEMS[id];
    store.dropItem(id, 1);
    useGameStore.setState((s: any) => ({ surv: applyMeal(s.surv, meal.kind) }));
    store.setHud({ notice: `${meal.label} · miam` });
    return true;
  }
  // -------------------------------------------------------------------------
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

  private updateCamera(dt: number) {
    const indoor = this.mode === "interior";
    const onFoot = this.mode !== "drive";
    const x = this.px();
    const y = this.py();
    const z = this.pz();
    const fx = onFoot ? this.walker.headingX : this.vehicle.headingX;
    const fz = onFoot ? this.walker.headingZ : this.vehicle.headingZ;
    const mode = this.cameraMode;
    const fps = mode === "fps";
    const top = mode === "top";
    const far = mode === "far";
    const hood = !onFoot && mode === "hood";
    const close = onFoot && mode === "hood";
    const corridor = indoor && this.activeInterior?.kind === "corridor";
    const sitting = indoor && useGameStore.getState().sitting;
    if (this.mode !== "drive") this.walker.group.visible = !fps;
    const dist = indoor
      ? sitting
        ? 2.2
        : corridor
          ? 1.65
          : 2.7
      : fps
        ? 0.12
        : top
          ? 0.4
          : onFoot
            ? close
              ? 2.15
              : far
                ? 8.4
                : 4.4
            : hood
              ? 2.4
              : far
                ? 16
                : 9.2;
    const height = indoor
      ? sitting
        ? 1.28
        : corridor
          ? 1.55
          : 1.82
      : fps
        ? 1.62
        : top
          ? onFoot
            ? 18
            : 28
          : onFoot
            ? close
              ? 1.55
              : far
                ? 3.4
                : 2.05
            : hood
              ? 1.55
              : far
                ? 6.2
                : 3.6;
    const lookAhead = indoor ? 3.6 : fps ? 8 : top ? 0.2 : onFoot ? 3.2 : hood ? 10 : far ? 4 : 6;
    const lookY = fps ? y + 1.55 : onFoot ? y + (indoor ? 1.15 : 1.35) : y + 1.1;
    if (top) {
      this.camPos.set(x, y + height, z + 0.4);
    } else {
      this.camPos.set(x - fx * dist, y + height, z - fz * dist);
    }
    if (indoor) this.camPos.y = Math.max(this.camPos.y, INTERIOR_ORIGIN.y + 1.2);
    const k = 1 - Math.exp(-(fps || hood ? 10 : onFoot ? 7 : 5.2) * dt);
    this.camera.position.lerp(this.camPos, k);
    this.look.set(x + fx * lookAhead, lookY, z + fz * lookAhead);
    this.camera.lookAt(this.look);
    const speedKmh = onFoot ? 0 : Math.abs(this.vehicle.speed) * 3.6;
    this.camera.fov = fps ? 68 : top ? 48 : onFoot ? 60 : 62 + Math.min(12, speedKmh * 0.08);
    this.camera.updateProjectionMatrix();
  }

  playGesture(id: RpGesture) {
    const def = gestureDef(id);
    const ttl = def && !def.hold ? def.duration : 0;
    this.walker.setGesture(id, ttl);
    if (id === "sit") useGameStore.getState().sit();
    else if (useGameStore.getState().sitting) useGameStore.getState().stand();
    useGameStore.getState().setGesture(id);
    const label = id === "none" ? "Repos" : (def?.label ?? id);
    useGameStore.getState().setHud({ notice: `Geste · ${label}`, gesture: id, gestureOpen: false });
  }

  cycleCamera() {
    const i = CAMERA_CYCLE.indexOf(this.cameraMode);
    this.cameraMode = CAMERA_CYCLE[(i + 1) % CAMERA_CYCLE.length]!;
<<<<<<< HEAD
    useGameStore.getState().setHud({
      cameraMode: this.cameraMode,
      notice: `Caméra · ${CAMERA_LABEL[this.cameraMode]}`,
    });
=======
    useGameStore.getState().setHud({ cameraMode: this.cameraMode, notice: `Caméra · ${CAMERA_LABEL[this.cameraMode]}` });
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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

  // ═════════════════════════════════════════════════════════════════════════
  // POLICE
  // ═════════════════════════════════════════════════════════════════════════

  private tickPolice(dt: number, god: boolean) {
    if (god) {
      if ((police as any).stars > 0) (police as any).clear?.("Godmode");
      police.siren.setActive(false);
      return;
    }
    if (this.mode === "interior") return;
    const store = useGameStore.getState();
    if (store.citationOpen) return;
    const x = this.px();
    const z = this.pz();
    const speedKmh =
      this.mode === "drive"
        ? Math.abs(this.vehicle.speed) * 3.6
        : Math.abs(this.walker.speed) * 3.6;
    const dist = this.world.nearestPoliceDist(x, z);
    police.update(dt, dist, speedKmh, this.elapsed);

    if (this.mode === "drive" && speedKmh > 40 && this.world.ramPolice(x, z, 4.6) && this.elapsed - this.lastRamAt > 2.4) {
      this.lastRamAt = this.elapsed;
      police.report(speedKmh > 70 ? ("officer_assault" as any) : ("hit_and_run" as any), this.elapsed);
      useGameStore.getState().setHud({ notice: "Collision · unité SQ" });
    }

<<<<<<< HEAD
    if (this.mode === "drive" && police.bloodAlcohol >= 80 && this.elapsed - this.lastCatchAt > 8) {
      this.lastCatchAt = this.elapsed;
      const name = store.appearance.name || "Citoyen";
      const test = police.breathalyzer(name);
      store.setHud({
        bloodAlcohol: test.bloodAlcoholMgPercent,
        notice: `Contrôle SQ · ${test.bloodAlcoholMgPercent} mg · facultés affaiblies`,
      });
      const last = police.tickets[0];
=======
    if (this.mode === "drive" && (police as any).bloodAlcohol >= 80 && this.elapsed - this.lastCatchAt > 8) {
      this.lastCatchAt = this.elapsed;
      const name = store.appearance.name || "Citoyen";
      const test = (police as any).breathalyzer?.(name) ?? {
        bloodAlcoholMgPercent: (police as any).bloodAlcohol ?? 0,
        isOverLegalLimit: (police as any).bloodAlcohol >= 80,
      };
      store.setHud({
        bloodAlcohol: test.bloodAlcoholMgPercent ?? (police as any).bloodAlcohol ?? 0,
        notice: `Contrôle SQ · ${test.bloodAlcoholMgPercent ?? 0} mg · facultés affaiblies`,
      });
      const last = (police as any).tickets?.[0];
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      if (last) {
        store.openCitation({
          kind: "ticket",
          article: last.article,
          description: last.description,
          fine: last.fine,
          points: last.demeritPoints ?? 4,
<<<<<<< HEAD
          message: `Art. 202 CSR · ${test.bloodAlcoholMgPercent} mg`,
          ticketNumber: last.ticketNumber,
          badge: last.issuingOfficerBadge,
=======
          message: `Art. 202 CSR · ${test.bloodAlcoholMgPercent ?? 0} mg`,
          ticketNumber: last.ticketNumber,
          badge: last.issuingOfficerBadge ?? last.badge,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        });
      }
      this.vehicle.speed = 0;
      return;
    }

<<<<<<< HEAD
    if (
      police.stars > 0 &&
=======
    const wanted = {
      stars: (police as any).stars ?? 0,
    };
    if (
      wanted.stars > 0 &&
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      dist < (this.mode === "drive" ? 5.2 : 3.4) * worldConfig.policeCatchMul(x, z) &&
      speedKmh < 16 &&
      this.elapsed - this.lastCatchAt > 4
    ) {
      this.lastCatchAt = this.elapsed;
      if (this.mode === "drive") this.vehicle.speed = 0;
<<<<<<< HEAD
      if (police.stars >= 4) {
        const notice = police.arrest();
        const booked = prisonSystem.book(
          useGameStore.getState().appearance.name || "Citoyen",
          chargesForStars(police.stars),
        );
=======
      if (wanted.stars >= 4) {
        const notice = (police as any).arrest?.() ?? { message: "Arrestation", kind: "arrest" };
        const name = useGameStore.getState().appearance.name || "Citoyen";
        const booked = (prisonSystem as any).book?.(name, chargesForStars(wanted.stars)) ?? {
          booking: `BK-${Date.now().toString(36)}`,
          minutes: 30,
        };
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        const door = this.world.doors.find((d) => d.kind === "prison");
        if (door) {
          if (this.mode === "drive") this.exitVehicle();
          this.lastDoor = door;
          this.enterInterior(door);
        } else {
          this.teleport(PRISON.x, PRISON.z + 42);
        }
        useGameStore.getState().openCitation({
          ...(typeof notice === 'object' ? notice : { message: notice }),
          message: `${typeof notice === 'object' ? (notice as any).message : notice} · ${booked.booking} · cellule A-1-04`,
        });
      } else {
        useGameStore.getState().openCitation((police as any).pullOver?.() ?? {
          kind: "ticket",
          article: "Art. CSR",
          description: "Infraction",
          fine: 100,
        });
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PROMPT TEXT (inchangé)
  // ═════════════════════════════════════════════════════════════════════════

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
        const gig = this.gigPrompt();
        if (gig) return gig;
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
      const casseP = this.casseInteriorPrompt();
      if (casseP) return casseP;
      const sqdcP = this.sqdcInteriorPrompt();
      if (sqdcP) return sqdcP;
      const bankP = this.caisseBankPrompt();
      if (bankP) return bankP;
      const lobby = this.lobbyPrompt();
      if (lobby) return lobby;
      const meal = this.mealPrompt();
      if (meal) return meal;
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
        if (room.kind === "casse") return "E — Sortir du casse-croûte";
        if (room.kind === "sqdc") return "E — Sortir de la SQDC";
        if (room.kind === "caisse") return "E — Sortir de la caisse";
        return "E — Sortir";
      }
      return null;
    }

    const haul = this.haulPrompt();
    if (haul) return haul;
    const gigP = this.gigPrompt();
    if (gigP) return gigP;
    const firmP = this.firmPrompt();
    if (firmP) return firmP;

    const shopNow = this.world.nearestShop(this.walker.x, this.walker.z, 9);
    if (shopNow?.kind === "depanneur") return this.depLotPrompt(shopNow);
    if (shopNow?.kind === "sqdc") return this.sqdcLotPrompt(shopNow);
    if (shopNow?.kind === "food") return this.casseLotPrompt(shopNow);
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    const biz = this.countyFirmPrompt();
    if (biz) return biz;

    const atm = this.world.nearestAtm(this.walker.x, this.walker.z, 4.8);
    if (atm) return `E — Guichet · ${atm.name}`;
<<<<<<< HEAD
    const caisseNow = this.world.nearestCaisse(this.walker.x, this.walker.z, 8);
    if (caisseNow) return this.caisseLotPrompt(caisseNow);
=======

    const caisseNow = this.world.nearestCaisse(this.walker.x, this.walker.z, 8);
    if (caisseNow) return this.caisseLotPrompt(caisseNow);

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
<<<<<<< HEAD
    const loot = this.world.worldItems.nearest(this.walker.x, this.walker.z, 2.4);
    if (loot) return `E — Ramasser · ${loot.name}`;
    const field = this.world.nearestField(this.walker.x, this.walker.z, 14);
    if (field)
      return fieldPrompt(
        field,
        useGameStore.getState().equippedTool,
        useGameStore.getState().selectedSeed,
      );
=======

    const loot = this.world.worldItems.nearest(this.walker.x, this.walker.z, 2.4);
    if (loot) return `E — Ramasser · ${loot.name}`;

    const field = this.world.nearestField(this.walker.x, this.walker.z, 14);
    if (field) return fieldPrompt(field, useGameStore.getState().equippedTool, useGameStore.getState().selectedSeed);

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    const mls = nearestCommercial(this.walker.x, this.walker.z, 7);
    if (mls) {
      const st = useGameStore.getState();
      const mine = ownedIds(st.ownedProps, st.realty).includes(mls.id);
      return mine ? `E — ${mls.name}` : `E — MLS · ${KIND_LABEL[mls.kind]} · ${mls.name}`;
    }
<<<<<<< HEAD
=======

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
<<<<<<< HEAD
      if (shop.kind === "depanneur") return this.depLotPrompt(shop);
      if (shop.kind === "sqdc") return this.sqdcLotPrompt(shop);
      if (shop.kind === "food") return this.casseLotPrompt(shop);
=======
      if (shop.kind === "depanneur") {
        return this.depLotPrompt(shop);
      }
      if (shop.kind === "sqdc") {
        return this.sqdcLotPrompt(shop);
      }
      if (shop.kind === "food") {
        return this.casseLotPrompt(shop);
      }
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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

  private gigPrompt(): string | null {
    const store = useGameStore.getState();
    if (store.activeGig) {
      const step = currentStep(store.activeGig);
      const pct = Math.round(store.activeGig.progress * 100);
      return `${store.activeGig.title} · ${step?.description ?? "En cours"} · ${pct} %`;
    }
    const def = nearestGig(this.px(), this.pz(), 22);
    if (!def) return null;
    const why = getCannotStartReason(store.career, def.id, store.activeGig);
    if (why) return `${def.title} · ${why}`;
    return `E — Quart · ${def.title}`;
  }

  private tryGig(): boolean {
    const store = useGameStore.getState();
    if (store.activeGig) return false;
    const def = nearestGig(this.px(), this.pz(), 22);
    if (!def) return false;
    return store.startGig(def.id);
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
    this.props.group.traverse((o: any) => {
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
      const spec = CROPS[store.selectedSeed as CropId];
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
    const result = workStock(
      stock,
      this.elapsed,
      (store.inventory.foin ?? 0) > 0,
      (store.inventory.ble ?? 0) > 0,
    );
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
    const result = workEvap(evap, this.elapsed);
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
    if (!hit) return false;
    const store = useGameStore.getState();
    const owned = store.ownedProps.includes(hit.lot.deedId);
    // CORRECTION : zone morte achat maison. L'ancre logique de porte
    // (deed.z + depth/2 + 0.4) est decalee d'environ 1.56 m de la porte 3D
    // reelle (house.position.z = -1.2 dans mountHouses, porte a depth/2 + 0.04).
    // Debout devant la vraie porte, le hit le plus proche est donc frequemment
    // de type "lot" (ex. a l'interieur du volume maison, sur les cotes ou pres
    // du garage). Avant, on refusait silencieusement la touche E meme si le
    // prompt affichait « E — A vendre ». On ouvre maintenant l'acte notarie
    // quand le lot est a vendre et que le joueur est dans le rayon du prompt.
    if (hit.kind === "lot") {
      if (!owned && hit.dist < 5.5) {
        store.openDeed(hit.lot.deedId);
        return true;
      }
      return false;
    }
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
    this.showRoom(
      this.interiors.home,
      hydro ? (floor === "basement" ? 0.38 : hasReno(st, "eclairage") ? 0.95 : 0.42) : 0.12,
    );
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
        const hours = this.clockHours();
<<<<<<< HEAD
        const ambient = ambientOf(hours, this.night, gameMonth(this.elapsed));
        setHeatGlow(this.interiors.home.group, heatWorks(next, useGameStore.getState().gridOutage, ambient));
=======
        const ambient = ambientOf(quebecSeasons.getState().season, hours);
        setHeatGlow(this.interiors.home.group, heatWorks(next, useGameStore.getState().gridOutage, ambient.temp));
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
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
    police.report("cultivation" as any, this.elapsed);
    this.world.dispatchFarmRaid(field.x, field.z);
    const store = useGameStore.getState();
    const inv = { ...store.inventory };
    delete inv.graines_cannabis;
    if (inv.weed) delete inv.weed;
    useGameStore.setState({
      inventory: inv,
      notice: `Saisie SQ · ${field.name} · art. 12 LEC`,
      wantedStars: (police as any).stars ?? 0,
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
    if (this.activeInterior?.kind === "sqdc") {
      const hasId = (useGameStore.getState().inventory.identite ?? 0) > 0;
      const t = cartCount(useGameStore.getState().cart);
      if (!hasId) return "Caisse · 21 ans · pièce d'identité requise";
      return t > 0 ? `E — Caisse · ${t} article${t > 1 ? "s" : ""}` : "E — Caisse SQDC";
    }
    const t = cartCount(useGameStore.getState().cart);
    return t > 0 ? `E — Caisse · ${t} article${t > 1 ? "s" : ""}` : "E — Caisse · panier vide";
  }

  private tryCaisse(): boolean {
    if (!this.nearCaisse()) return false;
    if (this.activeInterior?.kind === "sqdc" && !(useGameStore.getState().inventory.identite ?? 0)) {
      useGameStore.getState().setHud({ notice: "21 ans · pièce d'identité requise" });
      return true;
    }
    useGameStore.getState().openCart();
    return true;
  }

  private stealUnpaidCart() {
    const store = useGameStore.getState();
    const n = cartCount(store.cart);
    if (n <= 0) return;
    const cartMap = store.cart as Record<string, number>;
    for (const [id, qty] of Object.entries(cartMap)) {
      if (qty > 0) store.addItem(id, qty);
    }
    store.clearCart();
    police.report("theft" as any, this.elapsed);
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
      const armed =
        (store.inventory.pistol ?? 0) + (store.inventory.shotgun ?? 0) + (store.inventory.crochet ?? 0) > 0;
      if (!armed) {
        store.setHud({ notice: `Fermé · ${depHoursLabel()}` });
        return true;
      }
      store.commitCrime("robbery" as any, this.elapsed);
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
    room.subtitle = open
      ? `${depHoursLabel()} · rayons, caisse, loterie`
      : "Quart de nuit · lumières basses";
    this.showRoom(room, open ? 0.92 : 0.22);
  }

  private sqdcLotPrompt(shop: ShopSpot): string {
    const hours = useGameStore.getState().timeHours;
    const open = isSqdcOpen(hours);
    if (!open) return `Fermé · ${sqdcHoursLabel()} · 21 ans`;
    const near = this.nearSwing(5.2);
    const anyOpen = this.world.swingDoors.some((d) => d.open);
    if (near && !anyOpen) return "Poussez la porte vitrée — puis E";
    return `E — Entrer · ${shop.name}`;
  }

  private tryEnterSqdc(shop: ShopSpot): boolean {
<<<<<<< HEAD
    const store = useGameStore.getState();
    const open = isSqdcOpen(store.timeHours);
    if (!open) {
      store.setHud({ notice: `Fermé · ${sqdcHoursLabel()}` });
      return true;
    }
    const near = this.nearSwing(5.2);
    const anyOpen = this.world.swingDoors.some((d) => d.open);
    if (near && !anyOpen) {
      store.setHud({ notice: "Poussez la porte vitrée" });
      return true;
    }
    const found =
      this.world.doors.find((d) => d.id === shop.id) ??
      this.world.doors.find((d) => d.kind === "sqdc" && Math.hypot(d.x - shop.x, d.z - shop.z) < 18);
    const off = shopDoorOffset(shop);
    const door: CityDoor = found ?? {
      id: shop.id,
      name: shop.name,
      kind: "sqdc",
      x: off.x,
      y: getTerrainHeight(off.x, off.z),
      z: off.z,
      yaw: off.yaw,
      prompt: `Entrer · ${shop.name}`,
    };
    this.enterSqdc(shop, door);
    return true;
  }

  private enterSqdc(shop: ShopSpot | null, door: CityDoor) {
=======
    // MLO Seamless : Pas de téléportation, accès naturel à pied
    return false;
  }

  private enterSqdc(shop: ShopSpot | null, door: CityDoor) {
    const store = useGameStore.getState();
    const inventory = store.inventory || {};
    
    // Vérification québécoise de la pièce d'identité (21 ans et plus pour le cannabis)
    if (!inventory.identite && !inventory.carte_identite) {
      store.setHud({ notice: "⛔ [SQDC] Pièce d'identité avec photo requise (21 ans et plus) !" });
      console.log("⛔ Accès refusé à la SQDC : pas de carte d'identité.");
      return;
    }

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.depShopId = shop?.id ?? door.id;
    this.lastDoor = door;
    const room = this.interiors.sqdc;
    room.title = shop?.name ?? door.name;
    room.subtitle = `${sqdcHoursLabel()} · 21 ans · cannabis légal`;
    this.showRoom(room, 0.95);
  }

  private casseLotPrompt(shop: ShopSpot): string | null {
    const hours = useGameStore.getState().timeHours;
    const open = isCasseOpen(hours);
    if (!open) return `Fermé · ${casseHoursLabel()}`;
    const near = this.nearSwing(5.2);
    const anyOpen = this.world.swingDoors.some((d) => d.open);
    if (near && !anyOpen) return "Poussez la porte vitrée — puis E";
    return `E — Entrer · ${shop.name}`;
  }

  private tryEnterCasse(shop: ShopSpot): boolean {
    const store = useGameStore.getState();
    const open = isCasseOpen(store.timeHours);
    if (!open) {
      store.setHud({ notice: `Fermé · ${casseHoursLabel()}` });
      return true;
    }
    const near = this.nearSwing(5.2);
    const anyOpen = this.world.swingDoors.some((d) => d.open);
    if (near && !anyOpen) {
      store.setHud({ notice: "Poussez la porte vitrée" });
      return true;
    }
    const found =
      this.world.doors.find((d) => d.id === shop.id) ??
      this.world.doors.find((d) => d.kind === "casse" && Math.hypot(d.x - shop.x, d.z - shop.z) < 18);
    const door: CityDoor = found ?? {
      id: shop.id,
      name: shop.name,
      kind: "casse",
      x: shop.x,
      y: getTerrainHeight(shop.x, shop.z),
      z: shop.z,
      yaw: shop.yaw,
      prompt: `Entrer · ${shop.name}`,
    };
    this.enterCasse(shop, door);
    return true;
  }

  private enterCasse(shop: ShopSpot | null, door: CityDoor) {
    this.depShopId = shop?.id ?? (door.id.startsWith("shop_") ? door.id : "shop_tiguy");
    this.lastDoor = door;
    const room = this.interiors.casse;
    room.title = shop?.name ?? door.name;
    room.subtitle = `${casseHoursLabel()} · poutine, steamé, café`;
    this.showRoom(room, 0.95);
  }

  private caisseLotPrompt(caisse: { name: string }): string {
    const hours = useGameStore.getState().timeHours;
    const open = isCaisseOpen(hours);
    if (!open) {
      const inv = useGameStore.getState().inventory;
      const armed = (inv.pistol ?? 0) + (inv.shotgun ?? 0) + (inv.crochet ?? 0) > 0;
      return armed ? `E — Braquer · ${caisse.name}` : `Fermée · ${caisseHoursLabel()}`;
    }
    const near = this.nearSwing(5.2);
    const anyOpen = this.world.swingDoors.some((d) => d.open);
    if (near && !anyOpen) return "Poussez la porte vitrée — puis E";
    return `E — Entrer · ${caisse.name}`;
  }

  private tryEnterCaisse(caisse: { id: string; name: string; x: number; z: number; yaw: number }): boolean {
    const store = useGameStore.getState();
    const open = isCaisseOpen(store.timeHours);
    if (!open) {
<<<<<<< HEAD
      const armed =
        (store.inventory.pistol ?? 0) + (store.inventory.shotgun ?? 0) + (store.inventory.crochet ?? 0) > 0;
=======
      const armed = (store.inventory.pistol ?? 0) + (store.inventory.shotgun ?? 0) + (store.inventory.crochet ?? 0) > 0;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      if (!armed) {
        store.setHud({ notice: `Fermée · ${caisseHoursLabel()}` });
        return true;
      }
<<<<<<< HEAD
      store.commitCrime("bank_robbery", this.elapsed);
=======
      store.commitCrime("bank_robbery" as any, this.elapsed);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    }
    const near = this.nearSwing(5.2);
    const anyOpen = this.world.swingDoors.some((d) => d.open);
    if (near && !anyOpen && open) {
      store.setHud({ notice: "Poussez la porte vitrée" });
      return true;
    }
    const found =
      this.world.doors.find((d) => d.id === caisse.id) ??
      this.world.doors.find((d) => d.kind === "caisse" && Math.hypot(d.x - caisse.x, d.z - caisse.z) < 18);
    const door: CityDoor = found ?? {
      id: caisse.id,
      name: caisse.name,
      kind: "caisse",
      x: caisse.x,
      y: getTerrainHeight(caisse.x, caisse.z),
      z: caisse.z,
      yaw: caisse.yaw,
      prompt: `Entrer · ${caisse.name}`,
    };
    this.enterCaisse(door);
    return true;
  }

  private enterCaisse(door: CityDoor) {
    this.lastDoor = door;
    const room = this.interiors.caisse;
    room.title = door.name;
<<<<<<< HEAD
    room.subtitle = isCaisseOpen(useGameStore.getState().timeHours)
      ? "Ouvert · guichets et conseillers"
      : "Fermé · alarme";
=======
    room.subtitle = isCaisseOpen(useGameStore.getState().timeHours) ? "Ouvert · guichets et conseillers" : "Fermé · alarme";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.showRoom(room, 0.95);
  }

  private caisseBankPrompt(): string | null {
    const room = this.activeInterior;
    if (room?.kind !== "caisse") return null;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    const wx = this.walker.x - ox;
    const wz = this.walker.z - oz;
    if (room.atmSpot && Math.hypot(wx - room.atmSpot.x, wz - room.atmSpot.z) < 1.7) return "E — Guichet automatique";
    if (room.desk && Math.hypot(wx - room.desk.x, wz - room.desk.z) < 1.8) return "E — Comptoir · conseiller";
    if (room.vaultSpot && Math.hypot(wx - room.vaultSpot.x, wz - room.vaultSpot.z) < 2.0) return "E — Voûte blindée";
    return null;
  }

  private tryCaisseBank(): boolean {
    const room = this.activeInterior;
    if (room?.kind !== "caisse") return false;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    const wx = this.walker.x - ox;
    const wz = this.walker.z - oz;
    const store = useGameStore.getState();
    if (room.atmSpot && Math.hypot(wx - room.atmSpot.x, wz - room.atmSpot.z) < 1.7) {
      store.openAtm("atm_caisse");
      return true;
    }
    if (room.desk && Math.hypot(wx - room.desk.x, wz - room.desk.z) < 1.8) {
      if (!isCaisseOpen(store.timeHours)) {
        store.setHud({ notice: "Guichet fermé · utilisez le GAB" });
        return true;
      }
      store.openAtm("atm_caisse");
      return true;
    }
    if (room.vaultSpot && Math.hypot(wx - room.vaultSpot.x, wz - room.vaultSpot.z) < 2.0) {
<<<<<<< HEAD
      const armed =
        (store.inventory.pistol ?? 0) + (store.inventory.shotgun ?? 0) + (store.inventory.crochet ?? 0) > 0;
=======
      const armed = (store.inventory.pistol ?? 0) + (store.inventory.shotgun ?? 0) + (store.inventory.crochet ?? 0) > 0;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      if (!armed) {
        store.setHud({ notice: "Porte de voûte · acier, scellée" });
        return true;
      }
<<<<<<< HEAD
      store.commitCrime("bank_robbery", this.elapsed);
      store.setHud({ economy: breakAtm(store.economy, "atm_caisse") });
=======
      store.commitCrime("bank_robbery" as any, this.elapsed);
      store.setHud({ economy: breakAtm(store.economy) });
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      store.addCash(420, "Voûte · 420 $");
      return true;
    }
    return false;
  }

  private nearAisle(): DepAisleHot | null {
    const room = this.activeInterior;
    if ((room?.kind !== "depanneur" && room?.kind !== "casse" && room?.kind !== "sqdc") || !room.aisles) return null;
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

  private casseInteriorPrompt(): string | null {
    const room = this.activeInterior;
    if (room?.kind !== "casse") return null;
    return cassePrompt(
      this.nearAisle(),
      this.nearGarment(),
      this.nearCaisse(),
      cartCount(useGameStore.getState().cart),
    );
  }

  private tryCasseBits(): boolean {
    const room = this.activeInterior;
    if (room?.kind !== "casse") return false;
    const aisle = this.nearAisle();
    if (aisle && aisle.items.length > 0 && !this.nearGarment()) {
      if (this.depShopId) useGameStore.getState().openShop(this.depShopId, aisle.id);
      else useGameStore.getState().addToCart(aisle.items[0]!);
      return true;
    }
    return false;
  }

  private sqdcInteriorPrompt(): string | null {
    const room = this.activeInterior;
    if (room?.kind !== "sqdc") return null;
    const ox = room.group.position.x;
    const oz = room.group.position.z;
    const wx = this.walker.x - ox;
    const wz = this.walker.z - oz;
<<<<<<< HEAD
    const atCaisse =
      Boolean(room.caisse && Math.hypot(wx - room.caisse.x, wz - room.caisse.z) < 1.7) || this.nearCaisse();
=======
    const atCaisse = Boolean(room.caisse && Math.hypot(wx - room.caisse.x, wz - room.caisse.z) < 1.7) || this.nearCaisse();
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    return sqdcPrompt(
      this.nearAisle(),
      this.nearGarment(),
      atCaisse,
      cartCount(useGameStore.getState().cart),
      (useGameStore.getState().inventory.identite ?? 0) > 0,
<<<<<<< HEAD
=======
      rpNet.selfId || "local",
      String(this.elapsed),
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    );
  }

  private trySqdcBits(): boolean {
    const room = this.activeInterior;
    if (room?.kind !== "sqdc") return false;
    const store = useGameStore.getState();
    const aisle = this.nearAisle();
    if (aisle && aisle.id === "accueil") {
      const hasId = (store.inventory.identite ?? 0) > 0;
      store.setHud({ notice: hasId ? "Identité vérifiée · 21 ans" : "21 ans · pièce d'identité requise" });
      return true;
    }
    if (aisle && aisle.id === "conseil") {
      store.setHud({ notice: "Conseiller · commencez bas, lisez l'étiquette" });
      return true;
    }
    if (aisle && aisle.items.length > 0 && !this.nearGarment()) {
      if (this.depShopId) store.openShop(this.depShopId, aisle.id);
      else store.addToCart(aisle.items[0]!);
      return true;
    }
    return false;
  }

  private syncCaddie() {
    const room = this.activeInterior;
<<<<<<< HEAD
    const inShop =
      this.mode === "interior" &&
      (room?.kind === "boutique" || room?.kind === "depanneur" || room?.kind === "casse" || room?.kind === "sqdc");
=======
    const inShop = this.mode === "interior" && (room?.kind === "boutique" || room?.kind === "depanneur" || room?.kind === "casse" || room?.kind === "sqdc");
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (!inShop) {
      if (this.caddie) this.caddie.visible = false;
      return;
    }
    if (!this.caddie) {
      this.caddie = buildCaddie();
      this.scene.add(this.caddie);
    }
    this.caddie.visible = true;
    const cartNow = useGameStore.getState().cart as Record<string, number>;
    const n = cartCount(cartNow);
    // CORRIGÉ : l'ancienne clé ne suivait que le total d'articles, donc échanger
    // un article contre un autre à quantité égale ne rafraîchissait jamais le
    // caddie 3D. On sérialise maintenant le contenu réel du panier.
    const key = Object.entries(cartNow)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => `${id}:${qty}`)
      .sort()
      .join(",");
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
      const bodyDist = Math.hypot(this.bodyHit.x - this.doorHit.x, this.bodyHit.z - this.doorHit.z);
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
    let crate = this.vehicle.group.getObjectByName("cargo") as THREE.Object3D | undefined;
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
      if (crate) {
        crate.position.set(pos[0], pos[1], pos[2]);
        this.vehicle.group.add(crate);
      }
    }
    if (crate) {
      crate.visible = show;
      const kg = haulCargoKg(job);
      const s = 0.85 + Math.min(1.6, kg / 500);
      crate.scale.set(s, s * (0.7 + Math.min(0.5, kg / 900)), s);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PUSH HUD (diff-based)
  // ═════════════════════════════════════════════════════════════════════════

  private pushHud(store: ReturnType<typeof useGameStore.getState>): void {
    const onFoot = this.mode !== "drive";
    const x = this.px();
    const z = this.pz();
    const yaw = this.pYaw();
    const { limit: roadLimit } = getSpeedLimitAt(x, z);
    const speedKmh = onFoot ? Math.abs(this.walker.speed) * 3.6 : Math.abs(this.vehicle.speed) * 3.6;
    const ice =
<<<<<<< HEAD
      store.weather === "snow" ||
      store.weather === "storm" ||
      store.gridOutage?.kind === "verglas";
=======
      useGameStore.getState().weather === "snow" ||
      useGameStore.getState().weather === "storm" ||
      useGameStore.getState().gridOutage?.kind === "verglas";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    const surface = withIce(getSurfaceAt(x, z), ice);
    const cfg = this.mode === "interior" ? null : worldConfig.at(x, z);
    const zp = zoneSystem.getAt(x, z);
    const zone = zp?.name ?? getZoneName(x, z);
    const poi = this.mode === "interior" ? null : getPoiAt(x, z);
    const limit = cfg?.speedLimit ?? roadLimit;
    const speeding = ENFORCE_SPEED_LIMITS && !onFoot && speedKmh > limit + 5;
    const god = store.godMode;

    let fineFlash = store.fineFlash;
    let fines = store.fines;
    if (speeding && !god && this.elapsed - this.lastFineAt > this.config.fineCooldownS) {
      this.lastFineAt = this.elapsed;
      const excess = speedKmh - limit;
      const add = excess < 20 ? 105 : excess < 40 ? 225 : excess < 60 ? 495 : 1050;
      fines += add;
      fineFlash = add;
<<<<<<< HEAD
      const hit = police.reportSpeeding(excess, this.elapsed);
      const name = store.appearance.name || "Citoyen";
      const radar = police.radarTicket(excess, speedKmh, limit, name);
      const label = radar
        ? `${radar.csrArticle} · ${radar.ticketNumber} · −${add}\u00a0$`
        : hit?.citation
          ? `${hit.citation.article} · −${add}\u00a0$`
          : `Contravention · −${add}\u00a0$`;
      store.addCash(-add, label);
      if (radar) {
        useGameStore.setState({
          demeritPoints: police.demeritTotal,
          licenseSuspendedUntil: police.licenseSuspendedUntil,
=======
      const hit = (police as any).reportSpeeding?.(excess, String(this.elapsed));
      const name = useGameStore.getState().appearance.name || "Citoyen";
      const radar = (police as any).radarTicket?.(excess, speedKmh, limit, name);
      const label = radar
        ? `${radar.csrArticle ?? "CSR"} · ${radar.ticketNumber ?? ""} · −${add}\u00a0$`
        : hit?.citation
          ? `${hit.citation.article ?? "Art."} · −${add}\u00a0$`
          : `Contravention · −${add}\u00a0$`;
      useGameStore.getState().addCash(-add, label);
      if (radar) {
        useGameStore.setState({
          demeritPoints: (police as any).demeritTotal ?? 0,
          licenseSuspendedUntil: (police as any).licenseSuspendedUntil ?? 0,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        });
      }
    } else {
      fineFlash = Math.max(0, fineFlash - 18);
    }
<<<<<<< HEAD

    const km = store.km + this.kmAcc / 1000;
    this.kmAcc = 0;
    const hours = this.clockHours();

    let leaves = store.leaves;
=======
    const km = useGameStore.getState().km + this.kmAcc / 1000;
    this.kmAcc = 0;
    const hours = this.clockHours();
    let leaves = useGameStore.getState().leaves;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    if (this.mode === "walk") {
      const found = this.world.nearestLeaf(x, z, 1.8);
      if (found && this.world.collectLeaf(found.id)) {
        leaves = leaves.includes(found.id) ? leaves : [...leaves, found.id];
        store.addCash(8, "Feuille d'érable · +8\u00a0$");
        try { persist(); } catch { /* noop */ }
      }
      const loot = this.world.worldItems.nearest(x, z, 1.7);
      if (loot) {
        const got = this.world.worldItems.collect(loot.id);
        if (got) {
          store.addItem(got.itemId, 1);
          store.lootItem(got.id);
          store.addCash(got.cash, `${got.name} · +${got.cash}\u00a0$`);
        }
      }
      const loot = this.world.worldItems.nearest(x, z, 1.7);
      if (loot) {
        const got = this.world.worldItems.collect(loot.id);
        if (got) {
          useGameStore.getState().addItem(got.itemId, 1);
          useGameStore.getState().lootItem(got.id);
          useGameStore.getState().addCash(got.cash, `${got.name} · +${got.cash}\u00a0$`);
        }
      }
    }
    const fieldHere = this.mode === "interior" ? null : this.world.nearestField(x, z, 18);
    const bushHere = this.mode === "interior" || fieldHere ? null : this.world.nearestBush(x, z, 36);
    const room = this.activeInterior;
    const wanted = {
      stars: (police as any).stars ?? 0,
      reason: (police as any).reason ?? (police as any).wantedReason ?? "",
      bounty: (police as any).bounty ?? 0,
      evading: (police as any).evading ?? false,
    };
    const np = quebecFM.on ? quebecFM.nowPlaying() : null;
<<<<<<< HEAD
    const prompt = this.promptText();

    const hashParts = [
      Math.round(speedKmh),
      limit,
      this.mode,
      room?.title ?? "",
      prompt ?? "",
      wanted.stars,
      Math.round(store.surv.health),
      Math.round(store.surv.hunger),
      Math.round(store.surv.thirst),
      fines,
      speeding ? 1 : 0,
    ];
    const hash = hashParts.join("|");
    if (hash === this.lastHudHash) {
      this.engineStats.hudSkips++;
      return;
    }
    this.lastHudHash = hash;
    this.engineStats.hudPushes++;

    store.setHud({
=======
    const inmate = (prisonSystem as any).inmate;
    const interiorSub =
      room?.kind === "prison" && inmate
        ? `${inmate.booking} · ${((prisonSystem as any).remain?.() ?? 0).toFixed(0)} min · ${(prisonSystem as any).lockdown ? "LOCKDOWN" : "cour fermée"}`
        : (room?.subtitle ?? null);
    useGameStore.getState().setHud({
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      speedKmh,
      limit: this.mode === "interior" ? 0 : limit,
      zone:
        this.mode === "interior"
          ? (room?.title ?? "Intérieur")
          : fieldHere
            ? fieldHere.name
            : bushHere
              ? bushHere.name
              : (poi?.name ?? (cfg?.displayName ?? zone)),
      surface: this.mode === "interior" ? (room?.subtitle ?? "Intérieur") : surface.name,
      speeding,
      fineFlash,
      fines,
      policeEta: cfg?.policeResponseSeconds ?? 0,
<<<<<<< HEAD
      bloodAlcohol: Math.round(police.bloodAlcohol),
      radarActive: police.units.some((u) => u.radarActive),
      demeritPoints: police.demeritTotal,
      licenseSuspendedUntil: police.licenseSuspendedUntil,
=======
      bloodAlcohol: Math.round((police as any).bloodAlcohol ?? 0),
      radarActive: (police as any).units?.some((u: any) => u.radarActive) ?? false,
      demeritPoints: (police as any).demeritTotal ?? 0,
      licenseSuspendedUntil: (police as any).licenseSuspendedUntil ?? 0,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      safeZone: cfg?.isSafeZone ?? false,
      x,
      z,
      yaw,
      km,
<<<<<<< HEAD
      timeHours: rpNet.live && !rpNet.isHost() ? store.timeHours : hours,
=======
      timeHours: rpNet.live && !rpNet.isHost() ? useGameStore.getState().timeHours : hours,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      night: this.night,
      cameraMode: this.cameraMode,
      poi: poi?.name ?? null,
      poiDesc: poi?.description ?? null,
      mode: this.mode,
      prompt,
      interiorTitle: room?.title ?? null,
      interiorSub,
      leaves,
      fauna: this.mode === "interior" ? null : this.world.wildlife.warning,
      wantedStars: wanted.stars,
      wantedReason: wanted.reason,
      bounty: wanted.bounty,
      evading: wanted.evading,
      dispatch: (police as any).dispatchLine?.() ?? "",
      radioOn: quebecFM.on,
      radioId: quebecFM.stationId,
      radioTrack: np ? `${np.track.title} · ${np.track.artist}` : null,
      season: quebecSeasons.getState().season,
      wxCondition: quebecSeasons.getState().condition,
      wxTemp: quebecSeasons.getState().temperatureCelsius,
      snowCm: quebecSeasons.getState().snowAccumulationCm,
      plowStatus: quebecSeasons.getState().snowPlowStatus,
      eventBanner: dynamicEventsService.banner()?.title ?? null,
      eventSeverity: dynamicEventsService.banner()?.severity ?? null,
      sirenMode: this.vehicle.sirenPattern(),
    });
    if (poi) store.visit(poi.id);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RUN ADMIN (préservé avec ajouts)
  // ═════════════════════════════════════════════════════════════════════════

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
        this.lastWeather = id;
        quebecSeasons.setCondition(conditionFromWeather(id, quebecSeasons.getState().season));
        this.world.setWeather(id);
      },
      setSeason: (id) => {
        const wx = quebecSeasons.setSeason(id);
        const mapped = weatherIdFromCondition(wx.condition);
        this.lastWeather = mapped;
        useGameStore.getState().setWeather(mapped);
        this.world.setWeather(mapped);
        useGameStore.getState().setHud({
          season: wx.season,
          wxCondition: wx.condition,
          wxTemp: wx.temperatureCelsius,
          snowCm: wx.snowAccumulationCm,
          plowStatus: wx.snowPlowStatus,
          notice: `Saison · ${id}`,
        });
      },
      triggerBlizzard: () => {
        quebecSeasons.triggerBlizzard();
        dynamicEventsService.triggerBlizzard();
        this.lastWeather = "storm";
        useGameStore.getState().setWeather("storm");
        this.world.setWeather("storm");
        this.fx.play("lightning");
<<<<<<< HEAD
        useGameStore
          .getState()
          .addChat("MTQ", "Alerte blizzard — Route 138, visibilité nulle. Chasse-neige en cours.", "system");
=======
        useGameStore.getState().addChat("MTQ", "Alerte blizzard — Route 138, visibilité nulle. Chasse-neige en cours.", "system");
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      },
      runPlow: (id) => {
        const wx = quebecSeasons.getState();
        const plow = wx.plows.find((p) => p.id === id) ?? wx.plows[0];
        if (!plow) return "Aucune gratte.";
        quebecSeasons.runPlowOperation(plow.id, 8);
        const near = this.world.plows?.nearest(this.px(), this.pz());
        if (near) this.teleport(near.x, near.z);
        const next = quebecSeasons.getState();
        return `${plow.name} · ${Math.round(next.snowAccumulationCm)} cm · ${plow.driverName}`;
      },
      spawnEvent: (kind) => {
        const k = (kind || "blizzard").toLowerCase();
        if (k === "blizzard" || k === "tempete" || k === "meteo") {
          quebecSeasons.triggerBlizzard();
          dynamicEventsService.triggerBlizzard();
          this.lastWeather = "storm";
          useGameStore.getState().setWeather("storm");
          this.world.setWeather("storm");
          return "Événement · blizzard 138";
        }
        if (k === "panne" || k === "hydro" || k === "outage") {
          dynamicEventsService.triggerOutage();
<<<<<<< HEAD
          useGameStore.setState({
            gridOutage: { kind: "panne", t: 70 },
            notice: "Panne Hydro-Québec · Saint-Casimir",
          });
=======
          useGameStore.setState({ gridOutage: { kind: "panne", t: 70 }, notice: "Panne Hydro-Québec · Saint-Casimir" });
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          this.teleport(-900, -280);
          return "Événement · panne Hydro Saint-Casimir";
        }
        if (k === "ether_storm" || k === "ether" || k === "tempete_ether") {
          quebecSeasons.setCondition("orage_ete");
          this.lastWeather = "storm";
          useGameStore.getState().setWeather("storm");
          this.world.setWeather("storm");
          this.fx.play("lightning");
          this.fx.play("portal");
          dynamicEventsService.triggerEvent({
            title: "Tempête d'Éther sur le comté",
            category: "meteo",
            severity: "majeur",
            locationName: "Vallée de la 138",
            coordinates: [this.px(), 2, this.pz()],
            description: "Une onde cosmique s'abat sur Portneuf.",
            durationMinutes: 25,
            impacts: ["Visibilité réduite", "Interférences radio"],
          });
          return "Événement · tempête d'Éther";
        }
        if (k === "police_chase" || k === "chase" || k === "poursuite") {
<<<<<<< HEAD
          police.setStars(4, "Course-poursuite Route 138", 8000);
=======
          (police as any).setStars?.(4, "Course-poursuite Route 138", 8000);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          dynamicEventsService.triggerEvent({
            title: "Poursuite SQ — Route 138",
            category: "urgence",
            severity: "majeur",
            locationName: "Chemin du Roy",
            coordinates: [this.px(), 2, this.pz()],
            description: "Course-poursuite à haute vitesse. Unités du poste de Portneuf mobilisées.",
            durationMinutes: 20,
            impacts: ["Barrages routiers", "Priorité radio SQ"],
          });
          return "Événement · poursuite SQ";
        }
        if (k === "bank_robbery" || k === "braquage" || k === "bank") {
<<<<<<< HEAD
          police.setStars(5, "Braquage de caisse populaire", 14000);
=======
          (police as any).setStars?.(5, "Braquage de caisse populaire", 14000);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          dynamicEventsService.triggerEvent({
            title: "Braquage de la Caisse populaire",
            category: "urgence",
            severity: "catastrophe",
            locationName: "Caisse de Saint-Alban",
            coordinates: [this.px(), 2, this.pz()],
            description: "Hold-up en cours. Toutes les unités sont mobilisées.",
            durationMinutes: 30,
            impacts: ["GAB hors service", "SQ en approche"],
          });
          return "Événement · braquage";
        }
        if (k === "airdrop" || k === "largage") {
          this.fx.play("meteor");
          dynamicEventsService.triggerEvent({
            title: "Largage de ravitaillement",
            category: "economie",
            severity: "mineur",
            locationName: "Parc de Pont-Rouge",
            coordinates: [this.px(), 2, this.pz()],
            description: "Un colis militaire est tombé près du parc.",
            durationMinutes: 15,
            impacts: ["Butin contesté"],
          });
          return "Événement · largage";
        }
        if (k === "clear" || k === "off") {
          dynamicEventsService.clearAll();
          quebecSeasons.setSeason("automne");
          useGameStore.setState({ gridOutage: null, notice: "Ciel dégagé" });
          return "Événements levés";
        }
        const ev = dynamicEventsService.triggerEvent({
          title: kind,
          category: "social",
          severity: "mineur",
          locationName: "Comté de Portneuf",
          coordinates: [this.px(), 2, this.pz()],
          description: kind,
          durationMinutes: 20,
          impacts: [],
        });
        return `Événement · ${ev.title}`;
      },
      setClock: (hours) => {
        const now = this.clockHours();
        this.clockShift += (hours - now + 24) % 24;
        const h = this.clockHours();
        this.night = sunElevation(h) < 0.07;
        this.world.setTime(h);
        useGameStore.getState().setHud({ night: this.night, timeHours: h });
      },
      announce: (text) => {
        useGameStore.getState().addChat("GOUV", text, "system");
        useGameStore.getState().setHud({ notice: text });
        rpNet.publishChat("ad", text);
      },
      forceOutage: (kind) => {
        if (!kind) {
          dynamicEventsService.resolveCategory("infrastructures");
          useGameStore.setState({ gridOutage: null, notice: "Hydro-Québec · réseau rétabli" });
          persist();
          return;
        }
        if (kind === "verglas") {
          quebecSeasons.setCondition("verglas");
          this.lastWeather = "storm";
          useGameStore.getState().setWeather("storm");
          this.world.setWeather("storm");
        }
        dynamicEventsService.triggerOutage();
<<<<<<< HEAD
        useGameStore.setState({
          gridOutage: { kind, t: 70 },
          notice: kind === "verglas" ? "Verglas · réseau Hydro hors service" : "Panne Hydro-Québec",
        });
=======
        useGameStore.setState({ gridOutage: { kind, t: 70 }, notice: kind === "verglas" ? "Verglas · réseau Hydro hors service" : "Panne Hydro-Québec" });
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        persist();
      },
      say: (text) => {
        rpNet.publishChat("local", text);
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
      freeze: (on) => {
        useGameStore.getState().setHud({ staffFrozen: on, notice: on ? "Gelé" : "Dégelé" });
      },
      vanish: () => {
        const next = !useGameStore.getState().vanished;
        useGameStore.getState().setHud({ vanished: next, notice: next ? "Invisible" : "Visible" });
        if (this.mode !== "drive") this.walker.group.visible = !next;
        return next;
      },
      slap: (force) => {
        if (this.mode === "drive") this.exitVehicle();
        this.walker.slap(force);
        this.fx.play("impact");
      },
      smite: () => {
        this.fx.play("lightning");
        this.fx.play("divinejudgment");
        this.walker.playHurt("stagger_dizzy");
        const s = useGameStore.getState();
        s.setHud({ surv: { ...s.surv, health: Math.max(8, s.surv.health * 0.2) }, notice: "Foudroyé" });
      },
      etherPulse: () => {
        this.fx.play("chromaticpulse");
        this.fx.play("portal");
        useGameStore.getState().addChat("ÉTHER", "Onde de choc lumineuse sur le comté.", "system");
        useGameStore.getState().setHud({ notice: "Onde d'Éther" });
      },
      repairAll: () => {
        this.vehicle.slip = 0;
        this.vehicle.speed = Math.min(this.vehicle.speed, 8);
        useGameStore.getState().setHud({ notice: "Véhicules réparés" });
      },
      unjail: () => {
<<<<<<< HEAD
        prisonSystem.release();
=======
        (prisonSystem as any).release?.();
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        if (this.activeInterior?.kind === "prison") this.leaveInterior();
        this.teleport(SPAWN.x, SPAWN.z);
        useGameStore.getState().setHud({ staffFrozen: false, notice: "Libéré" });
      },
      maxStats: () => {
        const s = useGameStore.getState();
        s.setHud({
<<<<<<< HEAD
          surv: {
            ...s.surv,
            health: 100,
            hunger: 100,
            thirst: 100,
            energy: 100,
            bodyTemp: 36.6,
            shiver: 0,
            alerts: [],
          },
=======
          surv: { ...s.surv, health: 100, hunger: 100, thirst: 100, energy: 100, bodyTemp: 36.6, shiver: 0, alerts: [] },
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          armor: 100,
          notice: "Stats max",
        });
        this.walker.clearHurt();
      },
      setArmor: (n) => {
        useGameStore.getState().setHud({ armor: Math.max(0, Math.min(100, n)), notice: `Gilet ${n}%` });
      },
      mute: (on) => {
        useGameStore.getState().setHud({ muted: on, notice: on ? "Muet" : "Parole rétablie" });
      },
      kickPeer: (name) => {
        const q = name.toLowerCase();
        const hit = [...rpNet.remotes.values()].find((p) => p.username.toLowerCase().includes(q));
        useGameStore.getState().addChat("MOD", `${hit?.username ?? name} expulsé du rang.`, "system");
        if (!hit) {
          this.walker.clearHurt();
          this.respawn();
          return `${name} · rang local, renvoyé au spawn`;
        }
        return `${hit.username} expulsé`;
      },
      setWanted: (n) => {
        (police as any).setStars?.(n, n > 0 ? "Avis de recherche (console)" : undefined, n * 1500);
      },
      cycleRadio: () => {
        void this.cycleRadio();
      },
      cycleSiren: () => {
        const msg = this.vehicle.cycleSiren();
        if (this.vehicle.sirenPattern() === "code3_emergency") police.siren.setActive(true);
        store.setHud({ notice: msg, sirenMode: this.vehicle.sirenPattern() });
        return msg;
      },
      jail: () => this.teleport(SQ_JAIL.x, SQ_JAIL.z + 10),
      prison: () => this.goPrison(),
      book: () => this.bookPlayer(),
      lockdown: () => {
        (prisonSystem as any).startLockdown?.(8);
        store.setHud({ notice: "🚨 LOCKDOWN · Établissement de Donnacona" });
      },
      release: () => {
        (prisonSystem as any).release?.();
        if (this.activeInterior?.kind === "prison") this.leaveInterior();
        store.setHud({ notice: "Libération administrative" });
      },
      pos: () => `${this.px().toFixed(1)} ${this.pz().toFixed(1)} · ${this.mode}`,
      zone: () => worldConfig.describe(this.px(), this.pz()),
      net: () => {
        const m = rpNet.getMetrics();
        return [
          `Intellectus · ${m.clients} citoyens · ${m.entities} véhicules`,
          `AOI ${m.aoi.radius} m · visibles ${m.aoi.visible} · compact ${m.aoi.compactIn}`,
          `spatial ${m.spatial.indexed} index · ${m.spatial.cells} cellules`,
          `poses ${m.simulation.ticks} · identités ${m.simulation.identitySends} · patch ${m.simulation.patchRate} Hz`,
          `persist file ${m.persistence.pending} · flush ${m.persistence.flushed} · fusion ${m.persistence.merged}`,
          `anti-tp ${m.security.rejectedMoves} rejetés · max ${m.security.maxStepMeters} m`,
        ].join("\n");
      },
      openIntel: () => useGameStore.getState().openIntel(),
      floor: (id) => {
        if (id === "prison") {
          const door = this.world.doors.find((d) => d.kind === "prison");
          if (door) this.lastDoor = door;
        } else if (id === "depanneur") {
          const door = this.world.doors.find((d) => d.kind === "depanneur");
          if (door) this.lastDoor = door;
          const shop = this.world.shops.find((s) => s.kind === "depanneur");
          if (shop) this.depShopId = shop.id;
        } else if (id === "casse") {
          const door = this.world.doors.find((d) => d.kind === "casse");
          if (door) this.lastDoor = door;
          const shop = this.world.shops.find((s) => s.kind === "food");
          if (shop) this.depShopId = shop.id;
        } else if (id === "sqdc") {
          const door = this.world.doors.find((d) => d.kind === "sqdc");
          if (door) this.lastDoor = door;
          const shop = this.world.shops.find((s) => s.kind === "sqdc");
          if (shop) this.depShopId = shop.id;
        } else if (id === "caisse") {
          const door = this.world.doors.find((d) => d.kind === "caisse");
          if (door) this.lastDoor = door;
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
        const inventoryMap = s.inventory as Record<string, number>;
        const inv = Object.entries(inventoryMap)
          .filter(([, n]) => Number(n) > 0)
          .map(([id, n]) => `${id}×${n}`)
          .join(", ");
        const net = rpNet.getMetrics();
        const wx = quebecSeasons.getState();
        const tel = AdminMetrics.getMetrics({ players: { size: rpNet.remotes.size + 1 }, vehicles: { size: 1 } });
        const banner = dynamicEventsService.banner();
<<<<<<< HEAD
        const stats = this.getStats();
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        return [
          `${s.appearance.name} · ${s.appearance.model} · ${s.appearance.outfit}`,
          `pos ${this.px().toFixed(0)} ${this.pz().toFixed(0)} · ${this.mode}`,
          worldConfig.describe(this.px(), this.pz()).split("\n")[0] ?? "",
          `rendu ${this.renderer.info.render.calls} appels · ${this.fpsEma.toFixed(0)} fps · dpr ${this.dprNow.toFixed(2)}`,
          `météo ${wx.season} · ${wx.condition} · ${wx.temperatureCelsius} °C · ${Math.round(wx.snowAccumulationCm)} cm`,
          `déneige ${wx.snowPlowStatus} · friction ${wx.roadFrictionCoeff.toFixed(2)}`,
          `événements ${dynamicEventsService.getActiveEvents().length} · ${banner?.title ?? "calme"}`,
          `net ${net.clients} · AOI ${net.aoi.visible}/${rpNet.remotes.size} · spatial ${net.spatial.cells}`,
          `télémétrie ${tel.fps} fps · ${tel.memoryUsageMB} Mo · ${tel.uptimeSeconds}s`,
<<<<<<< HEAD
          `engine ticks ${stats.ticksTotal} · avg ${stats.avgTickMs.toFixed(2)} ms · peak ${stats.peakTickMs.toFixed(2)} ms`,
          `hud push ${stats.hudPushes} · skip ${stats.hudSkips} · errors ${stats.errorsCaught}`,
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          `cash ${s.cash}\u00a0$ · banque ${s.bank}\u00a0$ · ${s.wantedStars}★ · gilet ${s.armor ?? 0}%`,
          `emploi ${s.rpJob} · grade ${s.adminRole} · gang ${s.gangId ?? "—"} · firm ${s.firm?.tradeName ?? "—"}`,
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
        useGameStore.getState().setHud({ cameraMode: mode, notice: `Caméra · ${CAMERA_LABEL[mode] ?? mode}` });
      },
      playGesture: (id) => this.playGesture(id),
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
        return `${n}/${this.config.maxProps} posés · fantôme ${type} · snap ${this.buildSnap || "off"}`;
      },
      engineStats: () => this.getStats(),
    });
  }

  setBuildSnap(n: number) {
    this.buildSnap = n <= 0 ? 0 : n;
    useGameStore.getState().setHud({ notice: this.buildSnap ? `Grille · ${this.buildSnap} m` : "Grille libre" });
  }

  toggleNight() {
    if (this.mode === "interior") return;
    const now = this.clockHours();
    const target = now >= 6.2 && now < 20 ? 21.7 : 11.1;
    this.clockShift += (target - now + 24) % 24;
    const hours = this.clockHours();
    this.night = sunElevation(hours) < 0.07;
    this.world.setTime(hours);
    this.lastShadow.set(1e6, 0, 0);
    useGameStore.getState().setHud({ night: this.night, timeHours: hours });
  }

  respawn() {
    if (this.mode === "interior") this.leaveInterior();
    this.walker.hide();
    this.vehicle.reset();
    this.vehicle.group.visible = true;
    this.world.setExteriorVisible(true);
    this.setMode("drive");
  }

  teleport(x: number, z: number) {
    this.engineStats.teleportCount++;
    this.emit("teleport", { from: [this.px(), this.pz()], to: [x, z] });
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
    this.setMode("drive");
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
    if (s.placed.length >= this.config.maxProps) {
      s.setHud({ notice: `Limite ${this.config.maxProps} objets` });
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
    const src = id ? useGameStore.getState().placed.find((p: any) => p.id === id) : undefined;
    if (!src) return "Rien à copier.";
    const s = useGameStore.getState();
    if (s.placed.length >= this.config.maxProps) return `Limite ${this.config.maxProps} objets`;
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
    const inmate = (prisonSystem as any).book?.(name, chargesForStars(Math.max(2, (police as any).stars ?? 2))) ?? {
      booking: `BK-${Date.now().toString(36)}`,
      minutes: 30,
    };
    this.goPrison();
    useGameStore.getState().setHud({
      notice: `Écroué ${inmate.booking} · ${inmate.minutes} min`,
    });
    return `${inmate.booking} · cellule A-1-04 · ${inmate.minutes} min`;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STATS & HEALTH & CONFIG
  // ═════════════════════════════════════════════════════════════════════════

  public getStats(): EngineStats & {
    fps: number;
    dpr: number;
    mode: PlayMode;
    activeInterior: string | null;
    propsCount: number;
    remotesCount: number;
    listenersCount: number;
    isDisposed: boolean;
  } {
    return {
      ...this.engineStats,
      fps: Math.round(this.fpsEma),
      dpr: Math.round(this.dprNow * 100) / 100,
      mode: this.mode,
      activeInterior: this.activeInterior?.kind ?? null,
      propsCount: this.props.group.children.length,
      remotesCount: this.remotes.group.children.length,
      listenersCount: this.listeners.size,
      isDisposed: this.disposed,
    };
  }

  public health(): { ok: boolean; reason?: string } {
    if (this.disposed) return { ok: false, reason: "disposed" };
    if (this.engineStats.avgTickMs > 20) return { ok: false, reason: "tick_too_slow" };
    if (this.engineStats.errorsCaught > 100) return { ok: false, reason: "too_many_errors" };
    if (this.fpsEma < 20) return { ok: false, reason: "low_fps" };
    return { ok: true };
  }

  public updateConfig(patch: Partial<PortneufEngineConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═════════════════════════════════════════════════════════════════════════

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
<<<<<<< HEAD

    try {
      this.stop();
      input.detach();
      this.timer.disconnect();

      if (this.pendingUnloadHandler) {
        window.removeEventListener("beforeunload", this.pendingUnloadHandler);
        this.pendingUnloadHandler = null;
      }
      window.removeEventListener("resize", this.onResize);

      try { persist(); } catch { /* noop */ }
      try { quebecFM.dispose(); } catch { /* noop */ }
      try { spatialAudio.dispose(); } catch { /* noop */ }
      try { physics.dispose(); } catch { /* noop */ }
      try { police.dispose(); } catch { /* noop */ }

      // Dispose interiors
      for (const room of Object.values(this.interiors)) {
        room.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            const mat = m.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat.dispose();
          }
        });
        this.scene.remove(room.group);
      }

      // Dispose props
      try {
        this.props.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            const mat = m.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat.dispose();
          }
        });
        this.scene.remove(this.props.group);
      } catch { /* noop */ }

      // Dispose caddie
      if (this.caddie) {
        this.scene.remove(this.caddie);
        this.caddie.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            const mat = m.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat.dispose();
          }
        });
        this.caddie = null;
      }

      try { this.world.dispose(); } catch { /* noop */ }
      try { this.remotes.dispose(); } catch { /* noop */ }
      try { tex.dispose(); } catch { /* noop */ }
      try { this.renderer.dispose(); } catch { /* noop */ }

      this.listeners.clear();
      (window as any).__controlsTest = undefined;

      this.emit("dispose");
    } catch (err) {
      this.engineStats.errorsCaught++;
      console.error("[PortneufEngine] Dispose error:", err);
    }
=======
    this.stop();
    input.detach();
    this.timer.disconnect();
    window.removeEventListener("resize", this.onResize);
    persist();
    quebecFM.dispose();
    spatialAudio.dispose();
    physics.dispose();
    police.dispose();
    this.world.dispose();
    this.remotes.dispose();
    tex.dispose();
    this.renderer.dispose();
    delete window.__controlsTest;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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
    __rpNet?: typeof rpNet;
    __physics?: typeof physics;
  }
}