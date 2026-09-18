import * as THREE from 'three';

declare global {
  interface Array<T> {
    random(): any;
  }
}

declare module 'three' {
  interface Material {
    transmission?: number;
    roughness?: number;
    metalness?: number;
  }
}
