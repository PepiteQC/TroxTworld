import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

/**
 * ============================================================================
 * TROXTWORLD — AK-74U / KRINKOV
 * ============================================================================
 *
 * Asset runtime:
 *
 * /public/models/weapons/ak74u/AK74U.fbx
 * /public/models/weapons/ak74u/textures/*
 *
 * Le système supporte :
 * - FBX réel
 * - textures externes
 * - animations FBX
 * - AnimationMixer
 * - cycle mécanique fallback
 * - arme posée au sol
 * - arme tenue en FPS
 *
 * IMPORTANT :
 * Le loader est asynchrone. ak74Held() retourne immédiatement un Group
 * et le vrai FBX vient remplacer son contenu dès qu'il est chargé.
 * Cela permet de rester compatible avec WeaponSystem.meshFactory().
 */

const AK74U_MODEL = "/models/weapons/ak74u/AK74U.fbx";
const AK74U_TEXTURES = "/models/weapons/ak74u/textures/";

const WORLD_LENGTH = 0.94;

/* -------------------------------------------------------------------------- */
/* CACHE                                                                      */
/* -------------------------------------------------------------------------- */

let sourcePromise: Promise<THREE.Group> | null = null;
let sourceTemplate: THREE.Group | null = null;

/* -------------------------------------------------------------------------- */
/* FBX LOADER                                                                 */
/* -------------------------------------------------------------------------- */

function createLoader(): FBXLoader {
  const loader = new FBXLoader();

  /*
   * Les textures sont dans :
   *
   * /models/weapons/ak74u/textures/
   *
   * et non à côté du FBX.
   */
  loader.setResourcePath(AK74U_TEXTURES);

  return loader;
}

/* -------------------------------------------------------------------------- */
/* TEXTURE HELPERS                                                            */
/* -------------------------------------------------------------------------- */

function configureTexture(
  texture: THREE.Texture,
  color = false,
): THREE.Texture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  texture.anisotropy = 8;

  texture.colorSpace = color
    ? THREE.SRGBColorSpace
    : THREE.NoColorSpace;

  texture.needsUpdate = true;

  return texture;
}

/**
 * Recherche une texture déjà chargée par le FBX.
 *
 * Le FBX peut référencer les textures avec différents chemins.
 * On normalise le nom pour retrouver facilement les maps.
 */
function textureName(texture: THREE.Texture | null | undefined): string {
  if (!texture) return "";

  const sourceFile = texture.userData?.["sourceFile"];

  if (typeof sourceFile === "string") {
    return sourceFile.toLowerCase();
  }

  return texture.name.toLowerCase();
}

function applyTextureColorSpace(texture: THREE.Texture | null | undefined) {
  if (!texture) return;
  configureTexture(texture, true);
}

function applyTextureDataSpace(texture: THREE.Texture | null | undefined) {
  if (!texture) return;
  configureTexture(texture, false);
}

/* -------------------------------------------------------------------------- */
/* MATERIALS                                                                  */
/* -------------------------------------------------------------------------- */

function configureMaterial(
  material: THREE.Material,
): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) {
    return;
  }

  material.side = THREE.FrontSide;

  material.transparent = false;

  material.depthWrite = true;
  material.depthTest = true;

  /*
   * Les fichiers *_Glossiness sont inversés par rapport à Roughness.
   * On ne les transforme pas ici car le FBX peut déjà avoir son propre
   * mapping. Les textures *_Rough sont prioritaires.
   */

  applyTextureColorSpace(material.map);

  applyTextureDataSpace(material.normalMap);
  applyTextureDataSpace(material.roughnessMap);
  applyTextureDataSpace(material.metalnessMap);
  applyTextureDataSpace(material.aoMap);

  if (material.normalMap) {
    material.normalScale.set(1, 1);
  }

  material.needsUpdate = true;
}

/* -------------------------------------------------------------------------- */
/* FBX NORMALIZATION                                                          */
/* -------------------------------------------------------------------------- */

function normalizeFBX(root: THREE.Group): THREE.Group {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.castShadow = true;
    object.receiveShadow = true;

    if (object.geometry) {
      object.geometry.computeBoundingBox();
      object.geometry.computeBoundingSphere();

      /*
       * Certains modèles FBX n'ont pas de uv2.
       * On réutilise UV1 pour l'AO lorsque nécessaire.
       */
      if (
        object.geometry.attributes.uv &&
        !object.geometry.attributes.uv2
      ) {
        object.geometry.setAttribute(
          "uv2",
          object.geometry.attributes.uv,
        );
      }
    }

    if (Array.isArray(object.material)) {
      object.material.forEach(configureMaterial);
    } else if (object.material) {
      configureMaterial(object.material);
    }
  });

  return root;
}

/* -------------------------------------------------------------------------- */
/* FIT MODEL                                                                  */
/* -------------------------------------------------------------------------- */

function getBounds(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);

  const bounds = new THREE.Box3();

  bounds.setFromObject(root);

  return bounds;
}

/**
 * Met le modèle à environ 94 cm.
 *
 * Le FBX peut avoir été exporté avec :
 * - mètres
 * - centimètres
 * - unités 3ds Max
 *
 * On normalise donc la longueur réelle plutôt que de supposer son unité.
 */
function fitWeaponLength(
  root: THREE.Object3D,
  targetLength = WORLD_LENGTH,
): void {
  const bounds = getBounds(root);

  const size = new THREE.Vector3();

  bounds.getSize(size);

  const dimensions = [
    Math.abs(size.x),
    Math.abs(size.y),
    Math.abs(size.z),
  ].sort((a, b) => b - a);

  const currentLength = dimensions[0] ?? 0;

  if (currentLength <= 0.0001) {
    return;
  }

  const scale = targetLength / currentLength;

  root.scale.multiplyScalar(scale);

  root.updateMatrixWorld(true);
}

/**
 * Recentrage du modèle autour de son centre.
 */
function centerWeapon(root: THREE.Object3D): void {
  const bounds = getBounds(root);

  const center = new THREE.Vector3();

  bounds.getCenter(center);

  root.position.sub(center);

  /*
   * On remet la base légèrement au-dessus de Y=0.
   */
  const centeredBounds = getBounds(root);

  root.position.y -= centeredBounds.min.y;
}

/* -------------------------------------------------------------------------- */
/* ANIMATION DATA                                                             */
/* -------------------------------------------------------------------------- */

interface AnimationState {
  mixer: THREE.AnimationMixer | null;
  clips: THREE.AnimationClip[];
  currentAction: THREE.AnimationAction | null;
  currentClipName: string | null;
  elapsed: number;
  cycleRequested: boolean;
}

function createAnimationState(): AnimationState {
  return {
    mixer: null,
    clips: [],
    currentAction: null,
    currentClipName: null,
    elapsed: 0,
    cycleRequested: false,
  };
}

function getAnimationState(
  root: THREE.Object3D,
): AnimationState {
  const existing = root.userData["animationState"];

  if (existing) {
    return existing as AnimationState;
  }

  const state = createAnimationState();

  root.userData["animationState"] = state;

  return state;
}

/* -------------------------------------------------------------------------- */
/* ANIMATION DISCOVERY                                                        */
/* -------------------------------------------------------------------------- */

function findClip(
  clips: THREE.AnimationClip[],
  keywords: string[],
): THREE.AnimationClip | null {
  if (!clips.length) {
    return null;
  }

  const normalized = keywords.map((keyword) =>
    keyword.toLowerCase(),
  );

  for (const clip of clips) {
    const name = clip.name.toLowerCase();

    if (
      normalized.some((keyword) =>
        name.includes(keyword),
      )
    ) {
      return clip;
    }
  }

  return null;
}

function chooseCycleClip(
  clips: THREE.AnimationClip[],
): THREE.AnimationClip | null {
  /*
   * On privilégie les clips qui ressemblent à :
   *
   * fire
   * shoot
   * recoil
   * action
   * cycle
   * rifle
   * ak
   */
  const preferred = findClip(clips, [
    "fire",
    "shoot",
    "recoil",
    "cycle",
    "action",
    "ak74",
    "ak74u",
    "krinkov",
  ]);

  if (preferred) {
    return preferred;
  }

  /*
   * Sinon premier clip disponible.
   */
  return clips[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* ANIMATION INITIALIZATION                                                   */
/* -------------------------------------------------------------------------- */

function initializeAnimations(
  root: THREE.Group,
): void {
  const clips = root.animations ?? [];

  const state = getAnimationState(root);

  state.clips = clips;

  if (!clips.length) {
    console.info(
      "[AK74U] Aucun AnimationClip trouvé dans le FBX. Fallback mécanique activé.",
    );

    return;
  }

  state.mixer = new THREE.AnimationMixer(root);

  console.info(
    `[AK74U] ${clips.length} animation(s) FBX détectée(s):`,
    clips.map((clip) => clip.name),
  );

  /*
   * On ne joue pas automatiquement l'animation.
   * Elle est déclenchée uniquement lors du tir/cycle.
   */
}

/* -------------------------------------------------------------------------- */
/* FBX LOAD                                                                   */
/* -------------------------------------------------------------------------- */

function loadSource(): Promise<THREE.Group> {
  if (sourceTemplate) {
    return Promise.resolve(sourceTemplate.clone(true));
  }

  if (sourcePromise) {
    return sourcePromise.then((source) =>
      source.clone(true),
    );
  }

  sourcePromise = new Promise<THREE.Group>(
    (resolve, reject) => {
      const loader = createLoader();

      loader.load(
        AK74U_MODEL,

        (fbx) => {
          console.info(
            "[AK74U] FBX chargé:",
            AK74U_MODEL,
          );

          normalizeFBX(fbx);

          fitWeaponLength(fbx, WORLD_LENGTH);

          centerWeapon(fbx);

          initializeAnimations(fbx);

          /*
           * Le template original reste caché de la scène.
           * Les instances sont clonées par ak74Held().
           */
          sourceTemplate = fbx;

          resolve(fbx.clone(true));
        },

        undefined,

        (error) => {
          console.error(
            "[AK74U] Impossible de charger le FBX:",
            AK74U_MODEL,
            error,
          );

          reject(error);
        },
      );
    },
  );

  return sourcePromise;
}

/* -------------------------------------------------------------------------- */
/* FALLBACK MODEL                                                             */
/* -------------------------------------------------------------------------- */

function createFallbackWeapon(): THREE.Group {
  const root = new THREE.Group();

  root.name = "ak74u-fallback";

  const steel = new THREE.MeshStandardMaterial({
    color: 0x242629,
    roughness: 0.42,
    metalness: 0.82,
  });

  const polymer = new THREE.MeshStandardMaterial({
    color: 0x202124,
    roughness: 0.72,
    metalness: 0.08,
  });

  const wood = new THREE.MeshStandardMaterial({
    color: 0x75401f,
    roughness: 0.68,
    metalness: 0.03,
  });

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.008,
      0.009,
      0.38,
      12,
    ),
    steel,
  );

  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = 0.25;

  root.add(barrel);

  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.25,
      0.055,
      0.05,
    ),
    steel,
  );

  receiver.position.x = -0.04;

  root.add(receiver);

  const handGuard = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.22,
      0.06,
      0.055,
    ),
    wood,
  );

  handGuard.position.set(
    0.12,
    0.005,
    0,
  );

  root.add(handGuard);

  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.045,
      0.11,
      0.035,
    ),
    polymer,
  );

  grip.position.set(
    -0.15,
    -0.045,
    0,
  );

  grip.rotation.z = 0.3;

  root.add(grip);

  const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.045,
      0.16,
      0.035,
    ),
    polymer,
  );

  magazine.position.set(
    -0.01,
    -0.07,
    0,
  );

  magazine.rotation.z = 0.35;

  root.add(magazine);

  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return root;
}

/* -------------------------------------------------------------------------- */
/* ASYNC FBX REPLACEMENT                                                      */
/* -------------------------------------------------------------------------- */

function replaceWithFBX(
  holder: THREE.Group,
): void {
  loadSource()
    .then((fbx) => {
      /*
       * On conserve le Group retourné immédiatement par ak74Held().
       * Le weaponSystem n'a donc pas besoin de devenir async.
       */
      holder.clear();

      const weapon = fbx.clone(true);

      weapon.name = "AK74U-FBX";

      /*
       * Le clone doit avoir son propre AnimationMixer.
       */
      const animationState = createAnimationState();

      animationState.clips =
        sourceTemplate?.animations
          ? sourceTemplate.animations
          : weapon.animations ?? [];

      if (animationState.clips.length) {
        animationState.mixer =
          new THREE.AnimationMixer(weapon);
      }

      weapon.userData["animationState"] =
        animationState;

      holder.add(weapon);

      holder.userData["fbxLoaded"] = true;
      holder.userData["weaponRoot"] = weapon;

      console.info(
        "[AK74U] Modèle FBX installé dans l'arme.",
      );
    })
    .catch((error) => {
      console.warn(
        "[AK74U] Le FBX n'a pas pu être installé. Fallback conservé.",
        error,
      );
    });
}

/* -------------------------------------------------------------------------- */
/* PUBLIC FACTORY                                                             */
/* -------------------------------------------------------------------------- */

/**
 * AK-74U au sol.
 */
export function ak74Prop(): THREE.Group {
  const holder = new THREE.Group();

  holder.name = "ak74u";

  holder.userData["weaponId"] = "ak74u";

  const fallback = createFallbackWeapon();

  fallback.name = "AK74U-loading";

  fitWeaponLength(
    fallback,
    WORLD_LENGTH,
  );

  centerWeapon(fallback);

  holder.add(fallback);

  /*
   * Chargement du vrai FBX.
   */
  replaceWithFBX(holder);

  holder.userData["prop"] = "ak74u";

  return holder;
}

/**
 * AK-74U tenue en FPS.
 *
 * Le point important ici est que le modèle est d'abord chargé dans
 * un conteneur neutre, puis orienté pour le système FPS existant.
 */
export function ak74Held(): THREE.Group {
  const holder = new THREE.Group();

  holder.name = "ak74-rig";

  holder.userData["weaponId"] = "ak74u";

  holder.userData["cycle"] = 0;
  holder.userData["t"] = 0;

  /*
   * Transformation FPS.
   *
   * Le WeaponSystem place ensuite le holder dans la caméra :
   *
   * position (0.3, -0.25, -0.5)
   *
   * On garde donc cette responsabilité séparée.
   */
  holder.rotation.set(
    0,
    Math.PI / 2,
    0,
  );

  /*
   * Fallback immédiat.
   */
  const fallback = createFallbackWeapon();

  fallback.name = "AK74U-loading";

  fitWeaponLength(
    fallback,
    WORLD_LENGTH,
  );

  centerWeapon(fallback);

  holder.add(fallback);

  /*
   * Puis remplacement automatique par le FBX.
   */
  replaceWithFBX(holder);

  return holder;
}

/* -------------------------------------------------------------------------- */
/* FIRE / CYCLE                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Lance le cycle de l'arme.
 */
export function cycleAk74(
  root: THREE.Object3D,
): void {
  root.traverse((object) => {
    if (object.name !== "ak74-rig") {
      return;
    }

    object.userData["cycle"] = 1;
    object.userData["t"] = 0;

    const weaponRoot =
      object.userData["weaponRoot"] as
        | THREE.Object3D
        | undefined;

    if (!weaponRoot) {
      return;
    }

    const state =
      weaponRoot.userData[
        "animationState"
      ] as AnimationState | undefined;

    if (!state?.mixer || !state.clips.length) {
      return;
    }

    const clip = chooseCycleClip(
      state.clips,
    );

    if (!clip) {
      return;
    }

    /*
     * Arrêt propre du clip précédent.
     */
    if (state.currentAction) {
      state.currentAction.stop();
      state.currentAction.reset();
    }

    const action =
      state.mixer.clipAction(clip);

    action.reset();

    action.setLoop(
      THREE.LoopOnce,
      1,
    );

    action.clampWhenFinished = false;

    action.fadeIn(0.025);

    action.play();

    state.currentAction = action;
    state.currentClipName = clip.name;
    state.elapsed = 0;

    console.info(
      `[AK74U] Animation: ${clip.name}`,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* FALLBACK MECHANICAL CYCLE                                                  */
/* -------------------------------------------------------------------------- */

function fallbackMechanicalCycle(
  rig: THREE.Object3D,
  t: number,
): void {
  const carrier =
    rig.getObjectByName("ak-carrier");

  const bolt =
    rig.getObjectByName("ak-bolt");

  const round =
    rig.getObjectByName("ak-round");

  if (!carrier || !bolt) {
    return;
  }

  const hx =
    (carrier.userData["hx"] as number) ??
    -0.06;

  const rx =
    (round?.userData["hx"] as number) ??
    0.02;

  const ry =
    (round?.userData["hy"] as number) ??
    0.07;

  let back = 0;

  if (t > 0.04 && t < 0.16) {
    back =
      (t - 0.04) / 0.12;
  } else if (
    t >= 0.16 &&
    t < 0.28
  ) {
    back = 1;
  } else if (
    t >= 0.28 &&
    t < 0.48
  ) {
    back =
      1 -
      (t - 0.28) / 0.2;
  }

  let rotation = 0;

  if (t > 0.05 && t < 0.14) {
    rotation =
      (t - 0.05) / 0.09;
  } else if (
    t >= 0.14 &&
    t < 0.34
  ) {
    rotation = 1;
  } else if (
    t >= 0.34 &&
    t < 0.46
  ) {
    rotation =
      1 -
      (t - 0.34) / 0.12;
  }

  carrier.position.x =
    hx - 0.11 * back;

  bolt.rotation.x =
    0.62 * rotation;

  if (round) {
    if (t > 0.12 && t < 0.32) {
      const u =
        (t - 0.12) / 0.2;

      round.visible = true;

      round.position.set(
        rx - u * 0.05,
        ry + u * 0.07,
        u * 0.1,
      );

      round.rotation.z =
        u * 1.6;
    } else if (
      t >= 0.32 &&
      t < 0.42
    ) {
      const u =
        (t - 0.32) / 0.1;

      round.visible = true;

      round.position.set(
        rx - (1 - u) * 0.06,
        ry,
        0,
      );

      round.rotation.set(
        0,
        0,
        0,
      );
    } else {
      round.visible =
        t < 0.12 ||
        t > 0.42;

      round.position.set(
        rx,
        ry,
        0,
      );

      round.rotation.set(
        0,
        0,
        0,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE                                                                     */
/* -------------------------------------------------------------------------- */

export function tickAk74(
  root: THREE.Object3D,
  dt: number,
): void {
  root.traverse((object) => {
    if (object.name !== "ak74-rig") {
      return;
    }

    const cycle =
      object.userData["cycle"] as
        | number
        | undefined;

    /*
     * Aucun cycle en cours.
     */
    if (!cycle) {
      /*
       * Même lorsque l'arme ne tire pas,
       * on continue de mettre à jour son mixer.
       */
      const weaponRoot =
        object.userData[
          "weaponRoot"
        ] as THREE.Object3D | undefined;

      if (weaponRoot) {
        const state =
          weaponRoot.userData[
            "animationState"
          ] as AnimationState | undefined;

        state?.mixer?.update(dt);
      }

      return;
    }

    let t =
      (object.userData["t"] as number) ??
      0;

    t += dt;

    object.userData["t"] = t;

    /*
     * Animation FBX.
     */
    const weaponRoot =
      object.userData[
        "weaponRoot"
      ] as THREE.Object3D | undefined;

    if (weaponRoot) {
      const state =
        weaponRoot.userData[
          "animationState"
        ] as AnimationState | undefined;

      if (state?.mixer) {
        state.mixer.update(dt);
      }
    }

    /*
     * Fallback mécanique seulement lorsque
     * le modèle procédural possède les pièces.
     */
    const carrier =
      object.getObjectByName(
        "ak-carrier",
      );

    const bolt =
      object.getObjectByName(
        "ak-bolt",
      );

    if (carrier || bolt) {
      fallbackMechanicalCycle(
        object,
        t,
      );
    }

    /*
     * Fin du cycle.
     */
    if (t > 0.52) {
      object.userData["cycle"] = 0;
      object.userData["t"] = 0;

      /*
       * Arrêt du clip FBX.
       */
      if (weaponRoot) {
        const state =
          weaponRoot.userData[
            "animationState"
          ] as AnimationState | undefined;

        if (state?.currentAction) {
          state.currentAction.fadeOut(
            0.05,
          );

          state.currentAction = null;
          state.currentClipName = null;
        }
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/* DEBUG                                                                      */
/* -------------------------------------------------------------------------- */

export function preloadAk74u(): Promise<void> {
  return loadSource()
    .then(() => undefined)
    .catch(() => undefined);
}

export function getAk74uAssetPath(): string {
  return AK74U_MODEL;
}