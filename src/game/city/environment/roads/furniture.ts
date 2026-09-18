/**
 * 🛣️ FURNITURE — Panneaux, cônes, chevrons (procéduraux)
 */
import * as THREE from "three";
import type { RoadSign, ConstructionZone, SignType } from "./types";
import { getCurve } from "./spatial";

// ═══════════════════════════════════════════════════════════
// TEXTURES DE PANNEAUX (procédural)
// ═══════════════════════════════════════════════════════════

const SIGN_TEX_CACHE = new Map<string, THREE.CanvasTexture>();

function signTexture(key: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 256, h = 256): THREE.CanvasTexture {
  const hit = SIGN_TEX_CACHE.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  SIGN_TEX_CACHE.set(key, tex);
  return tex;
}

function drawStop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#cc0000"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 64px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("STOP", w / 2, h / 2);
}

function drawSpeedLimit(ctx: CanvasRenderingContext2D, w: number, h: number, limit: number) {
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#cc0000"; ctx.lineWidth = 20; ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = "#000000"; ctx.font = "bold 96px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(limit), w / 2, h / 2);
}

function drawWildlife(ctx: CanvasRenderingContext2D, w: number, h: number, emoji: string) {
  ctx.fillStyle = "#facc15"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#000000"; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.font = "bold 128px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(emoji, w / 2, h / 2);
}

function drawChevron(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#e8a51a"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000"; ctx.font = "bold 180px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("››", w / 2, h / 2);
}

// ═══════════════════════════════════════════════════════════
// BUILDERS
// ═══════════════════════════════════════════════════════════

export function buildRoadSign(
  type: SignType,
  opts: { speedLimit?: number; routeNum?: string } = {},
): THREE.Group {
  const g = new THREE.Group();

  // Poteau
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.5 }),
  );
  post.position.y = 1.4;
  g.add(post);

  // Panneau selon type
  let tex: THREE.CanvasTexture | null = null;
  let w = 0.6, h = 0.6;

  switch (type) {
    case "stop":
      tex = signTexture("stop", drawStop);
      break;
    case "speed_limit":
      tex = signTexture(`speed_${opts.speedLimit ?? 50}`, (c, W, H) => drawSpeedLimit(c, W, H, opts.speedLimit ?? 50));
      w = 0.55; h = 0.75;
      break;
    case "deer_crossing":
      tex = signTexture("deer", (c, W, H) => drawWildlife(c, W, H, "🦌"));
      w = 0.7; h = 0.7;
      break;
    case "moose_crossing":
      tex = signTexture("moose", (c, W, H) => drawWildlife(c, W, H, "🫎"));
      w = 0.7; h = 0.7;
      break;
    case "school_zone":
    case "ice_warning":
    case "construction":
      tex = signTexture(`warn_${type}`, (c, W, H) => drawWildlife(c, W, H, type === "school_zone" ? "🏫" : type === "ice_warning" ? "❄️" : "🚧"));
      break;
    case "route_number": {
      const num = opts.routeNum ?? "138";
      tex = signTexture(`route_${num}`, (c, W, H) => {
        c.fillStyle = "#003399"; c.fillRect(0, 0, W, H);
        c.fillStyle = "#ffffff"; c.font = "bold 120px Arial"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(num, W / 2, H / 2);
      }, 256, 192);
      w = 0.5; h = 0.4;
      break;
    }
    default:
      tex = signTexture(`generic_${type}`, (c, W, H) => {
        c.fillStyle = "#1c5f32"; c.fillRect(0, 0, W, H);
        c.fillStyle = "#ffffff"; c.font = "bold 40px Arial"; c.textAlign = "center";
        c.fillText(type.toUpperCase(), W / 2, H / 2);
      });
  }

  const mat = tex
    ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 })
    : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), mat);
  board.position.y = 2.4;
  board.castShadow = true;
  g.add(board);

  return g;
}

export function buildChevron(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.5 }),
  );
  post.position.y = 0.7;
  g.add(post);

  const tex = signTexture("chevron", drawChevron, 256, 256);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.5 }),
  );
  board.position.y = 1.6;
  g.add(board);

  return g;
}

export function buildConstructionCone(): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.04, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
  );
  base.position.y = 0.02;
  g.add(base);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.6 }),
  );
  cone.position.y = 0.39;
  g.add(cone);

  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }),
  );
  stripe.position.y = 0.45;
  g.add(stripe);

  return g;
}

// ═══════════════════════════════════════════════════════════
// PLACEMENT AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

export function placeConstructionCones(
  curveId: string,
  zone: ConstructionZone,
  divisions = 60,
): THREE.Group {
  const g = new THREE.Group();
  const curve = getCurve(curveId);
  if (!curve) return g;

  const totalLength = curve.getLength();
  const offset = zone.laneBlocked === "right" ? 1.6 : -1.6;
  const tStep = zone.coneSpacing / totalLength;

  for (let t = zone.tStart; t <= zone.tEnd; t += tStep) {
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const cone = buildConstructionCone();
    cone.position.set(
      pt.x + normal.x * offset,
      pt.y + 0.06,
      pt.z + normal.z * offset,
    );
    g.add(cone);
  }

  return g;
}

export function disposeSignTextures(): void {
  SIGN_TEX_CACHE.forEach((t) => t.dispose());
  SIGN_TEX_CACHE.clear();
}