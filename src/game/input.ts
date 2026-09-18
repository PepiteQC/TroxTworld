/**
 * ═══════════════════════════════════════════════════════════════════
 *  INPUT MANAGER — GESTIONNAIRE D'ENTRÉES (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * Architecture : True Zero-GC per frame, Pre-allocated Output, 
 *                Math optimized, Memory-Safe.
 */

export interface Actions {
  throttle: number;
  brake: number;
  steer: number;
  boost: boolean;
  handbrake: boolean;
  camera: boolean;
  night: boolean;
  map: boolean;
  pause: boolean;
  interact: boolean;
  phone: boolean;
  console: boolean;
  radio: boolean;
  inventory: boolean;
  garage: boolean;
  jobs: boolean;
  firm: boolean;
  build: boolean;
  rotate: boolean;
  chat: boolean;
  siren: boolean;
  gesture: boolean;
  surrender: boolean;
<<<<<<< HEAD
}

const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyC",
  "KeyN",
  "KeyM",
  "Escape",
  "KeyR",
  "KeyE",
  "KeyF",
  "KeyZ",
  "KeyP",
  "KeyI",
  "KeyG",
  "KeyJ",
  "KeyK",
  "KeyB",
  "KeyQ",
  "KeyT",
  "KeyH",
  "KeyU",
  "KeyV",
  "KeyX",
  "Backquote",
  "F1",
=======
  // 🔫 SYSTÈME D'ARMES
  fire: boolean;
  fireHeld: boolean;
  reload: boolean;
  equipWeapon: boolean;
  aim: boolean;
}

const GAME_CODES = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight",
  "Space", "ShiftLeft", "ShiftRight",
  "KeyC", "KeyN", "KeyM", "Escape",
  "KeyR", "KeyE", "KeyF", "KeyZ",
  "KeyP", "KeyI", "KeyG", "KeyJ", "KeyK",
  "KeyB", "KeyQ", "KeyT", "KeyH", "KeyU", "KeyV", "KeyX",
  "Backquote", "F1",
  "Digit1", "Digit2", "Digit3",
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
]);

// ZERO-GC : Variables pré-allouées pour éviter la création d'objets dans radialDeadzone
const dzResult = { x: 0, y: 0 };
function applyRadialDeadzone(x: number, y: number, dz = 0.16): void {
  const m = Math.sqrt(x * x + y * y); // 3x plus rapide que Math.hypot sous V8
  if (m < dz) {
    dzResult.x = 0;
    dzResult.y = 0;
    return;
  }
  const scale = (m - dz) / ((1 - dz) * m);
  dzResult.x = x * scale;
  dzResult.y = y * scale;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export class Input {
  public readonly keys = new Set<string>();
  public readonly mouseButtons = new Set<number>();
  
  // ZERO-GC : On met en cache le Set injecté lors de son assignation, 
  // plutôt que de le recréer à chaque frame dans sample()
  private injectedSet: Set<string> | null = null;
  
  // Touch controls
  touchSteer = 0;
  touchThrottle = 0;
  touchBrake = 0;
  touchHandbrake = false;
<<<<<<< HEAD
  prevCamera = false;
  prevNight = false;
  prevMap = false;
  prevPause = false;
  prevInteract = false;
  prevPhone = false;
  prevConsole = false;
  prevRadio = false;
  prevInventory = false;
  prevGarage = false;
  prevJobs = false;
  prevFirm = false;
  prevBuild = false;
  prevRotate = false;
  prevChat = false;
  prevSiren = false;
  prevGesture = false;
  prevSurrender = false;
  cameraEdge = false;
  nightEdge = false;
  mapEdge = false;
  pauseEdge = false;
  interactEdge = false;
  phoneEdge = false;
  consoleEdge = false;
  radioEdge = false;
  inventoryEdge = false;
  garageEdge = false;
  jobsEdge = false;
  firmEdge = false;
  buildEdge = false;
  rotateEdge = false;
  chatEdge = false;
  sirenEdge = false;
  gestureEdge = false;
  surrenderEdge = false;
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  touchInteract = false;
  
  // ZERO-GC : L'objet retourné par sample() est pré-alloué au démarrage.
  // Ses propriétés sont mutées en place (0 allocation mémoire par frame).
  private readonly currentActions: Actions = {
    throttle: 0, brake: 0, steer: 0, boost: false, handbrake: false,
    camera: false, night: false, map: false, pause: false, interact: false,
    phone: false, console: false, radio: false, inventory: false, garage: false,
    jobs: false, firm: false, build: false, rotate: false, chat: false,
    siren: false, gesture: false, surrender: false, fire: false, fireHeld: false,
    reload: false, equipWeapon: false, aim: false,
  };

  // Cache des états précédents pour l'Edge Detection (Trigger)
  private prev = {
    camera: false, night: false, map: false, pause: false, interact: false,
    phone: false, console: false, radio: false, inventory: false, garage: false,
    jobs: false, firm: false, build: false, rotate: false, chat: false,
    siren: false, gesture: false, surrender: false, fire: false, reload: false,
    equipWeapon: false, aim: false,
  };

  private attached = false;
  private canvas: HTMLCanvasElement | null = null;

  attach(canvas?: HTMLCanvasElement) {
    if (this.attached) return;
    this.attached = true;
    this.canvas = canvas ?? null;
    
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    
    const target = this.canvas || window;
    target.addEventListener("mousedown", this.onMouseDown as EventListener);
    target.addEventListener("mouseup", this.onMouseUp as EventListener);
    target.addEventListener("contextmenu", this.onContextMenu as EventListener);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    
    const target = this.canvas || window;
    target.removeEventListener("mousedown", this.onMouseDown as EventListener);
    target.removeEventListener("mouseup", this.onMouseUp as EventListener);
    target.removeEventListener("contextmenu", this.onContextMenu as EventListener);
    
    this.attached = false;
    this.reset();
  }

  // ============================================================================
  // KEYBOARD EVENTS
  // ============================================================================
  private onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) {
      if (e.code === "Escape") this.keys.add(e.code);
      return;
    }
    if (e.repeat) {
      if (GAME_CODES.has(e.code)) e.preventDefault();
      return;
    }
    this.keys.add(e.code);
    if (GAME_CODES.has(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => this.reset();
  private onVisibility = () => { if (document.hidden) this.reset(); };

  // ============================================================================
  // MOUSE EVENTS
  // ============================================================================
  private onMouseDown = (e: MouseEvent) => {
    if (isTypingTarget(e.target)) return;
    this.mouseButtons.add(e.button);
    // On ne preventDefault() que les clics droit/milieu pour ne pas casser l'UI
    if (e.button !== 0) e.preventDefault();
  };

  private onMouseUp = (e: MouseEvent) => {
    this.mouseButtons.delete(e.button);
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  // ============================================================================
  // INJECTION
  // ============================================================================
  setInjected(codes: string[] | null) {
    // Évite l'allocation d'un Set à chaque frame. On le fait uniquement à la source.
    this.injectedSet = codes && codes.length > 0 ? new Set(codes) : null;
  }

  // ============================================================================
  // SAMPLE (Moteur principal O(1) Absolute)
  // ============================================================================
  sample(): Readonly<Actions> {
    const active = this.injectedSet ?? this.keys;
    const actions = this.currentActions;
    
    // ── MOUVEMENT ──
    let steer = 0;
    let throttle = 0;
    let brake = 0;
    
    if (active.has("KeyA") || active.has("ArrowLeft")) steer += 1;
    if (active.has("KeyD") || active.has("ArrowRight")) steer -= 1;
    if (active.has("KeyW") || active.has("ArrowUp") || active.has("KeyZ")) throttle = 1;
    if (active.has("KeyS") || active.has("ArrowDown")) brake = 1;

    // ── GAMEPAD (Zéro allocation itérateur) ──
    if (navigator.getGamepads) {
      const pads = navigator.getGamepads();
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (!pad || pad.mapping !== "standard") continue;
        
        applyRadialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        steer -= dzResult.x;
        
        if (dzResult.y < -0.2) throttle = Math.max(throttle, -dzResult.y);
        if (dzResult.y > 0.2) brake = Math.max(brake, dzResult.y);
        
        const rt = pad.buttons[7]?.value ?? 0;
        const lt = pad.buttons[6]?.value ?? 0;
        
        if (rt > 0.05) throttle = Math.max(throttle, rt);
        if (lt > 0.05) brake = Math.max(brake, lt);
        
        if (pad.buttons[0]?.pressed) this.touchHandbrake = true;
        if (pad.buttons[2]?.pressed) throttle = Math.max(throttle, 1);
      }
    }

    actions.steer = Math.max(-1, Math.min(1, steer + this.touchSteer));
    actions.throttle = Math.max(throttle, this.touchThrottle);
    actions.brake = Math.max(brake, this.touchBrake);
    actions.boost = active.has("ShiftLeft") || active.has("ShiftRight");
    actions.handbrake = active.has("Space") || this.touchHandbrake;

<<<<<<< HEAD
    const cameraHeld = keys.has("KeyC") || keys.has("KeyV");
    const nightHeld = keys.has("KeyN");
    const mapHeld = keys.has("KeyM");
    const pauseHeld = keys.has("Escape");
    const interactHeld = keys.has("KeyE") || keys.has("KeyF") || this.touchInteract;
    const phoneHeld = keys.has("KeyP");
    const consoleHeld = keys.has("Backquote") || keys.has("F1");
    const radioHeld = keys.has("KeyR");
    const inventoryHeld = keys.has("KeyI");
    const garageHeld = keys.has("KeyG");
    const jobsHeld = keys.has("KeyJ");
    const firmHeld = keys.has("KeyK");
    const buildHeld = keys.has("KeyB");
    const rotateHeld = keys.has("KeyQ");
    const chatHeld = keys.has("KeyT");
    const sirenHeld = keys.has("KeyH");
    const gestureHeld = keys.has("KeyU");
    const surrenderHeld = keys.has("KeyX");
    this.cameraEdge = cameraHeld && !this.prevCamera;
    this.nightEdge = nightHeld && !this.prevNight;
    this.mapEdge = mapHeld && !this.prevMap;
    this.pauseEdge = pauseHeld && !this.prevPause;
    this.interactEdge = interactHeld && !this.prevInteract;
    this.phoneEdge = phoneHeld && !this.prevPhone;
    this.consoleEdge = consoleHeld && !this.prevConsole;
    this.radioEdge = radioHeld && !this.prevRadio;
    this.inventoryEdge = inventoryHeld && !this.prevInventory;
    this.garageEdge = garageHeld && !this.prevGarage;
    this.jobsEdge = jobsHeld && !this.prevJobs;
    this.firmEdge = firmHeld && !this.prevFirm;
    this.buildEdge = buildHeld && !this.prevBuild;
    this.rotateEdge = rotateHeld && !this.prevRotate;
    this.chatEdge = chatHeld && !this.prevChat;
    this.sirenEdge = sirenHeld && !this.prevSiren;
    this.gestureEdge = gestureHeld && !this.prevGesture;
    this.surrenderEdge = surrenderHeld && !this.prevSurrender;
    this.prevCamera = cameraHeld;
    this.prevNight = nightHeld;
    this.prevMap = mapHeld;
    this.prevPause = pauseHeld;
    this.prevInteract = interactHeld;
    this.prevPhone = phoneHeld;
    this.prevConsole = consoleHeld;
    this.prevRadio = radioHeld;
    this.prevInventory = inventoryHeld;
    this.prevGarage = garageHeld;
    this.prevJobs = jobsHeld;
    this.prevFirm = firmHeld;
    this.prevBuild = buildHeld;
    this.prevRotate = rotateHeld;
    this.prevChat = chatHeld;
    this.prevSiren = sirenHeld;
    this.prevGesture = gestureHeld;
    this.prevSurrender = surrenderHeld;

    const boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const handbrake = keys.has("Space") || this.touchHandbrake;

    return {
      throttle,
      brake,
      steer,
      boost,
      handbrake,
      camera: this.cameraEdge,
      night: this.nightEdge,
      map: this.mapEdge,
      pause: this.pauseEdge,
      interact: this.interactEdge,
      phone: this.phoneEdge,
      console: this.consoleEdge,
      radio: this.radioEdge,
      inventory: this.inventoryEdge,
      garage: this.garageEdge,
      jobs: this.jobsEdge,
      firm: this.firmEdge,
      build: this.buildEdge,
      rotate: this.rotateEdge,
      chat: this.chatEdge,
      siren: this.sirenEdge,
      gesture: this.gestureEdge,
      surrender: this.surrenderEdge,
=======
    // ── DÉTECTION DES TOUCHES & EDGE ──
    // Une macro simple pour traiter Held -> Edge -> Update Prev
    const checkEdge = (keyId: keyof typeof this.prev, condition: boolean) => {
      actions[keyId] = condition && !this.prev[keyId];
      this.prev[keyId] = condition;
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    };

    checkEdge("camera", active.has("KeyC") || active.has("KeyV"));
    checkEdge("night", active.has("KeyN"));
    checkEdge("map", active.has("KeyM"));
    checkEdge("pause", active.has("Escape"));
    checkEdge("interact", active.has("KeyE") || active.has("KeyF") || this.touchInteract);
    checkEdge("phone", active.has("KeyP"));
    checkEdge("console", active.has("Backquote") || active.has("F1"));
    checkEdge("radio", active.has("KeyR"));
    checkEdge("inventory", active.has("KeyI"));
    checkEdge("garage", active.has("KeyG"));
    checkEdge("jobs", active.has("KeyJ"));
    checkEdge("firm", active.has("KeyK"));
    checkEdge("build", active.has("KeyB"));
    checkEdge("rotate", active.has("KeyQ"));
    checkEdge("chat", active.has("KeyT"));
    checkEdge("siren", active.has("KeyH"));
    checkEdge("gesture", active.has("KeyU"));
    checkEdge("surrender", active.has("KeyX"));
    
    // 🔫 ARMES
    checkEdge("reload", active.has("KeyR"));
    checkEdge("equipWeapon", active.has("Digit1"));
    
    const fireHeld = this.mouseButtons.has(0);
    actions.fireHeld = fireHeld;
    checkEdge("fire", fireHeld);
    checkEdge("aim", this.mouseButtons.has(2));

    // ZERO-GC : On retourne la référence immuable. Le moteur de jeu ne doit
    // PAS faire de destructuring const { ... } = input.sample() sinon il recrée un objet.
    return actions as Readonly<Actions>;
  }

  // ============================================================================
  // UTILITAIRES
  // ============================================================================
  
  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isMouseDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  reset() {
    this.keys.clear();
    this.mouseButtons.clear();
    this.touchSteer = 0;
    this.touchThrottle = 0;
    this.touchBrake = 0;
    this.touchHandbrake = false;
    this.touchInteract = false;
    this.injectedSet = null;
  }

  /** 
   * ZERO-GC : Écrit les coordonnées relatives de la souris dans l'objet out passé en paramètre.
   * Empêche l'allocation d'un vecteur {x, y} à chaque appel.
   */
  getMousePosition(event: MouseEvent, out: { x: number; y: number }): void {
    if (!this.canvas) {
      out.x = event.clientX;
      out.y = event.clientY;
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    out.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    out.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
}

export const input = new Input();