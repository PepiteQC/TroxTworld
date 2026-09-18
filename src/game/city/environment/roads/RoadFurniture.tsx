import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ROAD_ZONES, VILLAGES } from '../data/WorldConfig';
import { getRoutePointAtX, getRoadWidthForType, ROUTE_138_CURVES } from '../roads/Route138';

function makeSignTexture(label: string, background: string, foreground = '#f8fbf2') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = foreground;
  context.lineWidth = 8;
  context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  context.fillStyle = foreground;
  context.font = `bold ${label.length > 15 ? 34 : 58}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const lines = label.split('\n');
  lines.forEach((line, index) => {
    const offset = (index - (lines.length - 1) / 2) * 54;
    context.fillText(line, canvas.width / 2, canvas.height / 2 + offset);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function RoadsideSign({
  label,
  position,
  color = '#1c5f32',
  rotation = 0,
  width = 2.6,
}: {
  label: string;
  position: [number, number, number];
  color?: string;
  rotation?: number;
  width?: number;
}) {
  const texture = useMemo(() => makeSignTexture(label, color), [label, color]);
  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 2.9, 8]} />
        <meshStandardMaterial color="#777a7b" metalness={0.45} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[width, 1.2, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      {texture && (
        <mesh position={[0, 2.8, 0.051]}>
          <planeGeometry args={[width - 0.16, 1.04]} />
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Chevron({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <RoadsideSign
      label="››"
      position={position}
      rotation={rotation}
      color="#e8a51a"
      width={1.45}
    />
  );
}

function CurveChevrons() {
  const chevrons = useMemo(() => {
    const result: { position: [number, number, number]; rotation: number }[] = [];

    ROUTE_138_CURVES.forEach((curve) => {
      if (curve.type === 'highway') return;
      for (let index = 1; index < curve.points.length - 1; index += 2) {
        const previous = curve.points[index - 1];
        const current = curve.points[index];
        const next = curve.points[index + 1];
        const before = new THREE.Vector3().subVectors(current, previous).normalize();
        const after = new THREE.Vector3().subVectors(next, current).normalize();
        const bend = Math.abs(before.angleTo(after));
        if (bend < 0.12) continue;

        const normal = new THREE.Vector3(-after.z, 0, after.x).normalize();
        const offset = getRoadWidthForType(curve.type) / 2 + 1.4;
        result.push({
          position: [current.x + normal.x * offset, 0, current.z + normal.z * offset],
          rotation: Math.atan2(after.x, after.z),
        });
      }
    });

    return result;
  }, []);

  return (
    <>
      {chevrons.map((chevron, index) => (
        <Chevron key={index} position={chevron.position} rotation={chevron.rotation} />
      ))}
    </>
  );
}

export function RouteFurniture() {
  const speedSigns = useMemo(
    () =>
      ROAD_ZONES.map((zone) => {
        const point = getRoutePointAtX(zone.startZ + 120);
        return {
          label: `${zone.speedLimit}\nkm/h`,
          position: [point.x, 0, point.z - 7] as [number, number, number],
        };
      }),
    [],
  );
  const villageSigns = useMemo(
    () =>
      VILLAGES.filter((village) => village.position[0] !== 0).map((village) => {
        const point = getRoutePointAtX(village.position[0]);
        return {
          label: village.name,
          position: [point.x, 0, point.z + 7] as [number, number, number],
        };
      }),
    [],
  );

  return (
    <group>
      {speedSigns.map((sign) => (
        <RoadsideSign key={`${sign.label}-${sign.position[0]}`} label={sign.label} position={sign.position} color="#b51f29" width={2.2} />
      ))}
      {villageSigns.map((sign) => (
        <RoadsideSign key={sign.label} label={sign.label} position={sign.position} width={3.2} />
      ))}
      <CurveChevrons />
    </group>
  );
}