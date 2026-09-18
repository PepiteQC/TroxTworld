/**
 * 🏦 SIGNAGE — Enseigne Desjardins procédurale
 * Reproduction fidèle du logo officiel : hexagone + nom Desjardins
 */
import * as THREE from "three";
import { DESJARDINS_PALETTE as P } from "./config";

const SIGN_CACHE = new Map<string, THREE.CanvasTexture>();

/**
 * Génère une texture d'enseigne Desjardins.
 * Utilise le vert officiel #00874E et un hexagone stylisé.
 */
export function desjardinsSignTexture(label = "Desjardins"): THREE.CanvasTexture {
  const key = `sign_${label}`;
  const hit = SIGN_CACHE.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Fond vert Desjardins
  ctx.fillStyle = "#00874E";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hexagone (alvéole) blanc à gauche
  const hexCenterX = 140;
  const hexCenterY = canvas.height / 2;
  const hexRadius = 75;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = hexCenterX + Math.cos(angle) * hexRadius;
    const y = hexCenterY + Math.sin(angle) * hexRadius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Cercle central dans l'hexagone (alvéole)
  ctx.fillStyle = "#00874E";
  ctx.beginPath();
  ctx.arc(hexCenterX, hexCenterY, hexRadius * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Nom "Desjardins" en blanc
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 96px 'Outfit', 'Arial', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Desjardins", 250, canvas.height / 2 + 4);

  // Sous-titre (nom de la caisse)
  if (label !== "Desjardins") {
    ctx.font = "italic 36px 'Outfit', 'Arial', sans-serif";
    ctx.fillStyle = "#e0f0e0";
    ctx.fillText(label, 250, canvas.height / 2 + 70);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  SIGN_CACHE.set(key, tex);
  return tex;
}

/**
 * Plaque signalétique (nom de la caisse au-dessus de l'entrée).
 */
export function branchPlaqueTexture(branchName: string): THREE.CanvasTexture {
  const key = `plaque_${branchName}`;
  const hit = SIGN_CACHE.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#00874E";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 28px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(branchName, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  SIGN_CACHE.set(key, tex);
  return tex;
}

/**
 * Écran LED animé pour afficher les numéros de file d'attente.
 */
export function queueDisplayTexture(ticketNumber: number | null): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Fond noir
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cadre vert
  ctx.strokeStyle = "#00874E";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Titre
  ctx.fillStyle = "#00874E";
  ctx.font = "bold 32px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("PROCHAIN CLIENT", canvas.width / 2, 30);

  // Numéro
  ctx.fillStyle = "#2aff7a";
  ctx.font = "bold 120px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ticketNumber !== null ? `#${ticketNumber}` : "---", canvas.width / 2, canvas.height / 2 + 20);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Texture de plaque de GAB (logo Desjardins + "GUICHET").
 */
export function atmLabelTexture(): THREE.CanvasTexture {
  const key = "atm_label";
  const hit = SIGN_CACHE.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#00874E";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Desjardins", canvas.width / 2, 80);

  ctx.font = "bold 36px 'Arial', sans-serif";
  ctx.fillText("GUICHET", canvas.width / 2, 150);
  ctx.fillText("AUTOMATIQUE", canvas.width / 2, 200);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  SIGN_CACHE.set(key, tex);
  return tex;
}

export function disposeSignTextures(): void {
  SIGN_CACHE.forEach((t) => t.dispose());
  SIGN_CACHE.clear();
}