/**
 * C:\TroxTWorld\src\game\emsCoronerSystem.ts
 * Système Paramédic & Coroner — Urgences de Portneuf & Autopsie.
 */
import { useGameStore } from "./store";

export interface AutopsyReport {
  id: string;
  victimName: string;
  timeOfDeath: string;
  cause: "Traumatisme balistique" | "Hypothermie sévère" | "Polytraumatisme routier" | "Arrêt cardiorespiratoire";
  coronerBadge: string;
  notes: string;
}

export class EmsCoronerSystem {
  /**
   * Réanimer un citoyen inconscient.
   */
  public revivePatient(targetPlayerName: string): { ok: boolean; message: string } {
    const store = useGameStore.getState();
    if (store.rpJob !== "ambulancier" && (store.inventory.medkit ?? 0) < 1) {
      return { ok: false, message: "Vous n'avez pas de trousse de premiers soins !" };
    }

    store.useItem("medkit");
    store.addCash(120, "Acte médical d'urgence (Assurance Maladie)");

    return { ok: true, message: `${targetPlayerName} a été stabilisé et réanimé.` };
  }

  /**
   * Rédiger un rapport d'autopsie officiel du Coroner.
   */
  public performAutopsy(victimName: string, estimatedCause: AutopsyReport["cause"]): AutopsyReport {
    const store = useGameStore.getState();
    const report: AutopsyReport = {
      id: `COR-${Math.floor(1000 + Math.random() * 9000)}`,
      victimName,
      timeOfDeath: new Date().toLocaleTimeString("fr-CA"),
      cause: estimatedCause,
      coronerBadge: store.appearance.name || "Dr. Coroner",
      notes: "Constat de décès officiel pour enquête Sûreté du Québec.",
    };

    store.addItem("rapport_coroner", 1);
    return report;
  }
}

export const emsCoronerSystem = new EmsCoronerSystem();