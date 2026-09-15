export interface LockResult {
  granted: boolean;
  message: string;
  reason: "granted" | "bad_pin" | "bad_card" | "lockout";
  lockoutMs: number;
}

export interface HotelSnapshot {
  unlockedDoors: string[];
  tvOn: boolean;
  lightsOn?: boolean;
}

const DEFAULT_PIN = "1234";
const MASTER_PIN = "9999";
const DEFAULT_CARD = "CARD-1234";
const MASTER_CARD = "CARD-MASTER-00";
const LOCKOUT_MS = 15000;

export class HotelSecurity {
  private fails = 0;
  private lockoutUntil = 0;
  private unlocked = new Set<string>();
  
  public tvOn = false;
  public lightsOn = false;

  private customPins = new Map<string, string>();
  private customCards = new Map<string, string>();

  hydrate(doorIds: string[] = [], tvOn = false, lightsOn = false) {
    this.unlocked = new Set(doorIds);
    this.tvOn = tvOn;
    this.lightsOn = lightsOn;
    this.fails = 0;
    this.lockoutUntil = 0;
  }

  snapshot(): HotelSnapshot {
    return {
      unlockedDoors: [...this.unlocked],
      tvOn: this.tvOn,
      lightsOn: this.lightsOn,
    };
  }

  isUnlocked(doorId: string): boolean {
    return this.unlocked.has(doorId);
  }

  remainingLockout(): number {
    return Math.max(0, this.lockoutUntil - Date.now());
  }

  toggleTv(): boolean {
    this.tvOn = !this.tvOn;
    return this.tvOn;
  }

  toggleLights(): boolean {
    this.lightsOn = !this.lightsOn;
    return this.lightsOn;
  }

  setRoomPin(doorId: string, pin: string) {
    this.customPins.set(doorId, pin.trim());
  }

  setRoomCard(doorId: string, cardId: string) {
    this.customCards.set(doorId, cardId.trim());
  }

  pick(doorId: string): LockResult {
    return this.grant(doorId, "Serrure crochetée avec succès");
  }

  lock(doorId: string): boolean {
    return this.unlocked.delete(doorId);
  }

  toggleDoor(doorId: string): boolean {
    if (this.unlocked.has(doorId)) {
      this.unlocked.delete(doorId);
      return false;
    } else {
      this.unlocked.add(doorId);
      return true;
    }
  }

  unlockAll(ids: string[]) {
    for (const id of ids) {
      this.unlocked.add(id);
    }
    this.resetLockout();
  }

  lockAll() {
    this.unlocked.clear();
  }

  resetLockout() {
    this.fails = 0;
    this.lockoutUntil = 0;
  }

  tryPin(doorId: string, pin: string): LockResult {
    const left = this.remainingLockout();
    if (left > 0) {
      return {
        granted: false,
        message: `Lecteur sécurisé bloqué · ${Math.ceil(left / 1000)} s`,
        reason: "lockout",
        lockoutMs: left,
      };
    }

    const cleanPin = pin.replace(/[\s-]/g, "");
    const expectedPin = this.customPins.get(doorId) || DEFAULT_PIN;

    if (cleanPin === expectedPin || cleanPin === MASTER_PIN) {
      return this.grant(doorId, "NIP accepté — Bienvenue dans votre chambre");
    }

    return this.fail("bad_pin");
  }

  tryCard(doorId: string, cardUid = DEFAULT_CARD): LockResult {
    const left = this.remainingLockout();
    if (left > 0) {
      return {
        granted: false,
        message: `Lecteur sécurisé bloqué · ${Math.ceil(left / 1000)} s`,
        reason: "lockout",
        lockoutMs: left,
      };
    }

    const cleanUid = cardUid.trim();
    const expectedCard = this.customCards.get(doorId) || DEFAULT_CARD;

    if (cleanUid === expectedCard || cleanUid === MASTER_CARD) {
      return this.grant(doorId, "Carte magnétique validée — Accès autorisé");
    }

    return this.fail("bad_card");
  }

  private grant(doorId: string, message: string): LockResult {
    this.fails = 0;
    this.unlocked.add(doorId);
    return {
      granted: true,
      message,
      reason: "granted",
      lockoutMs: 0,
    };
  }

  private fail(kind: "bad_pin" | "bad_card"): LockResult {
    this.fails += 1;
    if (this.fails >= 3) {
      this.lockoutUntil = Date.now() + LOCKOUT_MS;
      this.fails = 0;
      return {
        granted: false,
        message: "3 tentatives infructueuses — Terminal bloqué 15 s",
        reason: "lockout",
        lockoutMs: LOCKOUT_MS,
      };
    }

    return {
      granted: false,
      message: kind === "bad_pin" ? "NIP incorrect" : "Carte magnétique invalide",
      reason: kind,
      lockoutMs: 0,
    };
  }
}

export const hotelSecurity = new HotelSecurity();
