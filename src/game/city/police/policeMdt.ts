/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈME MDT (MOBILE DATA TERMINAL) & INTERVENTIONS — SÛRETÉ DU QUÉBEC
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Permet aux patrouilleurs de la SQ de :
 *  - Consulter le dossier criminel et le statut de permis d'un citoyen (SIAF / SAAQ).
 *  - Émettre des constats d'infraction officiels avec retraits de points d'inaptitude.
 *  - Lancer un mandat de perquisition électronique sur les planques suspectes.
 * ═════════════════════════════════════════════════════════════════════════
 */

import { useGameStore } from "./store";
import { triggerNotification } from "./phone";
import { netEmit } from "./net";

export interface PoliceTicket {
  ticketId: string;
  targetCharacterId: string;
  officerBadge: string;
  article: string;
  description: string;
  fineCAD: number;
  demeritPoints: number;
  issuedAt: number;
  status: "unpaid" | "paid" | "contested";
}

export class PoliceMdtSystem {
  private activeTickets = new Map<string, PoliceTicket[]>();

  /**
   * Émet un constat d'infraction officiel (Code de la sécurité routière ou Code criminel).
   */
  public issueTicket(
    officerId: string,
    targetId: string,
    article: string,
    description: string,
    fineCAD: number,
    demeritPoints: number
  ): PoliceTicket {
    const ticketId = `SQ-TICK-${Date.now().toString(36).toUpperCase()}`;
    const ticket: PoliceTicket = {
      ticketId,
      targetCharacterId: targetId,
      officerBadge: officerId,
      article,
      description,
      fineCAD,
      demeritPoints,
      issuedAt: Date.now(),
      status: "unpaid",
    };

    const userTickets = this.activeTickets.get(targetId) ?? [];
    userTickets.push(ticket);
    this.activeTickets.set(targetId, userTickets);

    // Notifier le citoyen en jeu
    triggerNotification(targetId, {
      title: "🚨 CONSTAT D'INFRACTION — SÛRETÉ DU QUÉBEC",
      body: `Article : ${article}\nAmende : ${fineCAD}$ | Points : ${demeritPoints}\nConsultez votre dossier au poste.`,
      icon: "📜",
      urgent: true,
    });

    // Mettre à jour le store ou émettre l'événement réseau
    netEmit("police:ticket_issued", { ticket });

    return ticket;
  }

  /**
   * Vérifie le cumul des points d'inaptitude d'un conducteur et suspend son permis si > 15 points.
   */
  public evaluateLicenseStatus(characterId: string, currentPoints: number): { suspended: boolean; days: number } {
    if (currentPoints >= 15) {
      const suspensionDays = 30; // 30 jours de suspension de permis SAAQ
      const suspendUntil = Date.now() + suspensionDays * 86400000;

      useGameStore.getState().setHud({
        licenseSuspendedUntil: suspendUntil,
        notice: "🚫 Permis de conduire suspendu par la Sûreté du Québec pour accumulation de points.",
      } as any);

      return { suspended: true, days: suspensionDays };
    }
    return { suspended: false, days: 0 };
  }
}

export const policeMdt = new PoliceMdtSystem();