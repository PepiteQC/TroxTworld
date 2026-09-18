/**
 * HotelRealtimeSecurity
 * Store temps réel léger pour les portes d'hôtel / propriétés.
 *
 * - Fonctionne localement avec BroadcastChannel/localStorage.
 * - Firebase-ready: seed et paths exportés; peut être branché à Firestore/Cloud Functions.
 * - Ne stocke jamais de secret lisible côté client en production réelle.
 */

// Define or export all required types locally so the file is completely self-contained
export type RoomId = string;

export interface DoorBase {
  id: string;
  roomId: RoomId;
  lockId: string;
}

export type HotelAccessMethod =
  "magnetic_card" | "numpad" | "connected_app" | "staff_override";

export interface HotelAccessAttempt {
  doorId: string;
  roomId: RoomId;
  lockId: string;
  method: HotelAccessMethod;
  actorId: string;
  cardUid?: string;
  pin?: string;
  createdAt: number;
}

export interface HotelAccessCredential {
  actorId: string;
  cardUid?: string;
  pin?: string;
  roomIds: string[] | "all";
  role: "resident" | "admin" | "staff";
  expiresAt?: number;
}

export interface HotelDoorSecurityState {
  roomId: RoomId;
  doorId: string;
  lockId: string;
  state: "locked" | "unlocked" | "open" | "lockout";
  isOpen: boolean;
  isLocked: boolean;
  failedAttempts: number;
  lockoutUntil?: number;
  lastActorId?: string;
  lastMethod?: HotelAccessMethod;
  lastMessage?: string;
  updatedAt: number;
}

export interface HotelAccessResult {
  granted: boolean;
  state: HotelDoorSecurityState;
  message: string;
  reason: "lockout" | "granted" | "bad_card" | "bad_pin" | "expired";
}

// Collections mock/definition for Firebase-readiness
export const BUILDINGS_COLLECTIONS = {
  HOTEL: {
    ROOMS: "buildings/hotel/rooms",
    DOORS: "buildings/hotel/doors",
    LOCKS: "buildings/hotel/locks",
    ACCESS_GRANTS: "buildings/hotel/access_grants",
    ACCESS_CREDENTIALS: "buildings/hotel/credentials",
    LOCK_EVENTS: "buildings/hotel/lock_events",
  },
};

export const HOTEL_SECURITY_DEFAULTS = {
  defaultCardUid: "CARD-1234",
  defaultPin: "1234",
  masterCardUid: "CARD-ADMIN",
  lockoutMs: 15000,
  autoRelockMs: 5000,
};

// Hotel Registry Data
export const HOTEL_ROOMS = [
  { id: "villa_nova", name: "Villa Nova Suite" },
  { id: "modern_loft", name: "Modern Loft Penthouse" },
  { id: "suburban_dream", name: "Suburban Dream Chamber" },
];

export const HOTEL_DOORS: DoorBase[] = [
  { id: "villa_nova_door", roomId: "villa_nova", lockId: "lock_villa_nova" },
  { id: "modern_loft_door", roomId: "modern_loft", lockId: "lock_modern_loft" },
  {
    id: "suburban_dream_door",
    roomId: "suburban_dream",
    lockId: "lock_suburban_dream",
  },
];

export const HOTEL_LOCKS = [
  { id: "lock_villa_nova", doorId: "villa_nova_door" },
  { id: "lock_modern_loft", doorId: "modern_loft_door" },
  { id: "lock_suburban_dream", doorId: "suburban_dream_door" },
];

const STORAGE_KEY = "etherworld.hotel.security.v1";
const CHANNEL = "etherworld-hotel-security";

type Listener = () => void;

export const HOTEL_FIREBASE_SECURITY_PATHS = {
  rooms: BUILDINGS_COLLECTIONS.HOTEL.ROOMS,
  doors: BUILDINGS_COLLECTIONS.HOTEL.DOORS,
  locks: BUILDINGS_COLLECTIONS.HOTEL.LOCKS,
  accessGrants: BUILDINGS_COLLECTIONS.HOTEL.ACCESS_GRANTS,
  credentials: BUILDINGS_COLLECTIONS.HOTEL.ACCESS_CREDENTIALS,
  events: BUILDINGS_COLLECTIONS.HOTEL.LOCK_EVENTS,
} as const;

function now() {
  return Date.now();
}

function createInitialStates(): Record<string, HotelDoorSecurityState> {
  const states: Record<string, HotelDoorSecurityState> = {};
  for (const door of HOTEL_DOORS) {
    states[door.id] = {
      roomId: door.roomId,
      doorId: door.id,
      lockId: door.lockId,
      state: "locked",
      isOpen: false,
      isLocked: true,
      failedAttempts: 0,
      updatedAt: now(),
    };
  }
  return states;
}

function createDefaultCredentials(): HotelAccessCredential[] {
  return [
    {
      actorId: "player-local",
      cardUid: HOTEL_SECURITY_DEFAULTS.defaultCardUid,
      pin: HOTEL_SECURITY_DEFAULTS.defaultPin,
      roomIds: ["villa_nova", "modern_loft", "suburban_dream"],
      role: "resident",
    },
    {
      actorId: "admin",
      cardUid: HOTEL_SECURITY_DEFAULTS.masterCardUid,
      pin: "0000",
      roomIds: "all",
      role: "admin",
    },
  ];
}

class HotelRealtimeSecurityStore {
  private states: Record<string, HotelDoorSecurityState> =
    createInitialStates();
  private credentials: HotelAccessCredential[] = createDefaultCredentials();
  private listeners = new Set<Listener>();
  private bc: BroadcastChannel | null = null;

  constructor() {
    this.restore();
    if (typeof BroadcastChannel !== "undefined") {
      this.bc = new BroadcastChannel(CHANNEL);
      this.bc.onmessage = (ev) => {
        if (ev.data?.type === "HOTEL_SECURITY_SYNC") {
          this.states = { ...this.states, ...ev.data.states };
          this.emit(false);
        }
      };
    }
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.states;

  getDoorState = (doorId: string) => this.states[doorId];

  getRoomDoorState = (roomId: string) => {
    const door = HOTEL_DOORS.find((d) => d.roomId === roomId);
    return door ? this.states[door.id] : undefined;
  };

  registerCredential(credential: HotelAccessCredential) {
    this.credentials = this.credentials.filter(
      (c) =>
        c.actorId !== credential.actorId || c.cardUid !== credential.cardUid,
    );
    this.credentials.push(credential);
    this.persist();
  }

  setDoorState(doorId: string, patch: Partial<HotelDoorSecurityState>) {
    const prev = this.states[doorId];
    if (!prev) return;
    this.states[doorId] = { ...prev, ...patch, updatedAt: now() };
    this.emit(true);
  }

  forceLock(doorId: string, actorId = "system") {
    this.setDoorState(doorId, {
      state: "locked",
      isLocked: true,
      isOpen: false,
      lastActorId: actorId,
      lastMethod: "staff_override",
      lastMessage: "Porte verrouillée",
    });
  }

  forceUnlock(doorId: string, actorId = "system") {
    this.setDoorState(doorId, {
      state: "unlocked",
      isLocked: false,
      isOpen: false,
      failedAttempts: 0,
      lastActorId: actorId,
      lastMethod: "staff_override",
      lastMessage: "Porte déverrouillée",
    });
  }

  toggleOpen(doorId: string) {
    const state = this.states[doorId];
    if (!state || state.isLocked || state.state === "lockout") return;
    this.setDoorState(doorId, {
      state: state.isOpen ? "unlocked" : "open",
      isOpen: !state.isOpen,
      lastMessage: state.isOpen ? "Porte refermée" : "Porte ouverte",
    });
  }

  async requestAccess(
    attempt: Omit<HotelAccessAttempt, "createdAt">,
  ): Promise<HotelAccessResult> {
    const state = this.states[attempt.doorId];
    if (!state) throw new Error(`Unknown hotel door: ${attempt.doorId}`);

    const t = now();
    if (state.lockoutUntil && state.lockoutUntil > t) {
      const next = {
        ...state,
        state: "lockout" as const,
        lastMessage: "Lecteur verrouillé temporairement",
        updatedAt: t,
      };
      this.states[attempt.doorId] = next;
      this.emit(true);
      return {
        granted: false,
        state: next,
        message: "Trop d’essais — lockout temporaire",
        reason: "lockout",
      };
    }

    const credential = this.credentials.find((c) => {
      if (c.expiresAt && c.expiresAt < t) return false;
      if (c.roomIds !== "all" && !c.roomIds.includes(attempt.roomId))
        return false;
      if (attempt.method === "magnetic_card")
        return !!attempt.cardUid && c.cardUid === attempt.cardUid;
      if (attempt.method === "numpad")
        return !!attempt.pin && c.pin === attempt.pin;
      if (attempt.method === "connected_app")
        return c.actorId === attempt.actorId;
      if (attempt.method === "staff_override")
        return c.role === "staff" || c.role === "admin";
      return false;
    });

    if (credential) {
      const next: HotelDoorSecurityState = {
        ...state,
        state: "unlocked",
        isLocked: false,
        isOpen: false,
        failedAttempts: 0,
        lockoutUntil: undefined,
        lastActorId: attempt.actorId,
        lastMethod: attempt.method,
        lastMessage:
          attempt.method === "magnetic_card"
            ? "Carte magnétique acceptée"
            : attempt.method === "numpad"
              ? "Numpad accepté"
              : "Accès autorisé",
        updatedAt: t,
      };
      this.states[attempt.doorId] = next;
      this.emit(true);
      window.setTimeout?.(() => {
        const current = this.states[attempt.doorId];
        if (current && !current.isOpen && !current.isLocked)
          this.forceLock(attempt.doorId, "auto-relock");
      }, HOTEL_SECURITY_DEFAULTS.autoRelockMs);
      return {
        granted: true,
        state: next,
        message: next.lastMessage || "Accès autorisé",
        reason: "granted",
      };
    }

    const failedAttempts = state.failedAttempts + 1;
    const lockedOut = failedAttempts >= 3;
    const next: HotelDoorSecurityState = {
      ...state,
      state: lockedOut ? "lockout" : "locked",
      isLocked: true,
      isOpen: false,
      failedAttempts,
      lockoutUntil: lockedOut
        ? t + HOTEL_SECURITY_DEFAULTS.lockoutMs
        : undefined,
      lastActorId: attempt.actorId,
      lastMethod: attempt.method,
      lastMessage:
        attempt.method === "magnetic_card" ? "Carte refusée" : "NIP refusé",
      updatedAt: t,
    };
    this.states[attempt.doorId] = next;
    this.emit(true);
    return {
      granted: false,
      state: next,
      message: lockedOut
        ? "Trop d’essais — lecteur verrouillé"
        : next.lastMessage || "Accès refusé",
      reason: attempt.method === "magnetic_card" ? "bad_card" : "bad_pin",
    };
  }

  createFirebaseSeed() {
    return {
      paths: HOTEL_FIREBASE_SECURITY_PATHS,
      rooms: HOTEL_ROOMS,
      doors: HOTEL_DOORS,
      locks: HOTEL_LOCKS,
      states: Object.values(this.states),
      credentialsPolicy: {
        clientReadableSecrets: false,
        magneticCards: "hash/server-only in production",
        numpadPins: "hash/server-only in production",
      },
    };
  }

  private emit(sync: boolean) {
    this.persist();
    this.listeners.forEach((l) => l());
    if (sync)
      this.bc?.postMessage({
        type: "HOTEL_SECURITY_SYNC",
        states: this.states,
      });
  }

  private persist() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ states: this.states, credentials: this.credentials }),
      );
    } catch {}
  }

  private restore() {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.states) this.states = { ...this.states, ...parsed.states };
      if (Array.isArray(parsed?.credentials))
        this.credentials = parsed.credentials;
    } catch {}
  }
}

export const hotelRealtimeSecurity = new HotelRealtimeSecurityStore();

export function getDoorByRoom(roomId: RoomId): DoorBase | undefined {
  return HOTEL_DOORS.find((door) => door.roomId === roomId);
}

export function makeAccessAttempt(params: {
  roomId: RoomId;
  method: HotelAccessMethod;
  actorId?: string;
  cardUid?: string;
  pin?: string;
}) {
  const door = getDoorByRoom(params.roomId);
  const lock = door ? HOTEL_LOCKS.find((l) => l.doorId === door.id) : undefined;
  if (!door || !lock)
    throw new Error(`No security door for room ${params.roomId}`);
  return hotelRealtimeSecurity.requestAccess({
    roomId: params.roomId,
    doorId: door.id,
    lockId: lock.id,
    method: params.method,
    actorId: params.actorId || "player-local",
    cardUid: params.cardUid,
    pin: params.pin,
  });
}
