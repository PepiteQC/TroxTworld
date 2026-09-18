// src/utils/TextureGenerator.ts
import * as THREE from "three";

export class TextureGenerator {
  /**
   * Génère une texture de fumée (nuage gris transparent)
   */
  static generateSmokeTexture(size: number = 128): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < 3; i++) {
      const centerX = size * (0.3 + Math.random() * 0.4);
      const centerY = size * (0.3 + Math.random() * 0.4);
      const radius = size * (0.2 + Math.random() * 0.15);
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `rgba(200, 200, 200, 0.8)`);
      gradient.addColorStop(0.5, `rgba(150, 150, 150, 0.5)`);
      gradient.addColorStop(1, `rgba(100, 100, 100, 0)`);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Génère une texture d'étincelles (points lumineux)
   */
  static generateSparkTexture(size: number = 64, count: number = 10): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < count; i++) {
      const x = size * Math.random();
      const y = size * Math.random();
      const radius = 2 + Math.random() * 3;
      const color = `hsl(${Math.random() * 30 + 20}, 100%, ${50 + Math.random() * 30}%)`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      const haloGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
      haloGradient.addColorStop(0, color);
      haloGradient.addColorStop(1, "rgba(255, 200, 0, 0)");
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = haloGradient;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Génère une texture de sang (taches rouges)
   */
  static generateBloodTexture(size: number = 128): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    const centerX = size * 0.5;
    const centerY = size * 0.5;
    const radius = size * 0.3;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, "#8b0000");
    gradient.addColorStop(0.7, "#5a0000");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    for (let i = 0; i < 5; i++) {
      const x = size * (0.3 + Math.random() * 0.4);
      const y = size * (0.3 + Math.random() * 0.4);
      const dropRadius = size * (0.05 + Math.random() * 0.05);
      ctx.beginPath();
      ctx.arc(x, y, dropRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#a00000";
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Génère une texture de métal (acier brossé)
   */
  static generateMetalTexture(size: number = 256): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#4a4d52";
    ctx.fillRect(0, 0, size, size);

    const lineHeight = 2;
    const lineSpacing = 8;
    for (let y = 0; y < size; y += lineSpacing) {
      const opacity = 0.1 + Math.random() * 0.1;
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = lineHeight;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * 2);
      ctx.lineTo(size, y + Math.random() * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 10; i++) {
      const x = size * Math.random();
      const y = size * Math.random();
      const rustRadius = size * (0.05 + Math.random() * 0.05);
      const rustGradient = ctx.createRadialGradient(x, y, 0, x, y, rustRadius);
      rustGradient.addColorStop(0, "#8b4513");
      rustGradient.addColorStop(1, "rgba(139, 69, 19, 0)");
      ctx.beginPath();
      ctx.arc(x, y, rustRadius, 0, Math.PI * 2);
      ctx.fillStyle = rustGradient;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Génère une texture de bois (pour les crosses)
   */
  static generateWoodTexture(size: number = 256): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#5a4632";
    ctx.fillRect(0, 0, size, size);

    const veinCount = 20;
    for (let i = 0; i < veinCount; i++) {
      const x = size * Math.random();
      const yStart = size * Math.random();
      const yEnd = yStart + size * 0.3;
      const width = 1 + Math.random() * 3;
      const color = `rgba(80, 60, 40, ${0.2 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(x, yStart);
      ctx.lineTo(x + width, yEnd);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    for (let i = 0; i < 5; i++) {
      const x = size * Math.random();
      const y = size * Math.random();
      const radius = size * (0.03 + Math.random() * 0.03);
      const knotGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      knotGradient.addColorStop(0, "#3a2e22");
      knotGradient.addColorStop(1, "rgba(58, 46, 34, 0)");
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = knotGradient;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Génère une texture de béton (pour le sol et les murs)
   */
  static generateConcreteTexture(size: number = 256): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#8a8a8a";
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 30; i++) {
      const x = size * Math.random();
      const y = size * Math.random();
      const spotSize = size * (0.05 + Math.random() * 0.1);
      const color = `rgba(50, 50, 50, ${0.1 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, spotSize, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    for (let i = 0; i < 5; i++) {
      const x1 = size * Math.random();
      const y1 = size * Math.random();
      const x2 = x1 + (Math.random() - 0.5) * size * 0.3;
      const y2 = y1 + (Math.random() - 0.5) * size * 0.3;
      const width = 0.5 + Math.random() * 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = width;
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Génère une texture de verre (pour les vitrines)
   */
  static generateGlassTexture(size: number = 128): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "rgba(150, 200, 255, 0.2)";
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 5; i++) {
      const x = size * Math.random();
      const y = size * Math.random();
      const radius = size * (0.05 + Math.random() * 0.1);
      const reflectionGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      reflectionGradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
      reflectionGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = reflectionGradient;
      ctx.fill();
    }

    for (let i = 0; i < 10; i++) {
      const y = size * Math.random();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (Math.random() - 0.5) * 5);
      ctx.strokeStyle = "rgba(200, 220, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Génère une texture de néon (pour l'enseigne)
   */
  static generateNeonTexture(
    size: { width: number; height: number } = { width: 1024, height: 256 },
    text: string = "ARMURERIE\nCOUTELLERIE",
    color: number = 0xf4c98a
  ): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size.width, size.height);

    ctx.fillStyle = "#14141c";
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.strokeStyle = "#d8a15a";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, size.width - 16, size.height - 16);

    const lines = text.split("\n");
    const colorHex = color.toString(16).padStart(6, "0");
    ctx.fillStyle = `#${colorHex}`;
    ctx.font = `bold ${size.height * 0.4}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(lines[0], size.width / 2, size.height * 0.3);

    if (lines[1]) {
      ctx.fillStyle = "#c8d2d8";
      ctx.font = `600 ${size.height * 0.15}px sans-serif`;
      ctx.fillText(lines[1], size.width / 2, size.height * 0.7);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }
}