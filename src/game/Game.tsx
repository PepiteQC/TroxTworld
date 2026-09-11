import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Briefcase,
  Car,
  Hammer,
  KeyRound,
  Compass,
  DoorOpen,
  Droplets,
  Flame,
  Footprints,
  Leaf,
  Map as MapIcon,
  Moon,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sprout,
  Star,
  Sun,
  Terminal,
  Truck,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { AdminBar } from "./AdminBar";
import { BuilderOverlay } from "./buildui";
import { CreatorOverlay } from "./creator";
import { bagCapacity, bagWeight, cartCount, cartTotals, catalogFor, formatCad, itemById, sellPrice, type ShopItem } from "./commerce";
import type { PortneufEngine } from "./engine";
import { input } from "./input";
import { InventoryOverlay, GarageOverlay } from "./inventory";
import { CartOverlay } from "./panier";
import { AtmOverlay, DeedOverlay } from "./rpui";
import { ElevatorOverlay } from "./elevator";
import { FirmOverlay } from "./firm";
import { JobsOverlay } from "./haul";
import { ProductThumb } from "./productThumb";
import { LockOverlay, PhoneOverlay } from "./phone";
import { persist, useGameStore } from "./store";
import { survivalLabel } from "./survival";
import { quebecFM } from "./radio";
import { A40_EXITS, getVillageAt, getWorldStats, INDUSTRY_LABEL, LAKES, MAPLE_LEAVES, POIS, ROADS, SPAWN, VILLAGES, WORLD } from "./worlddata";
import { CROPS, farmMapMarks } from "./farms";
import { sugarMapMarks } from "./sugar";
import { DEEDS } from "./rp";
import { catalogForAisle, depMapMarks } from "./depanneur";
import { WORLD_ENGINE_VERSION } from "./worldapi";

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
  const buildOpen = useGameStore((s) => s.buildOpen);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
          void WORLD_ENGINE_VERSION;
          if (qa) useGameStore.getState().start();
        } catch (err) {
          console.error(err);
          useGameStore.getState().setHud({ loading: false });
          setBootError(err instanceof Error ? err.message : "Le moteur 3D a échoué.");
        }
      })
      .catch((err) => {
        console.error(err);
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

  return (
    <div className="game-root">
      <canvas ref={canvasRef} />
      <Hud />
      <TouchPad />
      {!playing && <StartScreen loading={loading} error={bootError} />}
      {playing && paused && !showMap && !shopOpen && !phoneOpen && !lockOpen && !consoleOpen && !citationOpen && !creatorOpen && !inventoryOpen && !garageOpen && !jobsOpen && !firmOpen && !cartOpen && !atmOpen && !propertyOpen && !elevatorOpen && (
        <PauseMenu engine={engineRef.current} />
      )}
      {playing && showMap && <MapOverlay engine={engineRef.current} />}
      {playing && shopOpen && <ShopOverlay />}
      {playing && phoneOpen && <PhoneOverlay />}
      {playing && lockOpen && (
        <LockOverlay onGranted={() => engineRef.current?.enterPendingInterior()} />
      )}
      {playing && consoleOpen && <AdminBar engine={engineRef.current} />}
      {playing && citationOpen && <CitationOverlay />}
      {playing && creatorOpen && <CreatorOverlay engine={engineRef.current} />}
      {playing && inventoryOpen && <InventoryOverlay engine={engineRef.current} />}
      {playing && garageOpen && <GarageOverlay engine={engineRef.current} />}
      {playing && jobsOpen && <JobsOverlay />}
      {playing && firmOpen && <FirmOverlay />}
      {playing && cartOpen && <CartOverlay />}
      {playing && atmOpen && <AtmOverlay />}
      {playing && propertyOpen && <DeedOverlay engine={engineRef.current} />}
      {playing && elevatorOpen && (
        <ElevatorOverlay onFloor={(id) => engineRef.current?.showFloor(id)} />
      )}
      {playing && buildOpen && <BuilderOverlay engine={engineRef.current} />}
    </div>
  );
}

function StartScreen({ loading, error }: { loading: boolean; error: string | null }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end bg-linear-to-t from-bg via-bg/80 to-transparent px-6 pb-16 pt-10 sm:justify-center sm:pb-0">
      <div className="max-w-xl text-center">
        <p className="text-xs tracking-[0.35em] text-accent uppercase">Comté de Portneuf</p>
        <h1 className="mt-3 font-display text-6xl italic leading-none text-fg sm:text-7xl">
          Portneuf
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Le Chemin du Roy, l'A-40 Félix-Leclerc et ses sorties 250 à 285, les rangs laitiers,
          l'éboulis de 1894 et les lacs des Laurentides. Prenez la 138, l'entrée d'autoroute,
          descendez du pick-up, entrez au dépanneur. Hôtel : NIP 1234.
        </p>
        {error ? (
          <p className="mt-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : (
        <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          disabled={loading}
          aria-label="Start"
          onClick={() => {
            useGameStore.getState().start();
            void quebecFM.ensure().then(() => {
              const s = useGameStore.getState();
              if (s.radioOn && s.radioId) quebecFM.setStation(s.radioId);
            });
          }}
          className="inline-flex h-12 min-w-52 items-center justify-center rounded-lg bg-fg px-8 text-sm font-medium text-accent-fg transition-transform duration-150 hover:scale-[0.99] disabled:opacity-50"
        >
          {loading ? "Chargement du comté…" : "Prendre la route"}
          <span className="sr-only">Start</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            useGameStore.getState().start();
            useGameStore.getState().openCreator();
            void quebecFM.ensure().then(() => {
              const s = useGameStore.getState();
              if (s.radioOn && s.radioId) quebecFM.setStation(s.radioId);
            });
          }}
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
          <li>C — caméra · N — nuit</li>
          <li>M — carte · P — téléphone</li>
          <li>R — radio FM</li>
          <li>F1 — console · Échap — pause</li>
          <li>Personnage — tenue, halo, nom</li>
          <li>I — sac · G — garage</li>
          <li>Outils — chantier, foin, bois</li>
          <li>Champs, vaches, érablières — E</li>
          <li>Maisons vides, rénos, clés — E</li>
          <li>Dépanneur — entrer, rayons, caisse</li>
          <li>J — contrats de transport</li>
          <li>K — entreprise, NEQ, permis</li>
          <li>G — flotte commerciale Gosselin</li>
          <li>Sac à dos — Boutique Éther</li>
          <li>Charge — sac gonfle, démarche plus lourde</li>
        </ul>
      </div>
    </div>
  );
}

function Hud() {
  const playing = useGameStore((s) => s.playing);
  const speed = useGameStore((s) => s.speedKmh);
  const limit = useGameStore((s) => s.limit);
  const zone = useGameStore((s) => s.zone);
  const surface = useGameStore((s) => s.surface);
  const speeding = useGameStore((s) => s.speeding);
  const fineFlash = useGameStore((s) => s.fineFlash);
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
  const firm = useGameStore((s) => s.firm);
  const surv = useGameStore((s) => s.surv);
  const gridOutage = useGameStore((s) => s.gridOutage);
  const houses = useGameStore((s) => s.houses);
  const deedId = useGameStore((s) => s.deedId);
  const interiorKind = useGameStore((s) => s.interiorKind);

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
            {here && (
              <p className="mt-0.5 text-[11px] text-subtle">
                {here.motto} · {INDUSTRY_LABEL[here.industry]} · {here.founded}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="hud-panel flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted">
              {night ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
              <span className="hud-num">
                {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}
              </span>
            </div>
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
            {selectedSeed && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <Sprout className={`size-3.5 ${CROPS[selectedSeed].illegal ? "text-danger" : "text-ok"}`} />
                <span className="text-fg">{CROPS[selectedSeed].label}</span>
              </div>
            )}
            {ownedProps.length > 0 && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <KeyRound className="size-3.5 text-accent" />
                <span className="text-fg">{ownedProps.length} maison{ownedProps.length > 1 ? "s" : ""}</span>
              </div>
            )}
            {gridOutage && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-danger">
                <Zap className="size-3.5" />
                <span>{gridOutage.kind === "verglas" ? "Verglas" : "Panne Hydro"}</span>
              </div>
            )}
            {mode === "interior" && interiorKind === "home" && deedId && houses[deedId] && (
              <div className="hud-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted">
                <Flame className={`size-3.5 ${houses[deedId]!.heatOn ? "text-accent" : "text-subtle"}`} />
                <span className="hud-num text-fg">{Math.round(houses[deedId]!.indoorC)}°</span>
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
                  {loadKg.toFixed(1)}/{loadCap} kg
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
              <p className="hud-num text-[10px] text-muted">{surv.bodyTemp.toFixed(1)} °C · {Math.round(surv.felt)}° air</p>
              <div className="mt-1 space-y-0.5">
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full ${surv.hunger < 20 ? "bg-danger" : "bg-ok"}`} style={{ width: `${surv.hunger}%` }} />
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full ${surv.thirst < 20 ? "bg-danger" : "bg-accent"}`} style={{ width: `${surv.thirst}%` }} />
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full ${surv.bodyTemp < 35 ? "bg-danger" : surv.bodyTemp > 38.5 ? "bg-accent" : "bg-ok"}`} style={{ width: `${Math.min(100, Math.max(0, (surv.bodyTemp - 32) * 12.5))}%` }} />
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
        {wantedStars > 0 && !shopOpen && !citationOpen && (
          <div className="absolute top-20 left-1/2 z-10 -translate-x-1/2">
            <div className="hud-panel rounded-lg px-3 py-1.5 text-center sm:px-4 sm:py-2">
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-3.5 sm:size-4 ${i < wantedStars ? "fill-danger text-danger" : "text-subtle"}`}
                  />
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
          {prompt && !citationOpen && (
            <div className="hud-panel flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg">
              {onFoot ? <DoorOpen className="size-4 text-accent" /> : <Footprints className="size-4 text-accent" />}
              <span>{prompt}</span>
            </div>
          )}
          {!citationOpen && (
          <div
            className={`hud-panel rounded-xl px-6 py-3 text-center ${speeding ? "border-danger text-danger" : ""}`}
          >
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
            <Compass
              className="size-6 text-accent"
              style={{ transform: `rotate(${(-yaw * 180) / Math.PI}deg)` }}
            />
          </div>
          <button
            type="button"
            className="pointer-events-auto hud-panel flex size-12 items-center justify-center rounded-full"
            onClick={() => useGameStore.getState().openPhone()}
            aria-label="Téléphone"
          >
            <Smartphone className="size-5 text-accent" />
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
      {chat.length > 0 && (
        <div className="pointer-events-none absolute bottom-24 left-4 z-20 flex max-w-sm flex-col gap-1">
          {chat.slice(-5).map((m) => (
            <div key={m.id} className="hud-panel rounded-md px-3 py-1.5 text-xs">
              <span className={m.type === "admin" ? "text-accent" : m.type === "system" ? "text-subtle" : "text-fg"}>
                {m.sender}
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
    </>
  );
}

function MiniMap() {
  const x = useGameStore((s) => s.x);
  const z = useGameStore((s) => s.z);
  const yaw = useGameStore((s) => s.yaw);
  const wantedStars = useGameStore((s) => s.wantedStars);
  const haul = useGameStore((s) => s.job);
  const ownedProps = useGameStore((s) => s.ownedProps);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#141c18";
    ctx.fillRect(0, 0, w, h);
    const sx = (px: number) => ((px - WORLD.minX) / WORLD.width) * w;
    const sy = (pz: number) => ((pz - WORLD.minZ) / WORLD.depth) * h;
    ctx.fillStyle = "#2a4a68";
    ctx.fillRect(0, sy(96), w, h);
    for (const f of farmMapMarks()) {
      ctx.save();
      ctx.translate(sx(f.x), sy(f.z));
      ctx.rotate(-f.yaw);
      const rw = (f.w / WORLD.width) * w;
      const rh = (f.d / WORLD.depth) * h;
      ctx.fillStyle = f.illegal ? "#3a5a32" : "#5a7a3a";
      ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
      ctx.restore();
    }
    ctx.fillStyle = "#c45a28";
    for (const s of sugarMapMarks()) {
      ctx.beginPath();
      ctx.arc(sx(s.x), sy(s.z), 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const d of DEEDS) {
      ctx.fillStyle = ownedProps.includes(d.id) ? "#c4a030" : "#6a7068";
      ctx.fillRect(sx(d.x) - 2, sy(d.z) - 2, 4, 4);
    }
    ctx.fillStyle = "#c03028";
    for (const s of depMapMarks()) {
      ctx.fillRect(sx(s.x) - 2, sy(s.z) - 2, 4, 4);
    }
    for (const road of ROADS) {
      if (road.kind === "highway") {
        ctx.strokeStyle = "#e8c84a";
        ctx.lineWidth = 3.2;
      } else if (road.kind === "ramp") {
        ctx.strokeStyle = "#c4a030";
        ctx.lineWidth = 1.1;
      } else if (road.kind === "regional") {
        ctx.strokeStyle = "#d8d0c0";
        ctx.lineWidth = 2.2;
      } else {
        ctx.strokeStyle = "#4a4a52";
        ctx.lineWidth = 1.4;
      }
      ctx.beginPath();
      road.points.forEach(([px, pz], i) => {
        if (i === 0) {
          ctx.moveTo(sx(px), sy(pz));
        } else {
          ctx.lineTo(sx(px), sy(pz));
        }
      });
      ctx.stroke();
    }
    ctx.fillStyle = "#6a9a62";
    for (const v of VILLAGES) {
      ctx.beginPath();
      ctx.arc(sx(v.center[0]), sy(v.center[1]), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#1a4a60";
    for (const lake of LAKES) {
      ctx.beginPath();
      ctx.arc(sx(lake.x), sy(lake.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (wantedStars > 0) {
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
    if (haul) {
      const t = haul.loaded ? haul.to : haul.from;
      ctx.fillStyle = "#e8c84a";
      ctx.beginPath();
      ctx.arc(sx(t.x), sy(t.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ece8de";
    const u = sx(x);
    const d = sy(z);
    ctx.save();
    ctx.translate(u, d);
    ctx.rotate(-yaw);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [x, z, yaw, wantedStars, haul, ownedProps]);
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
  const bag = Object.entries(inventory).filter(([, n]) => n > 0);
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
          {formatCad(cash)} · {km.toFixed(1)} km · {visited.length}/{POIS.length} lieux · {leaves.length}/{MAPLE_LEAVES.length} érables · {fines}&nbsp;$ d'amendes
          {wantedStars > 0 ? ` · ${wantedStars}★ SQ` : ""}
        </p>
        <p className="mt-1 text-[11px] text-subtle">
          {getWorldStats().villages} villages · {getWorldStats().totalPopulation.toLocaleString("fr-CA")} habitants
        </p>
        {bag.length > 0 && (
          <p className="mt-2 text-xs text-subtle">
            Sac : {bag.map(([id, n]) => `${itemById(id)?.name ?? id} ×${n}`).join(" · ")}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <MenuBtn
            icon={<Play className="size-4" />}
            label="Reprendre"
            onClick={() => useGameStore.getState().togglePause()}
          />
          <MenuBtn
            icon={<MapIcon className="size-4" />}
            label="Carte"
            onClick={() => useGameStore.getState().setHud({ showMap: true, paused: true })}
          />
          <MenuBtn
            icon={night ? <Sun className="size-4" /> : <Moon className="size-4" />}
            label={night ? "Jour" : "Nuit"}
            onClick={() => engine?.toggleNight()}
          />
          <MenuBtn
            icon={<RotateCcw className="size-4" />}
            label="Respawn 138"
            onClick={() => {
              engine?.respawn();
              useGameStore.getState().togglePause();
            }}
          />
          <MenuBtn
            icon={<Smartphone className="size-4" />}
            label="Téléphone"
            onClick={() => useGameStore.getState().openPhone()}
          />
          <MenuBtn
            icon={<User className="size-4" />}
            label="Personnage"
            onClick={() => useGameStore.getState().openCreator()}
          />
          <MenuBtn
            icon={<ShoppingBag className="size-4" />}
            label="Sac"
            onClick={() => useGameStore.getState().openInventory()}
          />
          <MenuBtn
            icon={<Car className="size-4" />}
            label="Garage"
            onClick={() => useGameStore.getState().openGarage()}
          />
          <MenuBtn
            icon={<Truck className="size-4" />}
            label="Transport"
            onClick={() => useGameStore.getState().openJobs()}
          />
          <MenuBtn
            icon={<Briefcase className="size-4" />}
            label="Entreprise"
            onClick={() => useGameStore.getState().openFirm()}
          />
          <MenuBtn
            icon={<Hammer className="size-4" />}
            label="Builder"
            onClick={() => {
              useGameStore.getState().togglePause();
              useGameStore.getState().toggleBuild();
            }}
          />
          <MenuBtn
            icon={<Terminal className="size-4" />}
            label="Console"
            onClick={() => useGameStore.getState().openConsole()}
          />
        </div>
        <MapList engine={engine} />
      </div>
    </div>
  );
}

function MenuBtn({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
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
        {engine?.world.shops.map((s) => (
          <button
            key={s.id}
            type="button"
            className="flex w-full items-center justify-between border-b border-border py-2 text-left text-sm text-fg last:border-0"
            onClick={() => {
              engine.teleport(s.x, s.z + 5);
              useGameStore.getState().setHud({ paused: false, showMap: false, shopOpen: false });
            }}
          >
            <span>{s.name}</span>
            <span className="text-[10px] text-subtle">
              {s.kind === "food" ? "casse-croûte" : s.kind === "clothing" ? "boutique" : s.kind === "chasse" ? "chasse" : s.kind === "quincaillerie" ? "quincaillerie" : "dépanneur"}
            </span>
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
  const shops = typeof window !== "undefined" ? window.__portneuf?.world.shops : undefined;
  const shop = shops?.find((s) => s.id === shopId);
  const aisleItems = shopAisle ? catalogForAisle(shopAisle) : null;
  const title = shop?.name ?? "Dépanneur";
  const kind = shop?.kind ?? "depanneur";
  const items = aisleItems && aisleItems.length > 0 ? aisleItems : catalogFor(kind);
  const bag = Object.entries(inventory)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ item: itemById(id), n }))
    .filter((x): x is { item: ShopItem; n: number } => Boolean(x.item));

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">
              {shopAisle ? shopAisle : "Commerce"}
            </p>
            <h2 className="font-display text-3xl italic">{title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Wallet className="size-3.5 text-accent" />
              {formatCad(cash)}
              {shop?.hours ? <span className="text-subtle">· {shop.hours}</span> : null}
            </p>
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
          <button
            type="button"
            className={`h-9 rounded-md text-sm ${tab === "buy" ? "bg-surface-2 text-fg" : "text-muted"}`}
            onClick={() => setTab("buy")}
          >
            Acheter
          </button>
          <button
            type="button"
            className={`h-9 rounded-md text-sm ${tab === "sell" ? "bg-surface-2 text-fg" : "text-muted"}`}
            onClick={() => setTab("sell")}
          >
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
                      <span className="block text-xs text-muted">{item.desc}</span>
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
            className="mt-4 flex h-11 w-full items-center justify-between rounded-md bg-accent px-3 text-sm text-bg"
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
          onClick={() => useGameStore.getState().closeCitation()}
        >
          <Shield className="size-4" />
          {arrest ? "Signer et sortir" : "Payer le constat"}
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
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#121a16";
    ctx.fillRect(0, 0, w, h);
    const sx = (px: number) => ((px - WORLD.minX) / WORLD.width) * w;
    const sy = (pz: number) => ((pz - WORLD.minZ) / WORLD.depth) * h;
    ctx.fillStyle = "#1c3a52";
    ctx.fillRect(0, sy(96), w, h);
    for (const f of farmMapMarks()) {
      ctx.save();
      ctx.translate(sx(f.x), sy(f.z));
      ctx.rotate(-f.yaw);
      const rw = (f.w / WORLD.width) * w;
      const rh = (f.d / WORLD.depth) * h;
      ctx.fillStyle = f.illegal ? "#2e4a2a" : "#4a6a32";
      ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
      ctx.restore();
    }
    ctx.fillStyle = "#c45a28";
    for (const s of sugarMapMarks()) {
      ctx.beginPath();
      ctx.arc(sx(s.x), sy(s.z), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const d of DEEDS) {
      ctx.fillStyle = ownedProps.includes(d.id) ? "#c4a030" : "#7a8078";
      ctx.fillRect(sx(d.x) - 3, sy(d.z) - 3, 6, 6);
    }
    ctx.fillStyle = "#c03028";
    for (const s of depMapMarks()) {
      ctx.fillRect(sx(s.x) - 3, sy(s.z) - 3, 6, 6);
    }
    for (const road of ROADS) {
      if (road.kind === "highway") {
        ctx.strokeStyle = "#e8c84a";
        ctx.lineWidth = 4;
      } else if (road.kind === "ramp") {
        ctx.strokeStyle = "#c4a030";
        ctx.lineWidth = 1.4;
      } else if (road.kind === "regional") {
        ctx.strokeStyle = "#d8d0c0";
        ctx.lineWidth = 2.6;
      } else {
        ctx.strokeStyle = "#5a5a62";
        ctx.lineWidth = 1.6;
      }
      ctx.beginPath();
      road.points.forEach(([px, pz], i) => {
        if (i === 0) {
          ctx.moveTo(sx(px), sy(pz));
        } else {
          ctx.lineTo(sx(px), sy(pz));
        }
      });
      ctx.stroke();
    }
    ctx.fillStyle = "#ece8de";
    ctx.font = "11px Outfit, sans-serif";
    for (const v of VILLAGES) {
      ctx.fillStyle = "#6a9a62";
      ctx.beginPath();
      ctx.arc(sx(v.center[0]), sy(v.center[1]), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ece8de";
      ctx.fillText(v.name, sx(v.center[0]) + 8, sy(v.center[1]) + 4);
    }
    ctx.fillStyle = "#e8c84a";
    ctx.font = "bold 10px Outfit, sans-serif";
    for (const ex of A40_EXITS) {
      ctx.fillText(ex.no, sx(ex.x) + 4, sy(-178) - 6);
    }
    ctx.fillStyle = "#c44a3a";
    ctx.beginPath();
    ctx.arc(sx(x), sy(z), 5, 0, Math.PI * 2);
    ctx.fill();
  }, [x, z, ownedProps]);
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
    <div className="absolute inset-0 z-[15] pointer-events-none">
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
        const box = ref.current!.getBoundingClientRect();
        onMove(box.left + box.width / 2, box.top + box.height / 2, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        const box = ref.current!.getBoundingClientRect();
        onMove(box.left + box.width / 2, box.top + box.height / 2, e.clientX, e.clientY);
      }}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
    >
      <div
        ref={knob}
        className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80"
      />
    </div>
  );
}
