/**
 * ═══════════════════════════════════════════════════════════════════
 * 🚿 TROXTWORLD — SALLE DE BAIN 3D ULTRA-DÉTAILLÉE (Three.js Impératif)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Convertie depuis React Three Fiber vers Three.js pur pour le moteur PortneufEngine.
 * Toilette, Lavabo avec meuble, Douche vitrée, Miroir LED, Accessoires complets.
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { matLib } from "./materials";

// ═══════════════════════════════════════════════════════════
// MATÉRIAUX RÉUTILISABLES
// ═══════════════════════════════════════════════════════════

const porcelain = () => matLib.get(0xf5f5f5, 0.2, 0.05);
const chrome = () => matLib.get(0xc0c0c0, 0.1, 0.9);
const darkCabinet = () => matLib.get(0x2a2a3e, 0.6, 0.05);

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt: number, rb: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 12): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ═══════════════════════════════════════════════════════════
// TOILETTE DÉTAILLÉE
// ═══════════════════════════════════════════════════════════

function buildToilet(): THREE.Group {
  const g = new THREE.Group();
  g.name = "toilette";
  const p = porcelain();
  const c = chrome();

  // Base / pied
  g.add(box(0.32, 0.16, 0.42, 0, 0.08, 0.05, p));
  // Cuvette
  g.add(box(0.38, 0.12, 0.48, 0, 0.2, 0.05, p));
  // Intérieur (eau)
  g.add(box(0.28, 0.02, 0.35, 0, 0.24, 0.05, matLib.get(0xc8d8e8, 0.1, 0.1)));
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.005, 0.3), new THREE.MeshStandardMaterial({ color: 0xa8c8e8, transparent: true, opacity: 0.4, roughness: 0.05 }));
  water.position.set(0, 0.23, 0.05);
  g.add(water);
  // Lunette
  g.add(box(0.36, 0.025, 0.44, 0, 0.28, 0.05, matLib.get(0xf0f0f0, 0.3, 0.05)));
  // Couvercle (ouvert)
  const lid = box(0.34, 0.02, 0.38, 0, 0.31, -0.12, p);
  lid.rotation.x = -0.25;
  g.add(lid);
  // Réservoir
  g.add(box(0.34, 0.32, 0.14, 0, 0.42, -0.2, p));
  // Couvercle réservoir
  g.add(box(0.36, 0.02, 0.16, 0, 0.59, -0.2, matLib.get(0xeeeeee, 0.25, 0.08)));
  // Boutons de chasse (double)
  g.add(cyl(0.02, 0.02, 0.015, -0.03, 0.61, -0.2, c, 8));
  g.add(cyl(0.015, 0.015, 0.015, 0.03, 0.61, -0.2, c, 8));
  // Charnières
  for (const x of [-0.15, 0.15]) {
    const hinge = cyl(0.008, 0.008, 0.04, x, 0.29, -0.18, c, 6);
    hinge.rotation.z = Math.PI / 2;
    g.add(hinge);
  }
  // Tuyau d'alimentation
  g.add(cyl(0.012, 0.012, 0.35, -0.2, 0.2, -0.28, c, 6));
  // Robinet d'arrêt
  g.add(box(0.04, 0.02, 0.03, -0.2, 0.35, -0.28, matLib.get(0xaaaaaa, 0.2, 0.8)));
  // Boulons sol
  for (const x of [-0.12, 0.12]) {
    g.add(cyl(0.01, 0.01, 0.02, x, 0.01, 0.2, c, 6));
  }
  return g;
}

// ═══════════════════════════════════════════════════════════
// LAVABO AVEC MEUBLE
// ═══════════════════════════════════════════════════════════

function buildSink(): THREE.Group {
  const g = new THREE.Group();
  g.name = "lavabo";
  const p = porcelain();
  const c = chrome();
  const cab = darkCabinet();
  const marble = matLib.get(0xe0dcd6, 0.15, 0.1);

  // Meuble sous-lavabo
  g.add(box(0.55, 0.7, 0.38, 0, 0.35, 0, cab));
  // Porte du meuble
  g.add(box(0.5, 0.62, 0.015, 0, 0.35, 0.195, matLib.get(0x333348, 0.55, 0.08)));
  // Poignée
  g.add(box(0.06, 0.015, 0.02, 0.15, 0.35, 0.21, c));
  // Pieds
  for (const [x, z] of [[-0.24, -0.16], [-0.24, 0.16], [0.24, -0.16], [0.24, 0.16]]) {
    g.add(box(0.03, 0.04, 0.03, x, 0.02, z, matLib.get(0x222222, 0.5, 0.3)));
  }
  // Comptoir marbre
  g.add(box(0.58, 0.025, 0.42, 0, 0.72, 0, marble));
  // Vasque (rebord)
  g.add(box(0.42, 0.04, 0.32, 0, 0.74, 0.02, p));
  // Creux vasque
  g.add(box(0.36, 0.03, 0.26, 0, 0.73, 0.02, matLib.get(0xdde4ea, 0.1, 0.05)));
  // Drain
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), matLib.get(0x888888, 0.2, 0.8));
  drain.rotation.x = -Math.PI / 2;
  drain.position.set(0, 0.715, 0.02);
  g.add(drain);
  // Base robinet
  g.add(cyl(0.025, 0.03, 0.04, 0, 0.78, -0.12, c, 8));
  // Col robinet
  g.add(box(0.02, 0.06, 0.02, 0, 0.82, -0.1, c));
  // Bec verseur
  const spout = cyl(0.012, 0.012, 0.12, 0, 0.85, -0.04, c, 8);
  spout.rotation.x = 0.6;
  g.add(spout);
  // Poignées chaud/froid
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? -0.08 : 0.08;
    const color = i === 0 ? 0x4488cc : 0xcc4444;
    g.add(cyl(0.015, 0.015, 0.025, x, 0.78, -0.12, matLib.get(color, 0.2, 0.7), 8));
  }
  // Tuyauterie
  g.add(cyl(0.012, 0.012, 0.55, 0, 0.4, -0.15, matLib.get(0x888888, 0.3, 0.7), 6));
  return g;
}

// ═══════════════════════════════════════════════════════════
// DOUCHE VITRÉE
// ═══════════════════════════════════════════════════════════

function buildShower(): THREE.Group {
  const g = new THREE.Group();
  g.name = "douche";
  const c = chrome();

  // Bac de douche
  g.add(box(1.05, 0.06, 1.05, 0, 0.03, 0, matLib.get(0xe8e8e8, 0.2, 0.05)));

  // Drain central
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), matLib.get(0x999999, 0.2, 0.8));
  drain.rotation.x = -Math.PI / 2;
  drain.position.set(0, 0.065, 0);
  g.add(drain);

  // Parois en verre
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8dce8,
    transmission: 0.8,
    thickness: 0.02,
    roughness: 0.02,
    transparent: true,
    opacity: 0.2,
    metalness: 0.1,
    ior: 1.5,
  });

  // Paroi droite
  const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2, 1.02), glassMat);
  wallR.position.set(0.5, 1.05, 0);
  g.add(wallR);

  // Paroi fond
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(1.02, 2, 0.02), glassMat);
  wallBack.position.set(0, 1.05, -0.5);
  g.add(wallBack);

  // Porte vitrée coulissante
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.52, 2, 0.015), glassMat.clone());
  door.position.set(-0.25, 1.05, 0.5);
  g.add(door);

  // Rail supérieur
  g.add(box(1.06, 0.03, 1.06, 0, 2.06, 0, c));

  // Montants verticaux
  for (const [x, z] of [[0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]] as [number, number][]) {
    g.add(box(0.02, 2.02, 0.02, x, 1.05, z, c));
  }

  // Poignée porte
  g.add(box(0.12, 0.02, 0.03, -0.02, 1.1, 0.52, c));

  // Barre de support pommeau
  g.add(box(0.03, 1.2, 0.03, 0.45, 1.5, -0.45, c));

  // Pommeau de douche
  const showerHead = cyl(0.05, 0.06, 0.03, 0.3, 1.9, -0.3, c, 12);
  showerHead.rotation.set(0.5, 0, 0.2);
  g.add(showerHead);

  // Flexible
  const hose = cyl(0.008, 0.008, 0.4, 0.4, 1.75, -0.4, matLib.get(0xb0b0b0, 0.3, 0.7), 6);
  hose.rotation.set(0.3, 0, 0.1);
  g.add(hose);

  // Mitigeur
  g.add(box(0.06, 0.12, 0.03, 0.45, 1.1, -0.45, c));
  const lever = box(0.04, 0.015, 0.06, 0.45, 1.13, -0.42, matLib.get(0xb0b0b0, 0.15, 0.85));
  lever.rotation.x = -0.3;
  g.add(lever);

  // Étagère + bouteilles
  g.add(box(0.3, 0.02, 0.08, 0.2, 1.3, -0.47, matLib.get(0xd0d0d0, 0.3, 0.1)));
  g.add(cyl(0.02, 0.02, 0.14, 0.15, 1.38, -0.47, matLib.get(0x2266aa, 0.4), 6));
  g.add(cyl(0.018, 0.022, 0.12, 0.25, 1.36, -0.47, matLib.get(0x22aa44, 0.4), 6));
  g.add(box(0.04, 0.02, 0.06, 0.08, 1.32, -0.47, matLib.get(0xf0e8d8, 0.6)));

  return g;
}

// ═══════════════════════════════════════════════════════════
// MIROIR AVEC LED
// ═══════════════════════════════════════════════════════════

function buildMirror(): THREE.Group {
  const g = new THREE.Group();
  g.name = "miroir_sdb";

  // Cadre
  g.add(box(0.68, 0.88, 0.025, 0, 0, 0, darkCabinet()));

  // Surface miroir
  g.add(box(0.62, 0.82, 0.005, 0, 0, 0.015, matLib.get(0xb8c8d8, 0, 1)));

  // LED haut
  g.add(box(0.55, 0.025, 0.015, 0, 0.44, 0.02, matLib.getEmissive(0xffffff, 0xffffff, 0.6)));
  // LED bas
  g.add(box(0.55, 0.015, 0.01, 0, -0.44, 0.02, matLib.getEmissive(0xffffff, 0xffffff, 0.3)));

  // Lumière de miroir
  const light = new THREE.PointLight(0xfff8f0, 0.4, 1.5, 2);
  light.position.set(0, 0.3, 0.1);
  g.add(light);

  return g;
}

// ═══════════════════════════════════════════════════════════
// ACCESSOIRES
// ═══════════════════════════════════════════════════════════

function buildTowelRack(): THREE.Group {
  const g = new THREE.Group();
  g.name = "porte_serviettes";
  const c = chrome();
  // Supports
  for (const z of [-0.18, 0.18]) g.add(box(0.03, 0.03, 0.06, 0, 0, z, c));
  // Barre principale
  g.add(box(0.015, 0.015, 0.42, 0, 0, 0, c));
  // Barre secondaire
  g.add(box(0.012, 0.012, 0.42, 0, -0.15, 0, c));
  // Serviette
  g.add(box(0.015, 0.28, 0.38, 0.005, -0.12, 0, matLib.get(0xf5f5f5, 0.95)));
  return g;
}

function buildToiletPaperHolder(): THREE.Group {
  const g = new THREE.Group();
  g.name = "papier_toilette";
  const c = chrome();
  g.add(box(0.04, 0.06, 0.04, 0, 0, 0, c));
  const rod = cyl(0.008, 0.008, 0.12, 0, 0, 0.06, c, 6);
  rod.rotation.x = Math.PI / 2;
  g.add(rod);
  const roll = cyl(0.04, 0.04, 0.1, 0, 0, 0.06, matLib.get(0xf8f5f0, 0.9), 12);
  roll.rotation.x = Math.PI / 2;
  g.add(roll);
  // Feuille pendante
  g.add(box(0.002, 0.06, 0.08, 0, -0.05, 0.06, matLib.get(0xf8f5f0, 0.9)));
  return g;
}

function buildTrashBin(): THREE.Group {
  const g = new THREE.Group();
  g.name = "poubelle_sdb";
  const c = matLib.get(0xc0c0c0, 0.3, 0.6);
  g.add(cyl(0.08, 0.1, 0.24, 0, 0.12, 0, c, 8));
  g.add(cyl(0.085, 0.085, 0.015, 0, 0.25, 0, matLib.get(0xb0b0b0, 0.25, 0.7), 8));
  g.add(box(0.04, 0.01, 0.04, 0, 0.02, 0.08, matLib.get(0x999999, 0.3, 0.6)));
  return g;
}

function buildSoapDispenser(): THREE.Group {
  const g = new THREE.Group();
  g.name = "distributeur_savon";
  g.add(box(0.04, 0.1, 0.04, 0, 0.05, 0, matLib.get(0xe0d8c8, 0.4)));
  g.add(cyl(0.012, 0.015, 0.02, 0, 0.11, 0, chrome(), 6));
  const spout = cyl(0.005, 0.005, 0.03, 0, 0.12, 0.02, chrome(), 4);
  spout.rotation.x = 0.5;
  g.add(spout);
  return g;
}

function buildToothbrushHolder(): THREE.Group {
  const g = new THREE.Group();
  g.name = "brosse_dents";
  g.add(cyl(0.025, 0.03, 0.08, 0, 0.04, 0, matLib.get(0xd8dce8, 0.3, 0.1), 8));
  // Brosses
  for (let i = 0; i < 2; i++) {
    const brush = cyl(0.004, 0.004, 0.12, (i - 0.5) * 0.016, 0.12, 0, matLib.get(i === 0 ? 0x3388cc : 0xcc3388, 0.5), 4);
    brush.rotation.z = (i - 0.5) * 0.15;
    g.add(brush);
  }
  // Dentifrice
  const paste = cyl(0.012, 0.008, 0.08, 0.04, 0.03, 0, matLib.get(0xffffff, 0.4), 6);
  paste.rotation.z = 0.3;
  g.add(paste);
  return g;
}

function buildRobeHook(): THREE.Group {
  const g = new THREE.Group();
  g.name = "porte_peignoir";
  const c = chrome();
  g.add(box(0.04, 0.04, 0.015, 0, 0, 0, c));
  g.add(box(0.015, 0.04, 0.03, 0, -0.02, 0.02, c));
  g.add(box(0.25, 0.35, 0.04, 0, -0.2, 0.03, matLib.get(0xf5f5f5, 0.95)));
  g.add(box(0.12, 0.04, 0.05, 0, -0.03, 0.04, matLib.get(0xe8e8e8, 0.9)));
  return g;
}

function buildExhaustFan(): THREE.Group {
  const g = new THREE.Group();
  g.name = "ventilateur_extraction";
  g.add(box(0.25, 0.04, 0.25, 0, 0, 0, matLib.get(0xe0e0e0, 0.5, 0.1)));
  g.add(box(0.22, 0.005, 0.22, 0, -0.025, 0, matLib.get(0xd0d0d0, 0.4, 0.15)));
  // Fentes grille
  for (let i = 0; i < 5; i++) {
    g.add(box(0.18, 0.003, 0.015, 0, -0.025, -0.08 + i * 0.04, matLib.get(0xbbbbbb, 0.4, 0.2)));
  }
  // LED indicateur
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 6), matLib.getEmissive(0x22c55e, 0x22c55e, 0.5));
  led.position.set(0.1, -0.025, 0.1);
  g.add(led);
  return g;
}

function buildBathroomLight(): THREE.Group {
  const g = new THREE.Group();
  g.name = "plafonnier_sdb";
  g.add(box(0.35, 0.03, 0.35, 0, 0, 0, matLib.get(0xe8e8e8, 0.4, 0.1)));
  g.add(box(0.3, 0.01, 0.3, 0, -0.015, 0, matLib.getEmissive(0xffffff, 0xffffff, 0.5)));
  const light = new THREE.PointLight(0xfff8f0, 0.8, 4, 2);
  light.position.set(0, -0.1, 0);
  g.add(light);
  return g;
}

// ═══════════════════════════════════════════════════════════
// ASSEMBLAGE FINAL DE LA SALLE DE BAIN
// ═══════════════════════════════════════════════════════════

export function buildBathroom(): THREE.Group {
  const g = new THREE.Group();
  g.name = "salle_de_bain";

  // Sol carrelé
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 2.5),
    matLib.get(0xe8e8e8, 0.25, 0.05),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  floor.receiveShadow = true;
  g.add(floor);

  // Toilette
  const toilet = buildToilet();
  toilet.position.set(0.8, 0, -0.5);
  g.add(toilet);

  // Lavabo
  const sink = buildSink();
  sink.position.set(-0.5, 0, 0.3);
  g.add(sink);

  // Douche
  const shower = buildShower();
  shower.position.set(-0.8, 0, -0.8);
  g.add(shower);

  // Miroir
  const mirror = buildMirror();
  mirror.position.set(-0.5, 1.4, 0.48);
  g.add(mirror);

  // Porte-serviettes
  const towels = buildTowelRack();
  towels.position.set(0.9, 1.1, 0.4);
  g.add(towels);

  // Papier toilette
  const tp = buildToiletPaperHolder();
  tp.position.set(1.05, 0.5, -0.3);
  g.add(tp);

  // Tapis de bain
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), matLib.get(0xe8e0d8, 0.98));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(-0.4, 0.01, -0.5);
  mat.receiveShadow = true;
  g.add(mat);

  // Brosse WC (support cylindrique)
  const brush = new THREE.Group();
  brush.name = "brosse_wc";
  brush.add(cyl(0.04, 0.045, 0.3, 0, 0.15, 0, matLib.get(0xc0c0c0, 0.3, 0.7), 8));
  brush.add(cyl(0.008, 0.008, 0.12, 0, 0.35, 0, chrome(), 6));
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), matLib.get(0xb0b0b0, 0.2, 0.8));
  handle.position.set(0, 0.42, 0);
  brush.add(handle);
  brush.position.set(1.05, 0, -0.7);
  g.add(brush);

  // Poubelle
  const trash = buildTrashBin();
  trash.position.set(0.3, 0, 0.35);
  g.add(trash);

  // Distributeur savon
  const soap = buildSoapDispenser();
  soap.position.set(-0.28, 0.92, 0.25);
  g.add(soap);

  // Brosse à dents
  const toothbrush = buildToothbrushHolder();
  toothbrush.position.set(-0.7, 0.92, 0.3);
  g.add(toothbrush);

  // Porte-peignoir
  const robe = buildRobeHook();
  robe.position.set(1.15, 1.5, 0);
  g.add(robe);

  // Ventilateur d'extraction
  const fan = buildExhaustFan();
  fan.position.set(0, 2.35, 0);
  g.add(fan);

  // Plafonnier
  const ceiling = buildBathroomLight();
  ceiling.position.set(0, 2.35, 0);
  g.add(ceiling);

  return g;
}