import * as THREE from "three";
import { matLib } from "./materials";
import { getTerrainHeight, type RoadDef } from "./worlddata";
import { getCurrentSeason } from "./seasons"; const getWeatherState = () => "clear" as any;

// ═══════════════════════════════════════════════════════════
// TYPES QUÉBÉCOIS RÉALISTES
// ═══════════════════════════════════════════════════════════

export type RoadSurfaceState =
  | "clean"        // été, route propre
  | "wet"          // pluie
  | "icy"          // glace noire — DANGER
  | "snowy"        // couvert de neige
  | "slush"        // slush printemps/automne
  | "salty"        // résidus de sel/abrasif
  | "potholed"     // nids-de-poule (printemps)
  | "construction"; // chantier avec cônes

export interface Pothole {
  t: number;           // position 0..1 sur la route
  offset: number;      // décalage latéral
  radius: number;      // 0.3–1.2m
  depth: number;       // 0.05–0.25m
}

export interface ConstructionZone {
  tStart: number;
  tEnd: number;
  laneBlocked: "left" | "right" | "both";
  coneSpacing: number;  // mètres entre les cônes
}

export interface RoadSign {
  t: number;
  side: "left" | "right";
  type:
    | "stop"
    | "yield"
    | "speed_limit"
    | "school_zone"
    | "deer_crossing"   // "Chevreuil" — très rural QC
    | "moose_crossing"  // "Orignal" — nord du QC
    | "ice_warning"     // "Chaussée glissante"
    | "construction"    // "Travaux"
    | "dead_end"        // "Cul-de-sac"
    | "route_number";   // "132", "175", "40" etc.
  speedLimit?: number;  // km/h (30, 50, 70, 90, 100, 110)
  routeNum?: string;
}

export interface IcePatch {
  t: number;
  offset: number;
  length: number;
  width: number;
  friction: number;     // 0.05–0.3 (vs 1.0 normal)
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRATION PROCÉDURALE DES DÉFAUTS (saison-dépendant)
// ═══════════════════════════════════════════════════════════

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generatePotholes(
  road: RoadDef,
  density = 0.02,
): Pothole[] {
  const season = getCurrentSeason();
  // CORRECTION: Utilisation de "printemps" et "ete" au lieu de "printemps" et "ete"
  if (season !== "printemps" && season !== "ete") return [];

  const holes: Pothole[] = [];
  const rng = seededRandom(hashStr(road.id));
  const count = Math.floor(road.points.length * density * 10);

  for (let i = 0; i < count; i++) {
    if (rng() > 0.4) continue;
    holes.push({
      t: rng(),
      offset: (rng() - 0.5) * road.width * 0.7,
      radius: 0.3 + rng() * 0.9,
      depth: 0.05 + rng() * 0.2,
    });
  }
  return holes;
}

export function generateConstructionZones(
  road: RoadDef,
): ConstructionZone[] {
  const season = getCurrentSeason();
  // CORRECTION: Utilisation de "hiver" au lieu de "hiver"
  // Saison de construction: mai à novembre au Québec
  if (season === "hiver") return [];

  const zones: ConstructionZone[] = [];
  const rng = seededRandom(hashStr(road.id + "chantier"));

  if (rng() > 0.7 && road.kind !== "gravel") {
    const tStart = 0.2 + rng() * 0.5;
    zones.push({
      tStart,
      tEnd: tStart + 0.05 + rng() * 0.1,
      laneBlocked: rng() > 0.5 ? "right" : "left",
      coneSpacing: 3 + rng() * 4,
    });
  }
  return zones;
}

export function generateIcePatches(road: RoadDef): IcePatch[] {
  const season = getCurrentSeason();
  // CORRECTION: Utilisation de "hiver" et "automne" au lieu de "hiver" et "automne"
  if (season !== "hiver" && season !== "automne") return [];

  const patches: IcePatch[] = [];
  const rng = seededRandom(hashStr(road.id + "glace"));
  const count = Math.floor(road.points.length * 0.5);

  for (let i = 0; i < count; i++) {
    if (rng() > 0.15) continue;
    patches.push({
      t: rng(),
      offset: (rng() - 0.5) * road.width * 0.5,
      length: 5 + rng() * 20,
      width: 2 + rng() * 3,
      friction: 0.05 + rng() * 0.25,
    });
  }
  return patches;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ═══════════════════════════════════════════════════════════
// RIBBON MESH AMÉLIORÉ (avec usure & saisons)
// ═══════════════════════════════════════════════════════════

function getSeasonalRoadColor(
  baseColor: number,
  kind: string,
): number {
  const season = getCurrentSeason();
  const wx = getWeatherState(); const weather = wx.condition;

  // CORRECTION: Utilisation de "hiver" au lieu de "hiver"
  if (season === "hiver") {
    if (wx.condition === "tempete_neige") return 0xd8d8dc; // couvert de neige
    if (kind === "highway") return 0x4a4a50;      // sel/abrasif gris
    return 0x6a6a6e;                               // routes blanchies
  }
  // CORRECTION: Utilisation de "printemps" au lieu de "printemps"
  if (season === "printemps") {
    return kind === "gravel" ? 0x5a5448 : 0x3a3a3e; // boue/slush
  }
  return baseColor;
}

function ribbonMesh(
  road: RoadDef,
  divisions: number,
  width: number,
  color: number,
  yExtra: number,
  offset: number,
  potholes: Pothole[] = [],
): THREE.Mesh {
  const pts = road.points.map(
    ([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z) + yExtra, z),
  );
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const samples = curve.getPoints(divisions);
  const hw = width / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let total = 0;
  const segs = [0];

  for (let i = 1; i < samples.length; i++) {
    total += samples[i].distanceTo(samples[i - 1]);
    segs.push(total);
  }

  for (let i = 0; i < samples.length; i++) {
    const pt = samples[i];
    const next = i < samples.length - 1 ? samples[i + 1] : samples[i - 1];
    const prev = i > 0 ? samples[i - 1] : samples[i + 1];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const ox = n.x * offset;
    const oz = n.z * offset;
    const u = total > 0 ? segs[i] / total : 0;

    // Déformation Y pour les nids-de-poule
    let yDeformL = 0, yDeformR = 0;
    for (const ph of potholes) {
      const dist = Math.abs(u - ph.t);
      if (dist < 0.02) {
        const factor = 1 - dist / 0.02;
        const lateral = ph.offset > 0 ? "R" : "L";
        const depth = ph.depth * factor;
        if (lateral === "L") yDeformL -= depth;
        else yDeformR -= depth;
      }
    }

    positions.push(
      pt.x + ox - n.x * hw, pt.y + yDeformL, pt.z + oz - n.z * hw,
      pt.x + ox + n.x * hw, pt.y + yDeformR, pt.z + oz + n.z * hw,
    );
    const v = u * (total / Math.max(1, width));
    uvs.push(0, v, 1, v);

    if (i < samples.length - 1) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const seasonalColor = getSeasonalRoadColor(color, road.kind);
  const mesh = new THREE.Mesh(geo, matLib.get(seasonalColor, 0.96));
  mesh.receiveShadow = true;
  return mesh;
}

// ═══════════════════════════════════════════════════════════
// CÔNES ORANGE DE CHANTIER 🟠 (LE CLASSIQUE QUÉBÉCOIS)
// ═══════════════════════════════════════════════════════════

function buildCone(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  // Base carrée
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.04, 0.35),
    matLib.get(0x1a1a1a, 0.8),
  );
  base.position.set(x, y + 0.02, z);
  g.add(base);
  // Cône orange
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.7, 8),
    matLib.get(0xff6600, 0.6),
  );
  cone.position.set(x, y + 0.39, z);
  g.add(cone);
  // Bande blanche réfléchissante
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.1, 8),
    matLib.get(0xffffff, 0.2),
  );
  stripe.position.set(x, y + 0.45, z);
  g.add(stripe);
  return g;
}

export function buildConstructionCones(
  road: RoadDef,
  zone: ConstructionZone,
  divisions = 80,
): THREE.Group {
  const g = new THREE.Group();
  g.name = `chantier_${road.id}`;

  const pts = road.points.map(
    ([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z), z),
  );
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const offset = zone.laneBlocked === "right"
    ? road.width * 0.25
    : -road.width * 0.25;

  const tStep = zone.coneSpacing / curve.getLength();
  for (let t = zone.tStart; t <= zone.tEnd; t += tStep) {
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    g.add(buildCone(
      pt.x + n.x * offset,
      pt.y + 0.06,
      pt.z + n.z * offset,
    ));
  }
  return g;
}

// ═══════════════════════════════════════════════════════════
// PANNEAUX DE SIGNALISATION QUÉBÉCOIS 🪧
// ═══════════════════════════════════════════════════════════

function buildSignPost(
  x: number, y: number, z: number,
  signType: RoadSign["type"],
  speedLimit?: number,
  routeNum?: string,
): THREE.Group {
  const g = new THREE.Group();

  // Poteau en U (galvanisé)
  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 2.4, 0.06),
    matLib.get(0x888888, 0.5),
  );
  pole.position.set(x, y + 1.2, z);
  g.add(pole);

  let signColor = 0xffffff;
  let signW = 0.6, signH = 0.6;

  switch (signType) {
    case "stop":
      signColor = 0xcc0000; signW = 0.6; signH = 0.6;
      break;
    case "yield":
      signColor = 0xcc0000; signW = 0.7; signH = 0.6;
      break;
    case "speed_limit":
      signColor = 0xffffff; signW = 0.5; signH = 0.7;
      break;
    case "school_zone":
      signColor = 0xffcc00; signW = 0.6; signH = 0.6;
      break;
    case "deer_crossing":
    case "moose_crossing":
      signColor = 0xffcc00; signW = 0.7; signH = 0.7;
      break;
    case "ice_warning":
      signColor = 0xffcc00; signW = 0.6; signH = 0.6;
      break;
    case "construction":
      signColor = 0xff6600; signW = 0.6; signH = 0.6;
      break;
    case "route_number":
      signColor = 0x003399; signW = 0.5; signH = 0.4;
      break;
  }

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(signW, signH, 0.03),
    matLib.get(signColor, 0.4),
  );
  sign.position.set(x, y + 2.2, z);
  g.add(sign);

  return g;
}

export function buildRoadSigns(
  road: RoadDef,
  signs: RoadSign[],
  divisions = 80,
): THREE.Group {
  const g = new THREE.Group();
  g.name = `signs_${road.id}`;

  const pts = road.points.map(
    ([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z), z),
  );
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");

  for (const sign of signs) {
    const pt = curve.getPointAt(sign.t);
    const tangent = curve.getTangentAt(sign.t);
    const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const side = sign.side === "right" ? 1 : -1;
    const dist = road.width * 0.5 + 1.5;

    g.add(buildSignPost(
      pt.x + n.x * dist * side,
      pt.y,
      pt.z + n.z * dist * side,
      sign.type,
      sign.speedLimit,
      sign.routeNum,
    ));
  }
  return g;
}

// ═══════════════════════════════════════════════════════════
// BANCS DE NEIGE (hiver québécois) ❄️
// ═══════════════════════════════════════════════════════════

export function buildSnowbanks(
  road: RoadDef,
  divisions = 40,
): THREE.Group | null {
  // CORRECTION: Utilisation de "hiver" au lieu de "hiver"
  if (getCurrentSeason() !== "hiver") return null;

  const g = new THREE.Group();
  g.name = `bancs_neige_${road.id}`;
  const hw = road.width / 2 + 1.5;

  for (const side of [-1, 1]) {
    const pts = road.points.map(([x, z]) => {
      const y = getTerrainHeight(x, z);
      return new THREE.Vector3(x, y, z);
    });
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const samples = curve.getPoints(divisions);

    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < samples.length; i++) {
      const pt = samples[i];
      const next = i < samples.length - 1 ? samples[i + 1] : samples[i - 1];
      const prev = i > 0 ? samples[i - 1] : samples[i + 1];
      const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
      const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const bx = pt.x + n.x * hw * side;
      const bz = pt.z + n.z * hw * side;

      // Banc de neige: base large, sommet arrondi
      positions.push(
        bx - n.x * 1.2 * side, pt.y, bz - n.z * 1.2 * side,
        bx, pt.y + 0.8 + Math.sin(i * 0.5) * 0.3, bz,
      );

      if (i < samples.length - 1) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const bank = new THREE.Mesh(geo, matLib.get(0xe8e8f0, 0.95));
    bank.receiveShadow = true;
    g.add(bank);
  }
  return g;
}

// ═══════════════════════════════════════════════════════════
// GLACE NOIRE (patches invisibles — GAMEPLAY DANGER) 🧊
// ═══════════════════════════════════════════════════════════

export function buildIcePatches(
  road: RoadDef,
  patches: IcePatch[],
  divisions = 80,
): THREE.Group {
  const g = new THREE.Group();
  g.name = `glace_noire_${road.id}`;

  const pts = road.points.map(
    ([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z) + 0.06, z),
  );
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");

  for (const patch of patches) {
    const pt = curve.getPointAt(patch.t);
    const tangent = curve.getTangentAt(patch.t);
    const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const ice = new THREE.Mesh(
      new THREE.PlaneGeometry(patch.width, patch.length),
      new THREE.MeshStandardMaterial({
        color: 0x8899aa,
        transparent: true,
        opacity: 0.25,  // quasi invisible = DANGER
        roughness: 0.05,
        metalness: 0.8,
      }),
    );
    ice.rotation.x = -Math.PI / 2;
    ice.rotation.z = Math.atan2(tangent.x, tangent.z);
    ice.position.set(
      pt.x + n.x * patch.offset,
      pt.y,
      pt.z + n.z * patch.offset,
    );
    ice.userData = { type: "ice_patch", friction: patch.friction };
    g.add(ice);
  }
  return g;
}

// ═══════════════════════════════════════════════════════════
// BUILD ROAD RIBBON V2 (intégral)
// ═══════════════════════════════════════════════════════════

export function buildRoadRibbon(
  road: RoadDef,
  divisions = 80,
): THREE.Object3D {
  const potholes = generatePotholes(road);
  const icePatches = generateIcePatches(road);
  const constructionZones = generateConstructionZones(road);

  if (road.kind === "highway") {
    const g = new THREE.Group();
    g.name = road.id;
    const laneW = 7.6;
    const off = 5.1;
    g.add(ribbonMesh(road, divisions, laneW, 0x2e2e34, 0.05, off, potholes));
    g.add(ribbonMesh(road, divisions, laneW, 0x2e2e34, 0.05, -off, potholes));
    g.add(ribbonMesh(
      road, Math.max(24, Math.floor(divisions / 2)),
      2.6, 0x3d4a32, 0.02, 0,
    ));

    // Glissières de sécurité (autoroute QC)
    g.add(buildGuardrails(road, divisions));

    // Bancs de neige hiver
    const snow = buildSnowbanks(road, divisions);
    if (snow) g.add(snow);

    return g;
  }

  const color =
    road.kind === "gravel" ? 0x6a6458
    : road.kind === "ramp" ? 0x3c3c42
    : 0x35353a;

  if (road.kind === "village" || road.kind === "rural" || road.kind === "regional") {
    const g = new THREE.Group();
    g.name = road.id;
    const shColor = road.kind === "rural" ? 0x6a6054 : 0x4a4844;
    g.add(ribbonMesh(road, divisions, road.width + 2.4, shColor, 0.02, 0));
    g.add(ribbonMesh(road, divisions, road.width, color, 0.045, 0, potholes));

    // Glace noire en hiver
    if (icePatches.length > 0) {
      g.add(buildIcePatches(road, icePatches, divisions));
    }

    // Chantiers
    for (const zone of constructionZones) {
      g.add(buildConstructionCones(road, zone, divisions));
    }

    const snow = buildSnowbanks(road, divisions);
    if (snow) g.add(snow);

    return g;
  }

  const mesh = ribbonMesh(road, divisions, road.width, color, 0.04, 0, potholes);
  mesh.name = road.id;
  return mesh;
}

// ═══════════════════════════════════════════════════════════
// GLISSIÈRES DE SÉCURITÉ (autoroutes QC)
// ═══════════════════════════════════════════════════════════

function buildGuardrails(road: RoadDef, divisions: number): THREE.Group {
  const g = new THREE.Group();
  const pts = road.points.map(
    ([x, z]) => new THREE.Vector3(x, getTerrainHeight(x, z), z),
  );
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const samples = curve.getPoints(divisions);

  for (const side of [-1, 1]) {
    const railPts: THREE.Vector3[] = [];
    for (let i = 0; i < samples.length; i++) {
      const pt = samples[i];
      const next = i < samples.length - 1 ? samples[i + 1] : samples[i - 1];
      const prev = i > 0 ? samples[i - 1] : samples[i + 1];
      const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
      const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      railPts.push(new THREE.Vector3(
        pt.x + n.x * 11 * side,
        pt.y + 0.6,
        pt.z + n.z * 11 * side,
      ));
    }
    const railGeo = new THREE.BufferGeometry().setFromPoints(railPts);
    const rail = new THREE.Line(
      railGeo,
      new THREE.LineBasicMaterial({ color: 0xaaaaaa }),
    );
    g.add(rail);
  }
  return g;
}

// ═══════════════════════════════════════════════════════════
// FRICTION MAP (pour le gameplay de conduite)
// ═══════════════════════════════════════════════════════════

export function getRoadFrictionAt(
  road: RoadDef,
  t: number,
  lateralOffset: number,
): number {
  const season = getCurrentSeason();
  let base = 1.0;

  // CORRECTION: Utilisation de "hiver" et "printemps" au lieu de "hiver" et "printemps"
  if (season === "hiver") base = 0.4;
  else if (season === "printemps") base = 0.75;

  if (road.kind === "gravel") base *= 0.6;

  // Vérifier les patches de glace
  const icePatches = generateIcePatches(road);
  for (const patch of icePatches) {
    if (Math.abs(t - patch.t) < 0.01 &&
        Math.abs(lateralOffset - patch.offset) < patch.width / 2) {
      return patch.friction; // DANGER: 0.05–0.3
    }
  }

  // Vérifier les nids-de-poule
  const potholes = generatePotholes(road);
  for (const ph of potholes) {
    if (Math.abs(t - ph.t) < 0.005 &&
        Math.abs(lateralOffset - ph.offset) < ph.radius) {
      return base * 0.5; // Perte de contrôle
    }
  }

  return base;
}

// ═══════════════════════════════════════════════════════════
// EXISTING FUNCTIONS (conservées & améliorées)
// ═══════════════════════════════════════════════════════════

function dashedLine(
  road: RoadDef,
  divisions: number,
  offset: number,
  color: number,
  dash: number,
  gap: number,
): THREE.Line {
  const pts = road.points.map(([x, z]) => {
    return new THREE.Vector3(x, getTerrainHeight(x, z) + 0.07, z);
  });
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const samples = curve.getPoints(divisions);
  const shifted: THREE.Vector3[] = [];
  for (let i = 0; i < samples.length; i++) {
    const pt = samples[i];
    const next = i < samples.length - 1 ? samples[i + 1] : samples[i - 1];
    const prev = i > 0 ? samples[i - 1] : samples[i + 1];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    shifted.push(new THREE.Vector3(
      pt.x + n.x * offset, pt.y, pt.z + n.z * offset,
    ));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(shifted);
  const mat = new THREE.LineDashedMaterial({
    color,
    dashSize: dash,
    gapSize: gap,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

export function buildCenterLine(
  road: RoadDef,
  divisions = 50,
): THREE.Object3D | null {
  if (road.kind === "gravel" || road.kind === "ramp") return null;

  // CORRECTION: Utilisation de "hiver" au lieu de "hiver"
  // Hiver: marquage au sol quasi invisible
  const season = getCurrentSeason();
  const lineAlpha = season === "hiver" ? 0.3 : 1.0;
  const lineColor = season === "hiver" ? 0x888880 : 0xd8c020;

  if (road.kind === "highway") {
    const g = new THREE.Group();
    g.add(dashedLine(road, divisions, 5.1, 0xe8e0c8, 4.2, 4.8));
    g.add(dashedLine(road, divisions, -5.1, 0xe8e0c8, 4.2, 4.8));
    return g;
  }
  const g = new THREE.Group();
  g.add(dashedLine(road, divisions, 0, lineColor, 3.2, 3.8));
  if (road.kind === "regional" || road.kind === "village") {
    const edge = road.width * 0.5 - 0.22;
    g.add(dashedLine(road, divisions, edge, 0xe8e4d0, 8, 0.4));
    g.add(dashedLine(road, divisions, -edge, 0xe8e4d0, 8, 0.4));
  }
  return g;
}

export function buildIntersectionPad(
  x: number, z: number, size: number,
): THREE.Group {
  const g = new THREE.Group();
  g.name = "carrefour";
  const y = getTerrainHeight(x, z);
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(size, 0.1, size),
    matLib.get(0x35353a, 0.96),
  );
  pad.position.set(x, y + 0.055, z);
  pad.receiveShadow = true;
  g.add(pad);
  const stripe = matLib.get(0xe8e4d4, 0.4);
  const mark = size * 0.42;
  for (const rot of [0, Math.PI / 2]) {
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.04, mark), stripe,
      );
      bar.position.set(x, y + 0.12, z);
      bar.rotation.y = rot;
      if (rot === 0) bar.position.x += i * 0.55;
      else bar.position.z += i * 0.55;
      g.add(bar);
    }
  }
  return g;
}

export function buildRoadSidewalks(
  road: RoadDef,
  divisions = 24,
): THREE.Group {
  const g = new THREE.Group();
  const hw = road.width / 2;
  const sw = 2.2;
  g.add(ribbonMesh(road, divisions, sw, 0xc4c0b8, 0.08, -(hw + sw / 2)));
  g.add(ribbonMesh(road, divisions, sw, 0xc4c0b8, 0.08, hw + sw / 2));
  return g;
}

export function sampleRoad(
  road: RoadDef,
  t: number,
): { x: number; z: number; tx: number; tz: number; y: number } {
  const pts = road.points;
  const n = pts.length - 1;
  const clamped = Math.max(0, Math.min(0.999, t));
  const f = clamped * n;
  const i = Math.floor(f);
  const u = f - i;
  const a = pts[i];
  const b = pts[Math.min(i + 1, n)];
  const x = a[0] + (b[0] - a[0]) * u;
  const z = a[1] + (b[1] - a[1]) * u;
  const y = getTerrainHeight(x, z);
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) || 1;
  return { x, z, y, tx: dx / len, tz: dz / len };
}
