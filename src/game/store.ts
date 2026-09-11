import { create } from "zustand";
import { parseAppearance, type Appearance, type OutfitId } from "./character";
import { parsePlaced, type PlacedProp, type PropId } from "./builder";
import {
  bagCapacity,
  bagWeight,
  cartTotals,
  itemById,
  sellPrice,
} from "./commerce";
import {
  canOperate,
  generateNEQ,
  generatePermitNumber,
  nearestVillageName,
  parseFirm,
  PERMIT_FEES,
  startupTotal,
  nextFirmSale,
  canApplyGrant,
  type Firm,
  type FirmType,
  type PermitId,
  type MapaqGrantId,
} from "./business";
import { fleetById, hasCaisse, isVehicleId, type VehicleId } from "./fleet";
import { hotelSecurity } from "./hotel";
import { rollBoard, type HaulJob } from "./jobs";
import { police, type CitationNotice } from "./police";
import { crimeById, deedById, gangById, jobById, payrollNet, withTax, type RpJobId } from "./rp";
import { applyMeal, FRESH_SURVIVAL, parseSurvival, tickSurvival, type SurvivalSnap } from "./survival";
import { cropFromSeed, type CropId } from "./farms";
import {
  emptyHouse,
  parseHouses,
  renoById,
  hasReno,
  type BasementFit,
  type DoorSlot,
  type GarageFit,
  type HouseState,
  type KeyRole,
  type RenoId,
} from "./house";
import {
  FURNACE_REPAIR,
  LOGISVERT,
  PIPE_THAW,
  WOOD_MAX,
  heatById,
  tickHouseUtils,
  waterById,
  type GridOutage,
  type HeatId,
  type WaterId,
} from "./utilities";
import { SPAWN } from "./worlddata";
import {
  canPurchase,
  grantLicense,
  licenseFromItem,
  parseLicenses,
  type LicenseId,
} from "./weapons";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: "chat" | "system" | "admin";
  timestamp: number;
}

export type WeatherId = "clear" | "rain" | "snow" | "fog" | "storm";
export type PlayMode = "drive" | "walk" | "interior";
export type CameraMode = "chase" | "hood";

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
}

export interface HudState {
  playing: boolean;
  paused: boolean;
  loading: boolean;
  showMap: boolean;
  night: boolean;
  cameraMode: CameraMode;
  speedKmh: number;
  limit: number;
  zone: string;
  surface: string;
  speeding: boolean;
  fineFlash: number;
  poi: string | null;
  poiDesc: string | null;
  yaw: number;
  timeHours: number;
  mode: PlayMode;
  prompt: string | null;
  leaves: string[];
  cash: number;
  bank: number;
  notice: string | null;
  shopOpen: boolean;
  shopId: string | null;
  shopAisle: string | null;
  fauna: string | null;
  wantedStars: number;
  wantedReason: string;
  bounty: number;
  evading: boolean;
  radioOn: boolean;
  radioTrack: string | null;
  radioId: string | null;
  dispatch: string | null;
  citationOpen: boolean;
  citation: CitationNotice | null;
  tickets: TicketRecord[];
  creatorOpen: boolean;
  appearance: Appearance;
  inventoryOpen: boolean;
  garageOpen: boolean;
  jobsOpen: boolean;
  firmOpen: boolean;
  cartOpen: boolean;
  atmOpen: boolean;
  propertyOpen: boolean;
  elevatorOpen: boolean;
  lobbyLights: boolean;
  interiorKind: string | null;
  sitting: boolean;
  interiorTitle: string | null;
  interiorSub: string | null;
  cart: Record<string, number>;
  job: HaulJob | null;
  jobBoard: HaulJob[];
  x: number;
  z: number;
  inventory: Record<string, number>;
  licenses: LicenseId[];
  equippedPack: string | null;
  equippedTool: string | null;
  firm: Firm | null;
  surv: SurvivalSnap;
  phoneOpen: boolean;
  lockOpen: boolean;
  lockDoorId: string | null;
  lockDoorName: string | null;
  consoleOpen: boolean;
  notes: string;
  ledger: LedgerEntry[];
  godMode: boolean;
  flyMode: boolean;
  noclipMode: boolean;
  weather: WeatherId;
  chat: ChatMessage[];
  unlockedDoors: string[];
  hotelTvOn: boolean;
  vehicleId: VehicleId;
  ownedVehicles: VehicleId[];
  km: number;
  fines: number;
  visited: string[];
  rpJob: RpJobId;
  gangId: string | null;
  ownedProps: string[];
  atmId: string | null;
  deedId: string | null;
  buildOpen: boolean;
  buildType: PropId | null;
  buildYaw: number;
  buildScale: number;
  placed: PlacedProp[];
  selectedSeed: CropId | null;
  houses: Record<string, HouseState>;
  homeFloor: "main" | "basement";
  gridOutage: GridOutage | null;
  start: () => void;
  togglePause: () => void;
  setHud: (p: Partial<HudState>) => void;
  visit: (id: string) => void;
  addCash: (n: number, notice?: string) => void;
  addItem: (id: string, n?: number) => void;
  grantLic: (id: LicenseId) => void;
  addChat: (sender: string, text: string, type?: ChatMessage["type"]) => void;
  toggleFly: () => void;
  toggleNoclip: () => void;
  setWeather: (id: WeatherId) => void;
  buyItem: (id: string) => boolean;
  sellItem: (id: string) => void;
  sellStack: (id: string) => void;
  dropItem: (id: string, n?: number) => void;
  useItem: (id: string) => boolean;
  openShop: (id: string, aisle?: string | null) => void;
  closeShop: () => void;
  openPhone: () => void;
  closePhone: () => void;
  openLock: (id: string, name: string) => void;
  closeLock: () => void;
  openConsole: () => void;
  closeConsole: () => void;
  openCitation: (c: CitationNotice) => void;
  closeCitation: () => void;
  openCreator: () => void;
  closeCreator: () => void;
  setAppearance: (p: Partial<Appearance>) => void;
  openInventory: () => void;
  closeInventory: () => void;
  openGarage: () => void;
  closeGarage: () => void;
  buyVehicle: (id: VehicleId) => boolean;
  equipVehicle: (id: VehicleId) => boolean;
  openJobs: () => void;
  closeJobs: () => void;
  acceptJob: (id: string) => void;
  abandonJob: () => void;
  progressHaul: (kind: string) => void;
  openFirm: () => void;
  closeFirm: () => void;
  foundFirm: (type: FirmType, name: string) => boolean;
  buyPermit: (type: PermitId) => boolean;
  toggleFirmOpen: () => void;
  stockIn: (itemId: string) => void;
  stockOut: (itemId: string) => void;
  withdrawFirm: () => void;
  payFirmTax: () => void;
  tickFirm: (elapsed: number) => void;
  hireStaff: () => boolean;
  fireStaff: () => boolean;
  applyMapaqGrant: (id: MapaqGrantId) => boolean;
  toggleHotelTv: () => void;
  addToCart: (itemId: string) => boolean;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  checkoutCart: () => boolean;
  tickSurvival: (dt: number, ctx: Parameters<typeof tickSurvival>[2]) => void;
  openAtm: (id: string) => void;
  closeAtm: () => void;
  atmOp: (action: "deposit" | "withdraw", amount: number) => boolean;
  openDeed: (id: string) => void;
  closeDeed: () => void;
  buyDeed: () => boolean;
  buyReno: (id: RenoId) => boolean;
  installHeat: (id: HeatId) => boolean;
  setWater: (id: WaterId) => boolean;
  toggleHeat: () => boolean;
  toggleHydro: () => boolean;
  toggleWater: () => boolean;
  loadWood: (n?: number) => boolean;
  repairFurnace: () => boolean;
  thawPipes: () => boolean;
  tickUtilities: (dt: number, ctx: { ambient: number; month: number; elapsed: number; weather: WeatherId }) => void;
  setBasement: (fit: BasementFit) => boolean;
  toggleGarageFit: (fit: GarageFit) => boolean;
  setGarageBays: (n: 1 | 2 | 3) => boolean;
  cutHouseKey: (role: KeyRole) => boolean;
  toggleDoorLock: (slot: DoorSlot) => boolean;
  parkInGarage: (vehicleId: string) => boolean;
  takeFromGarage: (vehicleId: string) => boolean;
  setRpJob: (id: RpJobId) => void;
  joinGang: (id: string) => boolean;
  leaveGang: () => void;
  commitCrime: (crime: string, elapsed: number) => boolean;
  tickPayroll: (elapsed: number) => void;
  openElevator: () => void;
  closeElevator: () => void;
  sit: () => void;
  stand: () => void;
  toggleLobbyLights: () => void;
  ringBell: () => void;
  overlayOpen: () => boolean;
  toggleBuild: () => void;
  selectProp: (id: PropId | null) => void;
  rotateGhost: () => void;
  scaleGhost: (dir: 1 | -1) => void;
  addPlaced: (p: PlacedProp) => void;
  removePlaced: (id: string) => void;
  clearPlaced: () => void;
}

const SAVE = "portneuf-save-v1";

function pushLedger(list: LedgerEntry[], label: string, amount: number): LedgerEntry[] {
  return [{ id: `${Date.now()}-${label}`, label, amount, at: Date.now() }, ...list].slice(0, 16);
}

function parseWeather(raw: unknown): WeatherId {
  return raw === "rain" || raw === "snow" || raw === "fog" || raw === "storm" ? raw : "clear";
}

function parseGrid(raw: unknown): GridOutage | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as { kind?: unknown; t?: unknown };
  if (d.kind !== "verglas" && d.kind !== "panne") return null;
  const t = typeof d.t === "number" && d.t > 0 ? d.t : 0;
  if (t <= 0) return null;
  return { kind: d.kind, t };
}

function takeInv(inv: Record<string, number>, id: string, n: number): Record<string, number> {
  const next = { ...inv };
  const left = (next[id] ?? 0) - n;
  if (left <= 0) delete next[id];
  else next[id] = left;
  return next;
}

const WEAR_OUTFIT: Record<string, OutfitId> = {
  veste: "canadienne",
  goose: "goose",
  roots: "roots",
  nike: "nike",
  kaki: "sq",
};

const EMPTY_SAVE = {
  visited: [] as string[],
  km: 0,
  fines: 0,
  x: SPAWN.x,
  z: SPAWN.z,
  yaw: SPAWN.yaw,
  night: false,
  weather: "clear" as WeatherId,
  leaves: [] as string[],
  cash: 240,
  inventory: {} as Record<string, number>,
  licenses: [] as LicenseId[],
  notes: "",
  ledger: [] as LedgerEntry[],
  tickets: [] as TicketRecord[],
  appearance: parseAppearance(null),
  vehicleId: "pickup" as VehicleId,
  ownedVehicles: ["pickup"] as VehicleId[],
  equippedTool: null as string | null,
  equippedPack: null as string | null,
  firm: null as Firm | null,
  cart: {} as Record<string, number>,
  surv: { ...FRESH_SURVIVAL },
  bank: 2500,
  rpJob: "civil" as RpJobId,
  gangId: null as string | null,
  ownedProps: [] as string[],
  unlockedDoors: [] as string[],
  radioOn: false,
  radioId: "ckoi",
  hotelTvOn: false,
  placed: [] as PlacedProp[],
  selectedSeed: null as CropId | null,
  houses: {} as Record<string, HouseState>,
  gridOutage: null as GridOutage | null,
};

function loadVisited(): typeof EMPTY_SAVE {
  if (typeof localStorage === "undefined") return { ...EMPTY_SAVE };
  try {
    const raw = localStorage.getItem(SAVE);
    if (!raw) return { ...EMPTY_SAVE };
    const d = JSON.parse(raw) as Partial<typeof EMPTY_SAVE>;
    return {
      visited: d.visited ?? [],
      km: d.km ?? 0,
      fines: d.fines ?? 0,
      x: typeof d.x === "number" ? d.x : SPAWN.x,
      z: typeof d.z === "number" ? d.z : SPAWN.z,
      yaw: typeof d.yaw === "number" ? d.yaw : SPAWN.yaw,
      night: Boolean(d.night),
      weather: parseWeather((d as { weather?: unknown }).weather),
      leaves: Array.isArray(d.leaves) ? d.leaves : [],
      cash: typeof d.cash === "number" ? d.cash : 240,
      inventory: d.inventory && typeof d.inventory === "object" ? d.inventory : {},
      licenses: parseLicenses((d as { licenses?: unknown }).licenses),
      notes: typeof d.notes === "string" ? d.notes : "",
      ledger: Array.isArray(d.ledger) ? d.ledger : [],
      unlockedDoors: Array.isArray(d.unlockedDoors) ? d.unlockedDoors : [],
      radioOn: Boolean(d.radioOn),
      radioId: typeof d.radioId === "string" ? d.radioId : "ckoi",
      tickets: Array.isArray(d.tickets) ? d.tickets : [],
      appearance: parseAppearance((d as { appearance?: unknown }).appearance),
      vehicleId: isVehicleId((d as { vehicleId?: string }).vehicleId ?? "")
        ? ((d as { vehicleId: VehicleId }).vehicleId)
        : "pickup",
      ownedVehicles: Array.isArray((d as { ownedVehicles?: string[] }).ownedVehicles)
        ? (["pickup", ...((d as { ownedVehicles: string[] }).ownedVehicles)].filter(
            (id, i, a): id is VehicleId => isVehicleId(id) && a.indexOf(id) === i,
          ) as VehicleId[])
        : (["pickup"] as VehicleId[]),
      equippedTool: typeof (d as { equippedTool?: unknown }).equippedTool === "string" ? (d as { equippedTool: string }).equippedTool : null,
      equippedPack: typeof (d as { equippedPack?: unknown }).equippedPack === "string" ? (d as { equippedPack: string }).equippedPack : null,
      firm: parseFirm((d as { firm?: unknown }).firm),
      hotelTvOn: Boolean((d as { hotelTvOn?: unknown }).hotelTvOn),
      cart: (d as { cart?: Record<string, number> }).cart && typeof (d as { cart?: unknown }).cart === "object"
        ? ((d as { cart: Record<string, number> }).cart)
        : {},
      surv: parseSurvival((d as { surv?: unknown }).surv),
      bank: typeof (d as { bank?: unknown }).bank === "number" ? (d as { bank: number }).bank : 2500,
      rpJob: jobById(String((d as { rpJob?: unknown }).rpJob ?? "civil")).id,
      gangId: typeof (d as { gangId?: unknown }).gangId === "string" ? (d as { gangId: string }).gangId : null,
      ownedProps: Array.isArray((d as { ownedProps?: unknown }).ownedProps)
        ? ((d as { ownedProps: string[] }).ownedProps)
        : [],
      placed: parsePlaced((d as { placed?: unknown }).placed),
      selectedSeed: (["mais", "ble", "foin", "patate", "cannabis"] as CropId[]).includes(
        String((d as { selectedSeed?: unknown }).selectedSeed) as CropId,
      )
        ? (String((d as { selectedSeed?: unknown }).selectedSeed) as CropId)
        : null,
      houses: parseHouses((d as { houses?: unknown }).houses),
      gridOutage: parseGrid((d as { gridOutage?: unknown }).gridOutage),
    };
  } catch {
    return { ...EMPTY_SAVE };
  }
}

const initial = loadVisited();
hotelSecurity.hydrate(initial.unlockedDoors, initial.hotelTvOn);

export const useGameStore = create<HudState>((set, get) => ({
  playing: false,
  paused: false,
  loading: true,
  showMap: false,
  night: initial.night,
  weather: initial.weather,
  cameraMode: "chase",
  speedKmh: 0,
  limit: 90,
  zone: "Route 138",
  surface: "Asphalte",
  speeding: false,
  fineFlash: 0,
  poi: null,
  poiDesc: null,
  yaw: initial.yaw,
  timeHours: 16,
  mode: "drive",
  prompt: null,
  leaves: initial.leaves,
  cash: initial.cash,
  bank: initial.bank,
  notice: null,
  shopOpen: false,
  shopId: null,
  shopAisle: null,
  fauna: null,
  wantedStars: 0,
  wantedReason: "",
  bounty: 0,
  evading: false,
  radioOn: initial.radioOn,
  radioTrack: null,
  radioId: initial.radioId,
  dispatch: null,
  citationOpen: false,
  citation: null,
  tickets: initial.tickets,
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
  notes: initial.notes,
  ledger: initial.ledger,
  godMode: false,
  flyMode: false,
  noclipMode: false,
  chat: [] as ChatMessage[],
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
  homeFloor: "main" as const,
  gridOutage: initial.gridOutage,
  overlayOpen: () => {
    const s = get();
    return (
      s.shopOpen || s.phoneOpen || s.lockOpen || s.consoleOpen || s.showMap || s.citationOpen ||
      s.creatorOpen || s.inventoryOpen || s.garageOpen || s.jobsOpen || s.firmOpen || s.cartOpen ||
      s.atmOpen || s.propertyOpen || s.elevatorOpen
    );
  },
  start: () => set({ playing: true, paused: false }),
  togglePause: () => {
    const s = get();
    if (s.shopOpen) return get().closeShop();
    if (s.phoneOpen) return get().closePhone();
    if (s.lockOpen) return get().closeLock();
    if (s.consoleOpen) return get().closeConsole();
    if (s.citationOpen) return get().closeCitation();
    if (s.creatorOpen) return get().closeCreator();
    if (s.inventoryOpen) return get().closeInventory();
    if (s.garageOpen) return get().closeGarage();
    if (s.jobsOpen) return get().closeJobs();
    if (s.firmOpen) return get().closeFirm();
    if (s.cartOpen) return get().closeCart();
    if (s.atmOpen) return get().closeAtm();
    if (s.propertyOpen) return get().closeDeed();
    if (s.elevatorOpen) return get().closeElevator();
    if (s.buildOpen) return get().toggleBuild();
    const paused = !s.paused;
    set({ paused, showMap: paused ? s.showMap : false });
  },
  setHud: (p) => set(p as Partial<HudState>),
  visit: (id) => {
    const visited = get().visited;
    if (visited.includes(id)) return;
    set({ visited: [...visited, id] });
  },
  addCash: (n, notice) => {
    const s = get();
    set({
      cash: Math.round((s.cash + n) * 100) / 100,
      notice: notice ?? s.notice,
      ledger: n !== 0 ? pushLedger(s.ledger, notice ?? "Espèces", n) : s.ledger,
    });
    persist();
  },
  addItem: (id, n = 1) => {
    const inv = { ...get().inventory };
    inv[id] = (inv[id] ?? 0) + n;
    const lic = licenseFromItem(id);
    const licenses = lic ? grantLicense(get().licenses, lic) : get().licenses;
    set({ inventory: inv, licenses });
    persist();
  },
  grantLic: (id) => {
    set({ licenses: grantLicense(get().licenses, id), notice: `Permis · ${id}` });
    persist();
  },
  addChat: (sender, text, type = "chat") => {
    const line: ChatMessage = {
      id: Math.random().toString(36).slice(2, 8),
      sender,
      text,
      type,
      timestamp: Date.now(),
    };
    set({ chat: [...get().chat, line].slice(-24) });
  },
  toggleFly: () => {
    const on = !get().flyMode;
    set({ flyMode: on, notice: on ? "Vol" : "Vol coupé" });
  },
  toggleNoclip: () => {
    const on = !get().noclipMode;
    set({ noclipMode: on, notice: on ? "Noclip" : "Noclip coupé" });
  },
  setWeather: (id) => {
    set({ weather: id, notice: `Météo · ${id}` });
    persist();
  },
  buyItem: (id) => {
    const item = itemById(id);
    if (!item) return false;
    const s = get();
    const gate = canPurchase(s.licenses, id);
    if (!gate.ok) {
      set({ notice: gate.message ?? "Permis requis" });
      return false;
    }
    if (s.cash < item.price) {
      set({ notice: "Pas assez d'espèces" });
      return false;
    }
    const cap = bagCapacity(s.equippedPack);
    if (bagWeight(s.inventory) + item.weight > cap + 0.05) {
      set({ notice: "Sac trop lourd" });
      return false;
    }
    const inventory = { ...s.inventory, [id]: (s.inventory[id] ?? 0) + 1 };
    const lic = licenseFromItem(id);
    set({
      cash: Math.round((s.cash - item.price) * 100) / 100,
      inventory,
      licenses: lic ? grantLicense(s.licenses, lic) : s.licenses,
      notice: item.name,
      ledger: pushLedger(s.ledger, item.name, -item.price),
    });
    persist();
    return true;
  },
  sellItem: (id) => {
    const item = itemById(id);
    const s = get();
    if (!item || (s.inventory[id] ?? 0) < 1) return;
    const price = sellPrice(item);
    set({
      inventory: takeInv(s.inventory, id, 1),
      cash: Math.round((s.cash + price) * 100) / 100,
      notice: `Vendu · ${item.name}`,
      ledger: pushLedger(s.ledger, `Revente ${item.name}`, price),
    });
    persist();
  },
  sellStack: (id) => {
    const item = itemById(id);
    const s = get();
    const n = s.inventory[id] ?? 0;
    if (!item || n < 1) return;
    const price = Math.round(sellPrice(item) * n * 100) / 100;
    const inventory = { ...s.inventory };
    delete inventory[id];
    set({
      inventory,
      cash: Math.round((s.cash + price) * 100) / 100,
      notice: `Vendu · ${item.name} ×${n}`,
      ledger: pushLedger(s.ledger, `Revente ${item.name}`, price),
    });
    persist();
  },
  dropItem: (id, n = 1) => {
    const s = get();
    if ((s.inventory[id] ?? 0) < n) return;
    set({ inventory: takeInv(s.inventory, id, n), notice: "Objet laissé" });
    persist();
  },
  useItem: (id) => {
    const item = itemById(id);
    const s = get();
    if (!item || (s.inventory[id] ?? 0) < 1) return false;
    if (id === "corde_bois") {
      return get().loadWood(1);
    }
    if (item.use === "eat" || item.use === "drink") {
      set({
        inventory: takeInv(s.inventory, id, 1),
        surv: applyMeal(s.surv, item.use === "drink" ? "drink" : "eat"),
        notice: item.name,
      });
      persist();
      return true;
    }
    if (item.use === "seed") {
      const crop = cropFromSeed(id);
      set({ selectedSeed: crop, notice: `Semence · ${item.name}` });
      persist();
      return true;
    }
    if (item.use === "tool") {
      set({ equippedTool: s.equippedTool === id ? null : id, notice: s.equippedTool === id ? "Rangé" : item.name });
      persist();
      return true;
    }
    if (item.use === "wear") {
      if (id.startsWith("sac")) {
        set({ equippedPack: s.equippedPack === id ? null : id, notice: item.name });
      } else {
        const outfit = WEAR_OUTFIT[id] ?? s.appearance.outfit;
        const hairStyle = id === "tuque" ? "chapeau" : s.appearance.hairStyle;
        set({ appearance: { ...s.appearance, outfit, hairStyle }, notice: `Porté · ${item.name}` });
      }
      persist();
      return true;
    }
    if (item.use === "fuel" || item.use === "drug") {
      set({ inventory: takeInv(s.inventory, id, 1), notice: item.name });
      persist();
      return true;
    }
    return false;
  },
  openShop: (id, aisle) => set({ shopOpen: true, shopId: id, shopAisle: aisle ?? null, paused: true, showMap: false, phoneOpen: false }),
  closeShop: () => set({ shopOpen: false, shopAisle: null, paused: false }),
  openPhone: () => set({ phoneOpen: true, paused: true, showMap: false }),
  closePhone: () => set({ phoneOpen: false, paused: false }),
  openLock: (id, name) => set({ lockOpen: true, lockDoorId: id, lockDoorName: name, paused: true }),
  closeLock: () => set({ lockOpen: false, lockDoorId: null, lockDoorName: null, paused: false }),
  openConsole: () => set({ consoleOpen: true, paused: true }),
  closeConsole: () => set({ consoleOpen: false, paused: false }),
  openCitation: (c) => set({ citationOpen: true, citation: c, paused: true, tickets: [{ article: c.article, description: c.description, fine: c.fine, at: Date.now(), kind: c.kind }, ...get().tickets].slice(0, 16) }),
  closeCitation: () => set({ citationOpen: false, citation: null, paused: false }),
  openCreator: () => set({ creatorOpen: true, paused: true }),
  closeCreator: () => set({ creatorOpen: false, paused: false }),
  setAppearance: (p) => set({ appearance: parseAppearance({ ...get().appearance, ...p }) }),
  openInventory: () => set({ inventoryOpen: true, paused: true }),
  closeInventory: () => set({ inventoryOpen: false, paused: false }),
  openGarage: () => set({ garageOpen: true, paused: true }),
  closeGarage: () => set({ garageOpen: false, paused: false }),
  buyVehicle: (id) => {
    const spec = fleetById(id);
    const s = get();
    if (!spec) return false;
    if (s.ownedVehicles.includes(id)) return get().equipVehicle(id);
    if (spec.pro) {
      if (!s.firm) { set({ notice: "Immatriculez au REQ" }); return false; }
      if (s.firm.balance < spec.price) { set({ notice: "Caisse entreprise insuffisante" }); return false; }
      set({
        firm: { ...s.firm, balance: Math.round((s.firm.balance - spec.price) * 100) / 100 },
        ownedVehicles: [...s.ownedVehicles, id],
        vehicleId: id,
        notice: `${spec.name} · caisse −${spec.price}\u00a0$`,
      });
      persist();
      return true;
    }
    if (s.cash < spec.price) { set({ notice: "Pas assez d'espèces" }); return false; }
    set({
      cash: Math.round((s.cash - spec.price) * 100) / 100,
      ownedVehicles: [...s.ownedVehicles, id],
      vehicleId: id,
      notice: spec.name,
      ledger: pushLedger(s.ledger, spec.name, -spec.price),
    });
    persist();
    return true;
  },
  equipVehicle: (id) => {
    if (!get().ownedVehicles.includes(id)) return false;
    set({ vehicleId: id, garageOpen: false, paused: false });
    persist();
    return true;
  },
  openJobs: () => set({ jobsOpen: true, paused: true, jobBoard: get().jobBoard.length ? get().jobBoard : rollBoard() }),
  closeJobs: () => set({ jobsOpen: false, paused: false }),
  acceptJob: (id) => {
    const offer = get().jobBoard.find((j) => j.id === id);
    if (!offer) return;
    set({ job: { ...offer, loaded: false }, jobsOpen: false, paused: false, notice: offer.title });
    persist();
  },
  abandonJob: () => set({ job: null, jobBoard: rollBoard() }),
  progressHaul: (kind) => {
    const s = get();
    const job = s.job;
    if (!job) return;
    if (!job.loaded) {
      if (job.needs === "pickup" && !hasCaisse(kind)) {
        set({ notice: "Il faut une caisse" });
        return;
      }
      set({ job: { ...job, loaded: true }, notice: `Chargé · ${job.from.name}` });
      return;
    }
    set({
      job: null,
      jobBoard: rollBoard(),
      cash: Math.round((s.cash + job.pay) * 100) / 100,
      notice: `Livré · ${job.to.name} · +${job.pay}\u00a0$`,
      ledger: pushLedger(s.ledger, job.title, job.pay),
    });
    persist();
  },
  openFirm: () => set({ firmOpen: true, paused: true }),
  closeFirm: () => set({ firmOpen: false, paused: false }),
  foundFirm: (type, name) => {
    const s = get();
    const total = startupTotal(type);
    if (s.cash < total) { set({ notice: "Fonds insuffisants" }); return false; }
    const village = nearestVillageName(s.x, s.z);
    const firm: Firm = {
      id: `firm-${Date.now()}`,
      neq: generateNEQ(),
      tradeName: name || type,
      type,
      village,
      x: s.x,
      z: s.z,
      status: "en_demarrage",
      balance: 0,
      taxOwed: 0,
      permits: [],
      stock: {},
      isOpen: false,
      lifetimeRevenue: 0,
      staff: 0,
      grants: {},
    };
    set({
      cash: Math.round((s.cash - total) * 100) / 100,
      firm,
      notice: `Immatriculée · NEQ ${firm.neq}`,
      ledger: pushLedger(s.ledger, "Immatriculation REQ", -total),
    });
    persist();
    return true;
  },
  buyPermit: (type) => {
    const s = get();
    if (!s.firm) return false;
    if (s.firm.permits.some((p) => p.type === type)) return false;
    const fee = PERMIT_FEES[type].fee;
    if (s.cash < fee) { set({ notice: "Pas assez d'espèces" }); return false; }
    const permits = [...s.firm.permits, { type, number: generatePermitNumber(type) }];
    const ready = canOperate({ ...s.firm, permits, status: "active" }).ok;
    set({
      cash: Math.round((s.cash - fee) * 100) / 100,
      firm: { ...s.firm, permits, status: ready ? "active" : s.firm.status },
      notice: PERMIT_FEES[type].label,
      ledger: pushLedger(s.ledger, PERMIT_FEES[type].label, -fee),
    });
    persist();
    return true;
  },
  toggleFirmOpen: () => {
    const firm = get().firm;
    if (!firm) return;
    set({ firm: { ...firm, isOpen: !firm.isOpen } });
    persist();
  },
  stockIn: (itemId) => {
    const s = get();
    if (!s.firm || (s.inventory[itemId] ?? 0) < 1) return;
    const stock = { ...s.firm.stock, [itemId]: (s.firm.stock[itemId] ?? 0) + 1 };
    set({ firm: { ...s.firm, stock }, inventory: takeInv(s.inventory, itemId, 1) });
    persist();
  },
  stockOut: (itemId) => {
    const s = get();
    if (!s.firm || (s.firm.stock[itemId] ?? 0) < 1) return;
    const stock = { ...s.firm.stock };
    stock[itemId] -= 1;
    if (stock[itemId] <= 0) delete stock[itemId];
    const inventory = { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 };
    set({ firm: { ...s.firm, stock }, inventory });
    persist();
  },
  withdrawFirm: () => {
    const s = get();
    if (!s.firm || s.firm.balance < 1) return;
    const n = Math.floor(s.firm.balance);
    set({
      firm: { ...s.firm, balance: Math.round((s.firm.balance - n) * 100) / 100 },
      cash: Math.round((s.cash + n) * 100) / 100,
      notice: `Retrait caisse · ${n}\u00a0$`,
      ledger: pushLedger(s.ledger, "Retrait enseigne", n),
    });
    persist();
  },
  payFirmTax: () => {
    const s = get();
    if (!s.firm || s.firm.taxOwed <= 0) return;
    if (s.firm.balance < s.firm.taxOwed) { set({ notice: "Caisse insuffisante" }); return; }
    set({ firm: { ...s.firm, balance: Math.round((s.firm.balance - s.firm.taxOwed) * 100) / 100, taxOwed: 0 }, notice: "Remise TPS+TVQ" });
    persist();
  },
  tickFirm: (elapsed) => {
    const s = get();
    if (!s.firm || !s.firm.isOpen) return;
    if (!canOperate(s.firm).ok) return;
    const sale = nextFirmSale(s.firm, elapsed);
    if (sale.take <= 0 && !sale.sold) return;
    const stock = { ...s.firm.stock };
    if (sale.sold && stock[sale.sold]) {
      stock[sale.sold] -= 1;
      if (stock[sale.sold]! <= 0) delete stock[sale.sold];
    }
    set({
      firm: {
        ...s.firm,
        stock,
        balance: Math.round((s.firm.balance + sale.take) * 100) / 100,
        taxOwed: Math.round((s.firm.taxOwed + sale.tax) * 100) / 100,
        lifetimeRevenue: Math.round((s.firm.lifetimeRevenue + sale.take) * 100) / 100,
      },
    });
  },
  hireStaff: () => {
    const s = get();
    if (!s.firm) return false;
    if ((s.firm.staff ?? 0) >= 6) { set({ notice: "Effectif plein" }); return false; }
    if (s.firm.balance < 80 && s.cash < 80) { set({ notice: "Pas de fonds pour embaucher" }); return false; }
    const fromFirm = s.firm.balance >= 80;
    set({
      cash: fromFirm ? s.cash : Math.round((s.cash - 80) * 100) / 100,
      firm: {
        ...s.firm,
        staff: (s.firm.staff ?? 0) + 1,
        balance: fromFirm ? Math.round((s.firm.balance - 80) * 100) / 100 : s.firm.balance,
      },
      notice: "Embauche · 80 $",
    });
    persist();
    return true;
  },
  fireStaff: () => {
    const s = get();
    if (!s.firm || (s.firm.staff ?? 0) < 1) return false;
    set({ firm: { ...s.firm, staff: s.firm.staff - 1 }, notice: "Employé congédié" });
    persist();
    return true;
  },
  applyMapaqGrant: (id) => {
    const s = get();
    if (!s.firm) { set({ notice: "Immatriculez au REQ" }); return false; }
    const check = canApplyGrant(s.firm, id);
    if (!check.ok) { set({ notice: check.reason }); return false; }
    if (s.cash < 8 && s.firm.balance < 8) { set({ notice: "Frais de dossier 8 $" }); return false; }
    const fromFirm = s.firm.balance >= 8;
    set({
      cash: fromFirm ? s.cash : Math.round((s.cash - 8) * 100) / 100,
      firm: {
        ...s.firm,
        balance: Math.round((s.firm.balance + check.amount - (fromFirm ? 8 : 0)) * 100) / 100,
        grants: { ...(s.firm.grants ?? {}), [id]: check.amount },
      },
      notice: check.reason,
      ledger: pushLedger(s.ledger, check.reason, check.amount),
    });
    persist();
    return true;
  },
  toggleHotelTv: () => {
    const next = hotelSecurity.toggleTv();
    set({ hotelTvOn: next, notice: next ? "TV · Best Life" : "TV éteinte" });
  },
  addToCart: (itemId) => {
    const item = itemById(itemId);
    if (!item) return false;
    const s = get();
    const n = (s.cart[itemId] ?? 0) + 1;
    set({ cart: { ...s.cart, [itemId]: n }, notice: `${item.name} · panier` });
    return true;
  },
  removeFromCart: (itemId) => {
    const s = get();
    const n = (s.cart[itemId] ?? 0) - 1;
    const cart = { ...s.cart };
    if (n <= 0) delete cart[itemId];
    else cart[itemId] = n;
    set({ cart });
  },
  clearCart: () => set({ cart: {} }),
  openCart: () => set({ cartOpen: true, paused: true }),
  closeCart: () => set({ cartOpen: false, paused: false }),
  checkoutCart: () => {
    const s = get();
    const t = cartTotals(s.cart);
    if (t.count < 1) return false;
    if (s.cash < t.total) { set({ notice: "Pas assez d'espèces" }); return false; }
    for (const line of t.lines) {
      const gate = canPurchase(s.licenses, line.item.id);
      if (!gate.ok) {
        set({ notice: gate.message ?? "Permis requis" });
        return false;
      }
    }
    const inventory = { ...s.inventory };
    let licenses = s.licenses;
    for (const line of t.lines) {
      inventory[line.item.id] = (inventory[line.item.id] ?? 0) + line.qty;
      const lic = licenseFromItem(line.item.id);
      if (lic) licenses = grantLicense(licenses, lic);
    }
    set({
      cash: Math.round((s.cash - t.total) * 100) / 100,
      inventory,
      licenses,
      cart: {},
      cartOpen: false,
      paused: false,
      notice: `Caisse · ${t.total}\u00a0$`,
      ledger: pushLedger(s.ledger, "Panier Éther", -t.total),
    });
    persist();
    return true;
  },
  tickSurvival: (dt, ctx) => set({ surv: tickSurvival(get().surv, dt, ctx) }),
  openAtm: (id) => set({ atmOpen: true, atmId: id, paused: true, showMap: false, phoneOpen: false, shopOpen: false }),
  closeAtm: () => set({ atmOpen: false, atmId: null, paused: false }),
  atmOp: (action, amount) => {
    const s = get();
    const n = Math.max(1, Math.round(amount));
    if (action === "deposit") {
      if (s.cash < n) { set({ notice: "Pas assez d'espèces" }); return false; }
      set({
        cash: Math.round((s.cash - n) * 100) / 100,
        bank: Math.round((s.bank + n) * 100) / 100,
        notice: `Dépôt · ${n}\u00a0$`,
        ledger: pushLedger(s.ledger, "Dépôt Desjardins", -n),
      });
      persist();
      return true;
    }
    const fee = Math.max(1, Math.round(n * 0.01));
    if (s.bank < n + fee) { set({ notice: "Solde insuffisant · frais 1 %" }); return false; }
    set({
      cash: Math.round((s.cash + n) * 100) / 100,
      bank: Math.round((s.bank - n - fee) * 100) / 100,
      notice: `Retrait · ${n}\u00a0$ · frais ${fee}\u00a0$`,
      ledger: pushLedger(s.ledger, "Retrait Desjardins", n),
    });
    persist();
    return true;
  },
  openDeed: (id) => set({ propertyOpen: true, deedId: id, paused: true, showMap: false, phoneOpen: false }),
  closeDeed: () => set({ propertyOpen: false, deedId: null, paused: false }),
  buyDeed: () => {
    const s = get();
    const deed = deedById(s.deedId ?? "");
    if (!deed || s.ownedProps.includes(deed.id)) return false;
    const { tax, total } = withTax(deed.price);
    if (s.cash < total) { set({ notice: "Fonds insuffisants" }); return false; }
    const inv = { ...s.inventory, cle_maison: (s.inventory.cle_maison ?? 0) + 1 };
    set({
      cash: Math.round((s.cash - total) * 100) / 100,
      ownedProps: [...s.ownedProps, deed.id],
      houses: { ...s.houses, [deed.id]: s.houses[deed.id] ?? emptyHouse(deed.id, deed.town) },
      inventory: inv,
      propertyOpen: true,
      paused: true,
      notice: `Acte · ${deed.name} · clés dans la poche`,
      ledger: pushLedger(s.ledger, `Maison · ${deed.town}`, -total),
    });
    persist();
    return true;
  },
  buyReno: (id) => {
    const s = get();
    const deed = deedById(s.deedId ?? "");
    if (!deed || !s.ownedProps.includes(deed.id)) return false;
    const spec = renoById(id);
    const cur = s.houses[deed.id] ?? emptyHouse(deed.id);
    if (cur.renos.includes(id)) { set({ notice: "Déjà fait" }); return false; }
    const { tax, total } = withTax(spec.price);
    if (s.cash < total) { set({ notice: "Fonds insuffisants" }); return false; }
    const next: HouseState = { ...cur, renos: [...cur.renos, id] };
    set({
      cash: Math.round((s.cash - total) * 100) / 100,
      houses: { ...s.houses, [deed.id]: next },
      notice: `Travaux · ${spec.label} · TPS+TVQ ${tax}\u00a0$`,
      ledger: pushLedger(s.ledger, `Reno · ${spec.label}`, -total),
    });
    persist();
    return true;
  },
  installHeat: (id) => {
    const s = get();
    const deed = deedById(s.deedId ?? "");
    if (!deed || !s.ownedProps.includes(deed.id)) return false;
    const spec = heatById(id);
    const cur = s.houses[deed.id] ?? emptyHouse(deed.id, deed.town);
    if (cur.heat === id) { set({ notice: "Déjà installé" }); return false; }
    let price = spec.price;
    if (id === "thermopompe") price = Math.max(0, price - LOGISVERT);
    const { tax, total } = withTax(price);
    if (price > 0 && s.cash < total) { set({ notice: "Fonds insuffisants" }); return false; }
    const next: HouseState = {
      ...cur,
      heat: id,
      heatOn: true,
      broke: false,
      wood: spec.needsWood ? Math.max(cur.wood, 2) : cur.wood,
    };
    set({
      cash: price > 0 ? Math.round((s.cash - total) * 100) / 100 : s.cash,
      houses: { ...s.houses, [deed.id]: next },
      notice: id === "thermopompe"
        ? `Thermopompe · LogisVert −${LOGISVERT}\u00a0$`
        : `Chauffage · ${spec.label}`,
      ledger: price > 0 ? pushLedger(s.ledger, `Chauffage · ${spec.label}`, -total) : s.ledger,
    });
    persist();
    return true;
  },
  setWater: (id) => {
    const s = get();
    const deed = deedById(s.deedId ?? "");
    if (!deed || !s.ownedProps.includes(deed.id)) return false;
    const cur = s.houses[deed.id] ?? emptyHouse(deed.id, deed.town);
    if (cur.water === id) return true;
    const fee = id === "puits" ? 120 : 40;
    const { total } = withTax(fee);
    if (s.cash < total) { set({ notice: "Fonds insuffisants" }); return false; }
    set({
      cash: Math.round((s.cash - total) * 100) / 100,
      houses: { ...s.houses, [deed.id]: { ...cur, water: id, waterOn: true, frozen: false } },
      notice: waterById(id).label,
      ledger: pushLedger(s.ledger, waterById(id).label, -total),
    });
    persist();
    return true;
  },
  toggleHeat: () => {
    const s = get();
    const id = s.deedId ?? s.ownedProps[0];
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    const spec = heatById(cur.heat);
    if (!cur.heatOn && spec.needsWood && cur.wood <= 0) {
      set({ notice: "Plus de bois" });
      return false;
    }
    if (!cur.heatOn && spec.needsHydro && (!cur.hydroOn || s.gridOutage)) {
      set({ notice: "Hydro coupé · pas d'électrique" });
      return false;
    }
    set({
      houses: { ...s.houses, [id]: { ...cur, heatOn: !cur.heatOn } },
      notice: !cur.heatOn ? `Chauffage · ${spec.label}` : "Chauffage coupé",
    });
    persist();
    return true;
  },
  toggleHydro: () => {
    const s = get();
    const id = s.deedId ?? s.ownedProps[0];
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    const on = !cur.hydroOn;
    set({
      houses: { ...s.houses, [id]: { ...cur, hydroOn: on, heatOn: on ? cur.heatOn : heatById(cur.heat).panneProof ? cur.heatOn : false } },
      notice: on ? "Panneau Hydro · sous tension" : "Disjoncteur · coupé",
    });
    persist();
    return true;
  },
  toggleWater: () => {
    const s = get();
    const id = s.deedId ?? s.ownedProps[0];
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    if (cur.frozen && cur.waterOn) { set({ notice: "Tuyaux gelés · dégeler d'abord" }); return false; }
    set({
      houses: { ...s.houses, [id]: { ...cur, waterOn: !cur.waterOn } },
      notice: !cur.waterOn ? "Eau ouverte" : "Entrée d'eau fermée",
    });
    persist();
    return true;
  },
  loadWood: (n = 1) => {
    const s = get();
    const id = s.deedId ?? s.ownedProps[0];
    if (!id || !s.ownedProps.includes(id)) {
      set({ notice: "Chargez le poêle chez vous" });
      return false;
    }
    const cur = s.houses[id] ?? emptyHouse(id);
    if (!heatById(cur.heat).needsWood) {
      set({ notice: "Pas de poêle ni foyer" });
      return false;
    }
    if ((s.inventory.corde_bois ?? 0) < n) {
      set({ notice: "Pas de corde de bois" });
      return false;
    }
    if (cur.wood >= WOOD_MAX) {
      set({ notice: "Bûcher plein" });
      return false;
    }
    const add = Math.min(n, WOOD_MAX - Math.floor(cur.wood));
    set({
      inventory: takeInv(s.inventory, "corde_bois", add),
      houses: { ...s.houses, [id]: { ...cur, wood: Math.min(WOOD_MAX, cur.wood + add) } },
      notice: `Bois · ${Math.min(WOOD_MAX, cur.wood + add).toFixed(0)} cordes`,
    });
    persist();
    return true;
  },
  repairFurnace: () => {
    const s = get();
    const id = s.deedId ?? s.ownedProps[0];
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    if (!cur.broke) { set({ notice: "Fournaise ok" }); return false; }
    const { total } = withTax(FURNACE_REPAIR);
    if (s.cash < total) { set({ notice: "Réparation · fonds insuffisants" }); return false; }
    set({
      cash: Math.round((s.cash - total) * 100) / 100,
      houses: { ...s.houses, [id]: { ...cur, broke: false, heatOn: true } },
      notice: "Fournaise réparée",
      ledger: pushLedger(s.ledger, "Fournaise", -total),
    });
    persist();
    return true;
  },
  thawPipes: () => {
    const s = get();
    const id = s.deedId ?? s.ownedProps[0];
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    if (!cur.frozen) { set({ notice: "Tuyaux ok" }); return false; }
    const { total } = withTax(PIPE_THAW);
    if (s.cash < total) { set({ notice: "Plombier · fonds insuffisants" }); return false; }
    set({
      cash: Math.round((s.cash - total) * 100) / 100,
      houses: { ...s.houses, [id]: { ...cur, frozen: false, waterOn: true } },
      notice: "Tuyaux dégelés",
      ledger: pushLedger(s.ledger, "Plombier", -total),
    });
    persist();
    return true;
  },
  tickUtilities: (dt, ctx) => {
    const s = get();
    if (s.ownedProps.length === 0 && !s.gridOutage) return;
    const snap: Record<string, HouseState> = {};
    for (const id of s.ownedProps) snap[id] = s.houses[id] ?? emptyHouse(id);
    const next = tickHouseUtils(snap, s.ownedProps, s.gridOutage, dt, {
      ambient: ctx.ambient,
      weather: ctx.weather,
      month: ctx.month,
      elapsed: ctx.elapsed,
    });
    const houses = { ...s.houses };
    for (const [id, u] of Object.entries(next.houses)) {
      const cur = houses[id] ?? emptyHouse(id);
      houses[id] = { ...cur, ...u };
    }
    let cash = s.cash;
    let bank = s.bank;
    let ledger = s.ledger;
    let notice: string | null = next.notice;
    if (next.debit > 0) {
      if (bank >= next.debit) bank = Math.round((bank - next.debit) * 100) / 100;
      else if (cash + bank >= next.debit) {
        const rest = next.debit - bank;
        bank = 0;
        cash = Math.round((cash - rest) * 100) / 100;
      } else {
        for (const id of s.ownedProps) {
          const cur = houses[id]!;
          houses[id] = { ...cur, hydroOn: false, heatOn: heatById(cur.heat).panneProof ? cur.heatOn : false };
        }
        notice = "Hydro-Québec · coupure pour non-paiement";
      }
      if (next.label) ledger = pushLedger(ledger, next.label, -next.debit);
      if (!notice) notice = next.label;
    }
    set({
      houses,
      gridOutage: next.grid,
      cash,
      bank,
      ledger,
      ...(notice ? { notice } : {}),
    });
    if (next.debit > 0 || next.notice || next.grid !== s.gridOutage) persist();
  },
  setBasement: (fit) => {
    const s = get();
    const id = s.deedId;
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    if (!hasReno(cur, "soussol")) { set({ notice: "Finissez le sous-sol d'abord" }); return false; }
    set({ houses: { ...s.houses, [id]: { ...cur, basement: fit } }, notice: `Sous-sol · ${fit}` });
    persist();
    return true;
  },
  toggleGarageFit: (fit) => {
    const s = get();
    const id = s.deedId;
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    if (!hasReno(cur, "garage")) { set({ notice: "Bâtissez le garage d'abord" }); return false; }
    const on = cur.garageFits.includes(fit);
    if (!on) {
      const spec = { etabli: 60, outils: 45, rangement: 40, compresseur: 90, deco: 35, mecanique: 120 }[fit];
      const { total } = withTax(spec);
      if (s.cash < total) { set({ notice: "Fonds insuffisants" }); return false; }
      set({
        cash: Math.round((s.cash - total) * 100) / 100,
        houses: { ...s.houses, [id]: { ...cur, garageFits: [...cur.garageFits, fit] } },
        notice: `Garage · ${fit}`,
        ledger: pushLedger(s.ledger, `Garage · ${fit}`, -total),
      });
    } else {
      set({
        houses: { ...s.houses, [id]: { ...cur, garageFits: cur.garageFits.filter((f) => f !== fit) } },
        notice: `Retiré · ${fit}`,
      });
    }
    persist();
    return true;
  },
  setGarageBays: (n) => {
    const s = get();
    const id = s.deedId;
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    if (!hasReno(cur, "garage")) { set({ notice: "Bâtissez le garage d'abord" }); return false; }
    if (n === cur.garageBays) return true;
    const price = n === 3 ? 320 : n === 2 ? 180 : 0;
    const curPrice = cur.garageBays === 3 ? 320 : cur.garageBays === 2 ? 180 : 0;
    const delta = price - curPrice;
    if (delta > 0) {
      const { total } = withTax(delta);
      if (s.cash < total) { set({ notice: "Fonds insuffisants" }); return false; }
      set({
        cash: Math.round((s.cash - total) * 100) / 100,
        houses: { ...s.houses, [id]: { ...cur, garageBays: n, parked: cur.parked.slice(0, n) } },
        notice: `Garage · ${n} places`,
        ledger: pushLedger(s.ledger, `Garage ${n} places`, -total),
      });
    } else {
      set({ houses: { ...s.houses, [id]: { ...cur, garageBays: n, parked: cur.parked.slice(0, n) } }, notice: `Garage · ${n} places` });
    }
    persist();
    return true;
  },
  cutHouseKey: (role) => {
    const s = get();
    const id = s.deedId;
    if (!id || !s.ownedProps.includes(id)) return false;
    if (role === "owner" || role === "guest") { set({ notice: "Invité n'a pas de clé permanente" }); return false; }
    const cur = s.houses[id] ?? emptyHouse(id);
    if (cur.keychain.includes(role)) { set({ notice: "Double déjà taillé" }); return false; }
    const { total } = withTax(25);
    if (s.cash < total) { set({ notice: "Fonds insuffisants" }); return false; }
    const inv = { ...s.inventory, double_cle: (s.inventory.double_cle ?? 0) + 1 };
    set({
      cash: Math.round((s.cash - total) * 100) / 100,
      inventory: inv,
      houses: { ...s.houses, [id]: { ...cur, keychain: [...cur.keychain, role] } },
      notice: `Double · ${role}`,
      ledger: pushLedger(s.ledger, "Double de clés", -total),
    });
    persist();
    return true;
  },
  toggleDoorLock: (slot) => {
    const s = get();
    const id = s.deedId;
    if (!id || !s.ownedProps.includes(id)) return false;
    const cur = s.houses[id] ?? emptyHouse(id);
    const next = { ...cur.doors, [slot]: !cur.doors[slot] };
    set({
      houses: { ...s.houses, [id]: { ...cur, doors: next } },
      notice: next[slot] ? `Verrouillée · ${slot}` : `Ouverte · ${slot}`,
    });
    persist();
    return true;
  },
  parkInGarage: (vehicleId) => {
    const s = get();
    const id = s.ownedProps[0];
    const deedId = s.deedId ?? id;
    if (!deedId || !s.ownedProps.includes(deedId)) return false;
    const cur = s.houses[deedId] ?? emptyHouse(deedId);
    if (!hasReno(cur, "garage")) return false;
    if (cur.parked.length >= cur.garageBays) { set({ notice: "Garage plein" }); return false; }
    if (cur.parked.includes(vehicleId)) return true;
    set({
      houses: { ...s.houses, [deedId]: { ...cur, parked: [...cur.parked, vehicleId] } },
      notice: "Véhicule rangé",
    });
    persist();
    return true;
  },
  takeFromGarage: (vehicleId) => {
    const s = get();
    const deedId = s.deedId ?? s.ownedProps[0];
    if (!deedId) return false;
    const cur = s.houses[deedId] ?? emptyHouse(deedId);
    set({
      houses: { ...s.houses, [deedId]: { ...cur, parked: cur.parked.filter((p) => p !== vehicleId) } },
      notice: "Véhicule sorti",
    });
    persist();
    return true;
  },
  setRpJob: (id) => { set({ rpJob: jobById(id).id, notice: `Emploi · ${jobById(id).name}` }); persist(); },
  joinGang: (id) => {
    const g = gangById(id);
    if (!g) return false;
    set({ gangId: g.id, notice: `Rejoint · ${g.name}` });
    persist();
    return true;
  },
  leaveGang: () => { set({ gangId: null, notice: "Plus de gang" }); persist(); },
  commitCrime: (crime, elapsed) => {
    const s = get();
    if (s.rpJob === "policier") { set({ notice: "Vous êtes de la SQ." }); return false; }
    const spec = crimeById(crime as "theft");
    const kind = spec.id === "bank_robbery" ? "robbery" : spec.id;
    const caught = Math.random() * 6 < spec.stars;
    if (caught) {
      police.report(kind, elapsed);
      set({ notice: `Repéré · ${spec.name}` });
      return false;
    }
    let reward = spec.reward;
    if (s.gangId) reward = Math.round(reward * 1.2);
    set({
      cash: Math.round((s.cash + reward) * 100) / 100,
      notice: `${spec.name} · +${reward}\u00a0$`,
      ledger: pushLedger(s.ledger, spec.name, reward),
    });
    if (Math.random() < 0.35) police.report("theft", elapsed);
    persist();
    return true;
  },
  tickPayroll: () => {
    const s = get();
    const net = payrollNet(s.rpJob);
    if (net <= 0) return;
    set({
      bank: Math.round((s.bank + net) * 100) / 100,
      notice: `Paie · ${jobById(s.rpJob).name} · +${net}\u00a0$`,
      ledger: pushLedger(s.ledger, `Paie ${jobById(s.rpJob).name}`, net),
    });
    persist();
  },
  openElevator: () => set({ elevatorOpen: true, paused: true }),
  closeElevator: () => set({ elevatorOpen: false, paused: false }),
  sit: () => set({ sitting: true, notice: "Assis" }),
  stand: () => set({ sitting: false, notice: "Debout" }),
  toggleLobbyLights: () => {
    const on = !get().lobbyLights;
    set({ lobbyLights: on, notice: on ? "Lustres allumés" : "Lustres éteints" });
  },
  ringBell: () => set({ notice: "Ding — réception prévenue" }),
  toggleBuild: () => {
    const on = !get().buildOpen;
    set({ buildOpen: on, paused: false, notice: on ? "Builder · E pour placer" : "Builder fermé" });
  },
  selectProp: (id) => set({ buildType: id }),
  rotateGhost: () => set({ buildYaw: (get().buildYaw + Math.PI / 4) % (Math.PI * 2) }),
  scaleGhost: (dir) => set({ buildScale: Math.max(0.25, Math.min(6, get().buildScale + dir * 0.25)) }),
  addPlaced: (p) => {
    const placed = [...get().placed, p].slice(-80);
    set({ placed, notice: `Placé · ${p.type}` });
    persist();
  },
  removePlaced: (id) => {
    set({ placed: get().placed.filter((p) => p.id !== id), notice: "Objet retiré" });
    persist();
  },
  clearPlaced: () => {
    set({ placed: [], notice: "Terrain vidé" });
    persist();
  },
}));

export function persist() {
  if (typeof localStorage === "undefined") return;
  const s = useGameStore.getState();
  try {
    localStorage.setItem(
      SAVE,
      JSON.stringify({
        visited: s.visited,
        km: Math.round(s.km * 10) / 10,
        fines: s.fines,
        x: Math.round(s.x * 10) / 10,
        z: Math.round(s.z * 10) / 10,
        yaw: s.yaw,
        night: s.night,
        weather: s.weather,
        leaves: s.leaves,
        cash: s.cash,
        inventory: s.inventory,
        licenses: s.licenses,
        notes: s.notes,
        ledger: s.ledger.slice(0, 16),
        unlockedDoors: hotelSecurity.snapshot().unlockedDoors,
        hotelTvOn: s.hotelTvOn,
        radioOn: s.radioOn,
        radioId: s.radioId,
        tickets: s.tickets.slice(0, 8),
        appearance: s.appearance,
        vehicleId: s.vehicleId,
        ownedVehicles: s.ownedVehicles,
        equippedTool: s.equippedTool,
        equippedPack: s.equippedPack,
        firm: s.firm,
        cart: s.cart,
        surv: s.surv,
        bank: s.bank,
        rpJob: s.rpJob,
        gangId: s.gangId,
        ownedProps: s.ownedProps,
        placed: s.placed,
        selectedSeed: s.selectedSeed,
        houses: s.houses,
        gridOutage: s.gridOutage,
      }),
    );
  } catch {
    /* ignore */
  }
}
