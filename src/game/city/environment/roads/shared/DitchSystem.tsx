/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DITCH SYSTEM v2.0 — Fossés de rang Québec
 *  src/roads/shared/DitchSystem.tsx
 * ───────────────────────────────────────────────────────────────────────────
 *  • FIX : 3 matériaux distincts (ditch / grass / prairie)
 *  • FIX : dispose des géométries
 *  • FIX : pas de double offset (startX vs position)
 *  • Config : profondeur, largeur, résolution
 *  • Compat 100% v1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { getDitchMaterial, getGrassMaterial, getPrairieMaterial } from './RoadTextures';

interface DitchSystemProps {
  startX?: number;
  length?: number;
  roadWidth?: number;
  ditchDepth?: number;
  side?: 'both' | 'left' | 'right';
  position?: [number, number, number];
  /** 🆕 v2 */
  resolution?: number; // segments le long de la route
  /** 🆕 v2 */
  prairieWidth?: number;
}

// Fallbacks (jamais utilisés normalement, mais robustes)
const FALLBACK_DITCH_MAT = new THREE.MeshStandardMaterial({ color: '#3d3428', roughness: 0.95, flatShading: true });
const FALLBACK_GRASS_MAT = new THREE.MeshStandardMaterial({ color: '#2d5a27', roughness: 0.9, flatShading: true });
const FALLBACK_PRAIRIE_MAT = new THREE.MeshStandardMaterial({ color: '#6a7a3a', roughness: 1.0, flatShading: true });

export function DitchSystem({
  startX = -100,
  length = 250,
  roadWidth = 13,
  ditchDepth = 0.75,
  side = 'both',
  position = [0, 0, 0],
  resolution = 10,
  prairieWidth = 35,
}: DitchSystemProps) {
  // Matériaux (sans try/catch — les fonctions ne throw plus)
  const ditchMat = useMemo(() => {
    try { return getDitchMaterial() ?? FALLBACK_DITCH_MAT; }
    catch { return FALLBACK_DITCH_MAT; }
  }, []);

  const grassMat = useMemo(() => {
    try { return getGrassMaterial() ?? FALLBACK_GRASS_MAT; }
    catch { return FALLBACK_GRASS_MAT; }
  }, []);

  const prairieMat = useMemo(() => {
    try { return getPrairieMaterial() ?? FALLBACK_PRAIRIE_MAT; }
    catch { return FALLBACK_PRAIRIE_MAT; }
  }, []);

  const hw = roadWidth / 2;
  const left = side === 'both' || side === 'left';
  const right = side === 'both' || side === 'right';

  // 🆕 v2 — 3 géométries distinctes par biome (ditch, grass, prairie)
  const geometries = useMemo(() => {
    function build(isRight: boolean) {
      const sign = isRight ? 1 : -1;
      const segmentsX = Math.max(8, Math.floor(length / resolution));

      // Profil transversal : 4 sections distinctes
      const ditchSection = [
        { z: hw,          y: 0.0 },          // raccord route
        { z: hw + 1.2,    y: -0.05 },        // accotement (grass)
      ];
      const ditchCore = [
        { z: hw + 1.2,    y: -0.05 },        // début pente (grass→ditch)
        { z: hw + 3.0,    y: -ditchDepth },  // fond du fossé (ditch)
        { z: hw + 4.8,    y: -0.05 },        // remontée (grass)
      ];
      const prairieSection = [
        { z: hw + 4.8,    y: -0.05 },
        { z: hw + prairieWidth, y: 0.0 },
      ];

      function makeRibbon(cross: { z: number; y: number }[]): THREE.BufferGeometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let ix = 0; ix <= segmentsX; ix++) {
          const u = ix / segmentsX;
          const x = startX + u * length;

          for (let iz = 0; iz < cross.length; iz++) {
            const pt = cross[iz];
            const z = pt.z * sign;
            const y = pt.y;

            positions.push(x, y, z);
            normals.push(0, 1, 0);
            uvs.push(u * (length / 8), iz / (cross.length - 1));
          }
        }

        const numZ = cross.length;
        for (let ix = 0; ix < segmentsX; ix++) {
          for (let iz = 0; iz < numZ - 1; iz++) {
            const a = ix * numZ + iz;
            const b = (ix + 1) * numZ + iz;
            const c = (ix + 1) * numZ + (iz + 1);
            const d = ix * numZ + (iz + 1);

            if (isRight) {
              indices.push(a, b, d);
              indices.push(b, c, d);
            } else {
              indices.push(a, d, b);
              indices.push(b, d, c);
            }
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
      }

      return {
        grass: makeRibbon([...ditchSection, ...ditchCore.slice(1)]),
        ditch: makeRibbon(ditchCore),
        prairie: makeRibbon(prairieSection),
      };
    }

    return {
      left: left ? build(false) : null,
      right: right ? build(true) : null,
    };
  }, [startX, length, hw, ditchDepth, resolution, prairieWidth, left, right]);

  // 🆕 v2 — Cleanup GPU
  useEffect(() => {
    return () => {
      geometries.left?.grass.dispose();
      geometries.left?.ditch.dispose();
      geometries.left?.prairie.dispose();
      geometries.right?.grass.dispose();
      geometries.right?.ditch.dispose();
      geometries.right?.prairie.dispose();
    };
  }, [geometries]);

  return (
    <group position={position} name="DitchSystem_Quebec_v2">
      {/* Côté gauche */}
      {left && geometries.left && (
        <>
          <mesh geometry={geometries.left.grass} material={grassMat} receiveShadow />
          <mesh geometry={geometries.left.ditch} material={ditchMat} receiveShadow />
          <mesh geometry={geometries.left.prairie} material={prairieMat} receiveShadow />
        </>
      )}

      {/* Côté droit */}
      {right && geometries.right && (
        <>
          <mesh geometry={geometries.right.grass} material={grassMat} receiveShadow />
          <mesh geometry={geometries.right.ditch} material={ditchMat} receiveShadow />
          <mesh geometry={geometries.right.prairie} material={prairieMat} receiveShadow />
        </>
      )}
    </group>
  );
}