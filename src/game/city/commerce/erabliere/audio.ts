/**
 * 🍁 AUDIO — Sons spatialisés érablière
 */
import * as THREE from "three";
import { SUGAR_CONFIG } from "./config";

export class SugarAudioManager {
  private static listener: THREE.AudioListener | null = null;
  private sounds = new Map<string, THREE.PositionalAudio>();
  private buffers = new Map<string, AudioBuffer>();

  static getListener(): THREE.AudioListener {
    if (!SugarAudioManager.listener) {
      SugarAudioManager.listener = new THREE.AudioListener();
    }
    return SugarAudioManager.listener;
  }

  setListener(listener: THREE.AudioListener): void {
    SugarAudioManager.listener = listener;
  }

  /** Charge un buffer audio (async) */
  async preload(key: string, url: string, listener: THREE.AudioListener): Promise<void> {
    try {
      const loader = new THREE.AudioLoader();
      const buffer = await loader.loadAsync(url);
      this.buffers.set(key, buffer);
    } catch {
      // Silencieux si absent
    }
  }

  /** Attache un son positionnel à un objet */
  attach(bushId: string, target: THREE.Object3D, soundKey: string): void {
    const listener = SugarAudioManager.listener;
    if (!listener) return;

    const sound = new THREE.PositionalAudio(listener);
    sound.setRefDistance(5);
    sound.setRolloffFactor(SUGAR_CONFIG.AUDIO.ROLLOFF_FACTOR);
    sound.setMaxDistance(SUGAR_CONFIG.AUDIO.MAX_DISTANCE);
    sound.setVolume(SUGAR_CONFIG.AUDIO.EVAP_BOIL_VOLUME);

    const buffer = this.buffers.get(soundKey);
    if (buffer) {
      sound.setBuffer(buffer);
      sound.setLoop(true);
    }

    target.add(sound);
    this.sounds.set(bushId, sound);
  }

  play(bushId: string): void {
    const sound = this.sounds.get(bushId);
    if (sound && !sound.isPlaying) sound.play();
  }

  stop(bushId: string): void {
    const sound = this.sounds.get(bushId);
    if (sound && sound.isPlaying) sound.stop();
  }

  dispose(): void {
    for (const s of this.sounds.values()) {
      try { s.stop(); } catch { /* noop */ }
      s.disconnect();
    }
    this.sounds.clear();
    this.buffers.clear();
  }
}