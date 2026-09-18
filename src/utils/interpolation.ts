import { Vector3 } from "three";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] {
  const vFrom = new Vector3(...from);
  const vTo = new Vector3(...to);
  vFrom.lerp(vTo, t);
  return [vFrom.x, vFrom.y, vFrom.z];
}
