import * as THREE from 'three';
import { gsap } from 'gsap';

export class AnimationSystem {
  private animations: Map<string, gsap.core.Timeline> = new Map();
  
  // Animation de porte (ouverture/fermeture)
  animateDoor(
    door: THREE.Object3D,
    action: 'open' | 'close',
    options?: {
      speed?: number;
      angle?: number;
      easing?: string;
      onComplete?: () => void;
    }
  ): gsap.core.Timeline {
    const timeline = gsap.timeline({
      onComplete: options?.onComplete,
    });
    
    const targetAngle = action === 'open' ? options?.angle || -Math.PI / 2 : 0;
    const speed = options?.speed || 0.8;
    
    // Animation principale
    timeline.to(door.rotation, {
      y: targetAngle,
      duration: speed,
      ease: options?.easing || 'power2.inOut',
    });
    
    // Son de porte
    this.playDoorSound(action);
    
    // Effet de vibration si la porte claque
    if (action === 'close' && options?.speed && options.speed > 1) {
      timeline.to(door.position, {
        z: 0.02,
        duration: 0.05,
        yoyo: true,
        repeat: 1,
      }, '-=0.1');
    }
    
    return timeline;
  }
  
  // Animation de lumière (allumage/extinction)
  animateLight(
    light: THREE.Light,
    action: 'on' | 'off',
    options?: {
      duration?: number;
      flicker?: boolean;
      color?: THREE.Color;
    }
  ): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const duration = options?.duration || 0.5;
    
    if (action === 'on') {
      // Effet de démarrage (clignotement puis stable)
      timeline.to(light, {
        intensity: 1.5,
        duration: 0.1,
        ease: 'power2.out',
      });
      
      if (options?.flicker) {
        timeline.to(light, {
          intensity: 0.3,
          duration: 0.05,
        });
        timeline.to(light, {
          intensity: 1.2,
          duration: 0.05,
        });
      }
      
      timeline.to(light, {
        intensity: options?.color ? 1 : 0.8,
        duration: duration - 0.2,
        ease: 'power2.out',
      });
      
      if (options?.color) {
        timeline.to(light, {
          color: options.color,
          duration: duration,
        }, '-=0.3');
      }
    } else {
      // Extinction progressive
      timeline.to(light, {
        intensity: 0,
        duration: duration,
        ease: 'power2.in',
      });
    }
    
    return timeline;
  }
  
  // Animation d'objet physique
  animatePhysics(
    object: THREE.Object3D,
    type: 'fall' | 'bounce' | 'explode' | 'float',
    options?: {
      height?: number;
      gravity?: number;
      bounces?: number;
      duration?: number;
    }
  ): gsap.core.Timeline {
    const timeline = gsap.timeline();
    
    switch (type) {
      case 'fall':
        this.animateFall(timeline, object, options);
        break;
      case 'bounce':
        this.animateBounce(timeline, object, options);
        break;
      case 'explode':
        this.animateExplode(timeline, object, options);
        break;
      case 'float':
        this.animateFloat(timeline, object, options);
        break;
    }
    
    return timeline;
  }
  
  private animateFall(
    timeline: gsap.core.Timeline,
    object: THREE.Object3D,
    options?: any
  ): void {
    const startY = object.position.y;
    const height = options?.height || 2;
    const duration = options?.duration || 1;
    
    // Phase 1 : Chute
    timeline.to(object.position, {
      y: startY - height,
      duration: duration * 0.6,
      ease: 'power2.in',
    });
    
    // Phase 2 : Impact
    timeline.to(object.position, {
      y: startY - height + 0.05,
      duration: 0.05,
      ease: 'power2.out',
    });
    
    // Phase 3 : Stabilisation
    timeline.to(object.position, {
      y: startY - height,
      duration: 0.1,
      ease: 'power2.in',
    });
    
    // Effet de poussière à l'impact
    this.spawnDustParticles(object.position.clone());
  }
  
  private animateBounce(
    timeline: gsap.core.Timeline,
    object: THREE.Object3D,
    options?: any
  ): void {
    const bounces = options?.bounces || 3;
    const height = options?.height || 1;
    
    for (let i = 0; i < bounces; i++) {
      const bounceHeight = height * Math.pow(0.5, i);
      const duration = 0.6 * Math.pow(0.7, i);
      
      timeline.to(object.position, {
        y: object.position.y + bounceHeight,
        duration: duration / 2,
        ease: 'power2.out',
      });
      
      timeline.to(object.position, {
        y: object.position.y,
        duration: duration / 2,
        ease: 'bounce.out',
      });
    }
  }
  
  private animateExplode(
    timeline: gsap.core.Timeline,
    object: THREE.Object3D,
    options?: any
  ): void {
    // Fragmenter l'objet en morceaux
    const fragments = this.fragmentObject(object);
    
    fragments.forEach((fragment, i) => {
      const randomDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5,
        (Math.random() - 0.5) * 5
      );
      
      timeline.to(fragment.position, {
        x: fragment.position.x + randomDirection.x,
        y: fragment.position.y + randomDirection.y,
        z: fragment.position.z + randomDirection.z,
        duration: 1,
        ease: 'power2.out',
      }, i * 0.05);
      
      timeline.to(fragment.rotation, {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
        duration: 1,
        ease: 'power2.out',
      }, i * 0.05);
    });
  }
  
  private animateFloat(
    timeline: gsap.core.Timeline,
    object: THREE.Object3D,
    options?: any
  ): void {
    const duration = options?.duration || 2;
    
    timeline.to(object.position, {
      y: object.position.y + 0.1,
      duration: duration / 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    
    timeline.to(object.rotation, {
      y: object.rotation.y + 0.1,
      duration: duration * 1.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    }, 0);
  }
  
  // Animation de l'interrupteur
  animateSwitch(
    switchObject: THREE.Object3D,
    action: 'on' | 'off'
  ): gsap.core.Timeline {
    const timeline = gsap.timeline();
    
    const targetAngle = action === 'on' ? 0.3 : -0.3;
    
    timeline.to(switchObject.rotation, {
      x: targetAngle,
      duration: 0.2,
      ease: 'power2.out',
    });
    
    // Petit retour élastique
    timeline.to(switchObject.rotation, {
      x: targetAngle * 0.8,
      duration: 0.1,
      ease: 'power2.in',
    });
    
    return timeline;
  }
  
  // Animation d'ouverture de tiroir
  animateDrawer(
    drawer: THREE.Object3D,
    action: 'open' | 'close',
    distance?: number
  ): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const targetZ = action === 'open' ? distance || 0.5 : 0;
    
    timeline.to(drawer.position, {
      z: targetZ,
      duration: 0.4,
      ease: 'power2.inOut',
    });
    
    return timeline;
  }
  
  // Animation de rotation continue (ventilateur, horloge)
  animateSpin(
    object: THREE.Object3D,
    options?: {
      speed?: number;
      axis?: 'x' | 'y' | 'z';
    }
  ): gsap.core.Timeline {
    const timeline = gsap.timeline({ repeat: -1 });
    const axis = options?.axis || 'y';
    const speed = options?.speed || 2;
    
    timeline.to(object.rotation, {
      [axis]: Math.PI * 2,
      duration: speed,
      ease: 'none',
    });
    
    return timeline;
  }
  
  // Animation de clignotement (néon, alarme)
  animateFlicker(
    object: THREE.Object3D,
    options?: {
      intensity?: number;
      frequency?: number;
      pattern?: 'regular' | 'random' | 'sos';
    }
  ): gsap.core.Timeline {
    const timeline = gsap.timeline({ repeat: -1 });
    const frequency = options?.frequency || 0.5;
    
    if (options?.pattern === 'random') {
      for (let i = 0; i < 10; i++) {
        timeline.to(object, {
          opacity: Math.random() > 0.5 ? 1 : 0.3,
          duration: Math.random() * frequency,
        });
      }
    } else if (options?.pattern === 'sos') {
      // ...---...
      [0.2, 0.2, 0.2, 0.6, 0.6, 0.6, 0.2, 0.2, 0.2].forEach(dur => {
        timeline.to(object, { opacity: 1, duration: dur / 2 });
        timeline.to(object, { opacity: 0.2, duration: dur / 2 });
      });
      timeline.to(object, { opacity: 0.2, duration: 2 });
    } else {
      timeline.to(object, {
        opacity: 0.3,
        duration: frequency / 2,
      });
      timeline.to(object, {
        opacity: 1,
        duration: frequency / 2,
      });
    }
    
    return timeline;
  }
  
  // Animation de particules (poussière, étincelles)
  private spawnDustParticles(position: THREE.Vector3): void {
    // Créer des particules de poussière à la position
    const particleCount = 20;
    const particles: THREE.Mesh[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xCCBBAA, transparent: true, opacity: 0.8 })
      );
      particle.position.copy(position);
      particle.position.y += 0.1;
      particles.push(particle);
    }
    
    // Animer chaque particule
    particles.forEach((particle, i) => {
      const randomDir = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 0.5
      );
      
      gsap.to(particle.position, {
        x: particle.position.x + randomDir.x,
        y: particle.position.y + randomDir.y,
        z: particle.position.z + randomDir.z,
        duration: 0.8 + Math.random() * 0.5,
        ease: 'power2.out',
      });
      
      gsap.to(particle.material, {
        opacity: 0,
        duration: 0.8 + Math.random() * 0.5,
        delay: 0.2,
      });
    });
  }
  
  private fragmentObject(object: THREE.Object3D): THREE.Object3D[] {
    // Version simplifiée - crée des fragments cubiques
    const fragments: THREE.Mesh[] = [];
    const size = 0.1;
    const count = 8;
    
    for (let i = 0; i < count; i++) {
      const fragment = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshStandardMaterial({
          color: 0x888888,
          roughness: 0.5,
          metalness: 0.3,
        })
      );
      fragment.position.copy(object.position);
      fragment.position.x += (Math.random() - 0.5) * size;
      fragment.position.y += (Math.random() - 0.5) * size;
      fragment.position.z += (Math.random() - 0.5) * size;
      fragments.push(fragment);
    }
    
    return fragments;
  }
  
  private playDoorSound(action: 'open' | 'close'): void {
    // Simuler un son de porte (à remplacer par de vrais fichiers audio)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (action === 'open') {
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    } else {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(200, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    }
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }
  
  // Nettoyer les animations
  dispose(): void {
    this.animations.forEach(timeline => timeline.kill());
    this.animations.clear();
  }
}

// Hook React pour utiliser les animations
export function useAnimations() {
  const animSystem = useRef(new AnimationSystem());
  
  useEffect(() => {
    return () => animSystem.current.dispose();
  }, []);
  
  return animSystem.current;
}