// ============================================================================
// BackpackAnimations.ts
// Contrôleur d'animations et d'interactions pour sac à dos 3D
// Utilise GSAP pour des animations fluides et performantes
// Made in Montréal 🍁
// ============================================================================

import * as THREE from 'three';
import gsap from 'gsap';

// ----------------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------------

export interface AnimationState {
  isBreathing: boolean;
  isZipperOpen: boolean;
  isFrontZipperOpen: boolean;
  isChestStrapClosed: boolean;
  isHipBeltClosed: boolean;
  strapAdjustment: number;  // -0.5 à +0.5
  isWalking: boolean;
  currentWeight: number;    // kg simulé
}

export interface InteractionEvent {
  type: string;
  object: THREE.Object3D;
  point: THREE.Vector3;
}

// ----------------------------------------------------------------------------
// Contrôleur d'animations
// ----------------------------------------------------------------------------

export class BackpackAnimationController {
  private backpack: THREE.Group;
  private state: AnimationState;
  private breathingTimeline: gsap.core.Timeline | null = null;
  private walkingTimeline: gsap.core.Timeline | null = null;
  private activeTimelines: gsap.core.Timeline[] = [];

  // Références aux parties du sac
  private mainBody: THREE.Object3D | null = null;
  private frontPocket: THREE.Object3D | null = null;
  private shoulderStraps: THREE.Object3D | null = null;
  private chestStrap: THREE.Object3D | null = null;
  private hipBelt: THREE.Object3D | null = null;
  private zipperPuller: THREE.Object3D | null = null;
  private frontZipperPuller: THREE.Object3D | null = null;
  private topLid: THREE.Object3D | null = null;

  // Positions initiales pour restauration
  private initialPositions: Map<string, THREE.Vector3> = new Map();
  private initialRotations: Map<string, THREE.Euler> = new Map();
  private initialScales: Map<string, THREE.Vector3> = new Map();

  constructor(backpack: THREE.Group) {
    this.backpack = backpack;

    this.state = {
      isBreathing: false,
      isZipperOpen: false,
      isFrontZipperOpen: false,
      isChestStrapClosed: true,
      isHipBeltClosed: true,
      strapAdjustment: 0,
      isWalking: false,
      currentWeight: 0,
    };

    this.cacheReferences();
    this.saveInitialTransforms();
  }

  // ========================================================================
  // INITIALISATION
  // ========================================================================

  /**
   * Trouver et cacher les références aux parties du sac
   */
  private cacheReferences(): void {
    this.backpack.traverse((child) => {
      switch (child.name) {
        case 'MainBody':
          this.mainBody = child;
          break;
        case 'FrontPocket':
          this.frontPocket = child;
          break;
        case 'ShoulderStraps':
          this.shoulderStraps = child;
          break;
        case 'ChestStrap':
          this.chestStrap = child;
          break;
        case 'HipBelt':
          this.hipBelt = child;
          break;
        case 'TopLid':
          this.topLid = child;
          break;
      }

      // Chercher les éléments interactifs par userData
      if (child.userData?.type === 'zipper') {
        this.zipperPuller = child;
      }
      if (child.userData?.type === 'zipper-front') {
        this.frontZipperPuller = child;
      }

      // Chercher par nom aussi
      if (child.name === 'MainZipper_Puller') {
        this.zipperPuller = child;
      }
      if (child.name === 'FrontPocketZipper_Puller') {
        this.frontZipperPuller = child;
      }
    });
  }

  /**
   * Sauvegarder les transformations initiales
   */
  private saveInitialTransforms(): void {
    this.backpack.traverse((child) => {
      if (child.name) {
        this.initialPositions.set(child.name, child.position.clone());
        this.initialRotations.set(child.name, child.rotation.clone());
        this.initialScales.set(child.name, child.scale.clone());
      }
    });
  }

  // ========================================================================
  // ANIMATION: RESPIRATION (BREATHING)
  // ========================================================================

  /**
   * Démarrer l'animation de respiration subtile
   */
  startBreathing(): void {
    if (this.state.isBreathing) return;
    this.state.isBreathing = true;

    this.breathingTimeline = gsap.timeline({ repeat: -1, yoyo: true });

    // Expansion subtile du corps principal
    this.breathingTimeline.to(
      this.backpack.scale,
      {
        x: 1.008,
        y: 1.003,
        z: 1.012,
        duration: 2.5,
        ease: 'sine.inOut',
      },
      0
    );

    // Mouvement subtil de la poche avant
    if (this.frontPocket) {
      this.breathingTimeline.to(
        this.frontPocket.position,
        {
          z: '+=0.002',
          duration: 2.5,
          ease: 'sine.inOut',
        },
        0
      );
    }

    // Léger mouvement des bretelles
    if (this.shoulderStraps) {
      this.shoulderStraps.children.forEach((strapGroup) => {
        if (strapGroup.name.includes('ShoulderStrap_')) {
          this.breathingTimeline!.to(
            strapGroup.rotation,
            {
              z: strapGroup.name.includes('Right') ? -0.005 : 0.005,
              duration: 2.5,
              ease: 'sine.inOut',
            },
            0
          );
        }
      });
    }

    this.activeTimelines.push(this.breathingTimeline);
  }

  /**
   * Arrêter la respiration
   */
  stopBreathing(): void {
    if (!this.state.isBreathing) return;
    this.state.isBreathing = false;

    if (this.breathingTimeline) {
      this.breathingTimeline.kill();
      this.breathingTimeline = null;
    }

    // Restaurer l'échelle
    gsap.to(this.backpack.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.5,
      ease: 'power2.out',
    });

    // Restaurer la poche avant
    if (this.frontPocket) {
      const initPos = this.initialPositions.get('FrontPocket');
      if (initPos) {
        gsap.to(this.frontPocket.position, {
          z: initPos.z,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    }
  }

  /**
   * Vérifier si la respiration est active
   */
  isBreathingActive(): boolean {
    return this.state.isBreathing;
  }

  // ========================================================================
  // ANIMATION: ZIPPER
  // ========================================================================

  /**
   * Ouvrir/fermer le zipper principal
   */
  toggleZipper(duration: number = 0.6): gsap.core.Timeline {
    const tl = gsap.timeline();
    this.state.isZipperOpen = !this.state.isZipperOpen;
    const isOpening = this.state.isZipperOpen;

    if (this.zipperPuller) {
      // Mouvement de la tirette
      tl.to(
        this.zipperPuller.position,
        {
          x: isOpening ? -0.15 : 0,
          duration: duration,
          ease: isOpening ? 'power2.in' : 'power2.out',
        },
        0
      );

      // Rotation de la tirette pendant le mouvement
      tl.to(
        this.zipperPuller.rotation,
        {
          z: isOpening ? -0.3 : 0,
          duration: duration * 0.5,
          ease: 'power1.inOut',
        },
        0
      );
    }

    // Ouvrir le couvercle si on ouvre le zipper
    if (this.topLid) {
      tl.to(
        this.topLid.rotation,
        {
          x: isOpening ? -0.4 : 0,
          duration: duration * 1.2,
          ease: isOpening ? 'back.out(1.2)' : 'power2.inOut',
        },
        duration * 0.3
      );
    }

    // Légère expansion du corps quand ouvert
    if (this.mainBody) {
      tl.to(
        this.mainBody.scale,
        {
          z: isOpening ? 1.05 : 1,
          duration: duration,
          ease: 'power1.inOut',
        },
        duration * 0.2
      );
    }

    this.activeTimelines.push(tl);
    return tl;
  }

  /**
   * Ouvrir/fermer le zipper de la poche avant
   */
  toggleFrontZipper(duration: number = 0.5): gsap.core.Timeline {
    const tl = gsap.timeline();
    this.state.isFrontZipperOpen = !this.state.isFrontZipperOpen;
    const isOpening = this.state.isFrontZipperOpen;

    if (this.frontZipperPuller) {
      tl.to(
        this.frontZipperPuller.position,
        {
          x: isOpening ? -0.1 : 0,
          duration: duration,
          ease: 'power2.inOut',
        },
        0
      );
    }

    // La poche avant gonfle légèrement quand ouverte
    if (this.frontPocket) {
      tl.to(
        this.frontPocket.scale,
        {
          z: isOpening ? 1.15 : 1,
          duration: duration,
          ease: 'power1.inOut',
        },
        0
      );
    }

    this.activeTimelines.push(tl);
    return tl;
  }

  /**
   * Vérifier l'état du zipper
   */
  isZipperOpen(): boolean {
    return this.state.isZipperOpen;
  }

  // ========================================================================
  // ANIMATION: AJUSTEMENT BRETELLES
  // ========================================================================

  /**
   * Ajuster la longueur des bretelles
   * @param adjustment -0.5 (très court) à +0.5 (très long), 0 = normal
   */
  adjustStraps(adjustment: number, duration: number = 0.8): gsap.core.Timeline {
    const tl = gsap.timeline();
    this.state.strapAdjustment = Math.max(-0.5, Math.min(0.5, adjustment));

    if (this.shoulderStraps) {
      this.shoulderStraps.children.forEach((strapGroup) => {
        if (strapGroup.name.includes('ShoulderStrap_')) {
          // Ajuster la position Y (monte/descend le sac par rapport aux épaules)
          tl.to(
            strapGroup.position,
            {
              y: this.state.strapAdjustment * 0.1,
              duration,
              ease: 'power2.inOut',
            },
            0
          );

          // Ajuster la rotation (plus serré = plus plaqué)
          const side = strapGroup.name.includes('Right') ? 1 : -1;
          tl.to(
            strapGroup.rotation,
            {
              z: -this.state.strapAdjustment * 0.08 * side,
              duration,
              ease: 'power2.inOut',
            },
            0
          );
        }
      });
    }

    // Le sac monte/descend selon l'ajustement
    tl.to(
      this.backpack.position,
      {
        y: -this.state.strapAdjustment * 0.05,
        duration,
        ease: 'power2.inOut',
      },
      0
    );

    this.activeTimelines.push(tl);
    return tl;
  }

  /**
   * Obtenir l'ajustement actuel des bretelles
   */
  getStrapAdjustment(): number {
    return this.state.strapAdjustment;
  }

  // ========================================================================
  // ANIMATION: REBOND D'ÉPAULE (MARCHE)
  // ========================================================================

  /**
   * Simuler un rebond d'épaule (marche)
   * @param intensity 0-1
   */
  shoulderBounce(intensity: number = 0.8, duration: number = 0.3): gsap.core.Timeline {
    const tl = gsap.timeline();
    const bounceHeight = intensity * 0.015;
    const bounceRotation = intensity * 0.02;

    // Rebond vertical
    tl.to(
      this.backpack.position,
      {
        y: `+=${bounceHeight}`,
        duration: duration * 0.4,
        ease: 'power2.out',
      },
      0
    );

    tl.to(
      this.backpack.position,
      {
        y: `-=${bounceHeight}`,
        duration: duration * 0.6,
        ease: 'bounce.out',
      },
      duration * 0.4
    );

    // Rotation subtile
    tl.to(
      this.backpack.rotation,
      {
        z: bounceRotation,
        duration: duration * 0.3,
        ease: 'power1.out',
      },
      0
    );

    tl.to(
      this.backpack.rotation,
      {
        z: 0,
        duration: duration * 0.7,
        ease: 'elastic.out(1, 0.5)',
      },
      duration * 0.3
    );

    // Mouvement des bretelles (inertie)
    if (this.shoulderStraps) {
      this.shoulderStraps.children.forEach((strapGroup) => {
        if (strapGroup.name.includes('ShoulderStrap_')) {
          tl.to(
            strapGroup.rotation,
            {
              x: bounceRotation * 0.5,
              duration: duration * 0.4,
              ease: 'power1.out',
            },
            0
          );
          tl.to(
            strapGroup.rotation,
            {
              x: 0,
              duration: duration * 0.8,
              ease: 'elastic.out(1, 0.4)',
            },
            duration * 0.4
          );
        }
      });
    }

    this.activeTimelines.push(tl);
    return tl;
  }

  // ========================================================================
  // ANIMATION: CEINTURE HANCHES
  // ========================================================================

  /**
   * Ouvrir/fermer la ceinture de hanches
   */
  toggleHipBelt(duration: number = 0.4): gsap.core.Timeline {
    const tl = gsap.timeline();
    this.state.isHipBeltClosed = !this.state.isHipBeltClosed;
    const isClosing = this.state.isHipBeltClosed;

    if (this.hipBelt) {
      this.hipBelt.children.forEach((child) => {
        if (child.name.includes('HipBelt_Pad_') || child.name.includes('HipBelt_Strap_')) {
          const side = child.name.includes('Right') ? 1 : -1;

          // Ouvrir/fermer les côtés
          tl.to(
            child.rotation,
            {
              y: isClosing ? 0 : side * 0.5,
              duration,
              ease: isClosing ? 'power2.in' : 'back.out(1.5)',
            },
            0
          );

          // Déplacer latéralement
          tl.to(
            child.position,
            {
              x: `${isClosing ? '-' : '+'}=${side * 0.03}`,
              duration,
              ease: 'power2.inOut',
            },
            0
          );
        }

        // Boucle centrale
        if (child.name === 'HipBelt_Buckle') {
          tl.to(
            child.scale,
            {
              x: isClosing ? 1 : 1.2,
              y: isClosing ? 1 : 0.8,
              duration: duration * 0.5,
              ease: 'power1.inOut',
            },
            0
          );
        }
      });
    }

    this.activeTimelines.push(tl);
    return tl;
  }

  // ========================================================================
  // ANIMATION: SANGLE POITRINE
  // ========================================================================

  /**
   * Ouvrir/fermer la sangle de poitrine
   */
  toggleChestStrap(duration: number = 0.4): gsap.core.Timeline {
    const tl = gsap.timeline();
    this.state.isChestStrapClosed = !this.state.isChestStrapClosed;
    const isClosing = this.state.isChestStrapClosed;

    if (this.chestStrap) {
      this.chestStrap.children.forEach((child) => {
        if (child.name === 'ChestStrap_Left') {
          tl.to(
            child.position,
            {
              x: isClosing ? child.position.x : child.position.x - 0.04,
              duration,
              ease: 'power2.inOut',
            },
            0
          );
          tl.to(
            child.rotation,
            {
              y: isClosing ? 0 : -0.3,
              duration,
              ease: 'power2.inOut',
            },
            0
          );
        }

        if (child.name === 'ChestStrap_Right') {
          tl.to(
            child.position,
            {
              x: isClosing ? child.position.x : child.position.x + 0.04,
              duration,
              ease: 'power2.inOut',
            },
            0
          );
          tl.to(
            child.rotation,
            {
              y: isClosing ? 0 : 0.3,
              duration,
              ease: 'power2.inOut',
            },
            0
          );
        }

        // Boucle
        if (child.name === 'ChestStrap_Buckle') {
          tl.to(
            child.rotation,
            {
              z: isClosing ? 0 : Math.PI * 0.1,
              duration: duration * 0.3,
              ease: 'power1.out',
            },
            0
          );
        }
      });
    }

    this.activeTimelines.push(tl);
    return tl;
  }

  // ========================================================================
  // ANIMATION: IMPACT / CHUTE
  // ========================================================================

  /**
   * Simuler un impact / chute
   * @param intensity 0-1
   */
  impactAnimation(intensity: number = 1): gsap.core.Timeline {
    const tl = gsap.timeline();
    const force = intensity * 0.1;

    // Phase 1: Impact vers le bas
    tl.to(
      this.backpack.position,
      {
        y: `-=${force}`,
        duration: 0.1,
        ease: 'power3.in',
      },
      0
    );

    // Phase 2: Compression
    tl.to(
      this.backpack.scale,
      {
        y: 1 - intensity * 0.08,
        x: 1 + intensity * 0.04,
        z: 1 + intensity * 0.04,
        duration: 0.1,
        ease: 'power3.in',
      },
      0
    );

    // Phase 3: Rebond
    tl.to(
      this.backpack.position,
      {
        y: `+=${force * 0.6}`,
        duration: 0.15,
        ease: 'power2.out',
      },
      0.1
    );

    // Phase 4: Restauration avec rebond élastique
    tl.to(
      this.backpack.position,
      {
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1.2, 0.4)',
      },
      0.25
    );

    tl.to(
      this.backpack.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      },
      0.15
    );

    // Rotation de déstabilisation
    tl.to(
      this.backpack.rotation,
      {
        x: intensity * 0.15,
        z: intensity * 0.08,
        duration: 0.15,
        ease: 'power2.out',
      },
      0.05
    );

    tl.to(
      this.backpack.rotation,
      {
        x: 0,
        z: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.3)',
      },
      0.2
    );

    // Mouvement des bretelles (inertie)
    if (this.shoulderStraps) {
      this.shoulderStraps.children.forEach((strapGroup) => {
        if (strapGroup.name.includes('ShoulderStrap_')) {
          tl.to(
            strapGroup.rotation,
            {
              x: intensity * 0.2,
              duration: 0.2,
              ease: 'power2.out',
            },
            0.05
          );
          tl.to(
            strapGroup.rotation,
            {
              x: 0,
              duration: 1.0,
              ease: 'elastic.out(0.8, 0.3)',
            },
            0.25
          );
        }
      });
    }

    // Poche avant rebondit
    if (this.frontPocket) {
      tl.to(
        this.frontPocket.position,
        {
          z: '+=0.01',
          duration: 0.15,
          ease: 'power2.out',
        },
        0.1
      );
      tl.to(
        this.frontPocket.position,
        {
          z: '-=0.01',
          duration: 0.6,
          ease: 'elastic.out(1, 0.4)',
        },
        0.25
      );
    }

    this.activeTimelines.push(tl);
    return tl;
  }

  // ========================================================================
  // ANIMATION: TORSION
  // ========================================================================

  /**
   * Appliquer une torsion au sac
   */
  twist(angle: number = Math.PI * 0.1, duration: number = 0.3): gsap.core.Timeline {
    const tl = gsap.timeline();

    tl.to(
      this.backpack.rotation,
      {
        y: angle,
        duration,
        ease: 'power2.out',
      },
      0
    );

    tl.to(
      this.backpack.rotation,
      {
        y: 0,
        duration: duration * 2,
        ease: 'elastic.out(1, 0.4)',
      },
      duration
    );

    this.activeTimelines.push(tl);
    return tl;
  }

  // ========================================================================
  // ANIMATION: MARCHE (LOOP)
  // ========================================================================

  /**
   * Démarrer l'animation de marche en boucle
   * @param speed 0.5-2.0
   */
  walkingAnimation(speed: number = 1): gsap.core.Timeline {
    if (this.state.isWalking) {
      this.stopWalking();
    }

    this.state.isWalking = true;
    const cycleDuration = 1.2 / speed;

    this.walkingTimeline = gsap.timeline({ repeat: -1 });

    // Mouvement vertical (rebond)
    this.walkingTimeline.to(
      this.backpack.position,
      {
        y: 0.012,
        duration: cycleDuration * 0.25,
        ease: 'sine.out',
      },
      0
    );

    this.walkingTimeline.to(
      this.backpack.position,
      {
        y: -0.005,
        duration: cycleDuration * 0.25,
        ease: 'sine.in',
      },
      cycleDuration * 0.25
    );

    this.walkingTimeline.to(
      this.backpack.position,
      {
        y: 0.01,
        duration: cycleDuration * 0.25,
        ease: 'sine.out',
      },
      cycleDuration * 0.5
    );

    this.walkingTimeline.to(
      this.backpack.position,
      {
        y: 0,
        duration: cycleDuration * 0.25,
        ease: 'sine.in',
      },
      cycleDuration * 0.75
    );

    // Balancement latéral
    this.walkingTimeline.to(
      this.backpack.rotation,
      {
        z: 0.03,
        duration: cycleDuration * 0.5,
        ease: 'sine.inOut',
      },
      0
    );

    this.walkingTimeline.to(
      this.backpack.rotation,
      {
        z: -0.03,
        duration: cycleDuration * 0.5,
        ease: 'sine.inOut',
      },
      cycleDuration * 0.5
    );

    // Rotation avant/arrière subtile
    this.walkingTimeline.to(
      this.backpack.rotation,
      {
        x: 0.02,
        duration: cycleDuration * 0.25,
        ease: 'sine.inOut',
      },
      0
    );

    this.walkingTimeline.to(
      this.backpack.rotation,
      {
        x: -0.015,
        duration: cycleDuration * 0.5,
        ease: 'sine.inOut',
      },
      cycleDuration * 0.25
    );

    this.walkingTimeline.to(
      this.backpack.rotation,
      {
        x: 0,
        duration: cycleDuration * 0.25,
        ease: 'sine.inOut',
      },
      cycleDuration * 0.75
    );

    // Mouvement des bretelles avec inertie
    if (this.shoulderStraps) {
      this.shoulderStraps.children.forEach((strapGroup) => {
        if (strapGroup.name.includes('ShoulderStrap_')) {
          const delay = strapGroup.name.includes('Right') ? 0 : cycleDuration * 0.15;

          this.walkingTimeline!.to(
            strapGroup.rotation,
            {
              x: 0.03,
              duration: cycleDuration * 0.5,
              ease: 'sine.inOut',
            },
            delay
          );

          this.walkingTimeline!.to(
            strapGroup.rotation,
            {
              x: -0.02,
              duration: cycleDuration * 0.5,
              ease: 'sine.inOut',
            },
            delay + cycleDuration * 0.5
          );
        }
      });
    }

    // Poche avant rebondit légèrement
    if (this.frontPocket) {
      this.walkingTimeline.to(
        this.frontPocket.position,
        {
          z: '+=0.003',
          duration: cycleDuration * 0.25,
          ease: 'sine.out',
        },
        0
      );

      this.walkingTimeline.to(
        this.frontPocket.position,
        {
          z: '-=0.003',
          duration: cycleDuration * 0.25,
          ease: 'sine.in',
        },
        cycleDuration * 0.25
      );
    }

    this.activeTimelines.push(this.walkingTimeline);
    return this.walkingTimeline;
  }

  /**
   * Arrêter l'animation de marche
   */
  stopWalking(): void {
    if (!this.state.isWalking) return;
    this.state.isWalking = false;

    if (this.walkingTimeline) {
      this.walkingTimeline.kill();
      this.walkingTimeline = null;
    }

    // Restaurer position/rotation doucement
    gsap.to(this.backpack.position, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.5,
      ease: 'power2.out',
    });

    gsap.to(this.backpack.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.5,
      ease: 'power2.out',
    });
  }

  // ========================================================================
  // ANIMATION: POIDS / CHARGE
  // ========================================================================

  /**
   * Simuler l'effet du poids dans le sac
   * @param weight en kg (0-20)
   */
  setWeight(weight: number, duration: number = 0.5): gsap.core.Timeline {
    const tl = gsap.timeline();
    this.state.currentWeight = Math.max(0, Math.min(20, weight));
    const normalizedWeight = this.state.currentWeight / 20;

    // Compression verticale proportionnelle au poids
    tl.to(
      this.backpack.scale,
      {
        y: 1 - normalizedWeight * 0.04,
        duration,
        ease: 'power2.inOut',
      },
      0
    );

    // Expansion latérale (le sac s'élargit avec le poids)
    tl.to(
      this.backpack.scale,
      {
        x: 1 + normalizedWeight * 0.03,
        z: 1 + normalizedWeight * 0.05,
        duration,
        ease: 'power2.inOut',
      },
      0
    );

    // Les bretelles se tendent davantage
    if (this.shoulderStraps) {
      this.shoulderStraps.children.forEach((strapGroup) => {
        if (strapGroup.name.includes('ShoulderStrap_')) {
          const side = strapGroup.name.includes('Right') ? 1 : -1;
          tl.to(
            strapGroup.rotation,
            {
              z: -normalizedWeight * 0.05 * side,
              duration,
              ease: 'power2.inOut',
            },
            0
          );
        }
      });
    }

    // Le sac descend légèrement
    tl.to(
      this.backpack.position,
      {
        y: -normalizedWeight * 0.02,
        duration,
        ease: 'power2.inOut',
      },
      0
    );

    this.activeTimelines.push(tl);
    return tl;
  }

  // ========================================================================
  // ANIMATION: MISE SUR LE DOS
  // ========================================================================

  /**
   * Animation de mise sur le dos (pickup)
   */
  putOnAnimation(duration: number = 1.2): gsap.core.Timeline {
    const tl = gsap.timeline();

    // Position initiale: au sol, penché
    gsap.set(this.backpack.position, { x: 0.3, y: -0.3, z: 0.5 });
    gsap.set(this.backpack.rotation, { x: -0.5, y: 0.3, z: 0 });

    // Phase 1: Soulever
    tl.to(
      this.backpack.position,
      {
        y: 0.2,
        x: 0.15,
        duration: duration * 0.3,
        ease: 'power2.out',
      },
      0
    );

    // Phase 2: Rotation pour passer le bras
    tl.to(
      this.backpack.rotation,
      {
        x: 0,
        y: Math.PI * 0.3,
        duration: duration * 0.3,
        ease: 'power2.inOut',
      },
      duration * 0.2
    );

    // Phase 3: Positionner dans le dos
    tl.to(
      this.backpack.position,
      {
        x: 0,
        y: 0,
        z: 0,
        duration: duration * 0.4,
        ease: 'power3.out',
      },
      duration * 0.5
    );

    tl.to(
      this.backpack.rotation,
      {
        x: 0,
        y: 0,
        z: 0,
        duration: duration * 0.4,
        ease: 'back.out(1.5)',
      },
      duration * 0.5
    );

    // Phase 4: Ajustement final (petit rebond)
    tl.to(
      this.backpack.position,
      {
        y: 0.01,
        duration: 0.15,
        ease: 'power1.out',
      },
      duration * 0.9
    );

    tl.to(
      this.backpack.position,
      {
        y: 0,
        duration: 0.2,
        ease: 'bounce.out',
      },
      duration * 0.9 + 0.15
    );

    this.activeTimelines.push(tl);
    return tl;
  }

  // ========================================================================
  // UTILITAIRES
  // ========================================================================

  /**
   * Restaurer toutes les transformations à leur état initial
   */
  resetAll(duration: number = 0.5): void {
    // Tuer toutes les animations actives
    this.activeTimelines.forEach((tl) => tl.kill());
    this.activeTimelines = [];
    this.breathingTimeline = null;
    this.walkingTimeline = null;

    // Restaurer l'état
    this.state = {
      isBreathing: false,
      isZipperOpen: false,
      isFrontZipperOpen: false,
      isChestStrapClosed: true,
      isHipBeltClosed: true,
      strapAdjustment: 0,
      isWalking: false,
      currentWeight: 0,
    };

    // Restaurer transformations
    gsap.to(this.backpack.position, {
      x: 0, y: 0, z: 0,
      duration,
      ease: 'power2.out',
    });

    gsap.to(this.backpack.rotation, {
      x: 0, y: 0, z: 0,
      duration,
      ease: 'power2.out',
    });

    gsap.to(this.backpack.scale, {
      x: 1, y: 1, z: 1,
      duration,
      ease: 'power2.out',
    });

    // Restaurer les enfants
    this.backpack.traverse((child) => {
      if (child.name && child !== this.backpack) {
        const initPos = this.initialPositions.get(child.name);
        const initRot = this.initialRotations.get(child.name);
        const initScale = this.initialScales.get(child.name);

        if (initPos) {
          gsap.to(child.position, {
            x: initPos.x, y: initPos.y, z: initPos.z,
            duration,
            ease: 'power2.out',
          });
        }
        if (initRot) {
          gsap.to(child.rotation, {
            x: initRot.x, y: initRot.y, z: initRot.z,
            duration,
            ease: 'power2.out',
          });
        }
        if (initScale) {
          gsap.to(child.scale, {
            x: initScale.x, y: initScale.y, z: initScale.z,
            duration,
            ease: 'power2.out',
          });
        }
      }
    });
  }

  /**
   * Obtenir l'état actuel des animations
   */
  getState(): Readonly<AnimationState> {
    return { ...this.state };
  }

  /**
   * Nettoyer toutes les ressources
   */
  dispose(): void {
    this.activeTimelines.forEach((tl) => tl.kill());
    this.activeTimelines = [];

    if (this.breathingTimeline) {
      this.breathingTimeline.kill();
    }
    if (this.walkingTimeline) {
      this.walkingTimeline.kill();
    }

    this.initialPositions.clear();
    this.initialRotations.clear();
    this.initialScales.clear();
  }
}

// ----------------------------------------------------------------------------
// Gestionnaire d'interactions
// ----------------------------------------------------------------------------

export class BackpackInteractionManager {
  private backpack: THREE.Group;
  private camera: THREE.Camera;
  private animController: BackpackAnimationController;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private interactiveObjects: THREE.Object3D[] = [];
  private hoveredObject: THREE.Object3D | null = null;
  private originalMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map();
  private domElement: HTMLElement | null = null;

  // Callbacks
  private onInteraction: ((event: InteractionEvent) => void) | null = null;
  private onHover: ((object: THREE.Object3D | null) => void) | null = null;

  // Bound handlers
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnClick: (e: MouseEvent) => void;
  private boundOnTouchStart: (e: TouchEvent) => void;

  constructor(
    backpack: THREE.Group,
    camera: THREE.Camera,
    animController: BackpackAnimationController
  ) {
    this.backpack = backpack;
    this.camera = camera;
    this.animController = animController;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Collecter les objets interactifs
    this.collectInteractiveObjects();

    // Bind event handlers
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnClick = this.onClick.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
  }

  /**
   * Attacher les événements au DOM
   */
  attach(domElement: HTMLElement): void {
    this.domElement = domElement;
    domElement.addEventListener('mousemove', this.boundOnMouseMove);
    domElement.addEventListener('click', this.boundOnClick);
    domElement.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
    domElement.style.cursor = 'default';
  }

  /**
   * Détacher les événements du DOM
   */
  detach(): void {
    if (this.domElement) {
      this.domElement.removeEventListener('mousemove', this.boundOnMouseMove);
      this.domElement.removeEventListener('click', this.boundOnClick);
      this.domElement.removeEventListener('touchstart', this.boundOnTouchStart);
      this.domElement.style.cursor = 'default';
      this.domElement = null;
    }
  }

  /**
   * Définir un callback d'interaction
   */
  setOnInteraction(callback: (event: InteractionEvent) => void): void {
    this.onInteraction = callback;
  }

  /**
   * Définir un callback de hover
   */
  setOnHover(callback: (object: THREE.Object3D | null) => void): void {
    this.onHover = callback;
  }

  // ========================================================================
  // PRIVÉ
  // ========================================================================

  /**
   * Collecter tous les objets interactifs du sac
   */
  private collectInteractiveObjects(): void {
    this.interactiveObjects = [];

    this.backpack.traverse((child) => {
      if (child.userData?.interactive) {
        this.interactiveObjects.push(child);

        // Sauvegarder le matériau original pour le hover
        if (child instanceof THREE.Mesh) {
          this.originalMaterials.set(
            child.uuid,
            Array.isArray(child.material)
              ? child.material.map((m) => m.clone())
              : child.material.clone()
          );
        }
      }
    });

    // Si aucun objet interactif trouvé par userData, chercher par nom
    if (this.interactiveObjects.length === 0) {
      this.backpack.traverse((child) => {
        if (
          child.name.includes('Zipper_Puller') ||
          child.name.includes('_Buckle') ||
          child.name.includes('ChestStrap') ||
          child.name.includes('HipBelt')
        ) {
          child.userData = { ...child.userData, interactive: true, type: this.inferType(child.name) };
          this.interactiveObjects.push(child);

          if (child instanceof THREE.Mesh) {
            this.originalMaterials.set(
              child.uuid,
              Array.isArray(child.material)
                ? child.material.map((m) => m.clone())
                : child.material.clone()
            );
          }
        }
      });
    }
  }

  /**
   * Inférer le type d'interaction basé sur le nom
   */
  private inferType(name: string): string {
    if (name.includes('Zipper') && name.includes('Front')) return 'zipper-front';
    if (name.includes('Zipper')) return 'zipper';
    if (name.includes('ChestStrap')) return 'chest-strap';
    if (name.includes('HipBelt')) return 'hip-belt';
    if (name.includes('Strap')) return 'strap';
    return 'generic';
  }

  /**
   * Mettre à jour les coordonnées de la souris normalisées
   */
  private updateMouse(clientX: number, clientY: number): void {
    if (!this.domElement) return;
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Raycast pour trouver l'objet sous la souris
   */
  private raycast(): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Collecter tous les meshes interactifs (y compris les enfants)
    const meshes: THREE.Mesh[] = [];
    this.interactiveObjects.forEach((obj) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
        }
      });
      if (obj instanceof THREE.Mesh) {
        meshes.push(obj);
      }
    });

    return this.raycaster.intersectObjects(meshes, false);
  }

  /**
   * Trouver le parent interactif d'un objet intersecté
   */
  private findInteractiveParent(object: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.userData?.interactive) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event.clientX, event.clientY);
    const intersects = this.raycast();

    if (intersects.length > 0) {
      const interactiveObj = this.findInteractiveParent(intersects[0].object);

      if (interactiveObj && interactiveObj !== this.hoveredObject) {
        // Quitter le précédent
        this.unhoverObject();

        // Hover le nouveau
        this.hoveredObject = interactiveObj;
        this.hoverObject(interactiveObj);

        if (this.domElement) {
          this.domElement.style.cursor = 'pointer';
        }

        if (this.onHover) {
          this.onHover(interactiveObj);
        }
      }
    } else if (this.hoveredObject) {
      this.unhoverObject();
      this.hoveredObject = null;

      if (this.domElement) {
        this.domElement.style.cursor = 'default';
      }

      if (this.onHover) {
        this.onHover(null);
      }
    }
  }

  private onClick(event: MouseEvent): void {
    this.updateMouse(event.clientX, event.clientY);
    const intersects = this.raycast();

    if (intersects.length > 0) {
      const interactiveObj = this.findInteractiveParent(intersects[0].object);
      if (interactiveObj) {
        this.handleInteraction(interactiveObj, intersects[0].point);
      }
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMouse(touch.clientX, touch.clientY);
      const intersects = this.raycast();

      if (intersects.length > 0) {
        const interactiveObj = this.findInteractiveParent(intersects[0].object);
        if (interactiveObj) {
          event.preventDefault();
          this.handleInteraction(interactiveObj, intersects[0].point);
        }
      }
    }
  }

  // ========================================================================
  // FEEDBACK VISUEL
  // ========================================================================

  private hoverObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (!child.userData._originalEmissive) {
            child.userData._originalEmissive = mat.emissive.clone();
            child.userData._originalEmissiveIntensity = mat.emissiveIntensity;
          }
          mat.emissive.set(0x333333);
          mat.emissiveIntensity = 0.3;
        }
      }
    });

    // Animation de hover
    gsap.to(obj.scale, {
      x: 1.05,
      y: 1.05,
      z: 1.05,
      duration: 0.2,
      ease: 'power2.out',
    });
  }

  private unhoverObject(): void {
    if (!this.hoveredObject) return;

    this.hoveredObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (child.userData._originalEmissive) {
            mat.emissive.copy(child.userData._originalEmissive);
            mat.emissiveIntensity = child.userData._originalEmissiveIntensity;
            delete child.userData._originalEmissive;
            delete child.userData._originalEmissiveIntensity;
          }
        }
      }
    });

    gsap.to(this.hoveredObject.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.2,
      ease: 'power2.out',
    });
  }

  // ========================================================================
  // LOGIQUE D'INTERACTION
  // ========================================================================

  private handleInteraction(obj: THREE.Object3D, point: THREE.Vector3): void {
    const type = obj.userData?.type || this.inferType(obj.name);

    const event: InteractionEvent = { type, object: obj, point };

    switch (type) {
      case 'zipper':
        this.animController.toggleZipper();
        break;

      case 'zipper-front':
        this.animController.toggleFrontZipper();
        break;

      case 'chest-strap':
        this.animController.toggleChestStrap();
        break;

      case 'hip-belt':
        this.animController.toggleHipBelt();
        break;

      case 'strap':
        // Cycle d'ajustement: 0 → -0.3 → +0.3 → 0
        const current = this.animController.getStrapAdjustment();
        let next: number;
        if (current === 0) next = -0.3;
        else if (current < 0) next = 0.3;
        else next = 0;
        this.animController.adjustStraps(next);
        break;

      default:
        // Interaction générique - petit rebond
        gsap.to(obj.scale, {
          x: 0.95,
          y: 0.95,
          z: 0.95,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: 'power1.inOut',
        });
        break;
    }

    // Appeler le callback personnalisé
    if (this.onInteraction) {
      this.onInteraction(event);
    }
  }

  /**
   * Nettoyer les ressources
   */
  dispose(): void {
    this.detach();
    this.originalMaterials.forEach((mat) => {
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    });
    this.originalMaterials.clear();
    this.interactiveObjects = [];
  }
}