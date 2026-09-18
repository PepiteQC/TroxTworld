/**
 * 🍁 LEGACY — Compatibilité API v1
 */
import * as THREE from "three";
import { erabliereSystem } from "./system";

export const sugarSites = () =>
  erabliereSystem.getAllBushes().map((b) => ({
    id: b.id, name: b.name, village: b.village,
    x: b.worldX, z: b.worldZ, yaw: b.yaw,
  }));

export const sugarClearings = () =>
  erabliereSystem.getAllBushes().map((b) => ({ x: b.worldX, z: b.worldZ, r: 42 }));

export const sugarMapMarks = () =>
  erabliereSystem.getAllBushes().map((b) => ({ x: b.worldX, z: b.worldZ, r: 18 }));

export const mountSugarbush = (parent: THREE.Group) => erabliereSystem.mount(parent);

export const tickSugar = (elapsed: number, dt: number) => erabliereSystem.tick(elapsed, dt);

export const SugarSystemInstance = erabliereSystem;