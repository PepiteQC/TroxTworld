/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ROAD MARKINGS v2.0 — Marquage MTQ (2 draw calls)
 *  src/roads/shared/RoadMarkings.tsx
 * ───────────────────────────────────────────────────────────────────────────
 *  • FIX : dispose complet des géométries + matériaux
 *  • Config (largeurs, couleurs, dash cycle)
 *  • Compat 100% v1 (3 composants + 2 helpers)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  ROUTE_138_CURVES,
  getRoadWidthForType,
  getCurve,
  type RoadCurve,
} from '../Route138';

// ─── CONFIG (exportable) ──────────────────────────────────────────────────
export interface RoadMarkingsConfig {
  stripeY: number;
  dashLength: number;
  gapLength: number;
  edgeWidth: number;
  centerWidth: number;
  doubleGap: number;
  whiteColor: string;
  yellowColor: string;
}

export const DEFAULT_MARKINGS_CONFIG: RoadMarkingsConfig = {
  stripeY: 0.04,
  dashLength: 3.0,
  gapLength: 9.0,
  edgeWidth: 0.12,
  centerWidth: 0.12,
  doubleGap: 0.12,
  whiteColor: '#eeeadf',
  yellowColor: '#e0b02a',
};

// ─── MATÉRIAUX PARTAGÉS ───────────────────────────────────────────────────
const WHITE_MAT = new THREE.MeshBasicMaterial({
  color: DEFAULT_MARKINGS_CONFIG.whiteColor,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  toneMapped: false,
});

const YELLOW_MAT = new THREE.MeshBasicMaterial({
  color: DEFAULT_MARKINGS_CONFIG.yellowColor,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  toneMapped: false,
});

/** 🆕 v2 — Cleanup global */
export function disposeMarkingMaterials(): void {
  WHITE_MAT.dispose();
  YELLOW_MAT.dispose();
}

// ─── SCRATCH VECTORS ──────────────────────────────────────────────────────
const _pA = new THREE.Vector3();
const _pB = new THREE.Vector3();
const _tA = new THREE.Vector3();
const _tB = new THREE.Vector3();
const _nA = new THREE.Vector3();
const _nB = new THREE.Vector3();
const _cA = new THREE.Vector3();
const _cB = new THREE.Vector3();

// ─── BUFFER TYPE ──────────────────────────────────────────────────────────
interface RibbonBuffer {
  positions: number[];
  indices: number[];
}

// ─── HELPERS (v1 compat) ──────────────────────────────────────────────────

function pushRibbonQuad(
  buf: RibbonBuffer,
  path: THREE.Curve<THREE.Vector3>,
  t0: number,
  t1: number,
  offset: number,
  width: number,
  cfg: RoadMarkingsConfig,
): void {
  path.getPointAt(t0, _pA);
  path.getPointAt(t1, _pB);
  path.getTangentAt(t0, _tA);
  path.getTangentAt(t1, _tB);

  _nA.set(-_tA.z, 0, _tA.x).normalize();
  _nB.set(-_tB.z, 0, _tB.x).normalize();

  _cA.copy(_pA).addScaledVector(_nA, offset);
  _cB.copy(_pB).addScaledVector(_nB, offset);
  _cA.y += cfg.stripeY;
  _cB.y += cfg.stripeY;

  const hw = width / 2;
  const base = buf.positions.length / 3;

  buf.positions.push(
    _cA.x - _nA.x * hw, _cA.y, _cA.z - _nA.z * hw,
    _cA.x + _nA.x * hw, _cA.y, _cA.z + _nA.z * hw,
    _cB.x - _nB.x * hw, _cB.y, _cB.z - _nB.z * hw,
    _cB.x + _nB.x * hw, _cB.y, _cB.z + _nB.z * hw,
  );

  buf.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
}

function buildStripe(
  buf: RibbonBuffer,
  curve: RoadCurve,
  offset: number,
  width: number,
  dashed: boolean,
  cfg: RoadMarkingsConfig = DEFAULT_MARKINGS_CONFIG,
): void {
  const path = getCurve(curve.id);
  if (!path) return;

  const realLength = path.getLength();
  const divisions = Math.max(64, Math.ceil(realLength / 4));
  const dashCycle = cfg.dashLength + cfg.gapLength;

  for (let i = 0; i < divisions; i++) {
    const t0 = i / divisions;
    const t1 = (i + 1) / divisions;

    if (dashed) {
      const distAlong = t0 * realLength;
      const phase = distAlong % dashCycle;
      if (phase > cfg.dashLength) continue;
    }

    pushRibbonQuad(buf, path, t0, t1, offset, width, cfg);
  }
}

function buildCrosswalk(
  buf: RibbonBuffer,
  curve: RoadCurve,
  t: number,
  cfg: RoadMarkingsConfig = DEFAULT_MARKINGS_CONFIG,
): void {
  const path = getCurve(curve.id);
  if (!path) return;

  path.getPointAt(t, _pA);
  path.getTangentAt(t, _tA);
  _nA.set(-_tA.z, 0, _tA.x).normalize();

  const bandCount = 7;
  const bandWidth = 0.5;
  const bandGap = 0.45;
  const bandLength = 3.0;
  const totalSpan = bandCount * (bandWidth + bandGap);
  const startOffset = -totalSpan / 2;

  for (let b = 0; b < bandCount; b++) {
    const lateral = startOffset + b * (bandWidth + bandGap);

    _cA.copy(_pA).addScaledVector(_nA, lateral);
    _cA.y += cfg.stripeY;

    const base = buf.positions.length / 3;
    const hl = bandLength / 2;
    const hw = bandWidth / 2;

    buf.positions.push(
      _cA.x - _tA.x * hl - _nA.x * hw, _cA.y, _cA.z - _tA.z * hl - _nA.z * hw,
      _cA.x - _tA.x * hl + _nA.x * hw, _cA.y, _cA.z - _tA.z * hl + _nA.z * hw,
      _cA.x + _tA.x * hl - _nA.x * hw, _cA.y, _cA.z + _tA.z * hl - _nA.z * hw,
      _cA.x + _tA.x * hl + _nA.x * hw, _cA.y, _cA.z + _tA.z * hl + _nA.z * hw,
    );

    buf.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
}

function finalizeGeometry(buf: RibbonBuffer): THREE.BufferGeometry | null {
  if (buf.positions.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.positions, 3));
  geo.setIndex(buf.indices);
  geo.computeBoundingSphere();
  return geo;
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function AllRouteMarkings() {
  const { whiteGeo, yellowGeo } = useMemo(() => {
    const whiteBuf: RibbonBuffer = { positions: [], indices: [] };
    const yellowBuf: RibbonBuffer = { positions: [], indices: [] };
    const cfg = DEFAULT_MARKINGS_CONFIG;

    for (const curve of ROUTE_138_CURVES) {
      const roadWidth = getRoadWidthForType(curve.type);
      const edgeOffset = Math.max(2.5, roadWidth / 2 - 0.4);

      switch (curve.markings) {
        case 'highway': {
          buildStripe(whiteBuf, curve, -edgeOffset, cfg.edgeWidth, false, cfg);
          buildStripe(whiteBuf, curve, edgeOffset, cfg.edgeWidth, false, cfg);
          buildStripe(yellowBuf, curve, -2.2, cfg.edgeWidth, false, cfg);
          buildStripe(yellowBuf, curve, 2.2, cfg.edgeWidth, false, cfg);
          buildStripe(whiteBuf, curve, -5.5, cfg.edgeWidth, true, cfg);
          buildStripe(whiteBuf, curve, 5.5, cfg.edgeWidth, true, cfg);
          break;
        }
        case 'double_yellow': {
          buildStripe(whiteBuf, curve, -edgeOffset, cfg.edgeWidth, false, cfg);
          buildStripe(whiteBuf, curve, edgeOffset, cfg.edgeWidth, false, cfg);
          buildStripe(yellowBuf, curve, -cfg.doubleGap, cfg.centerWidth, false, cfg);
          buildStripe(yellowBuf, curve, cfg.doubleGap, cfg.centerWidth, false, cfg);
          break;
        }
        case 'dashed_white': {
          buildStripe(whiteBuf, curve, -edgeOffset, cfg.edgeWidth, false, cfg);
          buildStripe(whiteBuf, curve, edgeOffset, cfg.edgeWidth, false, cfg);
          buildStripe(whiteBuf, curve, 0, cfg.centerWidth, true, cfg);
          break;
        }
        default:
          break;
      }

      if (curve.type === 'village') {
        buildCrosswalk(whiteBuf, curve, 0.25, cfg);
        buildCrosswalk(whiteBuf, curve, 0.6, cfg);
        buildCrosswalk(whiteBuf, curve, 0.85, cfg);
      }
    }

    return {
      whiteGeo: finalizeGeometry(whiteBuf),
      yellowGeo: finalizeGeometry(yellowBuf),
    };
  }, []);

  useEffect(() => {
    return () => {
      whiteGeo?.dispose();
      yellowGeo?.dispose();
    };
  }, [whiteGeo, yellowGeo]);

  return (
    <group name="Road_Markings_MTQ_v2" renderOrder={1}>
      {whiteGeo && <mesh geometry={whiteGeo} material={WHITE_MAT} />}
      {yellowGeo && <mesh geometry={yellowGeo} material={YELLOW_MAT} />}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MARQUAGE POUR UNE SEULE COURBE
// ═══════════════════════════════════════════════════════════════════════════

export function RouteRoadMarkings({ curve }: { curve: RoadCurve }) {
  const { whiteGeo, yellowGeo } = useMemo(() => {
    const whiteBuf: RibbonBuffer = { positions: [], indices: [] };
    const yellowBuf: RibbonBuffer = { positions: [], indices: [] };
    const cfg = DEFAULT_MARKINGS_CONFIG;

    const roadWidth = getRoadWidthForType(curve.type);
    const edgeOffset = Math.max(2.5, roadWidth / 2 - 0.4);

    if (curve.markings === 'highway') {
      buildStripe(whiteBuf, curve, -edgeOffset, cfg.edgeWidth, false, cfg);
      buildStripe(whiteBuf, curve, edgeOffset, cfg.edgeWidth, false, cfg);
      buildStripe(yellowBuf, curve, -2.2, cfg.edgeWidth, false, cfg);
      buildStripe(yellowBuf, curve, 2.2, cfg.edgeWidth, false, cfg);
      buildStripe(whiteBuf, curve, -5.5, cfg.edgeWidth, true, cfg);
      buildStripe(whiteBuf, curve, 5.5, cfg.edgeWidth, true, cfg);
    } else if (curve.markings === 'dashed_white') {
      buildStripe(whiteBuf, curve, -edgeOffset, cfg.edgeWidth, false, cfg);
      buildStripe(whiteBuf, curve, edgeOffset, cfg.edgeWidth, false, cfg);
      buildStripe(whiteBuf, curve, 0, cfg.centerWidth, true, cfg);
    } else if (curve.markings === 'double_yellow') {
      buildStripe(whiteBuf, curve, -edgeOffset, cfg.edgeWidth, false, cfg);
      buildStripe(whiteBuf, curve, edgeOffset, cfg.edgeWidth, false, cfg);
      buildStripe(yellowBuf, curve, -cfg.doubleGap, cfg.centerWidth, false, cfg);
      buildStripe(yellowBuf, curve, cfg.doubleGap, cfg.centerWidth, false, cfg);
    }

    return {
      whiteGeo: finalizeGeometry(whiteBuf),
      yellowGeo: finalizeGeometry(yellowBuf),
    };
  }, [curve]);

  useEffect(() => {
    return () => {
      whiteGeo?.dispose();
      yellowGeo?.dispose();
    };
  }, [whiteGeo, yellowGeo]);

  return (
    <group renderOrder={1}>
      {whiteGeo && <mesh geometry={whiteGeo} material={WHITE_MAT} />}
      {yellowGeo && <mesh geometry={yellowGeo} material={YELLOW_MAT} />}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MARQUAGE POUR ROUTE DROITE SIMPLE
// ═══════════════════════════════════════════════════════════════════════════

interface SmallRoadMarkingsProps {
  startX?: number;
  length?: number;
  roadWidth?: number;
  dashed?: boolean;
}

export function SmallRoadMarkings({
  startX = -100,
  length = 200,
  roadWidth = 7.4,
  dashed = false,
}: SmallRoadMarkingsProps) {
  const { whiteGeo, yellowGeo } = useMemo(() => {
    const whiteBuf: RibbonBuffer = { positions: [], indices: [] };
    const yellowBuf: RibbonBuffer = { positions: [], indices: [] };
    const cfg = DEFAULT_MARKINGS_CONFIG;

    const edgeOffset = roadWidth / 2 - 0.4;
    const centerX = startX + length / 2;

    const pushStraight = (buf: RibbonBuffer, z: number, w: number, x: number, len: number) => {
      const base = buf.positions.length / 3;
      const hw = w / 2;
      const hl = len / 2;
      buf.positions.push(
        x - hl, cfg.stripeY, z - hw,
        x - hl, cfg.stripeY, z + hw,
        x + hl, cfg.stripeY, z - hw,
        x + hl, cfg.stripeY, z + hw,
      );
      buf.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    };

    pushStraight(whiteBuf, -edgeOffset, cfg.edgeWidth, centerX, length);
    pushStraight(whiteBuf, edgeOffset, cfg.edgeWidth, centerX, length);

    if (dashed) {
      const cycle = cfg.dashLength + cfg.gapLength;
      const count = Math.floor(length / cycle);
      for (let i = 0; i < count; i++) {
        const x = startX + i * cycle + cfg.dashLength / 2;
        pushStraight(whiteBuf, 0, cfg.centerWidth, x, cfg.dashLength);
      }
    } else {
      pushStraight(yellowBuf, -cfg.doubleGap, cfg.centerWidth, centerX, length);
      pushStraight(yellowBuf, cfg.doubleGap, cfg.centerWidth, centerX, length);
    }

    return {
      whiteGeo: finalizeGeometry(whiteBuf),
      yellowGeo: finalizeGeometry(yellowBuf),
    };
  }, [startX, length, roadWidth, dashed]);

  useEffect(() => {
    return () => {
      whiteGeo?.dispose();
      yellowGeo?.dispose();
    };
  }, [whiteGeo, yellowGeo]);

  return (
    <group renderOrder={1}>
      {whiteGeo && <mesh geometry={whiteGeo} material={WHITE_MAT} />}
      {yellowGeo && <mesh geometry={yellowGeo} material={YELLOW_MAT} />}
    </group>
  );
}