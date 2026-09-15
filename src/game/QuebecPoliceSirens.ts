/**
 * ═══════════════════════════════════════════════════════════════════
 * 🔊 SYNTHÉTISEUR AUDIO DE SIRÈNES POLICE QUÉBEC (Web Audio API)
 * ═══════════════════════════════════════════════════════════════════
 */

export type QuebecSirenMode = "wail" | "yelp" | "priority" | "hilo" | "off";

class QuebecPoliceSirensManager {
  private audioCtx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: any = null;
  private activeMode: QuebecSirenMode = "off";

  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  public toggleSiren(active: boolean, mode: QuebecSirenMode = "wail") {
    this.stop();
    if (!active || mode === "off") {
      this.activeMode = "off";
      return;
    }

    this.initAudio();
    this.activeMode = mode;

    const ctx = this.audioCtx!;
    const now = ctx.currentTime;

    this.osc1 = ctx.createOscillator();
    this.gainNode = ctx.createGain();

    this.osc1.type = "sine";
    this.gainNode.gain.setValueAtTime(0.08, now);

    this.osc1.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);
    this.osc1.start(now);

    let cycle = 0;
    if (mode === "wail") {
      // Modulation lente (Chasse-poursuite classique)
      this.intervalId = setInterval(() => {
        if (!this.osc1 || !this.audioCtx) return;
        const t = this.audioCtx.currentTime;
        const freq = 450 + Math.sin(t * 1.8) * 220;
        this.osc1.frequency.setValueAtTime(freq, t);
      }, 16);
    } else if (mode === "yelp") {
      // Modulation rapide (Intersections)
      this.intervalId = setInterval(() => {
        if (!this.osc1 || !this.audioCtx) return;
        const t = this.audioCtx.currentTime;
        const freq = 500 + Math.sin(t * 8) * 280;
        this.osc1.frequency.setValueAtTime(freq, t);
      }, 16);
    } else if (mode === "priority") {
      // Piercing hyper-rapide (Urgence absolue / Code 3)
      this.intervalId = setInterval(() => {
        if (!this.osc1 || !this.audioCtx) return;
        const t = this.audioCtx.currentTime;
        const freq = 650 + Math.sin(t * 16) * 350;
        this.osc1.frequency.setValueAtTime(freq, t);
      }, 16);
    } else if (mode === "hilo") {
      // Alternance bicolore
      this.intervalId = setInterval(() => {
        if (!this.osc1 || !this.audioCtx) return;
        const t = this.audioCtx.currentTime;
        const freq = cycle % 2 === 0 ? 700 : 500;
        this.osc1.frequency.setValueAtTime(freq, t);
        cycle++;
      }, 400);
    }
  }

  public setMode(mode: QuebecSirenMode) {
    if (this.activeMode !== "off") {
      this.toggleSiren(true, mode);
    }
  }

  public triggerAirhorn(durationMs = 450) {
    this.initAudio();
    const ctx = this.audioCtx!;
    const now = ctx.currentTime;

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = "sawtooth";
    o2.type = "square";
    o1.frequency.setValueAtTime(130, now);
    o2.frequency.setValueAtTime(160, now);

    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    o1.start(now);
    o2.start(now);
    o1.stop(now + durationMs / 1000);
    o2.stop(now + durationMs / 1000);
  }

  public playMegaphoneAnnouncement(type: "pull_over" | "step_out" | "sq_warning") {
    // Joue un son d'effet mégaphone lo-fi
    console.log(`🔊 [Mégaphone SQ] Appel : ${type}`);
    this.triggerAirhorn(150);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.osc1) {
      try {
        this.osc1.stop();
        this.osc1.disconnect();
      } catch {}
      this.osc1 = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.activeMode = "off";
  }
}

export const QuebecPoliceSirens = new QuebecPoliceSirensManager();