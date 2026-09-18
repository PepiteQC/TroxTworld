/**
 * TROXTWORLD — SQDC Textures procédurales
 * Aucune dépendance externe : tout est dessiné sur Canvas puis caché.
 */
import * as THREE from "three";

const TEX_CACHE = new Map<string, THREE.Texture>();

function bake(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat: [number, number] = [1, 1],
  srgb = true,
): THREE.Texture {
  const hit = TEX_CACHE.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.needsUpdate = true;
  TEX_CACHE.set(key, tex);
  return tex;
}

/* ─────────── LOGO SQDC (feuille) ─────────── */
export function drawSqdcLeaf(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.52;
    const len = r * (i === 2 ? 1.0 : i === 1 || i === 3 ? 0.78 : 0.5);
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.15);
    ctx.quadraticCurveTo(
      cx + Math.cos(a - 0.3) * len * 0.5,
      cy + Math.sin(a - 0.3) * len * 0.5,
      cx + Math.cos(a) * len,
      cy + Math.sin(a) * len,
    );
    ctx.quadraticCurveTo(
      cx + Math.cos(a + 0.3) * len * 0.5,
      cy + Math.sin(a + 0.3) * len * 0.5,
      cx, cy + r * 0.15,
    );
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.1);
  ctx.lineTo(cx, cy + r * 1.15);
  ctx.stroke();
}

export function texSqdcLogo(size = 512): THREE.Texture {
  return bake(`sqdc-logo-${size}`, size, size, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1A5632";
    ctx.fillRect(0, 0, w, h);
    drawSqdcLeaf(ctx, w / 2, h / 2, w * 0.3, "#ffffff");
  });
}

/* ─────────── ENSEIGNE EXTÉRIEURE ─────────── */
export function texSqdcSign(w = 1024, h = 256): THREE.Texture {
  return bake(`sqdc-sign-${w}x${h}`, w, h, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1F6B3E");
    g.addColorStop(1, "#0F3D22");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#C9A24A";
    ctx.fillRect(0, 0, W, H * 0.045);
    ctx.fillRect(0, H * 0.955, W, H * 0.045);
    drawSqdcLeaf(ctx, W * 0.1, H * 0.5, H * 0.32, "#ffffff");
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${H * 0.55}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SQDC", W * 0.55, H * 0.48);
    ctx.font = `${H * 0.085}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "#d8ead8";
    ctx.fillText("SOCIÉTÉ QUÉBÉCOISE DU CANNABIS", W * 0.55, H * 0.82);
  });
}

/* ─────────── BÉTON ─────────── */
export function texConcrete(repeat: [number, number] = [4, 4]): THREE.Texture {
  return bake(`concrete-${repeat.join("x")}`, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#7a8083";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = Math.random() * 55 - 25;
      ctx.fillStyle = `rgba(${128 + v},${132 + v},${134 + v},0.35)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(45,48,50,${Math.random() * 0.14})`;
      ctx.lineWidth = 1;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 30);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(35,38,40,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }, repeat);
}

/* ─────────── CHÊNE ─────────── */
export function texOak(repeat: [number, number] = [1, 2]): THREE.Texture {
  return bake(`oak-${repeat.join("x")}`, 512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#c9a06a");
    g.addColorStop(0.5, "#d6ac78");
    g.addColorStop(1, "#c09562");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(120,80,40,${0.05 + Math.random() * 0.14})`;
      ctx.lineWidth = 0.8 + Math.random() * 1.4;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 24)
        ctx.lineTo(x, y + Math.sin((x / w) * Math.PI * 3 + i) * 4 + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }
  }, repeat);
}

/* ─────────── ACIER BROSSÉ ─────────── */
export function texSteel(repeat: [number, number] = [2, 2]): THREE.Texture {
  return bake(`steel-${repeat.join("x")}`, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#b8bcc2";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8000; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
      ctx.lineWidth = 0.4;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(60,64,70,${Math.random() * 0.14})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
  }, repeat);
}

/* ─────────── TAPIS D'ENTRÉE SQDC ─────────── */
export function texEntryMat(): THREE.Texture {
  return bake("entry-mat", 1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2b2b2b";
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 8, h);
    ctx.fillStyle = "#1A5632";
    ctx.fillRect(w * 0.06, h * 0.22, w * 0.88, h * 0.56);
    drawSqdcLeaf(ctx, w * 0.18, h * 0.5, h * 0.22, "#ffffff");
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${h * 0.22}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BIENVENUE · WELCOME", w * 0.58, h * 0.5);
  });
}

/* ─────────── ÉCRAN CAISSE ─────────── */
export function texRegisterScreen(lines: string[] = ["SQDC · PRÊT", "TPS + TVQ", "14.975%"]): THREE.Texture {
  return bake(`register-${lines.join("|")}`, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#0a1f12";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#5ee27e";
    ctx.font = `bold ${h * 0.18}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => ctx.fillText(line, w * 0.06, h * 0.1 + i * h * 0.25));
  });
}

/* ─────────── TAPIS ANTI-FATIGUE CAISSE ─────────── */
export function texAntiFatigueMat(): THREE.Texture {
  return bake("antifatigue", 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1a1a1a";
    for (let i = 0; i < 100; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function disposeTextures() {
  TEX_CACHE.forEach((t) => t.dispose());
  TEX_CACHE.clear();
}