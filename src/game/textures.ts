import * as THREE from "three";

export type MapKind = "albedo" | "normal" | "roughness" | "ao" | "displacement";
export type TexId = string;

export interface TexMetrics {
  totalTextures: number;
  memoryEstimateKb: number;
}

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap?: THREE.CanvasTexture;
}

export function finishMap(
  source: HTMLCanvasElement | THREE.Texture,
  repeatXOrMode: number | "clamp" | "ui" = 1,
  repeatY: number = 1,
  colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace
): THREE.CanvasTexture {
  const t = (source instanceof THREE.Texture ? source : new THREE.CanvasTexture(source)) as THREE.CanvasTexture;

  if (repeatXOrMode === "clamp" || repeatXOrMode === "ui") {
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(1, 1);
    t.generateMipmaps = repeatXOrMode === "ui" ? false : true;
    t.minFilter = repeatXOrMode === "ui" ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
  } else {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatXOrMode, repeatY);
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
  }

  t.colorSpace = colorSpace;
  t.needsUpdate = true;
  return t;
}

export function hash2D(x: number, y: number, seed = 1337): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

export function noise2D(x: number, y: number, seed = 1337): number {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const s00 = hash2D(i, j, seed);
  const s10 = hash2D(i + 1, j, seed);
  const s01 = hash2D(i, j + 1, seed);
  const s11 = hash2D(i + 1, j + 1, seed);
  return s00 * (1 - ux) * (1 - uy) + s10 * ux * (1 - uy) + s01 * (1 - ux) * uy + s11 * ux * uy;
}

export function fbm2D(x: number, y: number, octaves = 5, seed = 1337): number {
  let val = 0, amp = 0.5, freq = 1.0;
  for (let o = 0; o < octaves; o++) {
    val += amp * noise2D(x * freq, y * freq, seed + o * 31);
    amp *= 0.5;
    freq *= 2.0;
  }
  return val;
}

class TextureFactory {
  private cache = new Map<string, THREE.Texture>();
  private materialCache = new Map<string, THREE.MeshStandardMaterial>();
  private clothCache = new Map<string, THREE.MeshStandardMaterial>();
  private mapCache = new Map<string, THREE.CanvasTexture>();
  private renderer: THREE.WebGLRenderer | null = null;
  private maxAnisotropy = 8;

  constructor() {
    if (typeof window !== "undefined") {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl");
      if (gl) {
        const ext = gl.getExtension("EXT_texture_filter_anisotropic");
        if (ext) this.maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 8;
      }
    }
  }

  public attach(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  public finishMap(
    source: HTMLCanvasElement | THREE.Texture,
    repeatXOrMode: number | "clamp" | "ui" = 1,
    repeatY = 1
  ): THREE.CanvasTexture {
    return finishMap(source, repeatXOrMode, repeatY);
  }

  public map(name: string, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
    const key = `map_${name}_${repeatX}_${repeatY}`;
    const cached = this.mapCache.get(key);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = this.colorForName(name);
    ctx.fillRect(0, 0, 256, 256);

    const img = ctx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n));
      img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n));
      img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n));
    }
    ctx.putImageData(img, 0, 0);

    const tex = this.finishMap(canvas, repeatX, repeatY);
    tex.anisotropy = this.maxAnisotropy;
    this.mapCache.set(key, tex);
    return tex;
  }

  public mat(name: string, repeatX = 1, repeatY = 1, roughness = 0.8, metalness = 0): THREE.MeshStandardMaterial {
    const key = `mat_${name}_${repeatX}_${repeatY}_${roughness}_${metalness}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached;

    const mat = new THREE.MeshStandardMaterial({
      map: this.map(name, repeatX, repeatY),
      roughness,
      metalness,
    });
    mat.name = key;
    this.materialCache.set(key, mat);
    return mat;
  }

  public cloth(
    name: string,
    normalName = "laineNrm",
    repeatX = 1,
    repeatY = 1,
    roughness = 0.9,
    color: number = 0xffffff,
    normalScale = 0.5
  ): THREE.MeshStandardMaterial {
    const key = `cloth_${name}_${normalName}_${color}_${repeatX}_${repeatY}`;
    const cached = this.clothCache.get(key);
    if (cached) return cached;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      map: this.map(name, repeatX, repeatY),
      normalMap: this.map(normalName, repeatX, repeatY),
      normalScale: new THREE.Vector2(normalScale, normalScale),
      roughness,
      metalness: 0.02,
    });
    mat.name = key;
    this.clothCache.set(key, mat);
    return mat;
  }

  public pbr(
    name: string,
    normalMapName: any = null,
    repeatX: any = 1,
    repeatY: number = 1,
    roughness: number = 0.8,
    metalness: number = 0.1,
    tint: number = 0xffffff,
    envIntensity: number = 0.5
  ): THREE.MeshStandardMaterial {
    const finalRepeatX = typeof repeatX === "number" ? repeatX : 1;
    const key = `pbr_${name}_${normalMapName}_${finalRepeatX}_${repeatY}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached;

    const finalNormalMap = typeof normalMapName === "string" ? this.map(normalMapName, finalRepeatX, repeatY) : null;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(tint),
      map: this.map(name, finalRepeatX, repeatY),
      normalMap: finalNormalMap,
      normalScale: new THREE.Vector2(1, 1),
      roughness,
      metalness,
      envMapIntensity: envIntensity,
    });
    mat.name = key;
    this.materialCache.set(key, mat);
    return mat;
  }

  private colorForName(name: string): string {
    const palette: Record<string, string> = {
      noyer: "#4a3020",
      chene: "#8a6a48",
      parquet: "#7a5a3a",
      parquetLoft: "#6a4a30",
      marbre: "#e8e4d8",
      platre: "#f0ece0",
      platreGris: "#c4c0b8",
      betonMur: "#8a8580",
      betonDalles: "#7a7570",
      betonTrous: "#6a6560",
      brique: "#8f4a38",
      cheminee: "#4a2a1a",
      velours: "#5a2a3a",
      laine: "#c8b898",
      laineTricot: "#a8a898",
      laineNrm: "#8080ff",
      laineKnitNrm: "#8080ff",
      porteAcier: "#4a4a52",
      porteGrange: "#6a4a30",
      porteGrangeNrm: "#8080ff",
      moquette: "#4a3a2a",
      plafond: "#f0ece0",
      murNuit: "#3a3a48",
      rideau: "#4a2a3a",
      orBrosse: "#c4a030",
      asphalteSombre: "#2a2a2c",
    };
    return palette[name] ?? "#888888";
  }

  public getMetrics(): TexMetrics {
    return {
      totalTextures: this.cache.size + this.mapCache.size,
      memoryEstimateKb: (this.cache.size + this.mapCache.size) * 256,
    };
  }

  public dispose(): void {
    this.cache.forEach((t) => t.dispose());
    this.cache.clear();
    this.mapCache.forEach((t) => t.dispose());
    this.mapCache.clear();
    this.materialCache.forEach((m) => m.dispose());
    this.materialCache.clear();
    this.clothCache.forEach((m) => m.dispose());
    this.clothCache.clear();
  }
}

export const tex = new TextureFactory();
