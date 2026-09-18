/**
 * src/systems/access-control/simulator/LockSimulator.ts
 * 
 * MANDATORY simulator before any real hardware.
 * 
 * Anti-casse (verbatim):
 * - Créer un simulateur de serrure avant de connecter une vraie serrure.
 * - Ne jamais autoriser le navigateur à commander directement une serrure.
 * - Ne jamais conserver un NIP, une carte ou une clé sous forme lisible.
 * - Conserver un journal immuable.
 * - Ne jamais tester une nouvelle commande sur une porte occupée (sim only for now).
 * 
 * All real commands MUST go through Cloud Functions → secure adapter later.
 * Browser only ever calls this simulator (when ACCESS_SIMULATOR_ONLY = true).
 */

import type { AccessLog, AccessMethod, AccessResult } from '../core/AccessControlTypes';

let logCounter = 0;

function createImmutableLog(
  doorId: string,
  lockId: string,
  method: AccessMethod,
  result: AccessResult,
  actorId?: string,
  reason?: string
): AccessLog {
  return {
    id: `log_${Date.now()}_${++logCounter}`,
    timestamp: new Date().toISOString(),
    buildingId: doorId.startsWith('hotel') ? 'hotel_main' : 'depanneur_couche_tard',
    doorId,
    lockId,
    method,
    result,
    actorId,
    reason,
    metadata: { simulator: true, latencyMs: 180 + Math.random() * 120 },
  };
}

// In-memory append-only journal for dev (in prod → Firestore with security rules)
const ACCESS_JOURNAL: AccessLog[] = [];

export function getAccessJournal(): readonly AccessLog[] {
  return ACCESS_JOURNAL;
}

export interface LockAttemptOptions {
  doorId: string;
  lockId: string;
  method: AccessMethod;
  actorId?: string;
  providedCode?: string; // only for simulation — never real secret
  forceDeny?: boolean;
}

export interface LockAttemptResult {
  success: boolean;
  result: AccessResult;
  log: AccessLog;
  message: string;
}

/**
 * attemptAccess — the ONLY entry point for lock simulation.
 * Latency + random failure simulation for realism.
 * Never performs real hardware command.
 */
export async function attemptAccess(opts: LockAttemptOptions): Promise<LockAttemptResult> {
  const { doorId, lockId, method, actorId, providedCode, forceDeny } = opts;

  // Simulate network / hardware latency
  await new Promise((r) => setTimeout(r, 140 + Math.random() * 180));

  let result: AccessResult;
  let message: string;

  if (forceDeny) {
    result = 'denied';
    message = 'Access denied (forced for test)';
  } else if (providedCode === '1234' || method === 'connected_app') {
    result = 'granted';
    message = 'Access granted (simulated)';
  } else if (providedCode && providedCode.length > 0) {
    result = Math.random() > 0.7 ? 'denied' : 'expired';
    message = result === 'denied' ? 'Invalid code (simulated)' : 'Access expired (simulated)';
  } else {
    result = 'simulated';
    message = 'Simulator response (no real hardware)';
  }

  const log = createImmutableLog(doorId, lockId, method, result, actorId, message);
  ACCESS_JOURNAL.push(log); // append-only

  console.log(`[LockSimulator] ${result.toUpperCase()} — ${doorId} via ${method}`, log);

  return {
    success: result === 'granted' || result === 'simulated',
    result,
    log,
    message,
  };
}

// Future: real provider will implement the same interface
export interface LockProvider {
  attemptAccess(opts: LockAttemptOptions): Promise<LockAttemptResult>;
}

export const lockSimulator: LockProvider = {
  attemptAccess,
};

// Helper for UI / tests
export function resetSimulatorJournal() {
  ACCESS_JOURNAL.length = 0;
  logCounter = 0;
}
