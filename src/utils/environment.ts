import * as THREE from 'three';

export function buildEnvironment(scene: THREE.Scene) {
  // Ambient - low so lamp light is visible
  const ambient = new THREE.AmbientLight(0x1a1410, 0.4);
  scene.add(ambient);

  // Sun - dimmed so lamp is primary light source on character
  const sun = new THREE.DirectionalLight(0xfff0d0, 0.4);
  sun.position.set(5, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -4;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Rim light - deep blue for contrast (dimmed)
  const rimL = new THREE.PointLight(0x3366ff, 1.2, 14);
  rimL.position.set(-3, 4, -3);
  scene.add(rimL);

  // Fill light - removed (lamp handles this now)
  const fillL = new THREE.PointLight(0xffaa44, 0.3, 10);
  fillL.position.set(3, 3, 2);
  scene.add(fillL);

  // Buff light
  const buffLight = new THREE.PointLight(0xffffff, 0, 9);
  buffLight.position.set(0, 2, 1.5);
  buffLight.userData.isBuffLight = true;
  scene.add(buffLight);

  const buffLight2 = new THREE.PointLight(0xffffff, 0, 7);
  buffLight2.position.set(0, 0.5, 0);
  scene.add(buffLight2);

  // ── TAVERN LAMP — suspended, swinging, illuminates character ──
  // Anchor point at the ceiling
  const lampAnchor = new THREE.Group();
  lampAnchor.position.set(0, 7.5, 0);
  lampAnchor.userData.isLampAnchor = true;
  scene.add(lampAnchor);

  // Chain (cylinder from ceiling to lamp)
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x2a2010, roughness: 0.7, metalness: 0.8 });
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 3.0, 8), chainMat);
  chain.position.y = -1.5; // hangs below anchor
  chain.castShadow = true;
  lampAnchor.add(chain);

  // Lamp housing group (swings from chain end)
  const lampGroup = new THREE.Group();
  lampGroup.position.y = -3.0; // bottom of chain
  lampGroup.userData.isLamp = true;
  lampAnchor.add(lampGroup);

  // Lamp canopy (top cone - metal cap)
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x3a2a10, roughness: 0.4, metalness: 0.9 });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 12), canopyMat);
  canopy.position.y = 0.08;
  canopy.castShadow = true;
  lampGroup.add(canopy);

  // Lamp body (the lantern part - brass/bronze cylinder)
  const lampBodyMat = new THREE.MeshStandardMaterial({ color: 0x4a3a14, roughness: 0.3, metalness: 0.95 });
  const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.28, 12), lampBodyMat);
  lampBody.position.y = -0.08;
  lampBody.castShadow = true;
  lampGroup.add(lampBody);

  // Lamp glass (glowing inner - warm amber)
  const lampGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffcc44,
    emissive: 0xffaa22,
    emissiveIntensity: 2.5,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
  });
  const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), lampGlassMat);
  lampGlass.position.y = -0.08;
  lampGlass.userData.isLampGlass = true;
  lampGroup.add(lampGlass);

  // Lamp frame ribs (4 vertical bars around the glass)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), lampBodyMat);
    rib.position.set(Math.cos(angle) * 0.2, -0.08, Math.sin(angle) * 0.2);
    lampGroup.add(rib);
  }

  // Lamp bottom ring
  const bottomRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 6, 16), lampBodyMat);
  bottomRing.rotation.x = Math.PI / 2;
  bottomRing.position.y = -0.22;
  lampGroup.add(bottomRing);

  // Top ring
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 16), lampBodyMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 0.06;
  lampGroup.add(topRing);

  // Ornament finial at bottom
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8), lampBodyMat);
  finial.position.y = -0.28;
  finial.rotation.x = Math.PI;
  lampGroup.add(finial);

  // The actual light source - PointLight inside the lamp (warm amber, strong)
  const lampLight = new THREE.PointLight(0xffaa44, 12, 18, 1.0);
  lampLight.position.y = -0.08;
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(2048, 2048);
  lampLight.shadow.camera.near = 0.1;
  lampLight.shadow.camera.far = 20;
  lampLight.shadow.bias = -0.002;
  lampLight.userData.isLampLight = true;
  lampGroup.add(lampLight);

  // Secondary softer light for wider fill
  const lampFill = new THREE.PointLight(0xffcc66, 5, 12, 1.2);
  lampFill.position.y = -0.08;
  lampFill.userData.isLampFill = true;
  lampGroup.add(lampFill);

  // Spot - gold tint (kept but dimmed since lamp is primary)
  const spot = new THREE.SpotLight(0xffd700, 1.5, 14, Math.PI * 0.2, 0.5, 2);
  spot.position.set(0, 8, 0);
  spot.target.position.set(0, 0, 0);
  scene.add(spot, spot.target);

  // Ground - darker with subtle warmth
  const gm = new THREE.MeshStandardMaterial({ color: 0x0a0805, roughness: 0.95, metalness: 0.15 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 64), gm);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Platform - dark metal with gold undertones
  const pm = new THREE.MeshStandardMaterial({ color: 0x1a1610, roughness: 0.2, metalness: 0.85 });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.14, 64), pm);
  plat.position.y = 0.01;
  plat.receiveShadow = true;
  plat.castShadow = true;
  scene.add(plat);

  // Inner platform ring - gold accent
  const innerRingMat = new THREE.MeshStandardMaterial({
    color: 0x8b6914,
    emissive: 0x4a3a0a,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.9,
  });
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.015, 8, 128), innerRingMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.08;
  scene.add(innerRing);

  // Rune ring - gold
  const rrg = new THREE.TorusGeometry(1.65, 0.026, 8, 128);
  const runeRingMat = new THREE.MeshStandardMaterial({
    color: 0x665500,
    emissive: 0x332200,
    emissiveIntensity: 1,
    roughness: 0.2,
    metalness: 0.9,
  });
  const runeRing = new THREE.Mesh(rrg, runeRingMat);
  runeRing.rotation.x = -Math.PI / 2;
  runeRing.position.y = 0.09;
  runeRing.userData.isRuneRing = true;
  scene.add(runeRing);

  // Grid - subtle gold tint
  const grid = new THREE.GridHelper(30, 30, 0x1a1408, 0x0a0804);
  grid.position.y = 0.002;
  const gridMat = grid.material as THREE.Material | THREE.Material[];
  if (Array.isArray(gridMat)) {
    gridMat.forEach(m => {
      if (m instanceof THREE.LineBasicMaterial) {
        m.transparent = true;
        m.opacity = 0.3;
      }
    });
  } else if (gridMat instanceof THREE.LineBasicMaterial) {
    gridMat.transparent = true;
    gridMat.opacity = 0.3;
  }
  scene.add(grid);

  // Outer glowing rings - gold
  [2.8, 5, 7.5].forEach((r, i) => {
    const rg = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.006, 4, 128),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.2 - i * 0.05,
        transparent: true,
        opacity: 0.3 - i * 0.07,
      })
    );
    rg.rotation.x = -Math.PI / 2;
    rg.position.y = 0.01;
    scene.add(rg);
  });

  // Floating golden embers in environment
  const emberGroup = new THREE.Group();
  emberGroup.userData.isEmberGroup = true;
  for (let i = 0; i < 60; i++) {
    const geo = new THREE.SphereGeometry(0.008 + Math.random() * 0.015, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffd700).lerp(new THREE.Color(0xff8800), Math.random() * 0.5),
      transparent: true,
      opacity: 0.3 + Math.random() * 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 8;
    mesh.position.set(
      Math.cos(angle) * radius,
      Math.random() * 6,
      Math.sin(angle) * radius
    );
    mesh.userData = {
      isEnvEmber: true,
      speed: 0.15 + Math.random() * 0.4,
      swayX: Math.random() * Math.PI * 2,
      swayZ: Math.random() * Math.PI * 2,
      swayAmount: 0.3 + Math.random() * 0.5,
      flicker: Math.random() * Math.PI * 2,
      flickerSpeed: 0.02 + Math.random() * 0.04,
      baseY: mesh.position.y,
    };
    emberGroup.add(mesh);
  }
  scene.add(emberGroup);

  // Distant floating particles - cyan for contrast
  for (let i = 0; i < 25; i++) {
    const geo = new THREE.SphereGeometry(0.01 + Math.random() * 0.02, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.15 + Math.random() * 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 24,
      Math.random() * 10,
      (Math.random() - 0.5) * 24
    );
    mesh.userData = {
      isEnvParticle: true,
      speed: 0.1 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
    };
    scene.add(mesh);
  }

  // Ground reflection plane (subtle)
  const reflectGeo = new THREE.CircleGeometry(2.5, 64);
  const reflectMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0,
    metalness: 1,
    transparent: true,
    opacity: 0.3,
  });
  const reflect = new THREE.Mesh(reflectGeo, reflectMat);
  reflect.rotation.x = -Math.PI / 2;
  reflect.position.y = 0.001;
  reflect.receiveShadow = true;
  scene.add(reflect);

  return { buffLight, buffLight2, rimL, runeRingMat, emberGroup, lampAnchor, lampGlass };
}
