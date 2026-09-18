// src/world/RoadNetworkBuilder.ts
// ETHERWORLD RP — Road Network Builder for Portneuf World

import * as THREE from 'three';
import { route138 } from '../roads/Route138';

export const PORTNEUF_ROAD_NETWORK = {
  mainHighway: 'Route 138 (Chemin du Roy)',
  regionalRoutes: ['Route 354', 'Route 365', 'Route 367'],
  totalSegments: 3,
  speedLimitHighwayKmh: 90,
  speedLimitRangsKmh: 70,
};

export class RoadNetworkBuilder {
  private networkGroup: THREE.Group;

  constructor() {
    this.networkGroup = new THREE.Group();
    this.networkGroup.name = 'portneuf_road_network';
  }

  public build(): THREE.Group {
    const mesh = route138.buildVisualMesh();
    this.networkGroup.add(mesh);
    return this.networkGroup;
  }
}
