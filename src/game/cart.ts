import * as THREE from "three";

// --- 1. MATÉRIAUX PBR RÉALISTES ---
const chromeSteel = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  metalness: 1.0,
  roughness: 0.12,
  name: "caddie-chrome",
});

const darkRubber = new THREE.MeshStandardMaterial({
  color: 0x1c1d20,
  metalness: 0.0,
  roughness: 0.85,
  name: "caddie-rubber",
});

const redPlastic = new THREE.MeshStandardMaterial({
  color: 0xdc2626,
  metalness: 0.1,
  roughness: 0.4,
  name: "caddie-plastic-red",
});

const clearPlastic = new THREE.MeshPhysicalMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.45,
  roughness: 0.1,
  transmission: 0.9, // Effet de réfraction du plastique transparent
  thickness: 0.02,
  name: "caddie-plastic-clear",
});

const cardboardMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  roughness: 0.9,
  metalness: 0.0,
  name: "item-cardboard",
});

const metalCanMat = new THREE.MeshStandardMaterial({
  color: 0x9ca3af,
  metalness: 0.9,
  roughness: 0.2,
  name: "item-metal-can",
});

// --- 2. GÉOMÉTRIES PARTAGÉES POUR LES ARTICLES (Évite les fuites mémoire) ---
const boxGeometry = new THREE.BoxGeometry(0.14, 0.18, 0.08); // Boîte de céréales
const canGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12); // Conserve
const bottleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12); // Bouteille
const bottleCapGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8);

const ITEM_COLORS = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];

/**
 * Construit un caddie réaliste en fils d'acier 3D de A à Z.
 */
export function buildCaddie(): THREE.Group {
  const g = new THREE.Group();
  g.name = "caddie";

  // --- STRUCTURE PORTEUSE (CHÂSSIS EN TUBES ÉPAIS) ---
  const chassisRadius = 0.012;
  const chassisGroup = new THREE.Group();

  // Barres principales du châssis bas (forme de U)
  const leftBar = new THREE.Mesh(new THREE.CylinderGeometry(chassisRadius, chassisRadius, 0.7, 8), chromeSteel);
  leftBar.position.set(-0.21, 0.18, 0);
  leftBar.rotation.x = Math.PI / 2;
  leftBar.castShadow = true;
  chassisGroup.add(leftBar);

  const rightBar = leftBar.clone();
  rightBar.position.x = 0.21;
  chassisGroup.add(rightBar);

  const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(chassisRadius, chassisRadius, 0.42, 8), chromeSteel);
  crossBar.position.set(0, 0.18, -0.35);
  crossBar.rotation.z = Math.PI / 2;
  crossBar.castShadow = true;
  chassisGroup.add(crossBar);

  // Montants inclinés vers la poignée
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(chassisRadius, chassisRadius, 0.78, 8), chromeSteel);
    post.position.set(s * 0.21, 0.54, 0.32);
    post.rotation.x = -0.32; // Inclinaison vers l'arrière
    post.castShadow = true;
    chassisGroup.add(post);
  }
  g.add(chassisGroup);

  // --- PANIER GRILLAGÉ (FILS D'ACIER) ---
  const basketGroup = new THREE.Group();
  const wireRadius = 0.003; // Fils fins pour la grille

  // Cadre supérieur du panier (Tube plus épais)
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.015, 0.74), chromeSteel);
  topFrame.position.set(0, 0.68, 0);
  basketGroup.add(topFrame);

  // Grillage du fond du panier (Fils longitudinaux)
  for (let x = -0.22; x <= 0.22; x += 0.04) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(wireRadius, wireRadius, 0.7, 4), chromeSteel);
    wire.position.set(x, 0.36, 0);
    wire.rotation.x = Math.PI / 2;
    basketGroup.add(wire);
  }
  // Grillage du fond du panier (Fils transversaux)
  for (let z = -0.32; z <= 0.32; z += 0.06) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(wireRadius, wireRadius, 0.46, 4), chromeSteel);
    wire.position.set(0, 0.36, z);
    wire.rotation.z = Math.PI / 2;
    basketGroup.add(wire);
  }

  // Grillage des parois latérales (Gauche et Droite)
  for (const s of [-1, 1]) {
    // Fils horizontaux de côté
    for (let y = 0.38; y <= 0.66; y += 0.05) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(wireRadius, wireRadius, 0.7, 4), chromeSteel);
      wire.position.set(s * 0.24, y, 0);
      wire.rotation.x = Math.PI / 2;
      basketGroup.add(wire);
    }
    // Fils verticaux de côté
    for (let z = -0.32; z <= 0.32; z += 0.08) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(wireRadius, wireRadius, 0.32, 4), chromeSteel);
      wire.position.set(s * 0.24, 0.52, z);
      basketGroup.add(wire);
    }
  }

  // Grillage avant
  for (let y = 0.38; y <= 0.66; y += 0.05) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(wireRadius, wireRadius, 0.46, 4), chromeSteel);
    wire.position.set(0, y, -0.35);
    wire.rotation.z = Math.PI / 2;
    basketGroup.add(wire);
  }

  g.add(basketGroup);

  // --- POIGNÉE AVEC ATTACHES PLASTIQUE ---
  const handleGroup = new THREE.Group();
  
  // Embouts de fixation en plastique rouge
  for (const s of [-1, 1]) {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.08), redPlastic);
    mount.position.set(s * 0.22, 0.92, 0.42);
    handleGroup.add(mount);
  }

  // Barre transversale de la poignée (métal intérieur)
  const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 10), chromeSteel);
  handleBar.position.set(0, 0.92, 0.42);
  handleBar.rotation.z = Math.PI / 2;
  handleGroup.add(handleBar);

  // Revêtement plastique rouge rugueux
  const handleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 12), redPlastic);
  handleGrip.position.set(0, 0.92, 0.42);
  handleGrip.rotation.z = Math.PI / 2;
  handleGroup.add(handleGrip);

  g.add(handleGroup);

  // --- SIÈGE ENFANT (PLASTIQUE ROUGE + GRILLE) ---
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.02), redPlastic);
  seat.position.set(0, 0.52, 0.24);
  seat.rotation.x = 0.15;
  g.add(seat);

  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.15), redPlastic);
  seatBack.position.set(0, 0.6, 0.3);
  seatBack.rotation.x = -0.8;
  g.add(seatBack);

  // --- ROUES CASSTER PIVOTANTES (4 ROUES DÉTAILLÉES) ---
  const wheelOffsets: [number, number][] = [
    [-0.18, -0.24],
    [0.18, -0.24],
    [-0.18, 0.24],
    [0.18, 0.24],
  ];

  for (const [x, z] of wheelOffsets) {
    const wheelAssembly = new THREE.Group();
    wheelAssembly.position.set(x, 0.1, z);

    // Fourche métallique de support de roue (Chape de roulette)
    const fork = new THREE.Group();
    const forkTop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 8), chromeSteel);
    forkTop.position.y = 0.03;
    fork.add(forkTop);

    const forkLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.03), chromeSteel);
    forkLeftLeg.position.set(-0.022, 0, 0);
    fork.add(forkLeftLeg);

    const forkRightLeg = forkLeftLeg.clone();
    forkRightLeg.position.x = 0.022;
    fork.add(forkRightLeg);

    wheelAssembly.add(fork);

    // Jante en métal brillant (Hub)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.025, 10), chromeSteel);
    hub.rotation.z = Math.PI / 2;
    hub.position.y = -0.025;
    wheelAssembly.add(hub);

    // Pneu noir en vrai caoutchouc
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16), darkRubber);
    tire.rotation.z = Math.PI / 2;
    tire.position.y = -0.025;
    tire.castShadow = true;
    wheelAssembly.add(tire);

    g.add(wheelAssembly);
  }

  // --- GROUPE DES ARTICLES À L'INTÉRIEUR ---
  const fill = new THREE.Group();
  fill.name = "caddie-fill";
  fill.position.set(0, 0.37, 0); // Légèrement au-dessus du fond grillagé
  g.add(fill);

  return g;
}

/**
 * Remplit le caddie de manière hyper-réaliste avec des objets variés (Bouteilles, conserves, céréales)
 */
export function fillCaddie(group: THREE.Group, count: number) {
  const fill = group.getObjectByName("caddie-fill") as THREE.Group | undefined;
  if (!fill) return;

  // Nettoyage complet
  while (fill.children.length > 0) {
    const child = fill.children[0]!;
    fill.remove(child);
  }

  const n = Math.max(0, Math.min(15, count)); // Capacité maximale visuelle de 15 articles

  for (let i = 0; i < n; i++) {
    const type = i % 3; // Alterne entre Boîte, Conserve, Bouteille
    const itemGroup = new THREE.Group();
    const itemColor = ITEM_COLORS[i % ITEM_COLORS.length]!;

    if (type === 0) {
      // --- BOÎTE DE CÉRÉALES (Carton mat coloré) ---
      const mat = cardboardMat.clone();
      mat.color.setHex(itemColor);
      const box = new THREE.Mesh(boxGeometry, mat);
      box.castShadow = true;
      box.receiveShadow = true;
      itemGroup.add(box);

    } else if (type === 1) {
      // --- BOÎTE DE CONSERVE (Métal brillant) ---
      const can = new THREE.Mesh(canGeometry, metalCanMat);
      can.castShadow = true;
      can.receiveShadow = true;

      // Ajout d'une étiquette en papier imprimé au milieu
      const labelMat = new THREE.MeshStandardMaterial({ color: itemColor, roughness: 0.6 });
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.061, 0.061, 0.09, 12), labelMat);
      itemGroup.add(can);
      itemGroup.add(label);

    } else {
      // --- BOUTEILLE DE SODA/JUS (Plastique transparent) ---
      const bottle = new THREE.Mesh(bottleGeometry, clearPlastic);
      bottle.castShadow = true;

      // Niveau de liquide à l'intérieur (plus petit cylindre coloré)
      const liquidMat = new THREE.MeshStandardMaterial({ color: itemColor, roughness: 0.1 });
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.1, 10), liquidMat);
      liquid.position.y = -0.02;

      // Bouchon en plastique rouge
      const cap = new THREE.Mesh(bottleCapGeometry, redPlastic);
      cap.position.y = 0.09;

      itemGroup.add(bottle);
      itemGroup.add(liquid);
      itemGroup.add(cap);
    }

    // --- PLACEMENT PHYSIQUE ET ROTATION NATURELLE (Pas d'alignement parfait) ---
    const col = (i % 3) - 1; // Axe X (-1, 0, 1)
    const row = Math.floor(i / 3) % 2; // Axe Z (0, 1)
    const layer = Math.floor(i / 6); // Hauteur (Axe Y)

    // Petite perturbation aléatoire pour simuler le désordre naturel des courses
    const jitterX = (Math.random() - 0.5) * 0.04;
    const jitterZ = (Math.random() - 0.5) * 0.06;

    itemGroup.position.set(
      col * 0.13 + jitterX,
      0.08 + layer * 0.12,
      row * 0.22 - 0.1 + jitterZ
    );

    // Orientations légèrement aléatoires pour chaque produit (couché ou de travers)
    itemGroup.rotation.y = (Math.random() - 0.5) * 0.5;
    if (i % 5 === 0) {
      itemGroup.rotation.x = Math.PI / 2; // Certains produits sont couchés
    } else {
      itemGroup.rotation.x = (Math.random() - 0.5) * 0.15;
    }
    itemGroup.rotation.z = (Math.random() - 0.5) * 0.15;

    fill.add(itemGroup);
  }
}