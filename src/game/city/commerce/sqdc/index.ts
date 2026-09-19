/**
 * ═══════════════════════════════════════════════════════════════════
 * TROXTWORLD — SQDC Ultimate v5.0 — POINT D'ENTRÉE UNIQUE
 *
 * Utilisation :
 *   import { buildSqdcBuilding } from "./sqdc";
 *   const sqdc = buildSqdcBuilding("sqdc_mtl", { x: 100, z: 50 });
 *   scene.add(sqdc.group);
 *   useFrame((_, dt) => sqdc.update(dt, playerPos, hasId));
 * ═══════════════════════════════════════════════════════════════════
 */
import * as THREE from "three";

import { buildSqdcInterior, type SqdcInteriorResult } from "./interieur";
import { buildSqdcSecurity, type SqdcSecurity } from "./security";
import { buildSqdcStorage, type SqdcStorage } from "./storage";
import { sqdcMaterials, disposeMaterials } from "./materiaux";
import { disposeTextures, texSqdcSign, texConcrete } from "./materiaux/textures";
import { disposePosters, POSTERS, makePosterMesh } from "./posters";
import {
  registerStore, unregisterStore, type SqdcStore,
} from "./sqdc";

export interface SqdcBuilding {
  group: THREE.Group;
  interior: SqdcInteriorResult;
  security: SqdcSecurity;
  storage: SqdcStorage;
  spawn: THREE.Vector3;
  exit: THREE.Vector3;
  walls: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  update: (dt: number, playerPos: THREE.Vector3, hasId: boolean) => void;
  dispose: () => void;
}

/* ─────────── HELPERS ─────────── */
function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ─────────── CONSTRUCTION COMPLÈTE ─────────── */
export function buildSqdcBuilding(
  storeId: string,
  storePos: { x: number; z: number },
  storeName = "SQDC Portneuf",
): SqdcBuilding {
  const root = new THREE.Group();
  root.name = `sqdc_building_${storeId}`;
  const mats = sqdcMaterials();

  /* ═══ 1) INTÉRIEUR COMPLET ═══ */
  const interior = buildSqdcInterior(storeId);
  root.add(interior.group);

  /* ═══ 2) COQUILLE EXTÉRIEURE ═══ */
  const W = 17, D = 15, H = 4.2;
  const ENTRY_HALF = 2.2;
  const sideW = (W - ENTRY_HALF * 2) / 2;
  const sideX = ENTRY_HALF + sideW / 2;

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });

  root.add(box(sideW, H, 0.30, -sideX, H / 2, D / 2, wallMat));
  root.add(box(sideW, H, 0.30, sideX, H / 2, D / 2, wallMat));
  root.add(box(ENTRY_HALF * 2, H - 2.8, 0.30, 0, H - 0.8, D / 2, wallMat));
  root.add(box(W, H, 0.30, 0, H / 2, -D / 2, wallMat));
  root.add(box(0.30, H, D, -W / 2, H / 2, 0, wallMat));
  root.add(box(0.30, H, D, W / 2, H / 2, 0, wallMat));
  root.add(box(W + 1, 0.40, D + 1, 0, H, 0, roofMat));

  /* ═══ 3) ENSEIGNE SQDC ═══ */
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 1.6),
    new THREE.MeshStandardMaterial({
      map: texSqdcSign(),
      emissive: 0x1a5632,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    }),
  );
  sign.position.set(0, H + 1.1, D / 2 + 0.2);
  root.add(sign);

  const signBack = box(6.5, 1.6, 0.15, 0, H + 1.1, D / 2 + 0.12, new THREE.MeshStandardMaterial({ color: 0x0f3d22, roughness: 0.8 }));
  root.add(signBack);

  /* ═══ 4) AMÉNAGEMENTS INTÉRIEURS ═══ */
  const security = buildSqdcSecurity(storeId, storePos, interior.cameras);
  const storage = buildSqdcStorage();
  const store: SqdcStore = {
    id: storeId,
    name: storeName,
    city: "Portneuf",
    address: storeName,
    position: storePos,
    ownerId: "government",
    isOpen: true,
    openedBy: null,
    openedAt: Date.now(),
    bannedCustomers: new Set(),
    todayRevenue: 0,
    todayCustomers: 0,
    weeklyRevenue: 0,
    interior,
    security,
    storage,
    license: {
      number: `SQDC-${storeId}`,
      issuedTo: "Société québécoise du cannabis",
      valid: true,
      expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
      violations: 0,
      suspensions: 0,
    },
  };
  registerStore(store);

  root.position.set(storePos.x, 0, storePos.z);

  const update = (dt: number, playerPos: THREE.Vector3, hasId: boolean) => {
    security.update(dt);
    const localPlayer = playerPos.clone().sub(root.position);
    const nearEntry = Math.abs(localPlayer.x) < 2.5 && localPlayer.z > 4;
    root.userData.prompt = nearEntry && hasId ? "Entrer dans la SQDC" : null;
  };

  const dispose = () => {
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
    unregisterStore(storeId);
    disposeMaterials();
    disposeTextures();
    disposePosters();
  };

  return {
    group: root,
    interior,
    security,
    storage,
    spawn: interior.spawn.clone().add(root.position),
    exit: interior.exit.clone().add(root.position),
    walls: interior.walls,
    update,
    dispose,
  };
}