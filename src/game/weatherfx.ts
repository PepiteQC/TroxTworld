/**
 * ═════════════════════════════════════════════════════════════════════════════
 * PRÉCIPITATIONS 3D & PHYSIOLOGIE CLIMATIQUE — QUEBEC RP
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Gestionnaire météo physique et clinique pour la MRC de Portneuf :
 *  - Rendu 3D de pluie battante, neige lourde, poudrerie basse et verglas.
 *  - Textures de particules générées dynamiquement (Canvas) pour un rendu doux.
 *  - Formule officielle de Refroidissement Éolien (Wind Chill) d'Environnement Canada.
 *  - Modélisation physiologique : Température interne, engelures, grelottements,
 *    vitesse de séchage et adhérence des pneus SAAQ sur la Route 138.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { getTerrainHeight, ROADS, type RoadDef } from "./worlddata";
import { sampleRoad } from "./roads";
import type { QuebecSeason, WeatherCondition } from "./rpSchema";

// --- CONFIGURATION SYSTÈME ---
const SNOW_PARTICLE_COUNT = 1800;
const BLOWING_SNOW_COUNT = 900;  // Poudrerie basse
const RAIN_PARTICLE_COUNT = 1200;
const BOUNDING_BOX_SIZE = 45;    // Zone d'effet autour du joueur (mètres)

// --- CONSTANTES PHYSIOLOGIQUES HUMAINES ---
const BODY_TEMP_NORMAL = 37.0;
const TEMP_HYPOTHERMIA_MILD = 35.0;     // Frissons intenses, engourdissement
const TEMP_HYPOTHERMIA_CRITICAL = 32.0; // Perte de conscience imminente
const WETNESS_EVAPORATION_RATE = 4.5;   // Vitesse de séchage de base ($%/s$)

export interface WeatherRPState {
  bodyTemp: number;             // Température corporelle interne (°C)
  wetness: number;              // Taux d'humidité des vêtements (0 à 100%)
  windChillCelsius: number;     // Température ressentie réelle d'Environnement Canada
  tractionMultiplier: number;   // Adhérence au sol (1.0 = sec, 0.15 = glace noire)
  movementSpeedMul: number;     // Pénalité de marche physique (froid/neige creuse)
  visibilityMultiplier: number; // Coefficient de vision (blanc total en blizzard)
  isHypothermic: boolean;       // État d'hypothermie actif
  shiverIntensity: number;      // Intensité du grelottement (0.0 à 1.0)
  frostbiteTimer: number;       // Temps restant avant gelures graves (secondes)
}

/** Formule officielle du refroidissement éolien d'Environnement Canada */
function calculateWindChill(tempAir: number, windKmH: number): number {
  if (tempAir > 10 || windKmH < 4.8) return tempAir;
  const v016 = Math.pow(windKmH, 0.16);
  return 13.12 + 0.6215 * tempAir - 11.37 * v016 + 0.3965 * tempAir * v016;
}

function wrapCoordinate(val: number, center: number, range: number): number {
  let d = val - center;
  if (d > range) return val - range * 2;
  if (d < -range) return val + range * 2;
  return val;
}

// ─── GÉNÉRATION PROCÉDURALE DE TEXTURES DE PRÉCIPITATION ─────────────────────

function createSnowflakeTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.3, "rgba(240, 245, 255, 0.8)");
  grad.addColorStop(0.7, "rgba(240, 245, 255, 0.2)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createBlowingSnowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  
  // Forme oblongue étirée horizontalement par le vent
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, "rgba(220, 235, 255, 0.45)");
  grad.addColorStop(0.5, "rgba(220, 235, 255, 0.15)");
  grad.addColorStop(1, "rgba(220, 235, 255, 0.0)");
  
  ctx.fillStyle = grad;
  ctx.save();
  ctx.translate(size/2, size/2);
  ctx.scale(2.5, 0.6); // Effet de traînée horizontale de poudrerie
  ctx.beginPath();
  ctx.arc(0, 0, size/4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  return new THREE.CanvasTexture(canvas);
}

export class WeatherFx {
  group = new THREE.Group();
  
  private snow: THREE.Points;
  private drift: THREE.Points;
  private rain: THREE.LineSegments;
  private cover: THREE.Mesh | null = null;
  
  private snowPos: Float32Array;
  private snowVel: Float32Array;
  private snowWobble: Float32Array; // Effet de balancement des flocons
  private driftPos: Float32Array;
  private rainPos: Float32Array;
  
  private condition: WeatherCondition = "clear";
  private snowCm = 0;
  private windSpeedKmh = 12;
  private airTempCelsius = -5;

  public rpState: WeatherRPState = {
    bodyTemp: BODY_TEMP_NORMAL,
    wetness: 0,
    windChillCelsius: -5,
    tractionMultiplier: 1.0,
    movementSpeedMul: 1.0,
    visibilityMultiplier: 1.0,
    isHypothermic: false,
    shiverIntensity: 0.0,
    frostbiteTimer: 600, // 10 minutes avant gelures critiques
  };

  public onRPStateChange?: (state: WeatherRPState) => void;

  constructor() {
    this.group.name = "weather-fx";

    const halfBox = BOUNDING_BOX_SIZE / 2;

    // ─── 1. CONFIGURATION DE LA NEIGE ──────────────────────────────────────
    this.snowPos = new Float32Array(SNOW_PARTICLE_COUNT * 3);
    this.snowVel = new Float32Array(SNOW_PARTICLE_COUNT);
    this.snowWobble = new Float32Array(SNOW_PARTICLE_COUNT);
    
    this.scatterParticles(this.snowPos, SNOW_PARTICLE_COUNT, 22);
    for (let i = 0; i < SNOW_PARTICLE_COUNT; i++) {
      this.snowVel[i] = 1.8 + Math.random() * 2.5; // Chute douce réaliste
      this.snowWobble[i] = Math.random() * Math.PI * 2;
    }

    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute("position", new THREE.BufferAttribute(this.snowPos, 3));
    
    const snowTex = createSnowflakeTexture();
    this.snow = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({
        map: snowTex,
        size: 0.38,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.NormalBlending,
        fog: true,
      }),
    );
    this.snow.visible = false;
    this.snow.frustumCulled = false;

    // ─── 2. CONFIGURATION DE LA POUDRERIE BASSE ─────────────────────────────
    this.driftPos = new Float32Array(BLOWING_SNOW_COUNT * 3);
    this.scatterParticles(this.driftPos, BLOWING_SNOW_COUNT, 1.2); // Reste au ras du sol
    
    const driftGeo = new THREE.BufferGeometry();
    driftGeo.setAttribute("position", new THREE.BufferAttribute(this.driftPos, 3));
    
    const driftTex = createBlowingSnowTexture();
    this.drift = new THREE.Points(
      driftGeo,
      new THREE.PointsMaterial({
        map: driftTex,
        size: 1.6,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
    );
    this.drift.visible = false;
    this.drift.frustumCulled = false;

    // ─── 3. CONFIGURATION DE LA PLUIE (LineSegments) ────────────────────────
    this.rainPos = new Float32Array(RAIN_PARTICLE_COUNT * 6);
    this.scatterRainfall(0, 0, 16);
    
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({
        color: 0x768a9b,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.NormalBlending,
        fog: true,
      }),
    );
    this.rain.visible = false;
    this.rain.frustumCulled = false;

    // Assemblage final
    this.group.add(this.snow, this.drift, this.rain);
    this.buildRoadSnowCover();
  }

  /** Met à jour les états visuels des particules 3D et les coefficients RP */
  apply(wx: any, snowAccumulationCm = 0, windSpeedKmh = 12, tempCelsius = -5) {
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

    const isSnowing = this.condition === "light_snow" || this.condition === "blizzard" || this.condition === "poudrerie" || (this.condition as any) === "snow" || (this.condition as any) === "snowstorm";
    const isRaining = this.condition === "light_rain" || this.condition === "heavy_rain" || this.condition === "thunderstorm" || (this.condition as any) === "rain";
    const isVerglas = this.condition === "verglas";

    this.snow.visible = isSnowing || isVerglas;
    this.drift.visible = (isSnowing && this.windSpeedKmh > 25) || this.condition === "poudrerie";
    this.rain.visible = isRaining || (isVerglas && this.airTempCelsius >= -2);

    const snowMat = this.snow.material as THREE.PointsMaterial;
    if (this.condition === "blizzard" || (this.condition as any) === "snowstorm") {
      snowMat.size = 0.55;
      snowMat.opacity = 0.95;
    } else {
      snowMat.size = 0.35;
      snowMat.opacity = 0.78;
    }

    if (this.cover) {
      const mat = this.cover.material as THREE.MeshLambertMaterial;
      const progress = Math.min(0.9, this.snowCm / 32);
      this.cover.visible = progress > 0.05;
      mat.opacity = progress;
    }

    this.rpState.windChillCelsius = calculateWindChill(this.airTempCelsius, this.windSpeedKmh);

    if (isVerglas) {
      this.rpState.tractionMultiplier = 0.15;
    } else if (this.snowCm > 15) {
      this.rpState.tractionMultiplier = 0.45;
    } else if (this.snowCm > 3) {
      this.rpState.tractionMultiplier = 0.70;
    } else if (isRaining) {
      this.rpState.tractionMultiplier = 0.85;
    } else {
      this.rpState.tractionMultiplier = 1.0;
    }

    if (this.condition === "blizzard" || (this.condition as any) === "snowstorm") {
      this.rpState.visibilityMultiplier = 0.15;
    } else if (this.condition === "poudrerie") {
      this.rpState.visibilityMultiplier = 0.45;
    } else if (this.condition === "heavy_rain" || this.condition === "thunderstorm") {
      this.rpState.visibilityMultiplier = 0.65;
    } else {
      this.rpState.visibilityMultiplier = 1.0;
    }
  }
  tick(dt: number, playerPos: THREE.Vector3, isIndoor: boolean) {
    this.group.visible = !isIndoor;

    // Simulation de la physiologie thermique
    this.updateBiologicalState(dt, isIndoor);

    if (isIndoor) {
      return; // Pas d'animation de particules à l'intérieur
    }

    const ox = playerPos.x;
    const oy = playerPos.y;
    const oz = playerPos.z;
    const halfBox = BOUNDING_BOX_SIZE / 2;

    // Vecteur de dérive éolienne basé sur la vitesse du vent
    const windAngle = this.windSpeedKmh * 0.015;
    const windForceX = Math.sin(windAngle) * (this.windSpeedKmh * 0.18);
    const windForceZ = Math.cos(windAngle) * (this.windSpeedKmh * 0.12);

    const isBlizzard = this.condition === "blizzard";
    const fallModifier = isBlizzard ? 1.8 : this.condition === "poudrerie" ? 1.2 : 1.0;

    // ─── 1. SIMULATION PHYSIQUE : NEIGE ─────────────────────────────────────
    if (this.snow.visible) {
      const pos = this.snowPos;
      for (let i = 0; i < SNOW_PARTICLE_COUNT; i++) {
        const idx = i * 3;
        
        // Wobble de chute de flocon
        this.snowWobble[i] += dt * 3.5;
        const driftX = Math.sin(this.snowWobble[i]!) * 0.15;

        // Force combinée vent + gravité
        pos[idx] += (windForceX + driftX) * dt;
        pos[idx + 1] -= this.snowVel[idx / 3]! * fallModifier * dt;
        pos[idx + 2] += windForceZ * dt;

        // Repositionnement continu autour de la boîte du joueur
        pos[idx] = wrapCoordinate(pos[idx]!, ox, halfBox);
        pos[idx + 2] = wrapCoordinate(pos[idx + 2]!, oz, halfBox);

        if (pos[idx + 1]! < oy - 2) {
          pos[idx + 1] = oy + 15 + Math.random() * 8; // Réapparition au ciel
        }
        if (pos[idx + 1]! > oy + 24) {
          pos[idx + 1] = oy + 2;
        }
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
    }

    // ─── 2. SIMULATION PHYSIQUE : POUDRERIE BASSE ───────────────────────────
    if (this.drift.visible) {
      const pos = this.driftPos;
      const ground = getTerrainHeight(ox, oz);
      for (let i = 0; i < BLOWING_SNOW_COUNT; i++) {
        const idx = i * 3;

        // Soulevé horizontal violent par le vent au ras du sol
        pos[idx] += windForceX * 2.2 * dt;
        pos[idx + 2] += windForceZ * 2.2 * dt;

        pos[idx] = wrapCoordinate(pos[idx]!, ox, halfBox);
        pos[idx + 2] = wrapCoordinate(pos[idx + 2]!, oz, halfBox);
        
        // Reste collé au relief topographique
        pos[idx + 1] = ground + 0.08 + (i % 6) * 0.12;

        if (Math.random() < dt * 0.6) {
          pos[idx] = ox + (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
          pos[idx + 2] = oz + (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
        }
      }
      this.drift.geometry.attributes.position.needsUpdate = true;
    }

    // ─── 3. SIMULATION PHYSIQUE : PLUIE ─────────────────────────────────────
    if (this.rain.visible) {
      const pos = this.rainPos;
      const len = this.condition === "heavy_rain" || this.condition === "thunderstorm" ? 2.2 : 1.2;
      const dropSpeed = this.condition === "heavy_rain" ? 34 : 22;

      for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
        const idx = i * 6;
        
        // Chute verticale accélérée
        pos[idx + 1] -= dropSpeed * dt;
        pos[idx + 4] = pos[idx + 1]! - len;

        pos[idx] = wrapCoordinate(pos[idx]!, ox, halfBox);
        pos[idx + 2] = wrapCoordinate(pos[idx + 2]!, oz, halfBox);

        // Inclinaison du filet de pluie selon la force du vent
        pos[idx + 3] = pos[idx]! + windForceX * 0.12;
        pos[idx + 5] = pos[idx + 2]! + windForceZ * 0.12;

        if (pos[idx + 1]! < oy - 2) {
          pos[idx] = ox + (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
          pos[idx + 1] = oy + 12 + Math.random() * 10;
          pos[idx + 2] = oz + (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
          pos[idx + 3] = pos[idx]!;
          pos[idx + 4] = pos[idx + 1]! - len;
          pos[idx + 5] = pos[idx + 2]!;
        }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }

  /** Calcule les incidences de la météo boréale sur le métabolisme du joueur */
  private updateBiologicalState(dt: number, isIndoor: boolean) {
    const isCold = this.rpState.windChillCelsius < 0;
    const isFreezing = this.rpState.windChillCelsius <= -15;
    const isRaining = this.condition === "light_rain" || this.condition === "heavy_rain" || this.condition === "thunderstorm";
    const isSnowing = this.condition === "light_snow" || this.condition === "blizzard" || this.condition === "poudrerie" || this.condition === "verglas";

    // 1. Taux d'humidité des vêtements (Séchage vs Mouillure)
    if (isIndoor) {
      // Séchage rapide près des calorifères / poêles à bois
      this.rpState.wetness = Math.max(0, this.rpState.wetness - dt * WETNESS_EVAPORATION_RATE * 2.2);
    } else if (isRaining) {
      const rainIntensity = this.condition === "heavy_rain" || this.condition === "thunderstorm" ? 12 : 5;
      this.rpState.wetness = Math.min(100, this.rpState.wetness + dt * rainIntensity);
    } else if (isSnowing && this.airTempCelsius > -2) {
      // Neige fondante collante
      this.rpState.wetness = Math.min(100, this.rpState.wetness + dt * 2.8);
    } else {
      // Séchage naturel par le vent froid extérieur
      const windDrying = (this.windSpeedKmh / 50) * 1.5;
      this.rpState.wetness = Math.max(0, this.rpState.wetness - dt * (WETNESS_EVAPORATION_RATE * 0.4 + windDrying));
    }

    // 2. Chute de la Température Corporelle Interne
    if (!isIndoor && isCold) {
      // Dissipation thermique accélérée par les vêtements trempés (Conductivité de l'eau)
      let heatLoss = 0.08 * dt;
      if (this.rpState.wetness > 15) {
        heatLoss += (this.rpState.wetness / 100) * 0.35 * dt;
      }
      // Effet du refroidissement éolien d'Environnement Canada
      if (this.rpState.windChillCelsius < -10) {
        heatLoss += (Math.abs(this.rpState.windChillCelsius) / 45) * 0.15 * dt;
      }

      this.rpState.bodyTemp = Math.max(28.0, this.rpState.bodyTemp - heatLoss);
    } else if (isIndoor) {
      // Réchauffement métabolique rapide à l'abri
      this.rpState.bodyTemp = Math.min(BODY_TEMP_NORMAL, this.rpState.bodyTemp + dt * 0.42);
    }

    // 3. État clinique d'hypothermie
    this.rpState.isHypothermic = this.rpState.bodyTemp < TEMP_HYPOTHERMIA_MILD;

    // Grelottement musculaire involontaire (shivering)
    if (this.rpState.bodyTemp < BODY_TEMP_NORMAL - 0.5) {
      this.rpState.shiverIntensity = THREE.MathUtils.clamp(
        (BODY_TEMP_NORMAL - this.rpState.bodyTemp) / (BODY_TEMP_NORMAL - TEMP_HYPOTHERMIA_CRITICAL),
        0.0,
        1.0
      );
    } else {
      this.rpState.shiverIntensity = 0;
    }

    // 4. Temporisateur de gelures sévères (Frostbite)
    if (!isIndoor && isFreezing) {
      const frostbiteSpeed = (Math.abs(this.rpState.windChillCelsius) / 30) * (1 + this.rpState.wetness * 0.02);
      this.rpState.frostbiteTimer = Math.max(0, this.rpState.frostbiteTimer - dt * frostbiteSpeed);
    } else {
      this.rpState.frostbiteTimer = Math.min(600, this.rpState.frostbiteTimer + dt * 4.0); // Récupération
    }

    // 5. Impact de la fatigue thermique sur la motricité (Vitesse de déplacement)
    let motorReduction = 1.0;
    
    // Impact de l'accumulation de neige au sol
    if (this.snowCm > 25) {
      motorReduction -= 0.35; // Neige aux genoux
    } else if (this.snowCm > 8) {
      motorReduction -= 0.18;
    }

    // Impact clinique du froid
    if (this.rpState.isHypothermic) {
      motorReduction -= 0.35 * this.rpState.shiverIntensity;
    }
    if (this.rpState.bodyTemp < TEMP_HYPOTHERMIA_CRITICAL) {
      motorReduction -= 0.40; // Proche de la léthargie
    }

    this.rpState.movementSpeedMul = Math.max(0.18, motorReduction);

    this.notifyRPChange();
  }

  private notifyRPChange() {
    if (this.onRPStateChange) {
      this.onRPStateChange(this.rpState);
    }
  }

  dispose() {
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

  private scatterParticles(buf: Float32Array, count: number, maxHeight: number) {
    for (let i = 0; i < count; i++) {
      buf[i * 3] = (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
      buf[i * 3 + 1] = Math.random() * maxHeight;
      buf[i * 3 + 2] = (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
    }
  }

  private scatterRainfall(ox: number, oz: number, maxHeight: number) {
    for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
      const x = ox + (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
      const y = Math.random() * maxHeight;
      const z = oz + (Math.random() - 0.5) * BOUNDING_BOX_SIZE;
      const idx = i * 6;
      
      this.rainPos[idx] = x;
      this.rainPos[idx + 1] = y;
      this.rainPos[idx + 2] = z;
      this.rainPos[idx + 3] = x;
      this.rainPos[idx + 4] = y - 1.2;
      this.rainPos[idx + 5] = z;
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

/** Génère un liseré géométrique de neige surélevé de 6cm pour recouvrir la Route 138 */
function generateSnowRibbon(road: RoadDef): THREE.Mesh {
  const points = road.points.map(([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z) + 0.05, z));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  
  const segments = 96; // Résolution pour épouser les virages
  const samples = curve.getPoints(segments);
  const halfWidth = road.width * 0.51;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < samples.length; i++) {
    const s = i < samples.length - 1 ? sampleRoad(road, i / (samples.length - 1)) : sampleRoad(road, 1);
    const pt = samples[i]!;
    
    // Perpendiculaire horizontale
    const nx = -s.tz;
    const nz = s.tx;

    positions.push(
      pt.x - nx * halfWidth, pt.y, pt.z - nz * halfWidth, // Gauche
      pt.x + nx * halfWidth, pt.y, pt.z + nz * halfWidth  // Droite
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

  const mat = new THREE.MeshLambertMaterial({
    color: 0xebf2f7,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "snow-cover-138";
  mesh.renderOrder = 2; // Rendu après l'asphalte
  return mesh;
}
