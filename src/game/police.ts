export type CrimeKind =
  | "speeding_minor"
  | "speeding_excessive"
  | "traffic_evasion"
  | "hit_and_run"
  | "officer_assault"
  | "poaching"
  | "theft"
  | "robbery"
  | "carjacking"
  | "drug_dealing"
  | "cultivation"
  | "arme_prohibee";

export interface CsrCitation {
  code: string;
  article: string;
  description: string;
  fineAmount: number;
  demeritPoints: number;
}

export const CSR_CITATIONS: CsrCitation[] = [
  {
    code: "CSR-328-1",
    article: "Art. 328 CSR",
    description: "Excès de vitesse en zone urbaine (+15 à +25 km/h)",
    fineAmount: 175,
    demeritPoints: 2,
  },
  {
    code: "CSR-328-2",
    article: "Art. 328 CSR",
    description: "Excès de vitesse modéré (+26 à +40 km/h)",
    fineAmount: 260,
    demeritPoints: 3,
  },
  {
    code: "CSR-329-GEV",
    article: "Art. 329 CSR",
    description: "Grand excès de vitesse (+50 km/h) — remorquage",
    fineAmount: 650,
    demeritPoints: 6,
  },
  {
    code: "CSR-327",
    article: "Art. 327 CSR",
    description: "Action imprudente (course / dérapage)",
    fineAmount: 320,
    demeritPoints: 4,
  },
  {
    code: "CSR-422",
    article: "Art. 422 CSR",
    description: "Refus d'obtempérer aux gyrophares",
    fineAmount: 500,
    demeritPoints: 4,
  },
  {
    code: "LCF-30",
    article: "Art. 30 LCF",
    description: "Chasse sans permis — Loi sur la conservation de la faune",
    fineAmount: 425,
    demeritPoints: 0,
  },
  {
    code: "LEC-12",
    article: "Art. 12 LEC",
    description: "Culture de cannabis — interdite au Québec",
    fineAmount: 750,
    demeritPoints: 0,
  },
];

export interface WantedState {
  stars: number;
  reason: string;
  bounty: number;
  inPursuit: boolean;
  evading: boolean;
  evasion: number;
  lastCrime: string;
}

export interface RadioLog {
  id: string;
  code: string;
  text: string;
  at: number;
}

export interface TicketRecord {
  article: string;
  description: string;
  fine: number;
  at: number;
  kind: "ticket" | "arrest";
}

export interface CitationNotice {
  kind: "ticket" | "arrest";
  article: string;
  description: string;
  fine: number;
  points: number;
  message: string;
}

function citationForExcess(excess: number): CsrCitation {
  if (excess >= 50) return CSR_CITATIONS[2]!;
  if (excess >= 26) return CSR_CITATIONS[1]!;
  return CSR_CITATIONS[0]!;
}

class PoliceSiren {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private acc = 0;
  private hi = false;
  active = false;

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(this.ctx.destination);
    this.osc = this.ctx.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.value = 740;
    this.osc.connect(this.gain);
    this.osc.start();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setActive(on: boolean) {
    this.active = on;
    if (on) void this.ensure();
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.08);
    }
  }

  tick(dt: number) {
    if (!this.active || !this.osc || !this.ctx) return;
    this.acc += dt;
    if (this.acc < 0.32) return;
    this.acc = 0;
    this.hi = !this.hi;
    this.osc.frequency.setTargetAtTime(this.hi ? 980 : 740, this.ctx.currentTime, 0.04);
  }

  dispose() {
    this.setActive(false);
    try {
      this.osc?.stop();
      this.osc?.disconnect();
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.osc = null;
    this.gain = null;
    this.ctx = null;
  }
}

class PoliceDesk {
  stars = 0;
  reason = "";
  bounty = 0;
  inPursuit = false;
  evading = false;
  evasion = 20;
  lastCrime = "";
  log: RadioLog[] = [];
  tickets: TicketRecord[] = [];
  lastReportAt = -999;
  lastEvasionBump = -999;
  unitsChasing = 0;
  siren = new PoliceSiren();

  getState(): WantedState {
    return {
      stars: this.stars,
      reason: this.reason,
      bounty: this.bounty,
      inPursuit: this.inPursuit,
      evading: this.evading,
      evasion: this.evasion,
      lastCrime: this.lastCrime,
    };
  }

  dispatchLine(): string | null {
    return this.log[0] ? `${this.log[0].code} · ${this.log[0].text}` : null;
  }

  chaseCount(): number {
    if (this.stars <= 0) return 0;
    return Math.min(8, 1 + this.stars);
  }

  report(kind: CrimeKind, elapsed: number): { stars: number; citation?: CsrCitation } | null {
    if (elapsed - this.lastReportAt < 3.2 && kind !== "officer_assault" && kind !== "hit_and_run" && kind !== "poaching") {
      return null;
    }
    this.lastReportAt = elapsed;

    let add = 1;
    let reason = "Infraction au Code de la sécurité routière";
    let bounty = 450;
    let citation: CsrCitation | undefined;

    switch (kind) {
      case "speeding_minor":
        add = this.stars >= 1 ? 0 : 1;
        reason = "Excès de vitesse modéré";
        bounty = 450;
        citation = CSR_CITATIONS[0];
        break;
      case "speeding_excessive":
        add = this.stars >= 2 ? 1 : 2;
        reason = "Grand excès de vitesse en zone habitée";
        bounty = 1200;
        citation = CSR_CITATIONS[2];
        break;
      case "traffic_evasion":
        add = 2;
        reason = "Refus d'obtempérer — fuite";
        bounty = 1800;
        citation = CSR_CITATIONS[4];
        break;
      case "hit_and_run":
        add = 3;
        reason = "Délit de fuite";
        bounty = 2800;
        break;
      case "officer_assault":
        add = 2;
        reason = "Collision avec un véhicule de la SQ";
        bounty = 3500;
        break;
      case "poaching":
        add = 2;
        reason = "Chasse sans permis MFFP";
        bounty = 1600;
        citation = CSR_CITATIONS[5];
        break;
      case "theft":
        add = 1;
        reason = "Vol · Code criminel";
        bounty = 600;
        break;
      case "robbery":
        add = 2;
        reason = "Vol qualifié · rang";
        bounty = 1400;
        break;
      case "carjacking":
        add = 3;
        reason = "Vol de véhicule";
        bounty = 2200;
        break;
      case "drug_dealing":
        add = 2;
        reason = "Trafic · substances";
        bounty = 1600;
        break;
      case "cultivation":
        add = 2;
        reason = "Culture illégale de cannabis · Loi encadrant le cannabis";
        bounty = 1800;
        citation = CSR_CITATIONS[6];
        break;
      case "arme_prohibee":
        add = 2;
        reason = "Port d'arme sans permis PAL";
        bounty = 2400;
        break;
    }

    if (add <= 0 && this.stars > 0) return { stars: this.stars, citation };
    const next = Math.min(5, Math.max(this.stars, this.stars + add));
    this.setStars(next, reason, bounty);
    this.lastCrime = kind;
    return { stars: this.stars, citation };
  }

  reportSpeeding(excess: number, elapsed: number) {
    const kind: CrimeKind = excess >= 50 ? "speeding_excessive" : "speeding_minor";
    const result = this.report(kind, elapsed);
    if (!result) return null;
    return { ...result, citation: citationForExcess(excess) };
  }

  setStars(n: number, reason?: string, bounty?: number) {
    const clamped = Math.min(5, Math.max(0, Math.round(n)));
    this.stars = clamped;
    if (clamped <= 0) {
      this.clear("Avis levé");
      return;
    }
    if (reason) this.reason = reason;
    this.bounty = bounty ?? clamped * 1500;
    this.inPursuit = true;
    this.evading = false;
    this.evasion = 18;
    this.pushLog(
      clamped >= 3 ? "10-80" : "10-50",
      `Suspect ${clamped}★ · ${this.reason} · prime ${this.bounty}\u00a0$`,
    );
  }

  update(dt: number, nearestPolice: number, playerSpeedKmh: number, elapsed: number) {
    this.siren.tick(dt);
    if (this.stars <= 0) {
      this.unitsChasing = 0;
      this.siren.setActive(false);
      return this.getState();
    }

    this.siren.setActive(nearestPolice < 90);

    if (nearestPolice < 42) {
      this.evading = false;
      this.inPursuit = true;
      this.evasion = 18;
      if (playerSpeedKmh > 110 && elapsed - this.lastEvasionBump > 6) {
        this.lastEvasionBump = elapsed;
        this.report("traffic_evasion", elapsed);
      }
    } else {
      this.evading = true;
      this.evasion -= dt;
      if (this.evasion <= 0) {
        this.stars = Math.max(0, this.stars - 1);
        this.bounty = this.stars * 1500;
        this.evasion = 14;
        if (this.stars === 0) {
          this.clear("Évasion réussie — poursuite abandonnée");
        } else {
          this.pushLog("10-7", `Périmètre élargi · étoiles réduites à ${this.stars}★`);
        }
      }
    }
    return this.getState();
  }

  pullOver(): CitationNotice {
    const citation =
      this.lastCrime === "poaching"
        ? CSR_CITATIONS[5]!
        : this.lastCrime === "cultivation"
          ? CSR_CITATIONS[6]!
          : this.lastCrime === "traffic_evasion"
            ? CSR_CITATIONS[4]!
            : CSR_CITATIONS[this.stars >= 3 ? 2 : 1]!;
    const fine = citation.fineAmount + this.stars * 80;
    const notice: CitationNotice = {
      kind: "ticket",
      article: citation.article,
      description: citation.description,
      fine,
      points: citation.demeritPoints,
      message: `Constat SQ · ${citation.article} · ${fine}\u00a0$`,
    };
    this.tickets.unshift({
      article: citation.article,
      description: citation.description,
      fine,
      at: Date.now(),
      kind: "ticket",
    });
    if (this.tickets.length > 16) this.tickets.pop();
    this.pushLog("10-4", `Code 4 · ${notice.message}`);
    this.clear("Contrôle terminé");
    return notice;
  }

  arrest(): CitationNotice {
    const citation =
      this.lastCrime === "poaching"
        ? CSR_CITATIONS[5]!
        : this.lastCrime === "cultivation"
          ? CSR_CITATIONS[6]!
          : CSR_CITATIONS[2]!;
    const fine = 850 + this.stars * 220 + Math.round(this.bounty * 0.15);
    const notice: CitationNotice = {
      kind: "arrest",
      article: citation.article,
      description: "Mise sous arrêt — cellule du poste SQ Portneuf",
      fine,
      points: 6,
      message: `Arrestation SQ · ${fine}\u00a0$ · relâchement au poste`,
    };
    this.tickets.unshift({
      article: "Mise sous arrêt",
      description: notice.description,
      fine,
      at: Date.now(),
      kind: "arrest",
    });
    if (this.tickets.length > 16) this.tickets.pop();
    this.pushLog("10-15", `Suspect en cellule · Poste SQ Portneuf · ${fine}\u00a0$`);
    this.clear("Code 4 · suspect écroué");
    return notice;
  }

  clear(reason = "Recherche levée") {
    this.stars = 0;
    this.reason = "";
    this.bounty = 0;
    this.inPursuit = false;
    this.evading = false;
    this.evasion = 20;
    this.unitsChasing = 0;
    this.siren.setActive(false);
    this.pushLog("10-4", reason);
  }

  private pushLog(code: string, text: string) {
    this.log.unshift({ id: `${Date.now()}-${code}`, code, text, at: Date.now() });
    if (this.log.length > 12) this.log.pop();
  }

  dispose() {
    this.siren.dispose();
  }
}

export const police = new PoliceDesk();
