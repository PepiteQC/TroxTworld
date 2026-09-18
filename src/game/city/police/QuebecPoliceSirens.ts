/**
 * ═══════════════════════════════════════════════════════════════════
 * 🔊 SYNTHÉTISEUR AUDIO DE SIRÈNES POLICE QUÉBEC (v2.5)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.5 :
 *  - Fix des "clics" audio avec setTargetAtTime (transitions fluides).
 *  - Nettoyage mémoire (Garbage Collection) des oscillateurs Airhorn.
 *  - Anti-spam du mégaphone (Cancel prioritaire).
 *  - Support multi-véhicules avec IDs uniques & PannerNode 3D exact.
 *  - Effet Doppler réaliste sécurisé (Anti-NaN).
 *  - Réverbération urbaine (Convolver) pour un son qui rebondit.
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";

export type QuebecSirenMode = "wail" | "yelp" | "priority" | "hilo" | "airhorn" | "off";
export type MegaphoneMessage = "pull_over" | "step_out" | "sq_warning" | "custom";

export interface SirenConfig {
  vehicleId: string;
  position: THREE.Vector3;
  mode: QuebecSirenMode;
  volume: number; // 0-1
  enabled: boolean;
}

export interface SirenEvent {
  type: "mode_changed" | "started" | "stopped" | "airhorn" | "megaphone";
  vehicleId: string;
  mode?: QuebecSirenMode;
  message?: string;
}

interface SirenInstance {
  vehicleId: string;
  config: SirenConfig;
  
  // Audio nodes
  osc1: OscillatorNode | null;
  osc2: OscillatorNode | null;
  gainNode: GainNode | null;
  pannerNode: PannerNode | null;
  filterNode: BiquadFilterNode | null;
  
  // State
  activeMode: QuebecSirenMode;
  animationFrameId: number | null;
  cycle: number;
  lastUpdateTime: number;
  targetFrequency: number;
  currentFrequency: number;
  
  // Position tracking
  lastPosition: THREE.Vector3;
  velocity: THREE.Vector3;
}

class QuebecPoliceSirensManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  
  private instances = new Map<string, SirenInstance>();
  private listener: AudioListener | null = null;
  
  private duckingActive = false;
  private duckingAmount = 0.3; // Baisse de 70% le volume musique environnementale
  
  private eventListeners = new Set<(event: SirenEvent) => void>();
  
  constructor() {
    if (typeof window !== "undefined") {
      this.listener = window.AudioContext ? new AudioContext().listener : null;
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION & UNLOCK
  // ═══════════════════════════════════════════════════════════
  
  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      
      // Master gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioCtx.destination);
      
      // Reverb setup (Création de l'écho urbain)
      this.dryGain = this.audioCtx.createGain();
      this.dryGain.gain.value = 0.75;
      this.dryGain.connect(this.masterGain);
      
      this.reverbGain = this.audioCtx.createGain();
      this.reverbGain.gain.value = 0.35;
      this.reverbGain.connect(this.masterGain);
      
      this.convolver = this.audioCtx.createConvolver();
      this.convolver.buffer = this.createReverbImpulse(2.0, 3.0);
      this.convolver.connect(this.reverbGain);
      
      // Setup listener position (Caméra du joueur local)
      if (this.audioCtx.listener.positionX) {
        this.audioCtx.listener.positionX.value = 0;
        this.audioCtx.listener.positionY.value = 1.7; // Hauteur des oreilles standard
        this.audioCtx.listener.positionZ.value = 0;
        this.audioCtx.listener.forwardX.value = 0;
        this.audioCtx.listener.forwardY.value = 0;
        this.audioCtx.listener.forwardZ.value = -1;
        this.audioCtx.listener.upX.value = 0;
        this.audioCtx.listener.upY.value = 1;
        this.audioCtx.listener.upZ.value = 0;
      }
    }
    
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  /** Permet de débloquer le contexte audio suite à un clic utilisateur */
  public unlock() {
    this.initAudio();
  }
  
  private createReverbImpulse(duration: number, decay: number): AudioBuffer {
    const ctx = this.audioCtx!;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Bruit blanc atténué de façon exponentielle pour simuler les façades d'immeubles
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }
  
  // ═══════════════════════════════════════════════════════════
  // SIREN CONTROL
  // ═══════════════════════════════════════════════════════════
  
  public startSiren(vehicleId: string, mode: QuebecSirenMode = "wail", position?: THREE.Vector3) {
    if (mode === "off") {
      this.stopSiren(vehicleId);
      return;
    }
    
    this.initAudio();
    let instance = this.instances.get(vehicleId);
    
    if (!instance) {
      instance = this.createSirenInstance(vehicleId, position);
      this.instances.set(vehicleId, instance);
    }
    
    if (instance.activeMode !== "off") {
      this.stopSirenAudio(instance);
    }
    
    instance.config.mode = mode;
    instance.activeMode = mode;
    instance.config.enabled = true;
    
    this.startSirenAudio(instance);
    
    this.emitEvent({ type: "started", vehicleId, mode });
  }
  
  public stopSiren(vehicleId: string) {
    const instance = this.instances.get(vehicleId);
    if (!instance) return;
    
    this.stopSirenAudio(instance);
    instance.activeMode = "off";
    instance.config.enabled = false;
    
    this.emitEvent({ type: "stopped", vehicleId });
    
    setTimeout(() => {
      if (instance.activeMode === "off") {
        this.instances.delete(vehicleId);
      }
    }, 1000);
  }
  
  public setMode(vehicleId: string, mode: QuebecSirenMode) {
    const instance = this.instances.get(vehicleId);
    if (!instance) return;
    
    if (mode === "off") {
      this.stopSiren(vehicleId);
      return;
    }
    
    if (instance.activeMode !== "off") {
      this.crossfadeToMode(instance, mode);
    } else {
      this.startSiren(vehicleId, mode);
    }
  }
  
  public updatePosition(vehicleId: string, position: THREE.Vector3, velocity?: THREE.Vector3) {
    const instance = this.instances.get(vehicleId);
    if (!instance || !instance.pannerNode) return;
    
    // Vélocité pour le calcul Doppler
    if (velocity) {
      instance.velocity.copy(velocity);
    } else {
      const now = performance.now();
      const dt = (now - instance.lastUpdateTime) / 1000;
      if (dt > 0) {
        instance.velocity.subVectors(position, instance.lastPosition).divideScalar(dt);
      }
    }
    
    instance.lastPosition.copy(position);
    instance.lastUpdateTime = performance.now();
    
    if (instance.pannerNode.positionX) {
      // Transition douce de position 3D pour éviter les sauts
      const t = this.audioCtx!.currentTime;
      instance.pannerNode.positionX.setTargetAtTime(position.x, t, 0.05);
      instance.pannerNode.positionY.setTargetAtTime(position.y, t, 0.05);
      instance.pannerNode.positionZ.setTargetAtTime(position.z, t, 0.05);
    }
  }
  
  public setVolume(vehicleId: string, volume: number) {
    const instance = this.instances.get(vehicleId);
    if (!instance || !instance.gainNode) return;
    
    instance.config.volume = Math.max(0, Math.min(1, volume));
    // Max à 0.15 pour ne pas exploser les oreilles
    instance.gainNode.gain.setTargetAtTime(instance.config.volume * 0.15, this.audioCtx!.currentTime, 0.1);
  }
  
  // ═══════════════════════════════════════════════════════════
  // AUDIO GENERATION
  // ═══════════════════════════════════════════════════════════
  
  private createSirenInstance(vehicleId: string, position?: THREE.Vector3): SirenInstance {
    const ctx = this.audioCtx!;
    
    const pannerNode = ctx.createPanner();
    pannerNode.panningModel = "HRTF";
    pannerNode.distanceModel = "inverse";
    pannerNode.refDistance = 10;
    pannerNode.maxDistance = 300; // Limite plus réaliste
    pannerNode.rolloffFactor = 1.2;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 360;
    pannerNode.coneOuterGain = 0.8;
    
    if (position && pannerNode.positionX) {
      pannerNode.positionX.value = position.x;
      pannerNode.positionY.value = position.y;
      pannerNode.positionZ.value = position.z;
    }
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.15;
    
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = 2200;
    filterNode.Q.value = 1.2;
    
    return {
      vehicleId,
      config: { vehicleId, position: position || new THREE.Vector3(), mode: "off", volume: 1.0, enabled: false },
      osc1: null, osc2: null, gainNode, pannerNode, filterNode,
      activeMode: "off", animationFrameId: null, cycle: 0,
      lastUpdateTime: performance.now(),
      targetFrequency: 500, currentFrequency: 500,
      lastPosition: position ? position.clone() : new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    };
  }
  
  private startSirenAudio(instance: SirenInstance) {
    const ctx = this.audioCtx!;
    const now = ctx.currentTime;
    
    instance.osc1 = ctx.createOscillator();
    instance.osc2 = ctx.createOscillator();
    
    instance.osc1.type = "sawtooth";
    instance.osc2.type = "square";
    
    instance.osc1.connect(instance.filterNode!);
    instance.osc2.connect(instance.filterNode!);
    instance.filterNode!.connect(instance.gainNode!);
    
    // Splitting vers Reverb et Son pur
    instance.gainNode!.connect(this.dryGain!);
    instance.gainNode!.connect(this.convolver!);
    
    instance.gainNode!.connect(instance.pannerNode!);
    instance.pannerNode!.connect(this.dryGain!);
    instance.pannerNode!.connect(this.convolver!);
    
    instance.osc1.start(now);
    instance.osc2.start(now);
    
    this.startModulation(instance);
    
    if (!this.duckingActive) this.enableDucking();
  }
  
  private stopSirenAudio(instance: SirenInstance) {
    if (instance.animationFrameId !== null) {
      cancelAnimationFrame(instance.animationFrameId);
      instance.animationFrameId = null;
    }
    
    const stopOsc = (osc: OscillatorNode | null) => {
      if (osc) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      }
    };
    stopOsc(instance.osc1);
    stopOsc(instance.osc2);
    instance.osc1 = null;
    instance.osc2 = null;
    
    if (instance.gainNode) instance.gainNode.disconnect();
    if (instance.pannerNode) instance.pannerNode.disconnect();
    if (instance.filterNode) instance.filterNode.disconnect();
    
    const activeSirens = Array.from(this.instances.values()).filter(i => i.activeMode !== "off");
    if (activeSirens.length === 0 && this.duckingActive) {
      this.disableDucking();
    }
  }
  
  private startModulation(instance: SirenInstance) {
    const modulate = () => {
      if (!instance.osc1 || !instance.osc2 || !this.audioCtx) return;
      
      const t = this.audioCtx.currentTime;
      const mode = instance.activeMode;
      
      let freq1 = 500;
      let freq2 = 500;
      
      if (mode === "wail") {
        const wave = Math.sin(t * 1.8);
        freq1 = 450 + wave * 220;
        freq2 = 460 + wave * 220;
      } else if (mode === "yelp") {
        const wave = Math.sin(t * 8);
        freq1 = 500 + wave * 280;
        freq2 = 510 + wave * 280;
      } else if (mode === "priority") {
        const wave = Math.sin(t * 16);
        freq1 = 650 + wave * 350;
        freq2 = 660 + wave * 350;
      } else if (mode === "hilo") {
        const cycle = Math.floor(t * 2.5) % 2;
        freq1 = cycle === 0 ? 700 : 500;
        freq2 = cycle === 0 ? 710 : 510;
      }
      
      instance.currentFrequency += (freq1 - instance.currentFrequency) * 0.1;
      
      // OPTIMISATION: setTargetAtTime remplace setValueAtTime pour annuler les clics audios
      instance.osc1.frequency.setTargetAtTime(instance.currentFrequency, t, 0.016);
      instance.osc2.frequency.setTargetAtTime(instance.currentFrequency + 10, t, 0.016);
      
      // Doppler Effect
      if (this.listener && instance.pannerNode && instance.velocity.length() > 0.1) {
        const dopplerFactor = this.calculateDoppler(instance);
        instance.osc1.detune.setTargetAtTime(dopplerFactor * 100, t, 0.05);
        instance.osc2.detune.setTargetAtTime(dopplerFactor * 100, t, 0.05);
      }
      
      instance.animationFrameId = requestAnimationFrame(modulate);
    };
    
    modulate();
  }
  
  private calculateDoppler(instance: SirenInstance): number {
    if (!this.audioCtx || !this.listener) return 1.0;
    
    const listenerPos = new THREE.Vector3(
      this.audioCtx.listener.positionX?.value || 0,
      this.audioCtx.listener.positionY?.value || 0,
      this.audioCtx.listener.positionZ?.value || 0
    );
    
    const toListener = new THREE.Vector3().subVectors(listenerPos, instance.lastPosition);
    const distance = toListener.length();
    
    if (distance < 0.1) return 1.0;
    
    toListener.normalize();
    const radialVelocity = instance.velocity.dot(toListener);
    
    // Doppler simplifié: Plus le véhicule fonce sur le joueur, plus le pitch monte
    const speedOfSound = 343; // m/s
    const dopplerFactor = (speedOfSound + radialVelocity) / speedOfSound;
    
    return Math.max(0.5, Math.min(2.0, dopplerFactor));
  }
  
  private crossfadeToMode(instance: SirenInstance, newMode: QuebecSirenMode) {
    if (!instance.gainNode || !this.audioCtx) return;
    
    const now = this.audioCtx.currentTime;
    instance.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    setTimeout(() => {
      this.stopSirenAudio(instance);
      instance.activeMode = newMode;
      instance.config.mode = newMode;
      this.startSirenAudio(instance);
      
      this.emitEvent({ type: "mode_changed", vehicleId: instance.vehicleId, mode: newMode });
    }, 120);
  }
  
  // ═══════════════════════════════════════════════════════════
  // AIRHORN & MEGAPHONE
  // ═══════════════════════════════════════════════════════════
  
  public triggerAirhorn(vehicleId: string, durationMs = 450) {
    this.initAudio();
    const ctx = this.audioCtx!;
    const now = ctx.currentTime;
    
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const o3 = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    o1.type = "sawtooth"; o2.type = "square"; o3.type = "triangle";
    
    o1.frequency.setValueAtTime(130, now);
    o2.frequency.setValueAtTime(160, now);
    o3.frequency.setValueAtTime(195, now);
    
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.Q.value = 2;
    
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    
    o1.connect(filter); o2.connect(filter); o3.connect(filter);
    filter.connect(g);
    
    g.connect(this.dryGain!);
    g.connect(this.convolver!);
    
    o1.start(now); o2.start(now); o3.start(now);
    
    const stopTime = now + durationMs / 1000;
    o1.stop(stopTime); o2.stop(stopTime); o3.stop(stopTime);
    
    // FIX: Nettoyage Mémoire
    o1.onended = () => {
      o1.disconnect(); o2.disconnect(); o3.disconnect();
      filter.disconnect(); g.disconnect();
    };
    
    this.emitEvent({ type: "airhorn", vehicleId });
  }
  
  public playMegaphoneAnnouncement(vehicleId: string, type: MegaphoneMessage, customText?: string) {
    this.initAudio();
    
    let text = "";
    switch (type) {
      case "pull_over": text = "Conducteur, immobilisez votre véhicule sur le champ."; break;
      case "step_out": text = "Coupez le moteur et sortez les mains bien en vue."; break;
      case "sq_warning": text = "Sûreté du Québec. Dispersez-vous immédiatement."; break;
      case "custom": text = customText || ""; break;
    }
    
    if (!text) return;
    
    if ("speechSynthesis" in window) {
      // FIX: Anti-spam, on coupe la phrase précédente s'il y en a une
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-CA"; // Accent Québécois
      utterance.rate = 0.95;
      utterance.pitch = 0.8;
      utterance.volume = 1.0;
      
      utterance.onstart = () => this.applyMegaphoneEffect();
      utterance.onend = () => this.removeMegaphoneEffect();
      
      window.speechSynthesis.speak(utterance);
    }
    
    this.emitEvent({ type: "megaphone", vehicleId, message: text });
  }
  
  private applyMegaphoneEffect() {
    // Si besoin, trigger un WebAudio filter ici
    console.log("🔊 [Mégaphone SQ] Interpellation vocale en cours...");
  }
  
  private removeMegaphoneEffect() {
    console.log("🔇 [Mégaphone SQ] Terminé.");
  }
  
  // ═══════════════════════════════════════════════════════════
  // DUCKING (Audio environnemental baissé pendant la sirène)
  // ═══════════════════════════════════════════════════════════
  
  private enableDucking() {
    this.duckingActive = true;
    window.dispatchEvent(new CustomEvent("siren_ducking_start", { detail: { amount: this.duckingAmount } }));
  }
  
  private disableDucking() {
    this.duckingActive = false;
    window.dispatchEvent(new CustomEvent("siren_ducking_end"));
  }
  
  public updateListenerPosition(position: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3) {
    if (!this.audioCtx || !this.audioCtx.listener) return;
    const listener = this.audioCtx.listener;
    
    if (listener.positionX) {
      const t = this.audioCtx.currentTime;
      listener.positionX.setTargetAtTime(position.x, t, 0.05);
      listener.positionY.setTargetAtTime(position.y, t, 0.05);
      listener.positionZ.setTargetAtTime(position.z, t, 0.05);
      
      listener.forwardX.setTargetAtTime(forward.x, t, 0.05);
      listener.forwardY.setTargetAtTime(forward.y, t, 0.05);
      listener.forwardZ.setTargetAtTime(forward.z, t, 0.05);
      
      listener.upX.setTargetAtTime(up.x, t, 0.05);
      listener.upY.setTargetAtTime(up.y, t, 0.05);
      listener.upZ.setTargetAtTime(up.z, t, 0.05);
    }
  }
  
  public onEvent(listener: (event: SirenEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => { this.eventListeners.delete(listener); };
  }
  
  private emitEvent(event: SirenEvent) {
    for (const listener of this.eventListeners) {
      try { listener(event); } catch (err) { console.error("[Sirens] Event listener error:", err); }
    }
  }
  
  public stop() {
    for (const [vehicleId] of this.instances) {
      this.stopSiren(vehicleId);
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
  
  public dispose() {
    this.stop();
    this.eventListeners.clear();
  }
}

export const QuebecPoliceSirens = new QuebecPoliceSirensManager();