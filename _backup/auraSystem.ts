import * as THREE from 'three';

export type AuraType = 'divine' | 'void' | 'blood' | 'frost' | 'nature' | 'chaos' | 'lichking' | 'demonhunter' | 'bloodmage' | 'archmage' | 'warlord' | 'timegod' | 'firegod' | 'crystal' | 'storm' | 'abyssal' | 'solar' | 'quantum';

interface BuffConfig {
  color: THREE.Color;
  color2?: THREE.Color;
  color3?: THREE.Color;
  lightColor: number;
  build: (buff: BuffConfig, group: THREE.Group) => void;
}

function bodyMat(color: number, roughness = 0.5, metalness = 0.3) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// ─────────────────────────────────────────────────────────────────
// ORIGINAL BUFFS
// ─────────────────────────────────────────────────────────────────

function buildDivineShield(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color;
  const oGeo = new THREE.SphereGeometry(1.55, 64, 32);
  const oMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3, transparent: true, opacity: 0.06, side: THREE.DoubleSide, roughness: 0, metalness: 0.8 });
  const oS = new THREE.Mesh(oGeo, oMat); oS.position.y = 1.5; oS.userData.type = 'divineOuter';
  group.add(oS);

  const hGeo = new THREE.IcosahedronGeometry(1.42, 2);
  const hMat = new THREE.MeshBasicMaterial({ color: buff.color2, transparent: true, opacity: 0.22, wireframe: true });
  const hS = new THREE.Mesh(hGeo, hMat); hS.position.y = 1.5; hS.userData.type = 'divineHex';
  group.add(hS);

  const cGeo = new THREE.SphereGeometry(1.3, 32, 16);
  const cMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.8, transparent: true, opacity: 0.04, side: THREE.BackSide });
  const core = new THREE.Mesh(cGeo, cMat); core.position.y = 1.5; core.userData.type = 'divineCore';
  group.add(core);

  for (let i = 0; i < 3; i++) {
    const rG = new THREE.TorusGeometry(1.52 - i * 0.12, 0.018 + i * 0.004, 8, 128);
    const rM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3 - i * 0.5, transparent: true, opacity: 0.9 - i * 0.2, roughness: 0, metalness: 1 });
    const r = new THREE.Mesh(rG, rM); r.position.y = 1.5 + (i - 1) * 0.45;
    r.userData = { baseY: r.position.y, i, type: 'divineRing' };
    group.add(r);
  }

  const vRG = new THREE.TorusGeometry(1.52, 0.015, 8, 128);
  const vRM = new THREE.MeshStandardMaterial({ color: buff.color2, emissive: buff.color2, emissiveIntensity: 4, transparent: true, opacity: 0.85, roughness: 0, metalness: 1 });
  const vR = new THREE.Mesh(vRG, vRM); vR.position.y = 1.5; vR.userData.type = 'vRing';
  group.add(vR);
  const vR2 = vR.clone(); vR2.rotation.y = Math.PI / 2; vR2.userData.type = 'vRing2';
  group.add(vR2);

  // Particles
  for (let i = 0; i < 90; i++) {
    addParticle(group, c, 0.022 + Math.random() * 0.038, {
      type: 'divine', angle: (i / 90) * Math.PI * 2 + Math.random() * 0.3,
      speed: 0.5 + Math.random() * 0.8, r: 0.4 + Math.random() * 1.3,
      y: Math.random() * 3.5, alpha: 0.65 + Math.random() * 0.35,
    });
  }

  // Runes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rG2 = new THREE.BoxGeometry(0.06, 0.005, 0.18);
    const rM2 = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 4, transparent: true, opacity: 0.9 });
    const rune = new THREE.Mesh(rG2, rM2);
    rune.position.set(Math.cos(a) * 1.3, 0.01, Math.sin(a) * 1.3);
    rune.rotation.y = a;
    group.add(rune);
  }
}

function buildVoidAura(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color;
  const vG = new THREE.SphereGeometry(1.4, 64, 32);
  const vM = new THREE.MeshStandardMaterial({ color: 0x110022, emissive: c, emissiveIntensity: 0.15, transparent: true, opacity: 0.18, side: THREE.DoubleSide, roughness: 1 });
  const vS = new THREE.Mesh(vG, vM); vS.position.y = 1.5; vS.userData.type = 'voidSphere';
  group.add(vS);

  for (let i = 0; i < 5; i++) {
    const pts = []; const sA = (i / 5) * Math.PI * 2;
    for (let j = 0; j <= 20; j++) {
      const t = j / 20, a = sA + t * Math.PI * 1.5, r = 0.5 + t * 0.8, y = t * 3.2 - 0.2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const tG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025 - i * 0.002, 8, false);
    const tM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.5, transparent: true, opacity: 0.75 - i * 0.05, roughness: 0 });
    const tube = new THREE.Mesh(tG, tM); tube.userData = { type: 'voidTube', baseAngle: sA, index: i };
    group.add(tube);
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const oG = new THREE.SphereGeometry(0.07, 16, 12);
    const oM = new THREE.MeshStandardMaterial({ color: buff.color2, emissive: buff.color2, emissiveIntensity: 6, roughness: 0, metalness: 0 });
    const orb = new THREE.Mesh(oG, oM);
    orb.position.set(Math.cos(a) * 1.1, 1.5 + Math.sin(a * 1.3) * 0.5, Math.sin(a) * 1.1);
    orb.userData = { type: 'voidOrb', baseAngle: a, i };
    group.add(orb);
  }

  for (let i = 0; i < 160; i++) {
    addParticle(group, c, 0.055 + Math.random() * 0.09, {
      type: 'void', angle: Math.random() * Math.PI * 2, r: 0.15 + Math.random() * 1.6,
      y: Math.random() * 3.8 - 0.3, vy: (Math.random() - 0.5) * 0.028,
      vAngle: (Math.random() - 0.5) * 0.07, alpha: 0.35 + Math.random() * 0.65,
    });
  }

  const pG = new THREE.TorusGeometry(1.2, 0.04, 8, 128);
  const pM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 5, transparent: true, opacity: 0.9 });
  const portal = new THREE.Mesh(pG, pM); portal.rotation.x = -Math.PI / 2; portal.position.y = 0.02; portal.userData.type = 'voidPortal';
  group.add(portal);

  const pI = new THREE.Mesh(new THREE.CircleGeometry(1.2, 64), new THREE.MeshStandardMaterial({ color: 0x0a0015, emissive: c, emissiveIntensity: 0.5, transparent: true, opacity: 0.5 }));
  pI.rotation.x = -Math.PI / 2; pI.position.y = 0.01;
  group.add(pI);
}

function buildBloodAura(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color;
  for (let i = 0; i < 3; i++) {
    const bG = new THREE.SphereGeometry(1.1 + i * 0.18, 32, 16);
    const bM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4 - i * 0.1, transparent: true, opacity: 0.05 + i * 0.02, side: THREE.DoubleSide });
    const bS = new THREE.Mesh(bG, bM); bS.position.y = 1.5; bS.userData = { type: 'bloodMist', i };
    group.add(bS);
  }

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const rG = new THREE.TorusGeometry(0.7 + i * 0.22, 0.022, 8, 96);
    const rM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 4, transparent: true, opacity: 0.9, roughness: 0, metalness: 0.8 });
    const ring = new THREE.Mesh(rG, rM); ring.position.y = 1.5; ring.rotation.set(Math.cos(a) * 0.8, a, Math.sin(a) * 0.6);
    ring.userData = { type: 'bloodRing', baseAngle: a, i };
    group.add(ring);
  }

  for (let i = 0; i < 140; i++) {
    addParticle(group, c, 0.032 + Math.random() * 0.058, {
      type: 'blood', angle: Math.random() * Math.PI * 2, r: 0.08 + Math.random() * 1.6,
      y: Math.random() * 4.5, vy: 0.014 + Math.random() * 0.028, alpha: 0.7 + Math.random() * 0.3,
    });
  }

  const rCs = [c, buff.color2];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    for (let j = 0; j < 3; j++) {
      const rG2 = new THREE.BoxGeometry(0.05, 0.005, 0.12 + j * 0.04);
      const rM2 = new THREE.MeshStandardMaterial({ color: rCs[j % 2], emissive: rCs[j % 2], emissiveIntensity: 5, transparent: true, opacity: 0.9 });
      const rune = new THREE.Mesh(rG2, rM2);
      const r = 0.6 + j * 0.4;
      rune.position.set(Math.cos(a + j * 0.2) * r, 0.01, Math.sin(a + j * 0.2) * r);
      rune.rotation.y = a;
      group.add(rune);
    }
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sG = new THREE.ConeGeometry(0.04, 0.45, 6);
    const sM = new THREE.MeshStandardMaterial({ color: 0xddccaa, emissive: c, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.6 });
    const spike = new THREE.Mesh(sG, sM);
    spike.position.set(Math.cos(a) * 1.1, 1.5 + Math.sin(a * 2) * 0.3, Math.sin(a) * 1.1);
    spike.lookAt(0, 1.5, 0); spike.rotateX(-Math.PI / 2);
    spike.userData = { type: 'bloodSpike', angle: a, baseY: spike.position.y };
    group.add(spike);
  }
}

function buildFrostAura(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color;
  for (let d = 0; d < 2; d++) {
    const fG = new THREE.IcosahedronGeometry(1.3 + d * 0.2, d);
    const fM = new THREE.MeshStandardMaterial({ color: buff.color2, emissive: c, emissiveIntensity: 0.6, transparent: true, opacity: 0.08 + d * 0.04, side: THREE.DoubleSide, roughness: 0, metalness: 0.95, wireframe: d === 0 });
    const frost = new THREE.Mesh(fG, fM); frost.position.y = 1.5; frost.userData = { type: 'frostShell', d };
    group.add(frost);
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const h = (i % 3) * 0.7 + 0.8;
    const sG = new THREE.ConeGeometry(0.055 - (i % 3) * 0.01, 0.38, 6);
    const sM = new THREE.MeshStandardMaterial({ color: buff.color2, emissive: c, emissiveIntensity: 2, transparent: true, opacity: 0.88, roughness: 0, metalness: 0.95 });
    const shard = new THREE.Mesh(sG, sM);
    const r = 1.0 + (i % 3) * 0.15;
    shard.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    shard.lookAt(0, h, 0); shard.rotateX(-Math.PI / 2);
    shard.userData = { type: 'frostShard', angle: a, r, baseH: h, i };
    group.add(shard);
  }

  for (let i = 0; i < 5; i++) {
    const rG = new THREE.TorusGeometry(0.5 + i * 0.22, 0.012, 6, 96);
    const rM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 5, transparent: true, opacity: 0.7, roughness: 0, metalness: 1 });
    const ring = new THREE.Mesh(rG, rM); ring.position.y = 1.5 + (i - 2) * 0.35; ring.rotation.x = i * 0.3;
    ring.userData = { type: 'frostRing', i, baseY: ring.position.y };
    group.add(ring);
  }

  for (let i = 0; i < 200; i++) {
    addParticle(group, c, 0.012 + Math.random() * 0.038, {
      type: 'frost', angle: Math.random() * Math.PI * 2, r: 0.1 + Math.random() * 1.8,
      y: Math.random() * 4, vy: -(0.009 + Math.random() * 0.02),
      vAngle: (Math.random() - 0.5) * 0.035, alpha: 0.55 + Math.random() * 0.45,
    });
  }

  for (let i = 0; i < 3; i++) {
    const hG = new THREE.TorusGeometry(0.5 + i * 0.4, 0.015, 6, 6);
    const hM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3, transparent: true, opacity: 0.7 });
    const hex = new THREE.Mesh(hG, hM); hex.rotation.x = -Math.PI / 2; hex.position.y = 0.005;
    hex.userData = { type: 'frostHex', i };
    group.add(hex);
  }
}

function buildNatureAura(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color;
  const sG = new THREE.SphereGeometry(0.9, 32, 16);
  const sM = new THREE.MeshStandardMaterial({ color: buff.color2, emissive: c, emissiveIntensity: 1.2, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  const sB = new THREE.Mesh(sG, sM); sB.position.y = 1.5; sB.userData.type = 'natureStar';
  group.add(sB);

  for (let ring = 0; ring < 3; ring++) {
    const lc = 8 + ring * 4;
    for (let i = 0; i < lc; i++) {
      const a = (i / lc) * Math.PI * 2;
      const r = 0.7 + ring * 0.3;
      const lG = new THREE.ConeGeometry(0.04 - ring * 0.005, 0.25, 5);
      const lM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0.3 });
      const leaf = new THREE.Mesh(lG, lM);
      const h = 0.8 + ring * 0.6 + (i % 3) * 0.25;
      leaf.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
      leaf.lookAt(0, h, 0); leaf.rotateX(-Math.PI / 2);
      leaf.userData = { type: 'natureLeaf', angle: a, r, ring, i, baseH: h };
      group.add(leaf);
    }
  }

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const oG = new THREE.IcosahedronGeometry(0.06, 1);
    const oM = new THREE.MeshStandardMaterial({ color: buff.color2, emissive: buff.color2, emissiveIntensity: 8, roughness: 0, metalness: 0 });
    const orb = new THREE.Mesh(oG, oM);
    orb.position.set(Math.cos(a) * 1.2, 1.5 + Math.sin(a * 2) * 0.6, Math.sin(a) * 1.2);
    orb.userData = { type: 'natureStar2', angle: a, i };
    group.add(orb);
  }

  for (let v = 0; v < 4; v++) {
    const pts = []; const sA = (v / 4) * Math.PI * 2;
    for (let j = 0; j <= 30; j++) {
      const t = j / 30, a = sA + t * Math.PI * 3, r = 0.2 + t * 0.9;
      pts.push(new THREE.Vector3(Math.cos(a) * r, t * 3.2 - 0.1, Math.sin(a) * r));
    }
    const tG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.018, 6, false);
    const tM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2, transparent: true, opacity: 0.6 });
    const vine = new THREE.Mesh(tG, tM); vine.userData = { type: 'natureVine', v };
    group.add(vine);
  }

  for (let i = 0; i < 160; i++) {
    addParticle(group, c, 0.022 + Math.random() * 0.045, {
      type: 'nature', angle: Math.random() * Math.PI * 2, r: 0.15 + Math.random() * 1.4,
      y: Math.random() * 3.8, vy: 0.01 + Math.random() * 0.018,
      vAngle: 0.015 + Math.random() * 0.04, alpha: 0.6 + Math.random() * 0.4,
    });
  }

  for (let i = 0; i < 4; i++) {
    const rG = new THREE.TorusGeometry(0.35 + i * 0.35, 0.01, 6, 64);
    const rM = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 4, transparent: true, opacity: 0.7 });
    const sR = new THREE.Mesh(rG, rM); sR.rotation.x = -Math.PI / 2; sR.position.y = 0.005;
    sR.userData = { type: 'natureCircle', i };
    group.add(sR);
  }
}

function buildChaosAura(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2;
  const cC = [c, c2, new THREE.Color(1, 0.1, 0.1), new THREE.Color(0.8, 0, 1)];
  for (let i = 0; i < 4; i++) {
    const cG = new THREE.OctahedronGeometry(1.1 + i * 0.15, i);
    const cM = new THREE.MeshStandardMaterial({ color: cC[i], emissive: cC[i], emissiveIntensity: 0.5, transparent: true, opacity: 0.07, side: THREE.DoubleSide, wireframe: i < 2 });
    const chaos = new THREE.Mesh(cG, cM); chaos.position.y = 1.5; chaos.userData = { type: 'chaosShell', i, rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.4 };
    group.add(chaos);
  }

  for (let i = 0; i < 8; i++) {
    const aG = new THREE.TorusGeometry(0.6 + Math.random() * 0.7, 0.01 + Math.random() * 0.015, 4, 64);
    const aC = cC[i % 4];
    const aM = new THREE.MeshStandardMaterial({ color: aC, emissive: aC, emissiveIntensity: 5, transparent: true, opacity: 0.7 });
    const arc = new THREE.Mesh(aG, aM); arc.position.y = 1.5;
    arc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    arc.userData = { type: 'chaosArc', rotX: (Math.random() - 0.5) * 0.04, rotY: (Math.random() - 0.5) * 0.06, i };
    group.add(arc);
  }

  for (let i = 0; i < 16; i++) {
    const sG = new THREE.TetrahedronGeometry(0.07 + Math.random() * 0.05);
    const sC = cC[i % 4];
    const sM = new THREE.MeshStandardMaterial({ color: sC, emissive: sC, emissiveIntensity: 4, roughness: 0, metalness: 0.9 });
    const shard = new THREE.Mesh(sG, sM);
    const a = (i / 16) * Math.PI * 2, r = 0.9 + Math.random() * 0.5, h = 0.5 + Math.random() * 2.5;
    shard.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    shard.userData = { type: 'chaosShard', angle: a, r, h, rotSpeed: Math.random() * 0.1 };
    group.add(shard);
  }

  for (let i = 0; i < 200; i++) {
    const col = cC[i % 4];
    addParticle(group, col, 0.018 + Math.random() * 0.055, {
      type: 'chaos', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 1.8,
      y: Math.random() * 4 - 0.3, vy: (Math.random() - 0.5) * 0.038,
      vAngle: (Math.random() - 0.5) * 0.1, alpha: 0.55 + Math.random() * 0.45, colorIdx: i % 4,
    });
  }

  for (let i = 0; i < 5; i++) {
    const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2, a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
    const pts = [new THREE.Vector3(Math.cos(a1) * 1.2, 0, Math.sin(a1) * 1.2), new THREE.Vector3(Math.cos(a2) * 1.2, 0, Math.sin(a2) * 1.2)];
    const lG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 2, 0.018, 6, false);
    const lM = new THREE.MeshStandardMaterial({ color: cC[i % 4], emissive: cC[i % 4], emissiveIntensity: 4, transparent: true, opacity: 0.8 });
    const line = new THREE.Mesh(lG, lM); line.position.y = 0.01;
    group.add(line);
  }
}

// ─────────────────────────────────────────────────────────────────
// CHARACTER AURAS
// ─────────────────────────────────────────────────────────────────

function buildLichKing(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2, c3 = buff.color3;

  for (let i = 0; i < 3; i++) {
    const sg = new THREE.SphereGeometry(1.6 - i * 0.12, 48, 24);
    const sm = new THREE.MeshStandardMaterial({ color: c3, emissive: c, emissiveIntensity: 0.2 + i * 0.1, transparent: true, opacity: 0.04 + i * 0.015, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.9 });
    const ss = new THREE.Mesh(sg, sm); ss.position.y = 1.5; ss.userData = { type: 'lichSphere', i };
    group.add(ss);
  }

  const runeGeo = new THREE.IcosahedronGeometry(1.5, 3);
  const runeMat = new THREE.MeshBasicMaterial({ color: c2, transparent: true, opacity: 0.12, wireframe: true });
  const runeShell = new THREE.Mesh(runeGeo, runeMat); runeShell.position.y = 1.5; runeShell.userData.type = 'lichRune';
  group.add(runeShell);

  const bladeGrp = new THREE.Group();
  const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.6, 0.14), new THREE.MeshStandardMaterial({ color: c2, emissive: c, emissiveIntensity: 3, roughness: 0, metalness: 1, transparent: true, opacity: 0.9 }));
  bladeMesh.position.y = 0.8; bladeGrp.add(bladeMesh);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.1), new THREE.MeshStandardMaterial({ color: c3, emissive: c, emissiveIntensity: 4, roughness: 0, metalness: 1 }));
  bladeGrp.add(cross);
  bladeGrp.position.set(-1.3, 2.2, 0.2); bladeGrp.rotation.z = -0.2;
  bladeGrp.userData = { type: 'lichSword', baseY: 2.2, baseX: -1.3 };
  group.add(bladeGrp);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sg2 = new THREE.SphereGeometry(0.055 + Math.random() * 0.03, 10, 8);
    const sm2 = new THREE.MeshStandardMaterial({ color: c2, emissive: c2, emissiveIntensity: 8, roughness: 0, transparent: true, opacity: 0.85 });
    const soul = new THREE.Mesh(sg2, sm2);
    soul.position.set(Math.cos(a) * 1.0, 0.5 + i * 0.2, Math.sin(a) * 1.0);
    soul.userData = { type: 'lichSoul', angle: a, baseH: 0.5 + i * 0.2, i, speed: 0.3 + Math.random() * 0.3, r: 0.8 + Math.random() * 0.5 };
    group.add(soul);
  }

  const crownData = [[0.6, 0.06, 0.5], [0.85, 0.07, 1.2], [1.1, 0.05, 1.9]];
  crownData.forEach(([rx, thick, y], i) => {
    const rg = new THREE.TorusGeometry(rx, thick, 8, 80);
    const rm = new THREE.MeshStandardMaterial({ color: c2, emissive: c, emissiveIntensity: 5, transparent: true, opacity: 0.9, roughness: 0, metalness: 1 });
    const ring = new THREE.Mesh(rg, rm); ring.position.y = y; ring.rotation.x = i * 0.4 - 0.3;
    ring.userData = { type: 'lichCrown', i, baseY: y };
    group.add(ring);
  });

  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.04, 8, 128), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 6, transparent: true, opacity: 0.95 }));
  portalRing.rotation.x = -Math.PI / 2; portalRing.position.y = 0.02; portalRing.userData.type = 'lichPortal';
  group.add(portalRing);

  const innerCircle = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.MeshStandardMaterial({ color: 0x001122, emissive: c3, emissiveIntensity: 0.8, transparent: true, opacity: 0.45 }));
  innerCircle.rotation.x = -Math.PI / 2; innerCircle.position.y = 0.01;
  group.add(innerCircle);

  for (let i = 0; i < 180; i++) {
    addParticle(group, c, 0.018 + Math.random() * 0.04, {
      type: 'lichfrost', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 2.0,
      y: Math.random() * 4.5, vy: -(0.01 + Math.random() * 0.025),
      vAngle: (Math.random() - 0.5) * 0.028, alpha: 0.6 + Math.random() * 0.4,
    });
  }

  const haloGeo = new THREE.TorusGeometry(0.38, 0.025, 8, 64);
  const haloMat = new THREE.MeshStandardMaterial({ color: c2, emissive: c, emissiveIntensity: 8, transparent: true, opacity: 0.95, roughness: 0, metalness: 1 });
  const halo = new THREE.Mesh(haloGeo, haloMat); halo.position.y = 2.9; halo.rotation.x = 0.15; halo.userData.type = 'lichHalo';
  group.add(halo);
}

function buildDemonHunter(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2, c3 = buff.color3;

  const shadowGeo = new THREE.SphereGeometry(0.85, 32, 16);
  const shadowMat = new THREE.MeshStandardMaterial({ color: 0x0d0020, emissive: c, emissiveIntensity: 0.4, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.position.y = 1.5; shadow.userData.type = 'dhShadow';
  group.add(shadow);

  function makeWing(side: number) {
    const pts = []; const sx = side;
    for (let j = 0; j <= 20; j++) {
      const t = j / 20;
      const x = sx * (0.3 + t * 1.8);
      const y = 1.5 + Math.sin(t * Math.PI) * 1.4 - t * 0.5;
      const z = -0.2 + t * 0.3;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const wg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.04 - 0.001, 6, false);
    const wm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3, transparent: true, opacity: 0.85, roughness: 0 });
    const wing = new THREE.Mesh(wg, wm); wing.userData = { type: 'dhWing', side };
    group.add(wing);

    for (let k = 0; k < 3; k++) {
      const mPts = []; const tBase = k * 0.28;
      for (let j = 0; j <= 10; j++) {
        const t = tBase + j / 10 * 0.25;
        const x2 = sx * (0.3 + t * 1.8);
        const y2 = 1.5 + Math.sin(t * Math.PI) * 1.4 - t * 0.5;
        const z2 = -0.2 + t * 0.3;
        mPts.push(new THREE.Vector3(x2 + sx * (j / 10) * 0.3, y2 - j * 0.08, z2));
      }
      if (mPts.length >= 2) {
        const mg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mPts), 8, 0.012, 4, false);
        const mm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2, transparent: true, opacity: 0.45 });
        const mem = new THREE.Mesh(mg, mm); mem.userData = { type: 'dhMem', side, k };
        group.add(mem);
      }
    }
  }
  makeWing(1); makeWing(-1);

  [[-0.14, 2.43, 0.23], [0.14, 2.43, 0.23]].forEach(([x, y, z], i) => {
    const eg = new THREE.SphereGeometry(0.055, 12, 8);
    const em = new THREE.MeshStandardMaterial({ color: c3, emissive: c3, emissiveIntensity: 12, roughness: 0, metalness: 0 });
    const eye = new THREE.Mesh(eg, em); eye.position.set(x, y, z); eye.userData = { type: 'dhEye', i };
    group.add(eye);
  });

  function makeGlaive(side: number, height: number) {
    const grp = new THREE.Group();
    const ag = new THREE.TorusGeometry(0.35, 0.025, 6, 48, Math.PI * 1.5);
    const am = new THREE.MeshStandardMaterial({ color: c2, emissive: c2, emissiveIntensity: 5, roughness: 0, metalness: 1 });
    grp.add(new THREE.Mesh(ag, am));
    const pg = new THREE.ConeGeometry(0.03, 0.3, 6);
    const pm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 4, roughness: 0, metalness: 1 });
    const pt = new THREE.Mesh(pg, pm); pt.position.set(side * 0.35, 0, 0); pt.rotation.z = side * Math.PI / 2;
    grp.add(pt);
    grp.position.set(side * 1.4, height, 0.3);
    grp.userData = { type: 'dhGlaive', side, baseY: height, baseX: side * 1.4 };
    group.add(grp);
  }
  makeGlaive(1, 1.8); makeGlaive(-1, 2.2);

  for (let i = 0; i < 220; i++) {
    const isFel = i % 3 !== 0;
    const col = isFel ? (c3 || new THREE.Color(0, 0.8, 0.2)) : c;
    addParticle(group, col, 0.02 + Math.random() * 0.04, {
      type: 'dh', angle: Math.random() * Math.PI * 2, r: 0.03 + Math.random() * 1.7,
      y: Math.random() * 4.5, vy: 0.018 + Math.random() * 0.035,
      vAngle: (Math.random() - 0.5) * 0.07, alpha: 0.6 + Math.random() * 0.4, isFel,
    });
  }

  for (let i = 0; i < 5; i++) {
    const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2, a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
    const pts = [new THREE.Vector3(Math.cos(a1) * 1.1, 0, Math.sin(a1) * 1.1), new THREE.Vector3(Math.cos(a2) * 1.1, 0, Math.sin(a2) * 1.1)];
    const lg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 2, 0.02, 4, false);
    const lm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c3, emissive: i % 2 === 0 ? c : c3, emissiveIntensity: 5, transparent: true, opacity: 0.85 });
    const line = new THREE.Mesh(lg, lm); line.position.y = 0.01;
    group.add(line);
  }

  const trailGeo = new THREE.CircleGeometry(1.1, 64);
  const trailMat = new THREE.MeshStandardMaterial({ color: 0x0a0020, emissive: c, emissiveIntensity: 0.6, transparent: true, opacity: 0.4 });
  const trail = new THREE.Mesh(trailGeo, trailMat); trail.rotation.x = -Math.PI / 2; trail.position.y = 0.005;
  group.add(trail);
}

function buildBloodMage(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2, c3 = buff.color3;

  function makePhoenixTrail(idx: number) {
    const pts = []; const offset = (idx / 3) * Math.PI * 2;
    for (let j = 0; j <= 40; j++) {
      const t = j / 40; const a = offset + t * Math.PI * 4;
      const r = 0.5 + Math.sin(t * Math.PI) * 0.9; const y = t * 3.5 - 0.2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.03 + idx * 0.008, 8, false);
    const tm = new THREE.MeshStandardMaterial({ color: idx === 0 ? c : c2, emissive: idx === 0 ? c : c2, emissiveIntensity: 3 + idx, transparent: true, opacity: 0.8 });
    const trail = new THREE.Mesh(tg, tm); trail.userData = { type: 'bmPhoenix', idx };
    group.add(trail);
  }
  makePhoenixTrail(0); makePhoenixTrail(1); makePhoenixTrail(2);

  const plasmaGeo = new THREE.SphereGeometry(0.7, 32, 16);
  const plasmaMat = new THREE.MeshStandardMaterial({ color: c3, emissive: c, emissiveIntensity: 1.5, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
  const plasma = new THREE.Mesh(plasmaGeo, plasmaMat); plasma.position.y = 1.5; plasma.userData.type = 'bmPlasma';
  group.add(plasma);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2; const h = 0.5 + Math.random() * 2.5; const r = 0.5 + Math.random() * 0.8;
    const cg2 = new THREE.OctahedronGeometry(0.08 + Math.random() * 0.05);
    const cm2 = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 4, roughness: 0, metalness: 0.9, transparent: true, opacity: 0.9 });
    const crystal = new THREE.Mesh(cg2, cm2);
    crystal.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    crystal.userData = { type: 'bmCrystal', angle: a, r, baseH: h, i, rotSpeed: 0.03 + Math.random() * 0.05 };
    group.add(crystal);
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const fg = new THREE.ConeGeometry(0.12, 0.7, 8);
    const fm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3, transparent: true, opacity: 0.5 });
    const flame = new THREE.Mesh(fg, fm);
    flame.position.set(Math.cos(a) * 0.9, 0.4, Math.sin(a) * 0.9);
    flame.userData = { type: 'bmFlame', angle: a, baseH: 0.4 };
    group.add(flame);
  }

  const sigRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 8, 128), new THREE.MeshStandardMaterial({ color: c2, emissive: c2, emissiveIntensity: 6, transparent: true, opacity: 0.95, roughness: 0, metalness: 1 }));
  sigRing.rotation.x = -Math.PI / 2; sigRing.position.y = 0.09; sigRing.userData.type = 'bmSigil';
  group.add(sigRing);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pts2 = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2)];
    const lg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 2, 0.015, 4, false);
    const lm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 4, transparent: true, opacity: 0.6 });
    const ray = new THREE.Mesh(lg, lm); ray.position.y = 0.01;
    ray.userData = { type: 'bmRay', angle: a }; group.add(ray);
  }

  for (let i = 0; i < 220; i++) {
    const hot = Math.random() > 0.4;
    const col = hot ? c2 : c;
    addParticle(group, col, 0.018 + Math.random() * 0.045, {
      type: 'bloodmage', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 1.6,
      y: Math.random() * 4.5, vy: 0.016 + Math.random() * 0.032,
      vAngle: (Math.random() - 0.5) * 0.055, alpha: 0.65 + Math.random() * 0.35, hot,
    });
  }
}

function buildArchmage(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2, c3 = buff.color3;

  const nebGeo = new THREE.SphereGeometry(2.0, 48, 24);
  const nebMat = new THREE.MeshStandardMaterial({ color: 0x00001a, emissive: c2, emissiveIntensity: 0.08, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
  const neb = new THREE.Mesh(nebGeo, nebMat); neb.position.y = 1.5; neb.userData.type = 'amNeb';
  group.add(neb);

  [[0.55, 0, 1.1], [0.9, Math.PI / 3, 1.5], [1.35, Math.PI * 0.6, 0.9]].forEach(([r, tilt, y], i) => {
    const dg = new THREE.TorusGeometry(r, 0.018, 6, 128);
    const dm = new THREE.MeshStandardMaterial({ color: i === 0 ? c : i === 1 ? c2 : c3, emissive: i === 0 ? c : i === 1 ? c2 : c3, emissiveIntensity: 5, transparent: true, opacity: 0.85, roughness: 0, metalness: 1 });
    const disc = new THREE.Mesh(dg, dm); disc.position.y = y; disc.rotation.x = tilt; disc.rotation.z = tilt * 0.5;
    disc.userData = { type: 'amDisc', i, tilt, baseY: y, speed: 0.4 + i * 0.15 };
    group.add(disc);
  });

  const cubeGeo = new THREE.OctahedronGeometry(0.38, 0);
  const cubeMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2, transparent: true, opacity: 0.6, roughness: 0, metalness: 0.9, wireframe: true });
  const cube = new THREE.Mesh(cubeGeo, cubeMat); cube.position.y = 1.5; cube.userData.type = 'amCube';
  group.add(cube);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const starGrp = new THREE.Group();
    starGrp.position.set(Math.cos(a) * 1.2, 1.4, Math.sin(a) * 1.2);
    const oG = new THREE.IcosahedronGeometry(0.07, 1);
    const oM = new THREE.MeshStandardMaterial({ color: c3, emissive: c3, emissiveIntensity: 10, roughness: 0 });
    starGrp.add(new THREE.Mesh(oG, oM));
    for (let k = 0; k < 3; k++) {
      const mG = new THREE.SphereGeometry(0.025, 6, 4);
      const mM = new THREE.MeshStandardMaterial({ color: c2, emissive: c2, emissiveIntensity: 8, roughness: 0 });
      const mo = new THREE.Mesh(mG, mM); mo.position.set(Math.cos(k / 3 * Math.PI * 2) * 0.14, 0, Math.sin(k / 3 * Math.PI * 2) * 0.14);
      starGrp.add(mo);
    }
    starGrp.userData = { type: 'amStar', angle: a, i, r: 1.2 };
    group.add(starGrp);
  }

  const staffGrp = new THREE.Group();
  const staffBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x224488, emissive: c, emissiveIntensity: 1.5, roughness: 0.3, metalness: 0.8 }));
  staffBar.position.y = 0.9; staffGrp.add(staffBar);
  const staffOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), new THREE.MeshStandardMaterial({ color: c3, emissive: c, emissiveIntensity: 8, roughness: 0 }));
  staffOrb.position.y = 1.85; staffGrp.add(staffOrb);
  staffGrp.position.set(1.2, 1.1, -0.3); staffGrp.rotation.z = 0.25;
  staffGrp.userData = { type: 'amStaff', baseY: 1.1, baseZ: -0.3 };
  group.add(staffGrp);

  for (let i = 0; i < 10; i++) {
    const ag = new THREE.TorusGeometry(0.2 + Math.random() * 0.5, 0.007, 4, 48);
    const am = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 6, transparent: true, opacity: 0.6 });
    const arc = new THREE.Mesh(ag, am); arc.position.y = 1.5;
    arc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    arc.userData = { type: 'amArc', rx: (Math.random() - 0.5) * 0.05, ry: (Math.random() - 0.5) * 0.07, i };
    group.add(arc);
  }

  for (let i = 0; i < 4; i++) {
    const hg = new THREE.TorusGeometry(0.35 + i * 0.32, 0.013, 6, 6);
    const hm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 4, transparent: true, opacity: 0.7 });
    const hex = new THREE.Mesh(hg, hm); hex.rotation.x = -Math.PI / 2; hex.position.y = 0.005;
    hex.userData = { type: 'amHex', i }; group.add(hex);
  }

  for (let i = 0; i < 100; i++) {
    const col = [c, c2, c3 || c][Math.floor(Math.random() * 3)];
    addParticle(group, col, 0.008 + Math.random() * 0.02, {
      type: 'archmage', angle: Math.random() * Math.PI * 2, r: 0.1 + Math.random() * 1.8,
      y: Math.random() * 3.5, vy: (Math.random() - 0.5) * 0.008,
      vAngle: 0.008 + Math.random() * 0.025, alpha: 0.4 + Math.random() * 0.6,
    });
  }
}

function buildWarlord(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2, c3 = buff.color3;

  for (let i = 0; i < 3; i++) {
    const wg = new THREE.SphereGeometry(1.05 + i * 0.15, 28, 14);
    const wm = new THREE.MeshStandardMaterial({ color: i === 0 ? c : c2, emissive: i === 0 ? c : c2, emissiveIntensity: 0.3, transparent: true, opacity: 0.04 + i * 0.015, side: THREE.DoubleSide });
    const ws = new THREE.Mesh(wg, wm); ws.position.y = 1.5; ws.userData = { type: 'warlordShell', i };
    group.add(ws);
  }

  const axeGrp = new THREE.Group();
  const handleAx = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x2a1800, roughness: 0.8, metalness: 0.3 }));
  handleAx.position.y = 0.7; axeGrp.add(handleAx);
  const bladeTorus = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 6, 32, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: 0x888888, emissive: c2, emissiveIntensity: 2, roughness: 0.1, metalness: 0.95 }));
  bladeTorus.position.y = 1.45; bladeTorus.rotation.z = Math.PI / 2; axeGrp.add(bladeTorus);
  const runeAx = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 6 }));
  runeAx.position.set(0, 1.45, 0); runeAx.rotation.y = Math.PI / 2; axeGrp.add(runeAx);
  axeGrp.position.set(-1.5, 1.5, 0.2); axeGrp.rotation.set(0.2, -0.3, 0.15);
  axeGrp.userData = { type: 'warlordAxe', baseY: 1.5, baseX: -1.5 };
  group.add(axeGrp);

  for (let ch = 0; ch < 4; ch++) {
    const pts = []; const sA = (ch / 4) * Math.PI * 2;
    for (let j = 0; j <= 24; j++) {
      const t = j / 24; const a = sA + t * Math.PI * 1.8; const r = 0.4 + t * 0.8;
      pts.push(new THREE.Vector3(Math.cos(a) * r, t * 3 - 0.2, Math.sin(a) * r));
    }
    const cg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.022, 6, false);
    const cm = new THREE.MeshStandardMaterial({ color: 0x888888, emissive: c, emissiveIntensity: 1.5, roughness: 0.3, metalness: 0.9, transparent: true, opacity: 0.85 });
    const chain = new THREE.Mesh(cg, cm); chain.userData = { type: 'warlordChain', sA, ch };
    group.add(chain);
  }

  const fireRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 8, 64), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 5, transparent: true, opacity: 0.85, roughness: 0, metalness: 0.7 }));
  fireRing.position.y = 1.3; fireRing.userData = { type: 'warlordFireRing', baseY: 1.3 };
  group.add(fireRing);

  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const sg = new THREE.TetrahedronGeometry(0.06 + Math.random() * 0.04);
    const sm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c3, emissive: i % 2 === 0 ? c : c3, emissiveIntensity: 4, roughness: 0.1, metalness: 0.9 });
    const shard = new THREE.Mesh(sg, sm);
    const r = 0.8 + Math.random() * 0.6, h = 0.3 + Math.random() * 2.8;
    shard.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    shard.userData = { type: 'warlordShard', angle: a, r, h, rotSpeed: (Math.random() - 0.5) * 0.12 };
    group.add(shard);
  }

  const warCircle = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.05, 8, 128), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 6, transparent: true, opacity: 0.9, roughness: 0, metalness: 0.9 }));
  warCircle.rotation.x = -Math.PI / 2; warCircle.position.y = 0.02; warCircle.userData.type = 'warlordCircle';
  group.add(warCircle);

  const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(1.35, 64), new THREE.MeshStandardMaterial({ color: 0x1a0800, emissive: c, emissiveIntensity: 0.7, transparent: true, opacity: 0.4 }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = 0.01;
  group.add(floorGlow);

  for (let i = 0; i < 100; i++) {
    const hot = Math.random() > 0.4;
    const col = hot ? c2 : c;
    addParticle(group, col, 0.01 + Math.random() * 0.028, {
      type: 'warlord', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 1.4,
      y: Math.random() * 4, vy: 0.012 + Math.random() * 0.018,
      vAngle: (Math.random() - 0.5) * 0.025, alpha: 0.5 + Math.random() * 0.5, hot,
    });
  }
}

function buildTimeGod(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2, c3 = buff.color3;

  for (let i = 0; i < 4; i++) {
    const sg = new THREE.SphereGeometry(0.6 + i * 0.35, 48, 24);
    const sm = new THREE.MeshStandardMaterial({ color: c, emissive: i % 2 === 0 ? c2 : c3, emissiveIntensity: 0.15 + i * 0.05, transparent: true, opacity: 0.025 + i * 0.008, side: THREE.DoubleSide, roughness: 0, metalness: 0.9 });
    const ss = new THREE.Mesh(sg, sm); ss.position.y = 1.5; ss.userData = { type: 'tgShell', i, rotX: (Math.random() - 0.5) * 0.008, rotY: (Math.random() - 0.5) * 0.012, rotZ: (Math.random() - 0.5) * 0.008 };
    group.add(ss);
  }

  for (let d = 0; d < 3; d++) {
    const wg = new THREE.IcosahedronGeometry(0.8 + d * 0.4, d === 0 ? 2 : 1);
    const wm = new THREE.MeshBasicMaterial({ color: d === 0 ? c2 : d === 1 ? c3 : c, transparent: true, opacity: 0.08 + d * 0.02, wireframe: true });
    const ws = new THREE.Mesh(wg, wm); ws.position.y = 1.5; ws.userData = { type: 'tgGrid', d, speed: (d % 2 === 0 ? 1 : -1) * (0.05 + d * 0.04) };
    group.add(ws);
  }

  [[0.45, 0, 1.0], [0.7, 0.4, 1.5], [1.0, 0.9, 1.2], [1.3, 1.5, 0.8]].forEach(([r, tilt, y], i) => {
    const rg = new THREE.TorusGeometry(r, 0.014, 6, 96);
    const rm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c2 : c3, emissive: i % 2 === 0 ? c2 : c3, emissiveIntensity: 6, transparent: true, opacity: 0.85, roughness: 0, metalness: 1 });
    const ring = new THREE.Mesh(rg, rm); ring.position.y = y; ring.rotation.x = tilt; ring.rotation.z = tilt * 0.6;
    ring.userData = { type: 'tgClock', i, tilt, speed: (i % 2 === 0 ? 1 : -1) * (0.08 + i * 0.06) };
    group.add(ring);
  });

  const hourGrp = new THREE.Group(); hourGrp.position.y = 1.5;
  const topCone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 8), new THREE.MeshStandardMaterial({ color: c, emissive: c2, emissiveIntensity: 3, transparent: true, opacity: 0.7, roughness: 0, metalness: 0.95 }));
  topCone.position.y = 0.3; hourGrp.add(topCone);
  const botCone = topCone.clone(); botCone.position.y = -0.3; botCone.rotation.z = Math.PI; hourGrp.add(botCone);
  const midGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: c3, emissive: c3, emissiveIntensity: 12, roughness: 0 }));
  hourGrp.add(midGlow);
  hourGrp.userData = { type: 'tgHourglass' }; group.add(hourGrp);

  for (let i = 0; i < 3; i++) {
    const pg = new THREE.TorusGeometry(0.5 + i * 0.35, 0.02 - i * 0.002, 8, 128);
    const pm = new THREE.MeshStandardMaterial({ color: i === 0 ? c2 : i === 1 ? c3 : c, emissive: i === 0 ? c2 : i === 1 ? c3 : c, emissiveIntensity: 5, transparent: true, opacity: 0.8, roughness: 0, metalness: 1 });
    const pr = new THREE.Mesh(pg, pm); pr.rotation.x = -Math.PI / 2; pr.position.y = 0.01;
    pr.userData = { type: 'tgPortal', i, speed: (i % 2 === 0 ? 1 : -1) * (0.15 + i * 0.1) };
    group.add(pr);
  }

  const portalFill = new THREE.Mesh(new THREE.CircleGeometry(1.2, 64), new THREE.MeshStandardMaterial({ color: 0x05050f, emissive: c3, emissiveIntensity: 0.5, transparent: true, opacity: 0.35 }));
  portalFill.rotation.x = -Math.PI / 2; portalFill.position.y = 0.005;
  group.add(portalFill);

  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2; const r = 0.4 + Math.random() * 1.3; const h = Math.random() * 3.5;
    const fg = new THREE.TetrahedronGeometry(0.04 + Math.random() * 0.06);
    const fm = new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? c : i % 3 === 1 ? c2 : c3, emissive: i % 3 === 0 ? c : i % 3 === 1 ? c2 : c3, emissiveIntensity: 5, roughness: 0, metalness: 0.95, transparent: true, opacity: 0.8 });
    const frag = new THREE.Mesh(fg, fm);
    frag.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    frag.userData = { type: 'tgFrag', angle: a, r, h, rotX: Math.random() * 0.06, rotY: Math.random() * 0.08 };
    group.add(frag);
  }

  for (let i = 0; i < 120; i++) {
    const col = [c, c2, c3 || c][Math.floor(Math.random() * 3)];
    addParticle(group, col, 0.006 + Math.random() * 0.018, {
      type: 'timegod', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 2.0,
      y: Math.random() * 4, vy: (Math.random() - 0.5) * 0.015,
      vAngle: (Math.random() - 0.5) * 0.03, alpha: 0.3 + Math.random() * 0.7,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// NEW AURAS (firegod, crystal, storm, abyssal, solar, quantum)
// ─────────────────────────────────────────────────────────────────

function buildFireGod(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2;

  for (let i = 0; i < 4; i++) {
    const fg = new THREE.SphereGeometry(1.1 + i * 0.18, 32, 16);
    const fm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 0.4 + i * 0.1, transparent: true, opacity: 0.06 + i * 0.02, side: THREE.DoubleSide });
    const fs = new THREE.Mesh(fg, fm); fs.position.y = 1.5; fs.userData = { type: 'firegodShell', i, rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.3 };
    group.add(fs);
  }

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const fg = new THREE.ConeGeometry(0.08 + Math.random() * 0.06, 0.6 + Math.random() * 0.4, 8);
    const fm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 4, transparent: true, opacity: 0.7 });
    const flame = new THREE.Mesh(fg, fm);
    flame.position.set(Math.cos(a) * (0.9 + Math.random() * 0.4), 0.3 + Math.random() * 0.3, Math.sin(a) * (0.9 + Math.random() * 0.4));
    flame.lookAt(0, 2, 0); flame.rotateX(-Math.PI / 2);
    flame.userData = { type: 'firegodFlame', angle: a, baseH: flame.position.y, i };
    group.add(flame);
  }

  const ringGeo = new THREE.TorusGeometry(1.3, 0.05, 8, 128);
  const ringMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 6, transparent: true, opacity: 0.9, roughness: 0, metalness: 0.8 });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.userData.type = 'firegodRing';
  group.add(ring);

  for (let i = 0; i < 200; i++) {
    const col = Math.random() > 0.4 ? c2 : c;
    addParticle(group, col, 0.015 + Math.random() * 0.04, {
      type: 'firegod', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 1.6,
      y: Math.random() * 4.5, vy: 0.02 + Math.random() * 0.035, vAngle: (Math.random() - 0.5) * 0.05, alpha: 0.6 + Math.random() * 0.4,
    });
  }
}

function buildCrystal(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2;

  for (let i = 0; i < 4; i++) {
    const cg = new THREE.OctahedronGeometry(1.2 + i * 0.15, i);
    const cm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 0.3, transparent: true, opacity: 0.06 + i * 0.015, side: THREE.DoubleSide, roughness: 0, metalness: 0.95, wireframe: i < 2 });
    const cs = new THREE.Mesh(cg, cm); cs.position.y = 1.5; cs.userData = { type: 'crystalShell', i, rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.2 };
    group.add(cs);
  }

  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 0.8 + Math.random() * 0.5;
    const h = 0.5 + Math.random() * 2.5;
    const cg = new THREE.OctahedronGeometry(0.06 + Math.random() * 0.05);
    const cm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 5, roughness: 0, metalness: 0.9, transparent: true, opacity: 0.85 });
    const crystal = new THREE.Mesh(cg, cm);
    crystal.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    crystal.userData = { type: 'crystalShard', angle: a, r, baseH: h, i, rotSpeed: 0.02 + Math.random() * 0.04 };
    group.add(crystal);
  }

  for (let i = 0; i < 3; i++) {
    const rg = new THREE.TorusGeometry(0.5 + i * 0.35, 0.015, 6, 96);
    const rm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 4, transparent: true, opacity: 0.7, roughness: 0, metalness: 1 });
    const ring = new THREE.Mesh(rg, rm); ring.position.y = 1.5 + (i - 1) * 0.4; ring.rotation.x = i * 0.3;
    ring.userData = { type: 'crystalRing', i, baseY: ring.position.y };
    group.add(ring);
  }

  for (let i = 0; i < 120; i++) {
    const col = Math.random() > 0.5 ? c : c2;
    addParticle(group, col, 0.01 + Math.random() * 0.025, {
      type: 'crystal', angle: Math.random() * Math.PI * 2, r: 0.1 + Math.random() * 1.5,
      y: Math.random() * 4, vy: (Math.random() - 0.5) * 0.015, vAngle: (Math.random() - 0.5) * 0.03, alpha: 0.4 + Math.random() * 0.6,
    });
  }
}

function buildStorm(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2;

  for (let i = 0; i < 3; i++) {
    const sg = new THREE.SphereGeometry(1.3 + i * 0.2, 32, 16);
    const sm = new THREE.MeshStandardMaterial({ color: c, emissive: c2, emissiveIntensity: 0.2 + i * 0.08, transparent: true, opacity: 0.05 + i * 0.015, side: THREE.DoubleSide, roughness: 0, metalness: 0.9, wireframe: i === 0 });
    const ss = new THREE.Mesh(sg, sm); ss.position.y = 1.5; ss.userData = { type: 'stormShell', i, rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.5 };
    group.add(ss);
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const lg = new THREE.CylinderGeometry(0.01, 0.04, 1.5 + Math.random() * 0.5, 6);
    const lm = new THREE.MeshStandardMaterial({ color: c2, emissive: c2, emissiveIntensity: 8, transparent: true, opacity: 0.8, roughness: 0 });
    const bolt = new THREE.Mesh(lg, lm);
    bolt.position.set(Math.cos(a) * 1.0, 1.5 + Math.random() * 0.5, Math.sin(a) * 1.0);
    bolt.rotation.set(Math.random() * 0.3, a, Math.random() * 0.3);
    bolt.userData = { type: 'stormBolt', angle: a, i, flicker: Math.random() * Math.PI * 2 };
    group.add(bolt);
  }

  for (let i = 0; i < 4; i++) {
    const rg = new THREE.TorusGeometry(0.6 + i * 0.3, 0.02, 6, 96);
    const rm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 5, transparent: true, opacity: 0.8, roughness: 0, metalness: 1 });
    const ring = new THREE.Mesh(rg, rm); ring.position.y = 1.5 + (i - 1.5) * 0.3; ring.rotation.x = i * 0.4;
    ring.userData = { type: 'stormRing', i, speed: (i % 2 === 0 ? 1 : -1) * (0.3 + i * 0.1) };
    group.add(ring);
  }

  for (let i = 0; i < 180; i++) {
    const col = Math.random() > 0.3 ? c2 : c;
    addParticle(group, col, 0.012 + Math.random() * 0.03, {
      type: 'storm', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 1.7,
      y: Math.random() * 4.5, vy: -(0.01 + Math.random() * 0.02), vAngle: (Math.random() - 0.5) * 0.06, alpha: 0.5 + Math.random() * 0.5,
    });
  }
}

function buildAbyssal(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2;

  for (let i = 0; i < 5; i++) {
    const sg = new THREE.SphereGeometry(0.8 + i * 0.25, 32, 16);
    const sm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: c, emissiveIntensity: 0.1 + i * 0.04, transparent: true, opacity: 0.03 + i * 0.01, side: THREE.DoubleSide, roughness: 1, metalness: 0.3 });
    const ss = new THREE.Mesh(sg, sm); ss.position.y = 1.5; ss.userData = { type: 'abyssalShell', i, rotSpeed: (i % 2 === 0 ? 0.3 : -0.2) };
    group.add(ss);
  }

  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const r = 0.5 + Math.random() * 1.2;
    const h = Math.random() * 4;
    const tg = new THREE.TetrahedronGeometry(0.04 + Math.random() * 0.06);
    const tm = new THREE.MeshStandardMaterial({ color: c2, emissive: c, emissiveIntensity: 3, transparent: true, opacity: 0.7, roughness: 0.8 });
    const frag = new THREE.Mesh(tg, tm);
    frag.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    frag.userData = { type: 'abyssalFrag', angle: a, r, baseH: h, i, rotSpeed: (Math.random() - 0.5) * 0.08 };
    group.add(frag);
  }

  const portalGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 128);
  const portalMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 5, transparent: true, opacity: 0.85, roughness: 0, metalness: 1 });
  const portal = new THREE.Mesh(portalGeo, portalMat); portal.rotation.x = -Math.PI / 2; portal.position.y = 0.02; portal.userData.type = 'abyssalPortal';
  group.add(portal);

  for (let i = 0; i < 150; i++) {
    const col = Math.random() > 0.5 ? c : c2;
    addParticle(group, col, 0.008 + Math.random() * 0.025, {
      type: 'abyssal', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 1.6,
      y: Math.random() * 4, vy: -(0.008 + Math.random() * 0.015), vAngle: (Math.random() - 0.5) * 0.025, alpha: 0.3 + Math.random() * 0.7,
    });
  }
}

function buildSolar(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2;

  const coreGeo = new THREE.SphereGeometry(0.5, 32, 16);
  const coreMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 8, transparent: true, opacity: 0.4, roughness: 0, metalness: 0.5 });
  const core = new THREE.Mesh(coreGeo, coreMat); core.position.y = 2.5; core.userData.type = 'solarCore';
  group.add(core);

  for (let i = 0; i < 3; i++) {
    const rg = new THREE.TorusGeometry(0.7 + i * 0.3, 0.025, 8, 128);
    const rm = new THREE.MeshStandardMaterial({ color: i === 0 ? c : c2, emissive: i === 0 ? c : c2, emissiveIntensity: 5, transparent: true, opacity: 0.8, roughness: 0, metalness: 1 });
    const ring = new THREE.Mesh(rg, rm); ring.position.y = 2.5; ring.rotation.x = Math.PI / 2 + i * 0.2;
    ring.userData = { type: 'solarRing', i, speed: (i % 2 === 0 ? 1 : -1) * (0.4 + i * 0.15) };
    group.add(ring);
  }

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rg = new THREE.ConeGeometry(0.04, 0.5, 6);
    const rm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 6, transparent: true, opacity: 0.8, roughness: 0 });
    const ray = new THREE.Mesh(rg, rm);
    ray.position.set(Math.cos(a) * 0.7, 2.5, Math.sin(a) * 0.7);
    ray.lookAt(0, 2.5, 0); ray.rotateX(-Math.PI / 2);
    ray.userData = { type: 'solarRay', angle: a, i };
    group.add(ray);
  }

  for (let i = 0; i < 160; i++) {
    const col = Math.random() > 0.4 ? c : c2;
    addParticle(group, col, 0.015 + Math.random() * 0.035, {
      type: 'solar', angle: Math.random() * Math.PI * 2, r: 0.1 + Math.random() * 1.5,
      y: 1 + Math.random() * 3.5, vy: 0.015 + Math.random() * 0.025, vAngle: (Math.random() - 0.5) * 0.04, alpha: 0.6 + Math.random() * 0.4,
    });
  }
}

function buildQuantum(buff: BuffConfig, group: THREE.Group) {
  const c = buff.color, c2 = buff.color2;

  for (let i = 0; i < 4; i++) {
    const sg = new THREE.SphereGeometry(1.0 + i * 0.2, 48, 24);
    const sm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 0.15 + i * 0.05, transparent: true, opacity: 0.04 + i * 0.012, side: THREE.DoubleSide, roughness: 0, metalness: 0.95, wireframe: i < 2 });
    const ss = new THREE.Mesh(sg, sm); ss.position.y = 1.5; ss.userData = { type: 'quantumShell', i, rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.3 + i * 0.1) };
    group.add(ss);
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rg = new THREE.TorusGeometry(0.5 + i * 0.12, 0.015, 6, 96);
    const rm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c : c2, emissive: i % 2 === 0 ? c : c2, emissiveIntensity: 5, transparent: true, opacity: 0.75, roughness: 0, metalness: 1 });
    const ring = new THREE.Mesh(rg, rm); ring.position.y = 1.5; ring.rotation.set(Math.random() * Math.PI, a, Math.random() * Math.PI);
    ring.userData = { type: 'quantumRing', i, speed: (i % 2 === 0 ? 1 : -1) * (0.2 + i * 0.08), rotX: (Math.random() - 0.5) * 0.03, rotY: (Math.random() - 0.5) * 0.04 };
    group.add(ring);
  }

  const nexusGeo = new THREE.IcosahedronGeometry(0.15, 1);
  const nexusMat = new THREE.MeshStandardMaterial({ color: c2, emissive: c, emissiveIntensity: 10, roughness: 0, metalness: 1, transparent: true, opacity: 0.9 });
  const nexus = new THREE.Mesh(nexusGeo, nexusMat); nexus.position.y = 1.5; nexus.userData.type = 'quantumNexus';
  group.add(nexus);

  for (let i = 0; i < 140; i++) {
    const col = Math.random() > 0.5 ? c : c2;
    addParticle(group, col, 0.01 + Math.random() * 0.028, {
      type: 'quantum', angle: Math.random() * Math.PI * 2, r: 0.05 + Math.random() * 1.7,
      y: Math.random() * 4, vy: (Math.random() - 0.5) * 0.018, vAngle: (Math.random() - 0.5) * 0.045, alpha: 0.4 + Math.random() * 0.6,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// PARTICLE HELPER
// ─────────────────────────────────────────────────────────────────

function addParticle(group: THREE.Group, color: THREE.Color | undefined, size: number, data: Record<string, unknown>) {
  if (!color) color = new THREE.Color(0xffffff);
  const geo = new THREE.SphereGeometry(1, 6, 4);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 6, transparent: true, roughness: 0, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(size);
  mesh.userData = { isParticle: true, ...data, idx: Math.floor(Math.random() * 1000) };
  group.add(mesh);
}

// ─────────────────────────────────────────────────────────────────
// BUFFS REGISTRY
// ─────────────────────────────────────────────────────────────────

const BUFFS: Record<AuraType, BuffConfig> = {
  divine: { color: new THREE.Color(1.0, 0.88, 0.2), color2: new THREE.Color(1.0, 1.0, 0.8), lightColor: 0xffe066, build: buildDivineShield },
  void: { color: new THREE.Color(0.55, 0.22, 1.0), color2: new THREE.Color(0.8, 0.4, 1.0), lightColor: 0xaa44ff, build: buildVoidAura },
  blood: { color: new THREE.Color(1.0, 0.08, 0.08), color2: new THREE.Color(1.0, 0.4, 0.0), lightColor: 0xff2200, build: buildBloodAura },
  frost: { color: new THREE.Color(0.0, 0.82, 1.0), color2: new THREE.Color(0.6, 0.96, 1.0), lightColor: 0x00ccff, build: buildFrostAura },
  nature: { color: new THREE.Color(0.1, 1.0, 0.4), color2: new THREE.Color(0.6, 1.0, 0.2), lightColor: 0x22ff66, build: buildNatureAura },
  chaos: { color: new THREE.Color(1.0, 0.5, 0.0), color2: new THREE.Color(1.0, 0.9, 0.0), lightColor: 0xff8800, build: buildChaosAura },
  lichking: { color: new THREE.Color(0.4, 0.75, 1.0), color2: new THREE.Color(0.8, 0.95, 1.0), color3: new THREE.Color(0.0, 0.3, 0.6), lightColor: 0x44aaff, build: buildLichKing },
  demonhunter: { color: new THREE.Color(0.6, 0.0, 1.0), color2: new THREE.Color(1.0, 0.3, 0.0), color3: new THREE.Color(0.0, 0.8, 0.3), lightColor: 0x8800ff, build: buildDemonHunter },
  bloodmage: { color: new THREE.Color(1.0, 0.15, 0.0), color2: new THREE.Color(1.0, 0.7, 0.0), color3: new THREE.Color(0.8, 0.0, 0.2), lightColor: 0xff2200, build: buildBloodMage },
  archmage: { color: new THREE.Color(0.0, 0.65, 1.0), color2: new THREE.Color(0.6, 0.0, 1.0), color3: new THREE.Color(1.0, 1.0, 1.0), lightColor: 0x0088ff, build: buildArchmage },
  warlord: { color: new THREE.Color(1.0, 0.55, 0.0), color2: new THREE.Color(1.0, 0.2, 0.0), color3: new THREE.Color(0.9, 0.8, 0.1), lightColor: 0xff6600, build: buildWarlord },
  timegod: { color: new THREE.Color(0.9, 0.9, 1.0), color2: new THREE.Color(0.4, 0.8, 1.0), color3: new THREE.Color(0.8, 0.5, 1.0), lightColor: 0xaaaaff, build: buildTimeGod },
  firegod: { color: new THREE.Color(1.0, 0.4, 0.0), color2: new THREE.Color(1.0, 0.9, 0.0), lightColor: 0xff4400, build: buildFireGod },
  crystal: { color: new THREE.Color(0.2, 0.9, 0.9), color2: new THREE.Color(0.8, 0.5, 1.0), lightColor: 0x44ffcc, build: buildCrystal },
  storm: { color: new THREE.Color(0.2, 0.6, 1.0), color2: new THREE.Color(0.92, 0.96, 1.0), lightColor: 0x4488ff, build: buildStorm },
  abyssal: { color: new THREE.Color(0.5, 0.0, 0.8), color2: new THREE.Color(0.15, 0.0, 0.5), lightColor: 0x6600aa, build: buildAbyssal },
  solar: { color: new THREE.Color(1.0, 0.86, 0.0), color2: new THREE.Color(1.0, 0.5, 0.0), lightColor: 0xffcc00, build: buildSolar },
  quantum: { color: new THREE.Color(0.8, 0.2, 1.0), color2: new THREE.Color(0.2, 0.8, 1.0), lightColor: 0xaa22ff, build: buildQuantum },
};

export function buildAura(auraId: AuraType, auraGroup: THREE.Group, scene: THREE.Scene) {
  const buff = BUFFS[auraId];
  if (!buff) return;

  // Update buff light
  scene.traverse(child => {
    if (child instanceof THREE.PointLight && child.userData.isBuffLight) {
      child.color.setHex(buff.lightColor);
      child.intensity = 3.5;
    }
  });

  // Update rune ring
  scene.traverse(child => {
    if (child instanceof THREE.Mesh && child.userData.isRuneRing) {
      const mat = child.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(buff.lightColor);
      mat.emissiveIntensity = 2;
      mat.color.setHex(buff.lightColor);
    }
  });

  buff.build(buff, auraGroup);
}

export function clearAura(auraGroup: THREE.Group) {
  while (auraGroup.children.length > 0) {
    const child = auraGroup.children[0];
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material.dispose();
      }
    }
    auraGroup.remove(child);
  }
}

