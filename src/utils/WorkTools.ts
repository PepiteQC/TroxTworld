// ═══════════════════════════════════════════════════════════════════════
//  WORK TOOLS v1.0 — CLIENT
//  Outils de travail 3D low-poly + PBR — métiers RP (JobEngine)
//  TroxT EtherWorld — Québécois RP 🍁
//
//  Pensé pour se brancher sur les jobs existants (construction,
//  mécanique, électricité, entretien paysager...) : chaque outil porte
//  un `jobHint` optionnel indiquant le métier RP auquel il est associé.
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ── Types ─────────────────────────────────────────────────────────────

export type ToolCategory = 'construction' | 'mecanique' | 'electricite' | 'plomberie' | 'jardinage' | 'mesure' | 'securite';

export type ToolId =
  | 'marteau' | 'perceuse' | 'scie-circulaire' | 'masse' | 'boite-outils' | 'echelle'
  | 'cle-molette' | 'pince' | 'cle-a-cliquet' | 'chalumeau'
  | 'tournevis' | 'multimetre' | 'pince-amperemetrique'
  | 'cle-a-tuyau' | 'debouchoir'
  | 'niveau' | 'ruban-mesure' | 'equerre'
  | 'pelle' | 'rateau' | 'tondeuse' | 'tronconneuse'
  | 'casque-securite' | 'gants-travail' | 'extincteur' | 'gilet-securite';

export interface ToolDef {
  id           : ToolId;
  name         : string;
  icon         : string;
  category     : ToolCategory;
  price        : number;
  durability   : number;
  jobHint     ?: string;   // métier RP typiquement associé
  twoHanded    : boolean;
  description  : string;
  build        : () => THREE.Group;
}

// ── Matériaux partagés ────────────────────────────────────────────────

const TMAT = {
  acierOuti:    () => new THREE.MeshStandardMaterial({ color: '#6b6f75', roughness: 0.35, metalness: 0.85 }),
  acierSombre:  () => new THREE.MeshStandardMaterial({ color: '#2a2c2f', roughness: 0.4, metalness: 0.7 }),
  boisManche:   () => new THREE.MeshStandardMaterial({ color: '#8a5a2f', roughness: 0.6, metalness: 0 }),
  plastiqueRouge: () => new THREE.MeshStandardMaterial({ color: '#c9302c', roughness: 0.4, metalness: 0.1 }),
  plastiqueJaune: () => new THREE.MeshStandardMaterial({ color: '#f0c020', roughness: 0.4, metalness: 0.1 }),
  plastiqueNoir: () => new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: 0.45, metalness: 0.1 }),
  plastiqueOrange: () => new THREE.MeshStandardMaterial({ color: '#f0761c', roughness: 0.4, metalness: 0.05 }),
  caoutchouc:   () => new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.85, metalness: 0 }),
  cuivre:       () => new THREE.MeshStandardMaterial({ color: '#b5772f', roughness: 0.3, metalness: 0.85 }),
  laiton:       () => new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.3, metalness: 0.9 }),
  ecranLcd:     () => new THREE.MeshStandardMaterial({ color: '#4a5a2a', emissive: '#7aff4a', emissiveIntensity: 1.2, roughness: 0.3 }),
  hiVis:        () => new THREE.MeshStandardMaterial({ color: '#e8e820', emissive: '#e8e820', emissiveIntensity: 0.15, roughness: 0.6 }),
  aluminium:    () => new THREE.MeshStandardMaterial({ color: '#c7cbd1', roughness: 0.3, metalness: 0.9 }),
  toile:        () => new THREE.MeshStandardMaterial({ color: '#4a5a3a', roughness: 0.8, metalness: 0 }),
  plastiqueBleu: () => new THREE.MeshStandardMaterial({ color: '#1e5a8a', roughness: 0.4, metalness: 0.1 }),
};

function toolShadows(g: THREE.Group): THREE.Group {
  g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// ═════════════════════════════════════════════════════════════════════
//  CONSTRUCTEURS
// ═════════════════════════════════════════════════════════════════════

function buildMarteau(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.28, 8), TMAT.boisManche());
  manche.position.y = 0.14; g.add(manche);
  const tete = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.035), TMAT.acierOuti());
  tete.position.y = 0.28; g.add(tete);
  const griffe = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.012, 6, 12, Math.PI), TMAT.acierOuti());
  griffe.rotation.set(Math.PI / 2, 0, Math.PI / 2); griffe.position.set(-0.06, 0.28, 0); g.add(griffe);
  return toolShadows(g);
}

function buildPerceuse(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12), TMAT.plastiqueJaune());
  corps.rotation.z = Math.PI / 2; corps.position.set(0.02, 0.06, 0); g.add(corps);
  const poignee = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.13, 10), TMAT.plastiqueNoir());
  poignee.position.set(-0.03, -0.02, 0); poignee.rotation.z = -0.15; g.add(poignee);
  const batterie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.05), TMAT.plastiqueNoir());
  batterie.position.set(-0.035, -0.08, 0); g.add(batterie);
  const mandrin = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.04, 10), TMAT.acierSombre());
  mandrin.rotation.z = Math.PI / 2; mandrin.position.set(0.12, 0.06, 0); mandrin.userData.animPart = 'spin-fast'; g.add(mandrin);
  const meche = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 6), TMAT.acierOuti());
  meche.rotation.z = Math.PI / 2; meche.position.set(0.16, 0.06, 0); meche.userData.animPart = 'spin-fast'; g.add(meche);
  return toolShadows(g);
}

function buildScieCirculaire(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.12), TMAT.plastiqueBleu());
  corps.position.y = 0.09; g.add(corps);
  const lame = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.006, 24), TMAT.acierOuti());
  lame.rotation.z = Math.PI / 2; lame.position.set(0.02, 0.02, 0.08); lame.userData.animPart = 'spin-fast-z'; g.add(lame);
  const poignee = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), TMAT.plastiqueNoir());
  poignee.rotation.z = Math.PI; poignee.position.set(-0.03, 0.19, 0); g.add(poignee);
  const semelle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.1), TMAT.aluminium());
  semelle.position.y = 0.006; g.add(semelle);
  return toolShadows(g);
}

function buildMasse(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.55, 8), TMAT.boisManche());
  manche.position.y = 0.275; g.add(manche);
  const tete = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 12), TMAT.acierSombre());
  tete.rotation.z = Math.PI / 2; tete.position.y = 0.55; g.add(tete);
  return toolShadows(g);
}

function buildBoiteOutils(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.14), TMAT.plastiqueRouge());
  corps.position.y = 0.08; g.add(corps);
  const couvercle = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.02, 0.15), TMAT.plastiqueRouge());
  couvercle.position.y = 0.17; g.add(couvercle);
  const poignee = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), TMAT.acierSombre());
  poignee.rotation.z = Math.PI; poignee.position.y = 0.2; g.add(poignee);
  const loquet = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.01), TMAT.acierOuti());
  loquet.position.set(0, 0.09, 0.075); g.add(loquet);
  return toolShadows(g);
}

function buildEchelle(): THREE.Group {
  const g = new THREE.Group();
  [-0.25, 0.25].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.8, 0.04), TMAT.aluminium());
    rail.position.set(x, 0.9, 0); g.add(rail);
  });
  for (let i = 0; i < 8; i++) {
    const barreau = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.53, 8), TMAT.aluminium());
    barreau.rotation.z = Math.PI / 2; barreau.position.set(0, 0.14 + i * 0.22, 0);
    g.add(barreau);
  }
  return toolShadows(g);
}

function buildCleMolette(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.008), TMAT.acierOuti());
  manche.position.y = 0.08; g.add(manche);
  const machoireFixe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.012), TMAT.acierOuti());
  machoireFixe.position.set(0.02, 0.17, 0); g.add(machoireFixe);
  const machoireMobile = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.012), TMAT.acierOuti());
  machoireMobile.position.set(-0.005, 0.145, 0); g.add(machoireMobile);
  const vis = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), TMAT.acierSombre());
  vis.rotation.x = Math.PI / 2; vis.position.set(0, 0.1, 0); g.add(vis);
  return toolShadows(g);
}

function buildPince(): THREE.Group {
  const g = new THREE.Group();
  [-1, 1].forEach(side => {
    const bras = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.01), TMAT.acierOuti());
    bras.position.set(side * 0.008, 0.08, 0); bras.rotation.z = side * 0.06;
    g.add(bras);
    const poignee = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.06, 4, 8), TMAT.caoutchouc());
    poignee.position.set(side * 0.015, -0.02, 0); poignee.rotation.z = side * 0.06;
    g.add(poignee);
  });
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.014, 8), TMAT.acierSombre());
  pivot.rotation.x = Math.PI / 2; pivot.position.y = 0.09; g.add(pivot);
  return toolShadows(g);
}

function buildCleACliquet(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.18, 10), TMAT.acierOuti());
  manche.position.y = 0.09; g.add(manche);
  const tete = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 12), TMAT.acierSombre());
  tete.rotation.x = Math.PI / 2; tete.position.y = 0.19; g.add(tete);
  const douille = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.03, 10), TMAT.acierOuti());
  douille.position.y = 0.22; g.add(douille);
  return toolShadows(g);
}

function buildChalumeau(): THREE.Group {
  const g = new THREE.Group();
  const bonbonne = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 12), TMAT.acierSombre());
  bonbonne.position.y = 0.08; g.add(bonbonne);
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.03, 8), TMAT.laiton());
  valve.position.y = 0.175; g.add(valve);
  const buse = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 8), TMAT.laiton());
  buse.rotation.x = Math.PI; buse.position.y = 0.2; g.add(buse);
  const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#4a8fff', emissive: '#7ab8ff', emissiveIntensity: 3, transparent: true, opacity: 0.85 }));
  flamme.position.y = 0.235; flamme.userData.animPart = 'flame'; flamme.visible = false; g.add(flamme);
  return toolShadows(g);
}

function buildTournevis(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.1, 10), TMAT.plastiqueOrange());
  manche.position.y = 0.05; g.add(manche);
  const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 8), TMAT.acierOuti());
  tige.position.y = 0.15; g.add(tige);
  return toolShadows(g);
}

function buildMultimetre(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.025), TMAT.plastiqueNoir());
  g.add(corps);
  const ecran = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.003), TMAT.ecranLcd());
  ecran.position.set(0, 0.035, 0.014); ecran.userData.animPart = 'screen-flicker'; g.add(ecran);
  const molette = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 12), TMAT.plastiqueOrange());
  molette.rotation.x = Math.PI / 2; molette.position.set(0, -0.02, 0.014); g.add(molette);
  [-0.015, 0.015].forEach(x => {
    const sonde = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 6), new THREE.MeshStandardMaterial({ color: x < 0 ? '#c9302c' : '#1c1c1e', roughness: 0.5 }));
    sonde.position.set(x, -0.13, 0.014); g.add(sonde);
  });
  return toolShadows(g);
}

function buildPinceAmperemetrique(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.025), TMAT.plastiqueJaune());
  corps.position.y = 0.065; g.add(corps);
  const machoire = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 16, Math.PI * 1.6), TMAT.plastiqueNoir());
  machoire.position.y = 0.15; g.add(machoire);
  const ecran = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.025, 0.003), TMAT.ecranLcd());
  ecran.position.set(0, 0.09, 0.014); ecran.userData.animPart = 'screen-flicker'; g.add(ecran);
  return toolShadows(g);
}

function buildCleATuyau(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.32, 8), TMAT.acierSombre());
  manche.position.y = 0.16; g.add(manche);
  const machoire = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.025), TMAT.acierSombre());
  machoire.position.y = 0.34; g.add(machoire);
  const vis = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04, 8), TMAT.acierOuti());
  vis.rotation.x = Math.PI / 2; vis.position.set(0.03, 0.3, 0); g.add(vis);
  return toolShadows(g);
}

function buildDebouchoir(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.4, 8), TMAT.boisManche());
  manche.position.y = 0.25; g.add(manche);
  const ventouse = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.6), TMAT.caoutchouc());
  ventouse.rotation.x = Math.PI; ventouse.position.y = 0.05; g.add(ventouse);
  return toolShadows(g);
}

function buildNiveau(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.02), TMAT.aluminium());
  g.add(corps);
  [-0.18, 0, 0.18].forEach(x => {
    const fiole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), new THREE.MeshPhysicalMaterial({ color: '#7aff5a', transparent: true, opacity: 0.35, transmission: 0.4, roughness: 0.1 }));
    fiole.rotation.z = Math.PI / 2; fiole.position.set(x, 0.028, 0); g.add(fiole);
    const bulle = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), new THREE.MeshStandardMaterial({ color: '#c8ffb0', emissive: '#c8ffb0', emissiveIntensity: 0.8, roughness: 0.2 }));
    bulle.position.set(x, 0.028, 0); bulle.userData.animPart = 'bubble'; bulle.userData.homeX = x; bulle.userData.range = 0.017; g.add(bulle);
  });
  return toolShadows(g);
}

function buildRubanMesure(): THREE.Group {
  const g = new THREE.Group();
  const boitier = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16), TMAT.plastiqueJaune());
  boitier.rotation.x = Math.PI / 2; g.add(boitier);
  const ruban = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.014, 0.002), new THREE.MeshStandardMaterial({ color: '#e8d840', roughness: 0.5 }));
  ruban.position.set(0.11, 0, 0.03); ruban.userData.animPart = 'tape'; ruban.userData.baseLength = 0.15; g.add(ruban);
  const crochet = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.004), TMAT.acierOuti());
  crochet.position.set(0.185, 0, 0.03); crochet.userData.animPart = 'tape-hook'; crochet.userData.baseX = 0.185; g.add(crochet);
  return toolShadows(g);
}

function buildEquerre(): THREE.Group {
  const g = new THREE.Group();
  const long = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.004), TMAT.acierOuti());
  long.position.x = 0.13; g.add(long);
  const court = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.004), TMAT.acierOuti());
  court.position.y = 0.06; g.add(court);
  return toolShadows(g);
}

function buildPelle(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.85, 8), TMAT.boisManche());
  manche.position.y = 0.425; g.add(manche);
  const poignee = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12), TMAT.boisManche());
  poignee.position.y = 0.86; g.add(poignee);
  const lame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.01), TMAT.acierOuti());
  lame.position.y = 0.02; lame.rotation.x = -0.15; g.add(lame);
  return toolShadows(g);
}

function buildRateau(): THREE.Group {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.9, 8), TMAT.boisManche());
  manche.position.y = 0.45; g.add(manche);
  const barre = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.01), TMAT.acierOuti());
  barre.position.y = 0.01; g.add(barre);
  for (let i = 0; i < 9; i++) {
    const dent = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 4), TMAT.acierOuti());
    dent.position.set(-0.11 + i * 0.0275, -0.03, 0); g.add(dent);
  }
  return toolShadows(g);
}

function buildTondeuse(): THREE.Group {
  const g = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.36), TMAT.plastiqueRouge());
  chassis.position.y = 0.14; g.add(chassis);
  [[-0.16, -0.14], [0.16, -0.14], [-0.16, 0.14], [0.16, 0.14]].forEach(([x, z]) => {
    const roue = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14), TMAT.plastiqueNoir());
    roue.rotation.x = Math.PI / 2; roue.position.set(x, 0.05, z); roue.userData.animPart = 'wheel-roll'; g.add(roue);
  });
  const guidon1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.55, 6), TMAT.acierSombre());
  guidon1.position.set(-0.12, 0.4, -0.15); guidon1.rotation.x = -0.5; g.add(guidon1);
  const guidon2 = guidon1.clone(); guidon2.position.x = 0.12; g.add(guidon2);
  const poigneeBarre = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), TMAT.caoutchouc());
  poigneeBarre.rotation.z = Math.PI / 2; poigneeBarre.position.set(0, 0.6, -0.35); g.add(poigneeBarre);
  return toolShadows(g);
}

function buildTronconneuse(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.09), TMAT.plastiqueOrange());
  corps.position.set(-0.05, 0.07, 0); g.add(corps);
  const barre = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.008), TMAT.acierSombre());
  barre.position.set(0.15, 0.07, 0); g.add(barre);
  const chassisTron = new THREE.Group();
  chassisTron.userData.animPart = 'chain-container';
  chassisTron.userData.barStart = -0.01; chassisTron.userData.barEnd = 0.31; chassisTron.userData.spacing = 0.024;
  for (let i = 0; i < 14; i++) {
    const maillon = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.006, 0.012), TMAT.acierOuti());
    maillon.position.set(-0.01 + i * 0.024, 0.052, 0);
    maillon.userData.animPart = 'chain-link';
    chassisTron.add(maillon);
  }
  g.add(chassisTron);
  const poignee = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12, Math.PI), TMAT.plastiqueNoir());
  poignee.rotation.z = Math.PI; poignee.position.set(-0.1, 0.16, 0); g.add(poignee);
  return toolShadows(g);
}

function buildCasqueSecurite(): THREE.Group {
  const g = new THREE.Group();
  const coque = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.9), new THREE.MeshStandardMaterial({ color: '#f0c020', roughness: 0.35, metalness: 0.05 }));
  g.add(coque);
  const bord = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 20), new THREE.MeshStandardMaterial({ color: '#f0c020', roughness: 0.35 }));
  bord.position.y = -0.005; g.add(bord);
  const bande = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 20), TMAT.plastiqueNoir());
  bande.rotation.x = Math.PI / 2; bande.position.y = 0.04; g.add(bande);
  return toolShadows(g);
}

function buildGantsTravail(): THREE.Group {
  const g = new THREE.Group();
  [-0.05, 0.05].forEach(x => {
    const paume = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.09), new THREE.MeshStandardMaterial({ color: '#c9a874', roughness: 0.85 }));
    paume.position.set(x, 0, 0); g.add(paume);
    for (let i = 0; i < 4; i++) {
      const doigt = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.05, 4, 6), new THREE.MeshStandardMaterial({ color: '#c9a874', roughness: 0.85 }));
      doigt.rotation.x = Math.PI / 2; doigt.position.set(x - 0.02 + i * 0.013, 0, 0.075); g.add(doigt);
    }
    const poignet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 10), TMAT.hiVis());
    poignet.rotation.x = Math.PI / 2; poignet.position.set(x, 0, -0.05); g.add(poignet);
  });
  return toolShadows(g);
}

function buildExtincteur(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 14), TMAT.plastiqueRouge());
  corps.position.y = 0.15; g.add(corps);
  const tete = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.05, 14), TMAT.acierSombre());
  tete.position.y = 0.32; g.add(tete);
  const poignee = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI), TMAT.acierSombre());
  poignee.rotation.z = Math.PI; poignee.position.y = 0.36; g.add(poignee);
  const tuyau = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), TMAT.plastiqueNoir());
  tuyau.rotation.z = 0.6; tuyau.position.set(0.05, 0.24, 0); g.add(tuyau);
  const etiquette = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.1), new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.6 }));
  etiquette.position.set(0, 0.15, 0.051); g.add(etiquette);
  return toolShadows(g);
}

function buildGiletSecurite(): THREE.Group {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.4, 12, 1, true, -Math.PI / 2.2, Math.PI * 1.44), TMAT.hiVis());
  corps.position.y = 0.2; corps.material.side = THREE.DoubleSide; g.add(corps);
  [-0.14, 0.14].forEach(x => {
    const bande = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.005), new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.3, metalness: 0.1 }));
    bande.position.set(x, 0.2, 0.13); g.add(bande);
  });
  const bandeHaut = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.03, 12, 1, true, -Math.PI / 2.2, Math.PI * 1.44), new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide }));
  bandeHaut.position.y = 0.3; g.add(bandeHaut);
  return toolShadows(g);
}

// ── Catalogue ─────────────────────────────────────────────────────────

export const TOOLS: Record<ToolId, ToolDef> = {
  marteau:              { id: 'marteau', name: 'Marteau', icon: '🔨', category: 'construction', price: 22, durability: 200, jobHint: 'construction', twoHanded: false, description: 'Panne fendue, manche en bois franc.', build: buildMarteau },
  perceuse:             { id: 'perceuse', name: 'Perceuse sans fil', icon: '🔧', category: 'construction', price: 180, durability: 150, jobHint: 'construction', twoHanded: true, description: 'Batterie 20V, mandrin auto-serrant.', build: buildPerceuse },
  'scie-circulaire':    { id: 'scie-circulaire', name: 'Scie circulaire', icon: '🪚', category: 'construction', price: 220, durability: 140, jobHint: 'construction', twoHanded: true, description: 'Coupe rapide, lame carbure.', build: buildScieCirculaire },
  masse:                { id: 'masse', name: 'Masse', icon: '🔨', category: 'construction', price: 45, durability: 220, jobHint: 'construction', twoHanded: true, description: 'Démolition et pieux, tête 4 lb.', build: buildMasse },
  'boite-outils':       { id: 'boite-outils', name: 'Boîte à outils', icon: '🧰', category: 'construction', price: 65, durability: 300, twoHanded: true, description: 'Rangement robuste, plateau amovible.', build: buildBoiteOutils },
  echelle:              { id: 'echelle', name: 'Échelle', icon: '🪜', category: 'construction', price: 140, durability: 250, jobHint: 'construction', twoHanded: true, description: 'Aluminium 8 pieds, pieds antidérapants.', build: buildEchelle },
  'cle-molette':        { id: 'cle-molette', name: 'Clé à molette', icon: '🔧', category: 'mecanique', price: 28, durability: 260, jobHint: 'mecanicien', twoHanded: false, description: 'Mâchoire ajustable, usage universel.', build: buildCleMolette },
  pince:                { id: 'pince', name: 'Pince', icon: '🛠️', category: 'mecanique', price: 18, durability: 220, jobHint: 'mecanicien', twoHanded: false, description: 'Manches caoutchoutés antidérapants.', build: buildPince },
  'cle-a-cliquet':      { id: 'cle-a-cliquet', name: 'Clé à cliquet', icon: '🔩', category: 'mecanique', price: 35, durability: 240, jobHint: 'mecanicien', twoHanded: false, description: 'Douilles interchangeables, mécanisme silencieux.', build: buildCleACliquet },
  chalumeau:            { id: 'chalumeau', name: 'Chalumeau', icon: '🔥', category: 'mecanique', price: 90, durability: 180, jobHint: 'mecanicien', twoHanded: true, description: 'Soudure et brasage, bonbonne propane.', build: buildChalumeau },
  tournevis:            { id: 'tournevis', name: 'Tournevis isolé', icon: '🪛', category: 'electricite', price: 12, durability: 200, jobHint: 'electricien', twoHanded: false, description: 'Manche isolé 1000V, embout Robertson.', build: buildTournevis },
  multimetre:           { id: 'multimetre', name: 'Multimètre', icon: '📟', category: 'electricite', price: 75, durability: 200, jobHint: 'electricien', twoHanded: false, description: 'Mesure tension, courant, résistance.', build: buildMultimetre },
  'pince-amperemetrique': { id: 'pince-amperemetrique', name: 'Pince ampèremétrique', icon: '⚡', category: 'electricite', price: 110, durability: 190, jobHint: 'electricien', twoHanded: false, description: 'Lecture de courant sans contact.', build: buildPinceAmperemetrique },
  'cle-a-tuyau':        { id: 'cle-a-tuyau', name: 'Clé à tuyau', icon: '🔧', category: 'plomberie', price: 40, durability: 260, jobHint: 'plombier', twoHanded: true, description: 'Mâchoires dentées, prise sur tuyaux.', build: buildCleATuyau },
  debouchoir:           { id: 'debouchoir', name: 'Débouchoir', icon: '🪠', category: 'plomberie', price: 8, durability: 150, jobHint: 'plombier', twoHanded: false, description: 'Ventouse classique, urgences de salle de bain.', build: buildDebouchoir },
  niveau:                { id: 'niveau', name: 'Niveau à bulle', icon: '📏', category: 'mesure', price: 25, durability: 220, jobHint: 'construction', twoHanded: false, description: 'Trois fioles, précision horizontale/verticale.', build: buildNiveau },
  'ruban-mesure':       { id: 'ruban-mesure', name: 'Ruban à mesurer', icon: '📏', category: 'mesure', price: 15, durability: 300, twoHanded: false, description: '5 mètres, blocage automatique.', build: buildRubanMesure },
  equerre:               { id: 'equerre', name: 'Équerre', icon: '📐', category: 'mesure', price: 14, durability: 260, twoHanded: false, description: 'Angle droit, traçage précis.', build: buildEquerre },
  pelle:                { id: 'pelle', name: 'Pelle', icon: '⛏️', category: 'jardinage', price: 28, durability: 220, jobHint: 'paysagiste', twoHanded: true, description: 'Lame acier, manche bois franc.', build: buildPelle },
  rateau:                { id: 'rateau', name: 'Râteau', icon: '🧹', category: 'jardinage', price: 20, durability: 200, jobHint: 'paysagiste', twoHanded: true, description: 'Ramassage de feuilles, 9 dents.', build: buildRateau },
  tondeuse:              { id: 'tondeuse', name: 'Tondeuse à gazon', icon: '🌱', category: 'jardinage', price: 320, durability: 260, jobHint: 'paysagiste', twoHanded: true, description: 'Propulsée, bac à herbe amovible.', build: buildTondeuse },
  tronconneuse:          { id: 'tronconneuse', name: 'Tronçonneuse', icon: '🪚', category: 'jardinage', price: 380, durability: 200, jobHint: 'paysagiste', twoHanded: true, description: 'Coupe de bois, chaîne 16 pouces.', build: buildTronconneuse },
  'casque-securite':    { id: 'casque-securite', name: 'Casque de sécurité', icon: '⛑️', category: 'securite', price: 25, durability: 999, jobHint: 'construction', twoHanded: false, description: 'Norme CSA, obligatoire sur chantier.', build: buildCasqueSecurite },
  'gants-travail':      { id: 'gants-travail', name: 'Gants de travail', icon: '🧤', category: 'securite', price: 14, durability: 120, twoHanded: false, description: 'Cuir renforcé, poignet haute visibilité.', build: buildGantsTravail },
  extincteur:            { id: 'extincteur', name: 'Extincteur', icon: '🧯', category: 'securite', price: 60, durability: 999, twoHanded: true, description: 'Type ABC, obligatoire commerces/chantiers.', build: buildExtincteur },
  'gilet-securite':     { id: 'gilet-securite', name: 'Gilet de sécurité', icon: '🦺', category: 'securite', price: 18, durability: 150, jobHint: 'construction', twoHanded: false, description: 'Haute visibilité, bandes réfléchissantes.', build: buildGiletSecurite },
};

export const TOOL_IDS = Object.keys(TOOLS) as ToolId[];

// ── Points de préhension (essentiels pour l'accrochage main/animation) ─
//
// `primary`  : offset local (depuis l'origine du groupe) où se ferme la
//              main dominante — c'est ce point qu'on aligne sur l'os de
//              la main du personnage, PAS l'origine brute du groupe.
// `secondary`: offset pour la main d'appui (outils twoHanded uniquement).
// `restAngle`: rotation de repos suggérée (radians, axe X) pour un port
//              naturel à la ceinture/dans le dos quand l'outil est rangé.

export interface ToolGripPoints {
  primary: THREE.Vector3;
  secondary?: THREE.Vector3;
  restAngle?: number;
}

export const TOOL_GRIP_POINTS: Record<ToolId, ToolGripPoints> = {
  marteau:               { primary: new THREE.Vector3(0, 0.02, 0), restAngle: -0.3 },
  perceuse:              { primary: new THREE.Vector3(-0.03, -0.02, 0), secondary: new THREE.Vector3(0.12, 0.06, 0) },
  'scie-circulaire':     { primary: new THREE.Vector3(-0.03, 0.19, 0), secondary: new THREE.Vector3(0.1, 0.09, 0) },
  masse:                 { primary: new THREE.Vector3(0, 0.05, 0), secondary: new THREE.Vector3(0, 0.35, 0) },
  'boite-outils':        { primary: new THREE.Vector3(0, 0.2, 0) },
  echelle:               { primary: new THREE.Vector3(0, 0.9, 0.05) },
  'cle-molette':         { primary: new THREE.Vector3(0, 0.02, 0), restAngle: -0.4 },
  pince:                 { primary: new THREE.Vector3(0, 0.02, 0), restAngle: -0.4 },
  'cle-a-cliquet':       { primary: new THREE.Vector3(0, 0.02, 0), restAngle: -0.4 },
  chalumeau:             { primary: new THREE.Vector3(0, 0.02, 0), secondary: new THREE.Vector3(0, 0.12, 0) },
  tournevis:             { primary: new THREE.Vector3(0, 0.02, 0), restAngle: -0.35 },
  multimetre:            { primary: new THREE.Vector3(0, -0.05, 0) },
  'pince-amperemetrique': { primary: new THREE.Vector3(0, 0.02, 0) },
  'cle-a-tuyau':         { primary: new THREE.Vector3(0, 0.02, 0), secondary: new THREE.Vector3(0, 0.28, 0) },
  debouchoir:            { primary: new THREE.Vector3(0, 0.02, 0), secondary: new THREE.Vector3(0, 0.4, 0) },
  niveau:                { primary: new THREE.Vector3(0, 0.023, 0) },
  'ruban-mesure':        { primary: new THREE.Vector3(-0.02, 0, 0) },
  equerre:               { primary: new THREE.Vector3(0, 0.02, 0) },
  pelle:                 { primary: new THREE.Vector3(0, 0.55, 0), secondary: new THREE.Vector3(0, 0.86, 0) },
  rateau:                { primary: new THREE.Vector3(0, 0.55, 0), secondary: new THREE.Vector3(0, 0.9, 0) },
  tondeuse:              { primary: new THREE.Vector3(0, 0.6, -0.35), secondary: new THREE.Vector3(-0.12, 0.4, -0.15) },
  tronconneuse:          { primary: new THREE.Vector3(-0.1, 0.16, 0), secondary: new THREE.Vector3(-0.05, 0.07, 0) },
  'casque-securite':     { primary: new THREE.Vector3(0, -0.02, 0) },
  'gants-travail':       { primary: new THREE.Vector3(0, 0, 0) },
  extincteur:            { primary: new THREE.Vector3(0, 0.36, 0), secondary: new THREE.Vector3(0, 0.15, 0) },
  'gilet-securite':      { primary: new THREE.Vector3(0, 0.2, 0) },
};

// ── Requêtes utilitaires ─────────────────────────────────────────────

export function getToolsByCategory(cat: ToolCategory): ToolDef[] {
  return TOOL_IDS.map(id => TOOLS[id]).filter(t => t.category === cat);
}

export function getToolsByJob(jobHint: string): ToolDef[] {
  return TOOL_IDS.map(id => TOOLS[id]).filter(t => t.jobHint === jobHint);
}

/** Construit le modèle et le recentre pour que l'origine locale coïncide avec la préhension. */
export function buildToolMesh(id: ToolId): THREE.Group {
  const inner = TOOLS[id].build();
  const grip = TOOL_GRIP_POINTS[id].primary;
  inner.position.sub(grip);
  const pivot = new THREE.Group();
  pivot.name = `tool:${id}`;
  pivot.add(inner);
  return pivot;
}

/** Instancie un outil à une position/rotation donnée (inventaire, établi, ceinture). */
export function spawnTool(id: ToolId, position: THREE.Vector3, rotationY = 0): THREE.Group {
  const group = buildToolMesh(id);
  group.position.copy(position);
  group.rotation.y = rotationY;
  return group;
}

/** Attache l'outil à un point d'ancrage (main, ceinture, dos du personnage) — origine = préhension. */
export function attachToolTo(id: ToolId, anchor: THREE.Object3D, offset = new THREE.Vector3(), rotation = new THREE.Euler()): THREE.Group {
  const mesh = buildToolMesh(id);
  mesh.position.copy(offset);
  mesh.rotation.copy(rotation);
  anchor.add(mesh);
  return mesh;
}
