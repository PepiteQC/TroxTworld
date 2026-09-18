/**
 * 🍁 SYSTEM — Point d'entrée principal (intègre tous les modules)
 */
import * as THREE from "three";
import { SUGAR_CONFIG, SUGAR_BUSHES, TAP_POSITIONS, EVAP_OFFSET, WOODPILE_OFFSET } from "./config";
import type {
  SugarBushInstance, SugarEvapState, SugarTapInstance, SugarTapState,
  SugarBushStats, WorkResult,
} from "./types";
import { ParticleSystem, LeafParticleSystem } from "./particles";
import { SugarAudioManager } from "./audio";
import { ErabliereJobBoard } from "./jobs";
import { NpcWorkerManager } from "./npcWorkers";
import { MapleEconomy } from "./economy";
import { SugarQuestManager } from "./quests";
import { SugarEventManager } from "./events";
import { buildSavePayload, validateSave, type ErabliereSave } from "./persistence";

// (imports de ton projet existant)
import { buildCabaneSucre } from "../architecture";
import { getGeo } from "../geo";
import { matLib } from "../materials";
import { getTerrainHeight } from "../worlddata";
import { quebecSeasons } from "../seasons";

export class ErabliereSystem {
  private bushes = new Map<string, SugarBushInstance>();
  private tapStates = new Map<string, SugarTapState>();
  private evapStates = new Map<string, SugarEvapState>();
  private bushStats = new Map<string, SugarBushStats>();
  private materialCache = new Map<string, THREE.Material>();

  // Sous-systèmes
  public jobs = new ErabliereJobBoard();
  public npc = new NpcWorkerManager();
  public economy = new MapleEconomy();
  public quests = new SugarQuestManager();
  public events = new SugarEventManager();
  public audio = new SugarAudioManager();

  private camera?: THREE.Camera;
  private lastTickTime = 0;
  private initialized = false;

  // ────────────────────────────────────────────────────────────────────────
  //  INIT
  // ────────────────────────────────────────────────────────────────────────

  public mount(parent: THREE.Group): SugarBushInstance[] {
    if (this.initialized) return [...this.bushes.values()];

    const instances: SugarBushInstance[] = [];
    this.initMaterialCache();

    for (const def of SUGAR_BUSHES) {
      const y = getTerrainHeight(def.worldX, def.worldZ);

      // Cabane
      const cabane = buildCabaneSucre(def.id.length + 21);
      cabane.position.set(def.worldX, y, def.worldZ);
      cabane.rotation.y = def.yaw;
      parent.add(cabane);

      // Évaporateur
      const evapPos = this.farmToWorld(def, EVAP_OFFSET[0], EVAP_OFFSET[1]);
      const { group: evapGroup, steam, particles } = this.buildEvaporator(def.id);
      evapGroup.position.set(evapPos.x, getTerrainHeight(evapPos.x, evapPos.z), evapPos.z);
      evapGroup.rotation.y = def.yaw;
      parent.add(evapGroup);

      // Audio
      this.audio.attach(def.id, evapGroup, "evap_boil");

      // Tas de bois
      const woodPos = this.farmToWorld(def, WOODPILE_OFFSET[0], WOODPILE_OFFSET[1]);
      const wood = this.buildWoodpile();
      wood.position.set(woodPos.x, getTerrainHeight(woodPos.x, woodPos.z), woodPos.z);
      wood.rotation.y = def.yaw;
      parent.add(wood);

      // État évap
      this.evapStates.set(def.id, {
        sapBuffer: 0, isBoiling: false, boilProgress: 0,
        lastBoilAt: 0, audioPlaying: false,
      });

      // Entailles
      const taps: SugarTapInstance[] = [];
      TAP_POSITIONS.forEach(([ox, oz], i) => {
        const pos = this.farmToWorld(def, ox, oz);
        const treeSeed = def.id.length * 1000 + i * 17;
        const maple = this.buildSugarMaple(treeSeed);
        maple.group.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
        maple.group.rotation.y = def.yaw + (i % 2 === 0 ? 0.4 : -0.35);
        parent.add(maple.group);

        const leafParticles = new LeafParticleSystem(maple.group.position, 4.6);
        leafParticles.getMesh().visible = false;
        parent.add(leafParticles.getMesh());

        const tapId = `${def.id}_tap_${i}`;
        this.tapStates.set(tapId, {
          sapAmount: 0, lastCollectedAt: 0, qualityBonus: 0, isFrozen: false, treeSeed,
        });

        taps.push({
          id: tapId, bushId: def.id, worldX: pos.x, worldZ: pos.z,
          mesh: maple.group, sapMesh: maple.sapMesh,
          snowMeshes: maple.snowMeshes, leafParticles,
        });
      });

      this.bushStats.set(def.id, {
        totalSapCollected: 0, totalSyrupProduced: 0, bestQualityStreak: 0,
      });

      const instance: SugarBushInstance = {
        id: def.id, name: def.name, village: def.village,
        worldX: def.worldX, worldZ: def.worldZ, yaw: def.yaw,
        cabaneMesh: cabane, evapMesh: evapGroup, evapSteam: steam,
        evapParticles: particles, woodpileMesh: wood, taps,
        evapState: this.evapStates.get(def.id),
      };
      this.bushes.set(def.id, instance);
      instances.push(instance);

      // 🆕 Seed jobs pour cette érablière
      this.jobs.seedForBush(def.id);
    }

    this.initialized = true;
    return instances;
  }

  public setCamera(camera: THREE.Camera): void { this.camera = camera; }
  public setAudioListener(listener: THREE.AudioListener): void { this.audio.setListener(listener); }

  // ────────────────────────────────────────────────────────────────────────
  //  TICK
  // ────────────────────────────────────────────────────────────────────────

  public tick(elapsed: number, dt: number): void {
    if (elapsed - this.lastTickTime < SUGAR_CONFIG.TICK_RATE_MS) return;
    this.lastTickTime = elapsed;

    const now = Date.now();
    const season = quebecSeasons.getState().season;
    const weather = quebecSeasons.getState().condition;
    const temperature = quebecSeasons.getState().temperatureCelsius;

    // 🆕 Refresh économie selon saison
    this.economy.refreshConditions(season, weather);
    this.economy.tick();
    this.quests.tick();
    this.events.tick();
    this.npc.tick(now);

    // Update animations
    for (const bush of this.bushes.values()) {
      for (const tap of bush.taps) {
        const state = this.tapStates.get(tap.id);
        if (!state) continue;

        // Animation sève
        if (tap.sapMesh) {
          const targetScale = state.sapAmount >= SUGAR_CONFIG.MAX_SAP_PER_TAP ? 1 : 0.12;
          tap.sapMesh.scale.y = THREE.MathUtils.lerp(tap.sapMesh.scale.y, targetScale, 0.1);
          tap.sapMesh.visible = tap.sapMesh.scale.y > 0.2;
        }

        // Neige saisonnière
        const showSnow = season === "hiver" && temperature < SUGAR_CONFIG.SNOW.MELT_TEMP_CELSIUS;
        tap.snowMeshes?.forEach((m) => { m.visible = showSnow; });

        // Feuilles automne
        const leafPS = tap.leafParticles as LeafParticleSystem | undefined;
        if (leafPS) {
          leafPS.getMesh().visible = season === "automne";
          if (season === "automne") leafPS.update(dt, bush.yaw);
        }

        // Gel
        if (season === "hiver" && weather === "polaire") {
          state.isFrozen = true;
        } else if (state.isFrozen && season !== "hiver") {
          state.isFrozen = false;
        }
      }

      // Évaporateur
      const evapState = this.evapStates.get(bush.id);
      if (evapState) {
        const isBoiling = evapState.isBoiling;
        for (const puff of bush.evapSteam) {
          const phase = ((puff.userData.phase as number) ?? 0) + dt * (isBoiling ? 1.6 : 0.45);
          puff.userData.phase = phase;
          const lift = (phase % 2.2) * (isBoiling ? 0.55 : 0.22);
          puff.position.y = ((puff.userData.baseY as number) ?? 1.35) + lift;
          puff.scale.setScalar(isBoiling ? 0.7 + (phase % 1.4) * 0.5 : 0.35);
          puff.visible = isBoiling || lift < 0.55;
        }

        const steamPS = bush.evapParticles as ParticleSystem | undefined;
        if (steamPS) {
          steamPS.setActive(isBoiling);
          if (isBoiling) {
            steamPS.emit(new THREE.Vector3(0, 1.35, 0), 3);
            steamPS.update(dt);
          }
        }

        const glow = bush.evapMesh.getObjectByName("fire_glow") as THREE.Mesh;
        if (glow) {
          const intensity = isBoiling ? 0.4 + Math.sin(elapsed * 0.01) * 0.1 : 0.2;
          (glow.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  INTERACTIONS
  // ────────────────────────────────────────────────────────────────────────

  public collectSap(tap: SugarTapInstance, elapsed: number): WorkResult {
    const state = this.tapStates.get(tap.id);
    if (!state) return { ok: false, notice: "Erreur système" };

    const season = quebecSeasons.getState().season;
    const weather = quebecSeasons.getState().condition;
    const seasonMult = SUGAR_CONFIG.SEASON_MULTIPLIERS[season] ?? 1;
    const weatherMult = SUGAR_CONFIG.WEATHER_EFFECTS[weather] ?? 1.0;
    const totalMult = seasonMult * weatherMult;

    if (state.isFrozen) return { ok: false, notice: "❄️ Entaille gelée" };

    const timeSince = elapsed - state.lastCollectedAt;
    const refillTime = SUGAR_CONFIG.TAP_REFILL_SECONDS / totalMult;
    if (timeSince < refillTime) {
      return { ok: false, notice: `Pas encore · ${Math.ceil(refillTime - timeSince)}s` };
    }

    state.sapAmount = SUGAR_CONFIG.MAX_SAP_PER_TAP;
    state.lastCollectedAt = elapsed;
    state.qualityBonus = Math.min(1, (timeSince - refillTime) / 10);

    if (tap.sapMesh) {
      tap.sapMesh.visible = true;
      tap.sapMesh.scale.set(1, 1, 1);
    }

    const stats = this.bushStats.get(tap.bushId);
    if (stats) stats.totalSapCollected++;

    return {
      ok: true,
      notice: `✓ Coulée récoltée`,
      loot: { id: "eau_erable", n: 1 },
    };
  }

  public processSyrup(evap: { bushId: string; mesh: THREE.Group; state?: SugarEvapState; particles?: unknown }, playerSapCount: number): WorkResult {
    const state = evap.state ?? this.evapStates.get(evap.bushId);
    if (!state) return { ok: false, notice: "Évaporateur indisponible" };

    const total = state.sapBuffer + playerSapCount;
    const needed = SUGAR_CONFIG.SAP_PER_SYRUP;
    if (total < needed) {
      return { ok: false, notice: `Il faut ${needed} seaux · ${total} dispo` };
    }

    state.isBoiling = true;
    state.boilProgress = 0;
    state.lastBoilAt = Date.now();

    let quality: "GOLDEN" | "AMBER" | "DARK" = "GOLDEN";
    const rand = Math.random();
    if (rand > 0.9) quality = "DARK";
    else if (rand > 0.6) quality = "AMBER";
    state.syrupQuality = quality;

    const syrupLevel = evap.mesh.getObjectByName("syrup_level") as THREE.Mesh | null;
    if (syrupLevel) syrupLevel.visible = true;

    const ps = evap.particles as ParticleSystem | undefined;
    if (ps) ps.setActive(true);

    this.audio.play(evap.bushId);

    const stats = this.bushStats.get(evap.bushId);
    if (stats) {
      stats.totalSyrupProduced++;
      if (quality === "DARK") stats.bestQualityStreak++;
      else stats.bestQualityStreak = 0;
      stats.lastProductionAt = Date.now();
    }

    const qualityData = SUGAR_CONFIG.SYRUP_QUALITIES[quality];

    return {
      ok: true,
      notice: `✓ Sirop ${qualityData.name} produit !`,
      loot: { id: qualityData.id, n: 1 },
      consume: { id: "eau_erable", n: needed },
      metadata: { quality, value: qualityData.value },
    };
  }

  public finishBoiling(evap: { bushId: string; mesh: THREE.Group; state?: SugarEvapState; particles?: unknown }): WorkResult | null {
    const state = evap.state ?? this.evapStates.get(evap.bushId);
    if (!state?.isBoiling) return null;

    const elapsed = Date.now() - state.lastBoilAt;
    if (elapsed < SUGAR_CONFIG.EVAP_BOIL_SECONDS * 1000) {
      return { ok: false, notice: `Ébullition · ${Math.ceil((SUGAR_CONFIG.EVAP_BOIL_SECONDS * 1000 - elapsed) / 1000)}s` };
    }

    state.isBoiling = false;
    state.sapBuffer = 0;
    state.boilProgress = 0;

    const ps = evap.particles as ParticleSystem | undefined;
    if (ps) ps.setActive(false);
    this.audio.stop(evap.bushId);

    const syrupLevel = evap.mesh.getObjectByName("syrup_level") as THREE.Mesh | null;
    if (syrupLevel) syrupLevel.visible = false;

    const quality = state.syrupQuality ?? "GOLDEN";
    const data = SUGAR_CONFIG.SYRUP_QUALITIES[quality];
    return { ok: true, notice: `✓ Sirop prêt · ${data.name}`, loot: { id: data.id, n: 1 } };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  PERSISTANCE
  // ────────────────────────────────────────────────────────────────────────

  public saveState(): ErabliereSave {
    return buildSavePayload({
      tapStates: Object.fromEntries(this.tapStates),
      evapStates: Object.fromEntries(this.evapStates),
      bushStats: Object.fromEntries(this.bushStats),
      jobs: this.jobs.serialize() as unknown[],
      npcWorkers: this.npc.serialize(),
      economy: this.economy.serialize(),
      quests: this.quests.serialize(),
      events: this.events.serialize(),
    });
  }

  public loadState(raw: unknown): boolean {
    const save = validateSave(raw);
    if (!save) return false;

    this.tapStates.clear();
    for (const [id, s] of Object.entries(save.tapStates)) this.tapStates.set(id, s as SugarTapState);
    this.evapStates.clear();
    for (const [id, s] of Object.entries(save.evapStates)) this.evapStates.set(id, s as SugarEvapState);
    this.bushStats.clear();
    for (const [id, s] of Object.entries(save.bushStats)) this.bushStats.set(id, s as SugarBushStats);

    if (save.jobs) this.jobs.restore(save.jobs);
    if (save.npcWorkers) this.npc.restore(save.npcWorkers);
    if (save.economy) this.economy.restore(save.economy as any);
    if (save.quests) this.quests.restore(save.quests as any);
    if (save.events) this.events.restore(save.events as any);

    return true;
  }

  public reset(): void {
    this.tapStates.clear();
    this.evapStates.clear();
    this.bushStats.clear();
    this.bushes.clear();
    this.lastTickTime = 0;
    this.initialized = false;
    this.audio.dispose();
  }

  // ────────────────────────────────────────────────────────────────────────
  //  GETTERS
  // ────────────────────────────────────────────────────────────────────────

  public getBush(id: string) { return this.bushes.get(id); }
  public getAllBushes() { return [...this.bushes.values()]; }
  public getBushStats(id: string) { return this.bushStats.get(id); }

  // ────────────────────────────────────────────────────────────────────────
  //  INTERNAL BUILDERS (Three.js)
  // ────────────────────────────────────────────────────────────────────────

  private initMaterialCache(): void {
    const colors = [0x4a3020, 0xc45a28, 0xd47830, 0xb84820, 0x8a8a82, 0x9aa0a4, 0xe8d8a8, 0x7a4438, 0xe07020, 0xb8bcc0, 0x8a4a18, 0xe8ece8, 0xffffff];
    colors.forEach((c) => {
      this.materialCache.set(`mat_${c}`, matLib.get(c, 0.92, 0));
    });
  }

  private getMaterial(color: number, rough: number, metal: number): THREE.Material {
    const key = `mat_${color}_${rough}_${metal}`;
    let m = this.materialCache.get(key);
    if (!m) {
      m = matLib.get(color, rough, metal);
      this.materialCache.set(key, m);
    }
    return m;
  }

  private farmToWorld(bush: { worldX: number; worldZ: number; yaw: number }, ox: number, oz: number) {
    return {
      x: bush.worldX + Math.cos(bush.yaw) * ox - Math.sin(bush.yaw) * oz,
      z: bush.worldZ + Math.sin(bush.yaw) * ox + Math.cos(bush.yaw) * oz,
    };
  }

  private buildSugarMaple(seed: number): { group: THREE.Group; sapMesh: THREE.Mesh; snowMeshes: THREE.Mesh[] } {
    const g = new THREE.Group();
    const random = () => { const x = Math.sin(seed + Math.random() * 1000) * 10000; return x - Math.floor(x); };
    const trunkR = THREE.MathUtils.lerp(SUGAR_CONFIG.PROCEDURAL.TRUNK_RADIUS_MIN, SUGAR_CONFIG.PROCEDURAL.TRUNK_RADIUS_MAX, random());
    const trunkH = THREE.MathUtils.lerp(SUGAR_CONFIG.PROCEDURAL.TRUNK_HEIGHT_MIN, SUGAR_CONFIG.PROCEDURAL.TRUNK_HEIGHT_MAX, random());
    const canopyS = THREE.MathUtils.lerp(SUGAR_CONFIG.PROCEDURAL.CANOPY_SIZE_MIN, SUGAR_CONFIG.PROCEDURAL.CANOPY_SIZE_MAX, random());

    const trunk = new THREE.Mesh(getGeo("cylinder", { r: trunkR, r2: trunkR * 1.3, h: trunkH, seg: 7 }), this.getMaterial(0x4a3020, 0.95, 0));
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    g.add(trunk);

    const canopy = new THREE.Mesh(getGeo("sphere", { r: canopyS, seg: 8, segH: 6 }), this.getMaterial(0xc45a28, 0.92, 0));
    canopy.position.y = trunkH + canopyS * 0.6;
    g.add(canopy);

    const bucket = new THREE.Mesh(getGeo("cylinder", { r: 0.16, r2: 0.14, h: 0.32, seg: 8 }), this.getMaterial(0x9aa0a4, 0.35, 0.65));
    bucket.position.set(0.54, trunkH * 0.2, 0);
    g.add(bucket);

    const sapMesh = new THREE.Mesh(getGeo("cylinder", { r: 0.12, r2: 0.12, h: 0.1, seg: 8 }), this.getMaterial(0xe8d8a8, 0.18, 0.08));
    sapMesh.position.set(0.54, trunkH * 0.18, 0);
    sapMesh.name = "sap";
    sapMesh.visible = false;
    g.add(sapMesh);

    return { group: g, sapMesh, snowMeshes: [] };
  }

  private buildEvaporator(bushId: string): { group: THREE.Group; steam: THREE.Mesh[]; particles: ParticleSystem } {
    const g = new THREE.Group();
    const box = new THREE.Mesh(getGeo("box", { w: 2.8, h: 0.9, d: 1.65 }), this.getMaterial(0x7a4438, 0.92, 0));
    box.position.y = 0.45;
    g.add(box);

    const glow = new THREE.Mesh(getGeo("box", { w: 0.48, h: 0.18, d: 0.06 }), this.getMaterial(0xe07020, 0.4, 0.2));
    glow.position.set(0, 0.3, 0.94);
    glow.name = "fire_glow";
    g.add(glow);

    const pan = new THREE.Mesh(getGeo("box", { w: 2.55, h: 0.12, d: 1.4 }), this.getMaterial(0xb8bcc0, 0.28, 0.72));
    pan.position.y = 0.98;
    g.add(pan);

    const syrup = new THREE.Mesh(getGeo("box", { w: 2.25, h: 0.05, d: 1.15 }), this.getMaterial(0x8a4a18, 0.22, 0.12));
    syrup.position.y = 1.04;
    syrup.name = "syrup_level";
    syrup.visible = false;
    g.add(syrup);

    const steam: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(getGeo("sphere", { r: 0.22, seg: 5, segH: 4 }), this.getMaterial(0xe8ece8, 0.85, 0));
      puff.position.set((i - 1.5) * 0.45, 1.35, 0);
      puff.userData = { phase: i * 0.7, baseY: 1.35 };
      puff.visible = false;
      g.add(puff);
      steam.push(puff);
    }

    const particles = new ParticleSystem(SUGAR_CONFIG.PARTICLES.STEAM_COUNT, 0xe8ece8);
    particles.getMesh().position.y = 1.35;
    particles.getMesh().visible = false;
    g.add(particles.getMesh());

    return { group: g, steam, particles };
  }

  private buildWoodpile(): THREE.Group {
    const g = new THREE.Group();
    const logGeo = getGeo("cylinder", { r: 0.12, r2: 0.13, h: 1.4, seg: 5 });
    const woodMat = this.getMaterial(0x6a4a32, 0.92, 0);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(logGeo, woodMat);
        m.rotation.z = Math.PI / 2;
        m.position.set(0, 0.14 + row * 0.24, (i - 2) * 0.26);
        g.add(m);
      }
    }
    return g;
  }
}

// Singleton
export const erabliereSystem = new ErabliereSystem();