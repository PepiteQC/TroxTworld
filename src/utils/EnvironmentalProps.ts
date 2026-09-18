// ══════════════════════════════════════════════════════════════════════════════
// 📦 ETHERWORLD RP — SYSTÈME DE PROPS ENVIRONNEMENTAUX & SQDC
// Fichier : src/systems/EnvironmentalProps.ts
// PBR Three.js · Palette Québécoise · Objets Urbains, Nature & SQDC
// ══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────────

export type PropCategory = 'urban' | 'vegetation' | 'natural' | 'store';

export type EnvironmentalPropId =
  // Props Urbains (7)
  | 'poubelle-metal'
  | 'banc-bois'
  | 'poteau-eclairage'
  | 'cloture-metal'
  | 'cone-route'
  | 'boite-postale-canada'
  | 'panneau-route'
  // Props Végétation (3)
  | 'arbre-erable'
  | 'buisson-feuille'
  | 'fleur-marguerite'
  // Props Naturels (2)
  | 'roche-grande'
  | 'souche-arbre'
  // Props SQDC (6)
  | 'sqdc-storefront'
  | 'sqdc-counter'
  | 'sqdc-shelves'
  | 'sqdc-signage'
  | 'sqdc-legal-poster'
  | 'sqdc-logo';

export interface EnvironmentalPropDef {
  id: EnvironmentalPropId;
  name: string;
  category: PropCategory;
  destructible: boolean;
  health?: number;
  maxHealth?: number;
  price: number;
  description: string;
  dimensions?: { width: number; height: number; depth: number };
  builder: () => THREE.Group;
}

export interface PropUserData {
  propId: EnvironmentalPropId;
  destructible: boolean;
  health: number;
  maxHealth: number;
  takeDamage: (amount: number) => boolean; // retourne true si détruit
  onDestroy?: () => void;
}

// ─── PALETTE DE MATÉRIAUX PBR PARTAGÉS (OPTIMISATION GPU) ───────────────────

export const PBR_PALETTE = {
  // Métaux
  metalSteel: new THREE.MeshStandardMaterial({
    color: 0x6e767d,
    roughness: 0.45,
    metalness: 0.85,
  }),
  metalDark: new THREE.MeshStandardMaterial({
    color: 0x242729,
    roughness: 0.55,
    metalness: 0.8,
  }),
  metalRust: new THREE.MeshStandardMaterial({
    color: 0x8a4522,
    roughness: 0.92,
    metalness: 0.25,
  }),

  // Bois
  woodNatural: new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.78,
    metalness: 0.05,
  }),
  woodLight: new THREE.MeshStandardMaterial({
    color: 0xc9a77c,
    roughness: 0.65,
    metalness: 0.02,
  }),

  // Plastiques / Résines
  plasticBlackMatte: new THREE.MeshStandardMaterial({
    color: 0x181818,
    roughness: 0.88,
    metalness: 0.08,
  }),
  rubberBlack: new THREE.MeshStandardMaterial({
    color: 0x202020,
    roughness: 0.95,
    metalness: 0.0,
  }),

  // Couleurs Réglementaires Québécoises
  sqdcGreen: new THREE.MeshStandardMaterial({
    color: 0x1a5632, // Vert institutionnel SQDC
    roughness: 0.42,
    metalness: 0.12,
  }),
  canadaPostRed: new THREE.MeshStandardMaterial({
    color: 0xd81e05,
    roughness: 0.4,
    metalness: 0.2,
  }),
  coneOrange: new THREE.MeshStandardMaterial({
    color: 0xff5500,
    roughness: 0.5,
    metalness: 0.05,
  }),
  pureWhite: new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    roughness: 0.35,
    metalness: 0.1,
  }),
  warningYellow: new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    roughness: 0.4,
    metalness: 0.05,
  }),
  warningRed: new THREE.MeshStandardMaterial({
    color: 0xd61c1c,
    roughness: 0.3,
    metalness: 0.1,
  }),

  // Minéraux / Végétaux
  concreteGrey: new THREE.MeshStandardMaterial({
    color: 0x8c8f94,
    roughness: 0.92,
    metalness: 0.04,
  }),
  rockGranite: new THREE.MeshStandardMaterial({
    color: 0x62666a,
    roughness: 0.95,
    metalness: 0.05,
  }),
  foliageGreen: new THREE.MeshStandardMaterial({
    color: 0x2e6b2e,
    roughness: 0.85,
    metalness: 0.0,
  }),
  mapleFoliage: new THREE.MeshStandardMaterial({
    color: 0x3d7331,
    roughness: 0.8,
    metalness: 0.0,
  }),

  // Émissifs (Écrans & Luminaires)
  ledWarmLight: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff0cc,
    emissiveIntensity: 2.8,
    roughness: 0.2,
    metalness: 0.0,
  }),
  posScreenGaze: new THREE.MeshStandardMaterial({
    color: 0x0a1520,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  }),

  // Verre Physique Transparent
  glassClearPhysical: new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.94,
    opacity: 1.0,
    transparent: true,
    roughness: 0.06,
    ior: 1.52,
    thickness: 0.04,
    depthWrite: false,
  }),
};

// Utilitaire d'activation des ombres sur un groupe
function enableShadows(group: THREE.Group): THREE.Group {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

// ─── BUILDERS GÉOMÉTRIQUES ───────────────────────────────────────────────────

// 1. POUBELLE MÉTAL (MTL Style)
function buildPoubelleMetal(): THREE.Group {
  const g = new THREE.Group();
  // Fût principal
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.26, 0.85, 20),
    PBR_PALETTE.metalSteel
  );
  body.position.y = 0.45;
  g.add(body);

  // Anneaux de renfort
  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.305, 0.015, 8, 24),
    PBR_PALETTE.metalDark
  );
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 0.35;
  const ring2 = ring1.clone();
  ring2.position.y = 0.7;
  g.add(ring1, ring2);

  // Couvercle légèrement rouillé avec fente
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.12, 20),
    PBR_PALETTE.metalRust
  );
  lid.position.y = 0.9;
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.06, 0.08),
    PBR_PALETTE.plasticBlackMatte
  );
  slot.position.y = 0.9;
  g.add(lid, slot);

  // Socle fixation sol
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, 0.06, 16),
    PBR_PALETTE.metalDark
  );
  base.position.y = 0.03;
  g.add(base);

  return enableShadows(g);
}

// 2. BANC EN BOIS
function buildBancBois(): THREE.Group {
  const g = new THREE.Group();
  // Pieds latéraux métal noir
  const legGeo = new THREE.BoxGeometry(0.06, 0.45, 0.6);
  const leftLeg = new THREE.Mesh(legGeo, PBR_PALETTE.metalDark);
  leftLeg.position.set(-0.9, 0.225, 0);
  const rightLeg = new THREE.Mesh(legGeo, PBR_PALETTE.metalDark);
  rightLeg.position.set(0.9, 0.225, 0);
  g.add(leftLeg, rightLeg);

  // Lattes d'assise (bois naturel)
  const slatGeo = new THREE.BoxGeometry(1.9, 0.03, 0.1);
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(slatGeo, PBR_PALETTE.woodNatural);
    slat.position.set(0, 0.45, -0.18 + i * 0.12);
    g.add(slat);
  }

  // Dossier incliné
  const backGeo = new THREE.BoxGeometry(1.9, 0.03, 0.1);
  for (let j = 0; j < 3; j++) {
    const backSlat = new THREE.Mesh(backGeo, PBR_PALETTE.woodNatural);
    backSlat.rotation.x = -0.22;
    backSlat.position.set(0, 0.62 + j * 0.11, -0.22 - j * 0.03);
    g.add(backSlat);
  }

  return enableShadows(g);
}

// 3. LAMPADAIRE URBAIN 6M
function buildLampadaire(): THREE.Group {
  const g = new THREE.Group();
  // Socle béton
  const concreteBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.5),
    PBR_PALETTE.concreteGrey
  );
  concreteBase.position.y = 0.175;
  g.add(concreteBase);

  // Mât principal acier 6m
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.14, 5.8, 16),
    PBR_PALETTE.metalSteel
  );
  pole.position.y = 3.1;
  g.add(pole);

  // Bras courbé horizontal
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 1.4, 12),
    PBR_PALETTE.metalSteel
  );
  arm.rotation.z = Math.PI / 3;
  arm.position.set(0.55, 5.8, 0);
  g.add(arm);

  // Tête de luminaire LED
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.12, 0.3),
    PBR_PALETTE.metalDark
  );
  head.position.set(1.15, 6.15, 0);
  g.add(head);

  // Surface émissive LED
  const led = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.22),
    PBR_PALETTE.ledWarmLight
  );
  led.rotation.x = Math.PI / 2;
  led.position.set(1.15, 6.08, 0);
  g.add(led);

  // Source lumineuse intégrée
  const light = new THREE.PointLight(0xffeedd, 35, 18, 1.2);
  light.position.set(1.15, 5.9, 0);
  light.castShadow = true;
  light.shadow.mapSize.width = 512;
  light.shadow.mapSize.height = 512;
  g.add(light);

  return enableShadows(g);
}

// 4. CLÔTURE MÉTAL MODULAIRE
function buildClotureMetal(): THREE.Group {
  const g = new THREE.Group();
  // 3 Poteaux verticaux
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 12);
  [-1.2, 0, 1.2].forEach((x) => {
    const post = new THREE.Mesh(postGeo, PBR_PALETTE.metalSteel);
    post.position.set(x, 0.7, 0);
    // Tête de poteau pyramidale
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.08, 4),
      PBR_PALETTE.metalDark
    );
    cap.position.set(x, 1.44, 0);
    g.add(post, cap);
  });

  // 2 Rails horizontaux
  const railGeo = new THREE.BoxGeometry(2.5, 0.04, 0.04);
  const topRail = new THREE.Mesh(railGeo, PBR_PALETTE.metalSteel);
  topRail.position.set(0, 1.2, 0);
  const bottomRail = new THREE.Mesh(railGeo, PBR_PALETTE.metalSteel);
  bottomRail.position.set(0, 0.3, 0);
  g.add(topRail, bottomRail);

  // Barreaux verticaux
  const picketGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8);
  for (let x = -1.1; x <= 1.1; x += 0.16) {
    if (Math.abs(x) < 0.05 || Math.abs(x - 1.2) < 0.05 || Math.abs(x + 1.2) < 0.05) continue;
    const picket = new THREE.Mesh(picketGeo, PBR_PALETTE.metalSteel);
    picket.position.set(x, 0.75, 0);
    g.add(picket);
  }

  return enableShadows(g);
}

// 5. CÔNE DE ROUTE QUÉBÉCOIS
function buildConeRoute(): THREE.Group {
  const g = new THREE.Group();
  // Base lourde en caoutchouc noir
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.035, 0.42),
    PBR_PALETTE.rubberBlack
  );
  base.position.y = 0.0175;
  g.add(base);

  // Corps orange
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.17, 0.7, 16),
    PBR_PALETTE.coneOrange
  );
  cone.position.y = 0.38;
  g.add(cone);

  // Bande blanche réfléchissante
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.125, 0.18, 16),
    PBR_PALETTE.pureWhite
  );
  stripe.position.y = 0.42;
  g.add(stripe);

  return enableShadows(g);
}

// 6. BOÎTE POSTALE CANADA POST
function buildBoitePostale(): THREE.Group {
  const g = new THREE.Group();
  // Socle noir
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.15, 0.45),
    PBR_PALETTE.metalDark
  );
  base.position.y = 0.075;
  g.add(base);

  // Corps rouge officiel
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.85, 0.4),
    PBR_PALETTE.canadaPostRed
  );
  body.position.y = 0.575;
  g.add(body);

  // Toit arrondi
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16, 1, false, 0, Math.PI),
    PBR_PALETTE.canadaPostRed
  );
  roof.rotation.z = Math.PI / 2;
  roof.position.set(0, 1.0, 0);
  g.add(roof);

  // Fente à lettres et poignée
  const flap = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.08, 0.04),
    PBR_PALETTE.metalSteel
  );
  flap.position.set(0, 0.82, 0.21);
  g.add(flap);

  // Bande blanche emblématique Canada Post
  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.1, 0.01),
    PBR_PALETTE.pureWhite
  );
  badge.position.set(0, 0.62, 0.205);
  g.add(badge);

  return enableShadows(g);
}

// 7. PANNEAU DE ROUTE
function buildPanneauRoute(): THREE.Group {
  const g = new THREE.Group();
  // Poteau tubulaire galvanisé
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.5, 12),
    PBR_PALETTE.metalSteel
  );
  post.position.y = 1.25;
  g.add(post);

  // Plaque octogonale / carrée blanche bordure rouge
  const signBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.64, 0.03),
    PBR_PALETTE.metalDark
  );
  signBack.position.set(0, 2.1, 0.04);
  const signRedBorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.01),
    PBR_PALETTE.warningRed
  );
  signRedBorder.position.set(0, 2.1, 0.06);
  const signWhiteFace = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.01),
    PBR_PALETTE.pureWhite
  );
  signWhiteFace.position.set(0, 2.1, 0.07);

  g.add(signBack, signRedBorder, signWhiteFace);
  return enableShadows(g);
}

// 8. ÉRABLE QUÉBÉCOIS (3M)
function buildArbreErable(): THREE.Group {
  const g = new THREE.Group();
  // Tronc conique naturel
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.22, 1.8, 10),
    PBR_PALETTE.woodNatural
  );
  trunk.position.y = 0.9;
  g.add(trunk);

  // Feuillage : sphère aplatie ~1.2m
  const foliageGeo = new THREE.DodecahedronGeometry(1.2, 1);
  const foliage = new THREE.Mesh(foliageGeo, PBR_PALETTE.mapleFoliage);
  foliage.scale.set(1.25, 0.95, 1.2);
  foliage.position.y = 2.4;
  g.add(foliage);

  // Sous-masse de feuillage pour relief organique
  const subFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 1), PBR_PALETTE.foliageGreen);
  subFoliage.position.set(0.4, 2.7, 0.3);
  g.add(subFoliage);

  return enableShadows(g);
}

// 9. BUISSON FEUILLU COMPACT (0.9M)
function buildBuissonFeuillu(): THREE.Group {
  const g = new THREE.Group();
  const baseCluster = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55, 1),
    PBR_PALETTE.foliageGreen
  );
  baseCluster.scale.set(1.2, 0.85, 1.1);
  baseCluster.position.y = 0.45;
  g.add(baseCluster);

  const cluster2 = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.38, 1),
    PBR_PALETTE.mapleFoliage
  );
  cluster2.position.set(-0.25, 0.4, 0.2);
  const cluster3 = cluster2.clone();
  cluster3.position.set(0.3, 0.35, -0.15);
  g.add(cluster2, cluster3);

  return enableShadows(g);
}

// 10. FLEUR MARGUERITE
function buildFleurMarguerite(): THREE.Group {
  const g = new THREE.Group();
  // Tige
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.25, 6),
    PBR_PALETTE.foliageGreen
  );
  stem.position.y = 0.125;
  g.add(stem);

  // Cœur doré
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12),
    PBR_PALETTE.warningYellow
  );
  center.position.y = 0.26;
  g.add(center);

  // 8 Pétales jaunes/blanches réparties
  const petalGeo = new THREE.BoxGeometry(0.02, 0.005, 0.07);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const petal = new THREE.Mesh(petalGeo, PBR_PALETTE.warningYellow);
    petal.position.set(Math.sin(angle) * 0.06, 0.255, Math.cos(angle) * 0.06);
    petal.rotation.y = angle;
    g.add(petal);
  }

  return enableShadows(g);
}

// 11. ROCHE GRANDE (Icosaèdre bruité)
function buildRocheGrande(): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1.2, 1);

  // Déformation bruitée déterministe des vertex
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const noise = Math.sin(vx * 4) * Math.cos(vz * 4) * 0.15;
    pos.setXYZ(i, vx + noise, vy * 0.75 + noise, vz + noise);
  }
  geo.computeVertexNormals();

  const rock = new THREE.Mesh(geo, PBR_PALETTE.rockGranite);
  rock.position.y = 0.6;
  rock.rotation.set(0.4, 0.8, 0.2);
  g.add(rock);

  return enableShadows(g);
}

// 12. SOUCHE D'ARBRE
function buildSoucheArbre(): THREE.Group {
  const g = new THREE.Group();
  // Écorce externe
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.48, 0.45, 14),
    PBR_PALETTE.woodNatural
  );
  stump.position.y = 0.225;
  g.add(stump);

  // Cœur avec anneaux
  const topCut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.02, 14),
    PBR_PALETTE.woodLight
  );
  topCut.position.y = 0.445;
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.01, 4, 14),
    PBR_PALETTE.woodNatural
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.455;

  g.add(topCut, innerRing);
  return enableShadows(g);
}

// 13. FAÇADE SQDC (4m large × 2.5m haut × 0.2m profond)
function buildSqdcStorefront(): THREE.Group {
  const g = new THREE.Group();
  // Structure supérieure et cadre vert SQDC (#1A5632)
  const header = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.6, 0.2),
    PBR_PALETTE.sqdcGreen
  );
  header.position.set(0, 2.2, 0);

  const leftPillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.9, 0.2),
    PBR_PALETTE.sqdcGreen
  );
  leftPillar.position.set(-1.8, 0.95, 0);

  const rightPillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.9, 0.2),
    PBR_PALETTE.sqdcGreen
  );
  rightPillar.position.set(1.8, 0.95, 0);

  g.add(header, leftPillar, rightPillar);

  // 2 Vitrines transparentes (verre physique)
  const windowGeo = new THREE.BoxGeometry(1.05, 1.7, 0.03);
  const windowLeft = new THREE.Mesh(windowGeo, PBR_PALETTE.glassClearPhysical);
  windowLeft.position.set(-0.95, 0.95, 0);

  const windowRight = new THREE.Mesh(windowGeo, PBR_PALETTE.glassClearPhysical);
  windowRight.position.set(0.95, 0.95, 0);
  g.add(windowLeft, windowRight);

  // Porte centrale noire minimaliste
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.85, 0.1),
    PBR_PALETTE.metalDark
  );
  doorFrame.position.set(0, 0.925, 0);

  const doorLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.78, 0.04),
    PBR_PALETTE.plasticBlackMatte
  );
  doorLeaf.position.set(0, 0.91, 0.02);

  // Poignée métal
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8),
    PBR_PALETTE.metalSteel
  );
  handle.position.set(0.35, 0.95, 0.06);
  g.add(doorFrame, doorLeaf, handle);

  // Médaillon Logo SQDC sur la façade
  const logoSign = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24),
    PBR_PALETTE.pureWhite
  );
  logoSign.rotation.x = Math.PI / 2;
  logoSign.position.set(0, 2.2, 0.11);
  const logoInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.035, 24),
    PBR_PALETTE.sqdcGreen
  );
  logoInner.rotation.x = Math.PI / 2;
  logoInner.position.set(0, 2.2, 0.115);
  g.add(logoSign, logoInner);

  return enableShadows(g);
}

// 14. COMPTOIR SQDC
function buildSqdcCounter(): THREE.Group {
  const g = new THREE.Group();
  // Surface bois clair
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.08, 0.8),
    PBR_PALETTE.woodLight
  );
  top.position.set(0, 0.96, 0);

  // Piétement métal noir & caisson
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.88, 0.92, 0.72),
    PBR_PALETTE.metalDark
  );
  base.position.set(0, 0.46, 0);
  g.add(top, base);

  // Terminal de paiement (boîtier noir + écran bleu émissif)
  const posTerminal = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.1, 0.24),
    PBR_PALETTE.plasticBlackMatte
  );
  posTerminal.rotation.x = 0.25;
  posTerminal.position.set(0.4, 1.05, 0.1);

  const posScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.12),
    PBR_PALETTE.posScreenGaze
  );
  posScreen.rotation.x = -Math.PI / 2 + 0.25;
  posScreen.position.set(0.4, 1.11, 0.11);
  g.add(posTerminal, posScreen);

  // Scanner code-barres
  const scannerHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.02, 0.16, 8),
    PBR_PALETTE.plasticBlackMatte
  );
  scannerHandle.rotation.z = -0.4;
  scannerHandle.position.set(-0.5, 1.05, 0.1);
  const scannerHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.05, 0.09),
    PBR_PALETTE.metalDark
  );
  scannerHead.position.set(-0.46, 1.13, 0.1);
  g.add(scannerHandle, scannerHead);

  return enableShadows(g);
}

// 15. ÉTAGÈRES SQDC
function buildSqdcShelves(): THREE.Group {
  const g = new THREE.Group();
  // Montants métalliques noirs
  const postGeo = new THREE.BoxGeometry(0.04, 1.9, 0.38);
  const leftPost = new THREE.Mesh(postGeo, PBR_PALETTE.metalDark);
  leftPost.position.set(-0.7, 0.95, 0);
  const rightPost = new THREE.Mesh(postGeo, PBR_PALETTE.metalDark);
  rightPost.position.set(0.7, 0.95, 0);
  g.add(leftPost, rightPost);

  // 3 Niveaux bois clair
  const shelfGeo = new THREE.BoxGeometry(1.4, 0.04, 0.36);
  [0.45, 0.95, 1.45].forEach((y, lvl) => {
    const shelf = new THREE.Mesh(shelfGeo, PBR_PALETTE.woodLight);
    shelf.position.set(0, y, 0);
    g.add(shelf);

    // Boîtes de produits (emballage neutre québécois conforme)
    const boxMat = lvl === 0 ? PBR_PALETTE.sqdcGreen : lvl === 1 ? PBR_PALETTE.pureWhite : PBR_PALETTE.plasticBlackMatte;
    [-0.4, 0, 0.4].forEach((xOffset) => {
      const pBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), boxMat);
      pBox.position.set(xOffset, y + 0.08, 0);
      g.add(pBox);
    });
  });

  return enableShadows(g);
}

// 16. PANNEAU INFORMATIF SQDC
function buildSqdcSignage(): THREE.Group {
  const g = new THREE.Group();
  // Cadre arrière vert SQDC
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.04),
    PBR_PALETTE.sqdcGreen
  );
  frame.position.y = 1.4;

  // Panneau blanc intérieur
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 0.72, 0.02),
    PBR_PALETTE.pureWhite
  );
  face.position.set(0, 1.4, 0.02);

  // Barre d'en-tête verte
  const headerBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.12, 0.01),
    PBR_PALETTE.sqdcGreen
  );
  headerBar.position.set(0, 1.66, 0.03);

  g.add(frame, face, headerBar);
  return enableShadows(g);
}

// 17. AFFICHE LÉGALE SQDC
function buildSqdcLegalPoster(): THREE.Group {
  const g = new THREE.Group();
  // Cadre noir fin
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.85, 0.02),
    PBR_PALETTE.metalDark
  );
  board.position.y = 1.4;

  // Affiche blanche
  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.81, 0.01),
    PBR_PALETTE.pureWhite
  );
  paper.position.set(0, 1.4, 0.01);

  // Triangle d'avertissement rouge réglementaire
  const triangle = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.16, 3),
    PBR_PALETTE.warningRed
  );
  triangle.rotation.z = Math.PI;
  triangle.position.set(0, 1.65, 0.02);

  // Bandes simulées de texte
  for (let i = 0; i < 4; i++) {
    const textLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.025, 0.005),
      PBR_PALETTE.plasticBlackMatte
    );
    textLine.position.set(0, 1.48 - i * 0.07, 0.02);
    g.add(textLine);
  }

  g.add(board, paper, triangle);
  return enableShadows(g);
}

// 18. LOGO MURAL SQDC (Cercle vert + Torus + Flèche)
function buildSqdcLogo(): THREE.Group {
  const g = new THREE.Group();
  // Cercle de fond vert
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.04, 32),
    PBR_PALETTE.sqdcGreen
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 1.5;
  g.add(disc);

  // Torus blanc (cercle ouvert stylisé)
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.04, 16, 32, Math.PI * 1.6),
    PBR_PALETTE.pureWhite
  );
  torus.position.set(0, 1.5, 0.03);
  g.add(torus);

  // Flèche géométrique blanche
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.22, 3),
    PBR_PALETTE.pureWhite
  );
  arrow.rotation.z = -Math.PI / 4;
  arrow.position.set(0.18, 1.5, 0.035);
  g.add(arrow);

  return enableShadows(g);
}

// ─── CATALOGUE GLOBAL DES PROPS ──────────────────────────────────────────────

export const ENVIRONMENTAL_PROPS: Record<EnvironmentalPropId, EnvironmentalPropDef> = {
  // 📦 Urbains
  'poubelle-metal': {
    id: 'poubelle-metal',
    name: 'Poubelle Métal',
    category: 'urban',
    destructible: true,
    health: 50,
    maxHealth: 50,
    price: 150,
    description: 'Poubelle municipale cylindrique avec couvercle rouillé',
    builder: buildPoubelleMetal,
  },
  'banc-bois': {
    id: 'banc-bois',
    name: 'Banc en Bois',
    category: 'urban',
    destructible: false,
    price: 300,
    description: 'Banc classique parc (bois + métal, dossier incliné)',
    builder: buildBancBois,
  },
  'poteau-eclairage': {
    id: 'poteau-eclairage',
    name: 'Lampadaire',
    category: 'urban',
    destructible: false,
    price: 800,
    description: 'Poteau urbain 6m avec luminaire LED émissif',
    builder: buildLampadaire,
  },
  'cloture-metal': {
    id: 'cloture-metal',
    name: 'Clôture Métal',
    category: 'urban',
    destructible: true,
    health: 100,
    maxHealth: 100,
    price: 500,
    description: 'Clôture modulaire (3 poteaux + 2 niveaux de rails)',
    builder: buildClotureMetal,
  },
  'cone-route': {
    id: 'cone-route',
    name: 'Cône de Route',
    category: 'urban',
    destructible: true,
    health: 30,
    maxHealth: 30,
    price: 50,
    description: 'Cône orange/blanc signalisation (léger, basse durabilité)',
    builder: buildConeRoute,
  },
  'boite-postale-canada': {
    id: 'boite-postale-canada',
    name: 'Boîte Postale Canada Post',
    category: 'urban',
    destructible: false,
    price: 200,
    description: 'Boîte aux lettres officielle rouge + plaque Canada',
    builder: buildBoitePostale,
  },
  'panneau-route': {
    id: 'panneau-route',
    name: 'Panneau de Route',
    category: 'urban',
    destructible: false,
    price: 400,
    description: 'Panneau blanc/rouge encadré en métal',
    builder: buildPanneauRoute,
  },

  // 🌳 Végétation
  'arbre-erable': {
    id: 'arbre-erable',
    name: 'Érable Québécois',
    category: 'vegetation',
    destructible: false,
    price: 600,
    description: 'Hauteur : 3m | Feuillage : 1.2m sphère légèrement aplatie',
    builder: buildArbreErable,
  },
  'buisson-feuille': {
    id: 'buisson-feuille',
    name: 'Buisson Feuillu',
    category: 'vegetation',
    destructible: false,
    price: 150,
    description: 'Compact (0.9m hauteur)',
    builder: buildBuissonFeuillu,
  },
  'fleur-marguerite': {
    id: 'fleur-marguerite',
    name: 'Marguerite',
    category: 'vegetation',
    destructible: false,
    price: 25,
    description: '8 pétales jaunes + cœur doré',
    builder: buildFleurMarguerite,
  },

  // ⛰️ Naturels
  'roche-grande': {
    id: 'roche-grande',
    name: 'Roche Grande',
    category: 'natural',
    destructible: false,
    price: 100,
    description: 'Icosaèdre bruitée (rotation aléatoire)',
    builder: buildRocheGrande,
  },
  'souche-arbre': {
    id: 'souche-arbre',
    name: "Souche d'Arbre",
    category: 'natural',
    destructible: false,
    price: 80,
    description: 'Anneaux de croissance texturés',
    builder: buildSoucheArbre,
  },

  // 🏪 Props SQDC
  'sqdc-storefront': {
    id: 'sqdc-storefront',
    name: 'Façade SQDC',
    category: 'store',
    destructible: false,
    price: 50000,
    dimensions: { width: 4.0, height: 2.5, depth: 0.2 },
    description: 'Façade vert SQDC (#1A5632), vitrines physiques, porte noire et logo',
    builder: buildSqdcStorefront,
  },
  'sqdc-counter': {
    id: 'sqdc-counter',
    name: 'Comptoir SQDC',
    category: 'store',
    destructible: false,
    price: 5000,
    description: 'Comptoir bois clair, pieds métal noir, terminal POS et scanner',
    builder: buildSqdcCounter,
  },
  'sqdc-shelves': {
    id: 'sqdc-shelves',
    name: 'Étagères SQDC',
    category: 'store',
    destructible: false,
    price: 3000,
    description: '3 niveaux bois clair, supports métal, 6 boîtes conformes',
    builder: buildSqdcShelves,
  },
  'sqdc-signage': {
    id: 'sqdc-signage',
    name: 'Panneau Informatif SQDC',
    category: 'store',
    destructible: false,
    price: 500,
    description: 'Panneau blanc avec bordure vert SQDC',
    builder: buildSqdcSignage,
  },
  'sqdc-legal-poster': {
    id: 'sqdc-legal-poster',
    name: 'Affiche Légale',
    category: 'store',
    destructible: false,
    price: 100,
    description: 'Affiche blanc réglementaire avec triangle rouge',
    builder: buildSqdcLegalPoster,
  },
  'sqdc-logo': {
    id: 'sqdc-logo',
    name: 'Logo Mural SQDC',
    category: 'store',
    destructible: false,
    price: 1000,
    description: 'Cercle vert, torus blanc et flèche géométrique',
    builder: buildSqdcLogo,
  },
};

// ─── APIS PRINCIPALES ────────────────────────────────────────────────────────

/**
 * Spawne une instance 3D d'un prop avec métadonnées et destruction
 */
export function spawnEnvironmentalProp(
  id: EnvironmentalPropId,
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  rotationY: number = 0
): THREE.Group {
  const def = ENVIRONMENTAL_PROPS[id];
  if (!def) {
    throw new Error(`[EnvironmentalProps] Prop ID inconnu: ${id}`);
  }

  const propInstance = def.builder();
  propInstance.position.copy(position);
  propInstance.rotation.y = rotationY;

  // Initialisation des données utilisateur (userData)
  const userData: PropUserData = {
    propId: id,
    destructible: def.destructible,
    health: def.health ?? 0,
    maxHealth: def.maxHealth ?? def.health ?? 0,
    takeDamage: (amount: number): boolean => {
      if (!userData.destructible) return false;
      userData.health = Math.max(0, userData.health - amount);
      if (userData.health <= 0) {
        if (userData.onDestroy) userData.onDestroy();
        propInstance.removeFromParent();
        return true; // Détruit
      }
      return false;
    },
  };

  propInstance.userData = userData;
  return propInstance;
}

/**
 * Retourne tous les props appartenant à une catégorie
 */
export function getPropsByCategory(cat: PropCategory): EnvironmentalPropDef[] {
  return Object.values(ENVIRONMENTAL_PROPS).filter((p) => p.category === cat);
}

/**
 * Construit un ensemble urbain / grille de props avec espacement régulier
 */
export function buildEnvironmentalDistrict(
  propIds: EnvironmentalPropId[],
  cols: number = 3,
  spacing: number = 2.5
): THREE.Group {
  const group = new THREE.Group();

  propIds.forEach((id, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const posX = (col - (cols - 1) / 2) * spacing;
    const posZ = row * spacing;

    const prop = spawnEnvironmentalProp(id, new THREE.Vector3(posX, 0, posZ));
    group.add(prop);
  });

  return group;
}