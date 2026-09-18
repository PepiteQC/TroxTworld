/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SYSTÈMES DE BLANCHIMENT D'ARGENT ET COMMERCES ÉCRANS — PORTNEUF RP
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { db } from "../db";
import { characters, properties, transactions } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { triggerNotification } from "../phone";

export interface FrontBusiness {
  id: string;
  name: string;
  ownerId: string;
  location: string;
  launderingRate: number; // Pourcentage converti (ex: 75% reversé en argent propre)
  maxCapacityPerHour: number;
  currentDirtyStored: number;
}

export class MoneyLaunderingSystem {
  private frontBusinesses = new Map<string, FrontBusiness>();

  /**
   * Enregistre un commerce écran acheté par un joueur (ex: un petit dépanneur ou une pourvoirie).
   */
  public registerFrontBusiness(id: string, name: string, ownerId: string, location: string): FrontBusiness {
    const business: FrontBusiness = {
      id,
      name,
      ownerId,
      location,
      launderingRate: 0.70, // 30% de commission de blanchiment / taxes occultes
      maxCapacityPerHour: 5000,
      currentDirtyStored: 0,
    };
    this.frontBusinesses.set(id, business);
    return business;
  }

  /**
   * Dépose de l'argent sale provenant des planques ou des braquages dans le commerce écran.
   */
  public depositDirtyMoney(businessId: string, amount: number): { ok: boolean; message: string } {
    const biz = this.frontBusinesses.get(businessId);
    if (!biz) return { ok: false, message: "Commerce écran introuvable." };

    if (biz.currentDirtyStored + amount > biz.maxCapacityPerHour * 3) {
      return { ok: false, message: "Capacité maximale de blanchiment atteinte pour ce commerce. Attendez que le cycle s'écoule." };
    }

    biz.currentDirtyStored += amount;
    return { ok: true, message: `${amount}$ d'argent sale injecté dans les livres comptables de ${biz.name}.` };
  }

  /**
   * Exécute le cycle de blanchiment (appelé par le tick global du serveur).
   */
  public async processLaunderingTick() {
    for (const [id, biz] of this.frontBusinesses.entries()) {
      if (biz.currentDirtyStored <= 0) continue;

      const processedAmount = Math.min(biz.currentDirtyStored, biz.maxCapacityPerHour / 12); // Traitement progressif
      const cleanOutput = Math.round(processedAmount * biz.launderingRate);
      
      biz.currentDirtyStored -= processedAmount;

      // Créditer l'argent propre sur le compte bancaire du propriétaire en base de données
      try {
        await db.update(characters)
          .set({ 
            bank: sql`bank + ${cleanOutput}`,
            dirtyMoney: sql`GREATEST(0, dirty_money - ${processedAmount})`
          })
          .where(eq(characters.id, biz.ownerId));

        triggerNotification(biz.ownerId, {
          title: "💼 Rapport comptable — " + biz.name,
          body: `Blanchiment réussi : ${cleanOutput}$ propres versés à la banque (${Math.round(biz.launderingRate * 100)}% de taux).`,
          icon: "📈",
        });
      } catch (err) {
        console.error(`Erreur de blanchiment pour le commerce ${id}:`, err);
      }
    }
  }
}

export const moneyLaundering = new MoneyLaunderingSystem();