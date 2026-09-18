/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface RendererConfigProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  shadowsEnabled: boolean;
}

export const setupWebGLRenderer = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  shadowsEnabled: boolean
): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Configure high fidelity color mapping and shadow rendering
  renderer.shadowMap.enabled = shadowsEnabled;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  return renderer;
};
