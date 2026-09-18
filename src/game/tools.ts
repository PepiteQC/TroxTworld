import * as THREE from "three";
import { ak74Held } from "./ak74";
import { carabineHeld } from "./carabine";
import { bobombProp } from "./bobomb";
import { ar15Held, shotgunHeld, pistolHeld } from "./guns";
import { matLib } from "./materials";
import { buildWeaponMesh, getWeapon, holdPose, type WeaponId } from "./weapons";
import { getPoiAt, getSurfaceAt, getVillageAt, getZoneName } from "./worlddata";

// 🌟 CATALOGUE ÉTENDU DES OUTILS RP
export type WorkToolId = 
  | "marteau" | "pelle" | "rateau" | "perceuse" | "tronconneuse" 
  | "casque" | "gilet" | "boite" | "cle" | "lampe" | "canne" 
  | "extincteur" | "hache" | "tournevis" | "loupe" | "camera" | "rouleau";

const WORK_TOOLS = new Set<string>([
  "marteau", "pelle", "rateau", "perceuse", "tronconneuse", "casque", 
  "gilet", "boite", "cle", "lampe", "canne", "extincteur",
  "hache", "tournevis", "loupe", "camera", "rouleau"
]);

export function isWorkTool(id: string): id is WorkToolId {
  return WORK_TOOLS.has(id);
}

// ═══════════════════════════════════════════════════════════
// PALETTE DE MATÉRIAUX RÉALISTES
// ═══════════════════════════════════════════════════════════
function steel() { return matLib.get(0x8a8f96, 0.28, 0.92); }
function darkSteel() { return matLib.get(0x3a3e44, 0.4, 0.88); }
function chrome() { return matLib.get(0xd8dce0, 0.1, 0.98); }
function wood() { return matLib.get(0x8a5a2f, 0.7); }
function darkWood() { return matLib.get(0x4a2f1c, 0.75); }
function plastic(c: number) { return matLib.get(c, 0.45, 0.08); }
function rubber() { return matLib.get(0x1a1c1e, 0.9, 0.02); }

// ═══════════════════════════════════════════════════════════
// 🛠️ OUTILS DE BASE (améliorés)
// ═══════════════════════════════════════════════════════════

export function buildMarteau(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.32, 10), wood());
  manche.position.y = 0.16;
  manche.castShadow = true;
  g.add(manche);
  
  // Grip en caoutchouc noir sur le bas du manche
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.1, 10), rubber());
  grip.position.y = 0.05;
  g.add(grip);
  
  // Tête forgée en acier (côté frappe + côté arrache-clou)
  const tete = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.048, 0.045), steel());
  tete.position.y = 0.32;
  tete.castShadow = true;
  g.add(tete);
  
  const arrache = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.045), steel());
  arrache.position.set(-0.08, 0.32, 0);
  arrache.rotation.z = -0.3;
  g.add(arrache);
  
  return g;
}

export function buildPelle(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.85, 10), wood());
  manche.position.y = 0.42;
  manche.castShadow = true;
  g.add(manche);
  
  // Poignée D en haut
  const dGrip = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI), plastic(0x1a1a1e));
  dGrip.position.y = 0.85;
  g.add(dGrip);
  
  // Lame de pelle biseautée
  const lame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.014), steel());
  lame.position.y = 0.02;
  lame.rotation.x = -0.18;
  lame.castShadow = true;
  g.add(lame);
  
  return g;
}

export function buildRateau(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.9, 8), wood());
  manche.position.y = 0.45;
  manche.castShadow = true;
  g.add(manche);
  
  const barre = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.018, 0.014), steel());
  barre.position.y = 0.02;
  g.add(barre);
  
  for (let i = 0; i < 9; i++) {
    const dent = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.09, 6), steel());
    dent.position.set(-0.11 + i * 0.028, -0.03, 0);
    dent.rotation.x = Math.PI;
    g.add(dent);
  }
  return g;
}

export function buildPerceuse(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.08), plastic(0xf0c020));
  corps.position.set(0.02, 0.09, 0);
  corps.castShadow = true;
  g.add(corps);
  
  const logo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.081), plastic(0x000000));
  logo.position.set(0.02, 0.09, 0);
  g.add(logo);
  
  const poignee = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), plastic(0x1c1c1e));
  poignee.position.set(-0.04, 0.0, 0);
  poignee.castShadow = true;
  g.add(poignee);
  
  // Batterie clip
  const batterie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.07), plastic(0x101010));
  batterie.position.set(-0.05, -0.075, 0);
  g.add(batterie);
  
  // Mandrin chromé
  const mandrin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.04, 12), chrome());
  mandrin.rotation.z = -Math.PI / 2;
  mandrin.position.set(0.13, 0.09, 0);
  g.add(mandrin);
  
  // Foret pointu spiralé
  const meche = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.09, 8), steel());
  meche.rotation.z = -Math.PI / 2;
  meche.position.set(0.19, 0.09, 0);
  g.add(meche);
  
  return g;
}

export function buildTronconneuse(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), plastic(0xf0761c));
  corps.position.set(-0.04, 0.08, 0);
  corps.castShadow = true;
  g.add(corps);
  
  // Poignée arrière ergonomique
  const backHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), plastic(0x1a1a1a));
  backHandle.position.set(-0.14, 0.08, 0);
  g.add(backHandle);
  
  // Poignée supérieure en arceau
  const topHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 16, Math.PI), plastic(0x111111));
  topHandle.position.set(-0.04, 0.17, 0);
  g.add(topHandle);
  
  // Guide-chaîne
  const barre = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.012), steel());
  barre.position.set(0.2, 0.08, 0);
  g.add(barre);
  
  // Chaîne (dents)
  for (let i = 0; i < 15; i++) {
    const dent = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.014), darkSteel());
    dent.position.set(0.06 + i * 0.025, 0.104, 0);
    g.add(dent);
  }
  
  // Bouchon d'essence
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), matLib.get(0xffcc00));
  cap.position.set(-0.1, 0.16, 0.045);
  g.add(cap);
  
  return g;
}

export function buildCasque(): THREE.Group {
  const g = new THREE.Group();
  const coque = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.8), 
    plastic(0xf0c020)
  );
  coque.castShadow = true;
  g.add(coque);
  
  const bord = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12), plastic(0xf0c020));
  bord.position.y = -0.02;
  g.add(bord);
  
  // Visière avant
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.06), plastic(0xd8a800));
  visor.position.set(0, 0.01, 0.1);
  g.add(visor);
  
  // Lampe frontale LED
  const lampBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.04), plastic(0x1a1a1a));
  lampBase.position.set(0, 0.06, 0.115);
  g.add(lampBase);
  
  const ampoule = new THREE.Mesh(
    new THREE.CircleGeometry(0.015, 12), 
    matLib.getEmissive(0xffffff, 0xffdd88, 1.8)
  );
  ampoule.position.set(0, 0.06, 0.137);
  g.add(ampoule);
  
  // Sangle jugulaire
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.005), matLib.get(0x1a1a1a));
  strap.position.set(0.11, -0.05, 0.02);
  g.add(strap);
  
  return g;
}

export function buildGilet(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.42, 0.12), 
    matLib.getEmissive(0xe8e820, 0xe8e820, 0.15)
  );
  corps.position.y = 0.2;
  corps.castShadow = true;
  g.add(corps);
  
  // Bandes réfléchissantes horizontales
  for (const yPos of [0.1, 0.3]) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.39, 0.04, 0.121), 
      matLib.getEmissive(0xffffff, 0xffffff, 0.8)
    );
    band.position.y = yPos;
    g.add(band);
  }
  
  return g;
}

export function buildBoiteOutils(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.18), plastic(0xc9302c));
  corps.position.y = 0.1;
  corps.castShadow = true;
  g.add(corps);
  
  // Fermoirs métalliques
  for (const xPos of [-0.14, 0.14]) {
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.005), chrome());
    lock.position.set(xPos, 0.13, 0.092);
    g.add(lock);
  }
  
  // Poignée arceau
  const poignee = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), chrome());
  poignee.rotation.z = Math.PI;
  poignee.position.y = 0.24;
  g.add(poignee);
  
  return g;
}

// ═══════════════════════════════════════════════════════════
// 🌟 NOUVEAUX OUTILS RP RÉALISTES
// ═══════════════════════════════════════════════════════════

export function buildLampeTorche(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 12), plastic(0x1a1a1a));
  manche.position.y = 0.11;
  manche.castShadow = true;
  g.add(manche);
  
  // Grippage anti-dérapant
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.002, 6, 12), plastic(0x0a0a0a));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05 + i * 0.02;
    g.add(ring);
  }
  
  const tete = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.024, 0.08, 12), plastic(0x1a1a1a));
  tete.position.y = 0.26;
  g.add(tete);
  
  const lentille = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.012, 12), 
    matLib.getEmissive(0xffffff, 0xffffff, 2.2)
  );
  lentille.position.y = 0.305;
  g.add(lentille);
  
  return g;
}

export function buildCanneAPeche(): THREE.Group {
  const g = new THREE.Group();
  
  // Poignée en liège
  const poignee = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.2, 12), matLib.get(0xc8a878, 0.85));
  poignee.position.y = 0.1;
  g.add(poignee);
  
  // Perche
  const perche = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.012, 1.6, 8), plastic(0x2a2a2e));
  perche.position.y = 1.0;
  g.add(perche);
  
  // Moulinet
  const moulinet = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.055, 16), steel());
  moulinet.rotation.x = Math.PI / 2;
  moulinet.position.set(0, 0.22, -0.04);
  g.add(moulinet);
  
  // Manivelle
  const manivelle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.008), chrome());
  manivelle.position.set(0.03, 0.22, -0.06);
  g.add(manivelle);
  
  // Anneaux guide-fil sur la perche
  for (let i = 0; i < 5; i++) {
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.001, 6, 12), chrome());
    anneau.rotation.x = Math.PI / 2;
    anneau.position.y = 0.5 + i * 0.28;
    g.add(anneau);
  }
  
  // Fil de nylon (visible)
  const fil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0008, 0.0008, 0.6, 4), 
    matLib.get(0xffffff, 0.5)
  );
  fil.position.set(0.015, 1.5, 0);
  g.add(fil);
  
  // Flotteur rouge et blanc
  const flotteur = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), plastic(0xd00000));
  flotteur.position.set(0.015, 1.79, 0);
  g.add(flotteur);
  
  return g;
}

export function buildExtincteur(): THREE.Group {
  const g = new THREE.Group();
  
  // Bonbonne rouge principale
  const bonbonne = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.36, 20), plastic(0xcc0000));
  bonbonne.position.y = 0.18;
  bonbonne.castShadow = true;
  g.add(bonbonne);
  
  // Étiquette blanche ULC
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.12), plastic(0xffffff));
  label.position.set(0, 0.2, 0.086);
  g.add(label);
  
  // Base noire
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.02, 20), plastic(0x1a1a1a));
  base.position.y = 0.01;
  g.add(base);
  
  // Cou / valve
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.05, 12), darkSteel());
  col.position.y = 0.38;
  g.add(col);
  
  // Poignée / gâchette
  const poignee = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.03), darkSteel());
  poignee.position.set(0, 0.42, 0);
  g.add(poignee);
  
  // Goupille rouge de sécurité
  const goupille = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 6), plastic(0xff0000));
  goupille.rotation.z = Math.PI / 2;
  goupille.position.set(0.03, 0.42, 0);
  g.add(goupille);
  
  // Manomètre / jauge
  const jauge = new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), plastic(0xf0f0f0));
  jauge.position.set(0, 0.42, 0.035);
  g.add(jauge);
  
  // Tuyau flexible noir
  const tuyau = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8), plastic(0x111111));
  tuyau.rotation.z = Math.PI / 3;
  tuyau.position.set(0.11, 0.28, 0);
  g.add(tuyau);
  
  // Buse en laiton
  const buse = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.05, 8), matLib.get(0xc89438, 0.4, 0.9));
  buse.rotation.z = Math.PI / 3;
  buse.position.set(0.22, 0.13, 0);
  g.add(buse);
  
  return g;
}

export function buildHache(): THREE.Group {
  const g = new THREE.Group();
  
  // Manche en hickory
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.7, 10), wood());
  manche.position.y = 0.35;
  manche.castShadow = true;
  g.add(manche);
  
  // Grip caoutchouc en bas
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.12, 10), rubber());
  grip.position.y = 0.06;
  g.add(grip);
  
  // Tête de hache forgée (lame + tête)
  const tete = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.14), darkSteel());
  tete.position.y = 0.72;
  tete.castShadow = true;
  g.add(tete);
  
  // Lame tranchante triangulaire
  const lame = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.09), chrome());
  lame.position.set(0.03, 0.72, 0);
  g.add(lame);
  
  return g;
}

export function buildTournevis(): THREE.Group {
  const g = new THREE.Group();
  
  // Manche ergonomique rouge Snap-On
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.11, 10), plastic(0xc00000));
  manche.position.y = 0.055;
  g.add(manche);
  
  // Bandes de grip
  for (let i = 0; i < 5; i++) {
    const grip = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 6, 12), plastic(0x600000));
    grip.rotation.x = Math.PI / 2;
    grip.position.y = 0.025 + i * 0.018;
    g.add(grip);
  }
  
  // Tige chromée
  const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), chrome());
  tige.position.y = 0.18;
  g.add(tige);
  
  // Embout Phillips en croix
  const embout = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.02, 4), chrome());
  embout.position.y = 0.26;
  g.add(embout);
  
  return g;
}

export function buildLoupe(): THREE.Group {
  const g = new THREE.Group();
  
  // Manche noir
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.12, 10), plastic(0x1a1a1a));
  manche.position.y = 0.06;
  g.add(manche);
  
  // Cadre or/laiton
  const cadre = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 8, 24), matLib.get(0xc89438, 0.4, 0.9));
  cadre.rotation.x = Math.PI / 2;
  cadre.position.y = 0.18;
  g.add(cadre);
  
  // Verre grossissant transparent
  const verre = new THREE.Mesh(
    new THREE.CircleGeometry(0.05, 24), 
    matLib.get(0xc0e0f0, 0.05, 0.15)
  );
  verre.rotation.x = -Math.PI / 2;
  verre.position.y = 0.18;
  g.add(verre);
  
  // Connexion manche-cadre
  const con = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.01), matLib.get(0xc89438));
  con.position.y = 0.13;
  g.add(con);
  
  return g;
}

export function buildCamera(): THREE.Group {
  const g = new THREE.Group();
  
  // Corps de l'appareil
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.07), plastic(0x0a0a0a));
  corps.position.y = 0.05;
  corps.castShadow = true;
  g.add(corps);
  
  // Grip texturé
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.075), plastic(0x1a1a1a));
  grip.position.set(0.052, 0.045, 0);
  g.add(grip);
  
  // Objectif
  const objBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.038, 0.06, 16), plastic(0x1a1a1a));
  objBase.rotation.x = Math.PI / 2;
  objBase.position.set(-0.02, 0.05, 0.065);
  g.add(objBase);
  
  const objLens = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.02, 16), matLib.get(0x1a2a30, 0.05, 0.7));
  objLens.rotation.x = Math.PI / 2;
  objLens.position.set(-0.02, 0.05, 0.1);
  g.add(objLens);
  
  // Reflet objectif
  const reflet = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), matLib.getEmissive(0x2050c0, 0x2050c0, 0.5));
  reflet.position.set(-0.02, 0.05, 0.111);
  g.add(reflet);
  
  // Viseur au sommet
  const viseur = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.04), plastic(0x1a1a1a));
  viseur.position.set(-0.02, 0.11, 0);
  g.add(viseur);
  
  // Flash
  const flash = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.01), matLib.getEmissive(0xffffff, 0xffffff, 0.3));
  flash.position.set(-0.055, 0.09, 0.036);
  g.add(flash);
  
  // Bouton déclencheur rouge
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.005, 12), plastic(0xc00000));
  btn.position.set(0.05, 0.11, 0);
  g.add(btn);
  
  return g;
}

export function buildRouleauPate(): THREE.Group {
  const g = new THREE.Group();
  
  // Rouleau en bois clair
  const rouleau = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 16), matLib.get(0xe8d4a8, 0.7));
  rouleau.rotation.z = Math.PI / 2;
  rouleau.position.y = 0.035;
  rouleau.castShadow = true;
  g.add(rouleau);
  
  // Poignées aux extrémités
  for (const xPos of [-0.19, 0.19]) {
    const poignee = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 10), matLib.get(0xa87848, 0.65));
    poignee.rotation.z = Math.PI / 2;
    poignee.position.set(xPos, 0.035, 0);
    g.add(poignee);
    
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), matLib.get(0xa87848, 0.65));
    cap.position.set(xPos * 1.15, 0.035, 0);
    g.add(cap);
  }
  
  return g;
}

// ═══════════════════════════════════════════════════════════
// CONFIGURATION DE POSITIONNEMENT DANS LA MAIN DU JOUEUR
// ═══════════════════════════════════════════════════════════
type HeldToolConfig = {
  build: () => THREE.Group;
  pos: [number, number, number];
  rot?: [number, number, number];
  scale?: number;
};

const HELD_TOOLS_CONFIG: Record<string, HeldToolConfig> = {
  marteau: { build: buildMarteau, pos: [0.3, 0.74, 0.1], rot: [-0.5, 0.35, 0.2], scale: 0.9 },
  cle: { build: buildMarteau, pos: [0.3, 0.74, 0.1], rot: [-0.5, 0.35, 0.2], scale: 0.9 },
  pelle: { build: buildPelle, pos: [0.22, 0.55, 0.18], rot: [0.15, 0.1, 0.4], scale: 0.55 },
  rateau: { build: buildRateau, pos: [0.22, 0.52, 0.18], rot: [0.15, 0.1, 0.45], scale: 0.5 },
  perceuse: { build: buildPerceuse, pos: [0.32, 0.78, 0.16], rot: [0.2, 1.2, 0.4], scale: 0.9 },
  tronconneuse: { build: buildTronconneuse, pos: [0.28, 0.78, 0.28], rot: [0.1, 0.6, 0.2], scale: 0.7 },
  casque: { build: buildCasque, pos: [0, 1.86, 0.02] },
  gilet: { build: buildGilet, pos: [0, 1.18, 0.02], scale: 1.05 },
  boite: { build: buildBoiteOutils, pos: [0.28, 0.55, 0.12], rot: [0, 0.4, 0], scale: 0.55 },
  lampe: { build: buildLampeTorche, pos: [0.25, 0.8, 0.15], rot: [1.5, 0, 0], scale: 0.8 },
  canne: { build: buildCanneAPeche, pos: [0.25, 0.4, 0.2], rot: [0.4, 0, 0], scale: 0.8 },
  extincteur: { build: buildExtincteur, pos: [0.28, 0.6, 0.15], rot: [0, 0.5, 0], scale: 0.75 },
  
  // 🌟 Nouveaux outils
  hache: { build: buildHache, pos: [0.25, 0.5, 0.2], rot: [0.3, 0.2, 0.4], scale: 0.85 },
  tournevis: { build: buildTournevis, pos: [0.3, 0.85, 0.12], rot: [-0.4, 0.3, 0.15], scale: 0.9 },
  loupe: { build: buildLoupe, pos: [0.28, 1.4, 0.15], rot: [0.3, 0.4, -0.2], scale: 0.85 },
  camera: { build: buildCamera, pos: [0.15, 1.55, 0.22], rot: [0.1, 0.3, 0.1], scale: 0.9 },
  rouleau: { build: buildRouleauPate, pos: [0.28, 0.85, 0.18], rot: [0, 0.4, 0.3], scale: 0.9 },

  ak74: { build: ak74Held, pos: [0.18, 0.98, 0.22], rot: [0.22, 0.08, 0.18], scale: 0.95 },
  ar15: { build: ar15Held, pos: [0.18, 0.96, 0.22], rot: [0.2, 0.08, 0.16], scale: 0.95 },
  shotgun: { build: shotgunHeld, pos: [0.16, 0.94, 0.24], rot: [0.18, 0.05, 0.12], scale: 0.95 },
  carabine: { build: carabineHeld, pos: [0.16, 0.96, 0.24], rot: [0.18, 0.06, 0.14], scale: 0.92 },
  bobomb: { build: bobombProp, pos: [0.26, 0.72, 0.14], rot: [0.1, 0.4, 0.15], scale: 0.7 },
  pistol: { build: pistolHeld, pos: [0.28, 0.9, 0.18], rot: [0.18, 0.2, 0.28], scale: 1.05 }
};

export function buildHeldTool(id: string): THREE.Group | null {
  const wrap = new THREE.Group();
  wrap.name = "held-tool";

  const config = HELD_TOOLS_CONFIG[id];
  if (config) {
    const inner = config.build();
    wrap.position.set(...config.pos);
    if (config.rot) wrap.rotation.set(...config.rot);
    if (config.scale !== undefined) wrap.scale.setScalar(config.scale);
    wrap.add(inner);
    return wrap;
  }

  if (getWeapon(id)) {
    const inner = buildWeaponMesh(id as WeaponId);
    const pose = holdPose(id);
    wrap.position.set(...pose.pos);
    wrap.rotation.set(...pose.rot);
    wrap.scale.setScalar(pose.scale);
    wrap.add(inner);
    return wrap;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// SYSTÈME DE MÉTIERS RP ULTRA-RÉALISTE
// ═══════════════════════════════════════════════════════════
export interface WorkJob {
  label: string;
  pay: number;
  loot?: string;
  duration?: number;    // Durée en secondes pour compléter l'action
  xp?: number;          // XP gagnée dans la compétence associée
  skill?: "chasse" | "peche" | "construction" | "mecanique" | "cuisine" | "medical" | "forestier" | "electricite";
}

export function workJobAt(toolId: string | null, x: number, z: number): WorkJob | null {
  if (!toolId) return null;
  
  const zone = getZoneName(x, z);
  const surf = getSurfaceAt(x, z);
  const village = getVillageAt(x, z);
  const poi = getPoiAt(x, z);

  // 🎣 PÊCHE — Au bord du fleuve Saint-Laurent ou d'une rivière
  if (toolId === "canne" && (surf.key === "water" || zone.includes("Fleuve") || zone.includes("Rivière"))) {
    const poissons = ["perchaude", "dore", "brochet", "achigan", "esturgeon"];
    const loot = poissons[Math.floor(Math.random() * poissons.length)];
    return { label: "Pêche au Saint-Laurent", pay: 35 + Math.floor(Math.random() * 30), loot, duration: 8, xp: 15, skill: "peche" };
  }

  // 🚒 POMPIER VOLONTAIRE — Extincteur à la papeterie ou en zone risque
  if (toolId === "extincteur") {
    if (poi?.id === "donnacona_papeterie") {
      return { label: "Sécurité incendie · Papeterie", pay: 75, xp: 20, skill: "medical", duration: 10 };
    }
    if (poi?.id?.includes("caserne") || zone.includes("Industrielle")) {
      return { label: "Intervention Pompier volontaire", pay: 65, xp: 18, skill: "medical", duration: 12 };
    }
  }

  // 🌲 BÛCHERON MFFP — Tronçonneuse et Hache dans les forêts des Laurentides
  if ((toolId === "tronconneuse" || toolId === "hache")) {
    if (z < -360 || zone.includes("Forêt") || zone.includes("Laurent")) {
      const pay = toolId === "tronconneuse" ? 55 : 42;
      return { label: "Coupe forestière MFFP", pay, loot: "bois", xp: 22, skill: "forestier", duration: 15 };
    }
  }

  // 🔧 MÉCANICIEN DE GARAGE — Clé, tournevis, boîte à outils sur l'asphalte
  if (["cle", "boite", "tournevis"].includes(toolId) && surf.key === "asphalt") {
    const pay = toolId === "tournevis" ? 38 : (toolId === "boite" ? 42 : 34);
    return { label: "Mécanique de rang", pay, xp: 15, skill: "mecanique", duration: 10 };
  }

  // 🏗️ CONSTRUCTION / RÉNOVATION — Marteau, perceuse, tournevis en village
  if (["marteau", "perceuse", "tournevis"].includes(toolId) && village) {
    const pay = toolId === "perceuse" ? 40 : (toolId === "tournevis" ? 35 : 28);
    return { label: `Chantier ${village.name || "du village"}`, pay, xp: 12, skill: "construction", duration: 8 };
  }

  // 📸 PHOTOJOURNALISTE — Appareil photo dans les zones à événements
  if (toolId === "camera") {
    if (poi) {
      return { label: `Reportage · ${poi.name}`, pay: 45, loot: "photo", xp: 12, duration: 6 };
    }
    if (village) {
      return { label: "Chronique Journal de Portneuf", pay: 25, xp: 8, duration: 5 };
    }
  }

  // 🕵️ DÉTECTIVE / ENQUÊTEUR PRIVÉ — Loupe pour indices
  if (toolId === "loupe" && (poi || village)) {
    return { label: "Collecte de preuves", pay: 55, loot: "indice", xp: 20, duration: 12 };
  }

  // 🍞 BOULANGER-PÂTISSIER — Rouleau à pâte en café/restaurant
  if (toolId === "rouleau" && village) {
    return { label: "Boulangerie · Levain d'antan", pay: 32, loot: "pain", xp: 10, skill: "cuisine", duration: 7 };
  }

  // 🌾 AGRICOLE — Pelle et râteau dans les rangs
  if (["pelle", "rateau"].includes(toolId) && ["grass", "clay", "dirt"].includes(surf.key) && z < 70) {
    return { label: toolId === "pelle" ? "Foin rentré" : "Rang ratissé", pay: toolId === "pelle" ? 30 : 24, xp: 10, duration: 9 };
  }

  // 💡 ÉLECTRICITÉ — Lampe torche + boîte à outils la nuit ou en industriel
  if (toolId === "lampe" && (poi?.type === "usine" || poi?.type === "industrie" || zone.includes("Industrielle"))) {
    return { label: "Inspection électrique", pay: 48, xp: 16, skill: "electricite", duration: 10 };
  }

  // 🏭 QUART À LA PAPETERIE (Casque, gilet, perceuse)
  if (poi?.id === "donnacona_papeterie" && ["casque", "gilet", "perceuse"].includes(toolId)) {
    return { label: "Quart machine à papier", pay: 60, loot: "papier", xp: 18, skill: "construction", duration: 12 };
  }
  
  return null;
}