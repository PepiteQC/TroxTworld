/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈMES D'INVESTIGATION ET MANDATS DE PERQUISITION — SÛRETÉ DU QUÉBEC (SQ)
 * ═════════════════════════════════════════════════════════════════════════
 */

import { matchCasingToWeapon, getWeapon } from "./weapons-qc";
import { triggerNotification } from "../phone";

export interface PoliceCaseFile {
  caseId: string;
  title: string;
  openedByOfficerId: string;
  suspectCharacterId?: string;
  collectedCasingIds: string[];
  matchedWeaponSerials: string[];
  powerAnomalyReported: boolean; // Signalement Hydro-Québec (surconsommation d'une planque)
  informerTipReceived: boolean;  // Indice d'un indicateur
  warrantIssued: boolean;        // Mandat signé par un juge virtuel
  createdAt: number;
}

export class PoliceInvestigationSystem {
  private activeCases = new Map<string, PoliceCaseFile>();

  /**
   * Ouvre un nouveau dossier d'enquête criminelle au poste de la SQ.
   */
  public createCaseFile(officerId: string, title: string): PoliceCaseFile {
    const caseId = `CASE-${Date.now().toString(36).toUpperCase()}`;
    const newCase: PoliceCaseFile = {
      caseId,
      title,
      openedByOfficerId: officerId,
      collectedCasingIds: [],
      matchedWeaponSerials: [],
      powerAnomalyReported: false,
      informerTipReceived: false,
      warrantIssued: false,
      createdAt: Date.now(),
    };
    this.activeCases.set(caseId, newCase);
    return newCase;
  }

  /**
   * Analyse une douille retrouvée sur une scène de crime grâce au système balistique IBIS.
   */
  public analyzeCasingEvidence(caseId: string, casingId: string, suspectedWeaponSerial: string): { match: boolean; report: string } {
    const caseFile = this.activeCases.get(caseId);
    if (!caseFile) return { match: false, report: "Dossier d'enquête introuvable." };

    if (!caseFile.collectedCasingIds.includes(casingId)) {
      caseFile.collectedCasingIds.push(casingId);
    }

    const result = matchCasingToWeapon(casingId, suspectedWeaponSerial);
    if (result.match && !caseFile.matchedWeaponSerials.includes(suspectedWeaponSerial)) {
      caseFile.matchedWeaponSerials.push(suspectedWeaponSerial);
    }

    return { match: result.match, report: result.report };
  }

  /**
   * L'enquêteur utilise un rapport d'Hydro-Québec pour prouver qu'une planque à Saint-Alban
   * consomme anormalement beaucoup d'électricité (lampes de culture ou labo illicite).
   */
  public attachPowerAnomalyReport(caseId: string): boolean {
    const caseFile = this.activeCases.get(caseId);
    if (!caseFile) return false;
    caseFile.powerAnomalyReported = true;
    return true;
  }

  /**
   * Évalue si les preuves accumulées suffisent pour obtenir un Mandat de Perquisition d'un juge.
   * Critères : Au moins une correspondance balistique + un signalement d'anomalie ou un indicateur.
   */
  public requestSearchWarrant(caseId: string): { granted: boolean; message: string } {
    const caseFile = this.activeCases.get(caseId);
    if (!caseFile) return { granted: false, message: "Dossier introuvable." };

    const hasBallisticProof = caseFile.matchedWeaponSerials.length > 0;
    const hasContextProof = caseFile.powerAnomalyReported || caseFile.informerTipReceived;

    if (hasBallisticProof && hasContextProof) {
      caseFile.warrantIssued = true;
      triggerNotification(caseFile.openedByOfficerId, {
        title: "⚖️ MANDAT DE PERQUISITION SIGNÉ",
        body: `Le juge a autorisé la descente pour le dossier #${caseId}. Intervention légale permise sur la planque visée.`,
        icon: "🚨",
        urgent: true,
      });
      return { granted: true, message: "Mandat de perquisition émis par le tribunal de Portneuf." };
    }

    return {
      granted: false,
      message: "Preuves insuffisantes. Le juge exige une correspondance balistique et un élément contextuel (rapport Hydro ou indic).",
    };
  }
}

export const policeInvestigation = new PoliceInvestigationSystem();