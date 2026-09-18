// src/scene/SceneManager.ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { LightingManager } from "./LightingManager";
import { VisualEffects } from "../effects/VisualEffects";

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public lightingManager: LightingManager;
  public visualEffects: VisualEffects;
  private controls: OrbitControls;
  private container: HTMLElement;
  public clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.lightingManager = new LightingManager(this.scene);
    this.visualEffects = new VisualEffects(this.scene);
    this.setupResize();
    this.hideLoadingScreen();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a); // Fond noir pour un effet nuit
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(20, 15, 20);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.container.appendChild(this.renderer.domElement);
  }

  private initControls(): void {
    // On n'utilise pas OrbitControls ici car on a PlayerController
    // Mais on le garde au cas où
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Empêcher de voir sous le sol
  }

  private setupResize(): void {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private hideLoadingScreen(): void {
    const loadingElement = document.getElementById("loading");
    if (loadingElement) {
      loadingElement.style.display = "none";
    }
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());
    const dt = this.clock.getDelta();
    this.controls.update();
    this.visualEffects.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.lightingManager.dispose();
    this.visualEffects.dispose();
    if (this.controls) {
      this.controls.dispose();
    }
  }
}