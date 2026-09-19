// ═══════════════════════════════════════════════════════════════════════════
//  PORTNEUF WORLD — ORCHESTRATEUR DU MONDE OUVERT
//  src/world/PortneufWorld.ts
//  Assemble tout : terrain à relief, fleuve Saint-Laurent, forêt laurentienne,
//  réseau routier, 18 villages. Gère le LOD et le culling pour tenir 60 FPS
//  sur un monde de 3000 × 2000 unités (≈ 6 km × 4 km à l'échelle du jeu).
//
//  Topographie réelle : le fleuve au sud (z ≈ +60), les terres agricoles en
//  plaine le long de la 138, puis les contreforts des Laurentides au nord
//  (z < -400) qui montent progressivement.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RoadNetworkBuilder, PORTNEUF_ROAD_NETWORK } from '../game/city/environment/roads/RoadNetworkBuilder';
import { VillageBuilder, VILLAGE_PROFILES, BuiltVillage } from './VillageBuilder';
import { matLib } from '../game/city/buildings/architecture/QuebecArchitecture';

// ─────────────────────────────────────────────────────────────────────────
//  LIMITES DU MONDE
// ─────────────────────────────────────────────────────────────────────────

export const WORLD_BOUNDS = {
  minX: -1600, maxX: 1600,
  minZ: -1100, maxZ: 200,
  get width() { return this.maxX - this.minX; },
  get depth() { return this.maxZ - this.minZ; },
};

export const RIVER_Z = 90; // le fleuve Saint-Laurent longe cette ligne

/**
 * Fonction de hauteur du terrain — définit tout le relief du comté.
 * Le fleuve en bas, la plaine agricole, puis les Laurentides qui montent.
 */
export function getTerrainHeight(x: number, z: number): number {
  // Sous le fleuve : creux
  if (z > RIVER_Z - 20) {
    const depth = (z - (RIVER_Z - 20)) / 60;
    return -2 - depth * 4;
  }

  let h = 0;

  // Plaine du Saint-Laurent : très plate près du fleuve
  const distFromRiver = Math.max(0, RIVER_Z - z);

  // Montée progressive vers les Laurentides (au nord)
  if (z < -350) {
    const mountainFactor = (-z - 350) / 750;
    h += mountainFactor * mountainFactor * 85;
  }

  // Collines douces (bruit basse fréquence)
  h += Math.sin(x * 0.0018) * Math.cos(z * 0.0022) * 7;
  h += Math.sin(x * 0.0045 + 1.3) * Math.cos(z * 0.0038 - 0.7) * 3.5;

  // Micro-relief
  h += Math.sin(x * 0.012) * Math.cos(z * 0.011) * 0.9;

  // Aplanissement près du fleuve (terrasse alluviale)
  if (distFromRiver < 120) {
    h *= distFromRiver / 120;
  }

  // Aplanissement le long des routes principales (z ≈ 0 et z ≈ -150)
  const roadFlatten = (roadZ: number, width: number) => {
    const d = Math.abs(z - roadZ);
    if (d < width) h *= 0.25 + (d / width) * 0.75;
  };
  roadFlatten(0, 45);    // Route 138
  roadFlatten(-150, 55); // Autoroute 40

  return h;
}

// ─────────────────────────────────────────────────────────────────────────
//  MONDE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────

export interface WorldOptions {
  segmentsX?: number;
  segmentsZ?: number;
  buildVillages?: boolean;
  buildRoads?: boolean;
  litRatio?: number;
}

export class PortneufWorld {
  private group: THREE.Group;
  private roadBuilder: RoadNetworkBuilder;
  private villageBuilder: VillageBuilder;
  private riverMesh: THREE.Mesh | null = null;
  private riverMaterial: THREE.MeshStandardMaterial | null = null;
  private forestChunks: THREE.Group[] = [];
  private clock = 0;

  constructor(private scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'PortneufWorld';
    this.scene.add(this.group);

    this.roadBuilder = new RoadNetworkBuilder(scene);
    this.villageBuilder = new VillageBuilder(scene, getTerrainHeight);
  }

  /**
   * Construit le monde entier. À appeler une fois au chargement.
   */
  build(opts: WorldOptions = {}): void {
    const t0 = performance.now();

    this.buildTerrain(opts.segmentsX ?? 180, opts.segmentsZ ?? 120);
    this.buildRiver();
    this.buildForests();

    if (opts.buildRoads !== false) {
      this.roadBuilder.buildAll(PORTNEUF_ROAD_NETWORK);
    }
    if (opts.buildVillages !== false) {
      this.villageBuilder.buildAll(opts.litRatio ?? 0);
    }

    const ms = Math.round(performance.now() - t0);
    console.log(`🌍 [PortneufWorld] Monde construit en ${ms} ms — ${WORLD_BOUNDS.width}×${WORLD_BOUNDS.depth} unités`);
  }

  /**
   * Terrain à relief — un seul maillage déformé par getTerrainHeight,
   * avec coloration par altitude (plaine verte → montagne rocheuse).
   */
  private buildTerrain(segX: number, segZ: number): void {
    const geo = new THREE.PlaneGeometry(
      WORLD_BOUNDS.width, WORLD_BOUNDS.depth, segX, segZ
    );
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);

    const cPlaine = new THREE.Color(0x5a7a42);   // prairie
    const cAgricole = new THREE.Color(0x7a8a4a); // champs
    const cForet = new THREE.Color(0x3a5a34);    // forêt
    const cMontagne = new THREE.Color(0x6a6258); // roche
    const cRive = new THREE.Color(0x8a8270);     // berge sableuse

    const offsetX = (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2;
    const offsetZ = (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2;

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + offsetX;
      const wz = pos.getZ(i) + offsetZ;
      const h = getTerrainHeight(wx, wz);
      pos.setY(i, h);

      // Coloration par altitude et position
      const c = new THREE.Color();
      if (wz > RIVER_Z - 45) {
        c.copy(cRive);
      } else if (h > 45) {
        c.copy(cMontagne);
      } else if (h > 18) {
        c.lerpColors(cForet, cMontagne, (h - 18) / 27);
      } else if (wz < -300) {
        c.lerpColors(cAgricole, cForet, Math.min(1, (-wz - 300) / 300));
      } else {
        c.lerpColors(cPlaine, cAgricole, Math.abs(Math.sin(wx * 0.004) * Math.cos(wz * 0.005)));
      }
      // Variation subtile pour casser l'uniformité
      c.offsetHSL(0, 0, (Math.sin(wx * 0.03) * Math.cos(wz * 0.028)) * 0.035);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });

    const terrain = new THREE.Mesh(geo, mat);
    terrain.position.set(offsetX, 0, offsetZ);
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.group.add(terrain);
  }

  /**
   * Fleuve Saint-Laurent — plan animé avec vagues via déformation de UV.
   */
  private buildRiver(): void {
    const geo = new THREE.PlaneGeometry(WORLD_BOUNDS.width + 400, 320, 60, 12);
    geo.rotateX(-Math.PI / 2);

    this.riverMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a4a68,
      roughness: 0.12,
      metalness: 0.55,
      transparent: true,
      opacity: 0.92,
    });

    this.riverMesh = new THREE.Mesh(geo, this.riverMaterial);
    this.riverMesh.position.set(0, -1.2, RIVER_Z + 130);
    this.riverMesh.receiveShadow = true;
    this.riverMesh.name = 'fleuve_saint_laurent';
    this.group.add(this.riverMesh);

    // Berge rocheuse
    const bankGeo = new THREE.PlaneGeometry(WORLD_BOUNDS.width + 400, 40, 40, 3);
    bankGeo.rotateX(-Math.PI / 2);
    const bankPos = bankGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bankPos.count; i++) {
      bankPos.setY(i, (Math.random() - 0.5) * 1.2);
    }
    bankGeo.computeVertexNormals();
    const bank = new THREE.Mesh(bankGeo, matLib.get(0x7a7264, 1, 0));
    bank.position.set(0, -0.6, RIVER_Z - 12);
    bank.receiveShadow = true;
    this.group.add(bank);
  }

  /**
   * Forêt laurentienne — conifères instanciés dans le nord du comté.
   * Découpée en chunks pour permettre le culling par distance.
   */
  private buildForests(): void {
    const chunkSize = 400;
    const treesPerChunk = 320;

    // Zone forestière : au nord de z = -300
    for (let cx = WORLD_BOUNDS.minX; cx < WORLD_BOUNDS.maxX; cx += chunkSize) {
      for (let cz = WORLD_BOUNDS.minZ; cz < -300; cz += chunkSize) {
        const chunk = this.buildForestChunk(cx, cz, chunkSize, treesPerChunk);
        if (chunk) {
          this.forestChunks.push(chunk);
          this.group.add(chunk);
        }
      }
    }
    console.log(`🌲 [Forêt] ${this.forestChunks.length} chunks forestiers`);
  }

  private buildForestChunk(
    baseX: number, baseZ: number, size: number, count: number
  ): THREE.Group | null {
    const group = new THREE.Group();
    group.name = `forest_${baseX}_${baseZ}`;

    // Sapin baumier : cône vert foncé sur tronc
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 3, 5);
    const trunkMat = matLib.get(0x4a3828, 1, 0);
    const coneGeo = new THREE.ConeGeometry(2.2, 8, 7);
    const coneMat = matLib.get(0x2a4a30, 1, 0);

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const coneInst = new THREE.InstancedMesh(coneGeo, coneMat, count);
    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < count; i++) {
      const x = baseX + Math.random() * size;
      const z = baseZ + Math.random() * size;

      // Pas d'arbres sur les routes ni dans les villages
      if (Math.abs(z) < 40) continue;
      if (Math.abs(z + 150) < 45) continue;
      let tooClose = false;
      for (const v of VILLAGE_PROFILES) {
        if (Math.hypot(x - v.center[0], z - v.center[1]) < 180) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const y = getTerrainHeight(x, z);
      const s = 0.7 + Math.random() * 0.9;

      dummy.position.set(x, y + 1.5 * s, z);
      dummy.scale.setScalar(s);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      trunkInst.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, y + 6.5 * s, z);
      dummy.updateMatrix();
      coneInst.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    if (placed === 0) return null;

    trunkInst.count = placed;
    coneInst.count = placed;
    trunkInst.instanceMatrix.needsUpdate = true;
    coneInst.instanceMatrix.needsUpdate = true;
    coneInst.castShadow = true;

    group.add(trunkInst, coneInst);
    group.userData.center = new THREE.Vector3(baseX + size / 2, 0, baseZ + size / 2);
    return group;
  }

  /**
   * Mise à jour par frame : animation du fleuve, culling par distance.
   * À appeler dans la boucle de rendu.
   */
  update(delta: number, playerPos: THREE.Vector3): void {
    this.clock += delta;

    // Animation du fleuve (vagues par déformation des sommets)
    if (this.riverMesh) {
      const pos = this.riverMesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i,
          Math.sin(x * 0.02 + this.clock * 1.2) * 0.35 +
          Math.cos(z * 0.03 - this.clock * 0.8) * 0.22
        );
      }
      pos.needsUpdate = true;
    }

    // Animation des monuments (moulins, roues à eau, bateaux, drapeaux)
    this.villageBuilder.animate(this.clock, delta);

    // Culling des villages et forêts
    this.villageBuilder.updateVisibility(playerPos, 900);

    for (const chunk of this.forestChunks) {
      const c = chunk.userData.center as THREE.Vector3;
      chunk.visible = playerPos.distanceTo(c) < 1100;
    }
  }

  /**
   * Bascule jour/nuit sur tout le monde.
   */
  setNightMode(isNight: boolean): void {
    this.villageBuilder.setNightMode(isNight);
    this.roadBuilder.setStreetlightsOn(isNight);
    if (this.riverMaterial) {
      this.riverMaterial.color.setHex(isNight ? 0x101c2c : 0x2a4a68);
      this.riverMaterial.metalness = isNight ? 0.75 : 0.55;
    }
  }

  /**
   * Place une entité au sol (utile pour spawner véhicules/joueurs).
   */
  snapToGround(x: number, z: number): number {
    return getTerrainHeight(x, z);
  }

  getVillages(): BuiltVillage[] {
    return this.villageBuilder.getVillages();
  }

  getAllPOIs() {
    return this.villageBuilder.getAllPOIs();
  }

  getNearestVillage(pos: THREE.Vector3) {
    return this.villageBuilder.getNearestVillage(pos);
  }

  getStats() {
    const villages = this.villageBuilder.getVillages();
    return {
      villages: villages.length,
      buildings: villages.reduce((s, v) => s + v.buildingCount, 0),
      roads: PORTNEUF_ROAD_NETWORK.length,
      forestChunks: this.forestChunks.length,
      pois: this.villageBuilder.getAllPOIs().length,
      worldSize: `${WORLD_BOUNDS.width} × ${WORLD_BOUNDS.depth}`,
    };
  }

  dispose(): void {
    this.roadBuilder.dispose();
    this.villageBuilder.dispose();
    matLib.dispose();
    this.scene.remove(this.group);
  }
}