import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Character, WeatherType, TimePhase, PhysicsObject, KeyframeData, SceneObject } from "../types";
import { Play, Pause, Zap, Flame, MoveUp, HelpCircle, Shield, RefreshCw, Key, Move, Layers, Settings } from "lucide-react";
import { ContextualAudioManager } from "../utils/ContextualAudioManager";

interface ThreeDCanvasProps {
  character: Character;
  currentAnimation: KeyframeData[] | null;
  animationProgress: number; // 0 to 100
  weather: WeatherType;
  timePhase: TimePhase;
  physicsObjects: PhysicsObject[];
  onPhysicsCollision?: (msg: string) => void;
  onSelectObject?: (obj: PhysicsObject | null) => void;
  attractActive: boolean;
  spawned3DModels: any[];
  patrolRoutePoints?: [number, number, number][] | null;

  // Scene editor properties
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  onSelectObjectId?: (id: string | null) => void;
  groundStyle?: "asphalt" | "grass" | "snow" | "sand";
  ambientColor?: string;
  dirLightColor?: string;
  lightIntensity?: number;
  showGrid?: boolean;
  movementParams?: {
    walkSpeed: number;
    jumpHeight: number;
    characterMass: number;
  };
  cameraMode?: "tps" | "cinematic" | "aerial";
}

export default function ThreeDCanvas({
  character,
  currentAnimation,
  animationProgress,
  weather,
  timePhase,
  physicsObjects,
  onPhysicsCollision,
  onSelectObject,
  attractActive,
  spawned3DModels,
  patrolRoutePoints,
  
  // Scene editor fallbacks
  sceneObjects = [],
  selectedObjectId = null,
  onSelectObjectId,
  groundStyle = "grass",
  ambientColor = "#334155",
  dirLightColor = "#fffbeb",
  lightIntensity = 1.6,
  showGrid = true,
  movementParams = { walkSpeed: 4.0, jumpHeight: 6.5, characterMass: 1.5 },
  cameraMode = "tps"
}: ThreeDCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for animation manipulation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Mesh component references for the character
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const eyeLRef = useRef<THREE.Mesh | null>(null);
  const eyeRRef = useRef<THREE.Mesh | null>(null);
  const noseMeshRef = useRef<THREE.Mesh | null>(null);
  const jawMeshRef = useRef<THREE.Mesh | null>(null);
  const earLRef = useRef<THREE.Mesh | null>(null);
  const earRRef = useRef<THREE.Mesh | null>(null);
  const hairGroupRef = useRef<THREE.Group | null>(null);
  const torsoMeshRef = useRef<THREE.Mesh | null>(null);
  const armLRef = useRef<THREE.Mesh | null>(null);
  const armRRef = useRef<THREE.Mesh | null>(null);
  const legLRef = useRef<THREE.Mesh | null>(null);
  const legRRef = useRef<THREE.Mesh | null>(null);
  const backpackGroupRef = useRef<THREE.Group | null>(null);
  const accessoryGroupRef = useRef<THREE.Group | null>(null);

  // Selection box outline helper
  const selectionBoxHelperRef = useRef<THREE.BoxHelper | null>(null);
  
  // Ambient particles (Rain, Fog, etc.)
  const rainGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const rainPointsRef = useRef<THREE.Points | null>(null);

  // Setup the Orbit controls-like state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0.8, phi: 1.2, radius: 10 });

  // Camera smooth following targets
  const cameraLookAtRef = useRef<THREE.Vector3 | null>(null);
  const currentCameraFovRef = useRef<number>(45);

  // Handle physics collision triggering to avoid UI overload
  const lastCollisionTimeRef = useRef(0);
  const lastFootstepRef = useRef<number>(-1);

  // Locomotion WASD States
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const playerIsGroundedRef = useRef(true);
  const playerYVelocityRef = useRef(0);
  const isMovingProcedurallyRef = useRef(false);

  // Cached textures for Quebec clothing brands
  const torsoTexturesCacheRef = useRef<Map<string, THREE.Texture>>(new Map());

  // GLTF caching to avoid reloading identical meshes
  const gltfCacheRef = useRef<Map<string, THREE.Group>>(new Map());

  // Ground grid helper reference
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Procedurally generate high-quality canvas textures for Quebec branded items
  const getBrandTexture = (brand: string, baseColor: string): THREE.Texture => {
    const key = `${brand}_${baseColor}`;
    if (torsoTexturesCacheRef.current.has(key)) {
      return torsoTexturesCacheRef.current.get(key)!;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // Draw background
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 512, 512);

      // Render brand specific details & logos
      if (brand === "Hydro-Québec") {
        // Neon orange stripes & classic white lightning emblem
        ctx.fillStyle = "#ff6b00";
        ctx.fillRect(0, 150, 512, 60);
        ctx.fillRect(0, 310, 512, 60);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 24;
        ctx.beginPath();
        ctx.arc(256, 256, 110, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(230, 200);
        ctx.lineTo(290, 245);
        ctx.lineTo(245, 245);
        ctx.lineTo(270, 312);
        ctx.lineTo(210, 260);
        ctx.lineTo(256, 260);
        ctx.closePath();
        ctx.fill();
      } else if (brand === "Caisse Desjardins") {
        ctx.fillStyle = "#00875a"; // Desjardins green
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 16;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const rx = 256 + 85 * Math.cos(angle);
          const ry = 256 + 85 * Math.sin(angle);
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 96px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("d", 256, 246);
      } else if (brand === "Sûreté du Québec") {
        ctx.fillStyle = "#1e2c14"; // Olive-drab military style
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = "#eab308"; // Golden yellow bands
        ctx.fillRect(0, 0, 50, 512);
        ctx.fillRect(462, 0, 50, 512);

        // Gold police badge
        ctx.fillStyle = "#eab308";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(256, 256, 75, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#000000";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("POLICE", 256, 242);
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("SQ", 256, 280);
      } else if (brand === "SAQ") {
        ctx.fillStyle = "#7f1c1d"; // Wine red
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = "#ffffff";
        ctx.font = "extrabold 120px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SAQ", 256, 256);

        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 10;
        ctx.strokeRect(70, 70, 372, 372);
      } else if (brand === "Molson Export") {
        ctx.fillStyle = "#1e3a8a"; // Dark Molson blue
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = "#dc2626"; // Bold red stripe
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(120, 0);
        ctx.lineTo(512, 392);
        ctx.lineTo(512, 512);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "extrabold 150px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("M", 256, 256);

        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText("EXPORT", 256, 360);
      } else if (brand === "Nordiques") {
        ctx.fillStyle = "#0284c7"; // Nordiques Sky Blue
        ctx.fillRect(0, 0, 512, 512);

        // White base stripe
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 420, 512, 92);

        // Stylized igloo fleur-de-lys hockey logo
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(256, 230, 70, 0, Math.PI, true);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ef4444";
        ctx.font = "extrabold 130px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("N", 256, 220);
      } else if (brand === "Ashton Poutine") {
        ctx.fillStyle = "#dc2626"; // Ashton Red
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = "#f59e0b"; // Golden yellow smile face
        ctx.beginPath();
        ctx.arc(256, 256, 110, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.font = "bold 42px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ASHTON", 256, 270);
      } else if (brand === "St-Hubert") {
        ctx.fillStyle = "#fbbf24"; // Yellow
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = "#166534"; // Green collar banner
        ctx.fillRect(0, 0, 512, 60);

        // Red rooster outline
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(256, 260, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 72px serif";
        ctx.textAlign = "center";
        ctx.fillText("🐔", 256, 280);
      } else {
        // Standard checkered pattern or flannel look
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(0, 220, 512, 72);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    torsoTexturesCacheRef.current.set(key, texture);
    return texture;
  };

  // Keyboard hooks for WASD movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current[key] = true;
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current[key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Initialize Scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const width = mountRef.current?.clientWidth || 800;
    const height = mountRef.current?.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 150);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Base Environment / Ground
    const gridHelper = new THREE.GridHelper(50, 50, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -2;
    gridHelper.visible = showGrid;
    gridHelperRef.current = gridHelper;
    scene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d1527,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = "environmentGround";
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pine trees & rocks forest environment decoration
    const environmentGroup = new THREE.Group();
    environmentGroup.name = "environmentForest";
    
    // Low-poly Pines
    for (let i = 0; i < 20; i++) {
      const tree = new THREE.Group();
      const x = (Math.random() - 0.5) * 45;
      const z = (Math.random() - 0.5) * 45;
      if (Math.sqrt(x * x + z * z) < 5) continue;

      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 1.8, 5);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d2a15, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = -2 + 0.9;
      trunk.castShadow = true;
      tree.add(trunk);

      const leavesGeo = new THREE.ConeGeometry(1.2, 3.0, 5);
      const leavesMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8, flatShading: true });
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = -2 + 1.8 + 1.5;
      leaves.castShadow = true;
      tree.add(leaves);

      tree.position.set(x, 0, z);
      environmentGroup.add(tree);
    }

    // River rocks / Boulders
    for (let i = 0; i < 10; i++) {
      const rockGeo = new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.9, 1);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      if (Math.sqrt(x * x + z * z) < 5) continue;
      rock.position.set(x, -2 + 0.3, z);
      rock.scale.set(1.2, 0.6 + Math.random() * 0.6, 1.2);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      environmentGroup.add(rock);
    }
    scene.add(environmentGroup);

    // 5. Build Procedural 3D Character Rig
    const characterGroup = new THREE.Group();
    characterGroup.name = "characterGroup";
    characterGroup.position.set(0, -0.3, 0);
    characterGroupRef.current = characterGroup;
    scene.add(characterGroup);

    buildProceduralCharacter(characterGroup);

    // 6. Spawn environmental scene objects
    syncSceneObjectsInThree();

    // 7. Setup weather precipitation particles
    setupRainSystem(scene);

    // 8. Viewport click handling for raycasting / object selection
    const handleCanvasClick = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
      if (isDraggingRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      const meshesToIntersect: THREE.Object3D[] = [];
      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name.startsWith("sceneobj-")) {
          meshesToIntersect.push(child);
        }
      });

      const intersects = raycaster.intersectObjects(meshesToIntersect, true);
      if (intersects.length > 0) {
        let parentObj = intersects[0].object;
        while (parentObj && parentObj.parent && parentObj.parent.name.startsWith("sceneobj-")) {
          parentObj = parentObj.parent;
        }
        const cleanId = parentObj.name.replace("sceneobj-", "");
        if (onSelectObjectId) {
          onSelectObjectId(cleanId);
          ContextualAudioManager.getInstance().playUiClick();
        }
      } else {
        // Deselect if clicking on empty terrain
        const groundIntersect = raycaster.intersectObject(ground);
        if (groundIntersect.length > 0 && onSelectObjectId) {
          onSelectObjectId(null);
        }
      }
    };

    // 9. Camera Orbit Mouse Drag Hooks
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = false;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      ContextualAudioManager.getInstance().init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;
      
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        isDraggingRef.current = true;
      }

      if (!keysPressedRef.current["mousedown"] && e.buttons !== 1) return;

      cameraAngleRef.current.theta -= deltaX * 0.007;
      cameraAngleRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - deltaY * 0.007)
      );

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      updateCameraPosition();
    };

    const handleMouseUp = (e: MouseEvent) => {
      handleCanvasClick(e);
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      cameraAngleRef.current.radius = Math.max(2.5, Math.min(30, cameraAngleRef.current.radius + e.deltaY * 0.015));
      updateCameraPosition();
    };

    const canvas = canvasRef.current;
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel);

    // 10. Resize Observer for proper aspect ratios
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      window.requestAnimationFrame(() => {
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      });
    });
    if (mountRef.current) resizeObserver.observe(mountRef.current);

    // 11. Physics and Locomotion Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Weather Particles movement
      tickWeatherFX(elapsed, delta);

      // Keyboard locomotion walking / jumping character controls
      tickCharacterKeyboardControls(elapsed, delta);

      // Smooth camera follow update
      updateCameraPosition(true);

      // Core custom keyframes timeline animation player
      if (!isMovingProcedurallyRef.current) {
        tickCharacterAnimation();
      }

      // Sync active object selection wireframe box helper
      tickSelectionWireframeOutline();

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update terrain grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Synchronize environmental settings
  useEffect(() => {
    updateEnvironmentSkyAndLighting();
  }, [weather, timePhase, groundStyle, ambientColor, dirLightColor, lightIntensity]);

  // Redraw branding details on character torso when brand selection edits are made
  useEffect(() => {
    if (characterGroupRef.current) {
      updateCharacterMorphology();
    }
  }, [character]);

  // Synchronize 3D Scene Objects list changes
  useEffect(() => {
    syncSceneObjectsInThree();
  }, [sceneObjects, selectedObjectId]);

  // Update Physgun state
  useEffect(() => {
    ContextualAudioManager.getInstance().setPhysgunActive(attractActive);
  }, [attractActive]);

  // Premium camera angle placement and smooth follow system
  const updateCameraPosition = (useLerp = true) => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    
    // Dynamically adjust FOV and distance when sprinting to create a gorgeous sense of speed
    const isSprinting = keysPressedRef.current["shift"] && isMovingProcedurallyRef.current;
    const targetFov = isSprinting ? 53 : 45;
    currentCameraFovRef.current = THREE.MathUtils.lerp(currentCameraFovRef.current, targetFov, 0.04);
    cameraRef.current.fov = currentCameraFovRef.current;
    cameraRef.current.updateProjectionMatrix();

    const targetRadius = radius + (isSprinting ? 1.2 : 0);
    let x, y, z;
    if (cameraMode === "cinematic") {
      const autoTheta = Date.now() * 0.00015;
      const autoPhi = 1.32;
      const autoRadius = 5.5;
      x = autoRadius * Math.sin(autoPhi) * Math.sin(autoTheta);
      y = autoRadius * Math.cos(autoPhi);
      z = autoRadius * Math.sin(autoPhi) * Math.cos(autoTheta);
    } else if (cameraMode === "aerial") {
      x = 0.001;
      y = 12.0;
      z = 0.001;
    } else {
      x = targetRadius * Math.sin(phi) * Math.sin(theta);
      y = targetRadius * Math.cos(phi);
      z = targetRadius * Math.sin(phi) * Math.cos(theta);
    }

    // Make camera look towards character position
    const charPos = characterGroupRef.current?.position || new THREE.Vector3(0, -0.3, 0);
    const desiredPos = new THREE.Vector3(charPos.x + x, charPos.y + y + 1.2, charPos.z + z);
    // Position lookAt slightly above character's base for stable framing
    const desiredLookAt = new THREE.Vector3(charPos.x, charPos.y + 0.85, charPos.z);

    if (useLerp) {
      // Use higher interpolation factor when user is dragging or zooming to keep controls snappy
      const lerpFactor = isDraggingRef.current ? 0.35 : 0.07;
      cameraRef.current.position.lerp(desiredPos, lerpFactor);

      if (!cameraLookAtRef.current) {
        cameraLookAtRef.current = desiredLookAt.clone();
      } else {
        cameraLookAtRef.current.lerp(desiredLookAt, 0.12);
      }
      cameraRef.current.lookAt(cameraLookAtRef.current);
    } else {
      cameraRef.current.position.copy(desiredPos);
      cameraRef.current.lookAt(desiredLookAt);
      cameraLookAtRef.current = desiredLookAt.clone();
    }
  };

  // Keyboard WASD walk controls and jumping physical mechanics
  const tickCharacterKeyboardControls = (elapsed: number, delta: number) => {
    const charGroup = characterGroupRef.current;
    if (!charGroup) return;

    // Check if sprinting (shift key) to dynamically accelerate locomotion speed
    const isSprinting = keysPressedRef.current["shift"];
    const baseSpeed = movementParams.walkSpeed || 4.5;
    const currentSpeed = baseSpeed * (isSprinting ? 1.7 : 1.0);
    const speed = currentSpeed * delta;
    const moveVec = new THREE.Vector3(0, 0, 0);

    if (keysPressedRef.current["w"] || keysPressedRef.current["arrowup"]) {
      moveVec.z = -speed;
    }
    if (keysPressedRef.current["s"] || keysPressedRef.current["arrowdown"]) {
      moveVec.z = speed;
    }
    if (keysPressedRef.current["a"] || keysPressedRef.current["arrowleft"]) {
      moveVec.x = -speed;
    }
    if (keysPressedRef.current["d"] || keysPressedRef.current["arrowright"]) {
      moveVec.x = speed;
    }

    // WASD locomotion walk cycles
    if (moveVec.lengthSq() > 0) {
      isMovingProcedurallyRef.current = true;
      
      // Calculate rotation towards movement direction
      const angle = Math.atan2(moveVec.x, moveVec.z);
      charGroup.rotation.y = angle;

      // Translate character position
      charGroup.position.add(moveVec);

      // Clamp character inside bounds to prevent falling off grid
      charGroup.position.x = Math.max(-50, Math.min(50, charGroup.position.x));
      charGroup.position.z = Math.max(-50, Math.min(50, charGroup.position.z));

      // Swing limbs procedurally (speed up animation when sprinting)
      const swingFreq = isSprinting ? 18.0 : 11.0;
      const swing = Math.sin(elapsed * swingFreq);
      if (armLRef.current) armLRef.current.rotation.x = swing * 0.7;
      if (armRRef.current) armRRef.current.rotation.x = -swing * 0.7;
      if (legLRef.current) legLRef.current.rotation.x = -swing * 0.6;
      if (legRRef.current) legRRef.current.rotation.x = swing * 0.6;

      // Vertical bounce
      charGroup.position.y = -0.3 + Math.abs(swing) * 0.08;

      // Random footprints and footstep sound effects (faster footsteps when running)
      const footstepInterval = isSprinting ? 0.18 : 0.32;
      const stepTimer = elapsed % (footstepInterval * 2);
      if (stepTimer < delta && lastFootstepRef.current !== Math.floor(elapsed / footstepInterval)) {
        lastFootstepRef.current = Math.floor(elapsed / footstepInterval);
        let mat = "beton";
        if (groundStyle === "snow") mat = "neige";
        else if (groundStyle === "grass") mat = "herbe";
        ContextualAudioManager.getInstance().playFootstep(mat, isSprinting ? 0.38 : 0.28);
      }
    } else {
      isMovingProcedurallyRef.current = false;
    }

    // Jump mechanics with gravity calculations
    if (keysPressedRef.current[" "] && playerIsGroundedRef.current) {
      playerYVelocityRef.current = movementParams.jumpHeight || 6.5;
      playerIsGroundedRef.current = false;
      
      let mat = "beton";
      if (groundStyle === "snow") mat = "neige";
      else if (groundStyle === "grass") mat = "herbe";
      ContextualAudioManager.getInstance().playFootstep(mat, 0.7); // heavy jump jump sound
    }

    if (!playerIsGroundedRef.current) {
      // Apply falling speed
      const grav = -16.0; // standard custom gravity
      playerYVelocityRef.current += grav * delta;
      charGroup.position.y += playerYVelocityRef.current * delta;

      // Land on floor
      if (charGroup.position.y <= -0.3) {
        charGroup.position.y = -0.3;
        playerYVelocityRef.current = 0;
        playerIsGroundedRef.current = true;

        let mat = "beton";
        if (groundStyle === "snow") mat = "neige";
        else if (groundStyle === "grass") mat = "herbe";
        ContextualAudioManager.getInstance().playFootstep(mat, 0.45); // heavy land sound
      }

      // Tilt limbs while falling
      if (armLRef.current) armLRef.current.rotation.z = -1.2;
      if (armRRef.current) armRRef.current.rotation.z = 1.2;
    }
  };

  // Selection outline highlighting
  const tickSelectionWireframeOutline = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (selectionBoxHelperRef.current) {
      scene.remove(selectionBoxHelperRef.current);
      selectionBoxHelperRef.current = null;
    }

    if (selectedObjectId) {
      const selectedMesh = scene.getObjectByName(`sceneobj-${selectedObjectId}`);
      if (selectedMesh) {
        const outline = new THREE.BoxHelper(selectedMesh, 0xeab308); // electric gold border color
        outline.name = "selectionOutlineHelper";
        selectionBoxHelperRef.current = outline;
        scene.add(outline);
      }
    }
  };

  // Build the complete procedural 3D elements for our RPG character
  const buildProceduralCharacter = (group: THREE.Group) => {
    // Clear existing
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Base materials
    const skinMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });
    const clothesTorsoMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const clothesLegsMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });

    // 1. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.6, 0);
    headGroup.name = "headGroup";
    group.add(headGroup);

    // Main skull box
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headMeshRef.current = headMesh;
    headGroup.add(headMesh);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eyeL = new THREE.Group();
    const scleraL = new THREE.Mesh(eyeGeo, eyeMat);
    const pupilL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), pupilMat);
    pupilL.position.set(-0.02, 0, 0.03);
    eyeL.add(scleraL);
    eyeL.add(pupilL);
    eyeL.position.set(-0.2, 0.1, 0.4);
    eyeLRef.current = eyeL as any;
    headGroup.add(eyeL);

    const eyeR = new THREE.Group();
    const scleraR = new THREE.Mesh(eyeGeo, eyeMat);
    const pupilR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), pupilMat);
    pupilR.position.set(0.02, 0, 0.03);
    eyeR.add(scleraR);
    eyeR.add(pupilR);
    eyeR.position.set(0.2, 0.1, 0.4);
    eyeRRef.current = eyeR as any;
    headGroup.add(eyeR);

    // Nose
    const noseGeo = new THREE.BoxGeometry(0.12, 0.25, 0.12);
    const noseMesh = new THREE.Mesh(noseGeo, skinMat);
    noseMesh.position.set(0, -0.05, 0.42);
    noseMeshRef.current = noseMesh;
    headGroup.add(noseMesh);

    // Jawline
    const jawGeo = new THREE.BoxGeometry(0.78, 0.15, 0.78);
    const jawMesh = new THREE.Mesh(jawGeo, skinMat);
    jawMesh.position.set(0, -0.4, 0);
    jawMeshRef.current = jawMesh;
    headGroup.add(jawMesh);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.1, 0.22, 0.15);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.43, 0, 0);
    earLRef.current = earL;
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.43, 0, 0);
    earRRef.current = earR;
    headGroup.add(earR);

    // Hair Group
    const hairGroup = new THREE.Group();
    hairGroupRef.current = hairGroup;
    headGroup.add(hairGroup);

    // 2. Torso with support for custom dynamic canvas branding textures
    const torsoGeo = new THREE.BoxGeometry(0.9, 1.2, 0.5);
    const torsoMesh = new THREE.Mesh(torsoGeo, clothesTorsoMat);
    torsoMesh.position.set(0, 0.7, 0);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMeshRef.current = torsoMesh;
    group.add(torsoMesh);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.2, 8);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.set(0, 1.25, 0);
    group.add(neck);

    // Arms
    const armL = new THREE.Group();
    armL.position.set(-0.6, 1.2, 0);
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.24), skinMat);
    armLMesh.position.set(0, -0.45, 0);
    armLMesh.castShadow = true;
    armL.add(armLMesh);
    armLRef.current = armL as any;
    group.add(armL);

    const armR = new THREE.Group();
    armR.position.set(0.6, 1.2, 0);
    const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.24), skinMat);
    armRMesh.position.set(0, -0.45, 0);
    armRMesh.castShadow = true;
    armR.add(armRMesh);
    armRRef.current = armR as any;
    group.add(armR);

    // Legs
    const legL = new THREE.Group();
    legL.position.set(-0.25, 0.1, 0);
    const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.1, 0.28), clothesLegsMat);
    legLMesh.position.set(0, -0.5, 0);
    legLMesh.castShadow = true;
    legL.add(legLMesh);
    legLRef.current = legL as any;
    group.add(legL);

    const legR = new THREE.Group();
    legR.position.set(0.25, 0.1, 0);
    const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.1, 0.28), clothesLegsMat);
    legRMesh.position.set(0, -0.5, 0);
    legRMesh.castShadow = true;
    legR.add(legRMesh);
    legRRef.current = legR as any;
    group.add(legR);

    // Dorsal fixations / backpacks
    const backpackGroup = new THREE.Group();
    backpackGroup.position.set(0, 0.7, -0.32);
    backpackGroupRef.current = backpackGroup;
    group.add(backpackGroup);

    // Facial head accessories
    const accessoryGroup = new THREE.Group();
    accessoryGroupRef.current = accessoryGroup;
    headGroup.add(accessoryGroup);

    updateCharacterMorphology();
  };

  // Synchronize custom properties on morphology structure
  const updateCharacterMorphology = () => {
    if (!sceneRef.current) return;

    const skinColor = new THREE.Color(character.colors.skinColor);
    const hairColor = new THREE.Color(character.colors.hairColor);
    const torsoColor = new THREE.Color(character.colors.torsoColor);
    const legsColor = new THREE.Color(character.colors.legsColor);
    const accessoriesColor = new THREE.Color(character.colors.accessoriesColor);

    // Apply colors to skin meshes
    if (headMeshRef.current) (headMeshRef.current.material as THREE.MeshStandardMaterial).color.copy(skinColor);
    if (noseMeshRef.current) (noseMeshRef.current.material as THREE.MeshStandardMaterial).color.copy(skinColor);
    if (jawMeshRef.current) (jawMeshRef.current.material as THREE.MeshStandardMaterial).color.copy(skinColor);
    if (earLRef.current) (earLRef.current.material as THREE.MeshStandardMaterial).color.copy(skinColor);
    if (earRRef.current) (earRRef.current.material as THREE.MeshStandardMaterial).color.copy(skinColor);

    if (armLRef.current) ((armLRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.copy(skinColor);
    if (armRRef.current) ((armRRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.copy(skinColor);

    // Apply color/branding texture to torso
    if (torsoMeshRef.current) {
      const torsoMat = torsoMeshRef.current.material as THREE.MeshStandardMaterial;
      if (character.clothing.quebecBrand && character.clothing.quebecBrand !== "Aucune") {
        torsoMat.map = getBrandTexture(character.clothing.quebecBrand, character.colors.torsoColor);
        torsoMat.color.setHex(0xffffff); // Use original canvas colors
      } else {
        torsoMat.map = null;
        torsoMat.color.copy(torsoColor);
      }
      torsoMat.needsUpdate = true;
    }

    // Apply color to legs
    if (legLRef.current && legRRef.current) {
      const lMat = (legLRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const rMat = (legRRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      lMat.color.copy(legsColor);
      rMat.color.copy(legsColor);
    }

    // Morphology feature dimensions
    const f = character.features;
    if (eyeLRef.current) eyeLRef.current.position.set(-0.12 - (f.eyeSpacing * 0.1), 0.1, 0.41);
    if (eyeRRef.current) eyeRRef.current.position.set(0.12 + (f.eyeSpacing * 0.1), 0.1, 0.41);

    if (noseMeshRef.current) noseMeshRef.current.scale.set(f.noseShape * 1.1, 1, f.noseShape);
    if (jawMeshRef.current) jawMeshRef.current.scale.set(f.jawlineWidth * 1.1, 1, 1);
    
    if (earLRef.current && earRRef.current) {
      earLRef.current.scale.set(f.earsSize, f.earsSize, f.earsSize);
      earRRef.current.scale.set(f.earsSize, f.earsSize, f.earsSize);
    }

    // Build Hair Style meshes
    if (hairGroupRef.current) {
      while (hairGroupRef.current.children.length > 0) {
        hairGroupRef.current.remove(hairGroupRef.current.children[0]);
      }

      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });

      if (character.clothing.hairStyle === "Court") {
        const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.18, 0.84), hairMat);
        topHair.position.set(0, 0.42, 0);
        topHair.castShadow = true;
        hairGroupRef.current.add(topHair);

        const lHair = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.84), hairMat);
        lHair.position.set(-0.41, 0.2, 0);
        const rHair = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.84), hairMat);
        rHair.position.set(0.41, 0.2, 0);
        hairGroupRef.current.add(lHair, rHair);
      } else if (character.clothing.hairStyle === "Long") {
        const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.85), hairMat);
        topHair.position.set(0, 0.42, 0);
        hairGroupRef.current.add(topHair);

        const lFlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.85), hairMat);
        lFlow.position.set(-0.41, 0.05, 0.02);
        const rFlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.85), hairMat);
        rFlow.position.set(0.41, 0.05, 0.02);
        hairGroupRef.current.add(lFlow, rFlow);
      } else if (character.clothing.hairStyle === "Tuque") {
        // High-Quality custom Québécois Tuque mesh
        const tuqueBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 8), hairMat);
        tuqueBase.position.set(0, 0.45, 0);
        
        const tuqueDome = new THREE.Mesh(new THREE.SphereGeometry(0.43, 8, 8), hairMat);
        tuqueDome.position.set(0, 0.55, 0);

        const pompom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
        pompom.position.set(0, 0.98, 0);

        hairGroupRef.current.add(tuqueBase, tuqueDome, pompom);
      } else if (character.clothing.hairStyle === "Casquette") {
        const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.44, 8, 8), hairMat);
        capDome.position.set(0, 0.38, 0);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.42), hairMat);
        visor.position.set(0, 0.35, 0.48);
        hairGroupRef.current.add(capDome, visor);
      }
    }

    // Build head accessories
    if (accessoryGroupRef.current) {
      while (accessoryGroupRef.current.children.length > 0) {
        accessoryGroupRef.current.remove(accessoryGroupRef.current.children[0]);
      }

      if (character.clothing.headAccessory === "Lunettes de Soleil") {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.1 });
        const glassesFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.05), frameMat);
        glassesFrame.position.set(0, 0.12, 0.41);

        const glassL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        glassL.position.set(-0.18, 0.1, 0.42);
        const glassR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        glassR.position.set(0.18, 0.1, 0.42);

        accessoryGroupRef.current.add(glassesFrame, glassL, glassR);
      } else if (character.clothing.headAccessory === "Casque de Chantier") {
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.2 });
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 8), helmetMat);
        helmet.position.set(0, 0.42, 0);
        helmet.scale.set(1.05, 0.85, 1.05);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.5), helmetMat);
        visor.position.set(0, 0.3, 0.42);
        accessoryGroupRef.current.add(helmet, visor);
      }
    }

    // Build Back items
    if (backpackGroupRef.current) {
      while (backpackGroupRef.current.children.length > 0) {
        backpackGroupRef.current.remove(backpackGroupRef.current.children[0]);
      }

      const backItemType = character.clothing.backItem;
      const themeMat = new THREE.MeshStandardMaterial({ color: accessoriesColor, roughness: 0.6 });

      if (backItemType === "Sac de Hockey") {
        const sportsBag = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.45), new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.9 }));
        sportsBag.rotation.z = 0.08;
        sportsBag.castShadow = true;

        const strapL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 5), themeMat);
        strapL.position.set(-0.25, 0, 0.1);
        strapL.rotation.x = Math.PI / 2;
        sportsBag.add(strapL);

        backpackGroupRef.current.add(sportsBag);
      } else if (backItemType === "Radio SQ") {
        const radio = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.18), new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.7 }));
        radio.position.set(0.2, 0, 0);
        radio.castShadow = true;

        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 5), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        antenna.position.set(0.08, 0.4, 0);
        radio.add(antenna);

        backpackGroupRef.current.add(radio);
      } else if (backItemType === "Guitare") {
        const guitarBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.15), new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.4 }));
        guitarBody.rotation.z = -Math.PI / 6;
        guitarBody.castShadow = true;

        const guitarNeck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0x1e1b18 }));
        guitarNeck.position.set(0, 0.6, 0);
        guitarBody.add(guitarNeck);

        backpackGroupRef.current.add(guitarBody);
      }
    }
  };

  // Synchronize 3D Scene Objects (including GLTF files) inside Three.js
  const syncSceneObjectsInThree = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Remove all old loaded custom meshes
    const meshesToRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.name.startsWith("sceneobj-")) {
        meshesToRemove.push(child);
      }
    });
    meshesToRemove.forEach((mesh) => scene.remove(mesh));

    // 2. Loop and spawn everything in sceneObjects
    sceneObjects.forEach((obj) => {
      if (obj.type === "imported" && obj.modelUrl) {
        // Load custom GLTF/GLB models using GLTFLoader!
        if (gltfCacheRef.current.has(obj.modelUrl)) {
          const cachedModel = gltfCacheRef.current.get(obj.modelUrl)!.clone();
          cachedModel.name = `sceneobj-${obj.id}`;
          cachedModel.position.set(obj.position[0], obj.position[1], obj.position[2]);
          cachedModel.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
          cachedModel.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
          scene.add(cachedModel);
        } else {
          const loader = new GLTFLoader();
          loader.load(
            obj.modelUrl,
            (gltf) => {
              const loadedGroup = gltf.scene;
              loadedGroup.name = `sceneobj-${obj.id}`;
              loadedGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              // Cache and add
              gltfCacheRef.current.set(obj.modelUrl!, loadedGroup);
              
              const clone = loadedGroup.clone();
              clone.position.set(obj.position[0], obj.position[1], obj.position[2]);
              clone.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
              clone.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
              scene.add(clone);
            },
            undefined,
            (err) => {
              console.error("Failed to load custom GLB model:", err);
            }
          );
        }
      } else {
        // Standard primitives shapes
        let geo: THREE.BufferGeometry;
        const shapeType = obj.shapeType || "box";
        if (shapeType === "sphere") {
          geo = new THREE.SphereGeometry(obj.scale[0] * 0.5, 16, 16);
        } else if (shapeType === "cylinder") {
          geo = new THREE.CylinderGeometry(obj.scale[0] * 0.5, obj.scale[0] * 0.5, obj.scale[1], 12);
        } else if (shapeType === "cone") {
          geo = new THREE.ConeGeometry(obj.scale[0] * 0.5, obj.scale[1], 12);
        } else if (shapeType === "torus") {
          geo = new THREE.TorusGeometry(obj.scale[0] * 0.4, obj.scale[1] * 0.15, 12, 24);
        } else {
          geo = new THREE.BoxGeometry(obj.scale[0], obj.scale[1], obj.scale[2]);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(obj.color),
          roughness: 0.5,
          metalness: obj.isStatic ? 0.3 : 0.1
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = `sceneobj-${obj.id}`;
        mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
        mesh.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
    });
  };

  // Environment sky colors, fog, and ground textures based on configurations
  const updateEnvironmentSkyAndLighting = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old lights & decorative sky spheres
    const itemsToRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Light || child.name === "skySphere") {
        itemsToRemove.push(child);
      }
    });
    itemsToRemove.forEach((item) => scene.remove(item));

    // Ground color selector
    const ground = scene.getObjectByName("environmentGround") as THREE.Mesh;
    if (ground && ground.material) {
      const gMat = ground.material as THREE.MeshStandardMaterial;
      if (groundStyle === "snow") {
        gMat.color.setHex(0xf1f5f9); // Crispy white snow
        gMat.roughness = 0.85;
      } else if (groundStyle === "grass") {
        gMat.color.setHex(0x14532d); // Dark pine forest turf
        gMat.roughness = 0.9;
      } else if (groundStyle === "sand") {
        gMat.color.setHex(0xd97706); // Golden beach sand
        gMat.roughness = 0.75;
      } else {
        gMat.color.setHex(0x1e293b); // Slate asphalt
        gMat.roughness = 0.5;
      }
    }

    // Colors matching Time Phase
    let skyHex = 0x87ceeb;
    let groundAmbientHex = 0x334155;
    let directionalHex = 0xfffbeb;
    let intensity = lightIntensity;

    if (timePhase === "Aube") {
      skyHex = 0xf87171;
      groundAmbientHex = 0x475569;
      directionalHex = 0xfdba74;
    } else if (timePhase === "Midi") {
      skyHex = 0x0284c7;
      groundAmbientHex = 0x64748b;
      directionalHex = 0xffffff;
    } else if (timePhase === "Crépuscule") {
      skyHex = 0x7c3aed;
      groundAmbientHex = 0x1e1b4b;
      directionalHex = 0xf43f5e;
    } else if (timePhase === "Minuit") {
      skyHex = 0x030712;
      groundAmbientHex = 0x090d16;
      directionalHex = 0x38bdf8;
    }

    // Weather impact adjustments
    if (weather === "Pluie" || weather === "Orage") {
      skyHex = 0x334155;
      intensity *= 0.5;
    } else if (weather === "Brouillard") {
      skyHex = 0x64748b;
      intensity *= 0.6;
    }

    scene.background = new THREE.Color(skyHex);
    
    // Set fog
    if (weather === "Brouillard") {
      scene.fog = new THREE.FogExp2(skyHex, 0.12);
    } else if (weather === "Pluie" || weather === "Orage") {
      scene.fog = new THREE.FogExp2(skyHex, 0.05);
    } else {
      scene.fog = new THREE.FogExp2(skyHex, 0.02);
    }

    // Sky Dome Mesh
    const skySphere = new THREE.Mesh(
      new THREE.SphereGeometry(55, 16, 16),
      new THREE.MeshBasicMaterial({ color: skyHex, side: THREE.BackSide, fog: false })
    );
    skySphere.name = "skySphere";
    scene.add(skySphere);

    // Dynamic environmental lights
    const ambientLight = new THREE.AmbientLight(new THREE.Color(ambientColor), 1.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(new THREE.Color(dirLightColor), intensity);
    dirLight.position.set(5, 15, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    const offset = 8;
    dirLight.shadow.camera.left = -offset;
    dirLight.shadow.camera.right = offset;
    dirLight.shadow.camera.top = offset;
    dirLight.shadow.camera.bottom = -offset;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    if (weather === "Orage") {
      const lightningLight = new THREE.PointLight(0xffffff, 0, 80);
      lightningLight.position.set(0, 18, 0);
      lightningLight.name = "lightningLight";
      scene.add(lightningLight);
    }
  };

  // Generate rain particles
  const setupRainSystem = (scene: THREE.Scene) => {
    const rainCount = 450;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25; // x
      positions[i * 3 + 1] = Math.random() * 18; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25; // z
    }

    rainGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    const rainPoints = new THREE.Points(rainGeo, rainMat);
    rainPointsRef.current = rainPoints;
    scene.add(rainPoints);
    rainPoints.visible = false;
  };

  // Move rain particles and flash lightning
  const tickWeatherFX = (elapsed: number, delta: number) => {
    if (rainPointsRef.current) {
      if (weather === "Pluie" || weather === "Orage") {
        rainPointsRef.current.visible = true;
        const positions = rainPointsRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3 + 1] -= delta * 14; // y speed
          if (positions[i * 3 + 1] < -2) {
            positions[i * 3 + 1] = 15 + Math.random() * 5;
            positions[i * 3] = (Math.random() - 0.5) * 25;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
          }
        }
        rainPointsRef.current.geometry.attributes.position.needsUpdate = true;
      } else {
        rainPointsRef.current.visible = false;
      }
    }

    if (weather === "Orage" && sceneRef.current) {
      const lightningLight = sceneRef.current.getObjectByName("lightningLight") as THREE.PointLight;
      if (lightningLight) {
        if (Math.random() < 0.01) {
          lightningLight.intensity = 20 + Math.random() * 40;
          ContextualAudioManager.getInstance().triggerThunder();
        } else {
          lightningLight.intensity *= 0.8;
        }
      }
    }
  };

  // Interpolate keyframe values for character animation timeline
  const tickCharacterAnimation = () => {
    if (!currentAnimation || currentAnimation.length === 0) return;

    const sortedKeyframes = [...currentAnimation].sort((a, b) => a.time - b.time);
    let leftK = sortedKeyframes[0];
    let rightK = sortedKeyframes[sortedKeyframes.length - 1];

    for (let i = 0; i < sortedKeyframes.length - 1; i++) {
      if (animationProgress >= sortedKeyframes[i].time && animationProgress <= sortedKeyframes[i + 1].time) {
        leftK = sortedKeyframes[i];
        rightK = sortedKeyframes[i + 1];
        break;
      }
    }

    let factor = 0;
    const timeDelta = rightK.time - leftK.time;
    if (timeDelta > 0) {
      factor = (animationProgress - leftK.time) / timeDelta;
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const currentHeadRotX = lerp(leftK.headRotationX, rightK.headRotationX, factor);
    const currentHeadRotY = lerp(leftK.headRotationY, rightK.headRotationY, factor);
    const currentArmLRotZ = lerp(leftK.armLRotationZ, rightK.armLRotationZ, factor);
    const currentArmRRotZ = lerp(leftK.armRRotationZ, rightK.armRRotationZ, factor);
    const currentBodyY = lerp(leftK.bodyY, rightK.bodyY, factor);

    const headGroup = characterGroupRef.current?.getObjectByName("headGroup");
    if (headGroup) {
      headGroup.rotation.x = currentHeadRotX;
      headGroup.rotation.y = currentHeadRotY;
    }

    if (armLRef.current) armLRef.current.rotation.z = currentArmLRotZ;
    if (armRRef.current) armRRef.current.rotation.z = currentArmRRotZ;

    if (characterGroupRef.current) {
      characterGroupRef.current.position.y = -0.3 + currentBodyY;
    }

    const currentProgress = Math.floor(animationProgress);
    if ((currentProgress === 25 || currentProgress === 75) && lastFootstepRef.current !== currentProgress) {
      lastFootstepRef.current = currentProgress;
      let stepMaterial = "beton";
      if (groundStyle === "snow") stepMaterial = "neige";
      else if (groundStyle === "grass") stepMaterial = "herbe";
      ContextualAudioManager.getInstance().playFootstep(stepMaterial, 0.35);
    }
    
    if (currentProgress < 10) {
      lastFootstepRef.current = -1;
    }
  };

  const handleResetSimulation = () => {
    if (onPhysicsCollision) {
      onPhysicsCollision("Simulation physique de la scène réinitialisée !");
    }
    // Reposition all objects slightly high to fall down
    sceneObjects.forEach((obj) => {
      const mesh = sceneRef.current?.getObjectByName(`sceneobj-${obj.id}`);
      if (mesh && !obj.isStatic) {
        mesh.position.set(obj.position[0], obj.position[1] + 2, obj.position[2]);
      }
    });
    ContextualAudioManager.getInstance().playFootstep("beton", 0.7);
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/10 bg-[#0c0c0e] shadow-2xl">
      {/* Three.js Canvas */}
      <div ref={mountRef} className="w-full h-full min-h-[440px]">
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
      </div>

      {/* Interactive Controls Overlay HUD */}
      <div className="absolute top-4 left-4 z-10 bg-black/70 border border-white/10 rounded-lg p-3 max-w-[240px] backdrop-blur-md text-[10px] text-white/60 select-none shadow-lg">
        <div className="flex items-center gap-1.5 text-white font-bold uppercase tracking-wider font-mono mb-2 border-b border-white/15 pb-1">
          <HelpCircle size={12} className="text-blue-400" />
          <span>Locomotion & Test 3D</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">Z, Q, S, D / Arr :</span>
            <span className="bg-white/15 text-white px-1.5 py-0.5 rounded font-mono text-[9px]">Marcher</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">Espace (Space) :</span>
            <span className="bg-white/15 text-white px-1.5 py-0.5 rounded font-mono text-[9px]">Sauter</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">Clic Objet :</span>
            <span className="bg-white/15 text-white px-1.5 py-0.5 rounded font-mono text-[9px]">Inspecter</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">Glisser souris :</span>
            <span className="bg-white/15 text-white px-1.5 py-0.5 rounded font-mono text-[9px]">Orbit Cam</span>
          </div>
        </div>
      </div>

      {/* Environmental indicators bottom-left overlay */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 rounded bg-black/60 border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-wider font-mono backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          <span className="text-white/70 font-semibold">TroXTMOD Engine v3D</span>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-black/60 border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-wider font-mono backdrop-blur-sm">
          <span className="text-amber-400 font-bold">Terrain:</span>
          <span className="text-white font-semibold">{groundStyle}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-black/60 border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-wider font-mono backdrop-blur-sm">
          <span className="text-blue-400 font-bold">Météo:</span>
          <span className="text-white">{weather}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-black/60 border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-wider font-mono backdrop-blur-sm">
          <span className="text-purple-400 font-bold">Phase:</span>
          <span className="text-white">{timePhase}</span>
        </div>
      </div>

      {/* Physics dynamic resets */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleResetSimulation}
          title="Réinitialiser la gravité de la scène"
          className="rounded border border-white/10 bg-black/70 hover:bg-black/90 p-2.5 text-white/70 hover:text-white backdrop-blur-sm transition-all shadow-lg cursor-pointer"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
}
