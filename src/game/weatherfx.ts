/**
 * Précipitations 3D & Système RP Réaliste — neige, poudrerie, pluie, blizzard.
 * Gère à la fois le rendu visuel (Three.js) et l'impact gameplay (RP).
 */
import * as THREE from "three";
import { getTerrainHeight, ROADS, type RoadDef } from "./worlddata";
import { sampleRoad } from "./roads";
import type { QuebecWeatherState, WeatherCondition } from "./seasons";

// --- CONSTANTES VISUELLES ---
const SNOW_N = 1400;
const DRIFT_N = 700;
const RAIN_N = 900;
const BOX = 38;

// --- CONSTANTES RP (RÉALISME) ---
const TEMP_NORMAL = 37.0;
const TEMP_HYPO_THRESHOLD = 35.0;
const WETNESS_MAX = 100;

/**
 * Interface pour exporter l'état RP de la météo vers les autres systèmes
 * (survival.ts, cars.ts, character.ts, rpui.tsx)
 */
export interface WeatherRPState {
  bodyTemp: number;           // Température corporelle du joueur (ex: 37.0 -> 34.0)
  wetness: number;            // Niveau de mouillure (0 à 100)
  tractionMultiplier: number; // Adhérence au sol (1.0 = sec, 0.4 = verglas)
  movementSpeedMul: number;   // Multiplicateur de vitesse à pied (1.0 = normal)
  visibility: number;         // Distance de vision (0.0 = blanc total, 1.0 = clair)
  isHypothermic: boolean;     // État critique pour le HUD/UI
  windChillFactor: number;    // Ressenti réel de la température
}

function wrap(v: number, c: number, half: number) {
  let d = v - c;
  if (d > half) v -= half * 2;
  if (d < -half) v += half * 2;
  return v;
}

export class WeatherFx {
  group = new THREE.Group();
  private snow: THREE.Points;
  private drift: THREE.Points;
  private rain: THREE.LineSegments;
  private cover: THREE.Mesh | null = null;
  private snowPos: Float32Array;
  private snowVel: Float32Array;
  private driftPos: Float32Array;
  private rainPos: Float32Array;
  private condition: WeatherCondition = "ensoleille";
  private snowCm = 0;
  private wind = 12;
  private tmp = new THREE.Vector3();

  // --- ÉTAT RP ---
  public rpState: WeatherRPState = {
    bodyTemp: TEMP_NORMAL,
    wetness: 0,
    tractionMultiplier: 1.0,
    movementSpeedMul: 1.0,
    visibility: 1.0,
    isHypothermic: false,
    windChillFactor: 0
  };
  
  // Callback pour notifier les autres modules (survival.ts, rpui.tsx)
  public onRPStateChange?: (state: WeatherRPState) => void;

  constructor() {
    this.group.name = "weather-fx";

    this.snowPos = new Float32Array(SNOW_N * 3);
    this.snowVel = new Float32Array(SNOW_N);
    this.scatter(this.snowPos, SNOW_N, 18);
    for (let i = 0; i < SNOW_N; i++) this.snowVel[i] = 4.5 + Math.random() * 6;
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute("position", new THREE.BufferAttribute(this.snowPos, 3));
    this.snow = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({
        color: 0xe8eef4, size: 0.14, sizeAttenuation: true,
        transparent: true, opacity: 0.9, depthWrite: false, fog: true,
      }),
    );
    this.snow.visible = false;
    this.snow.frustumCulled = false;

    this.driftPos = new Float32Array(DRIFT_N * 3);
    this.scatter(this.driftPos, DRIFT_N, 1.4);
    const driftGeo = new THREE.BufferGeometry();
    driftGeo.setAttribute("position", new THREE.BufferAttribute(this.driftPos, 3));
    this.drift = new THREE.Points(
      driftGeo,
      new THREE.PointsMaterial({
        color: 0xd8e4ee, size: 0.22, sizeAttenuation: true,
        transparent: true, opacity: 0.55, depthWrite: false, fog: true,
      }),
    );
    this.drift.visible = false;
    this.drift.frustumCulled = false;

    this.rainPos = new Float32Array(RAIN_N * 6);
    this.scatterRain(0, 0);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({
        color: 0x8aa0b4, transparent: true, opacity: 0.38, depthWrite: false, fog: true,
      }),
    );
    this.rain.visible = false;
    this.rain.frustumCulled = false;

    this.group.add(this.snow, this.drift, this.rain);
    this.buildCover();
  }

  apply(wx: QuebecWeatherState) {
    this.condition = wx.condition;
    this.snowCm = wx.snowAccumulationCm;
    this.wind = wx.windSpeedKmH;
    
    const winter = wx.condition === "poudrerie" || wx.condition === "tempete_neige" || wx.condition === "froid_polaire";
    const ice = wx.condition === "verglas";
    const rain = wx.condition === "pluie_fine" || wx.condition === "orage_ete";
    const blizzard = wx.condition === "tempete_neige";
    
    this.snow.visible = winter || ice;
    this.drift.visible = winter || ice;
    this.rain.visible = rain && !winter;
    
    const snowMat = this.snow.material as THREE.PointsMaterial;
    snowMat.size = blizzard ? 0.2 : 0.13;
    snowMat.opacity = blizzard ? 0.95 : 0.78;
    
    const driftMat = this.drift.material as THREE.PointsMaterial;
    driftMat.opacity = blizzard ? 0.7 : ice ? 0.25 : 0.48;
    
    if (this.cover) {
      const mat = this.cover.material as THREE.MeshLambertMaterial;
      const k = Math.min(0.82, this.snowCm / 36);
      this.cover.visible = k > 0.08;
      mat.opacity = k;
    }

    // --- CALCUL RP STATIQUE (Adhérence et Vision) ---
    this.rpState.tractionMultiplier = ice ? 0.35 : (this.snowCm > 10 ? 0.6 : (this.snowCm > 2 ? 0.8 : 1.0));
    this.rpState.visibility = blizzard ? 0.25 : (this.condition === "orage_ete" ? 0.6 : 1.0);
    
    // Calcul du Wind Chill (Ressenti)
    // Formule simplifiée : plus il y a de vent et froid, plus ça refroidit vite
    this.rpState.windChillFactor = winter ? (this.wind * 0.4) : 0;
  }

  tick(dt: number, origin: THREE.Vector3, indoor: boolean) {
    this.group.visible = !indoor;
    
    // --- MISE À JOUR DU SYSTÈME RP ---
    this.updateRPMechanics(dt, indoor);

    if (indoor) {
      // Si on rentre à l'intérieur, on sèche et on se réchauffe
      this.rpState.wetness = Math.max(0, this.rpState.wetness - dt * 5);
      if (this.rpState.bodyTemp < TEMP_NORMAL) {
        this.rpState.bodyTemp = Math.min(TEMP_NORMAL, this.rpState.bodyTemp + dt * 0.5);
      }
      this.notifyRPChange();
      return;
    }

    const ox = origin.x;
    const oy = origin.y;
    const oz = origin.z;
    const windX = Math.sin(this.wind * 0.02) * (this.wind / 28);
    const windZ = Math.cos(this.wind * 0.017) * (this.wind / 36);
    const blizzard = this.condition === "tempete_neige";
    const fallMul = blizzard ? 1.7 : this.condition === "poudrerie" ? 0.85 : 1;

    if (this.snow.visible) {
      const p = this.snowPos;
      for (let i = 0; i < SNOW_N; i++) {
        const i3 = i * 3;
        p[i3] += windX * dt * (blizzard ? 14 : 6);
        p[i3 + 1] -= this.snowVel[i]! * fallMul * dt;
        p[i3 + 2] += windZ * dt * (blizzard ? 10 : 4);
        p[i3] = wrap(p[i3]!, ox, BOX);
        p[i3 + 2] = wrap(p[i3 + 2]!, oz, BOX);
        if (p[i3 + 1]! < oy - 2) p[i3 + 1] = oy + 14 + Math.random() * 8;
        if (p[i3 + 1]! > oy + 22) p[i3 + 1] = oy + 2;
      }
      (this.snow.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    if (this.drift.visible) {
      const p = this.driftPos;
      const ground = getTerrainHeight(ox, oz);
      for (let i = 0; i < DRIFT_N; i++) {
        const i3 = i * 3;
        p[i3] += windX * dt * (blizzard ? 22 : 11);
        p[i3 + 2] += windZ * dt * (blizzard ? 16 : 8);
        p[i3] = wrap(p[i3]!, ox, BOX);
        p[i3 + 2] = wrap(p[i3 + 2]!, oz, BOX);
        p[i3 + 1] = ground + 0.15 + (i % 7) * 0.05;
        if (Math.random() < dt * 0.4) {
          p[i3] = ox + (Math.random() - 0.5) * BOX * 2;
          p[i3 + 2] = oz + (Math.random() - 0.5) * BOX * 2;
        }
      }
      (this.drift.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    if (this.rain.visible) {
      const p = this.rainPos;
      const len = this.condition === "orage_ete" ? 1.6 : 0.9;
      const spd = this.condition === "orage_ete" ? 28 : 18;
      for (let i = 0; i < RAIN_N; i++) {
        const i6 = i * 6;
        p[i6 + 1] -= spd * dt;
        p[i6 + 4] = p[i6 + 1]! - len;
        p[i6] = wrap(p[i6]!, ox, BOX);
        p[i6 + 2] = wrap(p[i6 + 2]!, oz, BOX);
        p[i6 + 3] = p[i6]! + windX * 0.15;
        p[i6 + 5] = p[i6 + 2]! + windZ * 0.15;
        if (p[i6 + 1]! < oy - 2) {
          p[i6] = ox + (Math.random() - 0.5) * BOX * 2;
          p[i6 + 1] = oy + 10 + Math.random() * 10;
          p[i6 + 2] = oz + (Math.random() - 0.5) * BOX * 2;
          p[i6 + 3] = p[i6]!;
          p[i6 + 4] = p[i6 + 1]! - len;
          p[i6 + 5] = p[i6 + 2]!;
        }
      }
      (this.rain.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  /**
   * Cœur du système RP : calcule l'impact de la météo sur le joueur en temps réel.
   */
  private updateRPMechanics(dt: number, indoor: boolean) {
    const isWinter = this.condition === "poudrerie" || this.condition === "tempete_neige" || this.condition === "froid_polaire" || this.condition === "verglas";
    const isRaining = this.condition === "pluie_fine" || this.condition === "orage_ete";

    // 1. Gestion de la mouillure (Wetness)
    if (isRaining && !indoor) {
      this.rpState.wetness = Math.min(WETNESS_MAX, this.rpState.wetness + dt * 8);
    } else if (!indoor) {
      // La neige fait aussi mouiller (neige fondue) mais moins vite
      this.rpState.wetness = Math.min(WETNESS_MAX, this.rpState.wetness + dt * 2);
    }

    // 2. Gestion de la Température Corporelle (Hypothermie)
    if (isWinter && !indoor) {
      // Perte de chaleur de base + bonus de perte si le joueur est mouillé
      let tempLoss = 0.15 * dt; 
      if (this.rpState.wetness > 20) tempLoss += (this.rpState.wetness / 100) * 0.4 * dt;
      // Le vent accélère le refroidissement (Wind chill)
      tempLoss += (this.rpState.windChillFactor / 50) * 0.2 * dt;
      
      this.rpState.bodyTemp = Math.max(28.0, this.rpState.bodyTemp - tempLoss);
    } else if (indoor) {
      // Réchauffement à l'intérieur
      this.rpState.bodyTemp = Math.min(TEMP_NORMAL, this.rpState.bodyTemp + dt * 0.3);
    }

    // 3. État d'hypothermie critique
    this.rpState.isHypothermic = this.rpState.bodyTemp < TEMP_HYPO_THRESHOLD;

    // 4. Ralentissement du joueur (Mouvement)
    // La neige épaisse ralentit, l'hypothermie aussi
    let speedMul = 1.0;
    if (this.snowCm > 15) speedMul -= 0.3;
    else if (this.snowCm > 5) speedMul -= 0.15;
    
    if (this.rpState.isHypothermic) speedMul -= 0.4; // Le joueur grelotte et avance lentement
    if (this.rpState.bodyTemp < 33.0) speedMul -= 0.3; // État critique
    
    this.rpState.movementSpeedMul = Math.max(0.2, speedMul);

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

  private scatter(buf: Float32Array, n: number, height: number) {
    for (let i = 0; i < n; i++) {
      buf[i * 3] = (Math.random() - 0.5) * BOX * 2;
      buf[i * 3 + 1] = Math.random() * height;
      buf[i * 3 + 2] = (Math.random() - 0.5) * BOX * 2;
    }
  }

  private scatterRain(ox: number, oz: number) {
    for (let i = 0; i < RAIN_N; i++) {
      const x = ox + (Math.random() - 0.5) * BOX * 2;
      const y = Math.random() * 16;
      const z = oz + (Math.random() - 0.5) * BOX * 2;
      const i6 = i * 6;
      this.rainPos[i6] = x;
      this.rainPos[i6 + 1] = y;
      this.rainPos[i6 + 2] = z;
      this.rainPos[i6 + 3] = x;
      this.rainPos[i6 + 4] = y - 1;
      this.rainPos[i6 + 5] = z;
    }
  }

  private buildCover() {
    const road = ROADS.find((r) => r.id === "r138");
    if (!road) return;
    const mesh = snowRibbon(road);
    mesh.visible = false;
    this.cover = mesh;
    this.group.add(mesh);
  }
}

function snowRibbon(road: RoadDef): THREE.Mesh {
  const pts = road.points.map(([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z) + 0.06, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const n = 64;
  const samples = curve.getPoints(n);
  const hw = road.width * 0.52;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    const s = i < samples.length - 1 ? sampleRoad(road, i / (samples.length - 1)) : sampleRoad(road, 1);
    const pt = samples[i]!;
    const nx = -s.tz;
    const nz = s.tx;
    positions.push(pt.x - nx * hw, pt.y, pt.z - nz * hw, pt.x + nx * hw, pt.y, pt.z + nz * hw);
    if (i < samples.length - 1) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({
    color: 0xe4eaf0, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "snow-cover-138";
  mesh.renderOrder = 2;
  return mesh;
}