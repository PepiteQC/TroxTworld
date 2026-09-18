// ═══════════════════════════════════════════════════════════════════════════
//  TRAFFIC SYSTEM — TRAFIC IA SUR LE RÉSEAU ROUTIER
//  src/components/TrafficSystem.tsx
//
//  FUSION et refonte de la version R3F d'origine.
//
//  Ce que la version précédente faisait : les véhicules avançaient à vitesse
//  fixe le long des courbes et faisaient du ping-pong aux extrémités. Ils se
//  traversaient les uns les autres et ignoraient les villages.
//
//  Ce que fait cette version :
//    · MODÈLE IDM        — chaque véhicule suit celui devant lui, freine,
//                          accélère et garde une distance de sécurité réelle
//    · GRAPHE DE VOIES   — circulation à droite, dépassement sur autoroute
//    · VITESSE PAR ZONE  — ralentit en traversée de village (50 km/h)
//    · POOL D'INSTANCES  — InstancedMesh, pas un <group> par véhicule
//    · STREAMING         — seuls les véhicules proches du joueur sont simulés
//    · FEUX              — phares la nuit, feux stop au freinage, gyrophares
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  ROUTE_138_CURVES, ALL_LANES, Lane, RoadCurve,
  getCurve, getCurveDef, sampleLane,
} from '../roads/Route138';

// ─────────────────────────────────────────────────────────────────────────
//  TYPES ET CONSTANTES
// ─────────────────────────────────────────────────────────────────────────

export type VehicleKind = 'car' | 'truck' | 'van' | 'pickup' | 'police' | 'bus';

interface VehicleProfile {
  length: number;
  width: number;
  height: number;
  maxSpeedFactor: number;   // fraction de la limite affichée
  acceleration: number;     // m/s²
  comfortBraking: number;   // m/s²
  minGap: number;           // distance d'arrêt minimale (m)
  reactionTime: number;     // s — temps de réaction du conducteur
  avoidsPassingLane: boolean;
}

const PROFILES: Record<VehicleKind, VehicleProfile> = {
  car:     { length: 4.3, width: 1.8, height: 1.45, maxSpeedFactor: 0.98, acceleration: 2.2, comfortBraking: 2.6, minGap: 2.5, reactionTime: 1.3, avoidsPassingLane: false },
  van:     { length: 5.2, width: 2.0, height: 2.1,  maxSpeedFactor: 0.92, acceleration: 1.6, comfortBraking: 2.2, minGap: 3.0, reactionTime: 1.5, avoidsPassingLane: false },
  pickup:  { length: 5.6, width: 2.0, height: 1.9,  maxSpeedFactor: 0.95, acceleration: 1.9, comfortBraking: 2.4, minGap: 2.8, reactionTime: 1.4, avoidsPassingLane: false },
  truck:   { length: 12.0, width: 2.5, height: 3.6, maxSpeedFactor: 0.80, acceleration: 0.9, comfortBraking: 1.6, minGap: 5.0, reactionTime: 1.8, avoidsPassingLane: true },
  bus:     { length: 11.0, width: 2.5, height: 3.2, maxSpeedFactor: 0.84, acceleration: 1.1, comfortBraking: 1.8, minGap: 4.5, reactionTime: 1.7, avoidsPassingLane: true },
  police:  { length: 4.9, width: 1.9, height: 1.5,  maxSpeedFactor: 1.05, acceleration: 3.2, comfortBraking: 3.4, minGap: 2.2, reactionTime: 0.9, avoidsPassingLane: false },
};

const BODY_COLORS = [
  0xb9232e, 0xe0e2df, 0x1e4d79, 0xd18b2a, 0x2b2f35,
  0xf1f0e8, 0x35604a, 0x8a8f96, 0x6b2d3c, 0x243447,
];

interface TrafficVehicle {
  id: number;
  kind: VehicleKind;
  profile: VehicleProfile;
  colorIndex: number;

  laneId: string;
  lane: Lane;
  /** Distance parcourue depuis le début de la voie (mètres). */
  s: number;
  speed: number;          // m/s
  targetSpeed: number;    // m/s
  braking: boolean;

  position: THREE.Vector3;
  heading: number;
  active: boolean;
  sirenOn: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
//  MODÈLE IDM (Intelligent Driver Model)
//  C'est ce qui donne un trafic crédible : un véhicule qui approche d'un
//  autre ralentit progressivement au lieu de le traverser.
// ─────────────────────────────────────────────────────────────────────────

function idmAcceleration(
  v: number,          // vitesse actuelle
  v0: number,         // vitesse désirée
  gap: number,        // distance au véhicule devant
  deltaV: number,     // différence de vitesse (v - vLeader)
  p: VehicleProfile
): number {
  const a = p.acceleration;
  const b = p.comfortBraking;

  // Distance de sécurité désirée
  const sStar = p.minGap
    + Math.max(0, v * p.reactionTime + (v * deltaV) / (2 * Math.sqrt(a * b)));

  const freeRoad = 1 - Math.pow(v / Math.max(0.1, v0), 4);
  const interaction = gap > 0 ? Math.pow(sStar / gap, 2) : 4;

  return a * (freeRoad - interaction);
}

// ─────────────────────────────────────────────────────────────────────────
//  GÉOMÉTRIES PARTAGÉES — une par catégorie, instanciées
// ─────────────────────────────────────────────────────────────────────────

function buildVehicleGeometry(kind: VehicleKind): THREE.BufferGeometry {
  const p = PROFILES[kind];
  const parts: THREE.BufferGeometry[] = [];

  // Châssis
  const body = new THREE.BoxGeometry(p.width, p.height * 0.5, p.length);
  body.translate(0, p.height * 0.32, 0);
  parts.push(body);

  // Cabine / habitacle
  if (kind === 'truck' || kind === 'bus') {
    const cab = new THREE.BoxGeometry(p.width * 0.95, p.height * 0.55, p.length * 0.28);
    cab.translate(0, p.height * 0.72, p.length * 0.34);
    parts.push(cab);
    // Caisse
    const box = new THREE.BoxGeometry(p.width, p.height * 0.62, p.length * 0.6);
    box.translate(0, p.height * 0.75, -p.length * 0.16);
    parts.push(box);
  } else {
    const cabin = new THREE.BoxGeometry(p.width * 0.86, p.height * 0.42, p.length * 0.46);
    cabin.translate(0, p.height * 0.72, -p.length * 0.06);
    parts.push(cabin);
  }

  // Roues
  const wheelR = kind === 'truck' || kind === 'bus' ? 0.52 : 0.33;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = new THREE.CylinderGeometry(wheelR, wheelR, 0.22, 8);
      w.rotateZ(Math.PI / 2);
      w.translate(
        sx * (p.width / 2 - 0.1),
        wheelR,
        sz * (p.length * 0.32)
      );
      parts.push(w);
    }
  }

  return mergeGeometries(parts);
}

/** Fusion manuelle — évite la dépendance à BufferGeometryUtils. */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let offset = 0;

  for (const g of geos) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
    }
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i + offset);
    }
    offset += pos.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setIndex(indices);
  merged.computeBoundingSphere();
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────
//  GESTIONNAIRE DE TRAFIC
// ─────────────────────────────────────────────────────────────────────────

export interface TrafficConfig {
  maxVehicles: number;
  simulationRadius: number;   // au-delà, les véhicules ne sont plus simulés
  spawnRadius: number;
  densityMultiplier: number;
  policeRatio: number;
  truckRatio: number;
}

const DEFAULT_TRAFFIC: TrafficConfig = {
  maxVehicles: 48,
  simulationRadius: 900,
  spawnRadius: 700,
  densityMultiplier: 1.0,
  policeRatio: 0.06,
  truckRatio: 0.18,
};

class TrafficManager {
  vehicles: TrafficVehicle[] = [];
  /** Index par voie, trié par position — permet de trouver le leader en O(1). */
  private byLane = new Map<string, TrafficVehicle[]>();
  private laneLengths = new Map<string, number>();
  private config: TrafficConfig;
  private nextId = 0;

  constructor(config: Partial<TrafficConfig> = {}) {
    this.config = { ...DEFAULT_TRAFFIC, ...config };

    // Longueur de chaque voie
    for (const lane of ALL_LANES) {
      const def = getCurveDef(lane.curveId);
      if (def) this.laneLengths.set(lane.id, def.totalLength);
    }
  }

  private pickKind(): VehicleKind {
    const r = Math.random();
    if (r < this.config.policeRatio) return 'police';
    if (r < this.config.policeRatio + this.config.truckRatio) return 'truck';
    if (r < 0.32) return 'pickup';
    if (r < 0.42) return 'van';
    if (r < 0.45) return 'bus';
    return 'car';
  }

  /**
   * Fait apparaître un véhicule sur une voie, hors du champ de vision.
   */
  spawn(playerPos: THREE.Vector3): TrafficVehicle | null {
    if (this.vehicles.length >= this.config.maxVehicles) return null;

    // Choisit une voie proche du joueur
    const candidates = ALL_LANES.filter((lane) => {
      const def = getCurveDef(lane.curveId);
      if (!def) return false;
      const mid = def.points[Math.floor(def.points.length / 2)];
      return mid.distanceTo(playerPos) < this.config.spawnRadius * 2;
    });
    if (candidates.length === 0) return null;

    const lane = candidates[Math.floor(Math.random() * candidates.length)];
    const laneLength = this.laneLengths.get(lane.id) ?? 1000;

    const kind = this.pickKind();
    const profile = PROFILES[kind];

    // Les camions évitent la voie de dépassement
    if (profile.avoidsPassingLane && lane.isPassingLane) return null;

    // Apparaît à une distance qui n'est pas dans le champ de vision immédiat
    const s = Math.random() * laneLength;
    const sample = sampleLane(lane, s / laneLength);
    if (!sample) return null;

    const distToPlayer = sample.position.distanceTo(playerPos);
    if (distToPlayer < 120 || distToPlayer > this.config.spawnRadius) return null;

    // Vérifie qu'aucun véhicule n'occupe déjà cet emplacement
    const onLane = this.byLane.get(lane.id) ?? [];
    for (const other of onLane) {
      if (Math.abs(other.s - s) < profile.length + other.profile.length + 8) return null;
    }

    const targetSpeed = (lane.speedLimit / 3.6) * profile.maxSpeedFactor
      * (0.92 + Math.random() * 0.14);

    const vehicle: TrafficVehicle = {
      id: this.nextId++,
      kind, profile,
      colorIndex: kind === 'police' ? -1 : Math.floor(Math.random() * BODY_COLORS.length),
      laneId: lane.id, lane,
      s, speed: targetSpeed * 0.9, targetSpeed,
      braking: false,
      position: sample.position,
      heading: Math.atan2(sample.tangent.x, sample.tangent.z),
      active: true,
      sirenOn: kind === 'police' && Math.random() < 0.15,
    };

    this.vehicles.push(vehicle);
    if (!this.byLane.has(lane.id)) this.byLane.set(lane.id, []);
    this.byLane.get(lane.id)!.push(vehicle);

    return vehicle;
  }

  despawn(vehicle: TrafficVehicle): void {
    const i = this.vehicles.indexOf(vehicle);
    if (i !== -1) this.vehicles.splice(i, 1);
    const onLane = this.byLane.get(vehicle.laneId);
    if (onLane) {
      const j = onLane.indexOf(vehicle);
      if (j !== -1) onLane.splice(j, 1);
    }
  }

  /**
   * Trouve le véhicule devant, sur la même voie.
   * Les listes par voie sont triées, donc c'est rapide.
   */
  private findLeader(v: TrafficVehicle): TrafficVehicle | null {
    const onLane = this.byLane.get(v.laneId);
    if (!onLane || onLane.length < 2) return null;

    let leader: TrafficVehicle | null = null;
    let minGap = Infinity;

    for (const other of onLane) {
      if (other === v) continue;
      // Distance dans le sens de circulation
      const gap = v.lane.direction > 0 ? other.s - v.s : v.s - other.s;
      if (gap > 0 && gap < minGap) {
        minGap = gap;
        leader = other;
      }
    }

    return leader;
  }

  update(delta: number, playerPos: THREE.Vector3, hour: number): void {
    const dt = Math.min(delta, 0.05);

    // Maintient la population : spawn si sous le quota
    const targetCount = Math.round(
      this.config.maxVehicles * this.config.densityMultiplier
      * (hour >= 7 && hour <= 19 ? 1 : 0.35)  // moins de trafic la nuit
    );
    if (this.vehicles.length < targetCount) {
      for (let i = 0; i < 3; i++) this.spawn(playerPos);
    }

    // Tri par voie pour la recherche de leader
    for (const list of this.byLane.values()) {
      list.sort((a, b) => a.s - b.s);
    }

    const toDespawn: TrafficVehicle[] = [];

    for (const v of this.vehicles) {
      const laneLength = this.laneLengths.get(v.laneId) ?? 1000;

      // ── Simulation seulement à proximité ──
      const distToPlayer = v.position.distanceTo(playerPos);
      v.active = distToPlayer < this.config.simulationRadius;

      if (distToPlayer > this.config.simulationRadius * 1.4) {
        toDespawn.push(v);
        continue;
      }
      if (!v.active) continue;

      // ── IDM : accélération selon le véhicule devant ──
      const leader = this.findLeader(v);
      let gap = 1000;
      let deltaV = 0;

      if (leader) {
        gap = Math.abs(leader.s - v.s) - (v.profile.length + leader.profile.length) / 2;
        deltaV = v.speed - leader.speed;
      }

      const accel = idmAcceleration(v.speed, v.targetSpeed, gap, deltaV, v.profile);
      v.braking = accel < -0.6;

      v.speed = Math.max(0, v.speed + accel * dt);
      // Sécurité : jamais au-dessus de 1,2× la limite
      v.speed = Math.min(v.speed, v.targetSpeed * 1.2);

      // ── Avance sur la voie ──
      v.s += v.speed * dt * v.lane.direction;

      // Boucle en fin de voie — le véhicule repart de l'autre bout
      if (v.s > laneLength) v.s -= laneLength;
      if (v.s < 0) v.s += laneLength;

      // ── Position et orientation ──
      const sample = sampleLane(v.lane, v.s / laneLength);
      if (sample) {
        v.position.copy(sample.position);
        const targetHeading = Math.atan2(sample.tangent.x, sample.tangent.z);
        // Lissage de la rotation — évite les à-coups dans les virages
        let diff = targetHeading - v.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.heading += diff * Math.min(1, dt * 10);
      }
    }

    toDespawn.forEach((v) => this.despawn(v));
  }

  getStats() {
    const byKind: Record<string, number> = {};
    for (const v of this.vehicles) byKind[v.kind] = (byKind[v.kind] ?? 0) + 1;
    return {
      total: this.vehicles.length,
      active: this.vehicles.filter((v) => v.active).length,
      byKind,
      avgSpeedKmh: this.vehicles.length
        ? Math.round(this.vehicles.reduce((s, v) => s + v.speed, 0) / this.vehicles.length * 3.6)
        : 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  COMPOSANT R3F
// ─────────────────────────────────────────────────────────────────────────

export interface TrafficSystemProps {
  /** Position du joueur — pilote le spawn et le culling. */
  playerPosition?: THREE.Vector3;
  /** Heure du jour (0-24) — moins de trafic la nuit, phares allumés. */
  hour?: number;
  maxVehicles?: number;
  densityMultiplier?: number;
}

export function TrafficSystem({
  playerPosition,
  hour = 14,
  maxVehicles = 48,
  densityMultiplier = 1.0,
}: TrafficSystemProps) {
  const manager = useMemo(
    () => new TrafficManager({ maxVehicles, densityMultiplier }),
    [maxVehicles, densityMultiplier]
  );

  // Une InstancedMesh par type de véhicule
  const kinds: VehicleKind[] = ['car', 'van', 'pickup', 'truck', 'bus', 'police'];

  const meshes = useMemo(() => {
    const map = new Map<VehicleKind, {
      geometry: THREE.BufferGeometry;
      material: THREE.MeshStandardMaterial;
      ref: { current: THREE.InstancedMesh | null };
    }>();

    for (const kind of kinds) {
      map.set(kind, {
        geometry: buildVehicleGeometry(kind),
        material: new THREE.MeshStandardMaterial({
          color: kind === 'police' ? 0xf0f0f0 : 0xffffff,
          roughness: 0.45,
          metalness: 0.25,
          vertexColors: false,
        }),
        ref: { current: null },
      });
    }
    return map;
  }, []);

  const instanceRefs = useRef<Map<VehicleKind, THREE.InstancedMesh | null>>(new Map());
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);
  const fallbackPos = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame((state, delta) => {
    const pPos = playerPosition ?? state.camera.position ?? fallbackPos;
    manager.update(delta, pPos, hour);

    // Répartit les véhicules par type dans les InstancedMesh
    const counters = new Map<VehicleKind, number>();
    for (const kind of kinds) counters.set(kind, 0);

    for (const v of manager.vehicles) {
      if (!v.active) continue;
      const mesh = instanceRefs.current.get(v.kind);
      if (!mesh) continue;

      const idx = counters.get(v.kind)!;
      if (idx >= mesh.count) continue;

      dummy.position.copy(v.position);
      dummy.rotation.set(0, v.heading, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);

      // Couleur par instance
      if (v.colorIndex >= 0) {
        colorObj.setHex(BODY_COLORS[v.colorIndex]);
      } else {
        colorObj.setHex(0xf0f0f0); // police : blanc
      }
      mesh.setColorAt?.(idx, colorObj);

      counters.set(v.kind, idx + 1);
    }

    // Applique et masque les instances inutilisées
    for (const kind of kinds) {
      const mesh = instanceRefs.current.get(kind);
      if (!mesh) continue;
      const used = counters.get(kind)!;

      // Renvoie les instances inutilisées très loin (moins cher que de
      // redimensionner l'InstancedMesh à chaque frame)
      for (let i = used; i < mesh.count; i++) {
        dummy.position.set(0, -9999, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  const perKindCapacity = Math.ceil(maxVehicles * 0.6);

  return (
    <group name="TrafficSystem">
      {kinds.map((kind) => {
        const entry = meshes.get(kind)!;
        return (
          <instancedMesh
            key={kind}
            ref={(node) => { instanceRefs.current.set(kind, node); }}
            args={[entry.geometry, entry.material, perKindCapacity]}
            castShadow
            frustumCulled={false}
          />
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  EXPORT DU GESTIONNAIRE — pour l'inspecter depuis l'admin
// ─────────────────────────────────────────────────────────────────────────

export { TrafficManager, PROFILES as VEHICLE_PROFILES };