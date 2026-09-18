/**
 * ═══════════════════════════════════════════════════════════════════
 * ⚖️ TROXTWORLD / ETHERWORLD — SYSTÈME DE CRIMINALITÉ & RECHERCHE (CRIME)
 * ═══════════════════════════════════════════════════════════════════
 */

export interface Crime {
  id: string;
  label: string;
  starsAdded: number;
  fineAmount: number;
}

export interface WantedStatus {
  playerId: string;
  playerName: string;
  stars: number;
  activeCrimes: string[];
  lastCrimeAt: number;
}

export const CRIMES_CATALOG: Record<string, Crime> = {
  speeding: { id: "speeding", label: "Grand excès de vitesse (>40km/h)", starsAdded: 1, fineAmount: 250 },
  trespassing: { id: "trespassing", label: "Violation de propriété privée", starsAdded: 1, fineAmount: 150 },
  unlawful_carrying: { id: "unlawful_carrying", label: "Port d'arme prohibé en zone sécurisée", starsAdded: 2, fineAmount: 750 },
  grand_theft: { id: "grand_theft", label: "Vol qualifié de véhicule", starsAdded: 3, fineAmount: 1500 },
  officer_assault: { id: "officer_assault", label: "Agression sur agent de la paix SQ", starsAdded: 5, fineAmount: 5000 },
};

export type CrimeUpdateListener = (event: Record<string, unknown>) => void;

export class CrimeManager {
  private wantedPlayers: Map<string, WantedStatus> = new Map();
  private updateListeners: Set<CrimeUpdateListener> = new Set();

  constructor() {
    console.log("⚖️ [CrimeSystem] Système judiciaire de recherche et d'avis d'infraction actif.");
  }

  public commitCrime(playerId: string, playerName: string, crimeId: string): boolean {
    const crime = CRIMES_CATALOG[crimeId];
    if (!crime) return false;

    let status = this.wantedPlayers.get(playerId);
    if (!status) {
      status = {
        playerId,
        playerName,
        stars: 0,
        activeCrimes: [],
        lastCrimeAt: Date.now(),
      };
      this.wantedPlayers.set(playerId, status);
    }

    status.stars = Math.min(5, status.stars + crime.starsAdded);
    if (!status.activeCrimes.includes(crimeId)) {
      status.activeCrimes.push(crimeId);
    }
    status.lastCrimeAt = Date.now();

    this.notifyUpdate("crime_committed", {
      playerId,
      playerName,
      crimeId,
      crimeLabel: crime.label,
      stars: status.stars,
      fine: crime.fineAmount,
    });

    return true;
  }

  public getWantedStatus(playerId: string): WantedStatus | undefined {
    return this.wantedPlayers.get(playerId);
  }

  public arrestPlayer(playerId: string, prisonMinutes: number): boolean {
    const status = this.wantedPlayers.get(playerId);
    if (!status) return false;

    // Supprime l'avis de recherche une fois incarcéré
    this.wantedPlayers.delete(playerId);

    this.notifyUpdate("player_arrested", {
      playerId,
      playerName: status.playerName,
      prisonMinutes,
    });

    return true;
  }

  public clearWanted(playerId: string): boolean {
    const existed = this.wantedPlayers.delete(playerId);
    if (existed) {
      this.notifyUpdate("wanted_cleared", { playerId });
    }
    return existed;
  }

  public onUpdate(callback: CrimeUpdateListener): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdate(type: string, data: Record<string, unknown>): void {
    const payload = { type, timestamp: Date.now(), ...data };
    for (const listener of this.updateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("[CrimeSystem] Erreur listener :", err);
      }
    }
  }

  public dispose(): void {
    this.updateListeners.clear();
    this.wantedPlayers.clear();
    console.log("🛑 [CrimeSystem] Système judiciaire libéré.");
  }
}

export const crimeManager = new CrimeManager();
