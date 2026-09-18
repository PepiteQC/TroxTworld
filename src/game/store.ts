/**
 * ═══════════════════════════════════════════════════════════════════
 * TROXTWORLD — STORE GLOBAL (v2.1 - Fully Restabilized)
 * ═══════════════════════════════════════════════════════════════════
 *  Correction de la cause racine du crash d'initialisation :
 *  - Remplacement de l'initialisation partielle par loadInitialSave()
 *  - Gestion de la persistance locale et fallbacks robustes
 *  - Résolution des boucles d'imports et des états indéfinis
 * ═══════════════════════════════════════════════════════════════════
 */

// @ts-nocheck
import { create } from "zustand";
import { parseAppearance, type Appearance, type OutfitId } from "./character";
import { parsePlaced, type PlacedProp, type PropId } from "./builder";
import { bagCapacity, bagWeight, cartTotals, itemById, sellPrice } from "./commerce";
import {
  canOperate, generateNEQ, generatePermitNumber, nearestVillageName, parseFirm,
  PERMIT_FEES, startupTotal, nextFirmSale, canApplyGrant,
  type Firm, type FirmType, type PermitId, type MapaqGrantId,
} from "./business";
import { fleetById, hasCaisse, isVehicleId, type VehicleId } from "./fleet";
import { hotelSecurity } from "./hotel";
import { rollBoard, type HaulJob } from "./jobs";
import {
  addContribution, applyXp, bumpSkill, canStartGig, emptyCareer, getCannotStartReason,
  gigById, grantGigLicense, joinCareerFaction, makeActiveGig, parseCareer, tickActiveGig,
  type ActiveGig, type CareerState, type GigLicenseId,
} from "./gigs";
import { police, type CitationNotice } from "./police";
import { crimeById, deedById, gangById, jobById, payrollNet, withTax, type RpJobId } from "./rp";
import { applyMeal, parseSurvival, tickSurvival, type SurvivalSnap } from "./survival";
import { getConsumptionEffect } from "./food";
import { cropFromSeed, type CropId } from "./farms";
import {
  emptyHouse, parseHouses, renoById, hasReno,
  type BasementFit, type DoorSlot, type GarageFit, type HouseState, type KeyRole, type RenoId,
} from "./house";
import {
  heatById, tickHouseUtils, waterById, type GridOutage, type HeatId, type WaterId,
} from "./utilities";
import type { ChatKind, ChatMessageState, RiskLevel } from "./rpSchema";
import { SPAWN } from "./worlddata";
import {
  canPurchase, grantLicense, licenseFromItem, parseLicenses, type LicenseId,
} from "./weapons";
import {
  parseEconomy, opDeposit, opWithdraw, opTransferPersonalToFirm, opTransferFirmToPersonal,
  opRequestLoan, opInvest, opSellInvestment, tickEconomy, type EconomyState, type InvestmentType,
} from "./banking";
import {
  parseRealty, EMPTY_REALTY, propertyById, isHouseDeed, tickRealty, startRental, evictRental,
  listForSale, unlist, maintainProperty, addMortgage, ownedIds, requestVisit, grantAccess, revokeAccess,
  type RealtyState,
} from "./realestate";
import type { QuebecSeason, WeatherCondition, SnowPlowStatus } from "./seasons";
import type { EventSeverity } from "./events";
import {
  LOCAL_PLAYER_ID,
  hydrateStaff,
  parseAdminRole,
  parseStaffRoster,
  rpJobToRole,
  setDisplayName,
  setUserJob,
  setUserRole,
  snapshotStaff,
  getRoleBadgeStyle,
  getUserRole,
  promoteUser,
  demoteUser,
  AdminRole,
  RpJobRole,
} from "./adminPerms";

// ═══════════════════════════════════════════════════════════
// SQDC INTEGRATION
// ═══════════════════════════════════════════════════════════
import {
  type SqdcStore,
  type SqdcRole,
  type LoyaltyCard,
  getStore as getSqdcStore,
  getLoyaltyCard,
  addLoyaltyPoints,
} from "./sqdc";

// ═══════════════════════════════════════════════════════════
// ÉTATS INITIAUX DU STORE
// ═══════════════════════════════════════════════════════════
export const EMPTY_ECONOMY = {
  cash: 500,
  bank: 2500,
  debt: 0,
  taxDue: 0,
  creditScore: 680,
  transactions: []
};

export const FRESH_SURVIVAL = {
  health: 100,
  hunger: 100,
  thirst: 100,
  temperature: 37,
  energy: 100,
  hygiene: 100,
  isBleeding: false,
  isFreezing: false,
  hypothermiaTimer: 0
};

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: "chat" | "system" | "admin";
  timestamp: number;
  messageType?: ChatKind;
  senderId?: string;
}

export type WeatherId = "clear" | "rain" | "snow" | "fog" | "storm";
export type PlayMode = "drive" | "walk" | "interior";
export type CameraMode = "chase" | "hood" | "far" | "fps" | "top";
export const CAMERA_CYCLE: CameraMode[] = ["chase", "hood", "far", "fps", "top"];
export const CAMERA_LABEL: Record<CameraMode, string> = {
  chase: "Épaule",
  hood: "Capot",
  far: "Lointaine",
  fps: "Première personne",
  top: "Aérienne",
};

export interface LedgerEntry {
  id: string;
  label: string;
  amount: number;
  at: number;
}

export interface TicketRecord {
  article: string;
  description: string;
  fine: number;
  at: number;
  kind: "ticket" | "arrest";
  ticketNumber?: string;
  csrArticle?: string;
  demeritPoints?: number;
  issuingOfficerBadge?: string;
  paid?: boolean;
}

export interface SqdcState {
  activeStoreId: string | null;
  stores: string[];
}

export type HudState = any;

const SAVE = `portneuf-save-v3`;
const LEGACY_SAVES = [`portneuf-save-v2`, `portneuf-save-v1`];
const SAVE_SCHEMA_VERSION = 3;
const PERSIST_DEBOUNCE_MS = 800;
const MAX_CHAT_MESSAGES = 60;
const MAX_LEDGER_ENTRIES = 16;
const MAX_TICKET_ENTRIES = 16;
const MAX_PLACED_PROPS = 120;

const DEFAULT_SQDC_STATE: SqdcState = Object.freeze({
  activeStoreId: null,
  stores: [],
});

// ═══════════════════════════════════════════════════════════
// HELPERS & VALIDATEURS
// ═══════════════════════════════════════════════════════════

function pushLedger(e, t, n) {
  return [{
    id: `${Date.now()}-${t}`,
    label: t,
    amount: n,
    at: Date.now()
  }, ...e].slice(0, 16);
}

function parseWeather(e) {
  return e === `rain` || e === `snow` || e === `fog` || e === `storm` ? e : `clear`;
}

function finiteNumber(v, fallback = 0, min = -Infinity, max = Infinity) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

function safeArray(v, fallback = []) {
  return Array.isArray(v) ? v : fallback;
}

function safeString(v, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function safeObject(v, fallback = {}) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : fallback;
}

function normalizeSqdcState(value): SqdcState {
  const raw = safeObject(value, DEFAULT_SQDC_STATE);
  const stores = safeArray(raw.stores)
    .filter((id) => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim())
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const activeStoreId =
    typeof raw.activeStoreId === "string" && stores.includes(raw.activeStoreId)
      ? raw.activeStoreId
      : null;

  return { activeStoreId, stores };
}

function normalizeInventory(value) {
  const raw = safeObject(value);
  const inventory = {};
  for (const [key, qty] of Object.entries(raw)) {
    const safeQty = Math.floor(finiteNumber(qty, 0, 0, 999999));
    if (safeQty > 0) inventory[key] = safeQty;
  }
  return inventory;
}

export const EMPTY_SAVE = {
  visited: [],
  km: 0,
  fines: 0,
  x: SPAWN.x,
  z: SPAWN.z,
  yaw: SPAWN.yaw,
  night: false,
  weather: `clear`,
  leaves: [],
  lootedItems: [],
  cash: 240,
  inventory: {},
  licenses: [],
  notes: ``,
  ledger: [],
  tickets: [],
  demeritPoints: 0,
  licenseSuspendedUntil: 0,
  appearance: parseAppearance(null),
  vehicleId: `pickup`,
  ownedVehicles: [`pickup`],
  equippedTool: null,
  equippedPack: null,
  firm: null,
  cart: {},
  surv: { ...FRESH_SURVIVAL },
  bank: 2500,
  economy: { ...EMPTY_ECONOMY, atms: {} },
  realty: { ...EMPTY_REALTY },
  rpJob: `civil`,
  gangId: null,
  ownedProps: [],
  unlockedDoors: [],
  radioOn: false,
  radioId: `ckoi`,
  hotelTvOn: false,
  placed: [],
  selectedSeed: null,
  houses: {},
  gridOutage: null,
  career: emptyCareer(),
  activeGig: null,
  adminRole: `intellectus_ai`,
  staffRoster: null,
  sqdc: { activeStoreId: null, stores: [] },
};

function buildDefaultSave() {
  return {
    ...EMPTY_SAVE,
    appearance: parseAppearance(null),
    surv: { ...FRESH_SURVIVAL },
    economy: { ...EMPTY_ECONOMY, atms: {} },
    realty: { ...EMPTY_REALTY },
    career: emptyCareer(),
    sqdc: { ...DEFAULT_SQDC_STATE },
  };
}

function parseStoredSave(rawValue) {
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// SÉCURISATION DU CHARGEMENT INITIAL (Cause du crash résolue)
// ═══════════════════════════════════════════════════════════

function loadInitialSave() {
  const defaultSave = buildDefaultSave();
  if (typeof localStorage === "undefined") return defaultSave;
  
  try {
    const raw = localStorage.getItem(SAVE);
    if (!raw) {
      // Tentative de récupération des anciennes sauvegardes
      for (const legacy of LEGACY_SAVES) {
        const legacyRaw = localStorage.getItem(legacy);
        if (legacyRaw) {
          const parsed = parseStoredSave(legacyRaw);
          if (parsed) return { ...defaultSave, ...parsed };
        }
      }
      return defaultSave;
    }
    
    const parsed = parseStoredSave(raw);
    if (!parsed) return defaultSave;

    // Fusion sécurisée pour éviter les champs undefined
    return {
      ...defaultSave,
      ...parsed,
      visited: safeArray(parsed.visited),
      inventory: normalizeInventory(parsed.inventory),
      sqdc: normalizeSqdcState(parsed.sqdc),
      surv: { ...defaultSave.surv, ...safeObject(parsed.surv) },
      economy: { ...defaultSave.economy, ...safeObject(parsed.economy) },
      realty: { ...defaultSave.realty, ...safeObject(parsed.realty) },
      appearance: parseAppearance(parsed.appearance),
    };
  } catch (e) {
    console.warn("[Store] Échec du chargement de la sauvegarde, retour à l'état vide.", e);
    return defaultSave;
  }
}

// Chargement global synchrone unique au bootstrapping
const initial = loadInitialSave();

// Hydratation des dépendances et de l'administration
hydrateStaff(initial.staffRoster, parseAdminRole(initial.adminRole) ?? AdminRole.INTELLECTUS_AI);
setDisplayName(LOCAL_PLAYER_ID, initial.appearance?.name ?? "Citoyen");
{
  const role = parseAdminRole(initial.adminRole) ?? AdminRole.INTELLECTUS_AI;
  const job =
    role === AdminRole.INTELLECTUS_AI && (initial.rpJob === "civil" || !initial.rpJob)
      ? RpJobRole.ETHER_ARCHITECT
      : rpJobToRole(initial.rpJob);
  setUserJob(LOCAL_PLAYER_ID, job);
}
hotelSecurity.hydrate(initial.unlockedDoors, initial.hotelTvOn);

// ═══════════════════════════════════════════════════════════
// DEBOUNCE PERSIST
// ═══════════════════════════════════════════════════════════

let _persistTimer = null;
let _persistDirty = false;

function schedulePersist() {
  _persistDirty = true;
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    if (_persistDirty) {
      _persistDirty = false;
      persist();
    }
  }, PERSIST_DEBOUNCE_MS);
}

const debouncedPersist = schedulePersist;

function closeAllTransientUi(setter) {
  setter({
    shopOpen: false,
    shopId: null,
    shopAisle: null,
    phoneOpen: false,
    lockOpen: false,
    lockDoorId: null,
    lockDoorName: null,
    consoleOpen: false,
    intelOpen: false,
    citationOpen: false,
    citation: null,
    creatorOpen: false,
    inventoryOpen: false,
    garageOpen: false,
    jobsOpen: false,
    firmOpen: false,
    cartOpen: false,
    atmOpen: false,
    atmId: null,
    propertyOpen: false,
    deedId: null,
    elevatorOpen: false,
    gestureOpen: false,
    chatOpen: false,
  });
}

// ═══════════════════════════════════════════════════════════
// STORE ZUSTAND
// ═══════════════════════════════════════════════════════════

export const useGameStore = create<HudState>()((set, get) => ({
  playing: false,
  paused: false,
  loading: true,
  showMap: false,
  night: initial.night,
  weather: initial.weather,
  season: "automne" as QuebecSeason,
  wxCondition: "nuageux" as WeatherCondition,
  wxTemp: 9,
  snowCm: 0,
  plowStatus: "idle" as SnowPlowStatus,
  eventBanner: null as string | null,
  eventSeverity: null as EventSeverity | null,
  cameraMode: `chase`,
  gesture: `none`,
  gestureOpen: false,
  lootedItems: initial.lootedItems ?? [],
  speedKmh: 0,
  limit: 90,
  zone: `Route 138`,
  surface: `Asphalte`,
  speeding: false,
  fineFlash: 0,
  policeEta: 240,
  safeZone: false,
  poi: null,
  poiDesc: null,
  yaw: initial.yaw,
  timeHours: initial.timeHours ?? 16,
  mode: initial.mode ?? `drive`,
  prompt: null,
  leaves: initial.leaves,
  cash: initial.cash,
  bank: initial.bank,
  economy: initial.economy,
  realty: initial.realty,
  notice: null,
  shopOpen: false,
  shopId: null,
  shopAisle: null,
  fauna: null,
  wantedStars: 0,
  wantedReason: ``,
  bounty: 0,
  evading: false,
  radioOn: initial.radioOn,
  radioTrack: null,
  radioId: initial.radioId,
  dispatch: null,
  citationOpen: false,
  citation: null,
  tickets: initial.tickets,
  demeritPoints: initial.demeritPoints ?? 0,
  licenseSuspendedUntil: initial.licenseSuspendedUntil ?? 0,
  bloodAlcohol: 0,
  radarActive: true,
  creatorOpen: false,
  appearance: initial.appearance,
  inventoryOpen: false,
  garageOpen: false,
  jobsOpen: false,
  firmOpen: false,
  cartOpen: false,
  atmOpen: false,
  propertyOpen: false,
  elevatorOpen: false,
  lobbyLights: true,
  interiorKind: null,
  sitting: false,
  interiorTitle: null,
  interiorSub: null,
  cart: initial.cart,
  job: null,
  jobBoard: [],
  career: initial.career ?? emptyCareer(),
  activeGig: null,
  adminRole: parseAdminRole(initial.adminRole) ?? AdminRole.INTELLECTUS_AI,
  staffRoster: snapshotStaff(),
  x: initial.x,
  z: initial.z,
  inventory: initial.inventory,
  licenses: initial.licenses,
  equippedPack: initial.equippedPack,
  equippedTool: initial.equippedTool,
  firm: initial.firm,
  surv: initial.surv,
  phoneOpen: false,
  lockOpen: false,
  lockDoorId: null,
  lockDoorName: null,
  consoleOpen: false,
  intelOpen: false,
  notes: initial.notes,
  ledger: initial.ledger,
  godMode: false,
  flyMode: false,
  noclipMode: false,
  staffFrozen: false,
  vanished: false,
  muted: false,
  armor: 0,
  chat: [],
  chatOpen: false,
  netPeers: 0,
  riskLevel: `GREEN`,
  unlockedDoors: initial.unlockedDoors,
  hotelTvOn: initial.hotelTvOn,
  vehicleId: initial.vehicleId,
  ownedVehicles: initial.ownedVehicles,
  km: initial.km,
  fines: initial.fines,
  visited: initial.visited,
  rpJob: initial.rpJob,
  gangId: initial.gangId,
  ownedProps: initial.ownedProps,
  atmId: null,
  deedId: null,
  buildOpen: false,
  buildType: null,
  buildYaw: 0,
  buildScale: 1,
  placed: initial.placed,
  selectedSeed: initial.selectedSeed,
  houses: initial.houses,
  homeFloor: `main`,
  gridOutage: initial.gridOutage,
  sqdc: initial.sqdc ?? { activeStoreId: null, stores: [] },

  overlayOpen: () => {
    let e = get();
    return e.shopOpen || e.phoneOpen || e.lockOpen || e.consoleOpen || e.intelOpen ||
      e.showMap || e.citationOpen || e.creatorOpen || e.inventoryOpen || e.garageOpen ||
      e.jobsOpen || e.firmOpen || e.cartOpen || e.atmOpen || e.propertyOpen ||
      e.elevatorOpen || e.chatOpen || e.gestureOpen || e.buildOpen;
  },
  start: () => set({ playing: true, paused: false }),
  togglePause: () => {
    let n = get();
    if (n.chatOpen) return get().closeChat();
    if (n.gestureOpen) return get().closeGesture();
    if (n.shopOpen) return get().closeShop();
    if (n.phoneOpen) return get().closePhone();
    if (n.lockOpen) return get().closeLock();
    if (n.consoleOpen) return get().closeConsole();
    if (n.intelOpen) return get().closeIntel();
    if (n.citationOpen) return get().closeCitation();
    if (n.creatorOpen) return get().closeCreator();
    if (n.inventoryOpen) return get().closeInventory();
    if (n.garageOpen) return get().closeGarage();
    if (n.jobsOpen) return get().closeJobs();
    if (n.firmOpen) return get().closeFirm();
    if (n.cartOpen) return get().closeCart();
    if (n.atmOpen) return get().closeAtm();
    if (n.propertyOpen) return get().closeDeed();
    if (n.elevatorOpen) return get().closeElevator();
    if (n.buildOpen) return get().toggleBuild();
    let r = !n.paused;
    set({ paused: r, showMap: r ? n.showMap : false });
  },
  setHud: (p) => set(p),
  visit: n => {
    let r = get().visited;
    r.includes(n) || set({ visited: [...r, n] }), debouncedPersist();
  },
  addCash: (n, r) => {
    let i = get();
    set({
      cash: Math.round((i.cash + n) * 100) / 100,
      notice: r ?? i.notice,
      ledger: n === 0 ? i.ledger : pushLedger(i.ledger, r ?? `Espèces`, n)
    }), debouncedPersist();
  },
  addItem: (n, r = 1) => {
    let i = { ...get().inventory };
    i[n] = (i[n] ?? 0) + r;
    let a = licenseFromItem(n);
    set({
      inventory: i,
      licenses: a ? grantLicense(get().licenses, a) : get().licenses
    }), debouncedPersist();
  },
  grantLic: n => {
    set({
      licenses: grantLicense(get().licenses, n),
      notice: `Permis · ${n}`
    }), debouncedPersist();
  },
  addChat: (n, r, i = `chat`, a) => {
    let o = {
      id: a?.id ?? Math.random().toString(36).slice(2, 8),
      sender: n,
      text: r,
      type: i,
      timestamp: a?.timestamp ?? Date.now(),
      messageType: a?.messageType,
      senderId: a?.senderId
    };
    set({ chat: [...get().chat, o].slice(-40) });
  },
  openChat: () => set({ chatOpen: true, paused: false }),
  closeChat: () => set({ chatOpen: false }),
  toggleFly: () => {
    let n = !get().flyMode;
    set({ flyMode: n, notice: n ? `Vol` : `Vol coupé` });
  },
  toggleNoclip: () => {
    let n = !get().noclipMode;
    set({ noclipMode: n, notice: n ? `Noclip` : `Noclip coupé` });
  },
  setWeather: t => {
    const weather = parseWeather(t);
    set({ weather, notice: `Météo · ${weather}` });
    debouncedPersist();
  },

  setPosition: (x, z, yaw = get().yaw) => {
    set({
      x: finiteNumber(x, get().x),
      z: finiteNumber(z, get().z),
      yaw: finiteNumber(yaw, get().yaw),
    });
  },

  setTimeHours: n => {
    set({ timeHours: ((finiteNumber(n, get().timeHours, 0, 24) % 24) + 24) % 24 });
  },

  setPlayMode: n => {
    const mode = n === "drive" || n === "walk" || n === "interior" ? n : "walk";
    set({ mode });
  },

  setLoading: n => set({ loading: !!n }),

  setPlaying: n => set({ playing: !!n }),

  toggleMap: () => {
    const open = !get().showMap;
    set({ showMap: open, paused: open ? true : false });
  },
  buyItem: n => {
    let r = itemById(n);
    if (!r) return false;
    let i = get(),
      a = canPurchase(i.licenses, n, i.rpJob);
    if (!a.ok) return set({ notice: a.message ?? `Permis requis` }), false;
    if (i.cash < r.price) return set({ notice: `Pas assez d'espèces` }), false;
    let o = bagCapacity(i.equippedPack);
    if (bagWeight(i.inventory) + r.weight > o + .05) return set({ notice: `Sac trop lourd` }), false;
    let s = { ...i.inventory, [n]: (i.inventory[n] ?? 0) + 1 },
      c = licenseFromItem(n);
    return set({
      cash: Math.round((i.cash - r.price) * 100) / 100,
      inventory: s,
      licenses: c ? grantLicense(i.licenses, c) : i.licenses,
      notice: r.name,
      ledger: pushLedger(i.ledger, r.name, -r.price)
    }), debouncedPersist(), true;
  },
  sellItem: n => {
    let r = itemById(n), i = get();
    if (!r || (i.inventory[n] ?? 0) < 1) return;
    let a = sellPrice(r);
    set({
      inventory: takeInv(i.inventory, n, 1),
      cash: Math.round((i.cash + a) * 100) / 100,
      notice: `Vendu · ${r.name}`,
      ledger: pushLedger(i.ledger, `Revente ${r.name}`, a)
    }), debouncedPersist();
  },
  sellStack: n => {
    let r = itemById(n), i = get(), a = i.inventory[n] ?? 0;
    if (!r || a < 1) return;
    let o = Math.round(sellPrice(r) * a * 100) / 100, s = { ...i.inventory };
    delete s[n], set({
      inventory: s,
      cash: Math.round((i.cash + o) * 100) / 100,
      notice: `Vendu · ${r.name} ×${a}`,
      ledger: pushLedger(i.ledger, `Revente ${r.name}`, o)
    }), debouncedPersist();
  },
  dropItem: (n, r = 1) => {
    let i = get();
    (i.inventory[n] ?? 0) < r || (set({
      inventory: takeInv(i.inventory, n, r),
      notice: `Objet laissé`
    }), debouncedPersist());
  },
  useItem: n => {
    let r = itemById(n), i = get();
    if (!r || (i.inventory[n] ?? 0) < 1) return false;
    if (n === `corde_bois`) return get().loadWood(1);
    if (r.use === `eat` || r.use === `drink`) {
      let t = getConsumptionEffect(n),
        a = t?.hunger ?? r.hunger,
        o = t?.thirst ?? r.thirst;
      return set({
        inventory: takeInv(i.inventory, n, 1),
        surv: applyMeal(i.surv, r.use === `drink` ? `drink` : `eat`, { hunger: a, thirst: o }),
        bloodAlcohol: n === `biere` ? police.drinkBeer(32) : i.bloodAlcohol,
        notice: n === `biere` ? `Bu · ${r.name} · ${Math.round(police.bloodAlcohol)} mg` : r.use === `drink` ? `Bu · ${r.name}` : `Mangé · ${r.name}`
      }), debouncedPersist(), true;
    }
    if (r.use === `seed`) return set({
      selectedSeed: cropFromSeed(n),
      notice: `Semence · ${r.name}`
    }), debouncedPersist(), true;
    if (r.use === `tool`) return set({
      equippedTool: i.equippedTool === n ? null : n,
      notice: i.equippedTool === n ? `Rangé` : r.name
    }), debouncedPersist(), true;
    if (r.use === `wear`) {
      if (n.startsWith(`sac`)) set({
        equippedPack: i.equippedPack === n ? null : n,
        notice: r.name
      });
      else {
        let t = WEAR_OUTFIT[n] ?? i.appearance.outfit,
          a = n === `tuque` ? `chapeau` : i.appearance.hairStyle;
        set({
          appearance: { ...i.appearance, outfit: t, hairStyle: a },
          notice: `Porté · ${r.name}`
        });
      }
      return debouncedPersist(), true;
    }
    return r.use === `fuel` || r.use === `drug` ? (set({
      inventory: takeInv(i.inventory, n, 1),
      notice: r.name
    }), debouncedPersist(), true) : false;
  },
  openShop: (t, n) => set({
    shopOpen: true, shopId: t, shopAisle: n ?? null, paused: true, showMap: false, phoneOpen: false
  }),
  closeShop: () => set({ shopOpen: false, shopAisle: null, paused: false }),
  openPhone: () => set({ phoneOpen: true, paused: true, showMap: false }),
  closePhone: () => set({ phoneOpen: false, paused: false }),
  openLock: (t, n) => set({ lockOpen: true, lockDoorId: t, lockDoorName: n, paused: true }),
  closeLock: () => set({ lockOpen: false, lockDoorId: null, lockDoorName: null, paused: false }),
  openConsole: () => set({ consoleOpen: true, paused: true }),
  closeConsole: () => set({ consoleOpen: false, paused: false }),
  openIntel: () => set({ intelOpen: true, paused: true, consoleOpen: false, phoneOpen: false }),
  closeIntel: () => set({ intelOpen: false, paused: false }),
  openCitation: n => set({
    citationOpen: true,
    citation: n,
    paused: true,
    tickets: [{
      article: n.article,
      description: n.description,
      fine: n.fine,
      at: Date.now(),
      kind: n.kind,
      ticketNumber: n.ticketNumber,
      csrArticle: n.article,
      demeritPoints: n.points,
      issuingOfficerBadge: n.badge,
      paid: false
    }, ...get().tickets].slice(0, 16)
  }),
  closeCitation: () => set({ citationOpen: false, citation: null, paused: false }),
  payCitation: () => {
    const i = get();
    const n = i.citation;
    if (!n) return set({ citationOpen: false, citation: null, paused: false });
    const { paid } = police.payTicket(n.ticketNumber);
    const charge = paid > 0 ? paid : n.fine;
    police.licenseSuspendedUntil = police.licenseSuspendedUntil || i.licenseSuspendedUntil;
    set({
      citationOpen: false,
      citation: null,
      paused: false,
      cash: Math.round((i.cash - charge) * 100) / 100,
      fines: i.fines + charge,
      demeritPoints: police.demeritTotal,
      licenseSuspendedUntil: police.licenseSuspendedUntil,
      tickets: i.tickets.map((t, idx) => idx === 0 ? { ...t, paid: true } : t),
      notice: n.kind === "arrest" ? "Constat signé · cellule" : `Constat payé · ${charge}\u00a0$`,
      ledger: pushLedger(i.ledger, n.kind === "arrest" ? "Amende SQ" : `Constat ${n.article}`, -charge)
    });
    debouncedPersist();
  },
  openCreator: () => set({ creatorOpen: true, paused: true }),
  closeCreator: () => set({ creatorOpen: false, paused: false }),
  setAppearance: n => {
    set({
      appearance: parseAppearance({ ...get().appearance, ...n }),
    });
    debouncedPersist();
  },
  openInventory: () => set({ inventoryOpen: true, paused: true }),
  closeInventory: () => set({ inventoryOpen: false, paused: false }),
  openGarage: () => set({ garageOpen: true, paused: true }),
  closeGarage: () => set({ garageOpen: false, paused: false }),
  openGesture: () => set({ gestureOpen: true }),
  closeGesture: () => set({ gestureOpen: false }),
  toggleGesture: () => set({ gestureOpen: !get().gestureOpen }),
  setGesture: n => set({ gesture: n, gestureOpen: false, sitting: n === `sit` }),
  lootItem: n => {
    let e = get().lootedItems ?? [];
    if (e.includes(n)) return;
    set({ lootedItems: [...e, n] }), debouncedPersist();
  },
  buyVehicle: n => {
    let r = fleetById(n), i = get();
    return r ? i.ownedVehicles.includes(n) ? get().equipVehicle(n) : r.pro ? i.firm ? i.firm.balance < r.price ? (set({
      notice: `Caisse entreprise insuffisante`
    }), false) : (set({
      firm: { ...i.firm, balance: Math.round((i.firm.balance - r.price) * 100) / 100 },
      ownedVehicles: [...i.ownedVehicles, n],
      vehicleId: n,
      notice: `${r.name} · caisse −${r.price}\u00a0$`
    }), debouncedPersist(), true) : (set({
      notice: `Immatriculez au REQ`
    }), false) : i.cash < r.price ? (set({
      notice: `Pas assez d'espèces`
    }), false) : (set({
      cash: Math.round((i.cash - r.price) * 100) / 100,
      ownedVehicles: [...i.ownedVehicles, n],
      vehicleId: n,
      notice: r.name,
      ledger: pushLedger(i.ledger, r.name, -r.price)
    }), debouncedPersist(), true) : false;
  },
  equipVehicle: n => get().ownedVehicles.includes(n) ? (set({
    vehicleId: n, garageOpen: false, paused: false
  }), debouncedPersist(), true) : false,
  openJobs: () => set({
    jobsOpen: true, paused: true, jobBoard: get().jobBoard.length ? get().jobBoard : rollBoard()
  }),
  closeJobs: () => set({ jobsOpen: false, paused: false }),
  acceptJob: n => {
    let r = get().jobBoard.find(e => e.id === n);
    r && (set({
      job: { ...r, loaded: false },
      jobsOpen: false,
      paused: false,
      notice: r.title
    }), debouncedPersist());
  },
  abandonJob: () => {
    set({ job: null, jobBoard: rollBoard(), notice: `Contrat abandonné` });
    debouncedPersist();
  },
  progressHaul: n => {
    let r = get(), i = r.job;
    if (i) {
      if (!i.loaded) {
        if (i.needs === `pickup` && !hasCaisse(n)) {
          set({ notice: `Il faut une caisse` });
          return;
        }
        set({ job: { ...i, loaded: true }, notice: `Chargé · ${i.from.name}` });
        return;
      }
      set({
        job: null,
        jobBoard: rollBoard(),
        cash: Math.round((r.cash + i.pay) * 100) / 100,
        notice: `Livré · ${i.to.name} · +${i.pay}\u00a0$`,
        ledger: pushLedger(r.ledger, i.title, i.pay)
      }), debouncedPersist();
    }
  },
  startGig: n => {
    let r = get(), i = gigById(n);
    if (!i) return set({ notice: `Quart introuvable` }), false;
    let a = getCannotStartReason(r.career, n, r.activeGig);
    if (a) return set({ notice: a }), false;
    if (!canStartGig(r.career, n, r.activeGig)) return false;
    let o = makeActiveGig(r.career, i), s = r.career;
    if (i.factionId && !s.faction) {
      let e = {
        spvq: `SPVQ`,
        sante_publique: `Santé publique`,
        municipalite: `Municipalité`
      };
      s = { ...s, faction: joinCareerFaction(i.factionId, e[i.factionId] ?? i.factionId) };
    }
    return set({
      activeGig: o,
      career: s,
      notice: `Quart · ${i.title}`,
      phoneOpen: false,
      paused: false
    }), debouncedPersist(), true;
  },
  cancelGig: () => {
    let n = get();
    if (!n.activeGig) return;
    let r = n.activeGig.id;
    set({
      activeGig: null,
      career: {
        ...n.career,
        gigCooldowns: { ...n.career.gigCooldowns, [r]: Date.now() + 3e4 }
      },
      notice: `Quart annulé`
    }), debouncedPersist();
  },
  tickGig: (n, r) => {
    let i = get(), a = i.activeGig;
    if (!a) return;
    let o = tickActiveGig(a, n, i.career.skills);
    if (o.kind === `none`) {
      set({ activeGig: { ...o.gig } });
      return;
    }
    if (o.kind === `step`) {
      let t = i.career.skills;
      o.skill && (t = bumpSkill(t, o.skill, 1)), set({
        activeGig: { ...o.gig },
        career: { ...i.career, skills: t }
      });
      return;
    }
    if (o.kind === `fail`) {
      let t = gigById(a.id), n = i.cash;
      o.penalty && o.penalty > 0 && (n = Math.max(0, n - o.penalty));
      let s = {
        ...i.career,
        jobsFailed: i.career.jobsFailed + 1,
        gigCooldowns: {
          ...i.career.gigCooldowns,
          [a.id]: Date.now() + (t?.cooldownMs ?? 3e4) * 2
        },
        jobHistory: [{
          jobId: a.id, title: a.title, reward: 0,
          completedAt: Date.now(), success: false, duration: a.durationMs
        }, ...i.career.jobHistory].slice(0, 40),
        skills: o.gig.steps[o.gig.currentStep]?.skillCheck
          ? bumpSkill(i.career.skills, o.gig.steps[o.gig.currentStep].skillCheck.skill, .5)
          : i.career.skills
      };
      o.wanted && set({ wantedStars: Math.min(5, Math.max(get().wantedStars ?? 0, o.wanted)), wantedReason: `Signalement · ${a?.title ?? `Quart`}` }),
      set({
        activeGig: null,
        career: s,
        cash: n,
        notice: o.wanted ? `Repéré · ${a.title}` : `Échec · ${a.title}`
      }), debouncedPersist();
      return;
    }
    let s = gigById(a.id), c = i.career;
    s && (c = applyXp(c, s.xpReward).career, c.level >= 2 && (c = {
      ...c, licenses: grantGigLicense(c.licenses, `permis_c`)
    }), s.skillRequired && (c = {
      ...c, skills: bumpSkill(c.skills, s.skillRequired.skill, 2)
    }), c = { ...c, skills: bumpSkill(c.skills, `endurance`, 1) }, c.faction && (c = {
      ...c, faction: addContribution(c.faction, Math.floor(a.reward / 10))
    }), c = {
      ...c,
      jobsCompleted: c.jobsCompleted + 1,
      gigCooldowns: { ...c.gigCooldowns, [a.id]: Date.now() + s.cooldownMs },
      jobHistory: [{
        jobId: a.id, title: a.title, reward: a.reward,
        completedAt: Date.now(), success: true, duration: s.durationMs
      }, ...c.jobHistory].slice(0, 40)
    }), set({
      activeGig: null,
      career: c,
      cash: Math.round((i.cash + a.reward) * 100) / 100,
      notice: `Quart · ${a.title} · +${a.reward}\u00a0$`,
      ledger: pushLedger(i.ledger, a.title, a.reward)
    }), debouncedPersist();
  },
  grantCareerLicense: n => {
    let r = get();
    set({
      career: { ...r.career, licenses: grantGigLicense(r.career.licenses, n) }
    }), debouncedPersist();
  },
  openFirm: () => set({ firmOpen: true, paused: true }),
  closeFirm: () => set({ firmOpen: false, paused: false }),
  foundFirm: (n, r) => {
    let i = get(), a = startupTotal(n);
    if (i.cash < a) return set({ notice: `Fonds insuffisants` }), false;
    let o = nearestVillageName(i.x, i.z),
      s = {
        id: `firm-${Date.now()}`, neq: generateNEQ(), tradeName: r || n, type: n,
        village: o, x: i.x, z: i.z, status: `en_demarrage`, balance: 0, taxOwed: 0,
        permits: [], stock: {}, isOpen: false, lifetimeRevenue: 0, staff: 0, grants: {}
      };
    return set({
      cash: Math.round((i.cash - a) * 100) / 100,
      firm: s,
      notice: `Immatriculée · NEQ ${s.neq}`,
      ledger: pushLedger(i.ledger, `Immatriculation REQ`, -a)
    }), debouncedPersist(), true;
  },
  buyPermit: n => {
    let r = get();
    const feeSpec = PERMIT_FEES[n];
    if (!r.firm || !feeSpec || r.firm.permits.some(e => e.type === n)) return false;
    let i = feeSpec.fee;
    if (r.cash < i) return set({ notice: `Pas assez d'espèces` }), false;
    let a = [...r.firm.permits, { type: n, number: generatePermitNumber(n) }],
      o = canOperate({ ...r.firm, permits: a, status: `active` }).ok;
    return set({
      cash: Math.round((r.cash - i) * 100) / 100,
      firm: { ...r.firm, permits: a, status: o ? `active` : r.firm.status },
      notice: feeSpec.label,
      ledger: pushLedger(r.ledger, PERMIT_FEES[n].label, -i)
    }), debouncedPersist(), true;
  },
  toggleFirmOpen: () => {
    let n = get().firm;
    n && (set({ firm: { ...n, isOpen: !n.isOpen } }), debouncedPersist());
  },
  stockIn: n => {
    let r = get();
    if (!r.firm || (r.inventory[n] ?? 0) < 1) return;
    let i = { ...r.firm.stock, [n]: (r.firm.stock[n] ?? 0) + 1 };
    set({
      firm: { ...r.firm, stock: i },
      inventory: takeInv(r.inventory, n, 1)
    }), debouncedPersist();
  },
  stockOut: n => {
    let r = get();
    if (!r.firm || (r.firm.stock[n] ?? 0) < 1) return;
    let i = { ...r.firm.stock };
    --i[n], i[n] <= 0 && delete i[n];
    let a = { ...r.inventory, [n]: (r.inventory[n] ?? 0) + 1 };
    set({
      firm: { ...r.firm, stock: i },
      inventory: a
    }), debouncedPersist();
  },
  withdrawFirm: () => {
    let n = get();
    if (!n.firm || n.firm.balance < 1) return;
    let r = Math.floor(n.firm.balance);
    set({
      firm: { ...n.firm, balance: Math.round((n.firm.balance - r) * 100) / 100 },
      cash: Math.round((n.cash + r) * 100) / 100,
      notice: `Retrait caisse · ${r}\u00a0$`,
      ledger: pushLedger(n.ledger, `Retrait enseigne`, r)
    }), debouncedPersist();
  },
  payFirmTax: () => {
    let n = get();
    if (!(!n.firm || n.firm.taxOwed <= 0)) {
      if (n.firm.balance < n.firm.taxOwed) {
        set({ notice: `Caisse insuffisante` });
        return;
      }
      set({
        firm: { ...n.firm, balance: Math.round((n.firm.balance - n.firm.taxOwed) * 100) / 100, taxOwed: 0 },
        notice: `Remise TPS+TVQ`
      }), debouncedPersist();
    }
  },
  tickFirm: n => {
    let r = get();
    if (!r.firm || !r.firm.isOpen || !canOperate(r.firm).ok) return;
    let i = nextFirmSale(r.firm, n);
    if (i.take <= 0 && !i.sold) return;
    let a = { ...r.firm.stock };
    i.sold && a[i.sold] && (--a[i.sold], a[i.sold] <= 0 && delete a[i.sold]), set({
      firm: {
        ...r.firm, stock: a,
        balance: Math.round((r.firm.balance + i.take) * 100) / 100,
        taxOwed: Math.round((r.firm.taxOwed + i.tax) * 100) / 100,
        lifetimeRevenue: Math.round((r.firm.lifetimeRevenue + i.take) * 100) / 100
      }
    });
  },
  hireStaff: () => {
    let n = get();
    if (!n.firm) return false;
    if ((n.firm.staff ?? 0) >= 6) return set({ notice: `Effectif plein` }), false;
    if (n.firm.balance < 80 && n.cash < 80) return set({ notice: `Pas de fonds pour embaucher` }), false;
    let r = n.firm.balance >= 80;
    return set({
      cash: r ? n.cash : Math.round((n.cash - 80) * 100) / 100,
      firm: {
        ...n.firm,
        staff: (n.firm.staff ?? 0) + 1,
        balance: r ? Math.round((n.firm.balance - 80) * 100) / 100 : n.firm.balance
      },
      notice: `Embauche · 80 $`
    }), debouncedPersist(), true;
  },
  fireStaff: () => {
    let n = get();
    return !n.firm || (n.firm.staff ?? 0) < 1 ? false : (set({
      firm: { ...n.firm, staff: n.firm.staff - 1 },
      notice: `Employé congédié`
    }), debouncedPersist(), true);
  },
  applyMapaqGrant: n => {
    let r = get();
    if (!r.firm) return set({ notice: `Immatriculez au REQ` }), false;
    let i = canApplyGrant(r.firm, n);
    if (!i.ok) return set({ notice: i.reason }), false;
    if (r.cash < 8 && r.firm.balance < 8) return set({ notice: `Frais de dossier 8 $` }), false;
    let a = r.firm.balance >= 8;
    return set({
      cash: a ? r.cash : Math.round((r.cash - 8) * 100) / 100,
      firm: {
        ...r.firm,
        balance: Math.round((r.firm.balance + i.amount - (a ? 8 : 0)) * 100) / 100,
        grants: { ...r.firm.grants ?? {}, [n]: i.amount }
      },
      notice: i.reason,
      ledger: pushLedger(r.ledger, i.reason, i.amount)
    }), debouncedPersist(), true;
  },
  toggleHotelTv: () => {
    const t = hotelSecurity.toggleTv();
    set({ hotelTvOn: t, notice: t ? `TV · Best Life` : `TV éteinte` });
    debouncedPersist();
  },
  addToCart: n => {
    let r = itemById(n);
    if (!r) return false;
    let i = get(), a = (i.cart[n] ?? 0) + 1;
    return set({ cart: { ...i.cart, [n]: a }, notice: `${r.name} · panier` }), true;
  },
  removeFromCart: n => {
    let r = get(), i = (r.cart[n] ?? 0) - 1, a = { ...r.cart };
    i <= 0 ? delete a[n] : a[n] = i, set({ cart: a });
  },
  clearCart: () => set({ cart: {} }),
  openCart: () => set({ cartOpen: true, paused: true }),
  closeCart: () => set({ cartOpen: false, paused: false }),
  checkoutCart: () => {
    let n = get(), r = cartTotals(n.cart);
    if (r.count < 1) return false;
    if (n.cash < r.total) return set({ notice: `Pas assez d'espèces` }), false;
    let i = r.lines.find(e => e.item.restricted);
    if (i && !(n.inventory.identite ?? 0)) return set({
      notice: `${i.item.restricted} ans · pièce d'identité requise`
    }), false;
    for (let t of r.lines) {
      let r = canPurchase(n.licenses, t.item.id, n.rpJob);
      if (!r.ok) return set({ notice: r.message ?? `Permis requis` }), false;
    }
    let a = { ...n.inventory }, o = n.licenses;
    for (let e of r.lines) {
      a[e.item.id] = (a[e.item.id] ?? 0) + e.qty;
      let t = licenseFromItem(e.item.id);
      t && (o = grantLicense(o, t));
    }
    return set({
      cash: Math.round((n.cash - r.total) * 100) / 100,
      inventory: a,
      licenses: o,
      cart: {},
      cartOpen: false,
      paused: false,
      notice: `Caisse · ${r.total}\u00a0$`,
      ledger: pushLedger(n.ledger, `Panier Éther`, -r.total)
    }), debouncedPersist(), true;
  },
  tickSurvival: (n, r) => set({ surv: tickSurvival(get().surv, n, r) }),
  openAtm: t => set({
    atmOpen: true, atmId: t, paused: true, showMap: false, phoneOpen: false, shopOpen: false
  }),
  closeAtm: () => set({ atmOpen: false, atmId: null, paused: false }),
  atmOp: (n, r) => {
    let i = get(),
      a = n === `deposit`
        ? opDeposit(i.economy, i.cash, i.bank, r, i.atmId)
        : opWithdraw(i.economy, i.cash, i.bank, r, i.atmId);
    return a.ok ? (set({
      cash: a.cash ?? i.cash,
      bank: a.bank ?? i.bank,
      economy: a.economy ?? i.economy,
      notice: n === `deposit` ? `Dépôt · ${Math.round(r)}\u00a0$` : `Retrait · ${Math.round(r)}\u00a0$`,
      ledger: pushLedger(i.ledger,
        n === `deposit` ? `Dépôt Caisse populaire` : `Retrait Caisse populaire`,
        n === `deposit` ? -Math.round(r) : Math.round(r))
    }), debouncedPersist(), true) : (set({
      notice: a.reason ?? `Opération refusée`
    }), false);
  },
  transferBank: (n, r) => {
    let i = get();
    if (!i.firm) return set({ notice: `Aucune entreprise REQ` }), false;
    let a = n === `to-firm`
      ? opTransferPersonalToFirm(i.economy, i.bank, i.firm.balance, r)
      : opTransferFirmToPersonal(i.economy, i.bank, i.firm.balance, r);
    return a.ok ? (set({
      bank: a.bank ?? i.bank,
      economy: a.economy ?? i.economy,
      firm: { ...i.firm, balance: a.firmBalance ?? i.firm.balance },
      notice: n === `to-firm` ? `Virement REQ · ${Math.round(r)}\u00a0$` : `Revenu REQ · ${Math.round(r)}\u00a0$`,
      ledger: pushLedger(i.ledger,
        n === `to-firm` ? `Virement entreprise` : `Revenu entreprise`,
        n === `to-firm` ? -Math.round(r) : Math.round(r))
    }), debouncedPersist(), true) : (set({
      notice: a.reason ?? `Virement refusé`
    }), false);
  },
  requestLoan: n => {
    let r = get(), i = r.appearance.name || `Membre`,
      a = opRequestLoan(r.economy, r.bank, `local`, i, n);
    return a.ok ? (set({
      bank: a.bank ?? r.bank,
      economy: a.economy ?? r.economy,
      notice: `Prêt versé · ${Math.round((a.bank ?? r.bank) - r.bank)}\u00a0$`,
      ledger: pushLedger(r.ledger, `Prêt Caisse populaire`, (a.bank ?? r.bank) - r.bank)
    }), debouncedPersist(), true) : (set({
      notice: a.reason ?? `Prêt refusé`
    }), false);
  },
  investBank: (n, r) => {
    let i = get(), a = opInvest(i.economy, i.bank, `local`, n, r);
    return a.ok ? (set({
      bank: a.bank ?? i.bank,
      economy: a.economy ?? i.economy,
      notice: `Placement · ${Math.round(r)}\u00a0$`,
      ledger: pushLedger(i.ledger, `Placement Caisse`, -Math.round(r))
    }), debouncedPersist(), true) : (set({
      notice: a.reason ?? `Placement refusé`
    }), false);
  },
  sellInvestment: n => {
    let r = get(), i = opSellInvestment(r.economy, r.bank, n);
    return i.ok ? (set({
      bank: i.bank ?? r.bank,
      economy: i.economy ?? r.economy,
      notice: `Placement racheté`,
      ledger: pushLedger(r.ledger, `Rachat placement`, (i.bank ?? r.bank) - r.bank)
    }), debouncedPersist(), true) : (set({
      notice: i.reason ?? `Rachat refusé`
    }), false);
  },
  tickEconomy: n => {
    let r = get(),
      i = tickEconomy(r.economy, r.bank, n),
      a = i.economy.day !== r.economy.day;
    if (!a && i.bank === r.bank) {
      Math.abs(r.economy.lastHours - n) > .25 && set({
        economy: { ...r.economy, lastHours: n }
      });
      return;
    }
    let o = i.bank, s = r.realty, c = i.notice,
      l = i.notice ? pushLedger(r.ledger, i.notice, i.bank - r.bank) : r.ledger;
    if (a) {
      let e = propertyById(s, r.ownedProps);
      s = e.realty, e.rentIncome > 0 && (o = Math.round((o + e.rentIncome) * 100) / 100,
        l = pushLedger(l, `Loyers`, e.rentIncome)),
        e.mortgageDue > 0 && (o >= e.mortgageDue
          ? (o = Math.round((o - e.mortgageDue) * 100) / 100,
            l = pushLedger(l, `Hypothèque`, -e.mortgageDue))
          : c = `Hypothèque impayée`),
        e.notice && (c = e.notice);
    }
    set({
      economy: i.economy, realty: s, bank: o,
      notice: c ?? r.notice, ledger: l
    });
    if (a || i.bank !== r.bank || i.notice) debouncedPersist();
  },
  openDeed: t => set({
    propertyOpen: true, deedId: t, paused: true, showMap: false, phoneOpen: false
  }),
  closeDeed: () => set({ propertyOpen: false, deedId: null, paused: false }),
  buyDeed: () => get().buyProperty(`cash`),
  buyProperty: (r = `cash`) => {
    let i = get(), a = propertyById(i.deedId ?? ``);
    if (!a || ownedIds(i.ownedProps, i.realty).includes(a.id)) return false;
    let { tax: o, total: s } = withTax(a.price),
      c = i.cash, l = i.bank, u = i.realty, d = s;
    if (r === `mortgage`) {
      let t = Math.max(80, Math.round(s * .2));
      if (l < t) return set({ notice: `Mise de fonds insuffisante` }), false;
      l = Math.round((l - t) * 100) / 100, u = addMortgage(u, a.id, s - t), d = t;
    } else if (r === `bank`) {
      if (l < s) return set({ notice: `Solde Caisse insuffisant` }), false;
      l = Math.round((l - s) * 100) / 100;
    } else {
      if (c < s) return set({ notice: `Fonds insuffisants` }), false;
      c = Math.round((c - s) * 100) / 100;
    }
    let f = { ...i.houses }, p = i.ownedProps;
    isHouseDeed(a.id)
      ? (p = [...i.ownedProps, a.id], f[a.id] = i.houses[a.id] ?? emptyHouse(a.id, a.town))
      : u = { ...u, commercials: [...u.commercials, a.id] },
      u = { ...u, condition: { ...u.condition, [a.id]: 100 } };
    let m = isHouseDeed(a.id)
      ? { ...i.inventory, cle_maison: (i.inventory.cle_maison ?? 0) + 1 }
      : i.inventory;
    return set({
      cash: c, bank: l, realty: u, houses: f, ownedProps: p, inventory: m,
      propertyOpen: true, paused: true,
      notice: r === `mortgage` ? `Hypothèque · ${a.name}` : `Acte · ${a.name}`,
      ledger: pushLedger(i.ledger, `${a.name}`, -d)
    }), debouncedPersist(), isHouseDeed(a.id) && void import("./net").then(({ rpNet }) => {
      rpNet.publishProperty({
        id: a.id, name: a.name, ownerId: rpNet.selfId,
        price: a.price, locked: true
      });
    }), true;
  },
  listProperty: n => {
    let r = get(), i = r.deedId ?? ``, a = propertyById(i);
    if (!a || !ownedIds(r.ownedProps, r.realty).includes(i)) return false;
    let o = n ?? Math.round(a.price * 1.15);
    return set({
      realty: listForSale(r.realty, i, o, `À vendre · ${a.town}`),
      notice: `MLS · ${a.name} · ${o}\u00a0$`
    }), debouncedPersist(), true;
  },
  unlistProperty: () => {
    let n = get(), r = n.deedId ?? ``;
    r && (set({
      realty: unlist(n.realty, r), notice: `Retiré du MLS`
    }), debouncedPersist());
  },
  rentOut: () => {
    let n = get(), r = n.deedId ?? ``;
    if (!ownedIds(n.ownedProps, n.realty).includes(r)) return false;
    let i = startRental(n.realty, r);
    return !i.ok || !i.realty ? (set({
      notice: i.reason ?? `Location refusée`
    }), false) : (set({
      realty: i.realty, notice: `Loué · ${i.realty.rentals[r]?.tenantName}`
    }), debouncedPersist(), true);
  },
  evictTenant: () => {
    let n = get(), r = n.deedId ?? ``;
    return n.realty.rentals[r] ? (set({
      realty: evictRental(n.realty, r), notice: `Locataire évincé`
    }), debouncedPersist(), true) : false;
  },
  maintainRealty: () => {
    let n = get(), r = n.deedId ?? ``;
    if (!ownedIds(n.ownedProps, n.realty).includes(r)) return false;
    if (n.cash < 40 && n.bank < 40) return set({ notice: `Entretien 40 $` }), false;
    let i = n.cash < 40;
    return set({
      cash: i ? n.cash : Math.round((n.cash - 40) * 100) / 100,
      bank: i ? Math.round((n.bank - 40) * 100) / 100 : n.bank,
      realty: maintainProperty(n.realty, r),
      notice: `Entretien · condition +50`,
      ledger: pushLedger(n.ledger, `Entretien immeuble`, -40)
    }), debouncedPersist(), true;
  },
  bookVisit: () => {
    let n = get(), r = n.deedId ?? ``, i = propertyById(r);
    return i ? (set({
      realty: requestVisit(n.realty, r, n.appearance.name),
      notice: `Visite demandée · ${i.name}`
    }), debouncedPersist(), true) : false;
  },
  grantRealtyAccess: n => {
    let r = get(), i = r.deedId ?? ``, a = n.trim();
    return !a || !ownedIds(r.ownedProps, r.realty).includes(i) ? false : (set({
      realty: grantAccess(r.realty, i, a), notice: `Accès · ${a}`
    }), debouncedPersist(), true);
  },
  revokeRealtyAccess: n => {
    let r = get(), i = r.deedId ?? ``;
    return i ? (set({
      realty: revokeAccess(r.realty, i, n), notice: `Accès retiré · ${n}`
    }), debouncedPersist(), true) : false;
  },
  buyReno: n => {
    let r = get(), i = deedById(r.deedId ?? ``);
    if (!i || !r.ownedProps.includes(i.id)) return false;
    let a = renoById(n), o = r.houses[i.id] ?? emptyHouse(i.id);
    if (!a) return set({ notice: `Rénovation inconnue` }), false;
    if (o.renos.includes(n)) return set({ notice: `Déjà fait` }), false;
    let { tax: s, total: c } = withTax(a.price);
    if (r.cash < c) return set({ notice: `Fonds insuffisants` }), false;
    let l = { ...o, renos: [...o.renos, n] };
    return set({
      cash: Math.round((r.cash - c) * 100) / 100,
      houses: { ...r.houses, [i.id]: l },
      notice: `Travaux · ${a.label} · TPS+TVQ ${s}\u00a0$`,
      ledger: pushLedger(r.ledger, `Reno · ${a.label}`, -c)
    }), debouncedPersist(), true;
  },
  installHeat: n => {
    let r = get(), i = deedById(r.deedId ?? ``);
    if (!i || !r.ownedProps.includes(i.id)) return false;
    let a = heatById(n), o = r.houses[i.id] ?? emptyHouse(i.id, i.town);
    if (!a) return set({ notice: `Chauffage inconnu` }), false;
    if (o.heat === n) return set({ notice: `Déjà installé` }), false;
    let s = a.price;
    n === `thermopompe` && (s = Math.max(0, s - 80));
    let { tax: c, total: l } = withTax(s);
    if (s > 0 && r.cash < l) return set({ notice: `Fonds insuffisants` }), false;
    let u = {
      ...o, heat: n, heatOn: true, broke: false,
      wood: a.needsWood ? Math.max(o.wood, 2) : o.wood
    };
    return set({
      cash: s > 0 ? Math.round((r.cash - l) * 100) / 100 : r.cash,
      houses: { ...r.houses, [i.id]: u },
      notice: n === `thermopompe` ? `Thermopompe · LogisVert −80\xA0$` : `Chauffage · ${a.label}`,
      ledger: s > 0 ? pushLedger(r.ledger, `Chauffage · ${a.label}`, -l) : r.ledger
    }), debouncedPersist(), true;
  },
  setWater: n => {
    let r = get(), i = deedById(r.deedId ?? ``);
    if (!i || !r.ownedProps.includes(i.id)) return false;
    let a = r.houses[i.id] ?? emptyHouse(i.id, i.town);
    if (a.water === n) return true;
    let { total: o } = withTax(n === `puits` ? 120 : 40);
    return r.cash < o ? (set({ notice: `Fonds insuffisants` }), false) : (set({
      cash: Math.round((r.cash - o) * 100) / 100,
      houses: { ...r.houses, [i.id]: { ...a, water: n, waterOn: true, frozen: false } },
      notice: water.label,
      ledger: pushLedger(r.ledger, waterById(n).label, -o)
    }), debouncedPersist(), true);
  },
  toggleHeat: () => {
    let n = get(), r = n.deedId ?? (n.ownedProps && n.ownedProps.length > 0 ? n.ownedProps[0] : null);
    if (!r || !n.ownedProps.includes(r)) return false;
    let i = n.houses[r] ?? emptyHouse(r), a = heatById(i.heat);
    return !i.heatOn && a.needsWood && i.wood <= 0 ? (set({
      notice: `Plus de bois`
    }), false) : !i.heatOn && a.needsHydro && (!i.hydroOn || n.gridOutage) ? (set({
      notice: `Hydro coupé · pas d'électrique`
    }), false) : (set({
      houses: { ...n.houses, [r]: { ...i, heatOn: !i.heatOn } },
      notice: i.heatOn ? `Chauffage coupé` : `Chauffage · ${a.label}`
    }), debouncedPersist(), true);
  },
  toggleHydro: () => {
    let n = get(), r = n.deedId ?? (n.ownedProps && n.ownedProps.length > 0 ? n.ownedProps[0] : null);
    if (!r || !n.ownedProps.includes(r)) return false;
    let i = n.houses[r] ?? emptyHouse(r), a = !i.hydroOn;
    return set({
      houses: {
        ...n.houses, [r]: {
          ...i, hydroOn: a,
          heatOn: a || heatById(i.heat).panneProof ? i.heatOn : false
        }
      },
      notice: a ? `Panneau Hydro · sous tension` : `Disjoncteur · coupé`
    }), debouncedPersist(), true;
  },
  toggleWater: () => {
    let n = get(), r = n.deedId ?? (n.ownedProps && n.ownedProps.length > 0 ? n.ownedProps[0] : null);
    if (!r || !n.ownedProps.includes(r)) return false;
    let i = n.houses[r] ?? emptyHouse(r);
    return i.frozen && i.waterOn ? (set({
      notice: `Tuyaux gelés · dégeler d'abord`
    }), false) : (set({
      houses: { ...n.houses, [r]: { ...i, waterOn: !i.waterOn } },
      notice: i.waterOn ? `Entrée d'eau fermée` : `Eau ouverte`
    }), debouncedPersist(), true);
  },
  loadWood: (n = 1) => {
    let r = get(), i = r.deedId ?? (r.ownedProps && r.ownedProps.length > 0 ? r.ownedProps[0] : null);
    if (!i || !r.ownedProps.includes(i)) return set({
      notice: `Chargez le poêle chez vous`
    }), false;
    let a = r.houses[i] ?? emptyHouse(i);
    if (!heatById(a.heat).needsWood) return set({
      notice: `Pas de poêle ni foyer`
    }), false;
    if ((r.inventory.corde_bois ?? 0) < n) return set({
      notice: `Pas de corde de bois`
    }), false;
    if (a.wood >= 8) return set({ notice: `Bûcher plein` }), false;
    let o = Math.min(n, 8 - Math.floor(a.wood));
    return set({
      inventory: takeInv(r.inventory, `corde_bois`, o),
      houses: { ...r.houses, [i]: { ...a, wood: Math.min(8, a.wood + o) } },
      notice: `Bois · ${Math.min(8, a.wood + o).toFixed(0)} cordes`
    }), debouncedPersist(), true;
  },
  repairFurnace: () => {
    let n = get(), r = n.deedId ?? (n.ownedProps && n.ownedProps.length > 0 ? n.ownedProps[0] : null);
    if (!r || !n.ownedProps.includes(r)) return false;
    let i = n.houses[r] ?? emptyHouse(r);
    if (!i.broke) return set({ notice: `Fournaise ok` }), false;
    let { total: a } = withTax(85);
    return n.cash < a ? (set({
      notice: `Réparation · fonds insuffisants`
    }), false) : (set({
      cash: Math.round((n.cash - a) * 100) / 100,
      houses: { ...n.houses, [r]: { ...i, broke: false, heatOn: true } },
      notice: `Fournaise réparée`,
      ledger: pushLedger(n.ledger, `Fournaise`, -a)
    }), debouncedPersist(), true);
  },
  thawPipes: () => {
    let n = get(), r = n.deedId ?? (n.ownedProps && n.ownedProps.length > 0 ? n.ownedProps[0] : null);
    if (!r || !n.ownedProps.includes(r)) return false;
    let i = n.houses[r] ?? emptyHouse(r);
    if (!i.frozen) return set({ notice: `Tuyaux ok` }), false;
    let { total: a } = withTax(60);
    return n.cash < a ? (set({
      notice: `Plombier · fonds insuffisants`
    }), false) : (set({
      cash: Math.round((n.cash - a) * 100) / 100,
      houses: { ...n.houses, [r]: { ...i, frozen: false, waterOn: true } },
      notice: `Tuyaux dégelés`,
      ledger: pushLedger(n.ledger, `Plombier`, -a)
    }), debouncedPersist(), true);
  },
  tickUtilities: (n, r) => {
    let i = get();
    if (i.ownedProps.length === 0 && !i.gridOutage) return;
    let a = {};
    for (let e of i.ownedProps) a[e] = i.houses[e] ?? emptyHouse(e);
    let o = tickHouseUtils(a, i.ownedProps, i.gridOutage, n, {
      ambient: r.ambient, weather: r.weather,
      month: r.month, elapsed: r.elapsed
    }),
      s = { ...i.houses };
    for (let [e, t] of Object.entries(o.houses)) s[e] = {
      ...s[e] ?? emptyHouse(e), ...t
    };
    let c = i.cash, l = i.bank, u = i.ledger, d = o.notice;
    if (o.debit > 0) {
      if (l >= o.debit) l = Math.round((l - o.debit) * 100) / 100;
      else if (c + l >= o.debit) {
        let e = o.debit - l;
        l = 0, c = Math.round((c - e) * 100) / 100;
      } else {
        for (let e of i.ownedProps) {
          let t = s[e];
          s[e] = {
            ...t, hydroOn: false,
            heatOn: heatById(t.heat).panneProof ? t.heatOn : false
          };
        }
        d = `Hydro-Québec · coupure pour non-paiement`;
      }
      o.label && (u = pushLedger(u, o.label, -o.debit)), d ||= o.label;
    }
    set({
      houses: s, gridOutage: o.grid, cash: c, bank: l, ledger: u,
      ...d ? { notice: d } : {}
    }), (o.debit > 0 || o.notice || o.grid !== i.gridOutage) && debouncedPersist();
  },
  setBasement: n => {
    let r = get(), i = r.deedId;
    if (!i || !r.ownedProps.includes(i)) return false;
    let a = r.houses[i] ?? emptyHouse(i);
    return hasReno(a, `soussol`) ? (set({
      houses: { ...r.houses, [i]: { ...a, basement: n } },
      notice: `Sous-sol · ${n}`
    }), debouncedPersist(), true) : (set({
      notice: `Finissez le sous-sol d'abord`
    }), false);
  },
  toggleGarageFit: n => {
    let r = get(), i = r.deedId;
    if (!i || !r.ownedProps.includes(i)) return false;
    let a = r.houses[i] ?? emptyHouse(i);
    if (!hasReno(a, `garage`)) return set({
      notice: `Bâtissez le garage d'abord`
    }), false;
    if (a.garageFits.includes(n)) set({
      houses: {
        ...r.houses, [i]: {
          ...a, garageFits: a.garageFits.filter(e => e !== n)
        }
      },
      notice: `Retiré · ${n}`
    });
    else {
      let t = {
        etabli: 60, outils: 45, rangement: 40,
        compresseur: 90, deco: 35, mecanique: 120
      }[n],
        { total: o } = withTax(t);
      if (r.cash < o) return set({ notice: `Fonds insuffisants` }), false;
      set({
        cash: Math.round((r.cash - o) * 100) / 100,
        houses: { ...r.houses, [i]: { ...a, garageFits: [...a.garageFits, n] } },
        notice: `Garage · ${n}`,
        ledger: pushLedger(r.ledger, `Garage · ${n}`, -o)
      });
    }
    return debouncedPersist(), true;
  },
  setGarageBays: n => {
    let r = get(), i = r.deedId;
    if (!i || !r.ownedProps.includes(i)) return false;
    let a = r.houses[i] ?? emptyHouse(i);
    if (!hasReno(a, `garage`)) return set({
      notice: `Bâtissez le garage d'abord`
    }), false;
    if (n === a.garageBays) return true;
    let o = (n === 3 ? 320 : n === 2 ? 180 : 0) -
      (a.garageBays === 3 ? 320 : a.garageBays === 2 ? 180 : 0);
    if (o > 0) {
      let { total: t } = withTax(o);
      if (r.cash < t) return set({ notice: `Fonds insuffisants` }), false;
      set({
        cash: Math.round((r.cash - t) * 100) / 100,
        houses: {
          ...r.houses, [i]: {
            ...a, garageBays: n, parked: a.parked.slice(0, n)
          }
        },
        notice: `Garage · ${n} places`,
        ledger: pushLedger(r.ledger, `Garage ${n} places`, -t)
      });
    } else set({
      houses: {
        ...r.houses, [i]: {
          ...a, garageBays: n, parked: a.parked.slice(0, n)
        }
      },
      notice: `Garage · ${n} places`
    });
    return debouncedPersist(), true;
  },
  cutHouseKey: n => {
    let r = get(), i = r.deedId;
    if (!i || !r.ownedProps.includes(i)) return false;
    if (n === `owner` || n === `guest`) return set({
      notice: `Invité n'a pas de clé permanente`
    }), false;
    let a = r.houses[i] ?? emptyHouse(i);
    if (a.keychain.includes(n)) return set({
      notice: `Double déjà taillé`
    }), false;
    let { total: o } = withTax(25);
    if (r.cash < o) return set({ notice: `Fonds insuffisants` }), false;
    let s = { ...r.inventory, double_cle: (r.inventory.double_cle ?? 0) + 1 };
    return set({
      cash: Math.round((r.cash - o) * 100) / 100,
      inventory: s,
      houses: { ...r.houses, [i]: { ...a, keychain: [...a.keychain, n] } },
      notice: `Double · ${n}`,
      ledger: pushLedger(r.ledger, `Double de clés`, -o)
    }), debouncedPersist(), true;
  },
  toggleDoorLock: n => {
    let r = get(), i = r.deedId;
    if (!i || !r.ownedProps.includes(i)) return false;
    let a = r.houses[i] ?? emptyHouse(i),
      o = { ...a.doors, [n]: !a.doors[n] };
    return set({
      houses: { ...r.houses, [i]: { ...a, doors: o } },
      notice: o[n] ? `Verrouillée · ${n}` : `Ouverte · ${n}`
    }), debouncedPersist(), true;
  },
  parkInGarage: n => {
    let r = get(), i = (r.ownedProps && r.ownedProps.length > 0 ? r.ownedProps[0] : null), a = r.deedId ?? i;
    if (!a || !r.ownedProps.includes(a)) return false;
    let o = r.houses[a] ?? emptyHouse(a);
    return hasReno(o, `garage`) ? o.parked.length >= o.garageBays ? (set({
      notice: `Garage plein`
    }), false) : o.parked.includes(n) ? true : (set({
      houses: { ...r.houses, [a]: { ...o, parked: [...o.parked, n] } },
      notice: `Véhicule rangé`
    }), debouncedPersist(), true) : false;
  },
  takeFromGarage: n => {
    let r = get(), i = r.deedId ?? (r.ownedProps && r.ownedProps.length > 0 ? r.ownedProps[0] : null);
    if (!i) return false;
    let a = r.houses[i] ?? emptyHouse(i);
    return set({
      houses: {
        ...r.houses, [i]: {
          ...a, parked: a.parked.filter(e => e !== n)
        }
      },
      notice: `Véhicule sorti`
    }), debouncedPersist(), true;
  },
  setRpJob: n => {
    const jobDef = jobById(n);
    if (!jobDef) {
      set({ notice: `Emploi introuvable` });
      return;
    }
    let r = jobDef.id, i = get(), a = { ...i.inventory };
    if (r === `policier`)
      a.badge_police = Math.max(a.badge_police ?? 0, 1);
    let o = i.career;
    r === `policier` && (o = {
      ...o, licenses: grantGigLicense(o.licenses, `badge_police`),
      faction: o.faction ?? joinCareerFaction(`spvq`, `SPVQ`)
    }), r === `ambulancier` && (o = {
      ...o, licenses: grantGigLicense(o.licenses, `diplome_sante`),
      faction: o.faction ?? joinCareerFaction(`sante_publique`, `Santé publique`)
    }), (r === `taxi` || r === `livreur`) && (o = {
      ...o, licenses: grantGigLicense(o.licenses, `permis_c`)
    }), set({
      rpJob: r, inventory: a, career: o,
      staffRoster: snapshotStaff(),
      notice: r === `policier` ? `Emploi · Policier · kit SQ versé` : `Emploi · ${jobById(r).name}`
    }), setUserJob(LOCAL_PLAYER_ID, rpJobToRole(r)), debouncedPersist();
  },
  setAdminRole: n => {
    let r = parseAdminRole(n) ?? get().adminRole;
    setUserRole(LOCAL_PLAYER_ID, r);
    set({
      adminRole: r, staffRoster: snapshotStaff(),
      notice: `Grade · ${getRoleBadgeStyle(r).label}`
    }), debouncedPersist();
  },
  syncStaff: id => {
    let n = get();
    if (n.appearance?.name) setDisplayName(LOCAL_PLAYER_ID, n.appearance.name);
    if (!id || id === LOCAL_PLAYER_ID) {
      const job =
        getUserRole(LOCAL_PLAYER_ID) === AdminRole.INTELLECTUS_AI && n.rpJob === `civil`
          ? RpJobRole.ETHER_ARCHITECT
          : rpJobToRole(n.rpJob);
      setUserJob(LOCAL_PLAYER_ID, job);
      set({ adminRole: getUserRole(LOCAL_PLAYER_ID), staffRoster: snapshotStaff() });
    } else set({ staffRoster: snapshotStaff() });
    debouncedPersist();
  },
  promoteStaff: id => {
    let t = id || LOCAL_PLAYER_ID;
    let r = promoteUser(t);
    set(t === LOCAL_PLAYER_ID ? {
      adminRole: r, staffRoster: snapshotStaff(),
      notice: `Promotion · ${getRoleBadgeStyle(r).label}`
    } : {
      staffRoster: snapshotStaff(), notice: `Promotion · ${t}`
    }), debouncedPersist();
    return r;
  },
  demoteStaff: id => {
    let t = id || LOCAL_PLAYER_ID;
    let r = demoteUser(t);
    set(t === LOCAL_PLAYER_ID ? {
      adminRole: r, staffRoster: snapshotStaff(),
      notice: `Rétrogradation · ${getRoleBadgeStyle(r).label}`
    } : {
      staffRoster: snapshotStaff(), notice: `Rétrogradation · ${t}`
    }), debouncedPersist();
    return r;
  },
  joinGang: t => {
    let n = crimeById(t);
    return n ? (set({
      gangId: n.id, notice: `Rejoint · ${n.name}`
    }), debouncedPersist(), true) : false;
  },
  leaveGang: () => {
    set({ gangId: null, notice: `Plus de gang` }), debouncedPersist();
  },
  commitCrime: (n, r) => {
    const i = get();
    if (i.rpJob === `policier`) {
      set({ notice: `Vous êtes de la SQ.` });
      return false;
    }

    const crime = crimeById(n);
    if (!crime) {
      set({ notice: `Crime introuvable` });
      return false;
    }

    const crimeId = crime.id === `bank_robbery` ? `robbery` : crime.id;
    const spotted = Math.random() * 6 < (crime.stars ?? 0);

    if (spotted) {
      set({
        wantedStars: Math.min(5, Math.max(i.wantedStars ?? 0, crime.stars ?? 1)),
        wantedReason: `Signalement · ${crime.name}`,
        notice: `Repéré · ${crime.name}`,
      });
      return false;
    }

    let reward = finiteNumber(crime.reward, 0, 0);
    if (i.gangId) reward = Math.round(reward * 1.2);

    const shouldReport = Math.random() < 0.35;
    const wantedStars = shouldReport
      ? Math.min(5, Math.max(i.wantedStars ?? 0, 1))
      : i.wantedStars ?? 0;

    set({
      cash: Math.round((i.cash + reward) * 100) / 100,
      wantedStars,
      wantedReason: shouldReport ? `Signalement · ${crime.name}` : i.wantedReason,
      notice: `${crime.name} · +${reward}\u00a0$`,
      ledger: pushLedger(i.ledger, crime.name, reward),
    });

    void crimeId;
    void r;
    debouncedPersist();
    return true;
  },
  tickPayroll: () => {
    let n = get(), r = finiteNumber(payrollNet(n.rpJob), 0, 0);
    r <= 0 || (set({
      bank: Math.round((n.bank + r) * 100) / 100,
      notice: `Paie · ${jobById(n.rpJob)?.name ?? n.rpJob} · +${r}\u00a0$`,
      ledger: pushLedger(n.ledger, `Paie ${jobById(n.rpJob)?.name ?? n.rpJob}`, r)
    }), debouncedPersist());
  },
  openElevator: () => set({ elevatorOpen: true, paused: true }),
  closeElevator: () => set({ elevatorOpen: false, paused: false }),
  sit: () => set({ sitting: true, notice: `Assis` }),
  stand: () => set({ sitting: false, notice: `Debout` }),
  toggleLobbyLights: () => {
    let n = !get().lobbyLights;
    set({ lobbyLights: n, notice: n ? `Lustres allumés` : `Lustres éteints` });
  },
  ringBell: () => set({ notice: `Ding — réception prévenue` }),
  toggleBuild: () => {
    let n = !get().buildOpen;
    set({
      buildOpen: n, paused: false,
      notice: n ? `Builder · E pour placer` : `Builder fermé`
    });
  },
  selectProp: t => set({ buildType: t }),
  rotateGhost: () => set({ buildYaw: (get().buildYaw + Math.PI / 4) % (Math.PI * 2) }),
  scaleGhost: n => set({
    buildScale: Math.max(.25, Math.min(6, get().buildScale + n * .25))
  }),
  addPlaced: n => {
    set({
      placed: [...get().placed, n].slice(-80),
      notice: `Placé · ${n.type}`
    }), debouncedPersist();
  },
  removePlaced: n => {
    set({
      placed: get().placed.filter(e => e.id !== n),
      notice: `Objet retiré`
    }), debouncedPersist();
  },
  clearPlaced: () => {
    set({ placed: [], notice: `Terrain vidé` }), debouncedPersist();
  },

  // ═══════════════════════════════════════════════════════════
  // SQDC ACTIONS
  // ═══════════════════════════════════════════════════════════

  openSqdcStore: (storeId) => {
    const store = getSqdcStore(storeId);
    if (!store) {
      set({ notice: `Succursale SQDC introuvable` });
      return false;
    }

    const current = get();
    const stores = current.sqdc.stores.includes(storeId)
      ? current.sqdc.stores
      : [...current.sqdc.stores, storeId];

    closeAllTransientUi(set);
    set({
      sqdc: { stores, activeStoreId: storeId },
      shopOpen: true,
      shopId: storeId,
      paused: true,
      showMap: false,
    });
    debouncedPersist();
    return true;
  },

  closeSqdcStore: () => {
    const current = get();
    set({
      sqdc: { ...current.sqdc, activeStoreId: null },
      shopOpen: false,
      shopId: null,
      shopAisle: null,
      paused: false,
    });
    if (current.sqdc.activeStoreId) debouncedPersist();
  },

  registerSqdcStore: (storeId) => {
    if (!getSqdcStore(storeId)) {
      set({ notice: `Succursale SQDC connue` });
      return false;
    }
    const s = get();
    if (s.sqdc.stores.includes(storeId)) return true;
    set({
      sqdc: { ...s.sqdc, stores: [...s.sqdc.stores, storeId] },
    });
    debouncedPersist();
    return true;
  },

  addSqdcLoyaltyPoints: (storeId, amount) => {
    const safeAmount = finiteNumber(amount, 0, 0);
    if (safeAmount <= 0 || !getSqdcStore(storeId)) return false;
    addLoyaltyPoints(LOCAL_PLAYER_ID, storeId, safeAmount);
    debouncedPersist();
    return true;
  },

  resetSave: () => {
    persistNow();
    const fresh = buildDefaultSave();
    set({
      ...fresh,
      playing: false,
      paused: false,
      loading: false,
      staffRoster: snapshotStaff(),
    });
    hydrateStaff(null, AdminRole.INTELLECTUS_AI);
    setDisplayName(LOCAL_PLAYER_ID, fresh.appearance?.name ?? "Citoyen");
    setUserJob(LOCAL_PLAYER_ID, RpJobRole.ETHER_ARCHITECT);
    hotelSecurity.hydrate([], false);
    persistNow();
  },

  reloadSave: () => {
    const fresh = loadInitialSave();
    set({
      ...fresh,
      playing: get().playing,
      paused: get().paused,
      loading: false,
      staffRoster: snapshotStaff(),
    });
    hydrateStaff(fresh.staffRoster, parseAdminRole(fresh.adminRole) ?? AdminRole.INTELLECTUS_AI);
    setDisplayName(LOCAL_PLAYER_ID, fresh.appearance?.name ?? "Citoyen");
    setUserJob(LOCAL_PLAYER_ID, rpJobToRole(fresh.rpJob));
    hotelSecurity.hydrate(fresh.unlockedDoors, fresh.hotelTvOn);
  },
}));

// ═══════════════════════════════════════════════════════════
// PERSIST PHYSIQUE ET RECHARGEMENT
// ═══════════════════════════════════════════════════════════

export function persist() {
  if (typeof localStorage === "undefined") return;
  let e = useGameStore.getState();
  try {
    localStorage.setItem(SAVE, JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      visited: e.visited,
      km: Math.round(e.km * 10) / 10,
      fines: e.fines,
      x: Math.round(e.x * 10) / 10,
      z: Math.round(e.z * 10) / 10,
      yaw: e.yaw,
      timeHours: e.timeHours,
      mode: e.mode,
      night: e.night,
      weather: e.weather,
      leaves: e.leaves,
      lootedItems: e.lootedItems ?? [],
      cash: e.cash,
      inventory: e.inventory,
      licenses: e.licenses,
      notes: e.notes,
      ledger: e.ledger.slice(0, MAX_LEDGER_ENTRIES),
      unlockedDoors: hotelSecurity.snapshot().unlockedDoors,
      hotelTvOn: e.hotelTvOn,
      radioOn: e.radioOn,
      radioId: e.radioId,
      tickets: e.tickets.slice(0, MAX_TICKET_ENTRIES),
      demeritPoints: e.demeritPoints ?? 0,
      licenseSuspendedUntil: e.licenseSuspendedUntil ?? 0,
      appearance: e.appearance,
      vehicleId: e.vehicleId,
      ownedVehicles: e.ownedVehicles,
      equippedTool: e.equippedTool,
      equippedPack: e.equippedPack,
      firm: e.firm,
      cart: e.cart,
      surv: e.surv,
      bank: e.bank,
      economy: e.economy,
      realty: e.realty,
      rpJob: e.rpJob,
      gangId: e.gangId,
      ownedProps: e.ownedProps,
      placed: e.placed,
      selectedSeed: e.selectedSeed,
      houses: e.houses,
      gridOutage: e.gridOutage,
      career: e.career,
      adminRole: e.adminRole,
      staffRoster: snapshotStaff(),
      sqdc: e.sqdc ?? { activeStoreId: null, stores: [] },
    }));
  } catch (err) {
    console.error("[Store] persist() failed:", err);
  }
}

export function persistNow() {
  if (_persistTimer) {
    clearTimeout(_persistTimer);
    _persistTimer = null;
  }
  _persistDirty = false;
  persist();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", persistNow);
  window.addEventListener("pagehide", persistNow);

  window.addEventListener("storage", (event) => {
    if (event.key !== SAVE || !event.newValue) return;
    try {
      const remote = parseStoredSave(event.newValue);
      if (!remote) return;
      const current = useGameStore.getState();
      useGameStore.setState({
        ...current,
        x: finiteNumber(remote.x, current.x),
        z: finiteNumber(remote.z, current.z),
        yaw: finiteNumber(remote.yaw, current.yaw),
        timeHours: finiteNumber(remote.timeHours, current.timeHours, 0, 24),
        weather: parseWeather(remote.weather),
        cash: finiteNumber(remote.cash, current.cash, 0),
        bank: finiteNumber(remote.bank, current.bank, 0),
        inventory: normalizeInventory(remote.inventory),
        sqdc: normalizeSqdcState(remote.sqdc),
      });
    } catch (err) {
      console.warn("[Store] Synchronisation multi-onglets ignorée:", err);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// SÉLECTEURS OPTIMISÉS
// ═══════════════════════════════════════════════════════════

export const selectCash = (s: HudState) => s.cash;
export const selectBank = (s: HudState) => s.bank;
export const selectInventory = (s: HudState) => s.inventory;
export const selectAppearance = (s: HudState) => s.appearance;
export const selectFirm = (s: HudState) => s.firm;
export const selectCareer = (s: HudState) => s.career;
export const selectSqdc = (s: HudState) => s.sqdc;
export const selectVehicle = (s: HudState) => s.vehicleId;
export const selectOwnedVehicles = (s: HudState) => s.ownedVehicles;
export const selectPosition = (s: HudState) => ({ x: s.x, z: s.z, yaw: s.yaw });
export const selectPaused = (s: HudState) => s.paused;
export const selectWeather = (s: HudState) => s.weather;
export const selectTimeHours = (s: HudState) => s.timeHours;
export const selectNight = (s: HudState) => s.night;

export const selectPlayerStats = (s: HudState) => ({
  cash: s.cash,
  bank: s.bank,
  wantedStars: s.wantedStars,
  speedKmh: s.speedKmh,
  bloodAlcohol: s.bloodAlcohol,
});

export const selectUIState = (s: HudState) => ({
  shopOpen: s.shopOpen,
  phoneOpen: s.phoneOpen,
  inventoryOpen: s.inventoryOpen,
  garageOpen: s.garageOpen,
  firmOpen: s.firmOpen,
  chatOpen: s.chatOpen,
  paused: s.paused,
});

export const selectWorldPosition = (s: HudState) => ({
  x: s.x,
  z: s.z,
  yaw: s.yaw,
});

export const selectWallet = (s: HudState) => ({
  cash: s.cash,
  bank: s.bank,
});

export const selectVehicleState = (s: HudState) => ({
  vehicleId: s.vehicleId,
  ownedVehicles: s.ownedVehicles,
  mode: s.mode,
});

export const selectInteriorState = (s: HudState) => ({
  mode: s.mode,
  interiorKind: s.interiorKind,
  interiorTitle: s.interiorTitle,
  interiorSub: s.interiorSub,
});

export const selectBuildState = (s: HudState) => ({
  buildOpen: s.buildOpen,
  buildType: s.buildType,
  buildYaw: s.buildYaw,
  buildScale: s.buildScale,
  placed: s.placed,
});

export const selectAdminState = (s: HudState) => ({
  adminRole: s.adminRole,
  staffRoster: s.staffRoster,
  godMode: s.godMode,
  flyMode: s.flyMode,
  noclipMode: s.noclipMode,
  staffFrozen: s.staffFrozen,
  vanished: s.vanished,
  muted: s.muted,
});

export const selectRuntimeState = (s: HudState) => ({
  playing: s.playing,
  paused: s.paused,
  loading: s.loading,
  timeHours: s.timeHours,
  night: s.night,
  weather: s.weather,
  season: s.season,
  wxCondition: s.wxCondition,
  wxTemp: s.wxTemp,
  snowCm: s.snowCm,
});

export type GameStoreState = ReturnType<typeof useGameStore.getState>;

