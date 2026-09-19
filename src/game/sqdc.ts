/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SQDC ULTIMATE — Société Québécoise du Cannabis (v3.0)
 * SYSTÈME MULTIJOUEUR COMPLET + BÂTIMENT ÉVOLUÉ + GESTION DE CRISE
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib, QC_PALETTE } from "./materials";
import { commerceMat } from "./commerceMats";
import { finishMap } from "./city/buildings/architecture/materiaux/textures";
import type { ShopItemId, ShopSpot } from "./commerce";
import { itemById } from "./commerce";
import type { BoutiqueGarment } from "./boutique";
import type { DepAisleHot } from "./depanneur";
import { shopDoorOffset } from "./depanneur";

// Réseau & multijoueur
import { netEmit, netOn } from "./net";
import { registerRemote } from "./remotes";

// Systèmes joueur
import { getPlayerData } from "./character";
import { addCash, removeCash, transferMoney } from "./banking";
import { addToInventory, removeFromInventory, getInventoryItem } from "./backpack";
import { sendChatMessage, sendPrivateMessage } from "./chat";
import { useGameStore } from "./store";

// Intégration Police (SQ)
import { addWantedPoints, dispatchPolice } from "./police";

// ═══════════════════════════════════════════════════════════
// TYPES — RÔLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════

export type SqdcRole =
  | "directeur"
  | "gerant"
  | "caissier"
  | "conseiller"
  | "securite"
  | "commis"
  | "livreur"
  | "client"
  | "trespasser";

export interface SqdcPermissions {
  canSell: boolean;
  canRefund: boolean;
  canManageStock: boolean;
  canHire: boolean;
  canFire: boolean;
  canSetPrices: boolean;
  canAccessSafe: boolean;
  canViewCameras: boolean;
  canBanCustomers: boolean;
  canDeliver: boolean;
  canOpenStore: boolean;
  canCloseStore: boolean;
  canOrderStock: boolean;
}

export const ROLE_PERMISSIONS: Record<SqdcRole, SqdcPermissions> = {
  directeur: {
    canSell: true, canRefund: true, canManageStock: true,
    canHire: true, canFire: true, canSetPrices: true,
    canAccessSafe: true, canViewCameras: true, canBanCustomers: true,
    canDeliver: true, canOpenStore: true, canCloseStore: true,
    canOrderStock: true,
  },
  gerant: {
    canSell: true, canRefund: true, canManageStock: true,
    canHire: true, canFire: false, canSetPrices: false,
    canAccessSafe: true, canViewCameras: true, canBanCustomers: true,
    canDeliver: false, canOpenStore: true, canCloseStore: true,
    canOrderStock: true,
  },
  caissier: {
    canSell: true, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  conseiller: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  securite: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: true, canBanCustomers: true,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  commis: {
    canSell: false, canRefund: false, canManageStock: true,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: true,
  },
  livreur: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: true, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  client: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
  trespasser: {
    canSell: false, canRefund: false, canManageStock: false,
    canHire: false, canFire: false, canSetPrices: false,
    canAccessSafe: false, canViewCameras: false, canBanCustomers: false,
    canDeliver: false, canOpenStore: false, canCloseStore: false,
    canOrderStock: false,
  },
};

export interface SqdcEmployee {
  playerId: string;
  playerName: string;
  role: SqdcRole;
  hourlyRate: number;
  hoursWorked: number;
  totalEarned: number;
  isClockedIn: boolean;
  clockInTime: number | null;
  hireDate: number;
  performanceRating: number;
  salesCount: number;
  storeId: string;
}

export interface SqdcSchedule {
  playerId: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  role: SqdcRole;
}

export interface SqdcStock {
  itemId: ShopItemId;
  quantity: number;
  maxCapacity: number;
  reorderThreshold: number;
  wholesalePrice: number;
  retailPrice: number;
  aisle: SqdcAisleId;
  lastRestock: number;
  displayShelf: string;
}

export interface StockOrder {
  id: string;
  storeId: string;
  items: Array<{ itemId: ShopItemId; qty: number; unitPrice: number }>;
  totalCost: number;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  orderedBy: string;
  orderedAt: number;
  eta: number;
}

export interface CashRegister {
  id: string;
  storeId: string;
  cashInside: number;
  isOpen: boolean;
  operatedBy: string | null;
  todayRevenue: number;
  todayTransactions: number;
  position: { x: number; y: number; z: number };
}

export interface SqdcTransaction {
  id: string;
  storeId: string;
  registerId: string;
  cashierId: string;
  cashierName: string;
  customerId: string;
  customerName: string;
  items: Array<{ itemId: ShopItemId; qty: number; unitPrice: number }>;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  paymentMethod: "cash" | "debit" | "credit";
  timestamp: number;
  idVerified: boolean;
  customerAge: number;
  cancelled: boolean;
  refunded: boolean;
}

export interface SqdcStore {
  id: string;
  name: string;
  address: string;
  city: string;
  position: { x: number; z: number };
  ownerId: string;
  isOpen: boolean;
  openedBy: string | null;
  openedAt: number | null;
  employees: SqdcEmployee[];
  schedules: SqdcSchedule[];
  stock: SqdcStock[];
  registers: CashRegister[];
  safe: { cash: number; combination: string };
  cameras: CameraFeed[];
  todayRevenue: number;
  todayCustomers: number;
  weeklyRevenue: number;
  bannedCustomers: string[];
  license: SqdcLicense;
  bills: OperatingBill[];
  deliveries: Delivery[];
  incidents: Incident[];
}

export interface SqdcLicense {
  number: string;
  issuedTo: string;
  expiryDate: number;
  isValid: boolean;
  suspensions: number;
  violationsCount: number;
}

export interface OperatingBill {
  id: string;
  type: "rent" | "electricity" | "insurance" | "supplier" | "tax";
  amount: number;
  dueDate: number;
  paid: boolean;
  paidBy: string | null;
}

export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  address: { x: number; z: number };
  items: Array<{ itemId: ShopItemId; qty: number }>;
  total: number;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "failed";
  driverId: string | null;
  orderedAt: number;
  deliveredAt: number | null;
  tipAmount: number;
}

export interface Incident {
  id: string;
  type: "theft" | "underage" | "harassment" | "vandalism" | "robbery" | "fake_id";
  timestamp: number;
  suspectId: string;
  suspectName: string;
  reportedBy: string;
  description: string;
  resolved: boolean;
  policeAlerted: boolean;
}

export interface CameraFeed {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  isRecording: boolean;
  viewingPlayers: string[];
}

export type SqdcAisleId =
  | "accueil"
  | "fleur"
  | "huile"
  | "vape"
  | "preroll"
  | "edibles"
  | "accessoires"
  | "caisse"
  | "conseil"
  | "reserve";

export interface SqdcAisleDef {
  id: SqdcAisleId;
  label: string;
  hint: string;
  items: ShopItemId[];
  requiresRole?: SqdcRole[];
}

export const SQDC_AISLES: SqdcAisleDef[] = [
  { id: "accueil", label: "Accueil", hint: "21 ans · pièce d'identité.", items: [] },
  {
    id: "fleur",
    label: "Fleur séchée",
    hint: "Indica, sativa, hybride.",
    items: ["weed", "fleur_indica", "fleur_sativa", "fleur_indica_premium", "fleur_sativa_premium", "fleur_hybride", "fleur_indica_budget", "fleur_sativa_budget"],
  },
  {
    id: "huile",
    label: "Huiles & Concentrés",
    hint: "Flacons 30 ml, shatter, résine.",
    items: ["huile", "huile_cbd_30ml", "huile_thc_30ml", "hash_bubble", "shatter", "live_resin"],
  },
  {
    id: "vape",
    label: "Vapes",
    hint: "Cartouches, batteries, jetables.",
    items: ["vape", "vape_cart_indica", "vape_cart_sativa", "vape_battery", "vape_disposable"],
  },
  {
    id: "preroll",
    label: "Préroulés",
    hint: "Joints, gélules, hash.",
    items: ["preroll", "gelules", "hash", "preroll_indica_0.5g", "preroll_sativa_0.5g", "preroll_hybride_1g", "preroll_pack_3", "preroll_pack_5"],
  },
  {
    id: "edibles",
    label: "Comestibles",
    hint: "Bonbons, chocolat, boissons.",
    items: ["gummies_10mg", "chocolate_5mg", "beverage_thc"],
  },
  {
    id: "accessoires",
    label: "Accessoires",
    hint: "Papiers, grinders, pipes.",
    items: ["rolling_papers", "grinder", "pipe_glass", "lighter"],
  },
  { id: "caisse", label: "Caisse", hint: "TPS + TVQ. 21 ans.", items: [] },
  { id: "conseil", label: "Conseiller", hint: "Dosage, produits.", items: [] },
  {
    id: "reserve",
    label: "Réserve",
    hint: "Employés seulement.",
    items: [],
    requiresRole: ["directeur", "gerant", "commis"],
  },
];

export const SQDC_OPEN_FROM = 10;
export const SQDC_OPEN_TO = 21;
export const MIN_HOURLY_WAGE_QC = 15.75;

export function isSqdcOpen(hours: number): boolean {
  if (!Number.isFinite(hours)) return false;
  const normalized = ((hours % 24) + 24) % 24;
  return normalized >= SQDC_OPEN_FROM && normalized < SQDC_OPEN_TO;
}

export function sqdcHoursLabel(): string {
  return "10 h – 21 h";
}

const STORES: Map<string, SqdcStore> = new Map();
const PLAYER_ROLES: Map<string, { storeId: string; role: SqdcRole }> = new Map();
const ACTIVE_CARTS: Map<string, Cart> = new Map();

export interface Cart {
  customerId: string;
  storeId: string;
  items: Array<{ itemId: ShopItemId; qty: number }>;
  createdAt: number;
}

export function registerStore(store: SqdcStore): void {
  STORES.set(store.id, store);
  netEmit("sqdc:store_registered", { store });
}

export function getStore(storeId: string): SqdcStore | null {
  return STORES.get(storeId) ?? null;
}

export function getAllStores(): SqdcStore[] {
  return Array.from(STORES.values());
}

export function getPlayerRole(playerId: string): { storeId: string; role: SqdcRole } | null {
  return PLAYER_ROLES.get(playerId) ?? null;
}

export function getPlayerPermissions(playerId: string): SqdcPermissions {
  const role = getPlayerRole(playerId);
  if (!role) return ROLE_PERMISSIONS.client;
  return ROLE_PERMISSIONS[role.role];
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME UNIQUE DE PORTES SQDC — SAS DOUBLE PORTE & LOCKDOWN
// ═══════════════════════════════════════════════════════════

export interface DoorSystem {
  storeId: string;
  outerDoors: { left: THREE.Mesh | null; right: THREE.Mesh | null };
  innerDoors: { left: THREE.Mesh | null; right: THREE.Mesh | null };
  securityGate: THREE.Mesh | null;
  motionSensors: THREE.Mesh[];
  theftDetectors: THREE.Mesh[];
  state: "closed" | "outer_opening" | "outer_open" | "inner_opening" | "inner_open" | "closing" | "alarm" | "lockdown";
  progress: number;
  outerProgress: number;
  innerProgress: number;
  playerInSas: boolean;
  playerInside: boolean;
  alarmTriggered: boolean;
  lastScanTime: number;
  outerZ: number;
  innerZ: number;
  sasHalfWidth: number;
  collisionOuterL: { minX: number; maxX: number; minZ: number; maxZ: number };
  collisionOuterR: { minX: number; maxX: number; minZ: number; maxZ: number };
  collisionInnerL: { minX: number; maxX: number; minZ: number; maxZ: number };
  collisionInnerR: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const DOOR_SYSTEMS = new Map<string, DoorSystem>();

function setDoorCollision(
  wall: { minX: number; maxX: number; minZ: number; maxZ: number },
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
) {
  wall.minX = centerX - width / 2;
  wall.maxX = centerX + width / 2;
  wall.minZ = centerZ - depth / 2;
  wall.maxZ = centerZ + depth / 2;
}

function buildAdvancedDoorSystem(
  storeId: string,
  x: number,
  y: number,
  outerZ: number,
  globalWalls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>,
): THREE.Group {
  const doors = new THREE.Group();
  doors.name = "sqdc_door_system";

  const innerZ = outerZ - 2.05;
  const sasDepth = outerZ - innerZ;
  const sasHalfWidth = 2.15;
  const doorWidth = 1.95;
  const doorDepth = 0.10;
  const panelBaseX = 0.98;
  const wallThickness = 0.18;

  const collisionOuterL = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  const collisionOuterR = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  const collisionInnerL = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  const collisionInnerR = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

  setDoorCollision(collisionOuterL, x - panelBaseX, outerZ, doorWidth, doorDepth);
  setDoorCollision(collisionOuterR, x + panelBaseX, outerZ, doorWidth, doorDepth);
  setDoorCollision(collisionInnerL, x - panelBaseX, innerZ, doorWidth, doorDepth);
  setDoorCollision(collisionInnerR, x + panelBaseX, innerZ, doorWidth, doorDepth);

  globalWalls.push(collisionOuterL, collisionOuterR, collisionInnerL, collisionInnerR);

  const sasWallMat = matLib.get(0xe8e4dc, 0.92);
  doors.add(box(wallThickness, 3.05, sasDepth, x - sasHalfWidth, y + 1.525, innerZ + sasDepth / 2, sasWallMat));
  doors.add(box(wallThickness, 3.05, sasDepth, x + sasHalfWidth, y + 1.525, innerZ + sasDepth / 2, sasWallMat));

  globalWalls.push(
    { minX: x - sasHalfWidth - wallThickness / 2 - 0.03, maxX: x - sasHalfWidth + wallThickness / 2 + 0.03, minZ: innerZ, maxZ: outerZ },
    { minX: x + sasHalfWidth - wallThickness / 2 - 0.03, maxX: x + sasHalfWidth + wallThickness / 2 + 0.03, minZ: innerZ, maxZ: outerZ },
  );

  const sasFloor = new THREE.Mesh(new THREE.PlaneGeometry(sasHalfWidth * 2, sasDepth), commerceMat("beton"));
  sasFloor.rotation.x = -Math.PI / 2;
  sasFloor.position.set(x, y + 0.01, innerZ + sasDepth / 2);
  sasFloor.receiveShadow = true;
  doors.add(sasFloor);

  const frameMat = matLib.get(0x202522, 0.95);
  const glassMat = matLib.physicalGlass(0x9cc7d6, 0.90, 0.08);

  function addDoorSet(prefix: "outer" | "inner", z: number) {
    const frame = new THREE.Group();
    frame.name = `${prefix}_frame`;
    frame.add(box(0.16, 3.1, 0.22, x - sasHalfWidth, y + 1.55, z, frameMat));
    frame.add(box(0.16, 3.1, 0.22, x + sasHalfWidth, y + 1.55, z, frameMat));
    frame.add(box(sasHalfWidth * 2, 0.16, 0.22, x, y + 3.02, z, frameMat));
    doors.add(frame);

    const left = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 2.82, doorDepth), glassMat);
    left.name = `${prefix}_door_left`;
    left.position.set(x - panelBaseX, y + 1.42, z);
    left.castShadow = true;
    left.receiveShadow = true;

    const right = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 2.82, doorDepth), glassMat);
    right.name = `${prefix}_door_right`;
    right.position.set(x + panelBaseX, y + 1.42, z);
    right.castShadow = true;
    right.receiveShadow = true;

    doors.add(left, right);
    return { left, right };
  }

  const outer = addDoorSet("outer", outerZ);
  const inner = addDoorSet("inner", innerZ);

  const transomMat = matLib.getEmissive(QC_PALETTE.sqdcVert, 0x183c28, 0.65);
  const transom = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.32, 0.12), transomMat);
  transom.position.set(x, y + 2.65, outerZ + 0.07);
  doors.add(transom);

  const detectorMat = matLib.get(0x171918, 0.95);
  const detectorLeft = box(0.12, 2.15, 0.20, x - 1.58, y + 1.08, outerZ - 0.52, detectorMat);
  const detectorRight = box(0.12, 2.15, 0.20, x + 1.58, y + 1.08, outerZ - 0.52, detectorMat);
  detectorLeft.name = "sqdc_antitheft_left";
  detectorRight.name = "sqdc_antitheft_right";
  doors.add(detectorLeft, detectorRight);

  const sensorMat = matLib.getEmissive(0x5ee27e, 0x255f3a, 0.28);
  const sensor = box(0.36, 0.12, 0.08, x, y + 2.75, innerZ + 0.12, sensorMat);
  sensor.name = "sqdc_motion_sensor";
  doors.add(sensor);

  const securityGate = new THREE.Mesh(
    new THREE.BoxGeometry(3.65, 2.78, 0.07),
    matLib.get(0x454a47, 0.98),
  );
  securityGate.name = "security_gate";
  securityGate.position.set(x, y + 1.40, innerZ - 0.02);
  securityGate.visible = false;
  doors.add(securityGate);

  const system: DoorSystem = {
    storeId,
    outerDoors: { left: outer.left, right: outer.right },
    innerDoors: { left: inner.left, right: inner.right },
    securityGate,
    motionSensors: [sensor],
    theftDetectors: [detectorLeft, detectorRight],
    state: "closed",
    progress: 0,
    outerProgress: 0,
    innerProgress: 0,
    playerInSas: false,
    playerInside: false,
    alarmTriggered: false,
    lastScanTime: 0,
    outerZ,
    innerZ,
    sasHalfWidth,
    collisionOuterL,
    collisionOuterR,
    collisionInnerL,
    collisionInnerR,
  };

  DOOR_SYSTEMS.set(storeId, system);
  return doors;
}

export function updateDoorSystem(storeId: string, playerPos: THREE.Vector3, dt: number): void {
  const system = DOOR_SYSTEMS.get(storeId);
  if (!system) return;

  const store = getStore(storeId);
  if (!store) return;

  const safeDt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.08) : 0;
  const openSpeed = 3.8 * safeDt;
  const closeSpeed = 4.2 * safeDt;
  const px = playerPos.x;
  const pz = playerPos.z;
  const outerDist = Math.hypot(px - store.position.x, pz - system.outerZ);
  const innerDist = Math.hypot(px - store.position.x, pz - system.innerZ);
  const inDoorWidth = Math.abs(px - store.position.x) < system.sasHalfWidth - 0.18;
  const inSas = inDoorWidth && pz <= system.outerZ + 0.35 && pz >= system.innerZ - 0.35;
  const crossedInside = inDoorWidth && pz < system.innerZ - 0.55;
  const nearOuter = outerDist < 3.2;
  const nearInner = innerDist < 2.65;

  system.playerInSas = inSas;
  if (crossedInside) system.playerInside = true;
  if (system.playerInside && pz > system.outerZ + 0.85 && outerDist > 1.75) {
    system.playerInside = false;
  }

  if (system.state === "lockdown") {
    // Fermeture forcée et rapide
    system.innerProgress = Math.max(0, system.innerProgress - closeSpeed * 2);
    system.outerProgress = Math.max(0, system.outerProgress - closeSpeed * 2);
    system.progress = Math.max(system.innerProgress, system.outerProgress);
    if (system.securityGate) system.securityGate.visible = true;
  } else if (system.state !== "alarm") {
    switch (system.state) {
      case "closed":
        if (!store.isOpen) break;
        if (system.playerInside && nearInner) {
          system.state = "inner_opening";
          system.progress = system.innerProgress;
        } else if (!system.playerInside && nearOuter) {
          system.state = "outer_opening";
          system.progress = system.outerProgress;
        }
        break;

      case "outer_opening":
        system.outerProgress = Math.min(1, system.outerProgress + openSpeed);
        system.progress = system.outerProgress;
        if (system.outerProgress >= 1) system.state = "outer_open";
        break;

      case "outer_open":
        if (inSas || nearInner) {
          system.state = "inner_opening";
          system.progress = system.innerProgress;
        } else if (!nearOuter && outerDist > 4.0) {
          system.state = "closing";
        }
        break;

      case "inner_opening":
        system.innerProgress = Math.min(1, system.innerProgress + openSpeed);
        system.progress = system.innerProgress;
        if (system.innerProgress >= 1) system.state = "inner_open";
        break;

      case "inner_open":
        if (crossedInside) system.playerInside = true;
        if (system.playerInside && innerDist > 3.4) {
          system.state = "closing";
        } else if (!system.playerInside && outerDist > 4.0 && !inSas) {
          system.state = "closing";
        }
        break;

      case "closing":
        if (system.playerInside && nearInner) {
          system.state = "inner_opening";
          break;
        }
        if (!system.playerInside && nearOuter) {
          system.state = "outer_opening";
          break;
        }

        system.innerProgress = Math.max(0, system.innerProgress - closeSpeed);
        system.outerProgress = Math.max(0, system.outerProgress - closeSpeed);
        system.progress = Math.max(system.innerProgress, system.outerProgress);
        if (system.innerProgress <= 0 && system.outerProgress <= 0) {
          system.state = "closed";
          if (outerDist > 4.2) system.playerInside = false;
        }
        break;
    }
  }

  // Animation des portes physiques + collision dynamique
  const openDistance = 1.4;
  const outerShift = system.outerProgress * openDistance;
  if (system.outerDoors.left && system.outerDoors.right) {
    system.outerDoors.left.position.x = store.position.x - 0.98 - outerShift;
    system.outerDoors.right.position.x = store.position.x + 0.98 + outerShift;
    setDoorCollision(system.collisionOuterL, system.outerDoors.left.position.x, system.outerZ, 1.95, 0.10);
    setDoorCollision(system.collisionOuterR, system.outerDoors.right.position.x, system.outerZ, 1.95, 0.10);
  }

  const innerShift = system.innerProgress * openDistance;
  if (system.innerDoors.left && system.innerDoors.right) {
    system.innerDoors.left.position.x = store.position.x - 0.98 - innerShift;
    system.innerDoors.right.position.x = store.position.x + 0.98 + innerShift;
    setDoorCollision(system.collisionInnerL, system.innerDoors.left.position.x, system.innerZ, 1.95, 0.10);
    setDoorCollision(system.collisionInnerR, system.innerDoors.right.position.x, system.innerZ, 1.95, 0.10);
  }

  if (system.securityGate && system.state !== "lockdown") {
    system.securityGate.visible = system.alarmTriggered;
  }
}

export function triggerAlarm(storeId: string): void {
  const system = DOOR_SYSTEMS.get(storeId);
  if (!system) return;

  system.state = "alarm";
  system.alarmTriggered = true;
  system.outerProgress = 0;
  system.innerProgress = 0;
  system.progress = 0;

  const store = getStore(storeId);
  if (store) {
    // Alerte automatique via le système de dispatch de la police
    dispatchPolice({
      location: store.position,
      priority: "high",
      type: "Alarme anti-vol SQDC",
      description: "Détection de vol à l'étalage. Portiques activés.",
    });
    sendChatMessage(`🚨 ALARME SQDC ${store.name} — Tentative de vol détectée!`);
  }

  setTimeout(() => {
    if (system.securityGate) system.securityGate.visible = false;
    system.state = "closed";
    system.alarmTriggered = false;
    system.outerProgress = 0;
    system.innerProgress = 0;
    system.progress = 0;
    system.playerInSas = false;
    system.playerInside = false;
  }, 20000);
}

// ═══════════════════════════════════════════════════════════
// PROGRAMME FIDÉLITÉ
// ═══════════════════════════════════════════════════════════

export interface LoyaltyCard {
  playerId: string;
  storeId: string;
  points: number;
  totalSpent: number;
  visitsCount: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  joinDate: number;
}

const LOYALTY_CARDS = new Map<string, LoyaltyCard>();

export function getLoyaltyCard(playerId: string, storeId: string): LoyaltyCard | null {
  const key = `${playerId}_${storeId}`;
  return LOYALTY_CARDS.get(key) ?? null;
}

export function addLoyaltyPoints(playerId: string, storeId: string, amountSpent: number): void {
  const key = `${playerId}_${storeId}`;
  let card = LOYALTY_CARDS.get(key);

  if (!card) {
    card = {
      playerId,
      storeId,
      points: 0,
      totalSpent: 0,
      visitsCount: 0,
      tier: "bronze",
      joinDate: Date.now(),
    };
    LOYALTY_CARDS.set(key, card);
  }

  card.totalSpent += amountSpent;
  card.points += Math.floor(amountSpent);
  card.visitsCount++;

  if (card.totalSpent >= 5000) card.tier = "platinum";
  else if (card.totalSpent >= 2000) card.tier = "gold";
  else if (card.totalSpent >= 1000) card.tier = "silver";

  if (card.points >= 500 && card.points % 500 === 0) {
    const reward = (card.points / 500) * 5;
    addCash(reward, playerId);
    sendPrivateMessage(
      playerId,
      `🎁 Programme de fidélité SQDC : +${reward}$ ajoutés à votre portefeuille!`,
    );
  }
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE BRAQUAGE ET CONFINEMENT (LOCKDOWN)
// ═══════════════════════════════════════════════════════════

export interface RobberyState {
  storeId: string;
  inProgress: boolean;
  robbers: string[];
  startTime: number;
  demandsMoney: boolean;
  hostages: string[];
  policeAlerted: boolean;
  lootCollected: number;
}

const ACTIVE_ROBBERIES = new Map<string, RobberyState>();

export function startRobbery(storeId: string, robberId: string): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  if (!store.isOpen) {
    return { success: false, message: "Le magasin est fermé." };
  }

  if (ACTIVE_ROBBERIES.has(storeId)) {
    return { success: false, message: "Braquage déjà en cours." };
  }

  // Activer le Lockdown de la SQDC (Piéger le voleur)
  const doorSys = DOOR_SYSTEMS.get(storeId);
  if (doorSys) {
    doorSys.state = "lockdown";
  }

  const robbery: RobberyState = {
    storeId,
    inProgress: true,
    robbers: [robberId],
    startTime: Date.now(),
    demandsMoney: true,
    hostages: [],
    policeAlerted: true, // Alerte immédiate
    lootCollected: 0,
  };

  ACTIVE_ROBBERIES.set(storeId, robbery);

  // Alerte la SQ via le Dispatch
  dispatchPolice({
    location: store.position,
    priority: "critical",
    type: "10-33 Braquage à main armée",
    description: `Code 99 — Vol qualifié en cours à la SQDC ${store.name}. Les portes blindées sont verrouillées en mode Lockdown.`,
  });

  addWantedPoints(robberId, 150, "Vol qualifié (Braquage SQDC)");
  sendChatMessage(`🚨 BRAQUAGE EN COURS — Un vol armé s'est déclenché à la SQDC ${store.name}. Mode confinement activé.`);

  for (const emp of store.employees) {
    if (emp.isClockedIn) {
      sendPrivateMessage(emp.playerId, `⚠️ BRAQUAGE! Confinement d'urgence. Mettez-vous à l'abri.`);
    }
  }

  netEmit("sqdc:robbery_started", { storeId, robberId });
  return { success: true, message: "Confinement activé. Dépêchez-vous de prendre l'argent avant l'arrivée du GTI !" };
}

export function demandMoney(storeId: string, robberId: string, amount: number): { success: boolean; message: string } {
  const robbery = ACTIVE_ROBBERIES.get(storeId);
  if (!robbery || !robbery.robbers.includes(robberId)) {
    return { success: false, message: "Aucun braquage correspondant." };
  }

  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const maxAvailable = store.safe.cash + store.registers.reduce((s, r) => s + r.cashInside, 0);
  const stolen = Math.min(amount, maxAvailable);

  store.registers.forEach((r) => {
    const take = Math.min(stolen, r.cashInside);
    r.cashInside -= take;
  });

  const remaining = stolen - store.registers.reduce((s, r) => s + r.cashInside, 0);
  if (remaining > 0) {
    store.safe.cash -= remaining;
  }

  addCash(stolen, robberId);
  robbery.lootCollected += stolen;

  netEmit("sqdc:money_stolen", { storeId, amount: stolen, robberId });
  return { success: true, message: `Vous avez pillé ${stolen}$ des caisses !` };
}

export function endRobbery(storeId: string, success: boolean): void {
  const robbery = ACTIVE_ROBBERIES.get(storeId);
  if (!robbery) return;

  if (success) {
    sendChatMessage(`💰 Braquage terminé à la SQDC — Les criminels se sont échappés avec ${robbery.lootCollected}$ !`);
  } else {
    sendChatMessage(`👮 Braquage déjoué à la SQDC — Les suspects ont été arrêtés par la SQ.`);
  }

  // Lever le confinement
  const doorSys = DOOR_SYSTEMS.get(storeId);
  if (doorSys) {
    doorSys.state = "closed";
    if (doorSys.securityGate) doorSys.securityGate.visible = false;
  }

  ACTIVE_ROBBERIES.delete(storeId);
  netEmit("sqdc:robbery_ended", { storeId, success });
}

// ═══════════════════════════════════════════════════════════
// INSPECTIONS GOUVERNEMENTALES
// ═══════════════════════════════════════════════════════════

export interface Inspection {
  id: string;
  storeId: string;
  inspectorId: string;
  inspectorName: string;
  startTime: number;
  endTime: number | null;
  violations: string[];
  passed: boolean | null;
  fine: number;
  licenseSuspended: boolean;
}

export function startInspection(
  storeId: string,
  inspectorId: string,
  inspectorName: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const inspection: Inspection = {
    id: `insp_${Date.now()}`,
    storeId,
    inspectorId,
    inspectorName,
    startTime: Date.now(),
    endTime: null,
    violations: [],
    passed: null,
    fine: 0,
    licenseSuspended: false,
  };

  if (!store.license.isValid) {
    inspection.violations.push("Licence expirée ou suspendue");
  }

  const lowStockItems = store.stock.filter((s) => s.quantity < s.reorderThreshold);
  if (lowStockItems.length > 3) {
    inspection.violations.push("Gestion de stock inadéquate");
  }

  sendPrivateMessage(store.ownerId, `🔍 INSPECTION DE LA SQDC par l'inspecteur d'État ${inspectorName}`);
  netEmit("sqdc:inspection_started", { storeId, inspection });

  return { success: true, message: "Inspection gouvernementale lancée." };
}

export function completeInspection(
  storeId: string,
  inspectorId: string,
  passed: boolean,
  additionalViolations: string[] = [],
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const violations = additionalViolations;
  let fine = 0;
  let licenseSuspended = false;

  if (!passed) {
    fine = violations.length * 500;
    if (violations.length >= 3) {
      licenseSuspended = true;
      store.license.suspensions++;
      store.license.isValid = false;
    }
  }

  const result = passed
    ? `✅ Rapport conforme — Félicitations`
    : `❌ Non-conformité détectée — Amende de ${fine}$`;

  sendPrivateMessage(store.ownerId, `📋 Rapport : ${result}`);

  if (fine > 0) {
    removeCash(fine, store.ownerId);
  }

  netEmit("sqdc:inspection_completed", { storeId, passed, fine, violations });
  return { success: true, message: result };
}

// ═══════════════════════════════════════════════════════════
// EMBAUCHE / CONGÉDIEMENT
// ═══════════════════════════════════════════════════════════

export function hireEmployee(
  storeId: string,
  hiringPlayerId: string,
  targetPlayerId: string,
  targetPlayerName: string,
  role: SqdcRole,
  hourlyRate: number,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(hiringPlayerId);
  if (!perms.canHire) {
    return { success: false, message: "Vous n'avez pas la permission d'embaucher." };
  }

  if (hourlyRate < MIN_HOURLY_WAGE_QC) {
    return {
      success: false,
      message: `Salaire minimum québécois obligatoire : ${MIN_HOURLY_WAGE_QC}$/h`,
    };
  }

  const already = store.employees.find((e) => e.playerId === targetPlayerId);
  if (already) return { success: false, message: "Ce joueur fait déjà partie des effectifs." };

  const employee: SqdcEmployee = {
    playerId: targetPlayerId,
    playerName: targetPlayerName,
    role,
    hourlyRate,
    hoursWorked: 0,
    totalEarned: 0,
    isClockedIn: false,
    clockInTime: null,
    hireDate: Date.now(),
    performanceRating: 50,
    salesCount: 0,
    storeId,
  };

  store.employees.push(employee);
  PLAYER_ROLES.set(targetPlayerId, { storeId, role });

  netEmit("sqdc:hired", {
    playerId: targetPlayerId,
    storeId,
    role,
    hourlyRate,
    storeName: store.name,
  });

  sendPrivateMessage(
    targetPlayerId,
    `🎉 Contrat signé ! Vous êtes engagé chez ${store.name} en tant que ${role} à ${hourlyRate}$/h`,
  );

  return { success: true, message: `${targetPlayerName} a rejoint l'équipe.` };
}

export function fireEmployee(
  storeId: string,
  firingPlayerId: string,
  targetPlayerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(firingPlayerId);
  if (!perms.canFire) {
    return { success: false, message: "Droit de licenciement manquant." };
  }

  const idx = store.employees.findIndex((e) => e.playerId === targetPlayerId);
  if (idx === -1) return { success: false, message: "Employé introuvable." };

  const emp = store.employees[idx];

  if (emp.isClockedIn && emp.clockInTime) {
    const hoursWorked = (Date.now() - emp.clockInTime) / 3600000;
    const owed = hoursWorked * emp.hourlyRate;
    transferMoney(store.ownerId, targetPlayerId, owed);
  }

  store.employees.splice(idx, 1);
  PLAYER_ROLES.delete(targetPlayerId);

  netEmit("sqdc:fired", { playerId: targetPlayerId, storeId });
  sendPrivateMessage(targetPlayerId, `❌ Votre contrat avec la SQDC a été révoqué.`);

  return { success: true, message: "Employé licencié." };
}

// ═══════════════════════════════════════════════════════════
// PUNCH IN / PUNCH OUT
// ═══════════════════════════════════════════════════════════

export function clockIn(
  storeId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const emp = store.employees.find((e) => e.playerId === playerId);
  if (!emp) return { success: false, message: "Aucun contrat actif trouvé." };

  if (emp.isClockedIn) {
    return { success: false, message: "Déjà en service." };
  }

  emp.isClockedIn = true;
  emp.clockInTime = Date.now();

  netEmit("sqdc:clock_in", { playerId, storeId, timestamp: Date.now() });
  return { success: true, message: "Prise de service validée. Bon quart de travail !" };
}

export function clockOut(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; earned: number } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", earned: 0 };

  const emp = store.employees.find((e) => e.playerId === playerId);
  if (!emp || !emp.isClockedIn || !emp.clockInTime) {
    return { success: false, message: "Pas en service.", earned: 0 };
  }

  const hours = (Date.now() - emp.clockInTime) / 3600000;
  const earned = Math.round(hours * emp.hourlyRate * 100) / 100;

  emp.hoursWorked += hours;
  emp.totalEarned += earned;
  emp.isClockedIn = false;
  emp.clockInTime = null;

  transferMoney(store.ownerId, playerId, earned);

  netEmit("sqdc:clock_out", { playerId, storeId, hours, earned });
  return {
    success: true,
    message: `Fin de quart de travail. ${hours.toFixed(2)}h travaillées, ${earned}$ virés sur votre compte.`,
    earned,
  };
}

// ═══════════════════════════════════════════════════════════
// OUVERTURE / FERMETURE DU MAGASIN
// ═══════════════════════════════════════════════════════════

export function openStore(
  storeId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canOpenStore) {
    return { success: false, message: "Droits d'ouverture manquants." };
  }

  const hour = useGameStore.getState().timeHours;
  if (!isSqdcOpen(hour)) {
    return {
      success: false,
      message: `En dehors des heures légales d'ouverture de l'État (${sqdcHoursLabel()}).`,
    };
  }

  if (!store.license.isValid) {
    return { success: false, message: "Autorisation SQDC invalide ou révoquée par l'État." };
  }

  store.isOpen = true;
  store.openedBy = playerId;
  store.openedAt = Date.now();

  netEmit("sqdc:store_opened", { storeId, openedBy: playerId });
  sendChatMessage(`🟢 La succursale SQDC ${store.name} est désormais OUVERTE aux clients.`);

  return { success: true, message: "Boutique ouverte !" };
}

export interface DailyReport {
  storeId: string;
  date: string;
  revenue: number;
  customers: number;
  transactions: number;
  employeesPaid: number;
  incidents: number;
  stockValue: number;
}

function emptyReport(): DailyReport {
  return {
    storeId: "",
    date: "",
    revenue: 0,
    customers: 0,
    transactions: 0,
    employeesPaid: 0,
    incidents: 0,
    stockValue: 0,
  };
}

export function closeStore(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; dailyReport: DailyReport } {
  const store = getStore(storeId);
  if (!store) {
    return {
      success: false,
      message: "Magasin introuvable.",
      dailyReport: emptyReport(),
    };
  }

  const perms = getPlayerPermissions(playerId);
  if (!perms.canCloseStore) {
    return {
      success: false,
      message: "Permissions insuffisantes.",
      dailyReport: emptyReport(),
    };
  }

  store.isOpen = false;

  const report: DailyReport = {
    storeId,
    date: new Date().toISOString(),
    revenue: store.todayRevenue,
    customers: store.todayCustomers,
    transactions: store.registers.reduce((s, r) => s + r.todayTransactions, 0),
    employeesPaid: store.employees.filter((e) => e.hoursWorked > 0).length,
    incidents: store.incidents.filter((i) => !i.resolved).length,
    stockValue: store.stock.reduce((s, i) => s + i.quantity * i.wholesalePrice, 0),
  };

  store.todayRevenue = 0;
  store.todayCustomers = 0;
  store.registers.forEach((r) => {
    r.todayRevenue = 0;
    r.todayTransactions = 0;
  });

  netEmit("sqdc:store_closed", { storeId, report });
  sendChatMessage(`🔴 La succursale SQDC ${store.name} a fermé ses portes pour la nuit.`);

  return { success: true, message: "Magasin fermé. Rapport généré.", dailyReport: report };
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE CAISSE
// ═══════════════════════════════════════════════════════════

export function occupyRegister(
  storeId: string,
  registerId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const reg = store.registers.find((r) => r.id === registerId);
  if (!reg) return { success: false, message: "Caisse introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canSell) {
    return { success: false, message: "Vous n'êtes pas caissier." };
  }

  if (reg.operatedBy && reg.operatedBy !== playerId) {
    return { success: false, message: "Cette caisse est déjà occupée." };
  }

  reg.operatedBy = playerId;
  reg.isOpen = true;

  netEmit("sqdc:register_occupied", { storeId, registerId, playerId });
  return { success: true, message: "Vous gérez désormais cette caisse." };
}

export function leaveRegister(
  storeId: string,
  registerId: string,
  playerId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const reg = store.registers.find((r) => r.id === registerId);
  if (!reg) return { success: false, message: "Caisse introuvable." };

  if (reg.operatedBy !== playerId) {
    return { success: false, message: "Vous n'êtes pas à cette caisse." };
  }

  reg.operatedBy = null;
  reg.isOpen = false;

  netEmit("sqdc:register_left", { storeId, registerId, playerId });
  return { success: true, message: "Vous avez quitté la caisse." };
}

// ═══════════════════════════════════════════════════════════
// PROCESSUS D'ACHAT
// ═══════════════════════════════════════════════════════════

export interface CheckoutRequest {
  customerId: string;
  storeId: string;
  registerId: string;
  cart: Cart;
  paymentMethod: "cash" | "debit" | "credit";
  customerAge: number;
  hasId: boolean;
}

export async function requestCheckout(
  req: CheckoutRequest,
): Promise<{ success: boolean; message: string; transaction: SqdcTransaction | null }> {
  const store = getStore(req.storeId);
  if (!store) {
    return { success: false, message: "Magasin introuvable.", transaction: null };
  }

  if (!store.isOpen) {
    return { success: false, message: "Le magasin est fermé.", transaction: null };
  }

  const reg = store.registers.find((r) => r.id === req.registerId);
  if (!reg || !reg.operatedBy) {
    return { success: false, message: "Aucun caissier à cette caisse.", transaction: null };
  }

  const customerData = getPlayerData();
  netEmit("sqdc:customer_at_register", {
    cashierId: reg.operatedBy,
    customerId: req.customerId,
    customerName: customerData?.name ?? "Client",
    storeId: req.storeId,
    registerId: req.registerId,
    cart: req.cart,
  });

  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        message: "⏱️ Le caissier n'a pas répondu à temps.",
        transaction: null,
      });
    }, 60000);

    const unsubscribe = netOn("sqdc:cashier_response", (data: any) => {
      if (data.customerId !== req.customerId) return;

      clearTimeout(timeout);
      unsubscribe();

      if (!data.approved) {
        resolve({
          success: false,
          message: data.reason || "❌ Vente refusée par le caissier.",
          transaction: null,
        });
        return;
      }

      const result = executeTransaction(req, reg);
      resolve(result);
    });
  });
}

function executeTransaction(
  req: CheckoutRequest,
  reg: CashRegister,
): { success: boolean; message: string; transaction: SqdcTransaction | null } {
  const store = getStore(req.storeId)!;

  for (const cartItem of req.cart.items) {
    const stock = store.stock.find((s) => s.itemId === cartItem.itemId);
    if (!stock || stock.quantity < cartItem.qty) {
      return {
        success: false,
        message: `Rupture de stock : ${cartItem.itemId}`,
        transaction: null,
      };
    }
  }

  let subtotal = 0;
  const items: SqdcTransaction["items"] = [];
  for (const cartItem of req.cart.items) {
    const stock = store.stock.find((s) => s.itemId === cartItem.itemId)!;
    const lineTotal = stock.retailPrice * cartItem.qty;
    subtotal += lineTotal;
    items.push({
      itemId: cartItem.itemId,
      qty: cartItem.qty,
      unitPrice: stock.retailPrice,
    });
  }

  const tps = Math.round(subtotal * 0.05 * 100) / 100;
  const tvq = Math.round(subtotal * 0.09975 * 100) / 100;
  const total = Math.round((subtotal + tps + tvq) * 100) / 100;

  const customerData = getPlayerData();
  if (!customerData) {
    return { success: false, message: "Données client introuvables.", transaction: null };
  }

  if (customerData.cash < total) {
    return {
      success: false,
      message: `Fonds insuffisants (${total}$ requis).`,
      transaction: null,
    };
  }

  removeCash(total, req.customerId);

  reg.cashInside += total;
  reg.todayRevenue += total;
  reg.todayTransactions++;

  store.todayRevenue += total;
  store.todayCustomers++;

  addLoyaltyPoints(req.customerId, req.storeId, total);

  for (const cartItem of req.cart.items) {
    const stock = store.stock.find((s) => s.itemId === cartItem.itemId)!;
    stock.quantity -= cartItem.qty;

    if (stock.quantity <= stock.reorderThreshold) {
      netEmit("sqdc:low_stock", {
        storeId: req.storeId,
        itemId: cartItem.itemId,
        quantity: stock.quantity,
      });
    }
  }

  for (const cartItem of req.cart.items) {
    addToInventory(cartItem.itemId, cartItem.qty, req.customerId);
  }

  const cashier = store.employees.find((e) => e.playerId === reg.operatedBy);
  if (cashier) {
    cashier.salesCount++;
    cashier.performanceRating = Math.min(100, cashier.performanceRating + 0.5);
  }

  const transaction: SqdcTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    storeId: req.storeId,
    registerId: reg.id,
    cashierId: reg.operatedBy!,
    cashierName: cashier?.playerName ?? "Système",
    customerId: req.customerId,
    customerName: customerData.name,
    items,
    subtotal,
    tps,
    tvq,
    total,
    paymentMethod: req.paymentMethod,
    timestamp: Date.now(),
    idVerified: req.hasId,
    customerAge: req.customerAge,
    cancelled: false,
    refunded: false,
  };

  ACTIVE_CARTS.delete(req.customerId);
  netEmit("sqdc:transaction_complete", { transaction });

  return {
    success: true,
    message: `Achat approuvé : ${total}$`,
    transaction,
  };
}

export function cashierRespond(
  cashierId: string,
  customerId: string,
  approved: boolean,
  reason?: string,
): void {
  netEmit("sqdc:cashier_response", { cashierId, customerId, approved, reason });
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE PANIER
// ═══════════════════════════════════════════════════════════

export function addToCart(
  customerId: string,
  storeId: string,
  itemId: ShopItemId,
  qty: number = 1,
): { success: boolean; message: string; cart: Cart | null } {
  const store = getStore(storeId);
  if (!store || !store.isOpen) {
    return { success: false, message: "Magasin fermé.", cart: null };
  }

  const stock = store.stock.find((s) => s.itemId === itemId);
  if (!stock) {
    return { success: false, message: "Produit non enregistré.", cart: null };
  }

  if (stock.quantity < qty) {
    return {
      success: false,
      message: `Stock insuffisant (${stock.quantity} disponibles).`,
      cart: null,
    };
  }

  let cart = ACTIVE_CARTS.get(customerId);
  if (!cart) {
    cart = { customerId, storeId, items: [], createdAt: Date.now() };
    ACTIVE_CARTS.set(customerId, cart);
  }

  if (cart.storeId !== storeId) {
    return {
      success: false,
      message: "Vous possédez déjà un panier actif dans une autre succursale.",
      cart: null,
    };
  }

  const existing = cart.items.find((i) => i.itemId === itemId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.items.push({ itemId, qty });
  }

  const totalGrams = cart.items.reduce((s, i) => {
    const item = itemById(i.itemId);
    return s + (item?.weight ?? 0) * i.qty;
  }, 0);

  if (totalGrams > 30) {
    if (existing) existing.qty -= qty;
    else cart.items = cart.items.filter((i) => i.itemId !== itemId);
    return {
      success: false,
      message: "❌ Limite légale canadienne de possession de 30g dépassée.",
      cart,
    };
  }

  netEmit("sqdc:cart_updated", { customerId, cart });
  return { success: true, message: "Ajouté à votre panier.", cart };
}

export function removeFromCart(
  customerId: string,
  itemId: ShopItemId,
): { success: boolean; cart: Cart | null } {
  const cart = ACTIVE_CARTS.get(customerId);
  if (!cart) return { success: false, cart: null };

  cart.items = cart.items.filter((i) => i.itemId !== itemId);
  if (cart.items.length === 0) ACTIVE_CARTS.delete(customerId);

  netEmit("sqdc:cart_updated", { customerId, cart });
  return { success: true, cart };
}

export function getCart(customerId: string): Cart | null {
  return ACTIVE_CARTS.get(customerId) ?? null;
}

// ═══════════════════════════════════════════════════════════
// GESTION DU STOCK
// ═══════════════════════════════════════════════════════════

export function restockShelf(
  storeId: string,
  playerId: string,
  itemId: ShopItemId,
  qty: number,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canManageStock) {
    return { success: false, message: "Permissions insuffisantes." };
  }

  const stock = store.stock.find((s) => s.itemId === itemId);
  if (!stock) return { success: false, message: "Produit inconnu." };

  const backpackQty = getInventoryItem(playerId, itemId);
  if (!backpackQty || backpackQty < qty) {
    return { success: false, message: "Pas assez d'unités dans votre sac." };
  }

  const space = stock.maxCapacity - stock.quantity;
  const toAdd = Math.min(qty, space);
  if (toAdd <= 0) return { success: false, message: "Présentoir plein." };

  removeFromInventory(itemId, toAdd, playerId);
  stock.quantity += toAdd;
  stock.lastRestock = Date.now();

  netEmit("sqdc:shelf_restocked", { storeId, itemId, qty: toAdd, byPlayer: playerId });
  return { success: true, message: `${toAdd} articles replacés en rayon.` };
}

export function orderStock(
  storeId: string,
  playerId: string,
  order: Array<{ itemId: ShopItemId; qty: number }>,
): { success: boolean; message: string; totalCost: number } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", totalCost: 0 };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canOrderStock) {
    return { success: false, message: "Commande interdite.", totalCost: 0 };
  }

  let totalCost = 0;
  const orderItems: StockOrder["items"] = [];

  for (const line of order) {
    const stock = store.stock.find((s) => s.itemId === line.itemId);
    if (!stock) continue;
    const lineCost = stock.wholesalePrice * line.qty;
    totalCost += lineCost;
    orderItems.push({
      itemId: line.itemId,
      qty: line.qty,
      unitPrice: stock.wholesalePrice,
    });
  }

  const ownerData = getPlayerData();
  if (!ownerData || ownerData.cash < totalCost) {
    return {
      success: false,
      message: "Fonds professionnels insuffisants.",
      totalCost,
    };
  }

  removeCash(totalCost, store.ownerId);

  const stockOrder: StockOrder = {
    id: `order_${Date.now()}`,
    storeId,
    items: orderItems,
    totalCost,
    status: "pending",
    orderedBy: playerId,
    orderedAt: Date.now(),
    eta: Date.now() + 3600000,
  };

  setTimeout(() => {
    stockOrder.status = "delivered";
    for (const item of orderItems) {
      const stock = store.stock.find((s) => s.itemId === item.itemId)!;
      const space = stock.maxCapacity - stock.quantity;
      stock.quantity += Math.min(item.qty, space);
    }
    netEmit("sqdc:stock_delivered", { storeId, order: stockOrder });
  }, 15000);

  netEmit("sqdc:stock_ordered", { storeId, order: stockOrder });
  return { success: true, message: `Livraison commandée pour ${totalCost}$`, totalCost };
}

// ═══════════════════════════════════════════════════════════
// LIVRAISON À DOMICILE
// ═══════════════════════════════════════════════════════════

export function createDelivery(
  storeId: string,
  customerId: string,
  items: Array<{ itemId: ShopItemId; qty: number }>,
  address: { x: number; z: number },
): { success: boolean; message: string; deliveryId: string | null } {
  const store = getStore(storeId);
  if (!store) {
    return { success: false, message: "Magasin introuvable.", deliveryId: null };
  }

  const customerData = getPlayerData();
  if (!customerData) {
    return { success: false, message: "Client introuvable.", deliveryId: null };
  }

  let total = 0;
  for (const line of items) {
    const stock = store.stock.find((s) => s.itemId === line.itemId);
    if (!stock || stock.quantity < line.qty) {
      return {
        success: false,
        message: `${line.itemId} en rupture.`,
        deliveryId: null,
      };
    }
    total += stock.retailPrice * line.qty;
  }

  const deliveryFee = 8;
  const grandTotal = total * 1.14975 + deliveryFee;

  if (customerData.cash < grandTotal) {
    return {
      success: false,
      message: `Fonds insuffisants (${grandTotal.toFixed(2)}$ requis).`,
      deliveryId: null,
    };
  }

  removeCash(grandTotal, customerId);

  const delivery: Delivery = {
    id: `del_${Date.now()}`,
    customerId,
    customerName: customerData.name,
    address,
    items,
    total: grandTotal,
    status: "pending",
    driverId: null,
    orderedAt: Date.now(),
    deliveredAt: null,
    tipAmount: 0,
  };

  store.deliveries.push(delivery);
  netEmit("sqdc:delivery_created", { storeId, delivery });

  const livreurs = store.employees.filter((e) => e.role === "livreur" && e.isClockedIn);
  for (const l of livreurs) {
    sendPrivateMessage(l.playerId, `📦 Nouvelle livraison SQDC prête : ${delivery.customerName}`);
  }

  return {
    success: true,
    message: "Commande transmise au livreur.",
    deliveryId: delivery.id,
  };
}

export function acceptDelivery(
  storeId: string,
  driverId: string,
  deliveryId: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(driverId);
  if (!perms.canDeliver) {
    return { success: false, message: "Rôle de livreur requis." };
  }

  const delivery = store.deliveries.find((d) => d.id === deliveryId);
  if (!delivery) return { success: false, message: "Course introuvable." };
  if (delivery.status !== "pending") {
    return { success: false, message: "Déjà assignée." };
  }

  delivery.driverId = driverId;
  delivery.status = "assigned";

  for (const item of delivery.items) {
    addToInventory(item.itemId, item.qty, driverId);
    const stock = store.stock.find((s) => s.itemId === item.itemId)!;
    stock.quantity -= item.qty;
  }

  netEmit("sqdc:delivery_accepted", { storeId, delivery });
  return {
    success: true,
    message: `Livraison prise en charge. Destination : (${delivery.address.x}, ${delivery.address.z})`,
  };
}

export function completeDelivery(
  storeId: string,
  driverId: string,
  deliveryId: string,
  driverCoords: { x: number; z: number },
): { success: boolean; message: string; earnings: number } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", earnings: 0 };

  const delivery = store.deliveries.find((d) => d.id === deliveryId);
  if (!delivery || delivery.driverId !== driverId) {
    return { success: false, message: "Course invalide.", earnings: 0 };
  }

  const dist = Math.hypot(
    driverCoords.x - delivery.address.x,
    driverCoords.z - delivery.address.z,
  );
  if (dist > 15) {
    return {
      success: false,
      message: `Rapprochez-vous de l'adresse de destination (écart : ${dist.toFixed(0)}m).`,
      earnings: 0,
    };
  }

  for (const item of delivery.items) {
    removeFromInventory(item.itemId, item.qty, driverId);
    addToInventory(item.itemId, item.qty, delivery.customerId);
  }

  delivery.status = "delivered";
  delivery.deliveredAt = Date.now();

  const commission = Math.round(delivery.total * 0.1 * 100) / 100;
  const earnings = commission + delivery.tipAmount;
  addCash(earnings, driverId);

  netEmit("sqdc:delivery_completed", { storeId, delivery, earnings });
  sendPrivateMessage(delivery.customerId, `📦 Commande livrée. Bon moment !`);

  return {
    success: true,
    message: `Course finalisée ! Gain : ${earnings}$`,
    earnings,
  };
}

// ═══════════════════════════════════════════════════════════
// SERVICES SÉCURITÉ & CAMÉRAS
// ═══════════════════════════════════════════════════════════

export function banCustomer(
  storeId: string,
  guardId: string,
  customerId: string,
  reason: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(guardId);
  if (!perms.canBanCustomers) {
    return { success: false, message: "Droit d'expulsion manquant." };
  }

  if (!store.bannedCustomers.includes(customerId)) {
    store.bannedCustomers.push(customerId);
  }

  const customerData = getPlayerData();
  const incident: Incident = {
    id: `inc_${Date.now()}`,
    type: "harassment",
    timestamp: Date.now(),
    suspectId: customerId,
    suspectName: customerData?.name ?? "Inconnu",
    reportedBy: guardId,
    description: reason,
    resolved: true,
    policeAlerted: false,
  };
  store.incidents.push(incident);

  sendPrivateMessage(customerId, `🚫 Bannissement SQDC : Vous n'êtes plus toléré chez ${store.name}`);
  netEmit("sqdc:customer_banned", { storeId, customerId, reason });

  return { success: true, message: `${customerData?.name} a été banni.` };
}

export function reportIncident(
  storeId: string,
  reporterId: string,
  suspectId: string,
  type: Incident["type"],
  description: string,
  alertPolice: boolean,
): void {
  const store = getStore(storeId);
  if (!store) return;

  const suspectData = getPlayerData();
  const incident: Incident = {
    id: `inc_${Date.now()}`,
    type,
    timestamp: Date.now(),
    suspectId,
    suspectName: suspectData?.name ?? "Inconnu",
    reportedBy: reporterId,
    description,
    resolved: false,
    policeAlerted: alertPolice,
  };

  store.incidents.push(incident);

  if (alertPolice) {
    dispatchPolice({
      location: store.position,
      priority: "medium",
      type: `SQDC — ${type}`,
      description,
    });
    if (type === "theft" || type === "robbery") {
      addWantedPoints(suspectId, type === "robbery" ? 100 : 40, "Vol à la SQDC");
    }
  }

  netEmit("sqdc:incident_reported", { storeId, incident });
}

export function viewCameras(
  storeId: string,
  playerId: string,
): { success: boolean; message: string; feeds: CameraFeed[] } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable.", feeds: [] };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canViewCameras) {
    return { success: false, message: "Accès caméras refusé.", feeds: [] };
  }

  for (const cam of store.cameras) {
    if (!cam.viewingPlayers.includes(playerId)) {
      cam.viewingPlayers.push(playerId);
    }
  }

  netEmit("sqdc:cameras_accessed", { storeId, playerId });
  return { success: true, message: "Flux caméras actifs.", feeds: store.cameras };
}

// ═══════════════════════════════════════════════════════════
// COFFRE-FORT SECURISÉ
// ═══════════════════════════════════════════════════════════

export function depositToSafe(
  storeId: string,
  playerId: string,
  registerId: string,
  amount: number,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canAccessSafe) {
    return { success: false, message: "Accès coffre-fort réservé." };
  }

  const reg = store.registers.find((r) => r.id === registerId);
  if (!reg || reg.cashInside < amount) {
    return { success: false, message: "Montant de transfert incohérent." };
  }

  reg.cashInside -= amount;
  store.safe.cash += amount;

  netEmit("sqdc:safe_deposit", { storeId, playerId, amount });
  return { success: true, message: `${amount}$ déposés en chambre forte.` };
}

export function withdrawFromSafe(
  storeId: string,
  playerId: string,
  amount: number,
  combination: string,
): { success: boolean; message: string } {
  const store = getStore(storeId);
  if (!store) return { success: false, message: "Magasin introuvable." };

  const perms = getPlayerPermissions(playerId);
  if (!perms.canAccessSafe) {
    return { success: false, message: "Accès coffre-fort réservé." };
  }

  if (combination !== store.safe.combination) {
    reportIncident(
      storeId,
      "system",
      playerId,
      "theft",
      "Saisie de combinaison erronée du coffre fort.",
      true,
    );
    return { success: false, message: "Combinaison erronée. Alarme système enclenchée !" };
  }

  if (store.safe.cash < amount) {
    return { success: false, message: "Fonds insuffisants en chambre forte." };
  }

  store.safe.cash -= amount;
  addCash(amount, playerId);

  netEmit("sqdc:safe_withdraw", { storeId, playerId, amount });
  return { success: true, message: `${amount}$ retirés.` };
}

// ═══════════════════════════════════════════════════════════
// PROMPTS & INTERACTIONS INTERFACE
// ═══════════════════════════════════════════════════════════

export function sqdcPrompt(
  aisle: DepAisleHot | null,
  garment: BoutiqueGarment | null,
  atCaisse: boolean,
  cartN: number,
  hasId: boolean,
  playerId: string,
  storeId: string,
): string | null {
  const store = getStore(storeId);
  if (!store) return null;

  const role = getPlayerRole(playerId);
  const isEmployee = role?.storeId === storeId && role.role !== "client";

  if (isEmployee) {
    if (atCaisse) {
      const reg = store.registers[0];
      if (!reg?.operatedBy) return "E — Ouvrir la caisse";
      if (reg.operatedBy === playerId) return "E — Servir le client / F — Quitter caisse";
      return `Caisse occupée par un collègue`;
    }
    if (aisle?.id === "reserve") {
      return "E — Entrer dans la réserve";
    }
    if (aisle) {
      const stock = store.stock.filter((s) => aisle.items.includes(s.itemId));
      const lowStock = stock.some((s) => s.quantity <= s.reorderThreshold);
      if (lowStock) return `⚠️ Remplir rayon (Stock Bas) · Appuyer sur E`;
      return `${aisle.label} · Appuyer sur E pour stocker`;
    }
    return null;
  }

  if (store.bannedCustomers.includes(playerId)) {
    return "🚫 Vous êtes interdit d'accès ici.";
  }

  if (!store.isOpen) return "🔴 Fermé pour la nuit";

  if (garment) {
    const item = itemById(garment.itemId);
    if (item) return `E — Acheter ${item.name} pour ${item.price}$`;
  }

  if (atCaisse) {
    const reg = store.registers[0];
    if (!reg?.operatedBy) return "❌ Aucun caissier en poste";
    if (!hasId) return "Caisse · Présentation de carte d'identité requise";
    return cartN > 0
      ? `E — Commander vos produits (${cartN} article${cartN > 1 ? "s" : ""})`
      : "Panier vide";
  }

  if (aisle) {
    if (aisle.id === "accueil") {
      return hasId ? "Entrée autorisée (21 ans certifié)" : "21 ans · Contrôle d'identité requis";
    }
    if (aisle.id === "conseil") return "E — Parler avec un conseiller";
    if (aisle.id === "reserve") return "🚫 Zone réservée aux employés";
    return `E — Ouvrir le rayon ${aisle.label} · ${aisle.hint}`;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// RECONSTRUCTION DE L'INTERIEUR 3D AVEC PHYSIQUE
// ═══════════════════════════════════════════════════════════

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function productCard(id: ShopItemId, x: number, y: number, z: number, rotY = 0) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x1a1c1e });
  const loader = new THREE.TextureLoader();
  loader.load(`/products/${id}.jpg`, (tex) => {
    finishMap(tex, "clamp");
    mat.map = tex;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.46), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  return m;
}

function jar(x: number, y: number, z: number, tint: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.12, 0.22, 10),
    matLib.physicalGlass(tint, 0.92, 0.08),
  );
  body.position.set(x, y, z);
  body.castShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10),
    commerceMat("noirMat"),
  );
  lid.position.set(x, y + 0.13, z);
  g.add(lid);
  return g;
}

function poster(text: string, x: number, y: number, z: number, w = 0.9, h = 0.55, rotY = 0) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1A5632";
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, 256, 160 + (i - (lines.length - 1) / 2) * 52);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

function securityCamera(x: number, y: number, z: number, id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `camera_${id}`;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12),
    matLib.get(0x1a1a1a, 0.6),
  );
  base.position.set(x, y, z);
  g.add(base);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.15, 0.04),
    matLib.get(0x2a2a2a, 0.5),
  );
  arm.position.set(x, y - 0.1, z);
  g.add(arm);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    matLib.physicalGlass(0x1a1a2a, 0.7, 0.2),
  );
  dome.position.set(x, y - 0.18, z);
  dome.rotation.x = Math.PI;
  g.add(dome);

  return g;
}

export function buildSqdcInterior(storeId?: string) {
  const g = new THREE.Group();
  g.name = "interieur_sqdc";
  g.userData = { type: "sqdc-interior", storeId };

  const W = 13.4;
  const D = 11.8;
  const H = 3.25;
  const FRONT_Z = D / 2;
  const BACK_Z = -D / 2;
  const ENTRY_HALF = 2.15;

  const walls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];
  const garments: BoutiqueGarment[] = [];
  const aisles: DepAisleHot[] = [];

  function addPhysicalWall(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    collisionPadding = 0.06,
  ) {
    const meshWall = box(w, h, d, x, y, z, mat);
    g.add(meshWall);
    walls.push({
      minX: x - w / 2 - collisionPadding,
      maxX: x + w / 2 + collisionPadding,
      minZ: z - d / 2 - collisionPadding,
      maxZ: z + d / 2 + collisionPadding,
    });
    return meshWall;
  }

  function addShelf(x: number, z: number, width: number, depth: number, label: string, accent = QC_PALETTE.sqdcVert) {
    const shelfMat = commerceMat("boisClair");
    const top = box(width, 0.10, depth, x, 1.15, z, shelfMat);
    g.add(top);
    const lower = box(width, 0.85, 0.06, x, 0.50, z + depth * 0.40, commerceMat("noirMat"));
    g.add(lower);
    const header = box(width, 0.16, 0.06, x, 1.72, z - depth * 0.40, matLib.getEmissive(accent, 0x173c2a, 0.35));
    g.add(header);
    g.add(poster(label, x, 1.94, z - depth * 0.46, Math.min(width * 0.78, 1.9), 0.28, 0));
  }

  function addAisle(id: SqdcAisleId, label: string, hint: string, x: number, z: number, items: ShopItemId[]) {
    aisles.push({ id, label, hint, x, z, items });
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), commerceMat("beton"));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "sqdc_floor";
  g.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matLib.get(0xf7f5ef, 0.96));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  ceiling.name = "sqdc_ceiling";
  g.add(ceiling);

  const wallMat = matLib.get(0xf0ece4, 0.96);
  addPhysicalWall(W, H, 0.20, 0, H / 2, BACK_Z, wallMat);
  addPhysicalWall(0.20, H, D, -W / 2, H / 2, 0, wallMat);
  addPhysicalWall(0.20, H, D, W / 2, H / 2, 0, wallMat);

  const frontSegmentWidth = (W - ENTRY_HALF * 2) / 2;
  const frontSegmentCenter = ENTRY_HALF + frontSegmentWidth / 2;
  addPhysicalWall(frontSegmentWidth, H, 0.20, -frontSegmentCenter, H / 2, FRONT_Z, wallMat);
  addPhysicalWall(frontSegmentWidth, H, 0.20, frontSegmentCenter, H / 2, FRONT_Z, wallMat);
  g.add(box(ENTRY_HALF * 2, 0.30, 0.20, 0, H - 0.15, FRONT_Z, wallMat));

  for (const x of [-4.4, 0, 4.4]) {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 0.18), matLib.getEmissive(0xf4f0e0, 0xfff6d8, 0.96));
    tube.position.set(x, H - 0.10, 0.2);
    tube.name = `sqdc_led_${x}`;
    g.add(tube);
    const light = new THREE.PointLight(0xfff7e6, 1.55, 7.5, 1.6);
    light.position.set(x, 2.85, 0.4);
    g.add(light);
  }
  const mainLight = new THREE.PointLight(0xfff8ec, 1.7, 16, 1.55);
  mainLight.position.set(0, 2.8, 1.8);
  g.add(mainLight);

  g.add(poster("SQDC\nPORTNEUF\n21 ANS ET PLUS", 0, 2.30, BACK_Z + 0.11, 2.35, 1.05, 0));
  g.add(poster("ACHAT RESPONSABLE", 0, 1.25, BACK_Z + 0.11, 2.15, 0.42, 0));

  addShelf(-4.25, -4.35, 4.3, 0.72, "FLEUR SÉCHÉE");
  const flowerXs = [-5.75, -4.85, -3.95, -3.05, -2.15];
  for (let i = 0; i < flowerXs.length; i++) {
    g.add(jar(flowerXs[i], 1.33, -4.17, i % 2 ? 0xa8c8a0 : 0xc8dcc0));
  }
  addAisle("fleur", "Fleur séchée", "Indica, sativa, hybride.", -4.25, -3.55, ["weed", "fleur_indica", "fleur_sativa"]);

  addShelf(3.95, -4.32, 3.15, 0.72, "HUILES & VAPES");
  for (const x of [3.10, 3.85, 4.60]) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.28, 10), new THREE.MeshPhysicalMaterial({
      color: 0xc8dce8, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.9, transmission: 0.9, ior: 1.5, depthWrite: false
    }));
    bottle.position.set(x, 1.34, -4.10);
    bottle.castShadow = true;
    g.add(bottle);
  }
  addAisle("huile", "Huiles", "Flacons 30 ml.", 3.65, -3.55, ["huile"]);
  addAisle("vape", "Vapes", "Cartouches, batteries.", 4.75, -2.30, ["vape"]);

  addPhysicalWall(3.2, 1.02, 0.58, -2.30, 0.51, 0.05, commerceMat("noirMat"));
  addPhysicalWall(3.2, 1.02, 0.58, 1.35, 0.51, 0.05, commerceMat("boisClair"));
  addAisle("preroll", "Préroulés", "Joints, gélules, hash.", -2.30, 0.90, ["preroll", "gelules", "hash"]);
  addAisle("edibles", "Comestibles", "Bonbons, chocolats, boissons.", -1.95, 2.15, ["gummies_10mg", "chocolate_5mg", "beverage_thc"]);
  addAisle("accessoires", "Accessoires", "Papiers, grinders, pipes.", 1.25, 2.15, ["rolling_papers", "grinder", "pipe_glass", "lighter"]);

  const productSpots: Array<{ id: ShopItemId; x: number; z: number; y: number }> = [
    { id: "weed", x: -5.85, z: -4.12, y: 1.36 },
    { id: "fleur_indica", x: -4.95, z: -4.12, y: 1.36 },
    { id: "fleur_sativa", x: -4.05, z: -4.12, y: 1.36 },
    { id: "huile", x: 3.95, z: -4.12, y: 1.38 },
    { id: "vape", x: 4.72, z: 0.17, y: 1.36 },
    { id: "preroll", x: -2.30, z: 0.17, y: 1.36 },
  ];
  for (const s of productSpots) {
    g.add(productCard(s.id, s.x, s.y, s.z));
    garments.push({ itemId: s.id, x: s.x, z: s.z });
  }

  addPhysicalWall(1.55, 1.02, 0.62, -4.95, 0.51, 3.15, commerceMat("boisNaturel"));
  addAisle("accueil", "Accueil", "Contrôle d'identité.", -4.95, 2.55, []);
  g.add(poster("ACCUEIL\nPIÈCE D'IDENTITÉ", -4.95, 1.90, 3.48, 1.35, 0.68, Math.PI));

  addPhysicalWall(3.15, 1.02, 0.86, 4.55, 0.51, 0.75, commerceMat("boisClair"));
  const till = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.20, 0.26),
    matLib.getEmissive(0x173d28, 0x4da76a, 0.78),
  );
  till.position.set(4.60, 1.16, 0.56);
  till.name = "cash_register_1";
  till.userData = { storeId, registerId: "reg_1", interactive: true };
  g.add(till);
  addAisle("caisse", "Caisse", "TPS + TVQ · carte d'identité.", 4.35, 1.65, []);

  addPhysicalWall(0.14, H, 2.35, 4.95, H / 2, 3.80, commerceMat("boisNaturel"));
  addPhysicalWall(1.90, 0.80, 0.70, 5.15, 0.40, 4.35, commerceMat("boisNaturel"));
  addAisle("conseil", "Conseiller", "Conseils et posologie.", 4.70, 3.55, []);

  addPhysicalWall(0.14, H, 3.15, -3.20, H / 2, -3.65, matLib.get(0xe3d9c9, 0.92));
  addPhysicalWall(2.10, H, 0.14, -4.25, H / 2, -5.05, matLib.get(0xe3d9c9, 0.92));
  addPhysicalWall(1.10, 2.30, 0.08, -4.20, 1.15, -5.02, matLib.get(0x553c27, 0.95));
  const fridge = box(0.78, 1.78, 0.68, -5.55, 0.89, -4.28, matLib.get(0xe6e8e5, 0.90));
  fridge.name = "sqdc_employee_fridge";
  g.add(fridge);
  addAisle("reserve", "Réserve", "Employés seulement.", -4.55, -4.55, []);

  addPhysicalWall(0.14, H, 2.65, 3.25, H / 2, -3.72, matLib.get(0xe7dfd1, 0.90));
  addPhysicalWall(2.00, H, 0.14, 4.25, H / 2, -5.05, matLib.get(0xe7dfd1, 0.90));
  const toilet = box(0.46, 0.40, 0.60, 5.35, 0.20, -4.35, matLib.get(0xf5f3ed, 0.92));
  toilet.name = "sqdc_toilet";
  g.add(toilet);

  const cameras: CameraFeed[] = [
    { id: "cam_entrance", position: { x: 0, y: 3.0, z: FRONT_Z - 0.28 }, rotation: { x: -Math.PI / 4, y: Math.PI }, isRecording: true, viewingPlayers: [] },
    { id: "cam_caisse", position: { x: 4.30, y: 3.0, z: 1.50 }, rotation: { x: -Math.PI / 4, y: Math.PI * 0.85 }, isRecording: true, viewingPlayers: [] },
    { id: "cam_stock", position: { x: -3.50, y: 3.0, z: -2.80 }, rotation: { x: -Math.PI / 4, y: 0.15 }, isRecording: true, viewingPlayers: [] },
    { id: "cam_back", position: { x: 0, y: 3.0, z: BACK_Z + 0.35 }, rotation: { x: -Math.PI / 3, y: 0 }, isRecording: true, viewingPlayers: [] },
  ];
  for (const cam of cameras) {
    g.add(securityCamera(cam.position.x, cam.position.y, cam.position.z, cam.id));
  }

  g.add(poster("21 ANS\nET PLUS", -6.0, 2.25, BACK_Z + 0.12, 1.15, 0.72));
  g.add(poster("ENTRÉE", 0, 2.40, FRONT_Z - 0.12, 1.35, 0.38, Math.PI));
  g.add(poster("CAISSE", 4.35, 2.15, 0.20, 1.15, 0.34, Math.PI / 2));

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, FRONT_Z - 1.60),
    spawnYaw: Math.PI,
    exit: new THREE.Vector3(0, 0, FRONT_Z - 0.35),
    walls,
    title: "SQDC",
    subtitle: "Société Québécoise du Cannabis",
    garments,
    caisse: { x: 4.55, z: 0.75 },
    aisles,
    cameras,
    interactives: {
      register: { x: 4.60, y: 1.16, z: 0.56, id: "reg_1" },
      backDoor: { x: -4.20, y: 1.15, z: -5.02 },
      safe: { x: -5.55, y: 1.0, z: -4.75 },
    },
  };
}

export function buildSqdcExterior(
  storeId: string,
  globalWalls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>,
): THREE.Group {
  const building = new THREE.Group();
  building.name = "sqdc_building_exterior";

  const W = 18;
  const D = 16;
  const H = 4;
  const entranceHalf = 2.15;
  const frontZ = D / 2;

  const wallMat = matLib.get(0xd8d4cc, 0.96);
  const roofMat = matLib.get(0x4a4a4a, 0.92);

  const sideWidth = (W - entranceHalf * 2) / 2;
  const sideCenter = entranceHalf + sideWidth / 2;
  building.add(box(sideWidth, H, 0.30, -sideCenter, H / 2, frontZ, wallMat));
  building.add(box(sideWidth, H, 0.30, sideCenter, H / 2, frontZ, wallMat));
  building.add(box(entranceHalf * 2, 0.82, 0.30, 0, H - 0.41, frontZ, wallMat));

  building.add(box(W, H, 0.30, 0, H / 2, -frontZ, wallMat));
  building.add(box(0.30, H, D, -W / 2, H / 2, 0, wallMat));
  building.add(box(0.30, H, D, W / 2, H / 2, 0, wallMat));
  building.add(box(W + 1, 0.40, D + 1, 0, H, 0, roofMat));

  globalWalls.push(
    { minX: -W / 2, maxX: -entranceHalf, minZ: frontZ - 0.18, maxZ: frontZ + 0.18 },
    { minX: entranceHalf, maxX: W / 2, minZ: frontZ - 0.18, maxZ: frontZ + 0.18 },
    { minX: -W / 2, maxX: W / 2, minZ: -frontZ - 0.18, maxZ: -frontZ + 0.18 },
    { minX: -W / 2 - 0.18, maxX: -W / 2 + 0.18, minZ: -frontZ, maxZ: frontZ },
    { minX: W / 2 - 0.18, maxX: W / 2 + 0.18, minZ: -frontZ, maxZ: frontZ },
  );

  const signGroup = new THREE.Group();
  signGroup.name = "animated_sign";
  signGroup.position.set(0, H + 1.2, frontZ + 0.4);

  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.25, 0.20), matLib.get(0x1a5632, 0.98));
  signGroup.add(signBoard);

  const signText = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 0.92),
    matLib.getEmissive(QC_PALETTE.sqdcVert, 0x19462d, 0.92),
  );
  signText.position.z = 0.11;
  signGroup.add(signText);
  building.add(signGroup);

  building.add(box(5.25, 0.14, 1.35, 0, 3.65, frontZ + 0.55, matLib.get(0x202522, 0.95)));
  for (const x of [-2.0, -0.7, 0.7, 2.0]) {
    const beamLight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.42, 10),
      matLib.getEmissive(0xf4f0e0, 0xfff6d8, 0.82),
    );
    beamLight.rotation.z = Math.PI / 2;
    beamLight.position.set(x, 3.55, frontZ + 0.58);
    building.add(beamLight);
  }

  const parkingFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), commerceMat("beton"));
  parkingFloor.rotation.x = -Math.PI / 2;
  parkingFloor.position.set(0, 0.01, frontZ + 8);
  parkingFloor.receiveShadow = true;
  building.add(parkingFloor);

  const entrance = buildAdvancedDoorSystem(storeId, 0, 0, frontZ, globalWalls);
  building.add(entrance);

  const lampPostMat = matLib.get(0x2a2a2a, 0.9);
  const lampLightMat = matLib.getEmissive(0xfff6d8, 0xfff6d8, 0.92);
  for (const x of [-6, 6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 4, 10), lampPostMat);
    post.position.set(x, 2, frontZ + 6);
    building.add(post);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 12), lampLightMat);
    lamp.position.set(x, 4, frontZ + 6);
    building.add(lamp);

    const light = new THREE.PointLight(0xfff6d8, 1.45, 12);
    light.position.set(x, 4, frontZ + 6);
    building.add(light);
  }

  building.add(poster("HEURES\n10h - 21h", -6, 2.5, frontZ + 0.2, 1.2, 0.8));
  building.add(poster("21 ANS\nET PLUS\nPIÈCE REQUISE", 6, 2.5, frontZ + 0.2, 1.2, 0.8));

  // Injection MLO sécurisée et typée
  try {
    const interiorData = buildSqdcInterior(storeId);
    if (interiorData && interiorData.group) {
      const interiorGroup = interiorData.group;
      interiorGroup.position.set(0, 0, 0); 
      building.add(interiorGroup);
      console.log("🧬 Intérieur SQDC injecté dans le bâtiment extérieur (MLO) avec succès !");
    }
  } catch (e) {
    console.error("Erreur lors de l'injection MLO de l'intérieur SQDC:", e);
  }
  
  return building;
}

export function createNewStore(
  ownerId: string,
  ownerName: string,
  name: string,
  address: string,
  city: string,
  position: { x: number; z: number },
): SqdcStore {
  const store: SqdcStore = {
    id: `sqdc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    address,
    city,
    position,
    ownerId,
    isOpen: false,
    openedBy: null,
    openedAt: null,
    employees: [
      {
        playerId: ownerId,
        playerName: ownerName,
        role: "directeur",
        hourlyRate: 0,
        hoursWorked: 0,
        totalEarned: 0,
        isClockedIn: false,
        clockInTime: null,
        hireDate: Date.now(),
        performanceRating: 100,
        salesCount: 0,
        storeId: "",
      },
    ],
    schedules: [],
    stock: SQDC_AISLES.flatMap((aisle) =>
      aisle.items.map(
        (itemId): SqdcStock => ({
          itemId,
          quantity: 50,
          maxCapacity: 100,
          reorderThreshold: 15,
          wholesalePrice: (itemById(itemId)?.price ?? 20) * 0.6,
          retailPrice: itemById(itemId)?.price ?? 20,
          aisle: aisle.id,
          lastRestock: Date.now(),
          displayShelf: `shelf_${aisle.id}`,
        }),
      ),
    ),
    registers: [
      {
        id: "reg_1",
        storeId: "",
        cashInside: 200,
        isOpen: false,
        operatedBy: null,
        todayRevenue: 0,
        todayTransactions: 0,
        position: { x: 3.55, y: 1.32, z: -1.65 },
      },
    ],
    safe: {
      cash: 5000,
      combination: Math.floor(Math.random() * 9000 + 1000).toString(),
    },
    cameras: [],
    todayRevenue: 0,
    todayCustomers: 0,
    weeklyRevenue: 0,
    bannedCustomers: [],
    license: {
      number: `SQDC-${Date.now().toString().slice(-8)}`,
      issuedTo: ownerName,
      expiryDate: Date.now() + 365 * 24 * 3600 * 1000,
      isValid: true,
      suspensions: 0,
      violationsCount: 0,
    },
    bills: [],
    deliveries: [],
    incidents: [],
  };

  store.employees[0].storeId = store.id;
  store.registers[0].storeId = store.id;

  PLAYER_ROLES.set(ownerId, { storeId: store.id, role: "directeur" });
  registerStore(store);

  return store;
}

export function aisleBySqdcId(id: string) {
  return SQDC_AISLES.find((a) => a.id === id) ?? null;
}

export function catalogForSqdcAisle(aisle: string) {
  const spec = aisleBySqdcId(aisle);
  if (!spec || spec.items.length === 0) return [];
  return spec.items.map((id) => itemById(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
}

export function sqdcMapMarks(shops: ShopSpot[]) {
  return shops.filter((s) => s.kind === "sqdc").map((s) => ({ id: s.id, name: s.name, x: s.x, z: s.z }));
}

// ═══════════════════════════════════════════════════════════
// ENREGISTREMENT DES APPELS RPC (REMOTES)
// ═══════════════════════════════════════════════════════════

registerRemote("sqdc:hire", hireEmployee);
registerRemote("sqdc:fire", fireEmployee);
registerRemote("sqdc:clock_in", clockIn);
registerRemote("sqdc:clock_out", clockOut);
registerRemote("sqdc:open_store", openStore);
registerRemote("sqdc:close_store", closeStore);
registerRemote("sqdc:occupy_register", occupyRegister);
registerRemote("sqdc:leave_register", leaveRegister);
registerRemote("sqdc:cashier_respond", cashierRespond);
registerRemote("sqdc:add_to_cart", addToCart);
registerRemote("sqdc:remove_from_cart", removeFromCart);
registerRemote("sqdc:request_checkout", requestCheckout);
registerRemote("sqdc:restock_shelf", restockShelf);
registerRemote("sqdc:order_stock", orderStock);
registerRemote("sqdc:create_delivery", createDelivery);
registerRemote("sqdc:accept_delivery", acceptDelivery);
registerRemote("sqdc:complete_delivery", completeDelivery);
registerRemote("sqdc:ban_customer", banCustomer);
registerRemote("sqdc:report_incident", reportIncident);
registerRemote("sqdc:view_cameras", viewCameras);
registerRemote("sqdc:deposit_safe", depositToSafe);
registerRemote("sqdc:withdraw_safe", withdrawFromSafe);
registerRemote("sqdc:create_store", createNewStore);
registerRemote("sqdc:start_robbery", startRobbery);
registerRemote("sqdc:demand_money", demandMoney);
registerRemote("sqdc:start_inspection", startInspection);
registerRemote("sqdc:complete_inspection", completeInspection);

export { shopDoorOffset };

/** Compatibilité legacy worldapi/older builders. */
export const buildSqdcStore = createNewStore;
