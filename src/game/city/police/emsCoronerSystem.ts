/**
 * ═══════════════════════════════════════════════════════════════════
 *  EMS & CORONER FORENSIC MEDICAL SYSTEM — PRO EDITION v2.0
 * ═══════════════════════════════════════════════════════════════════
 * Simulation avancée des secours, états cliniques, thanatologie,
 * et processus d'enquête criminelle / accidentelle pour TroxTWorld.
 */

import * as THREE from "three";
import { netEmit } from "./net";

export interface DecoyBody {
  id: string;
  victimName: string;
  timeOfDeath: number;
  causeOfDeath: string;
  isBagged: boolean;
  position: THREE.Vector3;
  inventory: string[];
  evidenceTagged: boolean;
}

export class EMSCoronerSystem {
  private static instance: EMSCoronerSystem;
  private bodies: Map<string, DecoyBody> = new Map();
  private coronerUnitActive: boolean = false;

  private constructor() {
    console.log("🚑 [EMS & Coroner System] Initialisé avec succès !");
  }

  public static getInstance(): EMSCoronerSystem {
    if (!EMSCoronerSystem.instance) {
      EMSCoronerSystem.instance = new EMSCoronerSystem();
    }
    return EMSCoronerSystem.instance;
  }

  /**
   * Enregistre un décès clinique et génère un corps à analyser
   */
  public reportDeceased(victimName: string, cause: string, pos: THREE.Vector3, belongings: string[]): DecoyBody {
    const bodyId = `corpse_${Date.now()}`;
    const corpse: DecoyBody = {
      id: bodyId,
      victimName,
      timeOfDeath: Date.now(),
      causeOfDeath: cause,
      isBagged: false,
      position: pos.clone(),
      inventory: belongings,
      evidenceTagged: false
    };
    
    this.bodies.set(bodyId, corpse);
    netEmit("coroner:new_body", corpse);
    return corpse;
  }

  /**
   * EMS : Essaye de réanimer un joueur à l'aide d'un défibrillateur
   */
  public attemptResuscitation(bodyId: string, medicalLevel: number): boolean {
    const body = this.bodies.get(bodyId);
    if (!body) return false;

    // Si décédé depuis plus de 4 minutes réelles, impossible de réanimer
    const minsSinceDeath = (Date.now() - body.timeOfDeath) / 1000 / 60;
    if (minsSinceDeath > 4) {
      console.log("❌ Le cerveau n'est plus irrigué. Réanimation impossible.");
      return false;
    }

    const successChance = 0.3 + (medicalLevel * 0.1);
    const success = Math.random() < successChance;

    if (success) {
      this.bodies.delete(bodyId);
      netEmit("coroner:revived", { id: bodyId, victimName: body.victimName });
    }
    return success;
  }

  /**
   * Coroner : Place la dépouille dans un sac mortuaire
   */
  public bagBody(bodyId: string): boolean {
    const body = this.bodies.get(bodyId);
    if (!body) return false;
    body.isBagged = true;
    netEmit("coroner:body_bagged", { id: bodyId });
    return true;
  }

  /**
   * Coroner : Prélève des indices pour l'enquête du Coroner (Autopsie)
   */
  public performAutopsy(bodyId: string): { cause: string; toxScreen: string; verdict: string } {
    const body = this.bodies.get(bodyId);
    if (!body) throw new Error("Corps introuvable pour l'autopsie");

    const causes = ["Traumatisme crânien par projectile", "Choc cardiogénique suite à une chute", "Inhalation de monoxyde", "Surdose de stimulants"];
    const detectedCause = body.causeOfDeath || causes[Math.floor(Math.random() * causes.length)];

    return {
      cause: detectedCause,
      toxScreen: Math.random() > 0.5 ? "Alcoolémie élevée, traces de THC" : "Négatif pour tous narcotiques",
      verdict: "Dossier médico-légal transmis à la Sûreté du Québec."
    };
  }

  public getBodies(): DecoyBody[] {
    return Array.from(this.bodies.values());
  }
}

export const emsCoroner = EMSCoronerSystem.getInstance();