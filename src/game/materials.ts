/**
 * Bibliothèque de matériaux PBR procéduraux — Comté de Portneuf authentique.
 * Textures générées via Canvas (bois, pierre, brique, tôle, neige, herbe, asphalte).
 * Normal maps procédurales pour le relief de surface.
 * Fichier: src/game/materials.ts
 */
import * as THREE from "three";
import { wireCsm } from "./csm";

<<<<<<< HEAD
/* =========================================================================
   PALETTE DE COULEURS QUÉBÉCOISE AUTHENTIQUE
   ========================================================================= */

export const QC_PALETTE = {
  // Bois québécois
=======
// ============================================================================
// PALETTE QUÉBÉCOISE ENRICHE
// ============================================================================
export const QC_PALETTE = {
  // Bois traditionnels
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  boisBlanc: 0xe8e4d8,
  boisCreme: 0xd8cfb8,
  boisGris: 0xa8a49a,
  boisBleu: 0x8fa8b8,
  boisVert: 0x7a8f78,
  boisRouge: 0xa04838,
<<<<<<< HEAD
  boisErable: 0xb08850,
  boisChene: 0x7a5a30,
  boisSapin: 0x5a4a38,
  boisNoyer: 0x4a3020,

  // Pierre locale
=======
  boisNaturel: 0xa07848,
  boisClair: 0xd4b888,
  
  // Pierre et maçonnerie
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  pierreChamps: 0x9a9086,
  pierreGrise: 0x8a8580,
  pierreBeige: 0xb0a898,
  pierreFoncee: 0x5a5852,
  pierreCalcaire: 0xc8c0b0,

  // Brique
  brique: 0x8f4a38,
<<<<<<< HEAD
  briqueFoncee: 0x6a3428,
  briqueClaire: 0xb06848,

  // Tôle québécoise (toits)
=======
  beton: 0x8a8a86,
  betonNeutre: 0x9a9894,
  fondation: 0x6a6660,
  
  // Toiture
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  toleRouge: 0x8f3628,
  toleVerte: 0x2f5a42,
  toleNoire: 0x2a2a2e,
  toleBleue: 0x3a5570,
  bardeauGris: 0x4a4844,
  toleArgent: 0xb8bcc0,
<<<<<<< HEAD
  toleRouille: 0x8a4a2a,

  // Architecture
=======
  
  // Menuiserie
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  boiserie: 0xf0ece0,
  boiserieVerte: 0x1f4030,
  porte: 0x5a3a28,
  galerie: 0xc8c0b0,
  cheminee: 0x7a4438,
<<<<<<< HEAD
  fondation: 0x6a6660,
  beton: 0x8a8a86,

  // Commerce PBR — palette québécoise + SQDC
  acier: 0x8a9099,
  rouille: 0x8a3a1c,
  boisNaturel: 0xa07848,
  boisClair: 0xd4b888,
  noirMat: 0x1a1c1e,
  sqdcVert: 0x1a5632,
  betonNeutre: 0x9a9894,
  verre: 0xc8dce8,

  // Sols et terrains
  asphalte: 0x3a3a3c,
  gravier: 0x9a9488,
  terre: 0x6a5040,
  sable: 0xc8b898,
  gazon: 0x3e6a34,
  gazonSec: 0x7a8a48,

  // Hiver
  neige: 0xf0f0f8,
  neigeSale: 0xc8c8d0,
  glace: 0xd0e0f0,
  givre: 0xe0e8f0,
=======
  
  // Commerce et industriel
  acier: 0x8a9099,
  rouille: 0x8a3a1c,
  noirMat: 0x1a1c1e,
  sqdcVert: 0x1a5632,
  
  // Verre et fenêtres
  fenetre: 0x2a3a48,
  fenetreEclairee: 0xffd88a,
  verre: 0xc8dce8,
  
  // Nature et saisons
  neige: 0xf8f8ff,
  glace: 0xd4e8f0,
  asphalte: 0x2a2a2e,
  asphalteMouille: 0x1a1a1e,
  gravier: 0x8a8580,
  terre: 0x5a4a3a,
  boue: 0x4a3a2a,
  
  // Véhicules
  carPaintRed: 0xc03028,
  carPaintBlue: 0x2a4a8a,
  carPaintBlack: 0x1a1a1e,
  carPaintWhite: 0xf0f0f0,
  chrome: 0xd8dce0,
  aluminium: 0xb8bcc0,
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
};

export const WALL_COLORS = [
  QC_PALETTE.boisBlanc,
  QC_PALETTE.boisCreme,
  QC_PALETTE.boisGris,
  QC_PALETTE.boisBleu,
  QC_PALETTE.boisVert,
  QC_PALETTE.boisRouge,
];

export const ROOF_COLORS = [
  QC_PALETTE.toleRouge,
  QC_PALETTE.toleVerte,
  QC_PALETTE.toleNoire,
  QC_PALETTE.toleBleue,
  QC_PALETTE.bardeauGris,
];

<<<<<<< HEAD
/* =========================================================================
   TYPES ET HELPERS
   ========================================================================= */

export type QcMat = THREE.MeshLambertMaterial | THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

export function usePbr(roughness: number, metalness: number) {
  return metalness > 0.18 || roughness < 0.28;
}

function parseHex(hex: string | number): number {
  if (typeof hex === "number") return hex;
  return parseInt(hex.replace("#", ""), 16);
}

/* =========================================================================
   GÉNÉRATEURS DE TEXTURES PROCÉDURALES (Canvas 2D → THREE.Texture)
   Aucune image externe requise — tout est généré à la volée.
   ========================================================================= */

const texCache = new Map<string, THREE.CanvasTexture>();

function getCachedTex(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const cached = texCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

/** Bruit de Perlin simplifié pour les textures procédurales */
function noise2D(x: number, y: number, seed = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, octaves = 4, seed = 0): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, seed + i * 17);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

/** Texture de grain de bois */
function makeWoodTexture(baseColor: THREE.Color, size = 256): THREE.CanvasTexture {
  const r = Math.round(baseColor.r * 255);
  const g = Math.round(baseColor.g * 255);
  const b = Math.round(baseColor.b * 255);
  const key = `wood_${r}_${g}_${b}_${size}`;

  return getCachedTex(key, size, (ctx, w, h) => {
    // Fond
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, w, h);

    // Grain horizontal
    for (let y = 0; y < h; y++) {
      const grain = Math.sin(y * 0.3 + fbm(0, y * 0.02, 3) * 8) * 0.5 + 0.5;
      const variation = fbm(y * 0.05, 0, 4, 42) * 30 - 15;
      const alpha = grain * 0.15 + 0.02;
      const dr = Math.max(0, Math.min(255, r + variation));
      const dg = Math.max(0, Math.min(255, g + variation * 0.8));
      const db = Math.max(0, Math.min(255, b + variation * 0.5));
      ctx.fillStyle = `rgba(${Math.round(dr)},${Math.round(dg)},${Math.round(db)},${alpha})`;
      ctx.fillRect(0, y, w, 1);
    }

    // Nœuds de bois occasionnels
    const nKnots = 2 + Math.floor(noise2D(r, g) * 3);
    for (let i = 0; i < nKnots; i++) {
      const kx = noise2D(i, 0, r) * w;
      const ky = noise2D(0, i, g) * h;
      const kr = 4 + noise2D(i, i) * 8;
      const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      grad.addColorStop(0, `rgba(${Math.max(0, r - 40)},${Math.max(0, g - 35)},${Math.max(0, b - 25)},0.6)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(kx - kr, ky - kr, kr * 2, kr * 2);
    }
  });
}

/** Normal map de grain de bois */
function makeWoodNormal(size = 256): THREE.CanvasTexture {
  const key = `wood_normal_${size}`;
  return getCachedTex(key, size, (ctx, w, h) => {
    ctx.fillStyle = "rgb(128,128,255)"; // Normal par défaut (plat)
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y++) {
      const grain = Math.sin(y * 0.3 + fbm(0, y * 0.02, 3) * 8);
      const nx = 128 + grain * 15;
      const ny = 128 + Math.cos(y * 0.15) * 8;
      ctx.fillStyle = `rgb(${Math.round(nx)},${Math.round(ny)},255)`;
      ctx.fillRect(0, y, w, 1);
    }
  });
}

/** Texture de pierre / champêtre */
function makeStoneTexture(baseColor: THREE.Color, size = 256): THREE.CanvasTexture {
  const r = Math.round(baseColor.r * 255);
  const g = Math.round(baseColor.g * 255);
  const b = Math.round(baseColor.b * 255);
  const key = `stone_${r}_${g}_${b}_${size}`;

  return getCachedTex(key, size, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = fbm(x * 0.03, y * 0.03, 5, 77);
        const detail = noise2D(x * 0.1, y * 0.1, 33) * 0.15;
        const variation = (n + detail - 0.5) * 50;

        data[idx] = Math.max(0, Math.min(255, r + variation));
        data[idx + 1] = Math.max(0, Math.min(255, g + variation * 0.9));
        data[idx + 2] = Math.max(0, Math.min(255, b + variation * 0.8));
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Joints de pierre (lignes sombres)
    ctx.strokeStyle = `rgba(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 35)},0.3)`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const y = (i / 6) * h + noise2D(i, 0) * 15;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 20) {
        ctx.lineTo(x, y + noise2D(x, i) * 4);
      }
      ctx.stroke();
    }
  });
}

/** Normal map de pierre */
function makeStoneNormal(size = 256): THREE.CanvasTexture {
  const key = `stone_normal_${size}`;
  return getCachedTex(key, size, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = fbm(x * 0.04, y * 0.04, 4, 55);
        data[idx] = Math.round(128 + (n - 0.5) * 40);
        data[idx + 1] = Math.round(128 + (fbm(x * 0.04 + 100, y * 0.04, 4, 55) - 0.5) * 40);
        data[idx + 2] = 230;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  });
}

/** Texture de brique */
function makeBrickTexture(baseColor: THREE.Color, size = 256): THREE.CanvasTexture {
  const r = Math.round(baseColor.r * 255);
  const g = Math.round(baseColor.g * 255);
  const b = Math.round(baseColor.b * 255);
  const key = `brick_${r}_${g}_${b}_${size}`;

  return getCachedTex(key, size, (ctx, w, h) => {
    // Mortier (joints)
    ctx.fillStyle = `rgb(${Math.min(255, r + 60)},${Math.min(255, g + 55)},${Math.min(255, b + 50)})`;
    ctx.fillRect(0, 0, w, h);

    const brickH = h / 8;
    const brickW = w / 4;
    const jointW = 2;

    for (let row = 0; row < 8; row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = -1; col < 5; col++) {
        const bx = col * brickW + offset + jointW;
        const by = row * brickH + jointW;
        const bw = brickW - jointW * 2;
        const bh = brickH - jointW * 2;

        // Variation de couleur par brique
        const variation = (noise2D(col + row * 10, row, 42) - 0.5) * 30;
        const br2 = Math.max(0, Math.min(255, r + variation));
        const bg2 = Math.max(0, Math.min(255, g + variation * 0.7));
        const bb2 = Math.max(0, Math.min(255, b + variation * 0.5));

        ctx.fillStyle = `rgb(${Math.round(br2)},${Math.round(bg2)},${Math.round(bb2)})`;
        ctx.fillRect(bx, by, bw, bh);

        // Texture de surface de la brique
        for (let i = 0; i < 12; i++) {
          const px = bx + noise2D(i, col, row) * bw;
          const py = by + noise2D(col, i, row) * bh;
          const alpha = noise2D(i, i, col + row) * 0.12;
          ctx.fillStyle = `rgba(0,0,0,${alpha})`;
          ctx.fillRect(px, py, 2, 2);
        }
      }
    }
  });
}

/** Texture de tôle ondulée */
function makeCorrugatedTexture(baseColor: THREE.Color, size = 256): THREE.CanvasTexture {
  const r = Math.round(baseColor.r * 255);
  const g = Math.round(baseColor.g * 255);
  const b = Math.round(baseColor.b * 255);
  const key = `corrugated_${r}_${g}_${b}_${size}`;

  return getCachedTex(key, size, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const wave = Math.sin(x * 0.25) * 0.5 + 0.5;
      const highlight = wave * 25 - 12;
      const cr = Math.max(0, Math.min(255, r + highlight));
      const cg = Math.max(0, Math.min(255, g + highlight));
      const cb = Math.max(0, Math.min(255, b + highlight));
      ctx.fillStyle = `rgb(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)})`;
      ctx.fillRect(x, 0, 1, h);
    }

    // Rouille et usure
    for (let i = 0; i < 20; i++) {
      const rx = noise2D(i, 0, 99) * w;
      const ry = noise2D(0, i, 99) * h;
      const rr = 3 + noise2D(i, i) * 12;
      const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      grad.addColorStop(0, `rgba(138,58,28,0.25)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }
  });
}

/** Normal map de tôle ondulée */
function makeCorrugatedNormal(size = 256): THREE.CanvasTexture {
  const key = `corrugated_normal_${size}`;
  return getCachedTex(key, size, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const nx = 128 + Math.cos(x * 0.25) * 50;
      ctx.fillStyle = `rgb(${Math.round(nx)},128,240)`;
      ctx.fillRect(x, 0, 1, h);
    }
  });
}

/** Texture d'herbe / gazon */
function makeGrassTexture(baseColor: THREE.Color, size = 256): THREE.CanvasTexture {
  const r = Math.round(baseColor.r * 255);
  const g = Math.round(baseColor.g * 255);
  const b = Math.round(baseColor.b * 255);
  const key = `grass_${r}_${g}_${b}_${size}`;

  return getCachedTex(key, size, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = fbm(x * 0.05, y * 0.05, 4, 123);
        const blade = noise2D(x * 0.3, y * 0.3, 77) * 0.2;
        const variation = (n + blade - 0.5) * 40;

        data[idx] = Math.max(0, Math.min(255, r + variation * 0.5));
        data[idx + 1] = Math.max(0, Math.min(255, g + variation));
        data[idx + 2] = Math.max(0, Math.min(255, b + variation * 0.3));
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Brins d'herbe
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 200; i++) {
      const bx = noise2D(i, 0, 55) * w;
      const by = noise2D(0, i, 55) * h;
      const bh = 3 + noise2D(i, i) * 6;
      const lean = (noise2D(i, 0, 33) - 0.5) * 4;
      const green = Math.round(80 + noise2D(i, 0) * 60);
      ctx.strokeStyle = `rgba(30,${green},20,0.3)`;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + lean, by - bh);
      ctx.stroke();
    }
  });
}

/** Texture d'asphalte */
function makeAsphaltTexture(size = 256): THREE.CanvasTexture {
  const key = `asphalt_${size}`;
  return getCachedTex(key, size, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = fbm(x * 0.06, y * 0.06, 5, 200);
        const gravel = noise2D(x * 0.2, y * 0.2, 88) * 15;
        const base = 50 + n * 30 + gravel;

        data[idx] = Math.round(base);
        data[idx + 1] = Math.round(base + 2);
        data[idx + 2] = Math.round(base + 4);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Fissures
    ctx.strokeStyle = "rgba(30,30,32,0.4)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      let cx = noise2D(i, 0, 111) * w;
      let cy = noise2D(0, i, 111) * h;
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 8; j++) {
        cx += (noise2D(j, i, 222) - 0.5) * 30;
        cy += noise2D(i, j, 333) * 20;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  });
}

/** Texture de neige */
function makeSnowTexture(size = 256): THREE.CanvasTexture {
  const key = `snow_${size}`;
  return getCachedTex(key, size, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = fbm(x * 0.04, y * 0.04, 4, 300);
        const sparkle = noise2D(x * 0.5, y * 0.5, 44) > 0.92 ? 15 : 0;
        const base = 230 + n * 20 + sparkle;

        data[idx] = Math.min(255, Math.round(base));
        data[idx + 1] = Math.min(255, Math.round(base + 2));
        data[idx + 2] = Math.min(255, Math.round(base + 8));
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  });
}

/** Texture de gravier */
function makeGravelTexture(size = 256): THREE.CanvasTexture {
  const key = `gravel_${size}`;
  return getCachedTex(key, size, (ctx, w, h) => {
    ctx.fillStyle = "#8a8478";
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 400; i++) {
      const px = noise2D(i, 0, 500) * w;
      const py = noise2D(0, i, 500) * h;
      const pr = 1 + noise2D(i, i, 500) * 3;
      const shade = 100 + noise2D(i, 0, 600) * 80;
      ctx.fillStyle = `rgb(${Math.round(shade)},${Math.round(shade - 5)},${Math.round(shade - 10)})`;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * 0.7, noise2D(i, 0) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/* =========================================================================
   OPTIMISATION DE MATÉRIAUX (Standard → Lambert pour les surfaces mates)
   ========================================================================= */

const cheapCache = new WeakMap<THREE.Material, THREE.Material>();

function keepPhysical(mat: THREE.MeshStandardMaterial) {
  if (mat.userData.keepPbr) return true;
  if (!(mat instanceof THREE.MeshPhysicalMaterial)) return false;
  return mat.transmission > 0.01 || mat.clearcoat > 0.15 || mat.sheen > 0.05 || mat.iridescence > 0.05;
}

/** Standard/Physical mat → Lambert si le PBR n'apporte rien (tissu, bois, peau). */
export function cheapenMat(mat: THREE.Material): THREE.Material {
  const hit = cheapCache.get(mat);
  if (hit) return hit;
  if (!(mat instanceof THREE.MeshStandardMaterial) || keepPhysical(mat) || usePbr(mat.roughness, mat.metalness)) {
    wireCsm(mat);
    cheapCache.set(mat, mat);
    return mat;
  }
  const cheap = new THREE.MeshLambertMaterial();
  cheap.name = mat.name;
  cheap.color.copy(mat.color);
  cheap.map = mat.map;
  cheap.emissive.copy(mat.emissive);
  cheap.emissiveMap = mat.emissiveMap;
  cheap.emissiveIntensity = mat.emissiveIntensity;
  cheap.transparent = mat.transparent;
  cheap.opacity = mat.opacity;
  cheap.side = mat.side;
  cheap.alphaTest = mat.alphaTest;
  cheap.vertexColors = mat.vertexColors;
  cheap.flatShading = mat.flatShading;
  cheap.depthWrite = mat.depthWrite;
  cheap.depthTest = mat.depthTest;
  cheap.alphaMap = mat.alphaMap;
  cheap.aoMap = mat.aoMap;
  cheap.aoMapIntensity = mat.aoMapIntensity;
  cheap.lightMap = mat.lightMap;
  cheap.lightMapIntensity = mat.lightMapIntensity;
  cheap.fog = mat.fog;
  cheap.userData = { ...mat.userData, csmWired: false };
  wireCsm(cheap);
  cheapCache.set(mat, cheap);
  cheapCache.set(cheap, cheap);
  mat.dispose();
  return cheap;
}

export function cheapenTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cheapenMat) : cheapenMat(mesh.material);
  });
}

/* =========================================================================
   BIBLIOTHÈQUE DE MATÉRIAUX — API COMPLÈTE
   ========================================================================= */

class MaterialLibrary {
  private cache = new Map<string, QcMat>();

  /* --- API de base (rétrocompatible) --- */

  hex(hex: string, roughness = 0.85, metalness = 0) {
    return this.get(parseHex(hex), roughness, metalness);
  }

  get(color: number, roughness = 0.85, metalness = 0, flat = true): QcMat {
    const pbr = usePbr(roughness, metalness);
    const key = `${pbr ? "s" : "l"}_${color}_${roughness}_${metalness}_${flat}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = pbr
      ? new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: flat })
      : new THREE.MeshLambertMaterial({ color, flatShading: flat });
=======
// ============================================================================
// TYPES DE MATÉRIAUX
// ============================================================================
export type QcMat = THREE.MeshLambertMaterial | THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

export interface MaterialOptions {
  roughness?: number;
  metalness?: number;
  flatShading?: boolean;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  envMap?: THREE.Texture | null;
  envMapIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  sheen?: number;
  sheenColor?: THREE.Color;
  iridescence?: number;
  iridescenceIOR?: number;
}

// ============================================================================
// UTILITAIRES PBR
// ============================================================================
export function usePbr(roughness: number, metalness: number) {
  return metalness > 0.18 || roughness < 0.28;
}

function parseHex(hex: string | number) {
  if (typeof hex === "number") return hex;
  return parseInt(hex.replace("#", ""), 16);
}

// ============================================================================
// SYSTÈME DE CACHE AMÉLIORÉ AVEC WEAK REFERENCES
// ============================================================================
const cheapCache = new WeakMap<THREE.Material, THREE.Material>();
const materialRegistry = new Set<THREE.Material>();

function registerMaterial(mat: THREE.Material) {
  materialRegistry.add(mat);
  return mat;
}

function keepPhysical(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return false;
  if (mat.userData.keepPbr) return true;
  if (mat instanceof THREE.MeshPhysicalMaterial) {
    return (
      (mat.transmission ?? 0) > 0.01 ||
      (mat.clearcoat ?? 0) > 0.15 ||
      (mat.sheen ?? 0) > 0.05 ||
      (mat.iridescence ?? 0) > 0.05 ||
      mat.userData.forcePbr === true
    );
  }
  return usePbr(mat.roughness, mat.metalness);
}

/**
 * Convertit Standard/Physical → Lambert SEULEMENT si le PBR n'apporte rien.
 * Préserve les matériaux importants (verre, métal, émissifs).
 */
export function cheapenMat(mat: THREE.Material): THREE.Material {
  const hit = cheapCache.get(mat);
  if (hit) return hit;
  
  // Ne pas convertir si le PBR est nécessaire
  if (!(mat instanceof THREE.MeshStandardMaterial) || keepPhysical(mat) || usePbr(mat.roughness, mat.metalness)) {
    wireCsm(mat);
    cheapCache.set(mat, mat);
    return mat;
  }
  
  const cheap = new THREE.MeshLambertMaterial();
  cheap.name = mat.name;
  cheap.color.copy(mat.color);
  cheap.map = mat.map;
  cheap.emissive.copy(mat.emissive);
  cheap.emissiveMap = mat.emissiveMap;
  cheap.emissiveIntensity = mat.emissiveIntensity;
  cheap.transparent = mat.transparent;
  cheap.opacity = mat.opacity;
  cheap.side = mat.side;
  cheap.alphaTest = mat.alphaTest;
  cheap.vertexColors = mat.vertexColors;
  cheap.flatShading = mat.flatShading;
  cheap.depthWrite = mat.depthWrite;
  cheap.depthTest = mat.depthTest;
  cheap.alphaMap = mat.alphaMap;
  cheap.aoMap = mat.aoMap;
  cheap.aoMapIntensity = mat.aoMapIntensity;
  cheap.lightMap = mat.lightMap;
  cheap.lightMapIntensity = mat.lightMapIntensity;
  cheap.fog = mat.fog;
  cheap.userData = { ...mat.userData, csmWired: false };
  
  wireCsm(cheap);
  registerMaterial(cheap);
  cheapCache.set(mat, cheap);
  cheapCache.set(cheap, cheap);
  
  // Ne pas disposer l'original pour éviter des problèmes de référence
  return cheap;
}

/**
 * Version SAFE qui ne convertit PAS les matériaux importants.
 * Recommandé pour les props HD.
 */
export function cheapenTreeSafe(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const converted = mats.map((m) => {
      // Ne pas convertir les matériaux émissifs, transparents ou PBR
      if (m instanceof THREE.MeshStandardMaterial) {
        if (m.emissiveIntensity > 0.1 || m.transparent || keepPhysical(m)) {
          return m;
        }
      }
      return cheapenMat(m);
    });
    mesh.material = Array.isArray(mesh.material) ? converted : converted[0];
  });
}

/**
 * Version AGRESSIVE (ancienne) - À ÉVITER pour le HD
 */
export function cheapenTree(root: THREE.Object3D) {
  return cheapenTreeSafe(root);
}

// ============================================================================
// BIBLIOTHÈQUE DE MATÉRIAUX HD
// ============================================================================
class MaterialLibrary {
  private cache = new Map<string, QcMat>();
  private envMap: THREE.Texture | null = null;

  /**
   * Définit l'environment map global pour les réflexions
   */
  setEnvironmentMap(envMap: THREE.Texture | null) {
    this.envMap = envMap;
    // Mettre à jour tous les matériaux PBR existants
    for (const mat of this.cache.values()) {
      if (mat instanceof THREE.MeshStandardMaterial && mat.userData.useEnvMap) {
        mat.envMap = envMap;
        mat.needsUpdate = true;
      }
    }
  }

  /**
   * Crée un matériau basique avec couleur hex
   */
  hex(hex: string, roughness = 0.85, metalness = 0) {
    return this.get(parseHex(hex), roughness, metalness);
  }

  /**
   * Verre simple (Lambert) - pour performances
   */
  glass(hex: string | number, opacity = 0.35, _roughness = 0.08, _metalness = 0.1) {
    const color = parseHex(hex);
    const key = `gl_${color}_${opacity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    mat = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: opacity > 0.6,
      flatShading: true,
    });
    mat.userData.csmWired = true;
    mat.userData.skipCsm = true;
    registerMaterial(mat);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.cache.set(key, mat);
    return mat;
  }

<<<<<<< HEAD
=======
  /**
   * Verre PBR HD — transmission physique (vitrines, portes SQDC)
   */
  physicalGlass(hex: string | number = 0xc8dce8, transmission = 1, roughness = 0.045) {
    const color = parseHex(hex);
    const key = `pg_${color}_${transmission}_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness,
      transmission,
      thickness: 0.48,
      ior: 1.5,
      specularIntensity: 1,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.FrontSide,
      attenuationColor: new THREE.Color(color),
      attenuationDistance: 3.2,
      envMapIntensity: 1.15,
      envMap: this.envMap,
    });
    phys.userData.keepPbr = true;
    phys.userData.skipCsm = true;
    phys.userData.csmWired = true;
    phys.userData.useEnvMap = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Eau PBR avec réflexions et animation
   */
  water(color = 0x2a4a68, opacity = 0.88) {
    const key = `w_${color}_${opacity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    mat = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity,
      transmission: 0.6,
      thickness: 1.5,
      ior: 1.33,
      envMap: this.envMap,
      envMapIntensity: 1.5,
    });
    mat.userData.keepPbr = true;
    mat.userData.useEnvMap = true;
    registerMaterial(mat);
    this.cache.set(key, mat);
    return mat;
  }

  /**
   * Matériau éclairé (émissif)
   */
  lit(hex: string, emissiveHex: string, intensity: number, roughness = 0.35) {
    const color = parseHex(hex);
    const emissive = parseHex(emissiveHex);
    const key = `lit_${color}_${emissive}_${intensity}_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    mat = new THREE.MeshLambertMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      flatShading: true,
    });
    registerMaterial(mat);
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Matériau PBR complet avec options avancées
   */
  get(color: number, roughness = 0.85, metalness = 0, flat = true, options: MaterialOptions = {}): QcMat {
    const pbr = usePbr(roughness, metalness) || options.normalMap || options.envMap;
    const key = `${pbr ? "s" : "l"}_${color}_${roughness}_${metalness}_${flat}_${options.normalMap ? "n" : ""}_${options.envMap ? "e" : ""}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    if (pbr) {
      const std = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        flatShading: flat,
        normalMap: options.normalMap,
        roughnessMap: options.roughnessMap,
        metalnessMap: options.metalnessMap,
        aoMap: options.aoMap,
        emissiveMap: options.emissiveMap,
        envMap: options.envMap || this.envMap,
        envMapIntensity: options.envMapIntensity ?? 1,
      });
      std.userData.useEnvMap = !!(options.envMap || this.envMap);
      mat = std;
    } else {
      mat = new THREE.MeshLambertMaterial({
        color,
        flatShading: flat,
      });
    }
    
    registerMaterial(mat);
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Matériau émissif (néons, lumières)
   */
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  getEmissive(color: number, emissive: number, intensity: number): QcMat {
    const key = `em_${color}_${emissive}_${intensity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    mat = new THREE.MeshLambertMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
<<<<<<< HEAD
      roughness: 0.6,
      metalness: 0.1,
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      flatShading: true,
      toneMapped: false,
    });
<<<<<<< HEAD
    mat.userData.keepPbr = true;
=======
    registerMaterial(mat);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Alias pour getEmissive
   */
  emissive(color: number, emissive: number, intensity: number) {
    return this.getEmissive(color, emissive, intensity);
  }

<<<<<<< HEAD
  lit(hex: string, emissiveHex: string, intensity: number, roughness = 0.35) {
    const color = parseHex(hex);
    const emissive = parseHex(emissiveHex);
    const key = `lit_${color}_${emissive}_${intensity}_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      roughness,
      metalness: 0.05,
      flatShading: true,
      toneMapped: false,
    });
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /* --- Verre --- */

  glass(hex: string | number, opacity = 0.35, _roughness = 0.08, _metalness = 0.1) {
    const color = parseHex(hex);
    const key = `gl_${color}_${opacity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: opacity > 0.6,
      flatShading: true,
    });
    mat.userData.csmWired = true;
    mat.userData.skipCsm = true;
    this.cache.set(key, mat);
    return mat;
  }

  /** Verre PBR — transmission physique (vitrines, portes SQDC). */
  physicalGlass(hex: string | number = 0xc8dce8, transmission = 1, roughness = 0.045) {
    const color = parseHex(hex);
    const key = `pg_${color}_${transmission}_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    const phys = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness,
      transmission,
      thickness: 0.48,
      ior: 1.5,
      specularIntensity: 1,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.FrontSide,
      attenuationColor: new THREE.Color(color),
      attenuationDistance: 3.2,
      envMapIntensity: 1.15,
    });
    phys.userData.keepPbr = true;
    phys.userData.skipCsm = true;
    phys.userData.csmWired = true;
=======
  /**
   * Peinture automobile HD avec clearcoat
   */
  carPaint(color: number, roughness = 0.3, metalness = 0.8) {
    const key = `cp_${color}_${roughness}_${metalness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color,
      metalness,
      roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMap: this.envMap,
      envMapIntensity: 1.2,
    });
    phys.userData.keepPbr = true;
    phys.userData.useEnvMap = true;
    registerMaterial(phys);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    this.cache.set(key, phys);
    return phys;
  }

<<<<<<< HEAD
  /* --- Eau --- */

  water(color = 0x2a4a68, opacity = 0.88) {
    const key = `w_${color}_${opacity}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity,
      transmission: 0.6,
      roughness: 0.12,
      metalness: 0.0,
      ior: 1.33,
      clearcoat: 0.4,
      clearcoatRoughness: 0.15,
      emissive: color,
      emissiveIntensity: 0.08,
      flatShading: false,
    });
    mat.userData.keepPbr = true;
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /* =========================================================================
     MATÉRIAUX PROCÉDURAUX AVANCÉS (avec textures Canvas)
     ========================================================================= */

  /**
   * Bois PBR avec grain procédural et normal map.
   * @param color Couleur de base (ex: QC_PALETTE.boisErable)
   * @param roughness Rugosité (0.6–0.95 pour le bois)
   * @param weathered 0 = neuf, 1 = très usé/gris
   */
  wood(color: number, roughness = 0.78, weathered = 0): THREE.MeshStandardMaterial {
    const key = `pbr_wood_${color}_${roughness}_${weathered}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const baseColor = new THREE.Color(color);
    if (weathered > 0) {
      baseColor.lerp(new THREE.Color(0x8a8a82), weathered * 0.5);
    }

    const map = makeWoodTexture(baseColor);
    const normalMap = makeWoodNormal();

    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: roughness + weathered * 0.15,
      metalness: 0.02,
      flatShading: false,
    });
    mat.name = `wood_${color}`;
    mat.userData.keepPbr = true;
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Pierre PBR avec texture procédurale et normal map.
   */
  stone(color: number, roughness = 0.92): THREE.MeshStandardMaterial {
    const key = `pbr_stone_${color}_${roughness}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const baseColor = new THREE.Color(color);
    const map = makeStoneTexture(baseColor);
    const normalMap = makeStoneNormal();

    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      map,
      normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness,
      metalness: 0.0,
      flatShading: false,
    });
    mat.name = `stone_${color}`;
    mat.userData.keepPbr = true;
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Brique PBR avec joints de mortier.
   */
  brick(color: number = QC_PALETTE.brique, roughness = 0.88): THREE.MeshStandardMaterial {
    const key = `pbr_brick_${color}_${roughness}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const baseColor = new THREE.Color(color);
    const map = makeBrickTexture(baseColor);

    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      map,
      roughness,
      metalness: 0.0,
      flatShading: false,
    });
    mat.name = `brick_${color}`;
    mat.userData.keepPbr = true;
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Tôle ondulée PBR avec reflets anisotropes et rouille.
   */
  roofMetal(color: number, roughness = 0.55, weathered = 0): THREE.MeshStandardMaterial {
    const key = `pbr_roof_${color}_${roughness}_${weathered}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const baseColor = new THREE.Color(color);
    if (weathered > 0) {
      baseColor.lerp(new THREE.Color(QC_PALETTE.toleRouille), weathered * 0.4);
    }

    const map = makeCorrugatedTexture(baseColor);
    const normalMap = makeCorrugatedNormal();

    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      map,
      normalMap,
      normalScale: new THREE.Vector2(1.5, 0.3),
      roughness: roughness + weathered * 0.25,
      metalness: 0.7 - weathered * 0.3,
      flatShading: false,
    });
    mat.name = `roof_${color}`;
    mat.userData.keepPbr = true;
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Métal PBR (acier, fer, cuivre, laiton).
   */
  metal(color: number, roughness = 0.35, metalness = 0.85): THREE.MeshStandardMaterial {
    const key = `pbr_metal_${color}_${roughness}_${metalness}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      flatShading: false,
      envMapIntensity: 1.2,
    });
    mat.name = `metal_${color}`;
    mat.userData.keepPbr = true;
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Gazon / herbe PBR avec brins procéduraux.
   */
  grass(color: number = QC_PALETTE.gazon, roughness = 0.95): THREE.MeshStandardMaterial {
    const key = `pbr_grass_${color}_${roughness}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const baseColor = new THREE.Color(color);
    const map = makeGrassTexture(baseColor);

    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      map,
      roughness,
      metalness: 0.0,
      flatShading: false,
    });
    mat.name = `grass_${color}`;
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Asphalte PBR avec fissures et gravier.
   */
  asphalt(roughness = 0.92): THREE.MeshStandardMaterial {
    const key = `pbr_asphalt_${roughness}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const map = makeAsphaltTexture();

    const mat = new THREE.MeshStandardMaterial({
      color: QC_PALETTE.asphalte,
      map,
      roughness,
      metalness: 0.0,
      flatShading: false,
    });
    mat.name = "asphalt";
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Gravier PBR.
   */
  gravel(roughness = 0.95): THREE.MeshStandardMaterial {
    const key = `pbr_gravel_${roughness}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const map = makeGravelTexture();

    const mat = new THREE.MeshStandardMaterial({
      color: QC_PALETTE.gravier,
      map,
      roughness,
      metalness: 0.0,
      flatShading: false,
    });
    mat.name = "gravel";
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Neige PBR avec scintillement.
   */
  snow(roughness = 0.85): THREE.MeshStandardMaterial {
    const key = `pbr_snow_${roughness}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const map = makeSnowTexture();

    const mat = new THREE.MeshStandardMaterial({
      color: QC_PALETTE.neige,
      map,
      roughness,
      metalness: 0.0,
      flatShading: false,
      emissive: 0xf0f0f8,
      emissiveIntensity: 0.04,
    });
    mat.name = "snow";
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Glace / verglas PBR avec réfraction.
   */
  ice(roughness = 0.08): THREE.MeshPhysicalMaterial {
    const key = `pbr_ice_${roughness}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshPhysicalMaterial;

    const mat = new THREE.MeshPhysicalMaterial({
      color: QC_PALETTE.glace,
      transparent: true,
      opacity: 0.75,
      transmission: 0.5,
      roughness,
      metalness: 0.0,
      ior: 1.31,
      clearcoat: 0.8,
      clearcoatRoughness: 0.05,
      flatShading: false,
    });
    mat.userData.keepPbr = true;
    mat.name = "ice";
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Béton PBR avec usure.
   */
  concrete(color: number = QC_PALETTE.beton, roughness = 0.9, weathered = 0): THREE.MeshStandardMaterial {
    const key = `pbr_concrete_${color}_${roughness}_${weathered}`;
    const cached = this.cache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;

    const baseColor = new THREE.Color(color);
    if (weathered > 0) {
      baseColor.lerp(new THREE.Color(0x6a6a62), weathered * 0.3);
    }

    const map = makeStoneTexture(baseColor, 128);

    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      map,
      roughness: roughness + weathered * 0.08,
      metalness: 0.0,
      flatShading: false,
    });
    mat.name = `concrete_${color}`;
    this.cache.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /* --- Nettoyage --- */

=======
  /**
   * Chrome / métal poli HD
   */
  chrome(roughness = 0.05) {
    const key = `chrome_${roughness}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color: 0xd8dce0,
      metalness: 1,
      roughness,
      envMap: this.envMap,
      envMapIntensity: 2,
    });
    phys.userData.keepPbr = true;
    phys.userData.useEnvMap = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Neige PBR avec sheen
   */
  snow() {
    const key = "snow";
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color: 0xf8f8ff,
      metalness: 0,
      roughness: 0.8,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xd4e8f0),
      envMap: this.envMap,
      envMapIntensity: 0.8,
    });
    phys.userData.keepPbr = true;
    phys.userData.useEnvMap = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Asphalte mouillé avec réflexions
   */
  wetAsphalt() {
    const key = "wet_asphalt";
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const std = new THREE.MeshStandardMaterial({
      color: 0x1a1a1e,
      metalness: 0.3,
      roughness: 0.4,
      envMap: this.envMap,
      envMapIntensity: 1.5,
    });
    std.userData.useEnvMap = true;
    registerMaterial(std);
    this.cache.set(key, std);
    return std;
  }

  /**
   * Asphalte sec
   */
  dryAsphalt() {
    return this.get(0x2a2a2e, 0.95, 0);
  }

  /**
   * Béton avec normal map optionnelle
   */
  concrete(normalMap?: THREE.Texture | null) {
    return this.get(0x8a8a86, 0.9, 0, true, { normalMap });
  }

  /**
   * Bois avec normal map optionnelle
   */
  wood(color = 0xa07848, normalMap?: THREE.Texture | null) {
    return this.get(color, 0.85, 0, true, { normalMap });
  }

  /**
   * Métal brossé
   */
  brushedMetal(color = 0x8a9099, roughness = 0.4) {
    return this.get(color, roughness, 0.9);
  }

  /**
   * Rouille
   */
  rust() {
    return this.get(0x8a3a1c, 0.95, 0.3);
  }

  /**
   * Tissu avec sheen
   */
  fabric(color: number) {
    const key = `fabric_${color}`;
    let mat = this.cache.get(key);
    if (mat) return mat;
    
    const phys = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness: 0.9,
      sheen: 0.3,
      sheenColor: new THREE.Color(color).multiplyScalar(1.2),
    });
    phys.userData.keepPbr = true;
    registerMaterial(phys);
    this.cache.set(key, phys);
    return phys;
  }

  /**
   * Matériau animé (émissif pulsant)
   */
  animatedEmissive(color: number, emissive: number, intensity: number, speed: number = 1) {
    const mat = this.getEmissive(color, emissive, intensity) as THREE.MeshLambertMaterial;
    mat.userData.animated = true;
    mat.userData.animSpeed = speed;
    mat.userData.baseIntensity = intensity;
    return mat;
  }

  /**
   * Met à jour les matériaux animés (à appeler dans la boucle de rendu)
   */
  updateAnimatedMaterials(time: number) {
    for (const mat of this.cache.values()) {
      if (mat.userData.animated && mat instanceof THREE.MeshLambertMaterial) {
        const speed = mat.userData.animSpeed ?? 1;
        const base = mat.userData.baseIntensity ?? 1;
        mat.emissiveIntensity = base * (0.5 + 0.5 * Math.sin(time * speed));
      }
    }
  }

  /**
   * Clone un matériau avec modifications
   */
  cloneWith(mat: QcMat, overrides: Partial<MaterialOptions>): QcMat {
    const cloned = mat.clone();
    if (overrides.roughness !== undefined && cloned instanceof THREE.MeshStandardMaterial) {
      cloned.roughness = overrides.roughness;
    }
    if (overrides.metalness !== undefined && cloned instanceof THREE.MeshStandardMaterial) {
      cloned.metalness = overrides.metalness;
    }
    if (overrides.envMap !== undefined && cloned instanceof THREE.MeshStandardMaterial) {
      cloned.envMap = overrides.envMap;
    }
    registerMaterial(cloned);
    return cloned;
  }

  /**
   * Dispose tous les matériaux
   */
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  dispose() {
    for (const mat of materialRegistry) {
      mat.dispose();
    }
    materialRegistry.clear();
    this.cache.clear();
    texCache.forEach((t) => t.dispose());
    texCache.clear();
  }

  getStats() {
    return { materials: this.cache.size, textures: texCache.size };
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    let lambert = 0;
    let standard = 0;
    let physical = 0;
    
    for (const mat of this.cache.values()) {
      if (mat instanceof THREE.MeshPhysicalMaterial) physical++;
      else if (mat instanceof THREE.MeshStandardMaterial) standard++;
      else lambert++;
    }
    
    return {
      total: this.cache.size,
      lambert,
      standard,
      physical,
      registered: materialRegistry.size,
    };
  }
}

<<<<<<< HEAD
export const matLib = new MaterialLibrary();
=======
export const matLib = new MaterialLibrary();

// ============================================================================
// UTILITAIRES GLOBAUX
// ============================================================================

/**
 * Configure l'environment map global pour tous les matériaux
 */
export function setGlobalEnvironment(envMap: THREE.Texture | null) {
  matLib.setEnvironmentMap(envMap);
}

/**
 * Crée un matériau PBR rapide avec toutes les options
 */
export function createPBR(
  color: number,
  options: MaterialOptions = {}
): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return matLib.get(color, options.roughness ?? 0.5, options.metalness ?? 0, true, options) as any;
}

/**
 * Matériau de terrain (neige, boue, asphalte)
 */
export function terrainMaterial(type: "snow" | "mud" | "asphalt" | "gravel" | "grass") {
  switch (type) {
    case "snow":
      return matLib.snow();
    case "mud":
      return matLib.get(QC_PALETTE.boue, 0.95, 0);
    case "asphalt":
      return matLib.dryAsphalt();
    case "gravel":
      return matLib.get(QC_PALETTE.gravier, 0.95, 0);
    case "grass":
      return matLib.get(0x4a6a32, 0.9, 0);
  }
}
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
