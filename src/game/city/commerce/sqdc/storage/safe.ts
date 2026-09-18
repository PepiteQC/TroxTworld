/**
 * TROXTWORLD — Coffre-fort SQDC
 */
export interface SafeSystem {
  getCash: () => number;
  deposit: (amount: number) => boolean;
  withdraw: (amount: number, combination: string, playerId: string) => { ok: boolean; reason?: string };
  setCombination: (newComb: string, playerId: string) => void;
  verifyCombination: (comb: string) => boolean;
}

export function createSafe(initialCash = 5000, combination = Math.floor(Math.random() * 9000 + 1000).toString()): SafeSystem {
  let cash = initialCash;
  let comb = combination;
  let failedAttempts = 0;
  let cooldownUntil = 0;

  return {
    getCash: () => cash,
    deposit: (amount) => {
      if (amount <= 0) return false;
      cash += amount;
      return true;
    },
    withdraw: (amount, combination, _playerId) => {
      const now = Date.now();
      if (now < cooldownUntil) {
        return { ok: false, reason: `Coffre bloqué (${Math.ceil((cooldownUntil - now) / 1000)} s)` };
      }
      if (combination !== comb) {
        failedAttempts++;
        if (failedAttempts >= 3) {
          cooldownUntil = now + 60000;
          failedAttempts = 0;
        }
        return { ok: false, reason: "Combinaison erronée" };
      }
      if (amount > cash) return { ok: false, reason: "Fonds insuffisants" };
      cash -= amount;
      failedAttempts = 0;
      return { ok: true };
    },
    setCombination: (newComb, _playerId) => {
      if (/^\d{4,8}$/.test(newComb)) comb = newComb;
    },
    verifyCombination: (c) => c === comb,
  };
}