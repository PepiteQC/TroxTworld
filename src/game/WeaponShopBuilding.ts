/**
 * WeaponShopBuilding.ts
 * Génère le bâtiment complet de l'armurerie/coutellerie (murs, vitrine, intérieur,
 * mobilier, sécurité) sous forme de THREE.Group prêt à insérer dans la scène.
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
} from "./WeaponShopCatalog";

export interface WeaponShopBuildingOptions {
  shopId: string;
  width?: number; // en mètres
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
  };
  displayRacks: THREE.Object3D[]; // supports sur lesquels les items du catalogue sont accrochés
  cameras: THREE.Object3D[];
}

function wallMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
}

/**
 * Construit le bâtiment de l'armurerie/coutellerie.
 * Structure : dalle + 4 murs (avec ouverture vitrine + porte) + toit plat +
 * agencement intérieur (comptoir, râteliers muraux garnis, vitrines sécurisées,
 * caisse, coffre-fort, détecteur de métal à l'entrée, caméras, enseigne néon).
 */
export function createWeaponShopBuilding(
  options: WeaponShopBuildingOptions,
): WeaponShopBuildingResult {
  const {
    shopId,
    width = 8,
    depth = 6,
    height = 3.2,
    position = new THREE.Vector3(0, 0, 0),
    rotationY = 0,
    wallColor = 0x5a5a52,
    floorColor = 0x2e2e2e,
  } = options;

  const group = new THREE.Group();
  group.name = `weapon_shop_${shopId}`;
  group.userData.shopId = shopId;
  group.userData.type = "weapon_shop_building";

  const cameras: THREE.Object3D[] = [];
  const displayRacks: THREE.Object3D[] = [];

  /* ---- Dalle ---- */
  const dalle = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), wallMat(floorColor));
  dalle.position.y = 0.1;
  group.add(dalle);

  const wt = 0.2; // épaisseur des murs

  /* ---- Mur arrière ---- */
  const murArriere = new THREE.Mesh(new THREE.BoxGeometry(width, height, wt), wallMat(wallColor));
  murArriere.position.set(0, height / 2 + 0.2, -depth / 2 + wt / 2);
  group.add(murArriere);

  /* ---- Murs latéraux ---- */
  const murGauche = new THREE.Mesh(new THREE.BoxGeometry(wt, height, depth), wallMat(wallColor));
  murGauche.position.set(-width / 2 + wt / 2, height / 2 + 0.2, 0);
  const murDroit = murGauche.clone();
  murDroit.position.set(width / 2 - wt / 2, height / 2 + 0.2, 0);
  group.add(murGauche, murDroit);

  /* ---- Mur avant avec vitrine blindée + porte ---- */
  const largeurPorte = 1.2;
  const largeurVitrine = width - largeurPorte - 1.0;
  const murAvantGauche = new THREE.Mesh(
    new THREE.BoxGeometry(largeurVitrine, height, wt),
    wallMat(wallColor),
  );
  murAvantGauche.position.set(
    -(largeurPorte / 2 + largeurVitrine / 2),
    height / 2 + 0.2,
    depth / 2 - wt / 2,
  );
  group.add(murAvantGauche);

  const linteau = new THREE.Mesh(
    new THREE.BoxGeometry(largeurPorte + 0.4, 0.4, wt),
    wallMat(wallColor),
  );
  linteau.position.set(width / 2 - 0.5, height - 0.2, depth / 2 - wt / 2);
  group.add(linteau);

  // Vitrine blindée (verre + grille de sécurité)
  const vitrineVerre = new THREE.Mesh(
    new THREE.BoxGeometry(largeurVitrine, height - 0.6, 0.04),
    new THREE.MeshPhysicalMaterial({
      color: 0x9fd6ff,
      transparent: true,
      opacity: 0.2,
      roughness: 0.05,
      transmission: 0.7,
    }),
  );
  vitrineVerre.position.set(
    -(largeurPorte / 2 + largeurVitrine / 2),
    height / 2 - 0.1,
    depth / 2 - wt / 2,
  );
  group.add(vitrineVerre);

  const grilleMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.5,
    metalness: 0.7,
  });
  for (let i = 0; i <= 4; i++) {
    const barreauVert = new THREE.Mesh(new THREE.BoxGeometry(0.03, height - 0.6, 0.03), grilleMat);
    barreauVert.position.set(
      -(largeurPorte / 2 + largeurVitrine) + (i * largeurVitrine) / 4,
      height / 2 - 0.1,
      depth / 2 - wt / 2 + 0.05,
    );
    group.add(barreauVert);
  }

  // Porte d'entrée (blindée)
  const porte = new THREE.Mesh(
    new THREE.BoxGeometry(largeurPorte, height - 0.6, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 }),
  );
  const portePos = new THREE.Vector3(
    width / 2 - largeurPorte / 2 - 0.4,
    (height - 0.6) / 2 + 0.2,
    depth / 2 - wt / 2,
  );
  porte.position.copy(portePos);
  porte.userData.interactable = true;
  porte.userData.action = "toggle_door";
  group.add(porte);

  /* ---- Toit plat ---- */
  const toit = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.2, 0.15, depth + 0.2),
    wallMat(0x2b2b2b),
  );
  toit.position.set(0, height + 0.28, 0);
  group.add(toit);

  /* ---- Enseigne néon ---- */
  const enseigne = buildEnseigneArmurerie();
  enseigne.position.set(0, height + 0.7, depth / 2 + 0.05);
  group.add(enseigne);

  /* ---- Panneau OUVERT / FERMÉ (mis à jour dynamiquement par ShopManager) ---- */
  const panneauEtat = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x1fbf3a, emissive: 0x0f7a20, emissiveIntensity: 1 }),
  );
  panneauEtat.position.set(width / 2 - 0.5, height - 0.9, depth / 2 - wt / 2 - 0.02);
  panneauEtat.name = "panneau_ouvert_ferme";
  panneauEtat.userData.shopId = shopId;
  group.add(panneauEtat);

  /* ---- Détecteur de métal à l'entrée ---- */
  const detecteur = buildDetecteurMetal();
  detecteur.position.set(width / 2 - largeurPorte / 2 - 0.4, 0.2, depth / 2 - 1.0);
  group.add(detecteur);

  /* ---- Comptoir de vente principal ---- */
  const comptoir = buildComptoirVitre(2.2);
  comptoir.position.set(0, 0.2, -depth / 2 + 1.4);
  group.add(comptoir);

  /* ---- Caisse enregistreuse sur le comptoir ---- */
  const caisse = buildCaisseEnregistreuse();
  caisse.position.set(0.7, 1.1, -depth / 2 + 1.4);
  group.add(caisse);

  /* ---- Coffre-fort (réserve arrière) ---- */
  const coffre = buildCoffreFort();
  coffre.position.set(-width / 2 + 0.8, 0.2, -depth / 2 + 0.6);
  group.add(coffre);

  /* ---- Râteliers muraux garnis des armes du catalogue ---- */
  const armesAFeu = WEAPON_SHOP_CATALOG.filter((i) => i.category === "arme_a_feu");
  const nbRateliers = 2;
  for (let r = 0; r < nbRateliers; r++) {
    const ratelier = buildRatelierMural(2.4, 4);
    ratelier.position.set(-width / 2 + wt + 0.05, 1.4, -depth / 2 + 2.5 + r * 2.6);
    ratelier.rotation.y = Math.PI / 2;
    group.add(ratelier);
    displayRacks.push(ratelier);

    // Accrocher jusqu'à 4 armes par râtelier
    for (let s = 0; s < 4; s++) {
      const item = armesAFeu[(r * 4 + s) % armesAFeu.length];
      if (!item) continue;
      const modele = item.createModel();
      modele.userData.itemId = item.id;
      modele.userData.interactable = true;
      modele.userData.action = "consulter_item";
      modele.scale.set(1.4, 1.4, 1.4);
      modele.position.set(-width / 2 + wt + 0.12, 0.45 - s * 0.28, -depth / 2 + 2.5 + r * 2.6);
      modele.rotation.y = Math.PI / 2;
      group.add(modele);
    }
  }

  /* ---- Vitrines sécurisées pour les couteaux ---- */
  const couteaux = WEAPON_SHOP_CATALOG.filter((i) => i.category === "couteau");
  const nbVitrines = 2;
  for (let v = 0; v < nbVitrines; v++) {
    const vitrine = buildVitrineSecurisee();
    vitrine.position.set(width / 2 - wt - 0.5, 0.2, -depth / 2 + 2.2 + v * 2.2);
    vitrine.rotation.y = -Math.PI / 2;
    group.add(vitrine);
    displayRacks.push(vitrine);

    for (let s = 0; s < Math.min(3, couteaux.length); s++) {
      const item = couteaux[(v * 3 + s) % couteaux.length];
      if (!item) continue;
      const modele = item.createModel();
      modele.userData.itemId = item.id;
      modele.userData.interactable = true;
      modele.userData.action = "consulter_item";
      modele.scale.set(2.2, 2.2, 2.2);
      modele.position.set(width / 2 - wt - 0.55, 0.5 + s * 0.35, -depth / 2 + 2.2 + v * 2.2);
      modele.rotation.set(Math.PI / 2, 0, 0);
      group.add(modele);
    }
  }

  /* ---- Caméras de sécurité ---- */
  const camPositions: [number, number, number, number][] = [
    [-width / 2 + 0.3, height - 0.2, -depth / 2 + 0.3, Math.PI / 4],
    [width / 2 - 0.3, height - 0.2, -depth / 2 + 0.3, -Math.PI / 4],
    [-width / 2 + 0.3, height - 0.2, depth / 2 - 0.3, (3 * Math.PI) / 4],
  ];
  for (const [x, y, z, rot] of camPositions) {
    const cam = buildCameraSecurite();
    cam.position.set(x, y, z);
    cam.rotation.y = rot;
    group.add(cam);
    cameras.push(cam);
  }

  group.position.copy(position);
  group.rotation.y = rotationY;

  const interactionPoints = {
    comptoirVente: new THREE.Vector3(0, 0.9, -depth / 2 + 1.4).add(position),
    caisseEnregistreuse: new THREE.Vector3(0.7, 1.1, -depth / 2 + 1.4).add(position),
    coffreFort: new THREE.Vector3(-width / 2 + 0.8, 0.6, -depth / 2 + 0.6).add(position),
    porteEntree: portePos.clone().add(position),
    panneauOuvertFerme: new THREE.Vector3(width / 2 - 0.5, height - 0.9, depth / 2 - wt / 2).add(
      position,
    ),
  };

  return { group, interactionPoints, displayRacks, cameras };
}

/**
 * Met à jour l'affichage visuel du panneau OUVERT/FERMÉ et l'état de la porte
 * en fonction de l'état réel de la boutique (voir ShopManager.isOpen).
 */
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
}
