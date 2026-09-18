/**
 * 🏗️ WeaponShopBuilding.ts — TROXTWORLD (v5.0 PLATINUM INTÉGRÉ)
 * Constructeur du bâtiment d'armurerie avec aménagement intérieur complet.
 */

import * as THREE from "three";
import {
  WEAPON_SHOP_CATALOG,
  buildComptoirVitre,
  buildRatelierMural,
  buildVitrineSecurisee,
  buildCaisseEnregistreuse,
  buildCoffreFort,
  buildDetecteurMetal,
  buildCameraSecurite,
  buildEnseigneArmurerie,
  buildPresentoirCouteaux,
  buildPanneauPermis,
  buildBancEssai,
} from "./WeaponShopCatalog";
import { TextureGenerator } from "../utils/TextureGenerator";

// ============================================================================
// 🔹 TYPES
// ============================================================================

export interface WeaponShopBuildingOptions {
  shopId: string;
  width?: number;
  depth?: number;
  height?: number;
  position?: THREE.Vector3;
  rotationY?: number;
  wallColor?: number;
  floorColor?: number;
}

export interface WeaponShopBuildingResult {
  group: THREE.Group;
  interactionPoints: {
    comptoirVente: THREE.Vector3;
    caisseEnregistreuse: THREE.Vector3;
    coffreFort: THREE.Vector3;
    porteEntree: THREE.Vector3;
    panneauOuvertFerme: THREE.Vector3;
    presentoirCouteaux: THREE.Vector3;
    bancEssai: THREE.Vector3;
  };
  displayRacks: THREE.Object3D[];
  cameras: THREE.Object3D[];
  walls: THREE.Mesh[];
}

// ============================================================================
// 🎨 MATÉRIAUX
// ============================================================================

function wallMat(color: number): THREE.MeshStandardMaterial {
  const concreteTexture = TextureGenerator.generateConcreteTexture(256);
  return new THREE.MeshStandardMaterial({
    map: concreteTexture,
    roughness: 0.85,
    metalness: 0.05,
    color: new THREE.Color(color),
  });
}

// ============================================================================
// 🏗️ CONSTRUCTEUR PRINCIPAL
// ============================================================================

export function createWeaponShopBuilding(
  options: WeaponShopBuildingOptions,
): WeaponShopBuildingResult {
  const {
    shopId,
    width = 12,
    depth = 10,
    height = 4,
    position = new THREE.Vector3(0, 0, 0),
    rotationY = 0,
    wallColor = 0x3a3a3a,
    floorColor = 0x2a2a2a,
  } = options;

  const group = new THREE.Group();
  group.name = `weapon_shop_${shopId}`;
  group.userData.shopId = shopId;
  group.userData.type = "weapon_shop_building";

  const cameras: THREE.Object3D[] = [];
  const displayRacks: THREE.Object3D[] = [];
  const walls: THREE.Mesh[] = [];
  const wt = 0.2;

  // ---- DALLE ----
  const groundTexture = TextureGenerator.generateConcreteTexture(256);
  const dalle = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.2, depth),
    new THREE.MeshStandardMaterial({
      map: groundTexture, roughness: 0.9, metalness: 0.0,
      color: new THREE.Color(floorColor),
    })
  );
  dalle.position.y = 0.1; dalle.receiveShadow = true;
  group.add(dalle); walls.push(dalle);

  // ---- MURS ----
  const murArriere = new THREE.Mesh(new THREE.BoxGeometry(width, height, wt), wallMat(wallColor));
  murArriere.position.set(0, height / 2, -depth / 2 + wt / 2);
  murArriere.castShadow = true; group.add(murArriere); walls.push(murArriere);

  const murGauche = new THREE.Mesh(new THREE.BoxGeometry(wt, height, depth), wallMat(wallColor));
  murGauche.position.set(-width / 2 + wt / 2, height / 2, 0);
  murGauche.castShadow = true; group.add(murGauche); walls.push(murGauche);

  const murDroit = murGauche.clone();
  murDroit.position.set(width / 2 - wt / 2, height / 2, 0);
  group.add(murDroit); walls.push(murDroit);

  // ---- FAÇADE ----
  const largeurPorte = 2.0;
  const largeurVitrine = (width - largeurPorte - wt * 2) / 2;

  const murAvantGauche = new THREE.Mesh(
    new THREE.BoxGeometry(largeurVitrine, height, wt), wallMat(wallColor)
  );
  murAvantGauche.position.set(-largeurPorte / 2 - largeurVitrine / 2, height / 2, depth / 2 - wt / 2);
  murAvantGauche.castShadow = true; group.add(murAvantGauche); walls.push(murAvantGauche);

  const murAvantDroit = murAvantGauche.clone();
  murAvantDroit.position.x = largeurPorte / 2 + largeurVitrine / 2;
  group.add(murAvantDroit); walls.push(murAvantDroit);

  const linteau = new THREE.Mesh(
    new THREE.BoxGeometry(largeurPorte + wt * 2, 0.4, wt), wallMat(wallColor)
  );
  linteau.position.set(0, height - 0.2, depth / 2 - wt / 2);
  group.add(linteau); walls.push(linteau);

  // Porte
  const porte = new THREE.Mesh(
    new THREE.BoxGeometry(largeurPorte, height - 0.6, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 })
  );
  const portePos = new THREE.Vector3(0, (height - 0.6) / 2, depth / 2 - wt / 2);
  porte.position.copy(portePos);
  porte.userData.interactable = true;
  porte.userData.action = "toggle_door";
  porte.userData.isOpen = false;
  group.add(porte); walls.push(porte);

  // Vitrines façade
  const vitrineVerre = new THREE.Mesh(
    new THREE.BoxGeometry(largeurVitrine, height - 0.6, 0.04),
    new THREE.MeshPhysicalMaterial({
      color: 0x9fd6ff, transparent: true, opacity: 0.2,
      roughness: 0.05, transmission: 0.7,
    })
  );
  vitrineVerre.position.set(-largeurPorte / 2 - largeurVitrine / 2, height / 2 - 0.1, depth / 2 - wt / 2);
  group.add(vitrineVerre);

  const vitrineVerreDroite = vitrineVerre.clone();
  vitrineVerreDroite.position.x = largeurPorte / 2 + largeurVitrine / 2;
  group.add(vitrineVerreDroite);

  // ---- TOIT ----
  const toit = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.2, depth + 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
  );
  toit.position.set(0, height + 0.1, 0); group.add(toit); walls.push(toit);

  const roofEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a, emissive: 0x1a1a2a, emissiveIntensity: 0.3,
  });
  const roofEdgeFront = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.1, 0.2), roofEdgeMat);
  roofEdgeFront.position.set(0, height + 0.2, depth / 2 + 0.1); group.add(roofEdgeFront);

  const roofEdgeBack = roofEdgeFront.clone();
  roofEdgeBack.position.z = -depth / 2 - 0.1; group.add(roofEdgeBack);

  const roofEdgeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, depth + 0.4), roofEdgeMat);
  roofEdgeLeft.position.set(-width / 2 - 0.3, height + 0.2, 0); group.add(roofEdgeLeft);

  const roofEdgeRight = roofEdgeLeft.clone();
  roofEdgeRight.position.x = width / 2 + 0.3; group.add(roofEdgeRight);

  // ---- NÉONS EXTÉRIEURS ----
  const neonColor = 0x00aaff;
  const neonIntensity = 1.5;
  const neonMatExt = new THREE.MeshStandardMaterial({
    color: neonColor, emissive: neonColor, emissiveIntensity: neonIntensity,
  });

  const frontNeonLeft = new THREE.Mesh(new THREE.BoxGeometry(largeurVitrine, 0.1, 0.1), neonMatExt);
  frontNeonLeft.position.set(-largeurPorte / 2 - largeurVitrine / 2, height + 0.15, depth / 2 - wt / 2);
  group.add(frontNeonLeft);

  const frontNeonRight = frontNeonLeft.clone();
  frontNeonRight.position.x = largeurPorte / 2 + largeurVitrine / 2;
  group.add(frontNeonRight);

  const backNeon = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.1), neonMatExt);
  backNeon.position.set(0, height + 0.15, -depth / 2 + wt / 2);
  group.add(backNeon);

  // Lumières néons extérieurs
  const flLeft = new THREE.PointLight(neonColor, 2.0, 10);
  flLeft.position.copy(frontNeonLeft.position); group.add(flLeft);
  const flRight = flLeft.clone(); flRight.position.copy(frontNeonRight.position); group.add(flRight);
  const bl = new THREE.PointLight(neonColor, 2.0, 10);
  bl.position.copy(backNeon.position); group.add(bl);

  // ---- ENSEIGNE ----
  const enseigne = buildEnseigneArmurerie();
  enseigne.position.set(0, height + 0.8, depth / 2 + 0.1);
  group.add(enseigne);

  // ---- PANNEAU OUVERT/FERMÉ ----
  const panneauEtat = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.25),
    new THREE.MeshStandardMaterial({
      color: 0x1fbf3a, emissive: 0x0f7a20, emissiveIntensity: 1,
    })
  );
  panneauEtat.position.set(width / 2 - 0.5, height - 0.9, depth / 2 - wt / 2 - 0.02);
  panneauEtat.name = "panneau_ouvert_ferme";
  panneauEtat.userData.shopId = shopId;
  group.add(panneauEtat);

  // ---- DÉTECTEUR MÉTAL ----
  const detecteur = buildDetecteurMetal();
  detecteur.position.set(0, 0.2, depth / 2 - 1.0);
  group.add(detecteur);

  // ---- LUMIÈRES INTÉRIEURES ----
  const interiorLight1 = new THREE.PointLight(0xffaa88, 2.0, 15);
  interiorLight1.position.set(0, height - 0.5, -depth / 2 + 2);
  interiorLight1.castShadow = true; group.add(interiorLight1);

  const counterLight1 = new THREE.SpotLight(0xffcc99, 1.5, 10, Math.PI / 4, 0.5);
  counterLight1.position.set(-2, height - 0.3, -depth / 2 + 1.5);
  counterLight1.target.position.set(-2, 0, -depth / 2 + 1.5);
  counterLight1.castShadow = true;
  group.add(counterLight1); group.add(counterLight1.target);

  const counterLight2 = counterLight1.clone();
  counterLight2.position.x = 2; counterLight2.target.position.x = 2;
  group.add(counterLight2); group.add(counterLight2.target);

  const showcaseLight1 = new THREE.SpotLight(0xffffff, 1.0, 10, Math.PI / 4, 0.5);
  showcaseLight1.position.set(width / 2 - 1.5, height - 0.2, -depth / 2 + 2.5);
  showcaseLight1.target.position.set(width / 2 - 1.5, 0, -depth / 2 + 2.5);
  group.add(showcaseLight1); group.add(showcaseLight1.target);

  const showcaseLight2 = showcaseLight1.clone();
  showcaseLight2.position.z = -depth / 2 + 5.5;
  showcaseLight2.target.position.z = -depth / 2 + 5.5;
  group.add(showcaseLight2); group.add(showcaseLight2.target);

  // Néons plafond
  const ceilingNeonMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0,
  });
  const cn1 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.05, 0.05), ceilingNeonMat);
  cn1.position.set(0, height - 0.1, -depth / 2 + 1.0); group.add(cn1);
  const cn2 = cn1.clone(); cn2.position.z = -depth / 2 + 3.0; group.add(cn2);

  const cl1 = new THREE.PointLight(0xffffff, 1.5, 10);
  cl1.position.copy(cn1.position); group.add(cl1);
  const cl2 = cl1.clone(); cl2.position.copy(cn2.position); group.add(cl2);

  // ---- AMÉNAGEMENT INTÉRIEUR ----
  // Comptoir
  const comptoir = buildComptoirVitre(4.0);
  comptoir.position.set(0, 0.2, -depth / 2 + 1.5);
  group.add(comptoir); walls.push(comptoir.children[0] as THREE.Mesh);

  // Caisse
  const caisse = buildCaisseEnregistreuse();
  caisse.position.set(1.5, 1.0, -depth / 2 + 1.5);
  group.add(caisse);

  // Backstore
  const backstoreWidth = width / 2 - 1;
  const backstoreDepth = depth / 2 - 1;
  const backstoreWall = new THREE.Mesh(
    new THREE.BoxGeometry(backstoreWidth, height - 1, wt), wallMat(wallColor)
  );
  backstoreWall.position.set(0, (height - 1) / 2, -depth / 2 + backstoreDepth / 2);
  group.add(backstoreWall); walls.push(backstoreWall);

  const backstoreDoor = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, height - 1.2, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 })
  );
  backstoreDoor.position.set(0, (height - 1.2) / 2, -depth / 2 + backstoreDepth / 2 + 0.01);
  group.add(backstoreDoor); walls.push(backstoreDoor);

  // Coffre-fort
  const coffre = buildCoffreFort();
  coffre.position.set(-1.5, 0.2, -depth / 2 + 0.8);
  group.add(coffre); walls.push(coffre.children[0] as THREE.Mesh);

  // Râteliers muraux
  const shelf = buildRatelierMural(2.4, 4);
  shelf.position.set(-width / 2 + wt + 0.05, 1.4, -depth / 2 + 0.5);
  group.add(shelf); displayRacks.push(shelf);

  const shelf2 = shelf.clone(); shelf2.position.z = -depth / 2 + 2.0;
  group.add(shelf2); displayRacks.push(shelf2);

  const shelf3 = shelf.clone(); shelf3.position.z = -depth / 2 + 3.5;
  group.add(shelf3); displayRacks.push(shelf3);

  // Vitrines sécurisées
  const vitrine = buildVitrineSecurisee();
  vitrine.position.set(width / 2 - wt - 0.5, 0.2, -depth / 2 + 2.0);
  vitrine.rotation.y = -Math.PI / 2;
  group.add(vitrine); displayRacks.push(vitrine);
  walls.push(vitrine.children[0] as THREE.Mesh);

  const vitrine2 = vitrine.clone(); vitrine2.position.z = -depth / 2 + 4.0;
  group.add(vitrine2); displayRacks.push(vitrine2);
  walls.push(vitrine2.children[0] as THREE.Mesh);

  // ★ NOUVEAU v5.0 : Présentoir couteaux
  const presentoir = buildPresentoirCouteaux();
  presentoir.position.set(width / 2 - wt - 1.5, 0.2, -depth / 2 + 1.0);
  group.add(presentoir); displayRacks.push(presentoir);

  // ★ NOUVEAU v5.0 : Panneau permis
  const panneauPermis = buildPanneauPermis();
  panneauPermis.position.set(-width / 2 + wt + 0.02, 1.2, depth / 2 - 1.5);
  panneauPermis.rotation.y = Math.PI / 2;
  group.add(panneauPermis);

  // ★ NOUVEAU v5.0 : Banc d'essai
  const bancEssai = buildBancEssai();
  bancEssai.position.set(-width / 2 + wt + 1.5, 0.2, depth / 2 - 1.5);
  group.add(bancEssai);

  // Caméras
  const camPositions: [number, number, number, number][] = [
    [-width / 2 + 0.3, height - 0.2, -depth / 2 + 0.3, Math.PI / 4],
    [width / 2 - 0.3, height - 0.2, -depth / 2 + 0.3, -Math.PI / 4],
    [-width / 2 + 0.3, height - 0.2, depth / 2 - 0.3, (3 * Math.PI) / 4],
  ];
  for (const [x, y, z, rot] of camPositions) {
    const cam = buildCameraSecurite();
    cam.position.set(x, y, z); cam.rotation.y = rot;
    group.add(cam); cameras.push(cam);
  }

  // Position finale
  group.position.copy(position);
  group.rotation.y = rotationY;

  const interactionPoints = {
    comptoirVente: new THREE.Vector3(0, 0.9, -depth / 2 + 1.5).add(position),
    caisseEnregistreuse: new THREE.Vector3(1.5, 1.0, -depth / 2 + 1.5).add(position),
    coffreFort: new THREE.Vector3(-1.5, 0.6, -depth / 2 + 0.8).add(position),
    porteEntree: portePos.clone().add(position),
    panneauOuvertFerme: new THREE.Vector3(width / 2 - 0.5, height - 0.9, depth / 2 - wt / 2).add(position),
    presentoirCouteaux: new THREE.Vector3(width / 2 - wt - 1.5, 0.5, -depth / 2 + 1.0).add(position),
    bancEssai: new THREE.Vector3(-width / 2 + wt + 1.5, 0.9, depth / 2 - 1.5).add(position),
  };

  return { group, interactionPoints, displayRacks, cameras, walls };
}

// ============================================================================
// 🔄 MISE À JOUR VISUELLE
// ============================================================================

export function updateWeaponShopVisualState(buildingGroup: THREE.Group, isOpen: boolean): void {
  const panneau = buildingGroup.getObjectByName("panneau_ouvert_ferme") as THREE.Mesh | undefined;
  if (panneau && panneau.material instanceof THREE.MeshStandardMaterial) {
    if (isOpen) {
      panneau.material.color.set(0x1fbf3a);
      panneau.material.emissive.set(0x0f7a20);
    } else {
      panneau.material.color.set(0xbf1f1f);
      panneau.material.emissive.set(0x7a0f0f);
    }
  }

  const porte = buildingGroup.children.find(
    (child) => child.userData.action === "toggle_door"
  ) as THREE.Mesh;
  if (porte) {
    porte.userData.isOpen = isOpen;
    porte.rotation.y = isOpen ? -Math.PI / 2 : 0;
  }
}