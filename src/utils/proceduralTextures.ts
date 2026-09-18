import * as THREE from 'three';

export type ProceduralTextureType =
  | 'none'
  | 'wood'
  | 'metal'
  | 'concrete'
  | 'brick'
  | 'grid'
  | 'marble'
  | 'carbon'
  | 'gold'
  | 'rust'
  | 'checker'
  | 'cobblestone'
  | 'grass'
  | 'roof_tiles'
  | 'asphalt_road'
  | 'leather'
  | 'neon_circuit';

export interface TextureDefinition {
  id: ProceduralTextureType;
  name: string;
  icon: string;
  description: string;
  defaultRoughness: number;
  defaultMetalness: number;
}

export const PROCEDURAL_TEXTURES: TextureDefinition[] = [
  { id: 'none', name: 'Lisse / Aplat', icon: '🎨', description: 'Couleur unie', defaultRoughness: 0.4, defaultMetalness: 0.1 },
  { id: 'wood', name: 'Bois Chêne', icon: '🪵', description: 'Veines de bois massif', defaultRoughness: 0.65, defaultMetalness: 0.05 },
  { id: 'metal', name: 'Acier Brossé', icon: '⚙️', description: 'Métal brossé industriel', defaultRoughness: 0.25, defaultMetalness: 0.85 },
  { id: 'concrete', name: 'Béton Québec', icon: '🧱', description: 'Grain ciment & béton', defaultRoughness: 0.9, defaultMetalness: 0.05 },
  { id: 'brick', name: 'Brique Rouge', icon: '🧱', description: 'Mur briques & mortier', defaultRoughness: 0.85, defaultMetalness: 0.0 },
  { id: 'cobblestone', name: 'Pavés Vieux-Port', icon: '🪨', description: 'Pavés rustiques en pierre', defaultRoughness: 0.88, defaultMetalness: 0.05 },
  { id: 'grass', name: 'Herbe Naturelle', icon: '🌿', description: 'Pelouse & trèfles frais', defaultRoughness: 0.95, defaultMetalness: 0.0 },
  { id: 'roof_tiles', name: 'Tuiles Ardoise', icon: '🏠', description: 'Tuiles de toit ardoise', defaultRoughness: 0.75, defaultMetalness: 0.1 },
  { id: 'asphalt_road', name: 'Asphalte Routier', icon: '🛣️', description: 'Bitume avec lignes jaunes', defaultRoughness: 0.9, defaultMetalness: 0.1 },
  { id: 'grid', name: 'Grille Cyber', icon: '🌐', description: 'Grille néon lumineuse', defaultRoughness: 0.2, defaultMetalness: 0.5 },
  { id: 'marble', name: 'Marbre Blanc', icon: '🏛️', description: 'Quartz & marbre veiné', defaultRoughness: 0.15, defaultMetalness: 0.1 },
  { id: 'carbon', name: 'Fibre Carbone', icon: '🏎️', description: 'Tissage carbone composite', defaultRoughness: 0.3, defaultMetalness: 0.7 },
  { id: 'gold', name: 'Or Poli', icon: '🌟', description: 'Finition or précieux', defaultRoughness: 0.15, defaultMetalness: 0.95 },
  { id: 'rust', name: 'Fer Rouillé', icon: '⚙️', description: 'Métal vieilli & oxydé', defaultRoughness: 0.8, defaultMetalness: 0.4 },
  { id: 'leather', name: 'Cuir Noir', icon: '🛋️', description: 'Cuir véritable cousu', defaultRoughness: 0.45, defaultMetalness: 0.05 },
  { id: 'neon_circuit', name: 'Circuit Éther', icon: '⚡', description: 'Carte électronique néon', defaultRoughness: 0.2, defaultMetalness: 0.8 },
  { id: 'checker', name: 'Damier GMod', icon: '🏁', description: 'Damier violet & noir', defaultRoughness: 0.4, defaultMetalness: 0.1 },
];

const textureCache = new Map<ProceduralTextureType, THREE.CanvasTexture | null>();

export function getProceduralTexture(type: ProceduralTextureType): THREE.CanvasTexture | null {
  if (type === 'none') return null;
  if (textureCache.has(type)) {
    return textureCache.get(type)!;
  }

  const texture = generateProceduralTexture(type);
  textureCache.set(type, texture);
  return texture;
}

function generateProceduralTexture(type: ProceduralTextureType): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  switch (type) {
    case 'wood':
      drawWood(ctx, size);
      break;
    case 'metal':
      drawMetal(ctx, size);
      break;
    case 'concrete':
      drawConcrete(ctx, size);
      break;
    case 'brick':
      drawBrick(ctx, size);
      break;
    case 'cobblestone':
      drawCobblestone(ctx, size);
      break;
    case 'grass':
      drawGrass(ctx, size);
      break;
    case 'roof_tiles':
      drawRoofTiles(ctx, size);
      break;
    case 'asphalt_road':
      drawAsphaltRoad(ctx, size);
      break;
    case 'leather':
      drawLeather(ctx, size);
      break;
    case 'neon_circuit':
      drawNeonCircuit(ctx, size);
      break;
    case 'grid':
      drawGrid(ctx, size);
      break;
    case 'marble':
      drawMarble(ctx, size);
      break;
    case 'carbon':
      drawCarbon(ctx, size);
      break;
    case 'gold':
      drawGold(ctx, size);
      break;
    case 'rust':
      drawRust(ctx, size);
      break;
    case 'checker':
      drawChecker(ctx, size);
      break;
    default:
      ctx.fillStyle = '#888888';
      ctx.fillRect(0, 0, size, size);
      break;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function drawWood(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(0, 0, s, s);

  for (let y = 0; y < s; y += 3) {
    const alpha = 0.05 + Math.random() * 0.12;
    ctx.fillStyle = y % 6 === 0 ? `rgba(50, 25, 10, ${alpha})` : `rgba(180, 120, 70, ${alpha})`;
    const wave = Math.sin(y * 0.02) * 8 + Math.cos(y * 0.05) * 4;
    ctx.fillRect(0, y + wave, s, 2 + Math.random() * 2);
  }

  for (let i = 0; i < 3; i++) {
    const kx = (i + 1) * (s / 4) + (Math.random() - 0.5) * 40;
    const ky = Math.random() * s;
    const kr = 15 + Math.random() * 20;
    const grad = ctx.createRadialGradient(kx, ky, 2, kx, ky, kr);
    grad.addColorStop(0, 'rgba(40, 20, 10, 0.85)');
    grad.addColorStop(0.5, 'rgba(90, 45, 20, 0.5)');
    grad.addColorStop(1, 'rgba(139, 94, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMetal(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 4500; i++) {
    const y = Math.random() * s;
    const x = Math.random() * s;
    const len = 20 + Math.random() * 100;
    const v = Math.random() > 0.5 ? 255 : 0;
    const alpha = 0.02 + Math.random() * 0.08;
    ctx.strokeStyle = `rgba(${v}, ${v}, ${v}, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }

  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
}

function drawConcrete(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = Math.random() * 1.5 + 0.5;
    const dark = Math.random() > 0.5;
    ctx.fillStyle = dark ? 'rgba(30, 41, 59, 0.15)' : 'rgba(241, 245, 249, 0.15)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    let cx = Math.random() * s;
    let cy = Math.random() * s;
    ctx.moveTo(cx, cy);
    for (let seg = 0; seg < 4; seg++) {
      cx += (Math.random() - 0.5) * 45;
      cy += (Math.random() - 0.5) * 45;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, s, s);

  const bh = 32;
  const bw = 64;
  const mortar = 4;

  let row = 0;
  for (let y = 0; y < s; y += bh + mortar) {
    const offsetX = (row % 2) * (bw / 2);
    for (let x = -bw; x < s + bw; x += bw + mortar) {
      const hue = Math.floor(Math.random() * 24) - 12;
      const r = 180 + hue;
      const g = 60 + hue / 2;
      const b = 40 + hue / 3;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + offsetX, y, bw, bh);

      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let n = 0; n < 15; n++) {
        ctx.fillRect(x + offsetX + Math.random() * bw, y + Math.random() * bh, 2, 2);
      }
    }
    row++;
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#050b14';
  ctx.fillRect(0, 0, s, s);

  const step = 32;
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 8;

  for (let x = 0; x <= s; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, s);
    ctx.stroke();
  }
  for (let y = 0; y <= s; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#a5f3fc';
  for (let x = 0; x <= s; x += step) {
    for (let y = 0; y <= s; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
}

function drawMarble(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, s, s);

  for (let v = 0; v < 8; v++) {
    const dark = Math.random() > 0.3;
    ctx.strokeStyle = dark ? 'rgba(71, 85, 105, 0.28)' : 'rgba(217, 119, 6, 0.28)';
    ctx.lineWidth = 1 + Math.random() * 4;
    ctx.beginPath();
    let x = Math.random() * s;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < s) {
      x += (Math.random() - 0.5) * 35 + Math.sin(y * 0.04) * 12;
      y += 10 + Math.random() * 15;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawCarbon(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, s, s);

  const step = 16;
  for (let x = 0; x < s; x += step) {
    for (let y = 0; y < s; y += step) {
      const isEven = ((x / step) + (y / step)) % 2 === 0;
      ctx.fillStyle = isEven ? '#1f2937' : '#374151';
      ctx.fillRect(x, y, step, step);

      ctx.strokeStyle = isEven ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + step, y + step);
      ctx.stroke();
    }
  }
}

function drawGold(ctx: CanvasRenderingContext2D, s: number) {
  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(0.3, '#fef08a');
  grad.addColorStop(0.5, '#d97706');
  grad.addColorStop(0.8, '#fef08a');
  grad.addColorStop(1, '#b45309');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 600; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, y, 40, 2);
  }
}

function drawRust(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 35; i++) {
    const rx = Math.random() * s;
    const ry = Math.random() * s;
    const rr = 10 + Math.random() * 45;
    const grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rr);
    grad.addColorStop(0, '#ea580c');
    grad.addColorStop(0.5, '#7c2d12');
    grad.addColorStop(1, 'rgba(63, 63, 70, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChecker(ctx: CanvasRenderingContext2D, s: number) {
  const size = 64;
  for (let x = 0; x < s; x += size) {
    for (let y = 0; y < s; y += size) {
      const isEven = ((x / size) + (y / size)) % 2 === 0;
      ctx.fillStyle = isEven ? '#a855f7' : '#0f172a';
      ctx.fillRect(x, y, size, size);
    }
  }
}

function drawCobblestone(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, s, s);

  const size = 32;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;

  for (let y = 0; y < s; y += size) {
    const row = Math.floor(y / size);
    const offsetX = (row % 2) * (size / 2);
    for (let x = -size; x < s + size; x += size) {
      const stoneX = x + offsetX;
      const shade = 90 + Math.floor(Math.random() * 45);
      ctx.fillStyle = `rgb(${shade}, ${shade + 5}, ${shade + 12})`;

      // Rounded cobblestone block
      ctx.beginPath();
      ctx.roundRect(stoneX + 2, y + 2, size - 4, size - 4, 6);
      ctx.fill();
      ctx.stroke();

      // Top bevel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(stoneX + 4, y + 4, size - 8, 3);
    }
  }
}

function drawGrass(ctx: CanvasRenderingContext2D, s: number) {
  // Deep lush green base
  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, '#15803d');
  grad.addColorStop(0.5, '#166534');
  grad.addColorStop(1, '#14532d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);

  // Grass blades & clover noise
  for (let i = 0; i < 25000; i++) {
    const gx = Math.random() * s;
    const gy = Math.random() * s;
    const gLen = 3 + Math.random() * 6;
    const angle = (Math.random() - 0.5) * 0.8;
    const isBright = Math.random() > 0.4;
    ctx.strokeStyle = isBright ? `rgba(74, 222, 128, ${0.15 + Math.random() * 0.35})` : `rgba(20, 83, 45, ${0.2 + Math.random() * 0.4})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + Math.sin(angle) * gLen, gy - Math.cos(angle) * gLen);
    ctx.stroke();
  }

  // Yellow & white tiny flowers / clovers
  for (let f = 0; f < 80; f++) {
    const fx = Math.random() * s;
    const fy = Math.random() * s;
    ctx.fillStyle = Math.random() > 0.5 ? '#fde047' : '#ffffff';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoofTiles(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, s, s);

  const tileW = 40;
  const tileH = 20;

  let row = 0;
  for (let y = 0; y < s; y += tileH) {
    const offsetX = (row % 2) * (tileW / 2);
    for (let x = -tileW; x < s + tileW; x += tileW) {
      const tileX = x + offsetX;
      const gray = 45 + Math.floor(Math.random() * 25);
      ctx.fillStyle = `rgb(${gray}, ${gray + 8}, ${gray + 18})`;

      ctx.beginPath();
      ctx.arc(tileX + tileW / 2, y + tileH, tileW / 2, Math.PI, 0, false);
      ctx.fill();

      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(tileX + 6, y + 2, tileW - 12, 2);
    }
    row++;
  }
}

function drawAsphaltRoad(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, s, s);

  // Grain noise
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const val = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${val}, ${val}, ${val}, 0.08)`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Yellow double central line
  ctx.fillStyle = '#eab308';
  ctx.fillRect(s / 2 - 6, 0, 4, s);
  ctx.fillRect(s / 2 + 2, 0, 4, s);

  // White side shoulder lines
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(20, 0, 6, s);
  ctx.fillRect(s - 26, 0, 6, s);
}

function drawLeather(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = Math.random() * 2 + 0.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stitching lines around border
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(12, 12, s - 24, s - 24);
  ctx.setLineDash([]);
}

function drawNeonCircuit(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 10;

  for (let i = 0; i < 20; i++) {
    let cx = Math.floor(Math.random() * (s / 32)) * 32;
    let cy = Math.floor(Math.random() * (s / 32)) * 32;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let seg = 0; seg < 4; seg++) {
      const dir = Math.floor(Math.random() * 4);
      if (dir === 0) cx += 32;
      else if (dir === 1) cx -= 32;
      else if (dir === 2) cy += 32;
      else cy -= 32;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Node dot
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}
