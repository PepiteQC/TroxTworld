/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GUARDRAIL v2.0 — Glissières + Murets Québec
 *  src/roads/shared/GuardRail.tsx
 * ───────────────────────────────────────────────────────────────────────────
 *  • FIX : cleanup GPU
 *  • FIX : le rail suit maintenant les courbes (optionnel)
 *  • Config : spacing, type, material
 *  • Compat 100% v1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import * as THREE from 'three';
import { getCurve } from '../Route138';

// ─── MATÉRIAUX & GÉOMÉTRIES PARTAGÉS ──────────────────────────────────────
const RAIL_MAT = new THREE.MeshStandardMaterial({ color: '#b0b5bc', metalness: 0.85, roughness: 0.35 });
const POST_MAT = new THREE.MeshStandardMaterial({ color: '#5c4a38', roughness: 0.8, metalness: 0.1 });
const CONCRETE_MAT = new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.9, metalness: 0.05, flatShading: true });

const POST_GEO = new THREE.BoxGeometry(0.12, 0.9, 0.12);
const CONCRETE_BLOCK_GEO = new THREE.BoxGeometry(2.9, 0.85, 0.4);

export interface GuardRailProps {
  startX?: number;
  length?: number;
  side?: 'both' | 'left' | 'right';
  zOffset?: number;
  type?: 'rail' | 'concrete';
  position?: [number, number, number];
  /** 🆕 v2 — Suivre une courbe Route138 */
  curveId?: string;
  /** 🆕 v2 — Espacement poteaux (m) */
  postSpacing?: number;
}

export function GuardRail({
  startX = -100,
  length = 200,
  side = 'both',
  zOffset = 6.8,
  type = 'rail',
  position = [0, 0, 0],
  curveId,
  postSpacing = 3.0,
}: GuardRailProps) {
  const left = side === 'both' || side === 'left';
  const right = side === 'both' || side === 'right';

  // 🆕 v2 — Si curveId fourni, positionne le long de la courbe
  const sampleData = useMemo(() => {
    if (!curveId) {
      // Mode ligne droite (v1)
      const spacing = type === 'concrete' ? 3.0 : postSpacing;
      const count = Math.max(2, Math.floor(length / spacing));
      return Array.from({ length: count }, (_, i) => ({
        x: startX + i * spacing,
        z: 0,
        yaw: 0,
      }));
    }

    // Mode courbe
    const curve = getCurve(curveId);
    if (!curve) return [];

    const totalLength = curve.getLength();
    const spacing = type === 'concrete' ? 3.0 : postSpacing;
    const count = Math.max(2, Math.floor(totalLength / spacing));
    const out: { x: number; z: number; yaw: number }[] = [];

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      out.push({
        x: pt.x,
        z: pt.z,
        yaw: Math.atan2(tangent.x, tangent.z),
      });
    }
    return out;
  }, [curveId, startX, length, type, postSpacing]);

  const instancedPostsRef = useRef<THREE.InstancedMesh>(null);
  const instancedConcreteRef = useRef<THREE.InstancedMesh>(null);

  const totalInstances = useMemo(() => {
    let mult = 0;
    if (left) mult++;
    if (right) mult++;
    return sampleData.length * mult;
  }, [left, right, sampleData.length]);

  // Injection matrices
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    let idx = 0;

    if (left && (type === 'rail' ? instancedPostsRef.current : instancedConcreteRef.current)) {
      sampleData.forEach((s) => {
        if (type === 'rail' && instancedPostsRef.current) {
          dummy.position.set(s.x, 0.45, -zOffset);
          dummy.rotation.set(0, s.yaw, 0);
          dummy.updateMatrix();
          instancedPostsRef.current.setMatrixAt(idx++, dummy.matrix);
        } else if (type === 'concrete' && instancedConcreteRef.current) {
          dummy.position.set(s.x, 0.42, -zOffset);
          dummy.rotation.set(0, s.yaw, 0);
          dummy.updateMatrix();
          instancedConcreteRef.current.setMatrixAt(idx++, dummy.matrix);
        }
      });
    }

    if (right && (type === 'rail' ? instancedPostsRef.current : instancedConcreteRef.current)) {
      sampleData.forEach((s) => {
        if (type === 'rail' && instancedPostsRef.current) {
          dummy.position.set(s.x, 0.45, zOffset);
          dummy.rotation.set(0, s.yaw, 0);
          dummy.updateMatrix();
          instancedPostsRef.current.setMatrixAt(idx++, dummy.matrix);
        } else if (type === 'concrete' && instancedConcreteRef.current) {
          dummy.position.set(s.x, 0.42, zOffset);
          dummy.rotation.set(0, s.yaw, 0);
          dummy.updateMatrix();
          instancedConcreteRef.current.setMatrixAt(idx++, dummy.matrix);
        }
      });
    }

    if (instancedPostsRef.current) {
      instancedPostsRef.current.count = idx;
      instancedPostsRef.current.instanceMatrix.needsUpdate = true;
    }
    if (instancedConcreteRef.current) {
      instancedConcreteRef.current.count = idx;
      instancedConcreteRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [left, right, sampleData, zOffset, type]);

  // 🆕 v2 — Cleanup GPU à l'unmount
  useEffect(() => {
    return () => {
      instancedPostsRef.current?.geometry?.dispose();
      instancedConcreteRef.current?.geometry?.dispose();
    };
  }, []);

  if (type === 'concrete') {
    return (
      <group position={position} name="GuardRail_Concrete_v2">
        <instancedMesh
          ref={instancedConcreteRef}
          args={[CONCRETE_BLOCK_GEO, CONCRETE_MAT, Math.max(1, totalInstances)]}
          castShadow
          receiveShadow
        />
      </group>
    );
  }

  // Mode rail : box horizontale + poteaux instanciés
  // Pour le mode curve, on skip la box linéaire (elle ne suivrait pas la courbe)
  return (
    <group position={position} name="GuardRail_Metallic_v2">
      {!curveId && (
        <>
          {left && (
            <mesh position={[startX + length / 2, 0.65, -zOffset]} material={RAIL_MAT} castShadow>
              <boxGeometry args={[length, 0.22, 0.08]} />
            </mesh>
          )}
          {right && (
            <mesh position={[startX + length / 2, 0.65, zOffset]} material={RAIL_MAT} castShadow>
              <boxGeometry args={[length, 0.22, 0.08]} />
            </mesh>
          )}
        </>
      )}

      <instancedMesh
        ref={instancedPostsRef}
        args={[POST_GEO, POST_MAT, Math.max(1, totalInstances)]}
        castShadow
        receiveShadow
      />
    </group>
  );
}