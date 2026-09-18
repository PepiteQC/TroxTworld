// src/scene/LightingManager.ts
import * as THREE from "three";

export class LightingManager {
  private scene: THREE.Scene;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public sunLight: THREE.DirectionalLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setupLighting();
  }

  private setupLighting(): void {
    // Lumière ambiante (faible pour un effet nuit)
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(this.ambientLight);

    // Lumière hémisphérique (ciel bleu nuit, sol orange)
    this.hemiLight = new THREE.HemisphereLight(0x0a0a20, 0xFF7F50, 0.2);
    this.scene.add(this.hemiLight);

    // Lumière directionnelle (lune)
    this.sunLight = new THREE.DirectionalLight(0xccccff, 0.5);
    this.sunLight.position.set(-100, 100, -50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);
  }

  public setTimeOfDay(time: number): void {
    // time = 0 à 24 (heures)
    const sunAngle = ((time / 24) * Math.PI * 2) - Math.PI / 2; // -90° à midi
    this.sunLight.position.set(
      Math.cos(sunAngle) * 200,
      Math.sin(sunAngle) * 200,
      Math.sin(sunAngle) * 50
    );
    this.sunLight.updateMatrixWorld();

    const skyColor = new THREE.Color();
    if (time >= 5 && time <= 18) {
      // Jour
      skyColor.setHSL(0.55, 0.5, 0.7);
      this.ambientLight.intensity = 0.4;
      this.hemiLight.intensity = 0.3;
    } else if (time >= 18 && time <= 20 || time >= 4 && time <= 5) {
      // Crépuscule/aube
      skyColor.setHSL(0.1, 0.8, 0.5);
      this.ambientLight.intensity = 0.2;
      this.hemiLight.intensity = 0.2;
    } else {
      // Nuit
      skyColor.setHSL(0.6, 0.3, 0.1);
      this.ambientLight.intensity = 0.1;
      this.hemiLight.intensity = 0.1;
    }
    this.scene.background = skyColor;
    this.hemiLight.color.set(skyColor);
  }

  public dispose(): void {
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.hemiLight);
    this.scene.remove(this.sunLight);
  }
}