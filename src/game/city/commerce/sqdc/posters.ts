/**
 * TROXTWORLD — Affiches SQDC réglementaires QC (procédural, bilingue)
 */
import * as THREE from "three";
import { drawSqdcLeaf } from "./materiaux/textures";

const CACHE = new Map<string, THREE.Texture>();

export type PosterIcon = "leaf" | "warning21" | "id" | "hours" | "video" | "noSmoke" | "reserve" | "price";

interface PosterOpts {
  bg?: string;
  fg?: string;
  accent?: string;
  icon?: PosterIcon;
}

function poster(key: string, title: string, subtitle: string, body: string, o: PosterOpts = {}): THREE.Texture {
  const hit = CACHE.get(key);
  if (hit) return hit;
  const bg = o.bg ?? "#1A5632";
  const fg = o.fg ?? "#f4f0e6";
  const accent = o.accent ?? "#C9A24A";

  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 640;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 640);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 512, 22);
  ctx.fillRect(0, 618, 512, 22);

  const ix = 256, iy = 180, ir = 72;

  if (o.icon === "leaf") drawSqdcLeaf(ctx, ix, iy, ir, fg);
  else if (o.icon === "warning21") {
    ctx.fillStyle = "#D84A3A";
    ctx.beginPath();
    ctx.moveTo(ix, iy - ir);
    ctx.lineTo(ix + ir, iy + ir * 0.75);
    ctx.lineTo(ix - ir, iy + ir * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `bold ${ir * 1.15}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("21+", ix, iy + ir * 0.15);
  } else if (o.icon === "id") {
    ctx.fillStyle = fg;
    ctx.fillRect(ix - ir, iy - ir * 0.72, ir * 2, ir * 1.44);
    ctx.fillStyle = bg;
    ctx.fillRect(ix - ir * 0.65, iy - ir * 0.4, ir * 0.55, ir * 0.55);
    ctx.fillStyle = fg;
    for (let i = 0; i < 3; i++) ctx.fillRect(ix - ir * 0.02, iy - ir * 0.35 + i * ir * 0.28, ir * 0.72, ir * 0.08);
  } else if (o.icon === "hours") {
    ctx.strokeStyle = fg;
    ctx.lineWidth = ir * 0.14;
    ctx.beginPath();
    ctx.arc(ix, iy, ir * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ix, iy - ir * 0.55);
    ctx.moveTo(ix, iy);
    ctx.lineTo(ix + ir * 0.45, iy + ir * 0.2);
    ctx.stroke();
  } else if (o.icon === "video") {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 8;
    ctx.strokeRect(ix - ir, iy - ir * 0.65, ir * 2, ir * 1.3);
    ctx.beginPath();
    ctx.moveTo(ix + ir * 0.4, iy - ir * 0.65);
    ctx.lineTo(ix + ir * 0.75, iy - ir * 1.0);
    ctx.lineTo(ix + ir * 0.75, iy - ir * 0.65);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#ff2222";
    ctx.beginPath();
    ctx.arc(ix + ir * 0.55, iy - ir * 0.35, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.icon === "noSmoke") {
    ctx.strokeStyle = "#D84A3A";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(ix, iy, ir * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ix - ir * 0.65, iy + ir * 0.65);
    ctx.lineTo(ix + ir * 0.65, iy - ir * 0.65);
    ctx.stroke();
  } else if (o.icon === "reserve") {
    ctx.fillStyle = "#D8A83A";
    ctx.beginPath();
    ctx.moveTo(ix, iy - ir);
    ctx.lineTo(ix + ir, iy + ir * 0.75);
    ctx.lineTo(ix - ir, iy + ir * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a1208";
    ctx.font = `bold ${ir * 0.9}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", ix, iy + ir * 0.15);
  } else if (o.icon === "price") {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 10;
    ctx.strokeRect(ix - ir, iy - ir * 0.6, ir * 2, ir * 1.2);
    ctx.fillStyle = fg;
    ctx.font = `bold ${ir * 0.9}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", ix, iy);
  }

  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = title.split("\n");
  ctx.font = `bold ${54}px Georgia, "Times New Roman", serif`;
  lines.forEach((line, i) => ctx.fillText(line, 256, 340 + (i - (lines.length - 1) / 2) * 62));

  if (subtitle) {
    ctx.font = `italic 26px Georgia, serif`;
    ctx.fillStyle = accent;
    ctx.fillText(subtitle, 256, 460);
  }
  if (body) {
    ctx.fillStyle = fg;
    ctx.font = `22px Helvetica, Arial, sans-serif`;
    const bodyLines = body.split("\n");
    bodyLines.forEach((line, i) => ctx.fillText(line, 256, 505 + i * 30));
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  CACHE.set(key, tex);
  return tex;
}

/* ══════════ CATALOGUE D'AFFICHES ══════════ */
export const POSTERS = {
  age21: () => poster(
    "p-age21",
    "21 ANS\nET PLUS",
    "Loi sur le cannabis (L.C. 2018, ch. 16)",
    "Pièce d'identité avec photo\nobligatoire à l'entrée",
    { icon: "warning21" },
  ),
  idRequired: () => poster(
    "p-id",
    "PIÈCE\nD'IDENTITÉ",
    "Vérification à l'accueil",
    "Permis · RAMQ · Passeport\nCarte autochtone",
    { icon: "id" },
  ),
  hours: () => poster(
    "p-hours",
    "HEURES\nD'OUVERTURE",
    "10 h — 21 h",
    "Lundi au dimanche\n7 jours sur 7",
    { icon: "hours" },
  ),
  legal: () => poster(
    "p-legal",
    "CANNABIS\nLÉGAL",
    "Vente contrôlée par l'État",
    "Possession max : 30 g\nPar personne majeure",
    { icon: "leaf" },
  ),
  noReentry: () => poster(
    "p-noRe",
    "VENTE\nUNIQUE",
    "Une transaction par visite",
    "Aucun retour de produit\naprès sortie du magasin",
    { icon: "warning21", bg: "#7a2a1a", accent: "#F0A070" },
  ),
  noSmoke: () => poster(
    "p-noSmoke",
    "DÉFENSE DE\nFUMER",
    "Consommation interdite",
    "sur place · terrasse · stationnement",
    { icon: "noSmoke", bg: "#2a1a1a", accent: "#D84A3A" },
  ),
  respect: () => poster(
    "p-respect",
    "RESPECT\nET COURTOISIE",
    "Nos employés sont là",
    "pour vous conseiller\nMerci de votre patience",
    { icon: "leaf", bg: "#1A5632" },
  ),
  video: () => poster(
    "p-video",
    "SURVEILLANCE\nVIDÉO 24/7",
    "Enregistrement continu",
    "Caméras · portiques\nantivol en fonction",
    { icon: "video", bg: "#141428", accent: "#5E9EFF" },
  ),
  reserve: () => poster(
    "p-reserve",
    "EMPLOYÉS\nSEULEMENT",
    "Zone de réserve",
    "Accès restreint\ncarte magnétique",
    { icon: "reserve", bg: "#3a2a1a", accent: "#D8A83A" },
  ),
  priceInfo: () => poster(
    "p-price",
    "PRIX\nAFFICHÉS",
    "Taxes en sus (14.975%)",
    "TPS 5% · TVQ 9.975%\nPrix en dollars canadiens",
    { icon: "price", bg: "#1a3a28" },
  ),
  proof21: () => poster(
    "p-proof21",
    "PREUVE\nD'ÂGE",
    "Refus de vente possible",
    "Si vous ne pouvez pas prouver\nvotre âge, la vente sera refusée",
    { icon: "warning21", bg: "#3a1a1a" },
  ),
} as const;

export function makePosterMesh(tex: THREE.Texture, w: number, h: number): THREE.Mesh {
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.castShadow = false;
  return m;
}

export function disposePosters() {
  CACHE.forEach((t) => t.dispose());
  CACHE.clear();
}