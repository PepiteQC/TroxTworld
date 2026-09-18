/**
 * AdminEffectsBridge v1.0 — Synchronisation des effets Admin / Owner
 * localStorage · CustomEvent · Socket.IO · Subscribe/Unsubscribe
 *
 * Même patron que AuraEffectBridge.ts, appliqué aux effets d'écran
 * exclusifs Admin/Owner (AdminEffectsEngine). Permet à un owner/admin
 * de déclencher un effet qui se synchronise chez tous les clients
 * connectés (via socket.io) et persiste localement (localStorage).
 *
 * @file client/src/systems/AdminEffectsBridge.ts
 */

import type { Socket } from 'socket.io-client';
import { ADMIN_EFFECTS, ADMIN_EFFECT_IDS, type AdminEffectId } from './AdminEffectsEngine';

// ─────────────────────────────────────────────────────────────
//  CONSTANTES
// ─────────────────────────────────────────────────────────────

export const ADMIN_FX_KEY           = 'etherworld.adminEffects.lastTriggered';
export const ADMIN_FX_TRIGGER_EVENT = 'etherworld:admin-effect-triggered';
export const ADMIN_FX_APPLY_EVENT   = 'etherworld:admin-effect-apply-3d';
export const ADMIN_FX_CLEARED_EVENT = 'etherworld:admin-effect-cleared';

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────

export interface AdminEffectPayload {
  effectId:  AdminEffectId | string;
  role:      'admin' | 'owner' | string;
  targetId?: string;   // id du personnage/joueur visé, si applicable (sinon broadcast global)
  source:    'AdminEffectsPanel' | string;
  createdAt: number;
}

type FxListener = (payload: AdminEffectPayload | null) => void;

// ─────────────────────────────────────────────────────────────
//  VALIDATION
// ─────────────────────────────────────────────────────────────

function isValidPayload(v: unknown): v is AdminEffectPayload {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p['effectId']  === 'string' &&
    typeof p['role']      === 'string' &&
    typeof p['source']    === 'string' &&
    typeof p['createdAt'] === 'number'
  );
}

// ─────────────────────────────────────────────────────────────
//  BRIDGE
// ─────────────────────────────────────────────────────────────

export class AdminEffectsBridge {

  private socket?: Socket;
  private listeners = new Set<FxListener>();
  private nativeHook: ((e: Event) => void) | null = null;

  constructor(socket?: Socket) {
    this.socket = socket;
    this._initNativeListener();
  }

  // ── VALIDATION D'ID ──────────────────────────────────────

  isValidEffectId(id: string): id is AdminEffectId {
    return (ADMIN_EFFECT_IDS as string[]).includes(id);
  }

  // ── RÔLE REQUIS ───────────────────────────────────────────

  /** Seuls 'admin' et 'owner' peuvent déclencher un effet. */
  canTrigger(role: string): boolean {
    const r = role.trim().toLowerCase();
    return r === 'admin' || r === 'owner';
  }

  /** Vérifie le rôle minimum requis pour un effet précis (les Légendaires sont réservés Owner). */
  canTriggerEffect(effectId: string, role: string): boolean {
    if (!this.canTrigger(role)) return false;
    if (!this.isValidEffectId(effectId)) return false;
    const r = role.trim().toLowerCase();
    const minRole = ADMIN_EFFECTS[effectId].minRole;
    return minRole === 'admin' ? true : r === 'owner';
  }

  // ── DÉCLENCHEMENT ─────────────────────────────────────────

  /**
   * Déclenche un effet : persiste, notifie localement (même onglet),
   * et diffuse aux autres clients via socket.io si connecté.
   */
  trigger(effectId: string, role: string, source = 'AdminEffectsPanel', targetId?: string): boolean {
    if (!this.isValidEffectId(effectId)) {
      console.warn('[AdminEffectsBridge] Effet inconnu:', effectId);
      return false;
    }
    if (!this.canTriggerEffect(effectId, role)) {
      console.warn('[AdminEffectsBridge] Rôle insuffisant pour cet effet (Owner requis):', effectId, role);
      return false;
    }

    const payload: AdminEffectPayload = {
      effectId, role, source, targetId, createdAt: Date.now(),
    };

    try { localStorage.setItem(ADMIN_FX_KEY, JSON.stringify(payload)); } catch { /* ignore */ }

    window.dispatchEvent(new CustomEvent<AdminEffectPayload>(ADMIN_FX_TRIGGER_EVENT, { detail: payload }));

    this.socket?.emit('admineffect:trigger', {
      effectId: payload.effectId, role: payload.role, targetId: payload.targetId,
    });

    this._notify(payload);
    return true;
  }

  // ── LECTURE / EFFACEMENT ─────────────────────────────────

  read(): AdminEffectPayload | null {
    try {
      const raw = localStorage.getItem(ADMIN_FX_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isValidPayload(parsed) || !this.isValidEffectId(String(parsed.effectId))) {
        localStorage.removeItem(ADMIN_FX_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(ADMIN_FX_KEY);
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(ADMIN_FX_KEY);
    window.dispatchEvent(new CustomEvent<null>(ADMIN_FX_CLEARED_EVENT, { detail: null }));
    this._notify(null);
    this.socket?.emit('admineffect:cleared', {});
  }

  // ── SUBSCRIBE (vanilla pub/sub, même onglet) ─────────────

  subscribe(fn: FxListener): () => void {
    this.listeners.add(fn);
    fn(this.read());
    return () => this.listeners.delete(fn);
  }

  /** S'abonner aux déclenchements distants (autres joueurs/onglets via socket). */
  onRemoteApply(fn: (payload: AdminEffectPayload) => void): () => void {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<AdminEffectPayload>).detail;
      if (isValidPayload(payload)) fn(payload);
    };
    window.addEventListener(ADMIN_FX_APPLY_EVENT, handler);
    return () => window.removeEventListener(ADMIN_FX_APPLY_EVENT, handler);
  }

  // ── SOCKET.IO ─────────────────────────────────────────────

  connectSocket(socket: Socket): void {
    this.socket = socket;
    socket.on('admineffect:remote_apply', (data: { effectId: string; role: string; targetId?: string }) => {
      if (!this.isValidEffectId(data.effectId)) return;
      window.dispatchEvent(new CustomEvent<AdminEffectPayload>(ADMIN_FX_APPLY_EVENT, {
        detail: {
          effectId: data.effectId, role: data.role, targetId: data.targetId,
          source: 'server', createdAt: Date.now(),
        },
      }));
    });
  }

  // ── DISPOSE ───────────────────────────────────────────────

  dispose(): void {
    if (this.nativeHook) {
      window.removeEventListener(ADMIN_FX_TRIGGER_EVENT, this.nativeHook);
      this.nativeHook = null;
    }
    this.listeners.clear();
  }

  // ── INTERNE ───────────────────────────────────────────────

  private _initNativeListener(): void {
    this.nativeHook = (e: Event) => {
      const payload = (e as CustomEvent<AdminEffectPayload | null>).detail;
      this._notify(payload);
    };
    window.addEventListener(ADMIN_FX_TRIGGER_EVENT, this.nativeHook);
  }

  private _notify(payload: AdminEffectPayload | null): void {
    for (const fn of this.listeners) {
      try { fn(payload); } catch { /* ignore */ }
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  SINGLETON + API FONCTIONNELLE (même style que auraBridge)
// ─────────────────────────────────────────────────────────────

export const adminEffectsBridge = new AdminEffectsBridge();

export function triggerAdminEffect(effectId: string, role: string, targetId?: string): boolean {
  return adminEffectsBridge.trigger(effectId, role, 'AdminEffectsPanel', targetId);
}

export function readLastAdminEffect(): AdminEffectPayload | null {
  return adminEffectsBridge.read();
}

export function clearAdminEffect(): void {
  adminEffectsBridge.clear();
}
