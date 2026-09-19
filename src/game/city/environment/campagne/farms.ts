/**
 * ═══════════════════════════════════════════════════════════════════
 *  SYSTÈME AGRICOLE AVANCÉ — TROXTWORLD v2.0 (COMPLET)
 *  Gestion complète : Cultures, Outils, Météo, SQ & Rendu 3D
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib } from "../../../materials";
import { getTerrainHeight } from "../../../worlddata";
import { addWantedPoints } from "../../../police";
import { ShopItemId } from "./commerce";

// ───────────────────────────────────────────────────────────────
// 1. TYPES & CONSTANTES
// ───────────────────────────────────────────────────────────────

export type CropId = "mais" | "ble" | "foin" | "patate" | "cannabis";
export type FieldStage = "friche" | "laboure" | "seme" | "pousse" | "mur";
export type FarmTool = "pelle" | "rateau" | "herser" | "faux" | "tracteur" | null;
export type SoilType = "limon" | "argile" | "sable" | "tourbe";

export interface CropSpec {
  id: CropId;
  label: string;
  seedId: ShopItemId;
  yieldId: ShopItemId;
  yieldN: number;
  growTimeMs: number;
  illegal: boolean;
  color: number;
  height: number;
  basePrice: number;
}

export const CROPS: Record<CropId, CropSpec> = {
  mais: { id: "mais", label: "Maïs", seedId: "graines_mais", yieldId: "mais", yieldN: 4, growTimeMs: 44 * 60 * 60 * 1000, illegal: false, color: 0xc8a840, height: 1.65, basePrice: 8 },
  ble: { id: "ble", label: "Blé", seedId: "graines_ble", yieldId: "ble", yieldN: 3, growTimeMs: 36 * 60 * 60 * 1000, illegal: false, color: 0xd4b850, height: 0.82, basePrice: 11 },
  foin: { id: "foin", label: "Foin", seedId: "graines_foin", yieldId: "foin", yieldN: 4, growTimeMs: 28 * 60 * 60 * 1000, illegal: false, color: 0x5a8a40, height: 0.4, basePrice: 6 },
  patate: { id: "patate", label: "Patates", seedId: "graines_patate", yieldId: "patate", yieldN: 5, growTimeMs: 40 * 60 * 60 * 1000, illegal: false, color: 0x6a8a48, height: 0.46, basePrice: 5 },
  cannabis: { id: "cannabis", label: "Cannabis", seedId: "graines_cannabis", yieldId: "weed", yieldN: 5, growTimeMs: 42 * 60 * 60 * 1000, illegal: true, color: 0x2a6a32, height: 1.2, basePrice: 32 },
};

export interface FieldPlot {
  id: string;
  name: string;
  x: number; z: number; yaw: number; w: number; d: number;
  stage: FieldStage;
  crop: CropId | null;
  plantedAt: number;
  heat: number; // 0-1 (Détection SQ)
  concealed: boolean; // Serre/Caché
  illegal: boolean; // Si la culture actuelle est illégale
  group: THREE.Group;
}

export interface FieldWorkResult {
  ok: boolean;
  notice: string;
  loot?: { id: ShopItemId; n: number };
  consumeSeed?: ShopItemId;
  illegalSow?: boolean;
  wantedPoints?: number;
}

// Définitions des fermes par défaut (pour countyFarmLayout)
export interface FarmDef {
  id: string;
  village: string;
  x: number; z: number;
  yaw: number;
  crop: CropId;
  hidden?: boolean;
  plots: Array<{ ox: number; oz: number; w: number; d: number }>;
}

// ───────────────────────────────────────────────────────────────
// 2. GESTIONNAIRE DE FERMES (LOGIQUE)
// ───────────────────────────────────────────────────────────────

export class FarmManager {
  private plots: Map<string, FieldPlot> = new Map();

  constructor() {
    this.initializeDefaultFarms();
  }

  private initializeDefaultFarms() {
    // Ferme légale à Saint-Alban
    this.createPlot("ferme_alban_1", -40, 45, 0, 10, 10, "limon");
    // Parcelle illégale cachée
    this.createPlot("grow_op_1", -55, 50, 0.5, 6, 6, "tourbe", true);
  }

  createPlot(id: string, x: number, z: number, yaw: number, w: number, d: number, soilType: string, illegal = false) {
    const plot: FieldPlot = {
      id, name: illegal ? "Parcelle Clandestine" : `Champ ${id}`,
      x, z, yaw, w, d,
      stage: "friche", crop: null, plantedAt: 0, heat: 0, concealed: illegal, illegal: false,
      group: new THREE.Group()
    };
    plot.group.position.set(x, getTerrainHeight(x, z), z);
    plot.group.rotation.y = yaw;
    this.plots.set(id, plot);
    this.renderPlot(plot);
    return plot;
  }

  getPlot(id: string): FieldPlot | undefined { return this.plots.get(id); }
  getAllPlots(): FieldPlot[] { return [...this.plots.values()]; }

  // ─── LOGIQUE DE TRAVAIL ──────────────────────────────────────

  workPlot(plotId: string, tool: FarmTool, seed: CropId | null, playerId: string): FieldWorkResult {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, notice: "Parcelle introuvable." };

    switch (plot.stage) {
      case "friche":
        if (tool === "pelle" || tool === "tracteur") {
          plot.stage = "laboure";
          this.renderPlot(plot);
          return { ok: true, notice: "Terrain labouré." };
        }
        return { ok: false, notice: "Il faut une pelle ou un tracteur." };

      case "laboure":
        if (!seed) return { ok: false, notice: "Pas de semences sélectionnées." };
        if (tool !== "pelle" && tool !== "tracteur") return { ok: false, notice: "Outil inadéquat pour semer." };
        
        const crop = CROPS[seed];
        plot.crop = seed;
        plot.stage = "seme";
        plot.plantedAt = Date.now();
        plot.illegal = crop.illegal;
        plot.concealed = crop.illegal;
        plot.heat = crop.illegal ? 0.1 : 0;
        
        this.renderPlot(plot);
        return { 
          ok: true, 
          notice: crop.illegal ? "Semis clandestin effectué." : `Semis de ${crop.label} réussi.`,
          consumeSeed: crop.seedId,
          illegalSow: crop.illegal
        };

      case "seme":
      case "pousse":
        if (tool === "rateau" || tool === "herser") {
          plot.plantedAt -= 2 * 60 * 60 * 1000; 
          return { ok: true, notice: "Binage effectué. Croissance accélérée." };
        }
        return { ok: false, notice: "La culture est en cours." };

      case "mur":
        if (tool === "faux" || tool === "tracteur") {
          if (!plot.crop) return { ok: false, notice: "Rien à récolter." };
          const crop = CROPS[plot.crop];
          
          const lootN = crop.yieldN;
          plot.stage = "friche";
          plot.crop = null;
          plot.illegal = false;
          plot.heat = 0;
          this.renderPlot(plot);

          if (crop.illegal) {
            addWantedPoints(playerId, 20, "Récolte illégale");
            return { ok: true, notice: "Récolte saisie ! (+20 points recherchés)", loot: { id: crop.yieldId, n: lootN }, wantedPoints: 20 };
          }
          return { ok: true, notice: `Récolte de ${lootN}x ${crop.label}`, loot: { id: crop.yieldId, n: lootN } };
        }
        return { ok: false, notice: "Il faut une faux ou un tracteur." };
    }
    return { ok: false, notice: "Action impossible." };
  }

  // ─── TICK & CROISSANCE ───────────────────────────────────────

  tick(dt: number, playerX: number, playerZ: number) {
    const now = Date.now();
    for (const plot of this.plots.values()) {
      if (plot.crop && (plot.stage === "seme" || plot.stage === "pousse")) {
        const crop = CROPS[plot.crop];
        const progress = (now - plot.plantedAt) / crop.growTimeMs;
        
        if (progress >= 1 && (plot.stage as any) !== "mur") {
          plot.stage = "mur";
          this.renderPlot(plot);
        } else if (progress > 0.3 && plot.stage === "seme") {
          plot.stage = "pousse";
          this.renderPlot(plot);
        }
      }

      // Gestion Heat (SQ)
      if (plot.illegal && plot.crop === "cannabis" && plot.stage !== "friche") {
        const dist = Math.hypot(playerX - plot.x, playerZ - plot.z);
        const rate = plot.concealed ? 0.005 : 0.02;
        if (dist < 60) plot.heat += dt * rate;
        if (plot.heat > 1) {
          console.log(`[SQ] Raid déclenché sur ${plot.id}`);
          plot.heat = 0.5;
        }
      }
    }
  }

  // ─── RENDU 3D PROCÉDURAL ─────────────────────────────────────

  private renderPlot(plot: FieldPlot) {
    while (plot.group.children.length > 0) {
      plot.group.remove(plot.group.children[0]);
    }

    const soilColor = this.getSoilColor(plot.stage, plot.illegal);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(plot.w, plot.d),
      matLib.get(soilColor, 0.9, 0.1)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    plot.group.add(ground);

    if (plot.crop && plot.stage !== "friche" && plot.stage !== "laboure") {
      const spec = CROPS[plot.crop];
      const geo = new THREE.ConeGeometry(0.15, spec.height, 5);
      const mat = new THREE.MeshLambertMaterial({ color: this.getCropColor(spec, plot.stage) });
      
      for (let i = 0; i < 20; i++) {
        const plant = new THREE.Mesh(geo, mat);
        const rx = (Math.random() - 0.5) * plot.w;
        const rz = (Math.random() - 0.5) * plot.d;
        plant.position.set(rx, spec.height / 2, rz);
        plant.castShadow = true;
        plot.group.add(plant);
      }
    }

    if (plot.concealed) {
      const greenhouse = new THREE.Mesh(
        new THREE.BoxGeometry(plot.w + 1, 2.5, plot.d + 1),
        matLib.physicalGlass(0xaaddff, 0.1, 0.1)
      );
      greenhouse.position.y = 1.25;
      plot.group.add(greenhouse);
    }
  }

  private getSoilColor(stage: FieldStage, illegal: boolean): number {
    if (stage === "laboure") return 0x4a3525;
    if (illegal) return 0x2a3a20;
    if (stage === "mur") return 0x4a4a30;
    return 0x5a7a40;
  }

  private getCropColor(spec: CropSpec, stage: FieldStage): number {
    if (stage === "seme") return 0x3a5a28;
    if (stage === "pousse") return spec.color;
    if (stage === "mur") {
      if (spec.id === "ble") return 0xe4d480;
      if (spec.id === "mais") return 0xd4b850;
      return spec.color;
    }
    return 0xffffff;
  }
}

export const farmManager = new FarmManager();

// ───────────────────────────────────────────────────────────────
// 3. FONCTIONS EXPORTÉES (Pour compatibilité avec le reste du projet)
// ───────────────────────────────────────────────────────────────

export function countyFarmLayout(): FarmDef[] {
  return [
    { id: "ferme_alban", village: "Saint-Alban", x: -40, z: 45, yaw: 0, crop: "ble", plots: [{ ox: 0, oz: 0, w: 10, d: 10 }] },
    { id: "grow_op_bois", village: "Forêt", x: -55, z: 50, yaw: 0.5, crop: "cannabis", hidden: true, plots: [{ ox: 0, oz: 0, w: 6, d: 6 }] }
  ];
}

export function legalFarmsteads(): FarmDef[] {
  return countyFarmLayout().filter(f => !f.hidden);
}

export function farmClearings(): { x: number; z: number; w: number; d: number }[] {
  return countyFarmLayout().flatMap(f => f.plots.map(p => ({ x: f.x + p.ox, z: f.z + p.oz, w: p.w, d: p.d })));
}

export function farmMapMarks() {
  return countyFarmLayout().map(f => ({ id: f.id, x: f.x, z: f.z, name: f.village }));
}

export function fieldPrompt(plotId: string, tool: FarmTool): string {
  const plot = farmManager.getPlot(plotId);
  if (!plot) return "Parcelle inconnue";
  return `Champ: ${plot.stage} | Outil: ${tool || "Aucun"}`;
}

export function workField(plotId: string, tool: FarmTool, seed: CropId | null, playerId: string): FieldWorkResult {
  return farmManager.workPlot(plotId, tool, seed, playerId);
}

export function tickFields(dt: number, px: number, pz: number) {
  farmManager.tick(dt, px, pz);
}

export function seizeField(plotId: string) {
  const plot = farmManager.getPlot(plotId);
  if (plot) {
    plot.stage = "friche";
    plot.crop = null;
    plot.illegal = false;
    plot.heat = 0;
    farmManager['renderPlot'](plot);
  }
}

export function cropFromSeed(seedId: ShopItemId): CropId | null {
  for (const crop of Object.values(CROPS)) {
    if (crop.seedId === seedId) return crop.id;
  }
  return null;
}

export function nearestField(x: number, z: number, radius: number = 20): FieldPlot | null {
  let nearest: FieldPlot | null = null;
  let minDist = radius;
  for (const plot of farmManager.getAllPlots()) {
    const dist = Math.hypot(plot.x - x, plot.z - z);
    if (dist < minDist) {
      minDist = dist;
      nearest = plot;
    }
  }
  return nearest;
}

export function mountFarms(parent: THREE.Group) {
  for (const plot of farmManager.getAllPlots()) {
    parent.add(plot.group);
  }
}

export function buildTracteur(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 3), matLib.get(0xcc2200, 0.5, 0.2)));
  return g;
}

export function soilColor(stage: FieldStage, illegal: boolean): number {
  return farmManager['getSoilColor'](stage, illegal);
}

export function cropTint(spec: CropSpec, stage: FieldStage): number {
  return farmManager['getCropColor'](spec, stage);
}

export function localOffset(plot: FieldPlot, x: number, z: number): { lx: number; lz: number } {
  const dx = x - plot.x;
  const dz = z - plot.z;
  const c = Math.cos(-plot.yaw);
  const s = Math.sin(-plot.yaw);
  return { lx: dx * c - dz * s, lz: dx * s + dz * c };
}
