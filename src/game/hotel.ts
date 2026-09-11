export interface LockResult {
  granted: boolean;
  message: string;
  reason: "granted" | "bad_pin" | "bad_card" | "lockout";
  lockoutMs: number;
}

const PIN = "1234";
const CARD = "CARD-1234";
const LOCKOUT_MS = 15000;

export interface HotelSnapshot {
  unlockedDoors: string[];
  tvOn: boolean;
}

class HotelSecurity {
  fails = 0;
  lockoutUntil = 0;
  unlocked = new Set<string>();
  tvOn = false;

  hydrate(ids: string[], tvOn = false) {
    this.unlocked = new Set(ids);
    this.tvOn = tvOn;
  }

  snapshot(): HotelSnapshot {
    return { unlockedDoors: [...this.unlocked], tvOn: this.tvOn };
  }

  isUnlocked(doorId: string) {
    return this.unlocked.has(doorId);
  }

  remainingLockout() {
    return Math.max(0, this.lockoutUntil - Date.now());
  }

  toggleTv(): boolean {
    this.tvOn = !this.tvOn;
    return this.tvOn;
  }

  private fail(kind: "bad_pin" | "bad_card"): LockResult {
    this.fails += 1;
    if (this.fails >= 3) {
      this.lockoutUntil = Date.now() + LOCKOUT_MS;
      this.fails = 0;
      return {
        granted: false,
        message: "Trop d'essais — lecteur bloqué 15 s",
        reason: "lockout",
        lockoutMs: LOCKOUT_MS,
      };
    }
    return {
      granted: false,
      message: kind === "bad_pin" ? "NIP refusé" : "Carte refusée",
      reason: kind,
      lockoutMs: 0,
    };
  }

  private grant(doorId: string, how: string): LockResult {
    this.fails = 0;
    this.unlocked.add(doorId);
    return { granted: true, message: how, reason: "granted", lockoutMs: 0 };
  }

  pick(doorId: string): LockResult {
    return this.grant(doorId, "Serrure crochetée");
  }

  unlockAll(ids: string[]) {
    for (const id of ids) this.unlocked.add(id);
    this.fails = 0;
    this.lockoutUntil = 0;
  }

  lockAll() {
    this.unlocked.clear();
  }

  tryPin(doorId: string, pin: string): LockResult {
    const left = this.remainingLockout();
    if (left > 0) {
      return {
        granted: false,
        message: `Lecteur bloqué · ${Math.ceil(left / 1000)} s`,
        reason: "lockout",
        lockoutMs: left,
      };
    }
    if (pin.replace(/\s/g, "") === PIN) return this.grant(doorId, "NIP accepté — chambre ouverte");
    return this.fail("bad_pin");
  }

  tryCard(doorId: string, uid = CARD): LockResult {
    const left = this.remainingLockout();
    if (left > 0) {
      return {
        granted: false,
        message: `Lecteur bloqué · ${Math.ceil(left / 1000)} s`,
        reason: "lockout",
        lockoutMs: left,
      };
    }
    if (uid === CARD) return this.grant(doorId, "Carte magnétique acceptée");
    return this.fail("bad_card");
  }
}

export const hotelSecurity = new HotelSecurity();