// /client/src/components/world/SaintAlbanMap.jsx
import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Environment, Sky } from '@react-three/drei';

import VillageAsphalte from './zones/VillageAsphalte';
import RouteDesLacs from './zones/RouteDesLacs';
import PlageCarillon from './zones/PlageCarillon';

export default function SaintAlbanMap() {
  const [currentZone, setCurrentZone] = useState("Village_StAlban");

  return (
    <Canvas shadows camera={{ position: [0, 5, -15], fov: 60 }}>
      {/* Ciel d'été québécois dégagé et gros soleil */}
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
      <Environment preset="city" />
      
      <ambientLight intensity={0.6} />
      <directionalLight 
        castShadow 
        position={[100, 100, 50]} 
        intensity={1.5} 
        shadow-mapSize={[2048, 2048]} 
      />

      <Physics timeStep="vary">
        <Suspense fallback={null}>
          {/* Les 3 gros chunks de ta map */}
          <VillageAsphalte />
          <RouteDesLacs />
          <PlageCarillon />
          
          {/* Ton composant de joueur/véhicule irait ici */}
        </Suspense>
      </Physics>
    </Canvas>
  );
}