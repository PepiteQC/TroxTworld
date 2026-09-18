// src/world/VillageBuilder.ts
// ETHERWORLD RP — Village Builder & Placement Engine for Portneuf World

import * as THREE from 'three';
import { VILLAGE_PROFILES, VillageProfile } from './VillageProfiles';
import { buildBuilding, matLib } from './QuebecArchitecture';
import { buildSaintCasimir } from './villages/SaintCasimir';

export { VILLAGE_PROFILES };

export interface BuiltVillage {
  profile: VillageProfile;
  group: THREE.Group;
  boundingRadius: number;
}

export class VillageBuilder {
  private builtVillages: Map<string, BuiltVillage> = new Map();

  public buildAll(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'all_portneuf_villages';

    for (const profile of VILLAGE_PROFILES) {
      const built = this.buildVillage(profile);
      this.builtVillages.set(profile.id, built);
      root.add(built.group);
    }

    return root;
  }

  public buildVillage(profile: VillageProfile): BuiltVillage {
    // Special detailed handcrafted module for Saint-Casimir
    if (profile.id === 'saint_casimir') {
      const group = buildSaintCasimir();
      return {
        profile,
        group,
        boundingRadius: profile.radius,
      };
    }

    // Procedural generation for other 17 authentic Portneuf villages
    const group = new THREE.Group();
    group.name = `village_${profile.id}`;
    group.position.set(...profile.center);

    // 1. Church in village square if profile hasChurch
    if (profile.hasChurch) {
      const church = buildBuilding('eglise', { width: 14, length: 28, height: 10 });
      church.position.set(0, 0, -20);
      group.add(church);
    }

    // 2. Caisse Desjardins
    if (profile.hasDesjardins) {
      const bank = buildBuilding('caisse_desjardins', { width: 12, length: 16 });
      bank.position.set(-35, 0, 10);
      group.add(bank);
    }

    // 3. Dépanneur
    if (profile.hasDepanneur) {
      const dep = buildBuilding('depanneur', { width: 14, length: 18 });
      dep.position.set(30, 0, 15);
      group.add(dep);
    }

    // 4. Landmarks from profile
    for (const lm of profile.landmarks) {
      if (lm.builder) {
        const landmarkMesh = lm.builder();
        landmarkMesh.position.set(...lm.offset);
        group.add(landmarkMesh);
      }
    }

    // 5. Houses in radial or row layout
    const count = Math.min(profile.housesCount, 25);
    const radStep = (Math.PI * 2) / Math.max(1, count);

    for (let i = 0; i < count; i++) {
      const angle = i * radStep + (Math.random() - 0.5) * 0.2;
      const dist = 50 + (i % 3) * 35;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const type = i % 4 === 0 ? 'grange' : 'maison_canadienne';
      const house = buildBuilding(type, {
        width: 10 + (i % 3),
        length: 13 + (i % 2),
      });

      house.position.set(x, 0, z);
      house.rotation.y = angle + Math.PI / 2;
      group.add(house);
    }

    return {
      profile,
      group,
      boundingRadius: profile.radius,
    };
  }

  public getBuiltVillage(id: string): BuiltVillage | undefined {
    return this.builtVillages.get(id);
  }
}
