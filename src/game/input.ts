/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🎮 GESTIONNAIRE D'ENTRÉES (INPUT MANAGER v3.0) — TROXTWORLD / PORTNEUF
 * ═════════════════════════════════════════════════════════════════════════════
 * Architecture : Zero-GC absolu par frame, pré-allocation statique, 
 *                détection d'impulsions (Edge Detection), support Gamepad & Souris 3D.
 * ═════════════════════════════════════════════════════════════════════════════
 */

export interface Actions {
  // ── Mouvement Véhicule & Personnage ──
  throttle: number;      // 0.0 à 1.0 (Avancer / Accélérer)
  brake: number;         // 0.0 à 1.0 (Reculer / Freiner)
  steer: number;         // -1.0 (Gauche) à +1.0 (Droite)
  boost: boolean;        // Shift (Sprint / Nitro)
  handbrake: boolean;    // Espace (Frein à main)
  jump: boolean;         // Espace (Saut piéton - impulsion)
  crouch: boolean;       // Ctrl / C (Accroupi)
  
  // ── Caméra & Affichage ──
  camera: boolean;       // Changer de vue (V)
  lookBack: boolean;     // Regarder derrière (Bouton molette / R3)
  night: boolean;        // Vision nocturne / Phares (N)
  map: boolean;          // Carte du comté (M)
  pause: boolean;        // Menu pause (Échap)
  
  // ── Interactions & Menus RP ──
  interact: boolean;     // Interagir (E / F)
  phone: boolean;        // Sortir le téléphone (P)
  console: boolean;      // Console admin Intellectus (F8 / `)
  radio: boolean;        // Radio / Talkie-walkie (Y)
  inventory: boolean;    // Ouvrir inventaire (I / TAB)
  garage: boolean;       // Menu garage (G)
  jobs: boolean;         // Menu emplois & dispatch (J)
  firm: boolean;         // Menu entreprise (K)
  build: boolean;        // Mode construction (B)
  rotate: boolean;       // Rotation objet (Q)
  chat: boolean;         // Ouvrir le clavardage (T / Entrée)
  siren: boolean;        // Sirène SQ/EMS (H)
  gesture: boolean;      // Roue des gestes RP (U)
  surrender: boolean;    // Lever les mains / Se rendre (X)
  
  // ── Système de Combat & Visée ──
  fire: boolean;         // Tirer (Impulsion Clic Gauche)
  fireHeld: boolean;     // Maintenir le tir (Clic Gauche continu)
  aim: boolean;          // Viser (Clic Droit)
  reload: boolean;       // Recharger l'arme (R)
  equipWeapon: boolean;  // Dégainer / Rengainer (1)

  // ── Deltas Souris (Zero-GC) ──
  mouseDeltaX: number;
  mouseDeltaY: number;
  wheelDelta: number;
}

const GAME_CODES = new Set<string>([
  "KeyW", "KeyA", "KeyS", "KeyD", "KeyZ",
  "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight",
  "Space", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight",
  "KeyC", "KeyN", "KeyM", "Escape", "Tab",
  "KeyR", "KeyE", "KeyF", "KeyY", "KeyO",
  "KeyP", "KeyI", "KeyG", "KeyJ", "KeyK",
  "KeyB", "KeyQ", "KeyT", "KeyH", "KeyU", "KeyV", "KeyX",
  "Backquote", "F1", "F8", "Enter",
  "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
]);

// ─── UTILITAIRES STATIQUES SANS ALLOCATION ────────────────────────────────────

const deadzoneVec = { x: 0, y: 0 };

function applyRadialDeadzone(x: number, y: number, dz = 0.16): void {
  const m = Math.sqrt(x * x + y * y);
  if (m < dz) {
    deadzoneVec.x = 0;
    deadzoneVec.y = 0;
    return;
  }
  const scale = (m - dz) / ((1 - dz) * m);
  deadzoneVec.x = x * scale;
  deadzoneVec.y = y * scale;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

// ─── CLASSE PRINCIPALE INPUT ─────────────────────────────────────────────────

export class Input {
  public readonly keys = new Set<string>();
  public readonly mouseButtons = new Set<number>();

  private injectedSet: Set<string> | null = null;

  // Contrôles tactiles (Mobile / Tablettes)
  public touchSteer = 0;
  public touchThrottle = 0;
  public touchBrake = 0;
  public touchHandbrake = false;
  public touchInteract = false;

  // Deltas souris
  private rawMouseDeltaX = 0;
  private rawMouseDeltaY = 0;
  private rawWheelDelta = 0;

  // Instance d'actions unique pré-allouée (ZÉRO allocation en cours de jeu)
  private readonly currentActions: Actions = {
    throttle: 0,
    brake: 0,
    steer: 0,
    boost: false,
    handbrake: false,
    jump: false,
    crouch: false,
    camera: false,
    lookBack: false,
    night: false,
    map: false,
    pause: false,
    interact: false,
    phone: false,
    console: false,
    radio: false,
    inventory: false,
    garage: false,
    jobs: false,
    firm: false,
    build: false,
    rotate: false,
    chat: false,
    siren: false,
    gesture: false,
    surrender: false,
    fire: false,
    fireHeld: false,
    aim: false,
    reload: false,
    equipWeapon: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    wheelDelta: 0,
  };

  // Suivi des états précédents pour la détection d'impulsions (Edge Detection)
  private readonly prev = {
    camera: false,
    lookBack: false,
    night: false,
    map: false,
    pause: false,
    interact: false,
    phone: false,
    console: false,
    radio: false,
    inventory: false,
    garage: false,
    jobs: false,
    firm: false,
    build: false,
    rotate: false,
    chat: false,
    siren: false,
    gesture: false,
    surrender: false,
    fire: false,
    reload: false,
    equipWeapon: false,
    jump: false,
  };

  private attached = false;
  private canvas: HTMLCanvasElement | null = null;

  // ─── ATTACHEMENT DES ÉCOUTEURS D'ÉVÉNEMENTS ────────────────────────────────

  public attach(canvas?: HTMLCanvasElement): void {
    if (this.attached) return;
    this.attached = true;
    this.canvas = canvas ?? null;

    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: true });
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);

    const target = this.canvas || window;
    target.addEventListener("mousedown", this.onMouseDown as EventListener);
    target.addEventListener("mouseup", this.onMouseUp as EventListener);
    target.addEventListener("contextmenu", this.onContextMenu as EventListener);
    target.addEventListener("mousemove", this.onMouseMove as EventListener);
    target.addEventListener("wheel", this.onWheel as EventListener, { passive: true });
  }

  public detach(): void {
    if (!this.attached) return;

    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);

    const target = this.canvas || window;
    target.removeEventListener("mousedown", this.onMouseDown as EventListener);
    target.removeEventListener("mouseup", this.onMouseUp as EventListener);
    target.removeEventListener("contextmenu", this.onContextMenu as EventListener);
    target.removeEventListener("mousemove", this.onMouseMove as EventListener);
    target.removeEventListener("wheel", this.onWheel as EventListener);

    this.attached = false;
    this.reset();
  }

  // ─── GESTION DU CLAVIER ───────────────────────────────────────────────────

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target)) {
      if (e.code === "Escape") {
        this.keys.add(e.code);
      }
      return;
    }

    if (e.repeat) {
      if (GAME_CODES.has(e.code)) e.preventDefault();
      return;
    }

    this.keys.add(e.code);
    if (GAME_CODES.has(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onBlur = (): void => {
    this.reset();
  };

  private onVisibility = (): void => {
    if (document.hidden) {
      this.reset();
    }
  };

  // ─── GESTION DE LA SOURIS ─────────────────────────────────────────────────

  private onMouseDown = (e: MouseEvent): void => {
    if (isTypingTarget(e.target)) return;
    this.mouseButtons.add(e.button);
    if (e.button === 2) {
      e.preventDefault(); // Bloque le menu contextuel par défaut
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.mouseButtons.delete(e.button);
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (isTypingTarget(e.target)) return;
    this.rawMouseDeltaX += e.movementX || 0;
    this.rawMouseDeltaY += e.movementY || 0;
  };

  private onWheel = (e: WheelEvent): void => {
    this.rawWheelDelta += Math.sign(e.deltaY);
  };

  // ─── INJECTION DE TOUCHES (Tests / Replays / Bots) ─────────────────────────

  public setInjected(codes: string[] | null): void {
    this.injectedSet = codes && codes.length > 0 ? new Set(codes) : null;
  }

  // ─── ÉCHANTILLONNAGE PAR FRAME (ZÉRO-GC) ──────────────────────────────────

  public sample(): Readonly<Actions> {
    const active = this.injectedSet ?? this.keys;
    const actions = this.currentActions;

    // ── 1. MOUVEMENTS & AXES DIRECTIONNELS ──
    let steer = 0;
    let throttle = 0;
    let brake = 0;
    let padHandbrake = false;

    // Support QWERTY / AZERTY / Flèches
    if (active.has("KeyA") || active.has("ArrowLeft")) steer += 1;
    if (active.has("KeyD") || active.has("ArrowRight")) steer -= 1;
    if (active.has("KeyW") || active.has("ArrowUp") || active.has("KeyZ")) throttle = 1;
    if (active.has("KeyS") || active.has("ArrowDown")) brake = 1;

    // ── 2. MANETTES / GAMEPAD (Sans allocation d'itérateur) ──
    if (typeof navigator !== "undefined" && navigator.getGamepads) {
      const pads = navigator.getGamepads();
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (!pad || pad.mapping !== "standard") continue;

        applyRadialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        steer -= deadzoneVec.x;

        if (deadzoneVec.y < -0.2) throttle = Math.max(throttle, -deadzoneVec.y);
        if (deadzoneVec.y > 0.2) brake = Math.max(brake, deadzoneVec.y);

        // Gâchettes analogiques RT / LT
        const rt = pad.buttons[7]?.value ?? 0;
        const lt = pad.buttons[6]?.value ?? 0;
        if (rt > 0.05) throttle = Math.max(throttle, rt);
        if (lt > 0.05) brake = Math.max(brake, lt);

        // Bouton A (Frein à main) / X (Accélérateur secondaire)
        if (pad.buttons[0]?.pressed) padHandbrake = true;
        if (pad.buttons[2]?.pressed) throttle = Math.max(throttle, 1);
      }
    }

    actions.steer = Math.max(-1, Math.min(1, steer + this.touchSteer));
    actions.throttle = Math.max(throttle, this.touchThrottle);
    actions.brake = Math.max(brake, this.touchBrake);
    actions.boost = active.has("ShiftLeft") || active.has("ShiftRight");
    actions.handbrake = active.has("Space") || this.touchHandbrake || padHandbrake;
    actions.crouch = active.has("ControlLeft") || active.has("ControlRight") || active.has("KeyC");

    // ── 3. DÉTECTION DES IMPULSIONS (EDGE DETECTION) ──
    const checkEdge = (actionKey: keyof typeof this.prev, isPressed: boolean) => {
      actions[actionKey] = isPressed && !this.prev[actionKey];
      this.prev[actionKey] = isPressed;
    };

    checkEdge("jump", active.has("Space"));
    checkEdge("camera", active.has("KeyV"));
    checkEdge("lookBack", this.mouseButtons.has(1)); // Clic molette
    checkEdge("night", active.has("KeyN"));
    checkEdge("map", active.has("KeyM"));
    checkEdge("pause", active.has("Escape"));
    checkEdge("interact", active.has("KeyE") || active.has("KeyF") || this.touchInteract);
    checkEdge("phone", active.has("KeyP"));
    checkEdge("console", active.has("Backquote") || active.has("F1") || active.has("F8"));
    checkEdge("radio", active.has("KeyY") || active.has("KeyO")); // Radio séparée de reload !
    checkEdge("inventory", active.has("KeyI") || active.has("Tab"));
    checkEdge("garage", active.has("KeyG"));
    checkEdge("jobs", active.has("KeyJ"));
    checkEdge("firm", active.has("KeyK"));
    checkEdge("build", active.has("KeyB"));
    checkEdge("rotate", active.has("KeyQ"));
    checkEdge("chat", active.has("KeyT") || active.has("Enter"));
    checkEdge("siren", active.has("KeyH"));
    checkEdge("gesture", active.has("KeyU"));
    checkEdge("surrender", active.has("KeyX"));

    // ── 4. SYSTÈME DE COMBAT & VISÉE ──
    checkEdge("reload", active.has("KeyR"));
    checkEdge("equipWeapon", active.has("Digit1"));

    const lmb = this.mouseButtons.has(0);
    actions.fireHeld = lmb;
    checkEdge("fire", lmb);
    actions.aim = this.mouseButtons.has(2);

    // ── 5. DELTAS SOURIS (Consommés et réinitialisés) ──
    actions.mouseDeltaX = this.rawMouseDeltaX;
    actions.mouseDeltaY = this.rawMouseDeltaY;
    actions.wheelDelta = this.rawWheelDelta;

    this.rawMouseDeltaX = 0;
    this.rawMouseDeltaY = 0;
    this.rawWheelDelta = 0;

    return actions;
  }

  // ─── REQUÊTES D'ÉTAT DIRECTES ─────────────────────────────────────────────

  public isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  public isMouseDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  public reset(): void {
    this.keys.clear();
    this.mouseButtons.clear();
    this.touchSteer = 0;
    this.touchThrottle = 0;
    this.touchBrake = 0;
    this.touchHandbrake = false;
    this.touchInteract = false;
    this.rawMouseDeltaX = 0;
    this.rawMouseDeltaY = 0;
    this.rawWheelDelta = 0;
    this.injectedSet = null;

    // Réinitialisation des états d'impulsion
    for (const key in this.prev) {
      (this.prev as any)[key] = false;
    }
  }

  /**
   * Écrit les coordonnées normalisées de la souris (-1.0 à +1.0) dans un objet pré-alloué.
   */
  public getNormalizedMousePosition(
    event: MouseEvent,
    out: { x: number; y: number }
  ): void {
    if (!this.canvas) {
      out.x = (event.clientX / window.innerWidth) * 2 - 1;
      out.y = -(event.clientY / window.innerHeight) * 2 + 1;
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    out.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    out.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
}

export const input = new Input();