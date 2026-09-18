// src/world/Route138ImmersiveWorld.ts
// ═══════════════════════════════════════════════════════════════════════════
// ETHERWORLD RP — LA ROUTE 138 DU COMTÉ DE PORTNEUF & QUÉBEC
// ÉCHELLE NATURELLE NON COMPRESSÉE • VRAI ROAD TRIP RURAL QUÉBÉCOIS
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

export interface HubLocation {
  id: string;
  name: string;
  subtitle: string;
  pos: THREE.Vector3;
  color: string;
  icon: string;
  description: string;
}

export const ROUTE138_HUBS: HubLocation[] = [
  {
    id: 'saint_casimir',
    name: 'Saint-Casimir',
    subtitle: 'Marmites de géants & Pont de Fer',
    pos: new THREE.Vector3(-4800, 2, -1400),
    color: '#38bdf8',
    icon: '🌉',
    description: 'Bourg patrimonial traversé par la rivière Sainte-Anne, réputé pour son pont de fer et ses cavernes du Trou du Diable.',
  },
  {
    id: 'saint_marc',
    name: 'Saint-Marc-des-Carrières',
    subtitle: 'Capitale du Calcaire',
    pos: new THREE.Vector3(-3400, 2, -900),
    color: '#94a3b8',
    icon: '⛏️',
    description: 'Centre minier et industriel réputé mondialement pour sa pierre calcaire grise de haute qualité et ses carrières monumentales.',
  },
  {
    id: 'saint_alban',
    name: 'Saint-Alban',
    subtitle: 'Gorges & Canyon de la Sainte-Anne',
    pos: new THREE.Vector3(-3600, 3, -3200),
    color: '#10b981',
    icon: '🌲',
    description: 'Territoire sauvage de rivières tumultueuses, falaises rocheuses, chalets en bois rond et immenses forêts de conifères.',
  },
  {
    id: 'deschambault',
    name: 'Deschambault-Grondines',
    subtitle: 'Chemin du Roy & Vieux Moulin 1674',
    pos: new THREE.Vector3(-2400, 2, 220),
    color: '#f59e0b',
    icon: '🌾',
    description: 'Joyau patrimonial perché sur un cap rocheux surplombant le fleuve Saint-Laurent avec son moulin tricentenaire.',
  },
  {
    id: 'portneuf',
    name: 'Portneuf',
    subtitle: 'Cœur Maritime, Grand Quai & Phare',
    pos: new THREE.Vector3(0, 2, 0),
    color: '#06b6d4',
    icon: '⚓',
    description: 'Ville portuaire au cœur du comté, quai s’avançant de 1 km dans les marées du fleuve et marinas pittoresques.',
  },
  {
    id: 'pont_rouge',
    name: 'Pont-Rouge',
    subtitle: 'La Rivière Jacques-Cartier & Le Pont Rouge',
    pos: new THREE.Vector3(2600, 2, -1200),
    color: '#ef4444',
    icon: '🏛️',
    description: 'Ville dynamique bâtie autour des gorges de la Jacques-Cartier, du Moulin Marcoux et de son célèbre pont rouge.',
  },
  {
    id: 'saint_raymond',
    name: 'Saint-Raymond',
    subtitle: 'Portail Vallée Bras-du-Nord & Motoneige',
    pos: new THREE.Vector3(2200, 3, -4800),
    color: '#8b5cf6',
    icon: '❄️',
    description: 'Capitale du plein air laurentien, porte de la réserve faunique, érablières réputées et paradis de la motoneige.',
  },
  {
    id: 'quebec',
    name: 'Québec',
    subtitle: 'Capitale-Nationale • Cap-Diamant',
    pos: new THREE.Vector3(7200, 3, 350),
    color: '#eab308',
    icon: '⚜️',
    description: 'Métropole historique au riche héritage, couronnée par les remparts de la Haute-Ville, le Château Frontenac et le fleuve.',
  },
];

export class Route138ImmersiveWorld {
  public root: THREE.Group;
  public animatedWindmillSails: THREE.Group | null = null;
  public animatedLighthouseBeam: THREE.Group | null = null;
  public riverSurfaces: THREE.Mesh[] = [];
  public roadsideSignMeshes: THREE.Group[] = [];

  // PBR materials cache
  private materials: Record<string, THREE.Material> = {};
  private textures: Record<string, THREE.Texture> = {};

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'route138_immersive_world';
    this.initMaterials();
    this.buildWorld();
  }

  private initMaterials() {
    const createAsphaltTex = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#1c1f24';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 25000; i++) {
        const shade = 25 + Math.random() * 18;
        ctx.fillStyle = `rgba(${shade},${shade + 2},${shade + 4}, 0.14)`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 60);
      return tex;
    };

    const createGravelTex = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#6b583f';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 15000; i++) {
        const s = 90 + Math.random() * 50;
        ctx.fillStyle = `rgba(${s},${s - 10},${s - 25}, 0.25)`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 40);
      return tex;
    };

    this.textures.asphalt = createAsphaltTex();
    this.textures.gravel = createGravelTex();

    this.materials.asphalt = new THREE.MeshStandardMaterial({
      map: this.textures.asphalt,
      roughness: 0.85,
      metalness: 0.1,
      color: 0x22252a,
    });

    this.materials.gravelRoad = new THREE.MeshStandardMaterial({
      map: this.textures.gravel,
      roughness: 0.95,
      color: 0x8a7051,
    });

    this.materials.yellowLine = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.materials.whiteLine = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    this.materials.guardrail = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.85, roughness: 0.3 });
    this.materials.hydroSteel = new THREE.MeshStandardMaterial({ color: 0x828b94, metalness: 0.8, roughness: 0.4 });
    this.materials.woodUtility = new THREE.MeshStandardMaterial({ color: 0x452311, roughness: 0.95 });
    this.materials.woodFence = new THREE.MeshStandardMaterial({ color: 0x5c3818, roughness: 0.95 });
    this.materials.stoneHeritage = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
    this.materials.redBarn = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
    this.materials.roofTin = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.65, roughness: 0.35 });
    this.materials.water = new THREE.MeshStandardMaterial({
      color: 0x1e4b6e,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    this.materials.pineFoliage = new THREE.MeshStandardMaterial({ color: 0x143e26, roughness: 0.8 });
    this.materials.mapleFoliage = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 });
    this.materials.birchTrunk = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
    this.materials.redBridgeMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
    this.materials.limestoneBlock = new THREE.MeshStandardMaterial({ color: 0xc4c7cc, roughness: 0.95 });
    this.materials.cornField = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.9 });
    this.materials.hayBale = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    this.materials.hayPlastic = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
  }

  private buildWorld() {
    // 1. Le vaste Fleuve Saint-Laurent longeant la 138 au sud
    this.buildSaintLaurentRiver();

    // 2. Réseau routier sans compression d'échelle (Route 138, 354, 363, 365, Rangs ruraux)
    this.buildHighwaysAndRangs();

    // 3. Infrastructure MTQ & Ligne de transport d'Hydro-Québec (Pylônes 735 kV & Poteaux de bois)
    this.buildHighwayInfrastructure();

    // 4. Les 8 Hubs Régionaux majeurs
    this.buildSaintCasimirHub();
    this.buildSaintMarcHub();
    this.buildSaintAlbanHub();
    this.buildDeschambaultHub();
    this.buildPortneufHub();
    this.buildPontRougeHub();
    this.buildSaintRaymondHub();
    this.buildQuebecCityGateway();

    // 5. Bâtiments isolés le long de la Route (Station-service, Casse-croûte, Motel, Garage, Halte)
    this.buildIsolatedRoadsideStops();

    // 6. Campagne rurale, champs agricoles infinis, fossés, silos et granges
    this.buildAgriculturalCountry();

    // 7. Forêts boréales profondes et érablières de transition
    this.buildDeepBorealForests();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. LE FLEUVE SAINT-LAURENT
  // ──────────────────────────────────────────────────────────────────────────
  private buildSaintLaurentRiver() {
    const riverGeo = new THREE.PlaneGeometry(22000, 4200, 64, 16);
    riverGeo.rotateX(-Math.PI / 2);
    const river = new THREE.Mesh(riverGeo, this.materials.water);
    river.position.set(1000, 0.4, 2100);
    river.name = 'fleuve_saint_laurent_grand';
    this.riverSurfaces.push(river);
    this.root.add(river);

    // Îles fluviales herbeuses dans le Saint-Laurent
    const islandGeo = new THREE.CylinderGeometry(110, 150, 4, 16);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x3d6832, roughness: 0.9 });
    const islandCoords = [
      { x: -3800, z: 1400 },
      { x: -1800, z: 1200 },
      { x: 500, z: 1100 },
      { x: 2800, z: 1300 },
      { x: 5500, z: 1500 },
    ];
    islandCoords.forEach(c => {
      const isl = new THREE.Mesh(islandGeo, islandMat);
      isl.position.set(c.x, 1.4, c.z);
      this.root.add(isl);
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. RÉSEAU ROUTIER SANS COMPRESSION D'ÉCHELLE
  // ──────────────────────────────────────────────────────────────────────────
  private buildHighwaysAndRangs() {
    // A. ROUTE 138 (Chemin du Roy) : Sur plus de 15 kilomètres continus
    const r138Points = [
      new THREE.Vector3(-6200, 1.5, 340),  // Vers Grondines Ouest & Mauricie
      new THREE.Vector3(-4500, 1.8, 300),  // Jonction Saint-Casimir
      new THREE.Vector3(-3400, 2.0, 260),  // Sortie Saint-Marc
      new THREE.Vector3(-2400, 2.0, 220),  // Deschambault (Moulin de 1674)
      new THREE.Vector3(-1400, 2.2, 160),  // Secteur Halte & Station Pétro-Nord
      new THREE.Vector3(0, 2.0, 0),        // Portneuf Centre & Quai
      new THREE.Vector3(1200, 2.2, 70),    // Casse-Croûte Chez Ti-Guy
      new THREE.Vector3(2600, 2.4, 90),    // Cap-Santé / Donnacona
      new THREE.Vector3(4200, 2.5, 180),   // Neuville
      new THREE.Vector3(5800, 2.7, 240),   // Secteur Motel du Fleuve
      new THREE.Vector3(7600, 2.9, 360),   // Québec Entrée Métropolitaine
    ];
    this.createExtrudedRoad(new THREE.CatmullRomCurve3(r138Points), 12.0, 'Route 138 (Chemin du Roy)', false);

    // B. ROUTE 354 : Vers Saint-Casimir (Nord-Ouest)
    const r354Points = [
      new THREE.Vector3(-4500, 1.8, 300),
      new THREE.Vector3(-4600, 2.0, -400),
      new THREE.Vector3(-4800, 2.0, -1400), // Saint-Casimir (Pont de Fer)
    ];
    this.createExtrudedRoad(new THREE.CatmullRomCurve3(r354Points), 9.0, 'Route 354 Ouest', false);

    // C. ROUTE 363 : Deschambault -> Saint-Marc-des-Carrières -> Saint-Alban
    const r363Points = [
      new THREE.Vector3(-2400, 2.0, 220),   // Deschambault
      new THREE.Vector3(-2900, 2.0, -300),
      new THREE.Vector3(-3400, 2.0, -900),  // Saint-Marc-des-Carrières
      new THREE.Vector3(-3500, 2.5, -2000), // Rangs agricoles & carrières
      new THREE.Vector3(-3600, 3.0, -3200), // Saint-Alban
    ];
    this.createExtrudedRoad(new THREE.CatmullRomCurve3(r363Points), 9.0, 'Route 363 Nord', false);

    // D. ROUTE 365 : Donnacona -> Pont-Rouge -> Saint-Raymond (La Grande Route Nord)
    const r365Points = [
      new THREE.Vector3(2600, 2.4, 90),     // Jonction 138 Donnacona
      new THREE.Vector3(2600, 2.2, -500),
      new THREE.Vector3(2600, 2.0, -1200),  // Pont-Rouge (Pont Rouge & Jacques-Cartier)
      new THREE.Vector3(2400, 2.6, -3000),  // Érablières & forêts denses
      new THREE.Vector3(2200, 3.0, -4800),  // Saint-Raymond (Vallée Bras-du-Nord)
    ];
    this.createExtrudedRoad(new THREE.CatmullRomCurve3(r365Points), 9.5, 'Route 365 Nord', false);

    // E. RANGS SECONDAIRES EN GRAVIER (Chemins de terre typiques du Québec)
    // 1. Rang Saint-Jacques (reliant Saint-Casimir et Saint-Marc à travers les champs)
    const rangStJacques = [
      new THREE.Vector3(-4800, 2.0, -1400),
      new THREE.Vector3(-4200, 2.0, -1100),
      new THREE.Vector3(-3400, 2.0, -900),
    ];
    this.createExtrudedRoad(new THREE.CatmullRomCurve3(rangStJacques), 7.0, 'Rang Saint-Jacques (Gravier)', true);

    // 2. Rang de la Montée des Carrières (reliant Saint-Marc à la 138)
    const rangCarrieres = [
      new THREE.Vector3(-3400, 2.0, -900),
      new THREE.Vector3(-3400, 2.0, 260),
    ];
    this.createExtrudedRoad(new THREE.CatmullRomCurve3(rangCarrieres), 7.0, 'Montée des Carrières (Gravier)', true);

    // 3. Rang des Érables (reliant Pont-Rouge vers l'est)
    const rangErables = [
      new THREE.Vector3(2600, 2.0, -1200),
      new THREE.Vector3(3800, 2.4, -1400),
      new THREE.Vector3(4600, 2.6, -1100),
    ];
    this.createExtrudedRoad(new THREE.CatmullRomCurve3(rangErables), 7.0, 'Rang des Érables (Gravier)', true);
  }

  private createExtrudedRoad(
    curve: THREE.CatmullRomCurve3,
    width: number,
    name: string,
    isGravel: boolean = false
  ) {
    const steps = 180;
    const points = curve.getPoints(steps);

    const roadGeom = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const fwd = i < points.length - 1
        ? points[i + 1].clone().sub(pt).normalize()
        : pt.clone().sub(points[i - 1]).normalize();
      const norm = new THREE.Vector3(-fwd.z, 0, fwd.x);

      const left = pt.clone().sub(norm.clone().multiplyScalar(width / 2));
      const right = pt.clone().add(norm.clone().multiplyScalar(width / 2));

      vertices.push(left.x, left.y + 0.05, left.z);
      vertices.push(right.x, right.y + 0.05, right.z);

      const v = i / 2;
      uvs.push(0, v, 1, v);

      if (i < points.length - 1) {
        const idx = i * 2;
        indices.push(idx, idx + 1, idx + 2);
        indices.push(idx + 1, idx + 3, idx + 2);
      }
    }

    roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeom.setIndex(indices);
    roadGeom.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeom, isGravel ? this.materials.gravelRoad : this.materials.asphalt);
    roadMesh.name = name;
    roadMesh.receiveShadow = true;
    this.root.add(roadMesh);

    // Fossés et accotements de chaque côté de la route
    for (let i = 0; i < points.length - 1; i += 3) {
      const pt = points[i];
      const fwd = points[i + 1].clone().sub(pt).normalize();
      const norm = new THREE.Vector3(-fwd.z, 0, fwd.x);

      if (!isGravel) {
        // Yellow center line dash
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 3.5), this.materials.yellowLine);
        dash.position.set(pt.x, pt.y + 0.07, pt.z);
        dash.rotation.y = Math.atan2(fwd.x, fwd.z);
        this.root.add(dash);

        // White edge lines
        const leftEdge = pt.clone().sub(norm.clone().multiplyScalar(width * 0.44));
        const rightEdge = pt.clone().add(norm.clone().multiplyScalar(width * 0.44));

        const wLineL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 3.8), this.materials.whiteLine);
        wLineL.position.set(leftEdge.x, pt.y + 0.07, leftEdge.z);
        wLineL.rotation.y = Math.atan2(fwd.x, fwd.z);

        const wLineR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 3.8), this.materials.whiteLine);
        wLineR.position.set(rightEdge.x, pt.y + 0.07, rightEdge.z);
        wLineR.rotation.y = Math.atan2(fwd.x, fwd.z);

        this.root.add(wLineL, wLineR);
      }

      // Fossés de drainage (drainage ditches) avec herbes hautes
      if (i % 6 === 0) {
        const ditchLeft = pt.clone().sub(norm.clone().multiplyScalar(width * 0.58));
        const ditchGeo = new THREE.BoxGeometry(1.6, 0.4, 6.0);
        const ditchMat = new THREE.MeshStandardMaterial({ color: 0x2b3d1f, roughness: 0.95 });
        const ditchMesh = new THREE.Mesh(ditchGeo, ditchMat);
        ditchMesh.position.set(ditchLeft.x, pt.y - 0.2, ditchLeft.z);
        ditchMesh.rotation.y = Math.atan2(fwd.x, fwd.z);
        this.root.add(ditchMesh);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. INFRASTRUCTURE ROUTIÈRE MTQ & HYDRO-QUÉBEC
  // ──────────────────────────────────────────────────────────────────────────
  private buildHighwayInfrastructure() {
    // A. LIGNES HYDRO-QUÉBEC 735 kV (Grands pylônes métalliques en treillis à 3 bras)
    // Couloir de servitude traversant toute la région d'ouest en est
    for (let x = -5500; x <= 7500; x += 320) {
      const zOffset = -2200 + Math.sin(x * 0.0004) * 400;
      const pylon = this.createHydroPylon735();
      pylon.position.set(x, 2, zOffset);
      this.root.add(pylon);
    }

    // B. POTEAUX ÉLECTRIQUES DE DISTRIBUTION RURALE EN BOIS (Spaced every 80m along Route 138)
    for (let x = -5800; x <= 7200; x += 85) {
      const zOffset = (x / 7200) * 160 + 12;
      const pole = this.createWoodUtilityPole();
      pole.position.set(x, 2, zOffset);
      this.root.add(pole);
    }

    // C. PANNEAUX MTQ OFFICIELS DE DESTINATION & DISTANCE
    this.createMTQSign(
      new THREE.Vector3(-4300, 2, 280),
      '138 EST',
      'DESCHAMBAULT 18 KM • PORTNEUF 42 KM • QUÉBEC 95 KM',
      'SORTIE 354 : SAINT-CASIMIR'
    );

    this.createMTQSign(
      new THREE.Vector3(-2250, 2, 205),
      'BIENVENUE À DESCHAMBAULT-GRONDINES',
      'CHEMIN DU ROY • COEUR DU PATRIMOINE SEIGNEURIAL',
      'VIEUX MOULIN À VENT DE 1674'
    );

    this.createMTQSign(
      new THREE.Vector3(-150, 2, 10),
      'PORTNEUF VILLE',
      'GRAND QUAI MUNICIPAL • PHARE DE PORTNEUF • MARINA',
      'SORTIE ROUTE 363 : ST-MARC / ST-ALBAN'
    );

    this.createMTQSign(
      new THREE.Vector3(2400, 2, 70),
      'JONCTION ROUTE 365 NORD',
      'PONT-ROUGE 14 KM • SAINT-RAYMOND 46 KM',
      'VALLÉE BRAS-DU-NORD • PARC NATUREL'
    );

    this.createMTQSign(
      new THREE.Vector3(6800, 2, 330),
      'BIENVENUE À QUÉBEC',
      'CAPITALE-NATIONALE • VILLE HISTORIQUE',
      'AUTOROUTE HENRI-IV • BD CHAMPLAIN'
    );

    // Panneaux danger traverse d'orignaux & chevreuils
    [-3800, -1800, 800, 2100, 4900].forEach(xPos => {
      const mooseSign = this.createWildlifeWarningSign();
      mooseSign.position.set(xPos, 2, (xPos / 6000) * 120 + 8);
      this.root.add(mooseSign);
    });
  }

  // Pylône à haute tension 735 kV en treillis d'acier
  private createHydroPylon735(): THREE.Group {
    const pylon = new THREE.Group();
    // Corps en treillis pyramidal
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 4.5, 32, 4),
      this.materials.hydroSteel
    );
    tower.position.y = 16;
    tower.rotation.y = Math.PI / 4;

    // Grande traverse horizontale
    const crossbeam = new THREE.Mesh(
      new THREE.BoxGeometry(26, 1.4, 1.4),
      this.materials.hydroSteel
    );
    crossbeam.position.y = 28;

    // Câbles haute tension suspendus (3 phases)
    for (const offset of [-11, 0, 11]) {
      const insulator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 2.5, 6),
        this.materials.roofTin
      );
      insulator.position.set(offset, 26.5, 0);
      pylon.add(insulator);
    }

    pylon.add(tower, crossbeam);
    return pylon;
  }

  // Poteau de bois avec transformateur cylindrique Hydro-Québec
  private createWoodUtilityPole(): THREE.Group {
    const pole = new THREE.Group();
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 11, 8),
      this.materials.woodUtility
    );
    mast.position.y = 5.5;

    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.15, 0.15),
      this.materials.woodUtility
    );
    cross.position.set(0, 10.2, 0);

    // Transformateur gris Hydro-Québec
    const transformer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 1.1, 8),
      this.materials.hydroSteel
    );
    transformer.position.set(0.45, 8.8, 0);

    pole.add(mast, cross, transformer);
    return pole;
  }

  private createMTQSign(pos: THREE.Vector3, title: string, subtitle: string, footer: string) {
    const group = new THREE.Group();
    group.position.copy(pos);

    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 384;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#0f5132';
    ctx.fillRect(0, 0, 1024, 384);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, 992, 352);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('⚜️ MTQ', 50, 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText(title, 220, 80);

    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(subtitle, 50, 190);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(footer, 50, 300);

    const tex = new THREE.CanvasTexture(c);
    const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });

    const board = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.5, 0.15), signMat);
    board.position.y = 3.6;

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.0, 8), this.materials.guardrail);
    postL.position.set(-2.4, 2.0, 0);

    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.0, 8), this.materials.guardrail);
    postR.position.set(2.4, 2.0, 0);

    group.add(board, postL, postR);
    this.roadsideSignMeshes.push(group);
    this.root.add(group);
  }

  private createWildlifeWarningSign(): THREE.Group {
    const group = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 240, 240);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦌', 128, 128);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), mat);
    board.rotation.z = Math.PI / 4;
    board.position.y = 2.4;

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), this.materials.guardrail);
    post.position.y = 1.3;

    group.add(board, post);
    return group;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. LES 8 HUBS RÉGIONAUX
  // ──────────────────────────────────────────────────────────────────────────

  // 1. Saint-Casimir
  private buildSaintCasimirHub() {
    const hub = new THREE.Group();
    hub.position.set(-4800, 2, -1400);
    hub.name = 'hub_saint_casimir';

    // Pont de Fer de Saint-Casimir (Truss bridge)
    const bridgeGroup = new THREE.Group();
    const length = 110;
    const width = 8.5;
    const trussH = 8.5;

    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.8, length), this.materials.asphalt);
    deck.position.y = 2.0;
    bridgeGroup.add(deck);

    for (const side of [-1, 1]) {
      const x = side * (width / 2);
      const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, length), this.materials.guardrail);
      topChord.position.set(x, 2.0 + trussH, 0);
      const botChord = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, length), this.materials.guardrail);
      botChord.position.set(x, 2.0, 0);
      bridgeGroup.add(topChord, botChord);

      for (let z = -length / 2; z <= length / 2; z += 10) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, trussH, 0.25), this.materials.guardrail);
        post.position.set(x, 2.0 + trussH / 2, z);
        bridgeGroup.add(post);
      }
    }
    hub.add(bridgeGroup);

    // Rivière Sainte-Anne
    const river = new THREE.Mesh(new THREE.BoxGeometry(70, 1, 240), this.materials.water);
    river.position.set(0, -0.5, 0);
    hub.add(river);

    // Église en pierre patrimoniale
    const church = this.createHeritageChurch();
    church.position.set(-50, 0, 60);
    hub.add(church);

    // Caverne du Trou du Diable
    const caveRock = new THREE.Mesh(new THREE.DodecahedronGeometry(14, 1), this.materials.stoneHeritage);
    caveRock.scale.set(1.5, 0.9, 1.3);
    caveRock.position.set(95, 4, -50);
    hub.add(caveRock);

    this.root.add(hub);
  }

  // 2. Saint-Marc-des-Carrières
  private buildSaintMarcHub() {
    const hub = new THREE.Group();
    hub.position.set(-3400, 2, -900);
    hub.name = 'hub_saint_marc';

    // Fosse d'extraction de calcaire
    const quarryPit = new THREE.Mesh(new THREE.BoxGeometry(180, 14, 140), this.materials.limestoneBlock);
    quarryPit.position.set(0, -7, 0);
    hub.add(quarryPit);

    // Blocs de calcaire taillés
    for (let i = 0; i < 24; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.8, 3.2), this.materials.limestoneBlock);
      block.position.set(35 + (i % 6) * 6, 1.4, -30 + Math.floor(i / 6) * 6);
      block.castShadow = true;
      hub.add(block);
    }

    // Grue d'extraction de carrière
    const crane = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.5, 32, 2.5), this.materials.guardrail);
    tower.position.y = 16;
    const boom = new THREE.Mesh(new THREE.BoxGeometry(44, 1.8, 1.8), this.materials.guardrail);
    boom.position.set(14, 31, 0);
    crane.add(tower, boom);
    crane.position.set(-45, 0, 25);
    hub.add(crane);

    this.root.add(hub);
  }

  // 3. Saint-Alban
  private buildSaintAlbanHub() {
    const hub = new THREE.Group();
    hub.position.set(-3600, 3, -3200);
    hub.name = 'hub_saint_alban';

    // Gorges rocheuses et canyon encaissé
    for (const side of [-1, 1]) {
      const cliff = new THREE.Mesh(new THREE.BoxGeometry(40, 28, 260), this.materials.stoneHeritage);
      cliff.position.set(side * 45, 12, 0);
      hub.add(cliff);
    }

    const gorgeRiver = new THREE.Mesh(new THREE.BoxGeometry(50, 1, 260), this.materials.water);
    gorgeRiver.position.set(0, -1, 0);
    hub.add(gorgeRiver);

    // Chalets en bois rond
    for (let i = 0; i < 8; i++) {
      const cabin = this.createLogCabin();
      cabin.position.set(-100 + (i % 2) * 45, 0, -100 + i * 35);
      hub.add(cabin);
    }

    this.root.add(hub);
  }

  // 4. Deschambault-Grondines
  private buildDeschambaultHub() {
    const hub = new THREE.Group();
    hub.position.set(-2400, 2, 220);
    hub.name = 'hub_deschambault_grondines';

    // Moulin à vent tricentenaire de 1674
    const mill = this.createHistoricWindmill();
    mill.position.set(45, 0, 130);
    hub.add(mill);

    // Belvédère d'observation du fleuve
    const gazebo = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 4.5, 8), this.materials.woodFence);
    gazebo.position.set(35, 2, 85);
    hub.add(gazebo);

    // Maisons seigneuriales ancestrales
    for (let i = 0; i < 9; i++) {
      const house = this.createAncestralHouse();
      house.position.set(-60 - i * 30, 0, -25 + (i % 2) * 18);
      hub.add(house);
    }

    this.root.add(hub);
  }

  // 5. Portneuf (Cœur Maritime)
  private buildPortneufHub() {
    const hub = new THREE.Group();
    hub.position.set(0, 2, 0);
    hub.name = 'hub_portneuf_center';

    // Grand Quai s'avançant dans le fleuve
    const pier = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 240), this.materials.stoneHeritage);
    pier.position.set(65, 0.5, 140);
    hub.add(pier);

    // Phare maritime avec faisceau rotatif
    const lighthouse = this.createLighthouse();
    lighthouse.position.set(65, 2, 260);
    hub.add(lighthouse);

    this.root.add(hub);
  }

  // 6. Pont-Rouge
  private buildPontRougeHub() {
    const hub = new THREE.Group();
    hub.position.set(2600, 2, -1200);
    hub.name = 'hub_pont_rouge';

    // Le Pont Rouge
    const redBridge = new THREE.Group();
    const bLen = 120;
    const bW = 9.5;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(bW, 0.8, bLen), this.materials.asphalt);
    deck.position.y = 3.0;

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.8, bLen), this.materials.redBridgeMat);
      wall.position.set(side * (bW / 2), 5.2, 0);
      redBridge.add(wall);
    }
    redBridge.add(deck);
    hub.add(redBridge);

    // Rivière Jacques-Cartier
    const jcRiver = new THREE.Mesh(new THREE.BoxGeometry(70, 1, 280), this.materials.water);
    jcRiver.position.set(0, -1.0, 0);
    hub.add(jcRiver);

    // Vieux Moulin Marcoux
    const mill = this.createAncestralHouse();
    mill.position.set(-50, 0, 35);
    hub.add(mill);

    this.root.add(hub);
  }

  // 7. Saint-Raymond
  private buildSaintRaymondHub() {
    const hub = new THREE.Group();
    hub.position.set(2200, 3, -4800);
    hub.name = 'hub_saint_raymond';

    // Grand pavillon de la Vallée Bras-du-Nord
    const lodge = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 20), this.materials.woodUtility);
    lodge.position.set(0, 6.0, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(24, 8, 4), this.materials.roofTin);
    roof.position.set(0, 16.0, 0);
    roof.rotation.y = Math.PI / 4;
    hub.add(lodge, roof);

    // Concessionnaire et motoneiges garées
    for (let s = 0; s < 4; s++) {
      const sled = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 3.2), this.materials.redBarn);
      sled.position.set(24 + s * 4, 0.5, 12);
      hub.add(sled);
    }

    this.root.add(hub);
  }

  // 8. Québec (Porte Métropolitaine)
  private buildQuebecCityGateway() {
    const hub = new THREE.Group();
    hub.position.set(7200, 3, 350);
    hub.name = 'hub_quebec_gateway';

    // Portique autoroutier MTQ
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(30, 1.4, 1.4), this.materials.guardrail);
    gantry.position.set(0, 9.0, 0);
    const postA = new THREE.Mesh(new THREE.BoxGeometry(1, 9.5, 1), this.materials.guardrail);
    postA.position.set(-14, 4.75, 0);
    const postB = new THREE.Mesh(new THREE.BoxGeometry(1, 9.5, 1), this.materials.guardrail);
    postB.position.set(14, 4.75, 0);
    hub.add(gantry, postA, postB);

    // Silhouette du Château Frontenac
    const skylineGroup = new THREE.Group();
    skylineGroup.position.set(500, 0, -250);
    const chateauBody = new THREE.Mesh(new THREE.BoxGeometry(80, 60, 50), this.materials.stoneHeritage);
    chateauBody.position.y = 30;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(16, 50, 8), this.materials.roofTin);
    spire.position.y = 80;
    skylineGroup.add(chateauBody, spire);

    hub.add(skylineGroup);
    this.root.add(hub);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. BÂTIMENTS ISOLÉS LE LONG DE LA 138 (STATIONS, CASSE-CROÛTES, MOTELS)
  // ──────────────────────────────────────────────────────────────────────────
  private buildIsolatedRoadsideStops() {
    // A. STATION-SERVICE PÉTRO-NORD & DÉPANNEUR DU RANG (X: -1400, Z: 180)
    const gasStation = new THREE.Group();
    gasStation.position.set(-1400, 2, 190);

    // Dépanneur
    const depBuilding = new THREE.Mesh(new THREE.BoxGeometry(18, 5.5, 14), this.materials.stoneHeritage);
    depBuilding.position.set(0, 2.75, -12);
    const depRoof = new THREE.Mesh(new THREE.BoxGeometry(19, 0.6, 15), this.materials.roofTin);
    depRoof.position.set(0, 5.8, -12);
    gasStation.add(depBuilding, depRoof);

    // Auvent au-dessus des pompes à essence
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 12), this.materials.roofTin);
    canopy.position.set(0, 6.0, 10);
    for (const cx of [-9, 9]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 8), this.materials.guardrail);
      pillar.position.set(cx, 3.0, 10);
      gasStation.add(pillar);
    }
    gasStation.add(canopy);

    // 4 Pompes à essence rouges
    for (const px of [-6, -2, 2, 6]) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), this.materials.redBarn);
      pump.position.set(px, 1.1, 10);
      gasStation.add(pump);
    }

    // Cage à bonbonnes de propane et cordes de bois de chauffage
    const propaneCage = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 1.6), this.materials.guardrail);
    propaneCage.position.set(-11, 1.1, -2);
    const firewoodStack = new THREE.Mesh(new THREE.BoxGeometry(5, 1.8, 2.0), this.materials.woodUtility);
    firewoodStack.position.set(11, 0.9, -2);
    gasStation.add(propaneCage, firewoodStack);

    this.root.add(gasStation);

    // B. CASSE-CROÛTE CHEZ TI-GUY (X: 1200, Z: 85)
    const snackBar = new THREE.Group();
    snackBar.position.set(1200, 2, 85);

    const hut = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 9), this.materials.redBarn);
    hut.position.y = 2.25;
    const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(10, 3.5, 4), this.materials.whiteLine);
    hutRoof.position.y = 6.25;
    hutRoof.rotation.y = Math.PI / 4;

    // Enseigne casse-croûte
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), this.materials.guardrail);
    signPost.position.set(-8, 3, 4);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 0.1), this.materials.yellowLine);
    signBoard.position.set(-8, 5.5, 4);

    // Tables de pique-nique extérieures
    for (let t = 0; t < 3; t++) {
      const table = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 1.8), this.materials.woodFence);
      table.position.set(8 + t * 4, 0.5, 6);
      snackBar.add(table);
    }

    snackBar.add(hut, hutRoof, signPost, signBoard);
    this.root.add(snackBar);

    // C. MOTEL DU FLEUVE (X: 5600, Z: 220)
    const motel = new THREE.Group();
    motel.position.set(5600, 2, 220);

    // Bâtiment linéaire de 8 chambres
    const motelBody = new THREE.Mesh(new THREE.BoxGeometry(50, 4.5, 11), this.materials.stoneHeritage);
    motelBody.position.y = 2.25;
    const motelRoof = new THREE.Mesh(new THREE.BoxGeometry(52, 0.6, 13), this.materials.roofTin);
    motelRoof.position.y = 4.8;
    motel.add(motelBody, motelRoof);

    // Portes de chambres colorées
    for (let d = 0; d < 8; d++) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.2), this.materials.redBridgeMat);
      door.position.set(-21 + d * 6, 1.4, 5.6);
      motel.add(door);
    }

    this.root.add(motel);

    // D. HALTE ROUTIÈRE DU MINISTÈRE DES TRANSPORTS (X: -2800, Z: 260)
    const restArea = new THREE.Group();
    restArea.position.set(-2800, 2, 260);

    const parking = new THREE.Mesh(new THREE.BoxGeometry(45, 0.1, 25), this.materials.asphalt);
    restArea.add(parking);

    for (let i = 0; i < 4; i++) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 1.4), this.materials.woodFence);
      bench.position.set(-15 + i * 10, 0.5, 8);
      restArea.add(bench);
    }
    this.root.add(restArea);

    // E. GARAGE MÉCANIQUE LOCAL "LAPOINTE & FRÈRES" (X: -3400, Z: -300)
    const garageGroup = new THREE.Group();
    garageGroup.position.set(-3400, 2, -300);

    const shop = new THREE.Mesh(new THREE.BoxGeometry(22, 6.5, 16), this.materials.roofTin);
    shop.position.y = 3.25;
    garageGroup.add(shop);

    // 2 Grandes portes de garage sectionnelles
    for (const gx of [-5, 5]) {
      const gDoor = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 0.2), this.materials.guardrail);
      gDoor.position.set(gx, 2.25, 8.1);
      garageGroup.add(gDoor);
    }

    // Pneus empilés dans la cour
    for (let i = 0; i < 6; i++) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.22, 8, 16), this.materials.asphalt);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(-14, 0.25 + i * 0.4, 4);
      garageGroup.add(tire);
    }

    this.root.add(garageGroup);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. CAMPAGNE RURALE, CHAMPS AGRICOLES, SILOS & GRANGES
  // ──────────────────────────────────────────────────────────────────────────
  private buildAgriculturalCountry() {
    // Complexes de fermes québécoises le long des rangs
    const farmCoords = [
      { x: -5200, z: 240 },
      { x: -3900, z: 280 },
      { x: -1800, z: -150 },
      { x: 600, z: 120 },
      { x: 1800, z: -250 },
      { x: 3400, z: 220 },
      { x: 4800, z: -180 },
      { x: 6400, z: 250 },
    ];

    farmCoords.forEach(c => {
      const barn = this.createRedBarnWithSilo();
      barn.position.set(c.x, 2, c.z);
      this.root.add(barn);
    });

    // Champs agricoles de maïs et de blé
    const fieldCoords = [
      { x: -4400, z: 450, w: 500, d: 250 },
      { x: -2900, z: -400, w: 450, d: 300 },
      { x: -1100, z: 350, w: 600, d: 220 },
      { x: 1600, z: 320, w: 550, d: 280 },
      { x: 3800, z: 420, w: 700, d: 300 },
    ];

    fieldCoords.forEach(f => {
      const fieldMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(f.w, f.d),
        this.materials.cornField
      );
      fieldMesh.rotateX(-Math.PI / 2);
      fieldMesh.position.set(f.x, 1.9, f.z);
      this.root.add(fieldMesh);

      // Balles de foin rondes blanches et dorées dans le champ
      for (let b = 0; b < 8; b++) {
        const isEnrubanne = b % 2 === 0;
        const bale = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 1.2, 1.8, 12),
          isEnrubanne ? this.materials.hayPlastic : this.materials.hayBale
        );
        bale.rotation.z = Math.PI / 2;
        bale.position.set(
          f.x - f.w / 2 + 50 + (b * 60) % f.w,
          2.5,
          f.z - f.d / 2 + 30 + ((b * 45) % f.d)
        );
        this.root.add(bale);
      }
    });

    // Clôtures de perches de cèdre le long des champs
    for (let x = -5000; x <= 6500; x += 120) {
      if (Math.abs(x) > 200) { // Ne pas bloquer le centre
        const fence = new THREE.Mesh(new THREE.BoxGeometry(18, 1.1, 0.15), this.materials.woodFence);
        fence.position.set(x, 2.5, 35);
        this.root.add(fence);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. FORÊTS BORÉALES PROFONDES & ÉRABLIÈRES (TRAJET LONG & IMMERSIF)
  // ──────────────────────────────────────────────────────────────────────────
  private buildDeepBorealForests() {
    const treeGeoCone = new THREE.ConeGeometry(2.6, 10, 6);
    const treeGeoBall = new THREE.SphereGeometry(3.8, 6, 6);

    // Épinettes noires, pins blancs et érables dispersés en masse
    for (let c = 0; c < 120; c++) {
      const cx = (Math.random() - 0.5) * 14000;
      const cz = -350 - Math.random() * 4500; // Profondeur vers le nord et les Laurentides

      for (let t = 0; t < 6; t++) {
        const x = cx + (Math.random() - 0.5) * 90;
        const z = cz + (Math.random() - 0.5) * 90;

        const isPine = t % 2 === 0;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.45, 4.0, 5),
          this.materials.woodUtility
        );
        trunk.position.set(x, 2, z);

        const foliage = new THREE.Mesh(
          isPine ? treeGeoCone : treeGeoBall,
          isPine ? this.materials.pineFoliage : this.materials.mapleFoliage
        );
        foliage.position.set(x, isPine ? 7.2 : 6.0, z);

        this.root.add(trunk, foliage);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS ARCHITECTURAUX
  // ──────────────────────────────────────────────────────────────────────────
  private createHistoricWindmill(): THREE.Group {
    const mill = new THREE.Group();
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 5.5, 14, 14),
      this.materials.stoneHeritage
    );
    tower.position.y = 7.0;

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.8, 5.5, 14),
      this.materials.roofTin
    );
    roof.position.y = 16.5;

    const sails = new THREE.Group();
    sails.position.set(0, 15, 4.5);
    for (let i = 0; i < 4; i++) {
      const sail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 0.08), this.materials.woodFence);
      sail.position.y = 6.0;
      const sailArm = new THREE.Group();
      sailArm.rotation.z = (i * Math.PI) / 2;
      sailArm.add(sail);
      sails.add(sailArm);
    }
    this.animatedWindmillSails = sails;

    mill.add(tower, roof, sails);
    return mill;
  }

  private createLighthouse(): THREE.Group {
    const lh = new THREE.Group();
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 4.5, 26, 12),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 })
    );
    tower.position.y = 13;

    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 3.8, 12),
      this.materials.roofTin
    );
    lantern.position.y = 27.5;

    const beam = new THREE.Group();
    beam.position.y = 27.5;
    const lightCone = new THREE.Mesh(
      new THREE.ConeGeometry(14, 70, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    );
    lightCone.rotation.x = Math.PI / 2;
    lightCone.position.z = 35;
    beam.add(lightCone);

    this.animatedLighthouseBeam = beam;
    lh.add(tower, lantern, beam);
    return lh;
  }

  private createHeritageChurch(): THREE.Group {
    const church = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(18, 13, 36), this.materials.stoneHeritage);
    body.position.y = 6.5;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(17, 9, 4), this.materials.roofTin);
    roof.position.set(0, 17, 0);
    roof.rotation.y = Math.PI / 4;

    const spire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 22, 8), this.materials.roofTin);
    spire.position.set(0, 26, 16);

    church.add(body, roof, spire);
    return church;
  }

  private createRedBarnWithSilo(): THREE.Group {
    const barn = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 24), this.materials.redBarn);
    body.position.y = 5.0;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(16, 7, 4), this.materials.roofTin);
    roof.position.set(0, 13.5, 0);
    roof.rotation.y = Math.PI / 4;

    // Silo cylindrique en tôle avec échelle
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 20, 14), this.materials.guardrail);
    silo.position.set(14, 10, -6);
    const siloRoof = new THREE.Mesh(new THREE.SphereGeometry(3.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.roofTin);
    siloRoof.position.set(14, 20, -6);

    barn.add(body, roof, silo, siloRoof);
    return barn;
  }

  private createAncestralHouse(): THREE.Group {
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(11, 5.5, 13), this.materials.stoneHeritage);
    walls.position.y = 2.75;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(10.5, 5, 4), this.materials.roofTin);
    roof.position.set(0, 7.8, 0);
    roof.rotation.y = Math.PI / 4;

    house.add(walls, roof);
    return house;
  }

  private createLogCabin(): THREE.Group {
    const cabin = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 14), this.materials.woodUtility);
    walls.position.y = 2.5;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 4.5, 4), this.materials.roofTin);
    roof.position.set(0, 7.0, 0);
    roof.rotation.y = Math.PI / 4;

    cabin.add(walls, roof);
    return cabin;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MISE À JOUR ET ANIMATION
  // ──────────────────────────────────────────────────────────────────────────
  public update(delta: number, elapsed: number) {
    if (this.animatedWindmillSails) {
      this.animatedWindmillSails.rotation.z += delta * 0.8;
    }
    if (this.animatedLighthouseBeam) {
      this.animatedLighthouseBeam.rotation.y += delta * 0.6;
    }
    for (const riv of this.riverSurfaces) {
      riv.position.y = 0.4 + Math.sin(elapsed * 1.5) * 0.05;
    }
  }
}
