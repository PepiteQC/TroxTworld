/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CYCLE JOUR / NUIT CONTINU — CIEL RÉALISTE QUÉBÉCOIS AVEC AURORES BORÉALES
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Système atmosphérique boréal complet :
 *  - Dôme céleste procédural (ShaderMaterial avec dégradé horizon-zénith)
 *  - Soleil physique avec halo lumineux et grossissement à l'horizon
 *  - Lune émissive avec phases lunaires dynamiques (via shader)
 *  - Aurores boréales ondulantes pour les nuits claires du Nord
 *  - Nuages instanciés flottants avec dérive éolienne réaliste
 *  - Transitions atmosphériques ultra-fluides (Aube, Aurore, Crépuscule, Nuit)
 *  - Palette de couleurs boréales québécoises (verglas, poudrerie, blizzard)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";

// ═════════════════════════════════════════════════════════════════════════════
// 1. TYPES & INTERFACES
// ═════════════════════════════════════════════════════════════════════════════

export interface SkySnap {
  hours: number;
  elev: number;
  azimuth: number;
  night: boolean;
  dawn: boolean;
  dusk: boolean;
  goldenHour: boolean;
  blueHour: boolean;

  // Éclairage hémisphérique
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  ambient: number;

  // Atmosphère
  fog: number;
  fogDensity: number;
  bg: number;
  horizonColor: number;
  zenithColor: number;

  // Soleil
  sunColor: number;
  sunIntensity: number;
  sunHaloOpacity: number;

  // Lune
  moonPhase: number;      // 0 à 1 (0 = Nouvelle, 0.5 = Pleine)
  moonOpacity: number;

  // Nuages
  cloudOpacity: number;
  cloudTint: number;
  cloudCoverage: number;

  // Aurores boréales
  auroraIntensity: number;

  // Divers
  lamp: number;
  river: number;
  starOpacity: number;
  windSpeed: number;
}

export interface SkySystem {
  root: THREE.Group;
  domeMesh: THREE.Mesh;
  sunSprite: THREE.Sprite;
  sunHalo: THREE.Sprite;
  moonSprite: THREE.Sprite;
  starsMesh: THREE.Points;
  cloudsGroup: THREE.Group;
  auroraMesh: THREE.Mesh;
  update(snap: SkySnap, dt: number): void;
  dispose(): void;
  /** Définit la journée du mois lunaire (0-29) pour la phase */
  setLunarDay(day: number): void;
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. UTILITAIRES DE COULEURS & INTERPOLATION
// ═════════════════════════════════════════════════════════════════════════════

const tmp = new THREE.Vector3();
const colA = new THREE.Color();
const colB = new THREE.Color();
const colTemp = new THREE.Color();

function lerpHex(a: number, b: number, t: number): number {
  colA.setHex(a);
  colB.setHex(b);
  return colA.lerp(colB, THREE.MathUtils.clamp(t, 0, 1)).getHex();
}

/** Interpolation cosinusoïdale douce (ease-in-out) pour transitions naturelles */
function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. CALCULS SOLAIRES & LUNAIRES
// ═════════════════════════════════════════════════════════════════════════════

export function sunElevation(hours: number): number {
  const t = (hours - 5.7) / 12.8;
  if (t <= 0 || t >= 1) return -0.35;
  return Math.sin(t * Math.PI);
}

export function sunDirection(hours: number, out = tmp): THREE.Vector3 {
  const elev = Math.max(0.045, sunElevation(hours));
  const az = ((hours - 6) / 12) * Math.PI;
  return out.set(Math.cos(az) * 0.82, -elev, Math.sin(az) * 0.52).normalize();
}

/** Position monde du soleil sur le dôme céleste */
export function sunPosition(hours: number, radius = 800): THREE.Vector3 {
  const elev = sunElevation(hours);
  const az = ((hours - 6) / 12) * Math.PI;
  return new THREE.Vector3(
    Math.cos(az) * radius * 0.9,
    elev * radius,
    Math.sin(az) * radius * 0.9
  );
}

/** Position lunaire (opposée au soleil avec léger décalage réaliste) */
export function moonPosition(hours: number, radius = 800): THREE.Vector3 {
  const moonHours = (hours + 12) % 24;
  const elev = sunElevation(moonHours);
  const az = ((moonHours - 6) / 12) * Math.PI;
  return new THREE.Vector3(
    Math.cos(az) * radius * 0.9,
    elev * radius,
    Math.sin(az) * radius * 0.9
  );
}

/** Calcule la phase lunaire (0=nouvelle, 0.5=pleine, 1=nouvelle) selon le jour du mois lunaire */
export function lunarPhase(day: number): number {
  const cycle = 29.53;
  return (day % cycle) / cycle;
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. SNAPSHOT ATMOSPHÉRIQUE (Palette de couleurs boréales québécoises)
// ═════════════════════════════════════════════════════════════════════════════

export function skySnap(hours: number, weather: string, windSpeed = 3.5, lunarDay = 15): SkySnap {
  const elev = sunElevation(hours);
  const azimuth = ((hours - 6) / 12) * Math.PI;

  const night = elev < 0.07;
  const dawn = hours >= 5.2 && hours < 7.6;
  const dusk = hours >= 17.4 && hours < 21.2;
  const goldenHour = (hours >= 5.8 && hours < 7.0) || (hours >= 18.5 && hours < 19.8);
  const blueHour = (hours >= 4.8 && hours < 5.4) || (hours >= 20.2 && hours < 20.9);

  const lamp = THREE.MathUtils.clamp(1 - (elev + 0.05) / 0.28, 0, 1);
  const moonPhase = lunarPhase(lunarDay);

  // Valeurs par défaut : journée dégagée
  let hemiSky = 0xb8d0e8;
  let hemiGround = 0x3a4a32;
  let hemiIntensity = 0.72;
  let ambient = 0.28;
  let fog = 0x8aa0a8;
  let fogDensity = 0.0018;
  let bg = 0x7a9aaa;
  let horizonColor = 0xd4c8b8;
  let zenithColor = 0x4a7ab8;
  let sunColor = 0xfff1d0;
  let sunIntensity = 1.25;
  let sunHaloOpacity = 0.4;
  let river = 0x2a4a68;
  let cloudOpacity = 0.85;
  let cloudTint = 0xf8f4e8;
  let cloudCoverage = 0.35;
  let starOpacity = 0.0;
  let moonOpacity = 0.0;
  let auroraIntensity = 0.0;

  // ─── NUIT PROFONDE ─────────────────────────────────────────────────────────
  if (night) {
    hemiSky = 0x1a2a48;
    hemiGround = 0x101820;
    hemiIntensity = 0.14;
    ambient = 0.07;
    fog = 0x0a1020;
    fogDensity = 0.0028;
    bg = 0x080e1a;
    horizonColor = 0x1a2038;
    zenithColor = 0x040614;
    sunColor = 0x8899bb;
    sunIntensity = 0.07;
    sunHaloOpacity = 0.0;
    river = 0x101c2c;
    cloudOpacity = 0.45;
    cloudTint = 0x384860;
    starOpacity = 0.95;
    moonOpacity = 0.85 * (0.5 + Math.abs(moonPhase - 0.5)); // Plus visible à pleine lune
    auroraIntensity = 0.6; // Aurores actives par défaut la nuit claire
  }
  // ─── AUBE / LEVER DU SOLEIL ────────────────────────────────────────────────
  else if (dawn) {
    const k = smoothStep(0, 1, (hours - 5.2) / 2.4);
    hemiSky = lerpHex(0x4a3048, 0xb8d0e8, k);
    hemiGround = lerpHex(0x2a2018, 0x3a4a32, k);
    hemiIntensity = 0.28 + k * 0.44;
    ambient = 0.12 + k * 0.16;
    fog = lerpHex(0x6a4860, 0x8aa0a8, k);
    fogDensity = 0.0026 - k * 0.0008;
    bg = lerpHex(0xc87858, 0x7a9aaa, k);
    horizonColor = lerpHex(0xff9060, 0xd4c8b8, k);
    zenithColor = lerpHex(0x2a3a68, 0x4a7ab8, k);
    sunColor = lerpHex(0xff8a4a, 0xfff1d0, k);
    sunIntensity = 0.35 + k * 0.9;
    sunHaloOpacity = 0.7 - k * 0.3;
    river = lerpHex(0x1a2838, 0x2a4a68, k);
    cloudTint = lerpHex(0xff9878, 0xf8f4e8, k);
    starOpacity = Math.max(0, 0.6 - k * 0.7);
    moonOpacity = Math.max(0, 0.7 - k * 0.8);
    auroraIntensity = Math.max(0, 0.5 - k * 0.7);
  }
  // ─── CRÉPUSCULE / COUCHER DU SOLEIL ────────────────────────────────────────
  else if (dusk) {
    const k = smoothStep(0, 1, (hours - 17.4) / 3.8);
    hemiSky = lerpHex(0xb8d0e8, 0x2a2448, k);
    hemiGround = lerpHex(0x3a4a32, 0x181420, k);
    hemiIntensity = 0.72 - k * 0.56;
    ambient = 0.28 - k * 0.2;
    fog = lerpHex(0x8aa0a8, 0x2a2038, k);
    fogDensity = 0.0018 + k * 0.001;
    bg = lerpHex(0xc07048, 0x140e22, k);
    horizonColor = lerpHex(0xffa068, 0x2a2440, k);
    zenithColor = lerpHex(0x4a7ab8, 0x0a0e1c, k);
    sunColor = lerpHex(0xffc070, 0x8899bb, k);
    sunIntensity = 1.15 - k * 1.05;
    sunHaloOpacity = 0.75 - k * 0.5;
    river = lerpHex(0x2a4a68, 0x101c2c, k);
    cloudTint = lerpHex(0xffb090, 0x484858, k);
    starOpacity = k * 0.85;
    moonOpacity = k * 0.75;
    auroraIntensity = k * 0.5;
  }

  // ─── MÉTÉO — MODIFICATIONS ATMOSPHÉRIQUES ──────────────────────────────────
  if (weather === "fog" || weather === "dense_fog") {
    fog = night ? 0x1a2430 : 0x9aa8b0;
    fogDensity *= 2.8;
    hemiIntensity *= 0.85;
    cloudCoverage = 0.85;
    cloudOpacity *= 0.6;
    horizonColor = lerpHex(horizonColor, fog, 0.7);
    auroraIntensity *= 0.15;
  } else if (weather === "rain" || weather === "heavy_rain") {
    hemiIntensity *= 0.72;
    fogDensity *= 1.4;
    cloudCoverage = 0.9;
    cloudTint = lerpHex(cloudTint, 0x606870, 0.6);
    if (!night) bg = 0x5a6a78;
    auroraIntensity = 0;
  } else if (weather === "thunderstorm" || weather === "storm") {
    hemiIntensity *= 0.45;
    bg = night ? 0x050810 : 0x3a4450;
    sunIntensity *= 0.4;
    fog = night ? 0x121820 : 0x6a7480;
    fogDensity *= 1.8;
    cloudCoverage = 1.0;
    cloudTint = 0x2a3038;
    cloudOpacity = 0.95;
    auroraIntensity = 0;
  } else if (weather === "blizzard" || weather === "snowstorm") {
    hemiIntensity *= 0.38;
    ambient *= 0.7;
    fog = night ? 0x1a2430 : 0xb8c4cc;
    fogDensity *= 3.5;
    bg = night ? 0x101820 : 0xa8b4bc;
    sunIntensity *= 0.22;
    hemiSky = night ? 0x1a2438 : 0xc4ced6;
    cloudCoverage = 1.0;
    cloudTint = night ? 0x384048 : 0xd0d8dc;
    cloudOpacity = 0.98;
    windSpeed *= 4.5;
    auroraIntensity = 0;
  } else if (weather === "snow" || weather === "light_snow") {
    fog = night ? 0x1a2438 : 0xc8d4dc;
    fogDensity *= 1.6;
    if (!night) bg = 0xc0c8d0;
    hemiIntensity *= 0.78;
    sunIntensity *= 0.65;
    cloudCoverage = 0.75;
    cloudTint = night ? 0x4a5560 : 0xdce4e8;
    windSpeed *= 2.0;
    auroraIntensity *= 0.3;
  } else if (weather === "poudrerie") {
    fog = 0xd8e0e6;
    fogDensity *= 2.2;
    windSpeed *= 3.5;
    cloudCoverage = 0.55;
    hemiIntensity *= 0.6;
    auroraIntensity *= 0.4;
  } else if (weather === "verglas") {
    fog = 0xa8b8c4;
    fogDensity *= 1.9;
    cloudCoverage = 0.95;
    cloudTint = 0x8898a4;
    hemiIntensity *= 0.55;
    auroraIntensity = 0;
  } else if (weather === "overcast" || weather === "cloudy") {
    cloudCoverage = 0.85;
    cloudOpacity *= 0.9;
    hemiIntensity *= 0.8;
    sunHaloOpacity *= 0.4;
    auroraIntensity *= 0.2;
  } else if (weather === "clear" || weather === "clear_night") {
    // Ciel dégagé : aurores plus visibles la nuit
    if (night) auroraIntensity = 0.85;
  }

  return {
    hours,
    elev,
    azimuth,
    night,
    dawn,
    dusk,
    goldenHour,
    blueHour,
    hemiSky,
    hemiGround,
    hemiIntensity,
    ambient,
    fog,
    fogDensity,
    bg,
    horizonColor,
    zenithColor,
    sunColor,
    sunIntensity,
    sunHaloOpacity,
    moonPhase,
    moonOpacity,
    cloudOpacity,
    cloudTint,
    cloudCoverage,
    auroraIntensity,
    lamp,
    river,
    starOpacity,
    windSpeed,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. SHADER DU DÔME CÉLESTE (Dégradé procédural horizon-zénith)
// ═════════════════════════════════════════════════════════════════════════════

const SKY_DOME_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  
  void main() {
    vNormal = normalize(normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SKY_DOME_FRAG = /* glsl */ `
  uniform vec3 uHorizonColor;
  uniform vec3 uZenithColor;
  uniform vec3 uSunPosition;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uTime;
  
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  void main() {
    vec3 dir = normalize(vWorldPos);
    
    float elevation = clamp(dir.y * 1.2, 0.0, 1.0);
    float horizonBlend = pow(1.0 - elevation, 2.5);
    
    vec3 skyColor = mix(uZenithColor, uHorizonColor, horizonBlend);
    
    vec3 sunDir = normalize(uSunPosition);
    float sunDot = max(0.0, dot(dir, sunDir));
    float sunGlow = pow(sunDot, 8.0) * 0.4;
    float sunBloom = pow(sunDot, 32.0) * 0.8;
    float sunCorona = pow(sunDot, 4.0) * 0.15;
    
    skyColor += uSunColor * (sunGlow + sunBloom + sunCorona) * uSunIntensity;
    
    float turb = noise(dir.xz * 4.0 + uTime * 0.02) * 0.015;
    skyColor += vec3(turb);
    
    skyColor = pow(skyColor, vec3(0.94));
    
    gl_FragColor = vec4(skyColor, 1.0);
  }
`;

// ═════════════════════════════════════════════════════════════════════════════
// 6. TEXTURES PROCÉDURALES (Canvas)
// ═════════════════════════════════════════════════════════════════════════════

function createSunTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255, 255, 240, 1.0)");
  grad.addColorStop(0.2, "rgba(255, 240, 200, 0.9)");
  grad.addColorStop(0.5, "rgba(255, 200, 120, 0.4)");
  grad.addColorStop(1.0, "rgba(255, 180, 80, 0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHaloTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255, 220, 160, 0.6)");
  grad.addColorStop(0.3, "rgba(255, 200, 140, 0.3)");
  grad.addColorStop(0.7, "rgba(255, 180, 100, 0.1)");
  grad.addColorStop(1.0, "rgba(255, 160, 80, 0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMoonTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;

  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(size / 2 - 20, size / 2 - 20, 20, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255, 250, 235, 1.0)");
  grad.addColorStop(0.7, "rgba(220, 220, 210, 1.0)");
  grad.addColorStop(0.95, "rgba(180, 180, 175, 0.9)");
  grad.addColorStop(1.0, "rgba(180, 180, 175, 0.0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.fill();

  // Cratères / Mers lunaires
  const craters = [
    { x: 120, y: 100, r: 22, o: 0.15 },
    { x: 145, y: 145, r: 15, o: 0.12 },
    { x: 100, y: 145, r: 12, o: 0.10 },
    { x: 165, y: 105, r: 8, o: 0.08 },
    { x: 90, y: 105, r: 10, o: 0.10 },
    { x: 130, y: 175, r: 9, o: 0.09 },
    { x: 175, y: 155, r: 6, o: 0.07 },
  ];

  for (const cr of craters) {
    const cg = ctx.createRadialGradient(cr.x, cr.y, 0, cr.x, cr.y, cr.r);
    cg.addColorStop(0, `rgba(120, 118, 115, ${cr.o + 0.15})`);
    cg.addColorStop(1, `rgba(160, 155, 150, 0)`);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCloudTexture(seed = 1): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;

  const rng = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  ctx.clearRect(0, 0, size, size);

  const puffs = 12 + Math.floor(rng(0) * 8);
  for (let i = 0; i < puffs; i++) {
    const cx = size * 0.5 + (rng(i * 3) - 0.5) * size * 0.7;
    const cy = size * 0.55 + (rng(i * 3 + 1) - 0.5) * size * 0.4;
    const r = size * (0.15 + rng(i * 3 + 2) * 0.2);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    grad.addColorStop(0.4, "rgba(255, 255, 255, 0.5)");
    grad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

/** Champ d'étoiles procédural pour le firmament nocturne */
function createStarField(count = 2500, radius = 780): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random() * 0.5 + 0.5;
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const r = radius * (0.92 + Math.random() * 0.06);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const tint = Math.random();
    if (tint < 0.6) {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
    } else if (tint < 0.85) {
      colors[i * 3] = 0.8;
      colors[i * 3 + 1] = 0.85;
      colors[i * 3 + 2] = 1.0;
    } else {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.9;
      colors[i * 3 + 2] = 0.7;
    }

    sizes[i] = Math.random() < 0.05 ? 3.5 : Math.random() < 0.2 ? 2.0 : 1.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vSize;
      void main() {
        vColor = color;
        vSize = size;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vColor;
      varying float vSize;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d);
        // Scintillement subtil pour les grosses étoiles
        float twinkle = 1.0 + sin(uTime * 3.0 + vSize * 100.0) * 0.15;
        gl_FragColor = vec4(vColor, alpha * uOpacity * twinkle);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, mat);
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. AURORES BORÉALES (Shader ondulant vert-mauve)
// ═════════════════════════════════════════════════════════════════════════════

const AURORA_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const AURORA_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  
  varying vec3 vWorldPos;
  varying vec2 vUv;
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return value;
  }
  
  void main() {
    if (uIntensity < 0.01) discard;
    
    vec2 uv = vUv;
    
    // Rideaux verticaux ondulants
    float wave1 = fbm(vec2(uv.x * 3.0 + uTime * 0.08, uv.y * 6.0));
    float wave2 = fbm(vec2(uv.x * 5.0 - uTime * 0.05, uv.y * 8.0 + uTime * 0.1));
    
    float curtain = wave1 * wave2;
    curtain = smoothstep(0.15, 0.6, curtain);
    
    // Dégradé vertical (plus intense en haut, dissipe en bas)
    float verticalFade = smoothstep(0.0, 0.3, uv.y) * (1.0 - smoothstep(0.7, 1.0, uv.y));
    
    // Couleurs : vert d'aurore avec touches de mauve/rose
    vec3 green = vec3(0.2, 1.0, 0.5);
    vec3 magenta = vec3(0.8, 0.3, 0.9);
    vec3 color = mix(green, magenta, wave2 * 0.4);
    
    float alpha = curtain * verticalFade * uIntensity * 0.7;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

function createAurora(radius = 700): THREE.Mesh {
  // Anneau plat au-dessus de l'horizon (cylindre creux inversé)
  const geo = new THREE.CylinderGeometry(radius * 0.7, radius * 0.85, 400, 64, 1, true);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    },
    vertexShader: AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 200;
  mesh.renderOrder = -940;
  return mesh;
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. NUAGES DYNAMIQUES FLOTTANTS
// ═════════════════════════════════════════════════════════════════════════════

interface CloudInstance {
  sprite: THREE.Sprite;
  angle: number;
  height: number;
  distance: number;
  scale: number;
  driftSpeed: number;
  baseOpacity: number;
}

function createClouds(count = 24): { group: THREE.Group; instances: CloudInstance[] } {
  const group = new THREE.Group();
  group.name = "clouds_layer";
  const instances: CloudInstance[] = [];

  const cloudTextures: THREE.CanvasTexture[] = [];
  for (let i = 0; i < 5; i++) {
    cloudTextures.push(createCloudTexture(i + 1));
  }

  for (let i = 0; i < count; i++) {
    const tex = cloudTextures[i % cloudTextures.length]!;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: true,
      fog: false,
    });

    const sprite = new THREE.Sprite(mat);

    const angle = Math.random() * Math.PI * 2;
    const distance = 380 + Math.random() * 200;
    const height = 180 + Math.random() * 140;
    const scale = 180 + Math.random() * 220;

    sprite.position.set(
      Math.cos(angle) * distance,
      height,
      Math.sin(angle) * distance
    );
    sprite.scale.set(scale, scale * 0.55, 1);
    sprite.renderOrder = -920;

    group.add(sprite);

    instances.push({
      sprite,
      angle,
      height,
      distance,
      scale,
      driftSpeed: 0.6 + Math.random() * 0.8,
      baseOpacity: 0.7 + Math.random() * 0.25,
    });
  }

  return { group, instances };
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. SYSTÈME CÉLESTE COMPLET (Assemblage final)
// ═════════════════════════════════════════════════════════════════════════════

export function createSkySystem(): SkySystem {
  const root = new THREE.Group();
  root.name = "sky_system";

  let currentLunarDay = 15;

  // ─── DÔME CÉLESTE ─────────────────────────────────────────────────────────
  const domeGeo = new THREE.SphereGeometry(1000, 32, 16);
  const domeMat = new THREE.ShaderMaterial({
    uniforms: {
      uHorizonColor: { value: new THREE.Color(0xd4c8b8) },
      uZenithColor: { value: new THREE.Color(0x4a7ab8) },
      uSunPosition: { value: new THREE.Vector3(0, 800, 0) },
      uSunColor: { value: new THREE.Color(0xfff1d0) },
      uSunIntensity: { value: 1.0 },
      uTime: { value: 0 },
    },
    vertexShader: SKY_DOME_VERT,
    fragmentShader: SKY_DOME_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  domeMesh.renderOrder = -1000;
  root.add(domeMesh);

  // ─── SOLEIL ───────────────────────────────────────────────────────────────
  const sunTex = createSunTexture();
  const sunMat = new THREE.SpriteMaterial({
    map: sunTex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
    fog: false,
  });
  const sunSprite = new THREE.Sprite(sunMat);
  sunSprite.scale.set(80, 80, 1);
  sunSprite.renderOrder = -900;
  root.add(sunSprite);

  // ─── HALO SOLAIRE ─────────────────────────────────────────────────────────
  const haloTex = createHaloTexture();
  const haloMat = new THREE.SpriteMaterial({
    map: haloTex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.4,
    fog: false,
  });
  const sunHalo = new THREE.Sprite(haloMat);
  sunHalo.scale.set(240, 240, 1);
  sunHalo.renderOrder = -910;
  root.add(sunHalo);

  // ─── LUNE ─────────────────────────────────────────────────────────────────
  const moonTex = createMoonTexture();
  const moonMat = new THREE.SpriteMaterial({
    map: moonTex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.0,
    fog: false,
  });
  const moonSprite = new THREE.Sprite(moonMat);
  moonSprite.scale.set(55, 55, 1);
  moonSprite.renderOrder = -890;
  root.add(moonSprite);

  // ─── ÉTOILES ──────────────────────────────────────────────────────────────
  const starsMesh = createStarField(2800, 780);
  starsMesh.renderOrder = -950;
  root.add(starsMesh);

  // ─── AURORES BORÉALES ─────────────────────────────────────────────────────
  const auroraMesh = createAurora(700);
  root.add(auroraMesh);

  // ─── NUAGES ───────────────────────────────────────────────────────────────
  const { group: cloudsGroup, instances: cloudInstances } = createClouds(28);
  root.add(cloudsGroup);

  // ─── FONCTION DE MISE À JOUR TEMPS RÉEL ───────────────────────────────────
  let elapsedTime = 0;

  function update(snap: SkySnap, dt: number) {
    elapsedTime += dt;

    // ─── Dôme céleste (interpolation douce) ────────────────────────────────
    colTemp.setHex(snap.horizonColor);
    domeMat.uniforms.uHorizonColor.value.lerp(colTemp, Math.min(1, dt * 3));

    colTemp.setHex(snap.zenithColor);
    domeMat.uniforms.uZenithColor.value.lerp(colTemp, Math.min(1, dt * 3));

    colTemp.setHex(snap.sunColor);
    domeMat.uniforms.uSunColor.value.lerp(colTemp, Math.min(1, dt * 3));

    domeMat.uniforms.uSunIntensity.value = THREE.MathUtils.lerp(
      domeMat.uniforms.uSunIntensity.value,
      snap.sunIntensity * 0.8,
      Math.min(1, dt * 3)
    );
    domeMat.uniforms.uTime.value = elapsedTime;

    const sunPos = sunPosition(snap.hours);
    domeMat.uniforms.uSunPosition.value.copy(sunPos);

    // ─── Soleil (grossissement à l'horizon) ────────────────────────────────
    sunSprite.position.copy(sunPos);
    sunSprite.material.color.setHex(snap.sunColor);
    sunSprite.material.opacity = THREE.MathUtils.clamp(snap.sunIntensity * 1.2, 0, 1);

    // Effet atmosphérique : le soleil paraît plus gros près de l'horizon
    const horizonBoost = 1 + Math.pow(1 - Math.max(0, snap.elev), 2) * 0.6;
    const sunScale = 80 * horizonBoost;
    sunSprite.scale.set(sunScale, sunScale, 1);

    // ─── Halo solaire ──────────────────────────────────────────────────────
    sunHalo.position.copy(sunPos);
    sunHalo.material.color.setHex(snap.sunColor);
    sunHalo.material.opacity = snap.sunHaloOpacity;
    const haloScale = (220 + Math.max(0, snap.sunIntensity) * 80) * horizonBoost;
    sunHalo.scale.set(haloScale, haloScale, 1);

    // ─── Lune ──────────────────────────────────────────────────────────────
    const moonPos = moonPosition(snap.hours);
    moonSprite.position.copy(moonPos);
    moonSprite.material.opacity = snap.moonOpacity;
    // Taille variable selon la phase (plus visible à pleine lune)
    const moonScale = 45 + snap.moonPhase * 20;
    moonSprite.scale.set(moonScale, moonScale, 1);

    // ─── Étoiles ───────────────────────────────────────────────────────────
    const starMat = starsMesh.material as THREE.ShaderMaterial;
    starMat.uniforms.uOpacity.value = snap.starOpacity;
    starMat.uniforms.uTime.value = elapsedTime;
    starsMesh.rotation.y += dt * 0.002;

    // ─── Aurores boréales ──────────────────────────────────────────────────
    const auroraMat = auroraMesh.material as THREE.ShaderMaterial;
    auroraMat.uniforms.uTime.value = elapsedTime;
    auroraMat.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      auroraMat.uniforms.uIntensity.value,
      snap.auroraIntensity,
      Math.min(1, dt * 2)
    );

    // ─── Nuages dynamiques ─────────────────────────────────────────────────
    const wind = snap.windSpeed / 800;
    for (const cloud of cloudInstances) {
      cloud.angle += wind * cloud.driftSpeed * dt;
      if (cloud.angle > Math.PI * 2) cloud.angle -= Math.PI * 2;

      cloud.sprite.position.x = Math.cos(cloud.angle) * cloud.distance;
      cloud.sprite.position.z = Math.sin(cloud.angle) * cloud.distance;
      cloud.sprite.position.y = cloud.height + Math.sin(elapsedTime * 0.3 + cloud.angle * 3) * 4;

      const targetOpacity = cloud.baseOpacity * snap.cloudCoverage * snap.cloudOpacity;
      const mat = cloud.sprite.material as THREE.SpriteMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, Math.min(1, dt * 2.5));
      mat.color.lerp(colA.setHex(snap.cloudTint), Math.min(1, dt * 2.5));
    }
  }

  function setLunarDay(day: number) {
    currentLunarDay = day;
  }

  function dispose() {
    domeGeo.dispose();
    domeMat.dispose();
    sunTex.dispose();
    sunMat.dispose();
    haloTex.dispose();
    haloMat.dispose();
    moonTex.dispose();
    moonMat.dispose();
    (starsMesh.geometry as THREE.BufferGeometry).dispose();
    (starsMesh.material as THREE.ShaderMaterial).dispose();
    (auroraMesh.geometry as THREE.BufferGeometry).dispose();
    (auroraMesh.material as THREE.ShaderMaterial).dispose();
    cloudInstances.forEach((c) => {
      (c.sprite.material as THREE.SpriteMaterial).map?.dispose();
      c.sprite.material.dispose();
    });
    root.clear();
  }

  return {
    root,
    domeMesh,
    sunSprite,
    sunHalo,
    moonSprite,
    starsMesh,
    cloudsGroup,
    auroraMesh,
    update,
    dispose,
    setLunarDay,
  };
}