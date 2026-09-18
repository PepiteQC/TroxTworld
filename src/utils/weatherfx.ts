/**
 * ═════════════════════════════════════════════════════════════════════════════
 * PRÉCIPITATIONS GPU & PHYSIOLOGIE CLIMATIQUE BORÉALE — PORTNEUF RP
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Moteur météo physique et clinique accéléré par le GPU :
 *  - Pluie battante avec étirement cinématique (Motion Blur) sur GPU.
 *  - Flocons de neige scintillants avec oscillation sinusoïdale sur GPU.
 *  - Poudrerie basse ondulante (swirling ground drift) sur GPU.
 *  - Intégration PBR de la couverture de neige de la Route 138 (matLib).
 *  - Refroidissement éolien d'Environnement Canada & États métaboliques.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { getTerrainHeight, ROADS, type RoadDef } from "./worlddata";
import { sampleRoad } from "./roads";
import { matLib } from "./materials";
import type { WeatherCondition } from "./rpSchema";

// --- CONFIGURATION SYSTÈME (GPU Bounded) ---
const SNOW_PARTICLE_COUNT = 8000;      // Beaucoup plus de particules grâce au GPU !
const BLOWING_SNOW_COUNT = 3000;
const RAIN_PARTICLE_COUNT = 6000;
const BOUNDING_BOX_SIZE = 50.0;        // Volume d'effet (mètres)

// --- CONSTANTES PHYSIOLOGIQUES HUMAINES ---
const BODY_TEMP_NORMAL = 37.0;
const TEMP_HYPOTHERMIA_MILD = 35.0;
const TEMP_HYPOTHERMIA_CRITICAL = 32.0;
const WETNESS_EVAPORATION_RATE = 4.5;

export interface WeatherRPState {
  bodyTemp: number;
  wetness: number;
  windChillCelsius: number;
  tractionMultiplier: number;
  movementSpeedMul: number;
  visibilityMultiplier: number;
  isHypothermic: boolean;
  shiverIntensity: number;
  frostbiteTimer: number;
}

/** Formule officielle du refroidissement éolien d'Environnement Canada */
function calculateWindChill(tempAir: number, windKmH: number): number {
  if (tempAir > 10 || windKmH < 4.8) return tempAir;
  const v016 = Math.pow(windKmH, 0.16);
  return 13.12 + 0.6215 * tempAir - 11.37 * v016 + 0.3965 * tempAir * v016;
}

/* =========================================================================
   GÉNÉRATION DES TEXTURES DES PARTICULES (Canvas 2D)
   ========================================================================= */

function createSnowflakeTexture(): THREE.CanvasTexture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.2, "rgba(235, 245, 255, 0.9)");
  grad.addColorStop(0.5, "rgba(235, 245, 255, 0.3)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createRaindropTexture(): THREE.CanvasTexture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size * 2; // Goutte étirée verticalement
  const ctx = canvas.getContext("2d")!;
  
  const grad = ctx.createLinearGradient(size/2, 0, size/2, size * 2);
  grad.addColorStop(0, "rgba(180, 200, 220, 0.0)");
  grad.addColorStop(0.7, "rgba(200, 220, 240, 0.8)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size * 2);
  return new THREE.CanvasTexture(canvas);
}

function createBlowingSnowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, "rgba(225, 240, 255, 0.4)");
  grad.addColorStop(0.4, "rgba(225, 240, 255, 0.15)");
  grad.addColorStop(1, "rgba(225, 240, 255, 0.0)");
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/* =========================================================================
   SHADERS GPU POUR LES EFFETS MÉTÉO (Infinite Performance)
   ========================================================================= */

const WEATHER_VERT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uPlayerPos;
  uniform vec3 uWind;
  uniform float uBoxSize;
  uniform float uFallSpeed;
  uniform float uWobbleStrength;

  attribute float aSpeed;
  attribute vec3 aRandom;

  varying float vAlpha;
  varying float vSparkle;

  void main() {
    vec3 pos = position;
    float halfBox = uBoxSize * 0.5;

    // Calcul de la chute avec vitesse individuelle
    pos.y -= uTime * uFallSpeed * aSpeed;

    // Application de la dérive éolienne
    pos.x += uWind.x * uTime * aSpeed * 0.2;
    pos.z += uWind.z * uTime * aSpeed * 0.2;

    // Balancement sinusoïdal (Wobble) pour la neige
    if (uWobbleStrength > 0.01) {
      pos.x += sin(uTime * 2.5 + aRandom.x * 100.0) * uWobbleStrength * aSpeed;
      pos.z += cos(uTime * 2.0 + aRandom.y * 100.0) * uWobbleStrength * aSpeed;
    }

    // Wrapping infini autour du joueur sur le GPU !
    pos.x = mod(pos.x - uPlayerPos.x + halfBox, uBoxSize) - halfBox + uPlayerPos.x;
    pos.z = mod(pos.z - uPlayerPos.z + halfBox, uBoxSize) - halfBox + uPlayerPos.z;
    pos.y = mod(pos.y - uPlayerPos.y + 2.0, 22.0) - 2.0 + uPlayerPos.y; // Box de 20m de haut

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Taille des particules atténuée par la distance (Perspective)
    gl_PointSize = (12.0 / -mvPosition.z) * (1.0 + aRandom.z * 0.5);

    // Dégradé pour effacer proprement les particules aux limites de la boîte
    float distFromPlayer = length(pos.xz - uPlayerPos.xz);
    vAlpha = smoothstep(halfBox, halfBox * 0.7, distFromPlayer) * uOpacity;
    
    // Fondu vertical (haut/bas)
    vAlpha *= smoothstep(uPlayerPos.y - 2.0, uPlayerPos.y + 1.0, pos.y);

    // Scintillement des flocons
    vSparkle = 1.0 + sin(uTime * 5.0 + aRandom.z * 10.0) * 0.15;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const WEATHER_FRAG_SHADER = /* glsl */ `
  uniform sampler2D uTexture;
  varying float vAlpha;
  varying float vSparkle;

  void main() {
    if (vAlpha < 0.01) discard;
    vec4 texColor = texture2D(uTexture, gl_PointCoord);
    gl_FragColor = vec4(texColor.rgb * vSparkle, texColor.a * vAlpha);
  }
`;

/* =========================================================================
   GESTIONNAIRE PRINCIPAL DE LA MÉTÉO (WeatherFx)
   ========================================================================= */

export class WeatherFx {
  public readonly group = new THREE.Group();
  public rpState: WeatherRPState;
  public onRPStateChange?: (state: WeatherRPState) => void;

  private snow: THREE.Points;
  private drift: THREE.Points;
  private rain: THREE.Points;
  private cover: THREE.Mesh | null = null;

  // Cibles d'opacité pour les transitions fluides (fade-in / fade-out)
  private targetSnowOpacity = 0;
  private targetDriftOpacity = 0;
  private targetRainOpacity = 0;

  private currentSnowOpacity = 0;
  private currentDriftOpacity = 0;
  private currentRainOpacity = 0;

  private condition: WeatherCondition = "clear";
  private snowCm = 0;
  private windSpeedKmh = 12;
  private airTempCelsius = -5;

  constructor() {
    this.group.name = "weather-fx";

    // Initialisation de la physiologie
    this.rpState = {
      bodyTemp: BODY_TEMP_NORMAL,
      wetness: 0,
      windChillCelsius: -5,
      tractionMultiplier: 1.0,
      movementSpeedMul: 1.0,
      visibilityMultiplier: 1.0,
      isHypothermic: false,
      shiverIntensity: 0.0,
      frostbiteTimer: 600,
    };

    // ─── 1. INITIALISATION DU SYSTÈME DE NEIGE GPU ─────────────────────────
    const snowGeo = this.buildGPUGeometry(SNOW_PARTICLE_COUNT);
    const snowTex = createSnowflakeTexture();
    const snowMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPlayerPos: { value: new THREE.Vector3() },
        uWind: { value: new THREE.Vector3() },
        uBoxSize: { value: BOUNDING_BOX_SIZE },
        uFallSpeed: { value: 2.2 },
        uWobbleStrength: { value: 0.4 },
        uTexture: { value: snowTex },
      },
      vertexShader: WEATHER_VERT_SHADER,
      fragmentShader: WEATHER_FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.snow = new THREE.Points(snowGeo, snowMat);
    this.snow.frustumCulled = false;

    // ─── 2. INITIALISATION DE LA POUDRERIE BASSE GPU ───────────────────────
    const driftGeo = this.buildGPUGeometry(BLOWING_SNOW_COUNT, true);
    const driftTex = createBlowingSnowTexture();
    const driftMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPlayerPos: { value: new THREE.Vector3() },
        uWind: { value: new THREE.Vector3() },
        uBoxSize: { value: BOUNDING_BOX_SIZE },
        uFallSpeed: { value: 0.1 }, // Reste au ras du sol
        uWobbleStrength: { value: 0.8 },
        uTexture: { value: driftTex },
      },
      vertexShader: WEATHER_VERT_SHADER,
      fragmentShader: WEATHER_FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.drift = new THREE.Points(driftGeo, driftMat);
    this.drift.frustumCulled = false;

    // ─── 3. INITIALISATION DE LA PLUIE GPU ─────────────────────────────────
    const rainGeo = this.buildGPUGeometry(RAIN_PARTICLE_COUNT);
    const rainTex = createRaindropTexture();
    const rainMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPlayerPos: { value: new THREE.Vector3() },
        uWind: { value: new THREE.Vector3() },
        uBoxSize: { value: BOUNDING_BOX_SIZE },
        uFallSpeed: { value: 24.0 }, // Chute très rapide
        uWobbleStrength: { value: 0.05 },
        uTexture: { value: rainTex },
      },
      vertexShader: WEATHER_VERT_SHADER,
      fragmentShader: WEATHER_FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.rain = new THREE.Points(rainGeo, rainMat);
    this.rain.frustumCulled = false;

    this.group.add(this.snow, this.drift, this.rain);
    this.buildRoadSnowCover();
  }

  /**
   * Construit les buffers de géométrie statiques requis pour les calculs GPU.
   */
  private buildGPUGeometry(count: number, isDrift = false): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const randoms = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Position initiale aléatoire dans le volume d'effet
      positions[idx] = (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
      positions[idx + 1] = isDrift ? Math.random() * 1.5 : Math.random() * 20.0;
      positions[idx + 2] = (Math.random() - 0.5) * BOUNDING_BOX_SIZE;

      speeds[i] = 0.6 + Math.random() * 0.8;

      randoms[idx] = Math.random();
      randoms[idx + 1] = Math.random();
      randoms[idx + 2] = Math.random();
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 3));
    return geo;
  }

  /** Met à jour la cible d'intensité des précipitations et configure la physiologie */
  public apply(wx: any, snowAccumulationCm = 0, windSpeedKmh = 12, tempCelsius = -5) {
    if (wx && typeof wx === "object") {
      this.condition = wx.condition ?? wx.weather ?? "clear";
      this.snowCm = wx.snowAccumulationCm ?? (wx.snowDepthMeters ? wx.snowDepthMeters * 100 : 0);
      this.windSpeedKmh = wx.windSpeedKmH ?? wx.windSpeedKmh ?? 12;
      this.airTempCelsius = wx.temperatureCelsius ?? wx.ambientTempCelsius ?? -5;
    } else {
      this.condition = wx ?? "clear";
      this.snowCm = snowAccumulationCm;
      this.windSpeedKmh = windSpeedKmh;
      this.airTempCelsius = tempCelsius;
    }

    const isSnowing =
      this.condition === "light_snow" ||
      this.condition === "blizzard" ||
      this.condition === "poudrerie" ||
      (this.condition as any) === "snow" ||
      (this.condition as any) === "snowstorm";

    const isRaining =
      this.condition === "light_rain" ||
      this.condition === "heavy_rain" ||
      this.condition === "thunderstorm" ||
      (this.condition as any) === "rain";

    const isVerglas = this.condition === "verglas";

    // Configuration des opacités cibles pour le blending fluide
    this.targetSnowOpacity = isSnowing ? 0.9 : isVerglas ? 0.45 : 0;
    this.targetDriftOpacity = (isSnowing && this.windSpeedKmh > 24) || this.condition === "poudrerie" ? 0.6 : 0;
    this.targetRainOpacity = isRaining ? 0.75 : isVerglas && this.airTempCelsius >= -2 ? 0.35 : 0;

    // Visualisation progressive de l'enneigement de la Route 138
    if (this.cover) {
      const mat = this.cover.material as THREE.Material;
      const progress = Math.min(0.9, this.snowCm / 32);
      this.cover.visible = progress > 0.05;
      mat.opacity = progress;
    }

    // Refroidissement éolien d'Environnement Canada
    this.rpState.windChillCelsius = calculateWindChill(this.airTempCelsius, this.windSpeedKmh);

    // Ajustement de l'adhérence (Sûreté du Québec / SAAQ)
    if (isVerglas) {
      this.rpState.tractionMultiplier = 0.15; // Glace noire critique
    } else if (this.snowCm > 15) {
      this.rpState.tractionMultiplier = 0.42; // Neige profonde non déblayée
    } else if (this.snowCm > 3) {
      this.rpState.tractionMultiplier = 0.68;
    } else if (isRaining) {
      this.rpState.tractionMultiplier = 0.85; // Chaussée mouillée
    } else {
      this.rpState.tractionMultiplier = 1.0;
    }

    // Calcul de la pénalité de visibilité
    if (this.condition === "blizzard" || (this.condition as any) === "snowstorm") {
      this.rpState.visibilityMultiplier = 0.12; // Blanc total (Whiteout)
    } else if (this.condition === "poudrerie") {
      this.rpState.visibilityMultiplier = 0.42;
    } else if (this.condition === "heavy_rain" || this.condition === "thunderstorm") {
      this.rpState.visibilityMultiplier = 0.62;
    } else {
      this.rpState.visibilityMultiplier = 1.0;
    }
  }

  /** Met à jour les positions (sur GPU) et calcule la physiologie (sur CPU) */
  public tick(dt: number, playerPos: THREE.Vector3, isIndoor: boolean) {
    this.group.visible = !isIndoor;

    // Simulation de la physiologie thermique
    this.updateBiologicalState(dt, isIndoor);

    if (isIndoor) return;

    // Interpolation (blending) pour des transitions météo ultra-douces
    const blendFactor = dt * 1.5;
    this.currentSnowOpacity = THREE.MathUtils.lerp(this.currentSnowOpacity, this.targetSnowOpacity, blendFactor);
    this.currentDriftOpacity = THREE.MathUtils.lerp(this.currentDriftOpacity, this.targetDriftOpacity, blendFactor);
    this.currentRainOpacity = THREE.MathUtils.lerp(this.currentRainOpacity, this.targetRainOpacity, blendFactor);

    // Vecteur de force du vent
    const windAngle = this.windSpeedKmh * 0.015;
    const windVec = new THREE.Vector3(
      Math.sin(windAngle) * (this.windSpeedKmh * 0.12),
      0,
      Math.cos(windAngle) * (this.windSpeedKmh * 0.08)
    );

    // Envoi des uniforms aux Shaders GPU
    if (this.currentSnowOpacity > 0.01) {
      this.snow.visible = true;
      const mat = this.snow.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value += dt;
      mat.uniforms.uOpacity.value = this.currentSnowOpacity;
      mat.uniforms.uPlayerPos.value.copy(playerPos);
      mat.uniforms.uWind.value.copy(windVec);
    } else {
      this.snow.visible = false;
    }

    if (this.currentDriftOpacity > 0.01) {
      this.drift.visible = true;
      const mat = this.drift.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value += dt;
      mat.uniforms.uOpacity.value = this.currentDriftOpacity;
      mat.uniforms.uPlayerPos.value.copy(playerPos);
      mat.uniforms.uWind.value.copy(windVec);
    } else {
      this.drift.visible = false;
    }

    if (this.currentRainOpacity > 0.01) {
      this.rain.visible = true;
      const mat = this.rain.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value += dt;
      mat.uniforms.uOpacity.value = this.currentRainOpacity;
      mat.uniforms.uPlayerPos.value.copy(playerPos);
      // La pluie s'incline fortement sous le vent
      mat.uniforms.uWind.value.copy(windVec).multiplyScalar(2.5);
    } else {
      this.rain.visible = false;
    }
  }

  /** Métabolisme et thermique corporelle */
  private updateBiologicalState(dt: number, isIndoor: boolean) {
    const isCold = this.rpState.windChillCelsius < 0;
    const isFreezing = this.rpState.windChillCelsius <= -15;
    const isRaining = this.condition === "light_rain" || this.condition === "heavy_rain" || this.condition === "thunderstorm";
    const isSnowing = this.condition === "light_snow" || this.condition === "blizzard" || this.condition === "poudrerie" || this.condition === "verglas";

    // Humidité des vêtements
    if (isIndoor) {
      this.rpState.wetness = Math.max(0, this.rpState.wetness - dt * WETNESS_EVAPORATION_RATE * 2.2);
    } else if (isRaining) {
      const rainIntensity = this.condition === "heavy_rain" || this.condition === "thunderstorm" ? 12 : 5;
      this.rpState.wetness = Math.min(100, this.rpState.wetness + dt * rainIntensity);
    } else if (isSnowing && this.airTempCelsius > -2) {
      this.rpState.wetness = Math.min(100, this.rpState.wetness + dt * 2.8);
    } else {
      const windDrying = (this.windSpeedKmh / 50) * 1.5;
      this.rpState.wetness = Math.max(0, this.rpState.wetness - dt * (WETNESS_EVAPORATION_RATE * 0.4 + windDrying));
    }

    // Déperdition thermique corporelle
    if (!isIndoor && isCold) {
      let heatLoss = 0.08 * dt;
      if (this.rpState.wetness > 15) {
        heatLoss += (this.rpState.wetness / 100) * 0.35 * dt; // Conductivité de l'eau
      }
      if (this.rpState.windChillCelsius < -10) {
        heatLoss += (Math.abs(this.rpState.windChillCelsius) / 45) * 0.15 * dt;
      }
      this.rpState.bodyTemp = Math.max(28.0, this.rpState.bodyTemp - heatLoss);
    } else if (isIndoor) {
      this.rpState.bodyTemp = Math.min(BODY_TEMP_NORMAL, this.rpState.bodyTemp + dt * 0.42);
    }

    // États cliniques d'hypothermie
    this.rpState.isHypothermic = this.rpState.bodyTemp < TEMP_HYPOTHERMIA_MILD;

    // Grelottement musculaire (Shivering)
    if (this.rpState.bodyTemp < BODY_TEMP_NORMAL - 0.5) {
      this.rpState.shiverIntensity = THREE.MathUtils.clamp(
        (BODY_TEMP_NORMAL - this.rpState.bodyTemp) / (BODY_TEMP_NORMAL - TEMP_HYPOTHERMIA_CRITICAL),
        0.0,
        1.0
      );
    } else {
      this.rpState.shiverIntensity = 0;
    }

    // Engelures (Frostbite)
    if (!isIndoor && isFreezing) {
      const frostbiteSpeed = (Math.abs(this.rpState.windChillCelsius) / 30) * (1 + this.rpState.wetness * 0.02);
      this.rpState.frostbiteTimer = Math.max(0, this.rpState.frostbiteTimer - dt * frostbiteSpeed);
    } else {
      this.rpState.frostbiteTimer = Math.min(600, this.rpState.frostbiteTimer + dt * 4.0);
    }

    // Vitesse de déplacement physique (pénibilité de marche)
    let motorReduction = 1.0;
    if (this.snowCm > 25) {
      motorReduction -= 0.35; // Neige profonde aux genoux
    } else if (this.snowCm > 8) {
      motorReduction -= 0.18;
    }

    if (this.rpState.isHypothermic) {
      motorReduction -= 0.35 * this.rpState.shiverIntensity;
    }
    if (this.rpState.bodyTemp < TEMP_HYPOTHERMIA_CRITICAL) {
      motorReduction -= 0.4;
    }

    this.rpState.movementSpeedMul = Math.max(0.18, motorReduction);

    this.notifyRPChange();
  }

  private notifyRPChange() {
    if (this.onRPStateChange) {
      this.onRPStateChange(this.rpState);
    }
  }

  public dispose() {
    this.snow.geometry.dispose();
    (this.snow.material as THREE.Material).dispose();
    this.drift.geometry.dispose();
    (this.drift.material as THREE.Material).dispose();
    this.rain.geometry.dispose();
    (this.rain.material as THREE.Material).dispose();
    if (this.cover) {
      this.cover.geometry.dispose();
      (this.cover.material as THREE.Material).dispose();
    }
  }

  private buildRoadSnowCover() {
    const mainHighway = ROADS.find((r) => r.id === "r138");
    if (!mainHighway) return;
    const mesh = generateSnowRibbon(mainHighway);
    mesh.visible = false;
    this.cover = mesh;
    this.group.add(mesh);
  }
}

/** Génère un liseré géométrique de neige surélevé de 5cm pour recouvrir la Route 138 */
function generateSnowRibbon(road: RoadDef): THREE.Mesh {
  const points = road.points.map(([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z) + 0.05, z));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  
  const segments = 96;
  const samples = curve.getPoints(segments);
  const halfWidth = road.width * 0.51;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < samples.length; i++) {
    const s = i < samples.length - 1 ? sampleRoad(road, i / (samples.length - 1)) : sampleRoad(road, 1);
    const pt = samples[i]!;
    
    const nx = -s.tz;
    const nz = s.tx;

    positions.push(
      pt.x - nx * halfWidth, pt.y, pt.z - nz * halfWidth,
      pt.x + nx * halfWidth, pt.y, pt.z + nz * halfWidth
    );

    if (i < samples.length - 1) {
      const baseIdx = i * 2;
      indices.push(
        baseIdx, baseIdx + 1, baseIdx + 2, 
        baseIdx + 1, baseIdx + 3, baseIdx + 2
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Utilisation directe du matériau PBR de neige réaliste !
  const mat = matLib.snow();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "snow-cover-138";
  mesh.renderOrder = 2; // Rendu après l'asphalte
  return mesh;
}