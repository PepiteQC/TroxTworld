import * as THREE from "three";
import { wireCsm } from "./csm";
import { usePbr, type QcMat } from "./materials";

/**
 * Identifiants de textures disponibles dans le jeu
 */
export type TexId =
  | "parquet" | "marbre" | "platre" | "murNuit" | "velours" | "chene"
  | "moquette" | "plafond" | "noyer" | "laine" | "laineTricot" | "laineNrm"
  | "laineKnitNrm" | "carAo" | "cuir" | "cuirNrm" | "betonTrous"
  | "betonTrousNrm" | "betonDalles" | "betonDallesNrm" | "betonMur"
  | "betonMurNrm" | "asphalteSombre" | "platreGris" | "porteGrange"
  | "porteGrangeNrm" | "brique" | "orBrosse" | "metalPlie" | "cheminee"
  | "rideau" | "porteAcier" | "parquetLoft";

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

/** Textures en espace linéaire (normal maps, AO) */
const LINEAR_MAPS = new Set<TexId>([
  "laineNrm", "laineKnitNrm", "cuirNrm", "betonTrousNrm",
  "betonDallesNrm", "betonMurNrm", "porteGrangeNrm",
]);

/** Textures prioritaires à charger au démarrage */
const PRIORITY_TEX: TexId[] = ["parquet", "platre", "moquette", "plafond"];

/** Nombre max de clones par texture source */
const MAX_CLONES_PER_TEX = 12;

export type MapKind = "repeat" | "clamp" | "ui";

/** Métriques de performance pour le monitoring */
export interface TexMetrics {
  loaded: number;
  failed: number;
  clones: number;
  mats: number;
  memEstimateMB: number;
  loadTimeMs: number;
}

class TextureLibrary {
  private loader = new THREE.TextureLoader();
  private maps = new Map<TexId, THREE.Texture>();
  private mats = new Map<string, QcMat>();
  private clones = new Map<TexId, THREE.Texture[]>();
  private failed = new Set<TexId>();
  private loadStart = 0;
  private loadCount = 0;
  private failCount = 0;
  
  /** Anisotropie calculée selon les capacités GPU */
  aniso = 4;
  /** Taille POT max selon mobile/desktop */
  private pot = 1024;

  /**
   * Attache le renderer et configure l'anisotropie optimale
   */
  attach(renderer: THREE.WebGLRenderer) {
    const max = renderer.capabilities.getMaxAnisotropy();
    const mobile = Math.min(window.innerWidth, window.innerHeight) < 720;
    this.aniso = Math.max(1, Math.min(mobile ? 4 : 16, max || 1));
    this.pot = mobile ? 1024 : 2048;
    this.maps.forEach((t) => { t.anisotropy = this.aniso; });
    this.clones.forEach((list) => {
      for (const t of list) t.anisotropy = this.aniso;
    });
  }

  /**
   * Précharge les textures prioritaires au démarrage
   * Appeler après attach() pour un chargement optimisé
   */
  preloadPriority(): Promise<void> {
    this.loadStart = performance.now();
    const promises = PRIORITY_TEX.map((id) => {
      return new Promise<void>((resolve) => {
        this.raw(id); // Déclenche le chargement
        // On résout immédiatement, le chargement est async
        resolve();
      });
    });
    return Promise.all(promises).then(() => {});
  }

  /**
   * Configure une texture avec les bons paramètres de filtrage
   */
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

  /**
   * Récupère ou crée la texture source
   */
  private raw(id: TexId): THREE.Texture {
    let map = this.maps.get(id);
    if (map) return map;
    
    map = new THREE.Texture();
    this.finish(map, "repeat", LINEAR_MAPS.has(id));
    this.maps.set(id, map);
    
    this.loader.load(
      FILES[id],
      (src) => this.ingest(id, map!, src),
      undefined,
      () => {
        // Fallback si la texture échoue à charger
        this.failCount++;
        this.failed.add(id);
        console.warn(`[textures] Échec chargement: ${FILES[id]}`);
      }
    );
    return map;
  }

  /**
   * Intègre l'image chargée avec redimensionnement POT si nécessaire
   */
  private ingest(id: TexId, map: THREE.Texture, src: THREE.Texture) {
    const img = src.image as HTMLImageElement;
    const commit = (image: TexImageSource) => {
      map.image = image;
      map.needsUpdate = true;
      const extras = this.clones.get(id);
      if (extras) for (const c of extras) c.needsUpdate = true;
      src.dispose();
      this.loadCount++;
    };
    
    const w = img.width || 0;
    const h = img.height || 0;
    const pot = this.pot;
    const alreadyOk = w > 0 && h > 0 && w <= pot && h <= pot;
    
    if (alreadyOk) {
      commit(img);
      return;
    }
    
    // Redimensionnement GPU si disponible
    if (typeof createImageBitmap === "function") {
      void createImageBitmap(img, {
        resizeWidth: pot,
        resizeHeight: pot,
        resizeQuality: "high",
      }).then(commit).catch(() => commit(img));
      return;
    }
    
    // Fallback canvas 2D
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

  /**
   * Crée un clone de texture avec tiling spécifique
   * Limite le nombre de clones pour éviter la fuite mémoire
   */
  private tile(id: TexId, repeatX: number, repeatY: number): THREE.Texture {
    const list = this.clones.get(id) ?? [];
    
    // Cherche un clone existant avec le même tiling
    for (const existing of list) {
      if (existing.repeat.x === repeatX && existing.repeat.y === repeatY) {
        return existing;
      }
    }
    
    // Limite le nombre de clones par texture source
    if (list.length >= MAX_CLONES_PER_TEX) {
      // Réutilise le premier clone si trop de clones
      const reuse = list[0]!;
      reuse.repeat.set(repeatX, repeatY);
      return reuse;
    }
    
    const map = this.raw(id).clone();
    this.finish(map, "repeat", LINEAR_MAPS.has(id));
    map.repeat.set(repeatX, repeatY);
    list.push(map);
    this.clones.set(id, list);
    return map;
  }

  /**
   * Crée un matériau texturé avec cache
   */
  mat(
    id: TexId,
    repeatX: number,
    repeatY: number,
    roughness = 0.7,
    metalness = 0,
  ): QcMat {
    const pbr = usePbr(roughness, metalness);
    const key = `${pbr ? "s" : "l"}_${id}_${repeatX}_${repeatY}_${roughness}_${metalness}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    
    const map = this.tile(id, repeatX, repeatY);
    const mat = pbr
      ? new THREE.MeshStandardMaterial({ map, roughness, metalness, color: 0xffffff })
      : new THREE.MeshLambertMaterial({ map, color: 0xffffff });
    
    this.mats.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Crée un matériau tissu avec normal map optionnelle
   */
  cloth(
    albedo: TexId,
    nrm: TexId | null,
    repeatX: number,
    repeatY: number,
    roughness = 0.88,
    tint = 0xffffff,
    bump = 0.7,
  ): QcMat {
    const pbr = usePbr(roughness, 0);
    const key = `cloth_${pbr ? "s" : "l"}_${albedo}_${nrm}_${repeatX}_${repeatY}_${roughness}_${tint}_${bump}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    
    const map = this.tile(albedo, repeatX, repeatY);
    const mat = pbr
      ? new THREE.MeshStandardMaterial({ map, color: tint, roughness, metalness: 0 })
      : new THREE.MeshLambertMaterial({ map, color: tint });
    
    if (nrm && pbr) {
      mat.normalMap = this.tile(nrm, repeatX, repeatY);
      mat.normalScale = new THREE.Vector2(bump, bump);
    }
    
    this.mats.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Crée un matériau PBR complet avec normal map
   */
  pbr(
    albedo: TexId,
    nrm: TexId | null,
    repeatX: number,
    repeatY: number,
    roughness = 0.9,
    metalness = 0,
    tint = 0xffffff,
    bump = 0.85,
  ): QcMat {
    const pbr = usePbr(roughness, metalness);
    const key = `pbr_${pbr ? "s" : "l"}_${albedo}_${nrm}_${repeatX}_${repeatY}_${roughness}_${metalness}_${tint}_${bump}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    
    const map = this.tile(albedo, repeatX, repeatY);
    const mat = pbr
      ? new THREE.MeshStandardMaterial({ map, color: tint, roughness, metalness })
      : new THREE.MeshLambertMaterial({ map, color: tint });
    
    if (nrm && pbr) {
      mat.normalMap = this.tile(nrm, repeatX, repeatY);
      mat.normalScale = new THREE.Vector2(bump, bump);
    }
    
    this.mats.set(key, mat);
    wireCsm(mat);
    return mat;
  }

  /**
   * Récupère une texture avec tiling (usage direct)
   */
  map(id: TexId, repeatX = 1, repeatY = 1) {
    return this.tile(id, repeatX, repeatY);
  }

  /**
   * Retourne les métriques de performance
   */
  getMetrics(): TexMetrics {
    let memEstimate = 0;
    const estimateTex = (t: THREE.Texture) => {
      const img = t.image as HTMLImageElement | HTMLCanvasElement | undefined;
      if (img && img.width) {
        // Estimation : 4 bytes/pixel (RGBA) + mipmaps (~33%)
        memEstimate += img.width * img.height * 4 * 1.33;
      }
    };
    this.maps.forEach(estimateTex);
    this.clones.forEach((list) => list.forEach(estimateTex));
    
    return {
      loaded: this.loadCount,
      failed: this.failCount,
      clones: Array.from(this.clones.values()).reduce((sum, l) => sum + l.length, 0),
      mats: this.mats.size,
      memEstimateMB: Math.round(memEstimate / (1024 * 1024)),
      loadTimeMs: this.loadStart ? performance.now() - this.loadStart : 0,
    };
  }

  /**
   * Vérifie si une texture a échoué à charger
   */
  isFailed(id: TexId): boolean {
    return this.failed.has(id);
  }

  /**
   * Libère toutes les ressources GPU
   */
  dispose() {
    this.mats.forEach((m) => m.dispose());
    this.clones.forEach((list) => {
      for (const t of list) t.dispose();
    });
    this.maps.forEach((t) => t.dispose());
    this.mats.clear();
    this.clones.clear();
    this.maps.clear();
    this.failed.clear();
  }
}

export const tex = new TextureLibrary();

/**
 * Utilitaire pour finaliser une texture externe
 */
export function finishMap<T extends THREE.Texture>(map: T, kind: MapKind = "clamp"): T {
  tex.finish(map, kind);
  map.needsUpdate = true;
  return map;
}