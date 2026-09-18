import * as THREE from "three";

export type WaterPreset = "stLaurent" | "lacNordique" | "riviereRapide" | "eauPure";

export interface WaterProOptions {
  width?: number;
  height?: number;
  segments?: number;
  preset?: WaterPreset;
  flowDirection?: THREE.Vector2;
  sunColor?: number;
  sunDirection?: THREE.Vector3;
}

const PRESETS_CONFIG: Record<WaterPreset, {
  deepColor: number;
  shallowColor: number;
  foamColor: number;
  waveHeight: number;
  waveSpeed: number;
  roughness: number;
  fresnelPower: number;
  flowSpeed: number;
}> = {
  stLaurent: {
    deepColor: 0x0f2233,
    shallowColor: 0x22485c,
    foamColor: 0xccddee,
    waveHeight: 0.35,
    waveSpeed: 0.9,
    roughness: 0.18,
    fresnelPower: 3.5,
    flowSpeed: 0.08
  },
  lacNordique: {
    deepColor: 0x07111a,
    shallowColor: 0x142b36,
    foamColor: 0xbbd0dd,
    waveHeight: 0.12,
    waveSpeed: 0.5,
    roughness: 0.08,
    fresnelPower: 4.5,
    flowSpeed: 0.02
  },
  riviereRapide: {
    deepColor: 0x1a333f,
    shallowColor: 0x3d6778,
    foamColor: 0xffffff,
    waveHeight: 0.65,
    waveSpeed: 1.8,
    roughness: 0.35,
    fresnelPower: 2.2,
    flowSpeed: 0.35
  },
  eauPure: {
    deepColor: 0x004466,
    shallowColor: 0x22aa99,
    foamColor: 0xffffff,
    waveHeight: 0.2,
    waveSpeed: 0.8,
    roughness: 0.1,
    fresnelPower: 3.0,
    flowSpeed: 0.04
  }
};

/**
 * Générateur de textures de normales procédurales (évite les 404 d'images)
 */
function createProceduralWaterNormalTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Perlin/Sinusoid bruit composite
      const nx = Math.sin((x / size) * Math.PI * 8) * Math.cos((y / size) * Math.PI * 4);
      const ny = Math.cos((x / size) * Math.PI * 6) * Math.sin((y / size) * Math.PI * 8);

      data[i] = Math.floor((nx * 0.5 + 0.5) * 255);     // Normal R (X)
      data[i + 1] = Math.floor((ny * 0.5 + 0.5) * 255); // Normal G (Y)
      data[i + 2] = 255;                                // Normal B (Z vers le haut)
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  return texture;
}

const WaterVertexShader = `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveSpeed;
  uniform vec2 uFlowDirection;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vWavePeak;

  // Gerstner Wave Formula
  vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
    float steepness = wave.z;
    float wavelength = wave.w;
    float k = 2.0 * 3.14159265 / wavelength;
    float c = sqrt(9.8 / k) * uWaveSpeed;
    vec2 d = normalize(wave.xy);
    float f = k * (dot(d, p.xz) - c * uTime);
    float a = steepness / k;

    tangent += vec3(
      -d.x * d.x * (steepness * sin(f)),
      d.x * (steepness * cos(f)),
      -d.x * d.y * (steepness * sin(f))
    );
    binormal += vec3(
      -d.x * d.y * (steepness * sin(f)),
      d.y * (steepness * cos(f)),
      -d.y * d.y * (steepness * sin(f))
    );

    return vec3(
      d.x * (a * cos(f)),
      a * sin(f),
      d.y * (a * cos(f))
    );
  }

  void main() {
    vUv = uv;
    vec3 gridPoint = position;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    vec3 p = gridPoint;

    // 4 composite Gerstner Waves
    p += gerstnerWave(vec4(1.0, 0.3, 0.15 * uWaveHeight, 28.0), gridPoint, tangent, binormal);
    p += gerstnerWave(vec4(0.6, 0.8, 0.12 * uWaveHeight, 14.0), gridPoint, tangent, binormal);
    p += gerstnerWave(vec4(-0.4, 0.7, 0.08 * uWaveHeight, 7.0), gridPoint, tangent, binormal);
    p += gerstnerWave(vec4(0.2, -0.9, 0.04 * uWaveHeight, 3.5), gridPoint, tangent, binormal);

    vec3 normal = normalize(cross(binormal, tangent));
    vNormal = normalize(normalMatrix * normal);
    vWavePeak = p.y;

    vec4 worldPos = modelMatrix * vec4(p, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const WaterFragmentShader = `
  uniform float uTime;
  uniform sampler2D uNormalMap;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uFoamColor;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uRoughness;
  uniform float uFresnelPower;
  uniform vec2 uFlowDirection;
  uniform float uFlowSpeed;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vWavePeak;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    // Double scrolling animated UVs
    vec2 flow = uFlowDirection * (uTime * uFlowSpeed);
    vec2 uv1 = vUv * 35.0 + flow;
    vec2 uv2 = vUv * 45.0 - flow * 0.7 + vec2(0.3, 0.7);

    vec3 normalTex1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
    vec3 normalTex2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
    vec3 blendedNormal = normalize(vNormal + (normalTex1 + normalTex2) * uRoughness);

    // Fresnel effect
    float fresnel = pow(1.0 - max(dot(viewDir, blendedNormal), 0.0), uFresnelPower);
    fresnel = clamp(fresnel, 0.05, 0.95);

    // Base water gradient
    vec3 waterColor = mix(uDeepColor, uShallowColor, fresnel * 0.7);

    // Sun Specular (Blinn-Phong)
    vec3 lightDir = normalize(uSunDirection);
    vec3 halfVector = normalize(lightDir + viewDir);
    float spec = pow(max(dot(blendedNormal, halfVector), 0.0), 128.0 / (uRoughness + 0.1));
    vec3 specularColor = uSunColor * spec * 2.2;

    // Crest Foam (écume sur les vagues)
    float foamMask = smoothstep(0.12, 0.35, vWavePeak);
    vec3 finalColor = mix(waterColor, uFoamColor, foamMask * 0.75) + specularColor;

    gl_FragColor = vec4(finalColor, 0.88 + fresnel * 0.12);
  }
`;

export class WaterPro extends THREE.Mesh {
  private customMaterial: THREE.ShaderMaterial;
  private normalTexture: THREE.CanvasTexture;

  constructor(options: WaterProOptions = {}) {
    const width = options.width ?? 1200;
    const height = options.height ?? 1200;
    const segments = options.segments ?? 160;
    const presetName = options.preset ?? "stLaurent";
    const preset = PRESETS_CONFIG[presetName];

    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
    geometry.rotateX(-Math.PI / 2); // À plat sur le plan horizontal XZ

    const normalTexture = createProceduralWaterNormalTexture(512);

    const material = new THREE.ShaderMaterial({
      vertexShader: WaterVertexShader,
      fragmentShader: WaterFragmentShader,
      transparent: true,
      depthWrite: false,
      wireframe: false,
      uniforms: {
        uTime: { value: 0 },
        uNormalMap: { value: normalTexture },
        uDeepColor: { value: new THREE.Color(preset.deepColor) },
        uShallowColor: { value: new THREE.Color(preset.shallowColor) },
        uFoamColor: { value: new THREE.Color(preset.foamColor) },
        uWaveHeight: { value: preset.waveHeight },
        uWaveSpeed: { value: preset.waveSpeed },
        uRoughness: { value: preset.roughness },
        uFresnelPower: { value: preset.fresnelPower },
        uFlowDirection: { value: options.flowDirection ?? new THREE.Vector2(0.7, 0.3) },
        uFlowSpeed: { value: preset.flowSpeed },
        uSunDirection: { value: options.sunDirection ?? new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uSunColor: { value: new THREE.Color(options.sunColor ?? 0xfffaed) },
      },
    });

    super(geometry, material);

    this.customMaterial = material;
    this.normalTexture = normalTexture;
    this.receiveShadow = true;
  }

  /**
   * Met à jour le mouvement et les reflets de l'eau
   */
  public update(dt: number, elapsedTime?: number, sunDir?: THREE.Vector3): void {
    const time = elapsedTime !== undefined ? elapsedTime : this.customMaterial.uniforms.uTime.value + dt;
    this.customMaterial.uniforms.uTime.value = time;

    if (sunDir) {
      this.customMaterial.uniforms.uSunDirection.value.copy(sunDir).normalize();
    }
  }

  /**
   * Change le style de l'eau à la volée (ex: passage d'un lac au fleuve)
   */
  public setPreset(presetName: WaterPreset): void {
    const preset = PRESETS_CONFIG[presetName];
    if (!preset) return;

    this.customMaterial.uniforms.uDeepColor.value.setHex(preset.deepColor);
    this.customMaterial.uniforms.uShallowColor.value.setHex(preset.shallowColor);
    this.customMaterial.uniforms.uFoamColor.value.setHex(preset.foamColor);
    this.customMaterial.uniforms.uWaveHeight.value = preset.waveHeight;
    this.customMaterial.uniforms.uWaveSpeed.value = preset.waveSpeed;
    this.customMaterial.uniforms.uRoughness.value = preset.roughness;
    this.customMaterial.uniforms.uFresnelPower.value = preset.fresnelPower;
    this.customMaterial.uniforms.uFlowSpeed.value = preset.flowSpeed;
  }

  /**
   * Libération propre de la mémoire GPU
   */
  public dispose(): void {
    this.geometry.dispose();
    this.normalTexture.dispose();
    this.customMaterial.dispose();
  }
}


