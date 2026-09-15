/**
 * Cycle jour / nuit continu — élévation solaire, palette ciel, lampes.
 */
import * as THREE from "three";

export interface SkySnap {
  hours: number;
  elev: number;
  night: boolean;
  dawn: boolean;
  dusk: boolean;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  ambient: number;
  fog: number;
  bg: number;
  sunColor: number;
  sunIntensity: number;
  lamp: number;
  river: number;
}

const tmp = new THREE.Vector3();
const colA = new THREE.Color();
const colB = new THREE.Color();

export function sunElevation(hours: number): number {
  const t = (hours - 5.7) / 12.8;
  if (t <= 0 || t >= 1) return -0.35;
  return Math.sin(t * Math.PI);
}

export function sunDirection(hours: number, out = tmp): THREE.Vector3 {
  const elev = Math.max(0.045, sunElevation(hours));
  const az = ((hours - 6) / 12) * Math.PI;
  return out.set(Math.cos(az) * 0.82, -elev, Math.sin(az) * 0.52).normalize();
}

function lerpHex(a: number, b: number, t: number): number {
  colA.setHex(a);
  colB.setHex(b);
  return colA.lerp(colB, THREE.MathUtils.clamp(t, 0, 1)).getHex();
}

export function skySnap(hours: number, weather: string): SkySnap {
  const elev = sunElevation(hours);
  const night = elev < 0.07;
  const dawn = hours >= 5.2 && hours < 7.6;
  const dusk = hours >= 17.4 && hours < 21.2;
  const lamp = THREE.MathUtils.clamp(1 - (elev + 0.05) / 0.28, 0, 1);

  let hemiSky = 0xb8d0e8;
  let hemiGround = 0x3a4a32;
  let hemiIntensity = 0.72;
  let ambient = 0.28;
  let fog = 0x8aa0a8;
  let bg = 0x7a9aaa;
  let sunColor = 0xfff1d0;
  let sunIntensity = 1.25;
  let river = 0x2a4a68;

  if (night) {
    hemiSky = 0x1a2a48;
    hemiGround = 0x101820;
    hemiIntensity = 0.14;
    ambient = 0.07;
    fog = 0x0a1020;
    bg = 0x080e1a;
    sunColor = 0x8899bb;
    sunIntensity = 0.07;
    river = 0x101c2c;
  } else if (dawn) {
    const k = (hours - 5.2) / 2.4;
    hemiSky = lerpHex(0x4a3048, 0xb8d0e8, k);
    hemiGround = lerpHex(0x2a2018, 0x3a4a32, k);
    hemiIntensity = 0.28 + k * 0.44;
    ambient = 0.12 + k * 0.16;
    fog = lerpHex(0x6a4860, 0x8aa0a8, k);
    bg = lerpHex(0xc87858, 0x7a9aaa, k);
    sunColor = lerpHex(0xff8a4a, 0xfff1d0, k);
    sunIntensity = 0.35 + k * 0.9;
    river = lerpHex(0x1a2838, 0x2a4a68, k);
  } else if (dusk) {
    const k = (hours - 17.4) / 3.8;
    hemiSky = lerpHex(0xb8d0e8, 0x2a2448, k);
    hemiGround = lerpHex(0x3a4a32, 0x181420, k);
    hemiIntensity = 0.72 - k * 0.56;
    ambient = 0.28 - k * 0.2;
    fog = lerpHex(0x8aa0a8, 0x2a2038, k);
    bg = lerpHex(0xc07048, 0x140e22, k);
    sunColor = lerpHex(0xffc070, 0x8899bb, k);
    sunIntensity = 1.15 - k * 1.05;
    river = lerpHex(0x2a4a68, 0x101c2c, k);
  }

  if (weather === "fog") {
    fog = night ? 0x1a2430 : 0x9aa8b0;
    hemiIntensity *= 0.85;
  } else if (weather === "rain") {
    hemiIntensity *= 0.72;
    if (!night) bg = 0x5a6a78;
  } else if (weather === "storm") {
    hemiIntensity *= 0.45;
    bg = night ? 0x050810 : 0x3a4450;
    sunIntensity *= 0.4;
    fog = night ? 0x121820 : 0x6a7480;
  } else if (weather === "blizzard") {
    hemiIntensity *= 0.38;
    ambient *= 0.7;
    fog = night ? 0x1a2430 : 0xb8c4cc;
    bg = night ? 0x101820 : 0xa8b4bc;
    sunIntensity *= 0.22;
    hemiSky = night ? 0x1a2438 : 0xc4ced6;
  } else if (weather === "snow") {
    fog = night ? 0x1a2438 : 0xc8d4dc;
    if (!night) bg = 0xc0c8d0;
    hemiIntensity *= 0.78;
    sunIntensity *= 0.65;
  }

  return {
    hours,
    elev,
    night,
    dawn,
    dusk,
    hemiSky,
    hemiGround,
    hemiIntensity,
    ambient,
    fog,
    bg,
    sunColor,
    sunIntensity,
    lamp,
    river,
  };
}
