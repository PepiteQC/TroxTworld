/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🌐 PONT CLIENT API REST — TROXTWORLD / PORTNEUF RP (src/game/rpApi.ts)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Relie les systèmes de jeu (3D, HUD, UI) aux routes d'API serveur (/api/rp/*) :
 *  - 💼 Emplois & Paie (clock-in, clock-out, CNESST)
 *  - 🏦 Caisse Desjardins (dépôts, retraits, virements Interac)
 *  - 🏠 Immobilier MLS (achats, baux, serrures)
 *  - 🍁 SQDC (achats 21+, limite 30g)
 *  - 🔒 Prison & Cellules (écrou, caution, évasion)
 *  - 🚨 Dispatch 911 & CAD (appels d'urgence, bouton panique)
 *  - 👑 Gangs & Territoires (blanchiment, coffres, guerres)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useGameStore } from "./store";

// Helper générique pour requêtes JSON sécurisées
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const actorId = useGameStore.getState().playerId || "local_player";
    const actorName = useGameStore.getState().playerName || "Citoyen";

    const res = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Player-Id": actorId,
        "X-Actor-Id": actorId,
        "X-Actor-Name": actorName,
        ...(options.headers || {}),
      },
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || json.message || `Erreur HTTP ${res.status}` };
    }
    return { ok: true, data: json };
  } catch (err) {
    console.warn(`[RP API Error] Échec de communication avec ${endpoint}:`, err);
    return { ok: false, error: "Serveur injoignable ou hors-ligne" };
  }
}

// ═════════════════════════════════════════════════════════════
// 1. MODULE EMPLOIS & CARRIÈRES (/api/rp/jobs)
// ═════════════════════════════════════════════════════════════
export const jobsApi = {
  // Consulter les offres ou son contrat
  async getBoard(sector?: string) {
    const query = sector ? `?type=board&sector=${sector}` : "?type=board";
    return apiFetch(`/api/rp/jobs${query}`);
  },

  async getMyContract() {
    return apiFetch("/api/rp/jobs?type=contract");
  },

  async getStats() {
    return apiFetch("/api/rp/jobs?type=stats");
  },

  // Postuler à une offre
  async apply(jobId: string) {
    return apiFetch("/api/rp/jobs", {
      method: "POST",
      body: JSON.stringify({ action: "apply_job", jobId }),
    });
  },

  // Débuter son quart (Clock-In)
  async clockIn() {
    return apiFetch("/api/rp/jobs", {
      method: "POST",
      body: JSON.stringify({ action: "clock_in" }),
    });
  },

  // Terminer son quart et recevoir sa paie (Clock-Out)
  async clockOut() {
    return apiFetch("/api/rp/jobs", {
      method: "POST",
      body: JSON.stringify({ action: "clock_out" }),
    });
  },

  // Déclarer un accident de travail CNESST
  async reportInjury(injuryNature: string) {
    return apiFetch("/api/rp/jobs", {
      method: "POST",
      body: JSON.stringify({ action: "report_cnesst_injury", injuryNature }),
    });
  },

  // Démissionner
  async quit() {
    return apiFetch("/api/rp/jobs", { method: "DELETE" });
  },
};

// ═════════════════════════════════════════════════════════════
// 2. MODULE BANQUE & DESJARDINS (/api/rp/banking)
// ═════════════════════════════════════════════════════════════
export const bankingApi = {
  async getAccount() {
    return apiFetch("/api/rp/banking");
  },

  async deposit(amount: number) {
    return apiFetch("/api/rp/banking", {
      method: "POST",
      body: JSON.stringify({ action: "deposit", amount }),
    });
  },

  async withdraw(amount: number) {
    return apiFetch("/api/rp/banking", {
      method: "POST",
      body: JSON.stringify({ action: "withdraw", amount }),
    });
  },

  async sendInterac(targetId: string, amount: number, description?: string) {
    return apiFetch("/api/rp/banking", {
      method: "POST",
      body: JSON.stringify({ action: "interac_send", targetId, amount, description }),
    });
  },

  async requestLoan(amount: number) {
    return apiFetch("/api/rp/banking", {
      method: "POST",
      body: JSON.stringify({ action: "loan_request", amount }),
    });
  },

  async payLoan(amount: number) {
    return apiFetch("/api/rp/banking", {
      method: "POST",
      body: JSON.stringify({ action: "loan_pay", amount }),
    });
  },

  async launder(amount: number) {
    return apiFetch("/api/rp/banking", {
      method: "POST",
      body: JSON.stringify({ action: "launder", amount }),
    });
  },
};

// ═════════════════════════════════════════════════════════════
// 3. MODULE IMMOBILIER & BAUX (/api/rp/properties)
// ═════════════════════════════════════════════════════════════
export const propertiesApi = {
  async getAll(town?: string, type?: string) {
    const params = new URLSearchParams();
    if (town) params.set("town", town);
    if (type) params.set("type", type);
    return apiFetch(`/api/rp/properties?${params.toString()}`);
  },

  async getById(id: string) {
    return apiFetch(`/api/rp/properties?id=${id}`);
  },

  async buy(propertyId: string) {
    return apiFetch("/api/rp/properties", {
      method: "POST",
      body: JSON.stringify({ action: "buy_property", propertyId }),
    });
  },

  async signLease(propertyId: string) {
    return apiFetch("/api/rp/properties", {
      method: "POST",
      body: JSON.stringify({ action: "sign_lease", propertyId }),
    });
  },

  async toggleLock(propertyId: string) {
    return apiFetch("/api/rp/properties", {
      method: "POST",
      body: JSON.stringify({ action: "toggle_lock", propertyId }),
    });
  },

  async grantKey(propertyId: string, targetId: string) {
    return apiFetch("/api/rp/properties", {
      method: "POST",
      body: JSON.stringify({ action: "grant_keys", propertyId, targetId }),
    });
  },
};

// ═════════════════════════════════════════════════════════════
// 4. MODULE SQDC (/api/rp/sqdc)
// ═════════════════════════════════════════════════════════════
export const sqdcApi = {
  async getCatalog() {
    return apiFetch("/api/rp/sqdc");
  },

  async checkout(items: Array<{ productId: string; quantityUnits: number }>, paymentMethod: "cash" | "bank" = "cash") {
    return apiFetch("/api/rp/sqdc", {
      method: "POST",
      body: JSON.stringify({ action: "checkout", items, paymentMethod }),
    });
  },

  async robRegister() {
    return apiFetch("/api/rp/sqdc", {
      method: "POST",
      body: JSON.stringify({ action: "rob_register" }),
    });
  },
};

// ═════════════════════════════════════════════════════════════
// 5. MODULE PRISON & ÉCROU (/api/rp/prison)
// ═════════════════════════════════════════════════════════════
export const prisonApi = {
  async getMyStatus() {
    const actorId = useGameStore.getState().playerId || "local_player";
    return apiFetch(`/api/rp/prison?playerId=${actorId}`);
  },

  async getAllInmates() {
    return apiFetch("/api/rp/prison");
  },

  async incarcerate(playerId: string, name: string, crimeReason: string, sentenceDuration: number, bailAmount?: number) {
    return apiFetch("/api/rp/prison", {
      method: "POST",
      body: JSON.stringify({
        action: "incarcerate",
        playerId,
        name,
        crimeReason,
        sentenceDuration,
        bailAmount,
      }),
    });
  },

  async payBail(playerId: string) {
    return apiFetch("/api/rp/prison", {
      method: "POST",
      body: JSON.stringify({ action: "pay_bail", playerId }),
    });
  },

  async attemptEscape(playerId: string) {
    return apiFetch("/api/rp/prison", {
      method: "POST",
      body: JSON.stringify({ action: "attempt_escape", playerId }),
    });
  },
};

// ═════════════════════════════════════════════════════════════
// 6. MODULE DISPATCH 911 & MDT (/api/rp/dispatch)
// ═════════════════════════════════════════════════════════════
export const dispatchApi = {
  async getCallsAndUnits(dept?: string) {
    const query = dept ? `?department=${dept}` : "";
    return apiFetch(`/api/rp/dispatch${query}`);
  },

  async create911Call(title: string, description: string, location: { x: number; y: number; z: number; village?: string }, department = "sq", priority = "code2") {
    return apiFetch("/api/rp/dispatch", {
      method: "POST",
      body: JSON.stringify({
        action: "create_call",
        title,
        description,
        location,
        department,
        priority,
      }),
    });
  },

  async triggerPanic(callsign: string, officerName: string, location: { x: number; y: number; z: number }) {
    return apiFetch("/api/rp/dispatch", {
      method: "POST",
      body: JSON.stringify({
        action: "panic_button",
        callsign,
        officerName,
        location,
      }),
    });
  },

  async updateUnitStatus(callsign: string, statusCode: string, statusLabel: string, location?: { x: number; z: number }) {
    return apiFetch("/api/rp/dispatch", {
      method: "POST",
      body: JSON.stringify({
        action: "update_unit_status",
        callsign,
        statusCode,
        statusLabel,
        location,
      }),
    });
  },

  async respondToCall(callId: string, callsign: string) {
    return apiFetch("/api/rp/dispatch", {
      method: "POST",
      body: JSON.stringify({ action: "respond_call", callId, callsign }),
    });
  },

  async resolveCall(callId: string, resolutionNotes?: string) {
    return apiFetch("/api/rp/dispatch", {
      method: "POST",
      body: JSON.stringify({ action: "resolve_call", callId, resolutionNotes }),
    });
  },
};

// ═════════════════════════════════════════════════════════════
// 7. MODULE GANGS & TERRITOIRES (/api/rp/gangs)
// ═════════════════════════════════════════════════════════════
export const gangsApi = {
  async getTurfs() {
    return apiFetch("/api/rp/gangs?turf=true");
  },

  async getLeaderboard() {
    return apiFetch("/api/rp/gangs?leaderboard=true");
  },

  async launderMoney(gangId: string, amount: number) {
    return apiFetch("/api/rp/gangs", {
      method: "POST",
      body: JSON.stringify({ action: "launder_money", gangId, amount }),
    });
  },

  async initiateWar(gangId: string, turfId: string) {
    return apiFetch("/api/rp/gangs", {
      method: "POST",
      body: JSON.stringify({ action: "initiate_turf_war", gangId, turfId }),
    });
  },

  async captureTurf(gangId: string, turfId: string) {
    return apiFetch("/api/rp/gangs", {
      method: "POST",
      body: JSON.stringify({ action: "capture_turf", gangId, turfId }),
    });
  },

  async collectTribute(gangId: string, turfId: string) {
    return apiFetch("/api/rp/gangs", {
      method: "POST",
      body: JSON.stringify({ action: "collect_tribute", gangId, turfId }),
    });
  },
};