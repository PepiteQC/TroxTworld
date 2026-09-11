import * as THREE from "three";
import { matLib } from "./materials";
import { finishMap } from "./textures";

export interface HotelTvSetup {
  tvGroup: THREE.Group;
  lampGroup: THREE.Group;
  windowGroup: THREE.Group;
  screenLight: THREE.PointLight;
  tickTv: (t: number, on: boolean) => void;
  tvInteract: THREE.Object3D;
}

function buildCityTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 600;
  const ctx = c.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, "#070b1c");
  sky.addColorStop(0.55, "#0c1430");
  sky.addColorStop(1, "#1a2240");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 768, 600);
  const moon = ctx.createRadialGradient(600, 110, 0, 600, 110, 90);
  moon.addColorStop(0, "rgba(220,225,255,0.35)");
  moon.addColorStop(1, "rgba(220,225,255,0)");
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, 768, 600);
  ctx.fillStyle = "#eef0f8";
  ctx.beginPath();
  ctx.arc(600, 110, 22, 0, Math.PI * 2);
  ctx.fill();
  const layer = (minH: number, maxH: number, color: string, win: string, a: number) => {
    let x = -20;
    while (x < 800) {
      const w = 40 + Math.random() * 70;
      const h = minH + Math.random() * (maxH - minH);
      ctx.fillStyle = color;
      ctx.fillRect(x, 600 - h, w, h);
      const rows = Math.floor(h / 18);
      const cols = Math.floor(w / 14);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          if (Math.random() < a) {
            ctx.fillStyle = win;
            ctx.fillRect(x + 4 + col * 14, 600 - h + 6 + r * 18, 6, 9);
          }
        }
      }
      x += w + 6 + Math.random() * 10;
    }
  };
  layer(140, 340, "#060912", "rgba(255,200,120,0.55)", 0.22);
  layer(200, 430, "#03040a", "rgba(255,225,170,0.85)", 0.16);
  const tex = new THREE.CanvasTexture(c);
  return finishMap(tex, "clamp");
}

function buildScreenCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  finishMap(tex, "ui");

  function badge(t: number, caption: string) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "rgba(10,8,6,0.55)";
    ctx.fillRect(0, h - 42, w, 42);
    ctx.fillStyle = "#ffd9a8";
    ctx.font = "700 18px Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText("BEST LIFE", 16, h - 26);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "400 11px Georgia, serif";
    ctx.fillText(caption, 16, h - 12);
    ctx.fillStyle = `rgba(255,70,70,${0.5 + 0.5 * Math.sin(t * 6)})`;
    ctx.beginPath();
    ctx.arc(w - 36, h - 21, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "600 10px Georgia, serif";
    ctx.fillText("LIVE", w - 28, h - 21);
  }

  function scenePool(t: number) {
    const w = canvas.width;
    const h = canvas.height;
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, "#ff9d5c");
    sky.addColorStop(0.5, "#ff7a6b");
    sky.addColorStop(1, "#a85a86");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.55);
    ctx.fillStyle = "#fff4d8";
    ctx.beginPath();
    ctx.arc(w * 0.65, h * 0.32, 22, 0, Math.PI * 2);
    ctx.fill();
    const water = ctx.createLinearGradient(0, h * 0.5, 0, h);
    water.addColorStop(0, "#2a8fa0");
    water.addColorStop(1, "#0c3f55");
    ctx.fillStyle = water;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.strokeStyle = "rgba(255,230,190,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const ly = h * 0.55 + i * 16;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const yy = ly + Math.sin(x * 0.05 + t * 1.8 + i) * 3;
        if (x === 0) {
          ctx.moveTo(x, yy);
        } else {
          ctx.lineTo(x, yy);
        }
      }
      ctx.stroke();
    }
    ctx.fillStyle = "#e9e3d6";
    ctx.fillRect(0, h * 0.5 - 5, w, 8);
    badge(t, "INFINITY POOL · MARRAKECH");
  }

  function sceneSuite(t: number) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#1b140f";
    ctx.fillRect(0, 0, w, h);
    const x0 = w * 0.42;
    const y0 = h * 0.12;
    const ww = w * 0.5;
    const hh = h * 0.62;
    const cs = ctx.createLinearGradient(0, y0, 0, y0 + hh);
    cs.addColorStop(0, "#2a3a66");
    cs.addColorStop(1, "#f2a866");
    ctx.fillStyle = cs;
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = "rgba(10,8,15,0.85)";
    let bx = x0;
    while (bx < x0 + ww) {
      const bw = 12 + ((bx * 13) % 18);
      const bh = 28 + ((bx * 7) % 70);
      ctx.fillRect(bx, y0 + hh - bh, bw, bh);
      bx += bw + 4;
    }
    ctx.strokeStyle = "#0a0805";
    ctx.lineWidth = 6;
    ctx.strokeRect(x0, y0, ww, hh);
    ctx.fillStyle = "#3a2a1f";
    ctx.fillRect(0, h * 0.66, w * 0.46, h * 0.34);
    ctx.fillStyle = "#e9ddc8";
    ctx.fillRect(w * 0.02, h * 0.6, w * 0.38, h * 0.1);
    badge(t, "SKYLINE SUITE · NIGHT VIEW");
  }

  function sceneBar(t: number) {
    const w = canvas.width;
    const h = canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#150a18");
    g.addColorStop(1, "#2a0f1a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,180,90,0.7)" : "rgba(120,60,150,0.5)";
      ctx.fillRect(w * 0.08 + i * ((w * 0.84) / 12), h * 0.12, 10, 48 + Math.sin(i * 1.7) * 14);
    }
    const gx = w * 0.5;
    const gy = h * 0.62;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx - 36, gy - 24);
    ctx.lineTo(gx, gy + 26);
    ctx.lineTo(gx + 36, gy - 24);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,140,90,0.85)";
    ctx.beginPath();
    ctx.moveTo(gx - 26, gy - 8);
    ctx.lineTo(gx, gy + 18);
    ctx.lineTo(gx + 26, gy - 8);
    ctx.fill();
    badge(t, "ROOFTOP LOUNGE · GOLDEN HOUR");
  }

  const scenes = [scenePool, sceneSuite, sceneBar];

  function drawOff() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    tex.needsUpdate = true;
  }

  function drawOn(t: number) {
    scenes[Math.floor(t / 6) % scenes.length]!(t);
    tex.needsUpdate = true;
  }

  return { tex, drawOff, drawOn };
}

export function buildHotelTvSetup(rcx: number, rcz: number, H: number): HotelTvSetup {
  const TV_W = 1.1;
  const TV_H = 0.62;
  const tvGroup = new THREE.Group();
  tvGroup.position.set(rcx - 2.15, 1.45, rcz + 1.4);

  const body = new THREE.Mesh(new THREE.BoxGeometry(TV_W + 0.05, TV_H + 0.05, 0.05), matLib.get(0x111114, 0.35, 0.6));
  body.castShadow = true;
  tvGroup.add(body);
  const bulge = new THREE.Mesh(new THREE.BoxGeometry(TV_W * 0.35, TV_H * 0.5, 0.07), matLib.get(0x080808, 0.55, 0.3));
  bulge.position.z = -0.055;
  tvGroup.add(bulge);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), matLib.get(0x0a0a0a, 0.3, 0.7));
  stem.position.set(0, -(TV_H / 2 + 0.08), -0.01);
  tvGroup.add(stem);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.24), matLib.get(0x0a0a0a, 0.3, 0.7));
  base.position.set(0, -(TV_H / 2 + 0.18), 0.04);
  tvGroup.add(base);

  const { tex, drawOff, drawOn } = buildScreenCanvas();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(TV_W, TV_H), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = 0.028;
  tvGroup.add(screen);
  const ledMat = matLib.getEmissive(0x55ddff, 0x55ddff, 0.05);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), ledMat);
  led.position.set(0, -(TV_H / 2) - 0.012, 0.028);
  tvGroup.add(led);

  const screenLight = new THREE.PointLight(0xffb070, 0, 5, 2);
  screenLight.position.set(rcx - 2.15, 1.45, rcz + 0.9);

  const tvInteract = new THREE.Object3D();
  tvInteract.name = "tv_interact";
  tvInteract.position.set(rcx - 2.15, 1.45, rcz + 1.8);

  const lampGroup = new THREE.Group();
  lampGroup.position.set(rcx - 2.15, 0, rcz + 1.4);
  const LAMP_Y = H - 0.35;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, H * 0.18, 6), matLib.get(0x050505, 0.6, 0.2));
  cord.position.set(0, H - H * 0.09, 0);
  lampGroup.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 20, 1, true), matLib.get(0x121212, 0.5, 0.55));
  (shade.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  shade.position.set(0, LAMP_Y + 0.04, 0);
  lampGroup.add(shade);
  const innerGlowMat = matLib.getEmissive(0xffdca8, 0xffb060, 2.2);
  innerGlowMat.side = THREE.BackSide;
  const innerGlow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 20, 1, true), innerGlowMat);
  innerGlow.position.set(0, LAMP_Y + 0.05, 0);
  lampGroup.add(innerGlow);
  const bulbMat = matLib.getEmissive(0xfff3d8, 0xffcf8a, 3.5);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), bulbMat);
  bulb.position.set(0, LAMP_Y - 0.04, 0);
  lampGroup.add(bulb);
  const lampSpot = new THREE.SpotLight(0xffc98a, 8, 6, Math.PI / 7, 0.5, 1.8);
  lampSpot.position.set(0, LAMP_Y, 0);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, 0, 0);
  lampGroup.add(spotTarget);
  lampSpot.target = spotTarget;
  lampGroup.add(lampSpot);
  const bulbGlow = new THREE.PointLight(0xffb060, 0.8, 1.2, 2.5);
  bulbGlow.position.set(0, LAMP_Y, 0);
  lampGroup.add(bulbGlow);

  const windowGroup = new THREE.Group();
  const city = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshBasicMaterial({ map: buildCityTexture() }));
  city.rotation.y = -Math.PI / 2;
  windowGroup.add(city);
  const frame = matLib.get(0xf2f0ea, 0.75);
  const FW = 2.6;
  const FH = 1.6;
  for (const [w, h, d, x, y, z] of [
    [0.02, 0.055, FW + 0.11, 0, FH / 2 + 0.03, 0],
    [0.02, 0.055, FW + 0.11, 0, -FH / 2 - 0.03, 0],
    [0.02, FH, 0.055, 0, 0, -FW / 2 - 0.03],
    [0.02, FH, 0.055, 0, 0, FW / 2 + 0.03],
    [0.015, FH, 0.03, 0, 0, 0],
  ] as const) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frame);
    bar.position.set(x, y, z);
    windowGroup.add(bar);
  }
  const glazeMat = matLib.get(0x3a4a66, 0.04);
  glazeMat.transparent = true;
  glazeMat.opacity = 0.12;
  const glaze = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), glazeMat);
  glaze.rotation.y = -Math.PI / 2;
  glaze.position.x = 0.01;
  windowGroup.add(glaze);
  const cityLight = new THREE.PointLight(0x3d5a8c, 1.2, 5, 2);
  cityLight.position.set(-0.6, 0, 0);
  windowGroup.add(cityLight);

  let flick = 1;
  let flickTarget = 1;
  let flickAt = 0;
  let nextDim = 4;
  let screenI = 0;
  let lastDraw = -1;

  function tickTv(t: number, on: boolean) {
    if (t > flickAt) {
      flickTarget = 0.55 + Math.random() * 0.6;
      flickAt = t + 0.05 + Math.random() * 0.22;
    }
    flick += (flickTarget - flick) * 0.35;
    let dim = 0;
    if (t > nextDim) {
      const phase = t - nextDim;
      if (phase < 0.18) dim = -0.85 * (1 - phase / 0.18);
      else nextDim = t + 5 + Math.random() * 7;
    }
    const f = Math.max(0.04, flick + (Math.random() - 0.5) * 0.06 + dim);
    lampSpot.intensity = 8 * f;
    bulbGlow.intensity = 0.8 * f;
    bulbMat.emissiveIntensity = 3.5 * f;
    innerGlowMat.emissiveIntensity = 2.2 * f;
    if (on) {
      const frame = Math.floor(t * 12);
      if (frame !== lastDraw) {
        lastDraw = frame;
        drawOn(t);
      }
      screenI += (3.8 - screenI) * 0.08;
      ledMat.emissiveIntensity = 1.4;
    } else {
      if (lastDraw !== -2) {
        lastDraw = -2;
        drawOff();
      }
      screenI += (0 - screenI) * 0.08;
      ledMat.emissiveIntensity = 0.05;
    }
    screenLight.intensity = screenI;
  }

  return { tvGroup, lampGroup, windowGroup, screenLight, tickTv, tvInteract };
}
