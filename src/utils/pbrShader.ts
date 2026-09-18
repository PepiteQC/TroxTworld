import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderManager } from '../core/ShaderManager';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *   ETHERWORLD — PBR SHADER & POST-PROCESSING UTILITIES
 * ══════════════════════════════════════════════════════════════════════════
 */

export function setupPBREnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.environment = setupCubeMapEnvironment(scene, renderer);
}

export function setupCubeMapEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Create a procedural sky environment map
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#030712');

  const light = new THREE.DirectionalLight('#38bdf8', 3.0);
  light.position.set(10, 20, 10);
  envScene.add(light);

  const ambient = new THREE.AmbientLight('#0f172a', 1.5);
  envScene.add(ambient);

  const texture = pmremGenerator.fromScene(envScene).texture;
  pmremGenerator.dispose();

  scene.environment = texture;
  return texture;
}

export function setupPostProcessingBloom(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  options = { strength: 0.45, radius: 0.4, threshold: 0.82 }
) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    options.strength,
    options.radius,
    options.threshold
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    render: () => composer.render(),
    setSize: (w: number, h: number) => {
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    },
  };
}

export function upgradeModelToPBR(object3d: THREE.Object3D) {
  object3d.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.roughness = Math.min(0.8, mat.roughness ?? 0.5);
        mat.metalness = Math.max(0.1, mat.metalness ?? 0.2);
        mat.needsUpdate = true;
      }
    }
  });
}

export function createPBRSkinMaterial(colorHex = '#f5cba7'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.55,
    metalness: 0.05,
  });
}

export function createPBRFabricMaterial(colorHex = '#0284c7'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.75,
    metalness: 0.1,
  });
}

export function createPBRLeatherMaterial(colorHex = '#1e293b'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.35,
    metalness: 0.4,
  });
}

export function createPBRHairMaterial(colorHex = '#2a1206'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.9,
    metalness: 0.0,
  });
}

export function createWaterMesh(width = 40, depth = 40): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth, 64, 64);
  geo.rotateX(-Math.PI / 2);
  const mat = ShaderManager.getInstance().createWaterMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

export function createVolumetricFogMesh(width = 120, depth = 120): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth, 16, 16);
  geo.rotateX(-Math.PI / 2);
  const mat = ShaderManager.getInstance().createFogMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.2;
  return mesh;
}

export function createEnergyAuraMesh(radius = 1.5): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat = ShaderManager.getInstance().createShieldMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}
