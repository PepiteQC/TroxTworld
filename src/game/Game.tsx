/**
 * Coque du comté — HUD, carte, pause, commerce, tactile.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Briefcase,
  Car,
  CloudFog,
  CloudLightning,
  CloudRain,
  Compass,
  DoorOpen,
  Droplets,
  Eye,
  Flame,
  Footprints,
  Gauge,
  Hammer,
  Hand,
  Handshake,
  KeyRound,
  Leaf,
  Map as MapIcon,
  MessageSquare,
  Moon,
  Music2,
  Pause,
  Play,
  Pointer,
  Radio,
  RotateCcw,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Snowflake,
  Sprout,
  Star,
  Sun,
  Terminal,
  Truck,
  User,
  Users,
  Video,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { AdminBar } from "./AdminBar";
import { BuilderOverlay } from "./buildui";
import { ChatOverlay, RpNetBridge } from "./chat";
import {
  bagCapacity,
  bagWeight,
  cartCount,
  cartTotals,
  catalogFor,
  formatCad,
  itemById,
  sellPrice,
  LANDMARK_SHOPS,
  type ShopItem,
} from "./commerce";
import { CreatorOverlay } from "./creator";
import { catalogForAisle, depMapMarks } from "./depanneur";
import { catalogForCasseAisle } from "./casse";
import { catalogForSqdcAisle } from "./sqdc";
import { ElevatorOverlay } from "./elevator";
import type { PortneufEngine } from "./engine";
import { CROPS, farmMapMarks, type CropId } from "./farms";
import { FirmOverlay } from "./firm";
// CORRECTION: JobsOverlay vient de ./JobsOverlay, pas ./haul
import { JobsOverlay } from "./JobsOverlay";
import { input } from "./input";
import { IntellectusOverlay, startIntellectusHeartbeat } from "./IntellectusOverlay";
import { GarageOverlay, InventoryOverlay } from "./inventory";
import { CartOverlay } from "./panier";
import { LockOverlay, PhoneOverlay } from "./phone";
import { ProductThumb } from "./productThumb";
import { quebecFM } from "./radio";
import { spatialAudio } from "./audio3d";
import { COMMERCIALS, ownedIds } from "./realestate";
import { AtmOverlay, DeedOverlay } from "./rpui";
import { persist, useGameStore, CAMERA_LABEL, type CameraMode } from "./store";
import { RP_GESTURES, type RpGesture } from "./gestures";
import { getRoleBadgeStyle, AdminRole } from "./adminPerms";
import { sugarMapMarks } from "./sugar";
import { survivalLabel } from "./survival";
import { CONDITION_LABEL, PLOW_STATUS_LABEL, SEASON_LABEL, type QuebecSeason, type SnowPlowStatus, type WeatherCondition } from "./seasons";
import type { ChatMessageState } from "./rpSchema";
import {
  A40_EXITS,
  INDUSTRY_LABEL,
  LAKES,
  MAPLE_LEAVES,
  POIS,
  ROADS,
  SPAWN,
  VILLAGES,
  WORLD,
  getVillageAt,
  getWorldStats,
} from "./worlddata";
import { DEEDS } from "./rp";
import { rpNet } from "./net";

export function PortneufApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PortneufEngine | null>(null);
  const playing = useGameStore((s) => s.playing);
  const paused = useGameStore((s) => s.paused);
  const loading = useGameStore((s) => s.loading);
  const showMap = useGameStore((s) => s.showMap);
  const shopOpen = useGameStore((s) => s.shopOpen);
  const phoneOpen = useGameStore((s) => s.phoneOpen);
  const lockOpen = useGameStore((s) => s.lockOpen);
  const consoleOpen = useGameStore((s) => s.consoleOpen);
  const intelOpen = useGameStore((s) => s.intelOpen);
  const citationOpen = useGameStore((s) => s.citationOpen);
  const creatorOpen = useGameStore((s) => s.creatorOpen);
  const inventoryOpen = useGameStore((s) => s.inventoryOpen);
  const garageOpen = useGameStore((s) => s.garageOpen);
  const jobsOpen = useGameStore((s) => s.jobsOpen);
  const firmOpen = useGameStore((s) => s.firmOpen);
  const cartOpen = useGameStore((s) => s.cartOpen);
  const atmOpen = useGameStore((s) => s.atmOpen);
  const propertyOpen = useGameStore((s) => s.propertyOpen);
  const elevatorOpen = useGameStore((s) => s.elevatorOpen);
  const chatOpen = useGameStore((s) => s.chatOpen);
  const buildOpen = useGameStore((s) => s.buildOpen);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const qa = new URLSearchParams(window.location.search).get("qa") === "1";
    if (qa) {
      useGameStore.getState().setHud({
        x: SPAWN.x,
        z: SPAWN.z,
        yaw: SPAWN.yaw,
        night: false,
        paused: false,
      });
    }
    let cancelled = false;
    void import("./engine").then(({ PortneufEngine }) => {
      if (cancelled || !canvasRef.current) return;
      try {
        const engine = new PortneufEngine(canvasRef.current);
        engineRef.current = engine;
        window.__portneuf = engine;
        window.__store = useGameStore;
        engine.start();
        if (qa) useGameStore.getState().start();
      } catch (err) {
        useGameStore.getState().setHud({ loading: false });
        setBootError(err instanceof Error ? err.message : "Le moteur 3D a échoué.");
      }
    }).catch((err) => {
      useGameStore.getState().setHud({ loading: false });
      setBootError(err instanceof Error ? err.message : "Impossible de charger le moteur 3D.");
    });
    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onHide = () => persist();
    window.addEventListener("beforeunload", onHide);
    return () => window.removeEventListener("beforeunload", onHide);
  }, []);

  useEffect(() => {
    const id = startIntellectusHeartbeat();
    return () => window.clearInterval(id);
  }, []);

  const overlayOpen =
    showMap ||
    shopOpen ||
    phoneOpen ||
    lockOpen ||
    consoleOpen ||
    intelOpen ||
    citationOpen ||
    creatorOpen ||
    inventoryOpen ||
    garageOpen ||
    jobsOpen ||
    firmOpen ||
    cartOpen ||
    atmOpen ||
    propertyOpen ||
    elevatorOpen ||
    chatOpen ||
    buildOpen;

  return (
    <div className="game-root">
      <canvas ref={canvasRef} />
      <Hud />
      <TouchPad />
      {!playing && <StartScreen loading={loading} error={bootError} />}
      {playing && paused && !overlayOpen && <PauseMenu engine={engineRef.current} />}
      {playing && showMap && <MapOverlay engine={engineRef.current} />}
      {playing && shopOpen && <ShopOverlay />}
      {playing && phoneOpen && <PhoneOverlay />}
      {playing && lockOpen && <LockOverlay onGranted={() => engineRef.current?.enterPendingInterior()} />}
      {playing && consoleOpen && <AdminBar engine={engineRef.current} />}
      {playing && intelOpen && <IntellectusOverlay engine={engineRef.current} />}
      {playing && citationOpen && <CitationOverlay />}
      {playing && creatorOpen && <CreatorOverlay engine={engineRef.current} />}
      {playing && inventoryOpen && <InventoryOverlay engine={engineRef.current} />}
      {playing && garageOpen && <GarageOverlay engine={engineRef.current} />}
      {playing && jobsOpen && <JobsOverlay />}
      {playing && firmOpen && <FirmOverlay />}
      {playing && cartOpen && <CartOverlay />}
      {playing && atmOpen && <AtmOverlay />}
      {playing && propertyOpen && <DeedOverlay engine={engineRef.current} />}
      {playing && elevatorOpen && <ElevatorOverlay onFloor={(id) => engineRef.current?.showFloor(id)} />}
      {playing && buildOpen && <BuilderOverlay engine={engineRef.current} />}
      {playing && <RpNetBridge />}
      {playing && chatOpen && <ChatOverlay />}
    </div>
  );
}

function StartScreen({ loading, error }: { loading: boolean; error: string | null }) {
  const boot = (openCreator: boolean) => {
    useGameStore.getState().start();
    if (openCreator) useGameStore.getState().openCreator();
    void spatialAudio.unlock();
    void quebecFM.ensure().then(() => {
      const s = useGameStore.getState();
      if (s.radioOn && s.radioId) quebecFM.setStation(s.radioId);
    });
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end bg-linear-to-t from-bg via-bg/80 to-transparent px-6 pb-16 pt-10 sm:justify-center sm:pb-0">
      <div className="max-w-xl text-center">
        <p className="text-xs tracking-[0.35em] text-accent uppercase">Comté de Portneuf</p>
        <h1 className="mt-3 font-display text-6xl italic leading-none text-fg sm:text-7xl">Portneuf</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Le Chemin du Roy, l'A-40 Félix-Leclerc et ses sorties 250 à 285, les rangs laitiers, l'éboulis de 1894 et les
          lacs des Laurentides. Prenez la 138, l'entrée d'autoroute, descendez du pick-up, entrez au dépanneur. Hôtel :
          NIP 1234. Caisse populaire — GAB, prêts, placements. MLS Portneuf — maisons, locaux, entrepôts.
        </p>
        {error ? (
          <p className="mt-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={loading}
              aria-label="Start"
              onClick={() => boot(false)}
              className="inline-flex h-12 min-w-52 items-center justify-center rounded-lg bg-fg px-8 text-sm font-medium text-accent-fg transition-transform duration-150 hover:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Chargement du comté…" : "Prendre la route"}
              <span className="sr-only">Start</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => boot(true)}
              className="inline-flex h-12 min-w-52 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-8 text-sm font-medium text-fg disabled:opacity-50"
            >
              <User className="size-4" />
              Personnage
            </button>
          </div>
        )}
        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-1 text-left text-xs text-subtle sm:grid-cols-2">
          <li>W / Z — accélérer · marcher</li>
          <li>S — freiner · reculer</li>
          <li>A / D — diriger</li>
          <li>Espace — frein à main</li>
          <li>Maj — turbo · courir</li>
          <li>E — descendre / dépanneur / hôtel / gibier</li>
          <li>T — parler (RP local, /me, /do)</li>
          <li>C — caméra · N — nuit</li>
          <li>M — carte · P — téléphone</li>
          <li>R — radio FM</li>
          <li>H — gyrophare SQ</li>
          <li>F1 — console · Échap — pause</li>
          <li>Personnage — tenue, halo, nom</li>
          <li>I — sac · G — garage</li>
          <li>Outils — chantier, foin, bois</li>
          <li>Champs, vaches, érablières — E</li>
          <li>Maisons vides, rénos, clés — E</li>
          <li>Dépanneur — entrer, rayons, caisse</li>
          <li>Secteurs — asphalte, gravelle, rangs, forêt</li>
          <li>J — contrats de transport</li>
          <li>K — entreprise, NEQ, permis</li>
          <li>G — flotte commerciale Gosselin</li>
          <li>Sac à dos — Boutique Éther</li>
          <li>Charge — sac gonfle, démarche plus lourde</li>
          <li>MLS — actes, loyers, locaux</li>
        </ul>
      </div>
    </div>
  );
}

function weatherGlyph(c: WeatherCondition) {
  if (c === "ensoleille") return Sun;
  if (c === "pluie_fine") return CloudRain;
  if (c === "orage_ete" || c === "tempete_neige") return CloudLightning;
  if (c === "nuageux") return CloudFog;
  return Snowflake;
}

function Hud() {
  const playing = useGameStore((s) => s.playing);
  const speed = useGameStore((s) => s.speedKmh);
  const limit = useGameStore((s) => s.limit);
  const zone = useGameStore((s) => s.zone);
  const surface = useGameStore((s) => s.surface);
  const speeding = useGameStore((s) => s.speeding);
  const fineFlash = useGameStore((s) => s.fineFlash);
  const policeEta = useGameStore((s) => s.policeEta);
  const safeZone = useGameStore((s) => s.safeZone);
  const night = useGameStore((s) => s.night);
  const poi = useGameStore((s) => s.poi);
  const poiDesc = useGameStore((s) => s.poiDesc);
  const yaw = useGameStore((s) => s.yaw);
  const timeHours = useGameStore((s) => s.timeHours);
  const mode = useGameStore((s) => s.mode);
  const prompt = useGameStore((s) => s.prompt);
  const leaves = useGameStore((s) => s.leaves);
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const notice = useGameStore((s) => s.notice);
  const shopOpen = useGameStore((s) => s.shopOpen);
  const fauna = useGameStore((s) => s.fauna);
  const chat = useGameStore((s) => s.chat);
  const flyMode = useGameStore((s) => s.flyMode);
  const wantedStars = useGameStore((s) => s.wantedStars);
  const wantedReason = useGameStore((s) => s.wantedReason);
  const bounty = useGameStore((s) => s.bounty);
  const evading = useGameStore((s) => s.evading);
  const activeGig = useGameStore((s) => s.activeGig);
  const radioOn = useGameStore((s) => s.radioOn);
  const radioTrack = useGameStore((s) => s.radioTrack);
  const radioId = useGameStore((s) => s.radioId);
  const dispatch = useGameStore((s) => s.dispatch);
  const citationOpen = useGameStore((s) => s.citationOpen);
  const playerName = useGameStore((s) => s.appearance.name);
  const creatorOpen = useGameStore((s) => s.creatorOpen);
  const inventoryOpen = useGameStore((s) => s.inventoryOpen);
  const garageOpen = useGameStore((s) => s.garageOpen);
  const jobsOpen = useGameStore((s) => s.jobsOpen);
  const firmOpen = useGameStore((s) => s.firmOpen);
  const cartOpen = useGameStore((s) => s.cartOpen);
  const cart = useGameStore((s) => s.cart);
  const haul = useGameStore((s) => s.job);
  const hx = useGameStore((s) => s.x);
  const hz = useGameStore((s) => s.z);
  const inventory = useGameStore((s) => s.inventory);
  const pack = useGameStore((s) => s.equippedPack);
  const selectedSeed = useGameStore((s) => s.selectedSeed);
  const ownedProps = useGameStore((s) => s.ownedProps);
  const realty = useGameStore((s) => s.realty);
  const firm = useGameStore((s) => s.firm);
  const surv = useGameStore((s) => s.surv);
  const gridOutage = useGameStore((s) => s.gridOutage);
  const houses = useGameStore((s) => s.houses);
  const deedId = useGameStore((s) => s.deedId);
  const interiorKind = useGameStore((s) => s.interiorKind);
  const netPeers = useGameStore((s) => s.netPeers);
  const riskLevel = useGameStore((s) => s.riskLevel);
  const chatOpen = useGameStore((s) => s.chatOpen);
  const season = useGameStore((s) => s.season);
  const wxCondition = useGameStore((s) => s.wxCondition);
  const wxTemp = useGameStore((s) => s.wxTemp);
  const snowCm = useGameStore((s) => s.snowCm);
  const plowStatus = useGameStore((s) => s.plowStatus);
  const eventBanner = useGameStore((s) => s.eventBanner);
  const eventSeverity = useGameStore((s) => s.eventSeverity);
  const vanished = useGameStore((s) => s.vanished);
  const staffFrozen = useGameStore((s) => s.staffFrozen);
  const adminRole = useGameStore((s) => s.adminRole);
  const sirenMode = useGameStore((s) => s.sirenMode);
  const gestureOpen = useGameStore((s) => s.gestureOpen);
  const cameraMode = useGameStore((s) => s.cameraMode) as CameraMode;
  const gesture = useGameStore((s) => s.gesture) as RpGesture;
  const bloodAlcohol = useGameStore((s) => s.bloodAlcohol) ?? 0;
  const radarActive = useGameStore((s) => s.radarActive);
  const demeritPoints = useGameStore((s) => s.demeritPoints) ?? 0;
  const licenseSuspendedUntil = useGameStore((s) => s.licenseSuspendedUntil) ?? 0;

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => useGameStore.getState().setHud({ notice: null }), 2400);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!playing || creatorOpen || inventoryOpen || garageOpen || jobsOpen || firmOpen || cartOpen) return null;

  const hh = Math.floor(timeHours);
  const mm = Math.floor((timeHours % 1) * 60);
  const onFoot = mode !== "drive";
  const loadKg = bagWeight(inventory);
  const loadCap = bagCapacity(pack);
  const loadFill = loadCap > 0 ? loadKg / loadCap : 0;
  const here = getVillageAt(hx, hz);
  const holdings = ownedIds(ownedProps, realty);
  // CORRECTION: Cast de selectedSeed en CropId pour l'indexation de CROPS
  const crop = selectedSeed ? CROPS[selectedSeed as CropId] : null;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute top-4 right-4 left-4 flex items-start justify-between gap-3">
          <div className="hud-panel max-w-[70%] rounded-lg px-3 py-2 sm:max-w-sm">
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">
              {mode === "interior" ? "Intérieur" : "Secteur"}
            </p>
            <p className="font-display text-xl italic leading-tight text-fg">{zone}</p>
            <p className="mt-0.5 text-xs text-muted">
              {playerName} · {surface}
              {firm?.isOpen ? ` · ${firm.tradeName} ouvert` : ""}
            </p>
            {adminRole && adminRole !== AdminRole.NONE && (
              <p className={`mt-0.5 text-[10px] tracking-[0.16em] uppercase ${getRoleBadgeStyle(adminRole).color}`}>
                {getRoleBadgeStyle(adminRole).label}
              </p>
            )}
            {mode !== "interior" && (
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle">
                <Gauge className="size-3" />
                {limit > 0 ? `${limit} km/h` : "—"}
                {policeEta > 0 ? ` · SQ ${Math.max(1, Math.round(policeEta / 60))} min` : ""}
                {safeZone ? " · parvis" : ""}
              </p>
            )}
            {here && (
              <p className="mt-0.5 text-[11px] text-subtle">
                {here.motto} · {INDUSTRY_LABEL[here.industry]} · {here.founded}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
              {night ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
              <span className="hud-num">
                {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}
              </span>
              {timeHours >= 5.2 && timeHours < 7.6 ? (
                <span className="text-subtle">aube</span>
              ) : timeHours >= 17.4 && timeHours < 21.2 ? (
                <span className="text-subtle">crépuscule</span>
              ) : null}
            </div>
            <div className="hud-panel flex max-w-[11.5rem] flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
              <p className="flex items-center gap-1.5">
                {(() => {
                  const Icon = weatherGlyph(wxCondition as WeatherCondition);
                  return <Icon className="size-3.5 text-accent" />;
                })()}
                <span className="text-fg">{SEASON_LABEL[season as QuebecSeason]}</span>
                <span className="hud-num text-fg">{Math.round(wxTemp)}°</span>
              </p>
              <p className="truncate text-[11px] text-subtle">
                {CONDITION_LABEL[wxCondition as WeatherCondition]}
                {snowCm >= 1 ? ` · ${Math.round(snowCm)} cm` : ""}
              </p>
              {plowStatus !== "idle" && (
                <p className="truncate text-[10px] text-accent">{PLOW_STATUS_LABEL[plowStatus as SnowPlowStatus]}</p>
              )}
            </div>
            {(radarActive || bloodAlcohol > 8 || licenseSuspendedUntil > Date.now() || demeritPoints > 0) && (
              <div className="hud-panel flex max-w-[11.5rem] flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <p className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-accent" />
                  <span className="text-fg">SQ Portneuf</span>
                </p>
                {radarActive && <p className="text-[11px] text-accent">Radar photo · 138 / A-40</p>}
                {bloodAlcohol > 8 && (
                  <p className={`text-[11px] ${bloodAlcohol >= 80 ? "text-danger" : "text-clay"}`}>
                    Alcoolémie {Math.round(bloodAlcohol)} mg
                  </p>
                )}
                {demeritPoints > 0 && (
                  <p className="text-[11px] text-subtle">{demeritPoints} pts SAAQ</p>
                )}
                {licenseSuspendedUntil > Date.now() && (
                  <p className="text-[11px] text-danger">
                    Permis suspendu · {Math.max(1, Math.ceil((licenseSuspendedUntil - Date.now()) / 86400000))} j
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              className="pointer-events-auto hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted"
              onClick={() => window.__portneuf?.cycleCamera()}
              aria-label="Mode caméra"
            >
              {cameraMode === "fps" ? <Eye className="size-3.5 text-accent" /> : <Video className="size-3.5 text-accent" />}
              <span className="text-fg">{CAMERA_LABEL[cameraMode] ?? "Épaule"}</span>
              <span className="text-subtle">V</span>
            </button>
            <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
              <Wallet className="size-3.5 text-accent" />
              <span className="hud-num text-fg">{formatCad(cash)}</span>
              <span className="text-subtle">·</span>
              <span className="hud-num">{formatCad(bank)}</span>
            </div>
            {cartCount(cart) > 0 && (
              <button
                type="button"
                className="pointer-events-auto hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted"
                onClick={() => useGameStore.getState().openCart()}
              >
                <ShoppingCart className="size-3.5 text-accent" />
                <span className="hud-num text-fg">{cartCount(cart)}</span>
              </button>
            )}
            <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
              <Leaf className="size-3.5 text-ok" />
              <span className="hud-num text-fg">
                {leaves.length}/{MAPLE_LEAVES.length}
              </span>
            </div>
            {crop && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <Sprout className={`size-3.5 ${crop.illegal ? "text-danger" : "text-ok"}`} />
                <span className="text-fg">{crop.label}</span>
              </div>
            )}
            {holdings.length > 0 && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <KeyRound className="size-3.5 text-accent" />
                <span className="text-fg">
                  {holdings.length} bien{holdings.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {gridOutage && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-danger">
                <Zap className="size-3.5" />
                <span>{gridOutage.kind === "verglas" ? "Verglas" : "Panne Hydro"}</span>
              </div>
            )}
            <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
              <Users className="size-3.5 text-accent" />
              <span className="hud-num text-fg">{netPeers + 1}</span>
              <span className="text-subtle">rang</span>
            </div>
            <div
              className={`hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${
                riskLevel === "RED" || riskLevel === "ORANGE"
                  ? "text-danger"
                  : riskLevel === "YELLOW"
                    ? "text-accent"
                    : "text-ok"
              }`}
            >
              <Shield className="size-3.5" />
              <span className="hud-num">{riskLevel}</span>
            </div>
            {mode === "interior" && interiorKind === "home" && deedId && houses[deedId] && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <Flame className={`size-3.5 ${houses[deedId].heatOn ? "text-accent" : "text-subtle"}`} />
                <span className="hud-num text-fg">{Math.round(houses[deedId].indoorC)}°</span>
              </div>
            )}
            {mode === "interior" && interiorKind === "depanneur" && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <ShoppingBag className="size-3.5 text-accent" />
                <span className="text-fg">Dépanneur</span>
              </div>
            )}
            {(inventory.eau_erable ?? 0) > 0 && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <Droplets className="size-3.5 text-accent" />
                <span className="hud-num text-fg">{inventory.eau_erable}</span>
                <span className="text-subtle">sève</span>
              </div>
            )}
            {onFoot && (
              <div className="hud-panel w-[7.5rem] rounded-lg px-2.5 py-1.5">
                <p className={`hud-num text-[10px] ${loadFill > 1 ? "text-danger" : "text-muted"}`}>
                  {Number(loadKg || 0).toFixed(1)}/{loadCap} kg
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full ${loadFill > 1 ? "bg-danger" : loadFill > 0.8 ? "bg-accent" : "bg-ok"}`}
                    style={{ width: `${Math.min(100, loadFill * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="hud-panel w-[7.5rem] rounded-lg px-2.5 py-1.5">
              <p className="hud-num text-[10px] text-muted">
                {Number(surv.bodyTemp || 0).toFixed(1)} °C · {Math.round(surv.felt)}° air
              </p>
              <div className="mt-1 space-y-0.5">
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full ${surv.hunger < 20 ? "bg-danger" : "bg-ok"}`} style={{ width: `${surv.hunger}%` }} />
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full ${surv.thirst < 20 ? "bg-danger" : "bg-accent"}`} style={{ width: `${surv.thirst}%` }} />
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full ${surv.bodyTemp < 35 ? "bg-danger" : surv.bodyTemp > 38.5 ? "bg-accent" : "bg-ok"}`}
                    style={{ width: `${Math.min(100, Math.max(0, (surv.bodyTemp - 32) * 12.5))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {haul && !citationOpen && (
          <div className="absolute top-[4.6rem] left-4 z-10 sm:top-24">
            <div className="hud-panel max-w-[16rem] rounded-lg px-3 py-2">
              <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">{haul.title}</p>
              <p className="text-sm text-fg">
                {haul.loaded ? "Livrer" : "Charger"} · {haul.loaded ? haul.to.name : haul.from.name}
              </p>
              <p className="hud-num text-[11px] text-muted">
                {Math.round(Math.hypot(hx - (haul.loaded ? haul.to.x : haul.from.x), hz - (haul.loaded ? haul.to.z : haul.from.z)))} m · {haul.pay}&nbsp;$
              </p>
            </div>
          </div>
        )}

        {eventBanner && !shopOpen && !citationOpen && (
          <div className="absolute top-[4.5rem] left-1/2 z-10 w-[min(92%,22rem)] -translate-x-1/2 sm:top-24">
            <div
              className={`hud-panel rounded-lg px-3 py-2 text-center ${
                eventSeverity === "catastrophe"
                  ? "border-danger"
                  : eventSeverity === "majeur"
                    ? "border-clay"
                    : ""
              }`}
            >
              <p className="text-[10px] tracking-[0.18em] text-subtle uppercase">
                {eventSeverity === "catastrophe" ? "Catastrophe" : eventSeverity === "majeur" ? "Alerte" : "Avis"}
              </p>
              <p
                className={`text-sm leading-snug ${
                  eventSeverity === "catastrophe" ? "text-danger" : eventSeverity === "majeur" ? "text-clay" : "text-fg"
                }`}
              >
                {eventBanner}
              </p>
            </div>
          </div>
        )}

        {wantedStars > 0 && !shopOpen && !citationOpen && (
          <div className={`absolute left-1/2 z-10 -translate-x-1/2 ${eventBanner ? "top-40 sm:top-44" : "top-20"}`}>
            <div className="hud-panel rounded-lg px-3 py-1.5 text-center sm:px-4 sm:py-2">
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`size-3.5 sm:size-4 ${i < wantedStars ? "fill-danger text-danger" : "text-subtle"}`} />
                ))}
              </div>
              <p className="mt-1 hidden text-[11px] text-fg sm:block">
                {evading ? "Fuite en cours" : "Poursuite SQ"} · {wantedReason}
              </p>
              <p className="hidden text-[10px] text-subtle sm:block">Prime {bounty}&nbsp;$</p>
              {dispatch && <p className="mt-0.5 hidden max-w-xs truncate text-[10px] text-accent sm:block">{dispatch}</p>}
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          {activeGig && !citationOpen && (
            <div className="hud-panel w-56 rounded-lg px-3 py-2">
              <p className="text-[10px] tracking-[0.16em] text-subtle uppercase">{activeGig.title}</p>
              <p className="truncate text-xs text-fg">{activeGig.steps[activeGig.currentStep]?.description ?? "En cours"}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-ok" style={{ width: `${Math.round(activeGig.progress * 100)}%` }} />
              </div>
            </div>
          )}
          {prompt && !citationOpen && (
            <div className="hud-panel flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg">
              {onFoot ? <DoorOpen className="size-4 text-accent" /> : <Footprints className="size-4 text-accent" />}
              <span>{prompt}</span>
            </div>
          )}
          {!citationOpen && (
            <div className={`hud-panel rounded-xl px-6 py-3 text-center ${speeding ? "border-danger text-danger" : ""}`}>
              <p className="hud-num font-display text-5xl leading-none tabular-nums">{Math.round(speed)}</p>
              <p className="mt-1 text-[10px] tracking-[0.25em] text-muted uppercase">
                {onFoot ? "km/h à pied" : limit > 0 ? `km/h · max ${limit}` : "km/h"}
              </p>
            </div>
          )}
        </div>

        <div className="absolute right-4 bottom-6 hidden sm:block">
          <MiniMap />
        </div>

        <div className="absolute bottom-6 left-4 flex items-center gap-2">
          <div className="hud-panel flex size-12 items-center justify-center rounded-full">
            <Compass className="size-6 text-accent" style={{ transform: `rotate(${(-yaw * 180) / Math.PI}deg)` }} />
          </div>
          <button
            type="button"
            className="pointer-events-auto hud-panel flex size-12 items-center justify-center rounded-full"
            onClick={() => useGameStore.getState().openPhone()}
            aria-label="Téléphone"
          >
            <Smartphone className="size-5 text-accent" />
          </button>
          <button
            type="button"
            className="pointer-events-auto hud-panel flex size-12 items-center justify-center rounded-full"
            onClick={() => useGameStore.getState().toggleGesture()}
            aria-label="Gestes RP"
          >
            <Hand className="size-5 text-accent" />
          </button>
          <button
            type="button"
            className="pointer-events-auto hud-panel flex size-12 items-center justify-center rounded-full"
            onClick={() => {
              const s = useGameStore.getState();
              if (s.chatOpen) s.closeChat();
              else s.openChat();
            }}
            aria-label="Parler"
          >
            <MessageSquare className="size-5 text-accent" />
          </button>
          {radioOn && (
            <div className="hud-panel hidden max-w-48 rounded-lg px-3 py-2 sm:block">
              <p className="flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-subtle uppercase">
                <Radio className="size-3 text-accent" />
                {radioId}
              </p>
              <p className="truncate text-xs text-fg">{radioTrack ?? "Québec-FM"}</p>
            </div>
          )}
        </div>
      </div>

      {/* CORRECTION: Utilisation de m.type et m.senderId au lieu de m.kind et m.sender */}
      {chat.length > 0 && !chatOpen && (
        <div className="pointer-events-none absolute bottom-24 left-4 z-20 flex max-w-sm flex-col gap-1">
          {chat.slice(-5).map((m: ChatMessageState) => (
            <div key={m.id} className="hud-panel rounded-md px-3 py-1.5 text-xs">
              <span
  className={
    ((m as typeof m & {
      type?: "admin" | "system" | string;
    }).type === "admin")
      ? "text-accent"
      : ((m as typeof m & {
          type?: "admin" | "system" | string;
        }).type === "system")
        ? "text-subtle"
        : "text-fg"
  }
>
                {m.senderId}
              </span>
              <span className="text-muted"> · {m.text}</span>
            </div>
          ))}
        </div>
      )}

      {flyMode && (
        <div className="pointer-events-none absolute top-20 right-4 z-20">
          <div className="hud-panel rounded-md px-3 py-1 text-[10px] tracking-[0.16em] text-accent uppercase">Vol</div>
        </div>
      )}
      {vanished && (
        <div className="pointer-events-none absolute top-28 right-4 z-20">
          <div className="hud-panel rounded-md px-3 py-1 text-[10px] tracking-[0.16em] text-accent uppercase">Invisible</div>
        </div>
      )}
      {staffFrozen && (
        <div className="pointer-events-none absolute top-36 right-4 z-20">
          <div className="hud-panel rounded-md px-3 py-1 text-[10px] tracking-[0.16em] text-danger uppercase">Gelé</div>
        </div>
      )}
      {sirenMode && sirenMode !== "off" && (
        <div className="pointer-events-none absolute top-20 left-4 z-20">
          <div className="hud-panel rounded-md px-3 py-1 text-[10px] tracking-[0.16em] text-accent uppercase">
            {sirenMode === "code3_emergency" ? "Code 3" : sirenMode === "code2_visual" ? "Code 2" : "Code 1"}
          </div>
        </div>
      )}
      {gesture && gesture !== "none" && (
        <div className={`pointer-events-none absolute left-4 z-20 ${sirenMode && sirenMode !== "off" ? "top-28" : "top-20"}`}>
          <div className="hud-panel rounded-md px-3 py-1 text-[10px] tracking-[0.16em] text-accent uppercase">
            {RP_GESTURES.find((g) => g.id === gesture)?.label ?? gesture}
          </div>
        </div>
      )}

      {fauna && !prompt && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center">
          <div className="hud-panel rounded-md px-4 py-2 text-sm text-fg">{fauna}</div>
        </div>
      )}

      {notice && !shopOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
          <div className="hud-panel rounded-md px-4 py-2 text-sm text-fg">{notice}</div>
        </div>
      )}

      {!notice && surv.advice && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
          <div className="hud-panel rounded-md px-4 py-2 text-sm text-fg">
            {surv.alerts[0] ? survivalLabel(surv.alerts[0]) : "Survie"} · {surv.advice}
          </div>
        </div>
      )}

      {fineFlash > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
          <div className="rounded-md border border-danger bg-danger/20 px-4 py-2 text-sm text-fg">
            Radar · {fineFlash}&nbsp;$ · limite {limit} km/h
          </div>
        </div>
      )}

      {poi && mode === "drive" && !prompt && (
        <div className="pointer-events-none absolute bottom-36 left-1/2 z-10 w-[min(90%,22rem)] -translate-x-1/2">
          <div className="hud-panel rounded-lg px-4 py-3 text-center">
            <p className="font-display text-lg italic">{poi}</p>
            {poiDesc && <p className="mt-1 text-xs leading-relaxed text-muted">{poiDesc}</p>}
          </div>
        </div>
      )}
      {gestureOpen && <GestureWheel current={gesture} />}
    </>
  );
}

function paintCounty(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: {
    x: number;
    z: number;
    yaw: number;
    owned: string[];
    haul: { loaded: boolean; to: { x: number; z: number }; from: { x: number; z: number } } | null;
    wantedStars: number;
    labels: boolean;
    playerDot: "arrow" | "ring";
  },
) {
  const sx = (px: number) => ((px - WORLD.minX) / WORLD.width) * w;
  const sy = (pz: number) => ((pz - WORLD.minZ) / WORLD.depth) * h;
  ctx.fillStyle = opts.labels ? "#121a16" : "#141c18";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = opts.labels ? "#1c3a52" : "#2a4a68";
  ctx.fillRect(0, sy(96), w, h);
  for (const f of farmMapMarks()) {
    ctx.save();
    ctx.translate(sx(f.x), sy(f.z));
    ctx.rotate(-f.yaw);
    const rw = (f.w / WORLD.width) * w;
    const rh = (f.d / WORLD.depth) * h;
    ctx.fillStyle = f.illegal ? (opts.labels ? "#2e4a2a" : "#3a5a32") : opts.labels ? "#4a6a32" : "#5a7a3a";
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.restore();
  }
  ctx.fillStyle = "#c45a28";
  const sugarR = opts.labels ? 4.5 : 3.2;
  for (const s of sugarMapMarks()) {
    ctx.beginPath();
    ctx.arc(sx(s.x), sy(s.z), sugarR, 0, Math.PI * 2);
    ctx.fill();
  }
  const deedSize = opts.labels ? 6 : 4;
  const deedOff = deedSize / 2;
  for (const d of DEEDS) {
    ctx.fillStyle = opts.owned.includes(d.id) ? "#c4a030" : opts.labels ? "#7a8078" : "#6a7068";
    ctx.fillRect(sx(d.x) - deedOff, sy(d.z) - deedOff, deedSize, deedSize);
  }
  for (const c of COMMERCIALS) {
    ctx.fillStyle = opts.owned.includes(c.id) ? "#c4a030" : "#5a7a9a";
    ctx.fillRect(sx(c.x) - deedOff, sy(c.z) - deedOff, deedSize, deedSize);
  }
  ctx.fillStyle = "#c03028";
  for (const s of depMapMarks()) ctx.fillRect(sx(s.x) - deedOff, sy(s.z) - deedOff, deedSize, deedSize);
  ctx.fillStyle = "#1A5632";
  for (const s of LANDMARK_SHOPS.filter((x) => x.kind === "sqdc")) {
    ctx.fillRect(sx(s.x) - deedOff, sy(s.z) - deedOff, deedSize, deedSize);
  }
  for (const road of ROADS) {
    if (road.kind === "highway") {
      ctx.strokeStyle = "#e8c84a";
      ctx.lineWidth = opts.labels ? 4 : 3.2;
    } else if (road.kind === "ramp") {
      ctx.strokeStyle = "#c4a030";
      ctx.lineWidth = opts.labels ? 1.4 : 1.1;
    } else if (road.kind === "regional") {
      ctx.strokeStyle = "#d8d0c0";
      ctx.lineWidth = opts.labels ? 2.6 : 2.2;
    } else {
      ctx.strokeStyle = opts.labels ? "#5a5a62" : "#4a4a52";
      ctx.lineWidth = opts.labels ? 1.6 : 1.4;
    }
    ctx.beginPath();
    road.points.forEach(([px, pz], i) => {
      i === 0 ? ctx.moveTo(sx(px), sy(pz)) : ctx.lineTo(sx(px), sy(pz));
    });
    ctx.stroke();
  }
  ctx.fillStyle = "#6a9a62";
  for (const v of VILLAGES) {
    ctx.beginPath();
    ctx.arc(sx(v.center[0]), sy(v.center[1]), opts.labels ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (opts.labels) {
      ctx.fillStyle = "#ece8de";
      ctx.font = "11px Outfit, sans-serif";
      ctx.fillText(v.name, sx(v.center[0]) + 8, sy(v.center[1]) + 4);
      ctx.fillStyle = "#6a9a62";
    }
  }
  if (!opts.labels) {
    ctx.fillStyle = "#1a4a60";
    for (const lake of LAKES) {
      ctx.beginPath();
      ctx.arc(sx(lake.x), sy(lake.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (opts.labels) {
    ctx.fillStyle = "#e8c84a";
    ctx.font = "bold 10px Outfit, sans-serif";
    for (const ex of A40_EXITS) ctx.fillText(ex.no, sx(ex.x) + 4, sy(-178) - 6);
  }
  if (opts.wantedStars > 0) {
    const traffic = window.__portneuf?.world.traffic;
    if (traffic) {
      ctx.fillStyle = "#3b82f6";
      for (const car of traffic) {
        if (!car.isPolice) continue;
        ctx.beginPath();
        ctx.arc(sx(car.mesh.position.x), sy(car.mesh.position.z), car.chasing ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (opts.haul) {
    const t = opts.haul.loaded ? opts.haul.to : opts.haul.from;
    ctx.fillStyle = "#e8c84a";
    ctx.beginPath();
    ctx.arc(sx(t.x), sy(t.z), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (opts.playerDot === "arrow") {
    ctx.fillStyle = "#ece8de";
    ctx.save();
    ctx.translate(sx(opts.x), sy(opts.z));
    ctx.rotate(-opts.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#e8c84a";
    for (const p of rpNet.remotes.values()) {
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.z), 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#c44a3a";
    ctx.beginPath();
    ctx.arc(sx(opts.x), sy(opts.z), 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function MiniMap() {
  const x = useGameStore((s) => s.x);
  const z = useGameStore((s) => s.z);
  const yaw = useGameStore((s) => s.yaw);
  const wantedStars = useGameStore((s) => s.wantedStars);
  const haul = useGameStore((s) => s.job);
  const ownedProps = useGameStore((s) => s.ownedProps);
  const realty = useGameStore((s) => s.realty);
  const netPeers = useGameStore((s) => s.netPeers);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintCounty(ctx, canvas.width, canvas.height, {
      x,
      z,
      yaw,
      owned: ownedIds(ownedProps, realty),
      haul,
      wantedStars,
      labels: false,
      playerDot: "arrow",
    });
  }, [x, z, yaw, wantedStars, haul, ownedProps, realty, netPeers]);

  return (
    <div className="hud-panel overflow-hidden rounded-lg p-1">
      <canvas ref={ref} width={148} height={110} className="block rounded-md" />
    </div>
  );
}

function PauseMenu({ engine }: { engine: PortneufEngine | null }) {
  const km = useGameStore((s) => s.km);
  const fines = useGameStore((s) => s.fines);
  const visited = useGameStore((s) => s.visited);
  const night = useGameStore((s) => s.night);
  const leaves = useGameStore((s) => s.leaves);
  const cash = useGameStore((s) => s.cash);
  const inventory = useGameStore((s) => s.inventory);
  const wantedStars = useGameStore((s) => s.wantedStars);
  
  // CORRECTION: Cast de inventory en Record<string, number> pour Object.entries
  const inventoryMap = inventory as Record<string, number>;
  const bag = Object.entries(inventoryMap).filter(([, n]) => Number(n) > 0);
  
  const stats = getWorldStats();

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/70 px-4 backdrop-blur-sm">
      <div className="hud-panel w-full max-w-md rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">Pause</p>
            <h2 className="font-display text-3xl italic">Portneuf</h2>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().togglePause()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          {formatCad(cash)} · {Number(km || 0).toFixed(1)} km · {visited.length}/{POIS.length} lieux · {leaves.length}/{MAPLE_LEAVES.length} érables · {fines}&nbsp;$ d'amendes
          {wantedStars > 0 ? ` · ${wantedStars}★ SQ` : ""}
        </p>
        <p className="mt-1 text-[11px] text-subtle">
          {stats.villages} villages · {stats.totalPopulation.toLocaleString("fr-CA")} habitants
        </p>
        {bag.length > 0 && (
          <p className="mt-2 text-xs text-subtle">
            Sac : {bag.map(([id, n]) => `${itemById(id)?.name ?? id} ×${n}`).join(" · ")}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <MenuBtn icon={<Play className="size-4" />} label="Reprendre" onClick={() => useGameStore.getState().togglePause()} />
          <MenuBtn
            icon={<MapIcon className="size-4" />}
            label="Carte"
            onClick={() => useGameStore.getState().setHud({ showMap: true, paused: true })}
          />
          <MenuBtn icon={night ? <Sun className="size-4" /> : <Moon className="size-4" />} label={night ? "Jour" : "Nuit"} onClick={() => engine?.toggleNight()} />
          <MenuBtn
            icon={<RotateCcw className="size-4" />}
            label="Respawn 138"
            onClick={() => {
              engine?.respawn();
              useGameStore.getState().togglePause();
            }}
          />
          <MenuBtn icon={<Smartphone className="size-4" />} label="Téléphone" onClick={() => useGameStore.getState().openPhone()} />
          <MenuBtn icon={<User className="size-4" />} label="Personnage" onClick={() => useGameStore.getState().openCreator()} />
          <MenuBtn icon={<ShoppingBag className="size-4" />} label="Sac" onClick={() => useGameStore.getState().openInventory()} />
          <MenuBtn icon={<Car className="size-4" />} label="Garage" onClick={() => useGameStore.getState().openGarage()} />
          <MenuBtn icon={<Truck className="size-4" />} label="Transport" onClick={() => useGameStore.getState().openJobs()} />
          <MenuBtn icon={<Briefcase className="size-4" />} label="Entreprise" onClick={() => useGameStore.getState().openFirm()} />
          <MenuBtn
            icon={<Hammer className="size-4" />}
            label="Builder"
            onClick={() => {
              useGameStore.getState().togglePause();
              useGameStore.getState().toggleBuild();
            }}
          />
          <MenuBtn icon={<Terminal className="size-4" />} label="Console" onClick={() => useGameStore.getState().openConsole()} />
          <MenuBtn
            icon={<Hand className="size-4" />}
            label="Gestes RP"
            onClick={() => {
              useGameStore.getState().togglePause();
              useGameStore.getState().openGesture();
            }}
          />
        </div>
        <p className="mt-3 text-center text-[11px] text-subtle">U gestes · V caméra · X se rendre · C capot</p>
        <MapList engine={engine} />
      </div>
    </div>
  );
}

function MenuBtn({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface-2 text-sm text-fg transition-colors hover:border-border-strong"
    >
      {icon}
      {label}
    </button>
  );
}

function MapList({ engine }: { engine: PortneufEngine | null }) {
  const visited = useGameStore((s) => s.visited);
  const shops = engine?.world.shops ?? [];
  return (
    <div className="mt-5">
      <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Aller à</p>
      <div className="mt-2 max-h-40 overflow-auto">
        {POIS.map((n) => (
          <button
            key={n.id}
            type="button"
            className="flex w-full items-center justify-between border-b border-border py-2 text-left text-sm text-fg last:border-0"
            onClick={() => {
              engine?.teleport(n.x, n.z - 18);
              useGameStore.getState().setHud({ paused: false, showMap: false });
            }}
          >
            <span>{n.name}</span>
            <span className="text-[10px] text-subtle">{visited.includes(n.id) ? "vu" : "nouveau"}</span>
          </button>
        ))}
        {shops.map((s) => (
          <button
            key={s.id}
            type="button"
            className="flex w-full items-center justify-between border-b border-border py-2 text-left text-sm text-fg last:border-0"
            onClick={() => {
              engine?.teleport(s.x, s.z + 5);
              useGameStore.getState().setHud({ paused: false, showMap: false, shopOpen: false });
            }}
          >
            <span>{s.name}</span>
            <span className="text-[10px] text-subtle">
              {s.kind === "food"
                ? "casse-croûte"
                : s.kind === "clothing"
                  ? "boutique"
                  : s.kind === "chasse"
                    ? "chasse"
                    : s.kind === "quincaillerie"
                      ? "quincaillerie"
                      : s.kind === "sqdc"
                        ? "SQDC"
                        : "dépanneur"}
            </span>
          </button>
        ))}
        {COMMERCIALS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="flex w-full items-center justify-between border-b border-border py-2 text-left text-sm text-fg last:border-0"
            onClick={() => {
              engine?.teleport(c.x, c.z + 6);
              useGameStore.getState().openDeed(c.id);
            }}
          >
            <span>{c.name}</span>
            <span className="text-[10px] text-subtle">MLS</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShopOverlay() {
  const shopId = useGameStore((s) => s.shopId);
  const shopAisle = useGameStore((s) => s.shopAisle);
  const cash = useGameStore((s) => s.cash);
  const inventory = useGameStore((s) => s.inventory);
  const notice = useGameStore((s) => s.notice);
  const cart = useGameStore((s) => s.cart);
  const [tab, setTab] = useState<"buy" | "sell">("buy");

  useEffect(() => {
    setTab("buy");
  }, [shopId, shopAisle]);

  const shop = (typeof window !== "undefined" ? window.__portneuf?.world.shops : undefined)?.find((s) => s.id === shopId);
  const aisleItems = shopAisle
    ? catalogForAisle(shopAisle).length
      ? catalogForAisle(shopAisle)
      : catalogForCasseAisle(shopAisle).length
        ? catalogForCasseAisle(shopAisle)
        : catalogForSqdcAisle(shopAisle)
    : null;
  const title =
    shop?.name ??
    (aisleItems && shopAisle && catalogForSqdcAisle(shopAisle).length
      ? "SQDC"
      : aisleItems && shopAisle && catalogForCasseAisle(shopAisle).length
        ? "Casse-croûte"
        : "Dépanneur");
  const kind = shop?.kind ?? (aisleItems && shopAisle && catalogForSqdcAisle(shopAisle).length ? "sqdc" : "depanneur");
  const items = aisleItems && aisleItems.length > 0 ? aisleItems : catalogFor(kind);
  
  // CORRECTION: Cast de inventory en Record<string, number> pour Object.entries
  const inventoryMap = inventory as Record<string, number>;
  const bag = Object.entries(inventoryMap)
    .filter(([, n]) => Number(n) > 0)
    .map(([id, n]) => ({ item: itemById(id), n: Number(n) }))
    .filter((x): x is { item: ShopItem; n: number } => Boolean(x.item));
    
  const sqdc = kind === "sqdc";
  const hasId = (inventory.identite ?? 0) > 0;

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">
              {sqdc ? "SQDC · 21 ans et plus" : shopAisle ? shopAisle : "Commerce"}
            </p>
            <h2 className="font-display text-3xl italic">{title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Wallet className="size-3.5 text-accent" />
              {formatCad(cash)}
              {shop?.hours ? <span className="text-subtle">· {shop.hours}</span> : null}
            </p>
            {sqdc && (
              <p className={`mt-2 text-xs ${hasId ? "text-ok" : "text-danger"}`}>
                {hasId ? "Identité vérifiée" : "Pièce d'identité requise à la caisse"}
              </p>
            )}
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeShop()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
          <button type="button" className={`h-9 rounded-md text-sm ${tab === "buy" ? "bg-surface-2 text-fg" : "text-muted"}`} onClick={() => setTab("buy")}>
            Acheter
          </button>
          <button type="button" className={`h-9 rounded-md text-sm ${tab === "sell" ? "bg-surface-2 text-fg" : "text-muted"}`} onClick={() => setTab("sell")}>
            Vendre
          </button>
        </div>
        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}
        <ul className="mt-4 max-h-[46vh] space-y-1 overflow-auto">
          {tab === "buy" &&
            items.map((item) => {
              const owned = inventory[item.id] ?? 0;
              const inCart = cart[item.id] ?? 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => useGameStore.getState().addToCart(item.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-left"
                  >
                    <ProductThumb id={item.id} icon={item.icon} alt={item.name} className="size-12" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-fg">
                        {item.name}
                        {owned > 0 ? <span className="text-subtle"> · ×{owned}</span> : null}
                        {inCart > 0 ? <span className="text-accent"> · panier {inCart}</span> : null}
                      </span>
                      <span className="block text-xs text-muted">
                        {item.desc}
                        {item.hunger || item.thirst ? (
                          <span className="text-subtle">
                            {item.hunger ? ` · faim +${item.hunger}` : ""}
                            {item.thirst ? ` · soif +${item.thirst}` : ""}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="hud-num shrink-0 text-sm text-fg">{formatCad(item.price)}</span>
                  </button>
                </li>
              );
            })}
          {tab === "sell" && bag.length === 0 && (
            <li className="px-1 py-6 text-center text-sm text-subtle">Sac vide — rien à revendre (60 %).</li>
          )}
          {tab === "sell" &&
            bag.map(({ item, n }) => {
              const price = sellPrice(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => useGameStore.getState().sellItem(item.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-left"
                  >
                    <ProductThumb id={item.id} icon={item.icon} alt={item.name} className="size-12" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-fg">
                        {item.name}
                        <span className="text-subtle"> · ×{n}</span>
                      </span>
                      <span className="block text-xs text-muted">Le magasin rachète à 60 %</span>
                    </span>
                    <span className="hud-num shrink-0 text-sm text-ok">+{formatCad(price)}</span>
                  </button>
                </li>
              );
            })}
        </ul>
        {tab === "buy" && cartCount(cart) > 0 && (
          <button
            type="button"
            className={`mt-4 flex h-11 w-full items-center justify-between rounded-md px-3 text-sm ${sqdc ? "bg-sqdc text-fg" : "bg-accent text-bg"}`}
            onClick={() => useGameStore.getState().openCart()}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Caisse · {cartCount(cart)} article{cartCount(cart) > 1 ? "s" : ""}
            </span>
            <span className="hud-num">{formatCad(cartTotals(cart).total)}</span>
          </button>
        )}
        <p className="mt-4 flex items-center gap-2 text-xs text-subtle">
          <ShoppingBag className="size-3.5" />
          E ou Échap pour ressortir
        </p>
      </div>
    </div>
  );
}

function CitationOverlay() {
  const citation = useGameStore((s) => s.citation);
  if (!citation) return null;
  const arrest = citation.kind === "arrest";
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-bg/80 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-md rounded-xl p-5">
        <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">
          {arrest ? "Sûreté du Québec · Arrestation" : "Constat d'infraction"}
        </p>
        <h2 className="mt-1 font-display text-3xl italic">{arrest ? "Mise sous arrêt" : "Contravention CSR"}</h2>
        <p className="mt-3 text-sm text-fg">{citation.article}</p>
        <p className="mt-1 text-sm text-muted">{citation.description}</p>
        {(citation.ticketNumber || citation.badge) && (
          <p className="mt-2 text-[11px] tracking-[0.12em] text-subtle uppercase">
            {citation.ticketNumber ? citation.ticketNumber : "Constat"}
            {citation.badge ? ` · ${citation.badge}` : ""}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5">
          <span className="text-xs text-subtle">{citation.points > 0 ? `${citation.points} points d'inaptitude` : "Sans points"}</span>
          <span className="hud-num text-lg text-danger">{formatCad(citation.fine)}</span>
        </div>
        {arrest && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Cellule du poste SQ Portneuf. Le pick-up vous attend dans la cour. Signez le constat pour sortir.
          </p>
        )}
        <button
          type="button"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-fg text-sm font-medium text-accent-fg"
          onClick={() => useGameStore.getState().payCitation()}
        >
          <Shield className="size-4" />
          {arrest ? "Signer et payer" : "Payer le constat"}
        </button>
        <button
          type="button"
          className="mt-2 flex h-10 w-full items-center justify-center text-xs text-muted"
          onClick={() => useGameStore.getState().closeCitation()}
        >
          Contester plus tard
        </button>
      </div>
    </div>
  );
}

function MapOverlay({ engine }: { engine: PortneufEngine | null }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/50 p-4">
      <div className="hud-panel w-full max-w-lg rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl italic">Carte du comté</h2>
          <button
            type="button"
            className="size-10 rounded-md text-muted"
            onClick={() => useGameStore.getState().setHud({ showMap: false, paused: false })}
            aria-label="Fermer la carte"
          >
            <X className="size-5" />
          </button>
        </div>
        <BigMap />
        <MapList engine={engine} />
      </div>
    </div>
  );
}

function BigMap() {
  const x = useGameStore((s) => s.x);
  const z = useGameStore((s) => s.z);
  const ownedProps = useGameStore((s) => s.ownedProps);
  const realty = useGameStore((s) => s.realty);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintCounty(ctx, canvas.width, canvas.height, {
      x,
      z,
      yaw: 0,
      owned: ownedIds(ownedProps, realty),
      haul: null,
      wantedStars: 0,
      labels: true,
      playerDot: "ring",
    });
  }, [x, z, ownedProps, realty]);

  return <canvas ref={ref} width={640} height={360} className="w-full rounded-lg" />;
}

function TouchPad() {
  const playing = useGameStore((s) => s.playing);
  const paused = useGameStore((s) => s.paused);
  const prompt = useGameStore((s) => s.prompt);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => {
      const hasMouse = mq.matches;
      const touchPrimary = window.matchMedia("(pointer: coarse)").matches;
      setShow(touchPrimary && !hasMouse);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!playing || paused || !show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15]">
      <Stick />
      <div className="pointer-events-auto absolute right-4 bottom-28 flex flex-col gap-3">
        {prompt && (
          <HoldBtn
            label="E"
            onHold={(v) => {
              input.touchInteract = v;
            }}
          />
        )}
        <HoldBtn label="Gaz" onHold={(v) => (input.touchThrottle = v ? 1 : 0)} />
        <HoldBtn label="Frein" onHold={(v) => (input.touchBrake = v ? 1 : 0)} />
        <HoldBtn label="Glisse" onHold={(v) => (input.touchHandbrake = v)} />
        <button
          type="button"
          className="h-12 min-w-20 rounded-lg border border-border bg-surface/80 px-4 text-sm text-fg"
          onClick={() => {
            const s = useGameStore.getState();
            if (s.chatOpen) s.closeChat();
            else s.openChat();
          }}
        >
          Parler
        </button>
        <button
          type="button"
          className="h-12 min-w-20 rounded-lg border border-border bg-surface/80 px-4 text-sm text-fg"
          onClick={() => useGameStore.getState().toggleGesture()}
        >
          Gestes
        </button>
      </div>
      <button
        type="button"
        className="pointer-events-auto absolute top-4 right-4 flex size-11 items-center justify-center rounded-md bg-surface/80 text-fg"
        onClick={() => useGameStore.getState().togglePause()}
        aria-label="Pause"
      >
        <Pause className="size-5" />
      </button>
    </div>
  );
}

function HoldBtn({ label, onHold }: { label: string; onHold: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className="h-12 min-w-20 rounded-lg border border-border bg-surface/80 px-4 text-sm text-fg"
      onPointerDown={(e) => {
        e.preventDefault();
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
    >
      {label}
    </button>
  );
}

function Stick() {
  const ref = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);

  const onMove = (cx: number, cy: number, x: number, y: number) => {
    const dx = x - cx;
    const dy = y - cy;
    const m = Math.min(46, Math.hypot(dx, dy));
    const a = Math.atan2(dy, dx);
    const lx = Math.cos(a) * m;
    const ly = Math.sin(a) * m;
    if (knob.current) knob.current.style.transform = `translate(${lx}px, ${ly}px)`;
    input.touchSteer = Math.max(-1, Math.min(1, -lx / 46));
    input.touchThrottle = ly < -10 ? Math.min(1, -ly / 46) : 0;
    input.touchBrake = ly > 10 ? Math.min(1, ly / 46) : 0;
  };

  const onEnd = () => {
    pid.current = null;
    input.touchSteer = 0;
    if (knob.current) knob.current.style.transform = "translate(0,0)";
  };

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute bottom-24 left-6 size-32 rounded-full border border-border bg-surface/50"
      onPointerDown={(e) => {
        pid.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        onMove(box.left + box.width / 2, box.top + box.height / 2, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        onMove(box.left + box.width / 2, box.top + box.height / 2, e.clientX, e.clientY);
      }}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
    >
      <div ref={knob} className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80" />
    </div>
  );
}

function gestureIcon(id: RpGesture) {
  switch (id) {
    case "wave":
      return Hand;
    case "surrender":
      return Hand;
    case "cross_arms":
      return Users;
    case "point":
      return Pointer;
    case "dance":
      return Music2;
    case "gang_sign":
      return Handshake;
    case "sit":
      return User;
    case "phone":
      return Smartphone;
    case "salute":
      return Shield;
    default:
      return Hand;
  }
}

function GestureWheel({ current }: { current: RpGesture }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-bg/40">
      <div className="relative size-72 sm:size-80">
        {RP_GESTURES.map((g, i) => {
          const a = (i / RP_GESTURES.length) * Math.PI * 2 - Math.PI / 2;
          const r = 112;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          const Icon = gestureIcon(g.id);
          const on = current === g.id;
          return (
            <button
              key={g.id}
              type="button"
              className={`absolute flex size-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-[10px] ${
                on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg"
              }`}
              style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
              onClick={() => window.__portneuf?.playGesture(g.id)}
            >
              <Icon className="size-4" />
              <span className="mt-0.5 max-w-14 truncate">{g.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-border bg-surface-2 text-xs text-muted"
          onClick={() => {
            window.__portneuf?.playGesture("none");
            useGameStore.getState().closeGesture();
          }}
        >
          <X className="size-4" />
          Repos
        </button>
      </div>
    </div>
  );
}
