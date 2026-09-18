// ============================================
// Système d'animation de base pour les personnages
// Compatible avec gestures.ts et fillPlayer
// ============================================

import * as THREE from "three";
import { getOrCacheLimbs } from "./gestures"; // Réutilise votre cache de membres

// --- Types ---
export type BasicAnimationType = "idle" | "walk" | "run" | "jump" | "dance";
export interface AnimationConfig {
  name: BasicAnimationType;
  duration: number;
  loop: boolean;
  priority: number; // 0-10 (les gestes RP ont priorité 2-10)
}

// --- Système d'animation ---
export class CharacterAnimationSystem {
  private mixer: THREE.AnimationMixer;
  private clips: Map<BasicAnimationType, THREE.AnimationClip> = new Map();
  private activeClip: THREE.AnimationClip | null = null;
  private characterGroup: THREE.Group;
  private isLockedByGesture = false; // Bloqué si un geste RP est actif

  constructor(characterGroup: THREE.Group) {
    this.characterGroup = characterGroup;
    this.mixer = new THREE.AnimationMixer(characterGroup);
  }

  // Initialiser avec des clips de base
  public initialize(): void {
    this.clips.set("idle", this.createIdleClip());
    this.clips.set("walk", this.createWalkClip());
    this.clips.set("run", this.createRunClip());
    this.clips.set("jump", this.createJumpClip());
    this.clips.set("dance", this.createDanceClip());
  }

  // --- Créer des clips procéduraux (pour les modèles simples) ---
  private createIdleClip(): THREE.AnimationClip {
    const times = [0, 1, 2, 3]; // 3 secondes
    const values: number[] = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      values.push(0, Math.sin(t * 2) * 0.02, 0); // Respiration (Y)
    }
    const track = new THREE.NumberKeyframeTrack(
      ".position", // Appliqué au group racine
      times,
      values
    );
    return new THREE.AnimationClip("idle", 3, [track]);
  }

  private createWalkClip(): THREE.AnimationClip {
    const times = Array.from({ length: 30 }, (_, i) => i * 0.1);
    const values: number[] = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      values.push(
        0,
        Math.sin(t * 10) * 0.05, // Bobbing Y
        Math.sin(t * 5) * 0.1    // Mouvement Z
      );
    }
    const track = new THREE.NumberKeyframeTrack(".position", times, values);
    return new THREE.AnimationClip("walk", 3, [track]);
  }

  private createRunClip(): THREE.AnimationClip {
    const times = Array.from({ length: 30 }, (_, i) => i * 0.08);
    const values: number[] = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      values.push(
        0,
        Math.sin(t * 15) * 0.1,  // Bobbing plus prononcé
        Math.sin(t * 8) * 0.2     // Mouvement plus rapide
      );
    }
    const track = new THREE.NumberKeyframeTrack(".position", times, values);
    return new THREE.AnimationClip("run", 2.4, [track]);
  }

  private createJumpClip(): THREE.AnimationClip {
    const times = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const values: number[] = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const height = Math.sin(t * Math.PI) * 0.5; // Saut parabolique
      values.push(0, height, 0);
    }
    const track = new THREE.NumberKeyframeTrack(".position", times, values);
    return new THREE.AnimationClip("jump", 1.0, [track], false); // Non loop
  }

  private createDanceClip(): THREE.AnimationClip {
    const times = Array.from({ length: 60 }, (_, i) => i * 0.1);
    const values: number[] = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      values.push(
        Math.sin(t * 3) * 0.1,   // Sway X
        Math.sin(t * 4) * 0.05,  // Bobbing Y
        0
      );
    }
    const track = new THREE.NumberKeyframeTrack(".position", times, values);
    return new THREE.AnimationClip("dance", 4, [track]);
  }

  // --- Jouer une animation ---
  public play(animationType: BasicAnimationType): void {
    if (this.isLockedByGesture) return; // Ne pas interrompre les gestes RP

    const clip = this.clips.get(animationType);
    if (!clip) {
      console.warn(`[Animation] Clip "${animationType}" introuvable.`);
      return;
    }

    // Arrêter l'animation actuelle
    this.mixer.stopAllAction();

    // Jouer la nouvelle animation
    const action = this.mixer.clipAction(clip);
    action.loop = clip.loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.play();
    this.activeClip = clip;
  }

  // --- Bloquer/Débloquer le système (pour les gestes RP) ---
  public lockByGesture(locked: boolean): void {
    this.isLockedByGesture = locked;
    if (!locked && this.activeClip) {
      // Relancer l'animation précédente si elle existe
      this.mixer.stopAllAction();
      const action = this.mixer.clipAction(this.activeClip);
      action.play();
    }
  }

  // --- Mettre à jour le mixer ---
  public update(deltaTime: number): void {
    this.mixer.update(deltaTime);
  }

  // --- Nettoyer ---
  public dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.characterGroup);
    this.clips.clear();
  }
}

// --- Initialisation automatique pour un personnage ---
export function setupCharacterAnimations(group: THREE.Group): CharacterAnimationSystem {
  const system = new CharacterAnimationSystem(group);
  system.initialize();
  return system;
}