import { useMemo } from 'react';
import * as THREE from 'three';
import { ROUTE_138_CURVES, buildRoadGeometry, getRoutePointAtX, getRoadWidthForType } from '../roads/Route138';
import { HighwayLamps, VillageLamps } from '../roads/shared/HighwayLamps';
import { GuardRail } from '../roads/shared/GuardRail';
import { AllRouteMarkings } from '../roads/shared/RoadMarkings';
import { HydroQuebecSystem } from './HydroQuebecSystem';
import { TreeField } from './LODSystem';
import { getAsphaltMaterial, getHighwayMaterial, getGrassMaterial } from '../roads/shared/RoadTextures';
import { TrafficSystem } from './TrafficSystem';
import { RouteFurniture } from './RoadFurniture';
import { VillageDistrict } from './VillageDistrict';
import { VILLAGES } from '../data/WorldConfig';

function RoadMesh({ curve }: { curve: typeof ROUTE_138_CURVES[0] }) {
  const geo = useMemo(() => buildRoadGeometry(curve, 80), [curve]);
  const mat = useMemo(() => {
    if (curve.type === 'highway') return getHighwayMaterial(false);
    return getAsphaltMaterial(false);
  }, [curve.type]);

  const roadWidth = getRoadWidthForType(curve.type);
  const shoulderGeo = useMemo(
    () => buildRoadGeometry(curve, 80, roadWidth + 4),
    [curve, roadWidth],
  );
  const shoulderMat = useMemo(() => getGrassMaterial(), []);

  return (
    <group>
      <mesh receiveShadow geometry={shoulderGeo} material={shoulderMat} position-y={-0.005} />
      <mesh receiveShadow geometry={geo} material={mat} position-y={0.01} />
    </group>
  );
}

// Straight ground plane for the entire route corridor
function RouteGroundPlane() {
  const grassMat = useMemo(() => getGrassMaterial(), []);
  return (
    <>
      {/* Main ground strip along Route 138 east-west axis */}
      <mesh rotation-x={-Math.PI / 2} position={[10000, -0.1, 0]} receiveShadow material={grassMat}>
        <planeGeometry args={[22000, 600]} />
      </mesh>
      {/* A-40 highway ground strip */}
      <mesh rotation-x={-Math.PI / 2} position={[18000, -0.08, 0]} receiveShadow material={grassMat}>
        <planeGeometry args={[8000, 120]} />
      </mesh>
    </>
  );
}

// ══ MAIN WorldConnector ═══════════════════════════════════════
export function WorldConnector() {
  return (
    <group>
      {/* Ground plane for whole corridor */}
      <RouteGroundPlane />

      {/* Road meshes for each curve segment */}
      {ROUTE_138_CURVES.map((curve, i) => (
        <RoadMesh key={i} curve={curve} />
      ))}
      <AllRouteMarkings />
      <RouteFurniture />
      <TrafficSystem />

      {/* HydroQc poles along Route 138 rural & regional segments */}
      <HydroQuebecSystem startX={2800} length={12000} spacing={60} zOffset={-12} />

      {/* Village lamps — Saint-Marc-des-Carrières */}
      <group position={[2800, 0, 0]}>
        <VillageLamps length={400} spacing={18} zOffset={5} />
      </group>

      {/* Village lamps — Portneuf */}
      <group position={[10000, 0, 0]}>
        <VillageLamps length={500} spacing={18} zOffset={5} />
      </group>

      {/* Highway lamps on A-40 */}
      <group position={[17000, 0, 0]}>
        <HighwayLamps length={6000} spacing={35} zOffset={9} alternating />
      </group>

      {/* GuardRails on highway */}
      <group position={[17000, 0, 0]}>
        <GuardRail length={6000} side="both" zOffset={7.5} type="concrete" />
      </group>

      {/* Tree lines along route */}
      <TreeField count={300} seed={100} area={[3000, -40, 14000, -70]} />
      <TreeField count={300} seed={200} area={[3000, 20, 14000, 60]} />
      <TreeField count={200} seed={300} area={[14000, -30, 20000, -60]} />
      <TreeField count={200} seed={400} area={[14000, 20, 20000, 55]} />

      {/* Villages, positioned on the nearest Route 138 point */}
      {VILLAGES.filter((village) => village.position[0] !== 0).map((village) => {
        const point = getRoutePointAtX(village.position[0]);
        return (
          <VillageDistrict
            key={village.name}
            village={village}
            position={[point.x, point.y, point.z]}
          />
        );
      })}
    </group>
  );
}
