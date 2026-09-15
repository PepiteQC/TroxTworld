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
]);

function radialDeadzone(x: number, y: number, dz = 0.16) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export class Input {
  keys = new Set<string>();
  injectedKeys: string[] | null = null;
  touchSteer = 0;
  touchThrottle = 0;
  touchBrake = 0;
  touchHandbrake = false;
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
  touchInteract = false;
  private attached = false;

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.onVis);
  }

  detach() {
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.onVis);
    this.attached = false;
    this.keys.clear();
  }

  private onDown = (e: KeyboardEvent) => {
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

  private onUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private clear = () => {
    this.keys.clear();
  };

  private onVis = () => {
    if (document.hidden) this.keys.clear();
  };

  setInjected(codes: string[] | null) {
    this.injectedKeys = codes && codes.length ? codes : null;
  }

  sample(): Actions {
    const keys = this.injectedKeys ? new Set(this.injectedKeys) : this.keys;
    let steer = 0;
    let throttle = 0;
    let brake = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) steer += 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) steer -= 1;
    if (keys.has("KeyW") || keys.has("ArrowUp") || keys.has("KeyZ")) throttle = 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) brake = 1;

    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad || pad.mapping !== "standard") continue;
      const stick = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      steer += -stick.x;
      if (stick.y < -0.2) throttle = Math.max(throttle, -stick.y);
      if (stick.y > 0.2) brake = Math.max(brake, stick.y);
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      if (rt > 0.05) throttle = Math.max(throttle, rt);
      if (lt > 0.05) brake = Math.max(brake, lt);
      if (pad.buttons[0]?.pressed) this.touchHandbrake = true;
      if (pad.buttons[2]?.pressed) throttle = Math.max(throttle, 1);
    }

    steer = Math.max(-1, Math.min(1, steer + this.touchSteer));
    throttle = Math.max(throttle, this.touchThrottle);
    brake = Math.max(brake, this.touchBrake);

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
    };
  }
}

export const input = new Input();
