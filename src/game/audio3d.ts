/**
 * Son 3D spatial — PannerNode, listener caméra, SFX procéduraux.
 * Déverrouillage AudioContext sur le premier geste (iOS).
 */
import type { PerspectiveCamera } from "three";

type Voice = {
  panner: PannerNode;
  gain: GainNode;
  osc?: OscillatorNode;
  last: number;
};

class SpatialAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private engine: GainNode | null = null;
  private voices = new Map<string, Voice>();
  private unlocked = false;
  private attached = false;
  private footAcc = 0;
  muted = false;
  volume = 0.55;

  attachUnlock() {
    if (this.attached) return;
    this.attached = true;
    const unlock = () => {
      void this.unlock();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void this.unlock();
    });
  }

  async unlock() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.engine = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.engine.gain.value = 0.45;
      this.master.gain.value = this.muted ? 0 : this.volume * this.volume;
      this.sfx.connect(this.master);
      this.engine.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.unlocked = this.ctx.state === "running";
  }

  setMuted(on: boolean) {
    this.muted = on;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(on ? 0 : this.volume * this.volume, this.ctx.currentTime, 0.04);
    }
  }

  setListener(cam: PerspectiveCamera) {
    if (!this.ctx || !this.unlocked) return;
    const l = this.ctx.listener;
    const p = cam.position;
    const e = cam.matrixWorld.elements;
    const fx = -e[8];
    const fy = -e[9];
    const fz = -e[10];
    const ux = e[4];
    const uy = e[5];
    const uz = e[6];
    if (l.positionX) {
      l.positionX.value = p.x;
      l.positionY.value = p.y;
      l.positionZ.value = p.z;
      l.forwardX.value = fx;
      l.forwardY.value = fy;
      l.forwardZ.value = fz;
      l.upX.value = ux;
      l.upY.value = uy;
      l.upZ.value = uz;
    } else {
      const old = l as AudioListener & { setPosition?: (x: number, y: number, z: number) => void; setOrientation?: (...n: number[]) => void };
      old.setPosition?.(p.x, p.y, p.z);
      old.setOrientation?.(fx, fy, fz, ux, uy, uz);
    }
  }

  tickEngine(driving: boolean, speed: number, x: number, y: number, z: number) {
    if (!this.ctx || !this.engine || !this.unlocked) return;
    const id = "engine";
    const audible = driving && Math.abs(speed) > 0.4;
    if (!audible) {
      this.fadeOut(id);
      return;
    }
    const v = this.ensure(id, this.engine, x, y, z, 6, 48);
    const rpm = 48 + Math.min(90, Math.abs(speed) * 3.2);
    if (v.osc) v.osc.frequency.setTargetAtTime(rpm, this.ctx.currentTime, 0.08);
    v.gain.gain.setTargetAtTime(0.04 + Math.min(0.12, Math.abs(speed) * 0.004), this.ctx.currentTime, 0.05);
  }

  tickSiren(on: boolean, x: number, y: number, z: number) {
    if (!this.ctx || !this.sfx || !this.unlocked) return;
    const id = "siren";
    if (!on) {
      this.fadeOut(id);
      return;
    }
    const v = this.ensure(id, this.sfx, x, y, z, 8, 90);
    const t = this.ctx.currentTime;
    const hi = (Math.floor(t * 2.4) % 2) === 0;
    if (v.osc) v.osc.frequency.setTargetAtTime(hi ? 880 : 620, t, 0.04);
    v.gain.gain.setTargetAtTime(0.09, t, 0.06);
  }

  tickWind(speedKmh: number, weather: string) {
    if (!this.ctx || !this.sfx || !this.unlocked) return;
    const id = "wind";
    const howl =
      weather === "storm" || weather === "snow" || weather === "blizzard"
        ? 0.055
        : weather === "rain"
          ? 0.03
          : 0.012;
    const rush = Math.min(0.07, speedKmh / 900);
    const v = this.ensure(id, this.sfx, 0, 0, 0, 4, 12, false);
    v.gain.gain.setTargetAtTime(howl + rush, this.ctx.currentTime, 0.2);
  }

  footstep(dt: number, walking: boolean, x: number, y: number, z: number) {
    if (!walking) {
      this.footAcc = 0;
      return;
    }
    this.footAcc += dt;
    if (this.footAcc < 0.38) return;
    this.footAcc = 0;
    this.blip(x, y, z, 90 + Math.random() * 40, 0.045, 0.09);
  }

  villageHum(x: number, y: number, z: number, density: number) {
    if (!this.ctx || !this.sfx || !this.unlocked || density < 0.12) {
      this.fadeOut("village");
      return;
    }
    const v = this.ensure("village", this.sfx, x, y, z, 12, 70);
    v.gain.gain.setTargetAtTime(0.018 * density, this.ctx.currentTime, 0.3);
  }

  dispose() {
    for (const v of this.voices.values()) {
      try {
        v.osc?.stop();
      } catch {
        /* already stopped */
      }
    }
    this.voices.clear();
    void this.ctx?.close();
    this.ctx = null;
  }

  private ensure(id: string, bus: GainNode, x: number, y: number, z: number, ref: number, max: number, spatial = true): Voice {
    const ctx = this.ctx!;
    let v = this.voices.get(id);
    if (!v) {
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      const panner = ctx.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = ref;
      panner.maxDistance = max;
      panner.rolloffFactor = 1.15;
      const osc = ctx.createOscillator();
      osc.type = id === "siren" ? "square" : id === "engine" ? "sawtooth" : "triangle";
      osc.frequency.value = id === "engine" ? 55 : id === "siren" ? 740 : 110;
      osc.connect(gain);
      if (spatial) {
        gain.connect(panner);
        panner.connect(bus);
      } else {
        gain.connect(bus);
      }
      osc.start();
      v = { panner, gain, osc, last: 0 };
      this.voices.set(id, v);
    }
    if (spatial && v.panner.positionX) {
      v.panner.positionX.value = x;
      v.panner.positionY.value = y;
      v.panner.positionZ.value = z;
    }
    v.last = ctx.currentTime;
    return v;
  }

  private fadeOut(id: string) {
    const v = this.voices.get(id);
    if (!v || !this.ctx) return;
    v.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
  }

  private blip(x: number, y: number, z: number, freq: number, vol: number, dur: number) {
    if (!this.ctx || !this.sfx || !this.unlocked) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const p = this.ctx.createPanner();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.45), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    p.panningModel = "equalpower";
    p.refDistance = 2;
    p.maxDistance = 28;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    }
    osc.connect(g);
    g.connect(p);
    p.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}

export const spatialAudio = new SpatialAudio();

export function playSound(name: string, ...args: any[]): void {}
