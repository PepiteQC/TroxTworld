/**
 * Third Eye — directeur d'événements dynamiques du comté.
 */
import { A40_EXITS } from "./worlddata";

export type EventCategory = "meteo" | "infrastructures" | "urgence" | "economie" | "social";
export type EventSeverity = "mineur" | "majeur" | "catastrophe";

export interface DynamicQuebecEvent {
  id: string;
  title: string;
  category: EventCategory;
  severity: EventSeverity;
  locationName: string;
  coordinates: [number, number, number];
  description: string;
  active: boolean;
  startedAt: number;
  durationMinutes: number;
  impacts: string[];
}

const X254 = A40_EXITS[1]!.x;
const X261 = A40_EXITS[3]!.x;

function blizzardTemplate(): Omit<DynamicQuebecEvent, "id" | "startedAt" | "active"> {
  return {
    title: "Tempête de neige et poudrerie majeure sur la Route 138",
    category: "meteo",
    severity: "majeur",
    locationName: "Route 138 entre Portneuf et Deschambault",
    coordinates: [(X254 + X261) / 2, 2, 6],
    description: "Vents du nord-est à 75 km/h, visibilité sous 50 m. Sorties de route multiples.",
    durationMinutes: 90,
    impacts: [
      "Vitesse maximale recommandée : 40 km/h",
      "Priorité maximale pour les chasse-neige MTQ",
      "Augmentation des primes de remorquage",
    ],
  };
}

function outageTemplate(): Omit<DynamicQuebecEvent, "id" | "startedAt" | "active"> {
  return {
    title: "Panne Hydro-Québec — câbles givrés",
    category: "infrastructures",
    severity: "mineur",
    locationName: "Bourg patrimonial de Saint-Casimir",
    coordinates: [-900, 2, -280],
    description: "Ligne de distribution 25 kV rompue par une branche alourdie de verglas.",
    durationMinutes: 45,
    impacts: [
      "Extinction de l'éclairage public et des pompes",
      "Intervention des monteurs de ligne requise",
    ],
  };
}

export class DynamicEventsService {
  private static instance: DynamicEventsService;
  private activeEvents: DynamicQuebecEvent[] = [];

  private constructor() {}

  public static getInstance(): DynamicEventsService {
    if (!DynamicEventsService.instance) DynamicEventsService.instance = new DynamicEventsService();
    return DynamicEventsService.instance;
  }

  public getActiveEvents(): DynamicQuebecEvent[] {
    return this.activeEvents.filter((e) => e.active);
  }

  public getAll(): DynamicQuebecEvent[] {
    return this.activeEvents.slice();
  }

  public triggerEvent(event: Omit<DynamicQuebecEvent, "id" | "startedAt" | "active">): DynamicQuebecEvent {
    const newEvent: DynamicQuebecEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      startedAt: Date.now(),
      active: true,
    };
    this.activeEvents.unshift(newEvent);
    if (this.activeEvents.length > 12) this.activeEvents.length = 12;
    return newEvent;
  }

  public triggerBlizzard(): DynamicQuebecEvent {
    const existing = this.activeEvents.find((e) => e.category === "meteo" && e.active);
    if (existing) {
      existing.startedAt = Date.now();
      existing.durationMinutes = 90;
      existing.title = blizzardTemplate().title;
      return existing;
    }
    return this.triggerEvent(blizzardTemplate());
  }

  public triggerOutage(): DynamicQuebecEvent {
    const existing = this.activeEvents.find((e) => e.id.includes("panne") && e.active);
    if (existing) {
      existing.startedAt = Date.now();
      return existing;
    }
    return this.triggerEvent(outageTemplate());
  }

  public resolveEvent(eventId: string): boolean {
    const e = this.activeEvents.find((x) => x.id === eventId);
    if (!e) return false;
    e.active = false;
    return true;
  }

  public resolveCategory(cat: EventCategory): number {
    let n = 0;
    for (const e of this.activeEvents) {
      if (e.category === cat && e.active) {
        e.active = false;
        n++;
      }
    }
    return n;
  }

  public clearAll(): void {
    for (const e of this.activeEvents) e.active = false;
  }

  public tick(): DynamicQuebecEvent[] {
    const now = Date.now();
    for (const e of this.activeEvents) {
      if (!e.active) continue;
      if (now - e.startedAt > e.durationMinutes * 60_000) e.active = false;
    }
    return this.getActiveEvents();
  }

  public banner(): { title: string; severity: EventSeverity; locationName: string } | null {
    const live = this.getActiveEvents();
    if (!live.length) return null;
    const rank: Record<EventSeverity, number> = { catastrophe: 3, majeur: 2, mineur: 1 };
    live.sort((a, b) => rank[b.severity] - rank[a.severity]);
    const top = live[0]!;
    return { title: top.title, severity: top.severity, locationName: top.locationName };
  }
}

export const dynamicEventsService = DynamicEventsService.getInstance();
