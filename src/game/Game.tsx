/**
 * Coque du comté — HUD, carte, pause, commerce, tactile.
 * Version HD Premium : Glassmorphism unifié, ombres profondes, animations fluides.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Briefcase, Car, CloudFog, CloudLightning, CloudRain, Compass, DoorOpen, Droplets, Eye, Flame, Footprints, Gauge, Hammer, Hand, Handshake, KeyRound, Leaf, Map as MapIcon, MessageSquare, Moon, Music2, Pause, Play, Pointer, Radio, RotateCcw, Shield, ShoppingBag, ShoppingCart, Smartphone, Snowflake, Sprout, Star, Sun, Terminal, Truck, User, Users, Video, Wallet, X, Zap,
} from "lucide-react";
import { AdminBar } from "./AdminBar";
import { BuilderOverlay } from "./ui/buildui";
import { ChatOverlay, RpNetBridge } from "./chat";
import {
  bagCapacity, bagWeight, cartCount, cartTotals, catalogFor, formatCad, itemById, sellPrice, LANDMARK_SHOPS, type ShopItem,
} from "./commerce";
import { CreatorOverlay } from "./creator";
import { catalogForAisle, depMapMarks } from "./depanneur";
import { catalogForCasseAisle } from "./casse";
import { catalogForSqdcAisle } from "./sqdc";
import { ElevatorOverlay } from "./city/hotel/elevator";
import type { PortneufEngine } from "./engine";
import { CROPS, farmMapMarks, type CropId } from "./farms";
import { FirmOverlay } from "./firm";
import { JobsOverlay } from "./JobsOverlay";
import { input } from "./input";
import { IntellectusOverlay, startIntellectusHeartbeat } from "./IntellectusOverlay";
import { GarageOverlay, InventoryOverlay } from "./city/inventory/inventory";
import { CartOverlay } from "./panier";
import { LockOverlay, PhoneOverlay } from "./phone";
import { ProductThumb } from "./productThumb";
import { quebecFM } from "../components/radio";
import { spatialAudio } from "./audio3d";
import { COMMERCIALS, ownedIds } from "./realestate";
import { AtmOverlay, DeedOverlay } from "./ui/rpui";
import { persist, useGameStore, CAMERA_LABEL, type CameraMode } from "./store";
import { RP_GESTURES, type RpGesture } from "./gestures";
import { getRoleBadgeStyle, AdminRole } from "./adminPerms";
import { sugarMapMarks } from "./sugar";
import { survivalLabel } from "./survival";
import { CONDITION_LABEL, PLOW_STATUS_LABEL, SEASON_LABEL, type QuebecSeason, type SnowPlowStatus, type WeatherCondition } from "./seasons";
import type { ChatMessageState } from "./rpSchema";
import {
  A40_EXITS, INDUSTRY_LABEL, LAKES, MAPLE_LEAVES, POIS, ROADS, SPAWN, VILLAGES, WORLD, getVillageAt, getWorldStats,
} from "./worlddata";
import { DEEDS } from "./rp";
import { rpNet } from "./net";

const GLASS_PANEL =
  "bg-black/55 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.55)] transition-all duration-300";
const GLASS_PANEL_HEAVY =
  "bg-black/80 backdrop-blur-3xl border border-white/15 shadow-[0_16px_64px_rgba(0,0,0,0.7)] transition-all duration-300";
const BTN_HOVER = "hover:bg-white/10 active:scale-[0.97] transition-all duration-150";
const HUD_NUM = "font-mono tabular-nums tracking-tight";

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
    void import("./engine")
      .then(({ PortneufEngine }) => {
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
      })
      .catch((err) => {
        useGameStore.getState().setHud({ loading: false });
        setBootError(err instanceof Error ? err.message : "Le moteur 3D a échoué.");
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
    showMap || shopOpen || phoneOpen || lockOpen || consoleOpen || intelOpen || citationOpen || creatorOpen ||
    inventoryOpen || garageOpen || jobsOpen || firmOpen || cartOpen || atmOpen || propertyOpen || elevatorOpen ||
    chatOpen || buildOpen;

  return (
    <div className="game-root relative h-screen w-screen overflow-hidden bg-black text-white antialiased">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end bg-gradient-to-t from-black via-black/80 to-black/20 px-6 pb-16 pt-10 sm:justify-center sm:pb-0">
      <div className="max-w-xl text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
        <p className="text-xs tracking-[0.4em] text-yellow-400/90 uppercase drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">
          Comté de Portneuf
        </p>
        <h1 className="mt-3 font-display text-6xl italic leading-none text-white drop-shadow-2xl sm:text-7xl">
          Portneuf
        </h1>
        <p className="mt-4 text-base leading-relaxed text-gray-300">
          Le Chemin du Roy, l'A-40 Félix-Leclerc et ses sorties 250 à 285, les rangs laitiers, l'éboulis de 1894 et les
          lacs des Laurentides. Prenez la 138, l'entrée d'autoroute, descendez du pick-up, entrez au dépanneur. Hôtel :
          NIP 1234. Caisse populaire — GAB, prêts, placements. MLS Portneuf — maisons, locaux, entrepôts.
        </p>
        {error ? (
          <p className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-md shadow-lg shadow-red-900/30">
            {error}
          </p>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={loading}
              aria-label="Start"
              onClick={() => boot(false)}
              className="inline-flex h-12 min-w-52 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-black shadow-[0_8px_24px_rgba(255,255,255,0.2)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Chargement du comté…" : "Prendre la route"}
              <span className="sr-only">Start</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => boot(true)}
              className="inline-flex h-12 min-w-52 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 text-sm font-medium text-white backdrop-blur-md transition-all duration-150 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
            >
              <User className="size-4" />
              Personnage
            </button>
          </div>
        )}
        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-1.5 text-left text-xs text-gray-400 sm:grid-cols-2">
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
          <li>J — contrats de transport · Convois Fret</li>
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
  const crop = selectedSeed ? CROPS[selectedSeed as CropId] : null;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* ============ EN-TÊTE ============ */}
        <div className="absolute top-4 right-4 left-4 flex items-start justify-between gap-3">
          <div className={`${GLASS_PANEL} hud-panel max-w-[70%] rounded-xl px-4 py-3 sm:max-w-sm`}>
            <p className="text-[10px] tracking-[0.25em] text-gray-400 uppercase">
              {mode === "interior" ? "Intérieur" : "Secteur"}
            </p>
            <p className="font-display text-2xl italic leading-tight text-white drop-shadow-md">{zone}</p>
            <p className="mt-0.5 text-xs text-gray-300">
              {playerName} · {surface}
              {firm?.isOpen ? ` · ${firm.tradeName} ouvert` : ""}
            </p>
            {adminRole && adminRole !== AdminRole.NONE && (
              <p className={`mt-0.5 text-[10px] tracking-[0.16em] uppercase font-semibold ${getRoleBadgeStyle(adminRole).color}`}>
                {getRoleBadgeStyle(adminRole).label}
              </p>
            )}
            {mode !== "interior" && (
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                <Gauge className="size-3" />
                {limit > 0 ? `${limit} km/h` : "—"}
                {policeEta > 0 ? ` · SQ ${Math.max(1, Math.round(policeEta / 60))} min` : ""}
                {safeZone ? " · parvis" : ""}
              </p>
            )}
            {here && (
              <p className="mt-0.5 text-[11px] text-gray-400">
                {here.motto} · {INDUSTRY_LABEL[here.industry]} · {here.founded}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={`${GLASS_PANEL} flex items-center gap-2 rounded-xl px-3 py-2 text-xs`}>
              {night ? <Moon className="size-4 text-blue-300 drop-shadow-[0_0_6px_rgba(147,197,253,0.6)]" /> : <Sun className="size-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" />}
              <span className={`${HUD_NUM} text-base font-semibold text-white`}>
                {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}
              </span>
              {timeHours >= 5.2 && timeHours < 7.6 ? (
                <span className="text-orange-300/80 text-[10px] uppercase tracking-wider">aube</span>
              ) : timeHours >= 17.4 && timeHours < 21.2 ? (
                <span className="text-purple-300/80 text-[10px] uppercase tracking-wider">crépuscule</span>
              ) : null}
            </div>

            <div className={`${GLASS_PANEL} flex max-w-[11.5rem] flex-col gap-0.5 rounded-xl px-3 py-2 text-xs`}>
              <p className="flex items-center gap-1.5">
                {(() => {
                  const Icon = weatherGlyph(wxCondition as WeatherCondition);
                  return <Icon className="size-3.5 text-blue-300" />;
                })()}
                <span className="text-white font-medium">{SEASON_LABEL[season as QuebecSeason]}</span>
                <span className={`${HUD_NUM} text-white`}>{Math.round(wxTemp)}°</span>
              </p>
              <p className="truncate text-[11px] text-gray-400">
                {CONDITION_LABEL[wxCondition as WeatherCondition]}
                {snowCm >= 1 ? ` · ${Math.round(snowCm)} cm` : ""}
              </p>
              {plowStatus !== "idle" && (
                <p className="truncate text-[10px] text-yellow-400 font-medium">
                  {PLOW_STATUS_LABEL[plowStatus as SnowPlowStatus]}
                </p>
              )}
            </div>

            {(radarActive || bloodAlcohol > 8 || licenseSuspendedUntil > Date.now() || demeritPoints > 0) && (
              <div className={`${GLASS_PANEL} flex max-w-[11.5rem] flex-col gap-0.5 rounded-xl px-3 py-2 text-xs`}>
                <p className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-red-400" />
                  <span className="text-white font-medium">SQ Portneuf</span>
                </p>
                {radarActive && <p className="text-[11px] text-yellow-400">Radar photo · 138 / A-40</p>}
                {bloodAlcohol > 8 && (
                  <p className={`text-[11px] ${bloodAlcohol >= 80 ? "text-red-400" : "text-orange-400"}`}>
                    Alcoolémie {Math.round(bloodAlcohol)} mg
                  </p>
                )}
                {demeritPoints > 0 && (
                  <p className="text-[11px] text-gray-400">{demeritPoints} pts SAAQ</p>
                )}
                {licenseSuspendedUntil > Date.now() && (
                  <p className="text-[11px] text-red-400 font-medium">
                    Permis suspendu · {Math.max(1, Math.ceil((licenseSuspendedUntil - Date.now()) / 86400000))} j
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              className={`pointer-events-auto ${GLASS_PANEL} ${BTN_HOVER} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}
              onClick={() => window.__portneuf?.cycleCamera()}
              aria-label="Mode caméra"
            >
              {cameraMode === "fps" ? <Eye className="size-3.5 text-blue-300" /> : <Video className="size-3.5 text-blue-300" />}
              <span className="text-white">{CAMERA_LABEL[cameraMode] ?? "Épaule"}</span>
              <span className="text-gray-500 text-[10px]">V</span>
            </button>

            <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}>
              <Wallet className="size-3.5 text-green-400" />
              <span className={`${HUD_NUM} text-white font-semibold`}>{formatCad(cash)}</span>
              <span className="text-gray-500">·</span>
              <span className={`${HUD_NUM} text-gray-300`}>{formatCad(bank)}</span>
            </div>

            {cartCount(cart) > 0 && (
              <button
                type="button"
                className={`pointer-events-auto ${GLASS_PANEL} ${BTN_HOVER} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}
                onClick={() => useGameStore.getState().openCart()}
              >
                <ShoppingCart className="size-3.5 text-yellow-400" />
                <span className={`${HUD_NUM} text-white font-semibold`}>{cartCount(cart)}</span>
              </button>
            )}

            <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}>
              <Leaf className="size-3.5 text-green-400" />
              <span className={`${HUD_NUM} text-white`}>
                {leaves.length}/{MAPLE_LEAVES.length}
              </span>
            </div>

            {crop && (
              <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}>
                <Sprout className={`size-3.5 ${crop.illegal ? "text-red-400" : "text-green-400"}`} />
                <span className="text-white">{crop.label}</span>
              </div>
            )}

            {holdings.length > 0 && (
              <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}>
                <KeyRound className="size-3.5 text-yellow-400" />
                <span className="text-white">
                  {holdings.length} bien{holdings.length > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {gridOutage && (
              <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border-red-500/40`}>
                <Zap className="size-3.5 text-red-400" />
                <span className="text-red-300">{gridOutage.kind === "verglas" ? "Verglas" : "Panne Hydro"}</span>
              </div>
            )}

            <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}>
              <Users className="size-3.5 text-blue-300" />
              <span className={`${HUD_NUM} text-white font-semibold`}>{netPeers + 1}</span>
              <span className="text-gray-400">rang</span>
            </div>

            <div
              className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs ${
                riskLevel === "RED" || riskLevel === "ORANGE"
                  ? "text-red-400 border-red-500/40"
                  : riskLevel === "YELLOW"
                    ? "text-yellow-400"
                    : "text-green-400"
              }`}
            >
              <Shield className="size-3.5" />
              <span className={`${HUD_NUM} font-semibold`}>{riskLevel}</span>
            </div>

            {mode === "interior" && interiorKind === "home" && deedId && houses[deedId] && (
              <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}>
                <Flame className={`size-3.5 ${houses[deedId].heatOn ? "text-orange-400" : "text-gray-500"}`} />
                <span className={`${HUD_NUM} text-white`}>{Math.round(houses[deedId].indoorC)}°</span>
              </div>
            )}

            {mode === "interior" && interiorKind === "depanneur" && (
              <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}>
                <ShoppingBag className="size-3.5 text-yellow-400" />
                <span className="text-white">Dépanneur</span>
              </div>
            )}

            {(inventory.eau_erable ?? 0) > 0 && (
              <div className={`${GLASS_PANEL} flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs`}>
                <Droplets className="size-3.5 text-amber-400" />
                <span className={`${HUD_NUM} text-white`}>{inventory.eau_erable}</span>
                <span className="text-gray-400">sève</span>
              </div>
            )}

            {onFoot && (
              <div className={`${GLASS_PANEL} w-[7.5rem] rounded-xl px-3 py-2`}>
                <p className={`${HUD_NUM} text-[10px] ${loadFill > 1 ? "text-red-400" : "text-gray-400"}`}>
                  {Number(loadKg || 0).toFixed(1)}/{loadCap} kg
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      loadFill > 1 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : loadFill > 0.8 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(100, loadFill * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className={`${GLASS_PANEL} w-[7.5rem] rounded-xl px-3 py-2`}>
              <p className={`${HUD_NUM} text-[10px] text-gray-400`}>
                {Number(surv.bodyTemp || 0).toFixed(1)} °C · {Math.round(surv.felt)}° air
              </p>
              <div className="mt-1 space-y-0.5">
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${surv.hunger < 20 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${surv.hunger}%` }} />
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${surv.thirst < 20 ? "bg-red-500" : "bg-blue-400"}`} style={{ width: `${surv.thirst}%` }} />
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${surv.bodyTemp < 35 ? "bg-red-500" : surv.bodyTemp > 38.5 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min(100, Math.max(0, (surv.bodyTemp - 32) * 12.5))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ CONTRAT DE TRANSPORT / LOGISTIQUE ============ */}
        {haul && !citationOpen && (
          <div className="absolute top-[4.6rem] left-4 z-10 sm:top-24 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className={`${GLASS_PANEL} max-w-[16rem] rounded-xl px-4 py-3 border-l-2 border-yellow-500`}>
              <p className="text-[10px] tracking-[0.2em] text-yellow-400/80 uppercase">{haul.title}</p>
              <p className="mt-0.5 text-sm text-white font-medium">
                {haul.loaded ? "Livrer" : "Charger"} · {haul.loaded ? haul.to.name : haul.from.name}
              </p>
              <p className={`${HUD_NUM} mt-1 text-[11px] text-gray-300`}>
                {Math.round(Math.hypot(hx - (haul.loaded ? haul.to.x : haul.from.x), hz - (haul.loaded ? haul.to.z : haul.from.z)))} m · {haul.pay}&nbsp;$
              </p>
            </div>
          </div>
        )}

        {/* ============ BANNIÈRE ÉVÉNEMENT ============ */}
        {eventBanner && !shopOpen && !citationOpen && (
          <div className="absolute top-[4.5rem] left-1/2 z-10 w-[min(92%,22rem)] -translate-x-1/2 sm:top-24 animate-in fade-in slide-in-from-top-4 duration-300">
            <div
              className={`${GLASS_PANEL_HEAVY} rounded-xl px-4 py-3 text-center ${
                eventSeverity === "catastrophe"
                  ? "border-red-500/60"
                  : eventSeverity === "majeur"
                    ? "border-orange-500/60"
                    : ""
              }`}
            >
              <p className="text-[10px] tracking-[0.18em] text-gray-400 uppercase">
                {eventSeverity === "catastrophe" ? "Catastrophe" : eventSeverity === "majeur" ? "Alerte" : "Avis"}
              </p>
              <p
                className={`mt-0.5 text-sm leading-snug font-medium ${
                  eventSeverity === "catastrophe" ? "text-red-400" : eventSeverity === "majeur" ? "text-orange-400" : "text-white"
                }`}
              >
                {eventBanner}
              </p>
            </div>
          </div>
        )}

        {/* ============ RECHERCHE SQ ============ */}
        {wantedStars > 0 && !shopOpen && !citationOpen && (
          <div className={`absolute left-1/2 z-10 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-300 ${eventBanner ? "top-40 sm:top-44" : "top-20"}`}>
            <div className={`${GLASS_PANEL_HEAVY} rounded-xl px-4 py-2 text-center border-red-500/40 sm:px-5 sm:py-3`}>
              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-3.5 sm:size-4 transition-all duration-300 ${
                      i < wantedStars ? "fill-red-500 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "text-gray-600"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1 hidden text-[11px] text-white font-medium sm:block">
                {evading ? "Fuite en cours" : "Poursuite SQ"} · {wantedReason}
              </p>
              <p className="hidden text-[10px] text-gray-400 sm:block">Prime {bounty}&nbsp;$</p>
              {dispatch && <p className="mt-0.5 hidden max-w-xs truncate text-[10px] text-red-400 sm:block">{dispatch}</p>}
            </div>
          </div>
        )}

        {/* ============ VITESSE / PROMPT CENTRAL ============ */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          {activeGig && !citationOpen && (
            <div className={`${GLASS_PANEL} w-56 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-bottom-4`}>
              <p className="text-[10px] tracking-[0.16em] text-gray-400 uppercase">{activeGig.title}</p>
              <p className="truncate text-xs text-white mt-0.5">{activeGig.steps[activeGig.currentStep]?.description ?? "En cours"}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${Math.round(activeGig.progress * 100)}%` }} />
              </div>
            </div>
          )}
          {prompt && !citationOpen && (
            <div className={`${GLASS_PANEL_HEAVY} flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white animate-in fade-in slide-in-from-bottom-2`}>
              {onFoot ? <DoorOpen className="size-4 text-yellow-400" /> : <Footprints className="size-4 text-yellow-400" />}
              <span className="font-medium">{prompt}</span>
            </div>
          )}
          {!citationOpen && (
            <div
              className={`${GLASS_PANEL_HEAVY} rounded-2xl px-8 py-4 text-center ${
                speeding ? "border-red-500/60 shadow-[0_0_32px_rgba(239,68,68,0.3)]" : ""
              }`}
            >
              <p className={`${HUD_NUM} font-display text-6xl leading-none text-white drop-shadow-lg ${speeding ? "text-red-400" : ""}`}>
                {Math.round(speed)}
              </p>
              <p className="mt-1 text-[10px] tracking-[0.3em] text-gray-400 uppercase">
                {onFoot ? "km/h à pied" : limit > 0 ? `km/h · max ${limit}` : "km/h"}
              </p>
            </div>
          )}
        </div>

        {/* ============ MINICARTE ============ */}
        <div className="absolute right-4 bottom-6 hidden sm:block">
          <MiniMap />
        </div>

        {/* ============ BARRE D'ACTIONS ============ */}
        <div className="absolute bottom-6 left-4 flex items-center gap-2">
          <div className={`${GLASS_PANEL} flex size-12 items-center justify-center rounded-full`}>
            <Compass
              className="size-6 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)] transition-transform duration-150"
              style={{ transform: `rotate(${(-yaw * 180) / Math.PI}deg)` }}
            />
          </div>
          <button
            type="button"
            className={`pointer-events-auto ${GLASS_PANEL} ${BTN_HOVER} flex size-12 items-center justify-center rounded-full`}
            onClick={() => useGameStore.getState().openPhone()}
            aria-label="Téléphone"
          >
            <Smartphone className="size-5 text-blue-300" />
          </button>
          <button
            type="button"
            className={`pointer-events-auto ${GLASS_PANEL} ${BTN_HOVER} flex size-12 items-center justify-center rounded-full`}
            onClick={() => useGameStore.getState().toggleGesture()}
            aria-label="Gestes RP"
          >
            <Hand className="size-5 text-purple-300" />
          </button>
          <button
            type="button"
            className={`pointer-events-auto ${GLASS_PANEL} ${BTN_HOVER} flex size-12 items-center justify-center rounded-full`}
            onClick={() => {
              const s = useGameStore.getState();
              if (s.chatOpen) s.closeChat();
              else s.openChat();
            }}
            aria-label="Parler"
          >
            <MessageSquare className="size-5 text-green-300" />
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
            <div className={`${GLASS_PANEL} hidden max-w-48 rounded-xl px-3 py-2 sm:block`}>
              <p className="flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-gray-400 uppercase">
                <Radio className="size-3 text-red-400" />
                {radioId}
              </p>
              <p className="truncate text-xs text-white mt-0.5">{radioTrack ?? "Québec-FM"}</p>
            </div>
          )}
        </div>
      </div>

      {/* ============ CHAT LOCAL (HORS OVERLAY) ============ */}
      {chat.length > 0 && !chatOpen && (
        <div className="pointer-events-none absolute bottom-24 left-4 z-20 flex max-w-sm flex-col gap-1.5">
          {chat.slice(-5).map((m: ChatMessageState) => (
            <div key={m.id} className={`${GLASS_PANEL} rounded-lg px-3 py-1.5 text-xs animate-in fade-in slide-in-from-left-2`}>
              <span
                className={
                  ((m as typeof m & { type?: "admin" | "system" | string }).type === "admin")
                    ? "text-yellow-400 font-semibold"
                    : ((m as typeof m & { type?: "admin" | "system" | string }).type === "system")
                      ? "text-gray-500"
                      : "text-white font-medium"
                }
              >
                {m.senderId}
              </span>
              <span className="text-gray-300"> · {m.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ============ ÉTATS SPÉCIAUX (VOL, INVISIBLE, ETC.) ============ */}
      {flyMode && (
        <div className="pointer-events-none absolute top-20 right-4 z-20">
          <div className={`${GLASS_PANEL} rounded-lg px-3 py-1.5 text-[10px] tracking-[0.16em] text-purple-300 uppercase font-semibold`}>
            Vol
          </div>
        </div>
      )}
      {vanished && (
        <div className="pointer-events-none absolute top-28 right-4 z-20">
          <div className={`${GLASS_PANEL} rounded-lg px-3 py-1.5 text-[10px] tracking-[0.16em] text-blue-300 uppercase font-semibold`}>
            Invisible
          </div>
        </div>
      )}
      {staffFrozen && (
        <div className="pointer-events-none absolute top-36 right-4 z-20">
          <div className={`${GLASS_PANEL} rounded-lg px-3 py-1.5 text-[10px] tracking-[0.16em] text-red-400 uppercase font-semibold`}>
            Gelé
          </div>
        </div>
      )}
      {sirenMode && sirenMode !== "off" && (
        <div className="pointer-events-none absolute top-20 left-4 z-20">
          <div className={`${GLASS_PANEL} rounded-lg px-3 py-1.5 text-[10px] tracking-[0.16em] text-red-400 uppercase font-semibold drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]`}>
            {sirenMode === "code3_emergency" ? "Code 3" : sirenMode === "code2_visual" ? "Code 2" : "Code 1"}
          </div>
        </div>
      )}
      {gesture && gesture !== "none" && (
        <div className={`pointer-events-none absolute left-4 z-20 ${sirenMode && sirenMode !== "off" ? "top-28" : "top-20"}`}>
          <div className={`${GLASS_PANEL} rounded-lg px-3 py-1.5 text-[10px] tracking-[0.16em] text-purple-300 uppercase font-semibold`}>
            {RP_GESTURES.find((g) => g.id === gesture)?.label ?? gesture}
          </div>
        </div>
      )}

      {/* ============ NOTIFICATIONS CENTRALES ============ */}
      {fauna && !prompt && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center animate-in fade-in slide-in-from-top-4">
          <div className={`${GLASS_PANEL_HEAVY} rounded-xl px-5 py-2.5 text-sm text-white font-medium`}>{fauna}</div>
        </div>
      )}

      {notice && !shopOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center animate-in fade-in slide-in-from-top-4">
          <div className={`${GLASS_PANEL_HEAVY} rounded-xl px-5 py-2.5 text-sm text-white font-medium`}>{notice}</div>
        </div>
      )}

      {!notice && surv.advice && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center animate-in fade-in slide-in-from-top-4">
          <div className={`${GLASS_PANEL_HEAVY} rounded-xl px-5 py-2.5 text-sm text-white font-medium`}>
            {surv.alerts[0] ? survivalLabel(surv.alerts[0]) : "Survie"} · {surv.advice}
          </div>
        </div>
      )}

      {fineFlash > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center animate-in fade-in zoom-in-95">
          <div className={`${GLASS_PANEL_HEAVY} rounded-xl border-red-500/50 bg-red-500/20 px-5 py-2.5 text-sm text-white font-semibold`}>
            <span className="text-red-400">Radar</span> · {fineFlash}&nbsp;$ · limite {limit} km/h
          </div>
        </div>
      )}

      {poi && mode === "drive" && !prompt && (
        <div className="pointer-events-none absolute bottom-36 left-1/2 z-10 w-[min(90%,22rem)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
          <div className={`${GLASS_PANEL_HEAVY} rounded-xl px-5 py-4 text-center`}>
            <p className="font-display text-xl italic text-white drop-shadow-md">{poi}</p>
            {poiDesc && <p className="mt-1 text-xs leading-relaxed text-gray-300">{poiDesc}</p>}
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

  ctx.fillStyle = opts.labels ? "#0f172a" : "#020617";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = opts.labels ? "#1e3a5f" : "#172554";
  ctx.fillRect(0, sy(96), w, h);

  for (const f of farmMapMarks()) {
    ctx.save();
    ctx.translate(sx(f.x), sy(f.z));
    ctx.rotate(-f.yaw);
    const rw = (f.w / WORLD.width) * w;
    const rh = (f.d / WORLD.depth) * h;
    ctx.fillStyle = f.illegal ? (opts.labels ? "#3a4a2a" : "#4a5a32") : opts.labels ? "#4a6a32" : "#5a7a3a";
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.restore();
  }

  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = opts.labels ? 8 : 4;
  ctx.fillStyle = "#f59e0b";
  const sugarR = opts.labels ? 4.5 : 3.2;
  for (const s of sugarMapMarks()) {
    ctx.beginPath();
    ctx.arc(sx(s.x), sy(s.z), sugarR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  const deedSize = opts.labels ? 6 : 4;
  const deedOff = deedSize / 2;
  for (const d of DEEDS) {
    ctx.fillStyle = opts.owned.includes(d.id) ? "#fbbf24" : opts.labels ? "#64748b" : "#475569";
    ctx.fillRect(sx(d.x) - deedOff, sy(d.z) - deedOff, deedSize, deedSize);
  }
  for (const c of COMMERCIALS) {
    ctx.fillStyle = opts.owned.includes(c.id) ? "#fbbf24" : "#60a5fa";
    ctx.fillRect(sx(c.x) - deedOff, sy(c.z) - deedOff, deedSize, deedSize);
  }
  ctx.fillStyle = "#ef4444";
  for (const s of depMapMarks()) ctx.fillRect(sx(s.x) - deedOff, sy(s.z) - deedOff, deedSize, deedSize);
  ctx.fillStyle = "#22c55e";
  for (const s of LANDMARK_SHOPS.filter((x) => x.kind === "sqdc")) {
    ctx.fillRect(sx(s.x) - deedOff, sy(s.z) - deedOff, deedSize, deedSize);
  }

  for (const road of ROADS) {
    ctx.beginPath();
    road.points.forEach(([px, pz], i) => {
      i === 0 ? ctx.moveTo(sx(px), sy(pz)) : ctx.lineTo(sx(px), sy(pz));
    });
    if (road.kind === "highway") {
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = opts.labels ? 4 : 3.2;
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = opts.labels ? 10 : 6;
    } else if (road.kind === "ramp") {
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = opts.labels ? 1.4 : 1.1;
      ctx.shadowBlur = 0;
    } else if (road.kind === "regional") {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = opts.labels ? 2.6 : 2.2;
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = opts.labels ? "#64748b" : "#475569";
      ctx.lineWidth = opts.labels ? 1.6 : 1.4;
      ctx.shadowBlur = 0;
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#86efac";
  for (const v of VILLAGES) {
    ctx.beginPath();
    ctx.arc(sx(v.center[0]), sy(v.center[1]), opts.labels ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (opts.labels) {
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 11px Outfit, sans-serif";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(v.name, sx(v.center[0]) + 8, sy(v.center[1]) + 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#86efac";
    }
  }

  if (!opts.labels) {
    ctx.fillStyle = "#3b82f6";
    ctx.shadowColor = "#3b82f6";
    ctx.shadowBlur = 8;
    for (const lake of LAKES) {
      ctx.beginPath();
      ctx.arc(sx(lake.x), sy(lake.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  if (opts.labels) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 10px Outfit, sans-serif";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 4;
    for (const ex of A40_EXITS) ctx.fillText(ex.no, sx(ex.x) + 4, sy(-178) - 6);
    ctx.shadowBlur = 0;
  }

  if (opts.wantedStars > 0) {
    const traffic = window.__portneuf?.world.traffic;
    if (traffic) {
      ctx.fillStyle = "#3b82f6";
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = 10;
      for (const car of traffic) {
        if (!car.isPolice) continue;
        ctx.beginPath();
        ctx.arc(sx(car.mesh.position.x), sy(car.mesh.position.z), car.chasing ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
  }

  if (opts.haul) {
    const t = opts.haul.loaded ? opts.haul.to : opts.haul.from;
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(sx(t.x), sy(t.z), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (opts.playerDot === "arrow") {
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffffff";
    ctx.save();
    ctx.translate(sx(opts.x), sy(opts.z));
    ctx.rotate(-opts.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 8;
    for (const p of rpNet.remotes.values()) {
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.z), 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(sx(opts.x), sy(opts.z), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
      x, z, yaw,
      owned: ownedIds(ownedProps, realty),
      haul, wantedStars,
      labels: false,
      playerDot: "arrow",
    });
  }, [x, z, yaw, wantedStars, haul, ownedProps, realty, netPeers]);

  return (
    <div className={`${GLASS_PANEL_HEAVY} overflow-hidden rounded-2xl p-1.5`}>
      <canvas ref={ref} width={148} height={110} className="block rounded-xl" />
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

  const inventoryMap = inventory as Record<string, number>;
  const bag = Object.entries(inventoryMap).filter(([, n]) => Number(n) > 0);
  const stats = getWorldStats();

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 animate-in fade-in duration-200">
      <div className={`${GLASS_PANEL_HEAVY} w-full max-w-md rounded-2xl p-6 animate-in zoom-in-95 duration-300`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase">Pause</p>
            <h2 className="font-display text-3xl italic text-white drop-shadow-lg">Portneuf</h2>
          </div>
          <button
            type="button"
            className={`flex size-10 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors`}
            onClick={() => useGameStore.getState().togglePause()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-300">
          <span className={`${HUD_NUM} font-semibold text-white`}>{formatCad(cash)}</span> ·
          <span className={`${HUD_NUM}`}> {Number(km || 0).toFixed(1)} km</span> ·
          {visited.length}/{POIS.length} lieux ·
          {leaves.length}/{MAPLE_LEAVES.length} érables ·
          <span className="text-red-400">{fines}&nbsp;$ d'amendes</span>
          {wantedStars > 0 ? ` · ${wantedStars}★ SQ` : ""}
        </p>
        <p className="mt-1 text-[11px] text-gray-500">
          {stats.villages} villages · {stats.totalPopulation.toLocaleString("fr-CA")} habitants
        </p>
        {bag.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            Sac : {bag.map(([id, n]) => `${itemById(id)?.name ?? id} ×${n}`).join(" · ")}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <MenuBtn icon={<Play className="size-4" />} label="Reprendre" onClick={() => useGameStore.getState().togglePause()} />
          <MenuBtn icon={<MapIcon className="size-4" />} label="Carte" onClick={() => useGameStore.getState().setHud({ showMap: true, paused: true })} />
          <MenuBtn icon={night ? <Sun className="size-4" /> : <Moon className="size-4" />} label={night ? "Jour" : "Nuit"} onClick={() => engine?.toggleNight()} />
          <MenuBtn icon={<RotateCcw className="size-4" />} label="Respawn 138" onClick={() => { engine?.respawn(); useGameStore.getState().togglePause(); }} />
          <MenuBtn icon={<Smartphone className="size-4" />} label="Téléphone" onClick={() => useGameStore.getState().openPhone()} />
          <MenuBtn icon={<User className="size-4" />} label="Personnage" onClick={() => useGameStore.getState().openCreator()} />
          <MenuBtn icon={<ShoppingBag className="size-4" />} label="Sac" onClick={() => useGameStore.getState().openInventory()} />
          <MenuBtn icon={<Car className="size-4" />} label="Garage" onClick={() => useGameStore.getState().openGarage()} />
          <MenuBtn icon={<Truck className="size-4" />} label="Transport" onClick={() => useGameStore.getState().openJobs()} />
          <MenuBtn icon={<Briefcase className="size-4" />} label="Entreprise" onClick={() => useGameStore.getState().openFirm()} />
          <MenuBtn icon={<Hammer className="size-4" />} label="Builder" onClick={() => { useGameStore.getState().togglePause(); useGameStore.getState().toggleBuild(); }} />
          <MenuBtn icon={<Terminal className="size-4" />} label="Console" onClick={() => useGameStore.getState().openConsole()} />
          <MenuBtn icon={<Hand className="size-4" />} label="Gestes RP" onClick={() => { useGameStore.getState().togglePause(); useGameStore.getState().openGesture(); }} />
        </div>
        <p className="mt-3 text-center text-[11px] text-gray-500">U gestes · V caméra · X se rendre · C capot</p>
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
      className={`flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-medium ${BTN_HOVER} hover:border-white/30`}
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
      <p className="text-[10px] tracking-[0.2em] text-gray-400 uppercase">Aller à</p>
      <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/5">
        {POIS.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`flex w-full items-center justify-between border-b border-white/5 px-3 py-2 text-left text-sm text-white last:border-0 ${BTN_HOVER}`}
            onClick={() => {
              engine?.teleport(n.x, n.z - 18);
              useGameStore.getState().setHud({ paused: false, showMap: false });
            }}
          >
            <span>{n.name}</span>
            <span className={`text-[10px] uppercase tracking-wider ${visited.includes(n.id) ? "text-green-400" : "text-gray-500"}`}>
              {visited.includes(n.id) ? "vu" : "nouveau"}
            </span>
          </button>
        ))}
        {shops.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`flex w-full items-center justify-between border-b border-white/5 px-3 py-2 text-left text-sm text-white last:border-0 ${BTN_HOVER}`}
            onClick={() => {
              engine?.teleport(s.x, s.z + 5);
              useGameStore.getState().setHud({ paused: false, showMap: false, shopOpen: false });
            }}
          >
            <span>{s.name}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              {s.kind === "food" ? "casse-croûte" : s.kind === "clothing" ? "boutique" : s.kind === "chasse" ? "chasse" : s.kind === "quincaillerie" ? "quincaillerie" : s.kind === "sqdc" ? "SQDC" : "dépanneur"}
            </span>
          </button>
        ))}
        {COMMERCIALS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`flex w-full items-center justify-between border-b border-white/5 px-3 py-2 text-left text-sm text-white last:border-0 ${BTN_HOVER}`}
            onClick={() => {
              engine?.teleport(c.x, c.z + 6);
              useGameStore.getState().openDeed(c.id);
            }}
          >
            <span>{c.name}</span>
            <span className="text-[10px] text-yellow-400 uppercase tracking-wider">MLS</span>
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
  const title = shop?.name ?? (aisleItems && shopAisle && catalogForSqdcAisle(shopAisle).length ? "SQDC" : aisleItems && shopAisle && catalogForCasseAisle(shopAisle).length ? "Casse-croûte" : "Dépanneur");
  const kind = shop?.kind ?? (aisleItems && shopAisle && catalogForSqdcAisle(shopAisle).length ? "sqdc" : "depanneur");
  const items = aisleItems && aisleItems.length > 0 ? aisleItems : catalogFor(kind);

  const inventoryMap = inventory as Record<string, number>;
  const bag = Object.entries(inventoryMap)
    .filter(([, n]) => Number(n) > 0)
    .map(([id, n]) => ({ item: itemById(id), n: Number(n) }))
    .filter((x): x is { item: ShopItem; n: number } => Boolean(x.item));
  const sqdc = kind === "sqdc";
  const hasId = (inventory.identite ?? 0) > 0;

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/60 backdrop-blur-md px-3 py-4 sm:items-center animate-in fade-in duration-200">
      <div className={`${GLASS_PANEL_HEAVY} w-full max-w-lg rounded-2xl p-6 animate-in slide-in-from-bottom-8 duration-300`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-gray-400 uppercase">
              {sqdc ? "SQDC · 21 ans et plus" : shopAisle ? shopAisle : "Commerce"}
            </p>
            <h2 className="font-display text-3xl italic text-white drop-shadow-md">{title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-300">
              <Wallet className="size-3.5 text-green-400" />
              <span className={`${HUD_NUM} font-semibold text-white`}>{formatCad(cash)}</span>
              {shop?.hours ? <span className="text-gray-500">· {shop.hours}</span> : null}
            </p>
            {sqdc && (
              <p className={`mt-2 text-xs font-medium ${hasId ? "text-green-400" : "text-red-400"}`}>
                {hasId ? "Identité vérifiée" : "Pièce d'identité requise à la caisse"}
              </p>
            )}
          </div>
          <button
            type="button"
            className={`flex size-11 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors`}
            onClick={() => useGameStore.getState().closeShop()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            className={`h-10 rounded-lg text-sm font-medium transition-all ${tab === "buy" ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"}`}
            onClick={() => setTab("buy")}
          >
            Acheter
          </button>
          <button
            type="button"
            className={`h-10 rounded-lg text-sm font-medium transition-all ${tab === "sell" ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"}`}
            onClick={() => setTab("sell")}
          >
            Vendre
          </button>
        </div>

        {notice && <p className="mt-3 text-sm text-yellow-400 font-medium">{notice}</p>}

        <ul className="mt-4 max-h-[46vh] space-y-1.5 overflow-auto pr-1">
          {tab === "buy" &&
            items.map((item) => {
              const owned = inventory[item.id] ?? 0;
              const inCart = cart[item.id] ?? 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => useGameStore.getState().addToCart(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-left ${BTN_HOVER} hover:border-white/20`}
                  >
                    <ProductThumb id={item.id} icon={item.icon} alt={item.name} className="size-12 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white font-medium">
                        {item.name}
                        {owned > 0 ? <span className="text-gray-400"> · ×{owned}</span> : null}
                        {inCart > 0 ? <span className="text-yellow-400"> · panier {inCart}</span> : null}
                      </span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {item.desc}
                        {item.hunger || item.thirst ? (
                          <span className="text-gray-500">
                            {item.hunger ? ` · faim +${item.hunger}` : ""}
                            {item.thirst ? ` · soif +${item.thirst}` : ""}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className={`${HUD_NUM} shrink-0 text-sm text-white font-semibold`}>{formatCad(item.price)}</span>
                  </button>
                </li>
              );
            })}
          {tab === "sell" && bag.length === 0 && (
            <li className="px-1 py-6 text-center text-sm text-gray-500">Sac vide — rien à revendre (60 %).</li>
          )}
          {tab === "sell" &&
            bag.map(({ item, n }) => {
              const price = sellPrice(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => useGameStore.getState().sellItem(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-left ${BTN_HOVER} hover:border-green-500/30`}
                  >
                    <ProductThumb id={item.id} icon={item.icon} alt={item.name} className="size-12 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white font-medium">
                        {item.name}
                        <span className="text-gray-400"> · ×{n}</span>
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">Le magasin rachète à 60 %</span>
                    </span>
                    <span className={`${HUD_NUM} shrink-0 text-sm text-green-400 font-semibold`}>+{formatCad(price)}</span>
                  </button>
                </li>
              );
            })}
        </ul>

        {tab === "buy" && cartCount(cart) > 0 && (
          <button
            type="button"
            className={`mt-4 flex h-12 w-full items-center justify-between rounded-xl px-4 text-sm font-semibold ${
              sqdc ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/40" : "bg-white hover:bg-gray-100 text-black shadow-lg shadow-white/20"
            } transition-colors`}
            onClick={() => useGameStore.getState().openCart()}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Caisse · {cartCount(cart)} article{cartCount(cart) > 1 ? "s" : ""}
            </span>
            <span className={`${HUD_NUM}`}>{formatCad(cartTotals(cart).total)}</span>
          </button>
        )}
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
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
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md px-3 py-4 sm:items-center animate-in fade-in duration-200">
      <div className={`${GLASS_PANEL_HEAVY} w-full max-w-md rounded-2xl p-6 border-red-500/30 animate-in zoom-in-95 duration-300`}>
        <p className="text-[10px] tracking-[0.25em] text-red-400 uppercase font-semibold">
          {arrest ? "Sûreté du Québec · Arrestation" : "Constat d'infraction"}
        </p>
        <h2 className="mt-1 font-display text-3xl italic text-white drop-shadow-md">
          {arrest ? "Mise sous arrêt" : "Contravention CSR"}
        </h2>
        <p className="mt-3 text-sm text-white font-medium">{citation.article}</p>
        <p className="mt-1 text-sm text-gray-300">{citation.description}</p>
        {(citation.ticketNumber || citation.badge) && (
          <p className="mt-2 text-[11px] tracking-[0.12em] text-gray-500 uppercase">
            {citation.ticketNumber ? citation.ticketNumber : "Constat"}
            {citation.badge ? ` · ${citation.badge}` : ""}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-3">
          <span className="text-xs text-gray-400">
            {citation.points > 0 ? `${citation.points} points d'inaptitude` : "Sans points"}
          </span>
          <span className={`${HUD_NUM} text-xl text-red-400 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]`}>
            {formatCad(citation.fine)}
          </span>
        </div>
        {arrest && (
          <p className="mt-3 text-xs leading-relaxed text-gray-400">
            Cellule du poste SQ Portneuf. Le pick-up vous attend dans la cour. Signez le constat pour sortir.
          </p>
        )}
        <button
          type="button"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-black shadow-lg shadow-white/10 hover:bg-gray-100 active:scale-[0.98] transition-all"
          onClick={() => useGameStore.getState().payCitation()}
        >
          <Shield className="size-4" />
          {arrest ? "Signer et payer" : "Payer le constat"}
        </button>
        <button
          type="button"
          className="mt-2 flex h-10 w-full items-center justify-center text-xs text-gray-500 hover:text-white transition-colors"
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`${GLASS_PANEL_HEAVY} w-full max-w-lg rounded-2xl p-5 animate-in zoom-in-95 duration-300`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl italic text-white drop-shadow-md">Carte du comté</h2>
          <button
            type="button"
            className={`size-10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors`}
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
      x, z, yaw: 0,
      owned: ownedIds(ownedProps, realty),
      haul: null,
      wantedStars: 0,
      labels: true,
      playerDot: "ring",
    });
  }, [x, z, ownedProps, realty]);

  return <canvas ref={ref} width={640} height={360} className="w-full rounded-xl border border-white/5" />;
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
          <HoldBtn label="E" onHold={(v) => { input.touchInteract = v; }} />
        )}
        <HoldBtn label="Gaz" onHold={(v) => (input.touchThrottle = v ? 1 : 0)} />
        <HoldBtn label="Frein" onHold={(v) => (input.touchBrake = v ? 1 : 0)} />
        <HoldBtn label="Glisse" onHold={(v) => (input.touchHandbrake = v)} />
        <button
          type="button"
          className={`${GLASS_PANEL} ${BTN_HOVER} h-12 min-w-20 rounded-xl px-4 text-sm text-white font-medium`}
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
          className={`${GLASS_PANEL} ${BTN_HOVER} h-12 min-w-20 rounded-xl px-4 text-sm text-white font-medium`}
          onClick={() => useGameStore.getState().toggleGesture()}
        >
          Gestes
        </button>
      </div>
      <button
        type="button"
        className={`pointer-events-auto absolute top-4 right-4 ${GLASS_PANEL} ${BTN_HOVER} flex size-11 items-center justify-center rounded-xl text-white`}
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
      className={`${GLASS_PANEL} h-12 min-w-20 rounded-xl px-4 text-sm text-white font-medium ${BTN_HOVER}`}
      onPointerDown={(e) => { e.preventDefault(); onHold(true); }}
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
      className="pointer-events-auto absolute bottom-24 left-6 size-32 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl shadow-[inset_0_2px_16px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.5)]"
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
      <div
        ref={knob}
        className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-white/30 to-white/5 border border-white/20 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform duration-75"
      />
    </div>
  );
}

function gestureIcon(id: RpGesture) {
  switch (id) {
    case "wave": return Hand;
    case "surrender": return Hand;
    case "cross_arms": return Users;
    case "point": return Pointer;
    case "dance": return Music2;
    case "gang_sign": return Handshake;
    case "sit": return User;
    case "phone": return Smartphone;
    case "salute": return Shield;
    default: return Hand;
  }
}

function GestureWheel({ current }: { current: RpGesture }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
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
              className={`absolute flex size-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border transition-all duration-200 ${
                on
                  ? "border-white bg-white text-black scale-110 shadow-[0_0_24px_rgba(255,255,255,0.4)]"
                  : "border-white/20 bg-black/60 backdrop-blur-xl text-white hover:bg-white/10 hover:border-white/40"
              }`}
              style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
              onClick={() => window.__portneuf?.playGesture(g.id)}
            >
              <Icon className="size-4" />
              <span className="mt-0.5 max-w-14 truncate text-[10px] font-medium">{g.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/20 bg-black/70 backdrop-blur-xl text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all"
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