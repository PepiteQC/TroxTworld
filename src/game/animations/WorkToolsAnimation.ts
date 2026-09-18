// ═══════════════════════════════════════════════════════════════════════════
//  WORK TOOLS ANIMATION v2.0 — CLIENT
//  Animateur d'outils — pièces mobiles + tenue naturelle en main
//  TroxT EtherWorld — Québécois RP 🍁
//
//  Système léger avec boucle requestAnimationFrame interne.
//  Chaque outil est suivi via une entrée avec `userData.animPart`.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import type { ToolId } from './WorkTools';

// ── Types ─────────────────────────────────────────────────────────────
export interface ToolAnimState {
  active: boolean;      // Outil en cours d'utilisation (perceuse qui tourne, chalumeau allumé...)
  tapeExtend: number;   // 0-1, pour le ruban à mesurer
  moving: boolean;      // Pour tondeuse/tronçonneuse : le personnage se déplace en l'utilisant
  lastActiveTime: number; // Timestamp pour gérer l'état "active" temporairement
}

interface ToolInstance {
  id: ToolId;
  group: THREE.Group;
  state: ToolAnimState;
  parts: { part: THREE.Object3D; tag: string }[];
  seed: number;         // Déphasage aléatoire pour éviter la synchronisation
}

const DEFAULT_STATE: ToolAnimState = {
  active: false,
  tapeExtend: 0,
  moving: false,
  lastActiveTime: 0
};

// ── Animateur ─────────────────────────────────────────────────────────
export class WorkToolsAnimator {
  private instances: ToolInstance[] = [];
  private clock = new THREE.Clock();
  private rafId = 0;
  private disposed = false;
  private up = new THREE.Vector3(0, 1, 0);
  private tmpQuat = new THREE.Quaternion();
  private tmpVec = new THREE.Vector3();

  constructor() {
    this.clock.start();
    this._loop();
  }

  // ── Gestion des instances ─────────────────────────────────────────────
  register(id: ToolId, group: THREE.Group, initialState: Partial<ToolAnimState> = {}): ToolInstance {
    const parts: { part: THREE.Object3D; tag: string }[] = [];
    group.traverse((o) => {
      const tag = (o.userData as any)?.animPart;
      if (tag) parts.push({ part: o, tag });
    });

    const instance: ToolInstance = {
      id,
      group,
      parts,
      seed: Math.random() * 10,
      state: { ...DEFAULT_STATE, ...initialState }
    };
    this.instances.push(instance);
    return instance;
  }

  unregister(group: THREE.Group): void {
    this.instances = this.instances.filter(i => i.group !== group);
  }

  unregisterById(id: ToolId): void {
    this.instances = this.instances.filter(i => i.id !== id);
  }

  // ── Contrôle des états ───────────────────────────────────────────────
  setActive(group: THREE.Group, active: boolean): void {
    const instance = this.instances.find(x => x.group === group);
    if (instance) {
      instance.state.active = active;
      instance.state.lastActiveTime = active ? Date.now() : 0;
    }
  }

  toggleActive(group: THREE.Group): boolean {
    const instance = this.instances.find(x => x.group === group);
    if (instance) {
      instance.state.active = !instance.state.active;
      instance.state.lastActiveTime = instance.state.active ? Date.now() : 0;
      return instance.state.active;
    }
    return false;
  }

  setMoving(group: THREE.Group, moving: boolean): void {
    const instance = this.instances.find(x => x.group === group);
    if (instance) instance.state.moving = moving;
  }

  setTapeExtend(group: THREE.Group, extend: number): void {
    const instance = this.instances.find(x => x.group === group);
    if (instance) instance.state.tapeExtend = Math.max(0, Math.min(1, extend));
  }

  // ── Utilitaires ─────────────────────────────────────────────────────
  isActive(group: THREE.Group): boolean {
    const instance = this.instances.find(x => x.group === group);
    return instance?.state.active ?? false;
  }

  getState(group: THREE.Group): ToolAnimState | undefined {
    const instance = this.instances.find(x => x.group === group);
    return instance?.state;
  }

  // ── Nettoyage ───────────────────────────────────────────────────────
  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.instances = [];
  }

  // ── Boucle interne ───────────────────────────────────────────────────
  private _loop = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    for (const inst of this.instances) this._updateInstance(inst, dt, t);
    this.rafId = requestAnimationFrame(this._loop);
  };

  private _updateInstance(inst: ToolInstance, dt: number, t: number) {
    const { state, parts, seed } = inst;

    // Balancement de repos (idle sway)
    const idleAmp = state.active ? 0.01 : 0.025;
    inst.group.rotation.z = Math.sin(t * 0.9 + seed) * idleAmp;
    inst.group.position.y += Math.sin(t * 1.3 + seed) * idleAmp * 0.002;

    // Animation des pièces mobiles
    for (const { part, tag } of parts) {
      switch (tag) {
        // Rotation rapide (mèche de perceuse, lame de scie)
        case 'spin-fast':
          if (state.active) part.rotation.x += dt * 55;
          break;
        case 'spin-fast-z':
          if (state.active) part.rotation.z += dt * 60;
          break;

        // Flamme du chalumeau
        case 'flame': {
          part.visible = state.active;
          if (state.active) {
            const flicker = 0.85 + Math.sin(t * 40 + seed) * 0.1 + Math.random() * 0.05;
            part.scale.set(flicker, 1 + Math.sin(t * 30) * 0.15, flicker);
          }
          break;
        }

        // Écran qui clignote (multimètre, pince ampèremétrique)
        case 'screen-flicker': {
          const mat = (part as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat?.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = state.active
              ? 1.0 + Math.sin(t * 6 + seed) * 0.3
              : 1.2;
          }
          break;
        }

        // Bulle de niveau (réagit à l'inclinaison)
        case 'bubble': {
          inst.group.getWorldQuaternion(this.tmpQuat);
          this.tmpVec.set(1, 0, 0).applyQuaternion(this.tmpQuat);
          const tilt = THREE.MathUtils.clamp(this.tmpVec.y, -1, 1);
          const home = (part.userData.homeX as number) ?? 0;
          const range = (part.userData.range as number) ?? 0.015;
          const target = home - tilt * range;
          part.position.x = THREE.MathUtils.lerp(part.position.x, target, Math.min(1, dt * 6));
          break;
        }

        // Ruban à mesurer
        case 'tape': {
          const base = (part.userData.baseLength as number) ?? 0.15;
          const len = Math.max(0.01, base * (0.15 + state.tapeExtend * 0.85));
          part.scale.x = len / base;
          (part as THREE.Mesh).position.x = (len - base) / 2 + (part.userData.origX ?? (part.userData.origX = part.position.x));
          break;
        }
        case 'tape-hook': {
          const baseX = (part.userData.baseX as number) ?? part.position.x;
          part.position.x = baseX - 0.185 * (1 - (0.15 + state.tapeExtend * 0.85));
          break;
        }

        // Roues de tondeuse
        case 'wheel-roll':
          if (state.moving) part.rotation.x += dt * 14;
          break;

        // Chaîne de tronçonneuse
        case 'chain-link': {
          if (!state.active) break;
          const spacing = 0.024;
          const start = -0.01, end = 0.31 - spacing;
          part.position.x += dt * 0.6;
          if (part.position.x > end) part.position.x = start;
          break;
        }

        // Ajout pour compatibilité future
        case 'piston':
          if (state.active) {
            part.position.y = Math.sin(t * 15 + seed) * 0.03;
          }
          break;
        case 'hammer-hit':
          if (state.active && Math.floor(t * 5) % 2 === 0) {
            part.rotation.x = Math.sin(t * 30) * 0.5;
          }
          break;
      }
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────
export const workToolsAnimator = new WorkToolsAnimator();