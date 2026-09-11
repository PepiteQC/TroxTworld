import * as THREE from "three";
import { wireCsm } from "./csm";

export type TexId =
  | "parquet"
  | "marbre"
  | "platre"
  | "murNuit"
  | "velours"
  | "chene"
  | "moquette"
  | "plafond"
  | "noyer"
  | "laine"
  | "laineTricot"
  | "laineNrm"
  | "laineKnitNrm"
  | "carAo"
  | "cuir"
  | "cuirNrm"
  | "betonTrous"
  | "betonTrousNrm"
  | "betonDalles"
  | "betonDallesNrm"
  | "betonMur"
  | "betonMurNrm"
  | "asphalteSombre"
  | "platreGris"
  | "porteGrange"
  | "porteGrangeNrm"
  | "brique"
  | "orBrosse"
  | "metalPlie"
  | "cheminee"
  | "rideau"
  | "porteAcier"
  | "parquetLoft";

const FILES: Record<TexId, string> = {
  parquet: "/textures/parquet.jpg",
  marbre: "/textures/marbre.jpg",
  platre: "/textures/platre.jpg",
  murNuit: "/textures/mur-nuit.jpg",
  velours: "/textures/velours.jpg",
  chene: "/textures/chene.jpg",
  moquette: "/textures/moquette.jpg",
  plafond: "/textures/plafond.jpg",
  noyer: "/textures/noyer.jpg",
  laine: "/textures/laine.jpg",
  laineTricot: "/textures/laine-tricot.png",
  laineNrm: "/textures/laine-nrm.jpg",
  laineKnitNrm: "/textures/laine-tricot-nrm.jpg",
  carAo: "/textures/car-ao.jpg",
  cuir: "/textures/cuir.jpg",
  cuirNrm: "/textures/cuir-nrm.png",
  betonTrous: "/textures/beton-trous.jpg",
  betonTrousNrm: "/textures/beton-trous-nrm.png",
  betonDalles: "/textures/beton-dalles.jpg",
  betonDallesNrm: "/textures/beton-dalles-nrm.png",
  betonMur: "/textures/beton-mur.jpg",
  betonMurNrm: "/textures/beton-mur-nrm.png",
  asphalteSombre: "/textures/asphalte-sombre.jpg",
  platreGris: "/textures/platre-gris.jpg",
  porteGrange: "/textures/porte-grange.jpg",
  porteGrangeNrm: "/textures/porte-grange-nrm.png",
  brique: "/textures/brique.jpg",
  orBrosse: "/textures/or-brosse.png",
  metalPlie: "/textures/metal-plie.jpg",
  cheminee: "/textures/cheminee.jpg",
  rideau: "/textures/rideau.jpg",
  porteAcier: "/textures/porte-acier.jpg",
  parquetLoft: "/textures/parquet-loft.jpg",
};

const LINEAR_MAPS = new Set<TexId>([
  "laineNrm",
  "laineKnitNrm",
  "cuirNrm",
  "betonTrousNrm",
  "betonDallesNrm",
  "betonMurNrm",
  "porteGrangeNrm",
]);

export type MapKind = "repeat" | "clamp" | "ui";

class TextureLibrary {
  private loader = new THREE.TextureLoader();
  private maps = new Map<TexId, THREE.Texture>();
  private mats = new Map<string, THREE.MeshStandardMaterial>();
  private clones = new Map<TexId, THREE.Texture[]>();
  aniso = 4;
  private pot = 1024;

  attach(renderer: THREE.WebGLRenderer) {
    const max = renderer.capabilities.getMaxAnisotropy();
    const mobile = Math.min(window.innerWidth, window.innerHeight) < 720;
    this.aniso = Math.max(1, Math.min(mobile ? 2 : 4, max || 1));
    this.pot = mobile ? 512 : 1024;
    this.maps.forEach((t) => {
      t.anisotropy = this.aniso;
    });
    this.clones.forEach((list) => {
      for (const t of list) t.anisotropy = this.aniso;
    });
  }

  finish(tex: THREE.Texture, kind: MapKind = "clamp", linear = false): THREE.Texture {
    tex.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tex.anisotropy = kind === "ui" ? 1 : this.aniso;
    if (kind === "repeat") {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
    } else if (kind === "ui") {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
    } else {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
    }
    return tex;
  }

  private raw(id: TexId): THREE.Texture {
    let map = this.maps.get(id);
    if (map) return map;
    map = new THREE.Texture();
    this.finish(map, "repeat", LINEAR_MAPS.has(id));
    this.maps.set(id, map);
    this.loader.load(FILES[id], (src) => this.ingest(id, map, src));
    return map;
  }

  private ingest(id: TexId, map: THREE.Texture, src: THREE.Texture) {
    const img = src.image as HTMLImageElement;
    const commit = (image: TexImageSource) => {
      map.image = image;
      map.needsUpdate = true;
      const extras = this.clones.get(id);
      if (extras) for (const c of extras) c.needsUpdate = true;
      src.dispose();
    };
    const pot = this.pot;
    if (typeof createImageBitmap === "function") {
      void createImageBitmap(img, {
        resizeWidth: pot,
        resizeHeight: pot,
        resizeQuality: "high",
      }).then(commit).catch(() => commit(img));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = pot;
    canvas.height = pot;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, pot, pot);
      commit(canvas);
    } else {
      commit(img);
    }
  }

  private tile(id: TexId, repeatX: number, repeatY: number): THREE.Texture {
    const map = this.raw(id).clone();
    this.finish(map, "repeat", LINEAR_MAPS.has(id));
    map.repeat.set(repeatX, repeatY);
    const list = this.clones.get(id) ?? [];
    list.push(map);
    this.clones.set(id, list);
    return map;
  }

  mat(
    id: TexId,
    repeatX: number,
    repeatY: number,
    roughness = 0.7,
    metalness = 0,
  ): THREE.MeshStandardMaterial {
    const key = `${id}_${repeatX}_${repeatY}_${roughness}_${metalness}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    const map = this.tile(id, repeatX, repeatY);
    const mat = new THREE.MeshStandardMaterial({
      map,
      roughness,
      metalness,
      color: 0xffffff,
    });
    this.mats.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  cloth(
    albedo: TexId,
    nrm: TexId | null,
    repeatX: number,
    repeatY: number,
    roughness = 0.88,
    tint = 0xffffff,
    bump = 0.7,
  ): THREE.MeshStandardMaterial {
    const key = `cloth_${albedo}_${nrm}_${repeatX}_${repeatY}_${roughness}_${tint}_${bump}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    const map = this.tile(albedo, repeatX, repeatY);
    const mat = new THREE.MeshStandardMaterial({
      map,
      color: tint,
      roughness,
      metalness: 0,
    });
    if (nrm) {
      mat.normalMap = this.tile(nrm, repeatX, repeatY);
      mat.normalScale = new THREE.Vector2(bump, bump);
    }
    this.mats.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  pbr(
    albedo: TexId,
    nrm: TexId | null,
    repeatX: number,
    repeatY: number,
    roughness = 0.9,
    metalness = 0,
    tint = 0xffffff,
    bump = 0.85,
  ): THREE.MeshStandardMaterial {
    const key = `pbr_${albedo}_${nrm}_${repeatX}_${repeatY}_${roughness}_${metalness}_${tint}_${bump}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    const map = this.tile(albedo, repeatX, repeatY);
    const mat = new THREE.MeshStandardMaterial({
      map,
      color: tint,
      roughness,
      metalness,
    });
    if (nrm) {
      mat.normalMap = this.tile(nrm, repeatX, repeatY);
      mat.normalScale = new THREE.Vector2(bump, bump);
    }
    this.mats.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  map(id: TexId, repeatX = 1, repeatY = 1) {
    return this.tile(id, repeatX, repeatY);
  }

  dispose() {
    this.mats.forEach((m) => m.dispose());
    this.clones.forEach((list) => {
      for (const t of list) t.dispose();
    });
    this.maps.forEach((t) => t.dispose());
    this.mats.clear();
    this.clones.clear();
    this.maps.clear();
  }
}

export const tex = new TextureLibrary();

export function finishMap<T extends THREE.Texture>(map: T, kind: MapKind = "clamp"): T {
  tex.finish(map, kind);
  map.needsUpdate = true;
  return map;
}
