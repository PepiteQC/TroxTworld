/**
 * C:\TroxTWorld\src\game\huntingFishing.ts
 * Système de Chasse & Pêche MFFP — Faune Laurentienne et Fleuve Saint-Laurent.
 */
import { useGameStore } from "./store";
import { police } from "./police";

export interface AnimalEntity {
  id: string;
  species: "orignal" | "chevreuil" | "ours_noir" | "loup" | "truite" | "dore";
  health: number;
  weightKg: number;
  isDead: boolean;
  x: number;
  z: number;
}

export class HuntingFishingSystem {
  /**
   * Tirer sur du gibier et vérifier la légalité de la chasse.
   */
  public huntAnimal(animal: AnimalEntity, weaponId: string): { ok: boolean; message: string } {
    const store = useGameStore.getState();
    const hasPal = store.licenses.includes("pal");
    const hasHuntingPermit = store.licenses.includes("chasse");

    // BRACONNAGE : Alerte SQ immédiate si pas de permis valide
    if (!hasPal || !hasHuntingPermit) {
      police.reportCrime("poaching", `${store.zone} (Braconnage illégal d'orignal)`);
      store.addChat("Sûreté du Québec", "Alerte MFFP : Détonation illégale signalée en forêt.", "system");
    }

    animal.health = 0;
    animal.isDead = true;

    return {
      ok: true,
      message: `Gibier abattu (${animal.species}) · Approchez-vous avec un couteau de chasse pour dépecer.`,
    };
  }

  /**
   * Dépecer une carcasse abattue.
   */
  public harvestAnimal(animal: AnimalEntity): { ok: boolean; message: string } {
    const store = useGameStore.getState();
    if ((store.inventory.couteau_chasse ?? 0) < 1 && (store.inventory.machette ?? 0) < 1) {
      return { ok: false, message: "Vous avez besoin d'un couteau de chasse pour dépecer la bête." };
    }

    if (animal.species === "orignal") {
      store.addItem("venaison", 3);
      store.addItem("fourrure", 2);
    } else if (animal.species === "chevreuil") {
      store.addItem("venaison", 1);
      store.addItem("fourrure", 1);
    }

    return { ok: true, message: "Dépeçage terminé · Venaison et fourrures ajoutées au sac." };
  }

  /**
   * Pêche sur glace (lac gelé) en hiver.
   */
  public iceFishing(): { ok: boolean; catchName?: string; message: string } {
    const store = useGameStore.getState();
    if (store.season !== "hiver") {
      return { ok: false, message: "La pêche sur glace est uniquement possible en hiver sur les lacs gelés." };
    }

    const catches = ["Truite mouchetée", "Doré jaune", "Achigan"];
    const luckyCatch = catches[Math.floor(Math.random() * catches.length)];

    store.addItem("poisson_frais", 1);
    store.surv.energy = Math.max(0, store.surv.energy - 5);

    return { ok: true, catchName: luckyCatch, message: `Prise réussie ! Un beau ${luckyCatch} sorti du trou de glace.` };
  }
}

export const huntingFishingSystem = new HuntingFishingSystem();